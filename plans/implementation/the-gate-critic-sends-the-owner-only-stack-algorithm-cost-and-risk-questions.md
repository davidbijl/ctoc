---
title: "The gate critic sends the owner only stack, algorithm, cost and risk questions"
created: "2026-10-22"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: HIGH
status: refined
depends_on: "ctoc-is-built-with-ctoc-the-operating-lessons-say-ctoc-is-built-with-ctoc-and-fricti"
acceptance_criteria_count: 14
risk_level: HIGH
files:
  # The rule, in code
  - src/lib/streaming-precompute.js
  - src/lib/streaming-gate.js
  - src/lib/sufficiency-audit.js
  # The rule, in the agents that write and classify questions, and its description
  - agents/iron-loop/gate-critic.md
  - agents/planning/product-owner.md
  - agents/planning/implementation-planner.md
  - agents/planning/vision-advisor.md
  - docs/ENFORCEMENT.md
  # Tests, the golden fixture, and the inventories that pin the agents' rule text
  - tests/question-blocking-default.test.js
  - tests/plans-keep-moving-without-the-human.test.js
  - tests/sufficiency-audit.test.js
  - tests/fixtures/questions-the-owner-called-details.json
  - tests/compaction-eval/gate-critic/rule-inventory.json
  - tests/gate-critic-compaction.test.js
  - tests/compaction-eval/product-owner/rule-inventory.json
  - tests/compaction-eval/implementation-planner/rule-inventory.json
  # The operating lesson
  - .ctoc/templates/operating-lessons.md
  - CLAUDE.md
  - docs/OPERATING_LESSONS.md
  - tests/fixtures/claude-md-rule-inventory.json
  - tests/claude-md-lessons.test.js
---

# The gate critic sends the owner only stack, algorithm, cost and risk questions

## Problem Statement

On two plans the gate critic marked thirteen questions as needing the owner. All thirteen were implementation details: how a code fence is recognised, which headings start a section the approval fingerprint leaves out, where a record file lives, whether to fail closed, who may run a route, whether to keep a copy of a deleted record. Each one already carried an evidence-backed recommended option. The menu stopped both plans until the owner answered. He answered "HOW THE FUCK SHOULD I KNOW?" and "This is stupid llm crap you keep asking me", recorded the recommended option on all thirteen, and said "learn from it".

The cause is one rule, written in two places that agree with each other. The gate critic's rule 4a sends every question tagged technology stack, algorithm, data model, security posture, irreversible or cost to the owner. Its tie-break says "When unsure whether a finding is a detail or a weighty topic, choose the weighty topic". In code, `isBlockingQuestion` sends every `critical` question and every question with one of those six tags to the owner, whatever its recommendation.

The owner wants four kinds of question only:
- a technology-stack choice;
- an algorithm choice;
- a cost or risk only he can accept;
- a hook or gate logic change.

Everything else is settled on its evidence and written into the plan when it moves on. Until the rule changes, every plan whose author or critic writes down a design choice waits for an answer the owner cannot give better than the evidence already does.

### Evidence (read in this refinement)

- **The thirteen questions.** Every one carries exactly one option marked recommended. Both files carry the gate critic's classification block and no attestation. They are classifications, not critiques the owner asked for.
  - `.ctoc/streaming/questions/functional__a-finished-plan-can-be-sent-back-for-a-text-only-revision.md.json` holds seven questions:
    - `q01` to `q04`, `security-posture`, critical: who may send a finished plan back; how "text only" is enforced; which check must be recorded again; who finishes a revised plan.
    - `q10`, `security-posture`, critical: refusing a background agent's shell write of the send-back record.
    - `q11`, `irreversible`, critical: keeping a copy of the approval record a send-back deletes.
    - `q12`, `security-posture`, important: where the send-back record lives.
  - `.ctoc/streaming/questions/functional__a-heading-inside-a-code-block-does-not-end-the-approved-section.md.json` holds six questions:
    - `q10`, `data-model`, critical: how already-recorded approvals are handled when the fingerprint's reading changes.
    - `q11`, `algorithm`, important: which lines open and close a code block (its recommendation is "the standard Markdown fence rule, at any indentation", the CommonMark rule).
    - `q12`, `security-posture`, important: an unclosed fence.
    - `q13`, `algorithm`, important: which headings start a left-out section.
    - `q14`, `algorithm`, important: whether a level-1 line ends one.
    - `q15`, `algorithm`, important: whether an indented heading starts one.
  - Count: seven of the thirteen are critical. Six of those are in the first file and one in the second.
- **The rule in code** (`src/lib/streaming-precompute.js`):
  - `HIGH_STAKES_TOPICS` and `QUESTION_TOPICS`, lines 215–216.
  - The validator, `validatePlanQuestions`, lines 356–462. Line 408 refuses a topic outside `QUESTION_TOPICS`, and so refuses the whole file, on write and on read. Line 418 refuses a one-option question with no recommendation on a high-stakes topic.
  - `isBlockingQuestion`, lines 921–932. Line 927 sends any `critical` question to the owner; line 928 sends any high-stakes topic; line 931 sends any question with two or more options and not exactly one recommended.
  - `goesToHuman`, lines 944–946.
  - `hasEnoughInformation`, line 1262.
- **Every reader of the rule.** The search for `HIGH_STAKES_TOPICS|isBlockingQuestion|goesToHuman|QUESTION_TOPICS` over the repository, excluding `plans/`, `node_modules/` and `.claude/`, matched five files: `src/lib/streaming-precompute.js`, `src/lib/streaming-gate.js`, `src/lib/sufficiency-audit.js`, `docs/ENFORCEMENT.md` and `tests/question-blocking-default.test.js`.
  - `nextUnansweredQuestion` in `src/lib/streaming-gate.js` uses the rule to choose which question the screen asks first. It was at line 446 at the start of this refinement and at line 482 at its end, because another change was editing the file meanwhile. Cite it by name.
  - `src/lib/sufficiency-audit.js:44` and `:108` use it for the audit's count of questions that need the owner.
  - `docs/ENFORCEMENT.md:213-221` describes it.
  - `tests/question-blocking-default.test.js` tests it.
- **Every writer of `topic`.** The search for `topic` over `agents/` matched four agents that write question topics. The other matches use the word for other things: streaming topics in `vision-decomposer`, research topics in `deepthink-researcher`.
  - `agents/iron-loop/gate-critic.md`:
    - line 103, the section "Classifying the questions";
    - line 237, rule 4a and its tie-break;
    - line 302, rule 8;
    - lines 397, 407 and 415, the output shape and the pre-emit checks.
  - `agents/planning/product-owner.md:457-464`
  - `agents/planning/implementation-planner.md:473-480`
  - `agents/planning/vision-advisor.md:622-638`
- **Rule text pinned by tests.** `tests/compaction-eval/gate-critic/rule-inventory.json` pins three orders:
  - order N-001 at line 12501, the rule 4a definitions;
  - order N-003 at line 12529, the sentence that says which questions reach the human;
  - order N-004 at line 12543, "When unsure … choose the weighty topic".

  The sentence "Every choice of technology stack, algorithm, data model, security posture, anything irreversible or of recurring or large cost is a question with that `topic`" is pinned at `tests/compaction-eval/product-owner/rule-inventory.json:6052` and `tests/compaction-eval/implementation-planner/rule-inventory.json:4544`.
- **Tests that use the six tags.**
  - `tests/question-blocking-default.test.js`: lines 265–273 (each high-stakes topic blocks), line 285 (a critical `detail` question blocks) and line 377.
  - `tests/plans-keep-moving-without-the-human.test.js:380`, `:1054`, `:1083` and `:1102`.
  - `tests/streaming-human-loop-e2e.test.js:69`.
  - `tests/streaming-precompute.test.js:76` and `:388`.
- **Where a settled question is written today.** `appendDefaultDecisions` in `src/lib/streaming-gate.js` writes `- <prompt> — <choice> (question <id>)` under `## Decisions Taken Under Ambiguity` when the plan moves on. It records no evidence.
- **What `CLAUDE.md` already says.** Its "Questions" section says "Ask the human only on high uncertainty or huge importance: technology stack, algorithms, cost or risk he must accept". The code and the gate critic ask about more than that.

## Business Alignment

**Job to Be Done:** When a plan's questions have been classified, I want to be asked only about a technology stack, an algorithm, a cost or risk only I can accept, or a hook or gate change, so I can decide what only I can decide. Every other choice should be settled on its evidence and written into the plan, so I stop answering what the repository or a published standard already answers.

**Impact Map:**
- **Goal:** CTOC is built through its own menu, and every friction met while doing so becomes a plan. This is the vision's source ruling: "every friction found while doing so is filed back into CTOC as a lesson and a plan, not worked around". This friction is the gate critic asking the owner about details; it stopped two plans that were being built with CTOC.
- **Actor:** the owner. He is named in the vision's target users, and he is the one interrupted. The gate critic and the three agents that write questions (vision advisor, product owner, implementation planner) apply the rule.
- **Impact:** a plan whose open questions are all details moves on its recorded evidence, with no act from the owner. The questions that still reach him are stack, algorithm, a cost or risk only he can accept, a hook or gate change, or one no evidence settles. Each settled choice can be read in the plan, together with its evidence.
- **Deliverable:**
  - the narrowed rule, in `src/lib/streaming-precompute.js` and in the four agents that write or classify questions;
  - settled decisions written into the plan with their evidence;
  - the golden test built from the thirteen real questions;
  - the operating lesson.

**Alignment checks:**
1. Does the goal trace to the vision's problem? YES. The vision's source ruling files every friction met while building CTOC with CTOC as a plan and a lesson. This friction stopped two plans built through the menu.
2. Is the actor in the vision's target users? YES. The vision names the owner, the CTO Chief and the background agents.
3. Is the impact observable? YES. Whether a plan with only detail questions moves on without him, and which questions reach him, both show on the menu's screen and in the plan file.
4. Is the deliverable one functional area? YES. It is the rule that decides which questions reach the owner, with the lesson that states it.

## User Stories

**Story 1: details are settled, not asked.**
**As** the owner, **I want** every question that is not a stack, algorithm, owner-only cost or risk, or hook or gate change to be settled by its evidence-backed recommended option and written into the plan with that evidence, **so that** I am never again asked a question like the thirteen I could only answer by taking the recommendation.

**Story 2: what only I can decide still reaches me.**
**As** the owner, **I want** a technology-stack choice, an algorithm choice, a cost or risk only I can accept, and a change to a hook or gate to keep reaching me, together with every verdict of a critique I asked for, **so that** narrowing the rule never lets a decision that is mine, or a plan a critique stopped, move on without me.

**Story 3: the rule is an operating lesson.**
**As** a session or agent working in any CTOC project, **I want** an operating lesson that says details are settled on the evidence and which questions go to the human, **so that** the rule holds where no code enforces it: in prose questions, in briefs, and in conversation.

**INVEST:**

| Story | Independent | Negotiable | Valuable | Estimable | Small | Testable |
|---|---|---|---|---|---|---|
| 1 | Qualified: it shares `isBlockingQuestion` with story 2, and both are built in one change to that function | Yes: the definitions are fixed by the owner's words, and their wording is the planner's | Yes | Yes | Yes: one function, one validator line, one decision writer, four agent sections | Yes: scenarios 1 to 5 |
| 2 | Qualified: see story 1 | Yes | Yes | Yes | Yes: the same function, plus counter-example cases | Yes: scenarios 6 to 10 |
| 3 | Yes: no technical dependency on stories 1 and 2; it depends on the lesson plan named in `depends_on` | Yes: the wording may be tightened, never changed in meaning | Yes | Yes | Yes: one lesson line, one full text, one inventory entry | Yes: scenarios 11 to 14 |

## Acceptance Criteria

Story 1: scenarios 1 to 5. Story 2: scenarios 6 to 10. Story 3: scenarios 11 to 14. Scenarios 1 to 10 hold in any CTOC project. Scenario 2 is a real run of the gate critic, done at final review, because no unit test can run the model.

- [ ] **Scenario 1: The thirteen questions the owner called details move a plan on without him**
  Given a plan in functional planning whose questions file carries the gate critic's classification block and no attestation, as both real files do, and holds the thirteen questions from `tests/fixtures/questions-the-owner-called-details.json`
  And their ids, prompts, options, recommended flags and `critical` and `important` flags are unchanged from the two real files, seven of them `critical: true`, each tagged `detail` as the new definitions assign it
  And none of them is answered
  When the menu's continuation runs its gate check on that plan
  Then the plan moves to technical planning with no question put to the owner
  And the plan file's `## Decisions Taken Under Ambiguity` section lists thirteen decisions, one per question, each naming that question's recommended option

- [ ] **Scenario 2: The gate critic itself sorts the thirteen as details**
  Given a scratch project holding copies of the two real plans and, as each plan's author list, its questions from the fixture with their topics as originally stored
  When the gate critic classifies each plan under its new instructions
  Then each of the thirteen comes out tagged `detail`, with its wording, options and recommended option unchanged
  And the owner is shown at most one question per plan, and only a `hook-or-gate` question whose prompt names, in plain words, the hook or gate change that plan makes, together with the choices settled inside it
  And the run's two classified files are shown to the owner in full at final review

- [ ] **Scenario 3: A settled decision is written with its evidence**
  Given a plan with an unanswered `detail` question whose recommended option's description reads "Rests on the approval module's fail-closed rule (src/lib/approval-ledger.js lines 257-261)"
  And a second unanswered `detail` question whose recommended option has no description and no pros
  When the plan moves on
  Then the first question's decision line names the question, the recommended option and that evidence text, on one line
  And the second question's decision line says that no evidence was stated

- [ ] **Scenario 4: A question no evidence settles is never settled by default**
  Given a classified `detail` question with two options and neither marked recommended
  When the menu's continuation runs its gate check on that plan
  Then the plan does not move on, and the menu's screen puts that question to the owner
  And no decision line is written for it

- [ ] **Scenario 5: A question classified before this change keeps its meaning**
  Given a stored, classified, unanswered question tagged `security-posture` with one recommended option and `critical: false`
  When the menu's continuation runs its gate check on that plan
  Then the plan does not move on, and the screen puts that question to the owner, as before this change
  And the instructions of the gate critic, the vision advisor, the product owner and the implementation planner name only `technology-stack`, `algorithm`, `cost`, `risk`, `hook-or-gate` and `detail` as the topics they write

- [ ] **Scenario 6: A technology-stack choice still reaches the owner**
  Given a classified question "Replace the built-in node:test runner with a third-party test framework?" tagged `technology-stack`, with `critical: false` and one recommended option, "Keep node:test"
  When the menu's continuation runs its gate check on that plan
  Then the plan does not move on
  And the screen puts that question to the owner before any other open question of that plan

- [ ] **Scenario 7: An algorithm choice still reaches the owner**
  Given a classified question "Rank the sibling plans a critique reads by keyword score alone, by meaning similarity alone, or by the fused ranking used today?" tagged `algorithm`, with `critical: false` and one recommended option
  And the question is about the method that computes a central result, and no published standard or measurement in the repository settles which method ranks plans best
  When the menu's continuation runs its gate check on that plan
  Then the plan does not move on, and the screen puts that question to the owner

- [ ] **Scenario 8: A risk only the owner can accept still reaches the owner**
  Given a classified question "Delete every answer older than a plan's current revision from the answers log? Deleted answers cannot be recovered." tagged `risk`
  And its recommended option is "Delete them", with `critical: false`
  When the menu's continuation runs its gate check on that plan
  Then the plan does not move on, and the screen puts that question to the owner

- [ ] **Scenario 9: A hook or gate change reaches the owner once, and the choices inside it do not**
  Given a classified file for a plan that makes the write protection refuse one new kind of write and lets the menu finish one new kind of plan on recorded evidence
  And the file holds one `hook-or-gate` question asking whether to make those two changes, and three `detail` questions on how to build them, each with one recommended option
  When the menu's continuation runs its gate check on that plan
  Then the screen puts the `hook-or-gate` question to the owner, and none of the three `detail` questions
  And once he answers it, the plan moves on, with the three `detail` questions written as decisions with their evidence
  And the gate critic's instructions say that an implementation slice raises no second `hook-or-gate` question unless it changes a hook or gate its parent plan does not describe

- [ ] **Scenario 10: A critique the owner asked for still stops a plan it rejects or could not finish**
  Given a critique the owner asked for, with a valid attestation, whose gate ruling is Reject and whose one finding question is tagged `detail`, `critical: true`, with "Send back — add a real end-to-end test first" recommended
  And a second critique, with a valid attestation, whose prosecution lens did not run and whose gate ruling is Hold
  When the menu's continuation runs its gate check on each plan
  Then neither plan moves on, and the screen puts the finding, the lens question and both rulings to the owner, as before this change
  And when the owner answers only the first plan's ruling, with Approve, that plan still does not move on, and no "Send back" option is written into it as a decision taken by default
  And the audit's count of questions that need the owner equals the gate's count for both plans
  And `docs/ENFORCEMENT.md`'s paragraph "Which questions reach the human" states the same conditions as the code

- [ ] **Scenario 11: Lesson 23 lands when it fits**
  Given `CLAUDE.md` measured in bytes after the plan named in `depends_on` has landed, with the number recorded in the implementation plan
  And the lesson's line fits under 15,000 bytes
  When the lesson is added
  Then lesson 23 in `.ctoc/templates/operating-lessons.md` and in `CLAUDE.md` reads, word for word: `23. **Settle details on the evidence.** Ask the human only about a technology stack, an algorithm, a hook or gate change, a cost or risk only they can accept, or what no evidence settles.`
  And the lessons in both files run 1 to 23 with none missing, the two blocks are identical, `CLAUDE.md` is at or under 15,000 bytes, and nothing outside the block changes
  And a temporary user project whose block is refreshed through `ensureLessonsBlock` shows lesson 23, with every byte outside its block unchanged

- [ ] **Scenario 12: Lesson 23 does not fit, and nothing is cut to make room**
  Given the lesson's line would take `CLAUDE.md` over 15,000 bytes
  When the builder reaches the lesson
  Then no lesson text lands in `.ctoc/templates/operating-lessons.md`, `CLAUDE.md`, `docs/OPERATING_LESSONS.md` or the rule inventory
  And the build reports to the owner the measured size of `CLAUDE.md` and the bytes still needed, with no other rule shortened, moved or removed
  And the rule changes of scenarios 1 to 10 are unaffected

- [ ] **Scenario 13: The lesson reads correctly in any CTOC project**
  Given lesson 23's line
  When its text is searched
  Then it contains no person's name, no date, no backticked file or folder path, and the words "CTOC repository" nowhere
  And it uses "the human", as the other lessons do

- [ ] **Scenario 14: The full text says what the rule is and why**
  Given `docs/OPERATING_LESSONS.md` after lesson 23 lands
  When a maintainer reads lesson 23's full text
  Then it opens with the lesson line and defines, in plain words, the four kinds of question that go to the human
  And it states that a parsing or boundary rule settled by a published standard or by the repository's evidence is a detail, not an algorithm
  And it states that a question no evidence settles goes to the human, and that every settled choice is written into the plan with its evidence
  And it states that the rule came from thirteen detail questions sent to the owner on two plans
  And it names no person and no date
  And the full-text list runs 1 to 23

## Scope

### In Scope

1. **Which questions reach the owner in a classified file** (scenarios 1, 4, 5, 6, 7, 8, 9 and 10). The shared rule (`goesToHuman` with `isBlockingQuestion`) sends a question to the owner when any of these holds:
   - it is malformed (unchanged);
   - its topic is one of `technology-stack`, `algorithm`, `cost`, `risk` or `hook-or-gate`;
   - its topic is one of the three earlier tags `data-model`, `security-posture` or `irreversible` (see In Scope item 2);
   - it has two or more options and not exactly one recommended (unchanged);
   - it is `critical` and its file carries a valid attestation, which marks a critique the owner asked for (unchanged for such files). This covers that critique's Reject ruling; the questions it raises about itself or about a plan steering its reviewer (a critique lens that did not run, an injection attempt, a file declared outside the allowed read scope, missing ancestry, a redirected read, lenses that contradict each other, an unreadable plan, more than five criticals, no critique at all); and its critical findings, whose recommended option is usually to send the plan back;
   - it is `important` with no topic, which covers a Hold ruling (unchanged).

   In a file without an attestation, which is a classification, `critical: true` no longer sends a question to the owner by itself. It stays the tier that orders the questions. The one exception is a critical question whose id topic is one only a critique's synthesis writes: it reaches the owner whatever the file's attestation (decision 3).

   `goesToHuman` therefore needs to know whether the file is attested. Its three callers pass that, so the gate, the screen and the audit keep one shared rule:
   - `hasEnoughInformation` in `src/lib/streaming-precompute.js`;
   - `nextUnansweredQuestion` in `src/lib/streaming-gate.js`;
   - the audit's count in `src/lib/sufficiency-audit.js`.
2. **The topic vocabulary** (scenarios 5, 6, 7, 8 and 9).
   - The validator accepts `technology-stack`, `algorithm`, `cost`, `risk`, `hook-or-gate` and `detail`.
   - It also keeps accepting `data-model`, `security-posture` and `irreversible`, which always reach the owner. No stored file becomes invalid, and no question already classified changes meaning.
   - The refusal of a one-option question with no recommendation covers every topic that reaches the owner.
3. **The definitions in the gate critic** (`agents/iron-loop/gate-critic.md`; scenarios 2, 9 and 10). This covers rule 4a, with its sentence on which questions reach the human, the section "Classifying the questions", and the replacement for the "when unsure, choose the weighty topic" tie-break. The full texts are under `## Decisions Taken Under Ambiguity`, items 4 to 8. In short:
   - `algorithm` excludes any parsing or boundary rule that a published standard, an existing rule in the repository, or a search or measurement settles.
   - `risk` is a loss or exposure that the recommended option knowingly takes on and that no earlier decision of the owner accepted.
   - `hook-or-gate` is one question per plan: whether CTOC's hook or gate behaviour changes as the plan describes. The design forks inside that change are details.
   - Rule 4a's sentence on which questions reach the human says what In Scope item 1 says, so rule 8's text ("no surviving question goes to the human under rule 4a") stays as it is.
4. **The three authors' question sections** use the new vocabulary and never write the three earlier tags (scenarios 5 and 9). The authors are `agents/planning/product-owner.md`, `agents/planning/implementation-planner.md` and `agents/planning/vision-advisor.md`.
5. **The rule inventories** re-record each changed order and pin the new texts (scenario 2). These are the gate critic's orders N-001, N-003 and N-004, and the sentence pinned in both the product owner's and the implementation planner's inventories. How each is recorded, and which orders join them, is technical decision 2 below: the gate critic's orders are re-recorded in place, not marked `fate: "replaced"`.
6. **A settled decision carries its evidence** (scenario 3). The line written under `## Decisions Taken Under Ambiguity` when the plan moves on names the recommended option's evidence: its `description`, else its `pros`, on one line, control-stripped and capped. When neither exists, the line says that no evidence was stated.
7. **The golden fixture** `tests/fixtures/questions-the-owner-called-details.json` (scenario 1). It holds the thirteen questions copied from the two real files, with ids, prompts, options, recommended flags, `critical` and `important` unchanged. Each carries the topic the new definitions assign, `detail`, and the definition clause that makes it one. No test reads the live `.ctoc/streaming/` files.
8. **`docs/ENFORCEMENT.md`**: its paragraph "Which questions reach the human" (lines 213–221) states the new conditions (scenario 10).
9. **The operating lesson** (scenarios 11 to 14). Lesson 23 goes into `.ctoc/templates/operating-lessons.md` and the lessons block of this repository's `CLAUDE.md`. Its full text goes into `docs/OPERATING_LESSONS.md`, and `tests/fixtures/claude-md-rule-inventory.json` pins it. The lesson-number checks in `tests/claude-md-lessons.test.js` move from 1 to 22 to 1 to 23. All of this happens only if the lesson fits within 15,000 bytes; when it does not, the build stops as scenario 12 says.

### Out of Scope

Each item says where it lives. None is a scheduling choice; the owner alone schedules.

- **What a critique the owner asked for shows him.** Its routing stays exactly as it is, `critical` included (decision 3): its gate ruling, its coverage notice, its findings, and the questions it raises about itself or about a plan steering its reviewer. That critique runs only when he asks for it (`src/commands/start.md:272-274`). If its Reject no longer reached him, a Reject would need an automatic send-back. That is a new gate mechanism nobody asked for, and no plan proposes it.
- **Re-tagging question files already stored.** They keep their tags, and the three earlier tags keep reaching the owner (In Scope item 2). A plan's next revision is classified under the new definitions.
- **The owner's own answers written into the plan.** No code writes them there today. `appendDefaultDecisions` is the only writer of `## Decisions Taken Under Ambiguity` in `src/lib/streaming-gate.js`, and an answer goes only to `.ctoc/streaming/answers.jsonl` (`appendAnswerEntry`, called by `streamAnswer`, in the same file). This plan does not change that, and no plan for it was found.
- **Lesson 17's sentence** that an owner decision gets "no manufactured recommendation" stays unchanged. The new lesson says which questions reach the human, not how a question is phrased. The search for `manufactured recommendation|no recommendation on an owner decision` over the open plan folders matched four plans that name that phrase, among them `plans/todo/00268-every-agent-and-specialist-skill-improved-three-times-s8-ask-me-questions.md`.
- **`CLAUDE.md`'s "Questions" section, and `src/commands/start.md:389`** ("every weighty choice the author left unasked"), stay unchanged. Both stay true under the new definitions.
- **Making room in `CLAUDE.md`** for the lesson by moving or shortening other text is not done by this plan's build (scenario 12). The plan this one depends on says the same. Slice 4's stop files one question about it, which reaches the owner only if a rule would be removed (technical decision 6).
- **"CTOC keeps working and asks only what matters"** (`plans/functional/ctoc-keeps-working-and-asks-only-what-matters.md`).
  - This plan replaces rows 2 and 3 of its slice 1 classification table: any critical question, and any of six topics, goes to the human.
  - Its code is already in place, at `src/lib/streaming-precompute.js:215` and `:921-932`, and the gate critic's rule inventory records the agent text as added by its slice 1.
  - This plan does not edit that plan. Whichever of the two is built later keeps this plan's rule.
- **"The classification brief for the gate critic carries the plan file modification time"** (`plans/todo/ctoc-is-built-with-ctoc-the-classification-brief-for-the-gate-critic-carries-the-pla.md`) does not edit `agents/iron-loop/gate-critic.md`.
  - Its `files:` list names `src/lib/menu-screens.js`, `src/commands/start.md`, a new test, `CLAUDE.md` and `README.md`.
  - Its decisions 6 and 8 keep the gate critic unchanged.
  - The two plans share `CLAUDE.md` only, where that plan moves a test-file count.

## Risks

### Technical Risks
- A question that should stop a plan is settled by its recommendation instead: a critique finding whose recommended option is to send the plan back, or a question a critique raises about itself.
  - Likelihood: LOW
  - Impact: HIGH
  - Mitigation: Keep every `critical` question of an attested critique reaching the owner as today (decision 3), and write scenario 10's cases first, so they are seen to pass both before and after the routing changes.
- The gate critic tags a real stack, algorithm, cost, risk or hook-or-gate choice as `detail`. That choice is then settled by its recommendation, and the owner sees it only in the plan's decisions.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Run the real gate critic on the thirteen and on the questions of scenarios 6 to 9 at final review (scenario 2), and pin the definitions and the new tie-break in the gate critic's rule inventory.
- In other CTOC projects, an unanswered question already classified as `critical` and `detail` stops reaching the owner after the update and is settled by its recommendation.
  - Likelihood: LOW
  - Impact: LOW, because the old rule already judged it a detail with an evidence-backed recommendation, and that recommendation is written into the plan.
  - Mitigation: Repeat decision 15's count in this repository at Step 9. Slice 1's Step 15 writes the release description's sentence: in a classified question file a `critical` question no longer reaches the owner on its own account; only a technology-stack, algorithm, cost-or-risk or hook-or-gate question does, besides a question no evidence settles and every verdict of a critique he asked for.
- Replacing orders in three rule inventories trips the compaction tests (the order floor and the kinds digest).
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Re-record the gate critic's added orders in place (technical decision 2); give R-420 and R-316 new `replaced_by` records; raise `ORDER_FLOOR` to 596; run the three compaction tests first to see them fail.

### Business Risks
- This plan is classified under today's rule, because the new rule is not built yet. The gate critic may therefore still send this plan's own details to the owner.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Record every fork of this plan as a decision with its evidence, as done below, so any question a classifier adds already carries an evidence-backed recommendation the owner can take in one step.
- The owner still finds a hook-or-gate approval unwelcome.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Ask it once per plan, naming in plain words every change and the choices settled inside it (scenario 9).
- The lesson does not fit in `CLAUDE.md` (decision 18).
  - Likelihood: HIGH
  - Impact: LOW, because code and the agent texts enforce the rule, and the lesson restates it for prose and conversation.
  - Mitigation: Stop at scenario 12 and record the measured size and the bytes still needed, with one question about making room (slice 4). It reaches the owner only if making room would remove a rule (technical decision 6).

### Dependency Risks
- The plan named in `depends_on`, "The operating lessons say CTOC is built with CTOC and friction is filed as a plan", sets the lesson numbers and uses nearly all the room in `CLAUDE.md`. The plan "Every session is told that a hotfix word is checked, and how to run the check and commit" (`plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s4-every-session-is-told.md`) adds a paragraph that competes for the same bytes.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Measure `CLAUDE.md` again at Step 9 from whatever has landed, and number the lesson after the highest lesson then present.
- Other plans edit the same files. The search for those paths over `plans/{functional,implementation,todo,in-progress,review}` matched:
  - for `agents/iron-loop/gate-critic.md`:
    - `plans/todo/00370-every-agent-and-specialist-skill-improved-three-times-s110-gate-critic-and-lenses.md`;
    - `plans/implementation/00413-small-changes-take-a-small-path-s13-one-critique-per-group.md`;
    - `plans/implementation/deepthink-ships-with-ctoc-s8-reader-and-critic-wording.md`;
  - for `src/lib/streaming-precompute.js`:
    - the six slices of "Small changes take a small path" (critique only before build; unchanged plan not re-critiqued; group answer fan-out; critique queue and four lenses; one critique per group; critique cap) and their parent `plans/implementation/small-changes-take-a-small-path.md`;
    - `plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s24-only-a-critique-the-menu-launched-can-move-a-plan.md`;
  - for the three author agents:
    - `plans/todo/00297-every-agent-and-specialist-skill-improved-three-times-s37-product-owner.md`;
    - `plans/todo/00295-every-agent-and-specialist-skill-improved-three-times-s35-implementation-planner.md`;
    - `plans/todo/00300-every-agent-and-specialist-skill-improved-three-times-s40-vision-advisor.md`;
    - `plans/in-progress/dispatched-agents-route-their-questions-to-the-session.md`;
    - `plans/functional/vision-file-names-and-planning-agent-orders.md`;
    - `plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s2-the-planner-writes-it.md`, which also edits the implementation planner's rule inventory.

  A match shows that a plan names the file, not that it is still unbuilt.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Re-read each shared file and its inventory at Step 9, and confirm every quoted line is still there before replacing it. A line that moved or changed stops the build for a re-plan.

## Priority

**Priority: HIGH** (Score: 7/9)
- Dependency: 1 -- it depends on another stub, the lesson plan named in `depends_on`.
- Business Impact: 3 -- it is core to the vision's goal of building CTOC through its own menu. The friction stops every plan whose author records a design choice, and it is the owner's direct complaint.
- Technical Risk: 3 -- it changes gate logic shared by the gate, the screen and the audit; the four agents that write or classify questions; and three pinned rule inventories.

## Decisions Taken Under Ambiguity

1. **No question was put to the owner in this refinement.** The direction and the four kinds of question are his words. Every fork below has a best answer that his own words, the golden acceptance or the code settles. The questions file holds an empty list (item 20).
2. **`critical` stops sending a question to the owner by itself.** Seven of the thirteen questions are `critical: true`. The golden acceptance requires all thirteen settled, and the owner said "only" four kinds. `critical` stays required, and stays the tier that orders the questions.
3. **A critique the owner asked for keeps today's routing, including `critical`.** In a file with a valid attestation, `critical: true` still sends a question to him.
   - Such a critique's critical questions are verdicts, not design forks. They include its Reject ruling, the questions it raises about itself or about a plan steering its reviewer, and its findings, whose recommended option is usually "send back".
   - If those no longer reached him, he could answer the ruling with Approve. The plan would then cross, and the defaults writer would record "Send back — …" as a decision taken, a plan claiming it was sent back. Today that cannot happen. After this change it still cannot for a critique file that carries a valid attestation, and scenario 10 proves that. It can for a critique output that drops both its ruling and its attestation: such a file reads as a plain classification, its critical findings settle by their recommendation, and nothing refuses it (`src/lib/streaming-questions-sweeper.js` lines 198–216 pass the file to the writer as it is, and `reservedIdErrors` refuses only a ruling or a coverage notice without an attestation). Its precondition is the gate critic breaking its own rule 10 and output shape. Slice 1 narrows that residual to a critique's finding-band critical questions: a critical question whose id topic is one only a synthesis writes (a prosecution lens that did not run, an injection attempt in a plan or a lens payload, a declared file outside the read scope, missing ancestry, a redirected read, contradicting lenses, no critique, an unreadable plan, a plan not ready for its gate; `agents/iron-loop/gate-critic.md` lines 171 and 179) reaches the owner whatever the file's attestation, so it is never settled by its recommendation, and such a file is never refused, because a classification writes the steering ones itself (its technical-planning decision 9). Slice 1 states the rest in its Security review and pins it with its case 63, and slice 3 makes the output shape say that only a synthesis writes the attestation.
   - The critique runs only when he asks for it (`src/commands/start.md:272-274`).
   - A file carries the ruling only with a valid attestation (`reservedIdErrors`, `src/lib/streaming-precompute.js:549-560`), so the attestation marks such a critique reliably. That also spares the code from recognising questions by their id numbers. The numbers could not be used anyway, because author questions also use `q01` to `q04`, as the first golden file shows.
   - The cost, stated as a fact: an author's critical question carried into a critique he asked for still reaches him there, even when it is a detail.
4. **The `algorithm` definition**, the text for rule 4a: "`algorithm`, choosing the method by which the product computes, ranks, matches, predicts or schedules a central result, where the candidate methods give materially different results or costs and neither a published standard, an existing rule in the repository, nor a measurement or search the agent can run settles which is better. How input is parsed or read (where a code block, heading, field or record begins and ends), edge cases and boundaries inside a method already chosen, and fail-closed or fail-open handling are details, not algorithms."
   - This makes q11, q13, q14 and q15 of the code-block plan details.
   - q11's recommendation rests on the CommonMark fence rule and three searches over `plans/`. q13 rests on two searches with zero hits. q14 and q15 rest on the approval module's fail-closed rule.
   - Scenario 7's ranking question stays an algorithm.
5. **The `risk` definition**: "`risk`, the recommended option, or every option, knowingly takes on a loss or exposure that no earlier decision of the owner accepted: money spent; data lost, or exposed outside the project's approved boundary; something published, sent, deployed or migrated that cannot be undone; a protection that exists today weakened or switched off; a legal or compliance obligation. When the recommended option avoids it, the question is a detail."
   - This makes these questions details: keeping a copy of the deleted record; how already-recorded approvals are handled, where no record is rewritten; refusing an unclosed fence; running the full check again; adding one refusal.
   - `cost` keeps today's definition: a recurring cost or a large one-off cost.
6. **The `hook-or-gate` definition**: "`hook-or-gate`, one question per plan, asking whether CTOC's hook or gate behaviour changes as the plan describes: what a hook refuses or allows, what a plan needs before it moves on, what reaches the owner, or what the menu moves on recorded evidence. Its prompt names each change, and the choices settled inside it, in plain words. Every choice of how to build such a change is a detail. An implementation slice raises no second one unless it changes a hook or gate its parent plan does not describe."
   - Why the change itself and not each fork: the golden acceptance settles q01, q02, q04 and q10 of the send-back plan, yet each of them names a hook or gate-logic change "needing your explicit approval". So the owner's fourth kind can only be the change itself, never each fork inside it.
   - It keeps `CLAUDE.md`'s rule "Hook or gate logic changes only with the owner's explicit approval".
   - A real case of this kind: the plan "The background-agent protection is measured before the owner decides whether it is on" already puts the refusal switch to him.
7. **The tie-break is replaced.**
   - Old: "When unsure whether a finding is a detail or a weighty topic, choose the weighty topic; never choose detail to let a plan through." This tie-break is what sent the thirteen to the owner.
   - New: "Apply each definition's test as written: does the answer need something only the owner holds — his choice of stack or algorithm, his acceptance of a cost or risk, his approval of a hook or gate change — rather than evidence that the repository, a published standard, a measurement or his own written rules already hold? If no test fires, the question is a detail. Never call a question a detail when a test fires."
8. **Rule 4a's sentence on which questions reach the human is rewritten; rule 8 is not.** The new sentence: "In a classification, a question goes to the human only when its topic is `technology-stack`, `algorithm`, `cost`, `risk` or `hook-or-gate` (or one of the three earlier tags a stored file may still carry), or it has two or more options and not exactly one recommended. In a critique the human asked for, a `critical` question also goes to him, and so does a Hold ruling. Any other question is decided by its recommended option." Rule 8 already defers to rule 4a ("no surviving question goes to the human under rule 4a"), so its text stays. In a critique, a critical finding still reaches the owner and still keeps the ruling at Reject (rule 10, unchanged).
9. **A question no evidence settles reaches the owner.** That is a question with two or more options and none recommended, today's condition at `src/lib/streaming-precompute.js:931`, unchanged.
   - The owner's standing rule asks the human "only on high uncertainty or huge importance" (`CLAUDE.md`, "Questions"), and this is the high-uncertainty case. Such a question is never settled, and no decision line is written for it (scenario 4).
   - The agent texts add one duty before a question is left without a recommendation: look for evidence first. Sources are the repository, a published standard, a measurement, or a research request through the deepthink researcher. The first option's description then names what was searched and what would settle it.
   - The owner's rule that every question he sees names a best pick is kept by stating the leaning pick and its weak evidence in the option text, without the `recommended` flag, because the flag is what decides routing.
   - A two-option detail whose options cost the same either way is not a question: the agent picks one and records it (rule 7e, unchanged).
10. **The three earlier tags stay valid and keep reaching the owner.**
    - Line 408 refuses an unknown topic, and so refuses the whole file on write and on read. Dropping the three tags would make every stored file that uses them invalid and stall its plan, the two golden files included.
    - Re-reading them as details would settle, without a new classification, questions classified under the old definitions, some of which may be real risks.
    - Keeping them routing fails closed and changes no stored meaning. The four writing agents stop using them.
11. **The topic names.** The new names are `risk` and `hook-or-gate`. `cost` keeps its name and meaning, so the owner's third kind is the two topics `cost` and `risk`. The names follow rule 4a's existing form: lower-case and hyphenated.
12. **What a decision line records as evidence.**
    - It records the recommended option's `description`, because the gate critic's classification rule already puts the plan file and line there; when there is no description, it records the option's `pros`.
    - The evidence is single-line, control-stripped and capped like the line's other parts; technical planning sets the cap. When neither field exists, the line says "no evidence was stated" rather than looking backed.
    - The line keeps today's start, `- <prompt> — <choice> (question <id>)`, so the assertions at `tests/plans-keep-moving-without-the-human.test.js:252-253` still hold.
13. **The golden fixture is a copy.** The live files under `.ctoc/streaming/` change and can be removed. The fixture keeps every field that decides routing and the decision line, and adds, per question, the definition clause that makes it a detail. Technical planning checks whether a fixture file counts toward a documented count. This plan assumes it does not, because the counts in `CLAUDE.md` are of test files.
14. **The case at `tests/question-blocking-default.test.js:285`, with a written reason for any rewrite.**
    - It asserts that a critical `detail` question blocks. After this change that holds only in an attested file.
    - Technical planning keeps it as the attested case, or rewrites it with this reason: the owner replaced that contract for classifications, where a question reaches him only for four kinds.
    - Either way, a sibling case pins that a critical `detail` question in a classification does not block (scenario 1). A second sibling pins that a Reject ruling still blocks (scenario 10).
    - The fixtures that use the three earlier tags keep passing unchanged, because those tags keep routing: `tests/plans-keep-moving-without-the-human.test.js:380`, `:1054`, `:1083` and `:1102`; `tests/streaming-human-loop-e2e.test.js:69`; `tests/streaming-precompute.test.js:76` and `:388`. Of those files, only `tests/plans-keep-moving-without-the-human.test.js` is in `files:`, for scenarios 1, 3 and 9.
15. **The retroactive effect, counted, independent of the order of keys.** After this change, only one kind of stored question changes routing: a `critical: true` question tagged `detail` in a file with no attestation. The three earlier tags keep routing, and attested files keep `critical`. Three searches were run over `.ctoc/streaming/questions/*.json`:
    - `"critical": ?true` matched 58 times in 25 files.
    - `"topic": ?"detail"` matched 30 times in 10 files.
    - `"attestation"` matched 11 files.

    Of the 10 files holding a `detail` question, 7 carry an attestation. The other three, the functional plan "Opening the menu in a fresh worktree writes no stray half-filled IRON_LOOP.md" and the functional and implementation files of the lesson plan named in `depends_on`, hold no `critical: true` question. So no stored question in this repository changes routing.

    The one `critical` `detail` question found by an earlier search, `q10-clash-refusal-test-goes-vacuous-r1792323789864`, sits in an attested critique and keeps routing; it is also already answered (`.ctoc/streaming/answers.jsonl` line 160). Other projects were not searched (see Risks).
16. **The lesson is lesson 23, carried in this plan.** The plan named in `depends_on` keeps lessons 14, 21 and 22.
    - That plan is in the build queue under its approval fingerprint, and a hand edit would break its approval.
    - The menu route that would send it back for revision is the plan "A plan in the build queue can be sent back to technical planning and keeps its title" (`plans/todo/ctoc-is-built-with-ctoc-a-plan-in-the-build-queue-can-be-sent-back-to-technical-plan.md`), and that plan is not built.
    - Numbering after that plan's 22 renumbers nothing, which matters because `CLAUDE.md` cites lessons by number.
17. **The lesson's wording**, 187 bytes plus its line break by hand count, all ASCII: `23. **Settle details on the evidence.** Ask the human only about a technology stack, an algorithm, a hook or gate change, a cost or risk only they can accept, or what no evidence settles.`
    - "What no evidence settles" is included because without it the lesson would contradict scenario 4 and lesson 15 ("Ask before you build").
    - Lesson 17 is not contradicted: the lesson says which questions go to the human, not how a question is phrased.
18. **The lesson will most likely not fit.**
    - `CLAUDE.md` measured 14,730 bytes on 2026-10-22. The plan named in `depends_on` adds 256 bytes by its own measurement, which leaves 14 bytes of room. The line needs 188.
    - Unless other text leaves `CLAUDE.md` first, scenario 12 is the expected path, and the lesson lands nowhere. Two checks force that. `tests/claude-md-keeps-every-rule.test.js:103-111` holds the block in `CLAUDE.md` identical to the template's. The plan named in `depends_on` adds checks that the lessons in the block and in the full texts run exactly 1 to 22.
    - Story 3 has no technical dependency on stories 1 and 2, so technical planning can give it a slice of its own. That is a fact about the dependency graph, not a schedule.
19. **Its full text names no person and no date**, as the CTO Chief's brief requires, although other entries in `docs/OPERATING_LESSONS.md` carry dates.
20. **The questions file is an empty list.**
    - This plan changes gate logic: what reaches the owner, and what the menu moves on its evidence. The owner's own words order that change, and he said never to re-ask its direction or its four kinds.
    - The forks his words leave open have best answers that his standing rules or the golden acceptance settle: items 2, 3, 6, 9 and 10.
    - The one count that could have made a question necessary, unanswered questions whose routing this change flips, is zero here (item 15).
21. **Three stories and fourteen scenarios**: five, five and four, within the agent file's two to five per story. Scenario 2 runs the real gate critic at final review, because only a real run shows what a model classifies; no unit test can.
22. **Two corrections to the brief, verified.**
    - The plan "The classification brief for the gate critic carries the plan file modification time" does not edit `agents/iron-loop/gate-critic.md` (see Out of Scope).
    - The thirteen questions carry the tags `security-posture` (seven), `algorithm` (four), `data-model` (one) and `irreversible` (one).
23. **The status file carries no times.** This agent has no clock, so `started`, `completed` and `updatedAt` are null.
24. **No instruction found in the questions files, the plans or the vision asked for anything beyond this refinement**, and none was acted on.

## Slices (dependency-ordered)

Technical planning split this plan into four slices. Each is a complete implementation plan under `plans/implementation/`, built through Steps 8 to 16 on its own.

| # | Slice file | Scope (one line) | depends_on |
|---|---|---|---|
| 1 | `the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions-s1-what-reaches-the-owner.md` | In a classified question file only the five topics, an earlier tag or no single recommendation reach the owner; `critical` still does in a critique he asked for. Gate, screen and audit change together. | - |
| 2 | `the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions-s2-settled-questions-carry-their-evidence.md` | Each settled question's decision line names its evidence; the twenty questions the owner called details whose answered version is on disk move their plans on in a test. | s1 |
| 3 | `the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions-s3-the-four-agents-use-the-new-topics.md` | The gate critic's rule 4a, routing sentences, tie-break and evidence-first duty; the three authors write only the six topics; the three rule inventories re-recorded. | s1 |
| 4 | `the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions-s4-the-operating-lesson.md` | Lesson 23 in the lessons source, `CLAUDE.md`, the full texts and the rule inventory, or a measured stop when it does not fit. | `ctoc-is-built-with-ctoc-the-operating-lessons-say-ctoc-is-built-with-ctoc-and-fricti` |
| 5 (conditional) | `the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions-s5-the-rule-check-accepts-a-plans-own-crossing-records.md`, written by the planner only if the owner takes option 1 of technical decision 1 | Inventory check 3 also accepts the named plan's own `sufficiency` and `pipeline` records, keeping its hash and naming rules: `tests/compaction-eval/inventory-checks.js` and cases 32 and 50 of `tests/question-blocking-default.test.js`. `tests/compaction-eval/inventory-checks.js` is not in this plan's `files:` today; the planner adds it with the slice. | s1 |

Dependency graph: slice 1 → slices 2 and 3 (disjoint files, so they can build side by side once slice 1 is built); slice 4 hangs only on the lesson plan. Under option 1 of technical decision 1, slice 1 → slice 5 → slice 3, because slice 5 edits `tests/question-blocking-default.test.js` after slice 1 and slice 3's check 3 needs it; that edge is held by slice 3's Step 8 precondition, not by its `depends_on` (technical decision 1). Longest chain: three under option 1, two otherwise. No cycle. The dependency graph is technical; which slice is built when is the owner's.

### Scenarios, by slice

| Scenario | Slice | Proof |
|---|---|---|
| 1 | 1 (routing), 2 (golden cases end to end) | slice 1 cases 51 and 54; slice 2 cases D1 and D2 |
| 2 | 3 | the real gate-critic run at its final review |
| 3 | 2 | D3, D4, D5 |
| 4 | 1 | 55 |
| 5 | 1 (code), 3 (agents) | 52, 53, 56; the four-agent topic case |
| 6, 7, 8 | 1 | 57, 58, 59 |
| 9 | 1 (routing), 2 (decision lines), 3 (agent text) | 60; D6; N-001's anchor |
| 10 | 1 | 51, 54, 61, 62, 63, 4c |
| 11 to 14 | 4 | its cases 1 to 4, the numbering checks, the stop rule |

## Decisions Taken Under Ambiguity — technical planning

1. **One open choice remains, a real owner question, and it blocks slice 3 only.** Inventory check 3 (`tests/compaction-eval/inventory-checks.js` lines 69–88, its refusal of a crossing's record pinned by the case at `tests/question-blocking-default.test.js` line 825) accepts a re-recorded agent order only under a human or backfilled approval of the plan its record names, and this plan's slices move on recorded evidence (a `sufficiency` record into the build queue, a `pipeline` record at the finish, which overwrites it).
   - The question: does check 3 also accept a plan's own on-evidence crossing records, keeping its hash and naming rules (recommended, option 1), or does the menu hold such a plan for the owner's approve at both moves (option 2)? Slice 3 states the fact and both options in full.
   - The planner writes the question in its next pass, under topic `security-posture` (slice 3 says why). It is asked once, and its answer covers the three other planned slices that re-record agent orders and hit the same clash: "Every session is told that a hotfix word is checked" (`plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s4-every-session-is-told.md`), "The manual and the docs stop claiming what CTOC no longer does" (`plans/implementation/the-manual-and-the-docs-stop-claiming-what-ctoc-no-longer-does.md`) and "the planner writes it" (`plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s2-the-planner-writes-it.md`).
   - Under option 1 the conditional slice 5 is written and built; under option 2 a slice changing `src/lib/streaming-gate.js` (the streaming-gate slice) is needed instead, which slice 3 describes. Slices 1, 2 and 4 edit no rule inventory and are not affected.
   - The build order is held by slice 3's Step 8 precondition, never by a `depends_on` edit after the answer. The answer runs the continuation, which can move slice 3 into the build queue on its evidence, and a later edit of its frontmatter would break its approval fingerprint. So slice 3's first action reads the owner's recorded answer and confirms that slice 5 (option 1) or the streaming-gate slice (option 2) is finished, and otherwise changes no file and kicks back.
   - Filing that question is an exit condition of this planning pass: the planner files it next.
2. **Corrections to this plan, verified in technical planning.**
   - In Scope item 5 said the gate critic's orders N-001, N-003 and N-004 end as `fate: "replaced"`. They are added orders, which no unit lists, and such an order marked replaced fails check 3; they are re-recorded in place instead, as N-007 and N-009 were. N-011 joins them: its anchor lists the old six topics.
   - Scenario 1's thirteen questions cannot share one plan with their ids unchanged: the two stored files both use `q10`, `q11` and `q12`, and a questions file refuses a repeated id. Slice 2 puts them in two plans and counts thirteen lines over both.
   - Decision 13's fixture also carries seven of the nine detail questions of 2026-10-22, as the coordinator's brief asked; the other two have no answered version on disk and are named in slice 2 instead (its decision 7); `q12-declared-pattern-expansion` of the send-back command slice is left out because the owner has not answered it.
3. **No new test file in any slice**, so no documented count moves and `CLAUDE.md` is declared only by slice 4, for the lesson line. The fixture under `tests/fixtures/` is not a counted kind (`src/lib/documented-counts.js` lines 74–86).
4. **Protected-list status, stated per slice**: `src/lib/streaming-gate.js` is on the list (slices 1 and 2), `src/lib/streaming-precompute.js` and `src/lib/sufficiency-audit.js` are not, and no slice edits the one loaded hook, `src/hooks/protect-records.js`. The list's human-kind check runs only from edit hooks Claude Code does not load, and the crossing on recorded evidence checks no protected list. The owner approved this gate-logic change by his answer to q10 (`.ctoc/streaming/answers.jsonl` line 294).
5. **Overlaps with plans in the build queue, as technical-order facts:**
   - "The gate-critique fleet … improved three times" (`plans/todo/00370-every-agent-and-specialist-skill-improved-three-times-s110-gate-critic-and-lenses.md`) edits the body of `agents/iron-loop/gate-critic.md`, not its inventory. Whichever of it and slice 3 builds second re-reads both files and keeps the other's text.
   - "The classification brief for the gate critic carries the plan file modification time" (`plans/todo/ctoc-is-built-with-ctoc-the-classification-brief-for-the-gate-critic-carries-the-pla.md`) does not edit `agents/iron-loop/gate-critic.md` or the question rule (its decisions 6 and 8, read again in this pass). It shares only `CLAUDE.md` with slice 4.
   - "The operating lessons say CTOC is built with CTOC and friction is filed as a plan" is slice 4's dependency; lesson 23 is numbered after its lessons 21 and 22.
6. **`CLAUDE.md` measured 14,730 bytes on 2026-10-22** (ripgrep byte match). With the lesson plan's 256 bytes it leaves 14 bytes of room for a 188-byte line, so slice 4's expected path is its measured stop. Slice 4 defines that stop: a precondition checked before any edit, the executor's context-incomplete kickback, the measured size and bytes needed under its `## Execution Record`, and one question about making room. The executor reports an open question to the CTO Chief and does not file it (`agents/iron-loop/iron-loop-executor.md` line 183), so the kickback report carries the question, and the CTO Chief files it as slice 4's question, for the gate critic to classify through the normal classification. Scenario 12's "reports to the owner" is carried by that record and that question. The routing that follows:
   - Before slice 1 is built: in a classified file the question reaches the owner when it is `critical` or carries a weighty topic; a non-critical `detail` with one recommended option is settled by it.
   - After slice 1 is built: it reaches him only as one of the four kinds.
   - Removing a rule from `CLAUDE.md` is his, a cost or risk he must accept; moving text without losing a rule is a detail.
   - The build itself still shortens, moves or removes nothing. This is a reading of scenario 12's wording, named here; its text is unchanged.
7. **Adding this index moved this plan's specification hash**, as adding a slice index to a parent always does; the parent's own record (`advanced_by: "sufficiency"`, functional to implementation) no longer matches its text. Expected: the parent is an index and is not built itself.
8. **The refinement loop ran three critic rounds; round 3's three findings were applied in this final pass, and none needed the owner.** The one owner question, the inventory check of decision 1, is filed by the planner as the exit condition of this planning pass.
