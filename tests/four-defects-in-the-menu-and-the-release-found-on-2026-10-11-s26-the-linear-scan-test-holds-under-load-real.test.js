'use strict';

/**
 * THE DEAD-EXPORT FENCE'S SURFACE SCAN IS LINEAR: the timing check (a ReDoS guard).
 *
 * WHY. In July 2026 an unbounded identifier quantifier in SURFACE_CALL_RE
 * (src/lib/reachability.js) made the surface scan quadratic: about 14 minutes on a 1-MiB
 * run of one letter, and a live ReDoS. tests/reachability-surface-scan-is-linear.test.js
 * keeps that history and the semantic checks of the fix. This file checks that the scan
 * stays linear, through the helper in tests/helpers/ whose name is this file's name without
 * "-real.test.js"; that helper's header gives the measure's design, what it times and what
 * it does not see. The cases that prove the measure fails a super-linear scan are in the
 * file whose name has "-controls" in place of "-real".
 *
 * WHY A CHILD PROCESS. A synchronous CPU-bound regex CANNOT be interrupted by
 * `node --test`'s own per-test timeout — the timeout fires only between async ticks,
 * and a busy regex never yields. The ONLY way to make the RED a bounded failure
 * instead of a 14-minute hang (and to keep any future regression from hanging the
 * whole suite) is to run the scan in a child process with a hard kill timeout: a
 * child that does not exit within the ceiling is KILLED and the test FAILS. Post-fix
 * the scan costs about 0.35 s of CPU time per MiB (medians of 10 runs, 2026-10-12,
 * loadavg 15 to 19 on 18 cores), so a child that scans 4 MiB in all used about 1.4 s of
 * CPU time then. On 2026-10-17 (the 4-MiB children of the mechanism probe at ambient
 * load) a 4-MiB child used about 1 s of CPU time and its timed scan took about 0.9 s of
 * wall-clock time alone. The 50-s kill is therefore approached only at a wall-clock
 * time about 55 times that (50 s / 0.9 s). The check is not free:
 * this file took 11.7 s alone at ambient load (three runs, 11.6 to 11.8 s).
 * Inside the whole suite (node --test tests/*.test.js, 584 files) at a per-file concurrency of 17 and ambient load on 2026-10-18 this file took 14.8 s (10th of the files by duration; the longest file, hotfix-check-corpus, took 41.7 s). Run with the suite under 72 busy-loop worker processes (4 x 18 cores, each worker starting 150 to 600 ms busy children back to back; load average 31 at the start, 116 at the end), the suite took 172 s and this file's case took 112.6 s inside it; alone under the same load the file took 84 s.
 *
 * WHY IT WAS REBUILT (2026-10-13). The ratio check of 2026-10-12 failed under load again
 * in another worktree. The cause is supported by the code, not reproduced: 55 runs of the
 * old case (10 at ambient load, 30 in batches loaded from the start by short busy processes
 * or by concurrent scans, 15 with the load started after the first child returned) all
 * passed, with ratios 1.92 to 2.53 against the bound 2.83. The most contended batches (all
 * fresh-4x) ran 72 busy workers on 18 cores (median wall-clock to CPU time of the meter's
 * scans 7.6 to 7.9, load average 21 to 131) and inflated the CPU time of a scan 1.25 to 1.29 times at the median and
 * 1.37 times at most; the old case needs 1.35 to 1.44 times on its 2-MiB samples alone. This
 * check's fitted exponent was 0.99 to 1.01 at ambient load and 0.99 to 1.04 under all three
 * load kinds, mid-case runs included (30 runs; bound 1.25), at load averages from 15 to 131.
 *
 * RUN TIME. 12 children. WORST CASE: each stopped just short of the 50-s kill,
 * 12 * 50 s = 10 minutes, against the 300 s that push and the hotfix check allow the whole
 * of `npm test` (src/lib/quality-agent.js), the 900 s per command of the menu's completion
 * check (src/lib/step-13-verify.js) and an agent's 10-minute foreground command.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { MAX_EXPONENT, measureScaling, machineLoad } = require(
  './helpers/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load');

describe('the dead-export fence scans a surface in LINEAR time (ReDoS guard)', () => {
  it('doubling the input does not super-linearly increase the scan time', (t) => {
    const { exponent, smallest } = measureScaling(t, 'real scan', null);
    assert.ok(exponent < MAX_EXPONENT,
      `the scan's cost per scan grows as size^${exponent.toFixed(2)} from 256 KiB to 4 MiB (smallest CPU ms per scan ` +
      `${smallest.map((ms) => ms.toFixed(1)).join(', ')}), not under size^${MAX_EXPONENT}: linear is about 1, and a ` +
      'quadratic part as large as the linear scan at 1 MiB fits 1.5. A surface regex is backtracking further as the ' +
      `input grows (${machineLoad()}).`);
  });
});
