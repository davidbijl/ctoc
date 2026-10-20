---
title: "A plan in the build queue can be sent back to technical planning and keeps its title"
created: "2026-10-20T13:37:49.347Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: HIGH
status: refined
depends_on: "none"
acceptance_criteria_count: 13
risk_level: MEDIUM
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

- [ ] **Scenario: A build-queue plan's screen offers the send-back**
  Given a plan in the build queue titled "Readers skip the rejection header", with no question waiting for it
  When the coordinator opens it with `plan todo/<file>.md`
  Then its question offers exactly four options: Discuss, View/Edit, Delete and "Send it back — wrong way", the last with the description "The requirements are right; the technical approach is wrong. It goes back to be re-planned."
  And the action for "Send it back — wrong way" is `claude:reject todo/<file>.md implementation`
  And no option label or description on the screen contains a stage directory name

- [ ] **Scenario: Plans in other stages show the options they show today**
  Given one plan each in requirements, technical planning, `plans/in-progress/` and `plans/done/`, and the options and actions each one's screen shows today, written into the test before any source change
  When each is opened with `plan <stage>/<file>.md` after the change
  Then each screen's options and actions are identical to the recorded ones, and none offers "Send it back — wrong way"

- [ ] **Scenario: The review screen is unchanged**
  Given a plan in review
  When it is opened with `plan review/<file>.md`
  Then it offers "Send it back — wrong thing" and "Send it back — wrong way" with the actions `claude:reject review/<file>.md functional` and `claude:reject review/<file>.md implementation`, character for character as before this change
  And the send-back command run directly on that plan does what the owner's answer to "When the send-back command becomes real, what does it do with a plan in review?" says; under the recommended answer it prints a refusal sentence saying it sends back build-queue plans only, and the plan file stays byte-identical in review

### Sent back with a reason

- [ ] **Scenario: The menu command sends the plan back with its reason**
  Given a plan in the build queue titled "Readers skip the rejection header", with the approval record of its build-it decision and no build task
  When the coordinator runs the action of "Send it back — wrong way" through `node src/commands/start.js` with the reason `the "files:" list misses src/lib/increment-feed.js and $HOME paths`
  Then the plan is in technical planning and no longer in the build queue
  And the plan file shows that reason character for character in its rejection feedback
  And the approval record of the build-it decision is gone, as `rejectPlan` withdraws it today
  And the command prints one result line that names "Readers skip the rejection header" and says it was sent back to be re-planned; it prints no dashboard and no stage directory name

- [ ] **Scenario: No reason, or another destination, is refused**
  Given a plan in the build queue
  When the command runs on it once with an empty reason, and once with the destination `functional` and a reason
  Then the first run prints a refusal sentence saying a reason is required, and the second prints one saying a build-queue plan can only be sent back to be re-planned
  And after both runs the plan file is byte-identical, still in the build queue, with its approval record unchanged

- [ ] **Scenario: A plan whose build has started is not sent back**
  Given the coordinator opened a build-queue plan's screen, and its build task was claimed afterwards, which moved the plan to `plans/in-progress/`
  When the command runs on `todo/<file>.md`
  Then it prints a refusal sentence saying the plan is being built
  And the plan file, its place in `plans/in-progress/` and the build task are unchanged

- [ ] **Scenario: A queued build of the plan is cancelled with it**
  Given a plan in the build queue with a queued build task that no agent has claimed
  When the command sends the plan back with a reason
  Then that build task is cancelled
  And the result line says the queued build was cancelled
  And `menu task start <that task id>` run afterwards starts no build and moves no plan

- [ ] **Scenario: The plan waits in technical planning**
  Given a plan just sent back, with no questions generated for it since
  When the menu's continuation runs (`menu task complete <id> --continue` on another finished task)
  Then the plan is still in technical planning, and the build queue holds no copy of it

### Named by its title

- [ ] **Scenario: Sent back from its screen, it comes back under its title**
  Given a plan titled "Readers skip the rejection header", the only plan in the build queue of a temporary project
  When the coordinator opens `plan todo/<file>.md`, takes "Send it back — wrong way" and runs the command its action names with a reason
  Then the opening screen (`node src/commands/start.js` with no words) names that plan "Readers skip the rejection header", and its question reads "Shall I build “Readers skip the rejection header”?"
  And `plan implementation/<file>.md` shows a Topic line that begins "Topic: Readers skip the rejection header"
  And neither the opening screen's question nor the Topic line contains "REVISION"

- [ ] **Scenario: A second send-back keeps the title**
  Given that plan was revised, crossed into the build queue again, and is sent back a second time with another reason
  When the owner opens the opening screen and the plan's own screen
  Then both name it "Readers skip the rejection header"
  And the plan file holds both reasons

- [ ] **Scenario: Plans sent back before this change show their titles**
  Given a copy of `plans/functional/finished-plans-are-not-sent-back-after-an-update.md`, which carries `# REVISION 2` and `# REVISION 1` above its own title, in requirements of a temporary project
  When the owner opens the opening screen and `plan functional/<file>.md`
  Then both name it "Finished plans are not sent back after an update"
  And the plan file is byte-identical before and after

- [ ] **Scenario: A real title that begins with "Revision" still shows**
  Given a sent-back plan whose own title is "Revision history is kept for every plan"
  When the owner opens its plan screen
  Then its Topic line begins "Topic: Revision history is kept for every plan"

- [ ] **Scenario: A sent-back plan with no title heading of its own**
  Given a sent-back plan with no level-1 heading besides the rejection header, and the frontmatter line `title: "Readers skip the rejection header"`
  When the owner opens the opening screen and the plan's own screen
  Then both name it "Readers skip the rejection header"
  And a copy without the frontmatter title is named by its file name without `.md` on both screens

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

## Neighbours (seen, not built here; scheduling is the owner's)

- **A review send-back does not land where its words say.** The review screen's "Send it back — wrong thing" names requirements and "Send it back — wrong way" names technical planning (`src/lib/streaming-gate.js:1699`, `src/lib/gate-words.js:154-165`), but the only send-back code moves a review plan into the build (`src/lib/actions.js:856`, `src/tabs/review.js:119-120`), and `src/commands/start.md:63` tells the session nothing more. Read, not run. Unless the owner picks (b) above.
- **No route sends a technical plan back to requirements.** A plan in technical planning shows the build-it question with no send-back (`src/lib/streaming-gate.js:1692-1701` adds send-backs only in review), so a build-queue plan found to be the wrong thing needs a second send-back that has no menu route. Read, not run.
