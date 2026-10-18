#!/usr/bin/env node
'use strict';
/**
 * CTOC write protection for the records that decide whether a plan may move on —
 * the ONLY CTOC hook Claude Code loads. It is registered alone in `hooks/hooks.json`
 * at the plugin root (PreToolUse; Write, Edit, MultiEdit, NotebookEdit, Bash). Every
 * other CTOC hook stays unregistered on purpose (`.claude-plugin/hooks.json` is not a
 * manifest Claude Code reads).
 *
 * WHAT IT PROTECTS
 *   - the approval records, `.ctoc/approvals/` — CTOC's record of the owner's approvals;
 *   - the check records, `.ctoc/state/verify/` — the Step-14 evidence a plan reaches done on;
 *   - the owner's answers and the live question files, everything under
 *     `.ctoc/streaming/` except the waiting folder `.ctoc/streaming/questions/pending/`,
 *     where question-writing agents drop new questions with the Write tool;
 *   - the project's settings file `.ctoc/settings.yaml` and its regulatory profiles,
 *     everything under `.ctoc/regulatory-regimes/` (owner's answer "a", 2026-10-08): the
 *     regime they declare decides whether a plan may move on by itself. Same tests as the
 *     records (letter case, `\`, `..`, symbolic links, `cd`, root-independent), its own
 *     refusal sentence; reading stays allowed. The menu's own routes write them: `start.js`
 *     and the start.md recipes `claude:set-environment`, `claude:env-keep-defaults` and
 *     `claude:set-compliance-regime`, which write through `src/lib/` and name no path.
 * Only CTOC's own menu code writes these (as Node file calls inside the menu process,
 * which never pass through a tool hook).
 *   - for BACKGROUND AGENTS only (owner, 2026-10-15, "fix that gap"), Claude Code's settings
 *     files and CTOC's own `.ctoc/settings.json`, which decide the hooks, environment and
 *     permissions every later call runs with: the project's `.claude/settings.json` and
 *     `.claude/settings.local.json`, `.ctoc/settings.json`, the user-level `settings.json` in
 *     the active Claude config folder (`CLAUDE_CONFIG_DIR` when set and not empty, else
 *     `<home>/.claude`), and, from a worktree at `<x>/.claude/worktrees/<name>`, the main
 *     checkout's three. The main session writes these, not the menu, so it is not refused.
 *
 * WHAT IT REFUSES
 *   Editing tools: a target inside any of the three areas — after `..` is resolved, in
 *   any letter case, with `\` read as `/`, through a symbolic link, and also by a
 *   root-independent path test so a session outside the project cannot write another
 *   copy's records. Reuses `PreToolUse.Edit.js` (`isProtectedLedgerPath`,
 *   `isProtectedVerifyPath`, `targetsStreamingLive`). The target is read as written (a `..`
 *   after a link goes to the link's real parent) and tidied (`..` removed by text); each
 *   reading is compared with each area by file identity through
 *   `real-path-confinement.resolvesUnder`, the waiting folder by its Unicode-folded name, the
 *   root-independent test on the Unicode-folded path and real path. From 5 seconds after the
 *   decision starts every walk fails and every check whose failure could let the call through
 *   refuses or is backed by one that refuses (`DECISION_BUDGET_MS`).
 *   Shell: a non-read command naming any area, directly, after a `cd`, from the
 *   session's working directory, or through a symbolic link; an inline script naming a
 *   record writer (the approval-ledger names, `step-13-verify`, `persistVerifyResult`,
 *   `verifyEvidencePath`, `crossBySufficiency`, `streamApprove`, `streamAnswer`) or
 *   whose code is built at run time; a decoded payload piped into an interpreter; and
 *   `ledger-backfill.js` in any form except `--vision` (optionally `--dry-run`).
 *   Reuses `PreToolUse.Bash.js` (`isLedgerForgery`, `isLedgerWrite`, `isInlineEval`,
 *   `isOpaqueDecodedExecution`, `VERIFY_SPEC`). A pure call of THIS plugin's own menu
 *   entry point is checked differently: no `$` other than `${CLAUDE_PLUGIN_ROOT}`, no
 *   backtick, backslash or unquoted control character, and the script argument —
 *   `${CLAUDE_PLUGIN_ROOT}` read as this plugin's root, resolved against the session's
 *   working directory — must have the same real path as this plugin's
 *   `src/commands/start.js` (a resolution fault means "not the menu"). The menu is the
 *   legitimate writer, so its quoted text arguments are data (a `--summary` may name a
 *   folder); but any whitespace-free argument that is a path into the approval or check
 *   records is still refused, exactly as the same operand would be without the menu in
 *   front. The answer store is not in that argument check, because the menu's own
 *   question-generation recipe passes `--touches .ctoc/streaming/questions/<ref>` as data.
 *   A Bash payload whose `command` is not a string is treated as unreadable (fail rule).
 *   A BACKGROUND AGENT (a payload with a non-empty `agent_id`, which Claude Code sends only
 *   for subagent calls) may run only the menu routes that write no answer, no approval and
 *   move no plan across a gate (`subagentMayRunRoute`: the build agent's own `menu task
 *   complete` without `--continue`, the task registry, the dashboard, the read-only screens,
 *   `plan <ref>`), matched as the WHOLE route with `menu task` held to its grammar and a
 *   `--b64` payload decoded by the task parser's own decoder; every other route is refused
 *   with its own sentence, fail closed. The menu is recognised by what Node runs: every word
 *   is resolved as Node resolves a script (from the working directory and every `cd`/`pushd`
 *   target; exact, `.js`, `.cjs`, `.mjs`, `index.js`), and `src/commands/start.js` under ANY
 *   directory whose manifest names "ctoc" is a CTOC menu (lower-case compare); inline code
 *   (`-e`, `-p`, `--eval`, `--print`, `--input-type`, piped in) naming `src/lib/`,
 *   `src/commands/` or the `ctoc` package is refused. `menu task` words are read by the menu's
 *   own `parseTaskArgs`. Its command gets ONE reading (`subagentMenuRefusal`):
 *   naming the menu, a menu module or a crossing function, it must be one simple call with no
 *   shell operator or expansion outside quotes, and is then allowed only as a read-only
 *   program naming the files or as the direct menu call — `node` (or an absolute node path),
 *   immediately this plugin's real `start.js`, an allowed route read with `start.js`'s own
 *   argument functions. No other script, no `node --test`, no option before the script, no
 *   `env` or `NAME=value` prefix, no other runtime. A double-quoted `--summary` the shell
 *   would expand gets one retry sentence ("Put the summary in single quotes …"). A call
 *   without `agent_id` is unchanged. Limits: a script written and then run without naming a
 *   menu module, a path held in a variable; and a harmless compound command naming the menu
 *   is refused (fail closed).
 *   A BACKGROUND AGENT AND THE SETTINGS FILES (owner, 2026-10-15). Only a payload with a
 *   non-empty `agent_id` is checked; every call without one is decided exactly as before.
 *   Editing tools: refused when the target is the same file (device and
 *   inode, after links, so hard links and every spelling the file system folds) as a protected
 *   file; or an ABSENT target in the same folder (device and inode) as a protected file with
 *   that file's folded name, which closes a fresh create through a path alias such as macOS
 *   `/System/Volumes/Data<folder>` (a fault reading either folder skips this test); or when the
 *   folded name of its path or of its real path (`resolveExisting`: NFKC, `\` read as `/`,
 *   NTFS stream suffixes and trailing dots and spaces dropped, lower case) is a protected
 *   name; or a settings file name is reached through a `..`. Shell: `isLedgerWrite` with one
 *   spec per protected file (text tests on the folder and file name, flags `iu`), read as
 *   written and NFKC-folded; a spec carries a link test only when the file's real path is
 *   absent or a regular file, so no configuration can refuse every command. Its own
 *   sentence. It runs INSIDE the `RECORD_REFUSALS_OFF` switch (the shell refusals of the records
 *   and the agent menu refusal are off, owner's order of 2026-10-15), right after the
 *   project's settings file and regulatory-profiles check, which runs first; it is skipped for
 *   a pure call of this plugin's own menu, whose arguments are data. This is a guard
 *   against honest mistakes and a name-and-identity check on the editing tools, NOT a
 *   containment boundary: isolating agents is. The settings check's real-path name test reads
 *   both forms (as written and tidied); the agent's shell settings specs keep their link test
 *   once the budget is spent (`fileSpec`, Decision 46); and the shell link test of the checks
 *   inside the switch compares by identity on the operand as written and tidied. Once the
 *   budget is spent `isLedgerWrite` refuses even a read-only command.
 *   Nothing else is loaded or run: no plan coverage, no escape phrases, no enforcement
 *   mode, no Iron Loop step gates, no irreversible-command net, no plan-move gate.
 *
 * WORKING DIRECTORY
 *   The hook calls `process.chdir(root)`, where `root` is the project root found by
 *   walking up from the payload's `cwd` (the same walk the menu uses). It does so because
 *   the reused checks measure paths against `process.cwd()`. This is safe only because
 *   every call is a fresh subprocess that exits right after deciding: the changed
 *   directory never outlives one decision and is never shared with another.
 *
 * WHAT IT CANNOT CATCH (it reads command text; it is not a sandbox)
 *   a script file written elsewhere and then run; a path built at run time (a variable,
 *   a glob, string pieces, `$'…'`); git operations that restore records without naming
 *   them; replacing a parent folder; hard links; operands beyond the first 128 per
 *   segment; file-writing tools other than the five matched; a background agent reaching a
 *   refused menu route through a script file, a path built at run time or another tool; and
 *   the main session running the menu's answering routes without the human's reply (it
 *   carries no `agent_id`).
 *   For the settings files (a background agent's shell route is the text only): a script
 *   written then run; a path held in a variable or built at run time; the file name spelled
 *   with a backslash (`settings\.json`), a backslash-newline continuation, `?` and `*`
 *   patterns or brace lists naming it, or `$'…'` quoting; a command run through `sh -c`,
 *   `env -C` or `git -C`; a hard link to, or a link through another spelling of, a protected
 *   file that gets no link test (its real path is neither absent nor a regular file); a copy or move whose destination names only the folder; git operations that
 *   rewrite `.ctoc/settings.json` without naming it; replacing, moving or deleting the whole
 *   `.claude` or `.ctoc` folder (the sandbox refuses the shell route into `.claude`, measured
 *   on 2026-10-15); the crash rule not seeing a hard link to a settings file; the config
 *   folder fix covering only the active config folder; a worktree outside
 *   `<main>/.claude/worktrees/`; 8.3 short names and file systems that report inode 0; the
 *   plugin's own files in the plugin cache; tools other than the five; a race between the
 *   decision and the write; `find … -delete` and `find … -exec <program> {} +` on a settings
 *   file (reads to the shell rules; `-exec` can write any content, so a record's "never
 *   forged" does not hold for it); a fresh create through a macOS folder alias in a config
 *   folder not called `.claude` that does not exist yet (no folder to compare); a padded
 *   command of tens of kilobytes: the walks and the shell's text work stop at 5 seconds and
 *   refuse (measured: 100 to 3,200 kilobytes of `cd` segments refused at 5.03 s), the rest
 *   of the shell's checks and Node's start-up are outside that budget, and Claude Code's
 *   hook timeout is 600 seconds; on the shell, a look-alike spelling of
 *   another copy's `.ctoc/settings.yaml` (the text rules are not folded); a link swapped
 *   mid-call; a stalled file system. The home folder's `.claude/settings.local.json` is refused by the name
 *   rule although it is not on the list. The full list is in `docs/ENFORCEMENT.md`.
 *
 * FAIL RULE
 *   A crash fails CLOSED only for a call that mentions the records
 *   (`UNCHECKED_SUSPECT_RE`, tested without loading anything but the dependency-free
 *   deny signal) and fails OPEN for the rest, so one broken release cannot stop every
 *   Write, Edit and Bash call in every project. When the payload parsed, only its
 *   `tool_input` is scanned, so a project whose path happens to contain one of the
 *   words (a `verify-project` folder) is not refused on every call; only a payload that
 *   will not parse is scanned whole. A crash on a background agent's call whose tool input
 *   mentions `start.js`, `menu-screens` or `streaming-gate` also fails closed; the main
 *   session's menu call does not. A crash on a background agent's call whose tool input,
 *   NFKC-folded, mentions `settings.json` or `settings.local.json` also fails closed, with
 *   its own sentence; the main session's call does not. A failure to load
 *   `hook-deny-signal.js` itself exits 1, which Claude Code treats as "not blocked".
 *
 * Refusal = the refusal sentence as one line on stderr, then the deny decision JSON on
 * stdout and exit 2 (`emitDeny`). Claude Code ignores the JSON when a hook exits 2 and
 * shows stderr to the agent instead, so the stderr line is how the agent learns why.
 * Allow = exit 0 with nothing on stdout. No banner, no log file.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { emitDeny } = require('../lib/hook-deny-signal');

const REFUSAL = 'CTOC refused this call because it writes, or could write, the approval records, '
  + "the check records or the owner's recorded answers, which only CTOC's menu writes; "
  + 'finish your work, report it, and let the menu record the result.';
const REFUSAL_UNCHECKED = 'CTOC refused this call because it mentions the approval or check records '
  + "and CTOC's protection for them failed to run; tell the human that this protection is broken.";
/** The one plain retry sentence for a double-quoted argument the shell would still expand. */
const REFUSAL_QUOTE = 'Put the summary in single quotes and run the same command again.';
const REFUSAL_SUBAGENT = "CTOC refused this call because a background agent may not answer CTOC's questions, "
  + 'approve a plan or move one on through the menu; report your result and let the main session do it.';

const REFUSAL_SETTINGS = "CTOC refused this call because it writes, or could write, the project's settings "
  + "file or its regulatory profiles, which only CTOC's menu writes; tell the human what you wanted to "
  + 'change and let the menu change it.';

/** The longest one decision may walk the file system (Claude Code lets a call run when its hook times out). */
const DECISION_BUDGET_MS = 5000;

/** The settings file or the profile folder as a path segment anywhere in an absolute path. */
const REGIME_SEGMENT_RE = /(^|\/)\.ctoc\/+(settings\.yaml|regulatory-regimes)(\/|$)/i;
/** The same two, relative to the project root, for the real-path (symbolic link) test. */
const REGIME_TARGETS = Object.freeze(['.ctoc/settings.yaml', '.ctoc/regulatory-regimes']);
/** The shell's per-segment tests (`isLedgerWrite`'s spec shape) for the same two. */
const SETTINGS_SPEC = Object.freeze({
  dir: '.ctoc/settings.yaml',
  segmentRe: /(^|[^a-z0-9._-])\.ctoc\/+settings\.yaml([^a-z0-9._-]|$)/i,
  resolvedRe: /(^|\/)\.ctoc\/+settings\.yaml$/i,
});
const REGIMES_SPEC = Object.freeze({
  dir: '.ctoc/regulatory-regimes',
  segmentRe: /(^|[^a-z0-9._-])\.ctoc\/+regulatory-regimes(\/|\s|$)/i,
  resolvedRe: /(^|\/)\.ctoc\/+regulatory-regimes(\/|$)/i,
});

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

/**
 * Is an editing tool's absolute target the settings file or inside the profile folder — by
 * name, Unicode-folded, on the path and on its real path, or by file identity
 * (`resolvesUnder`) — or through a symbolic link? The real-path test refuses on any fault, as
 * it does for the check records.
 * @param {string} abs
 * @returns {boolean}
 */
function isRegimeFile(abs) {
  if (namesProtected(abs, REGIME_SEGMENT_RE)) return true;
  const confinement = require('../lib/real-path-confinement');
  return REGIME_TARGETS.some((rel) => confinement.resolvesUnder(abs, rel, process.cwd()));
}

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

/**
 * The Claude config folder: `CLAUDE_CONFIG_DIR` when set and not empty, else `<home>/.claude`;
 * null when there is neither (`os.homedir()` throws where the account has no home folder), so
 * the config file leaves the protected list and the project's files stay protected.
 * @returns {string|null}
 */
function configDir() {
  const fromEnv = process.env.CLAUDE_CONFIG_DIR;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return path.resolve(fromEnv);
  try {
    return path.join(os.homedir(), '.claude');
  } catch {
    return null;
  }
}

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
  const { foldSegment } = require('../lib/real-path-confinement');
  const files = [
    path.join(root, '.claude', 'settings.json'),
    path.join(root, '.claude', 'settings.local.json'),
    path.join(root, '.ctoc', 'settings.json'),
  ];
  const config = configDir();
  if (config) files.push(path.join(config, 'settings.json'));
  const worktrees = path.dirname(root);
  const claudeFolder = path.dirname(worktrees);
  if (foldSegment(path.basename(worktrees)) === 'worktrees' && foldSegment(path.basename(claudeFolder)) === '.claude') {
    files.push(path.join(claudeFolder, 'settings.json'), path.join(claudeFolder, 'settings.local.json'),
      path.join(path.dirname(claudeFolder), '.ctoc', 'settings.json'));
  }
  return files;
}

/**
 * Is `p` absent or a regular file? A device (a link to `/dev/null`), a folder, a socket or a
 * stat fault is neither, so it gets no link test. Never throws.
 * @param {string} p
 * @returns {boolean}
 */
function isAbsentOrRegularFile(p) {
  try {
    return require('../lib/safe-fs').statSync(p).isFile();
  } catch (err) {
    const code = err && /** @type {NodeJS.ErrnoException} */ (err).code;
    return code === 'ENOENT' || code === 'ENOTDIR';
  }
}

/**
 * Does `p` lead to a protected file, by identity? True when it exists and is the same file (device
 * and inode) as a protected file that exists, or its stat faults other than "does not exist"; for
 * an absent `p`, when its folder is the same folder as a protected file's and its folded name is
 * that file's name — a path alias of a folder (macOS `/System/Volumes/Data<folder>`,
 * `/.nofollow<folder>`) cannot make a fresh create. A fault reading either folder skips that test.
 * @param {string} p
 * @param {string[]} protectedFiles - from `protectedSettingsFiles`
 * @returns {boolean}
 */
function sameFileAsSettings(p, protectedFiles) {
  const { fileIdentity } = require('../lib/real-path-confinement');
  const id = fileIdentity(p);
  if (id === undefined) return true;
  if (id !== null) return protectedFiles.some((file) => fileIdentity(file) === id);
  const parent = fileIdentity(path.dirname(p));
  const name = foldedName(path.basename(p));
  return Boolean(parent) && protectedFiles.some((file) => name === foldedName(path.basename(file))
    && fileIdentity(path.dirname(file)) === parent);
}

/**
 * Is an editing tool's target a file a background agent may not change? Any one of: the target
 * exists and is the same file (device and inode) as a protected file that exists — every
 * spelling the file system folds, every link, every hard link; the folded name of its lexical
 * path or of its real path (its real path read on the path collapsed by name and as written) is a protected
 * name (`.claude/settings(.local).json`, `.ctoc/settings.json`, or the config folder's
 * `settings.json`, lexical or real); or a settings
 * file name reached through a `..` (Claude Code may resolve `link/..` physically, not by name).
 * A stat fault on the target other than "does not exist", or a fault of its real path, refuses;
 * a protected file whose stat faults is dropped from the identity test (it never refuses every
 * Write), and a config file whose real path faults keeps only its lexical form. An absent target
 * is also refused when its folder is the same folder (device and inode) as a protected file's and
 * its folded name is that file's name — a path alias of a folder (macOS) cannot make a fresh create.
 * With no home folder and no `CLAUDE_CONFIG_DIR` the config file is left out of the list.
 * @param {string} target - the tool input's path, as given
 * @param {string} abs - the same, resolved against the session's working directory (`..` collapsed by name)
 * @param {string} [raw] - the same, joined to the working directory without normalising, which the
 *   identity tests read physically (the kernel applies `..` after following a link, not by name)
 * @returns {boolean}
 */
function isAgentSettingsTarget(target, abs, raw = abs) {
  const protectedFiles = protectedSettingsFiles(process.cwd());
  if (sameFileAsSettings(abs, protectedFiles) || (raw !== abs && sameFileAsSettings(raw, protectedFiles))) return true;
  const confinement = require('../lib/real-path-confinement');
  const configFolder = configDir();
  const config = [];
  if (configFolder) {
    const configFile = path.join(configFolder, 'settings.json');
    config.push(foldedName(configFile));
    const configReal = confinement.resolveExisting(configFile);
    if (configReal.ok) config.push(foldedName(configReal.real));
  }
  const names = (p) => {
    const n = foldedName(p);
    return AGENT_SETTINGS_PATH_RE.test(n) || config.includes(n);
  };
  if (names(abs)) return true;
  if (PARENT_SEGMENT_RE.test(String(target).normalize('NFKC')) && SETTINGS_NAME_RE.test(foldedName(target))) return true;
  // Both readings, as the records checks: a link of another name reached through `link/..`
  // leads where the as-written path goes, not where the name says (Decision 40).
  return [...new Set([abs, raw])].some((form) => {
    const real = confinement.resolveExisting(form);
    return !real.ok || names(real.real);
  });
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
 * `resolvesUnder` resolves — and is absent or a regular file (never a folder or a device such as
 * `/dev/null`), so no configuration can make the link test fault on, or contain, every operand;
 * once the decision budget is spent the `dir` is kept, so the link test refuses instead of being
 * dropped. A file in a folder with no name (a filesystem
 * root) gets no spec.
 * @param {string} file - the protected file, absolute
 * @param {string} root - the project root (the working directory after `chdir`)
 * @param {{ok: boolean, real: (string|null)}} base - `resolveExisting(root)`
 * @param {{resolveExisting: function(string): {ok: boolean, real: (string|null)}, budgetSpent: function(): boolean}} confinement
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
  if (rel !== '' && !path.isAbsolute(rel)) {
    const real = base.ok ? confinement.resolveExisting(path.join(base.real, rel)) : null;
    // Past the decision budget every walk faults: keep the link test, which then refuses at
    // `resolvesUnder`'s entry, rather than drop it (Decision 46). Asked after the walk, which
    // may itself run the budget out. This arm now stands behind `isLedgerWrite`'s own budget
    // check in the shell hook; no test shows it red on its own.
    if (confinement.budgetSpent() || (real !== null && real.ok && isAbsentOrRegularFile(real.real))) spec.dir = rel;
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

/** A record area as a path segment anywhere in an absolute path; the waiting folder is excluded. */
const RECORD_SEGMENT_RE = /(^|\/)\.ctoc\/+(approvals|state\/+verify|streaming(?!\/+questions\/+pending(\/|$)))(\/|$)/i;

/**
 * The question-and-answer store for the shell's per-segment test (`isLedgerWrite`'s spec
 * shape). The whole store: the waiting folder's only writers hold the Write tool, not a shell.
 */
const STREAMING_SPEC = Object.freeze({
  dir: '.ctoc/streaming',
  segmentRe: /(^|[^a-z0-9._-])\.ctoc\/+streaming(\/|\s|$)/i,
  resolvedRe: /(^|\/)\.ctoc\/+streaming(\/|$)/i,
});

const CHECK_RECORD_EVAL_TOKENS = [
  /step-13-verify/i, /\bpersistVerifyResult\b/, /\bverifyEvidencePath\b/,
  /\bcrossBySufficiency\b/, /\bstreamApprove\b/, /\bstreamAnswer\b/,
];
const UNCHECKED_SUSPECT_RE = /\.ctoc|approval|verify|ledger|backfill|stampAndLedger|approvePlan|crossBySufficiency|streamApprove|streamAnswer|persistVerifyResult/i;
const EDITING_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

const BACKFILL_TOKEN_RE = /(^|[/\\])ledger[-_]backfill(\.js)?$/i;
const JS_RUNTIME_RE = /^(node[0-9.]*|deno|bun|ts-node|tsx)(\.exe)?$/i;
const PLUGIN_ROOT_TOKEN = '${CLAUDE_PLUGIN_ROOT}';
const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');

/**
 * The arguments of a call of THIS plugin's menu entry point and nothing else, or null.
 * Null when the text holds a backslash, a backtick, a `$` other than
 * `${CLAUDE_PLUGIN_ROOT}`, an unclosed quote, or a `;`, `&`, `|`, `<`, `>`, carriage
 * return or newline outside quotes; when it is not `node <script> …`; or when the script,
 * with `${CLAUDE_PLUGIN_ROOT}` read as this plugin's root and resolved against `base`,
 * does not have the same real path as this plugin's own `src/commands/start.js`
 * (a resolution fault is "not the menu").
 * @param {string} command
 * @param {string} base - the session's working directory
 * @returns {string[]|null} the arguments after the script, quotes removed
 */
function menuCallArgs(command, base) {
  const s = command.trim();
  if (/[\\`]/.test(s) || s.split(PLUGIN_ROOT_TOKEN).join('').includes('$')) return null;
  const tokens = [];
  let cur = '';
  let inToken = false;
  let quote = null;
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null; else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch; inToken = true;
    } else if (';&|<>\r\n'.includes(ch)) {
      return null;
    } else if (/\s/.test(ch)) {
      if (inToken) tokens.push(cur);
      cur = ''; inToken = false;
    } else {
      cur += ch; inToken = true;
    }
  }
  if (quote !== null) return null;
  if (inToken) tokens.push(cur);
  if (tokens[0] !== 'node' || !tokens[1]) return null;
  try {
    const safeFs = require('../lib/safe-fs');
    const script = path.resolve(base, tokens[1].split(PLUGIN_ROOT_TOKEN).join(PLUGIN_ROOT));
    const own = safeFs.realpathSync(path.join(PLUGIN_ROOT, 'src', 'commands', 'start.js'));
    return safeFs.realpathSync(script) === own ? tokens.slice(2) : null;
  } catch {
    return null; // a resolution fault (or safe-fs refusing the path) is "not the menu"
  }
}

/**
 * Does a genuine menu call carry an argument that is a path into the approval or check
 * records? Quoted text with whitespace is data and is skipped; every whitespace-free
 * argument gets the same per-segment, `cd`-aware, link-aware test as a shell operand.
 * @param {string[]} args - from `menuCallArgs`
 * @param {string} cwdRel - the session's working directory relative to the root, or ''
 * @param {object} bash - the exports of `PreToolUse.Bash.js`
 * @returns {boolean}
 */
function menuArgsNameRecords(args, cwdRel, bash) {
  const pathArgs = args.filter((a) => a && !/\s/.test(a));
  if (pathArgs.length === 0) return false;
  const synthetic = `${cwdRel ? `cd ./${cwdRel} && ` : ''}node ${pathArgs.join(' ')}`;
  return bash.isLedgerWrite(synthetic) || bash.isLedgerWrite(synthetic, bash.VERIFY_SPEC);
}

/**
 * Does the command run `ledger-backfill.js` in any form other than exactly
 * `<runtime> <script> --vision` (optionally with `--dry-run`, either order)?
 * @param {string} command
 * @param {{isInlineEval: function(string): boolean}} bash
 * @returns {boolean}
 */
function runsBackfillBeyondVision(command, bash) {
  if (!/ledger[-_]backfill/i.test(command)) return false;
  if (bash.isInlineEval(command)) return true;
  for (const seg of command.split(/\r?\n|;|&&|\|\||\||&/)) {
    const tokens = seg.trim().split(/\s+/).filter(Boolean).map((t) => t.replace(/['"`]/g, ''));
    const at = tokens.findIndex((t) => BACKFILL_TOKEN_RE.test(t));
    if (at === -1) continue;
    const runtime = tokens.some((t) => JS_RUNTIME_RE.test(t.split(/[/\\]/).pop()));
    if (at !== 0 && !runtime) continue; // the segment only mentions the file
    const rest = tokens.slice(2).sort().join(' ');
    const exact = JS_RUNTIME_RE.test(tokens[0].split(/[/\\]/).pop()) && at === 1
      && (rest === '--vision' || rest === '--dry-run --vision');
    if (!exact) return true;
  }
  return false;
}

/**
 * Is this call a background agent's? Claude Code's PreToolUse input carries `agent_id` only
 * when a subagent makes the call, never for the main session; only a non-empty one counts.
 * @param {object} payload
 * @returns {boolean}
 */
function isSubagent(payload) {
  return Boolean(payload) && typeof payload.agent_id === 'string' && payload.agent_id.trim() !== '';
}

/** Read-only inbox screens, matched as the whole route. */
const READ_INBOX = new Set(['questions', 'decisions', 'gates', 'escalations', 'migration', 'verify', 'stale']);
/** Read-only top-level routes taking exactly one argument. */
const ONE_ARG_ROUTES = new Set(['task', 'browse', 'section', 'stubs', 'validate', 'plan']);
/**
 * `menu task <sub>`: the fields of `menu-screens.parseTaskArgs` each allowed sub-command may
 * carry, and how many positional words it takes. `force` (the human's override), `continue`
 * and `fail` are on none of them; a word the parser keeps as positional but that looks like a
 * flag (`--frob`) refuses.
 */
const TASK_GRAMMAR = Object.freeze({
  add: { fields: ['touches', 'blocked', 'gitop', 'label', 'b64'], min: 1, max: 2 },
  start: { fields: ['agentId'], min: 1, max: 1 },
  fail: { fields: ['summary'], min: 1, max: 1 },
  cancel: { fields: [], min: 1, max: 1 },
  complete: { fields: ['summary', 'gate', 'next', 'b64'], min: 1, max: 1 },
  list: { fields: [], min: 0, max: 0 },
  board: { fields: [], min: 0, max: 0 },
});
/** Every field `parseTaskArgs` can set from a flag. */
const TASK_FIELDS = ['touches', 'blocked', 'gitop', 'fail', 'force', 'label', 'summary', 'next', 'agentId', 'gate', 'b64', 'continue'];
/** The keys a decoded `--b64` payload may carry, per sub-command (what the menu reads). */
const B64_KEYS = Object.freeze({
  add: new Set(['kind', 'plan', 'label', 'touches', 'blockedBy', 'gitOp']),
  complete: new Set(['summary', 'nextAction', 'gate']),
});

/** Is `route` a navigation route (`taskView.isNavRoute`, the check `menu task complete` applies)? */
function isNavRoute(route) {
  return typeof route === 'string' && require('../lib/task-view').isNavRoute(route);
}

/**
 * Does a `--b64` value decode — with the task parser's own decoder — to a plain object
 * carrying only the keys the sub-command reads, and nothing that crosses a gate?
 */
function b64Allowed(sub, value) {
  const decoded = require('../lib/menu-screens').decodeB64(value);
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return false;
  if (!Object.keys(decoded).every((k) => B64_KEYS[sub].has(k))) return false;
  return decoded.nextAction === undefined || isNavRoute(decoded.nextAction);
}

/**
 * Do the words after `menu task <sub>` fit that sub-command's grammar exactly? They are read
 * by the menu's own `parseTaskArgs`, so the protection and the menu can never read them
 * differently.
 */
function taskArgsAllowed(sub, words) {
  const grammar = Object.prototype.hasOwnProperty.call(TASK_GRAMMAR, sub) ? TASK_GRAMMAR[sub] : null;
  if (!grammar) return false;
  const parsed = require('../lib/menu-screens').parseTaskArgs(words);
  const present = (f) => (f === 'gitop' || f === 'fail' ? parsed[f] === true : parsed[f] !== undefined);
  if (TASK_FIELDS.some((f) => present(f) && !grammar.fields.includes(f))) return false;
  if (parsed.positional.some((w) => String(w).startsWith('-'))) return false;
  if (parsed.positional.length < grammar.min || parsed.positional.length > grammar.max) return false;
  if (parsed.b64 !== undefined && !b64Allowed(sub, parsed.b64)) return false;
  return parsed.next === undefined || isNavRoute(parsed.next);
}

/**
 * May a background agent run this menu route? The WHOLE route, as the router will dispatch
 * it, must be one of the routes that write no answer, no approval and move no plan across a
 * gate: `menu`, `menu commands`, the task registry's sub-commands within their grammar (the
 * build agent's own completion without `--continue`), `dashboard`, `tasks`, one-argument
 * read screens, the read-only inbox screens, and `inbox cleanup` / `cleanup category` /
 * `cleanup plan <slug>` (never confirm or override). An unknown or extra word refuses, and so
 * does any route the router gains later (fail closed).
 * @param {string[]} route - as `start.js` hands it to the router
 * @returns {boolean}
 */
function subagentMayRunRoute(route) {
  const [cmd, sub] = route;
  const n = route.length;
  if (cmd === 'menu') {
    if (n === 1 || (n === 2 && sub === 'commands')) return true;
    return sub === 'task' && n >= 3 && taskArgsAllowed(route[2], route.slice(3));
  }
  if (cmd === 'dashboard' || cmd === 'tasks') return n === 1;
  if (ONE_ARG_ROUTES.has(cmd)) return n === 2 && route[1] !== '';
  if (cmd === 'inbox') {
    if (n === 2 && (READ_INBOX.has(sub) || sub === 'cleanup')) return true;
    if (sub !== 'cleanup') return false;
    return (n === 3 && route[2] === 'category') || (n === 4 && route[2] === 'plan' && route[3] !== '');
  }
  return false;
}

/** Names that reach the menu or a gate crossing; a background agent's command naming one gets the strict reading. */
const MENU_MENTION_RE = /start\.js|menu-screens|streaming-gate|streaming-precompute|continueAfterCrossing|approveSubplans|approvePlan|streamAnswer|streamApprove|crossBySufficiency|crossOnEvidence|pendingGateDecisions/;
/** Shell syntax that makes a command more than one plain call; none is accepted outside quotes. */
const SHELL_SPECIAL_RE = /[;&|`$(){}<>*?[\]~!#\\\r\n]/;
/** Characters the shell still interprets inside double quotes (`!` is literal in a non-interactive shell). */
const DOUBLE_QUOTE_SPECIAL_RE = /[$`\\]/;
/** Programs that only read the files they are given. */
const READ_PROGRAMS = new Set(['grep', 'rg', 'cat', 'head', 'tail', 'wc', 'ls', 'diff']);
const ROOT_MARK = '\u0001';

/**
 * The words of `command` when it is ONE simple call the shell reads exactly as written: no
 * shell operator or expansion outside quotes; each quoted argument is a single pair of quotes
 * around the whole word — inside single quotes anything, inside double quotes anything but
 * `$`, a backtick and a backslash, which the shell still expands; `${CLAUDE_PLUGIN_ROOT}` only
 * inside the second word, the script. With no expansion and no operator there is nothing the
 * shell can read differently from this. Returns `'quote'` when the only fault is an expansion
 * inside a double-quoted `--summary` value (the caller asks for single quotes), null for any
 * other fault.
 * @param {string} command
 * @returns {string[]|'quote'|null}
 */
function simpleWords(command) {
  const text = command.trim().split(PLUGIN_ROOT_TOKEN).join(ROOT_MARK);
  if (/[\u0000\u0002-\u0008\u000b-\u001f\u007f]/.test(text)) return null;
  const words = [];
  let cur = '';
  let inWord = false;
  let quote = null;
  let closed = false;
  const expanding = new Set(); // indexes of double-quoted words the shell would still expand
  for (const ch of text) {
    if (quote) {
      if (ch === quote) { quote = null; closed = true; continue; }
      if (quote === '"' && DOUBLE_QUOTE_SPECIAL_RE.test(ch)) expanding.add(words.length);
      cur += ch;
    } else if (ch === ' ' || ch === '\t') {
      if (inWord) words.push(cur);
      cur = ''; inWord = false; closed = false;
    } else if (closed) {
      return null; // a quote must close at the end of its word
    } else if (ch === '"' || ch === "'") {
      if (inWord) return null; // a quote must open at the start of its word
      quote = ch; inWord = true;
    } else if (SHELL_SPECIAL_RE.test(ch)) {
      return null;
    } else {
      cur += ch; inWord = true;
    }
  }
  if (quote) return null;
  if (inWord) words.push(cur);
  if (words.some((w, i) => i !== 1 && w.includes(ROOT_MARK))) return null;
  if (expanding.size === 0) return words;
  // Only a summary gets the retry sentence; any other expanding word is plainly refused.
  return [...expanding].every((i) => i > 0 && words[i - 1] === '--summary') ? 'quote' : null;
}

/** `node`, or an absolute path to a node binary. */
function isNodeProgram(word) {
  return word === 'node' || (path.isAbsolute(word) && /^node(\.exe)?$/i.test(path.basename(word)));
}

/** The extensions Node tries for a script named without one, in its order. */
const NODE_EXTENSIONS = ['', '.js', '.cjs', '.mjs'];
/** A JavaScript runtime or package runner, by the word's last path segment. */
const RUNTIME_WORD_RE = /^(node[0-9.]*|deno|bun|ts-node|tsx|npx)(\.exe)?$/i;
/** Node's options that take code instead of a script (an `=value` form included). */
const EVAL_FLAGS = new Set(['-e', '-p', '-pe', '-ep', '--eval', '--print', '--input-type']);
const isEvalFlag = (word) => EVAL_FLAGS.has(word.split('=')[0]);
/** Code text that reaches CTOC's code: a path into `src/lib/` or `src/commands/`, or the `ctoc` package by name. */
const CTOC_PATH_TEXT_RE = /src[\\/]+(?:lib|commands)(?:[\\/]|\b)/i;
const CTOC_PACKAGE_TEXT_RE = /['"`/]ctoc(?:['"`/]|$)/i;
const namesCtocCodeText = (text) => CTOC_PATH_TEXT_RE.test(text) || CTOC_PACKAGE_TEXT_RE.test(text);
/** A word that points into a `src/commands` folder by its text. */
const COMMANDS_TEXT_RE = /(^|[\\/])src[\\/]+commands([\\/]|$)/i;

/** Is `file` a regular file? Any fault is "no". */
function isFile(file) {
  try {
    return require('../lib/safe-fs').statSync(file).isFile();
  } catch {
    return false;
  }
}

/**
 * The real path of the file Node would run for `word` from `dir`: the exact path, then with
 * `.js`, `.cjs`, `.mjs`, then the directory's `index.js` — or null when none exists.
 */
function resolveLikeNode(dir, word) {
  const base = path.resolve(dir, word);
  const candidates = NODE_EXTENSIONS.map((ext) => base + ext).concat(path.join(base, 'index.js'));
  for (const candidate of candidates) {
    if (!isFile(candidate)) continue;
    try {
      return require('../lib/safe-fs').realpathSync(candidate);
    } catch {
      return null; // it exists but cannot be resolved: treated as not found, and refused if it points into src/commands
    }
  }
  return null;
}

/** Does a directory's package.json or .claude-plugin/plugin.json name the package "ctoc"? */
function namesCtoc(dir) {
  for (const manifest of [['package.json'], ['.claude-plugin', 'plugin.json']]) {
    try {
      const json = JSON.parse(require('../lib/safe-fs').readFileSync(path.join(dir, ...manifest), 'utf8'));
      if (json && typeof json.name === 'string' && json.name.toLowerCase() === 'ctoc') return true;
    } catch {
      continue; // no such manifest, or not JSON: it names nothing
    }
  }
  return false;
}

/**
 * What a real file path is to CTOC: `'menu'` for `src/commands/start.js` under ANY directory
 * whose manifest names "ctoc" (this plugin, the repository, an older marketplace copy), `'code'`
 * for anything else under such a directory's `src/lib/` or `src/commands/`, else null. Compared
 * in lower case, so a case-insensitive file system cannot dress the menu up as another file.
 */
function ctocKind(real) {
  let dir = path.dirname(real);
  for (let depth = 0; depth < 16; depth++) {
    if (namesCtoc(dir)) {
      const rel = path.relative(dir, real).split(path.sep).join('/').toLowerCase();
      if (rel === 'src/commands/start.js') return 'menu';
      return rel.startsWith('src/lib/') || rel.startsWith('src/commands/') ? 'code' : null;
    }
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
  return null;
}

/**
 * Does any word of `command` — resolved the way Node resolves a script, from the working
 * directory and from every directory a `cd` or `pushd` in the command names — reach CTOC's menu
 * or code, or point by its text into a `src/commands` folder that holds no such file?
 */
function reachesCtocCode(command, base) {
  const text = command.split(PLUGIN_ROOT_TOKEN).join(PLUGIN_ROOT);
  const words = text.split(/[\s;&|<>()`'"=,[\]{}]+/).filter((w) => w && !w.includes('$'));
  const dirs = [base];
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === 'cd' || words[i] === 'pushd') dirs.push(path.resolve(dirs[dirs.length - 1], words[i + 1]));
  }
  for (const word of words) {
    if (word.startsWith('-')) continue;
    let found = false;
    for (const dir of dirs) {
      const real = resolveLikeNode(dir, word);
      if (real === null) continue;
      found = true;
      if (ctocKind(real) !== null) return true;
    }
    if (!found && COMMANDS_TEXT_RE.test(word)) return true;
  }
  return false;
}

/**
 * Does the command hand a JavaScript runtime code (an eval option, or code piped or redirected
 * in) that names CTOC's code? A simple call is read exactly — an eval option among the
 * runtime's options before its script; any other command is read loosely (any runtime word, any
 * eval-looking word, any `|` or `<`), the fail-closed direction.
 */
function inlineCtocCode(command) {
  if (!namesCtocCodeText(command)) return false;
  const simple = simpleWords(command);
  if (Array.isArray(simple)) {
    if (!RUNTIME_WORD_RE.test(simple[0].split(/[\\/]/).pop())) return false;
    const options = [];
    for (const w of simple.slice(1)) {
      if (!w.startsWith('-')) break;
      options.push(w);
    }
    return options.some(isEvalFlag) || simple.length === 1;
  }
  const words = command.split(/[\s;&|<>()]+/).map((w) => w.replace(/['"`]/g, ''));
  if (!words.some((w) => RUNTIME_WORD_RE.test(w.split(/[\\/]/).pop()))) return false;
  return words.some(isEvalFlag) || /[|<]/.test(command);
}

/**
 * A background agent's command gets ONE reading whenever it could reach CTOC: it names the
 * menu, a menu module or a crossing function (`MENU_MENTION_RE`), any of its words resolves —
 * as Node resolves a script, from the working directory or a directory the command `cd`s into
 * — to CTOC's menu or code in any CTOC copy, a word points into a `src/commands` folder that
 * holds no such file, its text carries a path into `src/lib/` or `src/commands/` (whatever
 * interpreter carries it), or it hands Node inline code naming CTOC's code. Such a command is
 * allowed only as (a) one simple call of a read-only program, or (b) one simple direct call:
 * `node` (or an absolute node path), immediately a script that resolves to a CTOC menu
 * (`src/commands/start.js` under a directory whose manifest names "ctoc"), then a route that —
 * read by `start.js`'s own `extractLiveAgentIds` and `splitCliArgs` — is on the allowed list.
 * Every CTOC menu gets the same list. A double-quoted `--summary` the shell would expand gets
 * the one retry sentence; everything else is refused (fail closed).
 * @param {string} command
 * @param {string} base - the session's working directory
 * @returns {string|null} the refusal sentence, or null to go on to the record checks
 */
function subagentMenuRefusal(command, base) {
  if (inlineCtocCode(command)) return REFUSAL_SUBAGENT;
  // Any command whose text carries a path into `src/lib/` or `src/commands/` gets the strict
  // reading too, whatever interpreter carries it (python, ruby, perl, osascript …): only a plain
  // read or the direct menu call passes. (Not the package name: `cd …/ctoc && npm test` must pass.)
  if (!MENU_MENTION_RE.test(command) && !CTOC_PATH_TEXT_RE.test(command) && !reachesCtocCode(command, base)) return null;
  const words = simpleWords(command);
  if (words === 'quote') return REFUSAL_QUOTE;
  if (!words || words.length === 0) return REFUSAL_SUBAGENT;
  if (READ_PROGRAMS.has(words[0])) return null;
  if (!isNodeProgram(words[0]) || !words[1] || words[1].startsWith('-')) return REFUSAL_SUBAGENT;
  const real = resolveLikeNode(base, words[1].split(ROOT_MARK).join(PLUGIN_ROOT));
  if (real === null || ctocKind(real) !== 'menu') return REFUSAL_SUBAGENT;
  const { extractLiveAgentIds, splitCliArgs } = require('../commands/start.js');
  return subagentMayRunRoute(splitCliArgs(extractLiveAgentIds(words.slice(2)).rest)) ? null : REFUSAL_SUBAGENT;
}

/**
 * The shell decision, in the plan's order.
 * @param {string} command
 * @param {string} cwdRel - the session's working directory relative to the root, or ''
 * @param {string} base - the session's working directory, absolute
 * @param {object} bash - the exports of `PreToolUse.Bash.js`
 * @param {boolean} [subagent] - the call carries a non-empty `agent_id`
 * @returns {string|null} the refusal sentence, or null to allow
 */
const RECORD_REFUSALS_OFF = true;

function bashRefuses(command, cwdRel, base, bash, subagent = false) {
  // Tijn, 15 October 2026: "remove that hook block, it is wrong". The record-write refusal and
  // the background-agent refusal are off; the settings-file refusal below stays.
  if (RECORD_REFUSALS_OFF) {
    const cwdCommand = cwdRel ? `cd ./${cwdRel} && ${command}` : command;
    if (bash.isLedgerWrite(cwdCommand, SETTINGS_SPEC) || bash.isLedgerWrite(cwdCommand, REGIMES_SPEC)) return REFUSAL_SETTINGS;
    // A background agent and Claude Code's settings files (owner, 2026-10-15, "fix that gap"). A
    // genuine pure call of this plugin's own menu keeps its arguments as data here too (a
    // `--summary` may name a settings file), so the agent check is skipped for it.
    if (subagent && !menuCallArgs(command, base)) {
      // Read twice: as written, and NFKC-folded (long-s and full-width forms); the link test sees a
      // long-s operand as spelled, because realpath keeps it, so only the folded reading resolves it.
      const folded = cwdCommand.normalize('NFKC');
      const writes = (spec) => bash.isLedgerWrite(cwdCommand, spec)
        || (folded !== cwdCommand && bash.isLedgerWrite(folded, spec));
      if (agentSettingsSpecs().some(writes)) return REFUSAL_AGENT_SETTINGS;
    }
    return null;
  }
  if (subagent) {
    const refused = subagentMenuRefusal(command, base);
    if (refused) return refused;
  }
  const menuArgs = menuCallArgs(command, base);
  if (menuArgs) return menuArgsNameRecords(menuArgs, cwdRel, bash) ? REFUSAL : null;
  // `./` so a working directory whose name starts with `-` is never read as a `cd` option.
  const analysed = cwdRel ? `cd ./${cwdRel} && ${command}` : command;
  const refused = bash.isLedgerForgery(analysed).deny
    || bash.isOpaqueDecodedExecution(command)
    || bash.isLedgerWrite(analysed, bash.VERIFY_SPEC)
    || bash.isLedgerWrite(analysed, STREAMING_SPEC)
    || (bash.isInlineEval(command) && CHECK_RECORD_EVAL_TOKENS.some((re) => re.test(command)))
    || runsBackfillBeyondVision(command, bash);
  if (refused) return REFUSAL;
  if (bash.isLedgerWrite(analysed, SETTINGS_SPEC) || bash.isLedgerWrite(analysed, REGIMES_SPEC)) return REFUSAL_SETTINGS;
  return null;
}

/**
 * The decision for one payload. Requires are inside, so a module that fails to load is
 * a throw the caller's fail rule handles.
 * @param {object} payload - the parsed stdin JSON
 * @returns {string|null} the refusal sentence, or null to allow
 */
function decide(payload) {
  const { findProjectRoot } = require('../lib/project-root');
  // The decision budget. A resolver that fails to load leaves no walk to bound and must never turn
  // this line into a throw before the shell branch (Decision 35); the catch states what it absorbs.
  let budgetResolver = null;
  try { budgetResolver = require('../lib/real-path-confinement'); } catch { budgetResolver = null; }
  if (budgetResolver !== null) budgetResolver.setDeadline(Date.now() + DECISION_BUDGET_MS);
  const root = findProjectRoot(payload.cwd || process.cwd());
  process.chdir(root); // the reused checks measure against process.cwd()
  const tool = payload.tool_name;
  if (EDITING_TOOLS.has(tool)) {
    const edit = require('./PreToolUse.Edit.js');
    const target = edit.getTargetFile(payload);
    if (!target) return null;
    const abs = path.resolve(payload.cwd || root, target);
    // As written: `..` after a link is the link's real parent to the file system. Tidied (`abs`):
    // what a tool that tidies the path before opening it would open. Either refusal refuses.
    const raw = path.isAbsolute(target) ? target : `${payload.cwd || root}${path.sep}${target}`;
    const forms = raw === abs ? [abs] : [abs, raw];
    if (forms.some((form) => edit.isProtectedLedgerPath(form) || edit.isProtectedVerifyPath(form)
      || edit.targetsStreamingLive(form) || namesProtected(form, RECORD_SEGMENT_RE))) return REFUSAL;
    if (forms.some(isRegimeFile)) return REFUSAL_SETTINGS;
    if (isSubagent(payload) && isAgentSettingsTarget(target, abs, raw)) return REFUSAL_AGENT_SETTINGS;
    return null;
  }
  if (tool === 'Bash') {
    const command = payload.tool_input && payload.tool_input.command;
    // A command that is not a string cannot be read; the fail rule decides it.
    if (typeof command !== 'string') throw new TypeError('Bash command is not a string');
    if (!command.trim()) return null;
    const bash = require('./PreToolUse.Bash.js');
    let cwdRel = typeof payload.cwd === 'string' ? path.relative(root, payload.cwd).replace(/\\/g, '/') : '';
    if (!/^[A-Za-z0-9._/-]+$/.test(cwdRel)) cwdRel = '';
    return bashRefuses(command, cwdRel, path.resolve(root, payload.cwd || '.'), bash, isSubagent(payload));
  }
  return null;
}

/**
 * Refuse: the sentence on stderr (what Claude Code shows the agent on exit 2), then the
 * decision JSON on stdout and exit 2.
 * @param {string} sentence
 */
function refuse(sentence) {
  process.stderr.write(`${sentence}\n`);
  emitDeny(sentence);
}

function main() {
  let raw;
  try { raw = fs.readFileSync(0, 'utf8'); } catch { process.exit(0); }
  if (!raw) process.exit(0);
  let payload = null;
  try { payload = JSON.parse(raw); } catch { payload = null; }
  let refused;
  try {
    if (payload === null || typeof payload !== 'object') throw new TypeError('payload is not a JSON object');
    refused = decide(payload);
  } catch {
    // Fail rule: scan only what the call does when the payload parsed, else the raw text.
    const parsed = payload !== null && typeof payload === 'object';
    const scanned = parsed
      ? String(JSON.stringify(payload.tool_input === undefined ? null : payload.tool_input))
      : raw;
    // A background agent's call that reaches for the menu fails closed too; the main
    // session's menu call does not, so one broken release never locks the human out.
    if (UNCHECKED_SUSPECT_RE.test(scanned) || (parsed && isSubagent(payload) && MENU_MENTION_RE.test(scanned))) {
      refuse(REFUSAL_UNCHECKED);
    }
    if (parsed && isSubagent(payload) && SETTINGS_MENTION_RE.test(scanned.normalize('NFKC'))) refuse(REFUSAL_AGENT_SETTINGS_UNCHECKED);
    process.exit(0);
  }
  if (refused) refuse(refused);
  process.exit(0);
}

if (require.main === module) main();
