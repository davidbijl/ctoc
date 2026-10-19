'use strict';

/**
 * While a stop is requested, no promote list offers a build (slice 4 of
 * `four-defects-in-the-menu-and-the-release-found-on-2026-10-11`).
 *
 * `menu-screens.computePromote` builds every `promote[]` list. With the drain stop requested it
 * holds every `implement` entry back and reports it in `quarantined` with reason
 * `stop-requested`; planners, classifications and question precomputes stay on offer.
 * `actions.stopAgent` says "no new build will be offered": the stop is checked when a promote list is
 * built, not when a build starts, so an explicit start is still possible.
 *
 * Every case drives the real functions and the real menu command in a temporary project:
 * real plan files, real task registry. Nothing is mocked.
 */

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const menuScreens = require('../src/lib/menu-screens.js');
const precompute = require('../src/lib/streaming-precompute.js');
const taskRegistry = require('../src/lib/task-registry.js');
const actions = require('../src/lib/actions.js');

const { route } = menuScreens;
const MENU_ENTRY = path.join(__dirname, '..', 'src', 'commands', 'start.js');
const STAGES = ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done'];
const CLASSIFIED = Object.freeze({ by: 'gate-critic', at: 1786000000000 });
const sandboxes = [];
let counter = 0;

afterEach(() => {
  while (sandboxes.length) fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
});

function makeSandbox() {
  const dir = path.join(os.tmpdir(), `ctoc-stop-offers-${process.pid}-${Date.now()}-${counter++}`);
  for (const stage of STAGES) fs.mkdirSync(path.join(dir, 'plans', stage), { recursive: true });
  fs.mkdirSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
  sandboxes.push(dir);
  return fs.realpathSync(dir);
}

const planFile = (root, ref) => path.join(root, 'plans', ...ref.split('/'));
const tasks = (root) => taskRegistry.load(root).tasks;

function functionalBody(title) {
  return `---\ntitle: ${title}\n---\n\n# ${title}\n\n## Problem Statement\nThe thing is broken.\n\n`
    + '## Acceptance Criteria\n- [ ] the thing works\n\n## Scope\nThe module.\n';
}

const QUESTION = {
  id: 'q10-db', prompt: 'Which database engine?', critical: false, important: false, topic: 'technology-stack',
  options: [{ key: '1', label: 'Postgres', recommended: true }, { key: '2', label: 'SQLite' }],
};

/** Queue the four tasks the scheduler would allow at once; returns their ids by role. */
function queueFour(root) {
  fs.writeFileSync(planFile(root, 'todo/stopped-build.md'), functionalBody('Stopped build'));
  const add = (...args) => {
    const res = route(['menu', 'task', 'add', ...args], root);
    assert.equal(res.ok, true, JSON.stringify(res));
    return res.taskId;
  };
  return {
    build: add('implement', 'stopped-build', '--touches', 'src/s.js'),
    planner: add('plan', 'p'),
    classify: add('classify', 'functional/c.md', '--touches', '.ctoc/streaming/questions/functional/c.md'),
    precompute: add('precompute', 'functional/d.md', '--touches', '.ctoc/streaming/questions/functional/d.md'),
  };
}

/** A project with the stop requested and the four tasks queued. */
function stopped() {
  const root = makeSandbox();
  const ids = queueFour(root);
  taskRegistry.requestDrainStop(root);
  return { root, ids };
}

/** A running `review` task, as the session holds while a reviewer works. */
function runningReviewTask(root) {
  const id = route(['menu', 'task', 'add', 'review', 'some-reviewed-plan'], root).taskId;
  assert.equal(route(['menu', 'task', 'start', id], root).ok, true);
  return id;
}

/** A functional plan with ONE gate-checked fork question; returns what `stream answer` takes. */
function oneFork(root, slug) {
  const ref = `functional/${slug}.md`;
  fs.writeFileSync(planFile(root, ref), functionalBody(`Plan ${slug}`));
  const at = fs.statSync(planFile(root, ref)).mtimeMs;
  const res = precompute.writePlanQuestions(root, ref, [QUESTION], at, undefined, CLASSIFIED);
  assert.equal(res.ok, true, `fixture: the question was written (${(res.errors || []).join('; ')})`);
  return { ref, qid: QUESTION.id, key: '1', digest: precompute.questionDigest(QUESTION) };
}

/** The build is held back; the planner, the classification and the precompute stay on offer. */
function assertNoBuildOffered(root, ids, res, { quarantine }) {
  const promote = res.promote || [];
  assert.deepEqual(promote.filter((t) => t.kind === 'implement'), [], `no build is offered: ${JSON.stringify(promote)}`);
  for (const role of ['planner', 'classify', 'precompute']) {
    assert.ok(promote.some((t) => t.id === ids[role]), `the ${role} stays on offer: ${JSON.stringify(promote)}`);
  }
  if (quarantine) {
    assert.ok((res.quarantined || []).some((q) => q.id === ids.build && q.reason === 'stop-requested'),
      `the build is reported as held: ${JSON.stringify(res.quarantined)}`);
  }
  const build = tasks(root).find((t) => t.id === ids.build);
  assert.equal(build.status, 'queued', 'the build is still queued');
  assert.equal(fs.existsSync(planFile(root, 'todo/stopped-build.md')), true, 'and its plan is still in todo/');
}

describe('while a stop is requested, no list offers a build', () => {
  it('case 1a — a completion with --continue', () => {
    const { root, ids } = stopped();
    const id = runningReviewTask(root);
    const res = route(['menu', 'task', 'complete', id, '--continue'], root);
    assert.equal(res.ok, true, JSON.stringify(res));
    assertNoBuildOffered(root, ids, res, { quarantine: true });
  });

  it('case 1b — a plain completion without --continue', () => {
    const { root, ids } = stopped();
    const id = runningReviewTask(root);
    const res = route(['menu', 'task', 'complete', id], root);
    assert.equal(res.ok, true, JSON.stringify(res));
    assertNoBuildOffered(root, ids, res, { quarantine: true });
  });

  it('case 1c — a failed task', () => {
    const { root, ids } = stopped();
    const id = runningReviewTask(root);
    const res = route(['menu', 'task', 'fail', id], root);
    assert.equal(res.ok, true, JSON.stringify(res));
    assertNoBuildOffered(root, ids, res, { quarantine: true });
  });

  it('case 1d — a cancelled queued task (it frees nothing, and still returns a list)', () => {
    const { root, ids } = stopped();
    const queuedReview = route(['menu', 'task', 'add', 'review', 'some-reviewed-plan'], root).taskId;
    const res = route(['menu', 'task', 'cancel', queuedReview], root);
    assert.equal(res.ok, true, JSON.stringify(res));
    assertNoBuildOffered(root, ids, res, { quarantine: true });
  });

  it('case 1e — a cancelled running task', () => {
    const { root, ids } = stopped();
    const id = runningReviewTask(root);
    const res = route(['menu', 'task', 'cancel', id], root);
    assert.equal(res.ok, true, JSON.stringify(res));
    assertNoBuildOffered(root, ids, res, { quarantine: true });
  });

  it('case 1f — an answer to a gate-checked fork question', () => {
    const { root, ids } = stopped();
    const f = oneFork(root, 'asked');
    const res = route(['stream', 'answer', f.ref, f.qid, f.key, f.digest], root);
    assertNoBuildOffered(root, ids, res, { quarantine: false });
  });

  it('case 1g — an approval of a functional plan', () => {
    const { root, ids } = stopped();
    fs.writeFileSync(planFile(root, 'functional/approved.md'), functionalBody('Approved'));
    const res = route(['stream', 'approve', 'functional/approved.md'], root);
    assert.equal(fs.existsSync(planFile(root, 'implementation/approved.md')), true, 'the approval crossed');
    assertNoBuildOffered(root, ids, res, { quarantine: false });
  });

  it('case 1h — a check of a plan whose author wrote unchecked questions', () => {
    const { root, ids } = stopped();
    const ref = 'functional/unchecked.md';
    fs.writeFileSync(planFile(root, ref), functionalBody('Unchecked idea'));
    const at = fs.statSync(planFile(root, ref)).mtimeMs;
    assert.equal(precompute.writePlanQuestions(root, ref, [QUESTION], at).ok, true, 'fixture: the author wrote the questions');
    const res = route(['stream', 'check', ref], root);
    assert.ok(tasks(root).some((t) => t.kind === 'classify' && t.plan === ref && t.status === 'queued'), 'fixture: the check is queued');
    assertNoBuildOffered(root, ids, res, { quarantine: false });
  });

  it('case 2 — once the stop is cleared, the build is offered again', () => {
    const { root, ids } = stopped();
    taskRegistry.clearDrainStop(root);
    const id = runningReviewTask(root);
    const res = route(['menu', 'task', 'complete', id, '--continue'], root);
    assert.ok(res.promote.some((t) => t.id === ids.build && t.kind === 'implement'), JSON.stringify(res.promote));
    assert.equal((res.quarantined || []).some((q) => q.reason === 'stop-requested'), false);
  });

  it('case 3 — without a stop nothing changes: the build is offered and nothing is held for a stop', () => {
    const root = makeSandbox();
    const ids = queueFour(root);
    const id = runningReviewTask(root);
    const res = route(['menu', 'task', 'complete', id], root);
    assert.ok(res.promote.some((t) => t.id === ids.build && t.kind === 'implement'), JSON.stringify(res.promote));
    assert.equal((res.quarantined || []).some((q) => q.reason === 'stop-requested'), false);
  });

  it('case 3b — a requested stop and a file collision both hold the build: it is reported once, with the collision reason', () => {
    const root = makeSandbox();
    const at = (min) => new Date(Date.now() - min * 60_000).toISOString();
    const base = { label: '', agentTaskId: null, blockedBy: [], result: null };
    const seeded = [
      // A non-build orphan: an orphaned build would hold the build slot itself (the one-build rule), so t2 would
      // not be offered at all and the case would stop proving the stop and the file collision hold it together.
      { ...base, id: 't1', kind: 'quality', plan: 'plans/todo/held.md', status: 'orphaned', touches: ['src/s.js'],
        result: { ok: false, orphanReason: 'staleness', summary: 'orphaned on staleness alone' },
        gitOp: false, ts: { created: at(30), started: at(10), done: at(1) } },
      { ...base, id: 't2', kind: 'implement', plan: 'stopped-build', status: 'queued', touches: ['src/s.js'],
        gitOp: false, ts: { created: at(20), started: null, done: null } },
      { ...base, id: 't3', kind: 'review', plan: null, status: 'running', agentTaskId: 't3', touches: [],
        gitOp: false, ts: { created: at(15), started: at(5), done: null } },
    ];
    taskRegistry.save(root, { version: taskRegistry.REGISTRY_VERSION, seq: 3, tasks: seeded });
    taskRegistry.requestDrainStop(root);
    const res = route(['menu', 'task', 'complete', 't3'], root);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.deepEqual((res.promote || []).filter((t) => t.id === 't2'), [], 'the build is not offered');
    const entries = (res.quarantined || []).filter((q) => q.id === 't2');
    assert.equal(entries.length, 1, `reported exactly once: ${JSON.stringify(res.quarantined)}`);
    assert.equal(entries[0].reason, 'staleness-orphan-quarantine');
    assert.equal((res.quarantined || []).some((q) => q.id === 't2' && q.reason === 'stop-requested'), false);
  });

  it('case 4 — the reproduction runs through the real menu command', () => {
    const { root, ids } = stopped();
    const id = runningReviewTask(root);
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    const out = execFileSync(process.execPath, [MENU_ENTRY, 'menu', 'task', 'complete', id, '--continue'],
      { cwd: root, encoding: 'utf8', env });
    const res = JSON.parse(out.slice(out.indexOf('{')));
    assert.equal(res.ok, true, out);
    assertNoBuildOffered(root, ids, res, { quarantine: true });
  });

  it('case 5 — Stop agent says no new build will be offered (an explicit start is still possible)', () => {
    const root = makeSandbox();
    const idle = actions.stopAgent(root);
    assert.equal(idle.message,
      'Stop requested. No plan is currently running; no new build will be offered until the stop is cleared.');
    assert.doesNotMatch(idle.message, /nothing new will start/);
    taskRegistry.clearDrainStop(root);

    taskRegistry.withRegistry(root, (reg) => {
      const t = taskRegistry.addTask(reg, { kind: 'implement', plan: 'run-a', touches: ['src/a.js'] });
      taskRegistry.updateTask(reg, t.id, { status: 'running' });
    });
    const busy = actions.stopAgent(root);
    assert.equal(busy.message, 'Stop requested. Will finish current plan(s): run-a, then stop.');
  });
});
