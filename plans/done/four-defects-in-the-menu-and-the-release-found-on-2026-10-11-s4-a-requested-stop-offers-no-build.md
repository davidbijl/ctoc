---
title: "While a stop is requested, no promote list offers a build"
type: implementation
created: 2026-10-11
priority: high
effort: small
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s3-the-continuation-claims-no-build
files:
  - src/lib/menu-screens.js
  - src/lib/task-registry.js
  - src/lib/actions.js
  - tests/a-requested-stop-offers-no-build.test.js
  # RATCHET FILES — not counted toward the ~1–3 budget: this slice CREATES a test file, which
  # moves the test-file count in CLAUDE.md and in README.md's structure block.
  - CLAUDE.md
  - README.md
---

# While a stop is requested, no promote list offers a build

Slice 4 of 14 of `plans/functional/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`:
the parent's slice 2, scenario "while a stop is requested, no list offers a build", decision 12, and the
`requestDrainStop` comment.

## Problem Statement

`computePromote` (`src/lib/menu-screens.js` line 2178) ignores the drain stop, while Start agent honours
it (`src/lib/actions.js` lines 1828-1834) and `requestDrainStop` promises "existing work finishes, nothing
new starts" (`src/lib/task-registry.js` lines 1221-1223). Reproduced on 2026-10-11: with the stop
requested, a completion with `--continue` still listed a queued build in `promote[]`; since slice 2, the
session's `menu task start` on that entry really starts the plan. Every `promote[]` list is built by
`computePromote`: the cancel (line 2239), the fail (2309), the completion (2546), the continuation (2601
and 2643) and `stream check` (2694); `stream approve` and `stream answer` pass on the continuation's list
(`src/lib/streaming-gate.js` lines 2098 and 2294).

## Technical approach

### `computePromote(reg, root)` (`src/lib/menu-screens.js` line 2178)

Gains a second parameter, `root`. After the existing guard and id filter, when
`taskRegistry.isDrainStopRequested(root)` is true, every entry whose `kind` is `implement` is removed from
`promote` and added to `quarantined` as `{ id, reason: 'stop-requested', summary: 'a stop is requested,
so no new build starts until it is cleared' }` (a held candidate is returned, never silently dropped — the
function's own rule, lines 2171-2173). Planners (`plan`), classifications (`classify`) and question
precomputes (`precompute`) — every non-build kind — stay on offer, as far as the scheduler allows. The
doc comment says so in one paragraph giving the rule's reason in short (the only code that clears a stop
is a forced Start agent, which also claims a build, so holding every kind would stall planning with no
way to resume it that does not start a build; this plan's decision, four-defects plan decision 12 — not
an owner decision, so the comment attributes it to no one else), and adds:
"`task-reconcile.reconcileState` builds its own promote list without this filter; no caller reads it
(`src/lib/menu-screens.js` line 572 and `src/tabs/tools.js` line 417 read only `report`)."

All six calls pass `root`: lines 2239, 2309, 2546, 2601, 2643, 2694 (each already has `root` in scope).

### `requestDrainStop` comment (`src/lib/task-registry.js` lines 1221-1223)

"Request a graceful drain-stop: existing work finishes, and no new BUILD starts — no `promote[]` list
offers a build and an unforced Start agent starts none. Planners, classifications and question
precomputes stay on offer: the only thing that clears a stop is a forced Start agent, which also claims
a build, so holding them back too would stall planning with no way to resume it short of starting a
build (this plan's decision: four-defects plan, decision 12). A forced Start agent clears it. Persists
by creating the flag file `.ctoc/state/drain-stop`. Idempotent." No code change in this file. The
comment names no owner: decision 12 sits in the parent's "Decisions Taken Under Ambiguity", it is not
an owner decision.

### Stop agent's message (`stopAgent`, `src/lib/actions.js` line 1933)

With nothing running, the message today reads "Stop requested. No plan is currently running; nothing
new will start." Once a stop holds back builds only, "nothing new will start" is false (planners,
classifications and precomputes still start). It becomes:

`'Stop requested. No plan is currently running; no new build will start.'`

The running-plans variant ("Stop requested. Will finish current plan(s): …, then stop.", line 1932)
makes no claim about new work and stays as it is. No other change in this file.

## Implementation Details

### Dependency Graph

```
menu-screens.computePromote --calls--> task-registry.isDrainStopRequested (existing export)
taskTransition (cancel, fail) / taskComplete / continueAfterCrossing / streamCheck --call--> computePromote(reg, root)
tests/a-requested-stop-offers-no-build.test.js --drives--> route (menu task …, stream …), src/commands/start.js
```

### File Specifications

- `src/lib/menu-screens.js` — MODIFY: `computePromote` signature, filter and doc comment; the six calls.
- `src/lib/task-registry.js` — MODIFY: the `requestDrainStop` comment only.
- `src/lib/actions.js` — MODIFY: `stopAgent`'s nothing-running message only (line 1933), to
  "Stop requested. No plan is currently running; no new build will start."
- `tests/a-requested-stop-offers-no-build.test.js` — CREATE.

No existing test pins the old message text: a search for `nothing new will start` over `tests/` matched
0 files, and for `No plan is currently running` over `tests/` matched 0 files (2026-10-11). The tests
that touch `stopAgent` (`tests/actions-scheduler.test.js` line 285 matches only the running plan's name;
`tests/area-modules.test.js` and `tests/dashboard-survives-unreadable-registry.test.js` stub it) need no
change.

### Test Plan — `tests/a-requested-stop-offers-no-build.test.js` (written first)

Fixture: a temporary project; `.ctoc/state/drain-stop` written with `taskRegistry.requestDrainStop`;
four queued tasks the scheduler would allow at once (disjoint files): a build (`implement stopped-build
--touches src/s.js`, with `plans/todo/stopped-build.md` present), a planner (`plan p`), a classification
(`classify functional/c.md --touches .ctoc/streaming/questions/functional/c.md`), a question precompute
(`precompute functional/d.md --touches .ctoc/streaming/questions/functional/d.md`).

1. **while a stop is requested, no list offers a build** — one case per path, each in a fresh project:
   a completion with `--continue` of a running `review` task; `menu task fail` of a running `review`
   task; `menu task cancel` of a queued `review` task (frees nothing, still returns a list) and of a
   running one; `stream answer` of a classified fork question; `stream approve` of a functional plan;
   `stream check` of a plan with an author's unclassified questions; and the plain completion without
   `--continue` (`computePromote(settled)`, `src/lib/menu-screens.js` line 2546): `menu task complete`
   (no flag) of a running `review` task — `promote` holds no implement entry; the build's id is in
   `quarantined` with reason `stop-requested`. On each: `promote` holds no
   `implement` entry and holds the planner, the classification and the precompute (by id); on the five
   `menu task` paths the build's id is in the result's `quarantined` with reason `stop-requested` (the
   `stream` screens carry `promote` only, as today); the build is still `queued` and its plan still in
   `todo/`.
2. **once the stop is cleared, the build is offered again**: `taskRegistry.clearDrainStop(root)`; the next
   completion with `--continue` lists the build in `promote`.
3. **without a stop nothing changes**: the same registry with no flag → the build is in `promote` and no
   `quarantined` entry carries `stop-requested` (guard: the result shape of the existing tests stays).
4. **the reproduction runs through the real menu command**: in a temporary project with the stop
   requested and a queued build, `node src/commands/start.js menu task complete <id> --continue` (a
   running `review` task) as a child process → its JSON `promote` lists no build.
5. **Stop agent says no new build will start**: in a temporary project with no running `implement` task,
   `actions.stopAgent(root)` → `message` equals exactly "Stop requested. No plan is currently running; no
   new build will start." and does not contain "nothing new will start"; with one running `implement`
   task for plan `run-a`, `message` equals exactly "Stop requested. Will finish current plan(s): run-a,
   then stop." (guard: the running variant is unchanged).

### Security Review

- [x] Reads one flag file through the existing `isDrainStopRequested`; no new write, no new input.
- [x] Holding work back never weakens a gate; the scheduler is unchanged.

### Wiring — the live call sites

`computePromote` is called by every route that returns `promote[]`: `menu task cancel|fail|complete`
(`taskTransition`, `taskComplete`), the continuation (on `menu task complete --continue`, `stream approve`,
`stream answer`) and `stream check` (`streamCheck`) — all reached from `src/commands/start.js`.

## Acceptance Criteria

- [x] Scenario "while a stop is requested, no list offers a build" passes on all eight paths, and the
  build is offered again once the stop is cleared.
- [x] The `requestDrainStop` comment says that no new build starts and that planners, classifications
  and precomputes stay on offer, gives the reason, and attributes the rule to no owner.
- [x] With nothing running, Stop agent's message reads "Stop requested. No plan is currently running; no
  new build will start." (case 5); the running-plans message is unchanged.
- [x] `npm test` passes; the test-file counts in CLAUDE.md and README.md are updated through the release
  script's two count functions.

## Decisions Taken Under Ambiguity

1. **A build held by the stop is reported in `quarantined` with reason `stop-requested`.** The function
   already returns every held candidate there instead of dropping it; a separate field would be a second
   channel for the same fact. A route adds `quarantined` to its result only when non-empty (lines
   2241, 2319, 2556), so results without a stop are byte-identical.
2. **The task start itself still neither reads nor clears the stop** (parent, In Scope, slice 1): the
   owner can still start a build by hand during a stop; only the offers stop.
3. **Stop agent's nothing-running message changes to "no new build will start"** (`src/lib/actions.js`
   line 1933). "Nothing new will start" became false once the stop holds back builds only. The
   running-plans variant makes no claim about new work and is kept. The parent's decision 12 still
   quotes the old text as one of its reasons; that quote describes the code as it was when the decision
   was taken and is not edited from this slice.
4. **Stop agent's nothing-running message is narrowed again, by the CTO Chief's ruling (not the owner's), with the
   security finding as the reason.** The stop is checked when a promote list is built, not when a build starts
   (decision 2, which the CTO Chief keeps), so "no new build will start" is not true: a build still starts by an
   explicit start. The message reads "Stop requested. No plan is currently running; no new build will be offered
   until the stop is cleared." and the test that pins it changed to that exact text. This is a correction for
   truth, not a weakening of the test. It supersedes the text in decision 3, in the third acceptance box and in
   case 5 of the test plan; those lines are part of the approved spec and are not edited, so the box was ticked
   against the corrected text. The same ruling narrowed the two source comments and the held entry's summary
   ("held back: a stop is requested, so no new build is offered until it is cleared").

## Execution Plan

### Step 8: TEST
- [x] Write `tests/a-requested-stop-offers-no-build.test.js` (cases 1-5); run it and record that cases 1, 4 and 5 fail on today's code and cases 2 and 3 (and case 5's running-variant check) are guards.

### Step 9: PREPARE
- [x] Re-read `computePromote` and its six calls as they are now.

### Step 10: IMPLEMENT
- [x] `src/lib/menu-screens.js`: `computePromote(reg, root)` with the filter and comment; the six calls.
- [x] `src/lib/task-registry.js`: the `requestDrainStop` comment (rule and reason, no owner attribution).
- [x] `src/lib/actions.js`: `stopAgent`'s nothing-running message → "Stop requested. No plan is currently running; no new build will start."
- [x] `CLAUDE.md`, `README.md`: the test-file count lines through the release script's count functions.

### Step 11: REVIEW
- [x] The critic searches `computePromote\(` over `src/` and confirms every call passes `root`, and that no other code builds a `promote` list. (Done: no defects, four low items, all fixed in round 1; see the Execution Record.)

### Step 12: OPTIMIZE
- [x] One filter in one function; no per-route copy. (Done: the filter is in `computePromote` only; round 1 changed comments, one summary string and one message string, no logic.)

### Step 13: SECURE
- [x] The security scanner confirms nothing here can start a build during a stop. (Done, with a warn: the stop is checked when a promote list is built, not when a build starts, by decision 2; every text that claimed otherwise is narrowed. The CTO Chief runs the secrets detector and static scanner on the combined change before the release.)

### Step 14: VERIFY
- [x] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky. (13225 tests, 13225 pass, 0 fail, 0 skipped; coverage 99.88% against 99%; gate PASS.)
- [x] Re-run case 4 (the real menu command) and quote its `promote` in the build record. (Quoted in the Execution Record.)

### Step 15: DOCUMENT
- [x] The two comments say what the code does. (Both now name the kinds that stay on offer, say "tries to claim a build", cite decision 12 of the parent plan as taken under ambiguity, and say a build still starts by an explicit start.)

### Step 16: FINAL-REVIEW
- [x] Every acceptance box is checked against its quoted evidence. (See the four boxes above and the Execution Record.)

## Execution Record

### Step 8: TEST (red)

The test file has 12 cases (the plan's case 1 is split into eight, 1a-1h, one per path). On the tree before any change: 10 fail, 2 pass.

- Fail (as expected): 1a completion with `--continue`; 1b plain completion; 1c fail; 1d cancel of a queued task; 1e cancel of a running task; 1f `stream answer`; 1g `stream approve`; 1h `stream check`; 4 the real menu command; 5 Stop agent. Cases 1a-1h and 4 fail because `promote` holds the queued `implement` entry (t1); case 5 fails because the message is still "nothing new will start".
- Guards (pass on today's code, must stay green): 2 the build is offered again once the stop is cleared; 3 without a stop the build is offered and nothing is held for a stop. Case 5's running-plans check ("Will finish current plan(s): run-a, then stop.") is also a guard, but sits after the failing assertion in the same case, so it is only reached once the message is changed.

### Step 10: IMPLEMENT (green)

- New test file: 12 of 12 pass. Full `npm test`: 13224 tests, 13224 pass, 0 fail, 0 skipped; coverage 99.88% (threshold 99%); corpus claims gate PASS.
- `computePromote(reg, root)` filters after the guard and the id filter; the held builds are appended to `quarantined` as reason `stop-requested`. All six calls pass `root` (cancel, fail, plain completion, the continuation's two, stream check).
- Counts: CLAUDE.md and README.md 569 -> 570 through `updateDocCountsInClaudeMd` and `updateDocCountsInReadme`; no other line changed.

### Step 11: REVIEW (critic, extra-high)

No defects; four low items, all fixed in round 1: (1) both source comments now say every kind other than `implement` stays on offer (planners, classifications, question precomputes, reviews, quality and security checks, decompositions, discussions, syncs); (2) "which also claims a build" became "which then tries to claim a build" in both; (3) "this plan's decision" became "decision 12 of the plan four-defects-in-the-menu-and-the-release-found-on-2026-10-11, a decision taken under ambiguity, not by the owner" in both, and the repeated "A forced Start agent clears it." was deleted from the `requestDrainStop` comment; (4) new test case 3b: a requested stop, an implement task orphaned on age alone holding `src/s.js`, and a queued build touching `src/s.js` — the build's id appears exactly once in `quarantined`, with reason `staleness-orphan-quarantine` (the file-collision hold), and no `stop-requested` entry carries that id. Case 3b passes on first run: it is a guard on the existing de-duplication (the collision hold removes the build from the offered list before the stop filter sees it), not a red case.

### Step 13: SECURE (security scanner, extra-high)

Warn: the stop is checked when a promote list is built, not when a build starts (decision 2, which the CTO Chief keeps: starting a build is an explicit act, and a check at start would force every build start in this round past the stop). CTO Chief ruling, applied: (a) `stopAgent`'s nothing-running message is now "Stop requested. No plan is currently running; no new build will be offered until the stop is cleared." and the test that pins it changed to that exact text (red on the old text first, then green; decision 4); (b) the `requestDrainStop` comment says no list offers a new build while a stop is requested and a build still starts by an explicit `menu task start` or Start agent; (c) the held entry's summary reads "held back: a stop is requested, so no new build is offered until it is cleared". The CTO Chief runs the secrets detector and static scanner on the combined change before the release.

Neighbour for the owner (not fixed here; pre-existing, medium): `requestDrainStop` writes the flag through a symlink planted at `.ctoc/state/drain-stop`, truncating its target.

### Step 14: VERIFY (round 1)

- Slice test file: 13 of 13 pass. Before the source change, case 5 failed on the old message ("no new build will start.") and the other twelve passed (case 3b included).
- Full `npm test`: 13225 tests, 13225 pass, 0 fail, 0 cancelled, 0 skipped; coverage 99.88% (threshold 99%); corpus claims gate PASS; test-gate PASS.
- Case 4 re-run as a child process of the real menu command (a stop requested, a queued build t1, a queued planner, `menu task complete <review task> --continue`): `promote` = `[{"id":"t2","kind":"plan","plan":"p","touches":[],"gitOp":false}]`, `quarantined` = `[{"id":"t1","reason":"stop-requested","summary":"held back: a stop is requested, so no new build is offered until it is cleared"}]`.

### Steps 12, 15, 16 (round 1)

Optimize: the filter stays in `computePromote` alone; no logic changed in round 1. Document: the three comment/message changes above are the documentation; no CHANGELOG line added by this slice (the release step owns it). Final review: all four acceptance boxes ticked against the evidence above; the plan has not been completed or moved.
