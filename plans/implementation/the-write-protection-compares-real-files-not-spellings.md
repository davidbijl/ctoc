---
title: "The write protection compares real files, not spellings"
type: implementation
created: 2026-10-15
priority: high
effort: medium
depends_on: a-background-agent-cannot-change-claude-codes-settings
parent_plan: a-background-agent-cannot-change-claude-codes-settings
files:
  - src/lib/real-path-confinement.js
  - src/hooks/PreToolUse.Edit.js
  - src/hooks/PreToolUse.Bash.js
  - src/hooks/protect-records.js
  - tests/protect-records.test.js
  - tests/a-link-cannot-leave-the-repository.test.js
  - docs/ENFORCEMENT.md
revision: 1
rejection_reason: "Re-check against the switch that turns the record-write and background-agent shell refusals off (own"
tag: rejected
---
# REVISION 1

## Rejection Feedback

Re-check against the switch that turns the record-write and background-agent shell refusals off (owner, 15 October 2026): keep the editing-tool identity checks; drop, or state as limits, the shell work the switch makes unreachable.

---


# The write protection compares real files, not spellings

## The owner's decision (2026-10-15)

> "Check real file (Recommended)"

Tijn van der Zant's answer of 2026-10-15 to the audit finding below: the loaded write-protection
hook must resolve where a path really leads — the real folder, asked of the file system — and
compare it with the protected folders by FILE IDENTITY (device and inode), not by text, so every
letter-case or Unicode look-alike spelling on macOS and Windows is closed at once. Built test-first,
with the measured attack as the first failing test. This answer is his OK to change the logic of
the write-protection hook (`src/hooks/protect-records.js`) and of the two shared functions it
routes through (`resolvesUnder` in `src/lib/real-path-confinement.js`, `targetsStreamingLive` in
`src/hooks/PreToolUse.Edit.js`). The plan still crosses to the build in the menu, as every plan does.

Written by the implementation planner on 2026-10-15, dispatched by the CTO Chief; revised in
Step 7 refinement round 1 (the threat modeler's measurements and the critic's findings, every
choice ruled by the CTO Chief and recorded under Decisions 2, 8, 11, 12, 13 and 16–25); revised
again in round 2 (the CTO Chief's two rulings — the decision budget kept, `effort: medium` — and
the critic's seven findings, recorded under Decisions 16, 17, 20, 22 and 26–34); and in round 3
(the CTO Chief's six rulings, recorded under Decisions 33–37). Every
claim is labelled **read** (read in this worktree's files this session), **measured** (a
measurement by the CTO Chief or the threat modeler on this Mac, cited as given), **believed**
(recall, not checked here) or **to verify** (checked by a named step before anything is built on
it). Nothing was run by the planner. The `iron_loop` metadata in the front matter is not written
here; it is stamped when the plan moves (the CTO Chief confirms).

**What this plan claims, and no more:**

- For every session, an editing-tool write is refused when its target lands in a protected area
  under either reading of the path: followed AS WRITTEN, the way the file system follows it (a
  `..` after a link goes to the link's real parent), or TIDIED (`..` removed by text first, what a
  tool that tidies the path before opening it would open).
- Where the protected folder exists, the comparison is by file identity, so a spelling refuses
  exactly when the disk opens it as that folder. Where the folder does not exist yet, the
  comparison is by the identity of its nearest existing parent plus the missing names after
  Unicode folding (NFKC, then lower case). For another copy of the project, the comparison is by
  the Unicode-folded name of the path and of its real path.
- A hard link to the settings file `.ctoc/settings.yaml` (a protected file) has that file's
  identity and is refused. A hard link to a file inside a protected FOLDER is not seen.
- A file, or a folder this user cannot search, sitting where a protected folder is expected no
  longer refuses every unrelated write.
- The waiting folder for new questions stays writable under every Unicode-folded spelling of its
  name.
- A decision whose file-system walks run past 5 seconds is refused (the budget is checked at the
  entry of `resolvesUnder` and inside the walks; Node's start-up and the text rules' work on a
  long command are outside it).
  The CTO Chief kept this budget (Decision 20): a hook that times out lets the call run
  (measured), so a deadline that refuses closes that bypass.
- The shell gains the identity comparison and the as-written reading only through the link test
  it already runs on each operand; its text rules are unchanged.
- It is not a sandbox. Every remaining limit is listed under Risks and Neighbours.

## Problem statement

**Measured** by the CTO Chief on 2026-10-15 on macOS (APFS), in a scratch project, against the
installed hook (CTOC 6.14.125):

- `.ctoc/ſtate/verify/x.json` (the long s, U+017F) opens the same inode as
  `.ctoc/state/verify/x.json`; `.claude/ſettings.json` the same as `.claude/settings.json`.
- The hook refuses a Write to the plain spelling of a check record and of the answers log (exit 2)
  and ALLOWS the long-s spellings `.ctoc/ſtate/verify/x.json` and `.ctoc/ſtreaming/answers.jsonl`
  (exit 0), for the main session and for a background agent.
- JavaScript `/i` does not fold `ſ`, `/iu` does; `"ſ".normalize("NFKC")` is `"s"`;
  `new RegExp("a\\-b", "u")` throws; `fs.realpathSync` (the JavaScript one, which safe-fs wraps)
  keeps the spelling as given, only `fs.realpathSync.native` folds it.
- Believed open by the same reasoning: `approvalſ`, `.ctoc/ſettings.yaml`,
  `.ctoc/regulatory-regimeſ`. The tests below cover them.

**Measured** by the threat modeler on this Mac against this worktree's code (2026-10-15):

- **A link, then `..` (critical).** With `src/L` a link to `../.ctoc/state`, the target
  `src/L/../approvals/y.json` is tidied BY TEXT (`path.resolve`, `path.posix.normalize`, and
  Node's JavaScript `realpathSync`, which also removes `..` by text) to the unprotected
  `src/approvals/y.json`, while the kernel follows the link first and lands in
  `.ctoc/approvals/y.json`. The hook allows it (exit 0) on an editing tool and on the shell, for
  the main session and an agent; the shell leg really created `.ctoc/approvals/y.json`; planting
  the link is allowed. `realpathSync.native('src/L/../approvals')` returned the real
  `.ctoc/approvals`. **Not verified:** whether Claude Code's own Write tool lands such a path
  through the link or tidies it by text first — this plan refuses under both readings
  (Decision 18).
- **A file or an unreadable folder in a protected folder's place (high).** With `.ctoc/state` a
  file, or `chmod 000 .ctoc/state`, `resolveExisting` faults on the protected folder and
  `resolvesUnder`'s `if (!realProtected.ok) return true` refuses EVERY target: Write `src/x.js`,
  `rm -f src/x.js` and `npm test` all exit 2, for every session; planting it is allowed.
- **A timed-out hook allows the call.** In the owner's trial of 2026-10-15 on Claude Code
  2.1.300, a PreToolUse hook that timed out was reported "cancelled" and the tool call still ran;
  `hooks/hooks.json` sets no timeout. So any slow path is a bypass.
- **Look-alike spellings on APFS** — eight probed: only letter case and the long s open the real
  folder. Zero-width space (U+200B), zero-width non-joiner (U+200C), soft hyphen (U+00AD),
  byte-order mark (U+FEFF), full-width s (U+FF53), a combining accent and the dotless i (U+0131)
  each resolve to a distinct, absent folder. The Windows rows below stay **believed**.

**Read** in this worktree — why each check misses:

- `real-path-confinement.resolveExisting` (lines 119–170) starts with `path.resolve(p)` (line
  122), which removes `..` by text, then calls `safeFs.realpathSync` (line 127), the JavaScript
  `realpathSync`; `resolvesUnder` (lines 283–307) and `escapesRoot` (line 250) build the target
  with `path.join(root, targetFile)`, which removes `..` by text too; `protect-records.decide()`
  builds it with `path.resolve(payload.cwd || root, target)` (line 794); the shell's
  `resolveTokenPath` (`PreToolUse.Bash.js` lines 203–208) uses `path.posix.normalize`.
- `resolvesUnder` compares the TEXT of the two real paths in lower case (`isWithin`, lines
  215–223). The real path keeps `ſ`, and `'ſ'.toLowerCase()` is `'ſ'`, so
  `<root>/.ctoc/ſtate/verify/x.json` is not "within" `<root>/.ctoc/state/verify`.
- `resolvesUnder` line 297: `if (!realProtected.ok) return true;` — any fault on the protected
  folder refuses every target.
- `PreToolUse.Edit.isUnderProtectedDir` (lines 226–231) lower-cases names; `RECORD_SEGMENT_RE`
  (protect-records.js line 204) and `REGIME_SEGMENT_RE` (line 175) are `/i` without `u`.
- `targetsStreamingLive` (PreToolUse.Edit.js lines 304–314) exempts the waiting folder by NAME,
  unfolded, before the real-path check, and states a residual: a link inside the waiting folder
  pointing at a live file is exempted (docblock, lines 292–298).
- `real-path-confinement.js` states hard links as an open residual (header, lines 89–92).

**Read** — who routes through the resolver (search: `resolvesUnder\(|escapesRoot\(|resolveExisting\(`
over `src/`, 14 matching lines in 5 files, each read): `PreToolUse.Edit.js` lines 253 (approval
records), 271 (check records), 313 (question store), 354 (command tables, the unloaded hook only),
133 (`escapesRoot`, the unloaded whitelist); `protect-records.js` line 200 (`isRegimeFile`);
`PreToolUse.Bash.js` line 302 (`operandResolvesIntoLedger`, the shell's link test, reached from
`isLedgerWrite` line 417 for every spec and from `isLedgerForgery` line 515); `plan-coverage.js`
line 506 (`escapesRoot` only). Search `resolveTokenPath|operandResolvesIntoLedger` over `tests/`:
0 files, so neither is tested directly. Plan coverage needs no change: a look-alike spelling of a
declared file fails to match the declared glob, which refuses (the fail-closed direction).

**Read** — the dependency, `plans/implementation/a-background-agent-cannot-change-claude-codes-settings.md`,
built first: it adds to `protect-records.js` the functions `trimDotsAndSpaces`, `nameForm` (ends
in `path.posix.normalize`, so `.`/`..` are removed by text, line 347 of that plan), `foldedName`
(NFKC, then `nameForm`, then lower case, line 357), `configDir`, the module-level arrow
`foldSegment` (line 370), `protectedSettingsFiles`, `fileIdentity` (line 405), `mayBeDirectory`,
`isAgentSettingsTarget`, `unicodeLiteral`, `fileSpec`, `agentSettingsSpecs`; it exports
`resolveExisting` from `real-path-confinement.js`; it makes `isLedgerWrite` run no link test for a
spec without `dir`; and it adds a test block to `tests/protect-records.test.js`. Its pending
question (the same-file test, "keep all three tests" recommended) may still remove
`fileIdentity`; Step 9 reads which way it was built, and Implementation step 7 below covers both.
Its agent-only settings rule already refuses a settings name reached through `..`.

## Scope

Every name the loaded hook protects, on the editing tools (Write, Edit, MultiEdit, NotebookEdit),
for every session, main and background agents alike, as today:

| Area | Rule after this plan |
|---|---|
| approval records `.ctoc/approvals/` | refused when the target, read as written or tidied, lands there: real-path text in any letter case (today), OR the folder's identity on the target's real chain, OR (folder absent) the nearest existing parent's identity plus the folded missing names |
| check records `.ctoc/state/verify/` | the same |
| answers and live question files `.ctoc/streaming/` | the same, except a target whose Unicode-folded name lies in the waiting folder `.ctoc/streaming/questions/pending/` |
| `.ctoc/settings.yaml`, `.ctoc/regulatory-regimes/` | the same comparison; the settings file is a FILE basis, so a hard link to it (the same identity) is refused too |
| any copy's records, settings file and profiles (root-independent) | the existing name tests, read on the Unicode-folded path and on the folded real path |

A file or an unreadable folder where a protected folder is expected refuses only the targets whose
own path runs into it (Decision 19). Every decision's file-system walks run under a 5-second
budget, past which the decision refuses (Decision 20, kept by the CTO Chief).

The shell: the text rules are unchanged (the owner's ruling of 2026-10-15: a guard against honest
mistakes). The shell's link test calls the same `resolvesUnder` for every operand the text tests
did not already catch (first 128 candidates per segment, tokens up to 4,096 characters), now on
the operand as written AND tidied, so it compares by identity and follows `..` after a link too —
**read**: `operandResolvesIntoLedger` is the only shell call site, and `isLedgerWrite` reaches it
for `LEDGER_SPEC`, `VERIFY_SPEC`, `STREAMING_SPEC`, `SETTINGS_SPEC`, `REGIMES_SPEC` and the
dependency plan's settings specs. On the shell the whole store counts, the waiting folder
included, as today.

Not in scope (Neighbours): folding the shell's text rules; plan coverage; `escapesRoot`'s tidied
reading; hard links into protected folders; the waiting folder's growth.

## Implementation Details

### Architecture decision

One resolver, in the one module that asks the file system where a path leads; one comparison.

- `resolveExisting` walks the path AS WRITTEN, segment by segment, the way the kernel does: an
  existing segment is checked with `lstat`; a link's contents are read (`readlink`) and walked in
  its place, under a budget of 40 links (`loop` past it); `..` takes the physical parent of the
  real path so far; once a segment does not exist, the rest is a tail with no links, so a `..`
  there removes the tail's last name, and a `..` past the tail takes the physical parent of the
  real path. A name missing inside a link's contents is `dangling`. The input, and an absolute
  link's contents, are each cut by their OWN parsed root (`path.parse(…).root`: `/`, a drive
  `C:\`, a UNC `\\server\share\`), and the walk restarts at `path.resolve`'s root of that same
  string; `path.resolve` is asked for nothing else. It returns the not-yet-existing `tail`. It never throws, and its
  reasons stay a fixed vocabulary, now with `'not-a-folder'` for a file where a folder is needed.
- `resolvesUnder(target, protectedRel, root)` keeps today's text test and adds the identity test:
  the protected folder's identity (`fileIdentity`) on the target's real chain — its deepest
  existing entry and every ancestor up to the project root's identity — or, when the folder does
  not exist, its nearest existing parent's identity followed by the missing names compared after
  NFKC and lower case. A protected folder that faults with `'not-a-folder'` or `'denied'` holds
  nothing (Decision 19). Every other fault refuses; it never throws.
- `setDeadline(at)`: the resolver's walks and the identity chain refuse once `Date.now()` passes
  `at`. `protect-records.decide()` sets it to 5 seconds after the decision starts.
- `protect-records.decide()` runs the record and settings checks on the target as written and on
  its tidied form when the two differ; either refusal refuses (Decision 18). Its root-independent
  name tests read `foldedName` of the path and of its real path (`namesProtected`).
- The shell's `operandResolvesIntoLedger` resolves the operand as written (a raw `cd` prefix
  joined to the raw token) and tidied (today's), either refusing.
- `targetsStreamingLive` exempts the waiting folder by its Unicode-folded name (NFKC; letter case
  is folded by `isUnderProtectedDir`), short-circuit kept (Decision 2).
- ONE identity helper: `fileIdentity` moves from `protect-records.js` (dependency plan) to
  `real-path-confinement.js`; ONE segment fold: `foldSegment` moves the same way.

Rejected: `fs.realpathSync.native` per segment (kernel-correct on macOS and Linux, measured on one
path, but it is not wrapped by safe-fs, it changes the real path's spelling per platform, and the
existing fault-injection tests mock `safeFs.realpathSync`, so they would pass for the wrong reason);
Node's JavaScript `realpathSync` per segment (it resolves a link's contents with `path.resolve`, so
`M/../approvals` inside a link is tidied by text — **believed** from Node's `lib/fs.js`; no test
here can settle it, because today's resolver refuses the two-link row through its `'dangling'`
branch under either answer, and the design does not rest on it: the walk reads links itself,
Decision 34); folding the text comparison in `resolvesUnder` (on
Linux it would call a distinct look-alike folder protected — identity answers what the disk does).

### Dependency graph

```
Claude Code ──PreToolUse──> hooks/hooks.json (unchanged)
  └─> src/hooks/protect-records.js  main() → decide() (MODIFY: budget, two readings, namesProtected)
        ├─> real-path-confinement.setDeadline (NEW)
        ├─ editing tools ─┬─> PreToolUse.Edit.js isProtectedLedgerPath, isProtectedVerifyPath (unchanged)
        │                 ├─> PreToolUse.Edit.js targetsStreamingLive (MODIFY: folded carve-out)
        │                 │      └──> real-path-confinement.resolvesUnder (MODIFY)
        │                 │             ├─> resolveBasis (unchanged), isWithin (unchanged)
        │                 │             ├─> resolveExisting (MODIFY: walks as written, returns tail)
        │                 │             └─> identityChain, anchorOf, existingOf, passesThrough, segmentsOf (NEW); fileIdentity, foldSegment (MOVED)
        │                 ├─> namesProtected (NEW) ─> foldedName (dependency plan), resolveExisting
        │                 ├─> isRegimeFile (MODIFY) ─> namesProtected, resolvesUnder
        │                 └─> isAgentSettingsTarget (MODIFY: confinement.fileIdentity)
        └─ Bash ─> PreToolUse.Bash.js isLedgerWrite (MODIFY: raw cd prefix) → operandResolvesIntoLedger (MODIFY: two readings) → resolvesUnder
tests/protect-records.test.js ──spawns──> src/hooks/protect-records.js
tests/a-link-cannot-leave-the-repository.test.js ──requires──> src/lib/real-path-confinement.js
```

No cycle: `real-path-confinement.js` requires only `path` and `./safe-fs`.

### Implementation order

1. MODIFY `tests/protect-records.test.js`, `tests/a-link-cannot-leave-the-repository.test.js` (Step 8, red first).
2. MODIFY `src/lib/real-path-confinement.js` (no dependency).
3. MODIFY `src/hooks/PreToolUse.Edit.js` and `src/hooks/PreToolUse.Bash.js` — depend on 2 only through `resolvesUnder`'s unchanged signature.
4. MODIFY `src/hooks/protect-records.js` — depends on 2 (`setDeadline`, `fileIdentity`, `foldSegment`).
5. MODIFY `docs/ENFORCEMENT.md` and the hook's header comment (Step 15).

### File: `src/lib/real-path-confinement.js`

**Action:** MODIFY. **Purpose:** walk the path as the file system does; decide containment by
file identity as well as by real-path text; bound every walk.

Line numbers are of the file as the dependency plan leaves it (it edits line 112 in place and the
exports line only, so they equal today's, **read**). `resolveExisting` is replaced, so the line
ranges `tests/enforcement-fault-arms.test.js` lists in its header for this file move (Decision 12).

1. **Header, rewritten in place:**
   - "THE BOUNDED ANCESTOR WALK" (lines 33–38) becomes "THE WALK, AS WRITTEN": a target is walked
     from the file-system root one segment at a time, as the kernel walks it — an existing segment
     is checked with `lstat`, a link's contents are walked in its place, `..` is the physical
     parent of the real path so far; once a segment does not exist the rest is the
     not-yet-existing tail (a `Write` that creates a file names such a path), where a `..` removes
     the tail's last name. Nothing is tidied by text first, because `..` after a link is the
     link's real parent to the file system (measured 2026-10-15: `src/L/../approvals` with
     `src/L → ../.ctoc/state` is `.ctoc/approvals`). Bounded by `MAX_ANCESTOR_WALK` segments
     walked (links' contents included), `MAX_LINK_HOPS` links, and the decision deadline.
   - "THE TAIL'S GUARANTEE …" (lines 40–48): its first sentence keeps its history; the rule
     becomes: a name missing INSIDE a link's contents is a dangling link and is REFUSED
     (`reason: 'dangling'`); a name missing in the path as written starts the tail.
   - "THE REJECTED ALTERNATIVE — FOLLOWING THE LINK ONE HOP" (lines 54–64) is replaced by
     "LINKS ARE FOLLOWED BY READING THEM (reversed 2026-10-15)": the earlier choice resolved
     links with `realpathSync` and refused a dangling one by `lstat`; it is reversed because the
     JavaScript `realpathSync` removes `..` by text, inside a link's contents too, so a `..` after
     a link was judged where the text says, not where the file system goes. The walk reads each
     link (`readlinkSync`) under a budget of `MAX_LINK_HOPS` links (a cycle is `'loop'`). The
     link's contents enter the decision and never a log or a message.
   - "OPEN RESIDUAL" (lines 89–92), as exactly four lines:
     ```
      * OPEN RESIDUAL, stated rather than silently absent: a HARD link to a file inside a protected
      * FOLDER, or to a file outside the repository, is not seen — its real path is where it was
      * made. `resolvesUnder` compares identities, so a hard link to a protected FILE (the settings
      * file) is inside; `escapesRoot` compares text only.
     ```
   - A new paragraph after "THIS MODULE MUST NEVER THROW …" (line 79): "A DECISION BUDGET. A hook
     that times out lets the call run (measured, the owner's trial of 2026-10-15), so a slow walk
     is an allow. `setDeadline` sets the latest `Date.now()` at which a walk may still take a step;
     past it `resolvesUnder` refuses at its entry, before the root lookup, and every walk returns
     `'resolve-failed'`, the refusing value. Set once per decision by
     `protect-records.js`, a fresh process per call; never set by any other caller."
2. **Constants**, after `MAX_ANCESTOR_WALK` (line 103, unchanged at 4096):
   ```js
   /** The most links one walk follows; past it the path is a loop (Linux's own limit is 40). */
   const MAX_LINK_HOPS = 40;
   /** The path separators of this platform, for splitting a path into segments. */
   const SEPARATORS = path.sep === '\\' ? /[\\/]+/ : /\/+/;
   /** The latest `Date.now()` at which a walk may take a step, or null for none. */
   let deadline = null;
   ```
3. **`resolveExisting` (docblock and body, lines 105–170) replaced by:**

```js
/**
 * Where `p` really leads, walked AS WRITTEN the way the file system walks it, tolerating a
 * path that does not exist yet. See the header: THE WALK, AS WRITTEN.
 *
 * NEVER THROWS. Every fault is returned as `{ ok: false, reason }` with a fixed vocabulary
 * (`'resolve-failed'` | `'loop'` | `'denied'` | `'dangling'` | `'not-a-folder'`), so a caller
 * can report WHY without leaking an errno object, a stack trace or an absolute path.
 * `resolvesUnder` branches on two of them (`'not-a-folder'`, `'denied'`: a protected folder
 * that cannot be one holds nothing); `plan-coverage` discards them.
 *
 * @param {string} p - an absolute or relative path
 * @returns {{ok: boolean, real: (string|null), reason: (string|null), tail: (string[]|null)}} a UNIFORM shape,
 *   never a discriminated union: `ok:false` always carries a reason, a null path and a null tail; `tail` lists the
 *   names at the end of `real` that do not exist yet, outermost first (`[]` when the whole path exists).
 */
function resolveExisting(p) {
  const fault = (reason) => ({ ok: false, real: null, reason, tail: null });
  try {
    if (typeof p !== 'string' || p.length === 0) return fault('resolve-failed');
    const abs = path.isAbsolute(p) ? p : `${process.cwd()}${path.sep}${p}`;
    // The input is cut by its OWN parsed root (`/`, `C:\`, `\\server\share\`, or a rooted `\`
    // without a drive on Windows); `path.resolve` is asked for the root to start from only, and
    // the segments are walked as written.
    const rest = abs.slice(path.parse(abs).root.length);
    let real = path.parse(path.resolve(abs)).root;
    /** @type {string[]} the segments still to walk, the next one LAST */
    const todo = segmentsOf(rest).reverse();
    /** @type {string[]} names below `real` that do not exist, outermost first */
    const tail = [];
    let fromLink = 0; // how many of the next segments came out of a link's contents
    let hops = 0;
    for (let walked = 0; todo.length > 0; walked++) {
      if (walked >= MAX_ANCESTOR_WALK || (deadline !== null && Date.now() > deadline)) return fault('resolve-failed');
      const seg = /** @type {string} */ (todo.pop());
      const linked = fromLink > 0;
      if (linked) fromLink -= 1;
      if (seg === '..') {
        // `real` holds no link, so its text parent IS its physical parent.
        if (tail.length > 0) tail.pop(); else real = path.dirname(real);
        continue;
      }
      if (tail.length > 0) {
        // Below a name that does not exist nothing exists. Never a segment out of a link here:
        // a link's segments sit on top of `todo` and are popped before any other, a missing one
        // returns 'dangling' below before the tail can start, and a link is met only by `lstat`,
        // which runs only while the tail is empty — so the tail is empty while such segments remain.
        tail.push(seg);
        continue;
      }
      const next = path.join(real, seg);
      let st;
      try {
        st = safeFs.lstatSync(next);
      } catch (err) {
        const code = err && /** @type {NodeJS.ErrnoException} */ (err).code;
        if (code === 'ENOENT') {
          if (linked) return fault('dangling'); // the forged-record shape: see the header
          tail.push(seg); // the ordinary new file
          continue;
        }
        if (code === 'EACCES' || code === 'EPERM') return fault('denied');
        // ENOTDIR (only a file swapped in mid-walk can give it: a file with more to walk is
        // refused as 'not-a-folder' below before its child is asked), ELOOP, ENAMETOOLONG, a
        // safe-fs validatePath TypeError (empty / NUL-byte path), … — all refuse.
        return fault('resolve-failed');
      }
      if (st.isSymbolicLink()) {
        hops += 1;
        // A LINK CYCLE is the shape an attacker builds to turn a resolver into a hang.
        if (hops > MAX_LINK_HOPS) return fault('loop');
        const contents = String(safeFs.readlinkSync(next));
        // An absolute link restarts at its own root, cut off before the names are walked, so a
        // drive `C:` or a UNC server and share is never walked as a name.
        const lr = path.parse(contents).root;
        const parts = segmentsOf(contents.slice(lr.length));
        if (lr) real = path.parse(path.resolve(contents)).root;
        for (let i = parts.length - 1; i >= 0; i--) todo.push(parts[i]);
        fromLink += parts.length;
        continue;
      }
      // A file with more to walk below it (`..` included) is not a path the kernel can open.
      if (!st.isDirectory() && todo.length > 0) return fault('not-a-folder');
      real = next;
    }
    return { ok: true, real: tail.length ? path.join(real, ...tail) : real, reason: null, tail };
  } catch {
    // Total by construction. See the file header: a throw here becomes an ALLOW.
    return fault('resolve-failed');
  }
}

/** The segments of a path, without empty and `.` segments. */
function segmentsOf(s) {
  return s.split(SEPARATORS).filter((seg) => seg !== '' && seg !== '.');
}
```

   Notes for the builder (**read**): the two fault-injection cases of
   `tests/enforcement-fault-arms.test.js` that reach this function still reach a refusal with the
   reason they assert, unedited — the `path.resolve` mock keyed on the target (read, lines
   247–253: it throws for any argument holding the sentinel) throws at
   `path.parse(path.resolve(abs))` inside the outer `try` (`'resolve-failed'`; the root cut
   before it calls only `path.parse`, which the mock does not touch), and the
   4,200-segment case walks its mocked-absent segments into the tail until `MAX_ANCESTOR_WALK`
   (`'resolve-failed'`). `tests/a-dangling-link-is-not-a-path-inside-the-tree.test.js` asserts
   `'dangling'` for a link to an absent target and `'loop'` for a link cycle (lines 172, 204) and
   `escapes: true` for a path through a file (case 9); the walk gives each.
4. **`escapesRoot` (lines 236–260): unchanged.** It still builds its target with
   `path.join(root, targetFile)` — the tidied reading. It is not on the loaded hook's path (plan
   coverage and the unloaded edit hook's whitelist), and an as-written reading there would need
   both readings to deny, a change to plan coverage this plan does not make (Neighbours). On a
   tidied path the new walk follows links exactly as before, except that a link's own contents
   are no longer tidied by text.
5. **`resolvesUnder` (docblock and body, lines 262–307) replaced by:**

```js
/**
 * Does `targetFile`, followed AS WRITTEN the way the file system follows it, land inside the
 * protected directory (or file) `<root>/<protectedDirRelative>`?
 *
 * The caller asks once per reading: `protect-records.decide()` and the shell's link test also
 * ask with the TIDIED path (`..` removed by text), what a tool that tidies a path before opening
 * it would open. This function itself never tidies the target.
 *
 * BY FILE IDENTITY, NOT ONLY BY SPELLING (the owner's decision of 2026-10-15). The walk keeps
 * every existing name AS SPELLED, so on a file system that folds names (macOS APFS, Windows NTFS)
 * `.ctoc/ſtate/verify` — the long s — opens the real `.ctoc/state/verify` while its real path
 * reads as a different folder (measured on macOS, 2026-10-15). So the target is inside when:
 *   • its real path is inside the protected one's real path, in any letter case — the text test
 *     this function always had, kept so no verdict it gave is lost; or
 *   • the protected entry's identity (device and inode, `fileIdentity`) is on the target's real
 *     chain: its deepest existing entry and every ancestor up to the project root's identity.
 *     A protected entry that does not exist yet has no identity: its nearest existing ancestor's
 *     identity must be on the chain, followed by the missing names, compared after NFKC and
 *     lower case. A protected FILE is compared the same way, so a hard link to it is inside;
 *     a hard link to a file inside a protected FOLDER is not seen (the header's residual).
 *
 * A PROTECTED FOLDER THAT CANNOT BE ONE — a file (`'not-a-folder'`) or a folder this user cannot
 * search (`'denied'`) on its path — holds nothing, so a target that resolves is not inside it;
 * a target whose own path runs into that fault faults itself and is refused. Any other fault on
 * the protected path (a dangling link, a loop) refuses every target: a dangling link there is
 * the shape of a record forged at the link's destination.
 *
 * FAILING DIRECTION — NOTE THE INVERSION relative to {@link escapesRoot}: here `true` means
 * "protected, DENY", so every other fault returns `true`. A file system that gives no identity
 * (inode 0) is not a fault: the text test decides there, as it always did.
 *
 * The one input that returns `false` on a fault is a target that is not a path at all
 * (absent, non-string, empty). That is not a resolver fault — there is nothing to protect —
 * and every call site guards `targetFile &&` or its equivalent before asking.
 *
 * NEVER THROWS.
 *
 * @param {string} targetFile - the tool-call target (relative to `root`, or absolute), as written
 * @param {string} protectedDirRelative - POSIX-relative protected dir or file, no trailing /
 * @param {string} root - the project root
 * @returns {boolean} true iff the target really lands in the protected entry, OR the question
 *   could not be answered
 */
function resolvesUnder(targetFile, protectedDirRelative, root) {
  try {
    if (typeof targetFile !== 'string' || targetFile.length === 0) return false;
    if (typeof protectedDirRelative !== 'string' || protectedDirRelative.length === 0) return true;
    if (typeof root !== 'string' || root.length === 0) return true;
    // The decision budget, before the root lookup (`resolveBasis` is not bounded by it).
    if (deadline !== null && Date.now() > deadline) return true;

    // Strict: the root must EXIST. The protected directory need not — a project that has never
    // minted an approval has no `.ctoc/approvals` yet.
    const realRoot = resolveBasis(root);
    if (!realRoot.ok) return true;
    const realProtected = resolveExisting(path.join(realRoot.real, protectedDirRelative));
    const holdsNothing = !realProtected.ok
      && (realProtected.reason === 'not-a-folder' || realProtected.reason === 'denied');
    if (!realProtected.ok && !holdsNothing) return true;

    // As written: a plain join, never `path.join`, which would remove `..` by text.
    const abs = path.isAbsolute(targetFile) ? targetFile : `${root}${path.sep}${targetFile}`;
    const realTarget = resolveExisting(abs);
    if (!realTarget.ok) return true;
    if (holdsNothing) return false;
    if (isWithin(realTarget.real, realProtected.real)) return true;

    const rootId = fileIdentity(realRoot.real);
    const anchor = anchorOf(realProtected);
    const chain = rootId === undefined ? null : identityChain(realTarget, rootId);
    if (anchor === null || chain === null) return true;
    return passesThrough(chain, anchor);
  } catch {
    return true;
  }
}
```

6. **New, after `resolvesUnder` and before `module.exports`** (function declarations hoist):

```js
/**
 * Set the decision budget: walks refuse once `Date.now()` passes `at`. A number sets it; anything
 * else clears it. Called once per decision by `protect-records.js` (a fresh process per call).
 * @param {number|null} at
 */
function setDeadline(at) {
  deadline = typeof at === 'number' && Number.isFinite(at) ? at : null;
}

/** One path segment folded for a name compare: NFKC (the long s becomes s), then lower case. */
function foldSegment(s) {
  return String(s).normalize('NFKC').toLowerCase();
}

/**
 * What `p` names after links, as `'<dev>:<ino>'` from a `bigint` stat (Windows file IDs can pass
 * 2^53); null when nothing is there (ENOENT, ENOTDIR) or the file system reports inode 0 (FAT
 * and some network shares, where every file would compare equal); undefined on any other
 * fault. Never throws. The one identity helper in CTOC.
 * @param {string} p
 * @returns {string|null|undefined}
 */
function fileIdentity(p) {
  try {
    const st = safeFs.statSync(p, { bigint: true });
    return String(st.ino) === '0' ? null : `${st.dev}:${st.ino}`;
  } catch (err) {
    const code = err && /** @type {NodeJS.ErrnoException} */ (err).code;
    return code === 'ENOENT' || code === 'ENOTDIR' ? null : undefined;
  }
}

/** The real path of the deepest existing entry of an `ok` `resolveExisting` result. */
function existingOf(resolved) {
  let current = resolved.real;
  for (let i = 0; i < resolved.tail.length; i++) current = path.dirname(current);
  return current;
}

/**
 * Where a comparison basis is anchored: the identity of its deepest existing entry (null when
 * the file system gives none) and the folded names below it that do not exist yet ([] when
 * the basis exists). Null on a fault.
 * @param {{real: string, tail: string[]}} resolved - an `ok` result of `resolveExisting`
 * @returns {{id: (string|null), below: string[]}|null}
 */
function anchorOf(resolved) {
  const id = fileIdentity(existingOf(resolved));
  return id === undefined ? null : { id, below: resolved.tail.map(foldSegment) };
}

/**
 * The identity chain of a resolved target, nearest first: its deepest existing entry and every
 * ancestor, each with its identity (null when the file system gives none) and the folded names
 * below it, the missing tail included. Stops after the entry whose identity is the project
 * root's (no protected entry lies above the root), else at the file-system root. Bounded by
 * MAX_ANCESTOR_WALK and the decision deadline. Null on a fault.
 * @param {{real: string, tail: string[]}} resolved - an `ok` result of `resolveExisting`
 * @param {string|null} rootId - the project root's identity
 * @returns {Array<{id: (string|null), below: string[]}>|null}
 */
function identityChain(resolved, rootId) {
  let current = existingOf(resolved);
  let below = resolved.tail.map(foldSegment);
  const chain = [];
  for (let i = 0; i < MAX_ANCESTOR_WALK; i++) {
    if (deadline !== null && Date.now() > deadline) return null;
    const id = fileIdentity(current);
    if (id === undefined) return null;
    chain.push({ id, below });
    const parent = path.dirname(current);
    if (parent === current || (id !== null && id === rootId)) return chain;
    below = [foldSegment(path.basename(current))].concat(below);
    current = parent;
  }
  return null;
}

/**
 * Does `chain` pass through `anchor`: an entry with the anchor's identity whose folded names
 * below begin with the anchor's missing names? False when the anchor has no identity — the
 * text test decides on such a file system.
 * @param {Array<{id: (string|null), below: string[]}>} chain
 * @param {{id: (string|null), below: string[]}} anchor
 * @returns {boolean}
 */
function passesThrough(chain, anchor) {
  if (anchor.id === null) return false;
  return chain.some((link) => link.id === anchor.id
    && anchor.below.every((name, i) => link.below[i] === name));
}
```

7. **Exports:** `module.exports = { escapesRoot, resolvesUnder, resolveExisting, setDeadline, fileIdentity, foldSegment };`
   — in the "drop" outcome of Implementation step 7 below, `fileIdentity` is NOT exported (only
   this module calls it), so no dead export appears.

**Fences (read):** `setDeadline`, `fileIdentity` and `foldSegment` are called by
`protect-records.js`, a declared root in `.ctoc/reachability-roots.json` (the dependency plan
relies on the same for `resolveExisting`), so the dead-export count is expected unchanged in both
outcomes; checked at Step 14. No new file, so no documented count moves and `CLAUDE.md` is not
declared.

**Types (read: `tsconfig.json` `checkJs: true`, `strict: false`):** `todo.pop()` is cast to
`string`; `readlinkSync` without options returns a string, wrapped in `String()` so the safe-fs
`Pick` overloads cannot widen it; `deadline` is `number|null` (believed; Step 14's typecheck).

### File: `src/hooks/PreToolUse.Edit.js`

**Action:** MODIFY. **Purpose:** the waiting-folder carve-out folds Unicode look-alikes.

- `targetsStreamingLive` body (lines 304–314) becomes:

```js
function targetsStreamingLive(filePath) {
  // Unicode-folded (NFKC: the long s is an s; `isUnderProtectedDir` folds letter case), so a
  // look-alike spelling of the waiting folder stays writable and one of the store does not.
  // Folded BEFORE the last tidying: a full-width solidus or full stop folds to `/` or `.`, so
  // `pending／..／x` folds to `pending/../x` and is tidied out of pending. The fold runs on the
  // project-relative path, never on the absolute one, so a project folder whose own name NFKC
  // changes still relativizes (Decision 33).
  const rel = normalizeForProtection(filePath);
  const folded = rel === null ? null : normalizeForProtection(rel.normalize('NFKC'));
  if (isUnderProtectedDir(folded, STREAMING_PENDING_DIR)) return false;
  // Everything else under .ctoc/streaming/ (live questions file, answers log) is
  // denied. Arithmetic OR real-path, exactly like the ledger/verify guards.
  return isUnderProtectedDir(folded, STREAMING_DIR)
    || (realPathConfinement !== null
      && realPathConfinement.resolvesUnder(filePath, STREAMING_DIR, process.cwd()));
}
```

- Docblock: the paragraph "The quarantine carve-out is decided by NAME arithmetic ONLY …
  is not denied by `resolvesUnder`." (lines 281–285) gains, after its first clause, "on the
  project-relative path Unicode-folded (NFKC) before its last tidying, so a look-alike spelling of
  the waiting folder stays writable and one of the store does not". The paragraph "KNOWN RESIDUAL …" (lines 292–298) gains one closing
  sentence: "The loaded hook (`protect-records.js`) refuses such a link all the same: its
  root-independent test reads the target's real path, which names the live store." Nothing else
  in the file changes; the unloaded edit hook calls the same function (Decision 10).

### File: `src/hooks/PreToolUse.Bash.js`

**Action:** MODIFY. **Purpose:** the shell's link test resolves each operand as written too.
Anchor each change on its quoted text.

1. `resolveTokenPath` (lines 203–208) gains a third parameter; its docblock gains "`lexical`
   false keeps the path as written (no `..` removed), for the link test":

```js
function resolveTokenPath(prefix, token, lexical = true) {
  const t = String(token).replace(/['"`()]/g, '').replace(/^[<>]+/, '');
  if (!t) return '';
  const joined = t.startsWith('/') ? t : (prefix ? prefix + '/' : '') + t;
  return lexical ? path.posix.normalize(joined) : joined;
}
```

   For `lexical` true the result is today's for every input (`path.posix.normalize(t)` for an
   absolute token, `path.posix.normalize(prefix/t)` otherwise).
2. `operandResolvesIntoLedger` (lines 295–303) becomes, its docblock gaining "Resolves the
   operand TIDIED (the `cd` prefix and `..` read by text, bash's default `cd`) and AS WRITTEN (a
   `cd -P`, `set -P`, or bash's own fallback when the tidied folder is missing, moves through
   links physically); either landing in the folder refuses":

```js
function operandResolvesIntoLedger(prefix, token, dir = LEDGER_DIR_RELATIVE, rawPrefix = prefix) {
  if (!realPathConfinement) return false; // degraded — the header records this
  const rel = resolveTokenPath(prefix, token);
  if (!rel) return false;
  const raw = resolveTokenPath(rawPrefix, token, false);
  // A token longer than any real path cannot name a ledger entry; resolving it only
  // manufactures an ENAMETOOLONG fault that fail-closes to a false deny. See the const.
  return [...new Set([rel, raw])].some((c) => c.length <= MAX_CANDIDATE_LEN
    && realPathConfinement.resolvesUnder(c, dir, process.cwd()));
}
```

3. `isLedgerWrite`: `let prefix = '';` (line 342) gains `let rawPrefix = '';` after it. The three
   prefix lines of the `cd` branch (lines 386, 391–393) become:

```js
      if (dir === '' || (dir === '-' && !dirIsAfterSep)) { prefix = ''; rawPrefix = ''; }
      else if (dir.startsWith('~')) {
        rawPrefix = dir.replace(/^~[^/]*\/?/, '');
        prefix = path.posix.normalize(rawPrefix);
      } else if (dir.startsWith('/')) {
        rawPrefix = dir;
        prefix = path.posix.normalize(dir);
      } else {
        rawPrefix = (rawPrefix ? rawPrefix + '/' : '') + dir;
        prefix = path.posix.normalize((prefix ? prefix + '/' : '') + dir);
      }
```

   (the comment block between lines 386 and 391 stays where it is, above the `~` branch), and line
   417 becomes `.some((t) => operandResolvesIntoLedger(prefix, t, spec.dir, rawPrefix));`. The text
   test at line 407 keeps the tidied `resolveTokenPath(prefix, t)` (the owner's ruling: the shell's
   text rules are unchanged).

### File: `src/hooks/protect-records.js`

**Action:** MODIFY. Anchor every change on the quoted text (the dependency plan's insertions move
line numbers).

1. **`namesProtected`, new**, placed after the dependency plan's `agentSettingsSpecs` and before
   the doc comment of `RECORD_SEGMENT_RE`:

```js
/**
 * Does `abs`, or where it really leads, name a protected area by `re` once Unicode-folded
 * (`foldedName`: NFKC, `\` as `/`, Windows trailing dots, spaces and stream suffixes dropped,
 * `..` removed by text, lower case)? Root-independent, so another copy's areas count — a
 * worktree's main checkout reached by a look-alike spelling or through a link. A real path that
 * cannot be resolved adds nothing here: the identity checks beside this one refuse it.
 * @param {string} abs
 * @param {RegExp} re
 * @returns {boolean}
 */
function namesProtected(abs, re) {
  if (re.test(foldedName(abs))) return true;
  const real = require('../lib/real-path-confinement').resolveExisting(abs);
  return real.ok && re.test(foldedName(real.real));
}
```

2. **`isRegimeFile`**: `if (REGIME_SEGMENT_RE.test(abs.replace(/\\/g, '/'))) return true;` becomes
   `if (namesProtected(abs, REGIME_SEGMENT_RE)) return true;`. Its docblock's first sentence gains
   "— by name, Unicode-folded, on the path and on its real path, or by file identity
   (`resolvesUnder`)".
3. **A decision budget.** A new constant after `REFUSAL_SETTINGS`:
   `/** The longest one decision may walk the file system (Claude Code lets a call run when its hook times out). */ const DECISION_BUDGET_MS = 5000;`.
   In `decide()`, after `const { findProjectRoot } = require('../lib/project-root');`, a new line:
   `try { require('../lib/real-path-confinement').setDeadline(Date.now() + DECISION_BUDGET_MS); } catch { /* no resolver: no walks to bound */ }`
   — wrapped, so a resolver that fails to load never turns this line into a throw before the
   shell branch (Decision 35).
4. **`decide()`, editing tools — two readings.** The lines
   `const abs = path.resolve(payload.cwd || root, target);` through
   `return isRegimeFile(abs) ? REFUSAL_SETTINGS : null;` (with the dependency plan's
   background-agent settings check between them, unchanged and still on `abs`) become:

```js
    const abs = path.resolve(payload.cwd || root, target);
    // As written: `..` after a link is the link's real parent to the file system. Tidied (`abs`):
    // what a tool that tidies the path before opening it would open. Either refusal refuses.
    const raw = path.isAbsolute(target) ? target : `${payload.cwd || root}${path.sep}${target}`;
    const forms = raw === abs ? [abs] : [abs, raw];
    if (forms.some((form) => edit.isProtectedLedgerPath(form) || edit.isProtectedVerifyPath(form)
      || edit.targetsStreamingLive(form) || namesProtected(form, RECORD_SEGMENT_RE))) return REFUSAL;
    if (forms.some(isRegimeFile)) return REFUSAL_SETTINGS;
```

   followed by the dependency plan's background-agent settings check as built (on `abs`: its
   agent-only rule already refuses a settings name reached through `..`) and the final
   `return null;`. The order of the checks is unchanged: records, then regulatory settings, then
   the background-agent settings check. Each name test inside the checks tidies its input by text
   (`normalizeForProtection`, `foldedName`), so on `raw` they give the same answer as on `abs`;
   only the real-path arms differ.
5. **One identity helper.** Delete the dependency plan's `fileIdentity` function and its doc
   comment from this file. In `isAgentSettingsTarget`, move
   `const confinement = require('../lib/real-path-confinement');` to the function's first line
   and write its two identity calls as `confinement.fileIdentity(abs)` and
   `confinement.fileIdentity(file)`; nothing else in it changes.
6. **One segment fold.** Delete the dependency plan's module-level
   `const foldSegment = (s) => s.normalize('NFKC').toLowerCase();` and its one-line comment. In
   `protectedSettingsFiles`, add `const { foldSegment } = require('../lib/real-path-confinement');`
   as its first line; its two `foldSegment(…)` calls stay as written. Any comment in this file
   that names this file's own `fileIdentity` or `foldSegment` is changed to name
   `real-path-confinement`'s.
7. **Both outcomes of the dependency plan's question (Step 9 records which was built).** "Keep":
   items 5 and 6 as written. "Drop" (this file holds no `fileIdentity`): item 5 does nothing,
   `isAgentSettingsTarget` is left as built, and `real-path-confinement.js` does not export
   `fileIdentity` (its item 7). Item 6 applies in both.

**Error handling.** `namesProtected` calls only total functions (`foldedName`, `resolveExisting`,
`RegExp.test`). A `require` failure of `real-path-confinement` is caught at `decide()`'s budget
line (no resolver, so no walk to bound), and each branch then degrades exactly as today
(Decision 35):

- **Editing tools.** `PreToolUse.Edit.js` loads its resolver fail-soft (`realPathConfinement =
  null`, read, line 64), so `isProtectedLedgerPath`, `isProtectedVerifyPath` and
  `targetsStreamingLive` answer by arithmetic; a target they refuse is refused with `REFUSAL`.
  Any other target reaches the first inline resolver require on this path — `namesProtected`'s
  (today it is `isRegimeFile`'s, which now also runs through `namesProtected`) — which throws into
  `main()`'s fail rule: a call naming a record is refused with the crash sentence
  (`UNCHECKED_SUSPECT_RE`), any other call is allowed.
- **Shell.** `PreToolUse.Bash.js` loads its resolver fail-soft (`realPathConfinement = null`,
  read, lines 105–110), so `operandResolvesIntoLedger` returns false and every records and
  regulatory-settings text rule still runs and decides with its own sentence. The dependency
  plan's agent settings rule does NOT run: its `agentSettingsSpecs` requires the resolver inline
  (that plan, line 510), so a background agent's shell call that reaches it throws into
  `main()`'s fail rule, where that plan's crash line refuses a settings name with
  `REFUSAL_AGENT_SETTINGS_UNCHECKED` (its `SETTINGS_MENTION_RE`, line 319) — the same result as
  without this plan. Hook case 14 pins both branches.

### Wiring — the live call sites

Claude Code → `hooks/hooks.json` (PreToolUse; Write, Edit, MultiEdit, NotebookEdit, Bash) →
`node "${CLAUDE_PLUGIN_ROOT}/src/hooks/protect-records.js"` → `main()` → `decide()` →
`real-path-confinement.setDeadline`, then:

- editing tools, for the tidied and the as-written form → `PreToolUse.Edit.isProtectedLedgerPath`,
  `isProtectedVerifyPath` and `targetsStreamingLive` → `real-path-confinement.resolvesUnder` →
  `resolveExisting` (`segmentsOf`), `identityChain`, `anchorOf`, `existingOf`, `passesThrough`,
  `fileIdentity`, `foldSegment` → `refuse(REFUSAL)`; then `namesProtected` (→ `foldedName`,
  `resolveExisting`) → `refuse(REFUSAL)`; then `isRegimeFile` (→ `namesProtected`, `resolvesUnder`)
  → `refuse(REFUSAL_SETTINGS)`; then, for a background agent, `isAgentSettingsTarget` →
  `confinement.fileIdentity`; `protectedSettingsFiles` → `confinement.foldSegment`;
- Bash → `bashRefuses` → `PreToolUse.Bash.isLedgerForgery` / `isLedgerWrite` (raw `cd` prefix) →
  `operandResolvesIntoLedger` (two readings) → `resolvesUnder`.

Every new function has a live caller in the loaded hook; a test is not a caller. The live proof is
the Step 16 probe after the owner's release.

### Test plan — `tests/protect-records.test.js` (MODIFY; Step 8, written first)

Framework `node:test`. One new describe block at the end of the file, after the dependency plan's
block: "the write protection compares real files, not spellings (owner, 2026-10-15)". Its cases
are numbered from one above the file's last case number at build time, in the order below; this
plan names them. Every case spawns the real hook with real PreToolUse JSON through the file's
`run()` (case 13's preloaded spawn is local to it), `payload()`, `write()`, `bash()`, `p()`, `assertRefused` and `assertAllowed` (**read**,
lines 44–81); no mocks except the one preload of case 13, at the time boundary.

**Block fixture** (`beforeEach`, after the file's own `makeProject`, which makes `.ctoc/approvals`,
`.ctoc/state/verify`, `.ctoc/streaming/questions/pending`, `src` and `plans/review`):
`.ctoc/streaming/answers.jsonl` (`{}` and a newline), `.ctoc/state/verify/x.json` (`{}`),
`.ctoc/approvals/a.json` (`{}`), `.ctoc/settings.yaml` (`x: 1`),
`.ctoc/regulatory-regimes/gdpr.yaml` (`x: 1`), `src/e.js` (`x`).
**Block helpers:** `asAgent(input)` adds `agent_id: 'a1b2c3'` and `agent_type: 'iron-loop-executor'`;
`refusedBoth(input, what, sentence = REFUSAL)` asserts the call refused with that sentence as the
main session and as a background agent; `allowedBoth(input, what)` the same for allowed;
`REFUSAL_SETTINGS` written out in full in the block, and `REFUSAL_AGENT_SETTINGS_UNCHECKED` (case
14) written out in full too unless the dependency plan's block left it at file scope
(`REFUSAL_UNCHECKED` is at file scope, **read**, line 27); `sameFileOnDisk(real, alias)` — a `bigint`
stat of both, true when device and inode are equal, false on ENOENT, any other error rethrown —
asks the disk whether it folds, never assumes. `ſ` is U+017F, written as `'ſ'`; `ｓ` is U+FF53.
Links are made as the file's other link cases make them (**read**, lines 106, 158, 631):
`fs.symlinkSync(<absolute target>, <link>, 'junction')` for a folder, `fs.symlinkSync(<absolute
target>, <link>)` for a file, unless a case says otherwise.

**Cases** (paths inside `<project>`; "refused" means `refusedBoth` unless a case says otherwise):

1. **The long-s attack: a Write to the answers log or a check record spelled with ſ is refused**
   — THE FIRST FAILING TEST. Write `<project>/.ctoc/ſtreaming/answers.jsonl` and
   `<project>/.ctoc/ſtate/verify/x.json`: refused with `REFUSAL`. The case records
   `sameFileOnDisk` for both in its message without asserting it: on APFS (and, believed, NTFS)
   the long-s spelling is the real file and identity refuses it (and the folded name test too);
   on a case-sensitive Linux file system it is a different, absent file and the folded name test
   refuses it (belt and braces, Decision 3). Red today on every platform.
2. **The other protected names spelled with ſ, and a hard link to the settings file, are refused**
   — Write `.ctoc/approvalſ/x.json` (`REFUSAL`), `.ctoc/ſettings.yaml` and
   `.ctoc/regulatory-regimeſ/x.yaml` (`REFUSAL_SETTINGS`); and, with `src/h.yaml` made by
   `fs.linkSync(<project>/.ctoc/settings.yaml, <project>/src/h.yaml)`, Write `src/h.yaml`
   (`REFUSAL_SETTINGS`; the same identity, every platform). Red today.
3. **The same with no protected folder made yet** — remove `.ctoc/approvals`, `.ctoc/state`,
   `.ctoc/streaming`, `.ctoc/settings.yaml`, `.ctoc/regulatory-regimes`; then the five long-s
   Writes of cases 1 and 2 are refused with the same sentences (the nearest existing parent's
   identity plus the folded names, and the folded name test; every platform). Red today.
4. **Upper-case, mixed-case and compatibility look-alikes are refused** — Write
   `.CTOC/STREAMING/answers.jsonl`, `.Ctoc/State/Verify/x.json`, `.CTOC/ſTATE/VERIFY/x.json`,
   `.ctoc/APPROVALſ/x.json` (`REFUSAL`); `.CTOC/ſETTINGS.YAML` (`REFUSAL_SETTINGS`); and
   `.ctoc/ｓtreaming/answers.jsonl` (`REFUSAL`; full-width s — APFS opens it as a distinct, absent
   folder, **measured**, so the folded name test is what refuses it). The pure letter-case rows
   are green today (guards); the ſ and ｓ rows are red.
5. **The waiting folder stays writable under every folded spelling of its name** — `allowedBoth`
   for Write `.ctoc/streaming/questions/pending/implementation__x.md.json`,
   `.ctoc/ſtreaming/questions/pending/implementation__x.md.json` and
   `.ctoc/streaming/queſtions/pending/implementation__x.md.json`, on every platform (on a folding
   disk each is the real waiting folder; on Linux the second is a folder outside the store and the
   third a new folder inside it that no reader looks at, Decision 16). And `allowedBoth` for Write
   `.ctoc/streaming/questions/pending／implementation__x.md.json` (`／` is the full-width solidus,
   U+FF0F, written as `'／'`): it folds into the waiting folder, while on every platform the
   disk writes ONE file of that name in the live `questions/` folder — the chosen behaviour,
   harmless because no sanitized live question name can hold `／` (Decision 16). And, the
   project-folder row: a second project whose own folder name NFKC changes — made by
   `fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-ﬁ-')))` (`ﬁ` is the ligature
   U+FB01, written as `'ﬁ'`), the file's `makeProject` folders made inside it, removed in a
   `finally` — with the hook spawned in it and the payload's `cwd` set to it: `allowedBoth` for
   Write `<that project>/.ctoc/streaming/questions/pending/implementation__x.md.json` (held by
   Decision 33's fold on the relative path; the literal fold of the absolute path relativizes it
   to `../…` and refuses it). Green today except the `queſtions` row and the full-width-solidus
   row (both refused today by the unfolded carve-out and the unfolded record name test) — this
   case guards against over-refusal.
6. **A link inside the waiting folder, or a link put in its place, opens nothing in the loaded
   hook** — (a) `.ctoc/streaming/questions/pending/l.json` a file link to
   `.ctoc/streaming/answers.jsonl`: Write of it refused (`REFUSAL`). (b) `pending` removed and made
   a folder link to `.ctoc/streaming/questions`: Write `.ctoc/streaming/questions/pending/y.json`
   refused and Write `.ctoc/streaming/questions/review__x.md.json` refused. Main session only (the
   rule is the same for both). The refusing check is `namesProtected` on the real path, not
   `targetsStreamingLive`, which still exempts both by name (its docblock's residual, kept in the
   unloaded hook — Neighbours). Red today: (a) and the first row of (b); the second row of (b) is
   green today.
7. **A link, then `..`: the target lands where the file system goes** — the threat modeler's
   attack. With `src/L` a folder link to `<project>/.ctoc/state`:
   - refused (`REFUSAL`) for the main session and a background agent: Write
     `<project>/src/L/../approvals/y.json`, Write `<project>/src/L/../state/verify/y.json`, Write
     `<project>/src/L/../streaming/answers.jsonl`; Bash `echo x > src/L/../approvals/y.json`, Bash
     `echo x > src/L/../state/verify/y.json`, Bash `echo x > src/L/../streaming/answers.jsonl`;
   - refused (main session): Bash `cd src/L && echo x > ../approvals/y.json`; Bash
     `cd -P src/L/.. && echo x > approvals/y.json` (bash's physical `cd`); Write
     `<project>/src/L/missing/../../approvals/y.json` (a `..` in the not-yet-existing tail that
     climbs past it: the physical parent of the link's real folder);
   - two links (main session): `src/M` a folder link to `<project>/.ctoc/state` and `src/K` a
     link whose contents are the relative `M/../approvals`, made with
     `fs.symlinkSync('M/../approvals', p('src', 'K'), 'dir')` on macOS and Linux, and on Windows
     as a junction to `<project>/src/M/../approvals`: Write `src/K/y.json` refused on every
     platform. On macOS and Linux the walk reads the contents and lands in `.ctoc/approvals`. On
     Windows Node stores a junction's target as an absolute path (Node's documentation: a
     `'junction'` target is normalized to an absolute path), believed tidied to
     `<project>/src/approvals`; the walk cuts that path's own drive root (`C:\`, or the
     `\\?\C:\` form if `readlink` returns it), restarts there and walks the remaining names; no
     fixture creates `src/approvals`, so it meets a name missing inside a link's contents
     (`'dangling'`) and refuses; if Node does not tidy it, the walk lands in `.ctoc/approvals` and
     refuses. Every Windows sentence here is **believed** from Node's documented `path.win32`
     behaviour, never run: CI runs ubuntu-latest only (`.github/workflows/tests.yml` line 11,
     **read**). Refused under both readings — and refused today too, by today's `'dangling'`
     branch, so this row guards and does not discriminate (Decision 34);
   - the tidied reading (main session): `src/X` a folder link to a second temporary folder
     `<other>/deep/sub` (made in the case, removed in a `finally`) and `src/N` a folder link to
     `<project>/.ctoc/approvals`: Write `<project>/src/X/../N/y.json` refused (as written it
     leads to `<other>/deep/N/y.json`, absent and unprotected; tidied it is `src/N/y.json`, which
     the link puts in the approval records — Decision 18);
   - allowed (`allowedBoth`): Write `<project>/src/a/../b.js` with `src/a` a real folder and no
     link; Write `<project>/src/new/../b.js` with `src/new` absent; Write
     `<project>/src/L/missing/../x.json` (lands in `.ctoc/state/x.json`, not a record); Bash
     `echo x > src/a/../b.js`.
   Red today: every refused row except the tidied-reading row (green today: the hook resolves the
   tidied path now) and the two-link row (green today: refused as `'dangling'`); green today: the
   allowed rows. The assertions are identical on every
   platform: the hook never asks the platform how to open the path, it walks it with `lstat` and
   `readlink`, and folder links are junctions with absolute targets. On Windows, where the path
   layer removes `..` by text before following links (believed), a refusal of an as-written row
   may be an over-refusal (the Risks row on Windows).
8. **A link whose target is spelled with ſ is refused** — `src/l` a folder link to
   `<project>/.ctoc/ſtate/verify`: Write `src/l/y.json` refused (`REFUSAL`). On a folding disk the
   link resolves and identity refuses; where the disk does not fold the link dangles and the
   dangling-link refusal applies. Red today on a folding disk, green where it does not fold
   (record which).
9. **Another copy's records: a look-alike spelling and a link from this project are refused** — a
   second temporary folder `<other>` (`fs.realpathSync(fs.mkdtempSync(…'pr-oth-'))`, removed in a
   `finally`) holding `.ctoc/state/verify/x.json`. Write `<other>/.ctoc/ſtate/verify/x.json`, and,
   with `src/o` a folder link to `<other>/.ctoc/state/verify`, Write `src/o/y.json`: refused
   (`REFUSAL`; the folded name test on the path and on the real path). Red today.
10. **Ordinary files stay allowed** — `allowedBoth` for Write `src/x.js` (absent), Edit of the
    existing `src/e.js` (`'x'` to `'y'`), Write over `src/e.js`, Write `.ctoc/ſtate/notes.md` (a
    look-alike of an unprotected folder), Write `.ctoc/state/verify-notes.md`, Write
    `src/ſtreaming.js`, Write `src/streaming/answers.jsonl`; Bash `echo x > src/x.js`, Bash
    `ls .ctoc/ſtate`. Green today and after (guards: the fold and identity refuse nothing ordinary).
11. **The shell's link test compares by identity — THE HOOK-LEVEL IDENTITY PROOF** — Bash
    `echo x > .ctoc/ſtate/verify/x.json`: refused with `REFUSAL` when
    `sameFileOnDisk(<project>/.ctoc/state, <project>/.ctoc/ſtate)`, else allowed (the platform's
    true behaviour: the shell's text rules stay unfolded by the owner's ruling, and on Linux the
    command writes a different file). On the shell nothing but the link test's identity
    comparison can refuse this row, so on a folding disk it proves identity in the loaded hook.
    Red today on a folding disk.
12. **A file or an unreadable folder where a protected folder is expected locks nothing out** —
    the threat modeler's lock-out. (i) `.ctoc/state` removed (recursively) and written as a file
    (`x`); `src/V` a folder link to `<project>/.ctoc/state/verify` (a link may point through a
    file). `allowedBoth` for Write `src/x.js`, Bash `rm -f src/x.js` and Bash `npm test`; refused
    (`REFUSAL`, main session) Write `.ctoc/state/verify/x.json` (by name, a guard) and Write
    `src/V/x.json` (its own path runs into the file). (ii) `.ctoc/state` restored as a folder
    holding `verify/`, then `fs.chmodSync(<project>/.ctoc/state, 0o000)`, with the mode restored
    to `0o755` in a `finally` before the fixture is removed: the same five rows, the same answers.
    On Windows (`chmod` does not stop a folder from being searched) and for a process running as
    root, the folder stays searchable, so the same five answers come through the ordinary path —
    identical assertions on every platform, never skipped. Red today: the three allowed rows of
    (i) and of (ii) where the folder is really unsearchable; green: the refused rows.
13. **A decision the hook cannot finish within its budget is refused** — the wiring of the
    budget. A preload file `preload = p('budget-spent.js')`, written with `fs.writeFileSync` and
    holding, with `RPC = path.join(REPO, 'src', 'lib', 'real-path-confinement.js')` (the file the
    hook at `ENTRY` resolves, so the wrapper lands on the instance the hook uses) embedded by
    `JSON.stringify(RPC)` so a Windows path keeps its backslashes:
    `const c = require(<JSON.stringify(RPC)>); const set = c.setDeadline;`
    `c.setDeadline = (at) => { if (typeof set === 'function') set(typeof at === 'number' ? Date.now() - 1 : at); };`
    — a deadline already past whenever `decide()` sets one. The spawn is local to the case, and
    the file's shared `run()` is left unchanged (other cases and other plans call it, Decision 15):
    `spawnSync(process.execPath, ['--require', preload, ENTRY], { cwd: project, input: JSON.stringify(write(p('src', 'x.js'))), encoding: 'utf8' })`.
    That Write (main session): refused with `REFUSAL`; the same Write through `run()` (no
    preload): allowed (the control). Red today (no `setDeadline` exists, so the wrapper never runs
    and the Write is allowed). The wrapper never throws, so `decide()`'s wrapped budget line
    (Decision 35) does not change this case.
14. **A release missing the resolver still runs the shell's text rules** — the wrapped budget line
    (Decision 35). Its own fixture, beside the file's "when the protection cannot run" harness
    (which copies only two files, so `decide()` dies at its `project-root` require and cannot show
    this): a temporary plugin folder (`fs.realpathSync(fs.mkdtempSync(…'pr-nores-'))`, removed in a
    `finally`) receiving a copy of the whole `<REPO>/src` tree by a short recursive copy in the
    case (`readdirSync` with `withFileTypes`, `mkdirSync`, `copyFileSync`; not `fs.cpSync`, which
    Node 18 — the `engines` floor, `>=18`, read — marks experimental), then
    `<plugin>/src/lib/real-path-confinement.js` deleted; spawned with
    `run(input, { entry: <plugin>/src/hooks/protect-records.js })`. Rows: main session Bash
    `echo x > .ctoc/approvals/a.json` refused with `REFUSAL` (the text rule's sentence; without the
    wrap it would be `REFUSAL_UNCHECKED` from the fail rule); main session Bash
    `cat .ctoc/approvals/a.json` allowed (without the wrap, refused with `REFUSAL_UNCHECKED`); a
    background agent's Bash `echo x > .claude/settings.json` refused with the dependency plan's
    `REFUSAL_AGENT_SETTINGS_UNCHECKED` (its `agentSettingsSpecs` requires the resolver and throws;
    the same sentence with or without the wrap — a guard); main session Write
    `.ctoc/approvals/a.json` refused with `REFUSAL` (`isProtectedLedgerPath`'s arithmetic, before
    any resolver require; without the wrap, `REFUSAL_UNCHECKED`); main session Write `src/x.js`
    allowed (`namesProtected`'s require throws and the fail rule finds no record word; the same
    with or without the wrap — a guard). Green today (no budget line exists; the agent row once
    the dependency plan is built). **To verify** at Step 8: the copied `PreToolUse.Bash.js`,
    `PreToolUse.Edit.js` and everything `decide()` loads on their paths load without the
    resolver — read for the top-level requires of `PreToolUse.Bash.js`, `PreToolUse.Edit.js`
    (hard: `path`, `fs`, `safe-fs`, `hook-deny-signal`; the rest, `plan-coverage` and the resolver
    included, fail-soft), `safe-fs`, `state-manager`, `crypto`, `ui`, `shell-write-targets`,
    `hook-deny-signal` and `project-root` (none requires `plan-coverage` or the resolver), not for
    the inline requires of `bashRefuses`; if the first shell row or the `.ctoc/approvals/a.json`
    Write comes back `REFUSAL_UNCHECKED`, STOP and report to the CTO Chief.

Every existing case of the file, the dependency plan's block included, runs unchanged and green.

### Test plan — `tests/a-link-cannot-leave-the-repository.test.js` (MODIFY; Step 8, written first)

The file already tests `resolvesUnder` directly (cases 1–14, **read**). One new describe block at
the end, "the protected folder is compared by file identity (owner, 2026-10-15)", cases numbered
from one above the file's last case number at build time (15 today). Fixtures: the file's own
`makeProject()` (**read**, lines 44–53: `plans/in-progress`, `plans/todo`, `.ctoc/approvals`,
`.ctoc/state/verify`, `src/lib`, in an `os.tmpdir()` folder NOT passed through `realpathSync`), with
`root` in this block set to `fs.realpathSync(makeProject())` so every expected real path below
compares as text, plus the folders, files and links a case names (folder links as junctions with
absolute targets, as above); `sameFileOnDisk` as above. `resolvesUnder`, `resolveExisting` and
`setDeadline` are required from `../src/lib/real-path-confinement`; `fileIdentity` is never
called directly (it may stay unexported, Implementation step 7). Mocks only at the `safe-fs`
boundary with `t.mock.method` (restored by `node:test`), on a project whose folder name holds the
sentinel `ctoc-identity-fault`, made by `fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-identity-fault-')))`
with `makeProject()`'s folders made inside it.
The mock shapes, spelled out (`realStat` is `safeFs.statSync` captured before mocking):

- **no identities:** `t.mock.method(safeFs, 'statSync', (p, o) => { const st = realStat(p, o); return o && o.bigint && String(p).includes('ctoc-identity-fault') ? Object.assign(Object.create(Object.getPrototypeOf(st)), st, { ino: 0n }) : st; })`;
- **a stat fault on one path:** `t.mock.method(safeFs, 'statSync', (p, o) => { if (o && o.bigint && p === KEY) throw Object.assign(new Error('injected'), { code: 'EACCES' }); return realStat(p, o); })`, with `KEY` named per row;
- **a stat fault above the root:** the same with the test `o && o.bigint && root.startsWith(p.endsWith(path.sep) ? p : p + path.sep) && p !== root` (a strict ancestor of the project root).

1. **A look-alike spelling of an existing protected folder is inside exactly when this disk opens
   it as that folder — THE UNIT IDENTITY PROOF** —
   `resolvesUnder('.ctoc/ſtate/verify/x.json', '.ctoc/state/verify', root)` equals
   `sameFileOnDisk(<root>/.ctoc/state, <root>/.ctoc/ſtate)` (the walk keeps the spelling `ſ`, so on
   a folding disk only identity can make it true); `.ctoc/STATE/VERIFY/x.json` is true everywhere
   (the text test, kept). With `src/h.yaml` hard-linked to `.ctoc/settings.yaml`,
   `resolvesUnder('src/h.yaml', '.ctoc/settings.yaml', root)` is true; with `src/b.js` hard-linked
   to `src/a.js`, `resolvesUnder('src/b.js', p, root)` is false for `p` in `.ctoc/approvals`,
   `.ctoc/state/verify`, `.ctoc/streaming`, `.ctoc/settings.yaml`.
2. **A protected folder that does not exist yet: its nearest existing parent and the folded
   missing names** — with `.ctoc/approvals` removed: `.ctoc/approvalſ/x.json`, `.ctoc/APPROVALS/x.json`
   and `.ctoc/approvals/x.json` are true; `.ctoc/approvals-old/x.json`, `.ctoc/x.json` and
   `src/lib/x.js` are false.
3. **A dangling link inside the store locks nothing out; one on the protected path still refuses
   everything** — with `.ctoc/streaming/questions/pending` removed and made a folder link to an
   absent `<root>/gone`: `resolvesUnder('src/x.js', '.ctoc/streaming', root)` is false and
   `resolvesUnder('.ctoc/streaming/answers.jsonl', '.ctoc/streaming', root)` is true. With
   `.ctoc/approvals` removed and made a folder link to an absent `<root>/gone2`:
   `resolvesUnder('src/x.js', '.ctoc/approvals', root)` is true (the dangling protected path —
   the forged-record shape — Decision 19).
4. **A link, then `..`, as the file system walks it** — `src/L` a folder link to `<root>/.ctoc/state`:
   - `resolvesUnder('src/L/../approvals/y.json', '.ctoc/approvals', root)` and the same with
     `<root>/src/L/../approvals/y.json` are true;
   - `resolveExisting(<root>/src/L/../approvals)` is `{ ok: true, real: <root>/.ctoc/approvals, reason: null, tail: [] }`;
   - with `src/a` a real folder: `resolveExisting(<root>/src/a/../b.js)` has `real` `<root>/src/b.js`
     and `tail` `['b.js']`; `resolvesUnder('src/a/../b.js', '.ctoc/approvals', root)` is false;
   - `resolveExisting(<root>/src/new/../b.js)` (`src/new` absent) has `real` `<root>/src/b.js`
     and `tail` `['b.js']`;
   - `resolveExisting(<root>/src/L/missing/../../approvals/y.json)` has `real`
     `<root>/.ctoc/approvals/y.json`; `resolveExisting(<root>/src/L/missing/../x.json)` has
     `real` `<root>/.ctoc/state/x.json`, and `resolvesUnder` of it for `.ctoc/state/verify` is false;
   - with `.ctoc/K` a folder link to `<root>/.ctoc/approvals`:
     `resolvesUnder('src/L/missing/../../K/y.json', '.ctoc/approvals', root)` is true (a link met
     after the climb is followed);
   - with `.ctoc/D` a folder link to an absent `<root>/gone3`:
     `resolveExisting(<root>/src/L/missing/../../D/y.json).reason` is `'dangling'`;
   - two links (`src/M` → `<root>/.ctoc/state`; `src/K2` with the relative contents
     `M/../approvals`, `'dir'` type; on Windows the junction form of hook case 7):
     `resolvesUnder('src/K2/y.json', '.ctoc/approvals', root)` is true on every platform, for the
     reasons hook case 7 gives (a guard: today's resolver also answers true, through its
     `'dangling'` branch, whichever way the JavaScript `realpathSync` reads a link's contents —
     Decision 34);
   - a chain `src/c1 → src/c2 → … → src/c41 → <root>/src` of 41 folder links:
     `resolveExisting(<root>/src/c1/x.js).reason` is `'loop'`; from `src/c2` (40 links) it is `ok`.
     The walk counts its own links with `lstat` and `readlink` on link-free paths, so after the
     build both answers are the same on every platform. Against TODAY's resolver (Step 8) and
     under Step 11 mutation (c) both rows are RECORDED, NOT PREDICTED: the JavaScript
     `realpathSync` asks the kernel to `stat` the link, which follows the whole chain, so the
     kernel's own limit decides (believed from recall: macOS 32 — both rows `'loop'`; Linux 40 —
     the 41-link row `'loop'`, the 40-link row `ok`).
5. **A protected folder that cannot be one holds nothing** — (i) `.ctoc/state` a file, `src/V` a
   folder link to `<root>/.ctoc/state/verify`: `resolveExisting(<root>/.ctoc/state/verify).reason`
   is `'not-a-folder'`; `resolvesUnder('src/x.js', '.ctoc/state/verify', root)` is false;
   `resolvesUnder('.ctoc/state/verify/x.json', …)` and `resolvesUnder('src/V/x.json', …)` are true.
   (ii) `.ctoc/state` a folder holding `verify/`, mode `0o000` (restored in a `finally`): the same
   three verdicts; `resolveExisting(<root>/.ctoc/state/verify).reason` is `'denied'` where the
   folder is really unsearchable (POSIX, not root), and `ok` is true on Windows and as root — the
   platform's true behaviour, never skipped.
6. **A disk without identities keeps the text verdicts** — the "no identities" mock on the
   sentinel project: `.ctoc/approvals/x.json` and `.ctoc/APPROVALS/x.json` true; `src/x.js` false;
   `.ctoc/approvalſ/x.json` false (the text cannot fold and no identity is given — the stated
   limit for such disks).
7. **Every new fault refuses, nothing throws, and the bounds hold** — each call wrapped in
   `assert.doesNotThrow`:
   - the "stat fault on one path" mock on the sentinel project with `KEY` = the project root, then
     = `<root>/.ctoc/approvals`, then = `<root>/src`: `resolvesUnder('src/x.js', '.ctoc/approvals', root)`
     is true in each run, false without the mock (the control);
   - the "stat fault above the root" mock: `resolvesUnder('src/x.js', '.ctoc/approvals', root)` is
     false (the chain stops at the root's identity, Decision 21);
   - `setDeadline(Date.now() - 1)`: `resolvesUnder('src/x.js', '.ctoc/approvals', root)` is true
     and `resolveExisting(<root>/src/x.js).reason` is `'resolve-failed'`; after
     `setDeadline(null)` (also in a `finally`) the first is false again.

Every existing case of the file runs unchanged and green; so do the other files that call the
resolver (`tests/a-dangling-link-is-not-a-path-inside-the-tree.test.js`,
`tests/enforcement-fault-arms.test.js`, `tests/the-whitelist-cannot-leave-the-repository.test.js`,
`tests/pretooluse-edit-coverage.test.js`'s `targetsStreamingLive` cases,
`tests/the-bash-channel-cannot-reach-the-ledger-through-a-link.test.js`,
`tests/ledger-forgery-closed.test.js`).

**Coverage targets:** every new branch of `real-path-confinement.js` is driven by a case above —
the walk's `..` arms (unit 4), the tail and dangling arms (unit 4, unit 3), `'denied'` (unit 5 on
the build machine), `'not-a-folder'` — produced only by the walk's file-with-more-to-walk line —
both ways (unit 5), `'loop'` (unit 4), the walk bound (the 4,200-segment case of
`tests/enforcement-fault-arms.test.js`), the deadline at the top of `resolvesUnder` (unit 7's
`resolvesUnder` row) and in the walk (unit 7's `resolveExisting` row), the basis rule (unit 5,
unit 3), the identity arms (units 1, 2, 6, 7), `setDeadline`'s clearing arm (unit 7). `protect-records.js`'s and `PreToolUse.Bash.js`'s changed lines by the spawned cases.
The global floor of `.ctoc/coverage-baseline.json` holds. **Known unreached on the build machine,
listed rather than faked:** `identityChain`'s deadline arm (the walk that precedes it in the same
call meets the deadline first), its `MAX_ANCESTOR_WALK` exhaustion (the root's identity or the
`dirname` fixed point ends every real walk first), the `EPERM` half of `'denied'`, and the
`'resolve-failed'` arm for an `lstat` error other than ENOENT, EACCES and EPERM — ENOTDIR there
needs a file swapped in mid-walk (a file with more to walk is refused before its child is asked),
and ENAMETOOLONG is reached only by a path the walk's own bound stops first on this machine
(believed); and the empty catch arm of `decide()`'s budget line, which only hook case 14 drives,
in a copy of `src/` outside the repository, so the coverage of `<REPO>/src/hooks/protect-records.js`
never sees it (believed; recorded at Step 14).

### Security review

- **Path traversal and links:** every target is walked as written, the way the file system walks
  it (`..` after a link is the link's real parent), and its tidied form is checked too; a link's
  contents are walked in its place under a 40-link budget; a name missing inside a link's contents
  refuses (`'dangling'`); a link cycle refuses (`'loop'`).
- **Spellings:** where the protected folder exists, identity decides, so a spelling refuses
  exactly when the disk opens it as that folder (measured on APFS: letter case and the long s
  do; seven other look-alikes do not). Windows aliases of an existing folder (8.3 short names,
  trailing dots and spaces, stream suffixes) rest on NTFS returning the same file ID — believed,
  not run on Windows. Where the folder does not exist yet, and for another copy, the folded name
  (NFKC, lower case) decides.
- **Hard links:** a hard link to the settings file has its identity and is refused; a hard link to
  a file inside a protected folder is not seen (cut, Decision 8; the existing stated limit).
- **A file or an unreadable folder in a protected folder's place:** holds nothing; refuses only
  targets whose own path runs into it. A dangling link or a loop there still refuses everything.
- **The waiting folder:** exempt by its folded name; in the loaded hook a link inside it, or put in
  its place, that leads into the store is refused by the real-path name test.
- **Fail direction:** every fault returns the refusing value; nothing throws out of a permission
  check (`resolvesUnder`'s outer catch, `resolveExisting`'s outer catch, `fileIdentity`'s total
  contract).
- **Denial of service and the timeout:** each walk is bounded by 4,096 segments and 40 links; the
  chain stops at the project root; and every decision runs under a 5-second budget past which the
  walks refuse — because a hook that times out lets the call run (measured). A file system that
  stalls inside one call (a hung network mount) is not bounded by the budget (stated).
- **Races:** a check made before the write cannot see a link swapped after it — a single agent can
  race itself with a background shell loop (stated, Decision 24).
- **Messages:** no new sentence; no path and no link contents are echoed.
- **No secrets, no personal information:** fixtures live in temporary folders.

## Acceptance criteria

- [ ] An editing-tool Write to `.ctoc/ſtreaming/answers.jsonl` or `.ctoc/ſtate/verify/x.json` is
  refused with the records sentence for the main session and for a background agent, on every
  platform ("the long-s attack …").
- [ ] The same holds for `approvalſ`, `.ctoc/ſettings.yaml`, `.ctoc/regulatory-regimeſ`, with the
  folders present and absent, and for upper-case, mixed-case and full-width spellings; a hard link
  to the settings file is refused (cases 2–4).
- [ ] On the build machine's disk the long s opens the real folder (`sameFileOnDisk` true), and the
  identity comparison alone refuses it: hook case 11 and unit case 1 (and the Step 11 mutation (a)).
- [ ] A link then `..` is judged where the file system goes, on the editing tools and the shell,
  for the approval records, the check records and the answers log; the tidied reading is still
  refused; ordinary `..` paths stay allowed (case 7; unit 4).
- [ ] A file or an unreadable folder where a protected folder is expected no longer refuses
  unrelated writes, and still refuses writes that run into it (case 12; unit 5).
- [ ] The waiting folder stays writable under every folded spelling; in the loaded hook a link
  inside it or in its place that leads into the store is refused (cases 5–6; unit 3).
- [ ] Another copy's records are refused under a look-alike spelling and through a link (case 9).
- [ ] Ordinary files stay allowed, including an existing file and look-alikes of unprotected names
  (case 10).
- [ ] A decision past its budget is refused (case 13; unit 7).
- [ ] A release missing the resolver still runs the shell's records text rules and the editing
  tools' arithmetic record checks with their own sentences, and a background agent's shell write
  to a settings file is still refused (case 14; Step 11 mutation (n)).
- [ ] `resolvesUnder` decides by identity where the folder exists, by the nearest parent's identity
  plus folded names where it does not, keeps every text verdict it gave, keeps the text verdicts on
  a disk without identities, and refuses on every new fault without throwing (unit cases 1–7).
- [ ] One identity helper (`fileIdentity`) and one segment fold (`foldSegment`) in the codebase,
  both in `real-path-confinement.js` (Step 11 critic's read).
- [ ] Every existing case of `tests/protect-records.test.js` (the dependency plan's included),
  `tests/a-link-cannot-leave-the-repository.test.js`, `tests/a-dangling-link-is-not-a-path-inside-the-tree.test.js`,
  `tests/enforcement-fault-arms.test.js`, `tests/the-whitelist-cannot-leave-the-repository.test.js`,
  `tests/pretooluse-edit-coverage.test.js`, `tests/the-bash-channel-cannot-reach-the-ledger-through-a-link.test.js`
  and `tests/ledger-forgery-closed.test.js` passes unchanged.
- [ ] `npm test`: 0 failed, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`;
  `npm run lint` and `npm run typecheck` clean, zero warnings; dead exports and unreachable files
  not higher than at Step 9; `hooks/hooks.json` byte-identical.
- [ ] The Step 12 medians and worst cases are quoted; an ordinary call over its stop, or a decision
  over the budget plus one second, stops the build.
- [ ] Live, after the owner releases it, on macOS: a Write to `.ctoc/ſtreaming/answers.jsonl` is
  refused for the main session and for a background agent, a Write into the waiting folder goes
  through, and a Write to `src/L/../approvals/y.json` through a planted link is refused, quoted as
  shown. Until the release this box stays open and is reported as not run.

### Acceptance criteria mapping

| Criterion | Implemented in | Test case |
|---|---|---|
| long-s and look-alike spellings refused | `resolvesUnder` (identity: `identityChain`, `anchorOf`, `passesThrough`), `namesProtected` | cases 1–4, 11; unit 1–2 |
| a link then `..`; the tidied reading | `resolveExisting` (the walk), `decide()` two readings, `operandResolvesIntoLedger`, `isLedgerWrite` raw prefix | case 7; unit 4 |
| no lock-out from a file or unreadable folder | `resolvesUnder` (`holdsNothing`), `resolveExisting` (`'not-a-folder'`, `'denied'`) | case 12; unit 5 |
| waiting folder | `targetsStreamingLive` (folded carve-out), `namesProtected` (real path) | cases 5–6; unit 3 |
| other copies | `namesProtected` (folded path and real path) | case 9 |
| nothing ordinary refused | `passesThrough` whole-segment compare, text test unchanged | cases 7, 10, 12; unit 2, 4 |
| budget, faults refuse, no throw, no-identity disks | `setDeadline`, `resolveExisting`, `identityChain`, `fileIdentity`, `decide()` | case 13; unit 6–7 |
| a missing resolver degrades the shell as today | `decide()`'s wrapped budget line | case 14 |
| one helper | moves in `protect-records.js` | Step 11 critic |

## Risks

| Risk | Mitigation | Where |
|---|---|---|
| A timed-out hook lets the call run (measured), so any slow path is a bypass | Each walk: at most 4,096 segments and 40 links; the chain stops at the project root; every decision under a 5-second budget, past which the walks refuse. Computed worst cases (believed, measured at Step 12): an editing-tool decision runs at most 2 readings × about 12 walks; a shell segment at most 128 candidates × 2 readings × the areas (five, plus the dependency plan's settings specs for an agent), and the number of segments in one command is not bounded — the budget is what bounds the shell | Decision 20; Step 12 |
| One system call that stalls (a hung network mount) is not bounded by the budget | Stated limit; no pre-write hook can bound a call it is inside | docs |
| Added `lstat`/`stat` calls on every editing-tool call of every session (one per path segment per walk, about twelve walks) and per shell operand the text tests miss; doubled for a target holding `..` | Measured at Steps 9 and 12 with a stop (Decision 9) | Step 12 |
| A race: a link swapped between the decision and the write — a single agent can race itself (a background shell loop swapping a link while its own editing call is in flight; planting links is allowed) | Stated residual; no pre-write hook closes it | Decision 24; docs |
| Claude Code's Write tool may tidy a path by text before opening it, or not (not verified) | Both readings are checked; either refusal refuses | Decision 18 |
| On Windows the path layer removes `..` by text before following links (believed), so the as-written walk can refuse a path Windows would open elsewhere (only a refusal) | The tidied reading is Windows's truth and is checked too | Decision 18; docs |
| Windows roots: the input and an absolute link's contents are each cut by their own parsed root (`/`, `C:\`, `\\server\share\`, a rooted `\` without a drive) and the walk restarts at `path.resolve`'s root of the same string, so a drive or a UNC server and share is never walked as a name; a rooted `\x` link is taken on the current drive, which may differ from the link's own drive (only a different real path, judged by the same rules) | Believed from Node's documented `path.win32` behaviour, never run: CI runs ubuntu-latest only (`.github/workflows/tests.yml` line 11, **read**); stated in `docs/ENFORCEMENT.md` as not run on Windows | Decisions 27, 28; docs |
| A disk without identities (inode 0: some FAT and network volumes) | Identity is skipped there and the text test decides (unit case 6); a look-alike of a not-yet-existing folder is then caught only by the folded name tests | `passesThrough` |
| On Linux a look-alike name is a different file, yet the folded name tests refuse it | Accepted false refusal of names nobody uses legitimately; the identity test itself allows it (unit 1, case 11) | Decision 3 |
| Windows: 8.3 short names, trailing dots and spaces, streams of an existing folder rest on NTFS returning the same file ID (believed); a not-yet-existing folder spelled with a letter NTFS folds but Unicode lower-casing does not (the dotless ı) is not caught; ReFS 128-bit IDs may be truncated, which can only add refusals (believed) | Stated in `docs/ENFORCEMENT.md`, labelled not run on Windows | docs |
| A dangling link or a link loop on a protected folder's path still refuses every write | Intended (the forged-record shape); the docs say what such a refusal means | Decision 19; docs |
| Hard links into protected folders are not seen | Stated limit (cut, Decision 8; Neighbours) | docs |
| The shell: text rules unfolded, so a look-alike spelling of ANOTHER copy's records (a worktree writing its main checkout's) passes on the shell; the link test measures against the session's own root; operands beyond 128 per segment | Stated limits (the owner's ruling: text is a guard against honest mistakes; isolating agents is the barrier) | docs, Neighbours |
| `resolveExisting`'s rewrite changes the fault reason of a path through a file from `'resolve-failed'` to `'not-a-folder'` for `escapesRoot`'s report too | No test asserts that reason (searched: `ENOTDIR|not-a-folder|reason: '` over the resolver's test files, 0 assertions on it; a-dangling case 9 asserts only `escapes: true`) | Step 14 |
| A release missing `real-path-confinement.js`: the new budget line could throw before the shell branch and hand every shell call to the fail rule | The line is wrapped; the editing tools reach the fail rule as today, the shell keeps its text rules with their own sentences and loses only the link test (as today); a background agent's shell settings write is refused by the dependency plan's crash line | Decision 35; case 14 |
| The dependency plan's question may drop its `fileIdentity` | Step 9 reads the built file; Implementation step 7 covers both outcomes | Step 9 |
| Other plans touch the same files | The scheduler builds plans that share a file one at a time; whichever builds later merges into the current file | — |

## Decisions Taken Under Ambiguity

1. **The text test stays in `resolvesUnder`, identity is added beside it.** Dropping it would turn
   verdicts that existing cases pin (a case variant on Linux, `.CTOC/Approvals/x.json`) into
   allows; keeping it loses nothing, and identity answers what the text cannot.
2. **The waiting-folder exemption is by the Unicode-folded name, short-circuit kept** (the CTO
   Chief's ruling on critic finding 1, round 1). `targetsStreamingLive` applies NFKC to the
   normalized path before its carve-out and arithmetic tests (`isUnderProtectedDir` already folds
   letter case). The identity design does not give this more simply: by identity the waiting
   folder IS inside the store, so identity alone would refuse it. The earlier design's waiting
   folder argument to `resolvesUnder` (`exceptRelative`, the waiting anchor, the "no link on the
   way" check) existed to close the residual of a link inside the waiting folder, which the CTO
   Chief cut to Neighbours; it is removed.
3. **The root-independent name tests read the Unicode-folded path and real path**
   (`namesProtected`, reusing the dependency plan's `foldedName`). Identity can only be measured
   against this session's root; a worktree's main checkout is another root. On Linux this refuses
   a look-alike name that is a different file (belt and braces, the same choice the dependency plan
   made for the settings files). Reading the real path also closes another copy's records reached
   through a link from the editing tools, and — as a consequence, not the cut machinery — refuses
   in the loaded hook a link inside the waiting folder, or put in its place, that leads into the
   live store (case 6): the real path names the store outside the waiting folder.
4. **The fold is NFKC then lower case** (the brief, and the dependency plan's fold): it maps the
   long s, the Kelvin sign and full-width forms. It does not map the dotless ı; for an existing
   folder identity covers it, for a not-yet-existing one on Windows it is a stated limit
   (believed).
5. **ONE identity helper, ONE segment fold, both in `real-path-confinement.js`.** That module is
   the one place that asks the file system where a path leads (its header), and a library cannot
   require a hook. `protect-records.js` keeps no copy; its module-level fold arrow goes, and the
   require moves inside the agent-only functions, so no first-party require is added at top level.
6. **A resolution fault refuses a waiting-folder write too**, through the other areas' checks
   (`isProtectedLedgerPath` and the rest resolve every target), as today. The ordinary new pending
   file never meets a fault.
7. **`resolveExisting` returns `tail`**, so the existing part of a real path is known without a
   second walk and a disk without identities is not mistaken for an absent path.
8. **Withdrawn (round 1, the CTO Chief's cut):** the hard-link search (`holdsLinkTo`,
   `MAX_LINK_SCAN` and their cases) is not built; hook logic changes only with the owner's explicit
   approval, and he approved identity for spellings. Listed under Neighbours for him to schedule.
   What identity gives without it: a hard link to the settings FILE is refused (Decision 23).
9. **Cost stops at Step 12.** More than 20 ms added to the median of an ordinary call (the main
   session's Write of an absent file, Edit of an existing file, Write into the waiting folder,
   Write of a path holding `..`, Bash `ls`, a five-operand `git add`, and a background agent's
   Write) stops the build and is reported to the CTO Chief — tighter than the dependency plan's
   50 ms because these checks run on every call of every session. Any measured decision longer
   than the budget plus one second (6 s) also stops the build: the budget is then not doing its
   job. The adversarial worst cases are quoted with their numbers.
10. **The unloaded edit hook changes with the shared functions.** `PreToolUse.Edit.js` and
    `PreToolUse.Bash.js` are not registered; their `targetsStreamingLive`, record checks and link
    test are shared with the loaded hook and give the same answers in both, which is what "fix it
    once" means here. The decision budget is set only by the loaded hook.
11. **Withdrawn (round 1):** "`exceptRelative` outside the protected folder refuses" — the parameter
    is removed (Decision 2).
12. **`tests/enforcement-fault-arms.test.js` is not edited; its header's line ranges for
    `real-path-confinement.js` move** (restated in round 1: `resolveExisting` is rewritten, so the
    earlier claim that no line above 262 moves no longer holds). Each of its cases still reaches a
    refusal with the reason it asserts (**read**, lines 242–319): the `path.resolve` mock keyed on
    the target throws at the walk's root query inside `resolveExisting`'s outer `try`
    (`'resolve-failed'`); the 4,200-segment case walks mocked-absent segments into the tail until
    `MAX_ANCESTOR_WALK` (`'resolve-failed'`); the `resolveBasis` catch case still mocks the
    JavaScript `realpathSync`, which `resolveBasis` still calls; the `escapesRoot` and
    `resolvesUnder` catch cases mock `path.isAbsolute`, still called on the target inside each
    function's `try`. No test reads the header (searched: `RANGES COVERED` in `src/`, `tests/`,
    `.ctoc/`, 4 test files, each a comment). Listed under Neighbours.
13. **Seven files in one plan**, against the one-to-three slice rule: the owner's decision is one
    rule in one shared resolver, its three callers in the loaded hook (the record checks, the
    hook's own `decide()`, the shell's link test), and their tests and documentation; splitting it
    would ship a resolver that two of its call sites still bypass by tidying the path first. No
    file is created, so no documented count moves.
14. **No new refusal sentence.** A look-alike spelling of a record is a record write; it gets the
    records sentence. A decision past its budget gets the sentence of the check that refused.
15. **The cases are named, not numbered, in this plan**: other plans add cases to the same files.
16. **The folded carve-out can also EXEMPT a different place inside the store.** On a disk that
    does not fold, `.ctoc/streaming/queſtions/pending/x.json` is a new folder inside the store, yet
    its folded name is the waiting folder's, so it is allowed. A full-width solidus (U+FF0F) is
    never a path separator on any platform, so `.ctoc/streaming/questions/pending／x.json` (hook
    case 5's row) is ONE file of that name in the live `questions/` folder on EVERY platform, and
    its folded name is in the waiting folder, so it is allowed — harmless: `sanitizeRef` turns
    every character outside `A-Za-z0-9._-` into `_` (**read**, lines 109–116), so a live question
    name can never hold `／` and this file never equals one. Because the carve-out folds before its
    last tidying (Decision 33), a full-width `．．` or `pending／..／x.json` folds to `..` and is
    tidied OUT of the waiting folder, so it is refused (the record name test refuses it too) — an
    over-refusal of a name nobody uses, accepted. (Round 1 said a full-width solidus made a new
    folder; it does not — corrected in round 2.) Accepted, because no reader looks there
    (**read**): live question files are flat, `<root>/.ctoc/streaming/questions/<sanitized-ref>.json`
    (`questionsPath`, `streaming-precompute.js` lines 128–132; `sanitizeRef`, lines 109–116, turns
    `/` and `\` into `__` and every other non-plain character into `_`, so a live name never holds
    a folder), and the sweeper reads only the one folder `questions/pending`, not recursively
    (`streaming-questions-sweeper.js` lines 68, 93 and 272–282). Search: `'streaming',\s*'questions'|streaming/questions`
    over `src/`, 8 files, each match read; the others are comments, recipes, the hook's own
    constants and `golden-corpus-scan.js`. Round 2, for the file the full-width solidus puts
    directly in `questions/`: no live reader LISTS that folder (search `readdirSync|readdir\(|opendirSync|globSync`
    over `src/`, 56 files; the 7 of them that also name `streaming` read, plus `opendir\(|\.readdir\b|glob\(`,
    3 files, none about the store, **read**): the sweeper lists only `questions/pending`;
    `sufficiency-audit.js` line 154 lists the approval records; `declared-breadth.js` counts files
    matching a plan's declared globs; `human-facing-scan.js` walks `src/`; `golden-corpus-scan.js`
    lists `questions/` recursively and reads its `.json` files only with `measureProduction: true`
    (line 394), to measure sizes — its live caller (`iron-loop-enforcer.js` line 1008) passes no
    options, and only `tests/golden-corpus-fence.test.js` line 411 passes it (round 1's "reads no
    question file" holds for the live path only). Every live question file is opened by its
    computed name (`questionsPath`). On macOS the `queſtions` write lands in the real waiting
    folder; the full-width-solidus write lands in `questions/` there too.
17. **The resolver walks the path as written, reading each link (threat-model finding 1, the CTO
    Chief's design).** Segment by segment with `lstat`; a link's contents (`readlink`) walked in its
    place under a 40-link budget (Linux's own limit; macOS stops at 32, so the walk never refuses
    a chain the kernel would open); `..` the physical parent of the real path so far; a missing
    name starts the tail, where `..` removes the tail's last name and, past it, takes the physical
    parent of the real path; a name missing inside a link's contents is `'dangling'`. This reverses
    the module's earlier "rejected alternative" (following the link one hop), rewritten in place in
    the header, because the JavaScript `realpathSync` tidies `..` by text, inside a link's contents
    too (**believed** from Node's `lib/fs.js`; no row here settles it — Decision 34 — and the walk
    does not rest on it, because it reads each link itself).
    `fs.realpathSync.native` was weighed and not chosen (Architecture decision). The fixed reason
    vocabulary gains one word, `'not-a-folder'`.
18. **Both readings of a path are checked: as written and tidied.** The CTO Chief's design asks for
    the raw target; this plan keeps the tidied reading beside it because three readings exist and
    none is verified for every writer: Claude Code's Write tool may tidy the path by text before
    opening it (not verified); the Windows path layer removes `..` by text before following links
    (believed); bash's default `cd` is logical (it tidies the `cd` target by text), while `cd -P`,
    `set -P` and bash's fallback when the tidied folder is missing move physically. So
    `protect-records.decide()` runs its checks on the as-written path and, when it differs, on the
    tidied one; the shell's link test resolves the operand both ways (a raw `cd` prefix beside
    today's tidied one); either refusal refuses. The name tests stay on the tidied text
    (`normalizeForProtection`, `foldedName`, the shell's `resolvedRe` test): they are the tidied
    reading. Call sites that keep the tidied form only: `escapesRoot` (not on the loaded hook's
    path; Neighbours) and the dependency plan's background-agent settings check (its own rule
    refuses a settings name reached through `..`).
19. **A protected folder that cannot be one holds nothing (threat-model finding 2).** When the
    protected path faults with `'not-a-folder'` (a file on its path) or `'denied'` (a folder this
    user cannot search), `resolvesUnder` answers by the target alone: a target that resolves is not
    inside; a target whose own path runs into the same file or unsearchable folder faults and is
    refused. The hook runs as the same user as the tool it guards (believed), so what the hook
    cannot search the write cannot reach either. Every other fault on the protected path — a
    dangling link, a loop, any other error — still refuses every target: a dangling link at
    `.ctoc/state` is the shape of a record forged at the link's destination and read by the menu
    through the link. Not a new class: with `.ctoc/state` a file, one shell command that removes
    it, puts a link or a folder there and writes into it now passes where the lock-out refused it,
    but the same sequence passes today against an ordinary folder — the stated limit "replacing a
    parent folder" in `docs/ENFORCEMENT.md`.
20. **A 5-second budget on a decision's file-system walks (threat-model finding 4) — KEPT by the
    CTO Chief in round 2.** A timed-out hook lets the call run (measured in the owner's trial of
    2026-10-15), so a decision that cannot finish in time must refuse rather than time out: a
    deadline that fails closed closes that bypass. The walks must be bounded in time, not only in
    steps: the shell's link test runs once per candidate, per area, per reading, per segment, and
    the number of segments in one command is not bounded (today too).
    `protect-records.decide()` calls `setDeadline(Date.now() + 5000)`; past it `resolvesUnder`
    refuses at its entry, before the root lookup (Decision 32), and every walk and chain refuses.
    The budget is checked only inside `resolvesUnder` and the walks: Node's start-up and the text
    rules' work on a long command are outside it. 5 seconds is about fifty
    times an ordinary decision (believed; measured at Step 9) and well under the believed default
    timeout of a Claude Code command hook (60 seconds — `hooks/hooks.json` sets none; Step 9 reads
    the value from Claude Code's documentation and records it; if it is under 10 seconds, the
    build stops and reports). Only the loaded hook sets it, a fresh process per call, so no test
    process and no menu process is affected. It is a new refusal rule on every call and it also
    bounds a shell path that is unbounded today; the CTO Chief ruled both acceptable for the
    bypass it closes.
21. **The identity chain stops at the project root's identity** (critic finding 5): no protected
    entry lies above the root, and stopping saves a `stat` per ancestor on every walk.
22. **The CTO Chief ruled that the call-site changes fall under the owner's OK.** The owner's
    paragraph names `protect-records.js`, `resolvesUnder` and `targetsStreamingLive`. Finding 1 is
    exactly "where a path really leads", and closing it needs the resolver they route through
    (`resolveExisting`), `decide()`'s target (inside `protect-records.js`) and the shell's link test
    (`PreToolUse.Bash.js`: `resolveTokenPath`, `isLedgerWrite`'s raw prefix,
    `operandResolvesIntoLedger`); the CTO Chief ruled these in scope on 2026-10-15. The decision
    budget (Decision 20) is this plan's means of meeting finding 4; the CTO Chief kept it in
    round 2.
23. **A hard link to the settings file is refused; it is stated, not searched for.** The settings
    file is a protected FILE, so its anchor is its own identity, and a hard link has that identity.
    No new code serves it; a test row pins it (case 2, unit 1) so the documentation's sentence is
    true.
24. **The race is a stated residual (threat-model finding 3).** A check made before the write
    cannot see a link swapped after it, and one agent can race itself (a background shell loop
    swapping a link while its own editing call is in flight; planting links is allowed). No
    pre-write hook closes it; nothing is built for it.
25. **The plan's claims are restated to what the design delivers (threat-model finding 5):** "whatever
    spelling reaches it", "whatever links it passed through", "never trusts a name" and "the limits
    are listed" are replaced by the claim list at the top, the Security review and the Risks table,
    each limit named.
26. **`effort: medium` (the CTO Chief's ruling, round 2: seven files and a resolver rewrite), and
    what it changes at Steps 12–14: nothing.** `recordRefinementGate` reads the plan's `effort:`
    (`src/lib/actions.js` line 764, **read**) and records the advisory verdict of
    `refinement-loop.shouldRunLoop`; its caller is `applyIronLoop` (line 681), which
    `approvePlan` calls when a plan moves to the todo queue (line 503) — call sites read, not run. `shouldRunLoop` turns the
    refinement loop on only for `high` or `xhigh` (`src/lib/refinement-loop.js` lines 491–492,
    **read**) or when a `files:` entry matches a glob of `.ctoc/config/refinement-triggers.yaml`;
    none of the seven declared files matches one (the list read in full: money and access, data
    integrity, compliance, health, personal data, cryptography, infrastructure — no `security/`,
    `audit/` or other listed folder is on any declared path). So the loop stays off, exactly as
    under `small`: Steps 12, 13 and 14 run as single passes as written — the Step 12 measurements
    with their stops, one `security-scanner` dispatch at Step 13, `npm test` with lint and
    typecheck at Step 14. No critic loop, no loop journal.
27. **The input is cut by its own parsed root (critic finding 1, round 2).** Round 1 cut the input
    by the length of `path.resolve`'s root, which on Windows can differ from the input's own root
    (a rooted `\x` without a drive resolves to `C:\x`, so a three-character root cut a
    one-character one and ate two letters of the first name). Now `rest` is the input after
    `path.parse(abs).root`, and the walk starts at `path.parse(path.resolve(abs)).root`; the
    `path.resolve(abs)` call stays, because `tests/enforcement-fault-arms.test.js`'s resolve-fault
    case depends on it (lines 247–253, **read**). On POSIX both roots are `/` and nothing changes.
    Windows: believed, not run (Risks).
28. **An absolute link's contents are cut by their own root (critic finding 2, round 2).** Round 1
    split the whole contents into names, so on Windows a drive `C:` or a UNC server and share was
    walked as a folder name below the root. Now `lr = path.parse(contents).root`, the names are
    those after it, and when `lr` is not empty the walk restarts at
    `path.parse(path.resolve(contents)).root` (a drive root or a UNC root). Hook case 7's Windows
    sentence is corrected: before this, its conclusion ("refused") held only by accident, through
    a bogus name meeting `'dangling'`. Every Windows statement here is believed from Node's
    documented `path.win32` behaviour, never run: CI runs ubuntu-latest only
    (`.github/workflows/tests.yml` line 11; all five `runs-on` lines in `.github/workflows/` are
    `ubuntu-latest`, **read**).
29. **Step 11 mutation (c) is today's body returning its own `tail` (critic finding 3, round 2).**
    Defined as today's `resolveExisting` body unchanged except that it returns `tail` — the array
    its `unshift` builds, outermost first — and `tail: null` on a fault, so the new identity code
    still runs and only the walk's meaning changes (`..` tidied by text first, links followed by the
    JavaScript `realpathSync`, ENOTDIR answered as `'resolve-failed'`). The red rows are
    re-derived in Step 11 from today's code (lines 119–170, **read**); they now include case 12
    (i)'s allowed rows and unit 5 (i)'s `'not-a-folder'` and false rows (today's ENOTDIR
    answer brings the lock-out back) and unit 7's `resolveExisting` deadline row, and exclude the
    two-link rows (Decision 34) and the 41- and 40-link rows (Decision 30).
30. **The 41-link and 40-link rows are recorded, not predicted, against today's resolver (critic
    finding 4, round 2).** Today's JavaScript `realpathSync` `stat`s each link it meets, and the
    kernel follows the whole chain inside that call, so its own link limit decides (believed from
    recall: macOS 32, Linux 40). After the build the walk counts its own links, so both rows are
    asserted on every platform. They leave the Step 8 red and green lists and mutation (c).
31. **Unreachable branches removed rather than claimed (critic finding 5, round 2).** The
    `if (linked) return fault('dangling');` inside the tail branch is deleted and its invariant is
    stated in a comment (a link's segments are popped before any other and a missing one returns
    `'dangling'` before the tail can start; a link is met only while the tail is empty). The
    `lstat` ENOTDIR line is deleted: ENOTDIR falls through to `'resolve-failed'`, which still
    refuses (only a file swapped in mid-walk can give it, since a file with more to walk is refused
    as `'not-a-folder'` before its child is asked). Chosen over listing a dead `'not-a-folder'`
    branch: one producer of `'not-a-folder'`, driven by unit 5; the fall-through is listed as
    known unreached.
32. **The deadline is checked at the top of `resolvesUnder` (critic finding 6, round 2)**, after
    the input checks and before `resolveBasis`, whose `realpathSync` is not bounded by the walk's
    check. Unit 7's `resolvesUnder` deadline row drives it; its `resolveExisting` row drives the
    walk's check. `identityChain`'s check stays listed as unreached.
33. **The waiting-folder carve-out folds before its last tidying, on the project-relative path
    (critic finding 7, round 2) — a deviation from the literal form first ruled, ACCEPTED by the
    CTO Chief in round 3.** The ruling's form, `normalizeForProtection(String(filePath).normalize('NFKC'))`,
    folds the ABSOLUTE path before `normalizeForProtection` relativizes it with
    `path.relative(process.cwd(), …)`: in a project whose own folder name NFKC changes (a
    decomposed accent, a ligature, a full-width letter) the folded path no longer starts with the
    unfolded working folder, relativizes to `../…`, comes back null, and every write into the
    waiting folder is refused; and `String(null)` would become the text "null". So the plan writes
    `const rel = normalizeForProtection(filePath); const folded = rel === null ? null : normalizeForProtection(rel.normalize('NFKC'));`
    — the same intent (fold, then tidy, so `pending／..／x` leaves the waiting folder), applied to
    the relative path. The literal form is not built; it survives only as Step 11 mutation (m),
    where hook case 5's project-folder row (a project folder named with the ligature `ﬁ`) is the
    evidence: green with this form, red under the literal one. Decision 16 is corrected and hook
    case 5 gains the full-width-solidus row.
34. **The two-link row guards; it does not discriminate (found while re-deriving mutation (c),
    round 2).** With `src/K2` holding the relative contents `M/../approvals`, today's resolver
    refuses `src/K2/y.json` whichever way the JavaScript `realpathSync` reads the contents: tidied
    by text, it leads to the absent `src/approvals`, so `realpathSync` answers ENOENT, `lstat`
    finds the link and today's `'dangling'` branch refuses; read as written, it lands in
    `.ctoc/approvals`. So the row is green today and under mutations (c) and (d), and it cannot
    settle the belief about the JavaScript `realpathSync`; those claims are removed (the
    Architecture "Rejected" paragraph, Decision 17, unit 4, Step 8). The belief stays labelled
    believed; the design does not rest on it. Not done: a real `src/approvals` folder in the
    fixture would make the row bite on macOS and Linux, but on Windows the junction (tidied at
    creation) would then really lead there and the true answer would be "allowed", splitting the
    assertion by platform. The CTO Chief ACCEPTED this in round 3: the row stays a guard on every
    platform, with no `src/approvals` fixture.
35. **The budget line is wrapped so a missing resolver cannot change the shell's degradation (the
    CTO Chief's ruling, round 3).** Unwrapped, a release missing `real-path-confinement.js` would
    throw at `decide()`'s first new line, before the Bash branch, and the fail rule would replace
    every shell text rule: a record READ (`cat .ctoc/approvals/a.json`) refused, and a record write
    refused with the crash sentence instead of the rule's own. Wrapped, the editing tools reach
    the fail rule as before and the shell keeps today's soft degradation. Corrected against the
    ruling's wording, from the code: the editing tools' first throw is now at `namesProtected`'s
    inline require (it runs before `isRegimeFile`, and `isRegimeFile` now calls it too), not at
    `isRegimeFile`'s; and the dependency plan's agent settings rule does NOT still run on the
    shell — its `agentSettingsSpecs` requires the resolver inline (that plan, line 510), so the
    call reaches the fail rule and is refused with `REFUSAL_AGENT_SETTINGS_UNCHECKED` (that plan's
    crash line; its `SETTINGS_MENTION_RE`, `/settings(\.local)?\.json/iu`, line 319), the same
    sentence with or without the wrap. Hook case 14 pins each: the shell's records write refused
    with `REFUSAL` and its records read allowed, the agent's settings write refused with the
    crash sentence, the editing tools' arithmetic refusal of a record with `REFUSAL` and their
    ordinary Write allowed through the fail rule; mutation (n) shows the wrap is what keeps the
    two shell rows and the arithmetic refusal on their own sentences. The catch holds a comment
    and no statement; no fence forbids that in `src/` (the one catch-body fence,
    `tests/skip-guard-integrity.test.js`, scans test files only, **read**).
36. **Hook case 13 spawns locally; the file's `run()` is unchanged (the CTO Chief's ruling, round
    3, which offered an `args` option on `run()` or a local `spawnSync`).** Chosen: the local
    `spawnSync(process.execPath, ['--require', preload, ENTRY], { cwd: project, input, encoding: 'utf8' })`,
    because `run()` is shared by every case of the file and by other plans' blocks (Decision 15),
    and a one-case need does not justify widening it.
37. **Round 3's list corrections (the CTO Chief's rulings).** Step 11 mutation (a): case 2's
    hard-link row is red there and named as the exception to "cases 1–4, 8 and 9 stay green".
    Mutation (b): case 5's `queſtions` and full-width-solidus rows are red on every platform (the
    unfolded record name test refuses both). Step 8: unit 4's rows are named one by one; the two
    no-link `resolveExisting` rows assert `tail` and are red today, only the no-link
    `resolvesUnder` row is green, and the `src/L/missing/../x.json` rows are green today (as
    mutation (c) already said).

## Neighbours (seen, not built here; scheduling is the owner's)

- Hard links: a hard link to a file inside a protected folder (a record) is not seen on any
  channel; the earlier draft's bounded search of the protected folder (cut in round 1) would
  close it for an existing file with two or more links.
- `targetsStreamingLive` in the unloaded edit hook still exempts by name a link inside the waiting
  folder that leads to a live file (its docblock residual); the loaded hook refuses it through the
  real-path name test.
- The waiting folder can grow without bound: an agent may create any number of files under
  `.ctoc/streaming/questions/pending/`, and the sweeper reads it non-recursively.
- The shell's text rules are not Unicode-folded (the owner's ruling): a look-alike spelling of
  another copy's records written from the shell (a worktree agent and its main checkout's
  `.ctoc/ſtate/verify/`) is not caught; the link test measures against the session's own root. The
  dependency plan reads agent shell commands folded for the settings files; the same reading for
  the records would close it.
- `escapesRoot` (plan coverage, the edit hook's whitelist) still reads the tidied path only and
  does not see a hard link to a file outside the repository (its header residual).
- The dated line-range list in the header of `tests/enforcement-fault-arms.test.js` (and its comment
  "the bound is MAX_ANCESTOR_WALK = 4096", which stays true): the ranges for `resolveExisting` and
  `resolvesUnder` move with this plan.
- The dependency plan's Step 11 prediction that only its folded shell reading catches
  `echo x > src/m/ſettings.json` no longer holds on macOS after this plan (the link test now
  catches it by identity); its tests still pass.
- The dotless ı (and any letter NTFS upper-cases onto an ASCII letter that lower-casing does not
  reach) for protected folders and settings files that do not exist yet, on Windows (believed).
- On a case-sensitive disk (Linux) the waiting-folder carve-out is case-insensitive, so
  `.ctoc/streaming/questions/PENDING/x.json` — a different folder there — is allowed, as it is
  today. No reader looks there (Decision 16).

## Execution Plan

### Step 8: TEST
- [ ] Write the tests first: the new describe block at the end of `tests/protect-records.test.js` with its fixture, helpers and the fourteen cases of the test plan, case "the long-s attack …" FIRST; and the new describe block at the end of `tests/a-link-cannot-leave-the-repository.test.js` with its seven cases, each numbered from one above its file's last case at build time and titled with the names used here.
- [ ] Before anything else, ask the build machine's disk: record the platform, the file system, and `sameFileOnDisk(<scratch>/.ctoc/state, <scratch>/.ctoc/ſtate)`. If it is false (the disk does not open `ſtate` as `state`), STOP and report to the CTO Chief: the identity proof (hook case 11, unit case 1) cannot be shown on this machine. Do not record and continue.
- [ ] Run `node --test tests/protect-records.test.js tests/a-link-cannot-leave-the-repository.test.js`. Record red, by case: hook cases 1, 2, 3, 9 and 13 on every platform; 4's ſ and ｓ rows; 5's `queſtions` row and full-width-solidus row; 6(a) and 6(b)'s first row; 7's refused rows except the tidied-reading row and the two-link row; 8 and 11 where the disk folds; 12's allowed rows (in (ii) where the folder is really unsearchable). Unit cases: 1's long-s row where the disk folds and its settings hard-link row; 2's `approvalſ` row; 4's rows `resolvesUnder('src/L/../approvals/y.json', '.ctoc/approvals', root)` and its absolute form `<root>/src/L/../approvals/y.json`, the `resolveExisting(<root>/src/L/../approvals)` deep-equal, `resolveExisting(<root>/src/a/../b.js)` and `resolveExisting(<root>/src/new/../b.js)` (each asserts `tail`, which today's resolver does not return), the climb row `resolveExisting(<root>/src/L/missing/../../approvals/y.json)`, the climb-then-link row `resolvesUnder('src/L/missing/../../K/y.json', '.ctoc/approvals', root)` and the dangling-after-climb row `resolveExisting(<root>/src/L/missing/../../D/y.json).reason`; 5's false rows and its reason rows; 7's stat-fault rows and deadline rows (also because `setDeadline` is not exported yet). Record green (guards): hook case 10, case 14 (if its first row comes back `REFUSAL_UNCHECKED`, STOP and report, as the case says), 4's letter-case rows, 5's other rows, 6(b)'s second row, 7's tidied-reading row, two-link row and allowed rows, 8 and 11 where the disk does not fold, 12's refused rows; unit 1's `STATE` and ordinary hard-link rows, 2's other rows, 3, 4's no-link row `resolvesUnder('src/a/../b.js', '.ctoc/approvals', root)` (false), its two `src/L/missing/../x.json` rows (`resolveExisting`'s `real` `<root>/.ctoc/state/x.json` and `resolvesUnder` of it for `.ctoc/state/verify` false: today's text tidying gives the same answer) and its two-link row (Decision 34), 6, 7's above-root row; and every existing case of both files. Any difference from this list is explained before Step 10, not waved through.
- [ ] Record, not predict, unit 4's 41-link and 40-link rows against today's resolver, with the platform: today's JavaScript `realpathSync` lets the kernel follow the chain, so its link limit decides (believed: macOS 32 — both `'loop'`, so the 40-link row is red there; Linux 40 — the 41-link row `'loop'`, the 40-link row `ok`). After Step 10 both rows are green on every platform (Decision 30).

### Step 9: PREPARE
- [ ] Confirm the dependency plan is built in this branch: `protect-records.js` holds `foldedName` and `isAgentSettingsTarget`, and `real-path-confinement.js` exports `resolveExisting`. Record whether `protect-records.js` holds `fileIdentity` (Implementation step 7: "keep" or "drop").
- [ ] Re-read every line this plan cites in the four source files; anchor each change on its quoted text.
- [ ] Read Claude Code's documentation for the default timeout of a command hook and record it with its source. If it is under 10 seconds, STOP and report to the CTO Chief (Decision 20).
- [ ] Run `node --test tests/a-dangling-link-is-not-a-path-inside-the-tree.test.js tests/a-link-cannot-leave-the-repository.test.js tests/enforcement-fault-arms.test.js tests/the-whitelist-cannot-leave-the-repository.test.js tests/pretooluse-edit-coverage.test.js tests/the-bash-channel-cannot-reach-the-ledger-through-a-link.test.js tests/ledger-forgery-closed.test.js tests/protect-records.test.js tests/export-reachability.test.js tests/reachability.test.js` before any source change; record the existing cases green.
- [ ] Record the before-numbers: dead exports, unreachable files.
- [ ] Measure the median of 20 spawned runs of the hook, in a scratch project holding `src/e.js` (`x`), `src/a/` and a `.ctoc/` with the usual folders, for the seven ordinary calls of Decision 9 (the main session's Write of the absent `src/x.js`, Edit of `src/e.js`, Write into the waiting folder, Write of `src/a/../x.js`, Bash `ls`, Bash `git add a b c d e`; a background agent's Write of `src/x.js`) and Bash `git add` with 128 operands. Eight medians, the time baseline.

### Step 10: IMPLEMENT
- [ ] `src/lib/real-path-confinement.js`: the four header paragraphs rewritten in place and the budget paragraph added; `MAX_LINK_HOPS`, `SEPARATORS` and `deadline` after `MAX_ANCESTOR_WALK`; `resolveExisting` replaced and `segmentsOf` added after it; `escapesRoot` untouched; `resolvesUnder` replaced; `setDeadline`, `foldSegment`, `fileIdentity`, `existingOf`, `anchorOf`, `identityChain`, `passesThrough` added after it with their JSDoc; the exports line (without `fileIdentity` in the "drop" outcome).
- [ ] `src/hooks/PreToolUse.Edit.js`: `targetsStreamingLive`'s body and the two docblock additions, as specified.
- [ ] `src/hooks/PreToolUse.Bash.js`: `resolveTokenPath`'s third parameter, `isLedgerWrite`'s `rawPrefix` and its call, `operandResolvesIntoLedger`'s two readings, with their docblocks.
- [ ] `src/hooks/protect-records.js`: `DECISION_BUDGET_MS` and the budget line in `decide()`, wrapped in its `try`/`catch` (Decision 35); the two readings in `decide()`; `namesProtected` added; `isRegimeFile` calls it; `fileIdentity` and the `foldSegment` arrow removed, with `isAgentSettingsTarget` and `protectedSettingsFiles` calling `real-path-confinement`'s (or step 7's "drop" branch); comments naming the moved helpers updated.
- [ ] Run the Step 8 files; expect green, on the platform recorded at Step 8.

### Step 11: REVIEW
- [ ] Before the critic, prove the guards can fail — each change run once, its red rows quoted, then reverted; record the platform and whether its disk folds the long s (if it does not, STOP and report, as at Step 8). (a) `passesThrough` always false (identity off): red are unit 1's long-s row and settings hard-link row, unit 2's `approvalſ` row, case 2's hard-link row and case 11's long-s row — case 11's row and unit 1's long-s row are the identity proof: on this machine nothing but identity refuses them. Cases 1–4 (except case 2's hard-link row), 8 and 9 stay green (the folded name tests refuse them too). (b) `namesProtected` reduced to today's unfolded test on the path only: red are case 9, case 6 (a) and (b)'s first row, and, where the disk does not fold, cases 1 and 2's long-s rows and the ſ rows of case 4; the full-width row of case 4 everywhere; case 5's `queſtions` row and full-width-solidus row (every platform). (c) `resolveExisting`'s body back to today's (lines 119–170: `path.resolve`, then the JavaScript `realpathSync` with the ancestor walk, ENOTDIR as `'resolve-failed'`), changed only to return its own `tail` — the array its `unshift` builds, outermost first — and `tail: null` on every fault, so the identity code still runs (Decision 29): red are unit 4's link-then-`..` rows (both `resolvesUnder` forms and the `resolveExisting` deep-equal), the `src/L/missing/../../approvals/y.json` climb row, the climb-then-link `K` row and the dangling-after-climb `D` row; unit 5 (i)'s `'not-a-folder'` reason row and its `src/x.js` false row; unit 7's `resolveExisting` deadline row; case 7's refused editing and shell rows except the tidied-reading row and the two-link row; case 12 (i)'s three allowed rows. Green under (c): unit 4's no-link `tail` rows and the `src/L/missing/../x.json` rows, the two-link row (Decision 34), unit 5 (ii), unit 7's `resolvesUnder` deadline row and case 13 (refused at `resolvesUnder`'s entry). Unit 4's 41-link and 40-link rows are recorded, not predicted (Decision 30). (d) `decide()` on the tidied reading only: red are case 7's editing-tool rows whose target holds `..`, except the tidied-reading row (the two-link row has no `..`, so its two readings are one); its shell rows stay green. (e) `decide()` on the as-written reading only: red is case 7's tidied-reading row. (f) `operandResolvesIntoLedger` on the tidied candidate only: red are case 7's shell rows. (g) `rawPrefix` replaced by `prefix`: red is case 7's `cd -P` row only. (h) the basis rule back to `if (!realProtected.ok) return true;`: red are case 12's allowed rows and unit 5's false rows. (i) a name missing inside a link's contents pushed onto the tail instead of `'dangling'`: red are unit 4's dangling-after-climb row, unit 3's dangling-protected-path row (`src/x.js` against `.ctoc/approvals`: the anchor becomes the root plus `gone2`, which `src/x.js` does not pass through) and the dangling-link cases of `tests/a-dangling-link-is-not-a-path-inside-the-tree.test.js` that assert `'dangling'` or a refusal. (j) the chain not stopping at the root's identity: red is unit 7's above-root row. (k) the budget line removed from `decide()`: red is case 13. (l) the carve-out in `targetsStreamingLive` on `rel` (unfolded) instead of `folded`: red are case 5's look-alike rows, the full-width-solidus row included. (m) the literal form of the CTO Chief's ruling, `const folded = normalizeForProtection(String(filePath).normalize('NFKC'));`: red is case 5's project-folder row only (Decision 33). (n) the budget line's `try`/`catch` removed (the bare `require(…).setDeadline(…)` line): red are case 14's two main-session shell rows and its `.ctoc/approvals/a.json` Write row (each becomes `REFUSAL_UNCHECKED` from the fail rule); its agent row and its `src/x.js` Write row stay green (Decision 35). Any red outside a prediction, or a predicted red that stays green, is explained before the critic runs. After the last revert, both Step 8 files are green.
- [ ] Dispatch `iron-loop-critic`: read the calls, not text matches — every fault in the new code returns the refusing value and nothing can throw out of `resolvesUnder` or `resolveExisting`; nothing tidies the target before the walk (no `path.join`, `path.resolve` or `normalize` on it, apart from the walk's two root queries — the input's and an absolute link's, each cut by its own parsed root); both readings reach every real-path arm in `decide()` and in the shell's link test; the waiting folder is exempt by its folded name only, folded on the project-relative path before its last tidying (Decision 33); the basis rule refuses on every fault but `'not-a-folder'` and `'denied'`; the budget is set once per decision and only by the loaded hook, on a line whose resolver require cannot throw out of `decide()` (Decision 35); one `fileIdentity` and one `foldSegment` remain, both in `real-path-confinement.js`; the order of the checks in `decide()` is unchanged (records, regulatory settings, the agent settings check); no first-party require at top level in `protect-records.js` beyond `hook-deny-signal`.

### Step 12: OPTIMIZE
- [ ] Measure the eight medians of Step 9 again and quote them beside the baseline. More than 20 ms added on any of the seven ordinary calls stops the build and is reported to the CTO Chief with the numbers (Decision 9).
- [ ] Measure the adversarial worst cases once each and quote their wall time and verdict: (w1) an editing-tool Write whose target runs through the deepest nested folders this machine's path limit allows, made in the scratch project, then 60 missing names; (w2) Bash `cp x` followed by 128 operands each running through those folders, the segment repeated four times with `;`. Each must finish within the budget plus one second (6 s) — refused at the budget when it runs past it; a longer decision stops the build and is reported (Decision 20).
- [ ] Confirm by reading that an ordinary target costs one `lstat` per segment per walk and that the chain stops at the root.

### Step 13: SECURE
- [ ] Dispatch `security-scanner` on the diff: spellings (letter case, the long s, the Kelvin sign, full-width forms, zero-width and soft-hyphen characters, composed and decomposed accents, the dotless ı, Windows trailing dots and spaces, stream suffixes, 8.3 names); identity (inode 0, ReFS identifiers, a stat fault on the chain, network volumes, a hard link to the settings file and to a record); links (into an area, `..` after a link, two links with `..` in a link's contents, a climb out of a missing tail onto a link, at and inside the waiting folder, a link target spelled with the long s, dangling, looping, 40 and 41 links; Windows roots — a drive, a UNC share, a rooted path without a drive — in the input and in a link's contents, read from the code since none is run); a file or an unreadable folder in a protected folder's place, and a dangling link there; folders that do not exist yet; another copy's records (a worktree and its main checkout); the shell (text unfolded, the link test's two readings, `cd -P`, `set -P`); races; cost and the budget (a slow file system, many operands, many segments, deep folders); the fail direction (nothing throws, every fault refuses). It confirms each limit under Risks is real and names any missing one.

### Step 14: VERIFY
- [ ] Run `npm test` (the gated entry point): 0 failed, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [ ] Run `npm run lint` (zero warnings) and `npm run typecheck` (zero errors, the `bigint` stat, the `readlinkSync` string and the `deadline` type included).
- [ ] Run the Step 9 suites again (`tests/the-whitelist-cannot-leave-the-repository.test.js` included): green; dead exports and unreachable files not higher than at Step 9 (in both outcomes of Implementation step 7: no new dead export); `hooks/hooks.json` byte-identical.

### Step 15: DOCUMENT
- [ ] `docs/ENFORCEMENT.md`, section "The one loaded hook — write protection for the records": a new paragraph after the regulatory-settings paragraph (and after the dependency plan's settings paragraph) and before "**What it refuses:**": "**Where a path really leads — compared by file identity (the owner's decision of 2026-10-15).**" — every editing-tool target is walked the way the file system walks it (a `..` after a symbolic link goes to the link's real parent) and also read tidied (`..` removed by text), and either reading landing in a protected area refuses; each is compared with each protected area by file identity (device and inode), not by spelling, so a spelling the disk opens as a protected folder (letter case, the long s ſ on macOS; believed on Windows) is refused; a protected folder that does not exist yet is compared through its nearest existing parent's identity and its Unicode-folded missing names (NFKC, then lower case); a hard link to the settings file has that file's identity and is refused; the waiting folder stays writable under every Unicode-folded spelling of its name; the root-independent test reads the folded path and the folded real path, so another copy's records count under a look-alike spelling or through a link, and a link inside the waiting folder that leads into the store is refused; a file, or a folder the session cannot search, where a protected folder is expected refuses only the writes that run into it; a decision whose file-system walks run past 5 seconds is refused, because Claude Code lets a call run when its hook times out (the budget does not cover Node's start-up or the text rules' work); on the shell the text rules stay a guard against honest mistakes (the owner's ruling of 2026-10-15) and the link test the shell runs on each operand calls the same function on the operand as written and tidied; held by `tests/protect-records.test.js` and `tests/a-link-cannot-leave-the-repository.test.js`, their case numbers as built.
- [ ] A new sentence at the end of that paragraph: "If every write is refused, a protected folder's path (`.ctoc/approvals`, `.ctoc/state/verify`, `.ctoc/streaming`, `.ctoc/regulatory-regimes`, or `.ctoc/settings.yaml`) is a dangling symbolic link or a link loop: the hook refuses everything then, because a dangling link there is how a record is forged at the link's destination."
- [ ] In "What it cannot catch", new list lines appended after the last item (after the dependency plan's lines), the existing line "hard links; more than 128 operands in one segment; …" left exactly as it is: a hard link to a record (a file inside a protected folder) is not seen on any channel — only one to the settings file is; on the shell, a look-alike spelling of another copy's records (the text rules are not folded; the link test measures against the session's root); on a case-sensitive disk (Linux) a look-alike name is a different file, which the folded name tests refuse anyway; a disk without identities (inode 0) falls back to the real path's text in any letter case, as before; Windows aliases of an existing folder (8.3 names, trailing dots and spaces, streams) are caught by identity, read from the code and not run on Windows, while a not-yet-existing folder spelled with a letter Windows folds but lower-casing does not (the dotless ı) is not; a link swapped between the decision and the write — one agent can race itself with a background shell loop; a file system that stalls inside one call (a hung network mount) can hold the hook past Claude Code's timeout, which lets the call run.
- [ ] All edits are additive: no existing sentence of `docs/ENFORCEMENT.md` is reworded or removed (`tests/claude-md-keeps-every-rule.test.js` holds a frozen inventory; searched `hard links|symbolic link|replacing a parent` in `tests/fixtures/claude-md-rule-inventory.json`: 0 matches, and no line is changed anyway); no new sentence says a hard link to a record is refused.
- [ ] The header comment of `src/hooks/protect-records.js`: in WHAT IT REFUSES, after the editing-tools sentence, a sentence saying the target is read as written and tidied and each reading is compared with each area by file identity through `real-path-confinement.resolvesUnder`, the waiting folder by its Unicode-folded name, the root-independent test on the Unicode-folded path and real path, and a decision past 5 seconds refused; in WHAT IT CANNOT CATCH, "hard links" stays as written, and the shell's unfolded look-alike of another copy's records, a link swapped mid-call and a stalled file system are added.
- [ ] Run `node --test tests/claude-md-keeps-every-rule.test.js tests/protect-records.test.js` after the edits; green.

### Step 16: FINAL-REVIEW
- [ ] Dispatch `iron-loop-critic` against every acceptance box; each box quotes its evidence, including the Step 8 disk answer, the Step 11 reds and the Step 12 medians and worst cases.
- [ ] After the owner releases it: in a real session on a scratch CTOC project on macOS, a Write to `.ctoc/ſtreaming/answers.jsonl` from the main session and from a background agent is refused, a Write to `.ctoc/streaming/questions/pending/x.json` goes through, and, with `src/L` a planted link to `.ctoc/state`, a Write to `src/L/../approvals/y.json` is refused; quote each answer exactly as shown. Until the release, report this box as not run.
