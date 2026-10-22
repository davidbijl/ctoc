---
title: "CTOC quietly drafts a request for each friction it meets"
created: "2026-10-22T09:23:58.757Z"
type: feature
parent_vision: "vision/ctoc-learns-from-every-installation-through-requests-on-github.md"
priority: HIGH
status: refined
depends_on: "ctoc-learns-from-every-installation-through-requests-on-gith-a-request-holds-only-the-allowed-facts-and-a-fingerprint"
acceptance_criteria_count: 14
risk_level: HIGH
---

# CTOC quietly drafts a request for each friction it meets

## Problem Statement

A friction with CTOC met in a user's project is worked around by hand or forgotten, and nothing on that machine records it (vision, "Problem Statement"). So the next installation meets the same friction, and the maintainers never hear of it.

A CTOC user, often in a private or client project, needs their CTOC to keep a draft of each friction it meets, on their own machine and without interrupting their work. The frictions are:
- a check that refused a plan;
- a hook that refused;
- a menu route that refused or failed;
- an agent that could not finish its step;
- a workaround of the menu that a session records.

Each draft must hold only CTOC's own facts. Sending one is then a few steps in the sibling stub "The user sees the full request and opens it on GitHub", and the draft carries nothing from the project.

Two things make this hard today:
- **CTOC's own messages carry project data.** **Read:** the check before the build queue refuses with `Plan will create "<path>" …`, where the path comes from the user's project (`src/lib/plan-validator.js:1750-1754`).
  - That check fires in any project whose plan creates a file shaped like one of CTOC's own, such as `src/lib/<name>.js` or `tests/<name>.test.js` (**read:** `src/lib/documented-counts.js:74-86`, `:155-185`).
  - So it is a CTOC rule that other installations really meet, and its message can never be copied as printed.
- **The settings screen claims CTOC publishes on its own.** **Read:** it offers "Auto-publish learnings", on by default (`src/lib/settings.js:73`). That contradicts the owner's rule that nothing leaves a machine unseen.

Constraints:
- No online model call.
- Windows, macOS and Linux.
- Recording a friction inside hook or check code changes hook or gate logic, which changes only with the owner's explicit approval. One question goes to him; see "Decisions Taken Under Ambiguity".

## Business Alignment

**Job to Be Done:** When my CTOC refuses me, fails, or makes me work around it while I work in a private or client project, I want it to keep a draft of that friction on my machine, holding only CTOC's own facts and never interrupting me, so I can send it to the CTOC maintainers when I choose, without anything from my project going with it.

**Impact Map:**
- **Goal:** the decomposition's first goal: a friction met in any installation reaches the CTOC repository, and nothing private goes with it. Noticing and drafting are where every request starts.
- **Actor:** the CTOC user working in a private or client project on Windows, macOS or Linux. This is the vision's first target group.
- **Impact:** the user opens the menu and sees a count of drafts about frictions their CTOC met. Each draft is readable on their machine and holds no value from their project, so the friction is no longer lost.
- **Deliverable:** noticing and drafting, made of these parts:
  - the noticing setting;
  - recording at each friction source;
  - one registry of message templates;
  - the drafts folder;
  - the count line;
  - the draft view;
  - the removal of "Auto-publish learnings".

**Alignment checks:**
- The goal traces to the vision's problem statement, that frictions in other installations stay on their machine: YES.
- The actor is in the vision's target audience: YES.
- The impact is observable, as drafts on disk, a count line and a draft view: YES.
- The deliverable is one functional area, keeping drafts of frictions: YES.

## User Stories

**As a** CTOC user in a private or client project, **I want** a refusal from the check before the build queue kept on my machine as one draft in the request format, with its message reduced to its template, **so that** one real friction reaches a draft end to end with nothing from my project in it.
- INVEST: passes, with two qualified letters.
  - Independent is qualified: it needs the request format, which the format plan builds in the same implementation chain, by its wiring decision.
  - Small is qualified: it carries the first draft, the drafts folder and the template mechanism that every other source reuses.

**As a** CTOC user, **I want** these four things:
- noticing on by default, behind one setting that switches it off;
- one line in the menu with the number of drafts;
- a way to read each draft on my machine;
- no setting that claims CTOC publishes on its own.

**so that** I decide whether drafts are kept, I am never interrupted, and the settings screen tells the truth.
- INVEST: passes. Independent is qualified: the count and the view need a draft from the first story.
- Technical enabler attached: before "Auto-publish learnings" is removed, a read trap runs to confirm that nothing else reads it (see "In Scope").

**As a** CTOC user, **I want** these frictions kept as drafts the same way:
- a menu route that refused or failed;
- an agent that could not finish its step;
- a hook that refused;
- a workaround that a session records through the menu.

**so that** every kind of friction the vision names can reach the maintainers.
- INVEST: passes, with two qualified letters.
  - Small is qualified: there are four sources. If the planner's trace shows one of them is large, the implementation plans split by source.
  - Estimable is qualified: the hook source depends on the owner's answer to the open question.
- Technical enabler attached: tracing where each source's event surfaces (see "In Scope").

## Acceptance Criteria

Common to every scenario:
- The running CTOC copy is the repository under test, and the project is a fake project in a temporary folder.
- "A draft" is a file in `.ctoc/requests/` that the format's reader reads back into its fields.
- Node.js's network functions are replaced by functions that fail the test when called: `fetch`, and the request, connect and lookup functions of `http`, `https`, `net`, `tls` and `dns`. No scenario makes an online model call.
- The tests pass on Windows, macOS and Linux, with the path shapes of all three platforms tested as strings on every platform.
- The scenarios follow the recommended answer to the open question on where CTOC may record a friction. "Decisions Taken Under Ambiguity" says which scenarios change under the other two answers.

### A refusal from the check before the build queue becomes one draft

- [ ] **Scenario: The check before the build queue refuses a plan, and one draft is kept**
  Given a fake project that CTOC has set up, with noticing at its default
  And a plan in technical planning whose `files:` declares `src/lib/report.js`, which does not exist, and does not declare `CLAUDE.md`
  When the plan is moved toward the build queue through the menu, and the check refuses it with the message built at `src/lib/plan-validator.js:1750-1754`
  Then the check's result (its verdict, errors, warnings and checklist) equals the result of the same run with noticing switched off
  And the refusal the menu prints is byte-identical to that run's
  And `.ctoc/requests/` holds exactly one draft, with these fields:
  - CTOC part `src/lib/plan-validator.js`;
  - kind `refusal`;
  - plan stage `implementation`;
  - the running CTOC's version, operating system family and Node.js major version;
  - a fingerprint.

  And its message template is that refusal's template from CTOC's one template registry, with a placeholder where the message held the path, the count class and the count
  And the printed refusal equals that registry template filled with the plan's values
  And its title is built from the kind and the CTOC part only, and its description is empty

- [ ] **Scenario: Nothing from the project reaches a draft, whichever refusal the check builds**
  Given a fake project in which each of these is a unique marker:
  - the project folder name and the repository's top-level folder name;
  - the owner and repository names in the repository's remote address;
  - the git user name and the git e-mail;
  - each plan's file name and title;
  - the declared file's name, declared once with forward slashes and once with backslashes.

  And a plan that refuses with the message of the first scenario
  And a plan that depends on a second plan, which declares the same new file without `CLAUDE.md`. The check refuses the first of these with its other message, which names the second plan twice (`src/lib/plan-validator.js:1743-1747`).
  And a plan with no title, which the check refuses with `Plan missing title (# heading)` (`:1700-1704`)
  When the check refuses each of these plans
  Then the drafts folder holds exactly one draft for each of the three refusal messages
  And no file in the drafts folder holds any marker
  And in the template of the refusal that names the second plan, both plan references are placeholders
  And a refusal whose count could not be read, so that its message has no count phrase (`:1740`), gives the same template and fingerprint as one whose count was read

- [ ] **Scenario: The same friction again keeps one draft, and a newer CTOC refreshes it**
  Given the draft of the first scenario
  When the check refuses the same plan twice more, under the same CTOC version
  Then the drafts folder is byte-for-byte unchanged
  And when the check refuses it again under a newer CTOC version, the folder still holds one draft for that fingerprint, and that draft names the newer version

- [ ] **Scenario: Drafts stay out of git, and CTOC's own folder is never created**
  Given the fake project of the first scenario, once with a `.gitignore` at its root and once without one
  When the check refuses the plan
  Then `git status --porcelain` prints the same before and after, in both cases
  And, given instead a folder that holds the same plan but no `.ctoc/` folder, the refusal leaves no `.ctoc/` folder and no draft behind

- [ ] **Scenario: A failed recording changes nothing at the moment it fails, and the menu says so**
  Given the fake project of the first scenario, with `.ctoc/requests` created as a file instead of a folder, so that every write into it fails on Windows, macOS and Linux
  When the check refuses the plan
  Then the check's result and the printed refusal equal those of the run with noticing switched off, and nothing else is printed
  And the menu's next opening screen shows one line saying that drafts cannot be kept, naming `.ctoc/requests/`

### The setting, the count, reading a draft, and no claim of publishing

- [ ] **Scenario: Noticing is on by default, and one setting switches it off from the menu**
  Given a fresh fake project
  When the route that lists drafts runs through the menu's entry point
  Then its screen says that noticing is on, and offers one option that switches it off
  And after the person chooses that option, the refusal of the first scenario leaves no file in `.ctoc/requests/`
  And the Learning tab of the terminal settings screen (`src/tabs/tools.js:146-184`) shows the noticing setting as OFF
  And after the person switches it on again, from the same screen or from that tab (`src/tabs/tools.js:520-524`), the same refusal leaves exactly one draft

- [ ] **Scenario: The menu shows one line with the number of drafts, and nothing else changes**
  Given two drafts in `.ctoc/requests/`
  When `/ctoc:start` opens on its opening screen (`src/commands/start.js:1058-1069`)
  Then the screen's text holds exactly one line that names two drafts and the menu route that lists them
  And the screen's questions, options and actions are the same as with no drafts
  And running the route that the line names shows the list of the two drafts
  And with no drafts, no such line appears
  And no other route's screen holds the line, a plan's screen included

- [ ] **Scenario: A draft can be read on the person's own machine, and nothing offers to send it**
  Given two drafts, and one file in `.ctoc/requests/` that the format's reader reports as unparsed
  When the route that lists drafts runs
  Then it shows the two drafts' titles, and one line naming one file it could not read, without that file's content
  And opening a draft shows its title and its complete text, byte for byte as stored
  And neither screen offers an action that opens a browser, composes a web address or sends anything. The only actions are going back and switching noticing off or on.

- [ ] **Scenario: No setting claims that CTOC publishes on its own**
  Given a fresh fake project
  And a second fake project whose settings file still holds `learning.autoPublish: true`, as this repository's own does (`.ctoc/settings.json:30`)
  When the Learning tab of the settings screen renders in each
  Then neither lists a setting whose label holds the word "publish"
  And both list the new noticing setting as ON
  And the settings CTOC loads in the second project hold no `autoPublish` value

### Every other kind of friction becomes a draft the same way

- [ ] **Scenario: A menu route that refused or failed is kept as a draft**
  Given the menu's task route, called through the menu's entry point with a subcommand it does not know, the word being a unique marker. It refuses with `Unknown task subcommand: …` (`src/lib/menu-screens.js:3515-3516`).
  And, separately, a menu route that throws an error whose message holds a unique marker, driven through the menu's entry point (`src/commands/start.js:1021`)
  When each runs
  Then the refusal leaves one draft with CTOC part `src/lib/menu-screens.js`, kind `missing route`, and a template with a placeholder where the message held the word
  And the failure leaves one draft with kind `failure` and no message template. Its CTOC part is the CTOC file of the topmost stack frame that lies inside the running CTOC copy, written relative to that copy.
  And neither draft holds the marker, the error's message or any line of its stack

- [ ] **Scenario: An agent that could not finish its step is kept as a draft**
  Given a background task of kind `implement` added through the menu's task route, with a label and a plan reference that are unique markers
  When the session records the task's failure with `menu task fail <id>` (`src/lib/menu-screens.js:3510`)
  Then one draft is kept with kind `failure`, and as its CTOC part the agent definition file under `agents/` that runs tasks of that kind
  And the draft holds neither marker, nor any other word passed to the route

- [ ] **Scenario: The loaded hook's refusal is kept as a draft, and the hook's decision is unchanged**
  Given a background agent's Write of `.ctoc/settings.json` in the fake project. The one hook CTOC loads (`hooks/hooks.json:4-13`) refuses it with its fixed sentence (`src/hooks/protect-records.js:281-283`).
  When the hook runs as a separate process, as Claude Code runs it
  Then its standard output, its standard error and its exit status are byte-identical to those of the run with noticing switched off
  And one draft is kept with CTOC part `src/hooks/protect-records.js`, kind `refusal`, and that sentence as its template

- [ ] **Scenario: A session records a workaround through the menu, and nothing else is accepted**
  Given the new menu route that records a workaround of the menu by hand
  When it is called with a CTOC part that names a file in the running CTOC copy, and the kind `workaround by hand`
  Then one draft is kept holding only these: that part, that kind, the CTOC version, the operating system family, the Node.js major version and the fingerprint
  And it refuses each of these calls, made one at a time with every argument a unique marker:
  - a part that names no CTOC file;
  - a path from the project;
  - an absolute path;
  - an unknown kind;
  - any further word.

  And each refusal names which input broke which rule
  And no refusal holds a marker, and nothing is written

- [ ] **Scenario: Every source obeys the setting and never changes its own outcome**
  Given each source of the other four scenarios of this story
  When each runs once with noticing switched off, and once with `.ctoc/requests` created as a file instead of a folder
  Then with noticing off, no source writes a file in `.ctoc/requests/`, and the workaround route says that noticing is off
  And with the file in place, each source's returned screen, printed output and exit status equal those of its run with noticing off
  And nothing about drafting is printed

## Scope

### In Scope
- **Noticing the check before the build queue.** Its three refusal messages become drafts (`src/lib/plan-validator.js:1700-1704`, `:1743-1747`, `:1750-1754`). (Scenarios: the check before the build queue refuses a plan; nothing from the project reaches a draft.)
- **One template registry.**
  - Every template of a message that can become a draft lives in one registry that CTOC ships.
  - Each message site imports its template from the registry and builds its message from it.
  - The recorder takes a template only by its registry name, never as a string.
  - Every value the message builds in becomes a placeholder.
  - Printed text is never parsed.

  (Scenarios: the check before the build queue refuses a plan; nothing from the project reaches a draft; a menu route that refused or failed; the loaded hook's refusal.)
- **Drafts in the request format.** They are written by the format's writer. The title is built from the kind and the CTOC part only, and the description is empty. (Scenario: the check before the build queue refuses a plan.)
- **One draft per fingerprint.** A repeat leaves the folder unchanged, and a repeat under a newer CTOC version refreshes the draft. (Scenario: the same friction again keeps one draft.)
- **The drafts folder `.ctoc/requests/`.** Git ignores it through its own `.gitignore`, and recording never creates `.ctoc/`. (Scenario: drafts stay out of git.)
- **Recording never changes an outcome.** A failed recording is reported on the menu's next opening screen. (Scenarios: a failed recording changes nothing at the moment it fails; every source obeys the setting.)
- **The noticing setting,** in the Learning category, on by default. It is switched off or on from the drafts list screen, through a menu route, because `/ctoc:start` has no settings screen. (Scenarios: noticing is on by default; every source obeys the setting.)
- **The count line** on the menu's opening screen. (Scenario: the menu shows one line with the number of drafts.)
- **Reading drafts** through a route that lists them and opens one. (Scenario: a draft can be read on the person's own machine.)
- **The doors.** The routes that list drafts, open one, switch noticing off or on, and record a workaround are listed in the route table of `src/commands/start.md`, beside `tasks` and the inbox routes (`src/commands/start.md:31`, `:39-44`, seen in a search result). (Scenarios: the menu shows one line with the number of drafts; noticing is on by default; a session records a workaround.)
- **Removing "Auto-publish learnings"** from the settings schema. (Scenario: no setting claims that CTOC publishes on its own.)
- **The other sources:**
  - a menu route's refusal and its failure;
  - an agent task's recorded failure;
  - the loaded hook's refusal;
  - a new route for recording a workaround.

  (Scenarios: a menu route that refused or failed; an agent that could not finish its step; the loaded hook's refusal; a session records a workaround; every source obeys the setting.)
- **Technical enablers.** The implementation plan records each one before the change it informs.
  - A read trap on `learning.autoPublish` while the full test suite and every menu route run, before the setting is removed. It must observe no read outside the settings screen's render and toggle. If it observes one, the build stops before anything is removed, and the finding comes back to this plan. It informs the scenario "no setting claims that CTOC publishes on its own".
  - For each source: where its event surfaces, and which of its values are CTOC's own facts. This is traced through the call graph or at run time, not by a text search. The partial trace under "Decisions Taken Under Ambiguity" is its starting point. It informs the scenarios of the third story.

### Out of Scope
- **Scanning a draft's text for private data.** This lives in the sibling stub "A blocking scan stops any request carrying private data".
- **Lives in the sibling stub "The user sees the full request and opens it on GitHub":**
  - testing every template this stub registers against the blocking scan (see "Decisions Taken Under Ambiguity" for why it sits there);
  - writing or editing the description;
  - the full preview;
  - composing GitHub's new-issue address and opening it;
  - the fake-project marker test over the full route.
- **The request format itself.** This lives in the sibling stub "A request holds only the allowed facts and a fingerprint". It covers:
  - the field list and the marker line;
  - the reader;
  - the fingerprint formula;
  - the placeholder delimiter and placeholder kinds.
- **Recognising a draft whose fingerprint the maintainers already know.** This lives in the sibling stub "A draft the maintainers already know links to the request".
- **Triage.** This lives in the sibling stub "Maintainers triage grouped requests into vision drafts".
- **The lesson's wording that tells a session to record a friction.** This lives in the plan "The operating lessons say CTOC is built with CTOC and friction is filed as a plan", in the build queue. This stub only lists the workaround route in the menu's list of commands.
- **Recording in hooks that are not loaded.** These include `src/hooks/PreToolUse.Edit.js` and the other hooks named in `.claude-plugin/hooks.json`. **Read:** `docs/ENFORCEMENT.md:3` says they are not registered with Claude Code, so they do not run. Not planned in any stub.
- **The interactive terminal view of the menu** (`src/commands/start.js:1027-1045`). The count line goes on the screen that `/ctoc:start` shows. Not planned in any stub.
- **The CTOC repository's own `.ctoc/settings.yaml` block `learning.publishing`** (`:188-203`).
  - **Read:** it says that auto-publishing is enabled, names `format: github_issue` and the repository, and gives a command `ctoc learning publish <learning-id>`. Whether a program stands behind that command was not checked.
  - A search found no file under `src/` that names it. That is a presence check only.
  - It is not on the settings screen.
  - **Read:** every editing tool is refused on that file (`src/hooks/protect-records.js:16-22`), so changing it is the owner's.
  - Not planned in any stub.
- **The other three Learning settings:** "Cross-agent learning", "Learning mode" and "Self-critique iterations" (`src/lib/settings.js:71-74`). The same trace found no reader for them either. They are not on the vision's list. Not planned in any stub.

## Risks

### Technical Risks
- **Recording on a verdict path changes a verdict, a message or a hook's exit status, or delays the hook.**
  - Likelihood: MEDIUM
  - Impact: HIGH. The check decides whether a plan enters the build queue, and the loaded hook protects the approval records.
  - Mitigation: Test that the result, the printed output and the exit status are byte-identical with noticing on, off and failing. Record only after the verdict is decided. Bound each recording to one settings read and at most one small file write.
- **A project value reaches a draft through a message whose template was not captured where the message is built.**
  - Likelihood: MEDIUM
  - Impact: HIGH. Only the blocking scan and the human's preview stand behind it, and a posted issue cannot be recalled.
  - Mitigation: Put every template in one registry, build each message from its registry template, and let the recorder accept a template only by its registry name. Test each source with unique markers.
- **Drafts show up in git.**
  - Likelihood: LOW. **Believed, not checked:** git applies a `.gitignore` inside a folder to that folder.
  - Impact: MEDIUM
  - Mitigation: Test `git status --porcelain` with and without a root `.gitignore`.
- **Recording creates `.ctoc/` in a folder that CTOC never set up.** **Read:** a fabricated `.ctoc/` makes a folder read as a set-up project and leaves it half set up (`src/lib/enforcement-log.js:38-60`).
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: Test the check's refusal in a folder that has no `.ctoc/`.
- **The check runs on every render of the gate list, and a recorder placed inside it writes on every render.** **Read:** the gate list validates each plan and uses only the verdict (`src/lib/streaming-gate.js:1121`).
  - Likelihood: HIGH, if the recorder sits inside the check.
  - Impact: LOW
  - Mitigation: Test that a repeat leaves the drafts folder byte-for-byte unchanged.

### Business Risks
- **Drafts that record protection working as designed crowd out real frictions.** An example is the loaded hook refusing a forbidden write.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Keep one draft per fingerprint, show only a count, and leave every send to the person.
- **Hook and check code stay closed to recording.** Two of the vision's five kinds of friction are then never noticed. One of them is the count rule that other installations really meet.
  - Likelihood: MEDIUM. This is the owner's call; there is no data.
  - Impact: MEDIUM
  - Mitigation: Carry a walking skeleton for every answer to the open question, as "Decisions Taken Under Ambiguity" records.

### Dependency Risks
- **The format has no caller of its own** (the format plan's decision on wiring).
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Plan the format's module in the same implementation chain as this stub's walking skeleton.
- **A registered template trips the blocking scan, and every request for that friction blocks.**
  - Likelihood: MEDIUM
  - Impact: MEDIUM. Nothing leaks, but the person cannot send.
  - Mitigation: Test every registered template against the scan in the showing and sending stub, which depends on both this stub and the scan.
- **Shared files and documented counts.** This stub edits files that sibling stubs also edit: `src/lib/menu-screens.js`, `src/commands/start.js` and `src/lib/settings.js`. A new file under `src/lib/` moves a documented count, so the walking skeleton's own friction applies to its build (**read:** `src/lib/documented-counts.js:74-86`).
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Declare `CLAUDE.md` in every implementation plan that creates a counted file. Name the shared menu files in each plan, so that whoever schedules can order them.

## Priority

**Priority: HIGH** (Score: 8/9)
- Dependency: 3. The showing and sending stub and the known-requests stub depend on it directly. It is also the first live caller of the request format.
- Business Impact: 3. Every request starts as a draft made here. The removal of "Auto-publish learnings" also makes the settings screen keep the owner's rule that nothing leaves unseen.
- Technical Risk: 2. It uses no new technology. Recording on verdict paths without changing them, and keeping drafts out of git on three platforms, are moderate.

## Decisions Taken Under Ambiguity

- **One question goes to the owner: where CTOC may record a friction.** Recording a check's or a hook's refusal changes hook and gate code, which changes only with his explicit approval.
  - The acceptance criteria follow the recommended answer: record in the check before the build queue and in the one loaded hook.
  - **Under "in the check only":**
    - the scenario "the loaded hook's refusal is kept as a draft" drops;
    - a hook's refusal is never noticed.
  - **Under "in neither":**
    - The walking skeleton moves to the task route's refusal of an unknown subcommand (`src/lib/menu-screens.js:3515-3516`).
    - The five scenarios of the first story are driven by that refusal, with the typed word as the marker. Their CTOC part becomes `src/lib/menu-screens.js` and their kind `missing route`. Their clauses on the check's other two messages and on its count drop.
    - The hook scenario drops.
    - The scenario on a menu route keeps only the failure.
- **Where a source records is the planner's choice, within these rules:**
  - there is at most one draft per fingerprint;
  - the source's result, printed output and exit status do not change;
  - recording never throws into the source;
  - nothing is recorded when noticing is off.

  **Read:** the check's refusal reaches a person in two places. The approve route refuses with it (`src/lib/actions.js:455-463`), and the validation screen prints each error (`src/lib/menu-screens.js:2219-2232`). The gate list runs the same check on every render and uses only its verdict (`src/lib/streaming-gate.js:1121`, `:1710`). Recording inside the check is allowed, because a repeat leaves the folder unchanged.
- **Every template lives in one registry that CTOC ships. Each message site builds its message from its registry template, and the recorder accepts a template only by its registry name.**
  - There is one source, so a message cannot drift from its template. The first scenario's clause "the printed refusal equals that registry template filled with the plan's values" tests this.
  - The format plan's open question asks whether the format refuses every template that CTOC does not ship. Under its recommended answer, the registry is the list the format's writer checks membership against. Under the other answer, the registry is still the drafting side's single source.
  - Under the answer "in neither" to this plan's own question, the registry holds only the menu's templates.
  - A message with no registered template, such as an error a route throws, gives a draft with no template field. The format makes that field optional.
  - The registry's file name and the template names are the planner's.
- **Every value a message builds in becomes a placeholder.** This includes CTOC's own vocabulary, such as the count class. One friction then gets one fingerprint, whatever value it carried.
- **The title.** It is built from the kind and the CTOC part only, for example "CTOC refusal in src/lib/plan-validator.js". The exact words are the planner's.
- **The drafts folder is `.ctoc/requests/`, and it holds its own `.gitignore` holding `*`.**
  - **Read:** setup appends CTOC's ignore lines only to a `.gitignore` that already exists (`src/lib/init-project.js:906-916`). The repair that runs on every opening writes no `.gitignore` line (`:983`).
  - So an entry in the root `.gitignore` would miss projects that have none, and every project already set up.
  - **Believed, not checked in this pass:** git applies a `.gitignore` inside a folder to that folder. The scenario "drafts stay out of git" tests it.
  - Each draft is one file named by its fingerprint, which is hexadecimal and safe as a file name on every platform.
  - **Search:** pattern `\.ctoc/(requests|drafts|friction)` over `src/` matched nothing, so the name is free.
- **Recording never creates `.ctoc/`.** **Read:** this follows the reasons recorded at `src/lib/enforcement-log.js:38-60`.
- **The draft is the record.** Nothing else is stored, so no copy of a project value exists even on the machine.
- **A repeat under a newer CTOC version refreshes the draft's facts.**
  - The vision names stale reports as a risk, and a draft should report the version that still has the friction.
  - The description, which the showing and sending stub lets the person write, is never overwritten by a refresh.
- **The setting gets a new key in the Learning category.**
  - Its label says that drafts stay on this machine, and it does not hold the word "publish". The exact key and label are the planner's.
  - It does not reuse `autoPublish`, because existing settings files hold `autoPublish: true` with the old meaning (**read:** `.ctoc/settings.json:30`).
  - A user who switched "Auto-publish learnings" off still gets the new setting on. Drafting keeps text on the machine and sends nothing, and the owner chose on by default.
- **"Auto-publish learnings" is removed, not relabelled.**
  - The repository's own precedent is to delete toggles that nothing reads (**read:** `src/lib/settings.js:61-64`, `:91-93`).
  - **Trace (static, built by reading every call site that the searches below found):** the only code that reads `learning.autoPublish` is the settings screen. It reads it in its render (`src/tabs/tools.js:147`, `:164`) and in its toggle (`src/tabs/tools.js:523`, through `src/lib/settings.js:323-327`).
    - Every other call of `getSetting` names another category.
    - `getCategorySettings` has no caller.
    - The other code that reads the settings file, directly or through the settings module's raw reader, reads other blocks:
      - `src/lib/deployment.js:59-65`, the deployment block;
      - `src/hooks/SessionStart.js:214-224`, the continuation block;
      - `src/lib/app-runner.js:147-152`, the general block;
      - `src/lib/enforcement-mode.js:109-115`, the workflow block;
      - `src/tabs/tools.js:204-208`, which checks only that the file exists.
    - `src/lib/state.js:526-546` returns the whole file, but a search for `getSettings\(` over `src/` matched only its definition. The repository's baseline of unreachable exports lists it (`.ctoc/export-reachability-baseline.json:58`, found by a search).
    - **Label:** this is a static trace that rests on text searches for call sites. A read through a computed key elsewhere would escape it. That is why the read-trap enabler runs before the removal.
  - The `autoPublish` key left in existing settings files is inert once the schema drops it. **Read:** settings load by schema key (`src/lib/settings.js:236-245`). Background agents may not edit `.ctoc/settings.json` (`src/hooks/protect-records.js:25-31`), and no change is needed.
- **The count line is attached in `src/commands/start.js`.** It goes onto the opening screen's text, the same way the environment notice is attached (**read:** `src/commands/start.js:23-29`, `:1058-1069`).
  - `src/lib/streaming-gate.js` stays unchanged.
  - No question and no option is added.
  - The line names the route that lists drafts.
- **Drafts are read back through the format's reader.** That gives the reader a live caller on the installation side, as the format plan foresaw. A file that does not parse is named as unreadable, never shown and never silently skipped.
- **Proposed route names:**
  - `requests`, which lists the drafts;
  - `requests <n>`, which opens one;
  - `requests noticing off` and `requests noticing on`, which switch the setting;
  - `friction <part> <kind>`, which records a workaround.

  The planner may rename them consistently. With noticing off, the workaround route says so and writes nothing.
- **The setting is switched from the drafts list screen, through a menu route.**
  - **Read:** `/ctoc:start` runs the menu without a terminal (`src/commands/start.js:1046-1059`). No route in the route dispatch opens a settings screen (`src/lib/menu-screens.js:3549-3674`). Settings change through recipes such as `claude:set-environment` (`src/commands/start.md:73`, seen in a search result).
  - The settings screen with its Learning tab exists only in the interactive terminal view (`src/tabs/tools.js:146-184`, `:492-545`).
  - A menu route writes the setting inside the menu's own process, as the menu already does for the files it owns. The terminal tab shows the same value.
- **The doors are the route table in `src/commands/start.md`.**
  - The count line names the route that lists drafts, and the route table lists every new route, as it lists `tasks` and the inbox routes (`src/commands/start.md:31`, `:39-44`, seen in a search result).
  - No question and no option is added to the opening screen. The vision rules out a question box, and the commands screen keeps its four options.
- **Kinds by source:**
  - a check's or a hook's refusal is `refusal`;
  - a route's unknown subcommand is `missing route`;
  - a route that throws, or an agent task's recorded failure, is `failure`;
  - the workaround route is `workaround by hand`.
- **On a platform other than Windows, macOS or Linux, noticing writes nothing.** The format allows only those three operating system families.
- **The test of every registered template against the blocking scan sits in the showing and sending stub, not here.**
  - The scan plan's risk "CTOC's own message templates trip the scan" assigns this test to this stub.
  - Adding the scan to this stub's `depends_on` would lock the build into one chain. The scan's first live caller is the showing and sending stub, which depends on this stub. The scan would then exist before any human could reach it, which the rule "a module is done when a human can reach it" forbids.
  - The showing and sending stub depends on both, so its refinement should carry the test.
  - `depends_on` stays the format only.
- **The format's open question on refusing templates CTOC does not ship, and the scan's open questions on name matching and on gathering machine and branch names.** This plan is correct under every answer:
  - its templates live in one registry that CTOC ships, which the format's writer can check membership against;
  - its marker tests check the drafts folder directly, with unique markers that no template holds.
- **Partial trace of the five sources, for the planner's enabler.** Each item below was read in this pass unless it says otherwise.
  - **The check before the build queue:**
    - messages at `src/lib/plan-validator.js:1700-1704`, `:1743-1747` and `:1750-1754`;
    - reached through `validateTransition` (`:1502-1530`);
    - callers: `src/lib/actions.js:448`, `src/lib/menu-screens.js:2219`, and `src/lib/streaming-gate.js:1121` and `:1710`.
  - **Hooks:**
    - Only `src/hooks/protect-records.js` is loaded (`hooks/hooks.json:4-13`, `docs/ENFORCEMENT.md:3`).
    - Its refusal sentences are constants, for example `:281-285`.
    - A search for write calls in it matched nothing (presence only).
    - The enforcement log is written only by hooks that are not loaded (`src/hooks/PreToolUse.Edit.js:611-620`, `:634-643`; `src/hooks/PreToolUse.Bash.js:902-912`). The calls in `src/hooks/PreToolUse.Task.js:149`, `:166` were found by search and not opened.
    - Whether Claude Code also loads `.claude-plugin/hooks.json` was not checked.
  - **Menu routes:**
    - The route dispatch is at `src/lib/menu-screens.js:3549-3674`.
    - Its result is printed at `src/commands/start.js:1021-1022`, with no catch around the call.
    - Refusals return `ok: false`, often with `refused: true`, for example `src/lib/menu-screens.js:3465-3472` and `:3516`.
  - **Agents:**
    - The task route records a failure at `src/lib/menu-screens.js:3510`.
    - The task kinds are listed at `src/lib/task-registry.js:155-158`.
    - Which agent file runs each kind is for the planner to map.
    - `markTimeout` and `cleanupStale` in `src/lib/background.js` have no caller outside that file (search), so a timed-out agent is not a live source today.
  - **The transition log** records crossings, not refusals (`src/lib/transition-log.js:68-84`). The approve route returns its refusal before anything is written (`src/lib/actions.js:436-464`).
- **Five decomposition stories, plus two spikes, became three stories with attached enablers.** The agent's limit is three stories per stub. The spikes are technical enablers of the stories they inform.
- **No question was asked below the owner's bar.** These are recorded here instead:
  - the folder name;
  - the route names;
  - the setting's key and label;
  - the title's words;
  - the count line's wording;
  - removal rather than relabelling.
- **Overlap check.**
  - The five sibling stubs were read. None of them notices or drafts a friction.
  - Each boundary is named under "Out of Scope".
- **Searches run in this pass:**
  - Pattern `require\([^)]*['"/]settings['".]` over `src/`: 15 lines in 14 files.
  - Pattern `getSetting\(|getCategorySettings\(|loadSettings\(|readRawSettings\(` over `src/`: 29 lines in 8 files, each read.
  - Pattern `settings\.json` over `src/`: 13 files. The four that open `.ctoc/settings.json` themselves were read: `src/lib/state.js`, `src/lib/deployment.js`, `src/hooks/SessionStart.js` and `src/tabs/tools.js`. The match at `src/lib/project-root.js:97` tests only that the file exists; it was seen in the search result and not opened.
  - Pattern `getSettings\(` over `src/`: one line, the definition.
  - Pattern `autoPublish|auto_publish|autopublish|Auto-publish`, case-insensitive, over the repository, leaving out `plans/`, `node_modules/` and `.claude/`: 3 files, `src/lib/settings.js`, `.ctoc/settings.yaml` and `.ctoc/settings.json`.
  - Pattern `learning` over `src/`, leaving out `src/lib/settings.js`: 3 files, none of which reads the category.
  - Pattern `publishing|auto_publish` over the repository, with the same exclusions: 42 files, none under `src/`.
  - Pattern `logEnforcement\(` over `src/`: 6 lines in 4 files.
  - Pattern `appendEntry|logEnforcement|appendFileSync|writeFileSync|durable-log` in `src/hooks/protect-records.js`: no match.
  - Pattern `validateTransition|validateGate\(|validateForTransition` over `src/`: the callers listed above.
  - Pattern `cleanupStale|markTimeout` over `src/`: no caller outside `src/lib/background.js`.
  - Pattern `\.ctoc/(requests|drafts|friction)` over `src/`: no match.
- **Read in this pass (version 6.14.134):**
  - `src/lib/settings.js`, the whole file;
  - `src/tabs/tools.js:1-40`, `:130-225`, `:490-551`;
  - `src/lib/state.js:515-574`;
  - `src/hooks/SessionStart.js:200-235`;
  - `src/lib/deployment.js:50-80`;
  - `src/lib/app-runner.js:140-160`;
  - `src/lib/enforcement-mode.js:100-124`;
  - `src/lib/plan-validator.js:1490-1550`, `:1680-1840`;
  - `src/lib/documented-counts.js`, the whole file;
  - `src/lib/menu-screens.js:132-138`, `:2195-2254`, `:3380-3674`;
  - `src/commands/start.js:1-120`, `:790-1069`;
  - `src/lib/background.js`, the whole file;
  - `src/lib/task-registry.js:150-189`;
  - `src/lib/enforcement-log.js`, the whole file;
  - `src/hooks/PreToolUse.Edit.js:600-647`;
  - `src/hooks/PreToolUse.Bash.js:880-912`;
  - `src/lib/transition-log.js`, the whole file;
  - `src/lib/actions.js:405-514`;
  - `src/lib/init-project.js:900-1000`;
  - `src/hooks/protect-records.js:15-54`, `:255-294`;
  - `src/lib/streaming-gate.js:243-249`, `:1100-1139`, `:1690-1739`;
  - `hooks/hooks.json`, `.claude-plugin/hooks.json`, `.claude-plugin/plugin.json`;
  - `docs/ENFORCEMENT.md:1-12`;
  - `.ctoc/settings.yaml:150-209`;
  - `agents/iron-loop/gate-critic.md:103`, `:163-192`, `:237`.
- **Seen in search results with their surrounding lines, not opened in full:** `src/commands/start.md:31`, `:39-44`, `:73`; `src/lib/menu-screens.js:1818-1878`.
- **Untrusted text.** No instruction in the vision, the decomposition or the sibling stubs was acted on. None asked for anything outside this refinement.
