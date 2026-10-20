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

- [ ] **Scenario: Recording survivors keeps the build's approval**
  Given an implementation plan in the build whose recorded approval matches its text
  When the executor adds a `### Surviving Mutants` table, one row per surviving mutant, inside the plan's `## Execution Record` section
  Then the plan's recorded approval still matches its text
  And the executor's next edit to a file the plan declares is allowed

- [ ] **Scenario: A fully recorded table passes the completion**
  Given a plan in the build with every step box and every acceptance criterion ticked, and a surviving-mutants table with two rows: one whose disposition reads `killed by tests/example.test.js — <test name>` for a test file that exists, and one whose disposition reads `accepted: <reason>`
  When the executor runs `menu task complete <id>`
  Then the completion is not refused, and its printed result says nothing about surviving mutants
  And the plan moves to `plans/review/`

- [ ] **Scenario: A build that ran no mutation testing is unaffected**
  Given a plan in the build with no `### Surviving Mutants` heading, or with the heading and a table that has no rows
  When the executor runs `menu task complete <id>`
  Then the printed result says nothing about surviving mutants
  And the completion is accepted or refused for the same reasons as before this change

- [ ] **Scenario: The executor's and the integrator's instructions name the place**
  Given the executor's instructions in `agents/iron-loop/iron-loop-executor.md` and the integrator's in `agents/iron-loop/iron-loop-integrator.md`
  When each file is searched for the literal heading `### Surviving Mutants`
  Then the executor's file holds it together with its parent heading `## Execution Record`, the four columns Mutant, File and line, Change and Disposition, the two dispositions, and the rule that every mutant that survived the run is recorded, not only the ones a report lists
  And the integrator's file holds it in the instruction that a step which runs mutation testing names this place for its survivors

- [ ] **Scenario: A survivor without a disposition is named at completion**
  Given a plan in the build with every step box and every acceptance criterion ticked, and a surviving-mutants row for `src/lib/example.js:45` whose Disposition cell is empty
  When the executor runs `menu task complete <id>`
  Then the printed result names `src/lib/example.js:45` and the two accepted dispositions, `killed by <test file>` and `accepted: <reason>`
  And, on the recommended answer to the owner's question below, the completion is refused, the plan stays in `plans/in-progress/`, and the refusal is counted as one send-back of the verify step (Step 14)

- [ ] **Scenario: A disposition in neither form is named**
  Given a surviving-mutants table with one row whose disposition reads `fix later` and one whose disposition reads `accepted:` with nothing after the colon
  When the executor runs `menu task complete <id>`
  Then the printed result names both rows, and says that the first is in neither accepted form and the second gives no reason

- [ ] **Scenario: A killed disposition that names a missing test file is named**
  Given a surviving-mutants row whose disposition reads `killed by tests/no-such-file.test.js`, and no such file exists in the project
  When the executor runs `menu task complete <id>`
  Then the printed result names that row and the missing file `tests/no-such-file.test.js`

- [ ] **Scenario: Every open row is named, and only the open rows**
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
