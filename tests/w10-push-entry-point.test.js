/**
 * W10-s1 — Real /ctoc:push entry point (H3)
 *
 * Behavior tests for src/commands/push.js. Every case injects fakes via the
 * `run(opts, deps)` seam — NO real test-suite run and NO real network push.
 *
 * Load-bearing behaviors under test:
 *   - A Tier-1 check failure means `pushToRemote` is NEVER called (fail-safe).
 *   - Clean Tier-1 pass calls `pushToRemote` exactly once.
 *   - `--dry-run` runs the checks but does not push.
 *   - `--skip-tests` omits ONLY the test runner; the others still run.
 *   - The test check is the project's WHOLE declared suite (runWholeSuiteBeforePush):
 *     never a subset, never a cached pass, never a zero-test pass; the commit that was
 *     tested is the commit that is pushed.
 *   - `--force` never overrides a Tier-1 failure.
 *   - `parsePushArgs` recognizes every documented flag and reports unknowns.
 *   - `require('quality-agent')` is side-effect-free (the require.main guard).
 */

const assert = require('node:assert/strict');
const { test, describe, after } = require('node:test');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const push = require('../src/commands/push');
const qualityAgent = require('../src/lib/quality-agent');
const qualityState = require('../src/lib/quality-state');
const toolDetector = require('../src/lib/tool-detector');

const tmpDirs = [];

/** A fresh directory under the OS temp dir (real path), removed after the file's tests. */
function mkTmp(prefix) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  tmpDirs.push(dir);
  return dir;
}

/** Run `fn` with process.cwd() set to `dir`; the previous cwd is restored. */
async function withCwd(dir, fn) {
  const previous = process.cwd();
  process.chdir(dir);
  try {
    return await fn();
  } finally {
    process.chdir(previous);
  }
}

after(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

/**
 * Build a set of injectable deps. Each check runner defaults to a passing
 * async stub; override per-test. `pushToRemote` and `detect` are spies.
 */
function makeDeps(overrides = {}) {
  const calls = {
    runLint: 0,
    runTypecheck: 0,
    runWholeSuite: 0,
    runSecurityScan: 0,
    pushToRemote: 0,
    detect: 0
  };
  const pass = async () => ({ passed: true });
  const passTests = async () => ({
    passed: true,
    passCount: 3,
    countKnown: true,
    commands: ['npm test'],
    text: 'Tests: passed — `npm test`: 3 passed.'
  });
  const deps = {
    detect: () => {
      calls.detect++;
      return { languages: ['javascript'], tools: {} };
    },
    runLint: async (t) => {
      calls.runLint++;
      return (overrides.runLint || pass)(t);
    },
    runTypecheck: async (t) => {
      calls.runTypecheck++;
      return (overrides.runTypecheck || pass)(t);
    },
    runWholeSuite: async (t) => {
      calls.runWholeSuite++;
      return (overrides.runWholeSuite || passTests)(t);
    },
    runSecurityScan: async (t) => {
      calls.runSecurityScan++;
      return (overrides.runSecurityScan || pass)(t);
    },
    pushToRemote: () => {
      calls.pushToRemote++;
      return overrides.pushToRemote ? overrides.pushToRemote() : true;
    },
    readHead: () => 'h1',
    uncommittedPaths: () => [],
    logger: { log: () => {} }
  };
  return { deps, calls };
}

describe('push.js — run(opts, deps) seam', () => {
  test('1. happy path: checks pass, push runs exactly once', async () => {
    const { deps, calls } = makeDeps();
    const result = await push.run({}, deps);
    assert.equal(result.ok, true);
    assert.equal(result.pushed, true);
    assert.equal(calls.pushToRemote, 1, 'pushToRemote called exactly once');
  });

  test('2. Tier-1 failure blocks, push never called', async () => {
    const { deps, calls } = makeDeps({
      runWholeSuite: async () => ({ passed: false, text: 'Tests: failed — `npm test` reported 1 failing test.' })
    });
    const result = await push.run({}, deps);
    assert.equal(result.ok, false);
    assert.equal(result.pushed, false);
    assert.equal(result.tier, 1);
    assert.ok(result.blockedBy.includes('tests'), 'blockedBy names tests');
    assert.match(result.text, /1 failing test/);
    assert.equal(calls.pushToRemote, 0, 'pushToRemote NEVER called on Tier-1 failure');
  });

  test('3. --dry-run runs checks but does not push', async () => {
    const { deps, calls } = makeDeps();
    const result = await push.run({ dryRun: true }, deps);
    assert.equal(result.ok, true);
    assert.equal(result.pushed, false);
    assert.equal(result.dryRun, true);
    assert.equal(calls.pushToRemote, 0, 'dry-run never pushes');
    assert.ok(/Would push/.test(result.text), 'text contains "Would push"');
    // checks still ran
    assert.equal(calls.runLint, 1);
    assert.equal(calls.runWholeSuite, 1);
    assert.match(result.text, /3 passed/);
  });

  test('4. --skip-tests omits the test runner only', async () => {
    const { deps, calls } = makeDeps();
    const result = await push.run({ skipTests: true }, deps);
    assert.equal(calls.runWholeSuite, 0, 'test runner is NOT called');
    assert.equal(calls.runLint, 1, 'lint still runs');
    assert.equal(calls.runTypecheck, 1, 'typecheck still runs');
    assert.equal(calls.runSecurityScan, 1, 'security still runs');
    assert.equal(result.ok, true);
    assert.equal(result.pushed, true, 'push proceeds when the rest pass');
    assert.equal(calls.pushToRemote, 1);
    assert.match(result.text, /no test ran before this push/);
  });

  test('5. --force never overrides a Tier-1 failure', async () => {
    const { deps, calls } = makeDeps({
      runLint: async () => ({ passed: false })
    });
    const result = await push.run({ force: true }, deps);
    assert.equal(result.ok, false, 'force does not flip a Tier-1 block');
    assert.equal(result.pushed, false);
    assert.equal(result.tier, 1);
    assert.ok(result.blockedBy.includes('lint'));
    assert.equal(calls.pushToRemote, 0, 'force never pushes past a Tier-1 failure');
  });
});

describe('push.js — security skip disclosure (honesty)', () => {
  test('8. passing security with skipped scanners surfaces a partial-coverage line', async () => {
    const skipped = [
      'secrets scan skipped (error, NOT a pass)',
      'SCA skipped: no scanner'
    ];
    const { deps } = makeDeps({
      runSecurityScan: async () => ({ passed: true, critical: 0, high: 0, skipped })
    });
    const result = await push.run({}, deps);
    // The gate decision is unchanged: skips do NOT block.
    assert.equal(result.ok, true, 'skips never block the push');
    assert.equal(result.pushed, true);
    assert.equal(result.blockedBy.length, 0, 'skips do not populate blockedBy');
    // But the honesty payload MUST reach the structured output.
    assert.ok(
      /skip/i.test(result.text),
      'text must disclose that scanner(s) were skipped'
    );
    assert.ok(
      /2/.test(result.text),
      'text must name how many scanners were skipped (2)'
    );
    assert.ok(
      result.text.includes('secrets scan skipped (error, NOT a pass)'),
      'text should echo at least the first skipped scanner detail'
    );
  });

  test('9. clean security (no skips) emits no spurious skip line', async () => {
    const { deps } = makeDeps({
      runSecurityScan: async () => ({ passed: true, critical: 0, high: 0, skipped: [] })
    });
    const result = await push.run({}, deps);
    assert.equal(result.ok, true);
    assert.equal(result.pushed, true);
    assert.ok(!/skip/i.test(result.text), 'no skip disclosure when nothing was skipped');
  });

  test('10. missing skipped field is read defensively (no throw, no skip line)', async () => {
    const { deps } = makeDeps({
      runSecurityScan: async () => ({ passed: true })
    });
    const result = await push.run({}, deps);
    assert.equal(result.ok, true);
    assert.ok(!/skip/i.test(result.text), 'undefined skipped → guarded, no line');
  });

  test('11. a blocked push (security failed) still blocks as before', async () => {
    const { deps, calls } = makeDeps({
      runSecurityScan: async () => ({
        passed: false,
        critical: 1,
        high: 0,
        skipped: ['SAST skipped: no scanner']
      })
    });
    const result = await push.run({}, deps);
    assert.equal(result.ok, false, 'security failure still blocks');
    assert.equal(result.pushed, false);
    assert.equal(result.tier, 1);
    assert.ok(result.blockedBy.includes('security'), 'blockedBy names security');
    assert.equal(calls.pushToRemote, 0, 'never pushes past a Tier-1 security block');
  });
});

describe('push.js — Finding A: auto-undetermined tests block, never a silent green push', () => {
  test('12. an auto-undetermined test command BLOCKS the push (the real whole-suite check, not injected)', async () => {
    // detect() returns a language whose test command the detector could NOT determine
    // (test:null + testUndetermined:true). The REAL quality-agent.runWholeSuiteBeforePush runs
    // (NOT injected) so the undetermined guard is exercised end-to-end through the live
    // push consumer. The old behavior treated null as "nothing to run = PASS" and pushed.
    let pushed = 0;
    const dir = mkTmp('ctoc-push-case12-');
    const result = await withCwd(dir, () => push.run({}, {
      detect: () => ({ languages: ['javascript'], tools: { javascript: { test: null, testUndetermined: true } } }),
      runLint: async () => ({ passed: true }),
      runTypecheck: async () => ({ passed: true }),
      // runWholeSuite intentionally NOT injected → the real check must surface undetermined.
      runSecurityScan: async () => ({ passed: true, critical: 0, high: 0, skipped: [] }),
      readHead: () => 'h1',
      uncommittedPaths: () => [],
      pushToRemote: () => { pushed++; return true; },
      logger: { log: () => {} }
    }));
    assert.equal(result.ok, false, 'undetermined tests must block the push, not silently pass');
    assert.equal(result.tier, 1);
    assert.ok(result.blockedBy.includes('tests'), 'tests must be the blocker');
    assert.match(result.text, /not verified/);
    assert.equal(pushed, 0, 'never pushes when the test command is undetermined');
  });
});

describe('push.js — parsePushArgs', () => {
  test('6. recognizes every documented flag and reports unknowns', () => {
    const ok = push.parsePushArgs(['--force', '--dry-run']);
    assert.equal(ok.force, true);
    assert.equal(ok.dryRun, true);
    assert.equal(ok.skipTests, false);
    assert.deepEqual(ok.unknown, []);

    const skip = push.parsePushArgs(['--skip-tests']);
    assert.equal(skip.skipTests, true);

    const bad = push.parsePushArgs(['--bogus']);
    assert.ok(bad.unknown.includes('--bogus'), 'unknown flag reported, never silently ignored');
  });
});

describe('quality-agent.js — require guard regression', () => {
  test('7. requiring quality-agent has no side effects and exports the blocks', () => {
    // Run in an EMPTY temp dir so that even if the guard were absent, main()
    // would detect no languages and return without running a suite or pushing.
    // With the guard present, require returns immediately and the script prints
    // exactly "OK".
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-qa-guard-'));
    const script =
      "const m=require(" + JSON.stringify(path.join(REPO_ROOT, 'src/lib/quality-agent')) + ");" +
      "if(typeof m.runTieredChecks!=='function'||typeof m.pushToRemote!=='function'){process.exit(3);}" +
      "process.stdout.write('OK');";
    let out;
    try {
      out = execFileSync(process.execPath, ['-e', script], {
        cwd: tmp,
        encoding: 'utf8'
      });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    assert.equal(
      out.trim(),
      'OK',
      'require(quality-agent) must not auto-run main() and must export runTieredChecks + pushToRemote'
    );
  });
});

// =============================================================================
// The push runs the project's WHOLE declared suite (the real shared check, not injected)
// =============================================================================

/** A git repository (no upstream) committing src/widget.js and tests/widget.test.js. */
function makeGitFixture() {
  const dir = mkTmp('ctoc-push-git-');
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q');
  git('config', 'user.email', 'fixture@example.com');
  git('config', 'user.name', 'fixture');
  git('config', 'commit.gpgsign', 'false');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.mkdirSync(path.join(dir, 'tests'));
  fs.writeFileSync(path.join(dir, 'src', 'widget.js'), 'module.exports = 1;\n');
  fs.writeFileSync(path.join(dir, 'tests', 'widget.test.js'), "require('node:test')('widget', () => {});\n");
  git('add', '-A');
  git('commit', '-q', '-m', 'first');
  return dir;
}

/**
 * A configured test command that appends its argv to a counter file (outside any fixture)
 * and prints `output`, exiting with `exit`.
 */
function makeRunner(output, exit = 0) {
  const home = mkTmp('ctoc-push-runner-');
  const file = path.join(home, 'runner.js');
  const counter = path.join(home, 'counter.txt');
  fs.writeFileSync(file, [
    `require('fs').appendFileSync(${JSON.stringify(counter)}, JSON.stringify(process.argv.slice(2)) + '\\n');`,
    `process.stdout.write(${JSON.stringify(output)});`,
    `process.exit(${exit});`,
    ''
  ].join('\n'));
  const command = `${JSON.stringify(process.execPath)} ${JSON.stringify(file)}`;
  return {
    command,
    runs: () => (fs.existsSync(counter) ? fs.readFileSync(counter, 'utf8').split('\n').filter(Boolean) : [])
  };
}

const PASS_1 = 'ℹ tests 1\nℹ pass 1\nℹ fail 0';
const PASS_3 = 'ℹ tests 3\nℹ pass 3\nℹ fail 0';

/** The detector's shape: `push.js` reads `detection.tools`. */
const detectWith = (tools) => () => ({ languages: ['javascript'], tools });
const detectCommand = (command) => detectWith({ javascript: { test: command } });

/** Replace the hash cache with an in-memory one, so nothing touches this repository's state. */
function memoryHashes(t) {
  const hashes = {};
  const calls = { get: 0 };
  t.mock.method(qualityState, 'getFileHashes', () => { calls.get++; return hashes; });
  t.mock.method(qualityState, 'updateFileHashes', (h) => { Object.assign(hashes, h); });
  return calls;
}

/** Deps with the four other checks and the push injected; the test check and git readers are the caller's. */
function realCheckDeps(over = {}) {
  const lines = [];
  const state = { pushes: 0, lines };
  const deps = {
    runLint: async () => ({ passed: true }),
    runTypecheck: async () => ({ passed: true }),
    runSecurityScan: async () => ({ passed: true, critical: 0, high: 0, skipped: [] }),
    pushToRemote: () => { state.pushes++; return true; },
    readHead: () => 'h1',
    uncommittedPaths: () => [],
    logger: { log: (l) => lines.push(l) },
    ...over
  };
  return { deps, state };
}

describe('push.js — the push runs the whole declared suite', () => {
  test('P1. the declared command runs once with no test-file arguments; the selected-tests path is never consulted', async (t) => {
    const dir = makeGitFixture();
    const runner = makeRunner(PASS_1);
    const hashCalls = memoryHashes(t);
    let smart = 0;
    t.mock.method(qualityAgent, 'runSmartTests', async () => { smart++; return { passed: true, passCount: 0 }; });
    const { deps } = realCheckDeps({ detect: detectCommand(runner.command) });
    const result = await withCwd(dir, () => push.run({ dryRun: true }, deps));
    assert.deepEqual(runner.runs(), ['[]'], 'the runner ran exactly once with no arguments');
    assert.equal(smart, 0, 'runSmartTests is never called');
    assert.equal(hashCalls.get, 0, 'the hash cache is never consulted');
    assert.equal(result.ok, true);
  });

  test('P2. a cached "nothing changed" answer is never a pass: two pushes run the suite twice', async (t) => {
    const dir = makeGitFixture();
    fs.mkdirSync(path.join(dir, '.ctoc'));
    fs.writeFileSync(path.join(dir, '.ctoc', 'settings.json'), '{}');
    const runner = makeRunner(PASS_1);
    memoryHashes(t);
    let attempts = 0;
    const { deps } = realCheckDeps({ detect: detectCommand(runner.command), pushToRemote: () => { attempts++; return attempts > 1; } });
    await withCwd(dir, () => push.run({}, deps));
    const second = await withCwd(dir, () => push.run({}, deps));
    assert.equal(runner.runs().length, 2, 'the suite ran on both pushes');
    assert.match(second.text, /1 passed/);
  });

  test('P3. a failing test blocks the push and the text states the failing count', async () => {
    const dir = mkTmp('ctoc-push-p3-');
    const failing = path.join(dir, 'fail.test.js');
    fs.writeFileSync(failing, "require('node:test')('fails', () => { throw new Error('on purpose'); });\n");
    const { deps, state } = realCheckDeps({
      detect: detectCommand(`${JSON.stringify(process.execPath)} --test ${JSON.stringify(failing)}`)
    });
    const previous = process.env.NODE_TEST_CONTEXT;
    delete process.env.NODE_TEST_CONTEXT; // a nested node --test would otherwise report to this runner
    let result;
    try {
      result = await withCwd(dir, () => push.run({ dryRun: true }, deps));
    } finally {
      if (previous !== undefined) process.env.NODE_TEST_CONTEXT = previous;
    }
    assert.equal(result.ok, false);
    assert.ok(result.blockedBy.includes('tests'));
    assert.equal(state.pushes, 0);
    assert.match(result.text, /1 failing test\b/);
  });

  test('P4. no test command means no push, and the text says so; runFullTests on the same tools still passes', async (t) => {
    const dir = mkTmp('ctoc-push-p4-');
    memoryHashes(t);
    const tools = { javascript: { lint: 'eslint .', test: null } };
    const { deps, state } = realCheckDeps({ detect: detectWith(tools) });
    const result = await withCwd(dir, () => push.run({}, deps));
    assert.equal(result.ok, false);
    assert.ok(result.blockedBy.includes('tests'));
    assert.equal(state.pushes, 0);
    assert.match(result.text, /no test command was found/);
    assert.match(result.text, /nothing was tested/);
    assert.match(result.text, /--skip-tests/);
    assert.equal((await qualityAgent.runFullTests(tools)).passed, true);
  });

  test('P5. a readable zero (node:test, jest and mocha forms) blocks and says zero tests ran', async (t) => {
    memoryHashes(t);
    const forms = [
      'ℹ tests 0\nℹ pass 0\nℹ fail 0',
      'Tests:       0 passed, 0 total',
      '  0 passing (2ms)'
    ];
    for (const output of forms) {
      const dir = mkTmp('ctoc-push-p5-');
      const runner = makeRunner(output);
      const { deps, state } = realCheckDeps({ detect: detectCommand(runner.command) });
      const result = await withCwd(dir, () => push.run({}, deps));
      assert.equal(result.ok, false, output);
      assert.ok(result.blockedBy.includes('tests'), output);
      assert.equal(state.pushes, 0, output);
      assert.match(result.text, /zero tests ran/, output);
    }
  });

  test('P6. exit 0 with no count passes, says the count is unknown, never "0 tests ran" or "(0 total)"', async (t) => {
    const dir = mkTmp('ctoc-push-p6-');
    memoryHashes(t);
    const runner = makeRunner('ok');
    const consoleLines = [];
    t.mock.method(console, 'log', (...args) => { consoleLines.push(args.join(' ')); });
    const { deps } = realCheckDeps({ detect: detectCommand(runner.command) });
    const result = await withCwd(dir, () => push.run({ dryRun: true }, deps));
    assert.equal(result.ok, true);
    assert.match(result.text, /test count unknown \(no node:test, jest or mocha pass count in its output\)/);
    assert.doesNotMatch(result.text, /\b0 tests\b/i);
    assert.doesNotMatch(result.text, /0 passed/);
    assert.ok(!consoleLines.some((l) => /\(0 total\)/.test(l)), 'the console never prints "(0 total)"');
  });

  test('P7. the output always gives the command and the count: pushed, dry run, blocked by lint', async (t) => {
    memoryHashes(t);
    const runner = makeRunner(PASS_3);
    const cases = [
      { opts: {}, over: {} },
      { opts: { dryRun: true }, over: {} },
      { opts: {}, over: { runLint: async () => ({ passed: false }) } }
    ];
    for (const { opts, over } of cases) {
      const dir = mkTmp('ctoc-push-p7-');
      const { deps, state } = realCheckDeps({ detect: detectCommand(runner.command), ...over });
      const result = await withCwd(dir, () => push.run(opts, deps));
      const label = JSON.stringify(opts) + (over.runLint ? ' lint-blocked' : '');
      assert.ok(result.text.includes(runner.command), `text names the command: ${label}`);
      assert.match(result.text, /3 passed/, label);
      const said = state.lines.join('\n');
      assert.ok(said.includes(runner.command), `the console names the command: ${label}`);
      assert.match(said, /3 passed/, label);
    }
  });

  test('P9. one npm test shared by two detected languages runs once and is not counted twice', async (t) => {
    const dir = mkTmp('ctoc-push-p9-');
    memoryHashes(t);
    const counter = path.join(mkTmp('ctoc-push-p9-count-'), 'counter.txt');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'f', version: '1.0.0', private: true, scripts: { test: 'node run.js' } }));
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(dir, 'run.js'), [
      `require('fs').appendFileSync(${JSON.stringify(counter)}, 'x\\n');`,
      "process.stdout.write('ℹ tests 2\\nℹ pass 2\\nℹ fail 0\\n');",
      ''
    ].join('\n'));
    const { deps } = realCheckDeps({ detect: () => toolDetector.detectTools(dir) });
    const result = await withCwd(dir, () => push.run({ dryRun: true }, deps));
    assert.equal(fs.readFileSync(counter, 'utf8').split('\n').filter(Boolean).length, 1, 'the command ran once');
    assert.match(result.text, /`npm test`: 2 passed/);
    assert.doesNotMatch(result.text, /4 passed/);
  });

  test('P10. a run past the time limit blocks as timed out and the text names the limit', async (t) => {
    const dir = mkTmp('ctoc-push-p10-');
    memoryHashes(t);
    const sleeper = path.join(mkTmp('ctoc-push-p10-run-'), 'sleep.js');
    fs.writeFileSync(sleeper, 'setTimeout(() => {}, 5000);\n');
    const { deps, state } = realCheckDeps({
      detect: detectCommand(`${JSON.stringify(process.execPath)} ${JSON.stringify(sleeper)}`),
      runWholeSuite: (tools) => qualityAgent.runWholeSuiteBeforePush(tools, { timeout: 300 })
    });
    const result = await withCwd(dir, () => push.run({}, deps));
    assert.equal(result.ok, false);
    assert.ok(result.blockedBy.includes('tests'));
    assert.equal(state.pushes, 0);
    assert.match(result.text, /timed out/);
    assert.match(result.text, /The time limit is 300 ms per test command/);
    assert.match(result.text, /Not pushing/);
  });

  test('P13. push.md and the README say what the code does', async () => {
    const collapse = (text) => text.replace(/\s+/g, ' ');
    const rawMd = fs.readFileSync(path.join(REPO_ROOT, 'src', 'commands', 'push.md'), 'utf8');
    const md = collapse(rawMd);
    assert.ok(!md.includes('tests (47 affected)'));
    assert.match(md, /whole declared test command before every push/);
    const row = rawMd.split('\n').find((l) => l.startsWith('| `--skip-tests`'));
    assert.ok(row, 'the --skip-tests table row exists');
    assert.match(collapse(row), /lint, type check and the security scan still run/);
    assert.match(row, /no test/);
    const quick = collapse(rawMd.slice(rawMd.indexOf('### Quick push (skip tests)'), rawMd.indexOf('### Dry run to check status')));
    assert.ok(quick.includes('lint, type check and the security scan'));
    assert.ok(quick.includes('no test runs'));
    assert.match(md, /10 minutes/);
    assert.match(md, /600000/);
    assert.match(md, /run_in_background/);
    assert.match(md, /15 minutes/);
    assert.ok(md.includes("Pass `--skip-tests` only when the human's own message asks for it; never add it to retry a blocked or timed-out push."));
    assert.ok(md.includes('The output always names each test command that ran and says how many tests passed, that the test count is unknown, or why the push was blocked; with `--skip-tests` it says that no test ran before this push.'));
    assert.match(md, /cargo, go, pytest, vitest/);
    assert.match(md, /push\.default=matching/);
    assert.ok(md.includes("Only one summary is read (the last node:test one, else jest, else mocha), so for an npm script that chains runners the count shown can be one runner's alone."));
    assert.ok(!md.includes('only the last summary is read'));
    assert.ok(md.includes('Uncommitted changes to tracked files are tested but not pushed; the output names them (new untracked files are not named)'));
    assert.ok(!md.includes('Uncommitted changes are tested but not pushed'));
    assert.ok(!md.includes('or an npm script that chains two runners'));
    assert.ok(!md.includes('runs the same quality checks that gate a commit'));
    assert.ok(md.includes("`/ctoc:push` runs lint, the type check, the project's whole declared test command"));

    const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8').split('\n');
    const line = readme.find((l) => l.includes('`/ctoc:push` runs the same checks in the foreground'));
    assert.ok(line, 'the Smart Quality Gates sentence exists');
    assert.ok(line.includes('whole declared test suite'));

    const noCommand = await withCwd(mkTmp('ctoc-push-p13-'), () => qualityAgent.runWholeSuiteBeforePush({ javascript: { lint: 'x', test: null } }));
    assert.equal(noCommand.passed, false);
    assert.equal(
      noCommand.text,
      "Tests: no test command was found, so nothing was tested. Pushing without tests is the human's choice: /ctoc:push --skip-tests."
    );
  });

  test('P14. a commit that arrives during the checks stops the push', async (t) => {
    const dir = makeGitFixture();
    memoryHashes(t);
    const runner = makeRunner(PASS_1);
    const { deps, state } = realCheckDeps({
      detect: detectCommand(runner.command),
      runWholeSuite: async () => {
        execFileSync('git', ['commit', '--allow-empty', '-m', 'arrived during the checks'], { cwd: dir, stdio: 'ignore' });
        return { passed: true, text: 'Tests: passed — `x`: 1 passed.' };
      }
    });
    delete deps.readHead;
    delete deps.uncommittedPaths;
    const result = await withCwd(dir, () => push.run({ projectRoot: dir }, deps));
    assert.equal(state.pushes, 0, 'nothing is pushed');
    assert.equal(result.ok, false);
    assert.equal(result.pushed, false);
    assert.ok(result.text.includes('a newer commit arrived during the checks and was not tested; not pushing — run /ctoc:push again'));
  });

  test('P15. uncommitted tracked changes are named as tested and not pushed, without blocking', async (t) => {
    const dir = makeGitFixture();
    memoryHashes(t);
    fs.appendFileSync(path.join(dir, 'src', 'widget.js'), '// uncommitted\n');
    execFileSync('git', ['mv', 'tests/widget.test.js', 'tests/w.test.js'], { cwd: dir, stdio: 'ignore' });
    const runner = makeRunner(PASS_1);
    const { deps } = realCheckDeps({
      detect: detectCommand(runner.command),
      runWholeSuite: async () => ({ passed: true, text: 'Tests: passed — `x`: 1 passed.' })
    });
    delete deps.readHead;
    delete deps.uncommittedPaths;
    const result = await withCwd(dir, () => push.run({ dryRun: true, projectRoot: dir }, deps));
    assert.equal(result.ok, true, 'never a block');
    assert.ok(result.text.includes('Note: tested with uncommitted changes that are not pushed:'));
    assert.ok(result.text.includes('src/widget.js'));
    assert.ok(result.text.includes('tests/w.test.js'));
    assert.ok(!result.text.includes('tests/widget.test.js'), 'the old path of a rename is skipped');
    // The text check above cannot fail if the rename skip is lost: the old path would then be
    // read as a record of its own and cut at three characters ("ts/widget.test.js"), which does
    // not contain "tests/widget.test.js". The list itself pins exactly the two paths.
    assert.deepEqual(qualityAgent.uncommittedTrackedPaths(dir).slice().sort(), ['src/widget.js', 'tests/w.test.js']);
  });

  test('P16. a commit git cannot report stops the push', async (t) => {
    const dir = mkTmp('ctoc-push-p16-');
    memoryHashes(t);
    const runner = makeRunner(PASS_1);
    const { deps, state } = realCheckDeps({
      detect: detectCommand(runner.command),
      runWholeSuite: async () => ({ passed: true, text: 'Tests: passed — `x`: 1 passed.' })
    });
    delete deps.readHead;
    delete deps.uncommittedPaths;
    const result = await withCwd(dir, () => push.run({ projectRoot: dir }, deps));
    assert.equal(state.pushes, 0);
    assert.equal(result.ok, false);
    assert.ok(result.text.includes('the commit could not be read from git'));
    const reason = qualityAgent.untestedCommitReason('abc1234', dir);
    assert.ok(typeof reason === 'string' && reason.includes('the commit could not be read from git'));
    // git cannot list the changes here: null ("I could not look"), never [] ("nothing changed").
    assert.equal(qualityAgent.uncommittedTrackedPaths(dir), null);
    assert.ok(
      result.text.includes('Note: git could not list uncommitted changes, so whether the tested tree is what gets pushed is unknown.'),
      result.text
    );
  });

  test('P16b. a clean tree is an empty list, not an unknown one', () => {
    const dir = makeGitFixture();
    assert.deepEqual(qualityAgent.uncommittedTrackedPaths(dir), []);
  });

  test('P17. a commit made while the dirty tree is read still stops the push (the commit check is the last step)', async (t) => {
    const dir = makeGitFixture();
    memoryHashes(t);
    const { deps, state } = realCheckDeps({
      runWholeSuite: async () => ({ passed: true, text: 'Tests: passed — `x`: 1 passed.' }),
      uncommittedPaths: () => {
        execFileSync('git', ['commit', '--allow-empty', '-m', 'arrived while the tree was read'], { cwd: dir, stdio: 'ignore' });
        return [];
      }
    });
    delete deps.readHead; // the real reader, on the real fixture
    const result = await withCwd(dir, () => push.run({ projectRoot: dir }, deps));
    assert.equal(state.pushes, 0, 'nothing is pushed');
    assert.equal(result.ok, false);
    assert.ok(result.text.includes('a newer commit arrived during the checks and was not tested; not pushing — run /ctoc:push again'), result.text);
  });

  test('P18. an uncommitted path with control characters is shown escaped, never raw', async () => {
    const LINE_SEPARATOR = String.fromCharCode(0x2028); // built, not typed: an invisible character in the source misleads a reader
    const { deps } = realCheckDeps({
      runWholeSuite: async () => ({ passed: true, text: 'Tests: passed — `x`: 1 passed.' }),
      uncommittedPaths: () => ['a\nb\u001b[31m.js', `c${LINE_SEPARATOR}d.js`]
    });
    const result = await push.run({ dryRun: true }, deps);
    assert.ok(result.text.includes('a\\x0ab\\x1b[31m.js'), result.text);
    assert.ok(result.text.includes('c\\u2028d.js'), result.text);
    assert.ok(!result.text.includes('\u001b') && !result.text.includes(LINE_SEPARATOR), 'no raw control character');
    assert.ok(!/a\nb/.test(result.text), 'no raw newline inside a path');
  });

  test('P19. the dirty-tree read never takes git\'s index lock (--no-optional-locks)', () => {
    const dir = makeGitFixture();
    const trace = path.join(mkTmp('ctoc-push-p19-'), 'trace2.txt');
    const previous = process.env.GIT_TRACE2;
    process.env.GIT_TRACE2 = trace;
    try {
      qualityAgent.uncommittedTrackedPaths(dir);
    } finally {
      if (previous === undefined) delete process.env.GIT_TRACE2; else process.env.GIT_TRACE2 = previous;
    }
    const recorded = fs.readFileSync(trace, 'utf8');
    assert.match(recorded, /start .*git --no-optional-locks status --porcelain -z --untracked-files=no/);
  });

  test('P20. when git cannot read the commit, its first error line is part of the refusal', async (t) => {
    const dir = mkTmp('ctoc-push-p20-');
    memoryHashes(t);
    const { deps } = realCheckDeps({ runWholeSuite: async () => ({ passed: true, text: 'Tests: passed — `x`: 1 passed.' }) });
    delete deps.readHead;
    delete deps.uncommittedPaths;
    const result = await withCwd(dir, () => push.run({ projectRoot: dir }, deps));
    assert.match(result.text, /the commit could not be read from git[^\n]* \(git said: [^\n]+\)/);
    assert.ok(result.text.includes('git said:'));
    const reason = qualityAgent.untestedCommitReason('abc1234', dir);
    assert.match(reason, /\(git said: [^\n]+\)$/);
  });
});
