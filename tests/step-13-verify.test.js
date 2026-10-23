'use strict';

/**
 * X3 — step-13-verify.js says "fail closed" in its own comment and fails OPEN.
 *
 * `applyTestQualityContracts` parses the test runner's fail count with
 * `/^#\s*fail\s+(\d+)/im` and guards it with `if (mFail && ...)`. Fed the four
 * shapes node actually emits, three of four read NOTHING:
 *
 *     TAP, plain        (# fail 8)     -> reads 8
 *     spec, plain       (ℹ fail 8)     -> NO MATCH   (no `ℹ` alternation)
 *     TAP, colorized                   -> NO MATCH   (the `^` hits the escape byte)
 *     spec, colorized                  -> NO MATCH   (both causes at once)
 *
 * And a no-match SKIPS the guard in silence: `check.passed` stays true, no error
 * is pushed. There is no third state between "read a number" and "certified
 * clean". This is the module that certifies Step 13 SECURE and Step 14 VERIFY —
 * the last two gates before Gate 3.
 *
 * This is the SECOND instance of this bug; X2 fixed the first in
 * src/scripts/test-gate.js, where it reported `fail 0` over 8 real failures.
 *
 * ZERO doubles. Every project below is real on disk, every check is a real
 * subprocess, and every fixture is the LITERAL bytes node emits — the escape byte
 * is built with String.fromCharCode(27) (the test file is exempt from
 * `security/detect-non-literal-regexp`; src/ is not). Both instances of this bug
 * shipped past green unit tests written against input the parser never receives.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const childProcess = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const verify = require('../src/lib/step-13-verify');
// npm's own update check asks the npm registry; it is switched off for the npm this file starts
// (plan the-test-suite-runs-faster-and-never-weaker-s2, criterion 21: tests never reach the registry).
process.env.npm_config_update_notifier = 'false';

const ESC = String.fromCharCode(27);
/** Wrap text in a real SGR colour sequence, exactly as node's reporter does. */
const blue = (s) => `${ESC}[34m${s}${ESC}[39m`;
const red = (s) => `${ESC}[31m${s}${ESC}[39m`;

let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-x3-')); });
afterEach(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } });

function write(name, content) {
  const p = path.join(dir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
function pkg(obj) { write('package.json', JSON.stringify(obj, null, 2)); }

/**
 * Seed a library-shaped project (main set, no bin/start ⇒ the app-launch last mile
 * is honestly applicable:false) whose `test` script PRINTS `text` verbatim and
 * EXITS 0 — the exit-0-liar this guard exists to catch. The bytes are passed via a
 * JSON-encoded fixture file rather than the shell, so escape bytes survive intact.
 */
function seedLyingRunner(text) {
  write('fixture.js', `process.stdout.write(${JSON.stringify(text)});\nprocess.exit(0);\n`);
  pkg({
    name: 'liar', version: '1.0.0', private: true, main: 'index.js',
    scripts: { test: 'node fixture.js' }
  });
  write('index.js', 'module.exports = {};\n');
}

/** The error list, joined — for readable assertion messages. */
const why = (res) => JSON.stringify(res.errors, null, 2);

// Helpers shared by the VENV block (V11) and the TEMP block: the run folder VERIFY makes is
// `<home>/.cache/ctoc-check-temp/run-XXXXXX`, and the record stores it with `~` for the home folder.
/** The base folder VERIFY makes its run folders in, for a given home folder. */
const baseOf = (home) => path.join(home, '.cache', 'ctoc-check-temp');
/** The stored form of a folder: `~/...` under `home`, `/` separators. A stored form back to a path. */
const expandShown = (shown, home) => (String(shown).startsWith('~/')
  ? path.join(home, ...String(shown).slice(2).split('/'))
  : shown);
const RUN_FOLDER_RE = /^~\/\.cache\/ctoc-check-temp\/run-[A-Za-z0-9]{6}$/;
/** The value of the line `KEY=value` a fixture printed in a check's output; fails loudly when absent. */
function lineValue(check, key) {
  const line = String(check.output).split('\n').find((l) => l.startsWith(`${key}=`));
  assert.ok(line !== undefined, `the fixture printed no ${key} line; output: ${check.output}`);
  return line.slice(key.length + 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cases 1-3 — the three output shapes the parser is blind to. Each is a runner
// reporting 8 REAL failures while exiting 0. Each must fail VERIFY.
// ─────────────────────────────────────────────────────────────────────────────
describe('X3 — the fail counter must be readable in all four shapes node emits', () => {
  it('case 1: reads a spec-reporter fail line (ℹ fail 8) — PLAIN, no colour at all', () => {
    // This case is NOT about colour. Node's spec reporter is its DEFAULT on a TTY
    // and emits `ℹ fail 8`. The module is blind to it with colour fully off.
    seedLyingRunner(
      'ℹ tests 8\nℹ suites 1\nℹ pass 0\nℹ fail 8\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 12.3\n'
    );

    const res = verify.runVerify(dir);

    assert.equal(res.checks.tests.ran, true, 'the runner really ran');
    assert.equal(res.checks.tests.passed, false, `8 reported failures must fail the test check; errors: ${why(res)}`);
    assert.equal(res.passed, false, 'VERIFY must not certify a run that reported 8 failures');
    assert.ok(
      res.errors.some((e) => /8 failing test/i.test(e)),
      `the error must name the 8 failing tests; errors: ${why(res)}`
    );
  });

  it('case 2: reads a colorized TAP fail line', () => {
    seedLyingRunner(
      `TAP version 13\nnot ok 1 - broken\n1..8\n${blue('# tests 8')}\n${blue('# pass 0')}\n${red('# fail 8')}\n`
    );

    const res = verify.runVerify(dir);

    assert.equal(res.checks.tests.passed, false, `colorized TAP `
      + `must still be read; errors: ${why(res)}`);
    assert.equal(res.passed, false, 'VERIFY must not certify a colorized TAP run reporting 8 failures');
    assert.ok(
      res.errors.some((e) => /8 failing test/i.test(e)),
      `the error must name the 8 failing tests; errors: ${why(res)}`
    );
  });

  it('case 3: reads a colorized spec fail line', () => {
    // Both causes at once: the `ℹ` prefix AND the SGR escape before it. This is
    // what a real `FORCE_COLOR=3 node --test` pipes out.
    seedLyingRunner(
      `${blue('ℹ tests 8')}\n${blue('ℹ pass 0')}\n${red('ℹ fail 8')}\n${blue('ℹ duration_ms 9.1')}\n`
    );

    const res = verify.runVerify(dir);

    assert.equal(res.checks.tests.passed, false, `colorized spec must still be read; errors: ${why(res)}`);
    assert.equal(res.passed, false, 'VERIFY must not certify a colorized spec run reporting 8 failures');
    assert.ok(
      res.errors.some((e) => /8 failing test/i.test(e)),
      `the error must name the 8 failing tests; errors: ${why(res)}`
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Case 4 — THE ONE THAT MATTERS. Fail OPEN is the defect; a no-match must not be
// silence. A runner whose SUMMARY BLOCK IS PRESENT but whose fail counter cannot
// be read is UNCERTIFIED, not clean.
// ─────────────────────────────────────────────────────────────────────────────
describe('X3 — an unreadable fail count on a test check is NOT certified', () => {
  it('case 4: a test check that RAN, emitted a summary, and whose fail count cannot be read is NOT certified', () => {
    // The instrument is plainly PRESENT — this is a node:test-shaped summary
    // block, with its sibling counters — but the fail counter is not in a shape
    // this module can read (here: a future/renamed reporter key). "I could not
    // read the fail count" and "there were zero failures" are DIFFERENT FACTS and
    // must never produce the same verdict. Node's reporter format is not our
    // contract and has already changed once; the next change must be a LOUD
    // failure, not a silent green.
    seedLyingRunner(
      'ℹ tests 8\nℹ suites 1\nℹ pass 6\nℹ failures 2\nℹ duration_ms 7.7\n'
    );

    const res = verify.runVerify(dir);

    assert.equal(res.checks.tests.ran, true, 'the runner really ran and really produced output');
    assert.equal(res.checks.tests.passed, false,
      `a test check whose fail counter is unreadable must NOT be certified; errors: ${why(res)}`);
    assert.equal(res.passed, false, 'VERIFY must not certify a run it could not read');
    assert.ok(
      res.errors.some((e) => /could not read/i.test(e) && /fail/i.test(e)),
      `the error must NAME the unreadable instrument, so an operator knows WHICH one went blind; errors: ${why(res)}`
    );
  });

  it('case 4b: TAP failure evidence (not ok) with no readable fail counter is NOT certified', () => {
    // A runner that printed real TAP failures, exited 0, and emitted no readable
    // summary counter. There is failure evidence on stdout and no instrument to
    // quantify it — that is uncertified, never clean.
    seedLyingRunner('TAP version 13\nnot ok 1 - broken\nnot ok 2 - also broken\n1..2\n');

    const res = verify.runVerify(dir);

    assert.equal(res.passed, false, `TAP failures with no readable counter must not certify; errors: ${why(res)}`);
    assert.ok(
      res.errors.some((e) => /could not read/i.test(e) && /fail/i.test(e)),
      `the error must name the unreadable fail counter; errors: ${why(res)}`
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Case 5 — THE FALSE-RED GUARD (Decision 1). Over-correcting into a false RED is
// WORSE than the false green, because a guard that cries wolf gets disabled.
// A check with no fail line that is not a node:test-shaped run must stay green.
// GREEN BEFORE AND AFTER.
// ─────────────────────────────────────────────────────────────────────────────
describe('X3 — no false red: a check with no fail line is still fine', () => {
  it('case 5: a project with passing lint + typecheck (no fail counts at all) still PASSES', () => {
    write('fixture.js', 'process.stdout.write("ok: 1 assertion passed\\n");\nprocess.exit(0);\n');
    pkg({
      name: 'clean', version: '1.0.0', private: true, main: 'index.js',
      scripts: {
        lint: 'node -e "console.log(\'All files pass linting.\')"',
        typecheck: 'node -e "console.log(\'Found 0 errors.\')"',
        test: 'node fixture.js'
      }
    });
    write('index.js', 'module.exports = {};\n');

    const res = verify.runVerify(dir);

    assert.equal(res.checks.lint.passed, true, `a clean lint emits no fail count and must PASS; errors: ${why(res)}`);
    assert.equal(res.checks.types.passed, true, `a clean typecheck emits no fail count and must PASS; errors: ${why(res)}`);
    assert.equal(res.passed, true,
      `a clean project must not be turned red by the unreadable-instrument guard; errors: ${why(res)}`);
    assert.ok(
      !res.errors.some((e) => /could not read/i.test(e)),
      `no instrument-unreadable error may fire on a project that emits no counters; errors: ${why(res)}`
    );
  });

  it('case 5b: a non-node:test runner (plain assertion script, exit 0) still PASSES', () => {
    // A legitimate project whose test runner is not node:test at all — a plain
    // node assertion script that prints a line and exits 0. It emits no summary
    // block, so there is no instrument to be illegible. Its exit code is the
    // instrument, and it said 0. Turning THIS red would be the false red.
    write('fixture.js', 'process.stdout.write("ok: add(2,3) === 5\\n");\nprocess.exit(0);\n');
    pkg({
      name: 'plainrunner', version: '1.0.0', private: true, main: 'index.js',
      scripts: { test: 'node fixture.js' }
    });
    write('index.js', 'module.exports = {};\n');

    const res = verify.runVerify(dir);

    assert.equal(res.passed, true, `a plain assertion runner must stay green; errors: ${why(res)}`);
    assert.equal(res.checks.tests.passed, true);
  });

  it('case 5c: an honest "ℹ fail 0" spec run still PASSES (0 is not a failure)', () => {
    seedLyingRunner('ℹ tests 8\nℹ pass 8\nℹ fail 0\nℹ skipped 0\nℹ todo 0\n');

    const res = verify.runVerify(dir);

    assert.equal(res.passed, true, `fail 0 is a clean run, not a failure; errors: ${why(res)}`);
    assert.equal(res.checks.tests.passed, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Case 6 — the existing, hard-won contracts. GREEN BEFORE AND AFTER; the fix must
// break none of them.
// ─────────────────────────────────────────────────────────────────────────────
describe('X3 — the existing contracts still hold', () => {
  it('case 6a: last-match ordering — a spoofed early "all files | 100" loses to the real below-floor summary', () => {
    // The real coverage row is emitted LAST. A stray/spoofed 100 earlier in the
    // stream must never beat it. Now proven with the row COLORIZED and under the
    // spec reporter's `ℹ` prefix, which is what node actually pipes out.
    write('.ctoc/coverage-baseline.json', JSON.stringify({ minPct: 99 }));
    seedLyingRunner(
      `all files | 100 | 100 | 100 |\n`
      + `${blue('ℹ tests 3')}\n${blue('ℹ pass 3')}\n${blue('ℹ fail 0')}\n`
      + `${blue('ℹ all files | 40.12 | 30 | 20 |')}\n`
    );

    const res = verify.runVerify(dir);

    assert.equal(res.checks.tests.coverage, 40.12,
      'the LAST coverage row is the real one — a spoofed earlier 100 must not win');
    assert.equal(res.passed, false, `below-floor coverage must fail; errors: ${why(res)}`);
    assert.ok(
      res.errors.some((e) => /40\.12/.test(e) && /99/.test(e)),
      `the error must print the real figure next to the floor; errors: ${why(res)}`
    );
  });

  it('case 6b: absent-script tolerance — a missing lint script is applicable:false, not a failing lint', () => {
    // `npm error Missing script: "lint"` is an ABSENT script, not a failed lint.
    seedLyingRunner('ℹ tests 1\nℹ pass 1\nℹ fail 0\n');

    const res = verify.runVerify(dir);

    assert.equal(res.checks.lint.applicable, false, 'an absent lint script is recorded, not failed');
    assert.equal(res.checks.types.applicable, false, 'an absent typecheck script is recorded, not failed');
    assert.equal(res.passed, true, `a normal project with tests but no lint/typecheck must PASS; errors: ${why(res)}`);
    assert.ok(
      !res.errors.some((e) => /lint/i.test(e)),
      `an ABSENT lint script must never be reported as a failing check; errors: ${why(res)}`
    );
  });

  it('case 6c: no-verifiable-toolchain still fires when nothing ran', () => {
    // An empty project: zero substantive checks. Nothing ran, so nothing was
    // verified. A gate that opens on nothing is not a gate.
    const res = verify.runVerify(dir);

    assert.equal(res.passed, false, 'a project where NOTHING could run must not pass');
    assert.ok(
      res.errors.some((e) => /no-verifiable-toolchain/i.test(e)),
      `the failure must name what was looked for; errors: ${why(res)}`
    );
  });

  it('case 6d: the "0 skipped" contract still fires, and now survives colour + the spec reporter', () => {
    seedLyingRunner(`${blue('ℹ tests 8')}\n${blue('ℹ pass 5')}\n${blue('ℹ fail 0')}\n${blue('ℹ skipped 3')}\n`);

    const res = verify.runVerify(dir);

    assert.equal(res.checks.tests.skipped, 3, 'the skipped counter must survive colour and the spec reporter');
    assert.equal(res.passed, false, `the contract is 0 skipped; errors: ${why(res)}`);
    assert.ok(
      res.errors.some((e) => /skipped/i.test(e) && /3/.test(e)),
      `the error must name the 3 skipped tests; errors: ${why(res)}`
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Case 7 — THE ONE THAT PROVES THE REAL THING. A unit test on a regex is not
// enough: that is exactly how BOTH instances of this bug shipped. Drive the real
// runner, with real colour, over a suite with a real failure.
// ─────────────────────────────────────────────────────────────────────────────
describe('X3 — end to end, real node --test, real colour', () => {
  it('case 7: VERIFY over a suite with a REAL failure, under FORCE_COLOR=3, does not certify', () => {
    // A REAL node --test suite with one real failing assertion, run by a REAL
    // node --test, emitting REAL colorized reporter bytes — wrapped so it EXITS 0.
    //
    // The wrapper is the whole point. A bare `node --test` exits non-zero, so the
    // EXIT CODE catches the failure and the parser is never consulted — a version
    // of this test without the wrapper passes even against the broken parser, and
    // is hollow. The wrapper (`|| true`, `set +e`, a reporter that swallows the
    // exit code — the exact scenario named in the comment above the defect) leaves
    // the fail counter as the ONLY instrument. This is the real thing.
    write('suite.test.js',
      "const test = require('node:test');\n"
      + "const assert = require('node:assert');\n"
      + "test('a real passing test', () => { assert.strictEqual(1, 1); });\n"
      + "test('a real FAILING test', () => { assert.strictEqual(2 + 2, 5); });\n");
    // Cross-platform `|| true`: a node wrapper, not a shell operator.
    //
    // The runner names its reporter (plan the-test-suite-passes-on-a-clean-machine). The outside
    // contract: node picks its default reporter itself, and on Node 22.23.1 with standard output
    // piped (runVerify pipes `npm test`) it picked TAP, which carries no colour, so the
    // escape-byte check below failed before anything was tested. package.json
    // (`engines.node >= 18`) does not fix that default. Why the fixture and not the code: the
    // parser reads both reporters (cases 1-3); this fixture relied on a default. `spec` is the
    // reporter that colours, which is the cause this case covers. What newly fails: nothing; the
    // escape-byte check is unchanged and still fails loudly on a node whose spec reporter does
    // not colour piped output.
    write('run-tests.js',
      "const { spawnSync } = require('node:child_process');\n"
      + "spawnSync(process.execPath, ['--test', '--test-reporter=spec', 'suite.test.js'], { stdio: 'inherit' });\n"
      + "process.exit(0); // the exit-0 liar: swallow the child's real exit code\n");
    pkg({
      name: 'e2e', version: '1.0.0', private: true, main: 'index.js',
      scripts: { test: 'node run-tests.js' }
    });
    write('index.js', 'module.exports = {};\n');

    const saved = { force: process.env.FORCE_COLOR, ctx: process.env.NODE_TEST_CONTEXT, no: process.env.NO_COLOR };
    let res;
    try {
      // Real colour, inherited straight into the spawn — exactly how the gate went
      // blind in the wild (a CI runner, a wrapper, or a developer's own setting).
      process.env.FORCE_COLOR = '3';
      delete process.env.NO_COLOR;
      // A nested `node --test` INHERITS NODE_TEST_CONTEXT from this outer runner
      // and defers its exit code / suppresses its reporter — which would make the
      // child suite not really run and hand this test a hollow green. Clear it,
      // then PROVE below that the fixture really ran.
      delete process.env.NODE_TEST_CONTEXT;
      res = verify.runVerify(dir);
    } finally {
      if (saved.force === undefined) delete process.env.FORCE_COLOR; else process.env.FORCE_COLOR = saved.force;
      if (saved.ctx === undefined) delete process.env.NODE_TEST_CONTEXT; else process.env.NODE_TEST_CONTEXT = saved.ctx;
      if (saved.no === undefined) delete process.env.NO_COLOR; else process.env.NO_COLOR = saved.no;
    }

    const out = (res.checks.tests && res.checks.tests.output) || '';

    // FAIL LOUDLY if the fixture did not really run — a hollow end-to-end test is
    // how the sibling instance shipped. The child must have really executed both
    // tests and really reported the failure.
    assert.equal(res.checks.tests.ran, true, `the fixture suite must really RUN; check: ${JSON.stringify(res.checks.tests)}`);
    assert.ok(
      /a real FAILING test/.test(out),
      `the fixture suite did not really run — its test names are absent from the captured output. `
      + `This test would be hollow. Captured output was:\n${out}`
    );
    assert.ok(
      /fail/i.test(out),
      `the child reported no fail counter at all — the fixture did not really run. Output:\n${out}`
    );
    // And PROVE the colour really propagated. If FORCE_COLOR did not reach the
    // grandchild, these bytes are plain and this test silently degrades into a
    // weaker one that no longer covers the colour cause.
    assert.ok(
      out.includes(ESC),
      `FORCE_COLOR=3 did not reach the real runner — no escape bytes in the captured output, `
      + `so this test would NOT be covering the colour cause. Output:\n${JSON.stringify(out.slice(0, 400))}`
    );
    assert.ok(
      res.checks.tests.command === 'npm test',
      `the declared script must be what ran; got: ${res.checks.tests.command}`
    );

    // The real assertion.
    assert.equal(res.passed, false,
      `VERIFY must NOT certify a suite with a real failing test under FORCE_COLOR=3; errors: ${why(res)}`);
    assert.equal(res.checks.tests.passed, false, 'the test check itself must be marked failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VENV — a Python project's own tools. The ruff, mypy and pytest below are REAL
// executables on disk, found through a REAL PATH lookup and run as REAL
// subprocesses by the real runVerify. They stand in for the third-party tools (an
// outside dependency), never for CTOC logic.
// ─────────────────────────────────────────────────────────────────────────────
describe('VENV — VERIFY finds a Python project\'s own tools and puts their folder first on PATH', () => {
  const binName = process.platform === 'win32' ? 'Scripts' : 'bin';
  let tools;
  let emptyBin;
  let globalBin;
  let savedPath;
  let venvBin;
  let plainVenvBin;

  /**
   * A folder whose files can be EXECUTED. The fixture tools are real programs, and
   * some machines mount the system temp folder noexec, where starting any program in
   * it fails with EACCES. The probe is a real attempt to start a real program; when
   * the temp folder refuses, the fixtures live beside the repository instead.
   */
  function executableBase() {
    if (process.platform === 'win32') return os.tmpdir();
    const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-exec-probe-'));
    try {
      const probe = path.join(probeDir, 'probe');
      fs.writeFileSync(probe, '#!/bin/sh\nexit 0\n');
      fs.chmodSync(probe, 0o755);
      const r = childProcess.spawnSync(probe, [], { stdio: 'ignore' });
      return r.error ? path.join(__dirname, '..') : os.tmpdir();
    } finally {
      fs.rmSync(probeDir, { recursive: true, force: true });
    }
  }

  beforeEach(() => {
    const base = executableBase();
    if (base !== os.tmpdir()) {
      // The project folder made by the outer hook is not executable-capable: replace it.
      fs.rmSync(dir, { recursive: true, force: true });
      dir = fs.mkdtempSync(path.join(base, '.ctoc-venv-project-'));
    }
    tools = fs.mkdtempSync(path.join(base, 'ctoc-venv-tools-'));
    emptyBin = path.join(tools, 'empty-bin');
    globalBin = path.join(tools, 'global-bin');
    fs.mkdirSync(emptyBin);
    fs.mkdirSync(globalBin);
    fs.mkdirSync(path.join(tools, 'shims'));
    savedPath = process.env.PATH;
    venvBin = path.resolve(dir, '.venv', binName);
    plainVenvBin = path.resolve(dir, 'venv', binName);
  });
  afterEach(() => {
    if (savedPath === undefined) delete process.env.PATH; else process.env.PATH = savedPath;
    fs.rmSync(tools, { recursive: true, force: true });
  });

  /** Write a real executable named `name` into `binDir`. */
  function writeTool(binDir, name, { origin, exitCode = 0, body = '' }) {
    const js = path.join(tools, 'shims', `${origin}-${name}.js`);
    fs.writeFileSync(js, [
      "'use strict';",
      "if (process.argv[2] === '--version') {",
      `  process.stdout.write(${JSON.stringify(`${name} 0.0.0 (fixture)`)} + '\\n');`,
      '} else {',
      `  const lines = ${JSON.stringify(`FIXTURE ${name} from=${origin}`)} + '\\n' +`,
      "    'PATHFULL=' + (process.env.PATH || '') + '\\n' +",
      // The outside contract is the child's environment: a fixture tool prints what the real
      // tools (ruff, mypy, pytest) would be given. This helper line is added so that a venv run's
      // own temp folder can be seen. Why the helper and not the code: VERIFY now gives its checks a
      // temp folder of their own in TMPDIR, and only the child can report what it was handed. What
      // newly fails: a venv run whose tools are not given the run's folder now fails V11; no
      // V1-V10 assertion changes.
      "    'TMPDIRFULL=' + (process.env.TMPDIR || '') + '\\n' +",
      `    ${JSON.stringify(body)} + '\\n';`,
      '  process.stdout.write(lines);',
      `  if (${exitCode} !== 0) process.stderr.write(${JSON.stringify(body)} + '\\n');`,
      `  process.exitCode = ${exitCode};`,
      '}',
      ''
    ].join('\n'));
    fs.mkdirSync(binDir, { recursive: true });
    if (process.platform === 'win32') {
      fs.writeFileSync(path.join(binDir, `${name}.cmd`),
        `@"${process.execPath}" "${js}" %*\r\n`);
    } else {
      const launcher = path.join(binDir, name);
      fs.writeFileSync(launcher, `#!/bin/sh\nexec "${process.execPath}" "${js}" "$@"\n`);
      fs.chmodSync(launcher, 0o755);
    }
  }

  function writePythonTools(binDir, origin, overrides = {}) {
    writeTool(binDir, 'ruff', { origin, body: 'All checks passed!' });
    writeTool(binDir, 'mypy', { origin, body: 'Success: no issues found in 1 source file' });
    writeTool(binDir, 'pytest', { origin, body: '3 passed in 0.01s', ...(overrides.pytest || {}) });
  }

  function pyproject() { write('pyproject.toml', '[project]\nname = "wicks"\n'); }

  /** The value of the line `PATHFULL=...` a fixture tool printed. */
  function pathLine(check) {
    const line = String(check.output).split('\n').find((l) => l.startsWith('PATHFULL='));
    assert.ok(line !== undefined, `the fixture tool printed no PATHFULL line; output: ${check.output}`);
    return line.slice('PATHFULL='.length);
  }

  function assertAllRanFrom(res, origin) {
    for (const key of ['lint', 'types', 'tests']) {
      const c = res.checks[key];
      assert.equal(c.applicable, true, `${key} must be applicable; got ${JSON.stringify(c)}`);
      assert.equal(c.ran, true, `${key} must have RUN; got ${JSON.stringify(c)}`);
      assert.equal(c.passed, true, `${key} must pass; got ${JSON.stringify(c)}`);
      assert.ok(c.output.includes(`from=${origin}`), `${key} must run the ${origin} tool; output: ${c.output}`);
    }
    assert.equal(res.checks.lint.command, 'ruff check .');
    assert.equal(res.checks.types.command, 'mypy .');
    assert.equal(res.checks.tests.command, 'pytest');
  }

  it('V1: tools only in .venv are found and run with the folder first on PATH; CTOC\'s own environment is untouched', () => {
    pyproject();
    writePythonTools(venvBin, 'dotvenv');
    process.env.PATH = emptyBin;
    const before = { ...process.env };
    const res = verify.runVerify(dir);
    assert.equal(res.method, 'fallback-direct');
    assertAllRanFrom(res, 'dotvenv');
    for (const key of ['lint', 'types', 'tests']) {
      assert.equal(pathLine(res.checks[key]), `${venvBin}${path.delimiter}${emptyBin}`);
      assert.equal(res.checks[key].firstOnPath, `.venv/${binName}`);
    }
    assert.equal(res.passed, true, `errors: ${why(res)}`);
    assert.deepEqual(res.errors, []);
    assert.deepEqual({ ...process.env }, before);
    assert.equal(process.env.PATH, emptyBin);
  });

  it('V2: a failing test in a venv project is a test failure, not no-verifiable-toolchain', () => {
    pyproject();
    writePythonTools(venvBin, 'dotvenv', {
      pytest: { exitCode: 1, body: 'FAILED tests/test_wick.py::test_density - assert 2 == 3\n1 failed, 2 passed in 0.03s' }
    });
    process.env.PATH = emptyBin;
    const res = verify.runVerify(dir);
    assert.equal(res.passed, false);
    assert.equal(res.checks.tests.ran, true);
    assert.equal(res.checks.tests.passed, false);
    assert.ok(res.errors.some((e) => /^Tests failed: /.test(e) && /1 failed/.test(e)), why(res));
    assert.ok(!res.errors.some((e) => /no-verifiable-toolchain/.test(e)), why(res));
    assert.equal(res.checks.lint.passed, true);
    assert.equal(res.checks.types.passed, true);
  });

  it('V3: no venv and no tools still fails closed, and the message names .venv', () => {
    pyproject();
    process.env.PATH = emptyBin;
    const res = verify.runVerify(dir);
    for (const key of ['lint', 'types', 'tests']) {
      assert.equal(res.checks[key].applicable, false, key);
      assert.equal(res.checks[key].firstOnPath, undefined, key);
    }
    assert.equal(res.passed, false);
    assert.ok(res.errors.some((e) => /no-verifiable-toolchain/.test(e) && /\.venv/.test(e)), why(res));
  });

  it('V4: tools on PATH and no venv behave as before (nothing put in front)', () => {
    pyproject();
    writePythonTools(globalBin, 'global');
    process.env.PATH = globalBin;
    const res = verify.runVerify(dir);
    assertAllRanFrom(res, 'global');
    for (const key of ['lint', 'types', 'tests']) {
      assert.equal(pathLine(res.checks[key]), globalBin);
      assert.equal(res.checks[key].firstOnPath, undefined, key);
    }
    assert.equal(res.passed, true, `errors: ${why(res)}`);
  });

  it('V5: the project\'s own tool is preferred over a global one', () => {
    pyproject();
    writePythonTools(globalBin, 'global');
    writePythonTools(venvBin, 'dotvenv');
    process.env.PATH = globalBin;
    const res = verify.runVerify(dir);
    assertAllRanFrom(res, 'dotvenv');
    for (const key of ['lint', 'types', 'tests']) {
      assert.equal(res.checks[key].firstOnPath, `.venv/${binName}`);
    }
  });

  it('V6: a venv folder without the dot is found too', () => {
    pyproject();
    writePythonTools(plainVenvBin, 'plainvenv');
    process.env.PATH = emptyBin;
    const res = verify.runVerify(dir);
    assertAllRanFrom(res, 'plainvenv');
    for (const key of ['lint', 'types', 'tests']) {
      assert.equal(res.checks[key].firstOnPath, `venv/${binName}`);
    }
    assert.equal(res.passed, true, `errors: ${why(res)}`);
  });

  it('V7: .venv wins over venv and only one folder is put first', () => {
    pyproject();
    writePythonTools(venvBin, 'dotvenv');
    writePythonTools(plainVenvBin, 'plainvenv');
    process.env.PATH = emptyBin;
    const res = verify.runVerify(dir);
    assertAllRanFrom(res, 'dotvenv');
    for (const key of ['lint', 'types', 'tests']) {
      const entries = pathLine(res.checks[key]).split(path.delimiter);
      assert.equal(entries[0], venvBin);
      assert.ok(!entries.includes(plainVenvBin), `venv folder must not be on PATH: ${entries.join(path.delimiter)}`);
    }
  });

  it('V8: a .venv tool folder that is not a folder is skipped', () => {
    pyproject();
    fs.mkdirSync(path.join(dir, '.venv'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.venv', binName), 'not a folder\n');
    writePythonTools(plainVenvBin, 'plainvenv');
    process.env.PATH = emptyBin;
    const res = verify.runVerify(dir);
    assertAllRanFrom(res, 'plainvenv');
    for (const key of ['lint', 'types', 'tests']) {
      assert.equal(res.checks[key].firstOnPath, `venv/${binName}`);
    }
  });

  it('V9: an empty PATH never gains an empty entry', () => {
    pyproject();
    writePythonTools(venvBin, 'dotvenv');
    process.env.PATH = '';
    const res = verify.runVerify(dir);
    assertAllRanFrom(res, 'dotvenv');
    for (const key of ['lint', 'types', 'tests']) {
      assert.equal(pathLine(res.checks[key]), venvBin);
    }
    assert.equal(res.passed, true, `errors: ${why(res)}`);
  });

  it('V10: a project without pyproject.toml is not affected by a .venv folder', () => {
    pkg({
      name: 'nodeproj', version: '1.0.0', private: true, main: 'index.js',
      scripts: { test: 'node print-path.js' }
    });
    write('index.js', 'module.exports = {};\n');
    write('print-path.js', "process.stdout.write('PATHFULL=' + (process.env.PATH || '') + '\\n');\n");
    writeTool(venvBin, 'ruff', { origin: 'dotvenv', body: 'All checks passed!' });
    const res = verify.runVerify(dir);
    assert.equal(res.checks.tests.ran, true, `tests: ${JSON.stringify(res.checks.tests)}`);
    const entries = pathLine(res.checks.tests).split(path.delimiter);
    assert.ok(!entries.includes(venvBin), 'the venv folder must not be on PATH for a non-Python project');
    assert.equal(res.checks.tests.firstOnPath, undefined);
    assert.equal(res.passed, true, `errors: ${why(res)}`);
  });

  it('V11: a venv project gets the venv PATH and its own temp folder in one environment', () => {
    const savedHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
    const home = fs.mkdtempSync(path.join(tools, 'home-'));
    try {
      process.env.HOME = home;
      process.env.USERPROFILE = home;
      pyproject();
      writePythonTools(venvBin, 'dotvenv');
      process.env.PATH = emptyBin;
      const res = verify.runVerify(dir);
      assertAllRanFrom(res, 'dotvenv');
      for (const key of ['lint', 'types', 'tests']) {
        const c = res.checks[key];
        assert.equal(pathLine(c), `${venvBin}${path.delimiter}${emptyBin}`, `${key}: venv folder first on PATH`);
        assert.equal(c.firstOnPath, `.venv/${binName}`, key);
        assert.match(c.tempFolder, RUN_FOLDER_RE, `${key}: the record names the run folder`);
        assert.equal(lineValue(c, 'TMPDIRFULL'), expandShown(c.tempFolder, home),
          `${key}: the tool was handed the run folder as its TMPDIR`);
      }
      assert.equal(res.passed, true, `errors: ${why(res)}`);
      assert.deepEqual(fs.readdirSync(baseOf(home)), [], 'the run folder is removed afterwards');
    } finally {
      for (const [k, v] of Object.entries(savedHome)) {
        if (v === undefined) delete process.env[k]; else process.env[k] = v;
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEMP — VERIFY gives its checks a temp folder of its own. Every project is real on
// disk and every check is a real `npm` subprocess run by the real runVerify /
// runFallbackChecks / persistVerifyResult. Fault injection replaces only the outside
// boundary (a safe-fs call or os.homedir) and is always restored in `finally`.
// ─────────────────────────────────────────────────────────────────────────────
describe('TEMP — VERIFY gives its checks a temp folder of its own', () => {
  const safeFs = require('../src/lib/safe-fs');
  const ENV_KEYS = ['HOME', 'USERPROFILE', 'TMPDIR', 'TMP', 'TEMP', 'Temp', 'CTOC_VERIFY_TIMEOUT_MS'];
  let scratch;
  let scratchHome;
  let savedEnv;

  beforeEach(() => {
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-temp-scratch-'));
    scratchHome = path.join(scratch, 'home');
    fs.mkdirSync(scratchHome);
    savedEnv = {};
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
    // Every run in this block makes its folder under the scratch home, never the real one.
    process.env.HOME = scratchHome;
    process.env.USERPROFILE = scratchHome;
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k];
    }
    fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 5 });
  });

  /**
   * Seed a library-shaped project whose scripts run `probe.js`. The probe prints what its
   * environment gave it and, in `test` mode, acts on `behaviour`.
   */
  function seedTempProbe(behaviour, scripts = ['test']) {
    write('probe.js', [
      "'use strict';",
      "const os = require('os');",
      "const fs = require('fs');",
      "const path = require('path');",
      `const behaviour = ${JSON.stringify(behaviour)};`,
      "const pairs = Object.keys(process.env).filter((k) => /^(tmpdir|tmp|temp)$/i.test(k))",
      "  .map((k) => [k, process.env[k]]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));",
      "process.stdout.write('SEEN_TMPDIR=' + os.tmpdir() + '\\n');",
      "process.stdout.write('ENV_TMPDIR=' + (process.env.TMPDIR || '') + '\\n');",
      "process.stdout.write('ENV_TMP=' + (process.env.TMP || '') + '\\n');",
      "process.stdout.write('ENV_TEMP=' + (process.env.TEMP || '') + '\\n');",
      "process.stdout.write('ENV_KEYS=' + JSON.stringify(pairs) + '\\n');",
      "if (process.argv[2] === 'test') {",
      '  if (behaviour.write) {',
      "    const target = path.join(os.tmpdir(), 'written-by-the-suite.txt');",
      "    fs.writeFileSync(target, 'written\\n');",
      "    process.stdout.write('WROTE=' + target + '\\n');",
      '  }',
      '  if (behaviour.exitCode) process.exitCode = behaviour.exitCode;',
      "  if (behaviour.throws) throw new Error('the check threw on purpose');",
      '  if (behaviour.sleepMs) setTimeout(() => {}, behaviour.sleepMs);',
      '}',
      ''
    ].join('\n'));
    const table = { test: 'node probe.js test', lint: 'node probe.js lint', typecheck: 'node probe.js typecheck' };
    const wanted = {};
    for (const name of scripts) wanted[name] = table[name];
    pkg({ name: 'tempprobe', version: '1.0.0', private: true, main: 'index.js', scripts: wanted });
    write('index.js', 'module.exports = {};\n');
  }

  /** The value of the `KEY=` line in a check's output. */
  const seen = (check, key) => lineValue(check, key);

  /** The stored form of `p` when `home` is the home folder (what shownTempFolder gives). */
  function storedForm(p, home) {
    const rel = path.relative(home, p);
    if (rel && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)) {
      return `~/${rel.split(path.sep).join('/')}`;
    }
    return p.split(path.sep).join('/');
  }

  /** The pattern `name` of the protection hook, read from its source text. */
  function hookPattern(name) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'hooks', 'protect-records.js'), 'utf8');
    const m = new RegExp(`^const ${name} = /(.+)/([a-z]*);$`, 'm').exec(src);
    assert.ok(m, `the hook no longer declares "const ${name} = /.../flags;" in the shape this test reads`);
    return { source: m[1], re: new RegExp(m[1], m[2]) };
  }

  /** Turn each alternative of a hook pattern into the sample text it matches. */
  function hookWordsOf(name) {
    const { source } = hookPattern(name);
    const words = [];
    const plain = (alt) => {
      const left = alt.replace(/\\\./g, '');
      if (/[\\^$.*+?()[\]{}|]/.test(left)) {
        assert.fail(`${name} has an alternative this test cannot turn into a word: ${alt}; add the word to `
          + 'UNSAFE_TEMP_WORDS in src/lib/step-13-verify.js and teach this test the new shape');
      }
      return alt.replace(/\\\./g, '.');
    };
    for (const alt of source.split('|')) {
      const group = /\(([^()]*)\)\?/.exec(alt);
      if (group) {
        words.push(plain(alt.replace(group[0], '')));
        words.push(plain(alt.replace(group[0], group[1])));
      } else {
        words.push(plain(alt));
      }
    }
    return words;
  }

  /** True when the hook's fail rule (src/hooks/protect-records.js, the catch block) would refuse `text`. */
  function hookRefuses(text) {
    const json = JSON.stringify(text);
    if (hookPattern('UNCHECKED_SUSPECT_RE').re.test(json)) return true;
    if (hookPattern('MENU_MENTION_RE').re.test(json)) return true;
    if (hookPattern('SETTINGS_MENTION_RE').re.test(json.normalize('NFKC'))) return true;
    const flat = json.replace(/["'\\]/g, '');
    return (/sweep/i.test(flat) && /--confirm/i.test(flat)) || /applysweep/i.test(flat);
  }

  it('T1: a run whose default temp location cannot hold the suite still passes', () => {
    seedTempProbe({ write: true });
    const blocked = path.join(scratch, 'not-a-folder');
    fs.writeFileSync(blocked, 'a file, not a folder\n');
    process.env.TMPDIR = blocked;
    process.env.TMP = blocked;
    process.env.TEMP = blocked;
    const res = verify.runVerify(dir);
    assert.equal(res.passed, true, `passed: ${res.passed}; errors: ${why(res)}; output: ${res.checks.tests && res.checks.tests.output}`);
    const tests = res.checks.tests;
    assert.equal(tests.ran, true);
    assert.match(tests.tempFolder, RUN_FOLDER_RE);
    const folder = expandShown(tests.tempFolder, scratchHome);
    assert.equal(seen(tests, 'SEEN_TMPDIR'), folder);
    assert.equal(seen(tests, 'WROTE'), path.join(folder, 'written-by-the-suite.txt'));
    assert.equal(fs.existsSync(folder), false, 'the run folder is removed');
    assert.equal(process.env.TMPDIR, blocked, "CTOC's own environment is untouched");
  });

  it('T2: the record names the folder, and the folder is neutral by the hook\'s words', () => {
    seedTempProbe({}, ['lint', 'typecheck', 'test']);
    const stored = verify.persistVerifyResult(dir, 'temp-folder-record');
    const onDisk = JSON.parse(fs.readFileSync(
      path.join(dir, '.ctoc', 'state', 'verify', 'temp-folder-record.json'), 'utf8'));
    assert.deepEqual(onDisk.checks.tests.tempFolder, stored.checks.tests.tempFolder);
    const tests = onDisk.checks.tests;
    const expected = '~/' + path.relative(scratchHome, seen(tests, 'SEEN_TMPDIR')).split(path.sep).join('/');
    assert.equal(tests.tempFolder, expected);
    assert.equal(onDisk.checks.lint.tempFolder, expected);
    assert.equal(onDisk.checks.types.tempFolder, expected);
    for (const key of ['lint', 'types', 'tests']) {
      assert.equal(onDisk.checks[key].tempFolderNote, undefined, `${key} carries no note`);
    }
    assert.equal(onDisk.passed, true, `errors: ${JSON.stringify(onDisk.errors)}`);
    assert.equal(hookRefuses(expandShown(tests.tempFolder, scratchHome)), false,
      'an ordinary folder trips none of the hook\'s crash-rule patterns');
    assert.equal(onDisk.summary, 'VERIFY passed — ran: lint, typecheck, tests');
  });

  it('T3: every temp variable names the folder, whatever the spelling of the inherited key', () => {
    seedTempProbe({});
    if (process.platform === 'win32') {
      delete process.env.TEMP;
      process.env.Temp = path.join(scratch, 'inherited');
    } else {
      process.env.Temp = 'inherited-Temp';
    }
    const res = verify.runVerify(dir);
    assert.equal(res.passed, true, `errors: ${why(res)}`);
    const tests = res.checks.tests;
    const folder = expandShown(tests.tempFolder, scratchHome);
    assert.equal(seen(tests, 'SEEN_TMPDIR'), folder);
    assert.equal(seen(tests, 'ENV_TMPDIR'), folder);
    assert.equal(seen(tests, 'ENV_TMP'), folder);
    assert.equal(seen(tests, 'ENV_TEMP'), folder);
    const pairs = JSON.parse(seen(tests, 'ENV_KEYS'));
    if (process.platform === 'win32') {
      const temps = pairs.filter(([k]) => /^temp$/i.test(k));
      assert.equal(temps.length, 1, `exactly one TEMP key reaches the child; got ${JSON.stringify(pairs)}`);
      assert.equal(temps[0][1], folder);
    } else {
      // Two variables on Linux and macOS: VERIFY writes only the three upper-case names.
      assert.ok(pairs.some(([k, v]) => k === 'TEMP' && v === folder), JSON.stringify(pairs));
      assert.ok(pairs.some(([k, v]) => k === 'Temp' && v === 'inherited-Temp'), JSON.stringify(pairs));
    }
  });

  describe('T4 — the folder is removed', () => {
    const leftovers = () => fs.readdirSync(baseOf(scratchHome));

    it('T4a: the tests pass', () => {
      seedTempProbe({});
      const res = verify.runVerify(dir);
      assert.equal(res.passed, true, `errors: ${why(res)}`);
      assert.deepEqual(leftovers(), []);
      assert.equal(fs.existsSync(expandShown(res.checks.tests.tempFolder, scratchHome)), false);
    });

    it('T4b: the tests fail', () => {
      seedTempProbe({ exitCode: 1 });
      const res = verify.runVerify(dir);
      assert.equal(res.passed, false);
      assert.ok(res.errors.some((e) => /^Tests failed/.test(e)), why(res));
      assert.deepEqual(leftovers(), []);
      assert.equal(fs.existsSync(expandShown(res.checks.tests.tempFolder, scratchHome)), false);
    });

    it('T4c: the tests time out', () => {
      process.env.CTOC_VERIFY_TIMEOUT_MS = '1500';
      seedTempProbe({ sleepMs: 4000 });
      const res = verify.runVerify(dir);
      const tests = res.checks.tests;
      assert.equal(tests.passed, false);
      assert.ok(res.errors.some((e) => /did not complete within the 1500ms budget/.test(e)), why(res));
      assert.deepEqual(leftovers(), []);
      assert.equal(fs.existsSync(expandShown(tests.tempFolder, scratchHome)), false);
      const printed = String(tests.output).split('\n').find((l) => l.startsWith('SEEN_TMPDIR='));
      if (printed !== undefined) {
        assert.equal(fs.existsSync(printed.slice('SEEN_TMPDIR='.length)), false,
          'the folder the killed check printed is gone');
      }
    });

    it('T4d: the check throws', () => {
      seedTempProbe({ throws: true });
      const res = verify.runVerify(dir);
      const tests = res.checks.tests;
      assert.equal(res.passed, false);
      assert.ok(`${tests.output}\n${tests.error}`.includes('the check threw on purpose'),
        `output: ${tests.output}; error: ${tests.error}`);
      assert.deepEqual(leftovers(), []);
      assert.equal(fs.existsSync(expandShown(tests.tempFolder, scratchHome)), false);
    });

    it('T4e: VERIFY\'s own code throws mid-run, the throw propagates, the folder goes', () => {
      seedTempProbe({});
      const original = safeFs.existsSync;
      safeFs.existsSync = (p) => {
        if (String(p).endsWith('go.mod')) throw new Error('injected: the check runner threw');
        return original(p);
      };
      try {
        assert.throws(() => verify.runVerify(dir), /injected/);
      } finally {
        safeFs.existsSync = original;
      }
      assert.equal(fs.existsSync(baseOf(scratchHome)), true, 'the base was made before the throw');
      assert.deepEqual(leftovers(), []);
    });

    it('T4f: a removal that fails is named in the record and does not change the verdict', () => {
      seedTempProbe({});
      const original = safeFs.rmSync;
      const base = baseOf(scratchHome);
      safeFs.rmSync = (p, ...rest) => {
        if (String(p).startsWith(base + path.sep)) throw Object.assign(new Error('busy'), { code: 'EBUSY' });
        return original(p, ...rest);
      };
      let res;
      try {
        res = verify.runVerify(dir);
      } finally {
        safeFs.rmSync = original;
      }
      const tests = res.checks.tests;
      assert.equal(res.passed, true, `the verdict is the run's alone; errors: ${why(res)}`);
      assert.ok(tests.tempFolderNote.includes(tests.tempFolder), tests.tempFolderNote);
      assert.ok(tests.tempFolderNote.includes('(EBUSY)'), tests.tempFolderNote);
      assert.ok(tests.tempFolderNote.includes('remove it by hand'), tests.tempFolderNote);
      assert.equal(fs.existsSync(expandShown(tests.tempFolder, scratchHome)), true, 'the note is honest: it is still there');
      assert.equal(res.summary, 'VERIFY passed — ran: tests; not applicable: lint, typecheck');
    });
  });

  describe('T5 — CTOC\'s own environment does not change', () => {
    it('a plain project', () => {
      seedTempProbe({});
      const before = { ...process.env };
      const res = verify.runVerify(dir);
      assert.equal(res.passed, true, `errors: ${why(res)}`);
      assert.deepEqual({ ...process.env }, before);
    });

    it('a fallback run (no home folder to make the base in)', () => {
      seedTempProbe({});
      const gone = path.join(scratch, 'no-such-home');
      process.env.HOME = gone;
      process.env.USERPROFILE = gone;
      const before = { ...process.env };
      const res = verify.runVerify(dir);
      assert.equal(res.passed, true, `errors: ${why(res)}`);
      assert.deepEqual({ ...process.env }, before);
    });
  });

  it('T6: the name is neutral by the hook\'s own words (the drift test)', () => {
    const hookWords = [];
    for (const name of ['UNCHECKED_SUSPECT_RE', 'MENU_MENTION_RE', 'SETTINGS_MENTION_RE']) {
      for (const w of hookWordsOf(name)) {
        if (!hookWords.some((h) => h.toLowerCase() === w.toLowerCase())) hookWords.push(w);
      }
    }
    assert.ok(hookWords.length >= 10, `the extraction found only ${hookWords.length} words: ${hookWords.join(', ')}`);
    for (const w of hookWords) {
      assert.equal(hookRefuses(w), true, `the sample "${w}" is not refused by the hook's rule, so the sample is not real`);
    }
    const fixed = [
      ['VERIFY', '"verify"'],
      ['ſettings.json', '"settings.json"'],
      ['verify\u0301', '"verify"'],
      ['applysweep', '"applysweep"'],
      ['sweep--confirm', '"sweep" and "--confirm"']
    ];
    const samples = [...hookWords.map((w) => [w, null]), ...fixed];
    seedTempProbe({});
    const inheritedTmp = process.env.TMPDIR || '';
    for (const [sample, expectedWord] of samples) {
      const home = path.join(scratch, `home-${sample}`);
      fs.mkdirSync(home);
      process.env.HOME = home;
      process.env.USERPROFILE = home;
      const res = verify.runFallbackChecks(dir);
      const tests = res.checks.tests;
      assert.equal(tests.ran, true, `${sample}: the tests ran`);
      assert.ok(String(tests.tempFolderNote).includes('inherited temp folder'), `${sample}: note: ${tests.tempFolderNote}`);
      if (expectedWord) {
        assert.ok(tests.tempFolderNote.toLowerCase().includes(expectedWord.toLowerCase()),
          `${sample}: the note names ${expectedWord}; note: ${tests.tempFolderNote}`);
      } else {
        assert.match(tests.tempFolderNote, /contains "[^"]+"/, `${sample}: the note names a word`);
      }
      assert.equal(fs.existsSync(baseOf(home)), false, `${sample}: nothing was made there`);
      assert.equal(seen(tests, 'SEEN_TMPDIR'), os.tmpdir(), `${sample}: inherited temp folder`);
      assert.equal(seen(tests, 'ENV_TMPDIR'), inheritedTmp, `${sample}: inherited TMPDIR`);
    }
  });

  describe('T8 — a home folder that cannot hold the base falls back, and says so', () => {
    const assertFellBack = (res, home, why2) => {
      const tests = res.checks.tests;
      assert.equal(tests.ran, true, why2);
      assert.equal(res.passed, true, `${why2}; errors: ${why(res)}`);
      assert.equal(tests.tempFolder, storedForm(os.tmpdir(), home), why2);
      assert.ok(!String(tests.tempFolderNote).includes(home), `${why2}: the note holds no absolute home path`);
      return tests;
    };

    it('T8i: a run folder replaced by a link is removed as a link, and its target is left alone', () => {
      seedTempProbe({});
      const target = path.join(scratch, 'link-target');
      fs.mkdirSync(target);
      fs.writeFileSync(path.join(target, 'keep.txt'), 'keep\n');
      const original = safeFs.mkdtempSync;
      let n = 0;
      safeFs.mkdtempSync = (prefix) => {
        n += 1;
        // A name with a refused word, so VERIFY removes it; it is a link, not a folder.
        const link = `${prefix}verify-link${n}`;
        fs.symlinkSync(target, link, 'junction');
        return link;
      };
      let res;
      try {
        res = verify.runVerify(dir);
      } finally {
        safeFs.mkdtempSync = original;
      }
      assert.equal(res.passed, true, `errors: ${why(res)}`);
      assert.match(res.checks.tests.tempFolderNote, /tried 3 fresh names/);
      assert.deepEqual(fs.readdirSync(baseOf(scratchHome)), [], 'the links were removed');
      assert.equal(fs.readFileSync(path.join(target, 'keep.txt'), 'utf8'), 'keep\n', 'the link target was not followed');
    });

    it('T8a: the home folder does not exist', () => {
      seedTempProbe({});
      const gone = path.join(scratch, 'no-such-home');
      process.env.HOME = gone;
      process.env.USERPROFILE = gone;
      const tests = assertFellBack(verify.runVerify(dir), gone, 'T8a');
      assert.match(tests.tempFolderNote,
        /could not make its own temp folder ~\/\.cache\/ctoc-check-temp because the home folder does not exist or cannot be read \(ENOENT\)/);
      assert.equal(fs.existsSync(baseOf(gone)), false);
    });

    it('T8b: a file where .cache should be', () => {
      seedTempProbe({});
      fs.writeFileSync(path.join(scratchHome, '.cache'), 'a file\n');
      const tests = assertFellBack(verify.runVerify(dir), scratchHome, 'T8b');
      assert.match(tests.tempFolderNote,
        /could not make its own temp folder ~\/\.cache\/ctoc-check-temp \(([A-Z0-9_]+|an unknown error)\)/);
    });

    it('T8e: the home folder is a file, not a folder', () => {
      seedTempProbe({});
      const file = path.join(scratch, 'home-is-a-file');
      fs.writeFileSync(file, 'a file\n');
      process.env.HOME = file;
      process.env.USERPROFILE = file;
      const tests = assertFellBack(verify.runVerify(dir), file, 'T8e');
      assert.match(tests.tempFolderNote, /because the home folder is not a folder, so the checks ran/);
    });

    it('T8f: the real path of the base cannot be read', () => {
      seedTempProbe({});
      const original = safeFs.realpathSync;
      safeFs.realpathSync = (p, ...rest) => {
        if (String(p) === baseOf(scratchHome)) throw Object.assign(new Error('gone'), { code: 'EIO' });
        return original(p, ...rest);
      };
      let res;
      try {
        res = verify.runVerify(dir);
      } finally {
        safeFs.realpathSync = original;
      }
      const tests = assertFellBack(res, scratchHome, 'T8f');
      assert.match(tests.tempFolderNote, /could not read the real path of ~\/\.cache\/ctoc-check-temp \(EIO\)/);
      assert.deepEqual(fs.readdirSync(baseOf(scratchHome)), [], 'no run folder was made');
    });

    it('T8g: a home folder that is a link whose real path holds a refused word', () => {
      seedTempProbe({});
      const target = path.join(scratch, 'real-verify-home');
      const link = path.join(scratch, 'linked-home');
      fs.mkdirSync(target);
      fs.symlinkSync(target, link, 'junction');
      process.env.HOME = link;
      process.env.USERPROFILE = link;
      const tests = assertFellBack(verify.runVerify(dir), link, 'T8g');
      assert.match(tests.tempFolderNote, /did not use ~\/\.cache\/ctoc-check-temp because its real path contains "verify"/);
      assert.deepEqual(fs.readdirSync(path.join(target, '.cache', 'ctoc-check-temp')), [], 'no run folder was made');
    });

    it('T8h: the run folder cannot be made', () => {
      seedTempProbe({});
      const original = safeFs.mkdtempSync;
      safeFs.mkdtempSync = () => { throw Object.assign(new Error('full'), { code: 'ENOSPC' }); };
      let res;
      try {
        res = verify.runVerify(dir);
      } finally {
        safeFs.mkdtempSync = original;
      }
      const tests = assertFellBack(res, scratchHome, 'T8h');
      assert.match(tests.tempFolderNote, /could not make a run folder in ~\/\.cache\/ctoc-check-temp \(ENOSPC\)/);
    });

    it('T8c: no usable home folder', () => {
      seedTempProbe({});
      const original = os.homedir;
      const plainTmp = os.tmpdir().split(path.sep).join('/');
      try {
        os.homedir = () => '';
        let res = verify.runVerify(dir);
        assert.match(res.checks.tests.tempFolderNote, /because this process has no home folder, so the checks ran/);
        assert.equal(res.passed, true);
        assert.equal(res.checks.tests.tempFolder, plainTmp);

        os.homedir = () => { throw Object.assign(new Error('no entry'), { code: 'ENOENT' }); };
        res = verify.runVerify(dir);
        assert.match(res.checks.tests.tempFolderNote, /no home folder \(ENOENT\)/);
        assert.equal(res.passed, true);

        os.homedir = () => 'relative-home';
        res = verify.runVerify(dir);
        assert.match(res.checks.tests.tempFolderNote, /not an absolute path/);
        assert.equal(res.passed, true);
        assert.equal(fs.existsSync(path.join(process.cwd(), 'relative-home')), false,
          'no folder is made relative to the working folder');
      } finally {
        os.homedir = original;
      }
    });

    it('T8d: the name tries', () => {
      seedTempProbe({});
      const original = safeFs.mkdtempSync;
      const base = baseOf(scratchHome);
      try {
        // 1. The first name holds a refused word; the second try is a fresh, neutral name.
        let calls = 0;
        safeFs.mkdtempSync = (prefix, ...rest) => {
          calls += 1;
          if (calls > 1) return original(prefix, ...rest);
          const bad = `${prefix}verify1`;
          fs.mkdirSync(bad);
          return bad;
        };
        let res = verify.runVerify(dir);
        let tests = res.checks.tests;
        assert.equal(res.passed, true, `errors: ${why(res)}`);
        assert.match(tests.tempFolder, RUN_FOLDER_RE);
        assert.equal(tests.tempFolderNote, undefined);
        assert.equal(fs.existsSync(path.join(base, 'run-verify1')), false, 'the refused name was removed');

        // 2. Every name holds a refused word: three tries, then the fallback.
        let n = 0;
        safeFs.mkdtempSync = (prefix) => {
          n += 1;
          const bad = `${prefix}verify${n}`;
          fs.mkdirSync(bad);
          return bad;
        };
        res = verify.runVerify(dir);
        tests = res.checks.tests;
        assert.equal(res.passed, true, `errors: ${why(res)}`);
        assert.match(tests.tempFolderNote, /tried 3 fresh names/);
        assert.ok(tests.tempFolderNote.includes('"verify"'), tests.tempFolderNote);
        assert.deepEqual(fs.readdirSync(base), [], 'all three refused folders were removed');

        // 3. Every name is a folder OUTSIDE the base: VERIFY never deletes outside its base.
        n = 0;
        safeFs.mkdtempSync = () => {
          n += 1;
          const outside = path.join(scratch, `elsewhere-verify${n}`);
          fs.mkdirSync(outside);
          return outside;
        };
        res = verify.runVerify(dir);
        tests = res.checks.tests;
        assert.equal(res.passed, true, `errors: ${why(res)}`);
        assert.ok(tests.tempFolderNote.includes('not a run folder VERIFY made, so it was left in place'), tests.tempFolderNote);
        for (let i = 1; i <= 3; i += 1) {
          assert.equal(fs.existsSync(path.join(scratch, `elsewhere-verify${i}`)), true, `elsewhere-verify${i} is still there`);
        }
      } finally {
        safeFs.mkdtempSync = original;
      }
    });
  });
});
