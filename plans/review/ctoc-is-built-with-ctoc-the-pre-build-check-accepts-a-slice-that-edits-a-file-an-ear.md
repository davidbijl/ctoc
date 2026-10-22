---
title: "The pre-build check accepts a slice that edits a file an earlier slice creates"
created: "2026-10-20T13:37:49.348Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 9
risk_level: MEDIUM
files:
  - src/lib/plan-validator.js
  - src/lib/actions.js
  - src/lib/documented-counts.js
  - tests/plan-declares-count-moving-ratchets.test.js
---

# The pre-build check accepts a slice that edits a file an earlier slice creates

## Problem Statement
The pre-build check misreads edits. Reported: the check before a plan enters the build queue reads edits a file that an earlier slice creates as creates it, and refuses slices that depend on another slice's new file. Read, most likely cause only: at the move into the build queue, `validateForQueue` in `src/lib/plan-validator.js` calls `checkPlanDeclaresCountMovers` in `src/lib/documented-counts.js`, whose `movesDocumentedCount` treats any declared file of a counted kind (new test file, library module, hook, tab, agent or skill file) that is absent on disk as a file this plan creates, and then refuses the plan with the message that it will create the file but does not declare `CLAUDE.md`. So a slice that only edits a file an earlier, not-yet-built slice creates is refused, or is forced to declare a `CLAUDE.md` it does not need. Re-read by the vision advisor: `src/lib/plan-validator.js:1341` calls `checkPlanDeclaresCountMovers(declaredFiles, projectPath)` and `:1347` holds the refusal text. The refusal text seen on 2026-10-20 was not captured, so the first step reproduces the refusal and confirms which check produced it before any fix is built; if it is not this check, the plan is rewritten around the real one. Related but not covering it, because both fix the prose contradiction scan at completion, which is a different check: "The plan checker does not read a quotation as a claim that the plan creates a file" (`plans/functional/a-quotation-is-not-a-file-claim.md`) and "A method name in plan prose is not a missing file" (`plans/implementation/a-method-name-in-plan-prose-is-not-a-missing-file.md`). Disposition: new work. Done when a test through the real check accepts a slice that only edits a file an earlier slice creates, while a slice that really creates a counted file without declaring `CLAUDE.md` is still refused.

## Business Alignment

**Job to Be Done:** When a slice I am moving into the build queue only edits a file that an earlier slice it depends on brings into being, I want the check before the build queue to see that the earlier slice is the one that brings the file into being, so I can move the slice through the menu without declaring a `CLAUDE.md` it does not need and without the recorded "Approve anyway" override.

**Impact Map:**
- **Goal:** Every plan move the maintainers need is a menu route with usable output (the vision's first goal; it traces to the problem statement, where each friction pushed the coordinator off the menu).
- **Actor:** the planner and the coordinator who move implementation slices into the build queue: the CTO Chief's coordinator session and the background agents that build CTOC for the owner; after them, every CTOC user whose slices build on each other's files (the vision's target audience).
- **Impact:** a slice that only edits a file its predecessor brings into being crosses into the build queue on its first check through the menu, with no `CLAUDE.md` added only to satisfy the check and no "Approve anyway" override (the override is recorded as forced, `src/lib/actions.js:408-415`).
- **Deliverable:** the check before the build queue tells a slice that edits a file an earlier slice brings into being from a slice that brings the file into being itself; the refusal for the second kind stays word for word as it is today.

**Alignment checks:**
1. The goal traces to the vision's problem statement: YES.
2. The actor is in the vision's target audience: YES (the CTO Chief, the coordinator and the background agents; then every CTOC user whose slices build on each other's new files, named there).
3. The impact is observable: YES (the menu offers the move into the build queue, and its validation screen lists no refusal line for the file).
4. The deliverable is one functional area: YES (one check, at one move).

## User Stories

**Story 1 (investigation).** **As** the planner, **I want** the refusal reproduced on a pair of slices where the second only edits a file the first brings into being, **so that** the fix aims at the check that really refused.
- INVEST: Independent yes. Negotiable yes. Valuable qualified: its value is choosing the right fix. Estimable yes. Small yes. Testable yes (scenarios 1 and 2).

**Story 2.** **As** the planner, **I want** the check before the build queue to accept a slice that only edits a file an earlier, not-yet-finished slice in its `depends_on` chain brings into being, **so that** dependent slices are not refused or forced to declare a `CLAUDE.md` they do not need.
- INVEST: Independent qualified: ordered after story 1 inside this plan. Negotiable yes: it names the outcome, not the code. Valuable yes. Estimable yes. Small yes. Testable yes (scenarios 3 to 5).

**Story 3.** **As** the owner, **I want** the check to give that pass only when a not-yet-finished plan the slice really depends on declares the same file and `CLAUDE.md`, **so that** the rule "the slice that brings a counted file into being declares `CLAUDE.md`" still holds and a dependency list cannot be used to switch it off.
- INVEST: Independent qualified: it is the other half of the same check as story 2 and is built with it. Negotiable yes. Valuable yes: it keeps the protection the owner already has. Estimable yes. Small yes. Testable yes (scenarios 6 to 9).

## Decomposition

Source: `plans/decomposition/ctoc-is-built-with-ctoc.md`. Stories marked `[MVP]` are the smallest end-to-end version; there are no remaining stories in this plan, and no phase or schedule (the owner alone chooses what is built and when).

### Vision item carried
- "The pre-build check misreads edits."

### Goal: Every plan move the maintainers need is a menu route with usable output
- **Actor:** the owner and the CTO Chief, coordinator session and background agents that build CTOC through its menu; after them, every CTOC user on the same routes.
- **Impact:** the coordinator moves plans through the menu without `node -e` calls into `src/lib/actions` or scratch scripts.
- **Success metric:** this plan has a test that drives the real check, and no by-hand workaround (such as declaring an unneeded `CLAUDE.md`) is needed for a dependent slice.

### Activities
1. Reproduce the refusal and confirm its cause.
2. Move a slice that edits an earlier slice's new file into the build queue.

### Stories
- [x] `[MVP]` Spike: As the planner, I want the refusal reproduced on a pair of slices where the second only edits a file the first creates, so that the fix aims at the check that really refused.
  - Acceptance: the plan records the exact refusal text and the function that produced it; if it is not `checkPlanDeclaresCountMovers` in `src/lib/documented-counts.js` (called at `src/lib/plan-validator.js:1341`), the plan is rewritten around the real check before any build step.
  - INVEST: passes as a time-boxed investigation; Valuable is qualified, because its value is choosing the right fix.
- [x] `[MVP]` As the planner, I want the check before the build queue to accept a slice that only edits a file an earlier, not-yet-built slice creates, so that dependent slices are not refused or forced to declare a `CLAUDE.md` they do not need.
  - Acceptance: through `validateForQueue`, a slice that depends on the creating slice and declares that file is accepted without declaring `CLAUDE.md`; a slice that really creates a counted file and omits `CLAUDE.md` is still refused with today's message.
  - INVEST: passes; Independent is qualified, because it is ordered after the investigation inside this plan.

### Dependencies
- Story level: the fix depends on the reproduced refusal.
- Plan level: none.
- Related but not covering it (both fix the prose contradiction scan at completion, a different check): "The plan checker does not read a quotation as a claim that the plan creates a file" (`plans/functional/a-quotation-is-not-a-file-claim.md`) and "A method name in plan prose is not a missing file" (`plans/implementation/a-method-name-in-plan-prose-is-not-a-missing-file.md`).
- Shared file (a scheduling concern, not a dependency): `src/lib/plan-validator.js`, possibly with "Surviving mutants from mutation testing have a recorded place in the plan" if that plan chooses a validator check.

## Acceptance Criteria

Words used below. A **counted file** is a declared path of one of the six kinds the check counts: a test file `tests/<name>.test.js`, a library module `src/lib/<name>.js`, a hook `src/hooks/<name>.js`, a tab `src/tabs/<name>.js`, an agent file `agents/**/*.md`, or a skill file `skills/**/*.md` (`src/lib/documented-counts.js:63-75`). **Not yet finished** means the plan sits in technical planning (`plans/implementation/`), the build queue (`plans/todo/`), the build (`plans/in-progress/`) or review (`plans/review/`). The **validation screen** is the menu's `validate implementation/<slice>.md` screen, which lists each refusal on a line starting with `✗` (`src/lib/menu-screens.js:2094-2146`). **Today's refusal** is, word for word, `Plan will create "<path>" (moves the <count kind> count, currently <n>) but does not declare "CLAUDE.md" in its files:. Add "CLAUDE.md" so the build can update the documented count.` (`src/lib/plan-validator.js:1344-1348`). Every scenario runs in a scratch copy of a project, never in the real plan folders.

### Story 1: reproduce the refusal

- [x] **Scenario 1: The refusal is reproduced and its source is recorded**
  Given slice one, in technical planning, declares `tests/widget-rules.test.js` and `CLAUDE.md`, and that test file is not on disk
  And slice two, in technical planning, names slice one in `depends_on` and declares only `tests/widget-rules.test.js`
  When the validation screen for slice two is opened
  Then the screen lists a `✗` refusal line for `tests/widget-rules.test.js`
  And this plan records, before any build step, that line word for word, the function that produced it, and that no other check run at the move into the build queue refuses the pair

- [x] **Scenario 2: A different source rewrites the plan before any build**
  Given the line recorded in scenario 1 came from a function other than `checkPlanDeclaresCountMovers` in `src/lib/documented-counts.js` (called at `src/lib/plan-validator.js:1341`), or no refusal appeared
  When the investigation ends
  Then this plan is rewritten around what was actually seen before any build step starts
  And no build step of stories 2 and 3 starts on the unrewritten text

### Story 2: accept a slice that edits its predecessor's file

- [x] **Scenario 3: A slice that edits its predecessor's file moves into the build queue**
  Given slice one sits in the build queue with the approval block its crossing put at the top of its file, and declares `tests/widget-rules.test.js` and `CLAUDE.md`, and that test file is not on disk
  And slice two, in technical planning, names slice one in `depends_on` and declares `tests/widget-rules.test.js` without `CLAUDE.md`
  When the validation screen for slice two is opened
  Then the screen lists no `✗` line naming `tests/widget-rules.test.js`
  And slice two's plan screen in the menu offers its move into the build queue, and taking that move puts slice two in `plans/todo/`

- [x] **Scenario 4: The predecessor has not crossed into the build queue yet**
  Given slice one is still in technical planning and declares `tests/widget-rules.test.js` and `CLAUDE.md`, and that test file is not on disk
  And slice two names slice one in `depends_on` and declares `tests/widget-rules.test.js` without `CLAUDE.md`
  When the validation screen for slice two is opened
  Then the screen lists no `✗` line naming `tests/widget-rules.test.js`

- [x] **Scenario 5: The file comes from a slice further up the chain**
  Given slice one, in the build queue, declares `tests/widget-rules.test.js` and `CLAUDE.md`, and that test file is not on disk
  And slice two names slice one in `depends_on` and does not declare the test file
  And slice three names only slice two in `depends_on` and declares `tests/widget-rules.test.js` without `CLAUDE.md`
  When the validation screen for slice three is opened
  Then the screen lists no `✗` line naming `tests/widget-rules.test.js`

### Story 3: give that pass only when it is earned

- [x] **Scenario 6: A slice that really brings a counted file into being is still refused with today's message**
  Given a slice in technical planning declares `src/lib/widget-rules.js` without `CLAUDE.md`, that module is not on disk, and no plan in its `depends_on` chain declares it
  When the validation screen for that slice is opened
  Then the screen lists today's refusal for `src/lib/widget-rules.js`, word for word, with the library-module count kind
  And the slice's plan screen does not offer its move into the build queue

- [x] **Scenario 7: A dependency list that reaches no plan declaring the file gives no pass**
  Given slice one, under the same parent plan as slice two, declares `tests/widget-rules.test.js` and `CLAUDE.md`, and that test file is not on disk
  And slice two declares `tests/widget-rules.test.js` without `CLAUDE.md`, and its `depends_on` is, in turn, each of these five:
  (a) `none`;
  (b) a name that no plan in any stage carries;
  (c) a name with a folder part, `../outside/slice-one`, whose last part is slice one's name on purpose: a name with any folder part gives no pass, even when its last part names a real plan that declares the file;
  (d) the name of a real plan in technical planning that does not declare the test file;
  (e) slice four, whose own `depends_on` names slice two back and which does not declare the test file
  When the validation screen for slice two is opened in each of the five cases
  Then each of the five screens lists today's refusal for `tests/widget-rules.test.js`, and the screen appears in every case

- [x] **Scenario 8: A finished predecessor whose file is missing gives no pass**
  Given slice one is in `plans/done/` and declares `tests/widget-rules.test.js` and `CLAUDE.md`, but that test file is not on disk
  And slice two names slice one in `depends_on` and declares `tests/widget-rules.test.js` without `CLAUDE.md`
  When the validation screen for slice two is opened
  Then the screen lists today's refusal for `tests/widget-rules.test.js`

- [x] **Scenario 9: A predecessor that does not declare CLAUDE.md is named in the refusal**
  Given slice one, in the build queue, declares `tests/widget-rules.test.js` but not `CLAUDE.md`, and that test file is not on disk
  And slice two names slice one in `depends_on` and declares `tests/widget-rules.test.js` without `CLAUDE.md`
  When the validation screen for slice two is opened
  Then the screen lists one `✗` line that names `tests/widget-rules.test.js`, slice one's file name and `CLAUDE.md`, and says that slice one, not slice two, brings the file into being without declaring `CLAUDE.md`
  And slice two's plan screen does not offer its move into the build queue

## Scope

### In Scope
- Reproducing the refusal on a constructed pair of slices, and recording its exact text and the function that produced it before any build step (scenarios 1 and 2).
- The check before the build queue giving no refusal for a counted file when the slice's `depends_on` chain, direct or through further slices, reaches a not-yet-finished plan that declares the same file and `CLAUDE.md`, including a predecessor that already carries its approval block (scenarios 3, 4 and 5).
- Today's refusal, word for word, for a slice that brings a counted file into being itself (scenario 6).
- No pass from a dependency list that does not safely reach such a plan: `none`, unknown names, folder climbs, unrelated plans, cycles, and a finished predecessor whose file is missing (scenarios 7 and 8).
- A refusal that names the predecessor when the predecessor declares the file without `CLAUDE.md` (scenario 9).

### Out of Scope
- The prose contradiction scan at completion, a different check: it belongs to "The plan checker does not read a quotation as a claim that the plan creates a file" (`plans/functional/a-quotation-is-not-a-file-claim.md`) and "A method name in plan prose is not a missing file" (`plans/implementation/a-method-name-in-plan-prose-is-not-a-missing-file.md`).
- Which kinds of file are counted, and the rule that the plan bringing a counted file into being declares `CLAUDE.md`: not planned; this plan keeps both as they are.
- Deleted files and glob declarations, blind spots 2 and 4 in the header of `src/lib/documented-counts.js`: not planned in this plan; the header keeps stating them.
- A new marker in `files:` that names the slice bringing a file into being: not planned; considered and rejected (Decisions).
- The static queue audit in `tests/plan-declares-count-moving-ratchets.test.js` (its `describe` block "10"): not planned to change; it keeps today's behaviour, and a dependent slice in the build queue may show there as an informational entry, which fails nothing.
- The "Approve anyway" override: not planned to change.
- Sending a plan in the build queue back to technical planning: it belongs to "A plan in the build queue can be sent back to technical planning and keeps its title".

## Risks

### Technical Risks
- Wrong check fixed: the refusal seen on 2026-10-20 was not captured, so it may have come from another check.
  - Likelihood: LOW. Read, not run: the only refusal in `validateForQueue` that reads declared files is the count-mover check (`src/lib/plan-validator.js:1308-1360`), and the existing test case "7: Gate 2 actually blocks" in `tests/plan-declares-count-moving-ratchets.test.js` shows that check refusing a counted file that is not on disk.
  - Impact: MEDIUM. The plan is rewritten around the real check.
  - Mitigation: Reproduce first (story 1) and record the text and the function before any build step.
- A predecessor in the build queue is read as declaring nothing. Its crossing puts an approval block at the top of the file, and a reader that sees only the first block finds no `files:` and no `depends_on`. This trap is already recorded twice: the comment at `src/lib/plan-validator.js:1336-1337` and the comment in `listSubplans` at `src/lib/actions.js:2682-2687`.
  - Likelihood: MEDIUM.
  - Impact: MEDIUM. The false refusal stays for the most common case, where slices cross in dependency order.
  - Mitigation: Test the stamped predecessor (scenario 3) and read every predecessor through the reader that merges all frontmatter blocks.
- `depends_on` is text from a plan file and can name anything. Following it unsafely would let a plan make the check read files outside the plan folders.
  - Likelihood: LOW. A guard already exists: `isSafePlanSlug` (`src/lib/actions.js:1529`) refuses a name that carries a folder separator. `planSlugExists` (`src/lib/plan-validator.js:1390-1414`) is the wrong rule for a dependency name: it strips the folder part with `path.basename` and then matches, so `../outside/slice-one` would match a real `slice-one`.
  - Impact: MEDIUM. It would turn the check into a probe for whether a file exists and what it declares, or let a crafted name borrow another plan's declarations.
  - Mitigation: Give no pass for any name that fails `isSafePlanSlug`, match the remaining names only against plan file names inside the plan stage folders, and test case (c) of scenario 7, whose name collides with a real plan on purpose.
- A predecessor is revised after slice two crossed and stops declaring the file. Slice two's build then brings the file into being without `CLAUDE.md`.
  - Likelihood: LOW.
  - Impact: LOW. The module header of `src/lib/documented-counts.js` names `tests/doc-counts.test.js` as the check of the documented counts at the quality check (believed from the header, not run), so the build stops there and the slice is revised.
  - Mitigation: Record this gap in the implementation plan so the reviewer knows where it is caught.
- Existing direct callers break. `checkPlanDeclaresCountMovers` is also called directly by the static audit (`tests/plan-declares-count-moving-ratchets.test.js:207`) and by `tests/remainder-plan-pipeline-coverage.test.js:296`.
  - Likelihood: MEDIUM.
  - Impact: LOW.
  - Mitigation: Keep every existing case in both files passing unchanged; weaken no assertion.

### Business Risks
- Gate logic changed without the owner's explicit approval. The check before the build queue is gate logic, and the repository's `CLAUDE.md` says gate logic changes only with his explicit approval.
  - Likelihood: LOW, because it is put to him as the one question below.
  - Impact: MEDIUM. A change built without approval is reverted.
  - Mitigation: Hold every build step of stories 2 and 3 until the owner answers that question. The investigation in story 1 changes no code and may run before the answer.

### Dependency Risks
- Shared file `src/lib/plan-validator.js`. It is also declared under `files:` by "The plan checker does not read a quotation as a claim that the plan creates a file" and "A method name in plan prose is not a missing file" (verified: pattern `plan-validator\.js` over those two plan files, one match in each `files:` list). It may also be declared by "Surviving mutants from mutation testing have a recorded place in the plan", if that plan picks a validator check.
  - Likelihood: MEDIUM.
  - Impact: LOW. A merge conflict, not a behaviour clash: those plans change the prose scan at completion, and this one changes the check before the build queue.
  - Mitigation: Keep them from editing the file at the same time; the owner picks the order.

## Priority

**Priority: MEDIUM** (Score: 6/9)
- Dependency: 2. No other stub depends on this one and it depends on none, so it runs in parallel with its siblings. The shared `src/lib/plan-validator.js` is a sequencing concern, not a dependency.
- Business Impact: 2. It supports the vision's primary goal as one of ten frictions. A refused slice is not stuck today, only routed around: by declaring `CLAUDE.md`, or by the recorded "Approve anyway" override.
- Technical Risk: 2. Moderate: the check reads other plans' frontmatter across stages, past the approval block, from an untrusted `depends_on`.

## Questions for the Owner

### Should the check before the build queue stop refusing a slice that only edits a file an earlier slice it depends on brings into being?

- **Proposed topic:** security posture. The gate critic classifies it; nothing here is a classification.
- **Why it matters:** this check runs at the move into the build queue, so changing it is gate logic, and gate logic changes only on your explicit approval. Today it refuses any slice that declares a counted file not yet on disk unless the slice also declares `CLAUDE.md`. So a slice that only edits a file an earlier, unbuilt slice brings into being is refused, or carries an edit permission on `CLAUDE.md` it never uses. The vision lists "A pre-build check that tells an edit of an earlier slice's new file from a creation" under what we are building; its approval record says the pipeline advanced it after decomposition (`advanced_by: pipeline`), so it is not your recorded approval of this change. This question settles the change to the check itself. The acceptance criteria assume the recommended option.
- **a) Give the pass through the `depends_on` chain. Recommended.**
  - Pros: The slice that brings the file into being must still declare `CLAUDE.md`, so the count rule holds. It uses `depends_on`, which slices already carry, for example the README slices chained one after the other, so no plan format changes. A dependent slice no longer holds an unused permission to edit `CLAUDE.md`.
  - Cons: The check starts reading other plans' frontmatter, so a reading mistake could wrongly pass or refuse; the approval block and unsafe names are the known traps (Risks above). It changes gate logic.
  - Recommendation: Recommended. It keeps the protection, removes the unused permission and the by-hand workaround, and changes no plan format. Evidence strength: read from source (`src/lib/documented-counts.js:119-123`, `src/lib/plan-validator.js:1340-1352`), not run; reproducing the refusal on a pair of slices, the first build step, runs it.
- **b) Keep today's refusal, and dependent slices declare `CLAUDE.md`.**
  - Pros: No gate-logic change, so nothing new can go wrong in the check. The fence stays exactly as built and tested.
  - Cons: Every dependent slice carries an edit permission on `CLAUDE.md` it does not use, which widens what its build may write. The refusal keeps saying a slice "will create" a file it only edits. The by-hand workaround named in the vision stays.

New ideas in this question, for you to check:
- The rule that the predecessor must also declare `CLAUDE.md`, and that a refusal names the predecessor when it does not, is the Product Owner's addition; the decomposition said only that the dependent slice is accepted.
- Counting a predecessor reached through a chain of dependencies, not only a direct one, is the Product Owner's choice; see Decisions.

**a)** Give the pass through the `depends_on` chain. Recommended.
**b)** Keep today's refusal; dependent slices declare `CLAUDE.md`.

Reply with a letter.

## Decisions Taken Under Ambiguity

1. **The signal is the `depends_on` chain.** The stub's own acceptance line chose it ("a slice that depends on the creating slice and declares that file is accepted"). A per-line marker in `files:` naming the slice that brings each file into being was considered and rejected: it is a new plan format every planner, template and agent must learn, and the check would still have to open the named slice to confirm it, so it needs the same reading as the dependency chain and adds nothing.
2. **A chain counts, not only a direct dependency.** Slices are often chained one after the other: the README slices each name only the slice before them, for example `plans/todo/00384-the-readme-matches-the-product-today-s3-pipeline-copy-captures-and-walks.md` names only the second slice. A direct-only rule would leave the friction in place for the third slice of such a chain. Any cycle in the chain must end the walk with no pass (scenario 7, case e).
3. **"Not yet finished" is technical planning, build queue, build or review.** Review is included because a build in a separate worktree may not have reached the checkout the check reads. A finished predecessor is excluded: its file should be on disk, and if it is missing, this slice brings it into being (scenario 8). Functional and vision plans are excluded because they bring no file into being themselves; their slices do.
4. **The predecessor must declare both the file and `CLAUDE.md`.** Otherwise slice two is refused with a line that names the predecessor (scenario 9). That line tells the truth about which slice lacks the permission, instead of today's claim that slice two will create the file. This adds one refusal text; today's text is unchanged for every other case.
5. **Today's refusal is kept word for word, with no added hint.** The stub's acceptance line requires it. Slices already carry `depends_on` for build order, so the pass needs no new habit from planners.
6. **An unsafe or unknown dependency name gives no pass, and it never breaks the check.** The scheduler refuses a plan whose dependency list is unreadable (`taskSpecFromPlan`, `src/lib/actions.js:2051-2066`). At the move into the build queue, this plan only withholds the pass and leaves the refusal, if any, to today's text. A slice with no counted file is not newly refused for an odd `depends_on`.
7. **The validation screen is the observable outcome.** The Then clauses use the menu's `validate implementation/<slice>.md` screen and the plan screen. The plan screen withholds the approve option when validation fails (`src/lib/streaming-gate.js:1659-1674`). Both are real menu routes, never a structure snapshot.
8. **New test cases go into the existing `tests/plan-declares-count-moving-ratchets.test.js`.** A separate test file would itself be a counted file and would need `CLAUDE.md` in the implementation slice. This is a note for the implementation planner, who may decide otherwise and declare `CLAUDE.md`.
9. **Story 2 of the decomposition is split into stories 2 and 3,** so that each story has two to five scenarios. Nothing was added to the decomposition's acceptance except scenario 9 and the chain rule, both listed in the question's new-ideas block.
10. **The owner question is in this plan, and no questions file or status file was written.** The brief allows edits to this plan file only. The agent file's last-act questions file under `.ctoc/streaming/questions/pending/` was therefore not written, and no `.status` file exists beside this plan (Glob of the plan name found only the `.md`). The CTO Chief turns the question into the streamed question.
11. **Priority stays MEDIUM** by the scoring above (6 of 9). Priority is the Product Owner's call; the owner alone schedules.
12. **Searches behind the claims above.**
    - Pattern `checkPlanDeclaresCountMovers|movesDocumentedCount` over the worktree, excluding `plans/`: 4 files. They are `src/lib/documented-counts.js`, `src/lib/plan-validator.js` (the only call under `src/`, at `:1341`), `tests/plan-declares-count-moving-ratchets.test.js` and `tests/remainder-plan-pipeline-coverage.test.js`.
    - Pattern `validateForQueue|validateTransition\(` over `src/`: 5 files. The check before the build queue is reached through `validateTransition` (`src/lib/plan-validator.js:1252`) from `approvePlan` (`src/lib/actions.js:447`), `pendingGateDecisions` (`src/lib/streaming-gate.js:1079`), the plan screen (`src/lib/streaming-gate.js:1664`) and the validation screen (`src/lib/menu-screens.js:2126`). These matches show where the names are written. They do not show which routes ran on 2026-10-20; scenario 1 runs one.
13. **No instruction in the stub, the vision or the decomposition asked for anything beyond this refinement.** None was acted on.

Decisions 14 to 29 were taken by the implementation planner while writing the technical plan below.

14. **The owner's answer is settled.** He chose "Give the pass through the dependency chain" for the question above (answer recorded on 2026-10-20 in `.ctoc/streaming/answers.jsonl`, question `q10-dependent-slice-count-check-pass`, option 1). Stories 2 and 3 are therefore built. The two Product Owner additions that rode with that option, the chain rule and the refusal that names the predecessor, are built as written.
15. **The pass lives in `validateForQueue` in `src/lib/plan-validator.js`, not in `src/lib/documented-counts.js`.** The validator already holds every reader the walk needs (`parseMetadata`, `extractFrontmatterRegion`, `parseFilesField`, imported at `plan-validator.js:10-12`) and already scans the plan stage folders (`planSlugExists`, `:1390-1414`). `checkPlanDeclaresCountMovers` stays a pure per-path check, so its two direct callers, the static queue audit (`tests/plan-declares-count-moving-ratchets.test.js:207`) and `tests/remainder-plan-pipeline-coverage.test.js:296`, keep today's behaviour exactly, as the Out of Scope list requires.
16. **`isSafePlanSlug` moves, unchanged, from `src/lib/actions.js:1520-1533` into `src/lib/plan-validator.js`, which exports it; `actions.js` imports it from there.** `actions.js:27` already requires `plan-validator.js` at load time, so the validator cannot require `actions.js` at top level. A lazy require would pull the whole action layer (the iron loop, background status, the task registry) into every validation. A copy of the regular expression would let the two guards drift apart, which the comment at `actions.js:1969-1974` forbids. One definition with two users is the only option without either fault. Its four callers in `actions.js` (`:1155`, `:1567`, `:1578`, `:1990`) keep calling the same function. The new export has a live caller in `src/` (`actions.js`), so `tests/export-reachability.test.js` stays green.
17. **The walk follows only plans that are not yet finished.** A dependency name is looked up only among the `.md` file names in `plans/implementation/`, `plans/todo/`, `plans/in-progress/` and `plans/review/`. A name found only in `done/`, `functional/`, `vision/`, `canvas/` or nowhere ends that branch of the walk: it gives no pass and its own `depends_on` is not followed. This is stricter than following every link. A finished plan was built after everything it depended on, so walking past it reaches only history. It also keeps the walk small.
18. **Names are matched exactly and case-sensitively against file names read from the four folders.** A name ending in `.md` (`slice-one.md`) is not accepted. The scheduler builds `<name>.md` from the same token (`actions.js:2079-2080`), so such a dependency list already breaks the build order. Exact matching behaves the same on every operating system, including on file systems that ignore case.
19. **The `depends_on` value is split exactly as the scheduler splits it:** on whitespace or commas, with `none` dropped (`planDependsOn`, `actions.js:1980-1994`). A block-list value arrives from `parseMetadata` as an array, and `String()` of it joins with commas. The check and the build order therefore read the same list. `parseDependsOn` (`actions.js:2659-2664`, commas only) is not used.
20. **One earning predecessor is enough.** If several plans in the chain declare the file, the pass is given when any of them also declares `CLAUDE.md`. When none does, the refusal names the first one that declares the file, in breadth-first order from the slice.
21. **A plan name present in two of the four folders resolves to the first folder in the order implementation, build queue, build, review.** That is a stale duplicate, which the residency checks report elsewhere. This check only needs a deterministic rule.
22. **Paths are compared exactly after turning `\` into `/`,** the same normalisation `documented-counts.js:78-80` applies to the slice's own paths. A predecessor that declares the file only through a glob gives no pass (blind spot 4 stays as it is).
23. **A pass adds no warning line to the validation screen.** It is recorded in `checklist.countMovers.coveredByPredecessor` as `{ path, plan }`, so a reviewer or a test can see why no refusal was given. The validation screen of a clean dependent slice then reads "All checks passed."
24. **Scenario 1 is recorded from the red run, not kept as a test.** Scenario 1 (refused today) and scenario 4 (accepted after the fix) use the same pair of slices. A permanent test asserting today's refusal would have to be deleted once the fix lands. So the Step 8 red run of the scenario-4 test is the reproduction, and the builder copies the observed line into this plan before Step 10 starts (see "Reproduction record" below). Scenario 1's "before any build step" is read as "before Step 10". Scenario 2's own wording ("no build step of stories 2 and 3 starts") supports that reading, and Steps 8 and 9 change no product code: they only write tests and this record. The builder may write this record because `src/hooks/PreToolUse.Edit.js:77` always allows writes to `plans/**/*.md`.
25. **Correction to Risks: today's crossing merges the approval marker; it no longer prepends a block.** `addApprovalMarker` (`actions.js:266-283`) merges `approved_by`, `approved_at` and `gate_crossed` into the plan's one frontmatter block through `upsertMarkerFields` (`src/lib/frontmatter-merge.js`). The comments at `plan-validator.js:1335-1337` and `actions.js:2682-2687` describe the older, prepended shape, which plans stamped before that change still carry. The walk reads both shapes through the merging readers, and the tests cover both: scenario 3 crosses the predecessor through the real menu (merged shape), and a second case writes the older prepended shape.
26. **Correction to Risks: `tests/doc-counts.test.js` catches a missed `CLAUDE.md` permission only for hooks and tabs.** It compares the `CLAUDE.md` text with the disk only for those two fixed counts (`tests/doc-counts.test.js:102-136`). The four growing counts (test files, library modules, agents, skills) are rewritten into `CLAUDE.md` by the release script (`release.js` in the `src/scripts/` folder) and are never compared with the text (`tests/doc-counts.test.js:14-20`, `:91-100`; `tests/doc-counts-generated.test.js:1-18`). For those four kinds, nothing fails at the quality check; the number is corrected at the next release. See "Risks found in technical planning".
27. **New test cases go into the existing `tests/plan-declares-count-moving-ratchets.test.js`,** as Decision 8 proposed. Every declared file already exists, so this plan is no count mover and declares no `CLAUDE.md`. That was checked against the very rule this plan changes.
28. **`src/lib/documented-counts.js` changes in comments only (Step 15).** Its header says "checked at Gate 2" and gives the creation trigger; one paragraph is added saying that the gate withholds the refusal for a path an earlier, not-yet-finished slice in the `depends_on` chain declares together with `CLAUDE.md`, and naming where that happens. No code in that file changes.
29. **The question file for this plan is an empty list.** The only owner fork, whether to change this gate at all, is answered (Decision 14). Where the guard lives, how the walk runs and the refusal wording are quality decisions taken here, not owner decisions.
30. **The reproduction record is written in the Execution Record, not under "Reproduction record" in Implementation Details.** The approval record covers everything in Implementation Details, so writing there would break the plan's approval. The record sits in a fenced block under `### Reproduction record (observed in Step 8)` inside `## Execution Record (Steps 8–16)` at the end of the plan, which the approval digest excludes. Same content, as Decision 24 requires.
31. **Fix round after review and security (Step 13 warn): the walk is bounded and never throws; this corrects the plan's claims.** The Security review line "Four folder listings bound its size", the JSDoc line "this never throws" and the Error handling line "`validateForQueue` therefore cannot throw from the walk" were not true as first built: a predecessor whose `depends_on` listed 120,000 to 200,000 names made `queue.push(...names)` throw a RangeError (the validation screen crashed), and `queue.shift()` made the walk quadratic (400,000 unknown names took 9.4 s). The listings bound the number of plans, not the length of a dependency list. Built now: the queue is walked by index, a name is pushed one at a time and only when it is a plan in the four folders and not yet seen (marked seen when pushed), so the queue never holds more than the number of plan files. Order stays breadth-first (cases 11h, 11i, 11m hold). Test 11n.
32. **A finished plan ends a branch even when a stale copy of the name sits in an unfinished folder.** The walk now also lists `plans/done` and drops any name found there, as the scheduler's rule does (it sees `done/<name>.md` and gives no blocker). Test 11o. A review predecessor whose file is missing stays as Decision 3 says.
33. **An unsafe dependency token withholds the pass; this supersedes Decision 6's "dropped silently" (security wins: fail closed where the scheduler fails closed).** If any token other than `none` fails `isSafePlanSlug`, `dependencyNames` returns null. For the slice's own list the walk returns no predecessor. For a predecessor's own list the predecessor is left out entirely: it neither earns the pass nor is its chain walked, because the scheduler refuses its whole list, so it can never be queued or built. The change list said "do not follow a predecessor whose own list has such a token"; leaving it out entirely is the stricter reading, chosen because a plan that can never build cannot be the one that brings the file into being. Tests 11p (a to e). Decision 6's second sentence still holds: a slice with no counted file is not newly refused for an odd `depends_on` (11k).
34. **Step 13's named attacks are pinned.** `slice-one/../slice-one` and a name holding a NUL character each give no pass (11q); they were green before and after the fix.

## Implementation Details

### What the source says today (read on the main checkout, 2026-10-20; nothing run)

- **The move into the build queue runs one validator.** `validateTransition` maps `implementation->todo` to `validateForQueue` (`src/lib/plan-validator.js:1252`, dispatched at `:1262`). `validateForQueue` (`:1308-1360`) has exactly two refusals: a missing `# ` title (`:1325-1329`) and the count-mover refusal (`:1340-1352`). The parent-plan check only adds warnings (`:1357`, `:1371-1375`). `approvePlan` adds one more refusal of its own, an approval record that cannot be keyed, for a file name outside `[a-z0-9-]` (`actions.js:478-491`). The test fixtures use lowercase hyphenated names, so it never fires there.
- **The count-mover refusal.** `checkPlanDeclaresCountMovers(declaredFiles, projectRoot)` (`src/lib/documented-counts.js:144-174`) marks every declared path that matches a counted kind (`:63-75`) and is absent on disk (`movesDocumentedCount`, `:119-123`). It returns `ok: false` unless the same list declares `CLAUDE.md` (`:172`). It never looks at any other plan. `validateForQueue` turns each offender into today's refusal text (`plan-validator.js:1344-1349`).
- **The readers.** `extractFrontmatterRegion` (`src/lib/stale-detector.js:227-260`) joins every leading frontmatter block. `parseFilesField` (`:344-399`) reads `files:` from that region. `parseMetadata` (`src/lib/state.js:233-250`) reads the same merged region, including block lists (`:178-202`).
- **The guard.** `isSafePlanSlug` (`actions.js:1529-1533`) accepts only `[A-Za-z0-9._-]+` with no `..`. It is not exported (`actions.js:2826-2868`). `planSlugExists` (`plan-validator.js:1390-1414`) compares `path.basename` of the name and is therefore not used here: it would let `../outside/slice-one` match a real `slice-one`.
- **The scheduler's dependency rule.** `taskSpecFromPlan` (`actions.js:2027-2098`) blocks a plan on the live task of each dependency. A dependency with no task that is not in `done/` or `review/` makes it refuse to queue the plan (`:2068-2089`). A dependent slice can therefore never be built before the slice it names has finished building.

### Reproduction record (story 1; observed in Step 8, before Step 10)

**Predicted (read from `plan-validator.js:1344-1349` and `doc-counts.js:38`, 84; not run).** The sandbox of test 11a holds no `tests/` folder, so `computeDocCounts(root).testFiles` is 0. Slice two's validation screen (`menu-screens.js:2136-2140` prints each error as two spaces, `✗`, a space and the text) should then show exactly one line:

```
  ✗ Plan will create "tests/widget-rules.test.js" (moves the testFiles count, currently 0) but does not declare "CLAUDE.md" in its files:. Add "CLAUDE.md" so the build can update the documented count.
```

The producer would be `validateForQueue` (`plan-validator.js:1340-1352`) from the offender `checkPlanDeclaresCountMovers` returns. Slice one's own screen should show no `✗` line, because it declares `CLAUDE.md`.

**What Step 8 records here.** Before Step 10, the builder adds a sub-heading "Observed in Step 8" under this heading. It holds the `✗` lines the red run of test 11a printed for slice two, copied word for word inside a fenced code block (never as prose, so the plan's own completion check does not read the quoted path as a claim), the producing function, and the `✗` lines of slice one's screen. If the observed line differs from the prediction in anything other than the count number, or comes from anything other than `validateForQueue`'s count-mover branch, or if another `✗` line appears for either slice (scenario 2), the builder stops before Step 10. It writes the observed lines here, then ends its build task with `menu task fail <id> --summary "<one line naming what differed>"` (the route is listed in `src/commands/start.md:138`; `--summary` is parsed at `menu-screens.js:2265` and stored at `:2603-2604`). The builder never moves the plan file by hand. Taking the plan back to technical planning so it can be rewritten around the observed check is the coordinator's call, through whatever route the menu then offers; sending a plan back from the build stages is itself a friction filed under this vision. Stories 2 and 3 are not built on the unrewritten plan.

### Architecture decision

The pass is a filter on today's offenders, applied in `validateForQueue` only when today's check already refuses (`countCheck.ok === false`). A slice that declares `CLAUDE.md`, or declares no absent counted file, reads no other plan, so the clean path does no extra disk reads, as before. For each offender the gate asks one question: does a not-yet-finished plan reachable through `depends_on` declare this exact path? There are three answers:

1. Some such plan also declares `CLAUDE.md`: no refusal for this path, and the pass is recorded in the checklist.
2. Some such plan declares the path without `CLAUDE.md`: the predecessor refusal, which names that plan (scenario 9).
3. None does: today's refusal, word for word (scenarios 6, 7, 8).

Offenders are decided one by one, so a slice with one covered path and one path it really brings into being is still refused for the second.

### Dependency graph

```
src/commands/start.js:948,966 --route()--> src/lib/menu-screens.js:route (3345)
   'validate <ref>' (3442-3453) --> validateScreen (2094) --> plan-validator.validateTransition (1238)
   'plan <ref>'     (3431-3436) --> streaming-gate.planDecisionScreen (1569) --> validateTransition (1664)
   'stream approve' (3378)      --> streaming-gate.streamApprove (2297) --> actions.approvePlan (422) --> validateTransition (447)
   streaming-gate.pendingGateDecisions (1057) --> validateTransition (1079)
plan-validator.validateTransition --'implementation->todo'--> validateForQueue
validateForQueue --> documented-counts.checkPlanDeclaresCountMovers   (unchanged)
validateForQueue --> unfinishedPredecessors (new, internal) --> dependencyNames (new, internal) --> isSafePlanSlug (moved here)
unfinishedPredecessors --> safe-fs.readdirSync/readFileSync, state.parseMetadata, stale-detector.extractFrontmatterRegion + parseFilesField
actions.js --imports--> plan-validator.isSafePlanSlug   (was local; same function)
tests/plan-declares-count-moving-ratchets.test.js --drives--> menu-screens.route (validate, plan, stream approve)
```

No require cycle appears: `plan-validator.js` gains no `require`, and `actions.js` already required `plan-validator.js` (`:27`).

### File specifications

#### File: `src/lib/plan-validator.js`
**Action:** MODIFY. **Purpose:** the check before the build queue gives the pass through the `depends_on` chain. **Change type:** new internal functions, a moved function, and a change to an existing function.

1. **Moved here, then exported:** `isSafePlanSlug(slug: *) → boolean`, byte-identical body from `actions.js:1529-1533`, with its JSDoc from `actions.js:1520-1528`. The JSDoc's "Shared by" line gains a third user: "and `unfinishedPredecessors` here (gives no pass)". Place it above `planSlugExists` (`:1377`). Add `isSafePlanSlug` to `module.exports` (`:1675-1689`).
2. **New constant (internal):** `const UNFINISHED_STAGES = Object.freeze(['implementation', 'todo', 'in-progress', 'review']);`. Its JSDoc says these are the stages whose plans can still bring a declared file into being.
3. **New function (internal, not exported):**
   ```js
   /**
    * The dependency names in a depends_on value, split as the scheduler splits them
    * (actions.planDependsOn: whitespace or commas; `none` dropped). Every name
    * isSafePlanSlug refuses is dropped too: an unsafe name gives no pass and is never
    * looked up. Pure; never throws.
    * @param {*} raw - parseMetadata(content).depends_on (string, array, number, boolean or undefined)
    * @returns {string[]}
    */
   function dependencyNames(raw) {
     if (raw === undefined || raw === null) return [];
     return String(raw).split(/[\s,]+/).filter((s) => s.toLowerCase() !== 'none' && isSafePlanSlug(s));
   }
   ```
   The empty strings `split` can produce fail `isSafePlanSlug`, so no separate filter is needed.
4. **New function (internal, not exported):**
   ```js
   /**
    * The not-yet-finished plans a plan's depends_on chain reaches, directly or through
    * further not-yet-finished plans, in breadth-first order, each with its declared files.
    * A name is resolved ONLY against `.md` file names read from the four UNFINISHED_STAGES
    * folders (first folder wins); no path is ever built from a depends_on token. A name
    * that resolves to nothing there ends its branch. The plan itself is never its own
    * predecessor, and a cycle ends the walk. Fails toward "no predecessor": an unreadable
    * folder or plan is skipped, and this never throws.
    * @param {string} planPath - the plan being validated
    * @param {string} content - its content
    * @param {string} projectPath - project root
    * @returns {Array<{ref: string, files: string[]}>} ref is "<stage>/<name>.md"
    */
   function unfinishedPredecessors(planPath, content, projectPath) {
     const plansDir = path.join(projectPath, 'plans');
     const stageOf = new Map();
     for (const stage of UNFINISHED_STAGES) {
       let entries;
       try {
         entries = safeFs.readdirSync(path.join(plansDir, stage));
       } catch {
         continue; // a missing or unreadable stage folder holds no predecessor
       }
       for (const f of entries) {
         const name = f.endsWith('.md') ? f.slice(0, -3) : '';
         if (name && !stageOf.has(name)) stageOf.set(name, stage);
       }
     }
     const seen = new Set([path.basename(planPath, '.md')]);
     const queue = dependencyNames(parseMetadata(content).depends_on);
     const out = [];
     while (queue.length > 0) {
       const name = queue.shift();
       const stage = stageOf.get(name);
       if (seen.has(name) || stage === undefined) continue;
       seen.add(name);
       let text;
       try {
         text = safeFs.readFileSync(path.join(plansDir, stage, `${name}.md`), 'utf8');
       } catch {
         continue; // an unreadable predecessor gives no pass
       }
       out.push({ ref: `${stage}/${name}.md`, files: parseFilesField(extractFrontmatterRegion(text)) });
       queue.push(...dependencyNames(parseMetadata(text).depends_on));
     }
     return out;
   }
   ```
   A `Map` and a `Set` keep a plan named `__proto__` or `constructor` from touching an object prototype. The joined path uses a name that both passed `isSafePlanSlug` and equals a file name just read from that folder.
5. **Changed: `validateForQueue` (`:1308-1360`), the count-mover block `:1331-1353`.** Replace it with the following (the comment is rewritten to state both stamp shapes and the pass):
   ```js
   const declaredFiles = parseFilesField(extractFrontmatterRegion(content));
   const countCheck = checkPlanDeclaresCountMovers(declaredFiles, projectPath);
   const coveredByPredecessor = [];
   const refusedMovers = [];
   if (!countCheck.ok) {
     /** @param {string} f */
     const posix = (f) => String(f).replace(/\\/g, '/');
     const preds = unfinishedPredecessors(planPath, content, projectPath);
     for (const off of countCheck.offenders) {
       const declaring = preds.filter((p) => p.files.some((f) => posix(f) === off.path));
       const creator = declaring.find((p) => p.files.some((f) => posix(f) === 'CLAUDE.md'));
       if (creator) {
         coveredByPredecessor.push({ path: off.path, plan: creator.ref });
         continue;
       }
       const countPhrase = off.currentCount != null ? `, currently ${off.currentCount}` : '';
       if (declaring.length > 0) {
         const ref = declaring[0].ref;
         result.errors.push(
           `Plan only edits "${off.path}", which "${ref}" (a plan it depends on) will create (moves the ` +
           `${off.countClass} count${countPhrase}), but "${ref}" does not declare "CLAUDE.md" in its files:. ` +
           `Add "CLAUDE.md" to "${ref}" so its build can update the documented count.`
         );
         refusedMovers.push({ ...off, predecessor: ref });
       } else {
         // Today's text, byte-identical to plan-validator.js:1346-1348.
         result.errors.push(
           `Plan will create "${off.path}" (moves the ${off.countClass} count${countPhrase}) but ` +
           `does not declare "CLAUDE.md" in its files:. Add "CLAUDE.md" so the build can update the ` +
           `documented count.`
         );
         refusedMovers.push(off);
       }
     }
     if (refusedMovers.length > 0) result.valid = false;
   }
   result.checklist.countMovers = countCheck.ok
     ? { ok: true, offenders: countCheck.offenders, coveredByPredecessor }
     : { ok: refusedMovers.length === 0, offenders: refusedMovers, coveredByPredecessor };
   ```
   Today's refusal string stays byte-identical, including the `countPhrase` computation. Only its position in the code moves. `checklist.countMovers` has no reader under `src/` (search: pattern `countMovers|validateForQueue` over the repository outside `plans/`, 4 files; under `src/` only the assignment at `plan-validator.js:1353` and the map entry `:1252`), so adding `coveredByPredecessor` breaks no reader.
   - **Called by:** `validateTransition` (`:1252`, `:1262`), which is unchanged; see Wiring.
   - **Error handling:** every disk read in the walk is inside `try`. `parseMetadata` falls back on its own error (`state.js:233-250`), and `parseFilesField` returns `[]` for any non-string input. `validateForQueue` therefore cannot throw from the walk, and any read fault ends in "no pass", which leaves the refusal in place (fail closed).
   - **Cross-platform:** `path.join` for every path, `path.basename` for the plan's own name, `\` normalised to `/` before comparing paths, no shell, and `safe-fs` for every read (as the rest of the file does).
   - **Lint:** the two regular-expression literals are a single character class and a single escaped character. If `eslint`'s unsafe-regex rule flags either, build it with `safeRegExp`, as the file already does (`:1553-1557`).

#### File: `src/lib/actions.js`
**Action:** MODIFY. **Purpose:** keep one definition of the dependency-name guard. **Change type:** refactor, with no behaviour change.
- **Delete** the `isSafePlanSlug` JSDoc and function (`:1520-1533`). Leave the stray `completeTaskPlan` JSDoc above it (`:1495-1519`) where it is: it is not part of this change.
- **Import:** `:27` becomes `const { validateForReview, validateTransition, isSafePlanSlug } = require('./plan-validator');`.
- **Unchanged callers:** `:1155` (the build-claim reconcile), `:1567` and `:1578` (`classifyCompletionFault`), and `:1990` (`planDependsOn`). The comment at `:1969-1974` ("MUST NOT be widened") stays true word for word.
- **Covered by:** the existing `tests/an-unreadable-dependency-list-refuses-the-plan.test.js` (through `taskSpecFromPlan`), the existing completion-fault tests, and `tests/export-reachability.test.js`.

#### File: `src/lib/documented-counts.js`
**Action:** MODIFY, comments only (Step 15). After the "THE TRIGGER IS CREATION" paragraph (`:16-19`), add one paragraph headed "THE GATE'S PREDECESSOR PASS". It says that this function still reports a path an earlier slice will bring into being, and that `plan-validator.validateForQueue` withholds the refusal for it when a not-yet-finished plan reached through the slice's `depends_on` chain declares the same path together with `CLAUDE.md`. When that plan declares the path without `CLAUDE.md`, the refusal names that plan instead. The static audit, which calls this function directly, keeps today's view. No code, export or test of this file changes.

#### File: `tests/plan-declares-count-moving-ratchets.test.js`
**Action:** MODIFY. **Framework:** `node:test` and `node:assert/strict`, like the rest of the file. Every existing case stays unchanged and passing; no assertion is weakened.
- **Helper extended:** `writePlan(root, stage, slug, files, { prependApproval = false, dependsOn = null, parentPlan = null } = {})` writes `parent_plan: <parentPlan>` into the plan's own block when given. It writes `depends_on` the same way: a string `dependsOn` becomes `depends_on: <value>`, and an array becomes `depends_on:` followed by one `  - <name>` line per entry (the block-list form 11l needs). Existing callers pass neither, so their output is byte-identical.
- **New helpers in the new block:**
  - `menuSandbox()`: an `fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-count-fence-menu-'))` folder holding all eight stage folders and `.ctoc/state`, returned through `fs.realpathSync` (the pattern at `tests/an-answer-starts-no-build.test.js:40-46`), removed in an `afterEach`. It never contains a `tests/`, `src/` or `CLAUDE.md`, so `tests/widget-rules.test.js` and `src/lib/widget-rules.js` are always absent there. Each test also asserts that absence first, so no case can pass vacuously.
  - `inQueue(root, slug, files, opts)`: `writePlan(root, 'todo', …, { prependApproval: true, ... })`, then `ledger.writeEntry(slug, { content, stage_from: 'implementation', stage_to: 'todo' }, root)` (the shape at `tests/an-answer-starts-no-build.test.js:65-72`). This is the older, prepended stamp shape.
  - `crossLines(text)`: the lines of a screen's text that start with two spaces and `✗` and a space (`menu-screens.js:2138`).
  - `validationOf(root, slug)` = `route(['validate', 'implementation/' + slug + '.md'], root)`. `planScreenOf(root, slug)` = `route(['plan', 'implementation/' + slug + '.md'], root)`. `offersMove(screen)` = `screen.ask.questions[0].options.some((o) => o.label === gateWords.approveLabel('implementation'))`. The label is read from `src/lib/gate-words.js:143-146`, never hard-coded. The `stream approve` action string is set whether or not validation passes (`streaming-gate.js:1702`), so only the option list shows whether the move is offered.
  - `todaysRefusal(root, p, kind)`: the expected line, built from today's template with `computeDocCounts(root)[kind]` (0 in the sandbox), prefixed with two spaces, `✗` and a space.
- **Requires added:** `afterEach` from `node:test`, `route` from `../src/lib/menu-screens`, `../src/lib/gate-words`, `../src/lib/approval-ledger`, `computeDocCounts` from `../src/lib/doc-counts`.

### Wiring — the live call sites

No new entry point is needed, and none is added. The new functions are internal to `plan-validator.js` and run inside `validateForQueue`, which is already live:
- **`validate implementation/<file>.md`** (menu route `menu-screens.js:3442-3453` → `validateScreen` `:2094` → `validateTransition` `:2126`): the validation screen the acceptance criteria read.
- **`plan implementation/<file>.md`** (`menu-screens.js:3431-3436` → `streaming-gate.planDecisionScreen` `:1569` → `validateTransition` `:1664`): decides whether the approve option is offered (`:1692`).
- **`stream approve implementation/<file>.md`** (`menu-screens.js:3378` → `streaming-gate.streamApprove` `:2297` → `actions.approvePlan` `:2306` → `validateTransition` `actions.js:447`): the move itself.
- **The streamed decision list and the continuation** (`streaming-gate.pendingGateDecisions` `:1057` → `validateTransition` `:1079`).

All four are reached from `src/commands/start.js`, which calls `menu-screens.route` (`:948`, `:966`), the `/ctoc:start` command. `isSafePlanSlug`'s live callers are the four in `actions.js` listed above plus `dependencyNames`.

### Test plan (Step 8 writes these first; they run red before Step 10)

New `describe('11: a slice that only edits a file an earlier slice brings into being — through the menu', …)` in `tests/plan-declares-count-moving-ratchets.test.js`. Slugs are lowercase and hyphenated (the approval record can key only those, `actions.js:478-491`). `FILE` is the test-file path and `LIB` is the library-module path written in the acceptance criteria. Every assertion on a screen passes the full screen text as its message, so a red run shows what the human would see. No test sleeps, times anything or asserts a duration.

| Case | Fixture | Asserts | Red before the fix? |
|---|---|---|---|
| **11a** (scenarios 1 and 4) | `slice-one` in implementation declares FILE and `CLAUDE.md`, with a `slice-one.md.status` file beside it; `slice-two` in implementation, `depends_on: slice-one`, declares FILE only | slice two's validation screen has no `✗` line naming FILE; `validateTransition(…).valid === true`; `checklist.countMovers.coveredByPredecessor` deep-equals `[{ path: FILE, plan: 'implementation/slice-one.md' }]`; slice one's validation screen has no `✗` line | yes, and its output is the reproduction record |
| **11b** (scenario 3, real crossing) | as 11a, then `route(['stream','approve','implementation/slice-one.md'])` | slice one is now in `todo/`, its frontmatter has `approved_by: human` and `parseFilesField` still gives `[FILE, 'CLAUDE.md']`; slice two is still in `implementation/` (fails loudly if the continuation moved it); slice two's validation screen has no `✗` line naming FILE; `offersMove(planScreenOf(slice two))` is true; `route(['stream','approve','implementation/slice-two.md'])` leaves `todo/slice-two.md` present, `implementation/slice-two.md` absent, and `ledger.readEntry('slice-two', root).approved_by === 'human'` | yes |
| **11c** (scenario 3, older stamp shape) | `slice-one` through `inQueue` (prepended approval block) declaring FILE and `CLAUDE.md`; `slice-two` as in 11a | no `✗` line naming FILE; `coveredByPredecessor[0].plan === 'todo/slice-one.md'` | yes |
| **11d** (scenario 5, chain) | `slice-one` through `inQueue` declaring FILE and `CLAUDE.md`; `slice-two` in implementation, `depends_on: slice-one`, declares only `docs/widget-notes.md`; `slice-three`, `depends_on: slice-two`, declares FILE only | slice three's screen has no `✗` line naming FILE; `coveredByPredecessor[0].plan === 'todo/slice-one.md'` | yes |
| **11e** (scenario 6) | one slice declares LIB only, with no `depends_on` | its screen's `✗` lines deep-equal `[todaysRefusal(root, LIB, 'libModules')]`, word for word; `offersMove(planScreenOf(…))` is false | no (it pins today's text) |
| **11f** (scenario 7, table) | per case, a fresh sandbox: `slice-one` (implementation, `parent_plan: widget-parent`) declares FILE and `CLAUDE.md`; `slice-two` (`parent_plan: widget-parent`) declares FILE only, with `depends_on` set in turn to: (a) `none`; (b) `no-such-plan`; (c) `../outside/slice-one`; (c2) `..\outside\slice-one`; (d) `unrelated-plan`, a real implementation plan declaring `docs/unrelated.md`; (e) `slice-four`, an implementation plan with `depends_on: slice-two` declaring `docs/four.md` | for each case the screen text contains `Pre-transition validation: implementation → todo` and its `✗` lines deep-equal `[todaysRefusal(root, FILE, 'testFiles')]`; the assertion message names the case | no (it guards the pass from being too broad; (e) also guards the plan's own name being pre-marked as seen) |
| **11g** (scenario 8) | `slice-one` in `done/` declares FILE and `CLAUDE.md`; `slice-two` `depends_on: slice-one` declares FILE only | `✗` lines deep-equal `[todaysRefusal(root, FILE, 'testFiles')]` | no |
| **11h** (scenario 9) | `slice-one` through `inQueue` declares FILE only; `slice-two` `depends_on: slice-one` declares FILE only | the `✗` lines naming FILE are exactly one, equal to the predecessor-refusal line below with `todo/slice-one.md` and count 0; no line holds today's "Plan will" wording; `offersMove(planScreenOf(slice two))` is false | yes |
| **11i** | `slice-one` through `inQueue` declares FILE only; `slice-zero` in implementation declares FILE and `CLAUDE.md`; `slice-two` `depends_on: slice-one, slice-zero` declares FILE only | no `✗` line naming FILE; `coveredByPredecessor[0].plan === 'implementation/slice-zero.md'` | yes |
| **11j** (fail closed) | (1) `plans/todo/slice-one.md` is a directory, and `slice-two` `depends_on: slice-one` declares FILE only; (2) `plans/review` is a regular file instead of a folder (the sandbox's folder removed first), `slice-one` in implementation declares FILE and `CLAUDE.md`, and `slice-two` in implementation, `depends_on: slice-one`, declares FILE only; the screen under test is slice two's | (1) `✗` lines deep-equal today's refusal (an unreadable predecessor gives no pass; a directory read throws EISDIR on macOS, Linux and Windows; believed from the Node.js `fs.readFile` documentation, and confirmed by the red/green run); (2) no `✗` line naming FILE (one unreadable folder does not stop the walk) | (1) no, (2) yes |
| **11k** (Decision 6) | a slice declaring only `docs/widget-notes.md`, `depends_on: ../x, no-such-plan` | its validation screen has no `✗` line | no |
| **11l** | as 11a, but slice two's `depends_on` is a YAML block list (`depends_on:` then `  - slice-one`) | no `✗` line naming FILE | yes |
| **11m** (Decision 21) | `slice-one` in implementation declares FILE and `CLAUDE.md`; a second `slice-one.md` in `todo/` declares only `docs/stale.md`; `slice-two` `depends_on: slice-one` declares FILE only | no `✗` line naming FILE; `coveredByPredecessor[0].plan === 'implementation/slice-one.md'` | yes |

The predecessor-refusal line that 11h pins, with `<ref>` = `todo/slice-one.md` and the count from `computeDocCounts(root).testFiles`:

```
  ✗ Plan only edits "tests/widget-rules.test.js", which "<ref>" (a plan it depends on) will create (moves the testFiles count, currently 0), but "<ref>" does not declare "CLAUDE.md" in its files:. Add "CLAUDE.md" to "<ref>" so its build can update the documented count.
```

Today's line that 11e, 11f, 11g and 11j(1) pin (the library-module form in 11e):

```
  ✗ Plan will create "<path>" (moves the <testFiles|libModules> count, currently 0) but does not declare "CLAUDE.md" in its files:. Add "CLAUDE.md" so the build can update the documented count.
```

**Branch coverage of the new code** (the floor is 99 per cent, `.ctoc/coverage-baseline.json`):
- `dependencyNames`: no `depends_on` key (11e), `none` (11f a), unsafe names (11f c, c2; 11k), an array (11l).
- `unfinishedPredecessors`:
  - a missing stage folder: existing cases 6 and 7 use `tmpProject()`, which has only implementation and todo, and their slices have an absent counted file and no `CLAUDE.md`, so the walk runs there;
  - an unreadable stage folder (11j 2); a non-`.md` entry (11a's `.status` file); a duplicate name across folders (11m); an unknown name (11f b); a cycle (11f e); an unreadable plan (11j 1).
- `validateForQueue`: an earning predecessor (11a), a declaring predecessor without `CLAUDE.md` (11h), no declaring predecessor (11f), both kinds of predecessor at once (11i), and `countCheck.ok` true (existing case 7b).

**Suites that must stay green, unchanged:**
- `tests/plan-declares-count-moving-ratchets.test.js` (cases 1 to 10);
- `tests/remainder-plan-pipeline-coverage.test.js`;
- `tests/an-unreadable-dependency-list-refuses-the-plan.test.js` (the moved guard);
- `tests/subplan-decomposition.test.js` (`validateForQueue` warnings);
- `tests/actions-coverage.test.js`, `tests/streaming-gate.test.js`, `tests/an-answer-starts-no-build.test.js`, `tests/export-reachability.test.js`, `tests/plan-validator.test.js`, `tests/plan-validator-coverage.test.js`.

### Acceptance criteria mapping

| Criterion | Implemented in | Test |
|---|---|---|
| Scenario 1: the refusal is reproduced and recorded | Step 8 red run; "Reproduction record" above | 11a (red run) |
| Scenario 2: a different source rewrites the plan first | Step 8 stop rule; Step 10 starts only after the record is written | 11a's recorded output |
| Scenario 3: a predecessor in the build queue gives the pass, the move is offered and taken | `unfinishedPredecessors` + `validateForQueue` | 11b (real crossing), 11c (older shape) |
| Scenario 4: a predecessor still in technical planning | same | 11a |
| Scenario 5: a predecessor further up the chain | breadth-first walk | 11d |
| Scenario 6: today's refusal word for word, no move offered | today's branch, string unchanged | 11e |
| Scenario 7: no pass from `none`, unknown names, folder climbs, unrelated plans or cycles | `dependencyNames` + the seen set + exact-name index | 11f (a, b, c, c2, d, e) |
| Scenario 8: no pass from a finished predecessor | `UNFINISHED_STAGES` excludes `done` | 11g |
| Scenario 9: the refusal names the predecessor, no move offered | predecessor branch | 11h |

### Security review

- [x] **Path traversal.** `depends_on` is untrusted text from a plan file. Every token must pass `isSafePlanSlug` (no separator, no `..`, only `[A-Za-z0-9._-]`), and must then equal a `.md` file name just read from one of four fixed folders under `plans/`. No path is built from a token that has not passed both. A folder climb with the last part of a real plan name gives no pass (11f c, c2).
- [x] **No existence probe.** Because names are resolved against folder listings, a crafted name cannot ask whether some file exists. The only visible result is pass or no pass, about plans already listed in the plan folders.
- [x] **Borrowing another plan's permission.** The pass needs a plan the slice names (directly or through named plans) to declare the same path and `CLAUDE.md`. The plan that brings the file into being still carries the permission, and that is the rule this fence exists for. A slice that names an unrelated, never-built plan only to get the pass gets nowhere at build time. The scheduler will not build it until that plan has a finished build or a live task (`actions.js:2068-2089`).
- [x] **Output injection.** The predecessor reference rendered in the refusal is `<stage>/<name>.md`, where `<name>` passed `isSafePlanSlug`, so it holds no control or escape characters. The offender path is rendered exactly as today.
- [x] **Prototype pollution.** `Map` and `Set` only; no object is keyed by plan text.
- [x] **Denial of service.** The walk reads each not-yet-finished plan at most once (the seen set) and runs only when today's check already refuses. Four folder listings bound its size.
- [x] **Fail closed.** Every read fault ends in "no pass", which leaves today's refusal standing. `approvePlan` already refuses on any non-`true` validity (`actions.js:448-463`).
- [x] **Accepted, unchanged:** a symbolic link planted inside `plans/` would be followed by this read, as by every other plan reader (`readPlans`, `listSubplans`). Whoever can plant one already controls the repository.
- [x] **No secrets, no shell, no network, no writes.** The change only reads.

### Risks found in technical planning

- **A predecessor revised after the dependent slice crossed (the functional plan's risk, corrected).** If the earlier slice later drops the file or `CLAUDE.md`, the dependent slice can build it without permission to update `CLAUDE.md`.
  - For hooks and tabs, `tests/doc-counts.test.js` turns red at the quality check (`:102-136`).
  - For the four growing kinds, nothing fails. The number in `CLAUDE.md` stays stale until the release script (`release.js` in the `src/scripts/` folder) rewrites it at the next release (`tests/doc-counts.test.js:14-20`; `tests/doc-counts-generated.test.js:1-18`).
  - Likelihood is low, because the scheduler builds the earlier slice first. Impact is low, because the stale number corrects itself at release.
  - No mitigation is built: it is recorded here so the reviewer knows where it is caught.
- **Shared files.** `src/lib/plan-validator.js` is also declared by "The plan checker does not read a quotation as a claim that the plan creates a file" and "A method name in plan prose is not a missing file". `src/lib/actions.js` is edited by the send-back and status-line plans of this vision. The edits here touch other functions (`validateForQueue` and the guard's location), so a collision is a merge conflict, not a behaviour clash. Line numbers above were read on 2026-10-20 and may shift.
- **The plan's own completion check.** The prose contradiction scan at completion (`plan-validator.js:760`) reads a creation verb followed by a missing path as a false claim. Every fixture path and quoted refusal line in this plan therefore sits in a fenced block or appears without such a verb. The builder keeps the reproduction record in a fence too.

### Implementation order

1. Step 8: extend the test helpers and write cases 11a to 11m, then run them red and record the reproduction (stop rule above).
2. MODIFY `src/lib/plan-validator.js`: move `isSafePlanSlug` in and export it. MODIFY `src/lib/actions.js`: delete it there and import it. Run the guard's suites (they depend on nothing new).
3. MODIFY `src/lib/plan-validator.js`: `UNFINISHED_STAGES`, `dependencyNames`, `unfinishedPredecessors`, and the new count-mover block in `validateForQueue` (depends on 2).
4. MODIFY `src/lib/documented-counts.js`: the header paragraph (comments only; depends on 3 being true).

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [x] Write the failing tests first, in `tests/plan-declares-count-moving-ratchets.test.js` only: extend `writePlan` with the `dependsOn` and `parentPlan` options, add the helpers and cases 11a to 11m exactly as in the Test plan, and drive the real menu with `route(['validate', …])`, `route(['plan', …])` and `route(['stream', 'approve', …])` in a sandbox, never in the real plan folders.
- [x] Run `node --test tests/plan-declares-count-moving-ratchets.test.js` and confirm the red set: 11a, 11b, 11c, 11d, 11h, 11i, 11j(2), 11l and 11m fail on the assertions about the missing pass or the predecessor wording; 11e, 11f, 11g, 11j(1) and 11k pass on the unchanged code; cases 1 to 10 still pass.
- [x] Write the "Observed in Step 8" record under "Reproduction record" from 11a's red output, inside a fenced block. Apply the stop rule there before going on.

### Step 9: PREPARE
- [x] Confirm that the four declared files are the whole change: no new file and no new dependency. Then confirm, by reading, that the cited line numbers still match; sibling plans may have moved them.
- [x] Run `node --test tests/an-unreadable-dependency-list-refuses-the-plan.test.js tests/export-reachability.test.js` once, green, as the baseline for the guard move.

### Step 10: IMPLEMENT
- [x] `src/lib/plan-validator.js`: move `isSafePlanSlug` in, export it, then add `UNFINISHED_STAGES`, `dependencyNames`, `unfinishedPredecessors` and the new count-mover block in `validateForQueue`, as specified in File specifications.
- [x] `src/lib/actions.js`: delete `isSafePlanSlug` and import it from `./plan-validator` (`:27`).
- [x] Re-run the Step 8 file: every case green, with cases 1 to 10 unchanged.

### Step 11: REVIEW
- [x] Re-read the diff against the acceptance mapping. Check that today's refusal string is byte-identical, that the walk runs only when `countCheck.ok` is false, that no path is built from a token that has not passed `isSafePlanSlug` and the folder index, and that the plan itself is never its own predecessor.
- [x] Confirm that `actions.js` behaviour is unchanged: the four guard callers call the same function.

### Step 12: OPTIMIZE
- [x] The walk lists four folders once per validation that already refuses, and reads each reached plan once. Nothing else is to be optimised. Do not cache across calls: plans move between stages between calls.

### Step 13: SECURE
- [x] Walk the Security review checklist against the code as written. Add, as a test, any attack that lands; for example a `depends_on` of `slice-one/../slice-one` or one holding a NUL character must give no pass, as 11f does.
- [x] Confirm that the rendered predecessor reference cannot carry control characters (it is built only from a name that passed `isSafePlanSlug`).

### Step 14: VERIFY
- [x] Run `npm test`, the gated entry point: the whole suite, the coverage floor at `.ctoc/coverage-baseline.json` `minPct` (99) and the gate for 0 skipped tests.
- [x] Run lint and the type check through the repository's standard commands.
- [x] Result: `# fail 0`, 0 skipped, no flaky test. Any failing test is reproduced and root-caused before anything is changed.

### Step 15: DOCUMENT
- [x] `src/lib/documented-counts.js`: add the header paragraph "THE GATE'S PREDECESSOR PASS" (comments only).
- [x] `src/lib/plan-validator.js`: rewrite the comment above the count-mover block so it states both stamp shapes (merged today, prepended on older plans) and the pass, and give JSDoc to `UNFINISHED_STAGES`, `dependencyNames` and `unfinishedPredecessors`.
- [x] Tick the stories' checkboxes in this plan for what the tests prove.

### Step 16: FINAL-REVIEW
- [x] Confirm that Steps 8 to 15 are done and the reproduction record is filled in a fence.
- [x] Re-open the validation screen through the menu in a sandbox for scenarios 3 and 9, and check that what a person reads matches the acceptance criteria.
- [x] Confirm that the two corrections (Decisions 25 and 26) are still true of the code as built.
- [x] Confirm that only the four declared files changed.

## Execution Record (Steps 8–16)

### Step 8: TEST

#### Reproduction record (observed in Step 8)

Fixture: `slice-one` and `slice-two` in the technical-planning folder of a temporary project (no `tests/`, `src/` or `CLAUDE.md` in it); `slice-one` declares the test file and `CLAUDE.md`; `slice-two` has `depends_on: slice-one` and declares the test file only. Route: `validate implementation/slice-two.md`, on the unchanged code, from the red run of test 11a.

Slice two's validation screen, its `✗` lines (exactly one):

```
  ✗ Plan will create "tests/widget-rules.test.js" (moves the testFiles count, currently 0) but does not declare "CLAUDE.md" in its files:. Add "CLAUDE.md" so the build can update the documented count.
```

Producing function: `validateForQueue` in `src/lib/plan-validator.js`, the count-mover branch (the only place in `src/` that contains the words "Plan will create"; search: pattern `Plan will create` over `src`, 1 match), from the offender `checkPlanDeclaresCountMovers` in `src/lib/documented-counts.js` returns. No other `✗` line appeared for slice two.

Slice one's validation screen: no `✗` line; it reads "All checks passed."

Stop-rule check: the observed line equals the prediction word for word (count 0 as predicted), it comes from `validateForQueue`'s count-mover branch, and no other `✗` line appeared for either slice. The stop rule did not fire; Step 10 may start.

#### Red run of the new cases (before any product code changed)

Command: `node --test tests/plan-declares-count-moving-ratchets.test.js`. Cases 1 to 10 of the file: all pass. Cases 11a, 11b, 11c, 11d, 11h, 11i, 11j(2), 11l and 11m: fail on the assertions about the missing pass or the predecessor wording. Cases 11e, 11f (a, b, c, c2, d, e), 11g, 11j(1) and 11k: pass on the unchanged code. This is the red set the plan predicted.

### Step 9: PREPARE

The four declared files are the whole change: no new file, no new dependency. The cited line numbers had moved since the plan was written (sibling plans landed): `validateForQueue` now begins at `src/lib/plan-validator.js:1572`, and the guard sat at `src/lib/actions.js:1672-1685`. The code was read at its current place. Baseline run of the guard's suites (the unreadable-dependency-list suite and the export-reachability suite): 34 tests, 34 passed, 0 failed, 0 skipped.

### Step 10: IMPLEMENT

- `src/lib/plan-validator.js`: the guard moved in, unchanged in body, and exported; added `UNFINISHED_STAGES`, `dependencyNames`, `unfinishedPredecessors`; the count-mover block in `validateForQueue` replaced as specified (today's refusal text byte-identical; the walk runs only when today's check already refuses).
- `src/lib/actions.js`: the guard and its JSDoc deleted; imported from `./plan-validator` in the existing require line. The four callers are untouched.
- Placement choice: the moved guard and the new functions sit directly above `validateForQueue`, not above `planSlugExists` (function declarations are hoisted, so order does not matter).
- Result: `node --test tests/plan-declares-count-moving-ratchets.test.js`: 32 tests, 32 passed, 0 failed, 0 skipped (cases 1 to 10 unchanged, all of 11a to 11m green). The eleven suites named in the plan's "Suites that must stay green" list plus `tests/reachability.test.js`: 389 tests, 389 passed, 0 failed, 0 skipped. `eslint` with `--max-warnings 0` on the three changed code files: clean.

### Fix round after Step 11 review (pass) and Step 13 security (warn)

Four changes from the approved change list, each test written first and seen red.
- Change 1, bounded walk (Decision 31): test 11n red with "Maximum call stack size exceeded" (RangeError from the spread), green after the walk by index and one-at-a-time pushes.
- Change 2, stale copy beside a finished plan (Decision 32): test 11o red (the stale copy earned the pass), green after `plans/done` is listed and ends the branch.
- Change 3, unsafe dependency tokens (Decision 33): tests 11p a, b, c, d, e red (the pass was given), green after `dependencyNames` returns null on any unsafe token.
- Change 4, named attacks (Decision 34): tests 11q a and b green before and after (pins).
- Red set of this round: 7 failing tests (11n, 11o, 11p a to e); `tests/plan-declares-count-moving-ratchets.test.js` then 41 tests, 41 passed.

### Step 12: OPTIMIZE

Nothing to optimise beyond change 1: the quadratic `shift` and the spread are gone. Four folder listings plus `plans/done` once per validation that already refuses; each reached plan read once; no cache across calls.

### Step 13: SECURE

The security warn is closed by changes 1 to 3. The Security review lines on Denial of service and Fail closed are now true as built (Decision 31). Output injection stays closed: the rendered reference is built only from a name that passed `isSafePlanSlug`. The validation screen printing error lines unstripped and direction-changing characters missing from the strip helpers are outside this plan's files and are left to the owner. Correction made in the final round: the doc comment of the moved guard, the duplicate posix helper and the dead `raw === null` check are not outside this plan's files; all three are in `src/lib/plan-validator.js`, a declared file. The doc comment is fixed in the final round, the posix helper is as the spec asked, and the dead null check is harmless and left.

### Step 15: DOCUMENT

`src/lib/documented-counts.js` header: the paragraph "THE GATE'S PREDECESSOR PASS" (comments only). `src/lib/plan-validator.js`: the comment above the count-mover block states both stamp shapes, the pass, the finished-plan rule and the unsafe-token rule; JSDoc on `UNFINISHED_STAGES`, `dependencyNames`, `planNamesIn` and `unfinishedPredecessors` now says what they do. The stories' and scenarios' checkboxes are ticked for what tests 11a to 11q prove.

### Step 14: VERIFY

- `npm run lint` (eslint, `--max-warnings 0`): clean.
- `npm run typecheck`: pass (1 test, 1 passed).
- `npm test`, run once, load average 34.70 49.80 55.58 at start (`uptime`): 13948 tests, 13948 passed, 0 failed, 0 cancelled, 0 skipped; coverage 99.75% against the 99% floor (`plan-validator.js` 99.86% lines, uncovered 350-352, which this change did not touch); `[CTOC test-gate] PASS`. No timing test failed, so no rerun was needed.

### Final round (Steps 11, 13 and 16)

Step 11 REVIEW. The reviewer read the change against the plan's acceptance mapping and found no defects. Today's refusal text is byte-identical. The walk through other plans runs only when today's check already refuses. No file path is built from a dependency name unless it has passed the bare-name guard and matched a plan file name just read from one of the four unfinished-stage folders. The plan being checked is never its own predecessor. The guard moved from src/lib/actions.js to src/lib/plan-validator.js unchanged in body, and its callers in actions.js still call that same function. The review passed.

Step 13 SECURE. The security review raised three warnings, and all three were fixed test-first. First, a predecessor listing 120,000 to 200,000 dependency names made the walk throw a RangeError, and the old way of taking names off the queue made it slow down quadratically; the queue is now walked by index, and each name is added once, only when it is a known unfinished plan not yet seen (test 11n). Second, a stale copy of a finished plan sitting in an unfinished folder could earn the pass; the walk now lists the finished folder too and stops at any name found there, as the scheduler does (test 11o). Third, unsafe dependency names were dropped silently; any unsafe name now withholds the pass, and a predecessor whose own list holds one is left out of the walk entirely, because the scheduler refuses that list and the plan can never build (tests 11p a to e). The two named attacks, a name that climbs out and back in and a name holding a NUL character, give no pass (tests 11q). The validation screen printing error lines unstripped, and the strip helpers missing direction-changing characters, are outside this plan's files and are left to the owner.

Step 16 FINAL-REVIEW. Every acceptance scenario has a proving case that drives the real menu routes (validate, plan screen and stream approve) in a temporary project and checks the text a person reads. Scenario 3 shows no refusal line for the test file, offers "Yes — build it", and the move puts the slice in the build queue with the owner's approval recorded. Scenario 9 shows exactly one refusal line, which names the earlier slice as the one that brings the file into being without declaring CLAUDE.md, and no move is offered. The reproduction record sits in a fenced block and matched the prediction word for word. Both corrections about the approval stamp shape and the documented-counts check still hold, and Decisions 31 to 34 match the code exactly. One comment-only fix was applied in the final round: the bare-name guard's doc comment now says the scheduler's dependency parser reports unsafe names so the plan is refused, and names all its callers. The coordinator confirmed that only the four declared files and the plan changed.
