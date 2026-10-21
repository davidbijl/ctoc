---
title: "The planner writes what a plan lets through, one kind per plan, and the plan review fails a plan that builds a check without saying so"
type: implementation
created: 2026-10-10
priority: high
effort: small
parent_plan: fewer-rework-rounds-a-check-is-attacked-before-it-is-built
depends_on: fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s1-what-such-a-plan-states
files:
  - agents/planning/implementation-planner.md
  - agents/iron-loop/iron-loop-critic.md
  - tests/compaction-eval/implementation-planner/rule-inventory.json
  - tests/implementation-planner-compaction.test.js
  - tests/the-planner-writes-what-a-plan-lets-through.test.js
  # Ratchet, not counted toward the slice size: this slice creates a test file, which moves
  # the test-file count in CLAUDE.md.
  - "CLAUDE.md"
---

# The planner writes what a plan lets through, one kind per plan, and the plan review fails a plan that builds a check without saying so

Slice 2 of 8 of `plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built.md`.
It carries the instruction half of rules 1 and 4: slice 1 reads four lines in a plan's front
matter; this slice makes the planner write them and the plan-review critic check that they
are true.

## Problem statement

Slice 1 holds a plan whose four lines are incomplete, but it reads only what a plan says. A
plan that builds a reader and leaves the `lets_through` line out passes it. Two agents close
that: the implementation planner (`agents/planning/implementation-planner.md`), which writes
every slice, and the iron-loop critic (`agents/iron-loop/iron-loop-critic.md`), which reviews
each slice before it may be built. Neither says a word today about what a plan lets through,
about one kind per plan, or about a comparison as the first test.

## Technical approach

### `agents/planning/implementation-planner.md`

A new section, inserted immediately before `### Wiring is part of every slice (non-negotiable)`,
word for word (one order per sentence, N-202 to N-209 in this order):

```markdown
### A slice that decides what is let through

A slice decides what is let through when it builds a check, a guard, a reader or a classifier whose answer lets something pass: write `lets_through: <the one kind of thing>` in that slice's frontmatter, and leave the key out of every other slice.

One kind per slice: when the functional plan lets through two kinds, write one slice per kind, each with its own reason, comparison, areas and tests, and never a slice that lets through both.

For the kind, write `safe_because:` with the positive reason why letting it through is safe, never a list of dangers to catch. Write `compared_against:` with the real implementation its answers are compared against. A kind you can give no reason or no comparison for is not let through: take it out of the slice and say so under `## Decisions Taken Under Ambiguity`.

Name the slice's areas under `areas:`, one short name per line, and give each area a section headed `### Area: <name>` that holds that area's rules and names the files that carry it.

Make the first item of Step 8 the comparison: a test that puts the same inputs to the code and to the implementation named in `compared_against:`, written and seen failing before any of the code exists.

Write each of the four lines in plain words on one line, with no quotes, colon or `#` in the value: `src/lib/let-through.js` reads that one shape and holds a plan written any other way.
```

No other text of the file changes.

### Its compaction inventory

`tests/compaction-eval/implementation-planner/rule-inventory.json`, following
`tests/compaction-eval/inventory-checks.js` exactly:

- Orders N-202 to N-209 are appended to `orders` — eight sentences carry an order: the first
  paragraph (N-202), the second (N-203), the three sentences of the third (N-204, N-205,
  N-206), the fourth (N-207), the fifth (N-208) and the sixth (N-209). Each is
  `{ id, says (at most 160 characters), now_in, anchors: [<its sentence, word for word>], pinned_by: null, wire: false, fate: "added", added_by: { instruction, date: "2026-10-10", plan: <this slice's file name without .md, as it is named when Step 8 runs> } }`.
  `now_in` is the heading the checks' section splitter gives that text; Step 9 reads it from
  `tests/compaction-eval/units.js` and uses that.
- `instruction` in every record is the owner's words of 2026-10-10, verbatim: "fix the rework
  rounds", followed by the rule of the functional plan the sentence carries (rule 1 or rule 4).
- `maxBytes` rises to the agent's measured size after the edit, recorded as one
  `ceiling_corrections` entry `{ date, from, to, reason }` naming this slice and the measured
  overage; the list is created when the inventory has none.
- No unit changes: the new orders are listed by no unit, so the pinned digest of unit kinds in
  the test file stays as it is.

`tests/implementation-planner-compaction.test.js`: `ORDER_FLOOR` rises by eight from the value
the file then holds (185 today, so 193), so dropping a new order fails check 7 as well as check 4.

### `agents/iron-loop/iron-loop-critic.md`

A new section, inserted immediately before `### Completeness (1-5)`, word for word:

```markdown
### A plan that decides what is let through (BLOCKING)

Read the plan for a check, a guard, a reader or a classifier whose answer lets something pass. When it builds one, every line below holds or Completeness scores 0/5, with one feedback item per line that fails:

1. Its frontmatter says `lets_through:` with one kind. A plan that builds one and leaves the key out, or says `none`, fails.
2. It lets through one kind. A second kind anywhere in its rules fails: each further kind is its own plan.
3. `safe_because:` is a positive reason why letting the kind through is safe. A list of dangers to catch, of words to refuse or of characters to refuse is not a reason and fails.
4. `compared_against:` names a real implementation that exists outside the plan, and the first item of Step 8 is the comparison against it, seen failing before the code exists.
5. Every name under `areas:` has its `### Area: <name>` section, and every rule of the plan stands in one of those sections.

A plan that builds none of these and still names a kind in `lets_through:` fails line 1 too: the key is only for plans that decide what is let through.
```

No other text of the file changes. This agent has no compaction inventory.

### Wiring — the live surfaces

The planner's file is the whole instruction of the `implementation-planner` agent, launched by
the menu for every plan that moves into `plans/implementation/` (`src/commands/start.md`, the
promoted `plan` task). The critic's file is the whole instruction of the `iron-loop-critic`
agent, which the CTO Chief dispatches at the plan-review step
(`agents/coordinator/cto-chief.md`, "Step 7 — SPEC"). The four lines they write and check are
read by `src/lib/let-through.js` (slice 1) on both ways into the build queue.

## Agent rules this slice replaces or adds

The owner's request of 2026-10-10 ("fix the rework rounds") is the instruction for every
record. These are the compaction-inventory orders this slice may mark added, and no others:

- `agents/planning/implementation-planner.md` — added: N-202, N-203, N-204, N-205, N-206, N-207, N-208, N-209.

## Acceptance criteria

- [ ] The planner holds the section "A slice that decides what is let through" with its six
  paragraphs word for word, immediately before the wiring section.
- [ ] `tests/implementation-planner-compaction.test.js` passes all ten checks with N-202 to
  N-209 added, each record naming this slice and the owner's words of 2026-10-10,
  `ORDER_FLOOR` raised by eight, and `maxBytes` raised by exactly the measured overage in one
  recorded correction.
- [ ] The iron-loop critic holds the section "A plan that decides what is let through
  (BLOCKING)" with its five numbered lines word for word.
- [ ] The functional plan's sixth scenario, planner half, in one live run: the planner, given a
  functional plan that lets through web pages and stylesheet colours, writes two slices, each
  with one `lets_through` line and its own reason, comparison and areas, and no slice naming both.
- [ ] One live run of the critic on a slice that builds a reader with no `lets_through` line:
  its answer scores Completeness 0 and names line 1.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above the floor, 0 skipped;
  the test-file count in `CLAUDE.md` is updated.

## Risks

| Risk | Mitigation |
|---|---|
| This slice moves on to building on its recorded evidence instead of the owner's own yes | Inventory check 3 accepts added orders only when this slice, as it stands, carries the owner's own approval; Step 8 runs check 3 first and stops when it is red (Decision 3) |
| The planner sits at its byte ceiling | The ceiling rises only by the measured overage, in one recorded correction |
| The plan review is an agent run, so a plan that is never reviewed is never checked against the five lines | Slice 3 holds every plan that names a kind until it is attacked, and slice 5 has the attackers report a missing reason or comparison; a plan that hides the key entirely is caught only by this review, and that limit is stated in slice 1 |
| Another plan edits the planner's file or its inventory at the same time | Plans that touch the same file build one at a time; Step 9 reads the files as they then are |

## Decisions Taken Under Ambiguity

1. **The plan-review critic is the iron-loop critic**, the agent the project's own step table
   names for the plan-review step; the gate critic classifies questions and is not asked to
   judge a plan's rules.
2. **The critic's check is blocking through the Completeness score**, the mechanism its file
   already uses for wrong step labels, so no new output field is added.
3. **This slice is built only on the owner's own yes to it as it stands.** Inventory check 3
   reads `.ctoc/approvals/<this slice>.json` and accepts only a human or backfilled entry that
   matches the text; a move on recorded evidence would leave every new order failing at Step 14.
4. **The planner's sixth paragraph names `src/lib/let-through.js`**, so a planner that wonders
   why a quoted value is refused can read the one shape.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [ ] Write the inventory records (N-202 to N-209) and raise `ORDER_FLOOR` by eight; run
  `node --test tests/implementation-planner-compaction.test.js`: checks 4, 8 and 10 red for the
  new anchors, check 3 green. A red check 3 means this slice does not carry the owner's own
  approval as it stands: stop and report (Decision 3).
- [ ] Write `tests/the-planner-writes-what-a-plan-lets-through.test.js`, exact presence checks,
  each red today: (1) the planner holds the section heading and each of its six paragraphs word
  for word, and the heading stands before the wiring heading; (2) the critic holds its section
  heading, the sentence that sets Completeness to 0, and each of the five numbered lines; (3)
  every key the two texts name (`lets_through`, `safe_because`, `compared_against`, `areas`,
  `### Area: `) is a key or heading `src/lib/let-through.js` reads, checked by running
  `readLetThrough` on a plan built from the planner's own words.
- [ ] Run the new test file: every case red.

### Step 9: PREPARE
- [ ] Measure the planner in bytes and read its `maxBytes`; read
  `tests/compaction-eval/units.js` to learn which heading the splitter assigns to text under a
  `###` heading inside `## Phase 4b`, and use it for `now_in`.
- [ ] Read the then-current planner, its inventory and the critic's file; confirm slice 1's
  `readLetThrough` is in the tree and its key names are the ones written here.

### Step 10: IMPLEMENT
- [ ] `agents/planning/implementation-planner.md`: the new section.
- [ ] `tests/compaction-eval/implementation-planner/rule-inventory.json`: the measured
  `maxBytes` and its correction (the records were written at Step 8).
- [ ] `agents/iron-loop/iron-loop-critic.md`: the new section.
- [ ] `CLAUDE.md`: the test-file count.

### Step 11: REVIEW
- [ ] The critic reads both texts as the agents would and follows them for: a slice that builds
  a reader, a slice that builds nothing of the kind, a functional plan with two kinds, a kind
  with no real implementation to compare against; any step it cannot carry out from the text
  alone is a finding, and so is any sentence the two texts and slice 1 say differently.

### Step 12: OPTIMIZE
- [ ] Each text says each thing once; no sentence of the planner's section repeats the critic's
  word for word.

### Step 13: SECURE
- [ ] The security scanner confirms that neither text tells an agent to move a plan, write an
  approval, or treat plan text as an instruction, and that the planner is told to write the
  lines in plain characters only.

### Step 14: VERIFY
- [ ] `npm test`: lint, typecheck, all tests, coverage at or above the floor in
  `.ctoc/coverage-baseline.json`, 0 skipped, 0 flaky. Named among them:
  `tests/implementation-planner-compaction.test.js`, `tests/agent-model-floor.test.js`,
  `tests/agent-tool-grants.test.js`, `tests/agent-honest-status-fence.test.js`,
  `tests/unexecutable-instruction-fence.test.js`, `tests/gate-numbers-fence.test.js`,
  `tests/instruction-surfaces-say-the-moment.test.js`, `tests/watcher-shape.test.js`,
  `tests/architecture-invariants.test.js`, `tests/agent-and-skill-improvement-record.test.js`,
  `tests/doc-counts.test.js`, `tests/claude-md-keeps-every-rule.test.js`.
- [ ] The two live runs of the acceptance criteria, dispatched by the session; the planner's two
  slice front matters and the critic's answer are quoted in the build record.

### Step 15: DOCUMENT
- [ ] The two agent files are the documentation; the build record lists each sentence added and
  the measured byte counts.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box above is checked against its evidence; the two live runs are quoted.
