'use strict';

/**
 * Opening the dashboard changes nothing; a dead build goes back to the build queue only when the
 * human names it in `menu task sweep` (plan real-projects-do-not-stall-on-the-menu-s2).
 *
 * Every case drives the REAL router (`menu-screens.route`), the REAL plan claim
 * (`actions.startAgent`), REAL git repositories in temporary folders and, for the
 * dashboard-writes-nothing case, the REAL `start.js` as a child process. No snapshot or
 * structure tests: each case asserts what a person sees and what is (or is not) on disk.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');
const { spawnSync, execFileSync } = childProcess;

const ms = require('../src/lib/menu-screens');
const actions = require('../src/lib/actions');
const taskRegistry = require('../src/lib/task-registry');
const taskReconcile = require('../src/lib/task-reconcile');
const planRecovery = require('../src/lib/plan-recovery');
const safeFs = require('../src/lib/safe-fs');
const tools = require('../src/tabs/tools');
const cache = require('../src/lib/cache');

const START = path.join(__dirname, '..', 'src', 'commands', 'start.js');
const STAGES = ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done'];
const GIT_IDENTITY = ['-c', 'user.name=Sweep Test', '-c', 'user.email=sweep@test.invalid', '-c', 'commit.gpgsign=false',
  '-c', 'maintenance.auto=false', '-c', 'gc.auto=0'];

// ── environment: no variable matching /^GIT_/i reaches a fixture git call ─────────────────────
function cleanEnv(extra) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^GIT_/i.test(k)) env[k] = v;
  return Object.assign(env, extra || {});
}
function git(cwd, args, dateIso) {
  const extra = dateIso ? { GIT_AUTHOR_DATE: dateIso, GIT_COMMITTER_DATE: dateIso } : {};
  const r = spawnSync('git', [...GIT_IDENTITY, ...args], { cwd, encoding: 'utf8', shell: false, env: cleanEnv(extra) });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

const roots = [];
let root;
const minutesAgo = (n) => new Date(Date.now() - n * 60_000).toISOString();

function scaffold(dir) {
  for (const s of STAGES) fs.mkdirSync(path.join(dir, 'plans', s), { recursive: true });
  fs.mkdirSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.ctoc', 'logs'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
}

/** A realpath'd temporary project; with `git`, a repository holding one 2020 commit. */
function makeProject({ git: withGit = true } = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-sweep-')));
  roots.push(dir);
  scaffold(dir);
  if (withGit) {
    git(dir, ['init', '-q', '-b', 'main']);
    fs.writeFileSync(path.join(dir, 'README.md'), 'readme\n');
    git(dir, ['add', 'README.md']);
    git(dir, ['commit', '-q', '-m', 'init'], '2020-01-01T00:00:00Z');
  }
  return dir;
}

/** `.git` as a file pointing nowhere: git fails deterministically. */
function gitFails(dir) {
  fs.writeFileSync(path.join(dir, '.git'), `gitdir: ${path.join(dir, 'nowhere')}\n`);
}

function planBody(slug, { ticked = false, files } = {}) {
  const mark = ticked ? 'x' : ' ';
  const steps = ['8: TEST', '9: PREPARE', '10: IMPLEMENT', '11: REVIEW', '12: OPTIMIZE', '13: SECURE',
    '14: VERIFY', '15: DOCUMENT', '16: FINAL-REVIEW']
    .map((s) => `### Step ${s}\n- [${mark}] done\n`).join('\n');
  const list = (files || [`src/${slug}.js`]).map((f) => `  - "${f}"`).join('\n');
  return `---\napproved_by: human\napproved_at: 2026-07-14T10:00:00.000Z\ngate_crossed: implementation → todo\n---\n\n` +
    `---\ntitle: "${slug}"\ntype: implementation\niron_loop: true\nfiles:\n${list}\n---\n\n# ${slug}\n\n` +
    `## Execution Plan (Steps 8-16)\n\n${steps}`;
}
function seedPlan(dir, stage, slug, opts) {
  const p = path.join(dir, 'plans', stage, `${slug}.md`);
  fs.writeFileSync(p, planBody(slug, opts));
  return p;
}
const planAt = (dir, stage, slug) => path.join(dir, 'plans', stage, `${slug}.md`);
const inStage = (dir, stage, slug) => fs.existsSync(planAt(dir, stage, slug));

/**
 * Seed tasks through the real registry. spec: { kind, plan, status, agent, startedMin, doneMin,
 * started, result, touches, blockedBy, id }.
 */
function seedTasks(dir, specs) {
  const reg = taskRegistry.load(dir);
  const ids = [];
  for (const s of specs) {
    const kind = s.kind || 'implement';
    const plan = s.plan === undefined ? null : s.plan;
    const t = taskRegistry.addTask(reg, {
      kind, plan, touches: kind === 'implement' ? ['src/seed-placeholder.js'] : [], blockedBy: s.blockedBy,
    });
    t.touches = s.touches || (kind === 'implement' ? [`src/${plan}.js`] : []);
    t.status = s.status || 'running';
    t.agentTaskId = s.agent === undefined ? null : s.agent;
    if (s.started !== undefined) t.ts.started = s.started;
    else if (s.startedMin != null) t.ts.started = minutesAgo(s.startedMin);
    if (s.doneMin != null) t.ts.done = minutesAgo(s.doneMin);
    if (s.result) t.result = s.result;
    if (s.id) t.id = s.id;
    ids.push(t.id);
  }
  taskRegistry.save(dir, reg);
  return ids;
}
const taskOf = (dir, id) => taskRegistry.load(dir).tasks.find((t) => t.id === id);
const taskJson = (dir, id) => JSON.stringify(taskOf(dir, id));

function setStarted(dir, id, iso) {
  const reg = taskRegistry.load(dir);
  reg.tasks.find((t) => t.id === id).ts.started = iso;
  taskRegistry.save(dir, reg);
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
/** The whole tree under `dir` (`.git` excluded): relative path -> sha256 or 'dir'. */
function tree(dir) {
  const out = {};
  const walk = (d) => {
    for (const name of fs.readdirSync(d).sort()) {
      if (name === '.git') continue;
      const abs = path.join(d, name);
      const rel = path.relative(dir, abs).split(path.sep).join('/');
      const st = fs.lstatSync(abs);
      if (st.isDirectory()) { out[rel] = 'dir'; walk(abs); } else out[rel] = sha(fs.readFileSync(abs));
    }
  };
  walk(dir);
  return out;
}
const tasksBytes = (dir) => {
  const p = path.join(dir, '.ctoc', 'state', 'tasks.json');
  return fs.existsSync(p) ? sha(fs.readFileSync(p)) : 'absent';
};
const cleanupLog = (dir) => {
  const p = path.join(dir, '.ctoc', 'logs', 'cleanup.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
};

const sweep = (dir, live, ...words) => ms.route(['menu', 'task', 'sweep', ...words], dir, { liveAgentIds: live == null ? undefined : live });
const dash = (dir, live) => ms.route(['menu'], dir, { liveAgentIds: live == null ? undefined : live });
const rowOf = (res, id) => res.sweep.builds.find((b) => b.id === id);
const tokenOf = (res, id) => `${rowOf(res, id).plan}@${rowOf(res, id).token}`;

/** Replace `child_process.spawnSync` for the duration of fn; `fake(cmd,args,opts,real)` may return a result or undefined. */
function withSpawn(fake, fn) {
  const real = childProcess.spawnSync;
  const calls = [];
  childProcess.spawnSync = function patched(cmd, args, opts) {
    calls.push({ cmd, args: args || [], options: opts || {} });
    const answer = fake ? fake(cmd, args || [], opts || {}) : undefined;
    return answer === undefined ? real.call(this, cmd, args, opts) : answer;
  };
  try { fn(calls); } finally { childProcess.spawnSync = real; }
  return calls;
}

beforeEach(() => { cache.invalidate(); root = makeProject(); });
afterEach(() => {
  cache.invalidate();
  while (roots.length) {
    try { fs.rmSync(roots.pop(), { recursive: true, force: true }); } catch { /* best effort */ }
  }
});

describe('the dashboard never sends live work back to the build queue', () => {
  it('B0. the bug: a start without --agent-id then a dashboard one minute later loses no live build', () => {
    seedPlan(root, 'in-progress', 'b0');
    const [id] = seedTasks(root, [{ plan: 'b0', status: 'queued', touches: ['src/b0.js'] }]);
    const started = ms.route(['menu', 'task', 'start', id], root);
    assert.equal(started.ok, true);
    setStarted(root, id, minutesAgo(2));
    dash(root, ['a1', 'a2']);
    assert.ok(inStage(root, 'in-progress', 'b0'), 'the live build\'s plan must still be in the building folder (it was thrown back to the build queue)');
    assert.equal(taskOf(root, id).status, 'running', 'the live build must still be running');
    assert.equal(taskOf(root, id).agentTaskId, null, `a start without --agent-id must record no agent id (recorded ${JSON.stringify(taskOf(root, id).agentTaskId)})`);
  });

  it('B1. opening the dashboard changes nothing, and one line counts what a sweep would do (scenario 2.1)', () => {
    const seed = (dir) => {
      seedPlan(dir, 'in-progress', 'ap'); seedPlan(dir, 'in-progress', 'bp');
      seedTasks(dir, [
        { plan: 'ap', startedMin: 300 },
        { plan: 'bp', agent: 'b-agent', startedMin: 10 },
        { kind: 'plan', agent: 'p-agent', startedMin: 60 },
        { kind: 'review', status: 'done', startedMin: 8 * 1440 + 10, doneMin: 8 * 1440 },
      ]);
      const tmp = path.join(dir, '.ctoc', 'state', 'tasks.json.tmp-x');
      fs.writeFileSync(tmp, 'partial');
      const old = new Date(Date.now() - 2 * 3600_000);
      fs.utimesSync(tmp, old, old);
    };
    seed(root);
    execFileSync(process.execPath, [START, 'tasks'], { cwd: root, env: cleanEnv(), encoding: 'utf8' }); // ensureInitialized settles first
    const before = tree(root);
    const withList = /2 builds would go back to the build queue when you name them/;
    const noList = /1 build would go back to the build queue when you name it/;
    const renders = [
      (live) => dash(root, live).text,
      (live) => ms.route(['dashboard'], root, { liveAgentIds: live }).text,
      (live) => ms.route([], root, { liveAgentIds: live }).text,
      () => ms.route(['menu', 'commands'], root).text,
    ];
    for (const render of renders) {
      for (const live of [['zz'], undefined, ['zz'], undefined]) {
        const text = render(live);
        assert.deepEqual(tree(root), before, 'a render changed the tree');
        assert.doesNotMatch(text, /orphaned|re-queued/i);
        assert.match(text, /review them with `menu task sweep`/);
        assert.match(text, /1 other task looks dead/);
        assert.match(text, /1 old task would leave the view/);
      }
    }
    assert.match(dash(root, ['zz']).text, withList);
    assert.match(dash(root).text, noList);
    assert.match(dash(root).text, /1 build shows no sign of life \(it can be named once it is 240 min old\)/);
    assert.match(ms.route(['menu', 'commands'], root).text, noList, 'menu commands passes no live list');
    assert.ok(fs.existsSync(path.join(root, '.ctoc', 'state', 'tasks.json.tmp-x')), 'the old temporary file must still be there');
    for (const args of [['menu'], ['dashboard'], ['menu', 'commands']]) {
      const out = execFileSync(process.execPath, [START, ...args], { cwd: root, env: cleanEnv(), encoding: 'utf8' });
      assert.doesNotMatch(JSON.parse(out).text, /orphaned|re-queued/i);
      assert.deepEqual(tree(root), before, `start.js ${args.join(' ')} changed the tree`);
    }
    // A corrupt registry: the only allowed difference is the task warn log, with registry_load_failed lines.
    const bad = makeProject();
    fs.writeFileSync(path.join(bad, '.ctoc', 'state', 'tasks.json'), '{not json');
    execFileSync(process.execPath, [START, 'tasks'], { cwd: bad, env: cleanEnv(), encoding: 'utf8' });
    const badBefore = tree(bad);
    // The registry loader fails OPEN on an unparseable file (no throw), so the preview sees an
    // empty view and stays quiet; the agent status, which saw the corrupt file, speaks.
    for (const live of [['zz'], undefined]) {
      const text = dash(bad, live).text;
      assert.match(text, /the agent status is UNKNOWN/);
      assert.doesNotMatch(text, /DID NOT RUN/);
    }
    const badAfter = tree(bad);
    const changed = Object.keys({ ...badBefore, ...badAfter }).filter((k) => badBefore[k] !== badAfter[k]);
    assert.deepEqual(changed.filter((k) => !k.startsWith('.ctoc/logs/')), [], 'only the task warn log may change');
    for (const k of changed) {
      const entries = JSON.parse(fs.readFileSync(path.join(bad, k), 'utf8'));
      assert.ok(entries.length > 0 && entries.every((e) => e.event === 'registry_load_failed'), `${k} must hold only registry_load_failed entries`);
    }
  });

  it('B2. the dashboard and the preview agree (scenario 2.2)', () => {
    seedPlan(root, 'in-progress', 'b2');
    seedTasks(root, [{ plan: 'b2', agent: 'gone', startedMin: 30 }]);
    const live = ['other'];
    const dText = dash(root, live).text;
    const res = sweep(root, live);
    assert.equal(res.sweep.counts.buildsBack, 1);
    assert.equal(res.sweep.builds.length, 1);
    assert.equal(res.sweep.builds[0].group, 'would-go-back');
    const dn = Number(dText.match(/(\d+) builds? would go back/)[1]);
    const sn = Number(res.text.match(/Would go back to the build queue when you name them \((\d+)\)/)[1]);
    assert.equal(dn, 1);
    assert.equal(dn, sn);
  });

  it('B3. a start without an id is unknown, not dead (scenario 2.3)', () => {
    seedPlan(root, 'in-progress', 'b3');
    const [id] = seedTasks(root, [{ plan: 'b3', status: 'queued' }]);
    assert.equal(ms.route(['menu', 'task', 'start', id], root).ok, true);
    setStarted(root, id, minutesAgo(5));
    const live = ['a1', 'a2'];
    assert.equal(taskOf(root, id).agentTaskId, null);
    const res = sweep(root, live);
    const row = rowOf(res, id);
    assert.equal(row.group, 'not-yet');
    assert.match(row.reason, /no agent id recorded/);
    assert.doesNotMatch(dash(root, live).text, /would go back/);
    const taskBefore = taskJson(root, id);
    const planBefore = fs.readFileSync(planAt(root, 'in-progress', 'b3'));
    sweep(root, live, '--confirm', 'none');
    assert.equal(taskJson(root, id), taskBefore);
    assert.deepEqual(fs.readFileSync(planAt(root, 'in-progress', 'b3')), planBefore);
  });

  it('B4. the old placeholder is unknown and can be replaced (scenario 2.4)', () => {
    seedPlan(root, 'in-progress', 'p1'); seedPlan(root, 'in-progress', 'p2');
    seedTasks(root, [
      { plan: 'p1', agent: 't1', startedMin: 10 },
      { plan: 'p2', agent: 't2', startedMin: 300 },
    ]);
    const res = sweep(root, ['x']);
    assert.equal(rowOf(res, 't1').group, 'not-yet');
    assert.equal(rowOf(res, 't1').code, 'under-floor');
    assert.equal(rowOf(res, 't2').group, 'would-go-back');
    assert.equal(rowOf(res, 't2').code, 'presumed-dead');
    for (const id of ['t1', 't2']) {
      assert.match(rowOf(res, id).reason, /no agent id recorded/);
      assert.doesNotMatch(rowOf(res, id).reason, /confirmed/);
    }
    ms.route(['menu', 'task', 'start', 't1', '--agent-id', 'h7'], root);
    assert.equal(taskOf(root, 't1').agentTaskId, 'h7');
  });

  it('B5. a stamp refuses a fake id (scenario 2.5)', () => {
    seedPlan(root, 'in-progress', 'b5');
    const [id] = seedTasks(root, [{ plan: 'b5', startedMin: 5 }]);
    const before = tasksBytes(root);
    for (const bad of [id, '']) {
      const res = ms.route(['menu', 'task', 'start', id, '--agent-id', bad], root);
      assert.equal(res.ok, false);
      assert.equal(res.reason, 'agent-id-not-real');
      assert.match(res.text, /not empty and not the task id/);
      assert.equal(tasksBytes(root), before);
    }
    const ok = ms.route(['menu', 'task', 'start', id, '--agent-id', 'real-1'], root);
    assert.equal(ok.ok, true);
    assert.equal(taskOf(root, id).agentTaskId, 'real-1');
  });

  it('B6. a live agent is never moved (scenario 2.6)', () => {
    seedPlan(root, 'in-progress', 'b6');
    const [id] = seedTasks(root, [{ plan: 'b6', agent: 'h1', startedMin: 30 }]);
    const preview = sweep(root, ['h1']);
    assert.equal(rowOf(preview, id).group, 'never-moved');
    assert.equal(rowOf(preview, id).code, 'alive');
    const res = sweep(root, ['h1'], '--confirm', tokenOf(preview, id));
    assert.ok(inStage(root, 'in-progress', 'b6'));
    assert.equal(taskOf(root, id).status, 'running');
    assert.match(res.text, /the builder is alive/);
  });

  it('B6b. an already-dead build whose real agent id is in the live list is never moved', () => {
    for (const orphanReason of ['presumed-dead', 'staleness']) {
      const dir = makeProject();
      seedPlan(dir, 'in-progress', 'b6b');
      const [id] = seedTasks(dir, [{ plan: 'b6b', status: 'orphaned', agent: 'h1', startedMin: 300, doneMin: 60,
        result: { ok: false, orphanReason, summary: 's' } }]);
      const preview = sweep(dir, ['h1']);
      assert.equal(rowOf(preview, id).group, 'never-moved', orphanReason);
      assert.equal(rowOf(preview, id).code, 'alive', orphanReason);
      sweep(dir, ['h1'], '--confirm', tokenOf(preview, id));
      assert.ok(inStage(dir, 'in-progress', 'b6b'), `${orphanReason}: the plan must stay in the building folder`);
      assert.ok(!inStage(dir, 'todo', 'b6b'), orphanReason);
    }
  });

  it('B7. exactly the named, still-eligible plans move (scenario 2.8)', () => {
    for (const p of ['pa', 'pb', 'pc', 'pd']) seedPlan(root, 'in-progress', p);
    const [a, b, c, d] = seedTasks(root, [
      { plan: 'pa', agent: 'a-agent', startedMin: 30 },
      { plan: 'pb', agent: 'b-agent', startedMin: 30 },
      { plan: 'pc', agent: 'c-agent', startedMin: 30 },
      { plan: 'pd', agent: 'd-agent', startedMin: 30 },
    ]);
    const live = ['d-agent'];
    const preview = sweep(root, live);
    const bBefore = taskJson(root, b);
    const res = sweep(root, live, '--confirm', [tokenOf(preview, a), tokenOf(preview, c), tokenOf(preview, d)].join(','));
    assert.ok(inStage(root, 'todo', 'pa') && inStage(root, 'todo', 'pc'));
    assert.ok(inStage(root, 'in-progress', 'pb') && inStage(root, 'in-progress', 'pd'));
    assert.equal(taskJson(root, b), bBefore);
    assert.equal(taskOf(root, d).status, 'running');
    assert.match(res.text, /Sent back to the build queue \(2\)/);
    assert.match(res.text, /Not moved \(1\)/);
    assert.match(res.text, /the builder is alive/);
    assert.match(res.text, /1 other build that would go back was not named/);
    const moved = res.text.split('\n').find((l) => /^Changes that moved no plan/.test(l)) || '';
    assert.doesNotMatch(moved, /other task/);
    const log = cleanupLog(root);
    assert.equal(log.length, 2);
    for (const e of log) {
      assert.equal(e.action, 'recovered');
      assert.equal(e.by, 'menu task sweep');
      assert.equal(e.code, 'confirmed-dead');
      assert.match(e.token, /^[0-9a-f]{12}$/);
      assert.equal(e.liveCount, 1);
      assert.equal(e.liveSha256, sha(JSON.stringify(['d-agent'])));
      assert.equal(e.requester, 'not declared');
    }
    const again = sweep(root, live);
    sweep(root, live, '--confirm', tokenOf(again, b), '--by', 'tijn');
    const last = cleanupLog(root).pop();
    assert.equal(last.requester, 'tijn (declared, not verified)');
  });

  it('B8. real claims, batched and uncommitted, are never work (scenario 2.7)', () => {
    for (const p of ['wa', 'wb', 'wc', 'wd', 'we']) seedPlan(root, 'todo', p);
    git(root, ['add', 'plans'], '2020-01-02T00:00:00Z');
    git(root, ['commit', '-q', '-m', 'plans'], '2020-01-02T00:00:00Z');
    fs.writeFileSync(path.join(root, '.ctoc', 'state', 'todo-order.json'), JSON.stringify(['wa.md', 'wb.md', 'wd.md', 'we.md', 'wc.md']));
    const ids = {};
    for (const slug of ['wa', 'wb', 'wd', 'we']) {
      const r = actions.startAgent(root);
      assert.equal(r.started, true);
      assert.equal(r.plan.name, slug);
      ids[slug] = r.task.id;
    }
    assert.ok(inStage(root, 'todo', 'wc'));
    git(root, ['add', 'plans']);
    git(root, ['commit', '-q', '-m', 'claims']);
    const fifth = actions.startAgent(root);
    assert.equal(fifth.started, true);
    assert.equal(fifth.plan.name, 'wc');
    ids.wc = fifth.task.id;
    for (const slug of Object.keys(ids)) {
      ms.route(['menu', 'task', 'start', ids[slug], '--agent-id', `${slug}-agent`], root);
      setStarted(root, ids[slug], minutesAgo(30));
    }
    fs.writeFileSync(path.join(root, 'src', 'wd.js'), 'wd\n');
    git(root, ['add', 'src/wd.js']);
    git(root, ['commit', '-q', '-m', 'wd', '--', 'src/wd.js']);
    git(root, ['checkout', '-q', '-b', 'other-b']);
    fs.writeFileSync(path.join(root, 'src', 'we.js'), 'we\n');
    git(root, ['add', 'src/we.js']);
    git(root, ['commit', '-q', '-m', 'we', '--', 'src/we.js']);
    git(root, ['checkout', '-q', 'main']);

    const live = ['x'];
    const preview = sweep(root, live);
    for (const s of ['wa', 'wb', 'wc']) {
      assert.equal(rowOf(preview, ids[s]).group, 'would-go-back', `${s} must be able to go back: ${rowOf(preview, ids[s]).reason}`);
      assert.equal(rowOf(preview, ids[s]).code, 'confirmed-dead');
    }
    for (const s of ['wd', 'we']) {
      assert.equal(rowOf(preview, ids[s]).group, 'never-moved');
      assert.match(rowOf(preview, ids[s]).reason, /work was found after the claim/);
      assert.ok(preview.text.includes(`menu task complete ${ids[s]}`), `way out for ${s}`);
    }
    assert.match(rowOf(preview, ids.we).reason, /other-b/);
    const all = Object.keys(ids).map((s) => tokenOf(preview, ids[s])).join(',');
    const before = { wd: taskJson(root, ids.wd), we: taskJson(root, ids.we) };
    sweep(root, live, '--confirm', all);
    for (const s of ['wa', 'wb', 'wc']) assert.ok(inStage(root, 'todo', s), `${s} must be back in the build queue`);
    for (const s of ['wd', 'we']) {
      assert.ok(inStage(root, 'in-progress', s));
      assert.equal(taskJson(root, ids[s]), before[s]);
    }
  });

  it('B8d. a project where git fails keeps its dead build', () => {
    const dir = makeProject({ git: false });
    gitFails(dir);
    seedPlan(dir, 'in-progress', 'gf');
    const [id] = seedTasks(dir, [{ plan: 'gf', agent: 'gone', startedMin: 30 }]);
    const res = sweep(dir, ['x']);
    assert.equal(rowOf(res, id).group, 'never-moved');
    assert.match(rowOf(res, id).reason, /git could not show/);
  });

  it('B8e. the project is a subfolder of the repository', () => {
    const top = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-sweep-top-')));
    roots.push(top);
    const dir = path.join(top, 'sub');
    fs.mkdirSync(dir);
    scaffold(dir);
    git(top, ['init', '-q', '-b', 'main']);
    fs.writeFileSync(path.join(top, 'README.md'), 'r\n');
    fs.writeFileSync(path.join(dir, 'src', 'e.js'), 'e\n');
    seedPlan(dir, 'todo', 'pe1');
    seedPlan(dir, 'todo', 'pe2', { files: ['src/e.js'] });
    git(top, ['add', '.'], '2020-01-01T00:00:00Z');
    git(top, ['commit', '-q', '-m', 'init'], '2020-01-01T00:00:00Z');
    fs.writeFileSync(path.join(dir, '.ctoc', 'state', 'todo-order.json'), JSON.stringify(['pe1.md', 'pe2.md']));
    const r1 = actions.startAgent(dir);
    const r2 = actions.startAgent(dir);
    assert.equal(r1.plan.name, 'pe1'); assert.equal(r2.plan.name, 'pe2');
    git(top, ['add', 'sub/plans']);
    git(top, ['commit', '-q', '-m', 'claims']);
    for (const r of [r1, r2]) {
      ms.route(['menu', 'task', 'start', r.task.id, '--agent-id', `${r.plan.name}-agent`], dir);
      setStarted(dir, r.task.id, minutesAgo(30));
    }
    fs.appendFileSync(path.join(dir, 'src', 'e.js'), 'edit\n');
    const res = sweep(dir, ['x']);
    assert.equal(rowOf(res, r1.task.id).group, 'would-go-back', rowOf(res, r1.task.id).reason);
    assert.equal(rowOf(res, r2.task.id).group, 'never-moved');
    assert.match(rowOf(res, r2.task.id).reason, /uncommitted changes in/);
    sweep(dir, ['x'], '--confirm', tokenOf(res, r1.task.id));
    assert.ok(inStage(dir, 'todo', 'pe1'));
  });

  it('B9. a stale confirmation is refused with no write (scenario 2.9)', () => {
    seedPlan(root, 'in-progress', 'b9');
    seedTasks(root, [
      { plan: 'b9', startedMin: 300 },
      { kind: 'review', status: 'done', startedMin: 9 * 1440 + 5, doneMin: 9 * 1440 },
    ]);
    const preview = sweep(root, null);
    const oldToken = tokenOf(preview, 't1');
    ms.route(['menu', 'task', 'start', 't1', '--agent-id', 'h1'], root);
    const before = tasksBytes(root);
    const res = sweep(root, ['h1'], '--confirm', oldToken);
    assert.equal(res.ok, false);
    assert.equal(res.stale, true);
    assert.ok(inStage(root, 'in-progress', 'b9'));
    assert.equal(tasksBytes(root), before, 'a stale confirmation must not even sweep the old task');
    assert.match(res.text, /^Nothing changed/);
    assert.equal(rowOf(res, 't1').group, 'never-moved');
    assert.equal(rowOf(res, 't1').code, 'alive');

    const dir = makeProject();
    seedPlan(dir, 'in-progress', 'b9b');
    seedTasks(dir, [{ plan: 'b9b', agent: 'gone', startedMin: 300 }]);
    const p2 = sweep(dir, ['h1']);
    const b2 = tasksBytes(dir);
    const r2 = sweep(dir, ['h1', 'h2'], '--confirm', tokenOf(p2, 't1'));
    assert.equal(r2.stale, true);
    assert.equal(tasksBytes(dir), b2);
    assert.ok(inStage(dir, 'in-progress', 'b9b'));
  });

  it('B10. an unconfirmed build cannot be pushed forward (scenario 2.10)', () => {
    seedPlan(root, 'in-progress', 'b10', { ticked: true });
    const old = new Date(Date.now() - 3 * 3600_000);
    fs.utimesSync(planAt(root, 'in-progress', 'b10'), old, old);
    const [id] = seedTasks(root, [{ plan: 'b10', agent: 'b-agent', startedMin: 30 }]);
    const res = sweep(root, ['x'], '--confirm', 'none');
    assert.equal(res.ok, true);
    assert.match(res.text, /Sweep applied/);
    const started = actions.startAgent(root);
    assert.ok(inStage(root, 'in-progress', 'b10'));
    assert.equal(taskOf(root, id).status, 'running');
    assert.ok(!(started.cleanedUp || []).includes('b10'), 'the clean-up must not treat the held build as finished');
  });

  describe('B11. the work check, edge cases', () => {
    const rowsFor = (dir, live) => sweep(dir, live === undefined ? null : live).sweep.builds;
    const byPlan = (rows, plan) => rows.find((r) => r.plan === plan);

    it('(a) a build with no start time is held', () => {
      seedPlan(root, 'in-progress', 'na');
      seedTasks(root, [{ plan: 'na', started: 'not-a-date' }]);
      const r = byPlan(rowsFor(root), 'na');
      assert.equal(r.group, 'never-moved');
      assert.match(r.reason, /no start time/);
    });

    it('(b) unreadable declared files are held', () => {
      const bad = ['../outside.js', '/abs/x.js', 'C:/x.js', '', 'src/\u0007x.js'];
      bad.forEach((touch, i) => {
        seedPlan(root, 'in-progress', `bad${i}`);
        seedTasks(root, [{ plan: `bad${i}`, startedMin: 300, touches: [touch, `src/bad${i}.js`] }]);
      });
      const rows = rowsFor(root);
      bad.forEach((touch, i) => {
        const r = byPlan(rows, `bad${i}`);
        assert.equal(r.group, 'never-moved', `touch ${JSON.stringify(touch)}`);
        assert.match(r.reason, /a declared file cannot be checked/);
      });
    });

    it('(c) git magic is refused and a glob is honoured', () => {
      seedPlan(root, 'in-progress', 'mg'); seedPlan(root, 'in-progress', 'gl', { files: ['src/*.js'] });
      seedTasks(root, [
        { plan: 'mg', startedMin: 300, touches: [':(exclude)src/c.js'] },
        { plan: 'gl', startedMin: 300, touches: ['src/*.js'] },
      ]);
      fs.writeFileSync(path.join(root, 'src', 'd.js'), 'd\n');
      git(root, ['add', 'src/d.js']);
      git(root, ['commit', '-q', '-m', 'd', '--', 'src/d.js']);
      const rows = rowsFor(root);
      assert.match(byPlan(rows, 'mg').reason, /a declared file cannot be checked/);
      assert.equal(byPlan(rows, 'gl').group, 'never-moved');
      assert.equal(byPlan(rows, 'gl').code, 'work-found');
    });

    it('(d) a commit in the same second as the start counts as after', () => {
      seedPlan(root, 'in-progress', 'ss');
      const sec = Math.floor((Date.now() - 300 * 60_000) / 1000) * 1000;
      seedTasks(root, [{ plan: 'ss', started: new Date(sec + 500).toISOString() }]);
      fs.writeFileSync(path.join(root, 'src', 'ss.js'), 'x\n');
      git(root, ['add', 'src/ss.js']);
      git(root, ['commit', '-q', '-m', 'ss', '--', 'src/ss.js'], new Date(sec).toISOString().replace(/\.\d+Z$/, 'Z'));
      assert.equal(byPlan(rowsFor(root), 'ss').code, 'work-found');
    });

    it('(e) the plan\'s own files: block counts, and an unreadable plan is held', () => {
      seedPlan(root, 'in-progress', 'pf', { files: ['src/e.js'] });
      seedTasks(root, [{ plan: 'pf', startedMin: 300, touches: ['nothing/x.js'] }]);
      fs.writeFileSync(path.join(root, 'src', 'e.js'), 'e\n');
      git(root, ['add', 'src/e.js']);
      git(root, ['commit', '-q', '-m', 'e', '--', 'src/e.js']);
      assert.equal(byPlan(rowsFor(root), 'pf').code, 'work-found');
      // The plan listing reads the file once; the work check reads it again and cannot. (A folder
      // named like the plan cannot stand in: the listing skips it, so the row would read "not here".)
      const dir = makeProject();
      seedPlan(dir, 'in-progress', 'unread');
      seedTasks(dir, [{ plan: 'unread', startedMin: 300 }]);
      const target = planAt(dir, 'in-progress', 'unread');
      const realRead = safeFs.readFileSync;
      let reads = 0;
      safeFs.readFileSync = function patched(p, ...rest) {
        if (p === target && ++reads > 1) throw new Error('EACCES simulated');
        return realRead.call(this, p, ...rest);
      };
      let r;
      try { r = byPlan(rowsFor(dir), 'unread'); } finally { safeFs.readFileSync = realRead; }
      assert.equal(r.group, 'never-moved');
      assert.match(r.reason, /the plan file cannot be read/);
    });

    it('(f) a declared file inside another repository is held', () => {
      seedPlan(root, 'in-progress', 'vd');
      seedTasks(root, [{ plan: 'vd', startedMin: 300, touches: ['vendor/lib/a.js'] }]);
      fs.mkdirSync(path.join(root, 'vendor', 'lib', '.git'), { recursive: true });
      const r = byPlan(rowsFor(root), 'vd');
      assert.equal(r.group, 'never-moved');
      assert.match(r.reason, /a declared file sits in another repository/);
    });

    it('(g) an unsafe plan name is never offered', () => {
      seedPlan(root, 'in-progress', 'bad slug');
      seedTasks(root, [{ plan: 'bad slug', startedMin: 300, touches: ['src/bs.js'] }]);
      const res = sweep(root, null);
      const r = byPlan(res.sweep.builds, 'bad slug');
      assert.equal(r.group, 'never-moved');
      assert.equal(r.code, 'unsafe-name');
      const confirm = Object.entries(res.actions || {}).map(([, v]) => String(v)).join('\n');
      assert.doesNotMatch(confirm, /bad slug/);
    });

    it('(h) a commit tied only to a build that started after it holds nobody', () => {
      const run = (withCommit) => {
        const dir = makeProject();
        seedPlan(dir, 'in-progress', 'xx'); seedPlan(dir, 'in-progress', 'zz');
        seedTasks(dir, [
          { plan: 'xx', agent: 'x-agent', startedMin: 30 },
          { plan: 'zz', agent: 'z-agent', startedMin: 2 },
        ]);
        if (withCommit) {
          fs.writeFileSync(path.join(dir, 'src', 'zz.js'), 'z\n');
          git(dir, ['add', 'src/zz.js']);
          git(dir, ['commit', '-q', '-m', 'z', '--', 'src/zz.js'], new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d+Z$/, 'Z'));
        }
        return sweep(dir, ['q']).sweep.builds.map((b) => [b.plan, b.group, b.code]);
      };
      const withCommit = run(true);
      assert.deepEqual(withCommit, run(false));
      assert.deepEqual(withCommit.find((r) => r[0] === 'xx'), ['xx', 'would-go-back', 'confirmed-dead']);
      assert.deepEqual(withCommit.find((r) => r[0] === 'zz'), ['zz', 'would-go-back', 'confirmed-dead']);
    });

    it('(i) a non-ASCII declared file is matched (core.quotePath=false)', () => {
      seedPlan(root, 'in-progress', 'cc', { files: ['src/café.js'] });
      seedPlan(root, 'in-progress', 'ss2', { files: ['src/s.js'] });
      seedTasks(root, [
        { plan: 'cc', agent: 'c-agent', startedMin: 30, touches: ['src/café.js'] },
        { plan: 'ss2', agent: 's-agent', startedMin: 30, touches: ['src/s.js'] },
      ]);
      fs.writeFileSync(path.join(root, 'src', 'café.js'), 'c\n');
      git(root, ['add', 'src/café.js']);
      git(root, ['commit', '-q', '-m', 'c', '--', 'src/café.js']);
      const rows = rowsFor(root, ['q']);
      assert.equal(byPlan(rows, 'cc').code, 'work-found');
      assert.equal(byPlan(rows, 'ss2').group, 'would-go-back');
    });
  });

  it('B12. the Doctor key moves no plan (scenario 2.11)', () => {
    seedPlan(root, 'in-progress', 'ap'); seedPlan(root, 'in-progress', 'bp');
    const ids = seedTasks(root, [
      { plan: 'ap', startedMin: 300 },
      { plan: 'bp', agent: 'b-agent', startedMin: 10 },
      { kind: 'review', status: 'done', startedMin: 8 * 1440 + 10, doneMin: 8 * 1440 },
    ]);
    const before = [taskJson(root, ids[0]), taskJson(root, ids[1])];
    const app = { toolMode: '1', projectPath: root };
    assert.equal(tools.handleKey({ name: '2', sequence: '2' }, app), true);
    assert.equal(taskOf(root, ids[2]), undefined, 'the old done task must be gone');
    assert.deepEqual([taskJson(root, ids[0]), taskJson(root, ids[1])], before);
    assert.ok(inStage(root, 'in-progress', 'ap') && inStage(root, 'in-progress', 'bp'));
    assert.match(app.message, /1 build waits for you to name it: menu task sweep/);
  });

  it('B13. the dashboard line\'s parts', () => {
    const lineOf = (dir, live) => dash(dir, live).text;
    const clean = lineOf(root);
    assert.doesNotMatch(clean, /would go back|cannot go back|no sign of life|look dead|can never run|files of|leave the view/);

    const a = makeProject();
    seedTasks(a, [{ kind: 'review', status: 'orphaned', startedMin: 300, doneMin: 250,
      result: { ok: false, orphanReason: 'staleness', summary: 's' } }]);
    assert.match(lineOf(a), /the files of 1 dead task would be released/);

    const b = makeProject();
    seedTasks(b, [{ kind: 'review', status: 'queued', blockedBy: ['t99'] }]);
    assert.match(lineOf(b), /1 task can never run/);

    const c = makeProject();
    seedPlan(c, 'in-progress', 'cw');
    seedTasks(c, [{ plan: 'cw', startedMin: 300 }]);
    fs.writeFileSync(path.join(c, 'src', 'cw.js'), 'w\n');
    git(c, ['add', 'src/cw.js']);
    git(c, ['commit', '-q', '-m', 'cw', '--', 'src/cw.js']);
    assert.match(lineOf(c), /1 dead build cannot go back on its own/);

    const d = makeProject();
    seedPlan(d, 'in-progress', 'dn');
    seedTasks(d, [{ plan: 'dn', startedMin: 45 }]);
    assert.match(lineOf(d), /1 build shows no sign of life \(it can be named once it is 240 min old\)/);

    const e = makeProject();
    seedPlan(e, 'in-progress', 'eo');
    seedTasks(e, [{ plan: 'eo', status: 'orphaned', startedMin: 300, doneMin: 280,
      result: { ok: false, orphanReason: 'staleness', summary: 's' } }]);
    const t = lineOf(e);
    assert.match(t, /1 build would go back/);
    assert.doesNotMatch(t, /the files of/);
  });

  it('B14. argument faults and the apply screen', () => {
    seedPlan(root, 'in-progress', 'q1');
    const before = tasksBytes(root);
    for (const words of [['x'], ['--confirm'], ['--confirm', 'p@ZZ'], ['--confirm', 'p@0123456789ab,p@ba9876543210']]) {
      const res = sweep(root, null, ...words);
      assert.equal(res.refused, true, `refused: ${words.join(' ')}`);
      assert.equal(tasksBytes(root), before);
    }
    assert.equal(sweep(root, null, '--confirm', 'nope@0123456789ab').stale, true);
  });

  it('B14b. blocked, judged-alive-again and moved builds are all listed', () => {
    for (const p of ['m1', 'm2', 'm3']) seedPlan(root, 'in-progress', p);
    seedPlan(root, 'todo', 'm1');
    seedTasks(root, [
      { plan: 'm1', agent: 'gone1', startedMin: 30 },
      { plan: 'm2', agent: 'gone2', startedMin: 30 },
      { plan: 'm3', agent: 'gone3', startedMin: 30 },
    ]);
    const live = ['h2'];
    const preview = sweep(root, live);
    const real = taskReconcile.reconcileState;
    taskReconcile.reconcileState = function wrapped(r, o) {
      taskRegistry.withRegistry(r, (reg) => { reg.tasks.find((t) => t.id === 't2').agentTaskId = 'h2'; });
      return real.call(this, r, o);
    };
    let res;
    try {
      res = sweep(root, live, '--confirm', ['t1', 't2', 't3'].map((i) => tokenOf(preview, i)).join(','));
    } finally { taskReconcile.reconcileState = real; }
    assert.match(res.text, /a plan of the same name already waits/);
    assert.equal(taskOf(root, 't1').status, 'running');
    assert.match(res.text, /judged alive again when the sweep was applied/);
    assert.ok(inStage(root, 'in-progress', 'm2'));
    assert.equal(taskOf(root, 't2').status, 'running');
    assert.ok(inStage(root, 'todo', 'm3'));
    assert.ok(inStage(root, 'in-progress', 'm1'), 'the blocked plan must not move');
  });

  it('B14c. a save fault names the failure and moves no running build', () => {
    seedPlan(root, 'in-progress', 'sf');
    const [id] = seedTasks(root, [{ plan: 'sf', agent: 'gone', startedMin: 30 }]);
    const preview = sweep(root, ['x']);
    const real = safeFs.renameSync;
    safeFs.renameSync = function failing(from, to) {
      if (String(to).endsWith('tasks.json')) throw new Error('EIO simulated');
      return real.call(this, from, to);
    };
    let res;
    try { res = sweep(root, ['x'], '--confirm', tokenOf(preview, id)); } finally { safeFs.renameSync = real; }
    assert.match(res.text, /could NOT be saved/);
    assert.match(res.text, /the task changes could not be saved/);
    assert.ok(inStage(root, 'in-progress', 'sf'));
  });

  it('B14d. freed slots can make queued tasks runnable: promote', () => {
    const ids = seedTasks(root, [
      { kind: 'review', status: 'done', startedMin: 20, doneMin: 10 },
      { kind: 'plan', agent: 'gone', startedMin: 60 },
    ]);
    const reg = taskRegistry.load(root);
    const sync = taskRegistry.addTask(reg, { kind: 'sync', blockedBy: [ids[0]] });
    taskRegistry.save(root, reg);
    const res = sweep(root, ['x'], '--confirm', 'none');
    assert.ok((res.promote || []).some((p) => p.id === sync.id), JSON.stringify(res.promote));
  });

  it('B16. an orphan already swept by retention in the same pass still moves its plan', () => {
    seedPlan(root, 'in-progress', 'old1');
    const [id] = seedTasks(root, [{ plan: 'old1', status: 'orphaned', startedMin: 8 * 1440 + 30, doneMin: 8 * 1440,
      result: { ok: false, orphanReason: 'presumed-dead', summary: 's' } }]);
    const preview = sweep(root, null);
    assert.equal(rowOf(preview, id).group, 'would-go-back');
    assert.equal(rowOf(preview, id).code, 'already-dead');
    assert.match(rowOf(preview, id).reason, /its task was already marked dead/);
    sweep(root, null, '--confirm', tokenOf(preview, id));
    assert.ok(inStage(root, 'todo', 'old1'));
    assert.equal(cleanupLog(root).filter((e) => e.action === 'recovered').length, 1);
    assert.equal(taskOf(root, id), undefined);
  });

  it('B17. one time budget per preview', () => {
    for (const p of ['u1', 'u2', 'u3']) seedPlan(root, 'in-progress', p);
    seedTasks(root, [{ plan: 'u1', startedMin: 300 }, { plan: 'u2', startedMin: 300 }, { plan: 'u3', startedMin: 300 }]);
    process.env.git_dir_probe = 'x';
    try {
      const calls = withSpawn(null, () => { dash(root); }).filter((c) => c.cmd === 'git');
      assert.equal(calls.filter((c) => c.args.includes('log')).length, 1);
      for (const c of calls.filter((x) => x.args.includes('status'))) assert.equal(c.args[0], '--no-optional-locks');
      for (const c of calls.filter((x) => x.args.includes('status') || x.args.includes('log'))) {
        const i = c.args.indexOf('core.fsmonitor=false');
        assert.ok(i > 0 && c.args[i - 1] === '-c', `no filesystem monitor may start: ${c.args.join(' ')}`);
      }
      assert.equal(calls.filter((c) => c.args.includes('--version')).length, 0);
      for (const c of calls) {
        assert.ok(c.options.timeout <= 5000, `timeout ${c.options.timeout}`);
        assert.equal(c.options.shell, false);
        assert.ok(c.options.env && !Object.keys(c.options.env).some((k) => /^GIT_/i.test(k)));
        assert.equal(c.options.env.git_dir_probe, undefined);
      }
      assert.ok(calls.length > 0, 'a would-go-back build must reach the work check');
    } finally { delete process.env.git_dir_probe; }
    const timeoutAnswer = () => ({ error: Object.assign(new Error('spawnSync git ETIMEDOUT'), { code: 'ETIMEDOUT' }), status: null, stdout: '', stderr: '' });
    let rows;
    withSpawn((cmd) => (cmd === 'git' ? timeoutAnswer() : undefined), () => { rows = sweep(root, null).sweep.builds; });
    assert.equal(rows.length, 3);
    for (const r of rows) {
      assert.equal(r.group, 'never-moved'); assert.equal(r.code, 'git-failed');
      assert.match(r.reason, /not checked in time/);
      assert.doesNotMatch(r.reason, /ETIMEDOUT/);
    }
    const realNow = Date.now;
    let reads = 0; let clock = realNow();
    Date.now = () => { reads += 1; if (reads > 1) clock += 6000; return clock; };
    let spawned = 0;
    try {
      withSpawn((cmd) => { if (cmd === 'git') spawned += 1; return undefined; }, () => { rows = sweep(root, null).sweep.builds; });
    } finally { Date.now = realNow; }
    assert.equal(spawned, 0, 'no git spawn may run past the budget');
    for (const r of rows) assert.match(r.reason, /not checked in time/);
  });

  it('B18. uncommitted work in another worktree holds the build', () => {
    fs.writeFileSync(path.join(root, 'src', 'w.js'), 'w\n');
    git(root, ['add', 'src/w.js']);
    git(root, ['commit', '-q', '-m', 'w'], '2020-01-02T00:00:00Z');
    const wt = path.join(path.dirname(root), `${path.basename(root)}-wt`);
    git(root, ['worktree', 'add', '-q', wt, '-b', 'wt']);
    roots.push(wt);
    fs.appendFileSync(path.join(wt, 'src', 'w.js'), 'dirty\n');
    seedPlan(root, 'in-progress', 'w');
    seedTasks(root, [{ plan: 'w', startedMin: 300 }]);
    const other = makeProject();
    process.env.GIT_DIR = path.join(other, '.git');
    try {
      let r = rowOf(sweep(root, null), 't1');
      assert.equal(r.group, 'never-moved');
      assert.equal(r.code, 'work-found');
      assert.match(r.reason, /uncommitted changes in/);
      assert.ok(r.reason.includes(path.basename(wt)));
      git(wt, ['checkout', '--', 'src/w.js']);
      r = rowOf(sweep(root, null), 't1');
      assert.equal(r.group, 'would-go-back');
    } finally { delete process.env.GIT_DIR; }
  });

  it('B19. a task id that is not safe in a command gets no command', () => {
    seedPlan(root, 'in-progress', 'sx');
    seedTasks(root, [{ plan: 'sx', startedMin: 300, id: 't1;x' }]);
    fs.writeFileSync(path.join(root, 'src', 'sx.js'), 'x\n');
    git(root, ['add', 'src/sx.js']);
    git(root, ['commit', '-q', '-m', 'sx', '--', 'src/sx.js']);
    const res = sweep(root, null);
    assert.doesNotMatch(res.text, /menu task complete/);
    assert.doesNotMatch(res.text, /menu task fail/);
    assert.match(res.text, /finish or give up this task from the task board/);
  });

  describe('B20. every remaining branch', () => {
    it('(a) a 30-second-old running build is young', () => {
      seedPlan(root, 'in-progress', 'yg');
      const [id] = seedTasks(root, [{ plan: 'yg', agent: 'gone', started: new Date(Date.now() - 30_000).toISOString() }]);
      const r = rowOf(sweep(root, ['x']), id);
      assert.equal(r.group, 'not-yet'); assert.equal(r.code, 'young');
    });

    it('(b) a released build whose plan is not being built here', () => {
      seedPlan(root, 'todo', 'nh');
      const [id] = seedTasks(root, [{ plan: 'nh', agent: 'gone', startedMin: 30 }]);
      const r = rowOf(sweep(root, ['x']), id);
      assert.equal(r.group, 'never-moved'); assert.equal(r.code, 'not-here');
    });

    it('(c) a git that cannot start', () => {
      seedPlan(root, 'in-progress', 'ge');
      const [id] = seedTasks(root, [{ plan: 'ge', startedMin: 300 }]);
      let r;
      withSpawn((cmd) => (cmd === 'git' ? { error: new Error('spawn git ENOENT'), status: null, stdout: '', stderr: '' } : undefined),
        () => { r = rowOf(sweep(root, null), id); });
      assert.equal(r.code, 'git-failed');
      assert.match(r.reason, /spawn git ENOENT/);
    });

    it('(d) a commit printed with no changed paths is work for the builds it follows', () => {
      seedPlan(root, 'in-progress', 'old2'); seedPlan(root, 'in-progress', 'new2');
      const [o, n] = seedTasks(root, [{ plan: 'old2', startedMin: 300 }, { plan: 'new2', startedMin: 260 }]);
      const ct = Math.floor((Date.now() - 280 * 60_000) / 1000);
      const sha1 = 'a'.repeat(40);
      let rows;
      withSpawn((cmd, args) => (cmd === 'git' && args.includes('log')
        ? { status: 0, stdout: `\u0001${sha1}\t${ct}\tmain\t${'c'.repeat(40)}\n\n`, stderr: '' } : undefined),
      () => { rows = sweep(root, null).sweep.builds; });
      assert.equal(rows.find((r) => r.id === o).code, 'work-found');
      assert.equal(rows.find((r) => r.id === n).group, 'would-go-back');
    });

    it('(e) an empty source reads as a local branch', () => {
      seedPlan(root, 'in-progress', 'es');
      const [id] = seedTasks(root, [{ plan: 'es', startedMin: 300 }]);
      const ct = Math.floor((Date.now() - 100 * 60_000) / 1000);
      let r;
      withSpawn((cmd, args) => (cmd === 'git' && args.includes('log')
        ? { status: 0, stdout: `\u0001${'b'.repeat(40)}\t${ct}\t\n\n`, stderr: '' } : undefined),
      () => { r = rowOf(sweep(root, null), id); });
      assert.equal(r.code, 'work-found');
      assert.match(r.reason, /on a local branch/);
    });

    it('(f) a malformed preview prints no sweep line and does not throw', () => {
      const real = planRecovery.previewSweep;
      try {
        for (const bad of [{ counts: { pending: 'x' } }, null, {}]) {
          planRecovery.previewSweep = () => bad;
          let text;
          assert.doesNotThrow(() => { text = dash(root).text; });
          assert.doesNotMatch(text, /review them with/);
        }
      } finally { planRecovery.previewSweep = real; }
    });

    it('(h) the free-the-other-tasks option exists only when something is pending', () => {
      assert.ok(!Object.keys(sweep(root, null).actions).some((k) => /Free only the other tasks/.test(k)));
      const dir = makeProject();
      seedTasks(dir, [{ kind: 'plan', agent: 'gone', startedMin: 60 }]);
      const res = sweep(dir, ['x']);
      assert.equal(res.actions['Free only the other tasks'], 'menu task sweep --confirm none');
    });
  });

  it('B21. one plan, two builds', () => {
    seedPlan(root, 'in-progress', 'p21');
    seedTasks(root, [{ plan: 'p21', agent: 'g1', startedMin: 30 }, { plan: 'p21', agent: 'g2', startedMin: 30 }]);
    const res = sweep(root, ['x']);
    for (const id of ['t1', 't2']) {
      assert.equal(rowOf(res, id).group, 'never-moved');
      assert.equal(rowOf(res, id).code, 'plan-shared');
      assert.ok(res.text.includes(`menu task complete ${id}`));
      assert.ok(!Object.values(res.actions).some((a) => String(a).includes(rowOf(res, id).token)));
    }
    assert.equal(sweep(root, ['x'], '--confirm', tokenOf(res, 't1')).stale, true);
  });

  it('B22. a move that fails after the task was marked dead restores the task', () => {
    seedPlan(root, 'in-progress', 'mv');
    const [id] = seedTasks(root, [{ plan: 'mv', agent: 'gone', startedMin: 30 }]);
    const before = taskOf(root, id);
    const preview = sweep(root, ['x']);
    const real = actions.movePlan;
    actions.movePlan = () => { throw new Error('EBUSY'); };
    let res;
    try { res = sweep(root, ['x'], '--confirm', tokenOf(preview, id)); } finally { actions.movePlan = real; }
    assert.match(res.text, /move failed: EBUSY/);
    assert.ok(inStage(root, 'in-progress', 'mv'));
    assert.deepEqual(taskOf(root, id), before);
    assert.equal(cleanupLog(root).length, 0);
  });

  it('B23. a git older than the minimum names its version', () => {
    seedPlan(root, 'in-progress', 'ov');
    const [id] = seedTasks(root, [{ plan: 'ov', startedMin: 300 }]);
    const run = (version) => {
      let r;
      withSpawn((cmd, args) => {
        if (cmd !== 'git') return undefined;
        if (args[0] === 'worktree') return { status: 129, stdout: '', stderr: "error: unknown option `z'\n" };
        if (args[0] === '--version') return { status: 0, stdout: `git version ${version}\n`, stderr: '' };
        return undefined;
      }, () => { r = rowOf(sweep(root, null), id); });
      return r;
    };
    const old = run('2.30.0');
    assert.equal(old.code, 'git-failed');
    assert.match(old.reason, /git 2\.30\.0 is older than 2\.36/);
    const fresh = run('2.47.1');
    assert.match(fresh.reason, /error: unknown option/);
    assert.doesNotMatch(fresh.reason, /older than/);
  });
});

describe('B24. the review kickback round (work check fails closed per task, worktrees first, merges, one name rule)', () => {
  const planCoverage = require('../src/lib/plan-coverage');
  const rows = (dir, live) => sweep(dir, live === undefined ? null : live).sweep.builds;

  describe('work check: a plan with nothing to check, or an unreadable one, holds only itself', () => {
    it('(a) a plan that declares no file at all is held, whatever the working tree holds', () => {
      seedPlan(root, 'in-progress', 'nf', { files: [] });
      seedTasks(root, [{ plan: 'nf', startedMin: 300, touches: [] }]);
      fs.writeFileSync(path.join(root, 'src', 'x.js'), 'x\n');
      const [r] = rows(root);
      assert.equal(r.group, 'never-moved');
      assert.match(r.reason, /the plan declares no file to check/);
    });

    it('(b) a plan that declares only plan files is held the same way', () => {
      seedPlan(root, 'in-progress', 'po', { files: ['plans/other.md'] });
      seedTasks(root, [{ plan: 'po', startedMin: 300, touches: [] }]);
      fs.writeFileSync(path.join(root, 'src', 'x.js'), 'x\n');
      const [r] = rows(root);
      assert.equal(r.group, 'never-moved');
      assert.match(r.reason, /the plan declares no file to check/);
    });

    it('(c) a plan whose files: block cannot be read is held; the other plan is still computed', () => {
      seedPlan(root, 'in-progress', 'ra'); seedPlan(root, 'in-progress', 'rb');
      seedTasks(root, [{ plan: 'ra', agent: 'gone', startedMin: 300 }, { plan: 'rb', agent: 'gone', startedMin: 300 }]);
      const real = planCoverage.readPlanFiles;
      planCoverage.readPlanFiles = function patched(file, content) {
        if (String(file).endsWith('ra.md')) throw new Error('unreadable files block simulated');
        return real.call(this, file, content);
      };
      let result;
      try { result = rows(root, ['x']); } finally { planCoverage.readPlanFiles = real; }
      const a = result.find((r) => r.plan === 'ra');
      const b = result.find((r) => r.plan === 'rb');
      assert.equal(a.group, 'never-moved');
      assert.match(a.reason, /the plan file cannot be read/);
      assert.equal(b.group, 'would-go-back');
    });
  });

  describe('work check: the worktrees are listed first', () => {
    it('(a) a git that lists no worktree at all holds the build', () => {
      seedPlan(root, 'in-progress', 'wl');
      seedTasks(root, [{ plan: 'wl', startedMin: 300 }]);
      let r;
      withSpawn((cmd, args) => (cmd === 'git' && args[0] === 'worktree' && args[1] === 'list'
        ? { status: 0, stdout: '', stderr: '' } : undefined), () => { [r] = rows(root); });
      assert.equal(r.group, 'never-moved');
      assert.match(r.reason, /git listed no worktree/);
    });

    it('(b) a commit made in a linked worktree on a detached HEAD, after the claim, is work', () => {
      seedPlan(root, 'in-progress', 'dh');
      seedTasks(root, [{ plan: 'dh', startedMin: 300 }]);
      const wt = path.join(path.dirname(root), `${path.basename(root)}-dh`);
      git(root, ['worktree', 'add', '-q', '--detach', wt]);
      roots.push(wt);
      fs.mkdirSync(path.join(wt, 'src'), { recursive: true });
      fs.writeFileSync(path.join(wt, 'src', 'dh.js'), 'dh\n');
      git(wt, ['add', 'src/dh.js']);
      git(wt, ['commit', '-q', '-m', 'dh']);
      const [r] = rows(root);
      assert.equal(r.group, 'never-moved');
      assert.equal(r.code, 'work-found');
      assert.match(r.reason, /commit [0-9a-f]{12} on a detached worktree/);
    });
  });

  describe('work check: merge records', () => {
    const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
    const commitOnMain = () => {
      fs.writeFileSync(path.join(root, 'main2.txt'), 'm\n');
      git(root, ['add', 'main2.txt']);
      git(root, ['commit', '-q', '-m', 'main2']);
    };

    it('(a) a branch merged with --no-ff that changed no declared file leaves the build going back', () => {
      seedPlan(root, 'in-progress', 'ma');
      seedTasks(root, [{ plan: 'ma', startedMin: 300 }]);
      git(root, ['checkout', '-q', '-b', 'side']);
      fs.writeFileSync(path.join(root, 'other.txt'), 'o\n');
      git(root, ['add', 'other.txt']);
      git(root, ['commit', '-q', '-m', 'other'], daysAgo(60));
      git(root, ['checkout', '-q', 'main']);
      commitOnMain();
      git(root, ['merge', '-q', '--no-ff', 'side', '-m', 'merge side']);
      assert.equal(rows(root)[0].group, 'would-go-back');
    });

    it('(b) main merged into a branch that holds declared-file work from before the claim is not work after it', () => {
      seedPlan(root, 'in-progress', 'mb');
      seedTasks(root, [{ plan: 'mb', startedMin: 300 }]);
      git(root, ['checkout', '-q', '-b', 'side']);
      fs.writeFileSync(path.join(root, 'src', 'mb.js'), 'mb\n');
      git(root, ['add', 'src/mb.js']);
      git(root, ['commit', '-q', '-m', 'mb'], daysAgo(60));
      git(root, ['checkout', '-q', 'main']);
      commitOnMain();
      git(root, ['checkout', '-q', 'side']);
      git(root, ['merge', '-q', '--no-ff', 'main', '-m', 'merge main into side']);
      const [r] = rows(root);
      assert.equal(r.group, 'would-go-back', `${r.code}: ${r.reason}`);
    });

    it('(c) a branch merged with --no-ff that brings declared-file changes after the claim is work', () => {
      seedPlan(root, 'in-progress', 'mc');
      seedTasks(root, [{ plan: 'mc', startedMin: 300 }]);
      git(root, ['checkout', '-q', '-b', 'side']);
      fs.writeFileSync(path.join(root, 'src', 'mc.js'), 'mc\n');
      git(root, ['add', 'src/mc.js']);
      git(root, ['commit', '-q', '-m', 'mc'], daysAgo(60));
      git(root, ['checkout', '-q', 'main']);
      commitOnMain();
      git(root, ['merge', '-q', '--no-ff', 'side', '-m', 'merge side']);
      const [r] = rows(root);
      assert.equal(r.group, 'never-moved');
      assert.equal(r.code, 'work-found');
    });

    it('(d) a printed record with no lines: a merge (two parents) is work for nobody, any other is work for the builds it follows', () => {
      seedPlan(root, 'in-progress', 'old3');
      seedTasks(root, [{ plan: 'old3', startedMin: 300 }]);
      const ct = Math.floor((Date.now() - 100 * 60_000) / 1000);
      const run = (parents) => {
        let r;
        withSpawn((cmd, args) => (cmd === 'git' && args.includes('log')
          ? { status: 0, stdout: `\u0001${'a'.repeat(40)}\t${ct}\tmain\t${parents}\n\n`, stderr: '' } : undefined),
        () => { [r] = rows(root); });
        return r;
      };
      assert.equal(run(['c'.repeat(40), 'd'.repeat(40)].join(' ')).group, 'would-go-back');
      assert.equal(run('c'.repeat(40)).code, 'work-found');
      assert.equal(run('').code, 'work-found');
    });
  });

  describe('apply: the reasons for a build that did not move', () => {
    it('(a) an already-dead build whose staleness mark could not be saved says the changes could not be saved', () => {
      seedPlan(root, 'in-progress', 'sd');
      const [id] = seedTasks(root, [{ plan: 'sd', status: 'orphaned', startedMin: 300, doneMin: 250,
        result: { ok: false, orphanReason: 'staleness', summary: 's' } }]);
      const preview = sweep(root, null);
      assert.equal(rowOf(preview, id).group, 'would-go-back', `${rowOf(preview, id).code}: ${rowOf(preview, id).reason}`);
      const real = safeFs.renameSync;
      safeFs.renameSync = function failing(from, to) {
        if (String(to).endsWith('tasks.json')) throw new Error('EIO simulated');
        return real.call(this, from, to);
      };
      let res;
      try { res = sweep(root, null, '--confirm', tokenOf(preview, id)); } finally { safeFs.renameSync = real; }
      assert.match(res.text, /the task changes could not be saved/);
      assert.doesNotMatch(res.text, /no longer being built here/);
      assert.ok(inStage(root, 'in-progress', 'sd'));
    });

    it('(b) a move that fails when the task could not be read beforehand says the task could not be restored', () => {
      seedPlan(root, 'in-progress', 'nr');
      const [id] = seedTasks(root, [{ plan: 'nr', agent: 'gone', startedMin: 30 }]);
      const preview = sweep(root, ['x']);
      const realLoad = taskRegistry.load;
      const realMove = actions.movePlan;
      let loads = 0;
      taskRegistry.load = function counting(r) {
        loads += 1;
        if (loads === 2) throw new Error('EIO simulated');
        return realLoad.call(this, r);
      };
      actions.movePlan = () => { throw new Error('EBUSY'); };
      let res;
      try {
        res = planRecovery.applySweep(root, { confirm: [{ plan: 'nr', token: rowOf(preview, id).token }], liveAgentIds: ['x'] });
      } finally { taskRegistry.load = realLoad; actions.movePlan = realMove; }
      assert.equal(res.ok, true);
      assert.equal(res.notMoved.length, 1);
      assert.match(res.notMoved[0].reason, /move failed: EBUSY/);
      assert.match(res.notMoved[0].reason, /could not be restored: its record could not be read before the sweep/);
    });
  });

  describe('one plan-name rule', () => {
    it('a plan name of 201 characters, or one starting with a dot, is never offered or checked', () => {
      for (const plan of ['a'.repeat(201), '.hidden']) {
        const dir = makeProject();
        seedPlan(dir, 'in-progress', plan);
        seedTasks(dir, [{ plan, startedMin: 300 }]);
        const res = sweep(dir, null);
        const r = res.sweep.builds.find((b) => b.plan === plan);
        assert.equal(r.group, 'never-moved', plan);
        assert.equal(r.code, 'unsafe-name', plan);
        assert.doesNotMatch(Object.values(res.actions || {}).map(String).join('\n'), new RegExp(plan.replace(/\./g, '\\.')));
      }
    });
  });
});
