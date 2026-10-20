---
status: decomposed
decomposed_at: "2026-10-20T14:02:42.806Z"
title: "CTOC is built with CTOC, and every friction found while building it becomes a plan"
type: vision
created: 2026-10-20
program: ctoc-is-built-with-ctoc
---

# Vision: CTOC is built with CTOC, and every friction found while building it becomes a plan

## Status
- Created: 2026-10-20
- Last Updated: 2026-10-20
- Progress: 5/5 phases complete
- Status: ready

## Source

The owner's ruling of 2026-10-20: all CTOC plugin development goes through CTOC itself, and every friction found while doing so is filed back into CTOC as a lesson and a plan, not worked around.

The owner's grouping instruction for this work: "Group them sensibly: one vision with several functional stubs is fine".

Evidence labels used below, as relayed by the CTO Chief:
- **read**: the CTO Chief read the source on v6.14.133.
- **run**: observed by running the menu on v6.14.133.
- **reported**: relayed by the coordinator, not re-checked.
- **re-read by the vision advisor**: the vision advisor opened the cited file and line on v6.14.133 while writing this vision. This confirms only what that line says, never a reported behaviour.

## Phase 1: Problem Discovery
### Problem Statement
✓ Building CTOC with its own menu on 2026-10-20 hit ten frictions. In each one the menu had no route, printed output nobody could use, misread a plan, or let a check pass that should have held, so the coordinator worked around the menu by hand (`node -e` calls into `src/lib/actions`, a scratch script to compute answer digests, relaying review rounds itself). Each workaround routes around the pipeline CTOC exists to enforce, and leaves the friction in place for every user.

The full list of frictions, with evidence, is under "Minimum Viable Scope". In short:
- The menu cannot send back a plan that is already in the build queue.
- The answer commands for a plan's questions cannot be pulled out of the stream screen.
- After a send-back, the status line shows "REVISION 1" instead of the plan's title.
- The check before a plan enters the build queue most likely reads "edits a file an earlier slice creates" as "creates it".
- The gate critic's classification brief lacks the plan file's modification time, so a later plan edit gets its classification refused as out of date.
- The background-agent protection may have let two menu calls through.
- Review and security rounds were driven by hand. The route already exists, but a send-back from those rounds is counted nowhere.
- Surviving mutants from mutation testing have no recorded place in a plan.
- The rule "CTOC is built with CTOC" is not yet an operating lesson.
- Opening the menu in a fresh worktree writes a stray, half-filled `IRON_LOOP.md`.

### Target User
✓ The CTOC maintainers who build CTOC through its own menu: the owner, Tijn van der Zant, and the CTO Chief and background agents that work for him (the coordinator session, the iron-loop executor, the critics). The same frictions reach every CTOC user whose plans hit these routes: a send-back from the build queue, answering streamed questions, slices that build on each other's new files, background agents.

### Problem Severity
✓ High. Every friction listed here pushed the coordinator off the menu, and working off the menu is exactly the failure CTOC's operating lessons forbid ("Never route around CTOC or self-cross its gates"). Two of the frictions touch protection, not convenience. First, the background-agent protection may let a background agent call the menu's task-completion route and the plan actions directly. Second, review and security send-backs have no limit and never escalate to the owner. Both stay unverified until they are measured.

## Phase 2: Value Proposition
### Success Criteria
✓ Every friction in this vision ends up in a plan, named by its title, and each fix is proven by a test that drives the real menu route or the real check.
- **Nothing dropped.** Each friction ends in one of three places: a functional plan of its own, a functional plan grouped with a closely related friction, or a record against an existing plan named by title. The vision-decomposer's output names every friction title from "Minimum Viable Scope"; none is silently dropped.
- **Real routes, not snapshots.** Each fixed friction has a test that drives the real menu route or the real check, never a structure snapshot. Examples:
  - The plan screen for a build-queue plan offers a send-back, and taking it lands the plan back in technical planning with its title intact.
  - The menu prints the exact answer command for each option of each question.
  - The check before the build queue accepts a slice that only edits a file an earlier slice creates.
  - The classification brief carries the plan file's modification time.
  - Opening the menu in a fresh worktree leaves no untracked file with an unfilled `{{PROJECT_NAME}}` placeholder.
- **The operating lesson is in place.** "CTOC is built with CTOC; friction found while dogfooding is filed as a plan, not worked around" is in the lesson lists. `tests/claude-md-lessons.test.js` and `tests/claude-md-keeps-every-rule.test.js` pass, and the repository's `CLAUDE.md` stays at or under 15,000 bytes.
- **The background-agent protection starts with a measurement.** Its plan begins with the measured hook check, and the recorded result is in the plan before any build step. Nothing about it is built on the reported pass-through alone.
- **The send-back limit gap is filed honestly.** It is filed as a gap that needs the owner's explicit approval, because changing the circuit breaker is gate logic. It is never built without that approval.

### Impact Scale
✓ Medium to high. Each friction alone is small. Together they decide whether CTOC can be built through its own menu without a single by-hand workaround, and that is the owner's ruling for all CTOC plugin development from 2026-10-20 on. Users outside CTOC itself benefit too: several of these routes are general (sending a plan back from the build queue, answering streamed questions, slices that build on each other, background-agent protection).

## Phase 3: Scope Definition
### Minimum Viable Scope
✓ File every friction found on 2026-10-20 as plan work. Each entry below keeps its evidence, label and disposition in full, and the vision-decomposer groups them into functional plans.

- **No send-back from the build queue.** A plan already in the build queue has no menu route back to technical planning.
  - **run:** the plan screen for a build-queue plan (`plan todo/agent-tool-grants.md`) offers only Discuss, View/Edit and Delete.
  - **read:** send-back options are added only when the stage is review (`src/lib/streaming-gate.js`, the `if (stage === 'review')` block that loops over `gateWords.SEND_BACK`). The send-back itself is `rejectPlan` in `src/lib/actions.js`.
  - **re-read by the vision advisor:** `src/lib/streaming-gate.js:1693` (`if (stage === 'review')`) and `:1697` (`for (const sb of gateWords.SEND_BACK)`).
  - **reported:** the coordinator had to call the `claude:reject` action, or `src/lib/actions` directly through `node -e`. Running `node src/commands/start.js claude:reject <ref> <stage> "<reason>"` only printed the menu.
  - Disposition: new work.

- **Answer lines are hard to get.**
  - **reported:** the `stream` screen output is one large block of JSON text. The exact `stream answer <plan> <question id> <option key> <digest>` lines cannot easily be pulled from it, and a scratch script was written to compute the digests.
  - **read:** no `stream answers` route exists in `src/commands/start.js`, `src/lib/streaming-gate.js` or `src/lib/menu-screens.js`. The answer command is composed per option in `src/lib/streaming-gate.js` (the `answer` helper that builds `stream answer ${ref} …`).
  - Wanted: the menu prints each question's answer commands, or offers a `stream answers <plan>` view.
  - Disposition: new work.

- **The status line shows a revision instead of the title.**
  - **reported:** after a send-back, the status line names a plan "REVISION 1" instead of its title.
  - **read:** `rejectPlan` in `src/lib/actions.js` puts a `# REVISION <n>` heading and a `## Rejection Feedback` block above the plan's own title. A reader that takes the first `#` heading as the title therefore gets "REVISION 1".
  - **re-read by the vision advisor:** `src/lib/actions.js:886` builds `# REVISION ${revision}\n\n## Rejection Feedback\n\n…`.
  - Disposition: new work. It shares the send-back code with "No send-back from the build queue".

- **The pre-build check misreads edits.**
  - **reported:** the check reads "edits a file that an earlier slice creates" as "creates it", and refuses slices that depend on another slice's new file.
  - **read, most likely cause only:** at the move into the build queue, `validateForQueue` in `src/lib/plan-validator.js` calls `checkPlanDeclaresCountMovers` in `src/lib/documented-counts.js`. Its `movesDocumentedCount` treats any declared file of a counted kind that is absent on disk as a file this plan creates; the counted kinds are a new test file, library module, hook, tab, agent or skill file. It then refuses the plan with `Plan will create "<path>" … but does not declare "CLAUDE.md"`. So a slice that only edits a file that an earlier, not-yet-built slice creates is refused, or is forced to declare a `CLAUDE.md` it does not need.
  - The refusal text seen on 2026-10-20 was not captured, so the plan first reproduces the refusal and confirms the cause.
  - **re-read by the vision advisor:** `src/lib/plan-validator.js:1341` calls `checkPlanDeclaresCountMovers(declaredFiles, projectPath)`, and `:1347` holds the `does not declare "CLAUDE.md"` refusal text.
  - Related but NOT covering it, because both fix the prose contradiction scan at completion, which is a different check:
    - "The plan checker does not read a quotation as a claim that the plan creates a file" (`plans/functional/a-quotation-is-not-a-file-claim.md`)
    - "A method name in plan prose is not a missing file" (`plans/implementation/a-method-name-in-plan-prose-is-not-a-missing-file.md`)
  - Disposition: new work, naming those two plans as related.

- **Gate critics lack the plan file time.**
  - **reported:** the briefs that launch the gate critic do not carry the plan file's modification time. Critics then reuse the author's revision stamp, and after a later plan edit their classification is refused as out of date.
  - **read:** `agents/iron-loop/gate-critic.md` requires `planMtimeMs` from the brief, and says a stamp older than the plan's current modification time is refused as superseded. The classification brief in `src/commands/start.md` ("A promoted `classify` task …") names only the task id, the plan path and "classify the questions of {ref}", with no modification time.
  - **re-read by the vision advisor:** `agents/iron-loop/gate-critic.md:37` and `:98`; `src/commands/start.md:385-386` (the brief lists the task id, the plan path and "classify the questions of `{ref}`").
  - Related but NOT covering it: the small-changes slice "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect" (`plans/implementation/00412-small-changes-take-a-small-path-s12-critique-queue-and-four-lenses.md`). It puts the stamp into the four-lens critique briefs, not into the classification brief.
  - Disposition: new work, naming that slice as related. Both edit `src/commands/start.md`.

- **The background-agent protection may not hold.**
  - **reported:** the protection let `menu task complete … --continue` and inline `node -e` calls that load `src/lib/actions` through from a background agent.
  - **read, not run:** `src/hooks/protect-records.js` sets `RECORD_REFUSALS_OFF = true`. Its header says that the background agent's menu refusal runs INSIDE that switch, and that the shell refusals of the records and the agent menu refusal are off on the owner's order of 2026-10-15. So the reported pass-through is most likely that switch, not a defect in the refusal itself. Unverified.
  - **re-read by the vision advisor:** `src/hooks/protect-records.js:1053` reads `const RECORD_REFUSALS_OFF = true;`.
  - The plan's FIRST step is the measurement: feed crafted hook input (a JSON payload with a non-empty `agent_id`) to the hook on the current release, never in a real shell. Do it for both calls (`menu task complete … --continue`, and an inline `node -e` that loads `src/lib/actions`) and record the result.
  - Then the owner decides whether the background-agent menu refusal is switched back on. Changing a hook needs the owner's explicit approval.
  - Related:
    - "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection" (`plans/functional/an-agent-cannot-switch-off-ctocs-own-protection.md`)
    - "A background agent is refused when it writes Claude Code's settings files or CTOC's .ctoc/settings.json" (`plans/review/a-background-agent-cannot-change-claude-codes-settings.md`)
    - the open owner question named in the hook's header: isolating background agents from the main project's records.
  - Disposition: new work, measure first.

- **Review rounds were driven by hand; send-backs from review and security rounds are counted nowhere.**
  - On the work-counting change, the main session dispatched and relayed the review, security and verify rounds by hand. The coordinator ruled that this is NOT a missing feature: CTOC already has the route, and the main session did not use it.
  - **read:** the route to use from now on:
    - The menu action `claude:start-agent` (`src/commands/start.md`) calls `startAgent` in `src/lib/actions.js` and records an `implement` task.
    - The background `iron-loop-executor` (`agents/iron-loop/iron-loop-executor.md`) then runs that plan's build steps, from writing the failing tests through the final review.
    - Its own `menu task complete <id>` runs `completeExecution` (`src/lib/actions.js`), which runs the verify step, writes the evidence and counts send-backs through the circuit breaker.
    - The session then runs `menu task complete <id> --continue`.
    - Specialist review and security rounds are recorded with the generic work recipe `menu task add review|security|quality <plan> --touches <files>` (task kinds in `src/lib/task-registry.js`) and dispatched by the CTO Chief.
    - There is no "advance-agent" route: `advanceAgent` was deleted on 2026-07-30 as dead code (recorded in `.ctoc/export-reachability-baseline.json`).
  - The ONE real gap: the limit of three send-backs per step counts only send-backs recorded inside `completeExecution`. `recordStepKickback` has two callers, both there: the refusal before review, and a failed verify. A send-back from a review or security round before completion is counted nowhere, so those rounds have no limit and never escalate to the owner.
  - **re-read by the vision advisor:** `src/lib/actions.js:1340` and `:1460` are the only two calls of `recordStepKickback(` under `src/`, with the definition at `:1803`. Search: pattern `recordStepKickback\(` over `src/`, one file, three matching lines.
  - Disposition: file only that narrow gap. Changing the circuit breaker is gate logic and needs the owner's explicit approval.

- **Surviving mutants are unrecorded.**
  - **reported:** when a mutation-testing step leaves surviving mutants, the plan template has no recorded place for them, and the builder improvised Decisions for them.
  - **read:** neither mutation nor mutants is mentioned in `.ctoc/templates/implementation-plan.md.template`, `src/lib/iron-loop.js`, `src/lib/plan-validator.js`, `agents/iron-loop/iron-loop-executor.md` or `agents/iron-loop/iron-loop-integrator.md`.
  - **re-read by the vision advisor:** pattern `mutant|mutation` (case-insensitive), searched file by file with each of the five paths given explicitly: 0 matches in each. A control search for `Step` in `.ctoc/templates/implementation-plan.md.template` found 15 matches, which proves that hidden-folder file was actually read. This shows the words are absent from those five files, not from the whole repository.
  - Disposition: new work.

- **The operating lesson: CTOC is built with CTOC.** Add an operating lesson that CTOC is built with CTOC, and that friction found while dogfooding is filed as a plan, not worked around.
  - It goes into `docs/OPERATING_LESSONS.md` and the CLAUDE.md template, through the normal plan route.
  - **read:** the repository's `CLAUDE.md` is 14,730 bytes against the 15,000-byte limit, leaving 270 bytes of room.
  - The lesson lists also live in `.ctoc/templates/operating-lessons.md` and `.ctoc/templates/CLAUDE.md.template`. They are held in step by `tests/claude-md-lessons.test.js` and `tests/claude-md-keeps-every-rule.test.js` (with `tests/fixtures/claude-md-rule-inventory.json`).
  - Disposition: new work.

- **Opening the menu in a fresh worktree writes a stray file.** Found while filing these plans.
  - **run:** in a fresh worktree, `node src/commands/start.js plan todo/agent-tool-grants.md` created an untracked `IRON_LOOP.md` at the repository root. Its first line is `# {{PROJECT_NAME}} — Iron Loop`: the placeholder was never filled.
  - **read:** `src/lib/init-project.js` writes `IRON_LOOP.md` from its template verbatim when the file is absent. The main checkout has no such file, and git does not ignore it.
  - Not traced: why project setup runs in a fresh worktree but not in the main checkout.
  - **re-read by the vision advisor:** `src/lib/init-project.js:708` (the template path `.ctoc/templates/IRON_LOOP.md.template`) and `:795-803` (writes `IRON_LOOP.md` when it is absent, otherwise skips it).
  - Disposition: new work.

### Explicit Exclusions
✓ This work leaves out product questions and every change to who crosses an approval point.
- Pricing, marketing and product questions.
- Any change to who crosses an approval point. Only the menu crosses one, on recorded evidence or the owner's OK.
- A new "advance-agent" route. The existing `claude:start-agent` route with the iron-loop executor is the route to use.
- Changing hooks or gate logic without the owner's explicit approval. This covers switching the background-agent menu refusal back on and making review and security send-backs count toward the circuit breaker.
- Rework of the prose contradiction scan at completion. That scan belongs to "The plan checker does not read a quotation as a claim that the plan creates a file" and "A method name in plan prose is not a missing file".
- The four-lens critique briefs. They belong to "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect".

### Dependencies
✓ The send-back and revision-title fixes share `rejectPlan`. The modification-time fix shares `src/commands/start.md` with the critique-queue slice. The background-agent protection waits on a measurement and on the owner's decision.
- "No send-back from the build queue" and "The status line shows a revision instead of the title" both depend on `rejectPlan` in `src/lib/actions.js`. If they are split, the plans have to run one after the other.
- "Gate critics lack the plan file time" edits `src/commands/start.md`, and so does "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect" (`plans/implementation/00412-small-changes-take-a-small-path-s12-critique-queue-and-four-lenses.md`). The two must not edit that file at the same time.
- "The background-agent protection may not hold" depends first on the measured hook check, then on the owner's decision about the refusal switch. It relates to "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection" and "A background agent is refused when it writes Claude Code's settings files or CTOC's .ctoc/settings.json".
- "The pre-build check misreads edits" depends on reproducing the refusal first, because the refusal text from 2026-10-20 was not captured.
- The send-back gap from "Review rounds were driven by hand" depends on the owner's explicit approval before any change to the circuit breaker.
- "The operating lesson: CTOC is built with CTOC" depends on fitting the 270 bytes of room left in the repository's `CLAUDE.md`, and on the two lesson tests and the rule inventory fixture.

## Phase 4: Risk Assessment
### Failure Modes
✓ The biggest risk is fixing the wrong cause: building on a "reported" claim that the measurement or reproduction would have disproved.
- **The protection is built on the reported pass-through.** The background-agent protection plan is built on the reported claim instead of the measured hook check. The likely cause is the deliberate switch the owner set on 2026-10-15, so "fixing" it without his decision would override his order.
- **The wrong check is fixed.** The pre-build check fix aims at `checkPlanDeclaresCountMovers` while the real refusal of 2026-10-20 came from another check. The refusal was not captured, so the cause is only the most likely one.
- **The lesson does not fit.** The new operating lesson does not fit the 270 bytes left in `CLAUDE.md`. Then the size test fails, or other rules get cut to make room. Cutting a rule is caught by `tests/claude-md-keeps-every-rule.test.js`, and the lesson must be written short instead.
- **Fixes collide.** The send-back and revision-title fixes edit `rejectPlan` in parallel and collide, or the modification-time fix and the critique-queue slice edit `src/commands/start.md` at the same time.
- **The send-back limit is changed without approval.** Making review and security send-backs count is gate logic. Built without the owner's explicit approval, it breaks the rule that hook and gate logic change only on his order.
- **Snapshot tests give false green.** Tests that assert a menu screen's structure instead of driving the real route would pass while the friction remains.

### Unknowns
✓ Each unknown below is open. The first two are owner decisions that have not been made.
- **Waiting for the owner, not decided:** whether the background-agent menu refusal in `src/hooks/protect-records.js` is switched back on after the measured hook check.
- **Waiting for the owner, not decided:** whether the circuit breaker is changed so that send-backs from review and security rounds count toward the limit of three per step and escalate to him.
- Whether the background-agent pass-through really is the deliberate switch, or a defect in the refusal. The hook check answers this.
- The exact refusal text seen at the pre-build check on 2026-10-20, and whether `checkPlanDeclaresCountMovers` produced it.
- Why opening the menu runs project setup in a fresh worktree but not in the main checkout.
- Whether the repository's `CLAUDE.md` lesson block is filled from `.ctoc/templates/operating-lessons.md` by the lesson injector, so that the new lesson lands in `CLAUDE.md` and must fit its 270 bytes. The plan traces this.
- Which of the two answer-line options is better: printing each question's answer commands on the stream screen, or a separate `stream answers <plan>` view.
- Where surviving mutants are best recorded: a template section, a step in the iron loop, or a check in the plan validator.

### Assumptions
✓ The CTO Chief's source reading on v6.14.133 is accurate, and the "reported" frictions happened as relayed.
- Each "read" claim reflects the source on v6.14.133. The vision advisor re-read the cited lines named above, and they match.
- Each "reported" friction happened as the coordinator described. These claims are not re-checked, and every plan that rests on one starts by reproducing it.
- The 14,730-byte size of the repository's `CLAUDE.md` is as relayed. The vision advisor did not re-measure it.
- The vision-decomposer groups these frictions into functional plans, and nothing in this vision schedules them. The owner alone chooses what is built and when.

## Phase 5: Summary

## Vision: CTOC is built with CTOC, and every friction found while building it becomes a plan

**In one sentence:** The CTOC maintainers (the owner and the agents that build for him) can build CTOC entirely through its own menu, because every friction found while dogfooding it on 2026-10-20 is filed as a plan with a test that drives the real route.

**The problem:** On 2026-10-20, building CTOC through its own menu hit ten frictions, and each one pushed the coordinator to work around the menu by hand: `node -e` calls into `src/lib/actions`, a scratch script for answer digests, review rounds relayed by hand. The frictions:
- no send-back from the build queue;
- answer lines buried in one block of JSON;
- "REVISION 1" shown instead of the plan's title;
- a pre-build check that most likely reads an edit as a creation;
- a classification brief without the plan file's modification time;
- a background-agent protection that may let menu calls through, most likely through the switch the owner set off on 2026-10-15;
- send-backs from review and security rounds that count toward no limit;
- surviving mutants with no recorded place;
- no operating lesson for dogfooding;
- a stray, half-filled `IRON_LOOP.md` written in a fresh worktree.

**For whom:** The owner, Tijn van der Zant, and the CTO Chief and background agents that build CTOC for him. After them, every CTOC user whose plans use the same routes.

**Success looks like:**
- Every friction ends in a functional plan of its own, in a group with a related friction, or recorded against an existing plan named by title. None is dropped.
- Each fix is proven by a test that drives the real menu route or the real check.
- The new operating lesson is in the lesson lists while `CLAUDE.md` stays at or under 15,000 bytes.
- The background-agent protection plan starts with a measured hook check.

**What we are building:**
- A send-back route from the build queue to technical planning.
- A readable list of answer commands.
- A status line that keeps the plan's title after a send-back.
- A pre-build check that tells an edit of an earlier slice's new file from a creation.
- The plan file's modification time in the gate critic's classification brief.
- A measured verdict on the background-agent protection.
- A filed gap for counting review and security send-backs, built only with the owner's approval.
- A recorded place for surviving mutants.
- The operating lesson "CTOC is built with CTOC".
- No stray `IRON_LOOP.md` when the menu opens in a fresh worktree.

**What we are NOT building:**
- Pricing, marketing or product answers.
- Any change to who crosses an approval point.
- A new "advance-agent" route.
- Any hook or gate-logic change without the owner's explicit approval.
- The prose contradiction scan at completion, or the four-lens critique briefs. Those belong to their own plans.

**Key risk:** The background-agent protection is "fixed" on the reported pass-through alone. The likely cause is the switch the owner deliberately set off on 2026-10-15 (`RECORD_REFUSALS_OFF = true` in `src/hooks/protect-records.js`), so a fix that skips the measured hook check and his decision would override his own order.

**Reach, Impact, Confidence, Effort:**
- Reach: High. Every CTOC build session that sends a plan back, answers streamed questions, builds dependent slices or runs background agents.
- Impact: High. It removes every by-hand workaround seen on 2026-10-20, and each workaround routed around the pipeline.
- Confidence: Medium. Most causes are read from source, but several frictions are reported only. The pre-build check cause and the protection cause are each only the most likely explanation.
- Effort: Medium. Mostly small, separate changes. The send-back and revision-title fixes share one function, and the operating lesson is limited by 270 bytes of room.

**Stakeholders:** The owner, whose explicit approval gates the hook change and the circuit-breaker change.

**Assumptions to test:**
- The background-agent pass-through comes from the deliberate switch, not from a defect.
- The pre-build refusal comes from `checkPlanDeclaresCountMovers`.
- The new lesson fits in 270 bytes of `CLAUDE.md`.

## Decisions Taken Under Ambiguity

- **No questions were asked.** The vision advisor was dispatched in the background with no human present. Every gap was settled with a documented choice here instead of a question.
- **One vision, grouped by the decomposer.** The owner said "Group them sensibly: one vision with several functional stubs is fine". This vision is that one vision. The vision-decomposer groups the frictions into functional plans, and this vision neither groups nor schedules them.
- **No direct conversion.** The vision advisor did not convert this vision into a functional plan and did not decompose it. The CTO Chief dispatches the vision-decomposer next.
- **No questions file written.** The vision advisor's agent file says to write a questions file under `.ctoc/streaming/questions/pending/` as its last act. The CTO Chief's brief allows exactly one write, this vision file, so the brief governed. The two owner decisions are listed under "Unknowns" as waiting for the owner and are not decided here.
- **Project type: CTOC developing itself.** It is classified as an internal tool, so competitors and business model are skipped as not applicable. Stakeholders are kept, because the owner's explicit approval gates two of the changes.
- **"Review rounds were driven by hand" is filed narrowly.** Following the coordinator's ruling, only the uncounted review and security send-backs are filed. The by-hand relaying is answered by the existing `claude:start-agent` route, not by a new feature.
- **Every plan built on a reported claim starts by checking it.** This covers the background-agent protection (the measured hook check), the pre-build check (reproduce the refusal first), and the "reported" frictions in general.
- **The 270-byte limit binds the lesson.** The 270 bytes of room left in the repository's `CLAUDE.md` limit how long the new lesson can be. It is written to fit, never by cutting another rule.
- **Every friction is named by title, never by number.** Dates of the form `Created: 2026-10-20` are used without a clock time, because no time of day was recorded.
- **Progress is written as all five phases complete.** All eleven answered sections and the summary are filled, and the status is `ready`.

## Discussion History
### 2026-10-20
Q: All sections
A: Written in one pass from the CTO Chief's brief, which relays the owner's ruling of 2026-10-20 and the ten frictions found that day. There was no live discussion, because no human was present.
