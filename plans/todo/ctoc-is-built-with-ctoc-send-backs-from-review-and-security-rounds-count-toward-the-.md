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
files:
  - src/lib/menu-screens.js
  - src/lib/circuit-breaker.js
  - src/commands/start.md
  - docs/IRON_LOOP.md
  - tests/circuit-breaker-wiring.test.js
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

## Implementation Details

Technical plan written by the implementation planner on 2026-10-20. Every line number below was read in the main checkout that day; Step 9 re-reads them before any edit. Nothing was run in this planning pass.

Revised the same day for the two findings of the gate critic's classification:
- **A round usually sees its plan already finished.** A built plan whose checks passed finishes at its build's own `--continue`, before any round is recorded (Measured item 7). The first version counted a send-back only for a plan in `plans/in-progress/` or `plans/review/`, so the owner's choice would rarely have taken effect. A plan in `plans/done/` is now counted too, and case 13 drives the real order: the build finishes, then the round sends it back.
- **The count's write is the owner's decision.** Both designs are specified below under "The count's write: two designs, the owner chooses". The build follows his answer to the question already in the store.

### The owner's answers this plan is built on (settled, never asked again)

Both are recorded in `.ctoc/streaming/answers.jsonl` against `functional/ctoc-is-built-with-ctoc-send-backs-from-review-and-security-rounds-count-toward-the-.md`:

- Recorded 2026-10-20T16:00:56.246Z, question `q10-count-round-send-backs` ("Should a send-back from a review or security round count toward the limit of three send-backs per step and five per plan, and escalate to you the way a failed verify does?"). Answer: option 1, **"Count review, security and quality round send-backs"**.
- Recorded 2026-10-20T16:02:32.413Z, question `q11-who-records-round-send-backs-r1792506215818` ("who may write a send-back into the count that decides when you are told"). Answer: option 1, **"Only the coordinator session records it"**.

What follows from them:
- The scenario "The owner keeps the limit as it is" does not apply, because its Given never happened.
- Every scenario of "Counted and escalated" and "Never silently wrong" holds for quality rounds too.
- One of the three rounds in "Three send-backs to one step are counted without an escalation" is a quality round. This comes from the paragraph directly under "## Acceptance Criteria".
- His choice to count must take effect in the order the pipeline really runs, where most rounds complete after their plan finished. That is why a plan in `plans/done/` is counted (Decision 3).

Still open: "Should the count's write be locked?", a question for this implementation plan. See "The count's write: two designs, the owner chooses".

### The design in one paragraph

The session's own completion of a round gains one argument: `menu task complete <id> --continue --send-back <n> --summary '<reason>'`.

Before anything is written, the menu checks four things:
1. The call carries `--continue`. That is the session's own call; a background agent never makes it.
2. The task is a `review`, `security` or `quality` round.
3. `<n>` is a whole number from 1 to 16.
4. The round's plan is in `plans/in-progress/`, `plans/review/` or `plans/done/`. A round normally completes after its plan finished, so `plans/done/` is where most rounds find it.

If any check fails, the whole completion is refused with a sentence and nothing is recorded.

If all four hold, the task is settled as it is today. Then the send-back is counted through the existing `actions.recordStepKickback(planPath, n, root)`. A failed verify uses that same call, so the round's send-back gets everything a failed verify gets: the same counter and limits, the escalations log, the console warning, the dashboard count and the `inbox escalations` line.

The completion text gains one clause. It gives the count, says when the plan needs the owner, or gives the reason the send-back was NOT counted.

A round without `--send-back` behaves exactly as today. This plan adds no new module and no new export. It changes neither the counter's file, the limits nor the escalations log's format, and it does not change the hook.

Whether the counter's write is locked is the owner's open question. Under the locked design `recordKickback` gains an exclusive-create lock; under the unlocked design the counter's code stays as it is. Both are specified under "The count's write: two designs, the owner chooses".

### Measured before planning (read, not run)

1. **`recordStepKickback(` is called in two places under `src/`:** `src/lib/actions.js:1340` and `:1460`, both inside `completeExecution`. Its definition is at `:1803`.
   - Search: pattern `recordStepKickback|circuit-breaker` over the whole repository, plans excluded.
   - Under `src/` it matched four files:
     - `src/lib/actions.js`: the two calls, the definition and comments.
     - `src/lib/circuit-breaker.js`: comments.
     - `src/lib/inbox.js:1061`: reads the escalations.
     - `src/lib/menu-screens.js:606`, `:1231` and `:1258`: text it displays.
2. **`menu task complete` runs the plan completion only for an `implement` task** (`src/lib/menu-screens.js:2714`). For every other kind it only settles the task in the registry (`:2788-2820`).
3. **No flag carries a step.** `parseTaskArgs` (`src/lib/menu-screens.js:2251-2281`) reads only these flags: `--touches`, `--blocked`, `--gitop`, `--fail`, `--force`, `--label`, `--summary`, `--next`, `--agent-id`, `--gate`, `--b64` and `--continue`.
4. **The hook's rule for background agents leaves out `--continue`.** Its grammar for `menu task complete` (`src/hooks/protect-records.js:664-674`) allows a background agent only `summary`, `gate`, `next` and `b64`. The rule is switched off today: `RECORD_REFUSALS_OFF = true` at `:1053`.
5. **A plan whose verify failed sits in `plans/review/`.** `completeExecution` moves it there before counting (`actions.js:1361` and `:1460`). The continuation finishes a plan in review only when it has a passing check record (`src/lib/streaming-gate.js:736-737`).
6. **The dashboard's inbox counts are remembered for 5 seconds within one process** (`src/lib/inbox.js:1090-1100`). Each menu command runs as its own process.
7. **A built plan whose checks passed finishes before any round is recorded.**
   - The session's `--continue` on the build's own task runs the continuation, and "a built plan whose checks passed finishes" there (`src/commands/start.md:133`, `:187-190`).
   - The continuation calls `crossOnEvidence` for a plan in review (`src/lib/streaming-gate.js:1113-1118`), which moves it to `plans/done/` (`:727-766`).
   - `tests/plans-keep-moving-without-the-human.test.js` case 46 (`:1341-1358`) drives exactly that order.
   - So a round that runs after the build normally finds its plan in `plans/done/`. A plan stays in review only when something holds it: a question that needs the owner, a failed check, or a regime hold.
8. **A finished plan counts and escalates with no change to the counter.**
   - A plan keeps its file name when it moves (`movePlan`, `src/lib/actions.js:105-106`).
   - The counter's file is keyed by that name (`src/lib/circuit-breaker.js:212-214`, `:372-374`).
   - `recordKickback` reads the plan file only at the path it is given (`:399`).
   - The `inbox escalations` screen lists every unacknowledged entry and filters nothing by folder (`src/lib/menu-screens.js:1242-1268`, `src/lib/inbox.js:1059-1066`).
9. **A built plan never returns to `plans/todo/`.** The menu offers a send-back only for a plan in review (`src/lib/streaming-gate.js:1693`), and `rejectPlan` moves a plan one stage back (`src/lib/actions.js:840-856`), from review to in-progress.

### Architecture decision

**The send-back is recorded as a flag on the session's own completion call.** The owner's second answer settles who records it.

A flag on a call the session already makes keeps one call per round. Requiring `--continue` with it makes the session-only rule enforceable with what exists today:
- The menu refuses a `--send-back` that comes without `--continue`.
- When the background-agent rule is switched back on, the hook already refuses `--continue` to a background agent (`TASK_GRAMMAR.complete`, `protect-records.js:669`).

The counting reuses `actions.recordStepKickback`, so a round's send-back escalates exactly as a failed verify does. There is no second escalation path that could drift from the first.

**A finished plan is counted.** The plan is looked for in `plans/in-progress/`, then `plans/review/`, then `plans/done/`. That makes the owner's choice take effect in the order the pipeline really runs (Measured items 7 and 8). The send-back counts and moves no plan file, as the functional plan's scope says, so a finished plan stays in `plans/done/` and its escalation reaches the owner on the `inbox escalations` screen.

**Whether the count's write is locked is the owner's decision.** Both designs follow under "The count's write: two designs, the owner chooses".

### Dependency graph

```
src/commands/start.md (the session's COMPLETION recipe)
  --runs--> node src/commands/start.js menu task complete <id> --continue --send-back <n> --summary '<reason>'
src/commands/start.js:966 --calls--> menu-screens.route --> taskCommand (:3297) --> taskComplete (:2661)
taskComplete --calls--> parseTaskArgs (:2251, gains --send-back), checkSendBack and sendBackText (both new, same file)
taskComplete --lazy require--> src/lib/actions.js recordStepKickback (:1803, unchanged)
              --> src/lib/circuit-breaker.js recordKickback (:389; its code changes only under the locked design; header comment edited under both)
              --> plans/{in-progress,review,done}/<plan>.md (read), .ctoc/state/kickbacks/<plan>.json and .ctoc/logs/escalations.json
              --> under the locked design only: .ctoc/state/kickbacks/<plan>.lock (created and removed around each count)
sendBackText --lazy require--> src/lib/circuit-breaker.js SAME_STEP_MAX, PER_PLAN_MAX (:66, :68)
src/lib/inbox.js listEscalations (:1059) --read by--> the dashboard line (menu-screens.js:606) and the inbox escalations screen (:1242)
tests/circuit-breaker-wiring.test.js --drives--> menu-screens.route([...]) in-process, and src/commands/start.js as a child process
```

There is no cycle. Both new requires are lazy, inside functions, of modules `menu-screens.js` already requires lazily (`actions` at `:2716`).

### File specifications

#### File: `src/lib/menu-screens.js`

**Action:** MODIFY.

**Purpose:** the session's round completion counts a send-back.

**`parseTaskArgs`** (`:2251`) gains one case, beside `--continue`:

`case '--send-back': out.sendBack = String(args[++i] == null ? '' : args[i]); break;`

A `--send-back` with nothing after it reads as `''`, which the step check refuses. The JSDoc gains: "`--send-back <n>`: the session's completion of a review, security or quality round sends its plan back to Step n."

**Two constants** go above `taskComplete`:
- `const ROUND_KINDS = new Set(['review', 'security', 'quality']);` — the task kinds whose completion may record a send-back (the owner's first answer).
- `const SEND_BACK_STEP_RE = /^(?:[1-9]|1[0-6])$/;` — plain digits 1 to 16. It refuses `0`, `17`, `010`, `1e1`, ` 10`, `10.0` and `__proto__`.

**`checkSendBack(root: string, task: {kind: string, plan: (string|null)}, p: object)`** is new and not exported. It returns `{ step: number, planPath: string }` or `{ refusal: string }`. It writes nothing; its only reads are two `existsSync` calls. The checks run in this order:
1. `p.continue !== true` → `{ refusal: "a send-back is recorded only on the session's own completion, the call with --continue" }`.
2. `!ROUND_KINDS.has(task.kind)` → `` { refusal: `only a review, security or quality round sends a plan back; this is a ${stripCtl(task.kind)} task` } ``.
3. `!SEND_BACK_STEP_RE.test(p.sendBack)` → `` { refusal: `a send-back names the step the plan goes back to, a whole number from 1 to 16 ("${stripCtl(p.sendBack).slice(0, 40)}" is not one)` } ``.
4. Find the plan file:
   - `slug = typeof task.plan === 'string' ? task.plan.replace(/\.md$/i, '') : ''`, and `file = slug + '.md'`.
   - If `slug === ''` or `isUnsafePlanFile(file)` is true (`:112`), there is no plan path.
   - Otherwise the plan path is the first of `path.join(getPlansDir(root), 'in-progress', file)`, `path.join(getPlansDir(root), 'review', file)` and `path.join(getPlansDir(root), 'done', file)` that `safeFs.existsSync` finds, read in a loop over `['in-progress', 'review', 'done']`. The first two are the folders `completeTaskPlan` searches, in its order (`actions.js:1714-1730`). `done` is where a built plan whose checks passed already is when its rounds complete (Measured item 7). `todo` is not searched: a built plan never returns there (Measured item 9).
   - If no plan path is found → `` { refusal: `"${stripCtl(String(task.plan)).slice(0, 80)}" names no plan that is being built, is in review or is done, so its send-back cannot be counted` } ``.
5. Otherwise → `{ step: Number(p.sendBack), planPath }`.

**`sendBackText(step: number, plan: string, res: object)`** is new and not exported. `res` is what `recordStepKickback` returns. It returns the clause appended to the completion text:
- When `res.recorded !== true`: `` ` · the send-back to Step ${step} was NOT counted: ${stripCtl(String(res.error))}` ``.
- Otherwise, with `SAME_STEP_MAX` and `PER_PLAN_MAX` read lazily from `./circuit-breaker`: `` ` · the send-back to Step ${step} was counted: ${res.byStep} of a limit of ${SAME_STEP_MAX} for Step ${step}, ${res.total} of a limit of ${PER_PLAN_MAX} for the plan` ``. When `res.escalation` is set, it continues with `` ` — over the limit, so ${stripCtl(plan)} needs you · view: inbox escalations` ``.

**`taskComplete`** (`:2661`) changes in five places:
1. **Check first.** Right after the unknown-id throw (`:2666`) and before the already-completed branch: when `p.sendBack !== undefined`, set `sendBack = checkSendBack(root, task, p)`. On `sendBack.refusal`, return `` { ok: false, taskId: id, error: 'send-back refused', text: `Task ${id}: the completion is refused — ${sendBack.refusal}. Nothing was recorded, and the task is unchanged.` } ``. Nothing is settled, no continuation runs and nothing is counted.
2. **One local helper:** `const countSendBack = () => (sendBack ? sendBackText(sendBack.step, path.basename(sendBack.planPath, '.md'), require('./actions').recordStepKickback(sendBack.planPath, sendBack.step, root)) : '');`.
3. **The already-completed branch** (`:2671-2684`): `const counted = countSendBack();` runs BEFORE `continueAfterCrossing(root)`. The text becomes `` `Task ${id} was already completed by its agent` + counted + continuationText(cont) ``. Nothing is written to the task, as today.
4. **The settling path:** `const counted = countSendBack();` runs right after `settled` (`:2809-2820`). Every refusal above that point (an illegal transition, a bad `nextAction`, a completion error) therefore counts nothing. `text += counted;` goes after the existing completion clause (`:2822-2833`) and before the continuation (`:2841-2849`).
5. **JSDoc:** one paragraph naming the flag, the four checks, the order (settle, then count, then continue), and that `recordStepKickback` reports a count it could not save instead of throwing.

**Error handling:** every refusal is a returned sentence; the router's contract (`taskCommand`, `:3314-3316`) is unchanged. `recordStepKickback` never throws. When it cannot save a count it appends a `breaker-failure` escalation and returns `{ recorded: false, error }` (`actions.js:1812-1823`). Under the locked design a held lock is one more such case; `taskComplete` needs no branch of its own for it.

**Cross-platform:** `path.join` and `safeFs.existsSync`, and no separators inside strings. The module gains no top-level require, because the hook loads it for `parseTaskArgs`.

#### File: `src/lib/circuit-breaker.js`

**Action:** MODIFY. Under both designs the header comment changes. Under the locked design `recordKickback` also gains the lock; under the unlocked design the code is untouched.

- **The "LIVE CALL SITE" paragraph** (`:48-52`) names three routes:
  - a completion refused before review, in `actions.completeExecution`;
  - a failing Step 14 VERIFY, in the same function;
  - a send-back the session records on a review, security or quality round's completion (`menu-screens.taskComplete`, through `menu task complete <id> --continue --send-back <step>`, per the owner's answers of 2026-10-20), for a plan that is being built, is in review or is done.

  It also says that `tests/circuit-breaker-wiring.test.js` covers both the real completion and the real menu route.
- **The "Concurrency" paragraph** (`:44-46`) claims a single writer per counter, which stops being true. Its new text is the one of the design the owner chooses, written out under "The count's write: two designs, the owner chooses".

#### File: `src/commands/start.md`

**Action:** MODIFY.

**Purpose:** the session knows when to pass the flag, and the round's agent knows to name the step.

- **WORK dispatch, the brief paragraph (`:127`):** one sentence at its end: "A `review`, `security` or `quality` round's brief also asks that its one-line summary end with `send back to Step <n>: <reason>` (n a whole number from 1 to 16) or with `nothing to send back`."
- **COMPLETION step 1 (`:133`):** these sentences go after "Never put `--continue` in an agent's brief.":
  - "When the task is a `review`, `security` or `quality` round whose summary sends its plan back to a step, add `--send-back <n>` (that step) and keep the reason in `--summary`."
  - "The menu counts it toward the limit of three send-backs to one step and five per plan. Its text gives the count, says when the plan needs the owner, or says the send-back was NOT counted and why."
  - "A round that sends nothing back carries no `--send-back`."
  - "A `--send-back` is refused and records nothing when it comes without `--continue`, on another kind of task, with a step outside 1 to 16, or for a plan that is not being built, in review or done. Fix the call and run it again."
  - "Run a completion that carries `--send-back` on its own, never beside another `menu task complete` call in the same turn."
  - Under the locked design only: "When its text says the send-back was NOT counted because the count is being written by another call, run the same call once more; it is counted then."
  - "Never put `--send-back` in an agent's brief."
- **After the registry-only bullet (`:195-196`):** one bullet: "A review, security or quality round completed with `--send-back <n>` is still a registry-only completion: no plan file moves, and the clause after the last `·` in its text says what was counted."

#### File: `docs/IRON_LOOP.md`

**Action:** MODIFY. One paragraph goes under the Circuit Breaker table (`:287-290`):

"What is counted, in one count per plan (`.ctoc/state/kickbacks/<plan>.json`):
- a completion refused before review, against the first required step that is missing or unchecked (Step 14 when none is);
- a failed verify, against Step 14;
- a send-back from a review, security or quality round, against the step it names, also when the plan has already finished. The session records it on that round's completion (`menu task complete <id> --continue --send-back <step>`). The plan is not moved.

Past a limit, the plan is listed on the menu's `inbox escalations` screen and in the dashboard's escalation count."

The table's "Stop." wording stays as it is (see Neighbours).

#### File: `tests/circuit-breaker-wiring.test.js`

**Action:** MODIFY. A second `describe` goes below the existing one, and the header comment gains one sentence naming the round route.

### The count's write: two designs, the owner chooses

**Why it is his.** When he chose to count these send-backs, the plan's stated mitigation was a test that two send-backs recorded at the same moment count 2, with the write serialized if they did not. Such a test makes two processes race, so it passes or fails by chance: it is a timing test, which the owner forbids. What is left is a real choice between a lock and a known limit. The gate critic's classification put it to him as the question "Should the count's write be locked?" (id `q10-round-count-write-lock-r1792514438287` in `.ctoc/streaming/questions/implementation__ctoc-is-built-with-ctoc-send-backs-from-review-and-security-rounds-count-toward-the-.md.json`). `.ctoc/streaming/answers.jsonl` held no answer to it when this revision was written. Its option 1 is the locked design and is marked Recommended; option 2 is the unlocked design. Step 8 reads his answer, and the build carries out only the design he chose.

**Who writes one plan's count, after the finished-plan fix.** Two kinds of call write it:
- the build's own completion (a completion refused before review, a failed verify), in `actions.completeExecution`;
- the session's completion of a round with `--send-back`.

The scheduler never runs a round that declares the plan's files beside its build (`task-registry.js:47-48`), and most rounds now complete after their plan finished, when the build no longer writes (Measured item 7). Two writes of one count can still meet in two ways:
- two round completions for one plan run side by side, for example a review and a security round of one finished plan whose notifications arrive in the same session turn;
- a round that declares no files (`task-registry.js:646`) completes while its plan's build completes.

Both designs add one sentence to the session's recipe: run a completion that carries `--send-back` on its own, never beside another `menu task complete` call (see `src/commands/start.md` above). That removes the first way when the session follows it; it cannot remove the second.

#### Locked design (option 1 of the question, marked Recommended)

**`src/lib/circuit-breaker.js`:**
- **`const COUNT_LOCK_STALE_MS = 60000;`**, the same age as `BUILD_START_LOCK_STALE_MS` (`actions.js:1004-1005`), which the question names.
- **`withCountLock(projectPath: string, slug: string, fn: () => T)` → `T`** is new and not exported. It mirrors `actions.withBuildStartLock` (`:1031-1086`), with one difference: a held lock throws instead of answering busy, because its only caller reports a throw as "not counted".
  1. `safeFs.mkdirSync(path.join(projectPath, '.ctoc', 'state', 'kickbacks'), { recursive: true })`. The lock is `.ctoc/state/kickbacks/<slug>.lock`, beside the plan's counter file. It is built from the same bare slug as `kickbackStatePath` (`:212-214`), so it cannot leave that folder.
  2. Create the lock with `safeFs.writeFileSync(lockPath, mark, { flag: 'wx' })`, where `mark` is `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`.
  3. `EEXIST` from that create: read what is there with `safeFs.lstatSync`, so a link is never followed.
     - Anything that is not a plain file (a folder, a symbolic link, anything else) → throw `the kickback counter's lock for ${slug} is not a plain file, so it was left as it is`. It is never followed or deleted.
     - A plain file with `Math.abs(Date.now() - st.mtimeMs) <= COUNT_LOCK_STALE_MS` → throw `the kickback counter for ${slug} is being written by another call at this moment`.
     - An older plain file was left by a call that died: delete it and create once more. A second `EEXIST` → the same "being written by another call" throw.
  4. On Windows, `EPERM`, `EACCES` or `EBUSY` from the create mean a lock being deleted (`actions.js:1039-1047`) → the "being written by another call" throw.
  5. Any error from step 1, whatever its code (a file where the folder should be makes `mkdirSync` throw), and any other error from a create → throw `could not persist the kickback counter for ${slug}: ${cause}`. That is the wording `writeKickbackState` already throws (`:297`), so a folder that refuses writes reads the same under both designs (case 6). `tests/circuit-breaker-coverage.test.js:211-233` still sees exactly one `breaker-failure` entry: the lock appends none itself, and `recordStepKickback` appends the one.
  6. Run `fn`. In `finally`, release the lock only if it is still ours: `lstat` says a plain file of at most 64 bytes whose content equals `mark`. Our own lock that cannot be deleted → `recordBreakerFailure(projectPath, { plan: slug, error: "the kickback counter's lock could not be removed; send-backs of this plan are reported as not counted until it is 60 seconds old" })`.
- **`recordKickback`** (`:389`): `normalizeStep` and `planSlug` stay first, before any file is touched (`tests/ctoc-audit-w05-circuit-breaker.test.js:180` and `:215`). Everything after them runs inside `withCountLock(projectPath, slug, () => { … })`: the counter read, the plan read, the migration fold, the write, the unreadable-counter report, and the escalation and its append. A ghost plan's throw (`:399`) still reaches `recordStepKickback`, and the lock is released on the way out.
- **The header's "Concurrency" paragraph:** "Every read-modify-write of one plan's count runs under `.ctoc/state/kickbacks/<slug>.lock`, created exclusively. A call that finds it held does not wait. It throws, and `actions.recordStepKickback` reports the send-back or the failed verify as NOT counted and appends a `breaker-failure` escalation, so a count is never lost silently. A lock older than 60 seconds was left by a call that died, and it is taken over. `ponytail:` a takeover can leave two holders (a holder suspended for more than a minute), and then one count can be lost as without the lock. Upgrade path: a heartbeat like the plan-index store's."
- **What the owner and the session see on a held lock:** the round's completion text ends with `the send-back to Step 10 was NOT counted: the kickback counter for <plan> is being written by another call at this moment`. A failed verify that meets it prints the existing `CIRCUIT BREAKER FAILURE` console line. Either way one `breaker-failure` entry is appended, so the dashboard's escalation count rises by one. That entry reads "undefined kickbacks total (max 5)" on the `inbox escalations` screen, the functional plan's neighbour, unchanged here. The session then runs the same call once more, as the recipe says, and the send-back is counted.
- **Cost, as the question states it:** the counter's code changes, so its five existing test files must stay green around it (Step 14). A crash inside the few file operations under the lock leaves a lock that makes this plan's send-backs report NOT counted for up to 60 seconds, each one visibly.

**Tests, written only under this answer:** cases 14 to 16 below.

#### Unlocked design (option 2 of the question)

- **`src/lib/circuit-breaker.js`:** the code is untouched.
- **The header's "Concurrency" paragraph:** "One plan's count has two kinds of writer: the build's completion and the session's completion of a round with `--send-back`. The scheduler never runs a round that declares the plan's files beside its build, most rounds complete after their plan finished, and the session's recipe runs a completion with `--send-back` on its own. `ponytail:` no lock. Two writes of one count can still meet: two round completions for one plan run side by side against the recipe, or a round that declares no files (task-registry.js:646) completes while its plan's build completes. Two read-modify-writes that meet lose one count, silently, and an escalation reaches the owner one send-back late. The rename keeps the file whole. Upgrade path: an exclusive-create lock around the read and the write, as actions.withBuildStartLock takes."
- **What is given up:** the story "Never silently wrong" promises that the count is never silently low. Under this design it can be, by one, in the two cases named above, and nothing says so.

**Tests:** no case is added. A test that makes two writes meet would be a timing test.

### Test plan

**File:** `tests/circuit-breaker-wiring.test.js`. **Framework:** `node:test`, with `node:assert` as the file already uses. One new block: `describe("a round's send-back counts toward the same limits as a failed verify (owner's answers of 2026-10-20)")`.

**Fixtures.** They live in the file and use no doubles. `ms` is `require('../src/lib/menu-screens')`.
- `makeSandbox()`: `fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-round-send-back-'))`, with `plans/{functional,implementation,todo,in-progress,review,done}` and `.ctoc/`. It is removed in `after`.
- `writePlan(root, stage, slug)`: writes `---\ntitle: "Fixture plan"\ntype: feature\n---\n\n# Fixture plan\n`.
- `round(root, kind, plan)`: runs `ms.route(['menu','task','add',kind, ...(plan ? [plan] : [])], root)`, then `ms.route(['menu','task','start',id], root)`, and returns the id.
- `complete(root, id, ...flags)`: runs `ms.route(['menu','task','complete',id, ...flags], root)`.
- `statusOf(root, id)`: reads the task's status from `taskRegistry.load(root)`.
- `counts(root, planPath)`: `circuitBreaker.readKickbackCounts(planPath, root)`.
- `escalationsText(root)`: `ms.route(['inbox','escalations'], root).text`.
- `quiet(fn)`: swaps `console.warn` and `console.error` for no-ops around `fn` and restores them in `finally`. Otherwise the breaker's own console lines flood the test output.
- `finishedPlan(root, slug)`: a built plan that finishes on its checks through the real route, as `tests/plans-keep-moving-without-the-human.test.js` seeds one (`seedBuilt`, `:90-113`, and `builtAndDone`, `:1323-1338`). It returns the plan's path in `plans/done/`.
  - It writes `plans/review/<slug>.md` with a `title` and an `## Execution Plan` whose Steps 8 to 16 each carry one checked item (the body `reviewBody` writes, `:78-82`). It sets the file's time one minute back with `fs.utimesSync`. That is a fixture time, not a wait.
  - It writes a passing check record at `require('../src/lib/step-13-verify').verifyEvidencePath(root, slug)`, with the shape of `:97-105`.
  - It writes the admission record with `require('../src/lib/approval-ledger').writeEntry(slug, { content, stage_from: 'implementation', stage_to: 'todo' }, root)`.
  - It adds an `implement` task for the plan and settles it `done` through `taskRegistry.withRegistry`, as the build agent's own completion leaves it (`:1327-1333`).
  - It runs the session's call, `ms.route(['menu','task','complete', buildId, '--continue'], root)`, and asserts that `plans/done/<slug>.md` exists and `plans/review/<slug>.md` does not. That is the precondition: the plan finished before any round runs.

**The cases**, in the order they are written. Cases 1 to 13 are written under both of the owner's answers to the lock question; cases 14 to 16 only under the locked answer. Each asserts on what the owner or the session sees (the completion text, the `inbox escalations` screen, the dashboard) and on the count on disk.

1. **"today: a send-back written only in a round's summary counts nothing"** — the measurement of the first acceptance scenario.
   - Setup: a plan in `in-progress/`. Two `review` rounds and two `security` rounds, each completed with `'--continue', '--summary', 'send back to Step 10: <reason>'` and no `--send-back`.
   - Asserts: every result is `ok: true`; the screen text includes `No circuit-breaker escalations.`; `counts` is `{ by_step: {}, total: 0 }`.
   - Prints the four completion texts and the screen text with `t.diagnostic`.
   - It passes on the code as it is today and after the change, and it is never weakened.
2. **"three send-backs to Step 10 from a review, a security and a quality round are counted 1, 2 and 3 of 3, with no escalation"**
   - Setup: rounds of kind `review`, `security` and `quality`, each completed with `'--continue','--summary','send back to Step 10: x','--send-back','10'`.
   - Asserts: completion text n matches `send-back to Step 10 was counted: n of a limit of 3 for Step 10, n of a limit of 5 for the plan` and does not match `needs you`; each task's status is `done`; `counts.by_step['10']` is 1, then 2, then 3; the screen has no line for the plan.
3. **"the fourth send-back to Step 10 escalates with the line a fourth failed verify gets, and the text says the plan needs the owner"**
   - Setup, in its own sandbox (no case depends on another case's state): three rounds send the plan back to Step 10 as in case 2, then a fourth `review` round sends it back to Step 10. A second plan in `review/` gets four `actions.recordStepKickback(p, 14, root)` calls inside `quiet`; that is the call a failed verify makes (`actions.js:1460`).
   - Asserts: the fourth text matches `4 of a limit of 3 for Step 10` and `needs you · view: inbox escalations`. The screen matches `• <round plan>  Step 10 kicked back 4× \(max 3\)` and `• <verify plan>  Step 14 kicked back 4× \(max 3\)`. The age after each line is not compared.
4. **"round send-backs and two failed verifies share the limit of five per plan"**
   - Setup: a plan in `review/`, where failed verifies leave it, with two `recordStepKickback(p, 14, root)` calls. Rounds then send it back once each to Steps 8, 10, 12 and 13.
   - Asserts: the third round's text says `5 of a limit of 5 for the plan` with no `needs you`, and the screen still has no line for the plan. The fourth's says `6 of a limit of 5 for the plan` and `needs you`. The screen then matches `• <plan>  6 kickbacks total (max 5)` and has no `kicked back` line for it.
   - This case also proves that a plan in `review/` is found.
5. **"a send-back with no step, or with a step outside 1 to 16, is refused naming 1 to 16; the task stays running and the next valid send-back counts 1"**
   - Setup: one running `review` round. It is completed with `'--continue','--send-back'` and nothing after it, then with `'17'`, `'0'` and `'ten'`.
   - Asserts, for each: `ok: false`; the text matches `a whole number from 1 to 16` and `Nothing was recorded`; the status stays `running`; `.ctoc/state/kickbacks/` holds no file.
   - Then `'--continue','--send-back','10'` on the same task: the text matches `1 of a limit of 3 for Step 10`.
6. **"a send-back whose count cannot be saved is reported NOT counted, and the dashboard's escalation count rises by one"**
   - Setup: a file is written where `.ctoc/state/kickbacks` would be. It stands in for a folder that refuses writes, as `tests/circuit-breaker-coverage.test.js:217-218` does.
   - First, `ms.buildDashboardTable(root)` shows no `circuit-breaker escalation` line, a count of 0.
   - The round then completes with `--send-back 10` inside `quiet`. Asserts: `ok: true`; the status is `done`; the text matches `send-back to Step 10 was NOT counted: ` followed by the error from writing the count (`could not persist the kickback counter`).
   - Then `require('../src/lib/cache').invalidate()` runs, because each menu call is its own process and one process's 5-second read cache is not what is under test. The dashboard now matches `⛔ 1 circuit-breaker escalation`.
7. **"a round that sends nothing back counts nothing and shows today's text"**
   - Setup: a plan with one send-back to Step 10 counted through a round. A `security` round then completes with `'--continue','--summary','nothing to send back'`.
   - Asserts: the text equals `` `Task ${id} → done` `` exactly and does not match `send-back`. That is the text the same completion gives today in this sandbox, where the continuation moves nothing, and case 1 prints the same shape on today's code. `counts.total` stays 1.
   - A further round's `--send-back 10` then reads `2 of a limit of 3 for Step 10`.
8. **"only the session's own completion records a send-back: without --continue it is refused and nothing is counted"**
   - The call is `'--send-back','10','--summary','x'` with no `--continue`.
   - Asserts: `ok: false`; the text matches `only on the session's own completion`; the status is `running`; no counter file exists.
9. **"a send-back on a task that is not a review, security or quality round is refused"**
   - Setup: a `plan` task for the same plan, started, then completed with `'--continue','--send-back','10'`.
   - Asserts: it is refused with `only a review, security or quality round`; the status is `running`.
10. **"a send-back for a round with no plan, an unsafe plan name, or a plan that is not being built, in review or done is refused, and the task stays running"**
    - Setup: four rounds: one with no plan, one with plan `in-progress/x.md`, one with plan `ghost`, which has no file anywhere, and one with plan `queued`, whose only file is in `plans/todo/`.
    - Asserts, for each: it is refused with `names no plan that is being built`; the status is `running`; no counter file exists.
11. **"a round its own agent already completed is still counted on the session's --continue --send-back"**
    - Setup: first `complete(root, id, '--summary', 'reviewed')` (the agent's own call), then `'--continue','--send-back','10'`.
    - Asserts: `ok: true` and `alreadyCompleted: true`. The text matches `was already completed by its agent` and `1 of a limit of 3 for Step 10`. The task's stored result is unchanged (`deepStrictEqual` with a copy taken before the call).
12. **"through the real menu command, four send-backs of a finished plan print their counts, the fourth warns and is listed on inbox escalations"** — the session's real path, in the pipeline's real order.
    - Setup: `finishedPlan(root, 'shipped')`, then four rounds for it, set up in-process. Each is completed with `spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'commands', 'start.js'), 'menu', 'task', 'complete', id, '--continue', '--summary', 'send back to Step 10: x', '--send-back', '10'], { cwd: root, encoding: 'utf8', env })`. `CLAUDE_PROJECT_DIR` is deleted from `env`, as `tests/a-question-file-keeps-one-status-line.test.js:110-112` does.
    - Asserts: each exit status is 0; `JSON.parse(stdout).text` gives the counts 1 to 4; the fourth's `stderr` matches `CIRCUIT BREAKER ESCALATION`; `start.js inbox escalations`, run the same way, prints the `Step 10 kicked back 4× (max 3)` line.
13. **"a plan that finished on its checks before any round ran is counted, stays in done, and its fourth send-back to Step 10 escalates"** — the owner's choice taking effect in the order the pipeline really runs.
    - Setup: `const done = finishedPlan(root, 'finished')`, and the plan's bytes read before any round. Then rounds of kind `review`, `security`, `quality` and `review`, each completed with `'--continue','--summary','send back to Step 10: x','--send-back','10'`.
    - Asserts: every result is `ok: true` with the task `done`; the texts match `1 of a limit of 3 for Step 10` to `4 of a limit of 3 for Step 10`, and only the fourth matches `needs you`; `counts(root, done).by_step['10']` is 4; `plans/done/finished.md` still exists with the same bytes, and no copy of it is in any other folder; the screen matches `• finished  Step 10 kicked back 4× \(max 3\)`.
    - On the first version of this plan, which searched only `in-progress/` and `review/`, the first round is refused with `names no plan that is being built`, so this case fails there. Step 11 shows it by removing `done` from the folders `checkSendBack` searches.

Cases 14 to 16 are written only when the owner's answer to the lock question is the locked design. Each plants what another call or a dead call would leave at the lock path; nothing races and nothing waits.

14. **"a send-back that meets a held lock is reported NOT counted, the count is unchanged, and the dashboard's escalation count rises by one; run again, it counts"**
    - Setup: a plan in `in-progress/` and a running `review` round. `fs.writeFileSync` writes `held by another call` at `.ctoc/state/kickbacks/<plan>.lock`, so the lock is fresh. `ms.buildDashboardTable(root)` shows no `circuit-breaker escalation` line.
    - The round completes with `'--continue','--send-back','10'` inside `quiet`. Asserts: `ok: true`; the status is `done`; the text matches `send-back to Step 10 was NOT counted: the kickback counter for <plan> is being written by another call`; no counter file exists; the lock file's bytes are unchanged.
    - `actions.recordStepKickback(p, 14, root)` inside `quiet`, the call a failed verify makes, returns `recorded: false` with the same reason. The lock guards both writers.
    - After `require('../src/lib/cache').invalidate()`, the dashboard matches `⛔ 2 circuit-breaker escalations`.
    - The planted lock is removed, and the same call is run again on the now `done` task, as the recipe says. Its text matches `1 of a limit of 3 for Step 10`, and no `.lock` file remains in `.ctoc/state/kickbacks/`.
15. **"a lock left by a call that died is taken over"**
    - Setup: the lock planted as in case 14, then `fs.utimesSync(lock, past, past)` with `past` two minutes before now. That is a fixture time: no wait, and no elapsed time is measured.
    - A round's `'--continue','--send-back','10'` reads `1 of a limit of 3 for Step 10`, and no `.lock` file remains.
16. **"a folder at the lock path is reported, never followed or deleted"**
    - Setup: `fs.mkdirSync` at `.ctoc/state/kickbacks/<plan>.lock`.
    - A round's `'--continue','--send-back','10'` inside `quiet` reads `was NOT counted: the kickback counter's lock for <plan> is not a plain file`; the folder still exists; no counter file exists.

**No timing.** No case asserts on elapsed time or sleeps. The only clock values are fixture times written into files (`finishedPlan`, case 15), never a wait. The screen's age suffix is never compared.

**Coverage.** Every new branch is driven in-process: each refusal in `checkSendBack`, the `done` folder (case 13), both outcomes of `sendBackText`, the flag with an empty value, and both completion paths with and without a send-back. Under the locked answer, cases 14 to 16 drive the held, stale and unusable branches of `withCountLock`, and every other case drives its create and release. Its Windows-only branch (`EPERM`, `EACCES`, `EBUSY`) runs only on Windows, as in `withBuildStartLock`. So the coverage floor (`.ctoc/coverage-baseline.json` `minPct`) is met without counting child processes.

**Existing tests that must stay green, unchanged:**
- the rest of `tests/circuit-breaker-wiring.test.js`;
- `tests/circuit-breaker-coverage.test.js`, `tests/circuit-breaker-block-prepend.test.js`, `tests/circuit-breaker-malformed-frontmatter.test.js` and `tests/ctoc-audit-w05-circuit-breaker.test.js`;
- `tests/menu-task-wiring.test.js`;
- `tests/plans-keep-moving-without-the-human.test.js`, whose cases 46 and 47 cover the already-completed path;
- `tests/protect-records.test.js`, whose case 89 reads `parseTaskArgs`;
- `tests/menu-screens-coverage.test.js` and `tests/menu-screens-coverage-holes.test.js`;
- `tests/dashboard-says-the-moment.test.js`, `tests/inbox-coverage.test.js` and `tests/approval-hash-survives-execution.test.js`.

Under the locked answer the counter's code changes, so the five circuit breaker files above are the ones it must keep green. Two of them pin what the lock must not change: `tests/circuit-breaker-coverage.test.js:211-233` (one `breaker-failure` entry when the counter's folder is a file) and `tests/ctoc-audit-w05-circuit-breaker.test.js:180` and `:215` (a bad step throws before any file is touched).

### Security review

- **Who can write the count.**
  - Only a call with `--continue`, which only the session's recipe carries. With the background-agent rule switched back on, the hook refuses `--continue` to a background agent (`protect-records.js:669`, `TASK_FIELDS` at `:674`).
  - With the rule off, as today, a background agent could make that call, exactly as it can make a `--continue` call today. That switch is the owner's open decision in "The background-agent protection is measured before the owner decides whether it is on", and this plan does not touch it.
  - Case 8 tests the menu's half of the rule.
- **Input validation.** The step is accepted only as the digits 1 to 16 (`SEND_BACK_STEP_RE`), so no prototype key, exponent, sign, padding or fraction reaches the counter. `circuit-breaker.normalizeStep` still guards behind it.
- **Path traversal.** The plan name comes from the task registry, which is a file on disk. It is checked with `isUnsafePlanFile` before it is joined into a path, and it is joined only under `plans/in-progress/`, `plans/review/` and `plans/done/`. The counter path is built by `kickbackStatePath` from the plan's base name (`circuit-breaker.js:212-214`), unchanged. Under the locked design the lock path is built from the same base name in the same folder, and whatever sits there that is not a plain file is never followed or deleted (case 16).
- **Echoed text.** The step, kind and plan name shown in a refusal pass through `stripCtl` and are cut to 40 or 80 characters.
- **Writes.** Only the existing counter file and escalations log, through the existing module, and under the locked design the lock file beside the counter, removed after each count. No plan file is written or moved, and no approval or check record is touched. A finished plan's file is read only.
- **Error messages.** The NOT-counted clause carries the error from writing the count, which names the counter's path inside the project. It goes only to the local session, and the escalations log already holds the same text today.
- **Prototype pollution, shell, network, secrets.** None: no object is built from input, and there is no shell, no network and no secret.

### Implementation order

1. `tests/circuit-breaker-wiring.test.js` — MODIFY. Case 1 first (the measurement), then cases 2 to 13, then cases 14 to 16 under the locked answer only. It depends on nothing new.
2. `src/lib/menu-screens.js` — MODIFY. It depends on the unchanged `actions.recordStepKickback` and the `circuit-breaker` constants.
3. `src/lib/circuit-breaker.js` — MODIFY. Under the locked answer, `withCountLock` and its use in `recordKickback`, then the header; under the unlocked answer, the header only. It describes item 2.
4. `src/commands/start.md` — MODIFY. It documents the flag item 2 accepts.
5. `docs/IRON_LOOP.md` — MODIFY. It documents what is counted.

### Acceptance criteria mapping

| Scenario | Implemented in | Shown by |
|---|---|---|
| Today four send-backs to one step reach no limit | nothing changes; measured first | case 1, its printed texts recorded in the plan by the TEST step |
| The measurement contradicts the reading | the TEST step's stop | case 1 failing on today's code stops the build |
| The change is put to the owner as one decision | the functional plan's "Questions for the owner" | answered 2026-10-20 (above) |
| Nothing changes the counting before his answer | Step 10's first item quotes both answers and their date | the plan text |
| The owner keeps the limit as it is | does not apply: he chose to count | the answers above |
| Three send-backs to one step are counted without an escalation | `checkSendBack`, `sendBackText`, `taskComplete` | case 2 (with a quality round); cases 12 and 13 for a plan that already finished |
| The fourth send-back to one step escalates | the same, through `recordStepKickback` | cases 3, 12 and 13 |
| Round send-backs and failed verifies share the limit of five per plan | one count per plan, unchanged | case 4 |
| A send-back that names no valid step is refused | `checkSendBack` check 3, refused before any write | case 5 |
| A send-back that cannot be saved is reported, not dropped | `sendBackText`'s NOT-counted clause; the breaker-failure entry `recordStepKickback` appends; under the locked answer also a send-back that meets a held lock | case 6; cases 14 to 16 under the locked answer |
| A round that sends nothing back counts nothing | no flag, no change | case 7 |

### Risk mitigations

| Risk | Mitigation | Where |
|---|---|---|
| Two rounds write one plan's count at the same time | The owner chooses between the two designs in the question already in the store. Locked (Recommended there): a meeting write is reported NOT counted and run once more, tested by planting the lock. Unlocked: the remaining collision is written into the module header with its upgrade path. Under both, the recipe runs a `--send-back` completion on its own. No two-process race test under either: it would be a timing test | "The count's write: two designs, the owner chooses"; Decision 8 |
| A round's send-back reaches a plan that has already finished | `checkSendBack` searches `plans/done/` too; case 13 drives the real order; Step 11 shows case 13 failing without `done` | `checkSendBack` check 4; case 13 |
| More escalations reach the owner | Only a send-back that names a step counts, and every escalation line keeps its step and count, as today | `sendBackText`; the screen, unchanged |
| The background-agent rule is switched back on | The flag requires `--continue`, which that rule already refuses a background agent; the session's own call is the recording route (the owner's second answer) | `checkSendBack` check 1; case 8 |
| A round's send-back and a fix round from the fix-rounds plan count one repair twice | Step 9 stops the build if that plan's `recordFixRound` is already in `circuit-breaker.js`; named under Neighbours for the owner | Step 9 |
| Files shared with other plans | Every file is declared in `files:`, so the scheduler never builds this plan beside another that declares one of them | frontmatter |

### Wiring — the live call sites

- **`checkSendBack` and `sendBackText`** are new and internal to `src/lib/menu-screens.js`. They are reached through this chain:
  - `taskComplete` (`:2661`) calls them;
  - `taskCommand` (`:3305`) calls `taskComplete`;
  - `route` dispatches `menu task …` to `taskCommand` (`:3358-3359`);
  - `src/commands/start.js:966` calls `route`. That is the menu command the `/ctoc:start` session runs in its COMPLETION recipe (`src/commands/start.md:133`) when a background task reports back.

  That recipe line is part of this build.
- **The `--send-back` case of `parseTaskArgs`** is read by the same `taskComplete`.
- **The count reaches the owner** through the existing readers. `inbox.listEscalations` (`src/lib/inbox.js:1059`) feeds the dashboard's escalation line (`menu-screens.js:606`) and the `inbox escalations` screen (`:1242`).
- **No new module and no new export**, so the reachability and export-reachability checks see no new symbol.

### Neighbours (seen, not built here; scheduling is the owner's)

- **A round's send-back never holds a built plan back or reopens a finished one.**
  - The send-back is counted wherever the plan is: being built, in review or done.
  - A plan in review whose checks passed can still finish on the same `--continue` call (`src/lib/streaming-gate.js:1113-1118`), because nothing in the finishing check reads the count. A finished plan stays in `plans/done/`; its count rises and, past a limit, reaches the owner on the `inbox escalations` screen.
  - Whether a send-back should keep a built plan from finishing, or take a finished one out of `plans/done/`, is a change to the finishing check or a plan move. Neither is filed here.
- **The escalations log is one file for every plan.** `appendEscalation` (`src/lib/circuit-breaker.js:346-364`) reads, appends and writes it without a lock. Two plans that escalate in the same moment can lose one entry. That is so today and stays so under both designs: the locked design locks one plan's count, not the shared log.
- **"Every fix round after a review is counted by the circuit breaker, per area, and no third fix round starts for one area"** (`plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s6-fix-rounds-are-counted-per-area.md`).
  - That plan counts a fix round as one send-back to Step 10, through its own `fix-round` route.
  - If both plans are built, a review round's `--send-back 10` and the fix round it starts count one repair twice for a plan that names areas.
  - Whichever plan builds second has to settle this with the owner. This plan's Step 9 stops if that one is already built.
  - The two plans also share `src/lib/circuit-breaker.js`, `src/lib/menu-screens.js` and `docs/IRON_LOOP.md`.
- **The hook's list of task flags.**
  - `TASK_FIELDS` in `src/hooks/protect-records.js:673-674` says it lists every flag `parseTaskArgs` reads. After this build it lacks `sendBack`.
  - That is harmless today, because the rule is off. It stays harmless when the rule is switched on, because `--send-back` needs `--continue` and the hook refuses `--continue`. But the comment is no longer exact.
  - Adding the field changes a hook, so it waits for the owner.
- **The two neighbours the functional plan names stay as they are:**
  - The `inbox escalations` line for a count that could not be saved reads "undefined kickbacks total (max 5)" (`menu-screens.js:1263-1265`).
  - `docs/IRON_LOOP.md` says "Stop." where the code escalates and refuses no retry.

## Decisions Taken Under Ambiguity — technical planning

1. **The flag is `--send-back <n>`, on the session's `--continue` call.** This follows the owner's second answer: one call per round and no new route.
2. **The hook is not edited.** The menu's own rule (`--send-back` needs `--continue`) and the hook's existing refusal of `--continue` keep background agents out once the rule is switched on. Editing `TASK_FIELDS` would change a hook, so it waits for the owner (see Neighbours).
3. **Plans in `plans/in-progress/`, `plans/review/` and `plans/done/` are counted.** (Revised: the first version counted only the first two, the folders `completeTaskPlan` searches.)
   - Every scenario but one names `in-progress`.
   - The per-plan scenario starts from two failed verifies, and a failed verify leaves its plan in `review/` (`actions.js:1361`, `:1460`).
   - A built plan whose checks passed finishes before any round is recorded (Measured item 7), so without `done/` the owner's choice would count almost nothing. This is not put to the owner as a question: he chose to count these send-backs, and counting the plans the rounds actually find is what makes that choice take effect.
   - `plans/todo/` and the stages before it are refused: a built plan never returns there (Measured item 9), so a round naming such a plan is a mistake the session should see.
4. **The round kinds are `review`, `security` and `quality`**, per the owner's first answer. A send-back on any other kind of task is refused, because the build's own failures are already counted inside `completeExecution`.
5. **The step must be the digits 1 to 16**, as in the functional plan's Decision 5. A send-back to design (Step 6) can be counted.
6. **The reason travels in `--summary`** and is stored on the task's result, as today. The escalations log's format is out of scope, so no reason field is added there, and a send-back without a summary is not refused.
7. **The count is taken after the task is settled.** Every refusal before that point counts nothing. A count that cannot be saved is reported while the completion goes ahead, as the functional plan's Decision 6 says. A session that re-runs an already successful call with `--send-back` counts the send-back again; the recipe runs each completion once. The one exception, under the locked design only, is a send-back reported NOT counted because the count was being written by another call. That call wrote nothing, so running it once more counts it once.
8. **Whether the count's write is locked is the owner's, and no concurrency test is written under either answer.** (Revised: the first version decided "no lock" here.) The functional plan asked for a test of two concurrent send-backs that requires a count of 2.
   - Two racing processes pass or fail by chance, so such a test is a timing test and flaky by construction, which the owner forbids.
   - Without that test, the choice is between a lock and a known limit. The gate critic's classification put it to the owner as "Should the count's write be locked?". Both designs are specified under "The count's write: two designs, the owner chooses", and Step 8 reads his answer before any case is written.
   - The locked design is tested without timing, by planting what another call or a dead call leaves at the lock path (cases 14 to 16).
9. **`src/lib/actions.js` is not declared.** The functional plan asked to declare it so that this plan and "A plan in the build queue can be sent back to technical planning and keeps its title" are never built at the same time. This design calls the exported `recordStepKickback` and does not edit that file, so there is no overlap left.
10. **No new test file.** The cases go into `tests/circuit-breaker-wiring.test.js`, the test file for the live wiring of this same counter. No documented count moves, so `CLAUDE.md` and `README.md` stay untouched.
11. **Summary words are never parsed.** A send-back stated only in a summary is not counted; the session passes the flag. The owner accepted this cost with his second answer.
12. **The tests record failed verifies with `actions.recordStepKickback(planPath, 14, root)`.** That is the exact call `completeExecution` makes on a failed verify (`actions.js:1460`). A real verify runs the project's whole check suite, which is neither fast nor deterministic in a temporary project.
13. **"The folder refuses writes" is simulated by a file placed where `.ctoc/state/kickbacks` would be.** Changing permissions does not work on Windows or for an administrator account; the file makes the same write fail on every platform.
14. **`docs/IRON_LOOP.md` gains one paragraph on what is counted**, although the scenario that asked for it applied only if the owner kept the limit as it is. The change is documented where the limits are.
15. **A finished plan's send-back moves nothing.** The plan stays in `plans/done/`, and only its count and, past a limit, its escalation change. The functional plan's scope says this plan counts and moves no plan file. Reopening a finished plan is listed under Neighbours.
16. **The session runs a completion that carries `--send-back` on its own, under both designs.** It is one sentence in the recipe. It removes the most likely way two writes of one count meet, two rounds of one plan completed in the same turn, without any code.
17. **The locked design's lock is per plan, at `.ctoc/state/kickbacks/<plan>.lock`, and it does not wait.** A per-plan lock never makes two different plans block each other, whose counts are separate files and never collide. Not waiting matches the build-start lock and the question's option 1. The session's rerun turns a reported collision into a count.

## Execution Plan

### Step 8: TEST
- [ ] Before any case is written, read the owner's answer to the lock question in `.ctoc/streaming/answers.jsonl`: the latest line whose `questionId` is `q10-round-count-write-lock-r1792514438287`, or, if the question was issued again under another id, whose question asks "Should the count's write be locked?", for this plan's `implementation/` ref. Under every wording the question has had, option 1 is the locked design and option 2 the unlocked design. With no such answer, stop: the build waits for the owner. Write the option, its label and the answer's date into the build record.
- [ ] Write case 1 ("today: a send-back written only in a round's summary counts nothing") in `tests/circuit-breaker-wiring.test.js` and run `node --test tests/circuit-breaker-wiring.test.js` on the unchanged source. Insert a section `## Measured before the first source change` directly above `## Execution Plan`, holding the date, the four completion texts and the screen text the case printed. If the case fails (an escalation is shown, or a count moved), make no source change: send the plan back to the owner with the run's output and the sentence "the gap is not as filed".
- [ ] Write cases 2 to 13 as the Test plan specifies them, and cases 14 to 16 only under the locked answer. Run the file and record that each of them fails, and why: the flag is unknown, so the round settles with no count clause, and no refusal happens. `finishedPlan`'s own precondition (the plan reaches `plans/done/`) must hold already, because it uses only today's code. Case 1 and the two existing cases must pass.

### Step 9: PREPARE
- [ ] Re-read every line cited under File specifications in the then-current files. Re-locate a line that moved; a behaviour that changed stops the build for a re-plan.
- [ ] Read the exports of `src/lib/circuit-breaker.js`. If `recordFixRound` is there, the fix-rounds plan has been built: stop and go back to the owner, because a review round's send-back and the fix round it starts would count one repair twice.
- [ ] Confirm that `RECORD_REFUSALS_OFF` and `TASK_GRAMMAR.complete` in `src/hooks/protect-records.js` are as read (`:1053`, `:669`). The session-only rule's second half rests on `continue` staying out of that grammar.
- [ ] Search `tests/` for text pinned from COMPLETION step 1 of `src/commands/start.md`, from the Circuit Breaker section of `docs/IRON_LOOP.md` and from the `circuit-breaker.js` header, and for tests that pin the shape or the flags of a `menu task complete` response (among them `tests/menu-protocol.test.js` and `tests/menu-task-wiring.test.js`): the refusal is the only new response shape. List each hit with its file and line before editing.

### Step 10: IMPLEMENT
- [ ] This item builds on the owner's answers, quoted here:
  - Asked "Should a send-back from a review or security round count toward the limit of three send-backs per step and five per plan, and escalate to you the way a failed verify does?", he answered "Count review, security and quality round send-backs" on 2026-10-20 (recorded at 16:00:56Z).
  - Asked "who may write a send-back into the count that decides when you are told", he answered "Only the coordinator session records it" on 2026-10-20 (recorded at 16:02:32Z).
  - Asked "Should the count's write be locked?", his answer as Step 8 recorded it: the option's label, quoted, and its date.

  The work in `src/lib/menu-screens.js`:
  - the `--send-back` case in `parseTaskArgs`;
  - `ROUND_KINDS`, `SEND_BACK_STEP_RE`, `checkSendBack` (searching `in-progress`, `review` and `done`) and `sendBackText`;
  - in `taskComplete`, the check, the helper and the two places that count;
  - both JSDoc paragraphs.
- [ ] `src/lib/circuit-breaker.js`, under the locked answer: `COUNT_LOCK_STALE_MS`, `withCountLock` and its use in `recordKickback`, as "Locked design" specifies. Under either answer: the "LIVE CALL SITE" paragraph, and the "Concurrency" paragraph in the chosen design's wording, with its `ponytail:` note.
- [ ] `src/commands/start.md`: the brief sentence, the completion sentences (the rerun sentence only under the locked answer) and the registry-only bullet.
- [ ] `docs/IRON_LOOP.md`: the paragraph under the Circuit Breaker table.
- [ ] Run `node --test tests/circuit-breaker-wiring.test.js`: cases 2 to 13 pass, and cases 14 to 16 under the locked answer.

### Step 11: REVIEW
- [ ] The critic tries to get a count written:
  - without `--continue`;
  - on an `implement` or a `plan` task;
  - with the steps `__proto__`, `1e1`, ` 10`, `10 `, `010`, `16.0` and `-1`;
  - for the plans `../x`, `in-progress/x.md` and `x.md.md`, and for a plan name holding a newline.

  Each attempt must be refused with nothing written. The critic also reads every new sentence as the owner would see it relayed: no gate number and no internal code. It checks that each refusal tells the session what to fix.
- [ ] Mutation check for the finished plan: remove `'done'` from the folders `checkSendBack` searches and run case 13. It must fail, its first round refused with `names no plan that is being built`. Restore the line and run it green again. Record both runs.
- [ ] Under the locked answer: the critic checks that every path out of `recordKickback` releases the lock, a ghost plan's throw included, and that a lock which is not ours (another mark, a link, a folder) is never deleted.

### Step 12: OPTIMIZE
- [ ] Confirm by reading three things:
  - `src/lib/menu-screens.js` gained no top-level `require`;
  - a completion without `--send-back` runs no new code beyond one `undefined` test;
  - a counted send-back costs the counter's existing reads and one write, and under the locked answer one exclusive create and one delete of the lock;
  - `checkSendBack` stops at the first folder that holds the plan, so a finished plan costs at most three `existsSync` calls.

### Step 13: SECURE
- [ ] The security scanner attacks the flag and the plan name with:
  - the inputs of Step 11;
  - a `--send-back` value of 100,000 characters;
  - a task registry edited to hold a plan name with control characters or a `..`;
  - a counter file that is a symbolic link or a folder;
  - under the locked answer, a lock path that is a symbolic link to a file outside the project, a folder, or a plain file holding another call's mark;
  - a call carrying both `--send-back` and `--b64`.

  None may write outside `.ctoc/state/kickbacks/`, `.ctoc/logs/` and the task registry, count anything on a refused call, or print an unstripped control character.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, type check, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky. The run must include:
  - the five circuit breaker test files;
  - `tests/menu-task-wiring.test.js`, `tests/plans-keep-moving-without-the-human.test.js` and `tests/protect-records.test.js`;
  - `tests/menu-screens-coverage.test.js` and `tests/false-green-fence.test.js`;
  - `tests/reachability.test.js`, `tests/export-reachability.test.js` and `tests/gate-numbers-fence.test.js`.

### Step 15: DOCUMENT
- [ ] The documentation is written in Step 10: `src/commands/start.md` (the session's recipe), `docs/IRON_LOOP.md` (what is counted), the `circuit-breaker.js` header and the JSDoc. The build record lists each changed sentence with its file.

### Step 16: FINAL-REVIEW
- [ ] Check every acceptance box against its evidence:
  - the first scenario, against the measured texts;
  - "Nothing changes the counting before his answer", against Step 10's quotation;
  - "The owner keeps the limit as it is" and "The measurement contradicts the reading", checked as not applying, with the reason written beside each;
  - the rest, against cases 2 to 13, and cases 14 to 16 under the locked answer;
  - that the design built is the one the owner chose for the count's write, against Step 8's record.

  Quote the first failing run of cases 2 to 13 (and 14 to 16 under the locked answer), and Step 11's run of case 13 without `done`.
