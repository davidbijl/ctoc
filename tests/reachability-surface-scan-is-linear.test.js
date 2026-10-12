'use strict';

/**
 * THE DEAD-EXPORT FENCE'S SURFACE SCAN IS LINEAR — a ReDoS regression guard.
 *
 * WHY (2026-07-29, MEASURED). CTOC's full `npm test` took 864 s (14.4 min), and ONE
 * test — tests/claim-census.test.js's 1-MiB-single-char fixture — was 851,923 ms of
 * it; the next-slowest test was ~10 s. Because `node --test` runs files in parallel,
 * that single test WAS the wall-clock. The cause was a quadratic regex in the
 * dead-export fence (src/lib/reachability.js):
 *
 *     const SURFACE_CALL_RE = /([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
 *
 * On a long run of identifier characters with no `(`, the UNBOUNDED `[A-Za-z0-9_$]*`
 * consumes the whole run, `\s*\(` fails, and the engine retries from every start
 * position → O(n²). At n = 1 MiB that is ~10¹² steps ≈ 14 minutes. It was BOTH a
 * test-speed problem AND a live ReDoS: `collectSurfaceFiles` deliberately never skips
 * an oversized surface, so a large shipped guide file with a long token run hung the
 * enforcer in production. The fix bounds the identifier to ≤128 chars, matching the
 * sibling regexes (`SURFACE_NODE_RUNS_RE` bounds `{0,80}`, `SURFACE_REQUIRES_RE`
 * `{0,64}`), making each failed start backtrack at most 128 times → linear.
 *
 * WHY A CHILD PROCESS. A synchronous CPU-bound regex CANNOT be interrupted by
 * `node --test`'s own per-test timeout — the timeout fires only between async ticks,
 * and a busy regex never yields. The ONLY way to make the RED a bounded failure
 * instead of a 14-minute hang (and to keep any future regression from hanging the
 * whole suite) is to run the scan in a child process with a hard kill timeout: a
 * child that does not exit within the ceiling is KILLED and the test FAILS. Post-fix
 * the scan costs about 0.35 s of CPU time at 1 MiB and about 0.72 s at 2 MiB (medians
 * of 10 runs, 2026-10-12, loadavg 15 to 19 on 18 cores), and the whole 2-MiB child
 * exits in about 0.75 s of wall-clock time, so the ceiling is never approached and the
 * green suite pays nothing.
 *
 * WHY CPU TIME AND A RATIO (2026-10-12). Two wall-clock bounds in this file failed
 * because of machine load, not because of the property they guard: the fixed 3-s bound
 * on the 2-MiB scan took 11 to 12 s at a load well above 70 on 18 cores, and the
 * old wall-clock ratio (`b < 3a + 400`) took about 2.2 s against about 0.8 s alone at a
 * load average of 20, because the load changes between the two runs it compares. A scan
 * waiting for a core is not a scan that costs more. So each child measures its own CPU
 * time (user + system) around `analyzeExports` alone, and the test bounds (a) the ratio
 * of the smallest 2-MiB scan to the smallest 1-MiB scan, and (b) each 2-MiB scan's CPU
 * time against the old 3000 ms. Linear gives a ratio near 2 and quadratic near 4; the
 * bound 2 * sqrt(2) is the geometric midpoint, the same factor away from both. The
 * smallest of three samples is used because load only ever adds CPU time, so the minimum
 * is the least load-biased estimate, and a real quadratic raises every sample, not one.
 * The real scan measured 1.97 to 2.10 over 10 runs. A quadratic cost injected into a copy,
 * equal to the whole linear scan at 1 MiB, measured 3.05 and failed this bound; a larger
 * one fails the 3000 ms bound first, which is why both are asserted. CPU time is not
 * fully load-free: in the full suite on 2026-10-12 it rose 1.3 to 1.5 times (enforcer
 * 252 ms, 2-MiB scan 0.94 to 0.96 s), so check a failure under heavy load against the
 * load first. The one bound that stays wall-clock is the 25-s kill: a busy synchronous
 * regex can only be stopped from outside, so a load heavier than the one that took a
 * 2-MiB scan 11 to 12 s could still kill a linear scan; the failure message then names
 * the load average.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REACH = path.resolve(__dirname, '..', 'src', 'lib', 'reachability.js');
const ROOT = path.resolve(__dirname, '..');
const EXPORT_BASELINE = path.join(ROOT, '.ctoc', 'export-reachability-baseline.json');
const FILE_BASELINE = path.join(ROOT, '.ctoc', 'reachability-baseline.json');

// Each 2-MiB scan's own CPU time (user + system, measured by the child around analyzeExports alone) must stay under
// 3000 ms: the number the wall-clock bound used, now in CPU time so machine load does not count against it. It catches
// a scan that stays linear while its cost per byte grows (a surface regex that backtracks a bounded but long way at
// every position), which the ratio cannot see.
const MAX_2MIB_CPU_MS = 3000;
// Hard wall-clock ceiling on each child: the hang guard. A busy synchronous regex in a child can be stopped only from
// outside, by a kill on a timer, so this one bound has to be wall-clock. Without load the 2-MiB child takes about
// 0.75 s (median of 5 runs on 2026-10-12, at a load average of 14 to 15 on 18 cores: below the core count, not an idle
// machine); at a load well above 70 on 18 cores it took 11 to 12 s (2026-10-12). Pre-fix the child is killed here,
// turning a 14-minute hang into a bounded ~25-s failure.
const HARD_TIMEOUT_MS = 25000;
const MiB = 1 << 20;
// Each scan's CPU time (user + system) is measured by the child itself around analyzeExports alone. CPU time, not
// wall-clock: under machine load a scan waits for a core, so waiting for a core does not count against it.
const RUNS_PER_SIZE = 3;
// Linear: doubling the input doubles the CPU time (ratio about 2). Quadratic: it quadruples it (about 4). The bound is
// the geometric midpoint 2 * sqrt(2), about 2.83, the same factor (sqrt(2)) away from both, because timing noise
// multiplies rather than adds.
const MAX_RATIO = 2 * Math.SQRT2;

/** Build a temp corpus whose only instruction surface is one single-char skills file. */
function makeSingleCharCorpus(sizeBytes) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reach-linear-'));
  fs.mkdirSync(path.join(root, 'skills'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills', 'huge.md'), 'a'.repeat(sizeBytes));
  return root;
}

/**
 * Run `analyzeExports(root)` in a child process, bounded by a hard kill timeout.
 * @returns {{ cpuMs: number|null, signal: string|null, status: number|null, error: string|null }}
 *   `cpuMs` is the child's own CPU time (user + system) for the scan alone: it excludes Node's start-up and the
 *   `require`. It is `null` when the child did not exit 0 without a signal or printed no figure. `error` is the
 *   spawn error code (`ETIMEDOUT` when the ceiling killed the child), or `null`.
 */
function runScanBounded(root) {
  const runner =
    'const { analyzeExports } = require(' + JSON.stringify(REACH) + ');' +
    'const c0 = process.cpuUsage();' +
    'const r = analyzeExports(process.argv[1]);' +
    'const c = process.cpuUsage(c0);' +
    'process.stdout.write("CPU_US=" + (c.user + c.system) + " SC=" + r.surfaceCalled.length);';
  const res = spawnSync(process.execPath, ['-e', runner, root], {
    timeout: HARD_TIMEOUT_MS,
    killSignal: 'SIGKILL',
    encoding: 'utf8',
    maxBuffer: 64 * MiB
  });
  let cpuMs = null;
  if (res.status === 0 && res.signal === null && typeof res.stdout === 'string') {
    // The whole output must be this one line. SC= (the number of call names the scan found) is printed so the
    // scan's result is used, not just timed.
    const m = res.stdout.match(/^CPU_US=(\d+) SC=\d+$/);
    if (m) cpuMs = Number(m[1]) / 1000;
  }
  return { cpuMs, signal: res.signal, status: res.status, error: res.error ? res.error.code : null };
}

/** The machine's load, for a failure message: a scan killed at the wall-clock ceiling may be load, not backtracking. */
function machineLoad() {
  return process.platform === 'win32'
    ? `Node reports no load average on Windows; ${os.cpus().length} cores`
    : `load average ${os.loadavg()[0].toFixed(1)} on ${os.cpus().length} cores`;
}

describe('the dead-export fence scans a surface in LINEAR time (ReDoS guard)', () => {
  it('doubling the input does not super-linearly increase the scan time', (t) => {
    const roots = { '1 MiB': makeSingleCharCorpus(1 * MiB), '2 MiB': makeSingleCharCorpus(2 * MiB) };
    const cpuMs = { '1 MiB': [], '2 MiB': [] };
    try {
      for (let run = 0; run < RUNS_PER_SIZE; run++) {
        for (const size of ['1 MiB', '2 MiB']) { // interleaved, so a change in load reaches both sizes alike
          const r = runScanBounded(roots[size]);
          assert.ok(r.error !== 'ETIMEDOUT',
            `the ${size} scan was killed at the ${HARD_TIMEOUT_MS} ms wall-clock ceiling (signal ${r.signal}). ` +
            'Either a surface regex backtracks super-linearly (the O(n^2) ReDoS in SURFACE_CALL_RE: bound the identifier ' +
            `quantifier) or the machine is too loaded for even a linear scan to finish (${machineLoad()}).`);
          assert.ok(r.signal === null,
            `the ${size} scan was ended by signal ${r.signal} before the ${HARD_TIMEOUT_MS} ms ceiling (spawn error ` +
            `${r.error}). Something outside the test stopped it; run it again.`);
          assert.ok(r.status === 0,
            `the ${size} scan crashed: the child exited with status ${r.status}${r.status === null ? ` (spawn error ${r.error})` : ''}. ` +
            'analyzeExports threw, or the runner could not load reachability.js; run the runner by hand on the same corpus ' +
            'to see the error.');
          assert.ok(r.cpuMs !== null,
            `the ${size} scan exited 0 but printed no CPU_US figure, so its CPU time is unknown and nothing can be bounded.`);
          cpuMs[size].push(r.cpuMs);
          if (size === '2 MiB') {
            assert.ok(r.cpuMs < MAX_2MIB_CPU_MS,
              `the 2-MiB scan used ${r.cpuMs.toFixed(1)} ms of CPU time, not under ${MAX_2MIB_CPU_MS} ms. The scan may ` +
              'still be linear, but its cost per byte grew: a surface regex is backtracking a bounded but long way at ' +
              'every position.');
          }
        }
      }
      // The smallest of each size's samples: load only ever adds CPU time, so the minimum is the least load-biased
      // estimate, and a real quadratic raises every sample. Every 2-MiB scan is still bounded above, one by one.
      const ratio = Math.min(...cpuMs['2 MiB']) / Math.min(...cpuMs['1 MiB']);
      t.diagnostic(`scan CPU ms, 1 MiB: ${cpuMs['1 MiB'].join(', ')}; 2 MiB: ${cpuMs['2 MiB'].join(', ')}; ` +
        `minimum ratio ${ratio.toFixed(2)} (bound ${MAX_RATIO.toFixed(2)})`);
      assert.ok(ratio < MAX_RATIO,
        `smallest CPU time of the 2-MiB scan over the smallest of the 1-MiB scan is ${ratio.toFixed(2)}, not under ${MAX_RATIO.toFixed(2)}: ` +
        'the scan grows super-linearly (linear is about 2, quadratic about 4). A surface regex is backtracking on a long run.');
    } finally {
      for (const root of Object.values(roots)) fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('SEMANTICS PRESERVED — the ≤128 bound drops no real call site', () => {
  it('real identifier( call sites are credited exactly; only a >128-char pathological token is not credited whole', () => {
    // Every real JavaScript identifier is far under 128 chars; the bound only ever
    // clips a pathological run. Prove the boundary directly: a short name, a name at
    // exactly the 128-char limit (still fully credited), and a 200-char run (whose
    // FULL form must NOT appear — pre-fix the unbounded regex credited it whole).
    const name128 = 'b'.repeat(128);
    const name200 = 'c'.repeat(200);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reach-sem-'));
    try {
      fs.mkdirSync(path.join(root, 'skills'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'skills', 'sem.md'),
        '# recipes\n' +
          'Run `shortCall(x)` then `snake_case_fn(y)` then `$dollar(z)`.\n' +
          'Edge: `' + name128 + '(q)` at the bound, and `' + name200 + '(q)` over it.\n'
      );
      const { analyzeExports } = require(REACH);
      const surface = new Set(analyzeExports(root).surfaceCalled);
      for (const real of ['shortCall', 'snake_case_fn', '$dollar', name128]) {
        assert.ok(surface.has(real), `a real ${real.length}-char call site must be credited; missing "${real.slice(0, 12)}…".`);
      }
      assert.ok(
        !surface.has(name200),
        'a 200-char pathological token must NOT be credited in full — the unbounded regex used to; the bound clips it.'
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('SEMANTICS PRESERVED — the real repo shows ZERO fence movement', () => {
  it('the dead-export set exactly equals the committed baseline (no real identifier dropped)', () => {
    const { analyzeExports } = require(REACH);
    const baseline = JSON.parse(fs.readFileSync(EXPORT_BASELINE, 'utf8'));
    const result = analyzeExports(ROOT);
    // The kill claim: bounding the identifier must not change WHICH exports are dead.
    // If the bound dropped any real call site, some export would flip to dead and this
    // deep-equal would fail — a direct, independent proof of preserved semantics.
    assert.deepEqual(
      [...result.dead].sort(),
      [...baseline.dead].sort(),
      'the dead-export set moved — the ≤128 bound changed which real call sites are credited. ' +
        'That means the bound is wrong (a real identifier exceeded it); do not adjust the baseline.'
    );
    assert.equal(result.dead.length, baseline.maxDead,
      `dead-export count ${result.dead.length} != baseline maxDead ${baseline.maxDead}.`);
  });

  it('the file-reachability set is unmoved too (the surface scan feeds live-root detection)', () => {
    const { analyze } = require(REACH);
    const baseline = JSON.parse(fs.readFileSync(FILE_BASELINE, 'utf8'));
    const result = analyze(ROOT);
    assert.equal(result.readErrors.length, 0, 'analyze() must read every input it judges.');
    assert.deepEqual(
      [...result.unreachable].sort(),
      [...baseline.unreachable].sort(),
      'the unreachable-file set moved — bounding a surface regex changed which files count as roots.'
    );
  });
});
