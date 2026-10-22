---
title: "Every question settled without the owner is written into the plan with its evidence, proven on the questions he called details"
type: implementation
parent_plan: the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions
depends_on: the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions-s1-what-reaches-the-owner
created: 2026-10-22
priority: HIGH
files:
  # The decision line and its evidence: oneLine, sufficiencyFor's defaults, appendDefaultDecisions.
  - src/lib/streaming-gate.js
  # The golden cases end to end, the evidence cases, and the hook-or-gate case's decision lines.
  - tests/plans-keep-moving-without-the-human.test.js
  # NEW: the twenty questions the owner called details whose answered version is on disk, copied word for word.
  - tests/fixtures/questions-the-owner-called-details.json
  # Its paragraph "Which questions reach the human": the sentence on the decision line.
  - docs/ENFORCEMENT.md
---

# Every question settled without the owner is written into the plan with its evidence, proven on the questions he called details

**Scope (one line):** the line the menu writes under `## Decisions Taken Under Ambiguity` for each question it settles by its recommended option names that option's evidence, and the questions the owner called details move a plan on without him.

Parent: `plans/implementation/the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions.md`, In Scope items 6 and 7. Scenarios carried: 1, 3, 9 (the decision-line half). Depends on slice 1: the golden cases need its routing, and both slices edit `src/lib/streaming-gate.js`.

## Implementation Details

### Protected-list status

`src/lib/streaming-gate.js` is on CTOC's protected list (`src/lib/protected-paths.js` line 65). As slice 1 records, the list's human-kind coverage check runs only from edit hooks Claude Code does not load, the crossing on recorded evidence checks no protected list, and the list's one live effect is the hotfix route's refusal (`src/lib/hotfix-check.js` line 1497). The owner approved this gate-logic change by his answer to the parent's q10 (`.ctoc/streaming/answers.jsonl` line 294).

### Dependency graph

```
menu-screens.continueAfterCrossing --> streaming-gate.pendingGateDecisions (opts.crossed)
    --> sufficiencyFor(root, ref)  builds defaults { id, prompt, choice, evidence }
    --> crossBySufficiency --> appendDefaultDecisions(newPath, defaults)  writes the lines
tests/plans-keep-moving-without-the-human.test.js --reads--> tests/fixtures/questions-the-owner-called-details.json
    --drives--> continueAfterCrossing, the stream answer route, streamingGateScreen
```
No new module and no new import.

### File: `src/lib/streaming-gate.js` (protected list: yes)
**Action:** MODIFY. **Change type:** modify-existing.

1. **`oneLine(value, max = 200)`** (lines 676–680): the cap becomes a parameter with today's value as its default.
   ```js
   /** One line of untrusted text for a plan file or a status: whitespace runs to one space,
    *  control characters stripped, capped at `max` characters (200 unless said). */
   function oneLine(value, max = 200) {
     return stripCtl(String(value == null ? '' : value).replace(/\s+/g, ' ')).trim().slice(0, max);
   }
   /** The longest evidence text a decision line carries. */
   const EVIDENCE_CAP = 400;
   ```
   Every existing caller passes one argument and is unchanged.
2. **`sufficiencyFor` defaults** (lines 649–654): each default gains `evidence`, the recommended option's `description`, else its `pros`, through `oneLine(…, EVIDENCE_CAP)`; the empty string when neither holds text.
   ```js
   .map((q) => {
     const chosen = q.options.find((o) => o && o.recommended === true) || q.options[0];
     const evidence = oneLine(chosen && chosen.description, EVIDENCE_CAP) || oneLine(chosen && chosen.pros, EVIDENCE_CAP);
     return { id: oneLine(q.id), prompt: oneLine(q.prompt), choice: oneLine(chosen && chosen.label), evidence };
   });
   ```
   Doc comment (lines 616–621 and the `@returns` at 626): "`defaults` … each `{ id, prompt, choice, evidence }`, `evidence` the chosen option's `description`, else its `pros`, single-line, control-stripped and capped at 400 characters, or `''` when neither holds text". The `closed()` result keeps `defaults: []`.
3. **`appendDefaultDecisions`** (lines 682–708): the line keeps today's start and adds its evidence.
   ```js
   const lines = defaults
     .map((d) => `- ${d.prompt} — ${d.choice} (question ${d.id}) — ${d.evidence ? `evidence: ${d.evidence}` : 'no evidence was stated'}`)
     .filter((line, i, all) => all.indexOf(line) === i && !text.includes(line));
   ```
   The doc comment's line shape becomes "`- <prompt> — <choice> (question <id>) — evidence: <evidence>`, or `… — no evidence was stated` when the option states none". The heading, the sentence under it and the skip of a line already in the file are unchanged. The `@param` names the `evidence` field.

Error handling: unchanged. `oneLine` never throws; `appendDefaultDecisions` still returns 0 on a write failure and the caller still records `decisionsNotRecorded`.

Example: a recommended option `{ label: 'Refuse: the fingerprint cannot be taken', description: "Rests on the approval module's fail-closed rule (src/lib/approval-ledger.js lines 257-261)" }` on question `q12-unclosed` with prompt `What happens to an unclosed code block?` gives
`- What happens to an unclosed code block? — Refuse: the fingerprint cannot be taken (question q12-unclosed) — evidence: Rests on the approval module's fail-closed rule (src/lib/approval-ledger.js lines 257-261)`.

### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY, one sentence of the paragraph "Which questions reach the human" as slice 1 leaves it.
- old: `Every other open question is decided by its recommended option and written under the plan's `## Decisions Taken Under Ambiguity` when the plan moves on.`
- new: `Every other open question is decided by its recommended option and written under the plan's `## Decisions Taken Under Ambiguity` when the plan moves on, one line per question naming its prompt, the option and the option's evidence (its description, else its pros, on one line, at most 400 characters), or saying that no evidence was stated (`streaming-gate.appendDefaultDecisions`). That evidence is the option's stated reason as its author wrote it; the menu copies it and does not verify it.`
- Matching: slice 1 leaves the paragraph hard-wrapped, so the old sentence is found with every whitespace run collapsed to one space, in the file and in the quote, and the new text is wrapped like its neighbours.

### File: `tests/fixtures/questions-the-owner-called-details.json`
**Action:** CREATE. **Purpose:** the questions the gate critic sent to the owner that he called details and answered with the recommended option, copied so no test reads the live `.ctoc/streaming/` files (parent decision 13). It is not a counted file kind (`src/lib/documented-counts.js` lines 74–86 count `tests/*.test.js`, never `tests/fixtures/`), so `CLAUDE.md` is not declared.

Shape:
```json
{
  "about": "<one sentence: what the file holds and that no test reads the live question files>",
  "groups": [
    {
      "name": "<group name>",
      "source": "<stage>/<plan file>.md",
      "questions": [
        {
          "original_topic": "<the topic the stored file carries>",
          "answers_log_line": <line number in .ctoc/streaming/answers.jsonl>,
          "answered_key": "1",
          "answered_digest": "<that line's questionDigest>",
          "why_detail": "<the rule 4a clause that makes it a detail>",
          "question": { "id", "prompt", "critical", "important", "topic": "detail", "options": [ ... ] }
        }
      ]
    }
  ]
}
```
`question` is the stored question object copied byte for byte except `topic`, which becomes `detail`. `questionDigest` covers the prompt, the key-to-label pairs and the recommended keys, not the topic or the flags, so `answered_digest` proves the copy is the question he answered.

**The groups, in this order.** Source files are under `.ctoc/streaming/questions/`, named `<stage>__<plan file>.md.json`. The answer lines were read in `.ctoc/streaming/answers.jsonl` in this planning pass.

*The thirteen of 2026-10-21* (parent scenario 1):
1. Group "the send-back functional plan", source `functional/a-finished-plan-can-be-sent-back-for-a-text-only-revision.md`:
   - `q01-who-may-send-a-finished-plan-back` (security-posture, critical), line 268. Why: a choice of how to build the plan's hook or gate change (who may run the send-back); the plan's one hook-or-gate question names that change with the choices settled inside it.
   - `q02-how-text-only-is-enforced` (security-posture, critical), line 270. Why: how the plan's new gate check is built is a choice inside its hook or gate change.
   - `q03-fresh-check-for-a-revised-plan` (security-posture, critical), line 272. Why: inside the hook or gate change; its recommended option runs the full check again and weakens no protection, so it is not a risk.
   - `q04-who-finishes-a-revised-plan` (security-posture, critical), line 274. Why: a fork inside the change the plan's one hook-or-gate question names (the menu finishing one new kind of plan on recorded evidence).
   - `q10-send-back-record-shell-refusal-r1792578309776` (security-posture, critical), line 276. Why: a refusal inside the plan's hook change; the one hook-or-gate question names it.
   - `q11-keep-copy-of-deleted-approval-r1792578309776` (irreversible, critical), line 278. Why: the recommended option avoids the loss by keeping a copy, so by the risk test it is a detail.
   - `q12-where-send-back-record-lives-r1792578309776` (security-posture, important), line 280. Why: where a record lives is a choice of how to build the change.
2. Group "the code-block functional plan", source `functional/a-heading-inside-a-code-block-does-not-end-the-approved-section.md`:
   - `q10-moved-approval-fingerprints` (data-model, critical), line 282. Why: the recommended option rewrites no record and loses nothing, so it is not a risk; how the fingerprint change is built is inside the plan's gate change.
   - `q11-what-counts-as-a-code-fence` (algorithm, important), line 284. Why: where a code block begins and ends is parsing, settled by the CommonMark fence rule and three searches over `plans/`; not an algorithm.
   - `q12-unclosed-code-fence` (security-posture, important), line 286. Why: fail-closed or fail-open handling is a detail; the module's fail-closed rule settles it.
   - `q13-how-left-out-headings-match` (algorithm, important), line 288. Why: where a section begins is parsing; two searches with zero hits settle it.
   - `q14-level-one-line-ends-left-out-section-r1792577057391` (algorithm, important), line 290. Why: a boundary inside a method already chosen, settled by the fail-closed rule.
   - `q15-indented-heading-starts-left-out-section-r1792577057391` (algorithm, important), line 292. Why: a boundary inside a method already chosen.

*Seven of the nine of 2026-10-22* (the brief's further cases; each answered with key 1). The other two are not copied, and no group holds them:
- `q10-protected-file-authority-r1792657658169` (answers log line 296) and `q11-list-marker-code-fence-r1792657658169` (line 306), both on the code-block corrected-reading slice (`implementation/a-heading-inside-a-code-block-does-not-end-the-approved-section-s2-the-corrected-reading-and-its-stamp.md`). Both lines read in this pass.
- No answered version of either exists anywhere. Their live source file now holds an empty list, written after that slice was corrected (`"questions": []`, read in this pass), and the CTO Chief's `git log` on that file found no commit holding it; only 5 files under `.ctoc/streaming/questions` are tracked.
- So they are left out of the fixture and out of D1's digest check, and are never re-typed: a re-typed copy proves nothing about what the owner answered. Their answers log lines are the record of his answers: key 1 on each.

3. Group "the send-back command slice", source `implementation/a-finished-plan-can-be-sent-back-for-a-text-only-revision-s2-the-send-back-command.md`:
   - `q10-background-agent-send-back-window-r1792659873661` (security-posture, important), line 302. Why: the order of two slices is technical; the recommended option adds an edge and weakens nothing.
   - `q11-send-back-record-shape-r1792659873661` (data-model, important), line 310. Why: a record's shape is a choice of how to build the parent's change, and the recommended option loses nothing.
   - Not copied: `q12-declared-pattern-expansion-r1792659873661`, which has no answer in the log (searched in this pass: lines 294–312 hold every 2026-10-22 answer and none names it).
4. Group "the text-only check slice", source `implementation/a-finished-plan-can-be-sent-back-for-a-text-only-revision-s3-the-text-only-check.md`:
   - `q10-missing-send-back-record-r1792659774099` (security-posture, critical), line 304. Why: fail-closed handling is a detail. It is the one `critical: true` question of the seven in a file with no attestation, so it is the case slice 1's change turns.
   - `q11-protected-list-entry-r1792659774099` (security-posture, important), line 308. Why: the entry only tightens a protection inside the parent's gate change; a slice raises no second hook-or-gate question for a change its parent describes.
5. Group "the checks-run-again slice", source `implementation/a-finished-plan-can-be-sent-back-for-a-text-only-revision-s5-the-checks-run-again.md`:
   - `q10-who-may-start-the-rerun-r1792659776146` (security-posture, important), line 300. Why: who may run a route inside the parent's gate change; the parent's answered question already carried it.
6. Group "the finishes-again slice", source `implementation/a-finished-plan-can-be-sent-back-for-a-text-only-revision-s6-it-finishes-again.md`:
   - `q10-revised-plan-second-admission-r1792659749886` (security-posture, important), line 298. Why: it re-asks the hook or gate change its parent plan describes and the owner answered there.
7. Group "this plan's functional questions", source `functional/the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions.md`:
   - `q11-question-topic-vocabulary-r1792654332161` (data-model, important), line 312. Why: which tags the validator accepts is a choice of how to build this plan's gate change, which its q10 carried. (q10 itself, line 294, is that plan's one real hook-or-gate question and is not copied.)

Counts the fixture holds: 20 questions in 7 groups; 13 in groups 1 and 2, 7 of them `critical: true`; 7 in groups 3 to 7, 1 of them `critical: true`.

### Test Plan

Framework `node:test` and `node:assert/strict`. No new test file. New `describe('questions the owner called details, and the evidence a settled question carries')` at the end of `tests/plans-keep-moving-without-the-human.test.js`, using that file's `makeSandbox`, `writePlan`, `functionalBody`, `writeQuestions`, `digestOf`, `route` and `menuScreens`. Helpers in the block:
- `FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'questions-the-owner-called-details.json'), 'utf8'))`.
- `expectLine(q, evidence)`: the line built independently of the module: `oneLineT = (s, max = 200) => String(s ?? '').replace(/\s+/g, ' ').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, max)`, then `` `- ${oneLineT(q.prompt)} — ${oneLineT(rec.label)} (question ${q.id}) — ${evidence ? `evidence: ${evidence}` : 'no evidence was stated'}` ``.
- `decisionsOf(text)`: the lines starting `- ` after `## Decisions Taken Under Ambiguity`.

Cases (scenario in brackets):
1. **D1. The fixture is the questions the owner answered, and holds no home-folder path** [1]. 7 groups; 20 questions; no entry's `question.id` is `q10-protected-file-authority-r1792657658169` or `q11-list-marker-code-fence-r1792657658169`; groups 1 and 2 hold 13, 7 critical; every `question.topic` is `detail`; every `original_topic` is one of the eight non-detail topics; for every entry `precompute.questionDigest(entry.question) === entry.answered_digest` and the recommended option's key equals `answered_key`; `precompute.validatePlanQuestions(group.questions.map((e) => e.question)).valid` for every group; the raw file text does not match `/\/Users\/|\/home\//`. Red today: the file does not exist.
2. **D2. Each group of details moves its plan on without the owner, and every one is written down** [1]. For each group: a functional plan `golden-<n>.md`; `writeQuestions(root, ref, questions)` classified, no attestation; `menuScreens.continueAfterCrossing(root)`. Then: the plan is in `implementation/`; its ledger entry is `advanced_by: 'sufficiency'` with no `approved_by`; `decisionsOf(text)` has exactly as many lines as the group has questions, and for each question the line equals `expectLine(q, oneLineT(rec.description, 400) || oneLineT(rec.pros, 400))`. Summed over groups 1 and 2: 13 lines. Red today: groups with a critical question stay in `functional/` (the routing is slice 1's, built before this slice; the line format is this slice's, so with slice 1 built the case is red on the line).
3. **D3. A settled question's line names its evidence, or says none was stated** [3]. Classified detail `q12-unclosed` (one recommended option with the description of the example above) and detail `q13-name` ('What is the export button called?', recommended option `{ label: 'Export' }` with no description and no pros). After the continuation: the two lines equal `expectLine(q12, "Rests on the approval module's fail-closed rule (src/lib/approval-ledger.js lines 257-261)")` and `expectLine(q13, '')`, the latter ending `— no evidence was stated`. Red today.
4. **D4. With no description, the pros are the evidence** [3]. A recommended option with `pros: 'Matches the existing route names.'` and no description: its line ends `— evidence: Matches the existing route names.` Red today.
5. **D5. Evidence is one line, stripped and capped at 400 characters** [3]. A description of `'First line\nsecond\tline\u0007 '` followed by 500 `x`: the written line contains `evidence: First line second line x`, contains no control character, and the evidence part is exactly 400 characters. Red today.
6. **D6. The owner answers the hook or gate change, and the three choices inside it are written with their evidence** [9]. The file of slice 1's case 60 (three details with descriptions, then `q13-change`, `hook-or-gate`). Answer `q13-change` with key 1 through `route(['stream', 'answer', ref, 'q13-change', '1', digestOf(q13)], root)`. The plan is in `implementation/`; `decisionsOf` has three lines, one per detail, each with `— evidence: `; none names `q13-change`. Red today.

Existing assertions that must stay green: case 1's `- What is the button called? — Short name (question q10-name)` and `- Which colour? — Blue (question q11-color)` are unanchored patterns, so the added `— no evidence was stated` keeps them matching; its residency check stays accepted because the section is outside the approval hash.

### Acceptance criteria mapping (this slice)

| Scenario | Implemented in | Test |
|---|---|---|
| 1 | slice 1's routing; this slice's line | D1, D2 |
| 3 | `sufficiencyFor` evidence; `appendDefaultDecisions` line | D3, D4, D5 |
| 9 (the decision-line half) | the same | D6 |

### Wiring — the live call sites

No new module or export. `sufficiencyFor` is called once per plan by `pendingGateDecisions` (`src/lib/streaming-gate.js` line 1132), and `appendDefaultDecisions` by the same function right after a crossing (line 1150). Both run on the continuation's pass, which `menu-screens.continueAfterCrossing` drives on the session's three live paths (`menu task complete --continue`, `stream approve`, `stream answer`) from `/ctoc:start`. The fixture is read only by its test. Cases D2, D3 and D6 drive the continuation and the `stream answer` route.

### Security review

- [x] **Untrusted evidence text written into a plan.** `description` and `pros` are agent-written. `oneLine` collapses every whitespace run, newlines included, to one space and strips control characters, so the evidence cannot start a line: it cannot open a heading, a code fence, a frontmatter line or a new list item, and it lands inside the `## Decisions Taken Under Ambiguity` section, which the approval hash leaves out (`approval-ledger.EXECUTION_SECTION_PRODUCERS`), so the crossing record stays valid (case 1's residency assertion). Capped at 400 characters (D5).
- [x] **Pre-existing, not introduced, listed for the owner:** a question's `prompt` already starts its decision line; a prompt that begins with three backticks makes the line a list-item fence opener under the fence rule the owner chose for the approval fingerprint (answer to `q11-list-marker-code-fence`). This slice does not change where the prompt sits.
- [x] **The fixture holds no secret and no home-folder path** (D1 asserts the latter); its texts are question texts already stored in this repository.
- [x] **Path traversal, command injection, prototype pollution:** no path, shell call or object merge added.
- [x] **Hook and gate logic:** the decision line is written by gate logic, approved by the owner's answer to q10.

### Risk mitigations (this slice)

| Risk | Mitigation | Where |
|---|---|---|
| The fixture drifts from what the owner answered | `answered_digest` from the answers log; D1 recomputes every digest | Step 8 |
| A live question file has changed or gone by build time | Step 8 copies each of the twenty from its live file, or from the commit that held the answered version (`git log -- <file>`), and D1's digest check proves the copy. The two group-3 questions whose answered version is gone are named in this plan and never copied (decision 7). When neither the live file nor any commit holds one of the twenty's answered digest, the build stops and kicks back for a re-plan naming the question, because a re-typed copy never meets D1 | Step 8 |
| The longer line breaks a reader of the decisions section | Searched in this pass over `src/`: the pattern `\(question \$\{` matches only the writer, `src/lib/streaming-gate.js` line 697; the pattern `\\\(question\|Decided by the recommended option` matches only that writer's own sentence (line 701), so no code parses the line. The tests that read it match unanchored patterns (case 1) | Step 9 re-reads |
| Another plan edits `streaming-gate.js` first | Step 9 re-reads every quoted line; a moved or changed line stops the build | Step 9 |

## Decisions Taken Under Ambiguity — technical planning

1. **The evidence cap is 400 characters.** The parent's decision 12 leaves the cap to technical planning. The real descriptions run from about 90 to over 900 characters, and the file and line they rest on sit anywhere in them; 200, the cap of the line's other parts, would cut most of them before their first citation. 400 keeps a line readable.
2. **The thirteen are two plans, one per source file.** The two stored files reuse ids `q10`, `q11` and `q12`, and a questions file refuses a repeated id (`validatePlanQuestions`), so one plan cannot hold all thirteen with their ids unchanged, which scenario 1 requires. D2 counts 13 lines over the two.
3. **Seven of the nine of 2026-10-22 are added as five further groups**, as the brief asked; the other two are decision 7's. `q12-declared-pattern-expansion` is left out: the owner has not answered it.
4. **Every group crosses from functional planning in the test.** The routing reads no stage (`goesToHuman(question, classified, attested)`), and the decision lines are written by every pre-build crossing alike.
5. **A line already in the plan is still skipped by its full text**, as today. A plan's questions are re-read under a new ref at each stage, so an old-format line for the same question id does not recur; matching by `(question <id>)` alone would skip a real decision whenever prose in the plan quotes that marker.
6. **`why_detail` records the rule 4a clause in plain words** for each question; slice 3 writes those clauses into the gate critic, and its final review runs the real gate critic on the same questions (parent scenario 2).
7. **The fixture holds the twenty questions whose answered version is on disk; two of the nine of 2026-10-22 are named here instead.** `q10-protected-file-authority-r1792657658169` and `q11-list-marker-code-fence-r1792657658169`, on the code-block corrected-reading slice, were answered with key 1 (`.ctoc/streaming/answers.jsonl` lines 296 and 306), but their live source now holds an empty list after that slice was corrected, and no commit holds that file (the CTO Chief's `git log`; only 5 files under `.ctoc/streaming/questions` are tracked). No answered version of either exists, so they are left out of the fixture and of D1's digest check, and are never re-typed: a re-typed copy cannot prove it is what the owner answered.

## Execution Plan

### Step 8: TEST
- [ ] First, before any test edit: confirm slice 1 is built (`precompute.isBlockingQuestion` takes the attested argument and `risk` is a valid topic). If it is not, stop and kick back.
- [ ] For each of the twenty questions in groups 1 to 7, compare the live source file's question with its answered digest (`precompute.questionDigest`). For each source whose question no longer matches, take the version from the commit that held it (`git log -- <file>`). When neither the live file nor any commit holds the answered digest (most question files are untracked), stop and kick back for a re-plan naming that question: a re-typed copy never meets D1. The two group-3 questions of decision 7 are not searched for and not copied.
- [ ] Add cases D1–D6 to `tests/plans-keep-moving-without-the-human.test.js`. Run the file and record D1 to D6 red: the fixture file does not exist yet.
- [ ] Write `tests/fixtures/questions-the-owner-called-details.json` as specified, copying each `question` object from the source chosen above and each digest from its answers-log line.
- [ ] Run the file again and record: D1 green (it checks the fixture against the owner's recorded digests); D2–D6 red on the decision-line format; every existing case green.

### Step 9: PREPARE
- [ ] Re-read `src/lib/streaming-gate.js` lines 616–708 and `docs/ENFORCEMENT.md`'s paragraph; confirm every quoted line is present once, matching `docs/ENFORCEMENT.md` with whitespace runs collapsed. A moved or changed line stops the build for a re-plan.

### Step 10: IMPLEMENT
- [ ] `src/lib/streaming-gate.js`: `oneLine(value, max = 200)` and `EVIDENCE_CAP`; `evidence` in `sufficiencyFor`'s defaults; the new line in `appendDefaultDecisions`; the doc comments.
- [ ] `docs/ENFORCEMENT.md`: the decision-line sentence.
- [ ] Run the test file: every case green. Run `node --test tests/*.test.js` and root-cause any new failure in the product code; a failing test outside `files:` goes through `src/lib/scope-growth.js`.

### Step 11: REVIEW
- [ ] The critic reads one real crossing's output (D2's group 1 plan) as the builder would and confirms each line says what was decided and on what evidence.

### Step 12: OPTIMIZE
- [ ] No second read of the questions: the evidence comes from the same verdict `sufficiencyFor` already holds.

### Step 13: SECURE
- [ ] The security scanner tries to break a plan through the evidence text: newlines, control characters, a heading marker, a code fence, a frontmatter line, a 10,000-character description. Each must land as one capped line inside the decisions section.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, type check, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.

### Step 15: DOCUMENT
- [ ] `docs/ENFORCEMENT.md` and the JSDoc of `sufficiencyFor` and `appendDefaultDecisions` are the documentation. The build record names any source file copied from history.

### Step 16: FINAL-REVIEW
- [ ] The critic checks D2's thirteen lines against the two source files by hand for three questions picked at random, and checks every scenario in the mapping against its passing case.
