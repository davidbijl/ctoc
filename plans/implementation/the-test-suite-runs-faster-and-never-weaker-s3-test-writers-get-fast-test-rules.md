---
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

Four text insertions, one new test, one count sync. No sentence that exists today is changed or
removed. All new text is plain ASCII.

### 1. `agents/testing/writers/unit-test-writer.md` — insert the fast-test block

Insert after line 75 (`- Mock external dependencies`, the last line of "### Test Isolation") and
before the blank line that precedes `## Language-Specific Frameworks` (line 77): one blank line,
then the block below, so the file reads `- Mock external dependencies`, blank line, the block,
blank line, `## Language-Specific Frameworks`. Lines 70–75 stay as they are, including
"- No shared state between tests" (criterion 25).

The block, byte for byte (the same text goes into the skill in section 2):

```
### Fast tests

A slow suite is run less often and protects less, as Software Engineering at Google says in chapter 11. These rules keep a new test fast without letting it prove less. Each outside source below was read for CTOC's research brief of 2026-10-12, `plans/vision/deepthink/fast-hermetic-node-test-suites.md` in the CTOC repository; the npx observation in rule 7 is a check recorded in that brief against the CTOC repository, and rule 8 is a CTOC lesson.

1. **Small and hermetic by default.** A test starts no process, makes no real git repository, uses no network and waits on no real clock. Only a test about exactly one of those boundaries crosses it; it is then a medium test, and its name says what it crosses. A test that reaches the network beyond `localhost` is a large test and never runs in the default suite; see rule 7. Source: Software Engineering at Google, chapter 11, "Test Size": small tests run in one process and never sleep or block; medium tests may use several processes and the network to `localhost` only; large tests remove the `localhost` restriction.
2. **Replace a slow boundary, never the logic.** Hand the code under test a recorded real answer from the slow tool, service or process, through a seam: an injected command runner, clock or folder. Never replace the code being tested. Keep one clearly named contract test per real tool, which runs the real tool. Source: Software Engineering at Google, chapter 13: a test double helps when the real implementation is slow, and each fake needs a contract test; Martin Fowler, "Contract Test".
3. **Expensive setup once per file, read-only.** Build expensive setup once per file and remove it at the end of the file; in node:test, build it in a `before` hook inside the file's `describe` and remove it in an `after` hook, which runs even when tests fail. Tests treat it as read-only; a test that changes it makes its own copy first. This read-only setup is the only state tests share; the isolation rules above forbid any state a test can change. Source: the Node.js 24 test runner documentation.
4. **Fake timers for time.** Drive time-outs, retries and schedules with fake timers, never with a real wait: in node:test, `mock.timers`, which fakes `setTimeout`, `setInterval`, `setImmediate` and `Date`. Source: the Node.js 24 test runner documentation.
5. **Never assert wall-clock time inside a test.** To pin speed, count operations, or measure processor time and compare ratios. Source: Silva and others, IEEE Transactions on Software Engineering, 2024: processor starvation is the most significant resource factor in flaky tests.
6. **A time budget per size, read from the runner's own output.** Small: under 100 ms per test. Medium: under 5 s per test. A file whose processor time, or whose duration in the runner's own output at a recorded machine load, passes 20 s is split by area. Read durations from the runner's report, where node:test gives each test's `duration_ms`; never assert a duration the runner reports. Source: the Node.js 24 test runner documentation and its source code: each file runs in its own process, all tests of one file run on one thread, and files start in alphabetical order, so the longest file sets the floor under the whole suite. The numbers are CTOC's budget, set on 2026-10-12 from its own suite's profile.
7. **No internet and no package registry in the default suite.** Never `npx <tool>` for a tool the project has not installed: without a terminal, npx installs a missing package without asking, by npm's npx documentation for versions 10 and 11, and even `npx --no -- <tool>` asks the registry about the package before it refuses, as observed on 2026-10-12 with npm 11.11.0. Start the project's installed tool by running its package's own script with the running Node program and an argument list, with no shell: the script is the file that the `bin` field of the tool's `package.json` names, in the tool's package inside the project's own `node_modules`. That start works on every platform; on Windows, the path under `node_modules/.bin` and npx both go through a `.cmd` file, which Node refuses to start without a shell. Only from a shell, where that start is not possible, use `npx --offline --no -- <tool>`, which in the same observation made no request when the tool was installed and failed without a request when it was not. Or answer the call with a recorded real answer. A deliberately live check is one test, named in the plan, with "live" in its name.
8. **Faster never means weaker.** A moved test keeps its name and its assertions word for word; a changed test keeps or tightens what it proves. Never drop, widen or skip an assertion to gain speed. Source: CTOC's lesson "Fix the failures, not the tests".
```

How each rule maps to criterion 24 and to the brief:

| Rule | Criterion 24 item | Source in the brief |
|---|---|---|
| 1 | small and hermetic by default; a medium test's name says what it crosses; a test that reaches the network beyond `localhost` is large and never runs in the default suite | "What the evidence says" item 1 (Google, chapter 11, "Test Size": medium tests use the network to `localhost` only, large tests "remove the `localhost` restriction"); principle 1 ("The network beyond `localhost` makes it large") |
| 2 | replace a slow boundary, never the logic, with a recorded real answer; one named contract test per real tool | item 4 (Google, chapter 13; Fowler, "Contract Test"); principle 3 |
| 3 | expensive setup once per file in a `before` hook, read-only, a changing test makes its own copy; the hook words are marked "in node:test"; the read-only setup is the only shared state, which reconciles it with the isolation rules above it (criterion 25, functional decision 11) | item 2 (`before`, and `after` "is guaranteed to run, even if tests within the suite fail"); principle 5 ("inside the `describe`") |
| 4 | fake timers for time-outs, retries and schedules | item 2 (`MockTimers`, the four `apis` values) |
| 5 | never assert wall-clock time; measure operations or processor time | item 7 (Silva and others 2024, section IV-B1); principle 8 |
| 6 | the budget per size, read from the runner; a duration the runner reports is never asserted, while rule 5 keeps counted operations and processor-time ratios assertable | items 2 and 3 (per-file process, one thread per file, alphabetical order, `duration_ms`); the numbers are the functional plan's decision 10 |
| 7 | no internet or registry; an installed tool is started by running its package's own script, the file the `bin` field of its `package.json` names inside the project's own `node_modules`, with the running Node program and an argument list and no shell, a start that works on every platform; only from a shell, where that start is not possible, with `npx --offline --no -- <tool>`; a live check is one test named in the plan and marked live | item 4 (npm's npx documentation, versions 10 and 11); "Checked by the session against this repository" (the npm 11.11.0 probe: `npx --no -- eslint` requested the package's metadata, `npx --offline --no -- eslint` made no request whether eslint was installed or not). Not from the brief, and named as no outside source in the rule: the Windows `.cmd` refusal is CTOC's own record (`src/lib/quality-agent.js` lines 239–245), and the script start is the one slice 2 gives CTOC's security scan for eslint (decision 19) |
| 8 | faster never means weaker | the owner's brief (functional plan section 1); CTOC's lesson 14, "Fix the failures, not the tests" |

### 2. `skills/testing/writers/unit-test-writer/SKILL.md` — insert the same block

Insert after line 147 (`- Reset any global state (env vars, singletons) in teardown.`, the last
line of "### Test Isolation") and before the blank line that precedes
`### Fakes vs Mocks vs Stubs — when to reach for which` (line 149): one blank line, then the
block of section 1, byte for byte. Line 145 stays as it is (criterion 25).

### 3. `agents/iron-loop/iron-loop-executor.md` — Step 8

Add two lines after line 233 (`- Test error conditions`), so Step 8 reads:

```
### Step 8: TEST (TDD Red)
- Write tests FIRST (TDD - not just identify coverage)
- Run tests, expect failures (red)
- Tests define expected behavior
- Test error conditions
- Follow the fast-test rules in [`skills/testing/writers/unit-test-writer/SKILL.md`](../../skills/testing/writers/unit-test-writer/SKILL.md), section "Fast tests".
- Which tests to run: while writing and implementing, run by name only the test files you wrote or changed and the test files the plan's `files:` list declares; Step 14 runs the whole suite.
```

The second added line holds criterion 26's sentence byte for byte, from "while" to "suite.".
Step 14 (lines 272–280) is not touched (criterion 27), nor is the no-sleep-loop sentence (line
296). The link form matches the file's own honest-status link (line 332), which resolves from
`agents/iron-loop/` inside the installed plugin.

### 4. `agents/iron-loop/iron-loop-executor.md` — the owner's acceptance-criteria rule

Insert after line 181 (`## Completing a plan — the ONE way`) and its blank line, before line 183
(`When steps 8-16 are done, complete through the menu's completion route with the`): the
paragraph below, then one blank line. The builder reads it at the moment it is about to call the
completion command; Step 16 already sends it here ("see "Completing a plan" above", line 291).

```
**Before you complete, verify and tick every acceptance criterion.** The completion first validates the plan; that validation reads the plan's acceptance criteria section, from the first `##` heading whose text holds "Acceptance Criteria" in any letter case down to the next heading of that same `##` level or a `---` line, and refuses the plan while any `[ ]` box in that section is not ticked. Each refusal counts as a kickback, against Step 14 when every step box is already ticked, and a fourth kickback to one step, or a sixth in all, escalates the plan to the human. So, for each criterion: verify it by running or reading the evidence it names, then change its box to `- [x]`. A criterion about the completion's own check is verified by running the same check yourself at Step 14 first. Never tick a criterion you did not verify. A criterion you cannot verify stays `- [ ]`, with the reason written in plain words on the line under it and no square brackets in that reason, because the check counts bracketed marks anywhere in that section; report it to CTO Chief as an open question, with that reason, instead of completing the plan. A criterion whose evidence needs a network command that stands only in a checkbox line is one you cannot verify, because you never run such a command.
```

Every claim in it is read from the code named: the plan's validation running first in the
completion (`src/lib/actions.js` line 1021), with the acceptance check as the third check inside
it (`validateForReview`, `src/lib/plan-validator.js` lines 259, 268 and 277, after the step check
and the escalation check); the section and its end (lines 598–599); the refusal on any unticked
box (lines 610–625); why a reason carries no square brackets (line 610 counts a bracketed space
or lowercase x as a box, line 611 counts a bracketed x of either letter case as ticked, so a
lowercase `[x]` in a reason adds a ticked box and an uppercase `[X]` adds a tick without a box,
which lets an open criterion pass); the kickback and its step (`src/lib/actions.js` lines 1029
and 1446–1471); the fourth and sixth kickback (`src/lib/circuit-breaker.js` lines 65–68); and the
network command that stands only in a checkbox line, which the builder never runs
(`agents/iron-loop/iron-loop-executor.md` line 39). A criterion about the completion's own check
is one such as this plan's criterion 2, whose evidence is the full `npm test` the builder runs at
Step 14 before any completion. The prose fallback of line 600 is left out: plans written by
CTOC's planner carry the heading.

### 5. `tests/test-writers-get-the-fast-test-rules.test.js` — the presence test (new)

Pattern: `tests/agents-never-wait-in-a-sleep-loop.test.js` (exact text present byte for byte;
a missing file throws, a loud failure). `node:test` and `node:assert/strict`, `fs`, `path`; no
process, no network, no temporary folder: a small test by rule 1, expected well under 100 ms per
test.

Header comment, in substance: why (the profile in the functional plan, section 1; the three
refused builds); what it proves (the exact rule text ships in the three files; in the executor
it stands in the right sections, the Step 8 lines inside Step 8 and the acceptance-criteria rule
before the completion command; and Step 14 and the no-sleep-loop sentence are unchanged); what
it cannot prove (where the block sits inside the two writer files, which no case checks; and
that a model obeys the rules, which only a later look at the tests the agents write and at the
completion results of later builds can show).

Shared pieces:
- `read(...rel)`: `fs.readFileSync(path.join(ROOT, ...rel), 'utf8')` with `\r\n` folded to `\n`,
  so a Windows checkout without a `.gitattributes` (none exists in this repository) compares the
  same text.
- `between(text, start, end, where)`: the slice from `start` to the first `end` after it; asserts
  that both markers are found, naming the missing one, so a moved heading fails loudly rather
  than passing on an empty slice.
- Constants, each copied byte for byte from this plan (sections 1, 3 and 4) or, for `STEP_14`
  and `NO_SLEEP_LOOP`, from the executor file at the base commit, never retyped:
  - `FAST_TEST_RULES`: the block of section 1, its lines joined with `\n`.
  - `READ_ONLY`: `Tests treat it as read-only; a test that changes it makes its own copy first. This read-only setup is the only state tests share; the isolation rules above forbid any state a test can change.`
  - `SKILL_POINTER`: the first added Step 8 line of section 3, from `- Follow` to `"Fast tests".`
  - `RUN_BY_NAME`: criterion 26's sentence, from `while writing` to `the whole suite.`
  - `STEP_14`: the nine lines 272–280 of the executor at the base commit, joined with `\n`, from
    `### Step 14: VERIFY` to `- If ANY check fails -> kickback to relevant step`.
  - `NO_SLEEP_LOOP`: the same sentence `tests/agents-never-wait-in-a-sleep-loop.test.js` holds
    (its lines 24–28).
  - `TICK_RULE`: the paragraph of section 4.

Cases (each name says what it proves):
1. `agents/testing/writers/unit-test-writer.md carries the fast-test rules byte for byte` —
   `read(...)` includes `FAST_TEST_RULES`. Red before the edit.
2. `skills/testing/writers/unit-test-writer/SKILL.md carries the fast-test rules byte for byte` —
   the same. Red before the edit.
3. `agents/testing/writers/unit-test-writer.md keeps "No shared state between tests" and holds the read-only setup rule`
   — includes both `No shared state between tests` and `READ_ONLY` (criterion 25); no position
   check. Red before.
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
| `tests/export-reachability.test.js` (exact dead-export count, lines 123–137) through `src/lib/reachability.js` `SURFACE_CALL_RE` (line 654) | any identifier followed by optional space and `(` in an agent or skill file counts as a call and can mark a dead export live | none of the new text has an opening parenthesis after a word; the only `(` is in the Markdown link `](../../`, after a `]` |
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
   the build record.
2. Insert the texts of sections 1 to 4.
3. Run the new test alone: 8 pass. Then the affected tests below.
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

- [ ] Test first: the new test, run before any agent file changes, fails cases 1, 2, 3, 4, 5 and 8 and passes cases 6 and 7; the run's summary is quoted in the build record.
- [ ] Criterion 24: the unit-test-writer agent and its skill each hold the fast-test block of section 1 byte for byte (cases 1 and 2 pass).
- [ ] Criterion 25: each still holds its old no-shared-state sentence and holds the read-only wording of rule 3 (cases 3 and 4 pass).
- [ ] Criterion 26: the executor's Step 8 links the skill by path and holds the run-by-name sentence; the phrase "once at completion" occurs nowhere in the executor (cases 5 and 6 pass).
- [ ] Criterion 27: the executor's Step 14 lines 272 to 280 of the base commit are byte for byte unchanged and the no-sleep-loop sentence is present (case 7 passes; `tests/agents-never-wait-in-a-sleep-loop.test.js` passes).
- [ ] Criterion 29a: the executor's section on completing a plan holds the acceptance-criteria paragraph of section 4 byte for byte, before the completion command (case 8 passes).
- [ ] Criterion 28: every file in "Tests run while building" passes, with a failure confined to the two files owned by another round handled as criterion 2 says and recorded.
- [ ] Criterion 29: after `node src/scripts/release.js`, `tests/readme-numbers.test.js` and `tests/claude-md-keeps-every-rule.test.js` pass, `CLAUDE.md` is at most 15,000 bytes, and `VERSION` is unchanged.
- [ ] Criterion 1: the build record holds the measurements of "Measurements (criterion 1)" with each run's load at start and end, and does not call the slice faster.
- [ ] Criterion 2: Step 14's one full `npm test` shows 0 failed, 0 skipped and coverage at or above the floor in `.ctoc/coverage-baseline.json`.

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
   (line 104) still covers disk in a unit test.
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
17. **`READ_ONLY` holds both read-only sentences of rule 3**, so cases 3 and 4 assert the
    reconciling sentence directly, together with the old no-shared-state sentence and with no
    position check, for criterion 25. It
    is a tightening: cases 1 and 2 already hold the whole block.
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
    its numbers as CTOC's own.
21. **Rule 6 forbids asserting a duration the runner reports; rule 5 keeps counted operations and
    processor-time ratios.** The former "never assert them inside a test" read as forbidding the
    ratio checks rule 5 allows.
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

## What was not verified

- Nothing was run for this plan: every statement about the code is by reading, with file and
  line.
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
- [ ] Confirm `tests/test-writers-get-the-fast-test-rules.test.js` does not exist yet and that `git diff --quiet HEAD -- agents/testing/writers/unit-test-writer.md skills/testing/writers/unit-test-writer/SKILL.md agents/iron-loop/iron-loop-executor.md` exits 0, so the red run below is taken against the unedited agent files
- [ ] Produce the constants by program, never by retyping: a throwaway script in the session's scratch folder reads this plan and prints the fenced block of section 1 (`FAST_TEST_RULES`), the two added lines of section 3 (`SKILL_POINTER` from `- Follow` to `"Fast tests".`, and `RUN_BY_NAME` from `while writing` to `the whole suite.`) and the paragraph of section 4 (`TICK_RULE`); `STEP_14` is printed from `git show HEAD:agents/iron-loop/iron-loop-executor.md` lines 272 to 280 joined with a newline, from `### Step 14: VERIFY` to `- If ANY check fails -> kickback to relevant step`; `NO_SLEEP_LOOP` is copied from `tests/agents-never-wait-in-a-sleep-loop.test.js` lines 24 to 28; `READ_ONLY` is printed from rule 3 of the same fenced block, the two sentences `Tests treat it as read-only; a test that changes it makes its own copy first. This read-only setup is the only state tests share; the isolation rules above forbid any state a test can change.`
- [ ] Create `tests/test-writers-get-the-fast-test-rules.test.js` with `'use strict'`, `node:test`, `node:assert/strict`, `fs` and `path` only; `ROOT = path.join(__dirname, '..')`; no started process, no network, no temporary folder
- [ ] Write the header comment of section 5: why (the profile in the functional plan, section 1, and the three builds refused with "N of N acceptance criteria not checked"), what the test proves (the exact rule text ships in the three files; in the executor it stands in the right sections, the Step 8 lines inside Step 8 and the acceptance-criteria rule before the completion command; and the Step 14 lines and the no-sleep-loop sentence are unchanged), what it cannot prove (where the block sits inside the two writer files, which no case checks, and that a model obeys the rules)
- [ ] Write `read(...rel)`: `fs.readFileSync(path.join(ROOT, ...rel), 'utf8')` with every `\r\n` folded to `\n`; a missing file throws, a loud failure
- [ ] Write `between(text, start, end, where)`: returns the slice from `start` to the first `end` after it, and asserts that each marker is found, naming the missing marker and `where` in the message, so a moved heading fails loudly instead of passing on an empty slice
- [ ] Write case 1, `agents/testing/writers/unit-test-writer.md carries the fast-test rules byte for byte`: the file includes `FAST_TEST_RULES`
- [ ] Write case 2, `skills/testing/writers/unit-test-writer/SKILL.md carries the fast-test rules byte for byte`: the file includes `FAST_TEST_RULES`
- [ ] Write case 3, `agents/testing/writers/unit-test-writer.md keeps "No shared state between tests" and holds the read-only setup rule`: the file includes `No shared state between tests` and `READ_ONLY`; no position check
- [ ] Write case 4, `skills/testing/writers/unit-test-writer/SKILL.md keeps "No shared mutable state between tests" and holds the read-only setup rule`: the file includes `No shared mutable state between tests; use fixtures/factories per-test.` and `READ_ONLY`; no position check
- [ ] Write case 5, `the builder's Step 8 points to the fast-test rules and runs only the named test files`: the slice `between(executor, '### Step 8: TEST (TDD Red)', '### Step 9: PREPARE')` includes `SKILL_POINTER` and `RUN_BY_NAME`
- [ ] Write case 6, `the builder never says the suite runs "once at completion"`: the executor text does not include `once at completion`
- [ ] Write case 7, `the builder's Step 14 lines and its no-sleep-loop sentence are unchanged`: the executor includes `STEP_14` and `NO_SLEEP_LOOP`
- [ ] Write case 8, `the builder verifies and ticks each acceptance criterion before the completion command`: the slice `between(executor, '## Completing a plan — the ONE way', 'menu task complete <taskId> --summary')` includes `TICK_RULE`
- [ ] Give every assertion a message naming the file and the missing text, so a red run says what is absent
- [ ] Error path of the helper, as a throwaway probe in the scratch folder (never committed): call `between` with a start marker that is absent and with an end marker that is absent, and see each throw an assertion error that names the missing marker
- [ ] Run `node --test tests/test-writers-get-the-fast-test-rules.test.js` alone and see exactly cases 1, 2, 3, 4, 5 and 8 fail and cases 6 and 7 pass
- [ ] Read each of the six failures and confirm it fails on the missing rule text (the includes assertion), not on a missing marker in `between`, a read error or a syntax error; a guard case that fails, or a red case that fails for another reason, stops the build and goes to the CTO Chief with the output
- [ ] Copy the run's summary lines (tests, pass, fail, duration) into the build record under `## Execution Record`, headed as the red run before any agent file changed

### Step 9: PREPARE
- [ ] Confirm the slice this one depends on (`the-test-suite-runs-faster-and-never-weaker-s2-no-test-reaches-the-npm-registry`) has landed on the base commit; if it has not, report that to the CTO Chief and do not start the agent-file edits
- [ ] Record the base commit (`git rev-parse HEAD`) and `node --version` in the build record
- [ ] Confirm `node_modules/eslint/package.json` exists, so the lint below uses the installed eslint; if it is missing, run `npm ci` from the committed lockfile and nothing else
- [ ] Confirm by reading that the anchors still sit where the plan says: unit-test-writer agent line 75 `- Mock external dependencies` and line 77 `## Language-Specific Frameworks`; skill line 145 `No shared mutable state between tests; use fixtures/factories per-test.`, line 147 `- Reset any global state (env vars, singletons) in teardown.` and line 149 `### Fakes vs Mocks vs Stubs`; executor line 181 `## Completing a plan — the ONE way`, line 183 `When steps 8-16 are done`, line 233 `- Test error conditions`, lines 272 to 280 the Step 14 lines, line 296 the no-sleep-loop sentence; where a line number moved, insert by the quoted anchor text and record the new line numbers
- [ ] Decide the before side of the measurement and record the decision: slice 2's after-run from its build record when no other commit landed between it and this slice's base commit (`git log` between the two); otherwise one new run of the timing command of Step 14 on this slice's base commit, with the same recorded items
- [ ] Record which of semgrep, osv-scanner, trufflehog, detect-secrets, gosec and bandit are installed, each checked with `command -v <name>`

### Step 10: IMPLEMENT
- [ ] `agents/testing/writers/unit-test-writer.md`: after line 75 (`- Mock external dependencies`), insert one blank line and then the fast-test block of section 1, byte for byte, pasted from the same program output that produced `FAST_TEST_RULES`, so the file reads that line, a blank line, the block, the existing blank line, `## Language-Specific Frameworks`; lines 70 to 75 unchanged
- [ ] `skills/testing/writers/unit-test-writer/SKILL.md`: after line 147 (`- Reset any global state (env vars, singletons) in teardown.`), insert one blank line and then the same block, byte for byte, before the existing blank line and `### Fakes vs Mocks vs Stubs — when to reach for which`; line 145 unchanged
- [ ] `agents/iron-loop/iron-loop-executor.md`, Step 8: after line 233 (`- Test error conditions`), add the two lines of section 3, byte for byte: the line starting `- Follow the fast-test rules in` with the Markdown link to `../../skills/testing/writers/unit-test-writer/SKILL.md`, and the line starting `- Which tests to run: while writing and implementing`
- [ ] `agents/iron-loop/iron-loop-executor.md`, completion section: after line 181 (`## Completing a plan — the ONE way`) and its blank line, insert the paragraph of section 4, byte for byte, then one blank line, so `When steps 8-16 are done, complete through the menu's completion route with the` follows it
- [ ] Confirm the edits only add text: `git diff --numstat` on the three agent files shows 0 removed lines for each, and the Step 14 lines 272 to 280 and the no-sleep-loop sentence of the base commit are untouched
- [ ] Confirm every added line in the three agent files is plain ASCII: a throwaway script reads the added lines of `git diff -U0` on the three files and prints any character above code point 127; the expected output is empty
- [ ] Confirm no word in the added text is followed by an opening parenthesis (decision 9): the same script prints any added line matching a word character directly or after spaces followed by `(`; the only allowed hit is the Markdown link, where `(` follows `]`
- [ ] Run `node --test tests/test-writers-get-the-fast-test-rules.test.js` alone: 8 pass, 0 fail; copy the summary into the build record as the green run
- [ ] Run `node src/scripts/release.js` with `VERSION` unchanged; then confirm `git diff --quiet -- VERSION` exits 0, that the test-file count in `CLAUDE.md` (both lines) and `README.md` rose by exactly one, and that `git status --short` lists no changed file outside the six declared files and this plan; a version or count sync that the script writes to a file outside them, for example `package.json` or a file under `.claude-plugin/`, goes through `src/lib/scope-growth.js` and stops the build, and `VERSION` never changes
- [ ] Confirm `CLAUDE.md` is at most 15,000 bytes with `node -p "require('fs').statSync('CLAUDE.md').size"`, and record the number
- [ ] Run `node --test tests/readme-numbers.test.js tests/claude-md-keeps-every-rule.test.js`: both pass
- [ ] Run the affected-test command of "Tests run while building (affected only)" exactly as the plan writes it; every file passes, except that a failure confined to `tests/reachability-surface-scan-is-linear.test.js` or `tests/iron-loop-enforcer.test.js` is handled by the rule written in Step 14 below
- [ ] Wiring: no module is added; the new test is reached by `npm test` through `tests/*.test.js`, and the three agent files are the live definitions Claude Code loads (section "Wiring"); nothing else to wire

### Step 11: REVIEW
- [ ] Self-review the diff (`git diff` on the six declared files): every inserted text equals the plan's fixed text, each insertion sits at its anchor, and no existing sentence changed
- [ ] Self-review the test: each red case failed in Step 8 for the reason its name gives; each assertion message names the file and the missing text; the two guards (cases 6 and 7) cannot pass on an empty read
- [ ] Ask the CTO Chief to dispatch three reviews by area, in parallel, each an iron-loop-critic at extra-high effort, read-only, one per agent file: the unit-test-writer agent, the unit-test-writer skill, the executor; each brief names this plan, its file, the fence table of "What the new text avoids, and why", criteria 24 to 29a, and the new test file
- [ ] Ask the CTO Chief to dispatch, in parallel with those three, one agent-critic pass over the two writer files (agent and skill), which researches the domain on the web: whether each of the eight rules is sound and correctly attributed against the sources it names (Software Engineering at Google chapters 11 and 13, Fowler's "Contract Test", the Node.js 24 test runner documentation, Silva and others 2024, npm's npx documentation)
- [ ] Fix round 1: apply each accepted finding inside the six declared files, re-run the new test and the affected-test command, and record each finding with its fix or its written rejection
- [ ] Fix round 2, only if round 1 left findings: the same; a third round is never run, and what remains goes to the CTO Chief as open findings in the report
- [ ] A finding against the rule text that this plan fixes byte for byte (sections 1, 3 and 4) is not fixed in the build, because the plan's text is the approved one and the test copies it; it goes to the CTO Chief as a kickback to the implementation plan, with the finding quoted
- [ ] A finding outside this slice's goal is listed in the build record in one line, for the owner to schedule

### Step 12: OPTIMIZE
- [ ] Confirm this slice changes no product code: `git diff --name-only` lists nothing under `src/`
- [ ] Confirm the new test is a small test by rule 1: it reads each of the three files at most once (one read per file at module level, used read-only by every case), starts no process and makes no temporary folder
- [ ] Read each case's `duration_ms` from `node --test --test-reporter=tap tests/test-writers-get-the-fast-test-rules.test.js` and record them; every case under 100 ms is expected; a case above it is recorded with the machine load and examined, never asserted on inside the test

### Step 13: SECURE
- [ ] Confirm no key, token, password or other secret appears in the added text or in the new test, by reading the full diff of the six files
- [ ] Confirm no added instruction weakens a safety rule, by reading each added rule against it: rule 7 forbids `npx` for a tool the project has not installed and allows no install; rule 8 forbids dropping, widening or skipping an assertion; the run-by-name line leaves the whole suite in Step 14; the tick paragraph forbids ticking an unverified criterion and sends an unverifiable one to the CTO Chief
- [ ] Confirm the new test builds every path from fixed segments joined to `ROOT` with `path.join`, takes no input from outside, and starts no process and no network call
- [ ] Confirm the build record names no home-folder path, account name or e-mail address: the measurement output file is named by its file name only

### Step 14: VERIFY
- [ ] While building, only the affected tests ran (Step 10 and each review fix round): the new test, the readers of the three agent files and the two count tests, as listed under "Tests run while building (affected only)"
- [ ] Run the affected-test command once more after the last review fix; every file passes
- [ ] The rule for the two files another round owns: a failure confined to `tests/reachability-surface-scan-is-linear.test.js` or `tests/iron-loop-enforcer.test.js` is re-run alone with `node --test <that file>`; a pass alone is recorded beside the failed run's one-minute load; a persistent failure goes to the CTO Chief for the round that owns the file, with this run's load numbers; neither file is ever edited, and neither failure is waved through
- [ ] Run `npm run lint` (eslint with `--max-warnings 0`): 0 errors, 0 warnings
- [ ] Run `npm run typecheck`: passes
- [ ] Run the full `npm test` once, in the foreground with a timeout of up to 10 minutes; if it can take longer and the builder was dispatched in the background, start it with run_in_background and end the turn, never polling
- [ ] Read the gate's result: 0 failed, 0 skipped, coverage at or above `minPct` in `.ctoc/coverage-baseline.json`; a failure confined to the two files owned by another round is handled by the rule above; any other failure is a kickback to the step that caused it
- [ ] Measurement, after side: record the one-minute load with `node -p "require('os').loadavg()[0]"`, then run `/usr/bin/time -p node --test --test-reporter=tap tests/*.test.js` (the command of `npm run test:raw` with the TAP reporter) with its output redirected to a file outside the repository, then record the load again
- [ ] Record for that run: the command, wall-clock, user and system time and their sum as processor time, the load at start and at end, the core count from `node -p "require('os').availableParallelism()"`, `node --version`, `git rev-parse HEAD` with a note when the slice's diff is not yet committed, the runner's `pass`, `fail` and `skipped` totals, and the longest file with its duration read from the runner's own per-file output
- [ ] Measure (a) has no before side: run `/usr/bin/time -p node --test tests/test-writers-get-the-fast-test-rules.test.js` alone twice, each with its load at start and end, and record both
- [ ] Record measures (b) and (c) beside the before run chosen in Step 9; this slice changes no runtime and no existing test, so the expectation is no change, and the record does not call the slice faster

### Step 15: DOCUMENT
- [ ] Write the build record under `## Execution Record` at the end of this plan: the red run summary, the green run summary, the affected-test results, the release script's count change and the `CLAUDE.md` byte size, `VERSION` unchanged, each review finding with its fix, rejection or hand-off, the full `npm test` summary, and the measurements of Step 14 with every load
- [ ] Record any handling of the two files another round owns, with each run's load
- [ ] State in the record that the rules reach builds only after a release that carries them is installed, and do not write that the agents now follow them
- [ ] No CHANGELOG entry (decision 13) and no other documentation file: the three agent files are the documentation this slice changes

### Step 16: FINAL-REVIEW
- [ ] Confirm every box of Steps 8 to 15 is ticked only for work done and seen
- [ ] Confirm `git status --short` lists changes only in the six declared files and this plan
- [ ] Verify each acceptance criterion against its evidence (the test run, the diff, the release output, the byte size, the gate's summary, the build record) and tick its box in "## Acceptance criteria" only after that check
- [ ] A criterion that cannot be verified keeps its box open, with the reason written as plain text, without square brackets, on the line under it, and is reported to the CTO Chief as an open question instead of handing the plan back as finished
- [ ] Run no `menu` command; hand back to the CTO Chief with the report of the Output section of the executor, the open questions if any, and the note that the completion is the CTO Chief's to hand to the owner
