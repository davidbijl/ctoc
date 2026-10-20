---
title: "The classification brief for the gate critic carries the plan file modification time"
created: "2026-10-20T13:37:49.348Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 8
risk_level: MEDIUM
---

# The classification brief for the gate critic carries the plan file modification time

## Problem Statement
Nothing hands the gate critic the plan file's modification time when it is launched to classify a plan's questions. So, reportedly, it stamps its classification with the time it can find, the author's revision stamp, and after a later plan edit the classification is refused as out of date. The coordinator session that launches the gate critic is left with a plan that cannot move on without the owner's approval, or a classification it has to re-run by hand. That is the off-menu work the vision "CTOC is built with CTOC, and every friction found while building it becomes a plan" exists to remove.

Evidence, labelled as in the vision:
- **read in this pass:**
  - `agents/iron-loop/gate-critic.md:37` says the dispatcher supplies `planMtimeMs`. `:94` writes it into the pending file "digits copied character for character", and `:98` says a stamp older than the plan's current modification time is refused as superseded.
  - The classify paragraph of `src/commands/start.md` (`:380-391`) gives the brief only the task id, the plan path and "classify the questions of `{ref}`". It also has the session launch the gate critic *before* `menu task start` (`:385`), so nothing the task start returns can reach the brief.
  - The task the menu hands the session to launch carries only `id`, `kind`, `plan`, `touches` and `gitOp` (`computePromote`, `src/lib/menu-screens.js:2391-2406`).
  - The classify task's label is the question file's stamp rounded down to the whole millisecond (`queueClassification`, `src/lib/menu-screens.js:3000-3011`).
- **read in this pass, the check that refuses:** the sweeper refuses as `superseded` any payload whose `planMtimeMs` is strictly below the plan's current modification time. It compares at full precision and accepts a payload that carries no stamp at all (`src/lib/streaming-questions-sweeper.js:188-192`). It always stamps the live file with the plan's current time (`:215-217`).
- **reported, not re-checked:** on 2026-10-20 the gate critic reused the author's revision stamp, and its classification was refused after a later plan edit.
  - I searched for that refusal with the pattern `superseded` in the four sweeper logs that exist: the main checkout's `.ctoc/logs/streaming-sweeper.jsonl` and those of the agent worktrees `agent-a01f296ce9da6d4b6`, `agent-a92caf11a57443f01` and `agent-aadfde140804ea5df`. This worktree has no sweeper log.
  - Result: one line, dated 2026-10-11, in the main checkout, and nothing from 2026-10-20.
  - The plan therefore starts by reproducing the refusal by construction (the scenario "Reproduce the reported refusal"), not from a log.

## Business Alignment

**Job to Be Done:** When the menu hands me a plan's question classification to launch, I want the gate critic's brief to carry the plan file's modification time, so I can launch the classification once and have it accepted, without re-running it by hand after a plan edit.

**Impact Map:**
- **Goal:** Every plan move the maintainers need is a menu route with usable output. This is the decomposition's first goal, traced to the vision's problem: frictions that pushed the coordinator off the menu.
- **Actor:** the coordinator session (the CTO Chief) that launches the gate critic for a promoted classify task, and the gate critic it launches. Both are named in the vision's target users ("the CTO Chief and background agents that work for him … the critics").
- **Impact:** the coordinator launches a classification once and it lands, or it is refused only when the plan really changed after the critic was handed its time. No classification is re-run by hand, and no `node -e` call reads the plan's time.
- **Deliverable:** the plan file's modification time in the classify task the menu hands over and in the gate critic's brief, proven by tests that drive the real continuation, the real "Check its questions" route and the real sweep.

**Alignment checks:**
1. The goal traces to the vision's problem statement: YES. "Gate critics lack the plan file time" is one of its ten frictions, verbatim.
2. The actor is in the vision's target users: YES.
3. The impact is observable: YES. A classification is accepted or refused, and the plan's gate screen shows which.
4. The deliverable covers one functional area, the classification hand-over: YES.

**Overlap check:**
- I listed the sibling plans with the pattern `plans/functional/ctoc-is-built-with-ctoc-*.md`: 10 files, all of them still stubs.
- I searched `plans/` for the patterns "classify the questions of", "promoted `classify`" and "classify task". Four files matched: this stub, the vision, the decomposition, and the finished plan "ctoc-keeps-working-and-asks-only-what-matters-s2-plans-cross-on-their-evidence", which added the classify paragraph.
- No sibling describes the same behaviour.

## User Stories

**As the** gate critic, **I want** the classification brief to carry the plan file's modification time, **so that** my stamp matches the plan I read and is not refused as superseded.
- INVEST:
  - Independent: yes.
  - Negotiable: yes. It names the outcome, a time in the hand-over and the brief, not how the time is read.
  - Valuable: yes. Without it, every classification after a plan edit is refused.
  - Estimable: yes.
  - Small: yes. It is one field in the hand-over and one line in the brief.
  - Testable: yes, the five scenarios under its story heading in Acceptance Criteria.

**As the** coordinator, **I want** a classification made after a plan edit to be accepted when it carries the new modification time, and refused when it carries the old one, **so that** the out-of-date refusal fires only when it should.
- INVEST:
  - Independent: qualified pass. Its end-to-end scenario needs the first story's time in the hand-over. Its two refusal scenarios run on the sweep alone and already pass today: they reproduce and pin existing behaviour. The decomposition's "passes all six" is narrowed here.
  - Negotiable: yes.
  - Valuable: yes.
  - Estimable: yes.
  - Small: yes.
  - Testable: yes, the three scenarios under its story heading in Acceptance Criteria.

## Decomposition

Source: `plans/decomposition/ctoc-is-built-with-ctoc.md`. Stories marked `[MVP]` are the smallest end-to-end version; there are no remaining stories in this plan, and no phase or schedule (the owner alone chooses what is built and when).

### Vision item carried
- "Gate critics lack the plan file time."

### Goal: Every plan move the maintainers need is a menu route with usable output
- **Actor:** the owner and the CTO Chief, coordinator session and background agents that build CTOC through its menu; after them, every CTOC user on the same routes.
- **Impact:** the coordinator moves plans through the menu without `node -e` calls into `src/lib/actions` or scratch scripts.
- **Success metric:** this plan has a test that drives the real brief and the real out-of-date check, and no classification has to be re-run by hand after a plan edit.

### Activities
1. Promote a classify task and build its brief.
2. The gate critic classifies, and its result is accepted.

### Stories
- [ ] `[MVP]` As the gate critic, I want the classification brief to carry the plan file's modification time, so that my stamp matches the plan I read and is not refused as superseded.
  - Acceptance: the brief built for a promoted `classify` task names the task id, the plan path, "classify the questions of `{ref}`" and `planMtimeMs`, as `agents/iron-loop/gate-critic.md` requires.
  - INVEST: passes all six criteria.
- [ ] `[MVP]` As the coordinator, I want a classification made after a plan edit to be accepted when it carries the new modification time, and refused when it carries the old one, so that the out-of-date refusal fires only when it should.
  - Acceptance: edit the plan, run the classification with the fresh time: accepted; replay it with the old time: refused as superseded.
  - INVEST: passes all six criteria.

### Dependencies
- Story level: the accept-and-refuse story depends on the brief carrying the modification time.
- Plan level: none.
- Shared file (a scheduling concern, not a dependency): `src/commands/start.md` with the existing slice "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect" (`plans/implementation/00412-small-changes-take-a-small-path-s12-critique-queue-and-four-lenses.md`); the two must not edit that file at the same time.

## Acceptance Criteria

Story: the gate critic's brief carries the plan file's modification time.

- [ ] **Scenario: The continuation hands over a classify task with the plan's time**
  Given a plan at a gate whose question file was written by its author, is current, and has not been checked by the gate critic
  When the coordinator runs a continuation (`menu task complete <id> --continue`, `stream answer` or `stream approve`) and the menu returns the classify task to launch
  Then the returned task names the plan and carries the plan file's modification time
  And that time equals, at full precision and with any fraction of a millisecond, the time the operating system reports for the plan file when the list is built

- [ ] **Scenario: "Check its questions" hands over the same time**
  Given the same plan, with no classify task yet recorded for its current question file
  When the human chooses "Check its questions" (`stream check <ref>`)
  Then the classify task it returns to launch carries the plan file's modification time at full precision, exactly as the continuation does

- [ ] **Scenario: The gate critic's brief names the time it was handed**
  Given the session's dispatch instructions for a promoted classify task (the classify paragraph of `src/commands/start.md`)
  When the coordinator composes the gate critic's brief from them
  Then the instructions list the task id, the plan path, "classify the questions of `{ref}`" and `planMtimeMs`
  And they name the handed-over task as the only source of that time, copied digit for digit
  And they require no `node -e` call or other by-hand read to obtain it

- [ ] **Scenario: A time with a fraction of a millisecond survives the round trip (boundary)**
  Given an unedited plan whose modification time has a fraction of a millisecond, and a classify task handed over for it
  When the gate critic's classification carries the handed-over time, copied digit for digit, and the next continuation sweeps it in
  Then the classification is accepted, and the plan's gate screen no longer says that the gate critic's check of its questions is not done
  And the same classification carrying that time rounded down to the whole millisecond (the classify task's label value) is refused as superseded

- [ ] **Scenario: An unreadable plan time is never invented (error)**
  Given a classify task whose plan file cannot be read when the menu builds the list of tasks to launch
  When the coordinator runs a continuation
  Then the continuation completes and returns every other task unchanged
  And the classify task's time is stated as not available, never as a guessed, rounded or zero value

Story: a classification after a plan edit is accepted with the new time and refused with the old one.

- [ ] **Scenario: Reproduce the reported refusal, with the author's stamp after an edit (error)**
  Given a plan whose author's question file was written when the plan's time was A, and the plan was then edited so that its time is B, later than A
  When a gate-critic classification stamped A (the author's stamp, as reused on 2026-10-20) is swept in
  Then it is refused as superseded, and the plan does not move on by itself
  And its gate screen still offers "Generate its questions"
  And the discard log of the waiting folder (`.ctoc/logs/streaming-sweeper.jsonl`) gains one line with the reason `superseded`

- [ ] **Scenario: After an edit, the classification carrying the handed-over time is accepted (happy path, end to end)**
  Given a classify task recorded for question revision A, and the plan edited to time B before the task is launched
  When the menu hands the task over, and the gate critic's classification carries the time it was handed and is swept in
  Then the handed-over time is B, and the classification is accepted
  And the plan's gate screen offers neither "Generate its questions" nor the line saying that the gate critic's check of its questions is not done

- [ ] **Scenario: An edit after the classification was stamped is still refused (edge)**
  Given a gate-critic classification stamped with the plan's time B at the moment it was written
  When the plan is edited to time C before that classification is swept in
  Then the classification carrying B is refused as superseded, and the plan stays waiting for the owner's approval

Which scenarios fail first:
- Fail before the change: the five scenarios of the first story, and "After an edit, the classification carrying the handed-over time is accepted".
- Already pass: "Reproduce the reported refusal" and "An edit after the classification was stamped is still refused". They reproduce and pin the sweep's existing refusal, and their setup needs nothing this plan adds.
- A test of either of those two that is green on its first run is the expected result, not a weakened test.

## Scope

### In Scope
- The plan file's modification time, at full precision, in the classify task the menu hands over on both routes: the continuation and "Check its questions". This is covered by the scenarios "The continuation hands over a classify task with the plan's time", "Check its questions hands over the same time" and "An unreadable plan time is never invented".
- The classify paragraph of `src/commands/start.md`, so the gate critic's brief lists that time and names the hand-over as its source. This is covered by the scenario "The gate critic's brief names the time it was handed".
- Tests that drive the real continuation, the real `stream check` route and the real sweep. These are the scenarios "A time with a fraction of a millisecond survives the round trip", "Reproduce the reported refusal", "After an edit, the classification carrying the handed-over time is accepted" and "An edit after the classification was stamped is still refused". "Reproduce the reported refusal" is the reproduction the vision asks for.

### Out of Scope
- The four-lens critique briefs and the synthesis brief. They belong to the slice "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect" (`plans/implementation/00412-small-changes-take-a-small-path-s12-critique-queue-and-four-lenses.md`). That slice also edits `src/commands/start.md`, so the two edits must not run at the same time. This plan edits only the classify paragraph.
- Any change to `agents/iron-loop/gate-critic.md`, which this plan does not need.
  - It already requires the time from the brief (`:37`, `:94`, `:98`).
  - Its wording is held by `tests/compaction-eval/gate-critic/rule-inventory.json`.
- Any change to the sweeper's or the question store's rules, including the acceptance of a payload with no stamp and the rule that a classified file may only grow within one revision. These rules decide what reaches the owner, and the vision excludes gate-logic changes without his explicit approval.
- A finding outside this plan's goal, listed for the owner to schedule:
  - After a plan edit, the rule that a classification must keep every author question does not run. The store compares only against a file of the same revision (`existingFor` and `writePlanQuestions`, `src/lib/streaming-precompute.js:566-574` and `:654-664`).
  - Today a classification after an edit usually carries the author's stamp and is refused. After this plan it is accepted. So the path on which no code checks that the author's questions were kept becomes the normal outcome after an edit, not an edge case reached only by a classification with no stamp.
  - Why the added exposure is small: within one revision, the classifier already decides by topic which questions reach the owner. With a classification present, only blocking-topic questions go to him (`goesToHuman`, `src/lib/streaming-precompute.js:944-946`). A classifier that wanted to keep a question from him can already do so without dropping it.

## Risks

### Technical Risks
- **The handed-over time is rounded.** If the hand-over carries the task label (`revision-<whole millisecond>`) or a rounded value, every classification on a plan whose time has a fraction of a millisecond is refused, because the sweep compares at full precision.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test the scenario "A time with a fraction of a millisecond survives the round trip" on a fixture whose time has a fraction. First assert that the filesystem kept the fraction, and fail loudly if it did not.
- **The time is read too late to reach the brief.** The session launches the gate critic before `menu task start` (`src/commands/start.md:385`), so a time returned only by the task start never reaches the brief.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: In the two hand-over scenarios, assert that the time is in the task returned by the continuation and by `stream check`, before any task start.
- **Tests that pin the handed-over task's exact fields break when a field is added.**
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Review every test that asserts a handed-over task's fields. Update only to the new, stricter shape, and write down the reason.
- **The classify paragraph is the recipe that the instruction fence requires for the `classify` task kind.** The finished plan "ctoc-keeps-working-and-asks-only-what-matters-s2-plans-cross-on-their-evidence" records this in its decision on adding the classify paragraph to `src/commands/start.md`, and `tests/unexecutable-instruction-fence.test.js` enforces it. An edit could drop the recipe.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Run `tests/unexecutable-instruction-fence.test.js` after the edit. Keep the `menu task add classify` recipe line word for word.

### Business Risks
- **A classification accepted after an edit keeps the author's questions, which were written for the older text.**
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Keep the gate critic's existing duty to read the edited plan and add a question for every weighty choice left unasked (`agents/iron-loop/gate-critic.md:103`). Report the cross-revision finding under Out of Scope to the owner.

### Dependency Risks
- **Shared file with the critique-queue slice.** The slice "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect" also edits `src/commands/start.md`, and it was written against an older section heading, "background precompute (never-wait)". I checked: the current heading at `:265` is "Streaming gate questions — written with the plan, the fleet only on request".
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Sequence the two edits of `src/commands/start.md`. This plan touches only lines `:380-391`.
- **No retry after a refused classification.** After a refusal like the one in the scenario "An edit after the classification was stamped is still refused", the classify task is not retried for the same question revision (one task per revision, `src/lib/menu-screens.js:3000-3011`).
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Test in that scenario that the plan stays waiting for the owner's approval, which fails safe. A new question file from the author queues a new task.

## Priority

**Priority: MEDIUM** (Score: 5/9)
- Dependency: 2. No other stub depends on it. It runs in parallel with its siblings and shares one file with an existing slice.
- Business Impact: 2. It supports the primary goal: it is one of five route frictions under "Every plan move the maintainers need is a menu route with usable output".
- Technical Risk: 1. The refusal check already exists and is well understood. The change adds one field to the hand-over and one line to the brief.

## Decisions Taken Under Ambiguity

1. **Which time.**
   - The brief carries the plan file's current modification time, at full precision, read when the menu builds the list of tasks to launch.
   - It is neither the task label's whole millisecond nor the question file's stored stamp. The sweep compares at full precision (`src/lib/streaming-questions-sweeper.js:190`), the label is rounded down (`src/lib/menu-screens.js:3004`), and the stored stamp is what produced the reported refusal.
2. **Where the time comes from.**
   - It comes from the task the coordinator already holds before launching the gate critic.
   - It does not come from the task start, which runs after the launch (`src/commands/start.md:385`).
   - It is not read by the session itself either: that would be the `node -e` workaround the vision removes.
   - The critique-queue slice uses the same pattern: the code computes the times, and the texts carry them.
   - The exact carrier is the implementation planner's choice, within the first story's scenarios.
3. **A classification after an edit is accepted when it carries the new time.**
   - The vision and this stub ask for exactly this, and it changes no gate code.
   - The gate critic reads the edited plan, not the older one.
4. **"Reproduce the reported refusal" and "An edit after the classification was stamped is still refused" pin existing behaviour.**
   - They are the reproduction the stub asks for, and the guard that the refusal still fires when it should.
   - They are not new behaviour.
5. **The reproduction is constructed.** No sweeper log records the 2026-10-20 refusal. The search is in the Problem Statement.
6. **`agents/iron-loop/gate-critic.md` stays unchanged.**
   - It already demands the time.
   - With no time, its improvised fallback is to copy the author's stamp. That fails closed (refused), which is safer than omitting the stamp, which the sweep accepts.
7. **An unreadable plan time is stated as not available, never invented.**
   - A guessed time could make an older classification read as fresh.
   - The brief then says the time is not available.
   - The gate critic records `planMtimeMs` as not supplied under its existing rule (`agents/iron-loop/gate-critic.md:35`), and the sweep applies its existing rules. No new path is added.
8. **No question for the owner.**
   - No fork in this plan meets the bar of high uncertainty or great importance.
   - The one gate-logic observation is listed under Out of Scope for him to schedule, not decided here.
9. **No questions file and no status file were written.** The brief allowed only this plan file.
