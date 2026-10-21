---
title: "Timing tests are not failed by machine load"
type: implementation
created: 2026-10-12
priority: high
effort: small
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s4-a-requested-stop-offers-no-build
files:
  - tests/iron-loop-enforcer.test.js
  - tests/reachability-surface-scan-is-linear.test.js
---

# Timing tests are not failed by machine load

Slice 16 of `plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`. It is not one of the
parent's five suggested slices. The main session added it to the round on 2026-10-12, under the owner's standing rule "decide
it yourself", and it is built before slice 5 completes. Every line number below was read on 2026-10-12 in the main checkout.
No source file changes. No test needs a seam in `src/`, so `files:` holds only the two test files.

## Problem Statement

Slice 5's builder ran the full `npm test` three times. Each time exactly two tests failed, and both failures were wall-clock
bounds. The machine (18 cores) carried load from work outside CTOC. The main session's relay of 2026-10-12 gives a load
average of 31 to 115; slice 5's own execution record gives 30 to 70
(`plans/in-progress/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s5-the-session-claims-a-build-before-launching-it.md`
line 231).

1. **`tests/iron-loop-enforcer.test.js` lines 392-399**, "fast mode completes in under 500ms on the live repo". It wraps
   `checkAllInvariants({ root: projectRoot, mode: 'fast' })` in `Date.now()` and asserts `elapsed < 500`.
   - Under load the call took about 2.0 s.
   - Run alone it passed 2 of 3 times; the third run failed at 557 ms (slice 5's record, line 231).
2. **`tests/reachability-surface-scan-is-linear.test.js` lines 90-108**, "a 2-MiB single-char surface is scanned within a
   strict bound (not minutes)". It spawns `node -e` with a hard 25000 ms kill (`HARD_TIMEOUT_MS`, line 51). The child
   measures `Date.now()` around `require(REACH)` plus `analyzeExports(root)` (lines 69-73). The test asserts
   `elapsedMs < BOUND_MS` (3000, line 47).
   - Under load the scan took 11 to 12 s.
3. **The same file's ratio case (lines 110-130) is also load-sensitive.** It compares two wall-clock runs,
   `b.elapsedMs < 3 * a.elapsedMs + 400`.
   - It failed in an earlier completion at load average 20: about 2.2 s, against about 0.8 s when the same test was run
     alone (`.ctoc/audit/tool-grant-run-notes/s5-fix-pass-executor.md` lines 5-6).
   - The scan file also failed once at load average 15 (`.ctoc/audit/speed-and-size/benchmarks/RESULTS.md` line 71).
   - Load changes between the two runs that are compared, so a ratio of wall-clock times is not load-free.

A wall-clock bound fails because of machine load, not because of the property it guards. Running the test again until it
passes would only be a flaky pass. **The fix, as the main session decided:**
- The enforcer check measures CPU time (user plus system, `process.cpuUsage()`) against its unchanged 500 ms budget.
- The linearity check bounds the ratio of a 2-MiB scan to a 1-MiB scan measured in the same run, instead of a fixed number
  of seconds.
- Neither test gets a larger budget, a retry or a skip.

**Where the measured work runs.** This was read from the code for this plan, and the test's own guard confirms it at run time
(Step 8, variant E-0).
- Fast mode runs inside the test's own process.
- `checkAllInvariants` (`src/lib/iron-loop-enforcer.js` line 1356) runs the 15 checks marked `mode: 'fast'` (lines 686-715)
  synchronously.
- Its load closure is `safe-fs`, `project-root`, `frontmatter`, `gate-order` and, through the gate-destinations check (line
  418), `src/hooks/human-gate-check.js`. That file pulls in `durable-log`, `gate-migration`, `approval-residency`,
  `approval-ledger`, `stale-detector`, `regex-utils` and `cache`.
- The search `child_process` over those files found one use: `stale-detector.js` line 501, inside `verifyStaleCandidate`.
  Its only callers are `src/lib/menu-screens.js` lines 1282 and 1390 and `src/lib/plan-index/conflict-detect.js` line 297,
  and none of these is in the closure.
- The search `Atomics\.wait` over `src/` matched three files: `quality-state.js`, `audit-chain.js` and
  `plan-index/store.js`. None of them is in the closure.
- So `process.cpuUsage()` of the test process covers fast mode's work.
- **The scan runs in a child process.** Its CPU time is taken from the child's own report: the child calls
  `process.cpuUsage()` around `analyzeExports` and prints the figure. `process.resourceUsage()` in the parent is not used,
  because it reports the calling process only, not its children (Node documents it as "the resource usage for the current
  process"; believed, not load-bearing).

## Implementation Details

### Dependency Graph

```
tests/iron-loop-enforcer.test.js --calls--> src/lib/iron-loop-enforcer.js#checkAllInvariants (unchanged)
tests/iron-loop-enforcer.test.js --wraps for one call--> node:child_process (7 spawn functions) and Atomics.wait (pass-through)
tests/reachability-surface-scan-is-linear.test.js --spawns--> node -e runner --calls--> src/lib/reachability.js#analyzeExports (unchanged)
src/scripts/test-gate.js (npm test) --runs--> tests/*.test.js (lines 266-268)
```

No new module, no new `require` outside the two test files, no change under `src/`.

### File Specifications

#### File: `tests/iron-loop-enforcer.test.js`
**Action:** MODIFY
**Purpose:** the fast-mode performance case measures the work fast mode does, not the time it waits for a core.
**Change Type:** modify-existing

##### Changes (lines 392-399 only; every other case is untouched)

- Replace the `it` at lines 393-398 with the case below. The `describe('iron-loop-enforcer — performance')` name stays.
- Put a comment above the `it` that says three things:
  - CPU time (user plus system) is measured because wall-clock time grows with machine load. On 2026-10-12 this call took
    about 2 s at a load average of up to 115 on 18 cores.
  - The budget is still 500 ms.
  - CPU time cannot see waiting, so the same call also asserts that fast mode starts no child process and never sleeps.

```js
it('fast mode uses under 500ms of CPU time on the live repo and waits on no child process or sleep', (t) => {
  const cp = require('node:child_process');
  const SPAWNERS = ['exec', 'execFile', 'execFileSync', 'execSync', 'fork', 'spawn', 'spawnSync'];
  const originals = new Map(SPAWNERS.map((name) => [name, cp[name]]));
  const originalWait = Atomics.wait;
  const waits = [];
  for (const [name, fn] of originals) {
    cp[name] = function (...args) { waits.push(`child_process.${name}`); return fn.apply(this, args); };
  }
  Atomics.wait = function (...args) { waits.push('Atomics.wait'); return originalWait.apply(Atomics, args); };
  let cpuMs;
  let wallMs;
  try {
    const wall0 = Date.now();
    const cpu0 = process.cpuUsage();
    checkAllInvariants({ root: projectRoot, mode: 'fast' });
    const used = process.cpuUsage(cpu0);
    wallMs = Date.now() - wall0;
    cpuMs = (used.user + used.system) / 1000;
  } finally {
    for (const [name, fn] of originals) cp[name] = fn;
    Atomics.wait = originalWait;
  }
  t.diagnostic(`fast mode CPU time ${cpuMs.toFixed(1)} ms, wall-clock ${wallMs} ms (CPU budget 500 ms; wall-clock not asserted)`);
  assert.deepEqual(waits, [],
    `fast mode waited on ${waits.join(', ')}. CPU time cannot see a wait, so fast mode must start no child process and never sleep.`);
  assert.ok(cpuMs < 500, `Fast mode used ${cpuMs.toFixed(1)} ms of CPU time, target < 500 ms`);
});
```

- **Wall-clock is printed, not asserted.** It stays in the diagnostic line so that a later reader can compare it with the CPU
  figure from the same run.
- **The diagnostic text must not begin with** `tests`, `pass`, `fail`, `skipped` or `all files`. The test gate reads lines
  that start with those words (`src/scripts/test-gate.js` lines 99, 122 and 158). The text above begins with "fast mode".
- **The wrappers pass every call through,** so no behaviour changes, and `finally` restores the originals even when a check
  throws.
- **Limit:** the wrappers see a call only when it is made through the `child_process` module object at call time. A future
  module that destructures `execFileSync` at its own load, and is loaded before this case runs, would escape them. Today
  the one use of `child_process` in the files of fast mode's closure is `src/lib/stale-detector.js` line 501, inside
  `verifyStaleCandidate` (whose callers are outside the closure): it is required inside the function and called through
  the module object (`cp.execFileSync`), so the wrappers would see it if it ran. No module in the closure uses `Atomics`.

##### Dependencies
`node:child_process` (builtin, the same module object as `child_process`), `Atomics` (ES2017 global;
`src/lib/quality-state.js` line 142 already uses it under the same lint configuration). `os`, `fs` and `path` are already imported (lines 14-16).

##### Error Handling
- An exception inside `checkAllInvariants` still restores the wrappers through `finally`. The function itself catches each
  check's exception (`src/lib/iron-loop-enforcer.js` lines 1386-1388).
- If `cpuMs` is never set, the test fails at `cpuMs.toFixed` with a `TypeError`, a loud failure, never a pass.

##### Cross-Platform Notes
- `process.cpuUsage()` and `Atomics.wait` behave the same on Windows, macOS and Linux.
- No paths are built.

#### File: `tests/reachability-surface-scan-is-linear.test.js`
**Action:** MODIFY
**Purpose:** the linearity guard bounds how the scan's CPU time grows when the input doubles, not a number of seconds.
**Change Type:** modify-existing

##### Changes

- **Constants (lines 45-52):**
  - Replace `BOUND_MS = 3000` and its comment (lines 45-47) with the same number in CPU time:

```js
// Each 2-MiB scan's own CPU time (user + system, measured by the child around analyzeExports alone) must stay under
// 3000 ms: the number the wall-clock bound used, now in CPU time so machine load does not count against it. It catches
// a scan that stays linear while its cost per byte grows (a surface regex that backtracks a bounded but long way at
// every position), which the ratio cannot see.
const MAX_2MIB_CPU_MS = 3000;
```

  - Keep the value `HARD_TIMEOUT_MS = 25000` and keep `MiB`. Rewrite the comment above `HARD_TIMEOUT_MS` (lines 48-50) to
    this text, with `<S-0 figure>` filled in at Step 10 from the S-0 control's 2-MiB wall-clock time:

```js
// Hard wall-clock ceiling on each child: the hang guard. A busy synchronous regex in a child can be stopped only from
// outside, by a kill on a timer, so this one bound has to be wall-clock. Without load the 2-MiB child takes about
// <S-0 figure> s; at a load average of 115 on 18 cores it took 11 to 12 s (2026-10-12). Pre-fix the child is killed
// here, turning a 14-minute hang into a bounded ~25-s failure.
```

  - Add:

```js
// Each scan's CPU time (user + system) is measured by the child itself around analyzeExports alone. CPU time, not
// wall-clock: under machine load a scan waits for a core, and that wait is not the scan's cost.
const RUNS_PER_SIZE = 3;
// Linear: doubling the input doubles the CPU time (ratio about 2). Quadratic: it quadruples it (about 4). The bound is
// the geometric midpoint 2 * sqrt(2), about 2.83, the same factor (sqrt(2)) away from both, because timing noise
// multiplies rather than adds.
const MAX_RATIO = 2 * Math.SQRT2;
```

- **`runScanBounded` (lines 62-87):**
  - The runner requires `REACH` before it starts measuring. It then takes `const c0 = process.cpuUsage();`, calls
    `analyzeExports(process.argv[1])`, takes `const c = process.cpuUsage(c0);` and writes
    `"CPU_US=" + (c.user + c.system) + " SC=" + r.surfaceCalled.length`.
  - The parent parses `CPU_US=(\d+)` into `cpuMs = Number(m[1]) / 1000` and returns
    `{ completed, cpuMs, signal, status: res.status }`. `cpuMs` is `null` when the child did not complete or printed no
    figure. The child's stderr is not printed.
  - The `spawnSync` options (timeout, `SIGKILL`, encoding, `maxBuffer`) are unchanged.
  - The JSDoc says that `cpuMs` is the child's own CPU time for the scan alone: it excludes Node's start-up and the
    `require`.
- **Add two helpers** after `runScanBounded`:

```js
/** The middle value of an odd-length list. */
function median(values) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

/** The machine's load, for a failure message: a scan killed at the wall-clock ceiling may be load, not backtracking. */
function machineLoad() {
  return process.platform === 'win32'
    ? `Node reports no load average on Windows; ${os.cpus().length} cores`
    : `load average ${os.loadavg()[0].toFixed(1)} on ${os.cpus().length} cores`;
}
```

- **Delete the case at lines 90-108** ("a 2-MiB single-char surface is scanned within a strict bound (not minutes)"). Its
  two assertions are handled as follows:
  - Its "completed within the hard ceiling" assertion is kept, and is now asserted on each of the six scans of the case
    below.
  - Its 3000 ms bound is kept as `MAX_2MIB_CPU_MS`, in CPU time instead of wall-clock, and is asserted on each of the
    three 2-MiB scans of the case below.
  - No code and no document refers to the case by name: the search
    `completes in under 500ms|strict bound \(not minutes\)|super-linearly increase the scan time` over `src/`, `tests/`,
    `docs/` and `.ctoc/*.json` matched 3 lines, each a test's own definition.
- **Rewrite the body of the case at lines 110-130.** The name "doubling the input does not super-linearly increase the scan
  time" stays.

```js
it('doubling the input does not super-linearly increase the scan time', (t) => {
  const roots = { '1 MiB': makeSingleCharCorpus(1 * MiB), '2 MiB': makeSingleCharCorpus(2 * MiB) };
  const cpuMs = { '1 MiB': [], '2 MiB': [] };
  try {
    for (let run = 0; run < RUNS_PER_SIZE; run++) {
      for (const size of ['1 MiB', '2 MiB']) { // interleaved, so a change in load reaches both sizes alike
        const r = runScanBounded(roots[size]);
        assert.ok(r.signal === null,
          `the ${size} scan was killed at the ${HARD_TIMEOUT_MS} ms wall-clock ceiling (signal ${r.signal}). ` +
          'Either a surface regex backtracks super-linearly (the O(n^2) ReDoS in SURFACE_CALL_RE: bound the identifier ' +
          `quantifier) or the machine is too loaded for even a linear scan to finish (${machineLoad()}).`);
        assert.ok(r.status === 0,
          `the ${size} scan crashed: the child exited with status ${r.status}. analyzeExports threw, or the runner ` +
          'could not load reachability.js; run the runner by hand on the same corpus to see the error.');
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
    const ratio = median(cpuMs['2 MiB']) / median(cpuMs['1 MiB']);
    t.diagnostic(`scan CPU ms, 1 MiB: ${cpuMs['1 MiB'].join(', ')}; 2 MiB: ${cpuMs['2 MiB'].join(', ')}; ` +
      `median ratio ${ratio.toFixed(2)} (bound ${MAX_RATIO.toFixed(2)})`);
    assert.ok(ratio < MAX_RATIO,
      `median CPU time of the 2-MiB scan over the 1-MiB scan is ${ratio.toFixed(2)}, not under ${MAX_RATIO.toFixed(2)}: ` +
      'the scan grows super-linearly (linear is about 2, quadratic about 4). A surface regex is backtracking on a long run.');
  } finally {
    for (const root of Object.values(roots)) fs.rmSync(root, { recursive: true, force: true });
  }
});
```

- **The check fails fast.** Each scan's completion is asserted as soon as it returns, so a quadratic regression costs one
  25 s kill, not six.
- **A zero or missing 1-MiB median fails loudly.** The ratio is `Infinity` or `NaN`, and `< MAX_RATIO` is false for both.
- **The two `SEMANTICS PRESERVED` describes (lines 133-194) are untouched.**
- **Header comment (lines 1-31):**
  - Lines 29-30 ("Post-fix the child exits in well under a second, so the ceiling is never approached …") are replaced in
    Step 10 with the CPU and wall-clock figures that Step 9 measured.
  - Add a paragraph "WHY CPU TIME AND A RATIO" in Step 10. It holds the three load failures named in the Problem
    Statement, the reason for the bound, and the remaining wall-clock dependence of the 25 s ceiling.

##### Error Handling
- Each way a child can fail has its own assertion and message: killed at the ceiling (the signal and `machineLoad()`),
  crashed (its non-zero status), or exited 0 with no `CPU_US` figure. The child's stderr is not printed.
- The temporary corpora are removed in `finally`, as today.

##### Cross-Platform Notes
- `os.loadavg()` returns zeros on Windows, which `machineLoad` says in words instead of printing a zero.
- `spawnSync(process.execPath, …)` with `SIGKILL` is unchanged from today.

### Test Plan

**Framework:** `node:test` with `node:assert/strict`, as both files use today. The two changed cases are the deliverable,
so this plan is about evidence that they guard their property (they fail on a slowed copy) and that they no longer fail on
load (they pass at the machine's ambient load, which is recorded).

**The harness lives in the session's scratch folder, outside the repository, and is deleted at the end.** A slowed copy
inside the repository would be read by sibling test workers that scan the live `src/` tree; the reason is stated in
`tests/iron-loop-enforcer.test.js` lines 30-40. The harness has three parts:
- `<scratch>/copy/` is the working tree copied with `fs.cpSync` **before any edit**, so its `tests/` holds the old test
  files. It excludes `.git`, `node_modules` and `.claude`, and retries on `ENOENT`, as `stableRepoRoot` does at
  `tests/iron-loop-enforcer.test.js` lines 41-66 (the live tree is busy).
  - After Step 8 writes the new cases, copy the two edited files into `<scratch>/copy/tests/` as
    `iron-loop-enforcer.new.test.js` and `reachability-surface-scan-is-linear.new.test.js`. Old and new files then both
    resolve `projectRoot` and `REACH` to the copy.
  - Variants are applied to the copy's `src/lib/iron-loop-enforcer.js` or `src/lib/reachability.js` one at a time. After
    each variant the file is restored, and the restore is checked byte for byte against the repository's file.
- **The load is the machine's ambient load.** The machine already carries a high load from work outside CTOC (load average
  31 to 115 on 18 cores on 2026-10-12). Every "under load" figure in this plan is measured at the ambient load, and
  `os.loadavg()` is recorded for every run. A "loaded run" below is a run whose recorded one-minute load average is at
  least 2 × the core count, from ambient load or, failing that, from the fallback below.
- `<scratch>/load.js` is a Node script, not a shell script, that runs the given test command N times with `spawnSync`. For
  each run it records the exit code, the diagnostic lines and `os.loadavg()` at the start of the run.
  - **Synthetic load only as a fallback.** Only if the one-minute load average is below 2 × the core count when the loaded
    runs are due, it starts K busy children, K = `Math.max(0, Math.round(2 * os.cpus().length - os.loadavg()[0]))`, so
    the synthetic load is at most 2 × the core count.
  - Each child is `node -e "const end = Date.now() + Number(process.argv[1]); while (Date.now() < end) {}" <lifetimeMs>`,
    with a lifetime of at most 10 minutes. It ends by itself, never unbounded, so a killed harness leaves no busy process
    behind.
  - It then waits until `os.loadavg()[0]` reaches 90% of the target (2 × the core count) or 300 s pass, and records the
    value reached.
  - It never overlaps another build's test run on this machine: if one is running, it waits and records the wait.
  - It kills every child in `finally` and on `exit`.
- **Commands.** To run one case, use
  `node --test --experimental-test-coverage --test-name-pattern="<case name>" <file>`. The coverage flag is there because
  the gate runs with it. Confirm from the run's summary that exactly one test ran. If more or fewer ran, fix the filter
  before you record anything.

**Variants (red evidence, Step 8).** Each variant is applied to the copy and run at the ambient load, which is recorded.

| Id | Where (in the copy) | Injected change | New case must | Old case (the copy's unedited test file) |
|----|---------------------|-----------------|---------------|----------------------------------------|
| E-0 | none (control) | none | pass, `waits` empty | pass at ambient load, or record its time |
| E-A | `checkPlanCounts`, first line | `{ const t0 = process.cpuUsage(); while (process.cpuUsage(t0).user < 600000) {} }` (600 ms of CPU) | fail on the CPU assertion | fail on wall-clock |
| E-B | same | `require('child_process').execFileSync(process.execPath, ['-e', 'setTimeout(() => {}, 600)']);` | fail on `waits` naming `child_process.execFileSync`; its diagnostic shows CPU under 500 ms | fail on wall-clock |
| E-C | same | `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 600);` | fail on `waits` naming `Atomics.wait`; diagnostic CPU under 500 ms | fail on wall-clock |
| S-0 | none (control) | none | pass; record the CPU figures and the ratio | pass at ambient load, or record |
| S-Q1 | `SURFACE_CALL_RE`, line 654 | `{0,127}` becomes `*` (the historical regression) | fail on the first 1-MiB scan, killed at 25 s | fail, killed |
| S-Q2 | `surfaceCalledNames`, after line 697 | a loop of `(text.length / STRIDE) ** 2` iterations (snippet below), STRIDE calibrated once (below) so that at 1 MiB the injected work costs about three times S-0's 1-MiB CPU (expected ratio about 3.5) | fail on the ratio assertion, with every scan completed | record |
| S-K | same place | the call scan repeated R more times (`scan(text, SURFACE_CALL_RE, 1)`), R = ceil(4000 / S-0's 2-MiB median CPU ms) − 1: linear, 2-MiB CPU about 4000 ms | **fail on the 2-MiB CPU bound** (`MAX_2MIB_CPU_MS`), with every scan completed and ratio about 2. If a scan is killed at the ceiling, lower R to aim for 3600 ms and record both R values | record |
| S-L | same place | the call scan done three times (`scan(text, SURFACE_CALL_RE, 1)` twice more): linear, about 3× the work | **pass** (ratio about 2, every 2-MiB CPU figure under 3000 ms). Recorded as the slowdown both bounds allow | record (the old fixed 3 s bound may fail) |

The S-Q2 loop is a red-harness change only and never goes into the repository:

```js
let acc = 0;
for (let i = 0; i < text.length; i += STRIDE) for (let j = 0; j < text.length; j += STRIDE) acc = (acc + j) | 0;
if (acc === -1) names.add(''); // keeps the loop observable to the optimiser
```

**STRIDE is calibrated once, before S-Q2 runs.** Time the injected loop alone, in a child, on a 1-MiB string, and set
STRIDE (a harness parameter, not the test) so that its CPU time is 3 × S-0's 1-MiB median CPU, within ±10%. Record the
calibration runs and the STRIDE chosen. STRIDE is never changed because of S-Q2's ratio: a median ratio under 3.3 with a
calibrated STRIDE fails stop rule 3. A scan killed at the ceiling during S-Q2 is re-run with the same STRIDE at a lower
load, and both runs are recorded.

**Load evidence.**
- **Step 8 reproduction.** Before any edit, run the old cases in the repository itself (read-only runs) at the ambient load,
  5 runs each, and record how many fail and the load average of each run. If none fails, record that the defect did not
  reproduce at that load. The figures from slice 5's record and the audit notes remain the evidence for it.
- **Step 9 margins.** Run the new cases 10 times at the ambient load, recording `os.loadavg()` for each run, and record
  every diagnostic line. Step 8's five loaded enforcer runs and two loaded scan runs (the claim check) count as the loaded
  runs of this step.

**Stop rules (Step 9).** If any rule below fails, the build stops. The numbers go into the Execution Record, and the
plan goes back to the CTO Chief as needs-input. The 500 ms budget, `MAX_RATIO`, `RUNS_PER_SIZE` and `HARD_TIMEOUT_MS` are
never changed to make a rule hold.
1. Enforcer: the median of the 10 ambient-load CPU figures is at most 400 ms (at least 25% headroom), and all 5 loaded
   figures (Step 8's claim check) are under 500 ms.
2. Scan: every run passes, no scan is killed at the ceiling, every median ratio of the real scan is at most 2.4
   (`MAX_RATIO` divided by about 1.18), the median of the ambient-load 2-MiB CPU figures is at most 2000 ms, and every
   loaded 2-MiB figure is under 3000 ms.
3. The quadratic variant S-Q2 gave a median ratio of at least 3.3 (`MAX_RATIO` times about 1.17), so the bound sits with
   the same margin on both sides.

**Measured once filtered and, if needed, in the full file.** The filtered run calls fast mode cold (first call in the
process), which costs at least as much CPU as the warm call inside the full file; believed, because the lazy `require` of
`human-gate-check` and any module cache fall inside the cold measurement. If rule 1 fails on filtered runs, measure 5
full-file runs before you stop, and record both sets.

**Coverage:** no source line changes, so coverage of `src/` is unchanged. Step 14 checks it.

### Security Review
- [x] No source, hook or write-protection change. Nothing under `src/` is edited.
- [x] Every wrapper passes calls through to the original and is restored in `finally`. No other test in the file sees a
  wrapped function: `node:test` runs the file's cases one after another (the search `concurrency` over both files found
  none), and the wrapped call is synchronous.
- [x] The harness stays in the scratch folder, outside the repository, and is deleted at the end. The repository copy stays
  on the local disk and goes nowhere else.
- [x] Each load child has a fixed lifetime and ends by itself, and the harness kills them all in `finally` and on `exit`.
  That bounds the CPU exhaustion on the owner's machine in time.
- [x] The failure messages print counts, times and the load average, never file contents.
- [x] The `node -e` runner string interpolates only `JSON.stringify(REACH)`, a path the test builds itself, as today.

### Wiring — the live call sites
- Both test files are callers. `npm test` reaches them: `package.json` line 11 runs `src/scripts/test-gate.js`, which lists
  `tests/*.test.js` (lines 266-268).
- They guard two production paths, both unchanged:
  - `checkAllInvariants` in fast mode, which `src/hooks/SessionStart.js` lines 162-163 call at every session start.
  - `analyzeExports`, which the enforcer's dead-export fence calls (`src/lib/iron-loop-enforcer.js` line 779).
- No module is added, so no new call site is needed.

## Acceptance Criteria

- [x] `tests/iron-loop-enforcer.test.js`'s performance case measures `process.cpuUsage()` (user plus system) around one
  fast-mode call on the live repository and asserts it under 500 ms. No wall-clock time is asserted, and the 500 ms budget
  is unchanged.
- [x] The same case wraps the seven `child_process` spawn functions and `Atomics.wait` for exactly that call, as
  pass-throughs restored in `finally`, and asserts that none was called. Variants E-B and E-C fail on that assertion, with
  CPU under 500 ms shown in their diagnostic. Variant E-A fails on the CPU assertion. Control E-0 passes.
- [x] In `tests/reachability-surface-scan-is-linear.test.js`, `BOUND_MS` and the fixed-bound case are gone. The remaining
  ratio case runs `RUNS_PER_SIZE` = 3 interleaved 1-MiB and 2-MiB scans and takes each scan's CPU time from the child's
  own report around `analyzeExports` alone. It asserts, for each scan, that it was not killed at the unchanged 25000 ms
  ceiling, did not crash, and printed a CPU figure; and that the median 2-MiB CPU over the median 1-MiB CPU is under
  `2 * Math.SQRT2`.
- [x] Every 2-MiB scan's CPU time is asserted under `MAX_2MIB_CPU_MS` = 3000. S-K fails on that assertion with every scan
  completed.
- [x] Variant S-Q1 fails with the first 1-MiB scan killed at the ceiling. Variant S-Q2 fails on the ratio with every scan
  completed, with STRIDE calibrated once before it and never changed after. Control S-0 passes. S-L passes (ratio about
  2, every 2-MiB CPU figure under 3000 ms), and its result is recorded as the slowdown both bounds allow.
- [x] Both changed cases print their measured figures with `t.diagnostic`, in text that does not begin with a word the
  test gate parses.
- [x] Step 8 records the claim check (the new enforcer case 5 times and the new scan case twice, filtered, loaded) and the
  old cases run 5 times each at the ambient load against the unchanged repository, with how many failed. Step 9 records
  the new cases passing 10 of 10 at ambient load, with `os.loadavg()` for every run and the stop rules held. If a rule
  failed, the build stopped and the numbers were returned to the CTO Chief.
- [x] No budget is larger, no retry or skip is added, and the value of `HARD_TIMEOUT_MS`, the 500 ms budget and both
  `SEMANTICS PRESERVED` describes are unchanged.
- [x] `git diff --name-only -- tests/iron-loop-enforcer.test.js tests/reachability-surface-scan-is-linear.test.js src/`
  shows only the two declared test files changed by this slice (the main checkout carries other slices' uncommitted work
  under `src/`; compare against the list recorded at Step 9).
- [x] `npm test` passes: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped
  and 0 flaky.

## Decisions Taken Under Ambiguity

1. **This slice, its place in the round and the two fixes were decided by the main session on 2026-10-12, under the owner's
   standing rule "decide it yourself".** The slice is added to the round and built before slice 5 completes. The enforcer
   check measures CPU time against its 500 ms budget. The linearity check bounds the ratio of a 2-MiB scan to a 1-MiB scan
   in the same run. Nothing gets a larger budget, a retry or a skip.
2. **CPU time of the test process, with no child accounting, for the enforcer.** Fast mode runs in-process: the code was
   read for this plan (see the Problem Statement), and control E-0 confirms it at run time with an empty `waits`.
3. **A guard against waiting, to keep the case as strict as the wall-clock bound was.** A wall-clock bound also caught a
   fast mode that waited on a child process or slept. CPU time cannot see either, so the case asserts that neither happens
   during the call. E-B and E-C show that the CPU assertion alone would pass them. Disk-read waits are not guarded: they
   depend on the machine, like load, and the reads still cost system CPU time, which is counted.
4. **One measurement for the enforcer, as directed, not a median.** A minimum of several runs is not used, because "the
   minimum is under 500" means "some run passed", which is a retry in disguise. Step 9 measures the spread. If one run is too
   noisy, the stop rule returns that to the CTO Chief, and the builder does not add runs.
5. **The ratio bound is 2·√2 (about 2.83), the geometric midpoint between linear (2) and quadratic (4).** Timing noise
   multiplies rather than adds, so the midpoint on a log scale leaves the same margin (a factor of √2) on both sides. It is
   stricter than today's `3a + 400`.
6. **Three runs per size, interleaved, median per size.** The median of 3 tolerates one outlier per size. Interleaving puts
   a change in load on both sizes alike. The cost is 9 MiB of scanning instead of today's 5 MiB, about 1.8 times the file's
   scan work. Step 12 records the file's run time before and after.
7. **CPU time inside the child for the ratio as well, not wall-clock.** The ratio case already failed at load average 20 on
   wall-clock (Problem Statement, item 3), because the load changes between the runs it compares.
8. **The `require` of `reachability.js` moves out of the measured span.** The property is the scan's growth, and module
   loading is a fixed cost that does not depend on the input.
9. **The fixed-bound case is deleted, not rewritten.** Its 3000 ms bound is kept, as CPU time, on every 2-MiB scan of the
   ratio case. Its "completed" assertion now runs on all six scans of the ratio case.
10. **`HARD_TIMEOUT_MS` stays 25000 ms of wall-clock time.**
    - It is the hang guard, and it has to be wall-clock. A busy synchronous regex in a child can be stopped only from
      outside, by a kill on a timer.
    - It sits about two orders of magnitude below the regression it catches (about 851 s at 1 MiB in July 2026; test header
      lines 6-16).
    - It is about twice the 11 to 12 s seen on 2026-10-12 at a load well above 70 on 18 cores (the critic's fix 3: the
      figure of 115 belongs to the relay's range of loads, not to those two timings).
    - It is not raised, per the instruction. The failure message now names machine load as the other possible cause, with
      the load average, instead of asserting a ReDoS.
11. **A linear scan whose cost per byte grows is still caught,** by the 3000 ms CPU bound on each 2-MiB scan (variant
    S-K). S-L records a threefold slowdown that stays under it.
12. **A pass-through wrapper is not a mock of core logic.** Every call still reaches the real function; the wrapper only
    records that it happened.
13. **A fixed bound is kept, in CPU time (`MAX_2MIB_CPU_MS` = 3000).** This is the CTO Chief's reading of the main
    session's rule that each changed test stays at least as strict: the wall-clock seconds are gone; the CPU budget stays.
14. **The loaded runs use the machine's ambient load, not a synthetic one (the CTO Chief's amendment, 2026-10-12).** The
    machine already carries a load average of 31 to 115 on 18 cores from work outside CTOC. Synthetic load is added only
    if the one-minute load average is below 2 × the core count when the loaded runs are due, at most 2 × the core count,
    time-capped at 10 minutes, ended in `finally`, and never overlapping another build's test run.
15. **The plan's founding claim is checked first (Step 8).** The new enforcer case runs 5 times and the new scan case
    twice, filtered and loaded, before any red variant. An enforcer CPU figure of 500 ms or more, or a killed scan, means
    CPU time is not load-free enough for this design, and the plan returns to the CTO Chief.
16. **The S-Q2 row is split into S-Q2a and S-Q2b, and stop rule 3 is read as S-Q2a's ratio assertion firing (the CTO Chief's ruling,
    2026-10-12; the spec text above is not edited).** The guarded property is "the new scan case fails on a quadratic scan", and either
    assertion failing satisfies it. Reason (the builder's arithmetic from S-0's figures): let Q be the injected quadratic cost at 1 MiB
    (4Q at 2 MiB). The 2-MiB scan costs 745 + 4Q and must stay under 3000, so Q < 564; a median ratio of at least 3.3 needs
    (745 + 4Q) / (352 + Q) >= 3.3, so Q >= 596. The two cannot hold together, so S-Q2a (Q = 1x S-0's 1-MiB median, every 2-MiB scan under
    3000 ms) must fail on the RATIO assertion (bound 2.83) with nothing killed, and S-Q2b (Q = 3x, STRIDE 74) must fail, on the 2-MiB CPU
    bound, with nothing killed. Stop rule 3 holds when S-Q2a's median ratio is above 2*sqrt(2) and the ratio assertion fires.
17. **The ratio uses the MINIMUM of each size's three CPU samples, not the median (the CTO Chief's decision after the review, 2026-10-12).**
    `Math.min(...cpuMs['2 MiB']) / Math.min(...cpuMs['1 MiB'])`. Load only ever adds CPU time, so the smallest sample is the least
    load-biased estimate; a real quadratic raises every sample, so it is still seen. Decision 4's "the minimum is a retry in disguise"
    does not apply: no scan is dropped, because the 3000 ms bound stays on EVERY 2-MiB scan. The `median` helper is deleted. The
    plan's text of the Acceptance Criteria and of stop rules 2 and 3 says "median"; that spec text is not edited, and is read as the
    minimum from here on.
18. **The review's other fixes (round 1, builder's reading, 2026-10-12).** Wrappers are installed inside the `try` (the `finally`
    restores from the originals captured beforehand). The scan runner returns `error` (the spawn error code); a kill at the ceiling
    is reported only for `ETIMEDOUT`, any other signal is named as such, and a crash with a null status names the spawn error. The
    unused `completed` is gone; the parser is anchored to the whole output, `/^CPU_US=(\d+) SC=\d+$/` (SC= is kept so the scan's
    result is used, not only timed). The load figure of 115 is no longer attached to the 11-to-12-s and 2-s timings (it was the top of
    the relay's range of loads, not the load of those two timings): "a load well above 70 on 18 cores" in both files and in Decision 10.

**Open question:** none. The design was decided by the main session; the one uncertainty, how much CPU time grows under
load (see Risks), is measured in Step 9 and goes back to the CTO Chief if it breaks a stop rule.

## Risks

- **CPU time is not fully load-free.** On a chip with performance and efficiency cores (the 18-core machine), a loaded
  process can run on slower cores and spend more CPU time on the same work. `process.cpuUsage()` also counts V8's helper
  threads, so it can exceed the wall-clock time of the same run.
  - The 2-MiB scan's wall time grew about 14-fold between alone and loaded (0.8 s to 11-12 s), while the load was about 6.4
    times the cores. That suggests CPU time per unit of work also grew under load. This is an inference from two
    measurements in different runs; it is not verified.
  - The enforcer's alone-at-load wall time was already 557 ms once, so its CPU headroom is unknown and may be thin.
  - Likelihood: MEDIUM. Impact: HIGH for the enforcer fix (it would still fail under load).
  - Mitigation: Step 8's claim check measures it loaded first, and Step 9 measures it at ambient load against stop rule 1.
    If either fails, the build stops and
    the numbers go to the CTO Chief. The alternatives are not decided here. Two candidates: bound fast mode's CPU against a
    reference workload measured in the same run (a ratio, like the scan check), or bound a count of files read instead of
    time.
- **The 25 s ceiling is still wall-clock.** A load well above the 115 on 18 cores seen on 2026-10-12 could kill a linear
  scan. The message now says so, with the load average, and every loaded run records `os.loadavg()`. Likelihood LOW,
  impact MEDIUM.
- **A module that destructures `child_process` functions at load time escapes the wrappers.** None does in today's closure:
  its one use, `src/lib/stale-detector.js` line 501, requires `child_process` inside `verifyStaleCandidate` and calls it
  through the module object, so the wrappers would see it, and no module in the closure uses `Atomics`. The limit is stated in
  the code comment. Likelihood LOW, impact LOW.
- **The scan file does more scan work** (9 MiB instead of 5 MiB). Step 12 records the file's run time before and after, and
  Step 14 records the whole suite's wall time.

## Neighbours (seen, not built here; scheduling is the owner's)

- Other tests assert a wall-clock bound and may be load-sensitive in the same way. The search
  `(elapsed|duration|took|ms)\w*\s*<\s*\d{3,}` over `tests/` matched 13 lines in 12 files. The list is incomplete, because
  other spellings were not searched. None of these failed in slice 5's three runs:
  - `tests/streaming-gate.test.js` line 1313
  - `tests/opuspack-hooks.test.js` lines 302 and 310
  - `tests/false-green-fence.test.js` line 338
  - `tests/shell-write-targets.test.js` lines 139 and 149
  - `tests/security.test.js` line 824
  - `tests/escalation-word-boundary.test.js` line 776
  - `tests/plan-index-store.test.js` line 516
  - `tests/last-mile-drives-entry-point.test.js` line 175
  - `tests/quality-agent-crossplatform.test.js` line 34
  - `tests/quality-state-coverage.test.js` line 430
  Step 14's loaded run names any of them that fail.
- `src/lib/iron-loop-enforcer.js` line 9 names `docs/IRON_LOOP_ENFORCEMENT.md` as its specification, but that file does
  not exist (searched with Glob: 0 files).
- `src/hooks/SessionStart.js` line 159 calls fast mode a "~50ms target", while the test's budget is 500 ms.
- The parent plan has no list of its slices (no `## Slices` section). Slices 15 and 16 are recorded only in their own
  files.

## Execution Plan

### Step 8: TEST
- [x] First, check the claim the plan stands on: that CPU time stays within budget under load.
  - Before any edit to the repository, build `<scratch>/copy/` and `<scratch>/load.js` as the Test Plan says. Write the two
    new cases and the constants, exactly as the File Specifications say, into `<scratch>/copy/tests/` under their
    `.new.test.js` names (the copy's `src/` is unedited, so it measures the same code as the repository).
  - Run the new enforcer case 5 times and the new scan case twice, each filtered to the case, as loaded runs (Test Plan,
    "Load"). Record every diagnostic line and `os.loadavg()` for each run, and any synthetic load added with the value
    reached.
  - If any enforcer CPU figure is 500 ms or more, or any scan is killed at the ceiling, stop: record the numbers in the
    Execution Record and return the plan to the CTO Chief. Nothing further is built.
  - These runs count as Step 9's loaded enforcer and scan runs.
- [x] Reproduce the defect, still before any edit to the repository. In the repository, run the old enforcer case and the
  old scan file at the ambient load, 5 runs each, and record the pass and fail counts, the measured times and
  `os.loadavg()` for each run.
- [x] Write the two cases and the constants exactly as the File Specifications say, in the repository files, and confirm
  the copy's `.new.test.js` files are byte-identical to them (re-copy if they differ).
- [x] Run the red variants E-0, E-A, E-B, E-C, S-0, S-Q1, S-Q2 (STRIDE calibrated once first, as the Test Plan says), S-K
  and S-L on the copy, with the new cases and with the old ones. Record each result, failure message, diagnostic line and
  load average in the Execution Record. Every row of the variants table must come out as stated. If a row does not, stop
  and record it.

### Step 9: PREPARE
- [x] Run the margin measurements: each new case 10 times at the ambient load, filtered to the case. Step 8's claim-check
  runs are the loaded runs. Record every diagnostic line and `os.loadavg()` for every run.
- [x] Record the output of `git diff --name-only -- src/` in the Execution Record. The main checkout carries other slices'
  uncommitted work under `src/`; this list is what the final scope check compares against.
- [x] Apply the stop rules. If any fails, stop, record, and return the plan to the CTO Chief. Do not change a budget, a
  bound, a count or the ceiling.

### Step 10: IMPLEMENT
- [x] Finish both test files in this one step:
  - `tests/iron-loop-enforcer.test.js`: write the comment above the performance case, with the 2026-10-12 figures, the
    reason for the waiting guard and the destructuring limit.
  - `tests/reachability-surface-scan-is-linear.test.js`: replace header lines 29-30 with the figures Step 9 measured, add
    the "WHY CPU TIME AND A RATIO" paragraph, fill `<S-0 figure>` in the `HARD_TIMEOUT_MS` comment with the 2-MiB
    child's wall-clock time, timed by the harness around the spawn during S-0 at the lowest load average recorded in the
    build (if that load is not low, the comment says so and names it), and update `runScanBounded`'s JSDoc.
- [x] Re-run both files whole at ambient load (`node --test tests/iron-loop-enforcer.test.js
  tests/reachability-surface-scan-is-linear.test.js`) and record that every case passes.

### Step 11: REVIEW
- [x] The critic checks:
  - each changed case is at least as strict about its property as before, with the red table as evidence;
  - no budget, ceiling or count moved;
  - the wrappers are pass-through and restored in `finally`;
  - the reason for the ratio bound holds against the measured S-0 and S-Q2 ratios;
  - no diagnostic line can be read by the test gate as a count;
  - only the two declared test files changed by this slice, by the `git diff --name-only` check in the Acceptance
    Criteria against the `src/` list recorded at Step 9.

### Step 12: OPTIMIZE
- [x] Record the scan file's run time at ambient load before the change (the copy's unedited file) and after it (the
  repository's file). Apply
  the review's non-behavioural findings. Change no measurement.

### Step 13: SECURE
- [x] The security scanner confirms:
  - no `src/` or hook change;
  - the wrappers are restored on every path;
  - the harness was outside the repository, its load children had bounded lifetimes, and the scratch folder was deleted.

### Step 14: VERIFY
- [x] Run `npm test` at ambient load: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json`
  `minPct`, 0 skipped, 0 flaky. Record the load average, the wall time and the test count.
- [x] Run one more `npm test` as a loaded run (Test Plan, "Load"; ambient first, synthetic only under the stated
  fallback), recording `os.loadavg()`. This run gives evidence; it does not decide the step. If it can exceed 10
  minutes, start it in the background and end the turn. Record whether the two changed cases passed, and name every other
  test that failed, for the Neighbours list. Delete the scratch folder afterwards.

### Step 15: DOCUMENT
- [x] The comments in both test files state what is measured and why, with the dated figures.
- [x] No document under `docs/`, `README.md` or `CLAUDE.md` states these bounds: the search `500\s?ms|wall.clock` over
  `docs/` found none for them on 2026-10-12. Record the search again at this step.

### Step 16: FINAL-REVIEW
- [x] Every acceptance box is checked against the Execution Record. The red table, the claim check, the loaded passes and the stop rules
  are shown with their numbers, and anything not measured is said to be not measured.

## Execution Record

Build task t324, 2026-10-12. Steps 8 started; STOPPED inside Step 8 on the S-Q2 variant row (below). Step 9 and Step 10 not
started. Harness: `.../scratchpad/defects/build-s16/` (outside the repository; kept for the continuation). 18 cores; load
target 2 x cores = 36. One-minute load average (loadavg) is recorded for every run.

**Ambient load was low when the build began (loadavg 18-20), below 36.** So the synthetic fallback was used for the claim
check only: 16 self-ending busy children (K = round(36 - 20.3)), life under 10 minutes, no other CTOC test run on the machine
(checked), killed in `finally`; loadavg reached 35.5 in 25 s and read 40.3 for the runs. No busy process was left behind
(checked with ps). Caveat: wall-clock was about equal to CPU time in every one of those runs (see below), so the machine was
not truly contended even though loadavg read 40; this is not the 2026-10-12 situation (loadavg 31 to 115, wall 4 to 15 times CPU).
All later runs were at ambient load, which decayed from 43 (the tail of my own synthetic load) to 9.7.

**Claim check (new cases, filtered, in the scratch copy; loadavg in brackets).** PASSED, no limit moved.
- Enforcer, 5 runs [35.5, 40.3, 40.3, 40.3, 40.3]: CPU 215.6, 180.5, 185.6, 181.0, 179.5 ms (wall 216, 163, 166, 159, 157 ms).
  All under 500 ms; the waits list was empty in every run (so fast mode starts no child process and never sleeps).
- Scan, 2 runs [40.3, 40.3]: none killed. 1 MiB CPU 387.1, 375.4, 374.4 / 336.7, 383.1, 357.6 ms; 2 MiB CPU 686.1, 675.1, 736.0 /
  650.1, 746.3, 715.9 ms; median ratios 1.83 and 2.00.

**Defect reproduction (old cases, repository, read-only, ambient loadavg 43.4 to 40.7, 5 runs each): 0 failures of 10 runs.**
Old enforcer case 5/5 pass, 150-164 ms. Old scan file 5/5 pass (old 2-MiB case 0.85-1.12 s; old ratio case 1.24-1.52 s). The
defect did not reproduce at that load; slice 5's record and the audit notes remain the evidence.

**Step 8, third bullet done:** both cases and the constants written into the two repository test files (header comments and the
enforcer comment are Step 10); the scratch `.new.test.js` copies are byte-identical to them (cmp).

**Red variants (scratch copy, ambient load; new case / old case).** Restore checked byte for byte (equal to the pristine
snapshot and to the repository file) after every variant.
- E-0 [39.7]: new pass, CPU 176.5 ms, waits empty; old pass 150.7 ms. As stated.
- E-A [38.4]: new FAIL on CPU ("used 2294.7 ms ... target < 500 ms"); old FAIL (took 2079 ms). As stated.
- E-B [37.1]: new FAIL on waits ("waited on child_process.execFileSync"), diagnostic CPU 174.7 ms, wall 782 ms; old FAIL (785 ms). As stated.
- E-C [37.1]: new FAIL on waits ("waited on Atomics.wait"), CPU 172.6 ms, wall 751 ms; old FAIL (750 ms). As stated.
- S-0 [33.6 / 32.7]: new pass, 1 MiB CPU 353.7, 351.5, 352.5; 2 MiB CPU 1188.1 (one outlier), 745.2, 731.4; median ratio 2.11. Old pass.
  S-0 medians used below: 1 MiB 352.5 ms, 2 MiB 745.2 ms.
- S-Q1 [31.8 / 32.7]: new FAIL, first 1-MiB scan killed at 25 s (message names the signal and "load average 32.7 on 18 cores"); old FAIL, killed. As stated.
- S-K, R = ceil(4000 / 745.2) - 1 = 5 [9.7 / 8.8]: new FAIL on the 2-MiB CPU bound ("used 5032.9 ms ... not under 3000 ms"), not killed; old FAIL (4919 ms
  wall, fixed bound). As stated. (2-MiB CPU was about 5000, not 4000: the call scan is not the whole cost; no R change needed.)
- S-L [9.9 / 13.9]: new PASS: 1 MiB CPU 1327.1, 1423.6, 1222.8; 2 MiB CPU 2677.7, 2712.2, 2463.9; median ratio 2.02. Old PASS as well. As stated, but
  the slowest 2-MiB scan is only 10% under 3000 ms.
- **S-Q2 DOES NOT COME OUT AS STATED.** STRIDE calibration: STRIDE 32 = 5630 ms, 40 = 3600 ms, 74 = 1055.7 / 1166.7 / 1054.8 /
  1160.6 / 1054.4 ms per 1-MiB run (median 1055.7 = 3.00 x 352.5; target 1057 +/- 10%). STRIDE 74 chosen, once. Run [15.3 / 13.6]: new case FAILS,
  but on the 2-MiB CPU bound at the first 2-MiB scan ("used 5575.8 ms ... not under 3000 ms"), not on the ratio assertion; old case FAILS the same way.
  The plan's wording "fail on the ratio assertion, with every scan completed" cannot happen with this calibration: a quadratic injection of
  3 x 352.5 ms at 1 MiB costs 4 x 1057 + 745 = about 5000 ms at 2 MiB, over the per-scan 3000 ms bound that is asserted before the ratio.

**Why the plan is inconsistent here (arithmetic from S-0's figures; not a guess).** Let Q be the injected quadratic cost at 1 MiB (4Q at 2 MiB).
The 2-MiB scan costs 745 + 4Q and must stay under 3000, so Q < 564. Stop rule 3 needs a median ratio of at least 3.3:
(745 + 4Q) / (352 + Q) >= 3.3, so Q >= 596. The two cannot both hold. Diagnostics, scratch only, NOT a substitute for the S-Q2 row:
- STRIDE 74 with the 3000 ms bound switched off in a scratch copy of the test: every scan completed, median ratio 3.39 (1 MiB 1459, 1703, 1406;
  2 MiB 4945, 5262, 4915): the ratio assertion fires and 3.39 >= 3.3, but only because the CPU bound was removed.
- STRIDE 128 (Q = 1.0 x S-0, calibration 355.8 / 351.7 / 351.3 ms) with the real new file: every scan completed, the ratio assertion fires (median ratio 2.93 against
  2.83; 1 MiB 732, 709, 722; 2 MiB 2102, 2143, 2114). But 2.93 is under 3.3, so stop rule 3 (margin on both sides) does not hold; the window in which a quadratic
  cost is seen by the ratio and not first by the 3000 ms bound is about 2.83 to 3.1.
Nothing was changed to make a row hold (no STRIDE re-tune against the ratio for the S-Q2 row, no bound moved).

**Decision needed (goes to the CTO Chief; not decided here).** Either drop the per-scan 2-MiB bound from the ratio case (the quadratic
ReDoS is still caught by the 25 s kill; S-K, a linear slowdown, then needs the bound back as its own case), or relax stop rule 3 and the S-Q2 row to what
the arithmetic allows, or lower the S-Q2 target. The 500 ms budget, `MAX_RATIO`, `RUNS_PER_SIZE`, `HARD_TIMEOUT_MS` and `MAX_2MIB_CPU_MS` are untouched.

**State left behind.** Repository: only the two declared test files changed by this build (new cases and constants, as in the specification, but
without the Step 10 header text; the `<S-0 figure>` placeholder is still in the `HARD_TIMEOUT_MS` comment). Both files currently pass at ambient load.
Scratch folder kept for the continuation and not yet deleted (Step 14 deletes it).

### Continuation (task t324 continue), 2026-10-12: Steps 8, 9 and 10 done; stopped after Step 10 as directed

**S-Q2 as ruled by the CTO Chief (two rows, replacing the single S-Q2 row above; the "Decision needed" paragraph above is answered by Decision 16).**
- **S-Q2a** (Q = 1.00x S-0's 1-MiB median 352.5 ms; STRIDE 128, calibrated once: 355.8 / 351.7 / 351.3 ms earlier and 357.8 / 354.8 / 351.9 /
  353.0 / 351.9 ms again, median 353.0 ms; never changed), formal run [loadavg 5.4 at start, 10.2 at end]: new case FAILS on the RATIO assertion,
  nothing killed, every 2-MiB scan under 3000 ms. Diagnostic: "scan CPU ms, 1 MiB: 760.906, 772.833, 792.21; 2 MiB: 2336.312, 2341.694,
  2316.961; median ratio 3.02 (bound 2.83)"; message "median CPU time of the 2-MiB scan over the 1-MiB scan is 3.02, not under 2.83".
  Old case (the unedited file in the copy) PASSES all of its cases (fixed 3-s bound 2.35 s wall, old ratio case 3.1 s): the old test did not catch
  this quadratic cost. Restore checked byte for byte (equal to pristine and to the repository file) after the run. **Stop rule 3 holds** (3.02 > 2.83,
  ratio assertion fired). The earlier diagnostic run at the same STRIDE gave 2.93; the formal median is 3.02.
- **S-Q2b** (Q = 3.00x, STRIDE 74: 1055.7 ms): the recorded run stands: new case FAILS at the first 2-MiB scan on "the 2-MiB scan used 5575.8 ms of
  CPU time, not under 3000 ms", nothing killed; old case FAILS the same way (its wall-clock bound).

**Step 8 complete.** All variant rows came out as stated (E-0, E-A, E-B, E-C, S-0, S-Q1, S-K, S-L as recorded above; S-Q2 as S-Q2a and S-Q2b).
The scratch .new.test.js copies were byte-identical to the repository's two test files before the Step 10 comments (cmp, checked again this run).

**Step 9: margins, 10 runs each, in the repository, filtered, ambient load (loadavg 15.6 to 18.7; no synthetic load; harness out-step9.jsonl).**
- Enforcer, all 10 pass, loadavg 15.64 at all ten starts: CPU ms 166.2, 168.9, 164.7, 168.5, 169.4, 168.1, 167.6, 165.9, 168.7, 166.8
  (median 168.0; wall-clock 137 to 143 ms; waits empty). Stop rule 1: median 168.0 <= 400 and the 5 loaded figures from Step 8
  (215.6, 180.5, 185.6, 181.0, 179.5) are under 500: HOLDS. NOTE (round 1): that loaded clause was met only by UNCONTENDED runs (wall-clock about equal to CPU time in every one of them); the contended re-check is recorded in the Round 1 section below.
- Scan, all 10 pass, none killed. Median ratios 2.01, 2.04, 1.98, 2.02, 2.01, 1.98, 2.02, 2.08, 1.93, 1.91 (largest 2.08). 2-MiB CPU ms by run
  (3 scans each): 705-757, 693-779, 694-751, 712-718, 746-752, 701-741, 703-722, 715-879 (largest of all 30: 878.99), 698-733, 705-733;
  median of the 2-MiB figures about 718 ms. Loaded 2-MiB figures from Step 8 (650-746 ms) are under 3000. Stop rule 2: every ratio <= 2.4, median
  2-MiB CPU <= 2000, loaded figures under 3000: HOLDS.
- Stop rule 3: HOLDS (S-Q2a, above).
- The output of git diff --name-only -- src/ (the list the final scope check compares against; other slices' uncommitted work): src/commands/start.md,
  src/lib/actions.js, src/lib/menu-screens.js, src/lib/step-13-verify.js, src/lib/streaming-gate.js, src/lib/task-registry.js. This slice changes
  none of them. The same command over the two declared test files lists exactly those two files.

**S-0 figure for the HARD_TIMEOUT_MS comment.** Harness-timed wall-clock around the spawn of the 2-MiB child (S-0, repository's unchanged reachability.js),
5 runs: 754, 720, 755, 794, 735 ms (median 754 ms), loadavg(1m) 14.7 / 14.7 / 14.7 / 14.0 / 14.0 on 18 cores. That is below the core count but not an
idle machine, and the comment says so. The lowest loadavg of the build (5.4, at the start of the S-Q2a run) belongs to a different measurement, not
to a timed 2-MiB child, so it is not used. The comment says 0.75 s.

**Step 10 done.** Both test files finished: the enforcer comment above the performance case (2026-10-12 figures, the waiting guard, the destructuring
limit); the scan file's header (figures that Step 9 measured, the "WHY CPU TIME AND A RATIO" paragraph) and the HARD_TIMEOUT_MS comment with 0.75 s.
runScanBounded's JSDoc was already updated in Step 8. No constant moved (500 ms, MAX_2MIB_CPU_MS 3000, HARD_TIMEOUT_MS 25000, RUNS_PER_SIZE 3,
MAX_RATIO 2*sqrt(2)).
- Both files whole at ambient load (loadavg 11.6): node --test on the two files: 37 tests, 37 pass, 0 fail, 0 skipped. Enforcer CPU 186.5 ms;
  scan median ratio 2.32 (the two files run in parallel, so the scans compete; still under 2.4).
- npm test in the foreground (loadavg 11.6 at start, 19.9 at end; wall 3 min 55 s): 13227 tests, 13227 pass, 0 fail, 0 cancelled, 0 skipped;
  coverage 99.89% (threshold 99%); test gate PASS. In that full run the enforcer case measured CPU 252.0 ms against wall-clock 514 ms (the old
  wall-clock bound of 500 ms would have failed on that run); the scan case median ratio 1.97 (2-MiB CPU 943.6 to 960.6 ms).
- The scratch folder is kept for the later steps (Step 14 deletes it). No busy process from the harness remains (ps checked: 0).

### Round 1 (task t324, fix round and Steps 11 to 16), 2026-10-12

**Reviews recorded.** Critic: 8 findings, all applied below (finding 1 produced the contended claim check; finding 2 the minimum estimator,
Decision 17). Security scanner: verdict warn, for missing analyzer evidence only (no analyzer output was available to it), plus two low
hardening points, both fixed (wrappers installed inside the `try`; the parser anchored to the whole output). The CTO Chief runs the secrets
detector and the static scanner on the combined change before the release; this build ran neither.

**Changes in this round (only the two test files and this plan).** (1) Estimator: minimum of three samples per size, diagnostic text
"minimum ratio"; failure message says "smallest". (2) Load figures: 115 removed from the two timings (scan file header, HARD_TIMEOUT_MS
comment, enforcer comment, Decision 10). (3) Comments: "so waiting for a core does not count against it" on the CPU-time constant; the
"CPU time is not fully load-free" sentence (full suite 2026-10-12: 1.3 to 1.5 times, enforcer 252 ms, 2-MiB scan 0.94 to 0.96 s) in the
scan header and in the enforcer comment; the HARD_TIMEOUT_MS comment now says "At a load average of 14 to 15 on 18 cores the 2-MiB child
takes about 0.75 s (median of 5 runs, 2026-10-12)". The scan header figures were re-based on the minimum: real scan 1.97 to 2.10 over the 10
Step 9 runs (recomputed from the recorded samples: 2.01, 2.00, 1.98, 2.02, 2.10, 1.99, 2.01, 2.06, 1.97, 1.98), quadratic injection 3.05.
(4) Enforcer: wrappers installed inside the `try`. (5) Scan runner: `error` returned; ETIMEDOUT reported as the ceiling kill; other
signals and a null status named; `completed` and its JSDoc removed; anchored parser. No constant moved (500 ms, MAX_2MIB_CPU_MS 3000,
HARD_TIMEOUT_MS 25000, RUNS_PER_SIZE 3, MAX_RATIO 2*sqrt(2)); no retry or skip added.

**Variants re-run with the new code (scratch copy, ambient load; restore checked byte for byte after each).**
- S-Q2a (STRIDE 128, calibrated once earlier, unchanged): new case FAILS on the ratio assertion, nothing killed, every 2-MiB scan under 3000 ms.
  1 MiB 759.903, 770.342, 754.509; 2 MiB 2340.719, 2329.157, 2374.928; minimum ratio 3.09 (bound 2.83). (The earlier run's samples gave 3.04 or
  3.05 by minimum: 2316.961 / 760.906.) Old case passes, as before.
- S-0: new PASS, 1 MiB 407.449, 370.088, 352.577; 2 MiB 718.179, 705.49, 867.697; minimum ratio 2.00.
- S-L: new PASS, 1 MiB 1070.498, 1254.398, 1035.768; 2 MiB 2215.503, 2501.857, 2616.955 (all under 3000); minimum ratio 2.14.
- S-Q1: new FAIL, the first 1-MiB scan "was killed at the 25000 ms wall-clock ceiling (signal SIGKILL) ... load average 16.9 on 18 cores"
  (the ETIMEDOUT path works). A crash probe (analyzeExports made to throw in the copy): "the 1 MiB scan crashed: the child exited with status 1".
- E-0 pass (CPU 213.9 ms); E-A FAIL on the CPU assertion (2435.7 ms); E-B FAIL on "waited on child_process.execFileSync" (CPU 180.4 ms); E-C FAIL on
  "waited on Atomics.wait" (CPU 187.4 ms). All as the table states, with the wrappers now installed inside the `try`.
- Minimum ratios of the earlier runs, recomputed from the recorded samples: Step 8 claim check 1.80 and 1.93; Step 9 runs 1.97 to 2.10 (stop rule
  2's 2.4 bound holds with the minimum).

**Contended claim check (critic finding 1).** Run after every other CTOC test run had finished (the machine carried two idle `npm test` wrappers of
other projects, at 0.0% CPU for 35 to 45 minutes; they are not CTOC test runs and used no CPU, so they were not waited for; a first attempt that did
wait for them stopped after 28 minutes without starting any load). 36 self-ending busy children (2 x 18 cores, 9.5 minutes of life, killed in
`finally`); load average read 32.4 when the runs began (ambient 11.6 before the children) and 37.6 to 53.7 during them. Harness
`.../scratchpad/defects/build-s16/`. Afterwards `ps` showed 0 busy children (checked by the harness after the kill and again by hand).
- Enforcer, new case, 5 runs: CPU 220.2, 167.3, 162.5, 166.7, 165.8 ms; wall-clock 361, 164, 160, 177, 180 ms. Wall-clock over CPU: 1.64, 0.98, 0.98,
  1.06, 1.09. Waits list empty in all.
- Scan, new case, 2 runs: 1 MiB CPU 357.0, 369.1, 353.5 / 359.2, 350.4, 354.9; 2 MiB CPU 631.2, 691.0, 628.0 / 685.9, 669.2, 690.1; minimum ratios 1.78 and 1.91.
  None killed; whole test wall-clock about 5.8 s and 6.0 s for six scans (the uncontended S-0 run of the same filtered case took 3.7 s).
- **By the stated criterion (wall-clock at least 4 times CPU) NO run was contended**: the largest wall/CPU was 1.64. On this machine 36 busy children did
  not starve a test process (the 2026-10-12 failures had wall-clock 4 to 15 times CPU at much higher loads). So the claim "CPU time stays within
  budget under real contention" is still NOT shown by a contended run; it is shown for a loaded machine whose test process still gets its core.
- Two extra probes, labelled, not part of the brief: the same set with the test run under `nice -n 19` (enforcer CPU 174.2, 168.3, 168.9, 177.6, 175.4 ms,
  wall 159 to 240 ms; scan minimum ratios 2.14 and 1.89, 2-MiB CPU 653.7 to 694.3 ms: still wall about CPU, so still not contended); and under
  `taskpolicy -b` plus `nice -n 19`, where the test process was starved so hard that the first two runs ran 258 to 295 s and failed with no
  figure printed (the harness cap), the load average reading 52 and then 155 (other sessions' work as well); stopped, not repeated, because it starves
  the test beyond anything a test run meets and it printed no CPU figure. No limit was reached in any measured run (CPU 500 ms, ratio 2.4); nothing was moved.

**Whole files and the full suite.**
- Both test files whole (`node --test` on the two): 37 tests, 37 pass, 0 fail, 0 skipped, 0 cancelled. Enforcer CPU 114.8 ms (wall 114 ms); scan minimum ratio 1.98.
- `npm test` in the foreground, load average 41.8 / 97.5 / 71.3 at the start (a loaded run: at least 2 x 18) and 18.7 at the end, wall 202 s: 13227 tests,
  13227 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo; coverage 99.87% (threshold 99%); test gate PASS (lint, typecheck and the other gate checks are part of
  the gate). In that run the enforcer case measured CPU 256.4 ms against wall-clock 425 ms, and the scan case 2-MiB CPU 943.6 to 966.9 ms, minimum ratio 2.07.
  The two changed cases passed; no other test failed. The earlier Step 10 run (load average 11.6, wall 3 min 55 s, 13227 pass, coverage 99.89%) was the ambient one.

**Step 12 (run time of the scan file, whole, 3 runs each, load average 44.7, 99.1, 71.6 at the end of the runs):** before (the copy's
unedited file) 2863, 2836, 2805 ms; after (the repository's file) 4093, 4085, 4098 ms: about 1.4 times the run time, 9 MiB of scanning instead of 5 MiB.

**Step 15 search.** `grep -rEn "500\s?ms|wall.clock"` over `docs/`, `README.md` and `CLAUDE.md`: 5 lines in 4 files (docs/REGULATORY_OPS.md line 61, docs/REALTIME.md lines 7 and
209, docs/OPERATING_LESSONS.md line 82, CLAUDE.md line 227), none of which states these bounds (they are about regulatory clocks, the time model, and the
rule that nothing is scheduled against a wall clock). No document change needed.

**Scope.** `git diff --name-only` over the two test files and `src/`: the same six `src/` files as the Step 9 list (src/commands/start.md, src/lib/actions.js,
src/lib/menu-screens.js, src/lib/step-13-verify.js, src/lib/streaming-gate.js, src/lib/task-registry.js, other slices' work) plus the two declared test files. This slice changes
none of the six.

**Neighbours for the owner (seen, not fixed here).** Wall-clock bounds remain in `tests/regex-redos-bounded.test.js` line 53 and `tests/capability-registry.test.js`
lines 280 and 304. In the full run above no test other than the two changed ones was near a bound; none failed.

**Plan inconsistency, resolved.** Step 13 says the scratch folder was deleted while Step 14 says to keep it until after the final runs. It was kept until the end of
Step 14 and deleted after the final runs and this record (Step 13's line is read as "deleted at the end of Step 14").

**Not measured.** No contended run (wall-clock at least 4 times CPU) was obtained within the cap of 36 children; the secrets detector and the static scanner were not run
by this build (the CTO Chief runs them); the Windows and Linux behaviour of the two cases was not run (macOS only).

**State.** Boxes ticked: Steps 11 to 16 and all ten Acceptance Criteria boxes. Stopped before the completion command, as directed.
