'use strict';

/**
 * THE LINEAR-SCAN MEASURE FAILS A SUPER-LINEAR SCAN: the controls of the timing check, and of the hotfix-check timing helper.
 *
 * The file whose name has "-real" in place of "-controls" fits an exponent to the real
 * scan's CPU time, through the helper in tests/helpers/ whose name is this file's name
 * without "-controls.test.js". Such a measure can go blind (a runner that timed nothing, or
 * only a fixed cost, prints about the same figure for every child, and equal work turns
 * that into a perfect linear verdict) or be loosened; either would let the real check pass
 * anything. So these two cases run on every run, on every platform. Each hands the same
 * measure a scan injected inside its own children (the call regex swapped for one with a
 * window of 24, which also scans size * size / 1 MiB more characters once per scan; every
 * other regex returns its no-match result there without running) and asserts that the
 * measure fails it. One scan's quadratic part equals its call regex pass at 1 MiB, about
 * the linear scan: measured quadratic-to-linear ratio 1.035 at 1 MiB
 * (2026-10-17), so it is 0.035 stronger than a quadratic part equal to the linear scan,
 * worth at most 0.021 in the fit; fitted exponent 1.47 to 1.51 over 23 runs at ambient
 * load and under load (bound 1.25). The other is purely quadratic: fitted exponent 1.93 to
 * 1.97 over 19 runs.
 * No source file is changed.
 *
 * The second describe, further down, holds the timing helper `growth` of tests/helpers/hotfix-check-harness.js to both
 * sides, in four cases: a linear reader passes (and each batch is timed at the platform's batch length: 160 ms on Windows, 40 ms elsewhere), a quadratic reader fails the
 * bound of 8, a linear reader that waits without using the processor passes, and an asynchronous call is refused.
 *
 * RUN TIME. The 24 children of the two scan cases, none longer than the real check's, took 12.7 s alone on 2026-10-17
 * (three runs, 12.6 to 12.8 s) and 5 to 12 s each case on 2026-10-18 under a load average of 40 to 115 on 18 cores. The
 * four helper cases took 7 to 8 s, 15 s, 11 s and under 0.1 s on 2026-10-18 (three runs of the file at a load average of
 * 47 to 115: 47.6, 51.5 and 46.5 s) were measured with a batch of 160 ms on every platform; the batch is now 40 ms except on
 * Windows (see the plan's "Batch length per platform"). A helper case cannot be shorter than its bound: 5 runs of a batch at
 * the larger size, which is 4 times as long for a linear reader and 16 times for a quadratic one (5 * 16 * 160 ms = 12.8 s
 * on Windows, a quarter of that elsewhere).
 * Inside the whole suite (node --test tests/*.test.js, 584 files) at a per-file concurrency of 17 and ambient load on 2026-10-18 this file took 26.1 s (7th of the files by duration; the longest file, hotfix-check-corpus, took 41.7 s). Run with the suite under 72 busy-loop worker processes (4 x 18 cores, each worker starting 150 to 600 ms busy children back to back; load average 31 at the start, 116 at the end), the suite took 172 s and this file's case took 113.0 s for the two injected cases inside it; alone under the same load the file took 146 s.
 * WORST CASE. The scan children, each stopped just short of the 50-s kill: 24 * 50 s = 20 minutes. The helper cases have no kill; a
 * call over 5 s fails at its sizing, and the readers here are sized by the machine, so on a machine ten times slower than this
 * one they take about ten times as long (about 6 minutes). The budget: the 300 s that push and the hotfix check allow the
 * whole of `npm test`, the 900 s per command of the menu's completion check and an agent's 10-minute foreground command.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { MAX_EXPONENT, SURFACE_CALL_SOURCE, INJECTED_SOURCE, measureScaling } = require(
  './helpers/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load');

describe('the linear-scan measure fails a super-linear scan (the controls of the ReDoS guard)', () => {
  it('the measure fails a scan whose quadratic part equals its call regex pass at 1 MiB', (t) => {
    // Inside each child only, SURFACE_CALL_RE is swapped for the call regex with a window of 24 (INJECTED_SOURCE), which
    // makes its own pass and, once per scan, scans size * size / 1 MiB more characters: a quadratic part equal to its own
    // pass at 1 MiB. Every other regex of the scan returns its no-match result without running; the two reads and the
    // walks add only to the linear side, so this quadratic part is at most the linear scan at 1 MiB when an extra pass
    // costs what the first does (the ratio Step 8 measured is in this file's header). A quadratic part equal to the
    // linear scan fits exactly 1.5 over these sizes, and a smaller one or a larger fixed cost per scan only lowers the
    // fit, so at a ratio of at most 1 this case is never easier to fail than that one, which the ratio check of
    // 2026-10-12 failed (3.02 to 3.09 against 2.83). No source file is changed.
    const { exponent, smallest } = measureScaling(t, 'sensitivity scan',
      { from: SURFACE_CALL_SOURCE, to: INJECTED_SOURCE, linear: true, quadratic: true, skipOthers: true });
    assert.ok(exponent >= MAX_EXPONENT,
      `a scan whose quadratic part equals its call regex pass at 1 MiB measured size^${exponent.toFixed(2)} (smallest ` +
      `CPU ms per scan ${smallest.map((ms) => ms.toFixed(1)).join(', ')}), under size^${MAX_EXPONENT}: this measure no ` +
      'longer fails a quadratic part as large as the linear scan at 1 MiB, so the real-scan check can let one through.');
  });

  it('the measure fails a deliberately quadratic scan', (t) => {
    // The same swap without the regex's own pass: the call regex's whole cost is the size * size / 1 MiB characters it
    // scans once per scan, so the scan's cost grows as the square of the input, the way the unbounded regex of July 2026
    // did, slowly enough to finish. No source file is changed.
    const { exponent, smallest } = measureScaling(t, 'quadratic scan',
      { from: SURFACE_CALL_SOURCE, to: INJECTED_SOURCE, linear: false, quadratic: true, skipOthers: true });
    assert.ok(exponent >= MAX_EXPONENT,
      `a deliberately quadratic scan measured size^${exponent.toFixed(2)} (smallest CPU ms per scan ` +
      `${smallest.map((ms) => ms.toFixed(1)).join(', ')}), under size^${MAX_EXPONENT}: this measure no longer tells a ` +
      'quadratic scan from a linear one, so the real-scan check proves nothing.');
  });
});

// THE HOTFIX-CHECK TIMING HELPER (the owner's grant of 2026-10-18, scope request 1792265363409-6ya9r1).
// `growth` in tests/helpers/hotfix-check-harness.js times finding 2c and round 9 of the hotfix check; it measured the
// wall clock until 2026-10-18 and failed a linear reader at 12.5 times against the bound of 8 under the full suite's
// load. It now measures this process's own processor time per batch of calls. These cases hold the helper to both
// sides: other processes' load does not fail a linear reader, and a quadratic reader still fails the bound.
const { growth } = require('./helpers/hotfix-check-harness');

let sink = 0;
/** Work of the given number of steps; the sink keeps the loop from being compiled away, and every product stays under 2^31 so that a long loop is as fast per step as a short one. */
function spin(steps) {
  let s = sink;
  for (let i = 0; i < steps; i++) s = (s * 31 + i) % 1000003;
  sink = s;
}
/** Waits without using the processor, the way a process that is waiting for a core does. */
function idle(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

describe('the hotfix-check timing helper measures processor time, not the wall clock', () => {
  it('passes a linear reader (a ratio near 4, under the bound of 8)', async () => {
    const { ratio, small } = await growth((n) => () => spin(n * 2000), 8192, 100000);
    assert.ok(ratio < 8, `a linear reader measured ${ratio.toFixed(1)} times as long`);
    // The default cost times each batch at CPU_TIMED_MS: 160 ms on Windows (about 10 ticks of its 15.6-ms clock, where a batch of 40 ms
    // is 2.5 ticks, which a minimum of five readings can favour by up to 1.5 times) and 40 ms elsewhere, whose clock ticks in microseconds.
    // The batch must reach about three quarters of that length.
    const least = process.platform === 'win32' ? 120 : 30;
    assert.ok(small >= least, `a batch was timed at ${small.toFixed(1)} ms of processor time, under ${least} ms`);
  });

  it('fails a quadratic reader (a ratio near 16, at the bound of 8 or over)', async () => {
    const { ratio, small, big } = await growth((n) => () => spin(n * n * 20), 512, 512);
    assert.ok(ratio >= 8, `a quadratic reader measured ${ratio.toFixed(1)} times as long (${small.toFixed(1)} ms, ${big.toFixed(1)} ms)`);
  });

  it('does not count time spent waiting for a core: a linear reader that waits 1.5 times its own spin at four times the size passes', async () => {
    // Waiting costs no processor time; this is what the full suite's load did to the larger runs, on the wall clock. The limit of 100
    // keeps the size at 16 and the larger input at 64. The call waits only at 64, for 1.5 times as long as its own spin took, so the
    // wall clock reads about 10 times as long (4 spins + 6 spins of waiting, over one) and the processor about 4; a wait that
    // tracks the spin keeps this machine-independent and the case short, where a fixed wait grew to 2 s a call.
    const { ratio, small, big } = await growth((n) => () => {
      const from = performance.now();
      spin(n * 1e6);
      if (n > 16) idle(1.5 * (performance.now() - from));
    }, 16, 100);
    assert.ok(ratio < 8, `waiting was counted: ${ratio.toFixed(1)} times as long (${small.toFixed(1)} ms, ${big.toFixed(1)} ms)`);
  });

  it('refuses an asynchronous call: the default cost would time it only up to its first await', async () => {
    await assert.rejects(growth((n) => async () => spin(n * 2000), 8192, 100000), /asynchronous|promise/i);
  });
});
