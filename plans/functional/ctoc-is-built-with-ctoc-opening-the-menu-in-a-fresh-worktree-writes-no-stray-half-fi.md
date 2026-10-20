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
