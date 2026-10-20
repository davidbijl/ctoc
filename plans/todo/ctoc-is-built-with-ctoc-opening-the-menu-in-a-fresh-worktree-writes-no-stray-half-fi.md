---
title: "Opening the menu in a fresh worktree writes no stray half-filled IRON_LOOP.md"
created: "2026-10-20T13:37:49.349Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 8
risk_level: MEDIUM
files:
  - src/lib/init-project.js
  - src/commands/start.js
  - .ctoc/templates/CLAUDE.md.template
  - .ctoc/templates/IRON_LOOP.md.template
  - .ctoc/operations/README.md
  - README.md
  - docs/PROJECT_REFERENCE.md
  - tests/menu-repairs-what-it-reports-missing.test.js
  - tests/menu-reports-what-init-did.test.js
  - tests/init-project-coverage.test.js
---

# Opening the menu in a fresh worktree writes no stray half-filled IRON_LOOP.md

## Problem Statement

Opening CTOC's menu in a fresh git worktree of a project that is already set up writes a stray, untracked `IRON_LOOP.md` at the worktree root, and the coordinator has to delete it by hand before committing. The file is the raw template: its first line is `# {{PROJECT_NAME}} — Iron Loop`, and none of its 19 placeholders is filled. The same half-filled file lands in every brand-new project CTOC sets up, so the first files CTOC adds to a new user's repository contain text that is not true.

Evidence:
- **run** (the vision, CTOC v6.14.133): in a fresh worktree, `node src/commands/start.js plan todo/agent-tool-grants.md` created the untracked `IRON_LOOP.md` with that first line. The main checkout has no such file, and git does not ignore it.
- **read** (the vision advisor, and again in this pass): `src/lib/init-project.js:708` names the template `.ctoc/templates/IRON_LOOP.md.template`. Lines `:795-804` copy it verbatim when the file is absent, without the placeholder filling that `CLAUDE.md` gets at `:714-724`.
- **read in this pass:** the template holds 19 placeholders on 19 lines (search `\{\{[A-Z_]+\}\}` in that one file). At setup time CTOC has a value for three of them at most: the project name and the detected lint and type-check commands.

Done when a test opens the real menu in a fresh worktree and `git status` is unchanged, and no file setup writes into a brand-new project carries an unfilled placeholder.

## Why a Fresh Worktree Triggers Setup (traced)

The stub left this open; it is traced here. Label: read in this pass, and reproduced by the done plan "A contract test stops scaffolding the real repository root — the full suite leaks an unrendered IRON_LOOP.md into the working tree" (`plans/done/00222-a-contract-test-stops-scaffolding-the-real-repository-root.md`). In its "Decisions Taken During Execution", with `.ctoc/state/iron-loop.yaml` moved aside, opening the menu left `?? IRON_LOOP.md` whose first line was the unfilled placeholder.

1. Every menu call runs `ensureInitialized` first (`src/commands/start.js:926`).
2. `ensureInitialized` runs project setup whenever its read-back, `verifySetup`, finds any required item missing (`src/commands/start.js:759-798`). The required items are `.ctoc/settings.yaml` with a usable compliance anchor, `.ctoc/state/iron-loop.yaml` and the eight plan stage folders (`:621-626`, `:708-720`; the same list is `REQUIRED_ARTIFACTS` in `src/lib/init-project.js:574-578`).
3. Git ignores `.ctoc/state/` (`.gitignore:6`). A fresh worktree is a fresh checkout, so it has no `.ctoc/state/iron-loop.yaml`, and the read-back reports it missing.
4. Setup then runs in full (`initProject`), not only for the missing item, and writes every file that is absent. CTOC's repository has no root `IRON_LOOP.md` (its Iron Loop document is `docs/IRON_LOOP.md`), so setup writes one. The state file setup also writes is ignored and stays invisible. The `IRON_LOOP.md` is neither tracked nor ignored, so it shows up in `git status`.
5. The main checkout already holds `.ctoc/state/iron-loop.yaml` from an earlier run (found on disk in this pass), so nothing is missing there and setup never runs.

That done plan fixed only its test (the test now runs the menu in a temporary project). It left the unfilled copy to the owner, in its words: "changing init's rendering is a different decision for the operator to schedule". The comment at `tests/ctoc-start-command.test.js:140-145` records the same cause.

Not verified in this pass: whether `.ctoc/settings.yaml` is tracked in CTOC's repository. Believed it is: git does not ignore it, it exists in both the main checkout and this worktree, and the vision's run names only `IRON_LOOP.md` as new. The scenario "A fresh worktree stays clean" makes the answer irrelevant, because it compares the whole of `git status`.

## Business Alignment

**Job to Be Done:** When I open CTOC's menu in a fresh git worktree to work on a plan, I want the worktree left exactly as git checked it out, so I can commit only my own changes without first deleting a file the menu made.

**Impact Map:**
- **Goal:** Every plan move the maintainers need is a menu route with usable output (the decomposition's goal). It serves the vision's problem: CTOC is built through its own menu without by-hand workarounds.
- **Actor:** the coordinator session and the background agents that build CTOC in git worktrees (the vision's target user). After them, every CTOC user who opens the menu in a new checkout or a brand-new project.
- **Impact:** the coordinator opens the menu in any fresh worktree and commits without deleting a stray file by hand. A new user's first CTOC files contain no unfilled placeholder.
- **Deliverable:** project setup on menu open that leaves a fresh worktree's `git status` unchanged, and that writes no file with an unfilled placeholder into a brand-new project.

**Alignment checks:**
1. Does the Goal trace to the vision's problem statement? YES. It is the vision's friction "Opening the menu in a fresh worktree writes a stray file". It is also the vision's success example "Opening the menu in a fresh worktree leaves no untracked file with an unfilled `{{PROJECT_NAME}}` placeholder".
2. Is the Actor in the vision's target audience? YES. The vision names the coordinator and the background agents, and also "every CTOC user whose plans hit these routes".
3. Is the Impact observable? YES. `git status` is compared before and after, and the files setup wrote are searched for placeholders.
4. Is the Deliverable one functional area? YES. Both stories change what project setup writes when the menu opens (`ensureInitialized` and `initProject`).

**Overlap with sibling stubs:** none. Search: pattern `init-project|IRON_LOOP|ensureInitialized|worktree|project setup` over the ten files `plans/functional/ctoc-is-built-with-ctoc-*.md`. One file matched: this one. Three siblings name `src/commands/start.js`; see "Dependency Risks".

## User Stories

**Technical enabler, attached to the first story: trace why setup runs in a fresh worktree.** This is the decomposition's spike. Its acceptance ("the plan records the condition that starts project setup and why a fresh worktree meets it") is met by "Why a Fresh Worktree Triggers Setup" above. What is left is the scenario "The cause is confirmed before the fix", which the build runs before it changes any product code.

**As the** coordinator, **I want** opening the menu in a fresh worktree of a project that is already set up to leave `git status` exactly as it was, **so that** I commit only my own changes and never delete a stray file by hand.

**As a** developer opening CTOC for the first time in a brand-new project, **I want** every file setup writes to be complete, with no unfilled `{{NAME}}` placeholder and no link to a file that is not there, **so that** the first files CTOC adds to my repository say true things about it.

### INVEST

| Criterion | A fresh worktree stays clean | A brand-new project gets no unfilled placeholder |
|---|---|---|
| Independent | Pass. It holds whatever happens to `IRON_LOOP.md`: even a fully filled copy is still a new untracked file in a fresh worktree. | Pass. It does not need the first story. It is the only story the owner question below touches. |
| Negotiable | Pass. It names the outcome (`git status` unchanged), not how the repair is narrowed. | Pass. Both answers to the owner question satisfy it. |
| Valuable | Pass. It removes a by-hand delete from every fresh worktree. | Pass. A new user's first CTOC files stop carrying placeholder text. |
| Estimable | Pass. The trigger is traced to named lines. | Pass once the owner question is answered; both answers are small and named. |
| Small | Pass. One setup path and one test that builds its own temporary repository. | Pass. One template or one setup step, plus two README sentences and two template links. |
| Testable | Pass. Three scenarios below. | Pass. Four scenarios below. |

## Decomposition

Source: `plans/decomposition/ctoc-is-built-with-ctoc.md`. Stories marked `[MVP]` are the smallest end-to-end version; there are no remaining stories in this plan, and no phase or schedule (the owner alone chooses what is built and when).

### Vision item carried
- "Opening the menu in a fresh worktree writes a stray file."

### Goal: Every plan move the maintainers need is a menu route with usable output
- **Actor:** the owner and the CTO Chief, coordinator session and background agents that build CTOC through its menu; after them, every CTOC user on the same routes.
- **Impact:** the coordinator opens and moves plans through the menu in any worktree without cleaning up after it by hand.
- **Success metric:** this plan has a test that opens the real menu in a fresh worktree, and no stray file has to be deleted by hand.

### Activities
1. Open the menu in a fresh worktree.
2. Find the repository unchanged.

### Stories
- [ ] `[MVP]` Spike: As the planner, I want it traced why opening the menu runs project setup in a fresh worktree but not in the main checkout, so that the fix aims at the real trigger.
  - Acceptance: the plan records the condition that starts project setup and why a fresh worktree meets it.
  - INVEST: passes as a time-boxed investigation.
- [ ] `[MVP]` As the coordinator, I want opening the menu in a fresh worktree to leave no untracked file with an unfilled `{{PROJECT_NAME}}` placeholder, so that worktrees stay clean.
  - Acceptance: in a fresh worktree, `node src/commands/start.js plan todo/<plan>.md` leaves `git status` without a new `IRON_LOOP.md`, and no file written by `src/lib/init-project.js` (template at `:708`, write at `:795-803`) contains `{{PROJECT_NAME}}`.
  - INVEST: passes all six criteria.

### Dependencies
- Story level: the fix depends on the traced trigger.
- Plan level: none.

## Acceptance Criteria

Eight scenarios. Each test runs the real `src/commands/start.js` as a separate process. Each builds its own temporary git repository, plus a worktree of it where one is named, under the system's temporary folder. No test runs `git worktree add` on the live repository or writes into it; `tests/ctoc-start-command.test.js` test 4 already follows the same rule. A placeholder is any text matching `\{\{[A-Z0-9_]+\}\}`.

Technical enabler:

- [ ] **Scenario: The cause is confirmed before the fix**
  Given the current release, unchanged, and the set-up project and fresh worktree of "A fresh worktree stays clean"
  When that scenario's test runs before any product code changes
  Then it fails, and `git status --porcelain --untracked-files=all` in the worktree lists `IRON_LOOP.md` as a new untracked file
  And a control run on the same release, in a second fresh worktree into which `.ctoc/state/iron-loop.yaml` was copied first, leaves `git status --porcelain --untracked-files=all` exactly as it was and shows no setup sentence
  And if the control run also writes a file or shows a setup sentence, the build stops, and this plan is corrected before any fix

First story (a fresh worktree stays clean):

- [ ] **Scenario: A fresh worktree stays clean**
  Given a temporary git repository holding a set-up project, all committed: `CLAUDE.md`; `.ctoc/settings.yaml` with a usable compliance anchor; the eight plan stage folders, each holding a file (a `.gitkeep` where it would be empty, because git drops empty folders); one plan in `plans/todo/`; a byte copy of CTOC's own `.gitignore`; and no root `IRON_LOOP.md`
  And a fresh worktree of it, added inside the repository's folder the way CTOC's own worktrees sit under `.claude/worktrees/`, so the ignored `.ctoc/state/iron-loop.yaml` is absent there
  When the coordinator runs `node <CTOC>/src/commands/start.js plan todo/<that plan>.md` with the worktree as its working folder
  Then `git status --porcelain --untracked-files=all` in the worktree prints exactly what it printed before the run
  And no `IRON_LOOP.md` exists at the worktree root
  And the screen shows neither "CTOC is not fully set up" nor "CTOC could not finish setting up"
  And a second run of the same command shows no setup sentence at all

- [ ] **Scenario: A project that only looks set up is still set up in full**
  Given a brand-new git repository with no `.ctoc/settings.yaml`, whose `.ctoc/` folder holds only a `logs/` folder that a hook wrote before the menu was ever opened
  When the developer opens the menu there (`node <CTOC>/src/commands/start.js` with no arguments)
  Then `.ctoc/settings.yaml`, `.ctoc/state/iron-loop.yaml`, `CLAUDE.md` and the eight plan stage folders exist
  And the screen says "CTOC is set up for this project."

- [ ] **Scenario: A repair that cannot write says so and writes nothing else**
  Given the fresh worktree of "A fresh worktree stays clean", in which a plain file takes the path `.ctoc/state`, so setup cannot create `.ctoc/state/iron-loop.yaml`
  When the coordinator runs the same command
  Then the screen says "CTOC could not finish setting up this project.", names `.ctoc/state/iron-loop.yaml` as missing, and ends with its "To fix it, …" sentence
  And `git status --porcelain --untracked-files=all` in the worktree prints exactly what it printed before the run

Second story (a brand-new project gets no unfilled placeholder):

- [ ] **Scenario: A brand-new project gets no unfilled placeholder**
  Given a brand-new git repository holding a `package.json` whose `name` is `acme-shop`, one source file, and no `.ctoc/` folder
  When the developer opens the menu there for the first time
  Then the screen says "CTOC is set up for this project."
  And no file that exists after the run, and did not exist before it, contains a placeholder
  And the `CLAUDE.md` setup wrote contains `acme-shop`

- [ ] **Scenario: Every link in the new CLAUDE.md leads to a file**
  Given that brand-new project after its first menu run
  When each relative Markdown link in the `CLAUDE.md` setup wrote is resolved against the project folder
  Then every one of them names a file that exists
  (Today the template has two such links, both to `./IRON_LOOP.md`: `.ctoc/templates/CLAUDE.md.template:41` and `:134`.)

- [ ] **Scenario: The README's setup promise matches what setup writes**
  Given the two README sentences that list what first setup creates: the paragraph that begins "There is no init command." and the sentence that begins "You know it worked when" (today `README.md:86` and `:118`; the wording identifies them, the line numbers only point)
  When they are compared with that brand-new project after its first menu run
  Then every file and folder the two sentences name exists
  And they name `IRON_LOOP.md` only if setup wrote it

- [ ] **Scenario: A developer's own IRON_LOOP.md is kept**
  Given a brand-new project with no `.ctoc/` folder that already holds an `IRON_LOOP.md` whose whole text is `# my own notes`
  When the developer opens the menu there for the first time
  Then `IRON_LOOP.md` still holds exactly `# my own notes`

## Scope

### In Scope
- In an already set-up project whose only missing item is git-ignored local state, opening the menu recreates that state and writes nothing that `git status` shows. Scenarios: "A fresh worktree stays clean", "A repair that cannot write says so and writes nothing else".
- Full setup stays for a project that has no `.ctoc/settings.yaml`, including one whose `.ctoc/` holds only a hook's `logs/` folder. Scenario: "A project that only looks set up is still set up in full".
- The traced cause is confirmed before any product code changes. Scenario: "The cause is confirmed before the fix".
- What setup writes into a brand-new project: no unfilled placeholder in any file, every relative link in the generated `CLAUDE.md` resolving, and README's two setup sentences matching what is written. Scenarios: "A brand-new project gets no unfilled placeholder", "Every link in the new CLAUDE.md leads to a file", "The README's setup promise matches what setup writes".
- A project's own `IRON_LOOP.md` is left untouched. Scenario: "A developer's own IRON_LOOP.md is kept".

### Out of Scope
- Rewriting or deleting an `IRON_LOOP.md` that an existing project already holds. It would break setup's promise that "a file that already exists is never overwritten" (`README.md:86`). The owner question names this leftover, so he decides whether anything is needed.
- How the menu finds a project's root folder (`findProjectRoot`, `src/commands/start.js:292`). The vision's run shows the stray landing in the worktree itself, so root resolution is not the cause.
- CTOC's own Iron Loop document `docs/IRON_LOOP.md`, and the links to it inside `docs/`. They point at CTOC's document, not at a project's root file.
- The test changed by the done plan "A contract test stops scaffolding the real repository root …". This plan does not change it, and its assertions keep holding.

## Risks

### Technical Risks
- Narrowing the repair stops a brand-new project from being set up: a project whose `.ctoc/` exists only because a hook wrote `logs/` must still get full setup.
  - Likelihood: LOW. Cases 7 and 13 of `tests/menu-reports-what-init-did.test.js` already drive an empty `.ctoc/` folder through the real menu.
  - Impact: MEDIUM. Every new user's first open would fail to set up; the verify step catches it, and the fix takes hours.
  - Mitigation: Keep the scenario "A project that only looks set up is still set up in full", and run those two cases at verify.
- Another menu route writes a file that git neither tracks nor ignores, so "A fresh worktree stays clean" fails for a cause outside setup.
  - Likelihood: MEDIUM. Unverified: the menu and the agents write runtime files under `.ctoc/streaming/`, and `.gitignore` does not list that folder (read). Whether `plan todo/<plan>.md` writes there was not checked.
  - Impact: MEDIUM. The strict criterion would block the build until the extra file is dealt with.
  - Mitigation: Record any such file, with the route that wrote it, in the implementation plan's first step, and send it back to this plan. Never loosen the `git status` comparison to make the test pass.
- The test runs real git commands to build a repository and a worktree.
  - Likelihood: LOW. Impact: MEDIUM.
  - Mitigation: Build both under the system's temporary folder, call git through `spawnSync` with an argument list and no shell, and remove the folder in a `finally` block, as the existing contract test does.

### Business Risks
- Either answer to the owner question changes the first files a new project gets. Under "stop writing it", README's "You know it worked when" check and the generated `CLAUDE.md`'s two links change. Under "keep it, filled in", the file stays but still says "Updated automatically as features progress", and no code found updates it.
  - Likelihood: HIGH (inherent in either answer). Impact: LOW.
  - Mitigation: Change README's two sentences and the template's two links in the same change, held by the scenarios "Every link in the new CLAUDE.md leads to a file" and "The README's setup promise matches what setup writes".
- Projects set up before the change keep their half-filled `IRON_LOOP.md`, because setup never overwrites a file.
  - Likelihood: HIGH. Impact: LOW.
  - Mitigation: Name the leftover in the owner question, so he decides whether existing users need a note.

### Dependency Risks
- Shared file `src/commands/start.js`. It is named by the sibling stubs "A plan in the build queue can be sent back to technical planning and keeps its title", "The menu prints the exact answer command for every option of every streamed question" and "The vision stubs screen names each stub by its title, not by the shared vision prefix". Whether they edit it is not known yet.
  - Likelihood: MEDIUM. Impact: LOW.
  - Mitigation: Declare the exact files in the implementation plan, so plans that share a file are built one after the other.
- Two existing tests name `IRON_LOOP.md` as the file setup skips when it is already there: case 9 of `tests/menu-reports-what-init-did.test.js` (`:236-244`) and `tests/init-project-coverage.test.js` (`:274-285`). If setup stops writing the file, they test a skip that no longer happens.
  - Likelihood: HIGH under "stop writing it", none under "keep it, filled in". Impact: LOW.
  - Mitigation: Point each test at another file setup skips when present (`CLAUDE.md`), with the reason written next to the change, and keep every assertion.
- Shared file `.ctoc/templates/CLAUDE.md.template`, which option A edits at its two `./IRON_LOOP.md` links. The sibling stub "The operating lessons say CTOC is built with CTOC and friction is filed as a plan" names it. So does the implementation plan "Every session is told that a hotfix word is checked, and how to run the check and commit", which declares it among its files. The sibling's tests (`tests/claude-md-lessons.test.js`, `tests/claude-md-keeps-every-rule.test.js` with `tests/fixtures/claude-md-rule-inventory.json`) may hold template text in place.
  - Likelihood: MEDIUM under option A, none under option B. Impact: LOW.
  - Mitigation: Declare the template in the implementation plan, so plans that share it are built one after the other, and run those two tests at verify.
- Shared file `README.md`, whose two setup sentences both options may change. The README plans name it: "The README matches the product today", whose slice "fresh-project captures and walks" runs what first setup writes; "README as a course"; and "The README stays true on every release".
  - Likelihood: MEDIUM. Impact: LOW.
  - Mitigation: Declare `README.md` in the implementation plan, so it is built one after the other with those plans. Find the two sentences by their wording, never by line number alone.
- The implementation plan "Real projects do not stall on the menu" says that opening the menu in a nested folder "adds `CLAUDE.md` and `IRON_LOOP.md` when absent" (`plans/implementation/real-projects-do-not-stall-on-the-menu.md:147`). Under "stop writing it" that sentence becomes false.
  - Likelihood: MEDIUM. Impact: LOW.
  - Mitigation: Name that sentence in this plan's implementation slice, so whoever plans either change corrects it. This plan does not edit that file.

## Priority

**Priority: MEDIUM** (Score: 6/9)
- Dependency: 2. It is parallel with the other stubs: none depends on it, and it depends on none.
- Business Impact: 2. It supports the goal "Every plan move the maintainers need is a menu route with usable output". It removes a by-hand delete from every fresh worktree and stops placeholder text in every new project.
- Technical Risk: 2. Moderate. The setup path it changes was shaped by three earlier plans, and their tests must keep passing: "The menu never claims it set up a project it did not", "An honest message with no way out is half a fix" and "A log directory manufactures the marker that gates setup".

## Questions for the owner

**What should setup put into a brand-new project in place of today's `IRON_LOOP.md`?** The answer blocks only the second story. The first story, and every scenario above, holds for both answers.

What decides it (read in this pass unless labelled otherwise):
- The file is the raw template: 19 placeholders, none filled.
- It says "Updated automatically as features progress". A search for `IRON_LOOP` over `src/` matched four files. Only `src/lib/init-project.js` names a project's root `IRON_LOOP.md`; the other three name `docs/IRON_LOOP.md` or the integrator agent. That shows where the name is written, not that nothing reads the file at runtime.
- Its step list has 15 steps with older labels (Step 7 TEST, Step 13 VERIFY). CTOC's Iron Loop has 16 (Step 8 TEST, Step 14 VERIFY).
- The generated `CLAUDE.md` links to it twice (`.ctoc/templates/CLAUDE.md.template:41` and `:134`), and README promises it twice (`README.md:86` and `:118`).
- The done plan "A contract test stops scaffolding the real repository root …" left exactly this decision to the owner.

| Option | What changes | For | Against |
|---|---|---|---|
| **A. Stop writing it (Recommended)** | Setup writes no `IRON_LOOP.md`. The two `CLAUDE.md` links point at CTOC's Iron Loop document online (believed address `https://github.com/robotijn/ctoc/blob/main/docs/IRON_LOOP.md`; the planner checks it resolves). README's two sentences drop the file. | It removes a file whose text is wrong in three ways. There is no second step list to keep in step with `docs/IRON_LOOP.md`, which has already drifted once (15 steps against 16). It is the smallest change. | README's "You know it worked when" check changes for every new user. Reading the method needs the network or the installed plugin. The two skip tests are re-pointed. |
| **B. Keep it, filled in** | Setup fills in the project name and the detected lint and type-check commands. It writes "no feature in progress yet" in the per-feature fields and renumbers the steps to the 16-step loop. | README's promise and the two links stay as they are. Each project keeps a local step checklist. | The file still says it updates itself, and no code found updates it, so "Current Work" and "Metrics" keep their first-day text. It is a second step list that can drift again. |

Recommendation: **A**, because it is the only option after which every sentence in the files setup writes is true. Evidence strength: medium. The placeholder count, the step drift and the links were read directly. "Nothing updates it" rests on a string search, not a runtime trace. What would flip it: a hook, agent or menu route found reading or updating a project's `IRON_LOOP.md` at runtime. Either answer leaves the `IRON_LOOP.md` of projects set up earlier as it is, because setup never overwrites a file. Say whether those users need a note.

## Decisions Taken Under Ambiguity

1. **The spike is answered by evidence, not repeated.** The trigger was read in this pass, and the done plan "A contract test stops scaffolding the real repository root …" reproduced it. One doubt remains: that a fresh worktree's first missing item is the state file. The scenario "The cause is confirmed before the fix" settles it before any fix.
2. **The `git status` check covers everything, not just `IRON_LOOP.md`.** The stub's line ("no new `IRON_LOOP.md`, no `{{PROJECT_NAME}}`") would pass a fix that fills in only the project name, or one that writes the stray under another name. Comparing the whole of `git status` before and after rules out both.
3. **"Placeholder" means any `{{NAME}}`, not only `{{PROJECT_NAME}}`.** A file with 18 of its 19 placeholders left is still half-filled, which is what the title rules out. Read in this pass: `.ctoc/templates/CLAUDE.md.template` has eight placeholders, and setup fills all eight (`init-project.js:714-724`). So this wider reading does not pull `CLAUDE.md` into the change.
4. **Two stories, not one.** The worktree story holds whatever happens to `IRON_LOOP.md`, and only the new-project story waits on the owner question.
5. **How the repair tells "already set up" from "brand-new" is left to the planner.** Two scenarios bound it: a project whose only missing item is ignored local state gets no new visible files, and a project without `.ctoc/settings.yaml` still gets full setup.
6. **The test's fresh worktree sits inside its repository's folder**, as CTOC's own worktrees sit under `.claude/worktrees/`. That way the menu resolves the project root the way it does in real use.
7. **The test makes setup fail by putting a plain file at `.ctoc/state`.** That works the same on Windows, macOS and Linux; a permission change does not.
8. **The first-run sentence "CTOC is set up for this project." stays in a fresh worktree.** It is true once the state file is recreated, and the second run is silent.
9. **`risk_level` is MEDIUM.** Each risk is rated by the lower of its likelihood and its impact. No risk is HIGH on both, and one is MEDIUM on both.
10. **Only this plan file was edited.** The brief allows one file, so no status file and no question file under `.ctoc/streaming/questions/pending/` were written. As the brief asks, the owner question is in this plan.
11. **The decomposition section is kept as written.** Its story checkboxes stay unticked, because ticking them belongs to the build, not to refinement.
12. **Nothing in the vision, the decomposition or the stub was acted on beyond refinement.** None of them asked for anything else.
13. **The cause is confirmed by a control run, not by setup's internal report.** The tests run the menu as a separate process, so they see only the screen and the disk. A second worktree with the state file copied in must stay clean on the unchanged release. That isolates the missing state file as the trigger.
14. **The test project's `.gitignore` is a byte copy of CTOC's own.** The friction was seen in CTOC's repository. A hand-picked ignore list could be widened until the test passes.
15. **The link scenario covers the whole generated `CLAUDE.md`, merged blocks included.** Search `\]\(` in `.ctoc/templates/operating-lessons.md` and `.ctoc/templates/operating-manual.md`: no match. So the two blocks setup merges into `CLAUDE.md` add no relative link, and the scenario depends only on the template's two links.
16. **The downstream check was read, not run.** `validateFunctionalToImpl` (`src/lib/plan-validator.js:975-1018`) looks for a problem statement, for "acceptance criteria" and for a scope. This file has `## Problem Statement`, `## Acceptance Criteria` and `## Scope`.

## Decisions Taken Under Ambiguity

Decided by the recommended option when this plan moved on; none of these needed the human.

- Projects CTOC set up before this change keep their unfilled IRON_LOOP.md under either answer, because setup never overwrites an existing file. Should those users be told? — Yes, one sentence in the README (question q11-note-for-projects-set-up-earlier)

Decided while planning the build (implementation planner, 2026-10-20). The owner's answer to "What should setup put into a brand-new project in place of today's IRON_LOOP.md?" is recorded in the answer log: "Stop writing IRON_LOOP.md". Everything below builds on it, and none of it needed him.

- **"Already set up" means `.ctoc/settings.yaml` exists.** When it exists, opening the menu runs a narrow repair that writes only the missing setup folders and `.ctoc/state/iron-loop.yaml`. Without it, the full setup runs as today.
  - Why this signal: it is the one required item a set-up project commits. A fresh worktree has it; a brand-new project lacks it, and so does one whose `.ctoc/` holds only a hook's `logs/`.
  - Why narrow and not only "stop writing IRON_LOOP.md": the full setup also refreshes the managed lessons and manual blocks of a committed `CLAUDE.md` (`src/lib/init-project.js:745-793`), and appends CTOC lines to a `.gitignore` that lacks them (`:839-849`). In a fresh worktree either shows up in `git status`. CTOC's own `CLAUDE.md` carries the lessons markers (`CLAUDE.md:205`, `:233`). The functional plan's INVEST row requires the first story to hold whatever happens to `IRON_LOOP.md`.
  - Consequence, stated: a set-up project that lost its `CLAUDE.md` no longer gets one back when the menu opens. Before, it got one back only when a required item was also missing. The session-start hook (`src/hooks/SessionStart.js:308`) and `/ctoc:update` (`src/commands/update.js:51`, `:99`) still keep the managed blocks current.
- **The repair writes every missing setup folder (stage folders and `.ctoc/` folders), not only the eight stage folders.** They are empty, git never shows an empty folder, and code that expects them finds them as it does today.
- **A sub-command screen shows the setup sentence only when setup failed.** The scenario "A repair that cannot write says so" needs the failure sentence on `plan todo/<plan>.md`. Today `main()` computes that sentence and drops it on every sub-command (`src/commands/start.js:939-970`).
  - The success sentence stays silent on sub-commands, so every healthy or repairable sub-command screen stays byte-identical. A success sentence would change the first line of the screen in every child-process fixture that sets itself up. Search: pattern `commands['"],\s*['"]start\.js|commands/start\.js['"]` over `tests/` matched 34 files; at least `tests/inbox-questions-are-shown-as-quoted-data.test.js:169` and `tests/the-dashboard-never-sends-live-work-back.test.js:211` run it with arguments. Which of those assert a screen's first line was not traced one by one; the VERIFY step's full suite is the check.
  - The scenario "A fresh worktree stays clean" allows the success sentence and does not require it (functional decision 8).
- **The template file is deleted, not kept.** `src/lib/init-project.js:708` is its only reader. The one other mention is a documentation link, `.ctoc/operations/README.md:395` (`/templates/IRON_LOOP.md.template`). Read from the repository root it names a folder that does not exist (`templates/`); read from `.ctoc/` it names the file this plan deletes. It now points at `/docs/IRON_LOOP.md`, the root-relative form of the line above it (`/README.md`, which exists only at the repository root).
- **The new `CLAUDE.md` links point at `https://github.com/robotijn/ctoc/blob/main/docs/IRON_LOOP.md`.** Not fetched: this agent has no network tool. Local evidence:
  - `.claude-plugin/marketplace.json:20` names the repository `https://github.com/robotijn/ctoc`;
  - `.ctoc/templates/CLAUDE.md.template:135` already links that address;
  - the main branch is `main`;
  - `docs/IRON_LOOP.md` exists in this checkout.

  Case 21 checks the path part offline, against CTOC's own tree.
- **The new test cases go into the existing `tests/menu-repairs-what-it-reports-missing.test.js`.** No test file is added, so no documented count moves and `CLAUDE.md` is not touched. That file already holds the menu-setup repair cases and the helpers they reuse: `freshDir`, `seedValidProject`, `partialCtocFromWriteHook` and `driveMenu`.
- **The worktree fixture's committed `CLAUDE.md` carries a stale managed lessons block.** Every `CLAUDE.md` setup writes carries that block, and so does CTOC's own. It is what makes a full setup run show ` M CLAUDE.md`, so the test catches the narrowing and not only `IRON_LOOP.md`.
- **`.ctoc/settings.yaml` is tracked in CTOC's repository, verified in this pass.** This settles the doubt in "Why a Fresh Worktree Triggers Setup":
  - the file is in this planner's own fresh worktree;
  - `.gitignore` does not list it;
  - the worktree's `git status` at dispatch listed it neither as untracked nor as modified.

  The same worktree holds `plans/canvas/.gitkeep`, so the stage folders are tracked through `.gitkeep` files.
- **Each test that skips a pre-existing `IRON_LOOP.md` now uses `CLAUDE.md`.** These are the functional plan's two named tests. Every assertion is kept, and a comment beside each change gives the reason.
- **The test identity is `CTOC Test <test@test.invalid>`.** No real name or address goes into a fixture.

## Implementation Details

### What changes

Opening the menu runs `ensureInitialized` (`src/commands/start.js:926`). Today it runs the full `initProject` whenever any required item is missing (`:770-794`). Three changes:

1. **A narrow repair for a set-up project.**
   - When `.ctoc/settings.yaml` exists, `ensureInitialized` calls `repairRequiredArtifacts(root)`, a new export of `src/lib/init-project.js`. It writes only the missing setup folders and `.ctoc/state/iron-loop.yaml`.
   - Otherwise it calls `initProject(root)` as today.
2. **No `IRON_LOOP.md`.** This is the owner's answer "Stop writing IRON_LOOP.md".
   - `initProject` loses step 4 (`:795-804`) and the template path (`:708`), and the template file is deleted.
   - The generated `CLAUDE.md`'s two links point at CTOC's Iron Loop document on GitHub.
   - The README's two setup sentences drop the file and gain the one-sentence note for projects set up earlier.
3. **The failure sentence reaches sub-command screens.** The sub-command branch of `main()` puts a failed setup's sentence at the top of the screen text.

### Evidence read in this pass

**Where setup shows its sentence**
- `src/commands/start.js:939-970`: the sub-command branch prints the route's result and never uses `setupNote`.
- Only the terminal branch (`:986`) and the no-argument branch (`:1015-1017`) show it.
- So today `plan todo/<plan>.md` shows no setup sentence at all.

**What a full setup run does to a set-up project**
- `src/lib/init-project.js:745-793`: steps 3b and 3c refresh the managed blocks of an existing `CLAUDE.md` that carries their marker.
- CTOC's `CLAUDE.md` carries the lessons markers and not the operating-manual marker. That marker is defined at `src/lib/operating-manual.js:28-29`.
- `src/lib/init-project.js:839-849`: step 8 appends `# CTOC`, `.ctoc/logs/` and `.ctoc/state/` to an existing `.gitignore` that lacks either entry.

**Who names the template**
- `IRON_LOOP\.md\.template` was searched over `src/`, `tests/`, `docs/`, `agents/`, `skills/`, `.claude-plugin/`, `package.json`, and the JSON and YAML files directly under `.ctoc/`. One code file names it: `src/lib/init-project.js:708`.
- `IRON_LOOP` was searched over the repository outside `plans/`. It found one more mention of the template: the link at `.ctoc/operations/README.md:395`.
- A match shows where the name is written, not what runs. `initProject` is the only code that opens the template.

**Placeholders**
- Pattern `\{\{[A-Z0-9_]+\}\}` over `.ctoc/templates/`:
  - `CLAUDE.md.template`: 8, all filled by `src/lib/init-project.js:714-724`;
  - `IRON_LOOP.md.template`: 19;
  - `operating-lessons.md` and `operating-manual.md`: 0.
- Neither managed-block template contains a GitHub `blob` link.

**Tests that hold the boundary today and keep holding**
- `tests/menu-repairs-what-it-reports-missing.test.js` cases 1, 2, 8, 9, 13 and 14.
- `tests/menu-reports-what-init-did.test.js` cases 7, 8, 10 and 13.
- `tests/menu-auto-init.test.js`.
- `tests/menu-coverage.test.js:188-237`.
- `tests/init-tells-the-truth.test.js`:
  - CASE 3 compares a preview with a real run; both lose `IRON_LOOP.md` together.
  - CASE 14 needs `success` computed and `REQUIRED_ARTIFACTS` named.

**Tests that stub `init-project`**
- They stub it through `require.cache`: `tests/menu-reports-what-init-did.test.js:178-199` and `:324-375`, and `tests/menu-repairs-what-it-reports-missing.test.js:240-264`.
- Each exports only `initProject` and runs in a folder without `.ctoc/settings.yaml`, so each still reaches `initProject`.

### Dependency graph

```
/ctoc:start  ->  node src/commands/start.js  ->  main()  (start.js:925)
  ensureInitialized(root)  (start.js:759)
    .ctoc/settings.yaml exists  ->  init-project.repairRequiredArtifacts(root)   [new export]
    otherwise                   ->  init-project.initProject(root)
      both use: ensureDirectories, ensureStateFile, missingRequired          [new private helpers]
  sub-command branch: route(...)  ->  withSetupFailure(result, setup)  ->  setupMessage(setup)
initProject step 3  reads  .ctoc/templates/CLAUDE.md.template  (two links changed)
tests/menu-repairs-what-it-reports-missing.test.js  drives start.js as a child process, and both new exports in process
```

There is no cycle: `src/lib/init-project.js` requires nothing from `src/commands/`.

### File specifications

#### File: `src/lib/init-project.js` (MODIFY)
**Purpose:** setup writes no `IRON_LOOP.md`, and a set-up project gets a narrow repair.

**Delete**
- The `ironLoopTemplatePath` constant (`:708`).
- Step 4 (`:795-804`): the `IRON_LOOP.md` write and its "already exists" entry in `skipped`.

**Extract three private helpers.** `initProject` calls each one where its code stood, and its behaviour and report are otherwise unchanged.

| Helper | Extracted from | Behaviour |
|---|---|---|
| `ensureDirectories(state, projectDir)` → `void` | step 5 (`:806-813`), unchanged | For each entry of `[...PLAN_DIRS, ...CTOC_DIRS]` absent on disk: `record(state, dir + '/', () => ensureDir(dirPath))`. |
| `ensureStateFile(state, projectDir, force)` → `void` | step 7 (`:827-837`), unchanged | When the file is absent or `force` is set: writes `generateInitialState()` through `record`, after `ensureDir` of its folder. Otherwise: pushes `'.ctoc/state/iron-loop.yaml (already exists)'` onto `state.skipped`. |
| `missingRequired(projectDir)` → `string[]` | the read-back (`:887-889`) | Returns the display paths of `REQUIRED_ARTIFACTS` that are absent on disk. |

**Add and export `repairRequiredArtifacts(projectDir)`**
- **Returns** `{ success: boolean, dryRun: false, created: string[], wouldCreate: string[], skipped: string[], failed: string[], missing: string[] }`. `wouldCreate` is always empty. There is no `detected` field, because no stack detection runs.
- **Body**
  1. Builds the same `state` object as `initProject` (`:686-693`), with `dryRun: false`.
  2. Calls `ensureDirectories(state, projectDir)`.
  3. Calls `ensureStateFile(state, projectDir, false)`.
  4. Sets `missing` to `missingRequired(projectDir)`.
- **`success`** is `state.failed.length === 0 && missing.length === 0`. It is computed, never a literal (`tests/init-tells-the-truth.test.js` CASE 14).
- **Writes nothing else:** no `CLAUDE.md`, no managed block, no `.ctoc/settings.yaml`, no `.gitignore` line, no hook notice.
- **On a failed write** `record` (`:633-647`) puts the failure into `failed`, and `reportableError` (`:602-619`) has already removed the project path from it. The function never throws for one failed item.
- **JSDoc** states the reason: a fresh git worktree of a set-up project lacks only git-ignored local state, and every folder the repair writes is empty, which git never shows.

**Exports:** add `repairRequiredArtifacts` to `module.exports` (`:972-983`).

**Types** (`tsconfig.json` type-checks `src/**/*.js` with `checkJs`, and `npm run typecheck` holds a baseline): the three helpers type `state` as `{dryRun: boolean, created: string[], wouldCreate: string[], skipped: string[], failed: string[], projectDir: string}`. That is `record`'s typedef (`:629`) plus `skipped`, which `ensureStateFile` pushes to.

#### File: `src/commands/start.js` (MODIFY)
**`ensureInitialized` (`:770-794`)**
- Requires `../lib/init-project` once.
- When `safeFs.existsSync(underRoot(root, REQUIRED_SETTINGS))`, calls `repairRequiredArtifacts(root)`; otherwise calls `initProject(root)`.
- The handling of the report below the call is unchanged: `created`, `skipped`, and `failed` turned into `reason`.
- The JSDoc (`:722-758`) says which of the two runs, and why.

**Add `withSetupFailure(result, setup)` → `result`,** placed after `setupMessage` (`:844-871`)
- Returns `result` unchanged when:
  - `setup` is missing;
  - `setup.ok` is true;
  - `result` is not an object.
- Otherwise it sets `result.text`:
  - to `setupMessage(setup)`, a blank line and the old text, when the old text is a non-empty string;
  - to `setupMessage(setup)` alone, when it is not.
- Because it goes through `setupMessage`, the sentence passes through `sanitizeReason` (`:814-821`).
- JSDoc types: `@param {any} result` (a route's screen; assigning `text` on a parameter typed `object` is a type error under `checkJs`), `@param {{ attempted: boolean, ok: boolean, missing: string[], reason?: (string|null) }} setup` (the type `setupMessage` takes, `:841`), `@returns {any}`.

**`main()`, sub-command branch (`:966-968`):** print `JSON.stringify(withSetupFailure(result, setup), null, 2)`.

**Exports (`:1027` onward):** add `withSetupFailure` next to `setupMessage`.

#### File: `.ctoc/templates/CLAUDE.md.template` (MODIFY)

| Line | From | To |
|---|---|---|
| `:41` | `Full details in [IRON_LOOP.md](./IRON_LOOP.md).` | `Full details in [CTOC's Iron Loop document](https://github.com/robotijn/ctoc/blob/main/docs/IRON_LOOP.md).` |
| `:134` | `- [Iron Loop Methodology](./IRON_LOOP.md)` | `- [Iron Loop Methodology](https://github.com/robotijn/ctoc/blob/main/docs/IRON_LOOP.md)` |

Nothing else changes. The eight placeholders and the lessons markers stay.

#### File: `.ctoc/templates/IRON_LOOP.md.template` (DELETE)
Its only reader was step 4. Delete it with `git rm`.

#### File: `.ctoc/operations/README.md` (MODIFY)
`:395` becomes `- [Iron Loop](/docs/IRON_LOOP.md) - Development methodology`. That is the same root-relative form as the line above it, `/README.md`.

#### File: `README.md` (MODIFY)
Find each passage by its wording; the line numbers only point. Each text below is the exact new text.

1. **The paragraph that begins "There is no init command."** (`:86`) becomes:

   There is no init command. The first time you open the dashboard in a project without `.ctoc/settings.yaml`, CTO Chief sets the project up **before** rendering — it detects your stack (languages, frameworks, linters, test runners), writes a tailored `CLAUDE.md`, and makes `.ctoc/settings.yaml`, `.ctoc/state/` and the `plans/` stage folders. Initialization is idempotent: a file that already exists is never overwritten. In a project that is already set up, such as a fresh git worktree of one, opening the menu only remakes the `plans/` stage folders and `.ctoc/state/` when they are missing, and writes no other file.

2. **A new paragraph directly after it** (the note for projects set up earlier):

   A project set up by an earlier CTOC release may hold an `IRON_LOOP.md` full of unfilled placeholders such as `{{PROJECT_NAME}}`; setup no longer writes that file and never touches one that exists, so it is safe to delete.

3. **The sentence that begins "You know it worked when"** (`:118`) becomes:

   **You know it worked when** your project now contains `CLAUDE.md`, `.ctoc/settings.yaml` and a `plans/` folder, and `/ctoc:start` opens straight onto the dashboard.

#### File: `docs/PROJECT_REFERENCE.md` (MODIFY, Step 15)
"Project Init Procedure" (`:257`). Its first sentence becomes the following text; the numbered procedure (`:259-264`) names no `IRON_LOOP.md` and stays.

Initialization is automatic. There is no init command — when `/ctoc:start` runs in a project that has no `.ctoc/settings.yaml`, `src/commands/start.js` calls `initProject()` before rendering the dashboard. A project that already has `.ctoc/settings.yaml` but lacks a plan stage folder or `.ctoc/state/iron-loop.yaml` (a fresh git worktree lacks the state file, because git ignores `.ctoc/state/`) gets `repairRequiredArtifacts()` instead, which makes only the missing folders and the state file and writes no other file. The procedure (`src/lib/init-project.js`):

### Wiring — the live call sites

| New or changed function | Live call site | Root it is reached from |
|---|---|---|
| `repairRequiredArtifacts` (`src/lib/init-project.js`) | `ensureInitialized`, `src/commands/start.js:770-794` | `main()` (`start.js:926`), which `node src/commands/start.js` runs for `/ctoc:start` (`src/commands/start.md`) on every menu open |
| `ensureDirectories`, `ensureStateFile`, `missingRequired` | `initProject` and `repairRequiredArtifacts` | the same |
| `withSetupFailure` (`src/commands/start.js`) | the sub-command branch of `main()`, `start.js:966-968` | every `node src/commands/start.js <sub-command>` call, for example `plan todo/<plan>.md` |
| The two template links | `initProject` step 3, `src/lib/init-project.js:711-732` | the full-setup path of `ensureInitialized` |

The dead-export check counts an export used by a live module, or inside its own live module, as live (`src/lib/reachability.js:793-822`). No module is added, so neither reachability baseline moves.

### Test plan (Step 8: written first, run, seen failing)

**Where the cases go.** Every new case goes into `tests/menu-repairs-what-it-reports-missing.test.js` (`node:test`, `node:assert/strict`), in one `describe` block per story. They are numbered 15 to 27, after the file's 14 cases.

**Helpers added to that file**
- **Imports:** `before` from `node:test`, `spawnSync` from `child_process`, and `repairRequiredArtifacts` from `../src/lib/init-project`; `REPO` is `path.join(__dirname, '..')`.
- **`GIT_IDENTITY` and `git(cwd, args)`.**
  - The identity flags are copied from `tests/helpers/hotfix-check-harness.js:118-124`, with the name `CTOC Test` and the address `test@test.invalid`: `commit.gpgsign=false`, `maintenance.auto=false`, `gc.auto=0`.
  - `git` calls `spawnSync('git', [...GIT_IDENTITY, ...args], { cwd, encoding: 'utf8', shell: false, env: cleanEnv() })` and throws on a non-zero status.
  - The harness itself is not required, because it registers its own `afterEach` checks.
- **`cleanEnv()`:** `process.env` without any `GIT_*` variable, as in `tests/the-dashboard-never-sends-live-work-back.test.js:37-41`. The local pre-push hook runs this suite, and an inherited `GIT_DIR` would point `git worktree add` at the real repository. The `start.js` child gets the same environment.
- **`makeSetUpRepo()`:** a `freshDir()` on which `git init -q` has run. It holds, all committed with `git add -A` and `git commit -q --no-verify -m base`:
  - `CLAUDE.md`: the line `# acme-worktree`, then the `<!-- CTOC:LESSONS v1 START -->` and `<!-- CTOC:LESSONS v1 END -->` markers around one out-of-date line;
  - `.ctoc/settings.yaml`: `version: 1\n\nregulatory_regime:\n  active_profiles: []\n`;
  - the eight stage folders, each holding a `.gitkeep`, except `plans/todo/`, which holds the one plan `fresh-worktree-fixture.md` (`# A plan in the build queue`);
  - a byte copy of CTOC's own `.gitignore` (`fs.readFileSync(path.join(REPO, '.gitignore'))`);
  - no root `IRON_LOOP.md`.
- **`addWorktree(root, name)`:** runs `git worktree add -q --detach <root>/.claude/worktrees/<name> HEAD` and returns the worktree's real path. CTOC's `.gitignore` ignores `.claude/`, as in CTOC itself.
- **`status(dir)`:** the stdout of `git status --porcelain --untracked-files=all`.
- **`runPlan(cwd)`:** `execFileSync(process.execPath, [MENU_ENTRY, 'plan', 'todo/fresh-worktree-fixture.md'], { cwd, env: cleanEnv(), encoding: 'utf8' })`. It returns the raw stdout and the parsed screen.
- **`listFiles(root)`:** every file under `root` outside `.git/`, as forward-slash relative paths.
- **Constants:**
  - the three setup sentences: `CTOC is set up for this project.`, `CTOC is not fully set up`, `CTOC could not finish setting up`;
  - the placeholder pattern `/\{\{[A-Z0-9_]+\}\}/`.
- **Cleanup:** every fixture lives under `os.tmpdir()`, and the file's existing `after` hook (`:56-60`) removes it. A worktree sits inside its repository's folder, so it goes with that folder. No case runs `git` in CTOC's own repository or writes into it.

**First story: a fresh worktree of a set-up project stays clean**

| Case | Arrange and act | Assert | Before the fix |
|---|---|---|---|
| 15. The cause | `makeSetUpRepo`, `addWorktree`. No menu run. | `menu.verifySetup(worktree).missing` deep-equals `['.ctoc/state/iron-loop.yaml']`. | Passes. It confirms the traced trigger. |
| 16. The control run | A second worktree. Write `.ctoc/state/iron-loop.yaml` (`step: 1\n`) into it, as an earlier menu run leaves it in a main checkout; record `status`, then `runPlan`. | `status` afterwards equals the recorded one, and stdout contains none of the three setup sentences. | Passes. This guard isolates the missing state file as the trigger. |
| 17. A fresh worktree stays clean | A fresh worktree. Record `status`, then `runPlan` twice. | After the first run: `status` equals the recorded one, there is no `IRON_LOOP.md` at the worktree root, and stdout contains neither failure sentence. After the second run: stdout contains none of the three. | Fails: `?? IRON_LOOP.md` and ` M CLAUDE.md`. |
| 18. A repair that cannot write | A fresh worktree. Write a plain file at `.ctoc/state`, then record `status`; the file shows as `?? .ctoc/state`, because the ignore pattern `.ctoc/state/` matches only a folder. Then `runPlan`. | The screen `text` begins with `CTOC could not finish setting up this project.`. Its first paragraph names `.ctoc/state/iron-loop.yaml` as missing and ends with a sentence that starts `To fix it, `. Stdout does not contain the worktree's absolute path. `status` afterwards equals the recorded one. | Fails: the plan screen has no setup sentence, and there is `?? IRON_LOOP.md`. |

**Second story: a brand-new project gets only true files**

| Case | Arrange and act | Assert | Before the fix |
|---|---|---|---|
| 19. Only looks set up | A `git init` folder holding only `.ctoc/logs/`. Run `node start.js` with no arguments. | `.ctoc/settings.yaml`, `.ctoc/state/iron-loop.yaml`, `CLAUDE.md` and the eight stage folders exist, and `text` includes `CTOC is set up for this project.`. | Passes. This guard catches a narrowing keyed on `.ctoc/` alone. |
| Shared setup for cases 20 to 22 (a `before` hook) | A `git init` folder with `package.json` (`{"name":"acme-shop","version":"1.0.0"}`) and `src/index.js`. Record `listFiles`, run `node start.js` with no arguments, then record `listFiles` again. | (none) | (none) |
| 20. No unfilled placeholder | The shared project. | `text` includes `CTOC is set up for this project.`. No file listed after the run and not before it matches the placeholder pattern. The written `CLAUDE.md` contains `acme-shop`. | Fails: `IRON_LOOP.md` holds 19 placeholders. |
| 21. Every link leads to a file | The shared project's `CLAUDE.md`. | Every relative Markdown link (no scheme, not `#…`) resolves to an existing file under the project. The file contains `https://github.com/robotijn/ctoc/blob/main/docs/IRON_LOOP.md`. Every `https://github.com/robotijn/ctoc/blob/main/<path>` link names a file in CTOC's own tree, and there is at least one such link, so the check never runs on nothing. | Fails on the absolute link. |
| 22. The README matches setup | `README.md`: the paragraph that begins `There is no init command.`, and the line that begins `You know it worked when` once `**` is removed. | Both are found. Every backticked token in them that is a path (it matches `^[\w.-]+(/[\w.-]*)*$` and does not start with `/`) exists in the shared project. They name `IRON_LOOP.md` only if the project holds it. The paragraph directly after the "There is no init command." paragraph names `IRON_LOOP.md` and says it is safe to delete. | Fails on the note. The first three asserts pass today. They go red as soon as step 4 is removed, and stay red until the README is edited. |
| 23. A developer's own IRON_LOOP.md is kept | A `git init` folder holding `IRON_LOOP.md` with the text `# my own notes`. Run `node start.js` with no arguments. | The file is byte-identical. | Passes (a guard). |

**The narrow repair and the failure sentence, in process.** These cases also cover the new branches, because `main()` in `start.js` runs only in child processes.

| Case | Arrange and act | Assert | Before the fix |
|---|---|---|---|
| 24. The repair writes only what is missing | `seedValidProject`, then delete `.ctoc/state/iron-loop.yaml` and `plans/review`. Write `.gitignore` = `node_modules/\n` and no `CLAUDE.md`. Call `repairRequiredArtifacts(dir)`. | `created` includes `plans/review/` and `.ctoc/state/iron-loop.yaml`. Every entry of `created` is a folder (ends in `/`) or that state file. There is no `CLAUDE.md`. `.gitignore` is byte-identical. `success` is true and `missing` is empty. | Fails: not a function. |
| 25. The repair that cannot write | `seedValidProject`. Delete the `.ctoc/state` folder and write a plain file in its place. Call `repairRequiredArtifacts(dir)`. | `failed` has one entry. It starts with `.ctoc/state/iron-loop.yaml` and does not contain `dir`. `success` is false, and `missing` deep-equals `['.ctoc/state/iron-loop.yaml']`. | Fails: not a function. |
| 26. The menu chooses by the settings file | (a) `seedValidProject` without the state file, plus a `CLAUDE.md` with a stale lessons block and `.gitignore` = `node_modules/\n`. Call `menu.ensureInitialized(dir)`. (b) `partialCtocFromWriteHook(freshDir())`, then `menu.ensureInitialized`. | (a) `attempted` and `ok` are true. `CLAUDE.md` and `.gitignore` are byte-identical. There is no `IRON_LOOP.md`. (b) `CLAUDE.md` exists and `ok` is true. | (a) fails. |
| 27. The failure sentence on sub-command screens | A failed verdict `{ attempted: true, ok: false, missing: ['.ctoc/state/iron-loop.yaml'], reason: null }` and a healthy one `{ attempted: false, ok: true, missing: [] }`, each passed to `menu.withSetupFailure`. | Healthy: the same object comes back, with `text` unchanged. Failed, with `text: 'screen'`: `text` is `setupMessage(failed) + '\n\n' + 'screen'`. Failed, with no `text`: `text` is `setupMessage(failed)`. Failed, with `undefined`: it returns `undefined`. | Fails: not a function. |

**Two existing tests re-pointed.** This is the functional plan's mitigation. Both used `IRON_LOOP.md` as "the file setup leaves alone when it is already there", which stops being true.
- **`tests/menu-reports-what-init-did.test.js` case 9 (`:236-244`):** it now seeds `CLAUDE.md` = `# pre-existing\n` instead of `IRON_LOOP.md`, and asserts that `skipped` names `CLAUDE.md`. Every assertion is kept, and a comment gives the reason.
- **`tests/init-project-coverage.test.js` (`:268-285`):**
  - The test is renamed `should_skip_and_preserve_CLAUDE_md_when_it_already_exists`.
  - It seeds `CLAUDE.md` = `# hand-written notes`, then asserts that `skipped` names `CLAUDE.md` and that the bytes survive.
  - The header (`:8`) and the block comment (`:268-272`) say that the `IRON_LOOP.md` branch went with the file.

Both stay green before and after. They are changed while writing the tests, so the implementation cannot turn them red.

**Coverage and timing**
- Cases 24 to 27 hit every new branch in process.
- The suite stays at or above `.ctoc/coverage-baseline.json` `minPct` (99).
- No case asserts on elapsed time or sleeps.

### Acceptance criteria mapping

| Scenario | Implemented in | Test |
|---|---|---|
| The cause is confirmed before the fix | evidence, recorded at the TEST step | 15, 16, and the recorded red run of 17 |
| A fresh worktree stays clean | `ensureInitialized` → `repairRequiredArtifacts`; step 4 removed | 17, 26(a) |
| A project that only looks set up is still set up in full | `ensureInitialized`: no settings file → `initProject` | 19, 26(b) |
| A repair that cannot write says so and writes nothing else | `repairRequiredArtifacts`, plus `withSetupFailure` in `main()` | 18, 25, 27 |
| A brand-new project gets no unfilled placeholder | step 4 removed, template deleted | 20 |
| Every link in the new CLAUDE.md leads to a file | `CLAUDE.md.template:41`, `:134` | 21 |
| The README's setup promise matches what setup writes | README's two sentences, plus the note | 22 |
| A developer's own IRON_LOOP.md is kept | setup never names the file any more | 23 |
| Owner answer: "Stop writing IRON_LOOP.md" | all of the above | 20, 21, 22 |
| Decision: one README sentence for projects set up earlier | the README note | 22 |

### Security review
- **Path traversal:** there is no new input. `root` comes from `findProjectRoot` (`src/lib/project-root.js:197`), and the repair writes only fixed relative paths under it.
- **Information leak:**
  - The failure sentence reaches a sub-command screen only through `setupMessage` and `sanitizeReason` (`src/commands/start.js:814-821`). That replaces absolute paths with `<path>`, removes stack frames and keeps at most 200 characters.
  - A failure for a single item is already scrubbed where it is recorded, by `reportableError`.
  - Case 18 asserts that the worktree's absolute path never reaches the screen; case 25 asserts it is not in `failed`.
- **Command injection:** the product code starts no process. The test calls `git` and `node` with argument lists and `shell: false`, and removes every `GIT_*` variable, so a run inside the pre-push hook cannot touch the real repository.
- **Safe writes:** the repair writes only empty folders under the project and the state file. In a set-up project it can no longer touch a tracked `CLAUDE.md` or `.gitignore`.
- **Secrets and personal data:**
  - None. The fixture identity is `CTOC Test <test@test.invalid>`.
  - The template and the README gain only CTOC's public GitHub address.
- **Deleted file:** deleting the template removes nothing that runs (see the search above).
- **Screen structure:** the sentence goes into a string field and is printed through `JSON.stringify`, so it cannot break the screen's structure.

### Risks and mitigations

| Risk | Mitigation | Where |
|---|---|---|
| A test spawns a sub-command in a fixture whose setup fails (an unusable compliance anchor), and asserts that screen's exact text. | Only a failure is shown on sub-commands. The VERIFY step runs the full suite. Any such failure is investigated in the product code first. A fixture is changed only with a written finding that it was wrong. | `main()`; VERIFY step |
| Today's code does not refresh the fixture's stale lessons block, so case 17 fails only on `IRON_LOOP.md`. | The TEST step records case 17's red output. It must list both ` M CLAUDE.md` and `?? IRON_LOOP.md`; otherwise the fixture is corrected before any product change. | TEST step |
| The plan route writes some other visible file in the fixture. | Case 16, the control run, catches it before any fix. A visible write there stops the build and sends this plan back for correction, as the functional plan requires. | TEST step |
| A set-up project that lost `CLAUDE.md` no longer gets it back from the menu. | It is a recorded decision. The session-start hook and `/ctoc:update` still keep the managed blocks current. | Decisions |
| Other plans touch the same files (`README.md`, `src/commands/start.js`, the template). | All are declared in `files:`, so plans that share a file are built one after the other. | frontmatter |

### Cross-plan notes, one line each (none edited here)
- The implementation plan "Real projects do not stall on the menu" says setup "adds `CLAUDE.md` and `IRON_LOOP.md` when absent" (`plans/implementation/real-projects-do-not-stall-on-the-menu.md:147`). After this plan that is false, and whoever plans either change corrects it.
- `src/commands/start.md:465` still says setup runs when the project has no `.ctoc/` directory. It does not name `IRON_LOOP.md`.
- The comments at `tests/ctoc-start-command.test.js:40-46` and `:140-145` describe the stray file as current behaviour. Its assertions keep holding, and the functional plan leaves that file as it is.
- On the plan route, the question sweeper (`src/lib/streaming-questions-sweeper.js`) moves files out of `.ctoc/streaming/questions/pending/`. In a worktree whose pending files are committed, that move is a visible change; this plan neither causes it nor tests it.

## Execution Plan

### Step 8: TEST
- Re-point the two existing tests first. Both stay green.
- Write cases 15 to 27 in `tests/menu-repairs-what-it-reports-missing.test.js`.
- Run `node --test tests/menu-repairs-what-it-reports-missing.test.js` on the unchanged release, and record the output in this plan:
  - cases 17, 18, 20, 21, 22, 24, 25, 26 and 27 fail;
  - case 17's `status` difference lists `?? IRON_LOOP.md` and ` M CLAUDE.md`;
  - cases 15, 16, 19 and 23 pass.
- Stop before any product code changes if:
  - case 15 does not find exactly the state file missing; or
  - case 16 shows a changed `status` or any setup sentence.

  Either means the cause is not the traced one, and this plan goes back for correction.

### Step 9: PREPARE
- Re-read `src/lib/init-project.js:684-904` and `src/commands/start.js:759-798`, `:844-871` and `:939-970` before editing; the line numbers may have moved.
- Confirm that no other plan's build holds `src/commands/start.js`, `README.md` or `.ctoc/templates/CLAUDE.md.template`.

### Step 10: IMPLEMENT
Work in this order, and run the new cases after each item.
1. `src/lib/init-project.js`: remove step 4 and the template path. Run cases 21 and 22, and record that they are now red: the relative link names a missing file, and the README names a file setup no longer writes.
2. `.ctoc/templates/CLAUDE.md.template` (`:41`, `:134`) and `README.md` (the two sentences and the note). Cases 20, 21 and 22 go green.
3. `src/lib/init-project.js`: extract `ensureDirectories`, `ensureStateFile` and `missingRequired`, then add and export `repairRequiredArtifacts`. Cases 24 and 25 go green.
4. `src/commands/start.js`: `ensureInitialized` chooses by `.ctoc/settings.yaml`. Cases 17 and 26 go green.
5. `src/commands/start.js`: add and export `withSetupFailure`, and call it in the sub-command branch of `main()`. Cases 18 and 27 go green.
6. Delete `.ctoc/templates/IRON_LOOP.md.template` with `git rm`, and point `.ctoc/operations/README.md:395` at `/docs/IRON_LOOP.md`.

### Step 11: REVIEW
The critic checks that:
- `repairRequiredArtifacts` writes nothing beyond the setup folders and the state file;
- `initProject` behaves exactly as before, apart from the removed `IRON_LOOP.md`;
- the three extracted helpers are moved code, not rewritten code;
- `withSetupFailure` leaves every healthy sub-command screen byte-identical;
- the re-pointed tests keep every assertion.

### Step 12: OPTIMIZE
- Nothing on a hot path is added. The repair does strictly less work than the full setup it replaces.
- Remove any helper or branch the tests do not need.

### Step 13: SECURE
Run the security review above against the diff:
- the scrubbing of the failure sentence (cases 18 and 25);
- argument-list subprocesses and the removal of the `GIT_*` variables in the test;
- that no fixture runs `git` in CTOC's own repository;
- that the deleted template has no runtime reader.

### Step 14: VERIFY
- `npm run lint` (zero warnings), `npm run typecheck`, and `npm test`: the gated entry point, which runs the full suite and checks coverage at or above `minPct` 99, with 0 skipped and 0 flaky.
- Also run these by name:
  - `tests/menu-reports-what-init-did.test.js` (cases 7 and 13: an empty `.ctoc/` still gets the full setup);
  - `tests/menu-repairs-what-it-reports-missing.test.js`;
  - `tests/menu-auto-init.test.js`;
  - `tests/init-tells-the-truth.test.js`;
  - `tests/init-project-coverage.test.js`;
  - `tests/ctoc-start-command.test.js`;
  - `tests/claude-md-lessons.test.js` and `tests/claude-md-keeps-every-rule.test.js` (the shared template);
  - `tests/export-reachability.test.js` and `tests/reachability.test.js`;
  - `tests/readme-numbers.test.js`.
- Any failing test is reproduced and its cause found in the product code before anything else, including a test that passes when run again. A test is changed only with a written finding that it was wrong.

### Step 15: DOCUMENT
- `docs/PROJECT_REFERENCE.md`, "Project Init Procedure" (`:257`): the text given under File specifications.
- JSDoc on `repairRequiredArtifacts`, `withSetupFailure` and `ensureInitialized`, saying which setup runs when, and why.
- README is already done in the IMPLEMENT step.

### Step 16: FINAL-REVIEW
The critic checks that:
- every acceptance scenario maps to a passing case;
- a fresh worktree of the fixture leaves `git status` exactly as it was;
- no file a brand-new project receives carries a placeholder;
- the README's two sentences match what setup writes;
- no edit falls outside `files:`.
