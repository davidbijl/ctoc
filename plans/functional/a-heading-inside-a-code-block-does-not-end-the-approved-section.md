---
title: "A heading inside a code block does not end the approved section"
type: feature
status: refined
created: 2026-10-21
priority: HIGH
effort: medium
depends_on: none
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
acceptance_criteria_count: 15
risk_level: HIGH
---

# A heading inside a code block does not end the approved section

## Problem Statement

When the owner approves a plan, CTOC binds the approval to a specification digest: a fingerprint of the plan's frontmatter and body with the sections the build writes left out. Two reading defects make that fingerprint cover the wrong text. First, a line inside a fenced code block that looks like a heading is read as one: inside a build-written section it ends that section early, so build output counts as approved text, and inside a specification section it can start a left-out section, so approved text silently falls outside the fingerprint. Second, a heading that only begins with a left-out section's name is left out, so a plan title or a specification heading can drop out of its own fingerprint. The first defect is live on the done plan "A placeholder path in a plan is not a missing file": its build log from line 842 onward, all but lines 1003–1007, counts as approved text, so the home-folder paths in it cannot be replaced without breaking the plan's approval (the sibling plan "A finished plan can be sent back for a text-only revision"). Any correction moves fingerprints that are already recorded, so their number is measured first and the owner decides how the moved records are handled.

### What was checked, and how

Labels: **verified by reading** means I opened the file at the cited lines on 2026-10-21; **searched** means a Grep whose pattern, path and count are given, where a match shows where text is written, not that code runs; **not verified** means stated by someone else or not checked. I hold no shell, so nothing was run and no digest was computed.

1. **The fingerprint function** (verified by reading). `computeSpecHashWith` is at line 427 of `src/lib/approval-ledger.js`; `computeSpecHash` (line 410) calls it with no extra exclusions. Its body loop (lines 459–480) trims each line after the frontmatter, calls `headingLevel` (line 354) on it and tracks no code fence. `headingLevel` counts the leading `#` characters of the trimmed line and needs a space or tab after them, so indentation never matters.
2. **What is left out** (verified by reading). A left-out section starts at a heading whose lowercased title `isExecutionHeading` (lines 338–343) accepts, and runs to the next heading of the same or a higher level (line 469). `isExecutionHeading` tests `title.startsWith(name)` for each of the seven names derived from `EXECUTION_SECTION_PRODUCERS` (lines 298–317): execution record, execution log, step 16 final-review report, decisions taken during execution, verification evidence, decisions taken under ambiguity, deferred questions. The test applies at every heading level. Separately, every line whose trimmed text starts with a checkbox marker is dropped (`isCheckboxLine`, lines 377–385, applied at line 478).
3. **The triggering plan** (verified by reading its heading and fence lines). `plans/done/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s17-a-placeholder-path-is-not-a-missing-file.md` opens `## Execution Record` at line 671. Its line 842 is `# 69 creation-claim errors`, inside the fence of lines 772–843; its line 915 is `# 67 creation-claim errors`, inside the fence of lines 847–916. Outside a fence, no heading of level 1 or 2 follows line 671. Today line 842 ends the left-out record, so the lines from 842 to the end of the file count as approved text, with one exception the stub did not state: lines 1003–1007 are left out again, because the heading `### Decisions taken under ambiguity while building` at line 1003 matches a name by prefix and its section runs to the next level-3 heading at line 1008. A fence-aware reading leaves out every line from 671 to the end.
4. **Its approval record** (verified by reading). `.ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s17-a-placeholder-path-is-not-a-missing-file.json` carries `"hash_scope": "specification"` and `"stage_to": "done"`, so a fence-aware reading changes the fingerprint that record holds.
5. **The path lines** (not verified by me). The sibling plan lists the home-folder and scratch path lines of that plan as 729, 742, 743, 786–795, 860–869, 979, 980, 993–1000 and 1055–1058. None lies in 1003–1007, so its statement that the lines from 860 on count as approved text holds. This plan never copies those lines; it cites line numbers only.
6. **The second defect** (verified by reading). A title line that begins with one of the seven names opens a left-out section at level 1, which runs to the next level-1 heading, normally the end of the file. A specification heading such as "Execution logging for the menu" matches "execution log" by prefix.
7. **The second defect has no live instance here** (searched, case-insensitive, over `plans/`).
   - A level-1 heading starting with one of the seven names, pattern `^\s*#\s+(execution record|execution log|step 16 final-review report|decisions taken during execution|verification evidence|decisions taken under ambiguity|deferred questions)`: 0 matches.
   - A heading at any level that continues one of the names with anything but whitespace or an opening parenthesis (the same alternation, preceded by `^\s*#{1,6}\s+` and followed by `[^\s(]`): 0 matches.
   - The same names followed by whitespace and more text: about 110 lines (counted by hand from the output), every one a build-written or planner-written section with a suffix such as ` (Steps 8–16)`, ` — technical planning` or ` while building`.
8. **The 2026-09-03 precedent** (verified by reading). The comment at lines 305–315 records that adding the deferred-questions row moved 35 recorded digests, which were re-recorded through `src/scripts/ledger-backfill.js --hash-scope specification` in the same change. Not verified by me: the parked plan "Finished plans are not sent back after an update" records, from an earlier audit run (`.ctoc/audit/speed-and-size/plans-revert-after-update.md`), that this re-record covered only CTOC's own repository, and that one run of the gate check on a copy of a real 470-plan project moved 136 plans, 131 of them for that reason alone.
9. **What a re-record writes** (verified by reading). `backfillEntry` (lines 1048–1075) writes `approved_by: 'human'` together with `backfilled: true`, and `entryKind` reports such a record as `backfilled` (line 975); the script header (`src/scripts/ledger-backfill.js` lines 32–43) calls it a migration record, not an approval. `src/lib/protected-paths.js` line 76 counts `backfilled` as a human kind for CTOC's own enforcement code (`HUMAN_COVERAGE_KINDS`). `src/commands/start.md` line 67 says migrating a plan with the script's other forms "is something the human runs in his own terminal".
10. **The module's own rules** (verified by reading). For a changed method, the `contentMatches` comment (lines 589–594): "VERSIONED SEMANTICS, NO MIGRATION … Existing entries are NEVER re-hashed — re-hashing against current content would launder every post-approval amendment into an approved state." For a boundary it cannot find (lines 257–261): "IT FAILS CLOSED … Not being able to establish a binding is not a pass". For its dependencies (lines 395–403): its only project dependency is the pure-constant `gate-order.js`, because it sits on the hook path.
11. **The guards that must stay green** (verified by reading).
    - `tests/source-stays-searchable.test.js` pins `GOLDEN` at line 47. Its fixture (lines 54–82) holds no code fence, its title is "A fixture plan", and its only left-out heading is the whole name "Decisions Taken Under Ambiguity" at level 2. Traced by reading, not run: none of the corrections offered in the questions changes how that fixture is read, so the golden digest holds.
    - `tests/approval-hash-survives-execution.test.js` line 310, the live-ledger test, checks every specification-scoped record in todo, in-progress, review and done whose plan has a deferred-questions heading, and names each one that no longer matches. Its exception set `MISMATCHED_BEFORE_THE_EXEMPTION` (lines 286–308) may only shrink.
12. **How many records could move** (searched). Pattern `"hash_scope": "specification"` over `.ctoc/approvals/`: 409 files. How many actually move is not measured. Only a heading-shaped line inside a code block that changes where a left-out section starts or ends moves a fingerprint; such a line inside ordinary specification text is hashed either way.
13. **How CTOC's own plans write code fences** (searched, over `plans/`).
    - A line starting, after indentation, with four or more backticks: 22 lines in 6 files. In `plans/done/00415-deepthink-ships-with-ctoc-s5-web-only-reading-agent.md` (the slice that ships Deepthink's web-only reading agent), lines 80–203 wrap a whole agent file whose own headings are read as that plan's headings today, and lines 361–368 wrap three-backtick lines (365 and 367).
    - A line starting, after indentation, with three tildes: 16 lines in 2 files.
    - Three backticks indented four or more spaces (fences inside list items): 46 lines in 9 files.
    - A heading-shaped line indented four or more spaces, pattern `^ {4,}#{1,6}[ \t]`: 15 lines in 5 files.
    - CTOC already reads fences three different ways: regular-expression stripping in `src/lib/plan-validator.js` (lines 735–748 and 1534–1538), an on-off switch in `src/lib/unexecutable-instruction-scan.js` (lines 136–145), and a same-character rule in `src/lib/claude-md-lessons.js` (lines 26–27 and 103–161).

### Where the fingerprint is read and written

Searches over the whole repository (the search tool honours `.gitignore`, so ignored folders are not counted):
- `computeSpecHash`: 142 occurrences in 46 files.
- `computeSpecHashWith`: 31 occurrences in 9 files; the only source file among them is `src/lib/approval-ledger.js`, the rest are plans and audit notes.
- `hash_scope`: 524 occurrences in 442 files, most of them approval records; under `src/` and `tests/`, 67 occurrences in 15 files.
- `specification`: 1431 occurrences in 800 files, almost all prose, so it is no caller list.

Each match under `src/` was read in context. The table names where a call is written; whether it runs in a given session is not verified.

| Where | What it does with the fingerprint | When a record's fingerprint moves |
|---|---|---|
| `src/lib/approval-ledger.js`, `contentMatches` (607–623) and `verify` (1111–1116) | compares a record with the plan's current text | the comparison itself fails |
| `src/lib/approval-ledger.js`, `diagnoseSpecMismatch` (543–579) | its own heading loop (550–555) picks candidate sections, then recomputes | must read headings the same way, or it names a line inside a code block |
| `src/lib/approval-ledger.js`, `resolveHash` (643–655) | takes the fingerprint for every new record | every writer below takes the corrected reading |
| `src/lib/approval-residency.js`, `classifyResidency` (line 182) | todo and done residents must match their record | every row below it |
| `src/lib/plan-coverage.js` line 591, through `isApprovedForCoverage` | a todo or in-progress plan's `files:` grant edit permission only while its record matches | a building plan loses its edit permission |
| `src/lib/continuation-queue.js` line 76 and `src/lib/menu-screens.js` line 2965 | list the approved build queue | the plan drops off the list |
| `src/lib/stale-cleanup.js` line 332 | picks the stage a stale plan is sent back to, walking past stages its record cannot vouch for | the plan is walked back further |
| `src/lib/iron-loop-enforcer.js` line 418 | classifies a plan in a gate-destination folder | the plan reads as unapproved |
| `src/hooks/human-gate-check.js` line 269 | sends a todo or done plan whose record does not match back a stage (header lines 63–70) | registered only in `.claude-plugin/hooks.json` (line 98); `hooks/hooks.json` registers only `src/hooks/protect-records.js` and says every other CTOC hook stays unregistered on purpose. Which of the two files Claude Code loads is believed from that wording, not verified here |
| `src/scripts/ledger-backfill.js` lines 220 and 264 | re-records one plan; runs the residency sweep | the re-record route |
| `src/lib/streaming-gate.js` line 870 | uses only whether the boundary can be found | changes only if an unclosed fence makes the boundary unfindable |
| writers: `src/lib/actions.js` line 346, `src/lib/streaming-gate.js` lines 741 and 921, `src/lib/stale-cleanup.js` line 261 | write new records through `resolveHash` | take the corrected reading from the change on |

## Business Alignment

**Job to Be Done:** When I have approved a plan and the builder then writes its build record into the same file, I want the approval to cover exactly the specification I approved, so I can have build output corrected without losing the approval, and trust that no approved text changes unseen.

**Impact Map:**
- **Goal:** CTOC is built entirely through its own menu, with no by-hand workaround (the parent vision "CTOC is built with CTOC, and every friction found while building it becomes a plan"). Here: a finished plan's build output can be corrected without breaking or forging its approval record.
- **Actor:** the owner, who approves plans; with him the CTO Chief and the background agents that build for him (the vision's target users), and every CTOC user whose plans carry code blocks in their build records.
- **Impact:** the owner's approval check reports a match exactly when the approved specification is unchanged. A text-only fix inside a build record no longer reports a mismatch, and a change to approved text hidden behind a code block or a look-alike heading no longer reports a match.
- **Deliverable:** a corrected reading of the specification fingerprint (code fences and left-out heading names), a read-only measurement of the records it moves, and the owner's chosen handling of them.

**Alignment checks:** the goal traces to the vision's problem statement (yes: found while building CTOC with CTOC, and it blocks the text revision the sibling plan needs); the actor is among the vision's target users (yes); the impact is observable as the approval check's result (yes); the deliverable is one functional area, the specification fingerprint (yes).

## User Stories

**As** the owner, **I want** text inside a code block never to change which sections the approval fingerprint leaves out, **so that** a finished plan's build log can be corrected without breaking its approval, and no approved specification hides behind a code block.

**As** the owner, **I want** only a build-written section's own heading to start a left-out section, never a title or a specification heading that merely begins with the same words, **so that** every approved plan's specification stays inside its own fingerprint.

**As** the owner, **I want** the number of already-recorded approvals that the correction moves measured and shown to me before anything changes, and each moved record handled the way I choose, **so that** no approval silently stops matching and no approval record is rewritten without my decision.

## Acceptance Criteria

Every scenario is a test written first and seen failing on today's code, unless it says it holds today. "The corrected reading" means the fingerprint after this change; "a record" means an approval record in `.ctoc/approvals/`; "the check" means the comparison every caller uses (`contentMatches`). Scenarios marked "recommended answer" are written for the recommended option of the named question; another answer replaces them as that question states. The scenario substance sits on the Given, When and Then lines, because the fingerprint drops checkbox lines.

The first story, text inside a code block:

- [ ] **Scenario: the real build log after line 842 no longer counts as approved text**
  Given the done plan "A placeholder path in a plan is not a missing file", read from disk at test time from whichever stage folder holds it, whose `## Execution Record` opens at line 671 and whose line 842 reads `# 69 creation-claim errors` inside the code fence of lines 772–843
  When a record is taken of it with the corrected reading, and one character is then changed on line 842, on line 860 and on the file's last line, one at a time
  Then the check reports a match after each of the three changes
  And the recorded fingerprint equals the fingerprint of the file's first 670 lines alone
  And the test file holds no line copied from that plan except the text of line 842

- [ ] **Scenario: a heading-shaped line inside a code block in the specification no longer hides approved text**
  Given a plan recorded with the corrected reading whose Scope section holds a code block containing a line that reads `## Decisions Taken Under Ambiguity`, followed after the block, in the same Scope section, by the sentence "The cache is cleared on every start."
  When that sentence is changed to "The cache is never cleared." and the record is checked
  Then the check reports a specification mismatch and the plan is not accepted as approved
  And on today's code the same check reports a match, which is the red run
  And adding a line reading `- [x] done` inside that code block leaves the check reporting a match, on today's code and after the change, because checkbox lines are dropped wherever they stand

- [ ] **Scenario: every code-block shape CTOC's plans use hides headings (recommended answer to "What counts as a code fence")**
  Given four plans, each with a build-record section holding one code block that contains a line reading `# done`, followed outside the block by a real Scope heading and the sentence "Only the owner may finish a plan."; the four blocks are a four-backtick block that also contains a three-backtick line before `# done`, a tilde block, a three-backtick block indented four spaces inside a list item, and a plain three-backtick block
  When each plan is recorded with the corrected reading and the `# done` line is then changed
  Then the check still reports a match for each plan
  And changing the sentence after the real Scope heading makes the check report a mismatch for each plan

- [ ] **Scenario: an unclosed code fence is refused, never read to the end of the file (recommended answer to "What happens with an unclosed code fence")**
  Given a plan whose Decisions Taken Under Ambiguity section, placed before its Scope section, opens a three-backtick block that is never closed
  When an approval record is written for it through the writer every approval route uses
  Then the write is refused with a message naming the unclosed fence and its line number, and no record file is written
  And checking an existing record against such a plan reports that the specification boundary could not be established, never a match

- [ ] **Scenario: the mismatch explanation never names a line inside a code block**
  Given a plan recorded with the corrected reading whose build record ends with a code block containing a line that reads `## Appendix`, and to which a real `## Final State` section is appended after recording
  When the record is checked and the mismatch is explained
  Then the explanation names the section "Final State" and does not name "Appendix"
  And on today's code the explanation names no section, which is the red run

The second story, headings that only begin with a left-out name (recommended answer to "How left-out headings match"):

- [ ] **Scenario: a plan title that begins with a left-out name stays inside the fingerprint**
  Given a plan whose title line reads `# Verification evidence is shown before a plan finishes` and whose Scope section holds the sentence "Only the owner may finish a plan."
  When the plan is recorded and that sentence is then changed
  Then the check reports a specification mismatch
  And on today's code the check reports a match, which is the red run

- [ ] **Scenario: a specification heading that only begins with a left-out name stays inside the fingerprint**
  Given a plan with a level-2 section headed `## Execution logging for the menu` that holds the sentence "Every menu action is logged."
  When the plan is recorded and that sentence is then changed
  Then the check reports a specification mismatch
  And on today's code the check reports a match, which is the red run

- [ ] **Scenario: the real build-written headings stay left out**
  Given a recorded plan carrying the real headings `## Execution Record (Steps 8–16)` with `### Decisions taken under ambiguity while building` beneath it, `## Decisions Taken Under Ambiguity — technical planning`, `## Deferred Questions` and `## Verification Evidence (Step 14)`
  When text is added under each of them
  Then the check still reports a match, as it does today

The third story, the moved records:

- [ ] **Scenario: the moved records are measured before anything changes**
  Given the repository's records whose `hash_scope` is `specification` (409 files on 2026-10-21)
  When the first build step runs the read-only measurement, before any product code changes
  Then a table in the plan's build record lists every such record with its plan, stage folder, record kind and one verdict: matches both readings, moved (matches today's reading only), repaired (matches the corrected reading only), or matches neither; plus which defect moved it and whether the corrected reading cannot find its boundary
  And the moved count and the table are shown to the owner before any record is rewritten or any reading stamp is written
  And every file under `.ctoc/approvals/` is byte-identical before and after the measurement, and `src/scripts/ledger-backfill.js --plan` is never run to measure

- [ ] **Scenario: a record the measurement cannot judge is listed, never skipped**
  Given a record whose plan is in no stage folder, or whose plan the corrected reading cannot find a boundary for
  When the measurement runs
  Then that record appears in the table by name with that reason, and the verdict totals add up to the number of records read
  And when any record would stop matching because the corrected reading cannot find its boundary, the builder stops and asks the owner before any product code changes

- [ ] **Scenario: no recorded approval silently stops matching**
  Given every record the measurement listed as matching today's reading
  When the change has landed and the full test suite runs
  Then each of those records matches its plan again: under the recommended answer to "How moved approvals are handled", with no record file rewritten; under the other answer, after the owner's own re-record run, each re-recorded entry's reason naming this plan
  And the live-ledger test in `tests/approval-hash-survives-execution.test.js` (line 310) passes with `MISMATCHED_BEFORE_THE_EXEMPTION` unchanged or smaller
  And under the recommended answer, a record written after the change is checked only with the reading its stamp names, and a record without a stamp only with today's reading, never with whichever reading happens to match

- [ ] **Scenario: the golden digest does not move**
  Given `tests/source-stays-searchable.test.js` with `GOLDEN` at line 47 and its fixture at lines 54–82
  When the full test suite runs after the change
  Then that test passes with `GOLDEN` and the fixture byte-identical to today's
  And no pinned digest, exception list or assertion in any test is loosened to make the change pass

- [ ] **Scenario: a fence line with an info string inside a code block is content, not a closer**
  Given a left-out build record holding a block opened by three backticks, and inside it a line of three backticks followed by `js`
  When the specification fingerprint is taken
  Then the line with `js` stays content of the open block, only a line of fence characters alone (trailing spaces allowed) of the same character and at least the opening length closes it, and the block's `#` lines end nothing

- [ ] **Scenario: pasted test-runner summary lines inside a code block do not end the build record**
  Given a left-out build record holding a fenced block with the pasted lines `# tests 26`, `# pass 26` and `# fail 0`
  When the specification fingerprint is taken
  Then the build record stays left out to its own end, and the fingerprint equals that of the same plan with those three lines removed

- [ ] **Scenario: a level-1 line outside any code block inside the build record**
  Given a left-out build record holding an unfenced line `# tests 15` below its own `## Execution Record` heading
  When the specification fingerprint is taken
  Then the result follows the owner's answer to the question "Does a level-1 line end a left-out section", and a test pins that answer with this plan text

## Scope

### In Scope
- The corrected reading of code fences in the specification fingerprint, in `computeSpecHashWith` (scenarios "the real build log after line 842", "a heading-shaped line inside a code block in the specification", "every code-block shape").
- What an unclosed code fence does (scenario "an unclosed code fence is refused").
- The coordinator's evidence of 2026-10-21: pasted test-runner summary lines, a fence closer that is fence characters only, and the owner's answer on whether a level-1 line outside a code block ends a left-out section (scenarios "a fence line with an info string inside a code block is content, not a closer", "pasted test-runner summary lines inside a code block do not end the build record", "a level-1 line outside any code block inside the build record").
- The same heading reading in the mismatch explanation, `diagnoseSpecMismatch` (scenario "the mismatch explanation never names a line inside a code block").
- The rule for which headings start a left-out section (scenarios "a plan title", "a specification heading", "the real build-written headings").
- The read-only measurement of moved records, written into the build record and shown to the owner before anything is rewritten (scenarios "the moved records are measured" and "a record the measurement cannot judge").
- The owner's chosen handling of the moved records (scenario "no recorded approval silently stops matching").
- The guards: the golden digest and the live-ledger test stay green with nothing loosened (scenarios "the golden digest does not move" and "no recorded approval silently stops matching").
- Checkbox lines keep being dropped wherever they stand, inside a code block or not; only heading detection changes (scenario "a heading-shaped line inside a code block in the specification", its last line).

One constraint holds for all of the above, from the module's own rule (lines 395–403): the corrected reading stays inside `src/lib/approval-ledger.js`, character by character, with no new `require` and no regular expression compiled per line.

### Out of Scope
- The send-back route for finished plans and the text revision of the triggering plan: the sibling plan "A finished plan can be sent back for a text-only revision".
- Adding, removing or renaming any of the seven left-out names: not planned; such a change needs its own plan and the owner's ruling, as on 2026-09-03.
- Code blocks made by indentation alone, without a fence: a heading-shaped line in one keeps reading as a heading, because a line-by-line reader cannot tell a four-space code line from list-item content. Not planned in any plan; 15 such lines exist in 5 plans (searched).
- The six-name reading for records written by CTOC 6.12.92 to 6.14.59, and returning plans that an update sent back: the parked plan "Finished plans are not sent back after an update".
- Argument checks and a typed confirmation for the re-record script: "The approval re-record script cannot write an approval nobody gave".
- The three other fence readers in CTOC (`src/lib/plan-validator.js`, `src/lib/unexecutable-instruction-scan.js`, `src/lib/claude-md-lessons.js`): not changed by this plan and not planned elsewhere.
- Registering the gate-check hook: "CTOC's hooks are actually loaded by Claude Code" (`plans/functional/ctocs-hooks-are-actually-loaded-by-claude-code.md`).

## Forks asked as questions

The questions file `.ctoc/streaming/questions/pending/functional__a-heading-inside-a-code-block-does-not-end-the-approved-section.md.json` carries four questions, each with one recommended option and what that pick rests on:
- **How moved approvals are handled.** Recommended: keep each approval on the reading it was made with (new records carry a reading stamp; every record is checked with exactly one reading; no record is rewritten). Other option: the owner re-records the moved records in his own terminal, as on 2026-09-03.
- **What counts as a code fence.** Recommended: the standard Markdown fence rule (three or more backticks or tildes; the closing fence uses the same character and is at least as long) at any indentation. Other options: the same rule with at most three spaces of indentation; any three-backtick or three-tilde line switching code on or off.
- **What happens with an unclosed code fence.** Recommended: the fingerprint cannot be taken, so recording is refused and checking does not match. Other option: the block runs to the end of the file.
- **How left-out headings match.** Recommended: level 2 and deeper, and the name whole or followed by a space or an opening parenthesis. Other options: the level rule only; the name rule only.

## Evidence added by the coordinator (2026-10-21)

The CTO Chief folded this in on the coordinator's report from a review of the surviving-mutants build. It is evidence and a widened scope, not a schedule.
- **The same defect with test-runner output.** Reported: pasted `node --test` summary lines (`# tests 26`, `# pass 26`, `# fail 0`) inside a fenced block end the build record's exclusion, exactly like line 842 of the triggering plan. This is covered by the fence reading in this plan (new scenario "pasted test-runner summary lines inside a code block do not end the build record").
- **Such lines in finished plans.** Verified by a presence search: the pattern `^\s*#\s+(tests|pass|fail|skipped|duration_ms)\s+\d+` over `plans/done/` matches 7 lines in 2 files. They are `plans/done/00084-approval-hash-survives-its-own-pipeline.md` lines 381–383 and 398, and `plans/done/00158-a-fresh-repository-is-its-own-project.md` lines 371–373.
  - The coordinator reports such lines also appear outside any code block.
  - A simple open-close toggle over each file's fence lines, run in this session, reads all seven as inside a fence: 00084 fence lines 379–399, 00158 fence lines 355–374. That toggle is not the corrected fence reader.
  - Which reading holds is not verified. The read-only measurement step settles it with the corrected reader and lists every such line it finds outside a code block.
- **Whether a level-1 line may end a left-out section is an open fork.** The coordinator states that plans use level 1 only for their title. Verified counter-case: the triggering plan carries a level-1 revision header, `# REVISION 1` at line 19, above its title at line 28. Revision headers are written when a plan comes back with feedback. The open question: should a level-1 line outside a code block, below the title, end a left-out section? The choices are these:
  - It never does. A left-out section ends only at a heading of its own level or a higher level other than level 1.
  - It does, as today. Only code-block lines are corrected.
  - Only lines shaped like test-runner summaries are not headings.
  This is a choice of the fingerprint algorithm, so it is a question for the owner, not a silent choice (new scenario "a level-1 line outside any code block inside the build record").
- **A fence closer is fence characters only.** A line of three backticks followed by `js` inside a block opened by three backticks is content, not a closer, as in the standard Markdown (CommonMark) rule that a closing fence carries no info string (new scenario "a fence line with an info string inside a code block is content, not a closer").

## Technical order relative to other plans (facts, not a schedule)

- **The sibling plan "A finished plan can be sent back for a text-only revision".** Both plans read `src/lib/approval-ledger.js`; this plan changes it. The triggering plan's record holds a specification fingerprint taken with today's reading.
  - If this plan is built first: under the corrected reading every path line of the triggering plan lies inside its left-out build record, so a text-only revision of those lines leaves a corrected-reading fingerprint unchanged. Under the re-record answer the triggering plan's record is among those re-recorded and becomes a migration record. Under the reading-stamp answer its old record keeps today's reading, the revision still changes lines that reading hashes (842–1002 and 1008 to the end), and the sibling's fresh check writes a new record.
  - If the sibling is built first: the revision changes lines today's reading hashes, the sibling's route writes a new record with today's reading, and this plan's change then moves that record (re-record answer) or leaves it matching (reading-stamp answer).
- **The parked plan "Finished plans are not sent back after an update".** It designs a `spec_version` stamp on the same three functions (`resolveHash`, `contentMatches`, `computeSpecHashWith`). Whichever of the two is built first defines the stamp the other extends. Its fallback for an unstamped record tries two readings; this plan's rule is one reading per record, so the two designs are reconciled at technical planning.
- **"The approval re-record script cannot write an approval nobody gave".** The re-record answer runs that script, whose arguments and confirmation that plan changes.
- **"CTOC's hooks are actually loaded by Claude Code".** While the gate-check hook is unregistered, a moved record sends no plan back by itself. Once it is registered, `src/hooks/human-gate-check.js` sends a todo or done plan whose record does not match back a stage (header lines 63–70).
- **The protected list.** `src/lib/approval-ledger.js` is on CTOC's protected list (`src/lib/protected-paths.js` line 61), so its edits need a covering plan whose record is a human kind.

## Risks

### Technical Risks
- Moved records revoke a building plan's edit permission: a todo or in-progress plan whose record moves loses its `files:` grant (`src/lib/plan-coverage.js` line 591) and drops off the approved build queue (`src/lib/continuation-queue.js` line 76, `src/lib/menu-screens.js` line 2965).
  - Likelihood: MEDIUM (how many move is not measured)
  - Impact: HIGH
  - Mitigation: Measure before any code change, and land the chosen handling in the same change as the corrected reading.
- A check that accepts a match under either of two readings: the readings are not nested (the correction leaves out some build text and brings in some hidden specification text), so accepting either is weaker than both.
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: Test that every record is checked with exactly one reading, and pin a second golden digest for the corrected reading.
- The fence rule misreads a real shape: a four-backtick block wrapping three-backtick lines, a tilde block, a block inside a list item.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test every shape the corpus search found (scenario "every code-block shape").
- Under the refuse answer, a builder that leaves a fence open in its build record makes its own plan uncheckable mid-build.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Name the fence's line in the refusal so the builder closes it.

### Business Risks
- Under the re-record answer, other projects' approvals stop matching after an update, with nobody to re-record them. The 2026-09-03 re-record covered only this repository; the audit figure is 136 of 470 plans moved on one copy (not re-run here).
  - Likelihood: HIGH under that answer
  - Impact: HIGH
  - Mitigation: Recommend the reading-stamp answer, and state in the release note which approvals move.
- Under the re-record answer, a moved record changes kind to backfilled, which counts as a human approval for CTOC's own enforcement code (`src/lib/protected-paths.js` line 76). Pattern `"advanced_by": "sufficiency"` over `.ctoc/approvals/` matched 18 records; re-recording any of them raises its standing.
  - Likelihood: MEDIUM under that answer
  - Impact: HIGH
  - Mitigation: List each moved record's kind in the measurement table, and keep sufficiency-kind records off any re-record list.

### Dependency Risks
- The sibling plan works on the same done plan, whose record this change moves under the re-record answer.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Record the triggering plan's verdict in the measurement table, so whichever plan is built second starts from a known record.
- The parked plan "Finished plans are not sent back after an update" designs a stamp on the same three functions.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Review both designs together at technical planning, so only one stamp exists.
- `src/lib/approval-ledger.js` is protected, so building needs a covering plan approved by the owner.
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Declare the file in the implementation plan's `files:` and take the approval through the menu.

## Priority

**Priority: HIGH** (Score: 9/9)
- Dependency: 3 — the sibling plan's text revision of the triggering plan depends on which reading holds, and the measurement must come before every other build step.
- Business Impact: 3 — it decides whether the single source of approval truth covers exactly what the owner approved, in both directions.
- Technical Risk: 3 — it changes the fingerprint behind every specification-scoped record (409 here) in a protected file, with a migration decision attached.

## Decisions Taken Under Ambiguity

- **Parent vision.** The parent vision is "CTOC is built with CTOC, and every friction found while building it becomes a plan" (`plans/done/ctoc-is-built-with-ctoc.md`, referenced as `vision/ctoc-is-built-with-ctoc.md` like its other children). The coordinator found this defect while building CTOC with CTOC, and the product owner needs a parent vision to run.
- **How the plan was filed.** The CTO Chief filed it through the menu's new-functional-plan action (`browse functional`, then `n`).
- **Refined in place.** The product owner changed `type: functional` to `type: feature` and `status: functional` to `status: refined`, set `priority: HIGH`, and added `acceptance_criteria_count` and `risk_level`, as the refinement steps say; the other frontmatter fields are unchanged.
- **No overlap with sibling plans.** The parent vision's other plans (`plans/*/ctoc-is-built-with-ctoc-*.md`, 10 files, compared by title) and the named sibling were read; none covers the specification fingerprint, and the named sibling puts "what the specification digest covers" outside its own scope.
- **Both directions of the fence defect are in scope.** The stub named build output counting as specification. The same missing fence tracking lets a heading-shaped line inside a code block in the specification start a left-out section and hide approved text. One correction covers both, so both are pinned.
- **One stub claim corrected.** "From line 842 onward its execution record counts as approved specification" leaves out lines 1003–1007, which today's reading leaves out again (see "What was checked, and how", the triggering plan). The sibling plan's path lines lie outside that range, so its conclusion holds. A smaller imprecision: the stub put the body loop at lines 459–478; it runs from 459 to 480.
- **Indented code blocks without a fence are out of scope.** The reader works line by line and ignores indentation, as `headingLevel` already does; telling a four-space code line from list-item content needs the list structure, which a line reader does not have. Not asked as a question: the bar is high uncertainty or huge importance, and 15 such lines in 5 plans (searched) makes neither.
- **Checkbox lines are untouched.** Only heading detection changes; `isCheckboxLine` keeps applying to every line, so no fingerprint moves for a reason this plan does not name.
- **The mismatch explanation reads headings the same way as the fingerprint.** Not asked: two heading readings inside one module is the divergence that module's own comments forbid.
- **The measurement is the first build step and is read-only.** I hold no shell, so no moved count is invented here. Its population is the specification-scoped records; whole-file records (`hash_scope` absent or `file`) are compared byte for byte and this change cannot move them.
- **Scenarios follow the recommended answers.** Scenarios marked with a question's name are written for its recommended option; another answer replaces them as that question says.
- **No question about building order.** The technical order against the sibling and the related plans is recorded as fact; when each is built is the owner's schedule.
- **This file avoids the defect it describes.** It holds no code fence and no line whose trimmed text starts with a heading marker other than its real headings, so its own record is read the same way before and after the change. Outside the acceptance criteria it uses plain bullets, because checkbox lines are dropped from the fingerprint.
