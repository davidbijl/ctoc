---
title: "The old count reader reads every shape the old YAML library read, at least as high, and an oversized count escalates"
type: implementation
parent_plan: the-circuit-breakers-old-count-reader-reads-every-shape-the-old-library-read
depends_on: none
created: 2026-10-22
priority: MEDIUM
effort: high
files:
  # THE SLICE'S OWN FILES: the reader and the shared count rule, and the one test file this slice creates.
  - src/lib/circuit-breaker.js
  - tests/circuit-breaker-legacy-reader.test.js
  # RATCHET FILES, not planned work: the new test file moves the documented test-file count,
  # which CLAUDE.md (Gate 2 requires the declaration) and README.md both state.
  - CLAUDE.md
  - README.md
---

# The old count reader reads every shape the old YAML library read, at least as high, and an oversized count escalates

**Scope (one line):** `legacyCountsFromBlock` in `src/lib/circuit-breaker.js` is rewritten as a small, dependency-free reader of the YAML the counter can hold, so blank lines, comments, quotes, flow maps, anchors, aliases and every number notation read as the old library read them; a line it cannot read saturates the narrowest count it can name; and one shared count rule maps an infinite count to the largest safe integer, in the old counter and in the kickback counter file alike.

Read first, in full: the parent plan (`plans/implementation/the-circuit-breakers-old-count-reader-reads-every-shape-the-old-library-read.md`), its shape catalogue and its decisions 1 to 14. This slice carries the parent's first three stories and the real-counter and catalogue scenarios. The fourth story (the no-packages check) is the sibling slice "The no-packages check cannot pass vacuously".

## Implementation Details

### What is wrong today, by line (read on 2026-10-22, version 6.14.135)

- `legacyCountsFromBlock` (`src/lib/circuit-breaker.js` lines 167-188) enters the counter only on `/^kickback_counts:\s*$/` (line 173), ends it on any first-column character including `#` (line 176), leaves the step map on any line not deeper than `by_step:`, an empty line included (line 183), and reads only `(\d+)` values with nothing after them (lines 179 and 184).
- `normalizeCounts` (lines 113-127) turns any count that is not finite into 0, so an oversized count never escalates.
- Its callers are unchanged and stay the live routes: `maxCountsAcrossBlocks` (line 202) folds every leading block by maximum; `recordKickback` (line 559) and `readKickbackCounts` (line 371) fold that with the kickback counter file.

### The saturation width, settled on evidence (the gate critic's point)

The parent's decision 1 saturates the plan's whole total for any line the reader cannot read. This slice narrows it: **a line the reader cannot read saturates the count whose key it carries or continues: that step when it names or continues a step, the plan total when it names or continues `total`, and the plan total when no key can be named** (a line with no key, a merge key `<<`, an explicit key `? `, a list item, a line at an indentation that belongs to no key, or anything unreadable about the counter or the step map as a whole).

The evidence:
- **It never reads lower than the old library.** A step's unreadable value hides only that step's count: every other step line and the `total:` line are read on their own lines by the same rules, and the old library read those lines either the same way or not at all (a malformed block read 0). The escalation test is "this step's count plus one is over 3, or the plan's total plus one is over 5" (`recordKickback`, lines 580-594). Both inputs are at least the old library's, so every send-back the old library would have escalated still escalates.
- **It repeats fewer false alarms.** The first escalation writes the saturated count into the kickback counter file (`writeKickbackState`, line 566), and no route lowers a count (the parent's search: 0 files). With the whole total saturated, every later send-back of that plan escalates, to any step, for the life of the plan. With the narrow width, only send-backs to the step whose value could not be read do; a send-back to another step is counted exactly as the old library would have counted it.
- **The trade-off.** When no key can be named, the step counts the line may carry are unknowable, so the plan total takes the saturation. Then every following send-back escalates per plan, whatever step it names. The per-step figure on that send-back's line may read below what the old library read (a merge key `<<: *base` that merged step counts), but the escalation the old library would have caused is never lost. The whole-block alternative cannot do better: a count for a step whose name is unknown cannot be written down.
- **Both approved fixtures keep their numbers.** The folded `total: >-` names `total`, and the keyless `this is not a count` names nothing, so both saturate the plan total, and each send-back to Step 12 is still counted 1 of a limit of 3 for Step 12 and 9007199254740992 of a limit of 5 for the plan.

### The reader, rule by rule

These rules are the specification; the catalogue below pins each of them with a row. "Saturate" means the reader records `Infinity` for that count, and the shared count rule (rule 11) turns it into `Number.MAX_SAFE_INTEGER`, 9007199254740991.

1. **Lines.** The block text is split on `\r?\n`. Each line first loses its comment (`withoutComment`): a `#` that is the first character after the indentation, or that follows a space or a tab, starts a comment, unless it is inside quotes; then trailing whitespace is cut. A quote opens a quoted run only at the start of a token: after the indentation, a space, a tab, `{`, `[`, `,` or `:`. Inside single quotes `''` is a quote character; inside double quotes a backslash escapes the next character. A line that is empty after this is skipped everywhere, inside and outside the counter (findings 1, 2 and 3).
2. **Indentation** is the count of leading whitespace characters (`\s`), as today; a tab counts as one.
3. **Top level.** A line with indentation 0 ends any counter. It opens a counter when its key (rule 6) reads `kickback_counts`: plain, single-quoted or double-quoted, with optional spaces or tabs before the colon. A later counter key in the same block opens the counter again, and its counts join the earlier ones by the larger value (parent decision 7). Every line outside a counter is read only for anchors (rule 9).
4. **The counter's key line.** After the colon, after an optional anchor (`&name`, recorded as a collection):
   - nothing: the counter's entries are on the following indented lines;
   - a tag (`!` and what follows up to a space): saturate the plan total, then read the rest of the line as if the tag were absent;
   - a flow map (`{`, rules 7 and 8): read as the whole counter;
   - an alias (`*name`): a recorded scalar or a name with no `&name` anywhere in the block gives no counts; a recorded collection or an `&name` with no value recorded above saturates the plan total;
   - anything else (a plain or quoted scalar, a flow sequence, `|` or `>`): no counts from this line (parent decision 2).
   After any of these but nothing (an anchor alone, or a tag alone, counts as nothing), every indented line under the key line saturates the plan total.
5. **The counter's entries.** The first non-empty line under the key line sets the counter's indentation. A line at that indentation is one entry:
   - key `by_step`, with after the colon and an optional anchor: nothing, so the steps follow on deeper lines (rule 6); a flow map, whose entries are steps (rule 7); a null, plain or quoted scalar, so there are no steps (the old library also read none); an alias to a recorded scalar or to an unknown name, so there are no steps; anything else (a tag, a flow sequence, `|` or `>`, an alias to a collection or to an `&name` with no recorded value): saturate the plan total;
   - key `total`: its value (rule 10) is the plan total, the larger one when it appears twice; an unreadable value saturates the plan total; nothing after the colon followed by deeper lines saturates the plan total;
   - the plain key `<<` (a merge key): saturate the plan total;
   - a line with no key (rule 6): saturate the plan total;
   - any other key: ignored, together with every deeper line under it.
   A line indented less than the counter's indentation but not at column 0 saturates the plan total. A line deeper than the counter's indentation belongs to the last entry: under `by_step` with nothing after its colon it is a step line (rule 6); under an ignored key it is ignored; under anything else it saturates the plan total.
6. **Keys and step lines.** A key is a quoted scalar followed by optional spaces or tabs and a colon, or a plain run of text up to the first colon followed by a space, a tab or the end of the line, with its trailing spaces and tabs cut (`total : 3` has the key `total`). Anything else after a quoted key's closing quote means the line has no key. A line has no key when, after the indentation, it starts with `- `, `? ` or `: ` (or is exactly `-`, `?` or `:`), or with one of `[ ] { } , & * ! | > % @` or a backtick, or when no such colon is found outside quotes. A quoted key is its text; a plain key is resolved by rule 10 and written as text (`String(value)`), so `0xF` is step `15` and `010` is step `10`; a plain key that rule 10 calls unreadable stays its own text. In the step map, the first deeper line sets the steps' indentation. A line at it is one step: its value (rule 10) is that step's count, the larger one when the step appears twice; an unreadable value **saturates that step**; nothing after the colon gives no count from this line. A line deeper than the steps' indentation continues the last step and **saturates that step** (or the plan total when there is no step yet). A line between the counter's and the steps' indentation, a line with no key and the plain key `<<` saturate the plan total.
7. **Flow collections** (`{…}` and `[…]`): entries separated by commas, a trailing comma allowed, each map entry `key: value` or a lone `key` (null), keys and values plain, quoted, anchored (`&name`, recorded in order) or aliased (`*name`). Plain scalars inside a flow stop at `,`, `{`, `}`, `[`, `]` and at a colon followed by a space or a flow indicator. After a quoted key the colon needs no space (`{"10":3}` reads step `10` = 3). Nesting deeper than 32 levels, a tag, an unclosed quote, or any text left over after the closing bracket makes the collection unreadable. A flow map keeps its entries in order, duplicates included, so the counter takes the larger of two equal keys. Applied to the counter: a whole-counter flow map gives its `by_step` and `total` entries the meaning of rule 5, and its `<<` entry or an unreadable whole saturates the plan total; a step-map flow gives each entry the meaning of a step line (a value that is a collection or unreadable saturates that step; a `<<` entry saturates the plan total); an unreadable step-map flow saturates the plan total.
8. **A flow collection that does not close on its line** takes the following lines, each without its comment, at any indentation, joined with a space, until its brackets balance outside quotes. The lines it takes are not read again. If the block ends first, the collection is unreadable. The scan never restarts on a taken line, so its work is linear in the block's length.
9. **Anchors and aliases.** On any line of the block, inside the counter or not, a key's value that starts with `&name` records the value under that name, in line order: a one-line plain or quoted scalar records its resolved value; nothing after the anchor, or a flow collection, records "a collection". `*name` reads the latest value recorded under `name` above it. An alias whose name was recorded as a collection, or whose name follows an `&` somewhere in the block without a value recorded above the alias, is unreadable. An alias whose name follows no `&` anywhere in the block gives no count for its own entry (the old library refused the whole block and read 0). The set of names that follow an `&` is gathered once per block, so the check is linear.
10. **Values.** A value, after an optional anchor, is: an alias (rule 9); a flow collection (rules 7 and 8), a collection where a count is expected being unreadable; a double-quoted scalar, decoded with `JSON.parse` (a failure, such as the YAML-only escape `\x33`, is unreadable); a single-quoted scalar, with `''` read as `'`; anything after the closing quote but a comment makes it unreadable; a value starting with `!` (a tag), `|` or `>` (a block scalar) is unreadable. A plain scalar (`plainScalar`) is resolved as `js-yaml` 4.3.2's default schema resolves it, read in its installed source (`lib/type/null.js`, `bool.js`, `int.js`, `float.js`, `timestamp.js`):
    - null: empty, `~`, `null`, `Null`, `NULL`;
    - boolean: `true`, `True`, `TRUE`, `false`, `False`, `FALSE`;
    - integer, per `int.js`: an optional `+` or `-`, then `0b` and binary digits, `0x` and hexadecimal digits, `0o` and octal digits, or decimal digits (a leading zero is still decimal, `010` is 10); only when the parsed number is finite;
    - float, per `float.js`: digits with an optional fraction and exponent, `.` and digits, `.inf`, `.Inf` or `.INF` with an optional sign, `.nan`, `.NaN` or `.NAN`; only when finite, or one of those named values;
    - a date or timestamp shape (`timestamp.js`: four digits, a dash, then one or two digits): **unreadable** as a value, because the old library read it as a date, and `Number` of a date is a count of milliseconds;
    - anything else: the text itself.
    Quoted scalars stay text; the count rule then reads text with `Number`, as the old library's normalisation did.
11. **The count rule** (`toCount`, shared by the reader and `normalizeCounts`): `Number(value)`; `Infinity` becomes `Number.MAX_SAFE_INTEGER`; a finite number above 0 is floored; anything else is 0. So `.inf`, a saturated entry, a quoted `"1e999"`, an oversized integer (the old library returned its digits as text, and `Number` of them is `Infinity`) and a counter file's `1e999` all read 9007199254740991; `-.inf`, `.nan`, text and negative counts read 0.
12. **Never throws, linear time.** Every scan is a character walk or a regular expression with no nested quantifier; recursion goes no deeper than 32 levels; a failed `JSON.parse` is caught and returns the unreadable marker. A malformed block reads what it can and never throws.
13. **What still reads lower, and why it stays.** A frontmatter block written as one flow map (`{kickback_counts: …}`) and a top-level explicit key (`? kickback_counts`) are not read; both give 0. The parent accepts the first with its search (no plan under `plans/` opens its frontmatter with `{`); for the second, pattern `^\? ` over `plans/` matched 0 files on 2026-10-22, and no CTOC writer ever produced either (believed). Both are catalogue rows, so a change in their reading is seen.

### What the gates enforce on this code (each fails the build if missed)

- `npm run lint` runs ESLint with `--max-warnings 0` (`package.json`); in `src/`, `security/detect-unsafe-regex` and `security/detect-non-literal-regexp` are errors (`eslint.config.js` lines 137-139). So: no regular expression with a nested quantifier and no `new RegExp` on any text. The quote-aware parts (comments, keys, flow collections, bracket balance) are character walks.
- `tests/false-green-fence.test.js` fails on any new finding of `src/lib/false-green-scan.js`, which baselines only existing sites (`.ctoc/false-green-baseline.json`):
  - a function whose name matches `/^(?:parse|extract|count|read)[A-Z_]/` (line 99), that uses `.match(`, `.matchAll(`, `.exec(` or `.test(` and has a line `return 0;`, `return false;`, `return true;`, `return '';` or `return [];` is a new `parse-default` finding. The new helpers are named `toCount`, `withoutComment`, `plainScalar` and, for any further helper the builder adds, a name outside that prefix list;
  - an empty `catch {}` body is a new `silent-catch` finding. The one catch, around `JSON.parse`, returns the unreadable marker.
- The coverage floor is 99 % of lines across `src/` (`.ctoc/coverage-baseline.json` `minPct`). Every line of the new reader is reached by a catalogue row; a line no row can reach is removed as dead, never left uncovered.
- `by_step` stays an `Object.create(null)` map, and the line `if (FORBIDDEN_STEP_KEYS.has(k)) continue;` in `normalizeCounts` stays byte for byte: the sibling slice's demonstration deletes exactly that line in a scratch copy.

### Dependency Graph

```
tests/circuit-breaker-legacy-reader.test.js --calls--> circuit-breaker.readKickbackCounts, actions.recordStepKickback, menu-screens.route
actions.recordStepKickback --calls--> circuit-breaker.recordKickback --calls--> maxCountsAcrossBlocks --calls--> legacyCountsFromBlock (rewritten) --calls--> withoutComment, plainScalar, toCount
recordKickback, readKickbackCounts --calls--> readKickbackState --calls--> normalizeCounts (modified) --calls--> toCount
```

No new `require`; no new export. `readKickbackCounts` is already exported and listed in `.ctoc/export-reachability-baseline.json`.

### File: `src/lib/circuit-breaker.js`

**Action:** MODIFY
**Purpose:** the breaker's legacy reader reads every shape the old library read, at least as high, and every count passes one rule that turns an infinite count into the largest safe integer.

- **Add** `toCount(value: *) → number` above `normalizeCounts`. Rule 11. Example: `toCount('9'.repeat(400))` → 9007199254740991; `toCount('3')` → 3; `toCount(3.9)` → 3; `toCount(-Infinity)` → 0; `toCount(true)` → 1.
- **Modify** `normalizeCounts(raw)`: each step `const c = toCount(bySource[k]); if (c > 0) byStep[k] = c;`, after the unchanged forbidden-key line; the total is `toCount(raw.total)` when `raw` is an object, else 0. Behaviour changes: a count of `Infinity` (the legacy reading, or a step count `1e999` in the kickback counter file) reads 9007199254740991 instead of 0; a count between 0 and 1 leaves no zero entry (it read 0 either way: `recordKickback` reads `counts.by_step[stepKey] || 0`). `readKickbackState`'s check that the counter file's total is finite is unchanged (parent, Out of Scope).
- **Add** `withoutComment(line: string) → string`: rule 1. Example: `withoutComment("    '10': 3  # x")` → `"    '10': 3"`; `withoutComment("  total: \"5 #x\"")` → unchanged; `withoutComment('  total: 5#x')` → unchanged.
- **Add** `plainScalar(text: string) → null|boolean|number|string|UNREADABLE`: rule 10's plain-scalar resolution. `UNREADABLE` is a module-private `Symbol`. Examples: `'0x3'` → 3; `'0o3'` → 3; `'0b11'` → 3; `'+3'` → 3; `'010'` → 10; `'3.9'` → 3.9; `'.inf'` → Infinity; `'.NaN'` → NaN; `'~'` → null; `'TRUE'` → true; `'2026-10-07'` → UNREADABLE; `'9'.repeat(400)` → the text itself; `'lots'` → `'lots'`.
- **Rewrite** `legacyCountsFromBlock(fmText: string) → { by_step: Object<string,number>, total: number }`: rules 1 to 13. `by_step` is `Object.create(null)`; every stored value has passed `toCount`, a saturated one being recorded as `Infinity` before it; the return shape and the call in `maxCountsAcrossBlocks` are unchanged. Never throws.
- **Update** the JSDoc of `legacyCountsFromBlock` and the module header's "No packages" paragraph (lines 66-67): what the reader reads, that it reads at least as high as `js-yaml` 4.3.2 read, the narrow saturation and the two shapes it still reads lower.
- Further small helpers (a key splitter, a flow reader, a value classifier) are the builder's, each with JSDoc and a name outside the parser prefix list.

**Error handling:** none of these functions throws on any text. `JSON.parse` is the one call that can throw; its catch returns `UNREADABLE`. The `UNREADABLE` marker never reaches `toCount` or `Number` (`Number` of a symbol throws a `TypeError`): wherever a value is unreadable the reader saturates its owner instead, and a catalogue row for each unreadable path proves it.
**Cross-platform:** no file system or path code is added; `\r\n` and `\n` read alike.

### File: `tests/circuit-breaker-legacy-reader.test.js`

**Action:** CREATE. **Framework:** `node:test` (`describe`, `it`, `after`) and `node:assert/strict`.

- Real temporary projects only: `fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-legacy-reader-'))` with `plans/{in-progress,review,done}` and `.ctoc`, each removed in `after` under `if (dir)`. No doubles of the breaker, the actions or the menu.
- `reading(text)` writes `text` as a plan in a fresh project with no kickback counter file and returns `circuitBreaker.readKickbackCounts(planPath, root)`.
- `sendBack(root, planPath, step)` returns `actions.recordStepKickback(planPath, step, root)` with `console.warn` and `console.error` silenced for the call (as `quiet` in `tests/circuit-breaker-wiring.test.js` line 217). Its `byStep`, `total` and `escalation` are exactly the numbers the menu prints (`src/lib/menu-screens.js` line 2829).
- The menu-route test copies the `round` and `complete` helpers of `tests/circuit-breaker-wiring.test.js` (lines 202-210); test files do not import each other.
- Plan texts are JavaScript strings. `MAX` is `Number.MAX_SAFE_INTEGER`; the printed figure is asserted as the literal 9007199254740992.

### Files: `CLAUDE.md` and `README.md`

**Action:** MODIFY (count lines only). Step 15 runs the release script's two count functions, `updateDocCountsInClaudeMd` and `updateDocCountsInReadme` (`src/scripts/release.js` lines 390 and 404). Only count lines may differ, and `CLAUDE.md` stays at or under 15,000 bytes.

### Wiring — the live call sites

No module is added. The rewritten reader is reached on every recorded send-back through the existing live routes: `recordKickback` (line 559) through `actions.recordStepKickback` (`src/lib/actions.js` line 1940) from a completion refused before review and a failing verify (`actions.completeExecution`) and from a review, security or quality round's send-back, `menu task complete <id> --continue --send-back <step>` (`src/lib/menu-screens.js`, the text at line 2829). The kickback counter file's reading (`readKickbackState`) reaches `normalizeCounts` on the same routes. The first scenario drives the menu route end to end.

### Test Plan

Written first, run, and seen failing before the reader changes (Step 8). Each scenario's "today" figure is the parent's; a test whose shape today's reader already reads is a regression pin and is listed as passing in the Step 8 record.

**Scenario tests** (the parent's acceptance criteria; plans in `plans/in-progress/`, no kickback counter file unless stated):
1. **Blank line, through the real menu route.** The parent's first fixture; a review round added, started and completed with `--continue --summary "send back to Step 10: x" --send-back 10`. The text matches `4 of a limit of 3 for Step 10, 5 of a limit of 5 for the plan` and `needs you`; `inbox escalations` matches `Step 10 kicked back 4× \(max 3\)`. Today: 1 of 3, no escalation.
2. **Comment line at the step map's own indentation.** Send-back to 10: `byStep` 4, `total` 5, `escalation.type` `same-step`.
3. **Comment in the first column.** Send-back to 12: `byStep` 1, `total` 6, `escalation.type` `per-plan`.
4. **Comment after a count.** Send-back to 10: 4 and 6, escalated.
5. **The four key lines** (`kickback_counts:  # read only since the counter file`, `'kickback_counts':`, `"kickback_counts":`, `kickback_counts: &counts`), each over the body `"  by_step:\n    '10': 3\n  total: 3\n"`: each send-back to 10 gives `byStep` 4, escalated.
6. **Flow maps**, the parent's three counters: each send-back to 10 gives 4 and 5, escalated; `by_step: {}` reads `{ by_step: {}, total: 0 }`.
7. **Quoted values:** send-back to 10 gives 4 and 5, escalated.
8. **Anchors and aliases**, the parent's frontmatter: send-backs to 11, 12, 10 in turn give (4, 6), (4, 7), (4, 8), each escalated.
9. **Number notations**, six copies of the parent's counter: one send-back each to 10, 11, 12, 13, 14, 15 gives 4 and 6, escalated.
10. **A line the reader cannot read**, the parent's two counters: each send-back to 12 gives `byStep` 1 and `total` 9007199254740992, escalated per plan.
11. **The narrow width** (this slice's decision): counter `"kickback_counts:\n  by_step:\n    '10': !!int 3\n    '11': 2\n  total: 3\n"`. A send-back to 10 gives `byStep` 9007199254740992, escalated `same-step`; on a fresh copy, a send-back to 12 gives `byStep` 1 and `total` 4, with no escalation.
12. **Oversized counts:** step 10 of 400 nines, send-back to 10: `byStep` 9007199254740992, escalated; a total of 400 nines and a total of `.inf`, send-back to 12: `total` 9007199254740992, escalated; a plan with no counter whose kickback counter file `.ctoc/state/kickbacks/<slug>.json` holds the text `{"by_step":{"10":1e999},"total":1}`, send-back to 10: `byStep` 9007199254740992, escalated. Today: each counted 1.
13. **Real counters, no false alarm.** The leading frontmatter blocks of `plans/done/00096-two-scheduler-guarantees-that-no-test-defends.md` and `plans/done/00125-the-sync-barrier-is-undefended-where-work-actually-starts.md`, copied byte for byte into the test as string literals at Step 8 (each from its first `---` line to its second, both included), then `"\n# body\n"`. Send-back to 14: the first gives (2, 3), the second (2, 2), neither escalated.

**The shape catalogue** (a table of constants, one `it` per row named by its shape). Each fixture is a counter written after `"---\ntitle: \"Fixture plan\"\n"` and followed by `"---\n\n# Fixture plan\n"`, unless the row gives a whole plan text; the reading is `readKickbackCounts` in a project with no counter file. M is 9007199254740991.

| Shape | Counter (JavaScript string) | Reading |
|---|---|---|
| The old writer's shape | `"kickback_counts:\n  by_step:\n    '8': 1\n    '14': 1\n  total: 2\n"` | `{8:1, 14:1}`, 2 |
| Double-quoted and plain step keys | `'kickback_counts:\n  by_step:\n    "10": 3\n    11: 2\n  total: 5\n'` | `{10:3, 11:2}`, 5 |
| Windows line endings | the old writer's row, with the whole plan text's `\n` replaced by `\r\n` | `{8:1, 14:1}`, 2 |
| Empty flow step map | `"kickback_counts:\n  by_step: {}\n  total: 0\n"` | `{}`, 0 |
| Empty and whitespace-only lines at every depth | `"kickback_counts:\n\n  by_step:\n\n    '8': 1\n \n    '10': 3\n      \n  total: 4\n"` | `{8:1, 10:3}`, 4 |
| Comment lines at every indentation, the first column included | `"kickback_counts:\n# a\n  by_step:\n  # b\n    '8': 1\n# c\n      # d\n    '10': 3\n  total: 4\n"` | `{8:1, 10:3}`, 4 |
| Comment after the key line, after `by_step:`, after a value, after a tab | `"kickback_counts:  # x\n  by_step:  # y\n    '10': 3  # z\n  total: 5\t# w\n"` | `{10:3}`, 5 |
| `#` with no whitespace before it | `"kickback_counts:\n  by_step:\n    '10': 3#x\n  total: 5#x\n"` | `{}`, 0 |
| `#` inside quotes, in a value and in a key | `"kickback_counts:\n  by_step:\n    '10': '3 #x'\n    '1 #1': 2\n  total: \"5 #x\"\n"` | `{'1 #1': 2}`, 0 |
| Single-quoted key line | `"'kickback_counts':\n  by_step:\n    '10': 3\n  total: 3\n"` | `{10:3}`, 3 |
| Double-quoted key line | `"\"kickback_counts\":\n  by_step:\n    '10': 3\n  total: 3\n"` | `{10:3}`, 3 |
| Anchor on the key line | `"kickback_counts: &counts\n  by_step:\n    '10': 3\n  total: 3\n"` | `{10:3}`, 3 |
| Spaces before the colon | `"kickback_counts :\n  by_step:\n    '10' : 3\n  total : 3\n"` | `{10:3}`, 3 |
| Flow step map on one line | `"kickback_counts:\n  by_step: {'10': 3, '8': 1}\n  total: 4\n"` | `{10:3, 8:1}`, 4 |
| Flow step map over several lines | `"kickback_counts:\n  by_step: {\n    '10': 3,\n    '8': 1\n    }\n  total: 4\n"` | `{10:3, 8:1}`, 4 |
| Flow with a trailing comma and a comment inside | `"kickback_counts:\n  by_step: {'10': 3,  # c\n    '8': 1,\n  }\n  total: 4\n"` | `{10:3, 8:1}`, 4 |
| The whole counter as one flow map | `"kickback_counts: {by_step: {'10': 3, '8': 1}, total: 4}\n"` | `{10:3, 8:1}`, 4 |
| Quoted values | `"kickback_counts:\n  by_step:\n    '10': \"3\"\n    '8': '1'\n  total: '4'\n"` | `{10:3, 8:1}`, 4 |
| Quoted values that are not plain decimal | `"kickback_counts:\n  by_step:\n    '10': \"0x3\"\n    '11': \" 3 \"\n    '12': ''\n  total: \"0o5\"\n"` | `{10:3, 11:3}`, 5 |
| Anchored values and aliases, one anchor outside the counter | `"limit: &three 3\nkickback_counts:\n  by_step:\n    '10': &perStep 3\n    '11': *perStep\n    '12': *three\n  total: &all 5\n"` | `{10:3, 11:3, 12:3}`, 5 |
| Alias whose name is anchored nowhere | `"kickback_counts:\n  by_step:\n    '10': *missing\n    '11': 2\n  total: 2\n"` | `{11:2}`, 2 |
| Alias used above its anchor | `"kickback_counts:\n  by_step:\n    '10': *late\n    '11': &late 2\n  total: 2\n"` | `{10:M, 11:2}`, 2 |
| Alias to a map | `"kickback_counts: &c\n  by_step:\n    '10': *c\n  total: 1\n"` | `{10:M}`, 1 |
| Hex, octal and binary | `"kickback_counts:\n  by_step:\n    '10': 0x3\n    '11': 0o3\n    '12': 0b11\n  total: 0x5\n"` | `{10:3, 11:3, 12:3}`, 5 |
| Signed integers | `"kickback_counts:\n  by_step:\n    '10': +3\n    '11': -3\n  total: -1\n"` | `{10:3}`, 0 |
| A leading zero | `"kickback_counts:\n  by_step:\n    '10': 010\n  total: 010\n"` | `{10:10}`, 10 |
| Fraction and exponent | `"kickback_counts:\n  by_step:\n    '10': 3.9\n    '11': 3e0\n    '12': .5\n  total: 4.5\n"` | `{10:3, 11:3}`, 4 |
| Step keys in another notation | `"kickback_counts:\n  by_step:\n    0xF: 3\n    010: 2\n    +11: 1\n  total: 6\n"` | `{15:3, 10:2, 11:1}`, 6 |
| Booleans | `"kickback_counts:\n  by_step:\n    '10': true\n    '11': False\n  total: TRUE\n"` | `{10:1}`, 1 |
| Empty and null values | `"kickback_counts:\n  by_step:\n    '10':\n    '11': ~\n    '12': null\n  total:\n"` | `{}`, 0 |
| Not a number | `"kickback_counts:\n  by_step:\n    '10': .nan\n    '11': lots\n  total: .NaN\n"` | `{}`, 0 |
| Infinity, positive and negative | `"kickback_counts:\n  by_step:\n    '10': .inf\n    '11': -.inf\n  total: +.Inf\n"` | `{10:M}`, M |
| An integer too large for a JavaScript number | `"kickback_counts:\n  by_step:\n    '10': " + '9'.repeat(400) + "\n  total: " + '9'.repeat(400) + "\n"` | `{10:M}`, M |
| A large but finite count | the same with `'9'.repeat(20)` | `{10:1e20}`, 1e20 |
| The same key twice, and the counter key twice | `"kickback_counts:\n  by_step:\n    '10': 1\n    '10': 3\n  total: 4\n  total: 2\nkickback_counts:\n  by_step:\n    '11': 2\n  total: 3\n"` | `{10:3, 11:2}`, 4 |
| Tabs used for indentation, consistently | `"kickback_counts:\n\tby_step:\n\t\t'10': 3\n\ttotal: 3\n"` | `{10:3}`, 3 |
| Malformed YAML elsewhere in the block | `"note: \"unterminated\nkickback_counts:\n  by_step:\n    '10': 3\n  total: 3\n"` | `{10:3}`, 3 |
| Another key in the counter, with lines under it | `"kickback_counts:\n  note:\n    anything: 9\n    - x\n  by_step:\n    '10': 2\n  total: 2\n"` | `{10:2}`, 2 |
| A plain value on the key line | `"kickback_counts: removed\n"` | `{}`, 0 |
| Forbidden step keys | `'kickback_counts:\n  by_step:\n    "__proto__": 9\n    "constructor": 9\n    "prototype": 9\n    "10": 1\n  total: 1\n'` | `{10:1}`, 1, and `Object.hasOwn(reading.by_step, k)` is false for all three keys |
| A folded block value for the total | `"kickback_counts:\n  by_step:\n    '10': 1\n  total: >-\n    2\n"` | `{10:1}`, M |
| A line with no key among the steps | `"kickback_counts:\n  by_step:\n    '10': 1\n    this is not a count\n  total: 2\n"` | `{10:1}`, M |
| A tag on a step value | `"kickback_counts:\n  by_step:\n    '10': !!int 3\n    '11': 2\n  total: 3\n"` | `{10:M, 11:2}`, 3 |
| A literal block value on a step | `"kickback_counts:\n  by_step:\n    '10': \|\n      3\n    '11': 2\n  total: 3\n"` (the `\|` is a plain vertical bar in the test) | `{10:M, 11:2}`, 3 |
| A plain value continued on a deeper line | `"kickback_counts:\n  by_step:\n    '10': 3\n      4\n    '11': 2\n  total: 3\n"` | `{10:M, 11:2}`, 3 |
| A list under a step | `"kickback_counts:\n  by_step:\n    '10':\n      - 3\n  total: 3\n"` | `{10:M}`, 3 |
| A flow collection as a step value | `"kickback_counts:\n  by_step:\n    '10': [3]\n  total: 3\n"` | `{10:M}`, 3 |
| A double-quoted escape `JSON.parse` cannot read | `"kickback_counts:\n  by_step:\n    '10': \"\\x33\"\n  total: 1\n"` | `{10:M}`, 1 |
| An unclosed quote on a step | `"kickback_counts:\n  by_step:\n    '10': \"3\n  total: 1\n"` | `{10:M}`, 1 |
| A date as a count | `"kickback_counts:\n  by_step:\n    '10': 2026-10-07\n  total: 2026-10-07T10:00:00Z\n"` | `{10:M}`, M |
| A merge key among the steps | `"base: &b {'12': 3}\nkickback_counts:\n  by_step:\n    <<: *b\n    '10': 1\n  total: 1\n"` | `{10:1}`, M |
| A merge key in the counter | `"kickback_counts:\n  <<: {total: 9}\n  by_step:\n    '10': 1\n  total: 1\n"` | `{10:1}`, M |
| A list item among the steps | `"kickback_counts:\n  by_step:\n    - 3\n  total: 1\n"` | `{}`, M |
| An explicit key among the steps | `"kickback_counts:\n  by_step:\n    ? '10'\n    : 3\n  total: 1\n"` | `{}`, M |
| A tag on the key line | `"kickback_counts: !!map\n  by_step:\n    '10': 2\n  total: 2\n"` | `{10:2}`, M |
| A flow sequence as the step map | `"kickback_counts:\n  by_step: [3, 2]\n  total: 1\n"` | `{}`, M |
| A flow map that never closes | `"kickback_counts:\n  by_step: {'10': 3,\n  total: 2\n"` | `{}`, M |
| A line indented less than the counter's entries | `"kickback_counts:\n    by_step:\n      '10': 1\n  total: 2\n"` | `{10:1}`, M |
| An indented line under a plain value on the key line | `"kickback_counts: removed\n  total: 4\n"` | `{}`, M |
| A frontmatter block written as one flow map (reads lower; rule 13) | whole plan text `"---\n{kickback_counts: {by_step: {'10': 3}, total: 3}}\n---\n\n# Fixture plan\n"` | `{}`, 0 |
| A top-level explicit key (reads lower; rule 13) | `"? kickback_counts\n: {by_step: {'10': 3}, total: 3}\n"` | `{}`, 0 |

Keys in the reading column are step names as text (`{10:3}` is `{ '10': 3 }`); `1e20` is `100000000000000000000`. The two real counters of scenario 13 are also rows: `{8:1, 14:1}`, 2 and `{14:1}`, 1.

**Not in the gated suite, run once and recorded** (Steps 12 and 14):
- **The one-time comparison with the old library.** A throwaway program in the session's scratch directory, never committed, that writes nothing into the repository. The old reading: `js-yaml` from the development tree (its `package.json` version confirmed as 4.3.2), `frontmatterBlocks` as today, `yaml.load` on each block with a throw contributing nothing, then `normalizeCounts` and the max-fold exactly as they stood before 6.14.135 (`git show 1ea0402d^:src/lib/circuit-breaker.js`, the parent of the 6.14.135 commit). The new reading: the built `readKickbackCounts` on a copy of the text in an empty project. Inputs: every catalogue row (its fixture strings copied from the test file) and every plan file under every folder of `plans/`, listed at run time. Output: per row, both readings and the direction (equal, higher, lower); per plan file that carries an old counter, its slug and both readings; the number of plan files compared. "Lower" is judged per count: a step or a total below the old library's. Two kinds of lower reading are expected and listed, not stopped: the two rule-13 rows, and a step count below the old library's in a reading whose total is saturated (9007199254740991), which is the trade-off of the saturation width (a merge key, a list item, an explicit key or a flow sequence among the steps carries step counts the reader cannot name; the saturated total makes every following send-back escalate). Any other lower reading, in a row or a plan file, stops the build at Step 14 and is reported by name.
- **The timing probe.** A throwaway program in the session's scratch directory that times `readKickbackCounts` (median of five runs) at a base size and at two and four times it, on five hostile shapes: 10,000 step lines; one line of 100,000 characters mixing quotes, `#`, `:` and spaces; a flow map nested 100,000 deep; 10,000 aliases to an unanchored name beside 10,000 `&` tokens; an unclosed flow followed by 10,000 lines. A doubling of the input that more than triples the time is a finding handed to Step 13.

**Coverage targets:** every line and branch of the new reader and of `toCount` reached by a row or a scenario; every unreadable path reached by at least one row.

### Acceptance Criteria Mapping

| Parent scenario | Implemented in | Test |
|---|---|---|
| A blank line inside the step map drops no count (menu route) | rules 1, 5, 6 | scenario 1; catalogue "Empty and whitespace-only lines" |
| A comment line at the step map's own indentation drops no count | rule 1 | scenario 2; catalogue "Comment lines at every indentation" |
| A comment in the first column does not end the counter | rules 1, 3 | scenario 3 |
| A comment after a count is not part of the count | rule 1 | scenario 4; catalogue rows on comments and `#` |
| The counter is found whatever follows or quotes its key | rules 3, 4, 6 | scenario 5; catalogue key-line rows |
| Flow maps are read | rules 4, 5, 7, 8 | scenario 6; catalogue flow rows |
| Quoted values are read | rule 10 | scenario 7; catalogue quoted rows |
| Anchored values and aliases are read | rule 9 | scenario 8; catalogue alias rows |
| Number notations and step keys in another notation | rules 6, 10 | scenario 9; catalogue notation rows |
| A counter line the reader cannot read escalates | rules 5, 6 and the narrow width | scenarios 10 and 11; catalogue escalating rows |
| An oversized count escalates | rule 11, `normalizeCounts` | scenario 12; catalogue infinity and oversized rows |
| Every real old counter reads exactly as before | all rules | scenario 13; the five circuit-breaker test files and the no-packages check, unchanged by this slice, pass at Step 14 |
| The whole shape catalogue is pinned and checked once against the old library | the catalogue | the table-driven test; the one-time comparison |

### Risk Mitigations

| Risk (parent) | Mitigation | Where |
|---|---|---|
| The fix lowers a count that reads correctly today | the five circuit-breaker test files and the no-packages check, unchanged by this slice, pass; two real counters pinned; the one-time comparison over every plan file stops the build on any lower reading | Steps 8 and 14 |
| A backtracking pattern lets a hostile plan slow every send-back | character walks, no nested quantifiers (the lint rule is an error), bounded recursion, the timing probe, the security pass reads every new pattern | rule 12; Steps 12 and 13 |
| An unreadable line escalates on every following send-back | the narrow width: only the step it names keeps escalating; every plausible shape reads exactly | this slice's decision; rules 5 and 6 |
| The comment rule cuts a quoted ` #` | quote-aware comment rule | rule 1; the `#`-inside-quotes row |
| The clean-install plan brings back lower readings | the catalogue is a permanent test; a lower reading fails the suite | the test file |

### Security Review

- [x] **Path traversal:** no path is built from plan text; the reader works on a string already read by `safeFs`.
- [x] **Input validation:** every input is untrusted plan text; nothing in it can throw, recurse past 32 levels or make the work worse than linear (rules 8, 9 and 12; the timing probe measures it).
- [x] **No secrets:** none handled.
- [x] **Safe file operations:** no write added; the kickback counter file's write is unchanged.
- [x] **Error messages:** no new message.
- [x] **Prototype pollution:** step maps are `Object.create(null)`; the anchor table is a `Map`; flow maps keep entries as an array of pairs; `normalizeCounts` still drops `__proto__`, `prototype` and `constructor`, and the catalogue asserts none of them survives as an own key.
- [x] **Command injection:** no shell, no `eval`, no `new RegExp` on text.
- [x] **Fail direction:** every rule either reads a count as the old library did or raises it; saturation is the only fallback, and it can only raise a count, never suppress an escalation.

## Decisions Taken Under Ambiguity — technical planning

1. **The saturation width is the count the unreadable line names or continues; the plan total when it names none.** The evidence and the trade-off are in "The saturation width, settled on evidence" above. It narrows the parent's decision 1 and splits the catalogue's last row; both of the parent's escalating fixtures keep their numbers.
2. **A saturated count is recorded as `Infinity` and turned into the largest safe integer by the one count rule.** The kickback counter file's `1e999` and the legacy reader's saturation share one line of code (the parent's decision 5).
3. **A count between 0 and 1 leaves no zero entry.** `toCount` gives 0 and the step is not stored. No reader tells a zero entry from an absent one (`recordKickback` reads `counts.by_step[stepKey] || 0`); the catalogue's fraction row pins it.
4. **A date or timestamp value is unreadable.** The old library's default schema reads it as a date (`timestamp.js`), and `Number` of a date is milliseconds since 1970, so the old library read a count of about 1.8 × 10^12. Saturating reads at least that; reading 0 would read lower.
5. **An alias whose name follows an `&` somewhere in the block but has no value recorded above it is unreadable.** That covers anchors inside constructs the reader does not read, so an anchor the reader missed can never make an alias read lower; an alias whose name follows no `&` anywhere reads 0 for its entry, as the parent decided.
6. **A tag on the counter's key line saturates the total and the counter is still read.** The steps under it are read exactly, so they read at least as high as the old library read them.
7. **Spaces before a colon are accepted** in the counter key, `by_step`, `total` and step keys (`kickback_counts :`, `'10' : 3`): YAML allows them, so refusing them could read lower.
8. **A step count below the old library's under a saturated total is an expected comparison result, not a stop.** The parent's catalogue scenario says no row reads lower; under the parent's own decision 1 (saturate only the total) the same rows already read their merged or listed step counts lower, so the parent's two texts disagreed on these rows. This slice states it: the escalation is never lost, because the total is saturated, and the comparison lists each such row by name.
9. **The two shapes that still read lower stay as catalogue rows** (rule 13). Making them saturate would need the reader to recognise a counter outside a block mapping; no plan and no CTOC writer uses either, and pinning them shows any change.
10. **The test file is `tests/circuit-breaker-legacy-reader.test.js`**, named after the module and the function it pins, beside the five `circuit-breaker-*` test files.
11. **The fixtures of the one-time comparison are copied from the test file**, not shared through a new fixture file: the comparison runs once, and the parent keeps the catalogue as constants in the test.
12. **The old reading is taken from git history** (the parent of commit `1ea0402d`), never from a worktree copy, so the comparison uses exactly the code that shipped before 6.14.135.
13. **The functional plan's decision 12 said it would reach technical planning only on the owner's OK; its approval record shows it crossed on recorded evidence** (`.ctoc/approvals/the-circuit-breakers-old-count-reader-reads-every-shape-the-old-library-read.json`: `advanced_by: sufficiency`, no questions computed). The fix direction is the owner's own ruling, relayed in the planning brief, and this slice reads only higher, inside that ruling; so no question is put, and the fact is stated here for him to see.
14. **No question for the owner.** No technology stack, algorithm or cost is open: the fix direction is his, no package is added, and the width was delegated to this planning on evidence. The questions file holds an empty list.

## Execution Plan

### Step 8: TEST
- [ ] Copy the leading frontmatter blocks of `plans/done/00096-two-scheduler-guarantees-that-no-test-defends.md` and `plans/done/00125-the-sync-barrier-is-undefended-where-work-actually-starts.md` byte for byte into the test as string literals, and compare each literal with the file's bytes once in the build record (equal or not).
- [ ] Write `tests/circuit-breaker-legacy-reader.test.js`: the thirteen scenario tests and the catalogue table of the Test Plan.
- [ ] Run `node --test tests/circuit-breaker-legacy-reader.test.js`. Record, as prose, every failing test and every passing one; each failing scenario fails with the parent's "today" figure, and every row that passes today is named as a regression pin.
- [ ] Step 8 done

### Step 9: PREPARE
- [ ] Run the five circuit-breaker test files, `tests/runs-without-installed-packages.test.js`, `tests/false-green-fence.test.js` and `npm run lint` on the unchanged tree; all pass (the baseline this slice must keep).
- [ ] Confirm `node_modules/js-yaml/package.json` says 4.3.2, and that `git show 1ea0402d^:src/lib/circuit-breaker.js` holds the `yaml.load` reading.
- [ ] Re-read `normalizeCounts`, `legacyCountsFromBlock`, `maxCountsAcrossBlocks` and `recordKickback`; if a line number in this slice moved, record the new one.
- [ ] Step 9 done

### Step 10: IMPLEMENT
- [ ] `src/lib/circuit-breaker.js`: add `toCount` and switch `normalizeCounts` to it, keeping the forbidden-key line byte for byte; add `withoutComment` and `plainScalar`; rewrite `legacyCountsFromBlock` to rules 1 to 13; update its JSDoc and the module header's "No packages" paragraph.
- [ ] Run the new test file until it passes; then the five circuit-breaker test files, `tests/runs-without-installed-packages.test.js` and `tests/false-green-fence.test.js`, all unchanged by this slice (the no-packages test may already carry the sibling slice's changes) and passing; then `npm run lint` with no warning.
- [ ] Step 10 done

### Step 11: REVIEW
- [ ] Dispatch `iron-loop-critic` with: does the code implement rules 1 to 13 exactly, rule by rule; is there any path where a count reads lower than the old library would read it (attack the narrow width with an unreadable value that YAML extends over the following lines); do lines taken by a flow or a continuation ever get read twice; is every catalogue row's reading derived from the rules and not from the code.
- [ ] Step 11 done

### Step 12: OPTIMIZE
- [ ] Run the timing probe of the Test Plan once; record the five shapes' times at one, two and four times the base size.
- [ ] Step 12 done

### Step 13: SECURE
- [ ] Dispatch `security-scanner` on the diff of `src/lib/circuit-breaker.js`, with the timing record: every new regular expression (nested quantifiers), every loop over text (linear), the recursion bound, the never-throws contract, prototype keys, and that no fallback can lower a count.
- [ ] Step 13 done

### Step 14: VERIFY
- [ ] `npm test`, the gated entry point: fail 0, skipped 0, coverage at or above `.ctoc/coverage-baseline.json` `minPct`. Read the per-file coverage of `src/lib/circuit-breaker.js` and list any new line not covered; each is covered by a row or removed.
- [ ] `npm run lint`: no warning.
- [ ] Run the one-time comparison with the old library. Record per row and per plan file both readings and the direction, and the number of plan files compared. A lower reading other than the two rule-13 rows and a step below the old library's under a saturated total stops the build and is reported by name.
- [ ] Step 14 done

### Step 15: DOCUMENT
- [ ] Update the count lines: `node -e "const r=require('./src/scripts/release.js');console.log(JSON.stringify([r.updateDocCountsInClaudeMd(process.cwd()),r.updateDocCountsInReadme(process.cwd())]))"`. Read the diff of `CLAUDE.md` and `README.md`: only count lines differ, and `CLAUDE.md` stays at or under 15,000 bytes.
- [ ] The Execution Record holds: the Step 8 results, the timing record, the comparison record (by slug, never a path) and the coverage figure. No line in it starts with a hash mark except real headings; test-runner figures are written as prose ("tests 70, pass 70, fail 0").
- [ ] Step 15 done

### Step 16: FINAL-REVIEW
- [ ] Dispatch `iron-loop-critic` against the parent's scenarios of the first three stories, the real-counter scenario and the catalogue scenario, and against this slice's decision on the saturation width.
- [ ] Step 16 done
