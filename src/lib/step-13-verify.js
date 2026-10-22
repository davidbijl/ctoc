/**
 * Step 14: VERIFY - Quality Gate Runner
 *
 * Runs all quality checks as the single quality gate in the Iron Loop.
 * Tries `ctoc quality` first (Smart Quality Gate System), falls back to
 * direct lint/type/test commands when quality gates are not available.
 *
 * This module has NO dependency on smart-quality-gate-system.
 * When that system ships, Step 14 will automatically use it.
 *
 * THE FAIL-CLOSED CONTRACT (R4-A). A check that DID NOT RUN is not a check that
 * PASSED. This module was broken in both directions and is now closed on both:
 *
 *   - NO verifiable toolchain (no package.json, no tests, no linter) ⇒ ZERO checks
 *     ran ⇒ `passed:false`, error `no-verifiable-toolchain`. It NEVER returns a
 *     vacuous "all checks passed" when nothing ran. A gate that opens on nothing
 *     is not a gate.
 *   - A MISSING npm script (finding C2) is `applicable:false` — recorded, not a
 *     failing check. `npm error Missing script: "lint"` is an ABSENT script, not a
 *     failed lint, so a normal project with tests but no lint/typecheck script
 *     PASSES instead of being spuriously refused.
 *
 * VERIFY passes ONLY when: at least one substantive check actually RAN, every
 * check that ran passed, no test was skipped (CLAUDE.md: "0 skipped"), coverage —
 * when measurable against the project's declared floor (.ctoc/coverage-baseline
 * .json `minPct`) — cleared it, and any app-shaped project launched and responded.
 *
 * A RUN THAT DID NOT COMPLETE IS UNCERTIFIED, NOT A FAILURE. Two ways a check can
 * fail to complete are given HONEST, DISTINCT verdicts rather than the mislabel
 * "Tests failed": an output OVERFLOW past the capture buffer (ENOBUFS) and a
 * TIMEOUT past the wall-clock budget (ETIMEDOUT/SIGTERM). Both fail CLOSED — the
 * gate is refused — but each names its true reason, and the timeout budget is
 * RAISABLE (per call via `opts.timeout`, per environment via
 * `CTOC_VERIFY_TIMEOUT_MS`, default 900000ms, 15 minutes) so a legitimately
 * long-but-green suite can extend it instead of being refused on latency alone.
 * A timeout is NOT flagged a launch failure: it RAN, so it can never be
 * reclassified NOT-RUN and papered over by some other passing check.
 *
 * X3 — IT ALSO FAILS CLOSED ON AN UNREADABLE INSTRUMENT. When a test runner emits a
 * node:test-shaped summary but its fail counter cannot be READ from it, that run is
 * UNCERTIFIED, not clean: "I could not read the fail count" and "there were zero
 * failures" are different facts and must never produce the same verdict. Node's
 * reporter format is not our contract and has already changed once (the `ℹ` spec
 * reporter, and colour) — the next change must be a LOUD failure, not a silent green.
 *
 * V1 — PARSE THE WHOLE OUTPUT, BOUND ONLY WHAT IS STORED. A fail-closed rule is only
 * as honest as the input it judges. This module captured a run, truncated it to the
 * first 4000 characters for storage, and then parsed THE TRUNCATED STRING for the
 * coverage percentage, the fail count and the skipped count. Runners print their
 * verdict LAST, so on every real run the verdict fell past the cut, coverage read as
 * null, and VERIFY refused the plan as "unmeasured" — making Gate 3 un-passable for
 * every plan in the project and leaving the override as the only exit. An override
 * that is the only path is not a gate.
 *
 * The ordering is therefore load-bearing and is enforced by
 * tests/verify-parses-full-output.test.js:
 *   1. evalCategory returns the COMPLETE output,
 *   2. applyTestQualityContracts parses it,
 *   3. runFallbackChecksWith (inside runFallbackChecks) calls boundCheckOutputs LAST, keeping head + tail so the
 *      persisted evidence still shows the verdict a human needs to read.
 * Never truncate before step 2.
 *
 * VENV — A PYTHON PROJECT'S OWN TOOLS. A project with a pyproject.toml usually keeps
 * ruff, mypy and pytest in its own `.venv` (or `venv`) and not on the PATH of whoever
 * started the session. When that tool folder (`bin`, or `Scripts` on Windows) exists,
 * it is put FIRST on the PATH of the fallback checks' child processes ONLY, and the
 * same environment is used for the `--version` probe and for the run, so the tool
 * found is the tool run. The CTOC process's own environment is never changed. The
 * `ctoc quality` probe and the app launch do not get it. The folder put first is
 * recorded on each check that ran as `firstOnPath`.
 *
 * TEMP — A TEMP FOLDER OF ITS OWN. Each run of the fallback checks makes a fresh folder
 * `~/.cache/ctoc-check-temp/run-XXXXXX` and gives it to the checks' child processes ONLY,
 * through `TMPDIR`, `TMP` and `TEMP`, in the same environment copy as the venv `PATH`. It is
 * used for the `--version` probe and the run alike. It is removed after the last check and
 * before the app launch, whatever the outcome. Its stored form is recorded as `tempFolder` on
 * each check that ran. If the folder cannot be made, has an unsafe word in its path, or cannot
 * be removed, the checks run as before and `tempFolderNote` says why. The verdict and the
 * summary never change for it. The CTOC process's own environment is never written. The
 * `ctoc quality` probe and the app launch do not get the folder.
 */

const { execSync, spawnSync } = require('child_process');
const safeFs = require('./safe-fs');
const path = require('path');
const os = require('os');
const { driveAppSync } = require('./app-runner');

// ---------------------------------------------------------------------------
// X3 — ANSI. Node COLORIZES its reporter output when FORCE_COLOR is set, EVEN WHEN
// PIPED, and its DEFAULT "spec" reporter prefixes summary counters with `ℹ`, not the
// TAP `#`. The line these parsers receive is therefore not `# fail 8` but
// `ESC[31mℹ fail 8ESC[39m`, so a `^`-anchored, `#`-only parse matches the ESCAPE BYTE
// and finds nothing. Of the four shapes node actually emits (TAP/spec x plain/colour)
// this module read exactly ONE — and its no-match path fell through in SILENCE.
//
// Mirrored from src/scripts/test-gate.js (X2), deliberately NOT imported: that module
// does not export stripAnsi (it has no caller outside itself, and the export fence
// treats an unreachable export as dead surface). Ten duplicated lines with this
// pointer is the smaller debt. If review prefers a shared src/lib/ansi.js imported by
// both, that is a better answer — it changes X2's landed contract, so it is flagged
// rather than taken here.
//
// No new dependency (`strip-ansi` would do this in one import): the repo rule is
// stdlib and what is already installed.
//
// The escape byte is the `\x1b` ESCAPE SEQUENCE, never a raw control byte: a raw byte
// is invisible in review and mangles diffs. This is a LITERAL RegExp, not
// `new RegExp(...)` over a built string — src/ enforces `security/detect-non-literal-
// regexp` at error under --max-warnings 0, and a dynamic constructor here would add a
// NEW lint error (warnings are bugs). `no-control-regex` is off repo-wide, so the
// `\x1b` escapes are permitted. The test file uses String.fromCharCode(27) for its
// fixtures; it is exempt from that rule.
// ---------------------------------------------------------------------------
const ANSI_PATTERN =
  /\x1b\[[0-9;:<=>?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g;
//  ^ CSI (SGR colour `ESC[31m`, cursor moves)  ^ OSC (hyperlinks/titles)  ^ 2-char escapes

/**
 * Remove ANSI escape sequences so the line-anchored parsers below see the real first
 * character of each line rather than an escape byte.
 * @param {string} text - Raw captured output.
 * @returns {string} The text with all ANSI escape sequences removed.
 */
function stripAnsi(text) {
  return String(text == null ? '' : text).replace(ANSI_PATTERN, '');
}

/**
 * Run Step 14 VERIFY quality checks.
 *
 * @param {string} projectPath - Project root path
 * @returns {Object} Result with status, checks, and details
 */
function runVerify(projectPath) {
  const result = {
    passed: false,
    method: null,
    checks: {},
    errors: [],
    summary: ''
  };

  // Try Smart Quality Gate first.
  let gatePassed = false;
  try {
    const gateResult = tryCommand('ctoc quality --tier=1', projectPath);
    if (gateResult.success) {
      result.method = 'ctoc-quality-gate';
      result.checks.qualityGate = { passed: true, output: gateResult.output };
      gatePassed = true;
    }
  } catch (e) {
    // ctoc quality not available, use fallback
  }

  // Fallback to direct commands when the quality gate is unavailable.
  if (!gatePassed) {
    result.method = 'fallback-direct';
    const fallbackResult = runFallbackChecks(projectPath);
    result.checks = fallbackResult.checks;
    result.errors = fallbackResult.errors.slice();
  }

  // THE LAST MILE: green tests are not "working" — a human must be able to open
  // the app and get a response. For an app-shaped project, launch it and drive
  // one real action; a non-responding app FAILS verification with a loud reason.
  // A library/unknown project reports applicable:false and is unaffected.
  applyAppRunCheck(result, projectPath);

  // THE FAIL-CLOSED CONTRACT (R4-A): a check that did NOT run is not a check that
  // passed. VERIFY passes ONLY when at least one substantive check actually RAN,
  // every check that ran passed, no required check was skipped, and coverage —
  // when measurable against a declared floor — cleared it. A project where
  // NOTHING could run is NOT a pass: it fails loudly with `no-verifiable-toolchain`,
  // naming what was looked for. This is the defect this slice closes — a gate that
  // opened on zero checks is not a gate.
  const substantive = countSubstantiveChecks(result);
  if (substantive === 0) {
    result.errors.push(
      'no-verifiable-toolchain: looked for npm scripts (lint/typecheck/test), ' +
      'pyproject/ruff/mypy/pytest (on PATH and in the project\'s .venv or venv), ' +
      'go.mod/go test, Cargo/cargo test, and a ' +
      'launchable app — none could run. A verification that verified nothing ' +
      'is NOT a pass.'
    );
  }

  result.passed = result.errors.length === 0 && substantive > 0;
  result.summary = buildSummary(result, substantive);
  return result;
}

/**
 * Count the checks that ACTUALLY RAN in a VERIFY result. A "substantive" check is
 * one that executed real work: the ctoc quality gate, a lint/typecheck/test tool
 * that ran, or an app that was launched. `applicable:false` (no such tool/script)
 * and never-launched apps do NOT count — they ran nothing, so they can never be
 * the sole basis for a pass.
 *
 * @param {Object} result - The VERIFY result being assembled.
 * @returns {number} How many substantive checks ran.
 */
function countSubstantiveChecks(result) {
  let n = 0;
  const c = result.checks || {};
  if (c.qualityGate && c.qualityGate.passed) n++;
  for (const k of ['lint', 'types', 'tests']) {
    if (c[k] && c[k].ran === true) n++;
  }
  // A launched app is substantive activity regardless of whether it responded —
  // whether it responded is the pass/fail, recorded separately as an error.
  if (c.appRuns && c.appRuns.applicable === true && c.appRuns.launched === true) n++;
  return n;
}

/**
 * Run the "does the app actually run?" check and fold its outcome into a VERIFY
 * result. Adds `checks.appRuns`; for an app-shaped project that fails to respond,
 * pushes a loud, human-readable error onto `result.errors`. A library/unknown
 * project records `applicable:false` and never contributes an error.
 *
 * @param {Object} result - The VERIFY result being assembled (mutated in place).
 * @param {string} projectPath - Project root path.
 */
function applyAppRunCheck(result, projectPath) {
  let app;
  try {
    app = driveAppSync(projectPath);
  } catch (e) {
    app = {
      applicable: true,
      launched: false,
      responded: false,
      evidence: {},
      durationMs: 0,
      errors: [`app-runner threw: ${e.message}`]
    };
  }

  if (!app || app.applicable === false) {
    result.checks.appRuns = {
      applicable: false,
      reason: (app && app.evidence && app.evidence.reason) || 'No human-facing runtime to launch.'
    };
    return;
  }

  result.checks.appRuns = {
    applicable: true,
    launched: app.launched,
    responded: app.responded,
    evidence: app.evidence,
    durationMs: app.durationMs,
    errors: app.errors
  };

  if (!app.responded) {
    const detail = (app.errors && app.errors.length)
      ? app.errors.join('; ')
      : 'the launched app produced no usable response';
    result.errors.push(`App did not run: ${detail}`);
  }
}

/**
 * Build a human-readable one-line summary for a VERIFY result. On success it names
 * exactly what RAN and what was not applicable — it NEVER claims "all checks
 * passed" when nothing ran (that phrasing is the fingerprint of the old vacuous
 * pass). On failure it lists the failing checks.
 *
 * @param {Object} result - The assembled VERIFY result.
 * @param {number} substantive - How many substantive checks ran.
 * @returns {string} Summary line.
 */
function buildSummary(result, substantive) {
  const c = result.checks || {};
  const ran = [];
  const notApplicable = [];
  if (c.qualityGate && c.qualityGate.passed) ran.push('ctoc quality gate');
  for (const [key, label] of [['lint', 'lint'], ['types', 'typecheck'], ['tests', 'tests']]) {
    if (c[key] && c[key].ran === true) ran.push(label);
    else if (c[key]) notApplicable.push(label);
  }
  if (c.appRuns && c.appRuns.applicable === true) {
    if (c.appRuns.responded) ran.push('app launch');
    else if (c.appRuns.launched) ran.push('app launch (no response)');
  }

  if (result.passed) {
    let s = `VERIFY passed — ran: ${ran.join(', ') || 'nothing'}`;
    if (notApplicable.length) s += `; not applicable: ${notApplicable.join(', ')}`;
    return s;
  }
  if (substantive === 0) {
    return `VERIFY failed: no verifiable toolchain — nothing ran, so nothing was verified. ${result.errors.join('; ')}`;
  }
  return `${result.errors.length} check(s) failed: ${result.errors.join('; ')}`;
}

/**
 * Load and parse a project's package.json. Returns null when absent/unparseable.
 * @param {string} projectPath - Project root.
 * @returns {Object|null}
 */
function loadPackageJsonSafe(projectPath) {
  const p = path.join(projectPath, 'package.json');
  if (!safeFs.existsSync(p)) return null;
  try {
    return JSON.parse(safeFs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

/** True iff `pkg` declares a runnable npm script under `name`. */
function npmScriptExists(pkg, name) {
  return !!(pkg && pkg.scripts && typeof pkg.scripts[name] === 'string' && pkg.scripts[name].trim());
}

/**
 * The tool-folder names tried, in order, inside a Python project.
 */
const VENV_DIR_NAMES = Object.freeze(['.venv', 'venv']);

/**
 * Find a Python project's own tool folder: `<project>/.venv/bin` first, then
 * `<project>/venv/bin` (`Scripts` instead of `bin` on Windows). The first candidate
 * that is a directory wins. Never throws for a missing or unreadable folder.
 * @param {string} projectPath - Project root.
 * @returns {{dir: string, shown: string}|null} `dir` is absolute (the checks run with
 *   `cwd: projectPath`, so a relative PATH entry would be resolved a second time);
 *   `shown` is the project-relative label with `/` separators, safe to store.
 */
function projectVenvBin(projectPath) {
  const binName = process.platform === 'win32' ? 'Scripts' : 'bin';
  for (const venvName of VENV_DIR_NAMES) {
    const dir = path.resolve(projectPath, venvName, binName);
    let stat;
    try {
      stat = safeFs.statSync(dir);
    } catch (e) {
      // ENOENT (absent), ENOTDIR (a file on the way) and EACCES (unreadable) all
      // mean "no tool folder here". None is a verdict: with no folder found, the
      // lookup is exactly the PATH-only lookup of a project without a venv.
      stat = null;
    }
    if (stat && stat.isDirectory()) return { dir, shown: `${venvName}/${binName}` };
  }
  return null;
}

/**
 * A COPY of the process environment for the fallback checks' children. `process.env`
 * itself is never written.
 *
 * - With a tool folder (`binDir`), it goes first on PATH. An empty or missing PATH becomes
 *   exactly `binDir`: a trailing empty entry would mean "the current folder" on Linux and macOS.
 * - With a run folder (`tempDir`), TMPDIR, TMP and TEMP all name it.
 * - With neither, the result is `undefined`: no `env` key reaches `spawnSync` or `execSync`.
 *
 * The same copy goes to every `--version` probe and to every check of a run, so the probe
 * and the run see the same PATH and the same temp folder.
 * @param {string|null} [binDir] - Absolute tool folder to put first on PATH.
 * @param {string|null} [tempDir] - Absolute run folder for TMPDIR, TMP and TEMP.
 * @returns {NodeJS.ProcessEnv|undefined}
 */
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

/** The names a child reads its temp folder from: TMPDIR (Linux, macOS), TMP and TEMP (Windows). */
const TEMP_VARIABLES = Object.freeze(['TMPDIR', 'TMP', 'TEMP']);
/** The folder, under the home folder, in which each VERIFY run makes its own temp folder. */
const CHECK_TEMP_BASE_PARTS = Object.freeze(['.cache', 'ctoc-check-temp']);
/** The fixed start of every run folder's name, so a killed run's leftover is easy to find and delete. */
const CHECK_TEMP_PREFIX = 'run-';
/** How many fresh names are tried before VERIFY falls back to the inherited temp folder. */
const CHECK_TEMP_TRIES = 3;

// The words a temp folder's path must not contain. They are taken from what
// src/hooks/protect-records.js scans when its decision crashes: UNCHECKED_SUSPECT_RE,
// MENU_MENTION_RE (a background agent's call), SETTINGS_MENTION_RE (a background agent's call,
// NFKC-folded) and the sweep confirmation `confirmsSweep`. A run folder that holds one of them
// makes the suite's crash tests refuse their own temp paths. The list is kept here because lib
// does not read hooks, and tests/step-13-verify.test.js reads the hook's source and fails when
// the hook gains a word that is missing here.
const UNSAFE_TEMP_WORDS = Object.freeze([
  // UNCHECKED_SUSPECT_RE. stampAndLedger and persistVerifyResult are covered by ledger and verify.
  '.ctoc', 'approval', 'verify', 'ledger', 'backfill', 'approveplan', 'crossbysufficiency',
  'streamapprove', 'streamanswer',
  // MENU_MENTION_RE. The four words it shares with the line above are not repeated.
  'start.js', 'menu-screens', 'streaming-gate', 'streaming-precompute', 'continueaftercrossing',
  'approvesubplans', 'crossonevidence', 'pendinggatedecisions',
  // SETTINGS_MENTION_RE.
  'settings.json', 'settings.local.json',
  // confirmsSweep (its other form, two words together, is checked in unsafeTempWord).
  'applysweep'
]);

/**
 * The error CODE of a failure, never its message: messages carry absolute paths, and with
 * them the user's name.
 * @param {any} e - The thrown value.
 * @returns {string} `e.code` when that is a non-empty string, else `'an unknown error'`.
 */
function errorCode(e) {
  return e && typeof e.code === 'string' && e.code ? e.code : 'an unknown error';
}

/**
 * The refused word a path holds, or null. The path is read twice, as written and after NFKC,
 * because the protection hook reads it both ways:
 * - it tests UNCHECKED_SUSPECT_RE (flag `i`) and MENU_MENTION_RE (case-sensitive) on the RAW
 *   text, where a combining mark after `verify` still matches and NFKC would join it into
 *   the letter;
 * - it tests SETTINGS_MENTION_RE (`iu`) on the NFKC text, where a long-s `ſettings.json`
 *   folds to `settings.json`;
 * - confirmsSweep removes quotes and backslashes first;
 * - lower-casing every word is stricter than MENU_MENTION_RE and is never weaker.
 * @param {string} p - A path.
 * @returns {string|null} The matched word in double quotes (for example `"verify"`), or
 *   the two-word form of the sweep confirmation, or null.
 */
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

/**
 * The stored form of a folder: the home folder becomes `~`, and the separators become `/`.
 * Example: home `/home/ctoc`, folder `/home/ctoc/.cache/ctoc-check-temp/run-Ab12Cd` gives
 * `~/.cache/ctoc-check-temp/run-Ab12Cd`; the folder `/tmp` gives `/tmp`.
 * @param {string} p - Absolute folder.
 * @param {string} home - The home folder, or an empty string when there is none.
 * @returns {string}
 */
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

/**
 * Remove a run folder. A recursive delete only of a folder this run made: a direct child
 * of the base whose name has the fixed start. Never the base, never the home folder, never
 * anything else. `maxRetries: 2` retries an EBUSY/EPERM (Windows holding a file open) twice.
 * @param {string} dir - The run folder.
 * @param {string} base - The base folder it must be a direct child of.
 * @returns {string|null} Null when the folder is gone; otherwise the reason.
 */
function removeRunFolder(dir, base) {
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

/**
 * @typedef {Object} CheckTemp
 * @property {string|null} dir - The run folder, or null when the checks run with the inherited one.
 * @property {string|null} base - The folder the run folder was made in, or null.
 * @property {string} home - The home folder, or an empty string.
 * @property {string} shown - The stored form of the folder the checks use.
 * @property {string|null} note - A plain sentence when something went wrong, else null.
 */

/**
 * Find the base folder under the home folder and make it. Never throws.
 * @param {string} home - An absolute home folder.
 * @returns {{base: string, realBase: string, shownBase: string}|{reason: string}}
 */
function checkTempBaseFor(home) {
  const base = path.join(home, ...CHECK_TEMP_BASE_PARTS);
  const shownBase = shownTempFolder(base, home);
  const refused = 'a word CTOC\'s record protection refuses when it cannot run';
  const homeWord = unsafeTempWord(base);
  if (homeWord) {
    return { reason: `VERIFY did not make its own temp folder because the home folder's path contains ${homeWord}, ${refused}` };
  }
  try {
    if (!safeFs.statSync(home).isDirectory()) {
      return { reason: `VERIFY could not make its own temp folder ${shownBase} because the home folder is not a folder` };
    }
  } catch (e) {
    return { reason: `VERIFY could not make its own temp folder ${shownBase} because the home folder does not exist or cannot be read (${errorCode(e)})` };
  }
  try {
    safeFs.mkdirSync(base, { recursive: true });
  } catch (e) {
    return { reason: `VERIFY could not make its own temp folder ${shownBase} (${errorCode(e)})` };
  }
  let realBase;
  try {
    realBase = safeFs.realpathSync(base);
  } catch (e) {
    return { reason: `VERIFY could not read the real path of ${shownBase} (${errorCode(e)})` };
  }
  const realWord = unsafeTempWord(realBase);
  if (realWord) {
    return { reason: `VERIFY did not use ${shownBase} because its real path contains ${realWord}, ${refused}` };
  }
  return { base, realBase, shownBase };
}

/**
 * Make this run's own temp folder: a fresh `run-XXXXXX` under `~/.cache/ctoc-check-temp`.
 * Never throws. Every failure becomes the fallback, which is today's behaviour (the checks
 * run with the inherited temp folder), with a note that gives the reason and an error code.
 * @returns {CheckTemp}
 */
function openCheckTemp() {
  let home = '';
  let lookupCode = null;
  try {
    home = String(os.homedir() || '');
  } catch (e) {
    // The lookup throws for an account with no home entry (a container with an unlisted
    // user id). That is not a verdict: the checks run with the inherited temp folder.
    lookupCode = errorCode(e);
  }
  const fallback = (reason) => ({
    dir: null,
    base: null,
    home,
    shown: shownTempFolder(os.tmpdir(), home),
    note: `${reason}, so the checks ran with the inherited temp folder.`
  });
  if (!home) {
    return fallback('VERIFY could not make its own temp folder because this process has no home folder'
      + (lookupCode ? ` (${lookupCode})` : ''));
  }
  if (!path.isAbsolute(home)) {
    // A folder made relative to CTOC's working folder would often land inside the project.
    return fallback('VERIFY could not make its own temp folder because the home folder this process reports is not an absolute path');
  }
  const found = checkTempBaseFor(home);
  if ('reason' in found) return fallback(found.reason);
  const { base, realBase, shownBase } = found;
  let lastWord = null;
  const leftBehind = [];
  for (let attempt = 1; attempt <= CHECK_TEMP_TRIES; attempt += 1) {
    let dir;
    try {
      // mkdtemp makes the folder with mode 0700 on Linux and macOS, directly in the base.
      dir = safeFs.mkdtempSync(path.join(base, CHECK_TEMP_PREFIX));
    } catch (e) {
      return fallback(`VERIFY could not make a run folder in ${shownBase} (${errorCode(e)})`);
    }
    // The path as built, and its real path. The real path needs no second system call.
    const word = unsafeTempWord(dir) || unsafeTempWord(path.join(realBase, path.basename(dir)));
    if (!word) return { dir, base, home, shown: shownTempFolder(dir, home), note: null };
    lastWord = word;
    const trouble = removeRunFolder(dir, base);
    if (trouble) leftBehind.push(`${shownTempFolder(dir, home)} (${trouble})`);
  }
  return fallback(`VERIFY tried ${CHECK_TEMP_TRIES} fresh names in ${shownBase} and each held a word CTOC's record protection refuses when it cannot run (the last: ${lastWord})`
    + (leftBehind.length ? `; it could not remove ${leftBehind.join(', ')}` : ''));
}

/**
 * Remove this run's temp folder. Never throws, and never changes a verdict: a failed
 * removal is written into the note, which names the folder.
 * @param {CheckTemp} temp - What `openCheckTemp` returned; its note may be replaced.
 * @returns {void}
 */
function closeCheckTemp(temp) {
  if (!temp.dir) return;
  const trouble = removeRunFolder(temp.dir, temp.base);
  if (trouble) {
    temp.note = `VERIFY could not remove this run's temp folder ${temp.shown} (${trouble}); `
      + 'remove it by hand when no VERIFY is running.';
  }
}

/**
 * Write `tempFolder` (and `tempFolderNote`) on each check that ran.
 * @param {Object} checks - The `checks` object of a fallback run.
 * @param {CheckTemp} temp - What `openCheckTemp` returned, after `closeCheckTemp`.
 * @returns {void}
 */
function noteTempFolder(checks, temp) {
  for (const key of ['lint', 'types', 'tests']) {
    const c = checks[key];
    if (!c || c.ran !== true) continue;
    c.tempFolder = temp.shown;
    if (temp.note) c.tempFolderNote = temp.note;
  }
}

/**
 * Probe whether an executable is runnable, by asking it for its version. A
 * missing binary sets `error` (ENOENT); a present one exits (0 or not) with no
 * spawn error. Used to distinguish a NOT-RUN check (tool absent) from a real
 * failure, so an absent tool is never counted as a failing check.
 * @param {string} bin - Executable name.
 * @param {string} cwd - Working directory.
 * @param {NodeJS.ProcessEnv} [env] - The environment the check will run with;
 *   omitted means the CTOC process's own (today's behaviour).
 * @returns {boolean}
 */
function toolExists(bin, cwd, env) {
  try {
    const r = spawnSync(bin, ['--version'], {
      cwd,
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      ...(env ? { env } : {})
    });
    return !r.error;
  } catch (e) {
    return false;
  }
}

/**
 * Evaluate one check category (lint/typecheck/tests) from a list of candidate
 * commands whose preconditions (script present, or tool installed) already held.
 * Returns a THREE-state check:
 *   - `applicable:false, ran:false`  — no candidate → NOT-RUN (never an error, never a pass)
 *   - `ran:true, passed:true`        — a candidate ran and exited 0
 *   - `ran:true, passed:false`       — a candidate ran and failed (pushes an error)
 *
 * @param {string} label - Human label ("Lint", "Type check", "Tests").
 * @param {Array<string|{cmd: string, required?: boolean}>} candidates - Pre-qualified
 *   command strings, or {cmd, required} objects (a required candidate that fails to
 *   launch is a real failure, not a benign skip).
 * @param {string} projectPath - Project root.
 * @param {string[]} errors - Errors array to append a failure to.
 * @param {NodeJS.ProcessEnv} [env] - Environment the candidates run with; omitted
 *   means the CTOC process's own.
 * @returns {Object} The check record.
 */
function evalCategory(label, candidates, projectPath, errors, env) {
  if (candidates.length === 0) {
    return { ran: false, applicable: false, passed: null, reason: `no ${label.toLowerCase()} tool or script found` };
  }
  const r = tryCommands(candidates, projectPath, { env });
  if (!r.ran) {
    if (r.requiredLaunchFailure) {
      // A PRESENCE-QUALIFIED candidate — the project's OWN declared npm script —
      // could not launch (its inner binary is missing). This is a REAL failure,
      // NOT the benign not-applicable used for an absent OPTIONAL tool: a declared
      // suite that never started must fail the gate, not be silently dropped.
      const detail = label === 'Tests'
        ? `${label} could not launch: ${r.requiredLaunchFailure} — the declared test suite failed to start`
        : `${label} could not launch: ${r.requiredLaunchFailure}`;
      errors.push(detail);
      return {
        ran: false,
        applicable: true,
        passed: false,
        command: r.requiredLaunchFailure,
        reason: detail
      };
    }
    return { ran: false, applicable: false, passed: null, command: null, reason: `${label} candidates were not runnable` };
  }
  // V1 — THE OUTPUT IS RETURNED COMPLETE, DELIBERATELY. This used to be
  // `(r.output || '').slice(0, 4000)`, and that truncated string was the ONLY input
  // applyTestQualityContracts ever saw — so every instrument (parseFailCount,
  // hasTestSummaryEvidence, parseSkippedCount, parseCoveragePct) read a PREFIX of the
  // run. A test runner prints its verdict LAST: this repository's own gate ends with
  // `[CTOC test-gate] coverage 99.05% ...` after hundreds of kilobytes of output, so
  // on every real run the verdict fell past the cut, coverage parsed to null, and
  // VERIFY failed closed with "no coverage figure was produced". Gate 3 became
  // un-passable for EVERY plan, leaving "Approve anyway" as the only exit — the
  // override-training failure the parent vision names as a founding defect.
  //
  // The fail-closed rule was never wrong; its INPUT was. Bounding now happens in
  // runFallbackChecks AFTER the contracts have been applied (see boundOutput). Do not
  // reintroduce a slice here: it silently blinds four parsers at once.
  const check = {
    ran: true,
    applicable: true,
    passed: r.success === true,
    command: r.command,
    output: r.output || '',
    error: r.error || null
  };
  if (!check.passed) {
    errors.push(`${label} failed: ${r.error || 'nonzero exit'}`);
  }
  return check;
}

// The stored-evidence budget, in characters. Every VERIFY result is persisted to
// .ctoc/state/verify/<slug>.json, so a chatty runner must not grow that artifact
// without limit. This is a STORAGE budget only — never a parsing budget (V1).
const OUTPUT_BUDGET = 4000;

/**
 * Bound a captured output for STORAGE, keeping both ends.
 *
 * Head AND tail, not just head: the head shows how the run started (what a human
 * needs when a suite dies early), and the TAIL carries the verdict line — the
 * runner prints its summary last, and that summary is what decided the gate. An
 * explicit marker names how many characters were dropped, so the artifact states
 * that it is an excerpt rather than silently misrepresenting the run.
 *
 * MUST be called only AFTER every parser has read the complete output. Bounding
 * before parsing is the exact defect V1 fixed.
 *
 * @param {string} text - The complete captured output.
 * @returns {string} The output verbatim when within budget, else head + marker + tail.
 */
function boundOutput(text) {
  const s = String(text == null ? '' : text);
  if (s.length <= OUTPUT_BUDGET) return s;
  const half = Math.floor(OUTPUT_BUDGET / 2);
  const elided = s.length - OUTPUT_BUDGET;
  return `${s.slice(0, half)}\n… [${elided} characters elided] …\n${s.slice(s.length - half)}`;
}

/**
 * Bound the stored `output` of every check in place. Called at the END of
 * runFallbackChecks, after applyTestQualityContracts has read the complete output.
 *
 * @param {Object} checks - The assembled checks map (mutated in place).
 */
function boundCheckOutputs(checks) {
  for (const key of ['lint', 'types', 'tests']) {
    const c = checks[key];
    if (c && typeof c.output === 'string') c.output = boundOutput(c.output);
  }
}

/** Read the project's coverage floor (minPct) from .ctoc/coverage-baseline.json. */
function readCoverageFloor(projectPath) {
  try {
    const p = path.join(projectPath, '.ctoc', 'coverage-baseline.json');
    if (!safeFs.existsSync(p)) return null;
    const j = JSON.parse(safeFs.readFileSync(p, 'utf8'));
    return typeof j.minPct === 'number' ? j.minPct : null;
  } catch (e) {
    return null;
  }
}

/**
 * Read the test runner's FAIL counter from its output.
 *
 * Returns NULL — not 0 — when the counter cannot be read. That distinction is the
 * whole of X3: the old parser's no-match path was indistinguishable from a clean
 * run, and a parser whose no-match default is the SUCCESS value is a false-green
 * machine. `parseCoveragePct` already returned null correctly; this copies it.
 *
 * Handles all four shapes node emits: the TAP reporter (`# fail N`) and the spec
 * reporter (`ℹ fail N` — node's DEFAULT on a TTY), each plain or colorized. Anchored
 * to the LINE START and taking the LAST match: node emits the aggregate summary after
 * all test output, so a `# fail 2` embedded mid-line in a TEST NAME (e.g. this
 * module's own test, which names such a fixture) is never at line-start and can never
 * hijack the count.
 *
 * @param {string} out - Captured runner output (colour tolerated).
 * @returns {number|null} The failing-test count, or null when unreadable.
 */
function parseFailCount(out) {
  const matches = [...stripAnsi(out).matchAll(/^\s*(?:#|ℹ)\s+fail\s+(\d+)/gim)];
  return matches.length ? parseInt(matches[matches.length - 1][1], 10) : null;
}

/**
 * True when the output carries evidence that a node:test-shaped runner reported a
 * SUMMARY — i.e. the instrument this module claims to read is PRESENT.
 *
 * This is the boundary that keeps the fail-closed rule from becoming a FALSE RED,
 * which would be worse than the false green it replaces (a guard that cries wolf gets
 * disabled). Plenty of legitimate runs carry no fail counter at all and must stay
 * green: a clean lint or typecheck, and a project whose test script is a plain
 * assertion script (`node test/widget.test.js` printing `ok: ...` and exiting 0). For
 * those, the exit code IS the instrument and it reported success — there is no
 * illegible dial to fail on.
 *
 * The rule is therefore narrower than "output but no fail line": the run must LOOK
 * like the thing we parse. When it does — a sibling summary counter, a fail-shaped
 * counter we could not read a number from, or raw TAP failure output — and the fail
 * count still cannot be read, the run is UNCERTIFIED.
 *
 * @param {string} out - Captured runner output (colour tolerated).
 * @returns {boolean} Whether a node:test-shaped fail counter should have been readable.
 */
function hasTestSummaryEvidence(out) {
  const text = stripAnsi(out);
  return (
    // A sibling summary counter from the same block as `fail` (TAP `#` or spec `ℹ`).
    /^\s*(?:#|ℹ)\s+(?:tests|suites|pass|cancelled|skipped|todo|duration_ms)\b/im.test(text)
    // A fail-SHAPED counter line we could not read a number out of — a renamed key
    // (`ℹ failures 2`) or a malformed value. The dial is there; it is illegible.
    || /^\s*(?:#|ℹ)\s+fail\w*\b/im.test(text)
    // Raw TAP failure output with no readable aggregate: failures are evident and
    // unquantified. That is uncertified, never clean.
    || /^\s*not ok\b/im.test(text)
    || /^\s*TAP version\b/im.test(text)
  );
}

/** Parse a skipped/todo test count from test-runner output. */
function parseSkippedCount(out) {
  let n = 0;
  // X3: strip colour and accept the spec reporter's `ℹ` prefix as well as TAP's `#`.
  // This counter was ANSI-naive and TAP-only too, so a colorized or spec-reporter run
  // silently read 0 skipped — the same false green as the fail counter, on the axis
  // CLAUDE.md states as "0 skipped".
  const text = stripAnsi(out);
  for (const re of [/(?:#|ℹ)\s*skipped\s+(\d+)/ig, /(?:#|ℹ)\s*todo\s+(\d+)/ig]) {
    let m;
    while ((m = re.exec(text)) !== null) n += parseInt(m[1], 10);
  }
  if (n === 0) {
    const mSkip = text.match(/(\d+)\s+skipped/i);
    if (mSkip) n += parseInt(mSkip[1], 10);
    const mPend = text.match(/(\d+)\s+pending/i);
    if (mPend) n += parseInt(mPend[1], 10);
  }
  return n;
}

/**
 * Return the LAST capture-group match of `re` (which MUST carry the `g` flag) in
 * `text`, or null when there is none. The test runner emits the REAL coverage
 * summary row LAST — after all other test output — so an earlier stray/spoofed
 * `all files | 100` line in stdout must NOT win over the real `# all files | 40 |`
 * summary. Taking the last match closes that spoof (mirrors src/scripts/test-gate.js).
 * @param {string} text
 * @param {RegExp} re - a global (`g`) regex with one capture group.
 * @returns {RegExpExecArray|null}
 */
function lastCap(text, re) {
  let m;
  let last = null;
  while ((m = re.exec(text)) !== null) last = m;
  return last;
}

/** Parse a coverage percentage from test-runner output, or null if not present. */
function parseCoveragePct(out) {
  // X3: strip colour before parsing. The coverage row is colorized too
  // (`ESC[32mℹ all files | 40.12 …`), and the `^` anchor otherwise matches the escape
  // byte — so a real below-floor figure read as null. With a floor declared that
  // currently fails closed (correct), but it fails for the WRONG REASON and hides the
  // real number from the operator; with no floor it is simply unenforced.
  const text = stripAnsi(out);
  // Node's own --experimental-test-coverage table prints the summary row as
  // `# all files | <line%> | …` (lowercase, leading `# ` under the TAP reporter).
  // Match it case-insensitively and tolerant of the `# ` prefix, and BEFORE the
  // Istanbul/nyc format — otherwise a `node --test` project's coverage parses to
  // null and its declared floor is silently unenforced. The same regex also
  // matches the Istanbul "All files | 95 |" row (case-insensitive covers "All").
  //
  // For EVERY format, take the LAST match: the real coverage summary is emitted
  // last, so an earlier line reading `all files | 100` (a stray log or a spoof)
  // must never win over the real below-floor summary that follows it. A non-global
  // `.match()` returned the FIRST match and let a spoofed 100 pass a below-floor run.
  // X3: accept the spec reporter's `ℹ ` prefix alongside TAP's `# ` (mirrors
  // src/scripts/test-gate.js) — node's default reporter emits `ℹ all files | …`.
  let m = lastCap(text, /^\s*(?:ℹ|#)?\s*all files\s*\|\s*([\d.]+)/img);
  if (m) return parseFloat(m[1]);
  m = lastCap(text, /Lines\s*:\s*([\d.]+)\s*%/ig);
  if (m) return parseFloat(m[1]);
  m = lastCap(text, /Statements\s*:\s*([\d.]+)\s*%/ig);
  if (m) return parseFloat(m[1]);
  return null;
}

/**
 * Fold the "0 skipped" and coverage-floor contracts into a test check that RAN.
 * A skipped/todo test fails the gate (CLAUDE.md: "0 skipped"). Coverage below the
 * declared floor fails; coverage that genuinely cannot be measured is recorded as
 * unmeasured — NOT-RUN, not a pass (item 2). No floor declared ⇒ coverage is not
 * gated (we do not invent a floor).
 *
 * @param {Object} check - The tests check (ran:true), mutated in place.
 * @param {string} projectPath - Project root.
 * @param {string[]} errors - Errors array to append violations to.
 */
function applyTestQualityContracts(check, projectPath, errors) {
  // A runner can report FAILURES on stdout yet exit 0 (jest --passWithNoTests, a
  // wrapping `|| true`, `set +e`, or a custom reporter that swallows the exit
  // code). tryCommand derives success solely from the zero exit, so parse the
  // `# fail N` / `ℹ fail N` summary and fail closed — mirroring the skipped-count
  // logic below, which already proves we do not fully trust the exit code.
  //
  // X3 — THIS SAID "fail closed" AND FAILED OPEN. The parser was `/^#\s*fail\s+(\d+)/im`
  // (TAP-only, ANSI-naive) guarded by `if (mFail && …)`, so THREE of the four shapes
  // node actually emits matched NOTHING and the guard was skipped in SILENCE:
  // check.passed stayed true and no error was pushed. There was no third state between
  // "read a number" and "certified clean". parseFailCount now reads all four shapes and
  // returns NULL — never 0 — when it cannot read the counter at all.
  const failCount = parseFailCount(check.output);
  if (failCount === null) {
    // Unreadable. Fail closed ONLY when the instrument was actually THERE (see
    // hasTestSummaryEvidence): a run that emits no summary block at all — a plain
    // assertion script that printed a line and exited 0 — has no illegible dial and
    // must stay green. Over-correcting into a false RED is worse than the false green,
    // because a guard that cries wolf gets disabled.
    if (hasTestSummaryEvidence(check.output)) {
      check.passed = false;
      errors.push(
        'could not read the fail count from the test output, which reported a test ' +
        'summary — the run is UNCERTIFIED, not clean (an unreadable instrument is ' +
        'never a pass)'
      );
    }
  } else if (failCount > 0) {
    check.passed = false;
    errors.push(`${failCount} failing test(s) reported despite exit 0`);
  }

  const skipped = parseSkippedCount(check.output);
  check.skipped = skipped;
  if (skipped > 0) {
    errors.push(`${skipped} skipped/todo test(s) — the contract is 0 skipped`);
  }

  const cov = parseCoveragePct(check.output);
  const floor = readCoverageFloor(projectPath);
  if (cov != null) {
    check.coverage = cov;
    check.coverageFloor = floor;
    if (floor != null && cov < floor) {
      errors.push(`Coverage ${cov}% is below the project floor of ${floor}%`);
    }
  } else {
    // Coverage could not be measured. With NO floor declared, coverage is not
    // gated (we do not invent a floor). But when a floor IS declared, unmeasured
    // is NOT a pass: fail closed rather than silently letting below-floor coverage
    // through when the figure merely failed to parse (defense in depth, consistent
    // with this module's fail-closed contract).
    check.coverage = null;
    check.coverageFloor = floor;
    if (floor != null) {
      check.passed = false;
      errors.push(
        `coverage floor ${floor}% declared but no coverage figure was produced — ` +
        'unmeasured is NOT a pass'
      );
    }
  }
}

/**
 * Run fallback quality checks using direct tool commands, in a temp folder of their own.
 * Makes a fresh folder under the home folder (`openCheckTemp`), runs the checks with it
 * (`runFallbackChecksWith`), removes it whatever the outcome (`closeCheckTemp`, in `finally`,
 * so a throw in this module still removes it and still propagates), and records it on each
 * check that ran (`noteTempFolder`). Runs before the app launch, so the folder is gone by then.
 *
 * @param {string} projectPath - Project root path
 * @returns {Object} Result with checks and errors
 */
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

/**
 * Run fallback quality checks using direct tool commands.
 * Detects the project's language/toolchain and runs appropriate checks.
 *
 * @param {string} projectPath - Project root path
 * @param {string|null} tempDir - The run's own temp folder, or null to inherit CTOC's
 * @returns {Object} Result with checks and errors
 */
function runFallbackChecksWith(projectPath, tempDir) {
  const checks = {};
  const errors = [];

  // Detect project type
  const pkg = loadPackageJsonSafe(projectPath);
  const hasPackageJson = !!pkg;
  const hasPyproject = safeFs.existsSync(path.join(projectPath, 'pyproject.toml'));
  const hasGoMod = safeFs.existsSync(path.join(projectPath, 'go.mod'));
  const hasCargoToml = safeFs.existsSync(path.join(projectPath, 'Cargo.toml'));

  // VENV — a Python project's own tools. Looked for only when pyproject.toml marks a
  // Python project.
  const venv = hasPyproject ? projectVenvBin(projectPath) : null;
  // One environment for every probe and every check of this run: the venv tool folder
  // first on PATH (a Python project) and the run's own temp folder in TMPDIR, TMP and TEMP.
  // With neither, no env is passed, exactly as before.
  const checkEnv = checkEnvWith(venv ? venv.dir : null, tempDir);

  // Each candidate is added ONLY when its precondition holds — a DEFINED npm
  // script (finding C2: an ABSENT script is applicable:false, never a failing
  // check) or an INSTALLED tool. This is what distinguishes NOT-RUN from FAILED.

  // A candidate qualified by a DECLARED npm script (npmScriptExists) is REQUIRED —
  // the project owns it, so its inner binary failing to launch is a REAL failure.
  // A candidate qualified by an INSTALLED external tool (toolExists) is OPTIONAL —
  // its absence is a benign not-applicable, never a failure.

  // Lint checks
  const lintCommands = [];
  if (hasPackageJson && npmScriptExists(pkg, 'lint')) lintCommands.push({ cmd: 'npm run lint', required: true });
  if (hasPyproject && toolExists('ruff', projectPath, checkEnv)) lintCommands.push('ruff check .');
  if (hasGoMod && toolExists('golangci-lint', projectPath, checkEnv)) lintCommands.push('golangci-lint run');
  if (hasCargoToml && toolExists('cargo', projectPath, checkEnv)) lintCommands.push('cargo clippy');
  checks.lint = evalCategory('Lint', lintCommands, projectPath, errors, checkEnv);

  // Type check
  const typeCommands = [];
  if (hasPackageJson && npmScriptExists(pkg, 'typecheck')) typeCommands.push({ cmd: 'npm run typecheck', required: true });
  if (hasPyproject && toolExists('mypy', projectPath, checkEnv)) typeCommands.push('mypy .');
  if (hasGoMod && toolExists('go', projectPath, checkEnv)) typeCommands.push('go vet ./...');
  checks.types = evalCategory('Type check', typeCommands, projectPath, errors, checkEnv);

  // Test suite
  const testCommands = [];
  if (hasPackageJson && npmScriptExists(pkg, 'test')) testCommands.push({ cmd: 'npm test', required: true });
  if (hasPyproject && toolExists('pytest', projectPath, checkEnv)) testCommands.push('pytest');
  if (hasGoMod && toolExists('go', projectPath, checkEnv)) testCommands.push('go test ./...');
  if (hasCargoToml && toolExists('cargo', projectPath, checkEnv)) testCommands.push('cargo test');
  const testCheck = evalCategory('Tests', testCommands, projectPath, errors, checkEnv);
  // When tests actually RAN, fold in the "0 skipped" and coverage-floor contracts.
  if (testCheck.ran) {
    applyTestQualityContracts(testCheck, projectPath, errors);
  }
  checks.tests = testCheck;

  // The record says which folder was put first on PATH, so a reader can see that the
  // project's own tools, not the global ones, were the first candidates.
  if (venv) {
    for (const key of ['lint', 'types', 'tests']) {
      if (checks[key] && checks[key].ran === true) checks[key].firstOnPath = venv.shown;
    }
  }

  // V1 — PARSE FIRST, BOUND SECOND. Every instrument above has now read the COMPLETE
  // output; only here is the stored copy cut down to the persistence budget. Moving
  // this call earlier — or reintroducing a slice at capture time — hands the parsers a
  // prefix and silently re-breaks the coverage, fail and skipped readers at once.
  boundCheckOutputs(checks);

  return { checks, errors };
}

/**
 * Resolve the per-check wall-clock budget in milliseconds.
 *
 * Precedence: an explicit positive-integer `override` (opts.timeout) wins >
 * the `CTOC_VERIFY_TIMEOUT_MS` environment variable (a positive integer) >
 * the 900000ms (15-minute) default. A malformed override or env value is
 * ignored (falls through to the next source) rather than silently disabling
 * the timeout — an unbounded run is the very failure the budget exists to
 * prevent. The limit is per command, so it must cover the longest single
 * check; this repository's own `npm test` took about 140 s (139-143 s) on
 * 2026-10-11.
 *
 * @param {number} [override] - per-call override.
 * @returns {number} the budget in milliseconds.
 */
function resolveVerifyTimeout(override) {
  if (typeof override === 'number' && Number.isInteger(override) && override > 0) return override;
  const raw = process.env.CTOC_VERIFY_TIMEOUT_MS;
  if (raw != null) {
    const n = Number(raw);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return 900000;
}

/**
 * Try running a single command, capturing its complete output.
 *
 * The command strings are FIXED candidates chosen upstream by
 * `runFallbackChecks` (`npm test`, `ruff check .`, `go vet ./...`, …) — never user
 * input — so the shell used by execSync is not an injection surface here.
 *
 * @param {string} command - Command to run.
 * @param {string} cwd - Working directory.
 * @param {Object} [options] - Capture options.
 * @param {number} [options.maxBuffer=67108864] - Capture budget in bytes. Beyond it
 *   the run is reported as UNCERTIFIED with an overflow reason — never as a test
 *   failure, which it is not.
 * @param {number} [options.timeout] - Per-check wall-clock budget in ms; see
 *   `resolveVerifyTimeout`. A timeout is reported UNCERTIFIED, never a test failure.
 * @param {NodeJS.ProcessEnv} [options.env] - Environment for the child; omitted means process.env.
 * @returns {Object} `{ success, output, error, spawnFailed }`.
 */
function tryCommand(command, cwd, options = {}) {
  // execSync defaults to a 1MB capture buffer and THROWS ENOBUFS beyond it. A real
  // suite exceeds that easily — this repository's own emits well over 1MB — and the
  // throw was reported as "Tests failed: spawnSync /bin/sh ENOBUFS": a PASSING suite
  // recorded as a test failure, for a reason with nothing to do with the tests.
  //
  // It stayed hidden only because a second defect masked it: the gate script's
  // `process.exit` truncated its own output at the ~64KB pipe buffer, so nothing ever
  // reached 1MB. Fixing that unmasked this. 64MB matches the budget the gate script
  // already uses for its own spawn — the same number, for the same reason.
  const maxBuffer = typeof options.maxBuffer === 'number' ? options.maxBuffer : 64 * 1024 * 1024;
  // The wall-clock budget for a single check. Hardcoding 120000 meant a
  // legitimately long-but-green suite had NO exit: it was killed at 120s and the
  // kill was reported as a test failure (see the ETIMEDOUT branch below). The
  // budget is now RAISABLE — per call (`options.timeout`) and per environment
  // (`CTOC_VERIFY_TIMEOUT_MS`) — so an operator whose suite genuinely runs longer
  // can extend it rather than have a correct project refused by the gate.
  const timeout = resolveVerifyTimeout(options.timeout);
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf8',
      timeout,
      maxBuffer,
      stdio: ['pipe', 'pipe', 'pipe'],
      ...(options.env && typeof options.env === 'object' ? { env: options.env } : {})
    });
    return { success: true, output: output.trim(), error: null, spawnFailed: false };
  } catch (e) {
    // A TIMEOUT is not a failing suite, and must never be reported as one — the
    // same dishonesty class as ENOBUFS below. execSync kills the process with
    // SIGTERM on timeout and throws with `code === 'ETIMEDOUT'`. The run did not
    // COMPLETE, so it is UNCERTIFIED — it fails CLOSED (the gate is refused) but
    // with its TRUE reason and a pointer to the budget the operator can raise, and
    // it is NOT flagged spawnFailed: a timeout RAN (it did not fail to launch), so
    // it must never be reclassified as a NOT-RUN check that another passing check
    // could paper over.
    if (e && (e.code === 'ETIMEDOUT' || (e.killed === true && e.signal === 'SIGTERM'))) {
      return {
        success: false,
        output: e.stdout ? e.stdout.toString().trim() : '',
        error: `the run did not complete within the ${timeout}ms budget and was ` +
          'terminated — UNCERTIFIED (this is NOT a test failure; raise the budget via ' +
          'CTOC_VERIFY_TIMEOUT_MS or opts.timeout for a legitimately long suite)',
        spawnFailed: false
      };
    }
    // An OVERFLOW is not a failing suite, and must never be reported as one. The run
    // is UNCERTIFIED — we could not read all of it — so it still fails closed, but
    // with the TRUE reason, which is the only one an operator can act on (raise the
    // budget, or quieten the runner). Saying "your tests failed" when they did not is
    // the same class of dishonesty as reporting "failed 0" for a count we could not read.
    if (e && e.code === 'ENOBUFS') {
      return {
        success: false,
        output: e.stdout ? e.stdout.toString().trim() : '',
        error: `output exceeded the capture buffer of ${maxBuffer} bytes — the run could ` +
          'not be read in full and is UNCERTIFIED (this is NOT a test failure)',
        spawnFailed: false
      };
    }
    return {
      success: false,
      output: e.stdout ? e.stdout.toString().trim() : '',
      error: e.stderr ? e.stderr.toString().trim() : e.message,
      // A TRUE launch failure: the binary itself could not be run, signalled
      // STRUCTURALLY by the exit layer — either a spawn ENOENT (`e.code`, when no
      // shell is used) or the shell's canonical command-not-found exit status 127
      // (`e.status`, which execSync's default shell returns for a missing command).
      // ONLY these exit-layer signals — never a substring of the tool's OWN
      // stdout/stderr — may reclassify a check as NOT-RUN. A genuine failure that
      // launched and exited non-zero (e.g. status 1) is a REAL failure even when
      // its output happens to contain "No such file"/"ENOENT".
      spawnFailed: !!(e && (e.code === 'ENOENT' || e.status === 127))
    };
  }
}

/**
 * Try multiple commands in order, returning the result of the first one that
 * actually RAN (whether it passed or failed). A command whose executable/script
 * is missing is skipped and the next candidate tried.
 *
 * THREE-state contract (R4-A): a check that could not run is NOT a check that
 * passed. When EVERY candidate is missing, this returns `{ ran:false,
 * success:false, applicable:false, command:null }` — never the old
 * `{ success:true, output:'...skipped' }` sentinel that let a gate open on
 * nothing. NOT-RUN is decided ONLY on a TRUE launch failure
 * (`result.spawnFailed`, i.e. execSync threw with `e.code === 'ENOENT'` or the
 * shell's command-not-found exit status `e.status === 127`) — the binary could
 * not be launched at all — never on a substring of the command's OWN output.
 * Candidates are already presence-filtered upstream
 * (npmScriptExists/toolExists), so a command that launched and exited non-zero is
 * always a REAL failure; scanning its stdout/stderr for "not found"/"No such
 * file" would only MISFIRE and swallow a genuine failure, carrying VERIFY to
 * green on some other passing check.
 *
 * REQUIRED candidates (the project's OWN declared npm scripts) are distinguished
 * from OPTIONAL ones (installed external tools like ruff/pytest). A candidate may
 * be a bare string (optional, backward-compatible) or `{ cmd, required }`. When
 * NOTHING ran and a REQUIRED candidate spawn-failed, the returned `ran:false`
 * result carries `requiredLaunchFailure: <cmd>` so the caller can treat "the
 * declared suite could not launch" as a REAL failure — NOT a benign not-applicable
 * (which is correct only for an absent OPTIONAL tool).
 *
 * @param {(string|{cmd: string, required?: boolean})[]} commands - Candidates, in order.
 * @param {string} cwd - Working directory.
 * @param {{env?: NodeJS.ProcessEnv}} [options] - `env` is the environment every
 *   candidate runs with; omitted means the CTOC process's own.
 * @returns {Object} `{ ran, success, output, command, error, requiredLaunchFailure? }`.
 */
function tryCommands(commands, cwd, options = {}) {
  const normalized = commands.map((c) =>
    typeof c === 'string' ? { cmd: c, required: false } : c);
  let requiredLaunchFailure = null;
  for (const { cmd, required } of normalized) {
    const result = tryCommand(cmd, cwd, { env: options.env });
    if (result.success) {
      return { ...result, command: cmd, ran: true };
    }
    if (result.spawnFailed) {
      // The binary itself could not be launched (a TRUE launch failure: spawn
      // ENOENT or shell exit status 127), despite the upstream presence
      // precondition — treat as NOT this check and try the next candidate. This
      // NEVER fires on a substring of the command's own output, so a real
      // non-zero exit (e.g. status 1) is never swallowed as not-run. Remember the
      // FIRST required candidate that could not launch: a project's OWN declared
      // script whose inner binary is missing is a REAL failure, not a benign skip.
      if (required && requiredLaunchFailure === null) requiredLaunchFailure = cmd;
      continue;
    }
    // The command launched and exited non-zero — a REAL failure.
    return { ...result, command: cmd, ran: true };
  }

  // Nothing ran. An absent OPTIONAL tool is applicable:false (a benign skip); a
  // REQUIRED (project-declared) candidate that could not launch is surfaced via
  // requiredLaunchFailure so the caller fails the category loudly.
  return {
    ran: false,
    success: false,
    applicable: false,
    output: '',
    command: null,
    error: null,
    requiredLaunchFailure
  };
}

/**
 * Compute the on-disk path of the persisted VERIFY evidence artifact for a plan.
 *
 * Pure path helper — performs no filesystem access. The artifact lives under a
 * fixed `.ctoc/state/verify/` root inside the project, keyed by the plan's bare
 * slug. Callers MUST pass a bare basename (no `.md` extension and no directory
 * separators), typically `path.basename(planPath, '.md')` — the fixed root plus
 * a bare slug keeps every write inside `.ctoc/state/verify/`. Hardening of slug
 * provenance is slice s2 / workstream W02 scope, not this slice.
 *
 * @param {string} projectPath - Project root path.
 * @param {string} planSlug - Bare plan slug (no `.md`, no directory).
 * @returns {string} Absolute-or-relative path (mirroring projectPath) to the
 *   artifact JSON file: `<projectPath>/.ctoc/state/verify/<planSlug>.json`.
 */
function verifyEvidencePath(projectPath, planSlug) {
  return path.join(projectPath, '.ctoc', 'state', 'verify', `${planSlug}.json`);
}

/**
 * Run VERIFY for a project and persist the result as a durable evidence
 * artifact keyed by plan slug. This is the real caller for `runVerify` — it
 * closes the zero-callers defect (finding C9): before this slice, nothing under
 * `src/` invoked `runVerify` and nothing recorded its outcome.
 *
 * The artifact records the actual outcome of a `runVerify` execution (pass/fail,
 * per-check detail, errors, method, summary) plus an ISO 8601 timestamp, so a
 * later slice (s2) can make the review->done gate consult a real verification
 * run instead of a self-reported checkbox.
 *
 * @param {string} projectPath - Project root path passed through to `runVerify`.
 * @param {string} planSlug - Bare plan slug the evidence is keyed by.
 * @returns {{planSlug: string, timestamp: string, passed: boolean,
 *   method: (string|null), checks: Object, errors: string[], summary: string}}
 *   The persisted artifact object (also written to disk).
 * @throws Propagates an unrecoverable write error from `safeFs` (directory not
 *   creatable, disk full, etc.). Does not swallow write failures.
 */
function persistVerifyResult(projectPath, planSlug) {
  const verifyResult = runVerify(projectPath);

  const artifact = {
    planSlug,
    timestamp: new Date().toISOString(),
    passed: verifyResult.passed,
    method: verifyResult.method,
    checks: verifyResult.checks,
    errors: verifyResult.errors,
    summary: verifyResult.summary
  };

  const evidencePath = verifyEvidencePath(projectPath, planSlug);
  safeFs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  safeFs.writeFileSync(evidencePath, JSON.stringify(artifact, null, 2));

  return artifact;
}

/**
 * Read the persisted VERIFY evidence artifact for a plan.
 *
 * Absent-or-corrupt both read as "no usable evidence": a missing file or
 * unparseable JSON returns `null` and never throws. This lets slice s2 treat a
 * damaged artifact as a rejectable condition (fail closed) rather than crashing
 * the gate. No error detail (stack/path) is leaked on a parse failure.
 *
 * @param {string} projectPath - Project root path.
 * @param {string} planSlug - Bare plan slug the evidence is keyed by.
 * @returns {Object|null} The parsed artifact object when present and valid JSON;
 *   `null` when the artifact file is absent or its contents are unparseable.
 */
function readVerifyEvidence(projectPath, planSlug) {
  const evidencePath = verifyEvidencePath(projectPath, planSlug);
  if (!safeFs.existsSync(evidencePath)) {
    return null;
  }
  try {
    const raw = safeFs.readFileSync(evidencePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    // Corrupt/unparseable artifact reads as absent (no usable evidence).
    return null;
  }
}

module.exports = {
  runVerify,
  runFallbackChecks,
  applyAppRunCheck,
  buildSummary,
  tryCommand,
  resolveVerifyTimeout,
  tryCommands,
  parseCoveragePct,
  verifyEvidencePath,
  persistVerifyResult,
  readVerifyEvidence
};
