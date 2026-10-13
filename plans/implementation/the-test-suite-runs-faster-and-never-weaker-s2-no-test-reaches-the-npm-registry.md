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
  # The CTO Chief's rulings after the base count (Decisions 28 to 30): thirteen more test files
  # that start a real npm through the completion's verify step get the same one-line remedy, and
  # the npm audit parser of the dependency auditor takes the package's highest severity.
  - src/lib/dependency-auditor.js
  - tests/a-completion-says-whether-the-work-was-ever-claimed.test.js
  - tests/caller-error-is-not-a-verdict.test.js
  - tests/ctoc-audit-w05-verify-evidence.test.js
  - tests/dashboard-says-the-moment.test.js
  - tests/last-mile-integration.test.js
  - tests/last-mile-wired.test.js
  - tests/lib-quality2-batch.test.js
  - tests/menu-task-wiring.test.js
  - tests/opuspack-hooks.test.js
  - tests/step-13-verify-coverage.test.js
  - tests/step-13-verify.test.js
  - tests/verify-evidence-wiring.test.js
  - tests/verify-fails-loudly.test.js
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

- [x] 1 — Before and after whole-suite runs and the paired runs recorded with every listed
  item and load; "faster" written only under the three measures.
- [ ] 2 — The full `npm test`, run once after the last slice of this functional plan by the
  CTO Chief: 0 failed, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json`; a
  failure confined to the two files another round owns is re-run alone and recorded as the
  functional plan says.
  Open in this slice: the full npm test runs once after the last slice, by the owner's order.
- [x] 12 — Test 1 green after, red before.
- [x] 13 — Test 2 green after, red before.
- [x] 14 — Tests 3 and 4 green after, red before; the record says "not run on Windows".
- [x] 14a — Test 5 green after, red before; the no-configuration run recorded.
- [x] 15 — The four eslint-path tests reach their old branch with old assertions unchanged and
  one start of the fake package's bin each.
- [x] 16 — The w07 test asserts the method resolves, eslint named as not installed, no npx
  start; its time before and after recorded.
- [x] 17 — `TOOL_CONFIGS` javascript and typescript `command` describe the local start and do
  not name `npx`.
- [x] 18 — The lodash test holds a dependency finding line for lodash and no dependency-audit
  skip, from the stored recording with its npm version and date.
- [x] 19 — The live closed-port test green (or red with the defect reported); its duration
  recorded.
- [x] 20 — No real `npm audit` started in the criterion 18 test; every audit start is
  `npm audit --json` in the fixture folder.
- [x] 21 — Whole-suite count zero after, counted as connections to the recording server, not
  only completed requests (and the file-by-file count zero for every file); the count
  environment's removed variable names recorded; the base counts recorded with each request's
  path and test file; each candidate of section 7
  edited only when the base count named it; a count from one of the two files another round
  owns recorded and reported to that round, and this criterion then reported as not met for
  that file.
- [x] 22 — The list of test files that start npm or npx, each classified, recorded.
- [x] 23 — The three files' times in every pair recorded with the load.
- [ ] The product change is the only `src/` change; lint, type check and the false-green fence
  are green; `README.md` and `CLAUDE.md` counts synced.
  Open for the same reason: the dependency auditor is a second changed file under src/ (Decision 29). Lint, the type check and the false-green fence are green and the README and CLAUDE counts are synced (573 test files; the readme-numbers test passes).

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
- Windows residual of the eslint lookup (decision 44): `fs.stat` carries no Windows
  access-control information, so a folder such as `C:\Users\Public` that holds a planted `.git`
  and `node_modules\eslint`, above a project with no repository, is still searched. Closing it
  needs a real access-control read, a new capability and the owner's decision.

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

28. **The CTO Chief's ruling on the 13 undeclared files the base count named (option a).**
    `a-completion-says-whether-the-work-was-ever-claimed`, `caller-error-is-not-a-verdict`,
    `ctoc-audit-w05-verify-evidence`, `dashboard-says-the-moment`, `last-mile-integration`,
    `last-mile-wired`, `lib-quality2-batch`, `menu-task-wiring`, `opuspack-hooks`,
    `step-13-verify-coverage`, `step-13-verify`, `verify-evidence-wiring` and `verify-fails-loudly`
    (each `tests/<name>.test.js`) get one test-side line each, the same remedy as the four declared
    candidates, and are added to `files:` (the plan is not yet approved, so this is planning, not
    scope growth). Reason: the owner's slice goal is "Tests never reach the npm registry"; npm's
    update check is a registry contact; test-side lines carry no product risk. No product change
    (`src/lib/step-13-verify.js` is being changed by another round).
    **Where the line went (a correction of section 7's narrower scopes):** for all 17 files
    (the 13, the three declared test files and the harness) the line is
    `process.env.npm_config_update_notifier = 'false';` with a two-line comment, at the top of the
    file after its requires (the harness: after its requires). Section 7 had asked for narrower
    scopes (the launcher test's before and after hooks, a set-and-restore around single tests).
    Not done, because `node --test` runs every file in its own process, so a file-level setting
    leaks into nothing, and because more than one test in those files starts the real npm (for
    example `runFallbackChecks` in `verify-parses-full-output`), so a setting around one test would
    leave the others asking the registry. No file asserts on the exact environment passed to a
    child (read for each: `opuspack-hooks` passes `{ ...process.env, … }`, which carries the
    setting on purpose; the others do not build an environment). Each file was run before and after
    with the registry pointed at a closed port: same test counts, 0 failed, 0 skipped
    (22 files including the six hotfix-check files: 421 tests before, 421 after).
    **The one exception, a narrow scope:** `tests/quality-agent-coverage.test.js` (declared by
    section 4) has one test, B14, that starts the real `npm test` through `runFullTests`; the base
    count had hidden its two update-check requests behind the file's many `npx` requests. The
    setting is made and restored in a `finally` around that test only, because the rest of the
    file's npm starts are answered by spies or run against the closed registry.
29. **Finding 1 is a real security defect and is fixed in this slice (the CTO Chief's ruling).**
    `parseNpmAuditResults` of `src/lib/dependency-auditor.js` took the severity of the FIRST object
    advisory in `via`, while npm's own package-level `severity` is the highest of them; a lodash
    4.17.4 tree whose first advisory is moderate passed the push with a known critical. The
    recorded severity is now the HIGHEST of npm's package-level `severity` (when present) and the
    most severe object advisory of `via` (never the first one), and the advisory that sets it also
    supplies the finding's title and fields (the first of equals). The ruling said "npm's
    package-level severity when present, otherwise the highest of `via`"; the maximum of both was
    taken because it equals the ruling whenever npm is consistent (its package severity is the
    maximum) and never under-reports when a feed is not. `src/lib/dependency-auditor.js` is added
    to `files:`. Red first: the criterion 18 test (`true !== false`) and two direct cases of the
    parser in `tests/security-scan-never-downloads-a-scanner.test.js` (two advisories in `via`,
    the first moderate and the second critical; with and without a package-level severity), both
    asserting CRITICAL. The sibling parser, `parseNpmAuditResults` of `src/lib/sca-runner.js`
    (lines 756 to 792), was read: it records one finding per advisory, each with its own severity,
    so it does not have this defect.
30. **The npm configuration double-load.** Section 7 says to point `npm_config_userconfig` and
    `npm_config_globalconfig` at ONE empty file. The installed npm refuses that (every start ends
    at once with a double-loading error and makes no request, a false zero). The count uses two
    distinct empty files, `empty-npmrc` and `empty-npmrc-global`. Plan correction recorded here;
    the helper `withClosedNpmRegistry` sets only the user config and is unaffected.

**Decisions 31 to 43: the fix round after the three reviews and the security scan (Step 11, round
1).** Each is a documented choice taken on the reviewers' findings. Where one of them differs from
section 1's text, the decision wins and section 1's text stays as the history of what was written
before the reviews (the approved text of the plan is not edited during the build).

31. **The eslint lookup is bounded by the repository (security finding; replaces the "any
    ancestor" reach of decision 1 and the risk row on ancestors).** From the project folder's real
    path upward, the walk stops after the first folder that contains `.git` (a folder, or a file
    in a git worktree). With no `.git` on the way, the project folder alone is searched. A
    filesystem root is never searched. Reason: an eslint planted by another local user in
    `/node_modules`, `/tmp/node_modules` or `C:\node_modules` would otherwise run, as code, for
    every project below it that has no eslint of its own. Tests: `eslint in a node_modules above
    the repository is not installed`, `with no repository, only the project folder counts`, `the
    walk stops at the first repository, not at an outer one`, `a .git file (a git worktree) marks
    the repository like a .git folder`, `eslint in an ancestor's node_modules, inside the
    repository, is found`. The tests' own walk (`eslintManifestsInReach`) has the same bound.
    **Corrected by decision 44 (second security scan):** the repository bound alone does not close
    a `.git` planted by another local user in a shared folder (a project under `/tmp` with no
    repository climbed to a planted `/tmp/.git` and ran the planted `/tmp/node_modules/eslint`).
    What is closed, exactly: on POSIX, no folder whose mode has the other-write bit, and nothing
    above it, is searched; a root is never searched; with no repository on the way, only the
    project folder is searched. What is not closed: Windows (decision 44), and a stranger who can
    write into a folder the owner trusts (the repository's own folders).
32. **The per-level ownership check is dropped (review finding; decision 1's ownership rule and
    the lookup case "eslint linked in from outside the project is not installed" are
    superseded).** It protected nothing the project's own eslint configuration does not already
    control (whoever can plant a link there already controls a file eslint runs as code), and it
    refused legitimate layouts (pnpm's store outside the project, a linked `node_modules`). Bin
    containment stays. The test that asserted the refusal now asserts the opposite and is
    renamed `eslint linked in from outside the project is found (the ownership check is gone)`,
    with a comment naming this decision; the test "an ancestor's node_modules is found" was
    narrowed to "inside the repository" for decision 31.
33. **The bin path is checked to stay inside the package BEFORE its real path is resolved
    (security finding).** Order: resolve against the package folder, inside check, realpath,
    inside check again. A bin path pointing outside (a network path on Windows, say) is refused
    without being touched. Test: `eslint whose bin is an absolute path outside the package is not
    installed, and the path is never touched` (a spy on `fs.realpathSync` shows the outside path
    is never resolved).
34. **The eslint start gets a 50 MB output limit and a failed start says why (review finding;
    supersedes decision 17 and the finding on the 1 MB limit).** `maxBuffer: 50 * 1024 * 1024`,
    the limit the semgrep start has, so a large report is read and not turned into a skip. The
    standard error is now piped (not discarded), and the recorded error of a start that produced
    no standard output names the first non-empty line of eslint's standard error, then the
    error's own first line in brackets. Tests: `opts.maxBuffer` in the "finding blocks the push"
    test; `a failed eslint start says why in plain words`.
35. **`mapNpmSeverity` maps a severity that is not a string to MODERATE (review finding).** It
    threw on a number, which lost the whole package entry. Test: a second advisory whose severity
    is the number 5, a package that still records HIGH with no error, and direct calls with 5, an
    object and null.
36. **The finding's title comes from the advisory that sets the severity, and says so when the
    severity came through another package (review finding on decision 29).** When npm's
    package-level severity outranks every object advisory, the title gets " (through <names>)"
    with the names listed in `via`. Tests: package critical with `via` holding one moderate
    advisory and the name minimist gives CRITICAL and the title "only object, moderate (through minimist)"; case 1
    also asserts its title has no suffix.
37. **The LIVE closed-port test proves npm really tried the closed address (review finding).**
    `withClosedNpmRegistry` passes `{ cache, port }` to its callback; the test reads npm's debug
    log under `<cache>/_logs/` and asserts `ECONNREFUSED` and `127.0.0.1:<port>`. Without it, a
    dependency-audit skip for any other reason would have passed.
38. **The helper also sets and restores `npm_config_noproxy`, `NO_PROXY` and
    `COREPACK_ENABLE_NETWORK` (review finding).** `127.0.0.1` for both proxy settings (an
    inherited proxy cannot carry the request off the machine) and `0` for corepack. Every other
    letter-case spelling of each of the nine names it sets is saved, deleted and put back. The
    comments are corrected ("nine names", "the request never leaves the machine"). Tests: the
    `withClosedNpmRegistry` describe, including a restore check with `HTTPS_PROXY` set.
39. **`makeFakeEslintProject` and `withClosedNpmRegistry` remove every folder they made when
    their setup fails part-way (review finding).** One comment line names the port race
    (the port is free between the close and npm's connect; a stranger answering there turns the
    test red, never green). Tests: both "removes its folder when its own setup fails part-way"
    cases.
40. **The Windows-start test sets `process.platform` before the scan modules are loaded or used
    (review finding)**, so a module that reads the platform at load sees `win32` as well; the
    outer `finally` puts it back.
41. **`tests/sast-runner-coverage.test.js` records every `execFileSync` call before the
    expected-start check (review finding)**, so the final "exactly one start" assertion sees an
    unexpected second start instead of the throw hiding it.
42. **The npm audit capture file carries a `recapture` field and the LIVE test warns when npm's
    major version differs (review finding).** The field gives the re-capture steps in plain words
    and "Redo this when npm's major version changes"; the LIVE test emits `t.diagnostic` naming
    both majors when they differ (a diagnostic, not a failure); the comment in
    `tests/quality-fleet-wiring.test.js` says what the live test covers (how the installed npm
    reports a registry it cannot reach) and what the recording covers (the report format).
43. **In `tests/caller-error-is-not-a-verdict.test.js` the update-check line moves after the
    requires (review finding)**, with its two-line comment, like the other sixteen files.

**Decisions 44 to 46: the fix round after the second security scan (verdict warn).**

44. **The eslint lookup does not trust a folder anyone can write into (security finding; corrects
    decision 31).** On POSIX (`process.platform !== 'win32'`) the walk reads each folder it climbs
    with `safeFs.statSync(dir).mode` and stops before the first one whose mode has the other-write
    bit (`& 0o002`); that folder and everything above it are out of reach, and a `.git` or
    `node_modules` there counts for nothing, as git treats its safe directories. The project
    folder is asked too (a project folder anyone can write into finds no eslint: a loud skip, the
    cure is `chmod o-w`). Only the folders being climbed are asked, never where a `node_modules`
    link points, so pnpm's store and a linked `node_modules` still work. With the stop before any
    repository, only the project folder is searched (decision 31's rule for "no repository"). A
    failed stat is "not installed" (the existing catch). Tests (two POSIX cases, one proving the
    bit decides, one for the project's own `node_modules` below a shared folder, and one Windows
    case that sets the platform to win32 and asserts the documented behaviour, found, instead of
    skipping; no test is skipped): `a shared folder (mode 1777) holding .git and eslint above a
    project with no repository: not installed (POSIX)`, `the same layout without the other-write
    bit still finds it, so the bit is what decides (POSIX)`, `the project's own node_modules still
    counts when the folder above it is shared (POSIX)`, `on Windows the mode is not consulted
    (documented residual): the same shared layout is found`. **Windows residual, a finding for the
    owner:** `fs.stat` carries no Windows access-control information (its mode shows a writable
    folder as 0o666 or 0o777 whoever may write), so a folder such as `C:\Users\Public` holding a
    `.git` and a `node_modules\eslint` above a project with no repository is still searched. Only
    the repository bound and the root rule apply there. Closing it needs a real access-control
    read (a start of `icacls`, or a native call), which is a new capability and a decision for
    the owner. The scanner's reproduction (`SCRATCH/../repro/planted-git.js`) builds its stand-in
    folder without the other-write bit, so it still shows "found" for that layout by design; the
    layout it stands for (a real `/tmp`, mode 1777) is the first test above.
45. **A severity that is not a string goes through `this.mapCvssOrLabel` (second security scan).**
    `src/lib/cvss.js` `severityFromCvss` was read first: a finite number is banded (9.0 and up
    CRITICAL, 7.0 HIGH, 4.0 MODERATE, above 0 LOW), null, undefined, NaN and an object without a
    score are MODERATE, an array takes its maximum, and nothing throws. That is the file's "never
    under-report" rule, so a numeric 9.8 now records CRITICAL (it was MODERATE) and the earlier
    cases of decision 35 (5, an object, null) still give MODERATE. A string still goes through
    npm's label map, unknown strings MODERATE. Test: `a numeric severity goes through the CVSS
    bands: 9.8 is CRITICAL, 7.5 HIGH, and null, undefined or an object stay MODERATE`, also
    through `parseNpmAuditResults`.
46. **The recorded line of eslint's standard error is cleaned (second security scan).** Control
    characters (`\u0000` to `\u001f`, `\u007f` to `\u009f`) are removed and the line is capped at
    300 characters, after the first non-empty line is chosen from the cleaned lines (so a line of
    nothing but control characters is skipped); the bracketed first line of the error message gets
    the same cleaning. eslint's text is data, not an instruction. Test: `the recorded line of
    eslint's standard error has its control characters removed and is capped at 300 characters`.

Who finished which fix: the previous run of this builder (stopped by a usage limit, its last words
"Now fix 13") had put all thirteen on disk; this run found fixes 1 to 13 present, read each in the
code, ran its test green, and showed fixes 1 to 6, 8 and 9 red against a scratch copy with that one
fix reverted (fixes 7 and 10 to 13 are a test's reach, an ordering, a recorded field or a moved line
that no test distinguishes, so no red run exists for them). This run finished no fix itself.

## Verdict changes a user will see (added with decision 29)

- A push whose project has a dependency with a critical (or high) advisory behind a lower FIRST
  advisory in npm's report is now blocked; it used to pass. Example: lodash 4.17.4, first advisory
  moderate, package severity critical: the finding was `dependency[MODERATE]`, it is now
  `dependency[CRITICAL]` and blocks the push.
- (From the functional plan, unchanged by this ruling) a project without its own eslint now gets
  the loud skip `SAST skipped for javascript: no scanner installed (need semgrep or eslint)`
  instead of an eslint fetched from the registry; and on Windows the project's own eslint is
  started without a command interpreter, so a real finding can block there.

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
- [x] Confirm `git diff --quiet HEAD -- src/lib/sast-runner.js` exits 0 and that `tests/security-scan-never-downloads-a-scanner.test.js` and `tests/helpers/security-scan-fixtures.js` do not exist yet, so every red run below is taken against the unchanged product
- [x] Write `tests/helpers/security-scan-fixtures.js` as section 2 says: `makeFakeEslintProject`, `closedLoopbackPort`, `withClosedNpmRegistry` (the six variables put back exactly in `finally`, deleted when they were unset, the folder removed); CommonJS, `node:` built-ins only, JSDoc on each export, no assertion inside
- [x] Write `tests/security-scan-never-downloads-a-scanner.test.js` as section 3 says: the in-file harness (`REAL`, `FLEET`, `withScan`, `semgrepAbsent`, `isNpx`, `namesEslint`, `eslintManifestsAbove`, `REPORT_PATH`, `EVAL_SOURCE`), nothing from `src/` required at the top and no fixture read at file load, and the tests under their exact titles: test 1 (criterion 12, its first assertion that the walk finds no `node_modules/eslint/package.json` from the project upward), test 2 (criterion 13, its two-part precondition naming the layout), tests 3 and 4 (criterion 14; test 3 reads the recording inside its body and first asserts every `filePath` starts with `<PROJECT_ROOT>`), test 5 (criterion 14a, the section 6 project in a temporary folder outside the repository), and the ten lookup cases of test 6
- [x] In that file every start a spy refuses throws the `ENOENT` error of section 3, so no red run starts a real npx, npm or eslint; every temporary folder is removed in `finally`; `process.chdir` (test 2) and `process.platform` (test 4) are put back in `finally`
- [x] `tests/sast-runner-failclosed.test.js` line 79: the change of section 4 (fake project, start recorded, the old assertion word for word, the one-start assertion added, a comment saying why the spy moved from npx to the new start)
- [x] `tests/sast-runner-coverage.test.js` lines 291, 313 and 360: the three changes of section 4, each keeping every old assertion word for word and adding the one-start assertion and the comment; line 360's `execSync` spy throws `no shell command may run here`
- [x] `tests/w07-portable-shellouts.test.js` line 64: the change of section 4 (spies on `execFileSync`, `execSync` and `spawnSync` installed before the fresh `require`, recording and refusing every start; the old `doesNotReject` kept; the three added assertions; the comment at lines 68 to 70 and point (b) of the header rewritten as section 4 quotes; the real functions back in `finally`)
- [x] Lint the five files: `node node_modules/eslint/bin/eslint.js --max-warnings 0 tests/helpers/security-scan-fixtures.js tests/security-scan-never-downloads-a-scanner.test.js tests/sast-runner-failclosed.test.js tests/sast-runner-coverage.test.js tests/w07-portable-shellouts.test.js`; 0 errors and 0 warnings, so no red run below fails on a syntax error or an undefined name
- [x] Run `node --test tests/security-scan-never-downloads-a-scanner.test.js` on the unchanged product and confirm, by reading each failure message, that each test is red for the reason section 8 states:
  - test 1 fails on its two start assertions, the spy having recorded `npx` with arguments naming eslint (today's probe `npx eslint --version`); its first assertion passes
  - test 2 fails: the repository's own probe answers `false`, its `npx` start refused by the spy, and `starts` is not empty
  - test 3 fails on reading the recording, which does not exist yet, and this run is not its counted red (decision 19): its counted red run comes after the eslint report is captured, in the preparation step; every other test of the file runs, because nothing is read at file load
  - test 4 fails: no start of `process.execPath` at all
  - test 5 fails: the probe is `npx`, answered not found, so eslint never starts and the details hold no `sast` finding line
  - the lookup cases: each "is found" case answers `false`; each "not installed" case fails on its `starts` assertion, an `npx` start having been recorded
- [x] Run `node --test tests/sast-runner-failclosed.test.js tests/sast-runner-coverage.test.js tests/w07-portable-shellouts.test.js` and confirm the five changed tests red for the reason section 8 states: the four eslint-path tests on their one-start assertion (the spy saw `npx`, not one start of the fake package's bin), line 360 also with its shell probe refused; the w07 test on `eslint is not installed` (the recorded error is the spy's `ENOENT`) and on its empty-`starts` assertion (an `npx` start was recorded); every unchanged test in the three files passes
- [x] A red for any other reason (a require error, a missing helper export, a setup error, a wrong path) is a fault in the test, fixed in the test and run again; a red that cannot be brought to its stated reason stops the build and goes to the CTO Chief with the output
- [x] Confirm from the spies' records that every start in these red runs was answered by a spy, so no red run reached a registry
- [x] Quote each red run's failure lines in the build record, every absolute path rewritten relative to the repository root or `SCRATCH`

### Step 9: PREPARE
- [x] Confirm slice 1 has landed on BASE: `tests/helpers/hotfix-check-harness.js` and the six hotfix-check test files exist at `HEAD`; otherwise stop and report to the CTO Chief, because this slice depends on slice 1 and its harness
- [x] Record BASE (`git rev-parse HEAD` before this slice's first commit), `node --version`, `npm --version` and the path of npm (`command -v npm`), whether `yarn` and `pnpm` on the machine are corepack shims, the core count (`node -p "require('os').availableParallelism()"`), and which of semgrep, osv-scanner, trufflehog, detect-secrets, gosec and bandit `command -v` finds
- [x] Confirm `node_modules/eslint/bin/eslint.js`, `node_modules/eslint-plugin-security/package.json` and `node_modules/typescript` exist; install nothing. If one is missing, stop and report to the CTO Chief: `node_modules` is already installed in this worktree, and the npm audit capture below stays the build's only registry contact
- [x] Record whether this worktree's `node_modules` is a link (`fs.lstatSync('node_modules').isSymbolicLink()`) and, if so, where it points, named relative to the repository (for example "the main checkout's `node_modules`, an ancestor of this worktree") and never as a home-folder path; test 2's precondition depends on this layout
- [x] Make `SCRATCH/base-s2/` (decision 15): `git clone --shared --no-checkout <this worktree> SCRATCH/base-s2`, then `git -C SCRATCH/base-s2 checkout --detach <BASE>`, then `node_modules` in it a directory link to this worktree's `node_modules` (a junction on Windows); never `git worktree add`, never `git archive`. Record `git -C SCRATCH/base-s2 rev-parse HEAD` (must equal BASE) and `git -C SCRATCH/base-s2 status --short` (empty apart from the `node_modules` link). The copy holds BASE's own files, so the files Step 8 wrote do not reach it
- [x] Confirm, on BASE, that the repository holds no `.npmrc` and that the installed npm's built-in config file holds no `update-notifier` setting (section 7)
- [x] Write the two scratch scripts of section 7, `SCRATCH/registry-recorder.js` and `SCRATCH/count-registry-requests.js`: Node only; the recorder bound to `127.0.0.1` only, logging every `'connection'` event and every request per port, answering 404; every child started with an argument list and no shell, with the count environment of section 7 (every `npm_config_*` variable in any letter case, the four proxy names in any letter case and npm's continuous-integration names deleted; registry, Corepack registry, a new empty cache, one empty file as both user and global config, and `NO_PROXY=127.0.0.1` set); a new empty `npm_config_cache` folder per whole-suite run and per file; `npm_config_update_notifier` never set (decision 8)
- [x] Before the first count, run the check of section 7: in one child Node process with the count environment, the installed npm's `ci-info` answers `isCI` false; record the names the environment builder removed (names only, never values)
- [x] The before request counts on `SCRATCH/base-s2/`, before any edit to a candidate of section 7: the whole-suite count (one `node --test` over every `tests/*.test.js`, a fresh empty `npm_config_cache`), then the file-by-file count (eight workers, one port and one fresh empty cache per file, every named file confirmed by a second run alone). Each count can pass 10 minutes: start it in the background and end the turn. Record the totals of connections and of requests and, per request, its path, method, `npm-command` header and the test file it belongs to, and every connection that carried no complete request (criterion 21's before side)
- [x] Classify every file the base file-by-file count names, and record the list:
  - a candidate of section 7 (the launcher test, greenfield-journey, verify-parses-full-output, or a hotfix-check file, whose remedy goes in the harness): edited in the implementation step by the rule of section 7, and only then
  - `tests/iron-loop-enforcer.test.js` or `tests/reachability-surface-scan-is-linear.test.js`: never edited; its count and request log go into the build record and to the CTO Chief for the round that owns it
  - one of the six test files section 4 already changes: its requests must be gone after section 4's changes, checked by the after count
  - any other file: a scope-growth request, below
- [x] For every file of the last group, file one request with `requestScopeGrowth` of `src/lib/scope-growth.js` (all seven fields: `file` the test file; `blocked_write` the remedy of section 7; `forced_by` this plan's criterion 21 and the base count's lines for that file, with `forced_by_declared` recorded as returned; `acceptance_criterion` 21; `if_refused` that criterion 21 is reported as not met with that file's requests), all of them together; then record what landed under `## Execution Record` and end the turn, as the builder's Rule 5 says; the build resumes on the owner's answer
- [x] Re-run the criterion 22 presence search of `tests/` on BASE (the program names `'npm'`, `'npx'`, `npm.cmd`, `npx.cmd`, and command strings beginning `npm ` or `npx `), read every match, and record the classification of section 7 together with any file the planning-time reading missed
- [x] Re-run the affected-test search of section 10 on BASE (every test file that requires `src/lib/sast-runner.js`, `src/lib/dependency-auditor.js` or `src/lib/quality-agent.js`, every match read) and record the list the verify step runs
- [x] Capture the npm audit recording, the build's only registry contact, outside the test suite, by the three steps of section 5: the two lodash files of `tests/quality-fleet-wiring.test.js` lines 265 to 281 written byte for byte into a new scratch folder; `npm config get registry` recorded and equal to `https://registry.npmjs.org/`; `npm audit --json` run there with standard output saved byte for byte as `tests/fixtures/security-scan/npm-audit-lodash-4.17.4.json`; its exit code recorded (1 expected); `metadata.vulnerabilities` critical plus high at least 1
- [x] Search the npm recording for a local path, a user name or a host name; a hit stops the capture and goes to the CTO Chief
- [x] Write `tests/fixtures/security-scan/npm-audit-lodash-4.17.4.capture.json` with the fields of section 5: command, npm and node versions, capture date, exit code, registry, the fixture sentence
- [x] Capture the eslint report: build the section 6 project in a new scratch folder outside the repository (`index.js` holding `EVAL_SOURCE`, the one-rule `eslint.config.js`, the plugin as a directory link), run `node <repository>/node_modules/eslint/bin/eslint.js --plugin security --format json .` there, save standard output, replace the capture folder's real path, `fs.realpathSync(captureDir)` (eslint writes physical paths, `/var` as `/private/var`), in every `filePath` by `<PROJECT_ROOT>` (the separator after it kept as written), parse the result and assert that every `filePath` starts with `<PROJECT_ROOT>` (a failure stops the capture and nothing is written), and only then write it as `tests/fixtures/security-scan/eslint-security-report.json`; nothing else edited. The scratch folder's absolute path holds an account-name segment, so no absolute path may reach this committed fixture
- [x] Confirm the eslint report holds the content section 5 expects (one `index.js` message, rule `security/detect-eval-with-expression`, severity 2, line 3); a different content is recorded, and test 3 reads its line from the recording, never from the belief
- [x] Write `tests/fixtures/security-scan/eslint-security-report.capture.json` with the fields of section 5: eslint and plugin versions, node version, date, command, exit code, the configuration text, `EVAL_SOURCE`, the sentence naming the `<PROJECT_ROOT>` replacement
- [x] Search both recordings and both capture files for the worktree path, the home folder, the account name, a host name, and anything shaped like a key or token; none may appear
- [x] The counted red run of test 3, now that the report exists, still on the unchanged product: `node --test --test-name-pattern="its finding blocks the push" tests/security-scan-never-downloads-a-scanner.test.js`; red because the probe is `npx`, answered not found, so the fake eslint never starts and the details hold no `sast` finding line; quoted in the build record
- [x] The before whole-suite timing run: slice 1's completion whole-suite run when `git log` shows nothing else landed between it and BASE; otherwise `/usr/bin/time -p npm run test:raw` in `SCRATCH/base-s2/`, with the one-minute load at start and end
- [x] One reference before-run of the changed files from the base copy, with the load at start and end (`sysctl -n vm.loadavg` on macOS): `/usr/bin/time -p node --test` in `SCRATCH/base-s2/` over the six test files of section 9 and every candidate the base count named; w07's duration in it is criterion 16's reference; the interleaved pairs run in the verify step (decision 20)

### Step 10: IMPLEMENT
- [x] Order inside this step: the test-only changes first, each run on the unchanged product (green by design) and shown able to fail by its deliberate break; then the update-check lines; then the product change; then the counts
- [x] `tests/quality-fleet-wiring.test.js`: the two requires at the top (section 4); the test at line 285 renamed and rewritten as section 4 says (the two old assertions word for word; the fixture check of the capture file; the `execSync` and `execFileSync` spies; `SecretsScanner` availability false through `t.mock.method`; the new assertions: a `dependency` finding line naming lodash, `loudSkip` false, `res.passed === false`, at least one `npm audit` start and every one exactly `npm audit --json` with `cwd` the fixture folder); the new LIVE test right after it in the same `describe` (criterion 19), its real-npm precondition first and `withClosedNpmRegistry` around the scan; the test at line 472 wrapped in `withClosedNpmRegistry` with the comment, every assertion unchanged
- [x] `tests/quality-agent-coverage.test.js`: require `withClosedNpmRegistry`; the `captureLog` call of the test at line 661 wrapped, with the comment; assertions unchanged
- [x] `tests/framework-security-checker.test.js`: require `withClosedNpmRegistry`; the call at line 545 wrapped, with the comment; assertions unchanged; the header's "Zero mocks" stays true
- [x] Run the three files on the unchanged product: `node --test tests/quality-fleet-wiring.test.js tests/quality-agent-coverage.test.js tests/framework-security-checker.test.js`; every test passes; the LIVE test's duration and full `skipped` list go into the build record. If the LIVE test reads the closed registry as a clean pass it stays red, its captured output goes to the CTO Chief for the owner, and its assertion is never relaxed
- [x] The deliberate breaks of section 8, each in a scratch copy and never in the worktree, each recorded with the assertion that failed: criterion 18, a copy of the recording without `vulnerabilities`, fails the finding assertion; criterion 20, a scratch copy of the tree whose `includeDevDependencies` defaults to `false` (`src/lib/dependency-auditor.js` line 157), fails the command assertion on `npm audit --json --omit=dev`; criterion 19, a scratch copy pointing `npm_config_registry` at a local server that answers every audit request with an empty advisory list, fails for want of the dependency-audit entry
- [x] Each candidate of section 7 that the base file-by-file count named, and no other, gets the smallest change of section 7 with a comment naming this plan and criterion 21:
  - `tests/quality-agent-script-launcher.test.js`: `npm_config_update_notifier` set to `'false'` in the `before` hook beside `CTOC_LAUNCHER_PROOF` (line 53), its earlier value put back, or deleted when it was unset, in the `after` hook (line 56)
  - `tests/verify-parses-full-output.test.js`: set, and restored in `finally`, around the test that calls `verify.tryCommand('npm test', …)` (line 174)
  - `tests/greenfield-journey.test.js`: set, and restored in `finally`, around the test that runs the real verify step
  - `tests/helpers/hotfix-check-harness.js`: one line after its requires, `process.env.npm_config_update_notifier = 'false';`
  - where reading the file shows the test itself builds the environment object of the npm start, the setting goes into that object instead, as the ruling prefers, and the record says so
  - a candidate whose base requests are anything other than `/npm` gets `withClosedNpmRegistry` around the test instead
  - nothing else in a candidate changes: `git diff --stat` on each shows only those lines
- [x] Run each edited candidate (for the harness, the six hotfix-check files in one `node --test` call): every test passes, 0 failed and 0 skipped
- [x] `src/lib/sast-runner.js`, the whole product diff of section 1 and nothing more: no new import; `isStrictlyInside` and `findProjectEslintBin` (the direct walk of decision 1, no `require.resolve`) after `TOOL_CONFIGS` and before `class SASTRunner`, as written there; `this._eslintBin = undefined` with its type comment in the constructor; `projectEslintBin()` right before `isToolAvailable`; the eslint line and its comment first in `isToolAvailable`, and the `npx eslint --version` entry deleted from `checks`; `runESLintSecurity()` with the new doc comment, the not-installed branch, the start `execFileSync(process.execPath, args, …)` with `cwd`, `timeout`, `encoding` and `stdio` as section 1 writes them, the one changed comment, and the output handling otherwise byte for byte; the two `TOOL_CONFIGS` `command` texts and the one-line comment above them
- [x] Check the static fences of section 1 on the new text: no comment or code holds the literal `2>/dev/null`, the literal `|| true`, or text matching `/shell:\s*true/`; the new catch is not empty; every file-system call on a computed path goes through `safeFs`
- [x] Run the new file and the files changed in Step 8: `node --test tests/security-scan-never-downloads-a-scanner.test.js tests/sast-runner-failclosed.test.js tests/sast-runner-coverage.test.js tests/w07-portable-shellouts.test.js`; all pass; the record pairs each red of Steps 8 and 9 with its green
- [x] If test 5 fails because eslint refuses the documented configuration together with `--plugin security`, stop: that is a product defect found, reported to the CTO Chief with the output, never worked around
- [x] The no-configuration run of section 6, once, as a scratch script with the same seams on the section 6 project without `eslint.config.js`: record eslint's exit code, its standard error and the `skipped` entries; a refusal of `--plugin` with no configuration file is a finding for the owner, not fixed here
- [x] Run `node src/scripts/release.js` with `VERSION` unchanged; confirm `git diff --quiet -- VERSION` exits 0, the test-file count in `CLAUDE.md` (both lines) and `README.md` rose by exactly one, `CLAUDE.md` is at most 15,000 bytes (`node -p "require('fs').statSync('CLAUDE.md').size"`), and `git status --short` lists no changed file outside `files:` and this plan; anything else stops the build with the diff kept, reported to the CTO Chief
- [x] Wiring: no module and no export is added; the product change is reached from `/ctoc:push` through `runSecurityScan` (section "Wiring — the live call sites"); the new test file is run by `npm test` through `tests/*.test.js`; the helper and the fixtures are reached only through the test files that require or read them

### Step 11: REVIEW
- [x] Self-review first: the product diff against section 1 line by line; every changed test against section 4 (old assertions word for word, the one-start assertion and the comment present); the recordings against section 5; the candidates against section 7
- [x] Write three review packets into `SCRATCH/review/`, one per area, each holding the plan sections its area is judged against, the diff of its files, the red and green runs, and its questions:
  - the product change, `src/lib/sast-runner.js`: is the ownership rule exactly section 1's (real path inside a `node_modules` of the project or an ancestor, bin script inside the package); can the probe start a process; is the start an argument list with no shell on every platform; are the w07 and false-green fences respected; did anything outside section 1 change
  - the test changes, the new test file, the six test files of section 4 and the edited candidates: does each test fail for the reason it names and pass only for the right one; is every old assertion kept word for word; does any test start a real process other than the one under test; does any test assert wall-clock time; does each candidate change only the update-check setting
  - the fixtures and the helper, `tests/helpers/security-scan-fixtures.js` and the four files under `tests/fixtures/security-scan/`: are the recordings byte for byte as captured apart from the `<PROJECT_ROOT>` replacement; do they hold no local path, account name or secret; does `withClosedNpmRegistry` restore every variable exactly; is the closed port closed
- [x] Hand the three packets to the CTO Chief with the recommendation to dispatch three `iron-loop-critic` reviews in parallel at extra-high effort, one per area, and one `security-scanner` pass on the product change (the eslint lookup and start as an attack surface: directory links, `NODE_PATH` and the global folders, a hostile `bin` value, a path that climbs out of the package); the builder dispatches nothing itself
- [x] Fix round 1: each accepted finding fixed in the declared files only, then that area's affected tests re-run; each finding recorded with its fix or its written rejection
- [ ] Fix round 2, only for the areas round 1 changed: the same; a third round is never run, and what remains goes to the CTO Chief, one line each
  Open: round 1 changed all three areas; a second review of the round 1 fixes is for the CTO Chief to dispatch. This builder ran no second round and no third round exists.
- [x] A finding outside this slice's goal is listed in the build record in one line, for the owner to schedule

### Step 12: OPTIMIZE
- [x] Confirm the lookup runs at most once per scanner object: `projectEslintBin()` caches the answer and the probe and the run read the same cache (the lookup case "the answer is kept for the life of one scanner" passes)
- [x] Confirm the probe starts no process (tests 2 and 6 assert `starts` is empty) and the scan starts eslint once (tests 3 and 5 assert exactly one start)
- [x] Confirm nothing is duplicated: the fake eslint package and the closed registry come only from the helper, and no test file carries its own copy
- [x] Read each new test's `duration_ms` from `node --test --test-reporter=tap tests/security-scan-never-downloads-a-scanner.test.js` and record them: tests 1 to 4 and the lookup cases are expected under 100 ms each; test 5 (the real eslint) and the LIVE test are medium tests whose names say the boundary they cross; a slower case is recorded with the load and examined, never asserted inside a test
- [x] Confirm no new or changed test asserts wall-clock time

### Step 13: SECURE
- [x] The eslint resolution cannot be redirected outside the project's own `node_modules` and its ancestors': read `findProjectEslintBin` against section 1 (a direct walk, no `require.resolve`), and confirm with the passing lookup cases (a link from outside the project, a relative `bin` outside the package, a `bin` folder linked outside the package, an absolute `bin` outside the package, an unusable folder: each answers not installed)
- [x] One scratch probe, never committed, in a new temporary folder holding `project/` (a `package.json` and `index.js`, no eslint) and `home/.node_modules/eslint` (a fake package with a bin script inside it, from `makeFakeEslintProject`'s layout), each case in its own child Node process: (a) `NODE_PATH` set to this repository's `node_modules`; (b) `HOME` and `USERPROFILE` set to `home/`, `NODE_PATH` deleted. In each child, the control line first: `require('module').createRequire(path.join(project, 'noop.js')).resolve('eslint/package.json')` succeeds (Node's resolver does read that folder), then `new SASTRunner(project).isToolAvailable('eslint')` answers `false`. Record both lines of both cases; a control line that fails is recorded as such (the probe then shows nothing for that case, and the record says so), and a lookup answering `true` is a defect sent to the CTO Chief
- [x] No shell: the eslint start is `execFileSync` with `process.execPath` and an argument list, and its options hold no `shell` key (test 3 asserts `opts.shell === undefined`, test 4 the win32 arguments with no `.cmd`); `tests/w07-portable-shellouts.test.js` passes its source fences
- [x] No registry from the product: read every line of `src/lib/sast-runner.js` that a presence search for `npx` lists; each is a comment saying npx is no longer used, and no start names npx
- [x] The fixtures hold no secret: the four files under `tests/fixtures/security-scan/` and the helper read in full for any key, token, password, local path, account name or host name; a hit is named by file and line, never copied
- [x] The scratch scripts: the recorder binds `127.0.0.1` only; every child starts with an argument list and no shell; links are made only inside `SCRATCH`; nothing is deleted through a link
- [x] Every finding of the Step 11 security-scanner pass is fixed, or recorded as open with its reason for the CTO Chief
- [x] The build record names no home-folder path, account name or e-mail address; every path is relative to the repository root or `SCRATCH`

### Step 14: VERIFY
- [x] While building, only affected tests ran, by name: the list recorded in the preparation step (section 10), the new file, the edited candidates (for the harness, the six hotfix-check files), and once after the product change `tests/lint.test.js` and `tests/typecheck.test.js`; run that whole list once more after the last review fix, 0 failed and 0 skipped
- [x] Lint with 0 warnings: `node node_modules/eslint/bin/eslint.js --max-warnings 0 .`; type check: `node --test tests/typecheck.test.js`; the false-green fence: `node --test tests/false-green-fence.test.js` with `.ctoc/false-green-baseline.json` unchanged; reachability: `node --test tests/reachability.test.js tests/export-reachability.test.js`
- [x] The after request counts on the worktree with this slice's changes, with the same scripts and settings as the preparation step (the count environment of section 7, its `isCI` check passing again, a fresh empty `npm_config_cache` per run and per file, `npm_config_update_notifier` never set): the whole-suite count must be zero connections, and the file-by-file count zero connections for every file. Each can pass 10 minutes: start it in the background and end the turn. A request from `tests/iron-loop-enforcer.test.js` or `tests/reachability-surface-scan-is-linear.test.js` is recorded with its log and reported to the CTO Chief for the round that owns the file, and criterion 21 stays open for that file; any other request is a kickback to the implementation step
- [x] The after measurements: the after whole-suite run, `/usr/bin/time -p npm run test:raw` on the completion tree, with the load at start and end, its passed, failed and skipped counts recorded (0 skipped; a failed test is a kickback to the step that caused it, except under the rule for the two files another round owns, below); then the four interleaved runs of section 9 in order, before (in `SCRATCH/base-s2/`), after, before, after, each `/usr/bin/time -p node --test <the changed files>` with the load at start and end; the new test file's after time alone
- [x] Record for every run the items of section 9; per pair, the wall-clock and processor time of `tests/quality-agent-coverage.test.js`, `tests/quality-fleet-wiring.test.js` and `tests/w07-portable-shellouts.test.js` with the load (criterion 23), and w07's before and after time (criterion 16); write "faster" only when every pair agrees, the longest file agrees and whole-suite processor time did not grow, otherwise name the measure that did not show it, with its numbers (criterion 1)
- [x] The full `npm test` is not run in this slice (decision 23): it runs once, after the last slice of this functional plan, run by the CTO Chief, by the owner's order "The full npm test runs once, at completion". Criterion 2 stays open with the reason written under it; the coverage floor is checked by that final run
- [x] The rule for the two files another round owns, applied to the after whole-suite timing run and to every affected-test run of this step: a failure confined to `tests/reachability-surface-scan-is-linear.test.js` or `tests/iron-loop-enforcer.test.js` is re-run alone with `node --test <that file>` and recorded beside the failed run's one-minute load; a file still failing alone is recorded with this run's load numbers and goes to the CTO Chief for the round that owns it; neither file is ever edited; any other failure is a kickback to the step that caused it

### Step 15: DOCUMENT
- [x] Write the build record under `## Execution Record` at the end of this plan: the red runs and their greens; the machine facts, including whether `node_modules` is a link and where it points; the base copy's `rev-parse` and `status` lines; the count environment's removed variable names (names only) and its `isCI` check; the base and after request counts (whole suite and per file, connections and requests, each request's path and test file); the classification of every named file, every scope-growth request with its answer, and each candidate edited with the line it got; the criterion 22 list; both capture records; the LIVE test's duration and `skipped` list; the no-configuration run; the deliberate breaks; every timed run with its items and the paired-run table; the release diff summary; each review finding with its fix, rejection or hand-off; the Step 13 probe's four lines (two cases, control and lookup); the after whole-suite timing run's passed, failed and skipped counts; any re-run of the two foreign files with its load; the line "the full npm test runs once after the last slice, by the owner's order" in place of a full-suite gate result; and "not run on Windows" for test 4
- [x] List in the record the projects that now get the loud eslint message instead of a scan (the risk row on projects that lose eslint scanning), as the cost the functional plan accepted
- [x] State in the record that the lookup accepts an ancestor's `node_modules`, so `/node_modules`, `/tmp/node_modules` and `$HOME/node_modules` serve every project below them that has no eslint of its own, consistent with the CTO Chief's ruling and changed by no code (the risk row on ancestors)
- [x] Every comment the change touches says what the code does now: the doc comments of section 1, the w07 header's point (b), the comment on each moved spy, each closed-registry wrap and each update-check line; no other documentation file and no CHANGELOG entry (VERSION does not change here)

### Step 16: FINAL-REVIEW
- [x] Every box of Steps 8 to 15 is ticked only for work done and seen
- [x] Verify each acceptance criterion (1, 2, 12, 13, 14, 14a, 15 to 23, and the product-change line) against the evidence it names, by running it or reading the recorded output, and tick its box `- [x]` only then; a criterion that cannot be verified keeps its box open with the reason on the line under it, written with no square brackets, and is reported to the CTO Chief. Criterion 2 stays open in this slice with its written reason (decision 23)
- [x] Confirm `git status --short` lists changes only in declared files and this plan, and that each candidate of section 7 changed only when the base count named it
- [ ] Confirm `src/lib/sast-runner.js` is the only change under `src/` (`git diff --name-only -- src`)
  Open: two files under src/ changed, `src/lib/sast-runner.js` and `src/lib/dependency-auditor.js` (added to the declared files by the CTO Chief's ruling, Decision 29). The statement as written is no longer true; the CTO Chief decides whether this line is satisfied.
- [x] Run no `menu` command (no task completion, no move of this plan) and commit nothing; hand back to the CTO Chief with the criteria status, the review outcome, the request counts and every open finding; the CTO Chief commits and hands the menu steps to the owner


---

## Execution Record

Build record of the executor (Steps 8 and 9 done, Step 10 started and stopped). Every path is relative to the repository root (`<repo>`), to the build's scratch folder (`SCRATCH`) or to the operating system's temporary folder (`<tmp>`). No `menu` command was run, no plan file was moved, nothing was committed.

### Where the build stopped, and why

The base file-by-file request count (below) names 13 test files that this plan does not declare in `files:`: 11 of them load the completion's verify step (`runVerify` of `src/lib/step-13-verify.js`, or `completeTaskPlan`/`completeExecution`, whose Step 14 starts the real `npm test` or `npm run` through `tryCommand`; found by a text search of what each file loads, not by tracing a run; the other two, `dashboard-says-the-moment` and `opuspack-hooks`, load neither directly). Section 7 says a named undeclared file goes through `src/lib/scope-growth.js`, all requests filed together before any edit to a candidate, and the build stops for the owner's answer; the builder's brief says the same. So: no candidate is edited (`tests/quality-agent-script-launcher.test.js`, `tests/greenfield-journey.test.js`, `tests/verify-parses-full-output.test.js` and `tests/helpers/hotfix-check-harness.js` are untouched), the product change in `src/lib/sast-runner.js` is not made, and the scope-growth requests are NOT filed by the builder (the count names 13 files at once and the choice between thirteen test edits and one product change is the owner's; the fields below are ready for the CTO Chief to file through `src/lib/scope-growth.js`). A second decision is open and independent of the first: the new test of criterion 18 is red for a product reason (see "Finding 1").

### Machine facts

- Node v24.14.1; 18 cores; macOS (darwin, arm64). BASE = `08f9718ccded12d35b6f374023c72f32f7f4a285`; the worktree has no change in `src/` and `VERSION`.
- The npm on `PATH` is the nvm-managed npm 11.11.0 (not the Homebrew npm 11.19.1 whose source the plan read; the update-check code it reads, `lib/cli/update-notifier.js`, is the same in 11.11.0: skipped only when `update-notifier` is false or `ci-info` says CI). `ci-info` 4.4.0. The installed npm folder has no built-in `npmrc` file; the repository has no `.npmrc`.
- `yarn` is not installed; `pnpm` and `corepack` are on `PATH` and `pnpm` is a corepack shim (a link to corepack's `pnpm.js`). Of semgrep, osv-scanner, trufflehog, detect-secrets, gosec and bandit, `command -v` finds none.
- `node_modules` of this worktree is a real folder (not a link). `<repo>/node_modules/eslint` (9.39.4) lies inside `<repo>/node_modules`, so test 2's precondition holds by design. `node_modules/eslint/bin/eslint.js`, `node_modules/eslint-plugin-security/package.json` (3.0.1) and `node_modules/typescript` exist; nothing was installed.
- Base copy: `SCRATCH/base-s2/`, a `git clone --shared --no-checkout` of this worktree, checked out detached at BASE, its `node_modules` a link to this worktree's. `git rev-parse HEAD` there = BASE; `git status --short` there lists only `?? node_modules` (the link).
- Slice 1 has landed on BASE: `tests/helpers/hotfix-check-harness.js` and the six hotfix-check files (`hotfix-check`, `-copy-and-log`, `-guards`, `-readers`, `-review-findings`, `-test-run`) exist, plus the corpus and differential files.

### Step 8: red runs (reasons, as read from the failure messages)

`tests/security-scan-never-downloads-a-scanner.test.js` on the unchanged product, 15 tests, 0 pass, 15 fail (full scrubbed output in `SCRATCH/s2/red-runs-scrubbed.txt`):

- test 1 (no npx, no eslint): fails on `no npx may start`; the spy saw `execSync` of `npx eslint --version` (today's probe). Its first assertion (the walk finds nothing above the temporary folder) passed.
- test 2 (follows the scanned project): fails on `the repository has its own eslint`: `false !== true`, the probe `npx` having been answered not found by the spy; the precondition (repository eslint inside its own `node_modules`, not a link) passed.
- test 3 (finding blocks the push): first run failed reading the recording (ENOENT, not its counted red, as decision 19 says). The counted red, after the Step 9 capture: `node --test --test-name-pattern="its finding blocks the push"` fails on `process.execPath`: the one start recorded is `npx` (the probe, answered not found), so the fake eslint never starts.
- test 4 (win32): fails on `the eslint start must be made: ["npx"]`: no start of `process.execPath`.
- test 5 (real eslint 9): fails on the start assertion: the one start is `npx`, so eslint never starts and no `sast` finding line can exist.
- lookup cases: each "is found" case answers `false` (`false !== true`); each "not installed" case fails on `the availability probe must start no process`, an `npx eslint --version` start being recorded.

The three changed files on the unchanged product (`node --test tests/sast-runner-failclosed.test.js tests/sast-runner-coverage.test.js tests/w07-portable-shellouts.test.js`): 49 tests, 44 pass, 5 fail; the five are exactly the changed ones:

- `runESLintSecurity: a crash (non-JSON stdout) surfaces in errors`, `runESLintSecurity_records_error_when_crash_has_no_stdout`, `runESLintSecurity_records_error_when_successful_run_produces_empty_output`: fail on the one-start assertion (`[ 'npx', 'eslint' ]` recorded instead of `[ <node>, <bin script> ]`).
- `runLanguageScanner_dispatches_javascript_to_eslint_and_returns_true`: fails with `false !== true` (the shell probe is refused, and no node start is possible).
- w07 `runESLintSecurity() resolves without throwing...`: fails on `the recorded error must name eslint as not installed` (the recorded error is the spy's `ENOENT` for npx).
- Every unchanged test in the three files passes.

Every start in these red runs was answered by a spy (the spies refuse with `spawn <program> ENOENT`; the w07 test records and refuses all three child-process functions before the module is loaded), so no red run started a real npx, npm or eslint, and none reached a registry. The five lint checks (`node node_modules/eslint/bin/eslint.js --max-warnings 0` over the five files of Step 8, and later over the three wrapped files) exit 0 with no warning.

### Step 9: count environment, and a defect in the plan's wording of it

- The count environment of section 7 was built as written except one thing. Section 7 says to point `npm_config_userconfig` and `npm_config_globalconfig` both at one empty file. The installed npm refuses that: every npm start ends at once with `Exit prior to config file resolving ... double-loading config ... as "global", previously loaded as "user"`, and makes no request. The first whole-suite count on the base copy therefore ran with every npm start failing before it could ask anything (it showed 0 requests and 121 failing tests): a false zero. It is kept as `SCRATCH/s2/base-whole-invalid-one-config-file.*` and NOT used. Choice taken (a documented choice, no fork): two distinct empty files, `empty-npmrc` and `empty-npmrc-global`. Positive control with the corrected environment: `npm view lodash version` and `npm run no-such-script` made 2 connections and 2 requests (`GET /npm` the update check, `GET /lodash`), so a request is seen when it is made.
- Environment names removed (names only): none. No `npm_config_*`, proxy variable or continuous-integration marker was set in the builder's environment. `ci-info`'s `isCI` under the count environment: `false` (checked in a child Node process).
- `npm_config_update_notifier` was never set to any value.

### Step 9: base request counts (criterion 21, before side)

Scripts: `SCRATCH/registry-recorder.js` (an http server per port on 127.0.0.1, logging every connection and every request) and `SCRATCH/count-registry-requests.js`. Output, scrubbed: `SCRATCH/s2/base-request-counts-scrubbed.txt`.

Whole suite on the base copy (572 files, `node --test`, fresh empty npm cache): exit 0; 13,135 tests, 13,135 pass, 0 fail, 0 skipped; 25 connections, 47 requests, 0 connections without a complete request; 49.7 s wall-clock; one-minute load 29.3 at start and 41.9 at end. Requests: 2 x `GET /npm` (npm's update check, from `npm test`), 42 x `GET /eslint` (`npx eslint` fetching eslint), 3 x `POST /-/npm/v1/security/advisories/bulk` (`npm audit`). Only 2 update-check requests show in the whole-suite run because the first npm of the run writes the cache's marker file; the file-by-file count (fresh cache per file) shows the real spread.

File by file (8 workers, one port and one fresh cache per file; each named file run once more alone, all 26 confirmed): 26 of 572 files make a connection. Load 41.7 at start, 19.5 at end.

| test file | connections (pass 1 / alone) | requests (pass 1 / alone) | what was requested (pass 1) |
|---|---|---|---|
| tests/a-completion-says-whether-the-work-was-ever-claimed.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/caller-error-is-not-a-verdict.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/ctoc-audit-w05-verify-evidence.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/dashboard-says-the-moment.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/framework-security-checker.test.js | 2 / 2 | 3 / 4 | 1 x GET /npm [npm audit]; 2 x GET /eslint [npm exec] |
| tests/greenfield-journey.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/hotfix-check-copy-and-log.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/hotfix-check-guards.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/hotfix-check-readers.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/hotfix-check-review-findings.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/hotfix-check-test-run.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/hotfix-check.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/last-mile-integration.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm run] |
| tests/last-mile-wired.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/lib-quality2-batch.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm run] |
| tests/menu-task-wiring.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm run] |
| tests/opuspack-hooks.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/quality-agent-coverage.test.js | 11 / 11 | 22 / 22 | 2 x GET /npm [npm exec]; 20 x GET /eslint [npm exec] |
| tests/quality-agent-script-launcher.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/quality-fleet-wiring.test.js | 13 / 13 | 23 / 23 | 2 x GET /npm [npm exec]; 18 x GET /eslint [npm exec]; 3 x POST /-/npm/v1/security/advisories/bulk [npm audit] |
| tests/step-13-verify-coverage.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/step-13-verify.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/verify-evidence-wiring.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/verify-fails-loudly.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/verify-parses-full-output.test.js | 1 / 1 | 2 / 2 | 2 x GET /npm [npm test] |
| tests/w07-portable-shellouts.test.js | 2 / 1 | 4 / 4 | 2 x GET /npm [npm exec]; 2 x GET /eslint [npm exec] |

Classification of the 26 named files:

- Declared candidates of section 7 (13 files): the launcher test, `greenfield-journey`, `verify-parses-full-output`, and all six hotfix-check files (the remedy for the six is one line in `tests/helpers/hotfix-check-harness.js`; the corpus and differential files are NOT named). Every request is `GET /npm` for npm's update check, so the remedy of section 7 applies. NOT yet edited.
- The files section 4 already changes (4 files): `framework-security-checker`, `quality-agent-coverage`, `quality-fleet-wiring`, `w07-portable-shellouts`. Their requests (`/eslint`, `/npm` by `npm exec`, `npm audit`) must be gone after section 4's changes and the product change: checked by the after count.
- `tests/iron-loop-enforcer.test.js`, `tests/reachability-surface-scan-is-linear.test.js`: not named.
- Not declared (13 files), the stop: `a-completion-says-whether-the-work-was-ever-claimed`, `caller-error-is-not-a-verdict`, `ctoc-audit-w05-verify-evidence`, `dashboard-says-the-moment`, `last-mile-integration`, `last-mile-wired`, `lib-quality2-batch`, `menu-task-wiring`, `opuspack-hooks`, `step-13-verify-coverage`, `step-13-verify`, `verify-evidence-wiring`, `verify-fails-loudly`. Each makes exactly one connection and 2 requests: `GET /npm` (npm's update check), `npm-command` header `test` (10 files) or `run` (3 files: `last-mile-integration`, `lib-quality2-batch`, `menu-task-wiring`).

Request log fields for the scope-growth requests (ready to file, one per file, same text; `plan`: `the-test-suite-runs-faster-and-never-weaker-s2-no-test-reaches-the-npm-registry`; `step`: `9`; `file`: the test file; `blocked_write`: set `npm_config_update_notifier` to `'false'` in the environment that reaches the real npm the test starts, set and restored around the test (section 7's remedy); `forced_by`: `tests/verify-parses-full-output.test.js` (declared): its `verify.tryCommand('npm test', ...)` and this file's `runVerify` start the same real npm through `tryCommand` of `src/lib/step-13-verify.js` with the inherited environment, and the base count shows 2 `GET /npm` requests from this file; `acceptance_criterion`: `21`; `if_refused`: criterion 21 is reported as not met, with this file's 2 update-check requests). The `forced_by` names a declared file but the forcing change is in an undeclared product file, so `forced_by_declared` will read as a weak request.

Options for the owner, for the CTO Chief to put (the builder takes no side on scope): (a) the thirteen one-line test edits above; (b) one product change in `tryCommand` of `src/lib/step-13-verify.js` (an `env` option carrying `npm_config_update_notifier=false` for the npm it starts), which by reading would also remove the update-check requests of the declared candidates and of the 11 files that go through `runVerify`, and of real users' verify runs (plan decision 13 listed a product change as "not chosen"; `src/lib/step-13-verify.js` is modified in the main checkout by another round, per the session's git status, so a merge conflict is possible); (c) criterion 21 reported as not met for these files.

### Step 9: captures (the build's only registry contact was one `npm audit --json`)

- `tests/fixtures/security-scan/npm-audit-lodash-4.17.4.json`: `npm audit --json` run in a new scratch folder holding the two lodash files of `tests/quality-fleet-wiring.test.js` lines 265 to 281 (`JSON.stringify(..., null, 2)`), `npm config get registry` = `https://registry.npmjs.org/`, npm 11.11.0, exit code 1, 5,865 bytes, empty standard error, saved byte for byte (`cmp` identical to the capture). `metadata.vulnerabilities`: critical 1, high 0, total 1. No local path, user name or host name in it (searched for the home folder, user name, host name, `/Users`, `/private`, `/var/`, `/tmp`, `.local`, `localhost`: 0 hits; its only URLs are `github.com/advisories/...`). Capture file `npm-audit-lodash-4.17.4.capture.json` written with command, npm 11.11.0, node v24.14.1, date 2026-10-12, exit code 1, registry and the fixture sentence.
- `tests/fixtures/security-scan/eslint-security-report.json`: this repository's own eslint 9.39.4 and eslint-plugin-security 3.0.1 on the section 6 project in a new scratch folder outside the repository (`index.js` = `EVAL_SOURCE`, the one-rule `eslint.config.js`, the plugin as a directory link), `node <repo>/node_modules/eslint/bin/eslint.js --plugin security --format json .`, exit code 1. The capture folder's real path (`/private/var/...`, eslint writes physical paths) was replaced by `<PROJECT_ROOT>` before saving; the script parsed the result and asserted every `filePath` starts with `<PROJECT_ROOT>` before writing, and refused on a hit of the real path, the folder path, the temporary folder, the home folder, the user name or the host name (none). Content as section 5 expects, order differing: an entry `<PROJECT_ROOT>/eslint.config.js` with no messages, and `<PROJECT_ROOT>/index.js` with one message: `security/detect-eval-with-expression`, severity 2, line 3, `eval with argument of type Identifier`. Capture file `eslint-security-report.capture.json` written (eslint, plugin and node versions, date, command, exit code, configuration text, `EVAL_SOURCE`, the replacement sentence).
- Search of all four files for `/Users`, the user name, the host name, `.local`, `/private`, `/var/`, `/tmp`, the scratch and worktree folder names, `@`, and key, token, password or secret words: none (`SCRATCH/s2/fixture-scrub-check.txt`).

### Step 9: before-side timing

- Before whole-suite run: slice 1's completion whole-suite run (`SCRATCH/suite-after.*`, plan section 9 allows it when nothing else landed): 572 files, 13,135 tests, 13,135 pass, 0 fail, 0 skipped; wall 52.5 s, user 262.35 s, system 186.61 s, processor time 448.96 s; load 26.9 at start, 42.6 at end; 18 cores; node v24.14.1; the run's head commit was `bdeb68af` with slice 1's changes in the tree (the tree of slice 1's commit; not compared byte for byte with it). Longest file then: `tests/hotfix-check-corpus.test.js` 48.87 s; `tests/quality-agent-coverage.test.js` 28.71 s.
- Reference before-run of six of the changed files from the base copy (`SCRATCH/s2-ref-before.*`): `/usr/bin/time -p node --test` over `sast-runner-coverage`, `sast-runner-failclosed`, `w07-portable-shellouts`, `quality-fleet-wiring`, `quality-agent-coverage`, `framework-security-checker`: wall 18.17 s, user 22.43 s, system 7.60 s; load 5.5 at start, 10.2 at end; 204 tests, 204 pass, 0 fail, 0 skipped. Per file (runner's own duration): quality-agent-coverage 18.10 s, quality-fleet-wiring 12.29 s, framework-security-checker 2.68 s, w07 0.40 s, sast-runner-coverage 0.02 s, sast-runner-failclosed 0.02 s. w07 took 0.4 s here, not the profile's 30.4 s; the cause of the difference is not established (the registry may have answered fast, or npx may have resolved eslint differently; the base count's two `GET /eslint` requests from this file show it still asks the registry). The candidates are not in this run because the candidate set awaits the owner's answer.

### Step 10 (started, stopped): what was done and seen

Test-only changes written (not wrapped in any commit):
- `tests/quality-fleet-wiring.test.js`: two requires added; the lodash test renamed `a recorded real npm audit answer for lodash 4.17.4 surfaces as a dependency finding, and no real npm starts` with its two old assertions kept word for word and the tighter ones added; the new test `LIVE, no internet: the real installed npm, pointed at a closed local port, makes the dependency audit skip loudly with no finding`; the normal-npm-repo test wrapped in `withClosedNpmRegistry`; the stale `before` comment of the DEPENDENCIES describe reworded.
- `tests/quality-agent-coverage.test.js` and `tests/framework-security-checker.test.js`: one require and one wrap each, assertions unchanged.
- Lint: 0 errors, 0 warnings over the three files.

Run on the UNCHANGED product: `node --test tests/quality-fleet-wiring.test.js tests/quality-agent-coverage.test.js tests/framework-security-checker.test.js`: 156 tests, 155 pass, 1 fail, 0 skipped; load 8.2 at start. The one failure is Finding 1.

- LIVE test: passes in 889 ms. The real npm 11.11.0 against the closed loopback port ran three times (npm, and the yarn and pnpm fallbacks) and the scan's `skipped` list holds `dependency audit skipped (npm): npm audit did not run (unknown)` three times, then `SAST skipped for javascript: no scanner installed (need semgrep or eslint)` (all SAST probes were fixed absent by the test), then the secrets and migration lines. No dependency finding. So the real npm does NOT read a closed registry as a clean pass. The plan predicted the text `npm audit did not run (unknown): audit endpoint returned an error`; npm 11.11.0 printed no summary, so the skip reads `(unknown)` only; the test's pattern `^dependency audit skipped \(npm\): ` holds either way.
- Finding 1 (product, for the owner; the test stays red): `res.passed === false` in the criterion 18 test fails (`true !== false`). The recorded real audit lists lodash as `critical` at the package level (via advisories: moderate, high, high, critical, high, moderate, moderate, high, moderate, moderate), but `parseNpmAuditResults` in `src/lib/dependency-auditor.js` (lines 764 to 781) takes only the FIRST advisory object of `via` (`via.find`), here `moderate`, so the finding is `dependency[MODERATE] lodash: Prototype Pollution in lodash`, counted as non-blocking, and the push PASSES with a known critical dependency. The two other new assertions (the lodash finding line, no dependency-audit skip) pass, and so do the audit-start assertions (every audit start is exactly `npm audit --json` in the fixture folder, three starts). By the plan's own rule for a defect found (criterion 19's treatment) the assertion is not relaxed; `src/lib/dependency-auditor.js` is not a declared file, so fixing the parser (take the highest severity of the package: `vuln.severity` or the maximum over `via`) needs the owner's answer through scope growth or a new plan. Decision needed from the CTO Chief: keep the assertion (suite red until the parser is fixed), or fix the parser in this slice via scope growth.

### Step 10 (continued after the CTO Chief's rulings; Decisions 28 to 30)

- **Update-check lines:** 17 files got `process.env.npm_config_update_notifier = 'false';` with a two-line comment after their requires: the 13 rulings files, `tests/quality-agent-script-launcher.test.js`, `tests/greenfield-journey.test.js`, `tests/verify-parses-full-output.test.js` and `tests/helpers/hotfix-check-harness.js`. The 22 files that load them (with the six hotfix-check files) ran 421 tests before and 421 after, 0 failed, 0 skipped (registry pointed at a closed port for both runs).
- **Parser fix (red then green):** red, with `SCRATCH/s2/parser-red.txt`: both new cases in `tests/security-scan-never-downloads-a-scanner.test.js` fail with `actual 'MODERATE', expected 'CRITICAL'`, and the criterion 18 test fails with `true !== false`. Green after the change in the dependency auditor (`SCRATCH/s2/parser-green.txt`): 2 of 2 and 1 of 1; the five dependency-auditor and SCA test files (186 tests) still pass. The SCA runner's own parser was read: it records one finding per advisory with that advisory's severity, so it does not share the defect.
- **Product change in `src/lib/sast-runner.js`** as section 1 writes it (two module-level functions, the constructor field, `projectEslintBin()`, the first line of `isToolAvailable`, `runESLintSecurity()` started by `process.execPath`, the two `TOOL_CONFIGS` texts). Reds of Steps 8 and 9 are all green: the new file, `sast-runner-failclosed`, `sast-runner-coverage`, `w07-portable-shellouts`, `quality-fleet-wiring`, `quality-agent-coverage`, `framework-security-checker`: 222 tests, 222 pass, 0 fail, 0 skipped (`SCRATCH/s2/green-runs-scrubbed.txt`). The affected-test list of section 10 (21 files): 660 tests, 660 pass. Lint over the whole repository: 0 warnings, exit 0; type check, lint test, false-green fence, reachability and export reachability: pass.
- **Deliberate breaks** (scratch copy, `SCRATCH/s2/deliberate-breaks.txt`): criterion 18, the recording without `vulnerabilities`, fails the finding assertion; criterion 20, `includeDevDependencies` false, fails on `npm audit --json --omit=dev`; criterion 19, a local server (in its own process) answering every request with `{}`, fails for want of the dependency-audit skip.
- **LIVE test (criterion 19):** green, about 1 s in the full run (`SCRATCH/s2/live-test-record.txt`).
- **No-configuration run (section 6):** the project without `eslint.config.js`, run for real: availability `true`; eslint exits 2 with "ESLint couldn't find an eslint.config.(js|mjs|cjs) file"; the scanner records a loud `eslint-security` error (the failed command) and 0 findings, so the scan reads as a failed scanner, not clean (`SCRATCH/s2/no-config-run.out`). Finding for the owner, not fixed here: a project with eslint but no flat configuration file gets that error from the security scan. (In the scan the error line is added to `errors`; whether it blocks is the existing fail-closed rule of `runSecurityScan`, not changed here.)
- **Release counts:** `node src/scripts/release.js`, VERSION unchanged: test-file count 572 to 573 in both lines of `CLAUDE.md` (14,983 bytes, under 15,000) and in `README.md`; no other file changed.
- **After request counts (criterion 21):** whole suite, 573 files: exit 0, 0 connections, 0 requests. File by file, 573 files: 0 connections, 0 requests for every file, no failed file (`SCRATCH/s2/after-request-counts.txt`). The first after count had found one connection: `tests/quality-agent-coverage.test.js`, test B14, a real `npm test` through `runFullTests` (2 `GET /npm`, update check); its setting is made and restored in a `finally` around that test (Decision 28); both counts were then redone. Neither of the two files another round owns made a request.
- Helper check (`SCRATCH/s2/helper-restore-check.txt`): `withClosedNpmRegistry` puts the six variables back exactly (deleted when unset), removes its folder and leaves the port refusing connections, on return and on throw; `makeFakeEslintProject` writes no `exports` field and returns the real path of the script.

### Not done at the first stop (history; Steps 11 to 16 and the open Step 9 items are closed in the last sections of this record)

Step 9: the scope-growth requests (not filed, see above); the criterion 22 presence search was run (`SCRATCH/s2/search-npm.json`) but its matches were read only to the first two per file, so the classification of section 7 stands on the plan's reading and the file-by-file count, not on a full reading; the reference before-run covers six files, not the candidates. Step 10 except the written test-only changes above, Steps 11 to 16, the after request counts, the paired runs and the review packets: not started (the brief ends the turn at the stop).

### Step 11 fix round 1, and Steps 12 to 16 (the resumed run)

The previous run of this builder stopped on a usage limit while fixing the reviews' findings (its last words "Now fix 13"). This run read the plan and the state on disk first. Every path is relative to the repository root or to `SCRATCH`; nothing was committed, no `menu` command was run, no plan file was moved.

**Which fixes were finished by whom.** All thirteen fixes were already on disk when this run started (the previous run had finished fixes 1 to 13, number 13 included). This run finished none itself. For each, it read the code, ran its test green, and, where a revert is cheap, ran the same test file against a scratch copy with that one fix reverted (`SCRATCH/s2/redcheck/`, never the worktree):

| fix | where | green test (this run) | red when the fix is reverted (scratch copy) |
|---|---|---|---|
| 1 walk bounded by `.git` | `src/lib/sast-runner.js` | `eslint in a node_modules above the repository is not installed`; `with no repository, only the project folder counts`; `the walk stops at the first repository`; the `.git` file case; `eslint in an ancestor's node_modules, inside the repository, is found` | red: the first three fail with the unbounded walk (`SCRATCH/s2/red-m1.txt`) |
| 2 ownership check dropped | `src/lib/sast-runner.js`, the lookup tests | `eslint linked in from outside the project is found (the ownership check is gone)`; test 2's precondition | red: both fail with the ownership check back (`red-m2.txt`) |
| 3 bin inside check before the real path | `src/lib/sast-runner.js` | `eslint whose bin is an absolute path outside the package is not installed, and the path is never touched` | red: fails with the early check removed (`red-m3.txt`) |
| 4 output limit 50 MB, stderr line in the error | `src/lib/sast-runner.js` | `opts.maxBuffer` assertion in the finding-blocks-the-push test; `a failed eslint start says why in plain words` | red: both fail with the limit and the piped standard error removed (`red-m4.txt`) |
| 5 non-string severity | `src/lib/dependency-auditor.js` | `a severity that is not a string never throws` | red with the unguarded `toLowerCase` (`red-m5-non-string-severity-throws.txt`) |
| 6 title from the deciding advisory, " (through names)" | `src/lib/dependency-auditor.js` | the four cases of `the dependency audit records the highest severity of a package` | red without the suffix, and red with the first advisory's title (`red-m6-*.txt`, `red-m6b-*.txt`) |
| 7 LIVE test reads npm's debug log | `tests/quality-fleet-wiring.test.js`, helper | the LIVE test: `ECONNREFUSED` and `127.0.0.1:<port>` found in the log under `<cache>/_logs/` | no revert run (the assertion is the fix) |
| 8 helper: more variables, every spelling | `tests/helpers/security-scan-fixtures.js` | the `withClosedNpmRegistry` describe (restore check with `HTTPS_PROXY` set) | red without the noproxy settings and red without the spelling handling (`red-m8-*.txt`, `red-m8b-*.txt`) |
| 9 setup failures remove their folders | helper | both "removes its folder when its own setup fails part-way" tests | red for `makeFakeEslintProject` without the cleanup (`red-m9-*.txt`); the port-race comment is a comment |
| 10 platform set before the modules are used | `tests/security-scan-never-downloads-a-scanner.test.js` | the win32 test | no red run: an ordering the test cannot tell apart |
| 11 starts recorded before the check | `tests/sast-runner-coverage.test.js` | the dispatch test (green) | no red run: an ordering inside a spy |
| 12 `recapture` field, major-version diagnostic, comment | capture file, `tests/quality-fleet-wiring.test.js` | the lodash test asserts the field's sentence; the LIVE test emits the diagnostic when the majors differ | no red run for the diagnostic (a diagnostic, not an assertion) |
| 13 update-check line after the requires | `tests/caller-error-is-not-a-verdict.test.js` | the file passes | no red run: a moved line |

Criterion 18 on BASE's dependency auditor (first-advisory parser) only: red on `a known-vulnerable dependency must block the push` (`SCRATCH/s2/red-base-c18.txt`). The new test file against BASE's `sast-runner.js` and `dependency-auditor.js` together: 28 tests, 4 pass, 24 fail (`SCRATCH/s2/red-base-security-scan-never-downloads-a-scanner.test.js.txt`): tests 1 to 5 (criteria 12, 13, 14, 14a) are among the 24 red ones and green after. The same run for `tests/quality-fleet-wiring.test.js` against BASE's `sast-runner.js` was stopped after six minutes (BASE's product starts real npx against the closed port, with npm's default retries), so the red for criteria 19 and 20 rests on the deliberate breaks recorded in Step 10.

**Green after the round.** The 52-file affected list (section 10 plus the 17 edited candidates, plus `lint`, `typecheck`, `false-green-fence`, `reachability`, `export-reachability`, `readme-numbers`): 1,283 tests, 1,283 pass, 0 fail, 0 skipped, run with the registry pointed at a closed address (`SCRATCH/s2/fix-round-affected.txt`). Lint over the whole repository with `--max-warnings 0`: exit 0. `.ctoc/false-green-baseline.json` is not in `git status`. The seven files of the round (new file, `sast-runner-failclosed`, `sast-runner-coverage`, `w07-portable-shellouts`, `quality-fleet-wiring`, `quality-agent-coverage`, `framework-security-checker`): 233 tests, 233 pass.

**Review findings outside this slice (one line each, for the owner to schedule).** (1) A project with eslint but no flat configuration file gets eslint's exit 2 as a loud scanner error from the security scan (found in the no-configuration run). (2) npm's own update check still asks the registry in CTOC's product npm starts (`src/lib/quality-agent.js`, `src/lib/step-13-verify.js`, `src/lib/dependency-auditor.js`, `src/lib/sca-runner.js`, `src/hooks/stop-test-gate.js`). (3) For one project with a lockfile, `npm audit` runs three times (npm, then the yarn and pnpm fallbacks). (4) SCA prints "javascript deferred to DependencyAuditor" even when npm is not installed. (5) The wording of the plan's section 7 about one empty file for both npm configs is wrong for npm 11 (Decision 30).

**Fix round 2.** Not run by this builder. Round 1 changed all three areas (the product lookup, the tests, the helper), so a second review of the round 1 fixes is the CTO Chief's call; no third round exists.

### Step 12: optimize

- The lookup runs once per scanner: `projectEslintBin()` caches the answer; the case `the answer is kept for the life of one scanner` passes (a deleted package still answers true for the same scanner, a new scanner looks again).
- The probe starts no process (tests 2 and 6 assert `starts` is empty) and the scan starts eslint once (tests 3 and 5 assert exactly one start).
- Nothing is duplicated: the fake eslint package, the closed port and the closed-registry environment are written once, in `tests/helpers/security-scan-fixtures.js`; a presence search of `tests/` for `ctoc-fake-eslint`, `COREPACK_NPM_REGISTRY` and `closedLoopbackPort` lists only the helper and the new test file (which names them in its description of the helper).
- Durations of the new file, from the TAP reporter (`SCRATCH/s2/new-file-tap.txt`): tests 1 to 4 between 7 and 30 ms (test 1 19 ms, test 2 7 ms, test 3 30 ms, test 4 8 ms); test 5, the real eslint 9, 96 ms; the lookup cases 0.6 to 2 ms each (the describe 22 ms); the failed-start case 22 ms; the parser cases under 1 ms; the helper describe 11 ms. The whole file alone: 0.29 s wall. Every case is within the expected 100 ms.
- No new or changed test asserts wall-clock time (the LIVE test records its `skipped` list through `t.diagnostic`, no time assertion).

### Step 13: secure

- Lookup cannot be redirected: read against section 1 as changed by Decisions 31 to 33 (a direct walk, bounded by the repository, no `require.resolve`; bin checked inside the package before and after the real path). The cases pass: a link from outside the project is now found by design (Decision 32), a relative `bin` outside the package, a `bin` folder linked outside the package, an absolute `bin` outside the package (and never resolved), an unusable folder: all answer not installed.
- Probe of `NODE_PATH` and the global folder, scratch script `SCRATCH/s2/step13-probe.js` (a temporary folder with `project/`, no eslint, and `home/.node_modules/eslint`, each case in its own child process):
  - (a) `NODE_PATH` = this repository's `node_modules`: control line, Node's resolver finds `eslint/package.json` from the project (resolves to a folder outside the project); lookup `isToolAvailable('eslint')` = false.
  - (b) `HOME` and `USERPROFILE` = the temporary home, `NODE_PATH` deleted: control line, the resolver finds it; lookup = false.
- No shell: the eslint start is `execFileSync` of `process.execPath` with an argument list; test 3 asserts `opts.shell === undefined`, test 4 the win32 arguments with no `.cmd`; the w07 source fences pass.
- No registry from the product: the three lines of `src/lib/sast-runner.js` that a search for `npx` lists (89, 472, 755) are comments saying npx is no longer used; no start names npx.
- The fixtures and helper hold no secret, local path, account name or host name: the helper was read in full; the two eslint recordings and capture files were read; a script searched every changed and new file of this slice for the home folder, the account name, the host name, and e-mail, key and token shapes (`SCRATCH/s2/scrub-check.js`; no hit on the home folder, account name or host name; the shape hits are version strings such as `eslint@9.0.0`, scoped package names and fixtures of older tests outside this slice's diff). The plan's own mentions of `/private/var` are the generic path eslint writes on macOS, not a path of this machine.
- The scratch scripts: the recorder binds `127.0.0.1` only (`registry-recorder.js` line 47); the count script starts every child with an argument list and no shell.
- Findings of the security scan: fixes 1 to 4 above. Open: none known to this builder.
- The record names no home-folder path, account name or e-mail address.

### Step 14: verify

- Affected tests, lint, type check, false-green fence, reachability: see "Green after the round". Run once more after the last fix, 0 failed, 0 skipped.
- After request counts (criterion 21), on this tree with the same scripts and settings as the base counts (check mode: `isCI` false, removed names none; a fresh empty npm cache per run and per file; the update check never switched off by the count):
  - whole suite, 573 files: exit 0, 0 connections, 0 requests, 0 connections without a request (wall 51.6 s, load 9.5 at start and 18.2 at end; `SCRATCH/s2/fix2-after-whole.json`);
  - file by file, 573 files, eight workers: 0 files made a connection, 0 failed files (`SCRATCH/s2/fix2-after-files.json`).
  Neither of the two files another round owns made a request.
- After whole-suite timing run (`node --test` with the per-file reporter, the 573 files): 13,164 tests, 13,164 pass, 0 fail, 0 cancelled, 0 skipped; wall 53.03 s, user 242.34 s, system 165.21 s, processor time 407.55 s; load 18.8 at start, 22.7 at end; 18 cores; Node v24.14.1; the tree is BASE plus this slice's uncommitted changes (`08f9718c`); npm 11.11.0; `yarn` not installed, `pnpm` a corepack shim; none of semgrep, osv-scanner, trufflehog, detect-secrets, gosec, bandit installed. Longest files: `hotfix-check-corpus` 48.78 s, `hotfix-check-guards` 36.68 s, `hotfix-check-readers` 35.38 s, `hotfix-check-test-run` 34.84 s (all slice 1's). The full `npm test` is not run in this slice.
- Paired interleaved runs of 28 files (the six changed files and the 22 edited candidates, `node --test` with the per-file reporter, before from `SCRATCH/base-s2/`): before, after, before, after. Load is high because other work ran on the machine (it was 17 to 23 for these four, 2.7 to 7 later).

| run | wall s | user s | system s | processor s | load start to end | tests |
|---|---|---|---|---|---|---|
| before 1 | 26.85 | 96.31 | 70.98 | 167.29 | 17.2 to 17.6 | 625 pass |
| after 1 | 26.22 | 80.46 | 61.97 | 142.43 | 16.5 to 18.8 | 626 pass |
| before 2 | 25.93 | 95.56 | 71.05 | 166.61 | 18.8 to 21.4 | 625 pass |
| after 2 | 26.99 | 81.55 | 63.69 | 145.24 | 20.7 to 22.8 | 626 pass |

  Per file, the runner's own duration in seconds, before 1 / after 1 / before 2 / after 2: `quality-agent-coverage` 22.71 / 11.37 / 22.09 / 11.22; `quality-fleet-wiring` 17.16 / 6.21 / 16.36 / 6.19; `w07-portable-shellouts` 0.82 / 0.01 / 0.58 / 0.01; `framework-security-checker` 4.69 / 3.60 / 4.55 / 3.16; `sast-runner-coverage` 0.04 / 0.06 / 0.04 / 0.03; `sast-runner-failclosed` 0.02 / 0.04 / 0.02 / 0.03. The 22 candidates moved by less than the noise (the six hotfix-check files 20.5 to 26.9 s on both sides; the others under 5.2 s). The wall of the 28-file run is set by the slowest hotfix-check file (about 25 s), so it did not move (26.85 to 26.22 to 25.93 to 26.99): processor time fell by 24.9 s and 21.4 s.
- Criterion 23, the three files alone, before / after / before / after on a quiet machine (load 2.7 to 6.7; a fourth pair, `tri-2`, overlapped with its neighbour and is discarded; `SCRATCH/s2/summarize-tri.js`):

| run | wall s | processor s | per file s (quality-agent-coverage, quality-fleet-wiring, w07) | load |
|---|---|---|---|---|
| before 1 | 22.85 | 26.34 | 22.77, 16.16, 1.17 | 2.7 to 3.0 |
| after 1 | 9.51 | 10.38 | 9.43, 3.73, 0.01 | 3.0 to 3.5 |
| before 2 | 23.30 | 26.28 | 23.22, 17.16, 0.82 | 6.7 to 5.5 |
| after 2 | 9.36 | 10.19 | 9.30, 3.69, 0.01 | 5.1 to 4.9 |

  Criterion 16: w07 took 0.82 to 1.17 s before (the profile's 30.4 s did not reproduce here: the registry answered fast) and 0.01 s after, with no process started.
- The new test file alone, after: 28 tests, 28 pass, wall 0.29 s, processor 0.32 s (load 22.7).
- Where "faster" is written and where not. Faster, shown in both pairs: the three files (wall 22.9 and 23.3 s to 9.5 and 9.4 s; processor 26.3 s to 10.4 and 10.2 s), the 28-file run's processor time (167.3 and 166.6 s to 142.4 and 145.2 s). NOT shown: the wall-clock time of the whole suite and of the 28-file run, because the longest files are slice 1's hotfix-check files (whole suite 53.03 s after, against 52.5 s in slice 1's completion run, which ran at a much higher load, 26.9 to 42.6 against 18.8 to 22.7); the longest file in the whole suite is the same one (`hotfix-check-corpus`, 48.78 s against 48.87 s). Whole-suite processor time did not grow: 407.55 s against 448.96 s in slice 1's completion run (loads differ, so the two are not a like-for-like pair).

### Step 9 items closed in this run

- Criterion 22, re-run on BASE and read in full (`SCRATCH/s2/search-npm-base.json`: 56 test files, 210 matching lines, each file's lines read). Classification of the files that START npm or npx: stand-ins on `PATH` with no inherited environment: `quality-gate-runner-compaction` (shell scripts named npm and npx). Answered by a spy: `quality-agent-coverage` (except test B14, a real `npm test` through `runFullTests`, edited), `quality-fleet-wiring` (the lodash test; the live test and the line-472 test use the closed registry), `dependency-auditor`, `sca-runner`, `sca-runner-coverage` and `sast-runner-coverage` (spies on `execSync` and `execFileSync`). Pointed at a closed loopback port: the LIVE test, and the tests of `quality-fleet-wiring`, `quality-agent-coverage` and `framework-security-checker` named in section 4. Real npm through CTOC's code, with the setting switched off by this slice: `quality-agent-script-launcher`, `greenfield-journey`, `verify-parses-full-output`, the six hotfix-check files through the harness, and the 13 files of Decision 28 (found by the base file-by-file count, which a presence search cannot find because they start npm through `runVerify` and `completeTaskPlan`). Name npm or npx and start nothing: `stop-test-gate-coverage` (program-name reads), `protect-records` (starts the hook script with Node, passes `npm test` as a command string to the hook), `app-runner` and `app-runner-coverage` (a package.json script string; the code under test refuses or never spawns it), `lint` and `typecheck` (messages), `agent-tool-grants`, `tool-detector-defects` and the remaining files of the list (strings in fixtures, comments and assertions; for example `capability-registry`, `hooks`, `init-project`, and the ecosystem names in `sca-runner`). The after file-by-file count found 0 connections from any of the 573 files, which is the check that none was missed.
- The reference before-run of the changed files with the candidates: pair run `before 1` above is it (28 files, from `SCRATCH/base-s2/`, load 17.2 to 17.6); w07 took 0.82 to 1.17 s there.
- The scope-growth requests were not needed: the CTO Chief's Decision 28 declared the 13 files.
- The projects that now get the loud eslint message instead of a scan (the cost the functional plan accepted): a project with no `node_modules/eslint` inside its repository (eslint only global; a Yarn plug-and-play project; a project whose eslint sits in a folder above its repository); the skip reads `SAST skipped for javascript: no scanner installed (need semgrep or eslint)`, and the same for typescript.
- The lookup is bounded by the repository (Decision 31), not "any ancestor": `/node_modules`, `/tmp/node_modules` and `$HOME/node_modules` do NOT serve a project below them any more. The earlier plan text and the CTO Chief's earlier ruling said otherwise; the review (a security finding) changed it. Without a `.git` on the way, only the project folder counts.

### Fix round 2 (the second security scan, verdict warn): decisions 44 to 46

Edited only `src/lib/sast-runner.js`, `src/lib/dependency-auditor.js`, `tests/security-scan-never-downloads-a-scanner.test.js` and this plan. No `menu` command, no plan move, nothing committed, nothing written under `.ctoc/streaming`, `.ctoc/approvals` or `.ctoc/state/verify`. `SCRATCH` is the build's scratch folder.

Red, then green, each test written first and run on the unchanged code (file alone: 34 tests, 31 pass, 3 fail; after the fixes 34 pass, 0 fail, 0 skipped):
- Fix 1 (decision 44), red: `a shared folder (mode 1777) holding .git and eslint above a project with no repository: not installed (POSIX)` failed with `true !== false` on the unchanged walk. Its counterpart `the same layout without the other-write bit still finds it` and the Windows case passed before and after (they are the controls: the bit is what decides, and Windows is documented). Green after the stat check. The scanner's reproduction was run before and after in a scratch script (`SCRATCH/../repro/planted-shared-folder.js`, the same layout with the shared folder's mode set): mode 755 gives "PLANTED ESLINT FOUND", mode 1777 gives "none (skip loudly)". `planted-git.js` itself builds its folder at mode 755, so it still prints a found eslint for that layout, which is the intended answer for a folder only its owner can write.
- Fix 2 (decision 45), red: `a numeric severity goes through the CVSS bands ...` failed, `'MODERATE' !== 'CRITICAL'` for `mapNpmSeverity(9.8)`. Green after routing non-strings through `mapCvssOrLabel`; the earlier case of decision 35 (5, an object, null: MODERATE or the package's own HIGH) still passes.
- Fix 3 (decision 46), red: `the recorded line of eslint's standard error has its control characters removed and is capped at 300 characters` failed on "no control character is recorded" (the unchanged code recorded the escape, bell, null and delete characters and all 500 trailing characters). Green after the cleaning.

Verified after the round: lint over the whole repository with `--max-warnings 0`: exit 0. The whole suite, 573 files, with the request recorder (`SCRATCH/count-registry-requests.js`, check mode `isCI` false, removed names none, fresh npm cache): exit 0, 13,170 tests, 13,170 pass, 0 fail, 0 cancelled, 0 skipped (13,164 before this round plus the 6 new cases), 0 connections, 0 requests, 0 connections without a request (`SCRATCH/s2/fix3-after-whole.json`, wall 51.6 s, load 13.1 to 16.3). File by file, 573 files, eight workers: 0 files made a connection, 0 failed files (`SCRATCH/s2/fix3-after-files.json`). The whole-suite run contains `lint`, `typecheck`, `false-green-fence`, `reachability`, `export-reachability` and `readme-numbers` and every file of the section 10 list; all passed. `.ctoc/false-green-baseline.json` unchanged by this round (nothing in it was written).

Finding for the owner: the Windows residual of decision 44 (also listed under "Findings outside this slice").

### Criteria readings and closing lines

- Criterion 19: the LIVE test is green, 980 ms in the timed run (`s2-tri-1-after`), now also asserting that npm's own debug log under the cache folder names `ECONNREFUSED` and the closed address. The criterion 18 test took 8 ms.
- Test 4 (the Windows start): not run on Windows; `process.platform` is replaced and only the arguments of the start are asserted.
- The full `npm test` runs once after the last slice, by the owner's order; this slice's run of it is not a gate result. Coverage at or above the floor is checked by that final run only.
- `git diff --name-only -- src` lists two files, `src/lib/sast-runner.js` and `src/lib/dependency-auditor.js` (the second added by the CTO Chief's ruling, Decision 29). `git status --short` lists only declared files and this plan, plus two entries that are not this slice's: the untracked `IRON_LOOP.md` and the untracked dispatch log folder under `.ctoc/audit/dispatches/`.
