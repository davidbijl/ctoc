---
title: "Tests that start a build give it a real plan file first"
type: implementation
created: 2026-10-11
priority: high
effort: small
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: none
files:
  - tests/scheduler-enforced.test.js
  - tests/menu-protocol.test.js
  - tests/w10-live-agent-reconcile.test.js
---

# Tests that start a build give it a real plan file first

Slice 1 of 14 of `plans/functional/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`
(the parent's slice 1, "the menu's task start moves the plan", is built as this slice and the next).
Test-only preparation, green on today's code (v6.14.125).

## Problem Statement

The next slice makes `menu task start <id>` on a queued build (`kind: implement`) move its plan from
`plans/todo/` to `plans/in-progress/`, and refuse the start when the plan is in neither folder (parent,
scenario "a plan that cannot be moved refuses the start", decision 3). Fifteen existing tests (eight in scheduler-enforced, five in menu-protocol, two in
w10-live-agent-reconcile) start a
build through the menu that names a plan with no plan file anywhere. Read for this plan:

- `tests/scheduler-enforced.test.js`: E-FILE (lines 83-96, start at 85), E-SYNC (116-137, start at 121),
  E-FORCE (149-167, starts at 151 and 154), E-OK (169-175, start at 171), D1 (191-207, start at 194),
  D2 (209-229, start at 211), X3 (543-551, start at 545), X4 (553-561, start at 555).
- `tests/menu-protocol.test.js`: B-PROMOTE-run (296-314, start at 302, its plan seeded only at 306),
  B-PROMOTE-failcancel(fail) (332-340, start at 334, no plan), B-PROMOTE-failcancel(cancel) (342-361,
  start at 348, no plan), B-PROMOTE-blocked (363-374, start at 365, seeded at 368), B-PROMOTE-idfilter
  (376-394, start at 378, seeded at 388).
- `tests/w10-live-agent-reconcile.test.js`: case 6 (244-260) and case 6b (262-277), whose `seedQueued`
  helper (lines 125-130) records a build with no plan file.

Each of these would be refused by the next slice for a reason the test is not about. This slice gives
every such build its plan file, or makes a task that only holds files a non-build task, so each test
keeps testing what its name says.

## Implementation Details

### Dependency Graph

```
tests/scheduler-enforced.test.js     --drives--> src/lib/menu-screens.js (route), src/lib/actions.js (startAgent)
tests/menu-protocol.test.js          --drives--> src/lib/menu-screens.js (route)
tests/w10-live-agent-reconcile.test.js --drives--> src/lib/menu-screens.js (route)
```
No source file changes.

### File Specifications

#### File: `tests/scheduler-enforced.test.js`
**Action:** MODIFY. Uses the file's own `writePlan(stage, name, { files })` helper (lines 59-76).
- E-FILE: before line 85 add `writePlan('todo', 'pA', { files: ['src/shared.js'] });`.
- E-SYNC: before line 121 add `writePlan('todo', 'pA', { files: ['src/a.js'] });` (the build really
  runs, as the test's comment says).
- E-FORCE: before line 151 add `writePlan('todo', 'pA', { files: ['src/shared.js'] });`; before line 154
  add `writePlan('todo', 'pB', { files: ['src/shared.js'] });`.
- E-OK: before line 171 add `writePlan('todo', 'pA', { files: ['src/a.js'] });`.
- D1 (line 193) and D2 (line 210): the blocker becomes a non-build task that holds the file:
  `ms.route(['menu', 'task', 'add', 'quality', 'blocker', '--touches', 'src/shared.js'], root)`; the
  comment above D1's line 192 reads "Occupy src/shared.js with a running non-build task so the head plan
  is file-conflicted." No assertion changes.
- X3: before line 545 and X4: before line 555 add `writePlan('todo', 'pA', { files: ['src/a.js'] });`.
- No assertion is removed, weakened or widened.

#### File: `tests/menu-protocol.test.js`
**Action:** MODIFY. Uses the file's own `seedInProgressPlan(slug, files)` helper (lines 281-293).
- B-PROMOTE-run: move `seedInProgressPlan('pi1', ['src/shared.js']);` from line 306 to just before the
  start at line 302.
- B-PROMOTE-failcancel(fail): add `seedInProgressPlan('pi1', ['src/shared.js']);` before line 334.
- B-PROMOTE-failcancel(cancel): add `seedInProgressPlan('pi1', ['src/shared.js']);` before line 348.
- B-PROMOTE-blocked: move line 368 to just before line 365.
- B-PROMOTE-idfilter: move line 388 to just before line 378.
- Each moved or added line keeps its comment "C7: an implement completion must produce evidence"; where
  it is new, the comment reads "a build start needs its plan file in todo/ or in-progress/".

#### File: `tests/w10-live-agent-reconcile.test.js`
**Action:** MODIFY.
- Add `seedTodoPlan(slug, files)` next to `seedInProgressPlan` (lines 92-104): the same content, written
  to `plans/todo/<slug>.md`.
- `seedQueued(plan)` (lines 125-130) calls `seedTodoPlan(slug, ['src/' + slug + '.js'])` before it
  records the task, so cases 6 and 6b start a build whose plan exists.
- Case 6, line 255: the second task becomes a non-build task,
  `taskRegistry.addTask(reg, { kind: 'review', plan: 'p-start-2' })`, with the comment "a non-build task:
  the subject here is the recorded agent id, which every kind records the same way". The assertion at
  line 259 is unchanged.

### Test Plan

These are the tests. Each must pass on today's code before and after the edit (Step 8), and must still
pass once the next slice lands (checked by that slice's Step 14).

### Security Review

- [x] No production code, no new input path, no file outside `tests/`.
- [x] No assertion weakened: every change seeds a fixture or changes which kind holds a file.

### Wiring — the live call sites

No new module. The tests drive the live router `menu-screens.route` (reached from
`src/commands/start.js`) and `actions.startAgent` (the menu's Start agent recipe and
`src/areas/agent.js` line 108), as before.

## Acceptance Criteria

- [x] Every test named above passes on today's code with its new fixture, with the same assertions.
- [x] No test in the three files starts a build whose plan file is in neither `plans/todo/` nor
  `plans/in-progress/`, except where the start is refused by the scheduler before any plan is looked at.
- [x] `npm test` passes.

## Decisions Taken Under Ambiguity

1. **A plan file is seeded where the test is about a build; a non-build holder is used where the test only
   needs a file held.** D1 and D2 only need `src/shared.js` occupied ("Occupy src/shared.js with a
   running task"); a `quality` task does that and also keeps D2 green once one build at a time lands
   (slice 12), which the parent measured failing. A seeded `blocker` plan in `todo/` would instead be
   picked up by Start agent's walk and change what D1 and D2 test.
2. **Case 6's second task becomes a `review` task.** Its subject is the recorded agent id, which every
   kind records the same way; a second build would be refused by the one-build rule (parent: "W10-s4",
   measured failing). Builds' agent ids are tested by the next slice's own test file.
3. **E-SYNC gets its plan file although it would pass without one**: without it, its build start would be
   refused and the test would pass for a reason other than the one its comments state.
4. **This is a separate slice so each slice stays green on its own**, as the CTO Chief allowed for the
   one-build slice; the next slice's change and its own test file stay at three files.

5. **(Build, Step 8) The scratch copy's refusal sits after the scheduler's decision, not before it.** With the
   plan check placed ahead of the scheduler check, E-DEP (an unmet dependency, refused as `blocked-dep`) also went
   red; the parent's rule is that a scheduler refusal names the scheduler's reason, so the check was moved after
   it and the red set became exactly the 13 the plan names.
6. **(Build, Step 10) Helper shape in `w10-live-agent-reconcile.test.js`.** `seedInProgressPlan` and `seedTodoPlan`
   are one-line wrappers over a shared `seedPlanIn(stage, ...)` that holds the content builder once (the plan's
   Step 12 duplication note, done in the same edit).

## Execution Plan

### Step 8: TEST
- [x] Red evidence: in a scratch copy outside the tree, make `taskTransition`'s start refuse an implement task whose plan is in neither `plans/todo/` nor `plans/in-progress/`. Run `node --test tests/scheduler-enforced.test.js tests/menu-protocol.test.js tests/w10-live-agent-reconcile.test.js` there without the new fixtures and record the 13 failing test names in the build record. E-SYNC and B-PROMOTE-failcancel(fail) are refused too but stay green for a reason other than their own (queued → failed is legal); record them as "refused, still green" and fix them for intent, as decision 3 does for E-SYNC.
- [x] Write each fixture change above. Run the three files in the scratch copy with the fixtures and record that all pass; then run them in the tree on today's code and record that all pass. This is the slice's red evidence.

### Step 9: PREPARE
- [x] Re-read the three files as they are now (line numbers above are from v6.14.125; another plan may have moved them).

### Step 10: IMPLEMENT
- [x] `tests/scheduler-enforced.test.js`: the fixture changes of the eight tests named above.
- [x] `tests/menu-protocol.test.js`: the five fixture changes.
- [x] `tests/w10-live-agent-reconcile.test.js`: `seedTodoPlan`, `seedQueued`, case 6's second task.

### Step 11: REVIEW
- [x] The critic checks that no assertion changed, and that each test still exercises the rule its name states. (Critic, extra-high effort: no blocking findings, no assertion changed; two readability nits in `w10-live-agent-reconcile.test.js`, applied in Step 12.)

### Step 12: OPTIMIZE
- [x] No duplicated helper: `seedTodoPlan` reuses the in-progress helper's content builder if one can be shared in a line. (Done: both wrap `seedPlanIn`. Critic nits applied: `seedQueued` holds `const slug = plan || 'w10-s4-queued'` once; the content-builder doc comment now sits above `seedPlanIn`, the wrappers have one line each, and `seedRunning` has its own doc comment directly above it.)

### Step 13: SECURE
- [x] The security scanner confirms the slice touches only `tests/`. (Scanner, extra-high effort, verdict warn: HIGH, an absolute scratch path with the home-folder account name in this record, replaced by a relative form; the plan was checked for any other absolute home or temp path, none left. Medium: no analyzer engines ran; the CTO Chief runs the secrets detector and the static scanner once on the combined change before the release.)

### Step 14: VERIFY
- [ ] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.

### Step 15: DOCUMENT
- [x] The build record lists every changed test by name. (Step 10 section of the Execution Record lists all fifteen. Test-only slice: no user-facing behaviour, no public API and no CHANGELOG entry change; nothing else needed documenting.)

### Step 16: FINAL-REVIEW
- [x] Every acceptance box is checked against the test run quoted in the build record. (The three files: 80 tests, 80 pass, 0 fail, 0 skipped; `npm test` in the build record: 13136 pass, 0 fail, coverage 99.88%. Final run is Step 14 at completion.)

## Execution Record

Build task t318, Steps 8-10, against v6.14.125 (tree as found: none of the three files had local changes).

### Step 8 — red evidence (scratch copy outside the repository)

Scratch copy: `.../scratchpad/defects/build-s1/`
(`src/`, `agents/`, `skills/`, `docs/`, `.ctoc/`, `package.json`, `VERSION`, and the three test files; `node_modules` linked).
In the copy, the start branch of `taskTransition` was made to refuse an `implement` task whose plan is in neither
`plans/todo/` nor `plans/in-progress/` (placed after the scheduler's own decision, decision 5). The three files
as they were (no fixtures): `tests: 80, pass: 67, fail: 13, skipped: 0`.

The 13 failing tests:
- tests/scheduler-enforced.test.js: E-FILE, E-FORCE, E-OK, D1, D2, X3, X4
- tests/menu-protocol.test.js: B-PROMOTE-run, B-PROMOTE-failcancel(cancel), B-PROMOTE-blocked, B-PROMOTE-idfilter
- tests/w10-live-agent-reconcile.test.js: case 6, case 6b

Refused, still green (a start refused for a reason other than the test's own): E-SYNC, B-PROMOTE-failcancel(fail).
Both are fixed for intent below.

With the fixtures, the same three files in the scratch copy (refusal in place): `tests: 80, pass: 80, fail: 0, skipped: 0`.
The same three files in the tree on today's code: `tests: 80, pass: 80, fail: 0, skipped: 0`.

### Step 10 — what changed (tests only; no assertion touched)

tests/scheduler-enforced.test.js (uses `writePlan`):
- E-FILE: `writePlan('todo','pA',{files:['src/shared.js']})` before the first start.
- E-SYNC: `writePlan('todo','pA',{files:['src/a.js']})` before the build start (for intent).
- E-FORCE: `writePlan` for pA before its start and for pB (`src/shared.js`) before the forced start.
- E-OK, X3, X4: `writePlan('todo','pA',{files:['src/a.js']})` at the top of the test.
- D1, D2: the blocker is a `quality` task (non-build) holding `src/shared.js`; D1's comment reworded as the plan says.

tests/menu-protocol.test.js (uses `seedInProgressPlan`):
- B-PROMOTE-run, B-PROMOTE-blocked, B-PROMOTE-idfilter: the existing seed line moved to just before the start.
- B-PROMOTE-failcancel(fail), B-PROMOTE-failcancel(cancel): seed line added before the start (new comment).

tests/w10-live-agent-reconcile.test.js:
- `seedTodoPlan(slug, files)` added; `seedInProgressPlan` and `seedTodoPlan` share `seedPlanIn(stage, slug, files)`.
- `seedQueued` seeds the plan in `plans/todo/` before recording the task (cases 6, 6b).
- Case 6: the second task is `{ kind: 'review', plan: 'p-start-2' }` with the plan's comment.

### Step 14 evidence (whole suite, run at the end of Step 10)

`npm test`: `tests 13136, suites 2118, pass 13136, fail 0, cancelled 0, skipped 0`;
`[CTOC test-gate] coverage 99.88% (threshold 99%), skipped 0, failed 0`; corpus claims verified 3, refuted 0; PASS.
Output saved at `.../scratchpad/defects/npm-test-s1.txt`.

### Steps 11-13, 15-16 — reviews (build task t318, second round)

- Step 11 REVIEW (critic, extra-high effort): no blocking findings; two nits in `tests/w10-live-agent-reconcile.test.js` (repeated `plan || ...` in `seedQueued`; helper comments out of place).
- Step 12 OPTIMIZE: both nits applied in `tests/w10-live-agent-reconcile.test.js` (a `slug` constant in `seedQueued`; doc comments moved to `seedPlanIn` and `seedRunning`); no assertion touched.
- Step 13 SECURE (security scanner, extra-high effort, verdict warn): HIGH, a home-folder scratch path in this record, replaced by `.../scratchpad/defects/build-s1/`; medium, no analyzer engines ran, so the CTO Chief runs the secrets detector and static scanner once on the combined change before the release.
