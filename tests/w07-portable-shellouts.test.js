/**
 * W07-s6 — Portable shell-outs (SAST runner + disk probe)
 *
 * Finding M13: two POSIX-only shell-outs on hot paths.
 *   - src/lib/sast-runner.js runESLintSecurity() used
 *     `npx eslint ... 2>/dev/null || true` with { shell: true } — none of
 *     `2>/dev/null`, `|| true`, nor the cmd.exe-invalid shell string is portable
 *     to Windows.
 *   - src/lib/runner-detect.js checkDisk() shelled out to `df -k ... | tail -1`;
 *     `df` and `tail` do not exist on a stock Windows install.
 *
 * These tests assert BOTH:
 *   (a) a STATIC source guarantee — the POSIX-only constructs are absent from the
 *       source, so a dev machine that happens to have /bin/sh, df, and tail cannot
 *       mask the Windows failure; and
 *   (b) shell-independent BEHAVIOR — checkDisk() works with an empty PATH (no
 *       PATH-resolved external binary is needed), and runESLintSecurity() on a
 *       folder with no eslint records that eslint is not installed and starts no
 *       process (it used to start npx, which fetched eslint from the npm registry).
 *       That eslint, where the project has it, starts with no shell (the running
 *       Node program, the bin script first, an argument list, the same on win32) is
 *       proven by two tests of
 *       tests/security-scan-never-downloads-a-scanner.test.js: 'a project's own
 *       eslint is started by the running Node program with an argument list and no
 *       shell, and its finding blocks the push' and 'with the platform set to win32
 *       the start is the same: node, the script first, no shell, no .cmd'.
 *
 * Scope note: runner-detect.js legitimately retains `2>/dev/null` at other call
 * sites (commandVersion, checkExistingRunner) — those are separate findings,
 * explicitly out of scope for this slice per the parent plan's Out-of-Scope. This
 * slice touches only the `df | tail` disk probe, so the runner-detect static
 * assertion targets `df `/`| tail` only.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const SAST_RUNNER_PATH = path.join(REPO_ROOT, 'src', 'lib', 'sast-runner.js');

// ---------------------------------------------------------------------------
// STATIC source guarantees
// ---------------------------------------------------------------------------

test('sast-runner.js source contains no 2>/dev/null POSIX redirect', () => {
  const src = fs.readFileSync(SAST_RUNNER_PATH, 'utf8');
  assert.ok(
    !src.includes('2>/dev/null'),
    'sast-runner.js must not use the POSIX-only `2>/dev/null` redirect'
  );
});

test('sast-runner.js source contains no `|| true` POSIX shell fallback', () => {
  const src = fs.readFileSync(SAST_RUNNER_PATH, 'utf8');
  assert.ok(
    !src.includes('|| true'),
    'sast-runner.js must not use the POSIX-only `|| true` shell fallback'
  );
});

test('sast-runner.js source does not enable `shell: true`', () => {
  const src = fs.readFileSync(SAST_RUNNER_PATH, 'utf8');
  assert.ok(
    !/shell:\s*true/.test(src),
    'sast-runner.js must not spawn with `shell: true` (no shell means no cmd.exe/sh dependency)'
  );
});

test('runESLintSecurity() resolves without throwing when ESLint security is unavailable', async () => {
  // Every process start is recorded and refused before the module is loaded, so even a red run
  // starts nothing (the old code started the real `npx eslint`, 30 s on the profile).
  const starts = [];
  const real = { execFileSync: cp.execFileSync, execSync: cp.execSync, spawnSync: cp.spawnSync };
  const refuse = (via) => (file) => {
    starts.push({ via, file });
    throw Object.assign(new Error(`spawn ${file} ENOENT`), { code: 'ENOENT', status: null, stdout: '' });
  };
  cp.execFileSync = refuse('execFileSync');
  cp.execSync = refuse('execSync');
  cp.spawnSync = refuse('spawnSync');
  delete require.cache[require.resolve(SAST_RUNNER_PATH)];
  const { SASTRunner } = require(SAST_RUNNER_PATH);

  // A temp folder with no eslint: the method records that eslint is not installed and starts
  // nothing (it used to start npx, which fetched eslint from the npm registry). The method must
  // resolve, never reject, and never depend on a shell.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w07-sast-'));
  try {
    const runner = new SASTRunner(tmpDir, { timeout: 30000 });
    await assert.doesNotReject(
      runner.runESLintSecurity(),
      'runESLintSecurity() must resolve (catch path) even when ESLint security is unavailable'
    );
    assert.ok(
      runner.errors.some(e => e.tool === 'eslint-security' && /eslint is not installed/.test(e.error)),
      'the recorded error must name eslint as not installed'
    );
    assert.deepEqual(starts, [], 'no process may start, npx included');
  } finally {
    cp.execFileSync = real.execFileSync;
    cp.execSync = real.execSync;
    cp.spawnSync = real.spawnSync;
    delete require.cache[require.resolve(SAST_RUNNER_PATH)];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
