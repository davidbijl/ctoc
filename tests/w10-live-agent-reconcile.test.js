/**
 * W10-s4 (H8) — Behavioral tests: live-agent ids plumbed into reconcile.
 *
 * Fixes finding H8: the on-open reconcile ran BLIND. `menu-screens.js` hardcoded
 * `taskReconcile.reconcileState(root, { liveAgentIds: null })`, and no channel
 * existed to carry the live harness agent-id list from the calling context down
 * to the reconcile. `menu task start` never recorded an `agentTaskId` either, so
 * even a plumbed live set would have had nothing on the task to match against.
 *
 * Consequences (all verified in the parent): a genuinely-live background
 * `implement` task past the 30-minute staleness threshold was falsely orphaned,
 * dropped out of the running-only concurrency count (so a duplicate was offered),
 * and had its real completion rejected as `invalid transition orphaned → done`.
 *
 * This slice supplies the two inputs the pure reconcile core (task-reconcile.js)
 * and the registry (task-registry.js) already know how to consume:
 *   1. a live-agent-id list threaded argv → route → dashboardPipeline →
 *      buildDashboardTable → reconcileState (the `--live-agent-ids <csv>` flag,
 *      parsed by `extractLiveAgentIds` in start.js);
 *   2. an `agentTaskId` recorded on the task at `menu task start` (from
 *      `--agent-id`, defaulting to the task id).
 *
 * NO test doubles: every case drives the REAL production reconcile through the
 * REAL router (`menu-screens.route`) against a REAL on-disk task registry seeded
 * via the REAL registry API in an isolated tmp root. The true-positive ("live →
 * still running") and true-negative ("dead → orphaned") cases live in the SAME
 * file, in the SAME reconcile pass, so a broken "fix" that merely disables
 * staleness detection cannot pass. Case 8 spawns the real `start.js` process to
 * prove the ride-along is not bypassed. Raw fs/os/child_process are permitted in
 * tests/**.
 *
 * Contract replaced 2026-10-18 (owner): opening the dashboard changes no task and moves no plan;
 * a dead build moves only when the human names it in `menu task sweep` — plan
 * real-projects-do-not-stall-on-the-menu-s2. Cases 1+2, 3, 4, 5, 6 and 6b asserted what the
 * RENDER did (orphaned a task, printed "1 task orphaned — offer re-run", recorded the task id as
 * the agent id); they now assert the replacement at least as tightly: the render leaves the
 * registry bytes alone and counts the build, and the sweep decides on the same live list.
 * Cases 7, 7b, 7c, 8 and 9 are unchanged. `seedRunning` now gives every spec its own plan (the
 * old default put two running tasks on one plan).
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const { extractLiveAgentIds } = require('../src/commands/start');
const ms = require('../src/lib/menu-screens');
const taskRegistry = require('../src/lib/task-registry');
const taskReconcile = require('../src/lib/task-reconcile');
const planRecovery = require('../src/lib/plan-recovery');

const MENU = path.join(__dirname, '..', 'src', 'commands', 'start.js');

// Older than DEFAULT_STALE_MS (30 min). A `running` task this old is orphaned
// whenever a live set is PRESENT and does not confirm it (the definitive dead
// signal — age is not what condemns it there).
const PAST_STALE_MIN = 40;

// R2-A made the AGE backstop kind-aware: with NO live set to consult, reconcile
// orphans on age alone, and an `implement` task gets a 120-minute floor rather
// than the flat 30-minute DEFAULT_STALE_MS — an implement run legitimately takes
// hours, so a flat floor falsely orphaned live agents. These are derived from the
// production constant, never a duplicated literal, so the fixture tracks the
// contract if the floor ever moves.
const IMPLEMENT_STALE_MIN = taskReconcile.DEFAULT_STALE_MS_BY_KIND.implement / 60_000; // 120
const PAST_IMPLEMENT_STALE_MIN = IMPLEMENT_STALE_MIN + 30;  // 150 — past the floor
// 45 sits INSIDE the implement floor but ABOVE the old flat 30-min one, so a
// regression back to the flat floor is caught rather than silently tolerated.
const WITHIN_IMPLEMENT_GRACE_MIN = 45;

// ── isolated tmp-root harness ───────────────────────────────────────────────
let root;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-w10-s4-'));
});
afterEach(() => {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
});

/** ISO timestamp `minutesAgo` minutes before now. */
function minutesAgoIso(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

/**
 * Seed a real plan file for a slug in `plans/<stage>/` (R3-B item 4 / C7: an implement task
 * whose plan file is absent no longer completes with phantom success — it is refused, and a
 * build start needs its plan in todo/ or in-progress/). A fully-checked Step 8–16 block lets
 * validateForReview pass so `menu task complete` runs the genuine completion and
 * `running → done` succeeds (the behaviour these tests assert).
 */
function seedPlanIn(stage, slug, files) {
  const stepBlock = ['8: TEST', '9: PREPARE', '10: IMPLEMENT', '11: REVIEW', '12: OPTIMIZE',
    '13: SECURE', '14: VERIFY', '15: DOCUMENT', '16: FINAL-REVIEW']
    .map((s) => `### Step ${s}\n- [x] done\n`).join('\n');
  const filesBlock = 'files:\n' + files.map((f) => `  - "${f}"`).join('\n') + '\n';
  const content =
    '---\napproved_by: human\ngate_crossed: implementation → todo\n---\n\n' +
    `---\ntitle: "${slug}"\ntype: implementation\niron_loop: true\n${filesBlock}---\n\n` +
    `# ${slug}\n\n## Execution Plan (Steps 8-16)\n\n${stepBlock}\n`;
  const dir = path.join(root, 'plans', stage);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${slug}.md`), content);
}

/** A running build's plan file, in plans/in-progress/. */
function seedInProgressPlan(slug, files) {
  seedPlanIn('in-progress', slug, files);
}

/** A queued build's plan file, in plans/todo/, which a build start moves. */
function seedTodoPlan(slug, files) {
  seedPlanIn('todo', slug, files);
}

/** A repository with one 2020 commit, so the sweep's work check can answer "no work after the claim". */
function initRepo(dir) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^GIT_/i.test(k)) env[k] = v;
  env.GIT_AUTHOR_DATE = '2020-01-01T00:00:00Z';
  env.GIT_COMMITTER_DATE = '2020-01-01T00:00:00Z';
  const run = (args) => {
    const r = spawnSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@test.invalid', '-c', 'commit.gpgsign=false',
      '-c', 'maintenance.auto=false', '-c', 'gc.auto=0', ...args], { cwd: dir, encoding: 'utf8', shell: false, env });
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  };
  run(['init', '-q', '-b', 'main']);
  fs.writeFileSync(path.join(dir, 'README.md'), 'readme\n');
  run(['add', 'README.md']);
  run(['commit', '-q', '-m', 'init']);
}

const tasksBytes = () => fs.readFileSync(path.join(root, '.ctoc', 'state', 'tasks.json'), 'utf8');

/**
 * Seed a set of `running` tasks on disk via the REAL registry API. Each spec is
 * `{ agentTaskId, ageMinutes, plan }`; ids are assigned in order (t1, t2, …).
 * @param {Array<{agentTaskId?:string, ageMinutes?:number, plan?:string}>} specs
 * @returns {string[]} the assigned task ids, in seed order
 */
function seedRunning(specs) {
  const reg = taskRegistry.emptyRegistry();
  const ids = [];
  specs.forEach((spec, i) => {
    const slug = spec.plan || `w10-p${i + 1}`;
    seedInProgressPlan(slug, ['src/' + slug + '.js']);
    const t = taskRegistry.addTask(reg, { kind: 'implement', plan: slug, touches: ['src/' + slug + '.js'] });
    taskRegistry.updateTask(reg, t.id, {
      status: 'running',
      agentTaskId: spec.agentTaskId,
      ts: { started: minutesAgoIso(spec.ageMinutes == null ? PAST_STALE_MIN : spec.ageMinutes) },
    });
    ids.push(t.id);
  });
  taskRegistry.save(root, reg);
  return ids;
}

/** Seed one queued task (no transition) and return its id. */
function seedQueued(plan) {
  const slug = plan || 'w10-s4-queued';
  seedTodoPlan(slug, ['src/' + slug + '.js']); // a build start needs its plan file
  const reg = taskRegistry.emptyRegistry();
  const t = taskRegistry.addTask(reg, { kind: 'implement', plan: slug, touches: ['src/' + slug + '.js'] });
  taskRegistry.save(root, reg);
  return t.id;
}

/** Re-read the on-disk registry and return task `id`. */
function readTask(id) {
  return taskRegistry.load(root).tasks.find((t) => t.id === id);
}

describe('W10-s4 (H8) — extractLiveAgentIds argv parser', () => {
  it('7. parses a csv, trims whitespace, drops empties, strips the flag from rest', () => {
    const out = extractLiveAgentIds(['menu', '--live-agent-ids', 'a1,a2 , a3']);
    assert.deepEqual(out.liveAgentIds, ['a1', 'a2', 'a3']);
    assert.deepEqual(out.rest, ['menu']);
  });

  it('7b. absent flag → liveAgentIds undefined, rest unchanged', () => {
    const out = extractLiveAgentIds(['menu', 'task', 'list']);
    assert.equal(out.liveAgentIds, undefined);
    assert.deepEqual(out.rest, ['menu', 'task', 'list']);
  });

  it('7c. flag with a missing value → UNAVAILABLE (undefined), flag consumed (R3-B item 5)', () => {
    // Live-list HONESTY: a present-but-valueless flag is NOT an authoritative "zero agents
    // alive" — it is the SAME as the flag being absent (the list is unavailable). Mapping it
    // to `[]` made the reconcile read "no agent matches anything" and mass-orphan every live
    // agent, refilling their slots in the same render. An empty parse is therefore undefined.
    const out = extractLiveAgentIds(['--live-agent-ids']);
    assert.equal(out.liveAgentIds, undefined);
    assert.deepEqual(out.rest, []);
  });
});

describe('W10-s4 (H8) — live-agent ids threaded through route → reconcile', () => {
  it('1+2. the render changes nothing and counts; the sweep keeps the live task and sends the dead one back on his name (scenarios 4+5)', () => {
    initRepo(root);
    // t1: live (agentTaskId a1 in the live set), 40 min old → must stay running.
    // t2: dead (agentTaskId a2 NOT in the live set), 40 min old → a sweep may send it back.
    const [t1, t2] = seedRunning([
      { agentTaskId: 'a1' },
      { agentTaskId: 'a2' },
    ]);
    const before = tasksBytes();

    const res = ms.route(['menu'], root, { liveAgentIds: ['a1'] });

    assert.equal(tasksBytes(), before, 'opening the dashboard must leave the registry bytes unchanged');
    assert.match(res.text, /1 build would go back to the build queue when you name it/);

    const preview = ms.route(['menu', 'task', 'sweep'], root, { liveAgentIds: ['a1'] });
    const row = (id) => preview.sweep.builds.find((b) => b.id === id);
    assert.equal(row(t1).group, 'never-moved');
    assert.equal(row(t1).code, 'alive');
    assert.equal(row(t2).group, 'would-go-back');
    assert.equal(row(t2).code, 'confirmed-dead');

    const named = [t1, t2].map((id) => `${row(id).plan}@${row(id).token}`).join(',');
    ms.route(['menu', 'task', 'sweep', '--confirm', named], root, { liveAgentIds: ['a1'] });
    assert.equal(readTask(t1).status, 'running', 'live long-running task must NOT be orphaned');
    assert.ok(fs.existsSync(path.join(root, 'plans', 'in-progress', `${row(t1).plan}.md`)));
    assert.equal(readTask(t2).status, 'orphaned', 'dead long-running task is orphaned by the confirmed sweep');
    assert.ok(fs.existsSync(path.join(root, 'plans', 'todo', `${row(t2).plan}.md`)), 'and its plan is back in the build queue');
  });

  it('3. the live long-running task counts toward the MAX_CONCURRENT cap (scenario 6)', () => {
    // t1 live+old, plus freshly-started running tasks up to the cap → the cap is full once swept.
    const cap = taskRegistry.MAX_CONCURRENT;
    const specs = Array.from({ length: cap }, (_, i) => ({
      agentTaskId: `a${i + 1}`, ageMinutes: i === 0 ? PAST_STALE_MIN : 0, plan: `p${i + 1}`,
    }));
    initRepo(root);
    const [t1] = seedRunning(specs);
    const liveList = specs.map((s) => s.agentTaskId);

    // The preview honors the live set: t1 is alive. Without a1 in the list the same build would go back.
    const previewRow = (live) => ms.route(['menu', 'task', 'sweep'], root, { liveAgentIds: live }).sweep.builds.find((b) => b.id === t1);
    assert.deepEqual([previewRow(liveList).group, previewRow(liveList).code], ['never-moved', 'alive']);
    const without = previewRow(liveList.filter((a) => a !== 'a1'));
    assert.deepEqual([without.group, without.code], ['would-go-back', 'confirmed-dead']);

    // The sweep that names nothing, honoring the live set: t1 must NOT be freed.
    const swept = ms.route(['menu', 'task', 'sweep', '--confirm', 'none'], root, { liveAgentIds: liveList });
    assert.equal(swept.ok, true, 'the sweep that names nothing must run');

    const reg = taskRegistry.load(root);
    assert.equal(reg.tasks.filter((t) => t.status === 'running').length, cap, 'every one stays running');
    assert.equal(readTask(t1).status, 'running', 'the live long-running task keeps its slot');

    // One more queued implement task on a different plan must be blocked by the cap.
    const next = `p${cap + 1}`;
    const decision = taskRegistry.canRun(
      { id: 't99', kind: 'implement', plan: next, touches: [`src/${next}.js`], blockedBy: [], gitOp: false },
      reg,
    );
    assert.equal(decision.run, false, 'the cap counts the live task, so one more is queued');
    assert.equal(decision.reason, 'max-concurrent');
  });

  it('4. a genuine completion of the live task is accepted, not rejected (scenario 7)', () => {
    initRepo(root);
    const [t1] = seedRunning([{ agentTaskId: 'a1' }]);

    // The preview with the live set present holds t1 as alive; without a1 in the list it would go back.
    const rowFor = (live) => ms.route(['menu', 'task', 'sweep'], root, { liveAgentIds: live }).sweep.builds.find((b) => b.id === t1);
    assert.deepEqual([rowFor(['a1']).group, rowFor(['a1']).code], ['never-moved', 'alive']);
    assert.deepEqual([rowFor(['other']).group, rowFor(['other']).code], ['would-go-back', 'confirmed-dead']);

    // The sweep with the live set present leaves t1 running.
    const swept = ms.route(['menu', 'task', 'sweep', '--confirm', 'none'], root, { liveAgentIds: ['a1'] });
    assert.equal(swept.ok, true, 'the sweep that names nothing must run');
    assert.equal(readTask(t1).status, 'running', 'precondition: live task still running after the sweep');

    // The live agent later reports its real completion.
    const res = ms.route(['menu', 'task', 'complete', t1, '--summary', 'done'], root);
    assert.equal(res.ok, true, 'running → done must succeed, NOT be rejected as orphaned → done');
    assert.equal(readTask(t1).status, 'done');
  });

  it('5. with no live ids the preview holds both builds by the kind-aware floor, and naming them moves neither (scenario 8 backstop preserved, R2-A kind-aware floor pinned)', () => {
    // Both tasks are seeded into the SAME registry and previewed in the SAME pass, so neither half
    // can be satisfied by a "fix" that breaks the other:
    //   • disable staleness entirely  → the 150-min build is not held as files-held → 1st fails.
    //   • revert to the flat 30-min floor → the 45-min build turns files-held → 2nd fails.
    initRepo(root);
    const [stale, young] = seedRunning([
      { agentTaskId: 'a1', ageMinutes: PAST_IMPLEMENT_STALE_MIN, plan: 'w10-stale' },
      { agentTaskId: 'a2', ageMinutes: WITHIN_IMPLEMENT_GRACE_MIN, plan: 'w10-young' },
    ]);

    const preview = ms.route(['menu', 'task', 'sweep'], root);
    const row = (id) => preview.sweep.builds.find((b) => b.id === id);
    assert.equal(row(stale).group, 'not-yet');
    assert.equal(row(stale).code, 'files-held', 'an implement task past the 120-min floor, with no live id confirming it, is held on age alone');
    assert.equal(row(young).group, 'not-yet');
    assert.equal(row(young).code, 'under-floor', 'kind-aware floor: a 45-min implement task is INSIDE the 120-min grace window');

    const beforeStale = JSON.stringify(readTask(stale));
    const beforeYoung = JSON.stringify(readTask(young));
    const applied = planRecovery.applySweep(root, { confirm: [stale, young].map((id) => ({ plan: row(id).plan, token: row(id).token })) });
    assert.equal(applied.ok, true);
    assert.deepEqual(applied.notMoved.map((n) => [n.id, n.reason]), [
      [stale, 'no live agent list was given; 150 min old; its files stay held until it is 240 min old'],
      [young, 'no live agent list was given; 45 min old; it can be named once it is 240 min old'],
    ]);
    assert.equal(JSON.stringify(readTask(stale)), beforeStale);
    assert.equal(JSON.stringify(readTask(young)), beforeYoung);
  });
});

describe('W10-s4 (H8) — menu task start records agentTaskId', () => {
  it('6. --agent-id records the harness id; absent → records no agent id (contract replaced 2026-10-18: it used to record the task id)', () => {
    const id = seedQueued('p-start');

    const res = ms.route(['menu', 'task', 'start', id, '--agent-id', 'h9'], root);
    assert.equal(res.ok, true);
    const started = readTask(id);
    assert.equal(started.status, 'running');
    assert.equal(started.agentTaskId, 'h9', 'the caller-supplied harness id is recorded');

    // A second queued task started WITHOUT --agent-id records no agent id: the task id is not an agent's id.
    // a non-build task: the subject here is the recorded agent id, which every kind records the same way
    const reg = taskRegistry.load(root);
    const t2 = taskRegistry.addTask(reg, { kind: 'review', plan: 'p-start-2' });
    taskRegistry.save(root, reg);
    const res2 = ms.route(['menu', 'task', 'start', t2.id], root);
    assert.equal(res2.ok, true);
    assert.equal(readTask(t2.id).agentTaskId, null, 'agentTaskId is null when --agent-id is omitted');
    assert.notEqual(readTask(t2.id).agentTaskId, t2.id, 'and never the task id');
  });

  it('6b. a recorded agentTaskId is what the live set matches on end-to-end', () => {
    // Start a queued task recording harness id h1, age it past the threshold, then
    // reconcile with h1 in the live set → it must NOT be orphaned. This proves the
    // recorded id and the live-set id are the same comparison key.
    const id = seedQueued('p-e2e');
    ms.route(['menu', 'task', 'start', id, '--agent-id', 'h1'], root);

    // Age the started task past the staleness threshold on disk.
    const reg = taskRegistry.load(root);
    const t = reg.tasks.find((x) => x.id === id);
    t.ts.started = minutesAgoIso(PAST_STALE_MIN);
    taskRegistry.save(root, reg);

    const preview = ms.route(['menu', 'task', 'sweep'], root, { liveAgentIds: ['h1'] });
    const row = preview.sweep.builds.find((b) => b.id === id);
    assert.equal(row.group, 'never-moved');
    assert.equal(row.code, 'alive', 'the recorded agentTaskId matched the live set → alive');
    assert.equal(readTask(id).status, 'running');
  });
});

describe('W10-s4 (H8) — ride-along preserved when only --live-agent-ids is passed', () => {
  it('8. spawning `start.js --live-agent-ids a1` still attaches the environment question (integration)', () => {
    // env UNSET (no settings.json) → the environment question must ride along.
    // gdpr profile active in settings.yaml suppresses the compliance ride-along
    // (isolate the environment ride-along, mirroring tests/menu-environment.test.js).
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-w10-s4-proc-'));
    try {
      fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'plans', 'functional'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, '.ctoc', 'settings.yaml'),
        'regulatory_regime:\n  active_profiles: [gdpr]\n  overrides: {}\n\ngeneral:\n  x: 1\n',
      );

      const out = execFileSync(process.execPath, [MENU, '--live-agent-ids', 'a1'], {
        cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      });
      const r = JSON.parse(out);

      // The streaming gate screen still renders (flag did not divert to a
      // sub-command screen); an empty project shows the "nothing pending" screen.
      assert.match(r.text, /No gate decisions pending/i, 'streaming gate screen renders on the live on-open path');
      // The environment question rides along as a SECOND question — not bypassed.
      assert.equal(r.ask.questions.length, 2, 'gate-decision + environment questions');
      assert.equal(r.ask.questions[1].header, 'Environment', 'environment ride-along preserved');
      assert.equal(r.actions['Development'], 'claude:set-environment dev');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('W10-s4 (H8) — pure reconcile core is already live-aware (guard against re-breaking it)', () => {
  it('9. reconcile leaves a matching task running and orphans a non-matching one (unit)', () => {
    const now = Date.parse('2026-07-13T12:00:00.000Z');
    const started = new Date(now - PAST_STALE_MIN * 60_000).toISOString();
    const value = {
      version: taskRegistry.REGISTRY_VERSION,
      seq: 2,
      tasks: [
        { id: 't1', kind: 'implement', status: 'running', agentTaskId: 'a1', ts: { started } },
        { id: 't2', kind: 'implement', status: 'running', agentTaskId: 'a2', ts: { started } },
      ],
    };
    const { tasks, report } = taskReconcile.reconcile(value, { liveAgentIds: ['a1'], now });
    const byId = Object.fromEntries(tasks.tasks.map((t) => [t.id, t]));
    assert.equal(byId.t1.status, 'running', 'live id → left running');
    assert.equal(byId.t2.status, 'orphaned', 'no live id → orphaned');
    assert.deepEqual(report.orphaned, ['t2']);
  });
});
