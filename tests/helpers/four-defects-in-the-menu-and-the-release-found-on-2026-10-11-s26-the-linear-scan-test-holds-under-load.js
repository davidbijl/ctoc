'use strict';

/**
 * THE MEASURE OF THE LINEAR-SCAN TIMING CHECK (2026-10-14), shared by two test files: the
 * files in tests/ whose names are this file's name with "-real.test.js" and with
 * "-controls.test.js" in place of ".js". The first times the dead-export fence's real
 * surface scan with it; the second hands it two injected scans of known shape and asserts
 * that it fails them. Both run this code, so the controls prove the very measure the real
 * check uses, and both read the one MAX_EXPONENT. Not named *.test.js and not directly in
 * tests/, so `npm test` never runs it as a test file and the documented test-file count
 * does not count it. Unlike the other helpers here it asserts: the checks on each child are
 * part of the measure, and both files must run the same ones.
 *
 * WHY CPU TIME (2026-10-12). Two wall-clock bounds of the timing check failed because of
 * machine load, not because of the property they guard: the fixed 3-s bound on the 2-MiB
 * scan took 11 to 12 s at a load well above 70 on 18 cores, and a wall-clock ratio took
 * about 2.2 s against about 0.8 s alone at a load average of 20. A scan waiting for a core
 * is not a scan that costs more, so each child measures its own CPU time (user + system)
 * around its timed scans, and the 3000-ms bound on each 2-MiB scan is in CPU time.
 *
 * WHY EQUAL WORK AND A FITTED EXPONENT OVER FOUR SIZES (2026-10-13). CPU time is still a
 * time, not a count of work: under load the same scan costs more of it (in the full suite
 * on 2026-10-12 a 2-MiB scan took 0.94 to 0.97 s against about 0.72 s alone, 1.3 times,
 * and one 2-MiB child took 1.19 s against 0.73 to 0.75 s for its neighbours, 1.6 times).
 * The check of 2026-10-12 divided the smallest of three 2-MiB scans by the smallest of
 * three 1-MiB scans and bounded the ratio at 2 * sqrt(2): one size inflated 1.41 times
 * failed a linear scan. Now every child scans the same 4 MiB (the 4-MiB corpus once, the
 * 2-MiB corpus twice, down to the 256-KiB corpus sixteen times), after sixteen untimed
 * warm-up scans of a 4-KiB corpus and a garbage collection, so for a linear scan every
 * child does the same work for the same time and load reaches every size alike. The
 * measure fits the exponent b of cost per scan = a * size^b by least squares to the
 * smallest of three samples at each of four sizes, 256 KiB, 512 KiB, 2 MiB and 4 MiB
 * (1 MiB would weigh exactly 0 in the fit), and the bound is 1.25. A linear scan fits 1, a
 * pure quadratic 2, and a quadratic part equal to the linear scan at 1 MiB exactly 1.5;
 * 1.25 is the midpoint. The smallest and largest sizes weigh 0.2 in the fit, so one size
 * inflated 1.6 times moves it by at most 0.14, leaving 0.11 on each side. A linear scan
 * fails only when its 4-MiB size is inflated 2.38 times against the others
 * (2^(0.25 / 0.2)), its two largest sizes 1.78 times each (2^(0.25 / 0.3)), or a single
 * 2-MiB child is slowed about 4.2 times, against the 3000-ms bound, which reads every
 * 2-MiB child and no minimum (3000 / 710). Rounds 1 and 2 run 512 KiB, 4 MiB, 256 KiB,
 * 2 MiB and round 3 the reverse, so a spell of load
 * that starts or stops partway through a case moves the fit by at most 0.1 * log2 of its
 * inflation.
 *
 * WHAT IT TIMES, AND WHAT IT DOES NOT SEE. It times the scan of one input, a run of one
 * letter, on which only the call regex, SURFACE_CALL_RE, does real work: the other four
 * surface regexes each begin with a word (`node`, `require`) that never occurs in it, so
 * they fail at the first character of every position. A super-linear change to any other
 * surface regex, or one that needs another input, is therefore not seen (a change that
 * removed one of those leading words would run on this input, and could be). Of the call
 * regex on this input, the fit does not see a quadratic part under 0.293 times the linear
 * scan at 1 MiB (1.17 times it at 4 MiB), or under 0.59 times when load inflates the
 * 256-KiB size 1.6 times; the 3000-ms bound fails one from about 1.6 times. The ratio check
 * of 2026-10-12 failed from 0.71 times, and with its 1-MiB size so inflated from none below
 * 1.6 times.
 *
 * THE ONE WALL-CLOCK BOUND is the kill, 50 s: a busy synchronous regex can only be stopped
 * from outside. It was 25 s for a child that scanned 2 MiB; each child now scans 4 MiB. A
 * load heavier than the one that took a 2-MiB scan 11 to 12 s could still kill a linear
 * child; the failure message then names the load average. A child gets near the kill only
 * at a wall-clock time about 55 times the 0.9 s its timed scan takes alone (50 s / 0.9 s;
 * the real-scan file's header shows the arithmetic).
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REACH = path.resolve(__dirname, '..', '..', 'src', 'lib', 'reachability.js');

const KiB = 1 << 10;
const MiB = 1 << 20;
// Each 2-MiB scan's own CPU time (user + system, measured by the child around its timed scans; a 2-MiB child runs two,
// and its CPU time is divided by two) must stay under 3000 ms: the number the wall-clock bound used, in CPU time so
// machine load does not count against it. It catches a scan that stays linear while its cost per byte grows (a surface
// regex that backtracks a bounded but long way at every position), which the exponent cannot see.
const MAX_2MIB_CPU_MS = 3000;
// Hard wall-clock ceiling on each child: the hang guard. A busy synchronous regex in a child can be stopped only from
// outside, by a kill on a timer, so this one bound has to be wall-clock. It was 25 s for a child that scanned 2 MiB:
// about 0.75 s alone (median of 5 runs, 2026-10-12, at a load average of 14 to 15 on 18 cores: below the core count, not
// an idle machine), 11 to 12 s at a load well above 70 on 18 cores. Every child now scans 4 MiB, so the ceiling doubles
// with the work and keeps that margin over a linear child. It removes no check: a child the old ceiling would have killed
// and this one lets finish is measured instead, and a per-byte slowdown of more than about four times fails the 3000-ms
// bound while growth faster than size^MAX_EXPONENT fails the fit. Pre-fix the first child (512 KiB, eight scans of
// about 3.5 minutes each, a quarter of the 14 minutes at 1 MiB) is killed here, turning a 14-minute hang into a bounded
// 50-s failure.
const HARD_TIMEOUT_MS = 50000;
// The input sizes, a factor of 16 from the smallest to the largest. 1 MiB is left out: its log2 is the mean of these
// four, so its weight in the fitted slope would be exactly 0, and its three children per case would move nothing.
const SIZES = [256 * KiB, 512 * KiB, 2 * MiB, 4 * MiB];
// Every child scans the same 4 MiB in total: the 4-MiB corpus once, the 2-MiB corpus twice, the 512-KiB corpus eight
// times, the 256-KiB corpus sixteen times. A linear scan then costs every child the same CPU time with the same
// allocations, so machine load, which only ever adds CPU time and adds more to a longer child, reaches every size alike.
// A size's cost per scan is its child's CPU time divided by its number of scans.
const SCANNED_PER_CHILD = 4 * MiB;
// Children per size: one in each round.
const RUNS_PER_SIZE = 3;
// The order of the sizes in each round, as indexes into SIZES: rounds 1 and 2 run 512 KiB, 4 MiB, 256 KiB, 2 MiB, and
// round 3 the reverse. A size's estimate is the smallest of its three samples, so a spell of load moves the fit only
// through the sizes whose every sample it covers. In this order those always form one stretch running to the end of
// round 1, and the fit weighs every such stretch 0, +0.1 or -0.1 in total: a spell that inflates every child it covers
// f times moves the fit by at most 0.1 * log2(f), 0.07 at f = 1.6.
const ROUND_ORDERS = [[1, 3, 0, 2], [1, 3, 0, 2], [2, 0, 3, 1]];
// The bound on the fitted exponent b of cost per scan = a * size^b over these sizes. A linear scan fits 1 and a pure
// quadratic 2; a scan whose quadratic part equals its linear part at 1 MiB (cost n + n^2 / 1 MiB) fits exactly 1.5.
// 1.25 is the midpoint, 0.25 from each. The smallest and largest sizes each weigh 0.2 in the fit, so load that inflates
// one size 1.6 times, the worst seen on 2026-10-12, moves it by at most 0.2 * log2(1.6) = 0.14, leaving 0.11 on each side.
const MAX_EXPONENT = 1.25;
// Before its timed scans each child scans a corpus this small WARM_UP_SCANS times, untimed. A cost paid once per child
// cannot tilt the real scan's fit: every child does the same 4 MiB of work, so such a cost adds the same share to every
// size. What can tilt it is a first run whose cost grows with its input: if V8 first ran a regex in its bytecode
// interpreter and compiled it to native code only later, that slower pass would be all of the 4-MiB child's timed work
// but a sixteenth of the 256-KiB child's, and would raise the fit. Sixteen untimed scans, as many as the 256-KiB child
// times, run every regex and every function of the scan sixteen times before any timing starts.
const WARM_UP_BYTES = 4 * KiB;
const WARM_UP_SCANS = 16;
// The exit status of a child that finds no gc(); none of Node's documented exit statuses.
const GC_MISSING_STATUS = 20;
// The regex calls one scan of a run of one letter makes besides the call regex: SURFACE_NODE_RUNS_RE and
// SURFACE_REQUIRES_RE in liveRoots, SURFACE_REQUIRE_DOT_RE and SURFACE_REQUIRE_IDX_RE in surfaceCalledNames
// (src/lib/reachability.js), each called once and finding no match, because each begins with a word (`node`, `require`)
// that never occurs in that text. Inside their children the two injected cases return that no-match result without
// running them, so the controls time the call regex alone, and they count those calls: a scan that makes any other
// number of them fails both injected cases loudly.
const OTHER_EXECS_PER_SCAN = 4;

/** The source text of the call regex with an identifier of at most `window` characters after its first. */
function callRegexSource(window) {
  return '([A-Za-z_$][A-Za-z0-9_$]{0,' + window + '})\\s*\\(';
}
// The source text of SURFACE_CALL_RE (src/lib/reachability.js line 654). The two injected cases swap that one regex
// inside their children; a child that never meets it reports no swap and fails its case, so a change to the regex is
// loud here.
const SURFACE_CALL_SOURCE = callRegexSource(127);
// What the injected cases run in its place: the call regex with a window of 24, a pass about a fifth as costly as the
// real one (25 characters to give back at each position against 128), so that the sensitivity case's 4-MiB scan, 20 MiB
// of passes, costs about what a real child's 4 MiB do.
const INJECTED_SOURCE = callRegexSource(24);

/**
 * Build a temporary corpus whose only instruction surface is one file of `sizeBytes` copies of the letter `a`. The
 * folder joins `made` as soon as it exists, before anything is written into it, so the caller's `finally` removes it
 * even when the write fails.
 * @param {number} sizeBytes
 * @param {string[]} made - the folders the caller removes in its `finally`
 * @returns {string} the corpus folder
 */
function makeSingleCharCorpus(sizeBytes, made) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reach-linear-'));
  made.push(root);
  fs.mkdirSync(path.join(root, 'skills'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills', 'huge.md'), 'a'.repeat(sizeBytes));
  return root;
}

/** The machine's load, for a failure message: a scan killed at the wall-clock ceiling may be load, not backtracking. */
function machineLoad() {
  return process.platform === 'win32'
    ? `Node reports no load average on Windows; ${os.cpus().length} cores`
    : `load average ${os.loadavg()[0].toFixed(1)} on ${os.cpus().length} cores`;
}

/** A size in words, for messages. */
function sizeName(bytes) {
  return bytes >= MiB ? `${bytes / MiB} MiB` : `${bytes / KiB} KiB`;
}

/**
 * The child's program. Its arguments: the measured corpus, the warm-up corpus, the number of timed scans. With a swap
 * (the two injected cases, and Step 8's variants) it replaces RegExp.prototype.exec inside the child: a call on the
 * regex whose source is `swap.from` runs the regex `swap.to` instead, and the swaps of the timed scans are counted. With
 * `swap.skipOthers`, a call on any other regex returns null with lastIndex 0, without running, and is counted: on a run
 * of one letter those are the four regexes OTHER_EXECS_PER_SCAN names, and null with lastIndex 0 is what each returns
 * there; without it, every other regex runs as before. With `swap.quadratic`, at a scan's first call (lastIndex 0) `to`
 * scans text.length * text.length / MiB characters of the text, as whole passes and one pass that starts that many
 * characters before the end: one pass at 1 MiB, four at 4 MiB, the last 64 KiB at 256 KiB. With `swap.linear`, `to` then
 * makes the regex's own pass from lastIndex; without it the call returns null, which is what the real regex returns on
 * this corpus.
 * @param {{ from: string, to: string, linear: boolean, quadratic: boolean, skipOthers: boolean } | null} swap
 * @returns {string}
 */
function runnerProgram(swap) {
  return [
    `const { analyzeExports } = require(${JSON.stringify(REACH)});`,
    'const [root, warmRoot, callsText] = process.argv.slice(1);',
    'const calls = Number(callsText);',
    `const swap = ${JSON.stringify(swap)};`,
    `const MiB = ${MiB};`,
    'let swapped = 0;',
    'let skipped = 0;',
    'if (swap) {',
    '  const exec = RegExp.prototype.exec;',
    "  const to = new RegExp(swap.to, 'g');",
    '  RegExp.prototype.exec = function (text) {',
    '    if (this.source !== swap.from) {',
    '      if (!swap.skipOthers) return exec.call(this, text);',
    '      skipped++;',
    '      this.lastIndex = 0;',
    '      return null;',
    '    }',
    '    swapped++;',
    '    if (swap.quadratic && this.lastIndex === 0) {',
    '      for (let left = text.length * text.length / MiB; left > 0; left -= text.length) {',
    '        to.lastIndex = Math.max(0, text.length - left);',
    '        exec.call(to, text);',
    '      }',
    '    }',
    '    if (!swap.linear) {',
    '      this.lastIndex = 0;',
    '      return null;',
    '    }',
    '    to.lastIndex = this.lastIndex;',
    '    const m = exec.call(to, text);',
    '    this.lastIndex = to.lastIndex;',
    '    return m;',
    '  };',
    '}',
    "if (typeof globalThis.gc !== 'function') {",
    `  process.exitCode = ${GC_MISSING_STATUS};`,
    '} else {',
    `  for (let i = 0; i < ${WARM_UP_SCANS}; i++) analyzeExports(warmRoot);`,
    '  swapped = 0;',
    '  skipped = 0;',
    '  globalThis.gc();',
    '  const c0 = process.cpuUsage();',
    '  let sc = 0;',
    '  for (let i = 0; i < calls; i++) sc += analyzeExports(root).surfaceCalled.length;',
    '  const c = process.cpuUsage(c0);',
    "  process.stdout.write('CPU_US=' + (c.user + c.system) + ' CALLS=' + calls + ' SC=' + sc + ' SWAPPED=' + swapped +",
    "    ' SKIPPED=' + skipped);",
    '}'
  ].join('\n');
}

/**
 * Run one child: WARM_UP_SCANS untimed warm-up scans, a garbage collection, then `calls` timed scans of `root`, bounded
 * by a hard kill timeout.
 * @param {string} root - the measured corpus
 * @param {string} warmRoot - the warm-up corpus
 * @param {number} calls - the number of timed scans
 * @param {{ from: string, to: string, linear: boolean, quadratic: boolean, skipOthers: boolean } | null} swap - an
 *   injected case's swap, or null
 * @returns {{ cpuMs: number|null, swapped: number|null, skipped: number|null, signal: string|null,
 *   status: number|null, error: string|null }}
 *   `cpuMs` is the child's own CPU time (user + system) for its timed scans together: it excludes Node's start-up, the
 *   `require`, the warm-up scans and the garbage collection. It is `null` when the child did not exit 0 without a signal,
 *   printed anything but its one line, or reported another number of scans. `swapped` and `skipped` are the timed scans'
 *   swapped and skipped regex calls. `error` is the spawn error code (`ETIMEDOUT` when the ceiling killed the child), or
 *   `null`.
 */
function runScanBounded(root, warmRoot, calls, swap) {
  const res = spawnSync(process.execPath, ['--expose-gc', '-e', runnerProgram(swap), root, warmRoot, String(calls)], {
    timeout: HARD_TIMEOUT_MS,
    killSignal: 'SIGKILL',
    encoding: 'utf8',
    maxBuffer: 64 * MiB
  });
  let cpuMs = null;
  let swapped = null;
  let skipped = null;
  if (res.status === 0 && res.signal === null && typeof res.stdout === 'string') {
    // The whole output must be this one line. SC= (the call names the scans found) is printed so the scans' result is
    // used, not just timed.
    const m = res.stdout.match(/^CPU_US=(\d+) CALLS=(\d+) SC=\d+ SWAPPED=(\d+) SKIPPED=(\d+)$/);
    if (m && Number(m[2]) === calls) {
      cpuMs = Number(m[1]) / 1000;
      swapped = Number(m[3]);
      skipped = Number(m[4]);
    }
  }
  return { cpuMs, swapped, skipped, signal: res.signal, status: res.status, error: res.error ? res.error.code : null };
}

/**
 * The least-squares slope of log2(cost) on log2(size): the exponent b in cost = a * size^b.
 * @param {number[]} sizes
 * @param {number[]} costs - positive and finite, one per size
 * @returns {number}
 */
function fitExponent(sizes, costs) {
  const xs = sizes.map((size) => Math.log2(size));
  const ys = costs.map((cost) => Math.log2(cost));
  const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  return sxy / sxx;
}

/**
 * Measure how the scan's cost per scan grows with its input: RUNS_PER_SIZE rounds, each running one child per size in
 * the order ROUND_ORDERS gives. Every child is checked as soon as it returns, so a hang costs one kill, not twelve.
 * @param {{ diagnostic: (message: string) => void }} t - the test context
 * @param {string} label - the first words of the diagnostic line
 * @param {{ from: string, to: string, linear: boolean, quadratic: boolean, skipOthers: boolean } | null} swap - an
 *   injected case's swap, or null for the real scan
 * @returns {{ exponent: number, smallest: number[] }} the fitted exponent, and each size's smallest CPU ms per scan
 */
function measureScaling(t, label, swap) {
  const made = [];
  const perScanMs = SIZES.map(() => []);
  try {
    const warmRoot = makeSingleCharCorpus(WARM_UP_BYTES, made);
    const roots = SIZES.map((size) => makeSingleCharCorpus(size, made));
    for (let run = 0; run < RUNS_PER_SIZE; run++) {
      for (const i of ROUND_ORDERS[run]) {
        const size = SIZES[i];
        const name = sizeName(size);
        const calls = SCANNED_PER_CHILD / size;
        const r = runScanBounded(roots[i], warmRoot, calls, swap);
        assert.ok(r.error !== 'ETIMEDOUT',
          `the ${name} child (${calls} scans) was killed at the ${HARD_TIMEOUT_MS} ms wall-clock ceiling (signal ` +
          `${r.signal}). Either a surface regex backtracks super-linearly (the O(n^2) ReDoS in SURFACE_CALL_RE: bound ` +
          `the identifier quantifier) or the machine is too loaded for even a linear scan to finish (${machineLoad()}).`);
        assert.ok(r.signal === null,
          `the ${name} child was ended by signal ${r.signal} before the ${HARD_TIMEOUT_MS} ms ceiling (spawn error ` +
          `${r.error}). Something outside the test stopped it; run it again.`);
        assert.ok(r.status !== GC_MISSING_STATUS,
          `the ${name} child exited with status ${GC_MISSING_STATUS}: node exposed no gc() although the child was ` +
          'started with --expose-gc, so garbage collection could not be moved out of the timed scans.');
        assert.ok(r.status === 0,
          `the ${name} child crashed: it exited with status ${r.status}` +
          `${r.status === null ? ` (spawn error ${r.error})` : ''}. analyzeExports threw, or the runner could not load ` +
          'reachability.js; run the runner by hand on the same corpus to see the error.');
        assert.ok(r.cpuMs !== null && Number.isFinite(r.cpuMs) && r.cpuMs > 0,
          `the ${name} child exited 0 but printed no positive CPU_US figure for its ${calls} scans, so its cost is ` +
          'unknown and nothing can be fitted.');
        if (swap) {
          assert.ok(r.swapped === calls,
            `the ${name} child swapped the call regex ${r.swapped} times in ${calls} scans: the swap did not reach ` +
            'SURFACE_CALL_RE exactly once per scan. Its source text in src/lib/reachability.js no longer equals ' +
            'SURFACE_CALL_SOURCE in this helper, or the scan now runs it more than once; set the constant to the regex ' +
            'as it now stands.');
          const skips = swap.skipOthers ? OTHER_EXECS_PER_SCAN * calls : 0;
          assert.ok(r.skipped === skips,
            `the ${name} child skipped ${r.skipped} other regex calls in ${calls} scans, not ${skips}: the scan no ` +
            `longer makes exactly ${OTHER_EXECS_PER_SCAN} other regex calls per scan (SURFACE_NODE_RUNS_RE, ` +
            'SURFACE_REQUIRES_RE, SURFACE_REQUIRE_DOT_RE and SURFACE_REQUIRE_IDX_RE in src/lib/reachability.js). Check ' +
            'that every other regex the scan now runs finds no match on a run of one letter, then set ' +
            'OTHER_EXECS_PER_SCAN in this helper to their number.');
        }
        const msPerScan = r.cpuMs / calls;
        if (size === 2 * MiB) {
          assert.ok(msPerScan < MAX_2MIB_CPU_MS,
            `a 2-MiB scan used ${msPerScan.toFixed(1)} ms of CPU time (its child's ${calls} scans averaged), not under ` +
            `${MAX_2MIB_CPU_MS} ms. The scan may still be linear, but its cost per byte grew: a surface regex is ` +
            'backtracking a bounded but long way at every position.');
        }
        perScanMs[i].push(msPerScan);
      }
    }
  } finally {
    for (const root of made) fs.rmSync(root, { recursive: true, force: true });
  }
  // Each size's smallest sample. Load only ever adds CPU time, and every child does the same work for the same time, so
  // every size's smallest sample is drawn from the same spread of load.
  const smallest = perScanMs.map((samples) => Math.min(...samples));
  const exponent = fitExponent(SIZES, smallest);
  t.diagnostic(`${label}: CPU ms per scan at ${SIZES.map(sizeName).join(', ')}: ` +
    perScanMs.map((samples) => samples.map((ms) => ms.toFixed(1)).join('/')).join('; ') +
    `; smallest ${smallest.map((ms) => ms.toFixed(1)).join(', ')}; fitted exponent ${exponent.toFixed(2)} ` +
    `(bound ${MAX_EXPONENT}); ${machineLoad()}`);
  assert.ok(Number.isFinite(exponent), `the fitted exponent is ${exponent}, not a number, so nothing can be bounded.`);
  return { exponent, smallest };
}

module.exports = { MAX_EXPONENT, SURFACE_CALL_SOURCE, INJECTED_SOURCE, measureScaling, machineLoad };
