---
title: "A revised finished plan cannot finish when its frontmatter or a declared file changed"
type: implementation
parent_plan: a-finished-plan-can-be-sent-back-for-a-text-only-revision
depends_on: a-finished-plan-can-be-sent-back-for-a-text-only-revision-s2-the-send-back-command
created: 2026-10-22
priority: HIGH
files:
  # The review-to-done validation gains the text-only check and the "checks must run again" words.
  - src/lib/plan-validator.js
  # textOnlyCheck, beside the record it reads.
  - src/lib/text-revision.js
  # text-revision.js joins CTOC's protected list: it now decides whether a plan may finish.
  - src/lib/protected-paths.js
  # The one test file this slice creates.
  - tests/a-text-revision-changes-text-only.test.js
  # RATCHET FILES — not planned work: the new test file moves the documented test-file count,
  # which CLAUDE.md (Gate 2 requires the declaration) and README.md state.
  - CLAUDE.md
  - README.md
---

# A revised finished plan cannot finish when its frontmatter or a declared file changed

The text-only-check slice of "A finished plan can be sent back for a text-only revision". It adds the text-only check the owner chose on 2026-10-21 ("How should CTOC make sure a revision of a finished plan changed its text only?" — "Frontmatter and declared files unchanged", `.ctoc/streaming/answers.jsonl` line 270): at the finish, a plan with an open send-back record must still have the frontmatter the send-back left and every declared file byte-identical.

The check is one more failure of the review-to-done validation (`validateReviewToDone`, `src/lib/plan-validator.js` lines 1326-1439). That one result already decides three things (the parent plan, "What the source says today", item 15):
- the plan screen (`src/lib/streaming-gate.js` lines 1708-1714 and 1737);
- the menu's crossing on evidence (line 1159);
- the owner's approve (`approvePlan`, `src/lib/actions.js` lines 448-464).

So all three read the same check, and the owner's approve anyway passes it as a recorded override (`src/lib/menu-screens.js` lines 2209-2216; `src/lib/actions.js` lines 439-441 and 514).

Gate logic: yes. It is the gate change the owner approved in his answers to "How is text only enforced", "What counts as the fresh check" and "Who finishes a revised plan again" (`.ctoc/streaming/answers.jsonl` lines 270, 272 and 274). This slice crosses into the build queue on recorded evidence, on the owner's instruction to the CTO Chief, 2026-10-22 (the parent plan, "Decisions Taken Under Ambiguity — technical planning").

Protected-list status:
- `src/lib/plan-validator.js` and `src/lib/protected-paths.js` are not on the list.
- `src/lib/text-revision.js` is added to the list by this slice. What that does today: `src/lib/protected-paths.js` is required only by `src/lib/plan-coverage.js` line 76, whose human-kind check (lines 613-621) is reached only from the edit hooks Claude Code does not load (`src/hooks/PreToolUse.Bash.js` line 879, `src/hooks/PreToolUse.Edit.js` lines 733 and 775), and by `src/lib/hotfix-check.js` line 276. Its one live effect is that a hotfix touching `text-revision.js` is refused: the hotfix check names an enforcement file's area "enforcement" (`src/lib/hotfix-check.js` line 1497), and the menu reaches that check through `hotfixCheck.hotfixRoute` (`src/lib/menu-screens.js` line 3490; the call path from there to line 1497 was not traced, and Step 9 traces it). The entry claims nothing about the build queue; it only tightens.
- No hook file and no approval record is edited.

## Implementation Details

### Architecture Decision

- **The check lives in `text-revision.js`**, beside the record and the snapshot it compares (the send-back-command slice). The validator only calls it and adds its sentences.
- **The check compares the snapshot the send-back recorded with a snapshot taken now by the same function** (`snapshotOf`), over the declared entries the record lists, never the entries the frontmatter lists now. So an added `files:` entry is caught as a frontmatter change, and the file comparison cannot be widened or narrowed by editing the frontmatter.
- **`text-revision.js` joins the protected list.** From this slice on it decides whether a plan may finish: whether `validateReviewToDone` passes, and in the second-finish slice whether the menu admits a revised plan into done. That is the reason the list gives for `approval-residency.js` and `approval-ledger.js`: "An autonomous edit here forges the very predicate that says whether a write is approved" (`src/lib/protected-paths.js` lines 35-38). Today the entry's only live effect is the hotfix refusal named above; it is a detail that only tightens, and it is in place for the day the list's human-kind rule is enforced by a loaded hook again.

### Dependency Graph

```
validateTransition() (plan-validator.js :1502) --> validateReviewToDone() (:1326)        [MODIFY]
   --> text-revision.textOnlyCheck()                                                  [NEW, exported]
         --> readSendBack(), snapshotOf() (the send-back-command slice)
callers of validateTransition for review → done (unchanged):
   actions.approvePlan (:448)  — stream approve, claude:approve, approveSubplans
   streaming-gate.pendingGateDecisions (:1099; crossing at :1159) — every screen read, the continuation
   streaming-gate.planDecisionScreen (:1710)
   menu-screens.validateScreen (:2141)
protected-paths.PROTECTED_ENFORCEMENT_FILES (:58-67)                                  [MODIFY: + text-revision.js]
   --> read live only by hotfix-check (:276, :1497); plan-coverage (:76, :613-621) runs only from unloaded edit hooks
tests/a-text-revision-changes-text-only.test.js --tests--> all of the above
```

`plan-validator` gains `require('./text-revision')` at load. `text-revision` requires nothing that requires `plan-validator` (the send-back-command slice's load-time edges), so no cycle forms.

### File Specifications

#### File: `src/lib/text-revision.js`
**Action:** MODIFY
**Purpose:** The text-only check at the finish.
**Change Type:** new-function

- **Add** module-private sentences:

```js
const CHECK = 'review→done blocked: ';
const RECORD_UNREADABLE = `${CHECK}the record of this plan's send-back for a text revision cannot be read, so the text-only check cannot run`;
const RECORD_INCOMPLETE = `${CHECK}the record of this plan's send-back for a text revision was never completed, so the text-only check cannot run`;
const FRONTMATTER_CHANGED = `${CHECK}the frontmatter changed since the plan was sent back for a text revision; a change of scope or code is a new plan`;
const CHECK_FAILED = `${CHECK}the text-only check for this plan's send-back for a text revision could not run`;
```

- **Add** `textOnlyCheck(root: string, planPath: string, content: string)` → `{ applies: boolean, compared: boolean, frontmatterChanged: boolean, errors: string[], changed: string[] }`:
  - Everything below runs inside one `try`, starting with `slug = ledger.slugFromPlanPath(planPath)` (`src/lib/approval-ledger.js` line 181, `path.basename(planPath)`), so a `planPath` that is not a string throws there and ends in `CHECK_FAILED` (G11).
  - `compared` is true only when the record is `ok`, `open` and complete and the comparison below ran without throwing; `frontmatterChanged` is true only when that comparison found `FRONTMATTER_CHANGED`. Both are false in every other case. The checks-again slice's `checksMustRunAgain` reads them, so no reader ever matches an error sentence.
  - Uncomparable entries leave `compared` true; the comparison ran.
  - `applies: false`, no errors, when the record is `absent` or `unkeyable`, or `ok` and not `open` (finished again: `finished_again_at` is set). A record whose admission was spent (`admission_used_at`) but which never finished again is still `open`, so the check still applies.
  - `applies: true` and `[RECORD_UNREADABLE]` when it is `corrupt`; `[RECORD_INCOMPLETE]` when `complete !== true` (a send-back that stopped before its snapshot).
  - Otherwise `now = snapshotOf(root, planPath, content, record.declared)`, and:
    - `FRONTMATTER_CHANGED` when `now.frontmatter !== record.frontmatter`;
    - when any path's digest differs (a key in either `files` map missing from the other, or a different value; own keys only; sorted): `${CHECK}changed since the plan was sent back for a text revision: <list>; a change of code is a new plan`, and `changed` is that list;
    - when `now.uncomparable` is not empty: `${CHECK}the text-only check cannot compare <entry (why), …>; only an approval past this check finishes it`.
  - `<list>` strips control characters, caps each item at 200 characters, shows the first ten joined by `, ` and then `and <n> more`.
  - Any throw → `applies: true`, `[CHECK_FAILED]`. Never throws.
  - The header comment gains a paragraph: what the check compares, that it compares over the recorded entries, and the four refusal sentences.
- **Update** `module.exports`: add `textOnlyCheck` (caller: `plan-validator.validateReviewToDone`).

#### File: `src/lib/plan-validator.js`
**Action:** MODIFY
**Purpose:** The review-to-done validation refuses a revision that changed more than text, and says a revised plan's checks must run again.
**Change Type:** modify-existing

- **Import** after line 14: `const { textOnlyCheck } = require('./text-revision');`.
- **Add**, after the step-completeness block (ends line 1390), before the check-record block (line 1392):

```js
  // 1b. A finished plan sent back for a text revision (the owner's answers of 2026-10-21): its
  //     frontmatter and every file its send-back record lists must be as the send-back left them
  //     (text-revision.textOnlyCheck). A plan with no open send-back record is unaffected: its result
  //     and checklist are exactly what they were.
  const revision = textOnlyCheck(projectPath, planPath, content);
  if (revision.applies) {
    result.checklist.textOnly = {
      passed: revision.errors.length === 0, changed: revision.changed,
      compared: revision.compared, frontmatterChanged: revision.frontmatterChanged,
    };
  }
  if (revision.errors.length > 0) {
    result.errors.push(...revision.errors);
    result.valid = false;
  }
  // A revised plan's text changed after its first check record, so the record cannot vouch for it.
  // Keyed on the condition checksMustRunAgain uses (the checks-again slice): only a compared revision
  // whose frontmatter is unchanged is told a fresh check can help.
  const again = revision.compared && !revision.frontmatterChanged
    ? ' — it was sent back for a text revision, so its checks must run again after the change' : '';
```

- The three check-record refusals (lines 1400, 1407, 1423) append `${again}`. A plan with no open send-back record, and a revision whose record is corrupt, pending or not compared, or whose frontmatter changed, gets byte for byte the sentences it gets today.
- The JSDoc of `validateReviewToDone` (lines 1284-1325) gains one paragraph naming the text-only check, its caller-visible `checklist.textOnly`, and the suffix.

#### File: `src/lib/protected-paths.js`
**Action:** MODIFY
**Purpose:** `src/lib/text-revision.js` joins CTOC's protected list. Today that refuses a hotfix touching it (`src/lib/hotfix-check.js` lines 276 and 1497); the list's human-kind coverage rule (`src/lib/plan-coverage.js` lines 613-621) runs only from edit hooks Claude Code does not load, so the entry claims nothing about how a plan reaches the build queue.

- Add `'src/lib/text-revision.js',` to `PROTECTED_ENFORCEMENT_FILES` (lines 58-67), after `'src/lib/streaming-gate.js'`.
- The header's "WHY EACH CLASS IS ON THE LIST" (lines 30-46) gains: "`text-revision.js` — the record of a finished plan's send-back for a text revision and the text-only check at the finish; an autonomous edit here lets a plan finish on a change of scope or code."

#### Files: `CLAUDE.md` and `README.md`
**Action:** MODIFY (count lines only), through the release script's two count functions at Step 15.

### Test Plan

**File:** `tests/a-text-revision-changes-text-only.test.js` (CREATE). **Framework:** `node:test`, `node:assert/strict`, on real temporary projects; the helpers of the send-back-command slice's test file copied (`makeSandbox`, `finishedPlan`, `runMenu`, `sendBack`, `rows`). A revised plan is always made by the real send-back (`route(['claude:reject', 'done/<f>.md', 'review', '--stdin'], root, { answerText })`), never by a hand-written record. A passing check record is written by the real writer, `persistVerifyResult`, on a temporary project whose `package.json` test script exits 0 (the fixture of `tests/ctoc-audit-w05-verify-evidence.test.js` lines 47-50). No timing: the plan file's time is set with `fs.utimesSync` to a fixed earlier instant before `persistVerifyResult` runs, so "recorded after the last change" never depends on clock resolution.

Every case names its first-run result before any source change (red at first, unless marked: `textOnlyCheck` is not exported, and the validator has no text-only leg).
- **G1 scenario: a change of plan text alone passes the text-only check.** Send back; replace one line of the specification prose and one line of the execution record; nothing else. `validateTransition(<review path>, 'review', 'done', root).checklist.textOnly` deep-equals `{ passed: true, changed: [], compared: true, frontmatterChanged: false }`, and no error starts with the text-only sentences.
- **G2 scenario: the send-back's own rewrite is not counted as a change.** A finished plan whose frontmatter is two stacked blocks, the first holding `approved_by: human`, `approved_at` and `gate_crossed`. Send back; edit nothing. `checklist.textOnly.passed === true`.
- **G3 scenario: a changed frontmatter is refused at the finish.** Send back; add one `files:` entry; write a fresh passing check record. Then:
  - `validateTransition` errors include `FRONTMATTER_CHANGED` exactly, and `checklist.textOnly` has `compared: true`, `frontmatterChanged: true`;
  - `route(['stream', 'approve', 'review/<f>.md'], root)` leaves the plan in review, writes no approval record, and its text holds "the frontmatter changed since the plan was sent back for a text revision" and "a change of scope or code is a new plan";
  - one continuation (`route(['menu', 'task', 'complete', <id>, '--continue'], root)` on another finished task, the helper of `tests/plans-keep-moving-without-the-human.test.js` lines 294-302) leaves it in review with no approval record.
- **G4 scenario: a changed declared file is refused at the finish.** Send back; change one byte of `src/lib/example.js`; write a fresh passing check record. Then:
  - one error names `src/lib/example.js` and "changed since the plan was sent back for a text revision"; `checklist.textOnly.changed` is `['src/lib/example.js']`, with `compared: true` and `frontmatterChanged: false`;
  - `route(['plan', 'review/<f>.md'], root)`'s first question offers "Check validation" first and no option labelled `gateWords.approveLabel('review')` ("Yes — it’s finished", `src/lib/gate-words.js` line 56);
  - `stream approve` and one continuation leave it in review with no approval record.
- **G5 scenario: the owner's approve anyway finishes a revision whose declared file changed** (the parts this slice owns; the second-finish slice adds the row's mark and closing the record).
  - G4's state, with a passing check record written after the plan's last change: `route(['validate', 'review/<f>.md'], root).validation.errors` is exactly one error, the one naming `src/lib/example.js`, and its options end with "Approve anyway" whose action is `claude:approve review/<f>.md --override`.
  - `actions.approvePlan(<review path>, root, { override: { reason: 'the change is another plan’s build' } })` moves it to `done/`. Its approval record has `approved_by: 'human'`, `override: true`, that `override_reason`, `hash_scope: 'specification'` and no `backfilled`. `residency.classifyResidency(<done path>, 'done', root).accepted === true`. The transitions log's last row has `override: true`.
- **G6 a deleted declared file, and an absent one that appears, are named.**
- **G7 a pattern entry: a new matching file is named; nothing changed passes.**
- **G8 an entry that cannot be compared is named with why** (`../outside.txt`, "outside the project").
- **G8b a pattern of more than 2,000 files is named at the finish.** 2,001 files under `gen/`, `files:` `gen/**`; send back; write a fresh passing check record. `validateTransition` errors include one that holds exactly "cannot compare gen/** (matches more than 2,000 files)", `checklist.textOnly` deep-equals `{ passed: false, changed: [], compared: true, frontmatterChanged: false }`, and `stream approve` leaves the plan in review.
- **G8c a brace or bracket pattern form is named at the finish, never passed as unchanged.** `files:` `src/lib/{a,b}.js`, with `src/lib/a.js` and `src/lib/b.js` present; send back; change one byte of `src/lib/a.js`; write a fresh passing check record. `checklist.textOnly.passed === false`; `validateTransition` errors include one that holds exactly "cannot compare src/lib/{a,b}.js (a pattern form CTOC does not expand)"; `stream approve` leaves the plan in review. The send-back-command slice's `snapshotOf` makes the entry uncomparable (its F14d), because the `files:` matcher reads `{`, `}`, `[` and `]` as literals (`src/lib/plan-coverage.js` lines 104-128).
- **G9 the record states.**
  - A corrupt record (`{`) gives `applies: true`, `compared: false`, `frontmatterChanged: false` and `RECORD_UNREADABLE`.
  - A pending record (the send-back-command slice's F11 state, then a hand-made `plans/review` copy of the plan) gives `compared: false`, `frontmatterChanged: false` and `RECORD_INCOMPLETE`.
  - A record carrying `finished_again_at` gives `applies: false`.
  - A record carrying `admission_used_at` and no `finished_again_at` (the state the second-finish slice leaves when its crossing stops after spending the admission; written here through `writeSendBack` on top of a real send-back) gives `applies: true`, and a changed frontmatter is still refused: the check holds until the plan has finished again.
  - No record gives `applies: false`, and `validateReviewToDone` on a plain review plan returns the same `errors`, `warnings` and checklist keys as before this slice (green, a pin: the expected values are taken from a run of the unchanged code at Step 8).
- **G10 a revised plan's stale check record says its checks must run again.**
  - The check record is written before the plan's last change: the stale refusal ends with " — it was sent back for a text revision, so its checks must run again after the change".
  - `stream approve`'s status line holds "its checks must run again".
  - The same staleness on a plan never sent back keeps today's sentence, byte for byte (green, a pin).
  - A revised plan whose send-back record is corrupt (`{`), with a check record written before the plan's last change, keeps today's stale sentence byte for byte: no suffix, because the revision was not compared.
- **G11 the check never throws.** `textOnlyCheck(root, undefined, '')` gives `applies: true`, `compared: false` and `CHECK_FAILED`. A folder in the record's pattern that cannot be read gives an error, not a throw.
- **G12 the protected list.** `isProtectedEnforcementPath('src/lib/text-revision.js') === true`, and `src/lib/text-revision-helper.js` stays unprotected.

**Coverage target:** every new line and both arms of every new condition in `textOnlyCheck` and the validator's new leg. The suite floor is `.ctoc/coverage-baseline.json` `minPct`.

### Security Review

| Check | Result |
|---|---|
| Fail direction | Pass. Every state the check cannot read, or the record cannot vouch for, refuses the finish (corrupt, pending, a throw, an entry it cannot compare). Only the owner's approve anyway passes, recorded as an override. |
| What the check cannot see | Stated, not hidden. A file the plan does not declare is not compared: the owner's answer accepted that. A record deleted while the revision is open makes the check not apply; the plan then finishes only on the owner's approve, because the crossing on evidence needs the record (the second-finish slice). |
| Path traversal | Pass. The check reads only through `snapshotOf` (the send-back-command slice's inside-the-project and regular-file rules) and `readSendBack` (the ledger's slug guard). |
| Error messages | Pass. Paths in sentences are the plan's own declared entries, control-stripped and capped; no stack, no absolute path. |
| Gate weakening | None. The leg only adds failures; for a plan with no open send-back record the result is byte for byte what it was (G9, G10). |

## Wiring — the live call sites

- **`textOnlyCheck`** is called by `validateReviewToDone` (`src/lib/plan-validator.js` line 1326), reached through `validateTransition` (line 1502) from:
  - `actions.approvePlan` (`src/lib/actions.js` line 448) — `/ctoc:start` → `stream approve review/<f>.md` (`src/lib/menu-screens.js` line 3403 → `streaming-gate.streamApprove`, line 2368), `claude:approve`, and `approveSubplans`;
  - `streaming-gate.pendingGateDecisions` (`src/lib/streaming-gate.js` line 1099, its validation at line 1121) on every screen read and in the continuation's crossing pass (line 1159);
  - `streaming-gate.planDecisionScreen` (line 1710);
  - `menu-screens.validateScreen` (`src/lib/menu-screens.js` line 2141), behind "Check validation".
- **The protected list** (`src/lib/protected-paths.js`) is required only by `src/lib/plan-coverage.js` line 76 and `src/lib/hotfix-check.js` line 276 (searched: `protected-paths` over `src/`, 2 files, 3 lines, one of them a comment at `hotfix-check.js` line 1461). `plan-coverage`'s use of it (lines 613-621) is reached only through `findCoveringPlan` and `explainDenial`, whose only callers are `src/hooks/PreToolUse.Bash.js` line 879 and `src/hooks/PreToolUse.Edit.js` lines 733 and 775 (searched: `findCoveringPlan\(|explainDenial\(` over `src/`, 3 files, 5 lines), hooks `hooks/hooks.json` does not register. The live reader is the hotfix check (line 1497), from the menu's hotfix route (`src/lib/menu-screens.js` line 3490).
- **The new export** is `textOnlyCheck` (caller: `plan-validator`); the export-reachability fence holds it.

## Decisions Taken Under Ambiguity — technical planning

- **The check compares over the recorded entries, not the current `files:` list.** A `files:` edit is a frontmatter change and is caught there, and the comparison cannot be steered by editing the list. The owner's answer is the frontmatter "as the send-back left it" and "one digest per declared file".
- **`checklist.textOnly` carries `compared` and `frontmatterChanged`.** The checks-again slice offers "Run the checks again" for a plan whose declared file changed but not for one whose frontmatter changed or whose record cannot be compared; `passed: false` alone cannot tell those apart, and matching a module-private error sentence from another module would break on any rewording.
- **`checklist.textOnly` is added only when the check applies.** A plan with no open send-back record keeps its result byte for byte, so no existing reader or test of `validateReviewToDone` sees a new key.
- **The check-record sentences gain a suffix for a revised plan; they are not replaced.** The parent scenario "A check record older than the last change keeps the plan in review" asks the screen to say the check must run again; the suffix says why in the sentence `stream approve` already shows (`src/lib/streaming-gate.js` line 2370), and every other plan's sentence is unchanged. The suffix is keyed on `revision.compared && !revision.frontmatterChanged`, the condition `checksMustRunAgain` uses, so the sentence never says a fresh check can help a revision that no check can finish (a corrupt, pending or uncompared record, or a changed frontmatter; G10's last arm).
- **The owner's approve is held to the check, and his approve anyway passes it.** That is the parent's decision ("Held to text only"), on today's code: the override passes every failure of this one validation at once (`src/lib/actions.js` lines 455-464), and the validation screen lists every failure (`src/lib/menu-screens.js` lines 2151-2155), so he sees them all before he overrides.
- **A revised plan sent further back from review and rebuilt finishes only on the owner's approve past the check.** The second `rejectPlan` changes the frontmatter (`revision`, `rejection_reason`, `src/lib/actions.js` lines 910-914), so the open record's frontmatter no longer matches. Closing the record on that path would put text-revision logic into every send-back. It is rare, and an override with his reason is the honest record of a rebuilt plan.
- **`text-revision.js` joins the protected list in this slice**, the first one in which it decides a crossing. The send-back-command slice created it while it only wrote a record. The entry's one live effect today, by reading, is that a hotfix touching it is refused (`src/lib/hotfix-check.js` lines 276 and 1497; the call path from the menu's hotfix route to line 1497 is traced at Step 9); it does not decide how any slice reaches the build queue, because the list's human-kind rule runs only from edit hooks Claude Code does not load. It only tightens.
- **One screen read with one revision open may add at most 250 ms on this repository.** `pendingGateDecisions` validates every review plan on every screen read and every continuation, so the walk of a revised plan's patterns runs there. 250 ms is the bound for one open revision, measured on this repository both for a pattern under `src/` and for a pattern rooted at the project root. A number over the bound is recorded at Step 12 as a finding for the owner, with the cache the `ponytail:` note names, not built in this slice.

## Execution Plan

### Step 8: TEST
- [ ] Write `tests/a-text-revision-changes-text-only.test.js` exactly as the Test Plan says, before any source change. Take G9's and G10's pinned values from a run of the unchanged code.
- [ ] Run `node --test tests/a-text-revision-changes-text-only.test.js`. Record per case red with its reason, or green where marked (G9's last part, G10's last part). A case green where red is expected does not test the change: fix it first.

### Step 9: PREPARE
- [ ] Re-read every cited line of `src/lib/plan-validator.js`, `src/lib/text-revision.js` (as the send-back-command slice built it), `src/lib/protected-paths.js`, `src/lib/actions.js`, `src/lib/streaming-gate.js` and `src/lib/menu-screens.js`. Where the code differs, follow the code and record the difference.
- [ ] Search `tests/` for assertions on `validateReviewToDone`'s or `validateTransition`'s review → done `errors` and `checklist` (pattern `review→done blocked|validateReviewToDone|checklist\.verifyEvidence`), read each match, and name here any that a revised-plan fixture could reach.
- [ ] Search `src/` for automatic writers of a plan file in `plans/review/` (the pattern the build-queue plan used to list the automatic writers of a plan, `(writeFileSync|appendFileSync|renameSync)\((planPath|newPath|p\.path|plan\.path|filePath|target|file)\b`) and read each match. Name here any writer that edits a review plan's frontmatter or declared files without the owner; one would make this check refuse every revision, and goes to the owner as a finding before Step 10.
- [ ] Trace the menu's hotfix route from `src/lib/menu-screens.js` line 3490 to `src/lib/hotfix-check.js` line 1497 and record here whether a hotfix naming `src/lib/text-revision.js` reaches the area check.
- [ ] Run `node --test tests/ctoc-audit-w05-gate3-review-to-done.test.js tests/plan-validator.test.js tests/plan-validator-coverage.test.js tests/approveplan-validates.test.js tests/plans-keep-moving-without-the-human.test.js tests/autonomous-coverage-over-enforcement-denied.test.js tests/a-finished-plan-is-sent-back-for-a-text-revision.test.js` and record the baseline.

### Step 10: IMPLEMENT
- [ ] `src/lib/text-revision.js`: the sentences, `textOnlyCheck`, the header paragraph, the export.
- [ ] `src/lib/plan-validator.js`: the import, leg 1b, the suffix on the three sentences, the JSDoc.
- [ ] `src/lib/protected-paths.js`: the entry and the header line.
- [ ] Rerun the Step 8 file until green, then the Step 9 baseline. An existing assertion that fails is read before anything changes; the code is wrong until proven otherwise.

### Step 11: REVIEW
- [ ] Dispatch `iron-loop-critic` with these attacks: an edit beyond plan text that passes the check (frontmatter in a second block, CRLF, a declared file swapped for a link, a pattern match appearing outside the walked folder); a state in which the check passes a plan whose record is missing or pending; any plan never sent back whose validation result changed; a refusal sentence that names something other than the plan's own declared entries.

### Step 12: OPTIMIZE
- [ ] Measure, on a temporary copy of this repository, the time of one `pendingGateDecisions(root)` read three ways: with no open revision; with one open revision whose plan declares `src/**`; and with one whose plan declares a pattern rooted at the project root (`**/*.js`). Take the median of five runs each and record all three numbers here. The check costs one record read per review plan when no revision is open.
- [ ] Acceptance bound: one open revision adds at most 250 ms to one read. Over the bound, record the number here as a finding for the owner, with the cache the `ponytail:` note names; do not build the cache in this slice.

### Step 13: SECURE
- [ ] Dispatch `security-scanner` on the diff with the Security Review table. Scope: the fail direction of every record state, the spent-admission state included; no gate weakened for a plan never sent back; the protected-list entry and its one live effect.

### Step 14: VERIFY
- [ ] Run `npm test`: `# fail 0`, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [ ] Run `npx eslint --max-warnings 0 src/lib/plan-validator.js src/lib/text-revision.js src/lib/protected-paths.js tests/a-text-revision-changes-text-only.test.js` and `npm run typecheck`: both clean.
- [ ] Run `node --test tests/export-reachability.test.js tests/reachability.test.js tests/false-green-fence.test.js tests/golden-corpus-fence.test.js tests/autonomous-coverage-over-enforcement-denied.test.js`: all green, no baseline changed.

### Step 15: DOCUMENT
- [ ] The JSDoc and header paragraphs as specified.
- [ ] Update the count lines with `node -e "const r=require('./src/scripts/release.js');console.log(JSON.stringify([r.updateDocCountsInClaudeMd(process.cwd()),r.updateDocCountsInReadme(process.cwd())]))"`. Read the diff of `CLAUDE.md` and `README.md`: only count lines differ, and `CLAUDE.md` stays at or under 15,000 bytes.

### Step 16: FINAL-REVIEW
- [ ] Dispatch `iron-loop-critic` against the parent's scenarios "A change of plan text alone passes the text-only check", "The send-back's own rewrite is not counted as a change", "A changed frontmatter is refused at the finish", "A changed declared file is refused at the finish" and the first half of "The owner's approve anyway finishes a revision whose declared file changed". Each box quotes the test that proves it and its result.
- [ ] Put in front of the owner, from the built tree on a temporary project: the validation screen of a revision whose declared file changed, and of one whose text alone changed.
