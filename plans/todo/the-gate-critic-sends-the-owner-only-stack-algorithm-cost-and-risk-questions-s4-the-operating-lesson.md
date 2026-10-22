---
title: "Lesson 23 says details are settled on the evidence, if it fits within CLAUDE.md's 15,000 bytes"
type: implementation
parent_plan: the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions
depends_on: ctoc-is-built-with-ctoc-the-operating-lessons-say-ctoc-is-built-with-ctoc-and-fricti
created: 2026-10-22
priority: HIGH
files:
  # The single source of the lessons block every CTOC project receives.
  - .ctoc/templates/operating-lessons.md
  # This repository's hand-made copy of the block: the lesson line itself, not a count ratchet
  # (this slice creates no file of a counted kind).
  - CLAUDE.md
  # Lesson 23's full text.
  - docs/OPERATING_LESSONS.md
  # The rule inventory that pins the lesson word for word.
  - tests/fixtures/claude-md-rule-inventory.json
  # The lesson checks: numbers 1 to 23, the line, the full text, a user project's refreshed block.
  - tests/claude-md-lessons.test.js
---

# Lesson 23 says details are settled on the evidence, if it fits within CLAUDE.md's 15,000 bytes

**Scope (one line):** lesson 23 lands in the lessons source, this repository's `CLAUDE.md`, the full texts and the rule inventory when it fits within `CLAUDE.md`'s 15,000 bytes; when it does not, nothing lands and the build reports the measured size and the bytes still needed.

Parent: `plans/implementation/the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions.md`, In Scope item 9 and decisions 16 to 19. Scenarios carried: 11, 12, 13, 14. No technical dependency on slices 1 to 3. It depends on "The operating lessons say CTOC is built with CTOC and friction is filed as a plan" (`plans/todo/ctoc-is-built-with-ctoc-the-operating-lessons-say-ctoc-is-built-with-ctoc-and-fricti.md`), which rewrites lesson 14, adds lessons 21 and 22, the lesson-number checks that run 1 to 22, and inventory rules up to r0151; this lesson is numbered after them.

## Implementation Details

### Measured in this planning pass

- `CLAUDE.md` is **14,730 bytes** on 2026-10-22: ripgrep's multiline match `\A(?s-u:.){14730}` matches the file and `\A(?s-u:.){14731}` does not (the method the plan named in `depends_on` checked on a control file).
- That plan adds **256 bytes** by its own measurement, leaving **14,986 bytes**, **14 bytes** of room.
- The lesson line is **187 bytes**, all ASCII, counted character by character in this pass, so **188** with its line break.
- The critic of this planning round measured the same: 14,730 bytes, a lesson of about 187 bytes, 14 bytes left after the dependency.
- `CLAUDE.md`'s "Questions" section (line 21) already says the rule in two sentences: "Ask the human only on high uncertainty or huge importance: technology stack, algorithms, cost or risk he must accept." and "Below that, make a documented choice and continue." Together they are about 171 bytes with their separating spaces (a hand count: 119 and 51). No entry of `tests/fixtures/claude-md-rule-inventory.json` pins them (searched in this pass for `high uncertainty`: no match in that file).
- So, unless other text leaves `CLAUDE.md` first, the expected path is scenario 12: the build stops at the first item of Step 8 and nothing lands. That is a measured fact, not a scheduling choice. Even folding out both duplicate sentences would leave about 14 + 171 = 185 bytes, about 3 short of 188 by hand count, so the room question below carries a measured figure and a second way to make room.

### The exact texts

- **Lesson 23** (187 bytes):
  `23. **Settle details on the evidence.** Ask the human only about a technology stack, an algorithm, a hook or gate change, a cost or risk only they can accept, or what no evidence settles.`
- **Its full text** for `docs/OPERATING_LESSONS.md`, wrapped and indented like the neighbouring entries (wrapping is free, words are not):
  ```
  23. **Settle details on the evidence.** Ask the human only about a technology
      stack, an algorithm, a hook or gate change, a cost or risk only they can
      accept, or what no evidence settles. A technology-stack question adds,
      removes or replaces a language, framework, library, database or hosted
      service. An algorithm question chooses the method that computes, ranks,
      matches, predicts or schedules a central result, where the candidates give
      materially different results or costs and no published standard, rule in
      the repository, measurement or search settles which is better; a parsing
      or boundary rule that a published standard or the repository's evidence
      settles is a detail, not an algorithm. A cost question names a recurring
      or large one-off cost; a risk question asks the human to accept a loss or
      exposure that none of their earlier decisions accepted. A hook or gate
      question asks once per plan whether what a hook refuses or allows, what a
      plan needs before it moves on, what reaches the human, or what moves on
      recorded evidence changes as the plan describes; how to build that change
      is a detail. A question that no evidence settles, with two or more options
      and none recommended, goes to the human. Every other choice is settled by
      its evidence-backed recommended option and written into the plan with that
      evidence. The rule came from thirteen detail questions sent to the owner on
      two plans, each of which he answered by taking its recommended option.
  ```
  It names no person and no date ("the owner" is a role, as the file already writes it).

### Dependency graph

```
.ctoc/templates/operating-lessons.md --copied by hand into--> CLAUDE.md (lessons block only)
tests/claude-md-keeps-every-rule.test.js --reads--> tests/fixtures/claude-md-rule-inventory.json
    --checks--> CLAUDE.md, operating-lessons.md, docs/OPERATING_LESSONS.md; CLAUDE.md <= 15,000 bytes
tests/claude-md-lessons.test.js --drives--> ensureLessonsBlock --reads--> operating-lessons.md
    --reads--> CLAUDE.md, docs/OPERATING_LESSONS.md
```
No code module changes.

### File: `.ctoc/templates/operating-lessons.md`
**Action:** MODIFY. Insert lesson 23 on its own line directly after lesson 22 (which the plan in `depends_on` adds after lesson 21), before the blank line that precedes `**Methodology:**`. Nothing else changes.

### File: `CLAUDE.md`
**Action:** MODIFY. The same line, copied from the source file, never retyped, after lesson 22 in its lessons block. Nothing outside the block changes. After the edit the span between `<!-- CTOC:LESSONS v1 START -->` and `<!-- CTOC:LESSONS v1 END -->` is identical to the source's (`tests/claude-md-keeps-every-rule.test.js` lines 103–111).
- **Stop rule (scenario 12):** checked before any edit, as Step 8's precondition. When `15000 − fs.statSync('CLAUDE.md').size` is below 188, no file is changed. The builder takes the context-incomplete kickback (`agents/iron-loop/iron-loop-executor.md` line 161) and records under the plan's `## Execution Record` the measured size and the bytes still needed (188 minus the room). The executor reports an open question to the CTO Chief and does not file it (`agents/iron-loop/iron-loop-executor.md` line 183), so the kickback report carries one question about making room in `CLAUDE.md` for the CTO Chief to file. The CTO Chief files it as this slice's question, for the gate critic to classify through the normal classification:
  - Option 1, recommended: fold the "Questions" section's two sentences that lesson 23 restates out of `CLAUDE.md`, replacing them with nothing, since lesson 23 says the same rule, and move further whole sentences into the document the "Read before you touch" table already names for their subject until the measured room is reached. No rule is removed.
  - Option 2: shorten or remove a named rule.
  - The gate critic sets the topic, not the CTO Chief. Removing a rule from `CLAUDE.md` is the owner's, a cost or risk he must accept; moving text without losing a rule is a detail. So the classification is `detail` when the measured recommendation removes no rule, and `risk` when making the room needs a rule removed (option 2 then becomes the recommendation).
  - The routing that follows, in the classified file:
    - Before slice 1 is built: the question reaches the owner when it is `critical` or carries a weighty topic; a non-critical `detail` with one recommended option is settled by it.
    - After slice 1 is built: it reaches him only as one of the four kinds, so only when a rule would be removed.
  - The build itself shortens, moves or removes nothing; the move is made by the re-planned slice.
- **When the plan in `depends_on` has itself stopped for room** (its 256 bytes did not fit), this slice takes the same kickback and records its own 188 bytes, and the CTO Chief adds them to that plan's one room question. There is never a second room question and never a second stop.

### File: `docs/OPERATING_LESSONS.md`
**Action:** MODIFY. Insert the full text after lesson 22's full text and before the blank line that precedes `**Methodology reference:**`, with no blank line between entries.

### File: `tests/fixtures/claude-md-rule-inventory.json`
**Action:** MODIFY. Append after the last rule (r0151 once the plan in `depends_on` has landed; the builder takes the next free number in Step 8's precondition): `{ "id": "r0152", "line": null, "old": "<lesson 23, the exact line>", "home": ".ctoc/templates/operating-lessons.md", "added": "2026-10-22, plan the-gate-critic-sends-the-owner-only-stack-algorithm-cost-and-risk-questions-s4-the-operating-lesson: lesson 23, the general form of the owner's rule of 2026-10-22 that he is asked only about a technology stack, an algorithm, a cost or risk only he can accept, or a hook or gate change" }`. The floor in `tests/claude-md-keeps-every-rule.test.js` is not changed.

### File: `tests/claude-md-lessons.test.js`
**Action:** MODIFY, inside the `describe` the plan in `depends_on` adds ("operating lessons 14, 21 and 22, and the citations of the rule on changing a test"), using its helpers `squash`, `readRepo`, `blockOf`, `lessonLine`, `numbers`, `oneTo`, `fullTexts`, `entry` and `canonicalBlock`.
- Its two numbering checks, `numbers(blockOf(text))` deep-equals `oneTo(22)` and `numbers(fullTexts())` deep-equals `oneTo(22)`, become `oneTo(23)`. Written reason: lesson 23 joins the lists; the check stays exact.
- New constants `NEW_23` (the line) and `FULL_23` (the full text, squashed), and four cases:
  1. **Lesson 23 is the rule on details** [11]: `lessonLine(blockOf(text), 23)` equals `NEW_23` in the source and in `CLAUDE.md`.
  2. **A user project's refreshed block shows lesson 23, and nothing outside the block moves** [11]: a temporary `CLAUDE.md` of `'# My app\n\nMy own notes.\n\n'` + `[START_MARKER, MANAGED_NOTICE, '', '## CTOC Operating Lessons', '', NEW_22, END_MARKER].join('\n')` (the block shape and the `NEW_22` constant the plan in `depends_on` uses) + `'\n\nMore of my notes.\n'`; `ensureLessonsBlock(target, REPO_ROOT)` returns `true`; the result contains `NEW_23`; the bytes before the start marker and after the end marker are unchanged.
  3. **Lesson 23 carries no name, no date, no backticked path and no "CTOC repository", and says "the human"** [13]: the line equals `NEW_23` (exact equality to a text that holds no name is the name check), does not match `/\d{4}-\d{2}-\d{2}/`, contains no backtick, does not contain `CTOC repository`, and contains `the human`.
  4. **Lesson 23's full text is the agreed text** [14]: `entry(fullTexts(), 23)` equals `FULL_23`, which opens with `squash(NEW_23)` and contains no `\d{4}-\d{2}-\d{2}`.

### Test Plan

Framework `node:test`, as in the file. No new test file, so no documented count moves. The cases above are written at Step 8, after the measurement, run, and seen failing before any lesson text changes. `tests/claude-md-keeps-every-rule.test.js` then fails on r0152 (lesson 23 absent from the source) until Step 10. Temporary projects live under `os.tmpdir()`; the repository's files are only read.

Existing tests that must stay green: `tests/claude-md-keeps-every-rule.test.js` (every rule word for word, the block equality, `CLAUDE.md` at or under 15,000 bytes); `tests/update-command-coverage.test.js` lines 158–164 (at least 20 lesson lines; there will be 23); `tests/agents-never-wait-in-a-sleep-loop.test.js` (lesson 20 unchanged).

### Acceptance criteria mapping (this slice)

| Scenario | Implemented in | Test |
|---|---|---|
| 11 | source, `CLAUDE.md`, full text, inventory | cases 1, 2; numbering checks; keeps-every-rule |
| 12 | the stop rule, Step 8's precondition | the measured size and bytes needed under `## Execution Record`; the room question in the kickback report; no file changed |
| 13 | the line | case 3 |
| 14 | the full text | case 4; the full-text numbering check |

### Wiring — the live call sites

No new module and no new export. The changed texts reach their readers on routes read in this pass:
- **A user project's lessons block:** `/ctoc:update` (`refreshLocalLessons`, `src/commands/update.js` line 42, which calls `ensureLessonsBlock` at line 51) and project setup (`initProject`, `src/lib/init-project.js` line 849). Case 2 drives `ensureLessonsBlock`. The session-start route is not cited: Claude Code loads only `src/hooks/protect-records.js` (`hooks/hooks.json`).
- **This repository's block:** every session here reads `CLAUDE.md`.
- **The full texts:** the pointer in `CLAUDE.md`'s "Read before you touch" table and the block's methodology line.

### Security review

- [x] The lesson grants nothing: it narrows what reaches the human and adds "or what no evidence settles", so a real fork is never settled by default. It asks no agent to send anything off the machine.
- [x] No person's name, no date, no secret, no home-folder path (case 3, case 4).
- [x] The tests write only inside temporary folders under `os.tmpdir()`.
- [x] Hook and gate logic: untouched.

### Risk mitigations (this slice)

| Risk | Mitigation | Where |
|---|---|---|
| `CLAUDE.md` has no room (expected) | Measure first; kick back with the measured size, the bytes needed and one room question; cut nothing | Step 8, precondition |
| "Every session is told that a hotfix word is checked" (`plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s4-every-session-is-told.md`) and "The classification brief for the gate critic carries the plan file modification time" (`plans/todo/ctoc-is-built-with-ctoc-the-classification-brief-for-the-gate-critic-carries-the-pla.md`, which moves the test-file count in `CLAUDE.md`) also change `CLAUDE.md` | A technical-order fact: whichever builds later measures `CLAUDE.md` as it then is; this slice's stop rule reads the size at build time | Step 8 |
| The plan in `depends_on` lands with other numbers or helpers than it states | Step 9 re-reads the block, the full texts, the inventory and the test file; a different last lesson number or a missing helper stops the build for a re-plan | Step 9 |

## Decisions Taken Under Ambiguity — technical planning

1. **The lesson is its own slice**, because it has no technical dependency on slices 1 to 3 (parent decision 18) and shares no file with them. Its five files travel together because the equality test holds the source and `CLAUDE.md` identical and the inventory must change with the lesson.
2. **The measurement is Step 8's precondition**, with the checks that the plan in `depends_on` is built and which rule number is last, all before any edit, so the expected stop leaves no red test and no half-added inventory rule behind.
3. **The full text is pinned word for word** (case 4) rather than checked by key words: exact equality to a text that names nobody is the name check, the same method the plan in `depends_on` uses for its lesson lines.
4. **`CLAUDE.md` is declared for the lesson line only.** This slice creates no file of a counted kind, so no documented count moves; the test-file count is generated by `src/scripts/release.js` (plan 00215, `tests/doc-counts-generated.test.js`).
5. **Lesson 17 is not touched** (parent Out of Scope): the lesson says which questions go to the human, not how a question is phrased.
6. **The lesson line does not point at `CLAUDE.md`'s "Questions" section; it states the rule itself.** The lessons block ships to every CTOC project through `ensureLessonsBlock`, and the source and this repository's block must stay identical (`tests/claude-md-keeps-every-rule.test.js` lines 103–111). That section exists only in this repository's `CLAUDE.md`, so a pointer would point at nothing in a user's project and would break scenario 11's word-for-word line and scenario 13's any-project rule. The reverse direction is the room question's recommended option: the section's two duplicate sentences leave, because the lesson carries them.
7. **The room arithmetic is measured, not trusted.** By hand count the two duplicate sentences free about 171 bytes against the 174 needed after the dependency (188 minus 14), about 3 short. So the builder measures before claiming any figure, and the room question carries a second way to make room.

## Execution Plan

### Step 8: TEST
- [ ] Precondition, before any edit, in this order:
  - Confirm the plan in `depends_on` is built: lessons 1 to 22 in the source, in `CLAUDE.md` and in the full texts; its `describe` and helpers present in `tests/claude-md-lessons.test.js`; its last inventory rule r0151 (take the next free rule number if it differs). If it stopped for room, follow the stop rule's paragraph on that case. If it is otherwise not built, or a helper is missing, kick back.
  - Read `fs.statSync('CLAUDE.md').size` and record it. If `15000 − size` is below 188, follow the stop rule: change no file, take the context-incomplete kickback, record the measured size and the bytes still needed under `## Execution Record`, and put the one room question in the kickback report (scenario 12).
- [ ] Only after both checks pass: add r0152 (or the next free number) to `tests/fixtures/claude-md-rule-inventory.json`; run `node --test tests/claude-md-keeps-every-rule.test.js` and record the failure naming it.
- [ ] Edit the two numbering checks and add cases 1–4 to `tests/claude-md-lessons.test.js`; run it and record each new or changed case red because lesson 23 is absent.

### Step 9: PREPARE
- [ ] Re-read the lessons block, the full texts and the inventory as Step 8 left them, and confirm lesson 22 is still the last lesson in both files. A different last number stops the build for a re-plan.

### Step 10: IMPLEMENT
- [ ] `.ctoc/templates/operating-lessons.md`: lesson 23 after lesson 22.
- [ ] `CLAUDE.md`: the same line copied from the source; nothing outside the block touched.
- [ ] `docs/OPERATING_LESSONS.md`: the full text after lesson 22's.

### Step 11: REVIEW
- [ ] The critic reads lesson 23 as a session in a user's project would and confirms it can be followed there, names no person and no date, and agrees with the rule slices 1 and 3 build.

### Step 12: OPTIMIZE
- [ ] The measured room left in `CLAUDE.md` is recorded.

### Step 13: SECURE
- [ ] The security scanner reads the lesson and its full text as instructions a hostile plan could lean on, and confirms neither lets a real fork be settled without the human or lets an agent send anything off the machine.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, type check, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.
- [ ] Record the final size of `CLAUDE.md`, and confirm with `git diff -U0 -- CLAUDE.md` that every changed line lies between the two lessons markers.

### Step 15: DOCUMENT
- [ ] The lesson and its full text are the documentation. The build record holds the sizes before and after, or, on the stop path, the measured size and the bytes still needed.

### Step 16: FINAL-REVIEW
- [ ] Every scenario in the mapping above is checked against its evidence; on the stop path, that no file changed.
