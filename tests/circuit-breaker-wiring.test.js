/**
 * Circuit-breaker wiring (finding C9) — the live counter + human escalation.
 *
 * CLAUDE.md promises: max 3 kickbacks to the same step, max 5 total per plan,
 * then escalate to the human. Before this wiring recordKickback/getEscalations
 * had zero live callers, so that promise was enforced NOWHERE and an overnight
 * pipeline could loop forever unseen. This suite drives the REAL live kickback
 * path — actions.completeExecution refusing to advance a plan out of execution —
 * and asserts the escalation is recorded AND reachable via getEscalations after
 * the 4th same-step kickback and the 6th total kickback.
 *
 * Zero doubles: no mocking. Every kickback is a real completeExecution call
 * against a real plan whose pre-review validation genuinely fails, so the counter
 * increments through the shipped code path, not a simulated one.
 *
 * The second block drives the other live route into the same counter: the session's
 * completion of a review, security or quality round, `menu task complete <id> --continue
 * --send-back <step>`, through the real menu router (and, for one case, the real command).
 */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const actions = require('../src/lib/actions');
const circuitBreaker = require('../src/lib/circuit-breaker');
const ms = require('../src/lib/menu-screens');
const taskRegistry = require('../src/lib/task-registry');
const ledger = require('../src/lib/approval-ledger');
const { verifyEvidencePath } = require('../src/lib/step-13-verify');

const STEPS = [
  [8, 'TEST'], [9, 'PREPARE'], [10, 'IMPLEMENT'], [11, 'REVIEW'], [12, 'OPTIMIZE'],
  [13, 'SECURE'], [14, 'VERIFY'], [15, 'DOCUMENT'], [16, 'FINAL-REVIEW']
];

// Render the execution section OMITTING `missingStep` entirely. validateForReview
// (the completeExecution gate) errors on an ABSENT required step — that absence is
// the real, blockable defect that makes the completion a kickback. failingStepFrom
// then keys the kickback on that lowest incomplete required step.
function execPlan(missingStep) {
  let out = '## Execution Plan\n\n';
  for (const [n, name] of STEPS) {
    if (n === missingStep) continue;
    out += `### Step ${n}: ${name}\n- [x] ${name.toLowerCase()} work performed\n\n`;
  }
  return out;
}

function makeProject(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(root, 'plans', 'in-progress'), { recursive: true });
  fs.mkdirSync(path.join(root, '.ctoc'), { recursive: true });
  return root;
}

/**
 * Write (or rewrite) the plan body so exactly `uncheckedStep` is incomplete,
 * PRESERVING any existing leading frontmatter (which holds the accumulating
 * kickback_counts written by the circuit breaker on prior calls).
 */
function setFailingStep(planPath, slug, uncheckedStep) {
  let frontmatter = '---\ntitle: "Fixture plan"\ntype: feature\n---\n';
  if (fs.existsSync(planPath)) {
    const raw = fs.readFileSync(planPath, 'utf8');
    const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    if (m) frontmatter = m[0];
  }
  const body = `# Fixture plan\n\nSome descriptive prose.\n\n${execPlan(uncheckedStep)}`;
  fs.writeFileSync(planPath, frontmatter + '\n' + body);
}

describe('Circuit-breaker wiring: completeExecution records kickbacks + escalates', () => {
  let root;

  before(() => { root = makeProject('ctoc-cb-wiring-'); });
  after(() => { try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ } });

  it('4th SAME-STEP kickback escalates through the live completeExecution path', () => {
    const slug = 'same-step-plan';
    const planPath = path.join(root, 'plans', 'in-progress', `${slug}.md`);
    // Step 10 is the lowest incomplete required step on every call → same key.
    setFailingStep(planPath, slug, 10);

    // Calls 1-3: blocked (a real kickback) but no escalation yet.
    for (let i = 1; i <= 3; i++) {
      const res = actions.completeExecution(planPath, root);
      assert.strictEqual(res.blocked, true, `call ${i} must be blocked (pre-review validation fails)`);
      assert.ok(res.kickback && res.kickback.recorded, `call ${i} must record a kickback`);
      assert.strictEqual(res.kickback.byStep, i, `call ${i}: byStep`);
      assert.strictEqual(res.kickback.escalation, null, `call ${i}: no escalation before the 4th`);
    }

    // 4th call: same-step escalation fires.
    const fourth = actions.completeExecution(planPath, root);
    assert.strictEqual(fourth.blocked, true);
    assert.ok(fourth.kickback.escalation, '4th same-step call must escalate');
    assert.strictEqual(fourth.kickback.escalation.type, 'same-step');
    assert.strictEqual(fourth.kickback.escalation.step, '10');
    assert.strictEqual(fourth.kickback.escalation.count, 4);

    // Reachable by the human: the durable escalation log surfaces it.
    const log = circuitBreaker.getEscalations(root);
    const sameStep = log.filter((e) => e.type === 'same-step' && e.plan === slug);
    assert.strictEqual(sameStep.length, 1, 'exactly one same-step escalation recorded + reachable');
    assert.strictEqual(sameStep[0].step, '10');
    assert.strictEqual(sameStep[0].count, 4);

    // The counter is physically persisted in `.ctoc/state/kickbacks/<slug>.json`
    // (it survives a process restart — the module holds no in-memory state).
    const counts = circuitBreaker.readKickbackCounts(planPath, root);
    assert.strictEqual(counts.by_step['10'], 4);
    assert.strictEqual(counts.total, 4);

    // End-to-end proof through the REAL completeExecution path: four live kickbacks
    // left no counter in the plan's frontmatter. The frontmatter is hashed by the
    // approval ledger, so a counter written here revoked the build's own permission.
    const rawPlan = fs.readFileSync(planPath, 'utf8');
    assert.ok(!rawPlan.includes('kickback_counts'),
      'no kickback counter is written into the plan after four live kickbacks');
  });

  it('6th TOTAL kickback escalates (per-plan) with no single step reaching 4', () => {
    const slug = 'per-plan';
    const planPath = path.join(root, 'plans', 'in-progress', `${slug}.md`);

    // Spread kickbacks across four required steps so none reaches 4, but the
    // total crosses 5 on the 6th call. Each entry is (failingStep, expectedTotal).
    const sequence = [
      [10, 1], [10, 2],   // step 10 → 2
      [11, 3], [11, 4],   // step 11 → 2  (total 4)
      [13, 5],            // step 13 → 1  (total 5)
      [14, 6]             // step 14 → 1  (total 6 → per-plan escalation)
    ];

    let last;
    for (let i = 0; i < sequence.length; i++) {
      const [failStep, expectedTotal] = sequence[i];
      setFailingStep(planPath, slug, failStep);
      const res = actions.completeExecution(planPath, root);
      assert.strictEqual(res.blocked, true, `call ${i + 1} blocked`);
      assert.strictEqual(res.kickback.total, expectedTotal, `call ${i + 1}: running total`);
      if (i < sequence.length - 1) {
        assert.strictEqual(res.kickback.escalation, null,
          `call ${i + 1} must not escalate (total ${expectedTotal}, no step at 4)`);
      }
      last = res;
    }

    // 6th total call escalates as per-plan (not same-step: no step hit 4).
    assert.ok(last.kickback.escalation, '6th total kickback must escalate');
    assert.strictEqual(last.kickback.escalation.type, 'per-plan');
    assert.strictEqual(last.kickback.escalation.total, 6);

    const log = circuitBreaker.getEscalations(root);
    const perPlan = log.filter((e) => e.type === 'per-plan' && e.plan === slug);
    assert.strictEqual(perPlan.length, 1, 'exactly one per-plan escalation recorded + reachable');
    assert.strictEqual(perPlan[0].total, 6);
    assert.strictEqual(log.filter((e) => e.type === 'same-step' && e.plan === slug).length, 0,
      'no same-step escalation: no single step reached 4');
  });
});

// ---------------------------------------------------------------------------
// A review, security or quality round's send-back (owner's answers of 2026-10-20).
// Zero doubles: the real menu router, the real task registry, the real circuit
// breaker and the real inbox screens, each case in its own temporary project.
// ---------------------------------------------------------------------------

const START_JS = path.join(__dirname, '..', 'src', 'commands', 'start.js');

describe("a round's send-back counts toward the same limits as a failed verify (owner's answers of 2026-10-20)", () => {
  const sandboxes = [];
  after(() => {
    for (const dir of sandboxes) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort temp cleanup */ }
    }
  });

  function makeSandbox() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-round-send-back-'));
    for (const stage of ['functional', 'implementation', 'todo', 'in-progress', 'review', 'done']) {
      fs.mkdirSync(path.join(root, 'plans', stage), { recursive: true });
    }
    fs.mkdirSync(path.join(root, '.ctoc'), { recursive: true });
    sandboxes.push(root);
    return root;
  }

  function writePlan(root, stage, slug) {
    const p = path.join(root, 'plans', stage, `${slug}.md`);
    fs.writeFileSync(p, '---\ntitle: "Fixture plan"\ntype: feature\n---\n\n# Fixture plan\n');
    return p;
  }

  // Add and start one round (a task of `kind` for `plan`); returns its id.
  function round(root, kind, plan) {
    const added = ms.route(['menu', 'task', 'add', kind, ...(plan ? [plan] : [])], root);
    assert.equal(added.ok, true, JSON.stringify(added));
    const started = ms.route(['menu', 'task', 'start', added.taskId], root);
    assert.equal(started.ok, true, JSON.stringify(started));
    return added.taskId;
  }

  const complete = (root, id, ...flags) => ms.route(['menu', 'task', 'complete', id, ...flags], root);
  const statusOf = (root, id) => taskRegistry.load(root).tasks.find((t) => t.id === id).status;
  const counts = (root, planPath) => circuitBreaker.readKickbackCounts(planPath, root);
  const escalationsText = (root) => ms.route(['inbox', 'escalations'], root).text;
  const kickbackDir = (root) => path.join(root, '.ctoc', 'state', 'kickbacks');

  // The breaker's own console lines would flood the test output.
  function quiet(fn) {
    const warn = console.warn;
    const error = console.error;
    console.warn = () => {};
    console.error = () => {};
    try { return fn(); } finally { console.warn = warn; console.error = error; }
  }

  // A round that sends its plan back to Step 10, completed as the session completes it.
  const sendBack = (root, kind, plan, step = '10') =>
    quiet(() => complete(root, round(root, kind, plan), '--continue', '--summary', `send back to Step ${step}: x`, '--send-back', step));

  // A built plan that finishes on its checks through the real route, as
  // tests/plans-keep-moving-without-the-human.test.js seeds one. Returns its path in done/.
  function finishedPlan(root, slug) {
    const steps = [[8, 'TEST'], [9, 'PREPARE'], [10, 'IMPLEMENT'], [11, 'REVIEW'], [12, 'OPTIMIZE'],
      [13, 'SECURE'], [14, 'VERIFY'], [15, 'DOCUMENT'], [16, 'FINAL-REVIEW']];
    let body = `---\ntitle: ${slug} built feature\n---\n\n# ${slug}\n\nSome descriptive prose.\n\n## Execution Plan\n\n`;
    for (const [n, name] of steps) body += `### Step ${n}: ${name}\n- [x] ${name.toLowerCase()} work performed\n\n`;
    const inReview = path.join(root, 'plans', 'review', `${slug}.md`);
    fs.writeFileSync(inReview, body);
    const minuteAgo = new Date(Date.now() - 60000);
    fs.utimesSync(inReview, minuteAgo, minuteAgo);
    const evidence = verifyEvidencePath(root, slug);
    fs.mkdirSync(path.dirname(evidence), { recursive: true });
    fs.writeFileSync(evidence, JSON.stringify({
      planSlug: slug,
      timestamp: new Date().toISOString(),
      passed: true,
      method: 'fallback-direct',
      checks: { tests: { ran: true, passed: true, coverage: 99.5, coverageFloor: 99, skipped: 0 } },
      errors: [],
      summary: 'all checks passed',
    }));
    ledger.writeEntry(slug, { content: body, stage_from: 'implementation', stage_to: 'todo' }, root);
    let buildId;
    taskRegistry.withRegistry(root, (reg) => {
      const t = taskRegistry.addTask(reg, { kind: 'implement', label: `build ${slug}`, plan: slug, touches: [`src/${slug}.js`] });
      taskRegistry.updateTask(reg, t.id, { status: 'running' });
      taskRegistry.updateTask(reg, t.id, { status: 'done', result: { ok: true, summary: 'built' } });
      buildId = t.id;
      return reg;
    });
    const res = ms.route(['menu', 'task', 'complete', buildId, '--continue'], root);
    assert.equal(res.ok, true, JSON.stringify(res));
    const done = path.join(root, 'plans', 'done', `${slug}.md`);
    assert.ok(fs.existsSync(done), 'precondition: the plan finished before any round runs');
    assert.ok(!fs.existsSync(inReview), 'precondition: the plan left review');
    return done;
  }

  it('case 1 - today: a send-back written only in a round\'s summary counts nothing', (t) => {
    const root = makeSandbox();
    const planPath = writePlan(root, 'in-progress', 'looping');
    const texts = [];
    for (const kind of ['review', 'review', 'security', 'security']) {
      const res = quiet(() => complete(root, round(root, kind, 'looping'), '--continue', '--summary', 'send back to Step 10: the reason'));
      assert.equal(res.ok, true, JSON.stringify(res));
      texts.push(res.text);
    }
    const screen = escalationsText(root);
    t.diagnostic(`completion texts: ${JSON.stringify(texts)}`);
    t.diagnostic(`inbox escalations: ${JSON.stringify(screen)}`);
    assert.match(screen, /No circuit-breaker escalations\./);
    assert.deepStrictEqual(counts(root, planPath), { by_step: {}, total: 0 });
  });

  const counted = (n, of = 3, plan = 5, step = 10) =>
    new RegExp(`send-back to Step ${step} was counted: ${n} of a limit of ${of} for Step ${step}, ${n} of a limit of ${plan} for the plan`);

  it('case 2 - three send-backs to Step 10 from a review, a security and a quality round are counted 1, 2 and 3 of 3, with no escalation', () => {
    const root = makeSandbox();
    const planPath = writePlan(root, 'in-progress', 'looping');
    ['review', 'security', 'quality'].forEach((kind, i) => {
      const n = i + 1;
      const res = sendBack(root, kind, 'looping');
      assert.equal(res.ok, true, JSON.stringify(res));
      assert.match(res.text, counted(n));
      assert.doesNotMatch(res.text, /needs you/);
      assert.equal(statusOf(root, res.taskId), 'done');
      assert.equal(counts(root, planPath).by_step['10'], n);
    });
    assert.doesNotMatch(escalationsText(root), /looping/);
  });

  it('case 3 - the fourth send-back to Step 10 escalates with the line a fourth failed verify gets, and the text says the plan needs the owner', () => {
    const root = makeSandbox();
    writePlan(root, 'in-progress', 'looping');
    const verifyPlan = writePlan(root, 'review', 'verified');
    for (let i = 0; i < 3; i++) sendBack(root, 'review', 'looping');
    const fourth = sendBack(root, 'review', 'looping');
    for (let i = 0; i < 4; i++) quiet(() => actions.recordStepKickback(verifyPlan, 14, root));
    assert.match(fourth.text, /4 of a limit of 3 for Step 10/);
    assert.match(fourth.text, /needs you · view: inbox escalations/);
    const screen = escalationsText(root);
    assert.match(screen, /• looping {2}Step 10 kicked back 4× \(max 3\)/);
    assert.match(screen, /• verified {2}Step 14 kicked back 4× \(max 3\)/);
  });

  it('case 4 - round send-backs and two failed verifies share the limit of five per plan', () => {
    const root = makeSandbox();
    const planPath = writePlan(root, 'review', 'mixed');
    quiet(() => actions.recordStepKickback(planPath, 14, root));
    quiet(() => actions.recordStepKickback(planPath, 14, root));
    const texts = ['8', '10', '12', '13'].map((step, i) => sendBack(root, ['review', 'security', 'quality', 'review'][i], 'mixed', step));
    texts.forEach((res) => assert.equal(res.ok, true, JSON.stringify(res)));
    assert.match(texts[2].text, /5 of a limit of 5 for the plan/);
    assert.doesNotMatch(texts[2].text, /needs you/);
    assert.match(texts[3].text, /6 of a limit of 5 for the plan/);
    assert.match(texts[3].text, /needs you/);
    const screen = escalationsText(root);
    assert.match(screen, /• mixed {2}6 kickbacks total \(max 5\)/);
    assert.doesNotMatch(screen, /mixed {2}Step \d+ kicked back/);
  });

  it('case 5 - a send-back with no step, or a step outside 1 to 16, is refused naming 1 to 16; the task stays running and the next valid send-back counts 1', () => {
    const root = makeSandbox();
    const planPath = writePlan(root, 'in-progress', 'looping');
    const id = round(root, 'review', 'looping');
    // A right-to-left override in front of the digits: the refusal never echoes it.
    const RLO = String.fromCodePoint(0x202E);
    for (const flags of [['--send-back'], ['--send-back', '17'], ['--send-back', '0'], ['--send-back', 'ten'], ['--send-back', `${RLO}01`]]) {
      const res = complete(root, id, '--continue', ...flags);
      assert.equal(res.ok, false, JSON.stringify(res));
      assert.match(res.text, /a whole number from 1 to 16/);
      assert.match(res.text, /Nothing was recorded/);
      assert.equal(res.text.includes(RLO), false, 'no U+202E in the refusal');
      if (flags[1] === `${RLO}01`) assert.match(res.text, /\(not shown\)/);
      assert.equal(statusOf(root, id), 'running');
      assert.equal(fs.existsSync(kickbackDir(root)), false, 'nothing was counted');
    }
    const ok = quiet(() => complete(root, id, '--continue', '--send-back', '10'));
    assert.match(ok.text, /1 of a limit of 3 for Step 10/);
    assert.equal(counts(root, planPath).total, 1);
  });

  it('case 6 - a send-back whose count cannot be saved is reported NOT counted, and the dashboard\'s escalation count rises by one', () => {
    const root = makeSandbox();
    const planPath = writePlan(root, 'in-progress', 'looping');
    fs.mkdirSync(path.join(root, '.ctoc', 'state'), { recursive: true });
    fs.writeFileSync(kickbackDir(root), 'a file where the folder should be');
    assert.doesNotMatch(ms.buildDashboardTable(root), /circuit-breaker escalation/);
    const id = round(root, 'review', 'looping');
    const res = quiet(() => complete(root, id, '--continue', '--send-back', '10'));
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(statusOf(root, id), 'done');
    assert.match(res.text, /send-back to Step 10 was NOT counted: .*could not persist the kickback counter/);
    require('../src/lib/cache').invalidate();
    assert.match(ms.buildDashboardTable(root), /⛔ 1 circuit-breaker escalation /);
    assert.deepStrictEqual(counts(root, planPath), { by_step: {}, total: 0 });
  });

  it('case 7 - a round that sends nothing back counts nothing and shows today\'s text', () => {
    const root = makeSandbox();
    const planPath = writePlan(root, 'in-progress', 'looping');
    sendBack(root, 'review', 'looping');
    const id = round(root, 'security', 'looping');
    const res = quiet(() => complete(root, id, '--continue', '--summary', 'nothing to send back'));
    assert.equal(res.text, `Task ${id} → done`);
    assert.doesNotMatch(res.text, /send-back/);
    assert.equal(counts(root, planPath).total, 1);
    assert.match(sendBack(root, 'review', 'looping').text, /2 of a limit of 3 for Step 10/);
  });

  it('case 8 - only the session\'s own completion records a send-back: without --continue it is refused and nothing is counted', () => {
    const root = makeSandbox();
    writePlan(root, 'in-progress', 'looping');
    const id = round(root, 'review', 'looping');
    const res = complete(root, id, '--send-back', '10', '--summary', 'x');
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.match(res.text, /only on the session's own completion/);
    assert.equal(statusOf(root, id), 'running');
    assert.equal(fs.existsSync(kickbackDir(root)), false);
  });

  it('case 9 - a send-back on a task that is not a review, security or quality round is refused', () => {
    const root = makeSandbox();
    writePlan(root, 'in-progress', 'looping');
    const id = round(root, 'plan', 'looping');
    const res = complete(root, id, '--continue', '--send-back', '10');
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.match(res.text, /only a review, security or quality round/);
    assert.equal(statusOf(root, id), 'running');
    assert.equal(fs.existsSync(kickbackDir(root)), false);
  });

  it('case 10 - a send-back for a round with no plan, an unsafe plan name, or a plan that is not being built, in review or done is refused, and the task stays running', () => {
    const root = makeSandbox();
    writePlan(root, 'todo', 'queued');
    // A plan name holding U+2028 cannot be added through the menu route; plant it through the registry.
    const LS = String.fromCodePoint(0x2028);
    let ctlId;
    taskRegistry.withRegistry(root, (reg) => {
      const t = taskRegistry.addTask(reg, { kind: 'review', label: 'review x y', plan: `x${LS}y`, touches: [] });
      taskRegistry.updateTask(reg, t.id, { status: 'running' });
      ctlId = t.id;
      return reg;
    });
    const ids = [null, 'in-progress/x.md', 'ghost', 'queued'].map((plan) => round(root, 'review', plan));
    ids.push(ctlId);
    for (const id of ids) {
      const res = complete(root, id, '--continue', '--send-back', '10');
      assert.equal(res.ok, false, JSON.stringify(res));
      assert.match(res.text, /names no plan that is being built/);
      assert.match(res.text, /complete this round without --send-back/);
      assert.equal(res.text.includes(LS), false, 'no U+2028 in the refusal');
      assert.equal(statusOf(root, id), 'running');
      assert.equal(fs.existsSync(kickbackDir(root)), false);
    }
  });

  it('case 11 - a round its own agent already completed is still counted on the session\'s --continue --send-back', () => {
    const root = makeSandbox();
    writePlan(root, 'in-progress', 'looping');
    const id = round(root, 'review', 'looping');
    assert.equal(complete(root, id, '--summary', 'reviewed').ok, true);
    const before = structuredClone(taskRegistry.load(root).tasks.find((t) => t.id === id).result);
    const res = quiet(() => complete(root, id, '--continue', '--send-back', '10'));
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(res.alreadyCompleted, true);
    assert.match(res.text, /was already completed by its agent/);
    assert.match(res.text, /1 of a limit of 3 for Step 10/);
    assert.deepStrictEqual(taskRegistry.load(root).tasks.find((t) => t.id === id).result, before);
  });

  it('case 12 - through the real menu command, four send-backs of a finished plan print their counts, the fourth warns and is listed on inbox escalations', () => {
    const root = makeSandbox();
    finishedPlan(root, 'shipped');
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    const runMenu = (...args) => spawnSync(process.execPath, [START_JS, ...args], { cwd: root, encoding: 'utf8', env });
    for (let n = 1; n <= 4; n++) {
      const id = round(root, 'review', 'shipped');
      const r = runMenu('menu', 'task', 'complete', id, '--continue', '--summary', 'send back to Step 10: x', '--send-back', '10');
      assert.equal(r.status, 0, r.stderr);
      assert.match(JSON.parse(r.stdout).text, new RegExp(`${n} of a limit of 3 for Step 10`));
      if (n === 4) assert.match(r.stderr, /CIRCUIT BREAKER ESCALATION/);
      else assert.doesNotMatch(r.stderr, /CIRCUIT BREAKER ESCALATION/);
    }
    const screen = runMenu('inbox', 'escalations');
    assert.equal(screen.status, 0, screen.stderr);
    assert.match(screen.stdout, /Step 10 kicked back 4× \(max 3\)/);
  });

  it('case 13 - a plan that finished on its checks before any round ran is counted, stays in done, and its fourth send-back to Step 10 escalates', () => {
    const root = makeSandbox();
    const done = finishedPlan(root, 'finished');
    const bytes = fs.readFileSync(done);
    const texts = ['review', 'security', 'quality', 'review'].map((kind) => sendBack(root, kind, 'finished'));
    texts.forEach((res, i) => {
      assert.equal(res.ok, true, JSON.stringify(res));
      assert.equal(statusOf(root, res.taskId), 'done');
      assert.match(res.text, new RegExp(`${i + 1} of a limit of 3 for Step 10`));
      if (i < 3) assert.doesNotMatch(res.text, /needs you/);
    });
    assert.match(texts[3].text, /needs you/);
    assert.equal(counts(root, done).by_step['10'], 4);
    assert.deepStrictEqual(fs.readFileSync(done), bytes);
    for (const stage of ['functional', 'implementation', 'todo', 'in-progress', 'review']) {
      assert.equal(fs.existsSync(path.join(root, 'plans', stage, 'finished.md')), false, `no copy in ${stage}`);
    }
    assert.match(escalationsText(root), /• finished {2}Step 10 kicked back 4× \(max 3\)/);
  });

  // Cases 14 to 16 - the owner chose to lock the count's write (answer relayed in the Execution
  // Record). Each plants what another call, or a call that died, leaves at the lock path.
  // Nothing races and nothing waits.

  const lockPathOf = (root, slug) => path.join(kickbackDir(root), `${slug}.lock`);
  const plantLockDir = (root) => fs.mkdirSync(kickbackDir(root), { recursive: true });

  it('case 14 - a send-back that meets a held lock is reported NOT counted, the count is unchanged, and the dashboard\'s escalation count rises by one; run again, it counts', () => {
    const root = makeSandbox();
    const planPath = writePlan(root, 'in-progress', 'locked');
    plantLockDir(root);
    const lock = lockPathOf(root, 'locked');
    fs.writeFileSync(lock, 'held by another call');
    assert.doesNotMatch(ms.buildDashboardTable(root), /circuit-breaker escalation/);
    const id = round(root, 'review', 'locked');
    const res = quiet(() => complete(root, id, '--continue', '--send-back', '10'));
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(statusOf(root, id), 'done');
    assert.match(res.text, /send-back to Step 10 was NOT counted: the kickback counter for locked is being written by another call/);
    assert.equal(fs.existsSync(path.join(kickbackDir(root), 'locked.json')), false);
    assert.equal(fs.readFileSync(lock, 'utf8'), 'held by another call');
    require('../src/lib/cache').invalidate();
    assert.match(ms.buildDashboardTable(root), /⛔ 1 circuit-breaker escalation /);

    const verify = quiet(() => actions.recordStepKickback(planPath, 14, root));
    assert.equal(verify.recorded, false);
    assert.match(verify.error, /being written by another call/);
    require('../src/lib/cache').invalidate();
    assert.match(ms.buildDashboardTable(root), /⛔ 2 circuit-breaker escalations/);

    fs.unlinkSync(lock);
    const again = quiet(() => complete(root, id, '--continue', '--send-back', '10'));
    assert.match(again.text, /1 of a limit of 3 for Step 10/);
    assert.equal(fs.existsSync(lock), false, 'the lock is released after the count');
  });

  it('case 15 - a lock left by a call that died is taken over', () => {
    const root = makeSandbox();
    writePlan(root, 'in-progress', 'locked');
    plantLockDir(root);
    const lock = lockPathOf(root, 'locked');
    fs.writeFileSync(lock, 'left by a call that died');
    const past = new Date(Date.now() - 120000);
    fs.utimesSync(lock, past, past);
    const res = sendBack(root, 'review', 'locked');
    assert.match(res.text, /1 of a limit of 3 for Step 10/);
    assert.equal(fs.existsSync(lock), false);
  });

  it('case 16 - a folder at the lock path is reported, never followed or deleted', () => {
    const root = makeSandbox();
    writePlan(root, 'in-progress', 'locked');
    plantLockDir(root);
    const lock = lockPathOf(root, 'locked');
    fs.mkdirSync(lock);
    const res = sendBack(root, 'review', 'locked');
    assert.match(res.text, /was NOT counted: the kickback counter's lock for locked is not a plain file/);
    assert.equal(fs.statSync(lock).isDirectory(), true);
    assert.equal(fs.existsSync(path.join(kickbackDir(root), 'locked.json')), false);
  });

  // Cases 17 to 22 - the fix round after review and security. Races and failed deletes are shown by
  // planting what they leave, or by wrapping one call in-process; nothing races and nothing waits.

  const safeFsModule = require('../src/lib/safe-fs');
  const fakeError = (code) => Object.assign(new Error(`${code}: forced by the test`), { code });

  // Wraps safe-fs.unlinkSync so the FIRST call on `lock` throws `code` (after really deleting when
  // `reallyDelete`); every other call goes through. Restores in finally.
  function withFailingLockDelete(lock, code, reallyDelete, fn) {
    const real = safeFsModule.unlinkSync;
    let hit = false;
    safeFsModule.unlinkSync = (p) => {
      if (!hit && p === lock) {
        hit = true;
        if (reallyDelete) real(p);
        throw fakeError(code);
      }
      return real(p);
    };
    try { return fn(); } finally { safeFsModule.unlinkSync = real; }
  }

  // Symbolic-link probe, fail-loudly (pattern of tests/the-owner-answers-an-inbox-question.test.js).
  let SYMLINK_ERR = null;
  before(() => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-send-back-link-probe-'));
    try {
      fs.symlinkSync('target', path.join(d, 'l'));
    } catch (e) {
      SYMLINK_ERR = e;
    } finally {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });
  function requireSymlinks() {
    if (SYMLINK_ERR) {
      assert.fail(
        `symbolic-link creation is unavailable on ${process.platform} ` +
        `(${SYMLINK_ERR.code}: ${SYMLINK_ERR.message}); the link case cannot run and FAILS rather than skips.`);
    }
  }

  it('case 17 - the escalations log is replaced through a temp file, so a link at its path is never written through', () => {
    requireSymlinks();
    const root = makeSandbox();
    writePlan(root, 'in-progress', 'locked');
    plantLockDir(root);
    fs.writeFileSync(lockPathOf(root, 'locked'), 'held by another call');
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-send-back-outside-'));
    sandboxes.push(outside);
    const outsideFile = path.join(outside, 'target.txt');
    fs.writeFileSync(outsideFile, 'untouched\n');
    const logPath = path.join(root, '.ctoc', 'logs', 'escalations.json');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.symlinkSync(outsideFile, logPath);
    const res = sendBack(root, 'review', 'locked');
    assert.match(res.text, /was NOT counted/);
    assert.equal(fs.readFileSync(outsideFile, 'utf8'), 'untouched\n', 'the file behind the link is unchanged');
    assert.equal(fs.lstatSync(logPath).isFile(), true, 'the log path is a plain file now');
    const entries = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    assert.ok(Array.isArray(entries));
    assert.ok(entries.some((e) => e.type === 'breaker-failure' && e.plan === 'locked'), JSON.stringify(entries));
  });

  it('case 18 - a folder at the escalations log path is reported NOT counted, leaves no temp file and stays a folder', () => {
    const root = makeSandbox();
    writePlan(root, 'in-progress', 'locked');
    plantLockDir(root);
    fs.writeFileSync(lockPathOf(root, 'locked'), 'held by another call');
    const logPath = path.join(root, '.ctoc', 'logs', 'escalations.json');
    fs.mkdirSync(logPath, { recursive: true });
    const res = sendBack(root, 'review', 'locked');
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.match(res.text, /was NOT counted/);
    assert.deepStrictEqual(fs.readdirSync(path.dirname(logPath)).filter((n) => n.startsWith('escalations.json.tmp-')), []);
    assert.equal(fs.statSync(logPath).isDirectory(), true);
  });

  it('case 19 - a plan name that is not a plain file name is refused, and nothing hostile is echoed', () => {
    const root = makeSandbox();
    const name = `bad${String.fromCodePoint(0x9b)}name`;
    fs.writeFileSync(path.join(root, 'plans', 'in-progress', `${name}.md`), '---\ntitle: "x"\n---\n');
    let id;
    taskRegistry.withRegistry(root, (reg) => {
      const t = taskRegistry.addTask(reg, { kind: 'review', label: 'review bad name', plan: name, touches: [] });
      taskRegistry.updateTask(reg, t.id, { status: 'running' });
      id = t.id;
      return reg;
    });
    const res = complete(root, id, '--continue', '--send-back', '10');
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.match(res.text, /names no plan that is being built/);
    assert.doesNotMatch(res.text, /[\u0080-\u009f]/);
    assert.match(res.text, /\(not shown\)/);
    assert.equal(statusOf(root, id), 'running');
    assert.equal(fs.existsSync(kickbackDir(root)), false);
  });

  it('case 20 - a stale lock that cannot be deleted says so, and is left as it is', () => {
    const root = makeSandbox();
    writePlan(root, 'in-progress', 'locked');
    plantLockDir(root);
    const lock = lockPathOf(root, 'locked');
    fs.writeFileSync(lock, 'left by a call that died');
    const past = new Date(Date.now() - 120000);
    fs.utimesSync(lock, past, past);
    const res = withFailingLockDelete(lock, 'EPERM', false, () => sendBack(root, 'review', 'locked'));
    assert.match(res.text, /was NOT counted: the kickback counter's lock for locked is older than 60 seconds and could not be removed/);
    assert.doesNotMatch(res.text, /being written by another call/);
    assert.equal(fs.readFileSync(lock, 'utf8'), 'left by a call that died');
    assert.equal(fs.existsSync(path.join(kickbackDir(root), 'locked.json')), false);
  });

  it('case 21 - a stale lock whose delete raced (gone already) is taken over', () => {
    const root = makeSandbox();
    writePlan(root, 'in-progress', 'locked');
    plantLockDir(root);
    const lock = lockPathOf(root, 'locked');
    fs.writeFileSync(lock, 'left by a call that died');
    const past = new Date(Date.now() - 120000);
    fs.utimesSync(lock, past, past);
    const res = withFailingLockDelete(lock, 'ENOENT', true, () => sendBack(root, 'review', 'locked'));
    assert.match(res.text, /1 of a limit of 3 for Step 10/);
    assert.equal(fs.existsSync(lock), false);
  });

  it('case 22 - a lock that cannot be removed after the count is reported, and the count stands', () => {
    const root = makeSandbox();
    const planPath = writePlan(root, 'in-progress', 'locked');
    const lock = lockPathOf(root, 'locked');
    const res = withFailingLockDelete(lock, 'EPERM', false, () => sendBack(root, 'review', 'locked'));
    assert.match(res.text, /1 of a limit of 3 for Step 10/);
    assert.equal(counts(root, planPath).by_step['10'], 1);
    const failure = circuitBreaker.getEscalations(root).find((e) => e.type === 'breaker-failure' && e.plan === 'locked');
    assert.ok(failure, 'a breaker-failure entry for the plan');
    assert.equal(failure.error, "the kickback counter's lock could not be removed; send-backs of this plan are reported as not counted until a call finds it older than 60 seconds and can remove it");
  });

  it('case 23 - the release leaves alone a lock whose mark is no longer ours', () => {
    const root = makeSandbox();
    const planPath = writePlan(root, 'in-progress', 'locked');
    const lock = lockPathOf(root, 'locked');
    // While the count is written (the counter's rename), another call takes the lock over.
    const real = safeFsModule.renameSync;
    let taken = false;
    safeFsModule.renameSync = (from, to) => {
      if (!taken && to === path.join(kickbackDir(root), 'locked.json')) {
        taken = true;
        fs.writeFileSync(lock, 'taken over by another call');
      }
      return real(from, to);
    };
    let res;
    try { res = sendBack(root, 'review', 'locked'); } finally { safeFsModule.renameSync = real; }
    assert.equal(taken, true, 'the count went through the wrapped rename');
    assert.match(res.text, /1 of a limit of 3 for Step 10/);
    assert.equal(counts(root, planPath).by_step['10'], 1);
    assert.equal(fs.readFileSync(lock, 'utf8'), 'taken over by another call', 'the other call\'s lock is not deleted');
  });

  it('case 24 - the lock is released when the work under it throws', () => {
    const root = makeSandbox();
    const missing = path.join(root, 'plans', 'in-progress', 'ghost.md');
    assert.throws(() => circuitBreaker.recordKickback(missing, 10, root), /ENOENT/);
    const left = fs.readdirSync(kickbackDir(root)).filter((n) => n.endsWith('.lock'));
    assert.deepStrictEqual(left, [], 'no lock remains after the throw');
    assert.equal(fs.existsSync(path.join(kickbackDir(root), 'ghost.json')), false);
  });
});
