---
title: "A revised finished plan's checks run again from its own screen"
type: implementation
parent_plan: a-finished-plan-can-be-sent-back-for-a-text-only-revision
depends_on: a-finished-plan-can-be-sent-back-for-a-text-only-revision-s3-the-text-only-check
created: 2026-10-22
priority: HIGH
files:
  # The route `stream run-checks review/<file>.md`: the full check, its record, then the continuation.
  - src/lib/menu-screens.js
  # The review screen of a revised plan says its checks must run again and offers the route.
  - src/lib/streaming-gate.js
  # The session's row for the route, and the list of screens that carry promote[].
  - src/commands/start.md
  # The crossing rules: stream run-checks joins the continuation's live paths.
  - docs/ENFORCEMENT.md
  # The one test file this slice creates.
  - tests/a-revised-plans-checks-run-again.test.js
  # RATCHET FILES — not planned work: the new test file moves the documented test-file count,
  # which CLAUDE.md (Gate 2 requires the declaration) and README.md state.
  - CLAUDE.md
  - README.md
---

# A revised finished plan's checks run again from its own screen

The checks-again slice of "A finished plan can be sent back for a text-only revision". It carries the owner's answer "Run the full check again" (`.ctoc/streaming/answers.jsonl` line 272): a revised plan finishes again only on a check record written after its last change, by the existing full check (lint, every test, the coverage floor, nothing skipped), with the review-to-done check unchanged.

Today a check record has one producer, `persistVerifyResult` (`src/lib/step-13-verify.js` lines 938-956). Its one caller is a build's completion (`src/lib/actions.js` line 1530), and a plan sent back from done has no build task. So no route can give a revised plan a fresh record. This slice adds one, offered on the plan's own screen.

Protected-list status:
- `src/lib/streaming-gate.js` is on the list (`src/lib/protected-paths.js` line 65). This slice crosses into the build queue on recorded evidence, on the owner's instruction to the CTO Chief, 2026-10-22; the list's human-kind rule is enforced today only by edit hooks Claude Code does not load (the parent plan, "Decisions Taken Under Ambiguity — technical planning"). Its gate behaviour is the owner's answer above.
- `src/lib/menu-screens.js`, `src/commands/start.md` and `docs/ENFORCEMENT.md` are not on it.
- No hook file and no approval record is edited.
- The route writes a check record under `.ctoc/state/verify/` through CTOC's own writer, inside the menu process, which never passes a tool hook (`src/hooks/protect-records.js` lines 23-24).

Technical order (facts, not a schedule):
- This slice and the screen-offer slice both edit `planDecisionScreen` (`src/lib/streaming-gate.js`, its gate and lifecycle branches at lines 1705-1788; the function starts at line 1616) and `src/commands/start.md`, with no `depends_on` edge between them. They are not built in parallel, in either order; whichever is built second re-reads both at its Step 9.
- This slice and the hook-refusal slice both edit `docs/ENFORCEMENT.md` (different sections), with no edge between them; the second re-reads the file at its Step 9.

## Implementation Details

### Architecture Decision

- **The route calls `persistVerifyResult` directly, never `completeExecution`.** The completion is a build's path, and for a plan sent back from done it would act wrongly:
  - it reruns the pre-review validation and, on a failure, records a kickback against the plan's steps (`src/lib/actions.js` lines 1484-1502);
  - it starts a review-preparer status that no agent acts on (line 1616);
  - it warns that no build task was found (the coupling's warning at line 1565).

  The owner's answer is "run the full check again"; `persistVerifyResult` is that check and its one recorder.
- **The route is a `stream` sub-command**, beside `stream check` (`src/lib/menu-screens.js` lines 3049-3064 and 3407): a decision on a plan at the review moment, answered with the next screen.
- **When the checks pass, the route runs the continuation** (`continueAfterCrossing`, line 2917). The plan then finishes on its checks in the same act, once the second-finish slice admits it, unless something still needs the owner. That makes a fourth live path of the continuation, beside `menu task complete … --continue`, `stream approve` and `stream answer` (lines 2889-2891). It is the owner's own act on his plan, as `stream approve` is.
- **Only a plan with an open, completed send-back record.** A built plan's check record is its build's completion's to write; this route must not become a second way to refresh one.

### Dependency Graph

```
/ctoc:start --> start.md recipe --> node src/commands/start.js stream run-checks review/<file>.md
  --> route() case 'stream' (menu-screens.js :3400-3414)          [MODIFY: sub 'run-checks']
    --> streamRunChecks()                                          [NEW, private]
          --> text-revision.readSendBack (the send-back-command slice)
          --> step-13-verify.persistVerifyResult (:938, unchanged)
          --> continueAfterCrossing() (:2917, unchanged) --> pendingGateDecisions({ crossed })
          --> streamingGate.streamingGateScreen (unchanged)
streaming-gate.planDecisionScreen() review branch                  [MODIFY: the sentence and "Run the checks again"]
  --> checksMustRunAgain(v) reads v.checklist.textOnly.compared and .frontmatterChanged (the text-only-check slice) and v.checklist.verifyEvidence (plan-validator.js :1398, its fields set at :1398-1426)
```

### File Specifications

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** `stream run-checks review/<file>.md`.
**Change Type:** new-function + modify-existing
**Protected-list status:** not on the list.

- **Add** to `route`'s `stream` case (lines 3400-3414), after `if (sub === 'check') …` (line 3407):
  `// \`stream run-checks review/<file>.md\` — the checks of a plan sent back for a text revision run again.`
  `if (sub === 'run-checks') return streamRunChecks(ref, projectPath);`
- **Add**, directly after `streamCheck` (lines 3049-3064):

```js
/**
 * `stream run-checks review/<file>.md` — run the whole project's checks again for a finished plan sent
 * back for a text revision (the owner's answer of 2026-10-21, "Run the full check again"), record them
 * as the plan's check record (step-13-verify.persistVerifyResult, the one recorder), and when they pass
 * run the continuation, so the plan finishes on its checks unless something still needs the owner.
 * Only a plan in review whose send-back record is open and completed; a built plan's checks run when its
 * build completes. Never completeExecution: that is a build's path (a kickback, a review-preparer status,
 * a task coupling), none of which belongs to a plan sent back from done. Returns the default screen with
 * one status line and the continuation's promote[].
 * @param {string} ref
 * @param {string} [projectPath]
 */
function streamRunChecks(ref, projectPath) {
  const root = getProjectPath(projectPath);
  /** @type {(status: string, promote?: Array<object>) => object} */
  const answer = (status, promote = []) => {
    const screen = streamingGate.streamingGateScreen(root, status);
    if (promote.length > 0) screen.promote = promote;
    return screen;
  };
  if (typeof ref !== 'string' || !GATE_REF.test(ref) || !ref.startsWith('review/')) {
    return answer('Nothing was checked: that is not a plan the menu can name.');
  }
  const file = ref.slice('review/'.length);
  const slug = file.replace(/\.md$/, '');
  const planPath = path.join(getPlansDir(root), 'review', file);
  if (!safeFs.existsSync(planPath)) return answer('Nothing was checked: no plan of that name is waiting for its final check.');
  const rec = require('./text-revision').readSendBack(root, require('./approval-ledger').slugFromPlanPath(planPath));
  if (rec.status !== 'ok' || !rec.open || rec.record.complete !== true) {
    return answer('Nothing was checked: only a plan sent back for a text revision has its checks run again here; a built plan’s checks run when its build completes.');
  }
  const name = planNameAt(planPath, slug);
  let verify;
  try {
    verify = require('./step-13-verify').persistVerifyResult(root, slug);
  } catch (err) {
    return answer(`The checks of “${name}” could not be recorded (${stripCtl(String(err && err.message)).slice(0, 160)}).`);
  }
  if (verify.passed !== true) {
    return answer(`The checks failed (${stripCtl(String(verify.summary || 'no summary recorded')).slice(0, 200)}); “${name}” stays until they pass.`);
  }
  const cont = continueAfterCrossing(root);
  if (cont.crossed.some((c) => c.ref === `done/${file}`)) {
    return answer(`The checks passed: “${name}” finished again on its checks.`, cont.promote);
  }
  let blocked = '';
  try {
    const v = validateTransition(planPath, 'review', 'done', root);
    if (v && v.valid === false && Array.isArray(v.errors) && v.errors.length > 0) blocked = stripCtl(String(v.errors[0])).slice(0, 200);
  } catch (err) {
    blocked = `its validation could not run (${stripCtl(String(err && err.message)).slice(0, 120)})`;
  }
  if (blocked) return answer(`The checks passed; “${name}” still cannot finish: ${blocked}.`, cont.promote);
  // The checks and the validation pass, yet the continuation did not finish it. Say which, from the
  // record: a spent admission (the second-finish slice's crossing started and stopped) is not "waiting".
  const after = require('./text-revision').readSendBack(root, require('./approval-ledger').slugFromPlanPath(planPath));
  if (after.status === 'ok' && after.open && typeof after.record.admission_used_at === 'string') {
    return answer(`The checks passed, but the menu’s finish of “${name}” stopped part-way and its one admission is spent; it finishes now only on your approval.`, cont.promote);
  }
  return answer(`The checks passed; “${name}” waits for your approval.`, cont.promote);
}
```

  - `getProjectPath`, `getPlansDir` (line 26), `safeFs`, `path`, `stripCtl` (line 69), `GATE_REF` (line 3040), `planNameAt` (lines 3132-3139), `continueAfterCrossing` and `validateTransition` (line 36) already exist.
  - Every `catch` returns a status; none is empty.
- **Modify** the comment above `continueAfterCrossing` (line 2889): "the session's three live paths" becomes four, naming `stream run-checks` (when its checks pass).
- Before the second-finish slice the continuation never finishes a revised plan, `admission_used_at` is never written, and the route always ends "waits for your approval" when the checks and validation pass, which is then true. The spent-admission sentence is for the state the second-finish slice's crossing leaves when it stops after spending the admission (that slice's K8 and K13).
- Throws: never; `streamingGateScreen` is the default screen's own renderer.

#### File: `src/lib/streaming-gate.js`
**Action:** MODIFY
**Purpose:** A revised plan whose checks must run again says so and offers the route.
**Change Type:** modify-existing
**Protected-list status:** protected.

- **Add**, after `CHECK_LABEL` (line 1883):

```js
/** The option that runs a revised finished plan's checks again (menu-screens.streamRunChecks). */
const RUN_CHECKS_LABEL = 'Run the checks again';
const RUN_CHECKS_DESCRIPTION = 'Recommended — run the whole project’s checks again (lint, every test, the coverage floor) now that its text has changed.';
const RUN_CHECKS_AGAIN_LINE = 'It was sent back for a text revision: its checks must run again before it can finish.';

/**
 * Must a plan in review run its checks again before it can finish? True only for a plan sent back for
 * a text revision whose send-back record is open and completed and was compared (`checklist.textOnly
 * .compared`, the text-only-check slice), whose frontmatter did not change (`frontmatterChanged`), and
 * whose check record is missing, failed or older than its last change (`checklist.verifyEvidence`,
 * plan-validator.js lines 1398-1426). A changed declared file does not withhold the run: the owner's
 * approve past the check is that plan's only way on, and it must not override a stale full check too.
 * A changed frontmatter does: a change of scope is a new plan, and no run can finish it. Pure.
 * @param {object|null} v the validateTransition result for review → done
 * @returns {boolean}
 */
function checksMustRunAgain(v) {
  const c = v && typeof v === 'object' ? v.checklist : null;
  if (!c || !c.textOnly || !c.verifyEvidence) return false;
  if (c.textOnly.compared !== true || c.textOnly.frontmatterChanged === true) return false;
  const e = c.verifyEvidence;
  return e.present === false || e.passed === false || e.stale === true;
}
```

- **Modify** `planDecisionScreen`'s gate branch (lines 1705-1772):
  - Lines 1708-1714 keep the validation result: `let v = null;` before the `try`, and `v = validateTransition(…)` inside it.
  - After it: `const runAgain = stage === 'review' && !passes && checksMustRunAgain(v);`.
  - Line 1734: when `runAgain`, the "Check validation" description is `'Show exactly which checks fail, with the option to override.'` (the run leads, so exactly one option stays "Recommended"); otherwise it is unchanged.
  - After `let options = …` (lines 1737-1738): `if (runAgain) { options.unshift({ label: RUN_CHECKS_LABEL, description: RUN_CHECKS_DESCRIPTION }); actions[RUN_CHECKS_LABEL] = \`stream run-checks ${ref}\`; text += \`  ${RUN_CHECKS_AGAIN_LINE}\n\n\`; }`.
  - The review screen's two send-backs (lines 1739-1747) then make four options, the most the asking tool takes, and the unchecked-questions offer (line 1758, `options.length < 4`) stays out, as it does for every four-option screen.
- **Modify** the header of `pendingGateDecisions` (line 1063): "three live paths" becomes four, naming `stream run-checks`.

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** The session knows the route and that it runs the whole suite.

- Navigation Commands (lines 22-45), after the `stream comment` row (line 29), add:
  `| \`stream run-checks review/{file}.md\` | For a finished plan sent back for a text revision only (its screen offers "Run the checks again"): runs the whole project's checks again and records them; when they pass, the continuation runs, so the plan finishes on its checks unless something still needs the owner. It runs the full suite before it answers: run it in the foreground with a timeout of 10 minutes, or in the background when the suite takes longer, and show its screen when it ends; never wait in a loop that sleeps |`
- The promote list (lines 137-138): add `stream run-checks` after `stream check`.

#### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY
**Purpose:** The crossing rules name the new live path of the continuation.

- In **Review to done on recorded evidence** (lines 179-191), the list of the continuation's live paths (lines 180-181: `menu task complete <id> --continue`, `stream answer` and `stream approve`) gains "and `stream run-checks review/<file>.md` when its checks pass (only for a finished plan sent back for a text revision)". Nothing else in the paragraph changes; how a revised plan finishes is the second-finish slice's paragraph.

#### Files: `CLAUDE.md` and `README.md`
**Action:** MODIFY (count lines only), through the release script's two count functions at Step 15.

### Test Plan

**File:** `tests/a-revised-plans-checks-run-again.test.js` (CREATE). **Framework:** `node:test`, `node:assert/strict`, on real temporary projects with the helpers of the text-only-check slice's test file. The checks run for real: the temporary project's `package.json` has a test script that exits 0 (the fixture of `tests/ctoc-audit-w05-verify-evidence.test.js` lines 47-50), or exits 1 where a case says so. A revised plan is always made by the real send-back. Nothing in CTOC is mocked. No timing: the plan file's time is set with `fs.utimesSync` to a fixed earlier instant, so "older than its last change" never depends on clock resolution; spawned calls carry `timeout: 120000` as a hang guard only.

Every case names its first-run result before any source change (red unless marked: the route and the option do not exist).
- **J1 the screen of a revised plan whose check record is stale offers the run.** Send back; change one prose line; the plan's check record is older than the change (the first build's, written before the send-back). `route(['plan', 'review/<f>.md'], root)`:
  - the text holds "its checks must run again before it can finish";
  - the first question's options are, in order, "Run the checks again", "Check validation", "Send it back — wrong thing" and "Send it back — wrong way";
  - exactly one description starts with "Recommended", the first;
  - `actions['Run the checks again'] === 'stream run-checks review/<f>.md'`.
- **J2 a revised plan whose declared file changed and whose check record is stale is offered the run first.** J1 plus one changed byte in a declared file: the options are, in order, "Run the checks again", "Check validation", "Send it back — wrong thing" and "Send it back — wrong way"; exactly one description starts with "Recommended", the run's; "Check validation" reads "Show exactly which checks fail, with the option to override."; `actions['Run the checks again'] === 'stream run-checks review/<f>.md'`. So "Approve anyway" never also overrides a stale full check.
- **J2b after the run, the changed declared file is the only error.** J2's state, then `route(['stream', 'run-checks', 'review/<f>.md'], root)` (a passing test script): the status line holds "still cannot finish:" and the declared file's name (J9). Then `validateTransition(<review path>, 'review', 'done', root).errors` holds exactly one error, the one naming the declared file and "changed since the plan was sent back for a text revision"; `route(['plan', 'review/<f>.md'], root)` offers no run (the record is fresh), "Check validation" leads as the only "Recommended" option, and `route(['validate', 'review/<f>.md'], root)` ends with "Approve anyway".
- **J2c a revised plan whose frontmatter changed is not offered the run.** J1 plus one added `files:` entry: no run option; "Check validation" leads with today's "Recommended — show exactly which checks fail, with the option to override.". The same for a corrupt send-back record (`{`) and for a pending one (the send-back-command slice's F11 state, then a hand copy into `review/`): `checklist.textOnly.compared === false`, no run option. In all three, the stale check-record refusal in `validateTransition(<review path>, 'review', 'done', root).errors` carries no suffix: no error holds "its checks must run again" (the text-only-check slice keys the suffix on the same condition, its G10).
- **J3 a review plan never sent back keeps its screen** (green, a pin). A stale check record gives today's options and words, character for character.
- **J4 scenario: a check record older than the last change keeps the plan in review, until the checks run again.**
  - J1's state, plus a classified question for `review/<f>.md` that needs the owner (so no continuation finishes it, with or without the second-finish slice).
  - One continuation and `stream approve` leave it in review with no approval record, and the approve's status line holds "its checks must run again".
  - `route(['stream', 'run-checks', 'review/<f>.md'], root)` writes a check record (`readVerifyEvidence` passed, timestamp at or after the plan's time). Its status line is "The checks passed; “<name>” waits for your approval."
  - `stream approve` then moves the plan to `done/` with a human-kind record.
- **J5 failing checks leave the plan where it is.** The test script exits 1: the record says `passed: false`, the status line starts "The checks failed", and the plan stays in review.
- **J6 a plan without an open send-back record is refused and nothing is checked.**
  - A built plan in review: refused with "only a plan sent back for a text revision has its checks run again here", and `readVerifyEvidence` is still `null`.
  - The same for a record that carries `finished_again_at`, a pending record, and a corrupt record.
- **J7 references the route refuses**: `../x.md`, `implementation/x.md`, `review/missing.md` and no reference each give their sentence and write no check record.
- **J8 a check record that cannot be written is said**: `.ctoc/state/verify` is a plain file, and the status line holds "could not be recorded".
- **J9 a run that passes on a revision that changed more than text says why it cannot finish.** A declared file is changed, then the route runs: the status line holds "still cannot finish:" and the declared file's name.
- **J10 the route is reached through the real entry** (spawned): `node src/commands/start.js stream run-checks review/<f>.md` on J4's state prints a screen whose text holds the status line.
- **J11 the session's row and the crossing rules** (red before this slice): `src/commands/start.md` names `stream run-checks review/{file}.md` in the Navigation Commands table and in the promote list, and the paragraph "Review to done on recorded evidence" of `docs/ENFORCEMENT.md` names `stream run-checks` among the continuation's live paths.
- **J12 a revised plan with a stored review-stage question file still reaches "Run the checks again".**
  - J1's state plus a valid, classified questions file for `review/<f>.md` written before the send-back (`precompute.writePlanQuestions`, as the second-finish slice's K12 makes it), whose `planMtimeMs` stamp is set strictly below the plan file's final time as `fs.utimesSync` leaves it; the test asserts that inequality before it opens the screen, so a stamp at or above it (which reads as ready, not out of date) fails the fixture, not the product. `planQuestionsStatus` reads it as out of date (`src/lib/streaming-precompute.js` lines 808-813), so `nextUnansweredQuestion` returns nothing (`src/lib/streaming-gate.js` line 462) and the screen takes its gate branch: the first question's first option is "Run the checks again", with the J1 action (green after this slice, red before).
  - The same plan with a questions file written after its last change, holding one unanswered question: the first question is that product question, as the screen's rule puts it first (`src/lib/streaming-gate.js` lines 1691-1704), and `route(['stream', 'run-checks', 'review/<f>.md'], root)` still runs and records the checks. After `stream answer` on that question, `plan review/<f>.md` offers "Run the checks again" first.
- **J13 the checks and the validation pass but the menu's finish stopped part-way.** J4's state without the question that needs the owner, then the record's `admission_used_at` set through `writeSendBack` on top of the real send-back (the state the second-finish slice's crossing leaves when it stops after spending the admission). `stream run-checks` answers exactly "The checks passed, but the menu’s finish of “<name>” stopped part-way and its one admission is spent; it finishes now only on your approval."; the plan stays in review.

**Coverage target:** every branch of `streamRunChecks` (J4-J10, J12, J13) and of `checksMustRunAgain` (J1-J3, J2b, J2c: a changed declared file, a changed frontmatter, a record not compared, a fresh record, and a `verifyEvidence` that is missing). The suite floor is `.ctoc/coverage-baseline.json` `minPct`.

### Security Review

| Check | Result |
|---|---|
| Path traversal | Pass. The reference must match `GATE_REF` (`src/lib/menu-screens.js` line 3040: a stage word and a plain file name) and start with `review/` before any join; the check record is keyed by that same plain name (`verifyEvidencePath`, `src/lib/step-13-verify.js` lines 915-917). |
| Who may refresh a check record | Only a plan with an open, completed send-back record; a built plan's record is refused (J6). A background agent running the route is not refused while `RECORD_REFUSALS_OFF` is on; with the switch on, `subagentMayRunRoute` does not list it, so it is refused (`src/hooks/protect-records.js` lines 772-787). Either way the record is the real result of the real checks, never a hand-written one. |
| Command injection | Pass. No new process: `runVerify` runs the project's own scripts exactly as a build's completion does. |
| Error messages | Pass. Messages are control-stripped and capped; the check record's summary is the checks' own. |
| Denial of service | The route runs the whole suite in the menu process, as a build's completion already does; the session runs it with a long timeout or in the background (start.md row). |

## Wiring — the live call sites

- **The root.** `/ctoc:start` → `src/commands/start.md` (the new row) → `node src/commands/start.js stream run-checks review/<file>.md` → `main()` → `route()` case `stream` (`src/lib/menu-screens.js` lines 3400-3414) → `streamRunChecks` → `persistVerifyResult`, then `continueAfterCrossing`.
- **The offer.** `route()` case `plan` (lines 3456-3462) → `streamingGate.planDecisionScreen` → `checksMustRunAgain` → the "Run the checks again" option, whose action is the route above.
- No new export.

## Decisions Taken Under Ambiguity — technical planning

- **The fresh check is `persistVerifyResult`, called by a new route.** The owner chose "run the full check again"; its recorder is `persistVerifyResult`; the completion's other acts are a build's (see Architecture Decision). The parent's In Scope names the same route, `stream run-checks review/<file>.md`, through `persistVerifyResult`.
- **The route runs the continuation when the checks pass.** The owner chose that the menu finishes a revised plan on its recorded evidence (answers line 274). Without the continuation here, the plan would wait in review for an unrelated completion, so the owner's act would look like it did nothing. That is the defect the first operating lesson names.
- **The run is offered, and then leads with the one "Recommended", whenever the record is open, completed and compared, the frontmatter is unchanged, and the check record is missing, failed or stale.** A changed declared file does not withhold it. The count sync rewrites `CLAUDE.md` and `README.md`, which many plans declare, so a declared file changing during a revision is likely; without the run such a plan could never refresh its stale check record from its screen, and "Approve anyway" would override the stale full check as well as the changed file. The owner's answers are a full re-check and the override as the only way past a changed file; the run keeps both (J2, J2b). A changed frontmatter withholds it: a change of scope is a new plan and no run can finish it (J2c). `streamRunChecks` already runs in that state (J9), so only the offer changes.
- **A stored question file needs no new option; the route reaches "Run the checks again" as the screen stands (J12).** Read in the code: a file stored before the send-back is out of date once the send-back rewrites the plan (`src/lib/streaming-precompute.js` lines 808-813), so no product question is asked and the gate branch offers the run. A fresh file with an unanswered question is asked first, by the screen's rule that the product question always leads (`src/lib/streaming-gate.js` lines 1691-1704); its ride-along already holds four options (lines 1793-1810), so there is no room for a fifth, and the run appears once the question is answered. The route itself never reads stored questions, so it runs either way.
- **When the checks and the validation pass and the plan did not finish, the status reads the record.** Only the record tells "waits for your approval" from "the menu's finish stopped part-way and its one admission is spent" (`admission_used_at`, defined in the send-back-command slice's shape and written by the second-finish slice). Saying "waits" in the second case would hide a failed crossing.
- **`docs/ENFORCEMENT.md` names the new live path in this slice**, where the path is created, so the document is never behind the code.
- **No new task kind.** A task kind would add a registry kind, a scheduler path and an agent brief for one synchronous call. The full suite already runs synchronously in the menu on a build's completion (`src/lib/menu-screens.js` line 2743 → `completeTaskPlan`).

## Execution Plan

### Step 8: TEST
- [ ] Write `tests/a-revised-plans-checks-run-again.test.js` exactly as the Test Plan says, before any source change. Take J3's pinned options from a run of the unchanged code.
- [ ] Run `node --test tests/a-revised-plans-checks-run-again.test.js`. Record per case red with its reason, or green where marked (J3). A case green where red is expected does not test the change: fix it first.

### Step 9: PREPARE
- [ ] Re-read every cited line of `src/lib/menu-screens.js`, `src/lib/streaming-gate.js`, `src/lib/step-13-verify.js`, `src/lib/streaming-precompute.js`, `src/lib/actions.js`, `src/commands/start.md` and `docs/ENFORCEMENT.md`. If the screen-offer slice is already built, re-read its changes to `planDecisionScreen` and to `src/commands/start.md`; if the hook-refusal slice is, re-read its `docs/ENFORCEMENT.md` additions. Where the code differs, follow the code and record the difference.
- [ ] Run `node --test tests/streaming-gate.test.js tests/plan-question-screen.test.js tests/menu-task-wiring.test.js tests/plans-keep-moving-without-the-human.test.js tests/a-text-revision-changes-text-only.test.js tests/ctoc-audit-w05-verify-evidence.test.js` and record the baseline.

### Step 10: IMPLEMENT
- [ ] `src/lib/menu-screens.js`: the route line, `streamRunChecks`, the continuation's comment.
- [ ] `src/lib/streaming-gate.js`: the constants, `checksMustRunAgain`, the gate-branch changes, the header sentence.
- [ ] `src/commands/start.md`: the row and the promote list.
- [ ] `docs/ENFORCEMENT.md`: `stream run-checks` among the continuation's live paths.
- [ ] Rerun the Step 8 file until green, then the Step 9 baseline. An existing assertion that fails is read before anything changes; the code is wrong until proven otherwise.

### Step 11: REVIEW
- [ ] Dispatch `iron-loop-critic` with these attacks:
  - a plan that is not a revised plan whose check record this route refreshes;
  - a screen with two "Recommended" options, or with more than four;
  - a status line that claims the plan finished when it did not;
  - a path through which the route crosses a gate other than by the continuation's own rules.

### Step 12: OPTIMIZE
- [ ] Confirm the screen's added cost is one pure function over a validation result already computed. Confirm the route's cost is the full check, as specified. No change is expected.

### Step 13: SECURE
- [ ] Dispatch `security-scanner` on the diff with the Security Review table. Scope: the reference test before the join, the refusal for a plan without an open record, no new process, messages capped and stripped.

### Step 14: VERIFY
- [ ] Run `npm test`: `# fail 0`, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [ ] Run `npx eslint --max-warnings 0 src/lib/menu-screens.js src/lib/streaming-gate.js tests/a-revised-plans-checks-run-again.test.js` and `npm run typecheck`: both clean.
- [ ] Run `node --test tests/export-reachability.test.js tests/reachability.test.js tests/false-green-fence.test.js tests/gate-numbers-fence.test.js tests/instruction-surfaces-say-the-moment.test.js tests/menu-task-wiring.test.js`: all green, no baseline changed.

### Step 15: DOCUMENT
- [ ] The JSDoc of `streamRunChecks` and `checksMustRunAgain`, the two "four live paths" sentences, the start.md row and list, and the `docs/ENFORCEMENT.md` live path.
- [ ] Update the count lines with `node -e "const r=require('./src/scripts/release.js');console.log(JSON.stringify([r.updateDocCountsInClaudeMd(process.cwd()),r.updateDocCountsInReadme(process.cwd())]))"`. Read the diff of `CLAUDE.md` and `README.md`: only count lines differ, and `CLAUDE.md` stays at or under 15,000 bytes.

### Step 16: FINAL-REVIEW
- [ ] Dispatch `iron-loop-critic` against the parent's scenario "A check record older than the last change keeps the plan in review" and the owner's answer "Run the full check again". Each box quotes the test that proves it and its result.
- [ ] Put in front of the owner, from the built tree on a temporary project, in full: a revised plan's screen offering "Run the checks again", and the route's status line after a pass and after a failure.
