---
title: "The vision stubs screen names each stub by its title, not by the shared vision prefix"
created: "2026-10-20T13:41:43.206Z"
type: implementation
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 10
risk_level: MEDIUM
files:
  # The stub list reads each stub's title once, beside its scope line.
  - src/lib/state.js
  # The stubs screen names each row by that title.
  - src/lib/menu-screens.js
  # Each module ships with its own existing test file. No test file is created, so no
  # documented count moves and CLAUDE.md is not declared.
  - tests/state-coverage.test.js
  - tests/menu-screens-coverage.test.js
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

- [x] **Scenario 1: a vision slug of 23 characters no longer hides the stubs** — proved by scenario_1_a_23_character_vision_slug_no_longer_hides_the_stubs and scenario_1_through_start_js_the_live_entry_point
  Given the vision `ctoc-is-built-with-ctoc` (23 characters) has two stubs written the way the decomposition writes them, titled "Opening the menu in a fresh worktree writes no stray half-filled IRON_LOOP.md" and "The vision stubs screen names each stub by its title, not by the shared vision prefix"
  When the owner opens the stubs screen for `ctoc-is-built-with-ctoc`
  Then each of the two titles appears on the screen in full, character for character, once each
  And the two entries' names differ, and neither entry is named `ctoc-is-built-with-ctoc`

- [x] **Scenario 2: titles that share a long opening stay apart** — proved by scenario_2_titles_sharing_51_opening_characters_stay_apart
  Given two stubs of one vision titled "The menu prints the exact answer command for every option" and "The menu prints the exact answer command for every question", which share their first 51 characters
  When the owner opens the stubs screen for that vision
  Then both titles appear in full, each ending in its own last word, "option" and "question"

- [x] **Scenario 3: a title made only of digits does not break the screen** — proved by scenario_3_a_title_made_of_digits_is_shown_as_text
  Given a vision with three stubs, one of whose frontmatter reads `title: 2026`
  When the owner opens the stubs screen for that vision
  Then the screen opens, that stub's entry is named `2026`, and the other two stubs are listed by their titles

- [x] **Scenario 4: a title holding a table character keeps its entry whole** — proved by scenario_4_a_title_with_a_pipe_keeps_its_row_whole
  Given a vision with two stubs, one titled "Export | import of plans"
  When the owner opens the stubs screen for that vision
  Then that stub's entry holds the whole title, with its pipe written either as `|` or, inside a Markdown table, as `\|`
  And the screen lists exactly two stub entries, and that entry's scope line and depends-on value are shown in their own places
  And, if the screen is a Markdown table, every stub row has the same number of unescaped `|` characters as the header row

Second story: each stub's scope line is shown whole.

- [x] **Scenario 5: a long scope line is not cut** — proved by scenario_5_a_200_character_scope_line_is_shown_whole
  Given a stub whose Problem Statement starts with a 200-character first line
  When the owner opens the stubs screen for its vision
  Then all 200 characters of that line appear on that stub's entry, in order
  And the line is not followed by `…` or `...`

- [x] **Scenario 6: a stub without a Problem Statement still opens the screen** — proved by scenario_6_a_stub_without_a_problem_statement_has_an_empty_scope
  Given a vision with two stubs, one of which has no `## Problem Statement` heading
  When the owner opens the stubs screen for that vision
  Then the screen opens, that stub's entry shows its title with an empty scope
  And the other stub's scope line is shown whole

Third story: a stub whose title cannot name it is named by its file name, without the vision prefix.

- [x] **Scenario 7: a stub without a title** — proved by scenario_7_a_stub_without_a_title_is_named_by_its_file_name_without_the_vision_prefix
  Given the vision `ctoc-is-built-with-ctoc` has a stub file `ctoc-is-built-with-ctoc-export-data.md` whose frontmatter has no `title` line
  When the owner opens the stubs screen for `ctoc-is-built-with-ctoc`
  Then that stub's entry is named `export-data`

- [x] **Scenario 8: a stub with an empty title** — proved by scenario_8_an_empty_or_blank_title_falls_back_the_same_way
  Given the same stub file, whose frontmatter reads `title: ""` in one run and a title of three spaces in a second run
  When the owner opens the stubs screen for `ctoc-is-built-with-ctoc`
  Then in both runs that stub's entry is named `export-data`

- [x] **Scenario 9: a title-less stub whose file name lacks the vision prefix** — proved by scenario_9_a_title_less_stub_without_the_prefix_is_named_by_its_whole_file_name
  Given the vision `ctoc-is-built-with-ctoc` has a stub file `export-and-import.md` with that vision as its parent and no `title` line, as a merge of stubs names its file
  When the owner opens the stubs screen for `ctoc-is-built-with-ctoc`
  Then that stub's entry is named `export-and-import`, whole

- [x] **Scenario 10: two stubs with the same title** — proved by scenario_10_two_stubs_with_one_title_also_show_their_file_names
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
- **Invisible and direction-reversing characters are removed in this plan (owner's answer, supersedes the recorded remaining risk).** The technical plan's decision on control characters and the Security Review row "Terminal and table injection" say that bidirectional overrides (U+202E) and zero-width characters (U+200B) pass through "as a remaining risk, not fixed here". The gate critic asked whether to remove them in this plan or build as written with the gap recorded (question `q10-invisible-characters-in-stub-titles-r1792507574090`). The owner answered option 1, "Remove direction-reversing and invisible characters in this plan" (recorded 2026-10-20T17:50:20Z, relayed by the CTO Chief). That answer supersedes the remaining risk: it is no longer remaining. Built as: a module-local `stubText` in `src/lib/menu-screens.js` (`stripCtl`, then removal of `\p{Default_Ignorable_Code_Point}`, `\p{Cf}`, `\p{Zl}`, `\p{Zp}` and U+2800, the class of `stripInvisible` in `src/lib/streaming-gate.js`), used for the stubs screen only; `stripCtl` itself is unchanged. It cleans the title, the file name and the scope text, and `stubRowNames` compares the cleaned names, so two titles that differ only by an invisible character count as the same name and get the `(file: …)` suffix. A title that is empty after this cleaning falls back to the file name. Two tests were added to `tests/menu-screens-coverage.test.js` (red first). The scope line is read with `.`, which stops at U+2028, so a scope line is cut there by the reader before the screen sees it; that is the existing reading of the first line and was not changed.
- **Differences found against the code while building.** `visionStubsBrowse` is at `src/lib/menu-screens.js:2038` and the `stubs` case of `route` at `:3571-3572` (the plan quotes `:2033` and `:3439-3440`; the send-back work moved them). Their contents match what the plan quotes. The test file `tests/menu-screens-coverage.test.js` already imported nothing of `child_process` or the decomposer, so both were added at the top as specified.
- **Fix round after the review and security steps (CTO Chief approved the change list; supersedes the earlier lines named here).**
  - The Depends on cell is no longer frozen byte for byte. A scan reproduced a crash (a `depends_on` read as a number, `true` or a list) and a row split (a `|` in the value); security and a usable screen beat byte-identity. The 10-character cut is kept, and the cell is cleaned by `stubText` and escaped after the cut.
  - The two crashes the technical plan listed as "seen while planning" (a block-list `depends_on`, a digits-only `parent_vision`) are fixed here: `getVisionStubs` reads both as text.
  - The Security Review row "Input validation" was false for Depends on. Now every cell passes `stubText` and `cell`.
  - The row "Terminal and table injection" is superseded: invisible and direction-reversing characters are removed (the owner's answer already recorded above), and `\` and `|` are both escaped, so a backslash cannot undo a pipe's escape.
  - The row "Regular-expression cost" gains two patterns: `/[\\|]/g` (one character) and the scope pattern `/## Problem Statement\r?\n\s*([^#\s].*)/`, linear because `\s` and `[^#\s]` share no character.
  - The premise that no stub has a blank line after `## Problem Statement` was contradicted by two of the three real stubs; the scope line is now found past blank lines and never takes the next heading.
  - Row names are decided on the strings the screen shows, by a ladder of three rungs per row (name; name and prefix-free file name; name and the on-disk file name with hidden characters written `<U+XXXX>`). This supersedes "the whole file name is shown when the prefix-free one is shared", and the optimize step's fixed pass count becomes at most 2n+1 passes. Titles are put in Unicode form NFC first, so one accent written two ways is the same name.
  - A vision name that is not a plain file name (letters, digits, dots, underscores, hyphens; same check as the send-back plan name) is refused before any file is read; the screen then offers Back only. This also closes the empty-name case, where `stubs ''` listed every stub. The path-traversal row of the Security Review is read with this check.
  - The title and scope cells stay uncapped, on the owner's standing rule to show every item in full (the real screen is about 3,500 characters).
  - Left to the owner, outside this plan: `readPlans` removes the first `.md` rather than the last (`src/lib/state.js`); `createStub` lets a goal title or dependency write extra frontmatter lines (the sibling plan); `start.js` sets up a bare folder on its first run; the Depends on column is cut at 10 characters with no marker (it shows `ctoc-is-bu` on the real stubs); stubs are matched by substring of `parent_vision`.

### Technical plan (implementation planner, 2026-10-20)

- **One plan, no slice files.** The whole change is one field and the one screen that reads it: `getVisionStubs` returns the title, and `visionStubsBrowse` shows it. If the field shipped in one slice and the screen in another, the first slice would add a value no live caller reads, which breaks "wire every new module to a live entry point in the same unit of work". The dispatch brief also limits writes to this plan file. So this plan is its own single build unit. It has no `parent_plan`, no slice files and no index. Its `files:` lists four files, one more than the usual three: two modules, each with its own existing test file.
- **The screen stays a Markdown table. Its Stub and Scope cells are no longer padded or cut, and a `|` inside a cell is written `\|`.**
  - This is the smallest change, and it is the layout scenario 4 anticipates.
  - The Depends on cell, which the functional plan lists as out of scope, stays byte for byte as it is: `(stub.dependsOn || '-').padEnd(10).slice(0, 10)`. A list layout would have changed that cell as a side effect.
  - What would flip it: at the final review the owner finds the table hard to read with paragraph-long scope cells. A list layout is then a change to one function.
- **Only `|` is escaped.** `_`, `*` and backticks are left as written, so a title such as "… half-filled IRON_LOOP.md" reaches the screen text character for character (scenario 1).
- **Two rows that would show the same name are told apart as `<name> (file: <file name without the vision prefix>)`.**
  - The check runs over the final names, not over the titles alone. A title can equal another stub's file-name fallback.
  - The prefix-free file names can match too. For example, a merged `export-data.md` and `ctoc-is-built-with-ctoc-export-data.md` both reduce to `export-data`. When that happens, the whole file name is shown instead.
  - File names are unique inside `plans/functional/`, so no two rows show the same name.
  - Counting uses a `Map`, never a plain object, so titles such as `constructor` or `__proto__` count as ordinary text.
- **The title is read once, in `getVisionStubs`, beside the scope (the functional plan's mitigation). The row names are worked out in the screen**, because they need every row and the slug the route was opened with.
  - A missing title, an empty one, or an array (a block list in the frontmatter) reads as `''`.
  - A number or a boolean reads as text: `title: 2026` gives `'2026'`, `title: 0` gives `'0'`, and `title: "false"` gives `'false'`. The frontmatter reader strips the quotes before it converts, so a quoted "false" also becomes the boolean false.
  - The test is `== null`, never a falsy test, so `0` and `false` are never replaced by the file name.
  - "Empty" is decided after control characters are removed and the text is trimmed. A title made only of control characters therefore falls back to the file name too.
- **The scope line is read on Windows line endings as well.** `/## Problem Statement\n(.+)/` finds nothing in a file with Windows (CRLF) line endings, so on a Windows checkout every scope cell is empty today. The pattern becomes `/## Problem Statement\r?\n(.+)/`. `.` stops before the `\r`. This is in scope under the cross-platform rule, and it is the only regular-expression change in `src/`.
- **The naming helper `stubRowNames` stays private.** The dead-export fence (`.ctoc/export-reachability-baseline.json`, `tests/export-reachability.test.js`) counts an export added only so a test can call it. The tests drive it the way a person reaches it, through `route(['stubs', <slug>])`, the same function `start.js` calls.
- **No new test file.** The tests go into the two existing files the functional plan names: `tests/state-coverage.test.js` and `tests/menu-screens-coverage.test.js`. No documented count moves, so `CLAUDE.md` is not declared.
- **One test runs the real command.** It spawns `node src/commands/start.js stubs ctoc-is-built-with-ctoc` in a temporary project and reads `.text` from the JSON it prints. That proves the live entry point. Every other scenario drives `route`, which is the same code path without the process start.
  - Its `spawnSync` `timeout` is a guard against a hang, not a measurement. No test times anything.
- **Control characters are removed with the existing `stripCtl` (`src/lib/menu-screens.js:69`)**, the one sanitiser the module uses for text that agents write. It removes C0 and C1 control characters only.
  - Bidirectional overrides (U+202E) and zero-width characters (U+200B) pass through, as they already do in every other field `stripCtl` cleans. That is recorded as a remaining risk, not fixed here.
  - Two file names that differ only in control characters (possible on a file system that allows them in names) would also show the same file name after cleaning. The row number still tells them apart.
- **Seen while planning, not in this plan.** The owner decides whether and when each is filed. Each was read in the source, not run.
  - A stub whose `depends_on` is a block list reads as an array. `(stub.dependsOn || '-').padEnd(10)` then throws a TypeError, and the whole stubs screen fails (`src/lib/menu-screens.js:2054`).
  - A stub whose `parent_vision` is digits only (`parent_vision: 2026`) reads as a number. `parentVision.includes(visionSlug)` then throws a TypeError, and the whole stubs screen fails (`src/lib/state.js:615-616`).
  - A blank line between `## Problem Statement` and its first line gives an empty scope. `createStub`, `mergeStubs` and the product-owner-written stubs of this vision put no blank line there.
- **No question for the owner.** No fork in this plan concerns technology stack, an algorithm, the security posture, cost, or anything irreversible. The question file therefore carries an empty list.
- **Verified in this pass by reading the source in the main checkout:**
  - `getVisionStubs` (`src/lib/state.js:598-632`), `readPlans` (`:20-86`, where `name` is the file name without `.md`), and `parseFrontmatterLines`' quote strip and conversions (`:204-209`);
  - `stripCtl` (`src/lib/menu-screens.js:69`), `visionStubsBrowse` (`:2033-2088`), `route` (`:3345`) with its `stubs` case (`:3439-3440`), and the exports (`:3466-3487`, where `visionStubsBrowse` is exported and has no caller outside `route`);
  - `main` in `src/commands/start.js` (`:925-970`, which requires `route` at `:948` and calls it at `:966`);
  - `createStub` (`src/lib/vision-decomposer.js:150-214`), `decomposeVision` (`:224-239`) and `mergeStubs`' file name (`:373-378`);
  - the test files `tests/menu-screens-coverage.test.js` (`mkProject` `:39-46`, `writePlan` `:48-52`, cleanup `:159-161`, the stubs tests `:777-795`) and `tests/state-coverage.test.js` (`writePlan` `:47-60`, the `getVisionStubs` tests `:1071-1123`);
  - `validateForQueue` (`src/lib/plan-validator.js:1308-1360`) and `validateStepLabels` (`:1525-1656`).

## Implementation Details

### Architecture Decision

The data layer reads the title, and the screen names the rows. `getVisionStubs` already parses every stub's frontmatter through `readPlans` → `parseMetadata`. It now returns `metadata.title` as trimmed text next to the `scope` it already returns, so the title is read once, by the same reader the sibling plan "A goal title cannot write extra frontmatter lines into a functional stub" asserts through. `visionStubsBrowse` turns those rows into names with one private, pure function, and writes them into the existing table without padding or cutting. Nothing new is read from disk, and nothing is written.

### Dependency Graph

```
src/commands/start.js main()  (the /ctoc:start command, non-interactive branch)
  --calls--> src/lib/menu-screens.js route(['stubs', slug])
    --calls--> visionStubsBrowse(slug, root)                 [MODIFY]
      --calls--> stubRowNames(stubs, slug)                   [new, private]
      --calls--> stripCtl(s)                                 [existing, line 69]
      --calls--> src/lib/state.js getVisionStubs(slug, root) [MODIFY: + title, CRLF scope]
        --calls--> readPlans(dir) --> parseMetadata(content) [existing, unchanged]
tests/state-coverage.test.js        --tests--> getVisionStubs
tests/menu-screens-coverage.test.js --tests--> route(['stubs', ...]) and start.js stubs
```

No new `require`. `menu-screens.js` already imports `getVisionStubs` from `./state` (line 26), and `state.js` imports nothing from `menu-screens.js`, so no cycle can form.

### File Specifications

#### File: `src/lib/state.js`
**Action:** MODIFY
**Purpose:** The stub list returns each stub's frontmatter title as text, and reads the scope line on both line-ending styles.
**Change Type:** modify-existing

Changes, all inside `getVisionStubs` (lines 598-632):
- The JSDoc `@returns` becomes `Array<{ name: string, path: string, title: string, scope: string, dependsOn: string, bgStatus: string }>`. Type checking runs over `src/**/*.js`, so the field must be in the type the screen reads it through. Two sentences go into the description: what `title` holds, and that `scope` is read on both line-ending styles.
- The scope pattern `/## Problem Statement\n(.+)/` becomes `/## Problem Statement\r?\n(.+)/`.
- A `title` is computed and returned between `path` and `scope`:

```js
    // The scope line: the first line of the Problem Statement. `\r?` reads a Windows
    // checkout too; `.` stops before the `\r`.
    const scopeMatch = stub.content.match(/## Problem Statement\r?\n(.+)/);
    const scope = scopeMatch ? scopeMatch[1].trim() : '';
    // The frontmatter title, from the same parser as every other field. That parser
    // turns `title: 2026` into a number and `title: "false"` into a boolean; both are
    // shown as text. A missing title, or a block list in its place, names nothing.
    const rawTitle = stub.metadata.title;
    const title = rawTitle == null || typeof rawTitle === 'object' ? '' : String(rawTitle).trim();

    return {
      name: stub.name,
      path: stub.path,
      title,
      scope,
      dependsOn: stub.metadata.depends_on || 'none',
      bgStatus: stub.bgStatus || 'none'
    };
```

- Signature unchanged: `getVisionStubs(visionSlug: string, projectPath?: string) → Array<{ name, path, title, scope, dependsOn, bgStatus }>`.
- Throws: nothing new. `String()` of a number or a boolean cannot throw, and `== null` and `typeof … === 'object'` turn away every other kind of value before `String()`.
- Example: a stub whose frontmatter holds `title: "  Deliver login  "` and whose body holds `## Problem Statement\r\nDeliver the login flow\r\n` → `{ title: 'Deliver login', scope: 'Deliver the login flow', … }`.
- Called by: `visionStubsBrowse` in `src/lib/menu-screens.js:2040`, its only caller. Searched with the pattern `getVisionStubs` over the whole repository: four files matched. They are `src/lib/state.js` (the definition and its export), `src/lib/menu-screens.js` (the import and the one call), `tests/state-coverage.test.js`, and `tests/compaction-eval/product-owner/baseline-agent.md` (prose only).

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** The vision stubs screen names each row by the stub's own title and shows the scope line whole.
**Change Type:** new-function (private) + modify-existing

New private function, placed directly above `visionStubsBrowse` (line 2033). It is not added to `module.exports`.

```js
/**
 * The name each row of the vision stubs screen shows. Pure: reads no file.
 *
 * A stub is named by its frontmatter title. A stub whose title is empty once control
 * characters are removed is named by its file name without the leading
 * `<vision slug>-` the decomposer gives every stub, or by its whole file name when
 * that prefix is absent (a merged stub) or is all the name holds. A name that more
 * than one row would show gets that row's file name added: the prefix-free one, or
 * the whole one when the prefix-free one is shared as well. File names are unique
 * inside plans/functional/, so no two rows show the same name.
 *
 * @param {Array<{ name: string, title: string }>} stubs - getVisionStubs' rows, in screen order
 * @param {string} visionSlug - the slug the `stubs` route was opened with
 * @returns {string[]} one name per stub, same order, free of control characters
 */
function stubRowNames(stubs, visionSlug) {
  const prefix = `${visionSlug}-`;
  const files = stubs.map((s) => stripCtl(s.name));
  const shorts = files.map((f) => (f.startsWith(prefix) && f.length > prefix.length ? f.slice(prefix.length) : f));
  const bases = stubs.map((s, i) => stripCtl(s.title).trim() || shorts[i]);
  // A Map, never a plain object: a title such as `constructor` is only text.
  const tally = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const baseCount = tally(bases);
  const shortCount = tally(shorts);
  return bases.map((b, i) => (baseCount.get(b) > 1
    ? `${b} (file: ${shortCount.get(shorts[i]) > 1 ? files[i] : shorts[i]})`
    : b));
}
```

Changes in `visionStubsBrowse` (lines 2033-2088). Only the row loop at lines 2051-2056 and the comment above the function change. The header line, the two table header rows, the empty-stubs message, `options`, `actions` and `ask` stay as they are:

```js
    const names = stubRowNames(stubs, slug);
    // A `|` inside a cell is written `\|`, so no title or scope line can split its row.
    const cell = (s) => s.replace(/\|/g, '\\|');
    stubs.forEach((stub, i) => {
      const name = cell(names[i]);
      const scope = cell(stripCtl(stub.scope || ''));
      const deps = (stub.dependsOn || '-').padEnd(10).slice(0, 10);
      text += `  | ${i + 1} | ${name} | ${scope} | ${deps} |\n`;
    });
```

- The comment above `visionStubsBrowse` gets one sentence: each row names the stub by its own title (`stubRowNames`) and shows its scope line whole.
- Signatures: `visionStubsBrowse(slug: string, projectPath?: string) → { text, ask, actions }` is unchanged. `stubRowNames(stubs: Array<{name: string, title: string}>, visionSlug: string) → string[]` is new and private.
- Throws: nothing new. `stubRowNames` reads only strings. `getVisionStubs` always returns a string `title`, and `name` is a file name.
- Example: for the vision `ctoc-is-built-with-ctoc` with two stubs titled "Export data" in `ctoc-is-built-with-ctoc-export-data.md` and `ctoc-is-built-with-ctoc-export-data-2.md`, the rows read `| 1 | Export data (file: export-data) | … |` and `| 2 | Export data (file: export-data-2) | … |` (in readdir order).
- Called by: `route` case `'stubs'` (line 3439-3440). See "Wiring — the live call sites" below.

### Test Plan

Framework: `node:test` with `node:assert`, on real temporary projects, with nothing mocked. The stubs are written either by the real decomposer (`decomposeVision` / `createStub` from `src/lib/vision-decomposer.js`, "the way the decomposition writes them") or by hand where a scenario needs frontmatter the decomposer never writes. No test depends on row order: rows are found by their content, because `readPlans` orders by file birth time, which two files written in the same instant can share. No test measures time.

#### Tests: `tests/state-coverage.test.js`
**Action:** MODIFY. Four tests are added to the existing `describe('getVisionStubs')` block (lines 1074-1123), using the file's own `mkProject` and `writePlan`. Each test uses its own vision slug, because `getVisionStubs` matches by substring.

1. **returns the frontmatter title as trimmed text beside the scope.** The frontmatter is `{ parent_vision: 'title-vision', title: '"  Deliver login  "' }` and the body is `## Problem Statement\nDeliver the login flow`. Expected: `title === 'Deliver login'` and `scope === 'Deliver the login flow'`.
2. **returns a title the reader converts to a number or a boolean as text.** Three stubs of `digits-vision` with `title: 2026`, `title: 0` and `title: "false"`. Expected, found by `name`: `'2026'`, `'0'` and `'false'`, each with `typeof` `'string'`.
3. **returns an empty title when there is none or it is a block list.** One stub has no `title` line. A second is written raw as `---\nparent_vision: list-vision\ntitle:\n  - a\n  - b\n---\n\n## Problem Statement\nS\n`. Expected: `title === ''` for both.
4. **reads the title and the scope line of a plan with Windows line endings.** The plan is written raw as `---\r\ntitle: "Win"\r\nparent_vision: crlf-vision\r\n---\r\n\r\n## Problem Statement\r\nDeliver the login flow\r\n`. Expected: `title === 'Win'` and `scope === 'Deliver the login flow'`, with no `\r` in either.

#### Tests: `tests/menu-screens-coverage.test.js`
**Action:** MODIFY. The tests go into the existing `describe('vision stubs browse')` block (lines 777-795). The file gains these imports and helpers at its top:

```js
const { spawnSync } = require('child_process');
const decomposer = require('../src/lib/vision-decomposer.js');

const MENU_ENTRY = path.join(__dirname, '..', 'src', 'commands', 'start.js');
const VISION = 'ctoc-is-built-with-ctoc'; // 23 characters, the slug of the 2026-10-20 run
const ESC = String.fromCharCode(0x1b);

/** The vision file path the decomposer names stubs from (the file itself need not exist). */
const visionPathIn = (root) => path.join(root, 'plans', 'vision', `${VISION}.md`);

/** Stubs written by the real decomposer for VISION; goals are { title, scope }. */
function decompose(root, goals) {
  return decomposer.decomposeVision(visionPathIn(root), goals, root);
}

/** A stub written by hand, for frontmatter the decomposer never writes. */
function writeRawStub(root, file, frontmatterLines, body = '## Problem Statement\nA scope line.\n') {
  const fm = [...frontmatterLines, `parent_vision: "vision/${VISION}.md"`].join('\n');
  fs.writeFileSync(path.join(root, 'plans', 'functional', `${file}.md`), `---\n${fm}\n---\n\n${body}`);
}

/** The stub rows of the stubs screen, split on the pipes no backslash escapes. */
function stubRows(text) {
  return text.split('\n').filter((l) => /^ {2}\| \d+ \| /.test(l)).map((l) => {
    const cells = l.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
    return { stub: cells[1], scope: cells[2], deps: cells[3], pipes: (l.match(/(?<!\\)\|/g) || []).length };
  });
}
const unescapePipes = (s) => s.replace(/\\\|/g, '|');
const headerPipes = (text) => (text.split('\n').find((l) => l.includes('| # |')).match(/\|/g) || []).length;

/** No two rows name the same stub. */
function assertDistinct(rows) {
  assert.equal(new Set(rows.map((r) => r.stub)).size, rows.length, JSON.stringify(rows.map((r) => r.stub)));
}
```

Every test below opens the screen with `menu.route(['stubs', VISION], root)`, unless it names another slug or the spawned command, and every one ends with `assertDistinct(stubRows(r.text))`.

| # | Test (name in the file) | Setup | Expected |
|---|---|---|---|
| 1 | `decomposed_vision_renders_a_numbered_stub_table` (existing; the line 786 assertion is replaced) | unchanged: `stub-one`, `title: One`, `parent_vision: myvision` | Line 786 `assert.match(r.text, /stub-one/)` becomes `assert.equal(stubRows(r.text)[0].stub, 'One')` plus `assert.ok(!r.text.includes('stub-one'))`. A comment above it records the reason: the old assertion pinned the file-name defect this plan fixes, the screen now names the stub by its title, and the file name `stub-one` does not start with `myvision-` and must not appear. Lines 784, 785 and 787 stay. |
| 2 | `vision_with_no_stubs_shows_the_empty_message` (existing) | unchanged | unchanged |
| 3 | `scenario_1_a_23_character_vision_slug_no_longer_hides_the_stubs` | `decompose` with "Opening the menu in a fresh worktree writes no stray half-filled IRON_LOOP.md" and "The vision stubs screen names each stub by its title, not by the shared vision prefix" (scopes "Scope one." and "Scope two.") | The Stub cells, as a set, are exactly the two titles. Each title occurs in `r.text` exactly once (`text.split(title).length - 1 === 1`). No Stub cell equals `VISION` or starts with `${VISION}-`. |
| 4 | `scenario_1_through_start_js_the_live_entry_point` | the same two stubs. `spawnSync(process.execPath, [MENU_ENTRY, 'stubs', VISION], { cwd: fs.realpathSync(root), encoding: 'utf8', env, timeout: 30000 })`, where `env` is `process.env` without `CLAUDE_PROJECT_DIR` | `status === 0` (the message carries `stderr`). `JSON.parse(stdout).text` gives two rows whose Stub cells are exactly the two titles. |
| 5 | `scenario_2_titles_sharing_51_opening_characters_stay_apart` | `decompose` with "The menu prints the exact answer command for every option" and "The menu prints the exact answer command for every question" | The Stub cells are exactly those two titles. One ends in "option" and one in "question". The test first asserts in the test itself that the two titles share their first 51 characters. |
| 6 | `scenario_3_a_title_made_of_digits_is_shown_as_text` | `writeRawStub(root, `${VISION}-year`, ['title: 2026'])` and `decompose` with the titles "Alpha plan" and "Beta plan" | Three rows. The Stub cells are exactly `2026`, `Alpha plan` and `Beta plan`. |
| 7 | `titles_read_as_zero_or_false_are_shown_as_text` | raw stubs `${VISION}-zero` (`title: 0`) and `${VISION}-no` (`title: "false"`) | The Stub cells are exactly `0` and `false`. |
| 8 | `scenario_4_a_title_with_a_pipe_keeps_its_row_whole` | `decompose` with `{ title: 'Export \| import of plans', scope: 'Move plans in \| out' }` and `{ title: 'Second plan', scope: 'Other.' }` | Exactly two rows. Every row's `pipes` equals `headerPipes(r.text)`. For the pipe row, `unescapePipes(stub) === 'Export \| import of plans'`, `unescapePipes(scope) === 'Move plans in \| out'` and `deps === 'none'`. |
| 9 | `scenario_5_a_200_character_scope_line_is_shown_whole` | `decompose` with the scope `Array.from({ length: 200 }, (_, i) => String.fromCharCode(97 + (i % 26))).join('')` (asserted to be 200 long), title "Long scope" | That row's `scope` equals the 200 characters exactly, so it is uncut and carries no `…` or `...`. |
| 10 | `scenario_6_a_stub_without_a_problem_statement_has_an_empty_scope` | `writeRawStub(root, `${VISION}-bare`, ['title: "No statement"'], '# No statement\n\nJust text.\n')` and `decompose` with `{ title: 'With statement', scope: 'The whole scope line stays.' }` | The screen opens. The row "No statement" has `scope === ''`. The row "With statement" has the scope `The whole scope line stays.` |
| 11 | `scenario_7_a_stub_without_a_title_is_named_by_its_file_name_without_the_vision_prefix` | `writeRawStub(root, `${VISION}-export-data`, ['type: stub'])` | The Stub cells are exactly `export-data`. |
| 12 | `scenario_8_an_empty_or_blank_title_falls_back_the_same_way` | two projects: `${VISION}-export-data` with `title: ""` in one and `title: "   "` in the other | In both, the Stub cells are exactly `export-data`. |
| 13 | `scenario_9_a_title_less_stub_without_the_prefix_is_named_by_its_whole_file_name` | `writeRawStub(root, 'export-and-import', ['type: stub'])` | The Stub cells are exactly `export-and-import`. |
| 14 | `scenario_10_two_stubs_with_one_title_also_show_their_file_names` | `decomposer.createStub(VISION, { title: 'Export data', scope: 'A.' }, visionPathIn(root), root)` twice, which gives `${VISION}-export-data.md` and `${VISION}-export-data-2.md` | The Stub cells, as a set, are `Export data (file: export-data)` and `Export data (file: export-data-2)`. |
| 15 | `a_shared_title_whose_prefix_free_file_names_match_shows_the_whole_file_names` | raw `export-data` and raw `${VISION}-export-data`, both `title: "Export data"` | The Stub cells, as a set, are `Export data (file: export-data)` and `Export data (file: ${VISION}-export-data)`. |
| 16 | `a_title_equal_to_another_stubs_fallback_name_still_differs` | raw `${VISION}-something` with `title: export-data`, and raw `${VISION}-export-data` with no title | The Stub cells, as a set, are `export-data (file: something)` and `export-data (file: export-data)`. |
| 17 | `a_file_name_that_is_only_the_vision_prefix_is_shown_whole` | raw `${VISION}-` with no title | The Stub cells are exactly `${VISION}-`. |
| 18 | `control_characters_never_reach_the_stubs_screen` | raw `${VISION}-clear` with `title: "Clear ${ESC}[2J screen"` and body `## Problem Statement\nScope ${ESC}[2J line\n`. Raw `${VISION}-bell` whose title holds only `\x07` and ESC | `r.text` holds no character in `\x00-\x1f` other than `\n`, and none in `\x7f-\x9f`. The Stub cells, as a set, are `Clear [2J screen` and `bell`. The clear row's scope is `Scope [2J line`. |
| 19 | `titles_named_like_object_properties_are_ordinary_text` | raw stubs titled `constructor`, `__proto__` and `toString` | The Stub cells, as a set, are exactly those three words, none with a `(file: …)` suffix. |

In row 8, `\|` is only this plan's own table escaping. The strings in the test hold a plain `|`: the title `'Export | import of plans'` and the scope `'Move plans in | out'`. In rows 6, 11-13 and 15-18, a file name such as `${VISION}-year` is the file name without `.md`, as `writeRawStub` takes it.

Expected result when the tests are first run, before any code change (recorded in the plan at that step):
- **Red:** in `tests/state-coverage.test.js`, tests 1-4 fail, because `title` is `undefined` and test 4's scope is `''`. In `tests/menu-screens-coverage.test.js`, tests 1, 3-12 and 14-19 fail:
  - Before the change the Stub cell holds the file name cut to 23 characters, and the Scope cell holds 30 characters. Test 9 therefore fails on its cut scope, and test 18 fails because the escape byte sits inside the first 30 characters of the scope.
  - Test 17 fails because the 24-character name `ctoc-is-built-with-ctoc-` is cut to 23.
- **Green:** test 2, and test 13, because `export-and-import` has 17 characters and fits the old 23-character cell unchanged. Test 13 guards the fallback branch for a name without the prefix. Every other existing test in both files stays green.

Coverage target: every new line and both arms of every new condition in `getVisionStubs` and `stubRowNames` are run by the tests above:
- `== null` / object / text: state tests 2 and 3;
- prefix found or not: menu tests 11 and 13;
- the length guard: menu test 17;
- shared name or not: menu tests 14 and 3;
- shared short name or not: menu tests 15 and 14.

The suite floor is `.ctoc/coverage-baseline.json` `minPct` (99).

### Security Review

| Check | Result |
|---|---|
| Path traversal | Pass. No path is built from input. The route's `slug` is used only in `parentVision.includes(slug)`, in the header text and in a `startsWith` comparison. `getVisionStubs` reads only `path.join(<root>, 'plans', 'functional')`. |
| Input validation | Pass. The title is turned into text and trimmed (`== null` or object gives `''`). Every value shown in a cell passes `stripCtl`. A `|` in a cell is escaped, so a title or scope line cannot add a column or a row. |
| No secrets | Pass. No key, token or password appears in the code or the tests. |
| Safe file operations | Pass. `getVisionStubs`, `stubRowNames` and the row loop in `visionStubsBrowse` write nothing. The tests write only under `os.tmpdir()`. The file's existing `afterEach` (line 159-161) removes them. |
| Error messages | Pass. No new message. |
| Prototype pollution | Pass. Counting uses a `Map`. No object is merged from input. Menu test 19 pins it. |
| Command injection | Pass. No shell. The one spawned test uses `spawnSync(process.execPath, [file, …args])` without a shell, with fixed arguments. |
| Terminal and table injection | C0 and C1 control characters are removed (menu test 18), and `|` is escaped (menu test 8). Remaining: bidirectional overrides and zero-width characters pass `stripCtl`, as in every other field it cleans. Recorded under Decisions. |
| Text that agents write reaching the session | Unchanged trust boundary. Titles and scope lines are plan text from this repository, written by CTOC's agents or the owner. The `plan <ref>` screen already shows whole plan bodies to the session. This plan shows more of the same text (whole titles and scope lines instead of 23 and 30 characters), and the session reads it as screen data. |
| Regular-expression cost | Linear by construction, with no timing test (owner's constraint). `/\|/g` matches one character. `/## Problem Statement\r?\n(.+)/` is a fixed literal, an optional `\r`, `\n`, and one greedy run of non-line-break characters, with no nested or adjacent quantifiers. The test-only `(?<!\\)\|` is a single character with a one-character lookbehind. |

### Architecture and quality checks

- Dependencies flow from the command (`start.js`) to the screen (`menu-screens.js`) to the data (`state.js`). No library module imports a hook or a command.
- Open/closed: `getVisionStubs` gains a field. No existing field changes, except that the scope is now also read on Windows line endings.
- Interface segregation: `stubRowNames` takes only the rows and the slug.
- Single responsibility: `getVisionStubs` reads, and `stubRowNames` names.
- Cross-platform: Windows line endings in the scope line. In the tests, `path.join`, `os.tmpdir`, `fs.realpathSync`, and `process.execPath` in place of `node`. No shell script.
- Existing tests: only line 786 changes, with its reason. Every other assertion in both files stands.

## Wiring — the live call sites

No new module and no new export.
- **`stubRowNames`** is private. It has one caller, `visionStubsBrowse` (`src/lib/menu-screens.js`).
- **The new `title` field of `getVisionStubs`** has one reader, the same `visionStubsBrowse`.
- **`visionStubsBrowse`** is called by `route` (`src/lib/menu-screens.js:3345`), case `'stubs'` (`:3439-3440`).
- **`route`** is called by `main()` in `src/commands/start.js` (`:948` requires it, `:966` calls it) when the command line carries words. Its output is printed as JSON, and the session shows its `text`.
- **Root:** the shipped slash command `/ctoc:start`. Its route table lists `stubs {slug}` as "Vision stubs browse (human checkpoint)" (`src/commands/start.md:37`).
- **The screen is reached two ways:**
  - The human or the coordinator names the route: `node src/commands/start.js stubs <vision slug>`.
  - A finished decompose task names it as its next step. `menu task complete <id> --next "stubs <slug>"` is accepted, and the task detail screen offers that step (`tests/menu-task-wiring.test.js:831-840`, which `src/lib/task-view.js:76` holds to the read-only route shape `stubs <slug>`).
- Menu test 4 drives the root end to end. The rest drive `route`, the same function `main()` calls.

## Implementation Order

1. MODIFY `tests/state-coverage.test.js`: tests 1-4. They depend on nothing new.
2. MODIFY `tests/menu-screens-coverage.test.js`: the helpers, tests 3-19, and the replaced assertion in test 1. They depend on `src/lib/vision-decomposer.js` (unchanged) and on `src/commands/start.js` (unchanged).
3. Run both test files and record red and green as the Test Plan expects.
4. MODIFY `src/lib/state.js`: `getVisionStubs` returns `title` and reads Windows line endings. It depends on `readPlans` and `parseMetadata` (unchanged).
5. MODIFY `src/lib/menu-screens.js`: add `stubRowNames` and change the row loop of `visionStubsBrowse`. It depends on step 4's `title` and on `stripCtl` (unchanged).

## Acceptance Criteria Mapping

| Criterion | Implemented in | Test |
|---|---|---|
| Scenario 1: a 23-character slug no longer hides the stubs | `getVisionStubs` `title`; `stubRowNames`; uncut Stub cell | menu tests 3 and 4 (and 1) |
| Scenario 2: titles sharing a long opening stay apart | uncut Stub cell | menu test 5 |
| Scenario 3: a digits-only title does not break the screen | `String(rawTitle)` in `getVisionStubs` | menu tests 6 and 7; state test 2 |
| Scenario 4: a title holding a table character keeps its entry whole | `cell()` escaping in `visionStubsBrowse` | menu test 8 |
| Scenario 5: a long scope line is not cut | uncut Scope cell | menu test 9 |
| Scenario 6: a stub without a Problem Statement still opens the screen | `scope` `''` (unchanged) and the title shown | menu test 10 |
| Scenario 7: a stub without a title | `stubRowNames` fallback with the prefix removed | menu test 11; state test 3 |
| Scenario 8: a stub with an empty title | `.trim()` and the fallback | menu test 12 |
| Scenario 9: a title-less stub without the prefix | `stubRowNames` whole-name fallback | menu test 13 |
| Scenario 10: two stubs with the same title | `stubRowNames` adds the file name | menu tests 14 and 15 (and 16) |
| Cross-platform: the scope line on a Windows checkout | `\r?\n` in `getVisionStubs` | state test 4 |

No criterion is left without an action and a test.

## Risk Mitigations

| Risk (from the functional plan) | Mitigation | Where |
|---|---|---|
| An existing screen test pins the defect (line 786) | Replaced by "One" present and `stub-one` absent, with the reason in a comment, never loosened or deleted | `tests/menu-screens-coverage.test.js:786` |
| The stub list carries no title, and a second read could drift | The title is read once, in `getVisionStubs`, through `parseMetadata` | `src/lib/state.js` `getVisionStubs`; state tests 1-4 |
| A title that is not a string (`2026`, `0`, `"false"`) | `== null` / object check, then `String()` | `getVisionStubs`; menu tests 6 and 7, state test 2, written and run red first |
| The full lines make the screen long | The owner is shown the real screen before and after in full at the final review. The recorded fallback is to cut the scope at a length he names, with a marker, and never cut the title. | Steps 9 and 16 below |
| Other plans edit `src/lib/menu-screens.js` | All four files are declared in `files:`, so the scheduler runs plans that share a file one after another | frontmatter |
| The sibling plan changes how titles are written | Titles are read through `parseMetadata`. The test fixtures are written by the real `createStub` / `decomposeVision`, so a title format that plan changes reaches these tests. | menu tests 3-5, 8-10 and 14 |

## Execution Plan

### Step 8: TEST
- [x] Write the four `getVisionStubs` tests in `tests/state-coverage.test.js`, and the helpers, the seventeen new screen tests and the replaced line 786 assertion (with its reason comment) in `tests/menu-screens-coverage.test.js`, exactly as the Test Plan specifies. Tests are written before any code (test-driven development).
- [x] Run `node --test tests/state-coverage.test.js tests/menu-screens-coverage.test.js` before any code change. Record in this plan, per test, red with the reason the Test Plan names, or green as it names. A test that is green where the Test Plan expects red is a test that does not test the change: fix the test before going on.

### Step 9: PREPARE
- [x] Re-read `getVisionStubs`, `readPlans` and `parseFrontmatterLines` in `src/lib/state.js`, `stripCtl`, `visionStubsBrowse`, `route` and its `stubs` case in `src/lib/menu-screens.js`, `main` in `src/commands/start.js`, and `createStub` and `decomposeVision` in `src/lib/vision-decomposer.js`. If any differs from what this plan quotes, line numbers included, follow the code and record the difference.
- [x] Record the screen as it is today. From the repository root of the tree being built, run `node src/commands/start.js stubs ctoc-is-built-with-ctoc` and keep the whole `.text` for the final review. Compare `git status --porcelain` before and after the run.
  - If an untracked `IRON_LOOP.md` appears at the root, that is the sibling defect "Opening the menu in a fresh worktree writes no stray half-filled IRON_LOOP.md". It is outside this plan's `files:`, so leave it in place, never stage or commit it, and record it as evidence of that defect.
  - Any other change is a finding to report.

### Step 10: IMPLEMENT
- [x] `src/lib/state.js`: in `getVisionStubs`, the `\r?` in the scope pattern, the `rawTitle` / `title` lines, `title` in the returned row, and the JSDoc `@returns` with `title: string`, exactly as specified.
- [x] `src/lib/menu-screens.js`: the private `stubRowNames` above `visionStubsBrowse`, and in `visionStubsBrowse` the `names` and `cell` lines and the new row loop, exactly as specified. The header, the table header rows, the Depends on cell, `options`, `actions`, `ask` and `module.exports` are untouched.
- [x] Rerun the command from the test step: every test green.

### Step 11: REVIEW
- [x] Dispatch `iron-loop-critic` with these attacks:
  - find two stubs of one vision whose rows show the same Stub cell;
  - find a title or scope line that adds an unescaped `|` to its row or breaks it across lines;
  - find frontmatter that makes `getVisionStubs` or `stubRowNames` throw, beyond the two crashes this plan records as seen and leaves out;
  - confirm the Depends on cell, the header, the options and the actions are byte for byte unchanged;
  - confirm `module.exports` gained nothing;
  - confirm the replaced line 786 assertion is stricter than before and carries its reason.

### Step 12: OPTIMIZE
- [x] Confirm no extra file read: the title comes from the metadata `readPlans` already parsed. Confirm `stubRowNames` makes a fixed number of passes over the rows (three maps and two tallies). No change is expected.

### Step 13: SECURE
- [x] Dispatch `security-scanner` on the diff with the Security Review table above. It confirms that control characters cannot reach the screen, that no cell can split its row, that no path is built from the slug, that nothing is written, and that both regular expressions are linear from their form. Nothing is timed.

### Step 14: VERIFY
- [x] Run `npm test`: `# fail 0`, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [x] Run `npx eslint --max-warnings 0 src/lib/state.js src/lib/menu-screens.js tests/state-coverage.test.js tests/menu-screens-coverage.test.js` and `npm run typecheck`: both clean.
- [x] Run `node --test tests/export-reachability.test.js tests/reachability.test.js tests/false-green-fence.test.js`: all green, with no baseline file changed.

### Step 15: DOCUMENT
- [x] The JSDoc of `getVisionStubs` (the `title` field and both line-ending styles), the JSDoc of `stubRowNames`, and the one-sentence comment above `visionStubsBrowse`, as specified.
- [x] No other document changes. `src/commands/start.md:37`, `docs/ENFORCEMENT.md:481` and `README.md:617` name the `stubs` route, not its columns. A search for the pattern `\| Stub +\||Vision stubs browse|stubs \{slug\}|stubs <slug>|stubs screen` over the repository, outside `plans/` and `.claude/`, found no other description of the screen's cells. The decomposer agent's own table (`agents/planning/vision-decomposer.md:407`) is out of scope.

### Step 16: FINAL-REVIEW
- [x] Dispatch `iron-loop-critic` against the ten scenarios. Each box quotes the test that proves it and its result.
- [ ] Put the stubs screen for `ctoc-is-built-with-ctoc` in front of the owner in full, both as recorded in the preparation step and as `node src/commands/start.js stubs ctoc-is-built-with-ctoc` prints it on the built tree, with the review result. The same rule applies to a stray file: an untracked `IRON_LOOP.md` is left in place, never staged, and recorded. If he finds the full lines too long, the recorded fallback applies: the scope is cut at a length he names, with a marker, and the title is never cut.

## Execution Record (Steps 8–16)

### Step 8: TEST (red, before any code change)
Command: `node --test tests/state-coverage.test.js tests/menu-screens-coverage.test.js` — 204 tests, 181 pass, 23 fail, 0 skipped.
- `tests/state-coverage.test.js` (`getVisionStubs`), all four red as the Test Plan expects: returns the frontmatter title as trimmed text beside the scope (`title` undefined); returns a title the reader converts to a number or a boolean as text (undefined); returns an empty title when there is none or it is a block list (undefined, not `''`); reads the title and the scope line of a plan with Windows line endings (`title` undefined).
- `tests/menu-screens-coverage.test.js` (`vision stubs browse`):
  - red, reason as the Test Plan names (Stub cell holds the file name cut to 23 characters, Scope cell cut to 30): `decomposed_vision_renders_a_numbered_stub_table` (replaced assertion: `stub-one` shown instead of `One`), `scenario_1_a_23_character_vision_slug_no_longer_hides_the_stubs`, `scenario_1_through_start_js_the_live_entry_point`, `scenario_2_titles_sharing_51_opening_characters_stay_apart`, `scenario_3_a_title_made_of_digits_is_shown_as_text`, `titles_read_as_zero_or_false_are_shown_as_text`, `scenario_4_a_title_with_a_pipe_keeps_its_row_whole` (6 unescaped pipes, header 5), `scenario_5_a_200_character_scope_line_is_shown_whole` (30 characters shown), `scenario_6_a_stub_without_a_problem_statement_has_an_empty_scope`, `scenario_7_…`, `scenario_8_…`, `scenario_10_…`, `a_shared_title_whose_prefix_free_file_names_match_shows_the_whole_file_names`, `a_title_equal_to_another_stubs_fallback_name_still_differs`, `a_file_name_that_is_only_the_vision_prefix_is_shown_whole` (24-character name cut to 23), `control_characters_never_reach_the_stubs_screen` (escape byte inside the first 30 scope characters), `titles_named_like_object_properties_are_ordinary_text`.
  - red, for the owner's answer on invisible characters: `direction_reversing_and_invisible_characters_never_reach_the_stubs_screen` (U+202E, U+200B, U+2028 and U+2800 reached the screen) and `two_titles_differing_only_by_an_invisible_character_count_as_the_same_name` (no `(file: …)` suffix, both rows showed the file name cut).
  - green, as the Test Plan expects: `vision_with_no_stubs_shows_the_empty_message` and `scenario_9_a_title_less_stub_without_the_prefix_is_named_by_its_whole_file_name` (`export-and-import` fits the old 23-character cell). Every other existing test in both files stayed green.
- The replaced assertion carries its reason in a comment beside it, and is stricter: it asserts the Stub cell is exactly `One` and that `stub-one` does not appear anywhere on the screen.

### Step 9: PREPARE
- Re-read: `getVisionStubs`, `readPlans`, `parseFrontmatterLines` (`src/lib/state.js`), `stripCtl` (`src/lib/menu-screens.js:69`), `visionStubsBrowse` (`:2038`), `route` and its `stubs` case (`:3571-3572`), `createStub` and `decomposeVision` (`src/lib/vision-decomposer.js`). Contents match the plan; only line numbers moved (see Decisions Taken Under Ambiguity).
- The screen as it is today: `node src/commands/start.js stubs ctoc-is-built-with-ctoc` from this tree printed (exit 0) a three-row table. The Stub column held `a-finished-plan-can-be-`, `ctoc-is-built-with-ctoc` and `the-gate-critic-sends-t`; Scope was empty for rows 1 and 3 and `The background-agent protectio` for row 2; Depends on was `ctoc-is-bu`, `none`, `ctoc-is-bu`. The whole `.text` is kept in the session scratch folder for the final review.
- `git status --porcelain` before and after the run was identical; no `IRON_LOOP.md` appeared. No other change.

### Step 10: IMPLEMENT
- `src/lib/state.js`: `getVisionStubs` returns `title`, scope pattern reads `\r?\n`, JSDoc `@returns` carries `title: string`.
- `src/lib/menu-screens.js`: module-local `stubText` (control plus invisible characters), private `stubRowNames`, and in `visionStubsBrowse` the `names` / `cell` lines and the new row loop. Depends on cell, header, options, actions, `ask` and `module.exports` untouched.
- Rerun of the same command: 204 tests, 204 pass, 0 fail, 0 skipped. `npx eslint --max-warnings 0` on the four files: clean. `npm run typecheck`: `# fail 0`.
- The screen on the built tree now names the stubs by their full titles and shows scope lines whole (kept in the session scratch folder beside the before capture).

### Fix round after Steps 11 and 13 (seven approved changes, each test red first)
- Change 1, no frontmatter value stops the screen (`getVisionStubs` reads `parent_vision` and `depends_on` as text). Red before: state `returns depends_on as text whatever the reader made of it`, state `a plan whose parent_vision is not text does not stop the stub list`, and menu `a_depends_on_read_as_a_number_true_or_a_list_does_not_stop_the_screen` (TypeError: parentVision.includes is not a function; shown by putting the two old lines back for one run, then restoring). Green after: all three.
- Change 2, every cell cleaned and escaped the same way (`cell` escapes `\` and `|`; Depends on is cleaned, cut at 10 characters, then escaped). The test helper now splits a row on a `|` only when an even run of backslashes precedes it, with the reason written beside it, and `unescapePipes` became `unescapeCell`; every earlier assertion is kept. Red before: `a_depends_on_value_cannot_split_its_row_or_carry_hidden_characters`, `a_backslash_before_a_pipe_cannot_split_the_row`. Green after: both, and `scenario_4_a_title_with_a_pipe_keeps_its_row_whole` stays green.
- Change 3, no two rows show the same name (ladder in `stubRowNames`, `stubText` also folds to NFC). Red before: `a_title_that_reads_like_another_rows_suffixed_name_still_differs`, `file_names_that_differ_only_by_a_hidden_character_are_shown_apart` (including the two files named only by U+200B and U+200D; the file system accepted both names), `titles_written_with_one_accent_two_ways_count_as_the_same_name`. Green after: all three; the expected strings were as written in the change list, none adjusted. Scenario 10, the shared-name, fallback-name, vision-prefix-only, object-property and invisible-title tests stay green.
- Change 4, a vision name that is not a plain file name is refused (uses the existing `SEND_BACK_PLAN_RE`, `/^[A-Za-z0-9_][A-Za-z0-9._-]*$/`, which exists in this tree). Red before: `a_vision_name_that_is_not_a_plain_file_name_is_refused` (a newline plus a forged row, bare `stubs`, `stubs ''`, a name holding U+202E: zero stub rows, Back only, no `claude:` action). Green after. The other callers of the route (`stubs s` in `tests/plans-keep-moving-without-the-human.test.js` and `tests/protect-records.test.js`) use a valid name and pass.
- Change 5, the scope line is found past blank lines. Red before: state `reads the scope line past blank lines after the heading` (both line-ending styles returned ''). The guard `an empty Problem Statement does not borrow the next heading` was green before and after.
- Change 6, the comment beside the replaced assertion now reads that the old assertion pinned the file name on the screen, which is the defect this plan fixes.
- Change 7, the decisions entry is under Decisions Taken Under Ambiguity.
- Step 12 OPTIMIZE: the title still comes from the metadata `readPlans` parsed, so no extra file is read. `stubRowNames` now makes one tally pass per round of the ladder, at most 2n+1 rounds, each linear in the rows; the file name escaping runs once per row. No code change was needed.
- Step 15 DOCUMENT: JSDoc of `getVisionStubs` (title, both line-ending styles, blank lines, text reading of `parent_vision` and `depends_on`), of `stubText`, of `stubRowNames` (the ladder and its bound), and the comment above `visionStubsBrowse`. No other document changed.
- Step 14 VERIFY: `npm run lint` clean (eslint with `--max-warnings 0`, so the unsafe-regex rule passed on the new patterns); `npm run typecheck` pass; `npm test` 13999 tests, 13999 pass, 0 fail, 0 skipped, `[CTOC test-gate] coverage 99.72% (threshold 99%), skipped 0, failed 0` and `[CTOC test-gate] PASS`. At the start of the run `uptime` read load averages 12.64 12.35 25.28; no wall-clock test failed, so no rerun. `node --test tests/export-reachability.test.js tests/reachability.test.js tests/false-green-fence.test.js`: 64 tests, 64 pass, 0 fail, 0 skipped. `git status --porcelain` shows only the plan's four files, the plan move, and the in-progress folder; no baseline file under `.ctoc` changed and `module.exports` gained nothing.
- The screen after the fixes (the whole `.text`, from `node src/commands/start.js stubs ctoc-is-built-with-ctoc`) is kept in the session scratch folder as `vision-stubs-after-fix.txt`. All three stubs now show their scope line (rows 1 and 3 were empty before the blank-line fix), titles in full, and the Depends on cells are cut at 10 characters as before. `git status --porcelain` before and after the run was identical.

Step 11 REVIEW. The review returned changes required, with two defects. First, two rows could still show the same name, because the suffix rule compared titles rather than the names actually shown. Second, two of the three real stubs of this vision had an empty scope, because their Problem Statement starts after a blank line. Both were fixed test-first in the fix round. Row names are now decided on the shown text by a three-rung ladder, and the scope line is found past blank lines without ever taking the next heading.

Step 13 SECURE. The security scan returned a warning with four defects. A Depends on value read as a number, true or a list crashed the screen, and a pipe in it split the row. A parent_vision read as a number crashed the stub list. A backslash before a pipe undid the pipe's escape and split the row. The vision name was never checked. All four were fixed test-first. Depends on and parent_vision are read as text. Every cell is cleaned of control, invisible and direction-reversing characters and has both backslash and pipe escaped. A vision name that is not a plain file name is refused before any file is read, and the screen then offers Back only.

Step 16 FINAL-REVIEW. The final review returned changes required on one point: the braille blank in the cleaning pattern was a raw invisible character in the source, where the approved change list asked for the escape used by every other module; it was replaced in the final round with no test change. All ten scenarios have a proving test that drives the real screen, and the naming ladder provably ends with distinct names. The new patterns are linear by their form. The header, options, actions and Depends on cell are byte-identical for a valid vision name, apart from the documented cleaning and escaping, and nothing was added to the exports. The coordinator confirmed that only the four declared files and the plan changed. The title and scope cells stay uncapped, as the owner's standing rule to show every item in full requires.

Final round. A byte search of src/lib/menu-screens.js for the braille blank before the change found 1 raw character, inside the cleaning pattern of stubText; the same search after the change finds 0, because the pattern now holds the six-character escape. The doc comment above the row-name ladder now reads that `<`, `(` and `)` are escaped. The two test files tests/menu-screens-coverage.test.js and tests/state-coverage.test.js ran again: 215 tests, 215 pass, 0 fail, 0 skipped. npx eslint --max-warnings 0 src/lib/menu-screens.js is clean. The last Step 16 box, which puts the stubs screen in front of the owner, stays open on purpose: the CTO Chief shows the screens in his own report.
