---
title: "A plan in review can re-run its check on main"
created: "2026-10-22"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: HIGH
status: refined
depends_on: "none"
acceptance_criteria_count: 13
risk_level: HIGH
---

# A plan in review can re-run its check on main

## Problem Statement

A plan that is built in its own git worktree gets its quality check (Step 14 VERIFY) when its build task is completed (`menu task complete` on the implement task, which runs `completeExecution` in `src/lib/actions.js` and `runVerify` in `src/lib/step-13-verify.js`). The result is written to `.ctoc/state/verify/<slug>.json` inside that worktree, a folder git ignores. When the branch is merged to main, the plan file arrives in main's `plans/review/`, but main has no check record for it, so the menu cannot let it finish on its checks: the move from review to done reads that record.

Seven merged plans are in this state today, each with its record only in its build worktree:

- Opening the menu in a fresh worktree writes no stray half-filled IRON_LOOP.md
- Surviving mutants from mutation testing have a recorded place in the plan
- Send-backs from review and security rounds count toward the three-per-step limit
- A plan in the build queue can be sent back to technical planning and keeps its title
- The pre-build check accepts a slice that edits a file an earlier slice creates
- The vision stubs screen names each stub by its title, not by the shared vision prefix
- The classification brief for the gate critic carries the plan file modification time

No menu route runs a plan's check again: the check runs only inside the completion of a build task. Copying a record from a worktree is not allowed (only CTOC's menu code writes the check records) and would say nothing about main. The owner chose on 2026-10-22 to add a menu route that re-runs the check for a plan in review on main and records fresh evidence, so these plans, and every later plan merged from a worktree, finish on main's own state. The build worktrees are kept until this lands.

### What the code says today

Read on main by the product owner for this refinement (the `VERSION` file says 6.14.135). This agent holds no shell and ran nothing: "read" means the cited lines say what is written here, never that the behaviour was observed. The scenarios below, which drive the real menu, are the runs that confirm it.

1. **One writer, one caller.** A check record is written only by `persistVerifyResult` (`src/lib/step-13-verify.js` lines 938–956). It runs `runVerify` on the project root it is given (lines 115–171: the project's lint, type check and test scripts, plus the app-launch check) and writes `.ctoc/state/verify/<slug>.json` with `planSlug`, `timestamp`, `passed`, `method`, `checks`, `errors` and `summary`. Search: pattern `persistVerifyResult\(` over `src/`, 2 files: the definition and its one caller, `completeExecution` (`src/lib/actions.js` line 1530).
2. **The completion is reached only through a build task, and the seven have none on main.** `completeExecution` is called by `completeTaskPlan` (`src/lib/actions.js` lines 1825–1891), which `menu task complete <id>` calls only for an `implement` task (`src/lib/menu-screens.js` lines 2945–2948). `completeTaskPlan` accepts a plan already in `plans/review/`, but only through such a task. Main's task registry `.ctoc/state/tasks.json` holds no `implement` task for any of the seven: pattern `"plan": "ctoc-is-built-with-ctoc` gives 9 lines, every one a `plan` task, and no `"kind": "implement"` entry names one of them. A new build task cannot be claimed for them either: a claim refuses a plan that is not in the build queue (`src/lib/actions.js` lines 1382–1383).
3. **The completion does more than record.** `completeExecution` re-runs the pre-review validation and counts a refusal as a send-back against the plan's steps (lines 1484–1502), moves the plan (line 1513), settles the build task or warns that none was found (lines 1552–1602), and starts a review-preparer status (line 1616). None of that belongs to a plan that is already in review. A failed check is counted as one send-back to the quality check, Step 14 (`recordStepKickback(newPath, 14, root)`, line 1612).
4. **Where the seven records are.** On main, `.ctoc/state/verify/` holds no record for any of the seven (glob `.ctoc/state/verify/ctoc-is-built-with-ctoc-*.json`: 0 files). Each build worktree holds one (glob `.claude/worktrees/build-*/.ctoc/state/verify/*.json`: 7 files). Five say `passed: true`. Two say `passed: false`: the send-back plan's, in `.claude/worktrees/build-send-back` (one failing test, the timing test "the whole-file scanners stay linear on input built against them" in `tests/hotfix-check-corpus.test.js`), and the classification-brief plan's, in `.claude/worktrees/build-classification-brief`. So even a copy would have finished at most five.
5. **A copy is refused and would not hold.** The check records are write-protected (`docs/ENFORCEMENT.md` lines 245–246; `src/hooks/protect-records.js`, `RECORD_SEGMENT_RE`, line 581). The review-to-done check refuses a record older than the plan file (`src/lib/plan-validator.js` lines 1411–1427), and the merge wrote the plan files on main after the worktree runs (believed: git sets a file's modification time when it writes the file; not measured here).
6. **What else the finish needs, and the seven have it.** The menu finishes a built plan on its evidence only inside the continuation (`continueAfterCrossing`, `src/lib/menu-screens.js` lines 3124–3174), run by the session's `menu task complete <id> --continue`, `stream answer` and `stream approve`. It goes through `crossOnEvidence` (`src/lib/streaming-gate.js` lines 763–802), which needs a passing review-to-done validation (every required step 8–16 checked and a fresh passing record), an approval entry that ends at `todo`, no hold, and no question for the owner. All seven approval entries on main end at `todo` (`.ctoc/approvals/<slug>.json`, `"stage_to": "todo"`, read for each). No question file exists for their review stage (glob `.ctoc/streaming/questions/*ctoc-is-built-with-ctoc-*`: only `functional__` and `implementation__` files), so their question status reads "not computed" (`src/lib/streaming-precompute.js` line 760), which the finish accepts (`src/lib/streaming-gate.js` line 1160). The steps of one of the seven, the classification-brief plan, were read and are all checked; the other six were not read.
7. **The background-agent rules for the completion.** The protection lets a background agent run `menu task add …`, `menu task start <id>` and `menu task complete <id>` within their grammar, and refuses `menu task complete <id> --continue` (`TASK_GRAMMAR`, `src/hooks/protect-records.js` lines 711–719; `subagentMayRunRoute`, lines 772–787; `docs/ENFORCEMENT.md` lines 498, 504 and 505). The grammar checks no task kind: `add` takes one or two positional words. These refusals are off today by the owner's order of 2026-10-15 (`RECORD_REFUSALS_OFF`, line 1170), so today a background agent is refused neither.
8. **A related route is already approved, and it refuses this case.** "A revised finished plan's checks run again from its own screen" (`plans/todo/a-finished-plan-can-be-sent-back-for-a-text-only-revision-s5-the-checks-run-again.md`, in the build queue) adds `stream run-checks review/<file>.md`, which calls `persistVerifyResult` for a plan sent back from done for a text revision and then runs the continuation. It refuses a built plan in review by design ("A built plan's check record is its build's completion's to write; this route must not become a second way to refresh one"), its test case J6 asserts that refusal, and its decisions reject a task kind for its own case. It does not cover this plan, and this plan does not change it.
9. **Every task kind needs a recipe.** `src/lib/unexecutable-instruction-scan.js` (lines 354–405) reports a task kind in `KINDS` (`src/lib/task-registry.js` lines 155–158) that no `src/commands` recipe documents.
10. **What the session's recipe says about evidence today.** `src/commands/start.md` line 186: "Never re-run or overwrite the evidence to make it green."

## Business Alignment

**Job to Be Done:** When a plan built in its own worktree has been merged into main and sits in review with no check record on main, I want to run its quality check again on main through the menu, so I can let it finish on main's own evidence without copying a file, working around the menu, or asking the owner to approve it by hand.

**Impact Map:**
- **Goal:** CTOC is built entirely through its own menu, with no by-hand workaround (the parent vision's one-sentence summary). This friction was found on 2026-10-22, after the vision's list of ten frictions of 2026-10-20; it is filed under the vision's ruling that every friction found while building CTOC with CTOC becomes a plan, not a workaround.
- **Actor:** the CTO Chief's coordinator session that drives the menu for the owner and merges build worktrees into main, and the owner, Tijn van der Zant, who reads which plans finished. Both are in the vision's target users.
- **Impact:** after a worktree build is merged, the session runs the menu's re-check and the plan either finishes on its checks or stays in review with an honest failure. Observable: zero records copied by hand, zero merged plans waiting in review for a record that can never appear on main, and the seven listed plans each carrying a record written on main.
- **Deliverable:** a `recheck` task kind: recorded with `menu task add recheck <slug>` for a plan in `plans/review/`, started with `menu task start <id>`, whose `menu task complete <id>` runs the full check on this copy and records it through the completion's own writer; plus the session's recipe for it.

**Alignment checks:**
1. The Goal traces to the vision's problem statement (workarounds route around the pipeline): yes.
2. The Actor is in the vision's target users (the owner and the CTO Chief and agents that build for him): yes.
3. The Impact is observable (a plan's folder, a record file, the completion's text): yes.
4. The Deliverable is one functional area (re-running and recording the quality check of a plan in review): yes.

**Overlap check.** The sibling functional plans of this vision were read. "The kickback count files are protected like the check records" protects the count files a failed re-run adds to; it does not re-run checks. "The background-agent protection is measured before the owner decides whether it is on" decides whether the background-agent refusals come back on; this plan changes no hook and only has to fit the grammar either way. Outside this vision, "A revised finished plan's checks run again from its own screen" (item 8 above) is the nearest plan; the split is that its route serves a plan sent back for a text revision and refuses a built plan, and this plan serves a built plan merged into main.

## User Stories

**As** the coordinator session that merges a plan's build from its worktree into main, **I want** to run that plan's quality check again on main through the menu, **so that** the plan gets a check record from main's own state instead of being stuck in review or copied by hand.

**As** the owner, **I want** a failed re-run recorded as a failure, the plan kept in review, and a recorded failure never run again until it passes, **so that** no plan finishes on a check that did not pass on main and no failing test is hidden by a lucky rerun.

**As** the owner, **I want** a plan whose re-run passed to finish on its checks when no question needs me, and the seven merged plans to get their records on main, **so that** merged plans reach done without my approving each one by hand.

**As** the owner, **I want** the re-run to follow the same rules as a build's completion for background agents, and two re-runs never to run at once, **so that** no protection changes and one suite run never disturbs another.

## Acceptance Criteria

### Running the check again on main

- [ ] **Scenario: A merged plan's check runs again on this copy and is recorded**
  Given a temporary project whose `plans/review/` holds a built plan with every step 8–16 checked, an approval entry that ends at `todo` and no check record in `.ctoc/state/verify/`, and whose test script exits 0
  When the session runs `menu task add recheck <slug>`, then `menu task start <id>`, then `menu task complete <id>`, each through the real menu entry `node src/commands/start.js`
  Then `.ctoc/state/verify/<slug>.json` exists with the fields a build's completion writes (`planSlug`, `timestamp`, `passed`, `method`, `checks`, `errors`, `summary`), says `passed: true`, and its `timestamp` is not older than the plan file's modification time
  And the plan file is still in `plans/review/`, byte-identical
  And the completion's text names the plan by its title and says its checks were run again on this copy and passed, with no time of day and no gate number in it

- [ ] **Scenario: Only a plan in review has its check run again**
  Given a plan of the same shape in `plans/todo/`, one in `plans/in-progress/`, one in `plans/done/`, a name with no plan file, and a name holding a path separator or `..`
  When the session runs `menu task add recheck <name>` for each
  Then each is refused with one sentence that says where the plan is, or that no plan of that name is in review, or that the name is not a plain plan name
  And no task is recorded, and no file under `.ctoc/state/verify/` is created or changed
  And for a plan moved out of `plans/review/` after its recheck task was recorded, `menu task complete <id>` is refused with the same sentence, writes no record and leaves the task running, its text naming `menu task fail <id>`

- [ ] **Scenario: A record in a build worktree is never read or copied**
  Given the plan of the first scenario, a record for the same name at `.claude/worktrees/build-example/.ctoc/state/verify/<slug>.json` that says `passed: true`, and a project test script that exits 1
  When the recheck task is recorded, started and completed
  Then main's record says `passed: false`, names the failing test check in its `errors`, and has a `timestamp` different from the worktree record's
  And the worktree record is byte-identical

- [ ] **Scenario: A plan whose checks already passed on this copy is not run again**
  Given a plan in review whose record on this copy says `passed: true` and is not older than the plan file
  When the session runs `menu task add recheck <slug>`
  Then it is refused with one sentence saying the plan's checks already passed on this copy, so it finishes on the next continuation unless something holds it
  And the record is byte-identical and no task is recorded

- [ ] **Scenario: A passing record older than the plan's last change is run again**
  Given a plan in review whose record says `passed: true` but is older than the plan file
  When the recheck task is recorded, started and completed
  Then the record is replaced by the new run's record, whose `timestamp` is not older than the plan file

### A failure stays a failure

- [ ] **Scenario: A failed re-run is recorded as a failure and the plan stays in review**
  Given the plan of the first scenario and a project test script that exits 1
  When the session runs `menu task complete <id> --continue` on its started recheck task
  Then the record says `passed: false`
  And the plan is still in `plans/review/` and its approval entry still ends at `todo`
  And the completion's text says the checks FAILED, names the failing check, and says the failure was counted: 1 of a limit of 3 send-backs to the quality check and 1 of a limit of 5 for the plan, as a failed check at a build's completion is counted
  And `menu task list` shows the task done with a result that is not ok

- [ ] **Scenario: A recorded failure is never run again to make it pass**
  Given a plan in review whose record on this copy says `passed: false`, and a recheck task for it recorded and started before that record was written
  When the session runs `menu task add recheck <slug>`, and when it runs `menu task complete <id>` on the earlier task
  Then both are refused with one sentence saying a failed check is not run again to turn it green, and that the way on is to send the plan back or for the owner to approve it
  And the record is byte-identical and no send-back is counted

### Finishing on main

- [ ] **Scenario: A plan whose re-run passed finishes on its checks**
  Given the plan of the first scenario, with no question stored for it and no hold
  When the session runs `menu task complete <id> --continue` on its started recheck task
  Then the plan is in `plans/done/`
  And its approval entry is a pipeline entry from review to done whose evidence names `.ctoc/state/verify/<slug>.json` and ends "crossed on evidence, not approved by the human"
  And the completion's text names the plan by its title among the plans that finished on their checks

- [ ] **Scenario: A plan that needs the owner does not finish**
  Given the plan of the first scenario with a question that goes to the owner stored for `review/<file>.md`, and, in a second run, the same plan held by the owner
  When its re-run passes and the session runs `menu task complete <id> --continue`
  Then in both runs the plan stays in `plans/review/` with its passing record, and its approval entry still ends at `todo`

- [ ] **Scenario: A re-run completed without the continuation moves nothing**
  Given the plan of the first scenario
  When its recheck task is completed with `menu task complete <id>` and no `--continue`
  Then the record is written and the plan stays in `plans/review/`
  And the session's later `menu task complete <id> --continue` on that done task runs no check again (the record's `timestamp` is unchanged) and finishes the plan

- [ ] **Scenario: The seven merged plans get their records on main**
  Given main after this plan is itself in `plans/done/`, with the seven plans listed in the Problem Statement in `plans/review/`, no check record for them on main, and their build worktrees still in place
  When the coordinator session runs the recheck for each through the menu, one at a time, each completion with `--continue` (never the build agent of this plan and never a test: `--continue` is the session's call, and the build proves the recheck on the temporary-project scenarios above)
  Then each of the seven has a record on main written by that run, with a `timestamp` different from its worktree record's
  And each whose record passed is in `plans/done/`, and each whose record failed is still in `plans/review/` and is named by its title, with its failing check, in the session's status line

### Same rules as a build's completion

- [ ] **Scenario: A background agent has the completion's rules, with no hook change**
  Given the protection's background-agent grammar (`TASK_GRAMMAR` in `src/hooks/protect-records.js`, the allowed table in `docs/ENFORCEMENT.md`)
  When the recheck's calls `menu task add recheck <slug>`, `menu task start <id>` and `menu task complete <id>` are read by the menu's own `parseTaskArgs`
  Then each uses only a sub-command, a number of positional words and flags that the grammar already allows, and the only recheck call that carries `--continue` is the session's, as for a build
  And `src/hooks/protect-records.js` is byte-identical to its state before this plan
  And the allowed-table row of `docs/ENFORCEMENT.md` for `menu task complete <id>` names a recheck task's fresh check record beside a build's

- [ ] **Scenario: Two re-runs never run at once, and one plan gets one**
  Given a started recheck task for one plan
  When the session records a recheck for a second plan, and a second recheck for the first plan
  Then the second plan's task is queued, and `menu task start <id>` on it is refused by the scheduler until the first completes
  And the second call for the first plan names the existing task and records no new one

## Scope

### In Scope
- The `recheck` task kind in `KINDS` (`src/lib/task-registry.js`): `menu task add recheck <slug>` records it only for a plan in `plans/review/`, `menu task start <id>` starts it through the scheduler, and its `menu task complete <id>` runs the full check on this copy through `persistVerifyResult` and records it ("A merged plan's check runs again on this copy and is recorded", "A passing record older than the plan's last change is run again").
- Its refusals, at the recording and again at the completion, each writing nothing: a plan not in review, a name that is not a plain plan name, a recorded failure, a fresh passing record ("Only a plan in review has its check run again", "A plan whose checks already passed on this copy is not run again", "A recorded failure is never run again to make it pass").
- Never reading a build worktree's record ("A record in a build worktree is never read or copied").
- A failed re-run counted as one send-back to the quality check, through the same circuit-breaker call a build's completion makes ("A failed re-run is recorded as a failure and the plan stays in review").
- The finish through the existing `menu task complete <id> --continue` continuation, unchanged ("A plan whose re-run passed finishes on its checks", "A plan that needs the owner does not finish", "A re-run completed without the continuation moves nothing").
- One re-run at a time, and one live recheck task per plan ("Two re-runs never run at once, and one plan gets one").
- The session's recipe in `src/commands/start.md`: when to run a recheck (after a plan's build is merged from a worktree), that it needs no agent (the session starts and completes it itself), that its completion runs the full suite and is run in the background when the suite may take longer than 10 minutes, and how a queued recheck in `promote[]` is handled. The recipe is required: the unexecutable-instruction scan reports a task kind no recipe documents ("A background agent has the completion's rules, with no hook change").
- The allowed-table row of `docs/ENFORCEMENT.md` for `menu task complete <id>`: it names a recheck task's fresh check record beside a build's. A documentation line; the hook is not changed.
- Running the recheck on the seven listed plans once this is built, by the coordinator session through the menu ("The seven merged plans get their records on main").
- The build worktrees under `.claude/worktrees/build-*` (`build-send-back`, `build-surviving-mutants`, `build-fresh-worktree`, `build-send-backs-count`, `build-pre-build-check`, `build-vision-stubs`, `build-classification-brief`) are kept until this plan is built and the seven re-runs have run. Nothing in this plan removes them.

### Out of Scope
- Copying, reading or moving a check record from a build worktree: never done. The records are write-protected and a worktree's record says nothing about main.
- `stream run-checks review/<file>.md` from "A revised finished plan's checks run again from its own screen": not changed by this plan. It stays the route for a plan sent back for a text revision and keeps refusing a built plan, as its own test case J6 says.
- `src/hooks/protect-records.js` and its background-agent grammar: not changed; the recheck fits the grammar as it stands.
- How a plan crosses from review to done (`crossOnEvidence`, `validateReviewToDone`) and which routes run the continuation: not changed.
- The circuit breaker's limits, and counting send-backs from review and security rounds: "Send-backs from review and security rounds count toward the three-per-step limit".
- Whether the background-agent menu refusal is switched back on: "The background-agent protection is measured before the owner decides whether it is on".
- One check run that records several plans at once: not built by this plan; the owner schedules it if he wants it.
- Finding the cause of the timing test that failed in the send-back plan's worktree (`tests/hotfix-check-corpus.test.js`): a finding listed for the owner to schedule, not fixed here.
- Removing the build worktrees after the seven re-runs: the owner's call.

## Risks

### Technical Risks
- A re-run on main fails on a test that has nothing to do with the plan, such as the timing test that already failed in the send-back plan's worktree under machine load.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Run one re-run at a time (the scheduler rule above), name the failing check in the completion's text and the session's status line, and list the failing test for the owner as a finding; never run the check again to turn it green.
- Main's working tree holds uncommitted edits, or a merge lands while the suite runs, so the record describes a mixed state.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Write into the recipe that a recheck runs only after the merge is committed and while no build runs in main's own checkout (builds run in their worktrees).
- The recheck is a second caller of the check-record writer, so a defect in it could let a plan finish on a record that does not describe a real run.
  - Likelihood: LOW
  - Impact: HIGH
  - Mitigation: Test that the record's verdict follows the fixture project's real test script (exit 0 passes, exit 1 fails), that the route takes no record or path argument, and that `persistVerifyResult` is the only write.
- The plan file changes after its re-run, so its passing record goes stale and the finish refuses it.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Rely on the existing staleness check in `validateReviewToDone`, and admit a stale passing record to a new re-run ("A passing record older than the plan's last change is run again").

### Business Risks
- Some of the seven do not finish because their re-run fails on main; two of their worktree records already failed.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Report each of the seven by its title with its verdict; a failed one takes the existing way on (a send-back, or the owner's approve), and its build worktree is still in place.
- A re-run becomes a way to retry a failing check until it passes, against the owner's rule that a test passing on a rerun is a finding.
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: Refuse a re-run of a plan whose record on this copy failed, which removes the retry path the likelihood rests on ("A recorded failure is never run again to make it pass"), and count every failed re-run toward the plan's send-back limit.

### Dependency Risks
- "A revised finished plan's checks run again from its own screen" (in the build queue) declares `src/lib/menu-screens.js`, `src/commands/start.md` and `docs/ENFORCEMENT.md`, which this plan's build will also edit; there is no dependency edge between them, and its chain (the send-back command, then the text-only check) can be built now.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Build the two one after the other, in either order (the order is the owner's); the second re-reads both at its Step 9. A plan sent back for a text revision whose record is absent or stale is admitted by both routes; both write the same record through the same writer, so this is named and left as it is.
- Fences that move with a new task kind and a new test file: the unexecutable-instruction scan (a kind with no recipe), `tests/task-registry.test.js` (pins `KINDS` members and that it is frozen), and the documented test-file counts in `CLAUDE.md` and `README.md`.
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Declare `src/commands/start.md` and the count files in the implementation plan, and run those fences at its Step 14.
- If the owner switches the background-agent refusals back on, a recheck call outside the grammar would be refused.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Test the three calls against the grammar the protection already lists ("A background agent has the completion's rules, with no hook change").

## Priority

**Priority: HIGH** (Score: 8/9)
- Dependency: 3 -- the seven merged plans cannot finish on main until this exists, and their seven build worktrees are kept until it lands.
- Business Impact: 3 -- core to the vision's goal: without it the only ways on are a hand copy of a protected record or the owner approving each plan by hand.
- Technical Risk: 2 -- moderate: one task kind, one completion branch, one recipe and one documentation row; the writer, the scheduler and the continuation already exist.

## Decisions Taken Under Ambiguity

1. **A task kind, not a new route.** The recheck is a task kind under `menu task`, so its calls are the completion route's own calls. The protection's grammar for a background agent already allows `menu task add` with one or two positional words, `menu task start <id>` and `menu task complete <id>`, and refuses `--continue`; it checks no kind. So a background agent's use of the recheck matches the completion route's rules with no line of the hook changed, and the finish still runs only inside the existing `menu task complete <id> --continue`, so the list of routes that run the continuation does not grow. A new route with its own continuation would have been a fourth such route, a change to how a plan crosses that would need the owner. A new route without one would leave the session nothing to run the continuation on.
2. **Not `stream run-checks`.** "A revised finished plan's checks run again from its own screen" chose a `stream` sub-command and no task kind for its case: the owner's own act on his plan's screen, one synchronous call. This case differs. There is no screen act: the session re-runs after a merge. And that plan's own principle, "a built plan's check record is its build's completion's to write", holds here, because a recheck is a completion. Its route refuses a built plan in an approved test case (J6); widening it would reverse an approved plan.
3. **The name is `recheck`.** "verify" is taken by the `inbox verify` screen of possibly-stale plans; "quality" is the specialist round kind, whose completion runs no check.
4. **The writer is `persistVerifyResult`, never `completeExecution`.** The owner asked for the same record the completion writes, never a copied file. `persistVerifyResult` is that writer and that record. `completeExecution` is a build's path (pre-review validation with a send-back against the steps, a move, a build-task coupling, a review-preparer status) and needs a build task, which main lacks for the seven.
5. **A failed re-run counts as one send-back to the quality check.** The completion counts a failed check with `recordStepKickback(planPath, 14, root)` (`src/lib/actions.js` line 1612); the recheck makes the same call for the same event. The circuit breaker and its limits are unchanged.
6. **A recorded failure is not re-run.** `src/commands/start.md` line 186 says "Never re-run or overwrite the evidence to make it green", and the owner's rule of 2026-10-18 makes a test that passes on a rerun a finding, never an explanation. The way on from a failed record stays what it is today: a send-back, or the owner's approve. The sibling route for a plan sent back for a text revision does run again after a failed record; that is its approved design for a plan whose text changed after its last check, not a rule for a built plan's evidence.
7. **A fresh passing record is not re-run.** It would cost a full suite run and could change nothing the finish reads; the refusal says the plan finishes on the next continuation unless something holds it. A passing record older than the plan file is re-run, because the finish refuses it as stale.
8. **How long the check may run.** `runVerify`'s own budget, unchanged (`CTOC_VERIFY_TIMEOUT_MS`, default 15 minutes per check command, `src/lib/step-13-verify.js` lines 28–37). The recipe tells the session to run the completion call in the background when the suite may take longer than 10 minutes, and never to wait in a sleep loop.
9. **One re-run at a time.** Two full suites on one copy at once share its files and load the machine, which is exactly when the timing test failed. The menu gives every recheck task the same fixed scheduler reservation itself, so the scheduler's existing file-conflict rule runs them one after another. It is never a `--touches` argument the session types, because the protection refuses a menu argument that names the check records whenever its record refusals are on (`menuArgsNameRecords`, `src/hooks/protect-records.js` lines 660–665). A second recheck for the same plan returns the live one, as a second build task for a plan does (`taskAdd`, `src/lib/menu-screens.js` lines 2434–2448).
10. **The name is checked before any path is built.** The completion of a recheck refuses an unsafe name with the same guard `completeTaskPlan` uses (`classifyCompletionFault` and `isSafePlanSlug`), before any file is read.
11. **A refusal at the completion leaves the task running.** As for a build whose plan file is missing (`src/lib/menu-screens.js` lines 2979–3009): nothing is recorded, and the text names `menu task fail <id>`. A refusal never settles the task as done, because no check ran.
12. **No agent for a recheck.** Nothing in it needs judgement: the session records, starts and completes it itself, and the recipe says so for a recheck that comes back in `promote[]`.
13. **Words.** The completion's text names the plan by its title, says "run again on this copy", says whether the checks passed or FAILED, names the failing check, gives the send-back count as the round send-backs do, and carries no time and no gate number. The exact sentences are the implementation plan's.
14. **Tests.** Real temporary projects whose `package.json` test script exits 0 or 1, as `tests/ctoc-audit-w05-verify-evidence.test.js` does, driven through the spawned menu entry; nothing in CTOC is mocked. The scenario on the seven plans is run on main by the coordinator session through the menu after this plan is in `plans/done/`, and reported to the owner; it is not a box the build agent ticks.
15. **No owner question.** The design changes no hook and no rule of how a plan crosses: the record has the same writer, the finish is the existing continuation on the existing route, and the background-agent rules are the existing grammar. The owner already decided that the re-run exists and that a plan whose re-run passed finishes. An empty question list is written for this plan.
