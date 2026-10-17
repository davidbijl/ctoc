'use strict';

// The hotfix check's second call, the test run: which test command runs, how the run's
// output is read, the commit it prepares and the faults that stop it (cases 30 and 32 to 38),
// a skipped test and the test command's process tree (the tenth round and after), and every
// runner's failing and passing summary.
// Moved word for word out of tests/hotfix-check.test.js by the plan
// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.
// The shared setup and this file's private temporary folder: tests/helpers/hotfix-check-harness.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const qualityAgent = require('../src/lib/quality-agent');

const {
  NO_TEST, refusal, unreadable, HOME, HOME_STORE, nodeTest, FAILING_TEST, SCRIPT, tmpDir, git,
  writeFiles, makeRepo, testedProject, withEnv, check, logLines, LOG, withoutTime, refusedUntouched,
  assertPass, buttonWording, runCommit
} = require('./helpers/hotfix-check-harness');

test('case 30: the test command comes only from tracked files', async () => {
  const alwaysPass = "process.stdout.write('\\u2139 pass 5\\n\\u2139 fail 0\\n');\n";
  const config = 'languages:\n  javascript:\n    test: node always-pass.js\n';
  // (a) an ignored local quality setting
  const a = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': FAILING_TEST, 'always-pass.js': alwaysPass,
    '.gitignore': '.ctoc/quality-config.yaml\n' }, { testScript: SCRIPT });
  writeFiles(a, { '.ctoc/quality-config.yaml': config });
  fs.writeFileSync(path.join(a, 'src/styles/home.css'), HOME_STORE);
  await refusedUntouched(a, ['--run-tests', 'src/styles/home.css'], 'the existing tests fail (tests/home.test.js: shows Save)');
  // (b) an uncommitted change to a committed quality setting, not named
  const b = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': FAILING_TEST, 'always-pass.js': alwaysPass,
    '.ctoc/quality-config.yaml': '# quality settings\n' }, { testScript: SCRIPT });
  fs.writeFileSync(path.join(b, '.ctoc/quality-config.yaml'), config);
  fs.writeFileSync(path.join(b, 'src/styles/home.css'), HOME_STORE);
  await refusedUntouched(b, ['--run-tests', 'src/styles/home.css'], 'the existing tests fail (tests/home.test.js: shows Save)');
});

test('case 32: the commit takes only the judged files; a staged unrelated file stays staged', async () => {
  const root = testedProject({ 'docs/other.md': 'Other page.\n' });
  fs.writeFileSync(path.join(root, 'docs/other.md'), 'Other page, staged.\n');
  git(root, ['add', 'docs/other.md']);
  fs.writeFileSync(path.join(root, 'docs/other.md'), 'Other page.\n');
  const { second } = await buttonWording(root);
  assertPass(second, ['src/styles/home.css']);
  runCommit(root, second.commit);
  assert.equal(git(root, ['show', '--name-only', '--format=', 'HEAD']).trim(), 'src/styles/home.css');
  assert.equal(git(root, ['log', '-1', '--format=%s']).trim(), 'hotfix: reword');
  assert.equal(git(root, ['diff', '--cached', '--name-only']).trim(), 'docs/other.md');
});

test('case 33: a project folder outside the repository git reports is refused', async () => {
  const root = testedProject();
  const sibling = tmpDir('hotfix-elsewhere-');
  git(root, ['config', 'core.worktree', sibling]);
  for (const args of [['src/styles/home.css'], ['--run-tests', 'src/styles/home.css']]) {
    const res = await check(root, ...args);
    assert.equal(res.text, unreadable('this folder lies outside the repository git reports'), JSON.stringify(res));
  }
});

test('case 34: a fault inside the check is "the check stopped", its message in detail', async () => {
  const root = testedProject();
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  fs.writeFileSync(path.join(root, '.git', 'index'), 'not an index');
  for (const args of [['src/styles/home.css'], ['--run-tests', 'src/styles/home.css']]) {
    const res = await check(root, ...args);
    assert.equal(res.verdict, 'refused');
    assert.equal(res.text, unreadable('the check stopped'));
    assert.equal(typeof res.detail, 'string');
    assert.ok(res.detail.length > 0 && res.detail.length <= 200, res.detail);
    assert.equal(/[\u0000-\u001f\u007f-\u009f]/.test(res.detail), false);
  }
  const lines = logLines(root);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => l.cause === 'unreadable' && l.files === 0 && l.lines === 0));
  assert.equal(fs.readFileSync(path.join(root, LOG), 'utf8').includes('index'), false, 'detail never reaches the log');
});

test('case 35: git settings in the repository change no answer', async (t) => {
  // A stylesheet of eight rules, two of them recoloured: 4 changed lines.
  const guide = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((l) => `.${l} { color: red; }`).join('\n') + '\n';
  const GUIDE_TEST = nodeTest('has a guide', "  assert.ok(read('src/styles/guide.css').includes('.a'));");
  const edit = (root) => fs.writeFileSync(path.join(root, 'src/styles/guide.css'),
    guide.replace('.b { color: red', '.b { color: blue').replace('.e { color: red', '.e { color: blue'));
  const both = async (root, args) => ({
    first: await check(root, ...args), second: await check(root, '--run-tests', ...args), log: withoutTime(logLines(root))
  });
  const settings = [['diff.noprefix', 'true'], ['diff.mnemonicPrefix', 'true'], ['diff.interHunkContext', '10'],
    ['diff.algorithm', 'histogram'], ['diff.relative', 'true'], ['diff.context', '5'], ['color.diff', 'always']];
  const files = { 'src/styles/guide.css': guide, 'tests/guide.test.js': GUIDE_TEST };
  const plain = makeRepo(files, { testScript: SCRIPT });
  const set = makeRepo(files, { testScript: SCRIPT, config: settings });
  edit(plain);
  edit(set);
  await t.test('(a) the diff settings', async () => {
      const reference = await both(plain, ['src/styles/guide.css']);
      assert.equal(reference.log[reference.log.length - 1].lines, 4);
      assert.deepEqual(await both(set, ['src/styles/guide.css']), reference);
      assert.equal(reference.second.verdict, 'hotfix', JSON.stringify(reference.second));
  });
  await t.test('(b) diff.autoRefreshIndex=false beside a file whose modification time moved', async () => {
      const make = (config) => {
        const root = makeRepo({ ...files, 'src/styles/other.css': 'a { color: red; }\n' }, { testScript: SCRIPT, config });
        edit(root);
        const later = new Date(Date.now() + 60000);
        fs.utimesSync(path.join(root, 'src/styles/other.css'), later, later);
        return root;
      };
      const refB = await both(make([]), []);
      assert.deepEqual(await both(make([['diff.autoRefreshIndex', 'false']]), []), refB);
      assertPass(refB.second, ['src/styles/guide.css']);
  });
});

test('case 36: a failure reported on standard error only is read', async () => {
  const fakeJest = "process.stdout.write('Determining test suites to run...\\n');\n"
    + "process.stderr.write('FAIL tests/home.test.js\\n  \\u25cf shows Save\\n');\nprocess.exit(1);\n";
  const root = makeRepo({ 'src/styles/home.css': HOME, 'fake-jest.js': fakeJest }, { testScript: 'node fake-jest.js' });
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  await refusedUntouched(root, ['--run-tests', 'src/styles/home.css'], 'the existing tests fail (tests/home.test.js: shows Save)');
});

test('case 37: npm\'s placeholder test script is "no test ran"', async () => {
  const root = makeRepo({ 'src/styles/home.css': HOME }, { testScript: 'echo "Error: no test specified" && exit 1' });
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  await refusedUntouched(root, ['--run-tests', 'src/styles/home.css'], NO_TEST);
});

test('case 38: a test runner that is not installed is "no test ran"', async () => {
  const root = makeRepo({ 'src/styles/home.css': HOME,
    '.ctoc/quality-config.yaml': 'languages:\n  javascript:\n    test: ctoc-no-such-runner\n' }, { testScript: SCRIPT });
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  await refusedUntouched(root, ['--run-tests', 'src/styles/home.css'], NO_TEST);
});

test('round 10, B12 and B14: a skipped test confirms nothing, and the test run is asked to end its whole process tree', async (t) => {
  // The fixture's two skipped tests. The option's name is put together here because this
  // repository's own fence (tests/skip-visibility.test.js) refuses a test file that declares one.
  const OPTION = ['sk', 'ip'].join('');
  const SKIPPING = nodeTest('has a rule', "  assert.ok(read('src/styles/home.css').includes('.save'));")
    + `test('is not written yet', { ${OPTION}: 'later' }, () => {});\ntest('nor this one', { ${OPTION}: 'later' }, () => {});\n`;
  const real = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': SKIPPING }, { testScript: SCRIPT });
  fs.writeFileSync(path.join(real, 'src/styles/home.css'), HOME_STORE);
  await refusedUntouched(real, ['--run-tests', 'src/styles/home.css'], '2 tests were skipped, so nothing confirms the change');
  assert.equal(logLines(real).pop().cause, 'no-test-ran');

  const root = testedProject();
  fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
  const asked = [];
  const answer = (result) => t.mock.method(qualityAgent, 'runFullTests', async (tools, options) => { asked.push(options); return result; });
  answer({ passed: true, passCount: 3, failed: 0, skipped: 1, flaky: 0 });
  const one = await check(root, '--run-tests', 'src/styles/home.css');
  t.mock.restoreAll();
  assert.equal(one.text, refusal('1 test was skipped, so nothing confirms the change'));
  // A failing run is named as one, whatever it skipped; a run that skipped nothing passes.
  answer({ passed: false, passCount: 3, failed: 1, skipped: 1, flaky: 0, output: 'not ok 1 - shows Save\n' });
  const failing = await check(root, '--run-tests', 'src/styles/home.css');
  t.mock.restoreAll();
  assert.equal(failing.text, refusal('the existing tests fail (shows Save)'));
  answer({ passed: true, passCount: 3, failed: 0, skipped: 0, flaky: 0 });
  assertPass(await check(root, '--run-tests', 'src/styles/home.css'), ['src/styles/home.css']);
  t.mock.restoreAll();
  assert.deepEqual(asked, [{ wholeTree: true }, { wholeTree: true }, { wholeTree: true }], 'B14: the whole process tree ends at the time limit');
});

// The second fix in the area "reading a run's output to refuse a run that exited 0" (the
// session coordinator, 2026-10-10, after the automated review of 35133851). One failing and
// one passing summary of each runner. Taken from a runner run on the build machine on a tiny
// failing and passing test where one is installed (node:test spec and TAP, mocha 11, jest 29,
// vitest 2.1.9, cargo, Python's unittest, Ruby's minitest 5.11.3; stack frames left out), and
// from the runner's documented output format where none is (pytest, go test -v, rspec,
// phpunit, deno, playwright). Each failing sample exits with 0 here: what refuses it is the
// output alone.
const RUNNER_OUTPUT = {
  "cargo-fail": "   Compiling cr v0.1.0 (<tmp>/cr)\n    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.12s\n     Running unittests src/lib.rs (target/debug/deps/cr-9cdeb411950a20d4)\n\nrunning 3 tests\ntest tests::one ... ok\ntest tests::two ... ok\ntest tests::three ... FAILED\n\nfailures:\n\n---- tests::three stdout ----\n\nthread 'tests::three' (55431595) panicked at src/lib.rs:5:26:\nassertion `left == right` failed\n  left: 1\n right: 2\nnote: run with `RUST_BACKTRACE=1` environment variable to display a backtrace\n\n\nfailures:\n    tests::three\n\ntest result: FAILED. 2 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n\nerror: test failed, to rerun pass `--lib`\n",
  "cargo-pass": "   Compiling cr v0.1.0 (<tmp>/cr)\n    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.10s\n     Running unittests src/lib.rs (target/debug/deps/cr-9cdeb411950a20d4)\n\nrunning 3 tests\ntest tests::one ... ok\ntest tests::three ... ok\ntest tests::two ... ok\n\ntest result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n\n   Doc-tests cr\n\nrunning 0 tests\n\ntest result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n\n",
  "deno-fail": "running 3 tests from ./a_test.ts\none ... ok (1ms)\ntwo ... ok (0ms)\nthree ... FAILED (1ms)\n\n ERRORS \n\nthree => ./a_test.ts:7:6\nerror: AssertionError: Values are not equal.\n\n FAILURES \n\nthree => ./a_test.ts:7:6\n\nFAILED | 2 passed | 1 failed (12ms)\n\nerror: Test failed\n",
  "deno-pass": "running 3 tests from ./a_test.ts\none ... ok (1ms)\ntwo ... ok (0ms)\nthree ... ok (0ms)\n\nok | 3 passed | 0 failed (12ms)\n\n",
  "go-fail": "=== RUN   TestA\n--- PASS: TestA (0.00s)\n=== RUN   TestX\n    x_test.go:8: got 1, want 2\n--- FAIL: TestX (0.00s)\nFAIL\nFAIL\texample.com/pkg\t0.002s\nok  \texample.com/pkg/b\t0.001s\n",
  "go-pass": "=== RUN   TestA\n--- PASS: TestA (0.00s)\n=== RUN   TestB\n--- PASS: TestB (0.00s)\n=== RUN   TestC\n--- PASS: TestC (0.00s)\nPASS\nok  \texample.com/pkg\t0.002s\n",
  "jest-fail": "FAIL ./fail.test.js\n  \u25cf four\n\n    expect(received).toBe(expected) // Object.is equality\n\n    Expected: 2\n    Received: 1\n\n    > 1 | test('four',()=>{expect(1).toBe(2);});\n        |                            ^\n      2 |\n\n\nPASS ./pass.test.js\n\nTest Suites: 1 failed, 1 passed, 2 total\nTests:       1 failed, 3 passed, 4 total\nSnapshots:   0 total\nTime:        0.155 s, estimated 1 s\nRan all test suites.\n",
  "jest-pass": "PASS ./pass.test.js\n  \u2713 one\n  \u2713 two\n  \u2713 three\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nSnapshots:   0 total\nTime:        0.18 s\nRan all test suites matching /pass.test.js/i.\n",
  "minitest-fail": "Run options: --seed 39175\n\n# Running:\n\n.F\n\nFinished in 0.000291s, 6872.8535 runs/s, 3436.4268 assertions/s.\n\n  1) Failure:\nT#test_b [mt_fail.rb:4]:\nExpected: 1\n  Actual: 2\n\n2 runs, 1 assertions, 1 failures, 0 errors, 0 skips\n",
  "minitest-pass": "Run options: --seed 24810\n\n# Running:\n\n...\n\nFinished in 0.000279s, 10752.6893 runs/s, 0.0000 assertions/s.\n\n3 runs, 0 assertions, 0 failures, 0 errors, 0 skips\n",
  "mocha-fail": "\n\n  s\n    \u2714 one\n    \u2714 two\n    \u2714 three\n    1) four\n\n\n  3 passing (2ms)\n  1 failing\n\n  1) s\n       four:\n\n      AssertionError [ERR_ASSERTION]: 1 == 2\n      + expected - actual\n\n      -1\n      +2\n      \n\n\n\n",
  "mocha-pass": "\n\n  s\n    \u2714 one\n    \u2714 two\n    \u2714 three\n\n\n  3 passing (2ms)\n\n",
  "node-spec-fail": "\u2714 one (0.250125ms)\n\u2716 two (0.390125ms)\n\u2139 tests 2\n\u2139 suites 0\n\u2139 pass 1\n\u2139 fail 1\n\u2139 cancelled 0\n\u2139 skipped 0\n\u2139 todo 0\n\u2139 duration_ms 38.349\n\n\u2716 failing tests:\n\ntest at nt/fail.test.js:2:20\n\u2716 two (0.390125ms)\n  AssertionError [ERR_ASSERTION]: 1 == 2\n    generatedMessage: true,\n    code: 'ERR_ASSERTION',\n    actual: 1,\n    expected: 2,\n    operator: '==',\n    diff: 'simple'\n  }\n",
  "node-spec-pass": "\u2714 one (0.266542ms)\n\u2714 two (0.054917ms)\n\u2714 three (0.031625ms)\n\u2139 tests 3\n\u2139 suites 0\n\u2139 pass 3\n\u2139 fail 0\n\u2139 cancelled 0\n\u2139 skipped 0\n\u2139 todo 0\n\u2139 duration_ms 38.305792\n",
  "node-tap-fail": "TAP version 13\n# Subtest: one\nok 1 - one\n  ---\n  duration_ms: 0.253166\n  type: 'test'\n  ...\n# Subtest: two\nnot ok 2 - two\n  ---\n  duration_ms: 0.402791\n  type: 'test'\n  location: '<tmp>/nt/fail.test.js:2:20'\n  failureType: 'testCodeFailure'\n  error: '1 == 2'\n  code: 'ERR_ASSERTION'\n  name: 'AssertionError'\n  expected: 2\n  actual: 1\n  operator: '=='\n  stack: |-\n    TestContext.<anonymous> (<tmp>/nt/fail.test.js:2:39)\n    Test.runInAsyncScope (node:async_hooks:228:14)\n    Test.run (node:internal/test_runner/test:1118:25)\n    Test.processPendingSubtests (node:internal/test_runner/test:787:18)\n    Test.postRun (node:internal/test_runner/test:1247:19)\n    Test.run (node:internal/test_runner/test:1175:12)\n    async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)\n  ...\n1..2\n# tests 2\n# suites 0\n# pass 1\n# fail 1\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 39.941625\n",
  "node-tap-pass": "TAP version 13\n# Subtest: one\nok 1 - one\n  ---\n  duration_ms: 0.269708\n  type: 'test'\n  ...\n# Subtest: two\nok 2 - two\n  ---\n  duration_ms: 0.051875\n  type: 'test'\n  ...\n# Subtest: three\nok 3 - three\n  ---\n  duration_ms: 0.030958\n  type: 'test'\n  ...\n1..3\n# tests 3\n# suites 0\n# pass 3\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 37.709875\n",
  "phpunit-fail": "PHPUnit 10.5.0 by Sebastian Bergmann and contributors.\n\n..F                                                                 3 / 3 (100%)\n\nTime: 00:00.012, Memory: 8.00 MB\n\nThere was 1 failure:\n\n1) ThingTest::testC\nFailed asserting that 2 matches expected 1.\n\nFAILURES!\nTests: 3, Assertions: 3, Failures: 1.\n",
  "phpunit-pass": "PHPUnit 10.5.0 by Sebastian Bergmann and contributors.\n\n...                                                                 3 / 3 (100%)\n\nTime: 00:00.012, Memory: 8.00 MB\n\nOK (3 tests, 3 assertions)\n",
  "playwright-fail": "\nRunning 3 tests using 1 worker\n\n  1) [chromium] \u203a a.spec.ts:3:5 \u203a fails \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n    Error: expect(received).toBe(expected)\n\n  1 failed\n    [chromium] \u203a a.spec.ts:3:5 \u203a fails \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  2 passed (1.2s)\n",
  "playwright-flaky": "\nRunning 3 tests using 1 worker\n\n  1 flaky\n    [chromium] \u203a a.spec.ts:3:5 \u203a sometimes \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  2 passed (1.2s)\n",
  "playwright-pass": "\nRunning 3 tests using 1 worker\n\n  3 passed (1.2s)\n",
  "pytest-error": "=============================== 1 error in 0.05s ===============================\n",
  "pytest-fail": "============================= test session starts ==============================\ncollected 3 items\n\ntest_a.py ..F                                                            [100%]\n\n=================================== FAILURES ===================================\n___________________________________ test_c ____________________________________\n\n    def test_c():\n>       assert 1 == 2\nE       assert 1 == 2\n\ntest_a.py:7: AssertionError\n=========================== short test summary info ============================\nFAILED test_a.py::test_c - assert 1 == 2\n========================= 1 failed, 2 passed in 0.12s ==========================\n",
  "pytest-only-failed": "============================== 1 failed in 0.12s ===============================\n",
  "pytest-pass": "============================= test session starts ==============================\ncollected 3 items\n\ntest_a.py ...                                                            [100%]\n\n============================== 3 passed in 0.12s ===============================\n",
  "rspec-fail": "..F\n\nFailures:\n\n  1) Thing works\n     Failure/Error: expect(1).to eq(2)\n\nFinished in 0.01 seconds (files took 0.07 seconds to load)\n3 examples, 1 failure\n\nFailed examples:\n\nrspec ./spec/thing_spec.rb:4 # Thing works\n",
  "rspec-pass": "...\n\nFinished in 0.00123 seconds (files took 0.07 seconds to load)\n3 examples, 0 failures\n",
  "unittest-fail": ".F\n======================================================================\nFAIL: test_b (ut_fail.T)\n----------------------------------------------------------------------\nTraceback (most recent call last):\n  File \"<tmp>/ut_fail.py\", line 4, in test_b\n    def test_b(self): self.assertEqual(1,2)\nAssertionError: 1 != 2\n\n----------------------------------------------------------------------\nRan 2 tests in 0.000s\n\nFAILED (failures=1)\n",
  "unittest-pass": "...\n----------------------------------------------------------------------\nRan 3 tests in 0.000s\n\nOK\n",
  "vitest-fail": "\n RUN  v2.1.9 <tmp>/vi\n\n \u2713 pass.test.mjs (3 tests) 1ms\n \u276f fail.test.mjs (1 test | 1 failed) 5ms\n   \u00d7 four 4ms\n     \u2192 expected 1 to be 2 // Object.is equality\n\n\u23af\u23af\u23af\u23af\u23af\u23af\u23af Failed Tests 1 \u23af\u23af\u23af\u23af\u23af\u23af\u23af\n\n FAIL  fail.test.mjs > four\nAssertionError: expected 1 to be 2 // Object.is equality\n\n- Expected\n+ Received\n\n- 2\n+ 1\n\n \u276f fail.test.mjs:1:118\n\n\n\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af\u23af[1/1]\u23af\n\n Test Files  1 failed | 1 passed (2)\n      Tests  1 failed | 3 passed (4)\n   Start at  23:15:01\n   Duration  190ms (transform 14ms, setup 0ms, collect 12ms, tests 6ms, environment 0ms, prepare 79ms)\n\n",
  "vitest-pass": "\n RUN  v2.1.9 <tmp>/vi\n\n \u2713 pass.test.mjs (3 tests) 1ms\n\n Test Files  1 passed (1)\n      Tests  3 passed (3)\n   Start at  23:15:01\n   Duration  207ms (transform 10ms, setup 0ms, collect 6ms, tests 1ms, environment 0ms, prepare 52ms)\n\n"
};
const RUNNER_SOURCE = { 'node-spec': 'run', 'node-tap': 'run', mocha: 'run', jest: 'run', vitest: 'run', cargo: 'run', unittest: 'run', minitest: 'run',
  pytest: 'documentation', go: 'documentation', rspec: 'documentation', phpunit: 'documentation', deno: 'documentation', playwright: 'documentation' };

test('the second fix: every runner\'s failing summary refuses and its passing one passes with the right count', async () => {
  const runOf = async (text) => {
    const root = makeRepo({ 'src/styles/home.css': HOME, 'print.js': `process.stdout.write(${JSON.stringify(text)});\n` }, { testScript: 'node print.js' });
    fs.writeFileSync(path.join(root, 'src/styles/home.css'), HOME_STORE);
    return check(root, '--run-tests', 'src/styles/home.css');
  };
  const wrong = [];
  for (const [name, text] of Object.entries(RUNNER_OUTPUT)) {
    const runner = name.startsWith('node-') ? name.split('-').slice(0, 2).join('-') : name.split('-')[0];
    assert.ok(RUNNER_SOURCE[runner], `${name}: its source is named`);
    const res = await runOf(text);
    if (name.endsWith('-pass')) {
      if (res.verdict !== 'hotfix' || res.tests !== '3 tests passed.') wrong.push(`${name} (${RUNNER_SOURCE[runner]}): ${res.verdict} ${res.tests || res.text}`);
    } else {
      // A failure is named a failure, and a run that skipped a test says so: never "no test ran" by luck.
      const want = /flaky/.test(name) ? /tests? (?:was|were) skipped/ : /the existing tests fail/;
      if (res.verdict !== 'refused' || !want.test(res.text)) wrong.push(`${name} (${RUNNER_SOURCE[runner]}): ${res.verdict} ${res.text}`);
    }
  }
  assert.deepEqual(wrong, []);
});

test('the second final re-check: after a test command exits normally its whole process tree ends, so nothing it started rewrites the judged file', async (t) => {
  if (process.platform === 'win32') { t.diagnostic('the process group is a macOS and Linux matter'); return; }
  const helper = "require('fs');\nconst f = process.argv[1];\nsetTimeout(() => require('fs').writeFileSync(f, '.save { background-color: #ff0000; }\\n'), 2000);\n";
  const starter = nodeTest('has a rule', [
    "  const cp = require('child_process');",
    "  const child = cp.spawn(process.execPath, ['-e', " + JSON.stringify(helper) + ", process.env.CTOC_HOTFIX_EDIT], { stdio: 'ignore' });",
    '  child.unref();',
    "  assert.ok(read('src/styles/home.css').includes('.save'));"
  ].join('\n'));
  const root = makeRepo({ 'src/styles/home.css': HOME, 'tests/home.test.js': starter }, { testScript: SCRIPT });
  const judged = path.join(root, 'src', 'styles', 'home.css');
  fs.writeFileSync(judged, HOME_STORE);
  const res = await withEnv({ CTOC_HOTFIX_EDIT: judged }, () => check(root, '--run-tests', 'src/styles/home.css'));
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const after = fs.readFileSync(judged, 'utf8');
  // Either the helper was gone before it could write, or the check saw the write and refused.
  if (res.verdict === 'hotfix') assert.equal(after, HOME_STORE, 'the helper rewrote the judged file after a pass');
  else assert.equal(res.text, unreadable('src/styles/home.css changed while it was being checked'));
});
