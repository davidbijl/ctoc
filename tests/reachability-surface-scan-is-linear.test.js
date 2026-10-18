'use strict';

/**
 * THE DEAD-EXPORT FENCE'S SURFACE SCAN — the semantic checks of its ReDoS fix.
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
 * WHERE THE TIMING CHECK IS (2026-10-14). The check that this scan stays linear is in
 * tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-real.test.js,
 * and the two cases that prove its measure fails a super-linear scan are in
 * tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-controls.test.js,
 * both measuring through
 * tests/helpers/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load.js.
 * They moved out of this file so that it holds only the semantic checks below: the
 * agent-and-skill improvement program runs it for every file of its inventory, three rounds
 * each, and the timing cases were about 82% (it took 2.7 to 2.8 s alone, the trimmed file takes 0.5 s) of
 * its run time. This file now runs in 0.5 s alone at ambient load (three runs); its time inside the whole suite was not measured.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REACH = path.resolve(__dirname, '..', 'src', 'lib', 'reachability.js');
const ROOT = path.resolve(__dirname, '..');
const EXPORT_BASELINE = path.join(ROOT, '.ctoc', 'export-reachability-baseline.json');
const FILE_BASELINE = path.join(ROOT, '.ctoc', 'reachability-baseline.json');

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
