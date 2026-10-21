---
title: "An empty overrides list no longer holds every plan"
type: implementation
created: 2026-10-08
priority: high
effort: small
parent_plan: evidence-crossings-respect-the-regulated-profiles
depends_on: none
files:
  - src/lib/regulatory-regime.js
  - tests/lib-regulatory-regime.test.js
  # The end-to-end proof needs the continuation's crossing pass and the fixtures that drive it
  # (seedBuilt, readyPair, writeSettingsText, descriptorOf), which live only in this file.
  - tests/plans-keep-moving-without-the-human.test.js
---

# An empty overrides list no longer holds every plan

A bug fix the owner approved on 2026-10-08 ("yes"). It fails closed today — nothing crosses
wrongly — but it switches off the keep-working behaviour on every project whose regulatory
settings carry `overrides: {}`, CTOC's own included.

## Problem statement

Since v6.14.121 (commit 34b9b8ab, the parent plan) `regimeHold` in `src/lib/streaming-gate.js`
holds a plan at the functional crossing and at review whenever
`regulatory-regime.misreadRegime(root)` is not null. `misreadRegime` calls `overridesMisread`
first, and `overridesMisread` refuses every `overrides:` line that is not bare:

```js
if (!/^\s+overrides:[ \t]*$/.test(lines[at])) return true;
```

CTOC's own `.ctoc/settings.yaml` (lines 33–55) has:

```yaml
regulatory_regime:
  declined: true
  active_profiles: []
  overrides: {}
```

Traced by reading the code for that block:

- `overridesMisread` finds `  overrides: {}`, which is not bare → true → `misreadRegime`
  returns `'overrides'`.
- `regimeHold(root, 'functional')` and `regimeHold(root, 'review')` both return
  `'regime-unreadable'`.
- `pendingGateDecisions` therefore skips both the crossing on sufficiency (functional →
  implementation) and, on the continuation's pass, the finish on evidence (review → done). Every
  such plan waits for the owner, and the screen tells him something false: "It waits for your
  approval: CTOC could not read this project's regulatory settings, so it does not move on by
  itself." The `plan <ref>` screen (`planDecisionScreen`, which also calls `regimeHold`) shows the
  same sentence.

New projects are not affected: `src/lib/init-project.js` writes no `overrides` line (checked: its
regime block is the header and `active_profiles: []` with a comment). Affected: CTOC's own
settings, five of the owner's local projects (his count, not re-checked here), and test fixtures:
the literal `overrides: {}` appears 19 times across 15 test files, `tests/compliance-regime.test.js`
among them (recounted on 2026-10-08 with a literal search of `tests/`; this plan said 16 before —
the sixteenth file, `tests/plans-keep-moving-without-the-human.test.js`, carries
`overrides: { … }` only as JavaScript object literals). None of those fixtures asserts the hold:
the only test file that asserts `'regime-unreadable'` is
`tests/plans-keep-moving-without-the-human.test.js`, and none of its cases uses `overrides: {}`.

**`parseRegimeBlock` is already right.** Its overrides loop starts only on a bare `overrides:`
header (`/^\s+overrides:[ \t]*$/`), so on `overrides: {}` it never enters and returns
`overrides: {}`. It is not changed; a guard test pins it.

**`misreadRegime`'s other branches return null for CTOC's block.** Read once the overrides branch
passes: one `regulatory_regime:` header at column 0 (the mention on line 6 is inside a comment);
the block body runs to `operations:` on line 61 and includes the column-0 comment banner on
lines 57–59; the `active_profiles` key is found with the value `[]`, which matches the
explicitly-empty test; there are no profiles to check, no override to check against the profile
catalog, and every key and value is read whole. So after the fix:

| Call, on CTOC's block | Today | After the fix |
|---|---|---|
| `misreadRegime(root)` | `'overrides'` | `null` |
| `loadActiveProfiles(root)` | `{ profiles: [], overrides: {}, declined: true }` | unchanged |
| `regimeHold(root, 'functional')` | `'regime-unreadable'` | `null` (the compliance trigger reads no profile, so neither GDPR nor the EU AI Act is on) |
| `regimeHold(root, 'review')` | `'regime-unreadable'` | `null` (no profile and no override, so the control set is empty) |

**Found in review on 2026-10-08 and closed in the same change (decisions 10–18).** The same
reader drops more kinds of settings text with nothing holding the plan:

- a tab in the indentation of a line under an `overrides` header: `overridesMisread` measures
  indentation in characters, counts the tab as one character, and stops before checking the line;
- a key the block reader cannot see — written in quotes (`"overrides":`, `'active_profiles':`,
  `"four_eyes_gate3": true`) or with whitespace before its colon (`overrides :`,
  `active_profiles :`) — and a quoted `regulatory_regime` header, which today reads as no regime
  at all;
- by the session decision recorded as decision 15, every other line the block reader does not
  read as a key or a list item: an anchor, a tag, an alias or a complex key in front of a key
  (`&a overrides:`, `!!map overrides:`, `*ref : true`, `<<: *base`, `? overrides`), a key name
  with a character other than ASCII letters, digits, `_` and `-`, a tab in the indentation of any
  line, an empty list item (which ends a profile list silently), a carriage return left inside a
  line (which the reader's own patterns read as one line in one place and two in another), and a
  top-level key with a digit or a hyphen in its name directly after the block (which the reader
  takes as part of the regime).

**Closed in the same change by the session decision recorded as decision 19: the block is read
strictly.** What the reader takes only in part, ignores, or stores under a name no check looks up,
with nothing holding the plan:

- a key other than `active_profiles`, `declined` and `overrides`: a misspelling such as `overide:`
  above a map of overrides is ignored, and so is a control name written at block level;
- a second `active_profiles` or `declined` key: the reader takes the first and drops the second
  (`active_profiles: []` followed by `active_profiles: [gdpr]` reads no profile);
- text after a value the reader takes: `active_profiles: [gdpr] [hipaa]` reads `gdpr` only, the
  list item `- gdpr hipaa` reads `gdpr`, `[gdpr,]` reads `gdpr`, and `declined: yes` reads as not
  declined;
- a list item outside a profile list, which the reader ignores;
- an override naming a control that neither the profile catalog nor the module's own control
  list, `KNOWN_CONTROLS`, defines — a near miss such as `four_eyes_gate: true` is stored under a
  name no check looks up, so the sign-off control the author meant never holds a plan — and a
  control named twice under `overrides`, where the reader keeps the last value.

**Found while planning the strict reading and closed in the same change (decisions 23 and 24).**
The `READ_LINE` this plan specified would have failed the lint rule
`security/detect-unsafe-regex`, which `eslint.config.js` sets to error for `src/`. And two
existing patterns in `misreadRegime` are not linear: the `active_profiles` key search over the
whole block body is quadratic in the number of blank lines, and the comment strip `\s+#.*$` is
quadratic in a run of whitespace in the `active_profiles` value.

**Closed in the same change by the session decision recorded as decision 28.** The profile parser
`parseYAMLShallow`, which the catalog read runs on every profile in the project's own folder,
active or not, holds four patterns that are not linear: its comment strip, its list-item pattern,
its key-and-value pattern, and its look-up of the line after a key with an empty value.

## Technical approach

All changes are in one file, the shared reader every caller routes through:
`src/lib/regulatory-regime.js`. An explicitly empty inline map on the `overrides:` line is read
as "no overrides", exactly as `active_profiles: []` is accepted as an explicitly empty list. That
is the only text newly accepted; every other change makes a misread of text the reader drops,
takes only in part, or reads differently from YAML today, or makes an existing pattern linear:
two in `misreadRegime`, and four in the profile parser `parseYAMLShallow`, whose results do not
change (decision 28).

### `src/lib/regulatory-regime.js` (MODIFY)

**1. Above `overridesMisread`,** add three module constants, and replace `overridesMisread`'s
body:

```js
/**
 * The one form of the `overrides:` line that carries a value and is still read: an explicitly
 * empty map, `overrides: {}` — spaces or tabs allowed inside the braces, and a `# comment`
 * after at least one space or tab, as YAML requires. {@link parseRegimeBlock} reads it as no
 * overrides, because its loop starts only on a bare header. The comment and the trailing blanks
 * are separate alternatives, so a failing match is linear in the line's length.
 */
const EMPTY_OVERRIDES_LINE = /^\s+overrides:[ \t]+\{[ \t]*\}(?:[ \t]+#.*|[ \t]*)$/;

/**
 * Every line of a regime block that the block reader reads, as one allowlist of five flat
 * alternatives: a blank line (spaces or tabs only); a whole-line comment (spaces or tabs, then
 * `#` and the rest); a plain key with nothing after its colon, or a plain key followed by a
 * space or tab and the rest (one or more spaces, then a name of ASCII letters, digits, `_` and
 * `-` that starts with a letter or `_`, then the colon); or a list item (one or more spaces,
 * `-`, spaces or tabs, then a non-blank character and the rest). What follows a key or a dash
 * is the value, judged by the other checks. No alternative can consume a carriage return, a
 * line separator or a paragraph separator, so a line still holding one matches no shape.
 * Anchored, never global, and linear: every quantifier is followed by a token it cannot match
 * or by the end, and no quantifier sits on a group, so the star height is one and
 * `security/detect-unsafe-regex` passes.
 */
const READ_LINE = /^(?:[ \t]*|[ \t]*#.*| +[A-Za-z_][A-Za-z0-9_-]*:| +[A-Za-z_][A-Za-z0-9_-]*:[ \t].*| +-[ \t]+\S.*)$/;

/**
 * The `active_profiles` value that is an explicitly empty list: `[`, spaces or tabs, `]`, then
 * nothing or a `# comment` after a space or tab. Anchored, so linear; it replaces an unanchored
 * comment strip that rescanned a run of whitespace from every position in it.
 */
const EMPTY_LIST_VALUE = /^\[[ \t]*\](?:[ \t]+#.*|[ \t]*)$/;

function overridesMisread(blockBody) {
  const lines = blockBody.split(/\r?\n/);
  const headers = lines.map((l, i) => (/^\s+overrides:/.test(l) ? i : -1)).filter((i) => i >= 0);
  if (headers.length === 0) return false;
  // A second overrides key: the reader takes one and drops the other silently.
  if (headers.length > 1) return true;
  const at = headers[0];
  const empty = EMPTY_OVERRIDES_LINE.test(lines[at]);
  if (!empty && !/^\s+overrides:[ \t]*$/.test(lines[at])) return true;
  const headerIndent = lines[at].match(/^\s*/)[0].length;
  for (let j = at + 1; j < lines.length; j++) {
    if (lines[j].trim() === '' || /^\s*#/.test(lines[j])) continue;
    // A tab, or any whitespace but a space, in the indentation: YAML forbids it, and the
    // character count below would take it for one column and stop before checking the line.
    if (/^ *[^\S ]/.test(lines[j])) return true;
    if (lines[j].match(/^\s*/)[0].length <= headerIndent) break;
    // Under `overrides: {}` the reader drops every line.
    if (empty) return true;
    if (!/^\s+[^\s:]+:[ \t]+(true|false)[ \t]*$/.test(lines[j])) return true;
  }
  return false;
}
```

**2. Below `overridesMisread`,** add the strict reading — its constants, `catalogControls` and
`strictMisread`:

```js
/** The keys a regime block may hold, each at most once. */
const REGIME_KEYS = new Set(['active_profiles', 'declined', 'overrides']);

/**
 * A key line of a regime block, as `[line, indentation, name, rest]`. Run only on lines
 * {@link READ_LINE} accepted, so the name is plain and the rest is empty or starts with a space
 * or tab.
 */
const KEY_LINE = /^( +)([A-Za-z_][A-Za-z0-9_-]*):(.*)$/;

/** Nothing but spaces and tabs. */
const BLANK = /^[ \t]*$/;

/**
 * An inline profile list after `active_profiles:` — a space or tab, `[`, the entries, `]` — then
 * nothing or a `# comment` after a space or tab. Each comma-separated entry is judged by
 * {@link LIST_ENTRY}: a list of names cannot be one flat pattern.
 */
const INLINE_LIST = /^[ \t]+\[([^\]]*)\](?:[ \t]+#.*|[ \t]*)$/;

/** One comma-separated entry of an inline profile list: a profile name, spaces or tabs around it. */
const LIST_ENTRY = /^[ \t]*[a-z0-9][a-z0-9-]*[ \t]*$/;

/** A block list item holding exactly one profile name, then nothing or a `# comment`. */
const PROFILE_ITEM = /^ +-[ \t]+[a-z0-9][a-z0-9-]*(?:[ \t]+#.*|[ \t]*)$/;

/** The value of `declined:`: exactly `true` or `false`, then nothing or a `# comment`. */
const BOOLEAN_VALUE = /^[ \t]+(?:true|false)(?:[ \t]+#.*|[ \t]*)$/;

/**
 * Every control name the profile catalog defines: the union of `required_controls` over every
 * profile {@link listAvailableProfiles} lists — the project's own `.ctoc/regulatory-regimes/`
 * and the profiles shipped with the plugin — each read by {@link loadProfile}, so a project's
 * own copy wins, as it does for an active profile. Null when the catalog cannot be read: a
 * folder or a profile file whose read throws, a listed profile that loadProfile refuses (a file
 * name that is not a valid profile name), or a listed profile with no parsed list of required
 * controls.
 * @param {string} projectRoot
 * @returns {Set<string>|null}
 */
function catalogControls(projectRoot) {
  try {
    const controls = new Set();
    for (const name of listAvailableProfiles(projectRoot)) {
      const profile = loadProfile(projectRoot, name);
      if (profile === null || !Array.isArray(profile.required_controls)) return null;
      for (const control of profile.required_controls) controls.add(control);
    }
    return controls;
  } catch {
    return null; // a folder or a profile file that cannot be read: the caller holds
  }
}

/**
 * Does the block hold a key, a value or an override the reader would not take whole? Run last
 * in {@link misreadRegime}, on lines {@link READ_LINE} accepted, after every other check, so a
 * text an earlier check names keeps its kind:
 * - a key other than `active_profiles`, `declined` and `overrides` outside the overrides map, a
 *   second `declined`, a `declined` value other than exactly `true` or `false`, or a list item
 *   outside an `active_profiles` block list → 'block';
 * - a second `active_profiles`, an inline list that is not exactly `[` profile names separated
 *   by commas `]`, or a list item that is not exactly one profile name → 'active-profiles';
 * - an override whose control name is neither in {@link KNOWN_CONTROLS} nor required by a
 *   profile in the catalog, a control named twice, or, for a name outside KNOWN_CONTROLS, a
 *   catalog that cannot be read → 'overrides'.
 * A `# comment` after a space or tab is allowed after each value except an override's, which
 * {@link overridesMisread} holds to exactly `true` or `false`; it also names a second
 * `overrides` key first. The catalog is read only for an override whose name is not in
 * KNOWN_CONTROLS: a name in the module's own vocabulary is known whatever the catalog holds.
 * @param {string[]} lines - the block body, split as misreadRegime splits it
 * @param {string} projectRoot
 * @returns {null|'block'|'active-profiles'|'overrides'}
 */
function strictMisread(lines, projectRoot) {
  const seen = new Set();
  const controls = new Set();
  let section = null; // the last key outside the overrides map: { name, indent, rest }
  for (const line of lines) {
    const text = line.trim();
    if (text === '' || text.startsWith('#')) continue;
    const key = line.match(KEY_LINE);
    if (!key) {
      // A list item: only inside an `active_profiles:` block list, and one profile name.
      if (!section || section.name !== 'active_profiles' || !BLANK.test(section.rest)) return 'block';
      if (!PROFILE_ITEM.test(line)) return 'active-profiles';
      continue;
    }
    const [, spaces, name, rest] = key;
    if (section && section.name === 'overrides' && spaces.length > section.indent) {
      // An entry of the map; overridesMisread already holds it to `<name>: true` or `false`.
      if (controls.has(name)) return 'overrides';
      controls.add(name);
      continue;
    }
    if (!REGIME_KEYS.has(name)) return 'block';
    if (seen.has(name)) return name === 'active_profiles' ? 'active-profiles' : 'block';
    seen.add(name);
    section = { name, indent: spaces.length, rest };
    if (name === 'declined' && !BOOLEAN_VALUE.test(rest)) return 'block';
    if (name === 'active_profiles' && !BLANK.test(rest)) {
      const list = rest.match(INLINE_LIST);
      if (!list) return 'active-profiles';
      if (!BLANK.test(list[1]) && !list[1].split(',').every((entry) => LIST_ENTRY.test(entry))) {
        return 'active-profiles';
      }
    }
  }
  // A name in the module's own vocabulary is known whatever the catalog holds (decision 27).
  const unknown = [...controls].filter((name) => !KNOWN_CONTROLS.has(name));
  if (unknown.length === 0) return null;
  const known = catalogControls(projectRoot);
  return known !== null && unknown.every((name) => known.has(name)) ? null : 'overrides';
}
```

**3. In `misreadRegime`,** change the header pattern (line 422), and replace everything from
line 427 to the end of the function (lines 427–441) so it reads as below. The profile loop
(lines 436–440) is kept as it is; the final `return null` becomes the call to `strictMisread`:

```js
  const headers = content.match(/^["']?regulatory_regime["']?[ \t]*:/gm);
  if (!headers) return null;
  if (headers.length > 1) return 'block'; // a second block: never read the first silently
  const blockMatch = content.match(/^regulatory_regime:\s*\n([\s\S]*?)(?=^[a-zA-Z_]+:|(?![\s\S]))/m);
  // A quoted header, or whitespace before its colon, counts above but is no block here.
  if (!blockMatch) return 'block';
  if (overridesMisread(blockMatch[1])) return 'overrides';
  const { profiles, overrides, declined } = parseRegimeBlock(blockMatch[1]);
  // Split once, as parseRegimeBlock splits, and search line by line with its own key pattern:
  // linear, and the key is found on exactly the line where the reader finds it.
  const lines = blockMatch[1].split(/\r?\n/);
  const key = lines.map((line) => line.match(/^\s+active_profiles:[ \t]*(.*)$/)).find(Boolean);
  if (!key) {
    if (!declined && Object.keys(overrides).length === 0) return 'block';
  } else if (profiles.length === 0 && !EMPTY_LIST_VALUE.test(key[1])) {
    return 'active-profiles';
  }
  // After the two checks above, so a text they already name keeps its kind.
  if (lines.some((line) => !READ_LINE.test(line))) return 'block';
  for (const name of profiles) {
    if (!PROFILE_NAME_RE.test(name)) return 'profile-name';
    const profile = loadProfile(projectRoot, name);
    if (profile !== null && !Array.isArray(profile.required_controls)) return 'required-controls';
  }
  // Last of all, so every text an earlier check names keeps its kind.
  return strictMisread(lines, projectRoot);
```

The `!key` branch no longer returns `null` early: a declined block, or one carrying an override,
falls through to the line check and the strict reading. The profile loop after it is empty there,
because `parseRegimeBlock` fills `profiles` only from a line that the key pattern also finds.

The key search and the empty-list test change (decision 24). The search used the multiline flag
over the whole block body, where `^\s+` crosses line feeds; it is now the same per-line pattern
`parseRegimeBlock` uses, run on the lines the rest of the function already uses. The test was
`key[1].replace(/\s+#.*$/, '').trim()` followed by `/^\[\s*\]$/`; it is now the anchored
`EMPTY_LIST_VALUE`, run only when no profile was read, as before.

The header pattern names `regulatory_regime` itself, so an unrelated quoted top-level key never
matches it. `regulatory_regime :` is already refused today: line 422's pattern counts it as a
header and line 425's block pattern needs `regulatory_regime:` with no space, so line 426 returns
`'block'`. A quoted header is not refused today: line 422's pattern starts at `regulatory_regime`,
so `"regulatory_regime":` is no header at all and line 423 returns `null`.

**4. In the profile parser (decision 28),** replace `nextNonEmpty` (lines 169–175) with the two
helpers below, and replace `parseYAMLShallow`'s body (lines 108–161) so it reads as below.
`stripBom` and `coerce` are kept as they are, and so is the comment above the list-item branch
(lines 125–130). Each change returns exactly what the code it replaces returned, on every input;
decision 28's table derives each one.

```js
/**
 * The line without its comment, as `line.replace(/#.*$/, '')` returned it, in linear time. That
 * pattern cut from the first `#` with no carriage return, line separator or paragraph separator
 * after it (`.` stops at each of them, a line feed never survives the split, and `$` is the end
 * of the line), and on a run of `#` before a lone carriage return it rescanned the run from
 * every `#` in it.
 * @param {string} line
 * @returns {string}
 */
function stripComment(line) {
  const from = Math.max(line.lastIndexOf('\r'), line.lastIndexOf('\u2028'), line.lastIndexOf('\u2029')) + 1;
  const hash = line.indexOf('#', from);
  return hash === -1 ? line : line.slice(0, hash);
}

/**
 * What `\s*(.*)$` captured from `at` to the end of the line, trimmed, or null where it did not
 * match: when the text after the leading whitespace still holds a line terminator, which `.`
 * cannot cross. In linear time: `\s*` and `.*` both take blanks, so before a lone carriage
 * return the pattern tried every split of a run of blanks between them. `\s` and `trimStart`
 * remove the same characters.
 * @param {string} line
 * @param {number} at
 * @returns {string|null}
 */
function tailValue(line, at) {
  const rest = line.slice(at).trimStart();
  return /[\n\r\u2028\u2029]/.test(rest) ? null : rest.trim();
}

function parseYAMLShallow(content) {
  const out = {};
  // CRLF-safe and byte-order-mark-safe, like the settings reader: a profile saved on Windows
  // must not lose its list items (a `\r` left on a line defeats the `$`-anchored patterns).
  const lines = stripBom(content).split(/\r?\n/).map((l) => l.replace(/\r$/, ''));
  const stack = [{ obj: out, indent: -1 }];
  // The list-or-map look-ahead, computed once: the first index of each line's text (what
  // `lines.indexOf(raw)` returned) and, for each index, the next line that is not blank once its
  // comment is stripped (what `nextNonEmpty` returned), or -1.
  const firstAt = new Map();
  lines.forEach((line, i) => { if (!firstAt.has(line)) firstAt.set(line, i); });
  const nextAt = new Array(lines.length).fill(-1);
  for (let i = lines.length - 2; i >= 0; i--) {
    nextAt[i] = stripComment(lines[i + 1]).trim() !== '' ? i + 1 : nextAt[i + 1];
  }

  for (const raw of lines) {
    const stripped = stripComment(raw);
    if (stripped.trim() === '') continue;
    const indent = raw.match(/^[ \t]*/)[0].length;

    // Pop stack until we find the right parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;

    // List item. … (the comment of lines 125–130, kept as it is)
    const dash = stripped.match(/^[ \t]*-/);
    const item = dash ? tailValue(stripped, dash[0].length) : null;
    if (item !== null) {
      const top = stack[stack.length - 1];
      if (Array.isArray(top.obj)) {
        top.obj.push(coerce(item));
      } else if (top.lastKey && Array.isArray(top.obj[top.lastKey])) {
        top.obj[top.lastKey].push(coerce(item));
      }
      continue;
    }

    // Key: value or key: (nested). The key runs to the first colon and needs one character.
    const colon = stripped.indexOf(':');
    const value = colon > 0 ? tailValue(stripped, colon + 1) : null;
    if (value !== null) {
      const key = stripped.slice(0, colon).trim();
      if (value === '' || value === '{}' || value === '[]') {
        // Decide list vs map by peeking ahead
        const next = nextAt[firstAt.get(raw)];
        const isList = next !== -1 && /^\s*-/.test(lines[next]);
        parent[key] = isList ? [] : {};
        stack.push({ obj: parent[key], indent, lastKey: key });
        stack[stack.length - 2].lastKey = key;
      } else {
        parent[key] = coerce(value);
        stack[stack.length - 1].lastKey = key;
      }
    }
  }
  return out;
}
```

What each settings text reads as after the change:

| Settings text | Today | After |
|---|---|---|
| `overrides: {}`, `overrides: { }`, `overrides: {}  # none`, the same with Windows line endings | misread | **no misread, no overrides** |
| `overrides: {gdpr: true}`, `overrides: {four_eyes_gate3: true}`, `overrides: {`, `overrides: {}}`, `overrides: {} {}`, `overrides: {}#none`, `overrides:{}`, `overrides: []`, `overrides: none`, `overrides: null`, `overrides: ~` | `'overrides'` | `'overrides'` (unchanged) |
| `overrides: {} #` + 100,000 spaces + a lone carriage return + `x` | `'overrides'` | `'overrides'` (unchanged), in linear time |
| `overrides: {}` with a line indented under it, by spaces or by a tab | `'overrides'` | `'overrides'` (unchanged) |
| `overrides: {}` and then a second `overrides:` block | `'overrides'` | `'overrides'` (unchanged) |
| two bare `overrides:` blocks | read: the first is taken, the second dropped silently | **`'overrides'`** (tightened; decision 2) |
| a bare `overrides:` header with a line under it whose indentation holds a tab | the line is never checked: `\tfour_eyes_gate3: true` happens to be read, `\tfour_eyes_gate3: True` is dropped silently | **`'overrides'`** (tightened; decision 10) |
| a bare `overrides:` header with `<control>: true` / `false` lines, each control in `KNOWN_CONTROLS` or one a catalog profile requires, each named once, comment lines allowed | read | read (unchanged) |
| any other value under a bare header (`True`, `yes`, a quoted or commented value, no value) | `'overrides'` | `'overrides'` (unchanged) |
| inside the block, a quoted key (`"overrides":`, `'active_profiles':`, `"four_eyes_gate3": true`) or a key with whitespace before its colon (`overrides :`, `active_profiles :`) | the key is invisible to the reader (a quoted control name is stored with its quotes, under a name no check looks up); when the rest of the block reads cleanly, no misread and the value is lost | **`'block'`** (tightened; decisions 11, 13 and 15) |
| an anchor, a tag, an alias or a complex key in front of a key (`&a overrides:`, `!!map overrides:`, `*ref : true`, `<<: *base`, `? overrides`), or a key name holding a character other than ASCII letters, digits, `_` and `-` (the Cyrillic small letter o, U+043E, in place of the Latin o in `four_eyes_gate3`) | the key is invisible to the reader, or stored under a name no check looks up; no misread when the rest reads cleanly | **`'block'`** (tightened; decision 15) |
| an empty list item (`    -`) in a block-style profile list | the list ends there silently; the profiles after it are dropped | **`'block'`** (tightened; decision 15) |
| a carriage return, a line separator or a paragraph separator left inside a line (`  active_profiles: []\r  overrides:`) | the per-line patterns see one line, the multiline key pattern two; an override map after it is dropped | **`'block'`** (tightened; decisions 17 and 24) |
| a tab or other non-space whitespace in the indentation of a key or list-item line outside an `overrides` map (`\tactive_profiles: [gdpr]`) | read | **`'block'`** (tightened; decision 18) |
| a column-0 line in the block body other than a blank line or a comment: a quoted or spaced top-level key, a top-level key with a digit or hyphen in its name (`ci-checks:`), a list item, `---` | read, with everything indented under it, as part of the regime | **`'block'`** (tightened; decision 14) |
| a continuation line (a multi-line plain scalar, a flow collection over several lines) | ignored, or named by an earlier check | `'block'`, unless an earlier check names it first: a split `active_profiles` flow list stays `'active-profiles'` (decision 16) |
| `"regulatory_regime":` or `'regulatory_regime':` | no regime | **`'block'`** (tightened; decision 12) |
| `regulatory_regime :` | `'block'` (lines 422, 425 and 426) | `'block'` (unchanged) |
| a quoted top-level key the reader does not read (before the block, or under a recognised top-level key after it) | no misread | no misread (unchanged) |
| a key other than `active_profiles`, `declined` and `overrides` outside the overrides map (`overide:`, `instituted_at:`, a control name such as `four_eyes_gate3: true` written at block level) | ignored, or (a control name after the overrides map) applied as an override | **`'block'`** (tightened; decision 19) |
| a second `active_profiles` key (`active_profiles: []` then `active_profiles: [gdpr]`) | the first is read, the second dropped | **`'active-profiles'`** (tightened; decision 19) |
| a second `declined` key | the first is read | **`'block'`** (tightened; decision 19) |
| an inline profile list that is not exactly `[` names separated by commas `]` (`[gdpr] [hipaa]`, `[gdpr,]`, a no-break space beside a name) | the part inside the first brackets is read, empty entries dropped, the entries trimmed | **`'active-profiles'`** (tightened; decision 19) |
| a block list item that is not exactly one profile name (`- gdpr hipaa`) | the first word is read | **`'active-profiles'`** (tightened; decision 19) |
| a list item outside an `active_profiles:` block list (after `declined: true`, or after an inline list) | ignored | **`'block'`** (tightened; decision 19) |
| `declined:` with a value other than exactly `true` or `false` (`yes`, `True`, `on`, a quoted value, no value) | read as not declined | **`'block'`** (tightened; decision 19) |
| an override whose control name is neither in `KNOWN_CONTROLS` nor required by a profile in the catalog (`four_eyes_gate: true`) | stored and applied under that name; no check looks up a misspelt name | **`'overrides'`** (tightened; decisions 19, 21 and 27) |
| an override of a control in `KNOWN_CONTROLS` that no profile requires (`andon_cord_halt: false` under `iso-9001`, the example in `docs/CONTINUOUS_IMPROVEMENT.md`) | read | read (unchanged; decision 27) |
| a control named twice under `overrides` (`four_eyes_gate3: true` then `four_eyes_gate3: false`) | the last value is read | **`'overrides'`** (tightened; decision 22) |
| an override of a control outside `KNOWN_CONTROLS`, when the project's own profile folder holds a profile with no list of required controls, a file name `loadProfile` refuses, or an entry that cannot be read | read (the catalog is not read today) | **`'overrides'`** (tightened; decisions 21 and 27); an override of a control in `KNOWN_CONTROLS` in the same project stays read |
| `active_profiles: [ gdpr , eu-ai-act-high-risk ]  # EU`, `- gdpr  # EU`, `declined: false  # asked`, `active_profiles: []  # none` | read | read (unchanged) |
| `active_profiles: [` + 100,000 spaces + `x`; a block with 100,000 blank lines | `'active-profiles'` and `null`, each after about n²/2 ≈ 5 × 10⁹ steps | `'active-profiles'` and `'block'` (the trailing line `  x`), in linear time (decision 24) |
| an override of a control outside `KNOWN_CONTROLS` while a profile in the project's own folder holds a long run of `#`, of blanks, or of key lines (Step 13, inputs 15–20) | the same result as after, after about n²/2 steps | the same result, in linear time (decision 28) |

JSDoc to update (Step 15):

- `EMPTY_OVERRIDES_LINE`, `READ_LINE`, `EMPTY_LIST_VALUE`, `REGIME_KEYS`, `KEY_LINE`, `BLANK`,
  `INLINE_LIST`, `LIST_ENTRY`, `PROFILE_ITEM`, `BOOLEAN_VALUE`, `catalogControls`,
  `strictMisread`, `stripComment` and `tailValue`: as written in the code blocks above.
- `parseYAMLShallow`: add to its description "Linear in the profile's length; it returns what it
  returned before its patterns were made linear, on every input."
- `overridesMisread`: the header may be bare or the explicitly empty map; nothing may sit indented
  under the empty map; a tab or other non-space whitespace in the indentation of a line under
  either header is a misread; a second `overrides` key is a misread.
- `misreadRegime`'s list of misreads:
  - the header bullet: "a `regulatory_regime` header the block reader cannot take (a comment
    after the colon, a flow mapping, the key in quotes or with whitespace before its colon) →
    'block'";
  - the `active_profiles` value bullet: "an `active_profiles` value that parses to no profile but
    is not an explicitly empty list (`[]`, spaces or tabs inside, a `# comment` after it) — a
    scalar, a flow list split over lines, an empty block list → 'active-profiles'";
  - a new bullet: "a line in the block that is not a blank line, a whole-line comment, an indented
    plain key (a name of letters, digits, `_` and `-`, a colon, then the end of the line or a
    space or tab) or an indented list item with a value — a quoted, anchored, tagged or aliased
    key, a complex key, a key with whitespace before its colon, a tab in the indentation, an empty
    list item, a carriage return left inside a line, and any line at column 0 other than a comment,
    which the reader would take as part of the block → 'block'; checked after the `overrides` and
    `active_profiles` checks, so a text those name keeps their kind";
  - the no-`active_profiles` bullet: "a block with no `active_profiles` key, unless declined or
    carrying at least one override → 'block'" (it says "unless it is declined or only overrides"
    today);
  - the `overrides` bullet: "an `overrides` entry whose value is not exactly `true` or `false`
    (…), text after the `overrides:` header other than an explicitly empty map `{}` (an optional
    comment after it), anything indented under `overrides: {}`, a tab in the indentation of a line
    under either header, or a second `overrides` key → 'overrides'";
  - a new last bullet: "read last and strictly: a key other than `active_profiles`, `declined` and
    `overrides`, a second `declined`, a `declined` value other than exactly `true` or `false`, or
    a list item outside an `active_profiles` block list → 'block'; a second `active_profiles`, an
    inline list that is not exactly `[` profile names separated by commas `]`, or a list item that
    is not exactly one profile name (a `# comment` allowed after each value) →
    'active-profiles'; an override whose control name is neither in {@link KNOWN_CONTROLS} nor
    required by a profile in the catalog ({@link listAvailableProfiles}, read by
    {@link loadProfile}), a control named twice, or, for a name outside KNOWN_CONTROLS, a
    catalog that cannot be read → 'overrides'".

Not changed: `parseRegimeBlock`, `loadActiveProfiles` (a quoted header still reads as no profiles
there, as every other `'block'` misread does; `misreadRegime` is what holds the plan),
`loadProfile` and `listAvailableProfiles` (both now also called by `catalogControls`),
`src/lib/streaming-gate.js`, `misreadRegime`'s profile loop, the return type of `misreadRegime`
(no new kind), the contents of `KNOWN_CONTROLS` (now read by the strict reading: decision 27),
`stripBom`, `coerce`, and every export (no new export). `parseYAMLShallow` changes only in how
fast it reads: it returns what it returned before on every input (decision 28).

## Wiring — the live call sites

No new module and no new export. `overridesMisread`, `strictMisread`, `catalogControls`,
`stripComment`, `tailValue` and the pattern constants (`EMPTY_OVERRIDES_LINE`, `READ_LINE`,
`EMPTY_LIST_VALUE`, `REGIME_KEYS`, `KEY_LINE`, `BLANK`, `INLINE_LIST`, `LIST_ENTRY`,
`PROFILE_ITEM`, `BOOLEAN_VALUE`) are internal. `overridesMisread` and `strictMisread` have one
caller, `misreadRegime`; `strictMisread` also reads the existing `KNOWN_CONTROLS`;
`catalogControls` has one caller, `strictMisread`, and itself calls the existing
`listAvailableProfiles` and `loadProfile`. `stripComment` and `tailValue` have one caller,
`parseYAMLShallow`, whose one caller is `loadProfile` (called in this module by
`effectiveControls`, `retentionDays`, `unloadableProfiles`, `misreadRegime` and
`catalogControls`); `nextNonEmpty`, whose one caller was `parseYAMLShallow`, is deleted.
`misreadRegime`'s live caller is `regimeHold` in `src/lib/streaming-gate.js`. `regimeHold` is
called by `pendingGateDecisions` (the default `/ctoc:start` screen through `streamingGateScreen`,
`stream answer`, `stream approve`, `stream skip`, and `menu task complete <id> --continue` through
`menu-screens.continueAfterCrossing`) and by `planDecisionScreen` (the `plan <ref>` route). Root:
the shipped slash command `src/commands/start.js` → `menu-screens.route`. Fixing the reader fixes
every one of these at once.

## Test plan (Step 8, written first, run red before any code)

Real functions on real files in temporary projects; nothing mocked.

### `tests/lib-regulatory-regime.test.js` (MODIFY)

Append thirteen `it` blocks inside the describe block
`'profiles shipped with the plugin (a project with no profile folder)'`, after
`'a second regulatory_regime block is a misread'`. They use that block's `bareProject(body)`
(which writes the body followed by `\ntimezone: "UTC"\n`; `bareProject(null)` writes no settings
file), and, where a case needs a profile folder of the project's own, the module-level
`makeProject()` (which creates `.ctoc/regulatory-regimes/`), `writeProfile(root, name, yaml)` and
`writeSettings(root, body)` (which appends `\ntimezone: "UTC"\n` too); test 13 also uses the
module-level `SHIPPED_DIR` and `SHIPPED`. Add two module-level constants (test 13 adds two more
items, described below). The first is quoted from CTOC's own `.ctoc/settings.yaml` as of
2026-10-08 (lines 33–64, the fourteen profile-list comment lines cut to one and the `operations`
block cut to one key):

```js
const CTOC_REGIME_BLOCK = [
  'regulatory_regime:',
  '  declined: true',
  '  # Profiles to activate. Default empty list = `none` (lean, opt-in nothing).',
  '  #   - pci-dss-v4        (payment card industry, mandatory March 2025)',
  '  active_profiles: []',
  '',
  '  # Override individual controls regardless of profile (use sparingly).',
  '  # Setting a control to `true` activates it; `false` forces it off.',
  '  overrides: {}',
  '',
  '# ─────────────────────────────────────────────────────────────────────────────',
  '#  Operations Configuration (NEW in v1.4.0)',
  '# ─────────────────────────────────────────────────────────────────────────────',
  '',
  'operations:',
  '  provider: "anthropic"',
  '',
].join('\n');
```

The second, `TEST_SUITE_SETTINGS`, is every regulatory settings text CTOC's own test files write,
read on 2026-10-08 (27 test files write one directly; three more — `init-project`,
`settings-format-single-encoding`, `greenfield-journey` — read the text `init-project.js`
generates), each with the result `misreadRegime` gives once this plan is built. A template is
called with every value its source file passes; line numbers are as read on 2026-10-08. Copy it
exactly. The carriage return stays the escape `\r`, and the byte-order mark is built with
`String.fromCharCode(0xfeff)`; neither is ever a literal character in the source:

```js
const ALL_LISTS = ['[]', '[gdpr]', '[eu-ai-act-high-risk]', '[gdpr, eu-ai-act-high-risk]'];
// settingsYaml in compliance-integration (47), gdpr-agent-runner (31), cto-chief-compliance-dispatch
// (46), compliance-integration-coverage (46), compliance-seam-is-executable (63),
// eu-ai-act-agent-runner (33) and compliance-regime-coverage (57); projectWithRegime in
// iron-loop-compliance-trigger-coverage (65).
const COMPLIANCE_TEMPLATE = (l) =>
  `timezone: "UTC"\n\nregulatory_regime:\n  active_profiles: ${l}\n  overrides: {}\n\nenforcement:\n  mode: strict\n`;
// compliance-mode.test.js:31
const COMPLIANCE_MODE_TEMPLATE = (l) =>
  `timezone: "UTC"\n\nregulatory_regime:\n  active_profiles: ${l}\n  overrides: {}\n\noperations:\n  default_model: "claude-opus-4-5-20251101"\n  performance:\n    max_parallel_agents: 3\n\nenforcement:\n  mode: strict\n  whitelist:\n    - "*.md"\n`;
// compliance-ride-along.test.js:30
const RIDE_ALONG_TEMPLATE = (l, env) =>
  `enforcement:\n  mode: strict\n\nregulatory_regime:\n  active_profiles: ${l}\n  overrides: {}\n\ngeneral:\n  environment: ${env}\n`;
// src/lib/init-project.js:521 and plans-keep-moving-without-the-human.test.js:1693
const INIT_ACTIVE_LINE = '  active_profiles: []  # opt-in industry profiles (e.g. gdpr); none by default\n';
const TEST_SUITE_SETTINGS = [
  ...[...ALL_LISTS, '[some-unknown-regime]', '[iso-27001, unknown-regime]']
    .map((l) => [`the compliance settings template, active_profiles: ${l}`, COMPLIANCE_TEMPLATE(l), null]),
  ...ALL_LISTS.map((l) => [`iron-loop-compliance-trigger.test.js:51 (no final line feed), active_profiles: ${l}`, COMPLIANCE_TEMPLATE(l).slice(0, -1), null]),
  ...[...ALL_LISTS, '[unknown-regime]']
    .map((l) => [`compliance-mode.test.js:31, active_profiles: ${l}`, COMPLIANCE_MODE_TEMPLATE(l), null]),
  ...[['[]', 'prod'], ['[gdpr]', 'prod'], ['[eu-ai-act-high-risk]', 'prod'], ['[gdpr, eu-ai-act-high-risk]', 'prod'], ['[]', 'ask']]
    .map(([l, env]) => [`compliance-ride-along.test.js:30, active_profiles: ${l}, environment: ${env}`, RIDE_ALONG_TEMPLATE(l, env), null]),
  ['compliance-regime-coverage.test.js:242', 'regulatory_regime:\n  active_profiles:      [gdpr]\n  overrides: {}\n\nenforcement:\n  mode: strict\n', null],
  ['compliance-regime.test.js:45, the fresh block', 'regulatory_regime:\n  active_profiles: []\n  overrides: {}\n\nenforcement:\n  mode: strict\n', null],
  ['compliance-regime.test.js:58, the fresh block after declineComplianceRegime', 'regulatory_regime:\n  declined: true\n  active_profiles: []\n  overrides: {}\n\nenforcement:\n  mode: strict\n', null],
  ['compliance-regime.test.js:69, a file with no block after declineComplianceRegime', 'regulatory_regime:\n  declined: true\n\ntimezone: "UTC"\n\nenforcement:\n  mode: strict\n', null],
  ['compliance-regime.test.js:129, a block-style list', 'regulatory_regime:\n  active_profiles:\n    - gdpr\n  overrides: {}\n\nenforcement:\n  mode: strict\n', null],
  ['compliance-mode.test.js:211, no active_profiles line', 'regulatory_regime:\n  overrides: {}\n\nenforcement:\n  mode: strict\n', 'block'],
  ['w10-live-agent-reconcile.test.js:291, menu-environment.test.js:41, e2e-menu-lifecycle.test.js:323 and :351', 'regulatory_regime:\n  active_profiles: [gdpr]\n  overrides: {}\n\ngeneral:\n  x: 1\n', null],
  ['menu-coverage.test.js:84, ctoc-start-command.test.js:55, start-command-coverage-holes.test.js:105, menu-reports-what-init-did.test.js:75, menu-auto-init.test.js:77', 'version: 1\n\nregulatory_regime:\n  active_profiles: []\n', null],
  ['menu-coverage.test.js:256', 'regulatory_regime:\n  active_profiles: []\n  declined: true\n\ngeneral:\n  x: 1\n', null],
  ['menu-coverage.test.js:870', 'regulatory_regime:\n  active_profiles: [gdpr\n  : : : not yaml : :\n', 'active-profiles'],
  ['menu-reports-what-init-did.test.js:171', 'version: 1\n\nregulatory_regime:\n  active_profiles:\n    - gdpr\n', null],
  ['protect-records.test.js:612, setup-check-honors-declined-anchor.test.js:87', 'regulatory_regime:\n  active_profiles: []\n', null],
  ['setup-check-honors-declined-anchor.test.js:72', 'regulatory_regime:\n  declined: true\n', null],
  ['setup-check-honors-declined-anchor.test.js:82, plans-keep-moving-without-the-human.test.js:1606', 'regulatory_regime:\n  active_profiles: [gdpr]\n', null],
  ['setup-check-honors-declined-anchor.test.js:97', 'regulatory_regime:\n  overrides:\n    gdpr_dpo: someone\n', 'overrides'],
  ['ledger-forgery-closed.test.js:591', 'general:\n  environment: dev\nenforcement:\n  mode: strict\nregulatory_regime:\n  active_profiles: []\noperations:\n  x: 1\n', null],
  ['ledger-forgery-closed.test.js:622', 'operations:\n  declined: false\nregulatory_regime:\n  active_profiles: []\nenforcement:\n  mode: strict\n', null],
  ['ledger-forgery-closed.test.js:634', 'regulatory_regime:\n  declined: false\n  active_profiles: []\noperations:\n  x: 1\n', null],
  ['ec1-gdpr-profile.test.js:54', 'regulatory_regime:\n  active_profiles: [gdpr]\n\ntimezone: "UTC"\n', null],
  ['init-project.js:504 generateSettings, cut after the detected block', `# CTOC Settings\n# Generated: 2026-10-08\n\nenforcement:\n  mode: strict  # strict | soft | off\n\nregulatory_regime:\n${INIT_ACTIVE_LINE}\ndetected:\n  languages: []\n  frameworks: []\n`, null],
  ['plans-keep-moving-without-the-human.test.js:1747', `regulatory_regime:\n${INIT_ACTIVE_LINE}`, null],
  ['plans-keep-moving-without-the-human.test.js:1748', `regulatory_regime:\n  declined: true\n${INIT_ACTIVE_LINE}`, null],
  ['plans-keep-moving-without-the-human.test.js:1749', 'timezone: "UTC"\n', null],
  ['plans-keep-moving-without-the-human.test.js:1593', 'regulatory_regime:\n  active_profiles: []\n  declined: true\n', null],
  ['plans-keep-moving-without-the-human.test.js:1626', 'regulatory_regime:\n  active_profiles: []\n  overrides:\n    four_eyes_gate3: true\n', null],
  ['plans-keep-moving-without-the-human.test.js:1629', 'regulatory_regime:\n  active_profiles: [sox-itgc]\n', null],
  ['plans-keep-moving-without-the-human.test.js:1642', 'regulatory_regime:\n  active_profiles: [pci-dss-v4]\n  overrides:\n    four_eyes_gate3: false\n', null],
  ['plans-keep-moving-without-the-human.test.js:1705', 'regulatory_regime:\n  active_profiles: [do-178c-level-a,\n    sox-itgc]\n', 'active-profiles'],
  ['plans-keep-moving-without-the-human.test.js:1706', 'regulatory_regime:\n  active_profiles: gdpr\n', 'active-profiles'],
  ['plans-keep-moving-without-the-human.test.js:1707', 'regulatory_regime: # EU\n  active_profiles: [gdpr]\n', 'block'],
  ['plans-keep-moving-without-the-human.test.js:1708', 'regulatory_regime: {active_profiles: [gdpr]}\n', 'block'],
  ['plans-keep-moving-without-the-human.test.js:1709', 'regulatory_regime:\n  active_profiles: ["gdpr"]\n', 'profile-name'],
  ['plans-keep-moving-without-the-human.test.js:1710', 'regulatory_regime:\n  active_profile: [gdpr]\n', 'block'],
  ['plans-keep-moving-without-the-human.test.js:1738', 'regulatory_regime:\n  active_profiles: [acme]\n', null],
  ['plans-keep-moving-without-the-human.test.js:1791', 'regulatory_regime:\n  active_profiles: [do-178c-level-a]\n', null],
  ['plans-keep-moving-without-the-human.test.js:1802', 'regulatory_regime:\n  active_profiles:\n    - gdpr\n    # aviation\n    - do-178c-level-a\n', null],
  ['plans-keep-moving-without-the-human.test.js:1809', 'regulatory_regime:\n  active_profiles: []\n  overrides:\n    four_eyes_gate3: True\n', 'overrides'],
  ['plans-keep-moving-without-the-human.test.js:1820', 'regulatory_regime:\n  active_profiles: []\nregulatory_regime:\n  active_profiles: [gdpr]\n', 'block'],
  ['plans-keep-moving-without-the-human.test.js:1830, a byte-order mark', String.fromCharCode(0xfeff) + 'regulatory_regime:\n  active_profiles: [gdpr]\n', null],
  ['lib-regulatory-regime.test.js:160, writeActiveProfiles with no names', 'regulatory_regime:\n  active_profiles:\n\n\ntimezone: "UTC"\n', 'active-profiles'],
  ['lib-regulatory-regime.test.js:202', 'regulatory_regime:\n  active_profiles: [alpha, beta]\n\ntimezone: "UTC"\n', null],
  ['lib-regulatory-regime.test.js:209, writeActiveProfiles with overrides', 'regulatory_regime:\n  active_profiles:\n    - sample\n  overrides:\n    legal_hold: true\n    audit_hash_chain: false\n\ntimezone: "UTC"\n', null],
  ['lib-regulatory-regime.test.js:674', 'timezone: "UTC"\n\nregulatory_regime:\n  active_profiles:\n    - hipaa\n', null],
  // A made-up key no CTOC code writes into a regime block: refused by the strict reading
  // (decision 25). Its own test asserts only loadActiveProfiles, which is unchanged.
  ['lib-regulatory-regime.test.js:688', 'regulatory_regime:\n  instituted_at: 2026-07-15T00:00:00Z\n  active_profiles:\n    - hipaa\nenforcement:\n  mode: strict\n', 'block'],
  ['lib-regulatory-regime.test.js:707', 'regulatory_regime:\n  active_profiles:\n    - hipaa\nenforcement:\n  mode: strict\n', null],
  ['regex-redos-bounded.test.js:96, its block body under a header', 'regulatory_regime:\n  active_profiles:\n    - gdpr\n    - ai_act\n  overrides:\n    strictness: high\n', 'overrides'],
  ['regex-redos-bounded.test.js:110, its block body under a header', 'regulatory_regime:\n  active_profiles:\n    - a\n\n    - b\n  overrides:\n    k: v\n\n    k2: v2\n', 'overrides'],
];
```

That is 67 entries: 6 + 4 + 5 + 5 from the templates and 47 single texts. The existing case table
in `'misreadRegime names every settings or profile text the reader would misread, and nothing
else'` (line 412) already runs its own texts and is not copied; each of them keeps its expected
result under this plan (traced: its one override, `legal_hold: true`, is a control in
`KNOWN_CONTROLS`).

Test 13 adds two more module-level items. `parseProfileBefore(content)` is a verbatim copy of
today's profile parser — `parseYAMLShallow` and the three helpers it calls, `stripBom`,
`nextNonEmpty` and `coerce`, from `src/lib/regulatory-regime.js` lines 107–184 as read at Step 8 —
each renamed with the suffix `Before` (`parseProfileBefore`, `stripBomBefore`,
`nextNonEmptyBefore`, `coerceBefore`), so the check compares against the code as it was, not
against a recorded snapshot. `PROFILE_EDGE_TEXTS` lists the profile texts it is compared on beside
the shipped profiles, each built from escapes and `String.fromCharCode`, never a literal control
character:

1. `'k#x\r: v # c\n'` — a `#` before a lone carriage return stays, the one after it starts the
   comment (both parsers read `{ 'k#x': 'v' }`);
2. `'list:\n  - a\rb\n  - c\n'` — a list item holding a lone carriage return is neither a list
   item nor a key;
3. `'k:\r v\n'` — a carriage return and a space between the colon and the value;
4. `': x\n : y\nz : w\n'` — a colon first on the line, a colon after one blank, a blank before a
   colon;
5. `'a:\n  b: 1\nc:\n  - x\na:\n  - y\n'` — a key line that repeats an earlier one decides list or
   map from the line after the earlier copy (listed under "What remains open");
6. `'k: v' + String.fromCharCode(0x2028) + 'w\nm:' + String.fromCharCode(0xa0) + 'n\n'` — a line
   separator inside a value; a no-break space after a colon;
7. `'x:\n  - a\r\r\r\n'` — a list item that keeps a carriage return after the line split and the
   trailing strip;
8. to 13. the profile texts of Step 13's inputs 15–20, each long run cut to 200, so the copied
   parser finishes at once.

| # | `it` title | What it asserts | Today |
|---|---|---|---|
| 1 | `an explicitly empty overrides map is read as no overrides: overrides: {}, overrides: { } and overrides: {}  # none` | For each of the three values, in `regulatory_regime:\n  active_profiles: []\n  overrides: <value>\n`: `misreadRegime` is `null`; `loadActiveProfiles(root).overrides` deep-equals `{}`; `effectiveControls(root).size` is 0. Once more with Windows line endings (`regulatory_regime:\r\n  active_profiles: []\r\n  overrides: {}\r\n`): `misreadRegime` is `null`. | **red** on every `misreadRegime` assertion (`'overrides'`); the `overrides` and control-set assertions are green guards |
| 2 | `CTOC's own settings block — declined, no profiles, overrides: {} — is not a misread, and the repository's own settings file reads the same` | `bareProject(CTOC_REGIME_BLOCK)`: `misreadRegime` is `null`; `loadActiveProfiles` deep-equals `{ profiles: [], overrides: {}, declined: true }`; `unloadableProfiles` is `[]`; `effectiveControls(root).size` is 0. Then the repository's real file, read only: first `const own = fs.readFileSync(path.join(__dirname, '..', '.ctoc', 'settings.yaml'), 'utf8')` and `assert.match(own, /^  overrides: \{\}$/m)`, so the test fails loudly if the file is missing or no longer carries the line; then `regime.misreadRegime(path.join(__dirname, '..'))` is `null`. | **red** on both `misreadRegime` assertions; the file read and its `assert.match` are green |
| 3 | `every other text on the overrides line stays a misread` | For each of `{gdpr: true}`, `{four_eyes_gate3: true}`, `{`, `{}}`, `{} {}`, `{}#none`, `[]`, `none`, `null`, `~` after `  overrides: `, for the line `  overrides:{}`, and for the line `'  overrides: {} #' + ' '.repeat(100000) + '\rx'` (a lone carriage return, not followed by a line feed, then `x`), each in `regulatory_regime:\n  active_profiles: []\n<line>\n`: `misreadRegime` is `'overrides'`. The assertion message names the value; for the long line it is the short label `'a 100,000-space comment ending in a lone carriage return'`, never the line itself. | green guard: must stay green |
| 4 | `a line under overrides: {} is a misread, and so is a tab in the indentation under any overrides header` | Each after `  active_profiles: []\n`, each → `'overrides'`: (a) `  overrides: {}\n    four_eyes_gate3: true\n`; (b) `  overrides: {}\n\tfour_eyes_gate3: true\n`; (c) `  overrides:\n\tfour_eyes_gate3: true\n`. | (a) green guard; (b) green today (today every non-bare header is a misread) and red against the `overridesMisread` this plan first specified, which counted the tab as one column of indentation, stopped, and returned `null`; (c) **red** (`null` today: the guard never checks the line) |
| 5 | `a second overrides key in the regime block is a misread` | (a) `  overrides: {}\n  overrides:\n    four_eyes_gate3: True\n`, (b) the same with `true`, (c) `  overrides:\n    legal_hold: true\n  overrides:\n    four_eyes_gate3: True\n`, each after `  active_profiles: []\n` → `'overrides'`. | (a) and (b) green guards — (a) is the input a fix that looked only at the first header would turn into a silent drop of a sign-off control; (c) **red** (`null` today) |
| 6 | `a block-style overrides map is read as before` | `  active_profiles: []\n  overrides:\n    four_eyes_gate3: true\n    # off for now\n    legal_hold: false\n` → `misreadRegime` `null`; `overrides` deep-equals `{ four_eyes_gate3: true, legal_hold: false }`; `effectiveControls` has `four_eyes_gate3` and not `legal_hold`. | green guard |
| 7 | `an empty overrides map does not stand in for active_profiles: with no profiles key the block is a misread unless declined` | `regulatory_regime:\n  overrides: {}\n` → `'block'`; `regulatory_regime:\n  declined: true\n  overrides: {}\n` → `null`. | **red** on both (`'overrides'` today) |
| 8 | `a key the block reader cannot see — quoted, or with whitespace before its colon — is a misread, and so is a quoted regulatory_regime header; an unrelated quoted key outside the block is not` | Each body through `bareProject`, `misreadRegime` asserted, the body named in the message: (a) `regulatory_regime:\n  active_profiles: []\n  "overrides":\n    four_eyes_gate3: true\n` → `'block'`; (b) `regulatory_regime:\n  active_profiles: []\n  overrides :\n    four_eyes_gate3: true\n` → `'block'`; (c) `regulatory_regime:\n  declined: true\n  'active_profiles': [gdpr]\n` → `'block'`; (d) `regulatory_regime:\n  active_profiles : [gdpr]\n  overrides:\n    legal_hold: false\n` → `'block'`; (e) `regulatory_regime:\n  active_profiles: []\n  overrides:\n    "four_eyes_gate3": true\n` → `'block'`; (f) `"regulatory_regime":\n  active_profiles: [gdpr]\n` and `'regulatory_regime':\n  active_profiles: [gdpr]\n` → `'block'`; (g) `regulatory_regime:\n  active_profiles: []\n"operations":\n  provider: "anthropic"\n` → `'block'`; (h) `regulatory_regime :\n  active_profiles: [gdpr]\n` → `'block'`; (i) `"name": "acme"\nregulatory_regime:\n  active_profiles: []\noperations:\n  "provider": "anthropic"\n` → `null`. | (a)–(g) **red** (`null` today: (a), (b) and (e) lose a sign-off override, (c) and (d) lose the GDPR profile — (c) because the block is declined, (d) because it carries an override; without either, a block whose `active_profiles` key is unseen is already `'block'` today — (f) reads as no regime, (g) reads the swallowed key as regime text); (h) green guard (refused today by lines 422, 425 and 426); (i) green guard |
| 9 | `a line the block reader does not read is a misread: an anchor, a tag, an alias or a complex key in front of a key, a name with another character, a hyphenated top-level key the block swallows, a tab in the indentation, an empty list item, a carriage return inside a line` | Each body through `bareProject`, each → `'block'`, the assertion message naming the case letter only (several bodies hold control characters): (a) `regulatory_regime:\n  active_profiles: []\n  &a overrides:\n    four_eyes_gate3: true\n`; (b) `regulatory_regime:\n  active_profiles: []\n  !!map overrides:\n    four_eyes_gate3: true\n`; (c) `regulatory_regime:\n  active_profiles: []\n  ? overrides\n  : {four_eyes_gate3: true}\n`; (d) `regulatory_regime:\n  active_profiles: []\n  *ref : true\n` and `regulatory_regime:\n  active_profiles: []\n  <<: *base\n`; (e) `'regulatory_regime:\n  active_profiles: []\n  overrides:\n    f' + String.fromCharCode(0x43e) + 'ur_eyes_gate3: true\n'` (the second letter of the control name is the Cyrillic small letter o, U+043E, built this way so the test source holds no literal look-alike character); (f) `regulatory_regime:\n  active_profiles: [pci-dss-v4]\nci-checks:\n  overrides:\n    four_eyes_gate3: false\n`; (g) `regulatory_regime:\n\tactive_profiles: [gdpr]\n`; (h) `regulatory_regime:\n  active_profiles:\n    - gdpr\n    -\n    - do-178c-level-a\n`; (i) `regulatory_regime:\n  active_profiles: []\r  overrides:\n    four_eyes_gate3: true\n` and `regulatory_regime:\n  declined: true\r  overrides:\n    four_eyes_gate3: true\n`. | **red** on every case (`null` today): (a)–(d) and (i) lose the `four_eyes_gate3` override or never see the key; (e) stores the override under a name no check looks up; (f) reads the `ci-checks` block's `overrides` as the regime's own and turns off the sign-off control PCI requires; (g) is read as GDPR today (decision 18, a deliberate change); (h) ends the list at the empty item and drops `do-178c-level-a` |
| 10 | `every regulatory settings text CTOC's own tests write reads as listed` | For each `[source, text, expected]` of `TEST_SUITE_SETTINGS`: `const root = bareProject(null)`, the text written verbatim with `fs.writeFileSync(path.join(root, '.ctoc', 'settings.yaml'), text)`, `got = regime.misreadRegime(root)`; every entry with `got !== expected` is pushed as `{ source, got, expected }`, and `assert.deepEqual(wrong, [])`, so a red run lists every wrong entry at once. Then `assert.equal(TEST_SUITE_SETTINGS.length, 67)`, so the list cannot shrink unseen. | **red** today on exactly 27 entries: the 26 carrying `overrides: {}` (the 20 template entries and the six singles from `compliance-regime-coverage.test.js:242`, `compliance-regime.test.js:45`, `:58` and `:129`, `compliance-mode.test.js:211`, and the `[gdpr]` + `general` text), each with `got: 'overrides'`, and `lib-regulatory-regime.test.js:688` with `got: null` against `'block'` (decision 25); the other 40 are green; the length assertion is green |
| 11 | `the regime block is read strictly: only its three keys, each once, every value consumed whole` | Each body through `bareProject`, `misreadRegime` asserted, the assertion message naming the case letter: (a) `regulatory_regime:\n  active_profiles: []\n  active_profiles: [gdpr]\n` → `'active-profiles'`; (b) `regulatory_regime:\n  active_profiles: []\n  declined: false\n  declined: true\n` → `'block'`; (c) `regulatory_regime:\n  active_profiles: []\n  overide:\n    four_eyes_gate3: true\n` → `'block'`; (d) `regulatory_regime:\n  active_profiles: [gdpr] [hipaa]\n` → `'active-profiles'`; (e) `regulatory_regime:\n  active_profiles:\n    - gdpr hipaa\n` → `'active-profiles'`; (f) `regulatory_regime:\n  declined: yes\n  active_profiles: []\n` → `'block'`; (g) `regulatory_regime:\n  declined: true\n  - gdpr\n` → `'block'`; (h) `regulatory_regime:\n  active_profiles: [gdpr,]\n` → `'active-profiles'`; (i) `regulatory_regime:\n  declined: false  # asked on 2026-10-08\n  active_profiles: [ gdpr , eu-ai-act-high-risk ]  # EU\n` → `null`; (j) `regulatory_regime:\n  active_profiles:\n    - gdpr  # EU\n  - do-178c-level-a\n` → `null`. | (a)–(h) **red** (`null` today: (a) reads no profile, the second key dropped; (b) reads the first `declined`; (c) ignores the misspelt key and with it the sign-off override; (d) reads `gdpr` only; (e) reads `gdpr` only; (f) reads `yes` as not declined; (g) ignores the item; (h) drops the empty entry — a deliberate refusal, decision 26); (i) and (j) green guards |
| 12 | `an override names a control the module's vocabulary or the profile catalog defines, once; a catalog CTOC cannot read is a misread for a name outside the vocabulary` | (a) `bareProject('regulatory_regime:\n  active_profiles: []\n  overrides:\n    four_eyes_gate: true\n')` → `'overrides'`, and `KNOWN_CONTROLS.has('four_eyes_gate')` is false (a misspelling is in neither set). (b) `bareProject('regulatory_regime:\n  active_profiles:\n    - iso-9001\n  overrides:\n    andon_cord_halt: false\n')` (the example in `docs/CONTINUOUS_IMPROVEMENT.md`, lines 368–374) → `null`; `KNOWN_CONTROLS.has('andon_cord_halt')` is true, and for every `name` of `SHIPPED`, `loadProfile(root, name).required_controls` does not include `andon_cord_halt`, so it is accepted from the module's vocabulary, not from the catalog (decision 27). (c) `bareProject('regulatory_regime:\n  active_profiles: []\n  overrides:\n    four_eyes_gate3: true\n    four_eyes_gate3: false\n')`: `loadActiveProfiles(root).overrides` deep-equals `{ four_eyes_gate3: false }` (what the reader does), and `misreadRegime` is `'overrides'`. (d) `makeProject()`, `writeProfile(root, 'acme', 'name: acme\nrequired_controls:\n  - acme_review\n')`, `writeSettings(root, 'regulatory_regime:\n  active_profiles: []\n  overrides:\n    acme_review: true\n')` → `null` (a project's own profile adds to the catalog, read at run time). (e) `makeProject()`, `writeProfile(root, 'notes', 'name: notes\n')`, `writeSettings(root, 'regulatory_regime:\n  active_profiles: []\n  overrides:\n    acme_review: true\n')` → `'overrides'` (a name outside `KNOWN_CONTROLS`, and a catalog that cannot be read); then, in the same project, `writeSettings(root, 'regulatory_regime:\n  active_profiles: []\n  overrides:\n    four_eyes_gate3: true\n')` → `null` (a name in `KNOWN_CONTROLS` needs no catalog read); then `writeSettings(root, 'regulatory_regime:\n  active_profiles: []\n')` → `null`. (f) `makeProject()`, `fs.mkdirSync(path.join(root, '.ctoc', 'regulatory-regimes', 'broken.yaml'))` (a folder where a profile file is listed, so reading it throws), `writeSettings(root, 'regulatory_regime:\n  active_profiles: []\n  overrides:\n    acme_review: true\n')` → `'overrides'`. | The `misreadRegime` assertions of (a) and (c), (f), and the first assertion of (e) **red** (`null` today: (a) stores the override under a name no check looks up, so no sign-off holds; (c) the last value turns the sign-off control off; (e) and (f) the catalog is not read today); (b), (d), the second and third assertions of (e), the `overrides` assertion of (c) and the `KNOWN_CONTROLS` assertion of (a) green guards |
| 13 | `the profile parser reads every shipped profile, and every edge text, exactly as before its patterns were made linear` | (a) `const root = bareProject(null)`; `assert.ok(SHIPPED.length >= 15, 'fixture: the shipped folder was read')`; for each `name` of `SHIPPED`: `assert.deepEqual(loadProfile(root, name), parseProfileBefore(fs.readFileSync(path.join(SHIPPED_DIR, `${name}.yaml`), 'utf8')), name)`. (b) For each of the thirteen `PROFILE_EDGE_TEXTS`: `makeProject()`, `writeProfile(root, 'edge', text)`, and the same `deepEqual` of `loadProfile(root, 'edge')` against `parseProfileBefore(text)`, the message naming the edge number only. | green guard before and after: must stay green. The red evidence for decision 28 is Step 13's timing, not this test |

### `tests/plans-keep-moving-without-the-human.test.js` (MODIFY)

Add the same `CTOC_REGIME_BLOCK` constant (a copy, not a shared module: a shared helper file
would be a new test file). Append **case 59** — the next number after the file's last case, 58,
as read on 2026-10-08 — inside the describe block
`'a real project has no profile folder: the shipped profiles are read (case 54)'`, after its last
`it` (`case 54 — a misspelled profile, no profile folder: …`). It reuses that block's
`writeSettingsText` and `readyPair` and the file's `descriptorOf`, `REGIME_SENTENCES`, `exists`,
`ledger` and `menuScreens`. No profile folder is created, as in a real project.

`it("case 59 — CTOC's own regulatory settings (declined, no profiles, overrides: {}): the screen gives no regime reason, the functional plan moves on, and the built plan finishes on its evidence through the continuation", …)`:

1. `writeSettingsText(root, CTOC_REGIME_BLOCK)`; `const fref = readyPair(root)` (a functional
   plan with a classified empty question file, `functional/c56f.md`, and a built plan with a
   passing check record, `review/c56r.md`).
2. `const text = streamingGate.streamingGateScreen(root).text` — what the owner sees:
   `text.includes(REGIME_SENTENCES['regime-unreadable'])` is false, and `text` does not match
   `/It waits for your approval/`.
3. `const d = descriptorOf(root, 'review/c56r.md')`: `d.regimeHold` is `null`;
   `d.passesValidation` is `true`.
4. The functional plan crossed on sufficiency (its regime hold at functional was `null`):
   `exists(root, 'implementation/c56f.md')` is true, `exists(root, fref)` is false,
   `ledger.readEntry('c56f', root).advanced_by` is `'sufficiency'`.
5. `const cont = menuScreens.continueAfterCrossing(root)`: `exists(root, 'done/c56r.md')` is true;
   `cont.crossed.some((c) => c.ref === 'done/c56r.md' && c.toStage === 'done')`;
   `ledger.readEntry('c56r', root).advanced_by` is `'pipeline'` and the entry has no `approved_by`.

Today: **red** at step 2 — the review plan is listed with the "could not read this project's
regulatory settings" sentence — and, past it, at step 3 (`'regime-unreadable'`), step 4 (the
functional plan stays) and step 5 (the built plan stays in review).

Every existing case in both files stays green unchanged. The parent's case 53 overrides
(`four_eyes_gate3`, `spec_code_reconciliation`, `lessons_learned_closure`) are controls in
`KNOWN_CONTROLS`, also required by the shipped profiles `pci-dss-v4` and `sox-itgc`, so they stay
read.

## Acceptance criteria

- [ ] **Given** a regime block with `active_profiles: []` and `overrides: {}`, `overrides: { }` or
  `overrides: {}  # none` (with Unix or Windows line endings), **when** `misreadRegime` reads it,
  **then** it returns `null` and `loadActiveProfiles` returns `overrides: {}` — test 1.
- [ ] **Given** CTOC's own regime block (declined, `active_profiles: []`, `overrides: {}`, its
  comment lines and the column-0 comment banner before the next key), **when** it is read,
  **then** `misreadRegime` returns `null`, `loadActiveProfiles` returns
  `{ profiles: [], overrides: {}, declined: true }`, the control set is empty; and **given** the
  repository's real `.ctoc/settings.yaml`, which the test first reads and finds carrying the line
  `  overrides: {}`, `misreadRegime` returns `null` — test 2.
- [ ] **Given** any other text on the `overrides` line — a non-empty flow map, an unclosed or
  doubled brace, a comment with no space before `#`, no space after the colon, a list, a scalar,
  `null`, `~`, or `{} #` followed by 100,000 spaces, a lone carriage return and `x` — **when** it
  is read, **then** `misreadRegime` returns `'overrides'` — test 3.
- [ ] **Given** a line indented under `overrides: {}`, a line under either `overrides` header whose
  indentation holds a tab, or a second `overrides` key anywhere in the block, **when** it is read,
  **then** `misreadRegime` returns `'overrides'` — tests 4 and 5.
- [ ] **Given** a block-style overrides map of `true` / `false` lines with a comment line, **when**
  it is read, **then** there is no misread and every override takes effect — test 6.
- [ ] **Given** `overrides: {}` and no `active_profiles` key, **when** it is read, **then** the block
  is still a misread (`'block'`) unless it is declined (`null`) — test 7.
- [ ] **Given** a regime block holding a quoted `overrides` key, `overrides :`, a quoted
  `active_profiles` key with a real profile in a declined block, `active_profiles :` with a real
  profile in a block carrying an override, a quoted control name under `overrides:`, or a quoted
  top-level key directly after the block, **when** it is read, **then** `misreadRegime` returns
  `'block'`; **given** a quoted `regulatory_regime` header (double or single quotes) or one with
  whitespace before its colon, **then** `'block'`; **given** quoted keys only outside the block the
  reader reads, **then** `null` — test 8.
- [ ] **Given** a regime block holding an anchor, a tag, an alias or a complex key in front of a
  key, a control name with a character other than ASCII letters, digits, `_` and `-`, a top-level
  key with a hyphen in its name directly after the block that carries an `overrides` map, a
  tab-indented key, an empty list item, or a carriage return left inside a line, **when** it is
  read, **then** `misreadRegime` returns `'block'` — test 9.
- [ ] **Given** each of the 67 regulatory settings texts CTOC's own tests write, **when** it is
  read, **then** `misreadRegime` returns the result listed beside it: the line check refuses none
  of them, and the strict reading refuses only the made-up `instituted_at` key of
  `lib-regulatory-regime.test.js:688` (decision 25) — test 10.
- [ ] **Given** a second `active_profiles` key holding a real profile, an inline list with text left
  over (`[gdpr] [hipaa]`) or an empty entry (`[gdpr,]`), or a list item holding two words, **when**
  it is read, **then** `misreadRegime` returns `'active-profiles'`; **given** a second `declined`
  key, `declined: yes`, the misspelt key `overide:`, or a list item outside a profile list,
  **then** `'block'`; **given** commented values and spaced list entries in the documented forms,
  **then** `null` — test 11.
- [ ] **Given** an override whose control name is in neither `KNOWN_CONTROLS` nor the catalog
  (`four_eyes_gate`), a control named twice, or an override of a name outside `KNOWN_CONTROLS`
  (`acme_review`) in a project whose own profile folder holds a profile with no list of required
  controls or an entry that cannot be read, **when** it is read, **then** `misreadRegime` returns
  `'overrides'`; **given** `andon_cord_halt: false` under `iso-9001` (the
  `docs/CONTINUOUS_IMPROVEMENT.md` example: a control in `KNOWN_CONTROLS` that no profile
  requires), an override of a control the project's own profile requires, `four_eyes_gate3`
  beside the profile with no list, or that project with no override, **then** `null` — test 12.
- [ ] **Given** every shipped profile in `.ctoc/regulatory-regimes/`, the seven edge texts and
  Step 13's six profile texts cut to 200, **when** `loadProfile` reads each, **then** the result
  deep-equals what a verbatim copy of today's `parseYAMLShallow` returns — test 13.
- [ ] **Given** a temporary project with CTOC's regime block, a functional plan with enough
  information and a built plan with a passing check record, **when** the owner opens the menu,
  **then** the screen gives no regime reason, the built plan's descriptor carries
  `regimeHold: null`, and the functional plan moves into implementation on sufficiency; **when**
  the continuation's crossing pass runs, **then** the built plan finishes in `done/` on its
  evidence (`advanced_by: 'pipeline'`, no `approved_by`) — case 59.
- [ ] `misreadRegime` returns on each of Step 13's twenty inputs (fourteen long-line or long-block
  settings files, six long profile files read through the catalog) in under 100 milliseconds,
  with the expected result — Step 13.
- [ ] `src/lib/streaming-gate.js`, `parseRegimeBlock`, `loadActiveProfiles`, `loadProfile`,
  `listAvailableProfiles`, the contents of `KNOWN_CONTROLS` and every export are unchanged;
  `npm test` shows fail 0, skipped 0 and coverage at or above `.ctoc/coverage-baseline.json`
  `minPct`; `src/lib/regulatory-regime.js` keeps 100 % line coverage; `eslint --max-warnings 0`
  passes on it, `security/detect-unsafe-regex` included — Step 14.

## Risks

| Risk | Mitigation |
|---|---|
| This changes what holds plans at two crossings — gate-related logic, which changes only on the owner's explicit approval | The owner approved the fix on 2026-10-08, the tightenings found in review by session decisions the same day (decisions 10, 11, 15 and 19), and the two amendments of decisions 27 and 28 by session decisions the same day. Step 9 confirms this plan's approval record is the owner's own and matches the specification; if it crossed any other way, stop and report. The plan carries no question file, so it reads `not-computed` and cannot cross into the build queue on sufficiency |
| A pattern that is too broad accepts a non-empty map, and its overrides are dropped silently — a sign-off control such as `four_eyes_gate3` would then never hold a built plan | The pattern is anchored at both ends and allows only spaces or tabs inside the braces. Test 3 holds twelve other forms as misreads, among them `{four_eyes_gate3: true}`; Step 11's critic and Step 13's scanner each try to find an input that reads `null` but changes or drops an override |
| Accepting `overrides: {}` opens a new silent drop: `overrides: {}` followed by a second, bare `overrides:` block whose values the reader would take or drop, or by a tab-indented line the guard would take for a dedent | A second `overrides` key is a misread (test 5); a tab in the indentation under either header is a misread (test 4) |
| The line check refuses settings text the reader reads correctly, holding plans that should move | `READ_LINE` is derived from what the reader reads (decision 15): indented keys — `active_profiles` with an inline list and a comment after it, `declined: true`, a bare `overrides:` header, `overrides: {}`, `<control>: true` / `false` entries — indented list items with a value, blank lines, and whole-line comments at any indentation, CTOC's column-0 comment banner included. Test 10 runs all 67 regime settings texts CTOC's own tests write through it, and test 2 CTOC's real settings file; the line check refuses none. The forms the reader reads that the check now refuses are listed in decision 18, each deliberate |
| The line check misses a form the reader cannot read | It is an allowlist, so a form nobody listed is refused, not passed. What it cannot see by construction — a name in allowed characters that the reader does not know, a second key of the same name, text after a value the reader takes — the strict reading refuses (decision 19, tests 11 and 12) |
| The strict reading refuses a form a project writes today, holding its plans | Intended: each form is lost, taken in part, or read differently from YAML today with nothing holding the plan. Decisions 25 and 26 list every form the reader reads today that is now refused; CTOC's own code writes none of them, and CTOC's own settings file reads clean (test 2). The four controls no profile requires stay settable by an override (decision 27). The screen gives the existing "could not read this project's regulatory settings" sentence |
| Reading the profile catalog costs file reads on every call | It is read only when an override names a control outside `KNOWN_CONTROLS` (decision 27), so CTOC's own settings, every project with `overrides: {}` and every override of a known control never read it; when read, it is the 15 shipped profiles and the project's own, each a few hundred bytes, as `effectiveControls` already reads the active ones, and each parsed in linear time (decision 28) |
| The tightenings hold plans in a project whose settings use one of these forms today | Intended: in each such project a profile or override is lost, or read differently from YAML, today with nothing holding the plan. The screen gives the existing "could not read this project's regulatory settings" sentence |
| Once this ships and a project updates, its plans start moving on their evidence again: CTOC's own functional plans with enough information cross into implementation, and built plans finish on the continuation's pass. The five local projects change only after they update CTOC from the marketplace | This is the behaviour v6.14.119 introduced and v6.14.121 switched off by accident. Stated here so the owner expects plans to move |
| Test 2 reads the repository's real `.ctoc/settings.yaml` | Read only. It first asserts the file reads and carries `  overrides: {}`, so it cannot pass on a missing file; it asserts the exact file the bug was found in and fails only if CTOC's own settings are misread again |
| Test 10's list goes stale when a test file changes its settings text | The list is a copy taken on 2026-10-08 with each source named; a changed fixture does not break it, it only stops being covered. Its length is asserted, so an entry cannot disappear unseen |
| The profile parser's rewrite changes what a profile parses to — the controls an active profile requires, its retention windows, the catalog's control names | Each replacement is derived to return what the code it replaces returned on every input, not only on the shipped profiles (decision 28's table). Test 13 compares `loadProfile` on every shipped profile, seven edge texts and Step 13's six profile texts cut short against a verbatim copy of today's parser; the existing profile tests stay green unchanged |
| A pattern fails the lint rule `security/detect-unsafe-regex` (an error for `src/`) at Step 14 | The installed `safe-regex` 2.1.1 counts every repetition, `?` included, and calls a quantified group holding a quantifier unsafe. Every pattern this plan adds or changes has star height one: `READ_LINE` is five flat alternatives (decision 23), the trailing comment alternatives carry no quantifier on their group, a list of names is split on commas in code and each entry matched by `LIST_ENTRY`, and the profile parser's two new patterns, `/^[ \t]*-/` and `/[\n\r\u2028\u2029]/`, are flat. The rule passed the profile parser's quadratic patterns too, so a clean lint is no evidence of linear time; Step 13's timings are |
| Catastrophic regex backtracking on a long line or a long block in the regime | The pattern this plan first specified was not linear: `#.*` and the trailing `[ \t]*` both match spaces, so on `  overrides: {} #` + 100,000 spaces + a lone carriage return + `x` (`.` stops at the carriage return, so `$` fails) a failed match tried every split of the spaces between them, about n²/2 ≈ 5 × 10⁹ steps (the reviewer's finding). The comment and the trailing blanks are now separate alternatives, `(?:[ \t]+#.*\|[ \t]*)$`, which accept the same lines. Two existing patterns in `misreadRegime` were quadratic and are replaced (decision 24): the multiline key search, which restarted at every blank line, and the unanchored comment strip `\s+#.*$`, which restarted at every position in a run of whitespace. In every pattern this plan adds or changes — `EMPTY_OVERRIDES_LINE`, `READ_LINE`, `EMPTY_LIST_VALUE`, `KEY_LINE`, `BLANK`, `INLINE_LIST`, `LIST_ENTRY`, `PROFILE_ITEM`, `BOOLEAN_VALUE`, the header pattern, the per-line key search and the indentation pattern `/^ *[^\S ]/` — every quantifier is followed by a token it cannot match or by the end anchor, no quantifier sits on a group, and each is anchored at the start of a single line, so a failing match gives back each character once: linear. In `READ_LINE` the leading blanks of the key and list-item alternatives are followed by a letter, `_` or `-`, which no blank matches; the name class excludes the colon after it; the blanks after the dash are followed by `\S`; and each `.*` tail is entered at one position only, so its single give-back pass is the only other work. In `INLINE_LIST` the list content `[^\]]*` is followed by `]`, which it cannot match. The profile parser's four non-linear patterns are replaced by string searches and two flat patterns (decision 28). Test 3 carries one long line; Step 13 times twenty inputs against a 100-millisecond bound |

## Decisions Taken Under Ambiguity

1. **The empty form is exactly `overrides:`, at least one space or tab, `{`, spaces or tabs, `}`,
   then optionally at least one space or tab and a `# comment`, then trailing spaces or tabs.**
   `overrides:{}` (no space after the colon) and `{}#none` (no space before `#`) stay misreads:
   YAML itself does not read either as an empty map with a comment. `overrides: []`, `null` and
   `~` would also mean "no overrides" to a full YAML reader but stay misreads, because the owner
   said anything else on that line stays a misread (test 3 holds all three).
2. **A second `overrides` key in the block is a misread.** Without it the fix would loosen one
   input: `overrides: {}` followed by a bare `overrides:` block with `four_eyes_gate3: True` would
   read as no misread while the value is dropped, so a sign-off control would stop holding the
   plan. The simplest rule that closes this — any second `overrides` key — also turns two bare
   `overrides:` blocks, which today are read with the second dropped silently, into a misread.
   That is a tightening, not a loosening, and the same rule the reader already applies to a second
   `regulatory_regime` block. Decision 19 extends it to `active_profiles` and `declined`.
3. **Anything indented under `overrides: {}` is a misread.** It is not valid YAML, and the reader
   drops it.
4. **`parseRegimeBlock` is not changed.** It already returns `{}` for overrides on the empty form
   (traced above); test 1 pins it.
5. **No change in `src/lib/streaming-gate.js`.** Every caller that holds a plan routes through
   `misreadRegime`; fixing the reader fixes both crossings and the `plan <ref>` screen.
6. **The settings files are not edited.** Removing `overrides: {}` from CTOC's own settings would
   hide the bug in one project and leave the five others and every future hand-written
   `overrides: {}` held.
7. **The reason for `regulatory_regime:\n  overrides: {}` with no `active_profiles` key changes
   from `'overrides'` to `'block'`.** It still holds (test 7): an empty overrides map does not
   stand in for a profile list, as an empty block-style map already does not.
8. **Three files instead of two.** The parsing cases sit beside the existing misread cases in
   `tests/lib-regulatory-regime.test.js`; the end-to-end proof needs the continuation's crossing
   pass and its fixtures, which live only in `tests/plans-keep-moving-without-the-human.test.js`.
   Copying those fixtures into the other file would be about forty lines of duplication. The
   review rounds' new cases need no new file: they are parsing cases and go into tests 3, 4, 8, 9,
   10, 11 and 12. The catalog read needs no new file either: it is two existing functions in the
   same module (decision 21). Nor does the profile parser's rewrite: test 13 sits beside the
   other profile tests (decision 28).
9. **`docs/ENFORCEMENT.md` is not changed.** Its list of what makes a regime unreadable never named
   the overrides line, and its sentence "A project with no regime is unchanged" becomes true again
   with this fix. The strict reading adds reasons a regime is unreadable; the page's wording, "a
   regulatory block or `active_profiles` line it cannot parse", already covers them. No CHANGELOG
   edit: the release step writes it. The two documentation pages with an override example are not
   changed either (decision 27).
10. **A tab, or any whitespace but a space, in the indentation of a line under an `overrides`
    header is a misread.** Session decision, 2026-10-08: this tightening is included. YAML forbids
    tabs in indentation, and `overridesMisread` counts indentation in characters, so a tab is one
    column and the loop stops before checking the line. Under `overrides: {}` the code this plan
    first specified would have read `\tfour_eyes_gate3: true` as no misread with the line dropped;
    under a bare `overrides:` header today the line is never checked (`true` happens to be read by
    `parseRegimeBlock`, `True` would be dropped silently). The check sits after the blank-and-comment
    skip, so a tab-indented blank or comment line stays harmless, and before the stop-on-dedent
    check, as the reviewer specified.
11. **A key the block reader cannot see is a misread.** Session decision, 2026-10-08, for this
    reason: the owner's standing rule that vulnerabilities of any severity are fixed now, and that
    the regime read fails closed. Today `"overrides":`, `overrides :`, `'active_profiles':`,
    `active_profiles :` and a quoted control name are invisible to `parseRegimeBlock` and to
    `overridesMisread`, so a real profile or override written that way is dropped with nothing
    holding the plan. First specified as a list of refused forms (`UNSEEN_KEY`: a line starting
    with a quote, or a first word followed by whitespace and a colon); replaced the same day by the
    allowlist of decision 15, which refuses every one of these forms and every form that list
    missed.
12. **The quoted header.** `regulatory_regime :` is already refused today (lines 422, 425 and 426,
    quoted under the technical approach); test 8(h) pins it. A quoted header is not: today it reads
    as no regime. The header pattern on line 422 becomes `/^["']?regulatory_regime["']?[ \t]*:/gm`.
    It names the key itself, so an unrelated quoted top-level key never matches; a quoted header
    alone then counts as a header that line 425 cannot take (`'block'`), and a quoted header beside
    a bare one counts as a second block (`'block'`). An unbalanced quote (`"regulatory_regime:`) is
    also caught: it is no valid YAML, and failing closed on it costs nothing.
13. **One kind, `'block'`, for every line the reader does not read and for the header.** `'block'`
    already names text the block reader cannot take (a header it cannot take, a block with no
    `active_profiles` key, a second block). A key the reader cannot see is the same failure: the
    reader never reaches the key, so no overrides value or profile list was misread. Every kind
    holds the plan the same way (`regimeHold` returns `'regime-unreadable'` for all), so the kind
    is a diagnostic only. The line check runs after the `overrides` and `active_profiles` checks
    (decision 16), so a text those already name keeps its kind. The return type gains no kind.
14. **Any line at column 0 in the block body, other than a blank line or a whole-line comment, is a
    misread.** The reader's block runs on to the next top-level key it recognises (`^[a-zA-Z_]+:`
    on line 425), so it reads every line up to there, and everything indented under it, as regime
    text — an `overrides:` there would be applied as the regime's own. First written for a quoted
    or spaced top-level key directly after the block; the allowlist keeps that and widens it,
    because a key or a list item must be indented by at least one space: a top-level key whose name
    holds a digit or a hyphen (`ci-checks:`, `stage2:`), which the delimiter does not stop at
    either, a column-0 list item and a document marker (`---`) are now misreads too. Test 9(f)
    shows the stake: a swallowed `ci-checks:` block's `overrides` turns off the sign-off control
    the PCI profile requires. A quoted key the reader does not read — before the block, or under a
    recognised top-level key after it — is not a misread (test 8(i)). Flagged for the owner: the
    narrower rule, indented lines only, would let that swallowed text pass.
15. **The block's lines are an allowlist, and the anchor, tag and complex-key gap is closed in this
    plan.** Session decision, 2026-10-08, for this reason: the owner's standing rule that
    vulnerabilities of any severity are fixed now. The list of refused forms missed an anchor, a
    tag, an alias or a complex key in front of a regime key (`&a overrides:`, `!!map overrides:`,
    `*ref : true`, `? overrides`), each invisible to the reader, and would miss any form nobody
    thought to list. `READ_LINE` instead names the line shapes the reader reads, derived from its
    patterns: `parseRegimeBlock` finds `active_profiles`, `overrides` and `declined` as indented
    `name:` lines (`^\s+active_profiles:`, `^\s+overrides:[ \t]*$`, `^\s+declined:`), override
    entries as indented `name: value` lines, profile items as indented `- value` lines
    (`^\s+-\s+(\S+)`), and skips blank lines and lines whose first non-blank is `#`;
    `overridesMisread` reads the same header, `overrides: {}` and `name: true|false` lines;
    `misreadRegime` reads the `active_profiles` value with a comment after it. The allowlist: a
    blank line or a whole-line comment; one or more spaces, a name of ASCII letters, digits, `_`
    and `-` that starts with a letter or `_`, a colon, then the end of the line or a space or tab
    and the rest; one or more spaces, `-`, spaces or tabs, then a non-blank character and the rest.
    Every form the reader reads is in it except those listed in decision 18. Two choices inside
    the owner's wording: a tab is accepted after a list item's dash as well as a space, because the
    reader reads `-\tgdpr` as `gdpr` and refusing it would refuse a form the reader understands; a
    list item needs a non-blank character after the blanks, because an empty item ends the
    reader's list silently (test 9(h)). The line check judges a name's characters only; whether
    the name is one the reader knows is judged by the strict reading (decision 19).
16. **Where the line check runs.** After `overridesMisread` and after the `active_profiles`
    checks, before the profile loop — not straight after the block match, where the list of
    refused forms sat. So every kind the existing tests and test 4 assert is kept: a split
    `active_profiles` flow list (its second line is no key) stays `'active-profiles'`
    (`tests/lib-regulatory-regime.test.js:426`; `tests/menu-coverage.test.js:870` in test 10), and
    a tab under an `overrides` header stays `'overrides'` (test 4). For this, the `!key` branch no
    longer returns `null`: a declined block, or one carrying an override, falls through to the line
    check, and the profile loop after it is empty there (`parseRegimeBlock` fills `profiles` only
    from a line the key pattern also finds).
17. **A line still holding a carriage return, a line separator or a paragraph separator is a
    misread.** Found while deriving the allowlist on 2026-10-08 and closed under the same session
    decision, being a line the reader cannot read: the block is split only on `\r?\n`, so in
    `  active_profiles: []\r  overrides:` the per-line patterns of `parseRegimeBlock` see one line
    and find neither key, while the multiline key pattern `misreadRegime` used (where `^` and `$`
    match at a carriage return) found `active_profiles: []` — and YAML reads two lines. The
    `overrides` map under it is dropped and nothing holds (test 9(i)). Decision 24 replaces that
    multiline search with the reader's own per-line pattern, so the two now agree; the line check
    still refuses the line. No alternative of `READ_LINE` can consume these three characters —
    `.` stops at them, and `\S`, the name class, `[ \t]` and the space exclude them — so such a
    line matches no shape. Blank lines therefore hold only spaces and tabs; the reader's `trim()`
    took other whitespace for blank too, and no settings text in CTOC's tests has any.
18. **Forms the reader reads today that the line check refuses, each deliberate.** (a) A tab or
    other non-space whitespace in the indentation of a key or list-item line anywhere in the block
    (`\tactive_profiles: [gdpr]` is read as GDPR today; test 9(g)): YAML forbids tabs in
    indentation, decision 10 already refuses them under `overrides`, and the reader counts a tab as
    one column; under an `overrides` header the kind stays `'overrides'` (decision 16). (b) A line
    with a carriage return inside it (decision 17). (c) A blank line holding whitespace other than
    spaces and tabs. Forms the reader ignores that are now refused: a continuation line of a
    multi-line plain scalar or flow collection, an empty list item, and any column-0 line other than
    a comment (decision 14). The line check refuses no settings text CTOC's own tests write, and
    no check refuses CTOC's own settings file (tests 10 and 2); the strict reading refuses one
    test fixture, by decision 25.
19. **The block is read strictly, not one form at a time.** Session decision, 2026-10-08, for this
    reason: the owner's standing rule that vulnerabilities of any severity are fixed now, and that
    the guard must never take a misread for "no regime". The three items this plan listed as still
    open — a second `active_profiles` or `declined` key, a name the reader does not know, and text
    after a value the reader takes — are closed by `strictMisread`, which runs last in
    `misreadRegime`, after the existing checks, the `READ_LINE` allowlist and the profile loop, so
    every text an earlier check names keeps its kind. Its rules: outside the overrides map, only
    the keys `active_profiles`, `declined` and `overrides`, a misspelling such as `overide:`
    included; each key at most once (decision 2's rule, generalised); every value consumed whole —
    an inline profile list exactly `[` names separated by commas `]`, a block list item exactly
    one profile name, `declined:` exactly `true` or `false`, each with an optional `# comment`
    after a space or tab, and anything left over a misread (`[gdpr] [hipaa]`, `- gdpr hipaa`); a
    list item only inside an `active_profiles:` block list; under `overrides`, each control name
    one the module's vocabulary or the profile catalog defines (decisions 21 and 27) and named
    once (decision 22), each value exactly `true` or `false` (already `overridesMisread`'s rule).
    A profile name in a list uses `PROFILE_NAME_RE`'s character set, so a name the profile loop
    accepted is never refused for its characters here.
20. **The kind of each strict rule.** `'block'`, unless an existing kind fits better. Every kind
    holds the plan identically; the kind is a diagnostic only, and the return type gains none.

    | Rule | Kind | Why |
    |---|---|---|
    | a key other than `active_profiles`, `declined` and `overrides` outside the overrides map | `'block'` | the block holds text the reader does not read, as for an unseen key (decision 13) |
    | a second `active_profiles` key | `'active-profiles'` | the existing kind for an `active_profiles` value the reader misreads; the second key's profiles are dropped |
    | a second `declined` key | `'block'` | no kind names `declined` |
    | a second `overrides` key | `'overrides'` | unchanged: `overridesMisread` names it first (decision 2) |
    | an inline profile list that is not exactly `[` names separated by commas `]` | `'active-profiles'` | as for a second `active_profiles` |
    | a block list item that is not exactly one profile name | `'active-profiles'` | as for a second `active_profiles` |
    | a list item outside an `active_profiles:` block list | `'block'` | the reader ignores the line |
    | a `declined:` value other than exactly `true` or `false` | `'block'` | no kind names `declined` |
    | an override whose control name neither `KNOWN_CONTROLS` nor the catalog defines | `'overrides'` | the existing kind for an override the reader would misapply |
    | a control named twice under `overrides` | `'overrides'` | as above |
    | an override of a name outside `KNOWN_CONTROLS` while the catalog cannot be read | `'overrides'` | the override's name cannot be checked |

21. **The catalog of control names: the existing loader, read at run time, only when needed.**
    The existing `listAvailableProfiles(projectRoot)` lists every profile in the project's own
    `.ctoc/regulatory-regimes/` and in the folder shipped with the plugin, each name once, and the
    existing `loadProfile(projectRoot, name)` reads each, a project's own copy winning. The
    smallest addition is the internal `catalogControls(projectRoot)`, which unions their
    `required_controls`; no new file, no new export, `files:` unchanged. It is read only when an
    override names a control outside `KNOWN_CONTROLS` (decision 27), so CTOC's own settings and
    every override of a known control never read it. "Cannot be read" means: a folder or a
    profile file whose read throws (caught, test 12(f)), a listed profile that `loadProfile`
    refuses — a file name that is not a valid profile name, such as `My_Rules.yaml` — or a listed
    profile with no parsed list of required controls (test 12(e)); each is `'overrides'`, never
    skipped, because a profile the reader cannot read leaves the set of known names uncertain.
    The module's vocabulary has 40 control names and the 15 shipped profiles require 36 of them.
    This decision first took the known set as the catalog's alone, by the session wording, which
    refused the four controls no profile requires — `privilege_posture`, `andon_cord_halt`,
    `critical_control_points` and `proportionality_test`; decision 27 replaced that the same day
    with the catalog together with `KNOWN_CONTROLS`. A project's own profile adds its control
    names to the catalog (test 12(d)).
22. **A control named twice under `overrides` is a misread (`'overrides'`).** Found while writing
    the strict reading and closed under decision 19's session decision, being the same failure as
    a second key: the reader keeps the last value silently, so `four_eyes_gate3: true` followed by
    `four_eyes_gate3: false` turns the sign-off control off with nothing holding (test 12(c)).
23. **Every pattern has star height one.** Found in this pass: `eslint.config.js` sets
    `security/detect-unsafe-regex` to error for `src/`, and the installed `safe-regex` 2.1.1 counts
    every repetition, `?` included, so a quantified group holding a quantifier is reported unsafe.
    The `READ_LINE` this plan specified had two such groups, `(?:#.*)?` and `(?:[ \t].*)?`, and
    would have failed Step 14's lint. It is rewritten as five flat alternatives that accept exactly
    the same lines. A list of names separated by commas cannot be one flat pattern, so the inline
    list is matched by `INLINE_LIST` and each comma-separated entry by `LIST_ENTRY`.
24. **Two whole-block patterns in `misreadRegime` were not linear, and are replaced.** Found in
    this pass and closed under the owner's linear-time rule. (a) The `active_profiles` key search
    ran with the multiline flag over the whole block body, and `^\s+` crosses line feeds, so each
    of n blank lines restarted a scan of every blank line after it — about n²/2 steps (Step 13,
    input 13). It becomes a per-line search with the same pattern `parseRegimeBlock` uses per
    line, over the lines `misreadRegime` already splits, so the reader and the check find the key
    on the same line. (b) The comment strip `key[1].replace(/\s+#.*$/, '')` is unanchored, so in a
    run of whitespace with no `#` after it every start position rescanned the run — about n²/2
    steps (Step 13, input 14), and it ran on every block with an `active_profiles` key. It becomes
    the anchored `EMPTY_LIST_VALUE`, run only when no profile was read, which accepts the same
    values except a no-break space or other non-ASCII blank inside or beside the brackets; the
    strict reading refuses those anyway, so only the source of the kind changes, not the result.
25. **One test fixture is now refused, deliberately.** `tests/lib-regulatory-regime.test.js:688`
    writes `  instituted_at: 2026-07-15T00:00:00Z` into the regime block to prove an uppercase `Z`
    does not end the block early. No CTOC code writes that key into a regime block —
    `src/lib/legal-hold.js` writes `instituted_at` into its own hold files under
    `.ctoc/legal-hold/` — so it is a made-up key, and the strict reading refuses it (`'block'`).
    Its own test asserts only `loadActiveProfiles`, which is unchanged, so it stays green; test
    10's expected result for it is `'block'`. The rule is not adjusted: the fixture is not a form a
    project writes.
26. **Forms the reader reads today that the strict reading refuses, each deliberate.** An inline
    list with an empty entry (`[gdpr,]`, `[ , ]`; YAML would read `[gdpr,]` as `gdpr` too); a
    no-break space or other non-ASCII blank in or beside a list entry, or as the whole value of
    `active_profiles:`; `declined: True`, `yes`, `on`, a quoted value or no value; a control name
    written at block level after the overrides map, which the reader's overrides loop (it does not
    track indentation) applies as an override; a list item outside a profile list; and, when the
    settings carry an override of a control outside `KNOWN_CONTROLS`, a profile in the project's
    own folder that `loadProfile` refuses or that has no list of required controls. CTOC's code
    writes none of these, and none appears in CTOC's own settings or tests apart from decision
    25's fixture.
27. **A control name under `overrides` is accepted when the profile catalog or the module's own
    `KNOWN_CONTROLS` list defines it.** Session decision, 2026-10-08, for this reason: the four
    controls no profile requires — `privilege_posture`, `andon_cord_halt`,
    `critical_control_points` and `proportionality_test` — are documented as settable by an
    override in `docs/CONTINUOUS_IMPROVEMENT.md` lines 368–374, so a catalog-only rule would hold
    plans for a documented, harmless setting and protect nothing. A misspelling stays refused:
    `four_eyes_gate` is in neither set (test 12(a)); the documentation's own example,
    `andon_cord_halt: false` under `iso-9001`, reads clean (test 12(b)). One choice inside the
    owner's wording, for the same reason: a name in `KNOWN_CONTROLS` is accepted without reading
    the catalog, so an unreadable catalog holds only an override of a name outside
    `KNOWN_CONTROLS`, the only case in which the catalog decides; tests 12(e) and 12(f) use
    `acme_review` for that hold, and 12(e) shows `four_eyes_gate3` read beside a profile with no
    list. The existing guard test pins the shipped profiles to names in `KNOWN_CONTROLS`, so the
    catalog now decides only for names a project's own profiles add. `docs/REGULATORY_OPS.md`'s
    example (lines 194–201) stays refused, and only because of the comment after its override
    value, `proportionality_test: true       # opt in even without a profile that requires it`:
    `overridesMisread` holds an override value to exactly `true` or `false` with nothing after it,
    the rule of today. Traced without that comment, the example reads clean — its two profile
    items carry comments, which the strict reading allows, and `proportionality_test` is in
    `KNOWN_CONTROLS`. Neither documentation page is in `files:` and neither is changed.
28. **The profile parser's quadratic patterns are made linear in this plan, and it returns the
    same result on every input.** Session decision, 2026-10-08, for this reason: the same file and
    the same kind of flaw, and the catalog read runs the parser on profiles that are not active
    too. Each pattern was traced by reading, not run; Step 13 times each after the change (inputs
    15–20).

    | Pattern (line) | Not linear on | Linear replacement | Why the result is the same |
    |---|---|---|---|
    | the comment strip `replace(/#.*$/, '')` (line 115, and line 171 in `nextNonEmpty`) | a run of `#` before a lone carriage return: from every `#`, `.*` runs to the carriage return, `$` fails, and it gives back — about n²/2 steps (input 15) | `stripComment(line)`: the last carriage return, line separator or paragraph separator by `lastIndexOf`, then the first `#` after it by `indexOf`, and the line cut there | `.` stops at those three characters, a line feed never survives the split, and `$` is the end of the line, so the pattern matched from the first `#` with none of them after it, and `replace` cut from there |
    | the list item `^[ \t]*-\s*(.*)$` (line 131) | a dash, a long run of blanks, a character, then a lone carriage return: `\s*` and `.*` both take blanks, and each blank `\s*` gives back is rescanned by `.*` (input 16) | `/^[ \t]*-/`, then `tailValue(stripped, dash length)` | `tailValue` returns null exactly where `\s*(.*)$` failed — when the text after the leading whitespace still holds a line terminator — and otherwise that text trimmed, which is the capture trimmed: `\s` and `trimStart` remove the same characters. A dash line it refuses still falls through to the key check, as before |
    | the key and value `^[ \t]*([^:]+):\s*(.*)$` (line 144) | a long run of blanks with no colon after it: the leading `[ \t]*` and the key class both take blanks (input 17); and a colon, a long run of blanks, a character, then a lone carriage return, as for the list item (input 18) | `indexOf(':')`; a key only when that first colon is not the first character, then `tailValue(stripped, colon + 1)`; the key is the text before the colon, trimmed | the key class cannot cross a colon, so the pattern matched at the first colon or not at all; it needed one character before the colon, any character, because the leading blanks may match nothing; the key capture, trimmed, is the text before the colon, trimmed |
    | the look-up of the line after a key with an empty value, `nextNonEmpty(lines, lines.indexOf(raw))` (lines 150 and 169–175) | many key lines with an empty value: each `indexOf` scans every line before it (input 19); and one key line repeated after a long run of blank lines: each repeat finds the first copy, and `nextNonEmpty` rescans the run (input 20) | before the loop, a map from each line's text to its first index, and an array holding for each index the next line that is not blank once its comment is stripped (one pass from the end); `nextNonEmpty` is deleted | the same two values, computed once: `indexOf` returned the first index of an equal line, and `nextNonEmpty` the next non-blank line after it. The loop's own index would be the correct look-up, but it changes the result for a key line that repeats an earlier one (test 13, edge text 5); that changes what a profile parses to, not how fast, and is listed under "What remains open" |

    The existing profile tests — the `loadProfile` describe block, `parseYAMLShallow block lists`,
    the Windows-line-ending and byte-order-mark cases, the guard `every shipped profile still
    loads a non-empty list of known controls`, and the case in
    `tests/remainder-security-tooling-coverage.test.js` for a profile whose last line is an
    empty-valued key — stay green unchanged. Test 13 is the before-and-after check: every
    `.ctoc/regulatory-regimes/*.yaml`, seven edge texts and Step 13's six profile texts cut short,
    read through `loadProfile`, deep-equal a verbatim copy of today's parser. The header comment
    of `tests/remainder-security-tooling-coverage.test.js` names `nextNonEmpty`'s line 155; it
    goes stale, its test stays green, and the file is not in `files:`.

## What remains open

Stated so nothing is hidden; whether and when to act on each is the owner's call. Each was traced
by reading the code and the files on 2026-10-08, not run.

- **`docs/REGULATORY_OPS.md`'s override example stays refused** (lines 194–201), only because of
  the comment after its value (`proportionality_test: true       # opt in even without a profile
  that requires it`): an override value must be exactly `true` or `false`, the rule of today. The
  control name itself is accepted (decision 27). This plan's files do not include the page.
- **A misspelt control inside a project's own profile file is accepted as written.** A known gap,
  recorded by the owner's session decision of 2026-10-08 and not fixed here: it belongs to the
  profile loader's own validation and will be planned separately. The catalog then defines the
  misspelling, an override of it passes, and when the profile is active the control the author
  meant is not required. Nothing checks a profile's control names today except the existing
  guard test, which pins the shipped profiles to `KNOWN_CONTROLS`.
- **A profile key line that repeats an earlier line exactly decides list or map from the line
  after the earlier copy** (test 13, edge text 5, pins today's result). Kept by decision 28 so the
  parser's results do not change; looking ahead from the loop's own index is the fix.
- **YAML errors the reader reads as evidently meant are not refused**: a key indented deeper or
  shallower than its siblings, or a key straight after a block list at the list's indentation.
  As traced, none of them loses or changes a profile or an override.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [ ] Add `CTOC_REGIME_BLOCK`, `TEST_SUITE_SETTINGS` (with `ALL_LISTS`, the three templates and `INIT_ACTIVE_LINE`), `parseProfileBefore` (with its three copied helpers, copied verbatim from the file as it stands now), `PROFILE_EDGE_TEXTS` and tests 1–13 to `tests/lib-regulatory-regime.test.js`, and the constant and case 59 to `tests/plans-keep-moving-without-the-human.test.js`, exactly as specified. The carriage return and the tab stay the escapes `\r` and `\t`; the byte-order mark, the Cyrillic letter, the no-break space and the line separator are built with `String.fromCharCode` (0xfeff, 0x43e, 0xa0 and 0x2028); none is ever a literal character in the source.
- [ ] Run `node --test tests/lib-regulatory-regime.test.js` and `node --test --test-name-pattern="case 59" tests/plans-keep-moving-without-the-human.test.js` before any code change. Record in the plan, per test: red for the named reason — tests 1, 2 and 7 (`'overrides'`); 4(c), 5(c), 8(a)–8(g), 9(a)–9(i), 11(a)–11(h), the `misreadRegime` assertions of 12(a) and 12(c), 12(f) and the first assertion of 12(e) (`null`); case 59 (the plan held as unreadable); test 10 with exactly 27 entries listed, the 26 `overrides: {}` entries each `got: 'overrides'` and `lib-regulatory-regime.test.js:688` with `got: null` against `'block'`. Green: tests 3, 4(a), 4(b), 5(a), 5(b), 6, 8(h), 8(i), 11(i), 11(j), 12(b), 12(d), 13, the second and third assertions of 12(e), the `overrides` assertion of 12(c), the `KNOWN_CONTROLS` assertion of 12(a), and every existing test in both files.

### Step 9: PREPARE
- [ ] Confirm `.ctoc/approvals/an-empty-overrides-list-no-longer-holds-every-plan.json` is the owner's own approval and matches this plan's specification; if not, stop and report.
- [ ] Re-read `KNOWN_CONTROLS`, `parseYAMLShallow`, `nextNonEmpty`, `coerce`, `overridesMisread`, `misreadRegime`, `parseRegimeBlock`, `loadActiveProfiles`, `loadProfile` and `listAvailableProfiles` in `src/lib/regulatory-regime.js` and `regimeHold` in `src/lib/streaming-gate.js`; if any differs from what this plan quotes (line numbers 107–184 and 422–441 included), follow the code and record the difference.
- [ ] Record the dead-export, unreachable-file and false-green counts.

### Step 10: IMPLEMENT
- [ ] `src/lib/regulatory-regime.js`: add `EMPTY_OVERRIDES_LINE`, `READ_LINE` and `EMPTY_LIST_VALUE` above `overridesMisread` and replace `overridesMisread`'s body; add `REGIME_KEYS`, `KEY_LINE`, `BLANK`, `INLINE_LIST`, `LIST_ENTRY`, `PROFILE_ITEM`, `BOOLEAN_VALUE`, `catalogControls` and `strictMisread` below it, `strictMisread` ending in the `KNOWN_CONTROLS` filter of decision 27; in `misreadRegime`, replace the header pattern and lines 427–441 — the split-once per-line key search, `EMPTY_LIST_VALUE`, the `!key` branch that falls through, the `READ_LINE` check, the unchanged profile loop and the final `return strictMisread(lines, projectRoot)`; replace `nextNonEmpty` with `stripComment` and `tailValue`, and `parseYAMLShallow`'s body with the first-index map, the look-ahead array, `stripComment`, the dash test with `tailValue` and the first-colon key with `tailValue` — all as specified. Nothing else in the file changes except the JSDoc in Step 15.
- [ ] Rerun both test commands from Step 8: every test green.

### Step 11: REVIEW
- [ ] Dispatch `iron-loop-critic`: only the explicitly empty map is newly accepted; every input today's code holds that is not that map still holds; find any settings text that reads as no misread after the change but drops or alters a profile or an override, beyond what "What remains open" lists; find any text the reader reads correctly that `READ_LINE`, the header pattern or the strict reading now refuses, beyond decisions 18, 25 and 26; confirm every kind the existing tests assert is unchanged; confirm the per-line key search and `EMPTY_LIST_VALUE` accept and refuse what the code they replace did, apart from the non-ASCII blanks decision 24 names; confirm an override of a name in `KNOWN_CONTROLS` never reads the catalog and an override of any other name does; confirm each replacement in `parseYAMLShallow` returns what the code it replaces returned on every input, not only on the shipped profiles, by decision 28's table, and find an input where it does not; confirm `streaming-gate.js`, `parseRegimeBlock`, `loadActiveProfiles`, `loadProfile`, `listAvailableProfiles`, the contents of `KNOWN_CONTROLS` and every export are untouched.

### Step 12: OPTIMIZE
- [ ] One pass over the block's lines finds every `overrides` header; `misreadRegime` splits the block body once and shares the lines with the key search, the line check and the strict reading, each one anchored regex test per line; the profile catalog is read only for an override of a name outside `KNOWN_CONTROLS`; the profile parser makes one backward pass for its look-ahead and one pass over the lines, each line searched by `indexOf` and `lastIndexOf`; no extra read of the settings file; no new export.

### Step 13: SECURE
- [ ] Dispatch `security-scanner`: every misread still holds both crossings (rerun the parent's case 58 inputs, which are in the suite, with the new forms); the change reads only `.ctoc/settings.yaml` and the profile catalog the module already reads, and writes nothing.
- [ ] Time `misreadRegime` on each of these inputs and record each figure; each must return the expected result in under 100 milliseconds: (1) `regulatory_regime:\n  active_profiles: []\n  overrides: {} #` followed by 100,000 spaces, a lone carriage return (`\r`, no line feed after it), `x`, then `\n` → `'overrides'` (`EMPTY_OVERRIDES_LINE`; the pattern this plan first specified needed about n²/2 ≈ 5 × 10⁹ backtracking steps on it); (2) `regulatory_regime:\n  active_profiles: []\n  overrides:\n` followed by 100,000 spaces, a tab, `x`, then `\n` → `'overrides'` (the indentation pattern); (3) `regulatory_regime:\n  active_profiles: []\n  ` followed by 100,000 letters `a`, 100,000 spaces, `x`, then `\n` → `'block'` (`READ_LINE`'s key alternatives: the name runs to the spaces, finds no colon and gives back every letter; this input read `null` under the list of refused forms); (4) `regulatory_regime:\n  active_profiles: []\n  -` followed by 100,000 spaces, then `\n` → `'block'` (`READ_LINE`'s list-item alternative: the blanks after the dash find no value and give back); (5) `regulatory_regime:\n  active_profiles: []\n  a: ` followed by 100,000 letters `b`, a lone carriage return, `x`, then `\n` → `'block'` (a `.*` tail that runs to the carriage return and gives back); (6) `regulatory_regime:\n  active_profiles: []\n` followed by 100,000 spaces, a lone carriage return, `x`, then `\n` → `'block'` (the blank and comment alternatives and the leading blanks of the other three); (7) `regulatory_regime:\n  active_profiles:\n` followed by 100,000 spaces, `- gdpr`, then `\n` → `null` (`KEY_LINE`: the leading spaces find no name and give back once; the item is then read whole); (8) `regulatory_regime:\n  active_profiles: [gdpr` followed by 100,000 spaces, `]`, 100,000 spaces, `x`, then `\n` → `'active-profiles'` (`INLINE_LIST`: the trailing blanks and the list content each give back once); (9) `regulatory_regime:\n  active_profiles: [` followed by 100,000 spaces, `gdpr`, 100,000 spaces, a no-break space (`String.fromCharCode(0xa0)`), `]`, then `\n` → `'active-profiles'` (`BLANK` and `LIST_ENTRY` on the list content: the reader trims the no-break space away and reads `gdpr`; the entry pattern gives back the blanks once and refuses it); (10) `regulatory_regime:\n  active_profiles:\n    - gdpr` followed by 100,000 spaces, `x`, then `\n` → `'active-profiles'` (`PROFILE_ITEM`); (11) `regulatory_regime:\n  active_profiles: []\n  declined: true` followed by 100,000 spaces, `x`, then `\n` → `'block'` (`BOOLEAN_VALUE`); (12) `regulatory_regime:\n  active_profiles:` followed by 100,000 spaces, a no-break space (`String.fromCharCode(0xa0)`), then `\n    - gdpr\n` → `'active-profiles'` (`BLANK` on a key's value, then `INLINE_LIST`'s leading blanks; the reader reads the block list, YAML a scalar); (13) `regulatory_regime:\n  declined: true\n` followed by 100,000 line feeds, `  x`, then `\n` → `'block'` (the per-line key search; the multiline search it replaces restarted at every blank line, about n²/2 ≈ 5 × 10⁹ steps); (14) `regulatory_regime:\n  active_profiles: [` followed by 100,000 spaces, `x`, then `\n` → `'active-profiles'` (`EMPTY_LIST_VALUE`; the unanchored comment strip it replaces rescanned the spaces from every position in them, about n²/2 ≈ 5 × 10⁹ steps).
- [ ] Inputs 15–20 time the profile parser through the catalog read (decision 28). Each is a temporary project whose own `.ctoc/regulatory-regimes/slow.yaml` is `required_controls:\n  - slow_review\n` followed by the text named, and whose settings are `regulatory_regime:\n  active_profiles: []\n  overrides:\n    slow_review: true\n` — a control outside `KNOWN_CONTROLS`, so the catalog is read and the inactive profile `slow` is parsed with the fifteen shipped ones — and each → `null`: (15) 100,000 characters `#`, a lone carriage return, `x`, then `\n` (`stripComment`; the comment strip it replaces scanned from every `#` to the carriage return and back, about n²/2 ≈ 5 × 10⁹ steps); (16) `- `, 100,000 spaces, `a`, a lone carriage return, `x`, then `\n` (the dash test and `tailValue`; the list-item pattern it replaces tried every split of the spaces between `\s*` and `.*`); (17) 100,000 spaces, `x`, then `\n` (the first-colon key; the key-and-value pattern it replaces tried every split of the spaces between the leading blanks and the key); (18) `a:`, 100,000 spaces, `b`, a lone carriage return, `x`, then `\n` (`tailValue` after a key; the same pattern's value part tried every split of the spaces); (19) 20,000 lines `k0:` to `k19999:`, each ending in `\n` (the first-index map; `lines.indexOf` scanned every line before each key, about 2 × 10⁸ comparisons); (20) the line `a:`, 10,000 blank lines, then 10,000 lines `a:`, each ending in `\n` (the look-ahead array; `nextNonEmpty` rescanned the 10,000 blank lines for every repeat, about 10⁸ line strips). Inputs 19 and 20 use 20,000 lines rather than 100,000 so that reading and parsing the file once stays well inside the bound.

### Step 14: VERIFY
- [ ] `npm test`: fail 0, skipped 0, coverage at or above `.ctoc/coverage-baseline.json` `minPct`; `src/lib/regulatory-regime.js` 100 % lines.
- [ ] `eslint --max-warnings 0` on `src/lib/regulatory-regime.js` (its `security/detect-unsafe-regex` rule included) and the two test files; `tests/typecheck.test.js` passes.
- [ ] Dead-export, unreachable-file and false-green counts not higher than at Step 9; `tests/compliance-claims-match-code.test.js` green.

### Step 15: DOCUMENT
- [ ] JSDoc on `EMPTY_OVERRIDES_LINE`, `READ_LINE`, `EMPTY_LIST_VALUE`, `REGIME_KEYS`, `KEY_LINE`, `BLANK`, `INLINE_LIST`, `LIST_ENTRY`, `PROFILE_ITEM`, `BOOLEAN_VALUE`, `catalogControls`, `strictMisread`, `stripComment`, `tailValue`, `parseYAMLShallow` and `overridesMisread`, and in `misreadRegime`'s list the header bullet, the `active_profiles` value bullet, the new line-check bullet, the no-`active_profiles` bullet ("unless declined or carrying at least one override", replacing "unless it is declined or only overrides"), the `overrides` bullet and the new strict-reading bullet, as specified. No other documentation changes (decisions 9 and 27).

### Step 16: FINAL-REVIEW
- [ ] Dispatch `iron-loop-critic` against the acceptance criteria; each box quotes its evidence.
- [ ] Show the owner, in full: `misreadRegime` on the main checkout's own settings with the built code (read only) returns `null`; then a scratch project carrying a copy of CTOC's `.ctoc/settings.yaml`, driven through the real `start.js` routes as the parent's scratch run was — its functional plan moves on (`advanced_by: sufficiency`) and its built plan finishes after `menu task complete <id> --continue` (`advanced_by: pipeline`); a scratch project with `overrides: {four_eyes_gate3: true}` whose built plan still waits with the "could not read" sentence; a scratch project whose settings write `"overrides":` over `four_eyes_gate3: true`, whose built plan waits with the same sentence; a scratch project whose settings write `&a overrides:` over `four_eyes_gate3: true`, whose built plan waits with the same sentence; a scratch project whose settings write `overide:` over `four_eyes_gate3: true`, whose built plan waits with the same sentence; a scratch project whose settings write `four_eyes_gate: true` under `overrides:`, whose built plan waits with the same sentence; and `misreadRegime` on a scratch project carrying the `docs/CONTINUOUS_IMPROVEMENT.md` example (`andon_cord_halt: false` under `iso-9001`) returns `null`.

## Attacked before the build (2026-10-10): not to be built as written

The threat modeler ran this plan's four code blocks, spliced into a scratch copy of `src/lib/regulatory-regime.js`, and the red-team critic read the plan against the code. Nothing is built. The one-line fix for the empty overrides map is split off into its own small plan (`an-empty-overrides-map-is-read-as-empty.md`); the strict reading below stays here and is not built until each point is closed in its rules.

Ways through (a file read as "readable, no regime" or with a wrong regime):
1. The regime written so the header search never sees it: the whole file in flow style, a leading `---` document with a flow map, an anchor or a tag before the key, the `? key` form, a merge key, every top-level key indented one space, a near-miss header (`regulatory-regime:`, `regulatory_regimes:`, a capital, a look-alike letter). Rule to add: any line that mentions the name outside a whole-line comment and is not exactly the column-0 header is a misread.
2. The settings file saved as UTF-16, or a byte-order mark after the first byte. Rule to add: a NUL, U+FFFD or a later byte-order mark is a misread.
3. A regime key at column 0 after the block (`declined: true` under the header, then `active_profiles: [gdpr]` dedented): the block ends there and the key is never read.
4. Not linear: `active_profiles:` followed by 100,000 spaces, a lone carriage return and a letter takes 8.8 seconds (`[ \t]*(.*)$`); a profile file with one long line and 20,000 repeats of a key line takes 1.5 seconds (the list-or-map look-ahead is re-run per repeat).
5. A project's own profile file whose note text holds a second `required_controls:` list: the quoted list replaces the real one. Rule to add: `required_controls` once per file, each item a plain name.
6. The reader's override loop runs past the overrides map: `overrides:` then `declined: false` at the same indentation stores `declined` as an override, which also satisfies "carries at least one override".

Ordinary settings the strict reading would still hold, or newly hold: a top-level key with a digit or hyphen straight after the block (`auto-push: false`, `ci-checks:`); a fourth key in the block (`reviewed_on:`, `note:`); `declined: yes` or `True`; `[gdpr,]`; a comment after an override value or after a bare `overrides:` or `active_profiles:` header; quoted profile names; `overrides: {four_eyes_gate3: true}`, `[]`, `null` or `~`; a flow list over several lines; `regulatory_regime: {}` or `null`; old-Mac line endings.

Also to settle before building: the hold shows one sentence for every refusal and names no line and no rule; the linear-time property is measured once by hand and held by no test; the five affected local projects' real settings were never run through these rules.

What held: inside the block, 551,880 enumerated and 300,000 random blocks compared with js-yaml 4.2.0 lost or changed no profile, declined flag or override, apart from point 6.
