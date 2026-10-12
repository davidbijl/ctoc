'use strict';

// The copy the hotfix check runs the tests in, the package folders linked into it,
// and the check's log: what the check leaves in the project, in the copy and in the log (cases
// 24, 28, 29, 31 and 39 to 53).
// Moved word for word out of tests/hotfix-check.test.js by the plan
// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.
// The shared setup and this file's private temporary folder: tests/helpers/hotfix-check-harness.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { route } = require('../src/lib/menu-screens');
const qualityAgent = require('../src/lib/quality-agent');
const safeFs = require('../src/lib/safe-fs');

const {
  NODE, LOG, NO_TEST, refusal, unreadable, HOME, HOME_STORE, nodeTest, PASSING_TEST, FAILING_TEST,
  SCRIPT, tmpDir, leftovers, git, writeFiles, makeRepo, testedProject, withEnv, check, probeDir,
  probeRead, logLines, worktrees, stashList, treeBytes, refusedUntouched, assertChecking,
  assertPass, buttonWording, copyParent, linkedProject, workspaceProject
} = require('./helpers/hotfix-check-harness');

/** Register a worktree of the repository's own, then delete its folder: a stale entry. */
function addStaleWorktree(root) {
  const stale = path.join(tmpDir('hotfix-stale-'), 'wt');
  git(root, ['worktree', 'add', '-q', '--detach', stale, 'HEAD']);
  fs.rmSync(stale, { recursive: true, force: true });
  assert.match(worktrees(root), /prunable/);
}

test('case 24: nothing in the project is touched, also when its own tests write and stage files', async () => {
  // The fixture's test writes out/report.txt and runs `git add -A` in the folder it runs in.
  const writer = "  fs.mkdirSync('out', { recursive: true });\n"
    + "  fs.writeFileSync(path.join('out', 'report.txt'), 'report');\n"
    + "  require('child_process').execFileSync('git', ['add', '-A'], { stdio: 'ignore' });\n";
  const fixtures = [
    [nodeTest('has a rule', writer + "  assert.ok(read('src/styles/home.css').includes('.save'));"), 'hotfix'],
    [nodeTest('shows Save', writer + "  assert.ok(read('src/styles/home.css').includes('#0a58ca'));"), 'refused']
  ];
  for (const [body, verdict] of fixtures) {
    const root = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': body, 'docs/untouched.md': 'Never edited.\n' },
      { testScript: SCRIPT });
    fs.writeFileSync(path.join(root, 'docs/untouched.md'), 'A stashed edit.\n');
    git(root, ['stash', '-q']);
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    for (const args of [[], ['--run-tests']]) {
      // The situation in which git rewrote `.git/index` under every option tried (Decision
      // 44): a committed file whose modification time moved while its content did not.
      const moved = new Date(Date.now() - 60000);
      fs.utimesSync(path.join(root, 'docs/untouched.md'), moved, moved);
      const index = fs.readFileSync(path.join(root, '.git', 'index'));
      const files = treeBytes(root);
      const stash = stashList(root);
      const wts = worktrees(root);
      const res = await check(root, ...args);
      assert.ok(fs.readFileSync(path.join(root, '.git', 'index')).equals(index), `${args}: .git/index unchanged`);
      assert.deepEqual(treeBytes(root), files, `${args}: no file outside .git/ and .ctoc/ changed`);
      assert.equal(stashList(root), stash);
      assert.equal(stash.split('\n').filter(Boolean).length, 1);
      assert.equal(worktrees(root), wts);
      assert.deepEqual(leftovers(), []);
      assert.equal(res.verdict, args.length ? verdict : 'checking', JSON.stringify(res));
    }
  }
});

test('case 28: the log counts verdicts and causes, holds no names or wording, and never changes an answer', async () => {
  const cart = 'function ok(items) {\n  if (items.length > 0) return true;\n  return false;\n}\n';
  const root = testedProject({ 'src/cart.js': cart, 'notes.md': 'Some notes.\n' });
  fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
  await check(root, 'src/styles/home.css');
  assert.deepEqual(logLines(root), [], 'a checking answer writes no log line');
  await check(root, '--run-tests', 'src/styles/home.css');
  let lines = logLines(root);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].verdict, 'hotfix');
  assert.equal(lines[0].cause, null);
  assert.equal(lines[0].urgent, false);
  assert.equal(lines[0].files, 1);
  assert.equal(lines[0].lines, 2);
  assert.match(lines[0].at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME);
  fs.writeFileSync(path.join(root, 'src/cart.js'), cart.replace('> 0', '>= 0'));
  fs.writeFileSync(path.join(root, 'notes.md'), 'Other notes.\n');
  await check(root, 'src/cart.js');
  lines = logLines(root);
  assert.equal(lines.length, 2);
  assert.equal(lines[1].verdict, 'refused');
  assert.equal(lines[1].cause, 'program-logic');
  assert.equal(lines[1].urgent, false);
  await route(['hotfix', 'frobnicate'], root);
  assert.equal(logLines(root).length, 2, 'the usage answer appends nothing');
  const raw = fs.readFileSync(path.join(root, LOG), 'utf8');
  for (const leak of ['src/', 'home', 'Save', 'Store', 'notes', 'cart']) assert.equal(raw.includes(leak), false, `log holds ${leak}`);
  for (const l of logLines(root)) assert.deepEqual(Object.keys(l).sort(), ['at', 'cause', 'files', 'lines', 'urgent', 'verdict']);

  const reference = await buttonWording(testedProject());
  const blocked = testedProject();
  fs.mkdirSync(path.join(blocked, '.ctoc'), { recursive: true });
  fs.writeFileSync(path.join(blocked, '.ctoc', 'logs'), 'not a folder');
  const answers = await buttonWording(blocked);
  assert.deepEqual(answers.first, reference.first);
  assert.deepEqual(answers.second, reference.second);
  assert.equal(fs.readFileSync(path.join(blocked, '.ctoc', 'logs'), 'utf8'), 'not a folder');
});

const FLAGS_TEST = nodeTest('flags are on', "  assert.equal(read('config/flags.txt').trim(), 'on');", { marker: 'flags.txt' });

test('case 29: an unrelated uncommitted edit that would make a test fail does not change the verdict', async () => {
  const twin = testedProject({ 'config/flags.txt': 'on\n', 'tests/flags.test.js': FLAGS_TEST });
  const reference = await buttonWording(twin);
  const root = testedProject({ 'config/flags.txt': 'on\n', 'tests/flags.test.js': FLAGS_TEST });
  fs.writeFileSync(path.join(root, 'config/flags.txt'), 'off\n');
  const answers = await buttonWording(root);
  assert.deepEqual(answers.first, reference.first);
  assert.deepEqual(answers.second, reference.second);
  assertPass(reference.second, ['src/styles/home.css']);
});

test('case 31: the check\'s own log never enters the change', async () => {
  const root = testedProject();
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  const run1 = { first: await check(root), second: await check(root, '--run-tests') };
  assert.equal(logLines(root).length, 1, 'the first run left its log');
  const run2 = { first: await check(root), second: await check(root, '--run-tests') };
  assert.deepEqual(run2.first, run1.first);
  assert.deepEqual(run2.second, run1.second);
});

test('case 39: a log above 1 MiB is rotated by renaming', async () => {
  const root = testedProject();
  const old = Buffer.from(`${'x'.repeat(1024 * 1024)}\n`);
  assert.equal(old.length, 1024 * 1024 + 1);
  fs.mkdirSync(path.join(root, '.ctoc', 'logs'), { recursive: true });
  fs.writeFileSync(path.join(root, LOG), old);
  const { second } = await buttonWording(root);
  assert.ok(fs.existsSync(path.join(root, `${LOG}.1`)) && fs.readFileSync(path.join(root, `${LOG}.1`)).equals(old),
    'the old log is kept whole under .1');
  const lines = logLines(root);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].verdict, 'hotfix');
  assertPass(second, ['src/styles/home.css']);
});

test('case 40: a log that is a hard link is never written', async () => {
  const outside = path.join(tmpDir('hotfix-outside-'), 'outside.txt');
  const bytes = Buffer.from(`${'y'.repeat(1024 * 1024)}\n`);
  fs.writeFileSync(outside, bytes);
  const reference = testedProject();
  const root = testedProject();
  fs.mkdirSync(path.join(root, '.ctoc', 'logs'), { recursive: true });
  fs.linkSync(outside, path.join(root, LOG));
  const answers = [];
  for (const r of [reference, root]) {
    const { first, second } = await buttonWording(r);
    answers.push([first, second]);
  }
  assert.ok(fs.readFileSync(outside).equals(bytes), 'the linked file is unchanged');
  assert.equal(fs.existsSync(path.join(root, `${LOG}.1`)), false);
  assert.deepEqual(answers[1], answers[0]);
  assertPass(answers[1][1], ['src/styles/home.css']);
});

test('case 41: the log is never written through a symbolic link', async () => {
  const outside = tmpDir('hotfix-victim-');
  const victim = path.join(outside, 'victim.txt');
  fs.writeFileSync(victim, 'precious\n');
  const variants = [
    (root) => { fs.symlinkSync(outside, path.join(root, '.ctoc'), 'dir'); },
    (root) => { fs.mkdirSync(path.join(root, '.ctoc')); fs.symlinkSync(outside, path.join(root, '.ctoc', 'logs'), 'dir'); },
    (root) => { fs.mkdirSync(path.join(root, '.ctoc', 'logs'), { recursive: true }); fs.symlinkSync(victim, path.join(root, LOG)); },
    // A dangling link: it points at a file that does not exist yet.
    (root) => { fs.mkdirSync(path.join(root, '.ctoc', 'logs'), { recursive: true }); fs.symlinkSync(path.join(outside, 'created.txt'), path.join(root, LOG)); }
  ];
  const both = async (root) => {
    const { first, second } = await buttonWording(root);
    return [first, second];
  };
  const reference = await both(testedProject());
  assert.equal(reference[1].verdict, 'hotfix', JSON.stringify(reference[1]));
  for (const plant of variants) {
    const root = testedProject();
    let planted = true;
    try { plant(root); } catch { planted = false; } // a platform that cannot make links has no such attack
    assert.deepEqual(await both(root), reference);
    assert.equal(fs.readFileSync(victim, 'utf8'), 'precious\n');
    assert.deepEqual(fs.readdirSync(outside).sort(), ['victim.txt']);
    if (!planted) assert.equal(logLines(root).length, 1);
  }
});

test('case 42: an unrelated uncommitted edit that a test needs makes the hotfix fail', async () => {
  const root = testedProject({ 'config/flags.txt': 'off\n', 'tests/flags.test.js': FLAGS_TEST });
  fs.writeFileSync(path.join(root, 'config/flags.txt'), 'on\n');
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  await refusedUntouched(root, ['--run-tests', 'src/styles/home.css'], 'the existing tests fail (tests/flags.test.js: flags are on)');
});

/** The quality agent's timeout result, as `runFullTests` answers it. */
const TIMEOUT_RESULT = { passed: false, undetermined: true, passCount: 0, failed: 0, skipped: 0, flaky: 0, output: 'javascript tests timed out' };

test('case 43: the copy is gone after a pass, a refusal, failing tests, a timeout and a thrown error', async (t) => {
  const probe = probeDir();
  const PROBE_SCRIPT = "require('fs').writeFileSync(require('path').join(process.env.CTOC_HOTFIX_PROBE, 'ran.txt'), process.cwd());\n";
  const runs = [
    ['pass', () => testedProject(), (res) => assertPass(res, ['src/styles/home.css'])],
    ['refusal after the copy exists', () => makeRepo({ 'src/styles/home.css': HOME, 'probe.js': PROBE_SCRIPT }, { testScript: 'node probe.js' }),
      (res) => assert.equal(res.text, refusal(NO_TEST))],
    ['failing tests', () => makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': FAILING_TEST }, { testScript: SCRIPT }),
      (res) => assert.equal(res.text, refusal('the existing tests fail (tests/home.test.js: shows Save)'))],
    ['a timeout', () => testedProject(), (res) => assert.equal(res.text, refusal(NO_TEST)), () => TIMEOUT_RESULT],
    ['a thrown error', () => testedProject(), (res) => {
      assert.equal(res.text, unreadable('the check stopped'));
      assert.match(res.detail, /runner exploded/);
    }, () => { throw new Error('runner exploded'); }]
  ];
  for (const [label, make, expect, replacement] of runs) await t.test(label, async () => {
      const root = make();
      addStaleWorktree(root);
      const before = worktrees(root);
      fs.rmSync(path.join(probe, 'ran.txt'), { force: true });
      fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
      if (replacement) {
        t.mock.method(qualityAgent, 'runFullTests', async () => {
          fs.writeFileSync(path.join(probe, 'ran.txt'), process.cwd());
          return replacement();
        });
      }
      const res = await withEnv({ CTOC_HOTFIX_PROBE: probe }, () => check(root, '--run-tests', 'src/styles/home.css'));
      t.mock.restoreAll();
      const folder = probeRead(probe);
      assert.ok(folder, `${label}: the tests ran`);
      assert.notEqual(folder, root, `${label}: the tests ran in a copy`);
      assert.equal(fs.existsSync(folder), false, `${label}: the copy is gone`);
      assert.equal(fs.existsSync(copyParent(folder)), false, `${label}: its folder is gone`);
      assert.equal(worktrees(root), before, `${label}: the worktree list is as before, the stale entry still listed`);
      expect(res);
  });
  await t.test('a copy that cannot be removed is named in detail; the verdict stands', async () => {
    const root = testedProject();
    const before = worktrees(root);
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    const realRm = fs.rmSync;
    t.mock.method(fs, 'rmSync', (p, options) => {
      if (path.basename(String(p)).startsWith('ctoc-hotfix-')) {
        throw Object.assign(new Error('EBUSY: resource busy'), { code: 'EBUSY' });
      }
      return realRm(p, options);
  });
  const res = await withEnv({ CTOC_HOTFIX_PROBE: probe }, () => check(root, '--run-tests', 'src/styles/home.css'));
  t.mock.restoreAll();
  const parent = copyParent(probeRead(probe));
  assert.equal(res.verdict, 'hotfix');
  assert.equal(res.text, '');
  assert.equal(res.detail, `the temporary copy at ${parent} could not be removed: EBUSY: resource busy`);
  assert.equal(worktrees(root), before, 'the worktree was removed before the folder');
  fs.rmSync(parent, { recursive: true, force: true });
  });
});

test('case 44: a change that does not apply cleanly to a fresh copy is refused and runs no test', async () => {
  const probe = probeDir();
  const shout = path.join(tmpDir('hotfix-filter-'), 'shout.js');
  fs.writeFileSync(shout, "let s = '';\nprocess.stdin.on('data', (d) => { s += d; });\nprocess.stdin.on('end', () => process.stdout.write(s.toUpperCase()));\n");
  const root = makeRepo({ 'site/guide.css': '.guide { color: red; }\n', '.gitattributes': 'site/*.css filter=shout\n',
    'src/styles/home.css': HOME, 'tests/home.test.js': PASSING_TEST }, { testScript: SCRIPT });
  const fwd = (p) => p.split(path.sep).join('/');
  git(root, ['config', 'filter.shout.smudge', `"${fwd(NODE)}" "${fwd(shout)}"`]);
  fs.writeFileSync(path.join(root, 'site/guide.css'), '.guide { color: blue; }\n');
  const before = worktrees(root);
  assertChecking(await check(root, 'site/guide.css'), ['site/guide.css']);
  const res = await withEnv({ CTOC_HOTFIX_PROBE: probe }, () => check(root, '--run-tests', 'site/guide.css'));
  assert.equal(res.text, unreadable('the change does not apply cleanly to a fresh copy of the last commit'), JSON.stringify(res));
  assert.equal(typeof res.detail, 'string');
  assert.ok(res.detail.length > 0 && !res.detail.includes('\n'), res.detail);
  assert.equal(logLines(root).pop().cause, 'unreadable');
  assert.equal(probeRead(probe), null, 'the project\'s test never ran');
  assert.equal(worktrees(root), before);
});

const LINK_REPORT = "  assert.equal(require('greet'), 'hello');\n"
  + "  const isLink = (p) => { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } };\n"
  + "  fs.writeFileSync(path.join(probe, 'links.json'), JSON.stringify({ node_modules: isLink('node_modules'),"
  + " nested: isLink(path.join('packages', 'a', 'node_modules')), venv: isLink('.venv'), build: fs.existsSync('build') }));\n";

test('case 45: installed-package folders are linked into the copy, one link each, and left intact', async (t) => {
  const probe = probeDir();
  await t.test('(a) one link each, a directory link, no build folder, the owner\'s folders intact', async () => {
    const root = linkedProject(LINK_REPORT);
    const owned = () => ({ ...treeBytes(path.join(root, 'node_modules')), ...treeBytes(path.join(root, 'packages', 'a', 'node_modules')),
      ...treeBytes(path.join(root, '.venv')) });
    const before = owned();
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    const res = await withEnv({ CTOC_HOTFIX_PROBE: probe }, () => check(root, '--run-tests', 'src/styles/home.css'));
    assert.notEqual(probeRead(probe), root, 'the tests ran in a copy');
    assert.deepEqual(JSON.parse(probeRead(probe, 'links.json')), { node_modules: true, nested: true, venv: true, build: false });
    assert.deepEqual(owned(), before, 'the owner\'s package folders are byte-identical');
    assertPass(res, ['src/styles/home.css']);
  });
  await t.test('(b) a link the tests removed counts as removed', async () => {
    const removing = linkedProject(LINK_REPORT
      + "  if (fs.lstatSync('node_modules').isSymbolicLink()) fs.unlinkSync('node_modules');\n");
    const greet = treeBytes(path.join(removing, 'node_modules'));
    fs.writeFileSync(path.join(removing, 'src/styles/home.css'), HOME_STORE);
    const res2 = await withEnv({ CTOC_HOTFIX_PROBE: probe }, () => check(removing, '--run-tests', 'src/styles/home.css'));
    const folder = probeRead(probe);
    assert.equal(fs.existsSync(folder), false);
    assert.equal(fs.existsSync(copyParent(folder)), false);
    assert.deepEqual(treeBytes(path.join(removing, 'node_modules')), greet);
    assertPass(res2, ['src/styles/home.css']);
  });
});

test('case 46: on Windows the links are directory junctions, elsewhere directory links', async (t) => {
  const root = linkedProject("  assert.equal(require('greet'), 'hello');\n",
    { '.ctoc/quality-config.yaml': `languages:\n  javascript:\n    test: "${NODE}" --test tests/home.test.js\n` });
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  const expected = ['node_modules', 'packages/a/node_modules', '.venv']
    .map((rel) => fs.realpathSync.native(path.join(root, ...rel.split('/')))).sort();
  const record = async (platform) => {
    const calls = [];
    const real = fs.symlinkSync;
    t.mock.method(fs, 'symlinkSync', (target, p, type) => { calls.push([target, type]); return real(target, p, type); });
    const saved = Object.getOwnPropertyDescriptor(process, 'platform');
    try {
      if (platform) Object.defineProperty(process, 'platform', { value: platform, configurable: true });
      await check(root, '--run-tests', 'src/styles/home.css');
    } finally {
      Object.defineProperty(process, 'platform', saved);
      t.mock.restoreAll();
    }
    return calls;
  };
  const windows = await record('win32');
  assert.equal(windows.length, 3, JSON.stringify(windows));
  assert.deepEqual(windows.map(([target]) => target).sort(), expected);
  assert.ok(windows.every(([, type]) => type === 'junction'));
  const here = await record(null);
  assert.deepEqual(here.map(([target]) => target).sort(), expected);
  assert.ok(here.every(([, type]) => type === 'dir'));
});

test('case 47: a judged file that changes during the check is refused', async (t) => {
  const probe = probeDir();
  await t.test('(a) while the tests run', async () => {
    const edits = nodeTest('has a rule', "  if (process.env.CTOC_HOTFIX_EDIT) fs.appendFileSync(process.env.CTOC_HOTFIX_EDIT, ' again');\n"
      + "  assert.ok(read('src/styles/home.css').includes('.save'));");
    const root = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': edits }, { testScript: SCRIPT });
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    const res = await withEnv({ CTOC_HOTFIX_EDIT: path.join(root, 'src', 'styles', 'home.css'), CTOC_HOTFIX_PROBE: probe },
      () => check(root, '--run-tests', 'src/styles/home.css'));
    assert.equal(res.text, unreadable('src/styles/home.css changed while it was being checked'), JSON.stringify(res));
    assert.equal(logLines(root).pop().cause, 'unreadable');
    assert.ok(probeRead(probe), 'the tests ran');
  });
  await t.test('(b) after the first hashing and before the content reaches the copy', async () => {
    fs.rmSync(path.join(probe, 'ran.txt'), { force: true });
    const other = testedProject();
    fs.writeFileSync(path.join(other, 'src/styles/home.css'), HOME_STORE);
    // The judged content is staged first; the first hashing then reads the working folder,
    // and its `lstat` of the judged file is the seam between the two (the rules read the
    // staged content, so a read of the working file is no longer one).
    const judged = path.join(other, 'src', 'styles', 'home.css');
    const realLstat = safeFs.lstatSync;
    let first = true;
    t.mock.method(safeFs, 'lstatSync', (p, options) => {
      if (first && String(p) === judged) {
        first = false;
        fs.writeFileSync(judged, HOME_STORE.replace('#0b5ed7', '#0b5ed8')); // still a colour: only the hashes can tell
      }
      return realLstat(p, options);
  });
  const res2 = await withEnv({ CTOC_HOTFIX_PROBE: probe }, () => check(other, '--run-tests', 'src/styles/home.css'));
  t.mock.restoreAll();
  assert.equal(res2.text, unreadable('src/styles/home.css changed while it was being checked'), JSON.stringify(res2));
  assert.equal(probeRead(probe), null, 'the project\'s test never ran');
  });
});

test('case 48: a name the commit command cannot carry is refused', async () => {
  const committedAndChanged = (name) => {
    const root = makeRepo({ 'README.md': 'Readme.\n' });
    if (process.platform === 'win32' && /["\\\t]/.test(name)) {
      const blob = git(root, ['hash-object', '-w', '--stdin'], 'Old wording.\n').trim();
      git(root, ['-c', 'core.protectNTFS=false', 'update-index', '--add', '--cacheinfo', `100644,${blob},${name}`]);
      git(root, ['commit', '-q', '-m', 'name']);
    } else if (/["\\\t]/.test(name)) {
      fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
      const blob = git(root, ['hash-object', '-w', '--stdin'], 'Old wording.\n').trim();
      git(root, ['update-index', '--add', '--cacheinfo', `100644,${blob},${name}`]);
      git(root, ['commit', '-q', '-m', 'name']);
      fs.writeFileSync(path.join(root, ...name.split('/')), 'New wording.\n');
    } else {
      writeFiles(root, { [name]: 'Old wording.\n' });
      git(root, ['add', '-A']);
      git(root, ['commit', '-q', '-m', 'name']);
      fs.writeFileSync(path.join(root, ...name.split('/')), 'New wording.\n');
    }
    return root;
  };
  const names = [["docs/it's.md", "docs/it's.md"], ['docs/a$b.md', 'docs/a$b.md'], ['docs/a`b.md', 'docs/a`b.md'],
    ['docs/a"b.md', 'docs/a"b.md'], ['docs/a\\b.md', 'docs/a\\b.md'], ['docs/a\tb.md', 'docs/a b.md']];
  for (const [name, shown] of names) {
    const root = committedAndChanged(name);
    const res = await check(root);
    assert.equal(res.text, unreadable(`${shown} has a name the commit command cannot carry`), JSON.stringify(res));
  }
});

test('case 49: other uncommitted work behind a workspace link is refused and runs no test', async () => {
  const probe = probeDir();
  for (const [linkAt, requireAs] of [['greet', 'greet'], ['@acme/greet', '@acme/greet']]) {
    const root = workspaceProject(linkAt, requireAs);
    fs.appendFileSync(path.join(root, 'packages', 'greet', 'index.js'), '// an unrelated edit\n');
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    const res = await withEnv({ CTOC_HOTFIX_PROBE: probe }, () => check(root, '--run-tests', 'src/styles/home.css'));
    assert.equal(res.text, unreadable('other uncommitted work is in code the tests load through installed packages: packages/greet'),
      JSON.stringify(res));
    assert.equal(logLines(root).pop().cause, 'unreadable');
    assert.equal(probeRead(probe), null, 'no test ran');
  }
});

test('case 50: the same workspace link with no other work passes, and the test ran in the copy', async () => {
  const probe = probeDir();
  const root = workspaceProject();
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  const res = await withEnv({ CTOC_HOTFIX_PROBE: probe }, () => check(root, '--run-tests', 'src/styles/home.css'));
  assert.ok(probeRead(probe));
  assert.notEqual(probeRead(probe), root, 'the tests ran in a copy');
  assertPass(res, ['src/styles/home.css']);
});

test('case 51: other uncommitted work behind an editable Python install is refused', async () => {
  const site = process.platform === 'win32' ? ['.venv', 'Lib', 'site-packages'] : ['.venv', 'lib', 'python3.12', 'site-packages'];
  const make = () => {
    const root = testedProject({ 'pylib/mylib/__init__.py': 'NAME = "old"\n', '.gitignore': '.venv/\n' });
    writeFiles(root, { '.venv/pyvenv.cfg': 'home = /usr/bin\n' });
    fs.mkdirSync(path.join(root, ...site), { recursive: true });
    fs.writeFileSync(path.join(root, 'pylib/mylib/__init__.py'), 'NAME = "new"\n');
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    return root;
  };
  const pth = make();
  fs.writeFileSync(path.join(pth, ...site, '_mylib.pth'),
    `# an editable install\nimport site\n${fs.realpathSync.native(path.join(pth, 'pylib'))}\n`);
  assert.equal((await check(pth, '--run-tests', 'src/styles/home.css')).text,
    unreadable('other uncommitted work is in code the tests load through installed packages: pylib'));
  const finder = make();
  const mylib = fs.realpathSync.native(path.join(finder, 'pylib', 'mylib')).replace(/\\/g, '\\\\');
  fs.writeFileSync(path.join(finder, ...site, '__editable___mylib_finder.py'), `MAPPING = {'mylib': '${mylib}'}\n`);
  assert.equal((await check(finder, '--run-tests', 'src/styles/home.css')).text,
    unreadable('other uncommitted work is in code the tests load through installed packages: pylib/mylib'));
});

test('case 52: a judged file under a linked package passes, and the test ran in the copy', async () => {
  const probe = probeDir();
  const root = workspaceProject('greet', 'greet', { 'packages/greet/page.css': '.greet { color: red; }\n' });
  fs.writeFileSync(path.join(root, 'packages/greet/page.css'), '.greet { color: blue; }\n');
  const res = await withEnv({ CTOC_HOTFIX_PROBE: probe }, () => check(root, '--run-tests', 'packages/greet/page.css'));
  assert.notEqual(probeRead(probe), root, 'the tests ran in a copy');
  assertPass(res, ['packages/greet/page.css']);
});

test('case 53: a link whose parent lies outside the copy stops the check before any test runs', async () => {
  const probe = probeDir();
  const outside = tmpDir('hotfix-outside-');
  const root = linkedProject(LINK_REPORT, { '.gitignore': 'node_modules/\n.venv/\nbuild/\n' });
  const blob = git(root, ['hash-object', '-w', '--stdin'], outside).trim();
  git(root, ['update-index', '--add', '--cacheinfo', `120000,${blob},vendor`]);
  git(root, ['commit', '-q', '-m', 'vendor is a link']);
  writeFiles(root, { 'vendor/node_modules/x/index.js': 'module.exports = 3;\n' });
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  const res = await withEnv({ CTOC_HOTFIX_PROBE: probe }, () => check(root, '--run-tests', 'src/styles/home.css'));
  assert.equal(res.text, unreadable('the check stopped'), JSON.stringify(res));
  assert.equal(res.detail, 'vendor/node_modules');
  assert.equal(probeRead(probe), null, 'no test ran');
  assert.deepEqual(fs.readdirSync(outside), [], 'nothing was made outside the copy');
});
