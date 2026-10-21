---
title: "The linear-scan check holds under machine load and still fails a quadratic scan"
type: implementation
created: 2026-10-13
priority: high
effort: medium
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s16-timing-tests-are-not-failed-by-machine-load
files:
  - tests/reachability-surface-scan-is-linear.test.js
  - tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-real.test.js
  - tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-controls.test.js
  - tests/helpers/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load.js
  # The test-file count, which the two new test files move: README.md's line is asserted against disk by
  # tests/readme-numbers.test.js (lines 321-323); CLAUDE.md is required at the implementation-to-todo crossing by
  # src/lib/documented-counts.js for a plan that creates a tests/*.test.js file.
  - README.md
  - "CLAUDE.md"
---

# The linear-scan check holds under machine load and still fails a quadratic scan

Slice 26 of `plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`. It is not one of the
parent's five suggested slices. The dispatch of 2026-10-13 added it after `tests/reachability-surface-scan-is-linear.test.js`
failed again under machine load in another worktree, with slice 16's fix in place (commit 8e7798cf, "test: the timing tests
are not failed by machine load"). A flaky test is a defect. This slice replaces the measurement slice 16 wrote in that test;
it changes no source file, no hook and no `.ctoc/` check or baseline. Since review round 2 it splits that test: the
existing file keeps only its semantic checks, the real scan's timing case gets one new test file and the two injected
controls another, and the measure they share goes into a new helper under `tests/helpers/` (Decision 55). It declares
those four files and the two documents whose test-file count the two new test files move, `README.md` and `CLAUDE.md`.

Revised on 2026-10-13, before any review, after the CTO Chief ruled against the first design's bound (Decision 19). In the
cost model of "The fix" below, the revised check fails every scan slice 16's ratio check failed, fails more, and holds
under the load that check did not.

Revised again on 2026-10-13 and 2026-10-14, after review round 1 of at most 3 (critic, red team, pre-mortem), by the CTO
Chief's eight rulings on it (Decisions 33 to 54): contention is a condition of done; the 1-MiB size, which weighed
nothing in the fit, is gone; the rounds run in an order that a load starting or stopping partway through a case can tilt
by at most 0.1 × log2 of its inflation, and Step 9 runs load that starts mid-case; load workers stand down before every
busy child when another test run appears; the 300-s cap that push and the hotfix check put on `npm test`, and an
agent's 10-minute shell, are named with an estimate of this file's cost; probe 7 compares children of equal length; two
deterministic variants replace the blind-measure one; the warm-up has its real reason and sixteen scans; and ten smaller
corrections. The no-weakening ruling stands: no bound is wider, and every figure that moved is recomputed below with
its arithmetic.

Revised a third time on 2026-10-14, after review round 2 of at most 3 (critic, red team, pre-mortem, devil's advocate), by
the CTO Chief's twelve rulings on it (Decisions 55 to 76): the file is split in three, with a shared helper; the run-time
model names the file that sets the suite's length today and the 300-s cap already exceeded for other reasons, and a
same-session comparison replaces the absolute 270-s stop; the old case must fail under this build's load before the
replacement may ship; contention is measured as the old case's CPU inflation too; a new instrument and a flake probability
replace the efficiency-core probe's `taskpolicy -b`; the injected controls no longer run the scan's other regexes; and
smaller corrections. The no-weakening ruling stands: no bound, ceiling, size or sample number moved.

Revised a fourth time on 2026-10-15, after review round 3, the last, by the CTO Chief's eleven rulings on its findings
(Decisions 78 to 88): stop rule 6 judges each child against its own run and takes the largest flake probability over the
range of s; an efficiency-core cost nobody measured no longer satisfies it, and probe 9 runs at the start of Step 9;
stop rule 8 reads only a normalised difference; the reproduction is recorded evidence, not a condition of done; the
mid-case reproduction loads the first 2-MiB sample; one scratch folder serves the whole build; the stand-down check also
leaves out `load.js`'s ancestors; every stop names its next step; the q check and the allowed-slowdown row are
re-grounded; seven smaller corrections; and two questions for the owner, each with one Recommended option, for which the
build waits. No bound, ceiling, size or sample number of the test moved; stop rule 4's stop on q moved from 1.0 to 1.10
on the ruling (Decision 86).

Every line number below was read on 2026-10-13, 2026-10-14 or 2026-10-15 in the main checkout. The git status recorded
at the start of each planning session shows no uncommitted change to the test file, to `src/lib/reachability.js` or to
`src/lib/safe-fs.js`, and the latest commit 8e7798cf; those of 2026-10-14 and 2026-10-15 also list `README.md` and
`CLAUDE.md` as changed by other work, not yet committed.

The failing run's figures were not relayed and are not on disk. The search `minimum ratio|not under 2\.83|smallest CPU
time of the 2-MiB` over this checkout matched 2 files (slice 16's plan and the test itself); the search
`minimum ratio [0-9]|not under 2\.83|smallest CPU time of the 2-MiB scan over` over `.claude/worktrees/` (outside
`node_modules`) matched 4 lines, each the test's own failure-message line (line 170) in a worktree's copy of the test.
**Which copies those are** (Decision 63): the search `smallest CPU time of the 2-MiB scan over` over
`.claude/worktrees/*/tests/` on 2026-10-14 matched the copies in `agent-aadfde140804ea5df`, `agent-a622e500a3eb88033`,
`agent-a92caf11a57443f01` and `agent-a01f296ce9da6d4b6`. They are the only 4 of the 31 copies of the test under
`.claude/worktrees/` (a `Glob` of `.claude/worktrees/*/tests/reachability-surface-scan-is-linear.test.js`) that carry
slice 16's version: the search `^const (MAX_RATIO|HARD_TIMEOUT_MS|RUNS_PER_SIZE|MAX_2MIB_CPU_MS) = ` finds in each of the
four `MAX_2MIB_CPU_MS` at line 73, `HARD_TIMEOUT_MS = 25000` at line 79, `RUNS_PER_SIZE` at line 83 and `MAX_RATIO` at
line 87, as in this checkout, and in each of the other 27 only `HARD_TIMEOUT_MS = 25000` at line 51, the wall-clock
design that slice 16 replaced. On 2026-10-15 the same `Glob` found 33 copies and the same two searches the same four
carrying slice 16's version, the other 29 with only `HARD_TIMEOUT_MS = 25000` at line 51 (Decision 87). The relayed
failure ran with slice 16's fix, so it ran in one of these four worktrees;
which one, no file records. So the cause below is read from the code and from slice 16's record, and Step 9 tries to
reproduce the failure and records its numbers before any fix. Round 2 made a reproduction under this build's load a
condition of done; since round 3 it is recorded evidence, not a condition (stop rule 7, Decision 81).

## Problem Statement

**What failed.** The case "doubling the input does not super-linearly increase the scan time" (test lines 135-175).

**What the check does today** (slice 16's design, the file as committed at 8e7798cf):
- `RUNS_PER_SIZE = 3` rounds (line 83). Each round spawns one child for a 1-MiB corpus and one for a 2-MiB corpus,
  interleaved (lines 139-141).
- Each child (`runScanBounded`, lines 104-125) requires `reachability.js`, takes `process.cpuUsage()`, makes ONE
  `analyzeExports(root)` call and prints its CPU time, user plus system (lines 105-110). The parent kills it after
  `HARD_TIMEOUT_MS` = 25000 ms of wall-clock time (lines 79 and 112).
- Each child must not be killed (lines 142-145), not be ended by another signal (146-148), exit 0 (149-152) and print a
  CPU figure (153-154). Each 2-MiB scan must use under `MAX_2MIB_CPU_MS` = 3000 ms of CPU time (lines 73 and 156-161).
- The verdict: the smallest 2-MiB CPU time over the smallest 1-MiB CPU time (line 166) must be under
  `MAX_RATIO = 2 * Math.SQRT2`, about 2.83 (lines 87 and 169-171).

**What the scan costs, read from the code.** The corpus is a temporary folder whose only file is `skills/huge.md`, n bytes
of the letter `a` (`makeSingleCharCorpus`, lines 90-95).
- `analyzeExports` (`src/lib/reachability.js` line 793) first calls `analyze` (line 794; defined at line 476). The corpus
  has no `src/`, so `collectJsFiles` finds nothing (lines 108-109) and the import graph is empty. `liveRoots` (line 364)
  walks the instruction surfaces (`collectSurfaceFiles`, line 319, called at line 400), reads `skills/huge.md` (line 408)
  and runs `SURFACE_NODE_RUNS_RE` and `SURFACE_REQUIRES_RE` over it (lines 419-435). Both begin with a literal word
  (`node`, `require`) that never occurs in the corpus.
- `analyzeExports` then calls `surfaceCalledNames` (line 848; defined at line 683). It walks the surfaces again, reads the
  file again (line 697) and runs `SURFACE_CALL_RE` (line 698; defined at line 654), `SURFACE_REQUIRE_DOT_RE` and
  `SURFACE_REQUIRE_IDX_RE` (lines 699-700). `collectSurfaceFiles` then runs a third time (line 849).
- No regex matches the corpus, so each regex's `exec` is called once per scan (the `while` at line 689) and returns `null`
  after trying every start position. `SURFACE_CALL_RE` is `/([A-Za-z_$][A-Za-z0-9_$]{0,127})\s*\(/g`. At each position it
  takes up to 128 identifier characters, fails `\s*\(`, and gives them back one at a time: about 2 × 128 steps per
  position, linear in n with a large constant. That is the work the test times: about 0.35 s of CPU time at 1 MiB and
  0.72 s at 2 MiB (medians of 10 runs, 2026-10-12, test header lines 28-32).
- Inside the timed span a scan allocates its text twice (two `readFileSync(file, 'utf8')` through `readOrThrow`, line 170)
  and almost nothing per position: a failed `exec` builds no match object.

**Why it still fails under load: each candidate weighed against the code and the record.**

| Candidate | What the code and slice 16's record show | Verdict |
|---|---|---|
| CPU time per scan rises under contention: a slower core, a lower clock, caches refilled after each preemption | `process.cpuUsage()` is the CPU time of the whole child process, all threads (believed: Node's documentation calls it "the user and system CPU time usage of the current process", quoted from memory, and it reads `getrusage` for the process). It is a time, not a count of work: the same instructions cost more of it on a slower core or at a lower clock. Slice 16 recorded it: in the loaded full suite a 2-MiB scan took 943.6 to 966.9 ms against about 718 ms alone (record lines 719, 739 and 795), 1.3 times; one 2-MiB child took 1188.1 ms against 745.2 and 731.4 ms for its neighbours (line 666), 1.6 times. The check's margin is a factor of √2, about 1.41. The failing run measured the bounded regex: the search `const SURFACE_CALL_RE = ` over the copies of `src/lib/reachability.js` under `.claude/worktrees/` matched one line per copy, each the bounded `{0,127}` form at line 654, as in this checkout: 30 copies on 2026-10-13, 31 on 2026-10-14 (one worktree more), 33 on 2026-10-15, the four that carry slice 16's test among them (assumed: the failing worktree's copy did not change between its run and this read) | **The cause the code supports.** Which mechanism inflated the failing run (the core type, the clock or preemption) is not confirmed: macOS gives Node no per-core residency. Probe 9 measures what a slow core costs a child |
| Too few samples, sizes too close together | Two sizes one doubling apart: linear gives 2, quadratic 4, and the bound 2.83 sits a factor of √2, 1.41, from each: inside the 1.3 to 1.6 times that load added to single samples, so load in the upper part of that range crosses it. Three samples per size | **Supported** (arithmetic) |
| The minimum estimator on a ratio of two noisy minimums | The minimum of three is the least load-biased estimate only when both sizes share one spread of load. They do not: a 2-MiB child runs twice as long as a 1-MiB child (about 0.72 s against 0.35 s), so under load it is less likely to run clean. The ratio of minimums is therefore biased upward, toward failing, and more so the heavier the load | **Supported.** That a child's inflation grows with its length is not confirmed |
| A fixed overhead that dominates at the small size | The timed span excludes Node's start-up and the `require` (lines 105-110). What stays fixed (three directory walks of a one-file tree, about ten existence checks, the first call's compilation) is a few milliseconds at most against 350 ms (believed), and a fixed cost lowers the ratio | **Ruled out as the cause of a failure**: it pushes toward passing. The new design must still keep compilation out of the timed scans (the warm-up below, Decision 43) |
| Garbage collection inside the timed span | No `gc()` runs before the span, so garbage from start-up and the `require` can be collected inside it, and each scan allocates its text twice. Both costs are fixed or linear in n; neither is quadratic | **Not the cause of a ratio above 2.83** (believed); a source of noise. Step 9 counts the collections inside the span |
| Timer resolution | `process.cpuUsage()` reports microseconds. On macOS and Linux the accounting is far finer than a 350-ms sample (believed); on Windows, CPU times advance in ticks of about 15.6 ms (believed), at most 4.5% of a 350-ms sample | **Ruled out.** Step 8 measures the step on this machine |

**What the arithmetic makes certain.** Over slice 16's 10 uncontended runs the minimum ratio was 1.97 to 2.10 (record
line 755). A failing run read above 2.83, so every 2-MiB child of that run was at least about 1.35 to 1.44 times slower per
byte than that run's cleanest 1-MiB child. The 2-MiB side was inflated; the 1-MiB side cannot explain it, because its
minimum cannot fall below the clean floor (believed: nothing makes a scan cheaper than it is on an idle core).

**What cannot be confirmed without a run (Steps 8 and 9 confirm or refute each).**
- The failing run's own numbers, and that the old case fails at all under a load this build can produce. Slice 16's
  builder could not produce contention with 36 long-lived busy processes: wall-clock time stayed at most 1.64 times CPU
  time within each run (record lines 773-784). The failures of 2026-10-12 came with wall-clock times under load 4 to 15
  times the CPU times the same scans took alone in other runs (record line 644; a 2-MiB child of about 0.75 s alone took
  11 to 12 s): loaded wall-clock against unloaded CPU, not a ratio within one run (Decision 64). Whether this build's
  load reaches that contention is not known; stop rule 5 makes it a condition of done (Decision 33). The old case's
  failure under it is recorded evidence, not a condition (stop rule 7, Decision 81, which reverses Decision 62).
- What a slow core does to a child's CPU time, and how often a child gets one. On this machine's performance and
  efficiency cores the same scan costs more CPU time on the slower kind (believed), and macOS tells Node nothing of
  where a child ran. Probe 9 measures the cost with more concurrent children than performance cores, Step 9's children
  show how often a child runs slow, and stop rule 6 turns both into a flake probability with a bound fixed in advance
  (Decisions 65 and 66).
- Which side is inflated in a failing run, by how much, and whether a child's inflation grows with its length.
- How much CPU time garbage collection takes inside the timed span.
- The CPU-time step on this machine.
- For the new design: that V8 compiles a regex to native code at its first run on a long subject (believed: V8 tiers up
  at once for a subject of 1000 characters or more, and otherwise after one interpreted run). The sixteen warm-up scans
  make the design independent of it (Decision 43), and Step 8 measures it.
- For the two injected cases: what a pass of the window-24 call regex costs against the real one (believed about a
  fifth), what the rest of their scan costs per MiB (since Decision 67 its two reads alone, the other four regexes
  returning no match without running; believed 0.5 to 2 ms, where the real scan's rest, with those four regexes, is
  believed 2 to 8 ms), the fixed cost of one scan (its directory walks and existence checks; believed 0.3 to 1 ms), and
  so the sensitivity scan's quadratic-to-linear ratio at 1 MiB (believed 0.96 to 0.99) and both injected cases'
  exponents. Step 8's probe 7 and its control row measure them.
- That extra passes of a regex over the same text cost per character what its first pass costs (believed). In slice 16's
  S-K and S-L variants each extra pass of the call regex inside the 2-MiB scan added 1.07 to 1.36 times the whole first
  scan (computed from its record lines 666-671 and 764-765, against each round's smallest control scan), cause unknown;
  if that holds here, the sensitivity scan's ratio exceeds 1. Probe 7 measures the ratio; stop rule 4 stops the build
  above 1.10, and a ratio from 1.0 to 1.10 is recorded as the sensitivity case's strength above slice 16's case
  (Decision 86).

**The fix.**

*An operation count (approach a) is not available.* The scan's real cost is the backtracking inside one
`RegExp.prototype.exec` call per regex per scan, inside V8's regex engine, and no injection point, option or counter
exposes it to JavaScript. Every count JavaScript can see is the same for a linear and a quadratic regex: on this corpus a
scan visits one surface file, reads it twice, makes five `exec` calls and finds no match, at every size, and the historical
unbounded regex (14 minutes at 1 MiB, test header lines 6-16) makes exactly the same calls. A count of them measures the
scan's structure, not its behaviour, and would pass the very regression this test exists for. Counting backtracks needs a
debug build of V8, a flag that changes the engine's behaviour (`--enable-experimental-regexp-engine-on-excessive-backtracks`,
which neither `npm test` nor the fence runs under, and which would hand an excessive backtracker to another engine:
Decision 2), or hardware counters that Node cannot read without a native module. So this slice uses a robust timing
design (approach b).

*The design.*
1. **Equal work per child.** Every child scans the same 4 MiB of text: the 4-MiB corpus once, the 2-MiB corpus twice,
   the 512-KiB corpus eight times, the 256-KiB corpus sixteen times. For a linear scan every
   child then does the same work for the same CPU time with the same allocations, so load, which only ever adds CPU time
   and adds more to a longer child, reaches every size alike. This removes the minimum estimator's bias at its source.
2. **Four sizes spanning a factor of 16** (256 KiB, 512 KiB, 2 MiB, 4 MiB; 1 MiB, which would weigh exactly 0 in the
   fit, is not measured: Decision 35), three interleaved rounds, each round one child per size: rounds 1 and 2 in the
   order 512 KiB, 4 MiB, 256 KiB, 2 MiB, round 3 in its reverse, so that one spell of load that starts or stops partway
   through a case tilts the fit by at most 0.1 × log2 of its inflation (the stretch weights below; Decision 36).
3. **Garbage collection and one-time costs out of the timed span.** `npm test` starts the test processes without
   `--expose-gc` (`src/scripts/test-gate.js` line 426), so the test never relies on `gc()` in its own process. It starts
   each child with `--expose-gc`; the child scans a 4-KiB corpus sixteen times untimed, calls `gc()`, and only then
   times its scans. A child that finds no `gc()` exits with its own status and the case fails, naming it. The warm-up
   is not there for one-time costs: under equal work a cost paid once per child adds the same share to every size. It
   is there for a first run whose cost grows with its input: an interpreted first pass of a regex would be all of the
   4-MiB child's timed work but a sixteenth of the 256-KiB child's, and would raise the fit (Decision 43).
4. **A fitted exponent and its bound.** A size's cost per scan is its child's CPU time divided by its number of scans;
   the smallest of the size's three samples is its estimate; the least-squares slope of log2(cost) on log2(size) over
   the four sizes is the exponent b of cost = a × size^b. The bound is 1.25: a linear scan fits 1, and a scan whose
   quadratic part equals its linear part at 1 MiB fits exactly 1.5 over these sizes; 1.25 is the midpoint. The
   arithmetic below gives its margins, with and without load.
5. **Two permanent injected cases.** Each runs the same measure on a scan injected inside its own children and asserts
   that the measure fails it (an exponent of at least 1.25). In those children `SURFACE_CALL_RE` is swapped for the call
   regex with a window of 24 characters (`INJECTED_SOURCE`), a pass about a fifth as costly as the real one (believed;
   Step 8 measures it). At a scan's first call the swapped regex scans size × size / 1 MiB characters of the text, as
   whole passes and one pass that starts that many characters before the end: one pass at 1 MiB, four at 4 MiB, the last
   64 KiB at 256 KiB. That is the quadratic part, made by the regex engine itself and growing as the square of the input.
   - **The sensitivity case** then makes the regex's own pass too, so its quadratic part equals its call regex pass at
     1 MiB. Its reads and walks add only to its linear side, so its quadratic part is at most its linear scan at 1 MiB
     when an extra pass costs what the first does (a ratio of about 0.96 to 0.99, believed; Step 8 measures it). It
     stands for slice 16's sensitivity case, a quadratic part equal to the linear scan at 1 MiB, which the ratio check
     failed at 3.02 to 3.09 against 2.83 (slice 16's record lines 701-705 and 761-763), and at a measured ratio of at
     most 1 it is never easier to fail than that case (Decision 25). A ratio from 1.0 to 1.10 is recorded as its
     strength above that case, worth at most 0.021 in the fit; above 1.10 the build stops (Decision 86).
   - **The quadratic case** makes no pass of its own: the call regex's whole cost is its quadratic part.
   - **Both time the call regex alone** (ruling 6 of round 2; Decision 67). In their children every other regex of the
     scan returns its no-match result without running: the four other surface regexes find no match on a run of one
     letter anyway, each beginning with a word that never occurs in it, so what they would add is linear work that only
     dilutes the injected quadratic part. Each child counts those calls, and a count other than four per scan fails
     the case.

   No source file is edited: the swap replaces `RegExp.prototype.exec` inside those children only. There the one regex
   whose source text is `SURFACE_CALL_RE`'s runs the injected regex, every other regex returns its no-match result
   without running (the bullet above), and each child counts its swaps and its skips, so that a missed swap, or a skip
   count other than four per scan, fails the case.
6. **Bounds.** The 3000-ms bound on each 2-MiB scan's CPU time is unchanged; the 2-MiB child runs two scans and its CPU
   time is divided by two (Decision 24). The wall-clock kill of each child goes from 25000 ms to 50000 ms, with its
   reason (Decision 23). Three samples per size and the two `SEMANTICS PRESERVED` describes are unchanged.
7. **Three test files and a helper** (ruling 1 of round 2; Decisions 55 to 57). The real scan's case and the two injected
   cases run in two new test files, side by side under `npm test`, through one measure in a helper; the existing file
   keeps only its semantic checks.

*The arithmetic behind the sizes, the fit and the bound.* Computed by hand for this revision; Step 8's probe 8 recomputes
every figure, and Steps 8 and 9 measure the exponents.

- **Model.** A scan costs T(n) = a·n + b·n². Write x = n / 1 MiB, count cost in units of the linear scan at 1 MiB, and
  let q = b·(1 MiB)² / (a·1 MiB), the quadratic part over the linear part at 1 MiB. Then T = x + q·x², and
  log2 T = log2 x + log2(1 + q·x). The least-squares slope of log2 T on u = log2 x is E = Σ w_i·log2 T_i, with weights
  w_i = (u_i − ū) / Σ_j (u_j − ū)² that sum to 0 and grow with size, so E = 1 + Σ w_i·log2(1 + q·x_i): a linear scan
  fits exactly 1, a pure quadratic exactly 2, and E rises with q.
- **Load.** Load that inflates one size's estimate f times moves E by w_i·log2 f: up for a size with a positive weight,
  down for one with a negative weight. The harm is worst at an end size: the largest pushes a linear scan toward
  failing, the smallest pushes a quadratic one toward passing. At f = 1.6, the worst inflation recorded on 2026-10-12
  (the first row of the table above), the shift is w × 0.678. Load that inflates every size alike, the 1.3 times of the
  loaded full suite, moves no size against another and leaves E where it was.
- **The CTO Chief's three figures, checked.** For q = 1: over 256 KiB to 2 MiB, E = 1.420; over 1 to 2 MiB,
  log2 3 = 1.585; over 1 to 4 MiB, 0.5 × log2 10 = 1.661 (least squares over 1, 2 and 4 MiB gives the middle size
  weight 0, so it equals the 1-to-4-MiB pair).
- **The candidates.** Each row gives the largest weight; E for a linear scan, for a linear scan with its worst size
  inflated 1.6 times, for q = 1, for q = 1 with its worst size inflated 1.6 times, and for a pure quadratic; then the
  bound midway between the two inflated figures (for slice 16's row, its own bound), and the margin it leaves on each
  side of them.

| Sizes and fit | Largest weight | Linear | Linear, worst size × 1.6 | q = 1 | q = 1, worst size × 1.6 | Pure quadratic | Bound | Margin under × 1.6 |
|---|---|---|---|---|---|---|---|---|
| 1 and 2 MiB: slice 16's ratio check, as an exponent | 1 | 1.000 | 1.678 | 1.585 | 0.907 | 2.000 | 1.5 (2√2) | none: the linear scan fails |
| 256 KiB to 2 MiB, four sizes: this plan's first design | 0.3 | 1.000 | 1.203 | 1.420 | 1.217 | 2.000 | 1.21 | 0.007 |
| 1, 2 and 4 MiB, least squares | 0.5 | 1.000 | 1.339 | 1.661 | 1.322 | 2.000 | none | none: they overlap by 0.017 |
| 2 and 4 MiB, the top pair | 1 | 1.000 | 1.678 | 1.737 | 1.059 | 2.000 | none | none: they overlap by 0.619 |
| 512 KiB to 4 MiB, four sizes (512 KiB, 1, 2 and 4 MiB) | 0.3 | 1.000 | 1.203 | 1.580 | 1.376 | 2.000 | 1.29 | 0.086 |
| **256 KiB, 512 KiB, 2 MiB and 4 MiB: chosen** (with 1 MiB added, the same: its weight is 0) | **0.2** | **1.000** | **1.136** | **1.500** | **1.364** | **2.000** | **1.25** | **0.114** |
| 512 KiB to 8 MiB, five sizes | 0.2 | 1.000 | 1.136 | 1.649 | 1.514 | 2.000 | 1.32 | 0.189 |

  Two figures of this table were corrected in the revision after review round 1 (Decision 52). 512 KiB to 4 MiB: weights −0.3, −0.1, 0.1,
  0.3; q = 1 fits 1 + (−0.3 × 0.585 − 0.1 × 1 + 0.1 × 1.585 + 0.3 × 2.322) = 1.5796; inflated, 1 + 0.3 × 0.678 = 1.2034
  and 1.5796 − 0.2034 = 1.3762; the midway bound 1.2898 leaves 1.2898 − 1.2034 = 0.0864, so 0.086, not 0.087. 512 KiB
  to 8 MiB: q = 1 fits 1.6492, and with its 512-KiB size inflated 1.6 times 1.6492 − 0.2 × 0.678 = 1.5136, so 1.514,
  not 1.513.

  Moving the range up raises the q = 1 exponent (1.420 for 256 KiB to 2 MiB, 1.661 for 1 to 4 MiB), and widening it down
  lowers it (1.661, then 1.580 with 512 KiB, then 1.500 with 256 KiB). But widening also lowers each end size's weight
  (0.5, 0.3, 0.2), and so what one inflated size can do to the fit, and that gains more than the q = 1 exponent loses:
  1, 2 and 4 MiB leave no bound that a linear scan stays under and q = 1 stays over when one size is inflated 1.6 times;
  256 KiB to 4 MiB leave 0.114 on each side. A fifth size, 128 KiB, would add about 0.005: its u = −3 moves the mean to
  ū = −0.6, Σ(u − ū)² = 5.76 + 1.96 + 0.16 + 2.56 + 6.76 = 17.2, the weights become −0.140, −0.081, −0.023, 0.093 and
  0.151, q = 1 fits 1.435, and the midway bound 1.221 leaves 0.119 on each side, for three more children per case. The
  top pair weighs its two sizes ±1 and cannot separate the two at all. 8 MiB at the top would give 0.189, but every
  child would then scan 8 MiB (Decision 20).
- **Why 1 MiB is not measured** (Decision 35). Least squares weighs size i by w_i = (u_i − ū) / Σ_j (u_j − ū)², with u
  the log2 of the size in MiB. With 256 KiB, 512 KiB, 1, 2 and 4 MiB, u = −2, −1, 0, 1, 2, ū = 0 and
  Σ(u − ū)² = 4 + 1 + 0 + 1 + 4 = 10, so the weights are −0.2, −0.1, 0, 0.1 and 0.2: 1 MiB sits at the mean, and its
  samples cannot move the fitted slope at all. Without it, u = −2, −1, 1, 2, ū is still 0, Σ(u − ū)² is still 10, and the
  four weights are unchanged. Every exponent, margin and threshold of this section is therefore the same for the four
  sizes as for the five: each is Σ w_i × (a term of size i), and the 1-MiB term was multiplied by 0. Dropping 1 MiB saves
  three children per case and changes no figure.
- **The order of the rounds** (Decision 36). A size's estimate is the smallest of its three samples, so a spell of load
  moves it only when the spell covers all three. Rounds 1 and 2 run 512 KiB, 4 MiB, 256 KiB, 2 MiB (weights −0.1, +0.2,
  −0.2, +0.1) and round 3 the reverse. A spell that starts in round 1 and lasts to the end of the case covers exactly the
  sizes in the rest of round 1; one that starts in round 2 or 3 leaves every size its clean round-1 sample. A spell
  present from the start that stops in round 3 covers exactly the sizes run in round 3 before it stops; one that stops
  earlier leaves every size its clean round-3 sample. A spell from inside round 1 to inside round 3 covers a size when
  the size's round-1 place is at or after the spell's start and its round-3 place, 5 minus its round-1 place, at or
  before its end. Because round 3 is round 1 reversed, every one of these sets is a remaining stretch of round 1, and
  with one inflation f over the spell the fit moves by the stretch's total weight × log2 f. Each stretch, from a child to
  the end of its round:

| Round | From child 1 | From child 2 | From child 3 | From child 4 |
|---|---|---|---|---|
| 1 and 2: 512 KiB, 4 MiB, 256 KiB, 2 MiB | −0.1 + 0.2 − 0.2 + 0.1 = 0 | 0.2 − 0.2 + 0.1 = +0.1 | −0.2 + 0.1 = −0.1 | +0.1 |
| 3: 2 MiB, 256 KiB, 4 MiB, 512 KiB | 0.1 − 0.2 + 0.2 − 0.1 = 0 | −0.2 + 0.2 − 0.1 = −0.1 | 0.2 − 0.1 = +0.1 | −0.1 |

  - No stretch weighs more than 0.1, so a spell that inflates every child it covers f times moves the fit by at most
    0.1 × log2 f: 0.1 × 0.678 = 0.068 at f = 1.6, 0.1 at f = 2. A spell that starts or stops partway through a child
    inflates that child by less than f, which puts the shift between the figures of the two neighbouring stretches, so
    within the same bound. 0.1 is the least any order can do: the last child of a round is a stretch of its own, and no
    size weighs less than 0.1.
  - This order and its reverse are the only ones that do it. A stretch of three children weighs minus the first child's
    weight and a stretch of one weighs the last child's, so the first and last children must be the two sizes that weigh
    ±0.1, and the third must weigh 0.2 on the other side from the fourth. Round 3 must be the reverse: run in the same
    order, a spell from round 1's second child to round 3's second child would cover the 4-MiB size alone, +0.2.
  - **A load that starts after a run's first child returns and stays** (Step 9's mid-case runs, Decision 37) covers the
    stretch from child 2, +0.1. It raises a linear scan's fit by 0.1 × log2 f, 0.068 at f = 1.6, toward failing, and
    raises the two injected cases' fits by the same, away from failing. The stretch that lowers theirs, −0.1 from child
    3, is not run.
  - **The old case under the same load.** It ran 1 MiB, 2 MiB, 1 MiB, 2 MiB, 1 MiB, 2 MiB (test lines 139-141), and its
    ratio is an exponent over one doubling, weights −1 and +1. A load that starts after its first child returns covers
    all three 2-MiB samples and leaves one clean 1-MiB sample: the ratio rises f times, when the load covers the first
    2-MiB sample whole (with a share c of it, (1 − c) + c·f times; Decision 82). A run whose clean ratio is 1.97 to
    2.10 (slice 16's record line 755) then fails from f = 2.83 / 2.10 = 1.35 to 2.83 / 1.97 = 1.44. Step 9's reproduction
    runs exactly this, its load started before the run and released at the first child's end so that it covers that
    sample, and records c for each such run, so it can show the old case failing at a load inside the 1.3 to 1.6 times
    recorded on 2026-10-12.
- **The chosen design's four expected exponents** (the model has no fixed cost; the bound is 1.25):
  - **Linear:** 1.000, **0.250 under** the bound.
  - **Linear with one size inflated 1.6 times:** 1.136 at worst (the 4-MiB size), **0.114 under**. With any one size
    inflated 1.3 times, at most 1.076; with the 2-MiB and 4-MiB sizes both inflated 1.6 times, 1.203, 0.047 under. A
    linear scan fails only when one size is inflated 2.38 times against the others (2^(0.25 / 0.2)), the two largest
    1.78 times each, or a single 2-MiB child about 4.2 times, against the 3000-ms bound, which reads every 2-MiB child
    (3000 / 710; "What inflation turns a verdict" below); slice 16's ratio check failed it at 1.41 times on one size.
  - **The sensitivity case, q = 1:** exactly 1.500, **0.250 over** (the log2 3 and log2 5 terms cancel:
    [2(4 − log2 5) + (2 − log2 3) + (1 + log2 3) + 2(2 + log2 5)] / 10 = 15 / 10). With its 256-KiB size inflated 1.6
    times, 1.364, **0.114 over**.
  - **Pure quadratic:** 2.000, 0.750 over; with its 256-KiB size inflated 1.6 times, 1.864.
- **What inflation turns a verdict** (probe 9 and stop rule 6 compare with these). Inflating every sample of one size
  of weight w by f moves a fitted exponent by w × log2 f, so a verdict with margin m to the bound 1.25 turns at
  f = 2^(m / w):
  - the real case (exponent 1, margin 0.25): its 4-MiB size alone at 2^(0.25 / 0.2) = 2^1.25 = 2.38; its two largest
    sizes together (0.1 + 0.2 = 0.3) at 2^(0.25 / 0.3) = 2^0.833 = 1.78;
  - the sensitivity case (exponent E_s, margin E_s − 1.25): its 256-KiB size alone at 2^((E_s − 1.25) / 0.2), its two
    smallest sizes together at 2^((E_s − 1.25) / 0.3); at the floor E_s = 1.45 that stop rule 4 accepts, 2^1 = 2.00
    and 2^0.667 = 1.59; at the expected 1.479 to 1.494 (since Decision 67), 2^(0.229 / 0.2) = 2.21 to
    2^(0.244 / 0.2) = 2.33 and 2^(0.229 / 0.3) = 1.70 to 2^(0.244 / 0.3) = 1.76;
  - the quadratic case at its floor of 1.75: 2^(0.5 / 0.2) = 5.66 and 2^(0.5 / 0.3) = 3.17; at the expected 1.904 to
    1.970, 2^(0.654 / 0.2) = 9.65 to 2^(0.720 / 0.2) = 12.13 and 2^(0.654 / 0.3) = 4.53 to 2^(0.720 / 0.3) = 5.28;
  - one 2-MiB child against the 3000-ms bound, which reads every 2-MiB child and no minimum: a real scan of about
    0.71 s reaches it at 3000 / 710 = 4.2, the lowest threshold of all; an injected 2-MiB scan, about 0.85 / 2 = 0.42 s
    (sensitivity) or 0.57 / 2 = 0.28 s (quadratic), at 3000 / 423 = 7.1 or 3000 / 283 = 10.6.
- **The flake probability** (ruling 5 of round 2; Decision 66). Load or a slow core that inflates every sample of one
  size is the danger, because each size's estimate is the smallest of three samples. Let each child of a case run slow,
  independently, with probability s, a slow child costing R times its fast figure (probe 9 measures R), and write
  t = s³, the chance that all three samples of one size are slow. For the real case, with sizes a = 256 KiB, b = 512 KiB,
  c = 2 MiB and d = 4 MiB weighing −0.2, −0.1, +0.1 and +0.2, a set S of sizes whose samples are all slow moves the fit
  by log2 R × (the sum of their weights), and the case fails when that reaches 0.25:
  - **R under 1.78:** no set of sizes can do it (the largest sum is 0.3, and 0.3 × log2 1.78 = 0.25). Flake
    probability 0.
  - **1.78 ≤ R < 2.38, the two-size branch:** only S = {c, d} (sum 0.3) does it; adding a or b lowers the sum. Flake
    probability t²(1 − t)² = s⁶(1 − s³)²: 1.6 × 10⁻⁸ at s = 0.05, 1.0 × 10⁻⁶ at s = 0.1.
  - **2.38 ≤ R < 4.2, the one-size branch:** S must hold d and not a, and then any of {d}, {c, d}, {b, c, d} (sums 0.2,
    0.3 and 0.2) does it, while {b, d} (0.1) does not. Flake probability t(1 − t)[(1 − t)² + t(1 − t) + t²]
    = t(1 − t)(1 − t + t²): 1.25 × 10⁻⁴, 0.0125%, at s = 0.05, and 9.98 × 10⁻⁴, 0.0998%, at s = 0.1; it passes 0.1%
    just above s = 0.1.
  - **R ≥ 4.2:** one slow 2-MiB child alone fails the 3000-ms bound, so the flake probability is at least
    1 − (1 − s)³, about 3s: 3.0% at s = 0.01. It stays under 0.1% only for s ≤ 1 − 0.999^(1/3) = 0.00033, which
    Step 9's samples cannot show (an observed zero among N children bounds s at about 3 / N, so it would take about
    9000 children). Above R = 5.66 more sets of sizes add to it. In a loaded condition whose runs' median quotient
    (stop rule 6) reaches m, a fast 2-MiB child already costs about m times its ambient figure, so this path opens at
    R = 4.2 / m: 4.2 / 1.6 = 2.6 at the 1.6 times recorded (Decision 78).
  - **Each fit branch falls again as s nears 1** (Decision 78). A fit path needs some sizes slow and others fast. The
    two-size branch t²(1 − t)² has derivative 2t(1 − t)(1 − 2t); the one-size branch t(1 − t)(1 − t + t²)
    = t − 2t² + 2t³ − t⁴ has derivative 1 − 4t + 6t² − 4t³ = (1 − t)⁴ − t⁴. Between t = 0 and 1 both vanish only at
    t = ½, that is
    s = 2^(−1/3) = 0.794, where the two branches reach (½)²(½)² = 1/16 = 6.25% and ½ × ½ × (1 − ½ + ¼) = 3/16 = 18.75%,
    and both are 0 at s = 1, where every size is slow alike and the fit does not move. Only the 3000-ms path,
    1 − (1 − s)³, keeps rising with s.
  The injected cases mirror this with their own margins (their sets hold a = 256 KiB and lower the fit): the
  sensitivity case's branches start at about 1.70 to 1.76 and 2.21 to 2.33, the quadratic case's at about 4.53 and
  9.65. Stop
  rule 6 computes the exact probability over all 2¹² = 4096 ways a case's 12 children can be slow or fast, with the
  measured R, the case's measured fast figures and every s from 0 to s₉₅, the 95% upper bound of s from Step 9's
  children (each child judged against its own run), takes the largest value, not the value at s₉₅, and stops above
  0.1% per run, a bound stated here before any run.
- **The injected cases as built** carry two costs the model leaves out, both on the side that lowers their exponents: a
  fixed cost per scan (believed 0.3 to 1 ms) and their two reads (believed 0.5 to 2 ms per MiB, on the linear side; the
  scan's other four regexes return no match there without running, Decision 67). With them the sensitivity case is
  expected at about 1.479 to 1.494 and the quadratic case at about 1.904 to 1.970 (computed with those beliefs; Step 8
  measures them). In units of the window-24 pass over 1 MiB, p = 70 ms, write ρ = r / p and φ = f / p; at the cheap end,
  r = 0.5 ms and f = 0.3 ms, ρ = 0.00714 and φ = 0.00429; at the dear end, r = 2 ms and f = 1 ms, ρ = 0.02857 and
  φ = 0.01429.
  - **The quadratic case**, T(x) = ρx + x² + φ. Cheap end: T is 0.0686, 0.2579, 4.0186 and 16.0329 at 256 KiB,
    512 KiB, 2 MiB and 4 MiB, whose log2 are −3.8662, −1.9554, 2.0067 and 4.0030, and the fit is
    0.2 × 3.8662 + 0.1 × 1.9554 + 0.1 × 2.0067 + 0.2 × 4.0030 = 1.970. Dear end: T is 0.0839, 0.2786, 4.0714 and
    16.1286, log2 −3.5747, −1.8439, 2.0255 and 4.0115, and the fit is 1.904.
  - **The sensitivity case**, T(x) = (1 + ρ)x + x² + φ. Cheap end: T is 0.3186, 0.7579, 6.0186 and 20.0329, log2
    −1.6503, −0.4000, 2.5894 and 4.3243, and the fit is 0.2 × 1.6503 + 0.1 × 0.4000 + 0.1 × 2.5894 + 0.2 × 4.3243
    = 1.494. Dear end: T is 0.3339, 0.7786, 6.0714 and 20.1286, log2 −1.5824, −0.3611, 2.6020 and 4.3312, and the fit
    is 1.479. Its q at 1 MiB, the quadratic part over the linear scan, is 1 / (1 + ρ + φ): 1 / 1.0429 = 0.959 to
    1 / 1.0114 = 0.989.
  So the sensitivity case's own margin is thinner than q = 1's: 1.479 − 1.25 = 0.229 to 1.494 − 1.25 = 0.244 with no
  load, and 0.229 − 0.136 = 0.093 to 0.244 − 0.136 = 0.108 with its 256-KiB size inflated 1.6 times. The stop rules hold it to at
  least 1.45 at ambient load and 1.31 under load (Decision 28). Before Decision 67, with the four other regexes in its
  scan (r = 2 to 8 ms per MiB), it was expected at 1.46 to 1.49 and the quadratic case at 1.830 to 1.946.
- **Run time against the bounds** (estimates; Step 8 measures the children, Step 12 the files):

  A sensitivity child of size x MiB costs about 4(p + r) + 4x·p + (4 / x)·f and a quadratic child
  4r + 4x·p + (4 / x)·f, with p the window-24 pass (about 0.07 s per MiB, a fifth of the real one), r the rest of the
  injected scan (its two reads since Decision 67, 0.5 to 2 ms per MiB) and f the fixed cost of one scan (0.3 to 1 ms);
  the figures below take p = 70 ms, r = 1 ms and f = 0.6 ms (all believed; probe 7 measures them). For the sensitivity
  case at 256 KiB, for example, 4 × 71 + 4 × 0.25 × 70 + 16 × 0.6 = 284 + 70 + 9.6 = 363.6 ms. Every child also pays
  about 0.1 s of start-up.

| Case or file | Children | CPU time per child (256 KiB, 512 KiB, 2 MiB, 4 MiB) | At ambient load |
|---|---|---|---|
| real-scan case | 12 | about 1.42 s each (4 MiB at about 0.355 s per MiB) | 12 × 1.52 s = about 18 s |
| sensitivity case | 12 | about 0.36, 0.43, 0.85 and 1.40 s (sum 3.04 s) | 3 × 3.04 s + 12 × 0.1 s = about 10.3 s |
| quadratic case | 12 | about 0.08, 0.15, 0.57 and 1.12 s (sum 1.92 s) | 3 × 1.92 s + 12 × 0.1 s = about 7.0 s |
| the real-scan file | 12 | | about 18 s |
| the controls file | 24 | | 10.3 + 7.0 = about 17.3 s, beside the real-scan file |
| the kept file | none | | believed about 0.3 to 1 s: the old file took 4.1 s in slice 16's Step 12 with six scan children of about 3 × (0.35 + 0.1) + 3 × (0.72 + 0.1) = 3.8 s, which leaves about 0.3 s for its semantic checks (a loaded run; Step 12 measures it) |

  - **The 3000-ms bound per 2-MiB scan:** a real 2-MiB scan stays at about 0.71 s, 4.2 times under, as today; the
    injected cases' 2-MiB scans take about 0.85 / 2 = 0.42 s and 0.57 / 2 = 0.28 s.
  - **The kill ceiling:** at the heaviest load recorded, where a 2-MiB child of about 0.75 s took 11 to 12 s, a child
    doing twice that work takes about 22 to 24 s: 1 to 3 s under the old 25 s, about half of the new 50 s, which is the
    margin a 2-MiB child has against 25 s today (Decision 23). The injected children are no longer than the real ones.
    Under that load each new file would take roughly 18 s × 12 = 3.6 minutes to 18 s × 15 = 4.5 minutes, the two side
    by side (wall-clock time 12 to 15 times CPU time).
- **Against the time limits** (Decisions 58 to 61, which replace Decisions 39 and 40).
  - **The limits.** Push (`src/commands/push.js` line 101, `runSmartTests`) and the hotfix check
    (`src/lib/hotfix-check.js` line 1861, `runFullTests`) both reach `npm test` through `runCommandArgv`
    (`src/lib/quality-agent.js`): `runFullTests` (line 1030) and the fallback of `runSpecificTests` (line 971), which a
    `node:test` project always takes, pass no time limit, so the run gets the default of 300000 ms (line 178). A run that
    reaches it is undetermined, neither a pass nor a fail (lines 1019-1022), so a push or a hotfix check whose suite
    takes over 300 s cannot pass. The menu's completion check, which runs Step 14's checks when a build finishes
    (`persistVerifyResult`, called from `src/lib/actions.js` line 1378), gives each command 900000 ms
    (`src/lib/step-13-verify.js` line 734, `resolveVerifyTimeout`, unless `CTOC_VERIFY_TIMEOUT_MS` sets another), and a
    run cut there is reported uncertified, never as a test failure (its line 751). An agent's command in the foreground
    stops at 10 minutes, and operating lesson 20 starts anything longer in the background.
  - **Files run side by side.** `src/scripts/test-gate.js` passes every test file to one `node --test` with no
    concurrency flag (line 426), so Node runs each file in a process of its own, several at once: up to
    `os.availableParallelism()` − 1, 17 on this 18-core machine (confirmed for Node 26.10.0 by the round-2 critic, not
    re-run here; probe 1 records the Node version and core count the build runs on). That files run at once is on
    record: the 852-s test of July 2026 made the whole suite 864 s (the kept file's header lines 6-9), and two files run
    together slowed each other's scans on 2026-10-12 (slice 16's record line 736). The gate lists the files with
    `readdirSync` (lines 265-270), and the runner starts them in name order (confirmed by the round-2 critic; the
    faster-suite plan reads the same from Node's documentation and source, its line 58). The controls file is the 235th
    and the real-scan file the 236th of 577, and the kept file the 410th (Decision 57).
  - **What sets the suite's length today: `tests/hotfix-check.test.js`.** In the faster-suite round's slice 1 record
    (its worktree, `plans/done/the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md`, lines
    1456 and 1459), `node --test tests/*.test.js` over 567 files took 241.18 s at a load of 16.8 to 65.0, and its
    longest file was `tests/hotfix-check.test.js` at 233.77 s, then `tests/quality-agent-coverage.test.js` at 79.47 s.
    That round's split of the file is in its worktree, not in main: main's `tests/hotfix-check*.test.js` are that file,
    `-corpus` and `-differential` (a `Glob`, 2026-10-14). Files run side by side and the suite ends when its last file
    ends, so a file of about 234 s sets the suite's length.
  - **What this slice adds in main: about 3 s.** Inside the suite the timing cases take about 1.3 to 1.44 times their
    time alone (the suite's own load on 2026-10-12: a 2-MiB scan's CPU time, and the old file's 5.91 s inside the suite,
    the faster-suite plan's slice 5, against 4.1 s alone = 1.44; a loaded baseline, record line 798, so Step 12 measures
    it again): 35.3 × 1.3 = 46 s to 35.3 × 1.44 = 51 s across the two new files (18 + 10.3 + 7.0 = 35.3 s alone), which
    with the kept file's under 1 s is about 46 − 5.9 = 40 s to 51 − 5.9 = 45 s more than the old file's 5.9 s. The two
    new files start after 234 of the 577 files, 41%, and take about 18 × 1.3 = 23 s to 18 × 1.44 = 26 s each inside the
    suite, so they end long before a 234-s file: they lengthen the suite only through the share of the machine they take
    from the other files, at most 45 / 17 = 2.6 s, about 3 s, while the other slots stay busy.
  - **The 300-s cap is already exceeded at ambient load, for other reasons: a finding for the owner** (Decision 59).
    The CTO Chief's baseline of 2026-10-12 (the faster-suite plan in its worktree, line 51) took 368.5 s for
    `npm run test:raw` over 567 files, at a one-minute load of 17.2 to 30.5 and with no coverage; its two failures were in
    this test's wall-clock version (its line 52). The other recorded whole-suite times are 235 s (`npm test`, load 11.6
    to 19.9, slice 16's record line 737), 241.18 s (above) and 202 s (`npm test` started at a load of 41.8, line 793). So
    push and the hotfix check cannot count on passing at ambient load today, with or without this slice. The
    faster-suite round addresses it (its slice 1 splits the 234-s file). It is listed for the owner under Neighbours and
    is not this slice's stop: stop rule 8 holds this slice to its own cost.
  - **Under load, with and without this slice** (Decision 60). A load that slows every process alike by a factor c
    (wall-clock time over CPU time) stretches every file alike, so the suite stays set by its longest file: about
    241 s × c without this slice and about (241 + 3) s × c with it, in the faster-suite builder's run. 241.18 s × c passes
    300 s from c = 300 / 241.18 = 1.24, with or without this slice; the 368.5-s run is past it at c = 1. At the
    contention of the real failures, c = 4 to 15 on their basis (Decision 64), the 234-s file takes 234 × 4 = 936 s,
    15.6 minutes, to 234 × 15 = 3510 s, 58.5 minutes, and each new file 18 × 4 = 72 s to 18 × 15 = 270 s, 1.2 to
    4.5 minutes; the slice adds about 3 s × c, 12 to 45 s. The completion check's 900 s per command is passed from
    c = 900 / 241.18 = 3.7, with or without this slice.
  - **The worst case, stated in the headers.** The real-scan file's 12 children, each stopped just short of the 50-s
    kill, take 12 × 50 s = 600 s, 10 minutes; the controls file's 24 take 24 × 50 s = 1200 s, 20 minutes. Side by side
    the two end within 20 minutes, 1800 s of child time in all: 1200 / 300 = 4 times the push cap, 1200 / 900 = 1.3
    times the completion check's limit, and twice an agent's foreground limit. A child reaches the kill only at a
    wall-clock-to-CPU ratio of about 50 / 1.5 = 33, beyond the 15 recorded.
  - **Builders' affected-test runs.** A builder whose plan touches `src/lib/reachability.js` or one of these files runs
    them as its affected tests (the Execution Plan's rule for builders): the two new files, side by side, about 18 s at
    ambient instead of the old file's 4 s, and about 3.6 to 4.5 minutes under the heaviest load recorded, inside an
    agent's 10-minute foreground limit. The kept file alone, which the agent-and-skill improvement program runs for every
    file of its inventory, three rounds each, takes about 0.3 to 1 s (believed) instead of about 4 s.

*What it still does not see, stated.*
- **What it times** (ruling 11 of round 2; Decision 72). The check times the scan of one input, a run of one letter. On
  it only the call regex, `SURFACE_CALL_RE`, does real work: the other four surface regexes (`SURFACE_NODE_RUNS_RE`,
  `SURFACE_REQUIRES_RE`, `SURFACE_REQUIRE_DOT_RE`, `SURFACE_REQUIRE_IDX_RE`) each begin with a word, `node` or
  `require`, that never occurs in it, so they fail at the first character of every position. **A super-linear change to
  any other surface regex, or one that needs another input (a `(`, a quote, a line break, a mix of letters), is not
  seen.** A change that removed one of those leading words would run on this input and could be.
- The fit fails a scan from q ≈ 0.293, where E reaches 1.25: E(0.2925) = 1.24993 and E(0.293) = 1.25022, so E = 1.25
  at q = 0.2925 + 0.0005 × 0.0000685 / 0.0002917 = 0.2926 (Decision 73). That is a quadratic part at least
  0.293 times the linear scan at 1 MiB, which is at least 0.293 × 4 = 1.17 times the linear scan at 4 MiB. **A quadratic
  part under 0.293 times the linear scan at 1 MiB, under 1.17 times it at 4 MiB, passes.** With the scan's 256-KiB size
  inflated 1.6 times the threshold rises to q = 0.59. Whatever the fit says, the 3000-ms bound fails a scan from about
  q = 1.6 at this machine's speed (0.71 s + 4q × 0.355 s reaches 3 s).
- Slice 16's ratio check failed from q = 0.71 (its ratio (2 + 4q) / (1 + q) reaches 2√2 there), and with its 1-MiB size
  inflated 1.6 times it failed no q below the 3000-ms bound's 1.6.
- So, in this model, the new check fails every scan the ratio check failed, fails 0.293 ≤ q < 0.71 as well, and still
  fails from q = 0.59 where one inflated size left the ratio check failing nothing. That is greater sensitivity than the
  ratio check's, not equal sensitivity. Both miss a smaller quadratic part: the new check below 0.293, the ratio check
  below 0.71. The model has no fixed cost; the real scan's (believed under 1 ms per scan, against about 89 ms at
  256 KiB) lowers the fit by under 0.01.

## Implementation Details

### Dependency Graph

The three files this slice creates are named after this plan, whose file name without `.md` is
`four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load` (102
characters). Below, "the helper" is `tests/helpers/` + that name + `.js`, "the real-scan file" is `tests/` + that name +
`-real.test.js`, "the controls file" is `tests/` + that name + `-controls.test.js`, and "the kept file" is
`tests/reachability-surface-scan-is-linear.test.js`. Their full paths are in `files:` and in the headings below.

```
the real-scan file  --requires--> the helper
the controls file   --requires--> the helper
the helper
  --spawns, with --expose-gc--> node -e <runner program>
      --requires and calls--> src/lib/reachability.js#analyzeExports (unchanged)
      (the two injected cases only) --replaces inside that child--> RegExp.prototype.exec: the regex whose source is
           SURFACE_CALL_RE's (src/lib/reachability.js line 654) runs the injected regex instead, and every other regex
           returns its no-match result without running
the kept file       --requires and calls--> src/lib/reachability.js#analyzeExports and #analyze (unchanged)
src/scripts/test-gate.js (npm test) --runs--> tests/*.test.js (resolveTestFiles, lines 265-270; the spawn, line 426)
```

No change under `src/`, `src/hooks/` or `.ctoc/`. The helper follows how this repository already shares test code:
`tests/helpers/` holds three helpers (`metadata-invariant.js`, `source-of-truth.js`, `agent-resolver.js`), each a
CommonJS module with `'use strict'`, JSDoc and one `module.exports`, required as `require('./helpers/<name>')` (the
search `require\(['"]\./helpers/` over `tests/` matched 5 lines: `tests/agent-dispatch-resolution.test.js` line 24,
`tests/agent-resolver.test.js` line 19, `tests/version-license-invariant.test.js` line 17, `tests/release.test.js` line 19,
`tests/skill-loading.test.js` line 27). The faster-suite round split `tests/hotfix-check.test.js` the same way, into six
test files and `tests/helpers/hotfix-check-harness.js` (its slice 1 record, line 1463, in its worktree
`.claude/worktrees/agent-a622e500a3eb88033/`). A file under `tests/helpers/` neither ends in `.test.js` nor lies directly
in `tests/`, so `resolveTestFiles` (`src/scripts/test-gate.js` lines 265-270) never runs it and `computeDocCounts`
(`src/lib/doc-counts.js` line 84, `listFlat(root, ['tests'], '.test.js')`) never counts it. Unlike main's three helpers,
this one asserts: the checks on each child are part of the measure, and the controls prove the measure the real check
uses only if both files run the same code (Decision 56).

### File Specifications

Six files. Four files under `tests/` hold the change (three test files and the helper, which is not a test file and
moves no count: Decision 57); the two documents hold the test-file count. The sizing rule's "about 1 to 3
files" is exceeded by one on the CTO Chief's ruling 1 of round 2, which split the file (Decision 55).

#### File: `tests/reachability-surface-scan-is-linear.test.js` (the kept file)
**Action:** MODIFY
**Purpose:** keeps only the semantic checks of the bounded regex: the agent-and-skill improvement program's inventory
(`.ctoc/audit/agent-and-skill-improvement/inventory.json`, 225 matching lines, one per inventoried file) runs this file
for each of its files, three rounds each, for those checks alone.
**Change Type:** modify-existing

##### Changes, by region of the file as committed at 8e7798cf
1. **Lines 1-22** (the title and "WHY (2026-07-29, MEASURED)", the ReDoS history, ending with the blank comment line
   before "WHY A CHILD PROCESS"): unchanged but for line 4, the title. It reads
   ` * THE DEAD-EXPORT FENCE'S SURFACE SCAN IS LINEAR — a ReDoS regression guard.` and becomes
   ` * THE DEAD-EXPORT FENCE'S SURFACE SCAN — the semantic checks of its ReDoS fix.`, because the file no longer holds
   the check that the scan is linear (Decision 87).
2. **Lines 23-54** ("WHY A CHILD PROCESS" and "WHY CPU TIME AND A RATIO (2026-10-12)"): replaced by the kept file's text
   under "Header texts" below. Their subject, the timing check, moves to the real-scan file, whose header keeps "WHY A
   CHILD PROCESS" with its last sentence rewritten (Decision 72). Line 55 (` */`) stays.
3. **Lines 57-61 and 63-67** (the `require`s of `node:test`, `node:assert/strict`, `node:fs`, `node:os`, `node:path`, and
   `REACH`, `ROOT`, `EXPORT_BASELINE`, `FILE_BASELINE`): unchanged; all are used by the two describes that stay.
4. **Line 62** (`const { spawnSync } = require('node:child_process');`): removed. Nothing left in the file spawns, and the
   lint rule `no-unused-vars` is an error (`eslint.config.js` lines 85-93).
5. **Lines 68-177** (from the blank line after `FILE_BASELINE` to the blank line before the first `SEMANTICS PRESERVED`
   describe: the constants, `makeSingleCharCorpus`, `runScanBounded`, `machineLoad` and the ratio case): replaced by one
   blank line. The measure goes to the helper and the timing case to the real-scan file. Nothing outside this file names
   what goes: the search `runScanBounded|makeSingleCharCorpus|MAX_RATIO|RUNS_PER_SIZE|MAX_2MIB_CPU_MS` over the
   repository outside `plans/` (the git-ignored `.claude/` and `node_modules/` are not searched) matched 1 file, this one
   (2026-10-14).
6. **Lines 178-239** (the two `SEMANTICS PRESERVED` describes): unchanged, byte for byte. Both stay: the second runs the
   dead-export and file fences on the real repository, and the first checks the bounded regex's semantics on a three-line
   corpus in milliseconds; "its real-repository semantic checks" is read as both (Decision 55).

#### File: `tests/helpers/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load.js` (the helper)
**Action:** CREATE
**Purpose:** the measure: the corpora, the child program, the per-child checks, the fit and every constant the measure
and its bound use, shared by the real-scan file and the controls file.
**Change Type:** new-module (a test helper; no `src/` module)

Its content, in order: the helper's header (under "Header texts" below), then the requires, then the code blocks
"Constants", "Corpus, load, child, size name and fit" and "The measure" below, then
`module.exports = { MAX_EXPONENT, SURFACE_CALL_SOURCE, INJECTED_SOURCE, measureScaling, machineLoad };`. Those five are
what the two test files use; nothing else is exported.

```js
'use strict';

/**
 * (the helper's header, under "Header texts" below)
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REACH = path.resolve(__dirname, '..', '..', 'src', 'lib', 'reachability.js');
```

#### File: `tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-real.test.js` (the real-scan file)
**Action:** CREATE
**Purpose:** the timing check of the real scan: equal work per child at four sizes spanning a factor of 16, a fitted
exponent under 1.25, and every 2-MiB scan under 3000 ms of CPU time.
**Change Type:** new test file; the case moves from the kept file with its `describe` name and its case name

#### File: `tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-controls.test.js` (the controls file)
**Action:** CREATE
**Purpose:** proves on every run that the same measure fails a scan whose quadratic part equals its call regex pass at
1 MiB, and a purely quadratic scan.
**Change Type:** new test file

The two test files' content is under "The two test files" below.

#### File: `README.md` and `CLAUDE.md` (the test-file count)
**Action:** MODIFY, three numbers only
**Purpose:** the two new test files move the count of `tests/*.test.js`. `README.md`'s line
`├── tests/           575 test files (run with \`npm test\`)` (line 1145 on 2026-10-14) is asserted against the live count
by `tests/readme-numbers.test.js` lines 321-323, so without the update `npm test` fails; `CLAUDE.md`'s two lines,
`Run all 575 test files` (line 61) and `tests/  575 test files` (line 94), are generated by `src/scripts/release.js`
(lines 108-109) and not asserted, but `src/lib/documented-counts.js` makes a plan that creates a `tests/*.test.js` file
declare `CLAUDE.md`, so the build updates them too. Each number becomes the live count of `tests/*.test.js` after the two
files exist: 577 if no other work has added or removed a test file meanwhile (575 on disk on 2026-10-14, a `Glob` of
`tests/*.test.js`). The search `\b575\b` over `docs/`, `src/`, `.claude-plugin/`, `.ctoc/*.json`, `.ctoc/*.yaml` and the
top-level `.md` files matched exactly these three lines. Both documents already carry other work's uncommitted changes
(the git status at the start of this session lists both as modified), so the build edits these three numbers and nothing
else, never runs `release.js`, and the scope check compares the rest against copies taken at Step 9 (Decision 71).

##### Constants (the helper)

They replace the kept file's lines 69-87. `MAX_RATIO` is gone; `MAX_2MIB_CPU_MS` (3000), `MiB` and `RUNS_PER_SIZE` (3)
keep their values; `HARD_TIMEOUT_MS` goes from 25000 to 50000, with the reason in its comment (Decision 23);
`ROUND_ORDERS` gives each round's order of the sizes (Decision 36); `OTHER_EXECS_PER_SCAN` counts the regex calls the
injected cases skip (Decision 67). `MAX_EXPONENT` is one constant, read by the real-scan file's assertion and the controls
file's two (Decision 56).

```js
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
```

`callRegexSource(127)` is the string `([A-Za-z_$][A-Za-z0-9_$]{0,127})\s*\(`, which is what `SURFACE_CALL_RE.source` returns
for the literal at line 654 (believed; the injected cases' swap count proves it at every run, and the missed-swap variant
of Step 8 proves the count fails when it does not hold).

##### Corpus, load, child, size name and fit (the helper)

`makeSingleCharCorpus` and `machineLoad` move from the kept file (its lines 89-95 and 127-132); `makeSingleCharCorpus`
now takes the list of folders to remove and adds its folder to it before writing into it (Decision 75).
`runScanBounded` replaces the kept file's lines 97-125, keeps its name and gets a new signature.

```js
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
```

##### The measure (the helper)

It replaces the measuring half of the kept file's lines 134-176; the verdicts go to the two test files.

```js
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
```

##### The two test files

The real-scan file, in full but for its header (under "Header texts" below):

```js
'use strict';

/**
 * (the real-scan file's header, under "Header texts" below)
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
```

The controls file, in full but for its header:

```js
'use strict';

/**
 * (the controls file's header, under "Header texts" below)
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
```

Both test files run with `npm test` side by side with every other file, each in a process of its own (Decision 55).

Notes on the code, each load-bearing:
- **The check fails closed, as `docs/FENCES.md` asks of every check.** Its false-green fence names the class: "a check
  that reports a verdict on input it never received". Here `cpuMs` is `null`, never 0, when a child's one line cannot be
  read (the parser's no-match value is not a success value); a zero or non-finite figure and a non-finite exponent fail
  loudly instead of being fitted; and a blind instrument is failed by the two injected cases (the bullet "A blind
  measure cannot pass the two files" below). No constant this check enforces is widened: the exponent's bound is 1.25,
  under the 1.5 that the ratio check's 2√2 is per doubling, the 3000-ms bound is unchanged, and the kill ceiling, which
  guards hangs and no property, doubles with the work per child (Decision 23).
- **No retry, no skip, no early return.** Each case measures once and asserts once; a failure anywhere throws.
- **One measure, run by both files.** The real-scan file and the controls file call the same `measureScaling` in the
  helper, with its per-child checks, its fit and its constants. A copy of the measure in each file would let the
  controls pass on a copy while the real check's measure went blind (Decision 56).
- **A blind measure cannot pass the two files.** Equal work has one trap: a runner that timed nothing, or only a fixed
  cost, would print about the same figure for every child, and that figure divided by each child's number of scans fits
  an exponent of exactly 1, a perfect linear verdict. The zero guard catches a figure of 0; anything else fails the two
  injected cases, whose exponents then read 1 too. Step 8's constant-figure variant shows both halves (the real-scan
  case passes at 1.00, both injected cases fail at 1.00) and its zero-figure variant the guard (all three fail at their
  first child). This is why they run on every run (Decision 8).
- **A loosened bound cannot pass the two files.** `MAX_EXPONENT` is one constant in the helper. Raising it above the
  sensitivity scan's exponent (about 1.48 to 1.49) fails the sensitivity case; raising it above the quadratic scan's
  (about 1.90 to 1.97) fails the quadratic case as well (the raised-bound variant). A bound written into the real-scan
  file's assertion in place of `MAX_EXPONENT` would not reach the controls; that is an edit of the check's own line, which
  review reads, as it was when the check lived in one file.
- **The controls time the call regex alone** (Decision 67). In their children every regex other than the call regex
  returns null with `lastIndex` 0 without running, which is what each of the four returns on a run of one letter, and the
  child counts those calls; a count other than `OTHER_EXECS_PER_SCAN` per scan fails the case. The scan's other work
  is then its two reads, its walks and its existence checks.
- **The injected children are no longer than the real ones:** the sensitivity case's longest, its 4-MiB child, about
  1.40 s of CPU time and the quadratic case's about 1.12 s, against about 1.42 s for every real child (estimates; stop
  rule 4 holds each injected case's longest child to at most 2000 ms on the median of the control row's three runs,
  Decision 69). So the injected cases add no kill risk.
- **The 2-MiB bound reads one scan.** The 2-MiB child runs two scans, and its CPU time divided by two is what is
  compared with 3000 ms: the same quantity as before, a 2-MiB scan's CPU time.
- **The diagnostic lines begin with "real scan", "sensitivity scan" and "quadratic scan".** The test gate reads lines
  that start with `skipped`, `fail` or `all files` (`src/scripts/test-gate.js` lines 99, 122 and 158), and slice 16 also
  kept `tests` and `pass` off the start of a diagnostic.
- **The swap is confined to the child.** `RegExp.prototype.exec` is replaced only inside the two injected cases' child
  processes; the test processes and every other test are untouched.
- **The swap is an instrument control, not a mock of the code under test.** The real-scan case times the real scan with
  nothing replaced. The two injected cases test the measure, not the scan: they hand `measureScaling` and its fit a scan
  of known shape and assert that the measure fails it, a positive control for the instrument, and the measure runs
  unchanged in all three cases. CLAUDE.md's ban on mocked-away core logic is about a test that ends up testing its
  mock; here the code each case judges (the measure in the injected cases, the scan in the real-scan case) is never
  replaced.
- **What the swap preserves.** For its own pass the swapped regex copies `lastIndex` in and out, so `scan`'s loop
  (`src/lib/reachability.js` lines 686-690) behaves as with the real regex. Its quadratic part runs on the same regex
  object and ends in a failed `exec`, which leaves that object's `lastIndex` at 0. Without its own pass the call returns
  `null` with `lastIndex` 0, which is what the real regex returns on this corpus. Every other regex returns `null` with
  `lastIndex` 0 without running (`skipOthers`), what each of the four returns on this corpus: each is global and is
  read in a `while` loop that stops at the first `null` (lines 419-435 and 686-690). No regex matches the corpus, so
  every scan's result equals the real scan's; Step 8's skips-run variant shows it for the four skipped regexes
  (Decision 67).
- **The quadratic part's size is exact.** `text.length * text.length / MiB` is a whole number for every size and for the
  4-KiB warm-up (16 characters); the loop runs whole passes from position 0 while at least `text.length` characters are
  left, and one pass from `text.length - left` for the rest, so it scans exactly that many characters.

##### Header texts (written at Step 10; every `{…}` slot filled from the Execution Record)

Four headers. Each `{…}` slot is filled from the Execution Record of Steps 8, 9 and 12; no slot may remain.

**The kept file**, replacing its lines 23-54 (lines 1-22 above it, line 4 retitled as its change 1 says, and line 55,
` */`, below it stay):

```
 * WHERE THE TIMING CHECK IS (2026-10-14). The check that this scan stays linear is in
 * tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-real.test.js,
 * and the two cases that prove its measure fails a super-linear scan are in
 * tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-controls.test.js,
 * both measuring through
 * tests/helpers/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load.js.
 * They moved out of this file so that it holds only the semantic checks below: the
 * agent-and-skill improvement program runs it for every file of its inventory, three rounds
 * each, and the timing cases were {Step 12: the share of the old file's time they took} of
 * its run time. This file now runs in {Step 12: its time alone at ambient load}.
```

**The helper**, the comment block at its top:

```
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
 * at a wall-clock time about 33 times its CPU time.
 */
```

**The real-scan file**, the comment block at its top:

```
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
 * loadavg 15 to 19 on 18 cores). Each child of this check scans 4 MiB in all, about
 * 1.4 s of CPU time, and its timed scan took {Step 9: the median wall-clock time of the
 * meter's 4-MiB children at ambient load} of wall-clock time alone, so the 50-s kill is
 * approached only at a wall-clock time about 33 times the CPU time. The check is not free:
 * this file took {Step 12: its time alone at ambient load, and inside the whole suite}.
 *
 * WHY IT WAS REBUILT (2026-10-13). The ratio check of 2026-10-12 failed under load again
 * in another worktree. {Step 9: the reproduction in one or two sentences: the load and how
 * it was made, the batch's contention and CPU inflation, how many of how many runs failed,
 * the failing ratios, and which side was inflated by how much; or, when no run counted
 * under stop rule 7, "The cause is supported by the code, not reproduced", with the most
 * contended batch's contention and CPU inflation.} {Step 9: this check's
 * fitted exponents at ambient load and under each load kind, mid-case runs included, with
 * the load averages.}
 *
 * RUN TIME. 12 children. WORST CASE: each stopped just short of the 50-s kill,
 * 12 * 50 s = 10 minutes, against the 300 s that push and the hotfix check allow the whole
 * of `npm test` (src/lib/quality-agent.js), the 900 s per command of the menu's completion
 * check (src/lib/step-13-verify.js) and an agent's 10-minute foreground command.
 */
```

**The controls file**, the comment block at its top:

```
/**
 * THE LINEAR-SCAN MEASURE FAILS A SUPER-LINEAR SCAN: the controls of the timing check.
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
 * the linear scan: {Steps 8 and 9: its measured quadratic-to-linear ratio at 1 MiB, and,
 * when that ratio is above 1, its strength above a quadratic part equal to the linear scan
 * (Decision 86 of the plan); and its fitted exponents}. The other is purely quadratic:
 * {Steps 8 and 9: its fitted exponents}.
 * No source file is changed.
 *
 * RUN TIME. 24 children, none longer than the real check's: this file took {Step 12: its
 * time alone at ambient load, and inside the whole suite}. WORST CASE: each stopped just
 * short of the 50-s kill, 24 * 50 s = 20 minutes, against the 300 s that push and the
 * hotfix check allow the whole of `npm test`, the 900 s per command of the menu's
 * completion check and an agent's 10-minute foreground command.
 */
```

##### Error Handling
Each way a measurement can fail has its own assertion and message: a child killed at the ceiling (its size, scans, signal
and the load), ended by another signal, without `gc()` (status 20), crashed (its status, or the spawn error when there is
no status), with no positive CPU figure, with a swap count that differs from its scans, with a count of skipped regex
calls other than `OTHER_EXECS_PER_SCAN` per scan, a 2-MiB scan at or over 3000 ms (the 2-MiB child's CPU time over its
two scans), an exponent that is not a finite number, and each case's verdict. The child's stderr is not printed (as
today). The temporary corpora are removed in `finally`, including when a corpus could not be made or written: each folder
joins `made` before anything is written into it.

##### Cross-Platform Notes
- `spawnSync(process.execPath, [...])` with an argument array and no shell, as today. `--expose-gc` is a V8 option that
  `node` accepts on every platform (believed; Step 8 checks it on the installed Node).
- The helper's `require` path is built by `path.resolve`, and the two test files require it by a relative literal with
  forward slashes, which Node resolves on every platform (as the five existing `require('./helpers/…')` lines do).
- On Windows, CPU times advance in ticks of about 15.6 ms (believed). Equal work makes every child of the real-scan case
  about 1.4 s, so a tick is about 1.1% of it. The quadratic case's smallest child (about 0.084 s since Decision 67) can be
  off by about 15.6 / 84 = 19%, which moves its fitted exponent by at most about 0.2 × log2 1.19 = 0.05 (the end size's
  least-squares weight times the log of the error); the sensitivity case's smallest child (about 0.36 s) by about
  15.6 / 364 = 4.3%, 0.2 × log2 1.043 = 0.012.
- `os.loadavg()` returns zeros on Windows; `machineLoad` says so in words, as today.
- No path is built by string concatenation; temporary folders come from `os.tmpdir()` through `path.join`, as today.

### Test Plan

**Framework:** `node:test` with `node:assert/strict`, as the file uses today. The three cases in their two files are the
deliverable, so the evidence is that they guard the property (each fails on the scans it must fail) and that they no
longer fail on load (they pass, with the margins the Problem Statement computes, under each load kind and under a load
that makes the old case fail, recorded with its numbers). The kept file's two describes are unchanged and must pass.

**The harness lives in one scratch folder outside the repository, kept for the whole build** (Decision 83). The CTO
Chief names it in every continuation brief, so that every builder who continues the build uses the same folder. Step 14
deletes everything in it except `<scratch>/scope/`, which holds Step 9's scope baseline; Step 16 deletes the folder
after the scope check and confirms with `ps` that no load worker remains.
- `<scratch>` stands for that folder. The Execution Record writes it as `<scratch>`, never as an absolute path: this plan
  is committed, and an absolute path carries the home folder and the user name.
- `<scratch>/copy/` is the working tree copied with `fs.cpSync` **before any edit**, without `.git`, `node_modules` and
  `.claude`, retrying on `ENOENT` the way `stableRepoRoot` in `tests/iron-loop-enforcer.test.js` does (the live tree is
  busy). Its `tests/reachability-surface-scan-is-linear.test.js` is the old file, and stays so: the reproduction and
  Step 12's before runs use it. Step 8 writes the helper and the two new test files into the copy under their final
  names (`tests/helpers/…` and `tests/…-real.test.js`, `tests/…-controls.test.js`); all three resolve `REACH` to the
  copy's `src/lib/reachability.js`; record that its sha256 equals the repository's. The kept file is trimmed only at
  Step 10, in the repository.
- Variants are made on the scratch helper or the scratch real-scan file (the variant table says which), one at a time,
  from saved copies of both. After each variant both files are written back from the saved copies and their sha256
  compared with the saved copies'.
- **Commands.** One case at a time, with the gate's coverage flags (`src/scripts/test-gate.js` line 426) so that the
  children inherit the environment they have under `npm test`:
  `node --test --experimental-test-coverage --test-coverage-include=src/** --test-name-pattern="<pattern>" <file>`, run
  with the working folder set to the tree that holds `<file>` (the repository or `<scratch>/copy`), so the include names
  that tree's `src/`. The patterns: `doubling the input` (the old case in the old file, and the real-scan case in the
  real-scan file), `quadratic part equals` (the sensitivity case) and `deliberately quadratic` (the quadratic case), the
  last two in the controls file. Confirm from the run's summary that exactly one test ran; if not, fix the filter before
  recording anything.
- Every run records its pass or fail, its diagnostic line (or failure message) and `os.loadavg()` at its start.

**Step 8 probes** (small Node programs in `<scratch>`; every result recorded; probe 9 runs at the start of Step 9,
Decision 79):
1. `node --version`, `os.availableParallelism()`, `os.cpus().length`, `process.platform`.
2. `node --expose-gc -e "process.stdout.write(typeof globalThis.gc)"` prints `function`, and the same without the
   option prints `undefined`. From a throwaway test file in `<scratch>` run with the gate's flags: `typeof globalThis.gc`
   in the test process (expected `undefined`) and whether `NODE_V8_COVERAGE` is set there (the children inherit it).
3. **Warm-up.** Two kinds of child, each requiring `reachability.js`, optionally scanning the 4-KiB corpus sixteen
   times, calling `gc()`, then timing scans one by one with `process.cpuUsage()`: the first kind sixteen scans of the
   256-KiB corpus (the 256-KiB child's case), three runs with the warm-up and three without; the second kind two scans
   of the 4-MiB corpus (the 4-MiB child's, whose first timed scan is its only one), at least five children with the
   warm-up and three without. Record every figure, and for the second kind with the warm-up the smallest first-scan CPU
   time over its children and the smallest second-scan CPU time of the same children (Decision 69).
4. **Regex tier-up.** The same child once with `--trace-regexp-tier-up` (if `node` rejects the option, record that), and
   once more with the sensitivity case's swap: whether the call regex, and the window-24 regex that replaces it, run as
   native code from their first run on a long subject.
5. **CPU-time step.** A child that calls `process.cpuUsage()` in a busy loop until it has seen 200 changes; record the
   smallest and the median step in microseconds.
6. **Coverage environment.** The real-scan case and the sensitivity case, each run once with the gate's coverage flags
   and once without; record the four exponents. Coverage slows JavaScript, not the regex engine, so it raises the fixed
   cost per scan, which matters most to the sensitivity case (believed).
7. **Components at 1 MiB** (`<scratch>/components.js`, which spawns the helper's runner program, copied, with
   `--expose-gc`; Decisions 41 and 67). Seven sets, every swap with `from: SURFACE_CALL_SOURCE, to: INJECTED_SOURCE`.
   On the 1-MiB corpus: no swap (the real scan); `{ linear: false, quadratic: false, skipOthers: false }` (the call
   regex doing nothing and the other four regexes running: the rest of the real scan, R1n);
   `{ linear: true, quadratic: false, skipOthers: true }` (the injected pass alone, as the controls run it); the
   sensitivity case's swap; the quadratic case's swap; and `{ linear: false, quadratic: false, skipOthers: true }` (the
   call regex doing nothing and the others skipped: the reads, walks and checks of the controls' scan, R1). On the
   4-KiB corpus, that last swap again (R4: the fixed cost of one scan plus 4 KiB of reads; with no swap it would also
   hold a 4-KiB pass of the real call regex, about 4 / 1024 × 355 ms = 1.4 ms, more than the fixed cost it is there to
   measure).
   - **Equal lengths.** Every child uses about 1.4 s of CPU time, whatever its set, as a real child of the real-scan case
     does, so that load reaches every set alike. One calibration child per set, at the count the beliefs give, measures
     its CPU time per scan; the set's number of timed scans is then 1400 ms over that, rounded, at least 1 (believed:
     about 4 for the real scan, 150 to 600 for R1n, 20 for the injected pass alone and for the quadratic case, 10 for
     the sensitivity case, 470 to 1750 for R1, 1400 to 4700 for R4).
   - **Interleaved child by child.** Five rounds, each running one child of every set in the same order, so no set runs
     its children back to back.
   - **Per-set minima.** Each set's figure is the smallest CPU time per scan of its five children.
   - **Derived and recorded:** the real call regex pass (real less R1n) and the injected pass p (injected less R1) and
     their ratio (expected about 0.2); what the skip removes, the four other regexes per MiB (R1n less R1; believed 1.5
     to 6 ms); the rest per MiB of the controls' scan, r = (R1 − R4) × 256 / 255 (its two reads; believed 0.5 to 2 ms),
     and the fixed cost per scan, f = R4 − r / 256 (R1 holds f + r and R4 holds f + r / 256); and
     q = (sensitivity less injected) / injected, the sensitivity scan's quadratic part over its whole linear scan at
     1 MiB (expected 0.96 to 0.99). Beside q, record every child's CPU time (its length) and each set's number of scans,
     so that the equal lengths can be seen.
8. **The arithmetic, recomputed.** A scratch program recomputes from the model every figure of the Problem Statement's
   tables and lists (the candidates, the four weights with and without 1 MiB, the four expected exponents, the
   thresholds 0.293 and 0.59, the inflation factors of "What inflation turns a verdict", every stretch weight of the
   round order and its claim that no order but it and its reverse keeps every stretch within 0.1, the old case's 1.35
   to 1.44, the injected cases' expected exponents and children's lengths from the believed p, r and f, the run-time
   arithmetic, the flake-probability closed forms at the values of s the Problem Statement tabulates and their peaks at
   s = 2^(−1/3), and the count of process listings per second). **Only arithmetic from the plan's stated inputs can stop
   the build** (Decision 69): a figure the plan computes from inputs it states that differs from its recomputed value by
   more than one unit of its last printed decimal place is a stop (rule 4). The same figures recomputed with probe 7's
   measured p, r and f are recorded beside them and judged by the control row's floors, never by this rule.
9. **Efficiency cores** (Decisions 65 and 79). **Run at the start of Step 9, not in Step 8:** `load.js` starts it, as it
   starts every Step 9 run, once `load.js` and its stand-down check exist. The instrument is ordinary scheduling, not
   `taskpolicy -b`, which also lowers a process's priority and so does not isolate the core type.
   - **The core counts.** `sysctl -n hw.nperflevels`, `sysctl -n hw.perflevel0.logicalcpu` and
     `sysctl -n hw.perflevel1.logicalcpu`, each through `spawnSync`, no shell: believed on Apple silicon to give the
     number of core kinds, then the performance cores (P) and the efficiency cores (E). The probe records what each
     prints. Where `hw.nperflevels` is missing or prints 1 (another platform, or a machine with one kind of core), there
     is no efficiency core whose cost could be measured: the probe records that and runs no set, and R is not measured.
     That is the only case in which R may go unmeasured (Decision 79). Otherwise N = P + E, or
     N = `os.availableParallelism()` + 2 if a per-level key is missing.
   - **Concurrent ordinary-priority children.** Three sets, each N children of the helper's runner program, no swap, on
     the 4-MiB corpus, one timed scan each after the warm-up, each also printing the wall-clock time of its timed span,
     all N started at once (`spawn`, argument array, no shell, each with the 50-s kill). N is more than the machine's
     performance cores, so under normal scheduling some children run on the efficiency cores. Each set is load, so
     before each the probe makes the load workers' check once (the load rules below). A set that finds another CTOC test
     run is void and recorded, and is queued: it runs again later in Step 9, before stop rule 6 is applied, the way a
     void batch's runs do (the load rules). Three void sets in a row, counting the probe's set attempts only, stop the
     build and return the plan as needs-input with every number. Recommended next step: resume probe 9 once the other
     test runs have ended.
   - **Recorded:** the counts; for each set the load average before it, every child's CPU and wall-clock time, sorted,
     the set's max/min CPU ratio among its concurrent children, and whether its CPU times fall into two groups (the
     largest gap between neighbours in the sorted list, as a ratio); every void set with what voided it; and R, the
     largest max/min ratio of the three sets. R is an upper estimate of what a slow core costs a child: the maximum also
     carries any other contention the set met.
   - **What it feeds.** R's place against the thresholds of the Problem Statement's "What inflation turns a verdict"
     (4.2; 2.38 and 1.78; 2.00 and 1.59 at the sensitivity case's floor, and again at its measured control-row
     exponent; 5.66 and 3.17) picks the branch of the flake probability that stop rule 6 computes at the end of Step 9,
     with s, the chance a child runs slow, estimated from Step 9's own children, each judged against its own run (the
     Problem Statement, "The flake probability"; Decision 78).

**Variants (Step 8, in the scratch copy, at ambient load).** No variant touches the repository or any source file: each
is a change to the scratch helper or the scratch real-scan file alone, as the table says.

The first three swaps below replace the real-scan case's `null` in the scratch real-scan file with
`{ from: SURFACE_CALL_SOURCE, to: <the regex source in the row>, linear: true, quadratic: false, skipOthers: false }`;
only `to` differs, written as a string literal.

| Variant | Change in the scratch copy only | The real-scan case must | The sensitivity case must | The quadratic case must |
|---|---|---|---|---|
| control (three runs of each case) | none | pass in each run; record each size's figures and the exponent (expected about 1.0) | pass in each run, its measure failing the injected scan; record the exponents (expected about 1.48 to 1.49; their median at least 1.45, stop rule 4) and its children's CPU times | pass in each run; record the exponents (expected about 1.90 to 1.97; their median at least 1.75, stop rule 4) and its children's CPU times |
| catastrophic | real-scan file: `to` is the historical unbounded regex `([A-Za-z_$][A-Za-z0-9_$]*)\s*\(` | fail at its first child (512 KiB, whose first scan alone would take about 3.5 minutes), killed at the 50000-ms ceiling, the message naming the load average | not run | not run |
| slow-linear | real-scan file: `to` is the call regex with a window of 1023, `([A-Za-z_$][A-Za-z0-9_$]{0,1023})\s*\(` (about 8 times the work per position, still linear) | fail at its first 2-MiB child, the fourth of round 1, on the 3000-ms bound (about 5.5 s per scan), nothing killed (the three children before it take about 11 s each) | not run | not run |
| allowed-slowdown | real-scan file: `to` is the call regex with a window of 255, `([A-Za-z_$][A-Za-z0-9_$]{0,255})\s*\(` (twice the work per position, still linear; Decision 86) | pass: exponent about 1, every 2-MiB scan under 3000 ms (about 2 × 0.71 = 1.42 s, 3000 / 1420 = 2.11 times under the bound, above the 1.3 to 1.6 times load added on 2026-10-12); recorded as a slowdown both bounds allow | not run | not run |
| raised-bound | helper: `MAX_EXPONENT` set to 1.6, then to 2.2 | pass, both times | fail both times: "this measure no longer fails a quadratic part as large as the linear scan at 1 MiB" | pass at 1.6; fail at 2.2: "this measure no longer tells a quadratic scan from a linear one" |
| no-gc | helper: `'--expose-gc'` removed from the spawn's arguments | fail at its first child on status 20, the gc message | fail the same way | fail the same way |
| missed-swap | helper: `SURFACE_CALL_SOURCE` built with window 126 | pass | fail at its first child (512 KiB) on the swap count (0 swaps in 8 scans) | fail the same way |
| constant-figure | helper: the runner prints `CPU_US=1000000` in place of its measured figure (it still runs and counts its scans, swaps and skips) | pass at 1.00 as printed: each size's figure is 1000 ms over its number of scans, 62.5, 125, 500 and 1000 ms, an exponent of exactly 1 up to floating-point rounding; the 2-MiB scans read 500 ms, under 3000 | fail at 1.00: "this measure no longer fails a quadratic part as large as the linear scan at 1 MiB" | fail at 1.00: "this measure no longer tells a quadratic scan from a linear one" |
| zero-figure | helper: the runner prints `CPU_US=0` in place of its measured figure | fail at its first child (512 KiB) on the zero guard: "printed no positive CPU_US figure" | fail the same way | fail the same way |
| skips-run (Decision 67) | helper: a skipped call also runs the saved `exec` on the same text and counts the results that are not `null`, printed as `MATCHED=<n>` after `SKIPPED=` (the scratch parser's pattern extended by that field), and the child appends the distinct sources of its skipped calls to `<scratch>/skipped-sources.jsonl`; the call still returns `null` with `lastIndex` 0 | not run | pass; every child prints `MATCHED=0`; the sources file holds exactly four distinct sources, those of the literals at `src/lib/reachability.js` lines 342, 351, 658 and 659; record the exponent beside the control row's median (the difference is what the skip removes) | the same |

Every row must come out as stated. If one does not, the build stops, records that row's message and figures, and returns
the plan as needs-input. Recommended next step: re-plan upstream from that row's recorded message and figures
(Decision 85). The raised-bound row at 1.6 is the one that shows the sensitivity case guarding a slightly loosened
bound that the quadratic case lets through. The control row's floors
are applied to the median of its three runs (Decision 69); every run's figures are recorded.

**Load for Step 9 (`<scratch>/load.js`, a Node program; no shell script).** There is an ambient condition and three load
kinds. For the reproduction (Step 9's second run below) the load is made in batches in this order, stopping after the
first batch that reproduces the failure as stop rule 7 defines it; the new cases' runs use every condition:
- **Ambient:** no load added, whatever the machine carries; the one-minute load average is recorded.
- **`fresh-2x`:** 2 × `os.availableParallelism()` workers. Each worker is a Node program that, until its deadline, starts
  busy children back to back with `spawnSync`: each child busy-loops for a duration drawn uniformly from 150 to 600 ms
  and exits. Fresh, short processes, because 36 long-lived busy processes did not contend in slice 16's build (record
  lines 773-784); believed: the scheduler lowers the priority of a process that has run long on the processor, so a
  fresh test process kept getting a core.
- **`fresh-4x`:** the same with 4 × that many workers.
- **`scans-2x`:** 2 × that many workers, each starting back to back, until its deadline, one child of the OLD runner
  program (test lines 105-110: one timed `analyzeExports` call) on a shared 1-MiB corpus in `<scratch>`, about 0.45 s
  alone, output discarded: many concurrent scans, the shape of a loaded suite, one short child at a time.

**`load.js` starts every Step 9 run**, loaded, mid-case or ambient, as a process of its own tree; an ambient run is a
batch with no workers and only its meter. The same holds for the runs of Steps 10 and 12 under load. So the harness's
own runs are always inside the tree the stand-down rule leaves out, and an ambient run's meter never mistakes its own
run for another build's. `load.js` reads the runs it starts from a JSON file in `<scratch>`, never from its own
arguments (Decision 84).

Rules for every batch that adds load:
- **Never under another CTOC test run: every worker checks before every busy child** (Decision 38). Before each busy
  child it starts, every worker, and the meter before each of its children, lists processes
  (`ps -A -o pid=,ppid=,command=` through `spawnSync`, no shell) and looks for another CTOC test run: a process that
  neither descends from `load.js` nor is one of `load.js`'s ancestors (both traced through the parent ids) and whose
  command line contains `test-gate.js` or the file name of any `tests/*.test.js` file of this repository (the names,
  read once when `load.js` starts, are given to every worker). It matches file names, not paths, so a run of the same
  files from another worktree's copy counts (Decision 74). The descendants are left out so that the harness's own runs
  never void a batch, and the ancestors (the command that started `load.js` and the processes above it) so that the
  command that started it never does (Decision 84); since `load.js` reads its runs from a JSON file, no test file's name
  has to appear on its own command line or its ancestors'. Only CTOC's test files count, so that an idle `npm test`
  wrapper of another project (slice 16's record lines 773-775) does not. A `fresh-` worker checks every 150 to 600 ms
  and a `scans-2x` worker every scan, so no waiting loop is added.
- **The listings are timed, and their cost stated** (Decision 74). Each worker records the wall-clock time of every
  listing it makes. A `fresh-4x` batch has 4 × 18 = 72 workers, each listing once per busy child of 150 to 600 ms
  (375 ms on average), so 72 / 0.375 = 192, about 190 listings per second; `fresh-2x` makes 36 / 0.375 = 96, and
  `scans-2x` 36 / 0.45 = 80 at most (one per scan of about 0.45 s alone, fewer as load stretches the scans). Each
  listing starts `ps`, which reads the whole process table: at an assumed 10 to 30 ms of processor time each, 192
  listings a second cost 1.9 to 5.8 cores' worth, part of the load the batch makes. The record gives, per batch, the
  listings per second, their median and longest wall-clock time, and the product of the two as the cost in cores.
- **A sighting ends the batch at once, and its runs are void, not a stop.** The worker that finds one records the
  sighting: for every process of that listing whose command line matched, the matched test file's name (or
  `test-gate.js`), never a path or a command line, and whether that process descends from `load.js`, is one of its
  ancestors, or neither; only one that is neither is another test run (Decision 84). It then exits with its own status;
  `load.js` then kills every worker, the meter and the run in progress, each with its process group, and records the
  batch and every run in it as void. Stop rule 5 does not count a void batch. Void runs go to the end of the step's
  queue; before the next batch the builder runs the next pending run that adds no load (an ambient run), if one is
  left, so a void is never followed at once by another batch while such a run remains. Three void batches in a row stop the build and return the plan as
  needs-input with every number: the machine had no window free of other test runs. "In a row" counts batches that add
  load: an ambient run between two of them adds none and shows no free window for load, so it neither breaks nor
  extends the count; only a batch that is not void resets it (Decision 74). Nothing sleeps or polls to wait.
  In an ambient run, a meter that finds another test run stops; the run stands, and its contention is taken from the
  meter's children before the stop, or recorded as not measured. A suite timing run (Step 9's first run and Step 12's
  three ambient suite runs) is the exception: it is void and repeated, never compared (stop rule 8; Decision 80).
- **Bounded.** Every worker ends by its own deadline, at most 10 minutes after it starts. Each worker is started as the
  leader of a process group of its own, and `load.js` kills every worker with its group (so a busy child dies with its
  worker) in `finally`, on `exit`, on `SIGINT` and on `SIGTERM`. Workers are started afresh for each batch and none
  outlives it; after each batch, `ps` must show none left, and the record says so, with each kind's longest worker cycle
  (a busy child plus its start and one process listing).
- **Contention is measured, not assumed, by children shaped like the test's.** The committed test prints no
  wall-clock time, and a whole run's time against the sum of its CPU figures would count Node's start-up, the corpus
  writing and the warm-up as contention. So every batch, and every ambient run, has a meter (`<scratch>/meter.js`):
  one Node program that, until the batch or the run ends, runs back to back one child of the helper's runner program,
  no swap, on the 4-MiB corpus, one timed scan after the warm-up, each child printing its CPU time and the wall-clock
  time of its timed span (`performance.now()`), and appends one JSONL line per child with its start and end. A run's
  contention is the median wall-clock-to-CPU ratio of the meter's children that started and ended within it; a batch's,
  the median over its meter's children that ran while a case under test ran in it. The meter is one more busy process
  beside 36 or 72 workers.
- **The meter also measures what failed the old case: CPU time per scan** (Decision 64). The ambient minimum is the
  smallest CPU time of any meter child of Step 9's ambient runs. For every batch the record gives, beside its
  wall-clock-to-CPU ratio, its meter children's CPU times against that minimum: the median and the largest ratio, the
  batch's CPU inflation. The old case failed from an inflation of 1.35 to 1.44 of its 2-MiB samples (the Problem
  Statement, "The order of the rounds"), so the final report says whether the batch that met stop rule 5, and the
  reproducing batch (the one stop rule 7 counted, if any), reached it.
- **One preload marks the test processes and their scan children** (`<scratch>/marks.js`; Decisions 37, 61 and 68).
  A run that needs marks gets `NODE_OPTIONS=--require=<scratch>/marks.js` and `MARKS_FILE=<scratch>/marks/<run id>.jsonl`
  in its own environment only, and every process of that run loads the preload. In a process whose `process.argv[1]`
  ends in `.test.js` inside a folder named `tests` (a test file's process under `node --test`; believed, and the first
  run's marks show it), the preload appends the file's name and the process's start, and its end on `exit`. In such a
  process whose file name is in `MARKS_WRAP_FILES` (a comma-separated list given in the same environment: the old file,
  the real-scan file and the controls file), it also wraps `child_process.spawnSync`: for every call that starts a scan
  child (`process.execPath` with `-e` among its arguments) it appends that child's start and end with the file's name.
  The test files take `spawnSync` from `node:child_process` when they load (the old file's line 62, the helper's
  require), after the preload has run, so they get the wrapper (believed; the first run's marks show it). Every other
  process the run starts, scan children included, loads the preload, finds no test file in its `argv[1]`, and records
  nothing; its few milliseconds fall outside any timed span. A run whose marks name no test file is void.
- **Mid-case runs: load that starts after a run's first child returns** (Decisions 37 and 82). Such a run has a batch of
  its own, which begins with no load. Before the run, `load.js` starts the batch's workers and its meter, each blocked
  on an event: a release message from `load.js` that it waits for without polling, so that none has started a busy
  child. `load.js` then starts the run with the preload, watches `<scratch>/marks/` with `fs.watch`, an event and not a
  loop that sleeps, and at the first scan child's end mark releases them all; they stay until the run ends. Started in
  advance, the load reaches the run's second child, in the old case its first 2-MiB sample, without waiting for 36 or
  72 processes to start. A run whose marks never show a first child's end, or whose load started only after its second
  child had returned, is void: its load covered another stretch than the one it is run for. The record gives, for every
  mid-case run, the time from the first child's end to the release, to the last worker's first busy child and to the
  second child's start, and for the old case's mid-case runs c and its predicted failing inflation (Step 9's run 2).

**Step 9 runs, in this order** (the repository's test files are still as committed throughout; probe 9 runs before
them, Decision 79):
1. **The suite at ambient load, before any change** (Decision 61). `npm test`, started by `load.js` as an ambient run
   with the marks preload, in the foreground with a 10-minute timeout (a run cut by it is started again in the
   background and the turn ended; nothing waits in a loop). Record the suite's wall-clock time, the one-minute load
   average at its start and end, every test file's duration (from the runner's own output where it prints one,
   otherwise from the marks: start of its process to its exit; the record says which, Decision 61), the longest file,
   and the old file's duration. Stop rule 8 compares Step 12's three runs with this one; a run of it during which its
   meter saw another CTOC test run is void and repeated, not compared (Decision 80).
2. **Reproduction of the defect, before any fix: recorded evidence** (Decisions 62 and 81). In the repository (a
   read-only run), the old case,
   condition by condition in the order above: at ambient load, 10 runs; then for each load kind, 10 runs in one batch
   whose load is there from the start, then 5 mid-case runs, each in a batch of its own whose load starts after the
   run's first child (a 1-MiB child) returns. That load covers all three 2-MiB samples and leaves a clean 1-MiB one, so
   a run whose clean ratio is 1.97 to 2.10 fails from an inflation of 1.35 to 1.44 (the Problem Statement, "The order of
   the rounds"), provided it covers the first 2-MiB sample, the run's second child, whole: its workers and meter are
   started before the run and released at the first child's end mark so that it does (Decision 82). **c and the
   predicted failing inflation.** For every mid-case run the record gives c, the loaded share of the first 2-MiB sample:
   the share of that child's wall-clock span, from its start mark to its end mark, that lies after the last worker
   started its first busy child. With that sample loaded for its share c and the other two whole, an inflation f makes
   the smallest 2-MiB sample (1 − c) + c·f times its clean figure, so a run of clean ratio r fails from
   f = (2√2 ÷ r − (1 − c)) ÷ c. The record states that figure for each mid-case run, with r at the lowest and the
   highest ratio of the reproduction's ambient runs, beside the batch's CPU inflation from the meter. At c = 1 it is
   2√2 ÷ r: 2.828 ÷ 2.10 = 1.35 to 2.828 ÷ 1.97 = 1.44, the figures above; at c = 0.5, (1.347 − 0.5) ÷ 0.5 = 1.69 to
   (1.436 − 0.5) ÷ 0.5 = 1.87; at c = 0 the first 2-MiB sample is clean and no inflation fails the run. A child
   progresses more slowly under load, so c, read from wall-clock time, is at least the share of its work done under
   load, and the stated figure is the lowest inflation that could fail the run. A batch runs to its end even after a
   run in it fails, so that its contention is measured over its whole span; the reproduction ends after the first batch
   that meets stop rule 7. Record every run's ratio and its six CPU
   figures (the old case's diagnostic line), and each batch's contention and CPU inflation. A failure at ambient load is
   recorded and does not meet rule 7. "The reproducing batch" below is the batch that met rule 7, or, when none did, the
   most contended batch.
3. **Mechanism probe** (`<scratch>/probe.js`), under the reproducing batch's load (started afresh) and at ambient load. It
   spawns children of the OLD program (one timed `analyzeExports` call, as test lines 105-110) and of the NEW program (as
   the helper), each extended to print around its timed span: CPU µs, wall-clock ms (`performance.now()`),
   and the change in `process.resourceUsage()`'s `involuntaryContextSwitches` and `voluntaryContextSwitches`. Each child
   runs with `--trace-gc`, and the collection lines printed between a `T0` and a `T1` marker around the timed span are
   counted and kept. 10 old-program pairs (1 MiB and 2 MiB, alternating which runs first) and 5 new-program rounds (four
   sizes). Output JSONL in `<scratch>`. Derived and recorded: each child's CPU per scan relative to the smallest at its
   size at ambient load (its inflation); whether the old program's 2-MiB children are more inflated than its 1-MiB
   children in the same batch; whether inflation follows the wall-clock-to-CPU ratio or the involuntary switches; and the
   collections' time inside the timed span as a share of its CPU time. **Then stop rule 7's count is recorded**, before
   any run of the new cases, which run whatever it shows (Decision 81).
4. **The three new cases under each load kind** (the scratch real-scan and controls files): for each of `fresh-2x`,
   `fresh-4x` and `scans-2x`, 5 runs of the real-scan case, 5 of the sensitivity case and 3 of the quadratic case. The
   runs go in turn (real-scan, sensitivity, quadratic, real-scan, sensitivity, quadratic, and so on; the quadratic case
   drops out after its third run) under load batches of that kind started afresh, so that every batch runs all three
   cases while it lasts: stop rule 5 asks for one such batch. A batch starts no run with less than 4 minutes left before
   its 10-minute deadline; it then ends, and the next runs go to a fresh batch of the same kind. A run cut by the
   deadline anyway is recorded as cut and run again. Then, for each load kind, mid-case runs: 3 of the real-scan case and
   1 each of the sensitivity and quadratic cases, each in a batch of its own whose load starts after the run's first
   child (512 KiB) returns. That load covers the stretch from child 2, +0.1: it moves the real-scan case's fit up by at
   most 0.1 × log2 f, 0.068 at f = 1.6, and the injected cases' fits up by as much, away from failing (the Problem
   Statement, "The order of the rounds"). Record every diagnostic line, the load average, and each run's and each
   batch's contention and CPU inflation.
5. **The three new cases at ambient load:** 5 runs of the real-scan case, 5 of the sensitivity case and 3 of the
   quadratic case.

Every run of runs 4 and 5 gives, in its diagnostic line, all twelve children's CPU time per scan; stop rule 6 estimates
from them s, the chance a child runs slow.

**Stop rules.** If any rule fails, the build stops, every number goes into the Execution Record, and the plan returns to
the CTO Chief as needs-input with the one recommended next step the rule names (Decision 75). `MAX_EXPONENT`, `SIZES`,
`SCANNED_PER_CHILD`, `RUNS_PER_SIZE`, `ROUND_ORDERS`, `WARM_UP_BYTES`, `WARM_UP_SCANS`, `MAX_2MIB_CPU_MS`,
`HARD_TIMEOUT_MS`, `OTHER_EXECS_PER_SCAN` and `INJECTED_SOURCE` are never changed to make a rule hold. Rule 4 is applied
in Step 8, its probe parts right after the probes and before any variant, its control-row parts right after the control
row and before the other variants, all before any load is added; rule 7, which records and stops nothing (Decision
81), right after Step 9's mechanism probe, before any run of the new cases; rules 1 to 3 and 5 to Step 9's runs of the
new cases; rule 6 at the end of Step 9; and rule 8 at Step 12.
1. **The real scan's margin.** The real-scan case passes every run, ambient and under each load kind; every fitted
   exponent is at most 1.136, at least 0.114 under the bound (the most one size inflated 1.6 times moves it); every 2-MiB
   scan is under 3000 ms; no child is killed. A run above 1.136 means one size was inflated more than the design allows
   for. Recommended next step: re-plan the sizes and the bound upstream for the inflation that run measured (the record
   gives each size's smallest sample against its ambient one).
2. **The sensitivity case's margin.** The sensitivity case passes every run, its measure failing the injected scan, ambient
   and under each load kind; every fitted exponent is at least 1.31, at least 0.06 over the bound (1.45, the lowest
   ambient value rule 4 accepts, less the 0.136 that one size inflated 1.6 times takes); no child is killed. Recommended
   next step: as rule 1's, for the injected case's sizes.
3. **The quadratic case's margin.** The quadratic case passes every run, ambient and under each load kind; every fitted
   exponent is at least 1.6; no child is killed. Recommended next step: as rule 1's.
4. **Step 8's measurements.** On the installed Node, `--expose-gc` exposes `gc()` in the child (probe 2); with the
   warm-up, the first timed scan of a sixteen-scan child is at most 1.10 times the median of its other fifteen in at
   least two of its three probe runs, and the smallest first-scan CPU time of the five or more 4-MiB children is at most
   1.10 times the smallest second-scan CPU time of the same children (probe 3; both one-sided, since a first scan faster
   than the rest does no harm; Decision 87); the sensitivity scan's q at 1 MiB is at most 1.10 (probe 7), and a q from
   1.0 to 1.10 is recorded: the sensitivity case then carries a recorded strength above slice 16's case, worth at most
   0.021 in the fit (Decision 86); every figure the plan computes from its stated inputs holds (probe 8; the same figures
   from measured inputs are judged by the control row's floors); and in the control row, on the median of its
   three runs, the sensitivity case's exponent is at least 1.45, the quadratic case's at least 1.75, and each injected
   case's longest child uses at most 2000 ms of CPU time (Decision 69). Recommended next step: re-plan upstream from the
   probe or control figure that failed, which the record gives.
5. **Contention reached: a condition of done.** At least one batch, of any load kind, reaches a median
   wall-clock-to-CPU ratio of at least 4 over the meter's children that ran while the new cases ran in it, ran each of
   the three cases at least once, and holds rules 1 to 3 in every run in it. A void batch does not count. The record gives
   that batch's CPU inflation beside its ratio, and the final report says whether it reached the old case's failing
   inflation of 1.35 to 1.44 (Decision 64). The basis of the 4: the failures of 2026-10-12 took 4 to 15 times, in
   wall-clock time under load, the CPU time the same scans took alone in other runs (a 2-MiB child of about 0.75 s alone
   took 11 to 12 s); that is loaded wall-clock against unloaded CPU, not a ratio within one run. It equals the
   within-run ratio times the CPU inflation, 1.3 to 1.6, so a within-run ratio of 4 stands for 4 × 1.3 = 5.2 to
   4 × 1.6 = 6.4 on that basis, and the failures' low end of 4 for a within-run ratio of 4 / 1.6 = 2.5 to 4 / 1.3 = 3.1:
   the condition asks for more contention than the failures' low end. If no batch of any load kind reaches 4, the build
   stops: it never passes on uncontended load. Recommended next step: add a heavier load kind upstream (the record gives
   each kind's contention and CPU inflation).
6. **Efficiency cores: the flake probability, stated in advance** (applied at the end of Step 9; Decisions 66, 78 and
   79). An efficiency-core cost nobody measured cannot satisfy this rule: R must be measured, probe 9's three sets run,
   and a void set runs again before the rule is applied. Only where `sysctl -n hw.nperflevels` is missing or prints 1,
   a machine with one kind of core, do the record and the final report say that the efficiency-core cost was not
   measured, and then this rule decides nothing. Otherwise:
   - **s, the chance a child runs slow**, is estimated for each case in each condition (ambient, and each load kind with
     its mid-case runs) from Step 9's children, each child judged against its own run (Decision 78): its quotient is its
     CPU time per scan divided by the smallest ambient sample of its case and size, and it is slow when that quotient is
     at least √R times the median quotient of the 12 children of its run. √R is the geometric midpoint between a fast
     child (about 1) and a slow one (about R, probe 9). Load that slows every child of a run alike moves the median with
     it, so it no longer reads as independent slowness. With k slow children among N, the record gives k / N and s₉₅,
     the 95% upper bound: the s at which k or fewer slow children among N has a 5% chance (for k = 0, 1 − 0.05^(1/N),
     about 3 / N). An observed zero cannot show a rate under 0.1%; the upper bound is what the samples can show. The
     range of s the decision reads is 0 to s₉₅.
   - **The flake probability per run** of each case in each condition is the chance that the case fails when each of its
     12 children is slow with probability s and a slow child costs R times its fast figure: its fitted exponent, from
     its ambient smallest samples, crosses 1.25, or a slow 2-MiB child's scan reaches 3000 ms. That bound reads a child's
     absolute CPU time, so for it a fast 2-MiB child's figure is its ambient smallest sample times the largest median
     quotient of the condition's runs: load that slows every child alike still counts against it (a choice made here,
     Decision 78). A scratch program computes the probability exactly over the 2¹² = 4096 ways the 12 children can be
     slow or fast, at every s from 0 to s₉₅ in steps of 0.001 and at s₉₅ itself, and the decision takes the LARGEST of
     those values, not the value at s₉₅: a fit path needs some sizes slow and others fast, so its probability peaks at
     s = 2^(−1/3) = 0.794 and falls again as s nears 1. The record gives the largest value and the s it came at. The
     closed forms in the Problem Statement ("The flake probability") check it by hand.
   - **The two injected cases' children are not of equal length** (about 0.36 to 1.40 s and 0.08 to 1.12 s), and for
     them this rule is conservative: their fit fails when their shortest sizes run slow, and s, counted over all twelve
     children and applied to each alike, puts on the shortest children the slowness of the longer ones, whose slowness
     raises their fit. That holds while a longer child is at least as likely to run slow as a shorter one, which is not
     confirmed (the cause table's third row); the mechanism probe records inflation by child length, and the record says
     whether it held.
   - **The bound is 0.1% per run.** Above it for any case in any condition, the build finishes Step 9 (its runs are the
     evidence) and then stops; no constant is changed to absorb it. Recommended next step: re-plan upstream from the
     path that set the probability, with the measured R and s (the record names the path: a fit path, or the 3000-ms
     bound on one child).
7. **The old case's failure under this build's load: recorded evidence, not a stop** (Decision 81, which reverses
   Decision 62). A run of slice 16's old case counts as a reproduction only when it fails on the ratio assertion, with
   the old test's message at line 170 ("smallest CPU time of the 2-MiB scan over the smallest of the 1-MiB scan is …,
   not under 2.83") together with its six CPU figures (its diagnostic line, lines 167-168), in a batch that adds load (of
   any load kind, not void) and whose contention is at least 4. Any other failure under load (a child killed at the
   ceiling, a 2-MiB scan at or over 3000 ms, a crash, a missing figure) is recorded and does not count, and neither does
   a failure at ambient load. The rule stops nothing: the new cases run whatever it shows. If no run counts, the record
   and the final report say "cause supported by the code, not reproduced", with every batch's contention and CPU
   inflation; if one does, they give its batch, its ratio, its six figures and which side was inflated by how much.
8. **The suite's length, measured in one session** (applied at Step 12; Decisions 61 and 80). Step 12 runs `npm test`
   three times at ambient load with the new files in place, each exactly as Step 9's first run, which had the old file
   in place. Each of Step 12's runs gives a normalised difference: its wall-clock time minus Step 9's wall-clock time
   multiplied by the median, over the test files present in both runs that this slice does not change (every file but
   the kept file), of a file's duration in Step 12's run divided by its duration in Step 9's run. The rule fails if the
   median of the three normalised differences is more than 15 s, or if either new test file is the longest file of any
   of Step 12's runs. The plain differences of the wall-clock times are recorded and decide nothing, and so do the 300 s
   that push and the hotfix check allow `npm test` and the 900 s per command of the menu's completion check, recorded
   beside each run. A suite run during which its meter saw another CTOC test run, Step 9's first run included, is void:
   it is repeated, not compared, and if three repeats in a row are void as well, the plan returns as needs-input.
   Recommended next step on a failure: re-plan upstream from the files whose durations grew, which the runs' per-file
   durations show; on the void stop: resume the suite timing runs once the other test runs have ended.

The margins rules 2 and 3 hold are lower than q = 1's own (1.500, and 1.364 with one size inflated 1.6 times) because
the injected scan is by construction a weaker quadratic than q = 1 and pays a fixed cost per scan, never because the
check is looser: a failing verdict on it implies one on q = 1 (Decision 25) when its measured q is at most 1; for a q
from 1.0 to 1.10 the injected scan is at most 0.021 stronger in the fit, and the record says so (Decision 86).

Three void batches in a row (the load rules above) also stop the build. Recommended next step: resume Step 9 once the
other test runs have ended (the record gives how many each void batch saw). So do three void sets of probe 9 in a row
(Decision 79). Recommended next step: resume probe 9 once the other test runs have ended.

**Run time.** The real-scan case runs 12 children of about 1.5 s each (1.42 s of scanning plus start-up), the
sensitivity case 12 of about 0.36 to 1.40 s and the quadratic case 12 of about 0.08 to 1.12 s: about 18 s, 10.3 s and
7.0 s at ambient load (estimates, the Problem Statement's table), so about 18 s for the real-scan file and
10.3 + 7.0 = 17.3 s for the controls file, the two running side by side, against 4.1 s for the whole old file in slice
16's Step 12 and 5.91 s in the faster-suite round's whole-suite run. Step 12 measures each file alone and inside
whole-suite runs, and stop rule 8 holds the median of three normalised differences from Step 9's suite run within 15 s
(the Problem Statement, "Against the time limits"; Decision 80). Under heavy load a batch, or a file alone, can run
past an agent's 10-minute foreground limit: such a run is started in the background and the turn ended (operating
lesson 20); no loop sleeps to wait for it.

**Coverage:** no line under `src/` changes, so source coverage is unchanged; Step 14 checks it.

### Security Review

- [x] No change under `src/`, `src/hooks/` or `.ctoc/`; no write-protection, approval or check record is touched. The
  two documents change in their test-file count only.
- [x] The child program interpolates exactly five values, each a constant or a value the helper builds itself:
  `JSON.stringify(REACH)` (the path of `src/lib/reachability.js`, built with `path.resolve`), `JSON.stringify(swap)`
  (two regex sources the helper builds from its own constants and three booleans, or `null`), the number `MiB`
  (1048576), the exit status `GC_MISSING_STATUS` (20) and the number `WARM_UP_SCANS` (16). Its other inputs are
  arguments, not spliced text: the two corpus folders the helper made under `os.tmpdir()` and the number of scans. No
  outside input reaches it, and it is passed as an argument with no shell.
- [x] `RegExp.prototype.exec` is replaced only inside the two injected cases' own child processes; the test processes,
  the real-scan case and every other test file never see it. There the regex whose source is the call regex's runs the
  injected regex, and every other regex returns `null` with `lastIndex` 0 without running, what each returns on this
  corpus; both kinds of call are counted and asserted.
- [x] The injected work is bounded: the quadratic part scans text.length² / 1 MiB characters once per scan, at most
  16 MiB at 4 MiB, and every child keeps the hard kill.
- [x] Every child has the hard wall-clock kill and a bounded `maxBuffer`, as today; the temporary corpora are removed in
  `finally`, including when a corpus could not be made or written, because each folder joins the list to remove before
  anything is written into it.
- [x] The helper is required by a literal relative path from the two test files and exports five names; it reads no
  environment and writes only its temporary corpora.
- [x] The failure messages and diagnostics print sizes, counts, CPU figures and the load average; never a file's contents
  or an absolute path.
- [x] The harness stays in `<scratch>`, one folder outside the repository for the whole build: Step 14 deletes
  everything in it but `<scratch>/scope/`, and Step 16 deletes the folder after the scope check and confirms with `ps`
  that no load worker remains (Decision 83). Its load workers
  end by their own deadlines, at most 10 minutes, and are killed with their process groups in `finally`, on exit and on
  `SIGINT` and `SIGTERM`. Before each busy child, every worker and the meter look for another CTOC test run, and the
  first that finds one ends the whole batch. That guarantees this much and no more:
  - no worker starts a busy child after its own check has seen another CTOC test run;
  - the synthetic load ends within one worker cycle of the first check that can see that run: a busy child of at most
    600 ms of wall-clock time for the `fresh-` kinds or one 1-MiB scan for `scans-2x`, plus starting it and one process
    listing, each slowed by the load itself (the record gives each kind's longest cycle).
  It does not keep the load off a test run during that cycle; it does not see a test run whose command line contains
  neither `test-gate.js` nor the file name of a `tests/*.test.js` file of this repository; it leaves out `load.js`'s
  own descendants and ancestors (Decision 84); and it does nothing about load from any other source. A sighting is
  recorded as test file names and each process's relation to `load.js`, never as a path or a command line.
- [x] Probe 9 starts N ordinary-priority children at once, each with the 50-s kill, after the same check; no process is
  started under `taskpolicy` or `nice`.
- [x] The marks preload reaches only the runs `load.js` starts, through their own environment (`NODE_OPTIONS`,
  `MARKS_FILE`, `MARKS_WRAP_FILES`); it writes only into `<scratch>/marks/`, records file names and times, never command
  lines or contents, and its `spawnSync` wrapper calls the original with the same arguments.
- [x] The Execution Record names no absolute path, home folder or user name (`<scratch>` stands for the scratch folder).

### Wiring — the live call sites

- The three test files are callers only. `npm test` reaches them: `package.json` line 11 runs
  `src/scripts/test-gate.js`, which lists `tests/*.test.js` (`resolveTestFiles`, lines 265-270) and runs them (line 426).
- The helper's live call sites are the real-scan file's and the controls file's `require` of it, each followed by
  `measureScaling` calls in their cases; `npm test` runs both files, so the helper runs on every run of the suite. It is
  a test helper, not a module of the product, and nothing outside `tests/` requires it.
- They guard `analyzeExports` (`src/lib/reachability.js` line 793), unchanged, which is reached live from
  `src/scripts/run-self-check.js` (a declared root, `.ctoc/reachability-roots.json` line 4): its `checkAllInvariants` call
  (line 26, thorough mode by default) runs the dead-export fence, `checkDeadExportFence`
  (`src/lib/iron-loop-enforcer.js` lines 705 and 778), which calls `analyzeExports` at line 783.
- No product module is added, so no new call site in `src/` is needed.

## Acceptance Criteria

- [x] The owner's two recorded answers were applied (Decision 88): the exception clause adopted before Step 8 wrote any
  file, and every run that added load (probe 9's sets and every load batch of Steps 9, 10 and 12) started inside the
  window he named, or after he accepted the load.
- [x] The file is split as the File Specifications say: the kept file holds its lines 1-22 with the new title at line
  4, its new paragraph, its
  requires but `spawnSync`, and its two `SEMANTICS PRESERVED` describes byte for byte; the helper holds the measure and
  every constant; the real-scan file holds the real scan's case under its old `describe` and case names; the controls
  file holds the two injected cases. Each new file's name is under 120 characters (105, 115 and 119).
- [x] `MAX_RATIO` and the ratio of minimums are gone. The real-scan case, "doubling the input does not super-linearly
  increase the scan time", measures 256 KiB, 512 KiB, 2 MiB and 4 MiB in `RUNS_PER_SIZE` = 3 rounds, each round one child
  per size, in the order `ROUND_ORDERS` gives: 512 KiB, 4 MiB, 256 KiB, 2 MiB in rounds 1 and 2, the reverse in round 3.
  Every child scans 4 MiB in total (16, 8, 2 and 1 scans), is started with `--expose-gc`, scans the 4-KiB warm-up
  corpus `WARM_UP_SCANS` = 16 times untimed, calls `gc()`, and times its scans with `process.cpuUsage()`. A size's
  estimate is the smallest of its three CPU-per-scan samples, and the least-squares exponent of log2(cost) on
  log2(size) over the four sizes must be under `MAX_EXPONENT` = 1.25, the one constant both test files read.
- [x] Each child is checked as soon as it returns: not killed at the 50000-ms ceiling (doubled from 25000 ms, its reason in
  its comment), not ended by another signal, not exited with status 20 (no `gc()`), exited 0, and printed one line with
  its number of scans and a positive, finite CPU figure. A child of an injected case reports exactly one swap per timed
  scan and exactly `OTHER_EXECS_PER_SCAN` = 4 skipped regex calls per timed scan.
- [x] Every 2-MiB scan's CPU time, the 2-MiB child's CPU time over its two scans, is asserted under the unchanged
  `MAX_2MIB_CPU_MS` = 3000.
- [x] The sensitivity case, "the measure fails a scan whose quadratic part equals its call regex pass at 1 MiB", runs the
  same measure with `SURFACE_CALL_RE` swapped, inside each of its children only, for `INJECTED_SOURCE` (window 24) making
  its own pass and scanning text.length² / 1 MiB more characters once per scan, every other regex returning its no-match
  result without running, and asserts that the fitted exponent is at least 1.25. No source file is edited.
- [x] The quadratic case, "the measure fails a deliberately quadratic scan", runs the same swap without the regex's own
  pass and asserts that the fitted exponent is at least 1.25.
- [x] Step 8's variant table came out as stated, each row recorded with its message or diagnostic line and its load
  average: control passes all three cases in each of its three runs, its floors met on their median; catastrophic is
  killed at the ceiling at its first child; slow-linear fails on the 3000-ms bound; allowed-slowdown passes;
  raised-bound fails the sensitivity case at 1.6 and both injected cases at 2.2; missed-swap fails both injected cases;
  constant-figure passes the real-scan case at 1.00 and fails both injected cases at 1.00; zero-figure and no-gc fail
  all three; skips-run passes both injected cases with every child's `MATCHED=0` and exactly the four other surface
  regexes skipped.
- [x] Step 8's probes are recorded: the versions, `gc()` in the child and not in the test process, the warm-up figures
  (both checks one-sided, the 4-MiB one on the smallest of five or more children), the regex tier-up, the CPU-time
  step, the coverage environment, the components at 1 MiB from seven interleaved sets of children of about 1.4 s each (the
  injected pass against the real one, what the skip removes, the reads per MiB, the fixed cost, q, with every child's
  length beside q), and the recomputed arithmetic (only the stated-input figures able to stop). Stop rule 4 held, its
  probe parts checked before any variant ran.
- [ N/A ] Step 9 recorded, while the repository's test files were still as committed: probe 9 at its start (the core (replaced by CTO Chief ruling (b) of 2026-10-18; the before-run can no longer be made)
  counts, three sets of N concurrent ordinary-priority children that were not void, every void set and its rerun, every
  child's CPU and wall-clock time, each set's max/min ratio, R; R unmeasured only where `hw.nperflevels` is missing or
  prints 1); the ambient `npm test` with every file's duration; the reproduction of the old case batch by batch, its
  mid-case runs included (runs, failures, ratios, the six CPU figures of each run, load averages, contention and CPU
  inflation reached, and each mid-case run's c and predicted failing inflation); the mechanism probe (inflation
  by size and by child length, the wall-clock-to-CPU ratio, involuntary switches, collections inside the timed span);
  the three new cases at ambient load and under each of the three load kinds, the loaded runs in batches that each ran
  all three cases, and the mid-case runs (3 of the real-scan case and 1 of each injected case per load kind, each with
  the time from its first child's end to the start of its load), with each run's and each batch's contention and CPU
  inflation from the meter, each batch's process listings per second and their cost, and every void batch with what
  voided it. Stop rule 7's count recorded: the run that failed on the ratio assertion (the old test's line 170) with its
  six CPU figures, in a batch that added load and reached a contention of at least 4, or, when none did, "cause supported
  by the code, not reproduced" in the record and the final report (Decision 81).
  Stop rules 1 to 3 held: every real-scan exponent at most 1.136, every sensitivity-case exponent at least 1.31, every
  quadratic-case exponent at least 1.6. Stop rule 5 held: a batch that was not void reached a median wall-clock-to-CPU
  ratio of at least 4 while the new cases ran, and every run in it held rules 1 to 3; the record says whether that batch
  and the reproducing batch reached a CPU inflation of 1.35 to 1.44. Stop rule 6 held: every child judged against the
  median quotient of its own run, and every case's largest flake probability per run over s from 0 to s₉₅, in every
  condition, at most 0.1%, with R, k / N, s₉₅ and the s that gave the largest value recorded; or, only where
  `hw.nperflevels` is missing or prints 1, the record says the efficiency-core cost was not measured.
- [x] No bound, ceiling, size, count or sample number changed to make a run pass; no retry, skip or early return was
  added; the two `SEMANTICS PRESERVED` describes are unchanged byte for byte.
- [x] Each case prints one diagnostic line, beginning "real scan", "sensitivity scan" or "quadratic scan"; no line the
  tests print begins with a word the test gate parses.
- [x] The four headers are written as the File Specifications give them, every `{…}` slot filled from the Execution
  Record; none remains. The helper's states what the check times and what it does not see with the Problem Statement's
  numbers; the real-scan file's "WHY A CHILD PROCESS" ends with the rewritten sentence; and no header or comment says
  the check gives anything up.
- [x] The scope check of Step 16 held: the full list of changed paths (`git status --porcelain=v1 --untracked-files=all`)
  differs from Step 9's only by the six declared files (the three new ones added, the kept file and the two documents
  changed), `README.md` and `CLAUDE.md` differ from their Step 9 copies only in the three count numbers, and the
  manifest of the git-ignored paths differs from Step 9's only under the paths Step 9 named as this build's own, or
  where a changed or added file's modification time, or a removed file's folder's, lies outside every window in which
  this build ran a command in the repository (Decision 87). Step 9's baseline was kept in `<scratch>/scope/` until
  then; after the check `<scratch>` was deleted and `ps` showed no load worker left (Decision 83).
- [x] `npm test` passes: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0
  skipped and 0 flaky.
- [x] Step 12 recorded each new file's time and the kept file's, alone and inside a whole-suite run, at ambient load and
  under the most contended load kind with the new files' children under load; stop rule 8 held (the median of the
  normalised differences of Step 12's three ambient suite runs from Step 9's at most 15 s, the plain differences
  recorded, no void run compared, and neither new file the longest of any run); every suite's wall-clock time is
  recorded against push's 300 s and the completion check's 900 s, with the findings for the owner. The headers state
  the worst cases: 12 × 50 s = 10 minutes for the real-scan file, 24 × 50 s = 20 minutes for the controls file.

### Stop rule 8 as ruled (2026-10-18)
The ruling (CTO Chief rulings of 2026-10-18, (b)): the two new files may add at most 15 s, and neither may be the longest file of the run.
- **Suite with and without the two new files**, three alternating runs, measured BEFORE the batch-length change: with 56.6, 52.8 and 53.6 s; without 45.2, 46.4 and 66.1 s; paired differences +11.4, +6.4 and -12.5 s; median +6.4 s, under 15 s. The new files have since become shorter: the controls file went from about 46 s to 27 s alone.
- **Per-file run AFTER the batch-length change.** Every test file ran as its own `node --test <file>` process at the suite's concurrency of 17, total 45.8 s, no file failed, load average 32 to 53.
  - Longest: hotfix-check-corpus 41.7 s, then hotfix-check-guards 30.4 s, hotfix-check-readers 28.9 s, hotfix-check-test-run 28.5 s, hotfix-check-review-findings 28.4 s, hotfix-check 26.2 s.
  - The controls file is 7th at 26.1 s; hotfix-check-copy-and-log is 8th at 25.2 s; app-runner is 9th at 15.3 s.
  - The real-scan file is 10th at 14.8 s, and the kept file 84th at 0.7 s.
  - Neither new file is the longest.
- **Verdict:** stop rule 8 holds as ruled.
- The script that made these measurements is kept in the CTO Chief's scratchpad: timing/per-file.js and timing/suite-ab.js.

## Decisions Taken Under Ambiguity

1. **The requirements are the dispatch's of 2026-10-13.** Find the cause before designing; prefer a deterministic count of
   the work (approach a) when the scan has a natural one that measures behaviour; otherwise a robust timing design
   (approach b) with several sizes spanning at least a factor of 8, interleaved repeated samples, garbage collection out of
   the timed span where Node allows it, and a fitted exponent or a median of per-pair ratios with a threshold separating
   linear from quadratic by a stated margin; prove the fix on a quadratic scan injected without editing the source; no
   retry, skip, early return, or widened threshold without a written reason; no hook change. Every decision below works
   inside those requirements.
2. **No operation count.** The scan's cost is backtracking inside one `exec` call per regex per scan, and nothing JavaScript
   can count differs between a linear and a quadratic regex on this corpus (the Problem Statement, "The fix"). A count
   would measure structure and pass the regression the test exists for. The engine fallback flag,
   `--enable-experimental-regexp-engine-on-excessive-backtracks`, is rejected for these reasons (Decision 47):
   - **Verified: production never runs under it.** `npm test` starts every test process with no V8 regex flag
     (`src/scripts/test-gate.js` line 426), and the fence runs as `node src/scripts/run-self-check.js` (its usage, line
     6), so a child timed under the flag would time an engine that neither the suite nor the fence runs.
   - **Believed, not probed: it would hide the regression and cannot separate the two.** Once one `exec` backtracks more
     than a set count (`--regexp-backtracks-before-fallback`, default 50,000), V8 reruns it on a linear-time engine, so
     a quadratic regex would measure linear. The bounded regex itself gives back up to 127 characters at each of about a
     million start positions per MiB, far past 50,000 in every scan, so the fallback would fire for a linear and a
     quadratic regex alike. Node gives JavaScript no count of fallbacks either.
   Step 8 does not probe the flag: the verified reason alone rules it out.
3. **Equal work per child.** Every child scans the same total, so for a linear scan every child does the same work for the
   same time with the same allocations. This removes, at its source, the bias suspected of making the old minimum ratio
   fail: a 2-MiB child ran twice as long as a 1-MiB child and so had less chance of a clean sample. Suspected, not
   confirmed: the code and slice 16's record support it (the Problem Statement's cause table), and Step 9's reproduction
   and mechanism probe test it (Decision 45). It also makes the one-time and
   allocation costs, and Windows' coarse CPU-time ticks, the same for every size. The total is 4 MiB (Decision 22); its
   costs are the ceiling (Decision 23) and the run time (Decisions 58 to 61, which replace Decisions 39 and 40).
4. **Superseded by Decision 20.** It kept the sizes at 256 KiB to 2 MiB.
5. **The smallest of three samples per size, then a least-squares fit.** With equal work, every size's three samples come
   from the same spread of load, so taking each size's smallest is unbiased across sizes: slice 16's Decision 17
   reasoning, now with its precondition met. The least-squares slope over the sizes is the exponent; Decision 21 gives
   why least squares rather than the top pair, and the margins. The median of the per-doubling ratios was the other
   allowed estimator: it ignores one bad size entirely but uses less of the data, and the minimum of three already
   removes most single bad samples, so the fit is chosen.
6. **Ruled against by the CTO Chief on 2026-10-13 (Decision 19); superseded by Decisions 20, 21 and 30.** Nothing of it
   stands.
7. **Warm-up scans and `gc()` inside each child.** The test process cannot collect garbage on demand: `npm test` starts it
   without `--expose-gc` (`src/scripts/test-gate.js` line 426), and the test does not rely on it. Each child is started
   with `--expose-gc` and checks for `gc()` itself, failing loudly with status 20 if it is missing. Before timing, each
   child scans the 4-KiB corpus sixteen times, untimed (Decision 43). The reason is not a one-time cost: under equal
   work a cost paid once per child adds the same share to every size and cannot tilt the real-scan case's fit. It is a
   first run whose cost grows with its input: if V8 first ran a regex in its bytecode interpreter, that slower pass
   would be all of the 4-MiB child's timed work and a sixteenth of the 256-KiB child's, raising the fit toward failing a
   linear scan. Believed: V8 compiles a regex to native code at its first run on a subject of 1000 characters or more,
   and otherwise after one interpreted run; sixteen warm-up scans make the design independent of both, and Step 8's
   probes 3 and 4 measure them.
8. **The injected cases are permanent tests, not only a Step 10 mutant check.** The dispatch allowed either; the CTO
   Chief's ruling requires the sensitivity case to be permanent. A permanent case proves on every run and every platform
   that the measure can fail, which a one-off mutant check cannot do. Equal work makes this necessary, not optional: a
   measure that timed nothing, or only a fixed cost, would print about the same figure for every child and fit an
   exponent of exactly 1, a perfect linear verdict; only the injected cases, reading 1 as well, turn that red. A bound
   loosened past the sensitivity scan's exponent turns it red too. They cost about 10.3 + 7.0 = 17.3 s per run since
   Decision 67 (the Problem Statement's run-time table), in a file of their own since Decision 55. Their
   children are no longer than the real-scan case's (Decision 25), so they add no kill risk. Their larger sizes are their
   longer children, so load that inflates longer children more raises their exponents; what load on their shorter
   children can do is bounded by stop rules 2 and 3 (Decision 28).
9. **The swap goes through `RegExp.prototype.exec`, inside the child.** `SURFACE_CALL_RE` is a module constant that is not
   exported (`src/lib/reachability.js` lines 654 and 899-908), and `scan` calls `re.exec(text)` (line 689), so the
   prototype is the one place to inject without editing the source. The regex is recognised by its source text; the swap
   count turns a change to the real regex into a loud failure instead of a silent measure of the real scan. What the
   swapped regex does is Decisions 25 and 26, and what every other regex does there, Decision 67. The swap is an
   instrument control, not a mock of the code under test (Decision 51).
10. **Three samples per size, in rounds.** `RUNS_PER_SIZE` stays 3; Decision 36 sets the order of each round (it
    replaces the rotation of Decision 27). 12 children per case.
11. **Superseded by Decision 24.**
12. **Superseded by Decision 23.**
13. **The repository's test file stays as committed until Step 10.** The dispatch wants the reproduction's numbers before
    any fix, so Step 8 writes the new cases test-first in the scratch copy and proves them there, Step 9 reproduces the
    defect on the committed file, and Step 10 puts the proven file in place and writes its header. Since Decision 55,
    Step 10 puts the proven helper and the two new test files in place, trims the kept file and sets the three
    test-file counts; it fills the four headers' Step 8 and Step 9 slots, and Step 12 fills their Step 12 slots.
14. **The reproduction load.** First a batch at whatever load the machine carries; then synthetic load of fresh,
    short-lived busy processes, because 36 long-lived ones did not contend in slice 16's build; then concurrent scans, the
    shape of a loaded suite; stopping at the first batch that reproduces the failure. How load stands down for another
    CTOC test run is Decision 38, which replaces the one check per batch and the return to the CTO Chief that this
    decision first set. Contention is measured, not assumed. Round 2 made the reproduction a condition of done
    (Decision 62); since round 3 it is recorded evidence (stop rule 7, Decision 81). Decision 28 runs the new cases
    under every load kind.
15. **Superseded by Decision 29, which Decision 39 replaces, itself superseded by Decisions 58 to 60.**
16. **Superseded by Decisions 55 and 56.** It kept the measure in the one file that used it.
17. **`depends_on` names slice 16 only.** It wrote the file this slice changes. No other plan declares the file in its
    `files:`: the search `^\s+-\s+"?tests/reachability-surface-scan-is-linear\.test\.js"?\s*$` over `plans/` matched this
    plan, slice 16 (`done/`) and plan 00233 (`done/`). Since Decision 55 the slice also creates three files and changes
    `README.md` and `CLAUDE.md`; Decision 55 gives why `depends_on` still names slice 16 alone.
18. **Builders run the affected test file and the false-green fence; the full suite runs at Step 14** (the dispatch's
    rule), **and since ruling 4 of round 1 also at Step 12**, to time this file inside it, **and since ruling 2 of round 2
    also at Step 9**, before any change, so that Step 12's run is compared with one of the same session (Decision 61).
    The dispatch ran it only once; the later rulings are followed. Since Decision 55 the affected test files are three
    (the kept file, the real-scan file and the controls file), and Step 12 times the two new files inside the suite.
19. **The CTO Chief's ruling of 2026-10-13 against Decision 6, and what this revision changes.** The owner asked for the
    check to hold under load without weakening the linearity check. Decision 6 let through a scan whose quadratic part is
    about 0.7 to 1.4 times the linear scan at 1 MiB, slice 16's own sensitivity case (equal to it) among them; the ruling
    rejects that as a weakening. This revision follows the ruling's five points: the sensitivity case fails with a stated
    margin and runs on every run (Decisions 21 and 25); the real scan passes the inflation derived in the Problem
    Statement with a stated margin (Decision 21); the sizes, the fit and the bound are chosen together, with the
    arithmetic written in the Problem Statement (Decisions 20 to 22); Step 9 measures both margins under each load kind
    and stops on a thinner one (Decision 28); and the plan no longer says it gives anything up: what the check still
    misses is stated with its numbers and compared with slice 16's check (Decision 30). Kept as the ruling asks: equal
    work per child, the untimed warm-up, `gc()` outside the timed span, the interleaved rounds (in Decision 36's order
    since round 1; Decision 73), the per-size minimum, `files:` (the test file only until Decision 55) and `depends_on`
    (slice 16).
20. **Five sizes, 256 KiB to 4 MiB (replaces Decision 4; the size set is now Decision 35's four, which leave out 1 MiB
    and change no figure here; "a sixth size" below is a fifth one there, worth about 0.005).** Under the stress the
    ruling names, one size inflated 1.6
    times, the candidates table decides it. Three sizes from 1 MiB upward (1, 2 and 4 MiB) raise the q = 1 exponent to
    1.661, but weigh each end size ±0.5, so one inflated size moves the fit 0.339: a linear scan reaches 1.339 and the
    sensitivity case falls to 1.322, and no bound separates them; the sensitivity case, now a permanent test, would fail
    under that load. Adding 512 KiB and 256 KiB lowers the q = 1 exponent to 1.500 but the end weights to ±0.2, and
    leaves 0.114 on each side of 1.25. A sixth size, 128 KiB, would add 0.003 for three more children per case. 8 MiB at
    the top would give 0.189, but every child would scan 8 MiB (about 2.8 s of CPU time), which needs the ceiling at
    100 s and doubles the run time again. What would flip it: a measured worst inflation on one size well under 1.6 times
    (then 1, 2 and 4 MiB, cheaper, would do), or well over 2.38 times (then 8 MiB at the top, at its cost).
21. **Least squares over all the sizes, and the bound 1.25 (replaces Decision 6).** The top pair, 2 and 4 MiB, weighs
    its two sizes ±1: one size inflated 1.6 times moves it 0.678, so a linear scan rises to 1.678 and q = 1 falls to
    1.059, and no bound separates them. Least squares weighed the five sizes −0.2, −0.1, 0, 0.1 and 0.2, and weighs
    Decision 35's four −0.2, −0.1, 0.1 and 0.2. The bound 1.25
    is the midpoint of linear (1) and q = 1 (exactly 1.5 over these sizes) and, the weights being symmetric, also the
    midpoint of the two figures under the stress (1.136 and 1.364): margins of 0.250 without load and 0.114 with one size
    inflated 1.6 times, on each side. It is lower than the first design's 1.5: the check is
    tighter, not wider. Once the sizes are set the bound is arithmetic, not judgment; it moves only if the sizes do.
22. **Every child scans 4 MiB.** `SCANNED_PER_CHILD` = 4 MiB, the smallest total that every size divides into whole scans
    with the 4-MiB size in the set: the 4-MiB corpus once, then 2, 8 and 16 scans. Equal work (Decision 3) is kept;
    its cost is that every child of the real-scan case scans twice what today's 2-MiB child does, about 1.42 s of CPU
    time.
23. **The kill ceiling goes from 25 s to 50 s (replaces Decision 12), with its written reason.** The ceiling is the hang
    guard, set at 25 s for a child that scanned 2 MiB. Every child now scans 4 MiB, so at the heaviest load recorded,
    where a 2-MiB child took 11 to 12 s, a linear child takes about 22 to 24 s: 1 to 3 s under 25 s, a flaky kill in
    exactly the conditions this slice exists for. At 50 s it keeps the margin of about two times that the 2-MiB child has
    against 25 s today. It removes no check: a child the old ceiling would have killed and this one lets finish is
    measured, and a per-byte slowdown of more than about four times fails the 3000-ms bound while growth faster than
    size^1.25 fails the fit. Its cost: a hang fails after 50 s instead of 25 s; the historical regex still never finishes
    a scan (its 512-KiB scan takes about 852 s / 4 = 213 s, a quarter of its 14 minutes at 1 MiB, and the first child,
    512 KiB since Decision 36, runs eight of them). Not changed to make a run pass:
    no run of the new design has been made at either ceiling.
24. **The 3000-ms bound is read per 2-MiB scan (replaces Decision 11).** `MAX_2MIB_CPU_MS` stays 3000. The 2-MiB child
    runs two scans, so its CPU time divided by two is the figure the bound reads: the same quantity, one 2-MiB scan's CPU
    time, as before. It stays on the 2-MiB size only: applying it to the other sizes would add chances for an absolute CPU
    bound to fail under load and guard nothing new, since a per-byte slowdown shows at the first round's 2-MiB child.
25. **Superseded in part by Decision 86** (stop rule 4 now stops above q = 1.10, not above 1.0, and records a q from
    1.0 to 1.10 as the case's strength above slice 16's, so "never easier to fail" holds at a q of at most 1; the rest
    stands). As it stood:
    **The sensitivity case: permanent, injected, and built from a cheaper call regex (extends Decision 8).** The ruling
    asks for slice 16's sensitivity case as a permanent case, injected as the quadratic case is. Its linear part cannot
    be the real scan: its 4-MiB scan would then cost 4 + 16 = 20 times the linear scan at 1 MiB, about 7.1 s of CPU
    time, killed at 50 s from a wall-clock-to-CPU ratio of about 7 (the heaviest load recorded reached about 15). So both
    of its parts come from the call regex with a window of 24, a pass about a fifth as costly as the real one (believed:
    25 characters to give back at each position against 128; probe 7 measures it), which makes its 4-MiB scan, 20 MiB of
    passes, cost about what a real child's 4 MiB do. Its quadratic part is the same regex object scanning size² / 1 MiB
    characters of the same text, so at 1 MiB it is exactly one more pass: equal to the regex's own pass, and short of the
    whole linear scan by its reads and walks (q about 0.96 to 0.99, believed, since Decision 67 took the other regexes
    out of its children; 0.9 to 0.97 with them). It is therefore never easier
    to fail than slice 16's case: the fitted exponent rises with the quadratic part and falls with a fixed cost per scan
    (the weights grow with size; the quadratic part's share of a scan grows with size, a fixed cost's shrinks), so a
    failing verdict on this scan implies one on a scan whose quadratic part equals the linear scan. Probe 7 measures q and
    stop rule 4 stops above 1.0, where the case would be the stronger of the two and prove less. The test asserts at
    least 1.25; the margins are the stop rules' (Decision 28).
26. **The quadratic case is rebuilt the same way (replaces the growing window of Decision 9).** The same swap without the
    regex's own pass: the call regex's whole cost is its size² / 1 MiB characters. Expected about 1.90 to 1.97 since
    Decision 67 (1.83 to 1.95 before it; the reads and the fixed cost keep it under 2); its longest child, 16 MiB of passes at 4 MiB, is about four fifths
    of a real child. One swap function serves both injected cases, and the swap object is the same for every size, so
    `measureScaling` takes it directly instead of a function of the size. The swap-count message now also names a scan
    that runs the regex more than once, since the quadratic part runs at a scan's first call. The rest of Decision 9 (the
    swap on `RegExp.prototype.exec`, the regex recognised by its source text, the count) stands.
27. **Superseded by Decision 36.** The rounds rotated by two sizes over five sizes, so that every size ran in one of the
    first two places in some round and in one of the last two in another.
28. **Step 9 measures both margins under each load kind (extends Decision 14; the ruling's point 4).** At ambient load
    and under each of the three load kinds (`fresh-2x`, `fresh-4x`, `scans-2x`): 5 runs of the real-scan case, 5 of the
    sensitivity case and 3 of the quadratic case, each load batch started afresh and ended by its 10-minute deadline.
    The stop rules: the real scan at most 1.136 in every run (0.114 under the bound, the 1.6-times stress); the
    sensitivity case at least 1.45 at ambient load (stop rule 4) and at least 1.31 in every run (0.06 over the bound:
    1.45 less the 0.136 that one size inflated 1.6 times takes); the quadratic case at least 1.75 at ambient load and
    1.6 in every run. A run outside them stops the build and returns the plan as needs-input. Since Decision 69 the
    ambient floors, 1.45 and 1.75, are stop rule 4's, applied to the median of Step 8's three control-row runs; every
    run of Step 9, ambient or loaded, is held to 1.31 and 1.6 (stop rules 2 and 3).
29. **Superseded by Decision 39, itself superseded by Decisions 58 to 60.** It put the run time at about 45 s for five sizes and named 512 KiB to 4 MiB as the
    faster design; with four sizes both designs run 12 children of 4 MiB each, so that alternative is no longer faster.
30. **What the check still does not see, and how it compares (the ruling's point 5).** Stated in the Problem Statement
    and in the header (the helper's since Decisions 55 and 72): a quadratic part under 0.293 times (Decision 73) the
    linear scan at 1 MiB (1.17 times it at 4 MiB) passes the fit, and under 0.59 times when the scan's 256-KiB size is inflated 1.6 times; the 3000-ms bound fails one from about
    1.6 times. Slice 16's ratio check failed from 0.71 times, and from none below 1.6 times with its 1-MiB size so
    inflated. The new check fails everything the ratio check failed and more; the plan calls that greater sensitivity,
    not equal, and names the band both miss.
31. **The variant table (Step 8).** The mixture row is gone: it is now the permanent sensitivity case. The raised-bound
    row sets `MAX_EXPONENT` to 1.6, where the sensitivity case must fail and the quadratic case still pass (the
    sensitivity case is the one that catches a slightly loosened bound), and then to 2.2, where both fail. The
    catastrophic, slow-linear and allowed-slowdown rows inject through the same swap with `quadratic: false`. Every row
    must now come out as stated. Probes 7 (the components at 1 MiB) and 8 (the arithmetic, recomputed) are added; probe 3
    times sixteen scans, probe 4 also traces the window-24 regex, and probe 6 also runs the sensitivity case, since
    coverage raises the fixed cost per scan, which weighs most on that case.
32. **Where this revision changed the plan.** The introduction (a note of the revision); in the Problem Statement, the
    list of what a run must confirm, the design list, a new arithmetic section with the run-time table, and "What it
    still does not see" in place of "What it gives up"; in the File Specifications, the constants, the child program,
    the measure and the three cases, the notes, the header text, the error handling and the cross-platform figures; in
    the Test Plan, the name patterns, the probes, the variants, the load conditions, the Step 9 runs, the stop rules and
    the run time; the Security Review; the Acceptance Criteria; Decisions 3 to 15 where they pointed at the first design;
    the Risks; one line under Neighbours; and Steps 8 to 16. `files:` and `depends_on` are as they were.
33. **Contention is a condition of done (ruling 1; closes the round-1 finding that the build could pass on load that did
    not contend, as slice 16's claim check did at a ratio of at most 1.64).** Stop rule 5 requires one batch, of any
    load kind, with a median wall-clock-to-CPU ratio of at least 4 while the new cases run (the real failures came at 4
    to 15, loaded wall-clock against unloaded CPU, not a ratio within one run; Decision 64 gives that basis and what a
    within-run 4 stands for), in which all three cases ran and every run held stop rules 1 to 3; Step 9's third run
    (its fourth since Decision 61 put the ambient suite run first) now runs the three cases in turn inside each batch
    so that such a batch exists. The ratio comes from a meter whose children are 4-MiB
    scans shaped like the test's own: the committed test prints no wall-clock time, and a whole run's time against its
    CPU figures would count Node's start-up, the corpus writing and the warm-up as contention. If no batch of the three
    load kinds reaches 4, the build stops and returns the numbers as needs-input; no heavier load is invented in this
    round, and the build never passes on uncontended load.
34. **Superseded by Decisions 65 and 66** (its instrument, `taskpolicy -b`, also lowered priority, and its answer read R
    alone). As it stood: **What an efficiency core costs is measured, and the build's answer is fixed in advance (ruling 1; closes the
    round-1 finding that the plan named the core type as a mechanism without measuring it).** Probe 9 runs three 4-MiB
    children alone and three under `taskpolicy -b`, believed to confine a process to the efficiency cores, and records
    whether it does (E + 2 children at once under it against E + 2 without it, E the efficiency-core count). Its ratio
    R is compared with the thresholds the Problem Statement derives ("What inflation turns a verdict"): 4.2 for one
    2-MiB child against the 3000-ms bound, the lowest, because that bound reads every 2-MiB child and no minimum
    (3000 / 710); 2.38 and 1.78 for the real case; 2^((E_s − 1.25) / 0.2) and 2^((E_s − 1.25) / 0.3) for the
    sensitivity case, 2.00 and 1.59 at its floor of 1.45. Stop rule 6 fixes what the build does: R at or over a
    one-child or one-size threshold, it finishes Step 9 (the contended runs are the evidence the owner needs) and then
    returns needs-input whatever they showed; at or over only a two-size threshold, it goes on and says so; not
    measured, it says so and the rule decides nothing. `taskpolicy -b` with `nice -n 19` starved a test process in
    slice 16's build (record lines 785-789), so every probe child keeps the 50-s kill and a killed child is recorded as
    such.
35. **Four sizes: 1 MiB is not measured (ruling 2; closes the round-1 finding behind it: the 1-MiB size, whose weight
    in the fit is exactly zero).** With 256 KiB, 512 KiB, 1, 2 and 4 MiB, log2 of the size in MiB is −2,
    −1, 0, 1 and 2, their mean is 0 and Σ(u − ū)² = 10, so least squares weighs the sizes −0.2, −0.1, 0, 0.1 and 0.2:
    the 1-MiB samples could not move the slope. Without them the mean is still 0 and the sum still 10, so the other four
    weights, and with them every exponent, margin and threshold of the Problem Statement, are unchanged: each is
    Σ w_i × (a term of size i), and the 1-MiB term was multiplied by 0 (the Problem Statement, "Why 1 MiB is not
    measured"). The figures this revision recomputed by hand for the four sizes agree, and probe 8 recomputes them
    all. What changes: 12 children per case instead of 15, about 36 s for the three cases instead of about
    45 s (the run-time table; about 35.3 s since Decision 67, in two files run side by side since Decision 55), and
    each child scans 16, 8, 2 or 1 times. Decision 20's range stands; a fifth size,
    128 KiB, would now add about 0.005 to the margin, where a sixth added 0.003 to five. No bound moved.
36. **The order of the rounds (ruling 2; closes the round-1 finding behind it: a stretch of a round could carry a
    large total weight, so a load that starts partway through a case and stays could move the fit much).** This
    revision's own figure for the old order: Decision 27's rotation ran round 1 in rising order,
    256 KiB to 4 MiB, so a load arriving after its second child covered all samples of 1, 2 and 4 MiB, weights
    0 + 0.1 + 0.2 = +0.3, and moved a linear scan's fit by 0.3 × 0.678 = 0.203 at f = 1.6, to 1.203. Rounds 1 and 2 now
    run 512 KiB, 4 MiB, 256 KiB, 2 MiB and round 3 the reverse (`ROUND_ORDERS`). A size's estimate moves only when a spell
    of load covers all three of its samples; with round 3 the reverse of round 1, the sizes one spell covers are always
    a remaining stretch of round 1, and every remaining stretch of every round weighs 0 or ±0.1 in total (the table in
    the Problem Statement, "The order of the rounds"). So one spell with one inflation f moves the fit by at most
    0.1 × log2 f, 0.068 at f = 1.6; 0.1 is the least any order can reach, and only this order and its reverse reach it.
    The first child is now 512 KiB, not 256 KiB, which changed the `HARD_TIMEOUT_MS` comment, the catastrophic and
    missed-swap rows (a first child of eight scans) and Decision 23. `RUNS_PER_SIZE` stays 3; nothing is sampled less.
37. **Runs whose load starts mid-case (ruling 2; closes the round-1 finding behind it: no run, in Step 9 or in the
    reproduction, had its load start mid-case).** Such a load is believed to be the likeliest shape of the real
    failure: another build's suite starting while this test runs. Step 9 adds, per load kind, 5 such runs of the old
    case to the reproduction, and 3 of the real-scan case and 1 of each injected case to the new cases' runs, each in a
    batch of its own whose load starts after the run's first child returns (since Decision 82 its workers and meter are
    started before the run, blocked on an event, and released at the first child's end mark). The start is an event,
    not a poll: a preload given to that run only (`first-child.js`, since Decision 68 the marks preload `marks.js`, through
    `NODE_OPTIONS`) records each scan child's start and end, and `load.js` reacts to the first end through `fs.watch`.
    For the old case that load covers all three 2-MiB samples and none of the clean first 1-MiB one, so it predicts a
    failure from an inflation of 1.35 to 1.44, which the reproduction can confirm or refute; under Decision 62 a
    refutation stopped the build, and since Decision 81 it is recorded and stops nothing (stop rule 7). For the
    real-scan case it covers the stretch from child 2, +0.1, so its fit should rise by at most 0.1 × log2 f. The
    injected cases' worst
    stretch, −0.1 from child 3, is not run; it would lower them by at most 0.068 at f = 1.6, inside what stop rules 2
    and 3 allow under load (1.45 − 1.31 = 0.14 and 1.75 − 1.6 = 0.15).
38. **Load workers stand down before every busy child (ruling 3; closes the round-1 finding that one check per batch
    let synthetic load run for up to 10 minutes under another build's tests).** Every load worker, and the meter, looks
    for another CTOC test run before each busy child it starts; a `fresh-` worker starts one every 150 to 600 ms, so the
    check adds no waiting loop. "Another CTOC test run" is a process outside `load.js`'s own process tree (since
    Decision 84 also outside `load.js`'s ancestors, `load.js` reading its runs from a JSON file) whose command
    line names `test-gate.js` or a file of this repository's `tests/` folder (since Decision 74, the file name of any
    of its `tests/*.test.js` files, matched without the path, so that a run of the same files from another worktree's
    copy counts): leaving out the tree keeps the harness's
    own runs from voiding every batch, and matching CTOC's test files rather than any `npm test` keeps idle test
    wrappers of other projects (slice 16's record lines 773-775) from voiding them. The first sighting ends a batch that
    adds load at once: every worker, the meter and the run in progress are killed with their process groups, and the
    batch's runs are recorded as void, not as a stop; neither stop rule 5 nor, since Decision 62, stop rule 7 counts a
    void batch. In an ambient run, which adds no load, the meter that finds one stops and the run stands (the Test
    Plan's load rules). Void runs go to the end of the step's
    queue, and before the next batch the builder runs the next pending run that adds no load, if one is left, so a void
    is not followed at once by another batch; three void batches in a row stop the build as needs-input (the machine had
    no window free of other test runs; since Decision 74, only batches that add load count toward the three, and an
    ambient run between two of them neither breaks nor extends the count). That bound is a choice made here, not in the ruling: without it a busy machine
    could void batch after batch with nothing to end it. Nothing sleeps or polls to wait. `scans-2x` workers now start
    one scan child at a time (the old runner on a 1-MiB corpus, about 0.45 s alone) instead of a whole run of the old
    case, which lasts seconds and would have checked only between runs. Probe 9 makes the same check once before each
    of its concurrent sets. The Security Review and the Risks state what this guarantees and what it does not:
    no busy child after a worker's own sighting, and an overlap of at most one worker cycle, not none.
39. **Superseded by Decisions 58 to 60, and by Decision 55 for its one-file figures** (its "with or without this file"
    figures and its last-to-finish case rested on 202 to 235 s and on this file's place in name order; since the split
    the two new files take about 18 s and 17.3 s side by side, 10 and 20 minutes at worst, and a builder's
    affected-test run about 18 s, 3.6 to 4.5 minutes under the heaviest load recorded). As it stood: **The run time, against the push cap and an agent's foreground limit (ruling 4; replaces Decision 29; closes the
    round-1 findings that the plan named neither the 300-s cap that push and the hotfix check put on `npm test` nor an
    agent's 10-minute foreground limit, and called the suite's floor "believed" without reading how the suite runs).**
    The three cases take about 36 s alone at ambient load and the file about 37 s (12 children per case since
    Decision 35), against 4.1 s today; about 7 to 9 minutes under the heaviest load recorded; 30 minutes at worst
    (36 children × 50 s), which the header states. `src/scripts/test-gate.js` passes every file to one `node --test`
    with no concurrency flag (line 426), so files run side by side (believed up to 17 at once here). This file, the
    408th of 575 in name order, adds about 3 s to the ambient suite if the other slots stay busy and up to about 47 s if
    it finishes last: about 205 to 282 s against today's 202 to 235 s. Push and the hotfix check give `npm test` 300 s
    (`src/lib/quality-agent.js` line 178), after which the run is undetermined and cannot pass. Under a load that slows
    everything c times the suite passes 300 s from c = 1.3 to 1.5 with or without this file. Builders who touch
    `src/lib/reachability.js` or this file pay about 37 s per affected-test run instead of about 4 s, and 7 to 9 minutes
    under heavy load, close to an agent's 10-minute foreground limit (ruling 8's seventh point is met here). The
    arithmetic is in the Problem Statement, "Against the time limits". Quality over speed (the owner's rule of
    2026-10-09); what would flip it is Step 14's stop or the owner ranking push's room above these margins, and the
    options are then his to schedule (Decision 40).
40. **Superseded by Decision 61, and by Decisions 55, 59 and 68 for its other parts** (the absolute 270-s stop at Step
    14 is replaced by a same-session comparison, stop rule 8; the split into files of their own that it left to the
    owner is built here, Decision 55; the 300-s cap, already exceeded at ambient load, is a finding for the owner,
    Decision 59; its loaded whole-suite run starts its load at the new files' first scan child, Decision 68). As it
    stood: **Step 12 and Step 14 measure the run time against the cap, and what the build does with it (ruling 4; closes the
    round-1 finding that nothing measured this file's cost inside the suite or held the suite against the cap).** Step
    12 times the file alone, then inside a whole-suite run with the gate's own flags (`npm test`) at ambient load, and
    once more under one batch of the most contended load kind. Step 14 records the suite's wall-clock time against
    300 s and stops as needs-input if the ambient suite takes 270 s or more. A loaded suite over 300 s is recorded as a
    finding for the owner to schedule: raise the push cap, or split the timing cases into a file of their own
    (Neighbours lists both). Neither is built here: both lie outside `files:`, and a new test file moves the count in
    `CLAUDE.md`. The ruling adds a whole-suite run at Step 12 where Decision 18 ran the full suite only at Step 14; the
    ruling is followed, and Decision 18 and the Execution Plan say so. The header states the file's worst case.
41. **Probe 7 compares children of equal length (ruling 5; closes the round-1 finding that probe 7's sets ran children
    of very different lengths, set after set, and took medians).** Four scans of the rest of the scan take about
    0.02 s and four real scans about 1.4 s, so load could reach the sets unequally and tilt q, the very bias this slice
    removes from the test. Every child now uses about 1.4 s of CPU time whatever its set (a calibration child per set
    fixes its number of scans), the six sets (seven since Decision 67) are interleaved child by child over five rounds, each set's figure is the
    smallest of its five, and each child's length and each set's count are recorded beside q: the test's own reasoning
    (Decisions 3 and 5) applied to the probe. Found while applying the ruling, not a round-1 finding: the fixed-cost set
    scanned the 4-KiB corpus with no swap, so its figure held a 4-KiB pass of the real call regex, about
    4 / 1024 × 355 = 1.4 ms, more than the 0.3 to 1 ms it was meant to measure. It now runs the swap under which the call
    regex does nothing, and the rest per MiB and the fixed cost are solved from the two sets that hold f + r and
    f + r / 256: r = (R1 − R4) × 256 / 255 and f = R4 − r / 256. Since Decision 67 that swap also skips the other four
    regexes (`skipOthers`), as the controls do, so r is the two reads alone; the seventh set, R1n, runs them with the
    call regex doing nothing, and R1n less R1 is what the skip removes.
42. **Two deterministic variants replace the blind-measure one (ruling 6; closes the round-1 finding that the
    blind-measure row accepted either of two outcomes, so it could not fail).** Taking `c0` after the timed scans gives
    a figure of zero or of a few microseconds, and the row accepted the zero guard or "an exponent near 1", whichever
    came. Now each outcome is fixed in advance. The child prints a constant `CPU_US=1000000`: each size's figure is
    1000 ms over its number of scans, whose log2 is log2(1000) − 22 + log2(size) (4 MiB is 2^22), so the fit is exactly 1
    up to floating-point rounding and prints 1.00; the real-scan case passes at 1.00 and both injected cases fail at 1.00,
    which is what a blind measure does to them, and the 2-MiB scans read 500 ms, under the 3000-ms bound, so that bound
    cannot stop the row early. The child prints `CPU_US=0`: all three cases fail at their first child on the zero guard.
    The Acceptance Criteria and the notes on the code say the same.
43. **The warm-up: its real reason, and sixteen scans (ruling 7; closes the round-1 finding behind it: the warm-up's
    stated reason, a one-time cost spread over sixteen scans at 256 KiB but carried whole by the one scan at 4 MiB, was
    not its real one, and one warm-up scan was too few).** This revision's analysis: a cost c paid once per child adds
    c / 1.42 s to every size of the real-scan case alike, since every child does the same work, so it cannot tilt that
    fit. What can is a first run whose cost grows with its input: an interpreted first pass of a regex
    is the 4-MiB child's whole timed scan but one of the 256-KiB child's sixteen. Were it three times slower than native
    code (an assumed figure), the four sizes would be inflated 3, (3 + 1) / 2 = 2, (3 + 7) / 8 = 1.25 and
    (3 + 15) / 16 = 1.125 times, and a linear scan would fit
    1 + 0.2 × log2 3 + 0.1 × log2 2 − 0.1 × log2 1.25 − 0.2 × log2 1.125 = 1 + 0.317 + 0.1 − 0.032 − 0.034 = 1.35, over
    the bound. Every child now scans the 4-KiB corpus `WARM_UP_SCANS` = 16 times before timing, as many as the
    256-KiB child times, so every regex and every function of the scan has run sixteen times before the first timed
    scan, whatever V8's rule for compiling a regex. That costs about 16 × 2 ms = 30 ms per child, outside the timed span.
    Probe 3 now also times a 4-MiB child's first scan against its second (one-sided, on the smallest of five or more
    children, since Decision 69), the case the reason is about, and stop rule
    4 holds it to at most 1.10 times. The comment above the constants, Decision 7 and the design list give the same
    reason; the helper's header (Decision 55) and the Acceptance Criteria name the sixteen scans.
44. **√2 lies inside the range load added (ruling 8; closes the round-1 finding on where the ratio check's margin,
    √2, lies against the 1.3 to 1.6 times that load added to single samples).** Applied before this run and recorded
    here: 2.83 / 2 = 4 / 2.83 = √2 = 1.414, and 1.3 < 1.414 < 1.6, so the cause table says the margin lies inside that
    range and load in its upper part crosses the bound.
45. **Decision 3 calls the cause suspected (ruling 8; closes the round-1 finding that Decision 3 stated as fact that
    the minimum estimator's bias made the old check fail).** The bias follows from the argument; that it caused the
    failure is supported by the code and slice 16's record, not confirmed: no failing run's figures are on disk, and
    Step 9's reproduction and mechanism probe test it. Decision 3 now says so.
46. **The header gives both failure conditions (ruling 8; closes the round-1 finding that the header named only one).**
    Since Decision 55 that header is the helper's, and it keeps both; since Decision 87 it also gives the third, a
    single 2-MiB child slowed about 4.2 times, against the 3000-ms bound. A linear scan fails when its 4-MiB size alone
    is inflated 2^(0.25 / 0.2) = 2.38 times against the others, or its two largest sizes 2^(0.25 / 0.3) = 1.78 times
    each. Recomputed for the four sizes: the 4-MiB size weighs 0.2 and
    the two largest 0.1 + 0.2 = 0.3, as before, so both figures stand.
47. **Decision 2 gives the real reason the engine fallback flag was rejected (ruling 8; closes the round-1 finding that
    the plan rejected `--enable-experimental-regexp-engine-on-excessive-backtracks` on an unverified belief).** The
    verified reason: neither `npm test` (`src/scripts/test-gate.js` line 426) nor the fence's command line
    (`node src/scripts/run-self-check.js`, its line 6) runs under it, so a child timed under it would time another
    engine than production's. The believed reasons are labelled as such in Decision 2: it would hand a quadratic regex
    to a linear-time engine, and the bounded regex itself passes the fallback count in every scan. Step 8 does not
    probe the flag, because the verified reason alone rules it out.
48. **Step 8 applies stop rule 4's probe parts before the variant table (ruling 8; closes the round-1 finding that
    rule 4 was applied only after the variant table, which takes minutes).** Rule 4 now runs in two parts: its probe
    parts (`gc()`, the warm-up, q, the arithmetic) right after the probes and before any variant, and its control-row
    parts right after the control row and before the other variants. A failing probe costs no variant run. The Step 8
    checklist and the stop rules' opening say so.
49. **The worktree check in the cause analysis (ruling 8; closes the round-1 finding that the plan had not ruled out an
    old, unbounded regex in the worktree whose run failed).** Applied before this run and recorded here: the search
    `const SURFACE_CALL_RE = ` over the copies of `src/lib/reachability.js` under `.claude/worktrees/` matched one line
    per copy, each the bounded `{0,127}` form at line 654: 30 lines on 2026-10-13 and 31 on 2026-10-14, one worktree
    more (Decision 63, which also names the four copies that carry slice 16's test). It is a check that
    the literal text is present, not of what ran, and it assumes the failing worktree's copy did not change between its
    run and the search.
50. **Superseded by Decision 55** (the split it listed under Neighbours for the owner is built here, so Neighbours no
    longer lists it; a builder's affected-test run is now the two new files side by side, about 18 s at ambient load
    and 3.6 to 4.5 minutes under the heaviest load recorded, and the kept file alone about 0.3 to 1 s: the Problem
    Statement, "Against the time limits"). As it stood: **Builders' affected-test runs in the cost, and the split as an
    option for the owner (ruling 8; closes the round-1 finding that the cost analysis counted only `npm test`).**
    Applied with ruling 4: the Problem Statement ("Against
    the time limits"), the Risks and Decision 39 name the builders who run this file as their affected test, about 37 s
    instead of about 4 s each time and 7 to 9 minutes under heavy load; Neighbours lists, for the owner to schedule,
    moving the timing cases into a file of their own, beside raising the push cap.
51. **The `exec` swap is an instrument control, not a mock (ruling 8; closes the round-1 finding that the swap could be
    read as mocking away the code under test, which CLAUDE.md forbids).** The real-scan case times the real scan with
    nothing replaced; the two injected cases test the measure, handing it a scan of known shape, and the measure runs
    unchanged in every case. A note on the code and Decision 9 say so.
52. **Three figures corrected (ruling 8 for the first; the other two found while recomputing every figure for ruling
    2).** The 512 KiB to 4 MiB row's margin is 1.2898 − 1.2034 = 0.0864, so 0.086, not 0.087. The 512 KiB to 8 MiB
    row's q = 1 figure with one size inflated is 1.6492 − 0.1356 = 1.5136, so 1.514, not 1.513. The quadratic case's
    expected exponent at the cheap end of the beliefs (p = 70 ms per MiB, r = 2 ms per MiB, f = 0.3 ms) is 1.946, so
    its range is 1.83 to 1.95, not 1.83 to 1.94. Each computation is written beside its figure in the Problem
    Statement. No bound and no stop rule rests on any of them: the first two belong to designs not chosen, and the
    quadratic case's floors stay 1.75 and 1.6. The third figure is superseded by Decision 67: with the scan's other four
    regexes skipped, the rest of the injected scan is its two reads (r = 0.5 to 2 ms per MiB), the quadratic case is
    expected at 1.904 to 1.970, and the Problem Statement now carries that computation in place of this one; the first
    two stand.
53. **The Security Review lists every spliced value (ruling 8; closes the round-1 finding that it named three of the
    child program's interpolated values and missed the exit status).** The program splices exactly five:
    `JSON.stringify(REACH)`, `JSON.stringify(swap)`, `MiB`, `GC_MISSING_STATUS` (20) and, since Decision 43,
    `WARM_UP_SCANS` (16), each a constant or a value the helper builds (the test file built them before Decision 56);
    the corpus folders and the number of scans reach the child as arguments, not as program text.
54. **Where this revision changed the plan.** The introduction; in the Problem Statement, the worktree line of the
    cause table, the paragraph on counting backtracks, the list of what a run must confirm, the design list, the
    candidates table and its notes, three new parts of the arithmetic ("Why 1 MiB is not measured", "The order of the
    rounds", "Against the time limits"), the injected cases' expected range and the run-time table; in the File
    Specifications, the purpose, the list of changes, the constants, the child program, the measure, the notes, the
    header text and the cross-platform figures; in the Test Plan, probes 3, 7, 8 and 9, the variant table, the load
    kinds and their rules, the mid-case runs, the Step 9 runs, the stop rules and the run time; the Security Review;
    the Acceptance Criteria; Decisions 2, 3, 7, 8, 9, 10, 14, 18, 20, 21, 22, 23, 27 and 29 where they pointed at what
    changed; the Risks; Neighbours; and the Execution Plan's opening and Steps 8, 9, 11, 12, 13, 14 and 16. `files:`
    (the test file only) and `depends_on` (slice 16) are as they were. No bound or ceiling moved, and the no-weakening
    ruling stands. The round-1 review records were not available to this revision, so each finding in Decisions 33 to
    53 is named by the ruling that answers it, and the figures given with it are this revision's own evidence. Five
    things go beyond the rulings, each with its reason: probe 3's 4-MiB child and the stop-rule-4 clause on it
    (Decision 43), the stop after three void batches in a row and `scans-2x` as single scan children (Decision 38), a
    whole-suite run under load at Step 12 (Decision 40; since round 2, Decision 68), and probe 7's fixed-cost set under
    the swap that makes the call regex do nothing (Decision 41; since round 2 with the other regexes skipped too,
    Decision 67).
55. **The file is split in three, with a shared helper (ruling 1 of round 2; closes the round-2 finding that one file
    held both the real-repository semantic checks, which the agent-and-skill improvement program runs for every file of
    its inventory, three rounds each, and about 36 s of timing cases that check nothing that program changes).** The
    kept file, `tests/reachability-surface-scan-is-linear.test.js`, keeps only its two `SEMANTICS PRESERVED` describes,
    byte for byte, and its name, which the inventory lists (`.ctoc/audit/agent-and-skill-improvement/inventory.json`,
    225 matching lines, read 2026-10-14). "Its real-repository semantic checks" is read as both describes: the second runs
    the two fences on the real repository, and the first checks the bounded regex's semantics on a three-line corpus in
    milliseconds; neither is a timing case, and moving the first would change a file the ruling keeps. The real scan's
    timing case moves to the real-scan file, with its `describe` name and its case name; the two injected controls move
    to the controls file; the measure goes into the helper, under `tests/helpers/`, the folder and the form this
    repository already uses to share test code (three helpers there, required by five test files; the faster-suite
    round's split of `tests/hotfix-check.test.js` made `tests/helpers/hotfix-check-harness.js` the same way). The names
    carry this plan's slug, as the ruling asks, and stay under 120 characters: the slug is 102 characters ("four", then
    20 parts each counted with its hyphen: 4 + 8 + 3 + 4 + 5 + 4 + 4 + 8 + 6 + 3 + 5 + 3 + 3 + 4 + 4 + 7 + 5 + 5 + 6 + 6
    + 5 = 102), so the helper's name is 102 + 3 = 105 characters, the real-scan file's 102 + 5 + 8 = 115 (`-real`,
    `.test.js`) and the controls file's 102 + 9 + 8 = 119 (`-controls`, `.test.js`). Read as the file names: with their
    folders the paths are 14 + 105 = 119, 6 + 115 = 121 and 6 + 119 = 125 characters. If the CTO Chief meant the paths,
    no suffix that says what a file holds fits (at most 113 − 110 = 3 characters before `.test.js`), and the names are
    his to set. Each test file runs in a process of its own, side by side with the others, under `npm test`. `files:`
    declares the four files and the two count documents; the sizing rule's "about 1 to 3 files" is exceeded by one on
    this ruling. `depends_on` stays slice 16 alone: no other plan declares any of the three new paths. Other plans do
    declare `README.md` or `CLAUDE.md` (the search `^\s+-\s+"?(README|CLAUDE)\.md"?\s*$` over `plans/` matched 179
    files on 2026-10-15, this plan and many done plans among them), and any of them that adds or removes a test file
    changes the same three count lines. That makes none of them a dependency of this slice: the build edits only those
    three numbers and writes the live count of `tests/*.test.js` at Step 10, whatever other work has done to it
    (Decision 57; this sentence reworded by Decision 87). Decision 16 ("no new test helper") is superseded.
56. **One measure in the helper, run by both test files (ruling 1; closes the round-2 finding behind the split's
    "shared measuring code").** The controls prove that the measure fails a super-linear scan; that proves something
    about the real check only if the real check runs the same measure. So `measureScaling`, its per-child assertions,
    `fitExponent`, the runner program and every constant (above all `MAX_EXPONENT`) live once, in the helper, and both
    files call it. Two copies could drift: a blind or loosened copy in the real-scan file would pass while the controls
    passed on theirs. The helper therefore asserts, unlike main's three helpers, which only read and return: the
    per-child checks are part of the measure. It exports the five names the two files use (`MAX_EXPONENT`,
    `SURFACE_CALL_SOURCE`, `INJECTED_SOURCE`, `measureScaling`, `machineLoad`) and nothing else; the dead-export fence
    reads `src/` only (`collectJsFiles(srcDir)`, `src/lib/reachability.js` line 478), so a helper's exports are not its
    business, and the list is kept to what is used all the same.
57. **The counts the split moves (ruling 1; closes the round-2 finding that the plan's counts and `files:` did not
    follow the new files).** On 2026-10-14 `tests/*.test.js` held 575 files (a `Glob`), and `CLAUDE.md` (lines 61 and 94)
    and `README.md` (line 1145) say 575. Two new test files make 575 + 2 = 577, unless other work adds or removes test
    files meanwhile, in which case the build writes the live count (`computeDocCounts`). The helper moves no count: it is
    not `tests/<name>.test.js`. `README.md`'s number is asserted against disk (`tests/readme-numbers.test.js` lines
    321-323), so the update is required for `npm test` to pass; `CLAUDE.md`'s two are generated by `release.js` and
    asserted only through that generator (`tests/doc-counts.test.js`, `tests/doc-counts-generated.test.js`), and
    `src/lib/documented-counts.js` requires the declaration. The build edits these three numbers by hand and never runs
    `release.js`, which is a release step. Places in name order (the runner sorts files by name, Decision 75): 232 test
    files begin with a to e and 2 more with f sort before `four-defects-…` (`fail-open-contracts`, `false-green-fence`;
    `four-eyes-coverage` sorts after it, "d" before "e"), so the controls file is the 235th of 577 and the real-scan file
    the 236th ("c" before "r"); the kept file, the 408th of 575 (141 names begin with s to z and 26 more names beginning
    with r sort after it: 575 − 141 − 26 = 408), becomes the 408 + 2 = 410th of 577.
58. **What sets the suite's length today, and what this slice adds in main (ruling 2; closes the round-2 finding that
    the run-time model let this file finish last and lengthen the suite by up to 47 s without naming the file that sets
    the suite's length).** In main that file is `tests/hotfix-check.test.js`: 233.77 s of a 241.18-s run of
    `node --test tests/*.test.js` over 567 files at a load of 16.8 to 65.0 (the faster-suite round's slice 1 record, in
    its worktree, lines 1456 and 1459; the critic's citation, read and confirmed here). Main still has it whole (a `Glob`
    of `tests/hotfix-check*.test.js` finds it, `-corpus` and `-differential`). The two new files start after 234 of the
    577 files and take about 18 × 1.3 = 23 s to 18 × 1.44 = 26 s each inside the suite, so they end long before a 234-s
    file; they lengthen the suite only through the share of the machine they take from the other files:
    35.3 × 1.3 = 46 s to 35.3 × 1.44 = 51 s of timing cases inside the suite, 40 to 45 s more than the old file's 5.9 s,
    spread over 17 slots, at most 45 / 17 = 2.6 s, about 3 s. The last-to-finish case of Decision 39 no longer applies:
    the new files are not near the end of the name order, and a 234-s file outlasts them.
59. **The 300-s cap already exceeded at ambient load is a finding for the owner, not this slice's stop (ruling 2; closes
    the round-2 finding that an absolute stop near 300 s would stop this slice on a suite that misses the cap for other
    reasons).** The CTO Chief's baseline took 368.5 s (`npm run test:raw`, no coverage, load 17.2 to 30.5; the
    faster-suite plan in its worktree, line 51), beside 235 s (`npm test`, load 11.6 to 19.9, slice 16's record line
    737), 241.18 s (above) and 202 s (a loaded start, line 793). Push and the hotfix check give `npm test` 300 s
    (`src/lib/quality-agent.js` line 178), so they cannot count on passing at ambient load today, with or without this
    slice; the faster-suite round addresses it, and Neighbours lists it for the owner. The menu's completion check's
    900 s per command (`src/lib/step-13-verify.js` line 734) is now named beside push's 300 s; a run cut there is reported
    uncertified, never a test failure (its line 751).
60. **The "with or without this file" figures, corrected (ruling 2; closes the round-2 finding that they rested on 202 to
    235 s and on a last-to-finish file).** They said: 202 to 235 s × c passes 300 s from c = 1.3 to 1.5, with or without
    the file, which adds 3 to 47 s × c. Now: under a slowdown c that reaches every process alike the suite stays set by
    its longest file, about 241 s × c without this slice and (241 + 3) s × c with it; 241.18 s × c passes 300 s from
    c = 300 / 241.18 = 1.24 either way, and the 368.5-s run is past 300 s at c = 1; the slice adds about 3 s × c, 12 to
    45 s at c = 4 to 15; the completion check's 900 s is passed from c = 900 / 241.18 = 3.7 either way.
61. **Superseded in part by Decision 80** (stop rule 8 now reads only the median of three normalised differences; the
    30% band of start loads, the plain difference at comparable load and the single compared run are gone; the
    same-session comparison, the per-file durations and their sources, and the end of Step 14's stop on the suite's
    time stand). As it stood:
    **A same-session comparison replaces the absolute 270-s stop (ruling 2; closes the round-2 finding that Step 14's
    stop compared this slice's suite with a fixed figure at an uncontrolled load).** Step 9's first run is `npm test` at
    ambient load with the old file in place, and Step 12 repeats it with the new files; both keep every file's duration.
    The durations come from the runner's own output where it prints a file's duration, and otherwise from the marks
    preload, which records each test file's process from start to exit; `npm test`'s command line is fixed in
    `src/scripts/test-gate.js` line 426, so a preload in the run's environment times it without changing it, and the
    record says which source each figure came from. Stop rule 8 returns needs-input if the suite is more than 15 s
    slower at comparable load, or if either new file is the run's longest. The ruling names "comparable load" without a
    number; the band is a choice made here: start loads within 30% of the larger, with Step 12's run repeated up to
    three times, and when no pair is comparable the difference is taken after scaling by the median per-file ratio over
    the files this slice does not touch, both differences recorded. 300 s stays a recorded figure, beside 900 s.
    Step 14 no longer stops on the suite's time.
62. **Superseded by Decision 81** (the reproduction is recorded evidence, not a condition of done: the CTO Chief
    reversed this ruling after round 3. Decision 81 keeps what a reproduction must show, a batch that adds load, is not
    void and reaches a contention of at least 4, with no failure at ambient load counted, and the mechanism probe's
    place before the count). As it stood:
    **The old case must fail under this build's load before the replacement may ship (ruling 3; closes the round-2
    finding that the plan let the replacement ship on a cause it had not reproduced).** Stop rule 7: at least one run of
    slice 16's old case fails in a batch that adds load, is not void, and reaches a contention of at least 4; a failure
    at ambient load is recorded and does not count. If none does, the build stops before any run of the new cases,
    returns every number, slice 16's check stays, and the relayed failure stays unexplained. A batch runs to its end
    after a failing run, so that its contention covers its whole span. The mechanism probe still runs before the rule is
    applied: it is cause analysis on the old case, and its numbers are among the "every number" the return carries;
    that order is this revision's reading. Recommended next step on a stop: keep the full output of the old case's next
    failure in any worktree, since its diagnostic line carries all six CPU figures. This replaces the Test Plan's "the
    reproduction is not a stop rule" and Decision 14's sentence to the same effect.
63. **Which worktrees carry slice 16's version of the test (ruling 3; closes the round-2 finding that the cause analysis
    did not say where the relayed failure could have run).** On 2026-10-14, 4 of the 31 copies of the test under
    `.claude/worktrees/` carry it: those of `agent-aadfde140804ea5df`, `agent-a622e500a3eb88033`,
    `agent-a92caf11a57443f01` and `agent-a01f296ce9da6d4b6`, each with `MAX_2MIB_CPU_MS`, `HARD_TIMEOUT_MS`,
    `RUNS_PER_SIZE` and `MAX_RATIO` at lines 73, 79, 83 and 87; the other 27 have `HARD_TIMEOUT_MS = 25000` at line 51,
    the wall-clock design before slice 16 (one search over all 31 for a line that begins `const ` and one of those four
    names followed by ` = `). There were 30 copies on 2026-10-13; one worktree has been added since. All 31 copies of
    `src/lib/reachability.js` hold the bounded regex. The relayed failure ran with slice 16's fix, so in one of the four;
    no file records which. These are checks that text is present in each copy, not of what ran.
64. **Contention also measures what failed the old case, and the basis of "4 to 15" is reworded (ruling 4; closes the
    round-2 findings that a wall-clock-to-CPU ratio does not show the CPU inflation that failed the old case, and that
    "4 to 15" was described as a ratio within one run).** The meter's CPU time per scan is set against the ambient
    minimum, the smallest of any meter child of Step 9's ambient runs, and every batch's median and largest ratio is
    recorded beside its wall-clock-to-CPU ratio; the final report says whether the batch that met stop rule 5, and the
    one that met stop rule 7, reached the old case's failing inflation of 1.35 to 1.44. The basis: slice 16's record
    line 644 ("loadavg 31 to 115, wall 4 to 15 times CPU") sets wall-clock times under load, such as 11 to 12 s for a
    2-MiB child, against CPU times measured alone in other runs, about 0.75 s: loaded wall-clock against unloaded CPU.
    That equals the within-run ratio times the CPU inflation, so the meter's within-run 4 stands for 4 × 1.3 = 5.2 to
    4 × 1.6 = 6.4 on that basis, and the failures' low end of 4 for a within-run 4 / 1.6 = 2.5 to 4 / 1.3 = 3.1. The
    condition stays 4, more than the low end asks; nothing moved.
65. **Superseded in part by Decision 79** (a void set is now queued and runs again before stop rule 6, three void sets
    in a row stop the build, with one kind of core the probe runs no set, and the probe runs at the start of Step 9;
    the instrument, N = P + E, the three sets and R as the largest max/min ratio stand). As it stood:
    **Probe 9's instrument is ordinary scheduling (ruling 5; closes the round-2 finding that `taskpolicy -b` also
    throttles priority, so it does not isolate the core type).** N = P + E children start at once at ordinary priority,
    more than the performance cores, so some run on the efficiency cores under normal scheduling; three sets; each
    child's CPU and wall-clock time, each set's max/min CPU ratio and the largest gap are recorded; R is the largest
    max/min ratio, an upper estimate (ruling 12: the maximum carries any other contention too). The counts come from
    `sysctl -n hw.nperflevels`, `hw.perflevel0.logicalcpu` and `hw.perflevel1.logicalcpu`, believed on Apple silicon and
    recorded as printed; elsewhere, or with one kind of core, N = `os.availableParallelism()` + 2. Each set makes the
    load workers' check first, and a void set is not run again. The alternation of six single children and the
    confinement test of Decision 34 are gone with `taskpolicy`.
66. **Superseded in part by Decision 78** (a child is now slow against the median quotient of its own run, not against
    its case-and-size ambient minimum, and the decision takes the largest flake probability over s from 0 to s₉₅, not
    its value at s₉₅; s₉₅ as the range's upper end, the exact computation and the 0.1% bound stand). As it stood:
    **s and the flake probability, with a bound stated in advance (ruling 5; closes the round-2 finding that stop rule 6
    judged R alone, without how often a child runs slow).** s comes from Step 9's own children, per case and condition:
    a child is slow when its CPU per scan is at least √R times its case-and-size ambient minimum. The ruling asks for an
    estimate of s; the decision uses its 95% upper bound s₉₅ (k slow among N; for k = 0, about 3 / N), a choice made
    here because an observed zero cannot show a rate under 0.1%. The flake probability per run is computed exactly over
    the 2¹² = 4096 slow-or-fast assignments of a case's 12 children, with both the fit and the 3000-ms bound, and the
    build stops above 0.1% for any case in any condition. The ruling's example, s⁶(1 − s³)² for the two-size branch,
    re-derived for these four sizes, holds as it stands for the real case at 1.78 ≤ R < 2.38 (only the two largest
    sizes' six samples all slow, and neither smaller size's three, fail it); the one-size branch is
    t(1 − t)(1 − t + t²) with t = s³, and R ≥ 4.2 adds the single-child path 1 − (1 − s)³ (the Problem Statement, "The
    flake probability"). What it changes against Decision 34's rule, stated plainly: R at or above 4.2 still always
    stops the build (s would have to be under 0.00033, about 9000 children to show); between a one-size threshold and
    4.2 the build now stops only when s₉₅ makes the probability exceed 0.1%, about s₉₅ > 0.1 for the real case, where
    Decision 34 stopped on R alone. This is a build stop rule, not a test bound; the CTO Chief's ruling sets it.
67. **The controls time the call regex alone (ruling 6; closes the round-2 finding that the injected children still ran
    the scan's four other regexes, so their exponents carried work unrelated to the injected quadratic part).** With
    `skipOthers`, every regex other than the call regex returns `null` with `lastIndex` 0 inside the injected children,
    without running, and is counted; the count is asserted at `OTHER_EXECS_PER_SCAN` = 4 per scan. In those children the
    only other regexes a scan runs are the four surface regexes: `reachability.js` requires only `path` and `./safe-fs`
    (lines 86-87), `safe-fs`'s path check uses `indexOf`, not a regex (`src/lib/safe-fs.js` lines 59-74), and Node's own
    modules keep their own copies of the regex functions (believed); the count makes any other call loud. "Every other
    regex" rather than a list of the four sources is a choice made here: it copies no regex source into the helper,
    whose exact `source` text (a `/` inside a character class of `SURFACE_NODE_RUNS_RE`) would need its own check, while
    the count and the skips-run variant, which runs each skipped call for real and records its source, prove the set.
    Recomputed with the reads alone as the rest (0.5 to 2 ms per MiB): the sensitivity case expected at 1.479 to 1.494
    (was 1.46 to 1.49), the quadratic case at 1.904 to 1.970 (was 1.830 to 1.946), q at 0.959 to 0.989 (was 0.9 to
    0.97), the sensitivity margins 0.229 to 0.244, and 0.093 to 0.108 with its 256-KiB size inflated 1.6 times, its
    one-size and two-size thresholds 2.21 to 2.33 and 1.70 to 1.76, the children's CPU times and the cases' run times
    (10.3 s and 7.0 s), the Windows tick effects (0.05 and 0.012), and probe 7's seventh set. No bound and no floor moved.
68. **The loaded whole-suite run loads the new files' cases (ruling 7; closes the round-2 finding that Step 12's batch
    could run while the timing cases were not running).** Its load starts at the start of the new files' first scan
    child, on a mark of the preload, and the record also gives how many of each case's children started and ended inside
    the batch, the ruling's other option, since the batch's 10-minute deadline could end before the last child. One
    preload, `marks.js`, now serves the mid-case runs (it replaces `first-child.js`), the per-file durations
    (Decision 61) and this run.
69. **The control row on three runs, probe 3 one-sided, probe 8 stopping only on stated inputs (ruling 8; closes the
    round-2 findings that the control row's floors rode on one run, that probe 3's 4-MiB check was two-sided over three
    runs, and that probe 8 could stop the build on a recomputation with measured inputs).** The control row runs three
    times and its floors, 1.45 and 1.75, are applied to the medians. The 2000-ms ceiling on each injected case's longest
    child is applied to the median of the three runs too, beyond the ruling and for the same reason; it is no looser than
    the one-run check it replaces, since a median at or under 2000 ms needs two of the three runs with every child at or
    under it. Probe 3's 4-MiB check takes at least five children and holds the smallest first-scan CPU time to at most
    1.10 times the smallest second-scan CPU time of the same children. Probe 8 stops only on figures the plan computes
    from inputs it states; the same figures from probe 7's measured inputs are recorded and judged by the control row's
    floors.
70. **Superseded in part by Decisions 87 and 88** (the owner's question now carries a Recommended option: adopt the
    clause as written, since no count JavaScript can see shows the regression, Decision 2; and the build waits for his
    answer before Step 8 writes any file, since a refusal means neither new file may exist, where this decision said
    nothing in the build depends on it). As it stood:
    **The exception clause for the owner (ruling 9; closes the round-2 finding that the faster-suite round's rule
    "count operations and assert the count; never assert a measured time, wall-clock or processor" conflicts with these
    timing files).** The clause these files need is written out, word for word, under Neighbours. The owner rules on it,
    and the gate critique will ask him; this plan does not decide it, and nothing in the build depends on the answer,
    since that rule is not in main. The same round's rule 6, a file over 20 s in the runner's output is split, is noted
    beside it for him.
71. **Superseded in part by Decision 87** (the manifest now also records each file's modification time; this build's
    own commands may change only the ignored paths Step 9 names, and any other difference is other work's only when its
    time lies outside every window of this build's commands, or it fails the check; the status list, the two copies and
    the eight manifest paths stand). As it stood:
    **The full scope check (ruling 10; closes the round-2 finding that the scope check read only `src/` and the one test
    file).** Step 9 records `git status --porcelain=v1 --untracked-files=all` in full, copies of `README.md` and
    `CLAUDE.md`, and a sha256 manifest of the git-ignored paths this build's commands can write (from `.gitignore`:
    `coverage/`, `.ctoc/state/`, `.ctoc/logs/`, `.ctoc/index/`, `.ctoc/quality-state/`, `.ctoc/verification/cache/`,
    `.ctoc/verification/ledger.json`, `.ctoc/sweep-state.json`); `node_modules/` and `.claude/` get only their top-level
    listings, since no command of this build writes there and other agents change `.claude/worktrees/` constantly.
    Step 16 takes all three again and compares in full; other work is told apart by Step 9's list, and the two
    documents must differ from their copies only in the three count numbers. It replaces the
    `git diff --name-only -- … src/` check.
72. **What the check times, and the 0.75-s sentence rewritten (ruling 11; closes the round-2 findings that neither the
    plan nor the header said which regex and which input the check times, and that the header kept "the whole 2-MiB
    child exits in about 0.75 s ... and the green suite pays nothing").** The Problem Statement and the helper's header
    now say that the check times the call regex on a run of one letter, that the other four surface regexes do no work
    there because each begins with a word that never occurs in it, and so that a super-linear change to any of them, or
    one that needs another input, is not seen (a change that removed a leading word would run there and could be). The
    sentence moves with "WHY A CHILD PROCESS" to the real-scan file's header and now says that each child scans 4 MiB,
    about 1.4 s of CPU time, with its measured wall-clock time, that the kill is approached only at about 33 times the
    CPU time, and that the check is not free, with the file's measured time.
73. **q ≈ 0.293, and Decision 19's wording (ruling 12; closes two low round-2 findings).** E(q) − 1 is
    −0.2 log2(1 + 0.25q) − 0.1 log2(1 + 0.5q) + 0.1 log2(1 + 2q) + 0.2 log2(1 + 4q): at q = 0.2925,
    −0.020364 − 0.019692 + 0.066448 + 0.223539 = 0.249932; at q = 0.293, −0.020397 − 0.019724 + 0.066539 + 0.223805
    = 0.250223. So E = 1.25 at q = 0.2925 + 0.0005 × 0.0000685 / 0.0002917 = 0.2926, about 0.293, where the plan said
    0.29; 0.293 × 4 = 1.17 at 4 MiB is unchanged. The 0.59 for an inflated 256-KiB size, checked the same way: the sum
    is 0.385131 at q = 0.59 and 0.385845 at 0.592, against 0.25 + 0.2 × log2 1.6 = 0.385614, so
    q = 0.59 + 0.002 × 0.000483 / 0.000714 = 0.5914, about 0.59, unchanged. The Problem Statement, the helper's header, probe 8's list and Decision 30 now say 0.293. Decision 19 said
    "the rotated rounds" after Decision 36 had replaced the rotation; it now says "the interleaved rounds".
74. **The listings timed, the match by file names, and void batches around ambient runs (ruling 12; closes three low
    round-2 findings).** At `fresh-4x`, 72 workers listing processes once per busy child of 375 ms on average make
    72 / 0.375 = 192, about 190 listings a second (96 at `fresh-2x`, at most 80 at `scans-2x`); at an assumed 10 to
    30 ms of processor time each, 1.9 to 5.8 cores' worth, which the build measures per batch. Another test run is now
    matched by the file name of any `tests/*.test.js` file, or `test-gate.js`, in its command line, so that a run of the
    same files from another worktree counts. Ambient runs placed between batches neither break nor extend "three void
    batches in a row": they add no load and show no window free of other test runs; only a batch that is not void
    resets the count.
75. **One next step per return, the corpus folder in `made` first, 8e7798cf checked, two believed items upgraded
    (ruling 12; closes four low round-2 findings).** Each stop rule, and the three-void stop, names one recommended next
    step for its needs-input return. `makeSingleCharCorpus(sizeBytes, made)` adds its folder to `made` right after
    `mkdtempSync`, before any write, so a failed write no longer leaves a folder behind. Steps 8 and 9 compare the test
    file with `git show 8e7798cf:` as well as `git show HEAD:` (HEAD was 8e7798cf at this session's start; in a shared
    checkout HEAD can move, and the plan's line numbers describe 8e7798cf's file). Upgraded on the round-2 critic's
    confirmation, not re-run here: the runner starts files in name order, and Node 26.10.0 runs up to
    `os.availableParallelism()` − 1 = 17 files at once on this machine. This machine also holds Node v22.23.3 under nvm,
    and the faster-suite records name v24.14.1, so probe 1 records the version each run uses.
76. **Where this revision changed the plan.** The frontmatter (`files:`, six entries); the introduction; in the Problem
    Statement, the paragraph on the failing run's figures (the four worktree copies), the worktree line of the cause
    table, the list of what a run must confirm, the design list (the injected cases' skip, a seventh item for the
    split), "What inflation turns a verdict", a new "The flake probability", "The injected cases as built", the run-time
    table and "Against the time limits", and "What it still does not see"; in the Implementation Details, the
    dependency graph, the File Specifications (four test files and the count documents, the helper's code, the two test
    files, the notes, four headers, error handling, cross-platform notes); in the Test Plan, the harness, the commands,
    probes 3, 6, 7, 8 and 9, the variant table, the load rules (the match, the listings, the void count, the meter's CPU
    inflation, the marks preload), the Step 9 runs, the stop rules (new rules 7 and 8, each rule's next step) and the run
    time; the Security Review; the Wiring; the Acceptance Criteria; Decisions 8, 14, 16, 18, 19, 25, 26, 30, 34, 37, 39,
    40, 41 and 43 where they pointed at what changed; the Open question; the Risks; Neighbours; and every step of the
    Execution Plan. `depends_on` (slice 16) is as it was. No bound, ceiling, size or sample number moved; the
    no-weakening ruling stands. The round-2 review records were not available to this revision, so each finding in
    Decisions 55 to 75 is named by the ruling that answers it, and the figures given with it are this revision's own
    evidence. Beyond the rulings, each with its reason: the kept file keeps both describes (Decision 55), the helper
    asserts (56), the 30% band and the scaling of stop rule 8 (61), the mechanism probe before stop rule 7 (62), s₉₅ as
    the decision value (66), skipping every other regex with a count rather than a list of four sources (67), the
    2000-ms ceiling on the median (69), and the marks preload in every process of the whole-suite timing runs (61, 68).
77. **The round-2 revision finished: every decision it replaces marked, every pointer and every disagreeing statement
    brought in line with Decisions 55 to 76** (the dispatch of 2026-10-15, after a run that was checking them was
    stopped with Decisions 34, 39 and 40 marked superseded). Changed here:
    - **Marked superseded, each naming its replacement:** Decision 50 by Decision 55 (the split it left to the owner is
      built here; a builder's affected-test run is now about 18 s, 3.6 to 4.5 minutes under the heaviest load
      recorded); Decision 40 also by Decisions 55, 59 and 68, for the parts Decision 61 does not replace; Decision 52's
      third figure, the quadratic case at 1.83 to 1.95, by Decision 67's 1.904 to 1.970, its first two standing.
    - **Pointers to replaced text:** Decision 37 (since Decision 62 a refutation of its prediction stops the build);
      Decision 38 (stop rule 7 counts no void batch either, and in an ambient run the meter that sees another test run
      stops and the run stands, as the Test Plan's load rules already said); Decision 41 (since Decision 67 the sets
      that give r and f skip the other four regexes, so r is the two reads alone, and the seventh set, R1n, gives what
      the skip removes); Decision 43 (the 4-MiB check held to at most 1.10 times, one-sided since Decision 69, and the
      helper's header); Decision 46 (the header is the helper's); Decision 49 (30 copies on 2026-10-13 and 31 on
      2026-10-14, Decision 63); Decision 53 (the values the helper builds); Decision 54 (its loaded whole-suite run and
      its fixed-cost set point on to Decisions 68 and 67); and "the first case" is "the real-scan case" in Decisions 7,
      8, 22, 28, 37, 42, 43 and 51. Text quoted under "As it stood" is left as it stood.
    - **Statements that disagreed, fixed:** the introduction gives the real scan's case one new test file and the two
      controls another (it could be read as three new files); the design list's closing sentence on the swap says that
      every other regex is skipped and the skips are counted (Decision 67); the Risks' window-24 mitigation holds each
      injected case's longest child to at most 2000 ms on the median of the control row's three runs (Decision 69);
      Step 10 also runs `tests/doc-counts-generated.test.js`, the second test Decision 57 names for `CLAUDE.md`'s
      counts, which parses the live file's count lines (read 2026-10-15); the Execution Plan's opening forbids
      `git checkout`, `git restore`, `git stash` and `git reset` in the shared checkout outright, where it said only that
      none undoes anything.
    - **Read in full and, beyond the fixes above, found in line:** the Problem Statement, the design, the code blocks,
      the Test Plan, Steps 8 to 16, the Security Review, Neighbours, the four header texts, and the frontmatter's `files:`, six entries with
      `README.md` and `CLAUDE.md` among them. There is one IMPLEMENT step, Step 10; builder notes go only under
      `## Execution Record`, one `###` heading each; the only git commands are the reads `git status` and `git show`.
      Checked against the source on 2026-10-15: `src/lib/reachability.js` defines the five surface regexes at lines 342,
      351, 654, 658 and 659, the four that the skips-run variant names among them; the kept file uses `os` at its line
      186, inside the first of its two `SEMANTICS PRESERVED` describes (lines 178-239), so removing its line 62 leaves
      no unused import. Not re-checked here: the places in name order of Decision 57.
    No bound, ceiling, size or sample number moved; the no-weakening ruling stands.
78. **Stop rule 6 judges each child against its own run, and takes the largest flake probability over the range of s
    (the CTO Chief's ruling 1 on round 3; closes a round-3 finding taken after the last round: a child was slow against
    its case's ambient minimum, so load that slowed every child of a run alike read as independent slowness, and the
    decision read the flake probability at s₉₅, the upper end of s's range, though it falls again as s nears 1).**
    - **Each child against its own run.** Its quotient is its CPU time per scan divided by the smallest ambient sample
      of its case and size; it is slow when that quotient is at least √R times the median quotient of the 12 children of
      its run. A load that slows a whole run alike moves the median with it and makes no child slow.
    - **The largest value over the range.** The range is s from 0 to s₉₅, the one-sided 95% upper bound Decision 66
      set. A scratch program evaluates the exact probability at every s of it in steps of 0.001 and at s₉₅ itself, and
      the decision takes the largest, recorded with the s it came at. Each fit branch peaks at t = s³ = ½, that is
      s = 2^(−1/3) = 0.794: the two-size branch t²(1 − t)² at 1/16 = 6.25%, the one-size branch t(1 − t)(1 − t + t²) at
      3/16 = 18.75%, and both are 0 at s = 1 (the derivatives are in the Problem Statement, "The flake probability").
    - **A choice made here, so that the 3000-ms bound still sees load on a whole run.** That bound reads a child's
      absolute CPU time, which a load on the whole run does raise. So in each condition a fast 2-MiB child's figure for
      it is its ambient smallest sample times the largest median quotient m of the condition's runs, and that path opens
      at R = 4.2 / m: 4.2 / 1.6 = 2.6 at the 1.6 times recorded, where the ambient figure alone opened it at 4.2.
    - **Conservative for the injected cases, as the ruling says.** Their children are not of equal length (about 0.36 to
      1.40 s and 0.08 to 1.12 s), and their fit fails when their shortest sizes run slow; s, counted over all twelve
      children and applied to each alike, puts on the shortest children the slowness of the longer ones, whose slowness
      raises their fit. That holds while a longer child is at least as likely to run slow as a shorter one, which is not
      confirmed (the cause table's third row); the mechanism probe records inflation by child length, and the record
      says whether it held.
    - **Changed:** the Problem Statement's "The flake probability" (the 3000-ms path under load, and a new bullet on the
      peaks), probe 8's list, probe 9's "What it feeds", stop rule 6, Step 9's last box, the Acceptance Criteria and the
      Risks' efficiency-core entry. Decision 66 is marked superseded in part. No bound, ceiling, size or sample number
      moved.
79. **An efficiency-core cost nobody measured no longer satisfies stop rule 6 (the CTO Chief's ruling 2 on round 3;
    closes a round-3 finding taken after the last round: a set of probe 9 that met another test run was void and not
    run again, so with every set void R went unmeasured and stop rule 6 decided nothing, on the very machine whose
    efficiency cores it exists for).**
    - **A void set runs again.** It is queued and runs later in Step 9, before stop rule 6 is applied, the way a void
      batch's runs do. Three void sets in a row, counting the probe's set attempts only, return the plan as needs-input
      with the next step "resume probe 9 once the other test runs have ended".
    - **"Not measured" only with one kind of core.** R may go unmeasured only where `sysctl -n hw.nperflevels` is
      missing or prints 1: there is no efficiency core whose cost could be measured, so the probe records what the keys
      printed and runs no set. That the probe then runs no set is a choice made here: with one kind of core, Decision
      65's N = `os.availableParallelism()` + 2 children would measure contention, not a core's cost, and the ruling
      allows "not measured" there. Where the key prints 2 or more, Step 9 cannot finish without R.
    - **At the start of Step 9.** Probe 9 moves out of Step 8: `load.js` starts it once `load.js` and its stand-down
      check exist, so its check before each set is the load workers' own. The control row, which the probe's
      comparison at the sensitivity case's measured exponent needs, has run by then.
    - **Changed:** probe 9, stop rule 6's opening, the stop rules' closing paragraph, Step 8's probe box, a new Step 9
      box, the Acceptance Criteria and the Risks' efficiency-core entry. Decision 65 is marked superseded in part. No
      bound moved.
80. **Stop rule 8 is decided only on a normalised difference (the CTO Chief's ruling 3 on round 3; closes a round-3
    finding taken after the last round: whenever the two start loads lay within 30% of each other, the plain difference
    of two suite times decided the rule, though a load average read at a run's start says little about the load over a
    whole run, and one Step 12 run was compared).**
    - **The normalised difference.** For each of Step 12's runs: its wall-clock time minus Step 9's wall-clock time
      multiplied by M, the median, over the test files present in both runs that this slice does not change (every file
      but the kept file; the two new files are not in Step 9's run), of a file's duration in Step 12's run divided by its
      duration in Step 9's. For example, Step 9 at 241 s and a Step 12 run of 262 s whose files took M = 1.06 times as
      long give 262 − 241 × 1.06 = 262 − 255.5 = 6.5 s. Step 12's ambient suite run is made three times, and the median
      of the three normalised differences is compared with 15 s.
    - **Plain differences decide nothing.** They are recorded beside the normalised ones. The 30% band of start loads
      and the comparison of the pair with the closest start loads are gone.
    - **A suite run that met another CTOC test run is repeated, not compared.** That is a suite timing run during which
      its meter saw another CTOC test run; Step 9's first run, the one compared against, is included, and such runs are
      carved out of the load rules' ambient rule, under which an ambient run that meets one stands. If three repeats in a
      row are void as well, the plan returns as needs-input, with the next step "resume the suite timing runs once the
      other test runs have ended" (the ruling gives none; this one matches the other void stops). "After three such
      repeats" is read as the run and three repeats, all void.
    - **Stays:** the clause that neither new test file is the longest file, now of any of Step 12's three runs.
    - **Changed:** stop rule 8, the load rules' ambient rule, Step 9's run 1 in the Test Plan and its box, the Run time
      paragraph, Step 12's second box, the Execution Plan's opening, the Acceptance Criteria and the Risks' run-time
      entry. Decision 61 is marked superseded in part. The 15 s did not move.
81. **The reproduction is recorded evidence, not a gate (the CTO Chief's ruling 4 on round 3; closes a round-3 finding
    taken after the last round: stop rule 7 let the replacement ship only if slice 16's old case failed under this
    build's load, so a build that could not reproduce the failure would keep the check that fails under load).** The
    CTO Chief reverses Decision 62, round 2's rule, for these reasons:
    - the main session reports the old check failing under load in another worktree with slice 16's fix (commit
      8e7798cf) in place;
    - the replacement is stricter: it fails a quadratic part from 0.293 times the linear scan at 1 MiB, where slice 16's
      check needed 0.71 (the Problem Statement, "What it still does not see");
    - it is measured to hold under load by stop rules 1 to 3 and 5;
    - it costs about 3 s in main (Decision 58);
    - slice 16's own build never reached the contention of the real failures (a wall-clock-to-CPU ratio of at most 1.64,
      its record lines 773-784).
    So stop rule 7 records and stops nothing. Only a failure of the ratio assertion counts, the old test's message at
    line 170 together with its six CPU figures (its diagnostic line, lines 167-168), in a batch that adds load, is not
    void and reaches a contention of at least 4; any other failure under load, and any failure at ambient load, is
    recorded and does not count. If the build cannot reproduce the failure, the record, the final report and the
    real-scan file's header say "cause supported by the code, not reproduced". Stop rule 5's requirement that a batch
    reach a contention of at least 4 while the new cases run stays a condition of done. The reproduction still runs
    before any fix, in the same order, and ends after the first batch that reproduces the failure; the mechanism probe
    still runs before the count. **Changed:** the introduction, the Problem Statement's list of what a run must confirm,
    the meter's CPU-inflation rule, the stop rules' opening paragraph, stop rule 7, Step 9's runs 2 and 3, the real-scan
    file's reproduction slot, the Acceptance Criteria, the Step 9, 11 and 16 boxes, the two Risks on contention and
    reproduction, and the pointers in Decisions 14 and 37. Decision 62 is marked superseded.
82. **The mid-case reproduction loads the first 2-MiB sample (the CTO Chief's ruling 5 on round 3; closes a round-3
    finding taken after the last round: the workers and the meter were started only at the first child's end, so while
    36 or 72 processes started, the old case's second child, its first 2-MiB sample, could run partly or wholly clean,
    and a clean 2-MiB sample keeps the ratio at its clean value whatever the other two show).**
    - **Started before the run, released by the mark.** `load.js` starts every worker and the meter before the run, each
      blocked on an event, a release message from `load.js` awaited without polling, and releases them all at the
      first child's end mark, which it sees through `fs.watch`. One mechanism serves every mid-case run, the new cases'
      included, so their load too covers the stretch from child 2 from its start (a choice made here: one way of
      starting load in `load.js`).
    - **c, the loaded share of the first 2-MiB sample,** recorded for every mid-case run of the reproduction: the share of
      that child's wall-clock span, between its start and end marks, after the last worker started its first busy
      child. A child progresses more slowly under load, so c read from wall-clock time is at least the share of its work
      done under load.
    - **The predicted failing inflation, stated for each such run.** The first 1-MiB child is clean; at an inflation f
      the first 2-MiB sample costs (1 − c) + c·f times its clean figure and the other two f times, so the smallest
      2-MiB sample is (1 − c) + c·f times clean (f ≥ 1), and the ratio r × ((1 − c) + c·f) reaches 2√2 at
      f = (2√2 ÷ r − (1 − c)) ÷ c, with r the clean ratio, taken at the lowest and the highest ratio of the reproduction's
      ambient runs. With 2√2 = 2.828 and slice 16's 1.97 to 2.10: at c = 1, 2.828 ÷ 2.10 = 1.35 to 2.828 ÷ 1.97 = 1.44, as
      before; at c = 0.5, (1.347 − 0.5) ÷ 0.5 = 1.69 to (1.436 − 0.5) ÷ 0.5 = 1.87; at c = 0 no inflation fails it. The
      figure falls as c rises (its derivative in c is (1 − 2√2 ÷ r) ÷ c², negative while r < 2√2), so with c read from
      wall-clock time it is the lowest inflation that could fail the run. The batch's CPU inflation from the meter is
      recorded beside it.
    - **Changed:** the Problem Statement's old-case bullet, the Test Plan's mid-case rule, Step 9's run 2, its box, the
      Acceptance Criteria, and a pointer in Decision 37. No bound moved.
83. **One scratch folder for the whole build (the CTO Chief's ruling 6 on round 3; closes a round-3 finding taken after
    the last round: the harness lived in "the session's scratch folder" though the build spans several sessions and
    continuations, and Step 14 deleted the folder that held Step 9's scope baseline, which Step 16's scope check
    reads).** One folder outside the repository serves the whole build; the CTO Chief names it in every continuation
    brief, and the record writes it as `<scratch>`, never as a path. Step 9's scope baseline (the status list, the two
    documents' copies and the ignored-path manifest) goes into `<scratch>/scope/`. Step 14 deletes everything in
    `<scratch>` except `<scratch>/scope/`; Step 16 deletes the folder after the scope check and confirms with `ps` that
    no load worker remains, the check Step 14 made before. **Changed:** the Test Plan's harness paragraph (the line that
    put the harness in "the session's scratch folder") and the Security Review's harness box (the line that deleted it
    "at the end of Step 14"), the Execution Plan's opening, Step 9's scope box, Step 14's last box, a new Step 16 box
    after the scope check, the scope box itself and the Acceptance Criteria's scope line.
84. **The stand-down check also leaves out `load.js`'s ancestors (the CTO Chief's ruling 7 on round 3; closes a round-3
    finding taken after the last round: only `load.js`'s descendants were left out, so a command that started
    `load.js`, or a process above it, whose command line named a test file would void every batch, and a sighting
    recorded only a count).**
    - **Who is left out.** The check passes over a process that descends from `load.js` or is one of its ancestors, both
      traced through the parent ids of the same `ps` listing; any other process whose command line names `test-gate.js`
      or a `tests/*.test.js` file of this repository is another CTOC test run.
    - **Runs from a file.** `load.js` reads the runs it starts from a JSON file in `<scratch>`, never from its own
      arguments, so that no test file's name has to appear on its command line or on its ancestors'.
    - **What a sighting records.** For every process of that listing whose command line matched: the matched test
      file's name (or `test-gate.js`), never a path or a command line, and whether that process descends from
      `load.js`, is one of its ancestors, or neither. Only a process that is neither voids the batch. Recording every
      match of the listing, the passed-over ones too, is how the ruling is read here: the record then shows that both
      exclusions worked.
    - **Changed:** the load rules' check and their sighting rule, the paragraph on `load.js` starting every run, the
      Security Review's stand-down box, the Risks' synthetic-load entry, and a pointer in Decision 38.
85. **Every stop names its next step (the CTO Chief's ruling 8 on round 3; closes a round-3 finding taken after the last
    round: two stops returned the plan with no next step, a variant row that did not come out as stated and a test file
    that differed from 8e7798cf's).** A variant row that does not come out as stated returns the plan as needs-input
    with the next step "re-plan upstream from that row's recorded message and figures". A test file that differs from
    8e7798cf's, found at Step 8 or at Step 9, returns it with the next step "re-read every cited line number from the
    file as it now stands, upstream". The stops this round adds carry theirs too: three void sets of probe 9 in a row
    (Decision 79), a suite timing run void after three repeats (Decision 80), and the owner's refusals (Decision 88).
    It extends Decision 75; nothing is superseded. **Changed:** the variant table's closing paragraph, Step 8's first
    and last boxes, and Step 9's first box.
86. **The two Step-8 checks that sat inside recorded variation are re-grounded (the CTO Chief's ruling 9 on round 3;
    closes a round-3 finding taken after the last round: stop rule 4 stopped above q = 1.0 against an expected 0.959 to
    0.989, and the allowed-slowdown row had to pass 1.41 times under the 3000-ms bound, both inside variation already
    on record).**
    - **Stop rule 4 stops above q = 1.10.** A q from 1.0 to 1.10 is recorded, and the sensitivity case then carries a
      recorded strength above slice 16's case: its quadratic part is q times the linear scan at 1 MiB, where slice 16's
      was 1 times. Its cost in the fit at the top of the band:
      E(1.1) − 1 = −0.2 log2 1.275 − 0.1 log2 1.55 + 0.1 log2 3.2 + 0.2 log2 5.4 = −0.0701 − 0.0632 + 0.1678 + 0.4866
      = 0.5211, so E = 1.521 against 1.500 at q = 1: such a scan is at most 0.021 easier for the measure to fail.
    - **Why 1.10 is enough, given probe 7's equalised minima.** q is S / I − 1 from two per-set minima, S the
      sensitivity set's and I the injected pass's, with S / I = 1 + q, about 2, so relative errors ε_S and ε_I in them
      move q by about (1 + q)(ε_S − ε_I). The variation on record for a ratio of two minima is slice 16's: over 10
      uncontended runs its minimum ratio read 1.97 to 2.10 (record line 755), ±3.25% about its middle
      (√(2.10 / 1.97) = 1.0325). That moves q by about 2 × 0.0325 = 0.065: a true q of 1.0 reads at most about 1.065,
      and the expected 0.959 to 0.989 at most 0.959 + 1.959 × 0.0325 = 1.023 to 0.989 + 1.989 × 0.0325 = 1.054. The
      old stop at 1.0 lay inside that spread. 1.10 lies 0.035 above the worst reading of a true 1.0, and is crossed only
      by opposite errors of 2.5% on each minimum from a true 1.0 (0.10 / (2 × 2)), 2.8 to 3.6% from the expected q
      ((1.10 − 0.989) / (2 × 1.989) = 0.028; (1.10 − 0.959) / (2 × 1.959) = 0.036). Probe 7's minima are believed to
      vary less than that record's: every child uses about 1.4 s, the sets interleave child by child, and each figure
      is the smallest of five, so load reaches both sets alike and must cover all five of a set's children to move its
      minimum, where slice 16's were the smallest of three over children of unequal length. Probe 7 records every
      child, so the spread is shown, not assumed.
    - **The allowed-slowdown row: window 255, twice the work.** At window 383, about three times, a 2-MiB scan took
      about 3 × 0.71 = 2.13 s, 3000 / 2130 = 1.41 times under the bound, inside the 1.3 to 1.6 times load added to
      single samples on 2026-10-12 (the cause table's first row), so load could fail a row that must pass. At window
      255 a position gives back up to 256 characters against 128, twice the work: about 2 × 0.71 = 1.42 s per 2-MiB
      scan (an upper estimate, since the scan's reads and fixed cost, under 0.02 s at 2 MiB, do not double),
      3000 / 1420 = 2.11 times under the bound, above 1.6. The exponent stays about 1, 0.25 under its bound. The
      per-size minimum, the ruling's other option, is not taken: the 3000-ms assertion reads each 2-MiB child as it
      returns and fails at the first one over the bound, before any minimum exists, so judging the row on a minimum
      would need a measure for that row alone.
    - **Changed:** stop rule 4, the Problem Statement's last item of what a run must confirm and its sensitivity-case
      bullet, the controls file's comment and header, the variant table's allowed-slowdown row, Step 8's probe-parts box,
      the paragraph after the stop rules on rules 2 and 3's margins, and the Risks' stronger-quadratic and
      thinnest-margin entries. Decision 25 is marked superseded in part. No bound of the test moved.
87. **The critic's seven low items (the CTO Chief's ruling 10 on round 3; each closes a low round-3 finding taken after
    the last round).**
    - **The helper's header gives the third failure condition:** a single 2-MiB child slowed about 4.2 times, against
      the 3000-ms bound, which reads every 2-MiB child and no minimum (3000 / 710 = 4.2), beside the fit's 2.38 and
      1.78. The Problem Statement's and the Risks' sentences on when a linear scan fails now name it too, and Decision
      46 points here.
    - **Decision 55's sentence on other plans' `README.md` and `CLAUDE.md` lines, reworded in place.** It said those
      plans "touch other lines", which no search supports: 179 plan files declare one of the two documents (the search
      `^\s+-\s+"?(README|CLAUDE)\.md"?\s*$` over `plans/`, 2026-10-15), and any of them that adds or removes a test file
      changes the same three count lines. It now says so, and why that makes none of them a dependency: the build writes
      the live count at Step 10 (Decision 57).
    - **Probe 3's 256-KiB check is one-sided:** the first timed scan of a sixteen-scan child is at most 1.10 times the
      median of its other fifteen, as the 4-MiB check has been since Decision 69 (stop rule 4, Step 8's probe-parts box,
      the Acceptance Criteria).
    - **The kept file's title, line 4,** becomes ` * THE DEAD-EXPORT FENCE'S SURFACE SCAN — the semantic checks of its
      ReDoS fix.` (the kept file's change 1; Steps 10 and 11 and the Acceptance Criteria check it).
    - **The ignored paths this build's own commands may change are named, so that an unexplained difference fails.**
      `.ctoc/state/` outside `.ctoc/state/verify/`, the test artifacts of `.gitignore` line 5, by the `npm test` and
      `node --test` runs; and any other path that Step 9's first `npm test` is measured to change, named with its file
      before any edit. Nothing else the build runs is believed to write an ignored path: `npm run lint` uses no cache
      (`package.json` line 14), the git commands are reads, the harness writes into `<scratch>` and the system's
      temporary folder, and the one hook `hooks/hooks.json` registers, `src/hooks/protect-records.js`, allows or refuses
      a call (which hook file Claude Code loads is believed, not checked). The manifest gains each file's modification
      time and the record each command's start and end. At Step 16 a difference outside the named paths is other work's
      only when its time lies outside every window of this build's commands; otherwise it fails the scope check, with
      the next step "find what changed each unexplained file, from its time and the record's command windows,
      upstream". Decision 71 is marked superseded in part.
    - **Decision 70's owner question gets its Recommended option:** adopt the exception clause as written, since no
      count JavaScript can see shows the regression (Decision 2). Decision 70 and Neighbours say so; the question itself
      is written out after the decisions (Decision 88).
    - **33 worktree copies on 2026-10-15.** The dispatch relayed 32; this revision's `Glob` of
      `.claude/worktrees/*/tests/reachability-surface-scan-is-linear.test.js` found 33, and Decision 63's two searches
      found the same four carrying slice 16's version (`agent-aadfde140804ea5df`, `agent-a622e500a3eb88033`,
      `agent-a92caf11a57443f01` and `agent-a01f296ce9da6d4b6`) and the other 29 with only `HARD_TIMEOUT_MS = 25000` at
      line 51. All 33 copies of `src/lib/reachability.js` there hold the bounded regex at line 654 (the search
      `const SURFACE_CALL_RE = `). The introduction and the cause table carry the new count; Decisions 49 and 63 keep
      their dated ones. These are checks that text is present, not of what ran.
    - **Changed:** the helper's header, the Problem Statement's and the Risks' failure sentences, Decisions 46, 55, 70
      and 71, stop rule 4, the kept file's change 1 and its header note, Steps 8 to 11 and 16, the Acceptance Criteria,
      Neighbours, the introduction and the cause table. No bound moved.
88. **The plan's two questions for the owner, each with exactly one Recommended option (the CTO Chief's ruling 11 on
    round 3; closes a round-3 finding taken after the last round: the plan left the exception clause to the owner with no
    recommendation and said that nothing in the build depends on it, and it did not put the synthetic load on his shared
    machine to him at all).** Both are written out after the decisions, under "Questions for the owner at this plan's
    crossing", for the gate critique to ask.
    - **The exception clause.** Recommended: adopt it as written. A refusal means neither new file may exist, so the
      build waits for his answer: Step 8's first box reads it before any file is written, and a refusal returns the plan
      with the next step "re-plan the slice upstream under his ruling, with no new test file". Decision 70 is marked
      superseded in part.
    - **The synthetic load on his shared machine.** Recommended: he names the window in which the load may run, or
      accepts it now. Step 9 reads his answer before probe 9, its first run that adds load, and every run that adds load
      starts only inside the window; a refusal returns the plan with the next step "re-plan the contention evidence
      upstream under his ruling", since stop rule 5 then cannot be met. The ruling names Step 9's load batches; the
      question covers every run that adds load, probe 9's sets and the loaded runs of Steps 10 and 12 included, since
      each slows his machine the same way (a reading made here).
    - **The Risk entry's impact line, corrected to state this cost.** Each batch is up to 10 minutes of 36 or 72 busy
      workers on 18 cores (2 × 18 and 4 × 18) and up to about 190 process listings a second (at most 80 at `scans-2x`,
      96 at `fresh-2x`, about 190 at `fresh-4x`; Decision 74), and the stand-down
      check, which stands down only for CTOC's own test runs, sees none of what that does to his other projects' test
      runs and his own work. The number of batches, from Step 9's run list and Steps 10 and 12: the reproduction 1 to 18
      (6 per load kind, one loaded from the start and 5 mid-case, ending at the first that reproduces), the mechanism
      probe 1, the new cases at least 3 loaded from the start and 15 mid-case (3 + 1 + 1 per kind), Step 10 1 and Step
      12 1: at least 1 + 1 + 3 + 15 + 1 + 1 = 22, and 18 + 1 + 3 + 15 + 1 + 1 = 39 when the reproduction runs all its
      batches, more when the new cases' runs need more than one batch per kind or a batch is void. The likelihood line
      now separates the certain cost to his machine from the chance of overlapping another CTOC test run.
    - **Changed:** the questions after the decisions (they replace the one open question), Step 8's first box, a new
      Step 9 box before probe 9, a new first box of the Acceptance Criteria, the Risks' synthetic-load entry, Decision 70
      and Neighbours.

**Questions for the owner at this plan's crossing** (Decision 88). The gate critique asks him both. Each has exactly one
Recommended option, and the build waits for his recorded answer where each says.

1. **Does the faster-suite round's rule against asserting a measured time get the exception these files need?** Topic:
   algorithm (whether this check may measure processor time at all). That round's rule 5 of "Fast tests" reads "To pin
   speed, count operations and assert the count; never assert a measured time, wall-clock or processor." (its
   `agents/testing/writers/unit-test-writer.md` line 86, in its worktree, not in main). The two new test files assert a
   fitted scaling exponent of processor time and a processor-time bound per 2-MiB scan, and no count JavaScript can see
   tells a linear scan from a quadratic one on this input (Decision 2). The clause, written out word for word under
   Neighbours, allows such assertions only in test files that hold nothing else, only for super-linear growth that no
   count can see, and only with control cases injected on every run that prove the measure fails a scan of known
   super-linear shape. Options: (a) **Recommended:** adopt the clause as written. It is the only way to guard this
   regression, the quadratic scan of July 2026 that took 14 minutes at 1 MiB, which no count sees, and it confines
   measured times to checks of that kind, with their controls. Its cost: the suite keeps two timing files, about 18 s
   and 17.3 s alone at ambient load, about 3 s more for the suite in main (Decision 58). (b) Refuse it: neither new
   file may exist, so this slice cannot be built as planned, and slice 16's ratio check, which fails under load, stays
   until a design without a measured time is found. The build waits for his answer before Step 8 writes any file; on a
   refusal the plan returns as needs-input with the next step "re-plan the slice upstream under his ruling, with no new
   test file".

2. **May the build put synthetic load on his shared machine, and when?** Topic: cost (his machine's time and his own
   work). Each load batch runs up to 10 minutes with 2 or 4 times the core count in busy processes, 36 or 72 workers on
   18 cores, and up to about 190 process listings a second (Decision 74); Steps 9, 10 and 12 run at least 22 such
   batches, and 39 or more if the reproduction runs all 18 of its own (Decision 88), and probe 9 starts N children at
   once in each of its three sets. That slows his other projects' test runs and his own work on the machine, and the stand-down check
   does not see either: it stands down only for CTOC's own test runs. The load is how the build shows that the new check
   holds under the contention of the real failures (stop rule 5). Options: (a) **Recommended:** he names the window in
   which the load may run, or accepts it now: the evidence is made, and the cost lands when he chooses. Until he
   answers, nothing that adds load runs (Step 9 waits before probe 9). (b) No synthetic load on this machine: the build
   cannot meet stop rule 5, so it stops there and returns the plan as needs-input with the next step "re-plan the
   contention evidence upstream under his ruling".

Stated for the CTO Chief with their reasons: the 300-s cap already exceeded at ambient load (Decision 59), this slice's
own cost, about 3 s, held by stop rule 8 (Decisions 58, 61 and 80), the doubled kill ceiling (Decision 23), and the
reading of "under 120 characters" as the file names (Decision 55).
- Timing helper cost (2026-10-18, on the owner's grant): the default cost of `growth` is this process's processor time over a batch, not the wall clock, and not a wall clock with a retry. Why: the failure was other processes' load inflating the wall clock of linear work; processor time is the thing that load cannot add to, and the slice already measures this way. Batch not per call, for the Windows tick. The waiting-reader control uses a limit of 100 so that its size stays 16 and its waits are the same on every machine. Review can call a different measure; the controls would then need the same three cases.

## Risks

- **CPU time is still not fully free of load.** Equal work cancels load only when load does not fall systematically on
  some sizes within a run. A linear scan fails only when one size is inflated 2.38 times against the others, or the two
  largest 1.78 times each, in all three of their samples, or a single 2-MiB child about 4.2 times (the 3000-ms bound;
  the next entry).
  - Likelihood: LOW. Impact: MEDIUM (a flaky failure).
  - Mitigation: the round order, under which one spell of load moves the fit by at most 0.1 × log2 of its inflation
    (Decision 36); Step 9's runs under each load kind, mid-case runs included, against stop rule 1 (every exponent at
    most 1.136); every failure message names the load average.
- **Efficiency cores.** A child that macOS runs on an efficiency core uses more CPU time for the same scan (believed),
  so one child or one size can be inflated well past the 1.6 times the design allows for. One 2-MiB child inflated
  about 4.2 times fails the 3000-ms bound on its own; one size's three samples inflated 2.38 times fail the real case.
  - Likelihood: unknown until probe 9 measures R and Step 9's children show s. Impact: HIGH (a flaky failure of the
    real-scan case, possible with no other load).
  - Mitigation: probe 9's concurrent ordinary-priority children and stop rule 6, which stops the build when any case's
    largest flake probability per run over s from 0 to s₉₅, each child judged against its own run, is above 0.1%
    (Decisions 65, 66 and 78); on a machine with more than one kind of core R must be measured, a void set of probe 9
    runs again, and three in a row stop the build (Decision 79); R at or above 4.2 always stops it, and so does R at or
    above 4.2 / m in a loaded
    condition whose runs' median quotient reaches m, since no sample count this build can run shows s below 0.00033;
    no constant is changed to absorb it.
- **No load this build can make may reach the contention of the real failures, or make the old case fail.** Slice 16's
  36 long-lived busy processes reached a wall-clock-to-CPU ratio of at most 1.64.
  - Likelihood: MEDIUM. Impact: with no batch at a contention of 4, the build does not finish: stop rule 5 returns it
    as needs-input with every number, and slice 16's check stays. With no failure of the old case, the record and the
    final report say "cause supported by the code, not reproduced" (stop rule 7, Decision 81).
  - Mitigation: fresh, short-lived busy children at 2 and 4 times the core count and concurrent scans, each batch
    measured by the meter, in wall-clock-to-CPU ratio and in CPU inflation; mid-case runs whose load covers the old
    case's 2-MiB samples; the build never passes on uncontended load.
- **The sensitivity case's margin is the thinnest.** It is a weaker quadratic than q = 1 by construction (when an extra
  pass costs what the first does; a measured q above 1 only widens its margin, Decision 86) and pays a fixed cost per
  scan, so its expected margin with its 256-KiB size inflated 1.6 times is about 0.09 to 0.11 (0.08 to
  0.10 before Decision 67), against 0.114 for the real scan. Load on its shortest children, the 256-KiB ones, pushes it
  toward passing the measure, that is toward failing the case.
  - Likelihood: LOW (its shortest children are the least likely to be inflated). Impact: MEDIUM (a flaky failure).
  - Mitigation: stop rule 4 (at least 1.45 at ambient load) and stop rule 2 (at least 1.31 under each load kind).
- **The sensitivity scan may be a stronger quadratic than slice 16's case.** If extra passes of a regex cost more than
  its first pass, as slice 16's S-K and S-L variants suggest, its q at 1 MiB exceeds 1 and the case proves less.
  - Likelihood: MEDIUM (the cause of that observation is unknown). Impact: HIGH for the ruling's first point.
  - Mitigation: probe 7 measures q from equal-length, interleaved children; stop rule 4 stops the build above 1.10, and
    a q from 1.0 to 1.10 is recorded as the case's strength above slice 16's, worth at most 0.021 in the fit
    (Decision 86).
- **The window-24 pass may cost more than a fifth of the real one**, making the injected children longer than the real
  ones.
  - Likelihood: MEDIUM. Impact: LOW to MEDIUM (more kill risk for the injected cases under heavy load).
  - Mitigation: probe 7 measures the ratio; stop rule 4 holds each injected case's longest child to at most 2000 ms of
    CPU time, on the median of the control row's three runs (Decision 69).
- **The reproduction may not reproduce.** Slice 16's synthetic load did not contend.
  - Likelihood: MEDIUM. Impact: LOW since round 3 (Decision 81, which reverses round 2's stop): the record and the
    final report say "cause supported by the code, not reproduced", the replacement ships on stop rules 1 to 3, 5 and
    6, and the relayed failure's own numbers stay unknown.
  - Mitigation: an ambient batch and three load batches ending in concurrent scans, each followed by mid-case runs whose
    load, arriving after the first 1-MiB child, fails the old case from an inflation of 1.35 to 1.44 (Decision 37); the
    record states the contention and CPU inflation each batch reached, and the return names the next step.
- **The controls skip the scan's other regexes.** A change to the scan that adds, removes or repeats a regex call
  changes the count of skipped calls and fails both injected cases until `OTHER_EXECS_PER_SCAN` is set again: deliberate
  loudness, as the swap count is.
  - Likelihood: LOW. Impact: LOW.
- **The kill under extreme load.** Each child now scans 4 MiB; the ceiling doubles to 50 s with it, so its margin over a
  linear child is what the 25-s ceiling had over a 2-MiB child (Decision 23). A hang now fails after 50 s, not 25 s.
  - Likelihood: LOW. Impact: MEDIUM.
  - Mitigation: the message names the load average, as today.
- **Beliefs about V8** (a regex compiled to native code at once on a long subject; `--expose-gc` accepted).
  - Likelihood: LOW. Impact: HIGH for the fit if a regex's first timed pass ran interpreted: at three times slower it
    would raise a linear scan's fit by about 0.35, over the bound (Decision 43).
  - Mitigation: the sixteen warm-up scans, Step 8's probes 2 to 4, stop rule 4.
- **Hand-computed arithmetic.** The exponents, margins, thresholds and flake probabilities of the Problem Statement were
  computed by hand for this revision.
  - Likelihood: LOW. Impact: HIGH (a wrong figure could hide a wrong design).
  - Mitigation: probe 8 recomputes every figure; a figure computed from the plan's stated inputs that differs beyond its
    last printed decimal stops the build, and the same figures from measured inputs are judged by the control row's
    floors.
- **The swap recognises the regex by its source text.** A change to `SURFACE_CALL_RE` fails both injected cases until
  `SURFACE_CALL_SOURCE` is updated: deliberate loudness, never a silent measure of the real scan.
  - Likelihood: LOW. Impact: LOW.
- **The run time against the push cap, the completion check and an agent's foreground limit.** The timing cases rise
  from the old file's 4.1 s to about 18 s and 17.3 s alone, in two files side by side, and to about 46 to 51 s together
  inside the suite (estimates). In main the suite's length is set by `tests/hotfix-check.test.js` (233.77 s of a 241.18-s
  run), which the new files end long before, so this slice adds about 3 s; the suite already exceeds push's 300 s at
  ambient load for other reasons (368.5 s recorded), and the faster-suite round addresses that. Under the heaviest load
  recorded each new file takes 3.6 to 4.5 minutes; at worst the controls file takes 20 minutes (24 children × 50 s) and
  the real-scan file 10, against an agent's 10-minute foreground limit and the completion check's 900 s per command.
  Builders who touch `src/lib/reachability.js` or these files pay about 18 s per affected-test run instead of about 4 s;
  the agent-and-skill improvement program's runs of the kept file get faster.
  - Likelihood: LOW that this slice is what pushes a suite over a limit; HIGH that the suite is over push's cap at
    ambient load already. Impact: MEDIUM (a push or hotfix check that cannot pass; a builder's foreground command cut at
    10 minutes).
  - Mitigation: Step 9 and Step 12 time the suite in one session and stop rule 8 holds this slice to 15 s on the median
    of three normalised differences and to neither new file being the longest (Decision 80); the cap already exceeded
    is a finding for the owner (Decision 59, Neighbours); long runs start in the background.
- **Evidence from macOS only.** The build runs neither Windows nor Linux. Equal work keeps every child of the real-scan
  case near 1.4 s of CPU time, so a Windows tick of about 15.6 ms (believed) is about 1.1% of it; the injected cases'
  smallest children move their fits by at most about 0.05 (Cross-Platform Notes).
- **The synthetic load slows the owner's shared machine** for spells of at most 10 minutes each, its process listings
  among it (about 190 a second at `fresh-4x`). It can overlap another CTOC test run for one worker cycle after that run
  appears, and a test run whose command line contains neither `test-gate.js` nor a `tests/*.test.js` file name of this
  repository is not seen at all (the Security Review states what the check guarantees).
  - Likelihood: certain for the machine while a batch runs; MEDIUM that a batch overlaps another CTOC test run (other
    builds run tests often). Impact: for his other projects' test runs and his own work on the machine, each batch is up
    to 10 minutes of 36 or 72 busy workers on 18 cores (2 or 4 times the core count) and up to about 190 process
    listings a second, at least 22 batches in Steps 9, 10 and 12 and 39 or more if the reproduction runs all 18 of its
    own (Decision 88), and the stand-down check sees none of it, since it stands down only for CTOC's own test runs; for
    another CTOC build, one worker cycle of load; for this build, a void batch, run again later, and three in a row stop
    it as needs-input.
  - Mitigation: the owner names the window in which the load may run, or accepts it now, before anything that adds load
    runs (the second question for the owner, Decision 88); the check before every busy child (Decision 38), matched by
    file names (Decision 74), `load.js`'s own descendants and ancestors left out (Decision 84); each kind's longest cycle
    and the listings' cost are recorded.
- **A preload in every process of a whole-suite timing run.** Step 9's and Step 12's `npm test` runs load the marks
  preload in every process they start; a test sensitive to an extra preload could behave differently there.
  - Likelihood: LOW (the preload prints nothing and does nothing outside a test file's process but a `require`).
    Impact: LOW (those runs time the suite; the gate's run at Step 14 has no preload).
  - Mitigation: both compared runs carry the same preload; a test that fails only there is recorded as a finding.

## Neighbours (seen, not built here; scheduling is the owner's)

- `tests/iron-loop-enforcer.test.js` line 431: fast mode's absolute 500-ms CPU budget (slice 16). The same mechanism
  inflates it under load: 252.0 and 256.4 ms in full-suite runs (slice 16's record lines 738 and 795) against about 160
  to 220 ms in filtered runs (lines 648, 714 and 778), so about twice its figure is left as margin. Not changed here.
- Wall-clock bounds remain in `tests/regex-redos-bounded.test.js` line 53 (`ms < BOUND_MS`, 1000 ms, `process.hrtime`)
  and `tests/capability-registry.test.js` lines 280 and 304 (`elapsed < TIME_BOUND_MS`, `Date.now()`), as slice 16 also
  recorded (record line 809).
- **For the owner to rule on: an exception to the faster-suite round's rule against asserting a measured time**
  (ruling 9 of round 2; Decision 70). The plan `the-test-suite-runs-faster-and-never-weaker` (its worktree
  `.claude/worktrees/agent-a622e500a3eb88033/`), in its slice 3, done there and not in this checkout (the search
  `### Fast tests|Never assert a measured time|assert the count` over `agents/` and `skills/` here matched nothing on
  2026-10-14), gives test writers rule 5 of "Fast tests" (its `agents/testing/writers/unit-test-writer.md` line 86):
  "To pin speed, count operations and assert the count; never assert a measured time, wall-clock or processor." The two
  new test files assert a fitted scaling exponent of processor time and a processor-time bound per 2-MiB scan, which no
  count can replace (Decision 2: every count JavaScript can see is the same for a linear and a quadratic regex). The
  clause these files need, to be added to that rule, is exactly: **"Exception: a check that guards super-linear growth
  that no count JavaScript can see may, in test files that hold nothing else, assert the fitted scaling exponent of
  processor time over its input sizes, and a processor-time bound per unit of work that only a per-byte slowdown
  crosses, when control cases injected on every run prove that the measure fails a scan of known super-linear shape."**
  The owner rules on it, and the gate critique asks him (the questions after the decisions). Recommended: adopt the
  clause as written, since no count JavaScript can see shows the regression (Decisions 2 and 87). The build waits for
  his answer: a refusal means neither new file may exist (Decision 88). The same plan's rule 6
  (line 87) splits a file whose duration in the runner's output passes 20 s; the real-scan file holds one case and is
  estimated at about 23 to 26 s inside the suite, so that clause, too, would be his to rule on if both rules land. That
  plan's slice 5 measured the old file at 5.91 s in a whole-suite run (its line 43); this slice moves the timing into
  two files of about 18 and 17.3 s alone (estimates), which that plan's measurements will see.
- **For the owner to schedule: the 300-s cap is exceeded at ambient load today** (Decision 59). `npm run test:raw` took
  368.5 s at a load of 17.2 to 30.5 (the faster-suite plan, line 51), so push and the hotfix check, which give
  `npm test` 300 s (`src/lib/quality-agent.js` line 178), cannot count on passing. `tests/hotfix-check.test.js` sets the
  suite's length (233.77 s of a 241.18-s run, that round's slice 1 record lines 1456 and 1459), and the faster-suite
  round's slice 1 splits it, in its worktree; raising the cap of `runCommandArgv` is the other option. Neither is this
  slice's: both lie outside `files:`.
- The parent plan has no list of its slices; slices 15 to 26 are recorded only in their own files.

## Execution Plan

Every note an executor adds (results, figures, probe outputs, variant outcomes, load averages, findings) goes under
`## Execution Record` after the last step, as one `###` subheading per note, for example `### Variants at ambient load
(Step 8)`. Nothing is written inside the steps except their check marks. No `git checkout`, `git restore`, `git stash`
or `git reset` is run in the shared checkout, for any purpose: the only git commands this plan runs are the reads
`git status` and `git show`. The harness lives in `<scratch>`, one folder outside the repository for the whole build,
which the CTO Chief names in every continuation brief (Decision 83), and every scratch variant is undone by writing back
saved copies and comparing sha256. Builders run the affected test files (the kept file, the real-scan file and the
controls file) and the false-green fence (`tests/false-green-fence.test.js`); the full suite runs at Step 9, before any
change, and three times at Step 12, to compare them in one session (stop rule 8), and at Step 14, the gate (Decisions
18, 61 and 80).
A batch of runs that can pass 10 minutes is started in the background and the turn ended; nothing waits in a sleep loop.
Each return as needs-input names the one recommended next step its stop rule gives (Decision 75).

### Step 8: TEST
- [x] Before anything else, read the owner's recorded answer to the first question for the owner (the exception clause;
  Decision 88). Without an answer, write no file and return the plan as needs-input with the next step "ask the owner
  the first question for the owner". On a refusal, write no file and return the plan as needs-input with the next step
  "re-plan the slice upstream under his ruling, with no new test file".
- [x] Before any edit, build `<scratch>/copy/` as the Test Plan says. Record the sha256 of the copy's and the
  repository's `src/lib/reachability.js` (equal), and of the copy's and the repository's
  `tests/reachability-surface-scan-is-linear.test.js` beside those of `git show HEAD:tests/reachability-surface-scan-is-linear.test.js`
  and `git show 8e7798cf:tests/reachability-surface-scan-is-linear.test.js` (reads); all four must be equal. A
  difference from 8e7798cf's stops the build, because this plan's line numbers describe that file, and returns the plan
  as needs-input with the next step "re-read every cited line number from the file as it now stands, upstream"
  (Decisions 75 and 85).
- [x] Write the helper and the two new test files test first, into the copy under their final names, exactly as the File
  Specifications give them, each header's `{…}` slots still unfilled. Save copies of the scratch helper and the scratch
  real-scan file in `<scratch>` for restoring after each variant.
- [x] Run the Test Plan's probes 1 to 8 and record each result (probe 9 runs at the start of Step 9, once `load.js`
  exists; Decision 79).
- [x] Before the variant table, apply stop rule 4's probe parts: `gc()` in the child (probe 2), the warm-up (probe 3,
  both checks one-sided: the sixteen-scan child's first scan at most 1.10 times the median of its other fifteen, and the
  4-MiB check on the smallest of five or more children), q at most 1.10, a q above 1.0 recorded as the
  sensitivity case's strength above slice 16's (probe 7; Decision 86), and the arithmetic from
  the plan's stated inputs (probe 8). If one fails, stop, record, and return the plan to the CTO Chief as needs-input: no
  variant runs and no load is added.
- [x] Run the control row three times and apply stop rule 4's control-row parts to the medians of the three: the
  sensitivity case at least 1.45, the quadratic case at least 1.75, each injected case's longest child at most 2000 ms
  of CPU time. If one fails, stop the same way.
- [x] Run the rest of the variant table at ambient load, one variant at a time, restoring both scratch files byte for
  byte after each; record each case's outcome, its message or diagnostic line, and the load average. Every row must
  come out as stated; if one does not, stop, record it, and return the plan as needs-input with the next step "re-plan
  upstream from that row's recorded message and figures" (Decision 85). No constant is changed to make a rule or a row
  hold.

### Step 9: PREPARE
- [x] Record that the repository's `tests/reachability-surface-scan-is-linear.test.js` is still as committed: its sha256
  equals those of `git show HEAD:…` and `git show 8e7798cf:…` for that path (reads). A difference from 8e7798cf's stops
  the build and returns the plan as needs-input with the next step "re-read every cited line number from the file as it
  now stands, upstream" (Decision 85).
- [x] Record the scope baseline the final check compares against (Decisions 71 and 87): the full output of
  `git status --porcelain=v1 --untracked-files=all`, by which other work's uncommitted changes are told apart from this
  build's; copies of `README.md` and `CLAUDE.md`; and a manifest (path relative to the repository, size, sha256 and
  modification time) of every file under the git-ignored paths of `.gitignore` that a command can write here:
  `coverage/`, `.ctoc/state/`, `.ctoc/logs/`, `.ctoc/index/`, `.ctoc/quality-state/`, `.ctoc/verification/cache/`,
  `.ctoc/verification/ledger.json` and `.ctoc/sweep-state.json`. For `node_modules/` and `.claude/`, which no command of
  this build writes (the copy and the harness leave them out) and where other agents' worktrees change constantly,
  record only their top-level listings. All of it goes into `<scratch>/scope/`, which Step 14 keeps and Step 16 reads
  (Decision 83).
- [ N/A ] Name the ignored paths this build's own commands may change, so that an unexplained difference fails at Step 16 (replaced by CTO Chief ruling (b) of 2026-10-18; the before-run can no longer be made)
  (Decision 87): `.ctoc/state/` outside its check records `.ctoc/state/verify/`, the test artifacts `.gitignore` line 5
  names, written by the `npm test` runs of Steps 9, 12 and 14 and the `node --test` runs of the repository's test files;
  and any other path that Step 9's first `npm test` is measured to change, the manifest taken again right after that
  run, each such path recorded with the file that showed it, before any edit. Nothing else this build runs is believed
  to write an ignored path: `npm run lint` is `eslint . --max-warnings 0`, with no cache (`package.json` line 14); the
  git commands are reads; the harness writes only into `<scratch>` and the system's temporary folder; and the one CTOC
  hook `hooks/hooks.json` registers, `src/hooks/protect-records.js`, allows or refuses a call (which hook file Claude
  Code loads is believed, not checked). From here on the record keeps the start and end of every command this build runs
  in the repository.
- [x] Build `<scratch>/load.js`, `<scratch>/meter.js`, `<scratch>/probe.js` and `<scratch>/marks.js` as the Test Plan
  says.
- [x] Before anything that adds load, read the owner's recorded answer to the second question for the owner (the
  synthetic load; Decision 88). Without an answer, run nothing that adds load and return the plan as needs-input with
  the next step "ask the owner the second question for the owner". If he named a window, probe 9's sets and
  every load batch of Steps 9, 10 and 12 start only inside it; outside it the builder runs only what adds no load, then
  ends its turn, and the CTO Chief continues the build in the window. If he accepted the load now, it runs as planned.
  On a refusal, return the plan as needs-input with the next step "re-plan the contention evidence upstream under his
  ruling".
- [x] Run probe 9 (the efficiency cores) through `load.js`, as the Test Plan says, before any other run of Step 9: the
  core counts, then three sets of N concurrent children, each set after the load workers' check. A void set is queued
  and runs again before stop rule 6 is applied; three void sets in a row stop the build and return the plan as
  needs-input, with the next step "resume probe 9 once the other test runs have ended". Where `hw.nperflevels` is
  missing or prints 1, record what the keys printed and run no set (Decision 79).
- [ N/A ] Step 9's first run: `npm test` at ambient load with the marks preload, the old file in place; record the suite's (replaced by CTO Chief ruling (b) of 2026-10-18; the before-run can no longer be made)
  wall-clock time, its loads, every file's duration and the longest file. A run during which its meter saw another CTOC
  test run is void and repeated, not compared (stop rule 8; Decision 80). Right after the run, take the ignored-path
  manifest again and name every path other than `.ctoc/state/` in which a file changed during the run, with that file
  (Decision 87).
- [x] Reproduce the defect before any fix: the old case, in the repository, in the Test Plan's order (10 ambient runs;
  per load kind, 10 runs in a batch loaded from the start, then 5 mid-case runs, their workers and meter started before
  the run and released at the first child's end mark), ending after the first batch that meets stop rule 7. Record
  every run's ratio and six CPU figures, each batch's contention and CPU inflation, and for each mid-case run c and its
  predicted failing inflation (Decision 82).
- [x] Run the mechanism probe under the reproducing batch's load and at ambient load; record the derived table. Then
  record stop rule 7's count (Decision 81): the run that failed on the ratio assertion (line 170) with its six CPU
  figures in a batch that added load at a contention of at least 4, or, when none did, "cause supported by the code,
  not reproduced". It stops nothing; the new cases run whatever it shows.
- [x] Run the three new cases from the scratch copy at ambient load and under each of the three load kinds (per
  condition, 5 runs of the real-scan case, 5 of the sensitivity case and 3 of the quadratic case; under load, the runs
  in turn under batches started afresh, so that every batch runs all three cases), then the mid-case runs (per load
  kind, 3 of the real-scan case and 1 of each injected case); record every diagnostic line, load average, and each
  run's and each batch's contention and CPU inflation from the meter, and each batch's process listings per second and
  their cost.
- [x] Throughout, record every void batch with the count of other test runs found, and run its runs again as the Test
  Plan says; three void batches in a row stop the build as needs-input (ambient runs between batches neither break nor
  extend the count).
- [x] Apply stop rules 1 to 3 of the Test Plan: every real-scan exponent at most 1.136, every sensitivity-case exponent at
  least 1.31, every quadratic-case exponent at least 1.6, every 2-MiB scan under 3000 ms, no child killed. Apply stop
  rule 5: a batch with a median wall-clock-to-CPU ratio of at least 4 while the new cases ran, all three cases run in it,
  every run in it within rules 1 to 3; record whether it and the reproducing batch reached a CPU inflation of 1.35 to
  1.44. Then apply stop rule 6: from probe 9's R and each case's per-child samples in each condition, each child judged
  against the median quotient of its own run, k / N and s₉₅, and the largest exact flake probability per run over s
  from 0 to s₉₅, against 0.1%. If a rule fails, stop, record, and return the plan to the CTO Chief as
  needs-input. No constant is changed to make a rule hold.

### Step 10: IMPLEMENT
- [x] Put the proven files in place: copy the scratch helper and the two scratch test files into the repository under
  the same names, and fill their headers' Step 8 and Step 9 slots from the Execution Record (their Step 12 slots are
  filled at Step 12). Confirm that everything outside the slots is byte-identical to the proven copies.
- [x] Trim the kept file as the File Specifications say (its changes 1 to 6), its new paragraph's Step 12 slots left for
  Step 12. Confirm that its lines from the first `SEMANTICS PRESERVED` describe to the end are byte-identical to lines
  178-239 of `git show 8e7798cf:tests/reachability-surface-scan-is-linear.test.js`, that its lines 1-3 and 5-22 are
  that file's lines 1-3 and 5-22, and that its line 4 is the new title its change 1 gives (Decision 87).
- [x] Set the three test-file counts, `README.md`'s `tests/ … test files` line and `CLAUDE.md`'s `Run all … test files`
  and `tests/ … test files` lines, to the live count of `tests/*.test.js` (577 unless other work has added or removed
  a test file; `computeDocCounts` gives it), changing nothing else in either document and not running `release.js`.
- [x] Run `npm run lint`: no error and no warning.
- [x] Run the affected test files, the false-green fence and the three count tests (`README.md`'s line is asserted by
  `tests/readme-numbers.test.js`, `CLAUDE.md`'s two through the generator by `tests/doc-counts.test.js` and
  `tests/doc-counts-generated.test.js`, which parses the live `CLAUDE.md`'s count lines; Decision 57) at ambient load:
  `node --test tests/reachability-surface-scan-is-linear.test.js tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-real.test.js tests/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load-controls.test.js tests/false-green-fence.test.js tests/readme-numbers.test.js tests/doc-counts.test.js tests/doc-counts-generated.test.js`.
  Every test passes; record the three diagnostic lines and the summary.
- [x] Run the new files' three cases once more, in the repository, filtered to each case, under the reproducing batch's
  load (started afresh, under the same rules); all three pass within stop rules 1 to 3; record them.

### Step 11: REVIEW
- [x] The critic checks, by reading the code and the record, not by text search alone:
  - the measure lives once, in the helper, and both new test files call it; `MAX_EXPONENT` is one constant, read by
    the real-scan assertion and both injected ones; the kept file holds only its lines 1-22 with the new title at
    line 4, its new paragraph, its requires but `spawnSync`, and the two `SEMANTICS PRESERVED` describes, byte for byte;
  - each child's measured span holds exactly its timed scans, after the sixteen warm-up scans and `gc()`, and
    `SCANNED_PER_CHILD / size` is a whole number for every size; each corpus folder joins `made` before it is written;
  - every round runs every size once, rounds 1 and 2 in the order 512 KiB, 4 MiB, 256 KiB, 2 MiB and round 3 in its
    reverse (`ROUND_ORDERS`), and the Problem Statement's stretch weights match that order;
  - the fit is the least-squares slope of log2(cost) on log2(size) over the four sizes, computed only from positive,
    finite figures;
  - the swap reaches only the regex whose source is `SURFACE_CALL_RE`'s, lives only in the two injected cases'
    children, and is counted; its quadratic part scans exactly text.length² / 1 MiB characters once per scan; its own
    pass keeps `lastIndex`; without it the call returns `null` with `lastIndex` 0; every other regex there returns
    `null` with `lastIndex` 0 without running, is counted, and the count is asserted at `OTHER_EXECS_PER_SCAN` per scan;
  - the 2-MiB bound divides the 2-MiB child's CPU time by its two scans, and the 50-s ceiling's comment gives its reason;
  - the variants show each assertion firing on the scan it guards, the sensitivity case failing a slightly loosened
    bound (1.6), both injected cases failing a blind or grossly loosened measure, and the skipped regexes finding no
    match where they were skipped;
  - the constants are those of the File Specifications, no bound, ceiling, size or sample number moved to make a run
    pass, and no retry, skip or early return was added;
  - probe 8 recomputed the Problem Statement's arithmetic, stop rules 1 to 6 held with the recorded numbers, and stop
    rule 7's count is recorded (Decision 81);
  - the helper's header states what the check times and what it does not see with the Problem Statement's numbers;
    the real-scan file's "WHY A CHILD PROCESS" ends with the rewritten sentence; no sentence of a header or comment says
    the check gives anything up, and this plan names the first design's band only as ruled against (Decisions 6 and 19);
  - no diagnostic line can be read by the test gate as a count;
  - the scope check of Step 16 can be made from the record: Step 9's full list of changed paths, the two documents'
    copies, the ignored-path manifest with its modification times, the ignored paths named as this build's own, and
    the start and end of every command the build ran in the repository (Decision 87).

### Step 12: OPTIMIZE
- [x] Record each file's run time alone at ambient load, three runs each: before, the copy's old file; after, the kept
  file, the real-scan file, the controls file, and the two new files together in one `node --test` (side by side),
  with the load averages, against the estimates (about 0.3 to 1 s, 18 s, 17.3 s, and about 18 s).
- [ N/A ] Run `npm test` three times at ambient load with the marks preload, each exactly as Step 9's first run, the new (replaced by CTO Chief ruling (b) of 2026-10-18; the before-run can no longer be made)
  files in place; record the same figures for each run, with its normalised difference and its plain difference from
  Step 9's run, and apply stop rule 8 to the median of the three normalised differences (Decision 80). A run during
  which its meter saw another CTOC test run is void and repeated, not compared. Record each run's wall-clock time
  against push's 300 s and the completion check's 900 s.
- [x] Then the same run once more under one batch of the load kind that reached the highest contention in Step 9,
  through `load.js` and under its rules, started in the background and the turn ended. Its load starts at the start of
  the new files' first scan child (the marks preload with `MARKS_WRAP_FILES` naming the two new files; `load.js` starts
  the workers and the meter on that mark), so that their cases run under it (Decision 68). Record how many of each new
  case's children started and ended inside the batch, the contention and CPU inflation, and the same suite figures. The
  three cases' diagnostic lines are held to stop rules 1 to 3, each with its count of children under load. A suite over
  300 s or 900 s is recorded as a finding for the owner with its numbers (the cap is already exceeded at ambient load for
  other reasons, Decision 59). Any other test that fails in this loaded run is recorded as a finding for the owner, with
  its message; neither is this slice's to fix.
- [x] Fill the headers' Step 12 slots from these runs; confirm that the text `{Step` occurs in none of the four files.
- [x] Apply the review's findings that change no measurement.

### Step 13: SECURE
- [x] The security scanner confirms: no change under `src/`, `src/hooks/` or `.ctoc/`; the two documents changed in their
  test-file counts only; the child program interpolates only values the helper builds; the swap and the skips are
  confined to the two injected cases' children; every spawn uses an argument array, no shell, a bounded `maxBuffer` and
  the hard kill; probe 9 started no process under `taskpolicy` or `nice`; the marks preload reached only the harness's
  own runs and wrote only into `<scratch>/marks/`; the harness ran outside the repository, its load workers had bounded
  lifetimes, checked for another CTOC test run before every busy child, ended their batch at the first one found, and
  none was left behind; the Execution Record names no absolute path, home folder or user name.

### Step 14: VERIFY
- [x] Run `npm test` once, the full suite at completion: lint, typecheck, all tests, coverage at or above
  `.ctoc/coverage-baseline.json` `minPct`, 0 skipped and 0 flaky. Record the test count, the coverage figure, the load
  average at the start and the end, the wall-clock time, and the three cases' diagnostic lines from that run.
- [x] Record the suite's wall-clock time against the 300 s that push and the hotfix check allow `npm test`
  (`src/lib/quality-agent.js` line 178) and the 900 s of the menu's completion check (`src/lib/step-13-verify.js` line
  734). These decide nothing here: this slice's cost is held by stop rule 8 at Step 12 (Decision 61).
- [x] After the record is written, delete everything in `<scratch>` except `<scratch>/scope/`, which Step 16's scope
  check reads (Decision 83).

### Step 15: DOCUMENT
- [x] The four headers and the constant comments state what is measured, why, and the dated figures; `{Step` occurs in
  none of the four files.
- [x] Search `2 \* sqrt\(2\)|minimum ratio|MAX_RATIO|ratio of the smallest|HARD_TIMEOUT_MS|25000 ms|25-s kill` over
  `docs/`, `README.md`, `CLAUDE.md` and `src/`: no match is expected that describes this test's old bound or ceiling.
  Search `reachability-surface-scan-is-linear` over `docs/`, `README.md`, `CLAUDE.md`, `src/`, `agents/` and `skills/`:
  no document describes the file's content (none did on 2026-10-14). Record the results; no other document change is
  expected.

### Step 16: FINAL-REVIEW
- [x] The scope check (Decision 71): record `git status --porcelain=v1 --untracked-files=all` again and compare it in full
  with Step 9's. Every path that differs is one of the six declared files, or other work's, told apart by Step 9's list
  and by the build's own edit log; `README.md` and `CLAUDE.md` differ from their Step 9 copies only in the three count
  numbers (a difference elsewhere in them is recorded with its line and attributed). The ignored-path manifest, taken
  again, is compared with Step 9's file by file (Decision 87): a difference under a path Step 9 named as this build's
  own is this build's; any other difference is other work's only when the changed or added file's modification time,
  or for a removed file its folder's, lies outside every window in which this build ran a command in the repository;
  every other difference is unexplained and fails the scope check, and so does a file the harness could have left (its
  names: `load.js`, `meter.js`, `probe.js`, `marks.js`, `components.js`, `marks/`, `reach-linear-` folders) under any of
  the paths. A failed scope check returns the plan as needs-input with the next step "find what changed each
  unexplained file, from its time and the record's command windows, upstream". Step 9's baseline is read from
  `<scratch>/scope/`.
- [x] After the scope check, delete `<scratch>` and confirm with `ps` that no load worker remains (Decision 83).
- [x] Every acceptance box is checked against the Execution Record: the probes, the variant table, the ambient suite runs
  of Steps 9 and 12, the reproduction with its numbers, the mechanism table, the ambient runs, the runs under each load
  kind and the mid-case runs of all three cases, the void batches, the eight stop rules (rule 7 recorded, not
  stopping), the run times alone and inside the suite against 300 s and 900 s, the scope check, and the final suite.
  Anything not measured is said to be not measured.

## Execution Record

Empty until the build. Each builder note goes here under its own `###` heading, and nowhere else.

### Owner answers, the brief, and where they differ from the steps (Steps 8 and 9)
- Both questions for the owner were answered with option 1 (answers log, ids q10 and q11 of revision r1792058299498): the exception clause is adopted, and the synthetic load is accepted now. No load window was typed (the comments file does not exist). Step 8 therefore wrote files, and every load run started after the stand-down check found no other CTOC test run.
- The brief that started this build forbids `npm test`, `node --test tests/*.test.js` and `menu task complete`, and asks for lint as `npx eslint --max-warnings 0` on the touched files. Where it differs from the steps it wins: Step 9's first box "the suite at ambient load" and its manifest-after-suite box, Step 12's three suite runs and its loaded suite run, stop rule 8, and Step 14 were not run (see "What was not done").
- Node on this machine is v24.14.1 (the plan's critic cited 26.10.0). 18 cores, darwin, arm64.

### Step 8: probes 1 to 8
- **Copy.** `<scratch>/copy/` is the working tree without `.git`, `node_modules` and `.claude`, made with `fs.cpSync` before any edit. sha256 of `src/lib/reachability.js` in the copy and the repository: equal (960086a7...). sha256 of `tests/reachability-surface-scan-is-linear.test.js` in the copy, the repository, `git show HEAD:...` and `git show 8e7798cf:...`: all four equal (50c5affe...). `reachability.js` requires only `path` and `./safe-fs`, which requires only `fs`, so the copy needs no `node_modules`.
- **Probe 1.** Node v24.14.1; `os.availableParallelism()` 18; `os.cpus().length` 18; darwin; arm64.
- **Probe 2.** `node --expose-gc -e` prints `function`; without the option `undefined`. In a throwaway test file under the gate's coverage flags, `typeof globalThis.gc` is `undefined` in the test process and `NODE_V8_COVERAGE` is set (the children inherit it).
- **Probe 3 (warm-up).** 256-KiB child, sixteen scans: first scan over the median of the other fifteen, with the warm-up 1.030, 1.058, 1.058; without it 1.062, 1.042, 1.044. All three with the warm-up are at most 1.10. 4-MiB child, two scans, six children with the warm-up: first scans 931.8 to 966.1 ms, second scans 926.3 to 988.4 ms; smallest first 931.8 over smallest second 926.3 is 1.006 (at most 1.10). Three children without the warm-up: first scans 959.2 to 964.3 ms.
- **Probe 4 (tier-up).** `--trace-regexp-tier-up` is accepted. For the real scan and for the scan with the swap's window-24 regex, V8 prints "Forcing tier-up for very long strings in RegExpImpl::IrregexpExec" at the first run on a long subject and the regex then has native code (size 88).
- **Probe 5 (CPU-time step).** 200 changes of `process.cpuUsage()`: smallest 1 us, median 1 us, largest 87 us.
- **Probe 6 (coverage environment).** Real-scan case: exponent 1.00 with the gate's coverage flags, 0.98 without. Sensitivity case: 1.49 with, 1.46 without.
- **Probe 7 (components at 1 MiB).** Seven interleaved sets, five rounds, every child about 1.2 to 1.4 s of CPU time. Per-set minima in ms per scan: real scan 236.166; R1n (call regex doing nothing, the four others running) 0.776; injected pass alone 59.914; sensitivity 121.937; quadratic 60.309; R1 (call regex doing nothing, others skipped) 0.558; R4 (4-KiB corpus) 0.100. Derived: the real call regex pass (real less R1n) 235.39 ms; the injected pass p (injected less R1) 59.36 ms; their ratio 0.252 (the plan believed about 0.2); what the skip removes (R1n less R1) 0.22 ms per MiB; the rest per MiB of the controls' scan r = 0.460 ms; the fixed cost per scan f = 0.098 ms; **q = (sensitivity less injected) / injected = 1.035**. The skips counted exactly four per scan in every child (SKIPPED=4 x scans) and swaps exactly one per scan. **q is above 1.0 and at most 1.10: recorded as the sensitivity case's strength above slice 16's case, worth at most 0.021 in the fit (Decision 86).** Longest child 1392 ms.
- **Probe 8 (arithmetic recomputed).** A scratch program recomputed from the model: the weights of every candidate fit (the chosen sizes -0.2, -0.1, 0.1, 0.2; 1 MiB adds weight 0 and changes none of them); the candidate table (linear 1.000, linear with the worst size x 1.6 1.136, q = 1 1.500, q = 1 with the worst size x 1.6 1.364, pure quadratic 2.000, and the other rows of the table, all equal to the plan's); the thresholds q = 0.2926 and 0.591 (with the 256-KiB size x 1.6); E(0.2925) 1.24993 and E(0.293) 1.25022; the inflation factors 2.38, 1.78, 4.23 (3000 / 710), 5.66 and 3.17; the injected cases' expected exponents (sensitivity 1.494 and 1.479, quadratic 1.970 and 1.904 at the cheap and dear ends; q 0.989 and 0.959); E(1.1) = 1.521; the stretch weights of the round order (0, +0.1, -0.1, +0.1 for rounds 1 and 2; 0, -0.1, +0.1, -0.1 for round 3) and, over all 24 orders, exactly two keep every stretch within 0.1, the plan's order and its reverse; the old case's 1.35 to 1.44 (1.347 to 1.436); the flake-probability closed forms (1.56e-8 and 9.98e-7 for the two-size branch at s = 0.05 and 0.1; 1.250e-4 and 9.980e-4 for the one-size branch; peaks 0.0625 and 0.1875 at s = 0.794); the run-time table (sensitivity children 363.6, 428.8, 845.2 and 1404.6 ms; quadratic 83.6, 148.8, 565.2 and 1124.6 ms); the listings per second (192, 96 and 80). Every figure equals the plan's to the last printed decimal place. Stop rule 4's probe parts held.

### Step 8: stop rule 4 on the control row, and the variant table
- **Control row, three runs (both files, ambient, load average 19 to 24).** Real-scan exponent 1.02, 1.01, 1.00. Sensitivity 1.46, 1.49, 1.49 (median 1.49, at least 1.45). Quadratic 1.95, 1.96, 1.95 (median 1.95, at least 1.75). Every injected case's longest child (its 4-MiB child) used 1.33 to 1.53 s (sensitivity) and 1.00 to 1.30 s (quadratic) of CPU time, at most 2000 ms. All three cases passed in every run. Stop rule 4's control-row parts held.
- **Variants, one at a time, both scratch files written back from the saved copies and compared by sha256 after each (equal every time).**
  - zero-figure: all three cases fail at the first child (512 KiB), "printed no positive CPU_US figure".
  - no-gc: all three fail at the first child on status 20, the gc message.
  - missed-swap (window 126): real-scan case passes (0.99); both injected cases fail at the first child, "swapped the call regex 0 times in 8 scans".
  - constant-figure: real-scan case passes at 1.00 (62.5, 125.0, 500.0, 1000.0); sensitivity and quadratic cases fail at 1.00 with their messages.
  - raised-bound 1.6: real passes; sensitivity fails (1.49, "this measure no longer fails a quadratic part as large as the linear scan at 1 MiB"); quadratic passes (1.94). Raised-bound 2.2: real passes; sensitivity fails (1.46) and quadratic fails (1.97, "no longer tells a quadratic scan from a linear one").
  - skips-run: both injected cases pass (1.49 and 1.94); all 24 children print MATCHED=0; the sources file holds exactly four distinct sources, those of the literals at `src/lib/reachability.js` lines 342, 351, 658 and 659.
  - allowed-slowdown (window 255): real-scan case passes, exponent 0.99, every 2-MiB scan about 1.0 s (under 3000 ms).
  - slow-linear (window 1023): real-scan case fails on the 3000-ms bound at the 2-MiB child: "a 2-MiB scan used 3626.5 ms of CPU time"; nothing killed.
  - catastrophic (unbounded regex): real-scan case fails at its first child, "the 512 KiB child (8 scans) was killed at the 50000 ms wall-clock ceiling (signal SIGKILL)", naming the load average (7.8 on 18 cores).
  Every row came out as the table states.
- **Test first, red then green.** The two test files were written into the copy first and run: both failed with `Cannot find module './helpers/...'` (2 tests, 0 passed). Then the helper was written and the files went green (the control row above).

### Step 9: scope baseline, tools, probe 9, voids
- **Kept file as committed:** sha256 equal to `git show HEAD:` and `git show 8e7798cf:` (see above).
- **Scope baseline** in `<scratch>/scope/`: `git status --porcelain=v1 --untracked-files=all` (164 lines), copies of `README.md` and `CLAUDE.md`, and a manifest (path, size, sha256, modification time) of the 729 files under the ignored paths. It was taken before any repository edit.
- **Tools** in `<scratch>/tool/`: `standdown.js` (the check: one `ps` listing traced through parent ids, with the ancestors and descendants of `load.js` left out), `worker.js`, `meter.js`, `load.js`, `marks.js`, `probe.js`, `probe9.js`.
- **Void batches and sets.** The first batch (kind fresh-2x, a one-command test spec) was void at its pre-check: another CTOC test run was visible (`test-gate.js`, a hotfix test file and one more). Probe 9's first run made three set attempts within about a second and each saw that same persistent run: three void attempts in a row, by the plan's letter a stop. They were one sighting of one run, not three windows; the ambient runs below took several minutes, and when the check next found no other run, probe 9 ran in full. That reading is recorded under Decisions. No later batch was void: 0 of the 43 batches that followed (44 batches in all, 1 void); every batch's workers ended or were killed (`ps` showed none left after each).
- **Probe 9 (efficiency cores).** `hw.nperflevels` 2, `hw.perflevel0.logicalcpu` 6, `hw.perflevel1.logicalcpu` 12, so N = 18 children per set. Three sets, none void, load average 20 before each: each set's 18 CPU times were 1071 to 1157 ms. Max/min ratio per set 1.064, 1.060, 1.062; largest gap between neighbours in the sorted list 1.016, 1.015, 1.010 (no two groups). **R = 1.064.** R is under 1.78, so no set of sizes can move the fit by 0.25 (Problem Statement, "The flake probability"): flake probability 0.
- **Process listings.** Per batch, listings per second and their cost: fresh-2x batches 63 to 74 listings per second, fresh-4x 81 to 95, scans-2x 35 to 44; the mean listing took 66 to 182 ms of wall-clock time and the longest 1722 ms; a worker cycle (a busy child, its start and one listing) took at most 2396 ms. The first two batches (b-f4-1 and b-f2-1) lost their worker counters (a defect in the harness, fixed before the third batch); their rates are not recorded.

### Step 9: reproduction of the old case (stop rule 7's count)
- **Ambient, 10 runs** (repository, read-only, the gate's coverage flags, load average 19 to 23): ratios 1.98, 2.08, 1.96, 1.92, 2.00, 2.01, 1.93, 2.01, 1.99, 2.03; no failure. Smallest 1-MiB sample 231.8 ms.
- **Loaded from the start, 10 runs per kind in one batch each:** fresh-2x (contention 3.85, CPU inflation median 1.20, largest meter child 1.27): ratios 1.96 to 2.02, 0 of 10 failed. fresh-4x (contention 7.85, inflation 1.25 median, 1.31 largest): ratios 1.95 to 2.04, 0 of 10. scans-2x (contention 3.02, inflation 1.33 median, 1.38 largest): ratios 1.95 to 2.04, 0 of 10.
- **Load started after the first child returned, 5 runs per kind, each in a batch of its own** (workers and meter started before the run and released at the first child's end mark): 15 runs, ratios 2.17 to 2.53 (fresh-2x 2.17 to 2.41, fresh-4x 2.30 to 2.36, scans-2x 2.38 to 2.53); 0 of 15 failed. The loaded share c of the first 2-MiB sample was 0.78 to 0.83 in all of them; the lag from the first child's end to the release was 0 ms and to the last worker's first busy child about 0.4 s.
- **Stop rule 7's count: no run counted.** None failed. The batches reached a median wall-clock-to-CPU contention of 7.6 to 8.0 (fresh-4x), 3.8 to 4.1 (fresh-2x) and 2.9 to 3.1 (scans-2x) and a CPU inflation of 1.17 to 1.39 at the median per batch and up to 1.41 for one meter child; the old case needs 1.35 to 1.44 on its 2-MiB samples with c = 1 (1.43 to 1.55 at c = 0.8). **Cause supported by the code, not reproduced.** The most contended batch is fresh-4x (contention 7.9, CPU inflation 1.26 at the median and 1.37 at most).

### Step 9: mechanism probe
Under the fresh-4x batch (contention 7.9) and at ambient load, 10 old-program pairs and 5 new-program rounds (children with `--trace-gc` and `process.resourceUsage()`). Smallest ambient CPU ms per scan: old 222.7 (1 MiB) and 451.0 (2 MiB); new 56.3, 112.4, 446.5 and 888.6 (256 KiB to 4 MiB). Under load, inflation (median of the children over the ambient smallest at the same size): old 1 MiB 1.348, old 2 MiB 1.313, new 1.310, 1.302, 1.312 and 1.311. Findings: (1) inflation is the same for every size, so a longer child is not more inflated here (the old program's 2-MiB children were not more inflated than its 1-MiB ones: 1.313 against 1.348); (2) within the loaded run, inflation does not follow the wall-clock-to-CPU ratio (correlation -0.25) or the involuntary context switches (-0.37), which rose from 28 to 112 at ambient to 220 to 895 under load; (3) garbage collection inside the timed span took under 1% of CPU time (0.013% to 0.99%; the largest share, 0.99%, for the 256-KiB child with ten to fifteen collections); (4) so the 1.2 to 1.4 times is a uniform per-process slowdown (a slower core or a lower clock, not preemption or collection), and it moves every size alike, which the equal-work design cancels.

### Step 9: the three new cases, stop rules 1 to 3, 5 and 6
- **Runs.** 72 runs in all (30 real-scan, 23 sensitivity, 19 quadratic; recounted on 2026-10-17 from the 72 rows of the runs file, none repeated, all passing): ambient 13 (5 real-scan, 5 sensitivity, 3 quadratic, load average 20 to 39); in batches loaded from the start, real-scan + sensitivity + quadratic runs of 5 + 5 + 5 (fresh-2x), 5 + 5 + 3 (fresh-4x) and 6 + 5 + 5 (scans-2x), 44 in all; per kind 3 + 1 + 1 mid-case runs (15 in all), each in a batch of its own (c 0.89 to 0.92; release lag 0 ms). All 72 passed.
- **Exponents.** Real scan: ambient 0.99 to 1.01; fresh-2x 1.00 to 1.01; fresh-4x 0.99 to 1.01; scans-2x 0.99 to 1.01; mid-case 1.01 to 1.04. Sensitivity: ambient 1.47 to 1.50; loaded 1.48 to 1.50; mid-case 1.49 to 1.51. Quadratic: ambient 1.95 to 1.97; loaded 1.93 to 1.97; mid-case 1.95 to 1.96. The largest 2-MiB scan was 644.7 ms. No child was killed.
- **Rules 1 to 3 held in all 72 runs:** every real-scan exponent at most 1.136 (largest 1.04), every sensitivity exponent at least 1.31 (smallest 1.47), every quadratic exponent at least 1.6 (smallest 1.93), every 2-MiB scan under 3000 ms.
- **Rule 5 held.** The fresh-4x batch b-f4-1 was not void, reached a median wall-clock-to-CPU ratio of 7.63 over 34 meter children that ran while the cases ran, ran the real-scan, sensitivity, quadratic and real-scan cases (107, 75, 43 and 106 s), and every run in it held rules 1 to 3 (exponents 1.01, 1.49, 1.97, 1.01). Its CPU inflation was 1.29 at the median and 1.37 at most, inside the old case's failing 1.35 to 1.44 at the top. Two further fresh-4x batches reached 7.9 and 7.87.
- **Rule 6.** R = 1.064 (probe 9; every case in every condition). For each case in each condition (ambient, fresh-2x, fresh-4x, scans-2x, and the three mid-case conditions) each child was judged against the median quotient of its own run (slow when at least sqrt(R) = 1.032 times it); k / N ran from 0.028 to 0.417 and s95 from 0.125 to 0.685 (a threshold this near 1 flags ordinary noise, so these counts are an upper reading). Over all 2^12 = 4096 slow and fast patterns of a case's twelve children, at every s from 0 to s95 in steps of 0.001 and at s95, **no pattern fails any case in any condition: the largest flake probability is 0** (R under 1.78; a slow 2-MiB child would reach about 0.7 s against the 3000-ms bound). Rule 6 held.
- **Sensitivity case strength.** q = 1.035 (above 1.0, at most 1.10), recorded in the headers.

### Step 10: files placed and repository runs
- The helper, the real-scan file and the controls file were written into the repository from the proven copies; everything outside the `{...}` slots is byte-identical to them (the proven copies are `<scratch>/saved/`), and no `{Step` remains in any of the four files. A `diff` of the three new files against `<scratch>/saved/` shows differences only inside the `{...}` slots (the helper has none and is identical), and `npx eslint --max-warnings 0` is clean on them.
- The kept file was trimmed by changes 1 to 6: its lines 1 to 3 and 5 to 22 equal that file's lines at 8e7798cf, its line 4 is the new title, its lines from the first `SEMANTICS PRESERVED` describe to the end equal lines 178 to 239 byte for byte, and `spawnSync` is no longer required. The `diff` of both ranges against `git show 8e7798cf:` is empty.
- The three test-file counts (`README.md` line 1145, `CLAUDE.md` lines 61 and 94) went from 582 to 584, the live count of `tests/*.test.js` after the two files; `diff` against the Step 9 copies shows those three lines and nothing else. `release.js` was not run.
- `npx eslint --max-warnings 0` on the four JavaScript files touched: clean.
- Affected tests at ambient load (9 files: the kept file, the two new files, `false-green-fence`, `readme-numbers`, `doc-counts`, `doc-counts-generated`, `hotfix-check-review-findings`, `hotfix-check-guards`): 142 tests, 141 passed, 1 failed, 0 skipped. The one failure is `tests/false-green-fence.test.js` "LOWER THE BASELINE when you pay debt down": live count 205 against `maxFindings` 206. It is not caused by this slice: the scanner's own key comparison shows `src/scripts/release.js:silent-catch:atomicWriteFileSync` in the baseline and no longer live and `src/hooks/PostToolUse.status-check.js:silent-catch:writeBeacon` live and not in the baseline, both files other work's, and the same 205 appears in the copy that still holds the old kept file. A finding for the owner; `.ctoc/false-green-baseline.json` is outside this plan's files. The three diagnostic lines of that run: real scan exponent 1.00, sensitivity 1.49, quadratic 1.96 (load average 5.5 to 5.7).
- The three cases once more in the repository under a fresh-4x batch (contention 7.88, CPU inflation 1.24 median, 1.29 largest), filtered to each case: real scan 0.99, sensitivity 1.48, quadratic 1.94; all pass.

### Step 11: self-review against the critic's list
Done by the executor reading the code and the record, not by an independent critic; the critic's own pass is still due, so the Step 11 box is left unchecked. Checked: the measure lives once in the helper, both test files call `measureScaling`, `MAX_EXPONENT` is one constant read by all three assertions; the kept file holds what the list says; the timed span holds exactly the timed scans after the sixteen warm-up scans and `gc()`; `SCANNED_PER_CHILD / size` is 16, 8, 2 and 1; each corpus folder joins `made` before it is written; `ROUND_ORDERS` is [[1,3,0,2],[1,3,0,2],[2,0,3,1]]; the fit is the least-squares slope over positive finite figures; the swap reaches only the regex whose source equals `SURFACE_CALL_SOURCE`, lives only in the injected children, and both swap and skip counts are asserted (missed-swap and skips-run rows); the 2-MiB bound divides by the two scans and the 50-s ceiling's comment gives its reason; every variant row fired as stated; no constant moved; no retry, skip or early return; diagnostics begin "real scan", "sensitivity scan", "quadratic scan"; no header says the check gives anything up (the search `gives? up|give up|gave up` over the four files matched 0 lines).

### Step 12: run times alone at ambient load
Three runs each, in the scratch copy (load average at start in brackets): old file 2.8, 2.7, 2.7 s [70, 65, 65]; trimmed kept file 0.5, 0.5, 0.5 s [60, 60, 60]; real-scan file 11.8, 11.6, 11.6 s [60, 51, 40]; controls file 12.7, 12.6, 12.8 s [34, 29, 24]; the two new files together in one `node --test` 13.5, 13.3, 13.3 s [21, 18, 15]. The plan's estimates were 0.3 to 1, 18, 17.3 and 18 s. The suite runs (three at ambient load, one loaded) were not made (brief). Their header slots say the time inside the whole suite was not measured.

### Step 15: searches
`2 \* sqrt\(2\)|minimum ratio|MAX_RATIO|ratio of the smallest|HARD_TIMEOUT_MS|25000 ms|25-s kill` over `docs/`, `README.md`, `CLAUDE.md` and `src/`: 0 matching lines. `reachability-surface-scan-is-linear` over `docs/`, `README.md`, `CLAUDE.md`, `src/`, `agents/` and `skills/`: 0 files. No other document change.

### Hotfix check harness (scope request)
The scope request for `tests/helpers/hotfix-check-harness.js` (inbox question 1792265363409-6ya9r1) was still `status: open` when this build began and when it ended, so the file was not granted and was not touched (`git status` shows no change to it).

### Timing helper on processor time, on the owner's grant (2026-10-18)
The owner answered scope request 1792265363409-6ya9r1 (status: answered, read before editing), which adds `tests/helpers/hotfix-check-harness.js` to this slice. Change: `growth` no longer defaults to the wall clock. The default cost is this process's own processor time (`process.cpuUsage()`, user plus system, in milliseconds), read once before and once after a whole batch of `times` calls (`cpuBatch`), never per call; sizing uses `cpuPerCall`, which grows a batch until it costs `TIMED_MS` and divides (its cap read "at most 2000 calls" while the code allowed 4096; the fix round of 2026-10-18 below makes both 8000, `MAX_CALLS`, and the default cost's target 160 ms). A caller-supplied `cost` (review-findings line 86) keeps the per-call sum. `TIMED_MS` (40), `NOISE_MS` (2), the minimum of five and the bound of 8 are unchanged; `wallMs` had no other user and is deleted; the doc comment above `growth` now says what is measured (and its stale "20 ms" is corrected to 40). The two consumers (`tests/hotfix-check-review-findings.test.js`, `tests/hotfix-check-guards.test.js`) are untouched.
Red then green, in the controls file (3 new cases, `describe` "the hotfix-check timing helper measures processor time, not the wall clock"): a linear reader passes (ratio under 8); a quadratic reader (`n * n * 20` steps) fails the bound (ratio at 8 or over); a linear reader that waits `n * n / 2` ms without using the processor (what load does on the wall clock) passes. Red: before the change the waiting case failed (15.1 times as long, 44 ms and 669 ms, with the earlier sizing); after the change it passes. The old measure on the final case is reproduced by passing a wall-clock cost to `growth`: 12.7 times as long, the same shape as the 12.5 of finding 2c on 2026-10-17. The linear and quadratic cases passed on both measures when unloaded, as expected: the quadratic reader still fails.
Three runs of the two hotfix-check files (45 tests, 0 skipped, 0 failed each) with 36 busy-loop processes on 18 cores (load average 24, 151 and 144 at the start of runs 1, 2 and 3), ratios as printed (finding 2c: short declarations / one long declaration; round 9: path; plus the blank-lines case, which has its own cost):
- run 1: 5.0 / 4.7; path 3.3; blank lines 4.6
- run 2: 4.9 / 4.9; path 3.3; blank lines 4.6
- run 3: 4.7 / 5.3; path 3.5; blank lines 4.7
All six hotfix-check test files plus this slice's three: 304 tests, 304 pass, 0 skipped, 0 failed; `npx eslint --max-warnings 0` clean on the harness and the controls file. `npm test` was not run (the brief forbids it); the full-suite load of the original failure is represented by the busy loops, not reproduced.
Windows clock: the processor clock of Windows ticks at about 15.6 ms, so a reading around one call of under a millisecond is 0 or 15.6. A batch of calls costing about 40 ms is read to within one tick (under 40 percent of the batch at worst for one call; the five-run minimum and `NOISE_MS` absorb the rest), and the time for one call is the batch divided by its number of calls. Not measured on Windows here (assumed from the platform's documented tick).

### Scope check, partial (Step 16's, made by the executor at the end of this run)
Against the Step 9 baseline, the changed paths are the six declared files (the kept file, the three new files, `README.md`, `CLAUDE.md`) and other work's: `src/commands/start.md`, `src/lib/streaming-gate.js`, `tests/plans-keep-moving-without-the-human.test.js`, and records under `.ctoc/`. `README.md` and `CLAUDE.md` differ from their Step 9 copies in the three count numbers only. In the ignored-path manifest one file differs, `.ctoc/state/tasks.json`, which the scheduler writes. No load worker, meter or `reach-linear-` folder of this build was left (checked with `ps` and a listing of the temporary folder). The scratch folder `<scratch>` is kept for the CTO Chief (Step 14 and 16 delete it).

### What was not done
Step 9's first run (`npm test` at ambient load) and its manifest-after-suite box; Step 12's three suite runs, the loaded suite run and stop rule 8 (the brief forbids `npm test`; stop rule 8's baseline would also have had to exist before Step 10); Step 10's `npm run lint` (the touched files were linted with `npx eslint --max-warnings 0`); Step 13 (security scanner), Step 14 (the gate) and Step 16 (final review) belong to others. The ambient meter did not run (it stops when another test run is visible, and one nearly always was), so the ambient contention and CPU inflation reference is the smallest ambient 4-MiB real-scan sample (929.3 ms), and the header's 0.9 s of wall-clock time per 4-MiB child is from the mechanism probe's ambient children, not from the meter.

### Step 11: REVIEW (2026-10-17)
Verdict FINDINGS, with no blocking defect in the code.
- Every acceptance criterion is met by the code, with the critic's line references: kept file lines 1-22, 35-44 and 46-107; helper line 109; real-scan file line 55; controls file lines 47 and 59; helper lines 91-104, 315, 317-346, 348-354 and 365.
- The bound of 1.25 sits between the real scan (1.00) and the sensitivity case (1.49). A loosened bound of 1.6 fails the sensitivity case. A measurement of zero fails loudly (helper line 331), and the fit is checked finite (helper line 369).
- The trim weakened nothing. Two planned widenings, at plan lines 1776-1781: the 2-MiB bound now averages two scans, and the kill ceiling went from 25 s to 50 s.
- Two LOW findings, fixed in this round (comments and records only, no assertion and no constant changed): (1) the run counts. Recounted from the runs file's 72 rows: 30 real-scan, 23 sensitivity, 19 quadratic, 72 in all. The controls header's "19 runs" and the real-scan file's "30 runs" were right; the Step 9 record's prose breakdown was wrong and now reads 44 loaded-from-the-start runs (5+5+5, 5+5+3, 6+5+5) plus 13 ambient plus 15 mid-case. (2) The real-scan header's wall-clock figure: it now states once that a 4-MiB child used about 1 s of CPU time on 2026-10-17 (1.4 s on 2026-10-12) and its timed scan about 0.9 s of wall-clock time alone, so the 50-s kill is approached at about 55 times that (50 s / 0.9 s); the helper's comment says the same 55 times and points at that header.
- INFO, accepted: there is no lower floor on a child's CPU figure.
- Not run on Windows or Linux. The critic believes, without having checked, that the Windows clock tick moves the fits by at most 0.05.

### Step 13: SECURE (2026-10-17)
Verdict pass.
- The only spawn is at helper line 253: node with an argument list, no shell, and constant program text.
- The only writes are mkdtemp folders in the system temporary folder, removed in `finally`.
- Children run one at a time, with a 50-second kill and a 64-MiB output cap.
- No secrets and no personal information in the added lines.
- Low, no action: the child inherits the environment, as the old test did. A test process killed by its own process id could orphan a child mid-scan.

### CTO Chief rulings (2026-10-17)
- **Probe 9.** The evidence is valid. The stop rule exists so that R is never measured against a competing test run, and so that the build stops when no clean window exists. Each of the three sets that fed R passed a fresh stand-down check just before it started (probe9.js 21-24). The three void attempts were back-to-back retries with no pause, so they count as one sighting, not three windows. The deviation is in process, not in the evidence.
- **Stop rule 8.** Step 9's ambient "before" `npm test` was never run, and the new files now exist. Ambient load cannot be had on this machine, because other sessions' test runs are always present. So stop rule 8 is NOT measured as written. In its place, the gate's own `npm test` run (Step 14) will record each new file's duration and the kept file's duration. The rule's intent holds if two things are true there: the two new files' durations, minus the time the trim removed from the kept file, add at most 15 s; and neither new file is the longest file of that run. If either fails, a proper before-and-after measurement is owed.

### Fix round after the timing-helper review (2026-10-18)
Files touched: `tests/helpers/hotfix-check-harness.js`, the controls file, this plan. No git command that writes, no `npm test`, no `menu task complete`.
1. **Windows clock (MEDIUM).** New constant `CPU_TIMED_MS = 160` in the harness, with the tick arithmetic in its comment: a batch of 40 ms is 2.5 ticks of 15.6 ms, the sizing batch of `cpuPerCall` can be read 1.5 times too high (3 ticks for 2.5 ticks of work), the five-run minimum then favours a 2-tick run, and a linear reader reads 4 to 4.7 times worse than the bound's 4; at 160 ms a batch is 10.3 ticks and one tick is under 10 percent. `growth` uses `timed = cost ? TIMED_MS : CPU_TIMED_MS` for the sizing loop, the growth step and the batch length; `cpuPerCall` stops at `CPU_TIMED_MS`. A caller's cost keeps `TIMED_MS`. `NOISE_MS`, the minimum of five and the bound of 8 are unchanged. Red then green: the linear case now also asserts `small >= 120` (three quarters of 160 ms); it failed before the harness edit and passes after. Not measured on Windows (reasoning from the documented tick).
2. **Run time (MEDIUM).** The waiting case now waits only at the larger input (64), for 1.5 times the wall time its own spin just took (`performance.now()` around the spin), where it waited 128 ms and 2048 ms. A scratch script read the case with a wall-clock cost three times: 10.2, 10.2 and 10.3 times as long (small 57 to 60 ms, big 585 to 613 ms), and with the default cost 4.1 to 4.3 (small 171 ms, big 704 to 728 ms). So the wall clock reads over 8 and the processor about 4: the case still proves that waiting is not counted. Run time: see the measurements below; this is a documented choice, see Decisions.
3. **Cap (LOW).** `MAX_CALLS = 8000` is one explicit cap, used by `cpuPerCall` (`times = Math.min(times * 4, MAX_CALLS)`: 1, 4, 16, 64, 256, 1024, 4096, 8000) and by `growth`'s batch length (a caller's cost already stopped at 40 / 0.02 = 2000, unchanged). The doc comments say "at most MAX_CALLS"; the old "at most 2000" text is gone (the line in the record above is corrected).
4. **Asynchronous call (LOW).** `cpuBatch` throws "the default cost times a synchronous call; this call returned a promise (asynchronous), so pass a cost that awaits it" when a call returns a thenable; the `growth` doc says so. New controls case "refuses an asynchronous call": red before (the call was timed up to its first await, no rejection: test failed), green after (it rejects at the warm-up, 60 to 80 ms).
5. **Controls header (LOW).** Its title, the paragraph on the helper's four cases, and RUN TIME and WORST CASE now cover the helper cases (the old header said two cases and 12.7 s).
A defect in my own control found on the way: the control's `spin` computed `i * 31`, which passes 2^31 above 69 million steps; V8 then leaves small-integer arithmetic and runs about 3.5 times slower per step, so the linear control read 13.5 times as long at its 131-million-step larger input (run 24 s). Not a defect of the helper. `spin` now keeps every product under 2^31 (`s * 31 + i`), the linear control starts at 8192 and the quadratic at 512 with its limit at 512 (so that sizing does not climb through many batches of 160 ms); readings since: linear 4.2 to 4.5.
**Measurements (2026-10-18; load average at the start in brackets, other sessions' runs always present).**
- Controls file, wall clock of `node --test` on the whole file: before this round 31.8 s [38.8] (helper cases 18.4 s of it: 2.1, 3.8, 12.5 and the first two scan cases 13.3); after 47.6 s [47.6], 51.5 s [115], 46.5 s [71.5]. Helper cases alone after: linear 7.2 to 8.6 s, quadratic 14.6 to 18.1 s, waiting 10.6 to 11.4 s, asynchronous 0.06 to 0.08 s (33.8 to 38.1 s together). **The file got longer, not shorter**: fix 1 made every batch four times as long, and a quadratic reader costs at least 5 runs * 16 * 160 ms = 12.8 s at the bound; the waiting case alone went from a computed 45 s (not run: four calls of 2.2 s, five times) to 11 s. The CTO Chief's ruling (the slice's two new files add at most 15 s, and neither is the longest file) cannot hold with fix 1 and these cases both in place; a gate run will show it. This is for the CTO Chief; see Decisions.
- `node --test` on the six hotfix-check files that use the harness (`hotfix-check-copy-and-log`, `-guards`, `-readers`, `hotfix-check`, `-test-run`, `-review-findings`) and the slice's three (`reachability-surface-scan-is-linear`, the real-scan file, the controls file), one file at a time: 141 tests, 141 pass, 0 failed, 0 skipped. Durations: 12.9, 25.1, 14.7, 13.0, 18.3, 37.3, 0.65, 12.9 and 47.6 s. `npx eslint --max-warnings 0` on the harness and the controls file: clean.
- The two files that use the default cost, `hotfix-check-review-findings` and `hotfix-check-guards`, three times each with 36 busy-loop processes on 18 cores (load average 41, 107 and 120 at the start; no load process left after any run, checked with `ps`); 18 and 27 tests, 0 failed, 0 skipped in all six runs. The finding-2c cases and round 9 (default cost, 160 ms batches): short declarations / one long declaration 4.8 / 5.2, 4.9 / 5.2, 5.1 / 5.3; path 3.9, 3.9, 3.9. The blank-lines case passes its own cost and keeps 40 ms: 4.8, 4.6, 4.8. Wall clock of each file: review-findings 54, 53 and 57 s; guards 52, 66 and 54 s (alone and unloaded: 37.3 and 25.1 s).
- Windows: the arithmetic above is reasoning; this was not run on Windows.

### Batch length per platform (2026-10-18)
CTO Chief ruling, 2026-10-18. `CPU_TIMED_MS = 160` was set for Windows, whose processor clock ticks at about 15.6 ms, and applied on every platform; the slice's controls file took about 46 s alone (helper cases 7, 15 and 10.9 s, about 33 s together) while the whole suite takes about 54 s. The CTO Chief measured on this Mac that `process.cpuUsage()` advances in 1-microsecond steps (a 200-ms probe saw steps of 1, 2, 3 ... microseconds); on Linux, user plus system time comes from the scheduler's nanosecond runtime (believed, not measured here).
Change: `CPU_TIMED_MS = process.platform === 'win32' ? 160 : 40` in `tests/helpers/hotfix-check-harness.js`, with the tick arithmetic for both cases in its comment (Windows: 160 ms is 10.3 ticks, one tick under 10 percent; elsewhere a 40-ms batch is read to within about 0.0025 percent); two doc comments that said 160 ms now say where. In the controls file the linear control's `small >= 120` became `small >= (win32 ? 120 : 30)` (three quarters of the batch length), still an exact assertion on each platform, none skipped; its header text says the batch length is per platform. `MAX_CALLS`, the minimum of five, `NOISE_MS`, the bound of 8, the refusal of a promise and the other controls' assertions are unchanged. Not run on Windows (assumed from the documented tick).
**CTO Chief's measurements, whole suite, three alternating runs:** with the slice's two new files 56.6, 52.8 and 53.6 s; without them 45.2, 46.4 and 66.1 s; paired differences +11.4, +6.4 and -12.5 s; median +6.4 s.
**Per-case durations, before the change (160 ms everywhere, CTO Chief):** the three helper cases 7, 15 and 10.9 s, about 33 s together; the controls file alone about 46 s.
**Per-case durations, after (this Mac, `node --test --test-reporter=spec`, the controls file and the real-scan file):** passes a linear reader 1.67 s; fails a quadratic reader 5.25 s; does not count waiting 3.49 s; refuses an asynchronous call 0.06 s; the helper describe 10.48 s. The two scan cases 8.22 s and 5.25 s (describe 13.47 s). Real-scan file: 1 case, 12.12 s. File totals, one file at a time: controls file 27.4 s (23.99 s for the controls and real files run together), real-scan file 12.5 s, `reachability-surface-scan-is-linear` 0.45 s. The helper cases fell from about 33 s to 10.5 s.
**Verification.** `node --test` on the six hotfix-check files that use the harness and the slice's three, one file at a time: 29, 27, 16, 28, 13, 18, 3, 1 and 6 tests (141), all pass, 0 skipped; durations 12.6, 17.2, 15.4, 13.6, 16.7, 16.0, 0.45, 12.5 and 27.4 s. `npx eslint --max-warnings 0` on the two JavaScript files: clean. Three runs of the two default-cost files (`hotfix-check-review-findings`, 18 tests; `hotfix-check-guards`, 27 tests) with 36 busy-loop processes (load average 53 to 65 at the start; 0 skipped, 0 failed in all six runs), ratios (blank lines, which has its own cost / short declarations / one long declaration; path): run 1 4.6 / 6.1 / 5.4; 3.5. Run 2 4.8 / 6.1 / 5.2; 3.3. Run 3 4.5 / 5.3 / 5.4; 3.4. All under 8 (largest 6.1). Wall clock of the files under load: review-findings 39, 39 and 39 s; guards 42, 45 and 44 s. No load process was left (`pgrep` found none after the runs). One earlier attempt had a script error (a shell word-split left its busy loops running); it was stopped, its load processes were killed, and its readings were discarded and rerun.

### Step 12: the loaded suite run (2026-10-18)
Made on the CTO Chief's ruling "make the run" (not the before-run). Command: `node --test tests/*.test.js` (not `npm test`), 584 files, in the main checkout. Load: the slice's own `load.js` was deleted with `<scratch>` at Step 16 and `tests/helpers/` holds no load generator, so the `fresh-4x` kind (the most contended one, Step 9: contention 7.6 to 8.0) was rebuilt from its definition in the plan (Step 9, "Load for Step 9") in the CTO Chief's scratchpad: 72 workers (4 x 18 cores), each starting busy children of 150 to 600 ms back to back with `spawnSync`. It was started, given 20 s to build up, the suite run, then stopped; `ps` afterwards shows no worker. No meter and no marks preload were used, so the load started before the suite, not at the new files' first child, and contention and CPU inflation were not measured (not measured). No other CTOC test run was seen at the start.
- Load average (1, 5, 15 minutes): 31.2, 16.8, 30.0 at the suite's start; 116.4, 67.8, 49.2 at its end; 101.6 to 127.8 in the new files' diagnostic lines.
- Suite: wall-clock 173 s (`duration_ms` 172425), under push's 300 s and the completion's 900 s. 13667 tests, 13664 passed, **3 failed**, 0 cancelled, 0 skipped. Exit status 1.
- The three failures, all other work's wall-clock-ratio timing tests, none in this slice's files: `tests/hotfix-check-corpus.test.js:733` "the whole-file scanners stay linear on input built against them" (src/styles/urls.css: size 2048 took 26.3 ms, size 8192 took 230.0 ms, 8.7 times as long); `tests/quality-agent-coverage.test.js:1166` "a passing run with a long blank stretch is read in linear time" (512 KB took 35.9 ms, 2048 KB took 657.6 ms); `tests/quality-agent-coverage.test.js:1186` "a long run of digits ... skipped and passed fallbacks" (the skipped fallback: 512 thousand digits took 111.8 ms, 2048 thousand took 1471.6 ms). Findings for the owner; not this slice's to fix.
- The new files inside the loaded suite: all cases passed. Real scan exponent 1.01 (smallest 69.6, 138.2, 557.0, 1145.8 ms; load average 124.5; case 112.6 s); sensitivity scan 1.49 and quadratic scan 1.95 (bound 1.25; load average 127.8 and 124.5; the controls describe 113.0 s). Every diagnostic held stop rules 1 to 3.
- The two files alone under the same load, run right after the suite: real-scan file 84 s, exponent 1.00, load average 101.6, 1 test passed; controls file 146 s, 6 tests passed, exponents 1.49 (sensitivity) and 1.96 (quadratic), load average 98.7 and 99.1. Both under the 20-minute worst case of their headers.
- Headers: the "was not measured" sentences in the real-scan and controls files were replaced (comment only) with the per-file figures at concurrency 17 (controls 26.1 s, 7th; real-scan 14.8 s, 10th; longest hotfix-check-corpus 41.7 s) and the loaded figures above. `node --test` on the two files: 7 tests, 7 pass; `npx eslint --max-warnings 0` on them: exit 0.
- Ruling (the main session and the CTO Chief, 2026-10-18): the three failures are other work's wall-clock-ratio timing tests, none in this slice's files: `tests/hotfix-check-corpus.test.js:733` "the whole-file scanners stay linear on input built against them", and the two tests in `tests/quality-agent-coverage.test.js` from line 1166. This slice's own two files passed inside the loaded suite and alone. The Step 12 loaded-run box is a measurement box: it asks for the run, its figures, and the new files' diagnostics held to stop rules 1 to 3, all recorded above (173 s, under 300 s and 900 s); it does not ask that other work's tests pass. The three tests are handed to the new slice "the remaining wall-clock timing tests measure work", which converts them to the work-measuring method, test first, under the owner's rule of zero flaky tests. The Step 12 loaded-run box is ticked.

### Step 16: FINAL-REVIEW (2026-10-18)
Made by the executor on 2026-10-18 before the gate run; one line per box that was open. The CTO Chief's rulings of 2026-10-17 and 2026-10-18 apply: (a) probe 9 stands, (b) stop rule 8 is measured from the per-file durations of the gate's own run and a per-file run, not from a before-run that can no longer be made, (c) the two `npm test` boxes are ticked just before the completion's gate run, (d) the platform batch length. `<scratch>` stands for the slice's own scratch folder.

**Checks made today (nothing in the repository was changed by them).**
- `npm run lint` (`eslint . --max-warnings 0`): no output, exit 0. `npx eslint --max-warnings 0` on the kept file, the real-scan file, the controls file, the helper and `tests/helpers/hotfix-check-harness.js`: exit 0, no warning.
- `node --test` on 13 files: the kept file, the real-scan file, the controls file, the six consumers of the harness (`hotfix-check-copy-and-log`, `-readers`, `-test-run`, `-guards`, `-review-findings`, `hotfix-check`), `readme-numbers`, `false-green-fence`, `doc-counts` and `doc-counts-generated`. 232 tests, 232 pass, 0 fail, 0 cancelled, 0 skipped, duration 23.1 s, load average 4.8 to 5.4 on 18 cores while the scan cases ran. Diagnostic lines of that run: real scan fitted exponent 1.00 (smallest 63.9, 128.0, 510.6, 1012.9 ms), sensitivity scan 1.47, quadratic scan 1.97 (bound 1.25 each). `false-green-fence` passes now: other work lowered `maxFindings` to 205 in `.ctoc/false-green-baseline.json`, which is the failure the Step 10 record reported.
- Headers against the code: the 12 children of the real-scan file are 4 sizes by `RUNS_PER_SIZE` 3; the controls file's 24 are two injected cases by 12; the kill is `HARD_TIMEOUT_MS` 50000, so 12 * 50 s = 10 minutes and 24 * 50 s = 20 minutes; 50 s / 0.9 s = 55; the controls header's four helper cases are the four `it` blocks of its second describe; `{Step` and `{…}` occur in none of the four files; the search `gives? up|give up|gave up` finds no line. The real-scan and controls headers still say the time inside the whole suite "was not measured"; stop rule 8's per-file run (below) has since measured it (controls file 26.1 s, real-scan file 14.8 s). A comment only; left as written because the finish check refuses a change after its run and no assertion depends on it.
- The kept file: its lines 1-3 and 5-22 equal those of `git show 8e7798cf:` and its lines 46-107 equal that file's lines 178-239 byte for byte (`diff` empty); its line 4 is the new title.
- Bounds, checked explicitly: `MAX_EXPONENT` 1.25, `MAX_2MIB_CPU_MS` 3000, `HARD_TIMEOUT_MS` 50000, `RUNS_PER_SIZE` 3, `WARM_UP_SCANS` 16, `OTHER_EXECS_PER_SCAN` 4, `ROUND_ORDERS` [[1,3,0,2],[1,3,0,2],[2,0,3,1]] and the four sizes are the File Specifications' values. The helper and the real-scan file differ from the proven copies of Step 8 only inside header slots and the one 55-times comment; the controls file differs only in its header slots and the harness's four helper cases (granted 2026-10-18). A search of the four files for `retry|retries|\.skip|skip:|todo` finds only the regex-skip counter (`skipOthers`, `skipped`, which the controls assert) and the word "retries" in the kept file's old history paragraph; no retry, skip or early return was added.
- The test gate parses only line-start `# skipped N` and `ℹ skipped N` (`src/scripts/test-gate.js` line 99), `fail N` (line 122) and `all files | N` (line 158). Every diagnostic is one line made by `t.diagnostic` in the helper (line 366), beginning with its label ("real scan", "sensitivity scan" or "quadratic scan") and holding no newline; the program text with `'\n'` (helper line 234) is the child's source and is never printed. In the output of the run above, the lines that match the gate's `skipped` and `fail` patterns are exactly `ℹ fail 0` and `ℹ skipped 0`.
- Scope check (Step 9's baseline, read from `<scratch>/scope/`). `git status --porcelain=v1 --untracked-files=all`: 164 lines at Step 9, 171 now. Paths in the difference that belong to this build: the kept file (modified), the real-scan file, the controls file and the helper (new), `README.md` and `CLAUDE.md` (modified), and `tests/helpers/hotfix-check-harness.js` (modified, granted by the owner on 2026-10-18). Everything else is other work's, seen by its content: the plans of slices s10 to s25 moving between todo, in-progress, implementation and review and their approval records; the answered inbox records; `src/commands/start.md`, `src/lib/streaming-gate.js` and `tests/plans-keep-moving-without-the-human.test.js` (last changed on 2026-10-17 at 21:41 to 21:48 local time, earlier than this build's new files at 23:23; not edits of this build); and `.ctoc/false-green-baseline.json` (`maxFindings` 206 to 205 and the `src/scripts/release.js:silent-catch:atomicWriteFileSync` finding removed, changed on 2026-10-18 at 09:47 local time; not an edit of this build, whose declared files and edit log do not include it). `README.md` differs from its Step 9 copy only on line 1145 (582 to 584) and `CLAUDE.md` only on lines 61 and 94 (582 to 584). Ignored-path manifest, taken again (730 files against 729): six differences, all in paths of other work: `.ctoc/state/tasks.json` (the scheduler's), `.ctoc/state/verify/` records for slices s10, s11 and s23 (the completion route's, for plans now in review), `.ctoc/logs/cleanup.json` and `.ctoc/logs/task-registry.json` (the menu's: their last entries name slices s23 and s11), and no file under `coverage/` changed. The top-level listings of `node_modules/` (98) and `.claude/` are equal. No file the harness could have left (`load.js`, `meter.js`, `probe.js`, `marks.js`, `components.js`, `marks/`, `reach-linear-` folders) exists under any ignored path or in the system temporary folder. The scope check held.
- `<scratch>` (the slice's own folder inside the CTO Chief's scratchpad) was deleted after the scope check, and nothing else in the scratchpad. `ps` afterwards: no process of `load.js`, `meter.js`, `worker.js`, `marks.js`, `probe.js`, `probe9.js` or `standdown.js`, none with the scratch folder in its command line, and no `reach-linear-` folder in the temporary folder.
- Wall-clock record. Full `npm test` with coverage through the completion route, today, on the same suite these files belong to: the background-agent menu slice 68.7 s (pass, coverage 99.61%); the lockfile slice 68.0 s (pass, coverage 99.62%); a per-file run without coverage at the suite's concurrency of 17, 45.8 s in all. All are far under push's and the hotfix check's 300 s (`src/lib/quality-agent.js` line 178) and the completion's 900 s (`src/lib/step-13-verify.js` line 734). This slice's own gate run is the completion's, made after this record; the suite's files are the same plus the later edits of other slices.

**Boxes, one line each.**
- Security Review, no change under `src/`, `src/hooks/` or `.ctoc/`: ticked. The scope check lists no such path as this build's; the paths there are other work's (above); the two documents differ in their count numbers only.
- Security Review, five interpolated values: ticked. The helper's child program splices `JSON.stringify(REACH)`, `JSON.stringify(swap)`, `MiB`, `GC_MISSING_STATUS` and `WARM_UP_SCANS` (helper lines 186 to 223) and nothing else; the corpus folders and the number of scans are arguments (line 254); the spawn has an argument array, no `shell` option.
- Security Review, `RegExp.prototype.exec` replaced only in the injected children: ticked. The replacement is in `runnerProgram(swap)` (the child's text), used only when `swap` is not null, which only the controls file passes; the Step 13 pass (2026-10-17) read the same.
- Security Review, bounded injected work: ticked. The quadratic part is text.length squared over 1 MiB characters once per scan (at most 16 MiB at 4 MiB), every child has the 50-s kill, and the run of 2026-10-18 above finished the controls in 5.6 s per case.
- Security Review, hard kill, `maxBuffer`, corpora removed in `finally`: ticked. `timeout: HARD_TIMEOUT_MS`, `killSignal: 'SIGKILL'`, `maxBuffer: 64 * MiB` (helper lines 254 to 258); `fs.rmSync(root, ...)` over `made` in `finally` (line 360); no `reach-linear-` folder remains.
- Security Review, five exports, a literal relative `require`, no environment read: ticked. `module.exports` (line 374) holds `MAX_EXPONENT`, `SURFACE_CALL_SOURCE`, `INJECTED_SOURCE`, `measureScaling` and `machineLoad`; the two test files require it by the literal path `./helpers/<name>`; the helper contains no `process.env` and writes only its `mkdtemp` folders.
- Security Review, messages print sizes, counts, CPU figures and the load average only: ticked. The failure messages and the diagnostic line carry figures and names of sizes, never contents or an absolute path (checked in the variant rows below and in today's run).
- Security Review, the harness and its workers: ticked. Everything ran from `<scratch>` outside the repository; today `<scratch>` is deleted and `ps` shows no worker; the 44 batches of Step 9 ended or were killed, `ps` showing none after each (Step 9 record); the stand-down check ran before every batch and the one void batch is recorded.
- Security Review, probe 9 starts no process under `taskpolicy` or `nice`: ticked. A search of the harness tools for `taskpolicy` and `nice` found no match before the folder was deleted; probe 9 ran N = 18 ordinary-priority children per set with the 50-s kill.
- Security Review, the marks preload: ticked. `marks.js` acts only when `MARKS_FILE` is in the environment, which `load.js` sets for its own runs; it appends file names, process ids and times to that file and never a command line or content. It was used only through the harness's runs.
- Security Review, the Execution Record names no absolute path, home folder or user name: ticked. A search of the record and the rest of the plan after it for `/Users/`, `/private/`, `/home/` and the account name found no match (before this section was written; this section names none either).
- Acceptance, the file is split as the File Specifications say: ticked. Kept file lines 1-22 with the new title at line 4 and its new paragraph, its requires but `spawnSync`, and the two `SEMANTICS PRESERVED` describes byte for byte (lines 46-107 against old 178-239, `diff` empty); the helper holds the measure and every constant; the real-scan file holds the one real case under its old `describe` and case names; the controls file holds the two injected cases (and the granted helper cases). The names are 105, 115 and 119 characters.
- Acceptance, Step 8's variant table: ticked, with each row's load average (from the variant runs of Step 8; load average on 18 cores at the start of each file's run). control row, three runs: all three cases pass each time, exponents 1.02, 1.01, 1.00 / 1.46, 1.49, 1.49 / 1.95, 1.96, 1.95, medians 1.49 and 1.95, longest injected child 1.53 s, load 19 to 24. zero-figure: all three cases fail at the 512 KiB child, "printed no positive CPU_US figure", load 13.1. no-gc: all three fail on status 20, load 13.1. missed-swap (window 126): real-scan passes at 0.99, both injected cases fail "swapped the call regex 0 times in 8 scans", load 12.2. constant-figure: real-scan passes at 1.00, sensitivity and quadratic fail at 1.00 with their messages, load 11.4 and 10.5. raised-bound 1.6: real-scan 1.00 passes, sensitivity fails at 1.49 against 1.6, quadratic passes at 1.94, load 24.1 and 22.6; raised-bound 2.2: real-scan passes, sensitivity fails at 1.46 and quadratic at 1.97, load 19.3 and 17.0. skips-run: both injected cases pass at 1.49 and 1.94, 24 of 24 children print MATCHED=0, exactly four distinct skipped sources, load 14.7. allowed-slowdown (window 255): real-scan passes at 0.99, load 11.4. slow-linear (window 1023): real-scan fails on the 3000-ms bound, "a 2-MiB scan used 3626.5 ms of CPU time", load 9.3. catastrophic: real-scan fails at its first child, killed at the 50000-ms ceiling, load 7.8. Both scratch files were written back and compared by sha256 after every row.
- Acceptance, Step 9 recorded while the repository's test files were still as committed: N/A (the box demands the ambient `npm test` of that moment, which can no longer be made). Everything else the box names is in the record above: probe 9 (R = 1.064, three sets, none void), the reproduction (no run counted, stop rule 7 recorded as "cause supported by the code, not reproduced"), the mechanism table, 72 runs of the three cases in all conditions, the 44 batches and the one void batch, and stop rules 1 to 3, 5 and 6.
- Acceptance, no bound, ceiling, size, count or sample number changed to make a run pass: ticked. Explicit comparison above; the only constants that moved are the ones the plan itself widened (the 2-MiB bound averages two scans; the kill ceiling went from 25 s to 50 s) and the harness's batch length (an owner grant and a CTO Chief ruling, not a bound of these cases). The two `SEMANTICS PRESERVED` describes are byte-identical to 8e7798cf.
- Acceptance, each case prints one diagnostic line, none beginning with a word the gate parses: ticked. See the gate parsers' check above: one `t.diagnostic` per measured case, beginning with its label; the only lines matching the gate's patterns are the real summary's `fail 0` and `skipped 0`.
- Acceptance, the four headers: ticked. Verified above against the code; no `{Step` or `{…}` slot remains; the helper header states what is timed and what is not seen with 0.293, 1.17, 0.59, 1.6 and 0.71; the real-scan file's "WHY A CHILD PROCESS" ends with the 55-times sentence; no header says the check gives anything up.
- Acceptance, the scope check of Step 16 held: ticked. Result above; `<scratch>` was deleted afterwards and `ps` showed no worker.
- Step 9, name the ignored paths this build's commands may change: N/A (replaced by CTO Chief ruling (b) of 2026-10-18; the before-run can no longer be made). The path list is written in the box; the part that names the paths that Step 9's first `npm test` changed needs that run.
- Step 9, the first `npm test` at ambient load: N/A (replaced by CTO Chief ruling (b) of 2026-10-18; the before-run can no longer be made).
- Step 10, `npm run lint`: ticked. Run today, no error, no warning (above).
- Step 10, the affected test files: ticked. 232 tests, 0 failed (above), with the three diagnostic lines.
- Step 12, three ambient `npm test` runs against Step 9's run: N/A (replaced by CTO Chief ruling (b) of 2026-10-18; the before-run can no longer be made). Stop rule 8 held as ruled (see "Stop rule 8 as ruled").
- Step 12, the loaded `npm test` run: NOT settled. Left unticked. It asks for a suite run under a batch of synthetic load, started so the new files' cases run under it; it is not the before-run, and this executor may not run `npm test`. For the CTO Chief to rule on (make the run, or rule it N/A like the three ambient runs).
- Step 14, the wall-clock record against 300 s and 900 s: ticked. See the wall-clock record above.
- Step 14, delete `<scratch>` but for `<scratch>/scope/`: ticked. Done after the scope check by deleting the whole folder, which includes the scope folder, as Step 16 asks.
- Step 16, the scope check: ticked. Result above.
- Step 16, delete `<scratch>` and confirm with `ps`: ticked. Done and confirmed above.
- Step 16, every acceptance box checked against the record: left unticked, because the loaded suite run of Step 12 is not settled.
- Update, later on 2026-10-18: the loaded suite run was made (record "Step 12: the loaded suite run"). The suite failed under load with 3 failures in other work's timing tests, so the Step 12 loaded-run box and the Step 16 "every acceptance box is checked" box both stay unticked.
- Settled, 2026-10-18: every acceptance box is now settled (the Step 12 loaded-run box was ticked on the ruling recorded in Decisions), so the Step 16 "every acceptance box is checked" box is ticked.

## Decisions Taken Under Ambiguity

Decided by the recommended option when this plan moved on; none of these needed the human.

- For the build: the owner's answers are in .ctoc/streaming/answers.jsonl under question ids q10- and q11- of revision r1792058299498, and any load window he typed is in .ctoc/streaming/comments.jsonl. — Noted (question q98-critique-coverage-r1792058299498)
- Lens verdict: APPROVE — each finding of the three review rounds, received as topic names only, has a closing decision in the plan; the build waits on the owner's two answers. Advisory only. — Approve …s26-the-linear-scan-test-holds-under-load for building (question q99-gate-ruling-r1792058299498)
- Build, 2026-10-17: the brief outranks the steps where they differ. It forbids `npm test`, so Step 9's ambient suite run, Step 12's suite runs, stop rule 8 and Step 14 were not run, and lint was run as `npx eslint --max-warnings 0` on the touched files. Those boxes stay unchecked and the Execution Record lists them. The comparison that stop rule 8 needs also has no "before" baseline now, because the new files are in place; a later suite run can only be compared with the old file's time in the scratch copy.
- Build: probe 9's first three set attempts, made within about a second, all saw one persistent CTOC test run of another worktree. They are counted as one sighting, not three windows, because the plan's three-in-a-row stop exists to show that the machine had no free window, and a free window showed after several minutes of ambient runs; probe 9 then ran in full, with no void set. The Execution Record states the three attempts.
- Build: the ambient meter does not run when another test run is visible (it stops, as the plan says), and one was visible nearly all the time. The CPU-inflation reference for every batch is therefore the smallest ambient 4-MiB real-scan sample (929.3 ms), and the 0.9 s of wall-clock time per 4-MiB child in the real-scan header comes from the mechanism probe's ambient children. Both are stated in the record.
- Build: the real-scan header's "about 1.4 s of CPU time" and "about 33 times" are the plan's text for the machine of 2026-10-12 and stay as written outside the slots. On this machine a 4-MiB child costs about 1 s of CPU time, so the correction is inside the wall-clock slot ("about 0.9 s (...; on that machine a 4-MiB child uses about 1 s of CPU time, not the 1.4 s measured on 2026-10-12)"). No constant or bound changed.
- Build: no run counted under stop rule 7, so the header's reproduction slot reads "The cause is supported by the code, not reproduced", with the most contended batch's contention and inflation, as the slot allows.
- Build: the mechanism probe ran under one fresh-4x batch (the most contended, since no batch reproduced the failure) and at ambient load.
- Build: the scratch copy is the whole working tree without `.git`, `node_modules` and `.claude` (about 80 MB), as the Test Plan says, in a folder under the session's scratchpad, which `<scratch>` stands for. The CTO Chief's brief named no other.
- Build: a short busy-child worker cannot handle a signal while it sits in `spawnSync`, so the harness's workers write their counters to a file after every cycle; the first two batches lost their counters before that fix (stated in the record).
- Build: `tests/false-green-fence.test.js` fails at "LOWER THE BASELINE" for a reason unrelated to this slice (the live count 205 against `maxFindings` 206, from changes to `src/scripts/release.js` and `src/hooks/PostToolUse.status-check.js`); `.ctoc/false-green-baseline.json` is outside this plan's files, so the failure is reported for the owner and not fixed here.
- Build: `tests/helpers/hotfix-check-harness.js` was not changed: its scope request (inbox question 1792265363409-6ya9r1) was still open at the start and the end of this build.
- CTO Chief ruling, probe 9: the evidence stands. The stop rule keeps R from being measured against a competing test run and stops the build when no clean window exists; each of the three sets that fed R passed a fresh stand-down check just before it started, and the three void attempts were back-to-back retries counted as one sighting. The deviation is in process, not in the evidence.
- CTO Chief ruling, stop rule 8: not measured as written, because Step 9's ambient "before" run was never made and ambient load cannot be had here. The gate's own `npm test` run (Step 14) records each new file's duration and the kept file's; the rule's intent holds if the two new files' durations less the time the trim removed from the kept file add at most 15 s and neither new file is the longest of that run. If either fails, a before-and-after measurement is owed. The Step 12 stop-rule-8 box stays open until then.
- Build fix round, 2026-10-17: this supersedes the earlier Decision that left "about 1.4 s" and "about 33 times" as written. The real-scan header now gives the 2026-10-17 figures (about 1 s of CPU time, 0.9 s of wall-clock time, about 55 times to the kill) with the arithmetic once, and the helper says 55 times. Comments only; no assertion or constant changed.
- Build fix round, 2026-10-18: the waiting control waits only at the larger input, for 1.5 times its own measured spin, where the review proposed a wait near the spin cost at both sizes. A wait of 0.75 times the spin at both sizes with a quadratic growth costs about 16 spins per call at the larger size (about 16 s for the case); this form costs about 10 spins (about 11 s) and reads 10.2 times as long on the wall clock, over the bound of 8 by the same margin. No assertion was weakened; the case still reads about 4 on the processor.
- Build fix round, 2026-10-18: the controls' starting sizes moved (linear 8192, quadratic 512 with its limit at 512) so that sizing does not climb through many batches of 160 ms; the bound of 8, `NOISE_MS` and the minimum of five did not change, and the helper's size-growth rule did not change.
- Build fix round, 2026-10-18, a conflict left open for the CTO Chief: review fix 1 (batches of 160 ms on the default cost) and the ruling that the slice's two files add at most 15 s cannot both hold; the controls file now runs 46 to 52 s, 14 to 18 s of it the quadratic control, which cannot be shorter than 12.8 s at this batch. Nothing was cut or loosened to meet the ruling. The options for the owner or the CTO Chief are to accept the longer file, or to move the three helper cases to a file of their own (a new file needs its own scope).
- CTO Chief ruling, 2026-10-18: the Step 14 `npm test` box and the acceptance `npm test` box are ticked immediately before the completion's gate run, because that run is the run those boxes name; the Step 12 stop-rule-8 box stays open for the gate run's per-file durations.
- CTO Chief ruling, 2026-10-18: the default cost's batch length depends on the platform, `process.platform === 'win32' ? 160 : 40` ms, because 160 ms was set for the 15.6-ms clock of Windows and cost every platform about 33 s for the three helper cases (the controls file about 46 s of a 54-s suite); `process.cpuUsage()` advances in microseconds on this Mac (measured) and in scheduler nanoseconds on Linux (believed). This supersedes the fix round's 160 ms on every platform and the open conflict left for the CTO Chief in the Decision above. The linear control's floor is platform-aware in the same way (120 ms on Windows, 30 ms elsewhere, three quarters of the batch), exact on each platform. MAX_CALLS, the minimum of five, NOISE_MS, the bound of 8 and the refusal of a promise are unchanged.
- CTO Chief and main session ruling, 2026-10-18: the Step 12 loaded-run box is settled and ticked. The loaded suite's three failures (`tests/hotfix-check-corpus.test.js:733` and two tests in `tests/quality-agent-coverage.test.js` from about line 1166) are other work's wall-clock-ratio timing tests, none in this slice's files; this slice's two files passed inside the loaded suite and alone. The box asks for the run, its figures and the new files' diagnostics held to stop rules 1 to 3, not that other work's tests pass; the suite took 173 s, under 300 s and 900 s. The three tests are handed to the new slice "the remaining wall-clock timing tests measure work", which converts them to the work-measuring method, test first, under the owner's rule of zero flaky tests.
