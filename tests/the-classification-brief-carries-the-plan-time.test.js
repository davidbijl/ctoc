'use strict';

/**
 * The classification brief for the gate critic carries the plan file modification time
 * (plan `ctoc-is-built-with-ctoc-the-classification-brief-for-the-gate-critic-carries-the-pla`).
 *
 * `menu-screens.computePromote` builds every `promote[]` list. A `classify` entry carries
 * `planMtimeMs`, the plan file's modification time read when the list is built, at full
 * precision (or null when the plan file cannot be read), and `src/commands/start.md` has the
 * session copy it into the gate critic's brief. The sweep refuses a classification stamped
 * older than the plan's current time, at full precision.
 *
 * Every case drives the real functions and the real menu command in a temporary project: real
 * plan files, real task registry, real question store, real waiting folder, real sweeper log.
 * Nothing is mocked and no case waits: every plan time is set with `fs.utimesSync` to a fixed
 * value in the past.
 */

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const menuScreens = require('../src/lib/menu-screens.js');
const precompute = require('../src/lib/streaming-precompute.js');
const streamingGate = require('../src/lib/streaming-gate.js');
const taskRegistry = require('../src/lib/task-registry.js');

const { route } = menuScreens;
const MENU_ENTRY = path.join(__dirname, '..', 'src', 'commands', 'start.js');
const START_MD = path.join(__dirname, '..', 'src', 'commands', 'start.md');
const STAGES = ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done'];
const CLASSIFIED = Object.freeze({ by: 'gate-critic', at: 1786000000000 });
const NON_CLASSIFY_KEYS = ['id', 'kind', 'plan', 'touches', 'gitOp'];
// Seconds, in the past (a future stamp is refused by writePlanQuestions as `future-stamp`).
const T_A = 1784271999.19627;
const T_B = 1784272099.31416;
const T_C = 1784272199.71828;

const sandboxes = [];
let counter = 0;

afterEach(() => {
  while (sandboxes.length) fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
});

function makeSandbox() {
  const dir = path.join(os.tmpdir(), `ctoc-brief-time-${process.pid}-${Date.now()}-${counter++}`);
  for (const stage of STAGES) fs.mkdirSync(path.join(dir, 'plans', stage), { recursive: true });
  fs.mkdirSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
  sandboxes.push(dir);
  return fs.realpathSync(dir);
}

const planFile = (root, ref) => path.join(root, 'plans', ...ref.split('/'));

function functionalBody(title, edit = '') {
  return `---\ntitle: ${title}\n---\n\n# ${title}\n\n## Problem Statement\nThe thing is broken.${edit}\n\n`
    + '## Acceptance Criteria\n- [ ] the thing works\n\n## Scope\nThe module.\n';
}

const QUESTION = {
  id: 'q10-db', prompt: 'Which database engine?', critical: false, important: false, topic: 'technology-stack',
  options: [{ key: '1', label: 'Postgres', recommended: true }, { key: '2', label: 'SQLite' }],
};

/** Set a plan's time (seconds) and return what the file system kept, asserting the fraction survived. */
function setPlanTime(root, ref, seconds) {
  const file = planFile(root, ref);
  fs.utimesSync(file, seconds, seconds);
  const ms = fs.statSync(file).mtimeMs;
  assert.notEqual(ms % 1, 0,
    'this file system did not keep a fraction of a millisecond; the full-precision cases cannot run here');
  return ms;
}

/** A functional plan at time `seconds`, with the author's (unchecked) question file. */
function authorPlan(root, slug, seconds = T_A) {
  const ref = `functional/${slug}.md`;
  fs.writeFileSync(planFile(root, ref), functionalBody(`Plan ${slug}`));
  const mtimeMs = setPlanTime(root, ref, seconds);
  const res = precompute.writePlanQuestions(root, ref, [QUESTION], mtimeMs);
  assert.equal(res.ok, true, `fixture: the author's questions were written (${(res.errors || []).join('; ')})`);
  return { ref, mtimeMs };
}

/** Edit the plan's text and set its time, as a later edit does. */
function editPlan(root, ref, seconds) {
  fs.writeFileSync(planFile(root, ref), functionalBody('Edited plan', `\nEdited at ${seconds}.`));
  return setPlanTime(root, ref, seconds);
}

let continuationSeq = 0;

/** The coordinator's call: a reviewed task completes with `--continue`; returns the completion result. */
function continuation(root) {
  const added = route(['menu', 'task', 'add', 'review', `some-reviewed-plan-${continuationSeq++}`], root);
  assert.equal(added.ok, true, JSON.stringify(added));
  assert.equal(route(['menu', 'task', 'start', added.taskId], root).ok, true);
  const res = route(['menu', 'task', 'complete', added.taskId, '--continue'], root);
  assert.equal(res.ok, true, JSON.stringify(res));
  return res;
}

function classifyEntry(res, ref) {
  const list = res.promote || [];
  const entry = list.find((t) => t.kind === 'classify' && t.plan === ref);
  assert.ok(entry, `a classify entry for ${ref} is on offer: ${JSON.stringify(list)}`);
  return entry;
}

function assertOtherEntriesUnchanged(list) {
  for (const t of list.filter((e) => e.kind !== 'classify')) {
    assert.deepEqual(Object.keys(t), NON_CLASSIFY_KEYS, `entry ${t.id} keeps its key set`);
  }
}

/** Assert the hand-over carries the plan's time at full precision, with a fraction. */
function assertHandedOver(root, list, ref) {
  const e = classifyEntry({ promote: list }, ref);
  const onDisk = fs.statSync(planFile(root, ref)).mtimeMs;
  assert.equal(e.plan, ref);
  assert.equal(e.planMtimeMs, onDisk, `the handed-over time is the file's time: ${JSON.stringify(e)}`);
  assert.notEqual(e.planMtimeMs % 1, 0, 'the handed-over time keeps the fraction of a millisecond');
  assertOtherEntriesUnchanged(list);
}

/** Drop the gate critic's file in the waiting folder; the stamp is inserted as characters. */
function dropPendingRaw(root, ref, stampText) {
  const p = precompute.pendingQuestionsPath(root, ref);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `{"ref":${JSON.stringify(ref)},"planMtimeMs":${stampText},"questions":${JSON.stringify([QUESTION])},`
    + `"classification":${JSON.stringify(CLASSIFIED)}}`);
}

function sweeperLog(root) {
  const p = path.join(root, '.ctoc', 'logs', 'streaming-sweeper.jsonl');
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

const discards = (root) => sweeperLog(root).map((l) => ({ file: l.file, reason: l.reason }));

const labelsOfScreen = (screen) => {
  const out = [];
  for (const q of (screen.ask && screen.ask.questions) || []) for (const o of q.options || []) out.push(o.label);
  return out;
};

/** The accepted classification: no "Generate"/"Check" offer, no unchecked-questions line, the question is asked. */
function assertCheckedScreen(root) {
  const screen = streamingGate.streamingGateScreen(root);
  const labels = labelsOfScreen(screen);
  assert.ok(!labels.includes('Generate its questions'), `no Generate offer: ${JSON.stringify(labels)}`);
  assert.ok(!labels.includes('Check its questions'), `no Check offer: ${JSON.stringify(labels)}`);
  const text = JSON.stringify(screen);
  for (const line of ['has not yet checked the questions its author wrote',
    'check of its questions did not finish', 'being checked by the gate critic']) {
    assert.ok(!text.includes(line), `the screen does not say "${line}"`);
  }
  assert.ok(text.includes('Which database engine?'), 'the classified question is the one asked');
  return screen;
}

function classifyTaskOf(root, ref) {
  const t = taskRegistry.load(root).tasks.find((x) => x.kind === 'classify' && x.plan === ref);
  assert.ok(t, `a classify task is recorded for ${ref}`);
  return t;
}

function startTask(root, id, agent) {
  const res = route(['menu', 'task', 'start', id, '--agent-id', agent], root);
  assert.equal(res.ok, true, JSON.stringify(res));
}

function completeContinue(root, id) {
  const res = route(['menu', 'task', 'complete', id, '--continue'], root);
  assert.equal(res.ok, true, JSON.stringify(res));
  return res;
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

describe('the classification brief carries the plan file modification time', () => {
  it('case 1a — menu task complete --continue hands over the classify task with the plan time at full precision', () => {
    const root = makeSandbox();
    const { ref } = authorPlan(root, 'c1');
    const res = continuation(root);
    assertHandedOver(root, res.promote, ref);
  });

  it('case 1b — the same through stream answer', () => {
    const root = makeSandbox();
    const { ref } = authorPlan(root, 'c1b');
    const f = oneFork(root, 'asked');
    const res = route(['stream', 'answer', f.ref, f.qid, f.key, f.digest], root);
    assertHandedOver(root, res.promote || [], ref);
  });

  it('case 1c — the same through stream approve', () => {
    const root = makeSandbox();
    const { ref } = authorPlan(root, 'c1c');
    fs.writeFileSync(planFile(root, 'functional/approved.md'), functionalBody('Approved'));
    const res = route(['stream', 'approve', 'functional/approved.md'], root);
    assert.equal(fs.existsSync(planFile(root, 'implementation/approved.md')), true, 'the approval crossed');
    assertHandedOver(root, res.promote || [], ref);
  });

  it('case 2 — "Check its questions" (stream check) hands over the same time', () => {
    const root = makeSandbox();
    const { ref } = authorPlan(root, 'c2');
    const screen = route(['stream', 'check', ref], root);
    assertHandedOver(root, screen.promote || [], ref);
  });

  it('case 3 — the classify paragraph names planMtimeMs, the promoted entry as its only source, and no by-hand read', () => {
    const md = fs.readFileSync(START_MD, 'utf8');
    const from = md.indexOf('**A promoted `classify` task');
    const to = md.indexOf('### Build-flow idea submit');
    assert.ok(from >= 0 && to > from, 'the classify paragraph is found');
    const span = md.slice(from, to).replace(/\s+/g, ' ');
    const never = 'Never read the plan\'s time yourself: no `node -e`, no file listing, never the task\'s `revision-…` label and never the question file\'s stamp.';
    const sentences = [
      'its brief: the task id, the plan path, "classify the questions of `{ref}`"',
      'the author left unasked), and `planMtimeMs`; never the three lens critics.',
      '`planMtimeMs` is the `planMtimeMs` of the promoted entry, the plan file\'s modification time the menu read when it built `promote[]`, and the only source of that time: copy it into the brief digit for digit, never rounded.',
      never,
      'When the entry\'s `planMtimeMs` is `null` (or the key is missing), the menu could not read the plan file: launch no `gate-critic` for it and do not run `menu task start`. Run `menu task cancel <id>` for it (a queued task cancels at once) and say in one line that the plan file could not be read, so the gate critic did not check its questions.',
      '`menu task add classify \'{ref}\' --touches \'.ctoc/streaming/questions/{ref}\'`',
    ];
    for (const s of sentences) assert.ok(span.includes(s), `the paragraph includes: ${s}`);
    assert.ok(!span.replace(never, '').includes('node -e'), 'no by-hand node -e read is asked for');
  });

  it('case 4 — a fraction of a millisecond survives the real menu output; its whole-millisecond label value is refused', () => {
    const root = makeSandbox();
    const { ref } = authorPlan(root, 'c4');
    const file = planFile(root, ref);
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    const out = execFileSync(process.execPath, [MENU_ENTRY, 'stream', 'check', ref], { cwd: root, encoding: 'utf8', env });
    const parsed = JSON.parse(out.slice(out.indexOf('{')));
    const entry = (parsed.promote || []).find((t) => t.kind === 'classify' && t.plan === ref);
    assert.ok(entry, `the classify entry is on offer: ${out}`);
    assert.ok(Object.hasOwn(entry, 'planMtimeMs'), `the entry carries planMtimeMs: ${out}`);
    const at = out.indexOf(`"id": "${entry.id}"`);
    const slice = out.slice(at, out.indexOf('}', at));
    const m = /"planMtimeMs": ([0-9]+(?:\.[0-9]+)?)/.exec(slice);
    assert.ok(m, `the printed entry holds its time: ${slice}`);
    const digits = m[1];
    assert.equal(Number(digits), fs.statSync(file).mtimeMs);

    const task = classifyTaskOf(root, ref);
    dropPendingRaw(root, ref, task.label.slice('revision-'.length));
    continuation(root);
    assert.deepEqual(discards(root), [{ file: 'functional__c4.md.json', reason: 'superseded' }]);
    assert.equal(precompute.planQuestionsStatus(root, ref).classified, false);
    assert.equal(fs.existsSync(file), true, 'the plan is still at its gate');

    startTask(root, task.id, 'gate-critic-c4');
    dropPendingRaw(root, ref, digits);
    completeContinue(root, task.id);
    assert.equal(discards(root).length, 1, 'no new discard line');
    const st = precompute.planQuestionsStatus(root, ref);
    assert.equal(st.status, 'ready');
    assert.equal(st.classified, true);
    assert.equal(st.questionsRevisionMs, fs.statSync(file).mtimeMs);
    assertCheckedScreen(root);
  });

  it('case 5 — an unreadable plan time is stated as null, never invented', () => {
    const root = makeSandbox();
    const planner = route(['menu', 'task', 'add', 'plan', 'other-plan'], root);
    assert.equal(planner.ok, true, JSON.stringify(planner));
    const { ref } = authorPlan(root, 'c5');
    const first = continuation(root);
    const keptPlanner = first.promote.find((t) => t.id === planner.taskId);
    assert.ok(keptPlanner, `the planner is on offer: ${JSON.stringify(first.promote)}`);
    classifyEntry(first, ref);
    fs.rmSync(planFile(root, ref));
    const res = continuation(root);
    assert.equal(res.ok, true);
    const entry = classifyEntry(res, ref);
    assert.ok(Object.hasOwn(entry, 'planMtimeMs'), 'the key is present');
    assert.strictEqual(entry.planMtimeMs, null);
    assert.deepEqual(res.promote.find((t) => t.id === planner.taskId), keptPlanner);
    assertOtherEntriesUnchanged(res.promote);

    // The session cancels the entry it cannot hand a time for (a queued task cancels at once);
    // the next continuation no longer offers it, and the other entry is still on offer.
    const cancelled = route(['menu', 'task', 'cancel', entry.id], root);
    assert.equal(cancelled.ok, true, JSON.stringify(cancelled));
    assert.equal(cancelled.cancelled, true);
    assert.equal(taskRegistry.load(root).tasks.find((t) => t.id === entry.id).status, 'cancelled');
    const next = continuation(root);
    assert.equal((next.promote || []).some((t) => t.kind === 'classify' && t.plan === ref), false,
      `the cancelled classify entry is not offered again: ${JSON.stringify(next.promote)}`);
    assert.ok(next.promote.find((t) => t.id === planner.taskId), 'the planner entry is still on offer');
  });

  it('case 6 — pin: a classification carrying the author\'s stamp after a plan edit is refused', () => {
    const root = makeSandbox();
    const { ref, mtimeMs: A } = authorPlan(root, 'c6', T_A);
    continuation(root);
    const task = classifyTaskOf(root, ref);
    const B = editPlan(root, ref, T_B);
    assert.ok(B > A);
    startTask(root, task.id, 'gate-critic-c6');
    dropPendingRaw(root, ref, String(A));
    completeContinue(root, task.id);
    assert.deepEqual(discards(root), [{ file: 'functional__c6.md.json', reason: 'superseded' }]);
    assert.equal(fs.existsSync(planFile(root, ref)), true, 'the plan is still at its gate');
    assert.equal(precompute.planQuestionsStatus(root, ref).status, 'stale');
    assert.ok(labelsOfScreen(streamingGate.streamingGateScreen(root)).includes('Generate its questions'));
  });

  it('case 7 — after an edit, the classification carrying the handed-over time is accepted', () => {
    const root = makeSandbox();
    const { ref } = authorPlan(root, 'c7', T_A);
    continuation(root);
    const task = classifyTaskOf(root, ref);
    const B = editPlan(root, ref, T_B);
    const res = continuation(root);
    const entry = classifyEntry(res, ref);
    assert.strictEqual(entry.planMtimeMs, B);
    assert.equal(entry.id, task.id, 'the task recorded for the older revision is the one handed over');
    startTask(root, entry.id, 'gate-critic-c7');
    dropPendingRaw(root, ref, JSON.stringify(entry.planMtimeMs));
    completeContinue(root, entry.id);
    assert.deepEqual(discards(root), [], 'nothing was discarded');
    const st = precompute.planQuestionsStatus(root, ref);
    assert.equal(st.status, 'ready');
    assert.equal(st.classified, true);
    assert.equal(st.questionsRevisionMs, B);
    assertCheckedScreen(root);
  });

  it('case 8 — pin: an edit after the classification was stamped is still refused', () => {
    const root = makeSandbox();
    const { ref } = authorPlan(root, 'c8', T_B);
    continuation(root);
    const task = classifyTaskOf(root, ref);
    startTask(root, task.id, 'gate-critic-c8');
    dropPendingRaw(root, ref, String(fs.statSync(planFile(root, ref)).mtimeMs));
    editPlan(root, ref, T_C);
    completeContinue(root, task.id);
    assert.deepEqual(discards(root), [{ file: 'functional__c8.md.json', reason: 'superseded' }]);
    assert.equal(fs.existsSync(planFile(root, ref)), true, 'the plan is still at its gate');
    assert.notEqual(precompute.planQuestionsStatus(root, ref).classified, true);
    const d = streamingGate.pendingGateDecisions(root).find((x) => x.ref === ref);
    assert.ok(d, 'the plan waits at its gate');
    assert.equal(d.enough, false);
  });
});
