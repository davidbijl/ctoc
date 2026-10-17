'use strict';

// The hotfix check, driven the way a session drives it: through the menu router
// (`route(['hotfix', 'check', ...])`) against a real temporary git repository, and once
// through the real menu process (`node src/commands/start.js hotfix check ...`).
// Plan: plans/todo/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s1-the-hotfix-check.md,
// Step 8, cases 1 to 53, and the branch cases of the trial build moved to the new contract.
//
// Every check runs with the system temporary folder pointed at a folder of this file's own
// (TMPDIR, TEMP and TMP), so "no `ctoc-hotfix-` folder remains" is exact: nothing else
// makes one there. Fixture tests that must report where they ran write under the folder
// named by CTOC_HOTFIX_PROBE, outside both repositories.
//
// Since 2026-10-12 this file holds one area of those cases: the passes and refusals through
// the menu (cases 1 to 23, 25 and 27; case 26 is checked inside case 1), the ninth round's size
// rule and its names that are dependencies, the build or settings, the tenth round's table of
// every removed extension, and its refusals through the real menu process. The other
// areas are tests/hotfix-check-test-run.test.js, tests/hotfix-check-copy-and-log.test.js,
// tests/hotfix-check-review-findings.test.js, tests/hotfix-check-readers.test.js and
// tests/hotfix-check-guards.test.js; the shared setup and the private temporary folder are
// tests/helpers/hotfix-check-harness.js. Split, every test word for word, by the plan
// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { route } = require('../src/lib/menu-screens');
const { ruleRefusal } = require('../src/lib/hotfix-check');

const {
  NODE, STATUS_LINE, USAGE, NO_TEST, refusal, unreadable, gone, SETTING, HOME, HOME_STORE,
  PASSING_TEST, FAILING_TEST, SCRIPT, tmpDir, PRIVATE_TMP, git, writeFiles, packageJson, makeRepo,
  testedProject, withEnv, check, probeDir, probeRead, logLines, refusedUntouched, assertChecking,
  assertPass, buttonWording, runCommit, changeOf
} = require('./helpers/hotfix-check-harness');

const START = path.join(__dirname, '..', 'src', 'commands', 'start.js');

test('case 1 + 26: a button wording change passes in two calls; the process is restored', async () => {
  const root = testedProject();
  fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
  const first = await check(root, 'src/styles/home.css');
  assertChecking(first, ['src/styles/home.css']);
  assert.equal(first.next, "hotfix check --run-tests 'src/styles/home.css'", 'byte-identical to the acceptance criterion');

  const cwdBefore = process.cwd();
  const logBefore = console.log;
  const second = await check(root, '--run-tests', 'src/styles/home.css');
  assert.equal(process.cwd(), cwdBefore, 'case 26: the working directory is restored');
  assert.equal(console.log, logBefore, 'case 26: console.log is restored');
  assertPass(second, ['src/styles/home.css']);
  assert.equal(second.commit.add, "git --literal-pathspecs add -- 'src/styles/home.css'");
  assert.equal(second.commit.message,
    "git --literal-pathspecs commit --only -m 'hotfix: <what changed>' -- 'src/styles/home.css'");
  assert.equal(second.tests, '1 test passed.');
});

test('case 2: a button colour change passes; the commit names only the stylesheet', async () => {
  const root = testedProject({ 'src/styles/button.css': '.save { background-color: #0a58ca; }\n' });
  fs.writeFileSync(path.join(root, 'src/styles/button.css'), '.save { background-color: #0b5ed7; }\n');
  assertChecking(await check(root, 'src/styles/button.css'), ['src/styles/button.css']);
  assertPass(await check(root, '--run-tests', 'src/styles/button.css'), ['src/styles/button.css']);
});

test('case 3: a catalogue value is no wording the check reads (since the tenth round): refused as a setting', async () => {
  const root = testedProject({ 'locales/en.json': '{\n  "save": "Save {count} items",\n  "cancel": "Cancel"\n}\n' });
  fs.writeFileSync(path.join(root, 'locales/en.json'), '{\n  "save": "Store {count} items",\n  "cancel": "Cancel"\n}\n');
  for (const args of [['locales/en.json'], ['--run-tests', 'locales/en.json']]) await refusedUntouched(root, args, SETTING('locales/en.json'));
});

test('case 4: other uncommitted work is neither judged nor committed', async () => {
  const plain = testedProject({ 'notes.md': 'Some notes.\n' });
  const a = await buttonWording(plain);
  const busy = testedProject({ 'notes.md': 'Some notes.\n' });
  fs.writeFileSync(path.join(busy, 'notes.md'), 'Some other notes, and many more words.\n');
  const b = await buttonWording(busy);
  assert.deepEqual(b.first, a.first);
  assert.deepEqual(b.second, a.second);
  assert.equal(b.second.verdict, 'hotfix', JSON.stringify(b.second));
  runCommit(busy, b.second.commit);
  assert.equal(git(busy, ['show', '--name-only', '--format=', 'HEAD']).trim(), 'src/styles/home.css');
  assert.match(git(busy, ['status', '--porcelain']), /^ M notes\.md$/m);
});

test('case 5: program logic is refused with the full sentence', async () => {
  const root = testedProject({ 'src/cart.js': 'function ok(items) {\n  if (items.length > 0) return true;\n  return false;\n}\n' });
  fs.writeFileSync(path.join(root, 'src/cart.js'), 'function ok(items) {\n  if (items.length >= 0) return true;\n  return false;\n}\n');
  const res = await refusedUntouched(root, ['src/cart.js'],
    'it changes program logic in src/cart.js, and only wording and colours qualify');
  assert.equal(res.text, 'I did not treat this as a hotfix because it changes program logic in src/cart.js, '
    + 'and only wording and colours qualify; it goes through a normal plan, and your edits stay in place, not committed.');
});

test('case 6: a setting is refused', async () => {
  const root = testedProject({ 'config/app.yaml': 'timeout_seconds: 30\n' });
  fs.writeFileSync(path.join(root, 'config/app.yaml'), 'timeout_seconds: 60\n');
  await refusedUntouched(root, ['config/app.yaml'],
    'it changes a setting in config/app.yaml, and settings changes are a common cause of outages');
});

test('case 7: text inside program code is refused', async () => {
  const root = testedProject({ 'src/server.js': "app.post('/order', (req, res) => {\n  res.send(\"Order saved\");\n});\n" });
  fs.writeFileSync(path.join(root, 'src/server.js'), "app.post('/order', (req, res) => {\n  res.send(\"Order stored\");\n});\n");
  await refusedUntouched(root, ['src/server.js'],
    'it changes text inside program code in src/server.js, and no check can tell whether people read that text or the program depends on it');
});

test('case 9: a sensitive area is refused even for a colour', async () => {
  const root = testedProject({ 'src/styles/login.css': 'button { color: red; }\n' });
  fs.writeFileSync(path.join(root, 'src/styles/login.css'), 'button { color: blue; }\n');
  await refusedUntouched(root, ['src/styles/login.css'],
    'src/styles/login.css sits in an area named login, and such areas are never a hotfix');
});

test('case 10: more than 20 changed lines is refused with the counts', async () => {
  const lines = (colour, n) => Array.from({ length: n }, (_, i) => `.line-${String.fromCharCode(97 + i)} { color: ${colour}; }`).join('\n') + '\n';
  const root = testedProject({ 'src/styles/one.css': lines('red', 7), 'src/styles/two.css': lines('red', 6) });
  // 13 lines recoloured line for line in two files: 26 changed lines.
  fs.writeFileSync(path.join(root, 'src/styles/one.css'), lines('blue', 7));
  fs.writeFileSync(path.join(root, 'src/styles/two.css'), lines('blue', 6));
  await refusedUntouched(root, ['src/styles/one.css', 'src/styles/two.css'],
    'it changes 26 lines in 2 files and a hotfix is at most 20 lines in at most 3 files');
  // The functional plan's own numbers, 13 lines removed and 12 added (25 lines in 2 files). A
  // stylesheet that gains or loses a line is refused by its reader; the size rule runs once
  // the kind of every file is known and before the reader reads a file's content (the
  // decision at review of 2026-10-09), so the scenario gets its own clause.
  fs.writeFileSync(path.join(root, 'src/styles/one.css'), lines('blue', 6));
  await refusedUntouched(root, ['src/styles/one.css', 'src/styles/two.css'],
    'it changes 25 lines in 2 files and a hotfix is at most 20 lines in at most 3 files');
});

test('case 11: a new file is refused', async () => {
  const root = testedProject();
  writeFiles(root, { 'src/pages/about.html': '<p>About</p>\n' });
  await refusedUntouched(root, ['src/pages/about.html'], 'it adds, removes or renames src/pages/about.html');
});

test('case 12: a failing existing test refuses the hotfix and is named (TAP and spec reporters)', async () => {
  for (const reporter of ['tap', 'spec']) {
    const root = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': FAILING_TEST },
      { testScript: `node --test --test-reporter=${reporter} tests/*.test.js` });
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    assertChecking(await check(root, 'src/styles/home.css'), ['src/styles/home.css']);
    await refusedUntouched(root, ['--run-tests', 'src/styles/home.css'],
      'the existing tests fail (tests/home.test.js: shows Save)');
  }
});

test('case 13: an edited test is refused by both calls and no test runs', async () => {
  const probe = probeDir();
  const root = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': PASSING_TEST }, { testScript: SCRIPT });
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  fs.writeFileSync(path.join(root, 'tests/home.test.js'), PASSING_TEST + '// edited\n');
  await withEnv({ CTOC_HOTFIX_PROBE: probe }, async () => {
    for (const args of [['src/styles/home.css', 'tests/home.test.js'], ['--run-tests', 'src/styles/home.css', 'tests/home.test.js']]) {
      await refusedUntouched(root, args, 'it changes a test (tests/home.test.js)');
    }
  });
  assert.equal(probeRead(probe), null, 'no test was run');
});

test('case 14: a run in which no test ran is not a pass', async () => {
  for (const script of ['node --test empty/*.test.js', 'node -e ""']) {
    const root = makeRepo({ 'src/styles/home.css': HOME, 'empty/.gitkeep': '' }, { testScript: script });
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    assertChecking(await check(root, 'src/styles/home.css'), ['src/styles/home.css']);
    await refusedUntouched(root, ['--run-tests', 'src/styles/home.css'], NO_TEST);
  }
});

test('case 15: a change that cannot be read is refused and never passes', async () => {
  const notRepo = makeRepo({ 'src/styles/home.css': HOME }, { init: false });
  const noCommit = makeRepo({ 'src/styles/home.css': HOME }, { commit: false });
  for (const args of [['src/styles/home.css'], ['--run-tests', 'src/styles/home.css']]) {
    const a = await check(notRepo, ...args);
    assert.equal(a.text, unreadable('this folder is not a git repository'));
    const b = await check(noCommit, ...args);
    assert.equal(b.text, unreadable('this folder has no commit to compare with'));
  }
  const root = testedProject();
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  for (const args of [['src/styles/home.css'], ['--run-tests', 'src/styles/home.css']]) {
    const res = await withEnv({ PATH: tmpDir() }, () => check(root, ...args));
    assert.equal(res.verdict, 'refused');
    assert.equal(res.text, unreadable('git is not installed'));
  }
});

test('case 16: an unrecognised file kind is refused', async () => {
  const root = testedProject({ 'docs/diagram.svg': '<svg>\n<text x="1">Save</text>\n</svg>\n' });
  fs.writeFileSync(path.join(root, 'docs/diagram.svg'), '<svg>\n<text x="1">Store</text>\n</svg>\n');
  await refusedUntouched(root, ['docs/diagram.svg'], 'I do not recognise docs/diagram.svg as wording or a colour');
});

test('case 17: without a test command nothing passes: a page reads "no test ran", and a README is no kind the check reads', async () => {
  const root = makeRepo({ 'README.md': '# Fixture\n\nThis is the old wording.\n', 'src/styles/home.css': HOME });
  fs.writeFileSync(path.join(root, 'README.md'), '# Fixture\n\nThis is the new wording.\n');
  for (const args of [['README.md'], ['--run-tests', 'README.md']]) await refusedUntouched(root, args, gone('README.md'));

  fs.writeFileSync(path.join(root, 'README.md'), '# Fixture\n\nThis is the old wording.\n');
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  assertChecking(await check(root, 'src/styles/home.css'), ['src/styles/home.css']);
  await refusedUntouched(root, ['--run-tests', 'src/styles/home.css'], NO_TEST);
});

test('case 18: the same change checked twice gives the same answers (core.autocrlf=true)', async () => {
  const root = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': PASSING_TEST },
    { testScript: SCRIPT, autocrlf: true });
  const a = await buttonWording(root);
  const b = await buttonWording(root);
  assert.equal(JSON.stringify(b.first), JSON.stringify(a.first));
  assert.equal(JSON.stringify(b.second), JSON.stringify(a.second));
  assertPass(a.second, ['src/styles/home.css']);
});

test('case 19: Windows line endings do not count as changed lines', async () => {
  const base = Array.from({ length: 30 }, (_, i) => `.line-${i} { color: red; }`);
  const edited = base.slice();
  edited[3] = '.line-3 { color: blue; }';
  // A stylesheet with Windows line endings on both sides, and one colour changed: 2 changed lines.
  const root = testedProject({ 'src/styles/guide.css': base.join('\r\n') + '\r\n', 'src/styles/unix.css': base.join('\n') + '\n' });
  fs.writeFileSync(path.join(root, 'src/styles/guide.css'), edited.join('\r\n') + '\r\n');
  assertChecking(await check(root, 'src/styles/guide.css'), ['src/styles/guide.css']);
  assertPass(await check(root, '--run-tests', 'src/styles/guide.css'), ['src/styles/guide.css']);
  const lines = logLines(root);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].lines, 2);
  assert.equal(lines[0].files, 1);
  // Every line ending changed from LF to CRLF with that one colour: the number of carriage
  // returns stays as it is (the decision at review of 2026-10-09), because the diff the size
  // is counted from ignores them. Refused, and the line endings count as no changed line.
  fs.writeFileSync(path.join(root, 'src/styles/guide.css'), base.join('\r\n') + '\r\n');
  fs.writeFileSync(path.join(root, 'src/styles/unix.css'), edited.join('\r\n') + '\r\n');
  await refusedUntouched(root, ['src/styles/unix.css'], 'I do not recognise src/styles/unix.css as wording or a colour');
  assert.equal(logLines(root)[1].lines, 2);
});

test('case 20: a path written with backslashes gives the same answers', async () => {
  const root = testedProject();
  const fwd = await buttonWording(root);
  const back = {
    first: await check(root, 'src\\styles\\home.css'),
    second: await check(root, '--run-tests', 'src\\styles\\home.css')
  };
  assertChecking(back.first, ['src/styles/home.css']);
  assertPass(back.second, ['src/styles/home.css']);
  assert.deepEqual(back.first, fwd.first);
  assert.deepEqual(back.second, fwd.second);
});

test('case 21: a file outside the project is refused', async () => {
  const root = testedProject();
  await refusedUntouched(root, ['../x.html'], 'I could not read the change (../x.html is outside this project)');
  await refusedUntouched(root, ['.'], 'I could not read the change (. is outside this project)');
});

test('case 22: a named unchanged file, and nothing changed at all', async () => {
  const root = testedProject();
  await refusedUntouched(root, ['src/styles/home.css'],
    'I could not read the change (src/styles/home.css holds no change that git would commit)');
  await refusedUntouched(root, [], 'I could not read the change (nothing has changed since the last commit)');
});

test('case 23: a binary file is not text', async () => {
  const root = testedProject({ 'docs/logo.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02]) });
  fs.writeFileSync(path.join(root, 'docs/logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x03]));
  await refusedUntouched(root, ['docs/logo.png'], 'I could not read the change (docs/logo.png is not text)');
});

test('case 25: through the real menu process, standard output is exactly one JSON document', () => {
  const root = tmpDir();
  git(root, ['init', '-q']);
  const env = { ...process.env, TMPDIR: PRIVATE_TMP, TEMP: PRIVATE_TMP, TMP: PRIVATE_TMP };
  delete env.CLAUDE_PROJECT_DIR;
  delete env.NODE_TEST_CONTEXT;
  const bare = spawnSync(NODE, [START], { cwd: root, encoding: 'utf8', env });
  assert.equal(bare.status, 0, bare.stderr);
  writeFiles(root, {
    'src/styles/home.css': HOME,
    'tests/home.test.js': PASSING_TEST,
    'package.json': packageJson(SCRIPT)
  });
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', 'base']);
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);

  const first = spawnSync(NODE, [START, 'hotfix', 'check', 'src/styles/home.css'], { cwd: root, encoding: 'utf8', env });
  assert.equal(first.status, 0, first.stderr);
  assertChecking(JSON.parse(first.stdout), ['src/styles/home.css']);
  const second = spawnSync(NODE, [START, 'hotfix', 'check', '--run-tests', 'src/styles/home.css'], { cwd: root, encoding: 'utf8', env });
  assert.equal(second.status, 0, second.stderr);
  assertPass(JSON.parse(second.stdout), ['src/styles/home.css']);
});

test('case 27: an unknown sub-command or option answers the usage text', async () => {
  const root = testedProject();
  const a = await route(['hotfix', 'frobnicate'], root);
  assert.equal(a.ok, false);
  assert.equal(a.text, `Unknown hotfix command: frobnicate. ${USAGE}`);
  assert.deepEqual(a.ask, { questions: [] });
  assert.deepEqual(a.actions, {});
  const b = await check(root, '--bogus');
  assert.equal(b.ok, false);
  assert.equal(b.text, `Unknown hotfix command: --bogus. ${USAGE}`);
  const c = await route(['hotfix'], root);
  assert.equal(c.ok, false);
  assert.equal(c.text, `Unknown hotfix command: (none). ${USAGE}`);
  assert.deepEqual(logLines(root), [], 'the usage answer writes no log line');
});

// The ninth round (2026-10-09, decisions at review): the size rule runs once the kind of every
// file is known and before any reader reads a file's content. Every row marked `red` answered
// otherwise on `4212d9ff`; the others are guards. (Until the tenth round this test also held the
// Markdown rows of the ninth round: a raw start tag anywhere, colons, parentheses, list items.)
// [item, path, base content, new content, the clause]
test('round 9: the size rule runs before the content rules, and after the kind of each file', async () => {
  const size = (n, m) => `it changes ${n} lines in ${m} ${m === 1 ? 'file' : 'files'} and a hotfix is at most 20 lines in at most 3 files`;
  const reworded = (n, wrap = (l) => l) => [Array.from({ length: n }, (_, i) => wrap(`Old line ${String.fromCharCode(97 + i)}`)).join('\n'),
    Array.from({ length: n }, (_, i) => wrap(`New line ${String.fromCharCode(97 + i)}`)).join('\n')];
  const [oldEleven, newEleven] = reworded(11);
  const [oldColours, newColours] = [Array.from({ length: 11 }, (_, i) => `.a${i} { color: red; }`).join('\n'),
    Array.from({ length: 11 }, (_, i) => `.a${i} { color: blue; }`).join('\n')];
  const shapes = [
    // A change over the limit that a reader would also refuse gets the size clause (red);
    // under the limit it gets the reader's.
    ['size', 'src/styles/r9-grown.css', 'a { color: red; }\n', `a { color: red; }\n${'b { color: red; }\n'.repeat(21)}`, size(21, 1)],
    ['size', 'src/styles/r9-extra.css', `${oldColours}\n}\n`, `${newColours}\n}\n`, size(22, 1)],
    ['size', 'src/styles/r9-small-extra.css', 'a { color: red; }\n}\n', 'a { color: blue; }\n}\n', 'I could not read the change (src/styles/r9-small-extra.css holds something I cannot follow)'],
    // The kind of a file is still named ahead of its size (guards).
    ['size', 'src/r9/cart.js', `${oldEleven}\n`, `${newEleven}\n`, 'it changes program logic in src/r9/cart.js, and only wording and colours qualify'],
    ['size', 'src/r9/Page.vue', `${oldEleven}\n`, `${newEleven}\n`, gone('src/r9/Page.vue')],
    ['size', 'docs/r9.md', `${oldEleven}\n`, `${newEleven}\n`, gone('docs/r9.md')],
    ['size', 'locales/r9/en.yml', `${oldEleven.replace(/^/gm, 'k: ')}\n`, `${newEleven.replace(/^/gm, 'k: ')}\n`, SETTING('locales/r9/en.yml')],
    ['size', 'src/pages/r9.html', `${oldEleven}\n`, `${newEleven}\n`, gone('src/pages/r9.html')],
    ['size', 'agents/r9.css', `${oldColours}\n`, `${newColours}\n`, gone('agents/r9.css')]
  ];
  const base = {};
  for (const [, p, b] of shapes) {
    assert.equal(base[p], undefined, `${p} is used once`);
    base[p] = b;
  }
  const root = makeRepo(base);
  const wrong = [];
  for (const [item, p, b, n, expected] of shapes) {
    fs.writeFileSync(path.join(root, ...p.split('/')), n);
    const res = await check(root, p);
    fs.writeFileSync(path.join(root, ...p.split('/')), b);
    if (res.text !== refusal(expected)) wrong.push(`${item} ${p}: ${res.verdict === 'checking' ? 'checking' : res.text}`);
  }
  assert.deepEqual(wrong, []);
});

// The ninth round (decisions at review of 2026-10-09): a dependency, build or settings name is
// decided by the name, wherever the file lies; the wording rule also refuses every number
// character, a format character, a bare host and a scheme anywhere; and a byte-order mark or a
// line ending neither comes nor goes. Every row marked `red` answered otherwise on `4212d9ff`.
// (Until the tenth round this test also held the rows of the catalogue readers: JSON by
// JSON.parse, strict YAML and properties, placeholders. No catalogue file qualifies any more.)
// [item, path, base content, new content, the clause, or null for `checking`]
test('round 9: names that are dependencies, the build or settings; the wording rule in a page; byte-order marks and line endings', async () => {
  const un = (f) => `I do not recognise ${f} as wording or a colour`;
  const setting = (f) => `it changes a setting in ${f}, and settings changes are a common cause of outages`;
  const build = (f) => `it changes how the project is built or shipped in ${f}`;
  const deps = (f) => `it changes the dependencies in ${f}`;
  const json = (o) => `${JSON.stringify(o, null, 2)}\n`;
  const shapes = [
    // 1. A dependency, build or settings name, in any letter case, wherever the file lies.
    ['name', 'packages/i18n/package.json', json({ name: 'i18n', description: 'Old texts' }), json({ name: 'i18n', description: 'New texts' }), deps('packages/i18n/package.json')],
    ['name', 'locales/package.json', json({ name: 'x', scripts: { test: 'node run tests' } }), json({ name: 'x', scripts: { test: 'echo skipped' } }), deps('locales/package.json')],
    ['name', 'messages/docker-compose.yml', 'services:\n  web:\n    image: app\n', 'services:\n  web:\n    image: other\n', build('messages/docker-compose.yml')],
    ['name', 'messages/docker-compose.override.yml', 'services:\n  web:\n    image: app\n', 'services:\n  web:\n    image: other\n', build('messages/docker-compose.override.yml')],
    ['name', 'translations/pnpm-lock.yaml', 'lockfileVersion: old\n', 'lockfileVersion: new\n', deps('translations/pnpm-lock.yaml')],
    ['name', 'i18n/tsconfig.json', json({ compilerOptions: { module: 'commonjs' } }), json({ compilerOptions: { module: 'esnext' } }), setting('i18n/tsconfig.json')],
    ['name', 'i18n/tsconfig.build.json', json({ extends: 'base' }), json({ extends: 'other' }), setting('i18n/tsconfig.build.json')],
    ['name', 'i18n/jsconfig.json', json({ extends: 'base' }), json({ extends: 'other' }), setting('i18n/jsconfig.json')],
    ['name', 'messages/application.properties', 'spring.profiles.active=dev\n', 'spring.profiles.active=prod\n', setting('messages/application.properties')],
    ['name', 'messages/application-prod.yml', 'mode: dev\n', 'mode: prod\n', setting('messages/application-prod.yml')],
    ['name', 'locales/app.config.json', json({ mode: 'dev' }), json({ mode: 'prod' }), setting('locales/app.config.json')],
    ['name', 'lang/Composer.JSON', json({ name: 'old' }), json({ name: 'new' }), deps('lang/Composer.JSON')],
    ['name', 'locales/PACKAGE-LOCK.json', json({ name: 'old' }), json({ name: 'new' }), deps('locales/PACKAGE-LOCK.json')],
    // A file in a catalogue folder is a settings file by its extension.
    ['tag', 'i18n/routes.json', json({ home: 'Start' }), json({ home: 'Begin' }), setting('i18n/routes.json')],
    ['tag', 'locales/settings.yml', 'mode: dark\n', 'mode: light\n', setting('locales/settings.yml')],
    ['tag', 'messages/config.properties', 'mode=dark\n', 'mode=light\n', setting('messages/config.properties')],
    ['tag', 'src/locales/index.json', json({ home: 'Start' }), json({ home: 'Begin' }), setting('src/locales/index.json')],
    ['tag', 'locales/english.json', json({ home: 'Start' }), json({ home: 'Begin' }), setting('locales/english.json')],
    ['tag', 'locales/messages_english.json', json({ home: 'Start' }), json({ home: 'Begin' }), setting('locales/messages_english.json')],
    // The shapes that qualified until the tenth round (a tag as the name, a tag as a folder, a
    // bundle with a tag behind `_`, a bundle alone, a tag with a region or a script): each is a
    // settings file by its extension now, like the rows above.
    ['tag', 'locales/en.json', json({ home: 'Start' }), json({ home: 'Begin' }), setting('locales/en.json')],
    ['tag', 'locales/de/common.json', json({ home: 'Start' }), json({ home: 'Begin' }), setting('locales/de/common.json')],
    ['tag', 'i18n/messages_fr.properties', 'home=Start\n', 'home=Begin\n', setting('i18n/messages_fr.properties')],
    ['tag', 'config/locales/en.yml', 'en:\n  home: Start\n', 'en:\n  home: Begin\n', setting('config/locales/en.yml')],
    ['tag', 'lang/pt_BR/app.yaml', 'home: Start\n', 'home: Begin\n', setting('lang/pt_BR/app.yaml')],
    ['tag', 'locales/zh-Hans.json', json({ home: 'Start' }), json({ home: 'Begin' }), setting('locales/zh-Hans.json')],
    ['tag', 'translations/Strings.json', json({ home: 'Start' }), json({ home: 'Begin' }), setting('translations/Strings.json')],
    ['tag', 'messages/labels_en-US.yml', 'home: Start\n', 'home: Begin\n', setting('messages/labels_en-US.yml')],
    // The same rule in HTML text.
    // 6. A byte-order mark on one side only, or another number of carriage returns (red for
    // the stylesheet; an HTML page was let through with every line ending changed).
    ['mark', 'src/styles/r9-mark.css', 'a { color: red; }\n', '\ufeffa { color: blue; }\n', un('src/styles/r9-mark.css')],
    ['mark', 'src/styles/r9-returns.css', 'a { color: red; }\nb { margin: 0; }\n', 'a { color: blue; }\r\nb { margin: 0; }\n', un('src/styles/r9-returns.css')],
  ];
  const base = {};
  for (const [, p, b] of shapes) {
    assert.equal(base[p], undefined, `${p} is used once`);
    base[p] = b;
  }
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

// The tenth round (the session coordinator's decision of 2026-10-10, on the owner's "fix the
// rework rounds"). Five reviewers attacked the eighth and ninth rounds, and every blocking
// finding sat in three kinds: Markdown and plain-text prose, catalogue files, and custom
// properties named for a colour. Those three are taken out of this piece: a `.md`, `.txt`,
// `.json`, `.yaml`, `.yml` or `.properties` file never qualifies, whatever its name and its
// place, and neither does a changed custom property. What stays is visible text in plain HTML
// pages and a colour value in a standard colour property of a stylesheet.
test('round 10: a file of a removed kind never qualifies, whatever its name and place', async () => {
  const setting = (f) => `it changes a setting in ${f}, and settings changes are a common cause of outages`;
  const json = (word) => `{\n  "save": "${word} the file"\n}\n`;
  // [extension, path, the text with `@` where one word changes, the clause]. Every path
  // qualified until this round: a documentation name, a catalogue folder with a language tag.
  const removed = [
    ['.md', 'README.md', 'Read the @ guide first.\n', gone],
    ['.md', 'docs/guide.md', 'Read the @ guide first.\n', gone],
    ['.md', 'docs/GUIDE.MD', 'Read the @ guide first.\n', gone],
    ['.txt', 'CHANGES.txt', 'The @ wording of the release.\n', gone],
    ['.txt', 'docs/readme.en.txt', 'Read the @ guide first.\n', gone],
    ['.txt', 'docs/README.TXT', 'Read the @ guide first.\n', gone],
    ['.json', 'locales/en.json', json('@'), setting],
    ['.json', 'locales/de/common.json', json('@'), setting],
    ['.json', 'translations/Strings.JSON', json('@'), setting],
    ['.yaml', 'i18n/fr.yaml', 'save: @ the file\n', setting],
    ['.yaml', 'lang/pt_BR/app.yaml', 'save: @ the file\n', setting],
    ['.yml', 'config/locales/en.yml', 'en:\n  save: @ the file\n', setting],
    ['.yml', 'messages/labels_en-US.yml', 'save: @ the file\n', setting],
    ['.properties', 'i18n/messages_fr.properties', 'save=@ the file\n', setting],
    ['.properties', 'lang/en/app.properties', 'save = @ the file\n', setting]
  ];
  assert.deepEqual([...new Set(removed.map(([ext]) => ext))], ['.md', '.txt', '.json', '.yaml', '.yml', '.properties'], 'every removed extension has a row');
  const wrong = [];
  for (const [, rel, template, clause] of removed) {
    const refused = ruleRefusal(changeOf(rel, template.replace('@', 'old'), template.replace('@', 'new')));
    if (refused === null || refused.clause !== clause(rel)) wrong.push(`${rel}: ${refused === null ? 'passed' : refused.clause}`);
  }
  assert.deepEqual(wrong, []);
});

test('round 10: through the real menu process, an imported instruction file, a catalogue and a README are refused', () => {
  const root = tmpDir();
  git(root, ['init', '-q']);
  const env = { ...process.env, TMPDIR: PRIVATE_TMP, TEMP: PRIVATE_TMP, TMP: PRIVATE_TMP };
  delete env.CLAUDE_PROJECT_DIR;
  delete env.NODE_TEST_CONTEXT;
  // The entry point sets a project up on its first call; what it writes is committed with the rest.
  assert.equal(spawnSync(NODE, [START], { cwd: root, encoding: 'utf8', env, timeout: 60000 }).status, 0);
  writeFiles(root, {
    'CLAUDE.md': '# Instructions\n\n@docs/rules.md\n',
    'docs/rules.md': 'Follow the old rules.\n',
    'locales/en.json': '{\n  "save": "Save the file"\n}\n',
    'README.md': 'Read the old guide first.\n'
  });
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', 'base']);
  const runs = [
    ['docs/rules.md', 'Follow the new rules.\n', gone('docs/rules.md')],
    ['locales/en.json', '{\n  "save": "Store the file"\n}\n', 'it changes a setting in locales/en.json, and settings changes are a common cause of outages'],
    ['README.md', 'Read the new guide first.\n', gone('README.md')]
  ];
  for (const [rel, after, clause] of runs) {
    fs.writeFileSync(path.join(root, ...rel.split('/')), after);
    for (const args of [[rel], ['--run-tests', rel]]) {
      const run = spawnSync(NODE, [START, 'hotfix', 'check', ...args], { cwd: root, encoding: 'utf8', env, timeout: 60000 });
      assert.equal(run.status, 0, run.stderr);
      const answer = JSON.parse(run.stdout);
      assert.equal(answer.verdict, 'refused', `${rel}: ${run.stdout}`);
      assert.equal(answer.text, refusal(clause), rel);
    }
  }
});
