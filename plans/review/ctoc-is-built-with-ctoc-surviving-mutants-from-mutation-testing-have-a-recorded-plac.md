---
title: "Surviving mutants from mutation testing have a recorded place in the plan"
created: "2026-10-20T13:37:49.348Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 8
risk_level: MEDIUM
files:
  - src/lib/plan-validator.js
  - tests/plan-validator.test.js
  - agents/iron-loop/iron-loop-executor.md
  - agents/iron-loop/iron-loop-integrator.md
---

# Surviving mutants from mutation testing have a recorded place in the plan

## Problem Statement
When a build runs mutation testing and some mutants survive, the iron-loop executor has no defined place in the implementation plan to record them, so it improvises: on 2026-10-20 it wrote them as entries under `## Decisions Taken Under Ambiguity` (reported), and earlier builds invented their own mutant tables under headings of their own choosing (read, see below). Nothing then checks that each survivor was dealt with, so a mutant the tests did not catch can reach review with no test added and no written reason, and the next builder or reviewer has no single place to look. Done when an implementation plan has a defined place for each surviving mutant with its file, its change and its disposition, the executor's instructions name that place, and a real check shows a listed mutant without a disposition.

### Verified while refining
- **Read by the vision advisor:** neither "mutant" nor "mutation" appears in `.ctoc/templates/implementation-plan.md.template`, `src/lib/iron-loop.js`, `src/lib/plan-validator.js`, `agents/iron-loop/iron-loop-executor.md` or `agents/iron-loop/iron-loop-integrator.md` (0 matches in each; this shows absence from those five files, not from the repository).
- **Read in this pass, the binding constraint:** the approval record's digest of a plan (`computeSpecHash`, `src/lib/approval-ledger.js:410-479`) covers the whole file except the headings listed in `EXECUTION_SECTION_PRODUCERS` (`:298-317`) and checkbox lines. `## Execution Record` (`:299`) and `## Decisions Taken Under Ambiguity` (`:304`) are listed; a heading deeper than an exempt one stays exempt (`:467-469`). Any other section the executor adds mid-build is hashed, and a changed digest cancels the build's own write permission. This is most likely why the builder used the Decisions section: it was the exempt section at hand.
- **Searched in this pass:** the template `.ctoc/templates/implementation-plan.md.template` is named by no file outside `plans/` (pattern `implementation-plan\.md\.template`, whole repository except `plans/`: 0 files). That is a text search, not a runtime trace; it shows no code or agent names the file. The template also still lists the old step numbering (Steps 7-15, its lines 131-142).
- **Read in this pass:** the executor's completion route, `menu task complete <id>`, runs `completeTaskPlan` then `completeExecution` (`src/lib/actions.js:1732`, `:1328`), which runs `validateForReview` (`:1332`). A refusal is printed with every error, "NOT completed … failed pre-review validation and stays in in-progress (this is a kickback, recorded by the circuit breaker)" (`src/lib/menu-screens.js:2728-2739`), and is counted against Step 14 when every step box is ticked (`failingStepFrom`, `src/lib/actions.js:1766-1782`). A completion that is not refused returns no warnings at all (`src/lib/actions.js:1745-1753`), so a warning-only check there would reach no one.
- **Read in this pass, how builders recorded mutants without a defined place:** "Close the dark ranges in the plan-operations module (actions.js)" (24 mutants, two survived on the first pass and were fixed in the test file), "Remainder: the plan pipeline, plan state and the plan index", "Remainder: the hooks, the three commands, and the release scripts" and "Remainder: the streaming store, the continuation state, the inbox and the claim fetcher" each invented a table under a heading of their own ("Red provenance", "Mutation evidence", a Step 8 note). The columns vary but always name the mutant, where it is, what was changed and which test killed it.
- **Searched in this pass:** no file in the repository has a heading starting "Surviving Mutants" (pattern `^#{1,6}\s+Surviving Mutants`, case-insensitive, whole repository: 3 files) except this plan's own title and the mutation test runner's report format (`agents/testing/runners/mutation-test-runner.md:104`, `skills/testing/runners/mutation-test-runner/SKILL.md:292`), which lists only the top five survivors. So the new check changes the verdict of no existing plan.

## Decomposition

Source: `plans/decomposition/ctoc-is-built-with-ctoc.md`. Stories marked `[MVP]` are the smallest end-to-end version; the others are the remaining stories, with no phase or schedule (the owner alone chooses what is built and when).

### Vision item carried
- "Surviving mutants are unrecorded."

### Goal: What was learned while dogfooding is recorded where the next builder finds it
- **Actor:** the iron-loop executor and integrator writing and building plans, and every future maintainer.
- **Impact:** the builder records surviving mutants in a defined place instead of improvising.
- **Success metric:** surviving mutants have a defined, validated place in an implementation plan.

### Activities
1. Run mutation testing during a build.
2. Record each surviving mutant in its defined place.

### Stories
- [ ] `[MVP]` As the iron-loop executor, I want a defined place in the implementation plan for each surviving mutant with its file, its change and its disposition, so that I stop improvising Decisions for them.
  - Acceptance: a plan that lists surviving mutants in that place passes the plan checker; the executor's instructions name the place. Whether it is a template section, an iron-loop step or a validator check is the Product Owner's choice (an open unknown in the vision).
  - INVEST: passes all six criteria.
- [ ] As the reviewer, I want a surviving mutant with no disposition to be visible at review, so that it is either killed by a test or accepted with a written reason.
  - Acceptance: a plan with a listed mutant and an empty disposition is flagged by the real check the first story chose.
  - INVEST: passes; Independent is qualified, because it is built on the first story's place.

### Dependencies
- Story level: the review flag depends on the defined place.
- Plan level: none.
- Shared file (a scheduling concern, not a dependency): `src/lib/plan-validator.js` with "The pre-build check accepts a slice that edits a file an earlier slice creates", only if this plan chooses a validator check.

## Business Alignment

**Job to Be Done:** When a mutation run during a build leaves mutants alive, I want to write each one down in one known place with where it is, what was changed and what I did about it, so I can finish the build without inventing a format, and a reviewer can see that none was left open.

**Impact Map:**
- **Goal:** What was learned while dogfooding is recorded where the next builder finds it. The vision lists "A recorded place for surviving mutants" under what we are building.
- **Actor:** the iron-loop executor building a plan, and the iron-loop integrator writing the steps the executor follows. The vision's target users name the iron-loop executor among the background agents that build CTOC for the owner.
- **Impact:** the executor records every surviving mutant in one place with a disposition, instead of improvising entries under Decisions or under a heading of its own; a survivor left without a disposition is named when the executor completes the build.
- **Deliverable:** the defined place (`### Surviving Mutants` inside `## Execution Record`), the executor's and the integrator's instructions naming it, and the completion check naming every survivor without a valid disposition.

**Alignment checks:**
1. Does the Goal trace back to the vision's problem statement? YES. "Surviving mutants from mutation testing have no recorded place in a plan" is one of the vision's ten frictions.
2. Is the Actor in the vision's target audience? YES. The iron-loop executor is named there.
3. Is the Impact observable? YES. The completion's printed result names an open survivor (scenarios 5 to 8), and the record is one heading a reader can find.
4. Is the Deliverable one functional area? YES. It records the outcome of one build activity and checks it at one moment.

## User Stories

**As** the iron-loop executor, **I want** one defined place in the plan's build record for every mutant that survived a mutation run, holding its file and line, its change and its disposition, **so that** I record survivors the same way in every plan, without improvising entries under Decisions and without losing the build's write permission. `[MVP]`

- INVEST: Independent: yes; the place and the instructions stand without the second story. Negotiable: the heading, its parent section and the four columns are fixed because the check and the approval digest depend on them; the wording of the instructions is open. Valuable: yes, to the executor and to every later reader of the plan. Estimable: yes; two agent files and one proof that the record keeps the approval. Small: yes, one build cycle. Testable: yes, scenarios 1 to 4.

**As** the reviewer of a finished build (the iron-loop critic at the final review, and the owner), **I want** a surviving mutant without a valid disposition to be named when the executor completes the build, **so that** every survivor is either killed by a test or accepted with a written reason before the plan reaches review.

- INVEST: Independent: qualified; it reads the place the first story defines, so it is ordered after it inside this plan. Negotiable: whether the completion is refused or only reports it is the owner's question below; the message wording is open. Valuable: yes; no open survivor reaches review unseen. Estimable: yes; one check in the completion's validation and its tests. Small: yes, one build cycle. Testable: yes, scenarios 5 to 8.

## Acceptance Criteria

- [x] **Scenario: Recording survivors keeps the build's approval**
  Given an implementation plan in the build whose recorded approval matches its text
  When the executor adds a `### Surviving Mutants` table, one row per surviving mutant, inside the plan's `## Execution Record` section
  Then the plan's recorded approval still matches its text
  And the executor's next edit to a file the plan declares is allowed

- [x] **Scenario: A fully recorded table passes the completion**
  Given a plan in the build with every step box and every acceptance criterion ticked, and a surviving-mutants table with two rows: one whose disposition reads `killed by tests/example.test.js — <test name>` for a test file that exists, and one whose disposition reads `accepted: <reason>`
  When the executor runs `menu task complete <id>`
  Then the completion is not refused, and its printed result says nothing about surviving mutants
  And the plan moves to `plans/review/`

- [x] **Scenario: A build that ran no mutation testing is unaffected**
  Given a plan in the build with no `### Surviving Mutants` heading, or with the heading and a table that has no rows
  When the executor runs `menu task complete <id>`
  Then the printed result says nothing about surviving mutants
  And the completion is accepted or refused for the same reasons as before this change

- [x] **Scenario: The executor's and the integrator's instructions name the place**
  Given the executor's instructions in `agents/iron-loop/iron-loop-executor.md` and the integrator's in `agents/iron-loop/iron-loop-integrator.md`
  When each file is searched for the literal heading `### Surviving Mutants`
  Then the executor's file holds it together with its parent heading `## Execution Record`, the four columns Mutant, File and line, Change and Disposition, the two dispositions, and the rule that every mutant that survived the run is recorded, not only the ones a report lists
  And the integrator's file holds it in the instruction that a step which runs mutation testing names this place for its survivors

- [x] **Scenario: A survivor without a disposition is named at completion**
  Given a plan in the build with every step box and every acceptance criterion ticked, and a surviving-mutants row for `src/lib/example.js:45` whose Disposition cell is empty
  When the executor runs `menu task complete <id>`
  Then the printed result names `src/lib/example.js:45` and the two accepted dispositions, `killed by <test file>` and `accepted: <reason>`
  And, on the recommended answer to the owner's question below, the completion is refused, the plan stays in `plans/in-progress/`, and the refusal is counted as one send-back of the verify step (Step 14)

- [x] **Scenario: A disposition in neither form is named**
  Given a surviving-mutants table with one row whose disposition reads `fix later` and one whose disposition reads `accepted:` with nothing after the colon
  When the executor runs `menu task complete <id>`
  Then the printed result names both rows, and says that the first is in neither accepted form and the second gives no reason

- [x] **Scenario: A killed disposition that names a missing test file is named**
  Given a surviving-mutants row whose disposition reads `killed by tests/no-such-file.test.js`, and no such file exists in the project
  When the executor runs `menu task complete <id>`
  Then the printed result names that row and the missing file `tests/no-such-file.test.js`

- [x] **Scenario: Every open row is named, and only the open rows**
  Given a surviving-mutants table with three rows, where the first and the third have an empty disposition and the second reads `accepted: <reason>`
  When the executor runs `menu task complete <id>`
  Then the printed result names the first and the third row
  And it does not name the second row

## Scope

### In Scope
- The defined place: a `### Surviving Mutants` heading inside the plan's `## Execution Record` section, holding a table with the columns Mutant, File and line, Change and Disposition, one row per mutant that survived a mutation run during the build (scenarios 1, 2 and 3).
- The two dispositions: `killed by <test file> — <test name>`, and `accepted: <reason>` (scenarios 2, 5, 6 and 7).
- The executor's instructions (`agents/iron-loop/iron-loop-executor.md`) name the place, its columns, the two dispositions and the rule that every survivor of a run is recorded (scenario 4).
- The integrator's instructions (`agents/iron-loop/iron-loop-integrator.md`) say that a step which runs mutation testing names the place (scenario 4).
- The completion check that `menu task complete <id>` runs (`validateForReview` in `src/lib/plan-validator.js`) reads the place and names every row with an empty disposition, a disposition in neither form, an `accepted:` with no reason, or a `killed by` naming a test file that does not exist (scenarios 5 to 8).
- A plan without the place keeps today's completion verdict (scenario 3).

### Out of Scope
- A section in `.ctoc/templates/implementation-plan.md.template`. No file outside `plans/` names that template (see "Verified while refining"), so a section there reaches no builder. Not part of this plan.
- A new exempt heading in the approval record's list (`EXECUTION_SECTION_PRODUCERS`, `src/lib/approval-ledger.js:298-317`). It is not needed, because the record sits inside `## Execution Record`, which is already exempt; changing that list moves the approval boundary. Not part of this plan.
- A checkbox in the build checklist generated for every plan (`generateExecutionPlan`, `src/lib/iron-loop.js:56-139`). It would put a box on every plan, including the many that run no mutation testing. Not part of this plan.
- The mutation test runner's report listing only its top five survivors (`agents/testing/runners/mutation-test-runner.md:104`, `skills/testing/runners/mutation-test-runner/SKILL.md:292`). Both files are declared by "The mutation test runner, agent and skill, improved three times from fresh web research". This plan covers the gap from the executor's side: every survivor of the run is recorded, not only the ones a report lists.
- Whether and how a plan runs mutation testing: the tool, the mutants and any mutation-score floor stay with the plan that runs it. This plan only records what survived.
- A check at the move from review to done (`validateReviewToDone`). The completion check sees the record first. Not part of this plan.
- Rewriting the improvised mutant tables or Decisions entries in plans already finished. Not part of this plan.
- Counting send-backs from review and security rounds toward the limit. That is "Send-backs from review and security rounds count toward the three-per-step limit".
- Splitting the planner's decisions from the executor's in `## Decisions Taken Under Ambiguity` (the loss disclosed in `src/lib/approval-ledger.js:263-273`). Unrelated; not part of this plan.

## Risks

### Technical Risks
- **The record is written outside `## Execution Record`:** a builder writes a top-level `## Surviving Mutants`, or table rows under a step heading. The approval digest covers both, so the build loses its write permission mid-build.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Name the exact heading and its parent in the executor's instructions and in the completion's message; pin with scenario 1 that the record inside `## Execution Record` keeps the approval.
- **The check refuses a plan it should accept:** a table read wrongly (a `|` inside a code span in the Change cell, a row with a missing cell, a row wrapped over two lines) is taken as an open row.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test a Change cell holding a backticked `|` and a row with a missing cell; run the new check over every plan under `plans/` in a scratch run and record that no verdict changes (no plan holds the heading today).
- **A `killed by` disposition is trusted by its text:** the check cannot re-run the mutant, so a named test that does not really kill it passes.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Check that the named test file exists; state in the executor's instructions that the mutant is re-run and seen killed before its row says `killed by`; the critic's final review reads every row.

### Business Risks
- **Thin "accepted" reasons:** an executor accepts survivors with a one-word reason to get past the check.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: State in the executor's instructions that an `accepted:` reason says why the change has no observable effect and how that was shown; the reason stays in the plan for the final review to read.

### Dependency Risks
- **Shared files with other plans:** `src/lib/plan-validator.js` is also declared or edited by "The pre-build check accepts a slice that edits a file an earlier slice creates", "The plan checker does not read a quotation as a claim that the plan creates a file", "A method name in plan prose is not a missing file — the created-file claim parser stops crying wolf", "The done gate reads the record the executor wrote — and the approval hash exempts the Deferred Questions the pipeline itself emits", "The done check finds the build record by its evidence, not by its heading name" and "Every agent compiles, once per update, into a checked structured form that a model can be handed at call time; the prose stays whole and stays the source". `agents/iron-loop/iron-loop-executor.md` is declared by "The iron-loop executor — the builder of this run — improved three times from fresh web research", "CTOC keeps working and asks only what matters" and the structured-form plan above. `agents/iron-loop/iron-loop-integrator.md` is declared by "The iron-loop integrator improved three times from fresh web research".
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Declare all three files in the implementation plan's `files:` so the scheduler's file claims keep two builds off one file; re-read each file at build time, since another plan may have changed it after this refinement.
- **The owner's answer changes the second story:** on "report, never refuse", the last line of scenario 5 becomes "the plan moves to review and the printed result names the row", and the completion's printed result must first learn to carry the check's warnings.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Keep the first story and scenarios 1 to 4 independent of the answer; write only the refusal lines of scenario 5 as conditional on it.

## Priority

**Priority: MEDIUM** (Score: 6/9)
- Dependency: 2 — parallel with the other stubs of this vision; none depends on this one and it depends on none.
- Business Impact: 2 — supports the vision's primary goal (CTOC built through its own menu without a by-hand workaround); one of ten frictions.
- Technical Risk: 2 — moderate: two agent files and one new check, with the approval digest as the one sharp edge.

## Questions for the owner

### Should a surviving mutant with no disposition refuse the executor's completion, or only be reported?

The completion check runs when the executor finishes a build and the plan moves into review. Making it refuse a plan is a new refusal in that check, which is gate logic, and gate logic changes only with your explicit approval. Each refusal is counted by the existing send-back limit: three per step and five per plan, then it escalates to you.

**a) Refuse the completion. Recommended.**
- Pros: no survivor reaches review without a disposition. The check already treats a step marked skipped with no written reason the same way (`validateEscalations`, `src/lib/plan-validator.js:569-636`). The codebase's own rule at `src/lib/plan-validator.js:1338`: "A hard ERROR (a warning would be ignored)".
- Cons: adds a refusal to the check at the move into review. Each refusal counts as a send-back of the verify step (Step 14), and a fourth on one step escalates to you.
- Why recommended: it is the only option that guarantees a disposition for every survivor before review. Evidence: read in source in this pass; strong.

**b) Report it, never refuse.**
- Pros: no new refusal and no new send-back count.
- Cons: the completion's printed result carries no warnings today (`src/lib/actions.js:1745-1753`), so this option also changes that output to print them. The plan reaches review with the survivor open, and the check at the move from review to done does not look at it.

New ideas in this question, for you to check:
- Counting the refusal against the verify step (Step 14) is the existing fallback (`failingStepFrom`, `src/lib/actions.js:1766-1782`), not a new rule.
- Option b's change to the completion's printed result is new, proposed here.

Should a surviving mutant with no disposition refuse the executor's completion, or only be reported?

**a)** Refuse the completion. Recommended.
**b)** Report it in the completion's printed result, never refuse.

Reply with a letter.

For the gate critic: proposed topic security-posture, because the answer changes what the check at the move into review refuses; important, not critical. The first story and scenarios 1 to 4 do not wait on this answer; only the refusal lines of scenario 5 do.

## Decisions Taken Under Ambiguity

1. **Where the record lives**: chose a `### Surviving Mutants` heading inside `## Execution Record`, because the approval digest exempts that section and every heading below it (`src/lib/approval-ledger.js:299`, `:467-469`), while any new section is hashed and cancels the build's write permission. This needs no change to the approval record's exempt list. Of the vision's three options (a template section, a step in the iron loop, a check in the plan validator), the place is a plan section that the agents' instructions name and the plan validator checks; the template and the generated step lines are not used (decisions 2 and 3).
2. **Not the implementation-plan template**: chose not to add a section to `.ctoc/templates/implementation-plan.md.template`, because no file outside `plans/` names it (text search, 0 files) and it still carries the old step numbering. A section there would reach no builder.
3. **Not a checkbox in the generated build checklist**: chose not to change `generateExecutionPlan` (`src/lib/iron-loop.js:56-139`). It runs for every plan at the move into the build queue (`src/lib/actions.js:651-655`), and an unticked box blocks completion, so a box would burden every plan that runs no mutation testing. The integrator names the place only in steps that run mutation testing.
4. **The check sits in the completion's validation, not at the done crossing**: chose `validateForReview`, because it runs on every `menu task complete` (`src/lib/actions.js:1332`) and its refusals are printed with each error (`src/lib/menu-screens.js:2728-2739`). Whether it refuses or only reports is the owner's question above; the acceptance criteria are written for the recommended answer, with the refusal lines marked as conditional.
5. **Columns follow the builders' own tables**: chose Mutant, File and line, Change, Disposition. The four finished plans named under "Verified while refining" each recorded the mutant, where it was, what was changed and which test killed it; the Disposition column replaces "killed by" so that an accepted survivor fits too.
6. **Two dispositions only**: `killed by <test file> — <test name>` means a test was added or tightened, the mutant was re-run, and that test failed on it. `accepted: <reason>` covers a mutant that changes no observable behaviour (an equivalent mutant), with the reason saying how that was shown. "Close the dark ranges in the plan-operations module (actions.js)" recorded such a case: a reset no single-line mutation could observe. Any other text is open and is named by the check.
7. **The check verifies that a `killed by` test file exists, nothing more**: it cannot re-run the mutant. Whether the named test really kills it is for the review steps to read. A file-presence check is an exact presence check, not a claim about behaviour.
8. **Every survivor, not the report's top five**: the mutation test runner's report lists only the top five survivors. The executor's instructions require every survivor of the run. The runner's own files belong to "The mutation test runner, agent and skill, improved three times from fresh web research", so this plan does not edit them.
9. **What counts as a surviving mutant**: any mutant made during the build, by a tool or by hand, that the tests (or a proof script meant to refuse it) did not catch on its run. The builders in this repository mostly made mutants by hand, in memory, for the failing-test evidence of characterisation slices.
10. **The integrator is included**: the decomposition's goal names "the iron-loop executor and integrator writing and building plans" as the actor, and the integrator writes the step lines the executor follows. It gets one instruction, nothing more.
11. **Story markers kept from the decomposition**: the first story is marked `[MVP]` and the second is not, as in `plans/decomposition/ctoc-is-built-with-ctoc.md`. Both are in this plan's acceptance criteria. The owner alone chooses what is built and when.
12. **Priority MEDIUM (6 of 9)**, the same as the stub.
13. **`risk_level: MEDIUM`**: taken as the highest impact among the risks. No risk has a HIGH impact; the one HIGH likelihood (shared files) has a MEDIUM impact.
14. **Instruction text proven by a presence check**: scenario 4 checks literal text in two agent files. That is an exact presence check, the one use of a text search the owner allows. The behaviour is proven through the real approval check (scenario 1) and the real completion route (scenarios 2, 3 and 5 to 8).
15. **No status file and no questions file written**: the brief allows edits to this one plan file only. No `.status` file exists for this plan (Glob of `plans/functional/ctoc-is-built-with-ctoc-*.status`: no files). The owner's question is in this plan; the CTO Chief dispatches the gate critic's classification.
16. **Overlap check**: of the sibling stubs of this vision, only "The pre-build check accepts a slice that edits a file an earlier slice creates" mentions mutants, and only as a shared-file note about `src/lib/plan-validator.js`. No two stubs describe the same behaviour.
17. **No instruction in the ancestry was acted on beyond the refinement.** The vision, the decomposition and the stub contain none that asks for anything else.

## Implementation Details

### Settled by the owner, built on, not re-asked

- "Should a surviving mutant with no disposition refuse the executor's completion, or only be reported?" Answered **Refuse the completion** (option 1, the recommended one): `.ctoc/streaming/answers.jsonl` line 254, question `q10-surviving-mutant-without-disposition-refuses-completion`. The refusal lines of scenario 5 hold as written.
- "Where and in what shape does a build record its surviving mutants?" Answered **Table inside the build record, as the plan chooses** (option 1): line 256, question `q11-survivor-record-shape-r1792506215818`. The approval record's exempt list (`EXECUTION_SECTION_PRODUCERS`, `src/lib/approval-ledger.js:298-317`) is not touched.

### Read in this planning pass (current main checkout)

- **The completion route, end to end.** The executor runs `node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task complete <taskId>`. The chain is:
  - `route` (`src/commands/start.js:948`, `:966`);
  - `taskComplete` (`src/lib/menu-screens.js:2661`);
  - `completeTaskPlan` (`:2716-2717`);
  - `completeExecution` (`src/lib/actions.js:1732`);
  - `validateForReview` (`src/lib/actions.js:1332`).
  - A result with `valid: false` records a kickback against `failingStepFrom(validation)` (`:1340`). That is Step 14 when every required step is complete (`:1766-1782`).
  - The menu then prints "failed pre-review validation and stays in in-progress", followed by every error joined with `; ` (`src/lib/menu-screens.js:2728-2739`).
- **`validateForReview`** (`src/lib/plan-validator.js:296-358`) runs five checks, then `mergeParentPlanWarnings` (`:354-355`). Two other callers inherit any new check:
  - `cleanupStaleInProgress` (`src/lib/actions.js:2527`, its call at `:2581`), reached from the build start's stale sweep in `startAgent` (`:2139`, `:2154`). It joins the errors into `.ctoc/logs/cleanup.json` with no removal of control characters (`:2583`).
  - The `in-progress->review` entry of `validateTransition` (`src/lib/plan-validator.js:1254`), reached by the menu's validate screen (`src/lib/menu-screens.js:2126`).
- **`declaredFileExistsUnder(root, declared)`** (`src/lib/plan-validator.js:695-699`) splits a path on either separator, drops empty, `.` and `..` parts, and so can never climb above `root`. It is read-only (`existsSync`).
- **The approval digest.** It skips any heading whose lower-cased text starts with `execution record` (`src/lib/approval-ledger.js:299`, matched by prefix at `:338-343`). It also skips every deeper heading, until the next heading of the same or a higher level (`:466-475`). It works line by line and does not see fences: a line whose trimmed text starts with `## Execution Record` inside a fenced block is still a heading to it. This plan therefore writes every fixture heading inside a JavaScript string, never at the start of a line.
- **The write permission during a build.** An approved plan in `in-progress/` grants edits through `isApprovedForCoverage` (`src/lib/approval-residency.js:272-289`). Its edge is `in-progress` to `todo` (`:89-94`). The coverage scan calls it (`src/lib/plan-coverage.js:590-603`) and reads the stages `in-progress` and `todo` (`:84`). `findCoveringPlan(targetFile, root)` (`:642-645`) is the exported reader. A relative target is joined to `root`, never to the working folder: `src/lib/plan-coverage.js:463`, and `escapesRoot` in `src/lib/real-path-confinement.js:450`. So `findCoveringPlan('src/thing.js', root)` asks about the sandbox's own file.
- **No protected enforcement path.** None of the four files this plan edits is one (`src/lib/protected-paths.js:58-70`: eight library and script files, plus `src/hooks/`). Coverage from an autonomous crossing into the build queue is therefore enough to build this plan.
- **A new test file would move two documented counts:** `CLAUDE.md` and `README.md` (`src/scripts/release.js:114-115`). Both are pinned live, by `tests/doc-counts.test.js:96` and `tests/readme-numbers.test.js:322`.
- **The executor's file** (`agents/iron-loop/iron-loop-executor.md`):
  - "Completing a plan — the ONE way" is at `:181-220`, and "Step Execution" is at `:222`.
  - It already says that `## Execution Record` is excluded from the approval hash (`:147-148`).
- **The integrator's file** (`agents/iron-loop/iron-loop-integrator.md`): "Match Requirements" is at `:195-197`, and "Single Responsibility" is at `:199-201`.
- **Tests that read these two files:**
  - `tests/menu-task-wiring.test.js:1254-1271` (the executor names `menu task complete` and `completeExecution`, and moves no plan);
  - `tests/unexecutable-instruction-fence.test.js:107-110` (the integrator must have zero findings: no second-person "call `fn(`" line and no unknown `menu task add` kind);
  - `tests/corpus-audit-ledger.test.js:39-41` (paths only).
- **The prose contradiction scan** (`src/lib/plan-validator.js:760`) refuses a missing path claimed with a creation verb. No disposition form and no sentence of this plan uses such a verb before a missing path.

### Architecture decision

- **One new check in the module that already owns the completion's validation.** It is `validateSurvivingMutants(content, projectPath)` in `src/lib/plan-validator.js`, run as the sixth check of `validateForReview`.
- **Nothing else changes in code.** There is no new module, no new export and no new require. `actions.js`, `menu-screens.js` and the approval ledger stay as they are: the refusal, its printed text, the Step 14 kickback and the circuit breaker already exist.
- **Agent instructions.** The two agent files carry the text that names the place.

### Dependency graph

~~~text
src/commands/start.js : route("menu task complete <id>")              unchanged
  -> src/lib/menu-screens.js : taskComplete -> completeTaskPlan        unchanged
    -> src/lib/actions.js : completeExecution                          unchanged
      -> src/lib/plan-validator.js : validateForReview                 MODIFY (one call added)
        -> validateSurvivingMutants                                    NEW, not exported
          -> closedFenceLines, headingOf, splitTableRow,
             mutantDispositionProblem, quoteCell                       NEW, not exported
          -> declaredFileExistsUnder                                   existing (:695)
src/lib/actions.js : startAgent -> cleanupStaleInProgress -> validateForReview     inherits
src/lib/menu-screens.js : validateScreen -> validateTransition -> validateForReview inherits
tests/plan-validator.test.js -> menu-screens.route, validateForReview,
                                approval-ledger, approval-residency, plan-coverage
agents/iron-loop/iron-loop-executor.md, iron-loop-integrator.md -> name the place (text)
~~~

No cycle: `plan-validator.js` gains no `require`.

### File specifications

#### File: `src/lib/plan-validator.js` (MODIFY)

**Purpose:** refuse the completion while a surviving mutant recorded in the plan's one place has no valid disposition.

**Placement.** The new block goes after `validateAcceptanceCriteria` (which ends at `:683`) and before the JSDoc of `declaredFileExistsUnder` (`:685`). Re-read the line numbers at build time.

**Constants** (module level, compiled once):

| Name | Value | Meaning |
|---|---|---|
| `MUTANT_RECORD_PARENT` | `'execution record'` | the parent heading's text starts with these words, the ledger's own prefix |
| `MUTANT_RECORD_PLACE` | `'surviving mutants'` | the place's heading text, deeper than the parent, starts with these words |
| `MUTANT_DISPOSITION_FORMS` | `'"killed by <test file> — <test name>" or "accepted: <reason>"'` | the two forms, quoted the same way in every refusal |
| `KILLED_BY_RE` | `/^killed by\s+(\S+)/i` | the first token after the words is the test file |
| `LINE_SUFFIX_RE` | `/:\d+$/` | a `:<line>` written after the test file, as in the File and line column |
| `DELIMITER_CELL_RE` | `/^:?-+:?$/` | a cell of the table's delimiter row |
| `FENCE_OPEN_RE` | ``/^(`{3,}\|~{3,})/`` (the pipe is escaped only for this table) | the start of a fenced block |
| `QUOTED_CELL_MAX` | `120` | the longest piece of plan text a refusal quotes back |

**Functions.** Each is private and gets JSDoc with typed parameters and its return type.

- `quoteCell(text: string) -> string`
  - Removes the control characters `\x00-\x1f` and `\x7f-\x9f`.
  - Cuts the result to `QUOTED_CELL_MAX` characters and appends `…` when it was cut.
- `headingOf(trimmed: string) -> {level: number, title: string} | null`
  - Counts the leading `#` characters, character by character.
  - Returns `null` when there is none, or when the next character is not a space or a tab.
  - Otherwise `title` is the rest of the line, trimmed and lower-cased.
- `splitTableRow(line: string) -> string[]`
  - Splits one trimmed line that starts with `|` into trimmed cells.
  - A `\|` is a literal pipe.
  - A pipe inside a backtick code span does not split. A span opens on a run of N backticks and closes on the next run of exactly N.
  - The empty cell before the opening pipe is dropped. A last cell that is empty means a closing pipe, and it is dropped once.
- `mutantDispositionProblem(cell: string, projectPath: string) -> string | null`
  - Returns null for a valid disposition; otherwise it returns the problem in words.
  - A `:<line>` after the test file is removed before the file is looked up, so `killed by tests/x.test.js:45 — name` names the file `tests/x.test.js`.
- `closedFenceLines(lines: string[]) -> boolean[]`
  - Marks every line of a fenced block that has a closing line, the opener and the closer included.
  - An opener with no closing line marks nothing and stays plain text, so a forgotten closing fence can never hide the record after it. That is the rule this file already keeps for spans: "ONLY BALANCED PAIRS COUNT" (`src/lib/plan-validator.js:247-249`).
- `validateSurvivingMutants(content: string, projectPath: string) -> {errors: string[], checklist: {rows: number, open: number}}`
  - Splits `content` on `\r?\n` and trims each line, marks the closed fences, then makes one pass over the lines.
  - It never throws on a string, reads no file, and calls `existsSync` once per `killed by` row.

**Reference sketch.** The builder may restructure it. The behaviour and the message texts are the specification.

~~~js
function quoteCell(text) {
  const clean = String(text).replace(/[\x00-\x1f\x7f-\x9f]/g, '');
  return clean.length > QUOTED_CELL_MAX ? `${clean.slice(0, QUOTED_CELL_MAX)}…` : clean;
}

function headingOf(trimmed) {
  let level = 0;
  while (trimmed[level] === '#') level++;
  if (level === 0 || !/^[ \t]/.test(trimmed.slice(level))) return null;
  return { level, title: trimmed.slice(level).trim().toLowerCase() };
}

function splitTableRow(line) {
  const cells = [];
  let cell = '';
  let codeRun = 0; // length of the open backtick run, 0 outside a code span
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cell += '|'; i++; continue; }
    if (ch === '`') {
      let run = 1;
      while (line[i + run] === '`') run++;
      if (codeRun === 0) codeRun = run; else if (run === codeRun) codeRun = 0;
      cell += line.slice(i, i + run);
      i += run - 1;
      continue;
    }
    if (ch === '|' && codeRun === 0) { cells.push(cell.trim()); cell = ''; continue; }
    cell += ch;
  }
  cells.push(cell.trim());
  cells.shift();                                      // the text before the opening pipe
  if (cells[cells.length - 1] === '') cells.pop();    // the closing pipe
  return cells;
}

function mutantDispositionProblem(cell, projectPath) {
  const text = cell.replace(/`/g, '').trim();
  if (text === '') return 'the Disposition is empty';
  const killed = KILLED_BY_RE.exec(text);
  if (killed) {
    const file = killed[1].replace(LINE_SUFFIX_RE, '');
    return declaredFileExistsUnder(projectPath, file)
      ? null
      : `the Disposition names "${quoteCell(file)}", and no such file exists in the project`;
  }
  if (text.toLowerCase().startsWith('accepted:')) {
    return text.slice('accepted:'.length).trim() === ''
      ? `the Disposition "${quoteCell(text)}" gives no reason`
      : null;
  }
  return `the Disposition "${quoteCell(text)}" is in neither accepted form`;
}

function closedFenceLines(lines) {
  const fenced = lines.map(() => false);
  for (let i = 0; i < lines.length; i++) {
    const opener = FENCE_OPEN_RE.exec(lines[i]);
    if (!opener) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith(opener[1])) j++;
    if (j === lines.length) continue;   // no closing line: the opener is plain text
    for (let k = i; k <= j; k++) fenced[k] = true;
    i = j;
  }
  return fenced;
}

function validateSurvivingMutants(content, projectPath) {
  const errors = [];
  let rows = 0;
  let parent = 0;    // level of the open Execution Record heading, 0 when none
  let place = 0;     // level of the open Surviving Mutants heading, 0 when none
  let header = null; // the open table's header cells, unmarked and lower-cased
  const lines = content.split(/\r?\n/).map((raw) => raw.trim());
  const fenced = closedFenceLines(lines);
  for (let i = 0; i < lines.length; i++) {
    if (fenced[i]) continue;
    const line = lines[i];
    const heading = headingOf(line);
    if (heading) {
      if (heading.level <= place) place = 0;
      if (heading.level <= parent) parent = 0;
      if (parent === 0 && heading.title.startsWith(MUTANT_RECORD_PARENT)) parent = heading.level;
      else if (parent > 0 && heading.title.startsWith(MUTANT_RECORD_PLACE)) { place = heading.level; header = null; }
      continue;
    }
    if (place === 0 || !line.startsWith('|')) continue;
    const cells = splitTableRow(line);
    if (header === null) { header = cells.map((c) => c.replace(/[*_`]/g, '').trim().toLowerCase()); continue; }
    if (cells.every((c) => DELIMITER_CELL_RE.test(c))) continue;
    rows++;
    const d = header.indexOf('disposition');
    const problem = d < 0
      ? 'the table has no Disposition column (its columns are Mutant, File and line, Change and Disposition)'
      : mutantDispositionProblem(cells.length > d ? cells[d] : cells[cells.length - 1], projectPath);
    if (problem === null) continue;
    const where = cells[header.indexOf('file and line')] || cells[header.indexOf('mutant')] || '';
    const label = where ? `row ${rows} (${quoteCell(where)})` : `row ${rows}`;
    const note = cells.length < header.length
      ? ` (the row has ${cells.length} cells where the table has ${header.length} columns)`
      : '';
    errors.push(`Surviving mutant ${label}: ${problem}${note}. Under "### Surviving Mutants" in ` +
      `"## Execution Record", each Disposition reads ${MUTANT_DISPOSITION_FORMS}.`);
  }
  return { errors, checklist: { rows, open: errors.length } };
}
~~~

**The rules this sketch encodes.**

- **Fences.**
  - A fenced block that closes is skipped whole: an example is never a record.
  - A fence closes only on a line that starts with the opening run, the same character at least as many times. A fence of the other kind nested inside it is therefore skipped too.
  - An opener with no closing line is plain text, and every line after it is still read. A pasted test output whose closing fence was forgotten cannot switch the check off.
- **The place.**
  - The parent is any heading whose text starts with `execution record`, the ledger's own prefix rule. It stays open until a heading of the same or a higher level.
  - The place is a deeper heading inside it whose text starts with `surviving mutants`, for example `### Surviving Mutants — Step 14 run`. It stays open until a heading of the same or a higher level.
  - A heading with these words outside a parent is not read. That includes this plan's own title, a top-level `## Surviving Mutants`, and one under `## Notes`.
- **Tables.**
  - The first line starting with `|` in a place is its header. Delimiter rows are skipped, and every other line starting with `|` is a data row.
  - Lines that do not start with `|` are prose and are ignored. A heading with no table, or a table with only a header, has no rows (scenario 3).
  - Header cells are matched case-insensitively, after removing `*`, `_` and backticks.
- **Which cell is the Disposition.**
  - A table whose header has no Disposition column names each of its data rows.
  - A row with fewer cells than the header takes its last cell as the Disposition, because Disposition is the last of the four columns.
  - A row wrapped over two lines is therefore named, with its cell count. Its continuation line, which does not start with `|`, is ignored, and the rows after it are still read.
- **Row numbers** count data rows across every place in the plan, in document order.
- **Message.** There is one error per named row, in this exact form: `Surviving mutant row <n> (<File and line, or Mutant>): <problem><cell-count note>. Under "### Surviving Mutants" in "## Execution Record", each Disposition reads "killed by <test file> — <test name>" or "accepted: <reason>".` When a row has neither a File and line nor a Mutant cell, the brackets are left out.

**Change to `validateForReview`.** Insert after check 5 (`:345-352`), before the parent-plan warnings, which become comment 7. Also add one line to its JSDoc: "Refuses a surviving mutant recorded without a valid disposition (`validateSurvivingMutants`)."

~~~js
  // 6. Every surviving mutant recorded in the plan's one place carries a valid disposition
  const mutantValidation = validateSurvivingMutants(content, projectPath);
  if (mutantValidation.errors.length > 0) {
    result.errors.push(...mutantValidation.errors);
    result.valid = false;
  }
  result.checklist.survivingMutants = mutantValidation.checklist;
~~~

**Error handling.**
- The check pushes errors only. A completion that is not refused prints no warnings (`src/lib/actions.js:1745-1753`), so a warning would reach no one.
- `existsSync` does not throw, and nothing else here does I/O.
- `content` is the string `validateForReview` already read; an unreadable plan throws there, before this check, exactly as today.

**Cross-platform.** Lines are split on `\r?\n`, so a plan with Windows line endings gets the same verdict. A path is resolved through `declaredFileExistsUnder`, which uses `path.join` and accepts either separator.

**Lint and types.** `no-control-regex` is off for the whole repository (`eslint.config.js:109`), so the character-class literal used by the sibling copies of `stripCtl` is allowed. Keep `security/detect-unsafe-regex` (`:139`) and `npm run typecheck` (`checkJs`, `tsconfig.json:4`) green. If a literal is flagged, build it through `safeRegExp`, as this file does elsewhere.

#### File: `agents/iron-loop/iron-loop-executor.md` (MODIFY)

**Placement.** Insert a new section between "Completing a plan — the ONE way" (which ends at `:220`) and "Step Execution" (`:222`). The executor reads it when it completes, and it refers to the completion's refusal.

**Its heading line is** `## Surviving mutants — the one place to record them`, a level-2 heading. **Its body is exactly:**

~~~markdown
When you run mutation testing during a build, with a tool or with mutants you make by hand to show that a test fails, record every mutant that survived the run, not only the ones a report lists (the mutation test runner's report lists its top five). A mutant survived when the tests, or a proof script meant to refuse it, did not catch it on its run.

Record them in one place: a `### Surviving Mutants` table inside the plan's `## Execution Record` section (add that section at the end of the plan when it is not there yet). The table has the four columns Mutant, File and line, Change and Disposition, one row per surviving mutant, each row on one line:

```markdown
| Mutant | File and line | Change | Disposition |
|---|---|---|---|
| M1 | src/lib/example.js:45 | `>=` became `>` | killed by tests/example.test.js — refuses a value equal to the limit |
| M2 | src/lib/example.js:61 | the `trim` call removed | accepted: the only caller trims its input first; a test with padded input passes with and without the change |
```

- Only there. `## Execution Record` and every heading below it are left out of the approval record's digest of the plan, so a table there keeps the build's write permission. A top-level `## Surviving Mutants`, or rows under a step heading of the `## Execution Plan`, change the approved text and cancel that permission at your next edit; rows under `## Decisions Taken Under Ambiguity` are not read. The completion reads only the table in this place.
- The Disposition takes one of two forms:
  - `killed by <test file> — <test name>`: you added or tightened that test, ran the mutant again, and saw that test fail on it. The completion checks only that the test file exists. It cannot run the mutant, so never write `killed by` before you have seen the test fail.
  - `accepted: <reason>`: the mutant changes nothing anyone can observe (an equivalent mutant). The reason says why, and how you showed it.
- Write a `|` inside a cell as `\|`.
- An empty Disposition, any other text, `accepted:` with no reason, or `killed by` naming a file that does not exist refuses your completion: `menu task complete <taskId>` names every such row. The refusal is a kickback, counted against Step 14 when every step box is ticked. Fix those rows and complete again.
- A run in which no mutant survived needs no table.
~~~

#### File: `agents/iron-loop/iron-loop-integrator.md` (MODIFY)

**Placement.** Insert a subsection under "Guidelines", after "Match Requirements" (`:195-197`) and before "Single Responsibility" (`:199`).

**Its heading line is** `### Steps that run mutation testing`, a level-3 heading. **Its body is exactly:**

~~~markdown
When a step runs mutation testing, with a tool or with mutants made by hand as a test's failing evidence, that step's checklist names the place for its survivors: the `### Surviving Mutants` table inside the plan's `## Execution Record` section, one row per surviving mutant, each with a disposition. Write it as one checkbox in that step, for example `- [ ] Record every surviving mutant, with its disposition, in the Surviving Mutants table of the Execution Record`. Put that line only in a step that runs mutation testing; a plan that runs none gets no such line. The executor's instructions (`agents/iron-loop/iron-loop-executor.md`, section "Surviving mutants — the one place to record them") define the table's four columns and its two dispositions.
~~~

The text tells the integrator, which has no shell, to call nothing. So the integrator's zero-findings check (`tests/unexecutable-instruction-fence.test.js:107-110`) stays green.

#### File: `tests/plan-validator.test.js` (MODIFY)

**Placement.** One new top-level `describe('surviving mutants — one recorded place, checked when the build completes', …)` at the end of the file. It uses the file's existing `REVIEW_DONE_EXEC_PLAN` constant (`:15-45`) and touches no existing case.

**Shared helpers inside the describe:**

~~~js
  const ms = require('../src/lib/menu-screens');
  const taskRegistry = require('../src/lib/task-registry');
  const ledger = require('../src/lib/approval-ledger');
  const residency = require('../src/lib/approval-residency');
  const { findCoveringPlan } = require('../src/lib/plan-coverage');
  const { validateForReview } = require('../src/lib/plan-validator');
  const HEADER = '| Mutant | File and line | Change | Disposition |';
  const DELIM = '|---|---|---|---|';
  let root;

  beforeEach(() => {
    // Real path: on macOS the temporary folder is a symbolic link, and the coverage
    // check compares real paths.
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-mutants-')));
    for (const s of ['implementation', 'todo', 'in-progress', 'review', 'done']) {
      fs.mkdirSync(path.join(root, 'plans', s), { recursive: true });
    }
    for (const d of [['.ctoc', 'state'], ['.ctoc', 'logs'], ['.ctoc', 'approvals'], ['src'], ['tests']]) {
      fs.mkdirSync(path.join(root, ...d), { recursive: true });
    }
    fs.writeFileSync(path.join(root, 'src', 'thing.js'), 'module.exports = 1;\n');
    fs.writeFileSync(path.join(root, 'tests', 'example.test.js'), '// kills the mutant\n');
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  // A built plan: every step ticked, the criteria given, then the record when given.
  function planText({ criteria = ['- [x] the thing works'], record = null, extra = [] } = {}) {
    const lines = ['---', 'title: "A slice with a mutation run"', 'type: implementation',
      'files:', '  - "src/thing.js"', '---', '', '# A slice with a mutation run', '',
      '## Acceptance Criteria', '', ...criteria, '', REVIEW_DONE_EXEC_PLAN];
    if (record !== null) {
      lines.push('## Execution Record (Steps 8–16)', '', '### Surviving Mutants', '', ...record, '');
    }
    return [...lines, ...extra, ''].join('\n');
  }

  // A plan in the build with a running build task, as the scheduler leaves it.
  function building(slug, text) {
    const planPath = path.join(root, 'plans', 'in-progress', `${slug}.md`);
    fs.writeFileSync(planPath, text);
    const reg = taskRegistry.load(root);
    const task = taskRegistry.addTask(reg, { kind: 'implement', plan: slug, touches: ['src/thing.js'] });
    taskRegistry.updateTask(reg, task.id, { status: 'running' });
    taskRegistry.save(root, reg);
    return { planPath, taskId: task.id };
  }

  // The executor's own completion call, through the real router.
  const complete = (taskId) => ms.route(['menu', 'task', 'complete', taskId], root);

  // The new check's refusals only, read through the real completion validation.
  function mutantErrors(text) {
    const planPath = path.join(root, 'plans', 'in-progress', 'check-only.md');
    fs.writeFileSync(planPath, text);
    return validateForReview(planPath, root).errors.filter((e) => e.startsWith('Surviving mutant'));
  }
~~~

The kickback count is read from `.ctoc/state/kickbacks/<slug>.json` (`total`, `by_step['14']`), the counter file the approval tests already read (`tests/approval-hash-survives-execution.test.js:724-728`).

### Test plan

- **Framework:** `node:test` with `assert`, as the rest of the file uses.
- **Run while building:** `node --test --test-name-pattern="surviving mutants" tests/plan-validator.test.js`.
- **The cases.** Each case below is named by its test title. "Pin" marks a case that already passes before the change, because the exemption and the accepting paths exist today; it guards that the change keeps them. "Red" marks a case that must fail before the change.
- **No timing.** No case asserts an elapsed time, a sleep or a clock.

**Driving the real menu route** (`menu task complete <id>`), scenarios 2, 3 and 5 to 8:

- **"a fully recorded table passes the completion and the plan moves to review"** (scenario 2, pin).
  - Setup: `building` with two rows:
    - `` | M1 | src/thing.js:1 | `>=` became `>` | killed by tests/example.test.js — refuses a value equal to the limit | ``
    - `` | M2 | src/thing.js:2 | the `trim` call removed | accepted: the only caller trims its input first | ``
  - Expected:
    - `res.ok === true`;
    - `plans/review/<slug>.md` exists and the `in-progress` copy does not;
    - `res.text` does not match `/mutant/i`.
  - Not asserted: the outcome of the quality run inside the sandbox. It has no toolchain there, and this plan does not change it.
- **"a plan with a survivors heading and no rows is refused for the same reasons as before"** (scenario 3, pin).
  - Setup: criteria `- [x] the thing works` and `- [ ] the other thing works`, and the record `[HEADER, DELIM]`.
  - Expected:
    - `res.ok === false`;
    - `res.text` matches `/1 of 2 acceptance criteria not checked/` and does not match `/mutant/i`.
- **"a survivor with an empty Disposition refuses the completion and counts one Step 14 kickback"** (scenario 5, red).
  - Setup: one row, `` | M1 | src/lib/example.js:45 | `>=` became `>` |  | ``.
  - Expected:
    - `res.ok === false` and `res.blocked === true`;
    - `res.text` includes `src/lib/example.js:45`, `the Disposition is empty`, `killed by <test file>` and `accepted: <reason>`;
    - the plan file is still in `plans/in-progress/`;
    - the counter file has `total === 1` and `by_step['14'] === 1`;
    - the task's status is still `running`.
- **"a Disposition in neither form and an accepted without a reason are both named"** (scenario 6, red).
  - Setup: `| M1 | src/lib/a.js:10 | x | fix later |` and `| M2 | src/lib/b.js:20 | y | accepted: |`.
  - Expected: `res.text` includes `row 1 (src/lib/a.js:10)`, `"fix later" is in neither accepted form`, `row 2 (src/lib/b.js:20)` and `gives no reason`.
- **"a killed-by naming a missing test file is named with that file"** (scenario 7, red).
  - Setup: `| M1 | src/lib/a.js:10 | x | killed by tests/no-such-file.test.js |`.
  - Expected: `res.text` includes `row 1 (src/lib/a.js:10)` and `"tests/no-such-file.test.js", and no such file exists in the project`.
- **"every open row is named and only the open rows"** (scenario 8, red).
  - Setup, three rows:
    - `src/lib/a.js:10`, empty;
    - `src/lib/b.js:20`, `accepted: both branches return the same value`;
    - `src/lib/c.js:30`, empty.
  - Expected:
    - `res.text` includes `row 1 (src/lib/a.js:10)` and `row 3 (src/lib/c.js:30)`;
    - `res.text` includes neither `row 2` nor `src/lib/b.js:20`;
    - `res.errors.filter((e) => e.startsWith('Surviving mutant')).length === 2`.

**The approval and the write permission** (scenario 1):

- **"a survivors table inside the Execution Record keeps the approval and the next edit"** (pin).
  - Setup:
    - `spec = planText()`;
    - `ledger.writeEntry(slug, { content: spec, stage_from: 'implementation', stage_to: 'todo', approved_by: 'human' }, root)`;
    - `built = spec + '\n' + ['## Execution Record (Steps 8–16)', '', '### Surviving Mutants', '', HEADER, DELIM, '| M1 | src/thing.js:1 | x | killed by tests/example.test.js — t |'].join('\n') + '\n'`. This is the same appending shape as `executorEdits` in `tests/approval-hash-survives-execution.test.js:119-137`.
    - `built` is written to `plans/in-progress/<slug>.md`.
  - Expected:
    - `ledger.verify(slug, built, 'todo', root) === true`;
    - `residency.isApprovedForCoverage(planPath, 'in-progress', root).approved === true`;
    - `findCoveringPlan('src/thing.js', root).plan === 'in-progress/<slug>'`.
- **"the same table under a top-level Surviving Mutants heading cancels the write permission"** (pin; the negative control).
  - Setup: as above, but the table follows `'\n## Surviving Mutants\n\n'`.
  - Expected:
    - `ledger.verify(...) === false`;
    - `isApprovedForCoverage(...)` gives `{ approved: false, reason: 'hash-mismatch' }`;
    - `findCoveringPlan('src/thing.js', root) === null`.

**The two agent files** (scenario 4, red):

- **"the executor's instructions name the place, its columns, both dispositions and the every-survivor rule"**
  - Reads `agents/iron-loop/iron-loop-executor.md` and slices it from `\n## Surviving mutants — the one place to record them\n` to `\n## Step Execution\n`. Both indexes must be found, the first before the second.
  - The slice must hold:
    - `` `### Surviving Mutants` ``;
    - `` `## Execution Record` ``;
    - `| Mutant | File and line | Change | Disposition |`;
    - `` `killed by <test file> — <test name>` ``;
    - `` `accepted: <reason>` ``;
    - `record every mutant that survived the run, not only the ones a report lists`.
- **"the integrator names the place in a step that runs mutation testing"**
  - Reads `agents/iron-loop/iron-loop-integrator.md` and slices it from `\n### Steps that run mutation testing\n` to `\n### Single Responsibility\n`.
  - The slice must hold `` `### Surviving Mutants` ``, `` `## Execution Record` `` and `runs mutation testing`.

**Scenario 3, and the parser, through `mutantErrors`** (the same `validateForReview` the route runs):

- **"no heading, a heading with prose only, and a heading with a header-only table give the verdict of a plan without the change"** (scenario 3, pin).
  - Setup: the record is `null`, `['None survived.']` or `[HEADER, DELIM]`.
  - Each is checked with every criterion ticked: `valid === true` and `errors` deep-equals `[]`.
  - Each is checked again with one criterion unticked: `errors` deep-equals the errors of the plan with no heading.
- **"a pipe inside a code span or written as an escaped pipe does not split a cell"** (pin). These rows each give `[]`:
  - Change `` `a|b` became `a&b` `` with an `accepted:` reason;
  - Change `` `a \| b` `` with `killed by tests/example.test.js — t`;
  - Change `a \| b outside code` with an `accepted:` reason;
  - Change ``` ``x`|`y`` ``` with an `accepted:` reason.
  - A naive split on every pipe would read a Change fragment as the Disposition of the first and fourth rows.
- **"a row missing a middle cell takes its last cell as the Disposition"** (pin): `| M1 | src/thing.js:1 | killed by tests/example.test.js — t |` gives `[]`.
- **"a row wrapped over two lines is named with its cell count, and the rows after it are still read"** (red).
  - Setup, three lines:
    - `| M1 | src/lib/a.js:10 | changed the`
    - `comparison | accepted: equivalent |`
    - `| M2 | src/lib/b.js:20 | y |  |`
  - Expected, two errors:
    - the first holds `row 1 (src/lib/a.js:10)`, `"changed the" is in neither accepted form` and `(the row has 3 cells where the table has 4 columns)`;
    - the second holds `row 2 (src/lib/b.js:20)` and `the Disposition is empty`.
- **"a survivors table inside a fenced example is never read"** (pin). It gives `[]` for the record headings and an empty-Disposition row placed in `extra`:
  - inside a three-backtick `markdown` fence;
  - inside a four-backtick fence that contains a three-backtick line;
  - inside a `~~~` fence that contains a three-backtick fence.
- **"a fence that never closes does not hide the record after it"** (red).
  - Setup: the record is `['```text', 'ok 1 - refuses a value equal to the limit', HEADER, DELIM, '| M1 | src/lib/a.js:10 | x |  |']`. That is a pasted test output whose closing fence was forgotten, written before the table.
  - Expected: one error with `row 1 (src/lib/a.js:10)` and `the Disposition is empty`.
- **"a killed-by with a line number after the file is read as that file"** (pin): `killed by tests/example.test.js:12 — t` gives `[]`.
- **"a survivors heading outside the Execution Record is not read, this plan's own title included"** (pin).
  - Setup: no record. `extra` holds:
    - the line `# Surviving mutants from mutation testing have a recorded place in the plan`;
    - a top-level `## Surviving Mutants` with an empty-Disposition row;
    - `## Notes`, then `### Surviving Mutants` with an empty-Disposition row.
  - Expected: `[]`.
- **"the place ends at a sibling heading and the record ends at the next top-level heading"** (pin).
  - Setup, a record whose table has one valid row, followed by:
    - a line `#not-a-heading`;
    - `### Step 14 numbers`, then a table with an empty-Disposition row;
  - and `extra` = `## Notes`, then `#### Surviving Mutants` with an empty-Disposition row.
  - Expected: `[]`.
- **"a table without a Disposition column names each of its rows"** (red).
  - Setup: header `| Mutant | File and line | Change |` and row `| M1 | src/lib/a.js:10 | x |`.
  - Expected: one error with `row 1 (src/lib/a.js:10)` and `has no Disposition column`.
- **"a row with neither a file nor a mutant name is named by its number alone"** (red).
  - Setup: header `| Change | Disposition |` and row `| x |  |`.
  - Expected: one error starting with `Surviving mutant row 1: the Disposition is empty`.
- **"the forms are read without regard to letter case, bold headers or backticks"** (pin).
  - Setup:
    - header `| **Mutant** | **File and line** | **Change** | **Disposition** |`;
    - row 1, Disposition ``Killed by `tests/example.test.js` — t``;
    - row 2, Disposition `Accepted: equivalent, shown by a test with both values`.
  - Expected: `[]`.
- **"a second Execution Record with its own survivors table is read too"** (red).
  - Setup: a record with one valid row. `extra` holds `## Execution Record — second run`, then `### Surviving Mutants — Step 14 run`, then `HEADER`, `DELIM` and `| M9 | src/lib/z.js:99 | q |  |`.
  - Expected: one error with `row 2 (src/lib/z.js:99)`.
- **"quoted plan text loses control characters and is cut to 120 characters"** (red).
  - A Disposition of `'x'.repeat(300)`: the error includes `'x'.repeat(120) + '…'` and not `'x'.repeat(121)`.
  - A Disposition of `'fix\u0007 later'`: the error includes `"fix later"`.
- **"a plan with Windows line endings gets the same verdict"** (red). The scenario 5 fixture with `\n` replaced by `\r\n` gives the same errors as the original, and exactly one of them.
- **"a killed-by path cannot climb out of the project"** (red).
  - Setup: Dispositions `killed by ../../../../etc/hosts` and `killed by /etc/hosts`.
  - Expected: both are named with `no such file exists in the project`. Each resolves inside the sandbox, where no `etc/hosts` exists.

**Coverage.**
- Every branch of the six new functions is reached by the cases above:
  - fence opened and closed, fence opened and never closed;
  - heading or not, `#` without a space;
  - parent open and close, place open and close;
  - header, delimiter and data row;
  - no Disposition column, short row, cell-count note;
  - each of the five Disposition outcomes;
  - label with and without a location;
  - quote cut and not cut;
  - escaped pipe, code span opened and closed by a run of the same length, a run of another length inside.
- The repository floor is `.ctoc/coverage-baseline.json` `minPct`.

**Existing tests that must stay green:**
- `tests/plan-validator.test.js` and `tests/plan-validator-coverage.test.js`: no plan in their fixtures holds the place;
- `tests/menu-task-wiring.test.js:1254-1271`;
- `tests/unexecutable-instruction-fence.test.js:107-110`;
- `tests/approval-hash-survives-execution.test.js`: the ledger is untouched;
- `tests/export-reachability.test.js`: no new export;
- `tests/reachability.test.js`: no new file.

### Security review

- **Path traversal.** The path after `killed by` comes from plan text, which is untrusted. It is resolved only through `declaredFileExistsUnder`, which drops `..`, `.` and empty parts, so an absolute path becomes relative to the project root. The check is a read-only `existsSync`, and the answer is a yes or no that names only the path the plan itself wrote. Pinned by the climbing case.
- **Input validation.** Every pattern is a fixed literal; plan text never becomes a `RegExp`. Each regex is linear: anchored, with no nested quantifier. The scan is one pass over the lines, and the cell splitter is linear in a line's length.
- **Output.** Quoted plan text has its control characters removed and is cut to 120 characters. This matters because `cleanupStaleInProgress` writes the errors to `.ctoc/logs/cleanup.json` without removing them (`src/lib/actions.js:2583`). The menu applies `stripCtl` as well (`src/lib/menu-screens.js:2729`).
- **No writes, no shell, no network, no secrets.** The check reads the string it is handed and stats one path per `killed by` row.
- **Gate logic.** This adds one refusal to the check at the move into review, which the owner approved explicitly (question `q10-surviving-mutant-without-disposition-refuses-completion`, option 1, `.ctoc/streaming/answers.jsonl` line 254). The approval boundary is unchanged: `EXECUTION_SECTION_PRODUCERS` is not edited. No hook is edited.
- **Direction of failure.** A malformed record fails toward naming a row, never toward silence. That covers:
  - a short or wrapped row;
  - a missing Disposition column;
  - a stray backtick that swallows the rest of a row;
  - a fence that never closes, which is read as plain text.

  Two cases are not read at all, by design and recorded below:
  - a table inside a fence that closes, which is an example;
  - a table outside the place.
- **Prototype pollution:** no object is built from plan keys.

### Implementation order

1. MODIFY `tests/plan-validator.test.js`. The pins pass and the red cases fail; this depends on nothing new.
2. MODIFY `src/lib/plan-validator.js`. This turns the red check cases green, everything except the two agent-file cases. It depends on the existing `declaredFileExistsUnder`.
3. MODIFY `agents/iron-loop/iron-loop-executor.md`. This turns the executor case green.
4. MODIFY `agents/iron-loop/iron-loop-integrator.md`. This turns the integrator case green, and it refers to the executor's section by its name.

### Acceptance criteria mapping

| Criterion | Implemented in | Test |
|---|---|---|
| Recording survivors keeps the build's approval | the existing exemption (`src/lib/approval-ledger.js:299`, `:466-475`); the executor's text names the place | "a survivors table inside the Execution Record keeps the approval and the next edit"; negative control "the same table under a top-level Surviving Mutants heading cancels the write permission" |
| A fully recorded table passes the completion | `mutantDispositionProblem` accepts both forms | "a fully recorded table passes the completion and the plan moves to review"; the code-span, short-row and letter-case pins |
| A build that ran no mutation testing is unaffected | no place, or a place without rows, gives no error | "a plan with a survivors heading and no rows is refused for the same reasons as before"; "no heading, a heading with prose only, and a heading with a header-only table give the verdict of a plan without the change" |
| The executor's and the integrator's instructions name the place | the two agent texts | the two agent-file cases |
| A survivor without a disposition is named at completion (refused, Step 14) | `validateSurvivingMutants` called from `validateForReview`; the existing `failingStepFrom` and refusal text | "a survivor with an empty Disposition refuses the completion and counts one Step 14 kickback" |
| A disposition in neither form is named | `mutantDispositionProblem` | "a Disposition in neither form and an accepted without a reason are both named" |
| A killed disposition that names a missing test file is named | `mutantDispositionProblem` with `declaredFileExistsUnder` | "a killed-by naming a missing test file is named with that file"; "a killed-by path cannot climb out of the project" |
| Every open row is named, and only the open rows | the per-row loop | "every open row is named and only the open rows" |

No criterion is without an implementation action or a test.

### Risk mitigations

| Risk | Mitigation | Where |
|---|---|---|
| The record is written outside `## Execution Record` | The executor's text names the exact heading and its parent, and every refusal message repeats them. The approval case and its negative control pin what happens. | executor section; the message in `validateSurvivingMutants`; the scenario 1 cases |
| The check refuses a plan it should accept | Code-span and escaped-pipe splitting, a short row's last cell, fences skipped, the place bounded by heading levels. Step 14 runs the check over every plan under `plans/` in a scratch run: 0 new refusals expected. | `splitTableRow`; the parser pins; Step 14 |
| A `killed by` is trusted by its text | The check confirms the test file exists. The executor's text forbids writing `killed by` before the mutant was re-run and seen killed. The final review reads every row. | `mutantDispositionProblem`; executor section; Step 16 |
| Thin `accepted:` reasons | The executor's text requires the reason to say why the change cannot be observed and how that was shown. The reason stays in the plan for the final review. | executor section; Step 16 |
| Shared files with other plans | All four files are declared in `files:`, so the scheduler keeps two builds off one file. Step 9 re-reads each anchor before editing. | frontmatter; Step 9 |
| The owner's answer changes the second story | Settled: refuse (answers line 254). | none |

### Wiring — the live call sites

- **`validateSurvivingMutants`** is called by `validateForReview` (`src/lib/plan-validator.js`, the new check 6). From there the chain is:
  - `completeExecution` (`src/lib/actions.js:1332`);
  - `completeTaskPlan` (`:1732`);
  - `taskComplete` (`src/lib/menu-screens.js:2717`);
  - `route` (`src/commands/start.js:966`). That is the `/ctoc:start` command's non-interactive mode, which the executor runs as `menu task complete <taskId>`.
  - The six route cases (scenarios 2, 3, 5, 6, 7 and 8) drive this exact chain.
- **Inherited, with no new code:**
  - the build start's stale sweep (`startAgent` calls `cleanupStaleInProgress`, `src/lib/actions.js:2154`, which calls `validateForReview` at `:2581`);
  - the menu's validate screen (`src/lib/menu-screens.js:2126`, through `validateTransition`).
- **The five helper functions** are reached only through `validateSurvivingMutants`. None is exported, so no export can be left without a live caller.
- **The two agent texts** reach their readers when the CTO Chief dispatches the iron-loop executor and the iron-loop integrator.

### Neighbours (seen, not built here; scheduling is the owner's)

- **A survivors table written outside the place is not refused at the completion.** This covers a top-level `## Surviving Mutants`, rows under a step heading, and rows under `## Decisions Taken Under Ambiguity`. The first two already cancel the build's write permission at its next edit; the third is seen by no check. Refusing them would be a further refusal, which needs its own approval.
- **The step-label check misreads this plan's Step 8.** Its test-writing heuristic (`extractStepSection`, `src/lib/plan-validator.js:1626-1638`) reads the first "Step 8" anywhere in a plan. In this plan that is the refinement note "a Step 8 note", not the real step. It is harmless today, because that check runs on no live transition (`docs/IRON_LOOP.md:320-327`).

## Decisions Taken Under Ambiguity — technical planning

1. **No new test file.** Every case goes into the existing `tests/plan-validator.test.js`.
   - A new test file moves two documented counts, `CLAUDE.md` and `README.md` (`src/scripts/release.js:114-115`), which are pinned live by `tests/doc-counts.test.js:96` and `tests/readme-numbers.test.js:322`. The check before the build queue would demand only `CLAUDE.md`, so a plan declaring only that would pass the check and then fail the verify step.
   - Both files are claimed by many plans. `tests/plan-validator.test.js` adds no file conflict beyond `src/lib/plan-validator.js`, which this plan declares already.
2. **The check is not exported.**
   - The export fence counts no test as a caller, so a test-only export would fail the verify step.
   - The cases reach it through `validateForReview` and the real route.
3. **The parent and the place are matched by prefix.**
   - The parent is any heading whose text starts with `execution record`, the same prefix rule the ledger uses (`src/lib/approval-ledger.js:338-343`).
   - The place is a deeper heading whose text starts with `surviving mutants`, so a suffix such as "— Step 14 run" still counts.
   - This plan's own title is a level-1 heading outside any parent, so it is never read.
4. **A table outside the place is not read, and is not refused.** The owner approved refusing a survivor recorded in the place without a valid disposition. Refusing a misplaced table would be a further refusal that he has not approved. It is listed under Neighbours.
5. **Cells split with code spans and escaped pipes respected.**
   - GitHub's own table rule splits even inside a code span unless the pipe is escaped. Following it would turn the functional plan's named risk, a backticked `|` in a Change cell, into a false refusal.
   - The executor's text still tells builders to escape a pipe.
6. **A row with fewer cells than the header takes its last cell as the Disposition**, because Disposition is the last of the four columns.
   - A row wrapped over two lines is named, with its cell count. Its second half cannot be told apart from prose, and the rows after it are still read.
   - Both choices fail toward naming a row, never toward silence.
7. **A header without a Disposition column names every data row**, rather than reporting the table once. Every survivor in it then shows up in the refusal.
8. **`killed by <file>` with no test name is accepted.**
   - The functional scope lists exactly four faults: empty, neither form, `accepted:` without a reason, and a missing file. Scenario 7 itself uses the form without a test name.
   - The executor's text still writes the test name.
9. **A `killed by` path is resolved with the existing `declaredFileExistsUnder`, so a folder also counts as existing.** Excluding folders would take a second resolver, while the guarantee stays weak either way: the file's existence is not the mutant's death. The final review reads every row.
10. **Quoted plan text has its control characters removed and is cut to 120 characters.** `cleanupStaleInProgress` logs these errors raw (`src/lib/actions.js:2583`). 120 characters keep a file-and-line cell and any real disposition whole.
11. **Errors only, no warnings.** A completion that is not refused prints none (`src/lib/actions.js:1745-1753`). The checklist entry `survivingMutants: { rows, open }` records that the check ran.
12. **The integrator gets a guideline, not a line in its output template.** The template is every plan's checklist, and functional decision 3 keeps the place off plans that run no mutation testing.
13. **Fixture headings are written inside JavaScript strings in this plan, never at the start of a line.** The approval digest does not see fences (`src/lib/approval-ledger.js:462-480`). A line here starting with `## Execution Record` would take the rest of this plan's specification out of its own digest.
14. **The pins are labelled as pins.** Scenarios 1, 2 and 3 already hold before the change, because the exemption and the accepting paths exist today. Their test-first evidence is the red cases, and the hand-made mutants at Step 14.
15. **One plan in place, four files.** The brief allows no slice files, and the four files carry one behaviour. None is a protected enforcement path (`src/lib/protected-paths.js:58-70`).
16. **No question for the owner.** Both forks were answered (`.ctoc/streaming/answers.jsonl` lines 254 and 256, option 1 each). Every remaining choice is recorded here, and the author's questions file holds an empty list.
17. **A fence that never closes is plain text.** CommonMark would run an unclosed fence to the end of the document. Following it would let one forgotten closing fence, typically after pasted test output, hide every survivor recorded after it. That is the silent switch-off this file already forbids for spans (`src/lib/plan-validator.js:104-107`, `:247-249`). The check counts only fences that close.
18. **A `:<line>` after a `killed by` test file is removed before the lookup.** The column next to the Disposition is written as a path and a line, so `killed by tests/x.test.js:45 — name` is a natural form. Refusing it as a missing file would be a false refusal. Only one trailing `:<digits>` is removed.

## Execution Plan

### Step 8: TEST
- [x] Write the new describe block in `tests/plan-validator.test.js` with the helpers and every case under "Test plan" above.
- [x] Run `node --test --test-name-pattern="surviving mutants" tests/plan-validator.test.js`. Record verbatim that every pin passes and every red case fails for its stated reason: no `Surviving mutant` error exists yet, or the agent section is absent.

### Step 9: PREPARE
- [x] Re-read the four declared files, and confirm each anchor named under "File specifications" is present exactly once:
  - check 5 and the parent-plan warnings in `validateForReview`;
  - `validateAcceptanceCriteria` and `declaredFileExistsUnder`;
  - the executor's "Completing a plan — the ONE way" and "Step Execution";
  - the integrator's "Match Requirements" and "Single Responsibility".
- [x] If another plan has moved or changed an anchor, stop and report. No dependency is installed.

### Step 10: IMPLEMENT
- [x] `src/lib/plan-validator.js`:
  - add the constants and `quoteCell`, `headingOf`, `splitTableRow`, `mutantDispositionProblem`, `closedFenceLines` and `validateSurvivingMutants`, each with JSDoc;
  - add check 6 in `validateForReview`, renumbering the parent-plan comment to 7;
  - add the JSDoc line on `validateForReview`.
- [x] `agents/iron-loop/iron-loop-executor.md`: insert the section "Surviving mutants — the one place to record them" with the exact body above.
- [x] `agents/iron-loop/iron-loop-integrator.md`: insert the subsection "Steps that run mutation testing" with the exact body above.
- [x] Wiring: confirm the live chain through `menu task complete <id>` by running the six route cases. No other call site is added.

### Step 11: REVIEW
- [x] The critic reads the diff against "The rules this sketch encodes", and confirms each refusal message names the row, the place and both forms.
- [x] The critic confirms that no existing check changed its verdict, and that the executor's text matches what the check really does: which rows refuse, and what is not read.

### Step 12: OPTIMIZE
- [x] One pass over the lines. No regular expression is compiled per line, and no file is read beyond one `existsSync` per `killed by` row. Remove any helper the final code no longer needs.

### Step 13: SECURE
- [x] The security scanner checks:
  - the `killed by` path resolution (no climbing, read-only);
  - the linear patterns;
  - the cut and control-character removal of quoted text;
  - that the change edits no hook, no approval boundary and no file outside `files:`.

### Step 14: VERIFY
- [x] Run `npm run lint`, `npm run typecheck` and `npm test`. The bar: lint and types clean, all tests pass with 0 skipped and 0 failing, and coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [x] Also run `node --test tests/reachability.test.js tests/export-reachability.test.js tests/unexecutable-instruction-fence.test.js tests/menu-task-wiring.test.js tests/approval-hash-survives-execution.test.js`.
- [x] Corpus run, from a script in the session's scratch folder that is never committed:
  - for every `.md` under `plans/`, run `validateForReview(planPath, repoRoot)`;
  - count the errors that start with `Surviving mutant`, expecting 0;
  - record the count and the number of plans read.
- [x] Mutation run by hand on the new check. Run the describe block once for each mutant below, then restore the code:
  - the `killed by` existence test inverted;
  - the empty-reason test of `accepted:` removed;
  - the place's reset on a same-level heading removed;
  - fence skipping removed;
  - code-span tracking in `splitTableRow` removed;
  - the short row's last-cell rule replaced by an empty Disposition;
  - the error push removed;
  - fence balance ignored, so an opener with no closing line hides the rest of the plan;
  - the `:<line>` suffix of a `killed by` file not removed.
- [x] Record every survivor of that run in this plan's own `### Surviving Mutants` table inside `## Execution Record`, with a disposition.

### Step 15: DOCUMENT
- [x] JSDoc on the six new functions and on the changed `validateForReview`; the two agent texts are the user-facing documentation.
- [x] Record in this plan's `## Execution Record` what landed in each declared file.

### Step 16: FINAL-REVIEW
- [x] Tick each acceptance criterion only against its named test's passing output.
- [x] The critic reads every row of this plan's own survivors table, if there is one.
- [ ] Complete through `menu task complete <taskId>`.

## Execution Record (Steps 8-10)

### Step 8: TEST (red)
- Block added at the end of `tests/plan-validator.test.js`, before the closing `console.log` lines: `describe('surviving mutants — one recorded place, checked when the build completes', …)`, 26 cases, helpers as specified. Command: `node --test --test-name-pattern="surviving mutants" tests/plan-validator.test.js`.
- Before any source change: pass 12, fail 14, skipped 0.
- Pins that passed (12): fully recorded table passes the completion; survivors heading with no rows is refused for the old reasons; table inside the Execution Record keeps the approval; top-level heading cancels the write permission (hash-mismatch); verdict of a plan without the change (null, prose, header-only); pipe in code span or escaped; short row takes its last cell; fenced examples never read; killed-by with `:12`; heading outside the Execution Record; place ends at sibling heading; letter case, bold headers, backticks.
- Red cases that failed (14), each for its stated reason:
  - four route cases (empty Disposition, neither form, missing test file, open rows): `res.ok` was true where false was expected, because no `Surviving mutant` error existed yet;
  - eight `validateForReview` cases through `mutantErrors` (wrapped row, never-closing fence, no Disposition column, row with no file or mutant name, second Execution Record, quoting, Windows line endings, climbing path): the error list was `[]` (`actual: 0`) for the same reason;
  - two agent-text cases (executor, integrator): the section heading is absent from the agent file.
  - 4 + 8 + 2 = 14, matching fail 14 above.

### Step 9: PREPARE
- Each anchor present exactly once and at the line the plan names: `validateForReview` (296), check 5 (345) and the parent-plan comment (354), `validateAcceptanceCriteria` (641), `declaredFileExistsUnder` (695) in `src/lib/plan-validator.js`; "Completing a plan — the ONE way" (181) and "Step Execution" (222) in the executor; "Match Requirements" (195) and "Single Responsibility" (199) in the integrator. No other plan had moved them. No dependency installed.

### Step 10: IMPLEMENT
- `src/lib/plan-validator.js`: eight constants and the six private functions `quoteCell`, `headingOf`, `splitTableRow`, `mutantDispositionProblem`, `closedFenceLines`, `validateSurvivingMutants`, each with JSDoc, placed after `validateAcceptanceCriteria`; check 6 added to `validateForReview` (the parent-plan comment is now 7) and one JSDoc line added. Code follows the plan's reference sketch unchanged.
- `agents/iron-loop/iron-loop-executor.md`: section "Surviving mutants — the one place to record them" inserted before "Step Execution", exact body.
- `agents/iron-loop/iron-loop-integrator.md`: subsection "Steps that run mutation testing" inserted before "Single Responsibility", exact body.
- Wiring: no new call site; the six route cases drive `route` to `taskComplete` to `completeTaskPlan` to `completeExecution` to `validateForReview` to `validateSurvivingMutants`, and all pass.
- After: the Step 8 command gives pass 26, fail 0, skipped 0. `tests/plan-validator.test.js` with `tests/plan-validator-coverage.test.js`: 127 pass, 0 fail. `tests/menu-task-wiring.test.js`, `tests/approval-hash-survives-execution.test.js`, `tests/unexecutable-instruction-fence.test.js`: 135 pass, 0 fail, 0 skipped. `npx eslint` on the two JavaScript files: clean.

### Decisions taken during Steps 8-10
- The Step 8 to 10 evidence is written here, not under the step headings, because text under a step heading is part of the approved text and would cancel the build's write permission (the plan's own rule for the executor).
- The scenario 3 verdict case needed a local helper that writes one plan file and runs `validateForReview`; it is inside the case, no new shared helper.

### Fix round after the review (verdict CHANGES REQUIRED, seven findings)
Each change was written test-first in the surviving-mutants describe block of `tests/plan-validator.test.js` and run with `node --test --test-name-pattern="surviving mutants" tests/plan-validator.test.js`. Before any source change the block read: tests 31, pass 25, fail 6, skipped 0. After: tests 31, pass 31, fail 0, skipped 0.

| Finding | Test (red before, for the stated reason) | Code change |
|---|---|---|
| 1. Pasted `# tests 26` lines closed the place | "pasted test-runner summary lines in the record do not close the place": 1 error where 2 expected (the row after the pasted lines was never read, plain and inside an unclosed fence) | `validateSurvivingMutants`: a level-1 heading is skipped, it neither opens nor closes the record or the place |
| 2. The executor's example sits in a fence | "the executor's instructions name the place, ...": the sentence "Write the table as plain lines, never inside a code fence." was absent from the section | `agents/iron-loop/iron-loop-executor.md`: bullet added, with the delimiter-row requirement |
| 3. A table without a delimiter row passed | "a table without a delimiter row is refused, naming the place and the missing row": the old code read the second line as data and gave a Disposition error, no "no delimiter row" error | `isDelimiterRow` and `MUTANT_NO_DELIMITER_ERROR`: the line after the header must be a delimiter row, else one error, and the rest of that table is not read |
| 4. A fence closed on any line starting with the opening run | "a fence closes only on a line of the same fence character, at least as long, with nothing else": a "```js" line closed the fence and the table after it was read | `closedFenceLines`: the closer is a line made only of the opener's character, at least as long |
| 5a. An unmatched backtick swallowed the pipes after it | "a backtick with no closing run on the line does not swallow the pipes after it": errors where `[]` expected | `closingRunAfter`; `splitTableRow` opens a span only when a run of the same length follows |
| 5b. The cell-count note used `<` | "a row with more cells than the table has columns is named with its cell count": the note was missing | `cells.length !== header.length` |
| 6. The "#not-a-heading" test was vacuous | tightened in place: the no-space lines (`#not-a-heading`, `###not-a-heading`) now sit before an open row and exactly 1 error is expected. It passed before and after the code change (the rule existed); proven live by a by-hand mutant: with the space test removed from `headingOf` it failed (pass 30, fail 1) | none |
| 7. Duplicated Execution Record | none | the stray copy (70 lines) is deleted from this plan; the one record is kept with its counts corrected to 4 + 8 + 2 = 14 |

Other results after the fixes: `tests/plan-validator.test.js`, `tests/plan-validator-coverage.test.js`, `tests/menu-task-wiring.test.js`, `tests/approval-hash-survives-execution.test.js`, `tests/unexecutable-instruction-fence.test.js`: tests 267, pass 267, fail 0, skipped 0. `npx eslint --max-warnings 0` on `src/lib/plan-validator.js` and `tests/plan-validator.test.js`: clean. `npx tsc --noEmit`: no error in `src/lib/plan-validator.js`.

### Second fix round — re-review and security scan
Each change was written test-first in the surviving-mutants describe block of `tests/plan-validator.test.js` and run with `node --test --test-name-pattern="surviving mutants" tests/plan-validator.test.js`. Before any source change the block read: tests 35, pass 31, fail 4, skipped 0. After: tests 35, pass 35, fail 0, skipped 0. The four new cases are the four red ones; the tilde-fence pin was added to the existing fenced-example case and passed before and after.

| Finding | Test | Red reason (before the change) | Code change |
|---|---|---|---|
| Re-review BLOCK, security S1: a backtick line with a backtick in its info string was taken as a fence opener | "a backtick line whose info string holds a backtick is inline code, not a fence" | 0 errors where 1 expected: the line "```npm test``` gave pass 26" opened a fence that closed on the later "```", hiding the record | `closedFenceLines`: a backtick opener with another backtick after its run is inline code |
| Same finding, pin | the existing "a survivors table inside a fenced example is never read", with a fence opened by "~~~text `x`" and closed by "~~~" | pin: passed before and after | none (a tilde fence may carry any text after its run) |
| Security S1: the fence scan was quadratic | "thousands of fence openers that never close do not hide the record, and the fence scan reads each line a bounded number of times" | the counter added to the old inner loop read 4516551 lines for the 3051-line plan (bound 4 x 3051 = 12204) | `closedFenceLines` rewritten: one backward pass for the longest closer per fence character, openers that cannot close passed over, a forward scan resumes after its closer; the checklist carries `fenceLinesRead` |
| Security S2: a NUL in a `killed by` path crashed the completion | "a killed-by path holding a NUL is named, and the completion is refused, not crashed" | the completion threw: the file-system layer refused the path and its message carried the absolute project path | `declaredFileExistsUnder` returns false on a NUL; the two JSDoc sentences about climbing now describe the text rule and say a symbolic link is followed |
| Security S3: quoted plan text kept direction overrides, zero-width and separator characters | "quoted plan text loses direction overrides, zero-width and separator characters" | the quote held U+202E (the error read "fix" + override + "later") where "fixlater" was expected | `QUOTE_STRIP_RE` (controls, Default_Ignorable_Code_Point, Cf, Zl, Zp, U+2800) is stripped before the cut to 120 characters |
| Security S4, S5: the row scan was not linear | the five existing pins (pipe in a code span or escaped, unmatched backtick, table without a Disposition column, row with neither file nor mutant, letter case and bold header), labelled as pins with a comment | pins: verdict unchanged. Red evidence is a measurement script in the session scratch folder, never committed | column positions found once when the header is set; `closingRunAfter` deleted; `splitTableRow` builds a map of the last backtick run of each length in one pass |

Measurements (scratch script, same plan text, before and after this round): a plan with a 20000-column header and 3000 short rows, 288028 bytes: 157 ms before, 12 ms after. A plan whose one row is a 2001223-byte line of backtick runs of 1999 distinct lengths: 6999 ms before, 113 ms after; both give the same errors (3000 and 0). The fence scan on the 3051-line many-openers plan of the test: 4516551 line reads before, 6102 after (two per line). No test asserts a time; the bound is the line-read counter.

### Step 12: OPTIMIZE
After the second fix round, the check reads as follows. One scan of the lines: `closedFenceLines` makes two passes of its own (6102 line reads for a 3051-line plan, bounded by the new test at four per line) and `validateSurvivingMutants` makes one. No regular expression is built per line: every pattern is a module constant or a fixed literal, and plan text never becomes a `RegExp`. The column positions are found once per table, and the backtick runs of a row are indexed once. One `existsSync` per `killed by` row, through `declaredFileExistsUnder`. The only repeat is the delimiter row, which is split once to be recognised and once more as a skipped row (linear, a single row per table). No unused helper: `closingRunAfter` was deleted, and `npx eslint --max-warnings 0` is clean on both files.

### Step 15: DOCUMENT
- `src/lib/plan-validator.js`: JSDoc on `quoteCell`, `headingOf`, `splitTableRow`, `isDelimiterRow`, `mutantDispositionProblem`, `closedFenceLines`, `validateSurvivingMutants`, `declaredFileExistsUnder` and `validateForReview`; this round rewrote the text of `quoteCell`, `splitTableRow`, `mutantDispositionProblem`, `closedFenceLines` (return type now `{fenced, linesRead}`), `validateSurvivingMutants` (return type gains `fenceLinesRead`; "a header and delimiter row and no data rows gets no error") and `declaredFileExistsUnder` (by its text; a symbolic link is followed; a NUL is refused). Two new constants, `FENCE_CLOSER_RE` and `QUOTE_STRIP_RE`, carry their own comment line.
- `tests/plan-validator.test.js`: the surviving-mutants describe block, 35 cases (26 first written, 5 added in the first fix round, 4 added in the second); five existing cases carry a pin comment.
- `agents/iron-loop/iron-loop-executor.md`: the section "Surviving mutants — the one place to record them" (22 lines added, with the plain-lines and delimiter-row bullet); not changed in the second round.
- `agents/iron-loop/iron-loop-integrator.md`: the subsection "Steps that run mutation testing" (4 lines added); not changed in the second round.

### Step 14: VERIFY
- `npm run lint`: `eslint . --max-warnings 0`, no output, exit 0.
- `npm run typecheck`: the typecheck test passes (1 test, 1 pass, 0 fail).
- `npm test`: `[CTOC test-gate] coverage 99.74% (threshold 99%), skipped 0, failed 0`, then `[CTOC test-gate] PASS`. The suite reported tests 13866, pass 13866, fail 0, skipped 0. Machine load at the start of the run (`uptime`): load averages 33.12 33.90 41.88.
- The five fence and wiring files (`tests/reachability.test.js`, `tests/export-reachability.test.js`, `tests/unexecutable-instruction-fence.test.js`, `tests/menu-task-wiring.test.js`, `tests/approval-hash-survives-execution.test.js`): tests 182, pass 182, fail 0, skipped 0.
- Corpus run (a scratch script, not committed): `validateForReview` over every `.md` under `plans/` in this checkout, 709 plans read, 0 errors starting with `Surviving mutant` (and 0 for the missing-delimiter-row refusal), 0 plans threw.
- Mutation run by hand on the new check, one run of the describe block per mutant, the code restored after each and compared with the saved copy (identical):

| Mutant | Cases that failed | Result |
|---|---|---|
| the `killed by` existence test inverted | 8 | killed |
| the empty-reason test of `accepted:` removed | 1 | killed |
| the place's reset on a same-level heading removed | 1 | killed |
| fence skipping removed | 2 | killed |
| code-span tracking in `splitTableRow` removed | 1 | killed |
| the short row's last-cell rule replaced by an empty Disposition | 2 | killed |
| the error push removed | 19 | killed |
| fence balance ignored, an opener with no closing line hides the rest | 3 | killed |
| the `:<line>` suffix of a `killed by` file not removed | 1 | killed |

### Surviving Mutants
None of the nine mutants of the Step 14 run survived. The final review found one more by hand, a tenth: deleting the line that resumes the fence scan after a closer survived the whole suite. It is killed now and recorded below.

| Mutant | File and line | Change | Disposition |
|---|---|---|---|
| M10 | src/lib/plan-validator.js:870 | the line `i = j;` in `closedFenceLines` deleted, so the scan re-reads a line inside a closed fence as an opener | killed by tests/plan-validator.test.js — the fence scan resumes after a closer: a line inside a closed fence is not read as an opener |

### Acceptance criteria against passing tests
All eight scenarios are ticked against the passing cases named in the acceptance mapping above: recording keeps the approval ("a survivors table inside the Execution Record keeps the approval and the next edit" and its negative control); a fully recorded table passes ("a fully recorded table passes the completion and the plan moves to review"); no mutation run is unaffected ("a plan with a survivors heading and no rows is refused for the same reasons as before", "no heading, a heading with prose only, and a heading with a header-only table give the verdict of a plan without the change"); the two agent files (the executor and integrator cases); an empty Disposition, neither form, a missing test file and only the open rows (the four route cases).

### Step 11 REVIEW (two rounds)
The first review found seven defects, and all seven were fixed test-first in the first fix round: pasted summary lines closing the place, the fenced example in the executor text, a table without a delimiter row passing, the fence closing on any line that starts with the opening run, an unmatched backtick swallowing the pipes after it, the cell-count note comparing with less-than, and a vacuous no-space heading test. The re-review found one silent bypass: a backtick line with a backtick in its info string opened a fence that hid the record. The security scan found six issues. Both were folded into the second fix round's change list and fixed test-first: four new red cases and one new pin, after which the surviving-mutants block read 35 of 35 in the builder's run. The final review then read the code against both change lists and found every item present and pinned, except the one surviving hand mutant named under the final review below.

### Step 13 SECURE
The security scan found six issues: a quadratic fence scan, a NUL in a killed-by path crashing the completion, hidden and direction-changing characters kept in quoted plan text, column positions looked up again on every row, a cell splitter that was not linear in the line's length, and symbolic links. The first five were fixed. The fence scan is now two linear passes with a line-read counter bounded by a test instead of a clock. The path check returns false on a NUL, so the row is named instead of crashing. Quoted text loses control, invisible, direction-changing and separator characters before the cut to 120 characters. Column positions are found once per table, and backtick runs are indexed once per row. Symbolic links were left unchanged by decision 12: a link inside the project is followed, and the JSDoc says so. Reading the code, the final review found no throw on any string input to the check, found every quoted piece of plan text passing through the stripping helper, and found that a killed-by path cannot climb out of the project by its text. It also found two further items: an accepted reason made only of invisible characters passes the no-reason refusal, and one spread of an unbounded error list (unverified) may throw on a very large record.

### Step 16 FINAL-REVIEW
The final review was read-only and re-ran nothing. Each acceptance criterion was matched by reading to a named test that proves its behaviour, and none lacks a test; the pass counts are the builder's Step 14 record. The plan's own Surviving Mutants table is valid under the new check, and the record has no line that starts with a level-1 heading marker. The coordinator checked the changed files against main: only the four declared files and the plan. Verdict: changes required, with two blocking findings. First, an accepted reason made only of invisible characters must be refused like an empty one. Second, the rule that the fence scan resumes after a closer is pinned by no test: deleting it survives the suite by hand trace, and that mutant is to be killed by one new case and recorded in this plan's Surviving Mutants table. The one-line fix for the unbounded spread is folded into the same round. A sentence in the executor text warns that a line starting with a level-1 marker ends the exempt record.

### Final-review fix round
Each change was written test-first in the surviving-mutants describe block of `tests/plan-validator.test.js`, seen red, then the code. After the round `node --test tests/plan-validator.test.js` reads: tests 102, pass 102, fail 0, skipped 0 (three new cases; the two executor pins were added to an existing case).

1. Invisible-only reasons. Case "an accepted reason or a whole Disposition made only of invisible characters gives no reason", rows `accepted: ` followed by U+200B, `accepted: ` followed by U+2800, and a cell of U+200B alone. Red on the old code: 1 error where 3 expected (the two accepted rows passed; the whole-cell row was named "in neither accepted form" with an empty quote instead of "the Disposition is empty"). Green after: `mutantDispositionProblem` compares `x.replace(QUOTE_STRIP_RE, '').trim() === ''` in both emptiness tests (replace, not test, because the constant carries the g flag).
2. The fence scan resumes after a closer. Case "the fence scan resumes after a closer: a line inside a closed fence is not read as an opener": record `~~~text`, a line of three backticks plus `js`, `~~~`, then header, delimiter and an open row, with a lone three-backtick line after the record; exactly 1 error expected. It passes on the correct code. Mutant proof: the line `i = j;` deleted from `closedFenceLines` (the rest of the file byte for byte the saved copy): the case fails with 0 errors where 1 expected (the record is hidden), and the rest of the file's cases still pass, which is why the suite did not notice before (101 of 102 pass with the mutant, the one failure being the new case). The code was restored from the saved copy and compared identical. Recorded as row M10 of the Surviving Mutants table above, disposition killed by this test.
3. Unbounded spread. Case "a record of 150,000 open rows is refused, not crashed": 150,000 open rows, no throw, `valid` false, and 150,000 `Surviving mutant` errors. Red on the old code: with only the spread line `result.errors.push(...mutantValidation.errors)` restored, the case fails with RangeError (Maximum call stack size exceeded), so the spread really did throw at 150,000. The first version of the case threw the same RangeError inside the test's own `planText` helper (a spread of the rows there), which is not the validator; the case now splices the rows into the text as one string. Green after: `for (const e of mutantValidation.errors) result.errors.push(e);`.
4. Executor text: the sentence that a line starting with a level-1 marker and a space (for example a pasted `node --test` summary line) ends the part of the plan the approval record leaves out, and cancels the build's write permission, added to the bullet "Only there". The pin `Never start a line in the Execution Record with` was added to the existing executor-text case after the text was written (a text sentence, so no red run; the pin fails if the sentence is removed).
5. Executor text: "checks only that the test file exists" became "checks only that the path exists (any existing path passes, a folder included)", and the pin `checks only that the path exists` was added the same way.
6. Decisions 14 to 16 below record the three accepted limits.

A shell command that rewrote the executor text in one script was refused by the pre-tool hook (text: "CTOC refused this call because it writes, or could write, the project's settings file or its regulatory profiles, which only CTOC's menu writes; tell the human what you wanted to change and let the menu change it."). The same two sentences were then applied with the edit tool on the declared file; no settings file or profile was touched.

### Step 14: VERIFY (again, on the final tree after the final-review fix round)
- `npm run lint`: `eslint . --max-warnings 0`, no output. `npm run typecheck`: the typecheck test passes (1 test, 1 pass, 0 fail).
- `npm test`, first run: the suite reported tests 13869, pass 13867, fail 2, skipped 0, and `[CTOC test-gate] FAIL` (coverage 99.74%, failed 2). The two failures were wall-clock scaling tests in files this plan does not touch: "the whole-file scanners stay linear on input built against them" in `tests/hotfix-check-corpus.test.js` (src/styles/statements.css: size 512 took 28.9 ms and size 2048 took 242.9 ms, 8.4 times as long) and "a passing run with a long blank stretch is read in linear time" in `tests/quality-agent-coverage.test.js` (512 KB of blank lines took 40.8 ms and 2048 KB took 521.6 ms). `uptime` at the start of that run: load averages 137.42 109.99 82.16 (other builds share the machine). Both files run alone straight after, at load averages of about 131: tests 233, pass 233, fail 0. Neither test was edited.
- `npm test`, second run (the one full rerun): tests 13869, pass 13869, fail 0, skipped 0, `[CTOC test-gate] coverage 99.73% (threshold 99%), skipped 0, failed 0`, `corpus claims: verified 3 refuted 0 unverifiable 0 (offline ledger gate: PASS)`, then `[CTOC test-gate] PASS`. `uptime` at its start: load averages 90.81 102.27 81.07.
- Surviving-mutants block (`--test-name-pattern="surviving mutants"` on `tests/plan-validator.test.js`): tests 38, pass 38, fail 0, skipped 0. The whole file: tests 102, pass 102, fail 0, skipped 0.
- The five fence and wiring files: tests 182, pass 182, fail 0, skipped 0.
- Corpus run (scratch script, not committed): `validateForReview` over every `.md` under `plans/`, 709 plans read, 0 errors starting with `Surviving mutant`, 0 plans threw. This includes this plan with its M10 row.
- Mutant M10 (the `i = j;` line deleted) was run once more as part of the fix round: the new case fails on it, 101 of 102 pass, and the code was restored and compared identical to the saved copy.

## Decisions Taken Under Ambiguity — fix round after review
These supersede the matching text under "The rules this sketch encodes" and in the executor's body above. The plan text outside the exempt sections was not edited, because any change to it changes the approval digest and cancels the build's write permission (the rule this plan sets for the executor).

1. **A level-1 heading is not read at all** (finding 1). The earlier rule "the place and the record stay open until a heading of the same or a higher level" no longer applies to level 1: a `# ...` line is the plan's title or pasted test-runner output (`# tests 26`), and closing the record on it switched the check off. The record is always a level-2 heading in practice, so a level-1 `# Execution Record` is also not taken as a record. Reviewer's reason: pasted `node --test` summary lines close the place even inside an unclosed fence.
2. **Fence closing** (finding 4) replaces "starts with the opening run": a closing line is made only of the opener's character, at least as many times as the opener; spaces after it are dropped because lines are trimmed.
3. **A table needs its delimiter row** (finding 3) is added to "Tables": the first line starting with `|` in a place is its header and the next line must be a delimiter row. If not, the check gives one error that names the place and the missing row, and the rest of that table is not read. A header alone with no delimiter row is refused too.
4. **A code span opens only when a run of the same length follows on the line** (finding 5), replacing the sketch's `splitTableRow` rule; the cell-count note now appears for any row whose cell count differs from the header's.
5. **Executor text** (finding 2): the sentence "Write the table as plain lines, never inside a code fence." is added as its own bullet, together with the delimiter-row requirement. The fenced example is kept: the agent file is not a plan, and the bullet says the fence is only there to show it.
6. **The no-space heading test uses two lines** (finding 6): `#not-a-heading` alone would be vacuous once level-1 headings are ignored (decision 1), so `###not-a-heading` is added beside it; that one closes the place if it were read as a heading.
7. **A backtick line with another backtick after its opening run is inline code, not a fence** (extends decision 2). CommonMark says so for a backtick fence; a tilde fence may carry any text after its run. Reason: a pasted line such as "```npm test``` gave pass 26" opened a fence that closed on a later bare "```" and hid the record between them.
8. **The fence scan is linear and the checklist carries `fenceLinesRead`** (corrects "one pass over the lines" in the plan's security review, which was false for this scan: 16.8 s at 160 KB before). A backward pass records the longest closing line of each fence character after each line; an opener longer than that is passed over without a scan; a closing opener scans forward once and the scan resumes after its closer. `validateSurvivingMutants` returns `checklist.fenceLinesRead`, and the test bounds it at four reads per line instead of asserting a time.
9. **The row scans are linear** (corrects "the cell splitter is linear" in the plan's security review, false at about n to the power 1.5: 4.9 s for a 2 MB line). `closingRunAfter` is deleted: `splitTableRow` records where the last backtick run of each length starts and opens a span only when a later run of that length exists. The Disposition, File and line and Mutant column positions are found once per table.
10. **A NUL in a `killed by` path gives false, never a throw** (makes the plan's "never throws on a string" true). `declaredFileExistsUnder` returns false first, so the row is named with the path minus the NUL. The contradiction scan's own existence checks of a claimed file and a referenced script (`validateNoContradictions`) call the file-system layer directly, not this function, so a NUL in prose there is outside this plan and unchanged.
11. **Quoting removes hidden and direction-changing characters** (supersedes the plan's "control characters removed" in the specification of `quoteCell` and in the security review). The class is the one in `src/lib/streaming-gate.js` (Default_Ignorable_Code_Point, Cf, Zl, Zp, U+2800) plus the control ranges, stripped before the cut to 120 characters.
12. **Symbolic links: the plan's "cannot climb above the project" holds for the path's text only; a link inside the project is followed.** No code change. Reasons: the existence of absolute paths is already reported by the contradiction scan; decision 9 of the technical decisions already lets a folder pass; and the project path may not be a real path on macOS, so a real-path check could refuse every `killed by`. The two JSDoc sentences now say this.
13. **A real level-1 heading late in a plan leaves the place open** (a consequence of decision 1). It fails toward refusing, never toward hiding: rows after it are still read.
14. **Accepted limits found by the final review, none fixed.** `fenceLinesRead` undercounts by one per closed fence, because the first probe of the forward scan is not counted; the test bound of four reads per line still holds. A second table under the same place has its header row read as a data row, a false refusal that fails toward refusing and matches the approved specification. `quoteCell`'s cut at 120 characters can split a surrogate pair, which is cosmetic.
15. **The unbounded spread is replaced by a loop** (final-review fix round). `for (const e of mutantValidation.errors) result.errors.push(e);` cannot exceed the call-stack limit; the old spread threw a RangeError at 150,000 refusals.
16. **Emptiness of a Disposition is judged after the quote-strip** (final-review fix round). A cell or an accepted reason made only of invisible characters is empty or gives no reason, as it would read to a human.
