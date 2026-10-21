---
title: "Every fix round after a review is counted by the circuit breaker, per area, and no third fix round starts for one area"
type: implementation
created: 2026-10-10
priority: high
effort: medium
parent_plan: fewer-rework-rounds-a-check-is-attacked-before-it-is-built
depends_on: fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s1-what-such-a-plan-states
files:
  - src/lib/circuit-breaker.js
  - src/lib/menu-screens.js
  - docs/IRON_LOOP.md
  - tests/fix-rounds-are-counted.test.js
  - tests/circuit-breaker-coverage.test.js
  # Ratchet, not counted toward the slice size: this slice creates a test file, which moves
  # the test-file count in CLAUDE.md.
  - "CLAUDE.md"
---

# Every fix round after a review is counted by the circuit breaker, per area, and no third fix round starts for one area

Slice 6 of 8 of `plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built.md`.
It carries the code of rule 3: the counting, and the stop after two fix rounds in one area.
What the session is told to do with it is slice 8; what the build agent is told is slice 7.

## Problem statement

The circuit breaker keeps one counter per plan in `.ctoc/state/kickbacks/<plan>.json`, holding
`plan`, `by_step`, `total` and `updated_at` (`src/lib/circuit-breaker.js:273-279`).
`recordKickback` (`:389`) has one caller, `actions.recordStepKickback`
(`src/lib/actions.js:1492`), reached from exactly two places: a completion refused before
review (`:1029`) and a failed verification (`:1149`). A fix round after a review passes through
neither: the hotfix check's nine recorded fix rounds left no counter file at all. So the limits
the project promises (3 for one step, 5 for a plan, then the owner is told) never see the kind
of repair that went wrong, and nothing knows how often one area was repaired.

## Technical approach

### The counter gains areas

The counter file gains one optional key, `by_area`: `{ "<area>": <number of fix rounds counted> }`.
Nothing else in it changes, and a file without the key reads as no fix rounds.

### File: `src/lib/circuit-breaker.js`
**Action:** MODIFY

- **`readKickbackState`** (`:230`): a `by_area` that is present must be a plain object whose
  values are whole numbers of 0 or more; otherwise the file is `unreadable`, as a malformed
  `by_step` already is. The returned `counts` gain `by_area` (an object with no prototype,
  empty when the key is absent).
- **`normalizeCounts`**, **`maxCounts`** and **`writeKickbackState`** (`:102`, `:190`, `:270`)
  carry `by_area` through: the element-wise maximum when two records are folded, and written
  back on every write — so `recordKickback`, called for a failed verification after a fix
  round, never erases the area counts.
- **New export `recordFixRound(planPath: string, area: string, projectPath: string)`** →
  `{ recorded: true, area, round: 1|2, byStep: number, total: number, escalation: object|null }`
  or `{ recorded: false, refused: true, reason: 'two-rounds-used'|'count-unreadable'|'unknown-area'|'no-areas', area, rounds?: number }`.
  - `projectPath` missing → throws `projectPath required`, as `readKickbackCounts` does. A plan
    file that cannot be read → throws, as `recordKickback` does (a plan that is not there must
    never count quietly).
  - The plan's areas are read with `let-through.readLetThrough` from the plan text already
    read. No kind or no areas → `reason: 'no-areas'`, nothing written (Decision 3). `area` not
    one of them, letter for letter → `reason: 'unknown-area'`, nothing written.
  - The counter is `unreadable` → `reason: 'count-unreadable'`, nothing written, and one
    `breaker-failure` entry is appended through `recordBreakerFailure`: with the area counts
    unknown CTOC cannot say whether this would be a first or a third fix round, so none is
    counted and the owner is told. (`recordKickback` keeps its own rule for this case.)
  - `by_area[area]` is already 2 → `reason: 'two-rounds-used'`, `rounds: 2`, no count is
    changed, and one entry `{ type: 'area-stopped', plan, area, at }` is appended to
    `.ctoc/logs/escalations.json` through `appendEscalation` — once: when the log already holds
    that type for that plan and area, nothing is appended.
  - Otherwise `by_area[area]` rises by one and one kickback is counted for step 10 in the same
    write, with the existing limits and the existing escalation entry when one is passed
    (`:423-442`); `round` is the area's new count.
- `module.exports` gains `recordFixRound`. The header comment's "LIVE CALL SITE" paragraph gains
  the new caller.

### File: `src/lib/menu-screens.js`
**Action:** MODIFY

- **`route`** (`:2790`): a new `case 'fix-round':` — `fix-round <ref> <area words…>`, the area
  being the remaining words joined by one space (as `stream comment` joins its text, `:2825`).
  `ref` must be `todo/`, `in-progress/` or `review/` followed by a plan file name of the shape
  the menu already accepts (`^[A-Za-z0-9_][A-Za-z0-9._-]*\.md$`, no `..`) and the file must
  exist; otherwise `{ ok: false, text: 'That is not a plan that is being built.' }`. It calls
  `recordFixRound` and answers:
  - counted: `{ ok: true, recorded: true, area, round, total, text }`, `text` being
    `fix round <round> of 2 for <area> in <the plan's name> is counted; it is fix number <total> of 5 for this plan.`
    and, when a limit was passed, the further sentence
    `The circuit breaker's limit is passed, so tell the owner before this plan is repaired again.`
  - `two-rounds-used`: `{ ok: false, refused: true, reason, area, text }`, `text` being
    `No third fix round starts for <area> in <the plan's name>: two fix rounds did not close it. The plan goes back to planning, where <area> is taken out of it or its rules are reworked.`
    (the second sentence rests on Open question 1).
  - `count-unreadable`: `The count of fix rounds for <the plan's name> could not be read, so no fix round is counted or started; the owner is told.`
  - `unknown-area`: `<area> is not one of this plan's areas (<its areas, comma-separated>).`
  - `no-areas`: `This plan names no areas, so its fix rounds are not counted here.`
  - a thrown error: `{ ok: false, text: 'The fix round could not be counted.' }` with the
    cleaned message in `error`.
  Every plan or argument text in `text` goes through `stripCtl`.
- **`inboxEscalationsScreen`** (`:1042`): an entry of type `area-stopped` is shown as
  `<plan>  no third fix round for <area>: two fix rounds did not close it`. Other types render
  as today.

### `docs/IRON_LOOP.md`

In "### Circuit Breaker": one row and two sentences. The row: `Fix rounds for one area of a
plan that decides what is let through | 2 | No third fix round starts; the area is stopped and
the owner is told`. The sentences: a fix round after a review counts as one kickback to Step
10 when the session records it with the menu's `fix-round` before starting it; a fix made
without that call is not counted, and nothing can see it, because no hook is loaded for it.

### What this slice lets through, and why that is safe

**Kind:** a fix round on its way to being started. **Why passing is safe:** a fix round is
counted and allowed only when the plan's counter was read, the area is one of the plan's own,
and that area has had fewer than two. **Compared against:** this slice writes no reader of
content — the areas come from slice 1's reader, the counter is this module's own file read
with `JSON.parse`; what is added is one addition and one comparison with 2. The first test
compares the route's answers over every sequence of up to four calls on two areas with the
same counts kept by hand in the test. **Areas:** the counter; the route.

By rule 2 this slice's rules are attacked before it is built, one run per area; until slice 3's
route exists the session dispatches the two attackers by hand, and every way through they find
is closed by a change to this slice before it is approved for building.

### Wiring — the live call sites

`recordFixRound` is called by the `fix-round` case of `menu-screens.route`, which
`src/commands/start.js` runs for every menu call. The escalation entry is read by
`inbox.listEscalations` (`src/lib/inbox.js:278`) and shown by `inboxEscalationsScreen`, the
menu's escalations list. A background agent's call of `fix-round` is refused by the loaded
hook's existing rule for menu routes off its allowed list (`docs/ENFORCEMENT.md`), so a build
agent cannot count its own fix round. No hook is added or changed.

### Dependency graph

```
src/lib/circuit-breaker.js --requires--> src/lib/let-through.js (slice 1), js-yaml, safe-fs
src/lib/menu-screens.js --requires (lazily, in the case)--> src/lib/circuit-breaker.js
tests/fix-rounds-are-counted.test.js --drives--> route(['fix-round', …]), recordKickback
```

### Security review

- Path traversal: the reference is shape-tested before any path is built; the counter path is
  built by the module's own `kickbackStatePath` from the plan's base name.
- Prototype pollution: an area is accepted only when it equals one of the plan's names, which
  slice 1 limits to letters, digits, spaces, hyphens and underscores; `by_area` is read into an
  object with no prototype.
- Fail closed: an unreadable counter refuses the fix round and tells the owner; it never reads
  as zero rounds.
- The counter file is not write-protected by the loaded hook (only the approval records, the
  check records, the question store and the settings are); an agent with a shell could lower
  it. Stated in `docs/IRON_LOOP.md`; protecting it would change the hook, which this plan does not.
- No shell, no network, no secret.

## Acceptance criteria

- [ ] The functional plan's fourth scenario: for a plan being built that names the area
  `page reader`, `fix-round in-progress/<file>.md page reader` answers `recorded: true`,
  `round: 1`, and the plan's kickback count read with `readKickbackCounts` is one higher than
  before, for the plan and for step 10.
- [ ] The functional plan's fifth scenario: a second call answers `round: 2`; a third answers
  `refused: true` with exactly the `two-rounds-used` text, changes no count, and leaves one
  `area-stopped` entry that the escalations list shows; a fourth adds no second entry.
- [ ] A fix round for another area of the same plan after that answers `round: 1`.
- [ ] When the fourth kickback to step 10 or the sixth for the plan is counted, the existing
  escalation entry is written and the answer's text says the owner is to be told.
- [ ] A failed verification recorded through `recordKickback` after two fix rounds leaves
  `by_area` in the counter file unchanged.
- [ ] An unreadable counter, an unknown area, a plan with no areas, a reference outside the
  three stages and an unsafe reference each give their sentence and count nothing.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above the floor, 0 skipped;
  `docs/IRON_LOOP.md` states the row, the two sentences and the limit; the test-file count in
  `CLAUDE.md` is updated.

## Risks

| Risk | Mitigation |
|---|---|
| A fix round is started without the call and is never counted | Not preventable without a hook. Slice 8 tells the session, and slice 7 tells the build agent to refuse a fix brief that does not carry the counted round; `docs/IRON_LOOP.md` states the limit |
| An existing counter file without `by_area` reads as unreadable | Absent means no fix rounds; only a present, malformed `by_area` is unreadable; a case covers both |
| A kickback write drops the area counts | Every write carries them; a case counts a failed verification after two fix rounds and reads the file |
| Two limits answer at once (the area's second round is also the plan's sixth kickback) | The round is counted and both facts are in the answer; only the area's own limit refuses |
| `circuit-breaker.js` gains a require that closes a cycle | Step 9 confirms nothing `let-through.js` requires leads back to `circuit-breaker.js` |

## Decisions Taken Under Ambiguity

1. **A fix round after a review is one kickback to Step 10**, the one step in which code
   changes are made, so the existing limit of three for one step and five for a plan apply to
   it without a new counter.
2. **It is counted when it starts, by a menu call**, because a fix round started by hand passes
   through no code at all; by the time it ends the count is one higher, which is what the
   fourth scenario asks.
3. **Only a plan that names areas has its fix rounds counted here.** The functional plan leaves
   plans that decide nothing about what is let through unchanged.
4. **The area counts live in the circuit breaker's own counter file**, not in a second file:
   one record per plan, written by one module.
5. **Passing the circuit breaker's limits tells the owner and does not refuse the round**, as
   today; only the third round for one area is refused.
6. **An unreadable counter refuses the fix round**, unlike a kickback, which keeps counting
   from the plan's old counter: the plan file never held area counts, so there is no floor to
   fall back on.

## Open question 1 — what happens to the plan when an area is stopped

Read in the code: a plan's text is bound to its approval by a digest of its whole front matter
and its rules (`computeSpecHash`, `src/lib/approval-ledger.js:410`), so an area cannot be taken
out of a plan that is being built without ending that approval; and a built plan reaches
review only when every acceptance box is ticked (`validateAcceptanceCriteria`,
`src/lib/plan-validator.js:590-632`), so the boxes of an area that was taken out keep it from
finishing. The functional plan says the area "is taken out of the plan and the rest goes on to
be finished, or the plan goes back to planning"; the code as it stands allows only the second
of these without a change to a check.

- **a (recommended): the plan goes back to planning in both cases.** There the area is taken
  out of it (its name, its rules, its boxes) when the rest still delivers what the plan was
  for, or its rules are reworked; the changed plan is attacked and approved again, and the
  build goes on with the code already written for the other areas. Cost: one more planning
  pass and one more attack for each stopped area. No check changes. This slice's refusal
  sentence and slice 8's instruction are written for this answer.
- **b: the plan stays in the build.** The menu records the area as taken out, and the check
  before review accepts unticked acceptance boxes that name that area. That changes what a
  built plan needs before review, which needs the owner's explicit yes, and every acceptance
  box of such a plan would have to name its area.

What it changes here: one sentence of the `two-rounds-used` text. Also not decided by the code:
the menu's "send it back" action names a destination (`src/lib/streaming-gate.js:1624`) while
`rejectPlan` moves a plan exactly one place back (`src/lib/actions.js:834`); how a plan being
built reaches planning again is part of the same answer.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [ ] Write `tests/fix-rounds-are-counted.test.js`, driving `route(['fix-round', …])` in a
  temporary project with a plan in `plans/in-progress/` that names two areas. The first test
  written is the comparison: every sequence of up to four calls over the two areas, the
  answers' `recorded`, `round` and `refused` compared with counts kept by hand in the test.
  Run it and see it fail.
- [ ] Add: the fourth scenario (the count before and after, read with `readKickbackCounts`);
  the fifth (the exact refusal text, no count changed, one `area-stopped` entry, no second one
  on a repeat, the entry's line on `route(['inbox', 'escalations'])`); the other area's first
  round after a stop; the existing escalation on the fourth kickback to step 10; a
  `recordKickback(planPath, 14, root)` after two fix rounds leaves `by_area` as it was; a
  counter file with `by_area` as a string, as a list, and with a negative value is unreadable,
  refuses with its sentence and leaves a `breaker-failure` entry; a counter file with no
  `by_area` counts the first round; an unknown area, a plan with no areas, a plan in
  `plans/implementation/`, `in-progress/../x.md` and a missing file each give their sentence
  and write nothing; an area holding an escape sequence is shown cleaned.
- [ ] Add to `tests/circuit-breaker-coverage.test.js`: `recordFixRound` with no `projectPath`
  throws `projectPath required`; with a plan path that does not exist it throws.
- [ ] Run both files: every new case red. The existing circuit breaker tests
  (`tests/circuit-breaker-wiring.test.js`, `tests/circuit-breaker-block-prepend.test.js`,
  `tests/circuit-breaker-malformed-frontmatter.test.js`, `tests/ctoc-audit-w05-circuit-breaker.test.js`)
  are run unchanged and stay green.

### Step 9: PREPARE
- [ ] Read the then-current `src/lib/circuit-breaker.js` and its five test files; confirm that
  no test pins the counter file's exact set of keys in a way an added `by_area` breaks, and
  quote any that does before changing anything.
- [ ] Confirm that nothing `src/lib/let-through.js` requires leads back to
  `src/lib/circuit-breaker.js`, and that slice 1's `readLetThrough` is in the tree.
- [ ] Read `inbox.listEscalations` and confirm an entry of an unknown type is listed, not
  filtered out.
- [ ] Read which tests pin the text of `docs/IRON_LOOP.md` and of the escalations screen.

### Step 10: IMPLEMENT
- [ ] `src/lib/circuit-breaker.js`: `by_area` in the reader, the folds and the writer;
  `recordFixRound`; the export; the header paragraph.
- [ ] `src/lib/menu-screens.js`: the `fix-round` case and the `area-stopped` line.
- [ ] `docs/IRON_LOOP.md`: the row and the two sentences.
- [ ] `CLAUDE.md`: the test-file count.

### Step 11: REVIEW
- [ ] One reviewer per area (the counter; the route), at the same time. The first tries five
  ways to get a third fix round counted for one area, or to lose a count; the second tries ten
  references and area arguments of its own that should be refused. One that works is a finding.

### Step 12: OPTIMIZE
- [ ] Confirm by reading that a fix round costs one read of the plan, one read of the counter
  and one write, and that `recordKickback`'s own path gained no extra file read.

### Step 13: SECURE
- [ ] The security scanner attacks the route and the counter: `__proto__`, `constructor` and
  `toString` as the area on a plan that lists them; a counter file that is a symbolic link or a
  folder; two fix rounds recorded at once; an area argument of 100,000 characters; an
  escalations log that is not a list. None may end in a third counted round, a crash that the
  route does not turn into its sentence, or a write outside `.ctoc/state/kickbacks/` and
  `.ctoc/logs/`.

### Step 14: VERIFY
- [ ] `npm test`: lint, typecheck, all tests, coverage at or above the floor in
  `.ctoc/coverage-baseline.json`, 0 skipped, 0 flaky. Named among them: the five circuit
  breaker test files, `tests/menu-protocol.test.js`, `tests/menu-task-wiring.test.js`,
  `tests/protect-records.test.js`, `tests/false-green-fence.test.js`,
  `tests/reachability.test.js`, `tests/export-reachability.test.js`, `tests/doc-counts.test.js`,
  `tests/claude-md-keeps-every-rule.test.js`, `tests/gate-numbers-fence.test.js`.

### Step 15: DOCUMENT
- [ ] JSDoc on `recordFixRound` and on the `fix-round` case; the module header; `docs/IRON_LOOP.md`
  as above.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box above is checked against its evidence; the comparison test's first
  failing run is quoted; Open question 1's answer, when the owner has given one, is quoted
  beside the sentence it decides.
