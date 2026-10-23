'use strict';

/**
 * A plan in the build queue can be sent back to technical planning and keeps its title.
 *
 * Every case drives the REAL functions in a temporary project: real plan files, the real
 * approval record, the real task registry, the real question store and the real menu router;
 * the cases that name `spawned` run the real entry, `node src/commands/start.js`. Nothing in
 * CTOC is mocked. There are two fault seams, each a property patch put back in `finally`:
 * `task-registry.updateTask`, used three times (C10: one cancel throws, C10b: every cancel throws, C10c:
 * someone else cancels the same build at the same moment), and `actions.isSentBackUnrevised`, used once
 * (D9b: it throws while the validation screen reads the hold).
 *
 * No test measures, sleeps or compares durations. The spawned commands carry `timeout: 30000`
 * only as a hang guard. The planted build-start lock in C6 gets its time set to now with
 * `fs.utimesSync`, and no test waits for it to age.
 *
 * "The build queue" is `plans/todo/`, "technical planning" is `plans/implementation/`,
 * "requirements" is `plans/functional/`. Case ids are the plan's Test Plan.
 */

const { describe, it, before, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const menuScreens = require('../src/lib/menu-screens.js');
const streamingGate = require('../src/lib/streaming-gate.js');
const precompute = require('../src/lib/streaming-precompute.js');
const taskRegistry = require('../src/lib/task-registry.js');
const ledger = require('../src/lib/approval-ledger.js');
const actions = require('../src/lib/actions.js');
const { loopBDirective } = require('../src/lib/loop-b-driver.js');
const { recentIncrements } = require('../src/lib/increment-feed.js');

const { route } = menuScreens;
const MENU_ENTRY = path.join(__dirname, '..', 'src', 'commands', 'start.js');

const STAGES = ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done'];
const CLASSIFIED = Object.freeze({ by: 'gate-critic', at: 1786000000000 });
const STAGE_WORD = /\b(vision|canvas|functional|implementation|todo|in-progress|review|done)\b|plans[\\/]/;
const TITLE = 'Readers skip the rejection header';
const REASON = 'the "files:" list misses src/lib/increment-feed.js and $HOME paths';
const WRONG_WAY = 'Send it back — wrong way';
const WRONG_WAY_DESCRIPTION = 'The requirements are right; the technical approach is wrong. It goes back to be re-planned.';

// The held plan's words (the owner's answer of 2026-10-20), as the screens must print them.
const HELD_LINE = 'It waits for a change or your approval: it was sent back to be re-planned and has not been changed since, so it does not move on by itself.';
const HELD_APPROVE = 'Approve it now yourself: it was sent back to be re-planned and has not been changed since. Your answer is recorded as yours.';
const HELD_OPEN = 'Recommended — it was sent back to be re-planned and has not been changed since; open it to read why.';
const HELD_CHECK = 'Recommended — it was sent back to be re-planned and has not been changed since; its reason is at the top of the plan above. Show the validation detail before deciding.';


// The symbolic-link case fails loudly where links cannot be made, never skips (the gate fails any skipped
// test). Copied from tests/the-owner-answers-an-inbox-question.test.js, whose owner's ruling is that link
// cases fail loudly.
let SYMLINK_ERR = null;
before(() => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-send-back-probe-'));
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

// Invisible characters are built from their code points, never typed into this file.
const ZWSP = String.fromCodePoint(0x200B);
const WORD_JOINER = String.fromCodePoint(0x2060);

const sandboxes = [];
let counter = 0;

afterEach(() => {
  while (sandboxes.length) fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
});

function makeSandbox() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-send-back-')));
  for (const stage of STAGES) fs.mkdirSync(path.join(root, 'plans', stage), { recursive: true });
  fs.mkdirSync(path.join(root, '.ctoc'), { recursive: true });
  sandboxes.push(root);
  return root;
}

const planPathOf = (root, ref) => path.join(root, 'plans', ...ref.split('/'));
const exists = (root, ref) => fs.existsSync(planPathOf(root, ref));
const read = (root, ref) => fs.readFileSync(planPathOf(root, ref), 'utf8');

function writePlan(root, ref, body) {
  const p = planPathOf(root, ref);
  fs.writeFileSync(p, body);
  return p;
}

/** A requirements plan that passes validateFunctionalToImpl. */
function functionalBody(title) {
  return `---\ntitle: ${title}\n---\n\n# ${title}\n\n## Problem Statement\nThe thing is broken.\n\n`
    + '## Acceptance Criteria\n- [ ] the thing works\n\n## Scope\nThe module.\n';
}

/** A technical plan valid for the build queue: `iron_loop`, `title`, a `files:` list and its own heading. */
function implBody(title, files = ['src/readers.js']) {
  const fl = files.length ? `files:\n${files.map((f) => `  - ${f}`).join('\n')}\n` : '';
  return `---\niron_loop: true\ntitle: ${title}\n${fl}---\n\n# ${title}\n\n## Implementation\nBody.\n`;
}

/**
 * A plan carrying the send-back blocks `rejectPlan` writes (`# REVISION <n>`, `## Rejection Feedback`,
 * the reason, a `---` line), newest first, above its own title. `reasons` is oldest first. The
 * frontmatter is implBody's, plus `revision` and `tag: rejected` (no hold mark).
 */
function sentBackBody(title, reasons, { heading = true, frontTitle = true, files = ['src/readers.js'] } = {}) {
  const n = reasons.length;
  const blocks = reasons.map((r, i) => `# REVISION ${i + 1}\n\n## Rejection Feedback\n\n${r}\n\n---\n\n`).reverse().join('');
  const fl = `files:\n${files.map((f) => `  - ${f}`).join('\n')}\n`;
  const fm = `---\niron_loop: true\n${frontTitle ? `title: "${title}"\n` : ''}${fl}revision: ${n}\ntag: rejected\n---\n\n`;
  return `${fm}${blocks}${heading ? `# ${title}\n\n` : ''}## Implementation\nBody.\n`;
}

/** The plan waiting in the build queue with the approval record of its build-it decision. */
function queueForBuild(root, slug, title) {
  const body = implBody(title);
  const p = writePlan(root, `todo/${slug}.md`, body);
  ledger.writeEntry(slug, { content: fs.readFileSync(p, 'utf8'), stage_from: 'implementation', stage_to: 'todo' }, root);
  return p;
}

/** The real entry in the temporary project; asserts a clean exit and returns the parsed answer. */
function runMenu(root, args, input) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  const r = spawnSync(process.execPath, [MENU_ENTRY, ...args], {
    cwd: root, encoding: 'utf8', env, input, timeout: 30000,
  });
  assert.equal(r.status, 0, `menu exited with ${r.status}: ${r.stderr}`);
  return { json: JSON.parse(r.stdout), raw: r.stdout };
}

/** The send-back command as the session runs it: the reason on standard input. */
function sendBack(root, ref, reason, dest = 'implementation') {
  return runMenu(root, ['claude:reject', ref, dest, '--stdin'], reason == null ? '' : `${reason}\n`);
}

/** The same command in process, with the bytes standard input would carry. */
function sendBackInProcess(root, ref, reasonBytes) {
  return route(['claude:reject', ref, 'implementation', '--stdin'], root, { answerText: reasonBytes });
}

/** Write the live questions file stamped with the plan's own modification time. */
function writeQuestions(root, ref, questions = [], { classified = true } = {}) {
  const at = fs.statSync(planPathOf(root, ref)).mtimeMs;
  const res = precompute.writePlanQuestions(root, ref, questions, at, undefined, classified ? CLASSIFIED : undefined);
  assert.equal(res.ok, true, `fixture: questions for ${ref} were written (${(res.errors || []).join('; ')})`);
  return at;
}

/** Another plan finishes its planning task and the menu's continuation runs (`complete --continue`). */
function continueOnce(root) {
  counter += 1;
  const slug = `other-${counter}`;
  const ref = `functional/${slug}.md`;
  writePlan(root, ref, functionalBody(`Other thing ${counter}`));
  const add = route(['menu', 'task', 'add', 'plan', slug], root);
  assert.equal(add.ok, true, `fixture: the planning task was added (${JSON.stringify(add)})`);
  const started = route(['menu', 'task', 'start', add.taskId], root);
  assert.equal(started.ok, true, `fixture: the planning task started (${JSON.stringify(started)})`);
  const res = route(['menu', 'task', 'complete', add.taskId, '--continue'], root);
  assert.equal(res.ok, true, `fixture: the continuation ran (${JSON.stringify(res)})`);
  fs.rmSync(planPathOf(root, ref), { force: true }); // keep the screens about the plan under test
  return res;
}

function addBuild(root, slug, extra = []) {
  const r = route(['menu', 'task', 'add', 'implement', slug, '--touches', `src/${slug}.js,plans/todo/${slug}.md`, ...extra], root);
  assert.equal(r.ok, true, `fixture: the build task was added (${JSON.stringify(r)})`);
  return r.taskId;
}

const tasks = (root) => taskRegistry.load(root).tasks;
const taskOf = (root, id) => tasks(root).find((t) => t.id === id);
const labelsOf = (screen, i = 0) => screen.ask.questions[i].options.map((o) => o.label);
const optionOf = (screen, label, i = 0) => screen.ask.questions[i].options.find((o) => o.label === label);
const topicLine = (text) => (String(text).split('\n').find((l) => l.startsWith('Topic: ')) || '');
const recommendedCount = (screen) => screen.ask.questions[0].options.filter((o) => o.description.startsWith('Recommended')).length;

// ─────────────────────────────────────────────────────────────────────────────
describe('A — the one title reader (planOwnTitle)', () => {
  it('A1 a plan with no send-back is named by its first level-1 heading', () => {
    assert.equal(streamingGate.planOwnTitle('---\ntitle: T\n---\n\n# Own title\n\n## Sub\n', 'x'), 'Own title');
  });

  it('A2 one send-back block above the title is skipped', () => {
    assert.equal(streamingGate.planOwnTitle(sentBackBody('Own title', ['why']), 'x'), 'Own title');
  });

  it('A3 two stacked send-back blocks are skipped', () => {
    const fixture = sentBackBody('Finished plans are not sent back after an update', ['first', 'second']);
    assert.match(fixture, /# REVISION 2[\s\S]*# REVISION 1/);
    assert.equal(streamingGate.planOwnTitle(fixture, 'x'), 'Finished plans are not sent back after an update');
  });

  it('A4 a level-1 heading inside a reason is never the title', () => {
    const body = sentBackBody('Own title', ['first line\n# Not the title\nlast line']);
    assert.equal(streamingGate.planOwnTitle(body, 'x'), 'Own title');
  });

  it('A5 a title that begins with Revision is kept', () => {
    assert.equal(streamingGate.planOwnTitle('---\ntitle: T\n---\n\n# Revision history is kept for every plan\n', 'x'),
      'Revision history is kept for every plan');
    assert.equal(streamingGate.planOwnTitle(sentBackBody('Revision history is kept for every plan', ['why']), 'x'),
      'Revision history is kept for every plan');
    assert.equal(streamingGate.planOwnTitle('---\ntitle: T\n---\n\n# REVISION 2 notes\n', 'x'), 'REVISION 2 notes');
  });

  it('A6 no title heading: the frontmatter title, a number read as text, else the file name', () => {
    const block = '# REVISION 1\n\n## Rejection Feedback\n\nwhy\n\n---\n\n';
    assert.equal(streamingGate.planOwnTitle(`---\ntitle: "${TITLE}"\n---\n\n${block}`, 'readers'), TITLE);
    assert.equal(streamingGate.planOwnTitle(`---\ntitle: 2026\n---\n\n${block}`, 'readers'), '2026');
    assert.equal(streamingGate.planOwnTitle(`---\nfiles:\n  - src/a.js\n---\n\n${block}`, 'readers'), 'readers');
    assert.equal(streamingGate.planOwnTitle(`---\ntitle: "From the file"\n---\n\n${block}`, 'readers', { title: 'From metadata' }),
      'From metadata');
  });

  it('A7 Windows line endings', () => {
    const crlf = sentBackBody('Own title', ['why']).replace(/\n/g, '\r\n');
    assert.equal(streamingGate.planOwnTitle(crlf, 'x'), 'Own title');
  });

  it('A8 a frontmatter comment line is never the title', () => {
    assert.equal(streamingGate.planOwnTitle('---\n# a yaml comment\ntitle: T\n---\n\n# Own title\n', 'x'), 'Own title');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('B — offered on the plan screen', () => {
  it('B1 scenario: a build-queue plan\'s screen offers the send-back', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);

    const screen = route(['plan', 'todo/readers.md'], root);

    assert.equal(screen.ask.questions.length, 1);
    assert.deepEqual(labelsOf(screen), ['Discuss', 'View/Edit', 'Delete', WRONG_WAY]);
    assert.equal(optionOf(screen, WRONG_WAY).description, WRONG_WAY_DESCRIPTION);
    assert.equal(screen.actions[WRONG_WAY], 'claude:reject todo/readers.md implementation');
    for (const o of screen.ask.questions[0].options) {
      assert.doesNotMatch(`${o.label} ${o.description}`, STAGE_WORD, `option "${o.label}" names no stage directory`);
    }
    assert.doesNotMatch(screen.ask.questions[0].question, STAGE_WORD);
  });

  it('B2 scenario: plans in other stages show the options they show today (pinned from the unchanged code)', () => {
    const root = makeSandbox();
    const discuss = { label: 'Discuss', description: 'EXTREME adversarial critique — nothing held back. The most important step.' };
    const viewEdit = { label: 'View/Edit', description: 'Show the plan, then edit it' };
    const del = { label: 'Delete', description: 'Remove this plan permanently' };
    const notNow = { label: 'Not now', description: 'Nothing else for this plan.' };
    const rideAlong = (name) => ({ question: `Anything else for ${name}?`, header: 'This plan', options: [discuss, viewEdit, del, notNow] });
    const lifecycle = (name) => ({ question: `What should happen to ${name}?`, header: name, options: [discuss, viewEdit, del] });
    const everything = 'Recommended — everything checks out. Your answer is recorded as yours.';
    const check = { label: 'Check validation', description: 'Show the pre-transition validation detail before crossing.' };
    const lifecycleActions = (ref) => ({ Discuss: 'claude:discuss', 'View/Edit': `claude:view-edit ${ref}`, Delete: `claude:delete ${ref}` });

    writePlan(root, 'functional/f.md', functionalBody('Func plan'));
    writePlan(root, 'implementation/i.md', implBody('Impl plan'));
    writePlan(root, 'in-progress/p.md', implBody('Prog plan'));
    writePlan(root, 'done/d.md', implBody('Done plan'));

    const expected = {
      'functional/f.md': {
        questions: [
          { question: 'Is “Func plan” the thing to build?', header: 'Build this?', options: [{ label: 'Yes — that’s the thing to build', description: everything }, check] },
          rideAlong('Func plan'),
        ],
        actions: {
          'Yes — that’s the thing to build': 'stream approve functional/f.md',
          'Check validation': 'validate functional/f.md',
          Other: 'stream comment functional/f.md',
          ...lifecycleActions('functional/f.md'),
          'Not now': '',
        },
      },
      'implementation/i.md': {
        questions: [
          { question: 'Shall I build “Impl plan”?', header: 'Build it?', options: [{ label: 'Yes — build it', description: everything }, check] },
          rideAlong('Impl plan'),
        ],
        actions: {
          'Yes — build it': 'stream approve implementation/i.md',
          'Check validation': 'validate implementation/i.md',
          Other: 'stream comment implementation/i.md',
          ...lifecycleActions('implementation/i.md'),
          'Not now': '',
        },
      },
      'in-progress/p.md': { questions: [lifecycle('Prog plan')], actions: lifecycleActions('in-progress/p.md') },
      'done/d.md': { questions: [lifecycle('Done plan')], actions: lifecycleActions('done/d.md') },
    };

    for (const [ref, want] of Object.entries(expected)) {
      const screen = route(['plan', ref], root);
      assert.deepEqual(screen.ask.questions, want.questions, `${ref}: the questions are as before`);
      assert.deepEqual(screen.actions, want.actions, `${ref}: the actions are as before`);
      assert.equal(JSON.stringify(screen).includes(WRONG_WAY), false, `${ref} does not offer the build-queue send-back`);
    }
  });

  it('B3 scenario: the review screen is unchanged, and the command refuses a review plan', () => {
    const root = makeSandbox();
    writePlan(root, 'review/r.md', `---\ntitle: Rev plan\n---\n\n# Rev plan\n\nSome prose.\n`);

    const screen = route(['plan', 'review/r.md'], root);

    const wrongThing = optionOf(screen, 'Send it back — wrong thing');
    assert.equal(wrongThing.description, 'The requirements are wrong. It goes back to be re-thought before anyone builds it again.');
    assert.equal(optionOf(screen, WRONG_WAY).description, WRONG_WAY_DESCRIPTION);
    assert.equal(screen.actions['Send it back — wrong thing'], 'claude:reject review/r.md functional');
    assert.equal(screen.actions[WRONG_WAY], 'claude:reject review/r.md implementation');

    const before = read(root, 'review/r.md');
    const { json } = sendBack(root, 'review/r.md', 'why', 'implementation');
    assert.equal(json.ok, false, `the command refused (it printed: ${String(json.text).slice(0, 80)})`);
    assert.equal(json.reason, 'not-in-build-queue');
    assert.match(json.text, /build queue only/);
    assert.equal(read(root, 'review/r.md'), before, 'the plan file is byte-identical');
    assert.equal(exists(root, 'in-progress/r.md'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('C — sent back with a reason', () => {
  it('C1 scenario: the menu command sends the plan back with its reason (spawned)', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);

    const { json, raw } = sendBack(root, 'todo/readers.md', REASON);

    assert.equal(json.ok, true, `the plan was sent back (the command printed: ${String(json.text).slice(0, 80)})`);
    assert.equal(exists(root, 'implementation/readers.md'), true, 'the plan is in technical planning');
    assert.equal(exists(root, 'todo/readers.md'), false, 'and no longer in the build queue');
    assert.ok(read(root, 'implementation/readers.md').includes(`## Rejection Feedback\n\n${REASON}\n`), 'the reason, character for character');
    assert.equal(ledger.readEntry('readers', root), null, 'the approval record of the build-it decision is gone');
    assert.deepEqual(Object.keys(json), ['ok', 'text']);
    assert.ok(json.text.includes(`“${TITLE}”`) && json.text.includes('re-planned'));
    assert.equal(json.text.includes('\n'), false, 'one line');
    assert.doesNotMatch(json.text, STAGE_WORD);
    assert.doesNotMatch(raw, STAGE_WORD);
    assert.equal(actions.isSentBackUnrevised(read(root, 'implementation/readers.md')), true);
  });

  it('C2 scenario: no reason, or another destination, is refused (spawned)', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    const planBefore = fs.readFileSync(planFile, 'utf8');
    const recordBefore = ledger.readEntry('readers', root);
    assert.notEqual(recordBefore, null, 'fixture: the approval record exists');

    const empty = sendBack(root, 'todo/readers.md', null).json;
    assert.equal(empty.reason, 'no-reason');
    assert.match(empty.text, /reason is required/);

    const other = sendBack(root, 'todo/readers.md', 'why', 'functional').json;
    assert.equal(other.reason, 'wrong-destination');
    assert.match(other.text, /can only be sent back to be re-planned/);

    const noStdinWord = runMenu(root, ['claude:reject', 'todo/readers.md', 'implementation'], '').json;
    assert.equal(noStdinWord.reason, 'no-reason');

    const blank = runMenu(root, ['claude:reject', 'todo/readers.md', 'implementation', '--stdin'], '   \n').json;
    assert.equal(blank.reason, 'no-reason');

    assert.equal(fs.readFileSync(planFile, 'utf8'), planBefore, 'the plan file is byte-identical');
    assert.equal(exists(root, 'todo/readers.md'), true);
    assert.deepEqual(ledger.readEntry('readers', root), recordBefore, 'the approval record is unchanged');
  });

  it('C3 scenario: a plan whose build has started is not sent back', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    const id = addBuild(root, 'readers');
    const claim = route(['menu', 'task', 'start', id], root);
    assert.equal(claim.ok, true, JSON.stringify(claim));
    assert.equal(exists(root, 'in-progress/readers.md'), true, 'fixture: the claim moved the plan into the build');
    const before = read(root, 'in-progress/readers.md');
    const registryBefore = fs.readFileSync(path.join(root, '.ctoc', 'state', 'tasks.json'), 'utf8');

    const { json } = sendBack(root, 'todo/readers.md', 'why');

    assert.equal(json.reason, 'being-built', `refused (the command printed: ${String(json.text).slice(0, 80)})`);
    assert.ok(json.text.includes(TITLE));
    assert.equal(read(root, 'in-progress/readers.md'), before);
    assert.equal(exists(root, 'todo/readers.md'), false);
    assert.equal(fs.readFileSync(path.join(root, '.ctoc', 'state', 'tasks.json'), 'utf8'), registryBefore, 'the build task is unchanged');
    assert.equal(taskOf(root, id).status, 'running');
  });

  it('C3b a running build of a plan still in the build queue refuses the send-back', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    const reg = taskRegistry.load(root);
    const task = taskRegistry.addTask(reg, { kind: 'implement', plan: 'readers', touches: ['src/readers.js', 'plans/todo/readers.md'] });
    taskRegistry.updateTask(reg, task.id, { status: 'running', agentTaskId: 'agent-x' });
    taskRegistry.save(root, reg);
    const before = fs.readFileSync(planFile, 'utf8');

    const { json } = sendBack(root, 'todo/readers.md', 'why');

    assert.equal(json.reason, 'being-built', `refused (the command printed: ${String(json.text).slice(0, 80)})`);
    assert.equal(fs.readFileSync(planFile, 'utf8'), before);
    assert.equal(taskOf(root, task.id).status, 'running');
  });

  it('C4 scenario: a queued build of the plan is cancelled with it', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    const id = addBuild(root, 'readers');

    const { json } = sendBack(root, 'todo/readers.md', 'why');

    assert.equal(json.ok, true, `sent back (the command printed: ${String(json.text).slice(0, 80)})`);
    assert.equal(taskOf(root, id).status, 'cancelled');
    assert.ok(json.text.includes('Its queued build was cancelled.'));
    const start = route(['menu', 'task', 'start', id], root);
    assert.notEqual(start.ok, true, 'the cancelled build does not start');
    assert.equal(exists(root, 'implementation/readers.md'), true);
    assert.equal(exists(root, 'in-progress/readers.md'), false);
    assert.equal(exists(root, 'todo/readers.md'), false);
  });

  it('C4b two queued builds of one plan are both cancelled', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    const reg = taskRegistry.load(root);
    const a = taskRegistry.addTask(reg, { kind: 'implement', plan: 'readers', touches: ['src/readers.js', 'plans/todo/readers.md'] });
    const b = taskRegistry.addTask(reg, { kind: 'implement', plan: 'readers', touches: ['src/readers.js', 'plans/todo/readers.md'] });
    taskRegistry.save(root, reg);

    const { json } = sendBack(root, 'todo/readers.md', 'why');

    assert.equal(json.ok, true, `sent back (the command printed: ${String(json.text).slice(0, 80)})`);
    assert.ok(json.text.includes('Its queued builds were cancelled.'));
    assert.equal(taskOf(root, a.id).status, 'cancelled');
    assert.equal(taskOf(root, b.id).status, 'cancelled');
  });

  it('C5 a queued build that waited on the cancelled one is named', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    queueForBuild(root, 'other', 'Another plan entirely');
    const first = addBuild(root, 'readers');
    const second = addBuild(root, 'other', ['--blocked', first]);

    const { json } = sendBack(root, 'todo/readers.md', 'why');

    assert.equal(json.ok, true, `sent back (the command printed: ${String(json.text).slice(0, 80)})`);
    assert.ok(json.text.includes('Another plan entirely'), json.text);
    assert.ok(json.text.includes('can now never run'), json.text);
    const stuck = taskRegistry.unsatisfiableTasks(taskRegistry.load(root)).find((u) => u.task.id === second);
    assert.ok(stuck, 'the dependent build is listed');
    assert.equal(stuck.reason, 'dep-failed');
  });

  it('C6 a build start in progress refuses the send-back', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    const lock = path.join(root, '.ctoc', 'state', 'build-start.lock');
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    fs.writeFileSync(lock, 'x');
    const now = new Date();
    fs.utimesSync(lock, now, now);
    const planBefore = fs.readFileSync(planFile, 'utf8');
    const recordBefore = ledger.readEntry('readers', root);

    const { json } = sendBack(root, 'todo/readers.md', 'why');

    assert.equal(json.reason, 'busy', `refused (the command printed: ${String(json.text).slice(0, 80)})`);
    assert.equal(fs.readFileSync(planFile, 'utf8'), planBefore);
    assert.deepEqual(ledger.readEntry('readers', root), recordBefore);
    assert.equal(fs.readFileSync(lock, 'utf8'), 'x', 'the other start\'s lock is untouched');
  });

  it('C6b a lock path that is not a plain file is named', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    fs.mkdirSync(path.join(root, '.ctoc', 'state', 'build-start.lock'), { recursive: true });
    const before = fs.readFileSync(planFile, 'utf8');

    const { json } = sendBack(root, 'todo/readers.md', 'why');

    assert.equal(json.reason, 'lock-unusable', `refused (the command printed: ${String(json.text).slice(0, 80)})`);
    assert.ok(json.text.includes('.ctoc/state/build-start.lock'));
    assert.equal(fs.readFileSync(planFile, 'utf8'), before);
  });

  it('C7 a plan of the same file name already waiting to be re-planned', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    const other = writePlan(root, 'implementation/readers.md', implBody('A different plan'));
    const a = fs.readFileSync(planFile, 'utf8');
    const b = fs.readFileSync(other, 'utf8');

    const { json } = sendBack(root, 'todo/readers.md', 'why');

    assert.equal(json.reason, 'name-taken', `refused (the command printed: ${String(json.text).slice(0, 80)})`);
    assert.equal(fs.readFileSync(planFile, 'utf8'), a);
    assert.equal(fs.readFileSync(other, 'utf8'), b);
  });

  it('C8 a reason line that begins with the heredoc marker is refused', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    const before = fs.readFileSync(planFile, 'utf8');

    const { json } = sendBack(root, 'todo/readers.md', 'why\nCTOC_ANSWER_x');

    assert.equal(json.reason, 'reason-holds-marker', `refused (the command printed: ${String(json.text).slice(0, 80)})`);
    assert.equal(fs.readFileSync(planFile, 'utf8'), before);
  });

  it('C9 a send-back that cannot finish its move says it stopped part-way and cancels its queued build (in process)', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    const id = addBuild(root, 'readers');
    fs.rmSync(path.join(root, 'plans', 'implementation'), { recursive: true, force: true });
    fs.writeFileSync(path.join(root, 'plans', 'implementation'), 'not a folder');

    const out = sendBackInProcess(root, 'todo/readers.md', Buffer.from('why\n'));

    assert.equal(out.reason, 'send-back-failed', `stopped (the command printed: ${String(out.text).slice(0, 80)})`);
    assert.match(out.text, /stopped part-way/);
    assert.ok(out.text.includes('Its queued build was cancelled.'), out.text);
    assert.equal(out.text.includes(root), false, 'no path on the result line');
    assert.doesNotMatch(out.text, STAGE_WORD);
    assert.equal(taskOf(root, id).status, 'cancelled', 'the queued build cannot start a half-changed plan');
    assert.notEqual(route(['menu', 'task', 'start', id], root).ok, true, 'the cancelled build does not start');
    assert.equal(exists(root, 'todo/readers.md'), true);
    assert.equal(exists(root, 'in-progress/readers.md'), false);
    assert.match(fs.readFileSync(planFile, 'utf8'), /# REVISION 1/, 'the honest partial state rejectPlan\'s order leaves');
    assert.ok(taskRegistry.readWarnLog(root).some((e) => e.event === 'send_back_failed'), 'the cause is in the warn log');
  });

  it('C9b a send-back that fails before it changes the plan leaves it and its queued build as they were (in process)', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    const id = addBuild(root, 'readers');
    // A folder where the plan's status file would be: clearStatus cannot remove it, and that happens before rejectPlan writes.
    fs.mkdirSync(`${planFile}.status`);
    const planBefore = fs.readFileSync(planFile, 'utf8');
    const recordBefore = ledger.readEntry('readers', root);
    assert.notEqual(recordBefore, null, 'fixture: the approval record exists');

    const out = sendBackInProcess(root, 'todo/readers.md', Buffer.from('why\n'));

    assert.equal(out.reason, 'send-back-failed', `refused (the command printed: ${String(out.text).slice(0, 80)})`);
    assert.equal(out.text, 'Nothing was sent back: the plan could not be changed; it is still waiting in the build queue as it was.');
    assert.equal(out.text.includes(root), false);
    assert.equal(fs.readFileSync(planFile, 'utf8'), planBefore, 'the plan is byte-identical');
    assert.deepEqual(ledger.readEntry('readers', root), recordBefore, 'the approval record is unchanged');
    assert.equal(exists(root, 'todo/readers.md'), true);
    assert.equal(taskOf(root, id).status, 'queued', 'its queued build is as it was');
  });

  /** Run the in-process send-back with `task-registry.updateTask` patched; `onCancel(original, registry, taskId, patch)` runs for a cancel. */
  function sendBackWithCancelFault(root, onCancel) {
    const original = taskRegistry.updateTask;
    taskRegistry.updateTask = function patched(registry, taskId, patch, ...rest) {
      if (patch && patch.status === 'cancelled') onCancel(original, registry, taskId, patch);
      return original.call(this, registry, taskId, patch, ...rest);
    };
    try {
      return sendBackInProcess(root, 'todo/readers.md', Buffer.from('why\n'));
    } finally {
      taskRegistry.updateTask = original;
    }
  }

  it('C10 a build that could not be cancelled is named on the result line, without error text (in process, one fault)', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    const id = addBuild(root, 'readers');
    const registryFile = path.join(root, '.ctoc', 'state', 'tasks.json');
    let thrown = false;
    const out = sendBackWithCancelFault(root, (original, registry, taskId) => {
      if (thrown) return;
      thrown = true;
      throw new Error(`cancelTask: task ${taskId} failed writing ${registryFile}`);
    });

    assert.equal(out.ok, true, `sent back (the command printed: ${String(out.text).slice(0, 80)})`);
    assert.equal(thrown, true, 'the fault was reached');
    assert.match(out.text, /could not be cancelled/);
    assert.ok(out.text.includes('Its queued build could not be cancelled; cancel it on the task board.'), out.text);
    assert.equal(out.text.includes(id), false, 'no task id on the result line');
    assert.equal(out.text.includes(root), false, 'no path on the result line');
    assert.doesNotMatch(out.text, STAGE_WORD);
    assert.equal(exists(root, 'implementation/readers.md'), true);
    assert.equal(taskOf(root, id).status, 'queued');
    const entry = taskRegistry.readWarnLog(root).find((e) => e.event === 'send_back_cancel_failed');
    assert.ok(entry, 'the failure is in the warn log');
    assert.equal(entry.task, id);
    assert.ok(String(entry.message).includes(registryFile), 'the warn log holds the raw message');
  });

  it('C10b two builds that could not be cancelled are named in the plural (in process, every cancel fails)', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    const reg = taskRegistry.load(root);
    const a = taskRegistry.addTask(reg, { kind: 'implement', plan: 'readers', touches: ['src/readers.js', 'plans/todo/readers.md'] });
    const b = taskRegistry.addTask(reg, { kind: 'implement', plan: 'readers', touches: ['src/readers.js', 'plans/todo/readers.md'] });
    taskRegistry.save(root, reg);

    const out = sendBackWithCancelFault(root, () => { throw new Error('simulated registry fault'); });

    assert.equal(out.ok, true, `sent back (the command printed: ${String(out.text).slice(0, 80)})`);
    assert.ok(out.text.includes('Its queued builds could not be cancelled; cancel them on the task board.'), out.text);
    assert.equal(taskOf(root, a.id).status, 'queued');
    assert.equal(taskOf(root, b.id).status, 'queued');
  });

  it('C10c a build cancelled by someone else at the same moment counts as cancelled (in process)', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    const id = addBuild(root, 'readers');
    let raced = false;
    const out = sendBackWithCancelFault(root, (original, registry, taskId, patch) => {
      if (raced) return;
      raced = true;
      // `menu task cancel` from another process, between this cancel's read and its write.
      taskRegistry.withRegistry(root, (other) => { original.call(taskRegistry, other, taskId, patch); });
    });

    assert.equal(raced, true, 'the race was staged');
    assert.equal(out.ok, true, `sent back (the command printed: ${String(out.text).slice(0, 80)})`);
    assert.ok(out.text.includes('Its queued build was cancelled.'), out.text);
    assert.equal(out.text.includes('could not be cancelled'), false, out.text);
    assert.equal(taskOf(root, id).status, 'cancelled');
    assert.equal(taskRegistry.readWarnLog(root).some((e) => e.event === 'send_back_cancel_failed'), false);
  });

  it('C11 a reference the menu cannot name is refused', () => {
    const root = makeSandbox();
    const { json } = sendBack(root, '../x.md', 'why');
    assert.equal(json.reason, 'invalid-reference', `refused (the command printed: ${String(json.text).slice(0, 80)})`);
  });

  it('C12 a plan not waiting in the build queue is refused', () => {
    const root = makeSandbox();
    const { json } = sendBack(root, 'todo/missing.md', 'why');
    assert.equal(json.reason, 'not-found', `refused (the command printed: ${String(json.text).slice(0, 80)})`);
  });

  it('C13 a reason that is too long, or not UTF-8, is refused (in process)', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    const before = fs.readFileSync(planFile, 'utf8');

    const tooLong = sendBackInProcess(root, 'todo/readers.md', Buffer.alloc(16386, 0x61));
    const notText = sendBackInProcess(root, 'todo/readers.md', Buffer.from([0xff, 0x0a]));

    assert.equal(tooLong.reason, 'reason-too-long', `refused (the command printed: ${String(tooLong.text).slice(0, 80)})`);
    assert.equal(notText.reason, 'reason-not-text', `refused (the command printed: ${String(notText.text).slice(0, 80)})`);
    assert.equal(fs.readFileSync(planFile, 'utf8'), before);
  });

  it('C14 a plan file in the build queue that is a symbolic link is refused and its target is untouched (spawned)', () => {
    requireSymlinks();
    const root = makeSandbox();
    const outside = path.join(root, 'outside.md');
    fs.writeFileSync(outside, implBody(TITLE));
    const link = path.join(root, 'plans', 'todo', 'readers.md');
    fs.symlinkSync(outside, link);
    ledger.writeEntry('readers', { content: implBody(TITLE), stage_from: 'implementation', stage_to: 'todo' }, root);
    const outsideBefore = fs.readFileSync(outside, 'utf8');
    const recordBefore = ledger.readEntry('readers', root);

    const { json } = sendBack(root, 'todo/readers.md', 'why');

    assert.equal(json.reason, 'not-a-plain-file', `refused (the command printed: ${String(json.text).slice(0, 80)})`);
    assert.ok(json.text.startsWith('Nothing was sent back: the plan file in the build queue is a link or not a plain file'), json.text);
    assert.equal(fs.readFileSync(outside, 'utf8'), outsideBefore, 'the link target is byte-identical');
    assert.equal(fs.lstatSync(link).isSymbolicLink(), true, 'the link is still in the build queue');
    assert.equal(exists(root, 'implementation/readers.md'), false);
    assert.deepEqual(ledger.readEntry('readers', root), recordBefore, 'the approval record is unchanged');
  });

  it('C15 a reason with a line that is only --- is refused', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    const before = fs.readFileSync(planFile, 'utf8');
    const recordBefore = ledger.readEntry('readers', root);

    for (const reason of ['why\n---\n# Approved — safe to build', 'why\n-\x01--\n# Approved — safe to build']) {
      const { json } = sendBack(root, 'todo/readers.md', reason);
      assert.equal(json.reason, 'reason-holds-separator', `refused (the command printed: ${String(json.text).slice(0, 80)})`);
      assert.ok(json.text.startsWith('Nothing was sent back:'), json.text);
    }

    assert.equal(fs.readFileSync(planFile, 'utf8'), before, 'the plan is unchanged');
    assert.equal(exists(root, 'implementation/readers.md'), false);
    assert.deepEqual(ledger.readEntry('readers', root), recordBefore, 'the approval record is unchanged');
  });

  it('C16 a reason of only invisible or control characters is refused', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    const before = fs.readFileSync(planFile, 'utf8');

    // The last one is a Hangul filler (U+3164): a letter by category, drawn as blank (Default_Ignorable_Code_Point).
    for (const reason of [`${ZWSP}${WORD_JOINER}`, '\x01\x02', '\u3164\u3164']) {
      const { json } = sendBack(root, 'todo/readers.md', reason);
      assert.equal(json.reason, 'no-reason', `refused (the command printed: ${String(json.text).slice(0, 80)})`);
      assert.match(json.text, /reason is required/);
    }

    assert.equal(fs.readFileSync(planFile, 'utf8'), before, 'the plan is unchanged');
    assert.equal(exists(root, 'implementation/readers.md'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('D — the owner\'s hold', () => {
  it('D1 scenario: the plan waits in technical planning', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    assert.equal(sendBack(root, 'todo/readers.md', 'why').json.ok, true, 'fixture: the plan was sent back');

    continueOnce(root);

    assert.equal(exists(root, 'implementation/readers.md'), true);
    assert.equal(exists(root, 'todo/readers.md'), false, 'the build queue holds no copy');
  });

  it('D2 scenario: a sent-back plan with fresh questions waits until it is changed', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    assert.equal(sendBack(root, 'todo/readers.md', 'why').json.ok, true, 'fixture: the plan was sent back');
    writeQuestions(root, 'implementation/readers.md', []);

    continueOnce(root);

    assert.equal(exists(root, 'implementation/readers.md'), true);
    assert.equal(exists(root, 'todo/readers.md'), false);
    const d = streamingGate.pendingGateDecisions(root).find((x) => x.ref === 'implementation/readers.md');
    assert.ok(d, 'the plan is a pending decision');
    assert.equal(d.sentBackUnrevised, true);
    assert.equal(d.enough, true);
    assert.equal(d.passesValidation, true);

    const stream = route(['stream'], root);
    assert.ok(stream.text.includes(HELD_LINE), stream.text);
    assert.deepEqual(labelsOf(stream), ['Open the plan', 'Yes — build it', 'Skip for now']);
    assert.equal(optionOf(stream, 'Open the plan').description, HELD_OPEN);
    assert.equal(optionOf(stream, 'Yes — build it').description, HELD_APPROVE);
    assert.equal('ready' in stream, false, 'no ready field');
    assert.equal(stream.text.includes('Ready, moving on by itself'), false);
    assert.equal(recommendedCount(stream), 1);

    const plan = route(['plan', 'implementation/readers.md'], root);
    assert.deepEqual(labelsOf(plan).slice(0, 2), ['Check validation', 'Yes — build it']);
    assert.equal(optionOf(plan, 'Check validation').description, HELD_CHECK);
    assert.equal(optionOf(plan, 'Yes — build it').description, HELD_APPROVE);
    assert.equal(recommendedCount(plan), 1);
  });

  it('D3 scenario: a change to its files: list alone lets it move', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    assert.equal(sendBack(root, 'todo/readers.md', 'why').json.ok, true, 'fixture: the plan was sent back');
    writeQuestions(root, 'implementation/readers.md', []);
    continueOnce(root);
    assert.equal(exists(root, 'implementation/readers.md'), true, 'fixture: held first');

    const before = read(root, 'implementation/readers.md');
    const afterFrontmatter = (t) => t.split('\n---\n').slice(1).join('\n---\n');
    const edited = before.replace('\n  - src/readers.js\n', '\n  - src/readers.js\n  - src/feed.js\n');
    assert.notEqual(edited, before, 'fixture: the files: list changed');
    assert.equal(afterFrontmatter(edited), afterFrontmatter(before), 'fixture: nothing after the frontmatter changed');
    writePlan(root, 'implementation/readers.md', edited);
    writeQuestions(root, 'implementation/readers.md', []);
    continueOnce(root);

    assert.equal(exists(root, 'todo/readers.md'), true, 'the plan crossed into the build queue');
    assert.equal(ledger.readEntry('readers', root).advanced_by, 'sufficiency');
  });

  it('D4 scenario: your approval still moves it', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    assert.equal(sendBack(root, 'todo/readers.md', 'why').json.ok, true, 'fixture: the plan was sent back');

    route(['stream', 'approve', 'implementation/readers.md'], root);

    assert.equal(exists(root, 'todo/readers.md'), true);
    assert.equal(exists(root, 'implementation/readers.md'), false);
    assert.equal(ledger.readEntry('readers', root).approved_by, 'human');
  });

  it('D5 scenario: plans sent back before this change are not held (pin)', () => {
    const root = makeSandbox();
    writePlan(root, 'implementation/old.md', sentBackBody('An older sent-back plan', ['an old reason']));
    writeQuestions(root, 'implementation/old.md', []);

    continueOnce(root);

    assert.equal(exists(root, 'todo/old.md'), true, 'it crossed into the build queue as before');
    assert.equal(exists(root, 'implementation/old.md'), false);
  });

  it('D6 a held plan whose questions are being checked is never promised to move on by itself', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    assert.equal(sendBack(root, 'todo/readers.md', 'why').json.ok, true, 'fixture: the plan was sent back');
    writeQuestions(root, 'implementation/readers.md', [], { classified: false });
    route(['stream', 'check', 'implementation/readers.md'], root);
    assert.ok(tasks(root).some((t) => t.kind === 'classify' && t.plan === 'implementation/readers.md' && t.status === 'queued'),
      'fixture: the check is queued');

    for (const text of [route(['stream'], root).text, route(['plan', 'implementation/readers.md'], root).text]) {
      assert.ok(text.includes('it still waits for your approval'), text);
      assert.ok(text.includes(HELD_LINE), text);
      assert.equal(text.includes('it moves on by itself once they are'), false, text);
    }
  });

  it('D7 the hold mark: written once, released by any edit, kept across line endings (unit)', () => {
    const root = makeSandbox();
    const planFile = queueForBuild(root, 'readers', TITLE);
    actions.rejectPlan(planFile, 'why', root, {}, { holdUntilRevised: true });
    const moved = planPathOf(root, 'implementation/readers.md');
    const text = fs.readFileSync(moved, 'utf8');

    assert.equal((text.match(/^sent_back_digest: "[0-9a-f]{64}"$/gm) || []).length, 1);
    assert.equal(actions.isSentBackUnrevised(text), true);
    assert.equal(actions.isSentBackUnrevised(text.replace(/\n/g, '\r\n')), true, 'line endings are not a change');
    assert.equal(actions.isSentBackUnrevised(`${text}x`), false, 'one character in the body');
    assert.equal(actions.isSentBackUnrevised(text.replace('\nfiles:', '\nzzz: 1\nfiles:')), false, 'one line in the frontmatter');
    assert.equal(actions.isSentBackUnrevised(undefined), false);

    fs.renameSync(moved, planFile);
    actions.rejectPlan(planFile, 'a second reason', root, {}, { holdUntilRevised: true });
    const again = fs.readFileSync(moved, 'utf8');
    assert.equal((again.match(/^sent_back_digest:/gm) || []).length, 1, 'the second send-back replaced the mark');
    assert.equal(actions.isSentBackUnrevised(again), true);
  });

  it('D8 rejectPlan without the option writes no mark (pin of the terminal review tab\'s send-back)', () => {
    const root = makeSandbox();
    const p = writePlan(root, 'review/r.md', `---\ntitle: Rev plan\n---\n\n# Rev plan\n\nSome prose.\n`);

    const target = actions.rejectPlan(p, 'why', root);

    assert.equal(fs.existsSync(target), true);
    assert.equal(/sent_back_digest/.test(fs.readFileSync(target, 'utf8')), false);
  });

  it('D9 the validation screen of a held plan leads with Back, not with approve', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    assert.equal(sendBack(root, 'todo/readers.md', 'why').json.ok, true, 'fixture: the plan was sent back');

    const held = route(['plan', 'implementation/readers.md'], root);
    const screen = route(String(held.actions['Check validation']).split(' '), root);

    assert.deepEqual(labelsOf(screen), ['Back', 'Confirm approve']);
    assert.ok(optionOf(screen, 'Back').description.startsWith('Recommended'), optionOf(screen, 'Back').description);
    assert.equal(optionOf(screen, 'Back').description,
      'Recommended — it was sent back to be re-planned and has not been changed since; go back and change it first.');
    assert.equal(optionOf(screen, 'Confirm approve').description, HELD_APPROVE);
    assert.equal(recommendedCount(screen), 1);
    assert.equal(screen.actions['Confirm approve'], 'claude:approve implementation/readers.md');

    // Green before and after: a plan in technical planning that was not sent back keeps today's order and words.
    writePlan(root, 'implementation/plain.md', implBody('A plain technical plan'));
    const plain = route(['validate', 'implementation/plain.md'], root);
    assert.deepEqual(labelsOf(plain), ['Confirm approve', 'Back']);
    assert.equal(optionOf(plain, 'Confirm approve').description, 'Approve now — move plan to todo');
    assert.equal(optionOf(plain, 'Back').description, 'Return to implementation list');
    assert.equal(plain.actions['Confirm approve'], 'claude:approve implementation/plain.md');
  });

  it('D9b a fault while reading the hold leaves the validation screen with its ordinary options (in process, one fault)', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    assert.equal(sendBack(root, 'todo/readers.md', 'why').json.ok, true, 'fixture: the plan was sent back');
    const original = actions.isSentBackUnrevised;
    let reached = false;
    actions.isSentBackUnrevised = () => { reached = true; throw new Error('simulated read fault'); };
    let screen;
    try {
      screen = route(['validate', 'implementation/readers.md'], root);
    } finally {
      actions.isSentBackUnrevised = original;
    }

    assert.equal(reached, true, 'the fault was reached');
    assert.deepEqual(labelsOf(screen), ['Confirm approve', 'Back'], 'not held when the hold cannot be read');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('E — named by its title', () => {
  /** The send-back as the plan screen's action names it, run through the spawned entry. */
  function sendBackFromItsScreen(root, ref, reason) {
    const screen = route(['plan', ref], root);
    const words = String(screen.actions[WRONG_WAY] || '').split(' ').filter(Boolean);
    assert.ok(words.length === 3 && words[0] === 'claude:reject', `fixture: the screen offers the send-back (${JSON.stringify(screen.actions)})`);
    return runMenu(root, [...words, '--stdin'], `${reason}\n`).json;
  }

  function assertNamedBy(root, title) {
    const opening = runMenu(root, [], '').json;
    assert.equal(opening.ask.questions[0].question, `Shall I build “${title}”?`);
    assert.ok(opening.text.split('\n').some((l) => l.startsWith(`Topic: ${title}`)), 'the opening screen\'s Topic line');
    assert.doesNotMatch(opening.ask.questions[0].question, /REVISION/);
    const own = runMenu(root, ['plan', 'implementation/readers.md'], '').json;
    assert.ok(own.text.startsWith(`Topic: ${title}`), `the plan screen's Topic line (${own.text.slice(0, 60)})`);
    assert.doesNotMatch(topicLine(own.text), /REVISION/);
    assert.doesNotMatch(topicLine(opening.text), /REVISION/);
  }

  it('E1 scenario: sent back from its screen, it comes back under its title (spawned)', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);

    const res = sendBackFromItsScreen(root, 'todo/readers.md', 'the approach is wrong');

    assert.equal(res.ok, true, `sent back (the command printed: ${String(res.text).slice(0, 80)})`);
    assertNamedBy(root, TITLE);
  });

  it('E2 scenario: a second send-back keeps the title', () => {
    const root = makeSandbox();
    queueForBuild(root, 'readers', TITLE);
    assert.equal(sendBackFromItsScreen(root, 'todo/readers.md', 'the first reason').ok, true);
    fs.appendFileSync(planPathOf(root, 'implementation/readers.md'), '\nRevised against the first reason.\n');
    writeQuestions(root, 'implementation/readers.md', []);
    continueOnce(root);
    assert.equal(exists(root, 'todo/readers.md'), true, 'fixture: it crossed into the build queue again');
    const id = addBuild(root, 'readers');

    const second = sendBackFromItsScreen(root, 'todo/readers.md', 'the second reason');

    assert.equal(second.ok, true, `sent back again (the command printed: ${String(second.text).slice(0, 80)})`);
    assert.ok(second.text.includes('Its queued build was cancelled.'));
    assert.equal(taskOf(root, id).status, 'cancelled');
    assertNamedBy(root, TITLE);
    const text = read(root, 'implementation/readers.md');
    assert.ok(text.indexOf('# REVISION 2') !== -1 && text.indexOf('# REVISION 2') < text.indexOf('# REVISION 1'));
    assert.ok(text.includes('the first reason') && text.includes('the second reason'));
  });

  it('E3 scenario: plans sent back before this change show their titles', () => {
    const root = makeSandbox();
    const title = 'Finished plans are not sent back after an update';
    writePlan(root, 'functional/finished.md', sentBackBody(title, ['one', 'two']).replace(/files:[\s\S]*?(?=revision:)/, ''));
    const before = read(root, 'functional/finished.md');

    const stream = route(['stream'], root);
    const plan = route(['plan', 'functional/finished.md'], root);

    assert.ok(stream.text.split('\n').some((l) => l.startsWith(`Topic: ${title}`)), topicLine(stream.text));
    assert.ok(plan.text.startsWith(`Topic: ${title}`), topicLine(plan.text));
    assert.doesNotMatch(topicLine(stream.text), /REVISION/);
    assert.doesNotMatch(topicLine(plan.text), /REVISION/);
    assert.equal(read(root, 'functional/finished.md'), before, 'the plan file is byte-identical');
  });

  it('E4 scenario: a real title that begins with Revision still shows', () => {
    const root = makeSandbox();
    writePlan(root, 'implementation/readers.md', sentBackBody('Revision history is kept for every plan', ['why']));

    const plan = route(['plan', 'implementation/readers.md'], root);

    assert.ok(plan.text.startsWith('Topic: Revision history is kept for every plan'), topicLine(plan.text));
  });

  it('E5 scenario: a sent-back plan with no title heading of its own', () => {
    const root = makeSandbox();
    writePlan(root, 'implementation/readers.md', sentBackBody(TITLE, ['why'], { heading: false }));
    for (const screen of [route(['stream'], root), route(['plan', 'implementation/readers.md'], root)]) {
      assert.ok(screen.text.split('\n').some((l) => l.startsWith(`Topic: ${TITLE}`)), topicLine(screen.text));
    }

    writePlan(root, 'implementation/readers.md', sentBackBody(TITLE, ['why'], { heading: false, frontTitle: false }));
    for (const screen of [route(['stream'], root), route(['plan', 'implementation/readers.md'], root)]) {
      assert.ok(screen.text.split('\n').some((l) => l.startsWith('Topic: readers')), topicLine(screen.text));
      assert.doesNotMatch(topicLine(screen.text), /REVISION/);
    }
  });

  it('E6 the next-build line names a sent-back plan by its title', () => {
    const root = makeSandbox();
    const body = sentBackBody(TITLE, ['why']);
    const p = writePlan(root, 'todo/readers.md', body);
    ledger.writeEntry('readers', { content: fs.readFileSync(p, 'utf8'), stage_from: 'implementation', stage_to: 'todo' }, root);

    const directive = loopBDirective(root);

    assert.ok(directive.includes(`Next up to build: ${TITLE}.`), directive);
  });

  it('E7 the while-you-were-away line names it by its title', () => {
    const root = makeSandbox();
    writePlan(root, 'done/readers.md', sentBackBody(TITLE, ['why']));

    assert.equal(recentIncrements(root)[0].title, TITLE);
  });

  it('E8 the sweep screen names it by its title', () => {
    const root = makeSandbox();
    const env = {};
    for (const [k, v] of Object.entries(process.env)) if (!/^GIT_/i.test(k)) env[k] = v;
    env.GIT_AUTHOR_DATE = '2020-01-01T00:00:00Z';
    env.GIT_COMMITTER_DATE = '2020-01-01T00:00:00Z';
    const git = (args) => {
      const r = spawnSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@test.invalid', '-c', 'commit.gpgsign=false',
        '-c', 'maintenance.auto=false', '-c', 'gc.auto=0', ...args], { cwd: root, encoding: 'utf8', shell: false, env });
      assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
    };
    git(['init', '-q', '-b', 'main']);
    fs.writeFileSync(path.join(root, 'README.md'), 'readme\n');
    git(['add', 'README.md']);
    git(['commit', '-q', '-m', 'init']);
    writePlan(root, 'in-progress/readers.md', sentBackBody(TITLE, ['why']));
    const startedIso = new Date(Date.now() - 300 * 60000).toISOString();
    const reg = taskRegistry.emptyRegistry();
    reg.tasks = [{
      id: 't1', kind: 'implement', label: '', plan: 'readers', status: 'orphaned', agentTaskId: null,
      touches: ['src/readers.js'], gitOp: false, blockedBy: [], result: { ok: false, orphanReason: 'presumed-dead' },
      ts: { created: startedIso, started: startedIso, cancelRequested: null, done: startedIso },
    }];
    reg.seq = 1;
    taskRegistry.save(root, reg);

    const text = route(['menu', 'task', 'sweep'], root).text;

    assert.ok(text.includes(`• ${TITLE} —`), text);
    assert.doesNotMatch(text, /REVISION/);
  });
});
