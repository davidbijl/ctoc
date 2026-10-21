---
title: "A plan that decides what is let through says so in four lines, and is not built when one of them is missing"
type: implementation
created: 2026-10-10
priority: high
effort: medium
parent_plan: fewer-rework-rounds-a-check-is-attacked-before-it-is-built
depends_on: none
files:
  - src/lib/let-through.js
  - src/lib/plan-validator.js
  - tests/let-through.test.js
  - tests/plan-validator.test.js
  # Ratchet, not counted toward the slice size: this slice creates a library module and a
  # test file, which moves two counts in CLAUDE.md.
  - "CLAUDE.md"
---

# A plan that decides what is let through says so in four lines, and is not built when one of them is missing

Slice 1 of 8 of `plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built.md`
(the owner's request of 2026-10-10, "fix the rework rounds"). It carries the code half of
rules 1 and 4: what such a plan must state, and one kind per plan. The planner's and the
plan-review critic's half is slice 2; the attack before the build is slice 3.

## Problem statement

Today nothing marks a plan as one that builds a check, a guard, a reader or a classifier. A
plan's front matter is read by `parseMetadata` (`src/lib/state.js:233`) and no key says what the
plan lets through, why that is safe, or what its answers are compared against. The one place
both ways into the build queue pass through, `validateForQueue`
(`src/lib/plan-validator.js:1244`), checks a title and the declared files and nothing else. So
a plan whose rules are a list of dangers, with no real implementation to compare against, moves
on to building exactly like any other plan. That is how the hotfix check started.

## Technical approach

### The four lines (written by the planner, read by this slice)

In the plan's front matter, each on one line of its own, in this exact shape:

```yaml
lets_through: web pages
safe_because: a real HTML parser shows one plain text node changed and nothing else
compared_against: the parse5 HTML parser
areas:
  - page reader
  - accepted paths
```

and, in the body, one section per area headed exactly `### Area: <name>` that holds that area's
rules.

A plan whose front matter never holds the text `lets_through`, or says `lets_through: none`,
decides nothing about what is let through: nothing else is read and nothing changes for it.

### File: `src/lib/let-through.js`
**Action:** CREATE
**Purpose:** Read the four lines of a plan exactly, and say in one sentence each what is missing.

#### Exports
- `readLetThrough(content: string)` → `{ kind: string|null, safeBecause: string, comparedAgainst: string, areas: string[], faults: Array<{ id: string, sentence: string }> }`
  - Never throws. A `content` that is not a string reads as `kind: null`, no faults.
  - The front matter is every leading `---` block, taken with
    `stale-detector.extractFrontmatterRegion` (the region `parseMetadata` reads), so a plan
    that carries an approval block in front of its own reads the same. Each line has a
    trailing carriage return removed first.
  - **Nothing to check.** The region does not hold the text `lets_through` (letter case
    ignored), or its one `lets_through:` line reads `none` (letter case ignored) →
    `kind: null`, no faults, no other line read.
  - **One exact shape, or a fault.** When the region holds the text `lets_through`, exactly one
    line must be `lets_through: <value>` — the key at the start of the line, one colon, one
    space — and the value must start with a letter or digit and hold only letters, digits,
    spaces and `( ) . / _ -`, at most 80 characters, and must not be one of `true`, `false`,
    `null`, `yes`, `no`, `on`, `off` or all digits (a YAML reader gives those another type).
    `safe_because:` and `compared_against:` follow the same shape with `, ; '` also allowed and
    at most 300 characters. `areas:` is a line reading exactly `areas:` followed by one or more
    lines `  - <name>` (two spaces, a hyphen, one space), each name 1 to 60 characters, starting
    with a letter or digit and holding only letters, digits, spaces, hyphens and underscores.
  - **Faults**, each with its fixed sentence (`<kind>` and names cleaned of control characters
    and cut at 80 characters):

    | id | When | Sentence |
    |---|---|---|
    | `cannot-read-kind` | the text `lets_through` is there but no line has the exact shape, or two lines do | `CTOC cannot read this plan's lets_through line exactly; write it once, as lets_through: <one kind in plain words>, with no quotes, colon or #.` |
    | `more-than-one-kind` | the value holds `,` or `;`, or the line is `lets_through:` followed by list items | `This plan lets through more than one kind of thing; a plan lets through one kind, and each further kind is its own plan.` |
    | `no-reason` | no `safe_because:` line | `<kind> is not let through in this plan: it does not say why letting it through is safe; state the reason in safe_because, or take the kind out.` |
    | `no-comparison` | no `compared_against:` line, or it reads `none` | `<kind> is not let through in this plan: it names no real implementation its answers are compared against; name it in compared_against, or take the kind out.` |
    | `cannot-read-reason` | the `safe_because` line is there in another shape | `CTOC cannot read this plan's safe_because line exactly; write it as one line of plain words, with no quotes, colon or #.` |
    | `cannot-read-comparison` | the `compared_against` line is there in another shape | `CTOC cannot read this plan's compared_against line exactly; write it as one line of plain words, with no quotes, colon or #.` |
    | `no-areas` | no `areas:` list in the exact shape, or an empty one | `This plan lets through <kind> but names no areas; list the parts of its rules under areas, one name per line.` |
    | `bad-area-name` | a name outside the shape, or used twice (letter case ignored) | `The area name <name> cannot be used: an area name is 1 to 60 letters, digits, spaces, hyphens or underscores, and is used once.` |
    | `area-without-rules` | no line reads exactly `### Area: <name>` outside a fenced code block | `The area <name> has no section headed "### Area: <name>" holding its rules.` |

    With `cannot-read-kind` or `more-than-one-kind` the other lines are not judged (`kind` is
    the cleaned text for the sentence, or `null` when unreadable) and that fault is the only one.

#### Dependencies
- `require('./stale-detector')` for `extractFrontmatterRegion`. Nothing else: no file is read,
  no path is built.

#### Called by
- `src/lib/plan-validator.js:validateForQueue()`.

### File: `src/lib/plan-validator.js`
**Action:** MODIFY
**Changes:** in `validateForQueue`, after the count-mover block and before
`mergeParentPlanWarnings`: `const read = readLetThrough(content)`; every `read.faults[].sentence`
is pushed to `result.errors` and `result.valid` becomes `false`;
`result.checklist.letThrough = { kind: read.kind, areas: read.areas, faults: <the ids>, sentences: <the sentences> }`.
A plan with `kind: null` gets `checklist.letThrough = { kind: null, areas: [], faults: [], sentences: [] }`
and its `valid`, `errors` and `warnings` are what they are today.

### What this slice lets through, and why that is safe

This slice is itself a check, so the owner's rule 1 is stated for it. **Kind:** a plan on its
way into the build queue. **Why passing is safe:** a plan passes this check only when its front
matter never names `lets_through` (it then claims to decide nothing, and only the plan review
can say otherwise — see the first risk), or when each of its four lines is in the one shape
this reader accepts and a real YAML reader gives the same four values. **Compared against:**
`js-yaml`, the YAML reader already used by `src/lib/circuit-breaker.js:62` and
`tests/watcher-shape.test.js`. **Areas:** the front matter reader; the area sections.

By rule 2 (the owner's yes of 2026-10-10) this slice's rules are attacked by the red-team
critic and the threat modeler before it is built, one run per area. The menu route that
records an attack does not exist until slice 3 is built, so for this slice the session
dispatches the two attackers by hand, and every way through they find is closed by a change to
this slice before it is approved for building.

### Wiring — the live call sites

`readLetThrough` is called by `validateForQueue`, which `validateTransition`
(`src/lib/plan-validator.js:1188`) runs for both ways a plan enters the build queue:
`streaming-gate.pendingGateDecisions` (`src/lib/streaming-gate.js:1039`, the menu's default
screen and its continuation) and `actions.approvePlan` (`src/lib/actions.js:446`, the owner's
approve). A build is claimed only from the build queue (`actions.startAgent`,
`src/lib/actions.js:1822`), so a plan refused here is not built. No hook is added or changed.

### Dependency graph

```
src/lib/let-through.js (new) --requires--> src/lib/stale-detector.js
src/lib/plan-validator.js --requires--> src/lib/let-through.js
tests/let-through.test.js --drives--> let-through.js, actions.approvePlan
tests/plan-validator.test.js --drives--> validateForQueue, validateTransition
```

### Security review

- Path traversal: the module builds no path and reads no file.
- Input validation: plan text is untrusted; every value is matched against a fixed character
  set and a length cap before it reaches a sentence, and control characters never reach a screen.
- No dynamic regular expression is built from plan text; area headings are compared as whole
  lines by string equality.
- Prototype pollution: values are held in an array and plain strings, never as object keys.
- No secrets, no shell, no network.

## Acceptance criteria

- [ ] A plan with no `lets_through` text, and one saying `lets_through: none`, pass
  `validateForQueue` with exactly the result they have today.
- [ ] The functional plan's second scenario: a plan with `lets_through: stylesheet colours`, a
  `safe_because` line and no `compared_against` line is refused by `validateForQueue` and by
  `actions.approvePlan` with exactly the `no-comparison` sentence; the plan file stays byte for
  byte where it was; with the line added, and its areas and sections present, it passes.
- [ ] The functional plan's sixth scenario, code half: `lets_through: web pages, stylesheet colours`
  and the list form are refused with exactly the `more-than-one-kind` sentence.
- [ ] Every fault in the table gives exactly its sentence, on one line, with no control character.
- [ ] For every generated front matter in the comparison table, when `readLetThrough` reports no
  fault its four values equal what `js-yaml` loads from the same front matter.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above the floor, 0 skipped;
  the two counts in `CLAUDE.md` are updated.

## Risks

| Risk | Mitigation |
|---|---|
| A plan that builds a check leaves the key out and is not held | Named plainly: this check cannot see what a plan builds, only what it says. Slice 2 makes the planner write the key and the plan-review critic fail a plan that builds a check without it |
| The reader and a human disagree about a line (a quoted value, a comment, an inline list) | One exact shape per line, anything else is a fault with a sentence saying how to write it; the comparison with `js-yaml` is the first test |
| An existing plan is suddenly refused | Only a plan whose front matter holds the text `lets_through` is read; Step 9 confirms no plan file holds it today |
| A reason that is really a list of dangers passes | This check reads presence, not meaning; slice 2 (the plan review) and slice 5 (the attackers report it as a way through) judge it |

## Decisions Taken Under Ambiguity

1. **A key in the front matter, not words in the body**, marks such a plan: the planner writes
   it, the critic checks it, and code reads it exactly. Guessing from words such as "check" or
   "guard" in the text would hold plans that only mention one.
2. **A plan without the key is not held.** The functional plan says plans that decide nothing
   about what is let through are unchanged, and no plan carries the key today.
3. **The reason and the comparison are one line each in the front matter**, so their presence
   is checked exactly and they are inside the text the approval is bound to; the body may say more.
4. **Areas are named in the front matter and each has a `### Area: <name>` section**, so the
   attack and the review can be given one area, and a name without rules is caught here.
5. **This slice reads the lines itself instead of through `parseMetadata`**, because that
   reader strips quotes, turns `true` and digits into other types and accepts indented keys
   (`src/lib/state.js:159-211`); a line it would read one way and YAML another is a fault here.
6. **A comma or a semicolon in the kind means two kinds.** A second kind joined by the word
   "and" is not caught by code; the plan review catches it.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [ ] Write `tests/let-through.test.js`. The first test written is the comparison: a fixed table
  of front matter blocks — the four keys in every order; values plain, with trailing spaces,
  single-quoted, double-quoted, holding `: `, holding ` #`, `true`, `42`, `null`, `~`, empty,
  an inline list, a block list, a block list with a quoted item, a blank line inside the list;
  Windows line endings; an approval block in front of the plan's own — each given to
  `readLetThrough` and to `require('js-yaml').load`. Assert: with no fault, the four values are
  equal; no case throws. Run it and see it fail before `src/lib/let-through.js` exists.
- [ ] Add: no key and `none` in three letter cases read `kind: null`; a full valid plan reads
  its values and areas in order; one case per fault row with the exact sentence; a heading only
  inside a fenced block is `area-without-rules`; two names differing only in letter case are
  `bad-area-name`; a kind of 200 characters with a control character gives a cleaned, cut
  sentence; one captured plan front matter from `tests/fixtures/golden-corpus/plan-frontmatter`
  reads without a fault it does not have.
- [ ] Add the end-to-end case: in a temporary project, `actions.approvePlan` on a plan in
  `plans/implementation/` with `lets_through: stylesheet colours` and no `compared_against`
  returns `refused: true` with the sentence and leaves the file byte-identical; with the line,
  the areas and their sections added it crosses.
- [ ] Add to `tests/plan-validator.test.js`: `validateForQueue` and
  `validateTransition(…, 'implementation', 'todo')` for a plan without the key (guard, equal to
  today's result apart from the new empty checklist entry), for the second scenario and for the
  sixth; `checklist.letThrough` holds the kind, the areas, the fault ids and the sentences.
- [ ] Run both files: every case red except the guard.

### Step 9: PREPARE
- [ ] Confirm that no file under `plans/` holds the text `lets_through` in its front matter,
  and quote the search in the build record.
- [ ] Read `src/lib/golden-corpus-scan.js` and `tests/fixtures/golden-corpus/manifest.yaml`;
  confirm how a module that calls `extractFrontmatterRegion` is linked to the
  `plan-frontmatter` samples, and that the test's sample path satisfies it.
- [ ] Confirm `require('js-yaml')` resolves in the test run, and that
  `src/lib/stale-detector.js` does not require `src/lib/plan-validator.js` (no cycle).

### Step 10: IMPLEMENT
- [ ] `src/lib/let-through.js`: `readLetThrough` as specified, with the fault table as one
  frozen list.
- [ ] `src/lib/plan-validator.js`: the call in `validateForQueue` and the checklist entry.
- [ ] `CLAUDE.md`: the library-module count and the test-file count.

### Step 11: REVIEW
- [ ] One reviewer per area (the front matter reader; the area sections), at the same time:
  each tries ten front matter shapes of its own against the reader and `js-yaml`; a value the
  two read differently with no fault reported is a finding.

### Step 12: OPTIMIZE
- [ ] Confirm by reading that a plan without the text `lets_through` costs one region
  extraction and one search, and nothing more.

### Step 13: SECURE
- [ ] The security scanner attacks the reader: a key hidden by an escape in a quoted key, a
  value of 100,000 characters, a front matter of 10,000 lines, a name holding a line break or
  an ANSI sequence, `__proto__` as an area name; each must end as a fault or a clean read with
  no crash and no control character in a sentence.

### Step 14: VERIFY
- [ ] `npm test`: lint, typecheck, all tests, coverage at or above the floor in
  `.ctoc/coverage-baseline.json`, 0 skipped, 0 flaky. Named among them:
  `tests/plan-validator.test.js`, `tests/plan-validator-coverage.test.js`,
  `tests/golden-corpus-fence.test.js`, `tests/false-green-fence.test.js`,
  `tests/reachability.test.js`, `tests/export-reachability.test.js`, `tests/doc-counts.test.js`,
  `tests/claude-md-keeps-every-rule.test.js`, `tests/plans-keep-moving-without-the-human.test.js`.

### Step 15: DOCUMENT
- [ ] JSDoc on `readLetThrough` and on the fault list; the comment above the new block in
  `validateForQueue` says what it cannot see (a plan that leaves the key out).

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box above is checked against its evidence; the comparison test's first
  failing run is quoted in the build record.
