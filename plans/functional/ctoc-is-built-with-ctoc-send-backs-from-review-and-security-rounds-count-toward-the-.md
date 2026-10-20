---
title: "Send-backs from review and security rounds count toward the three-per-step limit"
created: "2026-10-20T13:37:49.348Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 11
risk_level: MEDIUM
---

# Send-backs from review and security rounds count toward the three-per-step limit

## Problem Statement
Review rounds were driven by hand, and send-backs from review and security rounds are counted nowhere. The by-hand relaying is not a missing feature: CTOC already has the route (the menu action `claude:start-agent` calling `startAgent` in `src/lib/actions.js`, the background `iron-loop-executor` running the build steps, its `menu task complete <id>` running `completeExecution`, then `menu task complete <id> --continue`, with specialist rounds recorded by `menu task add review|security|quality <plan> --touches <files>` and dispatched by the CTO Chief). This plan is not a new step-runner and not an advance-agent route; `advanceAgent` was deleted on 2026-07-30 as dead code. It files only the one real gap. Read: the limit of three send-backs per step counts only send-backs recorded inside `completeExecution`; `recordStepKickback` has two callers, both there (the refusal before review and a failed verify), so a send-back from a review or security round before completion is counted nowhere and those rounds have no limit and never escalate to the owner. Re-read by the vision advisor: `src/lib/actions.js:1340` and `:1460` are the only two calls of `recordStepKickback(` under `src/`, with the definition at `:1803`. The first step shows, on evidence, the path a review or security send-back takes today and that it never reaches the counter. Changing the circuit breaker is gate logic: changing a hook or gate logic needs the owner's explicit approval, and nothing in this plan is built before he gives it. Disposition: file only the narrow gap. Done, if he approves, when a test drives review or security send-backs of one step and the one past the limit escalates to the owner as a failed verify does today. This plan shares `src/lib/actions.js` with the plan that lets a build-queue plan be sent back; that is a file overlap for scheduling, not a dependency.

## Where a review or security send-back goes today

Read by the Product Owner in this worktree's source on 2026-10-20. Nothing here was run: this agent cannot run code. The run that confirms it is the first acceptance scenario, "Today four send-backs to one step reach no limit".

1. **The counter has one way in.** Pattern `recordStepKickback\(` over the whole worktree: under `src/`, three lines in one file. They are the call at `src/lib/actions.js:1340` (a completion refused before review), the call at `:1460` (a failed verify) and the definition at `:1803`. The other matches are four test files and plan text. Pattern `require\(['"].*circuit-breaker['"]\)` over `src/`: two files. `src/lib/actions.js:1804` sits inside `recordStepKickback`; `src/lib/inbox.js:1061` only reads the escalations. So a send-back is counted only inside `completeExecution`.
2. **A review, security or quality round ends with a registry-only completion.** These rounds are recorded with `menu task add review|security|quality <plan> --touches <files>` (the kinds are listed at `src/lib/task-registry.js:156`). `menu task complete <id>` runs the plan completion only for an `implement` task (`src/lib/menu-screens.js:2714`). For every other kind it stores `ok` and the caller's summary text unchanged (`:2789-2797`) and settles the task. `src/commands/start.md:195-196` documents this as a "Registry-only completion".
3. **So a send-back from such a round is words in a summary.** The round's agent writes where the plan should go back to, and the session relays it and dispatches the fix. By item 1 that text cannot reach the counter, so the plan's count does not move however many rounds send it back.
4. **The builder's own Step 11 REVIEW and Step 13 SECURE** (`agents/iron-loop/iron-loop-executor.md:260-275`) are self-checks inside one agent run. They have no recorded round and no completion of their own.
5. **What an escalation is today.** The circuit breaker escalates on the fourth send-back to one step or the sixth in total (`src/lib/circuit-breaker.js:66-68` and `:424-438`). It appends the escalation to `.ctoc/logs/escalations.json`, and `recordStepKickback` prints a console warning (`src/lib/actions.js:1845-1854`). The owner sees it in the dashboard's escalation count (`src/lib/inbox.js:1093`) and on the `inbox escalations` screen as `Step 10 kicked back 4× (max 3)` or `6 kickbacks total (max 5)` after the plan's name (`src/lib/menu-screens.js:1263-1265`). Nothing refuses a retry. Pattern `listEscalations|getEscalations|escalations\.json` over `src/` matched four files: the writer (`src/lib/circuit-breaker.js`), its caller's comments and console text (`src/lib/actions.js`), and the only two readers, `src/lib/inbox.js` and `src/lib/menu-screens.js`. Both readers display; neither starts or refuses a build.
6. **Counts before and after one send-back: not measured.** By item 1 they are equal. The first acceptance scenario measures it before any source change.

## Business Alignment

**Job to Be Done:** When a review or security round sends a plan back to a step of its build, I want that send-back counted with every other send-back of the plan, so I can be told when one plan keeps coming back instead of finding out from a loop nobody stopped.

**Impact Map:**
- **Goal:** The protections CTOC already promises hold, or the owner knowingly decides they do not (the vision's goal). The promise in question is the circuit breaker in `CLAUDE.md`: "max 3 kickbacks to one step, 5 per plan, then escalate to the user".
- **Actor:** the owner, Tijn van der Zant (the vision's target user). He receives the escalations, and his explicit approval gates every change to gate logic. The CTO Chief's coordinator session, which records the rounds, is the secondary actor.
- **Impact:** the owner learns from his inbox, not from a by-hand relay, that review or security rounds have sent a plan back past the limit, and he decides on evidence whether the circuit breaker counts those rounds at all.
- **Deliverable:** on his approval, a send-back from a review or security round, recorded through the menu with the step it sends the plan back to, counts toward the same per-step and per-plan limits as a failed verify and escalates the same way.

**Alignment checks:** the goal traces to the vision's problem statement and its "Review rounds were driven by hand" friction (yes); the actor is in the vision's target users (yes); the impact is observable on the `inbox escalations` screen (yes); the deliverable is one functional area, the circuit breaker's inputs (yes).

## Decomposition

Source: `plans/decomposition/ctoc-is-built-with-ctoc.md`. Stories marked `[MVP]` are the smallest end-to-end version; the others are the remaining stories, with no phase or schedule (the owner alone chooses what is built and when).

### Vision item carried
- "Review rounds were driven by hand; send-backs from review and security rounds are counted nowhere."

Only the narrow gap is filed. The by-hand relaying is answered by the existing `claude:start-agent` route with the iron-loop executor; this plan is not a new step-runner or advance-agent route.

### Goal: The protections CTOC already promises hold, or the owner knowingly decides they do not
- **Actor:** the owner, whose explicit approval gates every hook and gate-logic change.
- **Impact:** the owner decides on evidence whether review and security send-backs count toward the limit of three per step.
- **Success metric:** this plan is filed as a gap, and nothing in it is built without the owner's explicit approval.

### Activities
1. Confirm where a review or security send-back is recorded today.
2. Put the change to the owner.
3. Count those send-backs and escalate at the limit, if he approves.

### Stories
- [ ] `[MVP]` Spike: As the owner, I want it shown where a send-back from a review or security round goes today and that it never reaches `recordStepKickback` (two callers, `src/lib/actions.js:1340` and `:1460`, both inside `completeExecution`), so that the gap is stated on evidence.
  - Acceptance: the plan records the path a review or security send-back takes and the counts before and after one such send-back.
  - INVEST: passes as a time-boxed investigation.
- [ ] `[MVP]` As the owner, I want the circuit-breaker change put to me as one decision, so that gate logic changes only on my explicit approval.
  - Acceptance: one question with exactly one Recommended option; nothing is built before the answer. Changing gate logic needs the owner's explicit approval.
  - INVEST: passes all six criteria.
- [ ] As the owner, I want a fourth send-back of one step from review or security rounds to stop the loop and escalate to me, so that those rounds have the same limit as the others.
  - Acceptance: driving three review or security send-backs of one step counts three; the fourth escalates to the owner, as a failed verify does today. Built only after his approval.
  - INVEST: passes all six criteria.

### Dependencies
- Story level: a chain of three. The owner's decision depends on the shown path; the counting depends on his approval.
- Plan level: none.
- Shared file (a scheduling concern, not a dependency): `src/lib/actions.js` with "A plan in the build queue can be sent back to technical planning and keeps its title".

## User Stories

**The gap, measured.** **As** the owner, **I want** it shown on evidence where a send-back from a review or security round goes today, **so that** I decide the circuit-breaker change on the measured gap and not on a relayed one.

**The owner's decision.** **As** the owner, **I want** the circuit-breaker change put to me as one decision with one recommended option, **so that** the limit changes only on my explicit approval.

**Counted and escalated.** **As** the owner, **I want** the fourth send-back of a plan to one step, or its sixth in total, coming from review and security rounds, to reach my inbox as an escalation, **so that** those rounds have the same limit as a failed verify and no plan loops through them unseen.

**Never silently wrong.** **As** the coordinator recording a round, **I want** a send-back that cannot be counted to be refused or reported in the completion text, and a round that sends nothing back to count nothing, **so that** the count the owner relies on is never silently low or inflated.

### INVEST check

| Story | Independent | Negotiable | Valuable | Estimable | Small | Testable |
|---|---|---|---|---|---|---|
| The gap, measured | yes | yes: names the evidence, not the tool | yes: the owner's decision rests on it | yes: a time-boxed measurement | yes | yes: two scenarios |
| The owner's decision | qualified: it uses the measured gap, ordered inside this plan | yes | yes: gate logic changes only on his word | yes | yes | yes: three scenarios |
| Counted and escalated | qualified: built only after his approval | yes: the recording route is the implementation planner's choice | yes: escalations reach the owner | yes: one counter call already exists to reuse (`recordStepKickback`) | yes: one completion route and one counter | yes: three scenarios |
| Never silently wrong | qualified: built on the recording route of "Counted and escalated", in the same build | yes | yes: the owner's count stays honest | yes | yes | yes: three scenarios |

The decomposer's third story was split into "Counted and escalated" and "Never silently wrong" so that each story has five scenarios at most.

## Acceptance Criteria

"Round" below means a review or security round recorded with `menu task add` and completed with `menu task complete`. If the owner's answer also counts quality rounds, every scenario of "Counted and escalated" and "Never silently wrong" holds with a quality round in place of a review round, and one of the three rounds in "Three send-backs to one step are counted without an escalation" is a quality round.

### The gap, measured

- [ ] **Scenario: Today four send-backs to one step reach no limit**
  Given a plan in `plans/in-progress/` with no send-backs counted, on the source as it is before this plan changes anything
  When two review rounds and two security rounds for that plan each complete with a summary that sends it back to Step 10 with a reason
  Then the `inbox escalations` screen shows "No circuit-breaker escalations."
  And the implementation plan records the four completion texts and that screen's text before its first source change

- [ ] **Scenario: The measurement contradicts the reading**
  Given that run shows an escalation for the plan, or a send-back count that moved
  When the build reaches its first source change
  Then no source change is made, and the plan goes back to the owner with the run's output and the sentence "the gap is not as filed"

### The owner's decision

- [ ] **Scenario: The change is put to the owner as one decision**
  Given this refined plan
  When the owner reads its "Questions for the owner" section
  Then he finds exactly one question about counting these send-backs, with exactly one option marked Recommended, the evidence it rests on and how strong that evidence is

- [ ] **Scenario: Nothing changes the counting before his answer**
  Given the owner has not answered that question
  When an implementation plan is written from this plan
  Then it has no build step that changes how send-backs are counted
  And once he answers, its first such step quotes his answer and its date

- [ ] **Scenario: The owner keeps the limit as it is**
  Given the owner chooses to keep the circuit breaker as it is
  When the plan is built
  Then four rounds that each send a plan back to Step 10 still put no escalation on the `inbox escalations` screen
  And the circuit-breaker section of `docs/IRON_LOOP.md` names the only two send-backs it counts: a completion refused before review and a failed verify

### Counted and escalated

- [ ] **Scenario: Three send-backs to one step are counted without an escalation**
  Given the owner approved counting, and a plan in `plans/in-progress/` with no send-backs counted
  When three rounds each complete through the menu sending the plan back to Step 10 with a reason
  Then each completion text says the send-back to Step 10 was counted and gives the count for Step 10: 1, then 2, then 3, of a limit of 3
  And the `inbox escalations` screen shows no escalation for that plan

- [ ] **Scenario: The fourth send-back to one step escalates**
  Given the same plan with three send-backs to Step 10 counted
  When a fourth round sends it back to Step 10
  Then the `inbox escalations` screen lists the plan with "Step 10 kicked back 4× (max 3)", the same line a fourth failed verify produces for Step 14 today
  And the completion text says the plan needs the owner

- [ ] **Scenario: Round send-backs and failed verifies share the limit of five per plan**
  Given a plan with two failed verifies counted against Step 14
  When rounds send it back once each to Steps 8, 10, 12 and 13
  Then the fourth of those, the plan's sixth send-back, puts the plan on the `inbox escalations` screen with "6 kickbacks total (max 5)"
  And no "kicked back … (max 3)" line appears for that plan

### Never silently wrong

- [ ] **Scenario: A send-back that names no valid step is refused**
  Given a round for a plan in `plans/in-progress/` with no send-backs counted
  When its completion reports a send-back with no step, or with a step outside 1 to 16
  Then the completion is refused with a message that names the allowed steps, 1 to 16, and the task stays running
  And the next valid send-back of that plan to Step 10 reports a count of 1

- [ ] **Scenario: A send-back that cannot be saved is reported, not dropped**
  Given a plan whose send-back count cannot be saved, because the folder that holds it refuses writes
  When a round's completion reports a send-back of that plan to Step 10
  Then the completion text says the send-back was NOT counted, and why
  And the dashboard's escalation count rises by one, as it does today when a failed verify's count cannot be saved

- [ ] **Scenario: A round that sends nothing back counts nothing**
  Given a plan with one send-back to Step 10 counted
  When a security round completes through the menu without a send-back
  Then its completion text is the text such a completion shows today
  And the next send-back of that plan to Step 10 reports a count of 2

## Scope

### In Scope
- Measuring, before any source change, that a round's send-back reaches no limit today ("The gap, measured").
- One question to the owner, and no change to the counting before his answer ("The owner's decision").
- Under his "keep it as it is" answer only: `docs/IRON_LOOP.md` names the two send-backs the circuit breaker counts ("The owner keeps the limit as it is").
- Recording through the menu that a round sends a plan back, with the step it goes back to and the reason ("Counted and escalated").
- Counting that send-back in the same per-step and per-plan count as a completion refused before review and a failed verify, with the same limits of 3 per step and 5 per plan ("Counted and escalated").
- The escalation a failed verify gets today: the escalations log, the console warning, the dashboard's count and the `inbox escalations` line ("Counted and escalated").
- Refusing a send-back with no valid step, reporting one that cannot be saved, and counting nothing for a round with no send-back ("Never silently wrong").
- Quality rounds, only if the owner's answer includes them.

### Out of Scope
- The by-hand relaying of rounds. The existing `claude:start-agent` route with the iron-loop executor answers it, by the vision's ruling; this plan is no new step-runner and no "advance-agent" route.
- Moving a plan when it is sent back, to technical planning or anywhere else. That is "A plan in the build queue can be sent back to technical planning and keeps its title". This plan counts and moves no plan file.
- The owner's own send-back of a built plan at the done check (the menu's send-back of a plan in `plans/review/`, `rejectPlan`). It is not counted: the vision's gap is the rounds before completion, and in this case the owner is already the one deciding. No plan carries it; he decides whether one is filed.
- The builder's own self-review at Step 11 and self-check at Step 13 inside its run. There is no recorded round to count (evidence item 4). No plan carries it.
- A round that could not run (`menu task fail <id>`). That is a failed task, not a send-back, and it already reaches the inbox (`src/commands/start.md:245`).
- Making an escalation refuse the plan's next retry. Today it refuses none; see "Neighbours". No plan carries it.
- Changing the limits, the file that holds the count, or the escalation log's format. "Plan completion works on a clean install" (`plans/functional/plan-completion-works-on-a-clean-install.md`) leaves them unchanged too.
- Switching the background-agent menu refusal on or off. That is "The background-agent protection is measured before the owner decides whether it is on".

## Risks

### Technical Risks
- **Two rounds write one plan's count at the same time:** `src/lib/circuit-breaker.js:44-46` says the executing plan is "the sole writer of its own counter, so no locking is required". Once rounds count, a review round and a security round on one plan can complete at the same time, and two read-modify-writes of one count can interleave, so one send-back is lost. That rounds of one plan can run together is believed, from `src/commands/start.md:123` ("quality + security on the same plan"), not measured.
  - Likelihood: MEDIUM
  - Impact: MEDIUM (an escalation arrives one send-back late)
  - Mitigation: Test two send-backs of one plan recorded concurrently and require a count of 2; serialize the write if that test fails.

### Business Risks
- **More escalations reach the owner:** rounds that send plans back for small findings now count, so the inbox shows more escalations than it does today.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Count only send-backs that name a step, and keep the step and the count on every escalation line so each can be judged in one glance.

### Dependency Risks
- **The background-agent menu refusal may be switched back on:** its own plan, "The background-agent protection is measured before the owner decides whether it is on", may switch that refusal back on (today `const RECORD_REFUSALS_OFF = true;` at `src/hooks/protect-records.js:1053` keeps it off). A background agent may then run only `menu task complete <id>` with no flag (`src/commands/start.md:133`), so a send-back the reviewing agent records itself through a new flag would be refused.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test the recording route with that refusal both on and off, or record the send-back on the session's own completion call, which a background agent never runs.
- **Shared file with the build-queue send-back:** `src/lib/actions.js` is also edited by "A plan in the build queue can be sent back to technical planning and keeps its title" (`rejectPlan`). That is a file overlap, not a dependency.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Declare `src/lib/actions.js` in both implementation plans' `files:` so the scheduler's file-conflict rule never builds them at the same time.

## Priority

**Priority: MEDIUM** (Score: 6/9)
- Dependency: 2 — no other plan depends on this one; it shares one file with the build-queue send-back and depends on no plan.
- Business Impact: 2 — it supports the vision's goal that CTOC's protections hold; the by-hand relaying itself is already answered by the existing route.
- Technical Risk: 2 — a gate-logic change on the completion route, with one concurrency question and one interaction with the background-agent refusal.

## Questions for the owner

### Should send-backs from review and security rounds count toward the limit of three per step and five per plan?

Today the limit counts only two send-backs: a completion refused before review and a failed verify. A plan that review or security rounds send back again and again is counted nowhere and never reaches your inbox (evidence above). Changing what the circuit breaker counts is gate logic, so nothing in this plan is built before your answer.

- **Recommended: (a) count send-backs from review, security and quality rounds**, against the step each sends the plan back to, in the same count as failed verifies, with the same limits and the same escalation a failed verify gets today. Reason: `CLAUDE.md` promises "max 3 kickbacks to one step, 5 per plan, then escalate to the user" without exception, and quality rounds are recorded through the same `menu task add` route as the other two, so leaving them out leaves the same gap for a third kind. Evidence: the gap is verified by reading and by searching every writer of the count (strong). That plans really loop through these rounds rests on one relayed case from 2026-10-20, with no recorded number of rounds (weak). Cost: the widest of the three changes to gate logic, a step on every send-back a round records, and more escalations in your inbox.
- (b) Count send-backs from review and security rounds only, the two the vision names. The smallest gate-logic change that closes the filed gap; a quality round's send-back stays uncounted.
- (c) Keep the circuit breaker as it is, and make `docs/IRON_LOOP.md` say that it counts only refused completions and failed verifies. No gate-logic change, and the documentation stops promising more than the code does; a plan can still loop through review and security rounds without reaching you.

New ideas in this question, for you to check:
- Counting quality rounds: added by the Product Owner, from the `menu task add review|security|quality` route the vision quotes.
- A round's send-back must name the step it goes back to, 1 to 16, or it is refused: added by the Product Owner.
- Round send-backs share one count with failed verifies, so a review send-back to Step 14 and a failed verify add up: added by the Product Owner, from what the count's step means in `src/lib/circuit-breaker.js:383`.
- "Escalate" means what a failed verify gets today, which refuses no retry: read from the code. `docs/IRON_LOOP.md:289-290` says "Stop" instead; see "Neighbours".

## Decisions Taken Under Ambiguity

1. **Only this plan file was written.** The Product Owner agent file also asks for a `.status` file and a questions file under `.ctoc/streaming/questions/pending/`. The brief allowed edits to this plan file only, so the brief governed. Consequence: the menu does not show the question above until a questions file exists for this plan, for example through `claude:generate-questions` on `functional/ctoc-is-built-with-ctoc-send-backs-from-review-and-security-rounds-count-toward-the-.md`.
2. **The reading half of the measurement is done here; the run is the first build scenario.** This agent cannot run code. The reading names every writer of the count found by search, so the run can only confirm it or stop the plan ("The measurement contradicts the reading").
3. **"Stop the loop and escalate" is read as the escalation a failed verify gets today.** The decomposer's story said "stop the loop"; its acceptance said "as a failed verify does today". Today nothing refuses a retry (evidence item 5). Adding a refusal is a further gate change nobody asked for, so it is listed under "Neighbours".
4. **A send-back counts against the step the plan is sent back to**, in the same count as refused completions and failed verifies. That is what the count's `step` means ("the Iron Loop step being kicked back to", `src/lib/circuit-breaker.js:383`), and what this plan's title asks.
5. **The allowed steps are 1 to 16, not only the build steps 8 to 16.** A review round may send a plan back to design: `agents/coordinator/cto-chief.md:315` sends architectural threats back to Step 6. This plan only counts such a send-back; it moves no plan.
6. **A send-back with no valid step is refused and the task stays running; a send-back that cannot be saved is reported and the completion goes ahead.** The first is a wrong input that a rerun fixes. The second follows the rule at `src/lib/actions.js:1795-1796`: "A counter/IO error never breaks the plan transition — it is reported, not swallowed."
7. **Quality rounds are put to the owner, not decided here.** They widen a gate-logic change, so they are an option in his question; the scenarios name review and security rounds and say how they read if his answer includes quality rounds.
8. **The criteria name what the owner and the coordinator see, not the recording route.** Whether the send-back is a flag on the completion, a field in its result or the session's own call is the implementation planner's choice, within the background-agent risk above.
9. **The Problem Statement and the Decomposition are kept as they were.** The line numbers they cite (`src/lib/actions.js:1340`, `:1460` and `:1803`) were checked again in this worktree and match.
10. **Priority stays MEDIUM**, the score above agreeing with the decomposer's value.

## Neighbours (seen, not built here; scheduling is the owner's)

- **The `inbox escalations` screen prints a failed count record as "undefined kickbacks total (max 5)".** `src/lib/menu-screens.js:1263-1265` treats every escalation that is not `same-step` as a per-plan one and prints its `total`, but an entry recorded when a count cannot be saved has `type: 'breaker-failure'` and no `total` (`src/lib/circuit-breaker.js:467-473`). Read, not run.
- **`docs/IRON_LOOP.md:289-290` says the circuit breaker stops at the limit**; the code records and shows an escalation and refuses no retry (evidence item 5).
