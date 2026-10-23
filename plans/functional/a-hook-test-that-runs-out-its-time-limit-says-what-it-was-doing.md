---
title: "A hook test that runs out its time limit says what it was doing"
created: "2026-10-23"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: HIGH
status: refined
depends_on: "none"
acceptance_criteria_count: 12
risk_level: HIGH
---

# A hook test that runs out its time limit says what it was doing

## Problem Statement

On 2026-10-22, during the completion check of the slice "The no-packages check cannot pass vacuously" (built in its own worktree from main 1b1ad5c7), the gated suite failed exactly one test: `tests/protect-records.test.js` line 1881, "169 · a background agent's sweep check is charged to the count: a 64 KB command of folders and runtime words is refused by it". Its row "64 KB of folders and runtime words, background agent, frozen clock: refused by the count" reported "expected exit 2, got null" after 280,111 ms: the spawned hook child ran until the test's own 280-second limit (`spawnWork`, line 1353, `timeout: opts.timeout || 280000`) and was killed, so it gave no verdict and wrote no report. The one-minute load average was about 48 on 18 cores when the run started. The slice does not touch the hook or that test.

Not reproduced in three attempts by the coordinator: the test alone took 1.9 s at a load average of 18; a full gated rerun in the same worktree passed with that test at 2.0 s; the test alone under eighteen processes that stat missing paths in a loop took 2.8 s at a load average of 33. No sleep or wake of the machine is logged in that window. Swap use afterwards was 647 MB of 2 GB. So a 140-fold slowdown of one child is unexplained, and the check record keeps only 4,000 characters of the suite's output (its first 2,000 and its last 2,000), which name no other slow test.

Why it matters: the case freezes the hook's clock on purpose, so the only bound on the child is the count of work (up to about 3.5 million file-system calls, about 2 s normally); anything that makes those calls slow, or makes the child wait, turns into a run that only the test's 280-second limit ends, and the failure then carries no evidence. The owner's rule of 2026-10-18: every failing test, including one that passes on a rerun, is reproduced and root-caused before anything is reported or merged; "flaky" is a finding, never an explanation. Until this is root-caused, that rule holds the merge of the slice above.

Disposition: new work, investigate first. Done when the cause of the 280-second run is found and fixed in the code at fault (the hook or the test), or, if it cannot be reproduced, when every spawned-hook case that can run out its limit reports, on time-out, what the child had done (file-system calls counted, units charged, processor time, the last path looked up) so the next occurrence explains itself; no limit is raised and no assertion is loosened.

### What was read for this refinement

Read on main by the product owner. This agent holds no shell and ran nothing: "read" means the cited lines say what is written here, never that a behaviour was observed. The figures in the paragraphs above (280,111 ms; one-minute load averages of 48, 18 and 33 on 18 cores; 1.9 s, 2.0 s and 2.8 s; 647 MB of 2 GB of swap) are the coordinator's, carried as recorded and not re-measured. "Believed" marks a claim about Node or the operating system that was not checked here; the first build step checks each one before anything is built on it.

1. **The helper every count-bound case spawns through.** `spawnWork` (`tests/protect-records.test.js` lines 1271–1358) writes a preload that counts the resolver's file-system calls (`lstatSync`, `statSync`, `realpathSync` and `readlinkSync` of `src/lib/safe-fs.js`), replaces `Date.now` with a fake clock that moves `stepMs` per call (0 unless the case passes a step, so frozen), counts the units charged to the decision, and writes its report `{ calls, elapsed, spent, charged, bytesRead, zeroReads }` only in a `process.on('exit')` handler (lines 1345–1348). It spawns the hook with `spawnSync` and `timeout: opts.timeout || 280000` (line 1353), then reads the report and keeps `null` when the file is absent (lines 1355–1357). Fifteen cases spawn through it, 161 to 176 without 168 and 175 (search: `spawnWork\(` in that file, one definition, the wrappers `allowedWork` and `refusedWork` at lines 1361 and 1363, and the direct calls in the cases, each read). Only case 173 passes its own limit, 30,000 ms (lines 1965 and 1970).
2. **Case 169** (lines 1881–1897) builds `echo $H; `, then 2,800 pairs `cd d<i>; node s<i>.js; `, then `ls` (over 64 KB), runs it as a background agent with the frozen clock and the default limit, and asserts the work sentence, `report.spent === true` and `report.calls < 3500000`; a control row with 20 pairs keeps the sweep sentence. The row's first assertion is the exit code (`assertRefused`, lines 74–80), so a child stopped by the limit fails as "expected exit 2, got null" before the report is read. Whether that child had written a report, and what it held, was therefore not recorded on 2026-10-22.
3. **What bounds the child.** The hook sets the decision's count to 3,000,000 units and its backstop clock to `Date.now()` plus 60,000 ms (`src/hooks/protect-records.js` lines 258, 263 and 1229–1230). `budgetSpent` (`src/lib/real-path-confinement.js` lines 579–582) reports the budget spent when the units fall below zero or `Date.now()` passes the backstop. Under the frozen clock the backstop never passes, so the count is the only bound, by design (the comment at lines 1740–1742 of the test file: no verdict depends on wall time). In case 169 the work is the background agent's sweep check, `sweepBypassRefusal` (`src/hooks/protect-records.js` lines 1079–1139): each `cd` adds a folder (2,801 in all, each path longer than the one before), and each runtime word looks the next word up in every folder (`resolveLikeNode`, lines 879–891: up to five stats and a real path), charging six units plus the folder path's length at one unit per 64 characters (line 1126). The hook's header lists what is outside the count: Node's start-up, reading the payload, the other shell checks, the text tests and the Unicode fold (lines 171–176); it also lists "a stalled file system" among what it cannot catch (line 181). The charge helpers answer "nothing was counted" when the resolver does not load (`chargeWork` and `confinementSpent`, lines 332–347), and `decide` sets no count then (lines 1226–1231).
4. **The same symptom has been seen before, with a known cause.** The Execution Record of "The settings check counts its work, not the clock" (in review) records case 169 red before its fix in the first review round: "the 64 KB agent command ran until the spawn limit (280 s) with no verdict (status null)", then green, "refused with the work sentence in 1.9 s". Its mutation table turns case 169 red with "budgetSpent ignores cost" and with "the sweep check's lookups uncharged". So a run of case 169 to its limit is exactly what the sweep check looks like when its lookups reach no count.
5. **What a hook that runs out of time does outside the tests.** The resolver's header records that a hook that times out lets the call run (`src/lib/real-path-confinement.js` lines 80–81, the owner's trial of 2026-10-15), and the hook's header says Claude Code's hook time limit is ten times the backstop (line 176). Outside the tests the backstop refuses a decision that is still computing after 60 s; it is checked between steps, so it cannot end a single call that is stuck.
6. **The child inherits the suite's environment.** `spawnWork` passes `{ ...process.env, CLAUDE_CONFIG_DIR: cfg }` (line 1352). `npm test` runs `node --test --experimental-test-coverage --test-coverage-include=src/**` (`src/scripts/test-gate.js` lines 424–428), and the file's `run` helper notes that the inherited environment makes the spawned hooks count toward coverage (line 54). Believed: Node writes a child's coverage file while it exits, after its `exit` handlers have run, so a child can finish its decision and still be busy at exit.
7. **A child stopped by the limit runs no exit handler.** Believed: `spawnSync` ends a child that reaches its `timeout` with a signal on macOS and Linux and with `TerminateProcess` on Windows, and returns `status: null` with an `error` whose `code` is `ETIMEDOUT`; neither way of ending the child runs a JavaScript `exit` handler. A report written only at exit is then never written, which is why the failure of 2026-10-22 carried no evidence.
8. **What the check record keeps.** `OUTPUT_BUDGET` is 4,000 characters (`src/lib/step-13-verify.js` line 396). `boundOutput` (lines 413–419) keeps the first 2,000 and the last 2,000 with a marker naming how many were left out, and runs after every parser has read the whole output (`boundCheckOutputs`, lines 427–432; the order is held by `tests/verify-parses-full-output.test.js`). The record is written by `persistVerifyResult` (lines 938–956), whose one caller, `completeExecution` (`src/lib/actions.js` line 1530), prints "Step 14 VERIFY FAILED" with the result's summary when the check fails (lines 1607–1612). Believed: under `npm test` the last 2,000 characters are the coverage table and the gate's summary lines (`src/scripts/test-gate.js` lines 435–466 print the summary after the suite's output), so a failing test's lines and every test's reported duration fall in the part left out.
9. **Other spawns of the hook with a limit.** `tests/only-the-owner-answers-an-inbox-question.test.js` line 70 spawns the hook with a 30,000 ms limit, no preload and the real clock. The other spawns of the hook in `tests/protect-records.test.js` (`run`, lines 51–62, and the preloads at lines 1555, 1614 and 1635) pass no limit. Search: `protect-records` over `tests/`, 3 files; `timeout:\s*\d` in each of them: the first file at lines 1353, 1965 and 1970, the inbox file at lines 70, 182, 188 and 219 (the last three spawn `bash`, not the hook), the third (`tests/plans-keep-moving-without-the-human.test.js`) none.

## Business Alignment

**Job to Be Done:** When a completion check fails because a spawned hook child ran out its time limit, I want the failure to say what the child had done and the cause to be found and fixed where it lives, so I can merge on evidence instead of on a rerun that happened to pass.

**Impact Map:**
- **Goal:** the parent vision's: CTOC is built through its own menu, and every friction found while doing so is filed as a plan and not worked around. A red check set aside because it "passed on a rerun" is that workaround, and the owner's rule of 2026-10-18 forbids it: every failing test, including one that passes on a rerun, is reproduced and root-caused in the product code before anything is reported or merged, and "flaky" is a finding, never an explanation.
- **Actor:** the owner, Tijn van der Zant, and the CTO Chief, the coordinator and the build agents that run completion checks for him (the vision's target users).
- **Impact:** a hook child stopped by its time limit leaves a failure that says how far it got; the 280-second run ends with a recorded cause, or with a recorded verdict for each hypothesis; a check record names its failing tests and its slowest tests, so one slow test can be told from a slow machine without a rerun.
- **Deliverable:** the reproduction record, with the fix where a cause is found; the time-out evidence in the shared spawn helper of `tests/protect-records.test.js`; the failing-test and slowest-test lists in the check record.

**Alignment checks:**
1. Does the Goal trace to the vision's problem statement? YES. This friction is not one of the vision's ten; it was found on 2026-10-22 while building "The no-packages check cannot pass vacuously" through CTOC's menu, and it is filed under the vision's Source (every dogfooding friction becomes a plan) and its success criterion "Nothing dropped".
2. Is the Actor in the vision's target audience? YES: the CTOC maintainers who build CTOC through its menu.
3. Is the Impact observable? YES: a failure message, a record of runs with a verdict per hypothesis, and two lists in a check record.
4. Is the Deliverable one functional area? YES: what a test run that stops on a time limit leaves behind, and why it stopped.

**Overlap with other plans:**
- "Timing tests run at most once a day, outside the gated suite" (`plans/functional/timing-tests-run-at-most-once-a-day-outside-the-gated-suite.md`) owns tests that assert a measured duration, and moves them out of the gated suite. Its inventory excludes case 169's fake clock (its row E names `tests/protect-records.test.js` line 1813 as "a fake clock's report") and does not list a test's `timeout` option. This plan owns a count-bound test whose safety limit fired: it moves no test out of the gated suite, asserts no duration, and raises no limit. Shared file: `src/lib/step-13-verify.js` (the third story), which that plan also changes.
- "A build runs the tests that read the files it touched; the whole suite runs before a push and at the wave barrier" (`plans/functional/affected-tests-while-building-whole-suite-before-push.md`) also changes `src/lib/step-13-verify.js`. No shared behaviour.
- "A slow tool probe is not reported as a missing tool" has the same pattern, a time-out reported as something else, in other code (the dependency auditor's version probe). No shared file.
- "A plan in review can re-run its check on main" re-runs merged plans' checks on main; the run that failed here was a build worktree's completion check. No shared behaviour.
- "The settings check counts its work, not the clock" (in review) built the count, the backstop and case 169; its record is read above (item 4). This plan changes none of its code unless the owner approves a named change (scenario 4).
- Other open plans also edit `tests/protect-records.test.js`, for example "The kickback count files are protected like the check records", which adds a block of cases to it. Search: `protect-records\.test\.js` (with `spawnWork|OUTPUT_BUDGET|boundOutput`) over `plans/`, 38 files. The narrower search `spawnWork|OUTPUT_BUDGET|boundOutput` over `plans/` matches 3 files: this plan, "The settings check counts its work, not the clock", which built `spawnWork`, and the done plan `plans/done/00071-fg1-false-green-fence.md`; no other plan names the helper or the excerpt.
- Sibling plans by `parent_vision` (search `parent_vision: "vision/ctoc-is-built-with-ctoc.md"` over `plans/`, 20 files): none describes the same behaviour, so no merge or split is proposed.

## User Stories

**As the** owner, **I want** the 280-second run of the write protection's count test reproduced and its cause found and fixed in the code at fault, **so that** a red completion check is explained by evidence, as my rule of 2026-10-18 requires, and is never set aside because a rerun passed.

**As the** owner, or the coordinator reading a red check for him, **I want** a spawned hook child that runs out its time limit to report how far it got (the file-system calls it counted, the units it charged, whether its count was set and spent, the last path it looked up, its processor time), **so that** an occurrence that does not come back on a rerun still explains itself.

**As the** owner, or the coordinator reading a failed completion check, **I want** the check record to name each failing test with the start of its message and the slowest tests of the run with their durations, **so that** I can tell one slow test from a slow machine without running the suite again.

## Acceptance Criteria

No scenario raises a time limit, loosens an assertion or adds a retry, and no test asserts a measured duration: processor time and real time are recorded as evidence and never compared with a bound. Every test this plan adds or changes runs on Windows, macOS and Linux.

### The cause of the 280-second run

- [ ] **Scenario: The failed run's conditions are recreated and every run is recorded**
  Given the time-out evidence of the second story is in place, and case 169's normal figures (file-system calls, units charged, whether the count was spent) are measured on one run of the file at a one-minute load average below the machine's core count
  When the full gated suite (`npm test`, coverage on) runs at least five times in a build worktree, with external load holding the one-minute load average at or above 48 on 18 cores (or the same ratio of load to cores on another machine) from the start of each run
  Then the plan's record holds, for each run, the load average and the swap in use at its start and its end, case 169's verdict, the evidence of every hook child that ran out its limit, and the run's ten slowest tests, and it states either "reproduced", with that evidence, or "not reproduced in N runs under these conditions"

- [ ] **Scenario: Every starting hypothesis ends with a verdict, and none is "flaky"**
  Given the five starting hypotheses of Decision 1
  When the investigation ends
  Then each hypothesis has one verdict in the record: confirmed, with the evidence that shows it; ruled out, naming the evidence item and the value that rule it out; or open, naming the runs tried; and no verdict gives "flaky", "intermittent" or "transient" as the explanation

- [ ] **Scenario: A cause in the test, or in code the hook does not load, is fixed where it lives, proven by a test that failed first**
  Given a confirmed cause in `tests/protect-records.test.js` or in code the hook does not load while deciding
  When the fix is built
  Then a new test that drives that cause by a count or an injected fault, never by a measured time or a sleep, fails before the fix and passes after it; case 169 passes with its 280,000 ms limit, its ceiling of 3,500,000 file-system calls, its three assertions and its control row unchanged; and when the fix changes the test, the record holds the written finding that the test was wrong, with its evidence

- [ ] **Scenario: A cause in the hook's decision code stops the build with a question**
  Given a confirmed cause in a file the hook loads while deciding (Decision 6)
  When the investigation names it
  Then the record holds the cause, its evidence and the exact change proposed, one question naming that change is written for the owner, and no line of those files changes until he approves it

- [ ] **Scenario: A cause outside CTOC's code is recorded with what it means for the protection in use**
  Given a confirmed cause outside CTOC's code (for example one file-system call that stalls, or the machine not running the child)
  When the investigation ends
  Then the record names the cause with its evidence (the child's processor time against its real time, the last path it looked up), states what the hook does under the same cause outside the tests (the 60-second backstop refuses a decision that is still computing; one call stuck past Claude Code's hook time limit lets the tool call through, as the owner's trial of 2026-10-15 measured), and case 169 is unchanged

### A hook child stopped by its time limit says how far it got

- [ ] **Scenario: A child that stops answering in the middle of its decision reports how far it got**
  Given a count-bound row whose hook child is made to stop answering, for good, right after its 1,000th counted file-system call (a wait that never ends, not a sleep), and a time limit injected for that row
  When the time limit stops the child
  Then the row fails with a message that says the child was stopped by its time limit, names the limit, says it gave no verdict, and names the evidence it had recorded: 1,000 file-system calls, the units charged, whether a count was set and whether it was spent, the last path it looked up, and its processor time, real time since its start and resident memory (present as numbers, their values never asserted); and the row reaches that result whatever the machine's speed, because the limit cannot fire before the child has recorded reaching its 1,000th call

- [ ] **Scenario: A child that finished its decision but did not exit says so**
  Given a count-bound row whose hook child reaches its verdict and is then made to stop answering before its process ends
  When the time limit stops it
  Then the failure says the decision finished, names the verdict it reached (its exit code, and refused or allowed) and the counts at that moment, and says the child was stopped after deciding, in words that differ from the message of a child stopped in the middle of its decision

- [ ] **Scenario: The evidence costs a bounded amount of work and changes no verdict**
  Given the 15 cases that spawn the hook through the shared helper (161 to 176, without 168 and 175)
  When they run with the evidence in place
  Then every row passes with its limit, its assertions and its count unchanged, no row is retried, and in case 169's run the child writes at most one record per 1,000 counted file-system calls plus one record for each of its four moments (started, count set, decision finished, exit)

- [ ] **Scenario: A wrong verdict is still reported as a wrong verdict**
  Given a count-bound row whose hook child exits within its limit with a verdict other than the one expected
  When the row is checked
  Then the failure names the expected and the actual exit code and output, as it does today, and says nothing about a time limit

### The check record names the failing and the slowest tests

- [ ] **Scenario: A failed run's record names each failing test with the start of its message**
  Given a suite output in which one test fails with a message that carries a hook child's time-out evidence, followed by hundreds of kilobytes of passing tests and the coverage table
  When the completion check stores its record
  Then the record lists that test's file and name with the first 2,000 characters of its failure message, the 4,000-character excerpt of the output is kept as it is today, and the completion's printed "VERIFY FAILED" line names the failing test

- [ ] **Scenario: Every record names the ten slowest tests of its run**
  Given a suite output whose tests report known durations, passing and failing, in each of the runner's four shapes (TAP or spec, plain or coloured)
  When the completion check stores its record
  Then the record lists the ten slowest tests, slowest first, each with its file, its name and its duration as the runner printed it

- [ ] **Scenario: An output whose tests cannot be read gives an unreadable list, never an empty one, and no verdict changes**
  Given a suite output in a shape the reader does not know
  When the completion check stores its record
  Then each list that could not be read says "unreadable" with its reason, never an empty list, and the check's verdict, its errors and its excerpt are exactly what they are without the lists

## Scope

### In Scope
- The reproduction runs and their record: conditions, figures per run, and a verdict for each starting hypothesis (scenarios 1 and 2).
- The fix where a confirmed cause lives, with a test that fails first, when the cause is in the test or in code the hook does not load (scenario 3).
- For a cause in the hook's decision code, the record and one question to the owner, never the change itself without his approval (scenario 4).
- For a cause outside CTOC's code, the record of what it means for the protection in use (scenario 5).
- The time-out evidence in the shared spawn helper of `tests/protect-records.test.js`: records written by count and at four moments, and failure messages for a child stopped in the middle of its decision and for one stopped after deciding, for all 15 cases that spawn through it (scenarios 6 to 9).
- Two lists in the check record, the failing tests with the start of their messages and the ten slowest tests, and the failing tests in the completion's printed failure line (scenarios 10 to 12), as the recommended answer to the question on the check record.

### Out of Scope
- Tests that assert a measured duration, and where they run: "Timing tests run at most once a day, outside the gated suite".
- A version probe's time-out reported as a missing tool: "A slow tool probe is not reported as a missing tool".
- Re-running a merged plan's check on main: "A plan in review can re-run its check on main".
- Any change to the hook's decision code without the owner's approval of the named change (scenario 4).
- Whether the held slice "The no-packages check cannot pass vacuously" merges if the run is not reproduced: the owner's answer to the question written for this plan.
- The check's verdict, the test gate (`src/scripts/test-gate.js`), the 4,000-character excerpt and the coverage floor: unchanged.
- Not part of this plan, listed for the owner to schedule:
  - The hook spawns outside the shared helper: `run` and the budget preloads of `tests/protect-records.test.js` pass no limit, so a hang there holds the whole suite with no evidence, and `tests/only-the-owner-answers-an-inbox-question.test.js` line 70 passes 30,000 ms on the real clock. None of them freezes the clock or counts its work.
  - A recorder that samples the child on its own cadence (a second thread), to tell a call stuck in the file system from a loop that charges nothing once the last count-driven record is written (Decision 2).

## Risks

### Technical Risks
- The run is not reproduced: three attempts did not reproduce it, and the conditions of 2026-10-22 (the full suite under external load at 48) are only partly in anyone's control.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Build the time-out evidence first, so every reproduction run and every later gated run that stops a hook child carries it, and record each run's conditions (scenario 1).
- The time-out rows depend on the machine's speed: a small fixed limit that fires before the child reaches its stopping point turns the row red on a slow machine, which is the very slowdown under investigation.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Start each injected limit only once the child has recorded reaching its stopping point (scenario 6, Decision 4).
- The records change a verdict or slow the children: writing files inside the counted wrappers adds work that no case's count sees.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Bound the records by count and run all 15 cases with their limits and assertions unchanged (scenario 8).
- The runner's output changes shape and the slowest-test reader reads nothing.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Mark the list "unreadable" with its reason (scenario 12) and test all four shapes (scenario 11).
- The cause is a real stall of the protection in use: a decision stuck in one file-system call past Claude Code's hook time limit lets the tool call through.
  - Likelihood: LOW
  - Impact: HIGH
  - Mitigation: Record what the hook does under the confirmed cause (scenario 5) and put the finding to the owner as a question before anything is changed.

### Business Risks
- The held slice "The no-packages check cannot pass vacuously" stays held for a failure in code it does not touch.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Ask the owner what releases it if the run is not reproduced (the question written for this plan).
- "Flaky" comes back as the explanation once the runs stop failing.
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: Require one verdict per hypothesis, with its evidence, and refuse "flaky", "intermittent" and "transient" as an explanation (scenario 2).

### Dependency Risks
- `src/lib/step-13-verify.js` is also changed by "Timing tests run at most once a day, outside the gated suite" and by "A build runs the tests that read the files it touched; the whole suite runs before a push and at the wave barrier".
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Declare the file in this plan's slices so the scheduler builds the plans one after the other, and re-read it at the start of the later build.
- `tests/protect-records.test.js` is also edited by other open plans, for example "The kickback count files are protected like the check records".
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Declare the file, and number any new case after the file's highest case at build time.
- A cause in the hook's decision code waits for the owner's approval of the named change.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Stop with one question that names the cause, its evidence and the exact change (scenario 4).

## Priority

**Priority: HIGH** (Score: 8/9)
- Dependency: 3 — the merge of "The no-packages check cannot pass vacuously" is held on it, and every completion check runs the 15 cases this plan instruments.
- Business Impact: 3 — the owner's rule of 2026-10-18 holds a merge on an unexplained red check of the write protection, which is the vision's kind of friction exactly.
- Technical Risk: 2 — the evidence and the record are well-understood work; the cause is unknown and may lie in the hook.

## Decisions Taken Under Ambiguity

1. **The starting hypotheses, and the evidence that tells them apart.** In the order they are tried:
   - (a) The sweep check ran with its lookups reaching no count: a resolver that did not load (the charge helpers then answer "nothing was counted" and `decide` sets no count, read item 3), a count that was never set, or a tree without the charges. By reading, the preload loads the same resolver file before the hook does, so the hook's own load of it would find it loaded already; the first of the three routes is therefore the least likely. This hypothesis is tried first, because it alone is a defect in CTOC's code and it matches the recorded symptom exactly (read item 4). Evidence: whether a count was set; units charged and file-system calls far above case 169's normal figures while the count is never spent.
   - (b) The child was starved of processor time by the full suite plus the external load. Evidence: records spread over the whole run, calls below the normal total, processor time near its normal figure.
   - (c) Memory pressure and swap (647 MB of swap in use afterwards). Evidence: resident memory in the records, swap at the start and end of the run. By reading only: the sweep check builds folder paths of thousands of characters for every lookup, so the child allocates and drops much memory.
   - (d) One file-system call stalled (the hook lists "a stalled file system" among what it cannot catch, read item 3). Evidence: the last record far behind the time-out in real time, with the same last path.
   - (e) The decision finished and the child hung at exit, for example while writing its coverage file (read item 6). Evidence: the "decision finished" record with its verdict and the exit record both written, while the test still saw the child stopped by its limit: everything the preload can see ran, and the process did not end (believed, read item 6: the coverage file is written after the `exit` handlers).
2. **The evidence is written while the child works, never only at exit.** A child stopped by its limit runs no exit handler (read item 7, believed). The preload writes a record every 1,000 counted file-system calls and at four moments: started, count set, decision finished (with its exit code), and exit. No timer drives the records: they follow the child's own work, as the case's design requires (no verdict depends on wall time). Each record carries processor time, real time since the start (read from a clock the fake clock does not replace) and resident memory; none of them is asserted. Count-driven records cannot tell a stuck call from a loop that charges nothing after the last record; a recorder on its own cadence would, and it is listed for the owner.
3. **One record per 1,000 calls.** The last path named is then at most 1,000 calls old, and the 2,000-line here-document of case 162, measured at 348,222 calls ("The settings check counts its work, not the clock", its Execution Record), writes about 350 records.
4. **A time-out row starts its limit only once the child has recorded reaching its stopping point.** A small fixed limit would turn the row red on a machine slow enough to miss the stopping point, the slowdown under investigation; a large one would make every run wait it out. The stopping point is a wait that never ends, not a sleep. The mechanism is the implementation planner's; the message the row checks is the one a real time-out produces.
5. **The evidence lives in the shared spawn helper only.** Every count-bound case spawns through `spawnWork`, so one change covers all 15; no hook file changes for the evidence.
6. **"The hook's decision code" is every file the hook loads while deciding:** `src/hooks/protect-records.js`, the hook modules it requires (`src/hooks/PreToolUse.Bash.js`, `src/hooks/PreToolUse.Edit.js`) and the `src/lib/` modules they require, among them `src/lib/real-path-confinement.js` with the count, the backstop and the memory. A change to any of them changes what the write protection decides, which the owner's rule puts under his explicit approval. No approval is asked now for a change nobody has named; scenario 4 asks when the cause is known.
7. **Five gated runs under external load.** The three attempts so far ran the test alone (load 18), the test alone under 18 stat loops (load 33), and one full gated rerun whose load the stub does not record. No attempt is recorded of the full gated suite at the load of 48 that the failed run started under. Five bounds the machine time spent, and from then on the evidence makes every later occurrence explain itself. The external load is made with busy-loop processes, as the linear-scan plan made it.
8. **The stub's "the last 4 KB" is corrected** to 4,000 characters, the first 2,000 and the last 2,000 (read item 8); the coordinator's measured figures are kept as recorded.
9. **The check record gains two lists, read from the whole output before it is cut:** the failing tests (file, name, the first 2,000 characters of the failure message; at most 20 listed, the rest counted) and the ten slowest tests (file, name, the duration as the runner printed it). A list that cannot be read says "unreadable" with its reason. The excerpt, the verdict and the gate are unchanged. This is the recommended answer to the question on the check record; if the owner keeps the record as it is, scenarios 10 to 12 drop, and the reproduction record takes the slowest tests from the printed suite output.
10. **What releases the held slice is the owner's.** If the run is not reproduced, whether "The no-packages check cannot pass vacuously" merges on the investigation record and the evidence, or stays held until the cause is found, is asked in the question written for this plan; the plan does not decide it.
11. **No question is asked about the priority, the record interval, the number of runs, the hypotheses or the wording of the messages:** each has a reason above and review can correct it.
