---
title: "The screen where the owner decides says, in one sentence each, why such a plan is not built yet"
type: implementation
created: 2026-10-10
priority: high
effort: small
parent_plan: fewer-rework-rounds-a-check-is-attacked-before-it-is-built
depends_on: fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s3-the-attack-is-recorded
files:
  - src/lib/streaming-gate.js
  - tests/streaming-gate.test.js
  - tests/plans-keep-moving-without-the-human.test.js
---

# The screen where the owner decides says, in one sentence each, why such a plan is not built yet

Slice 4 of 8 of `plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built.md`.
Slices 1 and 3 hold a plan and produce the sentences; this slice puts them on the screen the
owner sees first, as the functional plan's third scenario asks ("the owner reads one sentence
naming it").

## Problem statement

After slice 3, a plan with a missing line, a missing attack or an open way through fails
`validateForQueue`, and the menu keeps it out of the build queue. But the decision screen only
keeps a yes or no from that check (`passesValidation`, `src/lib/streaming-gate.js:1037-1043`)
and shows "this plan fails validation; open it to see what to fix" (`buildOptions`, `:1823`).
The sentence that names the way through is two choices away, behind "Open the plan" and
"Check validation". The functional plan's risk is a plan held for a reason the owner never
reads.

## Technical approach

### File: `src/lib/streaming-gate.js`
**Action:** MODIFY

- **`pendingGateDecisions`** (`:1017`): the validation result it already computes is kept for
  one more field. From `v.checklist.letThrough.sentences` (slice 1) and
  `v.checklist.attack.sentences` (slice 3), each read only when it is a list of strings, the
  descriptor gains `notBuiltBecause: string[]` — slice 1's sentences first, then slice 3's;
  `[]` for every plan without them, for every stage other than `implementation`, and when the
  check threw. No second read of the plan or the record: the sentences come from the one
  validation that also decides the crossing.
- **A new internal function `notBuiltLines(d)`**, beside `regimeLine` (`:1742`): `''` when the
  list is empty; otherwise one line per sentence, `  It is not built yet: <sentence>\n`, at
  most three, then `  … and <n> more; choose Open the plan, then Check validation, to read them all.\n`.
  Every sentence goes through `stripCtl`.
- **`gateScreenAt`** (`:1879`): the lines follow `sufficiencyLine(d)` or `uncheckedLines(...)`.
- **`richQuestionScreen`** (`:1381`): the lines follow the regime line (`:1413`), so they also
  show while one of the plan's questions is being asked.
- **`planDecisionScreen`** (`:1518`), in the branch that asks the plain question for a plan
  waiting for a decision: the validation it already runs (`:1591`) supplies the same two
  lists, and the same lines are added to `text`.

Nothing here decides anything: the crossing condition (`:1051`) is untouched, and
`passesValidation` is computed exactly as before.

### Wiring — the live call sites

`pendingGateDecisions`, `gateScreenAt`, `richQuestionScreen` and `planDecisionScreen` are the
menu's default screen and its plan screen, reached from `src/commands/start.js` through
`menu-screens.route` (no arguments, `stream …`, `plan <ref>`). This slice adds no module and no
export.

### Security review

- The sentences are composed by slices 1 and 3 from capped, cleaned plan and payload text;
  they pass `stripCtl` again here, so no control character reaches the terminal.
- No path is built, no file is read beyond what the validation already read, nothing is written.
- The option list is unchanged: a plan that fails the check is still offered no approve option
  (`buildOptions`), so the new lines cannot be mistaken for a way to cross.

## Acceptance criteria

- [ ] A plan in `plans/implementation/` with an open way through is listed by
  `pendingGateDecisions` with `notBuiltBecause` holding exactly slice 3's open sentence, and
  the default screen's text shows it on one line starting `It is not built yet:`.
- [ ] The same plan with enough information recorded for its questions is not moved into the
  build queue by the default screen or by the continuation (`continueAfterCrossing`), and no
  build starts for it; after four clean runs for its current text it moves on the next pass.
- [ ] A plan with unanswered questions and an open way through shows the line on the question
  screen as well.
- [ ] A plan with five sentences shows three and the line naming how to read the rest.
- [ ] A plan that names no kind, and a plan in `plans/functional/` or `plans/review/`, give
  `notBuiltBecause: []` and a screen text byte-identical to today's.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above the floor, 0 skipped.

## Risks

| Risk | Mitigation |
|---|---|
| A screen test pinned to today's text fails | The lines are added only for a plan that carries the sentences; a guard case asserts byte-identical text for every other plan |
| The check's result changes shape and the lines silently vanish | A case fails when slice 1's or slice 3's checklist entry is renamed, because it drives the real validator, not a made-up result |
| A long sentence makes the screen unreadable | Slices 1 and 3 cap each sentence; this slice shows at most three |

## Decisions Taken Under Ambiguity

1. **The sentences ride on the validation result the screen already has**, not on a second
   call: the line shown is from the same check that keeps the plan where it is.
2. **At most three sentences on the first screen**, the rest behind the existing "Check
   validation" screen, which lists every failed check in full.
3. **Only plans waiting in `plans/implementation/` get the lines**: that is the one place the
   hold of slices 1 and 3 acts.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [ ] Add to `tests/streaming-gate.test.js`, driving the real validator in a temporary project
  built with the file's own helpers; each red today unless marked guard:
  1. `pendingGateDecisions` gives `notBuiltBecause` equal to slice 3's open sentence for a plan
     with one way through recorded; equal to the missing sentence with no record; equal to
     slice 1's sentence for a plan with no `compared_against` line.
  2. `streamingGateScreen` text holds `It is not built yet: ` followed by that sentence, on one
     line, after the enough-information line.
  3. The same plan with one unanswered classified question: the question screen's text holds
     the line.
  4. `planDecisionScreen('implementation/<file>')` text holds the line.
  5. Five sentences: three shown, then the line that names how to read the rest.
  6. A sentence holding an escape sequence planted through the payload is shown cleaned.
  7. Guard: a plan with no kind, a functional plan and a review plan give `notBuiltBecause: []`
     and the same screen text as before this slice (compared with the text produced with the
     new function bypassed).
- [ ] Add to `tests/plans-keep-moving-without-the-human.test.js`, with that file's helpers for
  a plan whose questions need nobody: with an open way through, the continuation moves nothing
  and starts no build for it, and `pending` still lists it; after four clean runs it is in
  `crossed` with `toStage: 'todo'`.
- [ ] Run both files: every case red except the guard. The continuation case is proven able to
  fail by removing slice 3's hold in a scratch copy, run once and discarded.

### Step 9: PREPARE
- [ ] Read the then-current `pendingGateDecisions`, `gateScreenAt`, `richQuestionScreen` and
  `planDecisionScreen`, and slice 1's and slice 3's checklist entries as built; quote the two
  field names in the build record.
- [ ] Read the screen tests that pin whole texts (`tests/streaming-gate.test.js`,
  `tests/streaming-gate-coverage-holes.test.js`, `tests/real-question-file-render.test.js`) and
  list any that a plan with a kind could reach.

### Step 10: IMPLEMENT
- [ ] `src/lib/streaming-gate.js`: the descriptor field, `notBuiltLines`, and its three call
  sites.

### Step 11: REVIEW
- [ ] The critic opens the default screen and the plan screen for a plan with a missing attack,
  an open way through and a missing line, and reads them as the owner would: a screen on which
  the reason is not a full sentence, or names a file, a code or a stage instead of the thing,
  is a finding.

### Step 12: OPTIMIZE
- [ ] Confirm by reading that no plan is validated twice and no record is read twice for one
  screen.

### Step 13: SECURE
- [ ] The security scanner plants control characters, a box-drawing run and a 10,000-character
  sentence through a hand-written record in a scratch project and confirms the screen text
  stays line-clean and the option list is unchanged.

### Step 14: VERIFY
- [ ] `npm test`: lint, typecheck, all tests, coverage at or above the floor in
  `.ctoc/coverage-baseline.json`, 0 skipped, 0 flaky. Named among them:
  `tests/streaming-gate.test.js`, `tests/streaming-gate-coverage-holes.test.js`,
  `tests/plans-keep-moving-without-the-human.test.js`, `tests/gate-numbers-fence.test.js`,
  `tests/instruction-surfaces-say-the-moment.test.js`, `tests/menu-protocol.test.js`,
  `tests/golden-corpus-fence.test.js`.

### Step 15: DOCUMENT
- [ ] JSDoc on `notBuiltLines` and on the new descriptor field in `pendingGateDecisions`'
  return type.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box above is checked against its evidence; one screen text with the
  line is quoted in the build record.
