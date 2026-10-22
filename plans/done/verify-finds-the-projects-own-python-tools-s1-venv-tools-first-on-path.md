---
iron_loop_verdict: true
iron_loop: true
title: "VERIFY looks in the project's .venv or venv for ruff, mypy and pytest, and puts that folder first on the checks' PATH"
type: implementation
created: 2026-10-22
priority: medium
effort: small
parent_plan: verify-finds-the-projects-own-python-tools
depends_on: none
files:
  - src/lib/step-13-verify.js
  - tests/step-13-verify.test.js
revision: 1
rejection_reason: "Recorded verify failed only because the run used the full /tmp; rerun the completion with the on-dis"
tag: rejected
approved_by: human
approved_at: 2026-10-22T18:39:28.582Z
gate_crossed: review → done
---
# REVISION 1

## Rejection Feedback

Recorded verify failed only because the run used the full /tmp; rerun the completion with the on-disk temp folder.

---


# VERIFY looks in the project's .venv or venv for ruff, mypy and pytest, and puts that folder first on the checks' PATH

Slice 1 of 1 of `plans/implementation/verify-finds-the-projects-own-python-tools.md`. One
slice: the change is one module and its own test file, and the lookup cannot land without
the PATH handling. If it did, VERIFY would find `.venv/bin/ruff` and then run `ruff check .`
on a PATH that does not hold it, and the check would fail to start.

This file changes the gate's own check runner (`src/lib/step-13-verify.js`). The owner
approved that when he approved the functional plan that names this file (`approved_by: human`,
2026-10-22T12:40:54Z). The rule that VERIFY refuses a project where nothing ran
(`no-verifiable-toolchain`) does not change.

## Problem statement

`toolExists(bin, cwd)` (`src/lib/step-13-verify.js:309`) checks for a tool by running
`<bin> --version` through `spawnSync` with no `env` option, so it searches only the CTOC
process's own `PATH`. `runFallbackChecks` (`:655`) adds `ruff check .`, `mypy .` and `pytest` only when
that check succeeds (`:678`, `:686`, `:693`). The commands then run through `tryCommand`
(`:754`, `execSync` with no `env`), which uses the same `PATH`. A uv or venv project keeps its tools in
`<project>/.venv/bin`. That folder is on `PATH` only while the venv is active, so all three
checks read not-applicable, nothing runs, and `runVerify` (`:158-166`) records
`no-verifiable-toolchain`.

## Implementation Details

### Architecture Decision

One environment for the probe and for the run. When the project has a `pyproject.toml` and
a `.venv` (or `venv`) tool folder, `runFallbackChecks` builds one copy of `process.env`
with that folder first on `PATH`. The same copy goes to every `--version` probe and to every
check command of that run. The tool the probe finds is then the tool the check runs: there
is no second lookup that could disagree with the first. Command strings stay `ruff check .`,
`mypy .` and `pytest`, so the recorded `command` fields and every existing assertion on them
stay the same. When there is no such folder, nothing is built. No `env` key reaches
`spawnSync` or `execSync`, so their options are exactly what they are today.

Alternatives set aside:
- Probe `<venv>/bin/ruff` by absolute path and run the absolute path. This changes
  the recorded commands, needs a separate rule for Windows file extensions, and does not
  meet the plan's requirement that the checks run with that folder first on PATH.
- Activating the venv (setting `VIRTUAL_ENV`). The acceptance criteria name only
  PATH, and a venv's console scripts already name their own interpreter on their first line.

### Dependency Graph

```text
src/lib/step-13-verify.js:runFallbackChecks -> projectVenvBin (new, private)
src/lib/step-13-verify.js:runFallbackChecks -> checkEnvWith (new, private)
src/lib/step-13-verify.js:runFallbackChecks -> toolExists (gains env)
src/lib/step-13-verify.js:runFallbackChecks -> evalCategory (gains env)
src/lib/step-13-verify.js:evalCategory -> tryCommands (gains options.env)
src/lib/step-13-verify.js:tryCommands -> tryCommand (options.env passed through)
src/lib/step-13-verify.js:projectVenvBin -> src/lib/safe-fs.js:statSync
src/lib/step-13-verify.js:checkEnvWith -> node:path (path.delimiter)
tests/step-13-verify.test.js -> src/lib/step-13-verify.js:runVerify (real subprocesses)
```

No new module, no new export, no new require. No cycle: the new helpers call only
`safe-fs` and `path`, which the module already requires.

### File: `src/lib/step-13-verify.js`
**Action:** MODIFY
**Purpose:** VERIFY's fallback checks find and run a Python project's own tools from its virtual environment.
**Change Type:** modify-existing (two new private functions, four widened signatures)

#### New private constant and functions (not exported)

Place them just above `toolExists` (line ~300). Do not export them. The export fence
(`tests/export-reachability.test.js`) treats an export with no outside caller as dead
surface, and the tests reach these helpers through `runVerify`.

- `const VENV_DIR_NAMES = Object.freeze(['.venv', 'venv']);` The folder names, in the
  order they are tried.

- `projectVenvBin(projectPath: string)` returns `{ dir: string, shown: string } | null`
  - The tool folder name is `process.platform === 'win32' ? 'Scripts' : 'bin'` (written as
    one expression).
  - For each name in `VENV_DIR_NAMES`, in order:
    `const dir = path.resolve(projectPath, venvName, binName)`. Call
    `safeFs.statSync(dir)` inside `try`. The `catch (e)` body is `stat = null;`, under a comment
    saying which failures it takes in (ENOENT absent, ENOTDIR not a folder on the way, EACCES
    unreadable) and why none of them is a verdict: with no folder found, the lookup is
    exactly today's PATH-only lookup. The catch body is never empty (see the false-green note
    below). Return `{ dir, shown: `${venvName}/${binName}` }` for the first candidate whose
    `stat.isDirectory()` is true.
  - Returns `null` when neither folder is a directory. Never throws for a missing or
    unreadable folder.
  - `dir` is ABSOLUTE (`path.resolve`, not `path.join`). The checks run with
    `cwd: projectPath`, so a relative `PATH` entry would be resolved a second time against
    that folder and point at `<project>/<project>/.venv/bin`. An absolute entry also avoids
    the risk of a relative PATH entry.
  - `shown` is project-relative with `/` separators on every platform (`.venv/bin`,
    `venv/bin`, `.venv/Scripts`). It goes into the stored evidence (see below).
  - Example: a project holding `.venv/bin/` returns
    `{ dir: '/abs/project/.venv/bin', shown: '.venv/bin' }`. A project holding neither folder
    returns `null`. If `.venv/bin` is a regular file and `venv/bin` is a folder, the result
    is the `venv/bin` one.

- `checkEnvWith(dir: string)` returns `NodeJS.ProcessEnv`
  - `const env = { ...process.env };` It is a copy. `process.env` itself is never written.
  - The PATH key: on `win32`, the key of `env` that equals `PATH` ignoring letter case
    (Windows usually spells it `Path`), else `'PATH'`. Elsewhere it is always `'PATH'`. Write
    it as one expression. Why: on Windows Node passes only one of several keys that differ
    only in letter case, so the existing key is replaced instead of a second one being added.
  - `env[key] = env[key] ? `${dir}${path.delimiter}${env[key]}` : dir;`. An empty or missing
    PATH becomes exactly `dir`, never `dir` plus a delimiter. A trailing empty entry would
    mean "the current folder" on Linux and macOS.
  - Example: `PATH=/usr/bin:/bin` with dir `/p/.venv/bin` gives `/p/.venv/bin:/usr/bin:/bin`.
    `PATH=''` gives `/p/.venv/bin`.

#### Changes to existing functions

- **`toolExists(bin, cwd)` (line ~309) becomes `toolExists(bin, cwd, env)`**
  - The options object gains `...(env ? { env } : {})` as its last property. Keep the line
    `const r = spawnSync(bin, ['--version'], {` and every other property (`cwd`,
    `encoding`, `timeout: 15000`, `stdio: ['ignore', 'pipe', 'pipe']`, `shell` on win32)
    exactly as they are.
  - With `env`, Node finds `bin` through `env.PATH` (documented `child_process` behaviour
    when `options.env` is given). On Windows the probe already goes through `cmd.exe`
    (`shell: true`), and `cmd.exe` searches the PATH of the env it was given.
  - JSDoc: add `@param {NodeJS.ProcessEnv} [env] - The environment the check will run with;
    omitted means the CTOC process's own (today's behaviour).`, and change the description
    from "on the shell PATH" to "on the PATH the check will run with".

- **`evalCategory(label, candidates, projectPath, errors)` (line ~340) gains a fifth parameter `env`.**
  It calls `tryCommands(candidates, projectPath, { env })`. JSDoc `@param` added. Nothing
  else in the function changes. V1's ordering comment stays word for word.

- **`tryCommands(commands, cwd)` (line ~862) becomes `tryCommands(commands, cwd, options = {})`.**
  It calls `tryCommand(cmd, cwd, { env: options.env })`. JSDoc `@param {{env?: NodeJS.ProcessEnv}} [options]`.
  Existing callers pass two arguments (`tests/lib-quality2-batch.test.js:386,395`) and
  behave as before.

- **`tryCommand(command, cwd, options = {})` (line ~754).** The `execSync` options object gains
  `...(options.env && typeof options.env === 'object' ? { env: options.env } : {})` as
  its last property. Keep the line `const output = execSync(command, {` and the
  `maxBuffer,` shorthand exactly as they are. JSDoc: add
  `@param {NodeJS.ProcessEnv} [options.env] - Environment for the child; omitted means process.env.`

- **`runFallbackChecks(projectPath)` (line ~655).** After `hasCargoToml`:
  ```js
  // VENV — a Python project's own tools. Looked for only when pyproject.toml marks a
  // Python project; any other project gets no env and runs exactly as before.
  const venv = hasPyproject ? projectVenvBin(projectPath) : null;
  const checkEnv = venv ? checkEnvWith(venv.dir) : undefined;
  ```
  Every `toolExists(...)` call in the function (ruff, golangci-lint, cargo, mypy, go, pytest,
  go, cargo) gets `checkEnv` as its third argument. All three `evalCategory(...)` calls get
  `checkEnv` as their fifth. After `checks.tests = testCheck;` and BEFORE
  `boundCheckOutputs(checks);`:
  ```js
  // The record says which folder was put first on PATH, so a reader can see that the
  // project's own tools, not the global ones, were the first candidates.
  if (venv) {
    for (const key of ['lint', 'types', 'tests']) {
      if (checks[key] && checks[key].ran === true) checks[key].firstOnPath = venv.shown;
    }
  }
  ```
  `firstOnPath` is added only when a venv folder was found. Without one, the check records
  are byte-for-byte what they are today.

- **`runVerify` (line ~160-165), the `no-verifiable-toolchain` message.**
  `'pyproject/ruff/mypy/pytest, '` becomes
  `"pyproject/ruff/mypy/pytest (on PATH and in the project's .venv or venv), "`. The prefix
  `no-verifiable-toolchain:` and the rest of the sentence stay. The pass/fail rule
  (`substantive === 0`) is not touched.

- **Module docblock (lines 1-62).** Add one paragraph headed `VENV — A PYTHON PROJECT'S OWN
  TOOLS.` It says: a pyproject project's `.venv` (then `venv`) tool folder (`bin`, or
  `Scripts` on Windows) is put first on the PATH of the fallback checks' child processes
  only, and used for the probe and the run alike. The CTOC process's own environment is never
  changed. The `ctoc quality` probe and the app launch do not get it. The folder put first is
  recorded as `firstOnPath`.

#### What must stay exactly as it is (fences that count this file)

`.ctoc/false-green-baseline.json` holds three keys for this file:
`src/lib/step-13-verify.js:silent-catch:runVerify`, `…:unbounded-capture:r` (the
`toolExists` probe) and `…:unbounded-capture:output` (the `tryCommand` capture).
`tests/false-green-fence.test.js` requires the number of live findings to EQUAL
`maxFindings`, so the edit must neither add nor remove a finding:
- keep the binding names `r` and `output` and their opening lines;
- do not add a `maxBuffer:` key to either call (that would remove a finding and fail the
  equality test);
- add no empty `catch` block, and no new `execSync`/`spawnSync` capture;
- do not name a new function `parse…`, `extract…`, `count…` or `read…` (the parser-default scan
  looks at functions with those names).

#### Dependencies
- `require('./safe-fs')` (already imported) for `statSync`.
- `require('path')` (already imported) for `resolve` and `delimiter`.

#### Called by (unchanged chain, now with the venv lookup inside)
- `runFallbackChecks` ← `runVerify` ← `persistVerifyResult` (`src/lib/step-13-verify.js:938`)
  ← `completeExecution` (`src/lib/actions.js:1378`).

#### Data flow
```text
projectPath -> hasPyproject? -> projectVenvBin(projectPath) -> {dir, shown} | null
{dir} -> checkEnvWith(dir) -> copy of process.env with dir first on PATH (checkEnv)
checkEnv -> toolExists('ruff'|'mypy'|'pytest'|..., projectPath, checkEnv) -> candidates
candidates + checkEnv -> evalCategory -> tryCommands -> tryCommand -> execSync({..., env})
check records (ran) -> firstOnPath = shown -> applyTestQualityContracts (full output) -> boundCheckOutputs
process.env -> read once by the copy, never written
```

#### Error handling
- Venv folder absent, not a folder or unreadable: treated as absent, and the lookup is
  today's. If the tools are not on PATH either, the run still ends in the loud
  `no-verifiable-toolchain`, which now names `.venv` and `venv`.
- A venv tool that starts and fails (a broken or wrong-version tool) is a REAL failing
  check (`Lint failed: …`), exactly like a global one. Never a skip.
- A venv tool that vanishes between the probe and the run is reported as not run
  (spawn ENOENT or exit 127), exactly as today.

#### Cross-platform notes
- Tool folder `Scripts` on Windows, `bin` elsewhere (the standard venv layout on each).
- `path.resolve` and `path.delimiter` only. No separator is written by hand into a path
  (the `/` in `shown` is a display label, never used as a path).
- Windows PATH key found ignoring letter case; Windows probe through `cmd.exe` (existing
  `shell: true`).

### Wiring — the live call sites

No new module, and no new exported function. The two new private helpers are called from
`runFallbackChecks`, which is reached on every completed build:
- `/ctoc:start` runs `src/commands/start.js`, which calls `route(...)`
  (`src/commands/start.js:966`).
- `route` (`src/lib/menu-screens.js:3345`) calls `taskCommand`, which calls `taskComplete`
  (`src/lib/menu-screens.js:3305`, defined at `:2661`).
- `taskComplete` calls `actions.completeTaskPlan` (`src/lib/menu-screens.js:2717`; defined
  at `src/lib/actions.js:1688`).
- `completeTaskPlan` calls `completeExecution` (`src/lib/actions.js:1732`, defined at
  `:1328`).
- `completeExecution` calls `persistVerifyResult(root, planSlug)` (`src/lib/actions.js:1378`).
- `persistVerifyResult` calls `runVerify`, which calls `runFallbackChecks`, which calls
  `projectVenvBin` and `checkEnvWith`.

The root is the shipped slash command `/ctoc:start`. The evidence this chain writes
(`.ctoc/state/verify/<slug>.json`) is what `streaming-gate.crossOnEvidence`
(`src/lib/streaming-gate.js:736`) and `plan-validator` read at the done gate. That is how a
Python project's plan now reaches done on a real passing run.

### Test Plan

### Tests: `tests/step-13-verify.test.js`
**Action:** MODIFY (append one `describe` block; no existing case changes)
**Framework:** `node:test` + `node:assert/strict`, as in the file. No doubles: the fixture
tools are REAL executables on disk, found through a REAL PATH lookup and run as real
subprocesses by the real `runVerify`. They stand in for the third-party tools (an outside
dependency), never for CTOC logic.

#### Fixture helpers (inside the new `describe`)
- A nested `beforeEach` makes `tools = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-venv-tools-'))`
  holding `empty-bin/` (an empty folder) and `shims/`, and saves `savedPath = process.env.PATH`.
  The nested `afterEach` restores PATH (`delete process.env.PATH` when it was undefined) and
  removes `tools`. The outer `beforeEach`/`afterEach` still make and remove `dir`, the project.
- `const binName = process.platform === 'win32' ? 'Scripts' : 'bin';`
- `writeTool(binDir, name, { origin, exitCode = 0, body })` writes a real executable:
  - The tool's code goes to `path.join(tools, 'shims', `${origin}-${name}.js`)`, OUTSIDE
    every tool folder, so Windows can never pick a `.js` file through its extension list.
    It does this:
    - with the argument `--version`: print `${name} 0.0.0 (fixture)`, exit 0;
    - otherwise: print `FIXTURE ${name} from=${origin}`, then
      `PATHFULL=${process.env.PATH || ''}`, then `body`, each on its own line. When
      `exitCode !== 0`, also write `body` to stderr. Set `process.exitCode = exitCode`
      (never `process.exit`).
  - The launcher: on POSIX, `path.join(binDir, name)` containing
    `#!/bin/sh\nexec "<process.execPath>" "<js>" "$@"\n`, made executable with
    `fs.chmodSync(p, 0o755)`. On win32, `path.join(binDir, `${name}.cmd`)` containing
    `@"<process.execPath>" "<js>" %*\r\n`. Both use node's absolute path, so the fixture
    runs with no node on PATH.
- `writePythonTools(binDir, origin, overrides)` writes `ruff` (body `All checks passed!`),
  `mypy` (body `Success: no issues found in 1 source file`) and `pytest` (body
  `3 passed in 0.01s`). `overrides.pytest` may replace pytest's `exitCode` and `body`.
- `pyproject()` writes `pyproject.toml` with `[project]\nname = "wicks"\n` into `dir`.
- `const venvBin = path.resolve(dir, '.venv', binName)` and
  `const plainVenvBin = path.resolve(dir, 'venv', binName)`.
- PATH is made deterministic: `process.env.PATH = path.join(tools, 'empty-bin')` (or the
  global folder) before `runVerify`. No global ruff, mypy, pytest or `ctoc` can be found, so
  the result does not depend on what the machine has installed. The same pattern is used in
  `tests/quality-agent-coverage-holes.test.js:612-629`.

#### Test cases
1. **V1, venv-only tools are found and run (AC1, AC5).** `pyproject()`;
   `writePythonTools(venvBin, 'dotvenv')`; PATH = empty-bin. Snapshot `before = { ...process.env }`.
   `res = verify.runVerify(dir)`. Expected:
   - `res.method === 'fallback-direct'`;
   - for each of `lint`, `types`, `tests`: `applicable === true`, `ran === true`,
     `passed === true`, and the command is exactly `ruff check .` / `mypy .` / `pytest`;
   - each output includes `from=dotvenv` and the line
     `PATHFULL=${venvBin}${path.delimiter}${emptyBin}`;
   - `firstOnPath === `.venv/${binName}`` on all three;
   - `res.passed === true`, `res.errors` deep-equal `[]`;
   - `assert.deepEqual({ ...process.env }, before)`, and `process.env.PATH === emptyBin`
     (CTOC's own environment untouched).
2. **V2, a failing test in a venv project is a test failure (AC2).** As V1, but pytest
   gets `exitCode: 1` and the body
   `FAILED tests/test_wick.py::test_density - assert 2 == 3\n1 failed, 2 passed in 0.03s`.
   Expected: `res.passed === false`; `tests.ran === true`, `tests.passed === false`; some
   error matches `/^Tests failed: /` and `/1 failed/`; NO error matches
   `/no-verifiable-toolchain/`; lint and types `passed === true`.
3. **V3, no venv and no tools still fails closed (AC3).** `pyproject()` only; PATH = empty-bin.
   Expected: lint, types and tests `applicable === false`; `res.passed === false`; one error
   matches `/no-verifiable-toolchain/` AND `/\.venv/`; no check carries `firstOnPath`.
4. **V4, tools on PATH and no venv: unchanged (AC4).** `pyproject()`;
   `writePythonTools(globalBin, 'global')`, where `globalBin = path.join(tools, 'global-bin')`;
   PATH = globalBin. Expected: all three ran and passed, `from=global`; each output holds
   exactly `PATHFULL=${globalBin}` (the child's PATH is the parent's, nothing put in front);
   no `firstOnPath`; `res.passed === true`.
5. **V5, the project's own tool is preferred over a global one (the plan's risk, pinned).**
   Tools in both globalBin (`global`) and venvBin (`dotvenv`); PATH = globalBin. Expected:
   all three outputs say `from=dotvenv`; `firstOnPath === `.venv/${binName}``.
6. **V6, `venv` without the dot is found too.** Tools only in plainVenvBin (`plainvenv`);
   PATH = empty-bin. Expected: all three ran, `from=plainvenv`,
   `firstOnPath === `venv/${binName}``, `res.passed === true`.
7. **V7, `.venv` wins over `venv`.** Tools in both (`dotvenv`, `plainvenv`); PATH = empty-bin.
   Expected: `from=dotvenv` on all three; PATHFULL starts with `venvBin` and does NOT
   include `plainVenvBin` (only one folder is put first).
8. **V8, a `.venv/bin` that is not a folder is skipped.** Create `.venv/` and write a
   regular FILE at `path.join(dir, '.venv', binName)`; tools in plainVenvBin. Expected:
   `from=plainvenv`, `firstOnPath === `venv/${binName}``.
9. **V9, an empty PATH never gains an empty entry.** Tools in venvBin;
   `process.env.PATH = ''`. Expected: each output holds exactly `PATHFULL=${venvBin}`, with
   no trailing delimiter. On Linux and macOS a trailing empty entry would mean the current
   folder. Also `res.passed === true`.
10. **V10, a project without pyproject.toml is not affected by a `.venv` folder.**
    `pkg({ name: 'nodeproj', version: '1.0.0', private: true, main: 'index.js', scripts: { test: 'node print-path.js' } })`,
    `index.js`, and a `print-path.js` that writes `PATHFULL=` plus `process.env.PATH` and
    exits 0. Write a `ruff` tool into venvBin. PATH is NOT replaced in this case (npm must
    resolve). Expected: `tests.ran === true`; the PATH entries read from the `PATHFULL=`
    line (`split(path.delimiter)`) do NOT include `venvBin`; `tests.firstOnPath === undefined`;
    `res.passed === true`.

Red before Step 10: V1, V2, V3 (the message), V5, V6, V7, V8 and V9. Green before and after
(guards): V4 and V10.

#### Existing suites that must stay green unchanged
- `tests/step-13-verify-coverage.test.js` B1-B3 and C1-C2 fake `spawnSync`/`execSync` and
  ignore the options. Their temporary projects hold no `.venv`, so `checkEnv` is `undefined`
  and the recorded commands (`ruff check .`, `pytest`) are the same.
- `tests/verify-parses-full-output.test.js`, `tests/verify-fails-loudly.test.js` and
  `tests/lib-quality2-batch.test.js` call `tryCommand`/`tryCommands`/`runFallbackChecks`
  with the old number of arguments.

#### Coverage targets
- Every new line of `projectVenvBin`, `checkEnvWith`, the `firstOnPath` loop and both
  arms of the `env` spreads is run on Linux by V1-V10. The Windows arm of the two
  platform expressions is run by the same cases on a Windows runner.
- The suite floor `.ctoc/coverage-baseline.json` `minPct` (99) holds. New code at or above
  80%.

### Security Review
- [x] **Path traversal:** no user-given path. The candidates are two fixed folder names joined
  to the project root with `path.resolve`. A `.venv` that is a symbolic link is followed on
  purpose (some setups link the venv). This gives no new power: VERIFY already runs the
  project's own code (`pytest` runs its tests, `npm test` its scripts).
- [x] **PATH injection:** the added entry is absolute, is added only in front, and never
  produces an empty entry. A relative or empty entry would let a file in the current
  folder shadow a command.
- [x] **Input validation:** `tryCommand` takes `options.env` only when it is an object.
  The command strings are still the fixed candidates of `runFallbackChecks` and are never
  built from file contents.
- [x] **Process environment:** `process.env` is copied, never assigned (V1 snapshots it).
- [x] **No secrets in output:** no environment value is logged or stored. The evidence gets
  only the project-relative label (`.venv/bin`). The absolute path, which holds the user's
  home folder name, is not stored.
- [x] **Prototype pollution:** the copy is a spread of `process.env`. The only key written is
  `PATH`, or the existing key that equals it ignoring letter case.
- [x] **Command injection:** no new `exec`/`spawn` call; no new shell string.
- [x] **Lint rules:** filesystem access goes through `safeFs.statSync`
  (`security/detect-non-literal-fs-filename` stays at error, `--max-warnings 0`). No
  regular expression is added.

### Architecture checks
| Check | Result |
|---|---|
| Dependency direction | lib only; no hook or command imported |
| Interface segregation | `toolExists`/`tryCommand` take only the `env` they pass on |
| Open/closed | new optional trailing parameters; no existing branch rewritten |
| Test independence | each case seeds its own project and PATH, restored in `afterEach` |
| Cross-platform | `path.resolve`, `path.delimiter`, `Scripts` on Windows, PATH key found ignoring letter case |

## Implementation Order
1. MODIFY `tests/step-13-verify.test.js`: the new `describe` (V1-V10), seen red (Step 8).
2. MODIFY `src/lib/step-13-verify.js`: `VENV_DIR_NAMES`, `projectVenvBin` and
   `checkEnvWith` first, then the widened `tryCommand`, `tryCommands`, `evalCategory` and
   `toolExists`, then the `runFallbackChecks` wiring and `firstOnPath`, then the message and
   docblock (Step 10).

## Acceptance Criteria Mapping

| Criterion | Implemented in | Test case |
|---|---|---|
| Tools only in `.venv/bin`, not on PATH: lint, types, tests applicable and RAN | `projectVenvBin`, `checkEnvWith`, `toolExists(…, env)`, `tryCommand` `env` | V1 (and V6 for `venv/bin`) |
| Same project with a failing test: `passed:false` with the failure, not `no-verifiable-toolchain` | unchanged `evalCategory` failure path, now reached under `checkEnv` | V2 |
| No venv, no tools on PATH: still `no-verifiable-toolchain` | `projectVenvBin` gives null; fail-closed rule untouched; message names `.venv`/`venv` | V3 |
| Tools on PATH, no venv: unchanged | `checkEnv` undefined, so no `env` key and identical options | V4, existing coverage suite B1-B3/C1-C2 |
| Only the checks' child PATH gets the folder; CTOC's own environment unchanged | `checkEnvWith` copies `process.env` | V1 (snapshot), V9 |
| `.venv/bin` and `venv/bin` both looked in, before giving up | `VENV_DIR_NAMES` order | V6, V7, V8 |
| Commands resolve to the project's own versions | the same env for the probe and the run | V5 |

## Risk Mitigations

| Risk | Mitigation | Where |
|---|---|---|
| A broken or wrong-version venv tool is now used instead of a working global one (accepted in the functional plan) | It fails as a real failing check, never as a skip, and the record names the folder put first (`firstOnPath`), so the change of binary can be seen | `runFallbackChecks` `firstOnPath` loop; V2, V5 |
| A non-Python project with a stray `.venv` changes behaviour | Looked for only when `pyproject.toml` exists | `runFallbackChecks`; V10 |
| A relative or empty PATH entry lets the current folder shadow a command | `path.resolve` (absolute); no delimiter added when PATH is empty | `projectVenvBin`, `checkEnvWith`; V9 |
| The fence counts this file, so a reshaped call breaks the suite | Keep the `r`/`output` bindings, no `maxBuffer:` key, no empty catch | Step 9 and Step 14 run `tests/false-green-fence.test.js` |
| The Windows PATH key differs in letter case | Reuse the existing key, matched ignoring letter case | `checkEnvWith` |

## Decisions Taken Under Ambiguity

1. **The probe and the run see the same PATH.** The `--version` probe runs with the same
   environment as the check, so the tool found is the tool run.
2. **Only for a project with `pyproject.toml`.** That file already decides whether ruff,
   mypy and pytest are looked for, and with this gate any other project, even one with a
   `.venv`, runs exactly as before.
3. **`Scripts` on Windows.** The plan names `bin`, which is the Linux and macOS layout. The
   standard venv on Windows (Python's venv, uv) puts its tools in `Scripts`, and CTOC must
   run on all three systems.
4. **The first folder found wins, `.venv` before `venv`, and only one folder is put on
   PATH.** This is the order the plan lists them in.
5. **A folder check, not a `pyvenv.cfg` check.** The plan names the folders. A folder
   that holds no tools does no harm, because the lookup falls through to the rest of PATH.
   (`src/lib/hotfix-check.js` uses `pyvenv.cfg` for a different job: finding venvs to link
   into a copy.)
6. **The folder is put first for every fallback check command of that run**, including a
   project's npm script in a mixed Node and Python project. It is not put first for the
   `ctoc quality` probe (CTOC's own tool), nor for the app launch (the entry point is out
   of scope).
7. **Only PATH changes.** `VIRTUAL_ENV` is not set, and `VIRTUAL_ENV` or
   `UV_PROJECT_ENVIRONMENT` are not followed elsewhere (other layouts are out of scope). An
   active venv is already on PATH.
8. **The record says which folder was put first** (`firstOnPath`, project-relative), so the
   change in which binary runs can be seen in the evidence. The one-line summary is
   unchanged.
9. **The `no-verifiable-toolchain` message names `.venv` and `venv`**, so the owner of a
   project like crypto-strategy-machine can see where VERIFY looked.
10. **A tool folder that cannot be read is treated as absent.** VERIFY then behaves as
    today, and if nothing else runs it still fails loudly.
11. **No project template applies.** The parent plan declares no project type: this is
    CTOC's own library code, so the template and production-readiness steps do not apply.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [x] Write the new `describe` block in `tests/step-13-verify.test.js`, with the fixture
  helpers and test cases V1-V10 exactly as in the Test Plan above.
- [x] Run `node --test tests/step-13-verify.test.js` before any source change and record
  the result. V1, V2, V3, V5, V6, V7, V8 and V9 must fail, and V4 and V10 must pass. A case
  in the red set that passes means it does not test the change: fix the test, not the source.

### Step 9: PREPARE
- [x] Re-read `src/lib/step-13-verify.js` and confirm the line numbers cited above
  (`toolExists` ~309, `evalCategory` ~340, `runFallbackChecks` ~655, `tryCommand` ~754,
  `tryCommands` ~862, the message ~160).
- [x] Read `.ctoc/false-green-baseline.json` and confirm the three keys for this file
  (`silent-catch:runVerify`, `unbounded-capture:r`, `unbounded-capture:output`) and
  `maxFindings`. Run `node --test tests/false-green-fence.test.js` once now so its green
  starting state is recorded.
- [x] Confirm the installed Node's `child_process` documentation: when `options.env` is
  given, the command is looked up through `options.env.PATH`.
- [x] Confirm by search that no file under `src/` other than `src/lib/step-13-verify.js`
  calls `toolExists`, `evalCategory` or `tryCommands`. Quote the pattern and the number of
  matching files in the build record.

### Step 10: IMPLEMENT
- [x] `src/lib/step-13-verify.js`: `VENV_DIR_NAMES`, `projectVenvBin`, `checkEnvWith`; the
  `env` option on `toolExists`, `tryCommand`, `tryCommands` and `evalCategory`; the
  `runFallbackChecks` wiring (`venv`, `checkEnv`, every `toolExists` and `evalCategory`
  call, the `firstOnPath` loop before `boundCheckOutputs`); the `no-verifiable-toolchain`
  message; the module docblock paragraph.
- [x] `tests/step-13-verify.test.js`: only the fixes Step 8's red run showed (no
  assertion weakened).

### Step 11: REVIEW
- [x] Reviewer confirms, by reading: `process.env` is never assigned in `src/lib/step-13-verify.js`
  (search `process\.env(\.|\[)\w*\s*=` returns no match in that file); the no-venv path adds
  no `env` key to either call; the probe and the run get the same `checkEnv`; V1's ordering
  comment and `boundCheckOutputs` stay last; the fail-closed rule's condition is unchanged.

### Step 12: OPTIMIZE
- [x] Confirm that a VERIFY run costs at most two `statSync` calls more, and only for a
  pyproject project, and that the environment copy is built once per run, not per command.

### Step 13: SECURE
- [x] The security scanner checks the new PATH handling against these cases:
  - a `.venv` that is a symbolic link outside the project (followed on purpose; confirm it
    adds no power beyond running the project's own tests);
  - `.venv/bin` as a file, a broken link, or a folder that cannot be read (each one treated
    as absent, nothing thrown);
  - an empty, missing or delimiter-only PATH (no empty entry produced);
  - a Windows environment with both `Path` and `PATH` keys (one key written);
  - the stored evidence holding no absolute path and no environment value.

### Step 14: VERIFY
- [x] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json`
  `minPct`, 0 skipped, 0 flaky. Also run `npm run lint` and `npm run typecheck`. Name
  these files in the record: `tests/step-13-verify.test.js`,
  `tests/step-13-verify-coverage.test.js`, `tests/verify-fails-loudly.test.js`,
  `tests/verify-parses-full-output.test.js`, `tests/verify-evidence-wiring.test.js`,
  `tests/ctoc-audit-w05-verify-evidence.test.js`, `tests/lib-quality2-batch.test.js`,
  `tests/false-green-fence.test.js`, `tests/golden-corpus-fence.test.js`,
  `tests/reachability.test.js`, `tests/export-reachability.test.js`,
  `tests/typecheck.test.js`, `tests/doc-counts.test.js`.

### Step 15: DOCUMENT
- [x] JSDoc on `VENV_DIR_NAMES`, `projectVenvBin` and `checkEnvWith`, and the new `env`
  parameters on `toolExists`, `evalCategory`, `tryCommands` and `tryCommand`. Add the
  module docblock paragraph `VENV — A PYTHON PROJECT'S OWN TOOLS.`. No count in `CLAUDE.md`
  moves (no file is created).

### Step 16: FINAL-REVIEW
- [x] Check each row of the Acceptance Criteria Mapping against its passing test. Quote
  Step 8's red run and Step 14's green run in the build record. Confirm that V4 and V10
  (the unchanged-behaviour guards) were green both before and after.


## Deferred Questions

_Written by the Iron Loop integrator (src/lib/iron-loop.js), which performs NO
quality evaluation. These entries are the integrator's own report on itself, not
findings from a critic that read this plan._

- **evaluation**: NOT EVALUATED — no automated critique was performed on this plan. The refinement loop appended the Steps 8-16 template and assessed nothing. (The scores this step used to report were computed from that same template, not from the plan.) A human or a real critic must review this plan before it is built.
