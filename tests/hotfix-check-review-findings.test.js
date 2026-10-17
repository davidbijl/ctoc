'use strict';

// The code review's and the security check's findings of 2026-10-08 against the
// hotfix check (findings 1 to 11 and the second round), each written and seen failing before
// its fix, and the ninth round's paths and names (governing folders, sensitive words,
// byte-order marks and line endings).
// Moved word for word out of tests/hotfix-check.test.js by the plan
// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.
// The shared setup and this file's private temporary folder: tests/helpers/hotfix-check-harness.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { ruleRefusal } = require('../src/lib/hotfix-check');
const qualityAgent = require('../src/lib/quality-agent');

const {
  NODE, STATUS_LINE, USAGE, NO_TEST, refusal, unreadable, inexact, HOME, HOME_STORE, nodeTest,
  PASSING_TEST, SCRIPT, tmpDir, PRIVATE_TMP, git, writeFiles, makeRepo, testedProject, check,
  probeDir, probeRead, logLines, sha, worktrees, treeBytes, refusedUntouched, assertChecking,
  assertPass, shellWords, runCommit, copyParent, linkedProject, growth, changeOf
} = require('./helpers/hotfix-check-harness');

// The code review's and the security check's findings of 2026-10-08 (Steps 11 and 13),
// each case written and seen failing before its fix.

test('finding 1: no repository hook and no file-system monitor runs during either call', async () => {
  const markers = tmpDir('hotfix-markers-');
  const hookMarker = path.join(markers, 'hook.txt');
  const monitorMarker = path.join(markers, 'monitor.txt');
  const fwd = (p) => p.split(path.sep).join('/');
  const root = testedProject();
  fs.writeFileSync(path.join(root, '.git', 'hooks', 'post-index-change'),
    `#!/bin/sh\necho hook >> '${fwd(hookMarker)}'\n`, { mode: 0o755 });
  const monitor = path.join(markers, 'fsmonitor.sh');
  fs.writeFileSync(monitor, `#!/bin/sh\necho monitor >> '${fwd(monitorMarker)}'\nexit 1\n`, { mode: 0o755 });
  git(root, ['config', 'core.fsmonitor', fwd(monitor)]);
  // Both are live in this repository: a plain status runs the monitor, a plain add the hook.
  git(root, ['status', '--porcelain']);
  git(root, ['add', 'src/styles/home.css']);
  assert.ok(fs.existsSync(hookMarker), 'the hook runs for an ordinary git call');
  assert.ok(fs.existsSync(monitorMarker), 'the monitor runs for an ordinary git call');
  fs.rmSync(hookMarker);
  fs.rmSync(monitorMarker);

  fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
  const first = await check(root, 'src/styles/home.css');
  const second = await check(root, '--run-tests', 'src/styles/home.css');
  assertChecking(first, ['src/styles/home.css']);
  assertPass(second, ['src/styles/home.css']);
  assert.equal(fs.existsSync(hookMarker), false, 'no repository hook ran during the check');
  assert.equal(fs.existsSync(monitorMarker), false, 'no file-system monitor ran during the check');
});

test('finding 2a: the first failing test is read from blank lines in linear time', async (t) => {
  const root = testedProject();
  fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
  // The reader of a failing run's output is reached through the test call only, so the call
  // is made in this process with the quality agent answering a failing run, and what is
  // counted is the processor time this process spends from the moment the run's output is
  // handed over (the copy is made before that; git runs in other processes).
  let handedOver = process.cpuUsage();
  const failingWith = (output) => async () => {
    t.mock.method(qualityAgent, 'runFullTests', async () => {
      handedOver = process.cpuUsage();
      return { passed: false, passCount: 0, failed: 1, skipped: 0, flaky: 0, output };
    });
    try {
      return await check(root, '--run-tests', 'src/styles/home.css');
    } finally {
      t.mock.restoreAll();
    }
  };
  const readerMs = async (call) => {
    await call();
    const used = process.cpuUsage(handedOver);
    return (used.user + used.system) / 1000;
  };
  // What the rest of the call costs after the hand-over, with nothing to read: taken off.
  const idle = Math.min(await readerMs(failingWith('boom\n')), await readerMs(failingWith('boom\n')), await readerMs(failingWith('boom\n')));
  const big = await failingWith(`${'\n'.repeat(1024)}boom\n`)();
  assert.equal(big.text, refusal('the existing tests fail (the test command reported a failure)'));
  const { n, small, big: four, ratio } = await growth((kb) => failingWith(`${'\n'.repeat(kb * 1024)}boom\n`), 16, 4096,
    async (call) => Math.max(await readerMs(call) - idle, 0));
  t.diagnostic(`${n} KB of blank lines: ${small.toFixed(1)} ms, ${4 * n} KB: ${four.toFixed(1)} ms, ${ratio.toFixed(1)} times as long`);
  assert.ok(ratio < 8, `${n} KB of blank lines took ${small.toFixed(1)} ms and ${4 * n} KB took ${four.toFixed(1)} ms`);
});

test('finding 2c: a colour change in a one-line stylesheet is judged in linear time', async (t) => {
  const many = (n) => '.a { color: red; } '.repeat(100 * n);
  // (A `box-shadow` until the re-check of 2026-10-10, when it stopped being a colour shorthand.)
  const long = (n) => `.a { background:${' red'.repeat(400 * n)}; }`;
  const shapes = [
    ['short declarations, the last colour changed', many, (base) => `${base.slice(0, base.lastIndexOf('red'))}blue; } `, null],
    // Since the sixth round a colour passes only as the whole value of its property (the
    // functional plan, amended 2026-10-09), so the long `box-shadow` list is refused; the
    // time it takes to say so is what this case measures.
    ['one long declaration, every colour changed', long, (base) => base.replace(/red/g, 'tan'), inexact('src/styles/site.css')]
  ];
  for (const [label, build, edit, clause] of shapes) {
    const root = makeRepo({ 'src/styles/site.css': `${build(4)}\n` });
    fs.writeFileSync(path.join(root, 'src', 'styles', 'site.css'), `${edit(build(4))}\n`);
    const res = await check(root, 'src/styles/site.css');
    if (clause === null) assertChecking(res, ['src/styles/site.css']);
    else assert.equal(res.text, refusal(clause));
    const at = (n) => {
      const change = changeOf('src/styles/site.css', `${build(n)}\n`, `${edit(build(n))}\n`);
      return () => assert.equal((ruleRefusal(change) || { clause: null }).clause, clause);
    };
    const { n, small, big, ratio } = await growth(at, 16, 800);
    t.diagnostic(`${label}: size ${n} ${small.toFixed(1)} ms, size ${4 * n} ${big.toFixed(1)} ms, ${ratio.toFixed(1)} times as long`);
    assert.ok(ratio < 8, `${label}: size ${n} took ${small.toFixed(1)} ms and size ${4 * n} took ${big.toFixed(1)} ms`);
  }
});

test('finding 6: a tracked test command with shell structure runs no test and says so', async () => {
  const root = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': PASSING_TEST,
    '.ctoc/quality-config.yaml': 'languages:\n  javascript:\n    test: npm run build && npm test\n' }, { testScript: SCRIPT });
  fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
  await refusedUntouched(root, ['--run-tests', 'src/styles/home.css'], NO_TEST);
});

test('finding 8: a named file with control characters is quoted cleaned in every sentence', async () => {
  const root = makeRepo({ 'README.md': 'Old wording.\n' });
  assert.equal((await check(root, 'nope\u001b[2J.md')).text, unreadable('nope [2J.md holds no change that git would commit'));
  assert.equal((await check(root, '../x\u001b.md')).text, unreadable('../x .md is outside this project'));
});

test('finding 9: a judged file named like an option reaches the test run after --', async () => {
  const root = makeRepo({ '--x.css': 'a { color: red; }\n', 'tests/any.test.js': nodeTest('runs', '  assert.ok(true);') }, { testScript: SCRIPT });
  fs.writeFileSync(path.join(root, '--x.css'), 'a { color: blue; }\n');
  const first = await check(root, '--', '--x.css');
  assertChecking(first, ['--x.css']);
  assert.equal(first.next, "hotfix check --run-tests -- '--x.css'");
  const words = shellWords(first.next);
  assert.deepEqual(words.slice(0, 2), ['hotfix', 'check']);
  const second = await check(root, ...words.slice(2));
  assertPass(second, ['--x.css']);
  fs.writeFileSync(path.join(root, 'notes.css'), 'b { color: red; }\n');
  git(root, ['add', 'notes.css']);
  git(root, ['commit', '-q', '-m', 'notes']);
  fs.writeFileSync(path.join(root, 'notes.css'), 'b { color: blue; }\n');
  const mixed = await check(root, '--', 'notes.css', '--x.css');
  assert.equal(mixed.next, "hotfix check --run-tests -- '--x.css' 'notes.css'", 'a mixed set carries --');
  assertPass(await check(root, ...shellWords(mixed.next).slice(2)), ['--x.css', 'notes.css']);
  assert.equal((await check(root, '--run-tests', '--x.css')).text, `Unknown hotfix command: --x.css. ${USAGE}`,
    'without --, a name that looks like an option is still the usage text');
});

test('finding 10: removal never follows a copy the tests swapped for a link to an outside folder', async (t) => {
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  /** Replace the copy, from inside the test run, by a link to `outside`; returns where the copy was. */
  const swapCopyFor = (outside) => {
    const where = { tree: null };
    t.mock.method(qualityAgent, 'runFullTests', async () => {
      where.tree = process.cwd();
      process.chdir(PRIVATE_TMP);
      fs.renameSync(where.tree, `${where.tree}-moved`);
      fs.symlinkSync(outside, where.tree, linkType);
      return { passed: true, passCount: 1, failed: 0, skipped: 0, flaky: 0 };
    });
    return where;
  };
  const OUTSIDE = 'outside file\n';
  await t.test('(a) with linked package folders: no link is unlinked through the swapped copy', async () => {
    const outside = tmpDir('hotfix-outside-');
    writeFiles(outside, { 'node_modules': OUTSIDE, '.venv': OUTSIDE, 'packages/a/node_modules': OUTSIDE });
    const root = linkedProject("  assert.equal(require('greet'), 'hello');\n");
    fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
    const where = swapCopyFor(outside);
    const res = await check(root, '--run-tests', 'src/styles/home.css');
    t.mock.restoreAll();
    assert.deepEqual(treeBytes(outside), { 'node_modules': sha(OUTSIDE), '.venv': sha(OUTSIDE),
      'packages/a/node_modules': sha(OUTSIDE) }, 'nothing outside the copy was deleted');
    assert.equal(res.verdict, 'hotfix', JSON.stringify(res));
    assert.match(res.detail, /^the temporary copy at .+ could not be removed: a link's folder moved outside it$/);
    fs.unlinkSync(where.tree);
    fs.rmSync(copyParent(where.tree), { recursive: true, force: true });
  });
  await t.test('(b) with no link: git refuses to remove the swapped copy as its worktree', async () => {
    const outside = tmpDir('hotfix-outside-');
    writeFiles(outside, { 'keep.txt': OUTSIDE, 'src/styles/home.css': OUTSIDE });
    const root = testedProject();
    fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
    const where = swapCopyFor(outside);
    const res = await check(root, '--run-tests', 'src/styles/home.css');
    t.mock.restoreAll();
    assert.deepEqual(treeBytes(outside), { 'keep.txt': sha(OUTSIDE), 'src/styles/home.css': sha(OUTSIDE) },
      'nothing outside the copy was deleted');
    assert.equal(res.verdict, 'hotfix', JSON.stringify(res));
    // git itself refuses to remove a worktree that is no longer the one it registered.
    assert.match(res.detail, /^the temporary copy at .+ could not be removed: git worktree failed: fatal: validation failed/);
    fs.unlinkSync(where.tree);
    fs.rmSync(copyParent(where.tree), { recursive: true, force: true });
  });
  await t.test('(c) a link whose folder the tests removed counts as removed', async () => {
    const root = linkedProject("  assert.equal(require('greet'), 'hello');\n");
    const owned = treeBytes(path.join(root, 'packages', 'a', 'node_modules'));
    fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
    const where = { tree: null };
    t.mock.method(qualityAgent, 'runFullTests', async () => {
      where.tree = process.cwd();
      fs.rmSync(path.join(where.tree, 'packages'), { recursive: true, force: true });
      return { passed: true, passCount: 1, failed: 0, skipped: 0, flaky: 0 };
    });
    const res = await check(root, '--run-tests', 'src/styles/home.css');
    t.mock.restoreAll();
    assertPass(res, ['src/styles/home.css']);
    assert.equal(fs.existsSync(copyParent(where.tree)), false, 'the copy is gone');
    assert.deepEqual(treeBytes(path.join(root, 'packages', 'a', 'node_modules')), owned, 'the owner\'s folder is intact');
  });
});

test('finding 11: a kill from outside removes the copy, then the signal ends the process', async () => {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  const listeners = () => signals.map((s) => process.listenerCount(s));
  const before = listeners();
  const plain = testedProject();
  fs.writeFileSync(path.join(plain, 'src', 'styles', 'home.css'), HOME_STORE);
  assertPass(await check(plain, '--run-tests', 'src/styles/home.css'), ['src/styles/home.css']);
  assert.deepEqual(listeners(), before, 'the handlers are removed after the check');
  // A signal from outside reaches a process on Windows only as a forced end, which no
  // handler sees; there the in-process half above is the whole contract.
  if (process.platform === 'win32') return;
  const probe = probeDir();
  const childTmp = tmpDir('hotfix-child-tmp-');
  const slow = "const fs = require('fs');\nconst path = require('path');\n"
    + "fs.writeFileSync(path.join(process.env.CTOC_HOTFIX_PROBE, 'started.txt'), process.cwd());\n"
    + 'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);\n'
    + "process.stdout.write('\\u2139 pass 1\\n\\u2139 fail 0\\n');\n";
  const root = makeRepo({ 'src/styles/home.css': HOME, 'slow.js': slow }, { testScript: 'node slow.js' });
  fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
  const runner = path.join(tmpDir('hotfix-runner-'), 'run.js');
  fs.writeFileSync(runner, `const { route } = require(${JSON.stringify(path.join(__dirname, '..', 'src', 'lib', 'menu-screens'))});\n`
    + "route(['hotfix', 'check', '--run-tests', 'src/styles/home.css'], process.argv[2]).then((r) => process.stdout.write(JSON.stringify(r)));\n");
  const env = { ...process.env, TMPDIR: childTmp, TEMP: childTmp, TMP: childTmp, CTOC_HOTFIX_PROBE: probe };
  delete env.NODE_TEST_CONTEXT;
  const child = require('child_process').spawn(NODE, [runner, root], { env, stdio: 'ignore' });
  const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })));
  const deadline = Date.now() + 30000;
  while (probeRead(probe, 'started.txt') === null && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
  assert.ok(probeRead(probe, 'started.txt'), 'the tests started in the copy');
  child.kill('SIGTERM');
  const { signal } = await exited;
  assert.equal(signal, 'SIGTERM', 'the signal is raised again and ends the process');
  assert.deepEqual(fs.readdirSync(childTmp).filter((n) => n.startsWith('ctoc-hotfix-')), [], 'no copy remains');
  assert.equal(worktrees(root).split('\n\n').filter(Boolean).length, 1, 'the copy\'s worktree registration is gone');
});

// The security check's second round (2026-10-08).

test('round 2, finding 1: a staged edit hidden behind an index bit is refused, or committed exactly as judged', async (t) => {
  const SCRIPTS = HOME_STORE.replace('</body>', `${'<script>steal()</script>\n'.repeat(30)}</body>`);
  const marked = 'I could not read the change (src/styles/home.css is marked in git\'s index as unchanged or skipped)';
  const shapes = [
    ['assume-unchanged', ['update-index', '--assume-unchanged', 'src/styles/home.css'], null, true],
    ['core.ignoreStat=true', null, ['config', 'core.ignoreStat', 'true'], true],
    ['skip-worktree', ['update-index', '--skip-worktree', 'src/styles/home.css'], null, true]
  ];
  for (const [label, mark, config, mustRefuse] of shapes) {
    await t.test(label, async () => {
      const root = testedProject();
      const home = path.join(root, 'src', 'styles', 'home.css');
      if (config) git(root, config);
      fs.writeFileSync(home, HOME_STORE);
      git(root, ['add', 'src/styles/home.css']);
      if (mark) git(root, mark);
      fs.writeFileSync(home, SCRIPTS);
      const first = await check(root, 'src/styles/home.css');
      const last = first.verdict === 'checking' ? await check(root, '--run-tests', 'src/styles/home.css') : first;
      t.diagnostic(`${label}: ${last.verdict} ${last.text}`);
      if (mustRefuse) assert.equal(last.text, refusal(marked), JSON.stringify(last));
      if (last.verdict === 'refused') return;
      assert.equal(last.verdict, 'hotfix', JSON.stringify(last));
      const judgedLines = logLines(root).pop().lines;
      runCommit(root, last.commit);
      const [added, removed] = git(root, ['diff', '--numstat', 'HEAD~1', 'HEAD']).trim().split('\t');
      assert.equal(Number(added) + Number(removed), judgedLines, 'the commit holds exactly the changed lines that were judged');
      for (const j of last.commit.judged || []) assert.equal(git(root, ['rev-parse', `HEAD:${j.path}`]).trim(), j.blob);
    });
  }
});

test('round 2, finding 3: a project inside a sensitive, test, governing, build or database folder is judged by its path from the repository top', async () => {
  const un = (f) => `I do not recognise ${f} as wording or a colour`;
  // [the project folder, the file, its old and new content, the clause]
  const shapes = [
    ['services/payment', 'index.css', 'a { color: red; }\n', 'a { color: blue; }\n', 'index.css sits in an area named payment, and such areas are never a hotfix'],
    ['tests/e2e', 'index.css', 'a { color: red; }\n', 'a { color: blue; }\n', 'it changes a test (index.css)'],
    ['agents/x', 'index.css', 'a { color: red; }\n', 'a { color: blue; }\n', un('index.css')],
    ['.circleci/web', 'config.yml', 'name: old\n', 'name: new\n', 'it changes how the project is built or shipped in config.yml'],
    ['db/migrations/app', 'seed.yaml', 'name: old\n', 'name: new\n', 'it changes stored data in seed.yaml']
  ];
  const base = {};
  for (const [dir, file, old] of shapes) base[`${dir}/${file}`] = old;
  const repo = makeRepo(base);
  for (const [dir, file, old, changed, clause] of shapes) {
    const abs = path.join(repo, ...dir.split('/'), file);
    fs.writeFileSync(abs, changed);
    const res = await check(path.join(repo, ...dir.split('/')), file);
    fs.writeFileSync(abs, old);
    assert.equal(res.text, refusal(clause), `${dir}: ${JSON.stringify(res)}`);
  }
});

test('round 2, finding 9: a pass names each judged file with its staged id, which a rewriting commit hook no longer matches', async () => {
  const root = testedProject();
  const home = path.join(root, 'src', 'styles', 'home.css');
  fs.writeFileSync(home, HOME_STORE);
  const res = await check(root, '--run-tests', 'src/styles/home.css');
  assertPass(res, ['src/styles/home.css']);
  const blob = git(root, ['hash-object', 'src/styles/home.css']).trim();
  assert.deepEqual(res.commit.judged, [{ path: 'src/styles/home.css', blob }]);
  // A repository pre-commit hook that rewrites the judged file and stages another: the
  // commit then holds bytes nobody judged, and the judged ids are what can show it.
  fs.writeFileSync(path.join(root, '.git', 'hooks', 'pre-commit'),
    "#!/bin/sh\necho '<script>steal()</script>' >> src/styles/home.css\ngit add src/styles/home.css\necho extra > extra.txt\ngit add extra.txt\n",
    { mode: 0o755 });
  runCommit(root, res.commit);
  const committed = spawnSync('git', ['rev-parse', 'HEAD:src/styles/home.css'], { cwd: root, encoding: 'utf8' }).stdout.trim();
  const names = git(root, ['show', '--name-only', '--format=', 'HEAD']).trim().split('\n');
  assert.ok(committed !== blob || names.length > 1, `the hook changed the commit: ${committed} ${names.join(' ')}`);
});

test('round 9: paths and names — governing folders, sensitive words in every spelling, byte-order marks and line endings', async () => {
  const un = (f) => `I do not recognise ${f} as wording or a colour`;
  const area = (word) => (f) => `${f} sits in an area named ${word}, and such areas are never a hotfix`;
  const COLOUR = ['a { color: red; }\n', 'a { color: blue; }\n'];
  // [what the row shows, path, [before, after], the clause, or null for the first call's `checking`]
  const rows = [
    // 1. The folders that govern the work, in any letter case and at any depth (red: `checking`).
    ['governing folder', 'prompts/intro.css', COLOUR, un],
    ['governing folder', 'docs/Prompts/tone.css', COLOUR, un],
    ['governing folder', 'output-styles/terse.css', COLOUR, un],
    ['governing folder', 'site/output-styles/site.css', COLOUR, un],
    ['governing folder', 'site/skills/site.css', COLOUR, un],
    ['governing folder', '.claude/theme/page.css', COLOUR, un],
    // 2. A file an instruction file links to or names is judged like any other (the reader of
    // links went with the Markdown reader, and the search for a name with the re-check of
    // 2026-10-10); a Markdown file is refused by its extension.
    ['linked', 'docs/linked.md', ['Some words here.\n', 'Some other words here.\n'], un],
    ['linked', 'src/styles/linked.css', COLOUR, null],
    // 3. A sensitive word behind capitals, a mark or a character nobody sees (red: `checking`).
    ['sensitive word', 'src/APIKey/site.css', COLOUR, area('key')],
    ['sensitive word', 'src/SSOLogin/site.css', COLOUR, area('login')],
    ['sensitive word', 'src/JWTToken/site.css', COLOUR, area('token')],
    ['sensitive word', 'src/UIAdmin/site.css', COLOUR, area('admin')],
    ['sensitive word', 'src/HTMLAuth/site.css', COLOUR, area('auth')],
    ['sensitive word', 'src/pay\u200bment/site.css', COLOUR, area('payment')],
    ['sensitive word', 'src/p\u00e1yment/site.css', COLOUR, area('payment')],
    ['sensitive word', 'src/styles/payments.css', COLOUR, area('payment')],
    ['sensitive word', 'src/styles/keys.css', COLOUR, area('key')],
    // Words that hold one refuse since the tenth round (both passed until then); a part that is
    // exactly `author`, and the one plural a stylesheet's name may carry, pass (guards).
    ['sensitive word', 'src/HTMLAuthor/site.css', COLOUR, area('auth')],
    ['sensitive word', 'src/APIKeyboard/site.css', COLOUR, area('key')],
    ['sensitive word', 'src/author/site.css', COLOUR, null],
    // (A stylesheet named for design tokens passed until the second final re-check of 2026-10-10, which took the exception out.)
    ['sensitive word', 'src/styles/design-tokens.css', COLOUR, area('token')],
    // 4. A byte-order mark on one side only, or another count of carriage returns, in a
    // stylesheet (red: `checking`).
    ['mark and line ending', 'src/styles/marked.css', [COLOUR[0], `\ufeff${COLOUR[1]}`], un],
    ['mark and line ending', 'src/styles/ending.css', ['a { color: red; }\nb { margin: 0; }\n', 'a { color: blue; }\r\nb { margin: 0; }\n'], un],
    ['mark and line ending', 'src/styles/both.css', ['\ufeffa { color: red; }\r\n', '\ufeffa { color: blue; }\r\n'], null]
  ];
  const base = { 'CLAUDE.md': '# Instructions\n\nRead [the guide](docs/linked.md) and [the page](src/styles/linked.css).\n@src/styles/linked.css\n',
    'AGENTS.md': 'Follow [the colours](src/styles/linked.css).\n' };
  for (const [, p, [before]] of rows) base[p] = before;
  const root = makeRepo(base);
  const wrong = [];
  for (const [what, p, [before, after], expected] of rows) {
    fs.writeFileSync(path.join(root, ...p.split('/')), after);
    const res = await check(root, p);
    fs.writeFileSync(path.join(root, ...p.split('/')), before);
    const want = expected === null ? STATUS_LINE : refusal(expected(p));
    if (res.text !== want) wrong.push(`${what} ${p}: ${res.verdict === 'checking' ? 'checking' : res.text}`);
    else if (expected === null) assertChecking(res, [p]);
  }
  assert.deepEqual(wrong, []);

});
