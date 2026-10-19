'use strict';

/**
 * An answer, an approval or a completion claims no build (slice 3 of
 * `four-defects-in-the-menu-and-the-release-found-on-2026-10-11`).
 *
 * The continuation (`menu-screens.continueAfterCrossing`) used to call `startAgent` up to
 * five times: each call set a build task running with no agent and moved its plan into
 * `in-progress/` before any agent existed. It now queues at most one build task, for the
 * first approved plan in `todo/` that has no live build task, and offers it in `promote`;
 * the session claims it with the menu's task start.
 *
 * Every case drives the real functions and the real menu command in a temporary project:
 * real plan files, real approval ledger, real task registry. Nothing is mocked.
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
const ledger = require('../src/lib/approval-ledger.js');

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
  const dir = path.join(os.tmpdir(), `ctoc-no-build-${process.pid}-${Date.now()}-${counter++}`);
  for (const stage of STAGES) fs.mkdirSync(path.join(dir, 'plans', stage), { recursive: true });
  fs.mkdirSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
  sandboxes.push(dir);
  return fs.realpathSync(dir);
}

const planFile = (root, ref) => path.join(root, 'plans', ...ref.split('/'));
const exists = (root, ref) => fs.existsSync(planFile(root, ref));
const tasks = (root) => taskRegistry.load(root).tasks;
const running = (root) => tasks(root).filter((t) => t.status === 'running');
const implTasks = (root) => tasks(root).filter((t) => t.kind === 'implement');
const inBuild = (root) => fs.readdirSync(path.join(root, 'plans', 'in-progress'));

function implBody(title, files) {
  return `---\niron_loop: true\ntitle: ${title}\nfiles:\n${files.map((f) => `  - ${f}`).join('\n')}\n---\n\n# ${title}\n\n## Implementation\nBody.\n`;
}

function functionalBody(title) {
  return `---\ntitle: ${title}\n---\n\n# ${title}\n\n## Problem Statement\nThe thing is broken.\n\n`
    + '## Acceptance Criteria\n- [ ] the thing works\n\n## Scope\nThe module.\n';
}

/** Approved, buildable plans in `todo/` in a fixed order: the ledger vouches for each. */
function approvedTodo(root, slugs) {
  for (const slug of slugs) {
    const content = implBody(`Plan ${slug}`, [`src/${slug}.js`]);
    fs.writeFileSync(planFile(root, `todo/${slug}.md`), content);
    ledger.writeEntry(slug, { content, stage_from: 'implementation', stage_to: 'todo' }, root);
  }
  fs.writeFileSync(path.join(root, '.ctoc', 'state', 'todo-order.json'), JSON.stringify(slugs.map((s) => `${s}.md`)));
}

/** A functional plan with ONE classified fork question; returns what `stream answer` takes. */
function oneFork(root, slug) {
  const ref = `functional/${slug}.md`;
  fs.writeFileSync(planFile(root, ref), functionalBody(`Plan ${slug}`));
  const q = {
    id: 'q10-db', prompt: 'Which database engine?', critical: false, important: false, topic: 'technology-stack',
    options: [{ key: '1', label: 'Postgres', recommended: true }, { key: '2', label: 'SQLite' }],
  };
  const at = fs.statSync(planFile(root, ref)).mtimeMs;
  const res = precompute.writePlanQuestions(root, ref, [q], at, undefined, CLASSIFIED);
  assert.equal(res.ok, true, `fixture: the question was written (${(res.errors || []).join('; ')})`);
  return { ref, qid: q.id, key: '1', digest: precompute.questionDigest(q) };
}

/** A running `review` task, as the session holds while a reviewer works. */
function runningReviewTask(root) {
  const add = route(['menu', 'task', 'add', 'review', 'some-reviewed-plan'], root);
  assert.equal(add.ok, true, JSON.stringify(add));
  assert.equal(route(['menu', 'task', 'start', add.taskId], root).ok, true);
  return add.taskId;
}

/** What none of the three paths may do, and the one thing each must: queue alpha's build. */
function assertQueuedAlphaOnly(root, res) {
  assert.deepEqual(inBuild(root), [], 'no plan moved into the build');
  assert.deepEqual(running(root).map((t) => t.id), [], 'no task is running');
  const impl = implTasks(root);
  assert.equal(impl.length, 1, `exactly one implement task: ${JSON.stringify(impl)}`);
  assert.equal(impl[0].plan, 'alpha');
  assert.equal(impl[0].status, 'queued');
  assert.equal(impl.some((t) => t.plan === 'bravo'), false);
  assert.ok(res.promote.some((t) => t.id === impl[0].id && t.kind === 'implement'), 'and it is offered in promote');
  return impl[0];
}

describe('an answer, an approval or a completion claims nothing', () => {
  it('case 1a — an answer queues alpha\'s build and claims none', () => {
    const root = makeSandbox();
    approvedTodo(root, ['alpha', 'bravo']);
    const f = oneFork(root, 'asked');

    const res = route(['stream', 'answer', f.ref, f.qid, f.key, f.digest], root);

    assertQueuedAlphaOnly(root, res);
  });

  it('case 1b — an approval queues alpha\'s build and claims none', () => {
    const root = makeSandbox();
    approvedTodo(root, ['alpha', 'bravo']);
    fs.writeFileSync(planFile(root, 'functional/approved.md'), functionalBody('Approved'));

    const res = route(['stream', 'approve', 'functional/approved.md'], root);

    assert.equal(exists(root, 'implementation/approved.md'), true, 'the approval crossed');
    assertQueuedAlphaOnly(root, res);
  });

  it('case 1c — a completion with --continue queues alpha\'s build and claims none', () => {
    const root = makeSandbox();
    approvedTodo(root, ['alpha', 'bravo']);
    const id = runningReviewTask(root);

    const res = route(['menu', 'task', 'complete', id, '--continue'], root);

    assert.equal(res.ok, true, JSON.stringify(res));
    assertQueuedAlphaOnly(root, res);
    assert.doesNotMatch(res.text, /started building/);
  });

  it('case 2 — the queued build is claimed only by the session\'s task start', () => {
    const root = makeSandbox();
    approvedTodo(root, ['alpha', 'bravo']);
    const f = oneFork(root, 'asked');
    const res = route(['stream', 'answer', f.ref, f.qid, f.key, f.digest], root);
    const alpha = assertQueuedAlphaOnly(root, res);

    const claim = route(['menu', 'task', 'start', alpha.id], root);

    assert.equal(claim.ok, true, JSON.stringify(claim));
    assert.deepEqual(inBuild(root), ['alpha.md']);
    assert.equal(exists(root, 'todo/alpha.md'), false);
    assert.equal(tasks(root).find((t) => t.id === alpha.id).status, 'running');
  });

  it('case 3 — the next pass queues the next plan and still claims nothing', () => {
    const root = makeSandbox();
    approvedTodo(root, ['alpha', 'bravo', 'charlie']);
    const f = oneFork(root, 'asked');
    route(['stream', 'answer', f.ref, f.qid, f.key, f.digest], root);

    const second = menuScreens.continueAfterCrossing(root);

    assert.deepEqual(implTasks(root).map((t) => [t.plan, t.status]), [['alpha', 'queued'], ['bravo', 'queued']],
      'alpha has a live build task, so the first plan without one is bravo');
    assert.deepEqual(running(root), []);
    assert.deepEqual(inBuild(root), []);
    assert.ok(Array.isArray(second.promote));
    assert.equal(Object.prototype.hasOwnProperty.call(second, 'building'), false, 'no build was started to name');
    menuScreens.continueAfterCrossing(root);
    assert.deepEqual(implTasks(root).map((t) => t.plan), ['alpha', 'bravo', 'charlie']);
    menuScreens.continueAfterCrossing(root);
    assert.equal(implTasks(root).length, 3, 'every approved plan has one task; a further pass adds none');
    assert.deepEqual(running(root), []);
  });

  it('case 4 — a requested stop queues no build', () => {
    const root = makeSandbox();
    approvedTodo(root, ['alpha', 'bravo']);
    const id = runningReviewTask(root);
    taskRegistry.requestDrainStop(root);

    const res = route(['menu', 'task', 'complete', id, '--continue'], root);

    assert.equal(res.ok, true, JSON.stringify(res));
    assert.deepEqual(implTasks(root), []);
    assert.deepEqual(inBuild(root), []);
    assert.deepEqual(running(root), []);
  });

  it('case 6 — a plan whose task the registry refuses is skipped; the next plan is queued', () => {
    const root = makeSandbox();
    const long = `src/${'x'.repeat(520)}.js`;
    const bad = implBody('Plan bad', [long]);
    fs.writeFileSync(planFile(root, 'todo/bad.md'), bad);
    ledger.writeEntry('bad', { content: bad, stage_from: 'implementation', stage_to: 'todo' }, root);
    approvedTodo(root, ['alpha']);
    fs.writeFileSync(path.join(root, '.ctoc', 'state', 'todo-order.json'), JSON.stringify(['bad.md', 'alpha.md']));

    const res = menuScreens.continueAfterCrossing(root);

    assert.deepEqual(implTasks(root).map((t) => t.plan), ['alpha'], 'the walk went on past the refused plan');
    assert.equal(res.reasons.includes('build-not-queued'), false, 'a build was queued, so nothing went unqueued');
  });

  it('case 6b — when no build can be queued at all, the reason build-not-queued is recorded', () => {
    const root = makeSandbox();
    const bad = implBody('Plan bad', [`src/${'x'.repeat(520)}.js`]);
    fs.writeFileSync(planFile(root, 'todo/bad.md'), bad);
    ledger.writeEntry('bad', { content: bad, stage_from: 'implementation', stage_to: 'todo' }, root);

    const res = menuScreens.continueAfterCrossing(root);

    assert.deepEqual(implTasks(root), []);
    assert.ok(res.reasons.includes('build-not-queued'), JSON.stringify(res.reasons));
  });

  it('case 7 — plans that are unvouched or declare no files are passed over; the next vouched plan is queued', () => {
    const root = makeSandbox();
    fs.writeFileSync(planFile(root, 'todo/unvouched.md'), implBody('Plan unvouched', ['src/unvouched.js']));
    const nofiles = '---\niron_loop: true\ntitle: Plan nofiles\n---\n\n# Plan nofiles\n\n## Implementation\nBody.\n';
    fs.writeFileSync(planFile(root, 'todo/nofiles.md'), nofiles);
    ledger.writeEntry('nofiles', { content: nofiles, stage_from: 'implementation', stage_to: 'todo' }, root);
    approvedTodo(root, ['alpha']);
    fs.writeFileSync(path.join(root, '.ctoc', 'state', 'todo-order.json'), JSON.stringify(['unvouched.md', 'nofiles.md', 'alpha.md']));

    menuScreens.continueAfterCrossing(root);

    const impl = implTasks(root);
    assert.deepEqual(impl.map((t) => [t.plan, t.status]), [['alpha', 'queued']]);
    assert.deepEqual(running(root), []);
    assert.deepEqual(inBuild(root), []);
  });

  it('case 8 — a buildable plan whose build task cannot be made is skipped with the reason build-spec-refused', () => {
    const root = makeSandbox();
    // continuation-queue strips ".md" from a dependency token, the build task's own translation does not.
    const content = '---\niron_loop: true\ntitle: Plan bar\ndepends_on: foo.md\nfiles:\n  - src/bar.js\n---\n\n# Plan bar\n\n## Implementation\nBody.\n';
    fs.writeFileSync(planFile(root, 'todo/bar.md'), content);
    ledger.writeEntry('bar', { content, stage_from: 'implementation', stage_to: 'todo' }, root);
    fs.writeFileSync(planFile(root, 'done/foo.md'), implBody('Plan foo', ['src/foo.js']));

    const res = menuScreens.continueAfterCrossing(root);

    assert.deepEqual(implTasks(root), []);
    assert.ok(res.reasons.includes('build-spec-refused'), JSON.stringify(res.reasons));
    assert.equal(JSON.stringify(res.reasons).includes('foo'), false, 'the reason names no plan and carries no raw message');
  });

  it('case 9 — approval and spec come from one read: a plan changed after its ledger entry is not queued', (t) => {
    const root = makeSandbox();
    approvedTodo(root, ['alpha']);
    fs.writeFileSync(planFile(root, 'todo/alpha.md'), implBody('Plan alpha', ['src/alpha.js']).replace('Body.', 'Changed after the approval.'));
    // Model the race: the selector read the plan while it was still as approved.
    t.mock.method(require('../src/lib/continuation-queue.js'), 'nextBuildable', () => ({ buildable: ['todo/alpha.md'] }));

    menuScreens.continueAfterCrossing(root);

    assert.deepEqual(implTasks(root), [], 'the plan as read no longer matches its ledger entry');
  });

  it('case 5 — the reproduction runs through the real menu command', () => {
    const root = makeSandbox();
    approvedTodo(root, ['alpha', 'bravo', 'charlie']);
    const f = oneFork(root, 'asked');
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    const menu = (...args) => {
      const out = execFileSync(process.execPath, [MENU_ENTRY, ...args], { cwd: root, encoding: 'utf8', env });
      return JSON.parse(out.slice(out.indexOf('{')));
    };

    const screen = menu('stream', 'answer', f.ref, f.qid, f.key, f.digest);

    assert.deepEqual(fs.readdirSync(path.join(root, 'plans', 'todo')).sort(), ['alpha.md', 'bravo.md', 'charlie.md']);
    assert.deepEqual(inBuild(root), [], 'in-progress/ is empty');
    assert.deepEqual(running(root), [], 'no task is running');
    const offered = (screen.promote || []).filter((t) => t.kind === 'implement');
    assert.equal(offered.length, 1, JSON.stringify(screen.promote));
    assert.equal(offered[0].plan, 'alpha');

    const claim = menu('menu', 'task', 'start', offered[0].id);
    assert.equal(claim.ok, true, JSON.stringify(claim));
    assert.deepEqual(inBuild(root), ['alpha.md']);
    assert.equal(tasks(root).find((t) => t.id === offered[0].id).status, 'running');

    const stamped = menu('menu', 'task', 'start', offered[0].id, '--agent-id', 'agent-xyz');
    assert.equal(stamped.ok, true, JSON.stringify(stamped));
    assert.equal(tasks(root).find((t) => t.id === offered[0].id).agentTaskId, 'agent-xyz');
  });
});
