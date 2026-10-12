---
title: "No test and no security scan reaches the npm registry"
type: implementation
created: 2026-10-12
priority: high
effort: large
parent_plan: the-test-suite-runs-faster-and-never-weaker
depends_on: the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests
files:
  - src/lib/sast-runner.js
  - tests/security-scan-never-downloads-a-scanner.test.js
  - tests/helpers/security-scan-fixtures.js
  - tests/fixtures/security-scan/eslint-security-report.json
  - tests/fixtures/security-scan/eslint-security-report.capture.json
  - tests/fixtures/security-scan/npm-audit-lodash-4.17.4.json
  - tests/fixtures/security-scan/npm-audit-lodash-4.17.4.capture.json
  - tests/sast-runner-coverage.test.js
  - tests/sast-runner-failclosed.test.js
  - tests/w07-portable-shellouts.test.js
  - tests/quality-fleet-wiring.test.js
  - tests/quality-agent-coverage.test.js
  - tests/framework-security-checker.test.js
  # Candidates for npm's own update check (section 7, the CTO Chief's ruling): each is edited
  # ONLY when the base commit's file-by-file request count names it, and then only by the
  # smallest change that passes npm_config_update_notifier=false to the npm it starts.
  # tests/helpers/hotfix-check-harness.js is slice 1's shared helper (this slice depends on it).
  - tests/quality-agent-script-launcher.test.js
  - tests/greenfield-journey.test.js
  - tests/verify-parses-full-output.test.js
  - tests/helpers/hotfix-check-harness.js
  # Count files, rewritten by `node src/scripts/release.js` because this slice creates one
  # test file (a counted artifact): the test-file count in both.
  - README.md
  - CLAUDE.md
---

# No test and no security scan reaches the npm registry

Slice 2 of `plans/functional/the-test-suite-runs-faster-and-never-weaker.md` (acceptance
criteria 1, 2, 12, 13, 14, 14a, 15–23; decisions 6, 7, 8, 9, 16, 17 and the three changes a
user of the security scan will see). It is built after slice 1 (the split of the hotfix-check
test file), so its "before" measurements start from slice 1's completion commit.

## Problem statement

CTOC's own security scan asks for eslint with `npx eslint --version`
(`src/lib/sast-runner.js` line 390), through a shell, with no working folder (line 398), so it
answers for the folder the process was started in, not for the project being scanned. When
that folder has eslint (this repository has it, `package.json` lines 22 and 24), the run then
starts `npx eslint --plugin security --format json .` in the scanned project (lines 671–682).
In a project without eslint, npx installs whatever eslint the registry serves and runs it
(standard input is `ignore`, so npx assumes `--yes`; the CTO Chief's probe saw the requests).
That is a supply-chain hole in the product and the reason three test files take 30 to 310 s
wall-clock. On Windows the same start uses `npx.cmd` with no shell, which Node refuses
(`src/lib/quality-agent.js` lines 239–245), so by reading the scan never runs there.

Separately, `tests/quality-fleet-wiring.test.js` lines 285–296 run a live `npm audit` and
accept either a finding or a skip, so the test passes whatever the network does.

## Technical approach

### 1. The product change: `src/lib/sast-runner.js`

Everything below is the whole product diff. No other source file changes. No import is added:
the lookup uses `path` and `safeFs`, which the file already requires (lines 14–15).

**Two module-level functions**, placed after `TOOL_CONFIGS` and before `class SASTRunner`:

```js
/**
 * Whether `child` lies strictly inside `parent`. Both are absolute real paths; a path on
 * another drive (Windows) is never inside.
 * @param {string} child
 * @param {string} parent
 * @returns {boolean}
 */
function isStrictlyInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

/**
 * The real path of the scanned project's own eslint bin script, found without starting a
 * process, or null when the project has none.
 *
 * From the project folder's real path upward, the first `<dir>/node_modules/eslint/package.json`
 * that exists names the candidate package; no later level is tried. The candidate counts only
 * when the package folder's real path lies inside a `node_modules` folder of the project folder
 * or of one of its ancestors, and the bin script (`bin` as a string, or `bin.eslint`) lies, by
 * real path, inside the package folder. NODE_PATH, the global folders and the package's
 * `exports` are never read. Anything else (no candidate, unreadable, malformed, linked from
 * elsewhere) is "not installed": the scan then skips loudly; it never fetches eslint from a
 * registry.
 * @param {unknown} projectRoot
 * @returns {string|null}
 */
function findProjectEslintBin(projectRoot) {
  if (typeof projectRoot !== 'string' || projectRoot.length === 0) return null;
  try {
    /** @type {string[]} */
    const levels = [];
    for (let dir = safeFs.realpathSync(path.resolve(projectRoot)); ; dir = path.dirname(dir)) {
      levels.push(dir);
      if (path.dirname(dir) === dir) break;
    }
    const level = levels.find((dir) =>
      safeFs.existsSync(path.join(dir, 'node_modules', 'eslint', 'package.json')));
    if (level === undefined) return null;
    const pkgDir = safeFs.realpathSync(path.join(level, 'node_modules', 'eslint'));
    if (!levels.some((dir) => isStrictlyInside(pkgDir, path.join(dir, 'node_modules')))) return null;
    const manifest = JSON.parse(String(safeFs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')));
    const bin = manifest && manifest.bin;
    const rel = typeof bin === 'string' ? bin
      : (bin && typeof bin.eslint === 'string' ? bin.eslint : null);
    if (rel === null) return null;
    const script = safeFs.realpathSync(path.resolve(pkgDir, rel));
    return isStrictlyInside(script, pkgDir) ? script : null;
  } catch {
    // A folder that does not exist, an unreadable or malformed manifest, a bin script that
    // does not exist: the project has no usable eslint. This is not a verdict on the code;
    // the caller reports the scanner as not installed, loudly.
    return null;
  }
}
```

Facts this rests on, read: eslint 9.39.4 (installed here) declares `"bin": { "eslint":
"./bin/eslint.js" }` (`node_modules/eslint/package.json` lines 7–9). The lookup is a direct
walk (decision 1): it never asks Node's resolver, so `NODE_PATH`, the global folders
(`$HOME/.node_modules`, `$HOME/.node_libraries`, `$PREFIX/lib/node`) and the package's
`exports` field cannot change the answer. The first level whose
`node_modules/eslint/package.json` exists is the only candidate; a candidate that fails a
check gives "not installed", never a fall-through to a higher level. The ownership check takes
the real path of the candidate's package folder, so a pnpm layout (`node_modules/eslint`
linking to `node_modules/.pnpm/…/node_modules/eslint`) lands inside the project's own
`node_modules` and is accepted, and so does a checkout whose `node_modules` is a link into an
ancestor's `node_modules` (for example a worktree inside its main checkout, its `node_modules`
linked to the main checkout's), while a link
to a folder outside the project and its ancestors is refused. Because ancestors count, a
`node_modules` at `/node_modules`, `/tmp/node_modules` or `$HOME/node_modules` serves every
project below it that has no eslint of its own (risk row; consistent with the CTO Chief's
ruling; no code change). `safe-fs` provides `existsSync` (`src/lib/safe-fs.js` line 78),
`readFileSync` (line 82) and `realpathSync` (line 118); every file-system call on a computed
path goes through it, because `eslint.config.js` line 133 makes
`security/detect-non-literal-fs-filename` an error in `src/`.

**Constructor** (lines 122–132): add, after `this.errors = [];`,
`/** @type {string|null|undefined} */ this._eslintBin = undefined;` so the type checker sees
the field.

**New method** `projectEslintBin()`, placed right before `isToolAvailable`:

```js
  /**
   * The real path of this project's own eslint bin script, or null. Looked up once per
   * scanner (findProjectEslintBin), so the availability probe and the run use the same
   * project folder and the same script.
   * @returns {string|null}
   */
  projectEslintBin() {
    if (this._eslintBin === undefined) this._eslintBin = findProjectEslintBin(this.projectRoot);
    return this._eslintBin;
  }
```

**`isToolAvailable(tool)`** (lines 385–403): first line of the body becomes

```js
    // eslint is the scanned project's own install, found without starting a process. The old
    // probe, `npx eslint --version`, ran in the process's working folder and, where eslint was
    // missing, fetched it from the npm registry.
    if (tool === 'eslint') return this.projectEslintBin() !== null;
```

and the `eslint: 'npx eslint --version'` entry (line 390) is deleted from `checks`. The other
four probes are unchanged. So `isToolAvailable('eslint')` returns `true` exactly when the
scanned project (or an ancestor) has its own eslint package with a bin script inside it; it
starts no process, never depends on the working folder, and gives the same answer for the
life of the scanner object.

**`runESLintSecurity()`** (lines 663–708): the doc comment and the start change; the output
handling (lines 683–707) stays byte for byte except one comment.

```js
  /**
   * Run ESLint with its security plugin: the scanned project's own eslint bin script,
   * started by the running Node program with an argument list and no command interpreter
   * on every platform. Never npm, never npx, nothing fetched from a registry; on Windows no
   * `.cmd` file is involved, so Node can start it without a command interpreter.
   */
  async runESLintSecurity() {
    const bin = this.projectEslintBin();
    if (bin === null) {
      // Reached only by a direct caller: runLanguageScanner checks isToolAvailable first.
      this.errors.push({ tool: 'eslint-security', error: 'eslint is not installed in this project' });
      return;
    }
    const args = [bin, '--plugin', 'security', '--format', 'json', '.'];

    let out = '';
    try {
      out = execFileSync(process.execPath, args, {
        cwd: this.projectRoot,
        timeout: this.options.timeout,
        encoding: 'utf8',
        // The stdio setting discards stderr without a shell redirect.
        stdio: ['ignore', 'pipe', 'ignore']
      });
    } catch (error) {
      … unchanged (lines 684–694), with the parenthesis in the comment at lines 687–688 now
      reading "(the project's own eslint was found above, so it started)" …
    }
    … unchanged (lines 697–707) …
  }
```

`process.execPath` is read at the call, so a test can replace it. `process.platform` is no
longer read here at all: the start is the same on every platform.

**`TOOL_CONFIGS`** (lines 86–95), `javascript` and `typescript`: `command` becomes
`'node <project eslint bin script> --plugin security --format json .'`, with a one-line
comment above the first: "Descriptive only: nothing reads `command`; the scanned project's
own eslint, started by the running Node program, never npx." Who reads it, by a search of
`src/` and `tests/` for `TOOL_CONFIGS` and reading every match: `src/lib/sast-runner.js`
line 372 and `src/lib/quality-agent.js` line 1566 read `.primary` only;
`tests/sast-runner-registry.test.js` lines 128 and 135 and `tests/security.test.js` lines
42–46 read `.primary` or test the entry is present. Nothing reads `.command` (it was a
description already).

**Unchanged, stated so the reviewer can check it:** `securityRouteFor` (javascript and
typescript still route to `eslint`), `runLanguageScanner` (its `isToolAvailable(native)` call
at line 553 now hits the per-scanner answer; when eslint is missing it returns `false` and
starts nothing), `run()` and `runSecurityScan` in `src/lib/quality-agent.js` (its scannable
filter at lines 1559–1563 and the skip text at lines 1565–1570 are untouched: a project
without eslint now gets `SAST skipped for javascript: no scanner installed (need semgrep or
eslint)`, and `typescript` the same with its own name). The pass and fail rule of the
security check is unchanged.

**Static fences the new text must respect:**
`tests/w07-portable-shellouts.test.js` lines 40–62 read the source of `sast-runner.js` and fail
on the literal `2>/dev/null`, the literal `|| true`, and anything matching `/shell:\s*true/` —
**including in comments**, so no comment may write those three texts. The false-green fence
(`src/lib/false-green-scan.js`) flags a catch whose body is empty (lines 514–526) and an
`execSync`/`spawnSync` capture without `maxBuffer` (lines 114, 498–507): the new catch returns
`null` (not empty) and the new start is `execFileSync`, which that check does not match, so
`.ctoc/false-green-baseline.json` needs no change. The lookup makes no `require(…)` call, so
`security/detect-non-literal-require` does not apply.

### Wiring — the live call sites

- `findProjectEslintBin` (module-private) ← `SASTRunner.projectEslintBin()`.
- `projectEslintBin()` ← `isToolAvailable('eslint')` and `runESLintSecurity()`.
- `isToolAvailable('eslint')` ← `runSecurityScan` (`src/lib/quality-agent.js` lines
  1559–1563) and `runLanguageScanner` (`src/lib/sast-runner.js` line 553).
- `runESLintSecurity()` ← `runLanguageScanner` (lines 574–576) ← `run()` (line 452) ←
  `runSecurityScan` (`src/lib/quality-agent.js` line 1572).
- `runSecurityScan` ← `src/commands/push.js` lines 76 and 106, which is `/ctoc:push`
  (`src/commands/push.md`); also `runTieredChecks` (`src/lib/quality-agent.js` line 1781), the
  post-commit quality run.
- `tests/helpers/security-scan-fixtures.js` ← `tests/security-scan-never-downloads-a-scanner.test.js`,
  `tests/sast-runner-coverage.test.js`, `tests/sast-runner-failclosed.test.js`,
  `tests/quality-fleet-wiring.test.js`, `tests/quality-agent-coverage.test.js`,
  `tests/framework-security-checker.test.js`.

The root a human reaches it from is `/ctoc:push`. No new export, so the reachability baseline
does not change.

### 2. The shared test helper: `tests/helpers/security-scan-fixtures.js` (new)

CommonJS, `node:` built-ins only, JSDoc on each export, no assertion inside.

- `makeFakeEslintProject({ bin = { eslint: './bin/eslint.js' }, script = '', scriptPath =
  'bin/eslint.js', files = {} } = {})` → `{ root, bin }`. Makes a temporary folder
  (`fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-fake-eslint-'))`), writes
  `node_modules/eslint/package.json` as `{ "name": "eslint", "version": "0.0.0-fixture", "bin":
  <bin> }` (no `exports` field), writes `script` at `node_modules/eslint/<scriptPath>` unless
  `script` is `null`, and writes every entry of `files` (relative path → text) under the root.
  `root` is the folder as created; `bin` is `fs.realpathSync` of the written script, or `null`
  when none was written. The caller removes `root`.
- `closedLoopbackPort()` → `Promise<number>`: `net.createServer()`, `listen(0, '127.0.0.1')`,
  read `address().port`, `close()`, return the port. Nothing listens on it afterwards.
- `withClosedNpmRegistry(fn)` → `Promise<fn's result>`: makes a temporary folder holding an
  empty file `npmrc` and an empty folder `cache`; sets `npm_config_registry` and
  `COREPACK_NPM_REGISTRY` to `http://127.0.0.1:<closedLoopbackPort()>/`,
  `npm_config_fetch_retries` to `'0'`, `npm_config_cache` to the `cache` folder,
  `npm_config_userconfig` to the empty `npmrc` and `npm_config_offline` to `'false'`; awaits
  `fn()`; in `finally` puts every one of the six variables back exactly (deleted when it was
  unset) and removes the folder. Every real npm the test starts inherits these through
  `process.env` (the product passes no `env` to npm: `src/lib/dependency-auditor.js` lines
  291 and 469–474, `src/lib/sca-runner.js` lines 197 and 397–403).

### 3. The new behaviour test file: `tests/security-scan-never-downloads-a-scanner.test.js`

`node:test` and `node:assert/strict`. Drives the live caller `runSecurityScan` (decision 16).
Nothing from `src/` is required at the top of the file.

**Harness (in the file).**
- `REAL = { execSync, execFileSync, spawnSync }` captured from `node:child_process` at load.
- `FLEET` = the resolved paths of `src/lib/quality-agent`, `secrets-scanner`,
  `dependency-auditor`, `sast-runner`, `sca-runner`, `migration-safety-checker` (every module
  on the scan's path that captures a child-process function at load).
- `withScan({ runForReal = () => false }, fn)`: installs three spies that push
  `{ via, program, args, opts }` to `starts` (for `execSync` the command string is split on
  white space: first word = program); `execFileSync` calls `REAL.execFileSync` only when
  `runForReal(file, args)` is true, otherwise throws
  `Object.assign(new Error(\`spawn ${program} ENOENT\`), { code: 'ENOENT', status: null, stdout: '' })`;
  `execSync` always throws that; `spawnSync` returns `{ status: null, signal: null, stdout: '',
  stderr: '', error: <that error> }`. Then deletes `FLEET` from `require.cache`, requires
  `quality-agent`, then `sast-runner` and `secrets-scanner` (the instances quality-agent just
  loaded), calls `fn({ qa, SASTRunner, SecretsScanner, starts })`, and in `finally` puts the
  real functions back and deletes `FLEET` from the cache again. `console.log` is silenced
  around each `runSecurityScan` call.
- `semgrepAbsent(t, SASTRunner)`: `const real = SASTRunner.prototype.isToolAvailable;
  t.mock.method(SASTRunner.prototype, 'isToolAvailable', function (tool) { return tool ===
  'semgrep' ? false : real.call(this, tool); })` — the seam of
  `tests/quality-fleet-wiring.test.js` lines 352–367; `t.mock` restores it after the test
  (pattern already used at `tests/quality-agent-coverage-holes.test.js` line 549).
- `isNpx = (s) => /^npx(\.cmd)?$/i.test(path.basename(String(s.program)))`;
  `namesEslint = (s) => /eslint/i.test([s.program, ...(s.args || [])].join(' '))`.
- `eslintManifestsAbove(dir)` → the list of every `<level>/node_modules/eslint/package.json`
  that `fs.existsSync` finds, walking from `fs.realpathSync(dir)` upward to the file-system
  root, nearest first. The same walk as the product's lookup, written in the test so a host
  layout is checked before the product answers.
- `REPORT_PATH` = the absolute path of `tests/fixtures/security-scan/eslint-security-report.json`
  (a path only; the file is read inside test 3's body, never at file load, so a missing or
  broken recording fails test 3 alone and no other test of the file).
- `EVAL_SOURCE` = `"'use strict';\nfunction run(userInput) {\n  return eval(userInput);\n}\nmodule.exports = run;\n"`
  — the exact text the recorded eslint report was captured from (it lives in a string because
  this repository's own lint would flag a real `eval(variable)` call in a `.js` file under
  `tests/`).

**Tests** (names are the test titles; each named "starts the real …" is a medium test and its
title says which boundary it crosses):

1. `a project without eslint: the scan starts no npx and no eslint, and says eslint is missing`
   (criterion 12). Temp project: `package.json` (`{"name":"no-eslint-here","version":"1.0.0"}`)
   and `index.js`. First: `assert.deepEqual(eslintManifestsAbove(dir), [], 'this host has eslint
   in a node_modules above the temporary folder; the lookup would find it')` (a host with
   `/node_modules/eslint`, `/tmp/node_modules/eslint` or eslint in another ancestor of the
   temporary folder fails here, loudly; `NODE_PATH` and the global folders no longer matter,
   because the lookup never reads them). `withScan`,
   `semgrepAbsent`, `runSecurityScan(null, { projectRoot: dir, allFiles: true })`. Asserts:
   `starts.filter(isNpx)` is `[]`; `starts.filter(namesEslint)` is `[]`; `res.skipped` includes
   exactly `'SAST skipped for javascript: no scanner installed (need semgrep or eslint)'`. The
   dependency audit's npm (the `package.json` triggers it) and SCA's probes are answered by the
   spy, so no real process starts.
2. `the answer follows the scanned project, not the folder the test runs in, and the probe starts no process`
   (criterion 13). `process.chdir(REPO_ROOT)` for the test, restored in `finally`; precondition,
   two assertions: `eslintManifestsAbove(REPO_ROOT)` is not empty, and the real path of its
   first entry lies strictly inside `<real REPO_ROOT>/node_modules` or the `node_modules` of an
   ancestor of the real `REPO_ROOT`. The message names the layout it found: the first entry,
   its real path, and whether `REPO_ROOT/node_modules` is a link and where it points, so a
   checkout whose eslint the lookup refuses by design (a `node_modules` linked to a folder
   outside the repository and its ancestors) fails here with that reason, not on a bare
   `true !== false` below. Inside `withScan`: `new SASTRunner(dir).isToolAvailable('eslint') === false`,
   `new SASTRunner(REPO_ROOT).isToolAvailable('eslint') === true`, `starts` is `[]` after both;
   then `runSecurityScan` on `dir` (semgrep absent) holds the same skip entry as test 1.
3. `a project's own eslint is started by the running Node program with an argument list and no shell, and its finding blocks the push`
   (criterion 14). First, inside the test body, the recording is read from `REPORT_PATH` and
   parsed, and a fixture check asserts that every result's `filePath` starts with the literal
   `<PROJECT_ROOT>` (no absolute path was committed, and the fake script's replacement covers
   every entry). Then `makeFakeEslintProject({ script: <prints the recorded report>, files: { 'index.js': EVAL_SOURCE } })`
   — the script reads `REPORT_PATH` (embedded with `JSON.stringify`), replaces every `<PROJECT_ROOT>` with
   `JSON.stringify(process.cwd()).slice(1, -1)`, writes it to standard output and sets
   `process.exitCode = 1` (eslint's exit code when it finds an error). No top-level
   `package.json`, so no dependency audit and no SCA probe. `withScan` with
   `runForReal = (file, args) => file === process.execPath && args[0] === project.bin`;
   semgrep absent; trufflehog and detect-secrets absent through
   `t.mock.method(SecretsScanner.prototype, 'isToolAvailable', () => false)`. Asserts: exactly
   one start; its program is `process.execPath`; `args[0] === project.bin`;
   `args.slice(1)` deep-equals `['--plugin', 'security', '--format', 'json', '.']`;
   `opts.shell === undefined`; `opts.cwd === project.root`; `res.details` matches
   `/^sast\[HIGH\] security\/detect-eval-with-expression at .*index\.js:<line>$/m` with `<line>`
   read from the recorded report; `res.passed === false`.
4. `with the platform set to win32 the start is the same: node, the script first, no shell, no .cmd`
   (criterion 14, Windows). Same project; `process.platform` replaced through
   `Object.defineProperty` (the helper shape of `tests/quality-agent-coverage.test.js` lines
   184–195) around one `runSecurityScan`; `runForReal` is `() => false` (nothing runs under a
   faked platform). Asserts on the eslint start only: program `process.execPath`, `args[0] ===
   project.bin`, no `shell` key in its options, no program or argument ending in `.cmd`. The
   build record says "not run on Windows".
5. `starts the real eslint 9 and eslint-plugin-security of this repository, with no network, and finds eval with an expression`
   (criterion 14a). Project built in a temp folder outside the repository (section 6). Same
   seams as test 3 (semgrep, trufflehog, detect-secrets absent); `runForReal` lets exactly the
   eslint start through. Asserts: exactly one start (node, the project's forwarding bin
   script); `res.details` matches
   `/^sast\[HIGH\] security\/detect-eval-with-expression at .*index\.js:3$/m`;
   `res.passed === false`.
6. Lookup cases, each through `isToolAvailable('eslint')` inside `withScan` and each asserting
   `starts` is `[]`:
   - `eslint whose bin is a string is found` (`bin: './bin/eslint.js'`) → `true`.
   - `eslint whose bin names no eslint script is not installed` (`bin: { other: './bin/eslint.js' }`) → `false`.
   - `eslint whose bin script lies outside its package is not installed`
     (`bin: { eslint: '../../outside.js' }`, `script: null`, `files: { 'outside.js': '' }`) → `false`.
   - `eslint whose bin folder is linked to a folder outside the package is not installed`:
     `makeFakeEslintProject({ script: null })`, a second temporary folder holding `eslint.js`,
     and `node_modules/eslint/bin` a directory link (`'junction'` on win32, `'dir'` elsewhere)
     to that folder; the manifest's `./bin/eslint.js` exists through the link, but its real path
     lies outside the package → `false`.
   - `eslint whose bin is an absolute path outside the package is not installed`:
     `makeFakeEslintProject({ script: null })`, a second temporary folder holding `outside.js`,
     and the manifest rewritten by the test as `bin: { eslint: <the real path of that file> }`
     (the file exists, so the containment check, not a missing file, refuses it) → `false`.
   - `eslint linked in from outside the project is not installed`: a second temp project whose
     `node_modules/eslint` is a directory link (`'junction'` on win32, `'dir'` elsewhere) to the
     first project's real package → `false`.
   - `eslint in an ancestor's node_modules is found`: package in `<tmp>/node_modules/eslint`,
     scanner rooted at `<tmp>/packages/app` → `true`.
   - `eslint linked inside the project's own node_modules is found (pnpm layout)`: real package at
     `node_modules/.pnpm/eslint@9.0.0/node_modules/eslint`, `node_modules/eslint` a directory
     link to it → `true`.
   - `the answer is kept for the life of one scanner`: `true`; delete `node_modules/eslint`;
     the same scanner still `true`; a new scanner on the same folder `false`.
   - `an unusable project folder means not installed and never throws`: `undefined`, `''` and a
     missing folder → `false` each.

### 4. Changes to existing tests, file by file

Each changed test keeps every assertion it had; each spy's move from `npx` to the new start
carries a comment saying so and why.

**`tests/sast-runner-failclosed.test.js`**, test at line 79 (`runESLintSecurity: a crash
(non-JSON stdout) surfaces in errors`).
- Old: spy `cp.execFileSync = () => { throw crashError('Oops! …\nnot json'); }`, scanner on
  `'/nonexistent-project'`, asserts `r.errors.some(e => e.tool === 'eslint-security' && e.error)`.
- New: project from `makeFakeEslintProject()`; the spy also pushes `[file, args[0]]` to
  `starts` before throwing the same error; scanner on `project.root`; the old assertion
  unchanged; added `assert.deepEqual(starts, [[process.execPath, project.bin]], …)`; project
  removed in `finally`.
- Why same or tighter: after the fix `'/nonexistent-project'` would stop at "eslint is not
  installed" — an `eslint-security` error that would keep the old assertion green while the
  crash branch is never reached. The fake package brings the run to the same branch as before
  (non-zero exit, non-JSON standard output, `JSON.parse` fails, lines 698–704); the start
  assertion proves the branch was reached.

**`tests/sast-runner-coverage.test.js`**, three tests.
- Line 291 (`runESLintSecurity_records_error_when_crash_has_no_stdout`). Old: spy throws
  `exitNoStdout('spawn npx ENOENT')`, scanner on `'/no/such/dir'`, asserts no findings and an
  `eslint-security` error matching `/ENOENT/`. New: fake project; the spy pushes the start and
  throws `exitNoStdout(\`spawn ${file} ENOENT\`)`; both old assertions unchanged; added the
  one-start assertion. Same branch: no standard output, early return (lines 690–693).
- Line 313 (`…_records_error_when_successful_run_produces_empty_output`). Old: `() => ''`,
  `'/no/such/dir'`, asserts no findings and `/produced no output/`. New: fake project; the spy
  pushes the start and returns `''`; both old assertions unchanged; added the one-start
  assertion. Same branch: line 706.
- Line 360 (`runLanguageScanner_dispatches_javascript_to_eslint_and_returns_true`). Old:
  `cp.execSync = () => ''` (the shell probe succeeds) and `execFileSync` answers `npx`/`npx.cmd`
  with one `no-eval` finding; asserts `ran === true`, one finding, tool `eslint-security`. New:
  fake project; `cp.execSync` throws `no shell command may run here` (a shell probe coming back
  would fail the test); `execFileSync` answers the same report only for
  `file === process.execPath && args[0] === project.bin` and throws otherwise; the three old
  assertions unchanged; added the one-start assertion. Same branch: dispatch to eslint with one
  parsed finding; tighter because a shell probe is now refused.

**`tests/w07-portable-shellouts.test.js`**, test at line 64 (criterion 16).
- Old: no spy; scanner on an empty temp folder with a 30 s timeout; asserts
  `doesNotReject(runner.runESLintSecurity())`. It started the real `npx eslint` (30.4 s in the
  profile).
- New: before the fresh `require` at lines 65–66, spies on `execFileSync`, `execSync` and
  `spawnSync` record every start and refuse it (so even the red run starts nothing); the old
  `doesNotReject` assertion unchanged; added: `runner.errors` holds an `eslint-security` error
  matching `/eslint is not installed/`; `starts` is `[]`. The
  comment at lines 68–70 becomes "A temp folder with no eslint: the method records that eslint
  is not installed and starts nothing (it used to start npx, which fetched eslint from the npm
  registry)"; point (b) of the header (lines 16–18) is rewritten as below. Real functions restored in
  `finally`. `const cp = require('node:child_process');` joins the requires.
- No `isNpx` helper in this file (it lives in the new test file only): `starts` deep-equal to
  `[]` is the assertion that no `npx` started, with the message `no process may start, npx
  included`; criterion 16's "no npx start" is that assertion.
- Point (b) of the header is rewritten to: "(b) shell-independent BEHAVIOR — checkDisk() works
  with an empty PATH (no PATH-resolved external binary is needed), and runESLintSecurity() on a
  folder with no eslint records that eslint is not installed and starts no process (it used to
  start npx, which fetched eslint from the npm registry). That eslint, where the project has
  it, starts with no shell (the running Node program, the bin script first, an argument list,
  the same on win32) is proven by two tests of
  tests/security-scan-never-downloads-a-scanner.test.js: 'a project's own eslint is started by
  the running Node program with an argument list and no shell, and its finding blocks the
  push' and 'with the platform set to win32 the start is the same: node, the script first, no
  shell, no .cmd'." Lines 5–8 of the header (the old construct, now absent) stay as history.

**`tests/quality-fleet-wiring.test.js`** (criteria 18, 19, 20, and one test kept off npm).
- Top: add `const { DependencyAuditor } = require('../src/lib/dependency-auditor');` beside
  lines 29–30 and `const { withClosedNpmRegistry } = require('./helpers/security-scan-fixtures');`.
  Taken at load, before any test reloads the fleet, so these are the same classes the
  top-level `qualityAgent` (line 27) uses; `SASTRunner` (line 29), `SecretsScanner` (line 30)
  and `SCARunner` (line 407) are top-level for the same reason. (`cp`, `freshQualityAgent` and
  `restoreCp` are declared further down at lines 598–620; test bodies run after the file has
  loaded, so using them inside the `DEPENDENCIES` tests is safe.)
- Test at line 285 (`the dependency auditor runs in the live path and never silently swallows
  the result`) becomes `a recorded real npm audit answer for lodash 4.17.4 surfaces as a
  dependency finding, and no real npm starts` (criteria 18 and 20):
  - Old assertions, both kept word for word: `assert.ok(surfacedFinding || loudSkip, …)` and
    `assert.equal(typeof res.passed, 'boolean')`.
  - Setup (the test takes `t`): the recording and its capture file are read; a fixture check asserts the capture
    names an npm version (`/^\d+\.\d+\.\d+$/`) and a date (`/^\d{4}-\d{2}-\d{2}$/`), and that
    the recording's `metadata.vulnerabilities.critical + high` is at least 1. Spies:
    `cp.execSync` records `{ command, cwd: opts && opts.cwd }`; `'npm --version'` returns the
    captured npm version; a command starting `npm audit` throws an error with `status: 1` and
    `stdout` = the recording (npm audit exits 1 when it finds vulnerabilities); anything else
    throws "not installed". `cp.execFileSync` records and throws `ENOENT`.
    `t.mock.method(SecretsScanner.prototype, 'isToolAvailable', () => false)` (secrets-scanner
    is not in `RELOAD_PATHS`, so its probes would otherwise start real programs).
    `const qa = freshQualityAgent()`, scan inside `captureLog`, `restoreCp()` in `finally`.
  - New assertions: `res.details` matches `/^dependency\[[A-Z]+\] lodash: /m`; `loudSkip` is
    `false`; `res.passed === false` (a known-vulnerable dependency blocks); criterion 20: at
    least one recorded start begins `npm audit`, and every such start is exactly
    `'npm audit --json'` with `cwd === dir`.
  - Why tighter: the old test passed on a finding or a skip, whatever the network did; the new
    one passes only when the real recorded answer is parsed into a finding with no skip, and
    proves no real npm started. The command is `npm audit --json` because `runSecurityScan`
    builds `new DependencyAuditor(projectRoot)` with default options (`src/lib/quality-agent.js`
    line 1492), `includeDevDependencies` defaults to `true`
    (`src/lib/dependency-auditor.js` line 157), which selects `'npm audit --json'` (lines
    465–467), run in `this.projectRoot` (line 470). The number of audit starts is recorded, not
    pinned: by reading it is three (`npm`, then the `yarn` and `pnpm` fallbacks — `yarn` and
    `pnpm` are co-detected from `package.json`, lines 186–212, and fall back to `npm audit`,
    lines 371–376).
- New test right after it, in the same `describe` (criterion 19):
  `LIVE, no internet: the real installed npm, pointed at a closed local port, makes the dependency audit skip loudly with no finding`.
  `const realAuditorProbe = DependencyAuditor.prototype.isToolAvailable;` then
  `t.mock.method(DependencyAuditor.prototype, 'isToolAvailable', function (m) { return m === 'npm' ? realAuditorProbe.call(this, m) : false; })`
  (yarn and pnpm absent, so a corepack shim cannot download them), and
  `t.mock.method(...)` answering `false` on `SASTRunner.prototype`, `SCARunner.prototype` and
  `SecretsScanner.prototype` — npm is the only real process. Inside `withClosedNpmRegistry`:
  first `assert.equal(realAuditorProbe.call(new DependencyAuditor(dir), 'npm'), true, 'this live check needs the real installed npm')`,
  then `captureLog(() => qualityAgent.runSecurityScan(null, { projectRoot: dir, allFiles: true }))`.
  Asserts: some `res.skipped` entry matches `/^dependency audit skipped \(npm\): /`;
  `res.details` does not match `/dependency\[/`. Its duration (from the runner's output) and the
  full `skipped` list go into the build record. Predicted by reading npm 11.19.1's source
  (`/opt/homebrew/lib/node_modules/npm`, not run): the audit request fails, `lib/utils/audit-error.js`
  lines 23–37 buffer `{ message, … }` and throw a string, `lib/utils/display.js` lines 104–135
  merge an `error` object into the JSON, npm exits 1, and the auditor records
  `npm audit did not run (unknown): audit endpoint returned an error`
  (`src/lib/dependency-auditor.js` lines 741–746). If the real run instead reads as a clean
  pass, the test stays red and the captured output goes to the owner; the assertion is never
  relaxed.
- Test at line 472 (`a normal npm repo still defers javascript to DependencyAuditor exactly
  once`): the `captureLog(() => qualityAgent.runSecurityScan(…))` call (lines 488–490) is
  wrapped in `withClosedNpmRegistry(() => …)`, with a comment: npm stays real but reaches no
  registry; this test is about SCA's deferral. Every assertion unchanged. Why: by reading it
  starts the real `npm --version`, `yarn --version`, `pnpm --version` and `npm audit --json`
  with the inherited environment.

**`tests/quality-agent-coverage.test.js`**, test at line 661 (`surfaces a NEXT_PUBLIC_*_SECRET
as a finding that FAILS the gate`): require `withClosedNpmRegistry` at the top; the
`captureLog(…)` at lines 672–673 is wrapped in `withClosedNpmRegistry(() => …)` with the same
comment. Assertions unchanged. Why: its `package.json` makes the real scan start npm, yarn and
pnpm probes, `npm audit` (dependency step) and SCA's `npm --version` and `npm audit` (no
lockfile, so javascript is not deferred), all with the inherited environment.

**`tests/framework-security-checker.test.js`**, test at line 544 (`runSecurityScan surfaces the
client-exposed secret as HIGH and FAILS the gate`): same wrap of the call at line 545, same
comment, require `withClosedNpmRegistry`. Assertions unchanged. The file header's "Zero mocks"
(line 13) stays true: npm is real and only its registry address changes. Why this file is in
the slice although the functional plan did not list it: it is a security-scan test that today
starts `npx eslint` in a temporary project (the same path as the other two) and a real
`npm audit`, the class the owner named.

### 5. The recorded fixtures (under `tests/fixtures/security-scan/`)

**`npm-audit-lodash-4.17.4.json`** — captured once by the executor from the real registry, the
only registry contact of the build, outside the test suite:
1. In a new scratch folder, write the two files of `tests/quality-fleet-wiring.test.js` lines
   265–281 byte for byte (`JSON.stringify(…, null, 2)`).
2. Run `npm audit --json` there with the machine's normal settings (record
   `npm config get registry`; it must be `https://registry.npmjs.org/`), standard output to the
   fixture file, byte for byte. Record the exit code (expected 1).
3. Check the output holds no local path, user or host name (npm's report lists nodes by
   relative path, e.g. `node_modules/lodash`); a hit stops the capture and is reported.

**`npm-audit-lodash-4.17.4.capture.json`** — `{ "command": "npm audit --json", "npm": "<npm
--version>", "node": "<node --version>", "captured": "<YYYY-MM-DD>", "exitCode": 1, "registry":
"https://registry.npmjs.org/", "fixture": "the lodash 4.17.4 project of
tests/quality-fleet-wiring.test.js, describe DEPENDENCIES" }`. Re-capturing is these three
steps again.

**`eslint-security-report.json`** — captured once by running this repository's own eslint and
eslint-plugin-security on the section 6 project (with its configuration file):
`node <repo>/node_modules/eslint/bin/eslint.js --plugin security --format json .` in that
project, standard output saved. The capture folder's real path, `fs.realpathSync(captureDir)`
(eslint writes physical paths: on macOS `/var/…` reads as `/private/var/…` and `/tmp/…` as
`/private/tmp/…`), is then replaced, in every `filePath`, by the literal `<PROJECT_ROOT>` (with
the path separator that followed it kept as written), so no local path, user name or
temp-folder name is stored. Before the file is saved, the capture script parses the result and
asserts that every `filePath` starts with `<PROJECT_ROOT>`; a failure stops the capture and
nothing is written. The scratch folder's absolute path holds an account-name segment, so no
absolute path may reach a committed fixture. Nothing else is edited.
Expected content (believed, to be confirmed by the capture): one entry for `index.js` with one
message, rule `security/detect-eval-with-expression`, severity 2, line 3, message
`eval with argument of type Identifier`
(`node_modules/eslint-plugin-security/rules/detect-eval-with-expression.js` line 26), and one
entry with no messages for `eslint.config.js`.

**`eslint-security-report.capture.json`** — eslint version, eslint-plugin-security version
(3.0.1 by `node_modules/eslint-plugin-security/package.json` line 3), node version, the date,
the command, the exit code, the configuration text, `EVAL_SOURCE`, and the sentence naming
the `<PROJECT_ROOT>` replacement.

### 6. The live-eslint project of criterion 14a, and the no-configuration record

Built by test 5 in a temporary folder outside the repository:
- `index.js` = `EVAL_SOURCE`.
- `eslint.config.js` = `const security = require('eslint-plugin-security');` followed by
  `module.exports = [{ files: ['**/*.js'], plugins: { security }, rules: { 'security/detect-eval-with-expression': 'error' } }];`
  (the plugin's documented setup, one rule).
- `node_modules/eslint/package.json` = `{ "name": "eslint", "version": "<the repository's
  eslint version>", "bin": { "eslint": "./bin/eslint.js" } }`, and
  `node_modules/eslint/bin/eslint.js` = one line,
  `require(<JSON.stringify of the repository's eslint bin script path>);`. eslint's own bin
  script runs its CLI when loaded (`node_modules/eslint/bin/eslint.js` lines 138–196) and reads
  `process.argv`, so the real eslint 9 runs, with the project as its working folder.
- `node_modules/eslint-plugin-security` = a directory link (`'junction'` on win32, `'dir'`
  elsewhere) to the repository's plugin folder. eslint loads `--plugin` names from its working
  folder (`node_modules/eslint/lib/shared/translate-cli-options.js` lines 37–58 and 131,
  `ModuleImporter` with the default working folder) and the configuration loads it from the
  project, so both reach the same file.
- No `package.json`, so no dependency audit starts.

Why a one-line forwarding script and not a directory link for eslint itself: the lookup accepts
eslint only when its real path is inside the project's (or an ancestor's) `node_modules`, and
the temporary folder is outside the repository, so a link to the repository's eslint is refused
by design — the lookup case "eslint linked in from
outside the project is not installed" proves exactly that. Copying eslint and its dependencies
would cost a large copy per run.

Recorded, not tested: the executor runs the same scan once more without `eslint.config.js`
(a scratch script, same seams) and puts the outcome in the build record: eslint's exit code,
its standard error, and the `skipped` entries. If eslint 9 refuses `--plugin` with no
configuration file, that is a finding for the owner, not fixed here. If eslint refuses the
documented configuration together with `--plugin security`, test 5 is red: that is a product
defect found (every project configured the documented way would fail), reported to the owner
with the output, not worked around.

### 7. Counting registry requests (criteria 21 and 22)

Two scratch scripts in `SCRATCH` (the session scratch folder `…/scratchpad/test-speed-build`
that the CTO Chief names in the builder's brief; its absolute path holds an account-name
segment, so it is never written into a committed file or the build record), both Node, never
committed:

- `registry-recorder.js <log file> <port count>`: one `http` server per port on `127.0.0.1`,
  each on port 0; writes the ports to `<log file>.ports.json`; appends one JSON line per
  accepted connection, `{ seq, port, event: 'connection' }` (the server's `'connection'`
  event), and one per request, `{ seq, port, event: 'request', method, url, npmCommand:
  headers['npm-command'] || null }` (a sequence number, no clock time); answers `404` with
  `{"error":"Not found"}`. A client that connects and exits before its request is complete is
  still counted: zero means zero connections, not only zero completed requests.
- `count-registry-requests.js <tree> <out file> <mode>`, where the tree is a checkout folder:
  lists `tests/*.test.js` with `fs.readdirSync` (sorted, as the shell glob of
  `npm run test:raw` lists them) and starts the recorder.
  - The count environment, built for every child from a copy of `process.env`:
    - Deleted: every variable whose name starts with `npm_config_` in any letter case (this
      removes every case variant of `npm_config_update_notifier`, `npm_config_proxy` and
      `npm_config_https_proxy`, and any inherited offline or registry setting that would hide
      a request); every case variant of `HTTP_PROXY`, `HTTPS_PROXY`, `PROXY` and `NO_PROXY`
      (the four names npm's network agent reads in any letter case, `@npmcli/agent`
      `lib/proxy.js` lines 13–21 inside the installed npm); and every variable npm reads to
      decide it runs on a continuous-integration machine. In npm 11.19.1 that decision is
      `ci-info` 4.4.0 (`node_modules/ci-info/index.js` lines 37–50, called from
      `lib/cli/update-notifier.js` line 109): the nine names `BUILD_ID`, `BUILD_NUMBER`, `CI`,
      `CI_APP_ID`, `CI_BUILD_ID`, `CI_BUILD_NUMBER`, `CI_NAME`, `CONTINUOUS_INTEGRATION` and
      `RUN_ID`, plus every name in the `env` field of each vendor in
      `node_modules/ci-info/vendors.json` (a string, a list, `{ env: <name> }`, `{ any: <names> }`
      or name-to-value pairs; the `pr` fields do not affect the decision). Read for this plan
      (vendors.json of ci-info 4.4.0, lines 1–363), the vendor names are: `AGOLA_GIT_REF`,
      `ALPIC_HOST`, `AC_APPCIRCLE`, `APPVEYOR`, `CODEBUILD_BUILD_ARN`, `TF_BUILD`,
      `bamboo_planKey`, `BITBUCKET_COMMIT`, `BITRISE_IO`, `BUDDY_WORKSPACE_ID`, `BUILDKITE`,
      `CIRCLECI`, `CIRRUS_CI`, `CF_PAGES`, `WORKERS_CI`, `CF_BUILD_ID`, `CM_BUILD_ID`,
      `CI_NAME`, `DRONE`, `DSARI`, `EARTHLY_CI`, `EAS_BUILD`, `GERRIT_PROJECT`,
      `GITEA_ACTIONS`, `GITHUB_ACTIONS`, `GITLAB_CI`, `GO_PIPELINE_LABEL`, `BUILDER_OUTPUT`,
      `HARNESS_BUILD_ID`, `NODE` (Heroku: only when its value includes
      `/app/.heroku/node/bin/node`, so it is deleted only then), `HUDSON_URL`, `JENKINS_URL`,
      `BUILD_ID`, `LAYERCI`, `MAGNUM`, `NETLIFY`, `NEVERCODE`, `PROW_JOB_ID`,
      `RELEASE_BUILD_ID`, `RENDER`, `SAILCI`, `SCREWDRIVER`, `SEMAPHORE`, `STRIDER`, `TASK_ID`,
      `RUN_ID`, `TEAMCITY_VERSION`, `TRAVIS`, `VELA`, `NOW_BUILDER`, `VERCEL`,
      `APPCENTER_BUILD_ID`, `CI` (Woodpecker), `CI_XCODE_PROJECT` and `XCS`. The script holds no
      hand-written copy of this list: it reads `vendors.json` at run time from the package
      folder of the installed npm, found from the real path of the first `npm` on `PATH` (never
      by starting npm, which would itself run the update check), so a different npm at build
      time is covered; the list above is for checking the record against.
    - Set, after every case variant of each name was deleted: `npm_config_registry` and
      `COREPACK_NPM_REGISTRY` to the recorder URL; `npm_config_cache` to a new empty folder;
      `npm_config_userconfig` and `npm_config_globalconfig` both to one empty file,
      `SCRATCH/empty-npmrc`; `NO_PROXY` to `127.0.0.1`.
    - Checked before the first count, in one child Node process with that environment:
      `require(<npm package folder>/node_modules/ci-info).isCI` is `false`. Otherwise the count
      stops and the variable that still marks the machine is reported.
    - No config file switches the check off either: the installed npm's built-in config file
      (`<npm package folder>/npmrc`) holds only `prefix` (read), and the repository has no
      `.npmrc` (checked; Step 9 re-checks on BASE).
    - The names actually removed (those that were set) go into the build record by name only,
      never with their values (a proxy value can carry a password).
  - Whole-suite count (the criterion): one `node --test <every file>` in `<tree>` with that
    environment and its recorder port. Result: total connections and requests, and the list
    of paths.
  - File-by-file count (the attribution): eight workers, each owning one recorder port; a
    worker takes the next file and runs `node --test <file>` with that environment, its own
    new empty cache folder and its port; the connections and requests seen on that port
    during that file belong to that file. Every file this pass names is then run once more
    alone (its own port, its own new cache) and is named only if that run also records a
    connection, so a late request from a worker's previous file cannot be pinned on the wrong
    file. Result: connections and requests per file with their paths.
  - `npm_config_update_notifier` is never set to any value (decision 8: nothing is excluded);
    deleting an inherited one is what keeps npm's update check switched on during the count.

Runs: both counts on the base commit (the clone `SCRATCH/base-s2/` of decision 15, checked out
at BASE, its `node_modules` a directory link to this worktree's `node_modules`) **first, before
any edit**; both again on the completion tree. Criterion 21 holds when the whole-suite count
after is zero connections; the file-by-file count after must also be zero for every file
(stronger: with a fresh cache per file, a request that only the first npm of a run would make
cannot hide behind another file).

**npm's own update check — verified by reading, decides part of the scope.** In npm 11.19.1
(the copy under `/opt/homebrew/lib/node_modules/npm`; the suite's npm version is recorded at the
start of the build), every npm command except `--version` starts an update check that is not
awaited (`lib/cli/entry.js` lines 59–65; `--version` returns before it, `lib/npm.js` lines
126–131). It is skipped only when `update-notifier` is false or a continuous-integration
environment is detected (`lib/cli/update-notifier.js` lines 100–115), and otherwise runs when
the marker file in the cache folder is missing or older than a week (lines 15 and 85–97),
fetching npm's own package information from the configured registry. npm then calls
`process.exit` "so we don't hang on things like the update notifier" (`lib/cli/exit-handler.js`
lines 160–164), so a command that ends quickly may exit before the request leaves; one that
runs a script (`npm test`, `npm run lint`) will very likely send it. The CTO Chief's probe saw
such requests (`/npm` twice). Consequence: with a new empty cache, test files that run a real
`npm test` or `npm run` through CTOC's code — by reading, at least
`tests/quality-agent-script-launcher.test.js` (lines 60–93), `tests/greenfield-journey.test.js`
(its run of the verify step), `tests/verify-parses-full-output.test.js` (line 174) and the
hotfix-check files (their projects' `npm test`, run with the test's own environment) — are
expected to be named by the file-by-file count. By the CTO Chief's ruling (decision 13) these
four candidates are declared in `files:` now — `tests/quality-agent-script-launcher.test.js`,
`tests/greenfield-journey.test.js`, `tests/verify-parses-full-output.test.js` and, for the
hotfix-check files, slice 1's shared helper `tests/helpers/hotfix-check-harness.js` (every
hotfix-check file loads it) — and the rule is:
- The file-by-file count runs on the base commit first, before any edit to a candidate.
- A candidate the base count does not name is not edited at all.
- A candidate the base count names gets the smallest change that stops its requests: the
  setting `npm_config_update_notifier` with the value `'false'` in the environment that reaches
  the npm the test starts, with a comment naming this plan and criterion 21. Preferred: the
  environment object of that start, where the test builds one. Where npm is started by CTOC's
  own code with the inherited environment (by reading, all four: the npm launcher of
  `src/lib/quality-agent.js`, `tryCommand` of `src/lib/step-13-verify.js`, which takes no
  environment option, and the hotfix check's test command), the setting goes on `process.env`
  in the narrowest scope the file already has: beside `CTOC_LAUNCHER_PROOF` in the launcher
  test's before and after hooks (lines 53 and 56, its earlier value put back, or deleted when
  it was unset), set and restored in `finally` around each test that starts npm in the other
  two (`tests/verify-parses-full-output.test.js` line 174; the verify step of
  `tests/greenfield-journey.test.js`), and one line at the top of the harness module. Nothing else in
  the file changes.
- A candidate whose requests are anything other than `/npm` (npm's own update check) gets
  `withClosedNpmRegistry` around the test instead.
- A file the base count names that is not declared here goes through `src/lib/scope-growth.js`:
  all such requests are filed together before any edit to a candidate, each carrying that
  file's request log and the same remedy, and the build stops there for the owner's answer.
  If he declines one, criterion 21 is reported as not met, with the remaining requests per file.
- `tests/iron-loop-enforcer.test.js` and `tests/reachability-surface-scan-is-linear.test.js`
  stay untouched even when the count names them: that file's count and request log are
  recorded and reported to the round that owns it, and criterion 21 is then reported as not
  met for that file, with its count.

**Criterion 22 — tests that start npm or npx themselves.** Method: a presence search of
`tests/` for the program names (`'npm'`, `'npx'`, `npm.cmd`, `npx.cmd`, and command strings
beginning `npm ` or `npx `), every match read. By reading at the time of this plan (re-run on
the base commit and recorded in the build record):
- Starts stand-ins, not npm, with an environment that does not inherit:
  `tests/quality-gate-runner-compaction.test.js` lines 272–297 put shell scripts named `npm`
  and `npx` first on `PATH` (`env: { PATH: '<fake bin>:/usr/bin:/bin' }`).
- Answered by a spy: `tests/quality-agent-coverage.test.js` (lines 137–181; cases at lines
  317, 332, 983–1049), `tests/quality-fleet-wiring.test.js` (lines 1007–1016, and the new
  criterion 18 test), `tests/dependency-auditor.test.js` (every `npm` command is answered by an
  `execSync` spy, e.g. lines 370–378, 407–409, 467–470), `tests/sast-runner-coverage.test.js`
  (line 364, changed by this slice).
- Points npm at a closed loopback port: the criterion 19 test, and after this slice the tests
  at `tests/quality-fleet-wiring.test.js` line 472, `tests/quality-agent-coverage.test.js` line
  661 and `tests/framework-security-checker.test.js` line 544.
- Names npm but starts nothing: `tests/stop-test-gate-coverage.test.js` (lines 213–228 read the
  program name only; the three `suite: 'npm'` cases at lines 316, 323 and 338 have the gate off
  or `PATH` emptied, and `runHook` passes `{ ...process.env, … }`, lines 245–260); every other
  match is a string in a fixture or an assertion.
- Starts real npm through CTOC's code with the inherited environment (so the counts above see
  them): the files named in the update-check paragraph.

### 8. Test-first order: what is red on the unchanged `src/lib/sast-runner.js`, and why

- Test 1: red. Today's probe runs `npx eslint --version` through `execSync`; the spy records
  it (program `npx`, arguments naming eslint), so both start assertions fail. Its skip-entry
  assertion is already green today (the spy answers not found): the red comes from the start
  of npx, which is the defect.
- Test 2: red. Both probes start `npx`; with the spy answering not found, the repository's own
  probe answers `false`.
- Tests 3 and 5: red. The probe is `npx`, answered not found, so eslint is skipped: no start of
  `process.execPath` and no `sast[` line.
- Test 4: red. No start at all.
- Lookup cases: red. The "found" cases answer `false`; the "not installed" cases answer
  `false` but record an `npx` start.
- The four changed eslint-path tests (section 4): red. The spy sees a start of `npx`, not
  "exactly one start of that package's bin"; the line-360 test also has its shell probe
  refused.
- The w07 test: red. The spy records an `npx` start, and the recorded error is the spy's
  `ENOENT`, not "eslint is not installed".
- Test-only changes, green on the unchanged product by design (criteria 18, 19, 20 and the
  three closed-registry wraps): their power to fail is shown once each by a deliberate break
  in a scratch copy, recorded: criterion 18 — remove `vulnerabilities` from a copy of the
  recording, and the finding assertion fails; criterion 20 — in a scratch copy of the tree,
  set the default `includeDevDependencies` to `false` (`src/lib/dependency-auditor.js` line
  157), and the command assertion fails on `npm audit --json --omit=dev`; criterion 19 — a
  scratch copy that points `npm_config_registry` at a local server answering every audit
  request with an empty advisory list fails (no skip); the three wraps — the file-by-file count
  shows each file's requests before and none after.

### 9. Measurement (functional plan "How every slice is measured"; criteria 1 and 23)

- Before: slice 1's completion whole-suite run of `/usr/bin/time -p npm run test:raw` when
  nothing else landed in between; otherwise a new run on this slice's base commit.
- After: one whole-suite run of `/usr/bin/time -p npm run test:raw` on the completion tree. Its
  passed, failed and skipped counts are recorded and judged (decision 23): 0 skipped; any failed
  test is a kickback, except a failure confined to `tests/reachability-surface-scan-is-linear.test.js`
  or `tests/iron-loop-enforcer.test.js`, which is re-run alone and recorded (Step 14).
- Paired, interleaved runs (measure a) of the changed files —
  `tests/sast-runner-coverage.test.js`, `tests/sast-runner-failclosed.test.js`,
  `tests/w07-portable-shellouts.test.js`, `tests/quality-fleet-wiring.test.js`,
  `tests/quality-agent-coverage.test.js`, `tests/framework-security-checker.test.js` (and every
  candidate of section 7 that was edited, and any file added by scope growth): before (in the base copy), after, before, after, each
  `/usr/bin/time -p node --test <files>`, with the one-minute load at start and end
  (`sysctl -n vm.loadavg` on macOS). The new test file has no before side; its after time is
  recorded alone. The before side of the three quality files will reach the registry through
  npx; that is the "before".
- For every run: the items of the functional plan's list (command, wall-clock, user plus
  system time, load at start and end, core count, Node version, commit, passed, failed and
  skipped counts, per-file durations and the longest file, installed external scanners), plus
  the npm version and path, and whether `yarn` and `pnpm` on the machine are corepack shims.
- Criterion 23: the wall-clock and processor time of `tests/quality-agent-coverage.test.js`,
  `tests/quality-fleet-wiring.test.js` and `tests/w07-portable-shellouts.test.js` in every pair,
  with the load, beside the whole-suite numbers. Criterion 16: w07's time before (30.4 s in the
  profile) and after.
- "Faster" is written only when every pair agrees, the longest file agrees, and whole-suite
  processor time did not grow; otherwise the record says which measure did not show it.

### 10. Tests to run while building (affected only)

Every test file that requires `src/lib/sast-runner.js`, `src/lib/dependency-auditor.js` or
`src/lib/quality-agent.js`, found by a search of `tests/` for those module names with every
match read (re-run on the base commit, because slice 1 moves the hotfix-check tests):
- sast-runner: `sast-runner-coverage`, `sast-runner-failclosed`, `sast-runner-hardening`,
  `sast-runner-registry`, `remainder-security-tooling-coverage`, `security`,
  `w07-portable-shellouts`, `quality-fleet-wiring`.
- dependency-auditor: `dependency-auditor`, `dependency-auditor-severity`, `security`,
  `quality-agent-coverage`, `quality-fleet-wiring`.
- quality-agent: `secrets-scanner-external-tool-findings`, `migration-safety-checker`,
  `framework-security-checker`, `vacuous-verification`, `push-command-coverage`,
  `quality-agent-script-launcher`, `quality-agent-coverage-holes`, `quality-agent-no-shell`,
  `w10-push-entry-point` (requires it inside a started `node -e`, line 243),
  `test-selection-scope`, `ship-gate-real`, `quality-agent-coverage`, `quality-agent`,
  `quality-agent-crossplatform`, and the hotfix-check files that require it after slice 1.
  (`tests/post-commit-coverage.test.js` line 289 only compares a path string; it does not load
  the module.)
- The new file, every candidate of section 7 that was edited (for the harness: the six
  hotfix-check files that load it), and any file added by scope growth.
- Once after the product change: `tests/lint.test.js` and `tests/typecheck.test.js` (the new
  code must lint with no warning and type-check).

All as `node --test <files>`. The full `npm test` does not run in this slice: by the owner's
order "The full npm test runs once, at completion", it runs once, after the last slice of this
functional plan, run by the CTO Chief (criterion 2, decision 23).

### 11. Counts

One new test file: `node src/scripts/release.js` (VERSION unchanged) rewrites the test-file
count in `CLAUDE.md` ("Run all N test files", "tests/ N test files") and `README.md`
("tests/ N test files") (`src/scripts/release.js` lines 98–104) to one more than at the base
commit. `tests/readme-numbers.test.js` passes; `CLAUDE.md` stays at or under 15,000 bytes (the
count keeps its digit count). `git status` after it shows no file outside `files:` changed.

## Acceptance criteria

- [ ] 1 — Before and after whole-suite runs and the paired runs recorded with every listed
  item and load; "faster" written only under the three measures.
- [ ] 2 — The full `npm test`, run once after the last slice of this functional plan by the
  CTO Chief: 0 failed, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json`; a
  failure confined to the two files another round owns is re-run alone and recorded as the
  functional plan says.
  Open in this slice: the full npm test runs once after the last slice, by the owner's order.
- [ ] 12 — Test 1 green after, red before.
- [ ] 13 — Test 2 green after, red before.
- [ ] 14 — Tests 3 and 4 green after, red before; the record says "not run on Windows".
- [ ] 14a — Test 5 green after, red before; the no-configuration run recorded.
- [ ] 15 — The four eslint-path tests reach their old branch with old assertions unchanged and
  one start of the fake package's bin each.
- [ ] 16 — The w07 test asserts the method resolves, eslint named as not installed, no npx
  start; its time before and after recorded.
- [ ] 17 — `TOOL_CONFIGS` javascript and typescript `command` describe the local start and do
  not name `npx`.
- [ ] 18 — The lodash test holds a dependency finding line for lodash and no dependency-audit
  skip, from the stored recording with its npm version and date.
- [ ] 19 — The live closed-port test green (or red with the defect reported); its duration
  recorded.
- [ ] 20 — No real `npm audit` started in the criterion 18 test; every audit start is
  `npm audit --json` in the fixture folder.
- [ ] 21 — Whole-suite count zero after, counted as connections to the recording server, not
  only completed requests (and the file-by-file count zero for every file); the count
  environment's removed variable names recorded; the base counts recorded with each request's
  path and test file; each candidate of section 7
  edited only when the base count named it; a count from one of the two files another round
  owns recorded and reported to that round, and this criterion then reported as not met for
  that file.
- [ ] 22 — The list of test files that start npm or npx, each classified, recorded.
- [ ] 23 — The three files' times in every pair recorded with the load.
- [ ] The product change is the only `src/` change; lint, type check and the false-green fence
  are green; `README.md` and `CLAUDE.md` counts synced.

## Risks

| Risk | Mitigation |
|---|---|
| npm's own update check makes the counts non-zero from test files that start a real npm | Verified by reading npm's source (section 7). The four candidates are declared; the base file-by-file count names which of them to edit, each with the smallest change; a named file that is not declared goes through scope growth, filed together before any candidate edit; a declined request leaves criterion 21 reported as not met, with numbers |
| The real npm reads a closed registry as a clean pass | Criterion 19 stays red; the captured output goes to the owner; never relaxed |
| eslint 9 refuses the documented plugin configuration together with `--plugin security` | Test 5 red is a product defect found; reported with the output, not worked around |
| A host with eslint in a `node_modules` above the temporary folder | Test 1's first assertion (the walk finds no `node_modules/eslint/package.json` from the project upward) fails loudly instead of passing for the wrong reason. `NODE_PATH` and the global folders cannot change the answer: the lookup never reads them, and the Step 13 probe records it |
| The lookup accepts an ancestor's `node_modules`, so `/node_modules`, `/tmp/node_modules` and `$HOME/node_modules` serve every project below them that has no eslint of its own, and that eslint then runs in the scanned project | Consistent with the CTO Chief's ruling (a `node_modules` of the project or an ancestor); stated, no code change; written into the build record in Step 15. Whoever can write those folders can already change what runs for every project below them |
| Another program binds the closed port between closing and npm's connect | Unlikely; the test then fails loudly and is re-run; never retried inside the test |
| A comment in `sast-runner.js` matching the w07 source fences (`shell: true`, `|| true`, `2>/dev/null`) | Stated in section 1; Step 10's own run of the w07 file catches it |
| A project that loses eslint scanning: eslint only global, Yarn plug-and-play (no `node_modules`), a `node_modules` linked to a folder outside the project and its ancestors, pnpm's global store outside the project | Each gets the loud skip `SAST skipped for javascript: no scanner installed (need semgrep or eslint)`; listed in the build record as the cost the functional plan accepted |
| Windows, with eslint and its plugin installed, can now be blocked by a real finding | That is the scan working; stated in the functional plan; the Windows start is asserted by its arguments, not run |
| A recording goes stale when npm changes its output | The capture file names the npm version; re-capture is three steps; criterion 19 runs the installed npm each time |
| The base copy is a clone, not this worktree: it holds BASE's committed files and a `.git` of its own, but no untracked or ignored file this worktree has (ignored `.ctoc/` runtime state, local settings), and its `node_modules` is this worktree's through a link, not an install made at BASE | The before side is measured in a different tree from the after side, and the record says so. A test file that fails in the base copy is run there once more alone; failing alone too, it is recorded as failing at base with its output and never attributed to this slice. The copy's `git rev-parse HEAD` (equal to BASE) and `git status --short` (empty apart from the `node_modules` link) are recorded after checkout. `--shared` borrows this repository's objects, so nothing is fetched and the clone adds no entry to the shared worktree list |

## Findings outside this slice (for the owner to schedule)

- For one project with `package.json` and `package-lock.json`, `npm audit` runs three times
  (`npm`, then the `yarn` and `pnpm` fallbacks; `src/lib/dependency-auditor.js` lines 186–212
  and 371–376).
- CTOC's own npm starts in a user's project (`npm test`, `npm run lint`, `npm audit`) run npm's
  update check against the registry; passing `npm_config_update_notifier=false` to those starts
  would stop it (`src/lib/quality-agent.js`, `src/lib/step-13-verify.js`,
  `src/lib/dependency-auditor.js`, `src/lib/sca-runner.js`, and the hook
  `src/hooks/stop-test-gate.js`, which needs the owner's approval).
- The eslint start keeps `execFileSync`'s default output limit (1 MB); a project whose report is
  larger records a loud error (fail-closed, not silent).
- SCA prints "javascript deferred to DependencyAuditor" even when npm is not installed (the
  dependency step then skips loudly, so nothing is silent).

## Decisions Taken Under Ambiguity

1. **The lookup is a direct walk plus the ownership rule the CTO Chief set** (the CTO Chief's
   Step 7 ruling; it replaces the `createRequire` resolution of the functional plan's decision
   6, at the same size, and implements the ownership ruling exactly). From the project
   folder's real path upward, the first `<dir>/node_modules/eslint/package.json` that exists
   is the only candidate; it counts when the package folder's real path lies inside a
   `node_modules` of the project or an ancestor, and the bin script (`bin` as a string or
   `bin.eslint`) lies inside the package by real path; the answer cached per scanner is the bin
   script's real path or `null`. No `require.resolve`, no `NODE_PATH`, no global folders, no
   `exports` gate: an eslint whose package does not export `./package.json` is now found, a
   cost the resolver carried and the walk drops. The ownership check runs against the
   `node_modules` of every ancestor, as the existing check did, not only the level where the
   candidate was found: for an unlinked layout the two are the same, and the wider reading also
   accepts a checkout whose `node_modules` is a link into an ancestor's `node_modules` (a
   worktree linked to its main checkout), which test 2's precondition names. Not chosen:
   reading `node_modules/.bin/eslint` (a shell shim on POSIX and a `.cmd` on Windows — neither
   starts without an interpreter there).
2. **`runESLintSecurity` checks again and records `eslint is not installed in this project`**
   (tool `eslint-security`) when called directly on a project without eslint, starting
   nothing; `runSecurityScan` never reaches that branch because it filters on availability
   first.
3. **One shared helper module** (`tests/helpers/security-scan-fixtures.js`) for the fake
   eslint package and the closed-registry environment, used by six test files, instead of six
   copies.
4. **Existing security-scan tests keep real npm and point it at a closed local registry**
   (`tests/quality-fleet-wiring.test.js` line 472, `tests/quality-agent-coverage.test.js` line
   661, `tests/framework-security-checker.test.js` line 544), because their files' headers
   promise no doubles ("Zero mocks", "No test doubles"); the new tests and criterion 18 use
   spies and availability seams as decision 17 of the functional plan says.
5. **The closed-registry environment adds `npm_config_userconfig` (an empty file),
   `npm_config_offline=false` and `COREPACK_NPM_REGISTRY`** to the three settings of criterion
   19: a host user config or an offline setting would otherwise change npm's answer, and a
   corepack shim for yarn or pnpm downloads from its own registry setting. Tighter, not looser.
6. **Criterion 19 also asserts first that npm is installed**, so a host without npm fails
   loudly, and its skip pattern is tightened to `dependency audit skipped (npm): `.
7. **Criterion 18 keeps the two old assertions and adds tighter ones**, including
   `res.passed === false` (lodash 4.17.4 carries critical and high advisories; the fixture check
   asserts the recording does).
8. **Criterion 20's count of audit starts is recorded, not pinned** (three by reading): pinning
   it would freeze the triple run listed as a finding.
9. **Tests 3, 4 and 5 also fix trufflehog and detect-secrets absent** besides semgrep, so a
   host's secrets scanner cannot change their outcome or start a process.
10. **Test 2 also asserts that the repository itself answers available** from the same
    working folder: the answer follows the scanned project, not the working folder.
11. **The live-eslint project uses a one-line forwarding bin script and a directory link for
    the plugin** (section 6); the ownership rule rejects a link to the repository's eslint by
    design, and a lookup case proves it.
12. **Recordings carry a capture file beside them, and the eslint report's capture path is
    replaced by `<PROJECT_ROOT>`**, which the fake bin script fills with its working folder: no
    local path or account name is committed. The path replaced is the capture folder's real
    path (eslint writes physical paths), the capture script asserts before saving that every
    `filePath` starts with `<PROJECT_ROOT>`, and test 3 asserts the same on the committed
    recording first (the spec critic's finding).
13. **The CTO Chief's ruling: npm's own update check counts, and its remedy in the tests that
    start a real npm is inside this slice.** npm's update check is a registry request, and
    zero means zero (the functional plan's decision 8). The owner's slice goal, "Tests never
    reach the npm registry", covers the one-line remedy in the test files that start a real
    npm, so the candidates the plan names (`tests/quality-agent-script-launcher.test.js`,
    `tests/greenfield-journey.test.js`, `tests/verify-parses-full-output.test.js`, and slice
    1's shared helper `tests/helpers/hotfix-check-harness.js`) are declared in `files:` now,
    instead of scope-growth questions filed at the start of the build. The build runs the
    file-by-file request count on the base commit first, then edits ONLY the declared files
    the count names, each with the smallest change that stops the request:
    `npm_config_update_notifier=false` in the environment the test hands to npm, the
    environment object of that start preferred over a process-wide setting (section 7 says
    where each lands by reading). A file the count names that is not declared goes through
    `src/lib/scope-growth.js`. `tests/iron-loop-enforcer.test.js` and
    `tests/reachability-surface-scan-is-linear.test.js` stay untouched even if the count names
    them; that file's count is recorded and reported to the round that owns it. This slice
    depends on slice 1, because the harness exists only after slice 1. Not chosen: changing
    CTOC's product code to disable the check (four modules and one hook, a behaviour change
    for users; listed as a finding), or setting it in the count's environment (decision 8
    excludes nothing).
14. **The registry count adds a file-by-file pass** with its own cache and port per file, both
    on the base commit (for attribution) and after (zero required for every file).
15. **The "before" side runs in a clone of this worktree checked out at BASE** (the spec
    critic's finding): `git clone --shared --no-checkout <this worktree> SCRATCH/base-s2`, then
    `git -C SCRATCH/base-s2 checkout --detach <BASE>`, with `node_modules` a directory link to
    this worktree's. A clone does not touch the shared worktree list; `--shared` borrows the
    objects, so nothing is fetched; unlike an archive it carries a `.git`, so tests that read
    git history see BASE's. Not `git worktree add`, which would change the shared repository's
    list of worktrees. The earlier risk row said "same method as the baseline", which was not
    true; the row now states how the copy differs from the worktree.
16. **This slice is over the one-to-three-file target**: the product change and every test
    that pins the old start must change together, or the suite is red between them; the
    fixtures and the helper are data and support for those tests.
17. **The output limit of the eslint start is not raised** here (not asked; listed as a
    finding).
18. **Execution steps in standard mode, not the refinement loop** (integrator, Step 7). The
    gate (`shouldRunLoop` in `src/lib/refinement-loop.js`, line 491) runs the loop for the
    effort tiers `high` and `xhigh`; this plan's frontmatter says `effort: large`. No path in
    `files:` matches a glob in `.ctoc/config/refinement-triggers.yaml` (read in full;
    `tests/fixtures/security-scan/` is not a `security` folder, and `src/lib/sast-runner.js`
    sits in no risk folder). Steps 12 to 14 are single-pass checks; the security weight of
    the product change is carried by Step 11's security-scanner pass and Step 13.
19. **Test-first order across Steps 8 to 10.** Step 8 writes the helper module, the new test
    file, the four changed eslint-path tests and the w07 change, and runs them red on the
    unchanged `src/lib/sast-runner.js`. Test 3 reads the recorded eslint report to find the
    finding's line, so its counted red run comes after the Step 9 capture, before any Step 10
    edit; a Step 8 failure of test 3 on the missing fixture is not counted as its red, and
    because the recording is read inside test 3's body, that failure touches no other test. The
    test-only changes (criteria 18, 19, 20, the three closed-registry wraps and the
    update-check lines) need the recordings or the base count, so they are written first in
    Step 10, before the product change, and their power to fail is shown by the deliberate
    breaks of section 8.
20. **Step 9 makes the before side; the interleaved pairs run in Step 14.** Measure (a) is
    before, after, before, after, so it cannot run before the after tree exists. Step 9 makes
    the base copy, runs the base request counts, and takes one reference before-run of the
    changed files with its load; the four interleaved runs, before side from the base copy,
    run in Step 14.
21. **Lint and type check run through the repository's own programs**,
    `node node_modules/eslint/bin/eslint.js --max-warnings 0 .` and
    `node --test tests/typecheck.test.js` (the bodies of `npm run lint` and `npm run
    typecheck`, `package.json` lines 14 and 16), so no build step starts npm or npx for them.
    The full `npm test`, run once by the CTO Chief after the last slice (decision 23), is the
    gate and starts npm by design (the functional plan's decision 9).
22. **Step 11 runs three reviews by area plus one security pass, in parallel, dispatched by the
    CTO Chief.** Areas: the product change; the test changes; the fixtures and the helper. The
    builder holds no dispatch tool and writes the review packets; the reviewers are
    `iron-loop-critic` at extra-high effort, the security pass is `security-scanner` on the
    product change; at most two fix rounds.
23. **The full `npm test` runs once, after the last slice, by the CTO Chief** (the CTO Chief's
    Step 7 ruling, by the owner's order "The full npm test runs once, at completion"). This
    slice's Step 14 runs the affected tests, lint, the type check and the measurement runs; the
    whole-suite `node --test` timing run's failed and skipped counts are recorded and judged (0
    skipped; a failure is a kickback unless it is confined to
    `tests/reachability-surface-scan-is-linear.test.js` or `tests/iron-loop-enforcer.test.js`,
    which is re-run alone and recorded). Criterion 2 stays unticked here, with the reason "the
    full npm test runs once after the last slice, by the owner's order", until that final run.
    The coverage floor is checked by that final run only.
24. **Test 1's and test 2's preconditions use the lookup's own walk, not Node's resolver.**
    The functional plan's criterion 12 says the test first asserts that "resolving
    `eslint/package.json` from the project fails"; with the direct walk of decision 1, resolving
    means that walk, so test 1 asserts the walk finds nothing from the temporary project
    upward. A Node-resolver check would fail on a host with eslint in `NODE_PATH` or a global
    folder, which no longer changes the product's answer.
    Test 2's precondition (the spec critic's finding) also asserts the found package's real
    path lies inside the repository's or an ancestor's `node_modules`, and names the layout in
    its message; Step 9 records whether `node_modules` is a link and where it points.
25. **The count environment deletes every inherited `npm_config_*` variable, in any letter
    case**, not only the three the spec critic named (`npm_config_update_notifier`,
    `npm_config_proxy`, `npm_config_https_proxy`), and every case variant of `PROXY` beside
    `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY`, because npm's agent reads all four
    (`@npmcli/agent` `lib/proxy.js` line 13). Any inherited npm setting (offline, prefer-offline,
    a registry in upper case) could otherwise hide a request and give a false zero. The
    continuous-integration names are derived at run time from the installed npm's own
    `ci-info` `vendors.json` plus the nine generic names, and the result is checked by
    `ci-info`'s own `isCI` under that environment; not chosen: setting `CI=false`, which
    `ci-info` honours (`index.js` line 38) but which test code reading `process.env.CI` as a
    plain truthy string would take for a continuous-integration machine.
26. **The scratch folder's absolute path is no longer written in this plan.** It held an
    account-name segment; the plan names it `SCRATCH`, and the CTO Chief gives the path in the
    builder's brief, so no committed file carries it (the owner's rule: no personal information
    on GitHub).
27. **Two lookup cases added (the spec critic's finding):** a `bin` folder linked to a folder
    outside the package, and an absolute `bin` path to an existing file outside the package;
    both give "not installed", by the containment check on the script's real path. The Step 13
    probe also points `HOME` and `USERPROFILE` at a temporary home holding
    `.node_modules/eslint`, with a control line showing Node's resolver finds it there while
    the lookup answers "not installed".

---

## Execution Plan (Steps 8-16)

Mode: standard, single pass (decision 18). `SCRATCH` is the build's scratch folder
`test-speed-build` that the CTO Chief names, with its absolute path, in the builder's brief
(section 7; decision 26). BASE is this slice's base commit, slice 1's completion commit;
`SCRATCH/base-s2/` is the clone of this worktree checked out at BASE (decision 15). Every command runs from this worktree's root. Every timed run
records the items of section 9. No two timed runs or counts overlap. A run that can pass 10
minutes is started in the background and the turn ends; never a loop that sleeps and checks a
file. The builder runs no `menu` command and commits nothing at any step.

### Step 8: TEST (TDD Red)
- [ ] Confirm `git diff --quiet HEAD -- src/lib/sast-runner.js` exits 0 and that `tests/security-scan-never-downloads-a-scanner.test.js` and `tests/helpers/security-scan-fixtures.js` do not exist yet, so every red run below is taken against the unchanged product
- [ ] Write `tests/helpers/security-scan-fixtures.js` as section 2 says: `makeFakeEslintProject`, `closedLoopbackPort`, `withClosedNpmRegistry` (the six variables put back exactly in `finally`, deleted when they were unset, the folder removed); CommonJS, `node:` built-ins only, JSDoc on each export, no assertion inside
- [ ] Write `tests/security-scan-never-downloads-a-scanner.test.js` as section 3 says: the in-file harness (`REAL`, `FLEET`, `withScan`, `semgrepAbsent`, `isNpx`, `namesEslint`, `eslintManifestsAbove`, `REPORT_PATH`, `EVAL_SOURCE`), nothing from `src/` required at the top and no fixture read at file load, and the tests under their exact titles: test 1 (criterion 12, its first assertion that the walk finds no `node_modules/eslint/package.json` from the project upward), test 2 (criterion 13, its two-part precondition naming the layout), tests 3 and 4 (criterion 14; test 3 reads the recording inside its body and first asserts every `filePath` starts with `<PROJECT_ROOT>`), test 5 (criterion 14a, the section 6 project in a temporary folder outside the repository), and the ten lookup cases of test 6
- [ ] In that file every start a spy refuses throws the `ENOENT` error of section 3, so no red run starts a real npx, npm or eslint; every temporary folder is removed in `finally`; `process.chdir` (test 2) and `process.platform` (test 4) are put back in `finally`
- [ ] `tests/sast-runner-failclosed.test.js` line 79: the change of section 4 (fake project, start recorded, the old assertion word for word, the one-start assertion added, a comment saying why the spy moved from npx to the new start)
- [ ] `tests/sast-runner-coverage.test.js` lines 291, 313 and 360: the three changes of section 4, each keeping every old assertion word for word and adding the one-start assertion and the comment; line 360's `execSync` spy throws `no shell command may run here`
- [ ] `tests/w07-portable-shellouts.test.js` line 64: the change of section 4 (spies on `execFileSync`, `execSync` and `spawnSync` installed before the fresh `require`, recording and refusing every start; the old `doesNotReject` kept; the three added assertions; the comment at lines 68 to 70 and point (b) of the header rewritten as section 4 quotes; the real functions back in `finally`)
- [ ] Lint the five files: `node node_modules/eslint/bin/eslint.js --max-warnings 0 tests/helpers/security-scan-fixtures.js tests/security-scan-never-downloads-a-scanner.test.js tests/sast-runner-failclosed.test.js tests/sast-runner-coverage.test.js tests/w07-portable-shellouts.test.js`; 0 errors and 0 warnings, so no red run below fails on a syntax error or an undefined name
- [ ] Run `node --test tests/security-scan-never-downloads-a-scanner.test.js` on the unchanged product and confirm, by reading each failure message, that each test is red for the reason section 8 states:
  - test 1 fails on its two start assertions, the spy having recorded `npx` with arguments naming eslint (today's probe `npx eslint --version`); its first assertion passes
  - test 2 fails: the repository's own probe answers `false`, its `npx` start refused by the spy, and `starts` is not empty
  - test 3 fails on reading the recording, which does not exist yet, and this run is not its counted red (decision 19): its counted red run comes after the eslint report is captured, in the preparation step; every other test of the file runs, because nothing is read at file load
  - test 4 fails: no start of `process.execPath` at all
  - test 5 fails: the probe is `npx`, answered not found, so eslint never starts and the details hold no `sast` finding line
  - the lookup cases: each "is found" case answers `false`; each "not installed" case fails on its `starts` assertion, an `npx` start having been recorded
- [ ] Run `node --test tests/sast-runner-failclosed.test.js tests/sast-runner-coverage.test.js tests/w07-portable-shellouts.test.js` and confirm the five changed tests red for the reason section 8 states: the four eslint-path tests on their one-start assertion (the spy saw `npx`, not one start of the fake package's bin), line 360 also with its shell probe refused; the w07 test on `eslint is not installed` (the recorded error is the spy's `ENOENT`) and on its empty-`starts` assertion (an `npx` start was recorded); every unchanged test in the three files passes
- [ ] A red for any other reason (a require error, a missing helper export, a setup error, a wrong path) is a fault in the test, fixed in the test and run again; a red that cannot be brought to its stated reason stops the build and goes to the CTO Chief with the output
- [ ] Confirm from the spies' records that every start in these red runs was answered by a spy, so no red run reached a registry
- [ ] Quote each red run's failure lines in the build record, every absolute path rewritten relative to the repository root or `SCRATCH`

### Step 9: PREPARE
- [ ] Confirm slice 1 has landed on BASE: `tests/helpers/hotfix-check-harness.js` and the six hotfix-check test files exist at `HEAD`; otherwise stop and report to the CTO Chief, because this slice depends on slice 1 and its harness
- [ ] Record BASE (`git rev-parse HEAD` before this slice's first commit), `node --version`, `npm --version` and the path of npm (`command -v npm`), whether `yarn` and `pnpm` on the machine are corepack shims, the core count (`node -p "require('os').availableParallelism()"`), and which of semgrep, osv-scanner, trufflehog, detect-secrets, gosec and bandit `command -v` finds
- [ ] Confirm `node_modules/eslint/bin/eslint.js`, `node_modules/eslint-plugin-security/package.json` and `node_modules/typescript` exist; install nothing. If one is missing, stop and report to the CTO Chief: `node_modules` is already installed in this worktree, and the npm audit capture below stays the build's only registry contact
- [ ] Record whether this worktree's `node_modules` is a link (`fs.lstatSync('node_modules').isSymbolicLink()`) and, if so, where it points, named relative to the repository (for example "the main checkout's `node_modules`, an ancestor of this worktree") and never as a home-folder path; test 2's precondition depends on this layout
- [ ] Make `SCRATCH/base-s2/` (decision 15): `git clone --shared --no-checkout <this worktree> SCRATCH/base-s2`, then `git -C SCRATCH/base-s2 checkout --detach <BASE>`, then `node_modules` in it a directory link to this worktree's `node_modules` (a junction on Windows); never `git worktree add`, never `git archive`. Record `git -C SCRATCH/base-s2 rev-parse HEAD` (must equal BASE) and `git -C SCRATCH/base-s2 status --short` (empty apart from the `node_modules` link). The copy holds BASE's own files, so the files Step 8 wrote do not reach it
- [ ] Confirm, on BASE, that the repository holds no `.npmrc` and that the installed npm's built-in config file holds no `update-notifier` setting (section 7)
- [ ] Write the two scratch scripts of section 7, `SCRATCH/registry-recorder.js` and `SCRATCH/count-registry-requests.js`: Node only; the recorder bound to `127.0.0.1` only, logging every `'connection'` event and every request per port, answering 404; every child started with an argument list and no shell, with the count environment of section 7 (every `npm_config_*` variable in any letter case, the four proxy names in any letter case and npm's continuous-integration names deleted; registry, Corepack registry, a new empty cache, one empty file as both user and global config, and `NO_PROXY=127.0.0.1` set); a new empty `npm_config_cache` folder per whole-suite run and per file; `npm_config_update_notifier` never set (decision 8)
- [ ] Before the first count, run the check of section 7: in one child Node process with the count environment, the installed npm's `ci-info` answers `isCI` false; record the names the environment builder removed (names only, never values)
- [ ] The before request counts on `SCRATCH/base-s2/`, before any edit to a candidate of section 7: the whole-suite count (one `node --test` over every `tests/*.test.js`, a fresh empty `npm_config_cache`), then the file-by-file count (eight workers, one port and one fresh empty cache per file, every named file confirmed by a second run alone). Each count can pass 10 minutes: start it in the background and end the turn. Record the totals of connections and of requests and, per request, its path, method, `npm-command` header and the test file it belongs to, and every connection that carried no complete request (criterion 21's before side)
- [ ] Classify every file the base file-by-file count names, and record the list:
  - a candidate of section 7 (the launcher test, greenfield-journey, verify-parses-full-output, or a hotfix-check file, whose remedy goes in the harness): edited in the implementation step by the rule of section 7, and only then
  - `tests/iron-loop-enforcer.test.js` or `tests/reachability-surface-scan-is-linear.test.js`: never edited; its count and request log go into the build record and to the CTO Chief for the round that owns it
  - one of the six test files section 4 already changes: its requests must be gone after section 4's changes, checked by the after count
  - any other file: a scope-growth request, below
- [ ] For every file of the last group, file one request with `requestScopeGrowth` of `src/lib/scope-growth.js` (all seven fields: `file` the test file; `blocked_write` the remedy of section 7; `forced_by` this plan's criterion 21 and the base count's lines for that file, with `forced_by_declared` recorded as returned; `acceptance_criterion` 21; `if_refused` that criterion 21 is reported as not met with that file's requests), all of them together; then record what landed under `## Execution Record` and end the turn, as the builder's Rule 5 says; the build resumes on the owner's answer
- [ ] Re-run the criterion 22 presence search of `tests/` on BASE (the program names `'npm'`, `'npx'`, `npm.cmd`, `npx.cmd`, and command strings beginning `npm ` or `npx `), read every match, and record the classification of section 7 together with any file the planning-time reading missed
- [ ] Re-run the affected-test search of section 10 on BASE (every test file that requires `src/lib/sast-runner.js`, `src/lib/dependency-auditor.js` or `src/lib/quality-agent.js`, every match read) and record the list the verify step runs
- [ ] Capture the npm audit recording, the build's only registry contact, outside the test suite, by the three steps of section 5: the two lodash files of `tests/quality-fleet-wiring.test.js` lines 265 to 281 written byte for byte into a new scratch folder; `npm config get registry` recorded and equal to `https://registry.npmjs.org/`; `npm audit --json` run there with standard output saved byte for byte as `tests/fixtures/security-scan/npm-audit-lodash-4.17.4.json`; its exit code recorded (1 expected); `metadata.vulnerabilities` critical plus high at least 1
- [ ] Search the npm recording for a local path, a user name or a host name; a hit stops the capture and goes to the CTO Chief
- [ ] Write `tests/fixtures/security-scan/npm-audit-lodash-4.17.4.capture.json` with the fields of section 5: command, npm and node versions, capture date, exit code, registry, the fixture sentence
- [ ] Capture the eslint report: build the section 6 project in a new scratch folder outside the repository (`index.js` holding `EVAL_SOURCE`, the one-rule `eslint.config.js`, the plugin as a directory link), run `node <repository>/node_modules/eslint/bin/eslint.js --plugin security --format json .` there, save standard output, replace the capture folder's real path, `fs.realpathSync(captureDir)` (eslint writes physical paths, `/var` as `/private/var`), in every `filePath` by `<PROJECT_ROOT>` (the separator after it kept as written), parse the result and assert that every `filePath` starts with `<PROJECT_ROOT>` (a failure stops the capture and nothing is written), and only then write it as `tests/fixtures/security-scan/eslint-security-report.json`; nothing else edited. The scratch folder's absolute path holds an account-name segment, so no absolute path may reach this committed fixture
- [ ] Confirm the eslint report holds the content section 5 expects (one `index.js` message, rule `security/detect-eval-with-expression`, severity 2, line 3); a different content is recorded, and test 3 reads its line from the recording, never from the belief
- [ ] Write `tests/fixtures/security-scan/eslint-security-report.capture.json` with the fields of section 5: eslint and plugin versions, node version, date, command, exit code, the configuration text, `EVAL_SOURCE`, the sentence naming the `<PROJECT_ROOT>` replacement
- [ ] Search both recordings and both capture files for the worktree path, the home folder, the account name, a host name, and anything shaped like a key or token; none may appear
- [ ] The counted red run of test 3, now that the report exists, still on the unchanged product: `node --test --test-name-pattern="its finding blocks the push" tests/security-scan-never-downloads-a-scanner.test.js`; red because the probe is `npx`, answered not found, so the fake eslint never starts and the details hold no `sast` finding line; quoted in the build record
- [ ] The before whole-suite timing run: slice 1's completion whole-suite run when `git log` shows nothing else landed between it and BASE; otherwise `/usr/bin/time -p npm run test:raw` in `SCRATCH/base-s2/`, with the one-minute load at start and end
- [ ] One reference before-run of the changed files from the base copy, with the load at start and end (`sysctl -n vm.loadavg` on macOS): `/usr/bin/time -p node --test` in `SCRATCH/base-s2/` over the six test files of section 9 and every candidate the base count named; w07's duration in it is criterion 16's reference; the interleaved pairs run in the verify step (decision 20)

### Step 10: IMPLEMENT
- [ ] Order inside this step: the test-only changes first, each run on the unchanged product (green by design) and shown able to fail by its deliberate break; then the update-check lines; then the product change; then the counts
- [ ] `tests/quality-fleet-wiring.test.js`: the two requires at the top (section 4); the test at line 285 renamed and rewritten as section 4 says (the two old assertions word for word; the fixture check of the capture file; the `execSync` and `execFileSync` spies; `SecretsScanner` availability false through `t.mock.method`; the new assertions: a `dependency` finding line naming lodash, `loudSkip` false, `res.passed === false`, at least one `npm audit` start and every one exactly `npm audit --json` with `cwd` the fixture folder); the new LIVE test right after it in the same `describe` (criterion 19), its real-npm precondition first and `withClosedNpmRegistry` around the scan; the test at line 472 wrapped in `withClosedNpmRegistry` with the comment, every assertion unchanged
- [ ] `tests/quality-agent-coverage.test.js`: require `withClosedNpmRegistry`; the `captureLog` call of the test at line 661 wrapped, with the comment; assertions unchanged
- [ ] `tests/framework-security-checker.test.js`: require `withClosedNpmRegistry`; the call at line 545 wrapped, with the comment; assertions unchanged; the header's "Zero mocks" stays true
- [ ] Run the three files on the unchanged product: `node --test tests/quality-fleet-wiring.test.js tests/quality-agent-coverage.test.js tests/framework-security-checker.test.js`; every test passes; the LIVE test's duration and full `skipped` list go into the build record. If the LIVE test reads the closed registry as a clean pass it stays red, its captured output goes to the CTO Chief for the owner, and its assertion is never relaxed
- [ ] The deliberate breaks of section 8, each in a scratch copy and never in the worktree, each recorded with the assertion that failed: criterion 18, a copy of the recording without `vulnerabilities`, fails the finding assertion; criterion 20, a scratch copy of the tree whose `includeDevDependencies` defaults to `false` (`src/lib/dependency-auditor.js` line 157), fails the command assertion on `npm audit --json --omit=dev`; criterion 19, a scratch copy pointing `npm_config_registry` at a local server that answers every audit request with an empty advisory list, fails for want of the dependency-audit entry
- [ ] Each candidate of section 7 that the base file-by-file count named, and no other, gets the smallest change of section 7 with a comment naming this plan and criterion 21:
  - `tests/quality-agent-script-launcher.test.js`: `npm_config_update_notifier` set to `'false'` in the `before` hook beside `CTOC_LAUNCHER_PROOF` (line 53), its earlier value put back, or deleted when it was unset, in the `after` hook (line 56)
  - `tests/verify-parses-full-output.test.js`: set, and restored in `finally`, around the test that calls `verify.tryCommand('npm test', …)` (line 174)
  - `tests/greenfield-journey.test.js`: set, and restored in `finally`, around the test that runs the real verify step
  - `tests/helpers/hotfix-check-harness.js`: one line after its requires, `process.env.npm_config_update_notifier = 'false';`
  - where reading the file shows the test itself builds the environment object of the npm start, the setting goes into that object instead, as the ruling prefers, and the record says so
  - a candidate whose base requests are anything other than `/npm` gets `withClosedNpmRegistry` around the test instead
  - nothing else in a candidate changes: `git diff --stat` on each shows only those lines
- [ ] Run each edited candidate (for the harness, the six hotfix-check files in one `node --test` call): every test passes, 0 failed and 0 skipped
- [ ] `src/lib/sast-runner.js`, the whole product diff of section 1 and nothing more: no new import; `isStrictlyInside` and `findProjectEslintBin` (the direct walk of decision 1, no `require.resolve`) after `TOOL_CONFIGS` and before `class SASTRunner`, as written there; `this._eslintBin = undefined` with its type comment in the constructor; `projectEslintBin()` right before `isToolAvailable`; the eslint line and its comment first in `isToolAvailable`, and the `npx eslint --version` entry deleted from `checks`; `runESLintSecurity()` with the new doc comment, the not-installed branch, the start `execFileSync(process.execPath, args, …)` with `cwd`, `timeout`, `encoding` and `stdio` as section 1 writes them, the one changed comment, and the output handling otherwise byte for byte; the two `TOOL_CONFIGS` `command` texts and the one-line comment above them
- [ ] Check the static fences of section 1 on the new text: no comment or code holds the literal `2>/dev/null`, the literal `|| true`, or text matching `/shell:\s*true/`; the new catch is not empty; every file-system call on a computed path goes through `safeFs`
- [ ] Run the new file and the files changed in Step 8: `node --test tests/security-scan-never-downloads-a-scanner.test.js tests/sast-runner-failclosed.test.js tests/sast-runner-coverage.test.js tests/w07-portable-shellouts.test.js`; all pass; the record pairs each red of Steps 8 and 9 with its green
- [ ] If test 5 fails because eslint refuses the documented configuration together with `--plugin security`, stop: that is a product defect found, reported to the CTO Chief with the output, never worked around
- [ ] The no-configuration run of section 6, once, as a scratch script with the same seams on the section 6 project without `eslint.config.js`: record eslint's exit code, its standard error and the `skipped` entries; a refusal of `--plugin` with no configuration file is a finding for the owner, not fixed here
- [ ] Run `node src/scripts/release.js` with `VERSION` unchanged; confirm `git diff --quiet -- VERSION` exits 0, the test-file count in `CLAUDE.md` (both lines) and `README.md` rose by exactly one, `CLAUDE.md` is at most 15,000 bytes (`node -p "require('fs').statSync('CLAUDE.md').size"`), and `git status --short` lists no changed file outside `files:` and this plan; anything else stops the build with the diff kept, reported to the CTO Chief
- [ ] Wiring: no module and no export is added; the product change is reached from `/ctoc:push` through `runSecurityScan` (section "Wiring — the live call sites"); the new test file is run by `npm test` through `tests/*.test.js`; the helper and the fixtures are reached only through the test files that require or read them

### Step 11: REVIEW
- [ ] Self-review first: the product diff against section 1 line by line; every changed test against section 4 (old assertions word for word, the one-start assertion and the comment present); the recordings against section 5; the candidates against section 7
- [ ] Write three review packets into `SCRATCH/review/`, one per area, each holding the plan sections its area is judged against, the diff of its files, the red and green runs, and its questions:
  - the product change, `src/lib/sast-runner.js`: is the ownership rule exactly section 1's (real path inside a `node_modules` of the project or an ancestor, bin script inside the package); can the probe start a process; is the start an argument list with no shell on every platform; are the w07 and false-green fences respected; did anything outside section 1 change
  - the test changes, the new test file, the six test files of section 4 and the edited candidates: does each test fail for the reason it names and pass only for the right one; is every old assertion kept word for word; does any test start a real process other than the one under test; does any test assert wall-clock time; does each candidate change only the update-check setting
  - the fixtures and the helper, `tests/helpers/security-scan-fixtures.js` and the four files under `tests/fixtures/security-scan/`: are the recordings byte for byte as captured apart from the `<PROJECT_ROOT>` replacement; do they hold no local path, account name or secret; does `withClosedNpmRegistry` restore every variable exactly; is the closed port closed
- [ ] Hand the three packets to the CTO Chief with the recommendation to dispatch three `iron-loop-critic` reviews in parallel at extra-high effort, one per area, and one `security-scanner` pass on the product change (the eslint lookup and start as an attack surface: directory links, `NODE_PATH` and the global folders, a hostile `bin` value, a path that climbs out of the package); the builder dispatches nothing itself
- [ ] Fix round 1: each accepted finding fixed in the declared files only, then that area's affected tests re-run; each finding recorded with its fix or its written rejection
- [ ] Fix round 2, only for the areas round 1 changed: the same; a third round is never run, and what remains goes to the CTO Chief, one line each
- [ ] A finding outside this slice's goal is listed in the build record in one line, for the owner to schedule

### Step 12: OPTIMIZE
- [ ] Confirm the lookup runs at most once per scanner object: `projectEslintBin()` caches the answer and the probe and the run read the same cache (the lookup case "the answer is kept for the life of one scanner" passes)
- [ ] Confirm the probe starts no process (tests 2 and 6 assert `starts` is empty) and the scan starts eslint once (tests 3 and 5 assert exactly one start)
- [ ] Confirm nothing is duplicated: the fake eslint package and the closed registry come only from the helper, and no test file carries its own copy
- [ ] Read each new test's `duration_ms` from `node --test --test-reporter=tap tests/security-scan-never-downloads-a-scanner.test.js` and record them: tests 1 to 4 and the lookup cases are expected under 100 ms each; test 5 (the real eslint) and the LIVE test are medium tests whose names say the boundary they cross; a slower case is recorded with the load and examined, never asserted inside a test
- [ ] Confirm no new or changed test asserts wall-clock time

### Step 13: SECURE
- [ ] The eslint resolution cannot be redirected outside the project's own `node_modules` and its ancestors': read `findProjectEslintBin` against section 1 (a direct walk, no `require.resolve`), and confirm with the passing lookup cases (a link from outside the project, a relative `bin` outside the package, a `bin` folder linked outside the package, an absolute `bin` outside the package, an unusable folder: each answers not installed)
- [ ] One scratch probe, never committed, in a new temporary folder holding `project/` (a `package.json` and `index.js`, no eslint) and `home/.node_modules/eslint` (a fake package with a bin script inside it, from `makeFakeEslintProject`'s layout), each case in its own child Node process: (a) `NODE_PATH` set to this repository's `node_modules`; (b) `HOME` and `USERPROFILE` set to `home/`, `NODE_PATH` deleted. In each child, the control line first: `require('module').createRequire(path.join(project, 'noop.js')).resolve('eslint/package.json')` succeeds (Node's resolver does read that folder), then `new SASTRunner(project).isToolAvailable('eslint')` answers `false`. Record both lines of both cases; a control line that fails is recorded as such (the probe then shows nothing for that case, and the record says so), and a lookup answering `true` is a defect sent to the CTO Chief
- [ ] No shell: the eslint start is `execFileSync` with `process.execPath` and an argument list, and its options hold no `shell` key (test 3 asserts `opts.shell === undefined`, test 4 the win32 arguments with no `.cmd`); `tests/w07-portable-shellouts.test.js` passes its source fences
- [ ] No registry from the product: read every line of `src/lib/sast-runner.js` that a presence search for `npx` lists; each is a comment saying npx is no longer used, and no start names npx
- [ ] The fixtures hold no secret: the four files under `tests/fixtures/security-scan/` and the helper read in full for any key, token, password, local path, account name or host name; a hit is named by file and line, never copied
- [ ] The scratch scripts: the recorder binds `127.0.0.1` only; every child starts with an argument list and no shell; links are made only inside `SCRATCH`; nothing is deleted through a link
- [ ] Every finding of the Step 11 security-scanner pass is fixed, or recorded as open with its reason for the CTO Chief
- [ ] The build record names no home-folder path, account name or e-mail address; every path is relative to the repository root or `SCRATCH`

### Step 14: VERIFY
- [ ] While building, only affected tests ran, by name: the list recorded in the preparation step (section 10), the new file, the edited candidates (for the harness, the six hotfix-check files), and once after the product change `tests/lint.test.js` and `tests/typecheck.test.js`; run that whole list once more after the last review fix, 0 failed and 0 skipped
- [ ] Lint with 0 warnings: `node node_modules/eslint/bin/eslint.js --max-warnings 0 .`; type check: `node --test tests/typecheck.test.js`; the false-green fence: `node --test tests/false-green-fence.test.js` with `.ctoc/false-green-baseline.json` unchanged; reachability: `node --test tests/reachability.test.js tests/export-reachability.test.js`
- [ ] The after request counts on the worktree with this slice's changes, with the same scripts and settings as the preparation step (the count environment of section 7, its `isCI` check passing again, a fresh empty `npm_config_cache` per run and per file, `npm_config_update_notifier` never set): the whole-suite count must be zero connections, and the file-by-file count zero connections for every file. Each can pass 10 minutes: start it in the background and end the turn. A request from `tests/iron-loop-enforcer.test.js` or `tests/reachability-surface-scan-is-linear.test.js` is recorded with its log and reported to the CTO Chief for the round that owns the file, and criterion 21 stays open for that file; any other request is a kickback to the implementation step
- [ ] The after measurements: the after whole-suite run, `/usr/bin/time -p npm run test:raw` on the completion tree, with the load at start and end, its passed, failed and skipped counts recorded (0 skipped; a failed test is a kickback to the step that caused it, except under the rule for the two files another round owns, below); then the four interleaved runs of section 9 in order, before (in `SCRATCH/base-s2/`), after, before, after, each `/usr/bin/time -p node --test <the changed files>` with the load at start and end; the new test file's after time alone
- [ ] Record for every run the items of section 9; per pair, the wall-clock and processor time of `tests/quality-agent-coverage.test.js`, `tests/quality-fleet-wiring.test.js` and `tests/w07-portable-shellouts.test.js` with the load (criterion 23), and w07's before and after time (criterion 16); write "faster" only when every pair agrees, the longest file agrees and whole-suite processor time did not grow, otherwise name the measure that did not show it, with its numbers (criterion 1)
- [ ] The full `npm test` is not run in this slice (decision 23): it runs once, after the last slice of this functional plan, run by the CTO Chief, by the owner's order "The full npm test runs once, at completion". Criterion 2 stays open with the reason written under it; the coverage floor is checked by that final run
- [ ] The rule for the two files another round owns, applied to the after whole-suite timing run and to every affected-test run of this step: a failure confined to `tests/reachability-surface-scan-is-linear.test.js` or `tests/iron-loop-enforcer.test.js` is re-run alone with `node --test <that file>` and recorded beside the failed run's one-minute load; a file still failing alone is recorded with this run's load numbers and goes to the CTO Chief for the round that owns it; neither file is ever edited; any other failure is a kickback to the step that caused it

### Step 15: DOCUMENT
- [ ] Write the build record under `## Execution Record` at the end of this plan: the red runs and their greens; the machine facts, including whether `node_modules` is a link and where it points; the base copy's `rev-parse` and `status` lines; the count environment's removed variable names (names only) and its `isCI` check; the base and after request counts (whole suite and per file, connections and requests, each request's path and test file); the classification of every named file, every scope-growth request with its answer, and each candidate edited with the line it got; the criterion 22 list; both capture records; the LIVE test's duration and `skipped` list; the no-configuration run; the deliberate breaks; every timed run with its items and the paired-run table; the release diff summary; each review finding with its fix, rejection or hand-off; the Step 13 probe's four lines (two cases, control and lookup); the after whole-suite timing run's passed, failed and skipped counts; any re-run of the two foreign files with its load; the line "the full npm test runs once after the last slice, by the owner's order" in place of a full-suite gate result; and "not run on Windows" for test 4
- [ ] List in the record the projects that now get the loud eslint message instead of a scan (the risk row on projects that lose eslint scanning), as the cost the functional plan accepted
- [ ] State in the record that the lookup accepts an ancestor's `node_modules`, so `/node_modules`, `/tmp/node_modules` and `$HOME/node_modules` serve every project below them that has no eslint of its own, consistent with the CTO Chief's ruling and changed by no code (the risk row on ancestors)
- [ ] Every comment the change touches says what the code does now: the doc comments of section 1, the w07 header's point (b), the comment on each moved spy, each closed-registry wrap and each update-check line; no other documentation file and no CHANGELOG entry (VERSION does not change here)

### Step 16: FINAL-REVIEW
- [ ] Every box of Steps 8 to 15 is ticked only for work done and seen
- [ ] Verify each acceptance criterion (1, 2, 12, 13, 14, 14a, 15 to 23, and the product-change line) against the evidence it names, by running it or reading the recorded output, and tick its box `- [x]` only then; a criterion that cannot be verified keeps its box open with the reason on the line under it, written with no square brackets, and is reported to the CTO Chief. Criterion 2 stays open in this slice with its written reason (decision 23)
- [ ] Confirm `git status --short` lists changes only in declared files and this plan, and that each candidate of section 7 changed only when the base count named it
- [ ] Confirm `src/lib/sast-runner.js` is the only change under `src/` (`git diff --name-only -- src`)
- [ ] Run no `menu` command (no task completion, no move of this plan) and commit nothing; hand back to the CTO Chief with the criteria status, the review outcome, the request counts and every open finding; the CTO Chief commits and hands the menu steps to the owner
