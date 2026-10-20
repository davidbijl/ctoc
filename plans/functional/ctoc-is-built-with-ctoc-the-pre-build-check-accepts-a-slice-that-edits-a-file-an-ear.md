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
- [ ] `[MVP]` Spike: As the planner, I want the refusal reproduced on a pair of slices where the second only edits a file the first creates, so that the fix aims at the check that really refused.
  - Acceptance: the plan records the exact refusal text and the function that produced it; if it is not `checkPlanDeclaresCountMovers` in `src/lib/documented-counts.js` (called at `src/lib/plan-validator.js:1341`), the plan is rewritten around the real check before any build step.
  - INVEST: passes as a time-boxed investigation; Valuable is qualified, because its value is choosing the right fix.
- [ ] `[MVP]` As the planner, I want the check before the build queue to accept a slice that only edits a file an earlier, not-yet-built slice creates, so that dependent slices are not refused or forced to declare a `CLAUDE.md` they do not need.
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

- [ ] **Scenario 1: The refusal is reproduced and its source is recorded**
  Given slice one, in technical planning, declares `tests/widget-rules.test.js` and `CLAUDE.md`, and that test file is not on disk
  And slice two, in technical planning, names slice one in `depends_on` and declares only `tests/widget-rules.test.js`
  When the validation screen for slice two is opened
  Then the screen lists a `✗` refusal line for `tests/widget-rules.test.js`
  And this plan records, before any build step, that line word for word, the function that produced it, and that no other check run at the move into the build queue refuses the pair

- [ ] **Scenario 2: A different source rewrites the plan before any build**
  Given the line recorded in scenario 1 came from a function other than `checkPlanDeclaresCountMovers` in `src/lib/documented-counts.js` (called at `src/lib/plan-validator.js:1341`), or no refusal appeared
  When the investigation ends
  Then this plan is rewritten around what was actually seen before any build step starts
  And no build step of stories 2 and 3 starts on the unrewritten text

### Story 2: accept a slice that edits its predecessor's file

- [ ] **Scenario 3: A slice that edits its predecessor's file moves into the build queue**
  Given slice one sits in the build queue with the approval block its crossing put at the top of its file, and declares `tests/widget-rules.test.js` and `CLAUDE.md`, and that test file is not on disk
  And slice two, in technical planning, names slice one in `depends_on` and declares `tests/widget-rules.test.js` without `CLAUDE.md`
  When the validation screen for slice two is opened
  Then the screen lists no `✗` line naming `tests/widget-rules.test.js`
  And slice two's plan screen in the menu offers its move into the build queue, and taking that move puts slice two in `plans/todo/`

- [ ] **Scenario 4: The predecessor has not crossed into the build queue yet**
  Given slice one is still in technical planning and declares `tests/widget-rules.test.js` and `CLAUDE.md`, and that test file is not on disk
  And slice two names slice one in `depends_on` and declares `tests/widget-rules.test.js` without `CLAUDE.md`
  When the validation screen for slice two is opened
  Then the screen lists no `✗` line naming `tests/widget-rules.test.js`

- [ ] **Scenario 5: The file comes from a slice further up the chain**
  Given slice one, in the build queue, declares `tests/widget-rules.test.js` and `CLAUDE.md`, and that test file is not on disk
  And slice two names slice one in `depends_on` and does not declare the test file
  And slice three names only slice two in `depends_on` and declares `tests/widget-rules.test.js` without `CLAUDE.md`
  When the validation screen for slice three is opened
  Then the screen lists no `✗` line naming `tests/widget-rules.test.js`

### Story 3: give that pass only when it is earned

- [ ] **Scenario 6: A slice that really brings a counted file into being is still refused with today's message**
  Given a slice in technical planning declares `src/lib/widget-rules.js` without `CLAUDE.md`, that module is not on disk, and no plan in its `depends_on` chain declares it
  When the validation screen for that slice is opened
  Then the screen lists today's refusal for `src/lib/widget-rules.js`, word for word, with the library-module count kind
  And the slice's plan screen does not offer its move into the build queue

- [ ] **Scenario 7: A dependency list that reaches no plan declaring the file gives no pass**
  Given slice one, under the same parent plan as slice two, declares `tests/widget-rules.test.js` and `CLAUDE.md`, and that test file is not on disk
  And slice two declares `tests/widget-rules.test.js` without `CLAUDE.md`, and its `depends_on` is, in turn, each of these five:
  (a) `none`;
  (b) a name that no plan in any stage carries;
  (c) a name with a folder part, `../outside/slice-one`, whose last part is slice one's name on purpose: a name with any folder part gives no pass, even when its last part names a real plan that declares the file;
  (d) the name of a real plan in technical planning that does not declare the test file;
  (e) slice four, whose own `depends_on` names slice two back and which does not declare the test file
  When the validation screen for slice two is opened in each of the five cases
  Then each of the five screens lists today's refusal for `tests/widget-rules.test.js`, and the screen appears in every case

- [ ] **Scenario 8: A finished predecessor whose file is missing gives no pass**
  Given slice one is in `plans/done/` and declares `tests/widget-rules.test.js` and `CLAUDE.md`, but that test file is not on disk
  And slice two names slice one in `depends_on` and declares `tests/widget-rules.test.js` without `CLAUDE.md`
  When the validation screen for slice two is opened
  Then the screen lists today's refusal for `tests/widget-rules.test.js`

- [ ] **Scenario 9: A predecessor that does not declare CLAUDE.md is named in the refusal**
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
