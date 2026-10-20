---
title: "The operating lessons say CTOC is built with CTOC and friction is filed as a plan"
created: "2026-10-20T13:37:49.349Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 10
risk_level: MEDIUM
---

# The operating lessons say CTOC is built with CTOC and friction is filed as a plan

## Problem Statement
CTOC's operating lessons, the rules every session reads in every CTOC project, lack two rules the owner has given. On 2026-10-20 he ruled that CTOC is built with CTOC and that every friction found while doing so is filed as a plan, not worked around; on 2026-10-18 he ruled that every failing test, including one that passes on rerun, is reproduced and root-caused before anything is reported or merged, and that rule replaces lesson 14 ("Fix the failures, not the tests"). The lessons block ships into every CTOC user's `CLAUDE.md`, so both lessons must read correctly in any project and carry no person's name, and they must fit this repository's own `CLAUDE.md`, which holds the same block and must stay at or under 15,000 bytes (14,730 bytes as relayed by the CTO Chief, not measured in this refinement). Until both are lessons, a session that meets pipeline friction or a test that fails once has no standing rule: on 2026-10-20 the coordinator worked around the menu by hand, and on 2026-10-18 a session changed a failing test instead of investigating it.

## Decomposition

Source: `plans/decomposition/ctoc-is-built-with-ctoc.md`. Stories marked `[MVP]` are the smallest end-to-end version; there are no remaining stories in this plan, and no phase or schedule (the owner alone chooses what is built and when).

Where this record differs from the refined sections below, the refined sections hold. The Product Owner's trace found that `.ctoc/templates/CLAUDE.md.template` takes no lesson text (it holds only the empty block markers that project setup fills), and the owner's rule on failing tests joined this plan as the new lesson 14; both are explained under `## Decisions Taken Under Ambiguity`.

### Vision item carried
- "The operating lesson: CTOC is built with CTOC."

### Goal: What was learned while dogfooding is recorded where the next builder finds it
- **Actor:** the iron-loop executor and integrator writing and building plans, and every future maintainer.
- **Impact:** the rule "CTOC is built with CTOC" is an operating lesson.
- **Success metric:** the new lesson is in the lesson lists, `tests/claude-md-lessons.test.js` and `tests/claude-md-keeps-every-rule.test.js` pass, and `CLAUDE.md` stays at or under 15,000 bytes.

### Activities
1. Trace where the lesson lists come from.
2. Add the lesson everywhere the lists live, within the size limit.

### Stories
- [ ] `[MVP]` Spike: As the planner, I want it traced whether the repository's `CLAUDE.md` lesson block is filled from `.ctoc/templates/operating-lessons.md`, so that I know whether the new lesson must fit the reported 270 bytes of room.
  - Acceptance: the plan records the current byte size of `CLAUDE.md` (measured, not relayed) and every file the lesson must land in.
  - INVEST: passes as a time-boxed investigation.
- [ ] `[MVP]` As every maintainer, I want the lesson "CTOC is built with CTOC; friction found while dogfooding is filed as a plan, not worked around" in `docs/OPERATING_LESSONS.md`, `.ctoc/templates/operating-lessons.md`, `.ctoc/templates/CLAUDE.md.template` and the repository's `CLAUDE.md`, so that the owner's ruling of 2026-10-20 is a standing rule.
  - Acceptance: `tests/claude-md-lessons.test.js` and `tests/claude-md-keeps-every-rule.test.js` (with `tests/fixtures/claude-md-rule-inventory.json`) pass, and `CLAUDE.md` stays at or under 15,000 bytes without cutting another rule.
  - INVEST: passes all six criteria.

### Dependencies
- Story level: adding the lesson depends on the measured size and the traced list of files.
- Plan level: none.

## Business Alignment

**Job to Be Done:** When I am building with CTOC and the pipeline blocks me or a test fails, I want a standing rule that tells me to file the friction as a plan and to root-cause the failing test, so I can fix each cause once instead of working around it in every session.

**Impact Map:**
- **Goal:** What was learned while dogfooding is recorded where the next builder finds it (the vision's success criterion "The operating lesson is in place").
- **Actor:** the sessions and agents that build with CTOC: the CTO Chief, the coordinator session and the background agents that build CTOC for the owner, and after them every CTOC user's sessions, which read the same lessons block.
- **Impact:** a session that meets pipeline friction tells the human and files a plan instead of a by-hand workaround; a session that meets a failing test, including one that passes on rerun, reproduces it and finds the cause in the product code instead of rerunning or editing the test.
- **Deliverable:** the new lesson 14 and a new lesson 21 in the lessons source and in this repository's `CLAUDE.md`, their full texts in `docs/OPERATING_LESSONS.md`, the replaced wording kept word for word, the rule inventory pinning all of it, and the four instruction files that quote the replaced lesson re-pointed.

**Alignment checks:**
1. Goal traces to the vision's problem statement: YES. The vision lists "The rule 'CTOC is built with CTOC' is not yet an operating lesson" among its ten frictions; the failing-test rule joins through the CTO Chief's brief for this refinement (see Decisions).
2. Actor is in the vision's target audience: YES. The vision names the owner, the CTO Chief and background agents, and "every CTOC user whose plans hit these routes".
3. Impact is observable: YES. Whether a session filed a plan or worked around, and whether a failing test was root-caused or rerun, shows in the plans and the session record.
4. Deliverable is one functional area: YES. Everything lands in the operating lessons and the files that quote them.

## User Stories

**Story 1: the failing-test rule is lesson 14.**
**As a** session building in any CTOC project, **I want** lesson 14 to carry the owner's rule "Always investigate failing tests" in his words without his name, **so that** a failing test, including one that passes on rerun, is root-caused in the product code instead of rerun or edited until green.

**Story 2: the friction rule is lesson 21.**
**As a** session building with CTOC, in CTOC itself or in a user's project, **I want** a lesson that tells me to tell the human and file a plan when the pipeline blocks or misleads me, and never to route around it by hand, **so that** each friction is fixed once instead of worked around in every session.

**Story 3: nothing quotes the replaced lesson as current.**
**As a** maintainer reading the full lesson texts, or an agent following a citation in its instructions, **I want** `docs/OPERATING_LESSONS.md` and the agent instructions to agree with the new lesson list, **so that** no instruction sends me to a lesson that no longer exists.

Technical enabler, attached to Story 2: measure this repository's `CLAUDE.md` in bytes before any edit and record the number in the implementation plan (the decomposition's spike, minus the file trace, which this refinement did; see Decisions).

**INVEST:**

| Story | Independent | Negotiable | Valuable | Estimable | Small | Testable |
|---|---|---|---|---|---|---|
| 1 | Yes | Yes: the words are the owner's; where the replaced words are kept is open | Yes | Yes | Yes: two lesson lines, one full text, inventory entries | Yes: scenarios 1 to 4 |
| 2 | Yes | Yes: the recommended wording may be tightened, not changed in meaning | Yes | Yes | Yes: one lesson line, one full text, one inventory entry | Yes: scenarios 5 to 8 |
| 3 | Qualified: re-points citations to Story 1's new text, so it is built after Story 1 inside this plan | Yes: which rule each citation names is the planner's choice | Yes | Yes | Yes: four instruction files and one pinning test | Yes: scenarios 9 and 10 |

## Scope

### In Scope
- Lesson 14 replaced by the owner's failing-test rule, without his name or its date, in `.ctoc/templates/operating-lessons.md` and in the lessons block of this repository's `CLAUDE.md` (scenarios 1, 2 and 3).
- Lesson 21, the friction rule, added after lesson 20 in the same two files (scenarios 2, 3 and 5).
- `CLAUDE.md` measured in bytes before the change and kept at or under 15,000 bytes without cutting any rule (scenarios 6 and 7).
- `docs/OPERATING_LESSONS.md`: the full texts of the new lesson 14 and of lesson 21, lesson 20 copied word for word from the block, and lesson 14's replaced full text and replaced short text kept word for word under a dated "Replaced" heading (scenarios 4, 8 and 9).
- `tests/fixtures/claude-md-rule-inventory.json`: the new lesson 14 as the current text of the rule that holds lesson 14, an entry pinning the replaced short text in `docs/OPERATING_LESSONS.md`, and an entry pinning lesson 21 in `.ctoc/templates/operating-lessons.md` (scenarios 4 and 5).
- A test that drives the real lessons refresh on a temporary user project and finds both new lessons there (scenario 2).
- The citations of the replaced lesson in `agents/testing/writers/unit-test-writer.md`, `skills/testing/writers/unit-test-writer/SKILL.md`, `agents/ai-quality/ai-code-quality-reviewer.md` and `skills/ai-quality/ai-code-quality-reviewer/SKILL.md`, and the pin of the test writer's citation in `tests/test-writers-get-the-fast-test-rules.test.js` (scenario 10).

### Out of Scope
Each item says where it lives. None is a scheduling choice; the owner alone schedules.
- `.ctoc/templates/CLAUDE.md.template` is not edited. It holds only the empty lessons markers (lines 71 to 73), which project setup fills from the lessons source (`src/lib/init-project.js:750-758`), so a new project receives both lessons without it.
- `.ctoc/templates/operating-manual.md` is not edited. Its hard rule at line 16 already says "NEVER weaken a test, delete an assertion, mock away a failure, or special-case an input to make a check pass." The owner's own global guidance also appends the replaced lesson 14 sentence ("Change a test only when it is plain wrong, and only to tighten it; …") to that rule, and CTOC's shipped manual does not. That is listed for the owner to schedule as its own change.
- Number-only references to "lesson 14" stay as they are: the test comments at `tests/stale-detector-cheap.test.js:614`, `tests/approval-hash-survives-execution.test.js:191`, `tests/ledger-forgery-closed.test.js:744`, `tests/evidence-pack-main.test.js:50` and `tests/claim-fetcher.test.js:10`, and `docs/FENCES.md:313`. Each refers to changing a test or a check to turn it green, which the new lesson 14 still governs ("change the test only when it is proven wrong, with the reason written down"); the test comments are dated history.
- Notes under `.ctoc/audit/` that quote the replaced lesson are dated audit records and stay unchanged.
- The owner's global guidance file, which holds his own copy of the lessons, is outside the repository.
- The hotfix paragraph for the lessons block belongs to its own plan, "Every session is told that a hotfix word is checked, and how to run the check and commit" (`plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s4-every-session-is-told.md`). It competes for the same bytes (see Risks).
- Making room in `CLAUDE.md` by moving other text out is not part of this plan. If scenario 7 happens, the owner decides what moves.

## Acceptance Criteria

Story 1: scenarios 1 to 4. Story 2: scenarios 5 to 8. Story 3: scenarios 9 and 10. Scenarios 2 and 3 cover both new lessons.

- [ ] **Scenario 1: Lesson 14 is the owner's rule on failing tests**
  Given `.ctoc/templates/operating-lessons.md` and this repository's `CLAUDE.md` after the change
  When a maintainer reads lesson 14 in either file
  Then it reads, word for word: `14. **Always investigate failing tests.** Every failing test — including one that passes on rerun — is reproduced and root-caused in the product code before anything is reported or merged; "flaky" is a finding, never an explanation. Fix the code; change the test only when it is proven wrong, with the reason written down.`
  And the words "Fix the failures, not the tests" appear in neither file

- [ ] **Scenario 2: A CTOC user's project receives both new lessons**
  Given a temporary user project whose `CLAUDE.md` holds the user's own text and the lessons block as it was before this change
  When CTOC refreshes the lessons block through `ensureLessonsBlock`, the function that session start and `/ctoc:update` call
  Then that project's `CLAUDE.md` shows the new lesson 14 and lesson 21
  And every byte outside the lessons block is unchanged

- [ ] **Scenario 3: The two lessons carry no name and nothing that exists only in CTOC's repository**
  Given the lessons block after the change
  When the text of lessons 14 and 21 is searched
  Then neither contains the owner's name, a date, a backticked file or folder path, or the words "CTOC repository"

- [ ] **Scenario 4: Lesson 14's replaced wording survives word for word**
  Given `docs/OPERATING_LESSONS.md` after the change
  When a maintainer reads the section that records rules replaced on the owner's instruction of 2026-10-18
  Then it holds lesson 14's previous full text ("14. **Fix the failures, not the tests.** When a test fails, the default is that the code is wrong — …") and its previous short text ("14. **Fix the failures, not the tests.** A failing test means the code is wrong until proven otherwise. …"), each word for word
  And `tests/claude-md-keeps-every-rule.test.js` passes with the inventory pinning the new lesson 14 in `.ctoc/templates/operating-lessons.md` and both previous texts in `docs/OPERATING_LESSONS.md`

- [ ] **Scenario 5: The friction rule is lesson 21**
  Given `.ctoc/templates/operating-lessons.md` and this repository's `CLAUDE.md` after the change
  When a maintainer reads the lesson list
  Then lesson 21 says that when the pipeline blocks or misleads you, you tell the human and file a plan for it, and never route around it by hand
  And the lesson numbers run 1 to 21 with none missing or repeated, and lessons 1 to 13 and 15 to 20 are unchanged word for word
  And the rule inventory pins lesson 21's text in `.ctoc/templates/operating-lessons.md`

- [ ] **Scenario 6: CLAUDE.md stays within its 15,000-byte limit**
  Given this repository's `CLAUDE.md` measured in bytes before the change, with the number recorded in the implementation plan
  When both lesson changes are in place
  Then `CLAUDE.md` is at or under 15,000 bytes
  And its lessons block is identical to the block in `.ctoc/templates/operating-lessons.md`
  And every line of `CLAUDE.md` outside the lessons block is unchanged

- [ ] **Scenario 7: Room is never made by cutting a rule**
  Given the two lessons would take `CLAUDE.md` over 15,000 bytes
  When the builder adds them
  Then `tests/claude-md-keeps-every-rule.test.js` fails and names the measured size
  And the build stops and reports the measured size and the bytes still needed to the owner, with no other rule shortened, moved or removed

- [ ] **Scenario 8: The full text records the dogfooding ruling**
  Given `docs/OPERATING_LESSONS.md` after the change
  When a maintainer reads lesson 21's full text
  Then it states the ruling of 2026-10-20 that CTOC is built with CTOC and that friction found while doing so is filed as a plan, not worked around
  And it states that the short lesson is the general form that every CTOC project receives
  And it contains no person's name

- [ ] **Scenario 9: The full-text list has no gap**
  Given `docs/OPERATING_LESSONS.md` after the change
  When a maintainer reads its numbered lesson list
  Then it holds lessons 1 to 21 in order
  And its lesson 20 matches lesson 20 of the lessons block word for word

- [ ] **Scenario 10: No instruction quotes the replaced lesson as current**
  Given `agents/testing/writers/unit-test-writer.md`, `skills/testing/writers/unit-test-writer/SKILL.md`, `agents/ai-quality/ai-code-quality-reviewer.md` and `skills/ai-quality/ai-code-quality-reviewer/SKILL.md` after the change
  When an agent reads its citation of the rule on changing a test
  Then each citation names or quotes a rule that is present word for word in the current lessons block or in `.ctoc/templates/operating-manual.md`
  And `tests/test-writers-get-the-fast-test-rules.test.js` pins the test writer's new citation in both its agent file and its skill file

## Risks

### Technical Risks
- Size: the room in `CLAUDE.md` is relayed, not measured. By hand count the change adds 199 bytes: lesson 14 grows from 287 to 326 bytes (each of its two dashes is three bytes), and lesson 21 as recommended is 159 bytes plus its line break. The relayed room is 270 bytes.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Measure `CLAUDE.md` in bytes before the first edit; if the two lessons do not fit, stop at scenario 7 and report.
- The inventory could be changed so that the test passes while the replaced short text of lesson 14 is no longer pinned anywhere.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Write the inventory entries first and run `tests/claude-md-keeps-every-rule.test.js` to see it fail on the missing lesson texts before any lesson is edited.
- The block in `CLAUDE.md` drifts from the source: session start never refreshes CTOC's own `CLAUDE.md` (`src/hooks/SessionStart.js:280-286` skips CTOC's own repository), so the copy is made by hand.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Run the existing equality test (`tests/claude-md-keeps-every-rule.test.js:103-111`), which fails on any difference between the two blocks.

### Business Risks
- The general wording of lesson 21 leaves the literal sentence "CTOC is built with CTOC" out of the lessons block, which the vision's success criterion quotes.
  - Likelihood: HIGH, because it is the decision taken here
  - Impact: LOW
  - Mitigation: Record the ruling in lesson 21's full text (scenario 8). `CLAUDE.md` line 3 already says "CTOC dogfoods its own Iron Loop."
- Replacing lesson 14 removes "only to tighten it; never weaken an assertion, widen a range, or delete a case or whitelist without a written reason" from the lessons block.
  - Likelihood: HIGH, because it follows from the replacement
  - Impact: LOW
  - Mitigation: Keep the words in `docs/OPERATING_LESSONS.md` (scenario 4). The shipped manual's "NEVER weaken a test" rule and the new lesson's "change the test only when it is proven wrong, with the reason written down" still forbid the weakening; the manual change that would carry the full sentence is listed for the owner (Out of Scope).

### Dependency Risks
- The same bytes are wanted by "Every session is told that a hotfix word is checked, and how to run the check and commit" (`plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s4-every-session-is-told.md`), which adds a paragraph to the same block in the same two files. Read from its text, that paragraph alone is longer than 270 bytes (estimated, not measured).
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Build the two plans one at a time; whichever builds second measures `CLAUDE.md` again from the other's result and stops at scenario 7 if it does not fit.
- The two unit-test-writer files are also edited by "The unit test writer, agent and skill, improved three times from fresh web research" (`plans/todo/00363-every-agent-and-specialist-skill-improved-three-times-s103-unit-test-writer.md`, in the build queue).
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Build the two plans one at a time, and re-read both unit-test-writer files at the start of whichever builds second.
- Search behind the two risks above: the pattern `unit-test-writer\.md|unit-test-writer/SKILL\.md|ai-code-quality-reviewer\.md|ai-code-quality-reviewer/SKILL\.md|test-writers-get-the-fast-test-rules|claude-md-rule-inventory|claude-md-lessons\.test` over `plans/{functional,implementation,todo,in-progress,review}` matched ten files, and the pattern `templates/operating-lessons\.md|OPERATING_LESSONS\.md` over the same folders matched three: this plan, the hotfix slice, and "ctoc-keeps-working-and-asks-only-what-matters" (`plans/functional/ctoc-keeps-working-and-asks-only-what-matters.md`), whose slice 3 replaced rules in this same way and whose replaced texts are already in `docs/OPERATING_LESSONS.md` and the inventory (rules r0145 to r0147). A match shows that a plan names the file, not that it is still unbuilt.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Read the then-current lessons source, `CLAUDE.md`, `docs/OPERATING_LESSONS.md` and the inventory at the start of the build, never a copy quoted in this plan.

## Priority

**Priority: MEDIUM** (Score: 5/9)
- Dependency: 2 -- no other stub depends on it; it builds in parallel with the other eight stubs of this vision.
- Business Impact: 2 -- it supports the vision's primary goal (CTOC is built through its own menu) by making the rule standing, and carries the owner's failing-test rule into every CTOC project.
- Technical Risk: 1 -- text changes in known files under existing tests; the byte budget is the only tight point.

## Decisions Taken Under Ambiguity

1. **Where the lessons live (verified by reading the source in this refinement).** `.ctoc/templates/operating-lessons.md` is the single source of the block (`src/lib/claude-md-lessons.js:4-6`); session start and `/ctoc:update` copy it into user projects through `ensureLessonsBlock`. Session start skips CTOC's own repository (`src/hooks/SessionStart.js:280-290`), so this repository's `CLAUDE.md` carries a hand-made copy that `tests/claude-md-keeps-every-rule.test.js:103-111` holds identical to the source. Both lessons therefore count against `CLAUDE.md`'s 15,000 bytes. `.ctoc/templates/CLAUDE.md.template` holds only the empty markers (lines 71 to 73) that project setup fills (`src/lib/init-project.js:750-758`), so it is not edited. This corrects the vision and the decomposition, which named it. This trace replaces the decomposition's spike; only the byte measurement remains, as the technical enabler of Story 2.
2. **The failing-test rule joins this plan.** The vision does not name it; the CTO Chief's brief for this refinement does, relaying the owner's rule of 2026-10-18. It shares every file and the byte budget with lesson 21, so a separate plan would edit the same block and compete for the same bytes.
3. **Lesson 14 wording.** The owner's words from his global guidance, with the parenthesis after the title, which holds his name and the date, removed: no name and no date, as no other lesson carries a date. The text is in scenario 1. It names no file and works in any project ("the product code", "reported or merged"). The trigger named in the problem statement (a session changed a failing test instead of investigating it) is the one recorded with the owner's rule.
4. **Lesson 21 is general.** The brief requires the lesson to work in any CTOC user's project, and "CTOC is built with CTOC" is true only in CTOC's own repository. The block therefore carries the general rule, and the ruling itself goes into the full text (scenario 8). Recommended wording, 159 bytes: `21. **Friction is a plan, never a workaround.** When the pipeline blocks or misleads you, tell the human and file a plan for it; never route around it by hand.` The implementation planner may tighten it, never past this meaning.
5. **"Tell the human" in lesson 21.** In a user's project, friction inside CTOC cannot be fixed there; telling the human lets him pass it on. The lesson asks no agent to send anything off the machine, because sends wait for an explicit request under the operating manual.
6. **Numbering.** Lesson 14 is replaced in place and lesson 21 is appended. Nothing is renumbered, because `CLAUDE.md` cites lesson 19 by number and other files cite lesson 14.
7. **How the replaced wording is kept.** As on 2026-10-07 for lesson 2 (inventory rules r0099 and r0145): the rule that holds lesson 14 (r0111) gets the new lesson as its current text and keeps its old full text, which stays word for word in `docs/OPERATING_LESSONS.md`; a new entry pins the replaced short text in the same file; both go under a heading for the owner's instruction of 2026-10-18. Changing r0111 is how this test records a replaced rule. It does not weaken the test: every replaced word stays pinned.
8. **The inventory is the test written first.** New entries for lesson 21 and the replaced text are added before any lesson changes, and the test is run and seen failing. The user-project check of scenario 2 goes into the existing `tests/claude-md-lessons.test.js`. With no new test file, the test-file count written in `CLAUDE.md` does not change.
9. **The operating manual is not changed here.** The substance of the removed clause stays in force (Business Risks). Putting the full sentence into the shipped manual, as the owner's global guidance does, is a change to what every user project receives, so it is listed for him to schedule rather than added here.
10. **Four citations are re-pointed in this plan.** Replacing lesson 14 would leave the test writer's agent and skill citing "CTOC's lesson 'Fix the failures, not the tests'" (pinned at `tests/test-writers-get-the-fast-test-rules.test.js:63`) and the code-quality reviewer's agent (line 79) and skill (line 485) quoting the replaced text as "lesson 14". That is a defect this change would cause, so its fix is part of the change. Which current rule each citation names is the implementation planner's choice under scenario 10. Search: the pattern `Fix the failures, not the tests` over the worktree, excluding `plans/`, matched seven files: the three files that hold the lessons (`CLAUDE.md`, the lessons source, `docs/OPERATING_LESSONS.md`), the rule inventory, the test writer's agent and skill, and the pinning test. The pattern `Fix the failures, not the tests|[Ll]esson 14`, excluding `plans/` and the inventory, added the code-quality reviewer's agent and skill, the number-only references listed under Out of Scope, and notes under `.ctoc/audit/`.
11. **Lesson 20 is copied into the full-text list.** `docs/OPERATING_LESSONS.md` lists lessons 1 to 19 only; the pattern `Never wait in a sleep loop` over the worktree, excluding `plans/`, matched only `CLAUDE.md` and the lessons source. Adding lesson 21 after lesson 19 would leave a gap this plan itself wrote, so lesson 20 is copied word for word from the block, with no new wording. No file states a lesson count: the case-insensitive pattern `(20|twenty) (operating )?lessons|lessons? 1[-–]20|lessons 1 to 20` over the worktree, excluding `plans/` and `.ctoc/audit/`, matched nothing.
12. **The byte figures are hand counts.** The 270 bytes of room are relayed, and the 199 added bytes were counted by hand, not measured; the builder measures both (scenario 6).
13. **No questions file and no status file were written.** The brief allowed edits to this plan file only, so the brief governed over the agent file's instruction to write a questions file as a last act. No status file exists for this plan.
14. **No instruction in the stub, the vision or the decomposition asked for anything beyond this refinement.**

## Questions for the Owner

None block this plan. Every fork above has one clear best answer, recorded as a decision for review to check. The one item that is his alone to schedule, putting the replaced lesson 14 sentence into the operating manual shipped to every project, is listed under Out of Scope.
