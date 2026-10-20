---
title: "The vision stubs screen names each stub by its title, not by the shared vision prefix"
created: "2026-10-20T13:41:43.206Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 10
risk_level: MEDIUM
---

# The vision stubs screen names each stub by its title, not by the shared vision prefix

## Problem Statement
Found while filing the plans of this vision on 2026-10-20 and added through the stubs screen's Add a stub route, so it is not in the vision's list of ten. Run: on CTOC v6.14.133, `node src/commands/start.js stubs ctoc-is-built-with-ctoc` rendered the decomposition table with the same text, ctoc-is-built-with-ctoc, in the Stub column of all nine rows, so the owner cannot tell from the screen which plan is which at the moment he is asked to approve the decomposition. Read: `visionStubsBrowse` in `src/lib/menu-screens.js` fills that column with the stub's file name padded and cut to 23 characters (`stub.name.padEnd(23).slice(0, 23)`), and every stub file name starts with the vision's slug (`createStub` in `src/lib/vision-decomposer.js` names it `<vision slug>-<goal slug>`), so any vision slug of 23 or more characters hides every stub's subject; the Scope column is likewise cut to 30 characters of the Problem Statement's first line. Related, read only: "A goal title cannot write extra frontmatter lines into a functional stub" (`plans/functional/goal-titles-cannot-write-frontmatter-lines-into-a-stub.md`), which changes how the stub file name is built. Disposition: new work. Done when a test drives the real stubs screen for a vision whose slug is longer than the column and finds each stub's own title, distinct per row, on the screen.

## Business Alignment

**Job to Be Done:** When a vision has just been decomposed and I am asked to approve its stubs, I want to see each stub named by its own subject, so I can approve, edit or remove the right plan without opening each stub file.

**Impact Map:**
- **Goal:** every plan move the maintainers need is a menu route with usable output. This is the vision's first goal in the decomposition document, and it serves the vision's problem: the coordinator works around the menu by hand when its output cannot be used.
- **Actor:** the owner, who approves or edits a vision's decomposition on the stubs screen, and the coordinator session that shows him that screen. Both are in the vision's target users ("the owner, Tijn van der Zant, and the CTO Chief and background agents that work for him").
- **Impact:** the owner names the stub he wants to keep, edit or remove from the stubs screen alone. Today he cannot, because all nine rows of the 2026-10-20 run showed `ctoc-is-built-with-ctoc`.
- **Deliverable:** the stubs screen names each stub by its full title, shows each stub's scope line whole, and names a stub with a missing or shared title by its file name without the vision prefix.

**Alignment checks:**
1. The goal traces to the vision's problem statement: YES. The vision lists menu output nobody could use as a friction class, and this stub is such output, found while filing that vision.
2. The actor is in the vision's target users: YES (the owner and the coordinator session).
3. The impact is observable: YES. Each stub's own title is on the screen, and no two entries show the same name.
4. The deliverable is one functional area: YES. It is one screen, the stubs screen.

## User Stories

**As the** owner, **I want** each stub on the stubs screen named by its own full title, **so that** I can tell which plan is which when I am asked to approve the decomposition. `[MVP]`
- INVEST: Independent yes. Negotiable yes: it states what is shown, not the layout. Valuable yes: it is the whole fix the Problem Statement asks for. Estimable yes. Small yes: one screen and its test. Testable yes: scenarios 1 to 4.

**As the** owner, **I want** each stub's scope line shown whole on the stubs screen, **so that** I approve the decomposition on what each stub says, not on its first 30 characters.
- INVEST: Independent yes: it changes the Scope column only and needs nothing from the first story. Negotiable yes. Valuable yes: today this vision's scope cells read like "Found while filing the plans o", which tells the owner nothing. Estimable yes. Small yes. Testable yes: scenarios 5 and 6.

**As the** owner, **I want** a stub whose title is missing, empty or shared with another stub named by its file name without the shared vision prefix, **so that** every entry still names its own subject and no two entries look the same.
- INVEST: Independent is qualified. It is the fallback of the first story's naming, so it is built after that story inside this plan, and it is not merged into it (see "Decisions Taken Under Ambiguity"). Negotiable yes. Valuable yes. Estimable yes. Small yes. Testable yes: scenarios 7 to 10.

## Decomposition

Source: this stub was added through the stubs screen's "Add a stub" route after the decomposition document `plans/decomposition/ctoc-is-built-with-ctoc.md` was written, so it is not in that document's table of frictions or its shared-files table. Its decomposition is given here only. Stories marked `[MVP]` are the smallest end-to-end version; the others are the remaining stories, with no phase or schedule (the owner alone chooses what is built and when).

### Friction carried
- From its Problem Statement: "`node src/commands/start.js stubs ctoc-is-built-with-ctoc` rendered the decomposition table with the same text, ctoc-is-built-with-ctoc, in the Stub column of all nine rows, so the owner cannot tell from the screen which plan is which at the moment he is asked to approve the decomposition."
- Re-read in this pass: `visionStubsBrowse` in `src/lib/menu-screens.js` builds the Stub column with `stub.name.padEnd(23).slice(0, 23)` (line 2052) and the Scope column with `(stub.scope || '').padEnd(30).slice(0, 30)` (line 2053).

### Goal: Every plan move the maintainers need is a menu route with usable output
- **Actor:** the owner, who approves or edits a vision's decomposition on the stubs screen, and the coordinator session that drives that screen for him.
- **Impact:** the owner tells every stub apart on the screen itself and approves, edits or removes the right one, without opening each stub file to learn which row is which.
- **Success metric:** a test that drives the real stubs screen for a vision whose slug is longer than the Stub column finds each stub's own title on the screen, distinct per row.

### Activities
1. Open the stubs screen for a decomposed vision.
2. Tell each stub apart by its subject.
3. Act on the right stub (approve all, edit, add or remove).

### Stories
- [ ] `[MVP]` As the owner, I want each row of the stubs screen to name the stub by its own title instead of its file name, so that I can tell which plan is which when I am asked to approve the decomposition.
  - Acceptance: driving the real stubs screen for a vision whose slug is 23 characters or longer, with at least two stubs, shows each stub's `title` from its frontmatter on its row, and no two rows show the same text in the Stub column.
  - INVEST: passes all six; it is buildable alone, states the need (the title, not a particular layout), delivers the whole fix the Problem Statement asks for, is small (one screen function and one test) and has a pass/fail test.
- [ ] As the owner, I want a long title or scope to stay recognisable on the screen, so that a cut column never hides the part that tells two stubs apart.
  - Acceptance: for two stubs whose titles share their first 30 characters, the screen still shows text that differs between the two rows, and a cut value is visibly marked as cut. Whether the column wraps, widens or is cut with a marker is the Product Owner's choice.
  - INVEST: passes; Independent is qualified, because it refines the column the first story fills.
- [ ] As the owner, I want a stub without a readable title to be named by its file name with the shared vision prefix removed, so that even that row names its own subject.
  - Acceptance: a stub whose frontmatter has no `title` is shown by its file name without the leading `<vision slug>-`, and the screen does not fail.
  - INVEST: passes; Independent is qualified for the same reason as the story above.

### Dependencies
- Story level: the two remaining stories are built on the column the first story fills.
- Plan level: none.
- Shared file (a scheduling concern, not a dependency): `src/lib/vision-decomposer.js` with "A goal title cannot write extra frontmatter lines into a functional stub" (`plans/functional/goal-titles-cannot-write-frontmatter-lines-into-a-stub.md`), which changes how a stub's file name is built in `createStub`. This stub reads stub names and titles through the stubs list, so if the fix touches how that list is read, the two must not edit the file at the same time.

## Acceptance Criteria

Every scenario is driven through the real menu route `stubs <vision slug>`, on a temporary project that holds real stub files. "The screen" means the screen text that route returns, which the session shows the owner.

First story: each stub is named by its full title.

- [ ] **Scenario 1: a vision slug of 23 characters no longer hides the stubs**
  Given the vision `ctoc-is-built-with-ctoc` (23 characters) has two stubs written the way the decomposition writes them, titled "Opening the menu in a fresh worktree writes no stray half-filled IRON_LOOP.md" and "The vision stubs screen names each stub by its title, not by the shared vision prefix"
  When the owner opens the stubs screen for `ctoc-is-built-with-ctoc`
  Then each of the two titles appears on the screen in full, character for character, once each
  And the two entries' names differ, and neither entry is named `ctoc-is-built-with-ctoc`

- [ ] **Scenario 2: titles that share a long opening stay apart**
  Given two stubs of one vision titled "The menu prints the exact answer command for every option" and "The menu prints the exact answer command for every question", which share their first 51 characters
  When the owner opens the stubs screen for that vision
  Then both titles appear in full, each ending in its own last word, "option" and "question"

- [ ] **Scenario 3: a title made only of digits does not break the screen**
  Given a vision with three stubs, one of whose frontmatter reads `title: 2026`
  When the owner opens the stubs screen for that vision
  Then the screen opens, that stub's entry is named `2026`, and the other two stubs are listed by their titles

- [ ] **Scenario 4: a title holding a table character keeps its entry whole**
  Given a vision with two stubs, one titled "Export | import of plans"
  When the owner opens the stubs screen for that vision
  Then that stub's entry holds the whole title, with its pipe written either as `|` or, inside a Markdown table, as `\|`
  And the screen lists exactly two stub entries, and that entry's scope line and depends-on value are shown in their own places
  And, if the screen is a Markdown table, every stub row has the same number of unescaped `|` characters as the header row

Second story: each stub's scope line is shown whole.

- [ ] **Scenario 5: a long scope line is not cut**
  Given a stub whose Problem Statement starts with a 200-character first line
  When the owner opens the stubs screen for its vision
  Then all 200 characters of that line appear on that stub's entry, in order
  And the line is not followed by `…` or `...`

- [ ] **Scenario 6: a stub without a Problem Statement still opens the screen**
  Given a vision with two stubs, one of which has no `## Problem Statement` heading
  When the owner opens the stubs screen for that vision
  Then the screen opens, that stub's entry shows its title with an empty scope
  And the other stub's scope line is shown whole

Third story: a stub whose title cannot name it is named by its file name, without the vision prefix.

- [ ] **Scenario 7: a stub without a title**
  Given the vision `ctoc-is-built-with-ctoc` has a stub file `ctoc-is-built-with-ctoc-export-data.md` whose frontmatter has no `title` line
  When the owner opens the stubs screen for `ctoc-is-built-with-ctoc`
  Then that stub's entry is named `export-data`

- [ ] **Scenario 8: a stub with an empty title**
  Given the same stub file, whose frontmatter reads `title: ""` in one run and a title of three spaces in a second run
  When the owner opens the stubs screen for `ctoc-is-built-with-ctoc`
  Then in both runs that stub's entry is named `export-data`

- [ ] **Scenario 9: a title-less stub whose file name lacks the vision prefix**
  Given the vision `ctoc-is-built-with-ctoc` has a stub file `export-and-import.md` with that vision as its parent and no `title` line, as a merge of stubs names its file
  When the owner opens the stubs screen for `ctoc-is-built-with-ctoc`
  Then that stub's entry is named `export-and-import`, whole

- [ ] **Scenario 10: two stubs with the same title**
  Given the vision `ctoc-is-built-with-ctoc` has two stubs both titled "Export data", in the files `ctoc-is-built-with-ctoc-export-data.md` and `ctoc-is-built-with-ctoc-export-data-2.md`
  When the owner opens the stubs screen for `ctoc-is-built-with-ctoc`
  Then both entries show the title "Export data"
  And each of the two entries also shows its own file name without the vision prefix, `export-data` and `export-data-2`, so the two entries differ

## Scope

### In Scope
- The stubs screen names each stub by its full frontmatter title, never cut (scenarios 1, 2, 3, 4).
- The stubs screen shows each stub's scope line (the first line of its Problem Statement) whole, never cut (scenarios 5, 6).
- A stub whose title is missing, empty or only spaces is named by its file name with a leading `<vision slug>-` removed, or by its whole file name when that prefix is absent (scenarios 7, 8, 9).
- Two or more stubs with the same title also show their file names without the vision prefix (scenario 10).

### Out of Scope
- How a stub's file name is built, and how a title is written into the stub. Those belong to "A goal title cannot write extra frontmatter lines into a functional stub" (`plans/functional/goal-titles-cannot-write-frontmatter-lines-into-a-stub.md`).
- The `# REVISION <n>` heading a send-back puts above a plan's title. It belongs to "A plan in the build queue can be sent back to technical planning and keeps its title". This plan reads the frontmatter title, so that heading does not reach this screen.
- The screen's header names the vision by its file name (`[Vision Decomposition] ctoc-is-built-with-ctoc`, and `Vision "ctoc-is-built-with-ctoc" decomposed into …`). Seen, not in this plan; the owner decides whether and when it is filed.
- The Depends on column. It is cut to 10 characters with no marker and shows whatever the stub's `depends_on` line holds. Seen, not in this plan; the owner decides whether and when it is filed.
- The vision-decomposer agent's own stub table in its human-checkpoint instructions (`agents/planning/vision-decomposer.md`, line 409). It also names each stub by `{vision}-{goal}.md` and still prints an "Estimated phases" line. Seen, not in this plan; the owner decides whether and when it is filed.
- Matching stubs to a vision by a substring of `parent_vision`. A vision named `ctoc` would also list this vision's stubs. The same defect in the stub library's listing is already recorded as a neighbour in "A goal title cannot write extra frontmatter lines into a functional stub". Not in this plan; the owner decides whether and when it is filed.
- The screen's choices ("Looks good -- refine all", "Edit stubs", "Add a stub", "Start over", "Back") and the routes they lead to. They are unchanged.

## Risks

### Technical Risks
- An existing screen test pins the defect. `tests/menu-screens-coverage.test.js` line 786 asserts that the file name `stub-one` appears on the stubs screen for a stub titled "One". Once the screen shows the title, that assertion fails.
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Replace that assertion with one that "One" appears on the screen and `stub-one` does not, and write the reason in the implementation plan: the old assertion encodes the file-name defect. Never loosen it or delete it without that replacement.
- The stub list the screen reads carries no title today. `getVisionStubs` (`src/lib/state.js`, lines 606-632) returns the name, path, scope, depends-on value and background status. A title read in a second place could drift from the list.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Read the title once, beside the scope, where the stub list is built, and cover it in the stub list's existing tests in `tests/state-coverage.test.js`.
- A title that is not a string. The frontmatter reader turns `title: 2026` into a number and `title: true` into a boolean, and text-padding a number throws.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Test the digits-only title (scenario 3) before the screen code is written.

### Business Risks
- The full lines make the screen long. This vision's Problem Statement first lines are whole paragraphs, so ten stubs shown in full make a long screen, and the owner may prefer a short one.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Show the owner the real stubs screen for `ctoc-is-built-with-ctoc` in full at the final review, both before and after the change. If he prefers a short screen, the change is the one recorded under "Decisions Taken Under Ambiguity".

### Dependency Risks
- Other plans edit `src/lib/menu-screens.js`. Four plans declare it in `files:`:
  - "CTOC keeps working and asks only what matters"
  - "Every agent compiles, once per update, into a checked structured form that a model can be handed at call time; the prose stays whole and stays the source"
  - "The menu shows a nested folder's settings and creates the missing copies where a plan being built declares them"
  - "Opening the dashboard changes nothing; a dead build goes back to the build queue only when the human names it in `menu task sweep`"

  Three searches were run over `plans/{functional,implementation,todo,in-progress,review}/*.md`:
  - Block-list items written bare or in double quotes, with the pattern `^\s+- "?src/lib/(menu-screens|state)\.js"?\s*$`. This matched four files, all of them for `menu-screens.js`.
  - Single-quoted or backticked items, with the pattern ``^\s+- ['`]src/lib/(menu-screens|state)\.js``. This matched no file.
  - Inline lists, with the pattern `^files:.*(menu-screens|state)\.js`. This matched no file.

  No form matched for `src/lib/state.js`. A plain search for `src/lib/state\.js` over the same folders found it only in prose.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Declare `src/lib/menu-screens.js` and `src/lib/state.js` (with their test files) in the implementation plan's `files:`, so the scheduler serialises by file.
- "A goal title cannot write extra frontmatter lines into a functional stub" changes how titles are written: each title becomes one line, and quotes are kept. It shares no file with this plan, because it declares only `src/lib/vision-decomposer.js` and its test.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Read titles through the same frontmatter reader that plan's tests assert through (`state.parseMetadata`), so a title it writes is the title this screen shows.

## Priority

**Priority: MEDIUM** (Score: 5/9)
- Dependency: 2. It runs in parallel with the other stubs. No stub depends on it, and it depends on none.
- Business Impact: 2. It supports the primary goal, a menu with usable output, at the screen where the owner approves a decomposition. It is not one of the frictions that pushed the coordinator off the menu.
- Technical Risk: 1. It is one screen and the stub list it reads, in well-understood code.

## Decisions Taken Under Ambiguity

- **The title is shown in full, never cut.** Any cut at a fixed number of characters shows the same text for two titles that share that many opening characters. So only the full title guarantees one distinct entry per stub. This also follows the owner's rule to show every item in full. The decomposition left the choice between wrapping, widening and a marked cut to the Product Owner. It is a display choice, not a stack, algorithm, cost or risk question, so it is decided here and not asked. What would flip it: the owner asking for a fixed-width screen. The cut would then end in a visible marker, and scenario 2 would be rewritten around that width.
- **The scope line is shown whole as well.** The 30-character cut showed text such as "Found while filing the plans o", which tells the owner nothing, and a marked cut would still hide what he approves. What would flip it: the owner finding the full screen too long at the final review. Then the scope line is cut at a length he names and ends in a marker. The title is never cut.
- **The title comes from the frontmatter `title` line, not the first `#` heading.** After a send-back the first heading is `# REVISION <n>`, which is the sibling friction "The status line shows a revision instead of the title". Both `createStub` and `mergeStubs` (`src/lib/vision-decomposer.js`, lines 182 and 378) always write a `title:` line.
- **Two stubs with the same title are told apart by their file names without the vision prefix.** File names are unique within `plans/functional/`, so this always differs. `createStub` already gives the second one a `-2` ending (lines 168-173).
- **The vision prefix is removed only when the file name starts with it.** A merged stub is named from the merged name alone (`mergeStubs`, lines 373-374), with no vision prefix.
- **The three stories stay separate.** Merging the fallback story into the first story would put eight scenarios in one story, above the limit of five. The scope-line story does not depend on the first story. The fallback story is built after the first one, inside this plan.
- **Layout is left to the implementation planner.** The criteria state what the screen text holds, not whether it is a table, a list or wrapped lines. They are checked against the text the `stubs` route returns, never against a rendered session. The screen is written as a Markdown table today (`src/lib/menu-screens.js`, lines 2049-2056). That is why scenario 4 accepts an escaped `\|` inside a table. How the session renders that text was not checked.
- **The shared-file claim in the Decomposition section is corrected here, and that section is left as it was written.** The screen reads its rows through `getVisionStubs` in `src/lib/state.js`, not through `listStubs` in `src/lib/vision-decomposer.js`. The search used the pattern `stub\.name|stubs\.map|getVisionStubs|listStubs` over `src/`. It matched three files: `src/lib/state.js`, `src/lib/menu-screens.js` and `src/lib/vision-decomposer.js`. Only `menu-screens.js` renders the stubs screen, and it calls `getVisionStubs`. So this plan shares no file with "A goal title cannot write extra frontmatter lines into a functional stub".
- **Verified in this pass, by reading the source in this worktree:**
  - the Stub and Scope cuts at `src/lib/menu-screens.js` lines 2052-2053;
  - `getVisionStubs` at `src/lib/state.js` lines 606-632, which matches the vision by `includes` at line 616;
  - the frontmatter reader's quote stripping and number conversion at `src/lib/state.js` lines 205-208;
  - stub naming at `src/lib/vision-decomposer.js` lines 159-173;
  - the existing screen test at `tests/menu-screens-coverage.test.js` lines 778-795.

  The run on v6.14.133 in the Problem Statement was not repeated.
- **Overlap check.** The nine sibling stubs of this vision were compared by title and first line, and none covers the stubs screen. The nearest is "A plan in the build queue can be sent back to technical planning and keeps its title", which names a plan by its title on the status line, a different screen.
- **No question for the owner.** No fork here is stack, algorithm, cost or a risk he must accept. Every choice above is a display decision the decomposition handed to the Product Owner.
- **Only this plan file was written.** The dispatch brief limits writes to this file, so no questions file was written under `.ctoc/streaming/questions/pending/`. No status file existed beside this stub, so none was created.
- **The risk level is the highest impact rating, MEDIUM.** The one HIGH likelihood is the screen test that must be replaced, and its impact is LOW. A search for `risk_level` over `src/` matched no file, so no code reads this field.
