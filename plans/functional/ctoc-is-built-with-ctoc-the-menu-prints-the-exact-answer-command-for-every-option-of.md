---
title: "The menu prints the exact answer command for every option of every streamed question"
created: "2026-10-20T13:37:49.348Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 14
risk_level: HIGH
---

# The menu prints the exact answer command for every option of every streamed question

## Problem Statement
Answer lines are hard to get. Reported: the stream screen output is one large block of JSON text, the exact `stream answer <plan> <question id> <option key> <digest>` lines cannot easily be pulled from it, and the coordinator wrote a scratch script to compute the digests. Read: no `stream answers` route exists in `src/commands/start.js`, `src/lib/streaming-gate.js` or `src/lib/menu-screens.js`; the answer command is composed per option by the `answer` helper in `src/lib/streaming-gate.js` that builds `stream answer ${ref} …` (line 518, confirmed by the decomposer). Wanted: the menu prints each question's answer commands, or offers a `stream answers <plan>` view; the Product Owner chose the separate view (see "Decisions Taken Under Ambiguity"). Because the friction is reported, the plan starts by reproducing the unreadable output. Disposition: new work. Done when a test drives the real menu for a plan with streamed questions, finds one runnable answer line per option of each question, and runs one printed line through the real answer route to see the answer recorded. This plan shares `src/lib/streaming-gate.js` with the plan that lets a build-queue plan be sent back; that is a file overlap for scheduling, not a dependency.

Read by the Product Owner in this pass (source read, not run): the exact lines already exist, but only for one question at a time and only in the screen's machine-read actions. `precomputedQuestionParts` in `src/lib/streaming-gate.js` (lines 502-540) composes one answer line per option of ONE question, plus CTOC's hold line. The stream screen (`richQuestionScreen`, line 1429, called from line 2049) and the plan screen (`planDecisionScreen`, line 1569, call at line 1648) each call it only for the one question `nextUnansweredQuestion` (line 392) returns, and `src/commands/start.js` prints every route's screen as `JSON.stringify(result, null, 2)` (line 967). So no menu output holds the line for a plan's second or later open question until the ones before it are answered; that is why the digests were computed by script. A question's digest (`questionDigest`, `src/lib/streaming-precompute.js` line 282) depends only on that question's prompt, option keys and labels and its recommended option, so every open question's line can be printed at once. Who has the problem: the coordinator session that records the owner's answers through the menu. Its cost: the coordinator routes around the menu, which the vision's operating rule forbids.

## Business Alignment

**Job to Be Done:** When the owner has given his answers to several of a plan's streamed questions, I want to get the exact answer command for each chosen option straight from the menu, so I can record his answers through the menu without computing a digest by hand or by script.

**Impact Map:**
- **Goal:** Every plan move the maintainers need is a menu route with usable output (the vision's problem: each friction pushed the coordinator off the menu).
- **Actor:** the coordinator session, the main session that drives CTOC's menu for the owner (named in the vision's target user: "the CTO Chief and background agents that work for him (the coordinator session, …)"). Every CTOC user's session that answers streamed questions benefits the same way.
- **Impact:** the coordinator records every streamed answer by running a line the menu printed, and writes no scratch script to compute a digest.
- **Deliverable:** one read-only menu view, `stream answers <plan>`, that lists every open question of one plan with an answer line for each option.

**Alignment checks:** the goal traces to the vision's problem statement (yes); the actor is in the vision's target user (yes); the impact is observable, no scratch script and every answer recorded through a printed line (yes); the deliverable is one functional area, one read-only view (yes).

## User Stories

**As the** coordinator session that records the owner's answers through the menu, **I want** one menu view that prints, for every open question of a plan, the exact `stream answer <plan> '<question id>' '<option key>' '<digest>'` line of each option, **so that** I record every answer the owner gave without computing a digest by hand or by script. `[MVP]`
- INVEST: Independent yes. Negotiable yes: the route name is the interface the vision asked for, and the layout is open. Valuable yes: it removes the scratch script. Estimable yes: the per-question composer and the answer route exist. Small yes: one read-only view. Testable yes: see the scenarios below.

**As the** coordinator, **I want** a printed line, run unchanged, to record exactly that answer, and a line that has gone out of date to record nothing, **so that** a printed line is proven to be the same answer as the owner's click on the question screen. `[MVP]`
- INVEST: Independent is qualified: it runs the first story's output and is ordered after it inside this plan. Negotiable, Valuable, Estimable, Small and Testable: yes.

**As the** coordinator, **I want** each line under its question's prompt and its option's label, with the questions that wait for the owner marked, and no question-file text able to pass for an answer line, **so that** I match the owner's reply to the right line and never run a line a question file planted.
- INVEST: Independent is qualified: it shapes the first story's view and is ordered after it inside this plan. Negotiable, Valuable, Estimable, Small and Testable: yes. Recast from the owner to the coordinator (see "Decisions Taken Under Ambiguity").

## Decomposition

Source: `plans/decomposition/ctoc-is-built-with-ctoc.md`. Stories marked `[MVP]` are the smallest end-to-end version; the others are the remaining stories, with no phase or schedule (the owner alone chooses what is built and when).

### Vision item carried
- "Answer lines are hard to get."

### Goal: Every plan move the maintainers need is a menu route with usable output
- **Actor:** the owner and the CTO Chief, coordinator session and background agents that build CTOC through its menu; after them, every CTOC user on the same routes.
- **Impact:** the coordinator sends back, answers and moves plans through the menu without `node -e` calls into `src/lib/actions` or scratch scripts.
- **Success metric:** this plan has a test that drives the real menu route, and no scratch script is needed to answer a streamed question.

### Activities
1. Open a plan's questions in the menu.
2. Copy the answer command for the chosen option.
3. Run it and see the answer recorded.

### Stories
- [ ] `[MVP]` As the coordinator, I want the menu to print, per question and per option, the exact `stream answer <plan> <question id> <option key> <digest>` line, so that I never compute digests with a scratch script.
  - Acceptance: for a plan with two questions of two options each, the menu prints four answer lines, one per line, each runnable as printed; the digest matches what the answer route accepts.
  - INVEST: passes all six criteria.
- [ ] `[MVP]` As the coordinator, I want a printed answer line, run as is, to record that answer, so that the printed line is proven correct end to end.
  - Acceptance: running one printed line through the real menu records the answer and the question leaves the pending list.
  - INVEST: passes; Independent is qualified, because it tests the first story's output.
- [ ] As the owner, I want the printed lines to be readable next to the question text, so that I can pick an answer without reading JSON.
  - Acceptance: each answer line sits under its question's prompt and option label, outside the JSON block. Whether this is the stream screen itself or a separate `stream answers <plan>` view is the Product Owner's choice (an open unknown in the vision).
  - INVEST: passes all six criteria.

### Dependencies
- Story level: running a printed line depends on the lines being printed. The readability story depends on no other story.
- Plan level: none.
- Shared file (a scheduling concern, not a dependency): `src/lib/streaming-gate.js` with "A plan in the build queue can be sent back to technical planning and keeps its title".

## Scope

### In Scope
- A menu view that records nothing, `stream answers <plan>`, for one plan: every open question with its prompt, its option labels (the recommended one first and marked) and one answer line per option, plus the question's hold line; in the raw output each line also stands on a physical line of its own. Default-decided questions carry the note on when their line still counts. Criteria: "Every option of every open question gets its own line", "A question with three options gets three lines", "Each line sits under the words the owner chose from".
- The view follows the rules of the plan's question screen: a question answered for the current revision is left out, one answered only for an older revision is listed again, questions not yet checked by the gate critic get no lines, a held plan gets only keep and release lines, and the questions that wait for the owner come first. Criteria: "Answered questions drop out, and an answer to an older revision does not count", "Questions not yet checked by the gate critic get no lines", "A held plan gets only keep and release lines", "Each line sits under the words the owner chose from".
- Each printed line is the same command the question screen offers for that option, records that answer when run unchanged, and records nothing once it is out of date. Criteria: "A printed line records exactly that answer", "A view line is the same command as clicking the option", "A line for a question rewritten since it was printed records nothing", "A line for a plan that has moved on records nothing".
- Text from a question file can never pass for an answer line. Criterion: "Text from a question file can never pass for an answer line".
- The view moves no plan and records no answer or task (it takes in the gate critic's waiting question files first, as the plan screen does), and it refuses an invalid plan reference. Criteria: "Opening the view moves nothing and records nothing", "An invalid plan reference is refused".
- The menu's command reference (`src/commands/start.md`) lists the view. Criterion: "Every option of every open question gets its own line".
- The stream screen and the plan screen stay as they are for the owner. Criterion: "The owner's question screens stay as they are".

### Out of Scope
- Printing answer lines on the stream screen or the plan screen, or listing several questions there: not planned. Those screens keep asking the owner one question at a time (see "Decisions Taken Under Ambiguity").
- One view across all plans at once: not planned in this vision; the owner decides whether it becomes a plan.
- Letting a background agent open the view once its menu refusal is switched back on: that is a hook change, which needs the owner's explicit approval, and it belongs with "The background-agent protection is measured before the owner decides whether it is on".
- Any change to what `stream answer` accepts or records (the digest check, the hold rule, the work that moves on after an answer): unchanged; not planned.
- Changing or withdrawing an answer already recorded: not planned in this vision.
- Send-back options on the plan screen of a build-queue plan: they belong to "A plan in the build queue can be sent back to technical planning and keeps its title".

## Acceptance Criteria

Every scenario runs in a sandboxed project. "Every option of every open question gets its own line" and "A printed line records exactly that answer" drive the real entry point, `node src/commands/start.js`, and read its raw output; the other scenarios may call the menu's router (`route` in `src/lib/menu-screens.js`) the way `tests/streaming-human-loop-e2e.test.js` does. "The view shows" means the screen's text once the printed JSON is parsed, as the session reads it. "Run unchanged" means the line is given as the menu's arguments, split into words the way a POSIX shell reads single quotes, with nothing computed, added or unescaped. The example plan is a functional plan whose question file the gate critic classified, with two open questions: "Which store backs sessions?" (Postgres, recommended; SQLite) and "How long is a magic link valid?" (15 minutes, recommended; 1 hour).

### The coordinator gets every open question's answer lines for one plan

- [ ] **Scenario: Every option of every open question gets its own line**
  Given the example plan with its two open questions
  When the coordinator runs `node src/commands/start.js stream answers functional/<plan>.md`
  Then the view shows four answer lines, one per option, each alone on its own line directly under its question's prompt and its option's label
  And under each question one more line holds the plan, labelled "Hold this plan"
  And in the raw output the entry point prints, each of those six lines stands on a physical line of its own, as one quoted value, with no other answer line on that physical line and no character of it escaped
  And the menu's command reference (`src/commands/start.md`) lists `stream answers <plan>`

- [ ] **Scenario: A question with three options gets three lines**
  Given one of the plan's open questions has three options
  When the coordinator opens the answers view
  Then that question shows exactly three answer lines and one hold line
  And no line names an option key that question does not have

- [ ] **Scenario: Answered questions drop out, and an answer to an older revision does not count**
  Given "Which store backs sessions?" was answered for the current revision of the plan's questions, and "How long is a magic link valid?" was answered only for an older revision
  When the coordinator opens the answers view
  Then "Which store backs sessions?" and its lines are absent
  And "How long is a magic link valid?" is listed with all its lines

- [ ] **Scenario: Opening the view moves nothing and records nothing**
  Given the example plan, whose classified question file the gate critic left waiting to be taken in
  When the coordinator opens the answers view twice
  Then both times the view lists the two questions with their lines, as the plan screen would ask them
  And the plan is still in `plans/functional/`, the plan's question screen still asks "Which store backs sessions?", and the task board shows no new task

- [ ] **Scenario: An invalid plan reference is refused**
  Given a reference that names no known stage or leaves the plans folder, such as `nostage/x.md` or `functional/../../x.md`
  When the coordinator runs `stream answers` with it
  Then the menu says the reference is invalid and shows no answer line

### A printed line, run as is, records that answer

- [ ] **Scenario: A printed line records exactly that answer**
  Given the answers view shows the line under "Which store backs sessions?" and "SQLite"
  When the coordinator runs that line unchanged
  Then the menu says it recorded the answer for that plan
  And opening the answers view again no longer lists "Which store backs sessions?"

- [ ] **Scenario: A view line is the same command as clicking the option**
  Given the plan screen (`plan functional/<plan>.md`) currently asks "Which store backs sessions?"
  When the coordinator compares the answers view's lines for that question with the commands the plan screen offers for the same options
  Then each pair is identical, character for character, the hold line included

- [ ] **Scenario: A line for a question rewritten since it was printed records nothing**
  Given the coordinator printed the lines, and the prompt of "Which store backs sessions?" was then rewritten in the plan's question file, which the gate critic classified again
  When the coordinator runs the old line for "Postgres"
  Then the menu says nothing was recorded because the answer does not match the question as it stands now, and that the question will be asked again
  And the answers view now shows a new line for the rewritten question

- [ ] **Scenario: A line for a plan that has moved on records nothing**
  Given the lines were printed while the plan was in `plans/functional/`, and the plan has since moved to `plans/implementation/`
  When the coordinator runs one of the old lines
  Then the menu says nothing was recorded for that plan, and why

### Each line can be matched to the owner's reply, and nothing else poses as one

- [ ] **Scenario: Each line sits under the words the owner chose from**
  Given a plan with one open question that waits for the owner and one the gate critic classified as decided by its recommended option
  When the coordinator opens the answers view
  Then each question shows its prompt, then each option's label, the recommended option first and marked "Recommended", with that option's answer line directly beneath it
  And the question that waits for the owner says so and is listed first
  And the other says it is decided by its recommended option unless answered, and that its line counts only when run before the last answer to a question that waits for the owner, because that answer can move the plan on

- [ ] **Scenario: Text from a question file can never pass for an answer line**
  Given a question whose prompt is itself a well-formed answer line for the plan's other question, carrying the digest the menu prints for that other question
  When the coordinator opens the answers view
  Then no line of the view, leading spaces ignored, starts with text from the question file
  And every line that starts with `stream answer` is one the menu composed for an option of the question it sits under

- [ ] **Scenario: Questions not yet checked by the gate critic get no lines**
  Given a plan with no question file yet, or with only an author's question file the gate critic has not classified
  When the coordinator opens the answers view
  Then the view says the questions have not been generated, or are not yet checked, and shows no answer line

- [ ] **Scenario: A held plan gets only keep and release lines**
  Given the owner holds the plan
  When the coordinator opens the answers view
  Then the view shows only CTOC's keep-or-release question with its two lines, "Keep holding this plan" and "Release the hold"
  And it shows no line for the plan's own questions

- [ ] **Scenario: The owner's question screens stay as they are**
  Given the example plan with its two open questions
  When the owner's question is shown on the stream screen and on the plan screen
  Then neither screen's text contains an answer command line
  And both screens offer the same options and the same answer commands as before this change

## Risks

### Technical Risks
- Two composers drift apart: if the view builds its lines separately from the question screens, a printed line can differ from what the answer route accepts and be refused.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Build the view's lines with the same per-question composer the question screens use (`precomputedQuestionParts` in `src/lib/streaming-gate.js`), and test them against the plan screen's commands for the same question.
- A question file plants an answer line: question text written by an agent and shaped like the answer line of another question is copied by the coordinator, which records an answer the owner never gave and can move the plan on.
  - Likelihood: LOW
  - Impact: HIGH
  - Mitigation: Start every line that carries question-file text with words the menu wrote, strip control characters as the question screens do, and test with a planted prompt. Line and paragraph separators (U+2028, U+2029) cannot start a fake line: the question contract refuses them in prompts and option text (`INVISIBLE`, `src/lib/streaming-precompute.js` line 240), on write and again on every read (`planQuestionsStatus`, line 790).
- Old lines after the plan moves on or a question changes: the coordinator runs a line printed before the change.
  - Likelihood: MEDIUM
  - Impact: LOW (the answer route refuses it and records nothing)
  - Mitigation: Test both refusals through the real answer route.

### Business Risks
- Answering for the owner gets easier: with every line at hand, the main session can answer forks that wait for the owner without his reply. The main session is trusted, not checked, to run only answers he gave (`docs/ENFORCEMENT.md`, line 548).
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: Label each question by whether it waits for the owner, using the gate's own rule (`goesToHuman` in `src/lib/streaming-precompute.js`), and write the view's row in `src/commands/start.md` with the existing rule that the main session runs a line only for an answer the owner gave.

### Dependency Risks
- Shared files with other plans (a scheduling concern, not a dependency): `src/lib/streaming-gate.js` with "A plan in the build queue can be sent back to technical planning and keeps its title"; `src/commands/start.md` with "The classification brief for the gate critic carries the plan file modification time" and the slice "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect"; `src/lib/menu-screens.js` (the router) with "The vision stubs screen names each stub by its title, not by the shared vision prefix".
  - Likelihood: MEDIUM
  - Impact: MEDIUM (a merge collision costs hours of rework)
  - Mitigation: Declare every touched file in the implementation plan's `files:`, so the scheduler never builds two of these plans on one file at once.
- The background-agent menu refusal is switched back on: then a background agent's call of the view is refused, as every `stream` route is (`subagentMayRunRoute`, `src/hooks/protect-records.js` line 725; the switch `RECORD_REFUSALS_OFF = true` at line 1053). This is an open owner decision in "The background-agent protection is measured before the owner decides whether it is on".
  - Likelihood: MEDIUM
  - Impact: LOW (background agents never answer questions; the main session carries no `agent_id` and is not affected)
  - Mitigation: Record in the implementation plan that the refusal is intended, and leave the hook unchanged.

## Priority

**Priority: MEDIUM** (Score: 6/9)
- Dependency: 2 -- no plan depends on it and it depends on none; it runs parallel with the other plans of this vision (shared files are a scheduling matter).
- Business Impact: 2 -- it supports the vision's goal "every plan move the maintainers need is a menu route with usable output"; the vision itself calls each friction small on its own.
- Technical Risk: 2 -- moderate: it reuses the existing composer and answer route, but adds a route and must keep the classification, hold and planted-text rules.

## Decisions Taken Under Ambiguity

- **A separate read-only view, not the existing screens.** The vision and the decomposition both left "stream screen or separate `stream answers <plan>` view" to the Product Owner, so it is decided here and is not a question for the owner. The view wins for three reasons. First, the session shows every screen's text to the owner (`src/commands/start.md` line 16), and command lines with 64-character digests on every plan he opens break "talk to a human like a human". Second, the stream screen and the plan screen ask him one question at a time, and listing every question there would undo that. Third, putting the lines on the plan screen would edit `planDecisionScreen`, the function the build-queue send-back plan also edits. A new view is expected to share only files with other plans, not a function any of them edits.
- **One plan per call.** The friction is about one plan's questions; a listing across all plans is not planned in this vision, and the owner decides whether it becomes a plan.
- **The same rules as the question screen.** The view lists exactly the questions the plan's question screen would put to the owner one by one: none from a file the gate critic has not classified, only keep and release for a held plan, answers bound to the current revision, and the questions that wait for the owner first. Like `nextUnansweredQuestion` and `planDecisionScreen`, it first takes in the gate critic's waiting question files; that is the only write it makes. Without that step the view would say "not yet checked" while the plan screen asks the question. Anything looser than these rules would be a side door around the gate critic's classification rule.
- **"Printed" means in two places, both from the same composed line.** The coordinator reads the raw output of the menu, where the whole screen text is one JSON string on one physical line with `\n` escapes (`src/commands/start.js` line 967). That is the reported complaint, so text alone does not fix it. Each line therefore stands (a) in the screen's text, alone on its own line under its question's prompt and its option's label, for reading; and (b) as one entry of the screen's actions (`src/commands/start.md` line 19: the commands the session runs). The actions are keyed per question and option, so the per-question hold lines do not collide. Pretty-printed, every entry is a physical line of its own with nothing escaped: ids, keys, digests and plan references hold no double quote or backslash (question ids match the contract's `QUESTION_ID`, keys are `1` to `3`, `hold` or `release`, digests are hexadecimal, and a plan file name must match `SAFE_PLAN_FILE`, `src/lib/streaming-gate.js` line 95). This resolves the decomposition's "outside the JSON block" as closely as the menu's single output format allows. No plain-text output mode is added for one route.
- **The owner's questions come first, and default-decided questions carry a note.** The order is the question screen's own. Running lines top to bottom can then move the plan on at the last answer to a question that waits for the owner (the work that moves on after an answer); any later line for a default-decided question would be refused, and the plan would keep its recommended option. So each default-decided question says its line counts only when run before that last answer. Listing default-decided questions first was rejected, because it would bury the questions the owner must answer under the ones he usually leaves alone.
- **"Runnable as printed" means the menu's own arguments.** A line is the words after `node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"`, as every action on every screen is, split the way a POSIX shell (the session's Bash tool) reads single quotes. It is not the single-string form: `splitCliArgs` in `src/commands/start.js` would keep the quote characters in that form, and the answer route would then refuse the question id.
- **One hold line per question.** Each question's block repeats CTOC's "Hold this plan" line exactly as that question's screen offers it, with no digest, so the hold records which question the owner held on. For two questions of two options this gives four option lines and two hold lines.
- **The recommended option is listed first and marked, and each question says whether it waits for the owner,** by the gate's own rule (`goesToHuman`). This tells the coordinator which questions to put to the owner at all.
- **The hook is not changed.** The view is not added to the routes a background agent may run in `src/hooks/protect-records.js`: that would be a hook change, which needs the owner's explicit approval, and background agents never answer questions.
- **Reached through the menu's command reference, not from the owner's screens.** The view is listed in the navigation table of `src/commands/start.md`, which the session reads, and is opened through the real entry point. No option or link is added to the stream screen or the plan screen, so both stay exactly as they are.
- **The third story is recast from the owner to the coordinator.** The owner picks options by label on his question screen and never runs commands; the coordinator is the one who matches his reply to a line.
- **The reproduction is the first failing test.** The stub asks the plan to start by reproducing the unreadable output. Read in source in this pass and not run: no menu output holds the line for a plan's second open question. The implementation plan's first test drives the real menu for the example plan and fails on exactly that before any change is made.
- **No question for the owner.** No fork here touches technology stack, algorithms, security posture, cost or anything irreversible; every choice above is a Product Owner choice the vision left to this role.
- **No questions file written.** The agent's instructions say to write a decision-questions file under `.ctoc/streaming/questions/pending/` as its last act; the CTO Chief's brief says to edit only this plan file. The brief governs, and the questions file would have been an empty list anyway.
- **Priority is MEDIUM.** The stub's MEDIUM is kept after scoring (6 of 9), because the vision calls each friction small on its own.
