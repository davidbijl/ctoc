---
title: "The session's instructions: claim a build first, launch its agent only on ok, then stamp; a stop offers no build"
type: implementation
created: 2026-10-11
priority: high
effort: small
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s4-a-requested-stop-offers-no-build
files:
  - src/commands/start.md
  - src/lib/streaming-gate.js
  - tests/the-session-claims-a-build-before-launching-it.test.js
  # RATCHET FILES — not counted toward the ~1–3 budget: this slice CREATES a test file, which
  # moves the test-file count in CLAUDE.md and in README.md's structure block.
  - CLAUDE.md
  - README.md
---

# The session's instructions: claim a build first, launch its agent only on ok, then stamp; a stop offers no build

Slice 5 of 14 of `plans/functional/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`:
the parent's slice 2, scenarios "a promoted build is claimed before its agent exists, and its brief names
the plan in the build" and "the session instructions say what the continuation and the stop do";
decision 4.

## Problem Statement

`src/commands/start.md` tells the session the old order and the old continuation: line 119 (WORK
dispatch) launches the agent and then runs `menu task start`; line 128 says the continuation makes
"approved plans start building"; line 130 launches every promoted task first; lines 132-139 say promote
lists carry "builds the menu already claimed" and that a claimed build is running with no agent id; Rule
13 (line 425) speaks of "builds the continuation started". Since slices 2-4, a build is claimed by `menu
task start <id>` (which moves its plan), the continuation claims none, and a stop offers none. Two code
comments in `src/lib/streaming-gate.js` say the same old thing: lines 2069-2071 ("what it started (a
planner, a classification, a build)") and lines 2277-2279 ("starts approved builds").

## Technical approach — the exact text

All edits are in place; nothing else in the file changes. Old text is quoted as it reads at v6.14.125.

1. **Line 119, WORK dispatch step 2** — append after "show the queued task and its `reason`.":
   " On run, a build (`implement`) is the exception: `menu task start <taskId>` comes FIRST — it claims the build
   and moves its plan into `plans/in-progress/` — and only when it answers `ok` launch its agent, briefed
   with the `planPath` it returns (`plans/in-progress/<slug>.md`), then stamp the agent's id with `menu
   task start <taskId> --agent-id <the harness agent id>`."
   (The section's first `run_in_background` and first `menu task start` stay in step 2's opening sentence,
   so `tests/menu-protocol.test.js` DC-DISPATCH's order check still holds.)
2. **Line 128** — replace "planners and the gate critic's classifications are queued, approved plans start
   building." with "planners and the gate critic's classifications are queued, and at most one approved
   build is queued and offered in `promote[]` — the continuation claims and starts no build itself."
3. **Line 130, step 3** — replace ", launch `Agent(run_in_background)` + `menu task start <id>`." (the
   comma after the parenthetical included) with ": a
   build (`kind: implement`) is claimed FIRST — run `menu task start <id>`, which moves its plan into
   `plans/in-progress/`; only when that answers `ok` launch `Agent(run_in_background)` briefed with the
   `planPath` it returns (`plans/in-progress/<slug>.md`), then stamp the agent's id with `menu task start
   <id> --agent-id <the harness agent id>`; a refused claim launches no agent. Any other task: launch
   `Agent(run_in_background)` + `menu task start <id>`." The rest of step 3 is unchanged, and step 3
   stays ONE line: `tests/dashboard-reconcile-failure.test.js` case 13 (lines 329-347) reads the line
   holding `**Promote.**` and needs "with the concurrent-edit guard applied", "nextRunnable", "MINUS the
   candidates the guard held" and "never start a queued task the scheduler did not return" on it.
4. **Lines 132-138** — replace from "**Every screen that carries `promote[]` is launched the same way.**"
   through "so a build is never launched twice." with: "**Every screen that carries `promote[]` is
   handled the same way.** `stream answer`, `stream approve`, `stream check` and `menu task complete <id>
   --continue` keep the work moving and can return `promote[]` too — planners, the gate critic's
   classifications, and queued builds the scheduler allows (the continuation queues at most one per
   pass and claims none itself). Handle each entry
   exactly as step 3 does. The stamp, `menu task start <id> --agent-id <the harness agent id>`, records
   the agent on a running task whose recorded agent is none or its own id (the claim's placeholder); a
   task that already records another agent's id is refused, so a build is never launched twice. While a
   stop is requested (Stop agent writes `.ctoc/state/drain-stop`), no `promote[]` list offers a build;
   planners, classifications and question precomputes stay on offer." The sentence that follows ("A
   promoted `plan` task whose plan is in `plans/implementation/` …") is unchanged.
5. **Line 423, Rule 12** — after "`run` → dispatch `Agent(run_in_background)` + `menu task start`" insert
   " (a build: `menu task start` first, then its agent, then the stamp)".
6. **Line 425, Rule 13** — replace "(the scheduler's `nextRunnable` set, plus the planners,
   classifications and builds the continuation started) — dispatching each as background work." with
   "(the scheduler's `nextRunnable` set: the planners and classifications the continuation queued, and
   queued builds the scheduler allows, none while a stop is requested) — claiming a build with `menu task start <id>` before
   its agent is launched, and dispatching each as background work."
7. **`src/lib/streaming-gate.js` lines 2069-2071** — "what it started (a planner, a classification, a
   build) rides on the screen as `promote`" becomes "what it queued (a planner, a classification, at most
   one build for the session to claim) rides on the screen as `promote`"; **lines 2277-2279** — "queues a
   planner or a classification, and starts approved builds" becomes "queues a planner, a classification
   or at most one build (never claimed here)". Comments only; no code change.

## Implementation Details

### Dependency Graph

```
tests/the-session-claims-a-build-before-launching-it.test.js --reads--> src/commands/start.md,
     src/lib/menu-screens.js (continuation header, stamp comment), src/lib/task-registry.js (requestDrainStop comment),
     src/lib/streaming-gate.js (two comments)
  --drives--> src/commands/start.js (child process)
```

### File Specifications

- `src/commands/start.md` — MODIFY: items 1-6.
- `src/lib/streaming-gate.js` — MODIFY: item 7 (comments only).
- `tests/the-session-claims-a-build-before-launching-it.test.js` — CREATE.

### Test Plan — `tests/the-session-claims-a-build-before-launching-it.test.js` (written first)

Exact presence and absence checks of instruction text (grep-legitimate: exact strings), plus one run of
the real menu command.

Every presence and absence check runs on the text with each run of whitespace collapsed to one space
(`s.replace(/\s+/g, ' ')`), so line wrapping never decides a result.

1. **the session instructions say what the continuation and the stop do**: `start.md` contains none of
   "approved plans start building", "builds the menu already claimed", "builds the continuation started",
   "A claimed build is already running with no agent id"; the header comment of `continueAfterCrossing`
   (sliced from `function continueAfterCrossing` back to the preceding `/**`) contains neither
   `startAgent` nor "claimed"; the comment above the stamp branch in `taskTransition` does not name
   `continueAfterCrossing`; the `requestDrainStop` comment contains "no new BUILD starts" and not
   "nothing new starts"; the two `streaming-gate.js` comments contain neither "starts approved builds"
   nor "(a planner, a classification, a build)".
2. **start.md says the build recipe**: the COMPLETION section (sliced from its own heading, as
   `tests/menu-protocol.test.js` does) contains "a build (`kind: implement`) is claimed FIRST", "only when
   that answers `ok` launch", "`plans/in-progress/<slug>.md`", "--agent-id <the harness agent id>", "a
   refused claim launches no agent", and "While a stop is requested" with "no `promote[]` list offers a
   build"; in step 3 the claim sentence comes before `Agent(run_in_background)` (index order).
3. **a promoted build is claimed before its agent exists, and its brief names the plan in the build**:
   in a temporary project with plan delta in `todo/` (with `files:`) and a queued build t1 for it (added
   with `menu task add`), run `node src/commands/start.js menu task start t1` as a child process → `ok`,
   `planPath === 'plans/in-progress/delta.md'`, and that file exists before anything else runs.
4. **guard**: `tests/menu-protocol.test.js`'s DC-DISPATCH, DC-COMPLETE and Rule 12/13 checks still pass
   (run in Step 14 with the suite).

### Security Review

- [x] Instruction text only, plus two code comments. No instruction lets a background agent claim,
  force or stamp beyond what the write protection already allows (`menu task start <id> --agent-id`).

### Wiring — the live call sites

`src/commands/start.md` is the file `/ctoc:start` loads for the session; the routes it names (`menu task
start`, the stamp) are the live routes slices 2-4 built.

## Acceptance Criteria

- [x] The two parent scenarios pass as cases 1-3. Evidence: the slice test ran green, 3 of 3 (with `tests/menu-protocol.test.js`: 34 passed, 0 failed).
- [x] The text of items 1-7 is in place word for word (line wrapping aside), as amended by the rulings of fix rounds 1 and 2. Evidence: cases 1 and 2 pin each sentence on whitespace-collapsed text and pass.
- [x] `npm test` passes, `tests/menu-protocol.test.js` unchanged; the test-file counts in CLAUDE.md and
  README.md are updated through the release script's two count functions. Evidence: `npm test` 13227 tests, 13227 passed, 0 failed, 0 skipped, coverage 99.87% (floor 99%), test gate PASS; 571 test files on disk and 571 in both files; this slice did not edit `tests/menu-protocol.test.js` (its uncommitted diff is other slices' plan-file seeding lines, checked with `git diff`).

## Decisions Taken Under Ambiguity

1. **The WORK dispatch recipe (line 119) gets the build exception too**, although the parent names only
   the promote recipe: a session that records a build with `menu task add` (as the parent's own "How this
   round runs in main" does) would otherwise launch first. The exception is appended after the step's
   opening sentence so the existing order test keeps meaning what it says.
2. **The two `streaming-gate.js` comments are corrected here** with the other session texts, because they
   describe the same retired behaviour and slice 3 is at its file budget.
3. **The one-build wording ("one build runs at a time", "at most one build" as a rule of the scheduler) is
   left to slice 14**, so this slice says only what is true once slices 2-4 have landed.

## Execution Plan

### Step 8: TEST
- [x] Write `tests/the-session-claims-a-build-before-launching-it.test.js` (cases 1-3); run it and record that cases 1 and 2 fail on today's text and case 3 passes (slice 2's behaviour).

### Step 9: PREPARE
- [x] Re-read `src/commands/start.md` lines 110-145 and 420-430 and the two `streaming-gate.js` comments as they are now (another plan declares `start.md`).

### Step 10: IMPLEMENT
- [x] `src/commands/start.md`: items 1-6.
- [x] `src/lib/streaming-gate.js`: item 7.
- [x] `CLAUDE.md`, `README.md`: the test-file count lines through the release script's count functions.

### Step 11: REVIEW
- [x] (Round 1: critic 10 findings; round 2: critic 6 findings, both applied.) The critic reads the COMPLETION recipe as a session would, for a promoted build, a promoted planner and a refused claim, and checks that every step can be carried out from the text alone.

### Step 12: OPTIMIZE
- [x] (Rule 13 keeps its protected phrase and points to the recipe; the refusal and stamp sentences are in both the WORK dispatch and COMPLETION recipes by decision 1.) Each instruction is said once; Rule 13 points to the recipe instead of restating it.

### Step 13: SECURE
- [x] (Security round 1 closed slice 3's high finding; S1, S3, S4 applied here; the CTO Chief runs the secrets detector and static scanner on the combined change before the release.) The security scanner confirms no instruction tells a background agent to claim, force or stamp beyond its allowed grammar.

### Step 14: VERIFY
- [x] (13227 of 13227 passed, 0 skipped, coverage 99.87%, test gate PASS; see the final run below.) Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.

### Step 15: DOCUMENT
- [x] (Every replaced sentence is listed under the fix rounds.) The changed text is the documentation; the build record lists each replaced sentence.

### Step 16: FINAL-REVIEW
- [x] (All three acceptance boxes ticked against the evidence recorded with them.) Every acceptance box is checked against its evidence.

## Execution Record

### Step 8: TEST (red)
- Wrote `tests/the-session-claims-a-build-before-launching-it.test.js` (3 cases) and ran it on the unedited text: case 1 FAILED ("start.md still says: approved plans start building"), case 2 FAILED ("the COMPLETION section lacks: a build (`kind: implement`) is claimed FIRST"), case 3 PASSED (slice 2's claim: `menu task start t1` answers ok, `planPath` is `plans/in-progress/delta.md`, the file exists, the stamp is accepted). Case 1 stops at its first failing assertion, so its code-comment checks were not individually shown red; they are checked after the edits.

### Step 9: PREPARE
- Re-read `src/commands/start.md` lines 108-147 and 418-430 and both `src/lib/streaming-gate.js` comments as they stand at v6.14.125 plus the uncommitted edits of slices 1-4; the old text matched the plan's quotes.

### Step 10: IMPLEMENT
- `src/commands/start.md`: item 1 (WORK dispatch step 2 build exception appended), item 2 (continuation sentence), item 3 (promote step 3, still one line), item 4 (the paragraph after step 3, now "handled the same way", with the stamp rule and the stop sentence), item 5 (Rule 12), item 6 (Rule 13). The "claimed build is already running with no agent id" sentence is gone.
- `src/lib/streaming-gate.js`: item 7, the two comments (comments only).
- `CLAUDE.md`, `README.md`: test-file count 567 -> 571 through `updateDocCountsInClaudeMd` and `updateDocCountsInReadme`.

## Decisions Taken Under Ambiguity (build)

4. **Test case 1 checks the stop comment as it is in the code.** The plan's text asks for "no new BUILD starts" in the `requestDrainStop` comment; slice 4 wrote "no list offers a new build" there (a build still starts by an explicit `menu task start`). The case asserts "no list offers a new build" and the absence of "nothing new starts". `src/lib/task-registry.js` is not in this plan's files, so the comment is not touched.

## Decisions (CTO Chief's rulings, fix round 1 of Steps 11-13)

5. **All critic findings C1-C10 and security findings S1, S3, S4 applied** (S2 is covered by C6, S5 by C1/C2). The sentence "and queued builds the scheduler allows," in Rule 13 is kept verbatim because slice 14 rewrites that phrase later. Wording choices inside the rulings: the `decision === "run"` clause keeps its backticks (as the original line had them); the claim recipe's "Only when that answers `ok` launch" and "Never pass --force on a claim unless the owner says so in the current conversation." are separate sentences so the test pins each as written.
6. **What stops a double launch is the claim** (a second claim of a running build is refused), not the stamp; the stamp only records the agent, and a refused stamp means: say so in one line, stop the agent just launched before it edits anything, and leave the build to the recorded agent (S1). The stamp semantics in the text (none, the task's own id, the id already recorded accepted again without a write, any other refused) were checked against the stamp branch of `taskTransition`.
7. **`menu task fail` and `menu task cancel` are named as promote-returning routes** (C8); both were checked in `src/lib/menu-screens.js` to return `promote`.

## Execution Record (fix round 1)

- Test first: the test file was extended (C10: stamp after launch in step 3, the plain "Any other task" recipe, Rule 12 and Rule 13 sliced separately, the joined stop phrase, WORK dispatch and COMPLETION phrases for C1-C9 and S1, S3, S4, and case 3 asserting the plan has left `plans/todo/`). On the unedited text case 2 failed ("the COMPLETION section lacks: a build (`implement` naming a plan) is claimed FIRST"); cases 1 and 3 passed.
- Edited `src/commands/start.md`: WORK dispatch step 2 (C6, C9, C3, S3, S1), COMPLETION step 1 (C1), step 3 (C9, S4, C4, S3, C3), the promote paragraph (C8, S1, C7, C5), the cancel paragraph (C8), Rule 13 (C2).
- Edited `src/lib/streaming-gate.js`: the two comments (C1), comments only.
- Green: `tests/the-session-claims-a-build-before-launching-it.test.js` and `tests/menu-protocol.test.js` together: 34 passed, 0 failed.
- Ratchet consequence: the recipe `menu task add implement <slug> --touches <files>` (C3) now documents the `implement` task kind, so the unexecutable-instruction fence counted one debt entry fewer (`src/lib/task-registry.js::recipe-kind-reverse::implement`) and its "claim your progress" case demanded the ratchet be lowered. `.ctoc/unexecutable-instruction-baseline.json` is outside this plan's `files:`; the write was accepted by the hook and is only the ratchet-down the fence names (`maxDebt` 15 to 14, that key removed). Flagged for the reviewer.
- Full `npm test`: 13228 tests, 13228 passed, 0 failed, 0 skipped; coverage 99.89% (floor 99%); test gate PASS.

## Decisions (CTO Chief's rulings, fix round 2)

8. **Out-of-files write, pending the main session's decision.** `.ctoc/unexecutable-instruction-baseline.json` (`maxDebt` 15 to 14, the `recipe-kind-reverse::implement` key removed) is outside this plan's `files:`, which cannot be edited (approval hash). The write stays: the fence's own "claim your progress" test demands exactly this ratchet-down once the recipe documents the `implement` kind (verified by the critic). The CTO Chief has reported it to the main session for its decision; the decision is pending.
   **Decided (main session, 2026-10-12): YES.** Under the owner's standing rule "decide it yourself", the write to `.ctoc/unexecutable-instruction-baseline.json` (`maxDebt` 15 to 14) stays. A lower debt ceiling tightens the ratchet, and the fence's own claim-your-progress test requires it. Checked on disk: `maxDebt` reads 14.

## Execution Record (fix round 2)

- Review rounds: round 1 - critic 10 findings plus a security warning (S1, S3, S4 in this slice; four neighbours outside it, listed below); round 2 - critic 6 findings (F1-F6), fixed here; security round 1 closed slice 3's high finding.
- Test first: the test file was extended (shared `recipePins` for both recipes, the `agent-recorded` stamp sentence, the cancel recipe, absence of the retired sentences). Red on the unedited text: case 1 failed ("start.md still says: A refused claim launches no agent") and case 2 failed ("the COMPLETION section lacks: A claim that does not answer `ok` launches no agent ..."). Green after the edits: slice test 3 of 3, with `tests/menu-protocol.test.js` 34 passed, 0 failed.
- F1 cancel recipe now names `menu task cancel <taskId>` and its answer `{ taskId, status, cancelled, promote[] }`, and stops the live agent by the id stamped with `--agent-id`. F2 failed-launch summary is `'<slug> build agent launch refused'` with `<slug>` the file name in the returned `planPath`. F3 `reason: "agent-recorded"` stops the just-launched agent; any other refused stamp is shown and the agent left running. F4 "a claim that does not answer `ok`" launches no agent, a scheduler refusal leaves the task queued for a later `promote[]`. F5 `<taskId>` throughout the WORK recipe, resume line "then, on `run`, the build order above (claim, launch on `ok`, stamp)", the no-force sentence in the WORK recipe, and `menu task fail <taskId> --summary '<slug> claim returned no plan path'` for an `ok` claim without a plan path. F6 ", none while a stop is requested" after `promote[]` in COMPLETION step 1.
- Full `npm test` (three runs while the machine load average was 30 to 70): 13228 tests, 13226 passed, 2 failed, 0 skipped; coverage 99.89% (floor 99%); test gate FAIL on the two failures, both wall-clock bounds: "fast mode completes in under 500ms on the live repo" (`tests/iron-loop-enforcer.test.js`, 2.0 s under load) and "a 2-MiB single-char surface is scanned within a strict bound" (`tests/reachability-surface-scan-is-linear.test.js`, 11 to 12 s against 3 s). Alone, the scan file passes 5 of 5, and the enforcer file passed 2 of 3 repeat runs (the third failed at 557 ms against 500 ms), so the enforcer test is flaky at load. The cause being machine load is the evidence above, not proven; this slice changed text and comments only. Fix round 1's run (13228 of 13228) was at lower load.

## Execution Record (final run)

- F1-F6 re-checked in place by reading `src/commands/start.md` (WORK dispatch step 2, COMPLETION steps 1 and 3, the promote paragraph, the cancel paragraph) after the previous builder's edits; none was missing, so no edit was needed. F1 cancel recipe names `menu task cancel <taskId>` and stops the agent by its stamped id; F2 `'<slug> build agent launch refused'`; F3 refusal only on `reason: "agent-recorded"`; F4 "a claim that does not answer `ok`"; F5 `<taskId>`, resume on `run`, the no-force sentence in both recipes, the no-planPath fail line; F6 ", none while a stop is requested".
- Slice test plus `tests/menu-protocol.test.js`: 34 passed, 0 failed.
- Full `npm test` at load average about 10 (the two earlier timing tests are fixed by another slice): 13227 tests, 13227 passed, 0 failed, 0 skipped; coverage 99.87% (floor 99%); corpus claims verified 3, refuted 0; test gate PASS.

## Neighbours for the owner (found in this round, not fixed, outside this slice)

- HIGH, pre-existing: a background agent may run `start.js --live-agent-ids <bogus> menu` (the write protection strips the flag before its check), which marks every build older than 60 seconds dead and lets the continuation queue it again, so a second agent can run on one build. The fix is in the hook and needs the owner's approval.
- MEDIUM: a background agent can claim builds itself with a bare `menu task start <id>`.
- MEDIUM: a background agent can add any task kind with a free-text plan name (including a sync that makes the session commit).
- LOW: `docs/ENFORCEMENT.md` line 340 says a second stamp is refused; the same id is now accepted again.
