---
title: "A finished plan can be sent back for a text-only revision"
type: feature
status: refined
created: 2026-10-21
priority: HIGH
effort: medium
depends_on: ctoc-is-built-with-ctoc-a-plan-in-the-build-queue-can-be-sent-back-to-technical-plan
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
acceptance_criteria_count: 14
risk_level: HIGH
---

# A finished plan can be sent back for a text-only revision

## Problem Statement

The owner's decision of 2026-10-21 was "build the route first". A plan that has finished, in `plans/done/`, sometimes needs its text changed afterwards: private paths must become placeholders before the plan may go on GitHub, or a sentence in it turns out to be wrong. CTOC has no menu route for that. Both ways left are off the menu. A hand edit of approved text breaks the plan's approval record, and today nobody is told at the moment of the edit, because the gate check that would notice is not registered in the hooks file CTOC loads ("What the source says today", item 6). The backfill script writes a migration record that nobody approved. So the owner, and the coordinator session that drives the menu for him, cannot correct a finished plan through the menu, which is exactly the by-hand workaround the parent vision exists to remove.

The triggering case is the finished plan "A placeholder path in a plan is not a missing file" (`plans/done/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s17-a-placeholder-path-is-not-a-missing-file.md`). 34 of its lines hold a home-folder or scratch path, all after its `## Execution Record` heading at line 671: lines 742, 743, 786–795, 860–869, 979, 980, 993–996, 999, 1000 and 1055–1058 (the stub's list is corrected under "What the source says today", item 8). Those paths must be replaced by placeholders before the plan may go on GitHub. Never copy those paths into this plan or its slices; cite line numbers only.

The need:
1. A menu route sends a finished plan back to review for a text-only revision.
2. The send-back is recorded in the transitions log, `.ctoc/logs/transitions.json`, written by `src/lib/transition-log.js`.
3. The plan finishes again on a fresh check.
4. The new approval record is a real approval: the menu's own crossing on recorded evidence, or the owner's approve. It is never a migration record.

Related plans:
- "Finished plans are not sent back after an update" (`plans/functional/finished-plans-are-not-sent-back-after-an-update.md`, parked). It stops CTOC from sending finished plans back by itself after an update. This plan is the deliberate send-back, the other direction.
- "The approval re-record script cannot write an approval nobody gave" (`plans/functional/the-approval-re-record-script-cannot-write-an-approval-nobody-gave.md`). It covers the backfill script, which this plan must not lean on.
- "A heading inside a code block does not end the approved section" (`plans/functional/a-heading-inside-a-code-block-does-not-end-the-approved-section.md`), filed in the same pass. Both plans read `src/lib/approval-ledger.js`. How the two interact is under "Order relative to the plan on headings inside code blocks".
- "A plan in the build queue can be sent back to technical planning and keeps its title" (`plans/todo/ctoc-is-built-with-ctoc-a-plan-in-the-build-queue-can-be-sent-back-to-technical-plan.md`). It turns `claude:reject` into a real menu command for build-queue plans and fixes the title readers that show "REVISION 1". This plan extends that command to finished plans, so it is named in `depends_on`.
- "The done check finds the build record by its evidence, not by its heading name" (`plans/functional/the-done-check-finds-the-build-record-by-its-evidence-not-its-name.md`). Nine finished plans spell their execution-plan heading in a way the review-to-done check cannot read; sent back, such a plan would be refused at the finish for as long as that defect stands.

## What the source says today

Read by the product owner in the main checkout on 2026-10-21, release 6.14.134 (the `VERSION` file). This agent holds no shell and ran nothing. "Verified by reading" means the cited lines were opened and say what is written here; it never means the behaviour was observed. The scenarios that drive the real menu are the runs that confirm it.

### The stub's claims, checked

1. **A finished plan's screen offers no send-back.** The stub says verified by running the menu. Verified by reading as well (re-cited on 2026-10-22 against the tree after the build-queue plan landed): a plan outside the three decision stages takes the "not at a gate" branch of the plan screen (`src/lib/streaming-gate.js` lines 1773–1788), which offers Discuss, View/Edit and Delete, plus the build-queue send-back for a plan in the build queue only (line 1782). The screen names a plan by its own title (`planOwnTitle`, lines 187–204), which since that plan landed skips a `# REVISION <n>` block up to its closing `---` (line 197). The triggering plan's first level-1 heading is `# REVISION 1` (its line 19), so the screen now shows its own title, at its line 28.
2. **No decision step after done.** Verified by reading: `GATE_SOURCE_ORDER` lists review, implementation and functional only (`src/lib/streaming-gate.js` line 81).
3. **The stale-plan cleanup sends nothing back from done.** Verified by reading: `REVERT_MAP` (`src/lib/stale-cleanup.js` lines 108–112) maps review, implementation and functional only.
4. **The backfill script writes a migration record, not an approval.** Verified by reading: the script header (`src/scripts/ledger-backfill.js` lines 32–43; the stub cited 32–41, and the sentence on the record's kind ends at line 43). `backfillEntry` (`src/lib/approval-ledger.js` lines 1048–1075) writes a backfilled human-kind record, and `entryKind` (lines 954–978) classifies it as backfilled, never as the human.
5. **Where the reported refusal of that script came from.** Not verified, and kept so. By reading: `runsBackfillBeyondVision` (`src/hooks/protect-records.js` line 674) is called only at line 1210, after `if (RECORD_REFUSALS_OFF)` at line 1181 has already returned, and line 1170 sets the switch to `true`. Two background-agent checks run before the switch, whatever it says: `sweepBypassRefusal` and `expansionRefusal` (lines 1175–1177). Both pass a command that is one plain call, and both treat the plugin-root variable as plain text (lines 234–240 and 1079–1084). So a plain call of the script would not be refused by them, while a command that is not one plain call, holds another `$` or a backtick, and names a runtime would be. Which case applied cannot be settled without the exact command, which was not recorded. Never run `--plan` to find out: it writes an approval record.
6. **A hand edit inside the approved text breaks the record.** Verified by reading. `contentMatches` (`src/lib/approval-ledger.js` lines 607–623) compares the specification digest computed by `computeSpecHashWith` (lines 427–504). Its body loop is lines 459–480; the stub cited 466–474, the heading part of it. The triggering plan's record is a human-kind record of specification scope for the step from review to done (read in its file under `.ctoc/approvals/`). An edit to approved text makes that record stop matching, and the residency check (`classifyResidency`, `src/lib/approval-residency.js` lines 160–238) then refuses the plan in done.
   - Added: an edit inside an excluded section, such as the execution record or a decisions section, changes no digest and breaks nothing (lines 466–478).
   - Added: the gate check that runs the residency check before every tool call, `src/hooks/human-gate-check.js`, is not registered in `hooks/hooks.json`, which registers only `src/hooks/protect-records.js`. Verified by reading that file; that Claude Code loads exactly this file is the file's own description, not checked here. So a hand edit that breaks a finished plan's record is noticed only when another caller of `classifyResidency` runs (`src/lib/iron-loop-enforcer.js` line 419, `src/lib/stale-cleanup.js` line 332). Which of those runs in a session was not traced.
7. **Why some path lines count as approved text.** Verified by reading both the code and the triggering plan. The body loop tracks no fenced code blocks. Line 842 (`# 69 creation-claim errors`, inside the fence of lines 772–843) is read as a level-1 heading and ends the excluded record that opened at line 671. Line 915 (inside the fence of lines 847–916) is a second one. From line 842 on, only lines 1003–1007 are excluded again, under the heading "Decisions taken under ambiguity while building", which matches an excluded name by prefix.
8. **The count, corrected.** 34 lines hold a path, as the stub says, but its list was off in two places. Line 729 names the scratchpad folder in words and holds no path. Lines 997 and 998, inside the stub's range 993–1000, hold none. The 34 are lines 742, 743, 786–795, 860–869, 979, 980, 993–996, 999, 1000 and 1055–1058. Of them, 12 (742, 743, 786–795) sit in the excluded record, and 22 (860–869, 979, 980, 993–996, 999, 1000, 1055–1058) count as approved specification today. Verified by reading: a search of that one file for home-folder, scratch and temporary-folder path patterns matched 35 lines, each was read, and line 729 is the one without a path.

### Found while refining (all verified by reading)

Items 9 to 15 were re-cited on 2026-10-22 against the tree after the build-queue plan landed; the facts are unchanged unless a sentence says so.

9. **The send-back function already reaches done.** `rejectPlan` (`src/lib/actions.js` lines 867–939) moves any plan one stage back along the stage order (`src/lib/gate-order.js` line 21; the target at `src/lib/actions.js` lines 872–888), so a finished plan would go to review.
   - It rewrites the frontmatter through `upsertMarkerFields` (`src/lib/frontmatter-merge.js` lines 258–272): it adds the revision number, the reason and the rejected tag, strips the approval-marker fields, merges stacked blocks, and keeps every other field, `files:` included (lines 251–252).
   - It inserts a `# REVISION <n>` heading and the reason above the plan's own title, deletes the plan's approval record file (line 935, through `removeEntry`, `src/lib/approval-ledger.js` lines 1126–1130), then moves the file (line 938). Its own header comment says this loses the record that the approval ever existed (`src/lib/actions.js` lines 854–856). The owner answered that the send-back keeps a copy first, in its send-back record ("Questions for the owner").
   - It writes no transitions-log row. `logTransition` (`src/lib/transition-log.js` line 68) has one caller, `approvePlan` (`src/lib/actions.js` line 580); search: pattern `logTransition\(` over `src/`, two files, two lines.
   - One menu route calls `rejectPlan` today, for build-queue plans only: search: pattern `rejectPlan\(` over `src/`, two files and four lines, the definition, the call in `sendBackFromBuildQueue` (`src/lib/actions.js` line 1448), and two calls in the terminal review tab (`src/tabs/review.js` lines 121 and 152). That route is the plan "A plan in the build queue can be sent back to technical planning and keeps its title", which made `claude:reject` a menu command for build-queue plans and refuses every other stage.
10. **The menu cannot finish a sent-back plan on its evidence today.** `crossOnEvidence` (`src/lib/streaming-gate.js` lines 763–802) finishes a plan only when its approval record ends at the build queue (line 768), the record of its admission to building. A plan sent back from done has no record at all, because the send-back deleted it (item 9). Only the owner's approve (`approvePlan`, `src/lib/actions.js` lines 423–609) can finish it, and that writes a human-kind record.
11. **The fresh check is a whole-project check.** The review-to-done check (`validateReviewToDone`, `src/lib/plan-validator.js` lines 1326–1439) requires every required step ticked (lines 1373–1390) and a passing check record no older than the plan file's last change (lines 1392–1428). The check record has one producer, `persistVerifyResult` (`src/lib/step-13-verify.js` lines 938–956); search: pattern `persistVerifyResult\(` over `src/`, two files, the definition and one call in `completeExecution` (`src/lib/actions.js` line 1530). It runs `runVerify` over the whole project, not over this plan's files. `completeExecution` (line 1480) is reached through `completeTaskPlan` (`src/lib/actions.js` line 1840 onward, its in-progress-or-review lookup at lines 1866–1882), which `menu task complete <id>` calls for a build task (`src/lib/menu-screens.js` line 2743), and which already accepts a plan that sits in review. What no route does today is start that completion for a plan sent back from done, which has no build task; whether a build task can be recorded for a plan already in review was not traced. So after any text revision the old record is stale, and even the owner's approve is refused until a fresh check runs, unless he approves anyway past the failed check, which is recorded as an override.
12. **A plan in review grants no edit permission.** Only plans in the build queue and in the build are classified for edit permission (`COVERAGE_STAGE_EDGE`, `src/lib/approval-residency.js` lines 89–94). A plan sent back for revision cannot be used to widen what may be edited.
13. **What the write protection guards, and against which tools.** The loaded write protection names the approval records (`.ctoc/approvals/`), the check records (`.ctoc/state/verify/`) and the owner's recorded answers (`src/hooks/protect-records.js` lines 209–211; `src/commands/start.md` line 67).
   - Editing tools: a write into the approval-records folder is refused for every caller, the main session included, whatever the record-refusal switch says (lines 1235–1245; `isProtectedLedgerPath`, `src/hooks/PreToolUse.Edit.js` lines 240–254).
   - The shell: the record-write refusals (lines 1205–1210) are reached only after `if (RECORD_REFUSALS_OFF)` (line 1181) has returned, and line 1170 sets that switch to `true`, on the owner's order of 15 October (lines 1179–1180). So today no shell write of an approval or check record is refused as a record write. The background-agent checks before the switch (lines 1173–1177, item 5) still run.
   - Plan files and the transitions log `.ctoc/logs/transitions.json` are not guarded at all, so a row in that log or a mark in a plan proves nothing on its own.
   - In this plan, "the guarded folder" means a folder with exactly this protection. The owner answered that a background agent's shell write of the send-back record is refused whatever the record-refusal switch says ("Questions for the owner"); the hook-refusal slice builds it.
14. **Going back from review leads to the build, never to a new snapshot.** `rejectPlan` moves a plan one stage back along the stage order (`src/lib/gate-order.js` line 21; `src/lib/actions.js` lines 872–888), so a plan in review goes to the build, `in-progress`. The review screen's two send-back options go to functional planning ("wrong thing") or technical planning ("wrong way") (`src/lib/gate-words.js` lines 154–165; `src/lib/streaming-gate.js` lines 1739–1747). None of them takes a new snapshot of anything.
15. **The owner's approve past a failed check exists and is recorded.** One validation result, `validateTransition` for review to done, which calls `validateReviewToDone` (`validateTransition`, `src/lib/plan-validator.js` lines 1502–1530, the review-to-done entry at line 1519), decides three things:
   - whether the review screen offers the approve or only "Check validation" (`src/lib/streaming-gate.js` lines 1708–1714 and 1737);
   - whether the menu's continuation may finish the plan on its evidence (line 1159, its validation at line 1121);
   - whether `approvePlan` crosses (`src/lib/actions.js` lines 448–464).
   On the validation screen, `validate review/<file>.md`, a failed plan's last option is "Approve anyway", which runs `claude:approve review/<file> --override` (`src/lib/menu-screens.js` lines 2203–2216). `approvePlan` then crosses through `stampAndLedger` (line 514). That writes a record with `approved_by: 'human'` (lines 347–369), then adds `override: true` and the owner's reason to it (lines 378–390) and to the plan marker (line 282, in `addApprovalMarker`, lines 274–285). The transitions-log row marks the override too (line 595). `entryKind` reads such a record as human-kind, because it carries no `advanced_by` and no `backfilled` (`src/lib/approval-ledger.js` lines 970–976). The residency check never looks at the override field and accepts a human-kind record in done whose digest matches (`src/lib/approval-residency.js` lines 160–237). The override passes every failed check of that validation at once, not one chosen check.

## Business Alignment

**Job to Be Done:** When a finished plan's text must change, for example private paths that must become placeholders before it goes on GitHub, I want to send it back from its own plan screen for a text-only revision and have it finish again on a fresh check, so I can correct the record without a hand edit that silently breaks its approval and without a migration record nobody approved.

**Impact Map:**
- **Goal:** CTOC is built entirely through its own menu, with no by-hand workaround (the parent vision's problem statement and its success criterion "Real routes, not snapshots").
- **Actor:** the owner, who decides that a finished plan goes back, and the coordinator session that drives the menu for him. Both are named in the vision's target users.
- **Impact:** finished plans are corrected through the menu instead of by hand edits or the backfill script, and every finished plan's record is again either the owner's approval or the menu's own crossing on recorded evidence.
- **Deliverable:** a text-revision option on a finished plan's screen, the send-back command it runs, a text-only check, a fresh check, and a second finish that writes a real approval record.

**Alignment checks:**
1. The goal traces to the vision's problem statement, whose frictions all pushed the coordinator off the menu: yes.
2. The actors are in the vision's target users ("the owner … and the CTO Chief and background agents that work for him"): yes.
3. The impact is observable: a finished plan moves to review and back through menu commands, and its approval record's kind can be read: yes.
4. The deliverable is one functional area, the round trip of a finished plan through review: yes.

**Overlap check.** Siblings found with the pattern `parent_vision: "vision/ctoc-is-built-with-ctoc.md"` over `plans/`: 13 files. Two touch the same code: "A plan in the build queue can be sent back to technical planning and keeps its title" sends build-queue plans back to technical planning, a different stage and a different user-facing behaviour, through the command this plan extends; "A heading inside a code block does not end the approved section" changes what the digest covers, which this plan does not. Neither describes sending a finished plan back, so there is no scope overlap to escalate.

## User Stories

**Sent back for a text revision.** **As** the owner, **I want** to send a finished plan back to review from its own plan screen with my reason, **so that** I can change its text, such as replacing private paths with placeholders, without a hand edit or a migration record.

**Finished again on a fresh check.** **As** the owner, **I want** the revised plan to finish again only on a check recorded after its last change and with a real approval record, **so that** every plan in `plans/done/` is still vouched for by my approval or by the menu's own crossing on recorded evidence.

**Held to text only.** **As** the owner, **I want** a revision that changes the plan's frontmatter or any file it declares to be refused at the finish unless I approve it past that refusal myself, recorded as an override, **so that** sending a finished plan back can never change scope or code under the record of a finished plan.

### INVEST check

| Story | Independent | Negotiable | Valuable | Estimable | Small | Testable |
|---|---|---|---|---|---|---|
| Sent back for a text revision | qualified: it extends the `claude:reject` command from "A plan in the build queue can be sent back to technical planning and keeps its title", named in `depends_on` | yes: says what is offered and recorded, not how | yes: no hand edit of a finished plan | yes: one screen branch, one command, one log row | yes | yes: five scenarios |
| Finished again on a fresh check | qualified: needs a plan that was sent back, ordered after the first story inside this plan | yes: the fresh check and the finisher are the owner's answers | yes: the record stays real | yes: both questions are answered | yes | yes: four scenarios |
| Held to text only | qualified: needs the send-back's snapshot from the first story | yes: the enforcement is the owner's answer | yes: no new way to change code under a finished record | yes: one comparison at the finish | yes | yes: five scenarios |

## Acceptance Criteria

"Finished" is `plans/done/`; "review" is `plans/review/`. Every scenario drives the real entry point, `node src/commands/start.js` with the menu's words or `route()` in `src/lib/menu-screens.js`, on a temporary project with real approval and check records written by CTOC's own writers. None asserts only the structure of a screen. The scenarios follow the recommended answer of each question under "Questions for the owner"; the line in brackets under a scenario says what changes under another answer. The stub's outline (a menu route; a row in `.ctoc/logs/transitions.json`; a fresh check; a real record, never a backfilled migration record; a change beyond plan text refused) is carried by the scenarios below.

### Sent back for a text revision

- [ ] **Scenario: A finished plan's screen offers the text revision**
  Given a finished plan titled "Placeholders replace private paths", with its human-kind approval record and no question waiting for it
  When the owner opens it with `plan done/<file>.md`
  Then its question offers Discuss, View/Edit, Delete and one option to send it back for a text revision, whose description says it returns to review for a change of its text only and that a change of code or scope is a new plan
  And no option label or description names a stage folder

- [ ] **Scenario: The send-back moves the plan to review with its reason and one log row**
  Given that finished plan
  When the owner takes the text-revision option with the reason "replace private paths with placeholders"
  Then the plan file is in review and no longer in `plans/done/`
  And the plan carries the reason
  And `.ctoc/logs/transitions.json` gains exactly one row that names the plan, from done to review, with the owner as actor, marked as a send-back for a text revision
  And the record that let the plan sit in done no longer vouches for it there
  And a record in the guarded folder ("What the source says today", item 13) holds the send-back: the plan's frontmatter as the send-back left it and one digest per file its `files:` declares

- [ ] **Scenario: A send-back without a reason is refused**
  Given that finished plan
  When the send-back command runs with an empty reason
  Then it prints one sentence saying a reason is required, and no dashboard
  And the plan file is byte-identical in `plans/done/`, its approval record is byte-identical, and the transitions log gains no row

- [ ] **Scenario: A plan of the same name already in review is refused before any write**
  Given that finished plan and a different plan file of the same name in review
  When the owner takes the text-revision option with a reason
  Then it prints one sentence saying a plan of that name is already in review
  And both plan files and the finished plan's approval record are byte-identical, and the transitions log gains no row

- [ ] **Scenario: A background agent's send-back is refused**
  Given that finished plan
  When the send-back command reaches CTOC's write protection from a background agent, as hook input with a non-empty agent id
  Then the protection refuses it with a sentence saying only the owner sends a finished plan back
  And the plan file is byte-identical in `plans/done/`
  (Under "the coordinator session too", the main session's call without the owner's reply is allowed and its row names the coordinator as actor; a background agent stays refused. Under "any session or agent", this scenario is replaced by one asserting the row names the agent.)

### Finished again on a fresh check

- [ ] **Scenario: The revised plan finishes again on its fresh check**
  Given a finished plan shaped like the triggering plan: an execution record whose fenced build log holds a line starting with `# `, followed by lines holding a made-up home-folder path (fixture text, never a real path)
  And the owner sent it back, and only those lines were changed to the placeholder `<home>`
  And the full check ran after that change and passed
  When the menu's continuation runs (`menu task complete <id> --continue` on another finished task)
  Then the plan is in `plans/done/`
  And its new approval record is a pipeline-kind record whose evidence names the send-back, the text-only check and the check record, with no backfilled flag
  And the residency check accepts the plan in done with that record
  And `.ctoc/logs/transitions.json` gains one row from review to done
  (Under "only the owner's approve": the continuation leaves the plan in review, and the scenario "The owner's approve finishes a revised plan with a human-kind record" is the only way it finishes.)

- [ ] **Scenario: A check record older than the last change keeps the plan in review**
  Given a plan sent back for a text revision whose text changed after its last check record was written
  When the menu's continuation runs, and when the owner approves it with `stream approve review/<file>.md`
  Then the plan stays in review
  And the screen says in one sentence that the check must run again
  And no approval record is written
  (His approve-anyway past the failed check stays as it is today, recorded as an override. Under "the text-only check alone", the old check record is accepted when the text-only check passes, and this scenario holds only for a plan whose text-only check fails.)

- [ ] **Scenario: A send-back row without the protected record never finishes the plan**
  Given a plan placed in review by hand, with a transitions-log row and a line in the plan that both claim a send-back from done, but no send-back record in the guarded folder
  And a passing check record written after the plan's last change
  When the menu's continuation runs
  Then the plan stays in review
  And no approval record is written

- [ ] **Scenario: The owner's approve finishes a revised plan with a human-kind record**
  Given a plan sent back for a text revision, changed in its text only, with a passing check recorded after the change
  When the owner approves it with `stream approve review/<file>.md`
  Then the plan is in `plans/done/` with a human-kind approval record of specification scope and no backfilled flag
  And `.ctoc/logs/transitions.json` gains one row from review to done with the owner as actor

### Held to text only

- [ ] **Scenario: A changed frontmatter is refused at the finish**
  Given a plan sent back for a text revision, and one `files:` entry added after the send-back
  When the menu's continuation runs, and when the owner approves it
  Then the plan stays in review
  And one sentence names the frontmatter as changed since the send-back and says a change of scope or code is a new plan
  And no approval record is written
  (His approve-anyway stays available as today, recorded as an override.)

- [ ] **Scenario: A changed declared file is refused at the finish**
  Given a plan sent back for a text revision whose `files:` declares `src/lib/example.js`, and one byte of that file changed after the send-back
  When the menu's continuation runs, and when the owner approves it
  Then the plan stays in review
  And one sentence names `src/lib/example.js` as changed since the send-back
  And the plan's screen offers "Check validation" in place of the approve
  And no approval record is written
  (Under "the frontmatter only", this scenario does not apply and the plan finishes.)

- [ ] **Scenario: The owner's approve anyway finishes a revision whose declared file changed**
  Given a plan sent back for a text revision whose `files:` declares `src/lib/example.js`, one byte of that file changed after the send-back, and a passing check recorded after the plan's last change
  When the owner opens its validation screen with `validate review/<file>.md` and takes "Approve anyway" with the reason "the change is another plan's build"
  Then the validation screen listed `src/lib/example.js` as changed since the send-back as its only error
  And the plan is in `plans/done/` with a human-kind approval record that records the override and that reason, with no backfilled flag
  And the residency check accepts the plan in done with that record
  And `.ctoc/logs/transitions.json` gains one row from review to done with the owner as actor and the override marked
  (No route takes a new snapshot of the declared files. Under "the frontmatter only", this scenario does not apply.)

- [ ] **Scenario: A change of plan text alone passes the text-only check**
  Given a plan sent back for a text revision
  When one line of its specification prose and one line of its execution record are replaced, and nothing else changes
  Then the text-only check passes and names no changed item

- [ ] **Scenario: The send-back's own rewrite is not counted as a change**
  Given a finished plan whose frontmatter has two stacked blocks and the approval-marker fields
  When the owner sends it back for a text revision and nothing else is edited
  Then the text-only check passes, because it compares with the frontmatter as the send-back left it

## Scope

### In Scope
- The text-revision option on a finished plan's screen ("A finished plan's screen offers the text revision").
- The send-back command for a finished plan, one stage back to review, extending the `claude:reject` command that "A plan in the build queue can be sent back to technical planning and keeps its title" creates. It requires a reason and refuses an empty reason, a same-name plan already in review, and a background agent ("The send-back moves the plan to review with its reason and one log row" and the three refusal scenarios).
- One transitions-log row for the send-back and one for the second finish, each telling a reader that the move was a text revision.
- The send-back record in the guarded folder ("What the source says today", item 13): the frontmatter as the send-back left it, and one digest per declared file ("The send-back's own rewrite is not counted as a change").
- The text-only check at the finish, as one more failure of the review-to-done validation for a plan that carries a send-back record. The review screen, the menu's continuation and the owner's approve all read that one result, and his approve anyway passes it as a recorded override ("What the source says today", item 15). This changes the review-to-done validation, which is gate logic: the change the owner approved in his answers to "How is text only enforced", "What counts as the fresh check" and "Who finishes a revised plan again" (`.ctoc/streaming/answers.jsonl` lines 270, 272 and 274) ("A changed frontmatter is refused at the finish", "A changed declared file is refused at the finish", "The owner's approve anyway finishes a revision whose declared file changed", "A change of plan text alone passes the text-only check").
- The fresh check for a plan sent back from done: a menu route, `stream run-checks review/<file>.md`, that runs the full check through `persistVerifyResult` and records the check record, for a plan sent back from done (it has no build task) ("A check record older than the last change keeps the plan in review").
- The second finish with a real approval record: the menu's crossing on recorded evidence, admitted only by the protected send-back record, and the owner's approve ("The revised plan finishes again on its fresh check", "A send-back row without the protected record never finishes the plan", "The owner's approve finishes a revised plan with a human-kind record").
- The refusal of the send-back for background agents in CTOC's write protection, holding whatever the record-refusal switch says, as the sweep confirmation already does (`src/hooks/protect-records.js` lines 1173–1174), and of a background agent's shell write of the send-back record. These are the hook changes the owner approved in his answers to "Who may send a finished plan back" and "Does the send-back record get a shell refusal of its own" (`.ctoc/streaming/answers.jsonl` lines 268 and 276).
- The place of the send-back record: a folder of its own inside the approval records, `.ctoc/approvals/sent-back/`, the owner's answer to "Where is the send-back record stored" (`.ctoc/streaming/answers.jsonl` line 280). It must not read as an approval entry; the two readers that list `.ctoc/approvals/` read only its top level and keep only names ending in `.json` (`src/lib/sufficiency-audit.js` line 154, `src/scripts/ledger-backfill.js` line 239), and the send-back-command slice tests that (its F16). The precedent the gate critic weighed, the migration marker `.migration-complete.json` that `src/lib/gate-migration.js` (line 80) places in that folder with a leading dot, was the other option and was not chosen.

### Out of Scope
- What the specification digest covers, fenced headings included: "A heading inside a code block does not end the approved section".
- Changing a finished plan's code, `files:` or other frontmatter: a new plan.
- The backfill script and its migration records: "The approval re-record script cannot write an approval nobody gave". This plan never calls it.
- CTOC sending finished plans back by itself after an update: "Finished plans are not sent back after an update", the other direction.
- The `claude:reject` command for build-queue plans and the title readers that show "REVISION 1": "A plan in the build queue can be sent back to technical planning and keeps its title".
- The execution-plan heading spellings the review-to-done check cannot read: "The done check finds the build record by its evidence, not by its heading name".
- Whether the background-agent menu refusal as a whole is switched back on: "The background-agent protection is measured before the owner decides whether it is on". Only the refusal of this one command is in scope here.
- Revising the triggering plan "A placeholder path in a plan is not a missing file" itself. That is a use of this route, taken by the owner in the menu; this plan's tests use a fixture of its shape and never touch the real file.
- Sending a finished plan further back than review. The review screen's existing send-back options already go further.
- Taking a new snapshot of a plan already in review: not planned. No route does it today ("What the source says today", item 14), and this plan adds none (Decisions Taken Under Ambiguity).

## Questions for the owner

All seven questions are answered. The owner took the recommended option of each on 2026-10-21 (`.ctoc/streaming/answers.jsonl` lines 268–280, ref `functional/a-finished-plan-can-be-sent-back-for-a-text-only-revision.md`, option `1` each; the questions are in `.ctoc/streaming/questions/functional__a-finished-plan-can-be-sent-back-for-a-text-only-revision.md.json`). They are settled, and the acceptance criteria above are written for them.

- **Who may send a finished plan back?** Answered: only the owner's own reply in the menu, with background agents refused by the write protection (the hook-refusal slice) and the session's recipe running the send-back only on his own reply (the send-back-command slice; the screen-offer slice adds the option it names).
- **How is "text only" enforced?** Answered: the frontmatter as the send-back left it and every declared file byte-identical at the finish (the send-back-command and text-only-check slices).
  - When another plan changes a declared file while the revision is open, the finish refuses and names that file. The plan stays in review, and the menu never finishes it on its evidence.
  - The only way on is the owner's approve anyway from the plan's validation screen, recorded as an override with his reason ("What the source says today", item 15).
  - No route takes a new snapshot. Going back from review leads to the build or further back, never to a new snapshot (item 14).
- **What counts as the fresh check?** Answered: run the full check again (lint, every test, the coverage floor, nothing skipped) and keep the review-to-done check unchanged; the text-only check runs either way (the checks-again slice).
- **Who finishes a revised plan again?** Answered: the menu on recorded evidence, admitted only by the send-back record in the guarded folder, with the owner's approve still available. A revision whose declared file changed finishes only on his approve anyway (the second-finish slice).

The gate critic raised three more forks when it classified these questions. The owner answered them with their recommended options too:

- **Does the send-back record get a shell refusal of its own?** Answered: yes. A background agent's shell write of the send-back record is refused whatever the record-refusal switch says, as the sweep confirmation is (the hook-refusal slice). A main session's shell write is not refused while that switch is on.
- **Does the send-back keep a copy of the approval record it deletes?** Answered: yes. It is copied into the send-back record first, where no reader treats it as a live approval (the send-back-command slice).
- **Where is the send-back record stored?** Answered: in a folder of its own inside the approval records, `.ctoc/approvals/sent-back/`, guarded by the editing-tool refusal from the start and listed by no approval reader (the send-back-command slice).

## Order relative to the plan on headings inside code blocks

These are technical facts about "A heading inside a code block does not end the approved section". The order of building is the owner's to choose.

- **Today**, 22 of the triggering plan's 34 path lines count as approved specification, because its fenced build-log lines 842 and 915 end its excluded execution record early ("What the source says today", items 7 and 8). Replacing them breaks its record unless the route in this plan is used. The other 12 sit in excluded text, and replacing them changes no digest.
- **How that plan treats existing records is settled: a versioned reading.** Its slice "The approval fingerprint reads code fences and only real build-written headings, and every new record names the reading it was made with" stamps every new specification record `spec_version: 3` and checks every record with exactly the reading its stamp names; an unstamped record stays on today's reading (reading 2), byte for byte (`plans/implementation/a-heading-inside-a-code-block-does-not-end-the-approved-section-s2-the-corrected-reading-and-its-stamp.md`, its scope line and its `contentMatches` rule). No existing record is re-recorded or moved.
- **If this plan is built and used on the triggering plan first**, the second finish writes a record computed under today's reading, unstamped. After that plan lands, the record stays on reading 2 and keeps matching; nothing about it changes.
- **If that plan lands first**, the triggering plan's present record is unstamped and keeps lines 842 onward inside the specification, so this route is needed for its 22 approved path lines exactly as today. The send-back withdraws that record, and the second finish writes a new record stamped 3, under which all 34 path lines sit in excluded text.
- **A record writer that refuses.** After that plan's reading lands, the record writer refuses a plan whose code fence is never closed (its rule on unclosed fences). The second finish on evidence then stops after spending its admission; the second-finish slice keeps the plan in review with its record open and holds the owner's approve to the text-only check (that slice's K13).
- **Shared files.** That plan changes `src/lib/approval-ledger.js`, which this plan only reads. Both plans edit `src/lib/actions.js`: that plan's slice "The owner's approve refuses a plan with an unclosed code fence before it changes anything" and this plan's second-finish slice both insert into `approvePlan` at the same spot, between the un-keyable refusal (lines 479–493) and `clearStatus` (line 496), and this plan's send-back-command slice also edits `actions.js` (a new function below `sendBackFromBuildQueue`). None of these is a code dependency; whichever slice is built second re-reads that spot at its Step 9.

## Risks

### Technical Risks
- **A new way back into done through the crossing on evidence**: the crossing today admits a plan only by its build-queue record, and a revised plan needs a second admission. If that admission rests on anything an agent can write, a plan squatted into review with a forged row would finish into done.
  - Likelihood: HIGH (inherent to the recommended finisher)
  - Impact: HIGH
  - Mitigation: Store the send-back record only in the guarded folder, keep "A send-back row without the protected record never finishes the plan" as a test, and refuse a background agent's shell write of the record whatever the record-refusal switch says, as the owner answered to "Does the send-back record get a shell refusal of its own" (`.ctoc/streaming/answers.jsonl` line 276; the hook-refusal slice). A main session's shell write is not refused while that switch is on, which his answer's own cons accept.
- **The send-back writes before it moves**: `rejectPlan` rewrites the plan and deletes its approval record file before the move (`src/lib/actions.js` lines 930, 935, 938), so a refused move would leave a rewritten finished plan with no record.
  - Likelihood: LOW
  - Impact: HIGH
  - Mitigation: Refuse a same-name plan in review before any write, and test it ("A plan of the same name already in review is refused before any write").
- **The full check fails for a reason that has nothing to do with the revision**, because it checks the whole project.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Name the failing check in the refusal sentence, keep the plan in review, and investigate the failure in the product code as the failing-tests rule requires.
- **The send-back record is miscounted as an approval entry**, or its folder is left out of the write protection.
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: The place is the owner's answer, `.ctoc/approvals/sent-back/`, guarded by the editing-tool refusal from the start. Test that an agent's write to it is refused (the hook-refusal slice) and that the entry count and the approval-entry readers do not include it (the send-back-command slice, F16).
- **Another plan edits a declared file while the revision is open**, so the text-only check refuses a revision that changed text only. The plan stays in review, and the menu never finishes it on its evidence.
  - Likelihood: HIGH. 133 finished plans declare `CLAUDE.md` or `README.md` (search: a list item that is exactly `CLAUDE.md` or `README.md`, pattern `^\s*-\s*["']?(CLAUDE|README)\.md["']?\s*$` over `plans/done/`, 133 files, 170 lines; that each match sits under `files:` was not checked file by file). Every release runs the count sync on both (`src/scripts/release.js` lines 437–441), which changes them whenever a documented count moved, and so does every slice that adds a counted file. A revision of any of those plans that stays open across a release or such a build is refused.
  - Impact: LOW
  - Mitigation: Name the changed file in the refusal sentence, and test that the owner's approve anyway finishes the plan with the override recorded ("The owner's approve anyway finishes a revision whose declared file changed"). No route takes a new snapshot. The owner accepted this cost in his answer to "How is text only enforced" (`.ctoc/streaming/answers.jsonl` line 270, its cons); it is not a question.
- **The approve anyway passes every failed check at once**, so an owner overriding a changed declared file could also pass a stale or failed full check without seeing it.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Keep every failing check listed on the validation screen, as today (`src/lib/menu-screens.js` lines 2136–2140), and test the override with the changed declared file as the only failure.

### Business Risks
- **The route is used to rewrite what a finished plan claims**, for example its test figures, rather than to correct its text.
  - Likelihood: LOW
  - Impact: HIGH
  - Mitigation: Restrict the send-back to the owner's own reply, record the reason in the plan and the transitions log, and name the send-back in the second finish's evidence.

### Dependency Risks
- **The `claude:reject` command does not exist today**: it comes from "A plan in the build queue can be sent back to technical planning and keeps its title", which refuses every stage but the build queue.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Declare it in `depends_on` and extend that command for finished plans rather than add a second one.
- **The plan on headings inside code blocks moves the triggering plan's record**.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Record the interaction as facts ("Order relative to the plan on headings inside code blocks") so either order is handled knowingly.
- **Nine finished plans have an execution-plan heading the review-to-done check cannot read**; sent back, they are refused at the finish.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test with a correctly spelled fixture, and name "The done check finds the build record by its evidence, not by its heading name" in this plan's refusal path.
- **The background-agent menu refusal may be switched back on** by "The background-agent protection is measured before the owner decides whether it is on", which would also refuse this command for background agents.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Test the refusal of this command on its own, so it holds whatever that switch says.

## Priority

**Priority: HIGH** (Score: 7/9)
- Dependency: 1 — this plan depends on "A plan in the build queue can be sent back to technical planning and keeps its title"; no plan depends on it (search: this plan's file name over `plans/`, one file, this plan).
- Business Impact: 3 — every finished plan whose text must change today needs a hand edit or a migration record; a hand edit of approved text breaks the record with no signal at the moment of the edit, because the gate check is not registered in the loaded hooks file; and the triggering plan holds 34 lines of private paths that keep it off GitHub.
- Technical Risk: 3 — it opens a new way out of done and a second admission back in, and touches the crossing on evidence and the write protection: gate and hook logic, the changes the owner approved in his seven answers of 2026-10-21 (`.ctoc/streaming/answers.jsonl` lines 268–280).

Priority is not a schedule; the owner alone chooses what is built and when.

## Decisions Taken Under Ambiguity

- **Parent vision.** The parent vision is "CTOC is built with CTOC, and every friction found while building it becomes a plan" (`plans/done/ctoc-is-built-with-ctoc.md`, referenced as `vision/ctoc-is-built-with-ctoc.md` like its other children). This plan is a missing menu route found while building CTOC with CTOC, which is that vision's scope, and the product owner needs a parent vision to run.
- **How the plan was filed.** The CTO Chief filed it through the menu's new-functional-plan action (`browse functional`, then `n`).
- **The stub's evidence moved into "What the source says today".** Each claim is kept there with its label and re-checked. Two were corrected: the line list of the triggering plan (line 729 holds no path, lines 997 and 998 hold none; the count of 34 stands), and two cited line ranges (the script header ends at line 43, the body loop is lines 459–480). The claim about where the refusal of the backfill script came from stays not verified.
- **The send-back goes one stage back, to review.** That is the stub's need and what `rejectPlan` already does for a finished plan. Further send-backs are the review screen's existing options.
- **A reason is required.** `rejectPlan` accepts an empty one, but the reason is what tells a later reader why a finished plan changed, and the build-queue plan requires one too.
- **The send-back reuses `claude:reject` and its rejection header.** One command for one action. The `# REVISION <n>` heading and the reason land in the plan's text, which the second finish's record then covers; the title readers that skip that heading come from the build-queue plan.
- **`depends_on` names "A plan in the build queue can be sent back to technical planning and keeps its title".** This plan extends the command that plan creates. That is a technical order, not a schedule.
- **The admission record for the second finish lives in the guarded folder.** The transitions log and plan files are not guarded ("What the source says today", item 13). An admission an agent can forge would open a way into done, so the transitions-log row is the audit trail and never the admission. The earlier wording, "a folder agents cannot write", was wrong: today only editing tools are refused there, and a shell write is not. The plan now says "the guarded folder" and defines it by item 13. The shell refusal was answered by the owner: a background agent's shell write of the record is refused whatever the record-refusal switch says (`.ctoc/streaming/answers.jsonl` line 276).
- **A declared file changed while the revision is open: the finish refuses and names it, and the owner's approve anyway is the only way on.** The earlier pass said that sending the plan back again takes a new snapshot. That was wrong: from review, `rejectPlan` goes to the build, and the review screen's send-back options go to technical or functional planning; none takes a snapshot (item 14). This plan adds no route that re-takes the snapshot either. A re-taken snapshot would bless whatever changed and then let the menu finish the plan with a pipeline-kind record that does not show a declared file changed while it was open. The owner's approve anyway is today's code, makes a human look at the change, and records the override and his reason (item 15).
- **The finish names the changed file, not who changed it.** A search for a record of which plan or session wrote a file (pattern `edit-log|edits\.jsonl?|files_touched|touched-files|file-writes|writeLog` over `src/`) matched no file, and this plan adds no such record.
- **The text-only check is one more failure of the review-to-done validation.** That one result already drives the review screen, the menu's continuation and the owner's approve (item 15), so all three read the same check and the existing approve anyway applies to it. This is a change to gate logic, the one the owner approved in his answer to "How is text only enforced" (`.ctoc/streaming/answers.jsonl` line 270).
- **The text-only snapshot is taken after the send-back's own rewrite.** `upsertMarkerFields` changes the frontmatter during the send-back (item 9); a snapshot from before it would refuse every revision.
- **The owner's approve is held to the text-only check too, and his approve-anyway stays as today.** The stub says a change beyond plan text is refused or sent through the full loop. Applying the check to both finishers keeps one rule; his recorded override is the existing escape and is not widened.
- **Scenario texts use made-up paths and titles.** No home-folder, scratch or temporary path from the triggering plan or anywhere else appears in this plan; the fixture holds a made-up home-folder path and the placeholder `<home>`.
- **Four questions, each `security-posture`, each marked critical.** Each decides who or what lets a plan out of done or back into it. A wrong answer is a way to change a finished record on a false basis, which is the critical test for a human approval point. The recommendations are written in the questions file with what each rests on.
- **The gate critic's three forks are answered.** The shell refusal of the send-back record, the copy of the deleted approval record, and the place of the send-back record were put to the owner with the gate critic's recommendations, and he took each recommended option on 2026-10-21 (`.ctoc/streaming/answers.jsonl` lines 276, 278 and 280; "Questions for the owner").
- **The order relative to "A heading inside a code block does not end the approved section" is recorded as facts only.** The owner chooses the order.
- **The status file was created by this agent.** The menu has no route that writes the product owner's start status for a hand-created functional plan, so `plans/functional/a-finished-plan-can-be-sent-back-for-a-text-only-revision.md.status` was written by hand with the fields the status protocol names.

## Decisions Taken Under Ambiguity — technical planning

Made by the implementation planner on 2026-10-22, in the main checkout, after the build-queue plan this one depends on had landed in it (that plan is in `plans/review/` today). Every line number in this section and in the slices was read after that landing. Nothing was run: the planner reads only.

- **Six slices.** Each new function's live caller ships in the same slice, so the cut follows the call chain:
  - the hook refusals;
  - the send-back command, its record and the session's recipe;
  - the text-only check;
  - the finished plan's screen;
  - the route that runs the checks again;
  - the second finish.
- **Every passage that called a question open now says how it was answered.** The admission-record line and the gate critic's forks in "Decisions Taken Under Ambiguity", the send-back's copy (item 9) and the shell refusal (item 13), and the Scope, Risks and Priority lines on hook and gate approvals were rewritten in the refinement round of 2026-10-22, each naming the question by its subject and the answers line.
- **How the slices reach the build queue: on recorded evidence, on the owner's instruction to the CTO Chief, 2026-10-22.** On that day the owner ordered this plan taken into the build queue on recorded evidence; he gave the order in the session to the CTO Chief, so no file holds it. The hook changes are the ones he approved in his answers to "Who may send a finished plan back" and "Does the send-back record get a shell refusal of its own" (`.ctoc/streaming/answers.jsonl` lines 268 and 276); the gate changes are the ones he approved in his answers to "How is text only enforced", "What counts as the fresh check" and "Who finishes a revised plan again" (lines 270, 272 and 274). The earlier claim that each slice "is covered only by a human-kind approval" and "crosses into the build queue only on the owner's approve" was wrong about today's code and is removed from every slice:
  - Claude Code loads only `src/hooks/protect-records.js` (`hooks/hooks.json`).
  - The human-kind coverage check for CTOC's protected list (`src/lib/plan-coverage.js` lines 613-621) is reached only through `findCoveringPlan` and `explainDenial`, whose only callers are `src/hooks/PreToolUse.Bash.js` line 879 and `src/hooks/PreToolUse.Edit.js` lines 733 and 775 (search: `findCoveringPlan\(|explainDenial\(` over `src/`, 3 files, 5 lines), and neither hook is loaded.
  - The crossing on recorded evidence in `src/lib/streaming-gate.js` has no protected-file condition (search: `protected|enforcement` over that file, 2 lines, 325 and 338, both comments about the edit hook).
  - So the rule in `src/lib/protected-paths.js` is enforced today only by edit hooks that are not loaded. That gap is reported to the owner as a CTOC friction, not fixed here.
- **The send-back record.**
  - It is `.ctoc/approvals/sent-back/<slug>.json`, one file per plan, built through the ledger's own path functions (`src/lib/approval-ledger.js` lines 148-171).
  - A later send-back nests the earlier record whole, so every copy of an approval is kept, and an earlier record that cannot be read refuses the new send-back before any write.
  - The two readers that list `.ctoc/approvals/` read only its top level and keep only names ending in `.json` (`src/lib/sufficiency-audit.js` line 154, `src/scripts/ledger-backfill.js` line 239), and the test that classifies every real record does the same (`tests/ledger-forgery-closed.test.js` line 785). So the folder is never counted as an approval.
- **The record is written pending before `rejectPlan`, then completed after it.** `rejectPlan` withdraws the approval record before it moves the plan (`src/lib/actions.js` lines 930-938), and the frontmatter can be snapshotted only after its own rewrite (`upsertMarkerFields`, `src/lib/frontmatter-merge.js` lines 258-272). A pending record admits nothing and fails the text-only check.
- **Patterns and folders in `files:` are expanded to their files, at most 2,000 matches and 20,000 visited entries each.** The send-back-command slice's two searches of `plans/done/` settle it:
  - `*` and `?` are expanded: list items holding them matched 53 lines in 27 files. They are expanded with the matcher `files:` grants use (`src/lib/plan-coverage.js` lines 206-214) rather than refused, so those plans' revisions can finish on their checks. The text-only-check slice measures the read cost against a bound of 250 ms added per screen read with one revision open.
  - `[`, `]`, `{` and `}` make an entry uncomparable, because that matcher reads them as literals: the search for them matched 0 finished plans. Such an entry finishes only on the owner's approve past the check.
- **The fresh check calls `persistVerifyResult` directly, through a new route `stream run-checks review/<file>.md`.** `completeExecution` is a build's path: a kickback against the plan's steps, a review-preparer status, a task coupling (`src/lib/actions.js` lines 1484-1502, 1565, 1616). None of those belongs to a plan sent back from done.
- **The second admission is used once, and the record closes only when the plan is in done.** Two marks: the crossing spends the admission (`admission_used_at`) before it writes its approval record, and the record is closed (`finished_again_at`) only after the move, by either finisher. A spent admission never admits again; until the record is closed, the text-only check still applies, so a crossing that stops part-way (a record writer that throws included) leaves the owner's approve held to it. One mark for both was the earlier design and was wrong (the second-finish slice, its K13).
- **A decomposed vision archive is not offered the text revision and is refused by the command.** It cannot pass the review-to-done validation's required steps (`src/lib/plan-validator.js` lines 1373-1390).
- **`src/lib/text-revision.js` joins CTOC's protected list in the text-only-check slice**, the first slice in which it decides a crossing. That is the same reason the list gives for the residency check and the approval records (`src/lib/protected-paths.js` lines 35-38). `src/lib/protected-paths.js` is required only by `src/lib/plan-coverage.js` line 76 (reached only from the unloaded edit hooks) and `src/lib/hotfix-check.js` line 276, so by reading the entry's one live effect today is that a hotfix touching the file is refused (the menu's hotfix route, `src/lib/menu-screens.js` line 3490, reaches `hotfix-check`; the path from there to its area check at line 1497 was not traced, and the text-only-check slice's Step 9 traces it). It decides nothing about how a slice reaches the build queue, and only tightens.
- **The session's recipe ships with the send-back command, not with the screen option.** Until a finished plan can be sent back through the menu, start.md's `claude:reject` row sends any non-build-queue plan to "the conversation, as before" (`src/commands/start.md` line 63), which for a finished plan is a hand edit. The send-back-command slice therefore carries the row and the subsection "Sending a finished plan back for a text revision — only on the owner's own reply"; the screen-offer slice adds one clause naming its option.
- **Two of the build-queue plan's own test assertions change, each a tightening with its reason written beside it.** B3's refusal sentence is no longer true ("build queue only"), so the whole sentence is pinned (the send-back-command slice). B2's pin of a finished plan's screen gains the new option (the screen-offer slice).
- **No question was put to the owner in this pass.** Every choice above is an implementation detail the evidence settles, under his rule on questions.
- **The refinement loop ran three critic rounds.** Round 3's seven findings were applied as plan text in the integrator's final pass, with no further critic round; none needed the owner.

## Slices (dependency-ordered)

| # | Slice file | Scope (one line) | depends_on |
|---|---|---|---|
| 1 | `a-finished-plan-can-be-sent-back-for-a-text-only-revision-s1-a-background-agent-cannot-send-it-back.md` | The write protection refuses a background agent's send-back of a finished plan and its shell write of a send-back record, whatever the record-refusal switch says | - |
| 2 | `a-finished-plan-can-be-sent-back-for-a-text-only-revision-s2-the-send-back-command.md` | `claude:reject done/<file>.md review --stdin` moves a finished plan to review with its reason, writes the send-back record (frontmatter, declared-file digests, the copy of its approval record) and one log row; the session's recipe runs it only on the owner's own words | the build-queue plan (`ctoc-is-built-with-ctoc-a-plan-in-the-build-queue-can-be-sent-back-to-technical-plan`, built) |
| 3 | `a-finished-plan-can-be-sent-back-for-a-text-only-revision-s3-the-text-only-check.md` | The review-to-done validation refuses a revision whose frontmatter or declared file changed, and says a revised plan's checks must run again | the send-back command |
| 4 | `a-finished-plan-can-be-sent-back-for-a-text-only-revision-s4-the-finished-plans-screen-offers-it.md` | A finished plan's screen offers "Send it back for a text revision", and the recipe names that option | the send-back command |
| 5 | `a-finished-plan-can-be-sent-back-for-a-text-only-revision-s5-the-checks-run-again.md` | `stream run-checks review/<file>.md` runs the full check again for a revised plan, offered on its screen, then runs the continuation | the text-only check |
| 6 | `a-finished-plan-can-be-sent-back-for-a-text-only-revision-s6-it-finishes-again.md` | The crossing on evidence admits a revised plan once, by its open send-back record, spending the admission before any write; both finishers close the record once the plan is in done and mark their row | the hook refusals, the text-only check, the checks run again |

The longest chain inside this plan is the second finish → the checks run again → the text-only check → the send-back command: three steps. The send-back command's own dependency, the build-queue plan, is already built and waits in `plans/review/`. The `#` column is the order of the table only; each slice is named by its scope.

Technical facts for the owner's scheduling (not a schedule):
- **The hook-refusal slice is not a code dependency of the send-back-command slice.** If the send-back command is built first, then while `RECORD_REFUSALS_OFF` is on (`src/hooks/protect-records.js` line 1170) nothing refuses a background agent's send-back of a finished plan. The second-finish slice depends on the hook-refusal slice, so no plan finishes on a send-back record before both refusals exist.
- **Every slice crosses into the build queue on recorded evidence**, on the owner's instruction to the CTO Chief, 2026-10-22 ("Decisions Taken Under Ambiguity — technical planning"). The hook changes (the hook-refusal slice) are the ones he approved in his answers to "Who may send a finished plan back" and "Does the send-back record get a shell refusal of its own"; the gate changes (the text-only-check, checks-again and second-finish slices) the ones he approved in his answers to "How is text only enforced", "What counts as the fresh check" and "Who finishes a revised plan again" (`.ctoc/streaming/answers.jsonl` lines 268–280). The human-kind rule of `src/lib/protected-paths.js` is enforced today only by edit hooks that are not loaded, a gap reported to the owner as a CTOC friction.
- **Slices that share a file with no `depends_on` edge between them.** None is a code dependency; they are not built in parallel, and whichever is built second re-reads the shared spot at its Step 9 (the count lines of `CLAUDE.md` and `README.md` aside, which every slice moves through the release script's count functions):
  - the screen-offer and checks-again slices: `planDecisionScreen` (`src/lib/streaming-gate.js`, its gate and lifecycle branches at lines 1705–1788) and `src/commands/start.md`;
  - the screen-offer and second-finish slices: `src/lib/streaming-gate.js`, different functions (`planDecisionScreen` and `crossOnEvidence`);
  - the hook-refusal and checks-again slices: `docs/ENFORCEMENT.md`, different sections.
  Every other pair that shares a file is ordered by `depends_on`.
- **No slice edits `src/lib/approval-ledger.js`.** The plan "A heading inside a code block does not end the approved section" changes it, and its slice on unclosed fences shares `approvePlan` in `src/lib/actions.js` with the second-finish slice; the facts are under "Order relative to the plan on headings inside code blocks".

Seen, not built here; the owner schedules:
- **The crossing on evidence writes no transitions row for a plan that was never sent back** (`src/lib/streaming-gate.js` lines 763-802; `logTransition`'s one other caller is `approvePlan`, `src/lib/actions.js` line 580). The second-finish slice writes one for a revised plan only.
- **A revised plan sent further back from review and rebuilt finishes only on the owner's approve past the text-only check.** The second `rejectPlan` changes its frontmatter (`src/lib/actions.js` lines 910-914).
- **A finished plan whose execution-plan heading the review-to-done check cannot read** stays refused at the finish after a send-back, until "The done check finds the build record by its evidence, not by its heading name" lands.
