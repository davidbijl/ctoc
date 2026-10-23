---
title: "In a classified question file, only a stack, an algorithm, a cost, a risk or a hook or gate change reaches the owner"
type: implementation
parent_plan: the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions
depends_on: none
created: 2026-10-22
priority: HIGH
files:
  # The shared rule: the topic list, isBlockingQuestion, goesToHuman, and the gate's call.
  - src/lib/streaming-precompute.js
  # The screen's call of the shared rule (nextUnansweredQuestion), one argument added.
  - src/lib/streaming-gate.js
  # The audit's call of the shared rule (auditQuestions), one argument added.
  - src/lib/sufficiency-audit.js
  # The rule's tests: unit, the gate predicate, the screen and the continuation.
  - tests/question-blocking-default.test.js
  # The audit counts with the gate's rule for a classification and for a critique.
  - tests/sufficiency-audit.test.js
  # Its paragraph "Which questions reach the human".
  - docs/ENFORCEMENT.md
---

# In a classified question file, only a stack, an algorithm, a cost, a risk or a hook or gate change reaches the owner

**Scope (one line):** the one rule the gate, the screen and the audit share (`goesToHuman` with `isBlockingQuestion` in `src/lib/streaming-precompute.js`) sends a question in a classification to the owner only for the five topics, the three earlier tags, or no single recommendation; `critical` still sends a question to him in a critique he asked for, and in any file when its id topic is one only a critique's synthesis writes.

Parent: `plans/implementation/the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions.md`, In Scope items 1 and 2 and item 8 for the routing sentences. Scenarios carried: 4, 5 (the code half), 6, 7, 8, 9 (the routing half), 10.

## Implementation Details

### What changes, in one paragraph

Today `isBlockingQuestion` (`src/lib/streaming-precompute.js` lines 921–932) sends every `critical` question and every question tagged with one of six topics to the owner. After this slice, in a file carrying the gate critic's classification block:
- `critical: true` sends a question to the owner only when the file also carries a valid attestation, which marks a critique the owner asked for (`validateAttestation`, lines 504–537; a file holding the gate ruling must carry one, `reservedIdErrors`, lines 549–560).
- The topics that always reach him are `technology-stack`, `algorithm`, `cost`, `risk` and `hook-or-gate`, plus the three earlier tags `data-model`, `security-posture` and `irreversible`, which stay valid and keep reaching him (the owner's answer to the parent's question q11, `.ctoc/streaming/answers.jsonl` line 312, key 1).
- A `critical` question whose id topic is one only a critique's synthesis writes (its questions about itself or about a plan steering its reviewer) reaches the owner whatever the file's attestation (item 2 below). Such a file is never refused: a classification reads the plan under the trust-boundary and read-scope rules and must be able to write those questions (`agents/iron-loop/gate-critic.md` rule 4, lines 67–71 and 498; lines 103, 175, 177 and 495), and a refused file would leave the author's unclassified file live, which the screen shows nothing of (`src/lib/streaming-gate.js` line 476), so the steering notice would never reach him.
- Everything else is unchanged: malformed questions, an `important` question with no topic (a Hold ruling), and a question with two or more options and not exactly one recommended still reach him; in a file without the classification block every open question does.

The owner approved this gate-logic change by his answer to the parent's question q10, "Make the change as the plan describes" (`.ctoc/streaming/answers.jsonl` line 294, key 1).

### Protected-list status of the files this slice edits

- `src/lib/streaming-gate.js` is on CTOC's protected list (`PROTECTED_ENFORCEMENT_FILES`, `src/lib/protected-paths.js` line 65).
- `src/lib/streaming-precompute.js` and `src/lib/sufficiency-audit.js` are not on it.
- What the list does today, read in this planning pass: its human-kind coverage check (`src/lib/plan-coverage.js` line 614) runs only from the edit hooks `PreToolUse.Edit.js` and `PreToolUse.Bash.js`, which Claude Code does not load (`hooks/hooks.json` registers only `src/hooks/protect-records.js`). The crossing on recorded evidence checks no protected list. The list's one live effect is that the hotfix route refuses a hotfix touching a listed file (`src/lib/hotfix-check.js` line 1497).

### Dependency graph

```
src/lib/streaming-precompute.js  isBlockingQuestion(question, attested)
    <-- goesToHuman(question, classified, attested)   (same file)
        <-- hasEnoughInformation (same file)  <-- streaming-gate.sufficiencyFor
                <-- pendingGateDecisions <-- menu-screens.continueAfterCrossing
        <-- streaming-gate.nextUnansweredQuestion  (the screen's one funnel)
        <-- sufficiency-audit.auditQuestions  <-- auditSufficiencyCrossings
                <-- src/tabs/tools.js renderSufficiencyAudit
tests/question-blocking-default.test.js --drives--> all of the above but the audit
tests/sufficiency-audit.test.js --drives--> auditSufficiencyCrossings and hasEnoughInformation
```
No new module, no new import edge: `sufficiency-audit.js` already requires `streaming-precompute.js` and only adds `validateAttestation` to that import. No cycle (the existing lazy requires between `streaming-gate.js` and `streaming-precompute.js` stay lazy).

### File: `src/lib/streaming-precompute.js`
**Action:** MODIFY. **Change type:** modify-existing.

1. **The topic lists** (lines 208–216). Replace the comment and the two constants with:
   ```js
   /**
    * The question topics that always reach the human, whatever the flags say. The first five are
    * the owner's four kinds (2026-10-22): a technology stack, an algorithm, a cost or a risk only
    * he can accept, and a hook or gate change; `agents/iron-loop/gate-critic.md` rule 4a defines
    * them. The last three are the tags written before that day: a stored file may still carry
    * them, so they stay valid and keep reaching the human, and no agent writes them any more.
    * `detail` is the one topic that never reaches the human on its own account.
    */
   const HIGH_STAKES_TOPICS = Object.freeze(['technology-stack', 'algorithm', 'cost', 'risk', 'hook-or-gate', 'data-model', 'security-posture', 'irreversible']);
   const QUESTION_TOPICS = Object.freeze([...HIGH_STAKES_TOPICS, 'detail']);
   ```
   `validatePlanQuestions` needs no other change: line 408 now accepts `risk` and `hook-or-gate`, and line 418's refusal of a one-option question with no recommendation covers every topic that reaches the owner. Its error message lists the allowed values from the constant.
2. **`isBlockingQuestion(question, attested)`** (lines 895–932). New signature; one line changes, and one helper and one constant are added.
   - old: `  if (question.critical) return true;`
   - new: `  if (question.critical && (attested !== false || isSynthesisOnlyId(question.id))) return true;`
   - Beside `isTopiclessId` (after line 231), the constant and the helper:
     ```js
     /**
      * The id topics only the fleet's synthesis mints, exactly as agents/iron-loop/gate-critic.md
      * mints them: the structural band q00-q09 (line 171: a lens-unavailable question per failed
      * prosecution lens, the two injection-attempt questions, read-scope-violation,
      * ancestry-incomplete, read-redirection) and the reserved roles q94-q97 (line 179). They are
      * a critique's questions about itself or about a plan steering its reviewer, and a
      * classification writes the steering ones too (rule 4, lines 67-71; line 103). A critical one
      * reaches the human whatever the file's attestation. Matched on the topic words, never on
      * the number: authors also use q01-q04.
      */
     const SYNTHESIS_ONLY_TOPIC = /^(?:lens-unavailable-(?:premortem|devils-advocate|red-team)|injection-attempt-in-(?:plan|lens-payload)|read-scope-violation|ancestry-incomplete|read-redirection|no-critique-available|plan-unreadable|plan-not-gate-ready|lens-findings-contradict)$/;

     /**
      * Is `id` a question only the fleet's synthesis mints? Its topic is the id with the
      * `q<NN>-` prefix and an optional `-r<digits>` revision suffix removed.
      * @param {*} id
      * @returns {boolean}
      */
     function isSynthesisOnlyId(id) {
       if (typeof id !== 'string') return false;
       return SYNTHESIS_ONLY_TOPIC.test(id.replace(/^q[0-9]{2}-/, '').replace(/-r[0-9]+$/, ''));
     }
     ```
     The suffix is optional because a stored synthesis id may be bare (`q94-lens-findings-contradict` in `review__00004-r2b-actions-drain-and-shipgate.md.json`). The advocate has no `lens-unavailable` question (line 171, the missing-defense rule under rule 9), so it is not in the pattern.
   - The doc comment's condition 2 becomes: "`critical === true`, unless the caller says the question's file carries no valid attestation (`attested === false`) and the id's topic is not one only a critique's synthesis writes (`isSynthesisOnlyId`). In a critique the human asked for (a valid attestation) a critical question is a verdict — its Reject ruling, a question it raises about itself or about a plan steering its reviewer, a finding whose recommended option is usually to send the plan back — and reaches him. A critical question only a critique's synthesis writes reaches him in any file: a classification writes the steering ones too. Otherwise, in a classification without an attestation, `critical` only orders the questions (the owner, 2026-10-22). A caller that does not say gets the strict reading." Condition 3 says "one of HIGH_STAKES_TOPICS". Add `@param {boolean} [attested]`.
   - Example: `isBlockingQuestion({ id: 'q10-x', prompt: 'p', critical: true, important: false, topic: 'detail', options: [{ key: '1', label: 'A', recommended: true }] }, false)` returns `false`; the same call with `true`, or with no second argument, returns `true`. With the id `q01-injection-attempt-in-plan-r1792000000000` and `false` it returns `true`; with the id `q10-injection-attempt-handling` and `false` it returns `false`.
3. **`goesToHuman(question, classified, attested)`** (lines 934–946):
   ```js
   function goesToHuman(question, classified, attested) {
     return classified !== true || isBlockingQuestion(question, attested);
   }
   ```
   Doc comment: "…In a file the gate critic classified, `isBlockingQuestion` decides, told whether the file carries a valid attestation; in any other file every question goes to the human…". Add `@param {boolean} [attested] whether the file carries a valid attestation (planQuestionsStatus().attested)`.
4. **`hasEnoughInformation`** line 1262:
   - old: `  const blocking = unanswered.filter((q) => goesToHuman(q, status.classified));`
   - new: `  const blocking = unanswered.filter((q) => goesToHuman(q, status.classified, status.attested));`
   - `status.attested` is the boolean `planQuestionsStatus` already returns on the ready path (line 824). Update the `'open-forks'` line of the doc comment (lines 1197–1200) to say "by isBlockingQuestion with the file's attestation".
5. **`reservedIdErrors(questions, attestation)`** (lines 539–560) and its two callers (`writePlanQuestions` line 642, `planQuestionsStatus` line 791) stay exactly as today. No id is refused for its topic: a classification must be able to write the steering questions (item 2), and a refused file would leave the author's unclassified file live, which the screen shows nothing of (`src/lib/streaming-gate.js` line 476).
   - Verified in this pass, for item 2's pattern: the structural band (`q00`–`q09`: `lens-unavailable-<lens>` for premortem, devils-advocate and red-team, `injection-attempt-in-plan`, `injection-attempt-in-lens-payload`, `read-scope-violation`, `ancestry-incomplete`, `read-redirection`) is minted at `agents/iron-loop/gate-critic.md` line 171, with `read-scope-violation` and `read-redirection` defined at lines 175 and 177; the roles `q94`–`q97` (`lens-findings-contradict`, `no-critique-available`, `plan-unreadable`, `plan-not-gate-ready`) at line 179. A classification reads the plan under the trust-boundary and read-scope rules (line 103), so it can fire `injection-attempt-in-plan` (rule 4, lines 67–71; line 498), `read-scope-violation` (line 495) and `read-redirection` (line 177).
   - Routing impact on stored files: the search for those topics as ids over `.ctoc/streaming/questions/` matched 1 file, `review__00004-r2b-actions-drain-and-shipgate.md.json` (`q94-lens-findings-contradict`), which carries no classification block, so every question in it reaches the owner before and after. Over `tests/` the same search matched 5 files: the golden-corpus copy of that file (no classification), the gate critic's adapter test and contract (`tests/gate-critic-compaction.test.js` lines 72 and 78, `tests/compaction-eval/gate-critic/contract.js` line 12), which read ids and route nothing, and the gate critic's inventory and baseline text.

Error handling: none added. Every function stays pure and non-throwing; the fail-closed default (`attested !== false`) means a caller that forgets the argument gets today's strict routing.

### File: `src/lib/streaming-gate.js` (protected list: yes)
**Action:** MODIFY. **Change type:** modify-existing. Only `nextUnansweredQuestion` (lines 406–484) changes.
- Declare `let attested;` beside `let classified;` (line 451).
- After `classified = st.classified;` (line 464) add `attested = st.attested;`.
- Line 482: `precompute.goesToHuman(q, classified)` becomes `precompute.goesToHuman(q, classified, attested)`.
- Doc comment line 422: "(`streaming-precompute.goesToHuman`, the gate's own rule, given the file's classification and attestation)".

### File: `src/lib/sufficiency-audit.js`
**Action:** MODIFY. **Change type:** modify-existing.
- Line 44: `const { questionsPath, isGateCriticClassification, validateAttestation, goesToHuman } = require('./streaming-precompute');`
- In `auditQuestions` (lines 104–108):
  ```js
  // The SAME rule the gate uses, never a re-derivation: in a file the gate critic did not
  // classify, every question goes to the human (the owner's decision of 2026-10-07); in one it
  // classified, `critical` reaches him only when the file carries a valid attestation (2026-10-22).
  const classified = isGateCriticClassification(parsed.classification);
  const attested = validateAttestation(parsed.attestation).valid;
  const blocking = qs.filter((question) => goesToHuman(question, classified, attested)).length;
  ```

### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY. Replace the paragraph that begins `**Which questions reach the human.**` (lines 213–221) with:

> **Which questions reach the human.** `streaming-precompute.goesToHuman(question, classified, attested)` is the one rule the gate, the screen and the audit share. In a file carrying the gate critic's classification block, a question reaches the human only when it is malformed; when its topic is `technology-stack`, `algorithm`, `cost`, `risk` or `hook-or-gate`, or one of the three earlier tags `data-model`, `security-posture` and `irreversible`, which a stored file may still carry and no agent writes any more (the owner, 2026-10-22); when it is `important` with no topic, which is a Hold ruling; when it has two or more options and not exactly one recommended; or when it is `critical` and the file carries a valid attestation, which marks a critique the human asked for. A `critical` question whose id topic is one only a critique's synthesis writes (a prosecution lens that did not run, an injection attempt in a plan or a lens payload, a declared file outside the allowed read scope, missing ancestry, a redirected read, lenses that contradict each other, no critique, an unreadable plan, a plan not ready for its gate) reaches the human whatever the file's attestation, because a classification writes the steering ones too; such a file is never refused for it. Otherwise, in a classification without an attestation `critical` only orders the questions, and a caller that does not say whether the file is attested gets the strict reading. In any other file every open question reaches the human, and the file moves nothing. Every other open question is decided by its recommended option and written under the plan's `## Decisions Taken Under Ambiguity` when the plan moves on. A Hold is CTOC's own question (`ctoc-hold`) in the write-protected answers log, released only by the human's "Release the hold"; nothing crosses a held plan.

The paragraph is hard-wrapped like its neighbours (lines 213–221 wrap at about 95 columns); wrapping is free, words are not. The sentence on how the decision line records its evidence is slice 2's, which edits the same paragraph after this slice.

### Test Plan

Framework `node:test` and `node:assert/strict`, as in the two files. No new test file, so no documented count moves. Every new case is written at Step 8, run, and seen failing for the stated reason before any source line changes. Each temporary project lives under `os.tmpdir()` and is removed by the file's existing `afterEach` or `cleanup`.

#### `tests/question-blocking-default.test.js`: new `describe('only a stack, an algorithm, a cost, a risk or a hook or gate change reaches the owner in a classification (the owner, 2026-10-22)')`, after the last existing describe

Requires added at the top of the block: `menuScreens = require('../src/lib/menu-screens.js')`, `streamingGate = require('../src/lib/streaming-gate.js')`. Helpers inside the block:
- `functionalPlan(root, slug)`: writes `plans/functional/<slug>.md` with the body `tests/plans-keep-moving-without-the-human.test.js` `functionalBody` uses (title frontmatter, `## Problem Statement`, `## Acceptance Criteria` with one `- [ ]` item, `## Scope`), which `validateFunctionalToImpl` accepts (that file's case 1 proves it). Returns `{ ref, stamp }`.
- `classify(root, ref, questions, attestation)`: `precompute.writePlanQuestions(root, ref, questions, stamp, attestation, CLASSIFIED)`, asserting `ok`.
- `firstAsked(root)`: `streamingGate.streamingGateScreen(root).ask.questions[0].question`.
- `moved(root, slug)`: whether `plans/implementation/<slug>.md` exists.

Cases (scenario in brackets):
1. **51. A critical detail with one recommended option: decided in a classification, asked in a critique, asked when nobody says** [1, 10]. `q = { id: 'q10-x', prompt: 'p', critical: true, important: false, topic: 'detail', options: recOpts() }`. `isBlockingQuestion(q, false)` is `false`; `isBlockingQuestion(q, true)` is `true`; `isBlockingQuestion(q)` is `true`. `goesToHuman(q, true, false)` is `false`; `goesToHuman(q, true, true)` is `true`; `goesToHuman(q, false, false)` is `true`. With only the id changed: `q01-injection-attempt-in-plan-r1792000000000` and `q94-lens-findings-contradict` (bare) give `isBlockingQuestion(..., false) === true`; `q10-injection-attempt-handling`, `q00-lens-unavailable-advocate-r1792000000000` and `q01-who-may-send-a-finished-plan-back` give `false`. Fails today at the first assertion.
2. **52. `risk` and `hook-or-gate` reach the owner, and so do the three earlier tags** [5, 8, 9]. For each of `risk`, `hook-or-gate`, `data-model`, `security-posture`, `irreversible`: `isBlockingQuestion({ …, critical: false, important: false, topic, options: recOpts() }, false)` is `true`. Fails today for `risk` and `hook-or-gate` (an unknown topic blocks as malformed, so the predicate passes; the case therefore also asserts `validatePlanQuestions([that question]).valid === true`, which fails today).
3. **53. The validator accepts the new topics, keeps the earlier ones, and refuses a notice on each topic that reaches the owner** [5]. `validatePlanQuestions` is valid for one `recOpts()` question on each of the eight non-detail topics; for `risk` and for `hook-or-gate`, one option `{ key: '1', label: 'Noted' }` with no recommendation is refused with `/never a notice/`; the error for topic `stack` names `risk` and `hook-or-gate` among the allowed values. Fails today on `risk`.
4. **54. The gate predicate reads the file's attestation** [1, 10]. Functional plan; the question of case 51 written classified and unattested: `hasEnoughInformation` gives `enough: true`, `blocking: []`, and the question in `unanswered`. The same question in a second plan written classified with `ATTESTED`: `reason: 'open-forks'`, `blocking` ids `['q10-x']`. Fails today on the first plan.
5. **55. No evidence settles it: the plan waits and the owner is asked** [4]. Classified file: `{ id: 'q10-tie', prompt: 'Name the export button "Export" or "Download"?', critical: false, important: false, topic: 'detail', options: opts() }` (two options, none recommended). `menuScreens.continueAfterCrossing(root)`; the plan is still in `functional/`; `firstAsked(root)` is that prompt; the plan file contains no `## Decisions Taken Under Ambiguity`. Today's behaviour: green before the change, a guard that must stay green after it.
6. **56. A question tagged before this change keeps its meaning** [5]. Classified, unattested: `{ id: 'q10-sess', prompt: 'How long may a session stay idle?', critical: false, important: false, topic: 'security-posture', options: recOpts() }`. The continuation leaves the plan; `firstAsked` is that prompt. Guard, green before and after.
7. **57. A technology-stack choice is asked before any other open question** [6]. Classified file in this order: a detail `q10-color` ('Which colour?', recommended 'Blue') then `{ id: 'q11-runner', prompt: 'Replace the built-in node:test runner with a third-party test framework?', critical: false, important: false, topic: 'technology-stack', options: [{ key: '1', label: 'Keep node:test', recommended: true }, { key: '2', label: 'Adopt a third-party framework' }] }`. The plan stays; `firstAsked` is the runner prompt. Guard.
8. **58. An algorithm choice reaches the owner** [7]. Classified: `{ id: 'q10-ranking', prompt: 'Rank the sibling plans a critique reads by keyword score alone, by meaning similarity alone, or by the fused ranking used today?', critical: false, important: false, topic: 'algorithm', options: three options, the third ('Keep the fused ranking') recommended }`. The plan stays; `firstAsked` is that prompt. Guard.
9. **59. A risk only the owner can accept reaches him even when its recommendation is to take it** [8]. Classified: `{ id: 'q10-prune', prompt: 'Delete every answer older than a plan\'s current revision from the answers log? Deleted answers cannot be recovered.', critical: false, important: false, topic: 'risk', options: [{ key: '1', label: 'Delete them', recommended: true }, { key: '2', label: 'Keep them' }] }`. The plan stays; `firstAsked` is that prompt. Fails today: the writer refuses topic `risk`.
10. **60. A hook or gate change reaches the owner once, and the choices inside it do not** [9]. Classified, unattested, in this order: three details `q10-a`, `q11-b`, `q12-c`, each with one recommended option carrying a `description`, then `{ id: 'q13-change', prompt: 'This plan makes the write protection refuse one new kind of write and lets the menu finish one new kind of plan on recorded evidence. Make these two changes?', critical: false, important: true, topic: 'hook-or-gate', options: [{ key: '1', label: 'Make both changes', recommended: true }, { key: '2', label: 'Make neither' }] }`. The continuation leaves the plan; `hasEnoughInformation(...).blocking` ids are `['q13-change']`; `streamingGate.nextUnansweredQuestion(root, ref).question.id` is `'q13-change'`. Then `route(['stream', 'answer', ref, 'q13-change', '1', digestOf(q13)], root)` (the router from `menu-screens.js`): the plan is in `implementation/`. Fails today: the writer refuses `hook-or-gate`. The decision lines with evidence are slice 2's case.
11. **61. A critique the owner asked for still stops a plan it rejects or could not finish** [10]. Plan A, classified with `ATTESTED`: a finding `{ id: 'q10-e2e-r<stamp>', prompt: 'The pay button is never clicked in any test. Approve it?', critical: true, important: false, topic: 'detail', options: [{ key: '1', label: 'Send back — add a real end-to-end test first', recommended: true }, { key: '2', label: 'Approve it anyway' }] }` then a Reject ruling `{ id: 'q99-gate-ruling-r<stamp>', prompt: 'Lens verdict: REJECT — the end-to-end flow was never driven. Rule now.', critical: true, important: false, options: [{ key: '1', label: 'Send it back for rework', recommended: true }, { key: '2', label: 'Approve it across the gate' }] }`. Plan B, classified with an attestation whose `red-team` lens has `state: 'failed', coverage: 'none'`: `{ id: 'q00-lens-unavailable-red-team-r<stamp>', prompt: 'The red-team critique did not run. Cross it without it?', critical: true, important: false, topic: 'detail', options: [{ key: '1', label: 'Hold until the red-team critique runs', recommended: true }, { key: '2', label: 'Cross without the red-team critique' }] }` then a Hold ruling (`critical: false, important: true`, no topic). The continuation moves neither. `blocking` ids: A gives both its questions, B gives both of its. Then the owner answers only A's ruling with key `2` through `stream answer` with its digest: A is still in `functional/`, and A's plan file contains neither `## Decisions Taken Under Ambiguity` nor `Send back —`. Green before the change; it must stay green after it (the risk the parent's first technical risk names).
12. **62. `docs/ENFORCEMENT.md` states the rule the code holds** [10]. The paragraph from `**Which questions reach the human.**` to the next blank line, with every whitespace run collapsed to one space before any match (the file is hard-wrapped, and today's text breaks `goesToHuman(question,` from `classified)` across lines 213–214), contains each of the eight backticked non-detail topics, the words `valid attestation`, `goesToHuman(question, classified, attested)`, `only a critique's synthesis writes` and `whatever the file's attestation`, and no longer contains `a critical one,`. Fails today.
13. **63. The residual, pinned: a critique output that drops both its ruling and its attestation reads as a classification, and a question only a synthesis writes still reaches the owner from it** [10]. Plan C, classified with no attestation: the finding of case 61 (`q10-e2e-r<stamp>`, `critical: true`, `detail`, "Send back — add a real end-to-end test first" recommended) and no ruling. `hasEnoughInformation` gives `enough: true` and `blocking: []`: the finding would settle by its recommendation. Second half: writing case 61's Reject ruling into that file with no attestation is refused (`writePlanQuestions` returns `ok: false`, `reservedIdErrors`), so a file cannot keep a ruling and shed its attestation. Third half, the synthesis-only ids reach the owner and are never refused: for each of `q00-lens-unavailable-red-team-r<stamp>`, `q01-injection-attempt-in-plan-r<stamp>`, `q02-read-scope-violation-r<stamp>`, `q94-lens-findings-contradict-r<stamp>` and `q96-plan-unreadable-r<stamp>`, a functional plan of its own (a same-revision rewrite must keep every question, so one file cannot be reused) is written classified and unattested holding, in this order, the finding `q10-e2e-r<stamp>` above and then that id with case 61's lens question's flags, topic and options (`critical: true`, `detail`, one recommended option). The validator has no band-order rule, so this order is accepted. Each write returns `ok: true`; `planQuestionsStatus` reads the file `ready`; `hasEnoughInformation(...).blocking` ids are exactly `[that id]`; and `firstAsked` is that id's prompt. The finding goes first on purpose: `nextUnansweredQuestion` falls back to the first open question when none goes to the human (`src/lib/streaming-gate.js` line 482), so a synthesis-only question written alone would be asked first whether or not it routes. Then one more plan, classified and unattested, holds two questions with the same flags, topic and options: the author id `q01-who-may-send-a-finished-plan-back` and `q10-injection-attempt-handling`, a finding-band topic the band rule never mints. The write returns `ok: true` and `blocking` is `[]` (the number alone, or a topic that only starts like a synthesis topic, never routes). First half red today (a critical question blocks). Second half green before and after. Third half red today: `q10-e2e-r<stamp>` blocks and is asked first, and the last plan's two critical questions block; green after the change; dropping the `isSynthesisOnlyId` exception turns it red again with an empty `blocking`. A later change that keeps such a file strict flips the first half on purpose, with its reason written.

Existing cases: case 17 (`critical + topic "detail" blocks`, a one-argument call) stays as written and stays green, because a caller that does not say gets the strict reading; it is now the case that pins that default. Case 15 keeps its list of six topics, all still blocking. Cases 9b, 28b and 43 write critical detail questions into an unclassified file or an attested one, so their outcome does not change (read in this pass).

#### `tests/sufficiency-audit.test.js`: new test after test 4b

**4c. The audit counts with the gate's rule for a classification and for a critique the owner asked for** [10]. A classified detail question `{ id: 'q10-a', critical: true, topic: 'detail', one recommended option }` is written for three plans in `todo/`, each with a sufficiency ledger entry naming its ref (the pattern of test 4b): `00047-classified` with no attestation (expected blocking 0), `00048-critique` with a valid attestation (expected 1), and `00049-hold`, attested, holding only a Hold ruling `q99-gate-ruling` (`important: true`, no topic; expected 1). For each, `audited.questions.blocking` equals the expected number and equals `precompute.hasEnoughInformation(root, ref).blocking.length`. Fails today on `00047-classified` (the audit counts 1, the gate 1, the expected 0).

#### Coverage
The changed lines are each reached by a new case: the critical branch with `false`, `true` and no argument (51); the attested argument in the gate (54), the screen (60) and the audit (4c); `isSynthesisOnlyId` on a suffixed id that matches, a bare finding-band topic that only starts like one, and an author id in the structural number range (51 and 63, third half). Coverage stays at or above `.ctoc/coverage-baseline.json` `minPct`.

### Acceptance criteria mapping (this slice)

| Scenario | Implemented in | Test |
|---|---|---|
| 1 (the predicate half) | `isBlockingQuestion`, `goesToHuman`, `hasEnoughInformation` | 51, 54 |
| 4 | unchanged condition 5 | 55 |
| 5 (the code half) | `HIGH_STAKES_TOPICS` keeps the three earlier tags | 52, 53, 56 |
| 6 | condition 3 and `nextUnansweredQuestion` | 57 |
| 7 | condition 3 | 58 |
| 8 | `risk` in `HIGH_STAKES_TOPICS` | 52, 59 |
| 9 (the routing half) | `hook-or-gate` in `HIGH_STAKES_TOPICS` | 52, 60 |
| 10 | the attested argument in all three callers; the synthesis-only exception (`isSynthesisOnlyId`) in `isBlockingQuestion`; `docs/ENFORCEMENT.md`; the residual stated in the Security review | 51, 54, 61, 62, 63, 4c |

### Wiring — the live call sites

No new module and no new export; the two changed exports already have live callers, each read in this pass:
- **The gate.** `hasEnoughInformation` (`src/lib/streaming-precompute.js` line 1236) is called by `streaming-gate.sufficiencyFor` (line 642), which `pendingGateDecisions` calls once per plan (line 1132). On the continuation's pass, `menu-screens.continueAfterCrossing` drives `pendingGateDecisions` with `opts.crossed`; that pass runs on the session's three live paths (`menu task complete --continue`, `stream approve`, `stream answer`), all reached from `/ctoc:start` through `src/commands/start.js`. Cases 55–61 drive it through `continueAfterCrossing` and the `stream answer` route.
- **The screen.** `nextUnansweredQuestion` (`src/lib/streaming-gate.js` line 428) is the funnel both question screens use (its own header, lines 437–444): `streamingGateScreen` and the plan decision screen, reached from `/ctoc:start`. Cases 55–60 read `streamingGateScreen`.
- **The audit.** `auditQuestions` is reached through `auditSufficiencyCrossings`, which `src/tabs/tools.js` `renderSufficiencyAudit` (defined at line 332) calls at line 335. `renderDoctor` in the same file reaches `renderSufficiencyAudit` at line 74, and `src/commands/start.js` line 363 calls `toolsTab.renderDoctor` (both verified in this pass).

### Security review

- [x] **What reaches the owner is loosened, deliberately and narrowly.** Only one kind of question changes routing: a `critical` question in a classified file with no valid attestation whose id topic is not one only a synthesis writes. The owner ordered it (q10). A critique's verdicts keep reaching him: the gate ruling and the coverage notice are refused in any file without a valid attestation (`reservedIdErrors`), so a critique's file cannot shed its attestation and keep its ruling; and a same-revision rewrite must keep every question (`keepsQuestions`). Case 61 pins both critiques.
- [x] **Narrowed: a critical question only a synthesis writes reaches the owner whatever the file's attestation.** `isBlockingQuestion` keeps a `critical` question blocking in a classified unattested file when its id topic, prefix and revision suffix stripped, is one the band rule mints exactly (`lens-unavailable-premortem`, `lens-unavailable-devils-advocate`, `lens-unavailable-red-team`, `injection-attempt-in-plan`, `injection-attempt-in-lens-payload`, `read-scope-violation`, `ancestry-incomplete`, `read-redirection`) or a reserved role (`no-critique-available`, `plan-unreadable`, `plan-not-gate-ready`, `lens-findings-contradict`). So a critique's questions about itself or about a plan steering its reviewer never settle by their recommendation. Such a file is never refused: a classification reads the plan under the trust-boundary and read-scope rules and writes the steering questions itself (`agents/iron-loop/gate-critic.md` lines 67–71, 103, 175, 177, 495 and 498), and a refused file would leave the author's unclassified file live, where the screen asks nothing (`src/lib/streaming-gate.js` line 476), so the steering notice would never reach the owner. The pattern is pinned to the exact topics, so a finding-band topic that only starts like one (`q10-injection-attempt-handling`) does not route. Case 63's third half pins it.
- [x] **Residual, stated: a critique output that drops both its gate ruling and its attestation reads as a plain classification, and its finding-band critical questions settle by their recommendation.** That is the whole residual: the questions with ids `q10` upward, whose shape a classification's added questions share, so no id test can tell them apart. The sweeper passes the pending file to the writer as it is (`src/lib/streaming-questions-sweeper.js` lines 198–216). Precondition: the gate critic breaks its own rule 10 (a synthesis carries the ruling) and its output shape (slice 3 makes that line say only a synthesis writes the attestation). Case 63's first two halves pin it. Why the residual and not a stricter reading, read in this pass: the task registry already records each `precompute` task by plan ref (`.ctoc/state/tasks.json`, 15 such tasks, none for the refs of the twenty-two questions), but `task-registry.load` returns an empty list with no `unreadable` flag for a file of the wrong shape, version or size (lines 423–431), so "no critique launched" would fail open, and the record carries no revision, so an old critique would keep every later classification of that ref strict. Fixing either means editing `src/lib/task-registry.js`, outside this slice. The plan "Only a critique the menu launched can move a plan" (`plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s24-only-a-critique-the-menu-launched-can-move-a-plan.md`) does not provide such a record: it is tagged `rejected` (frontmatter `revision: 1`; its body's revision 3 of 2026-10-19, both read in this pass), the owner's Hold on it stands (`.ctoc/streaming/answers.jsonl` line 178), and its attribution record is the hook's waiting-folder write record, not a per-ref critique fact.
- [x] **Fail closed by default.** `attested !== false`: a caller that passes nothing, or a non-boolean, gets today's strict routing. Only an explicit `false`, which each caller derives from `validateAttestation`, relaxes it.
- [x] **No stored question changes meaning.** The three earlier tags stay valid and keep routing (cases 52, 53, 56); no stored file becomes invalid. The parent's decision 15 counted no stored unanswered critical detail question in an unattested classified file; Step 9 repeats that count.
- [x] **Inputs.** Question files stay untrusted and validated as before; nothing new is read from them besides the attestation the module already validates.
- [x] **Path traversal, secrets, command injection, prototype pollution:** no path, secret, shell call or object merge is added.
- [x] **Hook and gate logic:** this is gate logic, approved by the owner's answer to q10. No hook changes.

### Risk mitigations (this slice)

| Risk | Mitigation | Where |
|---|---|---|
| A critique's verdict is settled by its recommendation | The attested branch keeps `critical` routing; case 61 written first and seen green before and after | Step 8, case 61 |
| A caller misses the new argument and routes differently from the gate | Fail-closed default; all three callers change in this slice; case 4c compares audit and gate | Step 10 |
| Another plan edits `streaming-precompute.js` or `streaming-gate.js` first (the six slices of "Small changes take a small path" and slice 24 of the four-defects plan name `streaming-precompute.js`; the send-back plan's slices name `streaming-gate.js`) | Step 9 re-reads every quoted line and stops for a re-plan when one moved or changed | Step 9 |
| A test elsewhere relied on "critical alone blocks in a classification" | Searched in this pass (multiline `critical: true[^}]{0,300}topic: ['"]detail` and its reverse over `tests/`: 6 matches in 2 files, each read: unclassified, attested, a one-argument call, or the gate critic's adapter, none flips); the full suite at Step 10 is the real check, and a failing test outside `files:` is reported through `src/lib/scope-growth.js`, never edited | Steps 9 and 10 |

## Decisions Taken Under Ambiguity — technical planning

1. **The fail-closed default.** `isBlockingQuestion` relaxes `critical` only on an explicit `attested === false`. Evidence: the module's own rule that the absence of a declaration is not a declaration of unimportance (header of `isBlockingQuestion`, lines 901–904). It also keeps existing case 17 green as written, so the parent's decision 14 is met by keeping that case as the strict-default case, with sibling cases 51 and 61 for the classification and the critique.
2. **One constant, not two.** `HIGH_STAKES_TOPICS` simply holds eight values; its comment says which five the agents write and which three are earlier tags. No caller needs to tell them apart, so a second constant would be dead code.
3. **The three callers change in one slice.** Splitting them would let the gate, the screen and the audit disagree in a build between slices, the drift `goesToHuman`'s own comment exists to prevent.
4. **The end-to-end cases live in `tests/question-blocking-default.test.js`**, the file that already owns this rule, so this slice carries its own route-level proof instead of borrowing slice 2's file. Its plan body copies the shape of `functionalBody` in `tests/plans-keep-moving-without-the-human.test.js`.
5. **The audit takes its attestation from the raw file through `validateAttestation`**, the one validation authority the writer's comment names (lines 600–606), never from a field of its own.
6. **Scenario 4 and scenario 10 are today's behaviour.** Their cases are guards: green before and after, written first so a regression shows. Scenario 6 and 7 are likewise today's behaviour for those two topics.
7. **No other reader of the rule goes stale; searched in this pass.**
   - Code: `HIGH_STAKES_TOPICS|isBlockingQuestion|goesToHuman|QUESTION_TOPICS` over `src/` matches only the three files this slice edits. `q\.critical|question\.critical|\.critical === true|o\.critical` over `src/` adds `src/lib/streaming-flow.js` line 82, which reads `critical` only to label a question's tier for ordering, and `src/lib/streaming-topics.js` line 112, a type check; neither routes, so neither changes.
   - Tags: `security-posture|data-model|technology-stack` over the repository outside `plans/`, `node_modules/`, `.claude/`, `.ctoc/streaming/` and `tests/compaction-eval/` matches 20 files: this slice's module, the two agents slice 3 edits, 15 test files that use the tags as fixtures and keep routing, and two skills read and found unrelated (`skills/documentation/documentation-updater/SKILL.md` line 70 names "data-model change" as an architecture-record trigger; `skills/frameworks/data/scylladb.md` lines 73 and 217 are about database modelling).
   - Prose that tells a session a critical question reaches the owner: `critical[^\n]{0,120}(human|owner|reach)` and its reverse over `src/commands/start.md` (0 matches), `docs/` (2: `docs/ENFORCEMENT.md` line 216, rewritten here, and `docs/CRITICAL_CONTROL_POINTS.md` line 96, unrelated), `skills/agent-fragments/` (0) and `agents/coordinator/` (2: `cto-chief.md` line 174 on the critique fleet, which still routes criticals, and `ivv-chief.md` line 59 on its own findings, unrelated); `.ctoc/ask-me-questions.md` uses "criticality-ordered" for ordering only. `src/commands/start.md` line 389 ("every weighty choice the author left unasked") stays true, as the parent's Out of Scope says.
8. **A critique output that drops its ruling and its attestation is a stated residual for its finding-band questions, not a stricter reading** (a detail inside the owner's answer to q10, whose plan keeps today's routing for a critique he asks for). Evidence, in the Security review: a per-ref "critique launched" reading from the task registry fails open on a malformed registry and carries no revision, and fixing that needs `src/lib/task-registry.js`; the four-defects plan "Only a critique the menu launched can move a plan" is not built and provides no per-ref record. The precondition is the gate critic breaking its own rule 10. Case 63 pins the residual, so a later fix shows up as a deliberate flip.
9. **The residual is narrowed inside this slice's own file, toward failing closed, by routing and never by refusal.** In `isBlockingQuestion`, a `critical` question whose id topic is one only a synthesis writes reaches the owner whatever the file's attestation (`isSynthesisOnlyId`, Implementation Details item 2); `reservedIdErrors` and its two callers stay as today (item 5).
   - Why not a refusal (critic round 3): a classification reads the plan under the trust-boundary and read-scope rules (`agents/iron-loop/gate-critic.md` line 103), so it must write a critical `injection-attempt-in-plan` question (rule 4, lines 67–71; line 498) and can fire `read-scope-violation` (lines 175 and 495) or `read-redirection` (line 177). A refused file leaves the author's unclassified file live, `nextUnansweredQuestion` returns nothing for it (`src/lib/streaming-gate.js` line 476), and the steering notice never reaches the owner.
   - The pattern is pinned to the exact topics the band rule mints (line 171: `lens-unavailable-` for premortem, devils-advocate or red-team, never the advocate; `injection-attempt-in-plan` and `injection-attempt-in-lens-payload`; `read-scope-violation`, `ancestry-incomplete`, `read-redirection`) and the reserved roles of line 179 (`lens-findings-contradict`, `no-critique-available`, `plan-unreadable`, `plan-not-gate-ready`), each verified against those lines. An open-ended `injection-attempt-…` would route a classifier's own finding-band topic such as `q10-injection-attempt-handling`.
   - It matches the topic words, never the number, because authors use `q01`–`q04` (the send-back plan's first four questions).
   - Routing impact on stored files is nil: one stored file holds such an id, `review__00004-r2b-actions-drain-and-shipgate.md.json`, and it has no classification block, so all its questions reach the owner already.
   - It only tightens against the rest of this slice: such a question keeps today's routing. The residual left is the finding-band critical questions alone (Security review).

## Execution Plan

### Step 8: TEST
- [ ] Add cases 51–63 to `tests/question-blocking-default.test.js` and case 4c to `tests/sufficiency-audit.test.js`.
- [ ] Run `node --test tests/question-blocking-default.test.js tests/sufficiency-audit.test.js` and record per case: 51, 52, 53, 54, 59, 60, 62, 63 (its first half, and its third half because `q10-e2e-r<stamp>` and the two critical questions of its last plan block today) and 4c red for the reasons stated in the test plan; 55, 56, 57, 58 and 61 green (guards), and case 63's second half green; every existing case still green.

### Step 9: PREPARE
- [ ] Re-read `src/lib/streaming-precompute.js`, `src/lib/streaming-gate.js`, `src/lib/sufficiency-audit.js` and `docs/ENFORCEMENT.md`; confirm every old line quoted above is present exactly once, matching `docs/ENFORCEMENT.md` with every whitespace run collapsed to one space because it is hard-wrapped. A moved or changed line stops the build for a re-plan.
- [ ] Repeat the parent's decision 15 count, read-only, with a probe in the session's scratch folder that is never committed: over `.ctoc/streaming/questions/*.json`, count unanswered questions with `critical: true` and topic `detail` in a classified file without a valid attestation, leaving out ids whose topic is one only a synthesis writes (their routing does not change). Record the count and each plan name in the build record and in the release sentence of Step 15, and continue.

### Step 10: IMPLEMENT
- [ ] `src/lib/streaming-precompute.js`: the topic lists and their comment; `SYNTHESIS_ONLY_TOPIC` and `isSynthesisOnlyId` beside `isTopiclessId`; `isBlockingQuestion(question, attested)`; `goesToHuman(question, classified, attested)`; the attested argument in `hasEnoughInformation`; the doc comments. `reservedIdErrors` and its two callers are not touched.
- [ ] `tests/question-blocking-default.test.js`: the header comment's paragraph "ONLY WEIGHTY QUESTIONS REACH THE HUMAN" (lines 25–32) states the new conditions: condition (2) becomes `critical === true` unless the caller says the file carries no valid attestation (`attested !== false`), and condition (3) names the eight high-stakes topics (the five the owner's four kinds name and the three earlier tags) instead of "the six high-stakes topics"; it adds that cases 51–63 pin the owner's rule of 2026-10-22.
- [ ] `src/lib/streaming-gate.js`: the attested argument in `nextUnansweredQuestion` and its comment.
- [ ] `src/lib/sufficiency-audit.js`: the import and the attested argument in `auditQuestions`.
- [ ] `docs/ENFORCEMENT.md`: the paragraph "Which questions reach the human".
- [ ] Run the two test files: every case green. Run `node --test tests/*.test.js` and root-cause any new failure in the product code; a failing test outside `files:` goes through `src/lib/scope-growth.js`.

### Step 11: REVIEW
- [ ] The critic reads the three callers side by side and confirms each passes the attestation of the same file whose classification it passes, and that no caller can pass `false` without `validateAttestation` returning it.
- [ ] The critic confirms case 61 asserts that no "Send back" text is written into a plan as a decision taken by default.

### Step 12: OPTIMIZE
- [ ] No new read of any file: each caller reuses the status or parsed object it already holds.

### Step 13: SECURE
- [ ] The security scanner attacks the narrowed rule: a ruling without an attestation; a non-boolean `attested`; a stored file under an earlier tag; a file that keeps its ruling and forges or corrupts its attestation. Each must still reach the owner or be refused. A critical structural-band or reserved-role question in a classified unattested file must reach the owner, and the file must not be refused; the scanner also tries ids that only resemble those topics (another lens name, a prefix or suffix variant, a bare id with no revision suffix) and confirms only the exact topics route. A file that drops both its ruling and its attestation and keeps only finding-band questions is the stated residual pinned by case 63; the scanner confirms no other way to reach that outcome.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, type check, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.

### Step 15: DOCUMENT
- [ ] `docs/ENFORCEMENT.md` and the JSDoc of the three functions are the documentation. The build record lists the Step 9 count.
- [ ] The build record carries the release description's sentence, for the release that ships this slice: "In a question file the gate critic classified, a critical question no longer reaches the owner on its own account. Only four kinds do: a technology-stack choice, an algorithm choice, a cost or risk only he can accept, and a hook or gate change; a question no evidence settles, and every verdict of a critique he asked for, still reach him as before." It is followed by the Step 9 count, in the form "In this repository <n> stored unanswered questions changed routing: <plan names>." (or "none" when the count is 0).

### Step 16: FINAL-REVIEW
- [ ] Every scenario in the mapping above is checked against its passing case, and the critic confirms the routing in a classification and in a critique matches the parent's In Scope item 1 line by line.
