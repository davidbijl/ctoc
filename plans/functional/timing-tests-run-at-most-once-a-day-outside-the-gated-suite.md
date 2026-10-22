---
title: "Timing tests run at most once a day, outside the gated suite"
created: "2026-10-22"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: HIGH
status: refined
depends_on: "none"
acceptance_criteria_count: 13
risk_level: HIGH
---

# Timing tests run at most once a day, outside the gated suite

## Problem Statement

The gated suite (`npm test`, `src/scripts/test-gate.js`) still holds tests that compare wall-clock times, and machine load makes them fail when the code they time is fine. On 2026-10-22 the operating-lessons build, rebased onto main, failed its gated run on one such test while the machine's one-minute load average was 75 on 18 cores from unrelated compiler processes: `tests/quality-agent-coverage.test.js` line 1186, "a long run of digits in a run's output is read in linear time by the skipped and passed fallbacks" (11.5 ms at 512 thousand digits, 111.2 ms at 2048 thousand, a ratio of 9.7 against a bound of 8). The test passes alone. The two regular expressions it times in `src/lib/quality-agent.js` were measured in processor time at 512, 2048 and 8192 thousand digits (2.0, 7.9, 33.0 ms and 2.6, 9.7, 37.2 ms): the code is linear; the test measures the wrong clock. Every merge waits on such a run, so one loaded machine stops every build.

The owner ruled on 2026-10-18: "do not overdo the timing, make testing fast, do only timing once per day max not every time unless the app is time critical but most are not". On the same day, the ruling recorded in the done plan "The linear-scan check holds under machine load and still fails a quadratic scan" handed the remaining wall-clock ratio tests (`tests/hotfix-check-corpus.test.js` line 733, "the whole-file scanners stay linear on input built against them", and the two tests in `tests/quality-agent-coverage.test.js` from line 1166) to a slice "the remaining wall-clock timing tests measure work". That slice was never filed. One of the seven plans merged from build worktrees, "A plan in the build queue can be sent back to technical planning and keeps its title", recorded a failed check on exactly that hotfix-check-corpus test.

Tests known to read the wall clock (a starting list; technical planning makes the full inventory): `tests/quality-agent-coverage.test.js`, `tests/hotfix-check-corpus.test.js`, `tests/regex-redos-bounded.test.js`, `tests/streaming-gate.test.js` (around line 1318), and the controls file of the linear-scan plan. Two methods are already in the repository: measuring work or processor time instead of wall time (the linear-scan plan's method), and a separate timing run outside the gated suite. The owner's rule decides where timing runs: at most once a day outside the gated suite, every run only when a project setting says the app is time-critical; CTOC never schedules against a wall clock, so "once a day" is keyed on the date of the last timing run, checked when a check starts. No test is loosened: every timing assertion keeps or tightens what it proves; it only moves out of the gated run.

### What was read for this refinement

Read on main by the product owner (`VERSION` 6.14.135). This agent holds no shell and ran nothing: "read" means the cited lines say what is written here, never that a behaviour was observed. Every figure below comes from a named record and was not re-measured.

1. **The gated suite.** `npm test` is `node src/scripts/test-gate.js --experimental-test-coverage` (`package.json` line 11). The gate lists its files with `resolveTestFiles` (`src/scripts/test-gate.js` lines 265–270): a flat read of `tests/`, kept to names ending in `.test.js`, so a file in a folder under `tests/` is never run by it. It runs them in one `node --test --experimental-test-coverage --test-coverage-include=src/**` process (lines 424–428) and fails on any failed test, any skipped test, coverage unmeasured or under the floor, or a counter it cannot read (`evaluateSummary`, lines 176–203). The floor is `minPct` 99 (`.ctoc/coverage-baseline.json`). `npm run test:raw` is `node --test tests/*.test.js` (`package.json` line 12), also flat, and the documented test-file count is a flat count too (`src/lib/doc-counts.js` line 84).
2. **Who runs it.** The completion check runs `npm test` when the project declares a `test` script (`runFallbackChecks`, `src/lib/step-13-verify.js` lines 655–710, the test commands at lines 691–696, called from `runVerify` at line 140). The push check runs the whole suite and blocks the push on a failure (`src/commands/push.js` lines 120–128). The hotfix check runs it through `runFullTests` (`src/lib/hotfix-check.js` line 1861).
3. **The failures and their records.**
   - 2026-10-18, the loaded suite run recorded in "The linear-scan check holds under machine load and still fails a quadratic scan" (its Execution Record, "Step 12: the loaded suite run"): 13667 tests, 3 failed, load average 31 at the start and 116 at the end on 18 cores. All three are wall-clock growth tests: `tests/hotfix-check-corpus.test.js` line 733 (`src/styles/urls.css`: 26.3 ms at size 2048, 230.0 ms at size 8192, 8.7 times as long against a bound of 8), and `tests/quality-agent-coverage.test.js` line 1166 (35.9 ms at 512 KB, 657.6 ms at 2048 KB) and line 1186 (111.8 ms at 512 thousand digits, 1471.6 ms at 2048 thousand). Every processor-time timing test in that run passed.
   - The same plan's ruling of that day (its Decisions, last entry) hands those three tests to a slice "the remaining wall-clock timing tests measure work". The search `timing tests measure work` over `plans/` matches three files, this stub, that plan and the operating-lessons plan below; no plan carries that title, so the slice was never filed.
   - 2026-10-22, the coordinator's Execution Record of "The operating lessons say CTOC is built with CTOC and friction is filed as a plan" (its integration on main): the gated suite on the rebased tree failed one test, line 1186 (11.5 ms at 512 thousand digits, 111.2 ms at 2048 thousand, 9.7 against the bound of 8). It passed alone in 2.3 s at a load average of 75 on 18 cores. The two regular expressions it times, measured in processor time at 512, 2048 and 8192 thousand digits, took 2.0, 7.9 and 33.0 ms and 2.6, 9.7 and 37.2 ms: linear. Those are the coordinator's figures. By reading, the expressions are `src/lib/quality-agent.js` line 615 (the passed fallback) and line 721 (the skipped fallback; the jest form at line 643); each begins with a look-behind `(?<!\d)` that keeps a match from starting inside a run of digits.
   - The build check of "A plan in the build queue can be sent back to technical planning and keeps its title" failed on one test, line 733 of the corpus file, as "A plan in review can re-run its check on main" records (its line 38). That plan read the build record; this refinement did not open it.
4. **The methods already in the repository.**
   - "Timing tests are not failed by machine load" bounds the fast-mode check's processor time (`tests/iron-loop-enforcer.test.js` lines 418–435). The linear-scan plan fits the processor time a child process reports (`tests/helpers/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load.js` lines 227–230).
   - `growth` in `tests/helpers/hotfix-check-harness.js` (lines 388–412) measures this process's processor time over a batch of calls by default (`cpuBatch`, lines 424–434) and refuses a call that returns a promise (lines 428–430). A caller may pass its own cost; "finding 2a" does, reading processor time around an awaited call and taking an idle cost off (`tests/hotfix-check-review-findings.test.js` lines 65–87).
   - Two local wall-clock copies of `growth` remain: `tests/hotfix-check-corpus.test.js` lines 707–728 (synchronous calls) and `tests/quality-agent-coverage.test.js` lines 1139–1164 (asynchronous: the reader is reached through `runFullTests`, which is awaited).
   - Processor time still moves under load, less than the wall clock. With 36 busy-loop processes on 18 cores (load average 53 to 65), the harness's ratios read 4.5 to 6.1 against the bound of 8 for linear readers that read about 4 unloaded; the wall clock had read 12.5 for linear work under the full suite's load (the linear-scan plan, "Batch length per platform" and "Timing helper on processor time"). Fast mode used 1.3 to 1.5 times its unloaded processor time inside the full suite ("Timing tests are not failed by machine load", Round 1).
5. **CTOC's own rule for new tests.** Rule 5 of the unit-test writer (`agents/testing/writers/unit-test-writer.md` line 86, shipped by "The test suite runs faster and never weaker") says to count operations and "never assert a measured time, wall-clock or processor". It governs a test a writer adds or changes. It names no place for a test that only a measured time can prove.
6. **Settings.** `SETTINGS_SCHEMA` (`src/lib/settings.js` lines 32–125) has no timing key. The search `time.?critical|timingRun|timing-run|lastTimingRun` over the repository outside `plans/`, `node_modules/` and `.claude/` finds two unrelated lines (`docs/REALTIME.md` line 271 and one skill). A toggle setting is switched in the menu's System → Settings screen (`src/tabs/tools.js` lines 520–524, rendered from `src/commands/start.js` line 365). `general.timezone` defaults to `UTC` (`src/lib/settings.js` line 40).
7. **The record area.** The check records live in `.ctoc/state/verify/`, one file per plan slug (`src/lib/step-13-verify.js` line 916). The record protection names that folder as a record area (`RECORD_SEGMENT_RE`, `src/hooks/protect-records.js` line 581), and the edit hooks protect it and every path beneath it (`src/hooks/PreToolUse.Edit.js` lines 149–158, `src/hooks/PreToolUse.Bash.js` line 223).

### Every test that reads a clock, and where it goes

This inventory replaces the starting list above. Searches over `tests/`, every match read:
- `process\.hrtime|performance\.now\(`: 10 lines in 5 files.
- `Date\.now\(\)\s*-\s*\w|performance\.now\(\)\s*-|cpuUsage\(\w`: 136 lines in 63 files.
- `-\s*Date\.now\(\)|new Date\(\)\s*-\s*\w|process\.uptime\(|console\.time\(|Date\.now\(\)\s*[<>]=?\s*\w`: 3 lines in 3 files.
- `getTime\(\)\s*-\s*\w+\.getTime|hrtime\(`: 0 lines.
- `cpuUsage|cpuBatch|CPU_TIMED_MS|function growth` and `growth\(`: the processor-time tests and every caller of the three `growth` functions.

Limits: a duration computed under another spelling is not found by these patterns, and a test's `timeout` option (the runner's own hang guard) is not listed. "Under load" names the two records searched, the loaded suite run of 2026-10-18 and the three runs of "Timing tests are not failed by machine load", whose neighbours list named most of rows C and D; "no failure recorded" means no failure in those two records.

The rule each row follows is Decision 1.

**A. Wall-clock growth measurements: measured on processor time and moved to the timing run.**

| Where | What is timed | Bound | Under load | What happens |
|---|---|---|---|---|
| `tests/hotfix-check-corpus.test.js` line 733, "the whole-file scanners stay linear on input built against them" | the whole-file scanners on 20 inputs (lines 735–770), local synchronous `growth` on `process.hrtime.bigint()` | the time at size 4n under 8 times the time at size n | failed 2026-10-18 (8.7) and in the send-back plan's build check | timing run, through the harness `growth` on processor time; the assertions at lines 779 and 781, which read every input once at size 1, stay in the gated file |
| `tests/quality-agent-coverage.test.js` line 1166, "a passing run with a long blank stretch is read in linear time" | `runFullTests` reading a run's output, local asynchronous `growth` on `process.hrtime.bigint()` | same | failed 2026-10-18 | timing run, on processor time with a cost that awaits the call and takes the idle cost off, as finding 2a does; one call at the smallest size with the two assertions of lines 1176–1177 stays gated |
| same file, line 1186, "a long run of digits in a run's output is read in linear time by the skipped and passed fallbacks" | the skipped and passed fallbacks of `src/lib/quality-agent.js` (lines 615, 643, 721) | same | failed 2026-10-18 and 2026-10-22 | timing run, as the row above; a gated case drives both fallbacks with a short run of digits and asserts what `runFullTests` returns (the timed call asserts nothing today, so this only adds) |

**B. Processor-time growth and exponent measurements: moved to the timing run unchanged.**

| Where | What is timed | Bound | Under load | What happens |
|---|---|---|---|---|
| `tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-real.test.js` line 53 | the dead-export scan in 12 child processes, each reporting its processor time; a fitted exponent | under 1.25 | passed at load average 124 | the whole file; 12.1 to 12.5 s alone, 14.8 s inside the suite (its plan's record) |
| `tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-controls.test.js` lines 47, 64, 97, 107, 112 and 125 | the same measure on injected scans, and the harness `growth` on synthetic readers | at or over 1.25 for the injected scans; under or over 8 for the readers | passed at load average 124 | the whole file; 27.4 s alone, 26.1 s inside the suite, the seventh longest file (its plan's record). Its `performance.now()` at lines 118–120 sizes a wait and is never asserted |
| `tests/hotfix-check-review-findings.test.js` line 58, "finding 2a: the first failing test is read from blank lines in linear time" | the failing-run reader, processor time with an idle cost taken off | ratio under 8 | passed under 36 busy loops | timing run; the refusal call and its assertion at lines 84–85 stay gated |
| same file, line 92, "finding 2c: a colour change in a one-line stylesheet is judged in linear time" | the stylesheet rules, harness `growth` | ratio under 8 | passed under 36 busy loops | timing run; the calls through the real route at lines 104–108 stay gated |
| `tests/hotfix-check-guards.test.js` line 183, "round 9: a long path is read in time proportional to its size" | the path reader, harness `growth` | ratio under 8 | passed under 36 busy loops | timing run; one call at the smallest size with the assertion of line 189 stays gated |

**C. A single call under one wide bound: stays in the gated suite, measured on processor time with the same bound.**

| Where | What is timed | Bound | Under load | What happens |
|---|---|---|---|---|
| `tests/regex-redos-bounded.test.js` lines 50–53 | `parseLaunchKpis` on 5000 blank lines, `process.hrtime.bigint()` (lines 34–39) | under 1000 ms | no failure recorded | processor time |
| `tests/streaming-gate.test.js` lines 1317–1322 | `humanPlanName` on a hostile title, `process.hrtime.bigint()` | under 100 ms | no failure recorded | processor time |
| `tests/plan-coverage-coverage.test.js` lines 211–217 | a glob's regular expression on 41 characters, `Date.now()` | under 50 ms | no failure recorded | processor time |
| `tests/opuspack-hooks.test.js` lines 307–314 | the force-push expression on 200,000 spaces, `Date.now()` | under 100 ms | no failure recorded | processor time |
| `tests/shell-write-targets.test.js` lines 132–140 and 142–150 | `classifyWrites` on 100 KiB and on 5000 joined commands, `Date.now()` | under 100 ms each | no failure recorded | processor time |
| `tests/security.test.js` lines 821–824 | `SecretsScanner.scanFile` on a 100,000-character adversarial file, `Date.now()` | under 2000 ms | no failure recorded | processor time |
| `tests/escalation-word-boundary.test.js` lines 771–777 | `validateForReview` on a pathological plan, `Date.now()` | under 5000 ms | no failure recorded | processor time |
| `tests/false-green-fence.test.js` lines 334–338 | `scanSource` on 10,000 lines, `Date.now()` | under 10000 ms | no failure recorded | processor time |
| `tests/capability-registry.test.js` lines 277–281 and 301–305 | `detectLanguages` and `projectTypeFor` on a multi-star marker, `Date.now()` | under 1000 ms (line 265) | no failure recorded | processor time |
| `tests/iron-loop-enforcer.test.js` lines 418–435 | fast mode, already on processor time, with a guard that it starts no process and never sleeps | under 500 ms | passed loaded | unchanged |

**D. A test of a time limit: keeps the wall clock, unchanged.** The property is that a time limit fires and the call comes back; a wait costs no processor time, so only a clock sees it. Each bound sits well above its time limit, and no failure is recorded.

| Where | The time limit | Bound |
|---|---|---|
| `tests/quality-agent-crossplatform.test.js` lines 29–34 | `runCommand` with a 400 ms limit | returns in under 5000 ms |
| `tests/hardware-probe-coverage.test.js` lines 151–164 | the probe with an injected 25 ms cap against the 1500 ms default | under 1000 ms |
| `tests/last-mile-drives-entry-point.test.js` lines 165–175 | a hanging app with a 500 ms limit | under 20000 ms |
| `tests/plan-index-store.test.js` lines 511–516 and 542–550 | stealing a stale lock | under 5000 ms, and under the acquire window |
| `tests/quality-agent-coverage.test.js` lines 1342–1345 | a test run with a 3000 ms limit | under 30000 ms |
| `tests/posttooluse-plan-index-sync-coverage.test.js` lines 312 and 489–490, `tests/w10-plan-index-sync-await.test.js` lines 145 and 203–204 | the hook's sync budget | under the budget plus 10000 ms, and plus 8000 ms |
| `tests/opuspack-hooks.test.js` lines 298–306 | the whole hook process on 200,000 spaces | under 3100 ms: a hang guard around a started process, which only a clock around the start can see; the expression itself is the in-process row of C |
| `tests/app-runner-coverage.test.js` lines 172–179 | a probe that must wait for its 2000 ms timeout | at least 1900 ms: a lower bound, which load can only help |

**E. Not a measured duration: excluded.** Fixture times built as `Date.now()` minus an age, the bulk of the 136 matches (for example 15 lines in `tests/state-coverage.test.js` and 10 in `tests/scheduler-enforced.test.js`); waits for a condition with a deadline (`tests/actions-scheduler.test.js` lines 568–575, `tests/claim-fetcher.test.js` lines 89–96, `tests/hotfix-check-review-findings.test.js` line 244); durations printed and never asserted (`tests/hotfix-check-differential.test.js` line 559, the wall-clock figure at `tests/iron-loop-enforcer.test.js` line 422); a duration inside a fixture program's text (`tests/app-runner.test.js` line 566); a comment (`tests/deployment.test.js` line 279); and a fake clock's report (`tests/protect-records.test.js` line 1813).

## Business Alignment

**Job to Be Done:** When I or a build agent run a check on CTOC while the machine is busy, I want every test in that check to pass or fail on what the code does and not on how busy the machine is, so I can trust a red check, merge on a green one, and still learn within a day when the code got slower.

**Impact Map:**
- **Goal:** the owner's ruling of 2026-10-20 behind the parent vision: CTOC is built through its own menu, and every friction found while doing so is filed as a plan and not worked around. A gated run that fails on machine load pushes the coordinator around the check, by running it again until it passes or by ruling the failure "not ours", which is the workaround the vision exists to remove. It also delivers the owner's standing rule of 2026-10-18 on timing tests, unbuilt since.
- **Actor:** the owner, Tijn van der Zant, and the CTO Chief and background agents that build CTOC for him (the vision's target users); after them, every CTOC user whose project declares a timing command.
- **Impact:** a check run on a busy machine fails only on a real defect; the gated suite does fewer seconds of timing work per run; a speed regression is still found within one day, or on every check for a time-critical app.
- **Deliverable:** CTOC's growth measurements moved into a timing run, started at most once a day by the first check in the main checkout and recorded with its date; the single-call bounds left in the gated suite on processor time; a project setting that runs the timing tests on every check for a time-critical app.

**Alignment checks:**
1. Does the Goal trace to the vision's problem statement? YES. This friction is not one of the vision's ten; it was found on 2026-10-22 while integrating "The operating lessons say CTOC is built with CTOC and friction is filed as a plan", and it is filed under the vision's Source (the ruling that every dogfooding friction becomes a plan) and its success criterion "Nothing dropped".
2. Is the Actor in the vision's target audience? YES: the CTOC maintainers who build CTOC through its menu.
3. Is the Impact observable? YES: a check's verdict under a recorded load, the gated suite's measured processor time, and a timing record that carries a date.
4. Is the Deliverable one functional area? YES: where and when timing tests run.

**Overlap with other plans:**
- Sibling stubs: `plans/functional/ctoc-is-built-with-ctoc-*.md` lists one file, "the background-agent protection is measured before the owner decides"; it touches no test and no check. No overlap.
- "The test suite runs faster and never weaker" (`plans/implementation/the-test-suite-runs-faster-and-never-weaker.md`). The boundary: that plan makes the suite faster by its structure (the hotfix-check split, no npm registry, the test writers' rules, all three done; hooks in the test's own process and repository scans once per file, both recorded as not built after the measurement of 2026-10-13). It leaves the test gate, the coverage floor and the zero-skipped rule unchanged, and it lists "the suite's failures under heavy load" as not addressed. This plan owns exactly that: which tests are timing tests, where and when they run, and the time-critical setting. No file is shared with its open slices (`tests/helpers/hook-in-process.js`, `tests/security-enforcement-evasion.test.js`, `tests/security-gate-bypass.test.js`, `tests/export-reachability.test.js`, `tests/unexecutable-instruction-fence.test.js`). Its rule 5 for test writers forbids processor time as well as the wall clock; Decision 16 says how this plan stands to it.
- "A plan in review can re-run its check on main" re-runs merged plans' checks on main, one of which failed on the corpus timing test. This plan removes that test from the gated run; it does not decide how the earlier failure is handled.
- "A build runs the tests that read the files it touched; the whole suite runs before a push and at the wave barrier" (`plans/functional/affected-tests-while-building-whole-suite-before-push.md`) changes `src/lib/step-13-verify.js`, which this plan also changes; the two are built one after the other.

## User Stories

**As the** owner, or the CTO Chief or a build agent running a check for him, **I want** the gated suite to hold no growth measurement and no clock assertion that machine load can fail, **so that** a check run on a busy machine fails only on a real defect and does less work.

**As the** owner, **I want** the timing tests to run at most once a day, started by the first check of the day in the main checkout, with a failure kept in front of me until a passing run replaces it, **so that** a speed regression is still found within a day without slowing every check.

**As the** owner of a time-critical app, **I want** one project setting that runs the timing tests on every check and fails the check when they fail, **so that** that app's speed is held like any other requirement.

## Acceptance Criteria

### The gated suite holds no load-sensitive timing

- [ ] **Scenario: A busy machine does not fail the gated suite on timing**
  Given the change is built, and the machine's one-minute load average is at least twice its core count at the start of the run (ambient load, or the busy-loop load the linear-scan plan used)
  When `npm test` runs
  Then no test of rows A and B of the inventory runs in it (none of their names appears in its output), every row C test passes, and the load average at the start and at the end is recorded beside the result

- [ ] **Scenario: Moving the timing tests out costs no coverage and adds no skip**
  Given `npm test` run once on the base commit and once on the change
  When their coverage reports are compared
  Then the change's run reports coverage at or above `minPct` 99 and 0 skipped, and no line of `src/` that the base run covered is uncovered in the change's run

- [ ] **Scenario: Every assertion keeps or tightens what it proves**
  Given the assertion map recorded in the plan, which gives each assertion of rows A, B and C its old file and line and its new file and line
  When the map is checked against the files
  Then every assertion appears word for word in its new place, except the clock read of rows A and C, which reads processor time with the same bound (8 for the ratios, the same milliseconds for row C) and carries its written reason, and every behaviour assertion that row A and B name as staying gated runs in `npm test`

- [ ] **Scenario: A measurement moved to processor time still fails a quadratic reader**
  Given a scratch copy in which the reader that a row A test times is made quadratic
  When the converted test runs
  Then it fails its bound of 8, and on the unchanged copy it passes

- [ ] **Scenario: The gated suite does less work**
  Given one `npm test` run on the base commit and one on the change, on the same machine, each with its load average at the start and at the end recorded
  When their processor time (user plus system time of the whole run) is compared
  Then the change's processor time is lower, and the record names each run's longest file with its duration from the runner's output

### The timing run, at most once a day

- [ ] **Scenario: The first check of a new day starts the timing run once**
  Given a project in its main checkout that declares a timing command (for CTOC, `npm run test:timing`, which runs `tests/timing/*.test.js`), with the time-critical setting off and no timing record, or one dated before today's UTC date
  When a completion check or a push check starts and its gated suite passes
  Then the timing run starts once, its record (date, passed or failed, test counts, failing test names, reason) is written to `.ctoc/state/verify/timing/last-run.json`, the check prints one line with the timing run's result, and the check's verdict is the same as it is with a passing timing run

- [ ] **Scenario: Later checks the same day do not run it again, even after a failure**
  Given a day on which a timing run already started in the main checkout, and passed or failed
  When another check starts there the same day, including one that started at the same moment as the first
  Then no second timing run starts that day, a failed record is never run again by a check to make it pass, and each later check prints the recorded result

- [ ] **Scenario: A failed timing run stays on the menu until a passing run replaces it**
  Given the last timing record says failed
  When the owner opens the menu
  Then the main screen shows one line with the record's date and the name of each failing test, and the line stays until a timing run passes, either the next day's or one started from the menu's route that runs the timing run now and writes the record the same way

- [ ] **Scenario: A build worktree or a hotfix check never starts the timing run**
  Given the time-critical setting is off and no timing record is dated today
  When a check starts in a linked git worktree of the project, or a hotfix check starts in the main checkout, and its gated suite passes
  Then no timing run starts and no timing record is written

- [ ] **Scenario: A broken or slow timing run is a failure, never a pass**
  Given a timing command whose output has no readable fail or skipped counter, or that reports a skipped test, or that does not finish within the check's per-command limit (900 s by default)
  When the timing run ends
  Then its record says failed with a reason that names which of the three happened (no readable counter, a skipped test, or the time limit), and the menu line of the failed-run scenario shows that reason

### A time-critical app

- [ ] **Scenario: The setting is off by default and switched in the menu**
  Given a project whose `.ctoc/settings.json` holds no timing setting
  When the owner opens System → Settings and the Workflow tab
  Then the toggle "Time-critical app: run timing tests on every check" shows OFF, and switching it writes `workflow.timeCriticalApp: true` to that file

- [ ] **Scenario: With the setting on, every check runs the timing tests and a failure fails the check**
  Given the setting is on and the project declares a timing command
  When a completion check or a push check starts, in the main checkout or a worktree, on any day, and its gated suite passes
  Then the timing run runs, and when it fails the check fails with the failing test names in its reasons

- [ ] **Scenario: A time-critical project with no timing command fails loudly**
  Given the setting is on and the project declares no timing command
  When a check starts
  Then the check fails with the reason "the project is marked time-critical but declares no timing command", never a pass

## Scope

### In Scope
- The inventory's rows applied: rows A and B moved to `tests/timing/`, row A on processor time, with the behaviour assertions each row names left in the gated files; row C on processor time in place; rows D and E unchanged (scenarios 1 to 5).
- CTOC's timing command, `npm run test:timing`, running `tests/timing/*.test.js` with its counters read fail-closed and 0 skipped required (scenarios 6 and 10).
- The start of the timing run in the completion check and the push check: main checkout only, at most once per UTC day, claimed before it runs, never by the hotfix check, and with no effect on the check's verdict while the time-critical setting is off (scenarios 6, 7 and 9).
- The timing record at `.ctoc/state/verify/timing/last-run.json`, inside the record area the protection already names (scenarios 6 to 8).
- One line on the menu's main screen for a failed timing run, and a menu route that runs the timing run now (scenario 8).
- The setting `workflow.timeCriticalApp` and what it does (scenarios 11 to 13).
- The before-and-after record: coverage, skipped count, processor time, longest file, assertion map and the quadratic-reader runs (scenarios 2 to 5).

### Out of Scope
- The test gate's logic (`src/scripts/test-gate.js`), the coverage floor and the zero-skipped rule: unchanged. The moved files leave the gated run through the gate's existing flat file list.
- Splitting files for speed, the npm registry, hooks in the test's own process, scans once per file and the test writers' rules: "The test suite runs faster and never weaker".
- How a merged plan's earlier failed check is handled on main: "A plan in review can re-run its check on main".
- Not part of this plan, listed for the owner to schedule:
  - The wording of the test writers' rule 5, which forbids processor time as well as the wall clock and names no place for a test that only a measured time can prove (Decision 16).
  - Timing commands for projects that are not Node projects (pytest, go, cargo): no convention exists yet (Decision 13).
  - Replacing the real waits of row D's time-limit tests with fake timers.
  - A fence test that fails when a gated test file reads `process.hrtime` or `performance.now` (Decision 18).

## Risks

### Technical Risks
- Coverage drops: a behaviour assertion left in a gated file does not reach a line of `src/` that only the large timed input reached, and the gated run falls under 99.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Compare the uncovered lines of `src/` per file on the base commit and on the change (scenario 2), and add a gated behaviour case for any line that moved out, before the move lands.
- Processor time still moves under load: the harness ratios rose from about 4 to 6.1 against the bound of 8 under 36 busy loops, and fast mode used 1.3 to 1.5 times its unloaded processor time inside the full suite.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Record each row C test's processor time in one loaded `npm test` run, and move any test above a fifth of its bound to the timing run (Decision 15).
- The timing step changes a check's verdict by mistake: a timing failure folded into the completion check's checks, or a timing run counted as a substantive check, would pass or fail a check on the wrong evidence.
  - Likelihood: LOW
  - Impact: HIGH
  - Mitigation: Test the completion check and the push check through their real routes with the same gated result and a passing, a failing and a missing timing run, and assert the verdict for each (scenarios 6 and 12).
- The asynchronous conversion of the two `quality-agent` tests measures other work the process does while the call is awaited.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Take the idle cost off as finding 2a does, and run the quadratic-reader check on each converted test (scenario 4).
- Two checks in the main checkout start the timing run together.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Claim the day in the record with an exclusive create before the run starts (Decision 9, scenario 7).

### Business Risks
- A real speed regression is merged and found up to a day later, by the next daily run, without blocking the merge. This is what the owner's rule of 2026-10-18 accepts ("do only timing once per day max not every time unless the app is time critical").
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Keep a failed run on the menu's main screen until a passing run replaces it (scenario 8); a time-critical app turns the setting on and blocks on every check (scenario 12).
- The owner's rule of 2026-10-18 on failing tests says a failing test is root-caused before anything is merged; a failed daily timing run that does not block lets merges go on while its cause is unknown.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Ask the owner which rule governs a failed daily timing run (the question written for this plan, Decision 10), and never run a failed record again the same day to make it pass (scenario 7).

### Dependency Risks
- "A build runs the tests that read the files it touched; the whole suite runs before a push and at the wave barrier" also changes `src/lib/step-13-verify.js`.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Declare `src/lib/step-13-verify.js` in this plan's slices so the scheduler runs the two one after the other, and re-read the file at the start of the later build.
- The test writers' rule 5 forbids processor time as well as the wall clock; a writer applying it to a row C test later would move the bound to an operation count, which a regular expression's work does not expose.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Name the rule and this plan's reason in a comment above each converted row C test, and list the rule's wording for the owner (Decision 16).
- The record of the send-back plan's failed build check was read by "A plan in review can re-run its check on main", not by this refinement.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Rely on the two failures this refinement read (2026-10-18 and 2026-10-22) for the plan's case; the third is corroboration only.

## Priority

**Priority: HIGH** (Score: 7/9)
- Dependency: 2 — no plan declares it in `depends_on`, but every plan's completion check and every push runs the gated suite that holds these tests.
- Business Impact: 3 — a loaded machine stops every merge (2026-10-18 and 2026-10-22), and the owner's rule of 2026-10-18 is unbuilt.
- Technical Risk: 2 — known methods (processor time, a flat file list, a dated record); the new parts are a step in two checks, a setting and a menu line.

## Decisions Taken Under Ambiguity

1. **The rule for each row of the inventory.** A growth, ratio or exponent measurement (several timed runs at two or more sizes, seconds of work) goes to the timing run. A single call under one wide bound stays in the gated suite, measured on processor time with its bound unchanged. A test of a time limit keeps the wall clock, unchanged. Reasons: every recorded load failure was a wall-clock growth measurement (2026-10-18, 2026-10-22); the growth measurements are the costly ones (the corpus file was the longest file of the suite in the linear-scan plan's record, the two linear-scan files 12.5 s and 27.4 s alone); the owner's rule says timing at most once a day and no heavy statistical proofs; the single calls are cheap guards against catastrophic backtracking whose bounds stand far above their work, and on processor time a busy machine's waiting no longer counts against them; a time limit can only be seen on a clock, because a wait costs no processor time. The CTO Chief's brief allows a conversion to processor time that stays gated where it proves the same property; row C is that case.
2. **Row A is measured on processor time as well as moved.** The daily timing run is started by a check, often while other builds load the machine, so a wall-clock failure there would be noise that must still be root-caused. The linear-scan plan's ruling of 2026-10-18 asked for these three tests to measure work. The corpus test, whose calls are synchronous, takes the harness `growth` with its default cost; the two `quality-agent` tests, whose calls are awaited, take a cost that reads processor time around the awaited call and takes the idle cost off, as finding 2a does, because the default cost refuses a call that returns a promise.
3. **The timing tests live in `tests/timing/`.** The gate's flat file list (`src/scripts/test-gate.js` lines 265–270), the flat glob of `test:raw` and the flat documented count (`src/lib/doc-counts.js` line 84) all leave a subfolder out. So `src/scripts/test-gate.js` is not edited, no test is skipped, and the moved files leave the documented test-file count, which `node src/scripts/release.js` syncs and `tests/readme-numbers.test.js` holds. `src/lib/golden-corpus-scan.js` line 338 reads `tests/` recursively for test sources and will still see them; the implementation planner reads what it does with them.
4. **CTOC's timing command.** `npm run test:timing` runs a Node script that lists `tests/timing/` itself (no shell glob, so it works on Windows), runs `node --test` on the files, and fails on any failed or skipped test or a counter it cannot read, reading the counters as `parseFail` and `parseSkipped` in `src/scripts/test-gate.js` do. The timing run measures no coverage; coverage stays the gated suite's job (Decision 20).
5. **Which checks start it.** The completion check (`runVerify`) and the push check (`src/commands/push.js`), each after its gated suite passed: a suite that failed fails the check anyway, and timing broken code proves nothing. Not the hotfix check: its route is the urgent one and stays short, and its change is timed by the next day's run. The implementation planner lists every route that runs the whole suite by the call graph, not by a text search.
6. **"A day" is the UTC calendar date at the moment the check starts.** The settings schema's `general.timezone` defaults to `UTC`; this plan does not read it. Reading the date when a check starts is a key, not a schedule: nothing runs without a check.
7. **Only the main checkout starts the daily run.** A check in a linked git worktree, whose `.git` is a file, never starts it while the setting is off. Reason: CTOC builds every plan in a fresh worktree, which would hold no record and would start a timing run on every build; and main is what ships. Costs: a day with no check in the main checkout has no timing run; a project kept as a git submodule, whose `.git` is also a file, never runs it with the setting off.
8. **The record is `.ctoc/state/verify/timing/last-run.json` in the main checkout.** That folder is inside the record area the protection and the edit hooks already name, so no hook changes; a subfolder cannot collide with a plan's record, whose name is a slug. It holds the date, passed or failed, the test counts, the failing test names and the reason in plain words, never the run's output.
9. **The day is claimed before the run starts,** with an exclusive create, so two checks that start together run it once. A record dated today, passed or failed, is never run again by a check that day: running a failure again until it passes is a flaky pass (the owner's rule of 2026-10-18).
10. **A failed daily timing run does not change the check's verdict while the setting is off,** as the recommended answer to the question written for this plan; the check prints it and the menu keeps it on the main screen. Reason: the owner's rule takes timing tests out of the gated suite, and blocking every check on a red daily run would bring back the stalls that rule was made to end. If the owner chooses the other option, scenarios 6 and 7 change to: while the last record says failed, every check fails with the failing test names, until a timing run passes.
11. **The time-critical setting** is `workflow.timeCriticalApp`, a toggle, default off, labelled "Time-critical app: run timing tests on every check". With it on, every completion and push check, in a worktree too and on any day, runs the timing run after its gated suite, and a failure fails the check. Reason: the owner's words "not every time unless the app is time critical" make timing, for such an app, part of every check like the suite. No environment profile sets it.
12. **A time-critical project with no timing command fails the check,** the way the completion check refuses to pass when nothing could run (`runVerify`, `src/lib/step-13-verify.js` lines 151–159). A setting that promises timing and runs nothing is the silent pass the red lines forbid.
13. **A project's timing command is a declared `test:timing` npm script,** found the way the completion check finds `test`, `lint` and `typecheck` (`src/lib/step-13-verify.js` lines 677, 685 and 692). Projects that are not Node projects have no convention yet; listed for the owner.
14. **The timing run's time limit is the check's per-command limit** (`resolveVerifyTimeout`, 900 s by default, `src/lib/step-13-verify.js` lines 727–735); a run that reaches it is a failed run.
15. **Row C is checked once, not proven statistically.** Each converted test keeps its bound; its processor time in one loaded `npm test` run is recorded; any test above a fifth of its bound goes to the timing run instead. A fifth leaves room for the 1.3 to 1.5 times inflation recorded inside the full suite.
16. **The test writers' rule 5.** It governs a test a writer adds or changes and forbids processor time as well as the wall clock. This plan changes existing tests under the CTO Chief's rulings in "Timing tests are not failed by machine load" and the linear-scan plan, which chose processor time, and leaves rule 5's wording unchanged; whether rule 5 should name the timing run, and allow a single wide bound on processor time, is listed for the owner.
17. **The menu shows a failed record on its main screen** in one line, and offers a route that runs the timing run now and writes the record the same way: a fix must be confirmed by a run, and the module must be reachable by a human, not only by a check. The route's name is the implementation planner's.
18. **No fence test is added.** The test writers' rule 5 already keeps new timing assertions out, and a presence check of `process.hrtime` and `performance.now` would miss a duration taken with `Date.now()`; listed for the owner.
19. **Every figure in this plan comes from a named record and was not re-measured.** The 2026-10-22 figures are the coordinator's, in the Execution Record of "The operating lessons say CTOC is built with CTOC and friction is filed as a plan".
20. **How coverage stays at or above the floor.** Coverage counts the lines of `src/` that the gated run executes. Every moved measurement leaves in its gated file a behaviour case that drives the same code with a small input and keeps that code's assertions (the "what happens" column of rows A and B): the corpus test's reads at size 1, a short blank stretch and a short run of digits through `runFullTests`, the refusal calls of findings 2a and 2c, and the smallest long path. The two linear-scan files move whole; the dead-export scan they time stays driven in the gated suite by `tests/reachability-surface-scan-is-linear.test.js`, which calls `analyzeExports` at lines 63–64 and 80–82 and is not moved. Scenario 2 then checks, line by line, that nothing covered before is uncovered after, and the gated run must stay at or above 99 with 0 skipped.
