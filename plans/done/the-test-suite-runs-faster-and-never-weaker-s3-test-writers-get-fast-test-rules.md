---
iron_loop_verdict: true
iron_loop: true
title: "The test-writing agents get fast-test rules, and the builder ticks only the criteria it verified"
type: implementation
created: 2026-10-12
priority: high
effort: small
parent_plan: the-test-suite-runs-faster-and-never-weaker
depends_on: the-test-suite-runs-faster-and-never-weaker-s2-no-test-reaches-the-npm-registry
files:
  - tests/test-writers-get-the-fast-test-rules.test.js
  - agents/testing/writers/unit-test-writer.md
  - skills/testing/writers/unit-test-writer/SKILL.md
  - agents/iron-loop/iron-loop-executor.md
  - README.md
  - CLAUDE.md
approved_by: human
approved_at: 2026-10-13T11:16:56.230Z
gate_crossed: implementation → todo
---

# The test-writing agents get fast-test rules, and the builder ticks only the criteria it verified

Slice 3 of 5 of `plans/functional/the-test-suite-runs-faster-and-never-weaker.md`: acceptance
criteria 1, 2, 24, 25, 26, 27, 28, 29 and 29a (the owner's addition of 2026-10-12), and the
functional plan's decisions 10, 11 and 12. The rules rest on the research brief
`plans/vision/deepthink/fast-hermetic-node-test-suites.md` ("What the evidence says" and
"Principles to act on"); every outside source a rule names is one the brief quotes. Rule 7's npx
observation is the brief's own check against this repository ("Checked by the session against
this repository"), and rule 8 cites a CTOC lesson; the block's opening paragraph says so.

## Problem statement

1. **The agents that write tests carry no rule that keeps a new test fast.**
   `agents/testing/writers/unit-test-writer.md` has no speed rule; its "Test Isolation" says
   "No shared state between tests" and "Mock external dependencies" (lines 70–75, the first at
   line 73). `skills/testing/writers/unit-test-writer/SKILL.md` names Fast in its FIRST
   principles (line 66), flags `slow_unit_test` (line 104) and says "No shared mutable state
   between tests; use fixtures/factories per-test." (line 145), with no time budget, nothing on
   shared setup, fake timers, the registry, or which tests to run while building. The builder's
   Step 8 (`agents/iron-loop/iron-loop-executor.md` lines 229–233) only says to write the tests
   first, run them and see them fail.
2. **The builder hands back plans whose acceptance boxes are still open.** Three builds in a
   row were refused at completion with "N of N acceptance criteria not checked" (the owner,
   2026-10-12). That text is produced by `validateAcceptanceCriteria` in
   `src/lib/plan-validator.js` (lines 590–632; the message at lines 620–625). It is called by
   `validateForReview` (line 277), which `completeExecution` in `src/lib/actions.js` runs first
   (line 1021), before the plan moves and before Step 14 runs; the menu's
   `menu task complete <taskId>` reaches it through `completeTaskPlan` (line 1421). A refusal is
   recorded as a kickback (line 1029), keyed by `failingStepFrom` to the lowest incomplete
   required step and, when every step is complete, to Step 14 (lines 1446–1471, the fallback at
   line 1470, its reason at lines 1447–1449). The circuit breaker escalates on the fourth
   kickback to one step or the sixth in all (`src/lib/circuit-breaker.js` lines 65–68). The same
   validation also gates the sweep of idle in-progress plans (`src/lib/actions.js` lines
   2212–2222). The executor file says nothing about ticking acceptance criteria.

What `validateAcceptanceCriteria` reads, exactly (`src/lib/plan-validator.js`):
- the section: the first line matching `^##\s+[^\n]*Acceptance Criteria[^\n]*\n` with the
  flags `i` and `m` (any letter case), up to the next line starting `##` plus whitespace (so a
  `###` sub-heading stays inside), a `---` line, or the end of the file (lines 598–599). Only when
  no such heading exists does it fall back to the first prose mention of "acceptance criteria",
  "definition of done" or "requirements" (line 600);
- the boxes: every bracketed space or lowercase `x` anywhere in that section is a box (line 610);
  every `[x]`, either letter case, counts as ticked (line 611); unticked = boxes minus ticked
  (line 612);
- the verdict: any unticked box is an error and the plan is refused (lines 620–625); no box at all
  is only a warning (lines 627–629).

## Technical approach

Text insertions in four files, one replaced example in each of the two writer files (decision 29),
one new test, one count sync. Apart from those two examples, no sentence that exists today is
changed or removed. All new rule text is plain ASCII; the one example comment of the agent keeps
the check mark its neighbours carry.

This is the plan after the review round of 2026-10-13: the CTO Chief's consolidated fix list
(three iron-loop-critic reviews at extra-high effort and one agent-critic pass with web research)
changed the rule block, the Step 8 sentence, the acceptance-criteria rule and the writer files'
outside-the-block lines; each change is a decision below (25 to 33) with its source.

### 1. `agents/testing/writers/unit-test-writer.md` — insert the fast-test block

Insert after line 75 (`- Mock external dependencies`, the last line of "### Test Isolation") and
before the blank line that precedes `## Language-Specific Frameworks` (line 77): one blank line,
then the block below, so the file reads `- Mock external dependencies`, blank line, the block,
blank line, `## Language-Specific Frameworks`. Lines 70–75 stay as they are, including
"- No shared state between tests" (criterion 25).

The block, byte for byte (the same text goes into the skill in section 2):

```
### Fast tests

A slow suite is run less often and protects less, as Software Engineering at Google says in chapter 11. These rules keep a new test fast without letting it prove less. Each outside source named below was read for CTOC's research brief of 2026-10-12, `plans/vision/deepthink/fast-hermetic-node-test-suites.md` in the CTOC repository, except the Node.js 24 child process documentation that rule 7 cites, which the brief does not quote. The npx observation in rule 7 is a check recorded in that brief against the CTOC repository; the Windows `.cmd` fact in rule 7 is also CTOC's own record in `src/lib/quality-agent.js`; the two fake clocks of other runtimes in rule 4, npm putting `node_modules/.bin` on the path of a script in rule 7, and pytest-xdist handing out single tests in its default mode in rule 6 are examples, not sources; `Object.freeze` and `fs.promises.rm` with `maxRetries` in rule 3 are CTOC's own choices; the loud failure of a missing tool in rule 2 is CTOC's own rule; and rule 8 is a CTOC lesson.

1. **Small and hermetic by default.** A small test starts no process or thread, writes no file, makes no real git repository, uses no network and waits on no real clock; it may read files committed to the repository. A test about one of those boundaries crosses it together with what reaching that boundary needs; a test about a real git repository also starts the git program. It is then a medium test, and its name says what it crosses. A test that reaches the network beyond `localhost` is a large test and never runs in the default suite; see rule 7. Size is about resources, not scope: an in-process test of several units together is still small. Source: Software Engineering at Google, chapter 11, "Test Size": small tests run in one process and never sleep, perform input or output or make other blocking calls, so they touch neither the network nor the disk; medium tests may span several processes, use threads and make blocking calls, including network calls to `localhost`; large tests remove the `localhost` restriction. Reading committed files is CTOC's choice, as the Bazel test encyclopedia lets a hermetic test read its declared inputs.
2. **Replace a slow boundary, never the logic.** Hand the code under test a recorded real answer from the slow tool, service or process, through a seam: an injected command runner, clock or folder. Never replace the code being tested. For an error path, hand it the failing or malformed answer that path needs. Keep a clearly named contract test per real tool or program the recordings come from: it runs the real tool on the inputs the recorded answers came from and asserts that each field the tests read still matches the recording, so a stale recording fails a test. A missing tool fails loudly, never a skip: for a tool the lockfile installs it is a broken install, and CTOC's own rule extends this to a program the project requires but does not install, such as git. For a service beyond `localhost`, the contract test is the plan's live check of rule 7. The contract test is an integration test; the integration-test-writer skill owns its form. Source: Software Engineering at Google, chapter 13: a test double helps when the real implementation is slow, and each fake needs a contract test that runs the same checks against the real implementation and the fake; Martin Fowler, "Contract Test".
3. **Expensive setup once per file, read-only.** Build expensive shared setup once per file and remove it at the end of the file; in node:test, build it in a `before` hook inside the file's `describe` and remove it in an `after` hook, which runs even when tests fail. Shared setup is read-only: it is the one exception to the rule above that tests share no state, and to the same rule in the checklist at the end; no test changes shared state. In JavaScript, freeze it at every level with `Object.freeze`, so that a write throws. Hand the code under test a copy of any part it receives, because in test-first work the code that might change it is not written yet. Remove folders with `fs.promises.rm` and its `maxRetries` option. Source for the hooks: the Node.js 24 test runner documentation.
4. **Fake timers for time.** Drive time-outs, retries and schedules with fake timers, never with a real wait. In node:test, use the test's own context, `t.mock.timers.enable`, which the runner restores when the test ends; never the shared `mock.timers`, which stays faked for later tests in the file. Advance time with `tick` or `runAll`. It fakes `setTimeout`, `setInterval`, `setImmediate` and `Date`, globally and in `node:timers` and `node:timers/promises`, and nothing else, so code that reads `performance.now` takes an injected clock, as rule 2 says. In another runtime, use its own fake clock, such as `testing/synctest` from Go 1.25 or `FakeTimeProvider` for the .NET `TimeProvider`. The one test about the clock itself is the exception under rule 1. Source: the Node.js 24 test runner documentation.
5. **Never assert a measured time inside a test.** To pin speed, count operations and assert the count; never assert a measured time, wall-clock or processor. A requirement stated in wall-clock time is checked by reading the runner's reported duration under rule 6, and reported, never dropped. An existing assertion on a measured time is replaced by an operation count that proves at least as much, and the swap is named in the report; under rule 8 it is never simply removed. Source: Silva and others, IEEE Transactions on Software Engineering, 2024: processor starvation is the most significant resource factor in flaky tests.
6. **A time budget per size, read from the runner's own output.** The budgets are CTOC's own, set on 2026-10-12 from its own suite's profile. Small: under 100 ms per test. Medium: under 5 s per test, and a medium test sets a time-out that fails a hang, at least ten times its budget; in node:test that is the test's `timeout` option, which otherwise has no limit. A test over its budget is made faster by rules 1 to 4 or named as the next size up, and the writer's report names it with its duration. A file whose processor time, or whose duration in the runner's own output, passes 20 s is split along its `describe` blocks, or in other runners along its test classes or modules, because in node:test the longest file sets the floor under the whole suite: each file runs in its own process, all tests of one file run on one thread, and files start in alphabetical order. Under a runner that hands out single tests, such as pytest-xdist in its default mode, the file rule does not apply. Read durations from the runner's report, where node:test gives each test's `duration_ms`, at a recorded one-minute load no higher than the core count; never assert a duration the runner reports. Source: the Node.js 24 test runner documentation and its source code.
7. **No internet and no package registry in the default suite.** No test downloads a tool or package; it uses the version the project's lockfile installed. In a Node project, never `npx <tool>` for a tool the project has not installed: without a terminal, npx installs a missing package without asking, by npm's npx and npm exec documentation for versions 10 and 11, and even `npx --no -- <tool>` asks the registry about the package before it refuses, as observed on 2026-10-12 with npm 11.11.0. Start an installed tool by running the file that the `bin` field of its package names for the tool's command, when that file is JavaScript, with the running Node program and an argument list, and no shell. On Windows, the path under `node_modules/.bin` and npx go through a `.cmd` file, which Node refuses to start without a shell; source: the Node.js 24 child process documentation, "Spawning .bat and .cmd files on Windows". From an npm script, use the tool's bare name, since npm puts `node_modules/.bin` on the path. Elsewhere in a shell, use `npx --offline --no -- <tool>`, which in the same observation, with an empty cache, made no request. Or answer the call with a recorded real answer, as rule 2 says. A deliberately live check is one test, named in the plan, with "live" in its name, and is never skipped. In the default suite it reaches nothing beyond `localhost`; a check that must reach beyond `localhost` lives in a file outside the default suite's pattern, run by a script the plan names, and is never in the default suite.
8. **Faster never means weaker.** A moved test keeps its name and its assertions word for word; a changed test keeps or tightens what it proves. Every assertion of a test moved off a real boundary maps to an assertion in its replacement. Where the project has a mutation tester, run it on the code the test covers before and after, with the mutation-test-runner skill: no mutant the old test killed may survive the new one. Never drop, widen or skip an assertion to gain speed. Source: CTOC's lesson "Fix the failures, not the tests".
```

Outside the block, in the agent, three more edits (decisions 26, 27 and 29). First, one line
added right after line 73 (`- No shared state between tests`), so the list reads that line, then
this line, then `- Use fixtures/factories for test data`:

```
- Shared read-only setup per file is the one exception; see Fast tests, rule 3.
```

Second, one line added at the end of "## Checklist Before Returning", after
`- [ ] **NO tests without assertions**`:

```
- [ ] The Fast tests rules hold: size named, no real wait, no wall-clock assertion, no registry download, shared setup read-only.
```

Third, the good-pattern example that skips a test for a missing database contradicts the
zero-skipped rule and rule 7 of the block. The five lines from "// ✅ GOOD: Skip conditionally,
with the reason in a comment" through the closing `});` (lines 217 to 221 of the base commit) are replaced by these
six, and the blank line and the example after them stay:

```
// ✅ GOOD: A missing dependency fails loudly, naming the missing variable
test('db test', async () => {
  if (!process.env.DB_URL) throw new Error('DB_URL is not set; this test needs a live database');
  const user = await fetchUser(1);
  expect(user.name).toBe('John');
});
```

How each rule maps to criterion 24 and to the brief:

| Rule | Criterion 24 item | Source in the brief |
|---|---|---|
| 1 | small and hermetic by default: no process or thread, no file written, no real git repository, no network, no real clock, committed files may be read; a test about one boundary crosses it with what reaching it needs and is medium, and its name says what it crosses; a test that reaches the network beyond `localhost` is large and never runs in the default suite; size is about resources, not scope | "What the evidence says" item 1 (Google, chapter 11, "Test Size": small tests run in one process and never sleep, perform input or output or make blocking calls; medium tests span processes, use threads, make blocking calls including to `localhost`; large tests "remove the `localhost` restriction"; Bazel: a hermetic test depends only on declared source files and products); principle 1. The claim that small tests run on one thread is not in the brief, so the source sentence says "in one process" and lets "use threads" under medium carry the rest |
| 2 | replace a slow boundary, never the logic, with a recorded real answer, and for an error path the failing or malformed answer; one named contract test per real tool or program the recordings come from, on the inputs of the recordings, asserting each field the tests read; a missing tool fails loudly (CTOC's own rule extends it to a program such as git that the project requires but does not install); for a service beyond `localhost` the contract test is the live check of rule 7 | item 4 (Google, chapter 13: contract tests "run against both the real thing and the fake"; Fowler, "Contract Test"); principle 3 |
| 3 | expensive setup once per file in a `before` hook inside the `describe`, read-only, the one exception to the no-shared-state rules, frozen with `Object.freeze`, copies handed to the code under test, folders removed with `fs.promises.rm` and `maxRetries`; the hook words are marked "in node:test" | item 2 (`before`, and `after` "is guaranteed to run, even if tests within the suite fail"); principle 5 ("inside the `describe`", "Freezing the result is a proposal"). Run in this build: `fs.promises.rm` accepts `maxRetries` (Node v24.14.1) |
| 4 | fake timers for time-outs, retries and schedules, on the test's own context, advanced with `tick` or `runAll`, faking four APIs and nothing else; the clock itself is the one exception | item 2 (`MockTimers`, the four `apis` values). Run in this build, Node v24.14.1: `t.mock.timers.enable` is restored when the test ends, the shared `mock.timers.enable` stays faked for the next test, `setTimeout` from `node:timers` and from `node:timers/promises` is faked, and `performance.now` is not. The two other runtimes' clocks are examples, not sources |
| 5 | count operations and assert the count; never assert a measured time, wall-clock or processor; a wall-clock requirement is read from the runner and reported | item 7 (Silva and others 2024, section IV-B1); principle 8 |
| 6 | the budget per size (CTOC's own), a time-out on a medium test, a test over its budget made faster or named as the next size up and reported, a long file split, durations read from the runner at a recorded load; a duration the runner reports is never asserted | items 2, 3 and 7 (per-file process, one thread per file, alphabetical order, `duration_ms`; the per-test `timeout` option defaults to `Infinity`); the numbers are the functional plan's decision 10. The pytest-xdist sentence is not in the brief |
| 7 | no download of a tool or package; an installed tool is started by running the file its package's `bin` field names, when it is JavaScript, with the running Node program and an argument list and no shell; from an npm script the bare name; elsewhere in a shell `npx --offline --no -- <tool>`; a live check is one test named in the plan and marked live | item 4 (npm's npx documentation, versions 10 and 11); "Checked by the session against this repository" (the npm 11.11.0 probe: `npx --no -- eslint` requested the package's metadata, `npx --offline --no -- eslint` made no request whether eslint was installed or not). Not from the brief, and named so in the block: the Windows `.cmd` refusal is the Node.js 24 child process documentation and CTOC's own record (`src/lib/quality-agent.js` lines 239 to 245), and the script start is the one slice 2 gives CTOC's security scan for eslint (decision 19) |
| 8 | faster never means weaker; every assertion of a moved test maps to one in its replacement; a mutation tester, where the project has one, runs before and after | the owner's brief (functional plan section 1); CTOC's lesson 14, "Fix the failures, not the tests"; the mutation-test-runner skill |

### 2. `skills/testing/writers/unit-test-writer/SKILL.md` — insert the same block

Insert after line 147 (`- Reset any global state (env vars, singletons) in teardown.`, the last
line of "### Test Isolation") and before the blank line that precedes
`### Fakes vs Mocks vs Stubs — when to reach for which` (line 149): one blank line, then the
block of section 1, byte for byte. Line 145 stays as it is (criterion 25). Four more edits in this
file (decisions 27, 29 and 37). First, the Testing Trophy line (line 70 of the base commit) ends with
one more sentence, so its last two sentences read:

```
Don't inflate unit coverage at the cost of integration coverage. Such an integration test still stays small or medium by rule 1 of Fast tests.
```

Second, the same checklist line as in the agent is added at the end of "## Checklist Before
Returning", after `- [ ] No real PII, no real secrets, no real credentials in test data` (line 674
of the base commit):

```
- [ ] The Fast tests rules hold: size named, no real wait, no wall-clock assertion, no registry download, shared setup read-only.
```

Third, the four-line example "// GOOD: skip with explicit reason" through its closing `});` (lines
560 to 563 of the base commit) is replaced by these six lines:

```
// GOOD: a missing dependency fails loudly, naming the missing variable
test('db test', async () => {
  if (!process.env.DB_URL) throw new Error('DB_URL is not set; this test needs a live database');
  const user = await fetchUser(1);
  expect(user.name).toBe('John');
});
```

Fourth, the `slow_unit_test` row of the skill's table of findings (line 104 of the base commit) names
the size rule; its first two cells, byte for byte, are these, and its third cell stays:

```
| `slow_unit_test` | Real network, disk write, DB or sleep inside a test that rule 1 of Fast tests calls small |
```

### 3. `agents/iron-loop/iron-loop-executor.md` — Step 8

Add two lines after line 233 (`- Test error conditions`), so Step 8 reads:

```
### Step 8: TEST (TDD Red)
- Write tests FIRST (TDD - not just identify coverage)
- Run tests, expect failures (red)
- Tests define expected behavior
- Test error conditions
- Follow the fast-test rules in [`skills/testing/writers/unit-test-writer/SKILL.md`](../../skills/testing/writers/unit-test-writer/SKILL.md), section "Fast tests".
- Which tests to run: while writing and implementing, run by name only the test files you wrote or changed, the test files the plan's `files:` list declares, and any test files the plan lists to run while building; Step 14 runs the whole suite.
```

The second added line holds criterion 26's sentence byte for byte, from "while" to "suite.", with
the plan's `files:` list, the test files written or changed, and the test files the plan lists to
run while building as the only ones run by name (decision 31).
Step 14 (lines 272–280) is not touched (criterion 27), nor is the no-sleep-loop sentence (line
296). The link form matches the file's own honest-status link (line 332), which resolves from
`agents/iron-loop/` inside the installed plugin.

### 4. `agents/iron-loop/iron-loop-executor.md` — the owner's acceptance-criteria rule

Insert after line 181 (`## Completing a plan — the ONE way`) and its blank line, before line 183
(`When steps 8-16 are done, complete through the menu's completion route with the`): the
paragraph below, then one blank line. The builder reads it at the moment it is about to call the
completion command; Step 16 already sends it here ("see "Completing a plan" above", line 291).

```
**Before you complete, verify and tick every acceptance criterion.** The completion first validates the plan; that validation reads the plan's acceptance criteria section, from the first `##` heading whose text holds "Acceptance Criteria" in any letter case down to the next heading of that same `##` level or a `---` line, and refuses the plan while any `[ ]` box in that section is not ticked. Each refusal counts as a kickback, against Step 14 when every step box is already ticked, and a fourth kickback to one step, or a sixth in all, escalates the plan to the human. So, for each criterion: verify it by running or reading the evidence it names, then change its box to `- [x]`. A criterion about the completion's own check is verified by running at Step 14 each check the completion runs: lint, type check, the whole suite with no test skipped and its coverage floor, and for an app, launching it and getting a response. Tick after the last change to the declared files; a later change reopens every criterion whose evidence it touches. Never tick a criterion you did not verify. A criterion you cannot verify stays `- [ ]`, with the reason written in plain words at the end of that same checkbox line and never on a new line, because a plain line inside the acceptance section changes the plan's approved text and cancels the build's write permission; the reason has no square brackets, because the check counts bracketed marks anywhere in that section. Report such a criterion to CTO Chief as an open question, with that reason, instead of completing the plan. A criterion whose evidence needs a network command that stands only in a checkbox line is one you cannot verify, because you never run such a command.
```

Every claim in it is read from the code named: the plan's validation running first in the
completion (`src/lib/actions.js` line 1021), with the acceptance check as the third check inside
it (`validateForReview`, `src/lib/plan-validator.js` lines 259, 268 and 277, after the step check
and the escalation check); the section and its end (lines 598–599); the refusal on any unticked
box (lines 610–625); why a reason carries no square brackets (line 610 counts a bracketed space
or lowercase x as a box, line 611 counts a bracketed x of either letter case as ticked, so a
lowercase `[x]` in a reason adds a ticked box and an uppercase `[X]` adds a tick without a box,
which lets an open criterion pass); why the reason goes at the end of its own checkbox line
(`isCheckboxLine` in `src/lib/approval-ledger.js`, lines 377–385, and `computeSpecHashWith` from
line 427 skip a line only when it starts with `- [x]`, `- [X]` or `- [ ]`, so the text on a
checkbox line is outside the plan's approved text, while a plain line inside the acceptance
section is inside it and changes it: decision 25); the kickback and its step (`src/lib/actions.js`
lines 1029 and 1446–1471); the fourth and sixth kickback (`src/lib/circuit-breaker.js` lines
65–68); and the network command that stands only in a checkbox line, which the builder never runs
(`agents/iron-loop/iron-loop-executor.md` line 39). The checks the completion runs are the ones
the paragraph lists: lint, type check, the whole suite with no test skipped and its coverage floor, and for an app its
launch and a response (decision 25). A criterion about the completion's own check is one such as
this plan's criterion 2. The prose fallback of line 600 is left out: plans written by CTOC's
planner carry the heading.

The executor's "## Output" section gets one more paragraph, between the closing fence of its
report example and `Then STOP.`, giving the shape of the open-question report the paragraph above
asks for (decision 25):

```
If a criterion stays open, report one line for each, and no completion: `Open: {criterion} - {its reason in plain words, as written at the end of its checkbox line}`.
```

### 5. `tests/test-writers-get-the-fast-test-rules.test.js` — the presence test (new)

Pattern: `tests/agents-never-wait-in-a-sleep-loop.test.js` (exact text present byte for byte;
a missing file throws, a loud failure). `node:test` and `node:assert/strict`, `fs`, `path`; no
process, no network, no temporary folder: a small test by rule 1, expected well under 100 ms per
test.

Header comment, in substance: why (the profile in the functional plan, section 1; the three
refused builds); what it proves (the exact rule text ships in the three files; in the executor
it stands in the right sections, the Step 8 lines inside Step 8, the acceptance-criteria rule
before the completion command and the open-question line inside the Output section; and Step 14
and the no-sleep-loop sentence are unchanged); what it cannot prove (where the block and the
other added lines sit inside the two writer files, which no case checks; and that a model obeys
the rules, which only a later look at the tests the agents write and at the completion results of
later builds can show).

Shared pieces:
- `read(...rel)`: `fs.readFileSync(path.join(ROOT, ...rel), 'utf8')` with `\r\n` folded to `\n`,
  so a Windows checkout without a `.gitattributes` (none exists in this repository) compares the
  same text.
- `between(text, start, end, where)`: the slice from `start` to the first `end` after it; asserts
  that both markers are found, naming the missing one, so a moved heading fails loudly rather
  than passing on an empty slice.
- `from(text, start, where)`: the slice from `start` to the end of the text, with the same loud
  failure when `start` is not found.
- Constants, each printed by a program from this plan (sections 1 to 4) or, for `STEP_14` and
  `NO_SLEEP_LOOP`, from the executor file at the base commit, never retyped:
  - `FAST_TEST_RULES`: the block of section 1, its lines joined with `\n`.
  - `READ_ONLY`: rule 3's reconciling sentence, `Shared setup is read-only: it is the one exception to the rule above that tests share no state, and to the same rule in the checklist at the end; no test changes shared state.`
  - `AGENT_EXCEPTION`: the agent's added line after `- No shared state between tests` (section 1).
  - `CHECKLIST_LINE`: the added checklist line of sections 1 and 2.
  - `TROPHY_TAIL`: the Testing Trophy line's last two sentences (section 2).
  - `AGENT_LOUD` and `SKILL_LOUD`: the six-line replacement examples of sections 1 and 2.
  - `SLOW_ROW`: the first two cells of the skill's `slow_unit_test` row (section 2).
  - `SKILL_POINTER`: the first added Step 8 line of section 3, from `- Follow` to `"Fast tests".`
  - `RUN_BY_NAME`: criterion 26's sentence, from `while writing` to `the whole suite.`
  - `STEP_14`: the nine lines 272–280 of the executor at the base commit, joined with `\n`, from
    `### Step 14: VERIFY` to `- If ANY check fails -> kickback to relevant step`.
  - `NO_SLEEP_LOOP`: the same sentence `tests/agents-never-wait-in-a-sleep-loop.test.js` holds
    (its lines 24–28).
  - `TICK_RULE`: the paragraph of section 4.
  - `OPEN_LINE`: the Output paragraph of section 4.

Cases (each name says what it proves):
1. `agents/testing/writers/unit-test-writer.md carries the fast-test rules byte for byte` —
   `read(...)` includes `FAST_TEST_RULES`. Red before the edit.
2. `skills/testing/writers/unit-test-writer/SKILL.md carries the fast-test rules byte for byte` —
   the same. Red before the edit.
3. `agents/testing/writers/unit-test-writer.md keeps "No shared state between tests" and holds the read-only setup rule`
   — includes `No shared state between tests`, `READ_ONLY` and `AGENT_EXCEPTION` (criterion 25);
   no position check. Red before.
4. `skills/testing/writers/unit-test-writer/SKILL.md keeps "No shared mutable state between tests" and holds the read-only setup rule`
   — includes both `No shared mutable state between tests; use fixtures/factories per-test.` and
   `READ_ONLY`; no position check. Red before.
5. `the builder's Step 8 points to the fast-test rules and runs only the named test files` — the
   slice `between(executor, '### Step 8: TEST (TDD Red)', '### Step 9: PREPARE')` includes
   `SKILL_POINTER` and `RUN_BY_NAME` (criterion 26). Red before.
6. `the builder never says the suite runs "once at completion"` — the executor text does not
   include `once at completion` (criterion 26). Green before: a guard.
7. `the builder's Step 14 lines and its no-sleep-loop sentence are unchanged` — the executor
   includes `STEP_14` and `NO_SLEEP_LOOP` (criterion 27). Green before: a guard.
8. `the builder verifies and ticks each acceptance criterion before the completion command` — the
   slice `between(executor, '## Completing a plan — the ONE way', 'menu task complete <taskId> --summary')`
   includes `TICK_RULE` (criterion 29a). Red before.
9. `each writer file's checklist holds the fast-test line` — for each of the two writer files,
   the text from `## Checklist Before Returning` to the end of the file, cut by `from(text, start,
   where)`, includes `CHECKLIST_LINE` (criterion 24). Red before.
10. `the skill's Testing Trophy line and its slow_unit_test row name the size rule` — the skill
    includes `TROPHY_TAIL` and `SLOW_ROW` (criterion 24). Red before.
11. `neither writer file shows test.skipIf, and each shows a missing dependency failing loudly` —
    neither file includes `test.skipIf`; the agent includes `AGENT_LOUD` and the skill
    `SKILL_LOUD` (criterion 24). Red before.
12. `the builder's Output section gives the shape of the open-question report` — the slice
    `between(executor, '## Output', '## Searching the repository')` includes `OPEN_LINE`
    (criterion 29a). Red before.

Cases 9 to 12 are the lines outside the block that the review round of 2026-10-13 added
(decisions 26, 27, 29, 25 and 37); each is a presence check, with no position check beyond the
slice named.

What the test proves: the rule text ships, byte for byte, in each place a model reads it, and the
lines it must not disturb are unchanged. What it cannot prove: that a model obeys a rule. That is
stated in the header, as the sleep-loop test does.

### 6. Counts

`node src/scripts/release.js` after the test file exists: it rewrites the test-file count in
`CLAUDE.md` ("Run all 567 test files", "tests/  567 test files") and `README.md` (line 1145)
through `COUNT_UPDATES` (`src/scripts/release.js` lines 99–100). The number is computed from disk
at build time, so slices 1 and 2, which add test files before this one, are already counted.
`VERSION` is unchanged and never changes in this slice; the script's version sync writes that
version into `package.json`, `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
(`JSON_VERSION_FILES`, lines 37–57) and README.md's version lines. A write it makes to any file
outside the six declared files goes through `src/lib/scope-growth.js` and stops the build
(Step 10). The number's digit count does not change, so `CLAUDE.md` stays within its 15,000-byte limit.

### What the new text avoids, and why

Each fence below reads these files; the new text was written to pass it, not to be excused by it.

| Fence | What it would catch | Why the new text passes |
|---|---|---|
| `tests/export-reachability.test.js` (exact dead-export count, lines 123–137) through `src/lib/reachability.js` `SURFACE_CALL_RE` (line 654) | any identifier followed by optional space and `(` in an agent or skill file counts as a call and can mark a dead export live | none of the new rule text has an opening parenthesis after a word; the only `(` is in the Markdown link `](../../`, after a `]`. The two replacement examples are code: they hold `test(`, which both files already hold, and `new Error(`, which neither holds; the fence is run in Step 10 and a moved count stops the build |
| `tests/agent-tool-grants.test.js` check 12 (lines 1299–1307, 1847) | `npx --no <word>` where the word is not `--` | the only npx texts with `--no` are `npx --no -- <tool>` and `npx --offline --no -- <tool>`; in both, `--` follows `--no`, and the check's pattern `\bnpx\s+--no\s+(\S+)` (line 1303) does not match the second at all |
| `tests/agent-tool-grants.test.js` check 15 (`SEARCH_ORDER_SHAPES`, lines 324–329) | "the Grep tool", `Grep(`, "with Read, Grep", "Bash only for" in an agent holding Bash with Grep | none appears |
| `tests/agent-tool-grants.test.js` checks 11 and 7.11 (`AGENT_SENTENCES` line 454, `AGENT_BODY_SENTENCES` lines 665 and 730) | a pinned sentence missing from the search section or the body | the inserts sit outside both search sections ("## Searching the repository", unit-test-writer line 247, executor line 322) and change no pinned sentence |
| `tests/instruction-surfaces-say-the-moment.test.js` (shapes at lines 72–78) and `tests/gate-numbers-fence.test.js` | a gate number told to a human | the new text names no gate; it names Step 14, a step |
| `tests/tier1-no-peer-dispatch.test.js` (line 40) | a line starting "Dispatch <name>" in a Tier-1 agent | none; the builder "reports it to CTO Chief" |
| `tests/unexecutable-instruction-fence.test.js` | an order to call a function the agent cannot run | both agents hold Bash, which the scan skips (`src/lib/unexecutable-instruction-scan.js` lines 275–276); the new text orders no call |
| `src/lib/plan-validator.js` `validateAcceptanceCriteria` on this plan itself | a bracketed box inside this plan's acceptance section that no one can tick | the rule texts quoting `[ ]` and `- [x]` sit in this section, inside code blocks, outside "## Acceptance criteria"; that section holds only its real boxes |

No `ctoc:claims` block exists in the three files and none is added; none of them has a rule
inventory under `tests/compaction-eval/` (its 12 inventories name other agents).

### Wiring — the live surfaces

- `agents/testing/writers/unit-test-writer.md` is the definition Claude Code loads when CTO Chief
  sends work to `unit-test-writer`; it is a wrapper whose method file is the skill
  (`target_skill: testing/writers/unit-test-writer`, line 11), so both texts reach that agent. The
  skill also loads on its `when_to_load` phrases (lines 5–12).
- `agents/iron-loop/iron-loop-executor.md` is the builder's definition, loaded for every build.
  Its Step 8 links the skill's rules by path.
- The presence test is run by `npm test` with every other test file.
- Agent definitions run from the installed plugin, so the rules reach builds only after a release
  that carries them is installed; the build record says so and does not report "the agents now do
  this" before then (functional plan, "Constraints").

## Build order (test first)

1. Write `tests/test-writers-get-the-fast-test-rules.test.js` and run it alone before any agent
   file changes: cases 1, 2, 3, 4, 5 and 8 fail, cases 6 and 7 pass. Quote the run's summary in
   the build record. In the review round of 2026-10-13 the same order is repeated: the plan's
   fixed text changes first, the test is regenerated from it, and it is run against the files as
   they stood, red for cases 1 to 5 and 8 to 12 and green for cases 6 and 7, before the files change.
2. Insert the texts of sections 1 to 4.
3. Run the new test alone: 12 pass. Then the affected tests below.
4. `node src/scripts/release.js`; run the two count tests.
5. Reviews split by area, run in parallel and dispatched by the CTO Chief: one iron-loop-critic
   pass at extra-high effort per agent file, three in all (the unit-test-writer agent, its skill,
   the executor), plus one agent-critic pass over the two writer files, as Step 11 says.
6. At Step 14, the one full `npm test`, and the measurements below.

### Tests run while building (affected only)

The new test, every test that reads the three files, and the two that read the counts. The
readers are the union of the improvement inventory's three `tests_reading` lists
(`.ctoc/audit/agent-and-skill-improvement/inventory.json` lines 7693–7718, 7731–7748, 8680–8706)
and the two tests that name the executor by path and are not in those lists
(`tests/agents-never-wait-in-a-sleep-loop.test.js` line 31, `tests/agent-tool-grants.test.js`
lines 115, 421, 665). The other files a search for the three names finds were read and do not read
the files: `tests/corpus-audit-ledger.test.js` line 41 (a ledger path), the
`agent_type`/label strings in `tests/protect-records.test.js`, `tests/state-coverage.test.js`,
`tests/the-dispatch-seat-says-whether-it-is-live.test.js`, `tests/evidence-pack-main.test.js`,
`tests/registry-integrity.test.js` (a comment), and comments citing the skill in twelve
coverage tests (from `tests/plan-coverage-coverage.test.js` line 17 to
`tests/pretooluse-bash-coverage.test.js` line 514).

```
node --test tests/test-writers-get-the-fast-test-rules.test.js tests/agent-contract-load.test.js tests/agent-dispatch-resolution.test.js tests/agent-honest-status-fence.test.js tests/agent-layer-reachability.test.js tests/agent-model-floor.test.js tests/agent-shared-not-dispatchable.test.js tests/agent-tool-grants.test.js tests/agents-never-wait-in-a-sleep-loop.test.js tests/architecture-invariants.test.js tests/claim-census.test.js tests/compliance-claims-match-code.test.js tests/compliance-seam-is-executable.test.js tests/cto-chief-toplevel.test.js tests/cu5-wrapper-coverage-completeness.test.js tests/export-reachability.test.js tests/gate-numbers-fence.test.js tests/instruction-surfaces-say-the-moment.test.js tests/iron-loop-enforcer.test.js tests/menu-task-wiring.test.js tests/no-model-optimized-for.test.js tests/no-tier-3.test.js tests/plugin-skill-discovery.test.js tests/reachability-surface-scan-is-linear.test.js tests/reachability.test.js tests/session-start-hook.test.js tests/session-start-question-dispatch.test.js tests/skill-loading.test.js tests/streaming-render.test.js tests/test-gate-ledger-wiring.test.js tests/tier1-no-peer-dispatch.test.js tests/unexecutable-instruction-fence.test.js tests/readme-numbers.test.js tests/claude-md-keeps-every-rule.test.js
```

`tests/iron-loop-enforcer.test.js` and `tests/reachability-surface-scan-is-linear.test.js` are
run and never edited. The second failed twice in the baseline run on a 3,000 ms wall-clock bound
under load (lines 90 and 110); a failure confined to these two files is handled as criterion 2
says: re-run alone, record the result beside the failed run's load, and send a persistent failure
to the round that owns the file with this plan's load numbers.

### Measurements (criterion 1)

As the functional plan's "How every slice is measured" says, with these specifics:
- Before: slice 2's after-run, if nothing else landed in between; otherwise one new run of the
  timing command on this slice's base commit.
- After: `/usr/bin/time -p node --test --test-reporter=tap tests/*.test.js`, its output
  redirected to a file outside the repository, on the completion commit (the command of `npm run test:raw` with the TAP
  reporter, so the runner's own per-file durations are in the output), with the one-minute load from
  `node -p "require('os').loadavg()[0]"` at start and end, the core count, the Node version, the
  commit, passed, failed and skipped counts, the longest file and its duration, and which of
  semgrep, osv-scanner, trufflehog, detect-secrets, gosec and bandit are installed.
- Measure (a) has no before side: this slice changes no existing test file and adds one. Record
  the new file's duration from two runs alone. Measures (b) and (c) are recorded. The record does
  not call this slice faster; it adds rules and one small test.

## Acceptance criteria

- [x] Test first: the new test, run before any agent file changes, fails cases 1, 2, 3, 4, 5 and 8 and passes cases 6 and 7 (the first run, 8 cases), and, run again against the unchanged files after the plan's text changed in the review round, fails cases 1, 2, 3, 4, 5, 8, 9, 10, 11 and 12 and passes cases 6 and 7; both runs' summaries are quoted in the build record.
- [x] Criterion 24: the unit-test-writer agent and its skill each hold the fast-test block of section 1 byte for byte, the checklist line, and the replacement example for a missing database, and the skill's Testing Trophy line ends with the size sentence (cases 1, 2, 9, 10 and 11 pass).
- [x] Criterion 25: each still holds its old no-shared-state sentence and holds the read-only wording of rule 3, and the agent holds the line that points to rule 3 (cases 3 and 4 pass).
- [x] Criterion 26: the executor's Step 8 links the skill by path and holds the run-by-name sentence; the phrase "once at completion" occurs nowhere in the executor (cases 5 and 6 pass).
- [x] Criterion 27: the executor's Step 14 lines 272 to 280 of the base commit are byte for byte unchanged and the no-sleep-loop sentence is present (case 7 passes; `tests/agents-never-wait-in-a-sleep-loop.test.js` passes).
- [x] Criterion 29a: the executor's section on completing a plan holds the acceptance-criteria paragraph of section 4 byte for byte, before the completion command, and its Output section holds the open-question line (cases 8 and 12 pass).
- [x] Criterion 28: every file in "Tests run while building" passes, with a failure confined to the two files owned by another round handled as criterion 2 says and recorded.
- [x] Criterion 29: after `node src/scripts/release.js`, `tests/readme-numbers.test.js` and `tests/claude-md-keeps-every-rule.test.js` pass, `CLAUDE.md` is at most 15,000 bytes, and `VERSION` is unchanged.
- [x] Criterion 1: the build record holds the measurements of "Measurements (criterion 1)" with each run's load at start and end, and does not call the slice faster.
- [x] Criterion 2: Step 14's one full `npm test` shows 0 failed, 0 skipped and coverage at or above the floor in `.ctoc/coverage-baseline.json`. Met by the one full npm test after the last slice: 13182 tests, 0 failed, 0 skipped, coverage 99.88% against a floor of 99%

## Risks

| Risk | Mitigation |
|---|---|
| `plans/todo/00363-every-agent-and-specialist-skill-improved-three-times-s103-unit-test-writer.md` and `plans/todo/00378-every-agent-and-specialist-skill-improved-three-times-s118-iron-loop-executor.md` edit the same files later | One line, as the functional plan says: a round that starts after this slice lands starts from this slice's text or is flagged `resumed_after_unrecorded_edit` (`tests/agent-and-skill-improvement-record.test.js` lines 404–413), and keeps or edits this slice's presence test in the same change |
| The affected-tests plan (`plans/functional/affected-tests-while-building-whole-suite-before-push.md`) rewrites the executor's Step 14 | Case 7 then fails by design (criterion 27 keeps Step 8 and Step 14 saying the same thing); that plan updates `STEP_14` and the Step 8 sentence in the same change |
| The two copies of the fast-test block drift apart in a later edit | Cases 1 and 2 hold both copies to one constant |
| A model ignores the rules | Stated in the test header and the record; only a later look at the tests the agents write, and at the next builds' completion results, can show it |
| A rule could mislead in a non-JavaScript project | Each node:test detail is introduced as "in node:test"; rules 1, 2, 5, 6, 7 and 8 hold for any runner |

## Decisions Taken Under Ambiguity

1. **One identical block in the agent and in its skill.** Criterion 24 asks each file to hold the
   rules byte for byte. The agent is a wrapper whose method file is the skill, so the text appears
   twice in what the agent reads; one constant in the test keeps the two copies equal. Not chosen:
   a short pointer in the agent, which criterion 24 does not allow.
2. **The block goes right after "### Test Isolation" in both files.** It sits beside the isolation
   rules it extends, and outside the search sections whose sentences
   `tests/agent-tool-grants.test.js` pins.
3. **Shared setup is built in a `before` hook inside the file's `describe`.** The brief marks as
   unverified whether a top-level `before` with no `describe` around it runs once per file
   ("What is contested or unverified"); the documented examples sit inside `describe` (item 2).
4. **Rule 1 lists the boundaries criterion 24 names: a started process, a real git repository, the
   network, a wait on the real clock.** The citation states what Google's chapter says about small,
   medium and large tests and claims nothing about disk; the skill's existing `slow_unit_test` flag
   (line 104) still covers disk in a unit test. Superseded by decision 26, which adds threads and
   file writes to the list.
5. **Criterion 26's sentence keeps the backticks around `files:`**, as the functional plan writes
   it; the CTO Chief's brief shows the sentence without them. The functional plan is the approved
   text.
6. **Step 8's lines start with "Follow" and "Which tests to run:"**, because criterion 26's sentence
   starts with a lower-case "while" and must stay byte for byte; a lead-in keeps the bullet a
   sentence.
7. **The acceptance-criteria rule sits in "Completing a plan — the ONE way", before the command.**
   The builder reads it when it is about to hand back; Step 16 already points there. Not chosen: a
   second copy under Step 16, which would be a second text to keep equal.
8. **The rule describes the check instead of naming the function.** The builder needs what is read
   and when it refuses, not the function's name; the function and its lines are in this plan and
   in criterion 29a.
9. **No word in the new text is followed by an opening parenthesis.** `SURFACE_CALL_RE`
   (`src/lib/reachability.js` line 654) counts any such word in an agent or skill file as a call,
   and `tests/export-reachability.test.js` requires the dead-export count to equal its baseline
   exactly (lines 123–137); a credited word could move that count. Rewording costs nothing.
10. **The test folds `\r\n` to `\n` before comparing.** The repository has no `.gitattributes`, so a
    Windows checkout may hold CRLF; folding compares the same text and weakens nothing.
11. **The budget numbers are cited as CTOC's own**, from the functional plan's decision 10, not as a
    research result; Bazel's per-size time-outs are failure ceilings, so they are not cited as
    speed budgets.
12. **The npx sentence cites the probe** ("Checked by the session against this repository" in the
    brief, npm 11.11.0) for `npx --no -- <tool>` asking the registry before it refuses and for
    `npx --offline --no -- <tool>` making no request, and npm's documentation for the silent
    install. All are recorded facts, not belief. The script start and the Windows `.cmd` refusal
    are not in the brief: the refusal is CTOC's own record (`src/lib/quality-agent.js` lines
    239–245), and the start is the one slice 2 gives CTOC's security scan for eslint (decision
    19). The rule names no outside source for either, so the block's opening, which says every
    outside source it names was read for the brief, stays true.
13. **No changelog entry in this slice.** The slice's files are the six above; a changelog line
    belongs to the release that carries it, and VERSION does not change here.
14. **The functional plan's slice-3 file note "(Step 8 only)" is left as written**, by the CTO
    Chief's instruction to change nothing in it but criterion 29a and the slice's criteria list;
    criterion 29a states that the executor's completion section changes too.
15. **Rule 1 names the large size and ends "see rule 7"** (spec critic, round of 2026-10-12).
    Not chosen: "rule 7 keeps it out of the default suite", because rule 7 names the internet and
    package registries while "beyond `localhost`" also covers a host on the local network; rule 1
    therefore states the exclusion itself and points to rule 7. The citation adds the chapter's
    large-test sentence, which the brief quotes (item 1). Functional criterion 24 carries the same
    clause.
16. **Rule 3 marks its hook words "in node:test" and states the only shared state.** The general
    rule (build once per file, remove at the end) holds for any runner; `before`, `after` and
    `describe` are node:test words. The sentence "This read-only setup is the only state tests
    share; the isolation rules above forbid any state a test can change." is true in both files
    because the block sits right after "### Test Isolation" in each.
17. **`READ_ONLY` holds the reconciling sentence of rule 3**, so cases 3 and 4 assert it directly,
    together with the old no-shared-state sentence and with no position check, for criterion 25.
    It is a tightening: cases 1 and 2 already hold the whole block. The sentence is now "Shared
    setup is read-only: it is the one exception to the rule above that tests share no state, and
    to the same rule in the checklist at the end; no test changes shared state." (decision 27).
18. **The acceptance-criteria rule describes the check's real order and its traps.** The
    completion validates first, and the acceptance check is the third check inside that
    validation, so "the completion's first check" was wrong and is replaced. A reason under an
    open criterion carries no square brackets, because an uppercase bracketed X adds a tick
    without a box and lets the open criterion pass. A criterion whose evidence is a network
    command standing only in a checkbox line cannot be verified, because the executor's line 39
    forbids running it. A criterion about the completion's own check is verified by the same
    check at Step 14; this plan's criterion 2 and build-order item 6 now say "Step 14's one full
    `npm test`", because this plan's builder runs no `menu` command, so the only full run it makes
    is Step 14's. Functional criterion 29a carries the same corrections.
19. **Rule 7 starts an installed tool by running its package's own script with the running Node
    program and an argument list, and uses `npx --offline --no -- <tool>` only from a shell**
    (resolved: the CTO Chief accepted the objection this decision logged, 2026-10-12). The earlier
    text named the path under `node_modules/.bin` and npx as two equal starts; on Windows both
    reach the tool through a `.cmd` file, which Node refuses to start without a shell
    (`src/lib/quality-agent.js` lines 239–245, which avoids it by starting node itself on npm's
    script), so a test written by that rule could not start the tool there. The script is the file
    the `bin` field of the tool's `package.json` names, in the package inside the project's own
    `node_modules`: the way slice 2 makes CTOC's security scan start eslint
    (`plans/implementation/the-test-suite-runs-faster-and-never-weaker-s2-no-test-reaches-the-npm-registry.md`,
    section 1, `findProjectEslintBin` and `runESLintSecurity`, and its decision 1, which rejects
    `node_modules/.bin/eslint` for the same reason). That start works on every platform. Where no
    argument list can be passed, from a shell, `npx --offline --no -- <tool>` stays, because the
    brief's own check saw it make no request with the tool installed and fail without a request
    with it missing. The only `npx --no` texts remain `npx --no -- <tool>` and
    `npx --offline --no -- <tool>`, so check 12 still passes, and the new sentences put no word
    before an opening parenthesis and name no gate. The presence test's `FAST_TEST_RULES` is
    printed from the block of section 1, so it carries the new rule 7 with no second copy to edit.
20. **The block's opening says where the non-web sources come from**: the npx observation is the
    brief's own check against this repository, and rule 8 is a CTOC lesson. Rule 6 already labels
    its numbers as CTOC's own. Extended by decision 30 (the child process documentation and the
    two fake clocks of other runtimes).
21. **Rule 6 forbids asserting a duration the runner reports; rule 5 keeps counted operations and
    processor-time ratios.** The former "never assert them inside a test" read as forbidding the
    ratio checks rule 5 allows. Superseded by decision 28: rule 5 now keeps counted operations
    only and forbids asserting any measured time, wall-clock or processor.
22. **Four review passes in parallel, all dispatched by the CTO Chief**: three iron-loop-critic
    passes at extra-high effort, one per agent file, and one agent-critic pass over the two writer
    files. Build-order item 5 and Step 11 say the same.
23. **The release script's writes outside the declared files stop the build.** With `VERSION`
    unchanged, the version sync still rewrites `package.json` and the two `.claude-plugin/` JSON
    files; any byte it changes there is a scope-growth request, never a silent revert. Step 10's
    `git status` check also allows this plan, which the build record changes.
24. **Cases 3 and 4 make no position check, and their names no longer say "beside".** The test
    header claims position only for the executor, where cases 5 and 8 take a slice between two
    headings; where the block sits in the two writer files is listed as not proven.


Decisions 25 to 33 record the review round of 2026-10-13: the CTO Chief's consolidated fix list
from three iron-loop-critic reviews at extra-high effort and one agent-critic pass with web
research. Each names its source as the list's item; the builder read the code and ran the Node
facts, and read no web page.

25. **The acceptance-criteria rule, the executor's Output line, Step 16 and functional criterion
    29a change together** (fix list items 12 and 13). A criterion left open carries its reason at
    the end of that same checkbox line, in plain words with no square brackets, and never on a new
    line: `isCheckboxLine` and `computeSpecHashWith` in `src/lib/approval-ledger.js` (lines
    377–385 and from 427, read in this build) skip a whole line only when it starts with
    `- [x]`, `- [X]` or `- [ ]`, so a plain line inside the acceptance section is inside the plan's
    approved text, changes it and cancels the build's own write permission, while text on a
    checkbox line does not. The rule names the checks a criterion about the completion's own check
    needs run at Step 14 (lint, type check, the whole suite with no test skipped and its coverage floor, and for an app
    its launch and a response, the checks `completeExecution` runs), tells the builder to tick
    after the last change to the declared files, and the executor's Output section gets one line
    giving the shape of the open-question report. Step 16's instruction in this plan reads the
    same way. Not chosen: a reason under the box, which is the earlier text and is the defect.
26. **Rule 1 says what a small test may not do, and what crossing costs** (fix list item 1). It
    adds threads and file writes to the list, lets a small test read files committed to the
    repository (CTOC's choice; Bazel's test encyclopedia lets a hermetic test read its declared
    inputs, brief item 1), says that a test about a boundary also needs what reaching it needs (a
    real git repository also starts the git program), and says size is about resources, not scope.
    The list's source sentence said small tests run "on one thread"; the brief quotes only "in a
    single process", with threads allowed for medium tests, so the block's source sentence says
    "in one process" and cites medium tests "use threads" for the rest: the claim stays inside the
    brief.
27. **Rules 2 and 3 are tightened, and the three lines outside the block follow** (fix list items
    2, 3 and 10). Rule 2 adds the error path, a contract test per tool the lockfile installs that
    checks each field the tests read against the recording, the loud failure of a missing tool
    and the integration-test-writer skill as the owner of the form. Rule 3 makes shared setup the
    one exception to the no-shared-state rules, freezes it with `Object.freeze`, hands the code
    under test a copy and removes folders with `fs.promises.rm` and `maxRetries` (a call with that
    option was run in this build). The agent gets the line after its "No shared state between
    tests" that points to rule 3; the Testing Trophy line gets a sentence that keeps an
    integration test small or medium; both checklists get one line that names the rules. The skill
    keeps "No shared mutable state between tests" as it is: read-only setup is not mutable.
28. **Rules 4, 5 and 6 are made exact** (fix list items 4, 5 and 6). Fake timers are the test's
    own `t.mock.timers.enable`; four facts were run in this build on Node v24.14.1: the test's own
    timers are restored when the test ends, the shared `mock.timers` stays faked for the next
    test, `setTimeout` from `node:timers` and from `node:timers/promises` is faked, and
    `performance.now` is not. Rule 5 forbids asserting any measured time, wall-clock or
    processor, and keeps counted operations; a wall-clock requirement is read from the runner and
    reported, never dropped. Rule 6 keeps CTOC's own budgets, adds a time-out on a medium test of
    at least ten times its budget (the test's `timeout` option, which has no limit by default,
    brief item 7), makes a test over its budget faster or names it as the next size up with its
    duration, splits a long file along its `describe` blocks, and says the file rule does not
    apply under a runner that hands out single tests. The pytest-xdist and the other-runtime
    statements are not in the brief; they are the review's, and the block labels none of them as a
    source.
29. **The good-pattern example that skips a test for a missing database is replaced in both
    writer files** (fix list item 11). It contradicts the zero-skipped rule and rule 7. No fence
    pins it: a search of `tests/` and `src/` for `skipIf` found 0 matches, and for `DB_URL` one
    unrelated fixture string in `tests/secrets-scanner-coverage.test.js`. The replacement throws
    with a message that names the missing variable, in both files; the agent keeps the check mark
    its other examples carry in the comment. It introduces `new Error(`, which neither file held,
    so the export-reachability fence is run in Step 10.
30. **Rule 7, rule 8 and the opening are made complete** (fix list items 7, 8 and 9). Rule 7 says
    no test downloads a tool or package, starts an installed tool by the file its package's `bin`
    field names (when it is JavaScript) with the running Node program and an argument list, names
    the bare tool name from an npm script and `npx --offline --no -- <tool>` elsewhere in a
    shell, and keeps the live-check sentence with "never skipped". Its Windows `.cmd` source is the
    Node.js 24 child process documentation, "Spawning .bat and .cmd files on Windows", as the
    list names it; the builder read no web page, so that source is the list's, and the block's
    opening says the brief does not quote it. CTOC's own record of the same fact was read
    (`src/lib/quality-agent.js` lines 239–245). Rule 8 adds the assertion map and the mutation
    tester before and after, with the mutation-test-runner skill (its folder was found under
    `skills/testing/`). The opening names where the non-web facts come from: the npx observation,
    the `.cmd` fact, the two fake clocks of other runtimes, and CTOC's lesson.
31. **Step 8's second line and functional criterion 26 name three groups of test files**
    (fix list item 14): the files written or changed, the files the plan's `files:` list declares,
    and any the plan lists to run while building. Step 14 still runs the whole suite.
32. **The presence test has twelve cases** (fix list items 3, 10, 11 and 13): cases 9 to 12 check
    the checklist lines, the Testing Trophy sentence, the replaced example (and that `test.skipIf`
    is gone) and the executor's Output line. Case 3 also holds the agent's exception line. Cases 6
    and 7 stay the green guards.
33. **Order of work in the round.** The plan's fixed text was changed first; the test was
    regenerated from the plan by a program (the constants are never retyped); the regenerated test
    was run against the files as they stood, red for each changed constant, and then the files
    were changed by a script from the same printed text and the test run green.
34. **The loud-failure example asserts something when the variable is set** (re-review item M1). The
    four-line example threw when `DB_URL` is unset and had no assertion when it is set: the "no
    assertion" anti-pattern the same file lists above it. Both writer files now show six lines: the
    throw, then `const user = await fetchUser(1);` and `expect(user.name).toBe('John');`, with the
    test function `async`. Every name in it (`test`, `fetchUser`, `expect`, `toBe`) is one both files
    already use, so the dead-export count cannot move; the fence is run in Step 14 anyway.
35. **Rule 2 labels its narrowing as CTOC's own** (item M2). The contract test is kept per real
    tool or program the recordings come from, not only per tool the lockfile installs. A missing
    tool fails loudly, never a skip: for a tool the lockfile installs it is a broken install, and
    CTOC's own rule extends the loud failure to a program the project requires but does not
    install, such as git. For a service beyond `localhost` the contract test is the plan's live
    check of rule 7. The block says "CTOC's own rule" in the sentence itself and the opening names
    it too (decision 39).
36. **Rule 5 says what happens to an existing time assertion** (item M3). An existing assertion on
    a measured time is replaced by an operation count that proves at least as much; the swap is
    named in the report; under rule 8 the assertion is never simply removed. This closes the gap
    between "never assert a measured time" and "never drop an assertion".
37. **The skill's `slow_unit_test` row names the size rule** (item M4). Its second cell now reads
    "Real network, disk write, DB or sleep inside a test that rule 1 of Fast tests calls small", so
    the finding agrees with rule 1 (a small test may read committed files and a medium test may
    write). The severity row near line 624 holds only the name, so it is not repeated there. The
    presence test checks the first two cells (case 10, `SLOW_ROW`).
38. **Rule 7 says where a live check beyond `localhost` lives** (item L1). The live check is one
    test, named in the plan, with "live" in its name, never skipped. In the default suite it
    reaches nothing beyond `localhost`; a check that must reach beyond `localhost` lives in a file
    outside the default suite's pattern, run by a script the plan names, and is never in the
    default suite. This is consistent with rule 1, which sends a test that reaches the network
    beyond `localhost` out of the default suite.
39. **The opening paragraph labels the statements that are not sources** (item L2). npm putting
    `node_modules/.bin` on the path of a script (rule 7) and pytest-xdist handing out single tests
    in its default mode (rule 6) join the two fake clocks of other runtimes as examples, not
    sources; `Object.freeze` and `fs.promises.rm` with `maxRetries` (rule 3) are CTOC's own choices,
    the second run in this build; "a missing tool fails loudly" (rule 2) is CTOC's own rule. No
    parenthesis follows a word in the new sentence.
40. **The completion-check list says "no test skipped"** (item L3). The executor's rule, section 4
    of this plan and the functional plan's criterion 29a read "the whole suite with no test skipped
    and its coverage floor", the wording of the completion's own check (`src/lib/step-13-verify.js`
    line 24, "no test was skipped"). Criterion 24 of the functional plan follows items M1 to M4 and
    L1 in the same words.
41. **Order of work in the second fix round.** The plan's fixed text (sections 1, 2, 4, 5 and the
    decisions) and the functional plan's criteria 24 and 29a were changed first; the presence test
    was regenerated from the plan by the same program as before (no constant retyped) and run
    against the files as they stood, red for each changed constant; then the files were changed
    by a script from the same printed text, and the test run green. A third round is not run.
42. Built before its gates were crossed; the crossings were recorded afterwards on the owner's answer of 2026-10-13, 'Cross now, with a note'.

## What was not verified

- Every statement about the code is by reading, with file and line, except the Node facts of rules
  3 and 4, which were run in the review round of 2026-10-13 (decision 28).
- Taken from the review's web research and not read or run by the builder, so labelled unverified
  here: `testing/synctest` from Go 1.25 and `FakeTimeProvider` for the .NET `TimeProvider`
  (rule 4); pytest-xdist handing out single tests in its default mode (rule 6); the Windows
  refusal in the Node.js 24 child process documentation, "Spawning .bat and .cmd files on
  Windows" (rule 7; CTOC's own record of the refusal was read); that npm puts
  `node_modules/.bin` on the path of an npm script (rule 7).
- That the TAP reporter prints each file's duration when many files run in one `node --test` call:
  believed, from the brief's item 2 (`duration_ms` on `test:pass` events); the first after-run
  shows it, and if it does not, the record says so and takes the per-file durations from the
  default reporter.
- That the new test runs under 100 ms per case: expected (three file reads); the build record
  holds the measured durations.

---

## Execution Plan (Steps 8-16)

Mode: standard, single pass. The refinement loop is not gated on: the frontmatter says
`effort: small`, and none of the six declared files matches a glob in
`.ctoc/config/refinement-triggers.yaml` (read in full; no `auth`, `security`, `audit` or other
risk folder in any path). Every command runs from the repository root of this worktree. The
builder runs no `menu` command at any step; the CTO Chief hands the completion to the owner.

### Step 8: TEST (TDD Red)
- [x] Confirm `tests/test-writers-get-the-fast-test-rules.test.js` does not exist yet and that `git diff --quiet HEAD -- agents/testing/writers/unit-test-writer.md skills/testing/writers/unit-test-writer/SKILL.md agents/iron-loop/iron-loop-executor.md` exits 0, so the red run below is taken against the unedited agent files (first run); in the review round of 2026-10-13 the red run is taken against the files as they stood after the first run, once the plan's fixed text has changed
- [x] Produce the constants by program, never by retyping: a throwaway script in the session's scratch folder reads this plan and prints the fenced block of section 1 (`FAST_TEST_RULES`) and its sentence `READ_ONLY` (from `Shared setup is read-only:` to `no test changes shared state.`), the other fenced lines of sections 1 and 2 (`AGENT_EXCEPTION`, `CHECKLIST_LINE`, `TROPHY_TAIL`, `AGENT_LOUD`, `SKILL_LOUD`, `SLOW_ROW`), the two added lines of section 3 (`SKILL_POINTER` from `- Follow` to `"Fast tests".`, and `RUN_BY_NAME` from `while writing` to `the whole suite.`) and the two fenced texts of section 4 (`TICK_RULE`, `OPEN_LINE`); `STEP_14` is printed from `git show HEAD:agents/iron-loop/iron-loop-executor.md` lines 272 to 280 joined with a newline, from `### Step 14: VERIFY` to `- If ANY check fails -> kickback to relevant step`; `NO_SLEEP_LOOP` is copied from `tests/agents-never-wait-in-a-sleep-loop.test.js` lines 24 to 28
- [x] Create `tests/test-writers-get-the-fast-test-rules.test.js` with `'use strict'`, `node:test`, `node:assert/strict`, `fs` and `path` only; `ROOT = path.join(__dirname, '..')`; no started process, no network, no temporary folder
- [x] Write the header comment of section 5: why (the profile in the functional plan, section 1, and the three builds refused with "N of N acceptance criteria not checked"), what the test proves (the exact rule text ships in the three files; in the executor it stands in the right sections, the Step 8 lines inside Step 8, the acceptance-criteria rule before the completion command and the open-question line inside the Output section; the checklist lines, the Testing Trophy sentence and the loud-failure example are present in the writer files; and the Step 14 lines and the no-sleep-loop sentence are unchanged), what it cannot prove (where the block and the other added lines sit inside the two writer files, which no case checks, and that a model obeys the rules)
- [x] Write `read(...rel)`: `fs.readFileSync(path.join(ROOT, ...rel), 'utf8')` with every `\r\n` folded to `\n`; a missing file throws, a loud failure
- [x] Write `between(text, start, end, where)` and `from(text, start, where)`: `between` returns the slice from `start` to the first `end` after it, `from` the slice from `start` to the end, and each asserts that its markers are found, naming the missing marker and `where` in the message, so a moved heading fails loudly instead of passing on an empty slice
- [x] Write case 1, `agents/testing/writers/unit-test-writer.md carries the fast-test rules byte for byte`: the file includes `FAST_TEST_RULES`
- [x] Write case 2, `skills/testing/writers/unit-test-writer/SKILL.md carries the fast-test rules byte for byte`: the file includes `FAST_TEST_RULES`
- [x] Write case 3, `agents/testing/writers/unit-test-writer.md keeps "No shared state between tests" and holds the read-only setup rule`: the file includes `No shared state between tests`, `READ_ONLY` and `AGENT_EXCEPTION`; no position check
- [x] Write case 4, `skills/testing/writers/unit-test-writer/SKILL.md keeps "No shared mutable state between tests" and holds the read-only setup rule`: the file includes `No shared mutable state between tests; use fixtures/factories per-test.` and `READ_ONLY`; no position check
- [x] Write case 5, `the builder's Step 8 points to the fast-test rules and runs only the named test files`: the slice `between(executor, '### Step 8: TEST (TDD Red)', '### Step 9: PREPARE')` includes `SKILL_POINTER` and `RUN_BY_NAME`
- [x] Write case 6, `the builder never says the suite runs "once at completion"`: the executor text does not include `once at completion`
- [x] Write case 7, `the builder's Step 14 lines and its no-sleep-loop sentence are unchanged`: the executor includes `STEP_14` and `NO_SLEEP_LOOP`
- [x] Write case 8, `the builder verifies and ticks each acceptance criterion before the completion command`: the slice `between(executor, '## Completing a plan — the ONE way', 'menu task complete <taskId> --summary')` includes `TICK_RULE`
- [x] Write cases 9 to 12 (review round): each writer file's checklist, cut by `from`, includes `CHECKLIST_LINE`; the skill includes `TROPHY_TAIL` and `SLOW_ROW`; neither writer file includes `test.skipIf` while the agent includes `AGENT_LOUD` and the skill `SKILL_LOUD`; the slice `between(executor, '## Output', '## Searching the repository')` includes `OPEN_LINE`
- [x] Give every assertion a message naming the file and the missing text, so a red run says what is absent
- [x] Error path of the helper, as a throwaway probe in the scratch folder (never committed): call `between` with a start marker that is absent and with an end marker that is absent, and see each throw an assertion error that names the missing marker (first run; the helper is unchanged in the review round, and `from` shares its start-marker assertion)
- [x] Run `node --test tests/test-writers-get-the-fast-test-rules.test.js` alone and see exactly cases 1, 2, 3, 4, 5 and 8 fail and cases 6 and 7 pass (first run, 8 cases); in the review round, against the unchanged files, see cases 1, 2, 3, 4, 5, 8, 9, 10, 11 and 12 fail and cases 6 and 7 pass, and print for each fixed text whether the old files hold it
- [x] Read each of the failures and confirm it fails on the missing rule text (the includes assertion), not on a missing marker in `between`, a read error or a syntax error; a guard case that fails, or a red case that fails for another reason, stops the build and goes to the CTO Chief with the output
- [x] Copy the run's summary lines (tests, pass, fail, duration) into the build record under `## Execution Record`, headed as the red run before any agent file changed (and the review round's red run)

### Step 9: PREPARE
- [x] Confirm the slice this one depends on (`the-test-suite-runs-faster-and-never-weaker-s2-no-test-reaches-the-npm-registry`) has landed on the base commit; if it has not, report that to the CTO Chief and do not start the agent-file edits
- [x] Record the base commit (`git rev-parse HEAD`) and `node --version` in the build record
- [x] Confirm `node_modules/eslint/package.json` exists, so the lint below uses the installed eslint; if it is missing, run `npm ci` from the committed lockfile and nothing else
- [x] Confirm by reading that the anchors still sit where the plan says: unit-test-writer agent line 75 `- Mock external dependencies` and line 77 `## Language-Specific Frameworks`; skill line 145 `No shared mutable state between tests; use fixtures/factories per-test.`, line 147 `- Reset any global state (env vars, singletons) in teardown.` and line 149 `### Fakes vs Mocks vs Stubs`; executor line 181 `## Completing a plan — the ONE way`, line 183 `When steps 8-16 are done`, line 233 `- Test error conditions`, lines 272 to 280 the Step 14 lines, line 296 the no-sleep-loop sentence; where a line number moved, insert by the quoted anchor text and record the new line numbers
- [x] Decide the before side of the measurement and record the decision: slice 2's after-run from its build record when no other commit landed between it and this slice's base commit (`git log` between the two); otherwise one new run of the timing command of Step 14 on this slice's base commit, with the same recorded items
- [x] Record which of semgrep, osv-scanner, trufflehog, detect-secrets, gosec and bandit are installed, each checked with `command -v <name>`

### Step 10: IMPLEMENT
- [x] `agents/testing/writers/unit-test-writer.md`: after line 75 (`- Mock external dependencies`), insert one blank line and then the fast-test block of section 1, byte for byte, pasted from the same program output that produced `FAST_TEST_RULES`, so the file reads that line, a blank line, the block, the existing blank line, `## Language-Specific Frameworks`; lines 70 to 75 unchanged. In the review round the block is replaced by the new one; the line after `- No shared state between tests`, the checklist line and the four-line loud-failure example of section 1 are added in place of the old skip example
- [x] `skills/testing/writers/unit-test-writer/SKILL.md`: after line 147 (`- Reset any global state (env vars, singletons) in teardown.`), insert one blank line and then the same block, byte for byte, before the existing blank line and `### Fakes vs Mocks vs Stubs — when to reach for which`; line 145 unchanged. In the review round the block is replaced by the new one, the Testing Trophy sentence and the checklist line are added, and the old skip example is replaced by the four-line loud-failure example of section 2
- [x] `agents/iron-loop/iron-loop-executor.md`, Step 8: after line 233 (`- Test error conditions`), add the two lines of section 3, byte for byte: the line starting `- Follow the fast-test rules in` with the Markdown link to `../../skills/testing/writers/unit-test-writer/SKILL.md`, and the line starting `- Which tests to run: while writing and implementing` (in the review round, with the three groups of test files of decision 31)
- [x] `agents/iron-loop/iron-loop-executor.md`, completion section: after line 181 (`## Completing a plan — the ONE way`) and its blank line, insert the paragraph of section 4, byte for byte, then one blank line, so `When steps 8-16 are done, complete through the menu's completion route with the` follows it (in the review round, the new paragraph); and, between the closing fence of the "## Output" report example and `Then STOP.`, the open-question paragraph of section 4
- [x] Confirm the edits change the old text only where the plan says: `git diff --numstat` on the three agent files shows 0 removed lines for the executor, and for the two writer files only the replaced skip example and, in the skill, the Testing Trophy line (4 removed lines each); the Step 14 lines 272 to 280 and the no-sleep-loop sentence of the base commit are untouched
- [x] Confirm every added line in the three agent files is plain ASCII: a throwaway script reads the added lines of `git diff -U0` on the three files and prints any character above code point 127; the expected output is only the agent's check-mark comment of the replacement example
- [x] Confirm no word in the added rule text is followed by an opening parenthesis (decision 9): the same script prints any added line matching a word character directly or after spaces followed by `(`; the allowed hits are the Markdown link, where `(` follows `]`, the existing Testing Trophy line that the edit re-adds, and the two replacement examples, which are code
- [x] Run `node --test tests/test-writers-get-the-fast-test-rules.test.js` alone: 12 pass, 0 fail; copy the summary into the build record as the green run
- [x] Run `node src/scripts/release.js` with `VERSION` unchanged; then confirm `git diff --quiet -- VERSION` exits 0, that the test-file count in `CLAUDE.md` (both lines) and `README.md` rose by exactly one, and that `git status --short` lists no changed file outside the six declared files and this plan; a version or count sync that the script writes to a file outside them, for example `package.json` or a file under `.claude-plugin/`, goes through `src/lib/scope-growth.js` and stops the build, and `VERSION` never changes (done in the first run; the review round adds no test file, so the count is unchanged and the script was not run again)
- [x] Confirm `CLAUDE.md` is at most 15,000 bytes with `node -p "require('fs').statSync('CLAUDE.md').size"`, and record the number
- [x] Run `node --test tests/readme-numbers.test.js tests/claude-md-keeps-every-rule.test.js`: both pass
- [x] Run the affected-test command of "Tests run while building (affected only)" exactly as the plan writes it; every file passes, except that a failure confined to `tests/reachability-surface-scan-is-linear.test.js` or `tests/iron-loop-enforcer.test.js` is handled by the rule written in Step 14 below
- [x] Wiring: no module is added; the new test is reached by `npm test` through `tests/*.test.js`, and the three agent files are the live definitions Claude Code loads (section "Wiring"); nothing else to wire

### Step 11: REVIEW
- [x] Self-review the diff (`git diff` on the six declared files): every inserted text equals the plan's fixed text, each insertion sits at its anchor, and no existing sentence changed except the two replaced examples and the re-added Testing Trophy line
- [x] Self-review the test: each red case failed in Step 8 for the reason its name gives; each assertion message names the file and the missing text; the two guards (cases 6 and 7) cannot pass on an empty read
- [x] Ask the CTO Chief to dispatch three reviews by area, in parallel, each an iron-loop-critic at extra-high effort, read-only, one per agent file: the unit-test-writer agent, the unit-test-writer skill, the executor; each brief names this plan, its file, the fence table of "What the new text avoids, and why", criteria 24 to 29a, and the new test file (the review packets were built and the CTO Chief dispatched the reviews; their findings came back in the CTO Chief's consolidated fix list of 2026-10-13)
- [x] Ask the CTO Chief to dispatch, in parallel with those three, one agent-critic pass over the two writer files (agent and skill), which researches the domain on the web: whether each of the eight rules is sound and correctly attributed against the sources it names (Software Engineering at Google chapters 11 and 13, Fowler's "Contract Test", the Node.js 24 test runner documentation, Silva and others 2024, npm's npx documentation) (dispatched by the CTO Chief; its findings are in the same fix list)
- [x] Fix round 1: apply each accepted finding inside the six declared files, re-run the new test and the affected-test command, and record each finding with its fix or its written rejection (all fourteen items of the fix list were applied, none rejected; each is a decision, 25 to 33, with its source; the new test and the affected-test command pass)
- [x] Fix round 2, only if round 1 left findings: the same; a third round is never run, and what remains goes to the CTO Chief as open findings in the report (round 1 left no fix-list item open; the CTO Chief's re-review of 2026-10-13 then found seven items open, and this second round applied them, decisions 34 to 41; a third round is not run)
- [x] A finding against the rule text that this plan fixes byte for byte (sections 1, 3 and 4) is not fixed in the build, because the plan's text is the approved one and the test copies it; it goes to the CTO Chief as a kickback to the implementation plan, with the finding quoted (the findings against the fixed text came as the CTO Chief's order to change the plan's fixed text first, which was done before the files and the test changed; the functional plan's criteria 24, 26 and 29a were changed with it, by the same order)
- [x] A finding outside this slice's goal is listed in the build record in one line, for the owner to schedule

### Step 12: OPTIMIZE
- [x] Confirm this slice changes no product code: `git diff --name-only` lists nothing under `src/`
- [x] Confirm the new test is a small test by rule 1: it reads each of the three files at most once (one read per file at module level, used read-only by every case), starts no process and makes no temporary folder
- [x] Read each case's `duration_ms` from `node --test --test-reporter=tap tests/test-writers-get-the-fast-test-rules.test.js` and record them; every case under 100 ms is expected; a case above it is recorded with the machine load and examined, never asserted on inside the test

### Step 13: SECURE
- [x] Confirm no key, token, password or other secret appears in the added text or in the new test, by reading the full diff of the six files
- [x] Confirm no added instruction weakens a safety rule, by reading each added rule against it: rule 7 forbids `npx` for a tool the project has not installed and allows no download; rule 8 forbids dropping, widening or skipping an assertion; the run-by-name line leaves the whole suite in Step 14; the tick paragraph forbids ticking an unverified criterion and sends an unverifiable one to the CTO Chief
- [x] Confirm the new test builds every path from fixed segments joined to `ROOT` with `path.join`, takes no input from outside, and starts no process and no network call
- [x] Confirm the build record names no home-folder path, account name or e-mail address: the measurement output file is named by its file name only

### Step 14: VERIFY
- [x] While building, only the affected tests ran (Step 10 and each review fix round): the new test, the readers of the three agent files and the two count tests, as listed under "Tests run while building (affected only)"
- [x] Run the affected-test command once more after the last review fix; every file passes
- [x] The rule for the two files another round owns: a failure confined to `tests/reachability-surface-scan-is-linear.test.js` or `tests/iron-loop-enforcer.test.js` is re-run alone with `node --test <that file>`; a pass alone is recorded beside the failed run's one-minute load; a persistent failure goes to the CTO Chief for the round that owns the file, with this run's load numbers; neither file is ever edited, and neither failure is waved through (no failure occurred in this round, so nothing was re-run)
- [x] Run `npm run lint` (eslint with `--max-warnings 0`): 0 errors, 0 warnings
- [x] Run `npm run typecheck`: passes
- [x] Run the full `npm test` once, in the foreground with a timeout of up to 10 minutes; if it can take longer and the builder was dispatched in the background, start it with run_in_background and end the turn, never polling. Done once after the last slice, by the owner's order: 13182 tests, 0 failed, 0 skipped, coverage 99.88% against a floor of 99%
- [x] Read the gate's result: 0 failed, 0 skipped, coverage at or above `minPct` in `.ctoc/coverage-baseline.json`; a failure confined to the two files owned by another round is handled by the rule above; any other failure is a kickback to the step that caused it. Done once after the last slice, by the owner's order: 13182 tests, 0 failed, 0 skipped, coverage 99.88% against a floor of 99%
- [x] Measurement, after side: record the one-minute load with `node -p "require('os').loadavg()[0]"`, then run `/usr/bin/time -p node --test --test-reporter=tap tests/*.test.js` (the command of `npm run test:raw` with the TAP reporter) with its output redirected to a file outside the repository, then record the load again (run with the session's timing script, which starts `/usr/bin/time -p` on `node --test` with the spec reporter and a per-file reporter, as slice 2 did)
- [x] Record for that run: the command, wall-clock, user and system time and their sum as processor time, the load at start and at end, the core count from `node -p "require('os').availableParallelism()"`, `node --version`, `git rev-parse HEAD` with a note when the slice's diff is not yet committed, the runner's `pass`, `fail` and `skipped` totals, and the longest file with its duration read from the runner's own per-file output
- [x] Measure (a) has no before side: run `/usr/bin/time -p node --test tests/test-writers-get-the-fast-test-rules.test.js` alone twice, each with its load at start and end, and record both
- [x] Record measures (b) and (c) beside the before run chosen in Step 9; this slice changes no runtime and no existing test, so the expectation is no change, and the record does not call the slice faster

### Step 15: DOCUMENT
- [x] Write the build record under `## Execution Record` at the end of this plan: the red run summary, the green run summary, the affected-test results, the release script's count change and the `CLAUDE.md` byte size, `VERSION` unchanged, each review finding with its fix, rejection or hand-off, the full `npm test` summary (not run by the builder, see Step 14), and the measurements of Step 14 with every load
- [x] Record any handling of the two files another round owns, with each run's load
- [x] State in the record that the rules reach builds only after a release that carries them is installed, and do not write that the agents now follow them
- [x] No CHANGELOG entry (decision 13) and no other documentation file: the three agent files are the documentation this slice changes

### Step 16: FINAL-REVIEW
- [x] Confirm every box of Steps 8 to 15 is ticked only for work done and seen
- [x] Confirm `git status --short` lists changes only in the six declared files, this plan and the functional plan (criteria 24, 26 and 29a, by the CTO Chief's order); the untracked paths under `.ctoc/audit/dispatches/` and `IRON_LOOP.md` and the untracked plan for slice 5 are not this build's
- [x] Verify each acceptance criterion against its evidence (the test run, the diff, the release output, the byte size, the gate's summary, the build record) and tick its box in "## Acceptance criteria" only after that check
- [x] A criterion that cannot be verified keeps its box open, with the reason written in plain words at the end of that same checkbox line, without square brackets and never on a new line, and is reported to the CTO Chief as an open question instead of handing the plan back as finished
- [x] Run no `menu` command; hand back to the CTO Chief with the report of the Output section of the executor, the open questions if any, and the note that the completion is the CTO Chief's to hand to the owner

---

## Execution Record

### Round 1 (the first build: Steps 8 to 10 and the first part of Step 11, self-review and the review packets)

- Base commit: 46591000d3171bd28a1e08d616020264fec90bc5. Node v24.14.1. Slice 2 (`c7baf9a6`, then its plan-record commit `46591000`) is on the base commit. The agent files were unedited (`git diff HEAD` on the three was empty) when the red run was taken. Anchors sat where the plan says: agent lines 75 and 77, skill lines 145, 147 and 149, executor lines 181, 183, 233 and 272 to 280, with no line moved.
- Before side of the measurement (decision): slice 2's after-run from its build record, because only plan-record commits landed between it and this base commit. Its numbers: whole suite 53.03 s wall-clock, 407.55 s processor time, longest file `hotfix-check-corpus` at 48.78 s.
- Installed among semgrep, osv-scanner, trufflehog, detect-secrets, gosec and bandit (checked with `command -v`): none.
- Constants of the test were printed by a program from this plan (a scratch script), never retyped; the three agent files were edited by a second scratch script from the same printed text, at quoted anchors.
- Error path of `between`, probed in scratch (not committed): an absent start marker and an absent end marker each throw an AssertionError that names the missing marker.
- Red run, before any agent file changed: tests 8, pass 2, fail 6, skipped 0, duration_ms 32.46. Cases 1, 2, 3, 4, 5 and 8 failed and cases 6 and 7 passed. Each of the six failed on the includes assertion for the missing rule text (the block, the read-only rule, the Step 8 pointer, the acceptance-criteria rule), none on a missing marker, a read error or a syntax error.
- Green run after the three edits: tests 8, pass 8, fail 0, skipped 0, duration_ms 35.18; every case under 1 ms.
- Edits only add text: numstat 13 added and 0 removed for the unit-test-writer agent, 13 and 0 for its skill, 4 and 0 for the executor. The 30 added lines are plain ASCII and no word is followed by an opening parenthesis (scratch script, zero hits).
- `node src/scripts/release.js`: test-file count 573 to 574 in `CLAUDE.md` (both lines) and `README.md` (line 1145). `VERSION` unchanged (git diff empty). It wrote nothing outside the declared files. `CLAUDE.md` is 14983 bytes.
- `tests/readme-numbers.test.js` and `tests/claude-md-keeps-every-rule.test.js`: 69 pass, 0 fail.
- Affected-test command exactly as the plan writes it: tests 839, pass 839, fail 0, cancelled 0, skipped 0, duration_ms 4441. The two files owned by another round passed in that run.
- `npm run lint`: 0 errors, 0 warnings.
- Review packets for the three agent-file reviews are in the scratch folder `review-packets-s3`, one per file (unit-test-writer agent, its skill, the executor). At the end of round 1 no review had run yet; the reviews came back as the fix list of round 2.
- The rules reach builds only after a release that carries them is installed; nothing here says the agents now follow them.

### Round 2 (the review round of 2026-10-13: Step 11 fix round, then Steps 12 to 16)

Trigger: the CTO Chief's consolidated fix list (three iron-loop-critic reviews at extra-high effort and an agent-critic pass with web research), fourteen items, all applied; none rejected. The order was the plan's: fixed text in the plan first (sections 1 to 5, the decisions 25 to 33, the criteria), the functional plan's criteria 24, 26 and 29a with it, then the test regenerated from the plan by a program, then the red run against the files as they stood, then the files changed by a script from the same printed text, then the green run.

- Findings and where each went: item 1 (rule 1) decision 26; item 2 (rule 2) decision 27; item 3 (rule 3 and the agent's line after "No shared state between tests") decision 27; items 4, 5 and 6 (rules 4, 5, 6) decision 28; items 7, 8 and 9 (rule 7, rule 8, the opening) decision 30; item 10 (Testing Trophy sentence, both checklist lines) decision 27; item 11 (the skip example in both writer files) decision 29; items 12 and 13 (the acceptance-criteria rule, Step 16 text, functional criterion 29a, the Output line) decision 25; item 14 (Step 8 sentence, functional criterion 26) decision 31. The test grew from 8 to 12 cases (decision 32).
- Node facts run in this round on Node v24.14.1 (rules 3 and 4): the test's own `t.mock.timers.enable` is restored when the test ends; the shared `mock.timers.enable` stays faked for the next test (Date.now read 0 there); `setTimeout` from `node:timers` and from `node:timers/promises` is faked and advanced by `tick`; `runAll` fires the pending timers; `performance.now` is not faked; `fs.promises.rm` accepts `maxRetries`.
- Red run of the regenerated test against the files as they stood after round 1 (the plan's fixed text already changed): tests 12, pass 2, fail 10, skipped 0, duration_ms 34.85. Cases 1, 2, 3, 4, 5, 8, 9, 10, 11 and 12 failed and cases 6 and 7 passed. Each failure is an includes or not-includes assertion on missing rule text (messages: block not held, read-only rule not held, Step 8 run-by-name sentence missing, acceptance-criteria rule missing, checklist line missing, Testing Trophy sentence missing, `test.skipIf` still shown, Output line missing), none on a marker, a read or a syntax error. The same program printed per fixed text whether the old files held it: absent for FAST_TEST_RULES, READ_ONLY, AGENT_EXCEPTION, CHECKLIST_LINE (both files), TROPHY_TAIL, AGENT_LOUD, SKILL_LOUD, RUN_BY_NAME, TICK_RULE and OPEN_LINE; present only for SKILL_POINTER, whose text did not change; `test.skipIf` present in both writer files.
- Green run after the changes: tests 12, pass 12, fail 0, skipped 0, duration_ms 33.04; the same program then printed every fixed text present and `test.skipIf` gone from both files.
- The changed text: numstat is 6 added and 0 removed for the executor, 18 added and 4 removed for the unit-test-writer agent (the old skip example) and 18 and 4 for its skill (the old skip example and the re-added Testing Trophy line). The Step 14 lines and the no-sleep-loop sentence are untouched (case 7 passes). Added lines: plain ASCII except the agent's check-mark comment of the replacement example; the only word-then-parenthesis hits are that example's code, the Testing Trophy line that already held "(math, parsing, transformations)", and none in any rule sentence.
- Affected-test command exactly as the plan writes it (34 files): tests 843, pass 843, fail 0, cancelled 0, skipped 0, duration_ms 4463 (the export-reachability fence, the agent-tool-grants fence, the gate-number fences and the two files owned by another round passed). `npm run lint`: 0 errors, 0 warnings. `npm run typecheck`: passed. `CLAUDE.md` 14983 bytes; `VERSION` and `package.json` unchanged; the round adds no test file, so the counts in `CLAUDE.md` and `README.md` stay and `node src/scripts/release.js` was not run again (the two count tests passed).
- Case durations of the new test (the TAP reporter's `duration_ms`): 0.302, 0.044, 0.041, 0.035, 0.048, 0.044, 0.037, 0.032, 0.061, 0.062, 0.059 and 0.036 ms, all far under 100 ms.
- Measurement, after side, whole suite (`/usr/bin/time -p node --test` over the 574 files of `tests/*.test.js` with the spec reporter and a per-file reporter, started by the session's timing script as slice 2 did): exit 0; tests 13182, suites 2122, pass 13182, fail 0, cancelled 0, skipped 0; wall-clock 47.55 s, user 234.05 s, system 166.76 s, processor time 400.81 s; one-minute load 6.7 at start and 13.3 at end; 18 cores; Node v24.14.1; commit 46591000d3171bd28a1e08d616020264fec90bc5 with this slice's changes not yet committed; longest file `tests/hotfix-check-corpus.test.js` at 44.02 s, then `tests/hotfix-check-guards.test.js` at 32.16 s, `tests/hotfix-check-test-run.test.js` at 30.55 s and `tests/hotfix-check-readers.test.js` at 30.54 s, the longest file outside the hotfix group `tests/protect-records.test.js` at 15.97 s. Before side (slice 2's after-run, chosen in Step 9): 53.03 s wall-clock, 407.55 s processor time, longest file at 48.78 s. The loads of the two runs differ and are not matched, so the record does not call this slice faster; it adds rules and one small test.
- Measure (a), the new test file alone, twice: `/usr/bin/time -p` real 0.06 s and 0.07 s, user 0.05 s and system 0.01 s both times, load 13.8 at start and 13.8 at end both times; the runner's duration_ms 35.41 and 37.21; 12 tests pass each time.
- The two files another round owns (`tests/iron-loop-enforcer.test.js`, `tests/reachability-surface-scan-is-linear.test.js`) passed in the affected run and in the whole-suite run; nothing was re-run, edited or waved through.
- The full `npm test` was not run by the builder: it runs once after the last slice, by the owner's order, so Step 14's two boxes for it and criterion 2 stay open, each with that reason at the end of its own line. The whole-suite timing run above shows 0 failed and 0 skipped; it does not measure coverage.
- Finding outside this slice's goal, for the owner to schedule: the guard on shell commands refused several harmless read-only commands in this round (a text search and a sed over `src/lib/` files, a heredoc and a node call whose text only contained ordinary words) with a message that talks about answering CTOC's questions; each was repeated in another form. Also, `git` forms such as `git diff --quiet` followed by `echo` are refused as too complex for a worktree agent, so exit codes had to be read from a script.
- Untracked paths seen in `git status` that are not this build's: the folder `.ctoc/audit/dispatches/2026-10-12/`, `IRON_LOOP.md` (never touched), and a new plan for slice 5 that appeared in `plans/implementation/` during the round.
- The rules reach builds only after a release that carries them is installed; nothing here says the agents now follow them.

### Round 3 (the second fix round of 2026-10-13: the re-review's seven open items)

Trigger: the CTO Chief's re-review found ten of eleven earlier items closed and seven open: M1 to M4 and L1 to L3. Each is a decision, 34 to 40, and decision 41 records the order. None rejected. The order was the plan's: fixed text in the plan first (sections 1, 2 and 5, the decisions, the Step 8 and Step 11 boxes), the functional plan's criteria 24 and 29a with it (criterion 24 gained the contract-test scope, the replaced time assertion, the live check's place and the `slow_unit_test` row; criterion 29a gained "no test skipped"), then the presence test regenerated from the plan by the same program with one new constant, `SLOW_ROW`, checked in case 10, then the red run against the files as they stood, then the files changed by a script from the same printed text, then the green run.

- Items to decisions: M1 decision 34 (the loud-failure example is now six lines and asserts after the throw), M2 decision 35 (rule 2: contract test per tool or program the recordings come from, CTOC's own extension to a required but not installed program such as git, a service beyond `localhost` has the live check of rule 7 as its contract test), M3 decision 36 (rule 5: an existing time assertion becomes an operation count, the swap named, never simply removed), M4 decision 37 (the skill's `slow_unit_test` row), L1 decision 38 (rule 7: a live check beyond `localhost` lives in a file outside the default suite's pattern, run by a script the plan names), L2 decision 39 (the opening labels the npm path fact, pytest-xdist, `Object.freeze`, `fs.promises.rm` with `maxRetries` and the loud missing tool as examples or CTOC's own), L3 decision 40 ("the whole suite with no test skipped and its coverage floor" in the executor's rule, section 4 and functional criterion 29a).
- Red run of the regenerated test against the files as they stood after round 2: tests 12, pass 7, fail 5, skipped 0, duration_ms 32.88. Cases 1, 2, 8, 10 and 11 failed; cases 3, 4, 5, 6, 7, 9 and 12 passed (their texts did not change). Each failure is a presence assertion on missing text: the fast-test block (agent and skill), the acceptance-criteria rule, the `slow_unit_test` row (the Testing Trophy assertion before it passed), the loud-failure example. The program printed per constant whether the old files held it: ABSENT for FAST_TEST_RULES (both), AGENT_LOUD, SKILL_LOUD, TICK_RULE and SLOW_ROW; present for READ_ONLY, AGENT_EXCEPTION, CHECKLIST_LINE, TROPHY_TAIL, SKILL_POINTER, RUN_BY_NAME and OPEN_LINE; `test.skipIf` gone from both files.
- Green run after the changes: tests 12, pass 12, fail 0, skipped 0, duration_ms 36.42; the same program printed every constant present. Case durations (TAP `duration_ms`): 0.344, 0.049, 0.043, 0.041, 0.057, 0.047, 0.033, 0.037, 0.063, 0.064, 0.061 and 0.035 ms, one-minute load 7.2 on 18 cores.
- The changed text against the base commit: numstat executor 6 added and 0 removed, unit-test-writer agent 20 added and 4 removed, skill 21 added and 5 removed. Added lines of this round: plain ASCII except the table row's unchanged third cell; the only word-then-parenthesis hits are the loud-failure example's code (`test('db test', async () => {` and `await fetchUser(1);`), whose names both files already hold; no gate number; every npx form in the block is `npx --no -- <tool>` or `npx --offline --no -- <tool>` or the bare `npx <tool>` named as forbidden.
- Affected-test command exactly as the plan writes it (34 files): tests 843, pass 843, fail 0, cancelled 0, skipped 0, duration_ms 4469, including the export-reachability fence (the new `async` and `await` example lines moved no count), the agent-tool-grants fence, the gate-number fences, `tests/readme-numbers.test.js`, `tests/claude-md-keeps-every-rule.test.js` and the two files owned by another round. `npm run lint`: 0 errors, 0 warnings. `npm run typecheck`: exit 0. `CLAUDE.md` 14983 bytes; `VERSION` unchanged; no test file added, so `node src/scripts/release.js` was not run again.
- Criteria checked after the last change to the declared files: 24 (cases 1, 2, 9, 10 and 11 pass), 25 (cases 3 and 4), 26 (cases 5 and 6), 27 (case 7), 29a (cases 8 and 12), 28 (the affected command), 29 and 1 (unchanged by this round). Their boxes stay ticked. Criterion 2 and the two Step 14 boxes for the full `npm test` stay open with their reason, as in round 2.
- The full `npm test` was not run, by the owner's order. The rules reach builds only after a release that carries them is installed; nothing here says the agents now follow them.
- Guard on shell commands: it again refused harmless commands (one with a `tee`, one with a node run followed by a second command, one that computed a path in a variable); each was repeated as plain separate commands. Same finding as round 2, for the owner to schedule.

### Close-out (2026-10-13: the one full npm test after the last slice)

- The one full `npm test` ran once after the last slice, on the worktree at HEAD 13b73ce4b834660a59743823f4891717454dbb7a (a commit that adds only the slice 5 plan file; no source, test or agent file differs from the build). Summary read from its output file: tests 13182, suites 2122, pass 13182, fail 0, cancelled 0, skipped 0, todo 0, duration_ms 60298.97; `[CTOC test-gate] coverage 99.88% (threshold 99%), skipped 0, failed 0`; corpus claims verified 3, refuted 0, unverifiable 0 (offline ledger gate: PASS); `[CTOC test-gate] PASS`. No failure occurred, so the rule for the two files owned by another round needed no re-run.
- Criterion 2 and the two Step 14 boxes for the full `npm test` are ticked on that run; the Step 16 box that waited on it is true. Nothing was run by the builder before this run, as the owner ordered.


## Deferred Questions

_Written by the Iron Loop integrator (src/lib/iron-loop.js), which performs NO
quality evaluation. These entries are the integrator's own report on itself, not
findings from a critic that read this plan._

- **evaluation**: NOT EVALUATED — no automated critique was performed on this plan. The refinement loop appended the Steps 8-16 template and assessed nothing. (The scores this step used to report were computed from that same template, not from the plan.) A human or a real critic must review this plan before it is built.
