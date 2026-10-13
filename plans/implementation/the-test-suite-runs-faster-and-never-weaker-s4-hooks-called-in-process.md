---
title: "Two hook test files call the hook in the test's own process, with real starts kept"
type: implementation
created: 2026-10-13
priority: high
effort: small
parent_plan: the-test-suite-runs-faster-and-never-weaker
depends_on: the-test-suite-runs-faster-and-never-weaker-s3-test-writers-get-fast-test-rules
files:
  # THE SLICE'S OWN FILES — the work surface.
  - tests/helpers/hook-in-process.js
  - tests/security-enforcement-evasion.test.js
  - tests/security-gate-bypass.test.js
  # No ratchet files. No tests/*.test.js file is created; the helper lives under
  # tests/helpers/, which src/lib/documented-counts.js line 64 does not count, so no
  # documented count moves and neither CLAUDE.md nor README.md is touched.
---

# Two hook test files call the hook in the test's own process, with real starts kept

Slice 4 of 5 of `plans/functional/the-test-suite-runs-faster-and-never-weaker.md`: acceptance
criteria 1, 2, 30, 31, 32 and 33 (functional plan lines 223–224 and 266–269) and its decision
13 (line 306: no file under `src/hooks/` changes; only hooks that already export their entry
are converted). The method is principle 4 of the research brief
`plans/vision/deepthink/fast-hermetic-node-test-suites.md` (lines 129–133): call the hook's
exported function in-process, keep one to three real starts per hook that cover reading
standard input, the exit code and the printed output, and map every assertion of a started
case to an assertion of the in-process case.

Every statement about this repository below was read from the file and line named. The
planner held read, write, edit, search and list tools and ran nothing: every speed number is
an estimate labelled as one, and the build measures it.

## Problem statement

The CTO Chief's profile counted "a hook started as a separate Node process per test case: 10
files, 520 tests, 64 s processor time" and estimated that in-process calls save "about 50 of
64 s ... assuming the hooks export a callable function, which the profile did not check"
(functional plan lines 38 and 42). It named no files. Reading the tests shows that most of
those starts are of hooks that export no entry (`PreToolUse.Bash.js`, `protect-records.js`,
`stop-test-gate.js`, `guard-files.js`, the two `PostToolUse` hooks), which decision 13 leaves
alone. Among the files that start a hook that does export its entry, two save about a second
of processor time each once one to three real starts per hook are kept; every other such file
saves well under a second. This slice converts each of those two files that the start probe
confirms over the one-second bar (section 8; every "converted" below holds only if the probe
confirms it), proves each converted file asserts exactly what it asserted, and measures the
saving. It is small by the evidence, and says so.

## Which test files start a hook process per test case

Found by reading: a search of `tests/` for spawns of files under `src/hooks/`
(`spawnSync`, `execFileSync`, `spawn`, `execFile`, `fork` with a hooks path; 97 files name a
hooks path, 155 files call one of those functions), every match read. Excluded by the owner's
order: `tests/iron-loop-enforcer.test.js` and
`tests/reachability-surface-scan-is-linear.test.js`. "Starts" counts the hook processes the
cases start, read case by case and with loops expanded (for example 3 gates × 3 tests in
`tests/security-gate-bypass.test.js` lines 400–446). The estimate of a saving uses about 0.1 s
of processor time per converted start (assumed: the profile's 64 s over 520 tests is 123 ms
per test, fixture work included; research brief line 96); the start probe of section 8
replaces it with a measured number.

### Hooks that export their entry, and the files that start them

Exports read at `src/hooks/PreToolUse.Edit.js` lines 776–781 (`enforce`),
`src/hooks/human-gate-check.js` lines 478–489 (`main`), `src/hooks/SessionStart.js` line 512
(`main`), `src/hooks/PreToolUse.Write.js` line 482, `src/hooks/PreToolUse.MultiEdit.js` and
`src/hooks/PreToolUse.NotebookEdit.js` line 67 (`main`), `src/hooks/PreToolUse.Task.js` line
229 (`enforce`), `src/hooks/SubagentStop.js` line 74 (`run`), `src/hooks/UserPromptSubmit.js`
line 68 (`run`), `src/hooks/post-commit.js` line 112 (`main`),
`src/hooks/stop-continuation-gate.js` line 71 (`main`).

| File | Hook started | Starts, by reading | What the started cases assert | Estimated saving if converted | Decision |
|---|---|---|---|---|---|
| `tests/security-gate-bypass.test.js` | `human-gate-check.js` | 15 starts in 15 cases (calls at lines 291, 306, 331, 347, 363, 385 and the loop at 403, 418, 435 × 3 gates) | per start: no start error and exit 0 (`runGateHook`, lines 148–151); per case: where the plan file is after the sweep; one case also the durable violation log (lines 317–325) | 13 converted × 0.1 s ≈ 1.3 s | **converted**, 2 starts kept, if the probe confirms (section 8) |
| `tests/security-enforcement-evasion.test.js` | `PreToolUse.Edit.js` | 13 starts in 13 cases (calls at lines 155, 161, 192, 203, 225, 233, 241 and the loop at 322 × 6) | per start: no signal, exit 0 or 2 (`runHook`, lines 127–131); per case: the exit code (2 blocked, 0 allowed); one case the BLOCKED banner on standard error (line 164) | 10 converted × 0.1 s ≈ 1.0 s | **converted**, 3 starts kept, if the probe confirms (section 8) |
| `tests/session-start-does-not-fabricate-a-project.test.js` | `SessionStart.js` | 14 starts in 13 cases (case 2, lines 85–92, starts it twice) | exit 0, standard output text, which folders exist afterwards | ≈ 1.0–1.2 s | left out: decision 3 |
| `tests/pretooluse-task-coverage.test.js` | `PreToolUse.Task.js` 16, `SubagentStop.js` 3 | 19 starts in 5 cases (lines 480–531; the five-launch fillers at 493 and 507) | exit 0 or 2, the deny on standard output, slot counts | fillers only ≈ 1.0 s at best | left out: this block exists to prove the real standard-input path, and every decision it makes is already asserted in-process in the same file (lines 136–450) |
| `tests/e2e-enforcement-and-gates.test.js` | `PreToolUse.Edit.js` 8, `human-gate-check.js` 5, `PreToolUse.Bash.js` 3 | 16 | exit codes, deny on standard output, plan files moved, the violation log | 5 Edit starts + 3 gate-hook starts ≈ 0.8 s | left out (under 1 s; and it is the named end-to-end file) |
| `tests/gate3-verify-evidence-write-deny.test.js` | Edit 9, Write 1, MultiEdit 1, NotebookEdit 1 | 12 | deny on standard output, target file absent or unchanged, exit 0 on allows | Edit 6–7 ≈ 0.7 s | left out |
| `tests/stop-continuation-gate-queue.test.js` | `stop-continuation-gate.js` | 9 starts in 8 cases (lines 95–186) | exit 0 or 2, standard error text | ≈ 0.7 s | left out |
| `tests/ctoc-audit-w02-s2-ledger-write-deny.test.js` | Edit | 7 (lines 192–283) | deny on standard output, ledger file absent or byte-identical, exit 0 on allows | ≈ 0.5 s | left out |
| `tests/pretooluse-multiedit-coverage.test.js` | `PreToolUse.MultiEdit.js` | 9 starts in 7 cases; 2 test the standard-input reader (lines 164, 179) | deny or allow on standard output, exit code | ≈ 0.5 s | left out |
| `tests/pretooluse-notebookedit-coverage.test.js` | `PreToolUse.NotebookEdit.js` | 9 starts in 7 cases; 2 test the reader (lines 166, 181) | as above | ≈ 0.5 s | left out |
| `tests/w01-multiedit-notebookedit-parity.test.js` | MultiEdit 4, NotebookEdit 3, Edit 1, Write 1, Bash 1 | 10 | the byte-identical deny shape on every surface | at most 3 starts per hook: nothing to convert | left out |
| `tests/w01-edit-write-deny-protocol.test.js` | Edit 4, Write 1 | 5 | deny JSON, target bytes unchanged | ≈ 0.2 s | left out |
| `tests/continuation.test.js` | `stop-continuation-gate.js` | 5 (lines 129–186) | exit 0 or 2, standard error, the block counter | ≈ 0.3 s | left out |
| `tests/ctoc-routing-reminder.test.js` | `UserPromptSubmit.js` | 5 (lines 260–289); 2 test the reader | exit 0, standard output | ≈ 0.3 s | left out |
| `tests/session-start-hook.test.js` | `SessionStart.js`, working folder the repository itself | 5 | exit 0, standard error empty, standard output text | ≈ 0.3 s | left out (and decision 3) |
| `tests/hooks-remaining.test.js` | `post-commit.js` 4 (lines 88–113) | 4 | exit 0, standard output | ≈ 0.2 s | left out |
| `tests/gate-hook-revival.test.js` | `human-gate-check.js` | 4 (lines 284–350) | exit 0, plans moved or reported | ≈ 0.2 s | left out |
| `tests/plan-index-duplicate-hook.test.js` | `PreToolUse.Write.js` | 4 (lines 306–366) | exit code, the advisory on standard error | ≈ 0.2 s | left out |
| `tests/human-gate-check-coverage.test.js` | `human-gate-check.js` | 3 (lines 488, 516, 696) | exit 0, plans moved, log records | ≈ 0.1 s | left out |
| `tests/sessionstart-self-repo-and-honest-banner.test.js` | `SessionStart.js` | 3 (lines 147, 179, 236) | exit 0, CLAUDE.md bytes, banner text | ≈ 0.1 s | left out |
| `tests/plan-number-allocation.test.js` | Write | 2 (lines 414, 431) | | 0 | left out |
| `tests/sessionstart-coverage.test.js` | SessionStart | 2 (loop at line 389) | | 0 | left out |
| `tests/hooks-do-not-manufacture-the-project-marker.test.js` | Write, through a driver script (line 178) | 2 | | 0 | left out |
| `tests/pretooluse-write-coverage.test.js` | Write 1 (line 617), plus 2 starts of wrapper scripts (lines 599, 606) | 3 | | 0 | left out |
| `tests/fail-open-contracts.test.js` | guard-files and Write, faults injected by a `--require` preload (line 149) | — | | the preload needs a process | stays started |
| `tests/session-start-coverage-holes.test.js` | SessionStart with a preload (line 296) | 1 | | the preload needs a process | stays started |
| `tests/a-dangling-link-is-not-a-path-inside-the-tree.test.js`, `tests/resume-watchdog.test.js`, `tests/post-commit-coverage.test.js` | Edit (line 311), SessionStart (line 306), post-commit (line 315) | 1 each | | 0 | left out |

`tests/gate-violations-durability.test.js` line 67 starts a writer script that appends to the
log concurrently; it does not start a hook's entry per case.

### Hooks that export no entry: their tests keep every started process (criterion 31)

By the export lists (functional plan lines 95–97): `PreToolUse.Bash.js` exports helpers only
(line 1110), `protect-records.js` exports nothing and runs `main()` only when started directly
(line 687), `guard-files.js` (line 139), `stop-test-gate.js` (line 220),
`PostToolUse.status-check.js` (line 228) and `PostToolUse.plan-index-sync.js` (line 246) export
helpers but not `main`, and the command-line part of `validate-plan-steps.js` is not a function
(lines 220–238). None of these files is edited. Test counts are a text count of lines starting
`it(` or `test(` (loops not expanded); the start measurement of section 8 records each file's
processor time.

| Hook | Files (tests by text count) | What the started cases assert (by the file's run and assert helpers) |
|---|---|---|
| `PreToolUse.Bash.js` | `security-bash-hook` (34), `ledger-forgery-closed` (52), `shell-write-targets` (31; the started part from line 334), `pretooluse-bash-coverage` (25), `bash-gate-plan-coverage` (20), `the-bash-channel-cannot-reach-the-ledger-through-a-link` (19), `bash-gate-payload-reader` (18), `enforcement-fault-arms` (14), `unsigned-state-rejected` (14), `opuspack-hooks` (46, with guard-files and stop-test-gate), and the Bash cases of `e2e-enforcement-and-gates` (3) and `w01-multiedit-notebookedit-parity` (1) | the deny decision parsed from standard output (`permissionDecision: "deny"`, for example `security-bash-hook` lines 138–177), its reason text, no signal |
| `protect-records.js` | `protect-records` (99), `plans-keep-moving-without-the-human` (1 start, line 1136) | exit 2, standard output exactly the deny decision, standard error exactly the refusal sentence; an allow is exit 0 with empty standard output (`protect-records` lines 67–78) |
| `guard-files.js` | `guard-files-coverage` (20), `opuspack-hooks`, `fail-open-contracts` | the deny decision, fail-open exit codes |
| `stop-test-gate.js` | `stop-test-gate-coverage` (26), `opuspack-hooks`, `remainder-hooks-commands-coverage` (with a preload, line 534) | exit 0 or 2, the fail counter file |
| `PostToolUse.status-check.js` | `posttooluse-status-check-coverage` (16), `hooks-remaining` (6 starts, lines 319–383), `a-session-records-the-build-it-loaded` (line 224) | standard output lines, the beacon file |
| `PostToolUse.plan-index-sync.js` | `posttooluse-plan-index-sync-coverage` (16), `w10-plan-index-sync-await` (5) | the sync log, exit code |
| `validate-plan-steps.js` (command line) | `step-label-hook-claim-matches-manifest` (line 153), `hooks-remaining` (4 starts, lines 177–198) | exit 0 or 1 |

### What the inventory means

By reading, about 175 hook starts sit in files whose hook exports its entry, spread over 29
files. Under one to three kept starts per hook per file (decision 1) and the one-second bar,
two files qualify, for an estimated 2.3 s of processor time in all (assumed: 23 converted
starts × about 0.1 s). The files with the most hook-starting tests (`protect-records`,
`ledger-forgery-closed`, `opuspack-hooks`, `security-bash-hook`, `shell-write-targets`) start
hooks that export no entry; the profile did not name its ten files, so which of them it
counted is not known, and the start measurement records every file's processor time.

## Technical approach

### 1. The shared helper `tests/helpers/hook-in-process.js` (new)

One function, used by both converted files (decision 4). Word for word:

```js
'use strict';

/**
 * Call a CTOC hook's exported entry function in the test's own process, so a test case
 * pays no Node start-up and no loading of the hook's libraries. Written by the plan
 * the-test-suite-runs-faster-and-never-weaker-s4-hooks-called-in-process.md under plans/.
 *
 * What a started hook process meets, and what this call puts in its place:
 *   - its working folder: process.chdir(cwd) BEFORE the hook is loaded, so a value the
 *     hook fixes from process.cwd() when it loads (human-gate-check.js fixes its
 *     violations-log path that way) is the project's, as it is in a started process;
 *   - a fresh module: the hook's require.cache entry is deleted and the hook is loaded
 *     again on every call, so nothing it fixed at load in an earlier call survives;
 *   - standard input: the payload is handed to the entry as its argument after a JSON
 *     round trip, the value the hook's own reader would have parsed; the reader itself
 *     stays proven by the cases that still start the hook as a process;
 *   - process.exit: replaced BEFORE the hook is loaded, then recorded, never obeyed, so
 *     no exit of the hook, also one made while it loads, can end the test process;
 *     process.stdout.write and process.stderr.write: replaced before the hook is loaded
 *     and captured until the entry returns synchronously, so a write made while the hook
 *     loads lands in this call's output, as a started process would print it, and
 *     nothing the test runner writes is ever caught.
 *
 * A started process does nothing after its exit. So every call asserts that loading
 * and the entry threw nothing, process.exit was called exactly once, before the entry
 * returned, and nothing was written after it. A hook changed to exit while it loads, to
 * exit twice, to exit late or to write after its exit fails here instead of passing for
 * the wrong reason. These checks limit
 * the helper to hooks whose every exit is the last thing they do synchronously
 * (PreToolUse.Edit.js `enforce` and human-gate-check.js `main`).
 *
 * Not a *.test.js file and lives under tests/helpers/, so `node --test tests/*.test.js`
 * never runs it on its own.
 */

const assert = require('node:assert/strict');

/**
 * @param {string} hookPath - absolute path of the hook file
 * @param {string} entryName - the hook's exported entry function, for example `enforce`
 * @param {{cwd: string, payload?: object}} options - the folder the started hook would run
 *   in, and the payload it would read from standard input (left out for a hook that reads
 *   none)
 * @returns {Promise<{status: number, stdout: string, stderr: string}>}
 */
async function callHookInProcess(hookPath, entryName, { cwd, payload } = {}) {
  const saved = {
    cwd: process.cwd(),
    exit: process.exit,
    stdoutWrite: process.stdout.write,
    stderrWrite: process.stderr.write,
  };
  const exits = [];
  let exitsWhenEntryReturned = 0;
  let stdout = '';
  let stderr = '';
  let afterExit = '';
  let thrown;
  process.chdir(cwd);
  try {
    process.exit = (code) => { exits.push(code); };
    process.stdout.write = (chunk) => {
      if (exits.length > 0) afterExit += String(chunk); else stdout += String(chunk);
      return true;
    };
    process.stderr.write = (chunk) => {
      if (exits.length > 0) afterExit += String(chunk); else stderr += String(chunk);
      return true;
    };
    let returned;
    try {
      delete require.cache[require.resolve(hookPath)];
      const hook = require(hookPath);
      const args = payload === undefined ? [] : [JSON.parse(JSON.stringify(payload))];
      returned = hook[entryName](...args);
    } catch (err) {
      thrown = err;
    } finally {
      process.stdout.write = saved.stdoutWrite;
      process.stderr.write = saved.stderrWrite;
    }
    exitsWhenEntryReturned = exits.length;
    try {
      await returned;
    } catch (err) {
      if (thrown === undefined) thrown = err;
    }
  } finally {
    process.stdout.write = saved.stdoutWrite;
    process.stderr.write = saved.stderrWrite;
    process.exit = saved.exit;
    process.chdir(saved.cwd);
  }
  assert.equal(thrown, undefined, `the hook threw instead of exiting: ${thrown && thrown.stack}`);
  assert.equal(exitsWhenEntryReturned, 1, `the hook must call process.exit once before its entry returns; it had called it ${exitsWhenEntryReturned} times; stderr=${stderr}`);
  assert.equal(exits.length, 1, `the hook called process.exit ${exits.length} times; a started process exits once`);
  assert.equal(afterExit, '', 'the hook wrote output after its exit, which a started process never shows');
  return { status: exits[0], stdout, stderr };
}

module.exports = { callHookInProcess };
```

How each boundary is replaced, and why it matches a started process:

- **Working folder.** A started hook gets `cwd: dir` from `spawnSync` (for example
  `tests/security-enforcement-evasion.test.js` line 121); `process.chdir(dir)` sets the same
  operating-system working folder, so relative paths in file calls resolve the same way
  (decision 6). `process.cwd()` then returns the same physical path a started process gets;
  both test files already canonicalise their folder with `realpathSync`
  (`security-enforcement-evasion` line 52, `security-gate-bypass` line 72).
- **Loading.** Deleting the cache entry and requiring after the `chdir` gives each call the
  load-time values a fresh process would compute (decision 5). This order is the
  repository's own precedent for this very hook: `tests/gate-violations-durability.test.js`
  lines 116–136 ("chdir into a temp root BEFORE a fresh require so both modules resolve the
  log path into the sandbox (they read cwd at load time)"). The exit and both output streams
  are replaced before the `delete require.cache` line, so an exit while the hook loads is
  recorded and fails checks P2 and P3 loudly instead of ending the test process, a write
  while it loads lands in the call's output as a started process would print it, and a
  throw while it loads is check P1's failure with its stack (power cases (f) and (h),
  section 10).
- **Standard input.** `enforce` takes the parsed payload and does no read (`PreToolUse.Edit.js`
  lines 638–653; the direct start does `enforce(readStdinJson())`, lines 787–789). `main` of
  `human-gate-check.js` reads no input at all (lines 355–476); the test feeds it `'{}'` only
  to mimic a real call (`security-gate-bypass` lines 136–146).
- **Exit.** `allow` ends in `process.exit(0)` (`PreToolUse.Edit.js` line 635) and every
  `allow` call is a `return allow(...)`; `block` ends in `emitDeny`, which writes the decision
  and then calls `process.exit`, looked up at call time (`src/lib/hook-deny-signal.js` lines
  90–101, exit code 2 at line 100), and `block` is always returned; the outer catch exits 0
  (line 772). `main` of the gate hook ends in `process.exit(0)` (line 475). A search for
  `await` in both hook files finds none (`enforce` is `async` at line 653 but awaits
  nothing), so every exit happens before the entry returns. Recording the exit instead of
  throwing keeps a throw out of `enforce`'s fail-open catch, which would otherwise print its
  error line and exit a second time (lines 769–773); the same reason is written at
  `tests/pretooluse-edit-coverage.test.js` lines 137–139.
- **Output.** The Edit hook writes its banner with `process.stderr.write` (line 597) and its
  decision with `process.stdout.write` inside `emitDeny`; the gate hook writes with
  `console.error` (lines 378–451), which goes through `process.stderr.write` (believed, not
  checked: the repository's precedent, `tests/sessionstart-coverage.test.js` line 315,
  captures `process.stderr.write` called directly by `src/lib/ui.js` line 55, not through
  `console.error`; the gate file asserts no printed text, so a miss could not change a
  verdict). Capture starts before the hook is loaded and stops before the `await`
  (decision 7).

### 2. What each hook and everything it loads keeps at module level

Read file by file (top-level declarations), plus two searches over the 22 files named below:
one for top-level `let` or `var` and module-level `Map`, `Set` and object containers (only the
hook's own six `let`s and the constants listed), one for `process.on`, `process.once`,
`process.exitCode`, `process.stdin`, `setTimeout`, `setInterval` and assignments to
`process.env` (0 matches).

**`PreToolUse.Edit.js` and what it loads** (20 first-party modules with the hook): `safe-fs`,
`hook-deny-signal`, `ctoc-project-detector`, `plan-coverage` (which loads `frontmatter`,
`approval-residency`, `real-path-confinement`, `protected-paths`, and on use `stale-detector`
and `declared-breadth`, `src/lib/plan-coverage.js` lines 72–77, 312, 516), `approval-residency`
(`gate-order`, and on use `approval-ledger`, lines 45–46, 161), `approval-ledger` (`safe-fs`,
`gate-order`, lines 122, 128), `stale-detector` (`regex-utils`, `cache`, lines 126–128), `declared-breadth`,
`enforcement-log` (`durable-log`, lines 22–23), `escape-phrases` (`regex-utils`, line 14),
`real-path-confinement`, `enforcement-mode` (`settings`, lines 31–32).

- The hook's own module-level names: `detector`, `coverage`, `enforcementLog`,
  `escapePhrases`, `realPathConfinement`, `enforcementMode` (`let`, lines 49–70; a search for an
  assignment to any of the six finds only those lines, so they are set once, at load); the
  constants `WHITELIST` (72), `LEDGER_DIR` (145), `VERIFY_EVIDENCE_DIR` (158), `STREAMING_DIR`
  (178), `STREAMING_PENDING_DIR` (179), `COMMAND_TABLE_PATHS` (331), `DEFAULT_REMEDY` (508),
  `DENIAL_REMEDIES` (510, frozen).
- Constants only in the libraries: `gate-order` `STAGE_ORDER` (21), `GATE_EDGES` (24),
  `ORDER_INDEX` (32); `approval-residency` `HASH_SENSITIVE_FOLDERS` (67), `PRE_BUILD_GATES`
  (77); `protected-paths` `PROTECTED_ENFORCEMENT_FILES` (58), `PROTECTED_ENFORCEMENT_DIRS`
  (70), `HUMAN_COVERAGE_KINDS` (76); `declared-breadth` `SKIP_DIR_NAMES` (75), `SKIP_REL_PATHS`
  (76); `settings` `SETTINGS_TABS` (23), `SETTINGS_SCHEMA` (32), `ENVIRONMENT_PROFILES` (143),
  `UNSAFE_SETTING_NAMES` (275); `approval-ledger` `REQUIRED_FIELDS` (140); `plan-coverage`
  `STAGE_PRIORITY` (84); `enforcement-log` `MAX_ENTRIES` (26); `real-path-confinement`
  `MAX_ANCESTOR_WALK` (103); `ctoc-project-detector` `CTOC_MARKER_RE` (31), `CTOC_PROGRAM_RE`
  (32), `MAX_WALK_HOPS` (37); `frontmatter` `FRONTMATTER_OPEN` (24), `FRONTMATTER_BLOCK` (31);
  `escape-phrases` `ESCAPE_PHRASES` (16, frozen); `enforcement-mode` `ENFORCEMENT_MODES` (35,
  frozen), `DEFAULT_ENFORCEMENT_MODE` (38); `hook-deny-signal` `HARNESS_BLOCK_EXIT_CODE` (56),
  `DEFAULT_REASON` (59); `safe-fs` `promises` (182). A search for a mutating call (`add`,
  `push`, `set`, `delete`, `splice` and the like) or an element assignment on any of these
  names, over `src/`, finds none.
- The one mutable container: `cache.js` `_store`, a `Map` (line 20). `stale-detector` imports
  only `invalidate` from it (line 128), and no other module in either closure imports
  `cache.js` (the importers are `stale-detector`, `state`, `inbox`, `plan-numbering`,
  `vision-decomposer`, `stale-cleanup` and `actions`, by a search of `src/`), so it stays
  empty here.
- Two module-level regular expressions with the global flag: `regex-utils` `METACHAR` (32),
  used only through `String.prototype.replace` (51), and `stale-detector` `PLAN_SLUG_RE`
  (207), used only through `String.prototype.match` (668). Both calls reset the expression's
  position before they search (believed, from the language's definition of `replace` and
  `match` with a global expression), so neither carries a position from one call to the next.
- No module in the closure registers a process listener or a timer, or writes the
  environment, at load.

**`human-gate-check.js` and what it loads** (10 first-party modules with the hook): `safe-fs`, `durable-log`,
`gate-migration`, `gate-order`, `approval-residency` (lines 120–152), and on use
`stale-detector` (line 217, with `regex-utils` and `cache`) and `approval-ledger` (line 223).

- The hook's own module-level names: **`LOG_DIR`, computed from `process.cwd()` when the hook
  loads (line 126), and `VIOLATIONS_FILE` built from it (line 132)**; `HUMAN_GATES` (line 141,
  `gate-order`'s `GATE_SOURCE`); `approvalResidency`, `classifyResidency`,
  `hasLedgerApproval`, `readPlan` (lines 151–152). `LOG_DIR` is the one value that differs
  from a started process unless the hook is loaded after the `chdir`; that is why the helper
  always loads it fresh, after the `chdir`. A wrong order would write the violation records
  into the repository's own `.ctoc/logs/gate-violations.json`; section 7 checks that file is
  untouched by the converted run.
- `gate-migration` `WITHHELD_REASONS` (90), a constant set; the other modules as listed above.

So for both hooks the record shows by reading that, once the hook itself is loaded fresh after
the `chdir`, no module-level value from an earlier call can reach a converted case.

### 3. `tests/security-enforcement-evasion.test.js` — the Edit hook

- **Entry:** `enforce(stdinJson)` → `Promise<void>`, exported at `src/hooks/PreToolUse.Edit.js`
  line 777; called with the payload `{ tool_name: 'Edit', tool_input: { file_path: target } }`,
  exactly the payload `runHook` writes to standard input (lines 117–124). `runHook`'s
  `transcriptPath` option is passed by no call in the file (calls at lines 155, 161, 192, 203,
  225, 233, 241, 322), so the in-process wrapper has none (decision 15).
- **Kept as real starts (3), unchanged:** "CONTROL: an uncovered src edit in a detected CTOC
  project is BLOCKED" (line 150: the payload read from a real standard-input pipe, exit code 2
  asserted exactly), "CONTROL: project is detected as CTOC (block message names the project)"
  (line 160: the printed banner on standard error, `/BLOCKED/`), and "5. POSITIVE CONTROL: a
  plan in plans/in-progress/ grants coverage — ALLOWED" (line 239: exit code 0 asserted
  exactly). Between them: reading standard input, both exit codes, the printed output. The
  file asserts nothing about standard output, before or after.
- **Converted, if the probe confirms (10 runtime cases from 5 source tests):** lines 188, 199,
  223, 231, and the loop at line 319 (6 cases). If the probe does not confirm this file, none
  of E1 to E5 is made and the file stays byte for byte as at `BASE` (section 8, step 3).

The edits, word for word (the proof of section 7 undoes exactly these and must get the base
file back byte for byte):

E1. Lines 14–18, the start of "Mechanics":

```
 * Mechanics:
 *   - The hook is run as a real child process (`spawnSync(process.execPath,...)`)
 *     so we exercise the exact code path Claude Code uses. status 2 = BLOCKED,
 *     status 0 = ALLOWED. A null status (killed by signal) is a harness failure
 *     and is surfaced loudly.
```

become

```
 * Mechanics:
 *   - The two CONTROL cases and case 5 run the hook as a real child process
 *     (`spawnSync(process.execPath,...)`), so the exact code path Claude Code uses
 *     stays proven: the payload read from standard input, the exit code and the
 *     printed message. status 2 = BLOCKED, status 0 = ALLOWED. A null status
 *     (killed by signal) is a harness failure and is surfaced loudly.
 *   - Every other hook case calls the hook's exported `enforce` in this process
 *     (tests/helpers/hook-in-process.js): the same payload and working folder, the
 *     hook loaded fresh, the exit code and both output streams captured at the
 *     process boundary. Moved off a started process, for speed, by the plan
 *     the-test-suite-runs-faster-and-never-weaker-s4-hooks-called-in-process.md
 *     under plans/; every assertion is unchanged.
```

E2. After line 36 (`const { matchEscapePhrase } = require(path.join(REPO, 'src', 'lib', 'escape-phrases'));`), one new line:

```js
const { callHookInProcess } = require('./helpers/hook-in-process');
```

E3. After line 133 (the `}` that closes `runHook`), this text, starting with an empty line,
so that the base file's empty line 134 and `const BLOCKED = 2;` follow it:

```js

/**
 * Run the Edit hook's exported `enforce` in this process with exactly the payload and
 * working folder `runHook` gives the started process: the hook loaded fresh with the
 * working folder set to `dir`, the exit code and both output streams captured at the
 * process boundary (tests/helpers/hook-in-process.js). The two CONTROL cases and case 5
 * still start the real process, so reading the payload from standard input, the exit
 * code and the printed message stay proven.
 *
 * @returns {Promise<{status:number, stderr:string, stdout:string}>}
 */
async function runHookInProcess(dir, target) {
  const payload = { tool_name: 'Edit', tool_input: { file_path: target } };
  const res = await callHookInProcess(EDIT_HOOK, 'enforce', { cwd: dir, payload });
  assert.ok(
    res.status === 0 || res.status === 2,
    `edit hook produced a non-meaningful exit code ${res.status}; stderr=${res.stderr}`,
  );
  return res;
}
```

The `assert.ok(...)` text is byte-identical to `runHook`'s (lines 128–131).

E4. Lines 298, 300 and 301 of the whitelist block comment:

```
// 10. WHITELIST CORRECTNESS (relative-path forms, end-to-end through the hook)
//
// Infrastructure files must pass; look-alikes must not. These are run through
// the real hook process so the assertion reflects the deployed control.
```

become

```
// 10. WHITELIST CORRECTNESS (relative-path forms, through the hook's own decision)
//
// Infrastructure files must pass; look-alikes must not. These call the deployed
// hook's own `enforce` in this process (see "Mechanics" above), so the assertion
// reflects the deployed control.
```

E5. In each of the 5 converted source tests, the callback `() => {` at the end of its `it(`
line becomes `async () => {`, and `runHook(` becomes `await runHookInProcess(`:
line 188 with 192, line 199 with 203, line 223 with 225 (`runHook(dir, target())`), line 231
with 233, line 319 with 322. Nothing else in those tests changes.

### 4. `tests/security-gate-bypass.test.js` — the gate hook

- **Entry:** `main()` → `undefined`, exported at `src/hooks/human-gate-check.js` line 488;
  called with no argument (it reads no input).
- **Kept as real starts (2), unchanged:** "keeps a done/ plan backed by a real ledger approval"
  (line 287: a started hook with `'{}'` on standard input exits 0 and leaves an approved plan)
  and "reverts a done/ plan with NO marker and logs the violation" (line 304: exit 0, the
  revert, and the durable log written by a real process whose log path came from its own
  working folder, lines 317–325). The file asserts no printed text, before or after; the gate
  hook reads no standard input, and the kept starts still feed `'{}'`, which shows a started
  hook with input waiting on its pipe exits 0.
- **Converted, if the probe confirms (13 runtime cases from 7 source tests):** lines 329, 345,
  361, 381, and in the nested block the loop's three tests at lines 401, 416, 431 (× 3 gates
  each). If the probe does not confirm this file, none of F1 to F4 is made and the file stays
  byte for byte as at `BASE` (section 8, step 3).

The edits, word for word:

F1. Lines 23–28, "MECHANICS":

```
 * MECHANICS
 *   - The real hook is spawned as a child Node process (no mocking) against a
 *     hermetic temp project passed as cwd. The hook always exits 0; its effect
 *     is observed on the filesystem: violating plans are MOVED from the gate
 *     destination back to the source stage, and an entry is appended to
 *     .ctoc/logs/gate-violations.json.
```

become

```
 * MECHANICS
 *   - The first two cases spawn the real hook as a child Node process (no mocking)
 *     against a hermetic temp project passed as cwd, so a started hook's exit code
 *     stays proven. Every other case calls the hook's exported `main` in this process
 *     (tests/helpers/hook-in-process.js): the working folder set to the temp project
 *     before the hook is loaded fresh, because the hook fixes its log path from the
 *     working folder when it loads; the exit code and both output streams captured at
 *     the process boundary; nothing inside the hook replaced. Moved off a started
 *     process, for speed, by the plan
 *     the-test-suite-runs-faster-and-never-weaker-s4-hooks-called-in-process.md under
 *     plans/; every assertion is unchanged. The hook always exits 0; its effect
 *     is observed on the filesystem: violating plans are MOVED from the gate
 *     destination back to the source stage, and an entry is appended to
 *     .ctoc/logs/gate-violations.json.
```

F2. After line 47 (`const ledger = require(path.join(REPO, 'src', 'lib', 'approval-ledger'));`), one new line:

```js
const { callHookInProcess } = require('./helpers/hook-in-process');
```

F3. After line 153 (the `}` that closes `runGateHook`), this text, starting with an empty
line, so that the base file's empty line 154 and `function readViolations(dir) {` follow it:

```js

/**
 * Run the gate hook's exported `main` in this process against the temp project: the
 * working folder set to `dir` before the hook is loaded fresh (the hook fixes its
 * violations-log path from the working folder when it loads), the exit code and both
 * output streams captured at the process boundary (tests/helpers/hook-in-process.js).
 * The first two cases below still start the real process, so a started hook's exit
 * code stays proven.
 */
async function runGateHookInProcess(dir) {
  const res = await callHookInProcess(GATE_HOOK, 'main', { cwd: dir });
  assert.equal(res.status, 0,
    'human-gate-check.js must always exit 0 (it reverts; it does not block)');
  return res;
}
```

The `assert.equal(...)` text is byte-identical to `runGateHook`'s (lines 150–151).

F4. In each of the 7 converted source tests, the callback `() => {` becomes `async () => {`,
and `runGateHook(dir);` becomes `await runGateHookInProcess(dir);`: lines 329/331, 345/347,
361/363, 381/385, 401/403, 416/418, 431/435. Nothing else in those tests changes.

### 5. The assertion mapping, case by case (criterion 32)

Every assertion in a converted test body is unchanged, word for word; only the call that
produces `res` changed. What changed is the harness check around the call.

**Harness checks, `tests/security-enforcement-evasion.test.js`.**

| Started case (`runHook`, lines 127–131) | In-process case (`runHookInProcess` + helper) |
|---|---|
| H1 `` assert.equal(res.signal, null, `edit hook killed by signal ${res.signal}; stderr=${res.stderr}`) `` | none with this text: no child process exists to be killed. Its job, that a harness fault never reads as a decision, is done by P1 to P4 below |
| H2 `` assert.ok(res.status === 0 \|\| res.status === 2, `edit hook produced a non-meaningful exit code ${res.status}; stderr=${res.stderr}`) `` | H2, word for word |
| — | P1 `` assert.equal(thrown, undefined, `the hook threw instead of exiting: ...`) ``: an escaped error, which in a started process would have been exit 1 and failed H2 |
| — | P2 `` assert.equal(exitsWhenEntryReturned, 1, ...) ``: the exit came, once, before the entry returned |
| — | P3 `` assert.equal(exits.length, 1, ...) ``: no second exit later |
| — | P4 `assert.equal(afterExit, '', ...)`: nothing written after the exit |

P1 to P4 fail in every world H1 catches that can exist in one process (the test process dying
fails the whole file loudly), and in worlds H1 cannot see (a second exit, output after the
exit, an exit after an `await`). That is tighter, not looser.

**Converted cases, `tests/security-enforcement-evasion.test.js`.** Old and new body
assertions are the same text; the decision asserted is the exit code (2 BLOCKED, 0 ALLOWED);
`stderr` appears only inside the failure messages.

| Case (old line) | Body assertion, unchanged | Decision |
|---|---|---|
| `1. ".ctoc/../src/lib/inbox.js" must NOT be whitelisted — edit BLOCKED` (188) | `assert.equal(res.status, BLOCKED, 'SECURITY EVASION: ".ctoc/../src/lib/inbox.js" escaped .ctoc/ via "..", ' + 'resolves to a real source file, yet was whitelisted and ALLOWED. ' + `status=${res.status}, stderr=${res.stderr}`)` (lines 193–196) | exit 2 |
| `2. "plans/../../outside.md" must NOT be treated as a whitelisted plan file` (199) | `assert.equal(res.status, BLOCKED, 'SECURITY EVASION: "plans/../../outside.md" escapes plans/ via "..", ' + ...)` (lines 204–207) | exit 2 |
| `3. a plan in plans/functional/ does NOT grant coverage — BLOCKED` (223) | `assert.equal(res.status, BLOCKED, 'MISFIRE/EVASION: a functional-stage plan (not enforcement-active) granted ' + ...)` (lines 226–228) | exit 2 |
| `4. a plan in plans/done/ does NOT grant coverage — BLOCKED` (231) | `assert.equal(res.status, BLOCKED, 'EVASION: a done-stage plan (shipped, not active) granted coverage for ' + ...)` (lines 234–236) | exit 2 |
| `10. "VERSION" → ALLOWED (VERSION is whitelisted)` (319, row 310) | `` assert.equal(res.status, expected, `${why}; got status=${res.status}, stderr=${res.stderr}`) `` (lines 323–324) | exit 0 |
| `10. "version.txt" → BLOCKED (version.txt is NOT VERSION — must not be whitelisted)` (row 311) | the same | exit 2 |
| `10. "plans/x.md" → ALLOWED (plans/*.md is whitelisted)` (row 312) | the same | exit 0 |
| `10. "plans/x.js" → BLOCKED (plans/x.js is not a .md plan — must not be whitelisted)` (row 313) | the same | exit 2 |
| `10. "src/x.js" → BLOCKED (arbitrary source file is not whitelisted)` (row 314) | the same | exit 2 |
| `10. ".gitignore" → ALLOWED (.gitignore is whitelisted)` (row 315) | the same | exit 0 |

**Harness checks, `tests/security-gate-bypass.test.js`.**

| Started case (`runGateHook`, lines 148–151) | In-process case (`runGateHookInProcess` + helper) |
|---|---|
| G1 `` assert.equal(res.error, undefined, `gate hook failed to spawn: ${res.error && res.error.message}`) `` | none with this text: nothing is started. Its job, that the hook really ran to its exit, is done by P1 to P4 |
| G2 `assert.equal(res.status, 0, 'human-gate-check.js must always exit 0 (it reverts; it does not block)')` | G2, word for word |
| — | P1 to P4, as above |

**Converted cases, `tests/security-gate-bypass.test.js`.** Each body asserts where the plan
file is after the sweep, unchanged; the decision is revert or keep; the exit code is G2.

| Case (old line) | Body assertions, unchanged | Decision |
|---|---|---|
| `reverts a done/ plan whose only marker is inside a fenced code block` (329) | `planExists(dir, 'done', 'fenced.md')` equals `false`; `planExists(dir, 'review', 'fenced.md')` equals `true` (lines 333–341) | revert |
| `reverts a done/ plan whose only marker is in a prose sentence` (345) | the same shape for `prose.md` (lines 349–357) | revert |
| `reverts a done/ plan with a commented-out marker and a Rejected section` (361) | the same shape for `commented.md` (lines 365–374) | revert |
| `keeps a done/ plan backed by a ledger approval (in-plan marker spacing is irrelevant)` (381) | `planExists(dir, 'done', 'odd-spacing.md')` equals `true`; `planExists(dir, 'review', 'odd-spacing.md')` equals `false` (lines 387–395) | keep |
| `reverts a ${destStage}/ plan whose marker is only in a fenced block` × implementation, todo, done (401) | `planExists(dir, destStage, 'fenced.md')` equals `false`; `planExists(dir, srcStage, 'fenced.md')` equals `true` (lines 405–413) | revert |
| `reverts a ${destStage}/ plan whose marker is only in prose` × 3 (416) | the same for `prose.md` (lines 420–428) | revert |
| `keeps a ${destStage}/ plan backed by a real ledger approval` × 3 (431) | `planExists(dir, destStage, 'ok.md')` equals `true`; `planExists(dir, srcStage, 'ok.md')` equals `false` (lines 437–444) | keep |

Each assertion's full message text is the base file's, unchanged; section 7's whole-file
comparison proves it byte for byte, so the table names them by line rather than repeating
them.

### 6. The deliberate breaks (criterion 32), in a scratch copy only

No file under `src/hooks/` in the repository is ever edited. Script
`SCRATCH/s4/break-and-compare.js <repository root> <BASE>` (never committed; source and output
in the build record, every path relative to the repository root or `SCRATCH`):

1. Before anything: `git -C <root> diff --quiet -- src/hooks` must exit 0; otherwise stop.
2. Make the copy if absent: `git clone --shared --no-checkout <root> SCRATCH/s4/break-copy`,
   then `git -C SCRATCH/s4/break-copy checkout --detach <BASE>`, then a directory link
   `SCRATCH/s4/break-copy/node_modules` → `<root>/node_modules` (a junction on Windows). Every
   `git` is started with an argument list and no shell.
3. Into the copy: `tests/<name>.spawned.test.js` = the standard output of
   `git show <BASE>:tests/<name>.test.js` (the old file, every case started), and the
   worktree's new `tests/<name>.test.js` and `tests/helpers/hook-in-process.js` copied over
   the copy's. Both versions find the copy's own hooks (`REPO` is `path.resolve(__dirname,
   '..')`, line 34 of the evasion file and line 43 of the bypass file).
4. Control: run both versions of both files in the copy with
   `node --test --test-reporter=tap <file>`; every one must pass with 0 failed and 0 skipped.
5. For each break below: replace the exact line text in the copy's hook (it must match exactly
   once, otherwise stop), run the old and the new version of that hook's test file, collect for
   every `not ok` result its full nesting path and, from its diagnostic block, the `expected:`
   and `actual:` lines; then `git -C SCRATCH/s4/break-copy checkout -- src/hooks/<hook>` and
   `git -C SCRATCH/s4/break-copy diff --quiet -- src` must exit 0.
6. Pass only when, for every break, the set of (nesting path, expected, actual) from the old
   version equals the set from the new version, and the failing test names equal the list
   below; and when step 1's check passes again at the end. A failing set, in either version,
   that differs from the table below (a test more, a test fewer, or other expected and actual
   values) stops the build and goes back to the CTO Chief with both sets printed: the table is
   then wrong or the conversion changed a verdict, and neither is decided by the builder.
   Breaks are made only for the hooks of converted files (section 8, step 3).

| Break | Line in the copy's hook | Replaced by | Tests that must fail, in both versions (expected → actual) |
|---|---|---|---|
| Edit hook A: every block becomes an allow | `PreToolUse.Edit.js` line 617 `` emitDeny(`CTOC: no active plan covers "${info.target_file \|\| '(unknown)'}" and no escape phrase was used. ...`); `` | `  process.exit(0);` | "CONTROL: an uncovered src edit in a detected CTOC project is BLOCKED" (kept start), cases 1, 2, 3, 4, and the loop cases "version.txt", "plans/x.js", "src/x.js" — 8 tests, 2 → 0 |
| Edit hook B: nothing is whitelisted | `PreToolUse.Edit.js` line 109 `    if (!matched) continue;` | `    continue;` | the loop cases "VERSION", "plans/x.md", ".gitignore" — 3 tests, 0 → 2 |
| Gate hook A: nothing is reverted | `human-gate-check.js` line 391 `      const { reverted, failures } = revertAll(toRevert);` | `      const { reverted, failures } = revertAll([]);` | "reverts a done/ plan with NO marker and logs the violation" (kept start), the cases at lines 329, 345, 361, and the six loop "reverts" cases — 10 tests, false → true |
| Gate hook B: every resident is a violation | `human-gate-check.js` line 270 `    if (verdict.accepted) continue;` | `    // deliberate break: an accepted resident is treated as a violation` | "keeps a done/ plan backed by a real ledger approval" (kept start, top level), the case at line 381, and the three loop "keeps" cases — 5 tests, true → false |

The two "keeps a done/ plan backed by a real ledger approval" tests (line 287 at top level and
the loop's `done` case) share a name and differ in their nesting path, which is why the
comparison keys on the full path. Each break flips one hook decision; the pairs A and B cover
both directions (a block that should be an allow and an allow that should be a block) for
both hooks.

### 7. The never-weaker proof

Script `SCRATCH/s4/prove-hooks-in-process.js <repository root> <BASE>`; with
`--static <folder>` it reads the new files from `<folder>/tests/` and starts nothing (used for
the mutants below). It copies two readers from slice 1's `SCRATCH/prove-the-split.js`
unchanged in logic: the TAP reader of that plan's step 3 (the `# Subtest:` nesting key,
result lines, counters) and the assertion reader of its step 4 (the TypeScript compiler's
parser, loaded from the repository with `require(require.resolve('typescript', { paths: [root] }))`;
a call counts when its callee is the identifier `assert` or a property of `assert`; its
`getText()` byte for byte). Standard library and the repository's TypeScript only; every child
started with an argument list, `NODE_TEST_CONTEXT` deleted from its environment. For each of
the two files:

1. **The whole file, modulo the listed edits.** Old text: the standard output of
   `git show <BASE>:tests/<name>.test.js`. Undo on the new text, in this order, each an exact
   text with an exact count (any other count fails): remove the E3 (F3) text, count 1; remove
   the E2 (F2) line with its line break, count 1; replace the E1 (F1) and E4 texts by their
   old texts, count 1 each; replace `async () => {` by `() => {`, count 5 (7); replace
   `await runHookInProcess(` by `runHook(`, count 5 (`await runGateHookInProcess(` by
   `runGateHook(`, count 7). The result must equal the old text byte for byte; otherwise print
   the first differing line of each. Before the undo, the old text must contain
   `async () => {` 0 times. This proves every test name, every assertion and every other line
   unchanged.
2. **Which cases were converted.** From the parse of the new file: the static name key
   (`JSON.stringify` of the first arguments of the enclosing `describe` and `it` calls,
   outermost first: a string literal's value, a template literal's source text) of every `it`
   whose callback calls the in-process wrapper must equal the CONVERTED list, and of every
   `it` whose callback calls the started-process helper the KEPT list, both below.
3. **Names by a run (criterion 32 "same cases").** Run the old file in `SCRATCH/base-s4/`
   (section 9) and the new file in the worktree, each `node --test --test-reporter=tap
   <file>`; exit 0, 0 failed, cancelled, skipped and todo, no SKIP or TODO directive. The
   multiset of nesting keys must be equal. Slice 1's invariant is adapted to `describe`
   blocks: the number of `# Subtest:` lines equals the number of result lines equals the
   `tests` counter plus the `suites` counter (decision 12). Expected by reading: 18 tests in 5
   suites (23 keys) for the evasion file; 15 tests in 2 suites (17 keys) for the bypass file.
4. **Assertion calls.** Old multiset (old text) and new multiset (new file): the new must be
   the old plus exactly one added call — H2's text in the evasion file, G2's text in the
   bypass file — and nothing removed. The helper's multiset must be exactly P1, P2, P3, P4.
   Expected by reading: 25 old and 26 new in each file; 4 in the helper. Every addition is
   printed; this is the exception list, and it holds additions only.
5. **No log outside the temp projects.** Around the run of step 3's new bypass file, the
   bytes (or absence) of `<root>/.ctoc/logs/gate-violations.json` are equal before and after;
   around the new evasion file, those of `<root>/.ctoc/logs/enforcement.json`. A call made
   without the `chdir` (the Edit hook takes its root from `process.cwd()` when called, line
   655), or a gate hook loaded before it, would write there. Every line added to either file
   during its run is printed, whether the step passes or fails. The step passes when no added
   line names a temporary project of the tests, and fails otherwise; a line names one when it
   holds `os.tmpdir()`, or `fs.realpathSync(os.tmpdir())`, followed by a path separator and
   the prefix `ctoc-sec-` (the evasion file, line 51) or `ctoc-gate-sec-` (the bypass file,
   line 72). An added line that names no such project was written by some other process and
   does not fail the step.

CONVERTED and KEPT, as the static keys of step 2:

- evasion, KEPT: `["harness sanity","CONTROL: an uncovered src edit in a detected CTOC project is BLOCKED"]`,
  `["harness sanity","CONTROL: project is detected as CTOC (block message names the project)"]`,
  `["non-active-stage coverage","5. POSITIVE CONTROL: a plan in plans/in-progress/ grants coverage — ALLOWED"]`.
- evasion, CONVERTED: the tests at lines 188 and 199 under `path-traversal whitelist bypass`,
  at 223 and 231 under `non-active-stage coverage`, and the loop's template test at 319 under
  `whitelist correctness (relative forms)`.
- bypass, KEPT: the tests at lines 287 and 304 under `security: human-gate approval-marker bypass`.
- bypass, CONVERTED: the tests at lines 329, 345, 361, 381, and the three loop tests at 401,
  416, 431 under `body-only marker bypass at every human gate`.

**The proof is shown to fail (mutants).** Right after the conversion, `--static` on the real
files passes; then three folders under `SCRATCH/s4/mutants/`, each a copy of the three new
files with one edit, must each make it exit 1 naming the defect: `assert-deleted` (in the
evasion file, the body assertion of case 3, lines 226–228, deleted: step 1 prints the
difference and step 4 the missing call), `kept-converted` (in the bypass file, the test at
line 304 converted the same way as the others, `async () => {` and
`await runGateHookInProcess(dir);`: step 1 finds 8 of each instead of 7 and step 2 names the
test), `name-changed` (in the bypass file, `reverts a done/ plan whose only
marker is in a prose sentence` gets one character changed: step 1 prints the line). The three
failures are quoted in the build record. A mutant that passes is a fault in the script, fixed
there and the whole proof re-run.

If the probe confirms only one file (section 8, step 3), the proof runs for that file alone,
checks that the other file is byte for byte as at `BASE` (`git diff --quiet <BASE> -- <file>`
exits 0), and all three mutants are made in the converted file, each still naming its
defect: in the evasion file, `assert-deleted` as above, `kept-converted` the CONTROL test at
line 160 converted the same way (`async () => {` and `await runHookInProcess(`: step 1 finds 6
of each instead of 5 and step 2 names the test), `name-changed` the name of case 1 at line 188
with one character changed; in the bypass file, `kept-converted` and `name-changed` as above,
and `assert-deleted` the first body assertion of the test at line 329 (its
`planExists(dir, 'done', 'fenced.md')` assertion within lines 333–341) deleted.

### 8. The one-second bar, applied at the start (criterion 30's measurement)

1. **Inventory measurement.** `SCRATCH/s4/inventory-times.js <repository root>` runs, one at a
   time, `/usr/bin/time -p node --test <file>` for every file in the two inventory tables
   (the list typed into the script from this plan), started with an argument list and no
   shell, and writes per file: exit status, tests, passed, failed, skipped, wall-clock, user and
   system time, the one-minute load before and after. This names the files by measurement, as
   criterion 30 asks.
2. **Probe of the saving per call**, before `tests/helpers/hook-in-process.js` is created and
   before either test file changes: the helper's text of section 1 is written byte for byte to
   the scratch copy `SCRATCH/s4/probe/hook-in-process.js`, the power test of section 10 passes
   against that copy, and the probe calls that copy: `SCRATCH/s4/spawn-cost-probe.js <root> <edit|gate>
   <spawn|in-process> 20`. For `edit`, one temporary project built as
   `security-enforcement-evasion` lines 50–67 build theirs, and 20 calls with target
   `src/x.js` (each must answer exit 2). For `gate`, one temporary project built as
   `security-gate-bypass` lines 71–102 build theirs, with `plans/done/no-marker.md` written (and
   `plans/review/no-marker.md` removed) before each of 20 calls (each must exit 0 and revert
   it). `spawn` starts the hook with `spawnSync(process.execPath, [hook], { cwd, input, encoding:
   'utf8' })`; `in-process` calls `callHookInProcess`. Each mode runs under `/usr/bin/time -p`,
   interleaved spawn, in-process, spawn, in-process, per hook, with the load recorded. Saving
   per call = (sum of the two spawn runs' user plus system time minus the sum of the two
   in-process runs') / 2 / 20.
3. **Rule: a go or no-go, decided here, before any file of the slice is created or edited.** A
   file is converted only when (calls converted × measured processor time saved per call) ≥
   1.0 s: `security-enforcement-evasion` needs at least 100 ms per call (10 calls),
   `security-gate-bypass` at least 77 ms (13 calls); each hook's own probe number counts for
   its own file. The record shows both products with their numbers (decision 2).
   - **Both pass:** the slice goes ahead as written.
   - **One misses:** that file is left byte for byte as at `BASE`; its edits (E1 to E5, or F1
     to F4), its two breaks of section 6 and its mutants are dropped; the three mutants are
     all made in the converted file, as the end of section 7 says; acceptance criteria 30 and
     32 are read as "for each converted file".
   - **Both miss:** `tests/helpers/hook-in-process.js` is not created, no test file is edited,
     the build stops, and the builder reports the probe numbers (both modes' user plus system
     and wall time per run, the load before and after each run, and both products) to the
     CTO Chief.
   - If a left-out file's numbers from step 1 show it would pass the bar, the builder reports
     it to the CTO Chief and does not edit it.

### 9. Measurement (criteria 1 and 33)

Every run records the items of the functional plan's "How every slice is measured" (line
178): the command; wall-clock; user plus system time from `/usr/bin/time -p`; the one-minute
load at start and end (`node -p "require('os').loadavg()[0].toFixed(1)"`); the core count;
`node --version`; `git rev-parse HEAD`; passed, failed and skipped counts; per-file durations
from slice 1's `SCRATCH/per-file-reporter.cjs` and the longest file; and which of semgrep,
osv-scanner, trufflehog, detect-secrets, gosec and bandit are installed. `BASE` is this slice's
base commit; `SCRATCH/base-s4/` is `git clone --shared --no-checkout <this worktree>
SCRATCH/base-s4`, then `git -C SCRATCH/base-s4 checkout --detach <BASE>`, with `node_modules` a
directory link to this worktree's; it is never edited.

- **Before, whole suite:** slice 3's completion whole-suite run when `git log` shows nothing
  else landed between it and `BASE`; otherwise, in `SCRATCH/base-s4/`, slice 1's command
  `/usr/bin/time -p node --test --test-reporter=spec --test-reporter-destination=SCRATCH/s4/suite-before.spec --test-reporter=SCRATCH/per-file-reporter.cjs --test-reporter-destination=SCRATCH/s4/suite-before.per-file tests/*.test.js 2> SCRATCH/s4/suite-before.time`.
- **Paired, interleaved runs per converted file (criterion 33, measure a):** for each converted
  file, exactly two pairs, run in this order and each once, every run recorded and none
  repeated: before (the old file, in `SCRATCH/base-s4/`), after (the new file, in the
  worktree), before, after; each
  `/usr/bin/time -p node --test --test-reporter=spec --test-reporter-destination=SCRATCH/s4/pair-<k>-<side>-<label>.spec --test-reporter=SCRATCH/per-file-reporter.cjs --test-reporter-destination=SCRATCH/s4/pair-<k>-<side>-<label>.per-file tests/<name>.test.js 2> SCRATCH/s4/pair-<k>-<side>-<label>.time`
  with its load before and after. Recorded per pair: both sides' processor time and wall-clock.
- **After, whole suite:** one run of the same command on the completion tree
  (`suite-after.*`), recorded as it comes out and never repeated.
- **Faster** is written only under criterion 1's rule: every pair of measure (a) agrees,
  measure (b) agrees, and whole-suite processor time (measure c) did not grow. Neither file is
  expected near the suite's longest file, so measure (b) is not expected to move; if it does not
  show the change, the record says so with the numbers and reports the slice as "less
  processor time in the two converted files", not as "faster" (decision 11).

### 10. Test-first order: what is red, and what replaces red

The converted cases have **no red state**: no hook changes, so each converted case passes the
moment it is written, if the helper is right. What replaces red, in this order:

0. **The base still matches this plan.** Every line number here was read in this worktree on
   2026-10-13. Before any edit, the builder checks at `BASE` that each old text this plan
   quotes (E1, E4, F1, the call lines of sections 3 and 4, and the four break lines of
   section 6) stands at the line named. Any difference stops the build and goes back to the
   CTO Chief; the tables are redone upstream, not guessed.

1. **The helper's power test, red first.** `SCRATCH/s4/helper-power.test.js` (scratch, never
   committed) requires the helper at the absolute path in the environment variable
   `S4_HELPER` (an unset or missing path fails the file loudly, never passes) and drives eight
   scratch hook files in `SCRATCH/s4/power-hooks/`. Red before the helper exists (the require
   fails). It runs green first against the probe's scratch copy
   (`S4_HELPER=SCRATCH/s4/probe/hook-in-process.js`, section 8) and again against
   `tests/helpers/hook-in-process.js` once that is created. Each case must behave as stated:
   - (a) exits, then writes `late` → rejects with "the hook wrote output after its exit";
   - (b) throws → rejects with "the hook threw instead of exiting";
   - (c) returns without exiting → rejects with "it had called it 0 times";
   - (d) exits twice → rejects with "it had called it 2 times";
   - (e) `async`, exits after `await null` → rejects with "it had called it 0 times", and the
     test process lives on (the case's own completion shows it);
   - (f) a hook that, at load, sets `const ROOT = process.cwd()` and writes `load:` and ROOT
     and a line break to standard output, and whose entry writes ROOT and exits 0, called
     with folder A then folder B → standard output is `load:<A>` and a line break and `<A>`,
     then the same for B, each with the folder's real path (the `chdir` comes before a fresh
     load, and a write while the hook loads is captured into the call's output);
   - (g) writes `JSON.stringify(payload)` to standard output and `e` to standard error, exits
     2, called with `{ a: 1, u: undefined }` → `{ status: 2, stdout: '{"a":1}', stderr: 'e' }`,
     and afterwards `process.cwd()`, `process.exit`, `process.stdout.write` and
     `process.stderr.write` are what they were before the call;
   - (h) a hook that calls `process.exit(0)` at load and whose entry also exits 0 → rejects
     with "it had called it 2 times", and the test process lives on (the case's own completion
     shows it).
2. **The probe** (section 8), the go or no-go that decides which files are edited.
3. **The proof, red before the conversion.** `prove-hooks-in-process.js` runs every step and
   prints every failure before it exits. On the unconverted files it fails: step 2 names every
   CONVERTED case as still starting the hook, step 1 finds 0 of the expected 5 (7)
   in-process calls, and step 4 finds the helper absent. Its names step (3) and its assertion step (4, apart from the missing
   addition) pass there, which shows both readers work on the real output before anything
   depends on them. Quoted in the build record.
4. **Conversion**, then the proof passes and the three mutants fail it (section 7).
5. **The deliberate breaks** (section 6): each fails the same tests, with the same expected and
   actual values, in the old and the new version.

### 11. Tests to run while building (affected only)

- `node --test tests/security-enforcement-evasion.test.js tests/security-gate-bypass.test.js`
- `node --test SCRATCH/s4/helper-power.test.js`
- `node --test tests/skip-visibility.test.js tests/skip-guard-integrity.test.js` (they read
  every `tests/*.test.js` file, as slice 1 found)
- Lint, with the repository's own eslint and never through npx:
  `node node_modules/eslint/bin/eslint.js --max-warnings 0 tests/helpers/hook-in-process.js tests/security-enforcement-evasion.test.js tests/security-gate-bypass.test.js`
  (non-literal `require` is allowed in tests, `eslint.config.js` line 172).

Other tests that name either file: a search for both file names over the repository outside
`plans/` finds one, a comment at `tests/gates.test.js` line 42; nothing reads them. This slice
never runs `npm test`: the full `npm test` runs once after the last slice, by the CTO Chief,
on the owner's order (criterion 2). Its Step 14 runs the affected tests above, the whole
repository's lint, the type check and one whole-suite timing run (section 9). Reviews are
dispatched by the CTO Chief from the builder's packets, in two areas run in parallel: the
helper with its power test and the probe; the converted files with their mapping, proof,
mutants and breaks; plus one security-scanner pass over the helper and the scratch scripts.

### Wiring — the live call sites

- Both test files keep running under `npm test`: `src/scripts/test-gate.js` `resolveTestFiles`
  lists every `tests/*.test.js` (lines 265–268) and starts `node --test` over them (line 426);
  `npm run test:raw` (`package.json` line 12) runs the same files. Nothing is registered.
- `tests/helpers/hook-in-process.js` is reached only through
  `require('./helpers/hook-in-process')` in the two files; it is not a `*.test.js` file.
- No file under `src/` changes (criterion 31 and decision 13).

### Security review

- The helper replaces `process.exit`, `process.stdout.write` and `process.stderr.write` and
  changes the working folder, and puts every one back in a `finally`, before any assertion
  runs, so a failing assertion cannot leave the test process altered.
- No hook file is edited in the repository; the breaks are made only in
  `SCRATCH/s4/break-copy/`, which the script checks clean after each break, and the script
  checks the worktree's `src/hooks` unchanged before and after.
- Scratch scripts start `git`, `node` and `/usr/bin/time` with argument lists, never a shell;
  the only inputs are the repository root, a commit name passed to `git show <commit>:<path>`
  as one argument, and folders under `SCRATCH`. They write only under `SCRATCH`.
- No secret, token or personal data is written; the build record holds no absolute path (paths
  relative to the repository root or `SCRATCH`).
- The security tests keep testing the deployed decision code: nothing inside either hook is
  replaced, only the process boundary.

## Acceptance criteria

Each maps to the functional plan's criterion of the same number.

- [ ] 1. Every run of section 9 is in the build record with its items; "faster" is written only under criterion 1's rule, otherwise the record names the measure that did not show it, with the numbers. Left open: slice dropped on the measured no-go of 2026-10-13
- [ ] 2. The completion `npm test`: 0 failed, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json`'s floor; a failure confined to `tests/reachability-surface-scan-is-linear.test.js` or `tests/iron-loop-enforcer.test.js` is re-run alone and recorded with its load. Left open: the full npm test runs once after the last slice, by the owner's order. Left open: slice dropped on the measured no-go of 2026-10-13
- [ ] 30. The inventory measurement and the probe of section 8 are recorded with the go or no-go of each file; each converted file passed the one-second bar; in each converted file, the converted cases call `callHookInProcess`, which sets the working folder before a fresh load of the hook and replaces standard input, both output streams and `process.exit` at the boundary, the exit and the streams before the hook is loaded; each converted file keeps the real starts named for it in section 3 or 4 (3 for the evasion file, 2 for the bypass file); a file the probe did not confirm is byte for byte as at `BASE`; the module-level inventory of section 2 is in the record. Left open: slice dropped on the measured no-go of 2026-10-13
- [ ] 31. `git diff --quiet <BASE> -- src` exits 0 on the completion tree, and no test file of a hook that exports no entry is edited. Left open: slice dropped on the measured no-go of 2026-10-13
- [ ] 32. The mapping of section 5 is in the record for each converted file; `prove-hooks-in-process.js` passes for each converted file (whole file equal modulo the listed edits, names equal by run, assertions equal to the old plus the one listed addition, the helper's four, no added log line naming a temporary project of the tests) and fails on each of the three mutants; `helper-power.test.js` gives the eight stated outcomes against the helper; every break of section 6 for the hook of a converted file fails exactly the tests the table names, with the same expected and actual values, in the old and the new version, and the control passes. Left open: slice dropped on the measured no-go of 2026-10-13
- [ ] 33. Two pairs per converted file, every run recorded and none repeated, with both sides' processor time and wall-clock and the load. Left open: slice dropped on the measured no-go of 2026-10-13

## Risks

| Risk | Mitigation |
|---|---|
| The in-process call differs from a started process in a way no assertion sees | Section 2 inventories every module-level value of both closures; the helper's four checks; the kept real starts; the breaks compared old against new, both directions per hook |
| A later change to either hook adds an `await` before an exit, a second exit, or output after the exit | The helper fails loudly (checks P1 to P4), never passes for the wrong reason |
| `plans/implementation/small-changes-take-a-small-path.md` declares `src/hooks/PreToolUse.Edit.js` (lines 8–14) and names the evasion file as one that must stay green (line 294); if it lands before this build, line numbers move | The proof works from `BASE` at the build's start; the breaks match line texts and stop unless each matches exactly once; the helper's checks catch a changed exit shape |
| The saving (estimated 2.3 s of processor time) is within the noise of one pair on a machine whose load moves between 12 and 37 | The probe measures the saving per call directly; both pairs are recorded as they come out; a disagreeing pair is reported as such |
| A wrong load order writes violation or enforcement records into the repository's own `.ctoc/logs/` | Section 7 step 5 compares those files before and after; power case (f) proves the order |
| Slice 5, planned in parallel, declares one of these files | The scheduler runs the two plans one after the other |
| Section 2's inventory is a snapshot of both hooks' module closures at `BASE`. A library added to either closure later that fixes a working-folder path when it loads (as `human-gate-check.js` fixes `LOG_DIR`) would be loaded once, in the test process, from the first folder; an in-process case would then differ from a started hook without any check failing, since only the hook file itself is loaded fresh | Not closed by this slice: the helper reloads only the hook file, and reloading the whole closure would re-spend the saving (decision 3). The log comparison of section 7, step 5, catches the case only for the two log files it reads. Listed under the findings outside this slice for the owner |
| The probe misses the bar for one file or both | Section 8, step 3: one miss leaves that file as at `BASE` and drops its edits, breaks and mutants; two misses create nothing and stop the build with the numbers reported to the CTO Chief |

## Findings outside this slice (for the owner to schedule)

- Most hook-starting tests start hooks that export no entry: `PreToolUse.Bash.js` (about ten
  files), `protect-records.js` (99 tests), `stop-test-gate.js`, `guard-files.js`,
  `PostToolUse.status-check.js`, `PostToolUse.plan-index-sync.js`. Converting them needs each
  hook to export its entry, a hook change that needs the owner's approval (decision 13).
- `tests/session-start-does-not-fabricate-a-project.test.js` (14 starts) needs a way to clear
  `src/lib/state.js`'s memoized reads (line 10) between calls before it can run in-process
  (decision 3).
- `tests/gates.test.js` lines 39–42 say `human-gate-check.js` has "no module.exports"; it
  exports `main` and nine more names (lines 478–489).
- `tests/pretooluse-edit-coverage.test.js` `runEnforce` (lines 141–170) keeps its output stubs
  across an `await`; it could call the new helper.
- The in-process helper reloads only the hook file. Section 2's reading that no module of
  either closure fixes a working-folder value when it loads holds at `BASE` only; a later
  library in either closure that does would make an in-process case differ from a started
  hook without failing. A guard for it (for example a test that loads each closure under two
  working folders and compares every module-level value) is not built here.
- The gate hook's printed violation text (`console.error`, `src/hooks/human-gate-check.js`
  lines 378–451) is asserted in neither the old nor the new
  `tests/security-gate-bypass.test.js`; adding that assertion would break criterion 32's
  "assertions unchanged, exactly one addition" (decision 17).
- The costly hook-test files are tests/protect-records.test.js (about 10.9 s of processor time),
  tests/opuspack-hooks.test.js (about 3.4 s), tests/ledger-forgery-closed.test.js (about 3.1 s)
  and tests/pretooluse-bash-coverage.test.js (about 2.6 s); the numbers are the processor
  seconds in `SCRATCH/s4/inventory-times.txt` (they agree with the figures first quoted). Their
  hooks export no entry function, and making them export one is a hook change that needs the
  owner's explicit approval; a possible later item.

## Decisions Taken Under Ambiguity

0. **Slice 4 is dropped on a measured no-go (CTO Chief with the session coordinator, 2026-10-13).**
   The Step 9 probe measured about 28.5 ms (edit hook) and 25.3 ms (gate hook) of processor time
   per started hook, against the assumed 100 ms, so converting the two files saves about 0.27 s
   and 0.31 s, far under the one-second bar of decision 2. Section 8 step 3 already says that
   two misses create nothing and stop the build; the drop follows that rule on the evidence
   rather than building a helper, two edited files, a proof and a break copy for roughly 0.6 s.
   Not chosen: converting anyway (the saving is below the noise of one timed pair on a machine
   whose load moves between 12 and 37, and the plan's own bar says no), or widening the
   conversion to more files (decision 1 keeps real starts per file, and the other files with
   an exported entry save under a second each). The numbers are in the Execution Record.
1. **One to three real starts kept per hook in each converted file**, not per hook across the
   suite. Criterion 30 attaches the kept starts to the converted file ("WHEN a file is
   converted, THEN ... one to three cases per hook keep a real started process"), and each
   file then still proves the deployed path for its own claims. Not chosen: counting real
   starts elsewhere in the suite, which would convert more cases (several more files would
   pass the bar) at the cost of files that no longer prove their own path.
2. **The one-second bar per file, decided by the start probe as a go or no-go.** The `files:`
   list holds the two files that pass it on the estimate; a file under the bar at the probe is
   left unedited and recorded, with its breaks and mutants dropped; if both miss, the helper
   is not created and the build stops with the numbers (section 8, step 3); a left-out file
   over it is reported, never edited without a scope request.
3. **`tests/session-start-does-not-fabricate-a-project.test.js` is left out despite its 14
   starts.** The session hook's closure includes `src/lib/state.js`, whose reads are memoized
   for 5 s (`state.js` line 10, `cache.js` line 18), reached through `continuation-queue` (line
   52), `loop-b-driver` (line 55) and `increment-feed` (line 48); a memoized read from one
   in-process call can answer the next, which a started process never sees. Its case 2 runs
   the hook twice in one folder to prove the hook does not ratify its own guess (lines 85–92):
   exactly what such a cache could mask. The closure also loads `human-gate-check.js` through
   `iron-loop-enforcer.js` line 418, with its log path fixed at first load. Reloading the whole
   module graph per call would avoid both and re-spend most of the loading time the conversion
   saves. Saving forgone: about 1.0 to 1.2 s (estimated).
4. **One shared helper with two callers, and no test file of its own.** It is proven by the
   scratch power test, the proof and the breaks; a new `tests/*.test.js` would move the
   documented counts for a test-only module. It lives under `tests/helpers/`, which is not
   counted (`src/lib/documented-counts.js` line 64).
5. **The hook is always loaded fresh, after the `chdir`.** Required for the gate hook
   (`LOG_DIR`, line 126); for the Edit hook, which keeps no state (section 2), it costs one
   file's compile per call and keeps one rule for both.
6. **`process.chdir`, not a replaced `process.cwd`.** The evasion file passes relative targets
   (lines 191, 202, 321). `process.chdir` gives the test process the operating-system working
   folder a started hook has, so a relative path resolves the same way whether it goes through
   `process.cwd()` (as `path.resolve` does) or straight into a file call. Replacing only
   `process.cwd()`, as `tests/pretooluse-edit-coverage.test.js` lines 155–156 do, covers the
   first kind only; the link check itself joins a relative target to the root it is given
   (`src/lib/real-path-confinement.js` line 250), but showing that no module of the closure
   hands a relative path straight to a file call would mean reading every file call in 20
   modules. Precedent for the `chdir`: `tests/gate-violations-durability.test.js` lines
   131–141 and `tests/sessionstart-coverage.test.js` lines 317–321.
7. **Output is captured only while the entry runs synchronously.** The test runner reports
   through the test process's own streams; holding the stubs across an `await`, as
   `runEnforce` does (lines 159–168), could catch one of its writes. Neither hook awaits
   anything, and the helper fails any hook that exits after an `await`, while `process.exit`
   stays stubbed until the entry's promise settles, so such a hook cannot end the test process.
8. **The payload goes through a JSON round trip**, the value a started hook parses from its
   input.
9. **A converted test changes only its callback's `async` and its one call.** Names, assertions
   and every other line are unchanged; two comments in the evasion file and one in the bypass
   file are rewritten to describe the new mechanics, with the exact texts in sections 3 and 4.
10. **Two one-line breaks per hook, one in each direction**, compared old against new on the
    full nesting path with the expected and actual values, rather than one break per hook.
11. **Exactly two pairs per converted file, as in slice 1.** If measure (b) does not move,
    which is expected, the slice is reported as less processor time in two files, not as
    faster, under criterion 1's rule.
12. **Names by the runner's own TAP output, with slice 1's reader**, its counter invariant
    adapted to `describe` blocks (`# Subtest:` lines = result lines = tests + suites). Slice 1
    verified its invariant on a file with no `describe`; this one is believed from the
    runner's reporting of suites, and the red run of section 10 step 3, which reads the real
    output of both unconverted files, shows it before anything depends on it. If the real
    output differs, the reader is corrected to match it and the correction is recorded.
13. **Criterion 2: this slice never runs `npm test`** (the CTO Chief's ruling of 2026-10-13).
    The full `npm test` runs once after the last slice, by the CTO Chief, on the owner's
    order; criterion 2 stays unticked with that reason at the end of its own checkbox line.
14. **The repository's own log files are compared around the converted runs**, because a wrong
    load order would write into them and no assertion of either file would notice.
15. **`runHookInProcess` takes no `transcriptPath` option**: no call in the evasion file passes
    one to `runHook` (call sites listed in section 3).

Fix round of the specification step, 2026-10-13 (the CTO Chief's rulings a to c and the spec
critic's findings 1 to 7):

16. **The exit and both output streams are replaced before the hook is loaded** (critic
    finding 3). The `delete require.cache` and `require` lines moved inside the capturing
    `try`, after the three replacements, so an exit while the hook loads is recorded and fails
    checks P2 and P3 instead of ending the test process, a write while it loads lands in the
    call's output as a started process would print it, and a throw while it loads is check
    P1's failure. The doc comment says so; power case (f) now writes at load and asserts it is
    captured; a new case (h), an exit at load, proves the loud failure, so the power test has
    eight cases and criterion 32 says eight. Not chosen: a separate check that fails any write
    at load, because a started hook's write at load is real output, not a fault.
17. **Criterion 32 wins over a printed-output assertion for the gate hook** (critic finding
    5). Criterion 32 allows the old assertions unchanged plus exactly one addition per file
    (G2 in the bypass file); an assertion on the gate hook's `console.error` violation text
    would be a second addition. The gap is listed for the owner under the findings outside
    this slice.
18. **The probe is a go or no-go at PREPARE** (critic finding 2). Every "converted" is
    conditional on it. One miss drops that file's edits, its two breaks and its mutants, and
    makes all three mutants in the converted file (the assert-deleted mutant moves to it,
    and for the evasion file the kept-converted and name-changed mutants are defined on the
    CONTROL test at line 160 and on case 1 at line 188), so each of the proof's checks is still
    shown to fail; criteria 30 and 32 read "for each converted file". Two misses create no
    helper and stop with the numbers.
19. **The probe uses a scratch copy of the helper** (follows from decision 18). The helper's
    text is written byte for byte to `SCRATCH/s4/probe/hook-in-process.js`, the power test
    passes against it, and only then does the probe call it; `tests/helpers/hook-in-process.js`
    is created at IMPLEMENT, byte-identical to that copy, and only when at least one file goes.
    The power test takes the helper's path from `S4_HELPER` so the same test proves both
    copies.
20. **The proof's red run comes before the probe** (follows from the critic's step mapping:
    TEST holds the power test and the proof red, PREPARE the clones and the probe). Section 10
    lists the probe before the proof's red run; the red run does not depend on the probe, so
    the order changes nothing it shows. The proof makes `SCRATCH/base-s4/` itself when absent,
    as slice 1's proof made its base copy, because its names step runs the old file there;
    PREPARE then confirms that clone is at `BASE` and clean, and makes the break copy.
21. **The log check of section 7, step 5, passes on the absence of a temporary project's
    name** (critic finding 6), not on unchanged bytes: an entry another process writes into
    the repository's own logs during the run cannot fail the step, while every added line is
    printed either way. Both spellings of the temporary folder are matched, `os.tmpdir()` and
    its real path, because both test files canonicalise their folders with `realpathSync`.
22. **A failing set of a break that differs from section 6's table stops the build** (critic
    finding 7) and goes back to the CTO Chief with both sets printed; the builder neither edits
    the table nor accepts the difference.
23. **Section 2's snapshot limit is a stated risk and a finding for the owner** (critic
    finding 4), not closed here: guarding it means reloading or inspecting the whole closure
    per call, which re-spends the saving (decision 3's reasoning).
24. **Step 14 runs no `npm test`** (ruling a): it runs the affected tests, the whole
    repository's lint with zero warnings, the type check, the proof, the mutants, the breaks
    and one whole-suite timing run (section 9's "After, whole suite": `node --test` with the
    per-file reporter, wall and processor time, load at start and end).
25. **The builder runs no menu command and commits nothing; reviews are the CTO Chief's to
    dispatch** (ruling b). The builder writes review packets in two areas (the helper; the
    converted files) and one for a security-scanner pass, ends its turn at REVIEW, and on
    re-dispatch applies at most two fix rounds; what is left goes to the CTO Chief.
26. **`SCRATCH` is the folder the CTO Chief names in the build brief** (ruling c). The slice-1
    scratch files this plan reuses, `SCRATCH/prove-the-split.js` (its TAP and assertion
    readers) and `SCRATCH/per-file-reporter.cjs`, are recreated word for word from the
    "Scripts (sources)" part of slice 1's build record when missing
    (`plans/implementation/the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md`,
    headings `prove-the-split.js` and `per-file-reporter.cjs`).
27. **Mode: standard, single pass.** The refinement loop is not gated on: the frontmatter says
    `effort: small`, and none of the three declared paths matches a glob in
    `.ctoc/config/refinement-triggers.yaml` (read in full; its one security glob is
    `**/security/**`, a folder, and no declared path has a `security` folder).

## What was not verified

- This planner ran nothing. The saving per call (0.1 s) is an assumption from the profile's
  average; the probe measures it. The inventory's start counts come from reading, with loops
  expanded by hand.
- That `console.error` reaches `process.stderr.write` as an own-property lookup at call time:
  believed; the gate file asserts no printed text, so a miss would only send the text to the
  test's real standard error.
- That the test runner never writes to the test process's standard output during a test's
  synchronous code: believed (one thread); the helper does not depend on it.
- Whether the coverage run counts lines run in started hook processes: not checked; in-process
  calls can only add covered lines.
- The "what they assert" column for hooks that export no entry is read from each file's run and
  assert helpers, not case by case.
- Which ten files the profile counted: not known; section 8 measures every file listed.
- That `String.prototype.replace` and `match` with a global expression leave no position
  behind: believed from the language definition.

---

## Execution Plan (Steps 8-16)

Mode: standard, single pass (decision 27). `SCRATCH` is the folder the CTO Chief names in the
build brief (decision 26). Every command runs from the root of this worktree; `BASE` is
`git rev-parse HEAD` at the build's start. Every timed run records the items of section 9; no
two timed runs overlap. A run that can pass 10 minutes is started in the background and the
turn ends; never a loop that sleeps and checks a file. The builder runs no `menu` command and
commits nothing at any step. Every edit of a test file below is made only for a file the
probe confirms (section 8, step 3).

### Step 8: TEST (TDD Red)
- [ ] Record `BASE` and confirm `git status --porcelain -- src tests/helpers/hook-in-process.js tests/security-enforcement-evasion.test.js tests/security-gate-bypass.test.js` prints nothing; otherwise stop and report to the CTO Chief
- [ ] Section 10, step 0: confirm at `BASE` that every old text this plan quotes stands at the line named (E1, E4, F1, the call lines and `it(` lines of sections 3, 4 and 7, and the four break lines of section 6, each matching exactly once in its hook); any difference stops the build and goes back to the CTO Chief, and the tables are redone upstream, never guessed
- [ ] Confirm `node_modules/typescript/package.json` and `node_modules/eslint/bin/eslint.js` exist; if either is absent, stop and report it to the CTO Chief, and install nothing
- [ ] Confirm `SCRATCH/prove-the-split.js` and `SCRATCH/per-file-reporter.cjs` exist; recreate a missing one word for word from the "Scripts (sources)" part of slice 1's build record (decision 26) and record that it was recreated
- [x] Write the eight power hooks (a) to (h) in `SCRATCH/s4/power-hooks/` and `SCRATCH/s4/helper-power.test.js` exactly as section 10, step 1 states; each case asserts the exact rejection message or the exact returned object, and (e) and (h) also that the test process lives on; the file takes the helper's path from `S4_HELPER` and fails loudly when it is unset or the path is missing
- [x] Run `node --test SCRATCH/s4/helper-power.test.js` with `S4_HELPER` at `SCRATCH/s4/probe/hook-in-process.js`, which does not exist yet, and see it fail on the missing helper and on nothing else
- [x] Write `SCRATCH/s4/prove-hooks-in-process.js` exactly as section 7 describes: the whole-file undo with exact counts, the static CONVERTED and KEPT check, the names by run with slice 1's TAP reader and the invariant adapted to `describe` blocks (decision 12), the assertion multisets with slice 1's TypeScript reader, the helper's four calls, the log check of step 5 (decision 21), the `--static <folder>` mode, the one-file mode of the end of section 7, `SCRATCH/base-s4/` made as section 9 says when absent (decision 20); `NODE_TEST_CONTEXT` deleted from every child's environment, argument lists, no shell
- [x] Run `node SCRATCH/s4/prove-hooks-in-process.js <root> <BASE>` on the unconverted tree and see it exit 1 for the reasons of section 10, step 3 only: step 2 names every CONVERTED case as still starting the hook, step 1 finds 0 of the expected 5 and 7 in-process calls, step 4 finds the helper absent and the one addition per file missing; the names step (23 and 17 keys) and the rest of the assertion step pass on both files. Red for any other reason is a fault in the script, fixed there; a key count other than 23 or 17 is read against the real TAP output, the reader corrected and the correction recorded (decision 12)
- [x] Quote both red outputs in the build record, every absolute path rewritten relative to the repository root or `SCRATCH`

### Step 9: PREPARE
- [ ] Record the machine facts once: core count, `node --version`, `BASE`, and which of semgrep, osv-scanner, trufflehog, detect-secrets, gosec and bandit `command -v` finds
- [ ] The base clone made by Step 8's proof: `git -C SCRATCH/base-s4 rev-parse HEAD` equals `BASE`, `git -C SCRATCH/base-s4 status --porcelain` prints nothing, and its `node_modules` is a directory link to this worktree's; it is never edited
- [ ] The break copy, as section 6, step 2 says: `git -C <root> diff --quiet -- src/hooks` exits 0 first, then `git clone --shared --no-checkout`, `checkout --detach <BASE>` and the `node_modules` directory link (a junction on Windows), every `git` with an argument list and no shell
- [x] Inventory measurement, section 8, step 1: write and run `SCRATCH/s4/inventory-times.js <root>` over every file of the two inventory tables, one at a time, and record per file the exit status, the test counts, wall, user and system time, and the load before and after; a file that fails is recorded as it came out and reported, never re-run to green
- [x] Write the helper's text of section 1 byte for byte to `SCRATCH/s4/probe/hook-in-process.js` and run `node --test SCRATCH/s4/helper-power.test.js` with `S4_HELPER` at that copy: all eight cases pass with the exact messages of section 10; a case that fails against the plan's text is a defect of this plan, reported to the CTO Chief with the output, and neither the case nor the helper is changed here
- [x] The probe, section 8, step 2: write `SCRATCH/s4/spawn-cost-probe.js` and run it interleaved, spawn, in-process, spawn, in-process, for `edit` and then for `gate`, each run under `/usr/bin/time -p` with the load before and after; every call must answer as stated (exit 2 for `edit`; exit 0 and the plan reverted for `gate`), otherwise the run fails and is reported
- [x] Compute for each hook the processor time saved per call and its product with the file's converted calls (10 for the evasion file, 13 for the bypass file); record both with every run's numbers
- [x] Apply the go or no-go of section 8, step 3, and record it: both pass, the slice goes on as written; one misses, that file stays as at `BASE`, its edits, its two breaks and its mutants are dropped and the three mutants are made in the other file; both miss, nothing is created or edited, the build stops here and the probe numbers go to the CTO Chief
- [ ] The before side of the measurement, section 9: slice 3's completion whole-suite run when `git log` shows nothing else landed between it and `BASE`, otherwise one run in `SCRATCH/base-s4/` with section 9's command; record which was used

### Step 10: IMPLEMENT
- [ ] `tests/helpers/hook-in-process.js`, created only when at least one file goes: a copy of `SCRATCH/s4/probe/hook-in-process.js`, confirmed byte-identical to it and to section 1's text; then `node --test SCRATCH/s4/helper-power.test.js` with `S4_HELPER` at the worktree's file passes all eight cases
- [ ] `tests/security-enforcement-evasion.test.js`, if the probe confirms it: edits E1 to E5 of section 3, exactly as written, and nothing else
- [ ] `tests/security-gate-bypass.test.js`, if the probe confirms it: edits F1 to F4 of section 4, exactly as written, and nothing else
- [ ] Lint the declared files that changed: `node node_modules/eslint/bin/eslint.js --max-warnings 0 tests/helpers/hook-in-process.js <each converted file>`, 0 errors and 0 warnings
- [ ] Run each converted file alone with `node --test <file>`: every test passes, the runner's `fail` and `skipped` counters 0
- [ ] Run the static proof, `node SCRATCH/s4/prove-hooks-in-process.js <root> <BASE> --static <root>`: exit 0
- [ ] Right after, the three mutants under `SCRATCH/s4/mutants/` (section 7, or after one miss the three of its end, all in the converted file), each through the static proof: each exits 1 naming its defect; quote all three failures with their edits in the build record; a mutant that passes is a fault in the script, fixed there, and the proof re-run on the real files and every mutant
- [ ] Outside `plans/` and `.ctoc/`, `git status --porcelain` lists only the declared paths the go or no-go allowed, and `git diff --quiet <BASE> -- src` exits 0
- [ ] Wiring: nothing to register; each converted file is picked up by `tests/*.test.js` (section "Wiring"), and the helper is reached only through `require('./helpers/hook-in-process')` in the converted files

### Step 11: REVIEW
- [ ] Self-review first: the full proof `node SCRATCH/s4/prove-hooks-in-process.js <root> <BASE>` exits 0, and the diff of each declared file reads word for word against sections 1, 3 and 4
- [ ] Write three review packets into `SCRATCH/s4/review/`. Packet 1, the helper: its file, sections 1 and 2, the power test with its eight hooks and outputs, the probe script with its numbers and the go or no-go. Packet 2, the converted files: each file, its text at `BASE`, sections 3 to 7, the proof's full output and the three mutant failures. Packet 3, for a security-scanner pass: the helper, every scratch script and the section "Security review". Each packet asks whether the change matches the plan word for word, whether an in-process case can pass where its started version fails, and what its area could still hide
- [ ] Hand the three packets to the CTO Chief with the recommendation to dispatch, in parallel, two `iron-loop-critic` reviews (the helper; the converted files) and one `security-scanner` pass; dispatch nothing, run no `menu` command, and end the turn with a report; the steps from OPTIMIZE on start only after the review outcome
- [ ] When re-dispatched with the findings: fix each accepted finding inside the declared files and the scratch scripts, then re-run the full proof, the mutants, the power test and the affected tests of Step 14; a finding against text this plan fixes word for word (sections 1, 3 and 4) is not fixed in the build and goes back to the CTO Chief, quoted, as a kickback to this plan
- [ ] At most two fix rounds; every finding still open after the second goes to the CTO Chief, one line each, and a finding outside this slice's goal is listed in one line for the owner to schedule

### Step 12: OPTIMIZE
- [ ] No product code changes in this slice: `git diff --name-only <BASE>` lists nothing under `src/`; the saving is the conversion itself, measured in Step 14, never by editing an assertion
- [ ] Confirm by reading that the helper requires only `node:assert/strict` and the hook, does one `chdir` and one fresh load of the hook per call, and keeps no state between calls
- [ ] Record each converted file's per-case `duration_ms` from its TAP output beside the base file's, as observed, never asserted on inside a test

### Step 13: SECURE
- [ ] Read the helper: `process.exit`, both output streams and the working folder are put back in `finally` blocks before any assertion runs, so a failing assertion cannot leave the test process altered; power case (g) shows all four restored
- [ ] Read every scratch script: it starts only `git`, `node` and `/usr/bin/time`, with argument lists and no shell; it requires no `http`, `https`, `net` or `dns` module; its inputs are only the repository root, the `BASE` commit name as one argument and folders under `SCRATCH`; it writes and links only under `SCRATCH`
- [ ] No hook file in the repository was edited: `git diff --quiet <BASE> -- src/hooks` exits 0 before and after the breaks, and every break was made and undone only in `SCRATCH/s4/break-copy/`
- [ ] Read the declared files and the scratch scripts for any key, token, password or personal value; a found one is named by file and line, never copied
- [ ] Search the build record for absolute paths and account names before it is written; every path is relative to the repository root or `SCRATCH`

### Step 14: VERIFY

This step never runs `npm test`: the full `npm test` runs once after the last slice, by the CTO
Chief (decision 24).

- [ ] Affected tests by name: `node --test tests/security-enforcement-evasion.test.js tests/security-gate-bypass.test.js tests/skip-visibility.test.js tests/skip-guard-integrity.test.js`, and `node --test SCRATCH/s4/helper-power.test.js` with `S4_HELPER` at the worktree's helper; the runner's `fail` and `skipped` counters 0 in every run
- [ ] Lint with 0 warnings: the declared-file command of Step 10, then the whole repository with `node node_modules/eslint/bin/eslint.js --max-warnings 0 .`; type check with `npm run typecheck`
- [ ] The full proof, `node SCRATCH/s4/prove-hooks-in-process.js <root> <BASE>`, exits 0 for each converted file: the whole file modulo the listed edits, names by run (23 and 17 keys), assertions equal to the old plus the one addition, the helper's four calls, and the log check with every added log line printed and none naming a temporary project of the tests; output recorded (criterion 32)
- [ ] The three mutants once more against the final script: each exits 1 naming its defect (criterion 32)
- [ ] The deliberate breaks, `node SCRATCH/s4/break-and-compare.js <root> <BASE>`, for the hooks of the converted files: the control passes in both versions; each break fails exactly the tests of section 6's table with the same expected and actual values in the old and the new version; the `src/hooks` check passes before and after. A failing set that differs from the table stops the build and goes back to the CTO Chief with both sets printed (decision 22)
- [ ] Criterion 33: for each converted file exactly two pairs, before, after, before, after, with section 9's command, each run once with the load before and after, none repeated or discarded whatever its load; both sides' processor time and wall-clock recorded per pair
- [ ] Criterion 1: one whole-suite timing run on the completion tree with section 9's "After, whole suite" command (`node --test` with the spec and per-file reporters under `/usr/bin/time -p`), recorded as it comes out and never repeated: wall and processor time, the load at start and at end, core count, `node --version`, `git rev-parse HEAD` with a note that the diff is not committed, the pass, fail and `skipped` totals, and the longest file with its duration; "faster" is written only under criterion 1's rule, otherwise "less processor time in the converted files" with the numbers (decision 11)
- [ ] A failure in that run confined to `tests/reachability-surface-scan-is-linear.test.js` or `tests/iron-loop-enforcer.test.js` is re-run alone with `node --test <that file>` and recorded with its load, and neither file is edited; a failure in a declared file goes back to IMPLEMENT; a failure in any other file is re-run alone once, recorded with its load, and reported to the CTO Chief
- [ ] Criterion 31: `git diff --quiet <BASE> -- src` exits 0, and `git diff --name-only <BASE>` lists no test file of a hook that exports no entry

### Step 15: DOCUMENT
- [ ] Write the build record under `## Execution Record` at the end of this plan: `BASE` and the machine facts; the power test's red and green outputs; the proof's red output; the inventory times; the probe's runs, both products and the go or no-go; section 2's module-level inventory as checked; the source and output of every scratch script; the static and full proof outputs; the three mutant failures with their edits; the break comparison; the two pairs per converted file and the before and after whole-suite runs with their items; any re-run alone with its load; every review finding with its fix, rejection or hand-off; every changed path under `.ctoc/`, never committed
- [ ] Every absolute path in the record rewritten relative to the repository root or `SCRATCH`
- [ ] No other documentation file and no CHANGELOG entry: the comments E1, E3, E4, F1 and F3 are the documentation this slice changes; the stale comment at `tests/gates.test.js` lines 39–42 stays listed for the owner, unedited

### Step 16: FINAL-REVIEW
- [ ] Every box of Steps 8 to 15 is ticked only for work done and seen
- [ ] Verify each acceptance criterion against the evidence it names, by running it or reading the recorded output, and tick its box only then
- [ ] A criterion that cannot be verified keeps its box open, with its reason in plain words at the end of that same checkbox line, without square brackets and never on a new line, and is reported to the CTO Chief; criterion 2 stays open with the reason already at the end of its line
- [ ] Outside `plans/` and `.ctoc/`, `git status --porcelain` lists only the declared paths the go or no-go allowed; the builder commits and pushes nothing
- [ ] Run no `menu` command; hand back to the CTO Chief with the criteria status, the probe's go or no-go, the review outcome and every open finding; the completion is the CTO Chief's to hand to the owner

## Execution Record

Build of 2026-10-13, stopped at Step 9 on a measured no-go. `SCRATCH` is the scratch folder
named in the build brief; every path below is relative to the repository root or `SCRATCH`.

### BASE and machine facts

- BASE: `d0a0cc9b32b422da9fa7e86ae56432399313ea48` (`chore(plans): the build record of the
  fast-test rules slice`), the worktree HEAD when the build ran; the proof's own output names the
  same commit.
- Machine: 18 cores, Node `v24.14.1`, one-minute load average between 17.0 and 19.5 during the
  probe and the inventory (as printed by `os.loadavg()` before and after each run).
- Not recorded by the build: which of semgrep, osv-scanner, trufflehog, detect-secrets, gosec and
  bandit are installed (that Step 9 item was not reached).

### Step 8 red outputs (one line each)

- `SCRATCH/s4/helper-power.test.js` with `S4_HELPER` at the not-yet-existing
  `SCRATCH/s4/probe/hook-in-process.js`: fails on the missing helper and nothing else
  (`Error: S4_HELPER points at a missing file: hook-in-process.js`; tests 1, pass 0, fail 1,
  skipped 0).
- `node SCRATCH/s4/prove-hooks-in-process.js <root> <BASE>` on the unconverted tree: exit 1,
  `FAILED: 38 problem(s)`; the helper is absent, every converted case still starts the hook
  (0 of the expected 5 and 7 in-process calls), the one listed assertion addition is missing,
  while the names step passes on both files (23 and 17 keys, 18 and 15 tests, 0 failed, 0
  skipped) and the log check adds no line (evasion log absent before and after; gate log 3 lines
  before and after).

### Helper power test against the plan's helper text

`SCRATCH/s4/probe/hook-in-process.js` (the plan's section 1 text) with the same power test:
8 of 8 cases (a) to (h) pass, fail 0, skipped 0.

### Inventory times (Step 9, section 8 step 1)

Each file run alone, once, with `node --test`; wall seconds and processor seconds (user plus
system) from `/usr/bin/time -p`, source `SCRATCH/s4/inventory-times.txt` and `.json`; every file
exit 0 with 0 failed and 0 skipped. Load before and after each run is in the source (17.0 to
19.0).

| File (`tests/<name>.test.js`) | Tests | Wall s | Processor s |
|---|---|---|---|
| security-gate-bypass | 15 | 0.45 | 0.46 |
| security-enforcement-evasion | 18 | 0.41 | 0.43 |
| session-start-does-not-fabricate-a-project | 13 | 0.68 | 0.79 |
| pretooluse-task-coverage | 26 | 0.55 | 0.56 |
| e2e-enforcement-and-gates | 17 | 0.48 | 0.49 |
| gate3-verify-evidence-write-deny | 26 | 0.37 | 0.38 |
| stop-continuation-gate-queue | 8 | 0.26 | 0.26 |
| ctoc-audit-w02-s2-ledger-write-deny | 21 | 0.24 | 0.25 |
| pretooluse-multiedit-coverage | 9 | 0.28 | 0.29 |
| pretooluse-notebookedit-coverage | 9 | 0.29 | 0.30 |
| w01-multiedit-notebookedit-parity | 7 | 0.33 | 0.35 |
| w01-edit-write-deny-protocol | 6 | 0.20 | 0.21 |
| continuation | 17 | 0.17 | 0.17 |
| ctoc-routing-reminder | 30 | 0.19 | 0.20 |
| session-start-hook | 5 | 2.11 | 2.68 |
| hooks-remaining | 25 | 0.42 | 0.45 |
| gate-hook-revival | 14 | 0.21 | 0.21 |
| plan-index-duplicate-hook | 16 | 0.19 | 0.19 |
| human-gate-check-coverage | 25 | 0.20 | 0.20 |
| sessionstart-self-repo-and-honest-banner | 12 | 0.26 | 0.28 |
| plan-number-allocation | 36 | 0.17 | 0.17 |
| sessionstart-coverage | 31 | 0.22 | 0.51 |
| hooks-do-not-manufacture-the-project-marker | 13 | 0.12 | 0.11 |
| pretooluse-write-coverage | 37 | 0.13 | 0.14 |
| fail-open-contracts | 6 | 0.17 | 0.18 |
| session-start-coverage-holes | 9 | 0.14 | 0.15 |
| a-dangling-link-is-not-a-path-inside-the-tree | 14 | 0.11 | 0.11 |
| resume-watchdog | 27 | 0.12 | 0.14 |
| post-commit-coverage | 14 | 0.09 | 0.09 |
| security-bash-hook | 53 | 1.85 | 1.85 |
| ledger-forgery-closed | 52 | 2.99 | 3.09 |
| shell-write-targets | 103 | 0.50 | 0.54 |
| pretooluse-bash-coverage | 82 | 2.51 | 2.59 |
| bash-gate-plan-coverage | 26 | 0.90 | 0.95 |
| the-bash-channel-cannot-reach-the-ledger-through-a-link | 19 | 1.36 | 1.41 |
| bash-gate-payload-reader | 18 | 0.56 | 0.58 |
| enforcement-fault-arms | 14 | 0.24 | 0.26 |
| unsigned-state-rejected | 14 | 0.12 | 0.12 |
| opuspack-hooks | 69 | 3.33 | 3.36 |
| protect-records | 99 | 9.98 | 10.89 |
| plans-keep-moving-without-the-human | 97 | 1.63 | 1.86 |
| guard-files-coverage | 61 | 0.32 | 0.33 |
| stop-test-gate-coverage | 42 | 0.45 | 0.47 |
| remainder-hooks-commands-coverage | 18 | 0.13 | 0.15 |
| posttooluse-status-check-coverage | 18 | 0.52 | 0.57 |
| a-session-records-the-build-it-loaded | 13 | 0.13 | 0.15 |
| posttooluse-plan-index-sync-coverage | 33 | 2.41 | 0.31 |
| w10-plan-index-sync-await | 5 | 2.25 | 0.19 |
| step-label-hook-claim-matches-manifest | 8 | 0.08 | 0.08 |

The two candidate files cost 0.46 s (gate bypass) and 0.43 s (enforcement evasion) of
processor time as a whole file, which already shows neither can save a second.

### The start probe (Step 9, section 8 step 2)

`SCRATCH/s4/run-probe.js` ran `SCRATCH/s4/spawn-cost-probe.js` interleaved (spawn, in-process,
spawn, in-process) for `edit` then `gate`, 20 calls per run, each under `/usr/bin/time -p`; every
call answered as stated (exit 2 for `edit`; exit 0 and the plan reverted for `gate`), no run
broken. Source: `SCRATCH/s4/probe-results.txt` and `.json`. Processor seconds per run of 20
calls (user plus system; wall in brackets), load 18.3 to 19.5:

| Hook | Mode | Run 1 | Run 2 |
|---|---|---|---|
| edit | spawn | 0.56 (0.52) | 0.58 (0.54) |
| edit | in-process | 0.04 (0.04) | 0.04 (0.04) |
| gate | spawn | 0.50 (0.51) | 0.51 (0.51) |
| gate | in-process | 0.03 (0.03) | 0.03 (0.03) |

- Processor time per call: a started edit hook costs about 28.5 ms (mean of 0.56 and 0.58,
  over 20), an in-process edit call about 2 ms (0.04 over 20); a started gate hook about 25.3 ms
  (mean of 0.50 and 0.51), an in-process gate call about 1.5 ms (0.03 over 20).
- Saving per call as the script computed it: 26.5 ms for `edit`, 23.8 ms for `gate`.
- Product with the file's converted calls: `tests/security-enforcement-evasion.test.js`
  26.5 ms x 10 = 0.27 s; `tests/security-gate-bypass.test.js` 23.8 ms x 13 = 0.31 s.
- Go or no-go (section 8, step 3; bar 1.0 s, so 100 ms per call for the evasion file and 76.9
  ms per call for the bypass file): both files NO-GO. Evasion file: 0.27 s against 1.0 s, no-go;
  bypass file: 0.31 s against 1.0 s, no-go. The assumed 0.1 s per started hook was wrong by a
  factor of about four.
- Per the plan's own rule for two misses, nothing is created or edited and the build stops at
  Step 9. Not run, because they depend on a go: the break copy, the before side of the whole-suite
  measurement, and everything from Step 10 on.

Outcome: dropped on a measured no-go; no file under tests/ or src/ was created or edited.
