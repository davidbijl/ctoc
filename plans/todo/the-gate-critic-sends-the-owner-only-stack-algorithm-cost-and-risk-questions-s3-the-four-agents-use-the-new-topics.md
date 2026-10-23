---
title: "The gate critic classifies, and the three question authors write, by the owner's four kinds of question"
type: implementation
parent_plan: the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions
depends_on: the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions-s1-what-reaches-the-owner
created: 2026-10-22
priority: HIGH
files:
  # Rule 4a's definitions, its routing sentences, the new tie-break, the evidence-first duty, the omission duty.
  - agents/iron-loop/gate-critic.md
  # The three question authors' "Writing questions to the streaming store" sections.
  - agents/planning/product-owner.md
  - agents/planning/implementation-planner.md
  - agents/planning/vision-advisor.md
  # The rule inventories that pin those sentences word for word.
  - tests/compaction-eval/gate-critic/rule-inventory.json
  - tests/compaction-eval/product-owner/rule-inventory.json
  - tests/compaction-eval/implementation-planner/rule-inventory.json
  # The gate critic's order floor (one order added) and the four agents' topic check.
  - tests/gate-critic-compaction.test.js
---

# The gate critic classifies, and the three question authors write, by the owner's four kinds of question

**Scope (one line):** the gate critic's rule 4a defines `technology-stack`, `algorithm`, `cost`, `risk`, `hook-or-gate` and `detail`, says which questions reach the owner as the code of slice 1 does, and replaces "when unsure, choose the weighty topic"; the vision advisor, the product owner and the implementation planner write only those six topics.

Parent: `plans/implementation/the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions.md`, In Scope items 3, 4 and 5, and decisions 4 to 9. Scenarios carried: 2, 5 (the agent half), 9 (the agent half). Depends on slice 1: the question store refuses a whole file whose topic it does not know (`validatePlanQuestions`, `src/lib/streaming-precompute.js` line 408), so an agent that writes `risk` or `hook-or-gate` before slice 1 is built has every file it writes refused, and plans stall.

## Open choice for the owner — this slice cannot pass its checks until it is answered

Read in this planning pass:
- Inventory check 3 accepts an added or replaced order only when the plan its record names carries an approval record of kind human or backfilled whose specification hash matches that plan now (`approvedPlanText`, `tests/compaction-eval/inventory-checks.js` lines 69–88; `recordErrors`, lines 118–137). The test's own case, "approval record that is not human or backfilled", pins that a crossing's record is refused (`tests/question-blocking-default.test.js` line 825), and case 50 of the same file (line 874) runs check 3 against the three real inventories this slice edits, so it goes red for the same reason.
- This slice changes orders in all three inventories, and every changed order's record must name this slice.
- This slice, like its parent (`.ctoc/approvals/the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions.json`, `advanced_by: "sufficiency"`), moves into the build queue on recorded evidence, which writes a `sufficiency` record, and finishes on its checks, which overwrites that record with a `pipeline` one (`crossOnEvidence`, `src/lib/streaming-gate.js` lines 763–783, through `persistEntry`, `src/lib/approval-ledger.js` lines 878–914).
- So, as the code stands, check 3 fails for every order below at Step 14, and again in every run of the suite after this slice finishes.
- The same holds for three other plans that re-record orders and plan a stop step for it: "Every session is told that a hotfix word is checked" (`plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s4-every-session-is-told.md`, its decision 9), "The manual and the docs stop claiming what CTOC no longer does" (`plans/implementation/the-manual-and-the-docs-stop-claiming-what-ctoc-no-longer-does.md`, decision 12) and "the planner writes it" (`plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s2-the-planner-writes-it.md`, decision 3). None of them handles the overwrite at the finish.

This is a change to what an agent-rule change needs before it moves on, which the parent plan does not describe, so it is a real owner question. The planner writes it in its next pass, once, and its answer also covers the three plans named above. It is written under topic `security-posture`, not `hook-or-gate`: until slice 1 is built the validator refuses `hook-or-gate` as an unknown topic and with it the whole file (`validatePlanQuestions`, `src/lib/streaming-precompute.js` line 408), while `security-posture` reaches the owner under today's rule and keeps reaching him after slice 1 (one of the three earlier tags). Answering that question cannot by itself produce a human-kind record: an answer recorded through `stream answer` runs the continuation, which then crosses this slice on its evidence. And re-recording a finished approval by hand in a terminal would route around the pipeline, which the operating lessons forbid, so it is not offered. The two ways forward:
1. **Recommended — inventory check 3 also accepts the named plan's own crossing records** (`sufficiency` and `pipeline`), keeping the specification-hash match and the rule that the plan names the order, as a whole token, on the agent file's line in its hashed text.
   - Built as a slice of its own, the parent's conditional slice 5 (`the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions-s5-the-rule-check-accepts-a-plans-own-crossing-records`), which the planner writes only under this option: `tests/compaction-eval/inventory-checks.js` and cases 32 and 50 of `tests/question-blocking-default.test.js`. Slice 1 also edits that test file, so slice 5 depends on slice 1, and this slice builds after slice 5, an order held by Step 8's first action, not by an edit of this slice's `depends_on` after the answer (the answer runs the continuation, which can move this slice into the build queue, and a later frontmatter edit would break its approval fingerprint).
   - Why it is the better answer: it matches the owner's written rule that he is asked only about his four kinds, and under the new definitions an agent-rule change that weakens a protection is itself a `risk` question and one that changes what reaches him a `hook-or-gate` question, so the changes he must see still reach him.
   - Cost, as a fact: the check stops proving that a human saw each agent-rule change; an agent-rule change that weakens nothing moves on its evidence. Evidence strength: medium, a judgement on his written rule, not a measurement.
2. **Check 3 stays as it is, and the menu leaves such a plan for the owner's approve at both moves.**
   - The crossing into the build queue on recorded evidence and the finish on recorded evidence both pass over a plan whose specification names an inventoried order, so it waits for his approve, which writes a human-kind record. That is a change to `src/lib/streaming-gate.js` (protected list: yes), in a slice of its own, the streaming-gate slice, which this slice builds after, held by Step 8's first action.
   - Cost, as a fact: two approvals from him for this slice and for every later slice that changes an inventoried agent rule, and one more gate rule that must stay in step with the inventory format.

This slice is written so that either answer builds it unchanged: the records below name this slice, and check 3 reads whichever record the answer produces. No build step reads the approval record's kind; Step 8's first action reads only the answer and whether the slice it calls for is finished.

Filing this question is an exit condition of this planning pass: the planner files it next, and this slice's build cannot start until it is answered (Step 8's first action).

## Implementation Details

### The orders this slice changes, by agent file

These three lines are the specification that inventory check 3 reads for the order ids; they stand here, in hashed text, on purpose.
- `agents/iron-loop/gate-critic.md` — re-recorded: N-001, N-003, N-004, N-011; added: N-014, N-015.
- `agents/planning/product-owner.md` — re-recorded: R-420.
- `agents/planning/implementation-planner.md` — re-recorded: R-316.

`agents/planning/vision-advisor.md` has no rule inventory (searched in this pass: `tests/compaction-eval/*/rule-inventory.json` holds 12 files, none for the vision advisor).

### Dependency graph

```
tests/gate-critic-compaction.test.js --defineInventoryTests--> tests/compaction-eval/gate-critic/rule-inventory.json
    --checks--> agents/iron-loop/gate-critic.md
tests/product-owner-compaction.test.js --> product-owner inventory --> agents/planning/product-owner.md
tests/implementation-planner-compaction.test.js --> implementation-planner inventory --> agents/planning/implementation-planner.md
tests/gate-critic-compaction.test.js (new case) --reads--> the four agent files
```
No code module, no import, no cycle. The two compaction test files of the authors are not edited: their order floors (256 and 185) and kind digests do not move, because no order is added to those inventories and no unit changes.

### The exact texts

The builder uses these byte for byte. Em dashes are U+2014, as elsewhere in these files. Byte for byte binds the first pass at Step 10. A kickback from Step 16 may tighten T1, T3 or T5, never loosen one. It changes the agent file and its inventory anchors together, and records the new text under `## Execution Record`.

**T1 — rule 4a's definitions** (the new N-001 anchor; in the agent the paragraph keeps its opening `   **4a. Every question you emit carries `topic`:**` in bold, as today):
`4a. Every question you emit carries `topic`: `technology-stack`, adding, removing or replacing a language, framework, library, database or hosted service (a version bump inside one major version is a detail); `algorithm`, choosing the method by which the product computes, ranks, matches, predicts or schedules a central result, where the candidate methods give materially different results or costs and neither a published standard, an existing rule in the repository, nor a measurement or search you can run settles which is better — how input is parsed or read (where a code block, heading, field or record begins and ends), edge cases and boundaries inside a method already chosen, and fail-closed or fail-open handling are details, not algorithms; `cost`, a recurring cost or a large one-off cost; `risk`, the recommended option, or every option, knowingly takes on a loss or exposure that no earlier decision of the owner accepted: money spent; data lost, or exposed outside the project's approved boundary; something published, sent, deployed or migrated that cannot be undone; a protection that exists today weakened or switched off; a legal or compliance obligation — when the recommended option avoids it, the question is a detail; `hook-or-gate`, one question per plan, asking whether CTOC's hook or gate behaviour changes as the plan describes: what a hook refuses or allows, what a plan needs before it moves on, what reaches the owner, or what the menu moves on recorded evidence — its prompt names each change, and the choices settled inside it, in plain words; every choice of how to build such a change is a detail, and an implementation slice raises no second one, and asks no authority for building what its parent plan describes, unless it changes a hook or gate its parent plan does not describe; `detail`, everything else.`

**T2 — which questions reach the human** (the new N-003 anchor):
`In a classification, a question goes to the human only when its topic is `technology-stack`, `algorithm`, `cost`, `risk` or `hook-or-gate` (or one of the three earlier tags a stored file may still carry), or it has two or more options and not exactly one recommended. In a critique the human asked for, a `critical` question also goes to him, and so does a Hold ruling. Any other question is decided by its recommended option.`

**T3 — the tie-break** (the new N-004 anchor):
`Apply each definition's test as written: does the answer need something only the owner holds — his choice of stack or algorithm, his acceptance of a cost or risk, his approval of a hook or gate change — rather than evidence that the repository, a published standard, a measurement or his own written rules already hold? If no test fires, the question is a detail. Never call a question a detail when a test fires.`

**T4 — evidence first** (the N-014 anchor in the gate critic; the third new anchor of R-420 and R-316):
`Before you leave a question with two or more options and none recommended, look for evidence first: the repository, a published standard, or a measurement you can run; when none settles it, the first option's `description` names what you searched, what would settle it (such as a research request the CTO Chief can send to the deepthink researcher), and the option you lean to with how weak its evidence is.`

**T5 — the omission duty** (the new first N-011 anchor):
`Besides the author's questions, add one question for every choice of technology stack or algorithm, every cost or risk only the owner can accept, and every hook or gate change (one `hook-or-gate` question per plan) that the plan makes or leaves open and no author question asks: `topic` the matching topic, never `detail`; `critical` and `important` by the critique's tests; two or three options, keys `1`–`3`, the plan's own choice among them; exactly one `recommended: true` where the evidence you read supports one, otherwise none; the recommended option's `description`, or the first option's when none is recommended, names the plan file and line the choice was read at, under the quoting rules.`

**T6 — what the authors write** (the new second anchor of R-420 and R-316; the same sentence in the vision advisor):
`Every choice of technology stack or algorithm, every cost or risk only the owner can accept, and every change to how a CTOC hook or gate behaves is a question with that `topic` (`technology-stack`, `algorithm`, `cost`, `risk` or `hook-or-gate`), never a silent choice; any other question you write carries `detail`, and every choice you settle yourself goes into the plan's `## Decisions Taken Under Ambiguity` with its evidence.`

**T7 — the vision advisor's topic list item**:
`- `topic` is one of `technology-stack`, `algorithm`, `cost`, `risk`, `hook-or-gate`, `detail`, as `agents/iron-loop/gate-critic.md` rule 4a defines them.`

**T8 — only a synthesis writes the attestation** (the N-015 anchor):
`You write `attestation` only in a synthesis; a classification leaves the key out.`

### File: `agents/iron-loop/gate-critic.md`
**Action:** MODIFY, two paragraphs and one bullet.
1. **Rule 4a** (line 237, one paragraph from `   **4a. Every question you emit carries `topic`:**` to `never choose detail to let a plan through.`). Its new text, in this order, on one line: the bold opening, then T1 from `` `technology-stack`, adding`` onward; then the unchanged sentence `The gate ruling and `q98-critique-coverage` carry none.`; then T2; then T3; then T4. Gone: the old definitions of `data-model`, `security-posture` and `irreversible`, the old sentence on which questions reach the human, and "When unsure whether a finding is a detail or a weighty topic, choose the weighty topic; never choose detail to let a plan through."
2. **"Classifying the questions"** (line 103): the sentence from `Besides the author's questions, add one question for every choice of technology stack, algorithm, data model, security posture, anything irreversible, or a recurring or large cost` to `names the plan file and line the choice was read at, under the quoting rules.` becomes T5. Every other sentence of that paragraph stays, including "you set each question's `topic` yourself by rule 4a and its tie-break".
3. **The output shape** (line 94, the bullet that opens `- **The file content is exactly one JSON object**`): T8 is appended after its last sentence, `The `attestation` is the RECORD described in "The attestation — record that the fleet ran" below.` Today the bullet lists `attestation` in every file the gate critic writes, which contradicts N-008 ("A classification payload carries no gate ruling and no attestation") and is the shape a critique output that dropped its attestation would claim to follow (slice 1's stated residual). No pinned text changes: R-165's anchor (`replaced_by.new_anchors`, inventory line 7804) and R-166's anchor (line 7813) are substrings of the bullet that stay as they are, and inventory checks treat an anchor as a substring of its section's text (`tests/compaction-eval/inventory-checks.js` lines 264–266 cut it out with `split(a).join('')`), so neither order is re-recorded. T8 is a new sentence in R-165's section, so the uniqueness check (lines 285–291) holds.
- Unchanged on purpose: rule 8 ("no surviving question goes to the human under rule 4a"), which now reads through the new rule 4a (parent decision 8); rule 10; the worked example, whose `critical: true` `detail` question sits in a critique, where it still reaches the human.

### File: `agents/planning/product-owner.md` and `agents/planning/implementation-planner.md`
**Action:** MODIFY, the same edit in each ("Writing questions to the streaming store"; product owner lines 460–462, implementation planner lines 476–478).
- old: `Every choice of technology stack, algorithm, data model, security posture, anything irreversible or of recurring or large cost is a question with that `topic`, never a silent choice; the rest goes into the plan's `## Decisions Taken Under Ambiguity`.`
- new: T6, then one space, then T4. The sentence before it ("Exactly one option is `recommended: true`, or none of two when evidence cannot settle it.") and the one after it ("Your `topic` is a proposal: …") stay. Wrapping is free; words are not.

### File: `agents/planning/vision-advisor.md`
**Action:** MODIFY ("Writing questions to the streaming store").
- Lines 627–628, old: `- `topic` is one of `technology-stack`, `algorithm`, `data-model`, `security-posture`, `irreversible`, `cost`, `detail`, as `agents/iron-loop/gate-critic.md` rule 4a defines them.` (the two lines that follow it stay); new: T7.
- Lines 636–638, old: `Every choice of technology stack, algorithm, data model, security posture, anything irreversible or of recurring or large cost is a question with that `topic`, never a silent choice; the rest goes into the plan's `## Decisions Taken Under Ambiguity`.`; new: T6, then T4.

### File: `tests/compaction-eval/gate-critic/rule-inventory.json`
**Action:** MODIFY. Every record below keeps `fate: "added"`: these orders were added after the baseline, so no unit lists them, and an order marked `replaced` that no unit lists fails check 3 ("listed by no unit", `inventory-checks.js` lines 217–218). They are re-recorded in place, as N-007 and N-009 were ("Re-recorded by slice 2").
- **N-001**: `says` → `Rule 4a: a topic on every question but the ruling and the notice, one of six defined: stack, algorithm, cost, risk, hook-or-gate, detail.`; `anchors` → [T1].
- **N-003**: `says` → `In a classification, the five owner topics, an earlier tag or no single recommendation reach the human; in a critique, critical and a Hold too.`; `anchors` → [T2].
- **N-004**: `says` → `Tie-break: apply each definition's test; when none fires the question is a detail, and never call it a detail when one fires.`; `anchors` → [T3].
- **N-011**: `says` → `Add a classified question for every stack, algorithm, cost, risk or hook-or-gate choice the plan makes or leaves open and no author question asks.`; `anchors` → [T5, its second anchor unchanged].
- For each of the four, `added_by` → `{ instruction: <the old instruction, then " Re-recorded 2026-10-22: " and the instruction text below>, date: "2026-10-22", plan: "the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions-s3-the-four-agents-use-the-new-topics" }`.
- **N-014** (new, appended after N-013): `{ id: "N-014", says: "Before leaving a question with no recommended option, look for evidence first; else name what was searched, what would settle it, and the leaning pick.", now_in: "## The synthesis", anchors: [T4], fate: "added", added_by: { instruction: <the instruction text below>, date: "2026-10-22", plan: <this slice> } }`.
- **N-015** (new, appended after N-014): `{ id: "N-015", says: "Only a synthesis writes the attestation; a classification leaves the key out.", now_in: "## Your ONE write — the quarantined pending file", anchors: [T8], fate: "added", added_by: { instruction: <the instruction text below>, date: "2026-10-22", plan: <this slice> } }`.
- Instruction text: `The owner, 2026-10-22, answering "Make the change as the plan describes" on plan the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions: ask him only about a technology stack, an algorithm, a cost or risk only he can accept, or a hook or gate change; settle every other question on its evidence and write it into the plan with that evidence; keep the three earlier tags valid; a question no evidence settles still reaches him.`
- `maxBytes`: Step 10 measures `agents/iron-loop/gate-critic.md` after the edit; if it exceeds 140070, `maxBytes` rises by exactly the measured overage and one entry is appended to `ceiling_corrections`: `{ date: "2026-10-22", from: 140070, to: <new>, reason: "the owner's four kinds of question (plan the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions, slice s3); measured overage <n> bytes" }`.
- Anchors are written as the sentences read with the bold markers removed, as N-001's current anchor is.

### File: `tests/compaction-eval/product-owner/rule-inventory.json` and `tests/compaction-eval/implementation-planner/rule-inventory.json`
**Action:** MODIFY, one record each: R-420 (product owner, line 6037) and R-316 (implementation planner, line 4529), both already `fate: "replaced"`.
- `replaced_by.new_anchors` → [the first anchor unchanged (`Exactly one option is `recommended: true`, or none of two when evidence cannot settle it.`), T6, T4].
- `replaced_by.instruction` → the old instruction, then ` Re-recorded 2026-10-22: ` and the instruction text above; `date` → `"2026-10-22"`; `plan` → this slice.
- `anchors` (the baseline history) and `fate` unchanged. Check 4's rule that no sentence of an old anchor may remain holds, because the baseline sentence of each order left the agent at its earlier replacement.
- `maxBytes` (30203 and 27019): measured at Step 10 and raised by exactly the measured overage, with a `ceiling_corrections` entry as above, only when exceeded.

### File: `tests/gate-critic-compaction.test.js`
**Action:** MODIFY.
- `ORDER_FLOOR` 594 → 596 (N-014 and N-015 added; the inventory holds 594 orders today, counted in this pass); its comment adds "re-pinned 2026-10-22 when the evidence-first duty and the synthesis-only attestation added two". `KINDS_SHA256` unchanged: no unit changes.
- New test, **"the sentences the owner's four kinds retire are gone from their agents"** [scenario 5]: each old text below, normalised with the inventory checks' own `units.normalize` (as `tests/compaction-eval/inventory-checks.js` lines 134 and 230 use it), is absent from its agent file normalised the same way. Red today: the inventory checks pass with these anchors present under that normaliser, so every one is found. Anchors verified in this pass:
  - from `agents/iron-loop/gate-critic.md`: N-001's old anchor (gate-critic inventory line 12501, the rule 4a definitions from `4a. Every question you emit carries` to `` `detail`, everything else.``, compared with the bold markers removed), N-003's (line 12529), N-004's (line 12543) and N-011's first anchor (line 12641);
  - from `agents/planning/product-owner.md`: R-420's current anchor, product-owner inventory line 6052;
  - from `agents/planning/implementation-planner.md`: R-316's current anchor, implementation-planner inventory line 4544.
  The texts are copied into the test from those inventory lines before the inventories are edited, because the edit replaces them there. Re-recorded added orders lose their old anchor, and check 4 holds only a replaced order's old anchors, so without this case a retired sentence could stay beside its new one unnoticed.
- New test after the inventory registration, **"the four agents that write or classify questions name only the six topics they write"** [scenario 5]: for each of `agents/iron-loop/gate-critic.md`, `agents/planning/vision-advisor.md`, `agents/planning/product-owner.md` and `agents/planning/implementation-planner.md`, read the file and assert that it contains each of `` `technology-stack` ``, `` `algorithm` ``, `` `cost` ``, `` `risk` ``, `` `hook-or-gate` `` and `` `detail` `` (backticked), and none of `` `data-model` ``, `` `security-posture` ``, `` `irreversible` ``. Today all four fail: the gate critic and the vision advisor name the three earlier tags, and the two other authors name neither `` `risk` `` nor `` `hook-or-gate` ``. Searched in this pass: the backticked earlier tags occur only at `gate-critic.md` line 237 and `vision-advisor.md` lines 627–628.

### Test Plan
- The three compaction test files and the new case are the specification. After the inventory edits and before any agent edit, `node --test tests/gate-critic-compaction.test.js tests/product-owner-compaction.test.js tests/implementation-planner-compaction.test.js` fails checks 4, 8 and 10 for N-001, N-003, N-004, N-011, N-014, N-015, R-420 and R-316 (new anchors absent), and check 7 does not fail (596 orders against the floor of 596). Check 3 is not expected to fail: Step 8's first action has confirmed the owner's answer and the finished slice it calls for.
- The new topic case fails for all four files, and the retired-sentence case fails for all six old texts.
- After Step 10: every check green, check 3 included.
- Agent-layer fences that read these files and must stay green: `tests/agent-honest-status-fence.test.js`, `tests/unexecutable-instruction-fence.test.js`, `tests/instruction-surfaces-say-the-moment.test.js`, `tests/attestation-round-trip.test.js`, `tests/questions-attestation.test.js`, `tests/golden-corpus-fence.test.js`; the full suite at Step 14 settles the rest.

### Acceptance criteria mapping (this slice)

| Scenario | Implemented in | Test |
|---|---|---|
| 2 | T1–T5 in the gate critic | Step 16's real run of the gate critic |
| 5 (the agent half) | T1, T6, T7; the retired sentences removed | the new topic case; the retired-sentence case |
| 9 (the agent half: no second hook-or-gate question from a slice) | T1 | N-001's anchor, held by inventory checks 4, 8 and 10 |

### Wiring — the live call sites

No module and no export. Each changed text reaches its reader on a live route, read in this pass:
- The gate critic: the session's menu instructions (`src/commands/start.md`, the classify paragraph, about lines 380–391) have the session launch it for every `classify` task the menu promotes; its pending file is swept by `src/lib/streaming-questions-sweeper.js` from `streaming-gate.nextUnansweredQuestion` and validated by `streaming-precompute.writePlanQuestions`, whose topic list slice 1 widens.
- The product owner, the implementation planner and the vision advisor: dispatched by the CTO Chief for refinement and planning tasks from the same instructions; each writes its questions file as its last act, swept the same way.

### Security review

- [x] **This text decides what reaches the owner, and an attacker who controls plan text wants every question called a detail.** T3 keeps the tests strict ("Never call a question a detail when a test fires"); `risk` covers "a protection that exists today weakened or switched off", so a plan that weakens a protection still reaches him; `hook-or-gate` covers what reaches him, so a plan that changes these rules reaches him. The trust-boundary rules of the gate critic are untouched.
- [x] **The authority clause cannot be used to slip a new gate change through a slice**: it applies only to what the parent plan describes, and any hook or gate change the parent does not describe still raises a `hook-or-gate` question. The parent's own `hook-or-gate` question reached the owner before the parent moved on (slice 1's routing). Residual, stated: the gate critic reads the parent plan's text as it stands, which can be edited after the parent moved on; the slice's own classification is then the only check.
- [x] **No tool grant changes**; the gate critic's one write path is untouched.
- [x] **No secret, no home-folder path** in any anchor or record.

### Risk mitigations (this slice)

| Risk | Mitigation | Where |
|---|---|---|
| Check 3 fails because this slice's records name a plan without a human or backfilled approval | The open choice above, filed by the planner as the exit condition of this planning pass; Step 8's first action builds nothing until it is answered and the slice it calls for is finished | Its question file; Step 8 |
| The gate critic tags a real stack, algorithm, cost, risk or hook-or-gate choice as a detail | The real run at Step 16 on the twenty questions of slice 2's fixture and on slice 1's scenario 6–9 prompts; anchors pinned by the inventory | Step 16 |
| "The gate-critique fleet … improved three times" (`plans/todo/00370-every-agent-and-specialist-skill-improved-three-times-s110-gate-critic-and-lenses.md`, in the build queue) rewrites the gate critic's body text, rule 4a possibly included; it does not edit the inventory | A technical-order fact, not a schedule: whichever of the two builds second re-reads `agents/iron-loop/gate-critic.md` and its inventory at Step 9 and keeps the other's text and records; a quoted old text that moved or changed stops the build for a re-plan | Step 9 |
| Other plans name these author files (`plans/todo/00297-…-s37-product-owner.md`, `plans/todo/00295-…-s35-implementation-planner.md`, `plans/todo/00300-…-s40-vision-advisor.md`, `plans/in-progress/dispatched-agents-route-their-questions-to-the-session.md`, `plans/functional/vision-file-names-and-planning-agent-orders.md`, and `plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s2-the-planner-writes-it.md`, which adds N-202 to N-209 to the implementation planner's inventory) | This slice adds no order id to the two author inventories, so no id can collide; Step 9 re-reads each file and inventory as it then is | Step 9 |
| An agent outgrows its byte ceiling | Raised by exactly the measured overage, one recorded correction | Steps 9 and 10 |

## Decisions Taken Under Ambiguity — technical planning

1. **N-001, N-003, N-004 and N-011 are re-recorded, not marked replaced.** This corrects the parent's In Scope item 5, which said `fate: "replaced"`: they are added orders, which no unit lists, and an order marked replaced that no unit lists fails check 3. N-007 and N-009 set the precedent. N-011 is included although the parent named only three orders: its anchor lists the old six topics.
2. **R-420 and R-316 keep `fate: "replaced"`** and get a new `replaced_by` record naming this slice, its instruction carrying the earlier one, so the history of the 2026-10-07 replacement stays readable.
3. **The evidence-first duty is a new gate-critic order, N-014**, so removing it fails a separate check; in the two author inventories it joins R-420's and R-316's new anchors, adding no order id that could collide with the N-202 to N-209 another plan reserves there.
4. **One slice for the four agents.** Every slice that changes an inventoried order needs the same answer to the open choice above, so one slice asks it once; and the topic case reads all four files together. The size (eight files) is instruction text and records only.
5. **The authority clause in T1** ("and asks no authority for building what its parent plan describes") is the brief's third class of detail question: authority the owner had already given. It sits inside parent decision 6, whose wording is the planner's and whose meaning it keeps.
6. **T4 names the CTO Chief as the one who sends a research request**, because none of these four agents dispatches another agent (the gate critic: "You never dispatch a peer"; the planning agents are sub-orchestrators that recommend a dispatch).
7. **The tag names stay lower-case and hyphenated**, as rule 4a's existing values are (parent decision 11).
8. **The open choice is written under `security-posture`.** `hook-or-gate` is what it is, but the validator refuses that topic, and with it the whole file, until slice 1 is built (`src/lib/streaming-precompute.js` line 408); `security-posture` reaches the owner under today's rule and after slice 1, so the question reaches him whichever is built first.
9. **The output-shape bullet gains a sentence instead of being rewritten** (T8, N-015). Appending keeps R-165's and R-166's pinned anchors intact, so no replaced order is re-recorded and no extra order needs this slice's name in check 3; the new sentence is pinned as an added order of its own.

## Execution Plan

### Step 8: TEST
- [ ] First, before anything else: read the owner's recorded answer to the check-3 question (the open choice above) in `.ctoc/streaming/answers.jsonl`. Under option 1, confirm slice 5 (`…-s5-the-rule-check-accepts-a-plans-own-crossing-records`) is finished; under option 2, confirm the streaming-gate slice is finished. If there is no answer, or that slice is not finished, change no file and kick back (context incomplete), naming which is missing.
- [ ] Copy the six old texts of the retired-sentence case from their inventory lines, then edit the three inventories as specified and raise `ORDER_FLOOR` to 596; add the topic case and the retired-sentence case to `tests/gate-critic-compaction.test.js`.
- [ ] Run `node --test tests/gate-critic-compaction.test.js tests/product-owner-compaction.test.js tests/implementation-planner-compaction.test.js` and record each failing check and order; checks 4, 8 and 10 are red for the new anchors, the topic case is red for all four files, and the retired-sentence case is red for all six old texts. Check 3 is not expected red: the first action confirmed the slice that settles it is finished, so a check 3 failure is a finding, root-caused before going on.

### Step 9: PREPARE
- [ ] Re-read the four agent files and the three inventories; confirm each old text quoted above is present exactly once. A moved or changed text stops the build for a re-plan.
- [ ] Confirm slice 1 is built: `risk` and `hook-or-gate` are valid topics in `src/lib/streaming-precompute.js`.

### Step 10: IMPLEMENT
- [ ] `agents/iron-loop/gate-critic.md`: rule 4a, the omission-duty sentence, and T8 appended to the output-shape bullet.
- [ ] `agents/planning/product-owner.md` and `agents/planning/implementation-planner.md`: T6 and T4.
- [ ] `agents/planning/vision-advisor.md`: T7, T6 and T4.
- [ ] Measure each agent file with `fs.statSync`; raise a `maxBytes` only by a measured overage, recorded.
- [ ] Run the three compaction tests and the topic case: every check green, check 3 included.

### Step 11: REVIEW
- [ ] The critic reads rule 4a against the parent's decisions 4 to 9 and the seven decisions above, sentence by sentence, and confirms no meaning moved.

### Step 12: OPTIMIZE
- [ ] No sentence is said twice inside one agent; the measured byte growth of each file is recorded.

### Step 13: SECURE
- [ ] The security scanner reads the new definitions as a hostile plan author would and tries to word a real stack change, a weakened protection and a new gate change so that each reads as a detail; each attempt must still fire a test.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, type check, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.

### Step 15: DOCUMENT
- [ ] The agent texts are the documentation. The build record lists each changed order and any ceiling correction.

### Step 16: FINAL-REVIEW
- [ ] Parent scenario 2, a real run: the session (as CTO Chief) launches the gate critic under its new instructions in a temporary project under the operating system's temporary folder, holding copies of the two plans of the thirteen and, as each plan's author list, its questions from `tests/fixtures/questions-the-owner-called-details.json` with their original topics (slice 2 creates that file; if slice 2 is not built yet, the same questions are copied from the two stored files named there). Each of the thirteen must come out `detail` with its wording, options and recommended option unchanged; each plan may carry at most one added question, and only a `hook-or-gate` question whose prompt names in plain words the hook or gate change that plan makes and the choices settled inside it.
- [ ] The seven of 2026-10-22 in slice 2's fixture are held to the same criterion in the same scratch project (the two others have no answered version on disk, slice 2's decision 7, so they are not run). It also holds their five source plans and their parent:
  - the four send-back slices `…-s2-the-send-back-command`, `…-s3-the-text-only-check`, `…-s5-the-checks-run-again` and `…-s6-it-finishes-again`;
  - this plan's own functional revision, taken from the commit that held it in `plans/functional/`, because the file now sits in `plans/implementation/` with the slice index appended (if no commit holds it, the parent file cut before `## Slices (dependency-ordered)`, recorded as such);
  - the parent `a-finished-plan-can-be-sent-back-for-a-text-only-revision`.
  Each slice's `parent_plan` resolves inside the scratch project. Each of the seven must come out `detail`, unchanged, with at most one added `hook-or-gate` question per plan, and none for a slice whose parent describes the change.
- [ ] On any miss among the twenty, kick back to Step 10 to tighten the topic rules (T1, T3, T5). The circuit breaker applies: at most 3 kickbacks to one step and 5 per plan, then the owner is told.
- [ ] The two classified files are shown to the owner in full, unedited.
- [ ] Every scenario in the mapping above is checked against its evidence.
