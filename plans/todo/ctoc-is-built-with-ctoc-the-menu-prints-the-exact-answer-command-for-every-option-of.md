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
files:
  - src/lib/streaming-gate.js
  - src/lib/menu-screens.js
  - src/commands/start.md
  - tests/the-menu-prints-every-answer-line.test.js
  - README.md
  # RATCHET FILE — this plan creates a counted artifact (a new tests/*.test.js), so it
  # declares CLAUDE.md for the test-file count (documented-counts.checkPlanDeclaresCountMovers).
  - CLAUDE.md
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

## Implementation Details

### What is built

One read-only menu route, `stream answers <stage>/<file>.md`, reached through the real entry point `node src/commands/start.js stream answers <ref>` → `menu-screens.route` (`case 'stream'`) → a new exported `streamAnswersScreen(ref, projectRoot)` in `src/lib/streaming-gate.js`. It lists every open question of one plan with, under each option's label, the exact answer command the question screens offer for it, plus the question's hold line. The open-question rules are factored out of `nextUnansweredQuestion` into one internal reader, `openQuestions`, that the question screens and the view both read; the answer commands come from the one composer, `precomputedQuestionParts`, which gains an additive `answers` list. Nothing that records an answer changes.

The owner's recorded answer to "Which way should the view go?" (`q10-answer-lines-for-owner-questions-r1792506215818`, `.ctoc/streaming/answers.jsonl` line 260) is option 1, "Print lines for every question, yours marked as waiting for you". This plan builds exactly that: every open question gets lines, and each question that waits for the owner is marked by the gate's own rule (`goesToHuman`).

### Ancestry read

- Vision: `plans/done/ctoc-is-built-with-ctoc.md`, item "Answer lines are hard to get".
- This plan's functional part above, every scenario and decision.
- The owner's question file `.ctoc/streaming/questions/functional__ctoc-is-built-with-ctoc-the-menu-prints-the-exact-answer-command-for-every-option-of.md.json` (the security-posture question) and its one answer in `.ctoc/streaming/answers.jsonl` (option 1).

### Source read for this plan (current lines)

| Where | What it is |
|---|---|
| `src/lib/streaming-gate.js:95` | `SAFE_PLAN_FILE` — a plan file name is plain characters only |
| `src/lib/streaming-gate.js:142` | `parseRef` — the three decision stages (`GATE_META`, line 82): functional, implementation, review |
| `src/lib/streaming-gate.js:190` | `parseAnyRef` — every stage, same traversal guard |
| `src/lib/streaming-gate.js:207` | `invalidPlanRefScreen(stage, file)` |
| `src/lib/streaming-gate.js:392-448` | `nextUnansweredQuestion` — sweep, then held / unclassified / bound answers / owner-first pick |
| `src/lib/streaming-gate.js:461` | `heldWithoutQuestions` |
| `src/lib/streaming-gate.js:473` | `holdQuestion(HOLD)` |
| `src/lib/streaming-gate.js:483` | `quoteArg` — single-quote shell word |
| `src/lib/streaming-gate.js:502-540` | `precomputedQuestionParts(q, ref, header)` — recommended-first order, one action per option, CTOC's Hold last; the `answer` helper at line 518 |
| `src/lib/streaming-gate.js:1429-1430` | `richQuestionScreen` (the stream screen) calls `nextUnansweredQuestion` |
| `src/lib/streaming-gate.js:1569-1648` | `planDecisionScreen` — its own sweep with a spoken fault (lines 1632-1638), then `nextUnansweredQuestion` (line 1646) |
| `src/lib/streaming-gate.js:2327` | `nameOfPlanAt(root, stage, file)` — the plan's human name |
| `src/lib/streaming-gate.js:2435-2521` | `streamAnswer` — `parseRef` (gate stages only), digest check, hold rules; unchanged |
| `src/lib/streaming-gate.js:2523` | `module.exports` |
| `src/lib/menu-screens.js:3375-3389` | `route`, `case 'stream'`; `answer` matched by equality at line 3387 |
| `src/commands/start.js:966-967` | every route's result printed as `JSON.stringify(result, null, 2)` |
| `src/lib/streaming-precompute.js:234-240` | `QUESTION_ID`, `OPTION_KEY` (`1`-`3`), `INVISIBLE` |
| `src/lib/streaming-precompute.js:282` | `questionDigest` |
| `src/lib/streaming-precompute.js:304-320` | `HOLD` |
| `src/lib/streaming-precompute.js:356-462` | `validatePlanQuestions` — id pattern, keys, unique labels, no hold look-alike labels, no invisible characters; re-run on every read |
| `src/lib/streaming-precompute.js:634-687` | `writePlanQuestions` — only-grow within one revision; no stamp later than now |
| `src/lib/streaming-precompute.js:738-836` | `planQuestionsStatus` |
| `src/lib/streaming-precompute.js:944` | `goesToHuman` |
| `src/lib/streaming-precompute.js:1060` | `readAnsweredQuestionIds` |
| `src/lib/streaming-questions-sweeper.js:268` | `sweepPendingQuestions` — writes only the question store and its own log; records no task |
| `src/commands/start.md:22-45` | Navigation Commands table (`stream comment` row at line 29) |
| `.ctoc/false-green-baseline.json:172` | the debt key `src/lib/streaming-gate.js:silent-catch:nextUnansweredQuestion` |
| `src/hooks/protect-records.js:772`, `:1170` | `subagentMayRunRoute`, `RECORD_REFUSALS_OFF = true` |
| `CLAUDE.md:61`, `:94`; `README.md:1145` | the test-file count (586 on disk at planning time) |

### File: `src/lib/streaming-gate.js`

**Action:** MODIFY. **Purpose:** the answers view, and the one open-question reader both the question screens and the view use.

**(a) Add `openQuestions(root, ref)` (internal, not exported), directly after `nextUnansweredQuestion`.** It carries the rules that now sit at lines 413-447, without the sweep:

```js
/**
 * Every open question of `ref`, in the order the question screens ask them, by the gate's own
 * rules: a held plan has only CTOC's keep-or-release question; an author's file the gate critic
 * has not classified has none; an answer counts only when it binds to the current revision
 * (`readAnsweredQuestionIds` with the questions); the questions that go to the human
 * (`goesToHuman`) come first, each group in file order. The ONE encoding the question screens
 * (`nextUnansweredQuestion`, which asks the first) and the answers view (`streamAnswersScreen`,
 * which lists them all) share. Takes in no waiting file: each caller sweeps first. A read;
 * never throws.
 * @param {string} root
 * @param {string} ref
 * @returns {{status: string, open: Array<{question: object, index: number, toHuman: boolean}>, total: number}}
 *   `status` is 'open' or 'held' when `open` is not empty; otherwise one of 'not-computed',
 *   'stale', 'invalid', 'unknown-plan' (the store's own status), 'unchecked', 'none-open' or
 *   'unreadable' — the keys of NO_ANSWER_LINES.
 */
function openQuestions(root, ref) {
  const none = (status) => ({ status, open: [], total: 0 });
  const held = (precompute) => ({ status: 'held', open: [{ question: holdQuestion(precompute.HOLD), index: 0, toHuman: true }], total: 1 });
  let precompute;
  let st;
  let answered;
  try {
    precompute = require('./streaming-precompute'); // lazy: that module requires this one at call time
    st = precompute.planQuestionsStatus(root, ref);
    if (st.status !== 'ready') return heldWithoutQuestions(precompute, root, ref) ? held(precompute) : none(st.status);
    answered = precompute.readAnsweredQuestionIds(root, ref, {
      questionsRevisionMs: st.questionsRevisionMs, planMtimeMs: st.planMtimeMs, questions: st.questions,
    });
  } catch {
    return none('unreadable');
  }
  if (answered.held.length > 0) return held(precompute);
  if (st.classified !== true) return none('unchecked');
  const questions = Array.isArray(st.questions) ? st.questions : [];
  const open = questions
    .map((question, index) => ({ question, index, toHuman: precompute.goesToHuman(question, st.classified) }))
    .filter((o) => !answered.ids.has(o.question.id));
  if (open.length === 0) return none('none-open');
  return { status: 'open', open: [...open.filter((o) => o.toHuman), ...open.filter((o) => !o.toHuman)], total: questions.length };
}
```

**(b) Change `nextUnansweredQuestion` (lines 392-448)** to keep its guard, its comment and its sweep with the EMPTY catch exactly as they are (the false-green baseline key names this function), and replace lines 413-447 with:

```js
  const found = openQuestions(root, ref);
  if (found.open.length === 0) return null;
  const { question, index } = found.open[0];
  return { question, index, total: found.total, held: found.status === 'held' };
```

Same results as today for every input: the first element of the owner-first ordering is `open.find(goesToHuman) || open[0]`; held, unclassified, not-ready, all-answered and a thrown read all still return what they return now (`null`, or the hold question with `index: 0, total: 1, held: true`).

**(c) `precomputedQuestionParts` (lines 502-540) gains an additive `answers` field.** Each entry also records `recommended: o.recommended === true`; after the actions are built:

```js
  // Every answer line this question offers, in screen order (recommended first, CTOC's Hold
  // last): the answers view prints exactly these, so its lines and the screens' actions are one
  // composition, never two.
  const answers = entries.map((e) => ({ key: e.key, label: e.label, recommended: e.recommended, command: actions[e.label] }));
  if (!own) answers.push({ key: HOLD.hold.key, label: HOLD.hold.label, recommended: false, command: actions[HOLD.hold.label] });
```

and returns `{ question, matrix, actions, answers }`. `options` keeps mapping only `label` and `description`, so neither question screen's output changes. The `@returns` JSDoc gains `answers: Array<{key: string, label: string, recommended: boolean, command: string}>`.

**(d) Add `NO_ANSWER_LINES`, `answerLinesNote` and the exported `streamAnswersScreen`**, after `planDecisionScreen`:

```js
/** What the answers view says when it prints no answer line, one fixed sentence per reason. */
const NO_ANSWER_LINES = Object.freeze({
  'not-computed': 'No questions have been generated for this plan yet, so there is no answer line.',
  stale: 'The plan changed after its questions were worked out, so there is no answer line until they are worked out again.',
  invalid: 'The stored questions of this plan are unreadable, so there is no answer line.',
  'unknown-plan': 'There is no plan file at this reference, so there is no answer line.',
  unchecked: 'The gate critic has not yet checked the questions its author wrote, so there is no answer line.',
  'none-open': 'No question of this plan is open, so there is no answer line.',
  unreadable: 'The questions of this plan could not be read, so there is no answer line.',
});

/** The words after "Question N of M · " in the answers view: who decides it, and how long its line counts. */
function answerLinesNote(status, toHuman, ownerOpen) {
  if (status === 'held') return 'the owner holds this plan; only keeping or releasing the hold can be recorded';
  if (toHuman) return 'waits for the owner';
  return ownerOpen
    ? 'decided by its recommended option unless answered; its line counts only when run before the last answer to a question that waits for the owner, because that answer can move the plan on'
    : 'decided by its recommended option unless answered; no question that waits for the owner is open, so the plan can move on at the next answer, approval or completed task, and after that this line records nothing';
}

/**
 * `stream answers <ref>` — the ANSWER LINES of one plan, for the session that records the owner's
 * answers through the menu. Every open question (`openQuestions`: the question screens' own rules,
 * the ones that wait for the owner first), its prompt, each option's label (the recommended one
 * first and marked) with the exact command the question screens offer for that option directly
 * under it (`precomputedQuestionParts(...).answers`), and the question's hold line. Every text line
 * that carries question-file text starts with words the menu wrote ("Question: ", "Option: "), and
 * the prompt is control-stripped with its whitespace collapsed. The same lines ride in `actions`,
 * keyed `<question id> <option key>`, so the raw output prints each on a physical line of its own.
 *
 * Records nothing and moves nothing. Its one write is the sweep of the gate critic's waiting
 * question files, done first as the plan screen does; a sweep fault is said on the screen. No
 * banner, no continuation, no task. A reference outside the plans folder or naming no stage gets
 * the invalid-reference screen; a plan outside functional, implementation and review gets one
 * sentence and no line, because `streamAnswer` takes answers only there (`parseRef`).
 * @param {string} ref plan reference ("stage/file.md")
 * @param {string} projectRoot
 * @returns {{text: string, ask: object, actions: object}}
 */
function streamAnswersScreen(ref, projectRoot) {
  const parsed = parseAnyRef(ref);
  if (!parsed) {
    const raw = String(ref);
    const slash = raw.indexOf('/');
    return invalidPlanRefScreen(slash === -1 ? raw : raw.slice(0, slash), slash === -1 ? '' : raw.slice(slash + 1));
  }
  const { stage, file } = parsed;
  const planRef = `${stage}/${file}`;
  let text = `Answer lines: ${nameOfPlanAt(projectRoot, stage, file)}\n${'─'.repeat(40)}\n\n`;
  const actions = { '◀ Back': '' };
  if (!GATE_META[stage]) {
    text += `  The menu records answers only for a plan in plans/functional, plans/implementation or plans/review; this plan is in plans/${stage}, so there is no answer line.\n`;
  } else {
    try {
      require('./streaming-questions-sweeper').sweepPendingQuestions(projectRoot);
    } catch (err) {
      // Said on the screen, as the plan screen says it: never a silent fall-through.
      text += `  New questions could not be taken in (${stripCtl((err && err.message) || String(err))}).\n\n`;
    }
    const found = openQuestions(projectRoot, planRef);
    if (found.open.length === 0) {
      text += `  ${NO_ANSWER_LINES[found.status]}\n`;
    } else {
      text += '  Every open question of this plan, in the order its question screen asks them. Under each option is\n'
        + "  the menu's own answer command for it, exactly as that screen offers it. Run a line, as the words after\n"
        + '  start.js, only for an answer the owner gave.\n\n';
      const ownerOpen = found.open.some((o) => o.toHuman);
      found.open.forEach((o, i) => {
        const parts = precomputedQuestionParts(o.question, planRef, gateWords.chip(stage));
        text += `  Question ${i + 1} of ${found.open.length} · ${answerLinesNote(found.status, o.toHuman, ownerOpen)}\n`;
        text += `  Question: ${stripCtl(String(o.question.prompt).replace(/\s+/g, ' ')).trim()}\n`;
        for (const a of parts.answers) {
          text += `    Option: ${a.label}${a.recommended ? ' · Recommended' : ''}\n      ${a.command}\n`;
          actions[`${o.question.id} ${a.key}`] = a.command;
        }
        text += '\n';
      });
    }
  }
  return {
    text: text.replace(/\n*$/, '\n\n\n'),
    ask: { questions: [{ question: 'Back to the pending decisions?', header: 'Answer lines', options: [{ label: '◀ Back', description: 'Return to the pending decisions' }] }] },
    actions,
  };
}
```

Add `streamAnswersScreen` to `module.exports` with the comment "live caller: `menu-screens.route`, `stream answers <ref>`".

Example of the view's text for the example plan (digests shortened here; the screen prints all 64 characters):

```
Answer lines: Passwordless magic-link sign-in
────────────────────────────────────────

  Every open question of this plan, in the order its question screen asks them. Under each option is
  the menu's own answer command for it, exactly as that screen offers it. Run a line, as the words after
  start.js, only for an answer the owner gave.

  Question 1 of 2 · waits for the owner
  Question: Which store backs sessions?
    Option: Postgres · Recommended
      stream answer functional/magic-link.md 'q10-store' '1' '3f9a…'
    Option: SQLite
      stream answer functional/magic-link.md 'q10-store' '2' '3f9a…'
    Option: Hold this plan
      stream answer functional/magic-link.md 'q10-store' 'hold'

  Question 2 of 2 · waits for the owner
  Question: How long is a magic link valid?
    ...
```

and in the raw output each line also stands alone, for example `    "q10-store 2": "stream answer functional/magic-link.md 'q10-store' '2' '3f9a…'",` — no character of an id, key, digest or plan reference needs a JSON escape (`QUESTION_ID`, `OPTION_KEY`, the `hold`/`release` keys, hexadecimal digests, `SAFE_PLAN_FILE`).

**Error handling:** an unparseable reference returns the invalid-reference screen; a sweep that throws is said on the screen and the stored questions are still listed; a question store that cannot be read prints its fixed sentence and no line; nothing in the view throws to the entry point (`nameOfPlanAt` falls back to the file name; `openQuestions` never throws).

**Cross-platform:** no new path construction beyond `nameOfPlanAt` (already `path.join`); no shell; no process spawn.

### File: `src/lib/menu-screens.js`

**Action:** MODIFY. In `route`, `case 'stream'` (lines 3375-3389), before the bare-`stream` fallback at line 3388:

```js
      // `stream answers <ref>` — every open question of one plan with the menu's own answer line for
      // each option (records nothing; the session runs a line only for an answer the owner gave).
      if (sub === 'answers') return streamingGate.streamAnswersScreen(ref, projectPath);
```

`answer` (line 3387) is matched by equality, so the two words never collide.

### File: `src/commands/start.md`

**Action:** MODIFY. One row in the Navigation Commands table, directly after the `stream comment` row (line 29):

```
| `stream answers {stage}/{file}.md` | Answer lines for one plan, for the session (records nothing; it first takes in the gate critic's waiting question files): every open question, the ones that wait for the owner first and marked, each option's label with the menu's own `stream answer` line under it, and the question's "Hold this plan" line; the same lines sit in `actions`, keyed by question id and option key. Run a line, as the words after `start.js`, only for an answer the owner gave in this conversation, never on your own; a line for a question decided by its recommended option counts only before the last answer to a question that waits for him. |
```

The row carries no gate number and no `node -e` or `node "<…>.js"` form, so the recipe harness (`src/lib/recipe-harness.js`) extracts nothing new from it.

### File: `tests/the-menu-prints-every-answer-line.test.js`

**Action:** CREATE. Framework `node:test` and `node:assert/strict`. Every case runs in a sandbox under `os.tmpdir()` (`fs.realpathSync`, every stage folder and `.ctoc/state` made, removed in `afterEach`), as `tests/an-answer-starts-no-build.test.js` does. The entry-point cases run `execFileSync(process.execPath, [MENU_ENTRY, ...words], { cwd: root, encoding: 'utf8', env })` with `CLAUDE_PROJECT_DIR` deleted from `env` — no shell. Revisions are made with `fs.utimesSync` on the plan file to fixed past times computed once from the current time (two days ago and one day ago, whole seconds), never with a sleep, and no assertion reads a time or a duration.

Helpers inside the test file (no new helper module):
- `examplePlan(root, questions = EXAMPLE)` — writes `functional/magic-link.md` (title "Passwordless magic-link sign-in", with Problem Statement, Acceptance Criteria and Scope), sets its time to the older revision, and stores `questions` through `writePlanQuestions(root, ref, questions, mtime, undefined, CLASSIFIED)`; returns `{ ref, planPath }`.
- `EXAMPLE` — `q10-store` "Which store backs sessions?" (`critical: true`, topic `technology-stack`; Postgres recommended, SQLite) and `q11-expiry` "How long is a magic link valid?" (`important: true`, topic `security-posture`; 15 minutes recommended, 1 hour).
- `expectedLine(ref, q, key)` — `stream answer ${ref} '${q.id}' '${key}' '${precompute.questionDigest(q)}'`, and for `hold` `stream answer ${ref} '${q.id}' 'hold'`; built from the store's own digest, independent of the code under test.
- `shellWords(line)` — the words of a line as a POSIX shell reads it: outside quotes whitespace ends a word and a backslash takes the next character literally; a single quote opens a span in which every character up to the next single quote is literal; an unterminated quote fails the test.
- `answerLines(text)` — the text lines whose trimmed form starts with `stream answer `.
- `menuRaw(root, ...args)` — the raw standard output of the real entry point; `screenOf(raw)` parses it from its first `{`.

### Live entry point (wiring, same unit of work)

`node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" stream answers <stage>/<file>.md` → `main()` (`src/commands/start.js:925`) → `route(['stream', 'answers', ref])` (`src/lib/menu-screens.js:3345`) → `streamingGate.streamAnswersScreen` → printed by `src/commands/start.js:967`. The session reaches it from the Navigation Commands row in `src/commands/start.md`. `openQuestions` is reached from both `streamAnswersScreen` and `nextUnansweredQuestion` (the stream screen through `richQuestionScreen`, the plan screen through `planDecisionScreen`); the `answers` field is read by `streamAnswersScreen`. Nothing new is reachable only from a test.

### Dependency graph

```
tests/the-menu-prints-every-answer-line.test.js --drives--> src/commands/start.js --> src/lib/menu-screens.js:route
src/lib/menu-screens.js:route --calls--> src/lib/streaming-gate.js:streamAnswersScreen
streamAnswersScreen --calls--> openQuestions, precomputedQuestionParts(.answers), nameOfPlanAt, invalidPlanRefScreen,
                               streaming-questions-sweeper.sweepPendingQuestions (lazy)
nextUnansweredQuestion --calls--> openQuestions
openQuestions --calls (lazy)--> streaming-precompute: planQuestionsStatus, readAnsweredQuestionIds, goesToHuman, HOLD
src/commands/start.md --documents--> the route
```

No new module, so no new load-time edge and no cycle: `streaming-precompute` and the sweeper stay lazy requires, as they are today.

### Test plan (written first, seen failing)

Each case is named by its acceptance scenario.

1. **Every option of every open question gets its own line** (real entry point; the reproduction). Example plan; `menuRaw(root, 'stream', 'answers', ref)`. Expect: the screen text holds exactly six answer lines; after the line `Question: Which store backs sessions?` the trimmed lines are `Option: Postgres · Recommended`, its expected line, `Option: SQLite`, its expected line, `Option: Hold this plan`, the expected hold line; the same for "How long is a magic link valid?"; the line before each prompt is `Question N of 2 · waits for the owner`. In the raw output, for each of the six lines there is exactly one physical line whose trimmed form, trailing comma removed, is `JSON.stringify(key) + ': ' + JSON.stringify(line)` with key `<question id> <option key>`, that physical line holds `stream answer` once, and `JSON.stringify(line)` equals `"` + line + `"` (nothing escaped). `src/commands/start.md` has a row starting "| `stream answers {stage}/{file}.md` |" that contains "only for an answer the owner gave". Fails before the change: `stream answers` falls through to the stream screen, whose text holds no answer line and whose actions hold no line for `q11-expiry`.
2. **A question with three options gets three lines** (router). `q10-store` with a third option "MySQL". Expect three option lines and one hold line under it, and every answer line's key word (`shellWords(line)[4]`) in {`1`, `2`, `3`, `hold`}, with no `3` under `q11-expiry`.
3. **Answered questions drop out, and an answer to an older revision does not count** (router). At the older revision, answer `q11-expiry` through `route(['stream', 'answer', …])`; move the plan to the newer revision (`utimesSync`) and store the same questions for it; answer `q10-store`. Expect the view to hold no "Which store backs sessions?" and no `'q10-store'`, and all three lines of "How long is a magic link valid?".
4. **Opening the view moves nothing and records nothing** (router). The classified question file is placed only in `.ctoc/streaming/questions/pending/` (`pendingQuestionsPath`, with `ref`, `questions` and `classification`, no `planMtimeMs`). Open the view twice. Expect both times the two questions and six lines; afterwards every stage folder lists what it did before, `.ctoc/streaming/answers.jsonl` does not exist, `taskRegistry.load(root).tasks` is empty, `.ctoc/approvals` holds nothing, and `route(['plan', ref])` asks "Which store backs sessions?".
5. **An invalid plan reference is refused** (router). `nostage/x.md` and `functional/../../x.md` give the invalid-reference screen and no `stream answer` anywhere in the screen. Also `todo/x.md` (a plan with a classified question file) gives the sentence that the menu records answers only for plans/functional, plans/implementation or plans/review and no line, and `functional/nothing.md` gives "There is no plan file at this reference".
6. **A printed line records exactly that answer** (real entry point). Print the view; take the line under `Option: SQLite`; run `menuRaw(root, ...shellWords(line))`. Expect "Recorded your answer for magic-link.md."; one answers-log entry for this plan with `questionId: 'q10-store'`, `optionKey: '2'` and the store's digest; the view opened again through the entry point no longer holds "Which store backs sessions?".
7. **A view line is the same command as clicking the option** (router). `route(['plan', ref])` asks "Which store backs sessions?"; for Postgres, SQLite and Hold this plan the view's line under that label equals `planScreen.actions[label]`, character for character.
8. **A line for a question rewritten since it was printed records nothing** (router). Print the view; move the plan to the newer revision and store `q10-store` with the prompt "Which store backs user sessions?"; run the old Postgres line. Expect "Nothing was recorded for magic-link.md: this answer does not match the question as it stands now, so it cannot be checked. The question will be asked again.", no answers log, and the view now showing `Question: Which store backs user sessions?` with a line whose digest differs from the old one.
9. **A line for a plan that has moved on records nothing** (router). Print the view; `fs.renameSync` the plan into `plans/implementation/`; run an old line. Expect "Nothing was recorded for magic-link.md" and "there is no plan file at functional/magic-link.md", and no answers log.
10. **Each line sits under the words the owner chose from** (router). File order: `q13-copy` "What does the sign-in button say?" (topic `detail`, Sign in recommended, Continue) first, then `q10-store`. Expect `q10-store` listed first under `Question 1 of 2 · waits for the owner`; `q13-copy` second, its note containing "decided by its recommended option unless answered" and "counts only when run before the last answer to a question that waits for the owner"; within each question the recommended option first, marked "· Recommended", and each option line directly followed by its own expected line. A second plan with only `q13-copy` open gets the note that no question that waits for the owner is open.
11. **Text from a question file can never pass for an answer line** (router). `q11-expiry`'s prompt is the expected Postgres line of `q10-store` (with its digest), and its second option's label is the expected SQLite line. The assertion walks the text block by block: a block starts at a `Question N of M · …` line and is followed by exactly one `Question: ` line, then pairs of an `Option: ` line and one answer line. Expect: every line that renders a prompt starts (leading spaces ignored) with `Question: ` and every line that renders a label starts with `Option: `, so the planted strings appear only after those prefixes; the text holds exactly six lines starting with `stream answer`; each one sits directly under an `Option: ` line of its own block and equals that block's question's composed line for that option (`expectedLine` with that block's question id and the option's key); and no line starting with `stream answer` sits anywhere else. The real `q10-store` lines are character-for-character equal to the planted texts, by construction — what is checked is where each string is rendered, not that no question-file string ever equals a composed line.
12. **Questions not yet checked by the gate critic get no lines** (router). No question file → "No questions have been generated for this plan yet"; an author's file stored without the classification → "The gate critic has not yet checked the questions its author wrote"; a stored file older than the plan → "The plan changed after its questions were worked out"; an unparseable stored file → "The stored questions of this plan are unreadable"; a classified empty list → "No question of this plan is open". No `stream answer` anywhere in any of these screens.
13. **A held plan gets only keep and release lines** (router). Hold through `route(['stream', 'answer', ref, 'q10-store', 'hold'])`. Expect `Question 1 of 1 · the owner holds this plan…`, the prompt of CTOC's keep-or-release question, exactly two lines (`'ctoc-hold' 'hold'`, and `'ctoc-hold' 'release'` with `HOLD.digest`), each equal to the plan screen's action for that label, and no `q10-store` or `q11-expiry` anywhere in the screen. The same two lines for a plan with no question file held through `route(['stream', 'answer', ref, 'ctoc-hold', 'hold'])`.
14. **The owner's question screens stay as they are** (router). `route(['stream'])` and `route(['plan', ref])` for the example plan: no text line matches `/^\s*stream answer/`; the options are Postgres, SQLite, Hold this plan (and Skip for now on the stream screen); the actions for those three labels equal the expected lines. This case passes before the change too: it is the regression pin for the refactor of `nextUnansweredQuestion` and `precomputedQuestionParts`, together with the existing `tests/streaming-gate.test.js`, `tests/streaming-human-loop-e2e.test.js` and `tests/plans-keep-moving-without-the-human.test.js`.
15. **A waiting folder that cannot be taken in is said, and the stored questions are still listed** (router; fault injection by overriding `Module._load` for the sweeper's resolved path, restored in `finally`, as case B9b of `tests/plans-keep-moving-without-the-human.test.js` does). Expect "New questions could not be taken in (SIMULATED sweeper load failure)." and the six lines.
16. **A question store that cannot be loaded is said, with no line** (router; the same override for `streaming-precompute`). Expect "The questions of this plan could not be read" and no `stream answer` anywhere in the screen.

Coverage: every branch of the new code is driven — the invalid reference and the non-decision stage (5), the sweep fault (15), the unreadable store (16), each not-ready reason, unclassified and nothing open (12), held with and without a question file (13), owner and default notes with and without an open owner question (10), the recommended mark both ways (1, 10). The project floor is `.ctoc/coverage-baseline.json` `minPct`.

### Acceptance criteria mapping

| Scenario | Implemented in | Test case |
|---|---|---|
| Every option of every open question gets its own line | `streamAnswersScreen`, `route`, `start.md` row | 1 |
| A question with three options gets three lines | `precomputedQuestionParts.answers` | 2 |
| Answered questions drop out; an older revision does not count | `openQuestions` (`readAnsweredQuestionIds` with questions) | 3 |
| Opening the view moves nothing and records nothing | `streamAnswersScreen` (sweep only; no banner, continuation or task) | 4 |
| An invalid plan reference is refused | `parseAnyRef` + `invalidPlanRefScreen`; the decision-stage sentence | 5 |
| A printed line records exactly that answer | the composed command; `streamAnswer` unchanged | 6 |
| A view line is the same command as clicking the option | one composer, `precomputedQuestionParts` | 7 |
| A line for a rewritten question records nothing | `streamAnswer` digest check, unchanged | 8 |
| A line for a plan that has moved on records nothing | `streamAnswer` store read, unchanged | 9 |
| Each line sits under the words the owner chose from | owner-first order, `answerLinesNote`, layout | 10 |
| Text from a question file can never pass for an answer line | menu-word prefixes, `stripCtl`, contract on read | 11 |
| Questions not yet checked get no lines | `openQuestions` statuses, `NO_ANSWER_LINES` | 12 |
| A held plan gets only keep and release lines | `openQuestions` held, `holdQuestion` | 13 |
| The owner's question screens stay as they are | `nextUnansweredQuestion` delegates without change of result | 14 |

### Fences this change keeps green

- **False-green fence** (`tests/false-green-fence.test.js`, `.ctoc/false-green-baseline.json`): the empty catch around the sweep stays inside `nextUnansweredQuestion`, so its baseline key still names a live site and the count does not move; every catch in the new code has a body (`openQuestions` returns a status, `streamAnswersScreen` writes the fault into the text).
- **Export reachability**: one new export, `streamAnswersScreen`, with a live caller in `menu-screens.route`; `openQuestions`, `NO_ANSWER_LINES` and `answerLinesNote` are not exported.
- **Documented counts**: the new test file moves the test-file count. `CLAUDE.md` lines 61 and 94 and `README.md` line 1145 are set to the number of `tests/*.test.js` files on disk after the file exists (586 at planning time, so 587 unless another build landed first); `tests/readme-numbers.test.js` and the documented-count tests check them.
- **Gate-number fence**: no screen string carries a gate number.
- **Recipe harness**: the `start.md` row holds no `node -e` and no `node "<…>.js"` form.
- **Type check** (`npm run typecheck`, `tsc` with `checkJs`, non-strict) and **lint** (`npm run lint`, `--max-warnings 0`): JSDoc as written above; no unused binding.
- **`CLAUDE.md` size**: the count edit keeps the byte length (three digits for three digits).

### Security review

- [x] **Path traversal:** the reference goes through `parseAnyRef` (no separator, no `..`, no NUL, not absolute, `SAFE_PLAN_FILE`); only `functional`, `implementation` and `review` reach any read; the question store and waiting folder are found through `questionsPath` and `pendingQuestionsPath` (`sanitizeRef`), unchanged.
- [x] **Planted text:** question-file text (prompts, labels) is validated on every read (`validatePlanQuestions`: no invisible, direction-changing, line- or paragraph-separator characters; no look-alike of CTOC's hold labels), control-stripped on render, and always follows menu words (`Question: `, `Option: `), so no text line can start with it; every answer line is composed by `precomputedQuestionParts` from the contract-restricted id and key, the hexadecimal digest and the safe plan reference, each single-quoted by `quoteArg`. `actions` keys use the id and the key, never a label. Pinned by case 11.
- [x] **No new write and no execution:** the view's only write is the existing sweep (question store, waiting folder, sweeper log); it spawns nothing, records no task, answer, hold or approval, and crosses nothing (case 4).
- [x] **Answers stay checked where they are recorded:** `streamAnswer` keeps the digest check, the hold rules and the gate-stage parser; a printed line is the same command as a click (case 7), and stale lines are refused (cases 8, 9).
- [x] **Who may run a line:** unchanged trust model — the main session runs `stream answer` only for an answer the owner gave (`docs/ENFORCEMENT.md:548-550`); the `start.md` row says so, and each question that waits for the owner is marked (the owner's own choice, option 1). Background agents: `subagentMayRunRoute` (`src/hooks/protect-records.js:772`) refuses every `stream` route once the refusal switch (`:1170`) is on again; that refusal is intended here and the hook is not changed.
- [x] **Error messages:** the sweep fault shows the error's message control-stripped, as the plan screen already does; no stack trace.
- [x] **Secrets, prototype pollution, command injection:** none handled; `actions` is a fresh object literal with string keys built from validated ids and keys.

### Risk mitigations

| Risk | Mitigation | Where |
|---|---|---|
| The view's lines drift from the screens' commands | One composer: the view prints `precomputedQuestionParts(...).answers`, the screens use its `actions`; byte comparison in case 7 | `src/lib/streaming-gate.js`; case 7 |
| The view's rules drift from the question screens' | One reader, `openQuestions`, used by `nextUnansweredQuestion` and the view | `src/lib/streaming-gate.js`; cases 3, 12, 13, 14 |
| A question file plants an answer line | Menu-word prefixes, contract on read, ids/keys as `actions` keys | case 11 |
| Old lines after a change | `streamAnswer` refuses them, unchanged | cases 8, 9 |
| The main session answers for the owner | Owner questions marked by `goesToHuman`; the `start.md` row restates the rule | `start.md`; case 10 |
| Shared files with other plans | Every touched file is in `files:`, so the scheduler serializes builds on them | frontmatter |
| The refactor changes what the owner is asked | Characterization case 14 plus the existing screen suites run in the verify step | case 14 |

## Execution Plan

### Step 8: TEST
Write the tests first (test-driven development). Create `tests/the-menu-prints-every-answer-line.test.js` with the sixteen cases of the test plan above, named by their scenarios. Run `node --test tests/the-menu-prints-every-answer-line.test.js` and record the red result in this plan: case 1 must fail on the missing answer lines (the reproduction of the reported unreadable output), and cases 2-13, 15 and 16 must fail because `stream answers` falls through to the stream screen. Case 14 passes before the change and is recorded as the regression pin it is. No assertion reads a time, a sleep or a duration.

### Step 9: PREPARE
Re-read `src/lib/streaming-gate.js` (lines 392-540, 1569-1766, 2523-2539), `src/lib/menu-screens.js` (lines 3375-3389) and the Navigation Commands table of `src/commands/start.md` at their current lines. Confirm `.ctoc/false-green-baseline.json` still holds `src/lib/streaming-gate.js:silent-catch:nextUnansweredQuestion`. Count `tests/*.test.js` on disk for the documented counts. Run `node --test tests/streaming-gate.test.js tests/streaming-human-loop-e2e.test.js tests/plans-keep-moving-without-the-human.test.js` and record that they are green before the refactor.

### Step 10: IMPLEMENT
- `src/lib/streaming-gate.js`: add `openQuestions` and make `nextUnansweredQuestion` delegate to it, keeping its sweep and empty catch; add the `answers` field to `precomputedQuestionParts`; add `NO_ANSWER_LINES`, `answerLinesNote` and `streamAnswersScreen`; export `streamAnswersScreen`.
- `src/lib/menu-screens.js`: route `stream answers <ref>` to `streamingGate.streamAnswersScreen`.
- `src/commands/start.md`: add the `stream answers {stage}/{file}.md` row after the `stream comment` row.
- `CLAUDE.md` (lines 61 and 94) and `README.md` (line 1145): the test-file count, set to the number on disk.
Run the new test file until green, then the three screen suites named in the preparation step.

### Step 11: REVIEW
`iron-loop-critic` reviews the diff against this plan: one composer and one reader (no second encoding of the open-question rules), `nextUnansweredQuestion` results unchanged, every text line carrying question-file text prefixed by menu words, the view's only write being the sweep, and the start.md row stating the owner-answer rule.

### Step 12: OPTIMIZE
The view reads the question store and the answers log once per call (inside `openQuestions`) and sweeps once; the question screens keep their single read. No further work unless the review finds a second read.

### Step 13: SECURE
`security-scanner` checks the diff against the security review above: reference parsing, planted text in prompts and labels, the `actions` keys, the absence of any new write, spawn or record, and the unchanged hook.

### Step 14: VERIFY
Run the automated checks: `npm run lint`, `npm run typecheck`, and `npm test` (the full suite with the coverage floor from `.ctoc/coverage-baseline.json` `minPct` and zero skipped). All tests pass with `# fail 0`; `tests/false-green-fence.test.js`, `tests/export-reachability.test.js`, `tests/readme-numbers.test.js`, the documented-count tests and the shipped-recipe test over `src/commands/start.md` are green. Any failing test, including one that passes on a rerun, is reproduced and root-caused before anything else.

### Step 15: DOCUMENT
The `start.md` row is the documentation the session reads; check it against the built screen (route name, what it records, the owner-answer rule). JSDoc on `openQuestions`, `streamAnswersScreen`, `answerLinesNote` and the `answers` field matches the code. Record in this plan any choice made during the build under "Decisions Taken Under Ambiguity".

### Step 16: FINAL-REVIEW
`iron-loop-critic` confirms each of the fourteen acceptance scenarios is met by a named, passing case, cases 1 and 6 through the real entry point; the verify evidence is green; and the files changed are exactly those in `files:`.

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

Technical planning pass (implementation planner):

- **The owner's answer is built as given.** The gate critic later asked the owner whether the view prints lines for every question or only for default-decided ones (`q10-answer-lines-for-owner-questions-r1792506215818`, topic security posture); he chose option 1, "Print lines for every question, yours marked as waiting for you". The view therefore lists every open question and marks each one that waits for him by `goesToHuman`. This supersedes the earlier "No question for the owner" line above only in that one question was asked and answered; nothing in this plan re-asks it.
- **Planned in place, no slice files.** The CTO Chief's brief for this pass says to plan this file in place and create no other plan file; the work is one route, one reader, one composer field, one documentation row and one test file, which is one build.
- **The reference is parsed with `parseAnyRef`, then limited to the three decision stages with its own sentence.** `parseRef` alone would send `todo/x.md` to the invalid-reference screen, whose text says the reference "escapes the plans/ directory", which is false for it. The answer route takes answers only for functional, implementation and review plans (`parseRef` in `streamAnswer`), so a plan elsewhere gets one true sentence and no line, never a line the answer route would refuse.
- **One open-question reader, `openQuestions`, shared with the question screens.** Writing the view's own copy of the held, classified, revision-bound and owner-first rules would be a second encoding that drifts; the screens' `nextUnansweredQuestion` now takes the first entry of the same list, with the same results.
- **The sweep and its empty catch stay in `nextUnansweredQuestion`.** `.ctoc/false-green-baseline.json` names that empty catch by its enclosing function, and the fence fails on any new empty catch and on a moved one; the view runs its own sweep with a catch that says the fault on the screen, as `planDecisionScreen` does.
- **The view's lines come from `precomputedQuestionParts`, through an additive `answers` field.** Reading the commands out of the per-label `actions` map would need a second label-to-key mapping in the view; the field carries key, label, recommended mark and command from the one place that composes them.
- **`actions` keys are `<question id> <option key>`.** Labels can repeat across questions and may contain any text a question file holds, including text shaped like an answer line; the id and key are restricted by the question contract and need no escape.
- **A plan that would move on by itself is still listed.** `planDecisionScreen` asks nothing for such a plan; the view still lists its default-decided questions, because each line is still a valid answer until the next continuation moves the plan, and the note under each says exactly that ("no question that waits for the owner is open, so the plan can move on at the next answer, approval or completed task, and after that this line records nothing").
- **The prompt is shown whole.** It is control-stripped and its whitespace collapsed, never cut at a length, because the coordinator matches the owner's reply against the words he chose from.
- **The view shows no banner, runs no continuation and asks only Back.** The banner and the continuation are what other screens do on open or after a recorded answer; the view must record and move nothing. Its one question is "Back", so the session never puts answer lines to the owner as a question.
- **A new test file, with `CLAUDE.md` and `README.md` declared for the count.** One file named by the behaviour, as this repository names its end-to-end tests; the documented-count check (`src/lib/documented-counts.js`) requires `CLAUDE.md`, and `tests/readme-numbers.test.js` pins the README line, so both are in `files:`.
- **Revisions in tests are set with `fs.utimesSync` to past times computed from the current time.** `writePlanQuestions` refuses to reword a classified question within one revision and refuses a stamp later than now; a sleep would be a timing test, which the brief forbids.
- **Case 14 passes before the change.** It is a characterization test of the owner's screens, kept as the regression pin for the refactor, and recorded as such rather than claimed as a failing-first test.
- **No hook change.** `subagentMayRunRoute` (`src/hooks/protect-records.js:772`) refuses every `stream` route for a background agent once the refusal switch is on again; that refusal is intended for this view.
- **How the planted-text scenario is read.** "No line of the view, leading spaces ignored, starts with text from the question file" is checked where question-file text is rendered: a prompt only after `Question: `, a label only after `Option: `. A planted prompt or label may equal, character for character, a line the menu composes for another question (the scenario builds exactly that), so the test checks that every `stream answer` line sits under an `Option: ` line of its own question and equals that question's composed line, never that no question-file string equals one.
- **This build edits two functions the owner's screens use.** The Product Owner's decision above expected the view to share only files with other plans; the technical plan also edits `nextUnansweredQuestion` (its body after the sweep) and `precomputedQuestionParts` (one additive field), to keep one reader and one composer. A search of `plans/implementation`, `plans/todo`, `plans/in-progress`, `plans/review` and `plans/functional` for either name found seven files: this plan, and six that only cite them (four-defects slice 24 cites the sweep line inside `nextUnansweredQuestion`, which stays where it is; small-changes slices 10 and 11, every-agent slice 110, and two functional plans); none edits either function. The plans that declare `src/lib/streaming-gate.js` (27 files by the same search over the four build stages) are serialized with this one by the scheduler's file rule.
- **The "586" in the compaction-eval rule inventories is not the test-file count.** A search for `\b586\b` in `tests/compaction-eval/*/rule-inventory.json` found only rule numbers (`"n": 586`, `"R-586"`) in four files, and `tests/fixtures/claude-md-rule-inventory.json` holds neither "586" nor "test files"; so only `CLAUDE.md` and `README.md` carry the count this build moves.
- **The plan's frontmatter gets `files:` only.** `iron_loop` is stamped by the menu's own `applyIronLoop` (`src/lib/actions.js:656`) when it handles this plan, not by its author.
- **The questions file for this pass is an empty list.** The one weighty fork, the security posture of printing lines for the owner's questions, is answered by the owner; every other choice above is a documented technical choice, not a question of technology stack, algorithm, data model, security posture, cost or anything irreversible.
