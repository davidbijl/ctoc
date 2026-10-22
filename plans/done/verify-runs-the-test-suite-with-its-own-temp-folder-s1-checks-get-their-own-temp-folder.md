---
iron_loop_verdict: true
iron_loop: true
title: "VERIFY makes a fresh temp folder under the home folder for each run, gives it to its checks, records it, and removes it"
type: implementation
created: 2026-10-22
priority: high
effort: small
parent_plan: verify-runs-the-test-suite-with-its-own-temp-folder
depends_on: verify-finds-the-projects-own-python-tools-s1-venv-tools-first-on-path, the-test-suite-passes-on-a-clean-machine-s1-four-failures-fixed
files:
  - src/lib/step-13-verify.js
  - tests/step-13-verify.test.js
revision: 1
rejection_reason: "Recorded verify failed only because the run used the full /tmp; rerun the completion with the on-dis"
tag: rejected
approved_by: human
approved_at: 2026-10-22T18:39:40.286Z
gate_crossed: review → done
---
# REVISION 1

## Rejection Feedback

Recorded verify failed only because the run used the full /tmp; rerun the completion with the on-disk temp folder.

---


# VERIFY makes a fresh temp folder under the home folder for each run, gives it to its checks, records it, and removes it

Slice 1 of 2 of `plans/implementation/verify-runs-the-test-suite-with-its-own-temp-folder.md`.
This slice changes one module and its own test file. Slice 2 (the protection tests' neutral
base) depends on this one.

This file changes the gate's own check runner (`src/lib/step-13-verify.js`). The owner
approved that when he approved the functional plan that names this file (`approved_by: human`,
2026-10-22T15:02:47Z). The rule that VERIFY refuses a run where nothing ran
(`no-verifiable-toolchain`), the pass rule, and the one-line summary do not change.

## Problem statement

`runFallbackChecks` (`src/lib/step-13-verify.js:720`) runs lint, typecheck and tests through
`tryCommand` (`:833`, `execSync`). Since the venv slice, a child gets its own environment
only when the project is a Python project with a `.venv` or `venv` tool folder (`:733-734`,
`checkEnvWith` at `:349`). Every other child, CTOC's own `npm test` included, inherits the
CTOC process's environment and so its temp folder. In this sandbox that temp folder is a
256 MB tmpfs (from the brief), and two VERIFY records of 2026-10-22 failed with `ENOSPC` /
"Could not report code coverage" (read in `.ctoc/state/verify/`, see the parent plan).

## Implementation Details

### Architecture Decision

**One wrapper owns the folder's life; the old body runs inside it unchanged.** The present body
of `runFallbackChecks` is renamed `runFallbackChecksWith(projectPath, tempDir)`. Only one
line of it changes: the line that builds `checkEnv`. A new, short `runFallbackChecks(projectPath)`
does four things:

1. it makes the run's folder (`openCheckTemp`);
2. it runs the old body in `try`;
3. it removes the folder in `finally` (`closeCheckTemp`), so the folder goes whatever the
   outcome: pass, fail, timeout, overflow, or a throw inside this module;
4. it writes `tempFolder` / `tempFolderNote` on each check that ran (`noteTempFolder`).

`runVerify` calls `runFallbackChecks` before `applyAppRunCheck`, so the folder is gone
before the app launch, as the parent plan requires. The export list does not change.

**One environment per run.** `checkEnvWith(binDir, tempDir)` builds ONE copy of
`process.env`. When there is a venv tool folder, it is put first on `PATH` (the venv
slice's rule, unchanged). When there is a run folder, `TMPDIR`, `TMP` and `TEMP` all name it.
With neither, the result is `undefined`: no `env` key reaches `spawnSync` or `execSync`. That
is today's fallback ("no temp variable is changed, and an environment is passed only for a
venv project"). The same copy goes to every `--version` probe and to every check, so the
probe and the run see the same folder.

**The unsafe-word rule lives in this module as a frozen list.** A lib module must not
depend on a hook (the layering rule), and `src/` may not build a regular expression from text
(`security/detect-non-literal-regexp` is at error). So this module keeps its own list,
compared after folding (ignoring letter case, with and without NFKC, with quotes and
backslashes removed). A drift test reads the hook's three patterns from
`src/hooks/protect-records.js` source text. It fails when the hook gains a word that this list
does not refuse.

Alternatives set aside:
- Setting `process.env.TMPDIR` for the run and restoring it afterwards. This writes the CTOC
  process's own environment, which the parent plan forbids. A throw between the set and the
  restore would also leak it.
- Making the folder inside `runVerify`. `runFallbackChecks` is exported and called directly by
  `tests/verify-parses-full-output.test.js` and `tests/lib-quality2-batch.test.js`. Owning
  the folder there gives every caller the same behaviour.
- Exporting the word check for the protection test file to import. The export fence
  (`tests/export-reachability.test.js`) counts an export whose only caller is a test as dead.
  Slice 2 reads the hook's own patterns instead.

### Dependency Graph

```text
src/lib/step-13-verify.js:runFallbackChecks -> openCheckTemp (new, private)
src/lib/step-13-verify.js:runFallbackChecks -> runFallbackChecksWith (the old body, renamed, private)
src/lib/step-13-verify.js:runFallbackChecks -> closeCheckTemp (new, private, in finally)
src/lib/step-13-verify.js:runFallbackChecks -> noteTempFolder (new, private)
src/lib/step-13-verify.js:runFallbackChecksWith -> checkEnvWith (gains tempDir)
src/lib/step-13-verify.js:openCheckTemp -> node:os (homedir, tmpdir)
src/lib/step-13-verify.js:openCheckTemp -> src/lib/safe-fs.js (statSync, mkdirSync, realpathSync, mkdtempSync)
src/lib/step-13-verify.js:openCheckTemp -> unsafeTempWord, shownTempFolder, removeRunFolder, errorCode (new, private)
src/lib/step-13-verify.js:closeCheckTemp -> removeRunFolder -> src/lib/safe-fs.js (rmSync, existsSync)
tests/step-13-verify.test.js -> src/lib/step-13-verify.js (runVerify, runFallbackChecks, persistVerifyResult)
tests/step-13-verify.test.js -> src/hooks/protect-records.js (source TEXT only, read by the drift test)
tests/step-13-verify.test.js -> src/lib/safe-fs.js, node:os (fault injection, always restored in finally)
```

No cycle. The new code needs one new require, `require('os')`, which is a Node built-in. Nothing
under `src/hooks/` or `src/commands/` is imported.

### File: `src/lib/step-13-verify.js`
**Action:** MODIFY
**Purpose:** Each VERIFY run gives its fallback checks a fresh temp folder under the home folder, records it, and removes it.
**Change Type:** modify-existing (constants, seven private helpers, one renamed body, one widened helper)

Line numbers are those of the working tree on 2026-10-22, which already holds the venv slice's
uncommitted change. Re-read before editing (Step 9).

#### Requires (line ~73-76)
Add `const os = require('os');` after `const path = require('path');`.

#### New private constants: place them directly after `checkEnvWith` (line ~358). Do not export them.

```js
/** The names a child reads its temp folder from: TMPDIR (Linux, macOS), TMP and TEMP (Windows). */
const TEMP_VARIABLES = Object.freeze(['TMPDIR', 'TMP', 'TEMP']);
/** The folder, under the home folder, in which each VERIFY run makes its own temp folder. */
const CHECK_TEMP_BASE_PARTS = Object.freeze(['.cache', 'ctoc-check-temp']);
/** The fixed start of every run folder's name, so a killed run's leftover is easy to find and delete. */
const CHECK_TEMP_PREFIX = 'run-';
/** How many fresh names are tried before VERIFY falls back to the inherited temp folder. */
const CHECK_TEMP_TRIES = 3;
```

`UNSAFE_TEMP_WORDS`. Over the list, write a comment that says three things. First, these are
the words a temp folder's path must not contain. Second, they are taken from what
`src/hooks/protect-records.js` scans when its decision crashes: `UNCHECKED_SUSPECT_RE`,
`MENU_MENTION_RE` (a background agent's call), `SETTINGS_MENTION_RE` (a background agent's
call, NFKC-folded) and the sweep confirmation `confirmsSweep`. A run folder that holds one of
them makes the suite's crash tests refuse their own temp paths. Third, the list is kept here
because lib does not read hooks, and `tests/step-13-verify.test.js` reads the hook's source
and fails when the hook gains a word that is missing here. Then:

```js
const UNSAFE_TEMP_WORDS = Object.freeze([
  // UNCHECKED_SUSPECT_RE. stampAndLedger and persistVerifyResult are covered by ledger and verify.
  '.ctoc', 'approval', 'verify', 'ledger', 'backfill', 'approveplan', 'crossbysufficiency',
  'streamapprove', 'streamanswer',
  // MENU_MENTION_RE. The four words it shares with the line above are not repeated.
  'start.js', 'menu-screens', 'streaming-gate', 'streaming-precompute', 'continueaftercrossing',
  'approvesubplans', 'crossonevidence', 'pendinggatedecisions',
  // SETTINGS_MENTION_RE.
  'settings.json', 'settings.local.json',
  // confirmsSweep (its other form, "sweep" together with "--confirm", is checked in unsafeTempWord).
  'applysweep'
]);
```

#### New private functions: place them after the constants, in this order. Do not export them.

- `errorCode(e)` returns `string`. It returns `e.code` when that is a non-empty string, else
  `'an unknown error'`. Error MESSAGES are never stored: they carry absolute paths, and with
  them the user's name.

- `unsafeTempWord(p: string)` returns `string | null`. The result is the matched word in
  double quotes (for example `"verify"`), or `"sweep" and "--confirm"`, or `null`.
  ```js
  function unsafeTempWord(p) {
    const raw = String(p);
    for (const text of [raw, raw.normalize('NFKC')]) {
      const flat = text.toLowerCase().replace(/["'\\]/g, '');
      const word = UNSAFE_TEMP_WORDS.find((w) => flat.includes(w));
      if (word) return `"${word}"`;
      if (flat.includes('sweep') && flat.includes('--confirm')) return '"sweep" and "--confirm"';
    }
    return null;
  }
  ```
  Why each fold is needed (put it in the JSDoc):
  - The hook tests `UNCHECKED_SUSPECT_RE` (flag `i`) and `MENU_MENTION_RE` (case-sensitive)
    on the RAW text. A combining mark after `verify` is matched there, and NFKC would join it
    into the letter.
  - The hook tests `SETTINGS_MENTION_RE` (`iu`) on the NFKC text, where `ſettings.json` folds
    to `settings.json`.
  - `confirmsSweep` removes quotes and backslashes first.
  - Lower-casing every word is stricter than `MENU_MENTION_RE` and is never weaker.

  The regular expression is a literal, which `security/detect-non-literal-regexp` and
  `security/detect-unsafe-regex` both accept.

- `shownTempFolder(p: string, home: string)` returns `string`. This is the stored form: the
  home folder becomes `~`, and the separators become `/`.
  ```js
  function shownTempFolder(p, home) {
    const abs = String(p);
    if (home) {
      const rel = path.relative(home, abs);
      if (rel === '') return '~';
      if (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)) {
        return `~/${rel.split(path.sep).join('/')}`;
      }
    }
    return abs.split(path.sep).join('/');
  }
  ```
  Example: home `/home/ctoc`, folder `/home/ctoc/.cache/ctoc-check-temp/run-Ab12Cd` gives
  `~/.cache/ctoc-check-temp/run-Ab12Cd`. The folder `/tmp` gives `/tmp`. On Windows
  `C:\Users\x\AppData\Local\Temp` with that home gives `~/AppData/Local/Temp`.

- `removeRunFolder(dir: string, base: string)` returns `string | null`. It returns `null` when
  the folder is gone; otherwise it returns the reason.
  ```js
  function removeRunFolder(dir, base) {
    // A recursive delete only of a folder this run made: a direct child of the base whose
    // name has the fixed start. Never the base, never the home folder, never anything else.
    if (path.dirname(dir) !== base || !path.basename(dir).startsWith(CHECK_TEMP_PREFIX)) {
      return 'not a run folder VERIFY made, so it was left in place';
    }
    try {
      safeFs.rmSync(dir, { recursive: true, force: true, maxRetries: 2 });
    } catch (e) {
      return errorCode(e);
    }
    return safeFs.existsSync(dir) ? 'it was still there after removal' : null;
  }
  ```
  `maxRetries: 2` retries an `EBUSY`/`EPERM` (Windows holding a file open) twice, with Node's
  default 100 ms linear back-off, before giving up.

- `openCheckTemp()` returns a `CheckTemp` (add the JSDoc `@typedef`):
  `{ dir: string|null, base: string|null, home: string, shown: string, note: string|null }`.
  It never throws. Every failure becomes the fallback, today's behaviour, with a note. Steps,
  in order:
  1. `home = os.homedir()` inside `try`. In the `catch (e)`, record `lookupCode = errorCode(e)`.
     Write a comment there: the lookup throws for an account with no home entry (a container
     with an unlisted user id), and that is not a verdict.
  2. The fallback builder is
     `fallback(reason) => ({ dir: null, base, home, shown: shownTempFolder(os.tmpdir(), home), note: `${reason}, so the checks ran with the inherited temp folder.` })`.
  3. When `!home`, use the reason `VERIFY could not make its own temp folder because this process has no home folder` plus ` (${lookupCode})` when there is one.
  4. When `!path.isAbsolute(home)`, use the reason `VERIFY could not make its own temp folder because the home folder this process reports is not an absolute path`.
     This stops a folder being made relative to CTOC's working folder, which is often the project.
  5. `base = path.join(home, ...CHECK_TEMP_BASE_PARTS)`; `shownBase = shownTempFolder(base, home)`.
     If `unsafeTempWord(base)` gives a word, use the reason `VERIFY did not make its own temp folder because the home folder's path contains ${word}, a word CTOC's record protection refuses when it cannot run`.
     Nothing is created.
  6. `safeFs.statSync(home)` inside `try`. If it throws, use the reason `VERIFY could not make its own temp folder ${shownBase} because the home folder does not exist or cannot be read (${errorCode(e)})`.
     If it is not a directory, use `… because the home folder is not a folder`. The home
     folder itself is NEVER created.
  7. `safeFs.mkdirSync(base, { recursive: true })` inside `try`. If it throws, use the reason `VERIFY could not make its own temp folder ${shownBase} (${errorCode(e)})`.
  8. `realBase = safeFs.realpathSync(base)` inside `try`. If it throws, use the reason `VERIFY could not read the real path of ${shownBase} (${errorCode(e)})`.
     If `unsafeTempWord(realBase)` gives a word, use `VERIFY did not use ${shownBase} because its real path contains ${word}, a word CTOC's record protection refuses when it cannot run`.
  9. Loop `attempt = 1 .. CHECK_TEMP_TRIES`:
     - `dir = safeFs.mkdtempSync(path.join(base, CHECK_TEMP_PREFIX))` inside `try`. If it throws, use the reason `VERIFY could not make a run folder in ${shownBase} (${errorCode(e)})`.
       Node's `mkdtemp` makes the folder with mode 0700 on Linux and macOS.
     - `word = unsafeTempWord(dir) || unsafeTempWord(path.join(realBase, path.basename(dir)))`.
       That is the path as built and its real path. The real path needs no second system call:
       `mkdtemp` makes a real folder, not a link, directly in `base`.
     - With no word, return `{ dir, base, home, shown: shownTempFolder(dir, home), note: null }`.
     - Otherwise remember `lastWord = word`. Call `removeRunFolder(dir, base)`, and push
       `${shownTempFolder(dir, home)} (${reason})` onto `leftBehind` when it returns a reason.
  10. After the loop, use the reason `VERIFY tried ${CHECK_TEMP_TRIES} fresh names in ${shownBase} and each held a word CTOC's record protection refuses when it cannot run (the last: ${lastWord})`,
      plus `; it could not remove ${leftBehind.join(', ')}` when that list is not empty.

  Every `catch` body holds a statement: an assignment or a `return`. None is empty (see the
  fence note below). If the function grows past about 60 lines, split steps 1-8 into a private
  `checkTempBaseFor(home)` that returns `{ base, realBase, shownBase }` or `{ reason }`. The
  behaviour is the same either way.

- `closeCheckTemp(temp)` returns nothing, and it never throws.
  ```js
  function closeCheckTemp(temp) {
    if (!temp.dir) return;
    const trouble = removeRunFolder(temp.dir, temp.base);
    if (trouble) {
      temp.note = `VERIFY could not remove this run's temp folder ${temp.shown} (${trouble}); `
        + 'remove it by hand when no VERIFY is running.';
    }
  }
  ```

- `noteTempFolder(checks, temp)` writes the record fields.
  ```js
  function noteTempFolder(checks, temp) {
    for (const key of ['lint', 'types', 'tests']) {
      const c = checks[key];
      if (!c || c.ran !== true) continue;
      c.tempFolder = temp.shown;
      if (temp.note) c.tempFolderNote = temp.note;
    }
  }
  ```

#### Changes to existing functions

- **`checkEnvWith(dir)` (line ~349) becomes `checkEnvWith(binDir, tempDir)`, and returns
  `NodeJS.ProcessEnv | undefined`.**
  ```js
  function checkEnvWith(binDir, tempDir) {
    if (!binDir && !tempDir) return undefined;
    const env = { ...process.env };
    // On Windows a variable may be spelled in any letter case (`Path`, `Temp`), and Node passes
    // only one of several keys that differ in letter case, so the existing key is reused.
    const keyFor = (name) => (process.platform === 'win32'
      ? (Object.keys(env).find((k) => k.toUpperCase() === name) || name)
      : name);
    if (binDir) {
      const key = keyFor('PATH');
      env[key] = env[key] ? `${binDir}${path.delimiter}${env[key]}` : binDir;
    }
    if (tempDir) {
      for (const name of TEMP_VARIABLES) env[keyFor(name)] = tempDir;
    }
    return env;
  }
  ```
  The PATH arm is the venv slice's rule, character for character: the empty-PATH case still
  gives exactly `binDir`. Update the JSDoc. Both parameters are optional, and with neither the
  result is `undefined`.

- **`runFallbackChecks(projectPath)` (line ~720) is renamed `runFallbackChecksWith(projectPath, tempDir)`.**
  Change only these things:
  - Line ~734, `const checkEnv = venv ? checkEnvWith(venv.dir) : undefined;`, becomes
    `const checkEnv = checkEnvWith(venv ? venv.dir : null, tempDir);`.
  - The comment above it is replaced by: "One environment for every probe and every check of
    this run: the venv tool folder first on PATH (a Python project) and the run's own temp
    folder in TMPDIR, TMP and TEMP. With neither, no env is passed, exactly as before."
  - The JSDoc gains `@param {string|null} tempDir`.

  Everything else stays exactly as it is: every `toolExists(..., checkEnv)`, every
  `evalCategory(..., checkEnv)`, `applyTestQualityContracts`, the `firstOnPath` loop, and
  `boundCheckOutputs(checks)` as the last statement before `return { checks, errors }`.

- **New `runFallbackChecks(projectPath)`.** Put it directly above `runFallbackChecksWith` and
  keep the exported name. Its JSDoc says what the module docblock paragraph says, below.
  ```js
  function runFallbackChecks(projectPath) {
    const temp = openCheckTemp();
    let result;
    try {
      result = runFallbackChecksWith(projectPath, temp.dir);
    } finally {
      // After the last check and before the app launch, whatever the outcome: a pass, a
      // failure, a timeout, an overflow, or a throw in this module (which still propagates).
      closeCheckTemp(temp);
    }
    noteTempFolder(result.checks, temp);
    return result;
  }
  ```

- **Module docblock (lines 1-71).**
  - In point 3 of the V1 ordering list, `runFallbackChecks calls boundCheckOutputs LAST` becomes
    `runFallbackChecksWith (inside runFallbackChecks) calls boundCheckOutputs LAST`.
  - After the VENV paragraph, add one paragraph headed `TEMP — A TEMP FOLDER OF ITS OWN.` It
    says: each run of the fallback checks makes a fresh folder
    `~/.cache/ctoc-check-temp/run-XXXXXX` and gives it to the checks' child processes ONLY,
    through `TMPDIR`, `TMP` and `TEMP`, in the same environment copy as the venv `PATH`. It is
    used for the probe and the run alike. It is removed after the last check and before the
    app launch, whatever the outcome. Its stored form is recorded as `tempFolder` on each check
    that ran. If the folder cannot be made, has an unsafe word in its path, or cannot be
    removed, the checks run as before and `tempFolderNote` says why. The verdict and the
    summary never change for it. The CTOC process's own environment is never written. The
    `ctoc quality` probe and the app launch do not get the folder.

#### What must stay exactly as it is (fences that count this file)

`.ctoc/false-green-baseline.json` holds three keys for this file:
`src/lib/step-13-verify.js:silent-catch:runVerify`, `…:unbounded-capture:r` and
`…:unbounded-capture:output`. `tests/false-green-fence.test.js` requires the live finding
count to equal `maxFindings`, so this edit must neither add nor remove a finding:
- no empty `catch` body: each new `catch` assigns or returns;
- no new `execSync`/`spawnSync` call, and no `maxBuffer:` key added to an existing one;
- the bindings `r` (in `toolExists`) and `output` (in `tryCommand`) are untouched;
- no new function named `parse…`, `extract…`, `count…` or `read…`. The names above are
  `errorCode`, `unsafeTempWord`, `shownTempFolder`, `removeRunFolder`, `openCheckTemp`,
  `closeCheckTemp`, `noteTempFolder` and `runFallbackChecksWith`.

No export is added (`tests/export-reachability.test.js`), and no file is added
(`tests/reachability.test.js`, the `CLAUDE.md` counts).

#### Dependencies
- `require('os')` (new; Node built-in) for `homedir` and `tmpdir`.
- `require('./safe-fs')` (already imported) for `statSync`, `mkdirSync`, `realpathSync`,
  `mkdtempSync`, `rmSync` and `existsSync`. All six are exported by `src/lib/safe-fs.js:219-223`.
- `require('path')` (already imported).

#### Called by (unchanged chain)
- `runFallbackChecks` <- `runVerify` (`src/lib/step-13-verify.js:149`) <- `persistVerifyResult`
  (`:1021`) <- `completeExecution` (`src/lib/actions.js:1378`).

#### Data flow
```text
os.homedir() -> checks (absolute, neutral, exists, base makeable, real path neutral) -> base
base -> mkdtempSync(base/run-) -> dir (path as built and real path neutral, up to 3 tries) | fallback note
dir + venv dir -> checkEnvWith -> ONE env copy (PATH first entry, TMPDIR = TMP = TEMP = dir) -> every probe and check
checks -> applyTestQualityContracts (full output) -> boundCheckOutputs -> finally: removeRunFolder(dir)
temp.shown (~ form) + temp.note -> tempFolder / tempFolderNote on each check that ran -> persisted record
process.env -> read once by the copy, never written
```

#### Error handling
- Every failure to make or check the folder becomes the fallback: the checks run exactly as
  today, `tempFolder` names the inherited `os.tmpdir()`, and `tempFolderNote` says why with an
  error code. It is never silent and never a verdict.
- A failed removal never changes the verdict. The note names the folder and the reason, and
  says it can be removed by hand.
- A throw inside the checks still propagates out of `runVerify` as today:
  `completeExecution` (`src/lib/actions.js:1379-1384`) prints it and Gate 3 fails closed on the
  missing record. The `finally` removes the folder first.

#### Cross-platform notes
- `path.join`, `path.relative`, `path.isAbsolute`, `path.sep` and `path.delimiter` only. The `/`
  in the stored form is a display label, never used as a path.
- `os.homedir()` (from `HOME` on Linux and macOS, `USERPROFILE` on Windows). All three of
  `TMPDIR`, `TMP` and `TEMP` are set, because Node reads `TMPDIR` on Linux and macOS and
  `TEMP`/`TMP` on Windows.
- On Windows an existing `Temp`/`Tmp`/`Path` key keeps its spelling.
- `rmSync` `maxRetries` covers Windows `EBUSY`.

### Wiring — the live call sites

No new module and no new export. The new private helpers are called from `runFallbackChecks`,
which is reached on every completed build:
- `/ctoc:start` runs `src/commands/start.js`, which calls `route(...)` (`src/commands/start.js:966`).
- `route` (`src/lib/menu-screens.js:3345`) dispatches `task complete` to `taskComplete`
  (`src/lib/menu-screens.js:3305`, defined at `:2661`).
- `taskComplete` calls `completeTaskPlan` (`src/lib/menu-screens.js:2717`; defined at
  `src/lib/actions.js:1688`).
- `completeTaskPlan` calls `completeExecution` (`src/lib/actions.js:1732`, defined at `:1328`).
- `completeExecution` calls `persistVerifyResult(root, planSlug)` (`src/lib/actions.js:1378`).
- `persistVerifyResult` calls `runVerify` (`src/lib/step-13-verify.js:1021`). `runVerify` calls
  `runFallbackChecks` (`:149`), which calls `openCheckTemp`, `runFallbackChecksWith`,
  `closeCheckTemp` and `noteTempFolder`.

The root is the shipped slash command `/ctoc:start`. The record this chain writes is read at the
done gate by `streaming-gate.crossOnEvidence` and `plan-validator`.

### Test Plan

### Tests: `tests/step-13-verify.test.js`
**Action:** MODIFY. It appends one `describe` block (T1-T8), appends V11 to the VENV
`describe`, and adds one line to the VENV helper `writeTool`. No existing assertion changes.
**Framework:** `node:test` + `node:assert/strict`, as in the file. Every project is real on disk,
and every check is a real `npm` subprocess run by the real `runVerify` /
`runFallbackChecks` / `persistVerifyResult`. Fault injection replaces only the outside
boundary: a `safe-fs` call or `os.homedir`. It is always restored in `finally`. This is the
same pattern as `tests/dependency-auditor.test.js:1116` and
`tests/an-unreadable-dependency-list-refuses-the-plan.test.js:174`.

#### Fixture helpers (inside the new `describe('TEMP — VERIFY gives its checks a temp folder of its own', …)`)
- `beforeEach`:
  - Make `scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-temp-scratch-'))` and
    `scratchHome = path.join(scratch, 'home')` (mkdir).
  - Snapshot the keys `HOME`, `USERPROFILE`, `TMPDIR`, `TMP`, `TEMP`, `Temp` and
    `CTOC_VERIFY_TIMEOUT_MS`.
  - Set `HOME` and `USERPROFILE` to `scratchHome`. Every run in this block then makes its folder
    under the scratch folder, never under the real home folder (the parent plan's risk 1).
- `afterEach`: restore each snapshotted key (`delete` when it was undefined), then
  `fs.rmSync(scratch, { recursive: true, force: true })`.
- `baseOf(home) = path.join(home, '.cache', 'ctoc-check-temp')`.
- `expandShown(shown, home)`: a value starting `~/` becomes `path.join(home, ...rest.split('/'))`;
  any other value is returned as it is.
- `RUN_FOLDER_RE = /^~\/\.cache\/ctoc-check-temp\/run-[A-Za-z0-9]{6}$/`.
- `seedTempProbe(behaviour, scripts = ['test'])`:
  - Writes `index.js`, and `package.json` with `main: 'index.js'` (so the app launch is
    honestly not applicable) and one script per name in `scripts`. `test` is `node probe.js test`,
    `lint` is `node probe.js lint`, `typecheck` is `node probe.js typecheck`.
  - Writes `probe.js`, which prints on standard output, one per line:
    - `SEEN_TMPDIR=<os.tmpdir()>`
    - `ENV_TMPDIR=<process.env.TMPDIR or ''>`
    - `ENV_TMP=<…>`
    - `ENV_TEMP=<…>`
    - `ENV_KEYS=<JSON of [key, value] pairs for every env key matching /^(tmpdir|tmp|temp)$/i, sorted>`
  - Then, for the `test` mode only, it acts on `behaviour`:
    - `write`: write `written-by-the-suite.txt` into `os.tmpdir()` and print
      `WROTE=<that path>`. When the write throws, the process exits non-zero (the uncaught
      error).
    - `exitCode`: set `process.exitCode`.
    - `throws`: `throw new Error('the check threw on purpose')`.
    - `sleepMs`: `setTimeout(() => {}, sleepMs)`.
  - `behaviour` is embedded as JSON. No shell quoting is involved.
- `seen(check, key)` returns the value of the `KEY=` line in `check.output`. It asserts that the
  line exists and quotes the output when it does not.
- `hookPattern(name)` reads `src/hooks/protect-records.js` as text, matches
  `^const ${name} = /(.+)/([a-z]*);$` (multiline) and returns `new RegExp(body, flags)`.
  When the line is missing it throws, naming the constant: a renamed pattern is a loud failure.
- `hookWordsOf(name)` turns each `|`-separated alternative of that pattern's source into
  sample text:
  - A `(X)?` group gives two forms: without X and with X.
  - `\.` is unescaped to `.`.
  - If any other regular-expression character is left (`\ ^ $ . * + ? ( ) [ ] { } |`), it calls
    `assert.fail` with the message: "<name> has an alternative this test cannot turn into a
    word: <alt>; add the word to UNSAFE_TEMP_WORDS in src/lib/step-13-verify.js and teach this
    test the new shape".
- `hookRefuses(text)` is true when the text trips the hook's fail rule as written in
  `src/hooks/protect-records.js:1299-1314`:
  - `UNCHECKED_SUSPECT_RE` or `MENU_MENTION_RE` on `JSON.stringify(text)`;
  - `SETTINGS_MENTION_RE` on that JSON text after NFKC;
  - or, with quotes and backslashes removed, `/applysweep/i`, or `/sweep/i` together with
    `/--confirm/i`.

#### Test cases (new `describe`)
1. **T1, a run whose default temp location cannot hold the suite still passes** (the first
   two acceptance criteria). `seedTempProbe({ write: true })`. Make `blocked =
   path.join(scratch, 'not-a-folder')` a FILE. Set `process.env.TMPDIR`, `TMP` and `TEMP` to
   `blocked`, after all setup, and run `res = verify.runVerify(dir)`. Expected:
   - `res.passed === true`, with the errors in the message;
   - `res.checks.tests.ran === true`, and `tempFolder` matches `RUN_FOLDER_RE`;
   - `folder = expandShown(tempFolder, scratchHome)`; `seen(tests,'SEEN_TMPDIR') === folder`;
     `seen(tests,'WROTE') === path.join(folder, 'written-by-the-suite.txt')`;
   - `fs.existsSync(folder) === false`;
   - `process.env.TMPDIR === blocked` (CTOC's own environment untouched).

   **Red before Step 10:** `res.passed === false`; the probe's write throws `ENOTDIR`.
2. **T2, the record names the folder, and the folder is neutral by the hook's words.**
   `seedTempProbe({}, ['lint', 'typecheck', 'test'])`. Run
   `verify.persistVerifyResult(dir, 'temp-folder-record')` and read
   `path.join(dir, '.ctoc', 'state', 'verify', 'temp-folder-record.json')`. Expected:
   - `stored.checks.tests.tempFolder` equals `'~/' + path.relative(scratchHome, seen(...SEEN_TMPDIR)).split(path.sep).join('/')`;
   - `stored.checks.lint.tempFolder` and `stored.checks.types.tempFolder` equal it;
   - no check has `tempFolderNote`;
   - `stored.passed === true`;
   - `hookRefuses(expandShown(tempFolder, scratchHome)) === false`;
   - the summary is exactly `VERIFY passed — ran: lint, typecheck, tests` (unchanged form).
3. **T3, every temp variable names the folder.** `seedTempProbe({})`, then a platform-dependent
   setup and assertion. Neither branch is ever skipped.
   - On `win32`: `delete process.env.TEMP`, then `process.env.Temp = path.join(scratch, 'inherited')`.
   - Elsewhere: `process.env.Temp = 'inherited-Temp'`.

   Run `runVerify`. Expected on every platform: `ENV_TMPDIR`, `ENV_TMP` and `ENV_TEMP` equal
   `SEEN_TMPDIR`, which equals the expanded `tempFolder`. Then:
   - On `win32`: exactly one `ENV_KEYS` entry has a key matching `/^temp$/i`, and its value is
     the folder.
   - Elsewhere: `ENV_KEYS` holds `['TEMP', folder]` AND `['Temp', 'inherited-Temp']`. These are
     two variables on Linux and macOS, and VERIFY writes only the three upper-case names.
4. **T4a-T4f, the folder is removed.** In each case, after the call,
   `fs.readdirSync(baseOf(scratchHome))` deep-equals `[]`. Where the record has `tempFolder`,
   its expanded path does not exist.
   - T4a the tests pass (`{}`): `res.passed === true`.
   - T4b they fail (`{ exitCode: 1 }`): `res.passed === false`, and an error matches `/^Tests failed/`.
   - T4c they time out: `process.env.CTOC_VERIFY_TIMEOUT_MS = '1500'` and `{ sleepMs: 4000 }`.
     Then `tests.passed === false`, and an error matches `/did not complete within the 1500ms budget/`.
     If `SEEN_TMPDIR` was printed before the kill, that folder does not exist.
   - T4d the check throws (`{ throws: true }`): `res.passed === false`; the output includes
     `the check threw on purpose`.
   - T4e VERIFY's own code throws mid-run. Replace `safeFs.existsSync` (the same module object
     `require('../src/lib/safe-fs')`) with a version that throws
     `new Error('injected: the check runner threw')` for a path ending in `go.mod` and
     otherwise calls the original. Then `assert.throws(() => verify.runVerify(dir), /injected/)`,
     and the base exists and is empty. Restore in `finally`.
   - T4f the removal fails. Replace `safeFs.rmSync` with a version that throws
     `Object.assign(new Error('busy'), { code: 'EBUSY' })` for a path inside
     `baseOf(scratchHome)`. Expected:
     - `res.passed === true` (the verdict is the run's alone);
     - `tests.tempFolderNote` includes `tests.tempFolder`, `(EBUSY)` and `remove it by hand`;
     - that folder STILL exists (the note is honest);
     - the summary is unchanged (`VERIFY passed — ran: tests; not applicable: lint, typecheck`).

     Restore in `finally` (the `afterEach` removes the folder).
5. **T5, CTOC's own environment does not change.**
   - Plain project: `before = { ...process.env }`, `runVerify`, then
     `assert.deepEqual({ ...process.env }, before)`.
   - Fallback run: point `HOME`/`USERPROFILE` at `path.join(scratch, 'no-such-home')` first,
     then do the same. The venv case is V1, unchanged.
6. **T6, the name is neutral by the hook's own words (the drift test).**
   - `words` = the case-insensitive de-duplicated union of `hookWordsOf('UNCHECKED_SUSPECT_RE')`,
     `hookWordsOf('MENU_MENTION_RE')` and `hookWordsOf('SETTINGS_MENTION_RE')`. Assert that
     each word trips `hookRefuses` (the sample is real), and that the list has at least 10
     entries (the extraction is non-vacuous).
   - Add five fixed samples, each with the word expected in the note:
     - `VERIFY` gives `"verify"` (letter case);
     - `ſettings.json` gives `"settings.json"` (NFKC);
     - `verify\u0301` gives `"verify"` (raw text, combining mark);
     - `applysweep` gives `"applysweep"`;
     - `sweep--confirm` gives `"sweep" and "--confirm"`.
   - `seedTempProbe({})` once. For each sample, `home = path.join(scratch, \`home-${sample}\`)`
     (mkdir), set `HOME`/`USERPROFILE`, then `res = verify.runFallbackChecks(dir)`. Use
     `runFallbackChecks` so that a `ctoc` command installed on the machine cannot bypass the
     fallback. Expected for each:
     - `tests.ran === true`;
     - `tests.tempFolderNote` includes the expected quoted word (compared in lower case) and
       `inherited temp folder`;
     - `fs.existsSync(baseOf(home)) === false` (nothing made there);
     - `seen(tests,'SEEN_TMPDIR') === os.tmpdir()`, and
       `seen(tests,'ENV_TMPDIR') === (process.env.TMPDIR || '')`. These are the inherited values.

     Each assertion message names the sample.
7. **T8a-T8d, a home folder that cannot hold the base falls back, and says so.** In each:
   `tests.ran === true`, `res.passed === true`, and `tempFolder` equals the stored form of the
   inherited `os.tmpdir()`.
   - T8a: the home folder does not exist (`path.join(scratch, 'no-such-home')`). The note
     matches `/could not make its own temp folder ~\/\.cache\/ctoc-check-temp because the home folder does not exist or cannot be read \(ENOENT\)/`,
     and `fs.existsSync(baseOf(thatHome)) === false`. `npm` itself may create the home folder
     for its log; only the base is asserted.
   - T8b: the home folder cannot be written there. Write a FILE at
     `path.join(scratchHome, '.cache')`. The note matches
     `/could not make its own temp folder ~\/\.cache\/ctoc-check-temp \(([A-Z0-9_]+|an unknown error)\)/`.
     This is chosen over a read-only folder because it fails the same way as root and on Windows.
   - T8c: no home folder. Replace `os.homedir` (the same module object as `require('node:os')`)
     three times, restoring in `finally`:
     1. `() => ''` gives a note matching `/because this process has no home folder, so the checks ran/`;
     2. a function throwing `{ code: 'ENOENT' }` gives `/no home folder \(ENOENT\)/`;
     3. `() => 'relative-home'` gives `/not an absolute path/`, and
        `fs.existsSync(path.join(process.cwd(), 'relative-home')) === false`.
   - T8d: the name tries. Replace `safeFs.mkdtempSync`, restoring in `finally`, in three ways:
     1. The first call makes and returns `${prefix}verify1` (with real `fs.mkdirSync`); later
        calls use the original. The folder used then matches `RUN_FOLDER_RE`, there is no note,
        and `run-verify1` no longer exists.
     2. Every call makes `${prefix}verify${n}`. The note matches `/tried 3 fresh names/` and
        includes `"verify"`, and the base is empty (all three removed).
     3. Every call makes `path.join(scratch, \`elsewhere-verify${n}\`)`, a folder OUTSIDE the
        base. The note includes `not a run folder VERIFY made, so it was left in place`, and all
        three `elsewhere-verify*` folders STILL exist: VERIFY never deletes outside its base.

#### Test cases (VENV `describe`)
- **Helper change in `writeTool`:** in the non-`--version` branch, add the line
  `'TMPDIRFULL=' + (process.env.TMPDIR || '') + '\\n' +` directly after the `PATHFULL=` line.
  Put a comment over it with the three-part reason Operating Lesson 14 asks for:
  - the outside contract is the child's environment;
  - the helper changes so that a venv run's temp folder can be seen;
  - a venv run whose tools are not given the run's folder now fails V11, and no V1-V10
    assertion changes.
- **V11, a venv project gets the folder and the venv PATH in one environment.**
  - Save `HOME`/`USERPROFILE` and point them at a fresh `fs.mkdtempSync(path.join(tools, 'home-'))`.
  - `pyproject()`; `writePythonTools(venvBin, 'dotvenv')`; `process.env.PATH = emptyBin`; `runVerify`.

  Expected for each of lint, types and tests:
  - `pathLine(c) === \`${venvBin}${path.delimiter}${emptyBin}\``;
  - `firstOnPath === \`.venv/${binName}\``;
  - `tempFolder` matches `RUN_FOLDER_RE`;
  - the `TMPDIRFULL=` line equals the expanded `tempFolder`.

  `res.passed === true`, and the base under that home is empty afterwards. Restore
  `HOME`/`USERPROFILE` in `finally`.

**Red before Step 10:** T1, T2, T3, T4a-T4f, T6, T8a-T8d and V11. T4e is red because the base
does not exist yet. **Green before and after (guards):** T5 and V1-V10.

#### Existing suites that must stay green unchanged
- `tests/step-13-verify-coverage.test.js` fakes `child_process` and ignores the options
  (`:104`, `:133`). The new folder is made and removed through the real `safe-fs`, and no test
  there deep-equals a whole check object (search `deepEqual|deepStrictEqual` over the nine
  VERIFY test files: only `errors` arrays and unrelated objects are compared).
- `tests/verify-parses-full-output.test.js`, `tests/lib-quality2-batch.test.js` and
  `tests/verify-fails-loudly.test.js` call `runFallbackChecks`/`tryCommand`/`tryCommands` with the
  same arguments as before.
- `tests/ctoc-audit-w05-verify-evidence.test.js:123` deep-equals `result.errors`. Notes are
  never errors.

#### Coverage targets
- Every new branch is run by T1-T8 and V11 on Linux, with three exceptions:
  - the `realpathSync`-throws branch of step 8;
  - the `mkdtempSync`-throws branch of step 9;
  - the "home is not a folder" arm of step 6.

  These are a few lines. Step 14 reports the module's line coverage, and the suite floor
  (`.ctoc/coverage-baseline.json` `minPct`, 99) must hold. New code is at or above 80%.

### Security Review
- [x] **Recursive delete:** `rmSync(recursive)` only runs on a folder that is a direct child of
  the base and starts with `run-` (`removeRunFolder` guard, proven by T8d.3). It never runs on
  the base, the home folder, or the project. A link put in place of the run folder is removed
  as a link, and its target is never followed.
- [x] **Path traversal / location:** the home folder comes from `os.homedir()`, the user's own.
  A relative home is refused (T8c.3), so no folder is ever made relative to the working folder.
  The home folder itself is never created (T8a).
- [x] **Permissions:** the run folder is made by `mkdtemp` (mode 0700 on Linux and macOS), so
  other users of the machine cannot read or plant files in it.
- [x] **Input validation:** every path goes through `safe-fs` (non-empty, no NUL). The only text
  checked is paths. No command string is built from a path.
- [x] **No secrets or personal data stored:**
  - The record holds the `~` form, and notes hold error CODES, never error messages (which
    carry absolute paths and user names).
  - One fallback (no home folder known) stores the inherited `os.tmpdir()` as an absolute path.
    On Windows that path can contain the account name. This is accepted as a rare,
    already-broken setup and is named here.
- [x] **Process environment:** `process.env` is copied, never assigned (T5, V1). Step 11 confirms
  by search.
- [x] **Prototype pollution:** the copy is a spread of `process.env`. The only keys written are
  `PATH` and the three temp names, or their existing spellings.
- [x] **Command injection:** no new `exec`/`spawn` and no new shell string.
- [x] **Lint rules:** filesystem access goes through `safe-fs` only. The one new regular
  expression, `/["'\\]/g`, is a literal and is not backtracking.

### Architecture checks
| Check | Result |
|---|---|
| Dependency direction | lib only: `os`, `path`, `safe-fs`. No hook or command is imported; the hook's words are mirrored, and a test guards the mirror |
| Interface segregation | `checkEnvWith` takes the two folders it uses; `removeRunFolder` takes the folder and its base |
| Open/closed | the old body runs unchanged inside a wrapper; one line in it changes |
| Test independence | each case makes its own scratch home and restores every env key and patched function |
| Cross-platform | `path.*` and `os.*` only; Windows key spelling kept; `maxRetries` for `EBUSY` |

## Implementation Order
1. MODIFY `tests/step-13-verify.test.js`: the new `describe` (T1-T8), the `writeTool` line and
   V11, seen red (Step 8). It depends on nothing new.
2. MODIFY `src/lib/step-13-verify.js`, in this order:
   - `require('os')` and the constants;
   - `errorCode`, `unsafeTempWord`, `shownTempFolder` and `removeRunFolder`;
   - `openCheckTemp`, `closeCheckTemp` and `noteTempFolder`;
   - the widened `checkEnvWith`;
   - the rename to `runFallbackChecksWith` and the new `runFallbackChecks`;
   - the docblock (Step 10). This depends on step 1 being red.

## Acceptance Criteria Mapping

| Criterion (parent plan) | Implemented in | Test case |
|---|---|---|
| The failures are seen first: the fixture run with an unusable `TMPDIR` is recorded `passed: false` on the unchanged tree | (no code; Step 8 red run) | T1 red, recorded in Step 8 |
| A run whose default temp location cannot hold the suite still passes | `openCheckTemp`, `checkEnvWith(…, tempDir)` | T1 |
| The real case in this sandbox (whole suite, `TMPDIR` unset, `passed: true`, coverage at or above the floor, 0 skipped, folder under `~/.cache/ctoc-check-temp`) | the whole chain | the record written by the menu's completion after this build (Step 16), never by hand |
| The record names the folder (tests, lint, typecheck) | `noteTempFolder`, `shownTempFolder` | T2 |
| Every temp variable names the folder; Windows key spelling | `checkEnvWith` `keyFor` | T3 |
| The folder is removed: pass, fail, timeout, a check throws; a failed removal is named and does not change the verdict | `runFallbackChecks` `finally`, `closeCheckTemp`, `removeRunFolder` | T4a-T4f |
| CTOC's own environment does not change (plain, venv, fallback) | `checkEnvWith` copies | T5, V1 |
| The venv behaviour is unchanged apart from the temp folder | `checkEnvWith` PATH arm unchanged | V1-V10 unchanged; V11 |
| The name is neutral by the hook's own words; an ordinary home's folder matches none of the patterns | `UNSAFE_TEMP_WORDS`, `unsafeTempWord` | T6 (drift), T2 |
| A home folder that cannot hold the base falls back and says why | `openCheckTemp` steps 3-8 | T8a-T8c |
| Up to three tries for a neutral name, then fall back | `openCheckTemp` step 9-10 | T8d |
| The hook is untouched | (no change to `src/hooks/protect-records.js`) | Step 11 diff check |
| No test is weakened | only an added helper line, with the Lesson 14 reason | Step 11 diff review |
| The whole gate passes | all of the above | Step 14 |

## Risk Mitigations

| Risk | Mitigation | Where |
|---|---|---|
| Test runs of VERIFY write under the home folder of the machine running the suite | The new tests point `HOME`/`USERPROFILE` at a scratch folder. Step 14 records how many folders are left under the real `~/.cache/ctoc-check-temp` after the whole run (0 expected) | new `describe` `beforeEach`; Step 14 |
| A CTOC test assumes its temp folder lies outside the home folder | Step 14 reports any such failure by name and does not fix it here | Step 14 |
| The home folder is missing, unwritable, or relative | Fallback to today's behaviour with a `tempFolderNote` that gives the reason and an error code | `openCheckTemp`; T8a-T8c |
| Removal races a timed-out run, or Windows holds a file open | `rmSync` `maxRetries: 2`. A failed removal is named in the note and never changes the verdict | `removeRunFolder`; T4c, T4f |
| A recursive delete hits the wrong folder | It only removes a direct child of the base named `run-…` | `removeRunFolder`; T8d.3 |
| Folders left by killed runs | A fixed prefix inside one CTOC-named base makes them easy to find. No automatic sweep (out of scope) | `CHECK_TEMP_PREFIX`; module docblock |
| The hook's word list changes and VERIFY falls out of step | The drift test reads the hook's source and fails on an uncovered word or an unreadable shape | T6 |
| The fence counts this file | No empty catch, no new spawn, no parser-named function, no export | Step 9 baseline run; Step 14 |
| Other plans move line numbers | `depends_on` both review-stage slices; tests named by label; re-read in Step 9 | frontmatter; Step 9 |

## Decisions Taken Under Ambiguity

1. **The folder is made at the start of `runFallbackChecks`, before the project is inspected,**
   so a throw anywhere in the checks still passes through the `finally`. A project with no
   toolchain makes and removes one empty folder. That costs a few system calls.
2. **The children get the path as built, not its real path.** Both are checked for words. The
   built path is what `os.tmpdir()` returns in the child, and the one the `~` form is computed
   from.
3. **The real path of the run folder is computed (`realpath(base)` + its name), not looked up.**
   `mkdtemp` makes a real folder directly in the base, so the result is the same, and there is
   no branch that cannot be tested.
4. **The word rule is stricter than the hook in two lossless ways.** Every word is compared
   ignoring letter case (`MENU_MENTION_RE` is case-sensitive), and the sweep confirmation's
   words (`applysweep`, or `sweep` together with `--confirm`) are refused too. The parent plan's
   fact 3 named three patterns. The hook's fail rule (`src/hooks/protect-records.js:1308-1313`)
   also refuses a background agent's call on the sweep words, so leaving them out would leave a
   gap. A stricter rule can only cause a fallback, never a refusal.
5. **A relative home folder is refused like a missing one.** Making
   `relative-home/.cache/ctoc-check-temp` relative to CTOC's working folder would put it inside
   the project.
6. **"A check throws" is tested both ways:**
   - the check's own program throws (T4d: an uncaught error, a failed check, the folder removed);
   - VERIFY's own code throws mid-run (T4e: the throw still propagates as today, the folder is
     removed).
7. **"Cannot be written" is tested with a file where `.cache` should be (T8b),** not with a
   read-only folder. A read-only folder does not stop root, and Windows ignores the mode, so the
   test would pass or fail by who runs it.
8. **The drift test runs `npm test` once per word, about 26 runs.** That is several seconds of
   this file's time. A shim-based `pytest` would be faster but needs executable fixtures and
   the noexec probe. Step 12 measures the time and may switch only if the result stays
   identical.
9. **The hook's patterns are read by a small helper written in each test file that needs them**
   (here, and in slice 2). The alternative, a shared helper file, would be a file that neither
   slice declares. It is about ten duplicated lines.
10. **No project template applies.** The parent plan declares no project type: this is CTOC's own
    library code, so the stack, template and production-readiness steps do not apply.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [x] Record the starting state in `## Execution Record`: `node --version`, `npm --version`,
  and `git -C /projects/ctoc/ctoc status --porcelain -- src/lib/step-13-verify.js tests/step-13-verify.test.js`.
  Both files are expected to show as modified, holding the uncommitted work of the venv and
  clean-machine slices. Build on it; do not revert it.
- [x] Write the new `describe` (T1-T8), the `writeTool` line and V11, exactly as in the Test
  Plan.
- [x] Run `node --test tests/step-13-verify.test.js` before any source change, and record the
  result per test.
  - T1, T2, T3, T4a-T4f, T6, T8a-T8d and V11 must fail.
  - T5, V1-V10 and the existing X3 cases must pass.
  - Quote T1's record (`passed: false`, and the `ENOTDIR` in the probe's output). This is the
    "failures seen first" fixture run.
  - A case in the red set that passes does not test the change: fix the test, not the source.
  - Any other failing test: report it with its message and fix nothing under this plan.

### Step 9: PREPARE
- [x] Re-read `src/lib/step-13-verify.js` and confirm the cited lines: requires ~73-76,
  `checkEnvWith` ~349, `runFallbackChecks` ~720 with `checkEnv` at ~734, `runVerify` ~149, and
  `persistVerifyResult` ~1021. Where a line has moved, use the current text and note it.
- [x] Read `.ctoc/false-green-baseline.json`: confirm the three keys for this file and
  `maxFindings`. Run `node --test tests/false-green-fence.test.js tests/export-reachability.test.js`
  once now, so their green starting state is recorded.
- [x] Confirm by search that only `src/lib/step-13-verify.js` calls `checkEnvWith` (pattern
  `checkEnvWith` over `src/` and `tests/`). Quote the pattern and the number of matching files.

### Step 10: IMPLEMENT
- [x] `src/lib/step-13-verify.js`:
  - `require('os')`;
  - `TEMP_VARIABLES`, `CHECK_TEMP_BASE_PARTS`, `CHECK_TEMP_PREFIX`, `CHECK_TEMP_TRIES` and
    `UNSAFE_TEMP_WORDS` (with its comment);
  - `errorCode`, `unsafeTempWord`, `shownTempFolder`, `removeRunFolder`, `openCheckTemp`,
    `closeCheckTemp` and `noteTempFolder`;
  - `checkEnvWith(binDir, tempDir)`;
  - the rename to `runFallbackChecksWith(projectPath, tempDir)` with its one changed line;
  - the new `runFallbackChecks`;
  - the docblock change in point 3 and the `TEMP — A TEMP FOLDER OF ITS OWN.` paragraph.
- [x] `tests/step-13-verify.test.js`: only the fixes Step 8's red run showed. No assertion is
  weakened.

### Step 11: REVIEW
- [x] The reviewer confirms, by reading:
  - `process.env` is never assigned in `src/lib/step-13-verify.js` (search
    `process\.env(\.|\[)[^=]*=[^=]` in that file returns no match);
  - with no venv and no folder, no `env` key reaches `spawnSync`/`execSync`;
  - the probe and the run get the same `checkEnv`;
  - `boundCheckOutputs` is still the last statement of `runFallbackChecksWith`;
  - every new `catch` body holds a statement;
  - `removeRunFolder` is the only `rmSync` call, and its guard comes before it;
  - the fail-closed rule's condition and `buildSummary` are unchanged.
- [x] `git diff -- src/hooks/protect-records.js` is empty.
- [x] Diff review of `tests/step-13-verify.test.js`: the only removed or changed lines belong
  to the `writeTool` helper's added output line, which carries the Lesson 14 reason. No
  `assert` line is removed or loosened.

### Step 12: OPTIMIZE
- [x] Confirm the cost per run: one `homedir`, one `stat`, one `mkdir -p`, one `realpath`, one
  `mkdtemp`, one recursive remove and one `exists`. The environment copy is built once per run.
- [x] Record the time of one whole-suite run folder's removal: time the `rmSync` of a folder
  that holds what the Step 14 suite left. Record the durations of `tests/step-13-verify.test.js`
  as a whole, and of T6 and T4c. If T6 alone exceeds 15 s, a faster single-check fixture may
  replace `npm test` in T6, but only if every assertion stays.

### Step 13: SECURE
- [x] The security scanner checks the new folder handling against these cases:
  - a home folder that is a link (judged by its real path);
  - a relative home folder (refused);
  - a home folder that does not exist (never created);
  - `.cache` as a file (falls back);
  - a run folder replaced by a link before removal (the link is removed, its target is not
    followed);
  - `mkdtemp` returning a folder outside the base (never deleted, T8d.3);
  - the stored record and notes holding no error message and no absolute home path.

### Step 14: VERIFY
- [x] Count the entries under the real `~/.cache/ctoc-check-temp` (0 if it does not exist)
  before the run.
- [x] Run `npm test` with `TMPDIR` set to a fresh, empty folder on disk (for example under the
  home folder), not the 256 MB `/tmp`. The required result is 0 failures, 0 skipped, and
  coverage at or above `.ctoc/coverage-baseline.json` `minPct`. Also run `npx eslint . --max-warnings 0`
  and `npm run typecheck`.
- [x] Name these files in the record as run and green:
  - `tests/step-13-verify.test.js`, `tests/step-13-verify-coverage.test.js`,
    `tests/verify-fails-loudly.test.js`, `tests/verify-parses-full-output.test.js`;
  - `tests/ctoc-audit-w05-verify-evidence.test.js`, `tests/lib-quality2-batch.test.js`;
  - `tests/last-mile-integration.test.js`, `tests/last-mile-drives-entry-point.test.js`;
  - `tests/false-green-fence.test.js`, `tests/golden-corpus-fence.test.js`;
  - `tests/reachability.test.js`, `tests/export-reachability.test.js`;
  - `tests/typecheck.test.js`, `tests/doc-counts.test.js`.
- [x] Count the entries under `~/.cache/ctoc-check-temp` again and record both numbers. The
  expectation is no more than before. Any extra entry is named, with its contents listed.
- [x] Report any test that fails because its temp folder now lies inside the home folder, by
  name and message. Do not fix it under this plan.

### Step 15: DOCUMENT
- [x] Add JSDoc on every new constant and function, the `CheckTemp` typedef, the widened
  `checkEnvWith`, the renamed `runFallbackChecksWith` and the new `runFallbackChecks`.
- [x] Make the module docblock changes from Step 10.
- [x] No count in `CLAUDE.md` moves, because no file is created.

### Step 16: FINAL-REVIEW
- [x] Check each row of the Acceptance Criteria Mapping against its passing test.
- [x] Quote Step 8's red run (with T1's `passed: false`) and Step 14's green run in the build
  record.
- [x] Confirm that T5 and V1-V10 were green before and after.
- [x] The real-case criterion is proven only by the record that the menu's completion writes
  after this build: `.ctoc/state/verify/<this slice's slug>.json`, run with `TMPDIR` unset. It
  must show:
  - `passed: true`;
  - a coverage figure at or above the floor;
  - `skipped: 0`;
  - a `tempFolder` under `~/.cache/ctoc-check-temp`.

  The build does not write or edit that record. If it fails, this slice is not done.


## Deferred Questions

_Written by the Iron Loop integrator (src/lib/iron-loop.js), which performs NO
quality evaluation. These entries are the integrator's own report on itself, not
findings from a critic that read this plan._

- **evaluation**: NOT EVALUATED — no automated critique was performed on this plan. The refinement loop appended the Steps 8-16 template and assessed nothing. (The scores this step used to report were computed from that same template, not from the plan.) A human or a real critic must review this plan before it is built.

## Execution Record

_Written by the executor (task t22). This section is excluded from the approval hash._

- Start (Step 8): node v22.23.1, npm 10.9.8. `git status --porcelain` for the two declared files: both `M`, holding the uncommitted venv and clean-machine work, which was kept intact.
- Red run (Step 8, `node --test tests/step-13-verify.test.js` before any source change): 40 tests, 25 pass, 15 fail. The 15 were exactly V11, T1, T2, T3, T4a-T4f, T6, T8a-T8d. T5 (both cases), V1-V10 and the X3 cases passed. T1's record: `passed: false`, error `Tests failed: ... Error: ENOTDIR: not a directory, open '<scratch>/not-a-folder/written-by-the-suite.txt'` (the probe could not write into the unusable `TMPDIR`).
- Step 9: cited places re-read; the plan's line numbers had moved a little (the requires, `checkEnvWith`, `runFallbackChecks`), the current text was used. `.ctoc/false-green-baseline.json` holds the three keys for this file (`silent-catch:runVerify`, `unbounded-capture:r`, `unbounded-capture:output`); `maxFindings` is 205. Deviation: the fence tests were first run AFTER the source change, not before it, so no pre-change green run was recorded; after the change `tests/false-green-fence.test.js`, `tests/export-reachability.test.js` and `tests/reachability.test.js` pass (64 tests). Search: pattern `checkEnvWith` over `src` and `tests` matches 1 file (`src/lib/step-13-verify.js`).
- Step 10-11: all of the plan's functions were added; `checkEnvWith` widened; `runFallbackChecks` is the wrapper and the old body is `runFallbackChecksWith`. `openCheckTemp` was split with the private `checkTempBaseFor` (the plan allows it). Searches in `src/lib/step-13-verify.js`: `process\.env(\.|\[)[^=]*=[^=]` matches nothing; `rmSync` appears once, in `removeRunFolder`, behind its guard; no new `execSync`/`spawnSync`; every new `catch` body holds a statement. `src/hooks/protect-records.js` has no diff. A first `tsc` run (the typecheck fence) caught `@param {unknown}` on `errorCode`; it is now `{any}`.
- Step 12: per run one `homedir`, one `stat`, one `mkdir -p`, one `realpath`, one `mkdtemp`, one recursive remove and one `exists`. Removing a copy of the folder the whole suite left (14 MB) took about 80 ms. `tests/step-13-verify.test.js` runs in about 11 s as a whole; T6 about 2.9 s, T4c about 1.5 s, so the faster form was not needed and T6 still runs `npm test` per word.
- Step 13: the cases the plan names are covered by tests, not only by reading: relative home (T8c), missing home never created (T8a), `.cache` as a file (T8b), home that is a file (T8e), home that is a link whose real path holds a refused word (T8g), a run folder replaced by a link is removed as a link and its target is untouched (T8i), `mkdtemp` returning a folder outside the base is never deleted (T8d.3), no absolute home path in a note (checked in the fallback helper). Tests added beyond the plan: T8e, T8f, T8g, T8h, T8i (they cover the plan's three named uncovered branches and the link case).
- Step 14 (raw gates, each with a fresh `TMPDIR` under `/home/ctoc/ctoc-tmp`, scratch git config): `npx eslint . --max-warnings 0` clean; `npm run typecheck` 1/1 pass; `npm test`: 13863 tests, 13863 pass, 0 fail, 0 skipped, coverage 99.62% (floor 99), `step-13-verify.js` 99.85% lines; test-gate PASS. Entries under the real `~/.cache/ctoc-check-temp`: 0 before, 0 after. No test failed because its temp folder lay inside the home folder.
- Step 16: T5 and V1-V10 were green before and after. The real-case record is written by the menu's completion after this build.
