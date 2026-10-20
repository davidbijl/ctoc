---
title: "Decomposition of the vision: CTOC is built with CTOC, and every friction found while building it becomes a plan"
type: decomposition
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
created: 2026-10-20
---

# Decomposition: CTOC is built with CTOC, and every friction found while building it becomes a plan

- Vision: `plans/vision/ctoc-is-built-with-ctoc.md`
- Readiness (run by the CTO Chief with `validateVisionReadiness`): ready, no errors, no warnings.
- Canvas: none; the vision-only path was taken.
- Result: nine functional plan stubs carrying the ten frictions. Two frictions share one stub because they share one user journey and one function (`rejectPlan`); the other eight are one stub each.
- Stub files are created by the CTO Chief through `decomposeVision`; this document only describes them. Each stub is named below by its title.

## Every friction, and the stub that carries it

The ten friction titles are copied verbatim from the vision's "Minimum Viable Scope". Count: ten frictions, nine stubs, none dropped, none carried twice.

| Friction (vision title, verbatim) | Stub that carries it |
|---|---|
| No send-back from the build queue. | A plan in the build queue can be sent back to technical planning and keeps its title |
| The status line shows a revision instead of the title. | A plan in the build queue can be sent back to technical planning and keeps its title |
| Answer lines are hard to get. | The menu prints the exact answer command for every option of every streamed question |
| The pre-build check misreads edits. | The pre-build check accepts a slice that edits a file an earlier slice creates |
| Gate critics lack the plan file time. | The classification brief for the gate critic carries the plan file modification time |
| The background-agent protection may not hold. | The background-agent protection is measured before the owner decides whether it is on |
| Review rounds were driven by hand; send-backs from review and security rounds are counted nowhere. | Send-backs from review and security rounds count toward the three-per-step limit |
| Surviving mutants are unrecorded. | Surviving mutants from mutation testing have a recorded place in the plan |
| The operating lesson: CTOC is built with CTOC. | The operating lessons say CTOC is built with CTOC and friction is filed as a plan |
| Opening the menu in a fresh worktree writes a stray file. | Opening the menu in a fresh worktree writes no stray half-filled IRON_LOOP.md |

## Goals (impact map)

### Goal: Every plan move the maintainers need is a menu route with usable output
- **Actor:** the owner and the CTO Chief, coordinator session and background agents that build CTOC through its menu; after them, every CTOC user on the same routes.
- **Impact:** the coordinator sends back, answers and moves plans through the menu without `node -e` calls into `src/lib/actions` or scratch scripts.
- **Success metric:** each of the five stubs under this goal has a test that drives the real menu route or the real check (the vision's "Real routes, not snapshots" examples), and no by-hand workaround is needed for these five frictions.
- **Stubs:** the build-queue send-back with its title; the answer commands; the pre-build check; the classification brief's modification time; the stray `IRON_LOOP.md`.

### Goal: The protections CTOC already promises hold, or the owner knowingly decides they do not
- **Actor:** the owner, whose explicit approval gates every hook and gate-logic change.
- **Impact:** the owner decides on measured evidence, not on a reported pass-through, whether the background-agent menu refusal is switched back on and whether review and security send-backs count toward the limit.
- **Success metric:** the protection stub records a measured hook result before any build step; the counting stub is filed as a gap and nothing in it is built without the owner's explicit approval.
- **Stubs:** the background-agent protection; the review and security send-back count.

### Goal: What was learned while dogfooding is recorded where the next builder finds it
- **Actor:** the iron-loop executor and integrator writing and building plans, and every future maintainer.
- **Impact:** the builder records surviving mutants in a defined place instead of improvising, and the rule "CTOC is built with CTOC" is an operating lesson.
- **Success metric:** surviving mutants have a defined, validated place in an implementation plan; the new lesson is in the lesson lists, `tests/claude-md-lessons.test.js` and `tests/claude-md-keeps-every-rule.test.js` pass, and `CLAUDE.md` stays at or under 15,000 bytes.
- **Stubs:** the surviving mutants; the operating lesson.

## Stubs, activities and stories

Walking-skeleton stories are marked `[MVP]`. The other stories are listed as the remaining stories, without any phase or schedule; the owner alone chooses what is built and when. INVEST status is given per story (I N V E S T; a letter in brackets notes a qualified pass, explained under the story).

### Stub: A plan in the build queue can be sent back to technical planning and keeps its title

Carries: "No send-back from the build queue." and "The status line shows a revision instead of the title."

Verified in this pass: `rejectPlan` (`src/lib/actions.js:835`) already moves any plan exactly one stage back along `STAGE_ORDER` (`src/lib/gate-order.js:21`: functional, implementation, todo, in-progress, review, done), so a build-queue plan's one-stage-back target is technical planning. The missing piece is the menu offering (send-back words added only inside `if (stage === 'review')` at `src/lib/streaming-gate.js:1693`) and the `claude:reject` command, which only printed the menu. The rejection header is built at `src/lib/actions.js:886`.

Activities (backbone):
1. Open a build-queue plan and see a send-back offered.
2. Send it back with a reason.
3. See it in technical planning under its own title.

Stories:
- [ ] `[MVP]` As the coordinator, I want the plan screen of a build-queue plan to offer a send-back to technical planning, so that I never call `src/lib/actions` by hand to send a plan back.
  - Acceptance: the real plan screen for a plan in `plans/todo/` lists a send-back option next to Discuss, View/Edit and Delete; a plan in any other stage shows the same options it shows today.
  - INVEST: pass on all six.
- [ ] `[MVP]` As the coordinator, I want taking that send-back to move the plan to technical planning with my reason recorded, so that the planner sees why it came back.
  - Acceptance: driving the menu route moves the plan from `plans/todo/` to `plans/implementation/`, the plan carries the reason, and the approval record is withdrawn as `rejectPlan` does today.
  - INVEST: pass; (I) it is built on the first story's offering, ordered inside this stub.
- [ ] `[MVP]` As the owner, I want the status line to name a sent-back plan by its own title, so that I recognise it instead of reading "REVISION 1".
  - Acceptance: after a send-back, the status line and every plan list show the plan's title, not "REVISION 1". Whether the fix is in the title reader or in the rejection header is the Product Owner's call; the reader has not been located yet.
  - INVEST: pass on all six.
- [ ] As the coordinator, I want the `claude:reject` command with a plan, a stage and a reason to perform the send-back instead of printing the menu, so that the non-interactive route works as named.
  - Acceptance: `node src/commands/start.js claude:reject <ref> <stage> "<reason>"` on a build-queue plan moves it back; a wrong stage is refused with a message, never by printing the menu.
  - INVEST: pass; (E) the cause of "only printed the menu" is reported, not traced, so the plan starts by reproducing it.

### Stub: The menu prints the exact answer command for every option of every streamed question

Carries: "Answer lines are hard to get."

Activities (backbone):
1. Open a plan's questions in the menu.
2. Copy the answer command for the chosen option.
3. Run it and see the answer recorded.

Stories:
- [ ] `[MVP]` As the coordinator, I want the menu to print, per question and per option, the exact `stream answer <plan> <question id> <option key> <digest>` line, so that I never compute digests with a scratch script.
  - Acceptance: for a plan with two questions of two options each, the menu prints four answer lines, one per line, each runnable as printed; the digest matches what the answer route accepts.
  - INVEST: pass on all six.
- [ ] `[MVP]` As the coordinator, I want a printed answer line, run as is, to record that answer, so that the printed line is proven correct end to end.
  - Acceptance: running one printed line through the real menu records the answer and the question leaves the pending list.
  - INVEST: pass; (I) it tests the first story's output.
- [ ] As the owner, I want the printed lines to be readable next to the question text, so that I can pick an answer without reading JSON.
  - Acceptance: each answer line sits under its question's prompt and option label, outside the JSON block. Whether this is the stream screen itself or a separate `stream answers <plan>` view is the Product Owner's choice (an open unknown in the vision).
  - INVEST: pass on all six.

### Stub: The pre-build check accepts a slice that edits a file an earlier slice creates

Carries: "The pre-build check misreads edits."

Related but NOT covering it, because both fix the prose contradiction scan at completion, which is a different check (paths confirmed by Glob in this pass):
- "The plan checker does not read a quotation as a claim that the plan creates a file" (`plans/functional/a-quotation-is-not-a-file-claim.md`)
- "A method name in plan prose is not a missing file" (`plans/implementation/a-method-name-in-plan-prose-is-not-a-missing-file.md`)

Activities (backbone):
1. Reproduce the refusal and confirm its cause.
2. Move a slice that edits an earlier slice's new file into the build queue.

Stories:
- [ ] `[MVP]` Spike: As the planner, I want the refusal reproduced on a pair of slices where the second only edits a file the first creates, so that the fix aims at the check that really refused.
  - Acceptance: the plan records the exact refusal text and the function that produced it; if it is not `checkPlanDeclaresCountMovers` in `src/lib/documented-counts.js` (called at `src/lib/plan-validator.js:1341`), the plan is rewritten around the real check before any build step.
  - INVEST: pass as a time-boxed spike; (V) its value is choosing the right fix.
- [ ] `[MVP]` As the planner, I want the check before the build queue to accept a slice that only edits a file an earlier, not-yet-built slice creates, so that dependent slices are not refused or forced to declare a `CLAUDE.md` they do not need.
  - Acceptance: through `validateForQueue`, a slice that depends on the creating slice and declares that file is accepted without declaring `CLAUDE.md`; a slice that really creates a counted file and omits `CLAUDE.md` is still refused with today's message.
  - INVEST: pass; (I) ordered after the spike inside this stub.

### Stub: The classification brief for the gate critic carries the plan file modification time

Carries: "Gate critics lack the plan file time."

Activities (backbone):
1. Promote a classify task and build its brief.
2. The gate critic classifies, and its result is accepted.

Stories:
- [ ] `[MVP]` As the gate critic, I want the classification brief to carry the plan file's modification time, so that my stamp matches the plan I read and is not refused as superseded.
  - Acceptance: the brief built for a promoted `classify` task names the task id, the plan path, "classify the questions of `{ref}`" and `planMtimeMs`, as `agents/iron-loop/gate-critic.md` requires.
  - INVEST: pass on all six.
- [ ] `[MVP]` As the coordinator, I want a classification made after a plan edit to be accepted when it carries the new modification time, and refused when it carries the old one, so that the out-of-date refusal fires only when it should.
  - Acceptance: edit the plan, run the classification with the fresh time: accepted; replay it with the old time: refused as superseded.
  - INVEST: pass on all six.

### Stub: The background-agent protection is measured before the owner decides whether it is on

Carries: "The background-agent protection may not hold."

Related (paths confirmed by Glob in this pass):
- "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection" (`plans/functional/an-agent-cannot-switch-off-ctocs-own-protection.md`)
- "A background agent is refused when it writes Claude Code's settings files or CTOC's .ctoc/settings.json" (`plans/review/a-background-agent-cannot-change-claude-codes-settings.md`)
- The open owner question named in the header of `src/hooks/protect-records.js`: isolating background agents from the main project's records. This stub does not answer it; the owner's decision on the refusal switch is put to him next to it.

Activities (backbone):
1. Measure the hook on crafted input.
2. Record the verdict and put the decision to the owner.
3. Carry out the owner's decision.

Stories:
- [ ] `[MVP]` Spike: As the owner, I want the hook fed crafted input (a JSON payload with a non-empty `agent_id`) for `menu task complete … --continue` and for an inline `node -e` that loads `src/lib/actions`, on the current release and never in a real shell, so that I decide on a measured result.
  - Acceptance: the plan records, before any build step, the hook's verdict for both calls and whether the pass-through is the `RECORD_REFUSALS_OFF = true` switch (`src/hooks/protect-records.js:1053`) or a defect in the refusal.
  - INVEST: pass as a spike.
- [ ] `[MVP]` As the owner, I want the measured verdict put to me as one decision, whether the background-agent menu refusal is switched back on, so that my order of 2026-10-15 is changed only by me.
  - Acceptance: one question with exactly one Recommended option, its reason and the evidence strength; nothing in the hook changes before the answer. Changing a hook needs the owner's explicit approval.
  - INVEST: pass.
- [ ] As the owner, I want my decision carried out and proven by the same crafted-input test, so that the hook does what I decided.
  - Acceptance: if he switches the refusal on, both crafted calls are refused for a background agent and allowed for the main session; if he keeps it off, the plan records that and changes no hook.
  - INVEST: pass; (E) its size depends on the decision.

### Stub: Send-backs from review and security rounds count toward the three-per-step limit

Carries: "Review rounds were driven by hand; send-backs from review and security rounds are counted nowhere." Only the narrow gap is filed. The by-hand relaying is answered by the existing `claude:start-agent` route with the iron-loop executor; this stub is not a new step-runner or "advance-agent" route.

Activities (backbone):
1. Confirm where a review or security send-back is recorded today.
2. Put the change to the owner.
3. Count those send-backs and escalate at the limit, if he approves.

Stories:
- [ ] `[MVP]` Spike: As the owner, I want it shown where a send-back from a review or security round goes today and that it never reaches `recordStepKickback` (two callers, `src/lib/actions.js:1340` and `:1460`, both inside `completeExecution`), so that the gap is stated on evidence.
  - Acceptance: the plan records the path a review or security send-back takes and the counts before and after one such send-back.
  - INVEST: pass as a spike.
- [ ] `[MVP]` As the owner, I want the circuit-breaker change put to me as one decision, so that gate logic changes only on my explicit approval.
  - Acceptance: one question with exactly one Recommended option; nothing is built before the answer. Changing gate logic needs the owner's explicit approval.
  - INVEST: pass.
- [ ] As the owner, I want a fourth send-back of one step from review or security rounds to stop the loop and escalate to me, so that those rounds have the same limit as the others.
  - Acceptance: driving three review or security send-backs of one step counts three; the fourth escalates to the owner, as a failed verify does today. Built only after his approval.
  - INVEST: pass.

### Stub: Surviving mutants from mutation testing have a recorded place in the plan

Carries: "Surviving mutants are unrecorded."

Activities (backbone):
1. Run mutation testing during a build.
2. Record each surviving mutant in its defined place.

Stories:
- [ ] `[MVP]` As the iron-loop executor, I want a defined place in the implementation plan for each surviving mutant with its file, its change and its disposition, so that I stop improvising Decisions for them.
  - Acceptance: a plan that lists surviving mutants in that place passes the plan checker; the executor's instructions name the place. Whether it is a template section, an iron-loop step or a validator check is the Product Owner's choice (an open unknown in the vision).
  - INVEST: pass on all six.
- [ ] As the reviewer, I want a surviving mutant with no disposition to be visible at review, so that it is either killed by a test or accepted with a written reason.
  - Acceptance: a plan with a listed mutant and an empty disposition is flagged by the real check the first story chose.
  - INVEST: pass; (I) built on the first story's place.

### Stub: The operating lessons say CTOC is built with CTOC and friction is filed as a plan

Carries: "The operating lesson: CTOC is built with CTOC."

Activities (backbone):
1. Trace where the lesson lists come from.
2. Add the lesson everywhere the lists live, within the size limit.

Stories:
- [ ] `[MVP]` Spike: As the planner, I want it traced whether the repository's `CLAUDE.md` lesson block is filled from `.ctoc/templates/operating-lessons.md`, so that I know whether the new lesson must fit the reported 270 bytes of room.
  - Acceptance: the plan records the current byte size of `CLAUDE.md` (measured, not relayed) and every file the lesson must land in.
  - INVEST: pass as a spike.
- [ ] `[MVP]` As every maintainer, I want the lesson "CTOC is built with CTOC; friction found while dogfooding is filed as a plan, not worked around" in `docs/OPERATING_LESSONS.md`, `.ctoc/templates/operating-lessons.md`, `.ctoc/templates/CLAUDE.md.template` and the repository's `CLAUDE.md`, so that the owner's ruling of 2026-10-20 is a standing rule.
  - Acceptance: `tests/claude-md-lessons.test.js` and `tests/claude-md-keeps-every-rule.test.js` (with `tests/fixtures/claude-md-rule-inventory.json`) pass, and `CLAUDE.md` stays at or under 15,000 bytes without cutting another rule.
  - INVEST: pass.

### Stub: Opening the menu in a fresh worktree writes no stray half-filled IRON_LOOP.md

Carries: "Opening the menu in a fresh worktree writes a stray file."

Activities (backbone):
1. Open the menu in a fresh worktree.
2. Find the repository unchanged.

Stories:
- [ ] `[MVP]` Spike: As the planner, I want it traced why opening the menu runs project setup in a fresh worktree but not in the main checkout, so that the fix aims at the real trigger.
  - Acceptance: the plan records the condition that starts project setup and why a fresh worktree meets it.
  - INVEST: pass as a spike.
- [ ] `[MVP]` As the coordinator, I want opening the menu in a fresh worktree to leave no untracked file with an unfilled `{{PROJECT_NAME}}` placeholder, so that worktrees stay clean.
  - Acceptance: in a fresh worktree, `node src/commands/start.js plan todo/<plan>.md` leaves `git status` without a new `IRON_LOOP.md`, and no file written by `src/lib/init-project.js` (template at `:708`, write at `:795-803`) contains `{{PROJECT_NAME}}`.
  - INVEST: pass.

## Dependency analysis

- Story-level edges live only inside a stub (a spike or measurement before the change it informs; an offering before the route that takes it). Longest chain: three stories (measure, owner decision, carry out). No cycles.
- Between the nine stubs: no technical dependency. None needs another to exist first, so every `dependsOn` is empty.
- No cross-goal dependency.

### Shared files (a sequencing concern for whoever schedules, not a dependency)

| File | Stubs or existing plans that edit it |
|---|---|
| `src/lib/streaming-gate.js` | A plan in the build queue can be sent back to technical planning and keeps its title; The menu prints the exact answer command for every option of every streamed question |
| `src/lib/actions.js` | A plan in the build queue can be sent back to technical planning and keeps its title (`rejectPlan`); Send-backs from review and security rounds count toward the three-per-step limit (`completeExecution`, `recordStepKickback`) |
| `src/commands/start.md` | The classification brief for the gate critic carries the plan file modification time; the existing slice "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect" (`plans/implementation/00412-small-changes-take-a-small-path-s12-critique-queue-and-four-lenses.md`) |
| `src/hooks/protect-records.js` | The background-agent protection is measured before the owner decides whether it is on; related existing plans "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection" and "A background agent is refused when it writes Claude Code's settings files or CTOC's .ctoc/settings.json" |
| `src/lib/plan-validator.js` | The pre-build check accepts a slice that edits a file an earlier slice creates; possibly Surviving mutants from mutation testing have a recorded place in the plan, if that place is a validator check |

## Self-validation checklist

| Check | Result |
|---|---|
| 2-4 goals | Pass: three goals. |
| Measurable success metric per goal | Pass. |
| 2-3 activities per goal | Deviation, recorded below: activities are given per stub, two or three each. |
| 2-5 stories per activity | Deviation, recorded below: two to four stories per stub; stories were not padded. |
| Every story passes INVEST | Pass, with the qualified letters noted per story. |
| No circular dependencies | Pass. |
| Dependency chain depth at most three | Pass. |
| 2-6 stubs | Deviation, recorded below: nine stubs. |
| Walking skeleton per stub | Pass: every stub has `[MVP]` stories. |
| No horizontal slices | Pass: every stub ends in a change a maintainer can see or run. |
| Every story has a "so that" benefit | Pass. |
| No overlapping scope between stubs | Pass: each friction is in exactly one stub; shared files are listed above. |
| Vision intent preserved | Pass: each stub carries one or two frictions from the vision verbatim. |

## Decisions Taken Under Ambiguity

- **No questions were asked.** Dispatched in the background with no human present.
- **Nine stubs, above the agent file's cap of six.** The CTO Chief's brief prefers small, independently buildable plans and says to group only frictions that share a fix site or a user journey. Only the build-queue send-back and the "REVISION 1" status line meet that bar. Merging further would join unrelated defects and break Independent and Small.
- **The "REVISION 1" friction joins the send-back stub.** They share `rejectPlan` and one user journey, and the vision's own success example ("lands the plan back in technical planning with its title intact") covers both. This also removes the vision's "must run one after the other" constraint.
- **Goals are grouped above stubs, not one stub per goal.** The three goals are the impact map; the stubs are the frictions under them. The story-map counts (two or three activities per goal, two to five stories per activity) are not forced on one-defect stubs, and the "merge anything under three days" rule is not applied, for the same reason as the stub count.
- **No phases, no deferral.** The agent file's "Flesh out" and "Polish" phases were not used: the owner alone schedules. Stories are walking skeleton or remaining, nothing more.
- **Every `dependsOn` is empty.** File overlaps are listed as a sequencing concern, not as dependencies.
- **Spikes first where the cause is reported or only the most likely one.** The protection stub starts with the measured hook check, the pre-build stub with reproducing the refusal, the counting stub with showing the send-back path, the lesson stub with measuring `CLAUDE.md` and tracing the lesson injector, and the stray-file stub with tracing the setup trigger.
- **Open product choices are left to the Product Owner.** These are: stream screen or a separate answers view; template section, step or validator check for mutants; title reader or rejection header for "REVISION 1".
- **The two owner decisions stay inside their stubs.** They are switching the background-agent menu refusal back on, and counting review and security send-backs. Neither is asked now. The first cannot be asked well before the measurement exists, and the second belongs to the moment that plan is refined.
- **Verified in this pass:** `STAGE_ORDER` in `src/lib/gate-order.js:21`; `rejectPlan` at `src/lib/actions.js:835` with the header at `:886`; the review-only send-back block at `src/lib/streaming-gate.js:1693` and `:1697`; the `stream answer` composition at `src/lib/streaming-gate.js:518`; `recordStepKickback(` at `src/lib/actions.js:1340`, `:1460` and the definition at `:1803` (Grep of the pattern over `src/lib/actions.js`). Everything else is carried from the vision with its original label.
- **No instruction in the vision was acted on beyond the decomposition.** None was found that asked for anything else.
