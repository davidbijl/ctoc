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

- [x] Over the generated set of Step 8, wherever the changed reader answers "readable", `js-yaml` reads the same text and its `regulatory_regime.overrides` is an empty map; exactly the 270 expected texts of 19,062 are readable, and none of them holds a bare carriage return or a character of condition 5.
- [x] The text of this repository's own `.ctoc/settings.yaml` reads as no misread and no overrides.
- [x] In a project with CTOC's own block, a functional plan with enough information and a built plan with passing checks both move on their recorded evidence.
- [x] Every row and spelling of the table gives its "After" answer, and rows 4 to 10 gave that same answer before the change.
- [x] Each of the four guard removals of Step 11 turns its named tests red, and the code is restored afterwards.
- [x] The fifteen other test files whose fixtures hold `overrides: {}` give identical results before and after the change.
- [x] In each of the two timing pairs of Step 12 (line 429 and line 434), the empty-map text is no more than 50% slower than its twin; the figure for this repository's own block has no twin and is only quoted.
- [x] `npm test` passes: lint, typecheck, all tests, coverage at or above the floor, 0 skipped, 0 flaky.

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

10. **The check on CTOC's own file is spelled `/^ {2}overrides: \{\}\r?$/m` in the test source.** The repository's lint rule `no-regex-spaces` refuses two literal spaces in a pattern; ` {2}` matches exactly the same strings as decision 9's spelling.
11. **"This repository's own block" in the Step 12 timing is the whole `.ctoc/settings.yaml` text,** written as is, because `misreadRegime` reads the whole file and extracts the block itself.
12. **Fix round 1: a flow collection anywhere else in the block is refused (critic finding F1, scanner finding OVR-3).** The statement also answers "misread" when a line outside whole-line comments, other than the empty-map line itself, holds a `[` or a `{`, after an `active_profiles` list closed on its own line (`INLINE_PROFILES_RE`) is taken out of that line. Why: a flow collection opened on another line, such as `  note: [`, continues past a key at column 0 (`x: y]`), where the reader's block pattern ends, so a second `overrides:` written after it falls outside the reader's block while the real parser reads it (row 11 of the fix-round tests: the reader `{}`, js-yaml `{"four_eyes_gate3":true}`). The exemption keeps `  active_profiles: []` and `[gdpr, hipaa]` readable: a list closed on its line, with no `[`, `{`, `]` or `#` inside it, opens nothing that continues; without the exemption CTOC's own block and all 270 readable texts would be refused.
13. **Fix round 1: a whole-line comment has only spaces or tabs before its `#` (critic finding F2).** YAML's white space is the space and the tab; a line led by a non-breaking space and a `#` is a key to the real parser (js-yaml reads the key as the non-breaking space followed by `#n`), but `/^\s*#/` called it a comment, so a `[` or a `"` on it went unseen (both spellings of row 12). `COMMENT_LINE_RE`, `/^[ \t]*#/`, replaces `/^\s*#/` in all four places of the new statement. Counting fewer lines as comments only puts more lines under conditions 2, 3 and 5.
14. **Fix round 1: condition 3 also refuses a `-` list item as the next line (scanner finding OVR-1).** With `overrides: {}` inside an item of a block list of profiles (`    - gdpr :` then `      overrides: {}` then `    - hipaa`), the profile loop of `parseRegimeBlock` ends at the empty-map line, a non-item line, and drops `hipaa` (row 13). The rule is narrow on purpose: only the next line that is neither blank nor a comment is looked at, and only for a leading `-`. What would flip it to a wider rule: a text this clause lets through whose dropped item disappears when the empty-map line is removed, so the empty map itself causes the drop. The obvious candidate was run: with `      note: x` after the empty map and its twin without the empty-map line, the twin drops `hipaa` today too (the reader `["gdpr"]`, js-yaml `[{"gdpr":null,"note":"x"},"hipaa"]`), so that drop is not caused by the empty map and belongs to the large plan.
15. **Fix round 1: condition 4 also refuses U+0085, the next-line character (scanner finding OVR-5).** `safe_because` says a newly readable block holds no line or paragraph separator. The reader does not split at U+0085 and JavaScript's multiline `^` does not match after it (checked), and js-yaml 4.3.2, a YAML 1.2 parser, reads it as an ordinary character (row 14: `overrides` `{}`); but PyYAML 6.0.3, a YAML 1.1 parser, reads it as a line break and finds the second key (`{'four_eyes_gate3': True}`, run on this machine). Refusing keeps the claim true for either kind of parser.
16. **The code now narrows the code block of the specification, and the specification text is left unchanged on purpose.** Every change of fix round 1 only refuses more: two extra conditions that must hold before the statement can answer "no misread", one extra way to answer "misread", and a comment test that counts fewer lines as comments. The 270 readable texts of the comparison, rows 1 and 2 and CTOC's own file stay readable (the tests say so). The code block, the conditions, the table and the acceptance criteria are not edited, because the approval binds that text byte for byte; the narrowing is recorded here and in the Execution Log instead.
17. **Findings for the large plan, all true today without the empty-map line (one line each, for the owner to schedule):**
    - Critic finding F3: a multi-line flow or quoted value ends the reader's block at a column-0 key, with no empty map needed, and a later override falls outside the block.
    - Critic finding F4: a decoy `regulatory_regime:` header behind a U+2028, and a quoted header, are read differently by the reader and the real parser.
    - Scanner finding OVR-2 outside the new statement: `/^\s*#/` still calls a line led by a non-breaking space a comment at the other three sites (`parseRegimeBlock`'s two loops and the rest of `overridesMisread`).
    - Scanner finding OVR-3 without the empty map: a flow collection opened on another line hides a later `overrides:` from a block that has no empty-map line.
    - Scanner finding OVR-4, widened: any non-item line inside the block list of profiles ends it today (an empty `-` item, a list item that is a mapping such as `- gdpr :` with `note: x` under it) and drops the items after it.
    - Scanner finding OVR-5's twin on a comment line: a U+0085 in a whole-line comment, with a key after it, is a line break to a YAML 1.1 parser and is unseen by the reader.
    - Scanner finding OVR-6: an alias used as a key.
    - Scanner finding OVR-7: duplicate keys, read last-wins by some parsers, where the reader takes the first.
18. **Fix round 2: condition 3 also refuses a next line that starts with a comma, `]` or `}` (critic finding R2-1).** The list-item clause is now `/^\s*[-,\]}]/`. Why: a flow list opened before the header (`note: [`), with the real block written later under a quoted header (`"regulatory_regime":`), makes the empty-map line one entry of that list. The reader's block ends at `x: y]` and holds only `  ,`, `  declined: true` and the empty map, so the reader answered "no misread" and `effectiveControls` was empty, while js-yaml reads `regulatory_regime.overrides` as `{"four_eyes_gate3":true}` (row 15). The comma spelling belongs to this change by the twin rule: without the empty-map line the text holds two commas in a row and js-yaml refuses it ("expected the node content, but found ','"). The empty-map line cannot carry a comma (`EMPTY_OVERRIDES_RE` allows only a comment after `}`), and js-yaml 4.3.2 (`readFlowCollection` in `lib/loader.js`, read) throws unless the first character after a flow entry, past spaces, tabs, line breaks and comments, is a comma or the closer. So inside any flow collection js-yaml accepts, the line after the empty map starts with `,`, `]` or `}`, and the clause refuses every such text. `]` and `}` are taken with the comma although, on their own, they belong to the large plan by the twin rule (removing the empty-map line leaves a trailing comma, which YAML allows, and that twin drops the override today too); the same character class closes them at no cost and makes the clause's claim exact. A line that starts with `,`, `]` or `}` is never valid in a block (each is a flow indicator, which cannot start a plain scalar, and condition 5 already refuses quoted and block scalars), so nothing valid that was readable is refused. Rows 11 and 12 (its bracket spelling) are now also refused by this clause, because a comma follows their empty map; the flow clause stays proven by the 810 twins and by the brace row of decision 19. As decision 16 says, this only refuses more, and the specification text is left unchanged.
19. **Fix round 2: two guard rows for the exemption of a closed inline `active_profiles` list (critic finding R2-2).** The exemption was tested only with `[]`, so widening `INLINE_PROFILES_RE` to the whole line, or narrowing it to `[]`, went unnoticed by the suite. Row 1 gains `regulatory_regime:\n  active_profiles: [gdpr]\n  overrides: {}\n` (`null`; narrowing the pattern turns it red), and row 11 gains `regulatory_regime:\n  active_profiles: [gdpr] {\n  overrides: {}\n` (`'overrides'`; widening it turns it red). Both are guards, green before and after.
20. **Decision 12's wording, corrected (critic finding R2-3).** A closed inline list holds no `[`, `]`, `{`, `}` or `#`; decision 12 leaves out `}`. The code (`INLINE_PROFILES_RE`, `[^[\]{}#]`) already excluded it and does not change. Decision 12 is left as written, because decisions are only appended to.
21. **Findings for the large plan from the security scanner's second round, both true at `f884f4ab` without the empty-map line (one line each, for the owner to schedule):**
    - A nested `active_profiles` key is read first: `regulatory_regime:\n  note:\n    active_profiles: []\n  active_profiles: [gdpr]\n  overrides: {}\n` gives the reader the profiles `[]`, and js-yaml gives `[gdpr]`.
    - The key spelled `active_profiles :`, with a space before the colon, is invisible to the reader, which reads no profiles while the real parser reads the list.
    - Reported again and already in decision 17: duplicate `active_profiles` keys read last-wins (scanner finding OVR-7), and a list item that is a mapping (scanner finding OVR-4). For information only: some newly readable texts are refused by both parsers, so no override is dropped there.
22. **Findings for the large plan from the final review, both true at `f884f4ab` without the empty-map line (one line each, for the owner to schedule):**
    - Critic finding LP-1: a top-level key with a hyphen, digit or dot in its name (`ci-2:`) does not end the reader's block, so that key's own `overrides:` are read as the regime's and can switch off sign-off controls; fix: the block lookahead `(?=^[^ \t\r\n#]|(?![\s\S]))` at both sites.
    - Critic finding LP-2: `active_profiles` spelled quoted (`"active_profiles": [gdpr]`) or as an explicit key (`? active_profiles`) is invisible to the reader, which then reads no profiles.
    - A wording note for the owner (security scanner, final round): `safe_because` reads wider than what holds. Under the twin rule, a decoy file that was held only because of the empty map now passes while the real parser sees a control; its twin without the empty-map line already passes today, so the change grants nothing new.

23. **Scope growth after the merge into main (owner's answer 2026-10-11: "Yes, add the fourth kind").** In main, `npm test` failed 1 of 13,136: case 4 of `tests/ledger-forgery-closed.test.js` lists the kinds of approval record it accepts as backfilled, human and pipeline, and this plan's own record `.ctoc/approvals/an-empty-overrides-map-is-read-as-empty.json`, written by the menu when the plan moved on its evidence, is the first real record with `advanced_by: sufficiency`, a kind `entryKind` in `src/lib/approval-ledger.js` (line 972) accepts. The test now knows the fourth kind in both places the case lists the kinds: `classificationMismatch` gains the sufficiency branch (as filed in the scope-growth request), and the closing sum that every real entry falls into a recognised kind adds `tally.sufficiency`, without which the case stays red (602 of 603). The assertion that no real entry is unknown is kept. The plan's `files:` list is not edited, because the approval binds it.

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
- [x] Write the tests first. In `tests/lib-regulatory-regime.test.js`, add `const yaml = require('js-yaml');` under line 39 (as `tests/agent-dispatch-resolution.test.js` line 23 does) and three cases after line 508, inside the describe that starts on line 375:
  1. **The comparison, written first, in two tests.** Each text is `regulatory_regime:`, `  active_profiles: []`, one generated overrides line, the lines after it, then `timezone: "UTC"`. The line is every combination of five parts, and each text is written with each of three line endings (2 × 4 × 12 × 6 × 9 × 3 = 15,552 texts; `\t` is a tab): indentation (two spaces; `\t`); after the colon (nothing; one space; two spaces; `\t`); value (`{}`, `{ }`, `{\t}`, `{}x`, `{}{}`, `{a: b}`, `{four_eyes_gate3: true}`, `[]`, `~`, `null`, `{`, `"{}"`); after the value (nothing; one space; `\t`; ` # none`; `\t# none`; `# none`); lines after (none; `    four_eyes_gate3: true`; `    # four_eyes_gate3: true`; a blank line then that entry; `  # note` then that entry; `\tfour_eyes_gate3: true`; `  declined: true`; `  overrides:` then `    four_eyes_gate3: True`; `  "overrides":` then `    four_eyes_gate3: true`); line ending, placed as decision 6 says, so the `timezone: "UTC"` line also ends with it (a line feed; a carriage return plus a line feed; a bare carriage return).
     One bare project; each text is written with `fs.writeFileSync(path.join(root, '.ctoc', 'settings.yaml'), text)`, never through the test file's `writeSettings` helper (lines 82–87), which appends a second `timezone` line, so the file would no longer be the string given to `yaml.load` (and the parser would refuse the file as a duplicated key). The same string goes to `yaml.load`. `readable` is `regime.misreadRegime(root) === null`. Per text: (a) when readable, `yaml.load(text).regulatory_regime.overrides` deep-equals `{}`, and a parser error counts as a mismatch; (b) `readable` equals the answer worked out from the parts: two spaces, something after the colon, one of the first three values, any ending of the value but the bare `# none`, after it nothing, the comment or `  declined: true`, and a line ending that is not the bare carriage return (1 × 3 × 3 × 5 × 3 × 2 = 270: 135 with a line feed, 135 with a carriage return plus a line feed, 0 of the 5,184 with a bare carriage return).
     The first test runs the 15,552 texts, collects every text where (a) or (b) fails, with its parts and which of the two failed, and asserts once that the list is empty, with the list as the message. Red today: "270 mismatches, all of them expected readable".
     The second test runs the twins: each of the 270 texts expected readable is written 13 more times with one extra line directly above the overrides line, ending in a line feed: `  note: a`, one character, `b` for each of the twelve characters of condition 5, and `  ? note` for the question mark (270 × 13 = 3,510 texts, none expected readable; 15,552 + 3,510 = 19,062 texts in all, 270 expected readable). It too collects every mismatch and asserts once. Green today and after: a guard.
  2. **CTOC's own file.** Read this repository's `.ctoc/settings.yaml`, assert that it still holds the line `  overrides: {}` with `assert.match(text, /^  overrides: \{\}\r?$/m)`, which accepts either line ending (decision 9) (so the case fails loudly if the file changes), write the same text into a bare project, and assert that `misreadRegime` is `null` and `loadActiveProfiles(root).overrides` is `{}`. Red today: `'overrides'`.
  3. **The table, one test per row and per spelling.** The rows and spellings of the table above are a list of label, text and expected answer, and a loop generates one `it` per entry (as `tests/plans-keep-moving-without-the-human.test.js` line 1751 does), so a red row cannot hide the rows after it. Each entry goes through `bareProject` and `misreadRegime`, except the spellings of row 9 written out in full with their own `timezone` line, which are written with `fs.writeFileSync` as in the comparison. Red today: rows 1 to 3. Rows 4 to 10 are guards, green before and after.
- [x] In `tests/plans-keep-moving-without-the-human.test.js`, the `noRegime` table (lines 1746–1750) gains one entry, `"CTOC's own block (declined, an empty list, an empty overrides map)"`, with the text `regulatory_regime:\n  declined: true\n  active_profiles: []\n  overrides: {}\n`. The loop on lines 1751–1762, unchanged, runs it as a fourth "case 56 — guard, …: both plans cross as today". Red today: the hold is `regime-unreadable` and neither plan moves. No other case that is already in either file changes.
- [x] Run both files on the unchanged code and quote the result: the first comparison test red with "270 mismatches, all of them expected readable", CTOC's own file, the tests of rows 1 to 3 and the new case 56 entry red; every other test green, the twins and every spelling of rows 4 to 10 included.
### Step 9: PREPARE
- [x] Confirm that `require('js-yaml')` resolves and quote its version (4.3.2 by `package-lock.json` line 912; a different version is quoted, not hidden). Run the fifteen other test files whose fixtures hold `overrides: {}` on the unchanged code and quote the results as the "before". The two files of Step 8 are not run again here.
### Step 10: IMPLEMENT
- [x] `src/lib/regulatory-regime.js`: the two constants above the comment block of `overridesMisread` (line 371) and the statement between lines 382 and 383, exactly as written above. Nothing else in the file changes.
### Step 11: REVIEW
- [x] Before the critic's attack, the executor proves that the guards can fail: each change run once on `tests/lib-regulatory-regime.test.js`, quoted, and reverted. Without `other`, the `  overrides:` spelling of row 8 and the comparison turn red. Without `/[^ ]/.test(lead)`, the tab spelling of row 7 and the comparison turn red. Without the whole test `!/\r(?!\n)|[\u2028\u2029]/.test(blockBody)`, every spelling of row 9, the separator spelling included, and the bare-carriage-return third of the comparison turn red. Without the `HIDDEN_KEY_RE` test, row 10 and the 3,510 twins turn red. After the last revert, the file is exactly the Step 10 change and both files of Step 8 are green.
- [x] The critic attacks the one area: any text for which the new statement answers "no misread" while the file states an override, or while `loadActiveProfiles` returns one, is a finding. A finding that is readable today without the empty-map line belongs to the large plan: it is reported and does not stop this one.
### Step 12: OPTIMIZE
- [x] Confirm by reading that the new pattern is anchored at the start of the line and linear: it backtracks only over the trailing spaces and tabs; and that the carriage-return and separator test is one pass over the block. Quote the run time of the comparison tests.
- [x] Measure the whole check, `misreadRegime`, not only the changed function, on the changed code, each text written with `fs.writeFileSync` and timed as the median of 5 runs: this repository's own block; for line 429, `regulatory_regime:\n  overrides: {}\n` + 80,000 line feeds + `  declined: true\n  active_profiles: []\n`, and its twin `regulatory_regime:\n  note: x\n` + 80,000 line feeds + `  declined: true\n  active_profiles: []\n` (the overrides line replaced by `  note: x`, not removed, because the block pattern on line 425 swallows blank lines directly after the header, so without a line there the twin's block would be two short lines and the twin fast); for line 434, `regulatory_regime:\n  active_profiles: []` + 80,000 spaces + `x\n  overrides: {}\n`, and its twin without the `  overrides: {}` line. Quote all five figures. They go to the large plan and do not stop this one, unless in one of the two named pairs (line 429 and line 434) the empty-map text is more than 50% slower than its twin; then the build stops and is reported. This repository's own block has no twin: its figure is only quoted.
### Step 13: SECURE
- [x] The security scanner tries to get a control dropped through the new statement: a second or a nested overrides key in any spelling, tabs, Windows line endings, a bare carriage return, the Unicode line and paragraph separators U+2028 and U+2029, a key hidden without any character of condition 5, a byte-order mark, a very long line. A finding that is readable today without the empty-map line belongs to the large plan: it is reported and does not stop this one.
### Step 14: VERIFY
- [x] Run `npm test`: lint, typecheck, all tests, coverage at or above the floor in `.ctoc/coverage-baseline.json`, 0 skipped, 0 flaky; the fifteen files give the same results as in the preparation.
- [x] Live, reading only, so that the build itself moves no plan of this repository: quote `misreadRegime` of this repository's root, which is `null`. The first menu run after the build shows the owner the effect.
### Step 15: DOCUMENT
- [x] The comment blocks of `overridesMisread` (lines 371–378) and of `misreadRegime` (its `overrides` item, lines 408–409) say that the empty map is read as no overrides, and name the five conditions.
### Step 16: FINAL-REVIEW
- [x] Every acceptance box is checked against its evidence; the "Today" and "After" columns of the table are quoted from the runs.
- [x] Each of the four guard removals of Step 11 turned its named tests red, its run is quoted, and it was reverted: `src/lib/regulatory-regime.js` holds exactly the Step 10 change.
- [x] The fifteen fixture files gave identical results in Step 9 (before) and Step 14 (after).
- [x] In each of the two timing pairs of Step 12 (line 429 and line 434), the empty-map text is no more than 50% slower than its twin, from the quoted medians; the own-block figure is quoted and has no twin.

## Execution Log (Steps 8–16)

Executor run of 2026-10-11 in the build worktree (branch `worktree-agent-a3000e08951db557d`). Steps 11 (the critic's attack), 13 and 16 are run by others and stay unticked.

### Step 8: TEST — red on the unchanged code
`node --test tests/lib-regulatory-regime.test.js` on the unchanged `src/lib/regulatory-regime.js`: `tests 93, pass 81, fail 12, skipped 0`. Red, as expected:
- `the empty overrides map: over 15,552 texts ...` — `AssertionError: 270 mismatches, all of them expected readable` (first entries: `{"indent":"  ","colon":" ","value":"{}","ending":"","after":[],"eol":"\n"} ... "(b) readable is false, expected true"`).
- `CTOC's own settings file reads as no misread and no overrides`.
- Row 1 (eight spellings), row 2, row 3: actual `'overrides'` for each; row 3 expected `'block'`.

Green on the unchanged code: the 3,510 twins guard, and every spelling of rows 4 to 10 (2 + 1 + 10 + 4 + 2 + 4 + 3 = 26 tests). Every "Today" answer of the table matched the unchanged code.

`node --test tests/plans-keep-moving-without-the-human.test.js`: `tests 97, pass 96, fail 1`; the one red test is the new `case 56 — guard, CTOC's own block (declined, an empty list, an empty overrides map): both plans cross as today` with `+ 'regime-unreadable' - null`.

### Step 9: PREPARE
`require('js-yaml/package.json').version` → `4.3.2`, resolved at `node_modules/js-yaml/index.js`. The fifteen other test files with `overrides: {}` in a fixture, before the change (tests/pass/fail/skipped): compliance-integration-coverage 6/6/0/0, compliance-integration 16/16/0/0, compliance-mode 21/21/0/0, compliance-regime-coverage 16/16/0/0, compliance-regime 9/9/0/0, compliance-ride-along 8/8/0/0, compliance-seam-is-executable 13/13/0/0, cto-chief-compliance-dispatch 8/8/0/0, e2e-menu-lifecycle 11/11/0/0, eu-ai-act-agent-runner 12/12/0/0, gdpr-agent-runner 12/12/0/0, iron-loop-compliance-trigger-coverage 7/7/0/0, iron-loop-compliance-trigger 17/17/0/0, menu-environment 5/5/0/0, w10-live-agent-reconcile 11/11/0/0 (172 tests, all pass).

### Step 10: IMPLEMENT
The two constants and the one statement, exactly as the plan's code block. Both Step 8 files green: `tests 93, pass 93, fail 0` and `tests 97, pass 97, fail 0`. The comparison, counted independently: 15,552 + 3,510 = 19,062 texts; 270 readable (135 with a line feed, 135 with a carriage return plus a line feed, 0 with a bare carriage return); js-yaml 4.3.2 reads `regulatory_regime.overrides` as `{}` on all 270; 0 of the 3,510 twins readable.

### Step 11: REVIEW — the four guards can fail (executor's part)
Each removal run once on `tests/lib-regulatory-regime.test.js`, then the Step 10 file restored byte for byte:
- (a) without `other`: fail 2 — the comparison (`90 mismatches, 0 of them expected readable`, e.g. `"after":["  overrides:","    four_eyes_gate3: True"]` with `(a) the parser refuses the text: duplicated mapping key (4:3)` and `(b) readable is true, expected false`) and `row 8, a second bare overrides key`.
- (b) without `/[^ ]/.test(lead)`: fail 2 — the comparison (`90 mismatches`, e.g. `"after":["\tfour_eyes_gate3: true"]`, `(a) the parser refuses the text: tab characters must not be used in indentation (4:1)`) and `row 7, an entry under it indented with one tab`.
- (c) without the carriage-return and separator test: fail 5 — the comparison (`144 mismatches`, all 144 with `"eol":"\r"`) and all four row-9 spellings, the line-separator spelling included.
- (d) without the `HIDDEN_KEY_RE` test: fail 4 — the twins (`3510 mismatches`) and the three row-10 spellings.
After the last revert, `git diff src/lib/regulatory-regime.js` showed exactly the Step 10 change, and both Step 8 files were green (190 of 190).

### Step 12: OPTIMIZE
By reading: `EMPTY_OVERRIDES_RE` has no `m` flag, so `^` anchors at the line start only; after the literal key each quantifier is followed by a character it cannot match, and only the final `[ \t]*$|[ \t]+#` alternation backtracks, over the trailing spaces and tabs. `HIDDEN_KEY_RE` is a character class or `^\s*\?` anchored at the start. `/\r(?!\n)|[\u2028\u2029]/` is one pass over the block. Run time of the comparison tests: 840.6 ms (15,552 texts) and 175.1 ms (3,510 twins).

`misreadRegime` on the changed code, median of 5 runs, each text written with `fs.writeFileSync` into a temporary project:
- this repository's own `.ctoc/settings.yaml`: answer `null`, median 0.1 ms (no twin, quoted only);
- line 429, empty map: answer `null`, median 2857.0 ms; its `  note: x` twin: answer `null`, median 2768.2 ms; ratio 1.032;
- line 434, empty map: answer `'active-profiles'`, median 2460.6 ms; its twin without the overrides line: answer `'active-profiles'`, median 2453.2 ms; ratio 1.003.
Neither pair is more than 50% slower; the build does not stop.

### Step 14: VERIFY
- `npm run lint` (`eslint . --max-warnings 0`): exit 0, no output.
- `npm test`: `tests 13123, pass 13120, fail 3, cancelled 0, skipped 0`; `[CTOC test-gate] coverage 99.88% (threshold 99%), skipped 0, failed 3`; `regulatory-regime.js` line coverage 100.00%. No warning or deprecation line in the output. The three failures are all in `tests/iron-loop-enforcer.test.js` (the fast and thorough live self-checks, and "(7) the summary counts are unchanged") and have one cause: the finding `gate-destinations-approved` names `plans/todo/an-empty-overrides-map-is-read-as-empty.md` with `no-ledger-entry` — this plan was carried onto the build branch without its approval record, which lives outside this branch under `.ctoc/approvals/`, a protected record the executor may not write. The same three tests fail identically with the unchanged `src/lib/regulatory-regime.js` (33 tests, 30 pass, 3 fail), so they are not caused by this change. The first Step 14 box stays unticked until the gate runs where the approval record exists.
- The fifteen fixture files after the change: identical to Step 9, test by test (same names, same order within each file, all pass, 172 tests).
- Live, reading only: `misreadRegime(<this worktree root>)` → `null`; `loadActiveProfiles(<root>).overrides` → `{}`.

### Step 15: DOCUMENT
The comment block of `overridesMisread` names the exception and its five conditions; the `overrides` item of `misreadRegime`'s comment says the empty map is read as no overrides under those five conditions and as `'overrides'` otherwise.

### Fix round 1

Code and tests: commit `b826eae5` (on `d8c233b8`). Decisions 12 to 17 record each change and why; this subsection holds the evidence.

**Review findings it answers.**
- Critic finding F1 (with scanner finding OVR-3 in the new statement): a flow collection opened on another line carries the empty-map line past a key at column 0, where the reader's block ends, so a later second `overrides:` falls outside the reader's block. Answered by the flow clause (decision 12); row 11 and the flow twins.
- Critic finding F2: a line led by a non-breaking space (U+00A0) and a `#` was counted as a comment, although YAML reads it as a key. Answered by `COMMENT_LINE_RE`, `/^[ \t]*#/` (decision 13); both spellings of row 12 and the non-breaking-space twins.
- Critic findings T1 and T2, the two test gaps: answered by two guards that are green before and after, the table row `row 1, before a block list of profiles` (the list-item clause must not refuse a sibling `active_profiles:` list after the empty map) and the assertion that js-yaml reads CTOC's own `.ctoc/settings.yaml` with `regulatory_regime.overrides` an empty map.
- Scanner finding OVR-1: the empty-map line inside an item of a block list of profiles ends the reader's profile list and drops the later items. Answered by the list-item clause of condition 3 (decision 14); row 13.
- Scanner finding OVR-5: a next-line character, U+0085, is a line break to a YAML 1.1 parser. Answered by adding `\u0085` to the class of condition 4 (decision 15); row 14.
- The synthesizer's minimal change list: the four changes above (flow clause, comment pattern, list-item clause, U+0085 in condition 4) and their tests, nothing wider; the findings outside this plan are listed in decision 17 for the owner to schedule. The list's own text is not held on this branch; this line records what was built against it.

**Red first (verified by the CTO Chief, quoted as such).** On the pre-fix reader, commit `d8c233b8`, `tests/lib-regulatory-regime.test.js` with the fix-round tests gives `tests 100, pass 94, fail 6`. Red: the 810 new twins (`810 mismatches, 0 of them expected readable`), row 11, both spellings of row 12, row 13, row 14. Green: the guard row `before a block list of profiles` and the js-yaml assertion on CTOC's own file.

**Green (verified by the CTO Chief, and re-run here).** On `b826eae5`, both test files of the plan: `tests 197, pass 197, fail 0`. Re-run by this executor: `tests 197, pass 197, fail 0, cancelled 0, skipped 0`; `tests/lib-regulatory-regime.test.js` alone: `tests 100, pass 100, fail 0`.

**Eight guard removals (Step 11, executor's part).** Run in a scratch copy of `b826eae5` (`git archive` into a fresh temporary directory, its `node_modules` linked to the worktree's), never in the worktree; one removal at a time, `node --test tests/lib-regulatory-regime.test.js` run in the scratch copy, the file restored byte for byte after each (checked: identical), the scratch copy deleted afterwards. Baseline in the scratch copy: `tests 100, pass 100, fail 0, skipped 0`. Every removal turned at least one test red; in each red table row the reader answered `null` where `'overrides'` is expected. The enclosing describe, `profiles shipped with the plugin (a project with no profile folder)`, is also reported failed whenever a test inside it fails; it is not counted below.
- (a) without `other`: fail 2 — the comparison (`90 mismatches, 0 of them expected readable`) and `row 8, a second bare overrides key`.
- (b) without `/[^ ]/.test(lead)`: fail 2 — the comparison (`90 mismatches, 0 of them expected readable`) and `row 7, an entry under it indented with one tab`.
- (c) without the whole condition-4 test `!/\r(?!\n)|[\u0085\u2028\u2029]/.test(blockBody)`: fail 6 — the comparison (`144 mismatches, 0 of them expected readable`), the four row-9 spellings (`a bare carriage return before a sibling key`, `before a second key`, `inside a later line`, `a line separator in a comment`) and `row 14, a next-line character (U+0085) in its comment`.
- (d) without the `HIDDEN_KEY_RE` `lines.some`: fail 6 — the 3,510 twins (`3510 mismatches, 0 of them expected readable`), the 810 twins (`270 mismatches, 0 of them expected readable`), the three row-10 spellings (`an escaped second key`, `a star in another line`, `a question-mark key in another line`) and `row 12, a double quote on a line led by a non-breaking space and a #`.
- (e) without the flow clause (the whole third `&&` line): fail 3 — the 810 twins (`540 mismatches, 0 of them expected readable`), `row 11, a flow collection opened on another line` and `row 12, a bracket on a line led by a non-breaking space and a #`.
- (f) with `COMMENT_LINE_RE` redefined as `/^\s*#/`: fail 3 — the 810 twins (`270 mismatches, 0 of them expected readable`) and both row-12 spellings.
- (g) without the list-item clause `|| (rest.length > 0 && /^\s*-/.test(rest[0]))`: fail 1 — `row 13, inside a list item, a later item after it`.
- (h) with only `\u0085` removed from the class of condition 4: fail 1 — `row 14, a next-line character (U+0085) in its comment`.

**Step 12 on the current code.** Run time of the comparison tests, `tests/lib-regulatory-regime.test.js` alone: 660.5 ms (15,552 texts), 165.3 ms (3,510 twins), 36.2 ms (810 twins); the whole file 979.5 ms. `misreadRegime`, median of 5 runs, each text written with `fs.writeFileSync` into a temporary project that was removed afterwards, exactly the texts of Step 12:
- this repository's own `.ctoc/settings.yaml`: answer `null`, median 0.1 ms (no twin, quoted only);
- line 429, empty map: answer `null`, median 2829.2 ms; its `  note: x` twin: answer `null`, median 2808.3 ms; ratio 1.007;
- line 434, empty map: answer `'active-profiles'`, median 2371.8 ms; its twin without the overrides line: answer `'active-profiles'`, median 2348.5 ms; ratio 1.010.
Neither pair is more than 50% slower; the build does not stop.

**Step 14 in the worktree, on `b826eae5`.**
- `npm run lint` (`eslint . --max-warnings 0`): exit 0, no output beyond the script banner.
- The fifteen fixture files of Step 9, each run on `b826eae5` (the worktree) and on the commit before the change, `24622d82` (a scratch copy, deleted afterwards), and compared test by test (every result line, name and status, in order): identical in all fifteen, and every file's count equals Step 9: compliance-integration-coverage 6, compliance-integration 16, compliance-mode 21, compliance-regime-coverage 16, compliance-regime 9, compliance-ride-along 8, compliance-seam-is-executable 13, cto-chief-compliance-dispatch 8, e2e-menu-lifecycle 11, eu-ai-act-agent-runner 12, gdpr-agent-runner 12, iron-loop-compliance-trigger-coverage 7, iron-loop-compliance-trigger 17, menu-environment 5, w10-live-agent-reconcile 11 (172 tests, all pass, 0 skipped, 0 todo, 0 cancelled). None of the fifteen files changed between `24622d82` and `b826eae5`.
- `npm test`: `tests 13130, suites 2118, pass 13127, fail 3, cancelled 0, skipped 0, todo 0`; `[CTOC test-gate] coverage 99.87% (threshold 99%), skipped 0, failed 3`; `regulatory-regime.js` lines 100.00%, branches 96.70%, functions 100.00%; all files 99.87% lines, 93.75% branches, 99.37% functions. The three failures are the known ones, all in `tests/iron-loop-enforcer.test.js`: `CTOC repo passes the fast self-check with 0 critical and 0 block`, `CTOC repo passes the thorough self-check with 0 critical and 0 block` (`Block findings: ["gate-destinations-approved"]`) and `(7) the summary counts are unchanged` (`fast: block must stay 0`). The finding, read with `checkAllInvariants({ mode: 'fast' })` on the worktree: `gate-destinations-approved`, offender `plans/todo/an-empty-overrides-map-is-read-as-empty.md`, reason `no-ledger-entry` — this plan's copy has no approval record on this branch. No other failure. No Node warning or deprecation line (0 lines starting `(node:`); the only lines holding "WARNING" are three `audit-chain:` messages from `tests/audit-chain-concurrency.test.js`, which corrupts a chain log in a temporary directory on purpose. The first Step 14 box stays unticked until the gate runs where the approval record exists.

### Fix round 2

On `b826eae5`, changes uncommitted in the build worktree. Decisions 18 to 21 record each change and why; this subsection holds the evidence.

Correction (2026-10-11): these changes were since committed as `16f058ae` (round 1's code is `b826eae5`; the first build is `d8c233b8`).

**Second review round, the findings it answers.** The iron-loop critic: SHIP AFTER R2-1, R2-2 and R2-3. R2-1, the empty-map line as one entry of a flow collection opened before the header, is answered by the comma-and-closer clause of condition 3 (decision 18; row 15, three spellings). R2-2, the exemption of a closed inline `active_profiles` list tested only with `[]`, is answered by two guard rows (decision 19). R2-3, decision 12 leaving out `}`, is corrected in decision 20. The security scanner: PASS over 2,767,488 texts, 404,158 of them newly readable, 0 drops caused by this change under js-yaml 4.3.2 and PyYAML 6.0.3, reader(text) == reader(twin) on all 404,158, timing linear, plan timing pairs 1.037 and 1.047; its findings outside this plan are in decision 21.

**Tests first, red on `b826eae5`'s reader.** `tests/lib-regulatory-regime.test.js` gains the `row15` list (three texts), the row-1 guard `after a closed inline list of profiles that is not empty`, the row-11 guard `a brace after a closed inline list of profiles`, the three row-15 table entries, the js-yaml premise test for row 15, and U+0085 in the comment above the comparison. `node --test tests/lib-regulatory-regime.test.js` on the unchanged module: `tests 106, pass 103, fail 3, cancelled 0, skipped 0`. Red: the three row-15 spellings (`a flow list opened before the header, a comma after it`, `... its closer after it`, `a flow mapping opened before the header, its closer after it`), each `expected: 'overrides'`, `actual: ~` (null). Green: the js-yaml premise test (all three texts give `{"four_eyes_gate3":true}`; the comma twin throws `expected the node content, but found ','`; the two closer twins give `{"four_eyes_gate3":true}`), and both new guard rows.

**The change.** In `overridesMisread`, the list-item clause becomes `|| (rest.length > 0 && /^\s*[-,\]}]/.test(rest[0]))`; condition (3) of its comment and the `overrides` item of `misreadRegime`'s comment name the comma, `]` and `}`. Nothing else in the module changes.

**Green.** `tests/lib-regulatory-regime.test.js`: `tests 106, pass 106, fail 0, cancelled 0, skipped 0`. Both test files of the plan: `tests 203, pass 203, fail 0, cancelled 0, skipped 0`. No raw U+0085, U+2028, U+2029 or U+00A0 in either changed file (byte scan, 0 matches).

**Guard removals (Step 11, executor's part).** A scratch copy (`git archive HEAD` into a fresh `fs.mkdtempSync` directory, the two changed files copied over it, `node_modules` linked to the worktree's), never the worktree; one mutation at a time, `node --test tests/lib-regulatory-regime.test.js`, the module restored byte for byte after each (checked: identical to the worktree's), the scratch copy deleted afterwards. Baseline: `tests 106, pass 106, fail 0, skipped 0`. The enclosing describe, also reported failed whenever a test inside it fails, is not counted.
- (i) `[-,\]}]` → `-`: fail 3 — the three row-15 spellings.
- (ii) without `,`: fail 1 — row 15, `a flow list opened before the header, a comma after it`.
- (iii) without `]`: fail 1 — row 15, `a flow list opened before the header, its closer after it`.
- (iv) without `}`: fail 1 — row 15, `a flow mapping opened before the header, its closer after it`.
- (v) without `-` (`[,\]}]`): fail 1 — `row 13, inside a list item, a later item after it`.
- (vi) `INLINE_PROFILES_RE` widened to `/^ +active_profiles:.*$/`: fail 1 — `row 11, a brace after a closed inline list of profiles`.
- (vii) `INLINE_PROFILES_RE` narrowed to `/^ +active_profiles:[ \t]*\[[ \t]*\]/`: fail 1 — `row 1, after a closed inline list of profiles that is not empty` (answer `null` expected, `'overrides'` given).
- Round 1's removals, run again: (a) without `other`: fail 2 — the comparison (`90 mismatches, 0 of them expected readable`) and row 8, a second bare overrides key. (b) without `/[^ ]/.test(lead)`: fail 2 — the comparison (`90 mismatches`) and row 7, the tab spelling. (c) without the condition-4 test: fail 6 — the comparison (`144 mismatches`), the four row-9 spellings and row 14. (d) without the `HIDDEN_KEY_RE` test: fail 6 — the 3,510 twins (`3510 mismatches`), the 810 twins (`270 mismatches`), the three row-10 spellings and row 12's double-quote spelling. (e) without the flow clause: fail 2 — the 810 twins (`540 mismatches, 0 of them expected readable`) and the new row-11 brace guard; row 11's first spelling and row 12's bracket spelling stay green, because the comma clause now refuses them. (f) `COMMENT_LINE_RE` as `/^\s*#/`: fail 2 — the 810 twins (`270 mismatches`) and row 12's double-quote spelling; its bracket spelling is now also refused by the comma clause. (h) only `\u0085` removed: fail 1 — row 14. (e) and (f) each count one fewer red row than in fix round 1, as decision 18 expects; every mutation turned at least one test red.

**Step 12.** `misreadRegime` on the changed code, median of 5 runs, each text written with `fs.writeFileSync` into a temporary project removed afterwards, exactly the texts of Step 12 (the two slow statements are now on lines 473 and 478):
- this repository's own `.ctoc/settings.yaml`: answer `null`, median 0.1 ms (no twin, quoted only);
- line-429 pair: empty map `null`, median 2710.9 ms; its `  note: x` twin `null`, median 2719.8 ms; ratio 0.997;
- line-434 pair: empty map `'active-profiles'`, median 2339.4 ms; its twin `'active-profiles'`, median 2465.2 ms; ratio 0.949.
Neither pair is more than 50% slower; the build does not stop.

**Step 14 in the worktree.**
- `npm run lint` (`eslint . --max-warnings 0`): exit 0, no output beyond the script banner.
- The fifteen fixture files of Step 9, each run in the worktree and in a scratch copy of the commit before the change, `24622d82` (deleted afterwards), compared test by test (every result line, name, status and nesting, in order): identical in all fifteen, and every count equals Step 9 (172 tests, all pass, 0 skipped, 0 todo, 0 cancelled).
- `npm test`: `tests 13136, suites 2118, pass 13133, fail 3, cancelled 0, skipped 0, todo 0`; `[CTOC test-gate] coverage 99.87% (threshold 99%), skipped 0, failed 3`; `regulatory-regime.js` lines 100.00%, branches 96.70%, functions 100.00%; all files 99.87% lines, 93.70% branches, 99.37% functions. The three failures are the known ones, all in `tests/iron-loop-enforcer.test.js` (the fast and thorough live self-checks, `Block findings: ["gate-destinations-approved"]`, and `(7) the summary counts are unchanged`); `checkAllInvariants({ mode: 'fast' })` on the worktree names the one offender `plans/todo/an-empty-overrides-map-is-read-as-empty.md`, reason `no-ledger-entry`: this plan's copy has no approval record on this branch. No other failure; 0 lines starting `(node:`; the only `WARNING` lines are the three `audit-chain:` messages of `tests/audit-chain-concurrency.test.js` and test names. The first Step 14 box stays unticked until the gate runs where the approval record exists.

### Final review (Step 16)

**Step 15 corrections from the final critic (comments only, no behaviour change).** C-1: the doc comment of `overridesMisread` (condition 3) and the `overrides` item of `misreadRegime`'s comment now say the next line "does not start with `-`, `,`, `]` or `}`", which is what `/^\s*[-,\]}]/` refuses (a line such as `  -x: 1` included), with the reasons kept: a `-` item would end `parseRegimeBlock`'s profile list at the empty map, and `,`, `]` and `}` make the empty map an entry of a flow collection opened before the header. C-2: the comment above the comparison in `tests/lib-regulatory-regime.test.js` no longer lists the original five conditions; it points to `overridesMisread`'s doc comment in `src/lib/regulatory-regime.js`. C-3: the commit of fix round 2, `16f058ae`, is recorded under `### Fix round 2`. After the corrections: `git diff` of the two files shows comment lines only; `node --test tests/lib-regulatory-regime.test.js tests/plans-keep-moving-without-the-human.test.js`: `tests 203, pass 203, fail 0, cancelled 0, skipped 0, todo 0`; `npm run lint` (`eslint . --max-warnings 0`): exit 0, no output beyond the script banner.

**The iron-loop critic, final verdict: SHIP.** No finding inside this plan's scope. Acceptance checklist, each criterion against its evidence:
- The comparison: met, with a recorded deviation: the comparison now holds 19,872 texts (the 810 twins of fix round 1 added to the 19,062), 270 of them readable.
- CTOC's own file: met.
- Case 56: met.
- The table: met, with a recorded deviation: rows 11 to 15 and the guard rows were added by the fix rounds.
- The guard removals: met; 14 in all across the build and both fix rounds, each turned its named tests red and was reverted.
- The fifteen fixture files: met.
- The timing: met; fix round 2's ratios 0.997 (line-429 pair) and 0.949 (line-434 pair).
- `npm test`: pending the final run without the plan copy (below).
Findings: C-1, C-2 and C-3, applied as above; LP-1 and LP-2, outside this plan, in decision 22.

**The security scanner, final verdict: PASS.** 5,436,944 texts against js-yaml 4.3.2, PyYAML 6.0.3 and libyaml; 673,784 of them newly readable; 0 drops caused by this change under all three parsers; the reader's answer on each text equals its answer on the text's twin without the empty-map line on all 673,784. A new generator with flow collections and quoted or block scalars opened before the header: 0 drops. Power check: the rebuilt harness found the round-2 problem 1,380 times on `b826eae5`. Timing ratios 1.006 and 1.007. The patterns were checked for catastrophic backtracking: safe. No secrets; no new dependency (`util` is built into Node, and js-yaml 4.3.2 was already installed as a development package). Its wording note on `safe_because` is in decision 22.

**`npm test` status.** `npm test` in this worktree: 13,136 tests, the only 3 failures are tests/iron-loop-enforcer.test.js naming this branch copy's missing approval record (`gate-destinations-approved`, `no-ledger-entry`); without the copy that file passes 33/33 (CTO Chief, scratch tree). The CTO Chief takes the copy off the branch in the next commit and runs the full gate there; its result is reported with that commit. The first Step 14 box stays unticked until then.

**`npm test` in main (CTO Chief, 2026-10-11).** After the merge into main (`f884f4ab` plus this branch, uncommitted) and the scope growth of decision 23: `tests 13136, suites 2118, pass 13136, fail 0, cancelled 0, skipped 0, todo 0`; `[CTOC test-gate] coverage 99.88% (threshold 99%), skipped 0, failed 0`; corpus claims verified 3, refuted 0 (PASS); 0 lines starting `(node:`. `npm run lint` (`eslint . --max-warnings 0`): exit 0. Before decision 23 the same run gave 13,135 of 13,136, the one failure being case 4 of `tests/ledger-forgery-closed.test.js`; that case alone was red before the edit and green after it, and the file passes 52 of 52. Both `npm test` boxes are ticked on this run.
