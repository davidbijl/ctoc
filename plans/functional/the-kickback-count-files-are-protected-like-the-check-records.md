---
title: "The kickback count files are protected like the check records"
created: "2026-10-22"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 13
risk_level: HIGH
---

# The kickback count files are protected like the check records

## Problem Statement

The circuit breaker keeps each plan's kickback count in a file of its own, `.ctoc/state/kickbacks/<plan>.json`, and holds a lock file `.ctoc/state/kickbacks/<plan>.lock` while it counts; it writes the count through a temporary file `<plan>.json.tmp-…` in the same folder and renames it into place (`src/lib/circuit-breaker.js`: `kickbackStatePath` line 250, `writeKickbackState` lines 308–337, `withCountLock` lines 457–526). That count puts a plan that keeps failing on the owner's `inbox escalations` screen at the fourth send-back to one step or the sixth for the plan (`SAME_STEP_MAX` 3 and `PER_PLAN_MAX` 5, lines 74–76). Three routes feed it: a completion refused before review, a failed quality check (Step 14), and the session's `menu task complete <id> --continue --send-back <step>` after a review, security or quality round (`src/lib/menu-screens.js` lines 2864–2873, from "Send-backs from review and security rounds count toward the three-per-step limit"). Nothing protects the count files.

**How the check records are protected today** (read in `src/hooks/protect-records.js`, the one hook `hooks/hooks.json` loads, on Write, Edit, MultiEdit, NotebookEdit and Bash):

| Channel | Check records, `.ctoc/state/verify/` | Count files, `.ctoc/state/kickbacks/` |
|---|---|---|
| Write, Edit, MultiEdit, NotebookEdit by a background agent | refused with the records sentence (`decide()` lines 1244–1245) | allowed |
| The same tools in the main session | refused the same way: that branch has no background-agent test (test case 2 sends no agent id; case 150 asserts the main session is refused) | allowed |
| Shell, any session | allowed since the owner's order of 2026-10-15, "remove that hook block, it is wrong" (`RECORD_REFUSALS_OFF` line 1170; `bashRefuses` returns at line 1195, before the check-record test at line 1207); test cases 15–46 pin `echo >`, `rm`, `cp`, `sed -i` and one-line scripts as allowed | allowed |
| The hook itself crashes | refused with the "protection failed to run" sentence, because the call mentions `.ctoc` (`UNCHECKED_SUSPECT_RE` line 597) | already the same, for the same reason |
| Reading | allowed (the Read tool is not matched; `cat` is a read) | allowed |

The editing-tool test for the check records is three readings, any one of which refuses, each run on the path as written and as tidied: `isProtectedVerifyPath` in `src/hooks/PreToolUse.Edit.js` (line 265; the folder name at line 158), which tests the folder by name after `..` is resolved and `\` read as `/`, in any letter case, and by real-path identity through `real-path-confinement.resolvesUnder`; and the hook's own root-independent name test `RECORD_SEGMENT_RE` (line 581), which also refuses another copy's records.

**What an agent can do to a count file today, read from the code:**
- A Write of `{"by_step":{},"total":0}` over a plan's count file, or an Edit that lowers `total`, resets the count. The file still parses, so `readKickbackState` reports it as `ok` (lines 268–290) and no `breaker-failure` entry is written. The only floor is an old count in the plan's frontmatter (`maxCountsAcrossBlocks`), which plans counted since the count moved into its own file do not carry. A plan that keeps failing then goes on without reaching the owner, and nothing records that the count was reset.
- A Write of a fresh `<plan>.lock` makes every send-back of that plan "NOT counted" until the lock is 60 seconds old (`COUNT_LOCK_STALE_MS`, line 79). Each such send-back writes a `breaker-failure` entry, so it is visible, but it is noise for the owner.
- The editing tools cannot delete a file. Deleting a count file is a shell act, and the shell is not refused here (see Scope).

**Why the earlier plan left it open, and what changed.** "The kickback counter moves to a sidecar under .ctoc/state/kickbacks/ — the plan file is never written again" (done) wrote: "an agent could edit it. That is not a new exposure: the counter previously lived in `plans/**.md` … No gate reads this file, so it is not an approval surface." Two facts no longer hold. The old count sat in the plan's frontmatter, which the approval record hashes in full, so an edit there showed as a forged plan; an edit of the count file shows nowhere. And the send-back route of the review, security and quality rounds now feeds this count. The circuit breaker's own header calls the file "the same pattern and residency as the Step-14 verify evidence beside it" (lines 18–20); the protection does not follow it.

"Protected like the check records" therefore means: the same refusal, on the same channel (the editing tools), for every session, with the same readings of the path. The menu writes the count inside its own process with Node file calls, which never pass through a tool hook.

This changes the logic of the one loaded hook, so it is built only after the owner's explicit OK (one question, written with this plan).

## Business Alignment

**Job to Be Done:** When a plan keeps being sent back, I want the count that decides when it reaches me to be beyond an agent's editing tools, as the check records are, so I can rely on the limit of three per step and five per plan without auditing the count files myself.

**Impact Map:**
- **Goal:** The protections CTOC already promises hold, or the owner knowingly decides they do not (the decomposition's goal for this vision). The promise here is the circuit breaker in `CLAUDE.md`: "max 3 kickbacks to one step, 5 per plan, then escalate to the user".
- **Actor:** The owner, Tijn van der Zant, who receives the escalation and approves every hook change; and the background agents that build for him, who hold the editing tools (vision: Target User).
- **Impact:** An agent's editing-tool write to a count file is refused with a sentence that tells it why, so a reset by Write or Edit no longer happens silently; the owner still gets the escalation on the sixth send-back.
- **Deliverable:** One more protected folder in the loaded hook, `.ctoc/state/kickbacks/`, on the editing tools only, with its own refusal sentence, its crafted-input test cases, and the hook header and `docs/ENFORCEMENT.md` updated to the real reach.

**Alignment checks:**
1. The goal traces to the vision's problem: YES. The vision lists "send-backs from review and security rounds that count toward no limit" as a protection friction; its fix made this count the gate to the owner, and an unprotected count undoes it.
2. The actor is in the vision's target audience: YES. The owner and the background agents are named there.
3. The impact is observable: YES. Exit code 2 and the sentence on a crafted Write; the escalation line on `inbox escalations` after a refused reset.
4. The deliverable is one functional area: YES. One folder added to one hook decision.

**Overlap check:** No sibling plan covers the count files. Searches: Glob `plans/functional/ctoc-is-built-with-ctoc-*.md` found 1 file; Grep `parent_vision: "vision/ctoc-is-built-with-ctoc.md"` over `plans/` found 16 files across stages. The nearest neighbours, each read: "The background-agent protection is measured before the owner decides whether it is on" (the shell switch and the background-agent menu refusal, not editing-tool paths) and "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection" (the hook's own files). Grep `kickbacks/` over `agents/`, `skills/`, `.ctoc/`, `src/commands/` and `hooks/`: no file matched, so no agent or recipe is told to write the count folder with a tool. Both neighbours edit the same hook file; that is a shared file, not a shared behaviour (see Dependency Risks).

## User Stories

**As the** owner, **I want** an agent's Write, Edit, MultiEdit or NotebookEdit into `.ctoc/state/kickbacks/` refused with a plain sentence, as for the check records, **so that** a plan that keeps failing still reaches me at the limit.
- INVEST: Independent (needs only the existing hook); Negotiable (names the refusal, not its code); Valuable (the escalation is the owner's only signal); Estimable (the check-record and regulatory-settings checks are the template); Small (one folder, one sentence); Testable (scenarios 1–5).

**As the** owner, **I want** the menu's own counting and the escalation to keep working with the protection in place, **so that** the protection costs the pipeline nothing.
- INVEST: Independent (testable on its own route); Negotiable; Valuable (a protection that broke counting would remove the limit it guards); Estimable (the circuit-breaker wiring tests already drive the route); Small; Testable (scenarios 6–8).

**As the** owner, **I want** the real reach of this protection pinned and written down, **so that** I approve it knowing the shell can still reset a count.
- INVEST: Independent; Negotiable; Valuable (the owner's ruling of 2026-10-15 left the shell open on purpose; he decides on the true reach); Estimable; Small; Testable (scenarios 9–13).

## Acceptance Criteria

"The kickback sentence" below is exactly: "CTOC refused this call because it writes, or could write, a plan's kickback count, which only CTOC's menu writes; finish your work, report it, and let the menu record the result." "Refused" means what it means for every case of `tests/protect-records.test.js`: the real hook, fed the crafted Claude Code payload on standard input, exits 2 with the sentence as the one line on standard error and the deny decision on standard output. "Allowed" means exit 0 and nothing on standard output. A background agent's payload carries a non-empty `agent_id`; the main session's carries none.

Story 1, the editing tools are refused:

- [ ] **Scenario: an agent's reset of a count by Write is refused**
  Given a plan whose count file `.ctoc/state/kickbacks/<plan>.json` holds a total of 5
  When a background agent's Write targets that file with the content `{"by_step":{},"total":0}`
  Then the call is refused with the kickback sentence

- [ ] **Scenario: every editing tool is refused, in either session**
  Given the project's `.ctoc/state/kickbacks/` folder
  When a Write, an Edit, a MultiEdit and a NotebookEdit each target `.ctoc/state/kickbacks/<plan>.json`, once as a background agent and once as the main session
  Then all eight calls are refused with the kickback sentence

- [ ] **Scenario: every spelling the check records refuse is refused here too**
  Given the project's `.ctoc/state/kickbacks/` folder
  When a Write targets `.CTOC/State/Kickbacks/x.json`, `.ctoc\state\kickbacks\x.json`, `<project>/src/../.ctoc/state/kickbacks/x.json`, `src/link/x.json` where `src/link` is a symbolic link to the folder, `<project>/.ctoc/state/kickbacks/x.json` from a session whose working folder is `<project>/src`, or `<another project>/.ctoc/state/kickbacks/x.json`
  Then each call is refused with the kickback sentence, as a background agent and as the main session

- [ ] **Scenario: the lock file and the temporary file are refused too**
  Given the project's `.ctoc/state/kickbacks/` folder
  When a background agent's Write targets `.ctoc/state/kickbacks/<plan>.lock` or `.ctoc/state/kickbacks/<plan>.json.tmp-1`
  Then both calls are refused with the kickback sentence, so a planted lock cannot make a send-back go uncounted

- [ ] **Scenario: the folder's neighbours stay writable and the folder stays readable**
  Given the project's `.ctoc/state/kickbacks/` folder
  When a background agent Writes `.ctoc/state/kickbacks-notes.md`, Writes `<project>/.ctoc/state/kickbacks/../notes.md`, or runs `cat .ctoc/state/kickbacks/<plan>.json`
  Then each of the three calls is allowed

Story 2, the menu keeps counting:

- [ ] **Scenario: the session's send-back call passes the hook**
  Given the protection is in place
  When the main session's Bash call `node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task complete t1 --continue --send-back 10` is fed to the hook
  Then the call is allowed

- [ ] **Scenario: the menu still counts a send-back**
  Given a plan in `plans/in-progress/` and a running review round for it, in a project with the protection in place
  When the round completes through `menu task complete <round> --continue --send-back 10`
  Then the menu's text says "the send-back to Step 10 was counted: 1 of a limit of 3 for Step 10, 1 of a limit of 5 for the plan"
  And `.ctoc/state/kickbacks/<plan>.json` holds a total of 1, and no `.lock` file is left in that folder
  (The count is written by the menu's own Node file calls, which never pass through the hook; this scenario proves the protection does not stand in their way.)

- [ ] **Scenario: a refused reset does not hide the escalation**
  Given a plan with five counted send-backs
  When a background agent's Write of `{"by_step":{},"total":0}` over its count file is refused, and the sixth send-back is then recorded through `menu task complete <round> --continue --send-back 10`
  Then the menu's text says "6 of a limit of 5 for the plan" and "needs you"
  And the `inbox escalations` screen shows "• <plan>  6 kickbacks total (max 5)"

Story 3, the real reach is pinned and written down:

- [ ] **Scenario: the shell is not refused, exactly as for the check records**
  Given the owner's order of 2026-10-15 that keeps the record refusals off the shell
  When the main session and a background agent each run `rm .ctoc/state/kickbacks/<plan>.json` and `echo '{"by_step":{},"total":0}' > .ctoc/state/kickbacks/<plan>.json`
  Then all four calls are allowed, as the same commands on `.ctoc/state/verify/` are (test cases 15 and 20)

- [ ] **Scenario: a hook that cannot run still refuses a call naming the count folder**
  Given a copy of the hook whose libraries are missing (the shape of test case 56)
  When a Write targets `.ctoc/state/kickbacks/<plan>.json`
  Then the call is refused with "CTOC refused this call because it mentions the approval or check records and CTOC's protection for them failed to run; tell the human that this protection is broken."
  And a Bash `ls` through the same copy is allowed

- [ ] **Scenario: the existing protections answer exactly as before**
  Given the approval records, the check records, the answer store, the project's settings file, the regulatory profiles and the background agents' settings files
  When every case that `tests/protect-records.test.js` and `tests/only-the-owner-answers-an-inbox-question.test.js` held before this change runs
  Then each passes, this change edits no line of an existing case, and every refusal among them gives the same sentence as before

- [ ] **Scenario: a link where the count folder should be refuses every editing call until it is removed**
  Given `.ctoc/state/kickbacks` is a symbolic link to a folder that does not exist
  When the main session Writes `src/x.js`
  Then the call is refused with the kickback sentence, as the shared path test already answers for a dangling link at `.ctoc/approvals` (`tests/a-link-cannot-leave-the-repository.test.js`, case 17: "a dangling protected path refuses every target")
  And once the link is removed and the folder made again, the same Write is allowed

- [ ] **Scenario: the written reach matches the hook**
  Given the protection is in place
  When the owner reads the header of `src/hooks/protect-records.js` and the section "The one loaded hook — write protection for the records" of `docs/ENFORCEMENT.md`
  Then both name `.ctoc/state/kickbacks/` among the protected areas and quote the kickback sentence
  And both say that the shell is not refused for it, that a dangling link or a link to `..` at that folder refuses every editing call until it is removed from the owner's own terminal, and that a session holds the protection only after CTOC is updated and Claude Code is restarted

## Scope

### In Scope
- Refusing Write, Edit, MultiEdit and NotebookEdit into `.ctoc/state/kickbacks/` (the count files, the lock files, the temporary files) for every session, with every reading the check records get, and with the kickback sentence (scenarios 1–5).
- Keeping the session's send-back call, the menu's own counting and the escalation working (scenarios 6–8).
- Pinning today's reach: the shell is not refused, the crash rule already refuses, and every existing protection answers as before (scenarios 9–11).
- The known cost of a link at the folder, and the hook header and `docs/ENFORCEMENT.md` written to the real reach (scenarios 12–13).

### Out of Scope
- **Shell writes and deletions of the count files** (`rm`, `echo >`, `cp`, `sed -i`, one-line scripts). Not refused, exactly as the check records since the owner's order of 2026-10-15. The switch belongs to that order and to "The background-agent protection is measured before the owner decides whether it is on". A shell refusal for the count folder alone is option 3 of this plan's question to the owner; it is not in any plan.
- **The escalation log `.ctoc/logs/escalations.json`**, where the escalation the count triggers is written and which the `inbox escalations` screen reads. It stays writable on every channel, so an agent can empty it after the escalation is written. No plan found covers it: Grep `escalations\.json` over `plans/functional`, `plans/implementation`, `plans/todo`, `plans/vision` and `src/hooks` matched 2 files, and neither protects the log. The owner's question names it.
- **The hook's documented limits**, unchanged by this plan: a hard link into a protected folder, git operations that restore files without naming them, replacing `.ctoc/state` or `.ctoc`, a script written and then run, tools other than the five matched (`docs/ENFORCEMENT.md`, "What it cannot catch"). `.ctoc/state/` is ignored by git (`.gitignore` line 6), so a git restore cannot bring back an old count.
- **Isolating background agents from the main project's records**: the open owner question named in the hook's header.
- **A menu route that resets a plan's count on purpose**: none exists today; the main session uses the shell, as it does for the check records. Not planned here.
- **`hooks/hooks.json` and `src/hooks/PreToolUse.Edit.js`**: unchanged (Decisions 1 and 7).

## Risks

### Technical Risks
- A link at the count folder locks out every editing call: a dangling symbolic link or a link to `..` at `.ctoc/state/kickbacks` refuses every editing call in every session, as `docs/ENFORCEMENT.md` lines 387–394 document for the other protected folders and `tests/a-link-cannot-leave-the-repository.test.js` case 17 pins for `.ctoc/approvals` (read, not run), and one shell command from any session can create it because the shell is not refused.
  - Likelihood: LOW
  - Impact: HIGH
  - Mitigation: Test it (scenario 12) and write the recovery into `docs/ENFORCEMENT.md`'s link paragraph (scenario 13): remove the link from the owner's own terminal and make the folder again.
- A fault in the new check masks an existing one.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Run the new check after every existing check of the editing branch (Decision 3), and hold every existing case unchanged (scenario 11).
- A false refusal: the root-independent name test refuses a file under any `.ctoc/state/kickbacks/` path, a test fixture included, as it already does for `.ctoc/state/verify/`.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Create such fixtures at test run time with Node file calls, as the circuit breaker's tests already do.
- One more name test and identity walk per editing call; the extra work is not measured.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Measure an ordinary Write's units of work before and after the change, against the 79 to 105 units `docs/ENFORCEMENT.md` states, and record both numbers in the implementation plan.

### Business Risks
- The owner reads "protected" as "cannot be reset" while the shell stays open.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: State the shell reach in the owner's question, in Out of Scope and in `docs/ENFORCEMENT.md`, and pin it with scenario 9.
- The owner's own main session loses Write and Edit on the count files, for instance to reset a count after fixing the cause.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Name the shell as his way in `docs/ENFORCEMENT.md`, as it is for the check records.

### Dependency Risks
- Other plans edit the same two files, `src/hooks/protect-records.js` and `tests/protect-records.test.js`: two in the build queue declare the hook ("A background agent cannot send a finished plan back, nor write its send-back record"; "A background agent may run CTOC's menu only for its read-only views and a task's completion, and no CTOC code that writes records"), three in technical planning declare it, and the functional plans "The background-agent protection is measured before the owner decides whether it is on" and "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection" change it.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Schedule this build so that it never runs in a parallel worktree beside another plan that edits either file, and number the new test cases from the file's highest case at build time.
- A session holds the new refusal only after CTOC is updated and Claude Code restarted, because a session runs the installed plugin's copy of the hook (`docs/ENFORCEMENT.md` line 499).
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Verify after the release by piping one crafted Write payload for `.ctoc/state/kickbacks/x.json` into the installed copy of the hook and checking exit 2 and the sentence.
- Scenarios 7 and 8 drive the round send-back route of "Send-backs from review and security rounds count toward the three-per-step limit", which is in review, not done.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Drive scenarios 7 and 8 through the failed-verify count in `completeExecution` instead, if that route has changed when this plan is built, keeping the same expected texts for the count and the escalation screen.

## Priority

**Priority: MEDIUM** (Score: 6/9)
- Dependency: 2 — nothing depends on it and it depends on nothing; it runs beside other plans, but never at the same time as a plan that edits the same hook file.
- Business Impact: 2 — it supports the vision's goal that CTOC's promised protections hold; the circuit breaker counts without it, and it closes a silent reset on one channel.
- Technical Risk: 2 — moderate: a change to the one loaded hook, built from its existing check-record and regulatory-settings checks, with no new technique.

## Decisions Taken Under Ambiguity

1. **How the path is matched.** A new check in `src/hooks/protect-records.js` shaped like `isRegimeFile` (lines 306–310): the hook's own `namesProtected(form, …)` with the pattern `(^|/)\.ctoc/+state/+kickbacks(/|$)` (flag `i`, on the Unicode-folded path and real path), or `real-path-confinement.resolvesUnder(form, '.ctoc/state/kickbacks', process.cwd())`, run on both readings of the target (`forms`, as written and tidied). Evidence: together these cover every reading the check records get (letter case, `\`, `..`, Windows trailing dots and stream suffixes, symbolic links, file identity, another copy's folder), and the regulatory-settings protection already uses exactly this pair. No helper is added to `src/hooks/PreToolUse.Edit.js`, which Claude Code does not load.
2. **Its own sentence, not a wider records sentence.** The records sentence is compared byte for byte by `assertRefused` in `tests/protect-records.test.js`, defined again in `tests/only-the-owner-answers-an-inbox-question.test.js`, and quoted in `docs/ENFORCEMENT.md`; widening it would edit every case that pins it. A sentence of its own, as the regulatory settings have, touches no existing case and tells the agent exactly what it hit. "Kickback" is the word `CLAUDE.md` and the `inbox escalations` screen use for this count.
3. **Where the check runs.** Last in the editing-tool branch of `decide()`, after the records, regulatory-settings and background-agent settings checks, so a fault in the new code never masks an existing check. A throw there reaches the crash rule, which refuses any call naming `.ctoc`.
4. **For every session.** The check-record refusal has no background-agent test, and the menu is the only writer of the count, so the main session is refused too.
5. **The shell is not touched.** "Protected like the check records" is the same channel; the owner's order of 2026-10-15 keeps record refusals off the shell, and this plan does not reopen it. A shell refusal for this one folder is offered to the owner as an alternative in the plan's one question, not built.
6. **The crash rule is not changed.** `UNCHECKED_SUSPECT_RE` already matches `.ctoc`, so a crash on a call naming the count folder already refuses (scenario 10). Its sentence says "the approval or check records"; it is left as it is because it is pinned by tests and still tells the human that the protection is broken.
7. **`hooks/hooks.json` is not changed.** Its matcher already lists the five tools, and its description already names only three of the protected areas (not the settings files). Grep `hooks/hooks\.json` and `'hooks', 'hooks\.json'` over `src/` and `tests/` matched 3 files; the one that parses it, `tests/protect-records.test.js` case 60, checks the matcher and the command, not the description.
8. **Test layout.** Scenarios 1–6 and 9–12 are a new block in `tests/protect-records.test.js`, which spawns the real hook with crafted payloads, numbered after the file's highest case at build time. Scenarios 7 and 8 go into `tests/circuit-breaker-wiring.test.js`, which already drives the real send-back route and the escalation screen (its case 4); scenario 8 feeds the hook payload first, then runs the route. Scenario 13 is a text check on the two documents.
9. **Priority set to MEDIUM.** The stub said HIGH; the matrix scores 6 of 9.
10. **Risk level HIGH** because one risk, the lockout by a link at the folder, has a HIGH impact, although its likelihood is LOW.
11. **If the owner answers "keep the count files as they are",** this plan records his answer and changes no file.
12. **One question to the owner**, the hook change itself. Path matching, the sentence, the order, the tests and the documents are decided here from the evidence above.
