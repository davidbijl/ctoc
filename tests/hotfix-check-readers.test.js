'use strict';

// The hotfix check's readers: every branch of the trial build's cases (deleted and
// linked files, text that is not UTF-8, names, run output, edge shapes, projects in a
// sub-folder) and the third to sixth rounds of the page and stylesheet readers (the fourth
// round's fail-closed scanners are in tests/hotfix-check-guards.test.js).
// Moved word for word out of tests/hotfix-check.test.js by the plan
// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.
// The shared setup and this file's private temporary folder: tests/helpers/hotfix-check-harness.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const qualityAgent = require('../src/lib/quality-agent');

const {
  STATUS_LINE, NO_TEST, refusal, unreadable, gone, inexact, HOME, HOME_STORE, nodeTest,
  PASSING_TEST, SCRIPT, tmpDir, git, writeFiles, packageJson, makeRepo, testedProject, check,
  logLines, refusedUntouched, assertChecking, assertPass, runCommit, copyParent
} = require('./helpers/hotfix-check-harness');

// Every branch of the check exercised (the trial build's cases, moved to the new contract).

test('the test call refuses a deleted file or one replaced by a link before any copy, without hashing it', async () => {
  const root = makeRepo({ 'docs/old.md': 'Old page.\n', 'docs/page.md': 'A page.\n' });
  fs.rmSync(path.join(root, 'docs/old.md'));
  await refusedUntouched(root, ['--run-tests', 'docs/old.md'], 'it adds, removes or renames docs/old.md');
  let linked = true;
  try {
    fs.rmSync(path.join(root, 'docs/page.md'));
    fs.symlinkSync('old.md', path.join(root, 'docs/page.md'));
  } catch {
    linked = false; // a platform that cannot make links has no such change
  }
  if (linked) await refusedUntouched(root, ['--run-tests', 'docs/page.md'], 'I do not recognise docs/page.md as wording or a colour');
});

test('a file that is not valid UTF-8 is not text', async () => {
  const root = makeRepo({ 'docs/latin.md': Buffer.from('Café old\n', 'latin1') });
  fs.writeFileSync(path.join(root, 'docs/latin.md'), Buffer.from('Café new\n', 'latin1'));
  await refusedUntouched(root, ['docs/latin.md'], 'I could not read the change (docs/latin.md is not text)');
});

test('a name with spaces, a star and letters beyond ASCII passes, and commit.add stages exactly it', async () => {
  // A star cannot stand in a Windows file name; there the name keeps its space and letters.
  const name = process.platform === 'win32' ? 'docs/a plan \u00e9.css' : 'docs/a plan \u00e9 *.css';
  const root = makeRepo({ [name]: 'a { color: red; }\n', 'docs/a plan \u00e9 x.css': 'b { color: red; }\n',
    'tests/any.test.js': nodeTest('runs', '  assert.ok(true);') }, { testScript: SCRIPT });
  fs.writeFileSync(path.join(root, ...name.split('/')), 'a { color: blue; }\n');
  fs.writeFileSync(path.join(root, 'docs', 'a plan \u00e9 x.css'), 'b { color: blue; }\n');
  assertChecking(await check(root, name), [name]);
  const res = await check(root, '--run-tests', name);
  assertPass(res, [name]);
  assert.equal(logLines(root).pop().lines, 2);
  runCommit(root, res.commit);
  const names = spawnSync('git', ['-c', 'core.quotepath=false', 'show', '--name-only', '--format=', '-z', 'HEAD'], { cwd: root })
    .stdout.toString('utf8').split('\0').filter(Boolean);
  assert.deepEqual(names, [name], 'the star is a literal character, never a pattern');
});

test('a project folder that does not exist is "the check stopped", cleaned and capped, and never created', async () => {
  const parent = tmpDir();
  const root = path.join(parent, `missing\n${'x'.repeat(300)}`);
  const res = await check(root, 'README.md');
  assert.equal(res.text, unreadable('the check stopped'));
  assert.ok(res.detail.length > 0 && res.detail.length <= 200, res.detail);
  assert.equal(/[\u0000-\u001f]/.test(res.detail), false);
  assert.equal(fs.existsSync(root), false, 'the log never creates the missing folder');
});

test('the first failing test is read from jest, TAP and spec output, or said plainly', async () => {
  const variants = [
    ["process.stdout.write('FAIL tests/home.test.js\\n  \\u25cf home \\u203a shows Save\\n')", 'tests/home.test.js: home › shows Save'],
    ["process.stdout.write('not ok 1 - shows Save\\n')", 'shows Save'],
    ["process.stdout.write('test at tests/home.test.js:2:1\\n')", 'tests/home.test.js'],
    ["process.stdout.write('boom\\n')", 'the test command reported a failure'],
    ["process.stdout.write('not ok 1 - shows Save\\n  location: \\'' + require('url').pathToFileURL(require('path').join(process.cwd(), 'tests', 'home.test.js')).href + ':2:1\\'\\n')", 'tests/home.test.js: shows Save']
  ];
  for (const [body, shown] of variants) {
    const root = makeRepo({ 'src/styles/home.css': HOME, 'fail.js': `${body};\nprocess.exit(1);\n` }, { testScript: 'node fail.js' });
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    await refusedUntouched(root, ['--run-tests', 'src/styles/home.css'], `the existing tests fail (${shown})`);
  }
});

test('a run whose counters cannot be read is "no test ran"', async () => {
  const root = makeRepo({ 'src/styles/home.css': HOME, 'count.js': "process.stdout.write('# tests 1\\n# pass 1\\n');\n" },
    { testScript: 'node count.js' });
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  await refusedUntouched(root, ['--run-tests', 'src/styles/home.css'], NO_TEST);
});

// The decision at review of 2026-10-09: the whole suite runs in the copy. Until then a test
// file named after every judged file (`tests/home.test.html` for `home.html`) made the check
// run that selection alone, and a failing test under another name never ran.
test('the whole suite runs in the copy, whatever the test files are named', async (t) => {
  const root = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.html': '<p>marker</p>\n', 'tests/home.test.js': PASSING_TEST,
    'tests/other.test.js': PASSING_TEST.replace('has a rule', 'still has a button') }, { testScript: SCRIPT });
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  const selected = [];
  t.mock.method(qualityAgent, 'runSpecificTests', (tools, files) => { selected.push(...files); throw new Error('a selection of tests ran'); });
  const whole = [];
  const real = qualityAgent.runFullTests;
  t.mock.method(qualityAgent, 'runFullTests', (tools) => { whole.push(process.cwd()); return real(tools); });
  const res = await check(root, '--run-tests', 'src/styles/home.css');
  t.mock.restoreAll();
  assert.deepEqual(selected, [], 'no selection of tests runs');
  assertPass(res, ['src/styles/home.css']);
  assert.equal(res.tests, '2 tests passed.');
  assert.equal(whole.length, 1, 'the whole suite ran once');
  assert.equal(path.basename(copyParent(whole[0])).startsWith('ctoc-hotfix-'), true, 'and it ran in the copy');
});

test('edge shapes of every kind give the exact verdict', async () => {
  const un = (f) => `I do not recognise ${f} as wording or a colour`;
  // [path, base content, new content, expected clause, or null for the pass of the test call]
  const shapes = [
    // Since the review of 2026-10-09 an end tag with nothing to close is outside the strict subset.
    // A change of line endings alone is no changed line (its log line counts none, asserted
    // below), and no colour: the number of carriage returns stays as it is.
    ['src/styles/endings.css', 'a { color: red; }\nb { color: red; }\n', 'a { color: red; }\r\nb { color: red; }\r\n', un('src/styles/endings.css')],
    ['src/styles/start.css', 'a {\n  color:\nred;\n}\n', 'a {\n  color:\nblue;\n}\n', un('src/styles/start.css')],
    ['src/styles/two.css', 'a { border: 1px solid red; color: blue; }\n', 'a { border: 1px solid red; color: green; }\n', NO_TEST],
    ['src/styles/grow.css', 'a { color: red; }\n', 'a { color: red; }\nb { color: red; }\n', un('src/styles/grow.css')],
    ['src/esc.js', 'say("Say \\"hi\\"");\n', 'say("Say \\"hey\\"");\n', 'it changes text inside program code in src/esc.js, and no check can tell whether people read that text or the program depends on it'],
    ['src/open.js', 'const s = "abc\n', 'const s = "abd\n', 'it changes program logic in src/open.js, and only wording and colours qualify'],
    ['src/tpl.js', 'say(`Hi ${name}`);\n', 'say(`Hey ${name}`);\n', 'it changes program logic in src/tpl.js, and only wording and colours qualify'],
    ['src/bt.js', 'say(`Hi there`);\n', 'say(`Hey there`);\n', 'it changes text inside program code in src/bt.js, and no check can tell whether people read that text or the program depends on it'],
    ['public/ads.txt', 'example.com, 1, DIRECT\n', 'example.org, 1, DIRECT\n', 'it changes a setting in public/ads.txt, and settings changes are a common cause of outages'],
    ['public/app-ads.txt', 'example.com, 1, DIRECT\n', 'example.org, 1, DIRECT\n', 'it changes a setting in public/app-ads.txt, and settings changes are a common cause of outages'],
    ['public/.well-known/security.txt', 'Contact: a\n', 'Contact: b\n', 'it changes a setting in public/.well-known/security.txt, and settings changes are a common cause of outages'],
    ['public/LLMS.txt', 'Old guide.\n', 'New guide.\n', 'it changes a setting in public/LLMS.txt, and settings changes are a common cause of outages'],
    ['src/settings/.env', 'MODE=old\n', 'MODE=new\n', 'it changes a setting in src/settings/.env, and settings changes are a common cause of outages'],
    ['tools/webpack.config.js', 'module.exports = {};\n', 'module.exports = { a: 1 };\n', 'it changes how the project is built or shipped in tools/webpack.config.js'],
    ['docs/CLAUDE.md', 'Old rule.\n', 'New rule.\n', un('docs/CLAUDE.md')],
    ['skills/x/helper.js', 'f(1);\n', 'f(2);\n', 'it changes program logic in skills/x/helper.js, and only wording and colours qualify'],
    // A change of line endings alone is no changed line (its log line counts none, asserted
    // below), and no wording: the number of carriage returns stays as it is in a page.
    // The security check's second round: a `value` inside another attribute's value is no
    // `value` attribute. A stray `}` in a tag was harmless; since the sixth round (the
    // session's decision of 2026-10-09: the strict HTML subset) a brace anywhere inside a tag
    // puts the file outside the subset, so this former pass refuses.
    // The owner's decision of 2026-10-09: the check keeps only the formats it reads exactly, so
    // these cases of a removed format (Vue, Svelte, JSX, reStructuredText, Sass, Less, gettext)
    // stay, and each now asserts the "not recognised" refusal.
    ['src/components/Close.jsx', '  <span>Save</span>\n', '  <span>Store</span>\n', gone('src/components/Close.jsx')],
    ['src/components/Shut.jsx', '  </span>Save</span>\n', '  </span>Store</span>\n', gone('src/components/Shut.jsx')],
    ['src/components/Other.jsx', '  <span>Save</b>\n', '  <span>Store</b>\n', gone('src/components/Other.jsx')],
    ['src/components/Longer.jsx', '  <span>Save</spanx>\n', '  <span>Store</spanx>\n', gone('src/components/Longer.jsx')],
    ['translations/id.po', 'msgid "Save"\nmsgstr "S"\n', 'msgid "Store"\nmsgstr "S"\n', gone('translations/id.po')],
    ['translations/plural.po', 'msgid "x"\nmsgstr[1] "Saves"\n', 'msgid "x"\nmsgstr[1] "Stores"\n', gone('translations/plural.po')],
    ['src/styles/mixin.scss', '@include theme(red);\n', '@include theme(blue);\n', gone('src/styles/mixin.scss')],
    ['src/components/Click.jsx', '  <button onClick={() => go(a > b)}>Save</button>\n', '  <button onClick={() => go(a > b)}>Store</button>\n', gone('src/components/Click.jsx')]
  ];
  const base = {};
  for (const [p, b] of shapes) base[p] = b;
  const root = makeRepo(base);
  for (const [p, b, n, expected] of shapes) {
    fs.writeFileSync(path.join(root, ...p.split('/')), n);
    const res = await check(root, '--run-tests', p);
    if (expected === null) assertPass(res, [p]);
    else assert.equal(res.text, refusal(expected), `${p}: ${JSON.stringify(res)}`);
    fs.writeFileSync(path.join(root, ...p.split('/')), b);
  }
  // Files named out of order are judged in path order: both qualify, and with no test command no test ran.
  writeFiles(root, { 'src/styles/second.css': 'a { color: red; }\n' });
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', 'second']);
  fs.writeFileSync(path.join(root, 'src/styles/second.css'), 'a { color: blue; }\n');
  fs.writeFileSync(path.join(root, 'src/styles/endings.css'), 'a { color: blue; }\nb { color: red; }\n');
  const twoFiles = await check(root, 'src/styles/second.css', 'src/styles/endings.css');
  assertChecking(twoFiles, ['src/styles/endings.css', 'src/styles/second.css']);
  assert.equal((await check(root, '--run-tests', 'src/styles/second.css', 'src/styles/endings.css')).text, refusal(NO_TEST));
  fs.writeFileSync(path.join(root, 'src/styles/second.css'), 'a { color: red; }\n');
  fs.writeFileSync(path.join(root, 'src/styles/endings.css'), 'a { color: red; }\nb { color: red; }\n');
  writeFiles(root, { 'src/styles/nonl.css': 'a { color: red; }' });
  assert.equal((await check(root, 'src/styles/nonl.css')).text, refusal('it adds, removes or renames src/styles/nonl.css'));
  const lines = logLines(root);
  assert.equal(lines[lines.length - 1].lines, 1, 'a new file without a final newline counts its one line');
  const endings = shapes.findIndex((x) => x[0] === 'src/styles/endings.css');
  assert.deepEqual([lines[endings].verdict, lines[endings].lines], ['refused', 0], 'line endings alone are no changed line');
  assert.equal(lines.filter((l) => l.verdict === 'hotfix').length, 0, 'with no test command nothing passes');
  // git lists changed files before new ones; the check still judges in path order.
  fs.rmSync(path.join(root, 'src/styles/nonl.css'));
  fs.writeFileSync(path.join(root, 'src/styles/endings.css'), 'a { color: blue; }\nb { color: red; }\n');
  writeFiles(root, { 'src/styles/aaa.css': 'a { color: red; }\n' });
  assert.equal((await check(root, 'src/styles/endings.css', 'src/styles/aaa.css')).text, refusal('it adds, removes or renames src/styles/aaa.css'));
});

test('a project in a sub-folder of the repository judges only its own files, shown from its own root', async () => {
  const repo = makeRepo({ 'app/page.css': 'a { color: red; }\n', 'other/page.css': 'b { color: red; }\n',
    'app/package.json': packageJson(SCRIPT), 'app/tests/page.test.js': nodeTest('has a page', "  assert.ok(read('page.css').includes('color'));") });
  fs.writeFileSync(path.join(repo, 'app/page.css'), 'a { color: blue; }\n');
  fs.writeFileSync(path.join(repo, 'other/page.css'), 'b { color: blue; }\n');
  const app = path.join(repo, 'app');
  assertChecking(await check(app), ['page.css']);
  assertPass(await check(app, '--run-tests'), ['page.css']);
  assertPass(await check(app, '--run-tests', 'page.css'), ['page.css']);
});

test('a test location that is not a readable file address is shown as written', async () => {
  const body = "process.stdout.write('not ok 1 - shows Save\\n  location: \\'file://remote/tests/home.test.js:2:1\\'\\n')";
  const root = makeRepo({ 'src/styles/home.css': HOME, 'fail.js': `${body};\nprocess.exit(1);\n` }, { testScript: 'node fail.js' });
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  const res = await check(root, '--run-tests', 'src/styles/home.css');
  assert.equal(res.text, refusal(process.platform === 'win32'
    ? 'the existing tests fail (//remote/tests/home.test.js: shows Save)'
    : 'the existing tests fail (file://remote/tests/home.test.js: shows Save)'));
});

test('a log folder that cannot be written changes no answer', async () => {
  const root = testedProject();
  const ctoc = path.join(root, '.ctoc');
  fs.mkdirSync(ctoc);
  fs.chmodSync(ctoc, 0o555);
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  let res;
  try {
    res = await check(root, '--run-tests', 'src/styles/home.css');
  } finally {
    fs.chmodSync(ctoc, 0o755);
  }
  assertPass(res, ['src/styles/home.css']);
  // Permissions bind only a non-administrator account on a system that enforces them.
  const enforced = process.platform !== 'win32' && typeof process.getuid === 'function' && process.getuid() !== 0;
  if (enforced) assert.equal(fs.existsSync(path.join(ctoc, 'logs')), false);
});

// The fourth round (2026-10-09): the security attack and the code review, each through
// the first call. [path, base content, new content, the clause, or null for `checking`]
// Renamed at review (2026-10-09): since the owner's decision of that day the check reads plain
// HTML, plain CSS, catalogues, Markdown and plain text only, so the rows on conditional
// templates, Sass variables, reStructuredText literal blocks and directives, and TypeScript
// generics now assert that each such file is a kind the check does not recognise.
test('round 4: components and code elements in HTML, custom properties; Vue, JSX, Sass, Less and reStructuredText files are not recognised', async () => {
  const un = (f) => `I do not recognise ${f} as wording or a colour`;
  const setting = (f) => `it changes a setting in ${f}, and settings changes are a common cause of outages`;
  const shapes = [
    // Only HTML host elements carry wording, and nothing anywhere inside a component.
    // The fifth round (2026-10-09): element names are matched in any letter case, as HTML reads
    // them, so `<DIV>` is the host element `div` and its text is wording (it was refused).
    // Code elements: an end tag of another element does not leave one.
    // The fifth round (2026-10-09): an end tag that does not close the element on top while a
    // code element is open cannot be followed; since the sixth round that is HTML outside the
    // strict subset, with the functional plan's sentence for it.
    // Custom properties: a change to a value that is no colour; colours in real colour properties.
    ['src/styles/font.css', ':root { --font: "Old"; }\n', ':root { --font: "New"; }\n', setting('src/styles/font.css')],
    ['src/styles/width.css', 'a { width: #fff; }\n', 'a { width: #000; }\n', un('src/styles/width.css')],
    ['src/styles/fill.css', 'path { fill: red; stroke: blue; outline-color: red; }\n', 'path { fill: blue; stroke: red; outline-color: blue; }\n', null],
    // (A stylesheet named for design tokens passed until the second final re-check of 2026-10-10, which took the exception out.)
    ['src/styles/design-tokens.css', '.a { border-color: red; }\n', '.a { border-color: blue; }\n', 'src/styles/design-tokens.css sits in an area named token, and such areas are never a hotfix'],
    // The owner's decision of 2026-10-09: the check keeps only the formats it reads exactly, so
    // these cases of a removed format (Vue, Svelte, JSX, reStructuredText, Sass, Less, gettext)
    // stay, and each now asserts the "not recognised" refusal.
    ['src/components/Deep.jsx', 'export const D = () => <Box><p>Save</p></Box>;\n', 'export const D = () => <Box><p>Store</p></Box>;\n', gone('src/components/Deep.jsx')],
    ['src/components/Member.jsx', 'export const M = () => <ui.p>Save</ui.p>;\n', 'export const M = () => <ui.p>Store</ui.p>;\n', gone('src/components/Member.jsx')],
    ['src/components/Frag.jsx', 'export const F = () => <><p>Save</p></>;\n', 'export const F = () => <><p>Store</p></>;\n', gone('src/components/Frag.jsx')],
    ['src/components/Head.svelte', '<svelte:head><title>Save</title></svelte:head>\n', '<svelte:head><title>Store</title></svelte:head>\n', gone('src/components/Head.svelte')],
    ['src/components/Kbd.jsx', 'export const K = () => <p><kbd>Ctrl</kbd></p>;\n', 'export const K = () => <p><kbd>Alt</kbd></p>;\n', gone('src/components/Kbd.jsx')],
    ['src/components/Else.vue', '<template>\n  <div>\n    <template v-if="a">Hi</template>\n    <template v-else>Save</template>\n  </div>\n</template>\n', '<template>\n  <div>\n    <template v-if="a">Hi</template>\n    <template v-else>Store</template>\n  </div>\n</template>\n', gone('src/components/Else.vue')],
    ['src/components/ElseIf.vue', '<template>\n  <template v-else-if="b"><p>Save</p></template>\n</template>\n', '<template>\n  <template v-else-if="b"><p>Store</p></template>\n</template>\n', gone('src/components/ElseIf.vue')],
    ['src/components/Loop.vue', '<template>\n  <template v-for="x in xs"><p>Save</p></template>\n</template>\n', '<template>\n  <template v-for="x in xs"><p>Store</p></template>\n</template>\n', gone('src/components/Loop.vue')],
    ['src/components/SlotIf.vue', '<template>\n  <template #x v-if="a"><p>Save</p></template>\n</template>\n', '<template>\n  <template #x v-if="a"><p>Store</p></template>\n</template>\n', gone('src/components/SlotIf.vue')],
    ['src/components/InSlot.vue', '<template>\n  <template #x><template v-if="a"><p>Save</p></template></template>\n</template>\n', '<template>\n  <template #x><template v-if="a"><p>Store</p></template></template>\n</template>\n', gone('src/components/InSlot.vue')],
    ['src/styles/gap.less', '@gap: 4px;\na { color: red; }\n', '@gap: 8px;\na { color: red; }\n', gone('src/styles/gap.less')],
    ['src/styles/map.scss', '$theme: (\n  main: red,\n  alt: blue\n);\n', '$theme: (\n  main: red,\n  alt: green\n);\n', gone('src/styles/map.scss')],
    ['src/styles/beside.scss', '$brand: #0a58ca;\na { color: red; }\n', '$brand: #0a58ca;\na { color: blue; }\n', gone('src/styles/beside.scss')],
    ['docs/quoted.rst', 'Run this::\n\n> pip install requests\n', 'Run this::\n\n> pip install reqests\n', gone('docs/quoted.rst')],
    ['docs/nested.rst', '.. note::\n\n   Old words.\n\n   .. code-block:: sh\n\n      pip install requests\n', '.. note::\n\n   Old words.\n\n   .. code-block:: sh\n\n      pip install reqests\n', gone('docs/nested.rst')],
    ['docs/note-body.rst', '.. note::\n\n   Old words.\n\n   .. code-block:: sh\n\n      pip install requests\n', '.. note::\n\n   New words.\n\n   .. code-block:: sh\n\n      pip install requests\n', gone('docs/note-body.rst')],
    ['docs/warning-line.rst', '.. warning:: Old words.\n', '.. warning:: New words.\n', gone('docs/warning-line.rst')],
    ['docs/to-raw.rst', '.. note:: Old words.\n', '.. raw:: Old words.\n', gone('docs/to-raw.rst')],
    ['docs/mid.rst', 'Use a :: in the middle, old words.\n\n   Quoted old words.\n', 'Use a :: in the middle, new words.\n\n   Quoted new words.\n', gone('docs/mid.rst')],
    ['docs/footnote.rst', 'Old words.\n\n.. [1] Old note.\n', 'Old words.\n\n.. [1] New note.\n', gone('docs/footnote.rst')],
    ['docs/note-literal.rst', '.. note:: Run this::\n\n   pip install requests\n', '.. note:: Run this::\n\n   pip install reqests\n', gone('docs/note-literal.rst')],
    ['src/components/Ext.tsx', 'export const f = <T extends object>(x: T) => x;\nexport const s = "<b>Save</b>";\n', 'export const f = <T extends object>(x: T) => x;\nexport const s = "<b>Store</b>";\n', gone('src/components/Ext.tsx')],
    ['src/components/Const.tsx', 'export const f = <const T,>(x: T) => x;\nexport const s = "<b>Save</b>";\n', 'export const f = <const T,>(x: T) => x;\nexport const s = "<b>Store</b>";\n', gone('src/components/Const.tsx')],
    ['src/components/In.tsx', 'export const P = () => <in >Save</in>;\n', 'export const P = () => <in >Store</in>;\n', gone('src/components/In.tsx')],
    ['src/components/Arrow.tsx', 'export const f = <T extends () => void,>(x: T) => x;\nexport const P = () => <p>Save</p>;\n', 'export const f = <T extends () => void,>(x: T) => x;\nexport const P = () => <p>Store</p>;\n', gone('src/components/Arrow.tsx')]
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

test('round 4: CTOC\'s enforcement list applies only in CTOC\'s own repository', async () => {
  const notes = { 'src/hooks/notes.css': HOME };
  const ctoc = makeRepo({ ...notes, 'package.json': '{ "name": "ctoc" }\n', 'CLAUDE.md': '# CTOC Project Instructions\n', '.ctoc/keep.json': '{}\n' });
  fs.writeFileSync(path.join(ctoc, 'src', 'hooks', 'notes.css'), HOME_STORE);
  assert.equal((await check(ctoc, 'src/hooks/notes.css')).text,
    refusal('src/hooks/notes.css sits in an area named enforcement, and such areas are never a hotfix'));
  const react = makeRepo({ ...notes, 'package.json': '{ "name": "web" }\n', 'CLAUDE.md': '# Web\n', '.ctoc/keep.json': '{}\n' });
  fs.writeFileSync(path.join(react, 'src', 'hooks', 'notes.css'), HOME_STORE);
  assertChecking(await check(react, 'src/hooks/notes.css'), ['src/hooks/notes.css']);
});

// Renamed at review (2026-10-09): the rows on template literals, Vue and JSX templates and
// Sass now assert that each such file is a kind the check does not recognise.
test('round 3: the whole-file scanners read script escape states, titles, comments and stylesheet strings; JSX, Vue, Sass and reStructuredText files are not recognised', async () => {
  const un = (f) => `I do not recognise ${f} as wording or a colour`;
  const shapes = [
    // A script block's escape states: `</script>` inside `<!--<script>` does not end it.
    // A title is wording (the code review, 2026-10-09: it was wrongly refused).
    // A CDATA section inside `<svg>`: outside the strict subset.
    // Stylesheets: a colour function in its space form, a string, a colour beside a `url(…)`.
    // A pass until the tenth round: a colour function is read in its comma form only.
    ['src/styles/space.css', 'a { color: rgb(1 2 3 / 50%); }\n', 'a { color: rgb(1 2 4 / 50%); }\n', un('src/styles/space.css')],
    ['src/styles/comma.css', 'a { color: rgba(1, 2, 3, 50%); }\n', 'a { color: rgba(1, 2, 4, 50%); }\n', null],
    ['src/styles/badfn.css', 'a { color: rgb(1 2 3); }\n', 'a { color: rgb(1 2 3 / 4 / 5); }\n', un('src/styles/badfn.css')],
    ['src/styles/str.css', 'a { color: red; content: "x"; }\n', 'a { color: red; content: "y"; }\n', un('src/styles/str.css')],
    // A pass until the sixth round: the colour is not the whole value of its property, which
    // the functional plan (amended 2026-10-09) refuses as a change the check cannot read exactly.
    ['src/styles/quoted.css', 'a { background: url("one.png") red; }\n', 'a { background: url("one.png") blue; }\n', inexact('src/styles/quoted.css')],
    // GitHub's assistant folders stay governing under `.github/`; every other file there is the build.
    // The owner's decision of 2026-10-09: the check keeps only the formats it reads exactly, so
    // these cases of a removed format (Vue, Svelte, JSX, reStructuredText, Sass, Less, gettext)
    // stay, and each now asserts the "not recognised" refusal.
    ['src/components/Tpl.jsx', 'export const T = () => <p className={`a ${b}`}>Save</p>;\n', 'export const T = () => <p className={`a ${b}`}>Store</p>;\n', gone('src/components/Tpl.jsx')],
    ['src/components/Re.jsx', 'const r = /[/]x/g;\nexport const B = () => <br/>;\nexport const P = () => <p>Save</p>;\nconst q = /abc', 'const r = /[/]x/g;\nexport const B = () => <br/>;\nexport const P = () => <p>Store</p>;\nconst q = /abc', gone('src/components/Re.jsx')],
    ['src/components/Str.jsx', "export const P = () => <p>Save</p>;\nconst s = 'abc", "export const P = () => <p>Store</p>;\nconst s = 'abc", gone('src/components/Str.jsx')],
    ['src/components/Tick.jsx', 'export const P = () => <p>Save</p>;\nconst t = `abc', 'export const P = () => <p>Store</p>;\nconst t = `abc', gone('src/components/Tick.jsx')],
    ['src/components/Gen.tsx', 'const f = <T,>(x: T) => x;\nexport const P = () => <p>Save</p>;\n', 'const f = <T,>(x: T) => x;\nexport const P = () => <p>Store</p>;\n', gone('src/components/Gen.tsx')],
    ['src/components/Slot.vue', '<template>\n  <template v-if="a"><p>Save</p></template>\n  <p>Hi</p>\n</template>\n', '<template>\n  <template v-if="a"><p>Store</p></template>\n  <p>Hi</p>\n</template>\n', gone('src/components/Slot.vue')],
    ['src/components/After.vue', '<template>\n  <template v-if="a"><p>Hi</p></template>\n  <p>Save</p>\n</template>\n', '<template>\n  <template v-if="a"><p>Hi</p></template>\n  <p>Store</p>\n</template>\n', gone('src/components/After.vue')],
    ['src/components/Each.svelte', '{#if a}<p>Hi</p>{/if}\n<p>Save</p>\n', '{#if a}<p>Hi</p>{/if}\n<p>Store</p>\n', gone('src/components/Each.svelte')],
    ['translations/esc.po', 'msgid "x"\nmsgstr "Speichern"\n', 'msgid "x"\nmsgstr "Sp\\x65ichern \\101b"\n', gone('translations/esc.po')],
    ['translations/bad.po', 'msgid "x"\nmsgstr "Speichern"\n', 'msgid "x"\nmsgstr "Spei\\qchern"\n', gone('translations/bad.po')],
    ['translations/nohex.po', 'msgid "x"\nmsgstr "Speichern"\n', 'msgid "x"\nmsgstr "Spei\\xzhern"\n', gone('translations/nohex.po')],
    ['src/styles/main.scss', '$brand: #0a58ca; // main\n', '$brand: #0b5ed7; // main\n', gone('src/styles/main.scss')],
    ['src/styles/note.scss', '$brand: #0a58ca; // main\n', '$brand: #0a58ca; // other\n', gone('src/styles/note.scss')],
    ['src/styles/end.scss', 'a { color: #0a58ca; } // main', 'a { color: #0b5ed7; } // main', gone('src/styles/end.scss')],
    ['src/styles/block.sass', 'a\n  color: red\n\n  display: none\n', 'a\n  color: blue\n\n  display: none\n', gone('src/styles/block.sass')],
    ['src/styles/sel.sass', 'nav:hover #add\n  display: none\n', 'nav:hover #bad\n  display: none\n', gone('src/styles/sel.sass')],
    ['src/styles/top.sass', 'color: red\n', 'color: blue\n', gone('src/styles/top.sass')],
    ['docs/sub.rst', 'Title\n=====\n\n.. |logo| raw:: html\n\n   <b>one</b>\n\nOld words.\n', 'Title\n=====\n\n.. |logo| raw:: html\n\n   <b>two</b>\n\nOld words.\n', gone('docs/sub.rst')],
    ['docs/note.rst', 'Title\n=====\n\n.. note::\n\n   Old words.\n', 'Title\n=====\n\n.. note::\n\n   New words.\n', gone('docs/note.rst')],
    ['docs/jinja.rst', 'Title\n=====\n\nOld words.\n', 'Title\n=====\n\nNew {{ words }}.\n', gone('docs/jinja.rst')],
    ['docs/target.rst', 'Old words.\n\n.. _guide: /one\n', 'Old words.\n\n.. _guide: /two\n', gone('docs/target.rst')],
    ['docs/hyper.rst', 'See `Go <a.html>`_ now.\n', 'See `Go <b.html>`_ now.\n', gone('docs/hyper.rst')],
    ['docs/hyper-text.rst', 'See `Go <a.html>`_ now.\n', 'See `Go <a.html>`_ today.\n', gone('docs/hyper-text.rst')],
    ['docs/named.rst', 'See `Guide`_ now.\n', 'See `Other`_ now.\n', gone('docs/named.rst')],
    ['docs/literal.rst', 'Run ``pip install requests`` now.\n', 'Run ``pip install reqests`` now.\n', gone('docs/literal.rst')],
    ['docs/interp.rst', 'Read `old` now.\n', 'Read `new` now.\n', gone('docs/interp.rst')],
    ['docs/default.rst', 'Old words.\n', '.. default-role:: raw-html\n\nOld words.\n', gone('docs/default.rst')]
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

// The fifth round (2026-10-09): the fixes that still apply after the owner's decision to
// keep only the formats the check reads exactly. Each trap answered `checking` on
// `6de2f75c`. [fix, path, base content, new content, the clause, or null for `checking`]
test('round 5: host elements, the element stack, stylesheet names, custom properties', async () => {
  const un = (f) => `I do not recognise ${f} as wording or a colour`;
  const lost = (f) => `I could not read the change (${f} holds something I cannot follow)`;
  const setting = (f) => `it changes a setting in ${f}, and settings changes are a common cause of outages`;
  const area = (f, word) => `${f} sits in an area named ${word}, and such areas are never a hotfix`;
  /** One row from a template holding `@`, replaced by the old and the new text. */
  const row = (fix, p, template, [o, n], expected) => [fix, p, template.replace('@', o), template.replace('@', n), expected];
  const shapes = [
    // 1. Host elements are a fixed list (the 111 HTML element names; since the sixth round
    // `<svg>` and `<math>` are opaque pieces and their names are no host elements), matched in
    // any letter case; an element with an `is` attribute, a custom element and an unknown name
    // hold their text.
    // Passes until the sixth round: `<svg>` and `<math>` are opaque pieces now, so text
    // inside them no longer qualifies (the session's decision of 2026-10-09, item 3).
    // 2. A stack of open elements: an end tag that does not close the top of the stack while
    // an element that holds text is open cannot be followed.
    // A pass until the review of 2026-10-09: an end tag that closes nothing is outside the
    // strict subset (the reviewer's general rule; a browser makes an empty element for `</p>`).
    // A pass until the sixth round: a brace inside a tag is outside the strict HTML subset
    // (the session's decision of 2026-10-09, item 1; a browser knows no braces).
    // 7. `listing` and `tt` are code elements.
    // 8. A stylesheet's own name: a sensitive word still counts, its plural does not.
    row(8, 'src/styles/login.css', 'a { color: @; }\n', ['red', 'blue'], area('src/styles/login.css', 'login')),
    row(8, 'src/styles/payment.css', 'a { color: @; }\n', ['red', 'blue'], area('src/styles/payment.css', 'payment')),
    // (A stylesheet named for design tokens passed until the second final re-check of 2026-10-10, which took the exception out.)
    row(8, 'src/styles/tokens.css', 'a { color: @; }\n', ['red', 'blue'], area('src/styles/tokens.css', 'token')),
    row(8, 'src/tokens/base.css', 'a { color: @; }\n', ['red', 'blue'], area('src/tokens/base.css', 'token')),
    // 9. A changed custom property is a setting, whatever it is named and whatever it holds
    // (the tenth round, the session coordinator's decision of 2026-10-10: custom properties
    // never qualify; until then one named for a colour and holding exactly one colour did).
    row(9, 'src/styles/enabled.css', ':root { --enabled: @; }\n', ['green', 'red'], setting('src/styles/enabled.css')),
    row(9, 'src/styles/color-mode.css', ':root { --color-mode: @; }\n', ['dark', 'light'], setting('src/styles/color-mode.css')),
    row(9, 'src/styles/two-tokens.css', ':root { --brand-color: @; }\n', ['red', 'red url(x)'], setting('src/styles/two-tokens.css')),
    row(9, 'src/styles/var.css', ':root { --color-a: var(--@); }\n', ['b', 'c'], setting('src/styles/var.css')),
    row(9, 'src/styles/important.css', ':root { --color-a: @ !important; }\n', ['red', 'blue'], setting('src/styles/important.css')),
    row(9, 'src/styles/commented.css', ':root { --color-a: @ /* x */; }\n', ['red', 'blue'], setting('src/styles/commented.css')),
    row(9, 'src/styles/renamed.css', ':root { --color-@: red; }\n', ['a', 'b'], setting('src/styles/renamed.css')),
    row(9, 'src/styles/and-more.css', ':root { --color-a: @; }\na { width: 1px; }\n', ['red', 'blue; }\na { width: 2px; }\nb { --x: y'], setting('src/styles/and-more.css')),
    row(9, 'src/styles/color-brand.css', ':root {\n  --color-brand: @;\n}\n', ['#0b5ed7', '#1a73e8'], setting('src/styles/color-brand.css')),
    row(9, 'src/styles/button-colour.css', ':root { --button-colour: @; }\n', ['red', 'blue'], setting('src/styles/button-colour.css')),
    row(9, 'src/styles/upper.css', ':root { --Brand-COLOR: @; }\n', ['RED', 'Transparent'], setting('src/styles/upper.css')),
    [9, 'src/styles/both.css', ':root { --color-a: red; }\na { color: red; }\n', ':root { --color-a: blue; }\na { color: blue; }\n', setting('src/styles/both.css')],
    // A real colour property beside a custom property that stays as it is still qualifies.
    [9, 'src/styles/beside.css', ':root { --color-a: red; }\na { color: red; }\n', ':root { --color-a: red; }\na { color: blue; }\n', null],
    // A custom property whose declaration this reader does not vouch for (a comment before its colon) is refused too.
    row(9, 'src/styles/comment-name.css', ':root { --color-a /* x */ : @; }\n', ['red', 'blue'], un('src/styles/comment-name.css')),
    row(9, 'src/styles/string-open.css', 'a { color: @; }\nb { content: "x', ['red', 'blue'], 'I could not read the change (src/styles/string-open.css leaves a string, a comment, a bracket or a block open)'),
    row(9, 'src/styles/ruleset.css', ':root { --color-a: { color: @ } }\n', ['red', 'blue'], lost('src/styles/ruleset.css'))
  ];
  const base = {};
  for (const [, p, b] of shapes) base[p] = b;
  const root = makeRepo(base);
  const wrong = [];
  for (const [fix, p, b, n, expected] of shapes) {
    fs.writeFileSync(path.join(root, ...p.split('/')), n);
    const res = await check(root, p);
    fs.writeFileSync(path.join(root, ...p.split('/')), b);
    const want = expected === null ? STATUS_LINE : refusal(expected);
    if (res.text !== want) wrong.push(`fix ${fix} ${p}: ${res.verdict === 'checking' ? 'checking' : res.text}`);
    else if (expected === null) assertChecking(res, [p]);
  }
  assert.deepEqual(wrong, []);
});

// The sixth round (2026-10-09): the strict HTML subset (the session's design decision: the
// HTML reader accepts only what it reads as a browser's parser does, and refuses the whole
// file for anything else), Markdown imports, autolinks, headings and paragraphs, folded and
// camel-case paths, and the functional plan's sentence for a change the check cannot read
// exactly. Each row marked `red` answered otherwise on `5326daae`; the others are guards.
// [item, path, base content, new content, the clause, or null for `checking`]
test('round 6: folded paths, colours that are no whole value, the cannot-read-exactly sentence', async () => {
  const un = (f) => `I do not recognise ${f} as wording or a colour`;
  const exact = (f) => `it changes ${f} in a way the check cannot read exactly, and only what it can read exactly qualifies`;
  const setting = (f) => `it changes a setting in ${f}, and settings changes are a common cause of outages`;
  const area = (f, word) => `${f} sits in an area named ${word}, and such areas are never a hotfix`;
  /** One row from a template holding `@`, replaced by the old and the new text. */
  const row = (item, p, template, [o, n], expected) => [item, p, template.replace('@', o), template.replace('@', n), expected];
  const shapes = [
    // 1. A brace inside a tag is outside the subset; in text it is a plain character.
    // 2. Anything starting `<!` but `<!DOCTYPE html>` and a standard comment; `<?`; `</` before
    // no letter; the same inside a script block; a closing tag ends only before HTML white space.
    // 3. `<svg>` and `<math>` are opaque from their start tag to their matching end tag; the
    // host elements are HTML's only; inside foreign content nothing HTML is followed.
    // Inside `<select>` only options are followed: an older parser ignores every other tag there.
    // An element never closed is outside the subset (the functional plan's scenario); an end
    // tag that closes several elements is everyday HTML.
    // 9 and 10. The path is folded (Unicode NFKC, lower case) and split at every character
    // that is no letter; camel-case sub-words count as words too.
    // A pass until the tenth round: a sensitive word counts anywhere inside a part of the path.
    row(10, 'src/styles/brandTokens.css', 'a { color: @; }\n', ['red', 'blue'], area('src/styles/brandTokens.css', 'token')),
    // The functional plan's fifth case: a colour that is not the whole value of a colour
    // property. (A custom property is a setting since the tenth round, whatever its name.)
    row('colour', 'src/styles/border.css', '.save { border: 1px solid @; }\n', ['#0a58ca', '#0b5ed7'], exact('src/styles/border.css')),
    // `box-shadow` is no colour shorthand since the re-check of 2026-10-10 (a bare colour is no valid value of it).
    row('colour', 'src/styles/shadow.css', 'a { box-shadow: 0 0 2px @; }\n', ['red', 'blue'], un('src/styles/shadow.css')),
    row('colour', 'src/styles/two-tokens.css', ':root { --brand-color: @; }\n', ['red', 'red url(x)'], setting('src/styles/two-tokens.css')),
    row('colour', 'src/styles/color-mode.css', ':root { --color-mode: @; }\n', ['dark', 'light'], setting('src/styles/color-mode.css')),
    row('colour', 'src/styles/enabled.css', ':root { --enabled: @; }\n', ['green', 'red'], setting('src/styles/enabled.css')),
    row('colour', 'src/styles/whole.css', 'a { border: @; outline-color: @ }\n', ['red', 'blue'], null),
    row('colour', 'src/styles/important.css', 'a { color: @ !important; }\n', ['red', 'blue'], null),
    row('colour', 'src/styles/width.css', 'a { width: @; }\n', ['#fff', '#000'], un('src/styles/width.css'))
  ];
  const base = {};
  for (const [, p, b] of shapes) base[p] = b;
  const root = makeRepo(base);
  const wrong = [];
  for (const [item, p, b, n, expected] of shapes) {
    fs.writeFileSync(path.join(root, ...p.split('/')), n);
    const res = await check(root, p);
    fs.writeFileSync(path.join(root, ...p.split('/')), b);
    const want = expected === null ? STATUS_LINE : refusal(expected);
    if (res.text !== want) wrong.push(`item ${item} ${p}: ${res.verdict === 'checking' ? 'checking' : res.text}`);
    else if (expected === null) assertChecking(res, [p]);
  }
  assert.deepEqual(wrong, []);
  // The sentence a person reads is one plain sentence, and the log keeps today's cause words.
  fs.writeFileSync(path.join(root, 'src/styles/border.css'), '.save { border: 1px solid #0b5ed7; }\n');
  assert.equal((await check(root, 'src/styles/border.css')).text,
    'I did not treat this as a hotfix because it changes src/styles/border.css in a way the check cannot read exactly, '
    + 'and only what it can read exactly qualifies; it goes through a normal plan, and your edits stay in place, not committed.');
  fs.writeFileSync(path.join(root, 'src/styles/two-tokens.css'), ':root { --brand-color: red url(x); }\n');
  await check(root, 'src/styles/two-tokens.css');
  assert.deepEqual(logLines(root).slice(-2).map((l) => l.cause), ['unrecognised', 'setting']);
});
