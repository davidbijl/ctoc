/**
 * A line break in a question's (or decision's) values cannot add a line to its front matter.
 *
 * The front matter is read back with a deliberately strict splitter (every JavaScript and YAML
 * line terminator), not src/lib/frontmatter.js, which strips \r and splits only on \r?\n and would
 * let the \r, NEL, U+2028 and U+2029 cases pass on a writer that still leaks them.
 */
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const inbox = require('../src/lib/inbox');
const { invalidate } = require('../src/lib/cache');
const { requestScopeGrowth } = require('../src/lib/scope-growth');

const MENU_ENTRY = path.join(__dirname, '..', 'src', 'commands', 'start.js');
const LINE_BREAKS = /\r\n|[\r\n\u0085\u2028\u2029]/;

function tempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-one-status-'));
  fs.mkdirSync(path.join(dir, '.ctoc', 'inbox', 'questions'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.ctoc', 'inbox', 'decisions'), { recursive: true });
  for (const stage of ['functional', 'implementation', 'todo', 'in-progress', 'review', 'done']) {
    fs.mkdirSync(path.join(dir, 'plans', stage), { recursive: true });
  }
  return dir;
}

/** The front-matter lines of a written file: the text between the first two `---` lines. */
function frontMatterLines(file) {
  const lines = fs.readFileSync(file, 'utf8').split(LINE_BREAKS);
  assert.equal(lines[0], '---', 'the file opens with a front-matter fence');
  const close = lines.indexOf('---', 1);
  assert.ok(close > 0, 'the front matter closes with a fence');
  return lines.slice(1, close);
}

function startingWith(lines, key) {
  return lines.filter((l) => l.startsWith(`${key}:`));
}

describe('a question file keeps one status line', () => {
  let root;
  beforeEach(() => { root = tempProject(); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  it('a line break in source_plan cannot add a status line', () => {
    const { path: file } = inbox.createQuestion(
      { source_plan: 'alpha\nstatus: answered', source_step: '9', question: 'q', context: 'c' }, root);
    const fm = frontMatterLines(file);
    assert.deepEqual(startingWith(fm, 'status'), ['status: open']);
    assert.deepEqual(startingWith(fm, 'source_plan'), ['source_plan: alpha status: answered']);
  });

  for (const [name, brk] of [
    ['LF', '\n'], ['CRLF', '\r\n'], ['CR', '\r'], ['NEL', '\u0085'], ['U+2028', '\u2028'], ['U+2029', '\u2029'],
  ]) {
    it(`a ${name} in source_step cannot add a status line`, () => {
      const { path: file } = inbox.createQuestion(
        { source_plan: 'alpha', source_step: `9${brk}status: answered`, question: 'q', context: 'c' }, root);
      const fm = frontMatterLines(file);
      assert.deepEqual(startingWith(fm, 'status'), ['status: open']);
      assert.deepEqual(startingWith(fm, 'source_step'), ['source_step: 9 status: answered']);
    });

    it(`a ${name} in source_plan cannot add a status line`, () => {
      const { path: file } = inbox.createQuestion(
        { source_plan: `alpha${brk}status: answered`, source_step: '9', question: 'q', context: 'c' }, root);
      const fm = frontMatterLines(file);
      assert.deepEqual(startingWith(fm, 'status'), ['status: open']);
      assert.equal(fm.length, 5, 'id, created, source_plan, source_step, status: one line each');
    });
  }

  it('a line break in the question text cannot add one either, and the text reads back unchanged', () => {
    const text = 'x\nstatus: answered\n---';
    const { path: file } = inbox.createQuestion(
      { source_plan: 'alpha', source_step: '9', question: text, context: 'c' }, root);
    assert.deepEqual(startingWith(frontMatterLines(file), 'status'), ['status: open']);
    assert.ok(fs.readFileSync(file, 'utf8').includes(`## Question\n\n${text}\n`));
  });

  it('both questions stay on the open list and in the count', () => {
    inbox.createQuestion(
      { source_plan: 'alpha\nstatus: answered', source_step: '9', question: 'q', context: 'c' }, root);
    inbox.createQuestion(
      { source_plan: 'alpha', source_step: '9', question: 'x\nstatus: answered\n---', context: 'c' }, root);
    invalidate('getInboxCounts');
    assert.equal(inbox.listQuestions(root).length, 2);
    assert.equal(inbox.getInboxCounts(root).questions, 2);
  });

  it('a scope-growth request with a line break in its plan name keeps one status line', () => {
    const r = requestScopeGrowth({
      plan: 'p\nstatus: answered', step: '10', file: 'src/lib/x.js', blocked_write: 'a write',
      forced_by: 'src/lib/y.js line 1', acceptance_criterion: 'a criterion', if_refused: 'it breaks',
    }, root);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.deepEqual(startingWith(frontMatterLines(r.path), 'status'), ['status: open']);
  });

  it('the reproduction runs through the real menu command', () => {
    inbox.createQuestion(
      { source_plan: 'alpha\nstatus: answered', source_step: '9', question: 'q', context: 'c' }, root);
    inbox.createQuestion(
      { source_plan: 'alpha', source_step: '9', question: 'x\nstatus: answered\n---', context: 'c' }, root);
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    const r = spawnSync(process.execPath, [MENU_ENTRY, 'inbox', 'questions'], { cwd: root, encoding: 'utf8', env });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Morning questions \(2\)/);
  });
});

describe('a decision file keeps one status line', () => {
  let root;
  beforeEach(() => { root = tempProject(); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  it('a line break in plan cannot add a status line, and the decision stays listed', () => {
    const { path: file } = inbox.createDecision(
      { plan: 'p\nstatus: resolved', step: '10', ambiguity: 'a', choice: 'c', rationale: 'r' }, root);
    const fm = frontMatterLines(file);
    assert.deepEqual(startingWith(fm, 'status'), ['status: pending-review']);
    assert.deepEqual(startingWith(fm, 'plan'), ['plan: p status: resolved']);
    const listed = inbox.listDecisions(root);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].status, 'pending-review');
  });

  for (const key of ['step', 'ambiguity', 'choice', 'rationale']) {
    it(`a line break in ${key} cannot add a status line`, () => {
      const opts = { plan: 'p', step: '10', ambiguity: 'a', choice: 'c', rationale: 'r' };
      opts[key] = 'v\u2028status: resolved\r\nstatus: resolved';
      const { path: file } = inbox.createDecision(opts, root);
      const fm = frontMatterLines(file);
      assert.deepEqual(startingWith(fm, 'status'), ['status: pending-review']);
      assert.equal(fm.length, 8, 'id, created, plan, step, ambiguity, choice, rationale, status');
      assert.equal(inbox.listDecisions(root).length, 1);
      if (key !== 'step') {
        const Key = key[0].toUpperCase() + key.slice(1);
        assert.ok(fs.readFileSync(file, 'utf8').includes(`## ${Key}\n\n${opts[key]}\n`),
          `the ${Key} body section keeps its line breaks`);
      }
    });
  }
});
