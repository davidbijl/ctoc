'use strict';

// The hotfix check's guards: the fourth round's fail-closed scanners, the ninth round (the
// stylesheets, a long path, an added or deleted path, the copy's removal, failing closed,
// transforms), the tenth round's fixes in what stays, and the re-checks of 2026-10-10.
// Moved word for word out of tests/hotfix-check.test.js by the plan
// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.
// The shared setup and this file's private temporary folder: tests/helpers/hotfix-check-harness.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { route } = require('../src/lib/menu-screens');
const { ruleRefusal } = require('../src/lib/hotfix-check');
const qualityAgent = require('../src/lib/quality-agent');
const safeFs = require('../src/lib/safe-fs');

const {
  STATUS_LINE, refusal, unreadable, gone, inexact, HOME, HOME_STORE, nodeTest, PASSING_TEST, SCRIPT,
  tmpDir, PRIVATE_TMP, leftovers, git, writeFiles, makeRepo, testedProject, withEnv, check,
  probeDir, probeRead, logLines, withoutTime, worktrees, assertChecking, assertPass, copyParent,
  workspaceProject, growth, changeOf
} = require('./helpers/hotfix-check-harness');

// Every scanner fails closed (the automated commit security review, 2026-10-09): a side
// that ends inside an unfinished construct, or holds one the scanner cannot follow, makes
// the change unreadable. [path, base content, new content, the clause, or null for `checking`]
test('round 4: every scanner fails closed on an unfinished or unreadable construct', async () => {
  const open = (f) => `I could not read the change (${f} leaves a string, a comment, a bracket or a block open)`;
  const lost = (f) => `I could not read the change (${f} holds something I cannot follow)`;
  const un = (f) => `I do not recognise ${f} as wording or a colour`;
  const shapes = [
    // An attribute name where none can start: an unclosed `<div` swallowing the next tag.
    // An unclosed quote, comment, raw-text element and tag after the change.
    // Stylesheets: an unclosed comment, block and string; a closing brace with nothing open.
    ['src/styles/note.css', 'a { color: red; }\n/* note\n', 'a { color: blue; }\n/* note\n', open('src/styles/note.css')],
    ['src/styles/block.css', 'a { color: red; }\nb {\n', 'a { color: blue; }\nb {\n', open('src/styles/block.css')],
    ['src/styles/string.css', 'a { color: red; }\nb { content: "x }\n', 'a { color: blue; }\nb { content: "x }\n', lost('src/styles/string.css')],
    ['src/styles/extra.css', 'a { color: red; }\n}\n', 'a { color: blue; }\n}\n', lost('src/styles/extra.css')],
    // One side well-formed and the other not.
    // Well-formed files still qualify.
    // A file emptied is the content of a removal, never wording (found by the cut-short property case).
    ['src/styles/emptied.css', 'a { color: red; }\n', '', un('src/styles/emptied.css')],
    // The owner's decision of 2026-10-09: the check keeps only the formats it reads exactly, so
    // these cases of a removed format (Vue, Svelte, JSX, reStructuredText, Sass, Less, gettext)
    // stay, and each now asserts the "not recognised" refusal.
    ['src/components/Mustache.vue', '<template>\n  <p>Save</p>\n  <p>{{ msg </p>\n</template>\n', '<template>\n  <p>Store</p>\n  <p>{{ msg </p>\n</template>\n', gone('src/components/Mustache.vue')],
    ['src/components/Root.vue', '<template>\n  <p>Save</p>\n', '<template>\n  <p>Store</p>\n', gone('src/components/Root.vue')],
    ['src/components/Brace.jsx', 'export const P = () => <p>Save</p>;\nconst x = {\n', 'export const P = () => <p>Store</p>;\nconst x = {\n', gone('src/components/Brace.jsx')],
    ['src/components/Shut.jsx', 'export const P = () => <p>Save</p>;\n}\n', 'export const P = () => <p>Store</p>;\n}\n', gone('src/components/Shut.jsx')],
    ['src/components/Comment.jsx', 'export const P = () => <p>Save</p>;\n/* note\n', 'export const P = () => <p>Store</p>;\n/* note\n', gone('src/components/Comment.jsx')],
    ['src/components/Unshut.jsx', 'export const P = () => <div><p>Save</p>;\n', 'export const P = () => <div><p>Store</p>;\n', gone('src/components/Unshut.jsx')],
    ['src/components/Line.jsx', 'const s = "abc\nexport const P = () => <p>Save</p>;\n', 'const s = "abc\nexport const P = () => <p>Store</p>;\n', gone('src/components/Line.jsx')],
    ['src/components/Str.jsx', "export const P = () => <p>Save</p>;\nconst s = 'abc", "export const P = () => <p>Store</p>;\nconst s = 'abc", gone('src/components/Str.jsx')],
    ['src/components/Tick.jsx', 'export const P = () => <p>Save</p>;\nconst t = `abc', 'export const P = () => <p>Store</p>;\nconst t = `abc', gone('src/components/Tick.jsx')],
    ['src/components/Re.jsx', 'export const P = () => <p>Save</p>;\nconst q = /abc', 'export const P = () => <p>Store</p>;\nconst q = /abc', gone('src/components/Re.jsx')],
    ['src/components/GenGuard.tsx', 'export const f = <T,>(x: T) => x;\nexport const s = "<b>Save</b>";\n', 'export const f = <T,>(x: T) => x;\nexport const s = "<b>Store</b>";\n', gone('src/components/GenGuard.tsx')],
    ['docs/span-open.rst', 'Old words.\n\nPress :kbd:`Ctrl now.\n', 'New words.\n\nPress :kbd:`Ctrl now.\n', gone('docs/span-open.rst')],
    ['docs/literal-open.rst', 'Old words.\n\nRun ``pip now.\n', 'New words.\n\nRun ``pip now.\n', gone('docs/literal-open.rst')],
    ['docs/closed.rst', 'Old words.\n\nPress :kbd:`Ctrl` now.\n', 'New words.\n\nPress :kbd:`Ctrl` now.\n', gone('docs/closed.rst')],
    ['docs/emptied.rst', 'Old words.\n', '', gone('docs/emptied.rst')]
  ];
  const base = {};
  for (const [p, b] of shapes) base[p] = b;
  const root = makeRepo(base);
  for (const [p, b, n, expected] of shapes) {
    fs.writeFileSync(path.join(root, ...p.split('/')), n);
    const res = await check(root, p);
    fs.writeFileSync(path.join(root, ...p.split('/')), b);
    if (expected === null) assertChecking(res, [p]);
    else assert.equal(res.text, refusal(expected), `${p}: ${JSON.stringify(res)}`);
  }
});

// The ninth round, stylesheets (decisions at review of 2026-10-09): a strict subset, held to
// postcss by the differential test. A statement does not end at a `;` inside round or square
// brackets; a statement that is neither a declaration, an at-rule nor a rule's head refuses
// the file; and a changed declaration that holds a backslash is refused. Every row marked
// `red` answered otherwise on `4212d9ff`. [item, path, base content, new content, the clause, or null for `checking`]
test('round 9: stylesheets — brackets, statements outside the subset, escapes, and custom properties', async () => {
  const un = (f) => `I do not recognise ${f} as wording or a colour`;
  const lost = (f) => `I could not read the change (${f} holds something I cannot follow)`;
  const open = (f) => `I could not read the change (${f} leaves a string, a comment, a bracket or a block open)`;
  const setting = (f) => `it changes a setting in ${f}, and settings changes are a common cause of outages`;
  // Since the final re-check of 2026-10-10 a stylesheet that holds a backslash never qualifies:
  // every row with an escape, whatever it answered before, answers so.
  const escape = (f) => `${f} holds an escape (a backslash), which the check does not read in a stylesheet`;
  const colour = ['red', 'blue'];
  let count = 0;
  const row = (item, template, expected, pair = colour) => {
    const p = `src/styles/r9/${String(item).replace(/[^a-z0-9]+/gi, '-')}-${++count}.css`;
    return [item, p, template.replace('~', pair[0]), template.replace('~', pair[1]), typeof expected === 'function' ? expected(p) : expected];
  };
  const shapes = [
    // 1. A `;` inside round or square brackets ends no statement (red: each read `color: red`
    // as a declaration of its own and answered `checking`).
    row('brackets', 'a { --shape: (a; color: ~; b) }\n', setting),
    row('brackets', 'a { --shape: [a; color: ~; b] }\n', setting),
    // In a plain property's value a colon outside round brackets is a missing semicolon, for
    // postcss in square brackets too.
    row('brackets', 'a { grid-area: [a; color: ~; b] }\n', lost),
    row('brackets', 'a { grid-area: [a; b]; color: ~ }\n', null),
    row('brackets', 'a { background: \\75 rl(a;color:~;b) }\n', escape),
    row('brackets', '@media (a; b) { a { color: ~ } }\n', null),
    row('brackets', 'a { width: calc(1px + (2px * 3)); color: ~; }\n', null),
    // A brace inside brackets, a closing bracket of another kind and a bracket never closed
    // cannot be followed.
    row('brackets', 'a { x: (b { c; } d); color: ~ }\n', lost),
    row('brackets', 'a { x: (]; y: 0 } b { color: ~ }\n', lost),
    row('brackets', 'a { x: 1) } b { color: ~ }\n', lost),
    row('brackets', 'a { color: ~ } b { x: (1 }\n', lost),
    row('brackets', 'a { color: @ }\n~import (x\n', open),
    // 2. A statement that is neither blank, a declaration with a plain name, an at-rule nor
    // a rule's head (red: each was passed over, and the colour elsewhere answered `checking`;
    // postcss refuses each of these files).
    row('statement', 'a { color: ~; foo }\n', lost),
    row('statement', 'a { color: ~ } b\n', lost),
    row('statement', 'a { margin: 0 color: blue; } c { color: ~ }\n', lost, ['red', 'green']),
    row('statement', 'a { margin:: 0 } c { color: ~ }\n', lost),
    row('statement', 'a { *zoom: 1 } c { color: ~ }\n', lost),
    row('statement', 'margin: 0;\nc { color: ~ }\n', lost),
    row('statement', '<!-- c { color: ~ } -->\n', lost),
    row('statement', '@ { } c { color: ~ }\n', lost),
    row('statement', 'a { "x"; color: ~ }\n', lost),
    row('statement', 'a { color: ~; url(x) }\n', lost),
    row('statement', 'a { color: ~ }\n"x"\n', lost),
    // A character behind a backslash is no structure. An escaped brace, semicolon, quote or
    // comment start cannot be followed, and neither can a backslash before a line break (red:
    // each was read as the structure it escapes; four answered `checking`, `.a\{b` left a
    // block open and the colour behind `\/*` stood in a comment).
    row('escape', 'a\\{ color: ~ }\n', escape),
    row('escape', 'a { b\\;c: d; color: ~ }\n', escape),
    row('escape', 'a { color: ~ } b\\\n{ }\n', escape),
    row('escape', '.c-\\[\\\'x\\\'\\] { color: ~ }\n', escape),
    row('escape', '.a\\{b { color: ~ }\n', escape),
    row('escape', '.a\\/* { color: ~ } */ b { margin: 0 }\n', escape),
    // An escaped colon, slash or bracket in a selector, as a utility stylesheet writes them (guard).
    row('escape', '.sm\\:w-1\\/2, .w-\\[calc\\(1px\\)\\] { color: ~ }\n', escape),
    // A comment is white space to the statements; a declaration right behind one is still a
    // declaration, and a colour changed in it is not recognised, as before (guards).
    row('comment', 'a {\n  /* brand */\n  color: ~;\n}\n', un),
    row('comment', 'a { color /* c */ : ~ }\n', un),
    row('comment', 'a { /* c */ }\n/* d */ @import "x";\nb { color: ~; /* e */ }\n/* f */\n', null),
    // What a stylesheet may hold beside rules (guards).
    row('statement', '@charset "utf-8";\n@import "x.css";\n@layer a, b;\n:root { --gap: 4px; }\n--top: 1;\n@media (min-width: 10px) {\n  a { @apply x; color: ~; ; }\n}\n', null),
    row('statement', '{ color: ~ }\n', null),
    row('statement', '.sm\\:flex, #fff, .red { COLOR : ~ !important }\n', escape),
    // 3. A string ends at a carriage return or a form feed too (red).
    row('string', 'a { content: "x\r"; color: ~ }\n', lost),
    row('string', 'a { content: "x\f"; color: ~ }\n', lost),
    // 4. A changed custom property is a setting whatever reads it (the tenth round: custom
    // properties never qualify; until then one named for a colour and read by colour
    // properties only did, and the last four rows answered `checking`).
    row('custom property', ':root { --brand-color: ~ }\na { animation-name: var(--brand-color) }\n', setting),
    row('custom property', ':root { --brand-color: ~ }\n@container style(--brand-color: red) { a { margin: 0 } }\n', setting),
    row('custom property', ':root { --brand-color: ~; --other: var(--brand-color) }\n', setting),
    row('custom property', ':root { --brand-color: ~ }\na { color: var(--brand-color); border: 1px solid VAR( --brand-color , blue) }\n', setting),
    row('custom property', ':root { --brand-color: ~ }\na { background: linear-gradient(var(--brand-color), white) }\n', setting),
    row('custom property', ':root { --brand-color: ~ }\n.btn--brand-color { margin: 0 } a { width: var(--Brand-Color) }\n', setting),
    row('custom property', ':root { --brand-color: ~ } /* animation-name: var(--brand-color) */\n', setting),
    // A real colour property that reads a custom property is no colour value; one beside it is.
    row('custom property', ':root { --brand-color: red }\na { color: var(--brand-color, ~) }\n', (f) => inexact(f)),
    row('custom property', ':root { --brand-color: red }\na { color: var(--brand-color); background-color: ~ }\n', null)
  ];
  const base = {};
  for (const [, p, b] of shapes) base[p] = b;
  const root = makeRepo(base);
  const wrong = [];
  for (const [item, p, b, n, expected] of shapes) {
    assert.notEqual(b, n, `${p} holds a change`);
    fs.writeFileSync(path.join(root, ...p.split('/')), n);
    const res = await check(root, p);
    fs.writeFileSync(path.join(root, ...p.split('/')), b);
    const want = expected === null ? STATUS_LINE : refusal(expected);
    if (res.text !== want) wrong.push(`${item} ${p} ${JSON.stringify(b)}: ${res.verdict === 'checking' ? 'checking' : res.text}`);
    else if (expected === null) assertChecking(res, [p]);
  }
  assert.deepEqual(wrong, []);
});

test('round 9: a long path is read in time proportional to its size', async (t) => {
  // A folder name of capitals, small letters, marks and characters nobody sees: every piece is one sub-word.
  const piece = `aB${String.fromCharCode(0x301, 0x200b)}`;
  const longPath = (n) => {
    const change = changeOf(`src/${piece.repeat(256 * n)}/site.css`, HOME, HOME_STORE);
    // Read to its end in every form, then refused for the characters nobody sees (since the re-check of 2026-10-10).
    return () => assert.equal(ruleRefusal(change).cause, 'unrecognised');
  };
  const name = await growth(longPath, 16, 1600);
  t.diagnostic(`a path of ${name.n} KiB: ${name.small.toFixed(1)} ms, ${4 * name.n} KiB: ${name.big.toFixed(1)} ms, ${name.ratio.toFixed(1)} times as long`);
  assert.ok(name.ratio < 8, `a path of ${name.n} KiB took ${name.small.toFixed(1)} ms and one of ${4 * name.n} KiB took ${name.big.toFixed(1)} ms`);
});

test('round 9: an added or deleted path is refused before anything is staged, so no untracked file reaches the object store', async () => {
  const root = makeRepo({ 'src/styles/home.css': HOME, 'docs/old.md': 'Old.\nWords.\n' });
  const objects = () => git(root, ['count-objects', '-v']);
  const last = () => withoutTime(logLines(root)).pop();
  // A 40 MiB file nobody has added (655,360 lines), beside a wording change.
  fs.writeFileSync(path.join(root, 'big.txt'), `${'x'.repeat(63)}\n`.repeat(40 * 16384));
  fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
  let before = objects();
  assert.equal((await check(root)).text, refusal('it adds, removes or renames big.txt'));
  assert.equal(objects(), before, 'the unnamed first call wrote nothing to the object store');
  // The count of lines is for the log only, and reading it is bounded (the tenth round): at most
  // 4 MiB of untracked files are read, here 65,536 lines of 64 bytes, and the 2 changed lines
  // of the page. (Until then the whole 40 MiB were read to count 655,360 lines.)
  assert.deepEqual(last(), { verdict: 'refused', cause: 'adds-removes-renames', urgent: false, files: 2, lines: 65538 });
  assert.equal((await check(root, '--run-tests')).text, refusal('it adds, removes or renames big.txt'));
  assert.equal((await check(root, 'big.txt')).text, refusal('it adds, removes or renames big.txt'));
  assert.equal(objects(), before, 'neither did the test call, nor the call that names the file');
  fs.rmSync(path.join(root, 'big.txt'));

  // A deleted file, a file without a final line break, an empty one and a link, all new.
  fs.rmSync(path.join(root, 'docs', 'old.md'));
  writeFiles(root, { 'docs/new.md': 'One.\nTwo', 'docs/empty.md': '' });
  fs.symlinkSync('old.md', path.join(root, 'docs', 'link.md'));
  before = objects();
  assert.equal((await check(root)).text, refusal('it adds, removes or renames docs/empty.md'));
  assert.deepEqual(last(), { verdict: 'refused', cause: 'adds-removes-renames', urgent: false, files: 5, lines: 7 });
  assert.equal((await check(root, 'docs/old.md')).text, refusal('it adds, removes or renames docs/old.md'));
  assert.deepEqual(last(), { verdict: 'refused', cause: 'adds-removes-renames', urgent: false, files: 1, lines: 2 });
  assert.equal(objects(), before);

  // A file the owner added to git's index and never committed is an added path too.
  git(root, ['add', 'docs/new.md']);
  before = objects();
  assert.equal((await check(root, 'docs/new.md')).text, refusal('it adds, removes or renames docs/new.md'));
  assert.deepEqual(last(), { verdict: 'refused', cause: 'adds-removes-renames', urgent: false, files: 1, lines: 2 });
  assert.equal(objects(), before);
});

test('round 9: the copy is removed whatever the tests leave in it, and a removal that fails keeps both ends of its reason', async (t) => {
  await t.test('a test that leaves folders nobody may write to, or read', async () => {
    const locking = nodeTest('has a rule', "  assert.ok(read('src/styles/home.css').includes('.save'));", { prelude: [
      "fs.mkdirSync(path.join(process.cwd(), 'locked', 'inner'), { recursive: true });",
      "fs.writeFileSync(path.join(process.cwd(), 'locked', 'inner', 'kept.txt'), 'x');",
      "fs.chmodSync(path.join(process.cwd(), 'locked', 'inner'), 0o000);",
      "fs.chmodSync(path.join(process.cwd(), 'locked'), 0o555);"
    ].join('\n') });
    const root = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': locking }, { testScript: SCRIPT });
    const before = worktrees(root);
    fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
    const res = await check(root, '--run-tests', 'src/styles/home.css');
    const left = leftovers();
    // Whatever the answer, this test removes what the check left, so no later test inherits it.
    const open = (dir) => {
      fs.chmodSync(dir, 0o700);
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) open(path.join(dir, e.name));
    };
    for (const name of left) {
      open(path.join(PRIVATE_TMP, name));
      fs.rmSync(path.join(PRIVATE_TMP, name), { recursive: true, force: true });
    }
    git(root, ['worktree', 'prune']);
    assert.deepEqual(left, [], `the copy is gone: ${JSON.stringify(res.detail)}`);
    assertPass(res, ['src/styles/home.css']);
    assert.equal(worktrees(root), before);
  });
  await t.test('a folder the check cannot open is left to the removal, which names it', async () => {
    const locking = nodeTest('has a rule', "  assert.ok(read('src/styles/home.css').includes('.save'));", { prelude: [
      "fs.mkdirSync(path.join(process.cwd(), 'locked'));",
      "fs.writeFileSync(path.join(process.cwd(), 'locked', 'kept.txt'), 'x');",
      "fs.chmodSync(path.join(process.cwd(), 'locked'), 0o555);"
    ].join('\n') });
    const root = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': locking }, { testScript: SCRIPT });
    fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
    const realChmod = fs.chmodSync;
    t.mock.method(fs, 'chmodSync', (p, mode) => {
      if (String(p).includes('ctoc-hotfix-')) throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' });
      return realChmod(p, mode);
    });
    const res = await check(root, '--run-tests', 'src/styles/home.css');
    t.mock.restoreAll();
    const left = leftovers();
    for (const name of left) {
      realChmod(path.join(PRIVATE_TMP, name, 'tree', 'locked'), 0o700);
      fs.rmSync(path.join(PRIVATE_TMP, name), { recursive: true, force: true });
    }
    git(root, ['worktree', 'prune']);
    assert.equal(res.verdict, 'hotfix', JSON.stringify(res));
    // The failure that is named is the folder's own, not a later one of the removal. (Where a
    // folder's mode is not what keeps its owner from removing in it, no mode is changed and the
    // copy goes all the same.)
    if (process.platform === 'win32' && left.length === 0) assert.equal(res.detail, undefined);
    else assert.equal(res.detail, `the temporary copy at ${path.join(PRIVATE_TMP, left[0])} could not be removed: EPERM: operation not permitted`);
  });
  await t.test('a removal that still fails names the start and the end of its reason', async () => {
    const root = testedProject();
    const probe = probeDir();
    fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
    const reason = `EACCES: permission denied, rmdir '${'/a-folder-with-a-long-name'.repeat(12)}/the-last-folder'`;
    const realRm = fs.rmSync;
    t.mock.method(fs, 'rmSync', (p, options) => {
      if (path.basename(String(p)).startsWith('ctoc-hotfix-')) throw Object.assign(new Error(reason), { code: 'EACCES' });
      return realRm(p, options);
    });
    const res = await withEnv({ CTOC_HOTFIX_PROBE: probe }, () => check(root, '--run-tests', 'src/styles/home.css'));
    t.mock.restoreAll();
    const parent = copyParent(probeRead(probe));
    assert.equal(res.verdict, 'hotfix');
    assert.equal(res.detail, `the temporary copy at ${parent} could not be removed: ${reason.slice(0, 80)} … ${reason.slice(-80)}`);
    fs.rmSync(parent, { recursive: true, force: true });
  });
  await t.test('a removal that fails names the temporary folder with no control character, also when the system temporary folder holds one', async () => {
    const root = testedProject();
    fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
    // Windows refuses a control character in a folder name; there the path is plain.
    const bent = path.join(tmpDir('hotfix-bent-tmp-'), process.platform === 'win32' ? 'tmp line' : 'tmp\nline');
    fs.mkdirSync(bent);
    const realRm = fs.rmSync;
    t.mock.method(fs, 'rmSync', (p, options) => {
      if (path.basename(String(p)).startsWith('ctoc-hotfix-')) throw Object.assign(new Error('EBUSY: resource busy'), { code: 'EBUSY' });
      return realRm(p, options);
    });
    const res = await withEnv({ NODE_TEST_CONTEXT: undefined, TMPDIR: bent, TEMP: bent, TMP: bent },
      () => route(['hotfix', 'check', 'src/styles/home.css'], root));
    t.mock.restoreAll();
    const left = fs.readdirSync(bent);
    assert.equal(res.verdict, 'checking', JSON.stringify(res));
    assert.equal(left.length, 1);
    const shown = path.join(fs.realpathSync.native(bent), left[0]).replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ');
    assert.equal(res.detail, `the temporary copy at ${shown} could not be removed: EBUSY: resource busy`);
    assert.doesNotMatch(res.detail, /[\u0000-\u001f\u007f-\u009f]/);
    fs.rmSync(path.dirname(bent), { recursive: true, force: true });
  });
});

test('round 9: every guard fails closed — a file its reader cannot parse is refused, a fault in any rule stops the check, and nothing falls back to a looser reading', async (t) => {
  const lost = (f) => `I could not read the change (${f} holds something I cannot follow)`;
  const open = (f) => `I could not read the change (${f} leaves a string, a comment, a bracket or a block open)`;

  await t.test('per format: something the reader cannot parse, on the old side, the new side or both, never passes', async () => {
    // [format, path, before, after, clause]. Where both sides hold the same unparsable piece and
    // one string differs beside it, a reader that fell back to reading lines would pass.
    const rows = [
      ['CSS', 'src/styles/both.css', 'a { color: red; oops }\n', 'a { color: blue; oops }\n', lost],
      ['CSS', 'src/styles/new.css', 'a { color: red; }\nb { margin: 0; }\n', 'a { color: blue; }\nb { margin: 0; \n', open],
      ['CSS', 'src/styles/old.css', 'a { color: red; }\nb { margin: 0; \n', 'a { color: blue; }\nb { margin: 0; }\n', open],
      ['CSS', 'src/styles/comment.css', 'a { color: red; }\n/* open\n', 'a { color: blue; }\n/* open\n', open],
      ['CSS', 'src/styles/string.css', 'a { color: red; }\nb { content: "x\n; }\n', 'a { color: blue; }\nb { content: "x\n; }\n', lost],
    ];
    const base = {};
    for (const [, p, before] of rows) base[p] = before;
    const root = makeRepo(base);
    const wrong = [];
    for (const [format, p, before, after, clause] of rows) {
      fs.writeFileSync(path.join(root, ...p.split('/')), after);
      const first = await check(root, p);
      const second = await check(root, '--run-tests', p);
      fs.writeFileSync(path.join(root, ...p.split('/')), before);
      for (const res of [first, second]) {
        if (res.text !== refusal(clause(p))) wrong.push(`${format} ${p}: ${res.verdict === 'refused' ? res.text : res.verdict}`);
      }
    }
    assert.deepEqual(wrong, []);
  });

  /** A change that passes every rule, built by hand: one colour in a stylesheet. */
  const passing = (rel = 'site/page.css') => ({
    files: [{ display: rel, topRel: rel, status: 'M', oldMode: '100644', newMode: '100644', oldSha: null, oldText: HOME, newText: HOME_STORE,
      hunks: [{ oldStart: 2, newStart: 2, removed: ['  background-color: #0a58ca;'], added: ['  background-color: #0b5ed7;'] }] }],
    lineCount: 2
  });
  const boom = () => { throw new Error('injected fault'); };

  await t.test('a fault inside any rule function leaves the rules as a fault, never as a pass', () => {
    assert.equal(ruleRefusal(passing()), null, 'the change passes when nothing is injected');
    // Each rule reads one thing no rule before it reads; a getter that throws there is a fault inside that rule.
    const inject = {
      'rule 2, the same files': (c) => Object.defineProperty(c.files[0], 'status', { get: boom }),
      'rule 7, no test edited': (c) => Object.defineProperty(c.files[0], 'display', { get: boom }),
      'rule 4, texts that differ without a changed line': (c) => Object.defineProperty(c.files[0], 'hunks', { get: boom }),
      'rule 4, the kind': (c) => Object.defineProperty(c.files[0], 'oldText', { get: boom }),
      'rule 3, the size': (c) => Object.defineProperty(c, 'lineCount', { get: boom }),
      'rule 4, the content': (c) => Object.defineProperty(c.files[0], 'kind', { get: boom, set() {} })
    };
    for (const [rule, poison] of Object.entries(inject)) {
      const change = passing();
      poison(change);
      assert.throws(() => ruleRefusal(change), /injected fault/, rule);
    }
    // Rule 5 reads the path, as every rule before it does; its own step is the folding of the letters.
    const normalize = String.prototype.normalize;
    t.mock.method(String.prototype, 'normalize', function fold(form) {
      if (form === 'NFKD') boom();
      return normalize.call(this, form);
    });
    try {
      assert.throws(() => ruleRefusal(passing()), /injected fault/, 'rule 5, the sensitive area');
    } finally {
      t.mock.restoreAll();
    }
    // What the rules need and a caller left out is a fault too, never a default.
    for (const lineCount of [undefined, null, NaN, -1, 1.5, '2']) {
      assert.throws(() => ruleRefusal({ ...passing(), lineCount }), /no count of its changed lines/, `a line count of ${String(lineCount)}`);
    }
    // A file with nothing changed in it is no pass of nothing, in any format.
    for (const rel of ['docs/page.md', 'site/page.html', 'locales/en/page.json', 'locales/en/page.yml', 'lang/en/page.properties', 'site/page.css']) {
      const same = { display: rel, topRel: rel, status: 'M', oldMode: '100644', newMode: '100644', oldSha: null, oldText: 'Some words here.\n',
        newText: 'Some words here.\n', hunks: [] };
      assert.notEqual(ruleRefusal({ files: [same], lineCount: 0 }), null, rel);
      // Nor is a file whose texts differ while the diff shows no changed line (git never gives
      // such a change; the rule that refuses it had no test until now).
      const silent = { ...same, newText: 'Some other words here.\n' };
      assert.deepEqual(ruleRefusal({ files: [silent], lineCount: 0 }), { clause: `I do not recognise ${rel} as wording or a colour`, cause: 'unrecognised' }, rel);
    }
  });

  await t.test('through the menu: a fault in the reading, in a rule or in the test run is "the check stopped"', async () => {
    const root = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': PASSING_TEST }, { testScript: SCRIPT });
    const page = ['src/styles/home.css', HOME_STORE];
    const real = { extname: path.posix.extname, normalize: String.prototype.normalize };
    // [where the fault is injected, the judged file, the arguments before it, how to inject]
    const faults = [
      ['rule 1, the copy of the index', page, [], () => t.mock.method(safeFs, 'cpSync', boom)],
      ['rule 5, the folding of the path', page, [], () => t.mock.method(String.prototype, 'normalize', function fold(form) {
        if (form === 'NFKD') boom();
        return real.normalize.call(this, form);
      })],
      ['rule 8, the test run', page, ['--run-tests'], () => t.mock.method(qualityAgent, 'runFullTests', async () => boom())]
    ];
    for (const [where, [p, after], args, injectFault] of faults) {
      const before = fs.readFileSync(path.join(root, ...p.split('/')), 'utf8');
      fs.writeFileSync(path.join(root, ...p.split('/')), after);
      injectFault();
      let res;
      try {
        res = await check(root, ...args, p);
      } finally {
        t.mock.restoreAll();
      }
      fs.writeFileSync(path.join(root, ...p.split('/')), before);
      assert.equal(res.text, unreadable('the check stopped'), where);
      assert.equal(res.detail, 'injected fault', where);
      assert.deepEqual(withoutTime(logLines(root)).pop(), { verdict: 'refused', cause: 'unreadable', urgent: false, files: 0, lines: 0 }, where);
    }
  });
});

// The coordinator's fourth and fifth points at review, 2026-10-09. The program that later
// reads a file sees its raw bytes, so wherever the check folds, strips, decodes or skips
// before it decides, that may only add reasons to refuse: a rule that refuses asks the text
// as written AND every folded form and refuses when one of them says so; a rule that lets a
// file through must hold for all of them. Each row is a file whose raw and transformed forms
// differ, and of which only one would pass.
test('round 9: a transform only adds reasons to refuse, and the check reads what the consumer reads', async () => {
  const un = (f) => `I do not recognise ${f} as wording or a colour`;
  const lost = (f) => `I could not read the change (${f} holds something I cannot follow)`;
  const area = (word) => (f) => `${f} sits in an area named ${word}, and such areas are never a hotfix`;
  const testEdited = (f) => `it changes a test (${f})`;
  const COLOUR = ['a { color: red; }\n', 'a { color: blue; }\n'];
  // [the transform, path, [before, after], the clause, or null for the first call's `checking`]
  const rows = [
    // Marks and unseen characters are dropped from a path: two words then read as one, so the
    // path is asked as written too (red on the round's own commit 795325ab: `checking`).
    ['path: marks and format characters dropped', 'src/authZWSPlogin/site.css', COLOUR, area('auth')],
    ['path: marks and format characters dropped', 'src/authACUTElogin/site.css', COLOUR, area('auth')],
    ['path: compatibility letters', 'src/authKGSIGN/site.css', COLOUR, area('auth')],
    ['path: compatibility letters', 'src/FWAUTH/site.css', COLOUR, area('auth')],
    // A governing folder and a test folder behind a character nobody sees.
    ['path: a governing folder folded', 'promptsZWSP/site.css', COLOUR, un],
    ['path: a test folder folded', 'teZWSPsts/site.css', COLOUR, testEdited],
    // A name that qualifies only once folded does not qualify: the raw name must qualify too.
    ['path: a qualifying name must qualify as written', 'site/page.cZWSPss', COLOUR, un],
    // An accent in a name changes nothing (guard).
    ['path: an accent', 'docs/cafEACUTE/site.css', COLOUR, null],
    // A colour's name in the letters a browser compares: the Kelvin sign is no `k`.
    ['stylesheet: letter case', 'src/styles/kelvin.css', ['a { color: red }\n', 'a { color: blacKELVIN }\n'], un],
    ['stylesheet: letter case', 'src/styles/upper.css', ['a { color: red }\n', 'a { COLOR: BLACK }\n'], un],
    ['stylesheet: letter case', 'src/styles/upper-value.css', ['a { COLOR: red }\n', 'a { COLOR: BLACK }\n'], null],
    // Line endings: the same on every line, not only as many.
    ['line endings moved', 'src/styles/moved.css', ['a { color: red; }\r\nb { margin: 0; }\n', 'a { color: blue; }\nb { margin: 0; }\r\n'], un],
    ['line endings moved', 'src/styles/kept.css', ['a { color: red; }\r\nb { margin: 0; }\n', 'a { color: blue; }\r\nb { margin: 0; }\n'], null],
    // A character set other than UTF-8, which is how the check read the bytes.
    ['character set', 'src/styles/sjis.css', ['@charset "shift_jis";\na { color: red; }\n', '@charset "shift_jis";\na { color: blue; }\n'], lost],
    ['character set', 'src/styles/utf.css', ['@charset "UTF-8";\na { color: red; }\n', '@charset "UTF-8";\na { color: blue; }\n'], null]
  ];
  const spelt = (text) => text.replaceAll('ZWSP', '\u200b').replaceAll('ZWNJ', '\u200c').replaceAll('EACUTE', '\u00e9').replaceAll('ACUTE', '\u0301')
    .replaceAll('KGSIGN', '\u338f').replaceAll('BOM', '\ufeff').replaceAll('KELVIN', '\u212a').replaceAll('FWAUTH', '\uff21\uff35\uff34\uff28').replaceAll('FWAGENTS', '\uff21\uff27\uff25\uff2e\uff34\uff33').replaceAll('BSLASH', '\\');
  const base = {};
  for (const row of rows) {
    row[1] = spelt(row[1]);
    row[2] = row[2].map(spelt);
    base[row[1]] = row[2][0];
  }
  const root = makeRepo(base);
  const wrong = [];
  for (const [what, p, [before, after], expected] of rows) {
    fs.writeFileSync(path.join(root, ...p.split('/')), after);
    const res = await check(root, p);
    fs.writeFileSync(path.join(root, ...p.split('/')), before);
    const want = expected === null ? STATUS_LINE : refusal(expected(p));
    if (res.text !== want) wrong.push(`${what}: ${JSON.stringify(p)} ${JSON.stringify(after).slice(0, 60)}: ${res.verdict === 'checking' ? 'checking' : res.text}`);
  }
  assert.deepEqual(wrong, []);
});

// The tenth round, fixes in what stays (the session coordinator's brief of 2026-10-10, part B).
// Each case was written, run and seen failing before its fix; the plan's record ("Fix round
// 10") holds what each answered before.
const reasonOf = (refused) => (refused === null ? 'passed' : refused.clause);
const NOT_WORDING = 'I do not recognise src/styles/home.css as wording or a colour';

test('round 10, B4: guards closed by construction', async (t) => {
  const page = () => changeOf('src/styles/home.css', HOME, HOME_STORE);
  await t.test('a kind no reader is written for stops the check, never another reader', () => {
    for (const kind of ['catalogue', 'documentation', 'markup', 'toString', undefined]) {
      const change = page();
      Object.defineProperty(change.files[0], 'kind', { get: () => kind, set() {} });
      assert.throws(() => ruleRefusal(change), /no reader for the kind/, String(kind));
    }
  });
  await t.test('a stylesheet with no changed colour is no pass of nothing', () => {
    // git gives no such change; a caller that hands over changed lines beside equal texts gets a refusal.
    const change = page();
    change.files[0].newText = HOME;
    assert.equal(reasonOf(ruleRefusal(change)), NOT_WORDING);
  });
  await t.test('CTOC\'s protected paths are asked in every form of the path, and without regard to letter case', async () => {
    const files = { 'package.json': '{ "name": "ctoc" }\n', 'CLAUDE.md': '# CTOC Project Instructions\n', '.ctoc/keep.json': '{}\n' };
    const area = (f) => refusal(`${f} sits in an area named enforcement, and such areas are never a hotfix`);
    for (const rel of ['src/hooks/notes.css', 'src/Hooks/notes.css', 'SRC/HOOKS/notes.css', 'src/hoo\u200bks/notes.css', 'src/\uff48ooks/notes.css']) {
      const root = makeRepo({ ...files, [rel]: HOME });
      fs.writeFileSync(path.join(root, ...rel.split('/')), HOME_STORE);
      assert.equal((await check(root, rel)).text, area(rel), JSON.stringify(rel));
    }
  });
  await t.test('a package folder that cannot be listed, or an install record that cannot be read, stops the check: only "does not exist" passes', async () => {
    const denied = () => { throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }); };
    const site = process.platform === 'win32' ? ['.venv', 'Lib', 'site-packages'] : ['.venv', 'lib', 'python3.12', 'site-packages'];
    const root = workspaceProject('greet', 'greet', { '.gitignore': 'node_modules/\n.venv/\n' });
    writeFiles(root, { '.venv/pyvenv.cfg': 'home = /usr/bin\n', [`${site.join('/')}/_x.pth`]: '# nothing\n' });
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    const real = { readdir: safeFs.readdirSync, read: safeFs.readFileSync, lstat: safeFs.lstatSync };
    const inWorkingFolder = (p) => String(p).startsWith(root);
    const faults = [
      ['the folder of installed packages cannot be listed', () => t.mock.method(safeFs, 'readdirSync', (p, ...rest) => (inWorkingFolder(p) && String(p).endsWith('node_modules') ? denied() : real.readdir(p, ...rest)))],
      ['an install record cannot be read', () => t.mock.method(safeFs, 'readFileSync', (p, ...rest) => (String(p).endsWith('_x.pth') ? denied() : real.read(p, ...rest)))],
      ['an entry of the folder cannot be looked at', () => t.mock.method(safeFs, 'lstatSync', (p, ...rest) => (inWorkingFolder(p) && String(p).endsWith(path.join('node_modules', 'greet')) ? denied() : real.lstat(p, ...rest)))]
    ];
    for (const [what, inject] of faults) {
      inject();
      let res;
      try {
        res = await check(root, '--run-tests', 'src/styles/home.css');
      } finally {
        t.mock.restoreAll();
      }
      assert.equal(res.text, unreadable('the check stopped'), what);
      assert.match(res.detail, /EACCES/, what);
    }
    // With nothing injected the same change passes: what does not exist is no fault.
    assertPass(await check(root, '--run-tests', 'src/styles/home.css'), ['src/styles/home.css']);
  });
});

test('round 10, B5 to B7: a control character in a stylesheet, the exact grammar of a colour value, and a name before `url(`', () => {
  const css = (before, after) => reasonOf(ruleRefusal(changeOf('src/styles/site.css', before, after)));
  const NOT_COLOUR = 'I do not recognise src/styles/site.css as wording or a colour';
  const LOST = 'I could not read the change (src/styles/site.css holds something I cannot follow)';
  // B5. The comparison writes one control character in the place of every colour. A stylesheet
  // that holds that character itself could move a value from one declaration to another unseen.
  assert.equal(css('a { color: red; animation-name: \u0001; outline-style: tan }\n', 'a { color: blue; animation-name: tan; outline-style: \u0001 }\n'), LOST);
  for (const control of ['\u0000', '\u0001', '\u0002', '\u0003', '\u0008', '\u000b', '\u001b', '\u007f', '\u0085', '\u009f']) {
    assert.equal(css(`a { color: red } /* ${control} */\n`, `a { color: blue } /* ${control} */\n`), LOST, `U+${control.charCodeAt(0).toString(16)}`);
  }
  assert.equal(css('a {\tcolor: red;\f}\r\n', 'a {\tcolor: blue;\f}\r\n'), 'passed', 'a tab, a form feed and a carriage return are white space');
  // B6. One function decides every colour value, by an exact grammar.
  const value = (before, after) => css(`a { color: ${before} }\n`, `a { color: ${after} }\n`);
  const colours = ['#abc', '#abcd', '#aabbcc', '#AABBCC80', 'tomato', 'Transparent', 'rgb(10, 20, 30)', 'rgb(10,20,30)', 'rgb( 10 , 20 , 30 )', 'rgb(10%, 20%, 30%)',
    'rgba(10, 20, 30, 0.5)', 'rgba(10, 20, 30, 50%)', 'rgb(10, 20, 30, .5)', 'rgb(-1, +2, 300)', 'rgb(1.5%, 20%, 30%)', 'hsl(210, 50%, 40%)', 'hsl(-210.5, 50%, 40%)',
    'hsla(210, 50%, 40%, 0.9)', 'hsl(210, 50%, 40%, 90%)'];
  for (const colour of colours) assert.equal(value('red', colour), 'passed', colour);
  // The brief's two witnesses first; then every form the grammar does not hold.
  assert.equal(value('rgb(10, 20, 30%)', 'rgb(10, 20, 40%)'), NOT_COLOUR, 'integers and a percentage, mixed');
  assert.equal(value('hsl(10, 20, 30)', 'hsl(10, 20, 40)'), NOT_COLOUR, 'a saturation and a lightness that are no percentages');
  const none = ['#ab', '#abcde', '#abcdefg', '#abcdefghi', '#ggg', 'rgb(10, 20)', 'rgb(10, 20, 30, 0.5, 1)', 'rgb(10 20 30)', 'rgb(10 20 30 / 50%)', 'rgb(10%, 20, 30)',
    'rgb(1.5, 2, 3)', 'rgb(none, 20, 30)', 'rgb(10, 20, 30,)', 'rgb(, 20, 30)', 'rgb(10, 20, 30deg)', 'rgb(1e2, 20, 30)', 'hsl(210deg, 50%, 40%)', 'hsl(210 50% 40%)',
    'hsl(210%, 50%, 40%)', 'hsl(210, 50, 40%)', 'hsl(210, 50%, 40%, x)', 'hwb(120 0% 0%)', 'lab(50% 40 59)', 'oklch(60% 0.2 240)', 'color(display-p3 1 0.5 0)',
    'rgb(calc(1), 2, 3)', 'rgbx(1, 2, 3)', 'RGB(1, 2, 3)', 'rgb(1., 2, 3)', 'rgb(1, 2, 3) x', 'currentcolor', 'reddish', 'r\u0435d'];
  for (const text of none) {
    assert.equal(value('red', text), NOT_COLOUR, `to ${text}`);
    assert.equal(value(text, 'red'), NOT_COLOUR, `from ${text}`);
  }
  // B7. A character above U+007F, or an escape, is part of a name: what follows is no `url(`,
  // so its brackets are read as brackets, and the brace inside them cannot be followed.
  assert.equal(css('a { x: \u00e9url({); color: red }\n', 'a { x: \u00e9url({); color: blue }\n'), LOST, 'a letter above U+007F before url(');
  // (An escape before `url(` was a case of its own until the final re-check of 2026-10-10; a stylesheet with a backslash is refused whole now.)
  const ESCAPE = 'src/styles/site.css holds an escape (a backslash), which the check does not read in a stylesheet';
  assert.equal(css('a { x: \\41 url({); color: red }\n', 'a { x: \\41 url({); color: blue }\n'), ESCAPE, 'a hexadecimal escape before url(');
  assert.equal(css('a { x: \\ url({); color: red }\n', 'a { x: \\ url({); color: blue }\n'), ESCAPE, 'an escaped space before url(');
  assert.equal(css('a { x: url({); color: red }\n', 'a { x: url({); color: blue }\n'), 'passed', 'a real url( holds what it holds');
  assert.equal(css('a { x: 1px url({); color: red }\n', 'a { x: 1px URL({); color: blue }\n'), NOT_COLOUR, 'and is compared exactly');
});

test('round 10, B9 and B10: a sensitive word anywhere inside a part of the path, a part that holds `prompt`, and a stylesheet in a dot-folder', () => {
  const page = (rel) => reasonOf(ruleRefusal(changeOf(rel, HOME, HOME_STORE)));
  const sheet = (rel) => reasonOf(ruleRefusal(changeOf(rel, 'a { color: red; }\n', 'a { color: blue; }\n')));
  const area = (rel, word) => `${rel} sits in an area named ${word}, and such areas are never a hotfix`;
  const un = (rel) => `I do not recognise ${rel} as wording or a colour`;
  // B9. The brief's witnesses: [a part of the path, the word it holds].
  const held = [['oauth', 'auth'], ['Oauth', 'auth'], ['oauth2client', 'auth'], ['idtoken', 'token'], ['sshkeys', 'key'], ['paymentsapi', 'payment'], ['apikey', 'key'],
    ['authentication', 'auth'], ['authorization', 'auth'], ['deployment', 'deploy'], ['security', 'security'], ['coauthor', 'auth'], ['authority', 'auth'],
    ['HTMLAuthor', 'auth'], ['APIKeyboard', 'key'], ['ci', 'ci'], ['ci-tools', 'ci'], ['CI_scripts', 'ci']];
  for (const [part, word] of held) {
    assert.equal(page(`src/${part}/site.css`), area(`src/${part}/site.css`, word), part);
    assert.equal(page(`src/styles/${part}.css`), area(`src/styles/${part}.css`, word), `${part} as a file name`);
  }
  assert.equal(sheet('src/styles/accessTokens.css'), area('src/styles/accessTokens.css', 'token'));
  assert.equal(sheet('src/styles/brandTokens.css'), area('src/styles/brandTokens.css', 'token'));
  assert.equal(sheet('src/tokens/base.css'), area('src/tokens/base.css', 'token'), 'a folder named tokens');
  // What stays: a part that is exactly `author` or `authors`; `ci` inside a longer part.
  for (const part of ['author', 'Authors', 'circle', 'pencil', 'special', 'home']) assert.equal(page(`src/${part}/site.css`), 'passed', part);
  // (A stylesheet named for design tokens passed until the second final re-check of 2026-10-10, which took the exception out.)
  for (const rel of ['src/styles/tokens.css', 'src/styles/design-tokens.css', 'src/styles/tokens.dark.css', 'src/styles/Tokens.dark.css']) assert.equal(sheet(rel), area(rel, 'token'), rel);
  // B10. A part of the path that holds `prompt` governs the work.
  for (const rel of ['src/llm/system_prompt.css', 'src/llm/SystemPrompt.css', 'src/prompting/site.css', 'src/my-prompts-old/site.css']) assert.equal(page(rel), un(rel), rel);
  assert.equal(sheet('src/styles/Prompt.css'), un('src/styles/Prompt.css'));
  assert.equal(page('src/prom/pt.css'), 'passed', 'the word stands in one part');
  // A dot-folder may be some tool's own: a page or a stylesheet below one never qualifies.
  for (const rel of ['.storybook/preview-head.css', 'docs/.vitepress/theme/index.css', '.foo/site.css']) assert.equal(page(rel), un(rel), rel);
  assert.equal(sheet('.vitepress/theme/custom.css'), un('.vitepress/theme/custom.css'));
  assert.equal(page('docs/a.b/site.css'), 'passed', 'a dot inside a folder name is no dot-folder');
  assert.equal(page('.github/pages/index.css'), 'it changes how the project is built or shipped in .github/pages/index.css', 'a build folder is named as one');
});

// Found after the B9 commit (3ce7ae0a) by comparing it with the round's base commit: reading
// each part of a path whole and in lower case lost the split at capitals, so `ci` as a
// camel-case sub-word, and its plural, passed where they were refused. Nothing the earlier
// matcher refused may pass: the refusal is what either matcher finds.
test('round 10, B9: whatever the earlier matcher refused is still refused (a word as a camel-case sub-word, or in the plural)', () => {
  const sheet = (rel) => reasonOf(ruleRefusal(changeOf(rel, 'a { color: red; }\n', 'a { color: blue; }\n')));
  const page = (rel) => reasonOf(ruleRefusal(changeOf(rel, HOME, HOME_STORE)));
  const area = (rel, word) => `${rel} sits in an area named ${word}, and such areas are never a hotfix`;
  for (const rel of ['src/runCI/site.css', 'src/ui/runCI.css', 'src/ciConfig/site.css', 'src/ui/ciConfig.css', 'src/githubCI/site.css', 'src/ui/githubCI.css',
    'src/myCi/site.css', 'src/ui/myCi.css', 'src/cis/site.css', 'src/CIs/site.css']) {
    assert.equal(sheet(rel), area(rel, 'ci'), rel);
  }
  // Every word of the list, as the earlier matcher found it: whole, in the plural, as a
  // camel-case sub-word, and where the last capital of a run of capitals starts it.
  const words = ['auth', 'login', 'logout', 'password', 'session', 'token', 'secret', 'credential', 'key', 'permission', 'role', 'admin', 'payment', 'billing',
    'checkout', 'price', 'pricing', 'invoice', 'tax', 'legal', 'terms', 'privacy', 'consent', 'cookie', 'gdpr', 'license', 'migration', 'schema', 'database', 'sql',
    'deploy', 'workflow', 'ci'];
  const capital = (word) => word[0].toUpperCase() + word.slice(1);
  for (const word of words) {
    for (const part of [word, `${word}s`, `${word}es`, word.toUpperCase(), `my${capital(word)}`, `${word}Panel`, `API${capital(word)}`, `x-${word}_y`]) {
      // A folder named `migration` is a database folder, with a clause of its own: that word stands in the file name.
      const answer = page(word === 'migration' ? `src/styles/${part}.css` : `src/${part}/site.css`);
      assert.match(answer, / sits in an area named \p{L}+, and such areas are never a hotfix$/u, `${part}: ${answer}`);
    }
  }
  // What passed then passes now, where the tenth round did not decide otherwise.
  for (const part of ['circle', 'Author', 'ui', 'special', 'site']) assert.equal(page(`src/${part}/site.css`), 'passed', part);
});

// After the re-check of 2026-10-10 (the session coordinator): the rule "a page that an
// instruction file names" failed a second time, so by the two-fix-rounds rule that area comes
// out, and with it the one kind that needs it: pages. The only thing that can pass is one
// colour value in a standard colour property of a `.css` stylesheet.
test('after the re-check: every extension the module ever recognised but `.css` is refused, whatever the file holds', () => {
  const texts = { page: ['<p>Save the file</p>\n', '<p>Store the file</p>\n'], prose: ['Save the file.\n', 'Store the file.\n'],
    colour: ['a { color: red; }\n', 'a { color: blue; }\n'] };
  const setting = (f) => `it changes a setting in ${f}, and settings changes are a common cause of outages`;
  // [extension, a path that qualified once, the content, the clause]
  const rows = [
    ['.html', 'src/pages/home.html', 'page', gone], ['.html', 'site/INDEX.HTML', 'page', gone], ['.htm', 'site/about.htm', 'page', gone],
    ['.md', 'README.md', 'prose', gone], ['.txt', 'CHANGES.txt', 'prose', gone],
    ['.json', 'locales/en.json', 'prose', setting], ['.yaml', 'i18n/fr.yaml', 'prose', setting], ['.yml', 'config/locales/en.yml', 'prose', setting],
    ['.properties', 'i18n/messages_fr.properties', 'prose', setting],
    ['.vue', 'src/components/Name.vue', 'page', gone], ['.svelte', 'src/components/Name.svelte', 'page', gone], ['.jsx', 'src/components/Name.jsx', 'page', gone],
    ['.tsx', 'src/components/Name.tsx', 'page', gone], ['.mdx', 'docs/page.mdx', 'prose', gone], ['.rst', 'docs/guide.rst', 'prose', gone],
    ['.scss', 'src/styles/theme.scss', 'colour', gone], ['.sass', 'src/styles/theme.sass', 'colour', gone], ['.less', 'src/styles/theme.less', 'colour', gone],
    ['.po', 'translations/de.po', 'prose', gone], ['.svg', 'docs/diagram.svg', 'page', gone]
  ];
  const wrong = [];
  for (const [, rel, kind, clause] of rows) {
    const refused = ruleRefusal(changeOf(rel, texts[kind][0], texts[kind][1]));
    if (refused === null || refused.clause !== clause(rel)) wrong.push(`${rel}: ${refused === null ? 'passed' : refused.clause}`);
  }
  assert.deepEqual(wrong, []);
  assert.equal(ruleRefusal(changeOf('src/styles/site.css', texts.colour[0], texts.colour[1])), null, 'a colour in a stylesheet passes');
  // A path that holds a character nobody sees is refused (the Hangul filler is a letter to Unicode).
  const unseen = `src/ad${String.fromCharCode(0x3164)}min/site.css`;
  assert.notEqual(ruleRefusal(changeOf(unseen, texts.colour[0], texts.colour[1])), null, 'a path with a Hangul filler');
});

// After the re-check of 2026-10-10, part 2: small fixes in what stays. Each witness was seen
// failing on a51fa396 before its fix.
test('after the re-check: shadows, the `tokens` exception as written, sensitive words across separators, and a database folder', () => {
  const css = (rel, before, after) => reasonOf(ruleRefusal(changeOf(rel, before, after)));
  const sheet = (rel) => css(rel, 'a { color: red; }\n', 'a { color: blue; }\n');
  const area = (rel, word) => `${rel} sits in an area named ${word}, and such areas are never a hotfix`;
  // `box-shadow` and `text-shadow` take no bare colour: a browser reads `box-shadow: red` as invalid.
  for (const prop of ['box-shadow', 'text-shadow']) {
    assert.equal(css('src/styles/site.css', `a { ${prop}: red; }\n`, `a { ${prop}: blue; }\n`), 'I do not recognise src/styles/site.css as wording or a colour', prop);
  }
  assert.equal(css('src/styles/site.css', 'a { outline: red; }\n', 'a { outline: blue; }\n'), 'passed', 'a real shorthand still takes one');
  // (A stylesheet named for design tokens passed until the second final re-check of 2026-10-10, which took the exception out.)
  assert.equal(sheet('styles/tokens.css'), area('styles/tokens.css', 'token'));
  assert.equal(sheet('styles/tokenS.css'), area('styles/tokenS.css', 'token'));
  assert.equal(sheet('styles/Tokens.css'), area('styles/Tokens.css', 'token'));
  // A word of four letters or more is found in the path with every character that is no letter taken out.
  for (const [rel, word] of [['log-in/site.css', 'login'], ['pages/log_out.css', 'logout'], ['check-out/site.css', 'checkout'], ['pass-word/site.css', 'password'],
    ['data-base/site.css', 'database'], ['work-flow/site.css', 'workflow'], ['styles/pay.ment.css', 'payment'], ['se-ssion/site.css', 'session']]) {
    assert.equal(sheet(rel), area(rel, word), rel);
  }
  // The stems of words whose other forms the earlier matchers missed.
  for (const [rel, word] of [['licensing/site.css', 'licens'], ['licences/site.css', 'licenc'], ['invoicing/site.css', 'invoic']]) {
    assert.equal(sheet(rel), area(rel, word), rel);
  }
  // A database folder is named as one for a stylesheet too.
  assert.equal(sheet('db/migrate/notes.css'), 'it changes stored data in db/migrate/notes.css');
  assert.equal(sheet('src/migrations/site.css'), 'it changes stored data in src/migrations/site.css');
  // Guards: no word, nothing refused.
  for (const rel of ['src/styles/site.css', 'web/ui/button.css', 'styles/author/site.css']) assert.equal(sheet(rel), 'passed', rel);
});

test('after the re-check: a test run passes only when no failure or skip counter in its output is above zero, and its count is the sum of every summary', async () => {
  const printer = (text) => `process.stdout.write(${JSON.stringify(text)});\n`;
  const run = async (files, script) => {
    const root = makeRepo({ 'src/styles/home.css': HOME, ...files }, { testScript: script });
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    return check(root, '--run-tests', 'src/styles/home.css');
  };
  const passing = (n) => Array.from({ length: n }, (_, i) => `test('passes ${i}', () => {});`).join('\n');
  const head = "const test = require('node:test');\n";
  // Two node:test runs in a row, the first failing: the exit code is the second's.
  const twice = await run({ 'tests/a.test.js': `${head}test('fails', () => { throw new Error('no'); });\n`, 'tests/b.test.js': `${head}${passing(1)}\n` },
    'node --test tests/a.test.js; node --test tests/b.test.js');
  assert.equal(twice.verdict, 'refused', JSON.stringify(twice));
  assert.match(twice.text, /the existing tests fail/);
  // What other runners print, with exit code 0.
  const summaries = [
    ['vitest', ' Test Files  1 failed (1)\n      Tests  1 failed | 3 passed (4)\n', /the existing tests fail/],
    ['pytest, an error', '===== 2 passed, 1 error in 0.12s =====\n', /the existing tests fail/],
    ['pytest, xfailed and deselected', '===== 2 passed, 1 xfailed, 2 deselected in 0.12s =====\n', /skipped|nothing confirms/],
    ['cargo, ignored', 'test result: ok. 3 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out\n', /skipped|nothing confirms/],
    ['cargo, FAILED', 'test result: FAILED. 3 passed; 1 failed; 0 ignored\n', /the existing tests fail/],
    ['cargo, filtered out', 'test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 2 filtered out\n', /skipped|nothing confirms/],
    ['deno, ignored', 'ok | 3 passed | 0 failed | 1 ignored (12ms)\n', /skipped|nothing confirms/],
    ['playwright, flaky', '  1 flaky\n  3 passed (2.1s)\n', /skipped|nothing confirms|the existing tests fail/],
    ['failed: N', 'passed: 3\nfailed: 2\n', /the existing tests fail/],
    ['# fail N', '# pass 3\n# fail 1\n', /the existing tests fail/],
    ['a FAILED line', '3 passed\nFAILED tests/x.py::test_a - AssertionError\n', /the existing tests fail/]
  ];
  for (const [name, text] of summaries) {
    const res = await run({ 'print.js': printer(text) }, 'node print.js');
    assert.equal(res.verdict, 'refused', `${name}: ${JSON.stringify(res)}`);
    assert.match(res.text, text.length ? summaries.find((x) => x[0] === name)[2] : /x/, name);
  }
  // Two runs that pass: the count shown is the sum of both summaries.
  const sum = await run({ 'tests/a.test.js': `${head}${passing(5)}\n`, 'tests/b.test.js': `${head}${passing(1)}\n` },
    'node --test tests/a.test.js && node --test tests/b.test.js');
  assertPass(sum, ['src/styles/home.css']);
  assert.equal(sum.tests, '6 tests passed.');
  // Counters at zero, and a passing test whose name holds such words, are no failure.
  const clean = await run({ 'print.js': printer('test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out\n') }, 'node print.js');
  assertPass(clean, ['src/styles/home.css']);
  assert.equal(clean.tests, '4 tests passed.');
  // Lines a project's own tests print about failure paths they test (this repository's suite
  // prints both) are no summary: they refuse nothing (the coordinator's narrowing, 2026-10-10).
  const ownLines = await run({ 'print.js': printer('\u26a0\ufe0f  Step 14 VERIFY FAILED for demo-widget \u2014 moved to review with evidence passed:false.\n'
    + 'Security scan FAILED: 1 critical, 0 high\nRun 2 failed checks again\n# pass 3\n# fail 0\n') }, 'node print.js');
  assertPass(ownLines, ['src/styles/home.css']);
  assert.equal(ownLines.tests, '3 tests passed.');
  const named = await run({ 'tests/a.test.js': `${head}test('reports 3 failed logins', () => {});\ntest('FAILED is a word here', () => {});\n` }, SCRIPT);
  assertPass(named, ['src/styles/home.css']);
  assert.equal(named.tests, '2 tests passed.');
});

// The final re-check of b5decfc6 (the session coordinator, 2026-10-10): an escaped bracket
// ended an unquoted `url(` early for this reader and not for a browser, so `color:` inside an
// image address read as a declaration. Escapes in stylesheets had their fix in round 10 (B7);
// by the two-rounds rule that sub-area comes out: a stylesheet that holds a backslash, in the
// committed or in the changed version, never qualifies.
test('the final re-check: a stylesheet that holds a backslash never qualifies', async () => {
  const ESCAPE = (f) => `${f} holds an escape (a backslash), which the check does not read in a stylesheet`;
  const sheet = (before, after) => reasonOf(ruleRefusal(changeOf('src/styles/site.css', before, after)));
  const witness = 'a{background-image:url(x\\);color:red;/*);*/}\n';
  assert.equal(sheet(witness, witness.replace('red', 'blue')), ESCAPE('src/styles/site.css'), 'the reviewer\'s case');
  const lines = 'a {\n  background-image: url( x\\) ;\n  color: red;\n  /* ); */\n}\n';
  assert.equal(sheet(lines, lines.replace('red', 'blue')), ESCAPE('src/styles/site.css'), 'over several lines, with spaces inside url(');
  // On either side, anywhere: in a selector, a comment, a string.
  for (const [before, after] of [['.sm\\:flex { color: red }\n', '.sm\\:flex { color: blue }\n'], ['a { color: red } /* \\ */\n', 'a { color: blue } /* \\ */\n'],
    ['a { color: red; content: "\\"" }\n', 'a { color: blue; content: "\\"" }\n'], ['a { color: red }\n', 'a { color: blue } /* \\ */\n'],
    ['a { color: red } /* \\ */\n', 'a { color: blue }\n']]) {
    assert.equal(sheet(before, after), ESCAPE('src/styles/site.css'), JSON.stringify(after));
  }
  // Through the real menu, both calls.
  const root = makeRepo({ 'src/styles/site.css': witness });
  fs.writeFileSync(path.join(root, 'src/styles/site.css'), witness.replace('red', 'blue'));
  for (const args of [['src/styles/site.css'], ['--run-tests', 'src/styles/site.css']]) {
    assert.equal((await check(root, ...args)).text, refusal(ESCAPE('src/styles/site.css')));
  }
  // Two choices recorded as decided: the extension is compared without letter case, and several colour changes in one file qualify within the size limits.
  assert.equal(ruleRefusal(changeOf('site/site.CSS', 'a { color: red; }\n', 'a { color: blue; }\n')), null);
  assert.equal(ruleRefusal(changeOf('site/site.css', 'a { color: red; }\nb { fill: red; }\n', 'a { color: blue; }\nb { fill: blue; }\n')), null);
});

// The second final re-check of 2026-10-10 (the session coordinator).
test('the second final re-check: no stylesheet exception for `tokens`', () => {
  const sheet = (rel) => reasonOf(ruleRefusal(changeOf(rel, 'a { color: red; }\n', 'a { color: blue; }\n')));
  for (const rel of ['src/styles/tokens.css', 'src/styles/access-tokens.css', 'src/styles/api-tokens.css', 'src/styles/refresh.tokens.css', 'src/styles/design-tokens.css']) {
    assert.equal(sheet(rel), `${rel} sits in an area named token, and such areas are never a hotfix`, rel);
  }
});
