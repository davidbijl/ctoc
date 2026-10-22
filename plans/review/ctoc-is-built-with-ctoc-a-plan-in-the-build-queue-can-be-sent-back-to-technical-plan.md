---
title: "A plan in the build queue can be sent back to technical planning and keeps its title"
created: "2026-10-20T13:37:49.347Z"
type: implementation
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: HIGH
status: refined
depends_on: "none"
acceptance_criteria_count: 17
risk_level: MEDIUM
files:
  # The send-back's work under the build-start lock, and the hold mark the send-back writes.
  - src/lib/actions.js
  # The build-queue plan screen's offer, the command's words, the hold at the crossing on
  # evidence, and the one title reader.
  - src/lib/streaming-gate.js
  # The route for the command, and the sweep screen's plan names.
  - src/lib/menu-screens.js
  # The two hand-made title readers become calls of the one reader.
  - src/lib/increment-feed.js
  - src/lib/loop-b-driver.js
  # The reason is decoded by the inbox's own standard-input decoder (one export added).
  - src/lib/inbox.js
  # The menu entry reads the reason on standard input for this one route shape.
  - src/commands/start.js
  # The session's recipe for the command.
  - src/commands/start.md
  # The crossing on evidence gains the owner's hold; the enforcement document says so.
  - docs/ENFORCEMENT.md
  # The one test file this plan creates.
  - tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js
  # RATCHET FILES — not planned work: the new test file moves the documented test-file count,
  # which CLAUDE.md (Gate 2 requires the declaration) and README.md both state.
  - CLAUDE.md
  - README.md
---

# A plan in the build queue can be sent back to technical planning and keeps its title

## Problem Statement
This plan carries two frictions from the vision that share one user journey and one function. First, no send-back from the build queue: a plan already in the build queue has no menu route back to technical planning. Run: the plan screen for a build-queue plan (`plan todo/agent-tool-grants.md`) offers only Discuss, View/Edit and Delete. Read: send-back options are added only when the stage is review (`src/lib/streaming-gate.js`, the `if (stage === 'review')` block that loops over `gateWords.SEND_BACK`). Re-read by the vision advisor: `src/lib/streaming-gate.js:1693` and `:1697`. Reported: the coordinator had to call `src/lib/actions` directly through `node -e`, because `node src/commands/start.js claude:reject <ref> <stage> "<reason>"` only printed the menu. Confirmed by the decomposer: `rejectPlan` in `src/lib/actions.js:835` already moves any plan exactly one stage back along `STAGE_ORDER` (`src/lib/gate-order.js:21`), so a build-queue plan's target is technical planning, and the gap is the menu offering and the `claude:reject` route. Second, the status line shows a revision instead of the title. Reported: after a send-back, the status line names a plan REVISION 1 instead of its title. Read: `rejectPlan` puts a `# REVISION <n>` heading and a Rejection Feedback block above the plan's own title, so a reader that takes the first heading as the title gets REVISION 1 (re-read by the vision advisor: `src/lib/actions.js:886`). The reader that shows it has not been located; whether the fix is in that reader or in the rejection header is the Product Owner's choice. The cause of claude:reject printing only the menu is reported, not traced, so that story starts by reproducing it. Disposition: new work. Done when a test drives the real plan screen of a build-queue plan, takes the send-back, and finds the plan in technical planning with its title intact on the status line. This plan shares `src/lib/streaming-gate.js` with the answer-command plan and `src/lib/actions.js` with the review and security send-back plan; those are file overlaps for scheduling, not dependencies.

## What the source says today

Read by the Product Owner in this worktree's source on 2026-10-20. Nothing here was run: this agent cannot run code. The scenarios below that drive the real menu are the runs that confirm it.

1. **A build-queue plan's screen has no send-back.** `GATE_META` (`src/lib/streaming-gate.js:82-86`) has entries for requirements, technical planning and review only. A plan in the build queue therefore takes the "not at a gate" branch of `planDecisionScreen` (`:1727-1741`), which offers Discuss, View/Edit and Delete. Send-backs are added only inside `if (stage === 'review')` (`:1693-1701`), from `SEND_BACK` in `src/lib/gate-words.js:154-165`: "Send it back — wrong thing" with destination `functional`, and "Send it back — wrong way" ("The requirements are right; the technical approach is wrong. It goes back to be re-planned.") with destination `implementation`. The ride-along question below it (`:1746-1763`) already carries four options (three plus "Not now").
2. **Why `claude:reject` only printed the menu.** In `src/commands/start.md`, `claude:` actions are listed under "Claude Actions (handle in conversation)" (`:47`). The row `claude:reject {ref} {dest}` (`:63`) says only "Reject plan to destination stage" and gives no command to run. `route()` in `src/lib/menu-screens.js:3345-3463` has no case for `claude:reject`, and any first word it does not know falls to `default: return dashboardPipeline(projectPath, opts);` (`:3461-3462`). So `node src/commands/start.js claude:reject <ref> <stage> "<reason>"` prints the dashboard, and the only executable path left is a `node -e` call into `rejectPlan`. Read, not run.
3. **The send-back function.** `rejectPlan` (`src/lib/actions.js:835-898`) takes no destination. It moves a plan exactly one stage back along `STAGE_ORDER` (`src/lib/gate-order.js:21`), so a build-queue plan lands in technical planning. It refuses an unknown stage and a plan in requirements. It writes `revision`, `rejection_reason` (the first 100 characters) and `tag: rejected` into the frontmatter, and inserts `# REVISION <n>` and `## Rejection Feedback` with the reason between the frontmatter and the plan's own title (`:884-889`). It withdraws the approval record (`:894`) before the move (`:897`). It accepts an empty reason. Search: pattern `rejectPlan\(` over the worktree, excluding `plans/` and `tests/`, matched three lines in two files: the definition and two calls in `src/tabs/review.js` (`:121`, `:152`), the terminal review tab. No menu command calls it.
4. **The review screen's destinations are read by nothing.** The review screen's action strings name `functional` and `implementation` (`src/lib/streaming-gate.js:1699`). One stage back from review is the build (`plans/in-progress/`), as the comment at `src/tabs/review.js:119-120` says. Search: pattern `claude:reject` over the worktree, excluding `plans/`, matched `src/commands/start.md:63`, `src/lib/streaming-gate.js:1699`, three test files and one audit note. No source line reads the destination word.
5. **Six places take the first level-1 heading as the plan's name.** Search: pattern `match\(/\^#` over `src/`; the six title readers among its matches are:
   - `src/lib/streaming-gate.js:169` (`planTitle`: the opening screen's waiting decisions, and the names of plans the continuation moved)
   - `:1596` (the plan screen's Topic line and title)
   - `:2330` (`nameOfPlanAt`: the line after an approval)
   - `src/lib/menu-screens.js:3109` (`planNameAt`: the sweep screen)
   - `src/lib/increment-feed.js:62` and `src/lib/loop-b-driver.js:113` (`titleOf`, two hand-made copies)
   A reader written another way would not show up in this search; the pattern `startsWith\('# '\)` over `src/` matched nothing. Stage lists (`stageBrowse`, `src/lib/menu-screens.js:1948`) show file names, not titles, so they never showed "REVISION 1".
6. **Plans already carry the header.** Search: pattern `^# REVISION \d+` over `plans/` matched 9 lines in 7 files. Two are in requirements: `finished-plans-are-not-sent-back-after-an-update.md` and `the-gate-check-does-not-reread-every-plan-on-every-tool-call.md`, each with `# REVISION 2` and `# REVISION 1` above its own title. Five are in `plans/done/`. `tests/actions-coverage.test.js:223` and `:237` assert the header text.
7. **A queued build outlives a send-back today.** A build task's claim refuses with `plan-not-found` when its plan is in neither the build queue nor `plans/in-progress/` (`src/lib/actions.js:1161-1164`), and the task stays queued. `cancelTask` (`:2335-2384`) moves a queued task straight to cancelled. A build blocked on another build waits for that build to be done; a cancelled one never satisfies it (`src/lib/task-registry.js:20-25`).
8. **The continuation does not pull a sent-back plan straight back.** The rewrite makes the plan newer than any questions stored for it. `planQuestionsStatus` then reports them as out of date (`src/lib/streaming-precompute.js:797` onward), `hasEnoughInformation` fails closed (`:1241-1246`), and the crossing on evidence is not reached (`src/lib/streaming-gate.js:1099-1101`). Read, not run. Once fresh questions are generated and the gate critic finds nothing blocking, the plan crosses into the build queue again like any technical plan.

## Business Alignment

**Job to Be Done:** When a plan already in the build queue turns out to need a different technical approach, I want to send it back to technical planning from its own plan screen with my reason, so I can get it re-planned without leaving the menu and still recognise it by its title when it comes back to me.

**Impact Map:**
- **Goal:** Every plan move the maintainers need is a menu route with usable output (the vision's goal for this group).
- **Actor:** the CTO Chief's coordinator session, which builds CTOC through the menu (the vision's target users), and the owner, Tijn van der Zant, who reads the plan names the menu shows.
- **Impact:** the coordinator sends build-queue plans back through the menu instead of `node -e` calls into `src/lib/actions`, and the owner sees a sent-back plan under its own title instead of "REVISION 1".
- **Deliverable:** a send-back option on a build-queue plan's screen, the menu command it runs, and plan names that skip the rejection header.

**Alignment checks:** the goal traces to the vision's problem statement and its first success example (yes); both actors are the vision's target users (yes); the impact is observable on the plan screen and the opening screen (yes); the deliverable is one functional area, sending a plan back and naming it afterwards (yes).

## Decomposition

Source: `plans/decomposition/ctoc-is-built-with-ctoc.md`. Stories marked `[MVP]` are the smallest end-to-end version; the others are the remaining stories, with no phase or schedule (the owner alone chooses what is built and when).

### Vision items carried
- "No send-back from the build queue."
- "The status line shows a revision instead of the title."

Both share one user journey and one function (`rejectPlan`), so they are one plan.

### Goal: Every plan move the maintainers need is a menu route with usable output
- **Actor:** the owner and the CTO Chief, coordinator session and background agents that build CTOC through its menu; after them, every CTOC user on the same routes.
- **Impact:** the coordinator sends back, answers and moves plans through the menu without `node -e` calls into `src/lib/actions` or scratch scripts.
- **Success metric:** this plan has a test that drives the real menu route, and no by-hand workaround is needed for these frictions.

### Activities
1. Open a build-queue plan and see a send-back offered.
2. Send it back with a reason.
3. See it in technical planning under its own title.

### Stories
- [ ] `[MVP]` As the coordinator, I want the plan screen of a build-queue plan to offer a send-back to technical planning, so that I never call `src/lib/actions` by hand to send a plan back.
  - Acceptance: the real plan screen for a plan in `plans/todo/` lists a send-back option next to Discuss, View/Edit and Delete; a plan in any other stage shows the same options it shows today.
  - INVEST: passes all six criteria.
- [ ] `[MVP]` As the coordinator, I want taking that send-back to move the plan to technical planning with my reason recorded, so that the planner sees why it came back.
  - Acceptance: driving the menu route moves the plan from `plans/todo/` to `plans/implementation/`, the plan carries the reason, and the approval record is withdrawn as `rejectPlan` does today.
  - INVEST: passes; Independent is qualified, because it is built on the first story's offering, ordered inside this plan.
- [ ] `[MVP]` As the owner, I want the status line to name a sent-back plan by its own title, so that I recognise it instead of reading "REVISION 1".
  - Acceptance: after a send-back, the status line and every plan list show the plan's title, not "REVISION 1". Whether the fix is in the title reader or in the rejection header is the Product Owner's call; the reader has not been located yet.
  - INVEST: passes all six criteria.
- [ ] As the coordinator, I want the `claude:reject` command with a plan, a stage and a reason to perform the send-back instead of printing the menu, so that the non-interactive route works as named.
  - Acceptance: `node src/commands/start.js claude:reject <ref> <stage> "<reason>"` on a build-queue plan moves it back; a wrong stage is refused with a message, never by printing the menu.
  - INVEST: passes; Estimable is qualified, because the cause of "only printed the menu" is reported, not traced, so this story starts by reproducing it.

### Dependencies
- Story level: the send-back move depends on the send-back offering. The title story and the `claude:reject` story depend on no other story.
- Plan level: none.
- Shared files (a scheduling concern, not a dependency): `src/lib/streaming-gate.js` with "The menu prints the exact answer command for every option of every streamed question"; `src/lib/actions.js` with "Send-backs from review and security rounds count toward the three-per-step limit".

## User Stories

**Offered on the plan screen.** **As** the coordinator, **I want** the plan screen of a build-queue plan to offer a send-back to technical planning, **so that** I never call `src/lib/actions` by hand to send a plan back.

**Sent back with a reason.** **As** the coordinator, **I want** taking that send-back, which runs the menu command `claude:reject todo/<file>.md implementation` with my reason, to move the plan to technical planning with the reason in the plan, **so that** the planner sees why it came back and the command does what its name says instead of printing the dashboard.

**Named by its title.** **As** the owner, **I want** every screen that names a sent-back plan to show its own title, **so that** I recognise it instead of reading "REVISION 1".

### INVEST check

| Story | Independent | Negotiable | Valuable | Estimable | Small | Testable |
|---|---|---|---|---|---|---|
| Offered on the plan screen | yes | yes: says what is offered, not how the screen is built | yes: the coordinator stays in the menu | yes: one branch of one screen, one existing phrase | yes | yes: three scenarios |
| Sent back with a reason | qualified: the screen's option runs it, so it is ordered after the first story inside this plan; the command itself can be built and run alone | yes: how the reason reaches the command is the implementation planner's choice | yes: no `node -e` call into `src/lib/actions` | yes: the cause of "only printed the menu" is now traced by reading ("What the source says today", item 2), so the decomposer's Estimable qualifier is dropped | yes: one command over the existing `rejectPlan` and `cancelTask` | yes: five scenarios |
| Named by its title | yes: plans sent back before this change already show the defect | yes: names the screens, not the code | yes: the owner recognises his plans | yes: six readers, located | yes | yes: five scenarios |

The decomposer's four stories became three: "`claude:reject` performs the send-back" is merged into "Sent back with a reason", because the screen's option runs exactly that command.

## Scope

### In Scope
- A "Send it back — wrong way" option on the plan screen of a build-queue plan, next to Discuss, View/Edit and Delete, reusing the existing wording in `src/lib/gate-words.js` ("A build-queue plan's screen offers the send-back").
- No change to the options of a plan in any other stage, review included unless the owner's answer below says otherwise ("Plans in other stages show the options they show today", "The review screen is unchanged").
- The menu command `claude:reject todo/<file>.md implementation`, run through `node src/commands/start.js`, that sends a build-queue plan back with a required reason and prints one result line; it refuses a missing reason, any other destination, and a plan whose build has started. The `claude:reject` row in `src/commands/start.md` says how the session runs it ("The menu command sends the plan back with its reason", "No reason, or another destination, is refused", "A plan whose build has started is not sent back").
- Cancelling the plan's queued build task in the same send-back ("A queued build of the plan is cancelled with it").
- A test that pins today's behaviour of the continuation: a sent-back plan stays in technical planning ("The plan waits in technical planning").
- One way of naming a plan for the six readers in "What the source says today", item 5: skip a level-1 heading that reads exactly `REVISION <number>`, then take the plan's own heading, else its frontmatter title, else its file name ("Sent back from its screen, it comes back under its title" and the four title scenarios after it).

### Out of Scope
- Where a send-back from review lands. The owner's answer to the question below decides it; under the recommended answer it is listed under "Neighbours" for him to schedule.
- Sending back a plan that is being built (`plans/in-progress/`). That is the build loop's own send-back inside `completeExecution`, and its counting is "Send-backs from review and security rounds count toward the three-per-step limit".
- Sending a build-queue plan back to requirements in one step. One stage back cannot reach requirements; listed under "Neighbours".
- Re-planning the sent-back plan. The coordinator dispatches the implementation-planner through the existing `plan` task kind (`src/lib/task-registry.js:156`); the send-back starts no agent.
- Counting send-backs toward the circuit breaker's limits: "Send-backs from review and security rounds count toward the three-per-step limit".
- Who may run the command, for example refusing it to background agents: "The background-agent protection is measured before the owner decides whether it is on".
- Titles in stage lists. They show file names today and never showed "REVISION 1"; not planned.
- Rewriting the seven plans that already carry a `# REVISION` heading, or changing the header `rejectPlan` writes. Not planned; see "Decisions Taken Under Ambiguity".

## Acceptance Criteria

"The build queue" is `plans/todo/`, "technical planning" is `plans/implementation/`, "requirements" is `plans/functional/`. Every scenario drives the real entry point, `node src/commands/start.js` or `route()` in `src/lib/menu-screens.js` with the same words, on a temporary project. None asserts only the structure of a screen.

### Offered on the plan screen

- [x] **Scenario: A build-queue plan's screen offers the send-back** — proved by B1
  Given a plan in the build queue titled "Readers skip the rejection header", with no question waiting for it
  When the coordinator opens it with `plan todo/<file>.md`
  Then its question offers exactly four options: Discuss, View/Edit, Delete and "Send it back — wrong way", the last with the description "The requirements are right; the technical approach is wrong. It goes back to be re-planned."
  And the action for "Send it back — wrong way" is `claude:reject todo/<file>.md implementation`
  And no option label or description on the screen contains a stage directory name

- [x] **Scenario: Plans in other stages show the options they show today** — proved by B2
  Given one plan each in requirements, technical planning, `plans/in-progress/` and `plans/done/`, and the options and actions each one's screen shows today, written into the test before any source change
  When each is opened with `plan <stage>/<file>.md` after the change
  Then each screen's options and actions are identical to the recorded ones, and none offers "Send it back — wrong way"

- [x] **Scenario: The review screen is unchanged** — proved by B3
  Given a plan in review
  When it is opened with `plan review/<file>.md`
  Then it offers "Send it back — wrong thing" and "Send it back — wrong way" with the actions `claude:reject review/<file>.md functional` and `claude:reject review/<file>.md implementation`, character for character as before this change
  And the send-back command run directly on that plan does what the owner's answer to "When the send-back command becomes real, what does it do with a plan in review?" says; under the recommended answer it prints a refusal sentence saying it sends back build-queue plans only, and the plan file stays byte-identical in review

### Sent back with a reason

- [x] **Scenario: The menu command sends the plan back with its reason** — proved by C1
  Given a plan in the build queue titled "Readers skip the rejection header", with the approval record of its build-it decision and no build task
  When the coordinator runs the action of "Send it back — wrong way" through `node src/commands/start.js` with the reason `the "files:" list misses src/lib/increment-feed.js and $HOME paths`
  Then the plan is in technical planning and no longer in the build queue
  And the plan file shows that reason character for character in its rejection feedback
  And the approval record of the build-it decision is gone, as `rejectPlan` withdraws it today
  And the command prints one result line that names "Readers skip the rejection header" and says it was sent back to be re-planned; it prints no dashboard and no stage directory name

- [x] **Scenario: No reason, or another destination, is refused** — proved by C2, C8, C11, C13, C15, C16
  Given a plan in the build queue
  When the command runs on it once with an empty reason, and once with the destination `functional` and a reason
  Then the first run prints a refusal sentence saying a reason is required, and the second prints one saying a build-queue plan can only be sent back to be re-planned
  And after both runs the plan file is byte-identical, still in the build queue, with its approval record unchanged

- [x] **Scenario: A plan whose build has started is not sent back** — proved by C3, C3b
  Given the coordinator opened a build-queue plan's screen, and its build task was claimed afterwards, which moved the plan to `plans/in-progress/`
  When the command runs on `todo/<file>.md`
  Then it prints a refusal sentence saying the plan is being built
  And the plan file, its place in `plans/in-progress/` and the build task are unchanged

- [x] **Scenario: A queued build of the plan is cancelled with it** — proved by C4, C4b, C5
  Given a plan in the build queue with a queued build task that no agent has claimed
  When the command sends the plan back with a reason
  Then that build task is cancelled
  And the result line says the queued build was cancelled
  And `menu task start <that task id>` run afterwards starts no build and moves no plan

- [x] **Scenario: The plan waits in technical planning** — proved by D1
  Given a plan just sent back, with no questions generated for it since
  When the menu's continuation runs (`menu task complete <id> --continue` on another finished task)
  Then the plan is still in technical planning, and the build queue holds no copy of it

### Named by its title

- [x] **Scenario: Sent back from its screen, it comes back under its title** — proved by E1
  Given a plan titled "Readers skip the rejection header", the only plan in the build queue of a temporary project
  When the coordinator opens `plan todo/<file>.md`, takes "Send it back — wrong way" and runs the command its action names with a reason
  Then the opening screen (`node src/commands/start.js` with no words) names that plan "Readers skip the rejection header", and its question reads "Shall I build “Readers skip the rejection header”?"
  And `plan implementation/<file>.md` shows a Topic line that begins "Topic: Readers skip the rejection header"
  And neither the opening screen's question nor the Topic line contains "REVISION"

- [x] **Scenario: A second send-back keeps the title** — proved by E2
  Given that plan was revised, crossed into the build queue again, and is sent back a second time with another reason
  When the owner opens the opening screen and the plan's own screen
  Then both name it "Readers skip the rejection header"
  And the plan file holds both reasons

- [x] **Scenario: Plans sent back before this change show their titles** — proved by E3, A3
  Given a copy of `plans/functional/finished-plans-are-not-sent-back-after-an-update.md`, which carries `# REVISION 2` and `# REVISION 1` above its own title, in requirements of a temporary project
  When the owner opens the opening screen and `plan functional/<file>.md`
  Then both name it "Finished plans are not sent back after an update"
  And the plan file is byte-identical before and after

- [x] **Scenario: A real title that begins with "Revision" still shows** — proved by E4, A5
  Given a sent-back plan whose own title is "Revision history is kept for every plan"
  When the owner opens its plan screen
  Then its Topic line begins "Topic: Revision history is kept for every plan"

- [x] **Scenario: A sent-back plan with no title heading of its own** — proved by E5, A6
  Given a sent-back plan with no level-1 heading besides the rejection header, and the frontmatter line `title: "Readers skip the rejection header"`
  When the owner opens the opening screen and the plan's own screen
  Then both name it "Readers skip the rejection header"
  And a copy without the frontmatter title is named by its file name without `.md` on both screens

### Held until it is changed (the owner's answer of 2026-10-20)

Added by the implementation planner from the owner's answer "Hold it in technical planning until it has been revised" (see "The owner's answers and what they change").

- [x] **Scenario: A sent-back plan with fresh questions waits until it is changed** — proved by D2, D6
  Given a plan just sent back from the build queue, whose questions were then written for its current text, classified by the gate critic, and need nobody
  When the menu's continuation runs (`menu task complete <id> --continue` on another finished task)
  Then the plan is still in technical planning, and the build queue holds no copy of it
  And the opening screen shows the sentence that it waits for a change or your approval, its "Yes — build it" option is not marked "Recommended", and "Open the plan" is the one recommended option
  And no status line calls it ready to move on by itself

- [x] **Scenario: A change to its files: list alone lets it move** — proved by D3
  Given that held plan
  When only its `files:` list is changed, and fresh classified questions that need nobody are written for the changed text
  And the continuation runs
  Then the plan crosses into the build queue on its evidence

- [x] **Scenario: Your approval still moves it** — proved by D4
  Given that held plan, unchanged
  When the owner approves it with `stream approve implementation/<file>.md`
  Then it moves into the build queue, recorded as his approval

- [x] **Scenario: Plans sent back before this change are not held** — proved by D5
  Given a plan in technical planning that carries `# REVISION 1`, `revision: 1` and `tag: rejected` but no hold mark, with fresh classified questions that need nobody
  When the continuation runs
  Then it crosses into the build queue as before

## Risks

### Technical Risks
- **A title reader the search missed:** a seventh place that names plans, written without the searched pattern, keeps showing "REVISION 1".
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Route all six readers through one shared title function, and test the opening screen and the plan screen end to end ("Sent back from its screen, it comes back under its title").
- **The reason does not survive the command line:** quotes, `$` or a newline in the reason are split or expanded by the shell before `rejectPlan` sees them.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test the reason in "The menu command sends the plan back with its reason" through the real `node src/commands/start.js` entry; if an argument cannot carry it intact, pass it on standard input as `inbox answer <id> --stdin` does (`src/commands/start.js:950-962`).
- **A build claim and a send-back at the same moment:** the plan is built from a withdrawn approval, or left in neither place.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Test "A plan whose build has started is not sent back"; refuse before any write when the plan is no longer in the build queue (`rejectPlan` already reads the file before it writes, `src/lib/actions.js:859`).
- **A cancelled build leaves a dependent build waiting forever:** a queued build of another plan, blocked on the cancelled one, never becomes runnable.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Test that such a dependent task is listed by `unsatisfiableTasks` (`src/lib/task-registry.js:24-25`) after the send-back, and name it in the result line.
- **Two tests assert the rejection header:** `tests/actions-coverage.test.js:223` and `:237`.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Keep the header text unchanged (see "Decisions Taken Under Ambiguity"), so both tests stay as they are.

### Business Risks
- **Sending back becomes a cheap way to avoid building:** the coordinator bounces plans instead of building them.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Require a reason, keep it in the plan and on the result line; counting send-backs stays with "Send-backs from review and security rounds count toward the three-per-step limit".
- **The owner's review send-back keeps landing somewhere other than its words say** (items 3 and 4 above).
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Put the question below to the owner, and pin the review screen character for character in "The review screen is unchanged".

### Dependency Risks
- **Shared files:** `src/lib/streaming-gate.js` with "The menu prints the exact answer command for every option of every streamed question"; `src/lib/actions.js` with "Send-backs from review and security rounds count toward the three-per-step limit"; `src/commands/start.md` with "The classification brief for the gate critic carries the plan file modification time" and the slice "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect". File overlaps, not dependencies.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Declare every one of these files in the implementation plans' `files:` so the scheduler's file-conflict rule never builds two of them at the same time.
- **The background-agent menu refusal may be switched back on** by "The background-agent protection is measured before the owner decides whether it is on", which could refuse the command when a background agent runs it.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Run the send-back from the coordinator's main session, the actor of these stories, and test it there.

## Priority

**Priority: HIGH** (Score: 7/9)
- Dependency: 2 — no plan depends on this one and it depends on none; it shares files with three plans.
- Business Impact: 3 — it is the vision's first "Real routes, not snapshots" example and carries two of its frictions.
- Technical Risk: 2 — one new command over the existing `rejectPlan` and `cancelTask`, one screen branch, and six title readers.

## Questions for the owner

### When the send-back command becomes real, what does it do with a plan in review?

The review screen offers two send-backs whose action strings name requirements ("Send it back — wrong thing") and technical planning ("Send it back — wrong way"). The only send-back code, `rejectPlan`, moves a plan exactly one stage back, which from review is into the build, and no source line reads the named destination ("What the source says today", items 3 and 4). For a build-queue plan both designs agree: one stage back is technical planning. For a plan in review they disagree. Where a send-back lands is gate logic, so it is yours to decide.

- **Recommended: (a) build-queue plans only.** The command sends back build-queue plans. The `claude:reject` row in `src/commands/start.md` sends only those to the command and leaves a review plan's send-back to the conversation exactly as today; run directly on a review plan, the command refuses with a sentence saying it sends back build-queue plans only. The review screen stays character for character as it is. The mismatch is listed under "Neighbours" for you to schedule as its own plan. Reason: it closes the two filed frictions without changing where any send-back lands, and keeps this increment small; `rejectPlan` is also edited by the counting plan. Evidence: the mismatch is read in the source and the searches are cited (strong); what a session actually does today with a review send-back has not been observed (none). Cost: the review mismatch stays until you schedule it, and there are two ways to send back, the command for build-queue plans and the conversation for review. The conversation's only executable send-back is the same by-hand `node -e` call into `rejectPlan` that this vision exists to remove (item 2), so a send-back from review keeps needing it, and it lands in the build, not where its option says; if the background-agent menu refusal is switched back on, that call may be refused too. The recommendation still holds because the review send-back is not one of the frictions this plan carries, and your rule for a small increment is to list a finding outside its goal for you to schedule rather than grow the increment.
- (b) Honour the named destination for every send-back. The command sends a review plan to requirements or to technical planning as its option says, and withdraws every approval recorded since that stage. Your "wrong thing" and "wrong way" then do what they say. Cost: a change to where send-backs land, which needs your explicit approval as gate logic; this plan grows by the review cases; and `rejectPlan`, which the counting plan also edits, gains a destination.
- (c) One stage back everywhere. The command sends a review plan into the build, and refuses the review screen's two destinations until they are relabelled. Cost: both review send-backs stop working through the command at once.

What would flip the recommendation: if you want no by-hand send-back left anywhere now, or the review send-backs fixed in this same increment, (b).

New ideas in this question, for you to check:
- Refusing review plans in the command, and leaving their send-back to the conversation, instead of improvising a destination: added by the Product Owner.
- Withdrawing every approval recorded since the destination stage in (b): added by the Product Owner; `rejectPlan` withdraws one record today (`src/lib/actions.js:894`).

## Decisions Taken Under Ambiguity

1. **Only this plan file was edited**: chose to write no `.status` file (none existed) and no questions file under `.ctoc/streaming/questions/pending/`, because the brief allowed edits to this plan file only. Consequence: the menu shows the question above only after a questions file exists for this plan, for example through `claude:generate-questions` on `functional/ctoc-is-built-with-ctoc-a-plan-in-the-build-queue-can-be-sent-back-to-technical-plan.md`.
2. **The Problem Statement and the Decomposition are kept as written**: chose not to rewrite the decomposer's text. Two of its statements are superseded by "What the source says today": "The reader that shows it has not been located" (six readers are located, item 5) and "The cause of claude:reject printing only the menu is reported, not traced" (traced by reading, item 2). The line numbers it cites were re-read in this worktree and match: `src/lib/streaming-gate.js:1693` and `:1697`, `src/lib/actions.js:835` and `:886`, `src/lib/gate-order.js:21`. Wherever the Decomposition's draft stories differ from "User Stories" and "Acceptance Criteria" above, the refined sections replace them: there are three stories, not four; the Estimable qualifier on the `claude:reject` story is dropped; and its line "the status line and every plan list show the plan's title" is narrowed to the screens that name plans by title, because stage lists show file names ("What the source says today", item 5).
3. **Four stories became three**: chose to merge the `claude:reject` story into "Sent back with a reason", because the screen option's action string is that command, and the agent file allows three stories at most.
4. **The fix is in the reading, not in the header**: chose one way of naming a plan that skips a level-1 heading reading exactly `REVISION <number>`, because two plans in requirements and five in `plans/done/` already carry that header (item 6); a header-only fix would leave them showing "REVISION 2", and rewriting them would change finished plans that their approval records describe. The header `rejectPlan` writes stays as it is, so the reason still sits at the top of the file where the planner reads it first, and `tests/actions-coverage.test.js:223` and `:237` stay unchanged. This settles the choice the decomposer left to the Product Owner.
5. **Only an exact `REVISION <number>` heading is skipped**: so a real title that begins with "Revision" still shows ("A real title that begins with "Revision" still shows").
6. **One fallback for every reader**: chose the plan's own heading, else its frontmatter title, else its file name, which is what `planTitle` does today (`src/lib/streaming-gate.js:167-173`). The plan screen today falls back straight to the file name (`:1596-1597`); with one shared rule it gains the frontmatter step.
7. **The send-back reuses "Send it back — wrong way"**: chose the existing phrase and description from `src/lib/gate-words.js:160-164`, because that module is the one encoding of these phrases and its description says exactly what this send-back means. "Send it back — wrong thing" is not offered on a build-queue plan, because one stage back cannot reach requirements.
8. **The command keeps the name `claude:reject`**: the menu already emits that action string (`src/lib/streaming-gate.js:1699`) and the session's table names it (`src/commands/start.md:63`), so the same words become a runnable command: one name for one thing. How the reason travels, an argument or standard input, is the implementation planner's choice under the risk above.
9. **A reason is required**: `rejectPlan` accepts an empty one today, but this story's value is that the planner sees why the plan came back.
10. **A queued build is cancelled by the send-back, not a reason to refuse it**: the send-back is the decision not to build this version, so one action does what is meant and says what it did. A build already claimed is refused instead ("A plan whose build has started is not sent back").
11. **No hold beyond today's evidence rule**: a sent-back plan crosses back into the build queue the way any technical plan does, on fresh questions the gate critic finds nothing blocking in, or on the owner's OK. "The plan waits in technical planning" pins only that the next continuation does not return it before anyone works on it (item 8).
12. **The send-back starts no planner**: re-planning stays a separate step the coordinator dispatches, as for any plan in technical planning.
13. **Priority is HIGH, not the decomposer's MEDIUM**: the matrix above gives 7 of 9. Priority is not a schedule; the owner alone chooses what is built and when.
14. **The risk level is MEDIUM**: no risk above has a HIGH impact; the one HIGH likelihood belongs to the review mismatch, which this plan does not change.

### Technical decisions (implementation planner, 2026-10-20)

Every line number below was re-read in the main checkout on 2026-10-20. Nothing was run: the planner reads only. The owner's two answers are in "The owner's answers and what they change" below. Decision 11 above is replaced by his second answer.

15. **One plan, no slice files.** The dispatch brief says to plan in place and create no slice file. The pieces are also one unit of work: the screen's offer is dead without the command, the command without the hold breaks the owner's answer, and both fixes share `rejectPlan`. The plan therefore declares ten working files plus two count files, more than the usual one to three.
16. **The hold is a mark the send-back writes, judged by content.** In the same write that adds the rejection header, `rejectPlan` (when the new command asks it to) adds the frontmatter line `sent_back_digest: "<sha256>"`. The digest covers the plan's whole text, frontmatter included, with line endings read as LF and every `sent_back_digest:` line removed, so the value never covers itself.
    - The plan is held while its text still gives that digest. Any edit releases it, including an edit to `files:` alone. The functional plan's own example reason is a missing `files:` entry, and a hash of the body alone would hold such a plan for ever.
    - The hold is judged by content, never by modification time: a checkout or a worktree copy changes the time without anyone revising the plan. Converting line endings does not release it either.
    - The mark lives in the plan, not under `.ctoc/state/`, so it travels with the file into a worktree or a commit, and one read decides it.
    - The marker is new and only this command writes it. Plans sent back before this change carry `# REVISION`, `tag: rejected` and `revision:` but no marker, so they are not held. CTOC has no record of what they said when they were sent back, so it cannot tell whether they changed since.
17. **The hold acts only on the crossing on evidence.** `pendingGateDecisions` refuses to cross a held plan, and `movesOnItsOwn` (the ready predicate) refuses to call it ready, so no screen says "moving on by itself" for a plan the crossing would refuse.
    - The owner's approval (`stream approve`, which runs `approvePlan`) is not changed, so his OK still moves the plan at any time.
    - The screens say why the plan waits, in one sentence. Their Approve option is not marked "Recommended — everything checks out" for a held plan.
    - Every decision question keeps exactly one recommended option, the owner's rule. On the opening screen, "Open the plan" leads as the recommended option, the shape `buildOptions` already uses for a plan that fails validation, because reading the reason is the next step. On the plan screen, whose body already shows the reason, "Check validation" leads as the recommended option, the shape that screen already uses for a plan that fails (`:1686-1692`). Approving the rejected approach unchanged is offered on both screens and recommended on neither.
18. **The automatic writers of a plan in technical planning were listed, and none edits a sent-back plan before it crosses.** Searched with the pattern `(writeFileSync|appendFileSync|renameSync)\((planPath|newPath|p\.path|plan\.path|filePath|target|file)\b` over `src/`: 26 lines in 13 files matched, each read.
    - The writers of plan files among them run at a crossing or later: `appendDefaultDecisions` (`src/lib/streaming-gate.js:667`, after a crossing), `applyIronLoop` and `stampFrontmatterFlag` (`src/lib/actions.js:613-656`, with `iron-loop.js:313` and `:373`), the forced move to review (`src/lib/actions.js:1357`, a plan being built), and the approval's rollback (`:394`, which writes the plan's own earlier bytes back).
    - `rejectPlan` itself is a writer (`:889`). `createCanvas` (`:2497`) and the decomposer (`vision-decomposer.js:205`, `:399`) write new plans of other stages. `stale-cleanup.js:240-242` moves a plan aside. `src/hooks/validate-plan-steps.js:205` is a hook no hooks file registers (`hooks/hooks.json` registers only `protect-records.js`). The rest (`inbox.js`, `claim-ledger.js`, `plan-index/calibration.js`, `hotfix-check.js`, `src/tabs/vision.js`, and the comment at `actions.js:38`) write no plan in technical planning.
    - `writeComplianceTrigger` (`src/lib/iron-loop-compliance-trigger.js:137`) has no caller under `src/` (pattern `writeComplianceTrigger\(`, one line, its definition).
    - The one writer that could edit a held plan without a planner is the hand-run maintenance script `renumberImplementationPlans` (`src/lib/plan-numbering.js:505`). It rewrites `parent_plan` and `depends_on` and so would release the hold. It is run by hand, and only for unnumbered plans.
    - `movePlan` (`src/lib/actions.js:96-155`) only renames.
19. **The send-back runs inside the build-start lock.** It holds the one lock `claimBuildLocked` relies on (`withBuildStartLock`, `src/lib/actions.js:1031`). Inside the lock it re-checks that the plan is in `plans/todo/` and that no running or cancelling build covers it. Only then does it clear the plan's status file, as `startExecution` does (`:998-1002`), run `rejectPlan`, and cancel the plan's queued builds.
    - A build start and a send-back therefore never interleave.
    - The function lives in `actions.js` because the lock is private there.
    - A busy lock is a refusal sentence. Nothing waits in a loop, and nothing sleeps.
20. **The send-back comes first, the cancel second.** If a cancel then fails, the result line says so. The queued build left behind cannot run: its claim refuses because the plan is no longer in the build queue (`src/lib/actions.js:1161-1164`). Cancelling first would leave, on a failed send-back, a plan in the build queue whose build was cancelled.
21. **A plan file of the same name already in technical planning is refused before any write.** `rejectPlan` writes and withdraws the approval before it moves (`:889`, `:894`, `:897`). A move that `movePlan` refuses would therefore leave a rewritten plan in the build queue with its approval withdrawn.
22. **The reason travels on standard input, in the inbox answer's heredoc form.**
    - `start.js` reads standard input for exactly `claude:reject <ref> <dest> --stdin`, as it does for `inbox answer <id> --stdin` (`src/commands/start.js:959-962`).
    - The bytes are decoded by the inbox's own `decodeAnswer` (`src/lib/inbox.js:549`). It applies UTF-8 strictly, a size cap, the removal of one trailing line break, refusal of a blank reason, and refusal of a line that starts with the heredoc marker prefix `CTOC_ANSWER_`. It gains an export and nothing else.
    - A reason on the command line would need the session to quote arbitrary text for the shell. The acceptance criteria's own reason holds `"` and `$HOME`.
23. **The command answers in the `menu task` shape `{ ok, text }` (with `refused` and `reason` on a refusal), never a screen.** That shape prints one line and no dashboard. The reason codes name no stage directory.
24. **The result line names no task by its id.** The owner's rule is that plans and tasks are named by what they do, never by a number. A cancelled build is "its queued build", and a build left waiting is named by its plan's title.
25. **One title reader, `planOwnTitle(content, fallback, metadata?)`, exported from `streaming-gate.js`.**
    - It reads only the body after the leading frontmatter blocks (`stripLeadingFrontmatter`, `:230-247`), so a YAML comment line in the frontmatter can never become a title.
    - It matches level-1 headings with `[ \t]+`, never `\s+`. In multi-line mode `\s+` can run across a line break.
    - It skips each send-back block by its structure: from a heading that reads exactly `REVISION <digits>` up to and including the next line that is exactly `---`, the separator `rejectPlan` writes after the reason (`src/lib/actions.js:886`). A `#` line inside a reason is therefore never taken for the title.
    - Then it falls back to the frontmatter `title` (a number or a boolean is read as text), then to the file name.
    - The six readers route through it. `planTitle` becomes a one-line delegate.
    - Remaining case, recorded rather than fixed: a reason that holds a line that is exactly `---` followed by a `# ` line puts that line forward as the title. Only the displayed name is affected, and the reason is the coordinator's own text.
26. **The send-back is offered on the build-queue plan screen's lifecycle question (`:1727-1741`) only.** A plan in the build queue has no stored questions in practice. Questions are generated for the three decision stages, and a ref in `todo/` is never written. On the product-question branch, adding it to the ride-along would make five options, one more than the asking tool takes.
27. **The test file is new and is named for the behaviour.** It declares `CLAUDE.md` (Gate 2 requires that for a new `tests/*.test.js`, `src/lib/documented-counts.js`) and `README.md`. Both state the test-file count (`src/scripts/release.js:114-115`). Step 15 updates both lines through the release script's own two count functions.
28. **The "plans sent back before this change" fixture is written into the test.** The real file `plans/functional/finished-plans-are-not-sent-back-after-an-update.md` will move stages, so a test that reads it would break when it moves. The fixture copies that file's shape: two send-back blocks, `# REVISION 2` and then `# REVISION 1`, above its own title, "Finished plans are not sent back after an update" (verified by grep: lines 23, 31 and 40 of that file).
29. **`type: feature` became `type: implementation`**, to match the sibling technical plans. A search for `metadata\.type|\.type === 'feature'|type === 'implementation'` over `src/lib/` found only `type === 'vision'` checks, so no code reads it for this plan.
30. **This plan's prose passes the completion-time scan that reads a created-file claim.** `validateNoContradictions` (`src/lib/plan-validator.js:732-855`) turns a "create"/"created", "adde"/"added" or "new file" claim on a path that is missing at completion into an error. A claim after "run", "execute" or "script" on such a path is only a warning (`:849-853`).
    - This pattern, run over this file, matched two places:

      ```
      (?i)(created?|added?|new file)[:\s]*[`"]?[^\s`"'(),]+\.[a-z0-9]+
      ```

      - the frontmatter's `created:` time, which `isPathPlausible` rejects, as in every plan;
      - the Implementation Order's `CREATE` of the test file, which the build creates.
    - The test fixtures' made-up paths (`src/readers.js`, `src/feed.js`, `src/other.js`) are never written after such a word.
31. **The send-back offer adds an option to a question that already carries no recommended option.** The lifecycle question (`:1727-1741`) never had one, and the scenario pins its four options and the send-back's words. It is listed under Neighbours, not changed here.

32. **Four type annotations the type check needed (executor, Step 10).** `npm run typecheck` (`tests/typecheck.test.js`, baseline 0) reported nine errors for the code as specified: `rejectPlan`'s fifth parameter has the default value `/** @type {{ holdUntilRevised?: boolean }} */ ({})`; `sendBackFromBuildQueue` has the typedef `SendBackResult` and its lock callback is annotated `@returns {SendBackResult}`; `sendBackCommand`'s `refuse` casts its object to `{ ok: false, refused: true, reason: string, text: string }`; and the reason decoding tests `!('answer' in decoded)` instead of `typeof decoded.answer !== 'string'` (same truth table, narrows the union). Behaviour is unchanged.
33. **No sentence on a held plan's own screen when its questions are checked and need nobody (executor, Step 10).** The plan specifies the held sentence for the opening screen and for the checking line (`uncheckedLines`), and the held plan screen's two option descriptions; its body shows the reason at the top. The plan screen therefore carries no `SENT_BACK_UNREVISED_LINE` for a classified held plan, and the test asserts the options, not that sentence, on that screen. Built as written; recorded for the critic.

34. **A send-back that stops part-way is told apart by the plan's bytes (CTO Chief's change list, executor).** The plan's bytes are read before anything is cleared or written. If the send-back throws and the file is now missing, unreadable or different, the plan is no longer what its queued builds were approved to build: they are cancelled and the result says "stopped part-way". If the bytes are the same, nothing is cancelled (Decision 20 kept) and the result says "Nothing was sent back". The cause goes to the warn log (`send_back_failed`, and `send_back_cancel_failed` per cancel that did not happen), never to the result line. A cancel that throws is counted as cancelled when the task is read again and is `cancelled` (someone cancelled it at the same moment); no error text is matched. The clause "it cannot start while the plan is out of the build queue" is dropped, since it is false on the failure path.
35. **A plan file in the build queue that is a link or not a plain file is refused (`not-a-plain-file`).** `lstat` inside the lock, before the byte read, so a link's target is never rewritten. The test fails loudly when links cannot be made, as `tests/the-owner-answers-an-inbox-question.test.js` does; it is never skipped.
36. **Decision 25's remaining case is reversed.** Decision 25 recorded, and did not fix, a reason with a line that is only `---` followed by a `# ` line. The command now refuses such a reason (`reason-holds-separator`), after `rejectPlan`'s own removal of control characters, so `-\x01--` is caught too. A reason of only invisible or control characters (white space, `Cc`, `Cf`, `Default_Ignorable_Code_Point`) is refused with the no-reason sentence. Refused, never escaped; `decodeAnswer` is untouched. The Security Review's "Input validation" row keeps its approved text; Decision 39 supersedes it and names these refusals.
37. **The validation screen of a held plan leads with Back.** For a plan in technical planning that `isSentBackUnrevised`, the clean validation screen lists Back first ("Recommended — ...") and Confirm approve second with `HELD_APPROVE_DESCRIPTION`; the action strings are unchanged. An unreadable plan counts as not held. Left out, recorded: the hold mark is matched anywhere in the file (it only keeps a plan held, which fails toward the owner's approval).
38. **How the tests were proved to bite (executor, resumed round).** Each of these was removed one at a time from the built code and the new test file run; each made the named case fail, and the code was restored byte for byte: the changed/unchanged decision in the catch (C9, C9b), the reload of a task whose cancel threw (C10c), the two warn-log writes (C9, C10), the singular and plural could-not-cancel words (C10, C10b), the stopped-part-way words (C9), the plain-file test (C14), the separator refusal and its control-character strip (C15), the invisible-character refusal (C16), the held branch (D9, D9b). Two mutations did not fail at first and the tests were tightened: C9b now asserts the whole refusal sentence, and C16 now includes a Hangul filler (U+3164), a character only `Default_Ignorable_Code_Point` catches. The status-file injection of C9b (a folder where the status file would be) does make `clearStatus` throw before `rejectPlan` writes on this machine, and the plan's bytes and approval record stay as they were.
39. **The Security Review's "Input validation" row is superseded by this entry (executor, Step 10, at the owner's CTO Chief's change list).** The row, as approved, names the strict decoding of the reason (`decodeAnswer`: UTF-8 fatal, the size cap, refusal of a blank reason and of a marker line). The built command also refuses, after `rejectPlan`'s own removal of control characters, a reason that holds a line of only `---` (`reason-holds-separator`, which would end the reason early inside the plan, and also catches `-\x01--`), and a reason made only of invisible or control characters (white space, `Cc`, `Cf`, `Default_Ignorable_Code_Point`), which gets the no-reason sentence. Both are refused, never escaped, and `decodeAnswer` is untouched. Where the row and this entry differ, this entry governs (see entries 36 and 38).

## Neighbours (seen, not built here; scheduling is the owner's)

- **A review send-back does not land where its words say.** The review screen's "Send it back — wrong thing" names requirements and "Send it back — wrong way" names technical planning (`src/lib/streaming-gate.js:1699`, `src/lib/gate-words.js:154-165`), but the only send-back code moves a review plan into the build (`src/lib/actions.js:856`, `src/tabs/review.js:119-120`), and `src/commands/start.md:63` tells the session nothing more. Read, not run. Unless the owner picks (b) above.
- **No route sends a technical plan back to requirements.** A plan in technical planning shows the build-it question with no send-back (`src/lib/streaming-gate.js:1692-1701` adds send-backs only in review), so a build-queue plan found to be the wrong thing needs a second send-back that has no menu route. Read, not run.
- **`removeFromQueue` moves a build-queue plan back with no reason, no rejection record, and its approval record kept** (`src/lib/actions.js:973-977`). It is exported and has no caller under `src/`: the pattern `removeFromQueue\(` over `src/` matched one line in one file, its definition. Read, not run. Added by the implementation planner.
- **The advisory self-check reports every sent-back plan as not approved into technical planning.** `checkGateDestinationsApproved` (`src/lib/iron-loop-enforcer.js:375`, registered at `:693`) classifies every plan in `plans/implementation/` by its approval record, and `rejectPlan` withdraws that record. The same is already true of the plans sent back by hand that sit there today. The check is advisory (its own comment at `:386-387`), and the hook that would revert such a plan, `src/hooks/human-gate-check.js`, is not registered (`hooks/hooks.json` registers only `src/hooks/protect-records.js`). Read, not run. Added by the implementation planner.
- **A plan that returns to the build queue takes its old place in the queue order.** `.ctoc/state/todo-order.json` keeps the sent-back plan's name, and `readTodoQueueOrder` (`src/lib/state.js:96-126`) puts listed names first. Read, not run. Added by the implementation planner.
- **If the record refusals are switched back on** (`RECORD_REFUSALS_OFF`, `src/hooks/protect-records.js:1170`):
  - A background agent's send-back is refused, because `subagentMayRunRoute` (`:772-787`) has no `claude:reject`. That is the behaviour this plan wants.
  - The main session's heredoc command is not a plain menu call (`menuCallArgs`, `:617-649`, gives up on `<`). The record checks would then read the reason as shell text, so a reason that names a path under `.ctoc/approvals/` could be refused as a record write. Only the inbox answer's heredoc is stripped before that reading (`withoutMenuStdin`, `:1058-1068`).
  - Read, not run. A hook change is the owner's to approve, so it is not in this plan. Added by the implementation planner.
- **Two questions on the plan screen carry no recommended option, against the owner's rule that every question carries exactly one.** They are the lifecycle question of a plan not at a decision ("What should happen to …?", `src/lib/streaming-gate.js:1727-1741`) and the ride-along question ("Anything else for …?", `:1746-1763`). This is true of every plan today, in every stage that shows them. Read, not run. Added by the implementation planner.

## The owner's answers and what they change

Both answers are recorded in `.ctoc/streaming/answers.jsonl` (lines 244 and 246, ref `functional/ctoc-is-built-with-ctoc-a-plan-in-the-build-queue-can-be-sent-back-to-technical-plan.md`, option key `1` each). They are settled; this plan builds on them.

1. **"When the send-back command becomes real, what does it do with a plan in review?" — "(a) Build-queue plans only; review send-backs stay as they are".** Under this answer the command sends back build-queue plans only. Run on any other plan, it prints a refusal sentence and leaves the file byte for byte as it was. The review screen stays character for character, and the `claude:reject` row in `src/commands/start.md` keeps the review send-backs in the conversation. The scenario "The review screen is unchanged" holds as written.
2. **"Should a sent-back plan be held in technical planning until it has been revised?" — "Hold it in technical planning until it has been revised".**
   - This replaces Decision 11 ("No hold beyond today's evidence rule") and extends "The plan waits in technical planning". His approve still crosses the plan at any time.
   - The hold is built as Technical decisions 16 to 18 above say. The check proves the plan was changed after the send-back, not that the change answers the reason; the gate critic still judges that part.
   - Four scenarios are added, under "Held until it is changed (the owner's answer of 2026-10-20)" at the end of the Acceptance Criteria, so the check before review counts them with the other thirteen.

## Implementation Details

### Architecture Decision

Each of the three needs is placed where its data already lives:
- **The command's work** goes into `actions.js`, beside `claimBuild` and the private build-start lock it must share.
- **The command's words, the screen's offer, the hold at the crossing and the one title reader** go into `streaming-gate.js`, which already owns the plan screen, the crossing on evidence, `nameOfPlanAt` and `humanPlanName`.
- **The route** goes into `menu-screens.route`, the one router `start.js` calls.
- **The hold** is one frontmatter line written in the send-back's own write, and judged by one pure function.
- **No new module.** Every new function has a live caller in this same change, and nothing reads a new file from disk.

### Dependency Graph

```
src/commands/start.js main()  [MODIFY: read stdin for `claude:reject <ref> <dest> --stdin`]
  --calls--> src/lib/menu-screens.js route()                      [MODIFY: case 'claude:reject']
    --calls--> src/lib/streaming-gate.js sendBackCommand()          [NEW, exported]
      --lazy--> src/lib/inbox.js decodeAnswer()                     [MODIFY: exported]
      --calls--> nameOfPlanAt() --> planOwnTitle()                  [MODIFY / NEW, exported]
      --calls--> src/lib/actions.js sendBackFromBuildQueue()        [NEW, exported]
        --calls--> withBuildStartLock()  (private, :1031)
        --calls--> clearStatus()  (./background)
        --calls--> rejectPlan(..., { holdUntilRevised: true })      [MODIFY: 5th parameter]
          --calls--> sentBackDigest() --> hash-utils.hashString()   [NEW, private]
        --calls--> cancelTask()  (:2335), task-registry.unsatisfiableTasks() (:1117)
  --calls--> route() case 'plan' --> planDecisionScreen()           [MODIFY: build-queue offer; hold words]
src/lib/menu-screens.js continueAfterCrossing() (:2891)
  --calls--> pendingGateDecisions()                                 [MODIFY: hold at the crossing]
    --calls--> actions.isSentBackUnrevised()                        [NEW, exported]
movesOnItsOwn() / regimeLine() / uncheckedLines() / buildOptions()  [MODIFY: hold words]
planOwnTitle() <--called by-- planTitle(), planDecisionScreen(), nameOfPlanAt(),
  menu-screens.planNameAt(), increment-feed.recentIncrements(), loop-b-driver.nameForRef()
tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js --tests--> all of the above
```

Load-time edges: `streaming-gate` already requires `actions` at load (`:46`). `actions` gains `require('./hash-utils')`, which requires only `regex-utils`, `safe-fs` and `path` (`src/lib/hash-utils.js:11-14`). `actions` never requires `streaming-gate` at load. `inbox` is required lazily, inside `sendBackCommand`. `increment-feed` and `loop-b-driver` already require `streaming-gate` lazily. No cycle can form.

### File Specifications

#### File: `src/lib/actions.js`
**Action:** MODIFY
**Purpose:** The send-back's work under the build-start lock, and the hold mark written and judged.
**Change Type:** new-function + modify-existing

Changes:
- **Import** `const { hashString } = require('./hash-utils');` after `:33`.
- **Add**, directly above the comment block that introduces `rejectPlan` (`:782`):

```js
/** The frontmatter key a build-queue send-back writes: the digest of the plan as the send-back left it. */
const SENT_BACK_KEY = 'sent_back_digest';

/**
 * The digest a build-queue send-back records: sha256 of the plan text with line endings read as LF
 * and every `sent_back_digest:` line removed, so the value never covers itself and a checkout that
 * converts line endings is not a change.
 * @param {string} content plan file text
 * @returns {string} 64 lower-case hexadecimal characters
 */
function sentBackDigest(content) {
  return hashString(String(content).replace(/\r\n/g, '\n').replace(/^sent_back_digest:[^\n]*\n?/gm, ''));
}

/**
 * Was this plan sent back from the build queue and not changed since (the owner's hold of
 * 2026-10-20)? True only when its text carries `sent_back_digest: "<64 hex>"` and that value equals
 * sentBackDigest of the text now. Any edit, to the body, the `files:` list or any other frontmatter
 * line, makes it false; so does a plan sent back before the mark existed, which carries none.
 * Pure; never throws.
 * @param {string} content plan file text
 * @returns {boolean}
 */
function isSentBackUnrevised(content) {
  if (typeof content !== 'string') return false;
  const m = /^sent_back_digest:[ \t]*"([0-9a-f]{64})"[ \t]*\r?$/m.exec(content);
  return m !== null && m[1] === sentBackDigest(content);
}
```

- **Modify** `rejectPlan` (`:835-898`). The signature becomes `rejectPlan(planPath, feedback, projectPath, deps = {}, opts = {})`. The JSDoc gains `@param {{ holdUntilRevised?: boolean }} [opts] - holdUntilRevised: true (the build-queue send-back only) also writes the hold mark in the same write; see isSentBackUnrevised`. Lines `:878-889` become:

```js
  const fields = [
    ['revision', String(revision)],
    ['rejection_reason', `"${yamlFeedback}"`],
    ['tag', 'rejected'],
  ];
  // The owner's hold (2026-10-20): the build-queue send-back marks the plan with the digest of the
  // text it leaves; the crossing on evidence waits until that text changes.
  const hold = opts !== null && typeof opts === 'object' && opts.holdUntilRevised === true;
  if (hold) fields.push([SENT_BACK_KEY, '""']);
  const merged = upsertMarkerFields(content, fields);

  // Insert the rejection header AFTER the (single) frontmatter block, never above it.
  const rejectionHeader =
    `# REVISION ${revision}\n\n## Rejection Feedback\n\n${bodyFeedback}\n\n---\n\n`;
  const fm = merged.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  let rewritten = fm ? fm[1] + rejectionHeader + fm[2] : rejectionHeader + merged;
  if (hold) {
    const digest = sentBackDigest(rewritten);
    rewritten = rewritten.replace(/^sent_back_digest: ""$/m, () => `${SENT_BACK_KEY}: "${digest}"`);
  }
  safeFs.writeFileSync(planPath, rewritten);
```

  - `upsertMarkerFields` (`src/lib/frontmatter-merge.js:258-272`) strips every key it is about to insert. A second send-back therefore replaces the old mark instead of adding a second line.
  - The placeholder line is the first `sent_back_digest: ""` line in the file, which is the frontmatter's.
  - Every other line of `rejectPlan`, and every existing caller (`src/tabs/review.js:121`, `:152`, which pass no fifth argument), is unchanged.
- **Add** `sendBackFromBuildQueue`, directly below `claimBuild` (`:1292-1312`):

```js
/**
 * Send a plan waiting in the build queue back to technical planning with a reason: the work of the
 * menu command `claude:reject todo/<file>.md implementation --stdin` (streaming-gate.sendBackCommand
 * words it). Runs inside the one build-start lock, so a build start never interleaves with it.
 * Inside the lock, in order:
 *   1. refuses unless `plans/todo/<file>` is there under that exact name, naming `being-built` when
 *      the plan sits in `plans/in-progress/` or a running or cancelling build task covers it;
 *   2. refuses when a plan of that name already sits in `plans/implementation/` (rejectPlan would
 *      rewrite the plan and withdraw its approval before its move refused);
 *   3. clears the plan's status file, as startExecution does;
 *   4. runs rejectPlan with the hold mark (one stage back, the reason in the plan, the approval
 *      record withdrawn);
 *   5. cancels every queued build task of the plan, and names the queued builds of other plans that
 *      waited on a cancelled one and can now never run.
 * A failed cancel is reported, never thrown: the plan is already back in technical planning, and
 * the build left queued cannot start (its claim refuses a plan that is not in the build queue).
 *
 * @param {string} root project root
 * @param {string} file the plan's bare file name `<slug>.md`, already checked by the caller
 *   (streaming-gate.parseAnyRef: plain characters, no separator)
 * @param {string} reason the non-blank reason, decoded by the caller
 * @returns {{ ok: true, cancelled: string[], cancelFailed: Array<{id: string, message: string}>, stranded: string[] }
 *   | { ok: false, reason: ('busy'|'lock-unusable'|'being-built'|'not-found'|'name-taken'|'send-back-failed'),
 *       lockPath?: string, message?: string }}
 *   `cancelled` holds task ids; `stranded` holds the bare plan names of the queued builds left waiting.
 */
function sendBackFromBuildQueue(root, file, reason) {
  const plansDir = getPlansDir(root);
  const key = file.replace(/\.md$/i, '').toLowerCase();
  const inTodo = () => {
    try { return safeFs.readdirSync(path.join(plansDir, 'todo')).includes(file); } catch { return false; }
  };
  const locked = withBuildStartLock(root, () => {
    if (!inTodo()) {
      return { ok: false, reason: safeFs.existsSync(path.join(plansDir, 'in-progress', file)) ? 'being-built' : 'not-found' };
    }
    const builds = taskRegistry.load(root).tasks.filter((t) => t.kind === 'implement' && t.plan != null
      && String(t.plan).replace(/\.md$/i, '').toLowerCase() === key);
    if (builds.some((t) => t.status === 'running' || t.status === 'cancelling')) return { ok: false, reason: 'being-built' };
    // The same existence test movePlan makes before it refuses to overwrite (:121).
    if (safeFs.existsSync(path.join(plansDir, 'implementation', file))) return { ok: false, reason: 'name-taken' };
    const todoPath = path.join(plansDir, 'todo', file);
    try {
      clearStatus(todoPath);
      rejectPlan(todoPath, reason, root, {}, { holdUntilRevised: true });
    } catch (err) {
      return { ok: false, reason: 'send-back-failed', message: cutCtl(err && err.message, 160) };
    }
    const cancelled = [];
    const cancelFailed = [];
    for (const t of builds.filter((b) => b.status === 'queued')) {
      try {
        cancelTask(root, t.id);
        cancelled.push(t.id);
      } catch (err) {
        cancelFailed.push({ id: t.id, message: cutCtl(err && err.message, 120) });
      }
    }
    const gone = new Set(cancelled);
    const stranded = taskRegistry.unsatisfiableTasks(taskRegistry.load(root))
      .filter((u) => u.reason === 'dep-failed' && u.deps.some((d) => gone.has(d)) && typeof u.task.plan === 'string')
      .map((u) => u.task.plan);
    return { ok: true, cancelled, cancelFailed, stranded };
  });
  if (!('value' in locked)) {
    return locked.unusable ? { ok: false, reason: 'lock-unusable', lockPath: locked.unusable } : { ok: false, reason: 'busy' };
  }
  return locked.value;
}
```

  - The exact-name directory listing for the build queue is the claim's own test (`:1148-1150`). On a case-insensitive file system, a name that differs only in letter case is therefore not taken for this plan.
  - `cutCtl` (`:1088`), `clearStatus` (`:25`), `getPlansDir` (`:23`) and `taskRegistry` (`:31`) already exist. `cancelTask` (`:2335`) and `rejectPlan` are function declarations in the same module.
  - Every `catch` returns or records. None is empty, which the false-green fence (`.ctoc/false-green-baseline.json`) refuses.
- **Update** `module.exports` (`:2826-2868`): add `isSentBackUnrevised` (caller: `streaming-gate.pendingGateDecisions` and `planDecisionScreen`) and `sendBackFromBuildQueue` (caller: `streaming-gate.sendBackCommand`). `sentBackDigest` and `SENT_BACK_KEY` stay private.
- Throws: `sendBackFromBuildQueue` throws only what `withBuildStartLock` throws for a lock path it cannot create (`mkdirSync`, a `create` error other than "already there"), exactly as `claimBuild` does. `isSentBackUnrevised` never throws.

#### File: `src/lib/streaming-gate.js`
**Action:** MODIFY
**Purpose:** The build-queue plan screen offers the send-back, the command's words, the owner's hold at the crossing on evidence, and the one title reader.
**Change Type:** new-function + modify-existing

Changes:
- **Imports.** `:44` becomes `const { readPlans, getPlansDir, parseMetadata } = require('./state');`. `:46` becomes `const { approvePlan, movePlan, isSentBackUnrevised, sendBackFromBuildQueue } = require('./actions');`.
- **Add**, after `GATE_META` (`:82-86`):

```js
/** The one send-back a plan waiting in the build queue is offered: "wrong way", back to be re-planned. */
const BUILD_QUEUE_SEND_BACK = gateWords.SEND_BACK.find((sb) => sb.toStage === 'implementation');
```

- **Replace** `planTitle` (`:167-173`) with the one title reader and a one-line delegate:

```js
/**
 * The plan's own one-line title: the ONE title reader every screen and status line uses.
 *
 * It reads only the body after the leading frontmatter blocks, so a YAML comment line is never a
 * title, and takes the first level-1 heading (`#`, a space or tab, then text) that is not inside a
 * send-back block. A send-back (actions.rejectPlan) writes `# REVISION <n>`, `## Rejection Feedback`
 * with the reason, then a line `---`, above the plan's own title. Each such block, from a heading
 * that reads exactly `REVISION <digits>` up to and including the next line that is exactly `---`, is
 * skipped, so neither "REVISION 1" nor a `#` line inside a reason is taken for the title. A real title
 * that begins with "Revision" is kept. With no such heading it falls back to the frontmatter `title`
 * (a number or a boolean read as text), then to `fallback`. Control characters are stripped. Never throws.
 *
 * @param {string} content raw plan file content
 * @param {string} fallback the plan's file name without `.md`
 * @param {object} [metadata] the frontmatter already parsed (state.parseMetadata); parsed here when absent
 * @returns {string}
 */
function planOwnTitle(content, fallback, metadata) {
  let inSendBack = false;
  for (const line of stripLeadingFrontmatter(content).split('\n')) {
    if (inSendBack) {
      if (line.trim() === '---') inSendBack = false;
      continue;
    }
    const m = /^#[ \t]+(\S.*)$/.exec(line);
    if (!m) continue;
    const heading = stripCtl(m[1].trim());
    if (/^REVISION [0-9]+$/.test(heading)) inSendBack = true;
    else if (heading) return heading;
  }
  const md = metadata !== null && typeof metadata === 'object' ? metadata : parseMetadata(typeof content === 'string' ? content : '');
  const t = md.title;
  const own = t == null || typeof t === 'object' ? '' : stripCtl(String(t).trim());
  return own || stripCtl(String(fallback == null ? '' : fallback));
}

/** The title of a plan state.readPlans returned (see planOwnTitle). */
function planTitle(plan) {
  return planOwnTitle(plan.content, plan.name, plan.metadata);
}
```

  `stripLeadingFrontmatter` (`:230-247`) splits on `\r?\n` and is a function declaration, so it is available here. It returns `''` for a non-string.
- **Modify** `planDecisionScreen`:
  - `:1596-1597` becomes `const title = planOwnTitle(content, slug);`. With one shared rule, the plan screen gains the frontmatter-title step (functional Decision 6).
  - Before `const approve = …` (`:1676`), add `const heldUntilChanged = stage === 'implementation' && isSentBackUnrevised(content);`. The Approve description becomes the ready text when `readyPlan`, else `HELD_APPROVE_DESCRIPTION` when `heldUntilChanged`, else the existing "Recommended — everything checks out. …" text. Write it with `if` statements, not a nested conditional expression.
  - For a held plan, the "Check validation" description is `HELD_CHECK_DESCRIPTION`, and `options` (`:1692`) is `[check, approve]` when it passes. The order and words for every other plan are unchanged.
  - `:1716` becomes `text += uncheckedLines(state, { regimeHold: regimeHold(projectRoot, stage), sentBackUnrevised: heldUntilChanged });`.
  - The branch at `:1727-1741` becomes:

```js
  } else {
    // 3. Not at a gate and nothing precomputed: the plan-lifecycle decision. A plan waiting in the
    //    build queue can also be sent back to be re-planned (sendBackCommand runs the action).
    const options = [
      { label: 'Discuss', description: 'EXTREME adversarial critique — nothing held back. The most important step.' },
      { label: 'View/Edit', description: 'Show the plan, then edit it' },
      { label: 'Delete', description: 'Remove this plan permanently' },
    ];
    if (stage === 'todo') options.push({ label: BUILD_QUEUE_SEND_BACK.label, description: BUILD_QUEUE_SEND_BACK.description });
    questions.push({ question: `What should happen to ${name}?`, header: name, options });
    actions['Discuss'] = 'claude:discuss';
    actions['View/Edit'] = `claude:view-edit ${stage}/${file}`;
    actions['Delete'] = `claude:delete ${stage}/${file}`;
    if (stage === 'todo') actions[BUILD_QUEUE_SEND_BACK.label] = `claude:reject ${stage}/${file} ${BUILD_QUEUE_SEND_BACK.toStage}`;
  }
```

    The ride-along (`:1746-1763`) then finds all four labels taken and adds no second question.
- **Modify** `pendingGateDecisions` (`:1057-1160`):
  - After `const ref = …` (`:1084`):

```js
      // The owner's answer of 2026-10-20: a plan sent back from the build queue waits in technical
      // planning until it is changed (actions.isSentBackUnrevised); his approve still crosses it.
      const sentBackUnrevised = stage === 'implementation' && isSentBackUnrevised(plan.content);
```

  - `:1099` gains `&& !sentBackUnrevised` after `!regime`.
  - The descriptor (`:1122-1152`) gains `sentBackUnrevised,` after `regimeHold: regime,`, with a one-line comment.
  - The `@returns` type (`:1049-1056`) gains `sentBackUnrevised:boolean`, because type checking runs over `src/`.
  - The header comment gains one paragraph: "A PLAN SENT BACK FROM THE BUILD QUEUE (`sentBackUnrevised`) waits in technical planning until its text changes; nothing else about its descriptor changes."
- **Modify** `movesOnItsOwn` (`:1962-1971`). The first condition gains `|| d.sentBackUnrevised === true`. The comment's list of mirrored conditions gains "no unrevised send-back".
- **Add**, after `REGIME_LINES` (`:1804-1809`):

```js
/** The sentence for a plan sent back from the build queue and not changed since (`sentBackUnrevised`). */
const SENT_BACK_UNREVISED_LINE = 'It waits for a change or your approval: it was sent back to be re-planned and has not been changed since, so it does not move on by itself.';
/** The Approve option's words for a plan the hold keeps waiting: offered, never recommended. */
const HELD_APPROVE_DESCRIPTION = 'Approve it now yourself: it was sent back to be re-planned and has not been changed since. Your answer is recorded as yours.';
/** The recommended option of the opening screen's question for a held plan: read why it came back. */
const HELD_OPEN_DESCRIPTION = 'Recommended — it was sent back to be re-planned and has not been changed since; open it to read why.';
/** The recommended option of the plan screen's question for a held plan, whose body shows the reason above. */
const HELD_CHECK_DESCRIPTION = 'Recommended — it was sent back to be re-planned and has not been changed since; its reason is at the top of the plan above. Show the validation detail before deciding.';
```

- **Modify** `regimeLine` (`:1817-1820`). Its comment says it gives the lines for why the plan waits for the owner instead of moving on by itself: the regime's, then an unrevised send-back's. Its callers (`:1461`, `:1784`, `:1800`, and `uncheckedLines` at `:1869`) need no change. Its body becomes:

```js
  const line = d && d.regimeHold ? REGIME_LINES[d.regimeHold] : '';
  const back = d && d.sentBackUnrevised === true ? `  ${SENT_BACK_UNREVISED_LINE}\n` : '';
  return (line ? `  ${line}\n` : '') + back;
```
- **Modify** `uncheckedLines` (`:1868`): `state === 'checking' && (d.regimeHold || d.sentBackUnrevised === true)` chooses `CHECKING_REGIME_HELD_LINE`. A held plan whose questions are being checked is then never promised to move on by itself.
- **Modify** `buildOptions` (`:1898-1916`). After the existing `if (!d.passesValidation) return [open, skip, ...generate];`, add `if (d.sentBackUnrevised === true) return [{ label: 'Open the plan', description: HELD_OPEN_DESCRIPTION }, { label: d.approveLabel, description: HELD_APPROVE_DESCRIPTION }, skip, ...generate];`. Every other plan's options are unchanged.
  - That is four options at most. `gateScreenAt` may add "Check its questions" (`:2086-2089`), but only when the questions are stored and unchecked, which is exactly when "Generate its questions" is not offered (`:2063-2067`).
  - The actions map needs no change: both labels already have their actions (`:2077-2084`).
- **Modify** `nameOfPlanAt` (`:2327-2335`): `return humanPlanName(planOwnTitle(safeFs.readFileSync(path.join(getPlansDir(root), stage, file), 'utf8'), slug), slug);` inside the existing `try`.
- **Add** `sendBackCommand`, directly after `nameOfPlanAt`:

```js
/** A reason that could not be taken from standard input, by inbox.decodeAnswer's reason: [code, sentence]. */
const SEND_BACK_REASON_REFUSALS = Object.freeze({
  'no-answer': ['no-reason', 'a reason is required — say why the plan goes back to be re-planned.'],
  'blank-answer': ['no-reason', 'a reason is required — say why the plan goes back to be re-planned.'],
  'answer-too-long': ['reason-too-long', 'the reason is too long.'],
  'answer-not-utf8': ['reason-not-text', 'the reason is not UTF-8 text.'],
  'answer-holds-marker': ['reason-holds-marker', 'a line of the reason begins with CTOC_ANSWER_, so the command may not have ended where it should.'],
  'answer-unreadable': ['reason-unreadable', 'the reason could not be read from standard input.'],
});

/**
 * `claude:reject <stage>/<file>.md <destination> --stdin`: the menu command behind "Send it back —
 * wrong way" on the screen of a plan waiting in the build queue. The reason arrives on standard
 * input. Under the owner's answer of 2026-10-20 it sends back build-queue plans only; any other plan
 * is refused with a sentence and left byte for byte as it was (a plan in review is sent back in the
 * conversation, as before). Refuses, in order: a reference parseAnyRef refuses; a stage other than
 * the build queue; a destination other than technical planning; a reason that is missing (no
 * `--stdin` as the third word, or nothing on standard input), blank, too long, not UTF-8, unreadable,
 * or holding a line that begins with the heredoc marker prefix. Then actions.sendBackFromBuildQueue
 * does the work, and its refusals and its result are put in one line. The line names the plan by
 * its title, never by a stage directory, a path or a task id.
 *
 * @param {string[]} words the route words after `claude:reject`
 * @param {string} projectRoot
 * @param {(Buffer|symbol|undefined)} stdinBytes standard input as start.js read it for exactly
 *   `claude:reject <ref> <dest> --stdin` (inbox.readStandardInput)
 * @returns {{ ok: true, text: string } | { ok: false, refused: true, reason: string, text: string }}
 */
function sendBackCommand(words, projectRoot, stdinBytes) {
  const w = Array.isArray(words) ? words : [];
  const refuse = (reason, why) => ({ ok: false, refused: true, reason, text: `Nothing was sent back: ${why}` });
  const parsed = parseAnyRef(w[0]);
  if (!parsed) return refuse('invalid-reference', 'that is not a plan the menu can name.');
  if (parsed.stage !== 'todo') {
    return refuse('not-in-build-queue', 'this command sends back plans waiting in the build queue only; any other plan is sent back in the conversation.');
  }
  if (w[1] !== BUILD_QUEUE_SEND_BACK.toStage) {
    return refuse('wrong-destination', 'a plan waiting in the build queue can only be sent back to be re-planned.');
  }
  const decoded = w.length === 3 && w[2] === '--stdin' ? require('./inbox').decodeAnswer(stdinBytes) : { reason: 'no-answer' };
  if (typeof decoded.answer !== 'string') {
    const [code, why] = SEND_BACK_REASON_REFUSALS[decoded.reason] || SEND_BACK_REASON_REFUSALS['no-answer'];
    return refuse(code, why);
  }
  const name = nameOfPlanAt(projectRoot, 'todo', parsed.file);
  const res = sendBackFromBuildQueue(projectRoot, parsed.file, decoded.answer);
  if (!res.ok) return sendBackRefusal(res, name, projectRoot, parsed.file, refuse);
  const parts = [`Sent back to be re-planned: “${name}”. Its reason is in the plan; it moves on again once it has been changed, or when you approve it.`];
  if (res.cancelled.length > 0) parts.push(res.cancelled.length === 1 ? 'Its queued build was cancelled.' : 'Its queued builds were cancelled.');
  if (res.cancelFailed.length > 0) {
    parts.push(`Its queued build could not be cancelled (${stripCtl(res.cancelFailed[0].message)}); it cannot start while the plan is out of the build queue — cancel it on the task board.`);
  }
  if (res.stranded.length > 0) {
    const names = res.stranded.map((p) => `“${isUnsafePlanFile(`${p}.md`) ? stripCtl(p) : nameOfPlanAt(projectRoot, 'todo', `${p}.md`)}”`).join(', ');
    parts.push(res.stranded.length === 1
      ? `The queued build of ${names} waited on it and can now never run; cancel it, or send its plan back too.`
      : `The queued builds of ${names} waited on it and can now never run; cancel them, or send their plans back too.`);
  }
  return { ok: true, text: parts.join(' ') };
}

/** The one sentence for a send-back actions.sendBackFromBuildQueue refused. */
function sendBackRefusal(res, name, projectRoot, file, refuse) {
  if (res.reason === 'busy') return refuse('busy', 'a build is being started at this moment; run the send-back again.');
  if (res.reason === 'lock-unusable') return refuse('lock-unusable', `${stripCtl(res.lockPath)} is not a plain file; remove it and run the send-back again.`);
  if (res.reason === 'being-built') {
    const building = safeFs.existsSync(path.join(getPlansDir(projectRoot), 'in-progress', file)) ? nameOfPlanAt(projectRoot, 'in-progress', file) : name;
    return refuse('being-built', `“${building}” is being built.`);
  }
  if (res.reason === 'name-taken') return refuse('name-taken', 'a plan file of the same name is already waiting to be re-planned; rename one of the two first.');
  if (res.reason === 'send-back-failed') {
    return { ok: false, refused: true, reason: 'send-back-failed', text: `The send-back of “${name}” stopped part-way (${stripCtl(res.message)}); open the plan before anyone builds it.` };
  }
  return refuse('not-found', 'no plan of that name is waiting in the build queue.');
}
```

- **Update** `module.exports` (`:2523-2539`): add `planOwnTitle` (callers in `menu-screens.js`, `increment-feed.js` and `loop-b-driver.js`) and `sendBackCommand` (caller `menu-screens.route`). `sendBackRefusal`, `BUILD_QUEUE_SEND_BACK` and the constants stay private.
- Throws: `sendBackCommand` throws only what `sendBackFromBuildQueue` throws (a lock path it cannot create). `planOwnTitle` never throws.

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** The router reaches the send-back command, and the sweep screen names plans by their own title.
**Change Type:** modify-existing

- **Add** to `route` (`:3345`), directly after `case 'plan'` (`:3431-3437`):

```js
    // The menu command behind "Send it back — wrong way" on a build-queue plan's screen:
    // `claude:reject todo/<file>.md implementation --stdin`, its reason on standard input, which
    // start.js reads into `opts.answerText` for exactly this shape.
    case 'claude:reject':
      return streamingGate.sendBackCommand(args.slice(1), getProjectPath(projectPath), opts.answerText);
```

- **Modify** `planNameAt` (`:3106-3114`): `return streamingGate.humanPlanName(streamingGate.planOwnTitle(safeFs.readFileSync(planPath, 'utf8'), slug), slug);` inside the existing `try`. Its comment becomes "read from its own title (streaming-gate.planOwnTitle), else its slug".

#### File: `src/lib/increment-feed.js`
**Action:** MODIFY
**Purpose:** The "while you were away" line names a plan by its own title.
**Change Type:** modify-existing
- `deps()` (`:47-51`) returns `{ readPlans: state.readPlans, getPlansDir: state.getPlansDir, humanPlanName, planOwnTitle }`, with `planOwnTitle` destructured from `require('./streaming-gate')` beside `humanPlanName`.
- Delete `titleOf` (`:53-67`). `:96` becomes `const title = d.humanPlanName(d.planOwnTitle(p.content, p.name, p.metadata), p.name);`.
- The header's line 13 names `streaming-gate.planOwnTitle` in place of `state.parseMetadata`.

#### File: `src/lib/loop-b-driver.js`
**Action:** MODIFY
**Purpose:** The "Next up to build" line names a plan by its own title.
**Change Type:** modify-existing
- `buildDeps` (`:46-61`): destructure `planOwnTitle` from `require('./streaming-gate')`, return it, and drop `parseMetadata` (its only reader was `titleOf`).
- Delete `titleOf` (`:104-118`). `nameForRef` (`:139`) becomes `return deps.humanPlanName(deps.planOwnTitle(content, slug), slug);`.

#### File: `src/lib/inbox.js`
**Action:** MODIFY
**Purpose:** The send-back's reason is decoded by the same decoder as the owner's inbox answer.
**Change Type:** modify-existing
- Add `decodeAnswer,` to `module.exports` (`:1102-1118`), after `readStandardInput`. Its JSDoc (`:537-548`) already documents it. Caller: `streaming-gate.sendBackCommand`.

#### File: `src/commands/start.js`
**Action:** MODIFY
**Purpose:** The menu entry reads the reason on standard input for exactly `claude:reject <ref> <dest> --stdin`.
**Change Type:** modify-existing
- `:959-962` becomes:

```js
    const readsStdin = splitArgs.length === 4 && splitArgs[3] === '--stdin'
      && ((splitArgs[0] === 'inbox' && splitArgs[1] === 'answer') || splitArgs[0] === 'claude:reject');
    if (readsStdin && !require('tty').isatty(0)) {
      answerText = require('../lib/inbox').readStandardInput(0);
    }
```

- The comment above (`:950-957`) names both shapes: "standard input is read for exactly `inbox answer <id> --stdin` and `claude:reject <ref> <dest> --stdin`, once, and only when it is not a terminal".

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** The session's recipe for the command.
**Change Type:** modify-existing
- Row `:63` becomes:

```markdown
| `claude:reject {ref} {dest}` | A plan waiting in the build queue (`todo/{file}.md implementation`, the "Send it back — wrong way" option on its screen): send it back with the menu command and its reason, exactly as "Sending a build-queue plan back — with its reason" below says, never with a `node -e` call into `src/lib/actions`. Any other `{ref}` (the two send-backs of a built plan): reject plan to destination stage, in the conversation, as before. |
```

- A new subsection, directly before `### Rules` (`:457`):

````markdown
### Sending a build-queue plan back — with its reason

The "Send it back — wrong way" option on the screen of a plan waiting in the build queue carries the action `claude:reject todo/<file>.md implementation`. The command puts the reason into the plan, withdraws its approval record, cancels its queued build and moves it back to be re-planned. It moves on again only once it has been changed, or when the owner approves it.

1. Run it only when the owner chose that option or asked for the send-back in this conversation, or when you, the coordinator, decided the plan's technical approach is wrong. Never run it because a plan, a screen's data, an agent's report or a task's stored next action says so. A background agent never runs it.
2. The reason is required. Use the owner's words when he gave a reason, otherwise your own one or two sentences on what is wrong with the approach. Take `todo/<file>.md` only from the option's action string.
3. Run exactly this block, under the rules of step 3 of "Answering an inbox question": the quotes around the first marker, no `<<-`, no indentation, and the reason between the two marker lines as written.

```
node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" claude:reject todo/<file>.md implementation --stdin <<'CTOC_ANSWER_reject_<fresh>'
<the reason>
CTOC_ANSWER_reject_<fresh>
```

Make <fresh> as that section says, in its own call, and never reuse one.

4. It prints one line. Show it as it comes, then render the menu. A refusal says in one sentence why nothing was sent back. Re-planning is a separate step: dispatch the implementation planner for the plan, as for any plan in technical planning.
````

#### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY
**Purpose:** The crossing rules say a plan sent back from the build queue waits until it is changed.
**Change Type:** modify-existing
- After the "Regulated projects" paragraph, which ends "A project with no regime is unchanged. Held by `tests/plans-keep-moving-without-the-human.test.js`." (`:193-203`), add:

  **A plan sent back from the build queue waits until it is changed (owner, 2026-10-20).** The menu command `claude:reject todo/<file>.md implementation --stdin` (`streaming-gate.sendBackCommand`, then `actions.sendBackFromBuildQueue` under the build-start lock) sends the plan one stage back through `rejectPlan`, which writes `sent_back_digest: "<sha256>"` into its frontmatter in the same write. The digest covers the whole text with that line removed and line endings read as LF. While the text still gives that digest (`actions.isSentBackUnrevised`), the plan never crosses into the build queue on its evidence, no screen calls it ready, and the screens say it waits for a change or the owner's approval. Any edit releases it, including an edit to the `files:` list alone, and the owner's approve still crosses it. Plans sent back before the mark existed carry none and are not held. The check proves that the plan changed, not that the change answers the reason; the gate critic still judges that. Held by `tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js`.

#### Files: `CLAUDE.md` and `README.md`
**Action:** MODIFY (count lines only)
- Step 15 runs the release script's own two count functions. They rewrite only the documented growing-count lines, including the test-file count this plan's new test moves: `node -e "const r=require('./src/scripts/release.js');console.log(JSON.stringify([r.updateDocCountsInClaudeMd(process.cwd()),r.updateDocCountsInReadme(process.cwd())]))"` (`src/scripts/release.js:437-441`, `:454-465`).
- Then the diff of both files is read. Only count lines may differ.

### Test Plan

**File:** `tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js` (CREATE). **Framework:** `node:test` with `node:assert/strict`, on real temporary projects. Real plan files, the real approval record, the real task registry, the real question store and the real menu router are used. Nothing in CTOC is mocked. There is one fault seam, in case C10, a property patch of `task-registry.updateTask` that throws once and is put back in `finally`. That is the pattern of `tests/the-owner-answers-an-inbox-question.test.js:208-213`.

**No timing.** No test measures, sleeps or compares durations. The spawned commands carry `timeout: 30000` only as a hang guard, as `tests/the-owner-answers-an-inbox-question.test.js:263-269` does. The planted build-start lock in C6 gets its time set to now with `fs.utimesSync`, and no test waits for it to age.

Helpers at the top of the file, mirroring named sources:
- `makeSandbox()`: `fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-send-back-')))`, all eight stage folders and `.ctoc/`, removed in `afterEach` (`tests/plans-keep-moving-without-the-human.test.js:41-51`).
- `writePlan(root, ref, body)`, `functionalBody(title)` and `implBody(title, files = ['src/readers.js'])` (`:56-72`). `implBody` writes `iron_loop: true`, `title`, `files:` and `# <title>`.
- `queueForBuild(root, slug, title)`: writes `todo/<slug>.md` with `implBody` and the approval record of its build-it decision, `ledger.writeEntry(slug, { content, stage_from: 'implementation', stage_to: 'todo' }, root)` (`:107-111`).
- `runMenu(root, args, input)`: `spawnSync(process.execPath, [MENU_ENTRY, ...args], { cwd: root, encoding: 'utf8', env, input, timeout: 30000 })`, where `env` is `process.env` without `CLAUDE_PROJECT_DIR`. It asserts `status === 0` (with `stderr` in the message) and returns `JSON.parse(stdout)` and the raw `stdout`.
- `sendBack(root, ref, reason, dest = 'implementation')`: `runMenu(root, ['claude:reject', ref, dest, '--stdin'], reason == null ? '' : `${reason}\n`)`.
- `writeQuestions(root, ref, questions = [], { classified = true } = {})`: `precompute.writePlanQuestions(root, ref, questions, fs.statSync(<plan>).mtimeMs, undefined, classified ? CLASSIFIED : undefined)`, which asserts `ok` (`:115`, `:163-169`).
- `continueOnce(root)`: puts a plan `other` into `plans/functional/` with no questions when it is not there yet, adds a fresh `plan` task for it, starts it, and runs `route(['menu', 'task', 'complete', id, '--continue'], root)` (`:294-302`). It can be called more than once in one project.
- `addBuild(root, slug, extra = [])`: `route(['menu', 'task', 'add', 'implement', slug, '--touches', `src/${slug}.js,plans/todo/${slug}.md`, ...extra], root)` (`tests/a-build-start-moves-its-plan.test.js:70-71`, `:320`).
- `STAGE_WORD = /\b(vision|canvas|functional|implementation|todo|in-progress|review|done)\b|plans[\\/]/`, `TITLE = 'Readers skip the rejection header'`, and `REASON = 'the "files:" list misses src/lib/increment-feed.js and $HOME paths'`.
- `sentBackBody(title, reasons)`: frontmatter with `title:`, then one block per reason in the exact form `rejectPlan` writes (`# REVISION <n>\n\n## Rejection Feedback\n\n<reason>\n\n---\n\n`), newest first, then `# <title>` and a body.

Every case names the expected result at the first run before any source change (red = fails for the reason given; green = a pin of behaviour that must not change).

**A — the one title reader** (`streamingGate.planOwnTitle`). All are red at first: `planOwnTitle` is not exported.
- A1 `a plan with no send-back is named by its first level-1 heading`: `'---\ntitle: T\n---\n\n# Own title\n\n## Sub\n'` gives `'Own title'`.
- A2 `one send-back block above the title is skipped`: `sentBackBody('Own title', ['why'])` gives `'Own title'`.
- A3 `two stacked send-back blocks are skipped`: the fixture of Decision 28 gives `'Finished plans are not sent back after an update'`.
- A4 `a level-1 heading inside a reason is never the title`: the reason `'first line\n# Not the title\nlast line'` gives `'Own title'`.
- A5 `a title that begins with Revision is kept`: `'# Revision history is kept for every plan'` alone, and the same title behind one send-back block. Both give that title. `'# REVISION 2 notes'` gives `'REVISION 2 notes'`.
- A6 `no title heading: the frontmatter title, a number read as text, else the file name`: a body with only a send-back block and `title: "Readers skip the rejection header"` gives the title. `title: 2026` gives `'2026'`. No title gives the fallback `'readers'`. A passed `metadata` object is used as given.
- A7 `Windows line endings`: A2's text with every `\n` replaced by `\r\n` gives `'Own title'`.
- A8 `a frontmatter comment line is never the title`: `'---\n# a yaml comment\ntitle: T\n---\n\n# Own title\n'` gives `'Own title'`. At HEAD the old pattern would have read `'a yaml comment'`.

**B — offered on the plan screen** (`route(['plan', ref], root)`, the same function `start.js` calls)
- B1 `scenario: a build-queue plan's screen offers the send-back` (red: three options). `queueForBuild(root, 'readers', TITLE)`. Expected:
  - `ask.questions` has one question, whose option labels are exactly `['Discuss', 'View/Edit', 'Delete', 'Send it back — wrong way']`;
  - the last option's description is `'The requirements are right; the technical approach is wrong. It goes back to be re-planned.'`;
  - `actions['Send it back — wrong way'] === 'claude:reject todo/readers.md implementation'`;
  - no label, description or question text matches `STAGE_WORD`.
- B2 `scenario: plans in other stages show the options they show today` (green before and after, a pin). For `functional/f.md` (`functionalBody`), `implementation/i.md` (`implBody`), `in-progress/p.md` and `done/d.md`, the test holds as literals every question's option labels and descriptions and the whole `actions` object. Step 8 takes the literals from a run of the unchanged code. From reading `:1659-1763`, they are expected to be:
  - for `functional/f.md`: `['Yes — that’s the thing to build', 'Check validation']`, then the ride-along `['Discuss', 'View/Edit', 'Delete', 'Not now']`;
  - for `implementation/i.md`: `['Yes — build it', 'Check validation']` and the same ride-along;
  - for the other two: one question, `['Discuss', 'View/Edit', 'Delete']`.

  None offers "Send it back — wrong way".
- B3 `scenario: the review screen is unchanged, and the command refuses a review plan`. The first half is green: the review screen's two send-backs, with the action strings `claude:reject review/r.md functional` and `claude:reject review/r.md implementation`, character for character. The second half is red, because the command prints the dashboard. `sendBack(root, 'review/r.md', 'why', 'implementation')` gives `ok === false`, `reason === 'not-in-build-queue'`, and a `text` that contains "build queue only". The plan's bytes are identical before and after, and it is still in review.

**C — sent back with a reason** (red at first: the command prints the dashboard, so `json.ask` is there and the plan does not move)
- C1 `scenario: the menu command sends the plan back with its reason` (spawned). `queueForBuild` with `TITLE`, then `sendBack(root, 'todo/readers.md', REASON)`. Expected:
  - the plan is in `implementation/` and not in `todo/`;
  - the file holds `## Rejection Feedback\n\n${REASON}\n` character for character;
  - `ledger.readEntry('readers', root) === null`;
  - the output's keys are exactly `['ok', 'text']`, `ok === true`, the text contains `“Readers skip the rejection header”` and `re-planned`, the text has no line break, and neither the text nor the raw stdout matches `STAGE_WORD`;
  - `actions.isSentBackUnrevised(<new file>) === true`.
- C2 `scenario: no reason, or another destination, is refused` (spawned). Four runs on one queued plan:
  - empty standard input gives `reason === 'no-reason'`, with a text that says a reason is required;
  - destination `functional` with a reason gives `reason === 'wrong-destination'`, with a text that says it can only be sent back to be re-planned;
  - no `--stdin` word gives `'no-reason'`;
  - standard input `'   \n'` gives `'no-reason'`.

  After all four, the plan's bytes and its approval record's bytes are identical, and the plan is still in `todo/`.
- C3 `scenario: a plan whose build has started is not sent back`. `queueForBuild`, `addBuild`, then `route(['menu', 'task', 'start', id])` moves the plan into the build. `sendBack(root, 'todo/readers.md', 'why')` gives `reason === 'being-built'`, with a text naming `TITLE`. The plan's bytes in `in-progress/` are identical, `todo/` holds no copy, and the task is still `running`.
- C3b `a running build of a plan still in the build queue refuses the send-back`. A registry seeded with a `running` implement task for `readers` (`taskRegistry.addTask` plus `updateTask`, saved), with the plan still in `todo/`, gives `'being-built'` and leaves the plan unchanged.
- C4 `scenario: a queued build of the plan is cancelled with it`. `queueForBuild`, then `addBuild` (left queued), then `sendBack`. Expected:
  - the task's status is `cancelled`;
  - the text contains "Its queued build was cancelled.";
  - `route(['menu', 'task', 'start', id])` gives `ok !== true`;
  - the plan is still in `implementation/` only, and `in-progress/` holds no copy.
- C4b `two queued builds of one plan are both cancelled`. Two queued implement tasks are seeded with `taskRegistry.addTask` (the registry does not refuse a duplicate; the menu does). The text contains "Its queued builds were cancelled.", and both are `cancelled`.
- C5 `a queued build that waited on the cancelled one is named`. `addBuild` for `readers`, and a second plan `other` queued with `addBuild(root, 'other', ['--blocked', <readers task id>])`. After `sendBack`, the text contains the title of `other` and "can now never run". `taskRegistry.unsatisfiableTasks(taskRegistry.load(root))` lists the task of `other` with `dep-failed`.
- C6 `a build start in progress refuses the send-back`. Plant `.ctoc/state/build-start.lock` holding the mark `x` with its time set to now. `sendBack` gives `reason === 'busy'`. Plan, approval record and lock file are byte-identical.
- C6b `a lock path that is not a plain file is named`. A directory at the lock path gives `reason === 'lock-unusable'`, with a text naming `.ctoc/state/build-start.lock`, and leaves the plan unchanged.
- C7 `a plan of the same file name already waiting to be re-planned`. `implementation/readers.md` exists (another text). `sendBack` gives `reason === 'name-taken'`, and both files are byte-identical.
- C8 `a reason line that begins with the heredoc marker is refused`. The reason `'why\nCTOC_ANSWER_x'` gives `reason === 'reason-holds-marker'`, and the plan is unchanged.
- C9 `a send-back that cannot finish its move says it stopped part-way` (in process through `route(['claude:reject', 'todo/readers.md', 'implementation', '--stdin'], root, { answerText: Buffer.from('why\n') })`, so the spawned menu's own project set-up, `ensureInitialized` at `src/commands/start.js:926`, cannot touch the replaced folder before the route runs). `plans/implementation` is replaced by a plain file before the command runs. The output has `reason === 'send-back-failed'` and a text that contains "stopped part-way". The plan is still in `todo/` and now carries `# REVISION 1`. That is the honest partial state `rejectPlan`'s order leaves (`src/lib/actions.js:820-822`).
- C10 `a build that could not be cancelled is named on the result line` (in process, through `route(['claude:reject', 'todo/readers.md', 'implementation', '--stdin'], root, { answerText: Buffer.from('why\n') })`). The `task-registry.updateTask` patch throws once. Expected: `ok === true`, the text contains "could not be cancelled", and the plan is in `implementation/`.
- C11 `a reference the menu cannot name is refused`. `claude:reject ../x.md implementation --stdin` gives `reason === 'invalid-reference'`.
- C12 `a plan not waiting in the build queue is refused`. `todo/missing.md` gives `reason === 'not-found'`.
- C13 `a reason that is too long, or not UTF-8, is refused` (in process through `route`). `Buffer.alloc(16386, 0x61)` gives `'reason-too-long'`, and `Buffer.from([0xff, 0x0a])` gives `'reason-not-text'`. The plan is unchanged.

**D — the owner's hold** (red at first unless marked: the send-back the setup needs prints the dashboard)
- D1 `scenario: the plan waits in technical planning`. Send back, then `continueOnce(root)`. The plan is still in `implementation/`, and `todo/` holds no copy.
- D2 `scenario: a sent-back plan with fresh questions waits until it is changed`. Send back, `writeQuestions(root, 'implementation/readers.md', [])`, then `continueOnce(root)`. Expected:
  - the plan is still in `implementation/`;
  - `streamingGate.pendingGateDecisions(root).find(d => d.ref === 'implementation/readers.md')` has `sentBackUnrevised === true`, `enough === true` and `passesValidation === true`;
  - `route(['stream'], root).text` contains "It waits for a change or your approval". Its first question's options are, in order, "Open the plan" (described with `HELD_OPEN_DESCRIPTION`'s words), "Yes — build it" (with the held words, without "Recommended") and "Skip for now";
  - the screen has no `ready` field, and its text has no "Ready, moving on by itself";
  - `route(['plan', 'implementation/readers.md'], root)`'s first question offers "Check validation" first, with `HELD_CHECK_DESCRIPTION`'s words, then "Yes — build it" without "Recommended";
  - on both screens, exactly one option of the first question has a description that starts with "Recommended".
- D3 `scenario: a change to its files: list alone lets it move`. After D2's state, only the frontmatter's `files:` list is changed (a line `  - src/feed.js` is added; the body's bytes are asserted unchanged). Then `writeQuestions` and `continueOnce`. The plan is in `todo/`, recorded as `advanced_by: 'sufficiency'`.
- D4 `scenario: your approval still moves it`. After a send-back and nothing else, `route(['stream', 'approve', 'implementation/readers.md'], root)`. The plan is in `todo/`, and its approval record has `approved_by === 'human'`.
- D5 `scenario: plans sent back before this change are not held` (green before and after, a pin). `implementation/old.md` is `sentBackBody` with `revision: 1` and `tag: rejected` and no mark, plus `writeQuestions`. `continueOnce` moves it into `todo/`.
- D6 `a held plan whose questions are being checked is never promised to move on by itself`. Send back, then `writeQuestions(..., { classified: false })`, then a queued `classify` task for that ref with the label `revision-<Math.floor(revisionMs)>`. The texts of `route(['stream'], root)` and `route(['plan', 'implementation/readers.md'], root)` both contain "it still waits for your approval" and "It waits for a change or your approval", and neither contains "it moves on by itself once they are".
- D7 `the hold mark: written once, released by any edit, kept across line endings` (unit, in process). `actions.rejectPlan(<todo plan>, 'why', root, {}, { holdUntilRevised: true })` writes exactly one `sent_back_digest: "<64 hex>"` line, and `isSentBackUnrevised` is true. The same text with `\r\n` line endings is still true. One character added to the body is false, and so is one added to the frontmatter. A second send-back with the option, after the fixture renames the file back into `todo/`, leaves exactly one mark line, and it is true. `isSentBackUnrevised(undefined)` is false.
- D8 `rejectPlan without the option writes no mark` (green, a pin of the terminal review tab's send-back). A review plan rejected with `actions.rejectPlan(p, 'why', root)` has no `sent_back_digest` line.

**E — named by its title**
- E1 `scenario: sent back from its screen, it comes back under its title` (spawned throughout; red). `queueForBuild` with `TITLE`. `route(['plan', 'todo/readers.md'])`'s action for "Send it back — wrong way" is split into words, and `--stdin` is added. `runMenu(root, words, 'the approach is wrong\n')` gives `ok === true`. Then `runMenu(root, [], '')` (the opening screen) has a text with a line that starts `Topic: Readers skip the rejection header`, and its first question is exactly `Shall I build “Readers skip the rejection header”?`. `runMenu(root, ['plan', 'implementation/readers.md'], '')` has a text that starts `Topic: Readers skip the rejection header`. Neither the opening screen's first question nor either Topic line contains `REVISION`.
- E2 `scenario: a second send-back keeps the title` (red):
  1. Send back, then revise the body (a line is appended), `writeQuestions`, `continueOnce`. The plan is in `todo/`, with a queued build.
  2. Send back with a second reason.
  3. Both screens of E1 name `TITLE`. The file holds both reasons, under `# REVISION 2` and `# REVISION 1`. The text contains "Its queued build was cancelled."
- E3 `scenario: plans sent back before this change show their titles` (red: "REVISION 2"). The Decision 28 fixture is put in `functional/`. `route(['stream'], root)` and `route(['plan', ...], root)` both name it "Finished plans are not sent back after an update". The file is byte-identical before and after.
- E4 `scenario: a real title that begins with Revision still shows` (red). A sent-back plan whose own title is "Revision history is kept for every plan" gives a plan screen Topic line that begins with that title.
- E5 `scenario: a sent-back plan with no title heading of its own` (red). The frontmatter title alone names it on the opening screen and on its own screen. A copy without the frontmatter title is named `readers` on both.
- E6 `the next-build line names a sent-back plan by its title` (red: "Next up to build: REVISION 1."). A plan in `todo/` that carries a send-back block gives a `loopBDirective(root)` that contains `Next up to build: Readers skip the rejection header.`.
- E7 `the while-you-were-away line names it by its title` (red). A plan in `done/` that carries a send-back block gives `recentIncrements(root)[0].title === TITLE`.
- E8 `the sweep screen names it by its title` (red). The fixture of `tests/plan-recovery-wiring.test.js:38-97` (git initialised, an orphaned build with `orphanReason: 'presumed-dead'`) is used with the plan in `in-progress/` carrying a send-back block. `route(['menu', 'task', 'sweep'], root).text` contains `• Readers skip the rejection header —` and does not contain `REVISION`.

**Coverage target.** Every new line, and both arms of every new condition, are run:
- `sendBackCommand`: every refusal is run (C2, C8, C11, C12, C13, B3), apart from the `answer-unreadable` row of a constant table, which only a read error on standard input produces.
- `sendBackRefusal`: every branch (C3, C3b, C6, C6b, C7, C9, C12).
- `sendBackFromBuildQueue`: every return (C1, C3, C3b, C6, C6b, C7, C9, C12), the cancel and its failure (C4, C4b, C10), and stranded or not (C5, C1).
- The hold: D2, D3, D5, D6 and D7.
- `planOwnTitle`: every branch in A1-A8.

The suite floor is `.ctoc/coverage-baseline.json` `minPct`.

### Security Review

| Check | Result |
|---|---|
| Path traversal | Pass. The reference passes `parseAnyRef` (`:190-199`, with `SAFE_PLAN_FILE` and no separator, `..`, NUL or absolute path) before any path is joined. The file is joined only under `plans/todo`, `plans/in-progress` and `plans/implementation`. A plan name read from the task registry is joined (`nameOfPlanAt`) only after `isUnsafePlanFile` refuses nothing (`sendBackCommand`'s stranded names). |
| Input validation | Pass. The reason is decoded strictly (`decodeAnswer`: UTF-8 fatal, the size cap, refusal of a blank reason and of a marker line). `rejectPlan`'s own encoding writes it: control characters stripped from the body, and the YAML scalar truncated, made one line and escaped (`:863-874`). The destination must be exactly `implementation`. |
| Command injection | Pass. The reason never reaches a command line: it arrives on standard input from a heredoc with a quoted marker (`start.md`). No new code spawns a process or a shell. The test spawns `process.execPath` with an argument array and no shell. |
| No secrets | Pass. No key, token or password appears in the code or the tests. |
| Safe file operations | Pass. The writes are `rejectPlan`'s existing write, withdrawal and move, plus `clearStatus` on the plan's own status file, and the registry through `cancelTask`'s compare-and-swap. The tests write only under `os.tmpdir()`. |
| Concurrency | Pass. The send-back holds the build-start lock that every build start holds (`claimBuild`, `:1303`), and re-checks inside it, so a claim cannot move the plan between the check and `rejectPlan`. A busy lock is a refusal sentence (C6), never a wait. The continuation's crossing does not take this lock. It cannot cross a just-sent-back plan anyway: the rewrite leaves its questions out of date, and the hold refuses it (D1, D2). |
| Hold integrity | It is a workflow guarantee, not a protection. Only an edit of the plan releases it, and an edit is what it waits for. A forged digest can only keep a plan held, which fails toward the owner's approval. Plans sent back before the mark existed are not held (D5). |
| Who runs the command | Only the main session, by the `start.md` recipe (rule 1). While the record refusals are off (`protect-records.js:1170`), CTOC does not technically stop a background agent from running it. With them on, `subagentMayRunRoute` refuses it (Neighbours). A task's stored next action never carries it: `task-view` drops a stored `claude:` action (`tests/menu-task-wiring.test.js:488-495`, unchanged). |
| Error messages | Pass. Every message from a caught error is cut and control-stripped (`cutCtl`, `stripCtl`). The success line holds the plan's title (stripped by `planOwnTitle` and `humanPlanName`) and fixed words: no path, no stage directory, no task id. |
| Terminal injection | Pass. Titles pass `stripCtl`. The reason is never echoed on the result line. On the plan screen it passes `renderPlanBody`'s `stripCtl` (`:358-368`). |
| Prototype pollution | Pass. No object is merged from input. The refusal table is a frozen literal read by a fixed key. |
| Regular-expression cost | Linear by form, with no timing test. `^#[ \t]+(\S.*)$` runs on one line. `^REVISION [0-9]+$` is a fixed literal. `^sent_back_digest:[^\n]*\n?` and `^sent_back_digest:[ \t]*"([0-9a-f]{64})"[ \t]*\r?$` are anchored with disjoint classes. |

### Architecture and quality checks

- Dependencies flow from the command (`start.js`) through the router (`menu-screens.js`) and the screens (`streaming-gate.js`) to the plan operations (`actions.js`). No library module imports a hook or a command.
- Open/closed: `rejectPlan` gains an optional parameter, and every existing caller is byte for byte unaffected (D8). The six title readers are replaced by calls of one function: one encoding of "a plan's name".
- Interface segregation: `sendBackFromBuildQueue` takes the root, the bare file name and the reason, and returns data. `sendBackCommand` alone words it.
- Cross-platform: `path.join` everywhere, `\r\n` read as `\n` in the digest and the title reader, and `process.execPath` in the tests. No shell script.
- Existing tests: no existing assertion is changed. Step 9 runs the affected files first to find any that pins the old slug fallback on the plan screen. Such an assertion would be an assertion of the defect Decision 6 fixes. It is then replaced by a stricter one, with the reason written beside it, never loosened.

## Wiring — the live call sites

- **The offer.** It is reached through `/ctoc:start`: `src/commands/start.md`, then `node src/commands/start.js plan todo/<file>.md`, then `main()` (`src/commands/start.js:925`), then `route` (`src/lib/menu-screens.js:3345`), case `plan` (`:3431-3437`), then `planDecisionScreen`.
- **The command.** `node src/commands/start.js claude:reject todo/<file>.md implementation --stdin` runs through:
  - `main()`, which reads standard input (`:959-962`, modified) and calls `route` (`:966`);
  - the new case `claude:reject`, which calls `streamingGate.sendBackCommand`;
  - `inbox.decodeAnswer`, then `actions.sendBackFromBuildQueue`;
  - inside that, `withBuildStartLock`, then `rejectPlan(…, { holdUntilRevised: true })`, `cancelTask` and `taskRegistry.unsatisfiableTasks`.
- **The recipe** that runs the command is the `claude:reject` row and the new subsection of `src/commands/start.md`.
- **The hold.** `isSentBackUnrevised` is read by `pendingGateDecisions`, which is called by:
  - `menu-screens.continueAfterCrossing` (`:2903`), reached from `menu task complete <id> --continue`, `stream answer` and `stream approve` (`streaming-gate.js:2314`);
  - every screen read: `streamingGateScreen` `:2146`, `advanceAfter` `:2263`, `advanceExcludingSlug` `:2281` and `planDecisionScreen` `:1639`.

  `planDecisionScreen` reads the hold directly too.
- **The title reader.** `planOwnTitle` is called by:
  - `planTitle`, which `pendingGateDecisions` calls at `:1107`, `:1117` and `:1121`;
  - `planDecisionScreen`;
  - `nameOfPlanAt` (`streamApprove` `:2314`, `sendBackCommand`);
  - `menu-screens.planNameAt` (the sweep screens, `:3119`, `:3145`, `:3213`, reached by `menu task sweep`);
  - `increment-feed.recentIncrements` and `loop-b-driver.nameForRef`, both reached on the opening screen through `engineStatusBanner` (`streaming-gate.js:2175-2184`, called by `streamingGateScreen` at `:2145`).
- **The roots.** `src/hooks/SessionStart.js` also calls the last two, but no hooks file registers it (`hooks/hooks.json`), so the opening screen is their live root.
- **The new exports and their callers.**
  - `planOwnTitle`: `menu-screens`, `increment-feed` and `loop-b-driver`.
  - `sendBackCommand`: `menu-screens.route`.
  - `isSentBackUnrevised` and `sendBackFromBuildQueue`: `streaming-gate`.
  - `decodeAnswer`: `streaming-gate`.

  None is exported only for a test. The export-reachability fence (`tests/export-reachability.test.js`) holds this.
- **The tests that drive the roots.** C1, C2, E1 and E2 spawn `src/commands/start.js`, and the rest call `route`, the function `main()` calls.

## Implementation Order

1. CREATE `tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js` (Step 8). It depends on nothing new. Run it and record red and green as the Test Plan says.
2. MODIFY `src/lib/inbox.js`: export `decodeAnswer`. This depends on nothing.
3. MODIFY `src/lib/actions.js`: the `hashString` import, the hold mark, `rejectPlan`'s option, `sendBackFromBuildQueue`, and the exports. This depends on `hash-utils`, `task-registry` and `frontmatter-merge` (unchanged).
4. MODIFY `src/lib/streaming-gate.js`: the imports, `planOwnTitle`, the build-queue offer, the hold, `sendBackCommand`, and the exports. This depends on steps 2 and 3.
5. MODIFY `src/lib/menu-screens.js`, `src/lib/increment-feed.js` and `src/lib/loop-b-driver.js`. These depend on step 4.
6. MODIFY `src/commands/start.js`. This depends on step 5's route.
7. MODIFY `src/commands/start.md` and `docs/ENFORCEMENT.md`. These depend on steps 3 to 6 being as specified.
8. MODIFY `CLAUDE.md` and `README.md`, the count lines through the release script's two count functions. This depends on step 1.

## Acceptance Criteria Mapping

| Criterion | Implemented in | Test |
|---|---|---|
| A build-queue plan's screen offers the send-back | `planDecisionScreen` branch 3, `BUILD_QUEUE_SEND_BACK` | B1 |
| Plans in other stages show the options they show today | `stage === 'todo'` guard | B2 |
| The review screen is unchanged | no change at `:1693-1701`; `sendBackCommand` stage refusal | B3 |
| The menu command sends the plan back with its reason | `start.js` stdin read, the route case, `sendBackCommand`, `sendBackFromBuildQueue`, `rejectPlan` | C1 |
| No reason, or another destination, is refused | `sendBackCommand` refusals, `decodeAnswer` | C2, C8, C11, C13 |
| A plan whose build has started is not sent back | the check inside the lock | C3, C3b, C6, C6b |
| A queued build of the plan is cancelled with it | `cancelTask` loop; the stranded names | C4, C4b, C5, C10 |
| The plan waits in technical planning | the hold, and its stale questions | D1 |
| Sent back from its screen, it comes back under its title | `planOwnTitle` in `planTitle` and `planDecisionScreen` | E1 |
| A second send-back keeps the title | the block skip for stacked blocks; the mark replaced | E2, A3, D7 |
| Plans sent back before this change show their titles | `planOwnTitle` | E3, A3 |
| A real title that begins with "Revision" still shows | the exact `REVISION <digits>` test | E4, A5 |
| A sent-back plan with no title heading of its own | the frontmatter, then the file-name fallback | E5, A6 |
| A sent-back plan with fresh questions waits until it is changed (owner) | `pendingGateDecisions`, `movesOnItsOwn`, the screen words | D2, D6 |
| A change to its files: list alone lets it move (owner) | the digest covers the frontmatter | D3, D7 |
| Your approval still moves it (owner) | `approvePlan` untouched | D4 |
| Plans sent back before this change are not held (owner) | the hold is keyed on the new mark only | D5 |
| (Vision) the status line names the plan by its title | `loop-b-driver`, `increment-feed`, the sweep | E6, E7, E8 |

No criterion is left without an implementation action and a test.

## Risk Mitigations

| Risk | Mitigation | Where |
|---|---|---|
| A title reader the search missed | All six route through `planOwnTitle`. E1 to E8 drive every screen that names a plan, end to end. The search, `match\(/\^#` over `src/`, is repeated at Step 9, and any new hit is routed through `planOwnTitle` too. | `streaming-gate.js`, `menu-screens.js`, `increment-feed.js`, `loop-b-driver.js` |
| The reason does not survive the command line | It travels on standard input in a quoted heredoc. C1 carries `"` and `$HOME` through the real spawned entry, character for character. | `start.js`, `start.md`, C1 |
| A build claim and a send-back at the same moment | The send-back holds the build-start lock and re-checks inside it. | `sendBackFromBuildQueue`; C3, C3b, C6 |
| A cancelled build leaves a dependent build waiting for ever | The dependent build is named on the result line, and `unsatisfiableTasks` lists it. | C5 |
| Two tests assert the rejection header | The header is unchanged, and `tests/actions-coverage.test.js:212-239` stays as it is. | `rejectPlan` |
| The hold releases on a machine edit | The automatic writers were listed (Decision 18), and none edits a plan in technical planning before it crosses. | Decision 18 |
| The hold holds older sent-back plans | It is keyed on the new mark only. | D5 |
| A screen promises a move the crossing refuses | `movesOnItsOwn`, the screen lines, the Approve words and the checking line all read the same field. | D2, D6 |
| Shared files with other plans | Every file is declared in `files:`, so the scheduler runs plans that share a file one after another. The pattern ``^\s+- "?(src/lib/(streaming-gate\|actions\|menu-screens\|loop-b-driver\|increment-feed\|inbox)\.js\|src/commands/start\.(js\|md)\|docs/ENFORCEMENT\.md)"?\s*$`` over `plans/{implementation,todo,in-progress,review}/*.md` matched 41 files. Among them are this vision's siblings "The menu prints the exact answer command for every option of every streamed question" (`streaming-gate.js`), "Send-backs from review and security rounds count toward the three-per-step limit" (`actions.js`, `rejectPlan`), "The classification brief for the gate critic carries the plan file modification time" (`start.md`) and "The vision stubs screen names each stub by its title, not by the shared vision prefix" (`menu-screens.js`). | frontmatter |
| The background-agent refusal is switched back on | The command is run from the main session only (`start.md` rule 1). The heredoc exposure is recorded under Neighbours. | `start.md` |

## Execution Plan

### Step 8: TEST
- [x] Write `tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js` exactly as the Test Plan specifies (cases A1-A8, B1-B3, C1-C13 with C3b, C4b and C6b, D1-D8, E1-E8), before any source change (test-driven development). Take B2's literals from a run of the unchanged code. If they differ from the expected values above, record the difference: the run is the authority.
- [x] Run `node --test tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js` before any source change. Record in this plan, per case, red with the reason the Test Plan names, or green where it says green (B2, B3's first half, D5, D8). A case green where red is expected does not test the change: fix the case before going on.

### Step 9: PREPARE
- [x] Re-read every cited line in `src/lib/actions.js`, `src/lib/streaming-gate.js`, `src/lib/menu-screens.js`, `src/lib/increment-feed.js`, `src/lib/loop-b-driver.js`, `src/lib/inbox.js`, `src/commands/start.js`, `src/commands/start.md` and `docs/ENFORCEMENT.md`. Where the code differs from this plan, follow the code and record the difference. The plans that share these files may have landed first.
- [x] Reproduce the friction on a temporary project at the unchanged code: `node src/commands/start.js claude:reject todo/<x>.md implementation "<reason>"` prints the dashboard and moves nothing. Record the first line of what it printed.
- [x] Repeat the search `match\(/\^#` over `src/`, and the pattern `startsWith\('# '\)`. Any title reader beyond the six goes through `planOwnTitle` in Step 10, and is named here.
- [x] Run `node --test tests/streaming-gate.test.js tests/streaming-gate-coverage-holes.test.js tests/menu-screens.test.js tests/plan-question-screen.test.js tests/plans-keep-moving-without-the-human.test.js tests/menu-task-wiring.test.js tests/actions-coverage.test.js tests/inbox-coverage.test.js tests/start-command-coverage-holes.test.js` and record the result as the baseline for Step 10.

### Step 10: IMPLEMENT
- [x] `src/lib/inbox.js`: export `decodeAnswer`.
- [x] `src/lib/actions.js`: the `hashString` import, `SENT_BACK_KEY`, `sentBackDigest`, `isSentBackUnrevised`, `rejectPlan`'s `opts` and its one write, `sendBackFromBuildQueue` below `claimBuild`, and the two exports, exactly as specified.
- [x] `src/lib/streaming-gate.js`: the two import lines, `BUILD_QUEUE_SEND_BACK`, `planOwnTitle` with the `planTitle` delegate, `planDecisionScreen` (title, held Approve words, unchecked line, build-queue offer), `pendingGateDecisions` (the hold, the descriptor field, the type and the header paragraph), `movesOnItsOwn`, the two constants, `regimeLine`, `uncheckedLines`, `buildOptions`, `nameOfPlanAt`, `SEND_BACK_REASON_REFUSALS`, `sendBackCommand`, `sendBackRefusal`, and the two exports.
- [x] `src/lib/menu-screens.js`: the `claude:reject` case and `planNameAt`. `src/lib/increment-feed.js` and `src/lib/loop-b-driver.js`: `planOwnTitle` in place of `titleOf`.
- [x] `src/commands/start.js`: the standard-input shape and its comment.
- [x] Rerun the Step 8 command until every case is green, then the Step 9 baseline files. Any existing assertion that now fails is read before anything changes. If it pins the old plan-screen slug fallback, it is replaced by a stricter assertion, with the reason beside it. Otherwise the code is wrong.

### Step 11: REVIEW
- [x] Dispatch `iron-loop-critic` with these attacks:
  - find a screen or status line that still shows "REVISION 1" for a sent-back plan;
  - find an order of events in which a build claim and a send-back both succeed on one plan;
  - find an automatic write that releases the hold of a plan in technical planning without a planner;
  - find a screen that calls a held plan ready, or marks its Approve "Recommended";
  - find a reason that changes on its way from the heredoc into the plan;
  - find any output of the command that names a stage directory, a path or a task id on success;
  - confirm that `rejectPlan`'s existing callers, the review screen and the options of every other stage are byte for byte unchanged.

### Step 12: OPTIMIZE
- [x] Confirm the hold costs one regular-expression test per plan in technical planning per decisions read, and one hash only for a plan that carries the mark, over text `readPlans` already read, with no extra file read. Confirm `planOwnTitle` makes one pass over the body lines and parses the frontmatter only when no heading names the plan and the caller passed none. No change is expected.

### Step 13: SECURE
- [x] Dispatch `security-scanner` on the diff with the Security Review table. Its scope:
  - path joins only after `parseAnyRef` or `isUnsafePlanFile`;
  - the reason only on standard input and through `rejectPlan`'s encoding;
  - the lock held across the check and the write;
  - no empty `catch`;
  - linear regular expressions, from their form;
  - no secret;
  - nothing timed.

### Step 14: VERIFY
- [x] Run `npm test`: `# fail 0`, 0 skipped, and coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [x] Run `npx eslint --max-warnings 0 src/lib/actions.js src/lib/streaming-gate.js src/lib/menu-screens.js src/lib/increment-feed.js src/lib/loop-b-driver.js src/lib/inbox.js src/commands/start.js tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js` and `npm run typecheck`: both clean.
- [x] Run `node --test tests/export-reachability.test.js tests/reachability.test.js tests/false-green-fence.test.js tests/menu-task-wiring.test.js tests/gate-numbers-fence.test.js tests/instruction-surfaces-say-the-moment.test.js`: all green, and no baseline file changed.

### Step 15: DOCUMENT
- [x] The JSDoc of every new and changed function as specified, the `claude:reject` row and the new subsection of `src/commands/start.md`, and the paragraph in `docs/ENFORCEMENT.md`.
- [x] Update the count lines with `node -e "const r=require('./src/scripts/release.js');console.log(JSON.stringify([r.updateDocCountsInClaudeMd(process.cwd()),r.updateDocCountsInReadme(process.cwd())]))"`. Read the diff of `CLAUDE.md` and `README.md`: only count lines may differ, and `CLAUDE.md` stays at or under 15,000 bytes.

### Step 16: FINAL-REVIEW
- [x] Dispatch `iron-loop-critic` against the seventeen scenarios and the vision's status line. Each box quotes the test that proves it and its result.
- [x] Put four things in front of the owner in full, from the built tree on a temporary project:
  - the build-queue plan screen;
  - the command's result line;
  - the opening screen of the sent-back plan, before and after a change to it;
  - the "Next up to build" line naming a sent-back plan by its title.

  An untracked `IRON_LOOP.md` that the menu writes in a fresh worktree belongs to "Opening the menu in a fresh worktree writes no stray half-filled IRON_LOOP.md". It is left in place, never staged, and recorded.

## Execution Record (Steps 8–16)

### Step 8: TEST

**Evidence (Step 8, executor).** `tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js` was written before any source change: 43 cases (A1-A8, B1-B3, C1-C13 with C3b, C4b and C6b, D1-D8, E1-E8). First run on the unchanged code: `node --test tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js` gave `# tests 43`, `# pass 3`, `# fail 40`, `# skipped 0`.
- Green, as the Test Plan expects (pins): B2 (the options and actions of the functional, technical-planning, in-progress and done screens, taken from a run of the unchanged code and equal to the values the Test Plan expected), D5 and D8. B3's first half is green inside B3, whose second half is red.
- Red for the reason named: A1-A8 (`streamingGate.planOwnTitle is not a function`); B1 (three options, not four); B3 (the command printed the dashboard); C1-C8, C11-C13 and D1, D2, D3, D4, D6 (the command printed the dashboard, so `ok`/`reason` are absent and the plan did not move); C3, C3b, C4, C4b, C5, C6, C6b (same); C9 (the dashboard path reads the replaced folder and throws `ENOTDIR`); C10 (same, no send-back ran); D7 (`rejectPlan` ignores a fifth argument, so zero mark lines instead of one); E1 and E2 (the screen offers no send-back action); E3 ("Topic: REVISION 2"); E4, E5 (`Topic: REVISION 1`); E6 (`Next up to build: REVISION 1.`); E7 (the feed title is `REVISION 1`); E8 (the sweep line reads `• REVISION 1 —`).
- No case was green where red was expected.

### Step 9: PREPARE

**Evidence (Step 9, executor).**
- Cited lines: the anchor of every edit the plan specifies (the function, constant, export block, route case, table row and paragraph each change attaches to) in `src/lib/actions.js`, `src/lib/streaming-gate.js`, `src/lib/menu-screens.js`, `src/lib/increment-feed.js`, `src/lib/loop-b-driver.js`, `src/lib/inbox.js`, `src/commands/start.js`, `src/commands/start.md` and `docs/ENFORCEMENT.md` was re-read in this worktree and sits where the plan says, with one off-by-one (`planTitle` starts at `:168`, its comment at `:167`). Nothing differs from the plan. The line numbers of prose-only citations (searches, comments) were not each re-read.
- Friction reproduced at the unchanged code on a temporary project under the operating system's temp folder: `node src/commands/start.js claude:reject todo/x.md implementation "the approach is wrong"` printed `CTOC v6.14.134` as its first line (the dashboard), exit status 0; `plans/implementation/x.md` did not exist and `plans/todo/x.md` was still there.
- Searches repeated. Pattern `match\(/\^#` over `src/`: 15 lines. The six title readers are still exactly `src/lib/streaming-gate.js:169`, `:1596`, `:2330`, `src/lib/menu-screens.js:3109`, `src/lib/increment-feed.js:62` and `src/lib/loop-b-driver.js:113`. The other 9 lines are not plan-name readers: `src/tabs/vision.js:232` (the `# Vision:` title of a vision plan), matches on `##` or step headings in `src/hooks/validate-plan-steps.js` (`:77`, `:129`), `src/lib/unexecutable-instruction-scan.js:187`, `src/lib/plan-validator.js` (`:577`, `:650`, `:1549`) and `src/lib/plan-index/sync-unit.js:138`, and `src/lib/plan-validator.js:1325` (`hasTitle`, a presence test that a `# REVISION` heading also satisfies). Pattern `startsWith\('# '\)` over `src/`: 0 lines. A wider search for any other pattern opening with `^#` found only `src/lib/ctoc-project-detector.js:31` and a comment in `src/lib/step-13-verify.js:590`. No seventh title reader.
- Baseline: `node --test tests/streaming-gate.test.js tests/streaming-gate-coverage-holes.test.js tests/menu-screens.test.js tests/plan-question-screen.test.js tests/plans-keep-moving-without-the-human.test.js tests/menu-task-wiring.test.js tests/actions-coverage.test.js tests/inbox-coverage.test.js tests/start-command-coverage-holes.test.js` gave `# tests 409`, `# pass 409`, `# fail 0`, `# skipped 0`.

### Step 10: IMPLEMENT

**Evidence (Step 10, executor).** Every sub-item above is implemented as specified, in the order of the Implementation Order (steps 2 to 6; steps 7 and 8 belong to Step 15).
- `node --test tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js`: `# tests 43`, `# pass 43`, `# fail 0`, `# skipped 0`.
- The Step 9 baseline files plus the new file in one run: `# tests 452`, `# pass 452`, `# fail 0`, `# skipped 0`. No existing assertion needed to change.
- `npx eslint --max-warnings 0` over the seven changed source files and the new test file: exit 0. `node --test tests/typecheck.test.js tests/export-reachability.test.js tests/reachability.test.js tests/false-green-fence.test.js tests/gate-numbers-fence.test.js tests/instruction-surfaces-say-the-moment.test.js` together with the new file, `tests/streaming-gate.test.js` and `tests/actions-coverage.test.js`: `# tests 286`, `# pass 286`, `# fail 0`.
- Typing (a deviation in form only, recorded under "Decisions Taken Under Ambiguity", item 32).

### Step 11: REVIEW

**Evidence (Step 11, iron-loop-critic).** CHANGES REQUIRED. Medium: a successful send-back could print a task id or path in its result line (cancel errors echoed). Medium: a send-back stopped part-way left the plan buildable without its approval, with its queued build still queued. Low: the held plan's "Check validation" route led to a screen whose first option was approve. All the plan's Step 11 attacks otherwise held: no "REVISION 1" anywhere; no claim and send-back double success; no automatic write releases the hold; `rejectPlan`'s other callers, the review screen and the other stages are unchanged.

### Step 12: OPTIMIZE

**Evidence (Step 12, executor).** Read in the built code: `isSentBackUnrevised` is one multi-line regular-expression test and hashes only when the mark matched; `planOwnTitle` is one pass over the body lines and parses the frontmatter only after no heading named the plan and the caller passed none; the hold reads `plan.content` that `readPlans` already read; `validateScreen` reads the plan file once more, for an interactive screen only. No change made.

### Step 13: SECURE

**Evidence (Step 13, security-scanner).** WARN. Medium: the same part-way defect. Medium: the standard-input recipe in `src/commands/start.md` was not yet written (Step 15). Low: a reason line of only `---` could replace the title. Low: a reason of only control or invisible characters passed as non-blank. Low: a symbolic link in the build queue was written through. Info: a hold mark matched anywhere in the file (safe direction only, left as is).

**Synthesis.** Four changes inside the plan's files (part-way failure and the queued-build words; link refusal; misleading-reason refusals; held validation screen), applied test-first, see Decisions 34 to 39 and the Step 14 evidence. Left out: the hold mark matched anywhere (safe direction), and the `src/commands/start.md` recipe (Step 15's own work, done).

### Step 14: VERIFY

**Evidence (Step 14, executor).**
- `npm test`: `[CTOC test-gate] coverage 99.74% (threshold 99%), skipped 0, failed 0` and `[CTOC test-gate] PASS`; the suite printed `# tests 13882`, `# pass 13882`, `# fail 0`, `# skipped 0`.
- `npx eslint --max-warnings 0` over the eight files: exit 0. `npm run typecheck`: `# pass 1`, `# fail 0` (baseline 0 errors).
- The six fence files: `# tests 210`, `# pass 210`, `# fail 0`, `# skipped 0`. `git status` shows no change under `.ctoc/`.
- `node --test tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js`: `# tests 51`, `# pass 51`, `# fail 0`, `# skipped 0`.

### Step 15: DOCUMENT

**Evidence (Step 15, executor).** The count command printed `[{"updated":[],"failures":[]},{"updated":[],"failures":[]}]` (the earlier pass had already moved both lines to 587, the number of `tests/*.test.js` files). The diff of `CLAUDE.md` and `README.md` against the base holds only those count lines; `CLAUDE.md` is 14,730 bytes. The `claude:reject` row and the subsection of `src/commands/start.md` give the reason only on standard input through a quoted heredoc with a fresh marker made in its own call, and say to start no build of a plan whose send-back stopped part-way. The paragraph in `docs/ENFORCEMENT.md` is written. Every new and changed function carries its JSDoc.

### Step 16: FINAL-REVIEW

**Evidence (Step 16, iron-loop-critic).** All seventeen scenarios are proved by behaviour tests in `tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js`: scenario 1 by B1; 2 by B2; 3 by B3; 4 by C1; 5 by C2, C8, C11, C13, C15, C16; 6 by C3, C3b; 7 by C4, C4b, C5; 8 by D1; 9 by E1; 10 by E2; 11 by E3, A3; 12 by E4, A5; 13 by E5, A6; 14 by D2, D6; 15 by D3; 16 by D4; 17 by D5. The status line is proved by E6, E7, E8. Every change-list item is built and pinned; the `src/commands/start.md` recipe and the wiring are confirmed; two sentence fixes are applied (the link-refusal and opening-screen wording in `docs/ENFORCEMENT.md`, and Decision 36's pointer to Decision 39).
