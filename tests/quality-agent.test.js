/**
 * X4 — quality-agent.js must be able to READ its test runner.
 *
 * The module counts test results and its verdict GATES THE PUSH: src/commands/push.js
 * `run()` calls runWholeSuiteBeforePush (the shared whole-suite check) and does
 * `if (!tests.passed) blockedBy.push('tests')`, and a non-empty blockedBy returns
 * `{ ok:false, pushed:false }` without ever calling pushToRemote. Confirmed by READING
 * push.js, not by trusting quality-agent's comment.
 *
 * ZERO DOUBLES. Every case below runs a REAL subprocess that writes the literal bytes a
 * real runner emits and exits with a real code — including case 6, a genuine exit-0 liar
 * (a runner that reports failures on stdout and exits 0 anyway). A bare failing run would
 * be caught by its non-zero exit before the parser was ever consulted, which is exactly how
 * a sibling plan's end-to-end test managed to look green while proving nothing.
 *
 * Colorized fixtures are built with String.fromCharCode(27) — never a raw control byte,
 * which is invisible in review and mangles diffs.
 */

const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const qualityAgent = require('../src/lib/quality-agent');
const { runFullTests, runSpecificTests } = qualityAgent;
const pushCommand = require('../src/commands/push');
const qualityState = require('../src/lib/quality-state');

const ESC = String.fromCharCode(27);

// --- real runner fixtures: the literal bytes each runner emits -----------------

const NODE_TEST_SPEC = [
  'ℹ tests 8',
  'ℹ suites 0',
  'ℹ pass 8',
  'ℹ fail 0',
  'ℹ cancelled 0',
  'ℹ skipped 0',
  'ℹ todo 0',
  'ℹ duration_ms 12.345'
].join('\n');

const NODE_TEST_TAP = [
  '# tests 8',
  '# suites 0',
  '# pass 8',
  '# fail 0',
  '# cancelled 0',
  '# skipped 0',
  '# todo 0',
  '# duration_ms 12.345'
].join('\n');

// Node colorizes its reporter EVEN WHEN PIPED whenever FORCE_COLOR is set.
const NODE_TEST_COLOR = [
  `${ESC}[32mℹ tests 8${ESC}[39m`,
  `${ESC}[32mℹ pass 8${ESC}[39m`,
  `${ESC}[31mℹ fail 0${ESC}[39m`,
  `${ESC}[34mℹ skipped 0${ESC}[39m`
].join('\n');

const JEST_OUTPUT = [
  'PASS  src/widget.test.js',
  'Test Suites: 1 passed, 1 total',
  'Tests:       8 passed, 8 total',
  'Time:        1.2 s'
].join('\n');

const MOCHA_OUTPUT = [
  '  widget',
  '    ✓ adds',
  '',
  '  8 passing (12ms)'
].join('\n');

const NODE_TEST_SKIPPED = [
  'ℹ tests 11',
  'ℹ pass 8',
  'ℹ fail 0',
  'ℹ skipped 3',
  'ℹ todo 0'
].join('\n');

// The liar: real failures on stdout, exit code 0 (a wrapping `|| true`, a `set +e`,
// or a reporter that swallows the child's status).
const NODE_TEST_LIAR = [
  'ℹ tests 8',
  'ℹ pass 5',
  'ℹ fail 3',
  'ℹ skipped 0'
].join('\n');

// A project whose runner is NOT node:test: a plain assertion script. Output, no
// counters, exit 0 — its EXIT CODE is its instrument and it reported success.
// This is what tests/greenfield-journey.test.js seeds.
const PLAIN_ASSERTION_SCRIPT = 'ok: add(2,3) === 5\nok: sub(3,2) === 1';

// The instrument is PRESENT (a node:test summary block) but its fail counter is
// ILLEGIBLE (renamed key). Not "no counter" — an unreadable dial.
const UNREADABLE_INSTRUMENT = [
  'ℹ tests 8',
  'ℹ pass 6',
  'ℹ failures 2'
].join('\n');

// --- helper: a REAL runner subprocess emitting exactly those bytes -------------

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-x4-'));
let fixtureSeq = 0;

/**
 * Build a tools map whose test command is a REAL node subprocess that writes
 * `output` to stdout and exits with `exitCode`. No mock, no stub: the module runs it.
 */
function runnerEmitting(output, exitCode = 0) {
  const file = path.join(tmpRoot, `runner-${fixtureSeq++}.js`);
  fs.writeFileSync(
    file,
    `process.stdout.write(${JSON.stringify(output)});\nprocess.exit(${exitCode});\n`
  );
  return { javascript: { test: `node ${JSON.stringify(file)}`, testFramework: 'node' } };
}

/** A runner file with the given source; returns the language tools that run it. */
function runnerFromSource(source, extra = {}) {
  const file = path.join(tmpRoot, `runner-${fixtureSeq++}.js`);
  fs.writeFileSync(file, source);
  return { file, tools: { test: `node ${JSON.stringify(file)}`, testFramework: 'node', ...extra } };
}

/** Run `fn(dir)` with process.cwd() set to a fresh directory under tmpRoot, restored after. */
async function inFreshDir(fn) {
  const dir = fs.mkdtempSync(path.join(tmpRoot, 'cwd-'));
  const previous = process.cwd();
  process.chdir(dir);
  try {
    return await fn(dir);
  } finally {
    process.chdir(previous);
  }
}

/** Collect every line the global console prints for the rest of the test. */
function captureConsole(t) {
  const lines = [];
  t.mock.method(console, 'log', (...args) => { lines.push(args.join(' ')); });
  return lines;
}

test.after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// --- Case 1 -------------------------------------------------------------------

test('X4 case 1 — reads a node:test spec pass count (ℹ pass 8)', async () => {
  const result = await runFullTests(runnerEmitting(NODE_TEST_SPEC, 0));
  assert.strictEqual(result.passed, true, 'a clean node:test run must pass');
  assert.strictEqual(result.passCount, 8, 'the spec reporter pass count must be READ, not lost');
});

// --- Case 2 -------------------------------------------------------------------

test('X4 case 2 — reads a node:test TAP pass count (# pass 8)', async () => {
  const result = await runFullTests(runnerEmitting(NODE_TEST_TAP, 0));
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.passCount, 8, 'the TAP reporter pass count must be READ');
});

// --- Case 3 — the regression guard for Decision 2 ------------------------------

test('X4 case 3 — still reads jest (8 passed) and mocha (8 passing)', async () => {
  const jest = await runFullTests(runnerEmitting(JEST_OUTPUT, 0));
  assert.strictEqual(jest.passed, true, 'a clean jest run must pass');
  assert.strictEqual(jest.passCount, 8, 'jest vocabulary must NOT be removed to fix node:test');

  const mocha = await runFullTests(runnerEmitting(MOCHA_OUTPUT, 0));
  assert.strictEqual(mocha.passed, true, 'a clean mocha run must pass');
  assert.strictEqual(mocha.passCount, 8, 'mocha vocabulary must NOT be removed to fix node:test');
});

// --- Case 4 -------------------------------------------------------------------

test('X4 case 4 — reads a colorized node:test count', async () => {
  const result = await runFullTests(runnerEmitting(NODE_TEST_COLOR, 0));
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.passCount, 8, 'colour must be stripped before parsing');
});

// --- Case 5 -------------------------------------------------------------------

test('X4 case 5 — reports the REAL skipped count, not a hardcoded zero', async () => {
  const result = await runFullTests(runnerEmitting(NODE_TEST_SKIPPED, 0));
  assert.strictEqual(result.passCount, 8);
  assert.strictEqual(
    result.skipped,
    3,
    'skipped must be READ from the output — a hardcoded 0 asserts compliance with the ' +
    '"0 skipped" contract instead of enforcing it'
  );
});

// --- Case 6 — the exit-0 liar -------------------------------------------------

test('X4 case 6 — exit 0 with fail > 0 on stdout does NOT pass', async () => {
  // A REAL liar: the child prints 3 failures and exits 0. If the module trusted the
  // exit code alone this run reads as clean and the push proceeds over a broken tree.
  const result = await runFullTests(runnerEmitting(NODE_TEST_LIAR, 0));
  assert.strictEqual(
    result.passed,
    false,
    'a run reporting fail 3 on stdout must NOT pass merely because it exited 0'
  );
});

// --- Case 7 — the false-red guard (Decision 1) --------------------------------

test('X4 case 7 — a non-node:test runner with output and no counters is NOT refused', async () => {
  const result = await runFullTests(runnerEmitting(PLAIN_ASSERTION_SCRIPT, 0));
  assert.strictEqual(
    result.passed,
    true,
    'a plain assertion script has no illegible dial — its exit code IS its instrument. ' +
    'Refusing it is a FALSE RED, worse than the false green: a guard that cries wolf gets disabled'
  );
  assert.notStrictEqual(result.undetermined, true, 'no counter present is not an unreadable instrument');
});

// --- Case 8 -------------------------------------------------------------------

test('X4 case 8 — an unreadable-but-present instrument yields undetermined, and push blocks on it', async (t) => {
  const result = await runFullTests(runnerEmitting(UNREADABLE_INSTRUMENT, 0));
  assert.strictEqual(result.passed, false, 'an unreadable instrument is never a pass');
  assert.strictEqual(result.undetermined, true, 'reuse the existing undetermined state');

  // And prove the consumer actually blocks on that verdict — push.js's real DI seam with
  // the REAL whole-suite check (not injected) over the same real runner. Its own cwd and an
  // in-memory hash cache, so nothing here reads or writes this repository's quality state.
  const hashes = {};
  t.mock.method(qualityState, 'getFileHashes', () => hashes);
  t.mock.method(qualityState, 'updateFileHashes', (h) => Object.assign(hashes, h));
  const pushResult = await inFreshDir(() => pushCommand.run({}, {
    detect: () => ({ languages: ['javascript'], tools: runnerEmitting(UNREADABLE_INSTRUMENT, 0) }),
    runLint: async () => ({ passed: true }),
    runTypecheck: async () => ({ passed: true }),
    runSecurityScan: async () => ({ passed: true, skipped: [] }),
    readHead: () => 'h1',
    uncommittedPaths: () => [],
    pushToRemote: () => {
      throw new Error('push must NEVER be reached on an undetermined test verdict');
    },
    logger: { log: () => {} }
  }));

  assert.strictEqual(pushResult.pushed, false, 'push must not happen on an undetermined verdict');
  assert.strictEqual(pushResult.ok, false);
  assert.deepStrictEqual(pushResult.blockedBy, ['tests']);
  assert.match(pushResult.text, /not verified/);
});

// --- parity: runSpecificTests shares the same parser --------------------------

test('X4 — runSpecificTests reads node:test too (same parser, same contract)', async () => {
  const tools = runnerEmitting(NODE_TEST_SPEC, 0);
  // testFramework 'node' is not jest/vitest/pytest/go, so this takes the documented
  // full-suite fallback — the same runCommand path, exercised through the other export.
  const result = runSpecificTests(tools, ['tests/widget.test.js']);
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.passCount, 8);

  const liar = runSpecificTests(runnerEmitting(NODE_TEST_LIAR, 0), ['tests/widget.test.js']);
  assert.strictEqual(liar.passed, false, 'the exit-0 liar must not pass here either');
});

// =============================================================================
// The shared whole-suite check before a push — runWholeSuiteBeforePush.
// Each case runs with process.cwd() set to its own directory (the recursion guard
// compares the project root), over a REAL runner subprocess.
// =============================================================================

const UNKNOWN_COUNT = 'test count unknown (no node:test, jest or mocha pass count in its output)';
const ZERO_NODE = 'ℹ tests 0\nℹ pass 0\nℹ fail 0';
const ZERO_JEST = 'Tests:       0 passed, 0 total';
const ZERO_MOCHA = '  0 passing (2ms)';
const UNANCHORED_ZERO = 'ok: 0 passed to the parser';
const PYTEST_STYLE = '=== 3 passed in 0.12s ===';
const PASS_3 = 'ℹ tests 3\nℹ pass 3\nℹ fail 0';

test('Q1 — a node:test count of 8 passes, states the command and the count, carries no output, names the 15-minute limit', async (t) => {
  const tools = runnerEmitting(NODE_TEST_SPEC, 0);
  const lines = captureConsole(t);
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(tools));
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.passCount, 8);
  assert.strictEqual(result.countKnown, true);
  assert.ok(result.text.includes(tools.javascript.test), 'the text names the command');
  assert.match(result.text, /8 passed/);
  assert.strictEqual(Object.hasOwn(result, 'output'), false, 'a passing result carries no output');
  assert.ok(lines.some((l) => l.includes('(time limit: 15 minutes per test command)')), 'the first line names the default limit');
});

test('Q2 — a plain assertion script passes with the count-unknown wording and never says 0 passed', async () => {
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(runnerEmitting(PLAIN_ASSERTION_SCRIPT, 0)));
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.countKnown, false);
  assert.ok(result.text.includes(UNKNOWN_COUNT), result.text);
  assert.doesNotMatch(result.text, /0 passed/);
});

test('Q3 — a readable zero in the node:test, jest and mocha forms blocks as "zero tests ran"', async () => {
  for (const out of [ZERO_NODE, ZERO_JEST, ZERO_MOCHA]) {
    const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(runnerEmitting(out, 0)));
    assert.strictEqual(result.passed, false, `zero must block: ${out}`);
    assert.match(result.text, /zero tests ran/);
  }
});

test('Q4 — a run whose only tests were skipped is zero tests ran and names the skipped count', async () => {
  const out = 'ℹ tests 2\nℹ pass 0\nℹ fail 0\nℹ skipped 2';
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(runnerEmitting(out, 0)));
  assert.strictEqual(result.passed, false);
  assert.match(result.text, /zero tests ran/);
  assert.match(result.text, /2 skipped/);
});

test('Q5 — a zero only the unanchored fallback can read is count unknown, a pass', async () => {
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(runnerEmitting(UNANCHORED_ZERO, 0)));
  assert.strictEqual(result.passed, true);
  assert.ok(result.text.includes(UNKNOWN_COUNT), result.text);
});

test('Q5b — a count only the unanchored fallback reads (pytest style) is never reported as a number', async () => {
  const tools = runnerEmitting(PYTEST_STYLE, 0);
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(tools));
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.countKnown, false);
  assert.strictEqual(result.passCount, 0);
  assert.match(result.text, /test count unknown/);
  assert.doesNotMatch(result.text, /3 passed/);
  const full = await runFullTests(tools);
  assert.strictEqual(full.passCount, 3, 'runFullTests still answers as before');
  assert.strictEqual(full.passCountRead, false);
});

test('Q6 — no test command blocks, naming the human\'s choice to push without tests', async () => {
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush({ javascript: { lint: 'x', test: null } }));
  assert.strictEqual(result.passed, false);
  assert.strictEqual(
    result.text,
    'Tests: no test command was found, so nothing was tested. Pushing without tests is the human\'s choice: /ctoc:push --skip-tests.'
  );
});

test('Q7 — a detector-undetermined test command is not verified', async () => {
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush({ javascript: { test: null, testUndetermined: true } }));
  assert.strictEqual(result.passed, false);
  assert.strictEqual(result.undetermined, true);
  assert.match(result.text, /not verified/);
});

test('Q8 — a block on a later command keeps the earlier command\'s count in front of it', async () => {
  const first = runnerEmitting(PASS_3, 0).javascript;
  const second = runnerEmitting(ZERO_NODE, 0).javascript;
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush({ javascript: first, python: second }));
  assert.strictEqual(result.passed, false);
  assert.ok(result.text.includes(`\`${first.test}\`: 3 passed`), result.text);
  assert.ok(result.text.includes(second.test), 'names the blocking command');
  assert.match(result.text, /zero tests ran/);
  assert.ok(result.text.indexOf('3 passed') < result.text.indexOf('zero tests ran'), 'the earlier count comes first');
});

test('Q9 — two commands, one with a count and one without: passes, count unknown overall', async () => {
  const first = runnerEmitting(PASS_3, 0).javascript;
  const second = runnerEmitting(PLAIN_ASSERTION_SCRIPT, 0).javascript;
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush({ javascript: first, python: second }));
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.passCount, 3);
  assert.strictEqual(result.countKnown, false);
  assert.ok(result.text.includes('3 passed') && result.text.includes(UNKNOWN_COUNT), result.text);
});

test('Q10 — a failing run states the failing count and keeps its output', async () => {
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(runnerEmitting('ℹ tests 5\nℹ pass 3\nℹ fail 2', 1)));
  assert.strictEqual(result.passed, false);
  assert.match(result.text, /2 failing tests/);
  assert.ok(typeof result.output === 'string' && result.output.length > 0, 'a non-pass keeps the output');
});

test('Q11 — a failure with no readable count says the command exited with a failure', async () => {
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(runnerEmitting('boom', 1)));
  assert.strictEqual(result.passed, false);
  assert.match(result.text, /exited with a failure/);
});

test('Q12 — the exit-0 liar is blocked with its failing count', async () => {
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(runnerEmitting(NODE_TEST_LIAR, 0)));
  assert.strictEqual(result.passed, false);
  assert.match(result.text, /3 failing tests/);
});

test('Q13 — a flaky run is a zero-tolerance block', async () => {
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(runnerEmitting('retry', 1)));
  assert.strictEqual(result.passed, false);
  assert.match(result.text, /flaky/);
});

test('Q14 — a configured command with shell structure is refused, not run', async () => {
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush({ javascript: { test: 'echo a && echo b' } }));
  assert.strictEqual(result.passed, false);
  assert.strictEqual(result.refused, true);
  assert.match(result.text, /not run/);
});

test('Q15 — a run past the time limit is undetermined and the text names the limit', async () => {
  const { tools } = runnerFromSource('setTimeout(() => {}, 5000);\n');
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush({ javascript: tools }, { timeout: 300 }));
  assert.strictEqual(result.passed, false);
  assert.strictEqual(result.undetermined, true);
  assert.ok(result.text.startsWith(`Tests: not verified (\`${tools.test}\`) — `), result.text);
  assert.match(result.text, /timed out/);
  assert.match(result.text, /The time limit is 300 ms per test command/);
});

test('Q16 — an unreadable-but-present instrument is not verified, naming the command', async () => {
  const tools = runnerEmitting(UNREADABLE_INSTRUMENT, 0);
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(tools));
  assert.strictEqual(result.passed, false);
  assert.ok(result.text.startsWith(`Tests: not verified (\`${tools.javascript.test}\`) — `), result.text);
});

test('Q17 — a clean run states command and count and never the word skipped', async () => {
  const tools = runnerEmitting(NODE_TEST_SPEC, 0);
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(tools));
  assert.strictEqual(result.text, `Tests: passed — \`${tools.javascript.test}\`: 8 passed.`);
  assert.doesNotMatch(result.text, /skip/i);
});

test('Q18 — skipped tests are shown and do not block', async () => {
  const tools = runnerEmitting(NODE_TEST_SKIPPED, 0);
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(tools));
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.skipped, 3);
  assert.strictEqual(result.text, `Tests: passed — \`${tools.javascript.test}\`: 8 passed, 3 skipped.`);
});

test('Q19 — a whole-suite run started from inside a whole-suite run for the same project is refused', async () => {
  await inFreshDir(async (dir) => {
    const file = path.join(tmpRoot, `runner-${fixtureSeq++}.js`);
    const tools = { javascript: { test: `node ${JSON.stringify(file)}`, testFramework: 'node' } };
    fs.writeFileSync(file, [
      "const fs = require('fs');",
      "const path = require('path');",
      "const depthFile = path.join(process.cwd(), 'depth');",
      "const n = fs.existsSync(depthFile) ? Number(fs.readFileSync(depthFile, 'utf8')) : 0;",
      "fs.writeFileSync(depthFile, String(n + 1));",
      "if (n >= 2) { console.log('depth exceeded'); process.exit(1); }",
      `require(${JSON.stringify(path.resolve(__dirname, '..', 'src', 'lib', 'quality-agent.js'))}).runWholeSuiteBeforePush(${JSON.stringify(tools)}).then((r) => {`,
      "  fs.appendFileSync(path.join(process.cwd(), 'inner.txt'), r.text + '\\n');",
      "  console.log('ℹ tests 1\\nℹ pass 1\\nℹ fail 0');",
      '});',
      ''
    ].join('\n'));
    const result = await qualityAgent.runWholeSuiteBeforePush(tools);
    assert.strictEqual(result.passed, true, result.text);
    assert.match(result.text, /1 passed/);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'depth'), 'utf8'), '1', 'the inner call started nothing');
    assert.match(fs.readFileSync(path.join(dir, 'inner.txt'), 'utf8'), /Tests: not run — a whole-suite run is already in progress for this project\./);
  });
});

test('Q20 — a test command set in the quality configuration is named as such', async () => {
  const base = runnerEmitting(PASS_3, 0).javascript;
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush({ javascript: { ...base, testFromOverride: true } }));
  assert.strictEqual(result.passed, true);
  assert.ok(result.text.includes("(test command set in .ctoc/quality-config.yaml, not by the project's own files)"), result.text);
});

test('Q21 — a detected language with no test command is named "not tested" in a passing text', async () => {
  const base = runnerEmitting(PASS_3, 0).javascript;
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush({ javascript: base, python: { lint: 'x', test: null } }));
  assert.strictEqual(result.passed, true);
  assert.ok(result.text.includes('not tested: python (no test command)'), result.text);
});

test('Q22 — a test title that says "5 skipped" is not a skipped count: only a runner summary line is', async () => {
  const out = '✔ handles 5 skipped items (0.5ms)\nℹ tests 8\nℹ pass 8\nℹ fail 0\nℹ skipped 0\nℹ todo 0';
  const tools = runnerEmitting(out, 0);
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(tools));
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.skipped, 0);
  assert.strictEqual(result.text, `Tests: passed — \`${tools.javascript.test}\`: 8 passed.`);
});

// The jest shapes below are BELIEVED, NOT OBSERVED: jest is not installed here. Jest's summary
// is believed to list only the categories above zero, and to print on standard error.
const JEST_ALL_SKIPPED = 'Test Suites: 1 skipped, 0 of 1 total\nTests:       3 skipped, 3 total\nSnapshots:   0 total\n';
const JEST_ALL_TODO = 'Test Suites: 1 skipped, 0 of 1 total\nTests:       2 todo, 2 total\nSnapshots:   0 total\n';

test('Q23 — an all-skipped or todo-only jest run (exit 0, summary on standard error) blocks as zero tests', async () => {
  const skippedRunner = runnerFromSource(`process.stderr.write(${JSON.stringify(JEST_ALL_SKIPPED)});\nprocess.exit(0);\n`);
  const blocked = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush({ javascript: skippedRunner.tools }));
  assert.strictEqual(blocked.passed, false);
  assert.strictEqual(blocked.countKnown, true);
  assert.match(blocked.text, /zero tests ran/);
  assert.match(blocked.text, /, 3 skipped\./);
  assert.doesNotMatch(blocked.text, /1 skipped/, 'the Test Suites line is not the skipped count');

  const todoRunner = runnerFromSource(`process.stderr.write(${JSON.stringify(JEST_ALL_TODO)});\nprocess.exit(0);\n`);
  const todo = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush({ javascript: todoRunner.tools }));
  assert.strictEqual(todo.passed, false);
  assert.match(todo.text, /zero tests ran/);
  assert.match(todo.text, /, 2 skipped\./);

  // Guards: a jest run with passing tests still passes, and runFullTests answers as before.
  const passing = runnerEmitting(JEST_OUTPUT, 0);
  const ok = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(passing));
  assert.strictEqual(ok.passed, true);
  assert.strictEqual(ok.passCount, 8);
  assert.match(ok.text, /8 passed/);
  const full = await runFullTests({ javascript: skippedRunner.tools });
  assert.strictEqual(full.passed, true, 'runFullTests is untouched by the push-only zero rule');
});

test('Q24 — a failure whose output mentions "retry" but counts 2 failing tests says 2 failing tests, not flaky', async () => {
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(
    runnerEmitting('✖ retrying the upload fails\nℹ tests 3\nℹ pass 1\nℹ fail 2', 1)
  ));
  assert.strictEqual(result.passed, false);
  assert.match(result.text, /reported 2 failing tests\./);
  assert.doesNotMatch(result.text, /flaky/);
});

test('Q25 — a command with control characters is shown escaped, never raw', async () => {
  const LINE_SEPARATOR = String.fromCharCode(0x2028); // built, not typed: an invisible character in the source misleads a reader
  const base = runnerEmitting(PASS_3, 0).javascript;
  const tools = { javascript: { ...base, test: `${base.test} \u001b[31mred ${LINE_SEPARATOR}end` } };
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(tools));
  assert.strictEqual(result.passed, true, result.text);
  assert.ok(result.text.includes('\\x1b[31mred \\u2028end'), result.text);
  assert.ok(!result.text.includes('\u001b') && !result.text.includes(LINE_SEPARATOR), 'no raw control character');
  assert.ok(result.commands.every((c) => !c.includes('\u001b') && !c.includes(LINE_SEPARATOR)));
});

test('Q26 — a secret in the configured command is masked in the text and in the command list', async () => {
  const base = runnerEmitting(PASS_3, 0).javascript;
  const tools = { javascript: { ...base, test: `${base.test} https://deploy:hunter2@example.com/x API_TOKEN=abc123 --db-password="p w" KEEP=visible` } };
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush(tools));
  assert.strictEqual(result.passed, true, result.text);
  for (const secret of ['hunter2', 'abc123', 'p w']) {
    assert.ok(!result.text.includes(secret), `${secret} must not be shown`);
    assert.ok(!result.commands.join(' ').includes(secret), `${secret} must not be listed`);
  }
  assert.ok(result.text.includes('https://***@example.com/x'), result.text);
  assert.ok(result.text.includes('API_TOKEN=***'), result.text);
  assert.ok(result.text.includes('KEEP=visible'), 'a name that is no secret name is shown');
});

test('Q27 — the refusal of a configured command echoes it masked and escaped, never raw', async () => {
  const result = await inFreshDir(() => qualityAgent.runWholeSuiteBeforePush({
    javascript: { test: 'run-tests https://deploy:hunter2@example.com API_TOKEN=s3cr3tvalue \u001b[31m && echo done' }
  }));
  assert.strictEqual(result.passed, false);
  assert.strictEqual(result.refused, true);
  assert.match(result.text, /^Tests: not run — /);
  assert.ok(!result.text.includes('hunter2') && !result.text.includes('s3cr3tvalue'), `a secret is shown: ${result.text}`);
  assert.ok(result.text.includes('API_TOKEN=***'), result.text);
  assert.ok(result.text.includes('\\x1b[31m'), result.text);
  assert.ok(!result.text.includes('\u001b'), 'no raw escape byte');
});

test('runFullTests — passCountRead tells a read count from an unknown one; omitTotalLine skips only the closing line', async (t) => {
  const read = await runFullTests(runnerEmitting(NODE_TEST_SPEC, 0));
  assert.strictEqual(read.passed, true);
  assert.strictEqual(read.passCountRead, true);
  for (const out of [PLAIN_ASSERTION_SCRIPT, UNANCHORED_ZERO, PYTEST_STYLE]) {
    const unknown = await runFullTests(runnerEmitting(out, 0));
    assert.strictEqual(unknown.passed, true, out);
    assert.strictEqual(unknown.passCountRead, false, out);
  }
  assert.strictEqual((await runFullTests(runnerEmitting(PYTEST_STYLE, 0))).passCount, 3);
  const none = await runFullTests({ javascript: { test: null } });
  assert.strictEqual(none.passed, true);
  assert.strictEqual(none.passCountRead, false, 'no command ran is never a read count');

  const lines = captureConsole(t);
  const tools = runnerEmitting(PLAIN_ASSERTION_SCRIPT, 0);
  const quiet = await runFullTests(tools, { omitTotalLine: true });
  assert.ok(!lines.some((l) => /Tests passed \(/.test(l)), 'omitTotalLine prints no closing line');
  const loud = await runFullTests(tools);
  assert.ok(lines.some((l) => l.includes('Tests passed (0 total)')), 'without the option the line is printed as today');
  assert.strictEqual(quiet.passed, loud.passed);
  assert.strictEqual(quiet.passCount, loud.passCount);
  assert.strictEqual(quiet.passCountRead, loud.passCountRead);
});
