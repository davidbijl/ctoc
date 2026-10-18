---
title: "A background agent is refused when it writes Claude Code's settings files or CTOC's .ctoc/settings.json"
type: implementation
created: 2026-10-15
priority: high
effort: small
depends_on: none
files:
  - src/hooks/protect-records.js
  - src/hooks/PreToolUse.Bash.js
  - src/lib/real-path-confinement.js
  - tests/protect-records.test.js
  - tests/agent-tool-grants.test.js
  - agents/infrastructure/deployment-setup.md
  - docs/ENFORCEMENT.md
---

# A background agent is refused when it writes Claude Code's settings files or CTOC's .ctoc/settings.json

## The owner's order (2026-10-15)

> "fix that gap"

Tijn van der Zant's order, given on 2026-10-15 about the gap measured below. It is his explicit
OK to change the logic of the write-protection hook (`src/hooks/protect-records.js`, the one
CTOC hook Claude Code loads) for this fix. The plan still crosses to the build in the menu, as
every plan does; `src/hooks/**` stays on the protected enforcement list.

Written by the implementation planner on 2026-10-15, dispatched by the CTO Chief; revised the
same day in refinement round 1 by the Iron Loop integrator from the critic's and the threat
model's findings, dispatched by the CTO Chief, and in round 2 from the critic's six findings
(Decisions 27 to 32); in round 3 from the critic's finding that no allowed case targets an
existing ordinary file (Decision 33); and, after the branch was rebased onto the finished fix
"the main session may run the menu's question step however it wraps the call", refreshed
against the current text of `src/hooks/protect-records.js`, `tests/protect-records.test.js`
and `docs/ENFORCEMENT.md` (Decision 34). Every claim below is labelled **read** (read in
this branch's files this session), **measured** (the owner's trial or the CTO Chief's
measurement, cited as given), **documented** (Claude Code's own documentation, quoted with the
date it was read), **believed** (recall, not checked here) or **to verify** (checked by a named
step before anything is built on it). Nothing was run by the planner or the integrator.

**What this plan claims, and no more:** a background agent whose payload carries `agent_id` is
refused editing-tool writes to the protected files (by file identity and by folded name) and,
as a mistake guard, shell writes that name them — the project's, a worktree's main checkout's,
and the active Claude config folder's — while the loaded hook is intact. It is not a
containment boundary; isolating agents is.

## Problem statement

**Measured** in a trial on 2026-10-15, Claude Code 2.1.300, macOS:

- In bypass permission mode, which is how the owner runs Claude Code, a background agent's
  Write tool rewrote the project's `.claude/settings.json` and `.claude/settings.local.json`
  with no prompt. Edit reaches the same files by the same reasoning (believed; not measured).
- A new `env` block (`NODE_OPTIONS` was used) and a new hook took effect on the very next tool
  call in the same session; a restart also picked them up.
- The sandbox refused only the shell route: writes, renames and appends to those two files and
  to the whole `.claude` folder were refused with "Operation not permitted".
- So any agent can switch off or route around CTOC's own protections, plant a hook that fakes a
  review, or inject code into every later `node` process.

**Measured** on 2026-10-15 by the CTO Chief, itself a background agent dispatched by the main
session (not the main thread): the installed hook (6.14.125) refused the chief's own compound
Bash calls naming the menu with its background-agent sentence, which only `subagentMenuRefusal`
behind `isSubagent` emits. So on Claude Code 2.1.300 a background agent's Bash payload carries a
non-empty `agent_id`, and the hook's exit 2 really blocked those calls. The session's permission
mode was not read (believed: bypass, the owner's habit). **To verify** at the Step 16 live
probe: that an editing tool's payload carries `agent_id` too, and that a hook's exit 2 blocks a
Write in bypass mode. That the main thread's calls carry no `agent_id` rests on documentation
(below), not on a capture.

**Measured** on 2026-10-15 by the CTO Chief on this Mac (APFS), in a scratch project: a path
spelled with the long s (U+017F, `ſ`) opens the real file — `.claude/ſettings.json` is the same
inode as `.claude/settings.json`, and `.ctoc/ſtate/verify/x.json` the same as
`.ctoc/state/verify/x.json`. A JavaScript regular expression with `/i` does not fold `ſ` to `s`
(only `/iu` or NFKC normalisation does); `fs.realpathSync`, which `resolveExisting` uses through
safe-fs, returns the path as spelled, and only `fs.realpathSync.native` folds it. The installed
hook refuses the plain spellings of a check record and of the answers log but ALLOWS their
long-s spellings (exit 0), for the main session and for a background agent. That hole in the
records protection is outside this plan; it is listed first under Neighbours, reported to the
owner for his scheduling. For this plan it means: every name test here would miss the long-s
spelling of a settings file, so the matcher below tests file identity and folds names.

**Documented** (code.claude.com, read on 2026-10-15 by the CTO Chief):

- "User settings (`~/.claude/settings.json`)"; "If you set CLAUDE_CONFIG_DIR, every `~/.claude`
  path on this page lives under that directory instead" (the `.claude` directory page);
  `settings.local.json` is listed "Project only".
- "When a subagent calls a tool, tool events such as PreToolUse and PostToolUse fire the same
  configured hooks as in the main conversation, and the input carries the agent_id and
  agent_type common input fields that identify the subagent" (hooks page). Earlier, on
  2026-10-07, installed version 2.1.291, the coordinator read: "Present only when the hook fires
  from within a subagent … Absent for the main thread, even in --agent sessions" (quoted in
  `plans/done/ctoc-keeps-working-and-asks-only-what-matters-s2-plans-cross-on-their-evidence.md`,
  Decision 16).
- "Exit with code 2 to block the action … a PreToolUse hook blocks the tool call". Bypass mode
  is not mentioned there.
- Hooks can also be declared in skill frontmatter, subagent frontmatter and a plugin's
  `hooks/hooks.json`; "Direct edits to hooks in settings files are normally picked up
  automatically by the file watcher".
- **Not documented:** which folder the project `.claude/` is relative to, and whether
  `~/.claude/settings.json` is still read when `CLAUDE_CONFIG_DIR` is set. Neither decides this
  plan: the name test is root-independent, and `<home>/.claude/settings.json` stays covered by
  the `.claude` name rule (editing tools) and the `.claude/settings.json` text rule (shell)
  whatever `CLAUDE_CONFIG_DIR` says.

**Read** in this branch:

- `src/hooks/protect-records.js` protects the approval records, the check records, the
  owner's answers and live question files, `.ctoc/settings.yaml` and `.ctoc/regulatory-regimes/`.
  No check names `.claude/settings.json`, `.claude/settings.local.json`, the user-level settings
  file or `.ctoc/settings.json`. The editing-tool branch of `decide()` never looks at `agent_id`.
- `.ctoc/settings.json` holds switches that later calls obey: `general.entry_point.command`, the
  command `src/lib/app-runner.js` runs at the verification step (`ENTRY_POINT_KEY`, line 120);
  `git.autoPushEnabled`, the human ship gate (`src/lib/settings.js` `isAutoPushEnabled`, line
  305, reading `.ctoc/settings.json`, line 171); the `deployment` block, which
  `src/lib/deployment.js` reads from `.ctoc/settings.json` (line 59) and whose `dry_run: false`
  makes the pipeline really push; and `workflow.enforcementMode` and `general.environment`,
  which the unloaded edit hook reads (`docs/ENFORCEMENT.md`, lines 30 and 38). Nothing protects
  it today.
- `isSubagent(payload)` (protect-records.js, line 434) is true only for a non-empty string
  `agent_id`. If a background agent's call carried no `agent_id`, every check here would stay
  silent and behaviour would be today's; measured above for Bash, to verify for the editing
  tools at Step 16.
- `src/lib/project-root.js` `describeProjectRoot` stops its walk at a `.git` entry (file or
  folder) and returns that folder, so an agent working in a worktree at
  `<main checkout>/.claude/worktrees/<name>/` gets the worktree as its project root. The main
  checkout's `.claude/settings.json` is then `../../settings.json` from that root, and its
  `.ctoc/settings.json` is `../../../.ctoc/settings.json`.
- `src/lib/regex-utils.js` `escapeRegExp` escapes `-` as `\-` (`METACHAR`, line 32). Under the
  `u` flag an escaped `-` outside a character class is a syntax error (believed; the Step 8
  fixture folder names contain `-`, so every case of the new block fails loudly if it is).
- `src/lib/real-path-confinement.js` states hard links as an open residual (header, "OPEN
  RESIDUAL"): real-path resolution cannot see them; inode comparison can.

## Scope

A background agent — a PreToolUse payload with a non-empty `agent_id` — is refused, while the
loaded hook is intact:

1. any Write, Edit, MultiEdit or NotebookEdit whose target is one of the protected files below:
   by file identity (device and inode, after links) when the target exists, and by folded name
   on the lexical path and on the real path for every target, which is what catches a fresh
   create. This is the real fix for the editing tools, within the limits under Risks;
2. a shell command that writes one of them, by the existing text rules (`isLedgerWrite` with one
   spec per file: per segment, `cd`-aware, link-aware), read twice — as written, and folded. The
   owner decided on 2026-10-15 that text matching is a guard against honest mistakes, with
   honest claims about its limits, and that isolating agents is the real barrier. For the
   `.claude` folder the sandbox already refuses the shell route (measured). For
   `.ctoc/settings.json` no sandbox claim was measured in this trial; the owner's earlier sandbox
   note of 2026-10-14 says `.ctoc` stays writable (believed, not re-measured), so there the text
   rule is the only guard on the shell.

The protected files:

| # | File | How it is found |
|---|---|---|
| a | the project's `.claude/settings.json` and `.claude/settings.local.json` | identity; folded name: a `.claude` path segment followed by the file name, anywhere in the path |
| b | the same two in every worktree; seen from a worktree, the main checkout's two and its `.ctoc/settings.json` | the same name tests (root-independent); identity, and on the shell a link-test spec, for the main checkout's three files when the root sits in `<x>/.claude/worktrees/<name>` |
| c | the user-level settings file in the active Claude config folder, `<config>/settings.json`, where `<config>` is `CLAUDE_CONFIG_DIR` when set and not empty, else `os.homedir()/.claude` | identity; folded exact match against its lexical path and its real path. The config folder's `settings.local.json` is not a documented file and is not on the list (Decision 17); `<home>/.claude/settings.local.json` is still covered by row a's name rule |
| d | CTOC's own `.ctoc/settings.json` | identity (the project's, and the main checkout's from a worktree); folded name: `.ctoc` followed by `settings.json` as the last two segments |

The main session (no `agent_id`, or an empty one) is not refused on any channel: the owner edits
settings through it. Its decisions stay byte for byte what they are today: every new check runs
only behind `isSubagent(payload)`. The only new code that runs for every call is module-level:
the built-in `require('os')`, literal constants and the `foldSegment` arrow, none of which can
throw.

Not in scope, listed under Neighbours: the long-s hole in the records protection, the plugin's
own hook files in the plugin cache, hooks declared elsewhere, hook and status-line scripts that
existing settings run, `.npmrc`, MCP server files, managed settings, and shell routes the text
rules cannot read. `hooks/hooks.json` is unchanged: its matcher already covers the five tools
(the case "hooks/hooks.json registers exactly the one protection").

**Not a duplicate of** `plans/todo/settings-files-cannot-turn-edit-protection-off.md` (read
whole). That plan changes `src/hooks/PreToolUse.Edit.js`, which Claude Code does not load, for
every session, so the enforcement mode cannot be lowered through `.ctoc/settings.yaml` or
`.ctoc/settings.json`. It does not close this gap (no loaded hook would run it, and it does not
touch `.claude/`), and the two plans share no file.

## Implementation Details

### Architecture decision

One rule, three channels, all inside the hook that is already loaded. One function lists the
protected files for both channels (`protectedSettingsFiles`).

- **Editing tools:** any one of three tests refuses.
  1. *Identity* — the target exists and its device and inode (a `bigint` `stat`, following
     links) equal those of a protected file that exists. This catches every spelling the file
     system folds (the long s and letter case on APFS), every link, and hard links: for these
     files it closes the hard-link residual that `real-path-confinement.js` states open. A stat
     fault on a protected file drops only that file, never a blanket refusal; a stat fault on the
     target other than "does not exist" refuses.
  2. *Folded name* — on the lexical absolute path and on the real path, for every target
     (existing or not, so a protected file outside the enumerated list — another checkout's,
     a worktree's seen from the main checkout — is still caught, Decision 18). The fold is
     NFKC, then `\` read as `/`, NTFS stream suffixes and Windows trailing dots and spaces
     dropped per segment, `.` and `..` resolved, then lower case; every name pattern carries the
     `u` flag. The real path comes from the ONE resolver CTOC has, `resolveExisting` in
     `src/lib/real-path-confinement.js`, exported for this instead of a second link resolver in
     the hook (a second copy is the drift that module exists to prevent). A fault of the
     target's real path refuses.
  3. *The `..` rule* — a settings file name reached through a `..`.
- **Shell:** `PreToolUse.Bash.isLedgerWrite` with one frozen spec per protected file, as
  `SETTINGS_SPEC` and `REGIMES_SPEC` do for `.ctoc/settings.yaml`, every pattern with the `iu`
  flags. Each spec is tried twice: on the command as written, and — only when NFKC changes the
  command — on the NFKC-folded command; both readings run the text tests and, when the spec has a
  `dir`, the link test (Decision 27, superseding the round-1 text-only folded reading). The
  folded reading can only add a refusal for that one command; a folded operand that names no
  existing file is not a fault, because `resolveExisting` walks up to the nearest existing
  folder. The agent block runs after the regulatory-settings specs (Decision 28). A spec
  carries a `dir` for the link test only when that file's path relative to the project root is a relative path whose real path
  resolves without a fault AND is not an existing directory (a stat fault there counts as "might
  be a directory"); otherwise the spec has the two text tests only. That is the hard rule: no
  configuration — a config folder that does not exist, one on another drive, a dangling or
  looping settings link, a settings path that is a folder, a config folder at the filesystem
  root — may make the link test fault on, or contain, every operand, because `resolvesUnder`
  returns true on a fault and true for anything inside a protected folder, and would then refuse
  every non-read command of every agent. `isLedgerWrite` gets one explicit condition so that a
  spec without `dir` really runs no link test (today an absent `dir` silently falls back to the
  approval-ledger folder through a default parameter).
- **Crash:** a crash on a background agent's call whose tool input, NFKC-folded, mentions
  `settings.json` or `settings.local.json` refuses with its own sentence; the main session's
  crash behaviour is unchanged.

### Dependency graph

```
Claude Code ──PreToolUse──> hooks/hooks.json (unchanged)
  └─> src/hooks/protect-records.js  main() → decide()
        ├─ editing tools ─> isAgentSettingsTarget() ─┬─> fileIdentity() ──> src/lib/safe-fs.js  statSync (existing)
        │                                            ├─> protectedSettingsFiles() ─> configDir() ─> os.homedir (built in)
        │                                            └─> src/lib/real-path-confinement.js  resolveExisting (EXPORT)
        ├─ Bash ─────────> agentSettingsSpecs() ─┬──> protectedSettingsFiles()
        │                                        ├──> fileSpec() ─┬─> src/lib/real-path-confinement.js  resolveExisting
        │                                        │                ├─> mayBeDirectory() ──> src/lib/safe-fs.js  statSync
        │                                        │                └─> unicodeLiteral() ──> src/lib/regex-utils.js  escapeRegExp, safeRegExp (existing)
        │                  bashRefuses() ───────────> src/hooks/PreToolUse.Bash.js  isLedgerWrite (MODIFY: no dir → no link test)
        └─ catch ────────> SETTINGS_MENTION_RE (no require)
tests/protect-records.test.js ──spawns──> src/hooks/protect-records.js ; requires PreToolUse.Bash.js (one in-process case)
agents/infrastructure/deployment-setup.md ──pinned by──> tests/agent-tool-grants.test.js
```

No cycle: `real-path-confinement.js`, `safe-fs.js` and `regex-utils.js` require nothing from
`src/hooks/`.

### Implementation order

1. MODIFY `tests/protect-records.test.js` and `tests/agent-tool-grants.test.js` (Step 8, red first).
2. MODIFY `src/lib/real-path-confinement.js` — export `resolveExisting` (no dependency).
3. MODIFY `src/hooks/PreToolUse.Bash.js` — the no-`dir` condition (no dependency).
4. MODIFY `src/hooks/protect-records.js` — depends on 2 and 3.
5. MODIFY `agents/infrastructure/deployment-setup.md` — one paragraph; with the pin of 1.
6. MODIFY `docs/ENFORCEMENT.md` and the header of `src/hooks/protect-records.js` (Step 15).

### File: `src/lib/real-path-confinement.js`

**Action:** MODIFY. **Purpose:** lend the one real-path resolver to the write protection.

- `module.exports = { escapesRoot, resolvesUnder, resolveExisting };`
- In the `resolveExisting` docblock, line 112 (read) — "discards it and `resolvesUnder` returns
  a bare boolean — so the vocabulary exists" — gains, in place on that same line, after "a bare
  boolean": ", `protect-records.js` reads only `ok` and `real`". No rewrap, no new line: no line
  above the exports moves, so the line ranges cited in the header of
  `tests/enforcement-fault-arms.test.js` (165, 166–169, 195–198, 257–259, 304–306) stay true.
- **Fences (read):** no test pins this module's export list (the two tests that require it
  destructure only `escapesRoot` and `resolvesUnder`). The dead-export fence
  (`.ctoc/export-reachability-baseline.json`, `maxDead` 65) credits an export that a live module
  calls; `protect-records.js` is a declared root in `.ctoc/reachability-roots.json` and calls
  `resolveExisting`, and the module itself defines and calls it. Expected: the count stays 65.
  Checked at Step 14.

### File: `src/hooks/PreToolUse.Bash.js`

**Action:** MODIFY. **Purpose:** a spec without a `dir` runs the two text tests only.

- In `isLedgerWrite`, the third test's guard `if (!touches) {` (line 409, read) becomes
  `if (!touches && spec.dir) {`.
- Its JSDoc parameter line (line 337, read) changes only its type, in place:
  `@param {{dir?: string, segmentRe: RegExp, resolvedRe: RegExp}} [spec]`. No sentence is added
  and no line is added or removed, so the line ranges of this file cited in the header of
  `tests/enforcement-fault-arms.test.js` (826–830, 1068–1071) stay true.
- Every existing spec (`LEDGER_SPEC`, `VERIFY_SPEC`, and protect-records' `STREAMING_SPEC`,
  `SETTINGS_SPEC`, `REGIMES_SPEC`) carries a `dir`, so every existing decision is unchanged. The
  file's own `main()` is unchanged.

### File: `src/hooks/protect-records.js`

**Action:** MODIFY. **Purpose:** the rule itself.

New top-level require, after `const path = require('path');` (line 157, read):
`const os = require('os');` (built in; cannot fail to load). No new first-party require goes
at top level (the existing `hook-deny-signal` require, line 158, stays the only one): every
new first-party require stays inside the agent-only functions, so the main session's
load-failure behaviour does not change.

Constants (module-private), placed after `REGIMES_SPEC` (which ends on line 188, read) and
before the doc comment of `isRegimeFile` (line 190). None of the new names exists anywhere in
`src/` or `tests/` today (searched over `src/**/*.js` and `tests/**/*.js`: the new constant,
function and test-helper names as one word-bounded pattern, 0 files matched; and
`REFUSAL_AGENT`, 0 files matched), so nothing clashes with the
constants the main-session menu-call fix added (lines 228–242):

```js
const REFUSAL_AGENT_SETTINGS = "CTOC refused this call because a background agent may not change Claude Code's "
  + "settings files or CTOC's .ctoc/settings.json, which decide the hooks, environment and permissions every "
  + 'later call runs with; report what you wanted to change and let the main session make the change.';
const REFUSAL_AGENT_SETTINGS_UNCHECKED = 'CTOC refused this call because it mentions a settings file and '
  + "CTOC's protection for it failed to run; tell the human that this protection is broken.";

/** Claude Code's two settings files in a `.claude` folder, or `.ctoc/settings.json`, at the end of a folded path. */
const AGENT_SETTINGS_PATH_RE = /(^|\/)(\.claude\/+settings(\.local)?\.json|\.ctoc\/+settings\.json)$/iu;
/** A settings file name as the last segment of a folded path. */
const SETTINGS_NAME_RE = /(^|\/)settings(\.local)?\.json$/iu;
/** A `..` segment in a raw target, either separator, trailing spaces allowed. */
const PARENT_SEGMENT_RE = /(^|[\\/])\.\.[ ]*([\\/]|$)/u;
/** A tool input that mentions a settings file (the crash rule for background agents), tested on NFKC text. */
const SETTINGS_MENTION_RE = /settings(\.local)?\.json/iu;
/** An NTFS stream suffix that still names the file or folder itself: `::$DATA`, `::$INDEX_ALLOCATION`, `:$I30:$INDEX_ALLOCATION`. */
const STREAM_SUFFIX_RE = /:(\$i30)?:\$(data|index_allocation)$/iu;
```

Functions, placed after `isRegimeFile` (lines 197–201, read) and before the doc comment of
`RECORD_SEGMENT_RE` (line 203), in this order:

```js
/** `s` without its trailing dots and spaces; a linear scan (a `/[. ]+$/` replace is quadratic on a long run). */
function trimDotsAndSpaces(s) {
  let end = s.length;
  while (end > 0 && (s[end - 1] === '.' || s[end - 1] === ' ')) end -= 1;
  return s.slice(0, end);
}

/**
 * A path as Windows would open it, for name tests: `\` read as `/`; on every segment an NTFS
 * stream suffix that names the item itself dropped (`STREAM_SUFFIX_RE`), then trailing dots and
 * spaces dropped (a segment of dots and spaces only is trimmed of spaces, so `..` keeps its
 * meaning); then `.` and `..` resolved.
 * @param {string} p
 * @returns {string}
 */
function nameForm(p) {
  const segments = String(p).replace(/\\/g, '/').split('/')
    .map((s) => s.replace(STREAM_SUFFIX_RE, ''))
    .map((s) => (/^[. ]+$/.test(s) ? s.trim() : trimDotsAndSpaces(s)));
  return path.posix.normalize(segments.join('/'));
}

/**
 * A path folded for the name tests: NFKC first (the long s becomes `s`, full-width forms become
 * plain), then `nameForm`, then lower case. It runs on paths already resolved, so a character
 * NFKC turns into path structure (a full-width `／` or `．`) can only add a refusal.
 * @param {string} p
 * @returns {string}
 */
function foldedName(p) {
  return nameForm(String(p).normalize('NFKC')).toLowerCase();
}

/** The Claude config folder: `CLAUDE_CONFIG_DIR` when set and not empty, else `<home>/.claude`. */
function configDir() {
  const fromEnv = process.env.CLAUDE_CONFIG_DIR;
  return typeof fromEnv === 'string' && fromEnv.trim() !== ''
    ? path.resolve(fromEnv)
    : path.join(os.homedir(), '.claude');
}

/** A path segment folded for a name compare. */
const foldSegment = (s) => s.normalize('NFKC').toLowerCase();

/**
 * The files a background agent may not change, absolute — one list for both channels: the
 * project's `.claude/settings.json`, `.claude/settings.local.json` and `.ctoc/settings.json`;
 * the config folder's `settings.json`; and, when the root is a worktree at
 * `<x>/.claude/worktrees/<name>`, `<x>/.claude/settings.json`, `<x>/.claude/settings.local.json`
 * and `<x>/.ctoc/settings.json`.
 * @param {string} root - the project root (`process.cwd()` after the hook's `chdir`)
 * @returns {string[]}
 */
function protectedSettingsFiles(root) {
  const files = [
    path.join(root, '.claude', 'settings.json'),
    path.join(root, '.claude', 'settings.local.json'),
    path.join(root, '.ctoc', 'settings.json'),
    path.join(configDir(), 'settings.json'),
  ];
  const worktrees = path.dirname(root);
  const claudeFolder = path.dirname(worktrees);
  if (foldSegment(path.basename(worktrees)) === 'worktrees' && foldSegment(path.basename(claudeFolder)) === '.claude') {
    files.push(path.join(claudeFolder, 'settings.json'), path.join(claudeFolder, 'settings.local.json'),
      path.join(path.dirname(claudeFolder), '.ctoc', 'settings.json'));
  }
  return files;
}

/**
 * What `p` names after links, as `'<dev>:<ino>'` from a `bigint` stat (Windows file IDs can pass
 * 2^53); null when nothing is there (ENOENT, ENOTDIR) or the file system reports inode 0 (FAT
 * and some network shares, where every file would compare equal); undefined on any other
 * fault. Never throws.
 * @param {string} p
 * @returns {string|null|undefined}
 */
function fileIdentity(p) {
  try {
    const st = require('../lib/safe-fs').statSync(p, { bigint: true });
    return String(st.ino) === '0' ? null : `${st.dev}:${st.ino}`;
  } catch (err) {
    const code = err && /** @type {NodeJS.ErrnoException} */ (err).code;
    return code === 'ENOENT' || code === 'ENOTDIR' ? null : undefined;
  }
}

/** Is `p` a directory, or might it be (its stat faults other than "does not exist")? Never throws. */
function mayBeDirectory(p) {
  try {
    return require('../lib/safe-fs').statSync(p).isDirectory();
  } catch (err) {
    const code = err && /** @type {NodeJS.ErrnoException} */ (err).code;
    return !(code === 'ENOENT' || code === 'ENOTDIR');
  }
}

/**
 * Is an editing tool's target a file a background agent may not change? Any one of: the target
 * exists and is the same file (device and inode) as a protected file that exists — every
 * spelling the file system folds, every link, every hard link; the folded name of its lexical
 * path or of its real path is a protected name (`.claude/settings(.local).json`,
 * `.ctoc/settings.json`, or the config folder's `settings.json`, lexical or real); or a settings
 * file name reached through a `..` (Claude Code may resolve `link/..` physically, not by name).
 * A stat fault on the target other than "does not exist", or a fault of its real path, refuses;
 * a protected file whose stat faults is dropped from the identity test (it never refuses every
 * Write), and a config file whose real path faults keeps only its lexical form. Throws only when
 * `os.homedir()` does (no home folder), which the crash rule handles.
 * @param {string} target - the tool input's path, as given
 * @param {string} abs - the same, resolved against the session's working directory
 * @returns {boolean}
 */
function isAgentSettingsTarget(target, abs) {
  const id = fileIdentity(abs);
  if (id === undefined) return true;
  if (id !== null && protectedSettingsFiles(process.cwd()).some((file) => fileIdentity(file) === id)) return true;
  const confinement = require('../lib/real-path-confinement');
  const configFile = path.join(configDir(), 'settings.json');
  const config = [foldedName(configFile)];
  const configReal = confinement.resolveExisting(configFile);
  if (configReal.ok) config.push(foldedName(configReal.real));
  const names = (p) => {
    const n = foldedName(p);
    return AGENT_SETTINGS_PATH_RE.test(n) || config.includes(n);
  };
  if (names(abs)) return true;
  if (PARENT_SEGMENT_RE.test(String(target).normalize('NFKC')) && SETTINGS_NAME_RE.test(foldedName(target))) return true;
  const real = confinement.resolveExisting(abs);
  return !real.ok || names(real.real);
}

/**
 * `s`, NFKC-folded, as a literal for a pattern with the `u` flag: `escapeRegExp` writes `-` as
 * `\-`, a syntax error under `u` outside a character class, so each becomes `\x2d`. (Every `-`
 * is escaped and so preceded by its own `\`; an escaped backslash `\\` is never followed by a
 * bare `-`, so the replace touches only the escapes of `-`.)
 * @param {string} s
 * @param {{escapeRegExp: function(string): string}} rx
 * @returns {string}
 */
function unicodeLiteral(s, rx) {
  return rx.escapeRegExp(s.normalize('NFKC')).replace(/\\-/g, '\\x2d');
}

/**
 * One `isLedgerWrite` spec for one protected file: text tests on its folder name and file name
 * (both NFKC-folded, escaped, flags `iu`), and a `dir` for the link test only when the file's
 * path relative to the root is a relative path whose real path resolves — mirroring what
 * `resolvesUnder` resolves — and is not an existing directory, so no configuration can make the
 * link test fault on, or contain, every operand. A file in a folder with no name (a filesystem
 * root) gets no spec.
 * @param {string} file - the protected file, absolute
 * @param {string} root - the project root (the working directory after `chdir`)
 * @param {{ok: boolean, real: (string|null)}} base - `resolveExisting(root)`
 * @param {{resolveExisting: function(string): {ok: boolean, real: (string|null)}}} confinement
 * @param {{escapeRegExp: function(string): string, safeRegExp: function(string, string): RegExp}} rx
 * @returns {Readonly<{dir?: string, segmentRe: RegExp, resolvedRe: RegExp}>|null}
 */
function fileSpec(file, root, base, confinement, rx) {
  const folder = path.basename(path.dirname(file));
  if (!folder) return null;
  const f = unicodeLiteral(folder, rx);
  const n = unicodeLiteral(path.basename(file), rx);
  /** @type {{dir?: string, segmentRe: RegExp, resolvedRe: RegExp}} */
  const spec = {
    segmentRe: rx.safeRegExp(`(^|[^a-z0-9._-])${f}\\/+${n}([^a-z0-9._-]|$)`, 'iu'),
    resolvedRe: rx.safeRegExp(`(^|\\/)${f}\\/+${n}$`, 'iu'),
  };
  const rel = path.relative(root, file);
  if (base.ok && rel !== '' && !path.isAbsolute(rel)) {
    const real = confinement.resolveExisting(path.join(base.real, rel));
    if (real.ok && !mayBeDirectory(real.real)) spec.dir = rel;
  }
  return Object.freeze(spec);
}

/**
 * The shell specs for a background agent, one per file of `protectedSettingsFiles`. Called
 * after `process.chdir(root)`.
 * @returns {Array<Readonly<{dir?: string, segmentRe: RegExp, resolvedRe: RegExp}>>}
 */
function agentSettingsSpecs() {
  const confinement = require('../lib/real-path-confinement');
  const rx = require('../lib/regex-utils');
  const root = process.cwd();
  const base = confinement.resolveExisting(root);
  return protectedSettingsFiles(root).map((file) => fileSpec(file, root, base, confinement, rx)).filter(Boolean);
}
```

Changes to existing functions:

- `decide()`, editing tools: the last line of the editing-tool branch,
  `return isRegimeFile(abs) ? REFUSAL_SETTINGS : null;` (line 797, read; right after the records
  check on lines 795–796, and unchanged by the main-session menu-call fix, which touched only
  the Bash channel), becomes three lines, the existing regulatory-settings check first:

  ```js
  if (isRegimeFile(abs)) return REFUSAL_SETTINGS;
  if (isSubagent(payload) && isAgentSettingsTarget(target, abs)) return REFUSAL_AGENT_SETTINGS;
  return null;
  ```

- `bashRefuses()` (lines 756–777, read). Its current order, as the main-session menu-call fix
  left it: the background agent's menu reading (`subagentMenuRefusal`, lines 757–760, only when
  `subagent`); the pure menu call's early return (`menuCallArgs`, lines 761–762, both sessions);
  the main session's dressed menu call (lines 763–765: `dressedMenuCall` is computed only when
  `subagent` is false, and returns early); the records checks (lines 767–774); then the last
  statement, `return bash.isLedgerWrite(analysed, SETTINGS_SPEC) || bash.isLedgerWrite(analysed,
  REGIMES_SPEC)` / `? REFUSAL_SETTINGS : null;` (lines 775–776). Exactly those two lines are
  replaced — the regulatory-settings specs first, then the agent block, then `return null`; the
  function's signature (the `subagent = false` parameter, line 756, already passed by `decide()`
  as `isSubagent(payload)`, line 807) and lines 757–774 are unchanged (the snippet's
  two `// lines …` markers and `// … the records checks …` are for display only and are not
  written; the `// The main session's dressed menu call …` comment is the file's own, line 763):

  ```js
    // lines 761–774 unchanged, shown for the insertion point:
    const menuArgs = menuCallArgs(command, base);
    if (menuArgs) return menuArgsNameRecords(menuArgs, cwdRel, bash) ? REFUSAL : null;
    // The main session's dressed menu call (owner, 2026-10-15): never for a background agent.
    const dressed = subagent ? null : dressedMenuCall(command, base);
    if (dressed) return menuArgsNameRecords(dressed.args, dressed.cwdRel, bash) ? REFUSAL : null;
    // … the records checks …
    if (refused) return REFUSAL;
    // lines 775–776 become:
    if (bash.isLedgerWrite(analysed, SETTINGS_SPEC) || bash.isLedgerWrite(analysed, REGIMES_SPEC)) return REFUSAL_SETTINGS;
    if (subagent) {
      const folded = analysed.normalize('NFKC');
      const writes = (spec) => bash.isLedgerWrite(analysed, spec)
        || (folded !== analysed && bash.isLedgerWrite(folded, spec));
      if (agentSettingsSpecs().some(writes)) return REFUSAL_AGENT_SETTINGS;
    }
    return null;
  }
  ```

  In both channels the new agent check runs after the existing regulatory-settings check, so a
  fault in the new code can never mask that protection (Decision 28). The two target sets do not
  overlap (`.ctoc/settings.yaml` and `.ctoc/regulatory-regimes/` against the settings `.json`
  files), so no call changes its sentence. The agent block stays after the subagent menu refusal
  and after the early return of a genuine menu call (`menuCallArgs`), so a genuine menu call's
  arguments stay data. A plain-ASCII command (NFKC leaves it unchanged) gets one reading per spec,
  exactly the planned cost before the fold.

  **With the main session's dressed menu call (read, traced through the code; Decision 34).**
  The two rules never run on the same call: the dressed call is computed only when `subagent`
  is false and returns before the end of the function, and the agent block runs only when
  `subagent` is true. So the agent block cannot change any decision of the dressed-call rule
  (cases 97–111 keep their verdicts), and for a background agent `dressed` is always null, so the
  agent block still sees every command that is not a pure menu call. The dressed-call rule's own
  background-agent cases (101 and 102) never reach the agent block: each row they expect allowed
  is a pure menu call and returns at line 762, and every other row is refused earlier (by
  `subagentMenuRefusal` or by the records checks). The one place the two rules meet is text: the
  dressed-call rule's stated limits (`docs/ENFORCEMENT.md` lines 457–462 and 469–471, header
  lines 125–126) already say that the main session's menu-call arguments naming a settings file
  pass to the menu as data, which this plan leaves as it is (the main session is not refused by
  this plan on any channel).
- `main()`, the catch (lines 832–844, read): one new line after the existing records/menu
  refusal — the `if (UNCHECKED_SUSPECT_RE.test(scanned) || (parsed && isSubagent(payload) &&
  MENU_MENTION_RE.test(scanned))) { refuse(REFUSAL_UNCHECKED); }` block, lines 840–842 — and
  before `process.exit(0);` (line 843):
  `if (parsed && isSubagent(payload) && SETTINGS_MENTION_RE.test(scanned.normalize('NFKC'))) refuse(REFUSAL_AGENT_SETTINGS_UNCHECKED);`
  `refuse` exits 2, so a call the first branch refused never reaches this one; a
  `.ctoc/settings.json` call matches `UNCHECKED_SUSPECT_RE` (`\.ctoc`) first and keeps the records
  sentence for every session, as today; and a background agent's crashed call whose tool input
  names both the menu (`start.js`, `menu-screens`, `streaming-gate`) and a settings file keeps the
  records crash sentence, because the existing menu branch refuses first. Either way the call is
  refused. The current catch has no branch for the main session's dressed menu call (read), so
  the new line meets that rule nowhere.

**Types (read: `tsconfig.json` has `checkJs: true`, `strict: false`, `noImplicitAny: false`,
`include: ["src/**/*.js"]`).** The one change that would otherwise be a type error is passing a
spec without `dir` to `isLedgerWrite`, whose parameter type requires it today; the
`PreToolUse.Bash.js` change makes it `dir?`. `statSync(p, { bigint: true })` through safe-fs
returns `BigIntStats` (safe-fs passes options through, lines 102–104, read; its export type is a
`Pick` of `fs`, so Node's overloads apply — believed, Step 14's typecheck is the check). The
JSDoc above is written with the code in Step 10, so Step 14's typecheck sees it.

**Error handling.** Nothing new may throw out of a permission check unseen: `resolveExisting`,
`fileIdentity` and `mayBeDirectory` never throw; `os.homedir()` throwing (no home folder at all)
or `safeRegExp` throwing reaches `main()`'s catch, where a background agent's
settings-mentioning call is refused with the crash sentence and every other call is decided by
the existing rule.

**Order of the sentences (read, verified by tracing the code).** The records checks run first in
both channels and refuse any target or operand whose real path faults (`resolvesUnder` returns
true on a fault). So a Write or a shell write through a dangling or looping link is refused
today for every session with the records sentence, and stays so; the new agent check never sees
it. The new check's own target-fault branches (`fileIdentity` undefined, `resolveExisting` not
ok) are defence in depth behind that. One exception: the shell's folded reading (a command NFKC
changes) runs its link test on operands the records checks never read, so there a fault of a
folded operand under a spec with a `dir` is a primary refusal with `REFUSAL_AGENT_SETTINGS`, for
that one command and only for a background agent. The regulatory-settings check runs next and the
new agent check last, in both channels (Decision 28).

### File: `agents/infrastructure/deployment-setup.md`

**Action:** MODIFY, one paragraph (line 490, under "## Configuration Output"). That agent, run as
a background agent, would now be refused its Edit of `.ctoc/settings.json`. Replace the
paragraph with the text below, written as ONE physical line that replaces line 490 (as the
current paragraph is one line), without the `> ` quote markers used here for display, so the
pinned substring in `tests/agent-tool-grants.test.js` matches (Decision 31):

> Never write `.ctoc/settings.json` yourself, with any tool: CTOC refuses a background agent's
> change to it, because the file holds settings every later call obeys (the owner's order of
> 2026-10-15). Saving the configuration — the "[1] Save configuration" choice, and a partial save
> under Error Recovery — means putting the complete `deployment` block in your report, as one
> JSON object with the single key `deployment` (the example shape below), valid as written.
> Validate all fields yourself before you report, and run Post-Setup Verification steps 1 to 4
> against the block and the repository: they need no saved file. The dry run reads the saved
> file through `src/lib/deployment.js`, so you do not run it: your report names what the main
> session runs after it writes the block — the "[3] Test deployment (dry run)" choice and
> Post-Setup Verification steps 5 and 6. Your report also says that the owner decides whether
> the change is written. The main session shows the owner the exact block and where it came from
> (this agent's report) before writing; with his OK it sets that value under the `deployment`
> key of `.ctoc/settings.json`, the file `src/lib/deployment.js` reads, and changes no other key.
> Always include `dry_run`: leave it `true` (simulate — build commands, execute nothing) unless
> the user explicitly confirms they want real pushes/POSTs/ssh, then set `dry_run: false`. Do NOT
> put any standing "deploy on approval" flag in the block — the deploy gate is the per-crossing
> `options.deploy === true` stamp on a Gate 3 approval, checked in `src/lib/actions.js`; no config
> field arms it (see Step 4b). Example shape: `{ "deployment": { "enabled": true, "dry_run": true, "remote": "origin", "environments": [...], "approval": {...}, "notifications": {...}, "rollback": {...} } }`.

Lines 397 ("[1] Save configuration"), 399 ("[3] Test deployment (dry run)"), 538–544 (Post-Setup
Verification, "After saving configuration:" and its six steps) and 583 ("Save partial
configuration") are not edited, because the new paragraph defines what saving means for all of
them and says which of them the agent runs on the block and which the main session runs after
it writes the file.

### File: `tests/agent-tool-grants.test.js`

**Action:** MODIFY, the pin for `infrastructure/deployment-setup` in `AGENT_BODY_SENTENCES`
(line 640, read). The pinned clause "change only the `deployment` key — replace its value when it
exists, add it when it does not — and never rewrite the whole file with `Write`" is replaced by
"Never write `.ctoc/settings.json` yourself, with any tool: CTOC refuses a background agent's
change to it". In the comment above the block, replace only the last sentence of line 634,
"deployment-setup's settings write stays inside one key.", with "deployment-setup writes no
settings file: it reports the `deployment` block and the main session writes it (owner's order,
2026-10-15)."; the rest of that comment covers `ci-runner-setup` too and is unchanged. This
replaces the contract the owner replaced and tightens it (the agent wrote one key; now it writes
nothing); no assertion is removed or loosened.

### Wiring — the live call sites

Claude Code → `hooks/hooks.json` (PreToolUse; Write, Edit, MultiEdit, NotebookEdit, Bash) →
`node "${CLAUDE_PLUGIN_ROOT}/src/hooks/protect-records.js"` → `main()` → `decide()`:

- editing tools → `isSubagent` → `isAgentSettingsTarget` → `fileIdentity` (→ `safe-fs.statSync`),
  `protectedSettingsFiles`, `configDir`, `real-path-confinement.resolveExisting`, `foldedName`
  → `refuse(REFUSAL_AGENT_SETTINGS)`;
- Bash → `bashRefuses(…, subagent)` → `agentSettingsSpecs` (→ `protectedSettingsFiles`,
  `fileSpec`, `resolveExisting`, `mayBeDirectory`, `unicodeLiteral`, `regex-utils.escapeRegExp`,
  `safeRegExp`) → `PreToolUse.Bash.isLedgerWrite`, twice for a command NFKC changes → `refuse`;
- crash → the catch in `main()` → `refuse(REFUSAL_AGENT_SETTINGS_UNCHECKED)`.

The deployment-setup paragraph is read by that agent when the CTO Chief dispatches it; its report
reaches the main session, which shows the owner the block and writes it with his OK. Every new
function has a live caller in the loaded hook; a test is not a caller. The live proof is the
Step 16 probe after the owner's release.

### Test plan — `tests/protect-records.test.js` (MODIFY; Step 8, written first)

No new test file (no documented count moves). Framework `node:test`. One new describe block at the
end of the file, "a background agent may not change Claude Code's settings files or CTOC's
.ctoc/settings.json (owner, 2026-10-15)". Its cases are numbered from one above the file's last
case number at build time (111 after the rebase onto the main-session menu-call fix, whose
block "the main session may run the menu's question step however it wraps the call" is now the
file's last, lines 687–944, so the new block goes after line 944; other plans touching this
file may add cases first), in the order below, and this plan refers to them by name. Every case except
"a spec without dir runs the text tests only" spawns the real hook with the real PreToolUse JSON
on stdin, as `run()` does; no mocks.

**Harness changes (in the file, not in the block):** `run()` (lines 51–55, read; unchanged by
the main-session menu-call fix, whose block calls it with no options) is replaced by the
version below. `payload` (lines 44–49), `p` (57), `write` (58), `bash` (59), `deny` (61–65),
`assertRefused` (67–73) and `assertAllowed` (75–78) are used as they are.

```js
function run(input, { cwd = project, entry = ENTRY, env } = {}) {
  let childEnv;
  if (env) {
    childEnv = { ...process.env };       // keeps NODE_V8_COVERAGE, so these runs count toward coverage
    for (const [k, v] of Object.entries(env)) {
      if (v === null) delete childEnv[k]; else childEnv[k] = v;
    }
  }
  return spawnSync(process.execPath, [entry], {
    cwd, env: childEnv, input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8',
  });
}
```

With no `env`, `childEnv` is undefined and every existing case runs exactly as today.

**Fixture of the block** (a `beforeEach` inside the describe, after the file's own one; removed in
its `afterEach`):

```text
<project>/.claude/settings.json          contents {}
<project>/.claude/agents/                (folder)
<project>/.ctoc/settings.json            contents {}
<project>/src/e.js                       contents x   (an EXISTING ordinary file, Decision 33)
<cfg>       a second temporary folder (fs.realpathSync of fs.mkdtempSync, prefix pr-cfg-)
<cfg>/settings.json                      contents {}
<project>/.claude/settings.local.json is absent unless a case writes it.
```

The `-` in the `pr-cfg-` prefix (and in the project's `pr-rec-`) is load-bearing: it puts a `-`
in the config folder's name, so every shell case of the block exercises `unicodeLiteral`'s
`\x2d` rewrite; without it, the config spec's pattern would not compile under `u`.

Every call in the block passes `env: { CLAUDE_CONFIG_DIR: <cfg> }` unless the case says otherwise,
so the developer's own config folder never decides a result in this block. That holds for this
block only: the file's existing background-agent cases outside it (74–90, 91–94, 101–102, and
the agent payload of `tests/plans-keep-moving-without-the-human.test.js` line 1138) pass no
`CLAUDE_CONFIG_DIR`, so the agent code runs there against the developer's real config folder,
and case 102 runs with the repository as its `cwd`, which in a worktree under
`.claude/worktrees/` also adds the main checkout's three files. Their verdicts do not change
(believed, from reading those cases; checked by Step 8's run of every existing case and by
Step 14's `npm test`):
each of their allowed calls is a pure menu call (early return at line 762), a read, `npm test`,
`node --test …` or a non-settings write, and the hard rule (Decision 7, "ordinary agent work
stays allowed" (a)–(f)) is what keeps any configuration from refusing such a call; each of
their refused calls is refused earlier with its own sentence. Helpers in the block:
`asAgent(input, id = 'a1b2c3')` adds `agent_id` and `agent_type: 'iron-loop-executor'`;
`agentOnly(input, what, opts)` asserts the background agent refused with
`REFUSAL_AGENT_SETTINGS` and the same input allowed without `agent_id` and with `agent_id: ''`.
`REFUSAL` and `REFUSAL_UNCHECKED` are the file's existing constants; the two new sentences are
written out in full in the block, as the earlier blocks do. `ſ` below is U+017F, written in the
test as `'ſ'`.

**Cases** (paths are fixture paths inside the temporary folders):

- **Each protected file, editing tools** — `agentOnly` for: Write `<project>/.claude/settings.json`;
  Edit of it (`old_string` `{}`, `new_string` `{"env":{}}`); Write
  `<project>/.claude/settings.local.json`; MultiEdit of the relative `.claude/settings.local.json`;
  NotebookEdit with `notebook_path` `<project>/.claude/settings.json`; Write and Edit of
  `<project>/.ctoc/settings.json`; Write `<cfg>/settings.json`.
- **Spellings** — `agentOnly` for Write to: `<project>/.CLAUDE/Settings.JSON`;
  `<project>/.Ctoc/SETTINGS.json`; the relative `.claude\settings.json` and `.ctoc\settings.json`;
  `<project>/src/../.claude/settings.local.json`; `<project>/.claude/settings.json.` (trailing
  dot); `<project>/.claude/settings.json ` (trailing space); `<project>/.claude/settings.json::$DATA`;
  `<project>/.claude::$DATA/settings.json`; `<project>/.claude::$INDEX_ALLOCATION/settings.json`;
  `<project>/.claude:$I30:$INDEX_ALLOCATION/settings.json`; `<project>/.claude./settings.json`;
  `<cfg>/SETTINGS.JSON`.
- **Spellings the file system folds, and hard links** — `agentOnly` for Write to:
  `<project>/.claude/ſettings.json` (the file exists: refused by identity where the file system
  folds the long s — measured on APFS — and by the folded name everywhere);
  `<project>/.claude/ſettings.local.json` (absent: refused by the folded name);
  `<project>/.ctoc/ſettings.json`; `<cfg>/ſettings.json`; and, with `src/h.json` made by
  `fs.linkSync(<project>/.claude/settings.json, <project>/src/h.json)` and `src/hc.json` by
  `fs.linkSync(<project>/.ctoc/settings.json, <project>/src/hc.json)` (hard links), Write
  `<project>/src/h.json` and Write `<project>/src/hc.json` (refused by identity only: no name
  test sees them). On a case-sensitive Linux file system the long s names a different, absent
  file, so there the fold alone refuses it (belt and braces); the hard-link halves exercise
  identity on every platform.
- **Links** —
  (a) `src/s.json` is a file link to `<project>/.claude/settings.json`: `agentOnly` for Write
  `<project>/src/s.json`.
  (b) `src/cfgdir` is a folder link (`'junction'`) to `<project>/.claude`: `agentOnly` for Write
  `<project>/src/cfgdir/settings.local.json`.
  (c) `src/agents` is a folder link to `<project>/.claude/agents`: `agentOnly` for Write
  `<project>/src/agents/../settings.json` (the `..` rule; the main session's lexical path is
  `src/settings.json`, allowed as today).
  (d) `<cfg>/real` is a folder holding `settings.json`, and `<cfg>/link` a folder link to it;
  with `CLAUDE_CONFIG_DIR` = `<cfg>/link`: `agentOnly` for Write `<cfg>/real/settings.json` and
  for Write `<cfg>/link/settings.json`.
  (e) `src/dl.json` is a dangling link to the absent `<project>/.claude/settings.local.json`:
  Write `<project>/src/dl.json` is refused with `REFUSAL` (the records sentence) for the
  background agent AND for the main session — today's behaviour, unchanged: the records checks
  refuse a Write through any dangling link for every session.
- **Worktrees** — `<project>/.claude/worktrees/w/` holds a `.git` FILE (contents `gitdir: x`;
  without it the root walk climbs to `<project>`) and `w/.claude/settings.json`. With payload
  `cwd` and spawn `cwd` = `w`: `agentOnly` for Write `../../settings.json` (relative; lands on
  `<project>/.claude/settings.json`), Write `<project>/.claude/settings.local.json`, Write
  `<w>/.claude/settings.json`; `agentOnly` for Bash `echo x > ../../settings.json` and
  `cd .. && echo x > ../settings.local.json` (the worktree specs' link test). With `w/src/m` a
  folder link to `<project>/.ctoc`: `agentOnly` for Bash `echo x > src/m/settings.json` (only the
  main checkout's `.ctoc/settings.json` spec's link test sees it), Bash
  `echo x > src/m/ſettings.json` (only that spec's link test on the folded reading sees it:
  `realpathSync` returns the long s as spelled, so the as-written link test misses it, Decision 27)
  and Write `<w>/src/m/settings.json`. With `cwd` = `<project>`: `agentOnly` for Write
  `<w>/.claude/settings.json` and Bash `echo x > .claude/worktrees/w/.claude/settings.json`.
- **The config folder by the home folder** — `<home>` is a third temporary folder holding
  `dot/claude/settings.json` (contents `{}`), and `<home>/.claude` is a folder link
  (`'junction'`) to `<home>/dot/claude`. In each of two configurations — `env: { CLAUDE_CONFIG_DIR:
  null, HOME: <home>, USERPROFILE: <home> }` and the same with `CLAUDE_CONFIG_DIR: ''` (empty means
  unset) — `agentOnly` for Write `<home>/.claude/settings.json`, Write
  `<home>/dot/claude/settings.json`, Bash `echo x > <home>/.claude/settings.json` and Bash
  `echo x > <home>/dot/claude/settings.json`. The two `dot/claude` calls match no `.claude` name:
  only the config file's identity or real path (editing tools) and the config spec's link test
  (shell) can catch them, so without the home fallback in `configDir` this case turns red.
- **Ordinary agent work stays allowed** — the background agent is allowed:
  Write to `<project>/.claude/settings.json.bak`, `<project>/.claude/settings-old.json`,
  `<project>/.claude/agents/x.md`, `<project>/src/settings.json`,
  `<project>/.ctoc/settings.json.example`, `<project>/src/x.js`, `<cfg>/settings.local.json` (not
  a protected file, Decision 17); Bash `echo x > src/x.js`, `echo x > .claude/settings.json.bak`,
  `cp a.json src/settings.json`, `cd <cfg> && echo x > settings.local.json`, `npm test`; and the
  EXISTING ordinary file `<project>/src/e.js` (contents `x`): an Edit of it (`old_string` `'x'`,
  `new_string` `'y'`) and a Write over it — the only allowed editing-tool calls in the block whose
  target exists, so the only ones that run the identity comparison against a file that must be
  allowed (an absent target has no identity and skips the comparison; Decision 33).
  Then, in each of six configurations, Write `<project>/src/x.js`, Bash `echo x > src/x.js`, and
  the Edit of and the Write over `<project>/src/e.js` stay allowed (the hook only decides and
  never applies an edit, so `src/e.js` exists with `x` in every configuration):
  (a) `CLAUDE_CONFIG_DIR` = a folder that does not exist; (b) `<cfg>/settings.json`
  replaced by a dangling link; (c) `<project>/.claude/settings.local.json` a dangling link;
  (d) `<cfg>/settings.json` replaced by a folder link to `<project>` (its real path is an
  existing directory); (e) `CLAUDE_CONFIG_DIR` = the filesystem root (`path.parse(project).root`);
  (f) `<project>/.claude/settings.local.json` a symbolic link to itself (a loop: its stat faults
  with ELOOP). (b), (c), (d) and (f) are the hard rule: (b), (c) and (f) turn red if the link test
  is given a `dir` whose own path faults; (d) turns red if it is given a `dir` that is a folder;
  (f)'s Edit of and Write over the existing `src/e.js` turn red if a protected file's stat fault
  refuses instead of dropping that file (its Write of the absent `src/x.js` stays green under that
  fault, because an absent target never reaches the identity comparison). In the base
  configuration and in every one of (a)–(f) the Edit of and the Write over `src/e.js` turn red if
  identity is compared on the device alone, because `<project>/.claude/settings.json` exists on
  the same device in all seven.
- **Shell writes** — `agentOnly` for Bash: `echo '{}' > .claude/settings.json`;
  `echo x >> .claude/settings.local.json`; `tee .ctoc/settings.json < in.json`;
  `cp in.json .claude/settings.local.json`; `mv in.json .ctoc/settings.json`;
  `sed -i '' 's/a/b/' .claude/settings.json`; `cd .claude && echo x > settings.local.json`;
  `echo x > .CLAUDE/Settings.json`; `echo x > .claude\\settings.json` (two backslashes in the
  command text, as the existing "Windows separators" shell case); `echo x > src/../.ctoc/settings.json`;
  `echo x > .claude/ſettings.json`; `echo x > .claude/ſettings.local.json`;
  `echo x > .ctoc/ſettings.json`; with `src/s.json` a link to `.claude/settings.json`,
  `echo x > src/s.json`; `ln -s ../.claude/settings.json src/l.json`;
  `echo x > <cfg>/settings.json`; `cd <cfg> && echo x > settings.json`. And with `src/dl.json` a
  dangling link: `echo x > src/dl.json` refused with `REFUSAL` for the agent and the main session
  (unchanged today, as links (e)).
- **The regulatory-settings check keeps running first** — with `<project>/.ctoc/settings.yaml`
  written (contents `{}`) when the fixture lacks it and `src/l.yaml` a file link to it: Bash
  `echo x > src/l.yaml` is refused with the regulatory-settings sentence for the background agent
  AND for the main session. That sentence is written out in full in the new block: the file's
  `REFUSAL_SETTINGS` (line 604, read) is local to the regulatory-settings describe block, not
  reachable from the new one. This case is a guard that keeps today's behaviour; because the two
  target sets do not overlap it passes under either order, so the order itself is evidenced by
  the Step 11 critic's read of the calls in `decide()` and `bashRefuses()` (Decision 28).
- **Shell reads stay allowed** for the background agent: `cat .claude/settings.json`,
  `grep -n hooks .claude/settings.local.json`, `git diff .ctoc/settings.json`,
  `head -5 <cfg>/settings.json`, `ls .claude`, `git add .claude/settings.json`,
  `cat .claude/ſettings.json`. No `|` in these commands (the hook splits on it).
- **A genuine menu call's arguments stay data** — the background agent is allowed:
  `node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task complete t7 --summary 'set .claude/settings.json'`
  and the same with `--summary .ctoc/settings.json`.
- **When the protection cannot run** — the file's harness, built inside this case as case 81
  does (lines 379–390: a `pr-plug-` temporary plugin folder holding only a copy of the entry
  and `hook-deny-signal.js`, removed in a `finally`), because the shared harness of lines
  214–225 is scoped to its own describe block and not reachable from the new one: the background agent's Bash
  `echo x > .claude/settings.json`, Write `<project>/.claude/settings.local.json` and Write
  `<project>/.claude/ſettings.local.json` are refused with `REFUSAL_AGENT_SETTINGS_UNCHECKED`;
  the same three calls from the main session are allowed; the agent's `ls` is allowed; a Write of
  `<project>/.ctoc/settings.json` is refused with `REFUSAL_UNCHECKED` for both sessions
  (unchanged: `\.ctoc` matches first).
- **A spec without dir runs the text tests only** (in-process, as the existing case "the hook
  reads `menu task` arguments with the menu's own parser" requires the menu parser):
  `const { isLedgerWrite } = require('../src/hooks/PreToolUse.Bash.js')`; with `src/dl.json` a
  dangling link and `NEVER = /[^\s\S]/`,
  `isLedgerWrite(\`echo x > ${p('src', 'dl.json')}\`, { segmentRe: NEVER, resolvedRe: NEVER })`
  is `false`, and with `dir: '.ctoc/approvals'` added it is `true` (control). **Why this case is
  in-process:** through the hook the no-`dir` condition is invisible on the as-written reading.
  Without it, a spec without `dir` would run the approval-ledger link test, which changes a
  decision only on an operand whose real path faults — and the records checks, which run first
  on the command as written, already refuse every such operand with `REFUSAL`. The folded
  reading (a command NFKC changes) can expose the condition, because its operands are new paths
  the records checks never read; a spawned case for that would need a long-s operand whose folded
  path faults while the as-written one does not, so the direct call is the check. Only a direct
  call shows the condition holds; the change itself
  stays because the typecheck needs `dir?` and because the specs `fileSpec` builds without a `dir`
(the hard rule) rely on it.

**Why red today:** the refused halves of "each protected file, editing tools", "spellings",
"spellings the file system folds, and hard links", links (a)–(d), "worktrees", "the config folder
by the home folder" and "shell writes" exit 0 (nothing protects these files); the agent halves of
"when the protection cannot run" exit 0 (no settings crash rule); "a spec without dir runs the
text tests only" returns `true` without a `dir` (the default parameter runs the ledger link
test, which faults on the dangling operand). Guards, green before and after: links (e), "the
regulatory-settings check keeps running first", "ordinary agent work stays allowed" in the base
configuration and in all six configurations — including the agent's Edit of and Write over the
existing `src/e.js` in the base configuration and in each of (a)–(f) (Decision 33) —, "shell
reads stay allowed", "a genuine menu
call's arguments stay data", the main-session halves of every `agentOnly`, and the main-session,
`ls` and `.ctoc` halves of "when the protection cannot run".

**Also written first:** the pin in `tests/agent-tool-grants.test.js` (above) — red until the paragraph
in `deployment-setup.md` changes. All existing cases of both files stay unchanged and green.

**Coverage targets:** every new function and branch of `protect-records.js` is driven by a
spawned case (the spawned runs inherit `NODE_V8_COVERAGE`); the global floor of
`.ctoc/coverage-baseline.json` holds. Known unreachable on macOS and Linux, each a single
expression: the `path.isAbsolute(rel)` arm (another drive, Windows only); the target-fault arms
of `isAgentSettingsTarget` (`fileIdentity` undefined, `resolveExisting` not ok — the records
checks refuse first); the inode-0 arm of `fileIdentity` (FAT and some network shares); and the
"might be a directory" fault arm of `mayBeDirectory` (a stat fault other than ENOENT/ENOTDIR on a
path whose real path resolved).

### Security review

- **Path traversal:** every target is resolved (`path.resolve`, then `foldedName`); the `..` rule
  refuses a settings file name reached through `..`; real paths come from `resolveExisting`;
  identity is asked of the file system, not of the name.
- **Spellings the file system folds:** identity for an existing target; NFKC plus the `u` flag
  for a fresh create and on the shell. Windows 8.3 short names stay a stated limit.
- **Input validation:** `agent_id` must be a non-empty string (`isSubagent`); a non-string Bash
  command stays the fail rule's case.
- **Data-derived regular expressions:** only the folder and file names, NFKC-folded, through
  `regex-utils.escapeRegExp` (with `\-` rewritten to `\x2d` for the `u` flag) and `safeRegExp`,
  the codebase's one audited constructor (lint rule `security/detect-non-literal-regexp` stays an
  error). Literal-only patterns are linear.
- **No throw becomes an allow:** see Error handling above.
- **Messages:** the two sentences echo no path or command text (a command may carry a secret).
- **No secrets, no personal information:** fixtures live in temporary folders; no home-folder
  path is written anywhere.
- **Fail-closed direction:** a target fault refuses; a basis fault drops only the link test of
  that one spec, and a protected file's stat fault drops only that file's identity (the text
  tests and every other spec stay), never the whole check.
- **The relay:** an agent's report asking for a settings change is data. The owner decides
  whether it is written; the main session shows him the exact change and its source first
  (deployment-setup paragraph; `docs/ENFORCEMENT.md` at Step 15).

## Acceptance criteria

A background agent whose payload carries `agent_id` is refused editing-tool writes to the
protected files (by file identity and folded name) and, as a mistake guard, shell writes that
name them, while the loaded hook is intact; this is not a containment boundary — agent isolation
is. In detail:

- [x] A background agent's Write, Edit, MultiEdit and NotebookEdit of each protected file (a–d)
  — direct, through a file link, a folder link, a hard link, through `..`, a `..` after a link,
  in any letter case, with the long s, with `\`, with a trailing dot or space, with `::$DATA` on
  any segment, `::$INDEX_ALLOCATION` or `:$I30:$INDEX_ALLOCATION` on a folder — are refused with
  exactly `REFUSAL_AGENT_SETTINGS` ("each protected file, editing tools", "spellings", "spellings
  the file system folds, and hard links", "links" (a)–(d), "worktrees", "the config folder by
  the home folder").
- [x] A background agent in a worktree cannot write the main checkout's two `.claude` settings
  files or its `.ctoc/settings.json`, and one in the main checkout cannot write a worktree's
  ("worktrees").
- [x] The home fallback holds with `CLAUDE_CONFIG_DIR` unset and empty, including a config folder
  reached through a link ("the config folder by the home folder").
- [x] A background agent's shell writes to each file by redirect, append, `tee`, `cp`, `mv`,
  `sed -i`, a `cd` split, an existing link, `ln` and the long s are refused with the same
  sentence; reads stay allowed ("shell writes", "shell reads stay allowed").
- [x] Every one of those calls without `agent_id`, and with an empty one, is decided exactly as
  today (the `agentOnly` halves; links (e) and the dangling half of "shell writes" keep today's
  records refusal), and the main session's dressed-menu-call cases (97–111) pass unchanged
  (Decision 34).
- [x] The new agent check runs after the regulatory-settings check in both channels (evidence: the
  Step 11 critic's read of the calls in `decide()` and `bashRefuses()`); as a guard of today's
  behaviour, an agent's shell write through a link to `.ctoc/settings.yaml` keeps the
  regulatory-settings sentence ("the regulatory-settings check keeps running first").
- [x] Ordinary agent work stays allowed, including an Edit of and a Write over an existing
  ordinary file (`src/e.js`), and including under a missing config folder, a dangling user
  settings link, a dangling project settings link, a user settings path that is a folder, a
  config folder at the filesystem root and a looping project settings link ("ordinary agent work
  stays allowed").
- [x] A genuine menu call's arguments stay data ("a genuine menu call's arguments stay data").
- [x] On a crash, a background agent's call mentioning a settings file (long s included) is
  refused with `REFUSAL_AGENT_SETTINGS_UNCHECKED`; the main session's is allowed ("when the
  protection cannot run").
- [x] `isLedgerWrite` runs no link test for a spec without `dir`; every existing spec is unchanged
  ("a spec without dir runs the text tests only"; `ledger-forgery-closed`,
  `bash-gate-plan-coverage`, `bash-gate-payload-reader`,
  `the-bash-channel-cannot-reach-the-ledger-through-a-link` pass unchanged).
- [x] `deployment-setup.md` no longer tells the agent to write `.ctoc/settings.json`, says which
  checks it runs on the block and which the main session runs after writing, and says the owner
  decides; the pinned sentence in `tests/agent-tool-grants.test.js` holds the new instruction.
- [x] `hooks/hooks.json` unchanged; the case "hooks/hooks.json registers exactly the one
  protection" passes.
- [x] Dead-export count stays at 65 and unreachable files are not higher than at Step 9.
- [x] `npm test`: 0 failed, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json`
  `minPct`; `npm run lint` and `npm run typecheck` clean, zero warnings.
- [x] The Step 12 medians are quoted (five: the Write of `src/x.js`, the Edit of the existing
  `src/e.js`, `ls`, the five-operand and the 128-operand `git add`); a 128-operand cost over the
  stop is stated with its number in the plan's result.
- [ ] Live, after the owner releases it: in a scratch CTOC project, a background agent's Write to
  `.claude/settings.json` and its `echo x > .claude/settings.json` are refused with the sentence,
  quoted as shown, in a session whose permission mode was read and recorded; the main session's
  Write of the same file goes through. Until the release this box stays open and is reported as
  not run.

### Acceptance criteria mapping

| Criterion | Implemented in | Test case |
|---|---|---|
| editing tools refused for agents | `isAgentSettingsTarget`, `fileIdentity`, `foldedName`, `nameForm`, `protectedSettingsFiles`, `decide()` | each protected file; spellings; spellings the file system folds, and hard links; links (a)–(d); worktrees; the config folder by the home folder |
| shell refused for agents | `agentSettingsSpecs`, `fileSpec`, `unicodeLiteral`, `bashRefuses()` (two readings), `isLedgerWrite` | worktrees; the config folder by the home folder; shell writes |
| main session unchanged | every new call behind `isSubagent`; the agent block after the dressed-call branch in `bashRefuses()` | the `agentOnly` halves; links (e); when the protection cannot run; cases 97–111 (the dressed menu call) unchanged |
| existing protection first | `decide()` and `bashRefuses()` order | order: the Step 11 critic's read of the calls; guard of today's behaviour: the regulatory-settings check keeps running first |
| no configuration refuses everything | `fileSpec` basis and folder check, `mayBeDirectory`, `fileIdentity` dropping a faulting protected file and comparing device AND inode, `isLedgerWrite` no-`dir` condition | ordinary agent work stays allowed, base and (a)–(f), including the Edit of and Write over the existing `src/e.js`; a spec without dir runs the text tests only |
| crash rule | `main()` catch, NFKC | when the protection cannot run |
| deployment-setup | the paragraph, the pin | `tests/agent-tool-grants.test.js` |

## Risks

| Risk | Mitigation | Where |
|---|---|---|
| The plugin cache: an agent's Write to the installed plugin's `src/hooks/protect-records.js` or `hooks/hooks.json` under the Claude config folder switches this protection off on the next call (critical; architectural for this hook) | Stated: until the Neighbours item for the plugin cache is built, this protection holds only while the loaded hook is intact. Recommended next item | docs, Neighbours |
| Claude Code's own `statusline-setup` subagent (`/statusline`) edits the user settings file and is now refused | Decided under Decisions (1); the owner makes that change in the main session | `isAgentSettingsTarget` |
| A built plan whose `files:` declares `.claude/settings.json` (a user project that wants hooks) cannot be built by a background agent | The executor reports the change and the main session makes it; the refusal sentence says so | refusal sentence |
| The relay: an agent's report asks for a settings change and the main session writes it unread | The report is data; the owner decides; the main session shows the exact change and its source before writing (deployment-setup paragraph, `docs/ENFORCEMENT.md`) | deployment-setup, docs |
| `agent_id`: measured present on a background agent's Bash payload (Claude Code 2.1.300, the CTO Chief's own calls); documented for every tool event; not yet captured on an editing tool's payload. A future version could stop sending it | Every call without it reads as the main session's: the fix then does nothing and behaviour is today's, never a refusal of the owner's session. The Step 16 live probe checks the editing tools; stated | docs, Step 16 |
| Exit 2 in bypass mode: measured to block a background agent's Bash call this session (permission mode not read; believed bypass); documented to block a PreToolUse tool call, bypass not mentioned; not measured for a Write | Step 16 reads and records the session's permission mode and checks that the Write is blocked; a Write that goes through is reported as the fix not holding | Step 16 |
| Text matching on the shell is not a barrier: a script written then run, a path in a variable (`$CLAUDE_CONFIG_DIR/settings.json`), a path built at run time, replacing the `.claude` folder, a hard link, a link whose target is spelled differently (a long s inside the link), a copy or move whose destination names only the folder (`cp x.json .ctoc`, `mv /tmp/x/settings.json .ctoc/`), git operations that rewrite `.ctoc/settings.json` without naming it (`git apply` of a patch the agent wrote, `git checkout <rev> -- .`, `git stash pop`) | Stated as limits in `docs/ENFORCEMENT.md`; the sandbox refuses the shell route into `.claude` (measured); isolating agents is the real barrier (owner, 2026-10-15) | docs |
| Tools outside the five matched (an MCP filesystem server, a future tool); a race (a link swapped between the hook's decision and the write); the owner's other Claude profile folders beside the active config folder | Stated limits; the hook sees only the five tools and only the active config folder | docs |
| A worktree outside `<main>/.claude/worktrees/` (for example one made with `git worktree add ../other`): `protectedSettingsFiles` does not recognise its main checkout, so from it the main checkout's three files are protected by name only — the editing tools' folded name on the lexical and real path, the shell's text tests. Hard links into the main checkout are not seen from it on either channel, and links into it are not seen on the shell (no spec for those files, so no link test) | Stated limit (Decision 30) | docs |
| Claude Code may write `link/../settings.json` physically while the hook resolves `..` by name (unverified either way) | The `..` rule refuses a settings name reached through `..` for agents (links (c)) | `PARENT_SEGMENT_RE` |
| Windows forms: 8.3 short names (`SETTIN~1.JSO`); named streams other than the three folded suffixes; on the shell, trailing dots and spaces, `::$DATA` on any segment and `.claude::$INDEX_ALLOCATION/settings.json` | Stated limits. The editing tools fold `::$DATA`, `::$INDEX_ALLOCATION` and `:$I30:$INDEX_ALLOCATION` on every segment and trailing dots and spaces, and identity catches any alias of an existing file | docs |
| On a file system that reports inode 0 (FAT, some network shares) identity cannot be compared | Identity is dropped there (else every file would match every other); the folded name test still runs; stated | `fileIdentity` |
| On a case-sensitive Linux file system the long s opens a different file | There the fold is belt and braces: it refuses a name that would not reach the protected file; stated | `foldedName` |
| False refusals, accepted: a non-read agent shell command whose text merely mentions a protected path (`jq .hooks .claude/settings.json > out.json`); any `settings.json` or `settings.local.json` reached through `..` by an agent (write the path without `..`); with an ordinarily named config folder (`CLAUDE_CONFIG_DIR=…/config`), an agent's shell write to any `config/settings.json` | Stated in `docs/ENFORCEMENT.md` with the way round (run the read without the write, write the path plainly, or ask the main session) | docs |
| Added time on every background agent's editing-tool call (an existing target runs one `stat` per protected file) and Bash call: up to seven specs, each a link test per operand (at most 128 per segment), plus a second reading, with its link test, for a command NFKC changes | Measured at Steps 9 and 12, including a 128-operand `git add`; over the stop is handled as Step 12 says, never shipped silently (Decision 24) | Step 12 |
| `CLAUDE_CONFIG_DIR` written relative or with `~`: the hook resolves it against the project root and does not expand `~`; how Claude Code reads such a value is not documented | Text tests on the folder name still apply; `<home>/.claude/settings.json` stays covered by the `.claude` name rules; stated | `configDir` |
| Other plans touch the same files (Neighbours) | The scheduler builds plans that share a file one at a time; whichever builds later merges into the current file, never replaces it | — |

## Decisions Taken Under Ambiguity

1. **Claude Code's `statusline-setup` subagent is refused.** `agent_type` is only a name that any
   project agent file can claim, so an allowance by name would reopen the gap. The owner can make
   the status-line change in the main session.
2. **The records checks keep running first.** A Write or shell write through a dangling link is
   already refused for every session with the records sentence; the new check does not reorder
   that, so links (e) and the dangling half of "shell writes" assert today's sentence for both
   sessions.
3. **Superseded by Decision 17** (it protected both settings names in the config folder).
4. **The Windows name forms are applied on every platform** in the editing-tool name test, so
   the test runs on macOS and Linux too. On those systems `settings.json.` is a different file; an
   agent refused such a name loses nothing.
5. **A settings file name reached through `..` is refused for agents** whatever the folder,
   because whether Claude Code resolves `link/..` by name or physically was not verified. Cost: an
   agent's write to `<x>/../settings.json` in an unrelated folder is refused.
6. **`CLAUDE_CONFIG_DIR`** counts when it is a non-empty string; it is resolved with
   `path.resolve` (against the project root, the hook's working directory after its `chdir`) and
   `~` is not expanded. Empty or unset means `os.homedir()/.claude`. Claude Code's own reading of
   a relative or `~` value is not documented (read 2026-10-15); this is not checked further,
   because `<home>/.claude/settings.json` stays covered by the `.claude` name rules either way.
7. **The link test gets a `dir` only when the file's own path resolves and is not an existing
   directory** (C13 of the critic's round 1): `resolvesUnder` refuses everything inside a
   protected folder, so a settings path whose real path is a folder (a link to the project, a
   config folder that is itself the protected path) would refuse every operand under it. A stat
   fault there counts as "might be a directory" (no `dir`): the fault direction that cannot lock
   agents out. A spec without `dir` keeps its two text tests.
8. **`isLedgerWrite` gets the explicit no-`dir` condition** instead of leaning on its default
   parameter, which would quietly run an approval-ledger link test for such a spec. Behaviour for
   every existing spec is unchanged; "a spec without dir runs the text tests only" holds it.
9. **`resolveExisting` is exported, not copied.** The hook reads only `ok` and `real`.
10. **One plan of seven files**, against the one-to-three slice rule: the CTO Chief asked for one
    plan, and the files are one rule across its channels plus two consequences of it (the
    deployment-setup instruction and its pinned test). No file is created, so no documented count
    moves and `CLAUDE.md` is not declared.
11. **`README.md` is not changed.** It names the loaded hook only as "record write protection"
    (line 1131) and lists nothing it protects; the regulatory-settings protection did not change it
    either.
12. **deployment-setup: only the one paragraph changes.** Lines 397, 399, 538–544 and 583 follow
    it, because the paragraph defines what saving means and who runs which check. Its `tools:`
    line is unchanged (it still writes pipeline files). The other tests that read this file were
    read and are not affected: `tests/corpus-audit-ledger.test.js` needs only a ledger record for
    its path, `tests/architecture-invariants.test.js` reads its frontmatter, and
    `tests/agent-and-skill-improvement-record.test.js` fingerprints only `ctoc:claims` blocks
    (this file has none) and the `tools:` line.
13. **The pinned sentence in `tests/agent-tool-grants.test.js` is replaced, and tightened** (one
    key written becomes nothing written), because the owner's order replaced the contract it
    pinned. Only the last sentence of the comment on line 634 changes; the comment also covers
    `ci-runner-setup`.
14. **On a crash, `settings.json` anywhere in an agent's tool input refuses**, file contents
    included; a crash is rare and the refusal says the protection is broken.
15. **A config folder at a filesystem root** (no folder name) gets no shell spec; the editing-tool
    identity and exact match still cover it. "Ordinary agent work stays allowed" (e) holds that
    such a configuration refuses nothing else.
16. **No new test file**: the cases extend `tests/protect-records.test.js`, as the brief asks.
17. **The config folder's `settings.local.json` is not protected** (CTO Chief, 2026-10-15, from
    Claude Code's documentation, which lists `settings.local.json` as "Project only"): it is not a
    file Claude Code documents reading there. The `.claude` name rule still covers
    `<home>/.claude/settings.local.json`. Step 9 keeps only recording `claude --version`; the
    settings-location research is done (Problem statement, documented).
18. **The folded name test runs on every target, existing or not; identity is added for an
    existing target.** Identity alone for an existing target would let through every existing
    settings file outside the enumerated list (another checkout's, a worktree's seen from the main
    checkout); the name test alone misses hard links and spellings outside the fold. Both run.
19. **The shell is read twice when NFKC changes the command:** as written, and folded; both
    readings run the spec's text tests and its link test (corrected in round 2, Decision 27; the
    round-1 wording kept the link test off the folded reading). The reason: the folded reading
    runs only when NFKC changes the command and can only add a refusal for that one command, and
    a folded operand that names no existing file is not a fault (`resolveExisting` walks up to the
    nearest existing folder), so it cannot lose a refusal or refuse unrelated commands. The fold
    is NFKC only, never lower case. A plain-ASCII command is read once.
20. **`\-` becomes `\x2d` for the `u` flag** (`unicodeLiteral`). Believed: `\-` outside a class is
    a syntax error under `u`; the Step 8 fixture's `pr-cfg-` folder makes every shell case of the
    block fail loudly if this is wrong in either direction.
21. **Inode 0 means "no identity".** Comparing it would make every file on such a file system
    match every protected file there and refuse every agent Write.
22. **A protected file whose stat faults is dropped from the identity test; the target's own
    fault refuses.** A looping or unreadable settings link must not refuse every Write ("ordinary
    agent work stays allowed" (f)); a target the hook cannot see is refused, the same direction
    as today's records checks.
23. **The NTFS stream suffixes `::$DATA`, `::$INDEX_ALLOCATION` and `:$I30:$INDEX_ALLOCATION` are
    folded on every segment** in the editing-tool name test (C18): one anchored, linear pattern.
    The shell's forms stay a stated limit.
24. **Cost at Step 12:** more than 50 ms added to the median of an ordinary background-agent call
    (a Write of `src/x.js`, Bash `ls`, a five-operand `git add`) stops the build and is reported to
    the CTO Chief, as before. The 128-operand `git add` is the bounded worst case: its added median
    is quoted in the plan's result with its number and reported, and over 50 ms it is stated
    there as a measured cost rather than shipped silently; it does not stop the build by itself.
25. **The cases are named, not numbered, in this plan** (C17): other plans add cases to the same
    file, so the numbers are given at build time, one above the file's last case.
26. **The title and claims were narrowed** (threat-model finding): the plan claims refusal of a
    background agent whose payload carries `agent_id`, on the editing tools by identity and folded
    name and on the shell as a mistake guard, while the loaded hook is intact; not containment.
    The file name is kept.
27. **The folded shell reading gets each spec's link-test `dir` too** (CTO Chief, round 2,
    option 1; supersedes the text-only folded reading of Decision 19's round-1 wording and of the
    Architecture decision). Without it, `echo x > src/m/ſettings.json` with `src/m` a link to the
    main checkout's `.ctoc` passes: `realpathSync` returns the long s as spelled, so the as-written
    link test misses it, and no text test names `.ctoc`. "Worktrees" now asserts it is refused for
    an agent.
28. **The new agent check runs after the existing regulatory-settings check in both channels**
    (CTO Chief, round 2, security): `decide()` returns `REFUSAL_SETTINGS` on `isRegimeFile(abs)`
    before `isAgentSettingsTarget` runs, and `bashRefuses()` tries `SETTINGS_SPEC` and
    `REGIMES_SPEC` before the agent block, so a fault in the new code can never mask the existing
    protection. Supersedes the round-1 placement (between the records check and the
    regulatory-settings check). The two target sets do not overlap, so no sentence changes. The
    order is evidenced by the Step 11 critic's read of the calls; "the regulatory-settings check
    keeps running first" guards today's behaviour and passes under either order.
29. **Step 11's mutation predictions list exactly the cases that turn red** (CTO Chief, round 2).
    For the fold mutation, on APFS the identity test still refuses the long-s Writes to files that
    exist. For dropping the main checkout's `.ctoc/settings.json`, the critic named only Bash
    `echo x > src/m/settings.json`; the integrator adds Bash `echo x > src/m/ſettings.json`, the
    case Decision 27 added after that finding, because it also relies only on that spec's link test.
30. **A worktree outside `<main>/.claude/worktrees/` is a stated limit, not a fix** (CTO Chief,
    round 2): from it the main checkout's files are protected by name only. Worded precisely under
    Risks: the editing tools' real-path name rule still catches a link whose real path ends in a
    protected name; hard links (both channels) and links on the shell are not seen.
31. **The deployment-setup paragraph is one physical line replacing line 490, without the `> `
    quote markers** (CTO Chief, round 2), so the substring pin in `tests/agent-tool-grants.test.js`
    matches; the quoted, wrapped form in this plan is for display only.
32. **Git operations that rewrite `.ctoc/settings.json` without naming it are a stated limit**
    (CTO Chief, round 2): `git apply` of a patch the agent wrote, `git checkout <rev> -- .`,
    `git stash pop`. The text rules see no operand naming the file, and `.ctoc` stays writable to
    the sandbox (believed, the owner's note of 2026-10-14). Listed in the Risks shell row and in
    Step 15's "What it cannot catch"; isolating agents is the real barrier.
33. **An existing ordinary file is among the allowed targets** (critic, round 3, important): every
    allowed editing-tool case targeted an absent file, whose identity is null, so the identity
    comparison never ran against a file that must be allowed, and the round-2 prediction that (f)
    turns red under a refusing stat fault could not come true (the absent `src/x.js` never
    reaches the comparison). The block's fixture now holds `<project>/src/e.js` (contents `x`);
    the agent's Edit of it (`'x'` to `'y'`) and Write over it are allowed in the base
    configuration and in each of (a)–(f). Step 11's stat-fault guard now predicts exactly (f)'s
    Edit and Write of `src/e.js` turning red, and a new guard — `fileIdentity` reduced to the
    device only — predicts the Edit AND the Write of `src/e.js` turning red in the base
    configuration and in every one of (a)–(f). The brief named only the Edit for that guard; the
    Write is added because it turns red under the same mutation (the project's
    `.claude/settings.json` exists on the same device in all seven configurations), and
    Decision 29 requires the prediction to list exactly what turns red. The Edit of `src/e.js` is
    the dearest ordinary editing-tool call (it runs the identity comparison over every protected
    file), so it joins Decision 24's ordinary calls: it is the fifth timed call at Steps 9 and 12,
    under the same 50 ms stop.
34. **The plan was refreshed after the rebase onto the main-session menu-call fix, and the agent
    block is placed after that rule** (CTO Chief, final integration pass). Every line the plan
    cites in `src/hooks/protect-records.js`, `tests/protect-records.test.js` and
    `docs/ENFORCEMENT.md` was re-read in the rebased branch. The agent block keeps its place as
    the last check of `bashRefuses()` (replacing lines 775–776), so it still runs after the
    regulatory-settings check (Decision 28), still only behind `subagent`, and after the
    dressed-call branch (lines 763–765). The two rules never run on the same call — the dressed
    call only without `agent_id`, the agent block only with one — so no decision of the
    dressed-call rule changes and no owner decision arises. The comment on `PLAIN_REL_RE`
    (line 237: "duplicated so that `decide` stays byte-identical") states a constraint of the
    finished menu-call plan, not a pin: no test that names the file pins its text (searched:
    `protect-records` in `tests/`, 3 files; `tests/protect-records.test.js` and
    `tests/plans-keep-moving-without-the-human.test.js` spawn it, `tests/readme-numbers.test.js`
    names it in a hook count; a test that reads every file under `src/` without naming this one
    is not excluded by that search, and Step 14's `npm test` is the check), so this plan's
    three-line change to `decide()` is allowed and that comment is left as it is (not this plan's
    text to change). One incidental effect, not a fix: the dressed-call exemption trusts a folder
    the project-root walk marks as a CTOC root, and one such marker is a `.ctoc/` holding
    `settings.json`; this plan refuses a background agent's write of any `.ctoc/settings.json`
    (root-independent name rule, both channels), which closes that one way for an agent to
    plant a fake root for the main session's dressed call. The other markers (`.ctoc/` beside
    `plans`, `plans/<stage>/`) stay open, as that rule's stated limits say.

## Neighbours (seen, not built here; scheduling is the owner's)

- The long-s hole in the records protection (measured by the CTO Chief, 2026-10-15, APFS): the
  installed hook refuses the plain spellings of a check record and of the answers log but allows
  their long-s spellings (exit 0), main session and background agent, and the file system opens
  the real record. Reported to the owner for his scheduling.
- The installed plugin's own `hooks/hooks.json` and `src/hooks/protect-records.js` in the plugin
  cache under the Claude config folder: an agent's Write there switches this protection off on the
  next call. The recommended next item.
- Hooks declared in `.claude/agents/*.md` (subagent frontmatter), in skill frontmatter or in
  another plugin's `hooks/hooks.json`; `.mcp.json` and the user-level `.claude.json` (MCP
  servers); managed settings files (need administrator rights).
- Hook and status-line scripts that existing settings already run (for example
  `.claude/hooks/*`): an agent that edits the script changes what the next call runs without
  touching a settings file.
- `.npmrc` `node-options`: `npm test` hands it to every `node` it starts as `NODE_OPTIONS`, the
  same injection as the measured `env` block, through a file this plan does not protect.
- Any other shell route the text rules cannot read: a script file written then run, a path built at
  run time, a path held in a variable.
- The same `link/..` shape and the Windows trailing-dot, trailing-space and `::$DATA` forms for the
  record and regulatory-settings protections, which resolve `..` by name and do not trim names.
- `plans/todo/settings-files-cannot-turn-edit-protection-off.md`: related, not duplicated (the
  unloaded edit hook, every session, the enforcement mode); no shared file.
- Shared files with other plans: `plans/todo/00285-every-agent-and-specialist-skill-improved-three-times-s25-deployment-setup.md`
  and `plans/todo/dispatched-agents-route-their-questions-to-the-session.md` touch
  `agents/infrastructure/deployment-setup.md` (the second also `tests/agent-tool-grants.test.js`);
  `plans/todo/agents-that-hold-the-shell-search-with-it-s2-blocked.md` touches
  `tests/agent-tool-grants.test.js`; the hotfix plans' slices 2 and 3 in `plans/implementation/`
  touch `src/hooks/protect-records.js`, `tests/protect-records.test.js` and `docs/ENFORCEMENT.md`;
  five slices of `small-changes-take-a-small-path` touch `src/hooks/PreToolUse.Bash.js`. The
  main-session menu-call fix, which touched the same three files, is built
  (`plans/done/the-main-session-may-run-the-menus-question-step-s1-dressed-menu-call.md`) and is
  already in this branch; this plan is written against its result (Decision 34).

## Execution Plan

### Step 8: TEST
- [x] Write the tests first: the `env` option of `run()` (lines 51–55), and the new describe block at the end of `tests/protect-records.test.js` (after line 944, the end of the main-session menu-call block) with every case of the test plan, its fixture including the existing `<project>/src/e.js` (contents `x`, Decision 33) and its own crash harness built as case 81 builds one, numbered from one above the file's last case at build time (112 if no other plan adds cases first) and titled with the names used here.
- [x] Write the new pinned sentence for `infrastructure/deployment-setup` in `tests/agent-tool-grants.test.js`, and the replaced last sentence of its comment.
- [x] Run `node --test tests/protect-records.test.js tests/agent-tool-grants.test.js`; record red: the refused halves of "each protected file, editing tools", "spellings", "spellings the file system folds, and hard links", links (a)–(d), "worktrees", "the config folder by the home folder" and "shell writes"; the agent halves of "when the protection cannot run"; "a spec without dir runs the text tests only"; the deployment-setup pin. Record green: links (e), "the regulatory-settings check keeps running first", "ordinary agent work stays allowed" in the base configuration and all six configurations — including the agent's Edit of and Write over the existing `src/e.js` in the base configuration and in each of (a)–(f) —, "shell reads stay allowed", "a genuine menu call's arguments stay data", every main-session half, and every existing case.

### Step 9: PREPARE
- [x] Record `claude --version`.
- [x] Run `node --test tests/ledger-forgery-closed.test.js tests/bash-gate-plan-coverage.test.js tests/bash-gate-payload-reader.test.js tests/the-bash-channel-cannot-reach-the-ledger-through-a-link.test.js tests/a-dangling-link-is-not-a-path-inside-the-tree.test.js tests/a-link-cannot-leave-the-repository.test.js tests/enforcement-fault-arms.test.js tests/export-reachability.test.js tests/reachability.test.js` before any change; record them green.
- [x] Record the before-numbers: dead exports (65 expected), unreachable files.
- [x] Measure the median of 20 spawned runs of the entry, in a scratch project holding an existing `src/e.js` (contents `x`), for a background agent's Write of the absent `src/x.js`, its Edit of the existing `src/e.js` (`'x'` to `'y'`), its Bash `ls`, its Bash `git add a b c d e`, and its Bash `git add` with 128 operands, as the time baseline (five medians, Decision 33).

### Step 10: IMPLEMENT
- [x] `src/lib/real-path-confinement.js`: export `resolveExisting`; the in-place phrase on docblock line 112, no rewrap.
- [x] `src/hooks/PreToolUse.Bash.js`: `if (!touches && spec.dir)` on line 409; the type `dir?: string` on the existing JSDoc line 337, no new sentence or line.
- [x] `src/hooks/protect-records.js` (every line number here is of the file before any edit of this plan; anchor each change on the quoted text, since earlier insertions move later lines): the `os` require (after line 157); the constants (after `REGIMES_SPEC`, line 188) `REFUSAL_AGENT_SETTINGS`, `REFUSAL_AGENT_SETTINGS_UNCHECKED`, `AGENT_SETTINGS_PATH_RE`, `SETTINGS_NAME_RE`, `PARENT_SEGMENT_RE`, `SETTINGS_MENTION_RE`, `STREAM_SUFFIX_RE`; the functions `trimDotsAndSpaces`, `nameForm`, `foldedName`, `configDir`, `foldSegment`, `protectedSettingsFiles`, `fileIdentity`, `mayBeDirectory`, `isAgentSettingsTarget`, `unicodeLiteral`, `fileSpec`, `agentSettingsSpecs`, each with the typed JSDoc written above and placed as stated (between `isRegimeFile`, lines 197–201, and `RECORD_SEGMENT_RE`, line 203); and the three call sites in `decide()` (line 797 becomes three lines), `bashRefuses()` (lines 775–776 replaced; two readings, both with the spec's `dir`, Decision 27; after the dressed-call branch of lines 763–765, which stays as it is, Decision 34) and `main()`'s catch (one line between lines 842 and 843; NFKC), as specified; in `decide()` and `bashRefuses()` the agent check runs after the regulatory-settings check (Decision 28).
- [x] `agents/infrastructure/deployment-setup.md`: the one paragraph, written as one physical line replacing line 490, without the `> ` quote markers (Decision 31).
- [x] Run the Step 8 tests; expect green.

### Step 11: REVIEW
- [x] Before the critic, prove the guards can fail, each change run once, quoted and reverted: without the basis and folder checks in `fileSpec` (always set `dir`), "ordinary agent work stays allowed" (b), (c), (d) and (f) turn red; with a protected file's stat fault refusing instead of dropping, exactly (f)'s Edit and Write of the existing `src/e.js` turn red (its Write of the absent `src/x.js` and its Bash call stay green); with `fileIdentity` reduced to the device only (`${st.dev}` in place of `${st.dev}:${st.ino}`), exactly the Edit and the Write of the existing `src/e.js` turn red, in the base configuration and in every one of (a)–(f) (Decision 33); without `spec.dir &&` in `isLedgerWrite`, "a spec without dir runs the text tests only" turns red; without the `isSubagent` condition in `decide()`, the main-session halves of "each protected file, editing tools" turn red; without the `..` rule, links (c) turns red; without the identity test, the hard-link halves of "spellings the file system folds, and hard links" turn red; with `foldedName` reduced to `nameForm(p).toLowerCase()`, the `u` flag removed from the name patterns and the folded shell reading removed, exactly these turn red: the Write of the absent `<project>/.claude/ſettings.local.json` (editing tools) and the shell long-s cases — `echo x > .claude/ſettings.json`, `echo x > .claude/ſettings.local.json` and `echo x > .ctoc/ſettings.json` in "shell writes", and `echo x > src/m/ſettings.json` in "worktrees"; on APFS the identity test still refuses the long-s Writes to the files that exist (`.claude/ſettings.json`, `.ctoc/ſettings.json`, `<cfg>/ſettings.json`), so those stay green (on a case-sensitive Linux file system they name absent files and turn red too; record which platform ran); without the home fallback in `configDir`, "the config folder by the home folder" turns red; without the main checkout's `.ctoc/settings.json` in `protectedSettingsFiles`, exactly Bash `echo x > src/m/settings.json` and Bash `echo x > src/m/ſettings.json` in "worktrees" turn red, and the Write `<w>/src/m/settings.json` stays refused by the real-path name rule (Decision 29). After the last revert, both Step 8 files are green.
- [x] Dispatch `iron-loop-critic`: read the calls, not text matches — every new check runs only behind `isSubagent` or in the agent-only crash branch; one list of protected files feeds both channels; the folded shell reading carries the spec's `dir` (Decision 27); the order of the checks in both channels — records, then regulatory settings, then the agent check (Decision 28); in `bashRefuses()` the agent block sits after the dressed-call branch and the two never run on the same call (dressed only without `agent_id`, the agent block only with one), so cases 97–111 keep their verdicts (Decision 34); both sentences exactly as written here; no new first-party require at top level (the existing `hook-deny-signal` require stays the only one).

### Step 12: OPTIMIZE
- [x] Measure the same five medians as Step 9 after the change and quote them. More than 50 ms added on the Write of `src/x.js`, the Edit of the existing `src/e.js`, `ls` or the five-operand `git add` median stops the build and is reported to the CTO Chief; the 128-operand median is quoted in the plan's result with its number, and if more than 50 ms is added it is stated there as a measured cost and reported, never shipped silently (Decisions 24 and 33).
- [x] Confirm by reading that every new pattern is a literal or built only from escaped, folded names, is linear, and compiles under the `u` flag; and that a plain-ASCII command gets one reading per spec.

### Step 13: SECURE
- [x] Dispatch `security-scanner` on the diff: name forms (letter case, `\`, trailing dots and spaces, `::$DATA` on any segment, `::$INDEX_ALLOCATION` and `:$I30:$INDEX_ALLOCATION` on a folder, 8.3 names, the long s and other NFKC and case-folding look-alikes); identity (hard links, inode 0, a protected file whose stat faults, a target whose stat faults); links (file, folder, dangling, looping, `link/..`, a link at the config folder itself, a link whose target is spelled with the long s); worktree layouts including the main checkout's `.ctoc/settings.json`; `CLAUDE_CONFIG_DIR` forms (unset, empty, relative, `~`, a trailing separator, a folder that does not exist, the filesystem root, an ordinary name such as `config`, a name with `-`, another drive); the crash path; any configuration that would refuse every agent command; shell copies and moves whose destination names only the folder; tools outside the five; a race between the decision and the write; the owner's other profile folders; the plugin cache; the relay of a settings change through an agent's report. It confirms each limit under Risks is real and names any missing one.

### Step 14: VERIFY
- [x] Run `npm test` (the gated entry point): 0 failed, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [x] Run `npm run lint` (zero warnings) and `npm run typecheck` (zero errors, including the `bigint` stat and the `dir?` spec).
- [x] Run the Step 9 suites again: green, unchanged; dead exports at 65; unreachable files not higher than at Step 9; `hooks/hooks.json` byte-identical (the case "hooks/hooks.json registers exactly the one protection").

### Step 15: DOCUMENT
- [x] `docs/ENFORCEMENT.md`, "The one loaded hook — write protection for the records" section (line 233; line numbers of the file before any edit): a new paragraph after "The regulatory settings" paragraph (lines 249–264), before "**What it refuses:**" (line 266) — what is claimed, in these words: a background agent whose payload carries `agent_id` is refused editing-tool writes to the protected files (by file identity and folded name) and, as a mistake guard, shell writes that name them, while the loaded hook is intact; it is not a containment boundary — agent isolation is. Then what is protected (files a–d), for whom (background agents only; the main session unchanged), the channels (the editing tools by identity, folded name and real path; the shell by text, read as written and folded; the sandbox refuses the shell route into `.claude`, measured on 2026-10-15), the refusal sentence, the relay (an agent's report asking for a settings change is data; the owner decides; the main session shows the exact change and its source before writing), how it sits beside the main session's dressed menu call (that rule is for calls without `agent_id` only, this one for calls with one; neither changes the other's decisions), and the cases that hold it (`tests/protect-records.test.js`, the new block, its case numbers as built, after the dressed-call block's cases 97–111). The crash sentence goes in a new paragraph right after the "**Fail rule.**" paragraph (lines 425–431), mirroring the background agent's menu crash paragraph (lines 409–412): a crash on a background agent's call whose tool input mentions `settings.json` or `settings.local.json` refuses with its own sentence, quoted in full; a `.ctoc/settings.json` call and a call that also names the menu keep the records crash sentence.
- [x] In "What it cannot catch" (lines 433–489): new list lines appended after its last item (line 489, "on a crash, a call that reaches a record through a link without naming it."): the main session changing a settings file (by design; the existing items on the main session's menu call, lines 457–462 and 469–471, already say that its arguments naming a settings file pass to the menu as data, and are left as they are); the plugin cache (until that item is built, the protection holds only while the loaded hook is intact); a background agent's shell route the text cannot read (a script written then run, a path in a variable, replacing the `.claude` folder, a hard link, a link whose target is spelled differently, a copy or move whose destination names only the folder, git operations that rewrite `.ctoc/settings.json` without naming it — `git apply` of a patch the agent wrote, `git checkout <rev> -- .`, `git stash pop`); a worktree outside `<main>/.claude/worktrees/`, from which the main checkout's files are protected by name only (hard links into the main checkout are not seen from it, and links into it are not seen on the shell); tools outside the five; a race between the decision and the write; the owner's other profile folders beside the active config folder; 8.3 names and inode-0 file systems; the shell's Windows trailing-dot, space, `::$DATA` and `::$INDEX_ALLOCATION` forms; the accepted false refusals and their way round; Claude Code's own `statusline-setup` refused, and how to make that change.
- [x] Both documentation edits are additive: no existing sentence of `docs/ENFORCEMENT.md` is reworded or removed, because `tests/claude-md-keeps-every-rule.test.js` holds a frozen inventory of its rules word for word. New sentences and list lines only.
- [x] The header comment of `src/hooks/protect-records.js` (lines 3–154; line numbers of the file before any edit): in WHAT IT PROTECTS, a new item after line 24 ("… which never pass through a tool hook)"), not inside the list above it, because that list ends "Only CTOC's own menu code writes these" and these files are written by the main session, not the menu; in WHAT IT REFUSES, a new paragraph after the "A BACKGROUND AGENT …" paragraph (lines 74–96) and before "Nothing else is loaded or run" (line 97); in WHAT IT CANNOT CATCH, its limits after the dressed-call limits (ending line 135) and before "The full list is in `docs/ENFORCEMENT.md`." (line 136); in FAIL RULE, the crash line as a new sentence after "… the main session's menu call does not." and before "A failure to load `hook-deny-signal.js` itself exits 1 …", which share line 147 (rewrap only lines 147–148).
- [x] Run `node --test tests/claude-md-keeps-every-rule.test.js tests/protect-records.test.js` after the edits; green.

### Step 16: FINAL-REVIEW
- [x] Dispatch `iron-loop-critic` against every acceptance box; each box quotes its evidence, including the Step 11 guard removals and the Step 12 medians.
- [ ] After the owner releases it: in a real session on a scratch CTOC project, read and record the session's permission mode; a background agent's Write to `.claude/settings.json` and its `echo x > .claude/settings.json` are refused (which shows that an editing tool's payload carries `agent_id` and that exit 2 blocks a Write in that mode), and the main session's Write of the same file goes through; quote the refusal exactly as shown. Until the release, report this box as not run.

## Execution Record

### Step 8: TEST (executor, phase A)

Written first, before any change under `src/`: the `env` option of `run()`, and the new describe block at the end of `tests/protect-records.test.js` (cases 112 to 134; the file's last case was 111); the replaced pin and comment sentence in `tests/agent-tool-grants.test.js`. `npx eslint` on both files: clean, zero warnings.

Case names as built (a plan group with several parts is split into one test per part, so the red/green list is finer): 112 each protected file, editing tools; 113 spellings; 114 spellings the file system folds, and hard links; 115 to 118 links (a) to (d); 119 links (e); 120 worktrees; 121a and 121b the config folder by the home folder (unset, empty); 122 ordinary agent work stays allowed, base configuration; 123 to 128 the same in configurations (a) to (f); 129 shell writes; 130 the regulatory-settings check keeps running first; 131 shell reads stay allowed; 132 a genuine menu call's arguments stay data; 133 when the protection cannot run; 134 a spec without dir runs the text tests only.

Run: `node --test tests/protect-records.test.js` before any source change: tests 138, pass 125, fail 13, skipped 0.

**Red (13), with the first failing assertion of each (a multi-row case stops at its first failing row):**

| Case | Failing assertion |
|---|---|
| 112 | `Write .claude/settings.json (background agent): expected exit 2, got 0` |
| 113 | `letter case .claude (background agent): expected exit 2, got 0` |
| 114 | `long s, existing project file (background agent): expected exit 2, got 0` |
| 115 | `file link (background agent): expected exit 2, got 0` |
| 116 | `folder link (background agent): expected exit 2, got 0` |
| 117 | `link then dot-dot (background agent): expected exit 2, got 0` |
| 118 | `real side (background agent): expected exit 2, got 0` |
| 120 | `Write ../../settings.json from the worktree (background agent): expected exit 2, got 0` |
| 121a, 121b | `Write <home>/.claude/settings.json (background agent): expected exit 2, got 0` |
| 129 | `echo '{}' > .claude/settings.json (background agent): expected exit 2, got 0` |
| 133 | `Bash write to .claude/settings.json, background agent: expected exit 2, got 0` |
| 134 | `no dir: text tests only` (`true !== false`) |

`node --test tests/agent-tool-grants.test.js`: pass 27, fail 1 (the policy test, "3. no agent holds a tool its orders do not need …"): `infrastructure/deployment-setup: the body lacks "Never write `.ctoc/settings.json` yourself, with any tool: CTOC refuse…"`. This is the deployment-setup pin.

**Green before the change (125, all existing cases plus the guards):** links (e) 119, ordinary agent work 122 to 128, 130, 131, 132, and every existing case of both files.

**Against the plan's prediction:** every case the plan predicts red is red; every case it predicts green is green. No mismatch. One limit of this evidence, stated plainly: because a multi-row case stops at its first failing row, the red run never reached the main-session halves or the later rows of 112 to 118, 120, 121, 129 and 133. The evidence that every main-session half is allowed (and that every later row is refused) comes from the green run after Step 10, not from Step 8.

Deviations in the tests (not in the plan's text): (1) the plan's link group (a) to (e) and the six configurations are one test each (finer red/green). (2) The two home-folder configurations are 121a and 121b. (3) Case 134 changes the working directory to the fixture project for its two calls and restores it in a `finally`, because the link test measures against the working directory. (4) The two crash-harness copies are built inside case 133 as case 81 builds its own.

### Step 9: PREPARE (executor, phase A)

- `claude --version`: `2.1.300 (Claude Code)`.
- Before the change, the nine suites (`tests/ledger-forgery-closed`, `bash-gate-plan-coverage`, `bash-gate-payload-reader`, `the-bash-channel-cannot-reach-the-ledger-through-a-link`, `a-dangling-link-is-not-a-path-inside-the-tree`, `a-link-cannot-leave-the-repository`, `enforcement-fault-arms`, `export-reachability`, `reachability`): tests 206, pass 206, fail 0, skipped 0.
- Before-numbers: dead exports 65 (`.ctoc/export-reachability-baseline.json` `maxDead` 65, 65 entries listed); unreachable files: `.ctoc/reachability-baseline.json` `maxUnreachable` 17, 17 entries listed (both suites green).
- Time baseline (macOS, Node 24.14.1, median of 20 spawned runs, background agent payload, `CLAUDE_CONFIG_DIR` pinned to an empty-but-for-`settings.json` scratch folder, scratch project with an existing `src/e.js` holding `x`; two full repetitions):

  | Call | Run 1 | Run 2 |
  |---|---|---|
  | Write of the absent `src/x.js` | 24.2 ms | 25.4 ms |
  | Edit of the existing `src/e.js` | 24.3 ms | 24.8 ms |
  | Bash `ls` | 26.8 ms | 27.7 ms |
  | Bash `git add a b c d e` (five operands `f0.txt` to `f4.txt`) | 29.0 ms | 29.7 ms |
  | Bash `git add` with 128 operands (`f0.txt` to `f127.txt`) | 67.7 ms | 67.2 ms |

  The script (re-run it unchanged at Step 12, `node bench.js src/hooks/protect-records.js` from the worktree): the scratch project is `fs.mkdtempSync(os.tmpdir()/pr-bench-)` holding `.ctoc/approvals/`, `src/e.js` (`x`); the config folder `pr-cfg-*` holds `settings.json` `{}`; each call is a PreToolUse JSON with `cwd` = the project, `agent_id` `a1b2c3`, `agent_type` `iron-loop-executor`, spawned with `process.execPath` and `env = { ...process.env, CLAUDE_CONFIG_DIR: <cfg> }`; times by `process.hrtime.bigint()` around `spawnSync`; the median is element 10 of the 20 sorted times. Payload shapes: Write `{ file_path: <project>/src/x.js, content: 'x' }`; Edit `{ file_path: <project>/src/e.js, old_string: 'x', new_string: 'y' }`; Bash `{ command: 'ls' }`, `git add f0.txt … f4.txt`, `git add f0.txt … f127.txt`.

### Step 10: IMPLEMENT (executor, phase A)

Done, in the plan's order: `src/lib/real-path-confinement.js` (`resolveExisting` exported; the phrase added in place on docblock line 112; no line above the exports moved); `src/hooks/PreToolUse.Bash.js` (`if (!touches && spec.dir) {`; the type `dir?: string` on the existing JSDoc line, no line added or removed); `src/hooks/protect-records.js` (the `os` require after `path`; the seven constants after `REGIMES_SPEC`; the twelve functions between `isRegimeFile` and `RECORD_SEGMENT_RE`, JSDoc as written in the plan; the three call sites: `decide()` three lines with the regulatory-settings check first, `bashRefuses()` last statement with the agent block after it and only behind `subagent`, `main()`'s catch one line after the records/menu refusal and before `process.exit(0)`); `agents/infrastructure/deployment-setup.md` (line 490 replaced by one physical line, no quote markers). No new first-party require at top level.

Results after Step 10:

- `node --test tests/protect-records.test.js tests/agent-tool-grants.test.js`: tests 166, pass 166, fail 0, skipped 0 (the 13 red cases of Step 8 are green; so are the main-session and empty-agent-id halves of every `agentOnly` row and every later row, which Step 8's red run never reached; cases 97 to 111 of the dressed menu call unchanged and green).
- The nine Step 9 suites plus `tests/plans-keep-moving-without-the-human.test.js`, `tests/claude-md-keeps-every-rule.test.js`, `tests/corpus-audit-ledger.test.js`, `tests/architecture-invariants.test.js`, `tests/agent-and-skill-improvement-record.test.js`: tests 378, pass 378, fail 0, skipped 0. The dead-export and reachability suites are green (dead exports stay at the 65 of the baseline; `resolveExisting` is called by `protect-records.js`).
- `npm run lint`: clean, zero warnings. `npm run typecheck`: pass (TypeScript was not installed in the worktree; `npm ci --ignore-scripts` from the committed lockfile installed the declared dependencies into the gitignored `node_modules` first).
- The whole suite was not run (Step 14).
- Early timing (same script and parameters as Step 9, two runs; Step 12 measures formally): Write of the absent `src/x.js` 31.8 / 30.8 ms (baseline 24.2 / 25.4); Edit of the existing `src/e.js` 26.6 / 24.3 (24.3 / 24.8); `ls` 28.4 / 28.2 (26.8 / 27.7); five-operand `git add` 31.7 / 31.1 (29.0 / 29.7); 128-operand `git add` 95.7 / 94.6 (67.7 / 67.2). All within the 50 ms stop on the four ordinary calls; the 128-operand call adds about 27 ms.

### Kickback to Step 10, from Step 11 (important) and Step 13 (high) (executor, phase B)

One kickback to Step 10 (the review and the security scan sent four fixes back). Test first, each seen RED, then the code, then GREEN. New cases (all in the new block): 135 (g) the project local settings file is a link to /dev/null (inside "ordinary agent work stays allowed"); 136 a fresh create through a macOS path alias of a config folder not called .claude; 137 no home folder: the config file leaves the list, the project files stay protected.

RED before any code change (`node --test tests/protect-records.test.js`): 135, 136, 137 failed, nothing else.
- 135: `ls 2>/dev/null (background agent): expected exit 0, got 2` (the refusal sentence of the agent block).
- 136: `fresh create through /System/Volumes/Data (background agent): expected exit 2, got 0`.
- 137: `Write .claude/settings.json (background agent)` got the crash sentence ("protection failed to run") instead of the agent-settings sentence.

GREEN after the four fixes: `node --test tests/protect-records.test.js tests/agent-tool-grants.test.js`: tests 169, pass 169, fail 0, skipped 0. (Deviation: I applied the four fixes together and ran the two files once after them, not after each; each fix has its own guard-removal run below that shows it alone turns its case red.)

1. Path alias of the config folder. Checked by hand first, in a temp folder with Node's fs: on this Mac (macOS 27.0.1, APFS), `/System/Volumes/Data<folder>` and `/.nofollow<folder>` both open the same folder (same device and inode as `<folder>`, same as the parent), and a `writeFileSync` through each created the file in the real folder. `fs.realpathSync` keeps both spellings as written. Fix in `isAgentSettingsTarget`: for an ABSENT target (`fileIdentity` null), the identity of `path.dirname(abs)` is compared with the identity of each protected file's folder, AND the folded basename with that file's folded basename; both equal refuses; a null or undefined folder identity skips the test (never refuses). `<cfg>/settings.local.json` stays allowed (checked in 136 through the plain path and both aliases). Case 136 asserts the platform truth: on macOS the Data-volume alias must open the same folder; elsewhere neither alias opens anything and the Writes are allowed.
2. `fileSpec` and /dev/null. `mayBeDirectory` is replaced by `isAbsentOrRegularFile` (`statSync(...).isFile()`, or ENOENT/ENOTDIR): a `dir` is set only for those; any other result or fault gives the text tests only. Case 135 (POSIX): `.claude/settings.local.json` linked to /dev/null; the agent's `ls 2>/dev/null`, `echo x > src/x.js 2>/dev/null` and the four ordinary-work calls are allowed; `echo x > .claude/settings.local.json` is still refused with the agent-settings sentence. On Windows the case asserts `/dev/null` does not exist.
3. `os.homedir()` throwing. `configDir()` now catches and returns null; `protectedSettingsFiles` and `isAgentSettingsTarget` leave the config file out then. Docblocks corrected (no longer say it throws). Can a real spawn produce it? Not by the environment on this machine: `env -i` still returns the passwd home, `HOME=` returns an empty string. Case 137 therefore plants the fault in the spawned hook with a `--require` preload (`NODE_OPTIONS`) that makes `os.homedir` throw, which is what a container with an unlisted user id does. FINDING outside the plan's files: the shell channel loads `src/lib/crypto.js`, which calls `os.homedir()` when it loads (line 13), so with no home folder every Bash decision crashes and falls to the crash rule (a settings-mentioning agent call is refused with the crash sentence, `ls` is allowed). Case 137 therefore asserts only exit 2 for the shell write, and the sentence for the editing tools. Not changed here (`crypto.js` is not declared).
4. One comment in `bashRefuses()` (why the command is read twice), and lines 634–636 of `tests/agent-tool-grants.test.js` rewrapped to two lines.

### Step 11: REVIEW, guard removals (executor, phase B)

Method: each change applied to the one file, both test files run (`node --test tests/protect-records.test.js tests/agent-tool-grants.test.js`) for the failing-case list, and a copy of the protect-records test file in the session scratch folder (the two assertion helpers record a failure instead of throwing, so every row shows, not only the first failing row of a case) for the row list; then the file restored from a byte copy and checked: sha256 of the file AND of its `git diff` equal before and after (the files differ from HEAD by this plan's work, so a plain `git diff` shows nothing new only if the diff is byte-identical; both hashes matched for every run). Platform: macOS, APFS (long s opens the same inode). A stray copy of that scratch test file was written once into the worktree root by my own scripts; it made the first `npm test` fail the lint test; I deleted it and re-ran everything (see Step 14).

| Guard removed (file) | Predicted | Result |
|---|---|---|
| G1 `fileSpec`: always set `dir` (no basis, no folder check) (protect-records.js) | 124, 125, 126, 128 | 124, 125, 126, 128 and 135 (the new /dev/null case, which the review added). Match. |
| G2 a protected file's stat fault refuses instead of dropping | exactly 128's Edit and Write of `src/e.js` | exactly those two rows. Match. |
| G3 `fileIdentity` on the device only | Edit and Write of `src/e.js` in 122 to 128 | those rows in 122 to 128, plus 135's two rows. MISMATCH vs the plan's list, explained: the fix for the alias adds an absent-target test that also compares identity, so with the device alone `src/settings.json` and `<cfg>/settings.local.json` (122), `<cfg>/settings.local.json` and both aliases (136) and `src/settings.json` (137) are refused too. More reds, none fewer. |
| G4 `spec.dir &&` removed in `isLedgerWrite` (PreToolUse.Bash.js) | 134 | 134 only. Match. |
| G5 `isSubagent(payload)` removed in `decide()` | main-session half of the first editing-tool row of 112, 113, 114, 115, 116, 117, 118, 120, 121a, 121b | the same ten cases, and also 136 and 137 (cases that did not exist when the prediction was made). In the row run EVERY editing-tool row of those cases turns red in both the main-session and the empty-agent-id halves, not only the first row. Match for the case list. |
| G6 the `..` rule removed | 117 | 117 only. Match. |
| G7 the identity test removed | the two hard-link rows of 114 | those two rows only. Match. |
| G8 fold guard as the review corrected it: `foldedName` without NFKC, `u` removed from `fileSpec`'s two pattern flag strings, folded shell reading removed | 129's three long-s shell rows and 120's `src/m/ſettings.json` row; NOT the absent `.claude/ſettings.local.json` Write | 129's three rows (`.claude/ſettings.json`, `.claude/ſettings.local.json`, `.ctoc/ſettings.json`) and 120's long-s row. The absent-file Write of 114 stayed GREEN. Match for the corrected prediction. |
| G8b the same plus the `u` flag removed from `AGENT_SETTINGS_PATH_RE` and `SETTINGS_NAME_RE` (the plan's original wording: "the u flag removed from the name patterns") | the original plan prediction | adds 114's `long s, absent local file` Write to the G8 list. Match for the plan's ORIGINAL prediction; it shows why G8 alone left it green: `/iu` folds the long s to `s` in the editing-tool pattern. |
| G8c `foldedName` without NFKC and the folded shell reading removed, `u` kept | 129's rows stay green, 120's row red | 120's long-s row only. Match (the corrected prediction (i): 129 turns red only if `u` is also removed). |
| G9 no home fallback in `configDir` | 121a, 121b | 121a, 121b (the `<home>/dot/claude` Write and shell rows). Match. |
| G10 the main checkout's `.ctoc/settings.json` left out of `protectedSettingsFiles` | 120's `src/m/settings.json` and `src/m/ſettings.json` shell rows; the Write through the link stays refused | exactly those two rows; the Write stays refused. Match. |
| N1 (fix 1) the absent-target folder-and-name test removed | 136 | 136's two alias rows (Data volume, `.nofollow`). Match. |
| N1b the absent-target test with the folder compare only (no name compare) | 122, 136 | 122 (`settings.json.bak`, `settings-old.json`, `settings.json.example`, `settings.local.json`) and 136's three `settings.local.json` rows. Match: the name compare is what keeps ordinary files allowed. |
| N1c the name compare only (no folder compare) | 122, 136, 137 | 122 (`src/settings.json`, `<cfg>/settings.local.json`), 136's three rows, 137's `src/settings.json`. Match: the folder compare is what keeps `src/settings.json` allowed. |
| N2 (fix 2) `isAbsentOrRegularFile` back to "not a directory" | 135 | 135's `ls 2>/dev/null` and `echo x > src/x.js 2>/dev/null` rows. Match. |
| N3 (fix 3) `configDir` without the catch | 137 | 137 (editing-tool rows: the crash sentence replaces the agent-settings sentence). Match. |

Mismatches vs predictions: one, G3, explained above (extra reds from the new alias test, none missing). Everything restored byte-identical; after the last restore both Step 8 files were green (169/169) and the later `npm test` is green.

The Step 11 critic dispatch (second checkbox) is the CTO Chief's and is not run here; it is unchanged by this phase.

### Step 12: OPTIMIZE (executor, phase B)

Medians of 20 spawned runs, the Step 9 script and parameters unchanged (two full repetitions; baseline from Step 9 in brackets):

| Call | Run 1 | Run 2 | Baseline (1 / 2) | Added |
|---|---|---|---|---|
| Write of the absent `src/x.js` | 25.9 ms | 26.4 ms | 24.2 / 25.4 | +1.7 / +1.0 ms |
| Edit of the existing `src/e.js` | 26.0 ms | 26.5 ms | 24.3 / 24.8 | +1.7 / +1.7 ms |
| Bash `ls` | 29.9 ms | 29.0 ms | 26.8 / 27.7 | +3.1 / +1.3 ms |
| Bash `git add` (5 operands) | 33.3 ms | 32.5 ms | 29.0 / 29.7 | +4.3 / +2.8 ms |
| Bash `git add` (128 operands) | 104.2 ms | 101.6 ms | 67.7 / 67.2 | +36.5 / +34.4 ms |

Stop rule (Decisions 24 and 33): none of the four ordinary calls adds more than 50 ms (largest +4.3 ms), so nothing stops the build. The 128-operand call adds about 35 ms (from about 67 ms to about 103 ms), under 50 ms, so no measured-cost statement is required; the number is quoted here. (It was about +27 ms in the early reading after Step 10; the later reading includes the two fixes.) Confirmed by reading the final code: every pattern is a literal or built only from `unicodeLiteral` (NFKC-folded, escaped) names, linear, and compiles under `u` (the whole new block runs with a `pr-cfg-` folder holding a `-`); a plain-ASCII command (NFKC leaves it unchanged) gets one reading per spec. The absent-target test adds at most two `stat` calls per protected file (seven at most) and runs only for an absent target of an agent's editing-tool call.

### Step 14: VERIFY (executor, phase B)

- `npm test` (the gated entry point), after the last code and documentation change: tests 13178, pass 13178, fail 0, skipped 0; `[CTOC test-gate] coverage 99.87% (threshold 99%), skipped 0, failed 0`; corpus claims PASS; `[CTOC test-gate] PASS`. `.ctoc/coverage-baseline.json` `minPct` is 99. `protect-records.js` line coverage 99.65%, uncovered lines 899–900, 936 and 1094, none of them from this plan. (An earlier `npm test` run failed one test, the lint test, because of the stray scratch file named above; removed; the full run above is the second.)
- `npx eslint . --max-warnings 0`: exit 0, zero warnings. `npm run typecheck` (the typecheck test): pass.
- The Step 9 suites ran inside the full suite: green; the dead-export and reachability suites are green (dead exports stay at 65; `resolveExisting` has a live caller in `protect-records.js`); `git status` shows `hooks/hooks.json` and `.claude-plugin/` unmodified, and the case "hooks/hooks.json registers exactly the one protection" is green.

### Step 15: DOCUMENT (executor, phase B)

- `docs/ENFORCEMENT.md` (84 lines added, 0 removed, checked with `git diff --numstat`): the new paragraph after "The regulatory settings" (claim in the plan's words, files a to d, for whom, channels including the alias test, the refusal sentence, the relay, the dressed menu call, the accepted false refusals, cases 112 to 137); the crash paragraph after "Fail rule." with its sentence quoted in full and the no-home note; and new list lines after the last item of "What it cannot catch" (main session by design, plugin cache, shell routes the text cannot read incl. git operations, the unnamed shell limits the security scan found: backslash in the file name, backslash-newline continuation, `?` and `*` patterns and brace lists, `$'…'`, `sh -c`, `env -C` or `git -C`, moving or deleting the whole `.ctoc` or `.claude` folder; the crash rule not seeing a hard link; the alias fix covering only the active config folder; a worktree outside `<main>/.claude/worktrees/`; Windows forms and inode 0; tools outside the five, a race, `CLAUDE_CONFIG_DIR` relative or with `~`; `statusline-setup`). The existing last item keeps its period (the list is additive; no existing sentence reworded).
- Header comment of `src/hooks/protect-records.js`: a new item in WHAT IT PROTECTS (after the "Only CTOC's own menu code writes these" sentence), a new paragraph in WHAT IT REFUSES (after the background agent's menu paragraph, before "Nothing else is loaded"), the limits in WHAT IT CANNOT CATCH (before "The full list is in `docs/ENFORCEMENT.md`."), and the crash sentence in FAIL RULE (lines rewrapped).
- `node --test tests/claude-md-keeps-every-rule.test.js tests/protect-records.test.js`: pass 148 (7 + 141), fail 0.

### Neighbours, added (executor, phase B)

- The `--settings` file Claude Code can be started with: a settings file given on the command line is not on the protected list.
- `src/lib/crypto.js` calls `os.homedir()` at load (line 13): with no home folder every Bash decision of the loaded hook crashes into the crash rule (finding 3 above); outside this plan's files.

### Second kickback to Step 10, from Step 13 (static-analysis finding, low) (executor, phase C)

The scan found that the editing-tool identity tests of `isAgentSettingsTarget` ran on `abs`, where `path.resolve` had already collapsed `y/..` by name, while the kernel applies `..` after following a link. Probe from the scan: `y` a link to `<cfg>/sub`, `<cfg>/foo` a link to `settings.json`; `<S>/y/../foo` leads to `<cfg>/settings.json` but was decided on `<S>/foo` and allowed.

- Test first: new case 138 in `tests/protect-records.test.js` (rows: Write and Edit of `<project>/src/y/../foo`, the same by a relative target, `src/z/../settings.json` as a control the name rule already refused, all refused for the agent and allowed for the main session and an empty agent id; allowed for the agent: `src/y/../fresh.txt`, `src/a/../b.js`, `src/a/../e.js`; the main session's `src/a/../b.js`).
- RED (before any change to `src/`): `node --test tests/protect-records.test.js` failed 138 only, first failing assertion `link then dot-dot, an existing link to the config file (background agent): expected exit 2, got 0`.
- Fix (`src/hooks/protect-records.js`): the identity part (existing target against the protected files; absent target by folder identity plus folded name) moved unchanged into `sameFileAsSettings(p, protectedFiles)`; `isAgentSettingsTarget(target, abs, raw = abs)` runs it on `abs` and, when different, on `raw`; `decide()` passes `raw = path.isAbsolute(target) ? target : `${payload.cwd || root}${path.sep}${target}``, which `statSync` resolves physically. A stat fault on either reading refuses (as before for `abs`); nothing throws. JSDoc of both functions updated.
- GREEN: `node --test tests/protect-records.test.js tests/agent-tool-grants.test.js`: tests 170, pass 170, fail 0, skipped 0.
- Guard row (N4), method as in Step 11 (row-level run on a scratch copy of the test file with non-throwing helpers; file restored from a byte copy, sha256 equal before and after): the raw-path reading removed (`|| (raw !== abs && sameFileAsSettings(raw, protectedFiles))`). Predicted: exactly the three refused rows that depend on the physical reading. Result: exactly those three rows red in 138 (`link then dot-dot, an existing link to the config file`, `link then dot-dot, Edit`, `link then dot-dot, relative target`, each `(background agent): expected exit 2, got 0`); the control `z/../settings.json`, the allowed rows and the main-session rows stay green; the real run of both test files: 169 pass, 1 fail (138). Match.
- Not guarded by a test on purpose: an ABSENT target reached through `y/..` takes the same two branches of `sameFileAsSettings` on the raw path; the absent-target test is covered by 136 on `abs`.

Documentation (all additive; none of the touched sentences is in `tests/fixtures/claude-md-rule-inventory.json`, whose rows with home `docs/ENFORCEMENT.md` are other sections; `tests/claude-md-keeps-every-rule.test.js` green):
- `docs/ENFORCEMENT.md`: a new line after "read commands with a write side effect (…), which can delete or corrupt a record but never forge one" saying `find … -exec <program> {} +` can write any content, so "never forge one" is not true for it (reasoned from the shared read exemption, not run against a record; the code fix is the owner's to schedule); the Channels sentence of the settings paragraph gains the two-reading note; "cases 112–137" became "112–138"; four new "What it cannot catch" lines: `find … -delete` / `-exec` on a settings file count as reads and are not refused (measured earlier), the macOS-alias fresh create in a config folder not called `.claude` that does not exist yet, the home folder's `.claude/settings.local.json` refused by the name rule (harmless), and the padded command taking several seconds (about 10 s against about 4 s before; a timed-out hook lets the call run; bounded by the follow-up plan "the write protection compares real files, not spellings").
- Header comment of `src/hooks/protect-records.js`: WHAT IT CANNOT CATCH gained the same limits (the `find` line, the alias, the padded command, the home folder's local file).

### Step 14: VERIFY again (executor, phase C)

- `npm test` after the last code and documentation change: tests 13179, pass 13179, fail 0, skipped 0; `[CTOC test-gate] coverage 99.88% (threshold 99%), skipped 0, failed 0`; corpus claims verified 3, refuted 0, unverifiable 0; `[CTOC test-gate] PASS`. Exit 0.
- `npx eslint . --max-warnings 0`: exit 0, zero warnings. `npm run typecheck`: pass (also runs inside `npm test`).
- Deviation: none in the code or tests. One slip of mine: a stray `cp` of the hook into `/tmp/x` (an existing folder) while taking a backup; the file was byte-identical to the source, I removed it (the empty folder was there before and is left).
- `git status --short` after this phase: ` M .ctoc/streaming/answers.jsonl` (changed before this phase), ` M docs/ENFORCEMENT.md`, ` M src/hooks/protect-records.js`, ` M tests/protect-records.test.js`, and untracked: the two approval records, the two question files, this plan under `plans/in-progress/`, and `plans/todo/the-write-protection-compares-real-files-not-spellings.md`.

### Step 11: REVIEW, critic (executor, records pass)

The critic (`iron-loop-critic`, dispatched by the CTO Chief) reviewed the Step 10 build. The code matched the plan function for function. Findings: important, a protected settings path linked to /dev/null made every agent shell command with `>/dev/null` refused (fixed in the first kickback, case 135); minor, `os.homedir` throwing reached the crash rule (fixed, case 137); two Step 11 prediction corrections (applied in phase B); a comment and a rewrap (done). Verdict after the fixes: resolved.

### Step 13: SECURE (executor, records pass)

Four checks. (i) Security scan (`security-scanner`) on the Step 10 build: BLOCK on one high finding, an agent could create the active config folder's `settings.json` through a macOS folder alias (`/System/Volumes/Data...`, `/.nofollow...`) when the folder is not named `.claude`; fixed in the first kickback by a parent-folder identity test (case 136); the unnamed shell limits are documented (phase B, Step 15). (ii) Static-analysis scan (`sast-scanner`) on 0d14793d: medium, `find -exec` and `-delete` count as reads in the shared read exemption (documented as a limit; the code fix is the owner's to schedule); low, a padded shell command takes about 10 s against 4 s (documented); low, the identity test read the path after `..` was collapsed by name (fixed in the second kickback, case 138); no regex, throw, pollution, execution or echo finding; eslint with the security plugin clean. (iii) Secrets scan (`secrets-detector`) on 0d14793d and the plan and record files: no secret and no personal information; gitleaks and trufflehog are not installed, so pattern and entropy searches only. (iv) Security re-check after the first kickback: PASS, 710 agent alias probes refused, 109 configurations with no lockout, 1,320 main-session calls byte-identical to the parent commit; one documentation line was asked for (a config folder not called `.claude` that does not exist yet), added in the second kickback.

### Step 13: SECURE, triage of an automatic commit review's flag (executor, records pass)

An automatic commit review flagged "path traversal / incomplete physical-path check in protect-records.js". The security scanner triaged it on 5c624db9: CONFIRMED BUT COVERED. The records protection tidies `..` by text before resolving links (a link then `..`, a link inside the waiting folder, a relative target under a linked working folder, `cd <link>` then `../` on the shell). This predates this change, and the queued plan "the write protection compares real files, not spellings" fixes it (its resolver rewrite and both readings). No defect of this change is confirmed. One settings case to name until that plan lands: an agent Write to `<root>/L/../foo`, where `L` links into a folder and `foo` there is a broken link to a settings file that does not exist yet, is allowed today (by reading; reachable only if Claude Code's Write follows `..` after a link, not verified). The follow-up plan's build is to add a test that it exits 2. `docs/ENFORCEMENT.md` names the case in the settings paragraph.

### Step 16: FINAL-REVIEW, so far (executor, records pass)

The final review (`iron-loop-critic`) found every acceptance criterion met with evidence except the live probe, which stays open until the release by design. It asked for the one-case note above and two documentation fixes (this pass: the padded-command line now says the follow-up plan will bound it once built and that until then nothing does; the settings paragraph names the broken-link case). Debt accepted, as listed in that review: the plugin cache, `find -exec` and `-delete`, `crypto.js` calling `homedir` at load, the neighbours.

### Records pass: verification (executor)

`node --test tests/claude-md-keeps-every-rule.test.js tests/protect-records.test.js tests/agent-tool-grants.test.js`: tests 177, pass 177, fail 0, skipped 0. `npx eslint . --max-warnings 0`: exit 0, zero warnings. No change in `src/` or `tests/` in this pass; the hook's header comment states neither point (it says only that a padded command takes several seconds), so it is unchanged.

### Port onto main (CTO Chief, 2026-10-17/18)

- The branch was rebased onto origin/main 76278489 (CTOC 6.14.130), without the question-step fix, which the coordinator held back and did not merge. The rebased commits are 67a397bd, 5785e9d1 and 2759006b.
- Main's switch `RECORD_REFUSALS_OFF` (the owner's order of 2026-10-15, "remove that hook block, it is wrong") turns the shell record-write refusal and the background-agent menu refusal off. By the coordinator's decision the background-agent settings shell check now runs inside that switch, right after the `.ctoc/settings.yaml`/regimes check, and is skipped for a pure call of the plugin's own menu. The editing-tool check is unchanged. Case 129's two dangling-link rows now assert the regulatory-settings sentence (the record check that refused them first is off), under a comment quoting the order. The question-step cases 97–111 do not exist on this base.
- Result on the rebased branch: `npm test` 13315 tests, 0 failed, 0 skipped, coverage 99.65% against the 99% floor, test gate PASS; `npx eslint . --max-warnings 0` clean. The load-sensitive main test "finding 2c: a colour change in a one-line stylesheet is judged in linear time" (`tests/hotfix-check-review-findings.test.js`) failed once under full-suite load on the ported code and passed alone and on the next full run.
- The final review's two blocking items were fixed (the Step 11 and Step 13 records, the deadline sentence). The automatic flag triages are recorded: path traversal, confirmed but covered by the follow-up plan; incomplete protected registry, not a defect of this fix.

Evidence per ticked acceptance box (records pass, read-only; re-run on the rebased branch: `node --test` on `tests/protect-records.test.js`, `tests/agent-tool-grants.test.js`, `tests/claude-md-keeps-every-rule.test.js`, the four bash-gate and ledger suites, `tests/export-reachability.test.js`, `tests/reachability.test.js`: tests 324, pass 324, fail 0, skipped 0):

1. Editing tools refused for every spelling and link form: cases 112, 113, 114, 115, 116, 117, 118, 120, 121a, 121b in the new block (Step 8 record; green after Step 10; green on the rebased branch).
2. Worktrees: case 120, "from a worktree, the main checkout's files; from the main checkout, a worktree's".
3. Home fallback: cases 121a (unset) and 121b (empty), plus 118 for a config folder reached through a link.
4. Agent shell writes refused with the same sentence, reads allowed: case 129 "shell writes" and case 131 "shell reads stay allowed for the background agent". On the rebased branch the dangling-link rows of 129 assert the regulatory-settings sentence (port section above).
5. Main-session and empty-agent-id halves (`agentOnly`): every case of the block runs both halves, green. Links (e): case 119 keeps the records sentence for every session for the editing tools. The dangling half of "shell writes" keeps today's decision on this base, which is the regulatory-settings sentence, because the shell record check is off here. The main session's dressed-menu-call half does not apply on this base: cases 97–111 do not exist here (the question-step fix was held back). What holds is the main-session half: every refused agent call is decided as today without `agent_id` (the `agentOnly` halves). The dressed-call half (cases 97–111 unchanged) is not testable on this base and is not claimed.
6. Order of checks: case 130 "the regulatory-settings check keeps running first" (green); the Step 11 critic's read of the calls in `decide()` and `bashRefuses()` (Step 11: REVIEW, critic).
7. Ordinary agent work stays allowed: cases 122 (base), 123–128 (configurations a–f, with the Edit of and Write over the existing `src/e.js`) and 135 (g).
8. A genuine menu call's arguments stay data: case 132.
9. The crash rule: case 133 "when the protection cannot run" (agent refused with `REFUSAL_AGENT_SETTINGS_UNCHECKED`, main session allowed).
10. `isLedgerWrite`: case 134 "a spec without dir runs the text tests only"; `ledger-forgery-closed`, `bash-gate-plan-coverage`, `bash-gate-payload-reader` and `the-bash-channel-cannot-reach-the-ledger-through-a-link` are green in the 324-test re-run above.
11. `deployment-setup.md`: the pinned sentence in `tests/agent-tool-grants.test.js` (red at Step 8, green after Step 10, green in the re-run above).
12. `hooks/hooks.json` unchanged: `git diff 76278489 HEAD -- hooks .claude-plugin` is empty; case 60 "hooks/hooks.json registers exactly the one protection" is green.
13. Dead exports and unreachable files: `.ctoc/export-reachability-baseline.json` `maxDead` 65 and `.ctoc/reachability-baseline.json` `maxUnreachable` 17, the numbers of Step 9; `tests/export-reachability.test.js` and `tests/reachability.test.js` green in the re-run above.
14. `npm test`, lint, typecheck: Step 14 records (13178 and 13179 tests before the port) and the port result above (13315 tests, 0 failed, 0 skipped, coverage 99.65% against the 99% floor, gate PASS; eslint clean). This records pass did not re-run the full suite.
15. Step 12 medians: the Step 12 table quotes all five, run 1 and run 2, and states the 128-operand cost (about +35 ms, under the 50 ms stop). Measured before the port; not re-measured on the rebased branch.
16. Step 16, first box (critic against every acceptance box): the "Step 16: FINAL-REVIEW, so far" record shows the final review ran and found every criterion met except the live probe; its blocking items were fixed (the Step 11 and Step 13 records, the deadline sentence; see the port section).

Left open: "Live, after the owner releases it: …" and the second Step 16 box (the live probe). Both need a release and are reported as not run.
