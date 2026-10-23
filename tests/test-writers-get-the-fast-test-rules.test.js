'use strict';

/**
 * The test-writing agents carry the fast-test rules, and the builder ticks only
 * the acceptance criteria it verified.
 *
 * Why: the suite profile in plans/functional/the-test-suite-runs-faster-and-never-weaker.md
 * (section 1) shows that a new test is slow unless its writer is told to keep it
 * small, and three builds in a row were refused at completion with "N of N
 * acceptance criteria not checked" because the builder never ticked its boxes.
 *
 * What this proves: the exact rule text ships, byte for byte, in the
 * unit-test-writer agent, in its skill and in the iron-loop executor; in the
 * executor it stands in the right sections (the Step 8 lines inside Step 8, the
 * acceptance-criteria rule before the completion command, the open-question line
 * inside the Output section); the checklist lines, the Testing Trophy sentence,
 * the slow_unit_test row and the loud-failure example are present in the writer files; and the Step 14
 * lines and the no-sleep-loop sentence are unchanged.
 * What it cannot prove: where the block and the other added lines sit inside the
 * two writer files (no case checks that), and that a model obeys the rules. Only
 * a later look at the tests the agents write, and at the completion results of
 * later builds, can show that.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// A missing file throws: loud failure. CRLF is folded so a Windows checkout compares the same text.
function read(...rel) {
  return fs.readFileSync(path.join(ROOT, ...rel), 'utf8').replace(/\r\n/g, '\n');
}

function between(text, start, end, where) {
  const a = text.indexOf(start);
  assert.ok(a !== -1, `${where}: start marker not found: ${start}`);
  const b = text.indexOf(end, a);
  assert.ok(b !== -1, `${where}: end marker not found after the start marker: ${end}`);
  return text.slice(a, b);
}

function from(text, start, where) {
  const a = text.indexOf(start);
  assert.ok(a !== -1, `${where}: start marker not found: ${start}`);
  return text.slice(a);
}

const FAST_TEST_RULES = [
  "### Fast tests",
  "",
  "A slow suite is run less often and protects less, as Software Engineering at Google says in chapter 11. These rules keep a new test fast without letting it prove less. Each outside source named below was read for CTOC's research brief of 2026-10-12, `plans/vision/deepthink/fast-hermetic-node-test-suites.md` in the CTOC repository, except the Node.js 24 child process documentation that rule 7 cites, which the brief does not quote. The npx observation in rule 7 is a check recorded in that brief against the CTOC repository; the Windows `.cmd` fact in rule 7 is also CTOC's own record in `src/lib/quality-agent.js`; the two fake clocks of other runtimes in rule 4, npm putting `node_modules/.bin` on the path of a script in rule 7, and pytest-xdist handing out single tests in its default mode in rule 6 are examples, not sources; `Object.freeze` and `fs.promises.rm` with `maxRetries` in rule 3 are CTOC's own choices; the loud failure of a missing tool in rule 2 is CTOC's own rule; and rule 8 comes from a hard rule of CTOC's operating manual.",
  "",
  "1. **Small and hermetic by default.** A small test starts no process or thread, writes no file, makes no real git repository, uses no network and waits on no real clock; it may read files committed to the repository. A test about one of those boundaries crosses it together with what reaching that boundary needs; a test about a real git repository also starts the git program. It is then a medium test, and its name says what it crosses. A test that reaches the network beyond `localhost` is a large test and never runs in the default suite; see rule 7. Size is about resources, not scope: an in-process test of several units together is still small. Source: Software Engineering at Google, chapter 11, \"Test Size\": small tests run in one process and never sleep, perform input or output or make other blocking calls, so they touch neither the network nor the disk; medium tests may span several processes, use threads and make blocking calls, including network calls to `localhost`; large tests remove the `localhost` restriction. Reading committed files is CTOC's choice, as the Bazel test encyclopedia lets a hermetic test read its declared inputs.",
  "2. **Replace a slow boundary, never the logic.** Hand the code under test a recorded real answer from the slow tool, service or process, through a seam: an injected command runner, clock or folder. Never replace the code being tested. For an error path, hand it the failing or malformed answer that path needs. Keep a clearly named contract test per real tool or program the recordings come from: it runs the real tool on the inputs the recorded answers came from and asserts that each field the tests read still matches the recording, so a stale recording fails a test. A missing tool fails loudly, never a skip: for a tool the lockfile installs it is a broken install, and CTOC's own rule extends this to a program the project requires but does not install, such as git. For a service beyond `localhost`, the contract test is the plan's live check of rule 7. The contract test is an integration test; the integration-test-writer skill owns its form. Source: Software Engineering at Google, chapter 13: a test double helps when the real implementation is slow, and each fake needs a contract test that runs the same checks against the real implementation and the fake; Martin Fowler, \"Contract Test\".",
  "3. **Expensive setup once per file, read-only.** Build expensive shared setup once per file and remove it at the end of the file; in node:test, build it in a `before` hook inside the file's `describe` and remove it in an `after` hook, which runs even when tests fail. Shared setup is read-only: it is the one exception to the rule above that tests share no state, and to the same rule in the checklist at the end; no test changes shared state. In JavaScript, freeze it at every level with `Object.freeze`, so that a write throws. Hand the code under test a copy of any part it receives, because in test-first work the code that might change it is not written yet. Remove folders with `fs.promises.rm` and its `maxRetries` option. Source for the hooks: the Node.js 24 test runner documentation.",
  "4. **Fake timers for time.** Drive time-outs, retries and schedules with fake timers, never with a real wait. In node:test, use the test's own context, `t.mock.timers.enable`, which the runner restores when the test ends; never the shared `mock.timers`, which stays faked for later tests in the file. Advance time with `tick` or `runAll`. It fakes `setTimeout`, `setInterval`, `setImmediate` and `Date`, globally and in `node:timers` and `node:timers/promises`, and nothing else, so code that reads `performance.now` takes an injected clock, as rule 2 says. In another runtime, use its own fake clock, such as `testing/synctest` from Go 1.25 or `FakeTimeProvider` for the .NET `TimeProvider`. The one test about the clock itself is the exception under rule 1. Source: the Node.js 24 test runner documentation.",
  "5. **Never assert a measured time inside a test.** To pin speed, count operations and assert the count; never assert a measured time, wall-clock or processor. A requirement stated in wall-clock time is checked by reading the runner's reported duration under rule 6, and reported, never dropped. An existing assertion on a measured time is replaced by an operation count that proves at least as much, and the swap is named in the report; under rule 8 it is never simply removed. Source: Silva and others, IEEE Transactions on Software Engineering, 2024: processor starvation is the most significant resource factor in flaky tests.",
  "6. **A time budget per size, read from the runner's own output.** The budgets are CTOC's own, set on 2026-10-12 from its own suite's profile. Small: under 100 ms per test. Medium: under 5 s per test, and a medium test sets a time-out that fails a hang, at least ten times its budget; in node:test that is the test's `timeout` option, which otherwise has no limit. A test over its budget is made faster by rules 1 to 4 or named as the next size up, and the writer's report names it with its duration. A file whose processor time, or whose duration in the runner's own output, passes 20 s is split along its `describe` blocks, or in other runners along its test classes or modules, because in node:test the longest file sets the floor under the whole suite: each file runs in its own process, all tests of one file run on one thread, and files start in alphabetical order. Under a runner that hands out single tests, such as pytest-xdist in its default mode, the file rule does not apply. Read durations from the runner's report, where node:test gives each test's `duration_ms`, at a recorded one-minute load no higher than the core count; never assert a duration the runner reports. Source: the Node.js 24 test runner documentation and its source code.",
  "7. **No internet and no package registry in the default suite.** No test downloads a tool or package; it uses the version the project's lockfile installed. In a Node project, never `npx <tool>` for a tool the project has not installed: without a terminal, npx installs a missing package without asking, by npm's npx and npm exec documentation for versions 10 and 11, and even `npx --no -- <tool>` asks the registry about the package before it refuses, as observed on 2026-10-12 with npm 11.11.0. Start an installed tool by running the file that the `bin` field of its package names for the tool's command, when that file is JavaScript, with the running Node program and an argument list, and no shell. On Windows, the path under `node_modules/.bin` and npx go through a `.cmd` file, which Node refuses to start without a shell; source: the Node.js 24 child process documentation, \"Spawning .bat and .cmd files on Windows\". From an npm script, use the tool's bare name, since npm puts `node_modules/.bin` on the path. Elsewhere in a shell, use `npx --offline --no -- <tool>`, which in the same observation, with an empty cache, made no request. Or answer the call with a recorded real answer, as rule 2 says. A deliberately live check is one test, named in the plan, with \"live\" in its name, and is never skipped. In the default suite it reaches nothing beyond `localhost`; a check that must reach beyond `localhost` lives in a file outside the default suite's pattern, run by a script the plan names, and is never in the default suite.",
  "8. **Faster never means weaker.** A moved test keeps its name and its assertions word for word; a changed test keeps or tightens what it proves. Every assertion of a test moved off a real boundary maps to an assertion in its replacement. Where the project has a mutation tester, run it on the code the test covers before and after, with the mutation-test-runner skill: no mutant the old test killed may survive the new one. Never drop, widen or skip an assertion to gain speed. Source: the hard rule \"NEVER weaken a test\" in CTOC's operating manual.",
].join('\n');

const READ_ONLY = "Shared setup is read-only: it is the one exception to the rule above that tests share no state, and to the same rule in the checklist at the end; no test changes shared state.";

const AGENT_EXCEPTION = "- Shared read-only setup per file is the one exception; see Fast tests, rule 3.";

const CHECKLIST_LINE = "- [ ] The Fast tests rules hold: size named, no real wait, no wall-clock assertion, no registry download, shared setup read-only.";

const TROPHY_TAIL = "Don't inflate unit coverage at the cost of integration coverage. Such an integration test still stays small or medium by rule 1 of Fast tests.";

const AGENT_LOUD = [
  "// ✅ GOOD: A missing dependency fails loudly, naming the missing variable",
  "test('db test', async () => {",
  "  if (!process.env.DB_URL) throw new Error('DB_URL is not set; this test needs a live database');",
  "  const user = await fetchUser(1);",
  "  expect(user.name).toBe('John');",
  "});",
].join('\n');

const SKILL_LOUD = [
  "// GOOD: a missing dependency fails loudly, naming the missing variable",
  "test('db test', async () => {",
  "  if (!process.env.DB_URL) throw new Error('DB_URL is not set; this test needs a live database');",
  "  const user = await fetchUser(1);",
  "  expect(user.name).toBe('John');",
  "});",
].join('\n');

const SLOW_ROW = "| `slow_unit_test` | Real network, disk write, DB or sleep inside a test that rule 1 of Fast tests calls small |";

const SKILL_POINTER = "- Follow the fast-test rules in [`skills/testing/writers/unit-test-writer/SKILL.md`](../../skills/testing/writers/unit-test-writer/SKILL.md), section \"Fast tests\".";

const RUN_BY_NAME = "while writing and implementing, run by name only the test files you wrote or changed, the test files the plan's `files:` list declares, and any test files the plan lists to run while building; Step 14 runs the whole suite.";

const STEP_14 = [
  "### Step 14: VERIFY",
  "- Run lint + type check",
  "- Run ALL tests (TDD Green) - not just new ones",
  "- Run exactly as CI does",
  "- Coverage at or above the project's enforced floor — `.ctoc/coverage-baseline.json` `minPct` (a ratchet that may only rise); the gate defaults to 80% only when no baseline is declared",
  "- 0 skipped, 0 flaky tests",
  "- Reachability (FILE fence): every file this plan created is require-reachable from a live root (node --test tests/reachability.test.js) — an unreachable module is a FAILED verify, kick back to Step 10 and wire it",
  "- Reachability (EXPORT fence): every export this plan added has a live caller (node --test tests/export-reachability.test.js) — a test is NOT a caller, so a \"module + its own test\" export with no live call site is a FAILED verify. Wire it, or delete it.",
  "- If ANY check fails -> kickback to relevant step",
].join('\n');

const NO_SLEEP_LOOP =
  'To wait for a long build or test, run it in the foreground with a timeout long enough for it, ' +
  'up to 10 minutes; if it can take longer and you were dispatched in the background, start it with ' +
  'run_in_background and end your turn — you are woken when it finishes; never wait in a loop that ' +
  'sleeps and checks a file, log or marker.';

const TICK_RULE = "**Before you complete, verify and tick every acceptance criterion.** The completion first validates the plan; that validation reads the plan's acceptance criteria section, from the first `##` heading whose text holds \"Acceptance Criteria\" in any letter case down to the next heading of that same `##` level or a `---` line, and refuses the plan while any `[ ]` box in that section is not ticked. Each refusal counts as a kickback, against Step 14 when every step box is already ticked, and a fourth kickback to one step, or a sixth in all, escalates the plan to the human. So, for each criterion: verify it by running or reading the evidence it names, then change its box to `- [x]`. A criterion about the completion's own check is verified by running at Step 14 each check the completion runs: lint, type check, the whole suite with no test skipped and its coverage floor, and for an app, launching it and getting a response. Tick after the last change to the declared files; a later change reopens every criterion whose evidence it touches. Never tick a criterion you did not verify. A criterion you cannot verify stays `- [ ]`, with the reason written in plain words at the end of that same checkbox line and never on a new line, because a plain line inside the acceptance section changes the plan's approved text and cancels the build's write permission; the reason has no square brackets, because the check counts bracketed marks anywhere in that section. Report such a criterion to CTO Chief as an open question, with that reason, instead of completing the plan. A criterion whose evidence needs a network command that stands only in a checkbox line is one you cannot verify, because you never run such a command.";

const OPEN_LINE = "If a criterion stays open, report one line for each, and no completion: `Open: {criterion} - {its reason in plain words, as written at the end of its checkbox line}`.";

const AGENT = 'agents/testing/writers/unit-test-writer.md';
const SKILL = 'skills/testing/writers/unit-test-writer/SKILL.md';
const EXECUTOR = 'agents/iron-loop/iron-loop-executor.md';

const agent = read('agents', 'testing', 'writers', 'unit-test-writer.md');
const skill = read('skills', 'testing', 'writers', 'unit-test-writer', 'SKILL.md');
const executor = read('agents', 'iron-loop', 'iron-loop-executor.md');

test(`${AGENT} carries the fast-test rules byte for byte`, () => {
  assert.ok(agent.includes(FAST_TEST_RULES), `${AGENT} does not hold the fast-test block byte for byte`);
});

test(`${SKILL} carries the fast-test rules byte for byte`, () => {
  assert.ok(skill.includes(FAST_TEST_RULES), `${SKILL} does not hold the fast-test block byte for byte`);
});

test(`${AGENT} keeps "No shared state between tests" and holds the read-only setup rule`, () => {
  assert.ok(agent.includes('No shared state between tests'), `${AGENT} lost "No shared state between tests"`);
  assert.ok(agent.includes(READ_ONLY), `${AGENT} does not hold the read-only setup rule`);
  assert.ok(agent.includes(AGENT_EXCEPTION), `${AGENT} does not hold the line that points to rule 3`);
});

test(`${SKILL} keeps "No shared mutable state between tests" and holds the read-only setup rule`, () => {
  const old = 'No shared mutable state between tests; use fixtures/factories per-test.';
  assert.ok(skill.includes(old), `${SKILL} lost "${old}"`);
  assert.ok(skill.includes(READ_ONLY), `${SKILL} does not hold the read-only setup rule`);
});

test("the builder's Step 8 points to the fast-test rules and runs only the named test files", () => {
  const step8 = between(executor, '### Step 8: TEST (TDD Red)', '### Step 9: PREPARE', EXECUTOR);
  assert.ok(step8.includes(SKILL_POINTER), `${EXECUTOR} Step 8 lacks the pointer to the fast-test rules`);
  assert.ok(step8.includes(RUN_BY_NAME), `${EXECUTOR} Step 8 lacks the run-by-name sentence`);
});

test('the builder never says the suite runs "once at completion"', () => {
  assert.ok(executor.length > 0, `${EXECUTOR} read empty`);
  assert.ok(!executor.includes('once at completion'), `${EXECUTOR} says the suite runs "once at completion"`);
});

test("the builder's Step 14 lines and its no-sleep-loop sentence are unchanged", () => {
  assert.ok(executor.includes(STEP_14), `${EXECUTOR} Step 14 lines changed`);
  assert.ok(executor.includes(NO_SLEEP_LOOP), `${EXECUTOR} lost the no-sleep-loop sentence`);
});

test('the builder verifies and ticks each acceptance criterion before the completion command', () => {
  const section = between(
    executor,
    '## Completing a plan — the ONE way',
    'menu task complete <taskId> --summary',
    EXECUTOR
  );
  assert.ok(section.includes(TICK_RULE), `${EXECUTOR} completion section lacks the acceptance-criteria rule`);
});

test("each writer file's checklist holds the fast-test line", () => {
  for (const [name, text] of [[AGENT, agent], [SKILL, skill]]) {
    const checklist = from(text, '## Checklist Before Returning', name);
    assert.ok(checklist.includes(CHECKLIST_LINE), `${name} checklist lacks the fast-test line`);
  }
});

test("the skill's Testing Trophy line and its slow_unit_test row name the size rule", () => {
  assert.ok(skill.includes(TROPHY_TAIL), `${SKILL} Testing Trophy line lacks the size sentence`);
  assert.ok(skill.includes(SLOW_ROW), `${SKILL} slow_unit_test row lacks the size rule`);
});

test('neither writer file shows test.skipIf, and each shows a missing dependency failing loudly', () => {
  assert.ok(!agent.includes('test.skipIf'), `${AGENT} still shows test.skipIf`);
  assert.ok(!skill.includes('test.skipIf'), `${SKILL} still shows test.skipIf`);
  assert.ok(agent.includes(AGENT_LOUD), `${AGENT} lacks the loud-failure example`);
  assert.ok(skill.includes(SKILL_LOUD), `${SKILL} lacks the loud-failure example`);
});

test("the builder's Output section gives the shape of the open-question report", () => {
  const output = between(executor, '## Output', '## Searching the repository', EXECUTOR);
  assert.ok(output.includes(OPEN_LINE), `${EXECUTOR} Output section lacks the open-question line`);
});
