---
title: "The operating lessons say CTOC is built with CTOC and friction is filed as a plan"
created: "2026-10-20T13:37:49.349Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 11
risk_level: MEDIUM
files:
  - .ctoc/templates/operating-lessons.md
  - CLAUDE.md
  - docs/OPERATING_LESSONS.md
  - .ctoc/templates/operating-manual.md
  - tests/fixtures/claude-md-rule-inventory.json
  - tests/claude-md-lessons.test.js
  - tests/operating-manual.test.js
  - agents/testing/writers/unit-test-writer.md
  - skills/testing/writers/unit-test-writer/SKILL.md
  - tests/test-writers-get-the-fast-test-rules.test.js
  - agents/ai-quality/ai-code-quality-reviewer.md
  - skills/ai-quality/ai-code-quality-reviewer/SKILL.md
  # CLAUDE.md above is real work (its hand-made copy of the lessons block), not the count
  # ratchet: this plan creates no file of a counted kind, so no documented count moves.
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
- **Deliverable:** the new lesson 14, lesson 21 (the rule the menu already cites under that number) and a new lesson 22 in the lessons source and in this repository's `CLAUDE.md`, their full texts in `docs/OPERATING_LESSONS.md`, the replaced wording kept word for word, the replaced lesson's sentence on changing a test in the shipped operating manual, the rule inventory pinning all of it, and the four instruction files that quote the replaced lesson re-pointed.

**Alignment checks:**
1. Goal traces to the vision's problem statement: YES. The vision lists "The rule 'CTOC is built with CTOC' is not yet an operating lesson" among its ten frictions; the failing-test rule joins through the CTO Chief's brief for this refinement (see Decisions).
2. Actor is in the vision's target audience: YES. The vision names the owner, the CTO Chief and background agents, and "every CTOC user whose plans hit these routes".
3. Impact is observable: YES. Whether a session filed a plan or worked around, and whether a failing test was root-caused or rerun, shows in the plans and the session record.
4. Deliverable is one functional area: YES. Everything lands in the operating lessons and the files that quote them.

## User Stories

**Story 1: the failing-test rule is lesson 14.**
**As a** session building in any CTOC project, **I want** lesson 14 to carry the owner's rule "Always investigate failing tests" in his words without his name, **so that** a failing test, including one that passes on rerun, is root-caused in the product code instead of rerun or edited until green.

**Story 2: the friction rule is lesson 22.**
**As a** session building with CTOC, in CTOC itself or in a user's project, **I want** a lesson that tells me to tell the human and file a plan when the pipeline blocks or misleads me, and never to route around it by hand, **so that** each friction is fixed once instead of worked around in every session.

**Story 3: nothing quotes the replaced lesson as current.**
**As a** maintainer reading the full lesson texts, or an agent following a citation in its instructions, **I want** `docs/OPERATING_LESSONS.md` and the agent instructions to agree with the new lesson list, **so that** no instruction sends me to a lesson that no longer exists.

**Story 4: the rule the menu cites as lesson 21 is in the lists.**
**As a** session that follows the menu's instructions, which cite "Start the next plan while the tests run" as Operating Lesson 21, **I want** that lesson in the lessons block and in the full texts, **so that** the citation leads to the rule it names. (Added in technical planning; see "Lesson 21 is already taken" under the technical-planning decisions.)

Technical enabler, attached to Story 2: measure this repository's `CLAUDE.md` in bytes before any edit and record the number in the implementation plan (the decomposition's spike, minus the file trace, which this refinement did; see Decisions).

**INVEST:**

| Story | Independent | Negotiable | Valuable | Estimable | Small | Testable |
|---|---|---|---|---|---|---|
| 1 | Yes | Yes: the words are the owner's; where the replaced words are kept is open | Yes | Yes | Yes: two lesson lines, one full text, inventory entries, one manual sentence | Yes: scenarios 1 to 4 and 11 |
| 2 | Yes | Yes: the recommended wording may be tightened, not changed in meaning | Yes | Yes | Yes: one lesson line, one full text, one inventory entry | Yes: scenarios 5 to 8 |
| 3 | Qualified: re-points citations to Story 1's new text, so it is built after Story 1 inside this plan | Yes: which rule each citation names is the planner's choice | Yes | Yes | Yes: four instruction files and one pinning test | Yes: scenarios 9 and 10 |
| 4 | Yes | Yes: the short wording is the planner's; the meaning is the owner's rule of 2026-10-17 | Yes | Yes | Yes: one lesson line, one full text, one inventory entry | Yes: scenarios 2, 3, 5 and 9 |

## Scope

### In Scope
- Lesson 14 replaced by the owner's failing-test rule, without his name or its date, in `.ctoc/templates/operating-lessons.md` and in the lessons block of this repository's `CLAUDE.md` (scenarios 1, 2 and 3).
- Lesson 21, "Start the next plan while the tests run", and lesson 22, the friction rule, added after lesson 20 in the same two files (scenarios 2, 3 and 5).
- `CLAUDE.md` measured in bytes before the change and kept at or under 15,000 bytes without cutting any rule (scenarios 6 and 7).
- `docs/OPERATING_LESSONS.md`: the full texts of the new lesson 14 and of lessons 21 and 22, lesson 20 copied word for word from the block, and lesson 14's replaced full text and replaced short text kept word for word under a dated "Replaced" heading (scenarios 4, 8 and 9).
- `tests/fixtures/claude-md-rule-inventory.json`: the new lesson 14 as the current text of the rule that holds lesson 14, an entry pinning the replaced short text in `docs/OPERATING_LESSONS.md`, entries pinning lessons 21 and 22 in `.ctoc/templates/operating-lessons.md`, and an entry pinning the manual's added sentence in `.ctoc/templates/operating-manual.md` (scenarios 4, 5 and 11).
- A test that drives the real lessons refresh on a temporary user project and finds the three new lessons there (scenario 2).
- The replaced lesson 14's sentence "Change a test only when it is plain wrong, and only to tighten it; never weaken an assertion, widen a range, or delete a case or whitelist without a written reason, to turn red green." appended to the hard rule "NEVER weaken a test" in `.ctoc/templates/operating-manual.md`, with a test that drives the real manual refresh on a temporary user project (scenario 11). The question on the replaced test rule was settled by its recommended option, "Add the sentence to the shipped manual in this plan".
- The citations of the replaced lesson in `agents/testing/writers/unit-test-writer.md`, `skills/testing/writers/unit-test-writer/SKILL.md`, `agents/ai-quality/ai-code-quality-reviewer.md` and `skills/ai-quality/ai-code-quality-reviewer/SKILL.md`, and the pin of the test writer's citation in `tests/test-writers-get-the-fast-test-rules.test.js` (scenario 10).

### Out of Scope
Each item says where it lives. None is a scheduling choice; the owner alone schedules.
- `.ctoc/templates/CLAUDE.md.template` is not edited. It holds only the empty lessons markers (lines 71 to 73), which project setup fills from the lessons source (`src/lib/init-project.js:750-758`), so a new project receives the new lessons without it.
- Number-only references to "lesson 14" stay as they are: the test comments at `tests/stale-detector-cheap.test.js:614`, `tests/approval-hash-survives-execution.test.js:191`, `tests/ledger-forgery-closed.test.js:744`, `tests/evidence-pack-main.test.js:50` and `tests/claim-fetcher.test.js:10`, and `docs/FENCES.md:313`. Each refers to changing a test or a check to turn it green, which the new lesson 14 still governs ("change the test only when it is proven wrong, with the reason written down"); the test comments are dated history.
- Notes under `.ctoc/audit/` that quote the replaced lesson are dated audit records and stay unchanged.
- The owner's global guidance file, which holds his own copy of the lessons, is outside the repository.
- The hotfix paragraph for the lessons block belongs to its own plan, "Every session is told that a hotfix word is checked, and how to run the check and commit" (`plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s4-every-session-is-told.md`). It competes for the same bytes (see Risks).
- Making room in `CLAUDE.md` by moving other text out is not part of this plan. If scenario 7 happens, the owner decides what moves.

## Acceptance Criteria

Story 1: scenarios 1 to 4 and 11. Story 2: scenarios 5 to 8. Story 3: scenarios 9 and 10. Story 4: scenarios 2, 3, 5 and 9. Scenarios 2 and 3 cover all three new lessons.

- [ ] **Scenario 1: Lesson 14 is the owner's rule on failing tests**
  Given `.ctoc/templates/operating-lessons.md` and this repository's `CLAUDE.md` after the change
  When a maintainer reads lesson 14 in either file
  Then it reads, word for word: `14. **Always investigate failing tests.** Every failing test — including one that passes on rerun — is reproduced and root-caused in the product code before anything is reported or merged; "flaky" is a finding, never an explanation. Fix the code; change the test only when it is proven wrong, with the reason written down.`
  And the words "Fix the failures, not the tests" appear in neither file

- [ ] **Scenario 2: A CTOC user's project receives the new lessons**
  Given a temporary user project whose `CLAUDE.md` holds the user's own text and the lessons block as it was before this change
  When CTOC refreshes the lessons block through `ensureLessonsBlock`, the function that session start and `/ctoc:update` call
  Then that project's `CLAUDE.md` shows the new lesson 14, lesson 21 and lesson 22
  And every byte outside the lessons block is unchanged

- [ ] **Scenario 3: The three lessons carry no name and nothing that exists only in CTOC's repository**
  Given the lessons block after the change
  When the text of lessons 14, 21 and 22 is searched
  Then none contains the owner's name, a date, a backticked file or folder path, or the words "CTOC repository"

- [ ] **Scenario 4: Lesson 14's replaced wording survives word for word**
  Given `docs/OPERATING_LESSONS.md` after the change
  When a maintainer reads the section that records rules replaced on the owner's instruction of 2026-10-18
  Then it holds lesson 14's previous full text ("14. **Fix the failures, not the tests.** When a test fails, the default is that the code is wrong — …") and its previous short text ("14. **Fix the failures, not the tests.** A failing test means the code is wrong until proven otherwise. …"), each word for word
  And `tests/claude-md-keeps-every-rule.test.js` passes with the inventory pinning the new lesson 14 in `.ctoc/templates/operating-lessons.md` and both previous texts in `docs/OPERATING_LESSONS.md`

- [ ] **Scenario 5: The friction rule is lesson 22, after lesson 21**
  Given `.ctoc/templates/operating-lessons.md` and this repository's `CLAUDE.md` after the change
  When a maintainer reads the lesson list
  Then lesson 21 reads, word for word: `21. **Start the next plan while the tests run**, in its own git worktree, on disjoint files.`
  And lesson 22 reads, word for word: `22. **Friction is a plan.** When the pipeline blocks or misleads you, tell the human and file a plan; never work around it.`
  And the lesson numbers run 1 to 22 with none missing or repeated, and lessons 1 to 13 and 15 to 20 are unchanged word for word
  And the rule inventory pins the texts of lessons 21 and 22 in `.ctoc/templates/operating-lessons.md`

- [ ] **Scenario 6: CLAUDE.md stays within its 15,000-byte limit**
  Given this repository's `CLAUDE.md` measured in bytes before the change, with the number recorded in the implementation plan
  When all three lesson changes are in place
  Then `CLAUDE.md` is at or under 15,000 bytes
  And its lessons block is identical to the block in `.ctoc/templates/operating-lessons.md`
  And every line of `CLAUDE.md` outside the lessons block is unchanged

- [ ] **Scenario 7: Room is never made by cutting a rule**
  Given the lesson changes would take `CLAUDE.md` over 15,000 bytes
  When the builder adds them
  Then `tests/claude-md-keeps-every-rule.test.js` fails and names the measured size
  And the build stops and reports the measured size and the bytes still needed to the owner, with no other rule shortened, moved or removed

- [ ] **Scenario 8: The full text records the dogfooding ruling**
  Given `docs/OPERATING_LESSONS.md` after the change
  When a maintainer reads lesson 22's full text
  Then it states the ruling of 2026-10-20 that CTOC is built with CTOC and that friction found while doing so is filed as a plan, not worked around
  And it states that the short lesson is the general form that every CTOC project receives
  And it contains no person's name

- [ ] **Scenario 9: The full-text list has no gap**
  Given `docs/OPERATING_LESSONS.md` after the change
  When a maintainer reads its numbered lesson list
  Then it holds lessons 1 to 22 in order
  And its lesson 20 matches lesson 20 of the lessons block word for word

- [ ] **Scenario 10: No instruction quotes the replaced lesson as current**
  Given `agents/testing/writers/unit-test-writer.md`, `skills/testing/writers/unit-test-writer/SKILL.md`, `agents/ai-quality/ai-code-quality-reviewer.md` and `skills/ai-quality/ai-code-quality-reviewer/SKILL.md` after the change
  When an agent reads its citation of the rule on changing a test
  Then each citation names or quotes a rule that is present word for word in the current lessons block or in `.ctoc/templates/operating-manual.md`
  And `tests/test-writers-get-the-fast-test-rules.test.js` pins the test writer's new citation in both its agent file and its skill file

- [ ] **Scenario 11: The shipped operating manual keeps the sentence on changing a test**
  Given `.ctoc/templates/operating-manual.md` after the change
  When a maintainer reads its hard rule that begins "NEVER weaken a test"
  Then the rule ends with the sentence `Change a test only when it is plain wrong, and only to tighten it; never weaken an assertion, widen a range, or delete a case or whitelist without a written reason, to turn red green.`
  And a temporary user project whose manual block holds that rule as it was before this change receives the sentence when CTOC refreshes the block through `mergeOperatingManual`, the function `/ctoc:update` and project setup call, with every byte outside the block unchanged
  And the rule inventory pins the sentence in `.ctoc/templates/operating-manual.md`

## Risks

### Technical Risks
- Size: measured in technical planning (see "Measured before planning" under Implementation Details). `CLAUDE.md` is 14,730 bytes, so 270 bytes of room. The change adds 256 bytes: lesson 14 grows from 287 to 326 bytes, lesson 21 is 92 bytes and lesson 22 is 123 bytes, each new line plus its line break. That leaves `CLAUDE.md` at 14,986 bytes with 14 bytes of room.
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
- The general wording of lesson 22 leaves the literal sentence "CTOC is built with CTOC" out of the lessons block, which the vision's success criterion quotes.
  - Likelihood: HIGH, because it is the decision taken here
  - Impact: LOW
  - Mitigation: Record the ruling in lesson 21's full text (scenario 8). `CLAUDE.md` line 3 already says "CTOC dogfoods its own Iron Loop."
- Replacing lesson 14 removes "only to tighten it; never weaken an assertion, widen a range, or delete a case or whitelist without a written reason" from the lessons block.
  - Likelihood: HIGH, because it follows from the replacement
  - Impact: LOW
  - Mitigation: Keep the words in `docs/OPERATING_LESSONS.md` (scenario 4), and append the sentence to the shipped manual's "NEVER weaken a test" rule in this same change (scenario 11), so no CTOC project receives the new lessons without it.

### Dependency Risks
- The same bytes are wanted by "Every session is told that a hotfix word is checked, and how to run the check and commit" (`plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s4-every-session-is-told.md`), which adds a paragraph to the same block in the same two files. Read from its text, that paragraph alone is longer than 270 bytes (estimated, not measured). After this plan, 14 bytes of room remain.
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
4. **The friction lesson is general.** (Technical planning made it lesson 22 and tightened it to 123 bytes; see "Lesson 21 is already taken" and "The friction lesson's wording" under the technical-planning decisions.) The brief requires the lesson to work in any CTOC user's project, and "CTOC is built with CTOC" is true only in CTOC's own repository. The block therefore carries the general rule, and the ruling itself goes into the full text (scenario 8). Recommended wording, 159 bytes: `21. **Friction is a plan, never a workaround.** When the pipeline blocks or misleads you, tell the human and file a plan for it; never route around it by hand.` The implementation planner may tighten it, never past this meaning.
5. **"Tell the human" in lesson 21.** In a user's project, friction inside CTOC cannot be fixed there; telling the human lets him pass it on. The lesson asks no agent to send anything off the machine, because sends wait for an explicit request under the operating manual.
6. **Numbering.** Lesson 14 is replaced in place and lessons 21 and 22 are appended (technical planning). Nothing is renumbered, because `CLAUDE.md` cites lesson 19 by number and other files cite lesson 14.
7. **How the replaced wording is kept.** As on 2026-10-07 for lesson 2 (inventory rules r0099 and r0145): the rule that holds lesson 14 (r0111) gets the new lesson as its current text and keeps its old full text, which stays word for word in `docs/OPERATING_LESSONS.md`; a new entry pins the replaced short text in the same file; both go under a heading for the owner's instruction of 2026-10-18. Changing r0111 is how this test records a replaced rule. It does not weaken the test: every replaced word stays pinned.
8. **The inventory is the test written first.** New entries for lessons 21 and 22, the replaced text and the manual's sentence are added before any lesson changes, and the test is run and seen failing. The user-project check of scenario 2 goes into the existing `tests/claude-md-lessons.test.js`. With no new test file, the test-file count written in `CLAUDE.md` does not change.
9. **The operating manual is changed here.** The question on the replaced test rule was settled by its recommended option, "Add the sentence to the shipped manual in this plan", so the replaced lesson's sentence is appended to the manual's "NEVER weaken a test" rule (scenario 11). This reverses the earlier choice to list it for the owner, and the Out of Scope item that said so was removed.
10. **Four citations are re-pointed in this plan.** Replacing lesson 14 would leave the test writer's agent and skill citing "CTOC's lesson 'Fix the failures, not the tests'" (pinned at `tests/test-writers-get-the-fast-test-rules.test.js:63`) and the code-quality reviewer's agent (line 79) and skill (line 485) quoting the replaced text as "lesson 14". That is a defect this change would cause, so its fix is part of the change. Which current rule each citation names is the implementation planner's choice under scenario 10. Search: the pattern `Fix the failures, not the tests` over the worktree, excluding `plans/`, matched seven files: the three files that hold the lessons (`CLAUDE.md`, the lessons source, `docs/OPERATING_LESSONS.md`), the rule inventory, the test writer's agent and skill, and the pinning test. The pattern `Fix the failures, not the tests|[Ll]esson 14`, excluding `plans/` and the inventory, added the code-quality reviewer's agent and skill, the number-only references listed under Out of Scope, and notes under `.ctoc/audit/`.
11. **Lesson 20 is copied into the full-text list.** `docs/OPERATING_LESSONS.md` lists lessons 1 to 19 only; the pattern `Never wait in a sleep loop` over the worktree, excluding `plans/`, matched only `CLAUDE.md` and the lessons source. Adding lesson 21 after lesson 19 would leave a gap this plan itself wrote, so lesson 20 is copied word for word from the block, with no new wording. No file states a lesson count: the case-insensitive pattern `(20|twenty) (operating )?lessons|lessons? 1[-–]20|lessons 1 to 20` over the worktree, excluding `plans/` and `.ctoc/audit/`, matched nothing.
12. **The byte figures are hand counts.** The 270 bytes of room are relayed, and the 199 added bytes were counted by hand, not measured; the builder measures both (scenario 6). Technical planning measured them; see "Measured before planning".
13. **No questions file and no status file were written.** The brief allowed edits to this plan file only, so the brief governed over the agent file's instruction to write a questions file as a last act. No status file exists for this plan.
14. **No instruction in the stub, the vision or the decomposition asked for anything beyond this refinement.**

## Questions for the Owner

None block this plan. Every fork above has one clear best answer, recorded as a decision for review to check. The manual sentence was settled by its recommended option and is In Scope (scenario 11). Technical planning wrote one question, on carrying lesson 21 in this plan; see "Lesson 21 is already taken" under the technical-planning decisions.

## Decisions Taken Under Ambiguity

Decided by the recommended option when this plan moved on; none of these needed the human.

- Replacing the lesson 'Fix the failures, not the tests' with your rule 'Always investigate failing tests' removes the sentence 'Change a test only when it is plain wrong, and only to tighten it; never  — Add the sentence to the shipped manual in this plan (question q10-replaced-test-rule-sentence-in-shipped-manual)

## Implementation Details

Written in technical planning on 2026-10-20. One plan, not slices (see the technical-planning decisions). No source module changes: every change is instruction text, its pinned copy in a test, or a test.

### Measured before planning

- `CLAUDE.md` is **14,730 bytes**, so **270 bytes** of room under the 15,000-byte test. Method: ripgrep matched `\A(?s-u:.){N}` (any byte, N times, from the start of the file) over `CLAUDE.md`; N = 14,730 matches and N = 14,731 does not. The method was first checked on a control file of ten three-byte dashes, which matched at 30 bytes and not at 31. The relayed figure was right.
- Line sizes, measured the same way on each line written alone to a scratch file and matched with `\A(?s-u:.){N}\z`: the current lesson 14 is **287** bytes (also matched in place in `CLAUDE.md` as `^14\. \*\*Fix` plus 278 bytes to the end of the line); the new lesson 14 is **326**; lesson 21 is **92**; lesson 22 is **123**.
- Sum: +39 for lesson 14, +93 for lesson 21 and +124 for lesson 22 (each new line plus its line break) = **+256 bytes**. `CLAUDE.md` after the change: **14,986 bytes**, 14 bytes of room. The manual sentence costs `CLAUDE.md` nothing (see the trace).
- The builder measures again with `fs.statSync` at Step 9 and Step 14, because another plan may change `CLAUDE.md` in between.

### Where each text lives (read in this planning pass)

- `.ctoc/templates/operating-lessons.md` is the single source of the lessons block (`src/lib/claude-md-lessons.js` header, lines 4–6; `resolveLessonsSource`, lines 41–47).
- A user project receives the block through `ensureLessonsBlock` (`src/lib/claude-md-lessons.js:241`) on three live routes: session start (`src/hooks/SessionStart.js:151` calls `maybeInjectLessons`, lines 301–312; the hook is registered as `SessionStart` in `.claude-plugin/hooks.json`), `/ctoc:update` (`refreshLocalLessons`, `src/commands/update.js:42–55`, called at lines 388, 393 and 471) and project setup (`src/lib/init-project.js:750–758`).
- CTOC's own `CLAUDE.md` is skipped by all three (`shouldInjectLessons`, `src/hooks/SessionStart.js:280–286`; `isCtocOwnRepo`, `src/commands/update.js:44`), so its block is a copy made by hand, held identical to the source by `tests/claude-md-keeps-every-rule.test.js:103–111`.
- `.ctoc/templates/CLAUDE.md.template` holds only the empty markers (lines 71–73), which project setup fills from the source. It is **not edited**; test case 2b below proves through the real `initProject` that a new project gets the three new lessons.
- `.ctoc/templates/operating-manual.md` reaches a user project through `mergeOperatingManual` (`src/lib/operating-manual.js:132`), called by `/ctoc:update` (`refreshLocalManual`, `src/commands/update.js:87–103`, called at lines 389, 394 and 472) and by project setup (`src/lib/init-project.js:779–788`). Both skip CTOC's own repository (`src/commands/update.js:94`), so CTOC's `CLAUDE.md` carries no manual block and the sentence costs it no bytes.
- `docs/OPERATING_LESSONS.md` is reached from `CLAUDE.md`'s "Read before you touch" table and from the block's methodology line.
- The four instruction files are loaded when the CTO Chief dispatches the unit test writer or the code-quality reviewer.

### Dependency graph

```
.ctoc/templates/operating-lessons.md  --copied by hand into-->  CLAUDE.md (lessons block only)
tests/claude-md-keeps-every-rule.test.js --reads--> tests/fixtures/claude-md-rule-inventory.json
    --checks--> CLAUDE.md, operating-lessons.md, docs/OPERATING_LESSONS.md, operating-manual.md
tests/claude-md-lessons.test.js --drives--> ensureLessonsBlock, initProject --read--> operating-lessons.md
    --reads--> CLAUDE.md, docs/OPERATING_LESSONS.md, operating-manual.md, the four instruction files
tests/operating-manual.test.js --drives--> mergeOperatingManual --reads--> operating-manual.md
tests/test-writers-get-the-fast-test-rules.test.js --pins--> unit-test-writer agent and skill
```

No code module changes, so no import changes and no cycles.

### The exact texts

Every builder edit uses these texts byte for byte. The em dashes in the new lesson 14 are U+2014, as in the owner's words and in lesson 20.

- **New lesson 14** (326 bytes):
  `14. **Always investigate failing tests.** Every failing test — including one that passes on rerun — is reproduced and root-caused in the product code before anything is reported or merged; "flaky" is a finding, never an explanation. Fix the code; change the test only when it is proven wrong, with the reason written down.`
- **Lesson 21** (92 bytes):
  `21. **Start the next plan while the tests run**, in its own git worktree, on disjoint files.`
- **Lesson 22** (123 bytes):
  `22. **Friction is a plan.** When the pipeline blocks or misleads you, tell the human and file a plan; never work around it.`
- **Replaced short lesson 14** (287 bytes, today in the block):
  `14. **Fix the failures, not the tests.** A failing test means the code is wrong until proven otherwise. Change a test only when it is plain wrong, and only to tighten it; never weaken an assertion, widen a range, or delete a case or whitelist without a written reason, to turn red green.`
- **The manual's added sentence**:
  `Change a test only when it is plain wrong, and only to tighten it; never weaken an assertion, widen a range, or delete a case or whitelist without a written reason, to turn red green.`

### File specifications

Each "old" text below is quoted from the file as read in this planning pass. At Step 9 the builder re-reads each file and confirms each old text is still there, once, before replacing it; a text that moved or changed stops the build for a re-plan.

#### File: `.ctoc/templates/operating-lessons.md`
**Action:** MODIFY. **Purpose:** the single source of the lessons block every CTOC project receives.
- Line 21: replace the replaced short lesson 14 with the new lesson 14.
- After line 27 (lesson 20, `20. **Never wait in a sleep loop.** …`), insert lesson 21 and then lesson 22, one line each, before the blank line that precedes `**Methodology:**`.
- Nothing else changes, including the markers and the methodology line.

#### File: `CLAUDE.md`
**Action:** MODIFY. **Purpose:** this repository's hand-made copy of the block.
- The same two edits in its block: line 223 (lesson 14), and the two new lines after line 229 (lesson 20).
- Nothing outside the block changes (scenario 6). After the edit the span from `<!-- CTOC:LESSONS v1 START -->` to `<!-- CTOC:LESSONS v1 END -->` is identical to the source's.
- **Stop rule (scenario 7):** if the size at Step 9 leaves fewer than 256 bytes of room, change nothing, and report the measured size and the bytes still needed to the owner. No other rule is shortened, moved or removed.

#### File: `docs/OPERATING_LESSONS.md`
**Action:** MODIFY. **Purpose:** the full text, origin and mechanism of each lesson.
1. Replace lines 46–52 (lesson 14's full text, starting `14. **Fix the failures, not the tests.** When a test fails`) with the new full text below. It is wrapped and indented like the neighbouring entries; wrapping is free, words are not.
   ```
   14. **Always investigate failing tests.** Every failing test — including one that
       passes on rerun — is reproduced and root-caused in the product code before
       anything is reported or merged; "flaky" is a finding, never an explanation.
       Fix the code; change the test only when it is proven wrong, with the reason
       written down. The owner set this rule on 2026-10-18, after a session changed a
       failing test instead of investigating it. It replaced the earlier lesson 14,
       "Fix the failures, not the tests", whose words are kept under "Replaced on the
       owner's instruction of 2026-10-18" below; that lesson's sentence on how a test
       may change now stands in the hard rule "NEVER weaken a test" of the operating
       manual every CTOC project receives (`.ctoc/templates/operating-manual.md`).
   ```
2. After line 97 (the last line of lesson 19, which names `iron-loop-enforcer.js`) and before the blank line that precedes `**Methodology reference:**`, insert lessons 20, 21 and 22, with no blank lines between entries. Lesson 20 is the block's lesson 20 word for word.
   ```
   20. **Never wait in a sleep loop.** To wait for a long build or test, run it in the
       foreground with a timeout long enough for it, up to 10 minutes; if it can take
       longer and you were dispatched in the background, start it with
       run_in_background and end your turn — you are woken when it finishes; never
       wait in a loop that sleeps and checks a file, log or marker.
   21. **Start the next plan while the tests run.** The moment a plan's quality check
       (Step 14, VERIFY) or its completion route starts, claim the next ready plan
       whose files are disjoint from it and start that plan's builder in a separate
       git worktree; the tree under test stays untouched, and no checkout ever sits
       with only a test running. The owner set this rule on 2026-10-17: "when running
       tests to figure out if the plan is implemented correctly, already start in a
       worktree on the next plan". The menu's instructions (`src/commands/start.md`,
       the Start agent recipe) cite it as Operating Lesson 21.
   22. **Friction is a plan.** When the pipeline blocks or misleads you, tell the
       human and file a plan; never work around it. The owner ruled on 2026-10-20
       that CTOC is built with CTOC: all development of the CTOC plugin goes through
       CTOC itself, and every friction found while doing so is filed back into CTOC
       as a lesson and a plan, not worked around. That day, building CTOC through its
       own menu met ten frictions, and each pushed the coordinator off the menu into
       a workaround by hand (direct calls into the plan actions, a scratch script to
       compute answer digests, review rounds relayed by hand), which left the
       friction in place for every user. The short lesson is the general form that
       every CTOC project receives: "CTOC is built with CTOC" is true only in CTOC's
       own repository, and in a user's project a friction inside CTOC cannot be fixed
       there, so the session tells the human, who can pass it on. The lesson asks no
       agent to send anything off the machine; sends wait for an explicit request.
   ```
3. At the end of the file, after the section "Replaced on the owner's instructions of 2026-10-15", append:
   ```
   ## Replaced on the owner's instruction of 2026-10-18

   The owner ruled on 2026-10-18 that every failing test, including one that passes on
   rerun, is reproduced and root-caused in the product code before anything is reported
   or merged, and that this rule replaces lesson 14. The lesson's earlier words are kept
   here word for word, each with the file it came from. Its sentence on how a test may
   change now stands in the hard rule "NEVER weaken a test" of
   `.ctoc/templates/operating-manual.md`.

   From this file's lesson 14:

   14. **Fix the failures, not the tests.** When a test fails, the default is that the code is wrong — fix the code first. Changing the test is the last resort, allowed only when the test itself is plain wrong (it asserts a bug, a cosmetic non-behavior, or a contract the human has explicitly replaced) — and then the change must tighten the test toward the real behavior, never loosen it to make red go green. Weakening an assertion, widening a range, deleting a case, or whitelisting without a justified reason is green-washing, not fixing.

   From `CLAUDE.md` and `.ctoc/templates/operating-lessons.md`, lesson 14:

   14. **Fix the failures, not the tests.** A failing test means the code is wrong until proven otherwise. Change a test only when it is plain wrong, and only to tighten it; never weaken an assertion, widen a range, or delete a case or whitelist without a written reason, to turn red green.
   ```
None of these texts names a person; "the owner" is how this file already refers to him.

#### File: `.ctoc/templates/operating-manual.md`
**Action:** MODIFY. **Purpose:** the craft manual every CTOC project receives.
- Line 16, old: `- NEVER weaken a test, delete an assertion, mock away a failure, or special-case an input to make a check pass. Fix the cause or report the failure.`
- New: the same line, then one space and the manual's added sentence:
  `- NEVER weaken a test, delete an assertion, mock away a failure, or special-case an input to make a check pass. Fix the cause or report the failure. Change a test only when it is plain wrong, and only to tighten it; never weaken an assertion, widen a range, or delete a case or whitelist without a written reason, to turn red green.`
- The line keeps its own line break; the next line, `- Irreversible actions …`, stays on its own line. Nothing else is added: no provenance note, and in particular no word containing the capital letters `CTO`, which `tests/operating-manual.test.js` (a) forbids anywhere in this file.

#### File: `tests/fixtures/claude-md-rule-inventory.json`
**Action:** MODIFY. **Purpose:** pins every binding rule word for word in its home.
- `r0111`: set `"new"` to the new lesson 14 (JSON-escaped: `\"flaky\"`), keep `"old"`, `"home"` and `"old_home"`, and add `"note": "2026-10-20: the owner's rule of 2026-10-18 replaced lesson 14; the old full text above stays word for word in docs/OPERATING_LESSONS.md, and the replaced short text is r0148"`.
- Append after `r0147`, each with `"line": null` and an `"added"` field that starts `2026-10-20, plan ctoc-is-built-with-ctoc-the-operating-lessons-say-ctoc-is-built-with-ctoc-and-fricti:`:
  - `r0148`: `"old"` the replaced short lesson 14, `"home": "docs/OPERATING_LESSONS.md"`; added: `… the words lesson 14 carried in the lessons block until the owner's rule of 2026-10-18 replaced it`.
  - `r0149`: `"old"` lesson 21, `"home": ".ctoc/templates/operating-lessons.md"`; added: `… lesson 21, the owner's rule of 2026-10-17, which the menu's instructions cite as Operating Lesson 21`.
  - `r0150`: `"old"` lesson 22, `"home": ".ctoc/templates/operating-lessons.md"`; added: `… lesson 22, the general form of the owner's ruling of 2026-10-20 that CTOC is built with CTOC`.
  - `r0151`: `"old"` the manual's added sentence, `"home": ".ctoc/templates/operating-manual.md"`; added: `… the replaced lesson 14's sentence on changing a test, kept in the shipped manual's hard rule \"NEVER weaken a test\"`.
- `r0128` still holds as a substring of the longer manual line. The `FLOOR` of 144 in `tests/claude-md-keeps-every-rule.test.js` is not changed; the inventory grows from 147 to 151 rules.

#### File: `agents/testing/writers/unit-test-writer.md` and `skills/testing/writers/unit-test-writer/SKILL.md`
**Action:** MODIFY (the same two edits in each; the Fast tests block is byte-identical in both files).
- In the paragraph under `### Fast tests` (agent line 80; in the skill, the same paragraph above line 153): `and rule 8 is a CTOC lesson.` becomes `and rule 8 comes from a hard rule of CTOC's operating manual.`
- At the end of rule 8 (agent line 89, skill line 160): `Source: CTOC's lesson "Fix the failures, not the tests".` becomes `Source: the hard rule "NEVER weaken a test" in CTOC's operating manual.`
- Why the manual: rule 8 ("a changed test keeps or tightens what it proves … Never drop, widen or skip an assertion") is the manual's added sentence in other words, and the manual is the rule that carries it after this change.

#### File: `tests/test-writers-get-the-fast-test-rules.test.js`
**Action:** MODIFY. In `FAST_TEST_RULES`, line 54: `and rule 8 is a CTOC lesson.` becomes `and rule 8 comes from a hard rule of CTOC's operating manual.`; line 63: `Source: CTOC's lesson \"Fix the failures, not the tests\".` becomes `Source: the hard rule \"NEVER weaken a test\" in CTOC's operating manual.` No other line changes.

#### File: `agents/ai-quality/ai-code-quality-reviewer.md`
**Action:** MODIFY, line 79 only.
- ``Three kinds of finding are critical because this project's operating lessons in `CLAUDE.md` name them:`` becomes `Three kinds of finding are critical because CTOC's operating lessons and its operating manual name them:`
- `and a test changed to pass (lesson 14: "Weakening an assertion, widening a range, deleting a case, or whitelisting without a justified reason is green-washing, not fixing.").` becomes `and a test changed to pass (the operating manual's hard rule: "NEVER weaken a test, delete an assertion, mock away a failure, or special-case an input to make a check pass.").`
- The severity stays critical; the lesson 9 and lesson 7 quotations in the same sentence are not touched (see Neighbours).

#### File: `skills/ai-quality/ai-code-quality-reviewer/SKILL.md`
**Action:** MODIFY, line 485 only. ``(operating lesson 14 in `CLAUDE.md`: "Weakening an assertion, widening a range, deleting a case, or whitelisting without a justified reason is green-washing, not fixing.")`` becomes `(CTOC's operating manual, hard rule: "NEVER weaken a test, delete an assertion, mock away a failure, or special-case an input to make a check pass.")`. The finding there is production code that special-cases a test's input or ends the run early, which the manual's words name exactly.

### Test plan

Framework: `node:test` and `node:assert`, as in the files being extended. No new test file, so no documented count moves. Every new case is written at Step 8, run, and seen failing on today's files before any instruction text changes. Temporary projects live under `os.tmpdir()`; the real repository files are only read.

#### `tests/fixtures/claude-md-rule-inventory.json`, run through `tests/claude-md-keeps-every-rule.test.js`
- After the inventory edit and before any lesson edit, "every rule is present, word for word, in its home" fails, naming r0111 (new lesson 14 absent from the source), r0148 (absent from the docs), r0149 and r0150 (absent from the source) and r0151 (absent from the manual). That run's output goes into the build record.
- After Step 10 all seven tests pass: no rule missing, the old full text of r0111 still in the docs, the block in `CLAUDE.md` equal to the source, `CLAUDE.md` at or under 15,000 bytes.

#### `tests/claude-md-lessons.test.js`: a new `describe('operating lessons 14, 21 and 22, and the citations of the rule on changing a test')` at the end of the file
Shared at the top of the block: the five exact texts above as constants `NEW_14`, `NEW_21`, `NEW_22`, `OLD_14`, `CHANGE_A_TEST`, plus `OLD_14_FULL` (r0111's `old`), `MANUAL_RULE = 'NEVER weaken a test, delete an assertion, mock away a failure, or special-case an input to make a check pass.'`, `WRITER_CITATION = 'Source: the hard rule "NEVER weaken a test" in CTOC\'s operating manual.'` and `REPLACED_TITLE = 'Fix the failures, not the tests'`. Helpers:
```js
const squash = (s) => s.replace(/\s+/g, ' ').trim();
const readRepo = (...rel) => fs.readFileSync(path.join(REPO_ROOT, ...rel), 'utf8').replace(/\r\n/g, '\n');
const blockOf = (text) => {
  const lines = lessons.normalizeEol(text).normalized.split('\n');
  const blk = lessons.findManagedBlock(lines);
  assert.ok(blk && !blk.malformed, 'a well-formed lessons block');
  return lines.slice(blk.startIdx, blk.endIdx + 1).join('\n');
};
const lessonLine = (block, n) => block.split('\n').find((l) => l.startsWith(`${n}. **`));
const numbers = (text) => [...text.matchAll(/^(\d+)\. \*\*/gm)].map((m) => Number(m[1]));
const oneTo = (n) => Array.from({ length: n }, (_, i) => i + 1);
const fullTexts = () => {
  const doc = readRepo('docs', 'OPERATING_LESSONS.md');
  const end = doc.indexOf('**Methodology reference:**');
  assert.ok(end !== -1, 'docs/OPERATING_LESSONS.md keeps its methodology paragraph');
  return doc.slice(0, end);
};
const entry = (list, n) => {
  const start = list.indexOf(`\n${n}. **`);
  assert.ok(start !== -1, `the full text of lesson ${n} is present`);
  const next = list.indexOf(`\n${n + 1}. **`, start + 1);
  return squash(list.slice(start, next === -1 ? list.length : next));
};
```
Cases (scenario in brackets):
1. **Lesson 14 is the rule on failing tests** [1]. For `.ctoc/templates/operating-lessons.md` and `CLAUDE.md`: `lessonLine(blockOf(text), 14)` equals `NEW_14`, and the file does not contain `REPLACED_TITLE`. Fails today: lesson 14 is the replaced text.
2. **A user project's refreshed block carries lessons 14, 21 and 22, and nothing outside the block moves** [2]. (a) A temporary `CLAUDE.md` = `'# My app\n\nMy own notes.\n\n'` + `[START_MARKER, MANAGED_NOTICE, '', '## CTOC Operating Lessons', '', OLD_14, END_MARKER].join('\n')` + `'\n\nMore of my notes.\n'`. `ensureLessonsBlock(target, REPO_ROOT)` returns `true`; the result contains `NEW_14`, `NEW_21` and `NEW_22` and not `REPLACED_TITLE`; the bytes before `START_MARKER` equal the first part exactly, and the bytes after `END_MARKER` equal the last part exactly. (b) The real `initProject(dir)` on an empty temporary folder writes a `CLAUDE.md` containing `NEW_14`, `NEW_21` and `NEW_22`, which proves the template's empty markers need no edit. Both fail today: lessons 21 and 22 are absent.
3. **Lessons 14, 21 and 22 carry no name, date, backticked path or "CTOC repository"** [3]. For each of the three in `canonicalBlock()`: the line equals its constant (exact equality to a text that holds no name is the name check), does not match `/\d{4}-\d{2}-\d{2}/`, contains no backtick and does not contain `CTOC repository`. Fails today: lessons 21 and 22 are absent.
4. **The lessons run 1 to 22 in order** [5]. `numbers(blockOf(text))` deep-equals `oneTo(22)` for the source and for `CLAUDE.md`. Fails today with 1 to 20.
5. **The full texts run 1 to 22, and their lesson 20 is the block's** [9]. `numbers(fullTexts())` deep-equals `oneTo(22)`, and `entry(fullTexts(), 20)` equals `squash(lessonLine(canonicalBlock(), 20))`. Fails today with 1 to 19.
6. **The full texts of lessons 14 and 22 open with the lesson, and lesson 22's records the ruling** [8]. `entry(list, 14)` starts with `squash(NEW_14)`; `entry(list, 22)` starts with `squash(NEW_22)` and contains `2026-10-20`, `CTOC is built with CTOC` and `every CTOC project receives`. Fails today.
7. **Lesson 14's replaced words are kept under the heading for 2026-10-18** [4]. The text from `## Replaced on the owner's instruction of 2026-10-18` to the next `\n## ` (or the end of the file), squashed, contains `squash(OLD_14)` and `squash(OLD_14_FULL)`. Fails today: no such heading.
8. **Every citation of the rule on changing a test names a rule the shipped files carry** [10]. The manual contains `MANUAL_RULE`. The unit-test-writer agent and skill each contain `WRITER_CITATION` and not `REPLACED_TITLE`. The code-quality reviewer's agent and skill each contain `"` + `MANUAL_RULE` + `"` and not `green-washing`. Fails today: each file still quotes the replaced lesson (one occurrence each, counted in this planning pass).

#### `tests/operating-manual.test.js`: new test `(g)` after the `(f)` test
```js
const CHANGE_A_TEST = 'Change a test only when it is plain wrong, and only to tighten it; never weaken an assertion, widen a range, or delete a case or whitelist without a written reason, to turn red green.';
const OLD_RULE = '- NEVER weaken a test, delete an assertion, mock away a failure, or special-case an input to make a check pass. Fix the cause or report the failure.';

test('(g) a refreshed manual block carries the sentence on changing a test; outside bytes unchanged', () => {
  const template = fs.readFileSync(SHIPPED_TEMPLATE, 'utf8').replace(/\r\n/g, '\n');
  assert.ok(template.includes(OLD_RULE + ' ' + CHANGE_A_TEST + '\n'), 'the hard rule ends with the sentence');
  const dir = mkTmp();
  try {
    const before = '# My app\n\nnotes\n\n';
    const after = '\n\nmore notes\n';
    fs.writeFileSync(claudeMd(dir), before + BEGIN_MARKER + '\n' + OLD_RULE + '\n' + END_MARKER + after, 'utf8');
    const res = mergeOperatingManual(dir, { ctocRoot: CTOC_ROOT });
    assert.equal(res.action, 'updated');
    const content = fs.readFileSync(claudeMd(dir), 'utf8');
    assert.ok(content.includes(CHANGE_A_TEST), 'the project receives the sentence');
    assert.equal(occurrences(content, BEGIN_MARKER), 1, 'still exactly one block');
    assert.equal(content.slice(0, content.indexOf(BEGIN_MARKER)), before, 'bytes before the block unchanged');
    assert.equal(content.slice(content.indexOf(END_MARKER) + END_MARKER.length), after, 'bytes after the block unchanged');
  } finally { rmTmp(dir); }
});
```
[11] Fails today at its first assertion. `mergeOperatingManual` is the function `/ctoc:update` and project setup call, so this drives the real refresh route.

#### `tests/test-writers-get-the-fast-test-rules.test.js`
After its two-line edit, "carries the fast-test rules byte for byte" fails for both writer files until Step 10 [10].

#### Existing tests that must stay green, and why
- `tests/agents-never-wait-in-a-sleep-loop.test.js` pins lesson 20's sentence in the source and in `CLAUDE.md`; lesson 20 does not change.
- `tests/update-command-coverage.test.js:158–164` counts block lines matching `^\d+\. \*\*` and requires at least 20; there will be 22.
- `tests/operating-manual.test.js` (a) forbids `Doc Tony`, `CC`, `1996`, `PhD`, `professor` and `CTO` in the manual; the added sentence holds none of them.
- `tests/claude-md-lessons.test.js` cases AC1 to AC12 read the source's block by its markers and by "The measure is the human"; neither changes.
- `tests/critic-warnings-are-critical.test.js` checks markers in the reviewer's skill that this plan does not touch.
- `tests/agent-and-skill-improvement-record.test.js` digests only `ctoc:claims` blocks; none of the four instruction files has one (searched in this planning pass: 0 matches).

#### Coverage
No source module changes, so coverage on `src/` is unchanged. Every new assertion compares against an exact expected text, so a case cannot pass silently.

### Security review

- [x] **Path traversal:** no user-provided path. The tests build every path with `path.join` from `__dirname` or `os.tmpdir()`.
- [x] **Safe file operations:** the tests write only inside `fs.mkdtempSync(os.tmpdir())` folders, removed in `t.after` or `finally`; the real repository files are only read. The injectors under test keep their existing atomic, fail-open writes.
- [x] **No secrets, no personal data:** no key, token or e-mail anywhere. No person's name in any lesson line (the block lines are compared word for word) or in the full texts ("the owner", as the file already writes). The owner's quoted words carry no personal information.
- [x] **Instruction text is an attack surface.** Every session in every CTOC project reads the block and the manual. The new texts grant nothing:
  - Lesson 22 says "tell the human and file a plan". It does not tell an agent to send anything off the machine, and the full text says so. Filing a plan goes through the menu, under its existing gates.
  - Lesson 21 tells the session to start the next disjoint plan in its own worktree. That is already the menu's instruction (`src/commands/start.md` line 70) and grants no new permission. The worktree, the claim and the scheduler's file checks stay as they are.
  - The manual sentence only narrows when a test may change.
  - The Step 13 scanner reads each new sentence as a hostile plan author would.
- [x] **Error messages:** no new runtime messages.
- [x] **Command injection, prototype pollution:** no command is run and no object is merged.
- [x] **Hook and gate logic:** untouched, so the owner's approval for hook changes is not needed.

### Implementation order

1. MODIFY `tests/fixtures/claude-md-rule-inventory.json`. Run `tests/claude-md-keeps-every-rule.test.js` and see it red.
2. MODIFY `tests/claude-md-lessons.test.js` (cases 1–8). Run it and see it red.
3. MODIFY `tests/operating-manual.test.js` (case g). Run it and see it red.
4. MODIFY `tests/test-writers-get-the-fast-test-rules.test.js`. Run it and see it red.
5. MODIFY `.ctoc/templates/operating-lessons.md`.
6. MODIFY `CLAUDE.md`, after the source (depends on 5; the equality test needs both).
7. MODIFY `docs/OPERATING_LESSONS.md`.
8. MODIFY `.ctoc/templates/operating-manual.md`.
9. MODIFY both unit-test-writer files (depends on 8, which carries the rule they now cite).
10. MODIFY both code-quality reviewer files (depends on 8).

### Acceptance criteria mapping

| Scenario | Implemented in | Test |
|---|---|---|
| 1. Lesson 14 is the owner's rule | operating-lessons.md, CLAUDE.md | lessons case 1; inventory r0111 |
| 2. A user project receives the new lessons | operating-lessons.md (template untouched) | lessons case 2a (`ensureLessonsBlock`), 2b (`initProject`) |
| 3. No name, date, path or "CTOC repository" | operating-lessons.md | lessons case 3 |
| 4. Replaced wording survives | docs/OPERATING_LESSONS.md, inventory | lessons case 7; inventory r0111 old, r0148 |
| 5. Lessons 21 and 22, numbers 1 to 22 | operating-lessons.md, CLAUDE.md | lessons cases 3, 4; inventory r0149, r0150, r0098–r0116; sleep-loop test |
| 6. CLAUDE.md within 15,000 bytes | CLAUDE.md | keeps-every-rule size and equality tests; Step 14 diff check |
| 7. Room never made by cutting | CLAUDE.md stop rule | keeps-every-rule size test names the size; Step 9 stop rule |
| 8. Full text records the ruling | docs/OPERATING_LESSONS.md | lessons case 6 |
| 9. Full-text list has no gap | docs/OPERATING_LESSONS.md | lessons case 5 |
| 10. No instruction quotes the replaced lesson | the four instruction files | lessons case 8; test-writers test |
| 11. Manual keeps the sentence | operating-manual.md | manual case g; inventory r0151 |

No scenario is without an action and a test.

### Risk mitigations

| Risk | Mitigation | Where |
|---|---|---|
| `CLAUDE.md` changed by another plan before this one builds | Re-measure at Step 9 and stop on less than 256 bytes of room | Step 9, `CLAUDE.md` stop rule |
| Inventory edited so a replaced text loses its pin | Inventory first, run red; r0111 keeps `old`, r0148 pins the short text, case 7 checks the heading | Step 8 |
| Block in `CLAUDE.md` drifts from the source | Equality test; the builder copies the two lines from the source file, never retypes them | Step 10 |
| The unit-test-writer files changed by "The unit test writer, agent and skill, improved three times from fresh web research" (`plans/todo/00363-every-agent-and-specialist-skill-improved-three-times-s103-unit-test-writer.md`) | Step 9 re-reads both files and confirms both old sentences; plans build one at a time | Step 9 |
| `tests/test-writers-get-the-fast-test-rules.test.js` also declared by "Agent text never reaches the shell unquoted" (`plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s19-agent-text-never-reaches-the-shell-unquoted.md`) | Step 9 re-reads lines 54 and 63 before editing | Step 9 |
| Lesson 22's number collides with another plan's lesson | Searched before this plan was written: the pattern `[Ll]esson 22\|[Ll]essons 2[12]` over the whole repository, plans included, matched 0 files; "Lesson 21" appears only for the rule "Start the next plan while the tests run" (`src/commands/start.md` and three slices of the four-defects plan) | Decisions below |

### Wiring — the live call sites

No new module and no new export. Each changed text reaches its reader through a route that is already live (read in this planning pass; see "Where each text lives"):
- The lessons block in user projects: the registered `SessionStart` hook, `/ctoc:update` and project setup, all through `ensureLessonsBlock`. Test cases 2a and 2b drive two of these routes.
- This repository's block: every session here reads `CLAUDE.md`.
- The manual: `/ctoc:update` and project setup, through `mergeOperatingManual`. Case g drives it.
- The full texts: the pointer in `CLAUDE.md`'s "Read before you touch" table.
- The four instruction files: loaded when the CTO Chief dispatches those two agents.

### Neighbours (seen, not built here; scheduling is the owner's)

- "The session's instructions and the README say one build at a time" (`plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s14-the-texts-say-one-build-at-a-time.md`). Its question on lesson 21 has the answer "add Lesson 21 to both lesson lists in this slice, or depend on the plan that does" recorded, its recommended option (`.ctoc/streaming/answers.jsonl` line 84). This plan adds it, so that slice can name this plan in its `depends_on`; this plan does not edit it.
- The code-quality reviewer's lesson 9 quotation (agent line 79, "Deprecations, compiler/linter warnings, and vulnerabilities of any severity are critical") is the old full text, not the block's current lesson 9 ("… are fixed now"). It is left as it is.
- "Every session is told that a hotfix word is checked, and how to run the check and commit" needs more room in `CLAUDE.md` than the 14 bytes this plan leaves. By that plan's own text it already needed more than 270 bytes on its own.

## Decisions Taken Under Ambiguity — technical planning

1. **Lesson 21 is already taken, so the friction rule is lesson 22.** "Start the next plan while the tests run" is cited as Operating Lesson 21 in three places:
   - `src/commands/start.md` line 70, read in this pass;
   - the send-back notes that record the owner's revision of 2026-10-17 on three slices of the four-defects plan ("… runs alongside (lesson 21)");
   - the answer recorded on slice 14's question, "Add Lesson 21 to both lesson lists in this slice, or depend on the plan that does" (`.ctoc/streaming/answers.jsonl` line 84). That answer is the question's recommended option, recorded on 2026-10-18 within two seconds of that plan's other answers; the record does not say who chose it.

   Neither the block nor the full texts hold that rule. Giving the number to the friction rule would send each of those citations to the wrong rule. This corrects the approved scenarios 2, 3, 5, 8 and 9 and Story 2: the list now runs 1 to 22. This plan also adds lesson 21 itself (Story 4), because both lessons edit the same block lines and spend the same bytes. Adding them in one change leaves no gap in the numbering and needs one measurement. The alternative, a gap at 21 until slice 14 builds, or waiting on that slice's chain, is worse on both counts. This is the one item in the questions file, with this choice recommended. Its topic is `detail`, because a plan's scope is not one of the high-stakes topics the question store accepts (`QUESTION_TOPICS` in `src/lib/streaming-precompute.js:215–216`); the gate critic decides whether it reaches the owner.
2. **Lesson 21's wording** (92 bytes) keeps the rule's three working parts: while the tests run, in its own git worktree, on files disjoint from the plan under test. The title is the menu's own name for it. Its full text, with the owner's words of 2026-10-17 and no name, goes into `docs/OPERATING_LESSONS.md`. The text in the owner's global guidance would take about 300 bytes (estimated, not measured) and does not fit next to the other two changes.
3. **The friction lesson's wording** (123 bytes) changes the refinement's recommendation (159 bytes) in three ways:
   - "route around it by hand" became "work around it", the owner's own verb ("not worked around"), which also covers working around it by hand;
   - "for it" was dropped;
   - the title became "Friction is a plan."

   The meaning is unchanged: blocks or misleads, tell the human, file a plan, never work around it. Measured, all three changes fit with 14 bytes to spare. With the refinement's 159-byte wording the change would be 292 bytes, over the 270.
4. **Only the named sentence goes into the manual.** The settled question named one sentence, "Change a test only when it is plain wrong, …". The replaced lesson's other sentence, "A failing test means the code is wrong until proven otherwise.", is not added. The new lesson 14 carries its meaning ("root-caused in the product code", "Fix the code"), and its words stay in `docs/OPERATING_LESSONS.md`.
5. **Which rule each citation names.**
   - The test writer's rule 8 now cites the manual's hard rule "NEVER weaken a test". After this change that rule carries the sentence rule 8 restates.
   - Both code-quality reviewer citations quote the manual's hard rule. Their finding, a test changed to pass (in the skill: production code that special-cases a test's input), is named word for word by "special-case an input to make a check pass".
   - The reviewer agent's framing was reworded to name the manual. In CTOC's own repository `CLAUDE.md` carries no manual block, so "in `CLAUDE.md`" would not be true everywhere.
6. **One plan, not slices,** against the agent file's one-to-three-file budget. The technical grounds:
   - The equality test (`tests/claude-md-keeps-every-rule.test.js:103–111`) fails on any slice that edits the source without `CLAUDE.md`.
   - The inventory's r0111 must change in the same commit as lesson 14.
   - The test writer's pinned citation and the reviewer's quotations would point at a replaced lesson in any build between slices: the defect the refinement put inside this change.
   - The settled manual question asks that no project receive the new lessons without the sentence.

   In addition, the brief for this planning allows writes to this plan file only.
7. **No new test file.** All new cases go into existing test files, so no documented count moves. `CLAUDE.md` is declared as real work, not as the count ratchet.
8. **The full texts are checked by structure and key words, not pinned word for word.** The binding rules are the block lines, which the inventory pins. The full texts explain origin and mechanism; cases 5 to 7 check their numbering, their lesson 20, their opening words and the 2026-10-18 section.
9. **How the bytes were measured.** No shell was available in this planning pass, so ripgrep's byte matching was used, checked first on a control file. The builder measures with `fs.statSync`, as the size test does.
10. **The Out of Scope item on the manual was removed,** because the settled question moved it into scope; the In Scope list and Decision 9 above say so.

## Execution Plan

### Step 8: TEST
- [ ] Edit `tests/fixtures/claude-md-rule-inventory.json` (r0111 `new` and `note`; r0148 to r0151). Run `node --test tests/claude-md-keeps-every-rule.test.js` and record the failures naming r0111, r0148, r0149, r0150 and r0151.
- [ ] Add cases 1–8 to `tests/claude-md-lessons.test.js`. Run `node --test tests/claude-md-lessons.test.js` and record that each new case fails for the reason stated in the test plan and that AC1 to AC12 still pass.
- [ ] Add case (g) to `tests/operating-manual.test.js`. Run it and record its failure at the first assertion.
- [ ] Edit lines 54 and 63 of `tests/test-writers-get-the-fast-test-rules.test.js`. Run it and record that both "byte for byte" tests fail.

### Step 9: PREPARE
- [ ] Read the size of `CLAUDE.md` with `fs.statSync` and record it. Room = 15,000 minus that size. If the room is below 256 bytes, stop here and report the size and the bytes still needed to the owner (scenario 7), changing no rule.
- [ ] Re-read each of the twelve declared files and confirm every old text quoted under File specifications is still present exactly once. A moved or changed text stops the build for a re-plan.

### Step 10: IMPLEMENT
- [ ] `.ctoc/templates/operating-lessons.md`: lesson 14 replaced; lessons 21 and 22 inserted after lesson 20.
- [ ] `CLAUDE.md`: the same three lines copied from the source; nothing outside the block touched.
- [ ] `docs/OPERATING_LESSONS.md`: lesson 14's full text replaced; lessons 20, 21 and 22 inserted after lesson 19; the 2026-10-18 section appended at the end.
- [ ] `.ctoc/templates/operating-manual.md`: the sentence appended to the hard rule on line 16.
- [ ] `agents/testing/writers/unit-test-writer.md` and `skills/testing/writers/unit-test-writer/SKILL.md`: the two sentences in each.
- [ ] `agents/ai-quality/ai-code-quality-reviewer.md` line 79 and `skills/ai-quality/ai-code-quality-reviewer/SKILL.md` line 485.

### Step 11: REVIEW
- [ ] The critic reads lessons 14, 21 and 22 as a session in a user's project would. For each it checks that the lesson can be followed there without CTOC's repository and that it names no person and no date. It checks that lesson 21 says what `src/commands/start.md` line 70 says, and that each re-pointed citation quotes words present in the current block or manual.

### Step 12: OPTIMIZE
- [ ] No sentence is said twice across the block, the manual and the full texts beyond what each file's role needs. The measured room left in `CLAUDE.md` is recorded.

### Step 13: SECURE
- [ ] The security scanner reads the three new lessons, the manual sentence and the full texts as instructions a hostile plan could lean on. It confirms that none lets an agent send data off the machine, cross a gate, start a build without the existing claim and file checks, or weaken a test.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, type check, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.
- [ ] Record the final size of `CLAUDE.md` (expected 14,986 bytes if no other plan changed it). Run `git diff -U0 -- CLAUDE.md` and confirm that every changed line lies between the two lessons markers (scenario 6).

### Step 15: DOCUMENT
- [ ] The changed texts are the documentation. The build record lists each replaced sentence with its file, and the measured sizes before and after.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box is checked against its evidence.

## Decisions Taken Under Ambiguity

Decided by the recommended option when this plan moved on; none of these needed the human.

- Your rule 'Start the next plan while the tests run' is already cited as lesson 21: by the menu's instructions, and in the answer recorded on the plan 'The session's instructions and the README say one — Add it in this plan as lesson 21, with the friction rule as lesson 22 (question q01-start-the-next-plan-lesson-carried-here)
