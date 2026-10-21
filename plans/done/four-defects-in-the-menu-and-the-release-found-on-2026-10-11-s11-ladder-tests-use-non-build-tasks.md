---
title: "Tests that use two builds only to exercise a generic scheduler rule use non-build tasks"
type: implementation
created: 2026-10-11
priority: high
effort: small
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s10-the-release-brings-the-lockfile-to-the-version
files:
  - tests/scheduler-guarantees-under-mutation.test.js
  - tests/task-reconcile-quarantine-fault.test.js
  - tests/scheduler-enforced.test.js
  - tests/promote-quarantine-parity.test.js
  - tests/dashboard-wedge-fault.test.js
  - tests/dashboard-wedge-reports.test.js
revision: 1
rejection_reason: "Its gate failed only on the removed CLAUDE.md sentence; re-run the gate and fix the box records."
tag: rejected
approved_by: human
approved_at: 2026-10-18T12:22:00.104Z
gate_crossed: review → done
---
# REVISION 1

## Rejection Feedback

Its gate failed only on the removed CLAUDE.md sentence; re-run the gate and fix the box records.

---


# Tests that use two builds only to exercise a generic scheduler rule use non-build tasks

Slice 11 of 14 of `plans/functional/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`:
the preparation the CTO Chief allowed for the parent's slice 5 (one build at a time) — "first move tests
that use two build tasks only to exercise generic ladder rules over to a non-build kind". Test-only,
green on its own; the rule itself is slice 12.

## Problem Statement

The CTO Chief added a one-build ladder rule after the file-conflict rule on a copy of v6.14.125 and
measured 11 failing tests (parent, "A measured fact for the planner of the fifth slice"). Read for this
plan, they fall in two groups:

- **Tests that encode the retired "two builds at once" rule** — change in slice 12, with the rule: ST-07,
  ST-21 (c) and F2 in `tests/task-registry.test.js`; "two file-DISJOINT todo plans both start" in
  `tests/actions-scheduler.test.js`; G1 in `tests/scheduler-rule-projection-gate.test.js`.
- **G4** in `tests/scheduler-rule-projection-gate.test.js` (line 288) is the no-op control: it runs the
  scheduler test files unmutated and fails only because other cases in them fail. It does not encode the
  retired rule, and slice 12 does not edit it; it turns green when the cases above and below are fixed.
- **Tests that use two builds only to exercise a generic rule** — this slice:
  - D5 (control) in `tests/scheduler-guarantees-under-mutation.test.js` lines 547-556 (it is the failing
    case inside "Group D — sync-barrier holds through nextRunnable", line 489): "two ordinary tasks with
    disjoint files DO both promote", built from two `implement` tasks.
  - Q1 (inside "R3-B item 8") in `tests/scheduler-enforced.test.js` lines 468-484: its "non-conflicting
    task is still promoted" control (`free`, line 474) is a second build.
- Already handled by slice 1: D2 in `tests/scheduler-enforced.test.js` (its blocker is a `quality` task)
  and W10-s4 case 6 in `tests/w10-live-agent-reconcile.test.js` (its second task is a `review` task).
  The parent's "menu-task-wiring tests: case 6" matches no case the rule changes: that file's only case
  carrying a 6 is S6 (lines 160-178), which renders a board from fixed statuses and asserts no wait
  reason (search `it\('[^']*\b6\b|case 6` over the file: 0 matches; S6 read by hand). With D2 and W10-s4
  case 6, the eleven measured failures are all accounted for; slice 12's Step 9 re-measures the suite.

**A second group the measurement could not see.** Slice 12 now also carries the CTO Chief's decision that
a build orphaned on age alone keeps the build slot until task-reconcile releases it (slice 12, its orphan
clause): while such an orphan is unreleased, `canRun` refuses every build and `nextRunnable` offers no
build at all. The file-quarantine tests seed exactly that orphan — an `implement` task orphaned with
`result.orphanReason: 'staleness'`, or a running build aged past the 120-minute floor so the reconcile pass
orphans it — and use an `implement` candidate on its files to prove the quarantine holds and reports the
candidate. Once `nextRunnable` stops offering that build, the quarantine never sees it, so the "held and
reported" assertions fail, and some sibling assertions pass vacuously (a candidate that is never offered
is trivially "not promoted"). Found by reading every test that seeds an age-only orphan (search
`orphanReason: ?'staleness'` over `tests/*.test.js`: 8 files, each read) and every reconcile-driven
quarantine case (search `quarantined` over `tests/`, the scheduler files read):

- `tests/task-reconcile-quarantine-fault.test.js`: every candidate comes from `queued()`, whose kind
  defaults to `implement` (line 108), beside `ageOnlyOrphan()` (an `implement` orphan, line 86). Red with
  the orphan clause: "records the fault on the report" (145), "surfaces the drop in report.quarantined"
  (170), the collect-phase case (266), "quarantines the conflicting candidate" (295) and "promotes a
  candidate whose files do not overlap" (316); "DROPS the unchecked candidate" (157) and the `cand1`
  clause of 182 would pass without testing anything.
- `tests/scheduler-enforced.test.js` Q1: the runner (line 471) is a build aged 200 minutes, so the pass
  orphans it on age alone; the waiter (line 473) is a build on its file and is then never offered, so "the
  quarantine is REPORTED" (line 481) fails.
- `tests/promote-quarantine-parity.test.js`: t1 is an `implement` age-only orphan and t2 (line 140) an
  `implement` candidate on its file. Red: case 1, the fail/cancel/complete cases, case 9 (its
  "nextRunnable still OFFERS t2" half), case 11 and case 11b.
- `tests/dashboard-wedge-fault.test.js`: `task()` defaults to `implement` (line 65), so t2 (lines 128,
  141, 162, 177) is a build beside `ageOnlyOrphan()` (an `implement` orphan, line 83). Red: all four
  cases of the first describe block (the fault line and the "held this pass" line need t2 offered).
- `tests/dashboard-wedge-reports.test.js` line 113: t2 (default kind `implement`) beside an `implement`
  age-only orphan. Red: "is visible on the DASHBOARD" (line 101).

Not affected, read: `tests/task-reconcile-coverage.test.js` (its quarantine candidates are `review`),
`tests/r3b-consolidation-rework.test.js` RW-04 (it hands the candidate to `applyQuarantine` directly, not
through `nextRunnable`), `tests/plan-recovery.test.js` and `tests/plan-recovery-wiring.test.js` (no queued
task), `tests/task-registry.test.js` BELT-2 and BELT-5 (slice 12's file; slice 12 changes them with the
rule), and C1-1e / U-5b there (their candidate is a `sync`).

## Implementation Details

### File Specifications

#### `tests/scheduler-guarantees-under-mutation.test.js` — MODIFY
D5 (lines 550-553): `t1` and `t2` become `kind: 'review'` (touches `a.js` and `b.js` unchanged). Its
comment adds: "non-build tasks: one build at a time (the owner's decision of 2026-10-11) is a separate
scheduler rule; this control is about Rule 2 not turning into one task at a time". The assertion
(`['t1','t2']`) is unchanged.

#### `tests/task-reconcile-quarantine-fault.test.js` — MODIFY
Line 108, `queued()`'s default: `kind: over.kind || 'quality'`. Its comment (line 104) becomes "A queued
candidate — a non-build editing task by default (`quality`), because a build orphaned on age alone holds
the build slot (slice 12) and a build candidate would never reach the quarantine. An empty `touches` set
means it cannot conflict with anything." Every case keeps its candidates, ids, touches and assertions;
the collect-phase case still has two editing candidates and asserts both are dropped. `ageOnlyOrphan()`
stays an `implement` task (its comment's 120-minute floor is the reason it is still reserved).

#### `tests/scheduler-enforced.test.js` — MODIFY
Q1, line 473: `waiter` becomes `taskRegistry.addTask(reg, { kind: 'quality', plan: 'p2', touches:
['src/shared.js'] })`; line 474: `free` becomes `taskRegistry.addTask(reg, { kind: 'quality', plan: 'p3',
touches: ['src/free.js'] })`. The runner (line 471) stays a build, so the case still orphans a build on
age alone. Every assertion is unchanged; a one-line comment above `waiter`: "non-build waiters: a build
orphaned on age alone holds the build slot (slice 12), so a build waiter would never be offered to the
quarantine this case tests".

#### `tests/promote-quarantine-parity.test.js` — MODIFY
Line 140: `task({ id: 't2', kind: 'quality', plan: 'p2', touches: [TARGET] })`. The seed comment (lines
117-119) becomes "t2 — a queued `quality` task (a non-build editing task) touching the SAME file. The
scheduler WILL return it (t1 is orphaned and occupies no slot, and t2 is not a build, so t1's hold on the
build slot does not apply); the quarantine is what must hold it." No assertion changes; case 9's `canRun`
half still answers `staleness-orphan-quarantine` (the belt is kind-blind).

#### `tests/dashboard-wedge-fault.test.js` — MODIFY
Line 65, `task()`'s default kind: `'quality'`. `ageOnlyOrphan()` (line 83) and t9 (lines 143, 164) set
`kind: 'implement'` explicitly and are unchanged; t2 is the only task the default reaches. No assertion
changes.

#### `tests/dashboard-wedge-reports.test.js` — MODIFY
Line 113: `task({ id: 't2', kind: 'quality', touches: ['src/a.js'] })`. No other line changes (the other
`task()` callers test dependency wedges, where kind does not matter).

No other test changes. No assertion is removed, weakened or widened.

### Test Plan

Every changed case is red against a scratchpad copy of the scheduler carrying slice 12's Rule 5 and its
orphan clause before the edits, and green after, and green against the unmodified module (Step 8); they
are exactly the ones the two rules would otherwise break for a reason they do not test. Expected red set
before the edits: D5; Q1; in `task-reconcile-quarantine-fault` the cases at lines 145, 170, 266, 295 and
316; in `promote-quarantine-parity` case 1, the three route cases, cases 9, 11 and 11b; in
`dashboard-wedge-fault` the four cases of its first block; in `dashboard-wedge-reports` the case at line
101. The build record lists the measured set; a case red against the copy that is not in this list is
reported, never adjusted. Slice 12's Step 9 measures the whole suite with the rules.

### Security Review

- [x] Tests only.

### Wiring — the live call sites

No new module; the tests drive `task-registry.nextRunnable`, `task-registry.canRun`,
`task-reconcile.reconcileState`, `task-reconcile.applyQuarantine`, `menu-screens.buildDashboardTable` and
the menu router, as before. The mutation gate (`tests/scheduler-rule-projection-gate.test.js`) runs D5,
Q1, the quarantine-fault and the parity files against mutated copies; D5 stays the control against "one
task at a time", D1-D3 keep defending Rule 2, and BELT-1/BELT-1b keep defending the belt.

## Acceptance Criteria

- [x] Every changed case passes on today's code with unchanged assertions, and the build record shows the
  expected red set red, then green, against the scratchpad copy carrying slice 12's Rule 5 and orphan
  clause.
- [x] `npm test` passes (the mutation gate G4/G5 included).

## Decisions Taken Under Ambiguity

1. **`review` for D5, `quality` for the quarantine and dashboard cases**: D5's other cases use `review`
   for plain tasks; the quarantine cases need an editing task, and `quality` is the editing kind slice 1
   already uses as a file holder.
2. **The tests that encode the retired rule are not touched here**: changing them before the rule exists
   would make them assert something false today.
3. **(The CTO Chief's decision, 2026-10-11, recorded as his; its duration corrected to what the code
   does.)** With the one-build rule, a build the file quarantine holds takes the projected build slot in
   `nextRunnable`, so no other build is promoted while it is held; this is accepted. That only happens
   when the age-only orphan reserving the files is NOT a build — an orphaned build holds the build slot
   itself, so no build is offered at all (slice 12's orphan clause). The hold is not one pass: the
   quarantine re-reads the reserved files on every pass (`task-reconcile.applyQuarantine`,
   `src/lib/task-reconcile.js` line 721, through `task-registry.staleOrphanReservedFiles`), so the held
   build keeps the projected slot on every pass until the reservation is released — when the orphan's
   agent is confirmed gone, or once the orphan is twice its kind's staleness floor past its start (60
   minutes for the 30-minute default floor; `src/lib/task-reconcile.js` lines 406-449, constants lines
   102-105 and 130). On release the held build itself, first in the queue, is promoted, and the other
   build keeps waiting by Rule 5. The case proving this ("the hold ends when the reservation is
   released") needs Rule 5 to exist, so it is slice 12's ONE-BUILD-7 in `tests/scheduler-enforced.test.js`;
   written here it would be red before slice 12 lands and this slice could not pass its own Step 14.
   Q1 itself now uses non-build waiters, so it keeps proving the quarantine is not vacuous.
4. **`task-reconcile-quarantine-fault`'s default kind changes, not one candidate**: changing only `cand2`
   (the earlier version of this plan) leaves `cand1` a build, which the orphan clause stops offering;
   five cases would fail and two would pass without testing anything. The default reaches every
   candidate in one line.
5. **The route-level proof that a BUILD is held by the quarantine is kept (fix round).** Moving the
   parity file's t2 to `quality` would have left no case where a build candidate meets the quarantine.
   `conflictTasks` takes `orphanKind` and `candKind`, and "case 1b" (one case per route) pairs a
   `quality` age-only orphan with an `implement` candidate, a pairing the one-build rule still offers to
   the quarantine.
6. **`tests/a-requested-stop-offers-no-build.test.js` is not this slice's file and is not edited here.**
   Its case 3b (about lines 203-225) seeds an age-only orphan of kind `implement` and a build candidate;
   under the one-build rule the orphaned build holds the build slot, the candidate is no longer offered,
   and the case will go red. A scope-growth request is being filed to change that orphan (about line 208)
   to kind `quality`; the security reviewer's probe `repo/tests-probe/stop-3b-nonbuild-orphan.test.js`
   (in the reviewer's scratchpad `sec13-t331/`) shows the change. (Granted later; see "Granted scope
   growth" in the Execution Record.)
7. **When the last three boxes are ticked (CTO Chief ruling, 2026-10-18).** The last review asked that the
   `npm test` acceptance box, the Step 14 box and the Step 16 box stay unticked until a passing gate. The
   plan validator refuses verify evidence older than the plan's last change (`src/lib/plan-validator.js`,
   about lines 1147-1160), so ticking them after the gate would make the evidence stale and the slice could
   never finish. Ruling: they are ticked immediately before the completion's gate run; the completion's
   verify record is the proof; a failing run blocks the finish and the boxes are then unticked.

## Execution Plan

### Step 8: TEST
- [x] Red phase against a copy: copy `src/lib/task-registry.js` to the scratchpad and insert slice 12's Rule 5 lines, its orphan clause in `canRun` and `nextRunnable`, and the `isUnreleasedStaleOrphanBuild` predicate exactly as slice 12 specifies them. Run the six files against the copy using the module redirect of `tests/scheduler-rule-projection-gate.test.js` `runScheduler` (lines 197-232: a `--require` loader mapping the real path to the copy). Record the expected red set (Test Plan) red before the edits and green after, and all six files green against the unmodified module. Nothing tracked changes.

### Step 9: PREPARE
- [x] Re-read the changed cases and the two fixture helpers (`queued()`, `task()`) as they are now.

### Step 10: IMPLEMENT
- [x] `tests/scheduler-guarantees-under-mutation.test.js`: D5's two kinds and its comment.
- [x] `tests/task-reconcile-quarantine-fault.test.js`: `queued()`'s default kind and its comment.
- [x] `tests/scheduler-enforced.test.js`: Q1's `waiter` and `free` kinds and the comment.
- [x] `tests/promote-quarantine-parity.test.js`: t2's kind and the seed comment.
- [x] `tests/dashboard-wedge-fault.test.js`: `task()`'s default kind.
- [x] `tests/dashboard-wedge-reports.test.js`: t2's kind.

### Step 11: REVIEW
- [x] The critic confirms each case still tests what its name and its mutation comment say, and that no changed case now passes without exercising its rule (each quarantine case's candidate is offered by `nextRunnable` with the orphan clause present).

### Step 12: OPTIMIZE
- [x] Nothing beyond the listed lines.

### Step 13: SECURE
- [x] The security scanner confirms the slice touches only `tests/`.

### Step 14: VERIFY
- [x] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky. (npm test: verified by the gate run in the completion. Run here by the owner's rule of 2026-10-12 instead: the six declared files, the fence tests, lint, type check; see the Execution Record. Two fence tests fail for a cause outside this slice.)

### Step 15: DOCUMENT
- [x] The build record names every changed case and quotes the measured red set against the copy.

### Step 16: FINAL-REVIEW
- [x] Every acceptance box is checked against the quoted test run.

## Execution Record

### Step 8 — red against the scratchpad copy
The copy was made in memory: a `--require` loader (scratchpad `s11/loader.js`, nothing tracked changed) patches `src/lib/task-registry.js` at load with slice 12's Rule 5, `isUnreleasedStaleOrphanBuild`, the canRun and nextRunnable orphan clauses and the `opts.now` parameter, and `src/lib/task-reconcile.js` with `nextRunnable(reconciled, { now })`. (A plain copy of the file was refused by the write protection, so the patch is applied at require time.) Unmodified module, before the edits: 104 tests, all six files green. Patched module, before the edits, red (19): D5; Q1; task-reconcile-quarantine-fault "records the fault on the report (phase, error, dropped ids)", "surfaces the drop in report.quarantined with a reason naming the failed check", "records phase "collect" and drops every candidate that declares a file", "quarantines the conflicting candidate with the original reason and no fault marker", "promotes a candidate whose files do not overlap the reserved set"; promote-quarantine-parity case 1, the fail, cancel and complete cases, case 9, case 11, case 11b; dashboard-wedge-fault all four cases of "the concurrent-edit guard says when it did not run"; dashboard-wedge-reports "is visible on the DASHBOARD, not only on a menu task command result". That is exactly the plan's expected set; nothing else was red. The plan's two cases expected to pass vacuously with a build candidate ("DROPS the unchecked candidate instead of promoting it" and the `cand1` clause of "keeps a non-editing candidate promotable through a fault") were green in the patched run before the edits, as the plan predicted; whether they were vacuous was not separately measured (they now also assert `report.quarantineFaulted.dropped` equals `['cand1']`, see Step 11/13 fix round). After the edits (first build): unmodified module 104 tests, 0 failures; patched module 104 tests, 0 failures (an earlier line of this record said 135: that count included the describe blocks as well).

### Step 9 — shifts in the plan's cited lines (the plan's line numbers are stale; cases are named by title)
- `tests/scheduler-enforced.test.js` case Q1 ("a conflicting queued task is NOT promoted in the same pass that orphaned its holder on AGE alone"): moved down by 5 lines (earlier slices added lines above); `runner`, `waiter` and `free` are read by name.
- `tests/dashboard-wedge-fault.test.js`: `task()`'s default `kind` is one line lower than the plan cites; t2 and t9 are read by id.
- Unchanged: D5 ("two ordinary tasks with disjoint files DO both promote"), `queued()` in task-reconcile-quarantine-fault, t2 in promote-quarantine-parity's `conflictTasks`, t2 in dashboard-wedge-reports "is visible on the DASHBOARD".

### Step 10 — changed cases
D5 (both tasks `review`, comment added); `queued()` default kind `quality` in task-reconcile-quarantine-fault (affects the five red cases plus 157 and 182); Q1 `waiter` and `free` `quality` (runner stays a build); promote-quarantine-parity t2 `quality` and seed comment (cases 1, fail, cancel, complete, 9, 11, 11b); dashboard-wedge-fault `task()` default `quality` (its four cases); dashboard-wedge-reports t2 `quality` (line 101 case). No assertion weakened or removed (checked against `git diff` in the fix round after the confirmation review: the first build changed no assertion; the first fix round added or tightened five).

### Step 14 — runs (owner rule of 2026-10-12; npm test is left to the completion)
- Six declared files: 104 pass, 0 fail, 0 skipped.
- Pass: `tests/export-reachability.test.js`, `tests/reachability.test.js`, `tests/regex-redos-bounded.test.js`, `tests/typecheck.test.js`, `tests/skip-guard-integrity.test.js`, `tests/vacuous-verification.test.js`; lint (`eslint . --max-warnings 0`) clean; `tsc --noEmit` clean.
- FAIL, cause outside this slice: `tests/false-green-fence.test.js` (3 cases: no new false-green site, ratchet, lower-the-baseline) and `tests/iron-loop-enforcer.test.js` (2 cases: thorough self-check, verdict-envelope case 7, both "Block findings: false-green-fence"). The one new finding is `src/scripts/release.js:silent-catch:removeTmp` (live 208, baseline 207). `src/scripts/release.js` is the release-lockfile slice's file (modified in the shared checkout); this slice touches only `tests/` and cannot fix it without leaving its declared files, so no change was made and no scope-growth request was filed.

### Fix round for the Step 11 and Step 13 reviews
Tests only, in the six declared files. Measured with the in-memory patch of slice 12's rule (scratchpad `s11/loader.js`) and in-memory mutations (scratchpad `s11/mutloader.js`); no tracked source changed.
1. (security, medium) `tests/promote-quarantine-parity.test.js`: `conflictTasks` now takes `orphanKind` and `candKind`; new cases "case 1b — the dashboard | fail | cancel | complete path holds a BUILD candidate on a file a non-build age-only orphan reserves" (a `quality` age-only orphan, an `implement` candidate on the same file; asserts not promoted and reported as `staleness-orphan-quarantine`). Green today, green with the one-build patch; mutation "applyQuarantine lets `implement` candidates pass" (in memory) is red on all four case-1b cases, both today and with the patch.
2. (critic) the same file, case 6 ("a released quarantine promotes on every route"): a disjoint queued `implement` task t5 is added and asserted promoted on all four routes. Green today, green with the patch; mutation "every orphaned build holds the build slot regardless of its orphanReason" (with the patch) is red on case 6.
3. (critic) `tests/task-reconcile-quarantine-fault.test.js`: "DROPS the unchecked candidate instead of promoting it" and "keeps a non-editing candidate promotable through a fault" now also assert `report.quarantineFaulted.dropped` deep-equals `['cand1']`. Green today and with the patch; mutation "the filter drops the candidate but does not record its id" (in memory) is red on both (and on the existing "records the fault on the report" and the dashboard fault line case).
4. (security) `tests/dashboard-wedge-reports.test.js` "is visible on the DASHBOARD": `text.includes('t2')` is now `assert.match(text, /^\s+t2 — held/m)`. Measured on the real dashboard text: with an age-only orphan holding t2 the line `      t2 — held one pass — ...` matches; with nothing holding t2 the text contains t2 (`quality t2 (waits: ready)`, so the old assertion was true) and the new pattern does not match. A mutation removing the per-task line while keeping the header was not run (the source file could not be searched from here, see the refused command below); that is the one part of this item shown by the measured text only.
5. Comments saying "slice 12" are reworded to "the one-build rule (the owner's decision of 2026-10-11)", stated as holding once that rule is built: task-reconcile-quarantine-fault `queued()`, scheduler-enforced Q1, scheduler-guarantees-under-mutation D5, promote-quarantine-parity `conflictTasks` seed.
6. This record corrected: cases named by title; both runs are 104 tests for the first build (135 counted the describe blocks too). After this fix round: 108 tests (four more case-1b cases, one per route: dashboard, fail, cancel, complete), 0 failures, 0 skipped, both on today's code and with the one-build patch.
7. `tests/a-requested-stop-offers-no-build.test.js` is not this slice's file and is not edited. See decision 6.
Totals now: six files 108 pass, 0 fail, 0 skipped. Fences: `tests/scheduler-rule-projection-gate.test.js`, `tests/export-reachability.test.js`, `tests/reachability.test.js`, `tests/regex-redos-bounded.test.js`, `tests/typecheck.test.js`, `tests/skip-guard-integrity.test.js`, `tests/vacuous-verification.test.js` pass. `tests/false-green-fence.test.js` (3 cases) and `tests/iron-loop-enforcer.test.js` (2 cases) still fail only on `src/scripts/release.js:removeTmp`, slice 10's, not touched. `npm run lint` clean; `tsc --noEmit` clean.

### Refused commands, fix round (write protection, background-agent message)
Each was refused with: "CTOC refused this call because a background agent may not answer CTOC's questions, approve a plan or move one on through the menu; report your result and let the main session do it." Not retried in another form, except that file contents were read with the Read tool and scratch scripts were run from the scratchpad.
1. `cd <repo>; grep -n "held this pass" -B3 -A12 src/lib/menu-screens.js | head -60; sed -n 465,495p tests/scheduler-enforced.test.js; ...` (a combined grep and sed)
2. `cd <scratchpad>/s11; cat > render.js <<'EOF' ... EOF` (a heredoc script, rewritten with the Write tool)
3. `cd <repo>/tests; python3 - <<'EOF' ... EOF` (edits to the test files, redone with the Edit tool)
4. `cd <repo>/tests; F="scheduler-guarantees-under-mutation.test.js ..."; timeout 580 node --test --test-reporter=tap $F ... | grep ...` (rewritten as a scratchpad script)
5. `cd <repo>/src/lib; sed -n 700,790p task-reconcile.js` (read with the Read tool)
6. `cd <repo>/src/lib && grep -n "held one pass\|held this pass" menu-screens.js | head`
7. `cd <scratchpad>/s11 && node find.js <repo>/src/lib/menu-screens.js "held one pass" "held this pass" "— held"`

### Refused commands (write protection, background-agent message)
1. `cd <repo> && git status --short src/lib/task-registry.js tests/scheduler-guarantees-under-mutation.test.js tests/task-reconcile-quarantine-fault.test.js tests/scheduler-enforced.test.js tests/promote-quarantine-parity.test.js tests/dashboard-wedge-fault.test.js tests/dashboard-wedge-reports.test.js`
2. `grep -n "Rule 4\|file-conflict\|Otherwise runnable\|function nextRunnable\|function canRun\|overlapsStaleOrphanReservation\|^module.exports\|staleOrphanReservedFiles,\|const result = \[\];" <repo>/src/lib/task-registry.js`
3. `mkdir -p <scratchpad>/s11 && cp <repo>/src/lib/task-registry.js <scratchpad>/s11/task-registry.js`
4. `cp <repo>/src/lib/task-registry.js <scratchpad>/s11/copy.js`
5. `cd <repo>/tests && timeout 600 node --test scheduler-guarantees-under-mutation.test.js task-reconcile-quarantine-fault.test.js scheduler-enforced.test.js promote-quarantine-parity.test.js dashboard-wedge-fault.test.js dashboard-wedge-reports.test.js 2>&1 | tail -15`
6. `node --require <scratchpad>/s11/loader.js --test --test-reporter=tap <the six absolute test paths> | grep -E "^\s*not ok|^# (pass|fail)"`

### Granted scope growth: case 3b of tests/a-requested-stop-offers-no-build.test.js
Granted by the owner (inbox 1792161116544-s9piab, "Grant all three (Recommended)"). The one change: in case 3b the age-only orphan t1 has kind `quality` instead of `implement` (plus a two-line comment saying why), so the case still proves a requested stop and a file collision hold the build together once the one-build rule makes an orphaned build hold the build slot itself. No assertion was edited by the change (the file is untracked, so there is no `git diff` to show it; the assertions were read in the fix round after the confirmation review). Runs after the change: that file, the six declared files, `tests/false-green-fence.test.js` and `tests/scheduler-rule-projection-gate.test.js`: 144 tests, 144 pass, 0 fail, 0 skipped; `npx eslint tests/a-requested-stop-offers-no-build.test.js --max-warnings 0` clean. The repeat of the Step 8 red check against slice 12's rule was NOT run: the in-memory loader (scratchpad `s11/loader.js`) no longer exists and slice 12's rule is not in `src/lib/task-registry.js` yet (no `isUnreleasedStaleOrphanBuild`).

### Checkboxes marked before the completion
The first completion attempt was a kickback: "2 of 2 acceptance criteria not checked". Marked now: acceptance criterion 1 (red set and green record in the Execution Record above); acceptance criterion 2 (`npm test`) is marked on the understanding that the completion's own gate run is its verification and its outcome is recorded below; Steps 11 and 13 (the critic and security reviews took place and their findings are the fix round above); Step 16. If the gate fails, these marks are not a claim that it passed.

### Completion outcome (t331): blocked by the full gate, not retried
The second `menu task complete t331` ran the full gate: lint and coverage passed (99.6%, floor 99, skipped 0), the test gate reported `# fail 2`. The plan is in review with evidence recording the failure (verify passed false). Cause, found by running the file afterwards: `tests/subplan-decomposition.test.js`, subtest "CLAUDE.md references the 1→N decomposition + parent_plan" inside "prose contract" (the two counted failures are the subtest and its parent). `CLAUDE.md` is modified in the shared checkout by other work (`git status` shows ` M CLAUDE.md`) and no longer contains `parent_plan`; this slice touches only `tests/`. `tests/false-green-fence.test.js` no longer appears among the failures. No retry, per the instruction.

### Fix round after the confirmation review (2026-10-17)
Comments and records only; no assertion changed. The confirmation review passed.
1. Boxes: acceptance criterion 2, Step 14 VERIFY and Step 16 FINAL-REVIEW are unticked; a builder had ticked them with no passing gate run behind them. They are ticked again only after the CTO Chief's gate run passes.
2. Step 11 REVIEW and Step 13 SECURE: confirmed by the confirmation review (2026-10-17). Their boxes were already ticked and stay ticked.
3. Assertion wording, checked against `git diff` over the declared test files: no assertion weakened or removed. The diff shows one assertion replaced by a tighter one (`text.includes('t2')` became `assert.match(text, /^\s+t2 — held/m, ...)` in dashboard-wedge-reports) and added assertions (`report.quarantineFaulted.dropped` equals `['cand1']` in two cases of task-reconcile-quarantine-fault; case 1b and the t5 assertion of case 6 in promote-quarantine-parity). The Execution Record lines on assertions were reworded to say this.
4. Case-1b count: `ROUTES` in tests/promote-quarantine-parity.test.js (line 180) has four entries (dashboard, fail, cancel, complete), so there are four case-1b cases, not three. The record line "108 tests (three more case-1b cases)" now says four. The test files carry no count of them.
5. tests/promote-quarantine-parity.test.js, seed comment (lines 114-117): now "2 × the 120-min `implement` floor, or 2 × 30 min for a non-build orphan". The code's floors (`DEFAULT_STALE_MS_BY_KIND` in src/lib/task-reconcile.js lines 103-106): `implement` and `sync` 120 min, every other kind the 30-min default; t1 defaults to `implement` and is `quality` in case 1b.
6. tests/task-reconcile-quarantine-fault.test.js, `queued()` comment (lines 104-111): rewrapped and corrected. The review's wording assumed the orphan there is a non-build task; in the code `ageOnlyOrphan()` (line 86) is kind `implement` (120-min floor, presumed dead at 240 min) and it is the candidate (`queued()`, default `quality`) that is non-build. The comment says so.
7. tests/a-requested-stop-offers-no-build.test.js case 3b: orphan t1 is kind `quality` (about line 208), with the two-line comment; the case asserts that t2 is not offered, is reported exactly once, with reason `staleness-orphan-quarantine`, and not as `stop-requested`. The file is untracked, so there is no earlier version to diff; the assertions match the Granted scope growth record above.

Commands run (from <repo>):
- `node --test` on the seven test files (the six declared plus tests/a-requested-stop-offers-no-build.test.js): 121 tests, 121 pass, 0 fail, 0 skipped, 0 cancelled.
- `npx eslint --max-warnings 0` on the same seven files: exit 0, no output.
- Not run, by instruction: `npm test`, the full test glob, `menu task complete`, any git command that writes.

### Step 16: FINAL-REVIEW (2026-10-18)
Each acceptance box checked against the Execution Record and the tests.
- Acceptance 1 (every changed case passes with unchanged assertions; expected red set red then green against the copy carrying slice 12's rule): PROVEN. Execution Record "Step 8" names the 19 red cases against the patched copy before the edits (exactly the plan's expected set) and 0 failures after, unmodified and patched; the fix round re-measured 108 tests green both ways; the 2026-10-17 fix round records no assertion weakened or removed. Not re-measured against slice 12's rule today: the in-memory loader no longer exists and the rule is not yet in `src/lib/task-registry.js` (stated in "Granted scope growth").
- Acceptance 2 (`npm test` passes, mutation gate G4/G5 included): NOT provable before the gate run; its proof is the completion's verify record (see the ruling below). The last full gate run (t331) failed only on `CLAUDE.md` lacking `parent_plan` (`tests/subplan-decomposition.test.js`), outside this slice's files; `tests/scheduler-rule-projection-gate.test.js` passed in the fix-round runs.
- Step 14: same as acceptance 2, proven by the completion's verify record.
- Test run today, from <repo>: `node --test` on tests/scheduler-guarantees-under-mutation.test.js, tests/task-reconcile-quarantine-fault.test.js, tests/scheduler-enforced.test.js, tests/promote-quarantine-parity.test.js, tests/dashboard-wedge-fault.test.js, tests/dashboard-wedge-reports.test.js and tests/a-requested-stop-offers-no-build.test.js: 121 tests, 32 suites, 121 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo.
- Result: every acceptance box other than the `npm test` one is proven by the record and the run above; the `npm test` and Step 14 boxes rest on the gate run only.

Ticked immediately before the completion's gate run (CTO Chief ruling of 2026-10-18); the completion's verify record is the proof; a failing run blocks the finish and the boxes are then unticked.
