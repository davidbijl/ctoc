---
title: "The CTO Chief and the menu's instructions run the attack, count the fix rounds and split every review by area"
type: implementation
created: 2026-10-10
priority: high
effort: medium
parent_plan: fewer-rework-rounds-a-check-is-attacked-before-it-is-built
depends_on: fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s3-the-attack-is-recorded, fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s5-each-attacker-takes-one-area, fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s6-fix-rounds-are-counted-per-area
files:
  - agents/coordinator/cto-chief.md
  - src/commands/start.md
  - docs/DISPATCH_PROTOCOL.md
  - tests/compaction-eval/cto-chief/rule-inventory.json
  - tests/cto-chief-compaction.test.js
  - tests/such-plans-are-run-by-area.test.js
  # Ratchet, not counted toward the slice size: this slice creates a test file, which moves
  # the test-file count in CLAUDE.md.
  - "CLAUDE.md"
---

# The CTO Chief and the menu's instructions run the attack, count the fix rounds and split every review by area

Slice 8 of 8 of `plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built.md`.
Slices 3, 5 and 6 build the routes and give the attackers their input. This slice tells the
one dispatcher how to use them: the attack before the build (rule 2), the counted fix rounds
(rule 3) and the review by area (rule 6). All instructions for the three land here, after the
code, so each surface changes once and describes routes that exist.

## Problem statement

Plain code cannot launch an agent; the session does, acting as the CTO Chief, from two files:
`agents/coordinator/cto-chief.md` and `src/commands/start.md`. Today the CTO Chief dispatches
the threat modeler once per plan at its threat-model step (`agents/coordinator/cto-chief.md:300-315`)
and one reviewer per review step (`:389-499`); its dispatch flow fans out by pillar, never by
area (`:125-143`). `src/commands/start.md` names no `attack` or `fix-round` route. The dispatch
protocol's request has a list of files to focus on (`docs/DISPATCH_PROTOCOL.md:41-51`) and no
area. So after slices 3 and 6 a plan that names a kind would wait forever for an attack nobody
is told to run, fix rounds would go uncounted, and a review would still be one reviewer over
the whole build. The functional plan gives the figures of the session's trial of 2026-10-09
for that arrangement (from the owner's request; they are not in the repository): one reviewer
on everything found 2 of 5 known problems, three reviewers with one area each found 5 of 5.

## Technical approach

### `agents/coordinator/cto-chief.md`

**A new section, inserted immediately before `## Cross-Reference — Product Loop (out of scope
for CTO Chief)`,** word for word (one order per sentence, N-401 to N-411 in this order):

```markdown
## Plans that decide what is let through

A plan whose frontmatter says `lets_through:` with a kind builds a check, a guard, a reader or a classifier, and three things are done by area for it: the attack before the build, the fix rounds, and every review. Its areas are the names under `areas:`.

**The attack before the build.** While such a plan waits in `plans/implementation/`, dispatch the `red-team-critic` and the `threat-modeler` on every area, each brief carrying the plan and one `area`, all at the same time within the limit of five background agents. Record each run's result yourself with the menu's `attack record`, exactly as the attacker returned it; never record a run that did not return, and never leave out a way through. When a way through is open, tell the human in one sentence which area it is in and what gets through, and that it is closed by changing the plan's rules or by taking the kind out. After any change to the plan, attack every area again.

**Fix rounds.** Before any fix of what a review found in such a plan starts — yours, an agent's, or one the human asks for by hand — run the menu's `fix-round` with the plan and the area, and put its answer in the fix brief. When the menu answers that no third fix round starts, start none. Tell the human in one sentence that the area is stopped and why, and that the plan goes back to planning, where the area is taken out when the rest still delivers what the plan was for and its rules are reworked otherwise.

**Reviews.** At Steps 11, 13 and 16 of such a plan, dispatch one reviewer per area at the same time, each brief carrying one `area` and the files its `### Area:` section names. Leave no area without a reviewer, and give no reviewer the whole build.
```

No other text of the file changes.

### Its compaction inventory

`tests/compaction-eval/cto-chief/rule-inventory.json`, following
`tests/compaction-eval/inventory-checks.js` exactly:

- Orders N-401 to N-411 appended to `orders` — the two sentences of the first paragraph
  (N-401, N-402), the four of the second (N-403 to N-406), the three of the third (N-407 to
  N-409) and the two of the fourth (N-410, N-411) — each
  `{ id, says (at most 160 characters), now_in: "## Plans that decide what is let through", anchors: [<its sentence, word for word>], pinned_by: null, wire: false, fate: "added", added_by: { instruction, date: "2026-10-10", plan: <this slice's file name without .md, as it is named when Step 8 runs> } }`.
- `instruction` in every record is the owner's words of 2026-10-10, verbatim: "fix the rework
  rounds", followed by the rule of the functional plan the sentence carries (rule 2 with his
  recorded "yes", rule 3 or rule 6).
- `maxBytes` rises to the agent's measured size after the edit, recorded as one more
  `ceiling_corrections` entry naming this slice and the measured overage.

`tests/cto-chief-compaction.test.js`: `ORDER_FLOOR` rises by eleven from the value the file
then holds (439 today; another plan waiting to be built raises it by five).

### `src/commands/start.md`

- The Navigation Commands table gains three rows: `attack {ref}` (which runs are missing and
  which ways through are open for a plan that names a kind; reads only),
  `attack record {ref} {attacker} {payload}` (records one returned run; run only by the
  session, never put in an agent's brief), `fix-round {ref} {area}` (counts one fix round
  before it starts; run only by the session).
- The NAV classification list gains `attack` and `fix-round`.
- A new section after the section on the question critique ("Pre-compute"), word for word
  apart from line wrapping:

```markdown
### A plan that decides what is let through — the attack, the fix rounds, the reviews

A plan in `plans/implementation/` whose frontmatter says `lets_through:` with a kind is not built until its rules have been attacked as they stand. `attack {ref}` shows which runs are missing and which ways through are open.

1. **Attack.** For every area and attacker the screen lists as missing, record a background task first (`menu task add security '{ref}' --label 'attack {area} {attacker}'`) and launch only on `run`: `red-team-critic` with `{ ref, area }`, `threat-modeler` with the plan's path and the area. Launch them together, within the five-slot budget. They read only; neither edits the plan.
2. **Record.** When a run returns, record it yourself: `attack record {ref} {attacker} {payload}`, the payload being base64 of `{"area": "<area>", "ways_through": [{"id": "<the finding's id>", "says": "<its one sentence>"}]}`, with an empty list when it found none. Record what the attacker returned, all of it. Show the answer's `text` as the one status line.
3. **Close.** A way through is closed only by changing the plan — its rules, or taking the kind or the area out — and attacking every area again. The menu refuses a clean result for an unchanged plan in which a way through was found.
4. **Fix rounds.** Before any fix of what a review found in such a plan, by anyone: `fix-round {ref} {area}`. Put the answer's `text` in the fix brief. `refused: true` means no fix round starts: show its `text` to the human and start none.
5. **Reviews.** A review of such a plan is one reviewer per area, launched together, each brief naming one area and that area's files; never one reviewer for the whole build.
```

- No other text in the file changes.

### `docs/DISPATCH_PROTOCOL.md`

- Under "### Optional fields", one bullet: `area` — the one area of the plan this dispatch is
  limited to, a name from the plan's `areas:` list; present only for a plan whose front matter
  names a kind in `lets_through`.
- In the request example, one line `area: page reader` after `step: 11`, with a comment that
  it is optional.
- A short section after "## Response schema": "## One area per dispatch" — a plan that
  decides what is let through is attacked before it is built and reviewed after it one area
  per dispatch, both attackers on every area and one reviewer per area per review step, all
  started together within the limit of five background agents; a response for such a dispatch
  names its `area`.

### Wiring — the live surfaces

The CTO Chief's file is read on every dispatch of the CTO Chief and by the session acting as
the coordinator; `src/commands/start.md` is the file `/ctoc:start` loads. The routes they name
are slice 3's `attack` case and slice 6's `fix-round` case in `menu-screens.route`, reached
through `src/commands/start.js`; the `area` they put in a brief is the input slice 5 gave the
two attackers. `docs/DISPATCH_PROTOCOL.md` is the reference both agent files point to.

## Agent rules this slice replaces or adds

The owner's request of 2026-10-10 ("fix the rework rounds") and his recorded yes to rule 2 are
the instruction for every record. These are the compaction-inventory orders this slice may
mark added, and no others:

- `agents/coordinator/cto-chief.md` — added: N-401, N-402, N-403, N-404, N-405, N-406, N-407, N-408, N-409, N-410, N-411.

## Acceptance criteria

- [ ] The CTO Chief holds the section "Plans that decide what is let through" with its four
  paragraphs word for word, immediately before the Product Loop cross-reference.
- [ ] `tests/cto-chief-compaction.test.js` passes all ten checks with N-401 to N-411 added,
  each record naming this slice and the owner's words of 2026-10-10, `ORDER_FLOOR` raised by
  eleven, and `maxBytes` raised by exactly the measured overage in one recorded correction.
- [ ] `start.md` names the three routes, classifies `attack` and `fix-round` as instant, and
  holds the new section; every route written in its new rows, run through `route` in a
  temporary project, answers something other than the unknown-command answer.
- [ ] `docs/DISPATCH_PROTOCOL.md` names the optional `area` field and holds the section "One
  area per dispatch".
- [ ] The functional plan's third scenario, in one live run in a scratch CTOC project: for a
  plan that names two areas the session starts four attack runs together, records four
  results, and the plan moves into the build queue; with one way through returned, the owner
  reads one sentence naming it and the plan stays.
- [ ] The functional plan's ninth scenario, in one live run: for a built plan with five areas
  the session starts five reviewers together, one area each, and no reviewer's brief covers
  the whole build.
- [ ] The functional plan's fourth and fifth scenarios, in one live run: a fix asked for by
  hand is counted before it starts, and after two fix rounds for one area the session starts
  no third and tells the owner in one sentence.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above the floor, 0 skipped;
  the test-file count in `CLAUDE.md` is updated.

## Risks

| Risk | Mitigation |
|---|---|
| This slice moves on to building on its recorded evidence instead of the owner's own yes | Inventory check 3 accepts added orders only under the owner's own approval of this slice as it stands; Step 8 runs check 3 first and stops when it is red |
| The CTO Chief sits at its byte ceiling | The ceiling rises only by the measured overage, in one recorded correction |
| Another waiting plan edits the same CTO Chief file, its inventory, its order floor and `start.md` | Plans that touch the same file build one at a time; Step 9 reads the files as they then are; whichever builds second keeps the other's text, records and floor, and Step 11 checks it |
| A plan with more than two areas needs more than five attack runs at once | The standing limit of five background agents holds; further runs start as slots free (Decision 2) |
| The session records a result other than the attacker returned | The CTO Chief and `start.md` both say to record it exactly and whole; stated as a limit in `docs/ENFORCEMENT.md` by slice 3 |
| The sentence about what happens to a stopped area rests on an open question | Slice 6's Open question 1; when the owner answers otherwise, that one sentence changes in the CTO Chief and in slice 6's route |
| A new line in `start.md` is taken for a command recipe that changes state and has no test fixture | The routes are written bare, as the table's other routes are; Step 9 runs the recipe check after the edit and, when it reports one, adds its fixture and its entry to `.ctoc/recipe-coverage.json` |

## Decisions Taken Under Ambiguity

1. **All three rules' instructions land in one slice**, after the three code slices, because
   they change the same two files and each must describe routes that exist.
2. **"All at the same time" means within the standing limit of five background agents.** The
   functional plan's own scenarios need four attack runs and five reviewers, which fit; a plan
   with more areas starts the rest as slots free.
3. **Each attack run is recorded as a background task of the existing kind `security`** before
   it is launched, so the scheduler's limit of five applies to it and no task kind is added.
4. **The reviewers are the agents the step table already names** for Steps 11, 13 and 16; no
   reviewer file changes. Read: `agents/iron-loop/iron-loop-critic.md:28-35` takes a plan as
   its material and has no rule against a brief limited to named files. Believed, not yet
   read in full: `agents/security/security-scanner.md` has none either; Step 9 reads it, and
   when it does refuse a narrowed brief the build stops and reports.
5. **No sentence of the CTO Chief's step list is replaced.** The new section says what is done
   differently for these plans; the step list stays the rule for every other plan.
6. **This slice is built only on the owner's own yes to it as it stands**, for the reason in
   the first risk.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [ ] Write the inventory records (N-401 to N-411) and raise `ORDER_FLOOR` by eleven; run
  `node --test tests/cto-chief-compaction.test.js`: checks 4, 8 and 10 red for the new anchors,
  check 3 green. A red check 3 means this slice does not carry the owner's own approval as it
  stands: stop and report.
- [ ] Write `tests/such-plans-are-run-by-area.test.js`, each case red today:
  1. The CTO Chief holds the section heading and each sentence of its four paragraphs word for
     word, and the heading stands before the Product Loop cross-reference.
  2. `start.md`'s Navigation Commands table holds the three rows; the NAV classification list
     names `attack` and `fix-round`; the new section holds its heading and each of its five
     numbered items.
  3. Every route in those three rows, with placeholders filled for a temporary project (a plan
     in `plans/implementation/` that names a kind and two areas; the same plan copied to
     `plans/in-progress/` for `fix-round`; a base64 payload with an empty list), run through
     `route`, answers without the unknown-command text.
  4. The payload shape written in `start.md`, encoded as written, is accepted by
     `route(['attack', 'record', …])` and leaves a record.
  5. `docs/DISPATCH_PROTOCOL.md` holds the `area` bullet, the example line and the section
     heading "## One area per dispatch".
  6. Every key and heading the three texts name (`lets_through`, `areas`, `### Area:`) is one
     `readLetThrough` reads.
- [ ] Run the new test file: every case red.

### Step 9: PREPARE
- [ ] Measure the CTO Chief in bytes and read its `maxBytes`, its order count and the current
  `ORDER_FLOOR`; read the then-current CTO Chief, its inventory, `start.md` and
  `docs/DISPATCH_PROTOCOL.md` (other waiting plans may have changed them).
- [ ] Read `agents/security/security-scanner.md` in full for any rule against a brief limited
  to named files, and quote the result in the build record (Decision 4).
- [ ] Read what `tests/menu-protocol.test.js`, `tests/shipped-recipes-execute.test.js`,
  `tests/architecture-invariants.test.js`, `tests/cto-chief-compliance-dispatch.test.js` and
  `tests/audit-chain-concurrency.test.js` pin in `start.md` and `docs/DISPATCH_PROTOCOL.md`.
- [ ] Confirm slices 3, 5 and 6 are in the tree: the two routes answer, and both attackers'
  files hold their `area` input.

### Step 10: IMPLEMENT
- [ ] `agents/coordinator/cto-chief.md`: the new section.
- [ ] `tests/compaction-eval/cto-chief/rule-inventory.json`: the measured `maxBytes` and its
  correction (the records were written at Step 8).
- [ ] `src/commands/start.md`: the three rows, the classification, the section.
- [ ] `docs/DISPATCH_PROTOCOL.md`: the bullet, the example line, the section.
- [ ] `CLAUDE.md`: the test-file count.

### Step 11: REVIEW
- [ ] The critic reads the three texts as a fresh session would and follows them for: a plan
  with two areas and no record, a returned run with a way through, a changed plan, a fix asked
  for by hand, a third fix round, a review of a five-area plan, and a plan that names no kind;
  any step it cannot carry out from the text alone is a finding, and so is any sentence on
  which the CTO Chief, `start.md`, the dispatch protocol and slices 3, 5 and 6 disagree.

### Step 12: OPTIMIZE
- [ ] Each surface says each thing once; the CTO Chief gives the rule, `start.md` the commands,
  the dispatch protocol the field.

### Step 13: SECURE
- [ ] The security scanner confirms that no instruction lets a background agent record an
  attack or count a fix round, tells the session to record anything but what an attacker
  returned, treats an attacker's output as an order, or offers a way to move such a plan on
  other than a clean record or the owner's own recorded override.

### Step 14: VERIFY
- [ ] `npm test`: lint, typecheck, all tests, coverage at or above the floor in
  `.ctoc/coverage-baseline.json`, 0 skipped, 0 flaky. Named among them:
  `tests/cto-chief-compaction.test.js`, `tests/cto-chief-toplevel.test.js`,
  `tests/compaction-eval.test.js`, `tests/menu-protocol.test.js`,
  `tests/shipped-recipes-execute.test.js`, `tests/architecture-invariants.test.js`,
  `tests/cto-chief-compliance-dispatch.test.js`, `tests/compliance-claims-match-code.test.js`,
  `tests/tier1-no-peer-dispatch.test.js`, `tests/agent-dispatch-resolution.test.js`,
  `tests/agent-tool-grants.test.js`, `tests/agent-honest-status-fence.test.js`,
  `tests/unexecutable-instruction-fence.test.js`, `tests/gate-numbers-fence.test.js`,
  `tests/instruction-surfaces-say-the-moment.test.js`,
  `tests/agent-and-skill-improvement-record.test.js`, `tests/doc-counts.test.js`,
  `tests/claude-md-keeps-every-rule.test.js`.
- [ ] The three live runs of the acceptance criteria in a scratch CTOC project; the session's
  commands, the route answers and the sentences the owner would read are quoted in the build
  record.

### Step 15: DOCUMENT
- [ ] The three changed surfaces are the documentation; the build record lists each sentence
  added and the measured byte counts.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box above is checked against its evidence; the three live runs are quoted.
