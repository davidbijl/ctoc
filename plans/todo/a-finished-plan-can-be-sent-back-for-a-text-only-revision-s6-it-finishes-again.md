---
title: "A revised finished plan finishes again: on its evidence, admitted only by its send-back record, or on the owner's approve"
type: implementation
parent_plan: a-finished-plan-can-be-sent-back-for-a-text-only-revision
depends_on: a-finished-plan-can-be-sent-back-for-a-text-only-revision-s1-a-background-agent-cannot-send-it-back, a-finished-plan-can-be-sent-back-for-a-text-only-revision-s3-the-text-only-check, a-finished-plan-can-be-sent-back-for-a-text-only-revision-s5-the-checks-run-again
created: 2026-10-22
priority: HIGH
files:
  # The crossing on evidence gains the second admission, its evidence words and its log row.
  - src/lib/streaming-gate.js
  # The owner's approve closes the send-back record and marks its row.
  - src/lib/actions.js
  # markAdmissionUsed and markFinished: a send-back record admits a plan once, and closes only when it finished.
  - src/lib/text-revision.js
  # entry.actor's JSDoc gains 'pipeline', the actor of a revised plan's finish on its evidence.
  - src/lib/transition-log.js
  # The crossing rules say how a revised plan finishes.
  - docs/ENFORCEMENT.md
  # The one test file this slice creates.
  - tests/a-revised-plan-finishes-again.test.js
  # RATCHET FILES — not planned work: the new test file moves the documented test-file count,
  # which CLAUDE.md (Gate 2 requires the declaration) and README.md state.
  - CLAUDE.md
  - README.md
---

# A revised finished plan finishes again: on its evidence, admitted only by its send-back record, or on the owner's approve

The second-finish slice of "A finished plan can be sent back for a text-only revision". It carries the owner's answer "Who finishes a revised finished plan again?" — "The menu on recorded evidence" (`.ctoc/streaming/answers.jsonl` line 274): the menu's crossing on recorded evidence, admitted only by the send-back record in the guarded folder, with his approve still available.

Today the crossing on evidence admits a plan only by its approval record into the build queue (`crossOnEvidence`, `src/lib/streaming-gate.js` line 768), and a plan sent back from done has none: the send-back withdrew it (`src/lib/actions.js` line 935). This slice adds the second admission, spends it before the crossing writes anything so it admits once, and makes both finishers close the send-back record only after the plan is in done.

It depends on three slices:
- the hook-refusal slice: the owner's pick of this finisher "assumes only you may send a plan back", and his shell-refusal answer guards the record this admission rests on;
- the text-only-check slice: the admission is safe only when the text-only check is part of the validation it requires;
- the checks-again slice: without a fresh check record no revised plan can reach this admission.

Gate logic: yes. The crossing on evidence gains a second way into done: the gate change the owner approved in his answer to "Who finishes a revised plan again" (`.ctoc/streaming/answers.jsonl` line 274), whose recommended option names it as a gate-logic change. This slice crosses into the build queue on recorded evidence, on the owner's instruction to the CTO Chief, 2026-10-22 (the parent plan, "Decisions Taken Under Ambiguity — technical planning").

Protected-list status:
- `src/lib/streaming-gate.js` is on the list (`src/lib/protected-paths.js` line 65).
- `src/lib/text-revision.js` is on it since the text-only-check slice.
- The list's human-kind rule is enforced today only by edit hooks Claude Code does not load; it decides nothing about how this slice reaches the build queue.
- `src/lib/actions.js`, `src/lib/transition-log.js` and `docs/ENFORCEMENT.md` are not.

Technical order across plans (a fact, not a schedule): the slice "The owner's approve refuses a plan with an unclosed code fence" of "A heading inside a code block does not end the approved section" also edits `approvePlan`, at the same spot this slice does: between the un-keyable refusal (`src/lib/actions.js` lines 479-493) and `clearStatus` (line 496). It is not a code dependency; whichever builds second re-reads that spot at its Step 9 and keeps both insertions, the fence refusal first, because it refuses before anything changes.
- No hook file is edited. The only approval-record writes are CTOC's own writers (`writePipelineEntry`, `stampAndLedger`), through the menu process.

## Implementation Details

### Architecture Decision

- **The second admission lives in `crossOnEvidence` and nowhere else.** The new admission requires all of:
  - the approval record absent, read through `readEntryResult` so that a corrupt or un-keyable record refuses, where today's `readEntry` reads both as "no record" (`src/lib/approval-ledger.js` lines 990-1011 and 1088-1096);
  - an open, completed send-back record whose admission is unspent (no `admission_used_at`);
  - every condition the crossing already requires: `passesValidation` (now including the text-only check), not empty, no regime hold, questions that need nobody, no hold, a passing check record (`src/lib/streaming-gate.js` lines 1159-1161 and 769-773).
- **Two marks, not one.** `admission_used_at` spends the admission; `finished_again_at` closes the record.
  - The admission is spent (`markAdmissionUsed`) before the approval record is written. If anything after that fails, including the writer throwing (for example on the unclosed-fence refusal the plan "A heading inside a code block does not end the approved section" adds), the plan stays in review without an approval record, and only the owner's approve finishes it: the fail-closed direction.
  - The record is closed (`markFinished`) only after the plan is in done. Until then it stays open, so the text-only check keeps applying (the text-only-check slice applies it while `finished_again_at` is absent) and the owner's plain approve is still held to it.
  - One mark for both would be the defect: a record marked finished before a writer throw is spent, the text-only check stops applying, and the owner's plain approve would finish a plan unchecked.
  - A spent admission never admits again. Without this, an agent that deleted the done record (an unrefused shell write at the top of `.ctoc/approvals/` while `RECORD_REFUSALS_OFF` is on) and moved the plan back by hand would have the continuation finish it a second time on the old record.
- **The owner's approve closes the record after it crosses.** His approve adds the approval-marker fields to the frontmatter (`addApprovalMarker`, `src/lib/actions.js` lines 274-285), so a plan he finished can never pass the text-only check against its old record anyway. Closing it keeps the record's history honest: who finished it again.
- **Only the revised plan's finish writes a transitions row.** Today's crossing on evidence writes none, and changing that for every plan is outside this plan; it is listed for the owner under the parent's neighbours.

### Dependency Graph

```
continueAfterCrossing (menu-screens.js :2917) — from `menu task complete <id> --continue`, `stream approve`,
  `stream answer`, `stream run-checks` (the checks-again slice)
  --> pendingGateDecisions({ crossed }) (streaming-gate.js :1099; the review crossing at :1159-1163)
    --> crossOnEvidence() (:763)                                   [MODIFY: second admission]
          --> approval-ledger.readEntryResult (:990)
          --> text-revision.readSendBack (the send-back-command slice), markAdmissionUsed, markFinished   [NEW]
          --> approval-ledger.writePipelineEntry (:737), removeEntry (:1126)
          --> composeDoneEvidence (:721) + textRevisionEvidence    [NEW, private]
          --> transition-log.logTransition (the send-back-command slice's field; actor 'pipeline')  [MODIFY: JSDoc]
          --> task-registry.warnLog ('text_revision_admission_spent', 'text_revision_record_not_closed')
stream approve / claude:approve / approveSubplans --> actions.approvePlan (:423)   [MODIFY: close the record, mark the row]
          --> text-revision.readSendBack, markFinished
tests/a-revised-plan-finishes-again.test.js --tests--> all of the above, through route() and the spawned entry
```

### File Specifications

#### File: `src/lib/text-revision.js`
**Action:** MODIFY
**Purpose:** A send-back record admits a plan once, and is closed only once the plan finished again.
**Change Type:** new-function + modify-existing
**Protected-list status:** on the list (since the text-only-check slice).

- **Modify** `readSendBack`'s shape test (the send-back-command slice): `finished_again_by` absent, `'human'` or `'pipeline'`. (`admission_used_at` absent or a string is already in it.)
- **Add** two functions:

```js
/**
 * Spend an open, completed send-back record's one admission: the crossing on evidence is about to write
 * a finish. Writes `admission_used_at` (now), atomically (writeSendBack). The record stays OPEN: its
 * text-only check keeps applying until markFinished. A spent admission never admits again. Never throws.
 * @param {string} root
 * @param {string} slug
 * @returns {{ ok: true } | { ok: false, cause: string }}
 */
function markAdmissionUsed(root, slug) {
  const rec = readSendBack(root, slug);
  if (rec.status !== 'ok' || !rec.open || rec.record.complete !== true || typeof rec.record.admission_used_at === 'string') {
    return { ok: false, cause: `no unspent admission (${rec.status})` };
  }
  try {
    writeSendBack(root, slug, { ...rec.record, admission_used_at: new Date().toISOString() });
    return { ok: true };
  } catch (err) {
    return { ok: false, cause: String(err && err.message) }; // the crossing refuses and logs it
  }
}

/**
 * Close an open send-back record: the plan is in done again. Writes `finished_again_at` (now) and
 * `finished_again_by`, atomically. A closed record admits nothing and its text-only check no longer
 * applies. Called only after the move into done. Never throws.
 * @param {string} root
 * @param {string} slug
 * @param {'pipeline'|'human'} by
 * @returns {{ ok: true } | { ok: false, cause: string }}
 */
function markFinished(root, slug, by) {
  const rec = readSendBack(root, slug);
  if (rec.status !== 'ok' || !rec.open) return { ok: false, cause: `no open record (${rec.status})` };
  try {
    writeSendBack(root, slug, { ...rec.record, finished_again_at: new Date().toISOString(), finished_again_by: by === 'human' ? 'human' : 'pipeline' });
    return { ok: true };
  } catch (err) {
    return { ok: false, cause: String(err && err.message) }; // the caller reports it; the plan stays finished
  }
}
```

- **Update** `module.exports`: add `markAdmissionUsed` (caller: `streaming-gate.crossOnEvidence`) and `markFinished` (callers: `streaming-gate.crossOnEvidence`, `actions.approvePlan`).

#### File: `src/lib/streaming-gate.js`
**Action:** MODIFY
**Purpose:** The crossing on evidence admits a revised plan by its open send-back record, once.
**Change Type:** modify-existing + new-function
**Protected-list status:** protected.

- **Add**, directly after `composeDoneEvidence` (lines 721-739):

```js
/**
 * The evidence words a revised finished plan's finish adds: when it was sent back, the record that
 * admitted it, and that its text-only check passed (crossOnEvidence runs only on a passing validation,
 * which includes the text-only check). Plan-derived text is stripped and capped.
 * @param {string} slug the plan's ledger key
 * @param {{ sent_back_at: string, files: Record<string, string|null> }} revision the open send-back record
 * @returns {string}
 */
function textRevisionEvidence(slug, revision) {
  const files = revision.files && typeof revision.files === 'object' ? Object.keys(revision.files).length : 0;
  return `text revision: sent back ${oneLine(revision.sent_back_at)}, admitted by .ctoc/approvals/sent-back/${stripCtl(slug)}.json; `
    + `text-only check passed: the frontmatter and ${files} declared file(s) unchanged since the send-back`;
}
```

- **Replace** `crossOnEvidence`'s body (lines 764-801) with:

```js
  try {
    const ledger = require('./approval-ledger');
    const textRevision = require('./text-revision');
    const slug = ledger.slugFromPlanPath(planPath);
    const entry = ledger.readEntryResult(slug, root);
    // A finished plan sent back for a text revision has no approval record: its send-back withdrew it.
    // Its admission is its open, completed send-back record (the owner's answers of 2026-10-21), and
    // only while the approval record is absent: never when it is corrupt, un-keyable or names another edge.
    let revision = null;
    if (entry.status === 'absent') {
      const rec = textRevision.readSendBack(root, slug);
      if (rec.status !== 'ok' || !rec.open || rec.record.complete !== true
          || typeof rec.record.admission_used_at === 'string') return false;
      revision = rec.record;
    } else if (entry.status !== 'ok' || !entry.entry || entry.entry.stage_to !== 'todo') {
      return false;
    }
    const answers = require('./streaming-precompute').readAnsweredQuestionIds(root, ref, { questionsRevisionMs: 0, planMtimeMs: 0 });
    if (!answers.ok || answers.held.length > 0) return false;
    const fileSlug = path.basename(planPath, '.md');
    const record = require('./step-13-verify').readVerifyEvidence(root, fileSlug);
    if (!record || record.passed !== true) return false;
    const content = safeFs.readFileSync(planPath, 'utf8');
    const ledgerFile = ledger.ledgerPath(slug, root);
    const prior = revision ? null : safeFs.readFileSync(ledgerFile, 'utf8');
    const evidence = composeDoneEvidence(stripCtl(fileSlug), record, verdict);
    const pipelineEntry = {
      content,
      stage_from: 'review',
      stage_to: 'done',
      evidence: revision ? `${evidence}; ${textRevisionEvidence(slug, revision)}` : evidence,
      plan_basename: fileSlug,
    };
    if (revision) {
      // The admission is spent before anything is written: should anything below fail, the plan stays
      // in review without an approval record, its record stays open (its text-only check still applies),
      // and only the owner's approve finishes it. A spent admission never admits again.
      const spent = textRevision.markAdmissionUsed(root, slug);
      if (!spent.ok) {
        admissionSpentLog(root, fileSlug, 'mark', spent.cause);
        return false;
      }
      try {
        ledger.writePipelineEntry(slug, pipelineEntry, root);
      } catch (err) {
        admissionSpentLog(root, fileSlug, 'write', err && err.message);
        return false;
      }
    } else {
      ledger.writePipelineEntry(slug, pipelineEntry, root);
    }
    // The plan's status file stays with the stage it leaves, exactly as approvePlan clears it.
    require('./background').clearStatus(planPath);
    let newPath;
    try {
      newPath = movePlan(planPath, 'done', root);
    } catch {
      if (revision) {
        // No record named done for a plan still in review; the admission stays spent, the record open.
        try { ledger.removeEntry(slug, root); } catch { return false; }
      } else {
        restoreLedgerFile(ledgerFile, prior, ledger, slug, root);
      }
      return false;
    }
    if (revision) {
      // Closed only now that the plan is in done. A failed close leaves the record open with its
      // admission spent: it admits nothing again, and the plan stays finished.
      const closed = textRevision.markFinished(root, slug, 'pipeline');
      if (!closed.ok) {
        require('./task-registry').warnLog(root, 'text_revision_record_not_closed', { plan: stripCtl(fileSlug), message: stripCtl(String(closed.cause)).slice(0, 300) });
      }
      logRevisedFinish(root, path.basename(planPath));
    }
    // Both are fail-soft by contract: the config falls back to its defaults, and the notice
    // writer logs its own failure; a notice never undoes the crossing.
    if (require('./deployment').getDeploymentConfig(root).enabled) {
      require('./actions').recordDeployReadyNotice(newPath, root, 'evidence');
    }
    return true;
  } catch {
    return false; // fail-soft: never brick the read
  }
```

  - For a plan that was never sent back the crossing is unchanged: it is admitted by its record into the build queue, gets the same evidence, restores the same bytes on a failed move, and writes no transitions row.
  - The one difference is that a corrupt or un-keyable approval record is now refused through `readEntryResult`; today `readEntry` returns `null` for it and the crossing refuses too (`!existing`, line 768).
- **Add**, after `restoreLedgerFile` (lines 811-823):

```js
/**
 * One transitions row for a revised finished plan's finish on its evidence; a row that cannot be written
 * never undoes it (the cause goes to the warn log).
 * @param {string} root
 * @param {string} file the plan's file name
 * @returns {void}
 */
function logRevisedFinish(root, file) {
  try {
    require('./transition-log').logTransition({
      plan: file, from: 'review', to: 'done', actor: 'pipeline',
      validation: { passed: true, checks: 0, warnings: 0 },
      humanGate: true, marker: false, override: false, textRevision: true,
    }, root);
  } catch (err) {
    require('./task-registry').warnLog(root, 'text_revision_log_failed', { plan: stripCtl(file), message: stripCtl(String(err && err.message)).slice(0, 300) });
  }
}

/**
 * The warn-log line for a revised plan's crossing on evidence that stopped at its admission: the mark
 * that spends it failed (`step: 'mark'`, the admission is not spent), or the approval-record writer threw
 * after it (`step: 'write'`, the admission is spent and the plan waits for the owner's approve). The
 * cause is control-stripped and cut to 300 characters, as actions.js's cutCtl does (`cutCtl` is private
 * to actions.js, so the same two calls are written here). Never throws past the warn log's own contract.
 * @param {string} root
 * @param {string} plan the plan's file slug
 * @param {'mark'|'write'} step
 * @param {unknown} cause
 * @returns {void}
 */
function admissionSpentLog(root, plan, step, cause) {
  require('./task-registry').warnLog(root, 'text_revision_admission_spent', {
    plan: stripCtl(plan), step, message: stripCtl(String(cause == null ? '' : cause)).slice(0, 300),
  });
}
```

- **Modify** `crossOnEvidence`'s JSDoc (lines 741-762): the "Requires a recorded admission to building" paragraph gains the second admission, the admission spent before any write, the record closed only after the move, the warn-log lines, the evidence words, the row, and the removal of the approval record on a failed move.

#### File: `src/lib/transition-log.js`
**Action:** MODIFY
**Purpose:** The documented actor values include the one this slice writes.
**Change Type:** modify-existing (JSDoc only)
**Protected-list status:** not on the list.

- `logTransition`'s JSDoc line for `entry.actor` (line 60, "Who triggered (human, agent, system)") becomes "Who triggered (human, agent, system, or pipeline: the menu's crossing on recorded evidence, written for a revised finished plan's finish by `streaming-gate.crossOnEvidence`)". The code already writes any actor it is given (line 74); nothing else changes.

#### File: `src/lib/actions.js`
**Action:** MODIFY
**Purpose:** The owner's approve of a revised plan closes its send-back record and marks its row.
**Change Type:** modify-existing
**Protected-list status:** not on the list.

- In `approvePlan`, directly before `clearStatus(planPath);` (line 496), after the un-keyable refusal (lines 479-493). The heading plan's unclosed-fence slice inserts at the same spot (the technical-order fact above):

```js
      // A finished plan sent back for a text revision (the owner's answers of 2026-10-21): its finish
      // closes its send-back record, and its transitions row says so.
      const revisionOpen = from === 'review'
        && textRevision.readSendBack(root, require('./approval-ledger').slugFromPlanPath(planPath)).open === true;
```

- Inside `if (from === 'review' && to === 'done') {` (line 531), first:

```js
        if (revisionOpen && !textRevision.markFinished(root, require('./approval-ledger').slugFromPlanPath(planPath), 'human').ok) {
          console.error('Text revision: the send-back record could not be closed; it admits nothing once the plan carries your approval.');
        }
```

  The sentence is true: the approval record now exists, so the crossing on evidence refuses the second admission. The approval marker also changes the frontmatter, so the text-only check would refuse the old record. `revisionOpen` is true also for a record whose admission a stopped crossing spent (K8, K13): the owner's approve is the way on, and it closes that record.
- `logTransition`'s call (lines 580-596) gains `textRevision: revisionOpen,`.
- Nothing else in `approvePlan` changes; its validation, refusal, override and rollback are untouched.

#### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY
**Purpose:** The crossing rules say how a revised plan finishes.

- After **Review to done on recorded evidence** (lines 179-191; the checks-again slice has already named `stream run-checks` among its live paths), add a paragraph: **A finished plan sent back for a text revision finishes again (owner, 2026-10-21).** Its send-back withdrew its approval record, so it has no ledger crossing into `todo`. Its admission is its open, completed send-back record in `.ctoc/approvals/sent-back/<slug>.json` (written by the menu's send-back, `actions.sendFinishedPlanBack`), only while its approval record is absent and its admission unspent. It must also meet every condition above, the text-only check included (`text-revision.textOnlyCheck` inside `validateReviewToDone`: the frontmatter and every declared file as the send-back left them). The admission is spent (`admission_used_at`) before anything is written, so it admits once; a failure after that, a throwing record writer included, leaves the plan in review with its record open, its text-only check still applying, for the owner's approve, and writes `text_revision_admission_spent` to the warn log. The record is closed (`finished_again_at`) only after the plan is in done. The evidence adds when it was sent back, the record and the text-only check. The transitions log gains a row marked `textRevision`. The owner's approve, override included, closes the record too. A background agent's send-back and its shell write of the record are refused (`src/hooks/protect-records.js`). A main session's shell write is not refused while `RECORD_REFUSALS_OFF` is on, and a folder-level copy into `.ctoc/approvals/` is not seen. Held by `tests/a-revised-plan-finishes-again.test.js`.

#### Files: `CLAUDE.md` and `README.md`
**Action:** MODIFY (count lines only), through the release script's two count functions at Step 15.

### Test Plan

**File:** `tests/a-revised-plan-finishes-again.test.js` (CREATE). **Framework:** `node:test`, `node:assert/strict`, on real temporary projects, with the helpers of the text-only-check and checks-again slices.

How the fixtures are made:
- A finished plan is made the way CTOC makes one: written into `review/` with Steps 8-16 checked, given a passing check record by `persistVerifyResult` on a project whose test script exits 0, admitted by `ledger.writeEntry(slug, { content, stage_from: 'implementation', stage_to: 'todo' }, root)`, and finished by `actions.approvePlan`.
- It is sent back by the real command.
- The one continuation is `route(['menu', 'task', 'complete', <id>, '--continue'], root)` on another finished task (`tests/plans-keep-moving-without-the-human.test.js` lines 294-302).
- Nothing in CTOC is mocked. The stated fault injections (K11's last arm, K13, K14, K15, K16) sit at the file-system boundary: `t.mock.method(safeFs, 'writeFileSync', wrapper)` on `const safeFs = require('../src/lib/safe-fs.js')`, where the wrapper throws `new Error('injected …')` only for the target or data the case names and otherwise returns `real(target, ...rest)` with `const real = safeFs.writeFileSync` taken before the mock. So `markAdmissionUsed`, `markFinished`, `writeSendBack`, `writePipelineEntry` and `crossOnEvidence`'s order and fail-closed paths all run for real, and each fault reaches the catch it targets. Where a case decides on the record's data, it parses the written text and tests the top level, `typeof JSON.parse(String(data)).finished_again_at === 'string'`, never a substring: a nested `previous_send_back` carries its own `finished_again_at`. Every write under `sent-back/` is JSON. Precedent: `tests/plans-keep-moving-without-the-human.test.js` lines 416-422 inject a path-conditional `safeFs.writeFileSync` fault the same way, and `tests/enforcement-fault-arms.test.js` lines 139-146 inject one at the approval-ledger boundary (searched: `mock\.method\(` over `tests/`, 29 files); `tests/false-green-fence.test.js` has no rule on mocks (searched: `mock`, case-insensitive, 0 lines). The mock is restored when the test ends, except in K13, which restores it by name part-way. No timing: plan times are set with `fs.utimesSync` to fixed earlier instants.
- The made-up home-folder path of K1 is assembled in the test from its segments, never written out as one string, so no such path appears in this plan or in the test file.

Every case names its first-run result before any source change (red unless marked).
- **K1 scenario: the revised plan finishes again on its fresh check.**
  - The finished plan is shaped like the triggering plan: an `## Execution Record` heading, then a fenced build log holding a line that starts with `# `, then lines holding the made-up home-folder path.
  - The owner sends it back. Only those lines change, to the placeholder `<home>`. `stream run-checks review/<f>.md` (the checks-again slice) runs.
  - The plan is in `done/`.
  - Its approval record has `advanced_by: 'pipeline'`, no `approved_by`, no `backfilled`. Its `evidence` holds "text revision", `.ctoc/approvals/sent-back/<slug>.json`, "text-only check passed" and `.ctoc/state/verify/<f>.json`.
  - `classifyResidency(<done path>, 'done', root)` is `{ accepted: true, kind: 'pipeline' }`.
  - The transitions log gained exactly one row from review to done with `actor: 'pipeline'` and `textRevision: true`.
  - The send-back record has `admission_used_at`, `finished_again_at` and `finished_again_by: 'pipeline'`.
- **K1b the same through the continuation the scenario names.** K1's state, the check record written by `persistVerifyResult`, then one continuation: the plan is in `done/` with the same record shape.
- **K2 scenario: a send-back row without the protected record never finishes the plan.**
  - A plan placed in review by hand: a copy of a finished plan with a `# REVISION 1` block and `## Rejection Feedback`.
  - A transitions row written with `logTransition({ …, from: 'done', to: 'review', textRevision: true })`.
  - No send-back record, no approval record, and a passing check record written after its last change.
  - One continuation leaves it in review, and no approval record exists.
- **K3 scenario: the owner's approve finishes a revised plan with a human-kind record.**
  - Send back, change one line of text, write a fresh check record.
  - `route(['stream', 'approve', 'review/<f>.md'], root)` moves it to `done/` with `approved_by: 'human'`, `hash_scope: 'specification'` and no `backfilled`.
  - The last transitions row is review to done, `actor: 'human'`, `textRevision: true`, and the record has `finished_again_by: 'human'`.
- **K4 scenario: the owner's approve anyway finishes a revision whose declared file changed** (the rest of the text-only-check slice's G5).
  - `actions.approvePlan(<review path>, root, { override: { reason: 'the change is another plan’s build' } })`.
  - The last row has `override: true` and `textRevision: true`, and the record is closed by `'human'`.
  - `classifyResidency` accepts the plan in done.
- **K5 a used record never admits a plan again.**
  - After K1, rename the plan back into `review/` and delete its approval record file.
  - Write a fresh passing check record and run one continuation: the plan stays in review and no approval record exists.
  - The same after K8's state with the name freed (the admission spent, the record still open): one continuation leaves it in review.
- **K6 a corrupt approval record next to an open send-back record admits nothing**: `{` at the approval record path, then a continuation; the plan stays in review.
- **K7 a pending send-back record admits nothing**: the send-back-command slice's F11 state, then a hand copy of the plan into `review/` and a fresh check record; the plan stays in review.
- **K8 a failed move leaves no record naming done.**
  - A different file already at `done/<f>.md`, then a continuation.
  - The plan is in review, no approval record exists, and the send-back record has `admission_used_at` and no `finished_again_at`: spent, still open.
  - `stream run-checks review/<f>.md` then answers the checks-again slice's spent-admission sentence ("… stopped part-way and its one admission is spent; it finishes now only on your approval.").
  - The owner's approve is then refused by `movePlan` (`src/lib/actions.js` lines 122-127), as for any plan whose name is taken; once the other file is moved away, his approve finishes it and the record gets `finished_again_by: 'human'`.
- **K9 a plan never sent back finishes as before** (green, a pin): a built plan admitted into `todo` finishes on one continuation with today's evidence string, character for character, and the transitions log gains no row.
- **K10 the hook and the module name the same folder** (red until the hook-refusal and send-back-command slices are built; this slice depends on both): the text of `src/hooks/protect-records.js` holds `dir: '.ctoc/approvals/sent-back'`, and `path.posix.relative` of a temporary root and `path.dirname(textRevision.sendBackRecordPath(root, 'x'))`, with `\` read as `/`, is `.ctoc/approvals/sent-back`.
- **K11 the two marks never throw and each acts once**: on an absent record both give `ok: false`; on an open, completed record `markAdmissionUsed` gives `ok: true` and then `ok: false`, and the record is still `open`; `markFinished` then gives `ok: true` and then `ok: false`, and the record is not `open`. A write failure reaches each mark's `catch`: on a fresh open, completed record, the boundary wrapper throws `new Error('injected record write failure')` for every target whose resolved path has a `sent-back` segment; then `markAdmissionUsed` gives `{ ok: false, cause: 'injected record write failure' }` and the record still has no `admission_used_at`, and `markFinished` gives the same `cause` and the record is still `open`. A plain file at the record's folder is not used here: `readSendBack`'s folder test reads it as `corrupt` (the send-back-command slice), so the mark would refuse at the read, never at its `catch`.
- **K13 the record writer throws after the admission is spent.**
  - K1's state up to the checks run, with a passing check record written after the change. The approval record's own atomic write is made to fail at the boundary: `const ledgerFile = ledger.ledgerPath(slug, root); const m = t.mock.method(safeFs, 'writeFileSync', (target, ...rest) => { if (path.resolve(String(target)).startsWith(path.resolve(ledgerFile) + '.tmp-')) throw new Error('writer refused\u0007 ' + 'x'.repeat(400)); return real(target, ...rest); });`. Only `<ledgerDir>/<slug>.json.tmp-*` throws (`persistEntry` names its temp `${target}.tmp-…`, `src/lib/approval-ledger.js` line 905); the send-back record's temp lives under `sent-back/` and is written for real, so `markAdmissionUsed` runs and the throw reaches the `'write'` catch through the real `writePipelineEntry`. It stands for the real refusals of that writer, such as the unclosed-fence refusal the heading plan adds.
  - One continuation: the plan stays in review, no approval record exists, the send-back record has `admission_used_at` and no `finished_again_at`, and the warn log holds one `text_revision_admission_spent` line with `step: 'write'`, the plan, and the cause without its control character and at most 300 characters.
  - `m.mock.restore()`, then a second continuation leaves the plan in review: no second admission.
  - The owner's approve is still held to the text-only check: one `files:` entry added, then `stream approve` leaves the plan in review with the frontmatter refusal. With that entry removed and a fresh check record, `stream approve` finishes it with a human-kind record and the send-back record gets `finished_again_by: 'human'`.
- **K15 a record that cannot be closed after the move is logged, and the plan stays finished.** K13's state before any continuation (a passing check record written by `persistVerifyResult` after the change), without K13's wrapper, with the boundary wrapper throwing `new Error('simulated\u0007 close')` only for a target with a `sent-back` segment whose data has a top-level `finished_again_at` string (the write of the real `markFinished`); the admission mark's write, which has none, runs for real. One continuation moves the plan to `done/` with its pipeline-kind record, the transitions row is written, the send-back record has `admission_used_at` and no `finished_again_at`, and the warn log holds one `text_revision_record_not_closed` line with the plan and the cause without its control character.
- **K16 the owner's approve under K15's wrapper leaves the plan finished and says the record was not closed.** K3's state (sent back, one line of text changed, a fresh check record), then K15's wrapper and `t.mock.method(console, 'error')`. `route(['stream', 'approve', 'review/<f>.md'], root)`: the plan is in `done/` with `approved_by: 'human'`; the last transitions row is review to done with `textRevision: true`; the send-back record has no `finished_again_at`; and exactly one of `console.error`'s recorded calls has as its first argument exactly "Text revision: the send-back record could not be closed; it admits nothing once the plan carries your approval.".
- **K14 a failed admission mark refuses the crossing and logs it.** The mark fails only when its atomic write fails, right after a read that accepted the record, and no portable real fault lands between the two (a read-only folder is not portable to Windows). So the write is failed at the boundary, on K13's state before any continuation and without K13's wrapper: the wrapper throws `new Error('simulated\u0007 refusal')` only for a target with a `sent-back` segment whose data has no top-level `finished_again_at` string, which is the real `markAdmissionUsed`'s write. One continuation: the plan stays in review, no approval record exists, the record has no `admission_used_at` (the real mark's write failed, so this is a real assertion), and the warn log holds one `text_revision_admission_spent` line with `step: 'mark'` and the cause without its control character.
- **K12 an out-of-date question file stored for the plan keeps it waiting for the owner** (green before and after, a pin of today's rule).
  - K1's state plus a classified questions file for `review/<f>.md`, written for the plan's text before the send-back (`precompute.writePlanQuestions` with the earlier plan time).
  - One continuation leaves the plan in review with no approval record: the stored file is out of date, so the verdict fails closed (`hasEnoughInformation`, `src/lib/streaming-precompute.js` lines 1241-1246), and the crossing runs only for a verdict of enough or nothing stored (`src/lib/streaming-gate.js` line 1160).
  - `stream approve` then finishes it with a human-kind record.

**Coverage target:** every new line and both arms of every new condition in `crossOnEvidence`, `textRevisionEvidence`, `logRevisedFinish`, `admissionSpentLog`, `markAdmissionUsed`, `markFinished` and the `approvePlan` lines; the failed close after the move (`text_revision_record_not_closed`) is K15, the owner's approve whose close fails is K16, and each mark's own `catch` is K11. The suite floor is `.ctoc/coverage-baseline.json` `minPct`.

### Security Review

| Check | Result |
|---|---|
| A forged way into done | The admission rests only on the record in `.ctoc/approvals/sent-back/`. The editing tools are refused there for every caller (`src/hooks/protect-records.js` lines 1243-1245), and a background agent's shell write is refused there by the hook-refusal slice. A transitions row and a plan's own text admit nothing (K2). The main session's shell write is not refused while `RECORD_REFUSALS_OFF` is on, and a folder-level copy into `.ctoc/approvals/` is not seen. These are the owner's accepted limits (his answer to the shell-refusal question: "it narrows the way into done rather than closing it"). |
| Replay | A record admits once: its admission is spent before anything is written (K5, K13). |
| Fail direction | A corrupt approval record, a pending record, a failed mark, a throwing writer and a failed move all leave the plan in review with no approval record (K6-K8, K13, K14). The record stays open in every one of them, so the owner's approve is still held to the text-only check (K13). |
| No weakening for other plans | A plan never sent back crosses as before (K9). |
| Honest provenance | The new record is `pipeline`-kind with evidence and never `approved_by`; the owner's approve stays `human`-kind; nothing is `backfilled` (K1, K3). |
| Error messages | Evidence and log words are fixed words with stripped, capped plan-derived values; no command text. |

## Wiring — the live call sites

- **The crossing.** `crossOnEvidence` is called only by `pendingGateDecisions` with `opts.crossed` (`src/lib/streaming-gate.js` lines 1159-1163). That call is reached only through `menu-screens.continueAfterCrossing` (`src/lib/menu-screens.js` line 2929), from:
  - `menu task complete <id> --continue` (`taskComplete`, line 2687);
  - `stream approve` and `stream answer` (`streaming-gate.continueAfter`, line 2524);
  - `stream run-checks` (the checks-again slice).

  All four are reached from `/ctoc:start` through `src/commands/start.js` and `route()`.
- **The owner's approve.** `approvePlan` is reached by `stream approve` (`route()` line 3403 → `streamApprove`, `src/lib/streaming-gate.js` line 2368), by the `claude:approve` recipe and by `approveSubplans`.
- **The new exports** are `markAdmissionUsed` (caller: `streaming-gate`) and `markFinished` (callers: `streaming-gate`, `actions`); the export-reachability fence holds them.

## Decisions Taken Under Ambiguity — technical planning

- **The admission requires the approval record to be absent, read with its status.** A corrupt record must not read as "absent" and open the second admission; `readEntryResult` tells the two apart (`src/lib/approval-ledger.js` lines 990-1011).
- **The admission is spent before the crossing; the record is closed after it.** The order that fails closed: a failed admission mark refuses the crossing; a failed write or move after it leaves the plan for the owner's approve, with the record still open so his approve is held to the text-only check. Spending after the write would leave a finished plan with an unspent admission that a hand move could replay. One mark for both, written before the write, was the earlier design and was wrong: a writer throw then left the record closed, the text-only check stopped applying, and the owner's plain approve finished the plan unchecked (K13 holds the fix).
- **Both stops log `text_revision_admission_spent`, with a `step`.** A failed mark (`'mark'`, nothing spent) and a writer throw after the mark (`'write'`, spent) are the two places the crossing of a revised plan stops at its admission; one event name keeps them findable together, and `step` says which. The cause is cut and control-stripped as `cutCtl` does in `src/lib/actions.js` (line 1129); `cutCtl` is private there, so `streaming-gate` writes the same two calls, as `logRevisedFinish` already does.
- **K11, K13, K14, K15 and K16 inject a write fault at the `safe-fs` boundary, always.** No portable real fault reaches the writer, the mark or the close at that moment; the heading plan's unclosed-fence refusal would be one for the writer, but a test whose method depends on whether another plan has landed is a conditional test. The wrapper fails only the one write the case names, chosen by its path or its parsed data, so `markAdmissionUsed`, `markFinished`, `writePipelineEntry` and the order and fail-closed paths of `crossOnEvidence` all run for real and each fault lands in the catch it targets. Replacing `markAdmissionUsed` or `markFinished` whole would have left their own catches untested and made "no `admission_used_at`" true by construction. The repository injects faults this way already (`tests/plans-keep-moving-without-the-human.test.js` lines 416-422; `tests/enforcement-fault-arms.test.js` lines 139-146).
- **`'pipeline'` joins `entry.actor`'s documented values** (`src/lib/transition-log.js` line 60 names human, agent and system). The code writes any actor (line 74); the JSDoc is the reader's contract.
- **On a failed move the approval record is removed, not restored.** There were no prior bytes to restore. The existing rule for a failed move is "no record ever names done for a plan still in review" (`src/lib/streaming-gate.js` lines 804-810).
- **The transitions row is written for the revised plan's finish only.** The parent's scenario asks for it; adding it to every finish on evidence would change the log of every plan, which this plan does not cover.
- **`actor: 'pipeline'` and `humanGate: true` on that row.** The review-to-done edge is a gate edge (`gate-order.GATE_EDGES`, `src/lib/gate-order.js` lines 24-28), and `approvePlan` records the edge the same way (`src/lib/actions.js` line 593). The actor says no human acted.
- **A question file stored for the plan at its first review keeps a revised plan waiting for the owner.** The send-back rewrites the plan, so such a file is out of date; the verdict then fails closed (`src/lib/streaming-precompute.js` lines 1241-1246) and the crossing on evidence does not run (`src/lib/streaming-gate.js` line 1160). The owner sees the plan at the moment it waits for his OK; his approve finishes it (K12), or newly written and classified questions let the menu finish it. This repository holds 15 such files today (`.ctoc/streaming/questions/review__*.json`, a file listing), all for plans already finished. This slice keeps the rule as it is: a stored question is never skipped.
- **The owner's approve closes the record after crossing, fail soft.** His approve is the human looking. A record that could not be closed admits nothing once the plan carries his approval record (the absent-record condition), and his approval marker changes the frontmatter the text-only check compares.

## Execution Plan

### Step 8: TEST
- [ ] Write `tests/a-revised-plan-finishes-again.test.js` exactly as the Test Plan says, before any source change. Take K9's evidence string from a run of the unchanged code.
- [ ] Run `node --test tests/a-revised-plan-finishes-again.test.js`. Record per case red with its reason, or green where marked (K9). A case green where red is expected does not test the change: fix it first.

### Step 9: PREPARE
- [ ] Re-read every cited line of `src/lib/streaming-gate.js`, `src/lib/actions.js`, `src/lib/text-revision.js`, `src/lib/transition-log.js`, `src/lib/approval-ledger.js`, `src/lib/streaming-precompute.js`, `src/lib/menu-screens.js` and `docs/ENFORCEMENT.md`. Where the code differs, follow the code and record the difference.
- [ ] Re-read `approvePlan` between the un-keyable refusal and `clearStatus` (`src/lib/actions.js` lines 479-496 at planning time). If the heading plan's unclosed-fence slice has landed there, keep its refusal and put `revisionOpen` after it; record what was found.
- [ ] List `.ctoc/streaming/questions/` for files keyed to `review__`. Record their count and what the opening screen offers for such a plan once it is sent back (run on a temporary copy, never on this repository's plans).
- [ ] Run `node --test tests/plans-keep-moving-without-the-human.test.js tests/streaming-gate.test.js tests/streaming-gate-coverage-holes.test.js tests/approveplan-validates.test.js tests/a-revised-plans-checks-run-again.test.js tests/a-text-revision-changes-text-only.test.js tests/a-background-agent-cannot-send-a-finished-plan-back.test.js` and record the baseline.

### Step 10: IMPLEMENT
- [ ] `src/lib/text-revision.js`: the `finished_again_by` shape rule, `markAdmissionUsed`, `markFinished` and their exports.
- [ ] `src/lib/streaming-gate.js`: `textRevisionEvidence`, the new `crossOnEvidence` body and JSDoc, `logRevisedFinish`, `admissionSpentLog`.
- [ ] `src/lib/actions.js`: `revisionOpen`, the close through `markFinished`, the row field.
- [ ] `src/lib/transition-log.js`: `'pipeline'` in `entry.actor`'s JSDoc.
- [ ] Rerun the Step 8 file until green, then the Step 9 baseline. An existing assertion that fails is read before anything changes; the code is wrong until proven otherwise.

### Step 11: REVIEW
- [ ] Dispatch `iron-loop-critic` with these attacks:
  - any sequence of writes an agent can make without the refused shell spellings that finishes a plan into done;
  - a replay of a spent admission;
  - any failure after the admission is spent that leaves the record closed, so the text-only check stops applying;
  - a crossing of a plan never sent back that changed;
  - an approval record left naming done for a plan still in review;
  - a row or evidence string that claims the owner acted when he did not.

### Step 12: OPTIMIZE
- [ ] Confirm the crossing's added cost: one record read for a review plan without an approval record, on the continuation's pass only. No change is expected.

### Step 13: SECURE
- [ ] Dispatch `security-scanner` on the diff with the Security Review table. Scope: the admission's conditions, the order of mark, write and move, the fail-closed paths, and no weakening for other plans.

### Step 14: VERIFY
- [ ] Run `npm test`: `# fail 0`, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [ ] Run `npx eslint --max-warnings 0 src/lib/streaming-gate.js src/lib/actions.js src/lib/text-revision.js src/lib/transition-log.js tests/a-revised-plan-finishes-again.test.js` and `npm run typecheck`: both clean.
- [ ] Run `node --test tests/export-reachability.test.js tests/reachability.test.js tests/false-green-fence.test.js tests/golden-corpus-fence.test.js tests/gate-numbers-fence.test.js tests/menu-task-wiring.test.js tests/ledger-forgery-closed.test.js`: all green, no baseline changed.

### Step 15: DOCUMENT
- [ ] The JSDoc of `markAdmissionUsed`, `markFinished`, `textRevisionEvidence`, `logRevisedFinish`, `admissionSpentLog`, `crossOnEvidence` and `entry.actor`, and the `docs/ENFORCEMENT.md` paragraph, as specified.
- [ ] Update the count lines with `node -e "const r=require('./src/scripts/release.js');console.log(JSON.stringify([r.updateDocCountsInClaudeMd(process.cwd()),r.updateDocCountsInReadme(process.cwd())]))"`. Read the diff of `CLAUDE.md` and `README.md`: only count lines differ, and `CLAUDE.md` stays at or under 15,000 bytes.

### Step 16: FINAL-REVIEW
- [ ] Dispatch `iron-loop-critic` against the parent's scenarios:
  - "The revised plan finishes again on its fresh check";
  - "A send-back row without the protected record never finishes the plan";
  - "The owner's approve finishes a revised plan with a human-kind record";
  - "The owner's approve anyway finishes a revision whose declared file changed".

  Each box quotes the test that proves it and its result.
- [ ] Put in front of the owner, from the built tree on a temporary project, in full: the whole route on a fixture shaped like the triggering plan. That is the finished plan's screen, the send-back's line, the screen asking for the checks to run again, the run's line, and the new approval record and transitions rows.
