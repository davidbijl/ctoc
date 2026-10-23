'use strict';

/**
 * The menu prints the exact answer command for every option of every streamed question.
 *
 * `stream answers <stage>/<file>.md` is a read-only view for the session that records the
 * owner's answers through the menu: every open question of one plan, its prompt, each option's
 * label (the recommended one first and marked), and under each label the very command the
 * question screens offer for it, plus the question's hold line. Before it, the line for a plan's
 * second open question was in no menu output, and the coordinator wrote a scratch script to
 * compute the digests.
 *
 * Every case runs in a temporary project with real plan files, a real question store and a real
 * answers log. Cases 1 and 6 drive the real entry point (`node src/commands/start.js`) and read
 * its raw output; the others call the menu's router the way tests/streaming-human-loop-e2e.test.js
 * does. Revisions of a plan are made with `fs.utimesSync` to fixed past times, never with a
 * sleep, and no assertion reads a time or a duration.
 */

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { execFileSync } = require('node:child_process');

const precompute = require('../src/lib/streaming-precompute.js');
const taskRegistry = require('../src/lib/task-registry.js');
const { route } = require('../src/lib/menu-screens.js');

const MENU_ENTRY = path.join(__dirname, '..', 'src', 'commands', 'start.js');
const START_MD = path.join(__dirname, '..', 'src', 'commands', 'start.md');
const STAGES = ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done'];
const CLASSIFIED = Object.freeze({ by: 'gate-critic', at: 1786000000000 });
const NOW_S = Math.floor(Date.now() / 1000);
const OLDER_REVISION_S = NOW_S - 2 * 86400;
const NEWER_REVISION_S = NOW_S - 1 * 86400;

const EXAMPLE = Object.freeze([
  {
    id: 'q10-store', prompt: 'Which store backs sessions?', critical: true, important: false, topic: 'technology-stack',
    options: [{ key: '1', label: 'Postgres', recommended: true }, { key: '2', label: 'SQLite' }],
  },
  {
    id: 'q11-expiry', prompt: 'How long is a magic link valid?', critical: false, important: true, topic: 'security-posture',
    options: [{ key: '1', label: '15 minutes', recommended: true }, { key: '2', label: '1 hour' }],
  },
]);
const COPY_QUESTION = Object.freeze({
  id: 'q13-copy', prompt: 'What does the sign-in button say?', critical: false, important: false, topic: 'detail',
  options: [{ key: '1', label: 'Sign in', recommended: true }, { key: '2', label: 'Continue' }],
});

const sandboxes = [];
let counter = 0;

afterEach(() => {
  while (sandboxes.length) fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
});

function makeSandbox() {
  const dir = path.join(os.tmpdir(), `ctoc-answer-lines-${process.pid}-${Date.now()}-${counter++}`);
  for (const stage of STAGES) fs.mkdirSync(path.join(dir, 'plans', stage), { recursive: true });
  fs.mkdirSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
  sandboxes.push(dir);
  return fs.realpathSync(dir);
}

const planFilePath = (root, ref) => path.join(root, 'plans', ...ref.split('/'));
const setRevision = (root, ref, seconds) => fs.utimesSync(planFilePath(root, ref), seconds, seconds);
const stampOf = (root, ref) => fs.statSync(planFilePath(root, ref)).mtimeMs;
const answersFile = (root) => path.join(root, '.ctoc', 'streaming', 'answers.jsonl');
const answersLog = (root) => (fs.existsSync(answersFile(root))
  ? fs.readFileSync(answersFile(root), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l))
  : []);

function functionalBody(title) {
  return `---\ntitle: ${title}\n---\n\n# ${title}\n\n## Problem Statement\nUsers forget passwords and churn at the login wall.\n\n`
    + '## Acceptance Criteria\n- [ ] a user receives a one-time link by email\n- [ ] the link signs them in\n\n## Scope\nThe auth module.\n';
}

/** A functional plan with its (gate-critic classified) questions stored at the older revision. */
function examplePlan(root, questions = EXAMPLE, slug = 'magic-link', title = 'Passwordless magic-link sign-in') {
  const ref = `functional/${slug}.md`;
  fs.writeFileSync(planFilePath(root, ref), functionalBody(title));
  setRevision(root, ref, OLDER_REVISION_S);
  const stored = precompute.writePlanQuestions(root, ref, questions, stampOf(root, ref), undefined, CLASSIFIED);
  assert.equal(stored.ok, true, `fixture: the questions were stored (${(stored.errors || []).join('; ')})`);
  return { ref, planPath: planFilePath(root, ref) };
}

/** The same plan moved to the newer revision, its questions stored for that revision. */
function moveToNewerRevision(root, ref, questions) {
  setRevision(root, ref, NEWER_REVISION_S);
  const stored = precompute.writePlanQuestions(root, ref, questions, stampOf(root, ref), undefined, CLASSIFIED);
  assert.equal(stored.ok, true, `fixture: the questions were stored for the newer revision (${(stored.errors || []).join('; ')})`);
}

/** The line the menu must print, built from the store's own digest, independent of the code under test. */
function expectedLine(ref, q, key) {
  if (key === 'hold') return `stream answer ${ref} '${q.id}' 'hold'`;
  return `stream answer ${ref} '${q.id}' '${key}' '${precompute.questionDigest(q)}'`;
}

/** The words of a line as a POSIX shell reads it: single quotes are literal spans; a bare backslash takes the next character. */
function shellWords(line) {
  const words = [];
  let cur = '';
  let inWord = false;
  let quoted = false;
  let escaped = false;
  for (const ch of String(line)) {
    if (quoted) {
      if (ch === "'") quoted = false; else cur += ch;
    } else if (escaped) {
      cur += ch;
      escaped = false;
    } else if (ch === "'") {
      quoted = true;
      inWord = true;
    } else if (ch === '\\') {
      escaped = true;
      inWord = true;
    } else if (/\s/.test(ch)) {
      if (inWord) words.push(cur);
      cur = '';
      inWord = false;
    } else {
      cur += ch;
      inWord = true;
    }
  }
  assert.equal(quoted, false, `unterminated quote in: ${line}`);
  if (inWord) words.push(cur);
  return words;
}

const answerLines = (text) => text.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('stream answer '));

/** The raw standard output of the real entry point, run in the sandbox with no shell. */
function menuRaw(root, ...args) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  return execFileSync(process.execPath, [MENU_ENTRY, ...args], { cwd: root, encoding: 'utf8', env });
}
const screenOf = (raw) => JSON.parse(raw.slice(raw.indexOf('{')));

const view = (root, ref) => route(['stream', 'answers', ref], root);

/** A menu-printed value: question-file text is one JSON-quoted value (decoded here), CTOC's own text is bare. */
function readValue(s) {
  return s.startsWith('"') ? { value: JSON.parse(s), quoted: true } : { value: s, quoted: false };
}

/**
 * The view's text read block by block, strictly: a block starts at `Question N of M · note`, holds
 * exactly one `Question: prompt` line, then pairs of an `Option: label` (or `Option (Recommended):
 * label`) line and one answer line, and ends at a blank line. Any other line inside a block fails
 * the read. Quoted values are decoded with JSON.parse and recorded as `quoted`.
 */
function parseView(text) {
  const blocks = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    const l = raw.trim();
    const head = /^Question (\d+) of (\d+) · (.*)$/.exec(l);
    if (head) {
      cur = { n: Number(head[1]), of: Number(head[2]), note: head[3], prompt: null, promptLine: null, options: [] };
      blocks.push(cur);
      continue;
    }
    if (cur === null) continue;
    if (l === '') { cur = null; continue; }
    const opt = /^Option( \(Recommended\))?: (.*)$/.exec(l);
    if (l.startsWith('Question: ')) {
      assert.equal(cur.prompt, null, `one prompt per block: ${l}`);
      cur.promptLine = l;
      cur.prompt = readValue(l.slice('Question: '.length)).value;
    } else if (opt) {
      const v = readValue(opt[2]);
      cur.options.push({ label: v.value, recommended: opt[1] !== undefined, quoted: v.quoted, line: null });
    } else if (l.startsWith('stream answer ')) {
      const last = cur.options[cur.options.length - 1];
      assert.ok(last && last.line === null, `an answer line sits directly under an Option line: ${l}`);
      last.line = l;
    } else {
      assert.fail(`unexpected line inside a question block: ${l}`);
    }
  }
  return blocks;
}

/** The first question block of the view for `ref`; fails loudly, with the screen, when the view shows none. */
function firstBlock(text) {
  const blocks = parseView(text);
  assert.ok(blocks.length > 0, `the view shows at least one question block:\n${text}`);
  return blocks[0];
}

/** Whitespace and control characters folded to one space, as the view folds question-file text. */
const folded = (s) => String(s).replace(/[\s\x00-\x1f\x7f-\x9f]+/g, ' ').trim();

/**
 * What one question's block must hold, in order: the recommended option first, CTOC's own Hold
 * last. Question-file labels are quoted values (folded); CTOC's Hold is bare.
 */
function expectedOptions(ref, q) {
  const ordered = [...q.options.filter((o) => o.recommended === true), ...q.options.filter((o) => o.recommended !== true)];
  return [
    ...ordered.map((o) => ({ label: folded(o.label), recommended: o.recommended === true, quoted: true, line: expectedLine(ref, q, o.key) })),
    { label: 'Hold this plan', recommended: false, quoted: false, line: expectedLine(ref, q, 'hold') },
  ];
}

/** Run a module-load fault: the resolved module throws on load while `fn` runs; restored in `finally`. */
function withLoadFault(modulePath, fn) {
  const resolvedTarget = require.resolve(modulePath);
  const origLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    let resolved = null;
    try { resolved = Module._resolveFilename(request, parent, isMain); } catch (err) { resolved = `unresolvable: ${err && err.code}`; }
    if (resolved === resolvedTarget) throw new Error(`SIMULATED ${path.basename(modulePath, '.js')} load failure`);
    return origLoad.apply(this, arguments);
  };
  try { return fn(); } finally { Module._load = origLoad; }
}

describe('the menu prints the exact answer command for every option of every streamed question', () => {
  it('case 1 — Every option of every open question gets its own line (real entry point)', () => {
    const root = makeSandbox();
    const { ref } = examplePlan(root);

    const raw = menuRaw(root, 'stream', 'answers', ref);
    const screen = screenOf(raw);

    assert.equal(answerLines(screen.text).length, 6, `the view shows six answer lines:\n${screen.text}`);
    const blocks = parseView(screen.text);
    assert.equal(blocks.length, 2);
    EXAMPLE.forEach((q, i) => {
      assert.equal(blocks[i].n, i + 1);
      assert.equal(blocks[i].of, 2);
      assert.equal(blocks[i].note, 'waits for the owner');
      assert.equal(blocks[i].prompt, q.prompt);
      assert.deepEqual(blocks[i].options, expectedOptions(ref, q));
    });

    // The raw output: each of the six lines stands on a physical line of its own, as one quoted
    // value, once, with no character of it escaped.
    const physical = raw.split('\n').map((l) => l.trim());
    for (const q of EXAMPLE) {
      for (const key of [...q.options.map((o) => o.key), 'hold']) {
        const line = expectedLine(ref, q, key);
        const entry = `${JSON.stringify(`${q.id} ${key}`)}: ${JSON.stringify(line)}`;
        const found = physical.filter((l) => l.replace(/,$/, '') === entry);
        assert.equal(found.length, 1, `exactly one physical line holds ${entry}`);
        assert.equal((found[0].match(/stream answer/g) || []).length, 1, 'and no other answer line is on it');
        assert.equal(JSON.stringify(line), `"${line}"`, 'and nothing of it is escaped');
        assert.equal(screen.actions[`${q.id} ${key}`], line);
      }
    }

    const startMd = fs.readFileSync(START_MD, 'utf8').split('\n');
    const row = startMd.find((l) => l.startsWith('| `stream answers {stage}/{file}.md` |'));
    assert.ok(row, 'the command reference lists `stream answers {stage}/{file}.md`');
    assert.match(row, /only for an answer the owner gave/);
  });

  it('case 2 — A question with three options gets three lines', () => {
    const root = makeSandbox();
    const three = [
      { ...EXAMPLE[0], options: [...EXAMPLE[0].options, { key: '3', label: 'MySQL' }] },
      EXAMPLE[1],
    ];
    const { ref } = examplePlan(root, three);

    const blocks = parseView(view(root, ref).text);

    assert.equal(blocks.length, 2);
    const store = blocks.find((b) => b.prompt === 'Which store backs sessions?');
    const expiry = blocks.find((b) => b.prompt === 'How long is a magic link valid?');
    assert.equal(store.options.length, 4, 'three options and the hold line');
    assert.deepEqual(store.options.map((o) => shellWords(o.line)[4]), ['1', '2', '3', 'hold']);
    assert.deepEqual(expiry.options.map((o) => shellWords(o.line)[4]), ['1', '2', 'hold']);
    assert.deepEqual(store.options, expectedOptions(ref, three[0]));

    // One command per option, whatever the label: a label that is a name Object.prototype
    // supplies still gets its own composed line (it printed "[object Object]" before).
    const odd = [EXAMPLE[0], { ...EXAMPLE[1], options: [EXAMPLE[1].options[0], { key: '2', label: '__proto__' }] }];
    const oddPlan = examplePlan(root, odd, 'proto-label');
    const oddBlocks = parseView(view(root, oddPlan.ref).text);
    assert.equal(oddBlocks.length, 2);
    assert.deepEqual(oddBlocks[1].options, expectedOptions(oddPlan.ref, odd[1]));
    assert.equal(oddBlocks[1].options[1].line, expectedLine(oddPlan.ref, odd[1], '2'));
  });

  it('case 3 — Answered questions drop out, and an answer to an older revision does not count', () => {
    const root = makeSandbox();
    const { ref } = examplePlan(root);
    const answeredOld = route(['stream', 'answer', ref, 'q11-expiry', '1', precompute.questionDigest(EXAMPLE[1])], root);
    assert.match(answeredOld.text, /Recorded your answer for magic-link\.md\./);
    moveToNewerRevision(root, ref, EXAMPLE);
    const answeredNew = route(['stream', 'answer', ref, 'q10-store', '1', precompute.questionDigest(EXAMPLE[0])], root);
    assert.match(answeredNew.text, /Recorded your answer for magic-link\.md\./);

    const screen = view(root, ref);

    assert.doesNotMatch(screen.text, /Which store backs sessions\?/);
    assert.doesNotMatch(screen.text, /'q10-store'/);
    const blocks = parseView(screen.text);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].prompt, 'How long is a magic link valid?');
    assert.deepEqual(blocks[0].options, expectedOptions(ref, EXAMPLE[1]));
  });

  it('case 4 — Opening the view moves nothing and records nothing', () => {
    const root = makeSandbox();
    const ref = 'functional/magic-link.md';
    fs.writeFileSync(planFilePath(root, ref), functionalBody('Passwordless magic-link sign-in'));
    setRevision(root, ref, OLDER_REVISION_S);
    const waiting = precompute.pendingQuestionsPath(root, ref);
    fs.mkdirSync(path.dirname(waiting), { recursive: true });
    fs.writeFileSync(waiting, JSON.stringify({ ref, questions: EXAMPLE, classification: CLASSIFIED }));
    const stageListing = () => Object.fromEntries(STAGES.map((s) => [s, fs.readdirSync(path.join(root, 'plans', s)).sort()]));
    const before = stageListing();

    const first = view(root, ref);
    const second = view(root, ref);

    for (const screen of [first, second]) {
      assert.equal(answerLines(screen.text).length, 6, screen.text);
      assert.deepEqual(parseView(screen.text).map((b) => b.prompt), EXAMPLE.map((q) => q.prompt));
    }
    assert.deepEqual(stageListing(), before, 'no plan moved');
    assert.equal(fs.existsSync(answersFile(root)), false, 'no answer was recorded');
    assert.deepEqual(taskRegistry.load(root).tasks, [], 'no task was recorded');
    const approvals = path.join(root, '.ctoc', 'approvals');
    assert.deepEqual(fs.existsSync(approvals) ? fs.readdirSync(approvals) : [], [], 'no approval was written');
    const planScreen = route(['plan', ref], root);
    assert.equal(planScreen.ask.questions[0].question, 'Which store backs sessions?');
  });

  it('case 5 — An invalid plan reference is refused', () => {
    const root = makeSandbox();
    // Stage names that Object.prototype supplies are not stages: refused like any unknown stage.
    const protoNames = ['constructor/x.md', '__proto__/x.md', 'toString/x.md'];
    for (const bad of ['nostage/x.md', 'functional/../../x.md', ...protoNames]) {
      const screen = view(root, bad);
      assert.match(screen.text, /Invalid plan reference/, bad);
      assert.equal(answerLines(screen.text).length, 0, bad);
      assert.doesNotMatch(screen.text, /stream answer/);
    }

    // The same refusal on the routes that record: no answer log and no comment log is made.
    const answered = route(['stream', 'answer', 'constructor/x.md', 'q10-store', '1', precompute.questionDigest(EXAMPLE[0])], root);
    assert.match(answered.text, /Ignored an answer for an invalid plan reference/);
    assert.equal(fs.existsSync(answersFile(root)), false, 'no answer was recorded for constructor/x.md');
    const commented = route(['stream', 'comment', 'constructor/x.md', 'hello'], root);
    assert.match(commented.text, /Ignored a comment for an invalid reference/);
    assert.equal(fs.existsSync(path.join(root, '.ctoc', 'streaming', 'comments.jsonl')), false, 'no comment was recorded for constructor/x.md');

    // A plan outside the three decision stages: one true sentence, no line the answer route would refuse.
    fs.writeFileSync(planFilePath(root, 'todo/x.md'), functionalBody('Elsewhere'));
    setRevision(root, 'todo/x.md', OLDER_REVISION_S);
    precompute.writePlanQuestions(root, 'todo/x.md', EXAMPLE, stampOf(root, 'todo/x.md'), undefined, CLASSIFIED);
    const elsewhere = view(root, 'todo/x.md');
    assert.match(elsewhere.text, /records answers only for a plan in plans\/functional, plans\/implementation or plans\/review/);
    assert.doesNotMatch(elsewhere.text, /stream answer/);

    const nothing = view(root, 'functional/nothing.md');
    assert.match(nothing.text, /There is no plan file at this reference/);
    assert.doesNotMatch(nothing.text, /stream answer/);
  });

  it('case 6 — A printed line records exactly that answer (real entry point)', () => {
    const root = makeSandbox();
    const { ref } = examplePlan(root);
    const printed = screenOf(menuRaw(root, 'stream', 'answers', ref));
    const sqlite = firstBlock(printed.text).options.find((o) => o.label === 'SQLite');
    assert.ok(sqlite && sqlite.line, 'the view prints a line under SQLite');

    const recorded = screenOf(menuRaw(root, ...shellWords(sqlite.line)));

    assert.match(recorded.text, /Recorded your answer for magic-link\.md\./);
    const entries = answersLog(root).filter((e) => e.ref === ref);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].questionId, 'q10-store');
    assert.equal(entries[0].optionKey, '2');
    assert.equal(entries[0].questionDigest, precompute.questionDigest(EXAMPLE[0]));
    const again = screenOf(menuRaw(root, 'stream', 'answers', ref));
    assert.doesNotMatch(again.text, /Which store backs sessions\?/);
    assert.match(again.text, /How long is a magic link valid\?/);
  });

  it('case 7 — A view line is the same command as clicking the option', () => {
    const root = makeSandbox();
    const { ref } = examplePlan(root);
    const planScreen = route(['plan', ref], root);
    assert.equal(planScreen.ask.questions[0].question, 'Which store backs sessions?');

    const block = firstBlock(view(root, ref).text);

    assert.equal(block.prompt, 'Which store backs sessions?');
    for (const label of ['Postgres', 'SQLite', 'Hold this plan']) {
      const o = block.options.find((x) => x.label === label);
      assert.ok(o, label);
      assert.equal(o.line, planScreen.actions[label], `${label}: character for character`);
    }
  });

  it('case 8 — A line for a question rewritten since it was printed records nothing', () => {
    const root = makeSandbox();
    const { ref } = examplePlan(root);
    const oldPostgres = firstBlock(view(root, ref).text).options.find((o) => o.label === 'Postgres' && o.recommended).line;
    const rewritten = [{ ...EXAMPLE[0], prompt: 'Which store backs user sessions?' }, EXAMPLE[1]];
    moveToNewerRevision(root, ref, rewritten);

    const result = route(shellWords(oldPostgres), root);

    assert.ok(result.text.includes('Nothing was recorded for magic-link.md: this answer does not match the question as it stands now, so it cannot be checked. The question will be asked again.'), result.text);
    assert.equal(fs.existsSync(answersFile(root)), false, 'no answer was recorded');
    const now = firstBlock(view(root, ref).text);
    assert.equal(now.prompt, 'Which store backs user sessions?');
    const newPostgres = now.options.find((o) => o.label === 'Postgres' && o.recommended).line;
    assert.notEqual(shellWords(newPostgres)[5], shellWords(oldPostgres)[5], 'the digest differs from the old one');
    assert.equal(newPostgres, expectedLine(ref, rewritten[0], '1'));
  });

  it('case 9 — A line for a plan that has moved on records nothing', () => {
    const root = makeSandbox();
    const { ref, planPath } = examplePlan(root);
    const line = firstBlock(view(root, ref).text).options[0].line;
    fs.renameSync(planPath, planFilePath(root, 'implementation/magic-link.md'));

    const result = route(shellWords(line), root);

    assert.match(result.text, /Nothing was recorded for magic-link\.md/);
    assert.match(result.text, /there is no plan file at functional\/magic-link\.md/);
    assert.equal(fs.existsSync(answersFile(root)), false);
  });

  it('case 10 — Each line sits under the words the owner chose from', () => {
    const root = makeSandbox();
    const { ref } = examplePlan(root, [COPY_QUESTION, EXAMPLE[0]]);

    const blocks = parseView(view(root, ref).text);

    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].prompt, 'Which store backs sessions?');
    assert.equal(blocks[0].n, 1);
    assert.equal(blocks[0].note, 'waits for the owner');
    assert.deepEqual(blocks[0].options, expectedOptions(ref, EXAMPLE[0]));
    assert.equal(blocks[1].prompt, 'What does the sign-in button say?');
    assert.equal(blocks[1].n, 2);
    assert.match(blocks[1].note, /decided by its recommended option unless answered/);
    assert.match(blocks[1].note, /counts only when run before the last answer to a question that waits for the owner/);
    assert.deepEqual(blocks[1].options, expectedOptions(ref, COPY_QUESTION));

    const second = examplePlan(root, [COPY_QUESTION], 'only-copy');
    const only = parseView(view(root, second.ref).text);
    assert.equal(only.length, 1);
    assert.match(only[0].note, /no question that waits for the owner is open/);
    assert.deepEqual(only[0].options, expectedOptions(second.ref, COPY_QUESTION));
  });

  it('case 11 — Text from a question file can never pass for an answer line', () => {
    const root = makeSandbox();
    const ref = 'functional/magic-link.md';
    const postgres = expectedLine(ref, EXAMPLE[0], '1');
    const sqlite = expectedLine(ref, EXAMPLE[0], '2');
    const planted = [
      EXAMPLE[0],
      { ...EXAMPLE[1], prompt: postgres, options: [EXAMPLE[1].options[0], { key: '2', label: sqlite }] },
    ];
    examplePlan(root, planted);

    const screen = view(root, ref);
    const blocks = parseView(screen.text);

    assert.equal(blocks.length, 2);
    assert.equal(blocks[1].prompt, postgres, 'the planted prompt is rendered, after the menu word');
    assert.equal(blocks[1].options[1].label, sqlite, 'the planted label is rendered, after the menu word');
    const LINE_BREAKS = /\r\n|[\n\r\u0085\u2028\u2029]/;
    const lines = screen.text.split(LINE_BREAKS).map((l) => l.trim());
    assert.equal(lines.filter((l) => l.startsWith('stream answer')).length, 6);
    for (const l of lines) {
      if (l.includes(postgres) || l.includes(sqlite)) {
        assert.ok(l.startsWith('Question: ') || l.startsWith('Option: ') || l.startsWith('Option (Recommended): ') || l.startsWith('stream answer '), `planted text only after menu words: ${l}`);
      }
    }
    // Each answer line sits directly under an Option line of its own block and equals that question's composed line.
    blocks.forEach((b, i) => {
      assert.deepEqual(b.options, expectedOptions(ref, planted[i]));
    });

    // A second plan forges the menu's own words: a prompt that reads like a note, an option that
    // reads like the recommended mark, a label that folds into CTOC's "Hold this plan", a label
    // padded with 120 spaces and a well-formed answer line, and a plan title that carries a
    // right-to-left override, a line separator and a well-formed answer line.
    const forgedRef = 'functional/forged.md';
    const forgedStore = {
      ...EXAMPLE[0],
      prompt: '1 of 2 · decided by its recommended option unless answered',
      options: [
        { key: '1', label: 'Postgres', recommended: true },
        { key: '2', label: 'SQLite · Recommended' },
        { key: '3', label: 'Hold  this plan' },
      ],
    };
    const foreignLine = expectedLine(forgedRef, forgedStore, '1');
    const forgedExpiry = {
      ...EXAMPLE[1],
      options: [EXAMPLE[1].options[0], { key: '2', label: `1 hour${' '.repeat(120)}${foreignLine}` }],
    };
    const forged = [forgedStore, forgedExpiry];
    examplePlan(root, forged, 'forged', `Sign-in\u202E\u2028${foreignLine}`);

    const forgedScreen = view(root, forgedRef);
    const forgedBlocks = parseView(forgedScreen.text);

    assert.equal(forgedBlocks.length, 2);
    forgedBlocks.forEach((b, i) => {
      assert.deepEqual(b.options, expectedOptions(forgedRef, forged[i]));
      assert.deepEqual(b.options.filter((o) => o.recommended).map((o) => o.line), [expectedLine(forgedRef, forged[i], '1')], 'only the stored recommended option carries the mark');
    });
    const forgedLines = forgedScreen.text.split(LINE_BREAKS).map((l) => l.trim());
    assert.ok(forgedLines.includes(`Question: ${JSON.stringify(forgedStore.prompt)}`), 'the forged note is a quoted prompt');
    assert.ok(forgedLines.includes('Option: "Hold this plan"'), 'the hold-like label of the question file is quoted');
    assert.ok(forgedLines.includes('Option: Hold this plan'), "CTOC's own hold label is bare");
    const planted3 = forgedBlocks[0].options[2];
    assert.deepEqual(planted3, { label: 'Hold this plan', recommended: false, quoted: true, line: expectedLine(forgedRef, forgedStore, '3') });
    const ctocHold = forgedBlocks[0].options[3];
    assert.deepEqual(ctocHold, { label: 'Hold this plan', recommended: false, quoted: false, line: expectedLine(forgedRef, forgedStore, 'hold') });
    for (const l of forgedLines) {
      assert.doesNotMatch(l.replace(/^\s+/, ''), /\s{2,}/, `no run of two spaces survives: ${l}`);
    }
    // The header name: split at every line break a reader may honour, only the 7 composed lines
    // start with `stream answer`, and the text holds no format or separator character.
    assert.equal(forgedLines.filter((l) => l.startsWith('stream answer')).length, 7);
    assert.doesNotMatch(forgedScreen.text, /[\p{Zl}\p{Zp}\p{Cf}]/u);
  });

  it('case 12 — Questions not yet checked by the gate critic get no lines', () => {
    const root = makeSandbox();
    const cases = [];

    const none = 'functional/no-questions.md';
    fs.writeFileSync(planFilePath(root, none), functionalBody('No questions'));
    cases.push([none, /No questions have been generated for this plan yet/]);

    const authors = 'functional/authors.md';
    fs.writeFileSync(planFilePath(root, authors), functionalBody('Authors'));
    setRevision(root, authors, OLDER_REVISION_S);
    assert.equal(precompute.writePlanQuestions(root, authors, EXAMPLE, stampOf(root, authors)).ok, true);
    cases.push([authors, /The gate critic has not yet checked the questions its author wrote/]);

    const stale = examplePlan(root, EXAMPLE, 'stale').ref;
    setRevision(root, stale, NEWER_REVISION_S);
    cases.push([stale, /The plan changed after its questions were worked out/]);

    const broken = examplePlan(root, EXAMPLE, 'broken').ref;
    fs.writeFileSync(precompute.questionsPath(root, broken), '{ this is not json');
    cases.push([broken, /The stored questions of this plan are unreadable/]);

    const empty = examplePlan(root, [], 'empty').ref;
    cases.push([empty, /No question of this plan is open/]);

    for (const [ref, sentence] of cases) {
      const screen = view(root, ref);
      assert.match(screen.text, sentence, ref);
      assert.doesNotMatch(screen.text, /stream answer/, ref);
      assert.deepEqual(Object.keys(screen.actions), ['◀ Back'], ref);
    }
  });

  it('case 13 — A held plan gets only keep and release lines', () => {
    const root = makeSandbox();
    const { ref } = examplePlan(root);
    const held = route(['stream', 'answer', ref, 'q10-store', 'hold'], root);
    assert.match(held.text, /You are holding magic-link\.md/);

    const screen = view(root, ref);
    const blocks = parseView(screen.text);

    assert.equal(blocks.length, 1);
    assert.match(blocks[0].note, /^the owner holds this plan/);
    assert.equal(blocks[0].n, 1);
    assert.equal(blocks[0].of, 1);
    assert.equal(blocks[0].prompt, precompute.HOLD.prompt);
    const keep = `stream answer ${ref} 'ctoc-hold' 'hold'`;
    const release = `stream answer ${ref} 'ctoc-hold' 'release' '${precompute.HOLD.digest}'`;
    assert.deepEqual(blocks[0].options, [
      { label: 'Keep holding this plan', recommended: false, quoted: false, line: keep },
      { label: 'Release the hold', recommended: false, quoted: false, line: release },
    ]);
    assert.doesNotMatch(screen.text, /q10-store|q11-expiry/);
    const planScreen = route(['plan', ref], root);
    assert.equal(planScreen.actions['Keep holding this plan'], keep);
    assert.equal(planScreen.actions['Release the hold'], release);

    // A plan with no question file, held through CTOC's own question, gets the same two lines.
    const bare = 'functional/bare.md';
    fs.writeFileSync(planFilePath(root, bare), functionalBody('Bare'));
    const bareHeld = route(['stream', 'answer', bare, 'ctoc-hold', 'hold'], root);
    assert.match(bareHeld.text, /You are holding bare\.md/);
    const bareBlocks = parseView(view(root, bare).text);
    assert.equal(bareBlocks.length, 1);
    assert.deepEqual(bareBlocks[0].options.map((o) => o.line), [
      `stream answer ${bare} 'ctoc-hold' 'hold'`,
      `stream answer ${bare} 'ctoc-hold' 'release' '${precompute.HOLD.digest}'`,
    ]);
  });

  it("case 14 — The owner's question screens stay as they are (regression pin)", () => {
    const root = makeSandbox();
    const { ref } = examplePlan(root);
    const expectedActions = {
      Postgres: expectedLine(ref, EXAMPLE[0], '1'),
      SQLite: expectedLine(ref, EXAMPLE[0], '2'),
      'Hold this plan': expectedLine(ref, EXAMPLE[0], 'hold'),
    };

    const stream = route(['stream'], root);
    const plan = route(['plan', ref], root);

    for (const screen of [stream, plan]) {
      for (const l of screen.text.split('\n')) assert.doesNotMatch(l, /^\s*stream answer/);
      assert.equal(screen.ask.questions[0].question, 'Which store backs sessions?');
      const labels = screen.ask.questions[0].options.map((o) => o.label);
      assert.deepEqual(labels.slice(0, 3), ['Postgres', 'SQLite', 'Hold this plan']);
      for (const [label, line] of Object.entries(expectedActions)) assert.equal(screen.actions[label], line, label);
    }
    assert.deepEqual(stream.ask.questions[0].options.map((o) => o.label), ['Postgres', 'SQLite', 'Hold this plan', 'Skip for now']);
  });

  it('case 15 — A waiting folder that cannot be taken in is said, and the stored questions are still listed', () => {
    const root = makeSandbox();
    const { ref } = examplePlan(root);

    const screen = withLoadFault('../src/lib/streaming-questions-sweeper.js', () => view(root, ref));

    assert.match(screen.text, /New questions could not be taken in \(SIMULATED streaming-questions-sweeper load failure\)\./);
    assert.equal(answerLines(screen.text).length, 6);
  });

  it('case 16 — A question store that cannot be loaded is said, with no line', () => {
    const root = makeSandbox();
    const { ref } = examplePlan(root);

    const screen = withLoadFault('../src/lib/streaming-precompute.js', () => view(root, ref));

    assert.match(screen.text, /The questions of this plan could not be read/);
    assert.doesNotMatch(screen.text, /stream answer/);
  });
});
