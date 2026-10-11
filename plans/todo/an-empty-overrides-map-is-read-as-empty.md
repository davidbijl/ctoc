---
title: "An empty overrides map in the regulatory settings is read as no overrides"
type: implementation
created: 2026-10-10
priority: high
effort: low
parent_plan: evidence-crossings-respect-the-regulated-profiles
depends_on: none
lets_through: a regime block whose overrides value is the empty map
safe_because: an empty map holds no override and a newly readable block holds no character that could hide a second overrides key from the reader, a line or paragraph separator included, so the reader's result (no overrides) is exactly what the file says
compared_against: the js-yaml YAML parser, loaded in the tests only
areas:
  - the overrides line
files:
  - src/lib/regulatory-regime.js
  - tests/lib-regulatory-regime.test.js
  - tests/plans-keep-moving-without-the-human.test.js
---

# An empty overrides map in the regulatory settings is read as no overrides

A follow-up to `plans/done/evidence-crossings-respect-the-regulated-profiles.md`; the owner said yes to this fix on
2026-10-08. It takes only the one-line core of `plans/implementation/an-empty-overrides-list-no-longer-holds-every-plan.md`,
which was attacked before its build and is not built as written. Every "today" below was read from the code and from the
installed parser's source on 2026-10-10; what was also run is named in "Attacked before the build". Step 8 runs all of it before anything changes.

## Problem statement

In `src/lib/regulatory-regime.js`, `overridesMisread` (lines 379–391) answers "misread" for any text after the `overrides:`
key (line 383). So the empty map, `  overrides: {}`, makes `misreadRegime` return `'overrides'` (line 427), `regimeHold` in
`src/lib/streaming-gate.js` (line 952) answers `regime-unreadable`, and every plan in that project waits for the owner's OK
instead of moving on its recorded evidence. CTOC's own `.ctoc/settings.yaml` carries that line (line 55).

## Technical approach

### Area: the overrides line

The overrides line is the first line of the block that starts an `overrides:` key (line 381, unchanged). It is read as
"no overrides" when all five conditions hold. In every other case the function goes on to lines 383–390, which stay byte
for byte, so every other form keeps today's answer. No other rule of the reader changes.

1. **The line is exactly the empty map:** spaces as indentation, `overrides:`, one or more spaces or tabs, `{`, optional
   spaces or tabs, `}`, then the end of the line (spaces or tabs before it allowed) or spaces or tabs and a `#` comment.
2. **It is the block's only mention of overrides:** no other line outside comment lines holds the word `overrides`.
3. **Nothing sits under it:** the next line that is neither blank nor a comment line (the skip line 386 already uses), if
   there is one, is indented with spaces only and no deeper than the overrides line.
4. **The block holds no bare carriage return and no Unicode line or paragraph separator:** no carriage return that is not
   followed by a line feed, and no U+2028 or U+2029, anywhere in the block. The reader splits lines only at a line feed
   (line 380), so a bare carriage return hides what follows it inside one line. And in JavaScript a multiline `^` also
   matches after U+2028 and U+2029, so the reader's block pattern (line 425, and the same pattern in `loadActiveProfiles`
   on line 196) ends the block at such a separator, while the real parser reads it as an ordinary character, inside a
   comment for example.
5. **No line can hide a key:** no line of the block, other than whole-line comments, holds a double quote, a single quote, a
   backslash, `&`, `*`, `<`, `>`, `|`, `!`, `%`, `@` or a backtick, or has a `?` as its first character after the indentation.

Two constants above the function, and one statement between lines 382 and 383:

```js
/** `overrides: {}`: space indentation, the key, the empty map, then nothing or a comment. */
const EMPTY_OVERRIDES_RE = /^ +overrides:[ \t]+\{[ \t]*\}(?:[ \t]*$|[ \t]+#)/;
/** A character with which YAML can write a key this reader cannot see (quoted, escaped, folded, merged, aliased). */
const HIDDEN_KEY_RE = /["'\\&*<>|!%@`]|^\s*\?/;
  // in overridesMisread, directly after `if (at === -1) return false;`
  if (EMPTY_OVERRIDES_RE.test(lines[at]) && !/\r(?!\n)|[\u2028\u2029]/.test(blockBody)
      && !lines.some((l) => !/^\s*#/.test(l) && HIDDEN_KEY_RE.test(l))) {
    const other = lines.some((l, i) => i !== at && !/^\s*#/.test(l) && l.includes('overrides'));
    const rest = lines.slice(at + 1).filter((l) => l.trim() !== '' && !/^\s*#/.test(l));
    const lead = rest.length > 0 ? rest[0].match(/^\s*/)[0] : '';
    return other || /[^ ]/.test(lead) || lead.length > lines[at].match(/^ */)[0].length;
  }
```

**Why the reader's result is then no overrides.** When the statement answers "no misread", no other line outside comments holds
the word `overrides` and this line holds a `{`, so the header pattern of `parseRegimeBlock` (line 237) matches no line and its
`overrides` stays `{}`. That is also what the file says, so no override is dropped in any block the fix newly reads as readable:
every way of writing a second overrides key that the reader cannot see needs one of the characters of condition 4 or condition 5. Condition 2 is needed: without it, `  overrides: {}` followed by `  overrides:` and
`    four_eyes_gate3: True` reads as readable, `parseRegimeBlock` keeps `True` as text, `effectiveControls` (lines 300–303) drops
it, and a built plan finishes without the sign-off the file asks for. Condition 3 does the same for an entry written under it,
condition 4 for `  overrides: {} #` followed by a bare carriage return and a second key, which the reader takes for a comment,
and for `  overrides: {} #` followed by a U+2028 and `x:`, where the reader's block ends so that a second overrides key after it
falls outside the block, and condition 5 for a second key written `"over\x72ides":`, which does not hold the word that condition 2 looks for.

**Before and after** (the answer of `misreadRegime`; each row follows `regulatory_regime:` and `  active_profiles: []` unless it
says otherwise; `<U+2028>` stands for that one character, written `\u2028` in the test source). The two columns are identical except for the empty map, which is rows 1 to 3:

| # | The block | Today | After |
|---|---|---|---|
| 1 | `  overrides: {}`; also `{ }`, a tab in place of a space, spelled `  overrides:\t{}` and `  overrides: {\t}` (a tab in the indentation is row 6), spaces after it, ` # none` after it, and a sibling key or a deeper comment line under it | `'overrides'` | `null` |
| 2 | CTOC's own block: `  declined: true`, `  active_profiles: []`, `  overrides: {}` | `'overrides'` | `null` |
| 3 | a block that holds only `  overrides: {}` (no `active_profiles`, not declined) | `'overrides'` | `'block'`: still unreadable, still held |
| 4 | `  overrides:` with nothing under it, or with `    four_eyes_gate3: true` under it | `null` | `null` |
| 5 | `  overrides:` with `    four_eyes_gate3: True` under it | `'overrides'` | `'overrides'` |
| 6 | any other value: `  overrides:{}`; after `  overrides: ` each of `{}x`, `{}# none`, `{a: b}`, `{four_eyes_gate3: true}`, `[]`, `~`, `null`, `"{}"`; a tab before `overrides: {}` | `'overrides'` | `'overrides'` |
| 7 | `  overrides: {}` with `    four_eyes_gate3: true` under it, also after a blank or a comment line; also `  overrides: {}` followed by `\tfour_eyes_gate3: true` (one tab, no spaces), the same line the comparison uses | `'overrides'` | `'overrides'` |
| 8 | `  overrides: {}`, then `  overrides:` (or `  "overrides":`) and `    four_eyes_gate3: True` | `'overrides'` | `'overrides'` |
| 9 | `  overrides: {} #`, a bare carriage return, then `  declined: true` (or `  overrides:`, a bare carriage return and `    four_eyes_gate3: True`); also exactly `regulatory_regime:\n  active_profiles: []\n  overrides: {}\n  declined: true\r  note: x\n` then the line `timezone: "UTC"`, where the bare carriage return neither ends the `active_profiles` line nor is the last character of the block; also exactly `regulatory_regime:\n  active_profiles: []\n  overrides: {} #<U+2028>x:\n  overrides:\n    four_eyes_gate3: True\ntimezone: "UTC"\n`, where the reader's block ends after the separator and the real parser refuses the text as a duplicated key | `'overrides'` | `'overrides'` |
| 10 | `  overrides: {}`, then `  "over\x72ides":` (written in the test source as `'  "over\\x72ides":'`, so the file holds a literal backslash) and `    four_eyes_gate3: true`; also `  overrides: {}` in a block where another line holds one character of condition 5, such as `  note: a*b` or `  ? note` | `'overrides'` | `'overrides'` |

### Wiring — the live call sites

No new module. `overridesMisread` is called by `misreadRegime` (line 427), which `regimeHold` calls (`src/lib/streaming-gate.js`
line 952); the existing case 56 tests drive that path through `streamingGate.pendingGateDecisions` and `menuScreens.continueAfterCrossing`.

## Acceptance criteria

- [ ] Over the generated set of Step 8, wherever the changed reader answers "readable", `js-yaml` reads the same text and its `regulatory_regime.overrides` is an empty map; exactly the 270 expected texts of 19,062 are readable, and none of them holds a bare carriage return or a character of condition 5.
- [ ] The text of this repository's own `.ctoc/settings.yaml` reads as no misread and no overrides.
- [ ] In a project with CTOC's own block, a functional plan with enough information and a built plan with passing checks both move on their recorded evidence.
- [ ] Every row and spelling of the table gives its "After" answer, and rows 4 to 10 gave that same answer before the change.
- [ ] Each of the four guard removals of Step 11 turns its named tests red, and the code is restored afterwards.
- [ ] The fifteen other test files whose fixtures hold `overrides: {}` give identical results before and after the change.
- [ ] In each of the two timing pairs of Step 12 (line 429 and line 434), the empty-map text is no more than 50% slower than its twin; the figure for this repository's own block has no twin and is only quoted.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above the floor, 0 skipped, 0 flaky.

## Risks, and what is not in this plan

- **A "today" answer, or an expected text of the comparison, is wrong.** The line-feed third of the comparison was run in a scratch copy; the other line endings, the texts with a character of condition 5 and rows 9 and 10, the separator spelling of row 9 included, were read, not run. The runs before the build used `js-yaml` 4.2.0; Step 8 is the first check against the installed 4.3.2. Step 8 runs them all on the unchanged code first. A table row that differs stops the build and is reported, not adjusted; if the real parser refuses a text expected readable, the pattern is narrowed, and the parser's side of the comparison is never loosened.
- **Another test changes its answer.** Fifteen other test files write `overrides: {}` into a settings fixture (a text search; among them `tests/e2e-menu-lifecycle.test.js` lines 323 and 351, with GDPR on). None names the hold, but a text search cannot show what a test reaches when it runs: Step 9 runs all fifteen before the change and Step 14 after, and a changed result stops the build and is reported, because those files are outside `files:`.
- **`js-yaml` is not named in `package.json`.** Version 4.3.2 is installed and marked `dev` in `package-lock.json` (line 912) because `@eslint/eslintrc`, a development dependency, asks for it (line 121). Six test files already load it with a plain `require`, and `eslint.config.js` (lines 114–116) turns off the rules that would refuse that. If it is ever absent, the `require` throws and the whole test file fails loudly.
- **Plans start moving in this repository.** Once this is built, the next menu run here lets every plan that waited only for this reason move on its recorded evidence. That is the fix working, and the owner should expect it.
- **Still held after this fix, so the owner knows.** A block with the empty map keeps waiting for the owner's OK when: the word "overrides" stands anywhere else in the block outside whole-line comments (another line's trailing comment, a value such as `note: no overrides needed`, a key such as `overrides_reviewed:`); a later top-level key has a hyphen or a digit in its name and its section mentions the word (the reader's block does not end at such a key, line 425); `{` and `}` are on separate lines; the value is `!!map {}`, or carries an anchor or an alias, or is `{}# none`; the block holds only the map (row 3); the block holds a bare carriage return, or a U+2028 or U+2029 line or paragraph separator; or any line outside whole-line comments holds a character of condition 5 (a quoted value such as `note: "x"`, an apostrophe in a trailing comment, a `*` or a `>` in a value).
- **The safety claim rests on conditions 4 and 5, and its reason was argued by reading, not run.** Every way of writing a second overrides key that the reader cannot see (an escaped or quoted key such as `"over\x72ides":`, a key folded over two lines, a merge or alias key, a key after a quoted value at column 0) needs one of the characters of condition 5, and a key behind a bare carriage return or past a line or paragraph separator needs one of the characters of condition 4, so a block the fix newly reads as readable holds none, and "no override is dropped" is true for every newly readable block. Steps 11 and 13 attack exactly that sentence. A block without the empty-map line still drops such a key, as it does today; that stays in the large plan. An overrides line indented differently from its sibling keys or nested under another key belongs to a block a real parser refuses or reads without an overrides key; the reader has never read indentation as structure, so with the empty map it now answers "no overrides" there too, and the file states none there either. The generated set keeps the line at its siblings' indentation.
- **Timing: empty-map blocks now reach two slow statements.** `overridesMisread` itself is linear. But a block with the empty map no longer returns at line 427, so it, this repository's own included, now reaches two unchanged statements in `misreadRegime` whose time grows with the square of the input: the pattern on line 429 for `active_profiles` and `/\s+#.*$/` on line 434 (80,000 spaces or blank lines take about 3 seconds). Both are equally slow today for a block without the empty map. Step 12 measures it; fixing the two patterns stays in the large plan.
- **Not in this plan; they are in the large plan:** a strict reading of the rest of the block, other spellings of the header, encodings, and the timing of the other patterns. Two findings for the owner to schedule, both true today without the empty-map line, so they belong to the large plan:
  - A U+2028 in a comment of the block, followed by a name and a colon, ends the reader's block early and drops a valid override written later in the block.
  - A bare carriage return at the end of the `active_profiles` line hides the next line from both readers (`overridesMisread` and `parseRegimeBlock`) and drops a valid override.

## Decisions Taken Under Ambiguity

1. **Spaces or tabs after the `}` with no comment count as "nothing".** Line 383 already allows them after the bare key, the real parser reads the same empty map, and a character nobody can see must not hold every plan. To refuse them instead, `[ \t]*$` becomes `$`.
2. **Conditions 2, 4 and 5, and "spaces only" in conditions 1 and 3, are not in the owner's wording.** Each only narrows what is let through, and condition 2 is needed for `safe_because` to be true. It tests for the word on purpose, so it also refuses a second key spelled `"overrides":`, whose entries the reader would drop. Every text it refuses is held today, so it makes nothing worse; its cost is that a block where another line's own comment says "overrides" keeps today's answer. To narrow it to the exact key, `l.includes('overrides')` becomes `/^\s+overrides:/.test(l)`.
3. **"The next non-empty line" is read as the next line that is neither blank nor a comment.** Otherwise a comment line at the same indentation followed by a deeper entry is let through, and the real parser refuses that text.
4. **The comparison also holds an expected answer per text.** Its one-way claim alone is true today, because no text is readable, so it could not be seen failing first.
5. **No new export.** `overridesMisread` stays internal; the new cases go through `misreadRegime`, as the existing ones do.
6. **In the comparison, the line ending under test ends the overrides line and every line after it, the `timezone: "UTC"` line included; the two lines above it always end in a line feed.** With a bare carriage return after `regulatory_regime:` the block pattern on line 425 finds no block and answers `'block'` for every text, so condition 4 would never be reached.
7. **The texts for condition 5 are twins of the 270 readable texts only, not a seventh part crossed with all 15,552.** Each twin differs from a readable text by one line, so the character alone must turn the answer; crossing it with every text would add 202,176 texts that are unreadable for another reason already.
8. **A U+2028 or U+2029 in the block is refused, not split on.** The reader's block pattern already ends the block at one, so splitting lines there would change another rule of the reader, which is out of this plan. Refusing only keeps today's answer for such a block.
9. **The check on CTOC's own file accepts either line ending: `assert.match(text, /^  overrides: \{\}\r?$/m)`.** CTOC runs on Windows, macOS and Linux, the repository has no `.gitattributes`, and so the file's line endings depend on the checkout; an exact-line check after splitting on line feeds would fail on a Windows checkout with a carriage return plus a line feed. The rest of that test is unaffected by a carriage return plus a line feed, because the reader splits on an optional carriage return before the line feed (line 380).

**Open question:** none blocks the build. One finding outside this plan, for the owner to schedule: `js-yaml` is required by `src/lib/circuit-breaker.js` (line 62) and by six test files, yet `package.json` does not name it.

## Attacked before the build (2026-10-10)

The red-team critic attacked this plan by reading; the threat modeler ran the plan's change in a scratch copy against `js-yaml` 4.2.0. Verdict: nothing gets through because of this change. These runs used 4.2.0, not the installed 4.3.2, so Step 8 is the first check against the installed parser.

- **Run 1:** the plan's own 5,184 texts, with line feeds: exactly the 135 expected were readable, and the parser agreed on all 135.
- **Run 2:** 3,000,000 random blocks: 0 override differences where the matched line was the file's own overrides key.
- **Change 1:** condition 4, a bare carriage return leaves today's answer standing; in the code block, row 9 and the tests.
- **Change 2:** the comparison varies the line ending; its counts are worked out again (15,552 texts, 270 expected readable).
- **Change 3:** the claim "no override is dropped" was first scoped to the block's own overrides key, with the keys the reader cannot see named; change 7 then closed that exception.
- **Change 4:** the timing risk names the two slow statements that empty-map blocks now reach; Step 12 measures the whole check.
- **Change 5:** Step 13 attacks with a bare carriage return, and a finding readable today without the empty-map line goes to the large plan.
- **Change 6:** the risks name what is still held after the fix.
- **Change 7, second round:** condition 5, a block with a character that can hide a key keeps today's answer; in the code block, row 10, the comparison (19,062 texts, 270 expected readable), `safe_because` and the safety sentence, now without the exception.
- **Change 8, second round:** Step 11 uses the rule of Step 13 for a finding that is readable today without the empty-map line.

## Plan review before the build (2026-10-11)

Round 1 by the iron-loop critic; nine findings folded in:

1. Condition 4 also refuses U+2028 and U+2029, where JavaScript's multiline `^` ends the reader's block early; the code block, row 9, Step 13, the risks, `safe_because` and decision 8 follow.
2. Row 9's spelling with a bare carriage return on another line is written out exactly.
3. The comparison writes each text with `fs.writeFileSync`, never through `writeSettings`, and gives the same string to the parser.
4. One test per table row and spelling, the twins in their own test, and the comparison collects every mismatch before one assertion.
5. The installed `js-yaml` is 4.3.2, asked for on line 121 of `package-lock.json`; the runs before the build used 4.2.0.
6. Row 1's tab spellings and row 10's backslash are written exactly; the lead guard also turns the comparison red.
7. Step 12 names its timing texts, five runs each, and when the build stops.
8. Step 16 checks the guard removals, the fifteen fixture files and the timing.
9. Step 9 runs only the fifteen fixture files; the guard removals moved to Step 11.

Round 2 by the iron-loop critic; three new findings folded in:

1. The line-429 twin keeps a line, `  note: x`, in place of the overrides line, because the block pattern on line 425 swallows blank lines directly after the header and the twin would be fast; the 50% rule in Step 12, the acceptance criterion and Step 16 covers the two named pairs only, and the own-block figure is only quoted.
2. The reason for not using `writeSettings` in the comparison is corrected: it appends a second `timezone` line, so the file would not be the string given to the parser.
3. Row 7's tab spelling is written exactly: `\tfour_eyes_gate3: true`, one tab and no spaces, the line the comparison uses.

Round 3 by the iron-loop critic: the round-2 fixes hold; one new minor finding, recorded as decision 9:

1. The check that CTOC's own file still holds `  overrides: {}` is spelled `assert.match(text, /^  overrides: \{\}\r?$/m)`, so a Windows checkout with a carriage return plus a line feed passes it too.

The review stops here: three rounds is the most.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [ ] Write the tests first. In `tests/lib-regulatory-regime.test.js`, add `const yaml = require('js-yaml');` under line 39 (as `tests/agent-dispatch-resolution.test.js` line 23 does) and three cases after line 508, inside the describe that starts on line 375:
  1. **The comparison, written first, in two tests.** Each text is `regulatory_regime:`, `  active_profiles: []`, one generated overrides line, the lines after it, then `timezone: "UTC"`. The line is every combination of five parts, and each text is written with each of three line endings (2 × 4 × 12 × 6 × 9 × 3 = 15,552 texts; `\t` is a tab): indentation (two spaces; `\t`); after the colon (nothing; one space; two spaces; `\t`); value (`{}`, `{ }`, `{\t}`, `{}x`, `{}{}`, `{a: b}`, `{four_eyes_gate3: true}`, `[]`, `~`, `null`, `{`, `"{}"`); after the value (nothing; one space; `\t`; ` # none`; `\t# none`; `# none`); lines after (none; `    four_eyes_gate3: true`; `    # four_eyes_gate3: true`; a blank line then that entry; `  # note` then that entry; `\tfour_eyes_gate3: true`; `  declined: true`; `  overrides:` then `    four_eyes_gate3: True`; `  "overrides":` then `    four_eyes_gate3: true`); line ending, placed as decision 6 says, so the `timezone: "UTC"` line also ends with it (a line feed; a carriage return plus a line feed; a bare carriage return).
     One bare project; each text is written with `fs.writeFileSync(path.join(root, '.ctoc', 'settings.yaml'), text)`, never through the test file's `writeSettings` helper (lines 82–87), which appends a second `timezone` line, so the file would no longer be the string given to `yaml.load` (and the parser would refuse the file as a duplicated key). The same string goes to `yaml.load`. `readable` is `regime.misreadRegime(root) === null`. Per text: (a) when readable, `yaml.load(text).regulatory_regime.overrides` deep-equals `{}`, and a parser error counts as a mismatch; (b) `readable` equals the answer worked out from the parts: two spaces, something after the colon, one of the first three values, any ending of the value but the bare `# none`, after it nothing, the comment or `  declined: true`, and a line ending that is not the bare carriage return (1 × 3 × 3 × 5 × 3 × 2 = 270: 135 with a line feed, 135 with a carriage return plus a line feed, 0 of the 5,184 with a bare carriage return).
     The first test runs the 15,552 texts, collects every text where (a) or (b) fails, with its parts and which of the two failed, and asserts once that the list is empty, with the list as the message. Red today: "270 mismatches, all of them expected readable".
     The second test runs the twins: each of the 270 texts expected readable is written 13 more times with one extra line directly above the overrides line, ending in a line feed: `  note: a`, one character, `b` for each of the twelve characters of condition 5, and `  ? note` for the question mark (270 × 13 = 3,510 texts, none expected readable; 15,552 + 3,510 = 19,062 texts in all, 270 expected readable). It too collects every mismatch and asserts once. Green today and after: a guard.
  2. **CTOC's own file.** Read this repository's `.ctoc/settings.yaml`, assert that it still holds the line `  overrides: {}` with `assert.match(text, /^  overrides: \{\}\r?$/m)`, which accepts either line ending (decision 9) (so the case fails loudly if the file changes), write the same text into a bare project, and assert that `misreadRegime` is `null` and `loadActiveProfiles(root).overrides` is `{}`. Red today: `'overrides'`.
  3. **The table, one test per row and per spelling.** The rows and spellings of the table above are a list of label, text and expected answer, and a loop generates one `it` per entry (as `tests/plans-keep-moving-without-the-human.test.js` line 1751 does), so a red row cannot hide the rows after it. Each entry goes through `bareProject` and `misreadRegime`, except the spellings of row 9 written out in full with their own `timezone` line, which are written with `fs.writeFileSync` as in the comparison. Red today: rows 1 to 3. Rows 4 to 10 are guards, green before and after.
- [ ] In `tests/plans-keep-moving-without-the-human.test.js`, the `noRegime` table (lines 1746–1750) gains one entry, `"CTOC's own block (declined, an empty list, an empty overrides map)"`, with the text `regulatory_regime:\n  declined: true\n  active_profiles: []\n  overrides: {}\n`. The loop on lines 1751–1762, unchanged, runs it as a fourth "case 56 — guard, …: both plans cross as today". Red today: the hold is `regime-unreadable` and neither plan moves. No other case that is already in either file changes.
- [ ] Run both files on the unchanged code and quote the result: the first comparison test red with "270 mismatches, all of them expected readable", CTOC's own file, the tests of rows 1 to 3 and the new case 56 entry red; every other test green, the twins and every spelling of rows 4 to 10 included.
### Step 9: PREPARE
- [ ] Confirm that `require('js-yaml')` resolves and quote its version (4.3.2 by `package-lock.json` line 912; a different version is quoted, not hidden). Run the fifteen other test files whose fixtures hold `overrides: {}` on the unchanged code and quote the results as the "before". The two files of Step 8 are not run again here.
### Step 10: IMPLEMENT
- [ ] `src/lib/regulatory-regime.js`: the two constants above the comment block of `overridesMisread` (line 371) and the statement between lines 382 and 383, exactly as written above. Nothing else in the file changes.
### Step 11: REVIEW
- [ ] Before the critic's attack, the executor proves that the guards can fail: each change run once on `tests/lib-regulatory-regime.test.js`, quoted, and reverted. Without `other`, the `  overrides:` spelling of row 8 and the comparison turn red. Without `/[^ ]/.test(lead)`, the tab spelling of row 7 and the comparison turn red. Without the whole test `!/\r(?!\n)|[\u2028\u2029]/.test(blockBody)`, every spelling of row 9, the separator spelling included, and the bare-carriage-return third of the comparison turn red. Without the `HIDDEN_KEY_RE` test, row 10 and the 3,510 twins turn red. After the last revert, the file is exactly the Step 10 change and both files of Step 8 are green.
- [ ] The critic attacks the one area: any text for which the new statement answers "no misread" while the file states an override, or while `loadActiveProfiles` returns one, is a finding. A finding that is readable today without the empty-map line belongs to the large plan: it is reported and does not stop this one.
### Step 12: OPTIMIZE
- [ ] Confirm by reading that the new pattern is anchored at the start of the line and linear: it backtracks only over the trailing spaces and tabs; and that the carriage-return and separator test is one pass over the block. Quote the run time of the comparison tests.
- [ ] Measure the whole check, `misreadRegime`, not only the changed function, on the changed code, each text written with `fs.writeFileSync` and timed as the median of 5 runs: this repository's own block; for line 429, `regulatory_regime:\n  overrides: {}\n` + 80,000 line feeds + `  declined: true\n  active_profiles: []\n`, and its twin `regulatory_regime:\n  note: x\n` + 80,000 line feeds + `  declined: true\n  active_profiles: []\n` (the overrides line replaced by `  note: x`, not removed, because the block pattern on line 425 swallows blank lines directly after the header, so without a line there the twin's block would be two short lines and the twin fast); for line 434, `regulatory_regime:\n  active_profiles: []` + 80,000 spaces + `x\n  overrides: {}\n`, and its twin without the `  overrides: {}` line. Quote all five figures. They go to the large plan and do not stop this one, unless in one of the two named pairs (line 429 and line 434) the empty-map text is more than 50% slower than its twin; then the build stops and is reported. This repository's own block has no twin: its figure is only quoted.
### Step 13: SECURE
- [ ] The security scanner tries to get a control dropped through the new statement: a second or a nested overrides key in any spelling, tabs, Windows line endings, a bare carriage return, the Unicode line and paragraph separators U+2028 and U+2029, a key hidden without any character of condition 5, a byte-order mark, a very long line. A finding that is readable today without the empty-map line belongs to the large plan: it is reported and does not stop this one.
### Step 14: VERIFY
- [ ] Run `npm test`: lint, typecheck, all tests, coverage at or above the floor in `.ctoc/coverage-baseline.json`, 0 skipped, 0 flaky; the fifteen files give the same results as in the preparation.
- [ ] Live, reading only, so that the build itself moves no plan of this repository: quote `misreadRegime` of this repository's root, which is `null`. The first menu run after the build shows the owner the effect.
### Step 15: DOCUMENT
- [ ] The comment blocks of `overridesMisread` (lines 371–378) and of `misreadRegime` (its `overrides` item, lines 408–409) say that the empty map is read as no overrides, and name the five conditions.
### Step 16: FINAL-REVIEW
- [ ] Every acceptance box is checked against its evidence; the "Today" and "After" columns of the table are quoted from the runs.
- [ ] Each of the four guard removals of Step 11 turned its named tests red, its run is quoted, and it was reverted: `src/lib/regulatory-regime.js` holds exactly the Step 10 change.
- [ ] The fifteen fixture files gave identical results in Step 9 (before) and Step 14 (after).
- [ ] In each of the two timing pairs of Step 12 (line 429 and line 434), the empty-map text is no more than 50% slower than its twin, from the quoted medians; the own-block figure is quoted and has no twin.
