---
title: "The menu records each attack on a plan's rules, and a plan not yet attacked, or with a way through open, is not built"
type: implementation
created: 2026-10-10
priority: high
effort: medium
parent_plan: fewer-rework-rounds-a-check-is-attacked-before-it-is-built
depends_on: fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s1-what-such-a-plan-states
files:
  - src/lib/let-through.js
  - src/lib/menu-screens.js
  - src/lib/plan-validator.js
  - docs/ENFORCEMENT.md
  - tests/let-through.test.js
  - tests/plan-validator.test.js
  - tests/protect-records.test.js
---

# The menu records each attack on a plan's rules, and a plan not yet attacked, or with a way through open, is not built

Slice 3 of 8 of `plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built.md`.
It carries the code of rule 2, the one rule that adds a condition a plan must meet before it
may be built. The owner said yes to that condition on 2026-10-10 (recorded in the functional
plan). No hook is added or changed.

## Problem statement

After slice 1 a plan that names a kind states its reason, its comparison and its areas, but
nothing asks whether anyone tried to get past its rules before code is written. The plan
review leaves its evidence in two places today: the plan's question file, with the gate
critic's classification and an optional record of which critique lenses ran, in the protected
question store (`writePlanQuestions`, `src/lib/streaming-precompute.js:634`; the lens names are
a closed list of four at `:472-476`), and one evidence sentence in the approval record when the
plan moves on (`composeSufficiencyEvidence`, `src/lib/streaming-gate.js:814`, whose slot reads
"attested by: not recorded" at `:841`). Neither knows an area or the threat modeler, and a
question in that store is closed by an answer, while a way through is closed only by changing
the plan and attacking it again.

## Technical approach

### The record

One file per plan, written only by the menu:
`.ctoc/streaming/attack/<plan file name without .md>.json`, in the same protected store as the
plan-review questions. The one loaded hook already refuses every tool write and shell write
under `.ctoc/streaming/` outside the waiting folder (`src/hooks/protect-records.js:159`), so
no agent can write it and the hook is not touched.

```json
{
  "plan": "<plan file name without .md>",
  "spec": "<the plan's specification digest when the runs were recorded>",
  "kind": "<its lets_through>",
  "runs": {
    "<area>": {
      "red-team-critic": { "at": "<time>", "ways_through": [ { "id": "way-through-…", "says": "<one sentence>" } ] },
      "threat-modeler":  { "at": "<time>", "ways_through": [] }
    }
  }
}
```

`spec` is `approval-ledger.computeSpecHash(content).hash` — the same digest the approval record
binds (`src/lib/approval-ledger.js:410`). A record whose `spec` is not the plan's digest now was
made for another text of the plan and counts for nothing: every area is attacked again.

### File: `src/lib/let-through.js`
**Action:** MODIFY (created by slice 1)

#### New exports
- `recordAttackRun(root: string, ref: string, attacker: string, payload: object)` →
  `{ ok: true, status } | { ok: false, reason: string, sentence: string }`. Never throws.
  - `ref` must be `implementation/<file>.md` with the file name shape the menu already accepts
    (`^[A-Za-z0-9_][A-Za-z0-9._-]*\.md$`, no `..`); anything else → `reason: 'not-a-plan-waiting-to-be-built'`.
  - The plan must read, through `readLetThrough`, with a kind and no fault → else
    `reason: 'plan-states-too-little'` with the first fault's sentence.
  - `attacker` is exactly `red-team-critic` or `threat-modeler` → else `reason: 'unknown-attacker'`.
  - `payload` is `{ area, ways_through }`: `area` equals one of the plan's areas letter for
    letter → else `reason: 'unknown-area'`; `ways_through` is a list of at most 50 items, each
    `{ id, says }` with `id` matching `^[a-z0-9][a-z0-9-]{0,79}$` and `says` a non-empty string,
    stored on one line, control characters removed, cut at 300 characters. A payload in any
    other shape → `reason: 'result-unreadable'`, nothing written: a result CTOC cannot read is
    never stored as "no way through".
  - The plan's digest cannot be established (`computeSpecHash` gives `ok: false`) →
    `reason: 'plan-unreadable'`.
  - A stored record with another `spec`, or one that does not parse, is replaced by a fresh one
    holding only this run.
  - **Within one text of the plan, what an attacker found is never removed.** When the stored
    result of this area and attacker for this `spec` holds ways through, the new list is merged
    into it by `id`; a new empty list is refused with `reason: 'plan-unchanged'` and the
    sentence `The way through <says> was found in this text of the plan; change the plan's rules, or take the kind out, and attack it again.`
  - Written through `./safe-fs`: the folder is created when missing, a temporary file beside
    the target, then a rename, as `writeKickbackState` does (`src/lib/circuit-breaker.js:270`);
    a write failure → `reason: 'record-not-written'`, and no success is reported.
- `attackStatus(root: string, planPath: string)` →
  `{ applies: boolean, kind, clear: boolean, missing: Array<{area, attacker}>, open: Array<{area, attacker, id, says}>, unreadable: boolean, sentences: string[] }`.
  Never throws; reads only.
  - `applies: false` (with `clear: true`, empty lists) when the plan names no kind, or has a
    fault of slice 1 (slice 1's sentences already hold it).
  - No record, or a record for another `spec` → every area and attacker is `missing`.
  - A record that does not parse, or whose `runs` is not the shape above → `unreadable: true`,
    never `clear`.
  - `clear` only when nothing is missing, nothing is open and the record is readable.
  - `sentences`, in this order:
    - unreadable: `The record of the attack on this plan could not be read, so it is not built; attack it again.`
    - missing: `Its rules for <kind> have not been attacked yet as they stand: <n> of <m> runs are missing (<area> by the red-team critic, <area> by the threat modeler, … at most three named, then "and <k> more"); it is not built until the red-team critic and the threat modeler have attacked every area.`
    - open, one per way through, at most five, then `and <k> more ways through are open`:
      `A way through is open in <area>, found by the <red-team critic|threat modeler>: <says> Change the plan's rules so it is closed, or take <kind> out of this plan; it is then attacked again.`

#### Dependencies
`require('path')`, `./safe-fs`, `./approval-ledger` (for `computeSpecHash`; that module requires
only `gate-order.js`, so no cycle), `./state` (for `getPlansDir`).

### File: `src/lib/plan-validator.js`
**Action:** MODIFY
**Changes:** in `validateForQueue`, after slice 1's block: when `read.kind` is set and
`read.faults` is empty, `const attack = attackStatus(projectPath, planPath)`; when
`attack.clear` is not `true`, each of `attack.sentences` is pushed to `result.errors` and
`result.valid` becomes `false`. `result.checklist.attack = attack`. For every other plan
`result.checklist.attack = { applies: false }` and nothing else changes.

### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Changes:** in `route`, a new `case 'attack':`
- `attack record <ref> <attacker> <payload>` — `payload` is decoded with the file's own
  `decodeB64`; a value that does not decode is `result-unreadable`. Calls `recordAttackRun` and
  answers `{ ok, recorded: true|false, reason?, status, text }`. `text` is one line: on success
  `Recorded: the <red-team critic|threat modeler> attacked <area> of <the plan's name> and found <no way through | n ways through>.`
  followed by the status's first sentence, or by
  `Every area has been attacked and no way through is open.`; on a refusal, the refusal's sentence.
- `attack <ref>` — reads only: `{ ok: true, status, text }`, `text` being the plan's name, one
  line per area and attacker (`attacked, no way through` / `attacked, <n> ways through` /
  `not attacked yet`) and the status sentences.
- Anything else under `attack` → `{ ok: false, text: 'Unknown attack command.' }`.
Every piece of plan or payload text that reaches `text` goes through `stripCtl`.

### `docs/ENFORCEMENT.md`

A new section before "The one loaded hook — write protection for the records":
"## A plan that decides what is let through is attacked before it is built" — the owner's yes
of 2026-10-10; which plans (a kind in `lets_through`); what holds them (`validateForQueue`, on
the owner's approve and on the move on recorded evidence alike; his recorded override still
passes, as for every failed check); where the record lives and that it is bound to the plan's
text; that only the menu's `attack record` writes it and a background agent's call of that
route is refused by the existing rule for routes off the allowed list; and what it cannot see:
a plan that leaves the key out, a result the session records other than the attacker returned
it, and a plan already in the build queue when this arrives. In "What it protects", the
sentence about `.ctoc/streaming/` names the attack records among what lies under it.

### What this slice lets through, and why that is safe

**Kind:** a plan on its way into the build queue, on its attack record. **Why passing is
safe:** a plan passes only when a record that only the menu can write holds, for the plan's
text as it stands, one result per area from each of the two attackers, every one of them with
no way through. **Compared against:** this slice writes no reader of its own — the plan is
read by slice 1's reader, the payload by `JSON.parse` behind the menu's existing decoder, the
plan's text is identified by `computeSpecHash`, the digest the approval itself uses; what is
added is a count over a finite list. The first test compares `attackStatus` with that count
done by hand in the test for every subset of two areas and two attackers. **Areas:** the
record writer; the hold.

By rule 2 this slice's rules are attacked before it is built, one run per area; until the
route below exists the session dispatches the two attackers by hand, and every way through
they find is closed by a change to this slice before it is approved for building.

### Wiring — the live call sites

`recordAttackRun` and `attackStatus` are reached from `menu-screens.route`, which
`src/commands/start.js` runs for every menu call. `attackStatus` is also called by
`validateForQueue`, run by `streaming-gate.pendingGateDecisions`
(`src/lib/streaming-gate.js:1039`) and `actions.approvePlan` (`src/lib/actions.js:446`), the
two ways into the build queue; builds are claimed only from that queue
(`actions.startAgent`, `src/lib/actions.js:1822`, called by `continueAfterCrossing`,
`src/lib/menu-screens.js:2632`).

### Security review

- Path traversal: the record's path is built with `path.join` from a file name that passed the
  shape test; `..`, a separator or an absolute path never reach it.
- Untrusted input: the payload is transcribed agent output. Shape-checked, capped, single-line;
  an unreadable one is refused, never read as clean.
- Forgery: the record lies under `.ctoc/streaming/`, where the loaded hook refuses agent writes;
  the guard cases prove it for this folder.
- Prototype pollution: areas and attackers are compared with fixed lists before they are used
  as keys; the record is built from named fields only.
- No shell, no network, no secret.

## Acceptance criteria

- [ ] The functional plan's third scenario: a plan in `plans/implementation/` that passes
  slice 1 and names two areas is refused by `actions.approvePlan` with the missing sentence
  until four runs are recorded; with all four recorded and no way through it crosses.
- [ ] With one way through recorded, the plan is refused with exactly the open sentence naming
  the area, the attacker and what gets through; the plan file is byte-identical.
- [ ] Recording an empty list for the same area and attacker while the plan is unchanged is
  refused with the `plan-unchanged` sentence; after the plan's rules change, every run is
  missing again, and four clean runs let it cross.
- [ ] A payload that is not the stated shape, an unknown area, an unknown attacker, a plan
  outside `plans/implementation/`, a plan without a kind and an unsafe reference are each
  refused with a sentence and write nothing.
- [ ] A corrupt record holds the plan with the unreadable sentence.
- [ ] A plan that names no kind passes `validateForQueue` exactly as before, and no folder is
  created for it.
- [ ] A Write, an Edit and a shell redirect into `.ctoc/streaming/attack/` are refused by the
  loaded hook as it is today.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above the floor, 0 skipped;
  `docs/ENFORCEMENT.md` states the condition, the record and its limits.

## Risks

| Risk | Mitigation |
|---|---|
| The session records a result other than the attacker returned | Stated in `docs/ENFORCEMENT.md` as a limit; the attackers hold no tool that can write the record, and slice 8 tells the session to record each result exactly |
| A plan is held for a way through the owner would accept | The sentence names the way through and both ways out; his recorded override of a failed check is unchanged |
| Every change to the plan needs every area attacked again | Stated as a cost in Decision 2: two runs per area per changed text, run at the same time |
| A reader of `.ctoc/streaming/` trips over the new folder | Step 9 lists every reader of that folder and confirms each names its own sub-path |
| A plan already in the build queue was never attacked | Not held by this slice (Decision 4) |

## Decisions Taken Under Ambiguity

1. **The record is its own file in the protected question store, not a block in the question
   file.** The question store closes a question by an answer and knows four lens names and no
   area; a way through closes only when the plan changes and the attack is run again.
2. **A record counts only for the plan's text as it stands, so any change to the plan means
   every area is attacked again**, not only the area that had the way through: a rule changed
   for one area can open a way through in another. This is more than the functional plan's
   "one more run per finding"; the runs start together, so the wait is one run long.
3. **The hold sits where a plan enters the build queue, not where a build is claimed.** The
   plan's rules can still be changed there; once approved, its text is bound to the approval.
4. **Plans already in the build queue or being built when this slice lands are not held.** The
   functional plan leaves the hotfix check and its slices out of scope.
5. **The approval record's evidence sentence is not changed.** Its format is fixed and read
   by position; the attack record carries the same digest, so the two can be matched.
6. **Background agents cannot run the `attack` routes**, because the loaded hook refuses every
   menu route that is not on its allowed list; the session reads and records.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [ ] Add to `tests/let-through.test.js`, first, the comparison: for a temporary plan with two
  areas, every subset of the four runs is recorded through `route(['attack', 'record', …])`
  with clean and with non-empty lists, and `attackStatus(...).clear`, `missing` and `open` are
  compared with the same sets counted in the test. Run it and see it fail.
- [ ] Add: the record file's path, its `spec` equal to `computeSpecHash` of the plan, and no
  temporary file left beside it; the `plan-unchanged` refusal and the merge by `id`; a changed
  plan makes every run missing; each refusal reason with its sentence and no file written
  (payload not a list, an `id` with a capital, an empty `says`, 51 items, a value that is not
  base64, unknown area, unknown attacker, a plan in `plans/todo/`, a plan without a kind,
  `implementation/../x.md`); a corrupt record and a record whose `runs` is a string read as
  unreadable; `attack <ref>` lists each area and attacker in plain words; a `says` holding a
  line break and an ANSI sequence is stored and shown on one clean line.
- [ ] Add the end-to-end cases through `actions.approvePlan` in a temporary project: refused
  before the four runs, refused with a way through, crossed when clear.
- [ ] Add to `tests/plan-validator.test.js`: `validateForQueue` for a plan with no kind (guard:
  no error, no `.ctoc/streaming/attack` folder), for missing runs, for an open way through, for
  a clear record; `checklist.attack` holds the status.
- [ ] Add to `tests/protect-records.test.js`, with the file's own `run` and `payload` helpers,
  three guard cases, green today: a Write and an Edit to
  `.ctoc/streaming/attack/x.json` and `echo '{}' > .ctoc/streaming/attack/x.json` are refused
  with the existing records sentence; a background agent's
  `node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" attack record implementation/x.md red-team-critic e30=`
  is refused with the existing sentence for menu routes off the allowed list. Each guard is
  proven able to fail by one change to the hook's pattern in a scratch copy, run once and discarded.
- [ ] Run the three files: every case red except the guards.

### Step 9: PREPARE
- [ ] List every reader of `.ctoc/streaming/` in `src/` (search quoted in the build record) and
  confirm each names its own sub-path, so a folder `attack` beside `questions` is never listed
  as something else.
- [ ] Read `tests/golden-corpus-fence.test.js` and `src/lib/golden-corpus-scan.js`: confirm the
  new path `.ctoc/streaming/attack` is not taken for the `streaming-questions` contract; if the
  scan reports the module, add the sample it asks for under the fixture folder it names and
  say so in the build record.
- [ ] Confirm `decodeB64` in `src/lib/menu-screens.js` returns a plain object or `null`, and
  that `src/lib/approval-ledger.js` requires nothing that requires `src/lib/let-through.js`.

### Step 10: IMPLEMENT
- [ ] `src/lib/let-through.js`: `recordAttackRun`, `attackStatus`, the sentences.
- [ ] `src/lib/plan-validator.js`: the hold in `validateForQueue`.
- [ ] `src/lib/menu-screens.js`: the `attack` case.
- [ ] `docs/ENFORCEMENT.md`: the new section and the one sentence in "What it protects".

### Step 11: REVIEW
- [ ] One reviewer per area (the record writer; the hold), at the same time. The first tries
  ten payloads and references of its own that should be refused; one that is stored is a
  finding. The second tries five ways to reach `clear` without four clean runs for the plan's
  current text; one that works is a finding.

### Step 12: OPTIMIZE
- [ ] Confirm by reading that a plan without a kind costs no file read beyond slice 1's, and
  that `attackStatus` reads the plan and the record once each.

### Step 13: SECURE
- [ ] The security scanner attacks the route: a reference that leaves `plans/implementation/`,
  a record path through a symbolic link, a payload of several megabytes, `__proto__` and
  `constructor` as area or id, two records written at once, a record file replaced by a
  folder; none may end in a `clear` status, a crash or a file outside
  `.ctoc/streaming/attack/`.

### Step 14: VERIFY
- [ ] `npm test`: lint, typecheck, all tests, coverage at or above the floor in
  `.ctoc/coverage-baseline.json`, 0 skipped, 0 flaky. Named among them:
  `tests/protect-records.test.js`, `tests/plans-keep-moving-without-the-human.test.js`,
  `tests/streaming-gate.test.js`, `tests/menu-protocol.test.js`, `tests/menu-task-wiring.test.js`,
  `tests/golden-corpus-fence.test.js`, `tests/false-green-fence.test.js`,
  `tests/reachability.test.js`, `tests/export-reachability.test.js`,
  `tests/compliance-claims-match-code.test.js`, `tests/gate-numbers-fence.test.js`.
- [ ] Live once in a scratch CTOC project: the session records four runs through the menu for
  a two-area plan and the plan moves into the build queue; the route's answers are quoted in
  the build record.

### Step 15: DOCUMENT
- [ ] JSDoc on `recordAttackRun`, `attackStatus` and the `attack` case; `docs/ENFORCEMENT.md`
  as above.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box above is checked against its evidence; the comparison test's first
  failing run and the live run are quoted.
