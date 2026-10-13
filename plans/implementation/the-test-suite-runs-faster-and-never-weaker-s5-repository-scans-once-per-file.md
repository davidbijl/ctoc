---
title: "Whole-repository scans computed once per file"
type: implementation
created: 2026-10-13
priority: high
effort: small
parent_plan: the-test-suite-runs-faster-and-never-weaker
depends_on: the-test-suite-runs-faster-and-never-weaker-s4-hooks-called-in-process
files:
  # THE SLICE'S OWN FILES — the work surface. Test setup only: no file under src/ changes, and
  # no counted artifact is created, so no count file is declared.
  - tests/export-reachability.test.js
  - tests/unexecutable-instruction-fence.test.js
---

# Whole-repository scans computed once per file

Slice 5 of `plans/functional/the-test-suite-runs-faster-and-never-weaker.md`: acceptance
criteria 1, 2, 34, 35 and 36 of that plan, its section "What 'never weaker' means, checkably"
(a changed test keeps or tightens what it asserts), and the research brief's principle 5
(`plans/vision/deepthink/fast-hermetic-node-test-suites.md` lines 134-137: compute a
whole-repository scan once in a `before()` inside the `describe` and share it read-only).

Every statement about this repository below was read from the file and line named. Every
duration is a number another run recorded, named with its file in the build's scratch folder
(called `SCRATCH` below: the folder `test-speed-build` the CTO Chief gives the builder); none was
measured while planning. The planner held read, write, edit, search and list tools only and ran
nothing.

## Problem statement

Some test files call the same scan of the same, unchanged repository several times, once per
case, and every call computes the same answer. The functional plan's profile counted "11 files,
53 s processor time" for such repeats and estimated a saving of 15 to 25 s (functional plan
lines 39 and 42); it did not name the files (line 368).

By reading, six test files repeat a scan of the unchanged repository inside one file (the
census below). The work those repeats cost is much smaller than the profile's estimate: about
3.6 s in all, by the runner's own per-test durations in slice 2's whole-suite run, and about 7.9 s
in slice 1's before-run, which ran at a much higher load. Most of the profile's 53 s is scans that
already run once per file (`tests/lint.test.js` 7.19 s and `tests/typecheck.test.js` 2.42 s in
slice 2's run; the profile put lint alone at 14 s of processor time, the CTO Chief's brief) and the two files another round owns (`tests/iron-loop-enforcer.test.js` 7.44 s,
`tests/reachability-surface-scan-is-linear.test.js` 5.91 s), none of which this slice may change
(`SCRATCH/s2-suite-after.per-file`).

The CTO Chief's rule for this slice: a file whose conversion saves under one second of processor
time is left out, with its number. The recorded wall-clock durations make two files the
candidates (about one second in both recorded runs) and leave four out; the set actually
converted is decided by the processor-time measurement at Step 9, a go or no-go per file (section
"The per-file measurement at the start", functional criterion 34).

## Technical approach

### How the census was made

- Every test file named in the brief was read: the lint, typecheck, reachability and
  export-reachability tests, and the fences (unexecutable instruction, gate numbers, say the
  moment, false green, the stale scan, claims, skip guard, skip visibility).
- To find others, a search of `tests/` for `require('../src/lib/` of each whole-repository scan
  module (`reachability`, `unexecutable-instruction-scan`, `false-green-scan`,
  `golden-corpus-scan`, `human-facing-scan`, `instruction-gate-words-scan`, `agent-honesty-scan`,
  `corpus-claims`, `doc-counts`, `documented-counts`, `claim-extractor`, `stale-detector`) listed
  35 files, and a search of `tests/` for `checkAllInvariants\(` listed 8. A file whose whole run
  took under one second in Run A (below) cannot save one second, so those were not read further;
  every match that took one second or more was read for its calls with the repository's root. A
  match shows where a name is written, not that it runs, so the durations below come from the
  runner's own output of real runs.
- The same reading was done for every other test file that took one second or more in Run A
  (`SCRATCH/s2-suite-after.per-file`, file lines with four or more digits of milliseconds) and is
  not a hotfix-check, hook or registry file. None repeats a scan of the repository beyond the six
  below: for example `tests/stale-detector-coverage.test.js`, `tests/ledger-forgery-closed.test.js`
  and `tests/plan-work-already-landed.test.js` scan only sandbox projects
  (`tests/stale-detector-coverage.test.js` lines 411, 422, 658, 682, 712;
  `tests/ledger-forgery-closed.test.js` line 659).
- Two recorded whole-suite runs give each case's duration (the spec reporter's output):
  - **Run A**: slice 2's after-run, `SCRATCH/s2-suite-after.spec`, commit `08f9718c`, load 18.8
    at start and 22.7 at end, 18 cores, Node v24.14.1 (`SCRATCH/s2-suite-after.meta`).
  - **Run B**: slice 1's before-run, `SCRATCH/suite-before.spec`, commit `bdeb68af`, load 16.8
    at start and 65 at end (`SCRATCH/suite-before.meta`).
  These are wall-clock durations of each case inside a loaded run, not processor time. With the
  load near or above the core count, Run A is the closer of the two to the processor time the
  removed calls cost; Run B shows how much the same work grows under heavy load.

### The census: which files repeat a scan of the unchanged repository

"Removable" counts the calls that sharing removes (all calls with this repository's root, minus
the one that stays). The saving is the sum of the per-case durations of the cases whose call is
removed, Run A / Run B, in seconds. The verdict column is the planning estimate: "candidate"
files are converted only if they pass the Step 9 go or no-go; "left out" files are measured too,
and one that reaches the bar is reported, not added.

| File | Scan (module, line) | Calls with this repository's root, by line | Same unchanged repository in every call? | Removable | Saving, Run A / Run B | Verdict |
|---|---|---|---|---|---|---|
| `tests/export-reachability.test.js` | `analyzeExports` (`src/lib/reachability.js` line 793) | 3: line 36 (the first describe's body, run at load), 424, 452 | yes: no case writes into the repository; its 11 other calls analyse temporary projects (lines 85, 186, 215, 236, 257, 279, 326, 348, 368, 393, 412) | 2 | 1.03 / 2.13 (cases at spec lines 6915-6916 in both runs: 539.9 and 491.6 ms; 1166.3 and 967.1 ms) | **candidate** |
| `tests/unexecutable-instruction-fence.test.js` | `scan` (`src/lib/unexecutable-instruction-scan.js` line 567) | 10: lines 67, 108, 120, 152, 157, 181 (the describe's body, run at load), 267, 285, 290, 320 | yes: every write goes under the file's own temporary folder (lines 48, 53-58, 247-248, 258-263, 305-312) | 9 | 0.99 / 1.65 (cases 1, 6, 8, 10, 11, 20, 22, 23 and 25: Run A spec lines 18200-18224, Run B 18185-18209) | **candidate** |
| `tests/golden-corpus-fence.test.js` | `scanGoldenCorpus` (`src/lib/golden-corpus-scan.js`) | 7 with no options: 192, 263, 322, 343, 353, 374, 421 (lines 183, 403, 411 and 433 pass other inputs) | yes | 6 | about 0.77 / about 1.8 (Run A 7527-7545; the call at 421 shares its case with a production walk, so its part is estimated at 0.12 s) | left out: under one second in Run A |
| `tests/false-green-fence.test.js` | `scanFalseGreen` (`src/lib/false-green-scan.js`) | 7: 157, 200, 213, 226, 245, 256, 281 | yes | 6 | 0.58 / 1.82 (Run A 6933-6946) | left out: under one second in Run A |
| `tests/reachability.test.js` | `analyze` (`src/lib/reachability.js` line 476) | 2: 138 (describe body), 483 | yes: fixture projects are written under the system temporary folder (lines 83-97) | 1 | 0.14 / 0.29 (Run A 13488, Run B 13507) | left out |
| `tests/claim-census.test.js` | `censusCorpus` (`src/lib/claim-extractor.js`) | 3: 406, 425, 468 | yes: fixtures under the system temporary folder (lines 52-59) | 2 | about 0.08 / at most 0.25 (spec lines 1961-1963 in both runs) | left out |

Files read that scan the repository once per file, so there is nothing to share:

- `tests/lint.test.js`: one eslint run (line 37). `tests/typecheck.test.js`: one tsc run (line 63).
- `tests/gate-numbers-fence.test.js`: `scanRegistry` (line 458) and `findUnregisteredScreens`
  (line 472) once each; the calls at lines 421, 424 and 663 run with the parser forced unavailable,
  a different input.
- `tests/instruction-surfaces-say-the-moment.test.js`: `scanInstructionSurfaces` once (line 60),
  the enforcer's check once (line 203); 84 ms for the whole file in Run A.
- `tests/skip-visibility.test.js`: already scans once per file (`scanCorpus`, a memo, lines
  228-249). `tests/skip-guard-integrity.test.js`: 88 ms for the whole file in Run A.
- `tests/agent-honest-status-fence.test.js`: `fragmentIsSubstantive` (line 74), `censusAgents`
  (line 167) and the fence (line 227) once each, three different functions.
- `tests/session-start-question-dispatch.test.js`: `analyze` (line 224) and `analyzeExports`
  (line 238) once each. `analyzeExports` runs `analyze` again inside itself
  (`src/lib/reachability.js` line 794), so the file graph is built twice; sharing it would need
  `analyzeExports` to accept a graph already built, a change under `src/`. It is also a
  session-start hook test, slice 4's area.

Excluded by the owner and not touched: `tests/iron-loop-enforcer.test.js` and
`tests/reachability-surface-scan-is-linear.test.js`.

### Where the shared scan lives, and why one `before` hook

- **`tests/unexecutable-instruction-fence.test.js`** has one describe (line 65) holding every
  case. One `before` hook at the top of that describe computes the scan once, freezes it, and
  every case that reads the real repository reads the shared value.
- **`tests/export-reachability.test.js`** reads the real repository from two describes: the first
  (line 35) and the third (line 299, its cases at lines 420 and 441). One `before` hook, in the
  first describe, takes the result from a small function that computes the scan at its first call
  in the process and returns the same frozen result after that. The third describe's two cases
  call that function. If a name filter runs only the third describe and the first describe's hook
  does not run, the first case that calls the function computes the scan; the file still scans
  once.
- Not chosen: a `before` at the top level with no describe around it (whether it runs once per
  file is unverified, research brief line 154); a new describe wrapping the existing ones (it would
  change the nesting path of every test name, which criterion 35 compares).

### The frozen result: `deepFreeze`, the same text in both files

A scan result is a fresh object the test owns: `analyzeExports` returns numbers and sorted string
arrays built in the call (`src/lib/reachability.js` lines 877-891); `scan` returns a findings array
of fresh object literals and a `scanned` object (`src/lib/unexecutable-instruction-scan.js` lines
574-582), and a finding's `grant` is a fresh array (line 159), shared by the findings of one agent
file. Neither module keeps state between calls or reads the clock or the environment (a search of
both files for `Date.now`, `new Date`, `Math.random`, `process.env`, module-level `let` and `cache`
found nothing), so every call with the same unchanged repository returns an equal value.

Freezing in place is safe because no case writes into either result, by reading every case: no
`sort`, `push`, `splice` or assignment on a shared array or object; the only `sort()` (unexecutable
case 4, line 96) sorts a new array made by `map` from a fixture scan.

Word for word, in both files:

```js
/**
 * Freeze a value and every object and array inside it, so a case that writes to a shared
 * scan result throws instead of changing what the next case reads. A Map or a Set cannot be
 * frozen this way, so meeting one fails loudly instead of leaving part of the result writable.
 * @param {*} value
 * @param {WeakSet<object>} [seen] - containers already frozen in this walk
 * @returns {*} the same value, frozen at every level
 */
function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  if (value instanceof Map || value instanceof Set) {
    throw new TypeError('deepFreeze: a shared scan result holds a Map or a Set, which cannot be frozen');
  }
  seen.add(value);
  for (const inner of Object.values(value)) deepFreeze(inner, seen);
  return Object.freeze(value);
}
```

Both files start with `'use strict';` (export-reachability line 1, unexecutable line 25), so an
assignment to a frozen property throws a `TypeError`, and `push` on a frozen array throws in any
mode.

### File 1: `tests/export-reachability.test.js`

Made only if this file passes the Step 9 go or no-go; otherwise the file is not touched. Four
edits; no other line changes. No assertion call changes.

1. Line 24, the import.

   Before:
   ```js
   const { describe, it } = require('node:test');
   ```
   After:
   ```js
   const { describe, it, before } = require('node:test');
   ```

2. After line 33 (`const BASELINE_FILE = …`), insert a blank line, `deepFreeze` (above), a blank
   line, and:
   ```js
   let sharedScan;

   /**
    * The dead-export analysis of this repository, computed once per test file and shared,
    * frozen, by every case that judges the real repository. No case in this file changes the
    * repository; a case that builds its own project analyses that project itself.
    * @returns {ReturnType<typeof analyzeExports>} the frozen result
    */
   function scanOfThisRepository() {
     if (sharedScan === undefined) sharedScan = deepFreeze(analyzeExports(ROOT));
     return sharedScan;
   }
   ```

3. Lines 35-36, the first describe.

   Before:
   ```js
   describe('dead-export fence — exports reachable from live callers (RATCHET)', () => {
     const result = analyzeExports(ROOT);
   ```
   After:
   ```js
   describe('dead-export fence — exports reachable from live callers (RATCHET)', () => {
     let result;
     before(() => { result = scanOfThisRepository(); });
   ```
   Lines 37-38 (`baseline`, `allowed`) stay in the describe's body as they are: they read a small
   JSON file, not the repository.

4. Lines 424 and 452, the same text in two cases of the third describe ("THE REAL REPO: …" and
   "THE REAL-REPO RE-CATCH GUARD: …").

   Before, each:
   ```js
       const result = analyzeExports(ROOT);
   ```
   After, each:
   ```js
       const result = scanOfThisRepository();
   ```

After the edits, `analyzeExports(ROOT)` occurs exactly once in the file (inside
`scanOfThisRepository`), an exact presence check. The fixture cases keep their own calls on their
own temporary projects.

### File 2: `tests/unexecutable-instruction-fence.test.js`

Made only if this file passes the Step 9 go or no-go; otherwise the file is not touched.
`before` is already imported (line 27). The top-level `before` and `after` of the temporary folder
(lines 48-49) are unchanged. No assertion call changes.

1. After line 63 (the end of `agent()`), insert a blank line and `deepFreeze` (above).

2. Line 65, the start of the describe. Before:
   ```js
   describe('unexecutable-instruction fence', () => {
     it('1. non-vacuity: a scan that read nothing must fail loudly, not pass silently', () => {
   ```
   After:
   ```js
   describe('unexecutable-instruction fence', () => {
     // One scan of this repository for the whole file, shared and frozen: every case that
     // judges the real repository reads it. No case here changes the repository; a case that
     // scans a fixture root calls scan(...) on that root itself.
     let liveScan;
     let liveFindings;
     before(() => {
       liveScan = deepFreeze(scan(ROOT));
       liveFindings = liveScan.findings;
     });

     it('1. non-vacuity: a scan that read nothing must fail loudly, not pass silently', () => {
   ```

3. Line 181 is deleted (line 180, `const baseline = …`, stays):
   ```js
     const liveFindings = scan(ROOT).findings;
   ```
   Cases 13 to 16 keep reading `liveFindings` by that name (lines 188, 196, 201-204, 214), now set
   by the hook; their assertion text is unchanged.

4. Each remaining `scan(ROOT)` becomes the shared value:

   | Line | Before | After |
   |---|---|---|
   | 67 and 267 | `const { scanned } = scan(ROOT);` | `const { scanned } = liveScan;` |
   | 108 | `const found = scan(ROOT).findings.filter((f) => f.file === 'agents/iron-loop/iron-loop-integrator.md');` | `const found = liveScan.findings.filter((f) => f.file === 'agents/iron-loop/iron-loop-integrator.md');` |
   | 120 | `const found = scan(ROOT).findings.filter((f) => f.file === 'agents/planning/vision-advisor.md');` | `const found = liveScan.findings.filter((f) => f.file === 'agents/planning/vision-advisor.md');` |
   | 152 | `const realFound = scan(ROOT).findings.filter((f) => f.file === 'agents/planning/implementation-planner.md');` | `const realFound = liveScan.findings.filter((f) => f.file === 'agents/planning/implementation-planner.md');` |
   | 157 | `const found = scan(ROOT).findings.filter((f) => FIVE_CORRECTED.includes(f.file));` | `const found = liveScan.findings.filter((f) => FIVE_CORRECTED.includes(f.file));` |
   | 285 | `const fresh = scan(ROOT).findings.filter((f) => f.detection === 'recipe-kind');` | `const fresh = liveScan.findings.filter((f) => f.detection === 'recipe-kind');` |
   | 290 | `const findings = scan(ROOT).findings;` | `const findings = liveScan.findings;` |
   | 320 | `const keys = new Set(scan(ROOT).findings.map((f) => f.key));` | `const keys = new Set(liveScan.findings.map((f) => f.key));` |

After the edits, `scan(ROOT)` occurs exactly once in the file (in the hook). These keep their own
calls, unchanged: the fixture scans (lines 58, 263, 313), the error-path calls of case 19 (lines
245, 246, 249), and case 18's whole invariant check (`checkAllInvariants`, line 237), which runs
the enforcer's own scan inside `src/lib/iron-loop-enforcer.js`; sharing that one would need a
change under `src/`, which this slice does not make.

### Never weaker: what is proven, and how (criteria 34 and 35)

Scratch scripts in `SCRATCH/s5/`, never committed; their sources and outputs go into the build
record with every path written relative to the repository root or `SCRATCH`. Each starts `node`
and `git` with an argument list and no shell, and writes only under `SCRATCH/s5/`.

**The base clone, `SCRATCH/s5/make-base.js <BASE>`.** `BASE` is the commit at HEAD when this build
starts, recorded at Step 9. Slice 2's method (its decision 15): `git clone --shared --no-checkout
. SCRATCH/s5/base`, then `git -C SCRATCH/s5/base checkout --detach <BASE>`, then a directory link
`SCRATCH/s5/base/node_modules` to this worktree's `node_modules` (a junction on Windows). It refuses
if the folder exists at another commit. The clone holds the old versions of the two files in a
full tree, so their scans read the same inputs as the worktree's.

**The probe preload, `SCRATCH/s5/scan-probe.cjs`.** Loaded into every process of a probe run with
`NODE_OPTIONS=--require=<its path>` (the runner's child test process inherits the environment).
It replaces one export of one scan module of the tree under test with a wrapper, before the test
file loads, so the test's destructured import receives the wrapper. Settings come from the
environment: `S5_TREE` (the tree's root), `S5_MODULE` (`src/lib/reachability.js` or
`src/lib/unexecutable-instruction-scan.js`), `S5_EXPORT` (`analyzeExports` or `scan`),
`S5_TEST_FILE` (the test file, tree-relative), `S5_POISON` (`1` or `0`), `S5_REPORT` (a path prefix
under `SCRATCH/s5/reports/`).

- Its first statement is `'use strict';`, so inside the probe an assignment or a new property on a
  frozen object throws a `TypeError` instead of failing silently; the write census below depends
  on that.
- Every call whose root's real path equals the tree's is counted by the file that made the call.
  The caller is read in the wrapper's own body, never in a helper it calls, as
  `new Error().stack.split('\n')[2]`: line 0 is `Error`,
  line 1 is the wrapper itself, line 2 is its caller. The file is the text inside the last pair
  of parentheses of that line, or after `at ` when there are none, with a leading `file://`
  removed and the trailing `:line:column` cut off; it is recorded as
  `path.relative(fs.realpathSync(S5_TREE), fs.realpathSync(file))` with `/` separators. Calls with
  other roots are counted apart and pass through untouched.
- With `S5_POISON=1`, the value returned for the tree's root is replaced by a wrong one (below).
- For calls made by the test file: the first returned object is kept, and the SHA-256 of the JSON
  of every returned value is collected.
- At process exit, in this order: whether the kept object is deeply equal
  (`util.isDeepStrictEqual`) to a fresh call of the original function with the same root (clean
  runs only); then every object and array reachable from it is checked for `Object.isFrozen` and is
  written to once (`push` on an array, a new property on an object, both through the probe's own
  strict-mode code), counting the writes refused with a `TypeError`; a write that returns without
  throwing is counted as accepted. The report `<S5_REPORT>-<pid>.json` holds: the calls by file, the calls with
  other roots, the number of distinct result hashes returned to the test file, the hash of the kept
  object, the equality, the containers, the frozen count and the refused count. The runner's
  parent process writes a report with no calls; the probe script uses the one report whose calls
  include the test file.

The wrong values:

```js
const POISONS = {
  analyzeExports: (r) => ({ ...r, totalExports: 0,
    dead: [...r.dead, 'src/lib/actions.js#completeExecution'],
    surfaceCalled: [...r.surfaceCalled, 'completeExecution'] }),
  scan: (r) => {
    const planted = (file) => ({ detection: 'instruction-tool', key: `${file}::instruction-tool::s5Planted`,
      file, line: 1, signature: 's1', callee: 's5Planted', grant: ['Read'], message: 's5 planted', fix: 's5 planted' });
    return {
      findings: [
        ...r.findings.filter((f) => f.key !== 'settings.yaml::config-key::quality.coverage_threshold'),
        planted('agents/iron-loop/iron-loop-integrator.md'),
        planted('agents/planning/vision-advisor.md'),
        planted('agents/planning/implementation-planner.md'),
        planted('agents/compliance/gdpr-agent.md'),
        { detection: 'recipe-kind', key: 'src/commands/start.md::recipe-kind::s5planted',
          file: 'src/commands/start.md', message: 's5 planted', fix: 's5 planted' },
        { detection: 'config-key', key: 'settings.yaml::config-key::enforcement.mode',
          file: 'src/lib/init-project.js', surface: 'settings.yaml', message: 's5 planted', fix: 's5 planted' },
      ],
      scanned: { agents: 0, withGrant: 0, commandDocs: 0, settingsKeys: 0 },
    };
  },
};
```

Each wrong value is built so that every case that reads the scan of the real repository fails on
it, by reading the cases:

- export-reachability, 7 cases: "the analysis is non-vacuous: …" (`totalExports` 0, line 41);
  "completeExecution is NOT dead — …" (line 101); "NO NEW DEAD EXPORT: …" (completeExecution is not
  in the baseline, line 106, so it is newly dead, line 113); "THE RATCHET ONLY TIGHTENS: …" (one more dead export than the
  baseline, line 125); "LOWER THE BASELINE when you pay debt down …" (line 133); "THE REAL REPO: …"
  (line 436); "THE REAL-REPO RE-CATCH GUARD: …" (line 458).
- unexecutable-instruction fence, 13 cases: 1 (`agents` 0, line 68); 6, 8, 10 and 11 (a planted
  finding in the file each one checks, lines 109, 121, 153, 158); 13 (keys outside the baseline,
  line 189); 14 and 15 (five more findings than `maxDebt`, lines 196 and 201); 16 (the debt entry
  `settings.yaml::config-key::quality.coverage_threshold` has no live finding, line 221); 20
  (`commandDocs` 0, line 268); 22 (a planted recipe-kind finding, line 286); 23 (the coverage
  threshold finding removed, line 292); 25 (`enforcement.mode` flagged, line 321).

**The proof, `SCRATCH/s5/prove-same-proof.js <BASE> <file>…`**, run from the repository root,
with the files to check as arguments (both candidates at Step 8; the converted files from Step 10
on). For each file named:

1. **Assertion calls (criterion 35).** The base text is the standard output of
   `git show <BASE>:<file>`; the new text is the working file. Both are parsed with the
   repository's own TypeScript (`require(require.resolve('typescript', { paths: [root] }))`,
   `ts.ScriptKind.JS`), and every call whose callee is `assert` or a property of `assert` is
   collected byte for byte with `getText()`. These are slice 1's `assertCalls` and `diffMaps`,
   copied from `SCRATCH/prove-the-split.js` (lines 381-392 and 188-197). The two multisets must be
   equal; both totals are printed, and every differing text with both counts.
2. **Four runs**, each `node --test --test-reporter=tap <file>` with the preload, its TAP written to
   `SCRATCH/s5/tap/<label>.tap`, a time limit of 300 s, `NODE_TEST_CONTEXT` deleted from the
   environment: base clean and base poisoned (working folder `SCRATCH/s5/base`), new clean and new
   poisoned (working folder the repository root). The script refuses to start if the preload's
   path holds a space (it is passed inside `NODE_OPTIONS`).
3. **Names (criterion 35).** The two clean runs are parsed with slice 1's `parseTap` and `checkRun`
   (`SCRATCH/prove-the-split.js` lines 255-299): exit 0; subtest lines, result lines and the tests
   counter agree; 0 failed, cancelled, skipped and todo; no `not ok`; no SKIP or TODO directive.
   The multisets of full nested names must be equal; both counts are printed.
4. **Once per file, frozen, the same value (criterion 34).** From the clean runs' reports:
   - new: exactly 1 call by the test file; every container frozen and every write refused;
   - base: the old count by the test file (3 for export-reachability, 10 for the unexecutable
     fence), and exactly 1 distinct result hash among them, so every old call computed the same
     value;
   - both: equal to a fresh scan at exit; the hash of the new run's shared result equals the base
     run's (the shared value is the value the old per-case calls produced); the calls made by any
     other file (for example the enforcer's, from case 18) are the same number on both sides.
5. **Every reader reads the shared value.** Both poisoned runs exit non-zero; the set of `not ok`
   names with their nesting path is the same in the base and the new run; it contains the cases
   listed above for that file; any other member is printed by name (the enforcer of unexecutable
   case 18 also reads the poisoned scan; whatever it does, it does on both sides).
6. **Output**: per file, the two assertion totals, the two name counts, the report fields of each
   run, the two poisoned failure sets, then `PASS` or every failure.

### Test first: there is no red state for the assertions; this replaces it

This slice changes how two test files set up a value they already compute; every assertion stays
as it is, so there is no behaviour that is red before and green after. What stands in for the red:

- **The probe is written before either file changes and run on the unchanged tree (Step 8).** The
  checks this slice exists to satisfy fail, and the failure is quoted in the build record: calls
  by the test file 3 and 10 where 1 is required; 0 frozen containers and 0 refused writes on the
  new side. At Step 9, with the base clone made, the full proof on the unchanged tree shows the
  same failures while the never-weaker checks pass (base and worktree files are identical), which
  shows the parser, the TAP reading, the preload and the poison work on the real files.
- **The poisoned runs show the conversion is not hollow.** If a converted case read anything other
  than the shared value, a wrong shared value would leave it green; the poisoned runs require every
  reading case to fail, on the old file and the converted file alike.
- **The write census shows a case cannot change the shared value.** On the new side every write is
  refused; on the base side the same writes are accepted, so the freezing is what refuses them.

### The per-file measurement at the start: the go or no-go (criterion 34)

`SCRATCH/s5/scan-cost.js`, run from the repository root at Step 9: for each of the six census
files, one fresh Node process calls its scan once with this repository's root (the cold call),
then five more times, and records the processor time of each call with `process.cpuUsage()` (user
plus system, the whole process). It prints the cold call, the median of the five warm calls, the
removable calls from the census table, and removable × warm median, with the one-minute load at
start and end. Beside it the record lists, from the before whole-suite run's spec output, the
durations of the cases holding a removable call in each census file.

This measurement decides the set of converted files (functional criterion 34: the files are
"named in the record by a per-file measurement at this slice's start"). The rule, applied once,
to the numbers as printed:

- A file is converted only if removable × warm median is at least 1.0 s.
- A candidate (export-reachability, the unexecutable fence) that comes out under 1.0 s is
  dropped: its edits are not made, it is not in the proof, the pairs or the presence checks from
  Step 10 on, and the record gives its number.
- A left-out file (golden corpus, false green, reachability, claim census) that reaches 1.0 s is
  reported to the CTO Chief in one line with its number, and is not added: this plan holds no edit
  text for it and does not declare it.
- If no file qualifies, the slice builds nothing: Step 10 makes no edit, the measured numbers of
  all six files are recorded, and the builder reports to the CTO Chief and ends its turn.

The measurement is run once and not repeated to move a file across the bar.

### Measurement (criteria 1 and 36)

Recorded for every run (functional plan, "How every slice is measured"): the command; wall-clock,
user and system time from `/usr/bin/time -p`; the one-minute load at start and end; the core count;
the Node version; the commit; passed, failed and skipped counts; the per-file durations and the
longest file; and which of semgrep, osv-scanner, trufflehog, detect-secrets, gosec and bandit are
installed. Every run uses slice 1's `SCRATCH/timed-run.js` and `SCRATCH/per-file-reporter.cjs`
unchanged (`node SCRATCH/timed-run.js <label> <file|@suite>` writes `<label>.spec`,
`.per-file`, `.time` and `.meta` in `SCRATCH`; for the base side it is started from
`SCRATCH/s5/base` as `node ../../timed-run.js …`).

- **Before, whole suite.** Slice 4's whole-suite after-run when `git log` shows nothing else
  landed between it and `BASE`; otherwise `node ../../timed-run.js s5-suite-before @suite` in the
  base clone.
- **Paired, interleaved runs of the converted files (criterion 36, measure a).** Each file alone in
  its own call, so each run's processor time is that file's. Three pairs, in this order for
  k = 1, 2, 3: export-reachability before (base clone), after (worktree); unexecutable fence
  before, after. Labels `s5-p<k>-before-export`, `s5-p<k>-after-export`, `s5-p<k>-before-unexec`,
  `s5-p<k>-after-unexec`. A file dropped at Step 9 has no pairs; `SCRATCH/s5/pairs.js` takes the
  converted files as arguments. Every run is recorded, none repeated or dropped. `pairs.js` starts
  the runs (twelve with both files, six with one) in that order and prints a table per file:
  wall-clock, user, system and processor time, the runner's file duration, tests passed, failed
  and skipped, and the load.
- **After, whole suite.** `node SCRATCH/timed-run.js s5-suite-after @suite` on the completion tree,
  once, recorded as it comes out: `node --test` with the per-file reporter over the whole suite,
  wall and processor time, the load at start and end. This is a timing run, not the gate: the
  full `npm test` is the CTO Chief's, once after the last slice.
- **Faster** is written for a converted file only when its after side is lower in processor time
  and in the runner's file duration in all three pairs; its saving per pair is recorded beside the
  census estimate and the Step 9 measurement. The longest file of each whole-suite run (measure b)
  is named; this slice does not claim to move it (the converted files took 1.66 s and 2.97 s in Run
  A, against 48.78 s for the longest file, `tests/hotfix-check-corpus.test.js`). Whole-suite
  processor time before and after (measure c) is recorded; a difference of about two seconds lies
  well inside the variation between recorded whole-suite runs (592.89 s in slice 1's before-run,
  `plans/implementation/the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md`
  line 1436; 407.55 s in slice 2's after-run, its plan line 1649), and the record says so with the
  numbers instead of claiming it.
- Before every probe and timing run, `git status --porcelain` in the worktree must list nothing but
  the converted files, paths under `plans/`, and paths under `.ctoc/` other than the `.json`
  files directly in `.ctoc/` (the baselines the tests and scans read), so the base clone and the
  worktree scan the same inputs; otherwise the build stops and reports the list.

### Tests run while building and at Step 14; the full run is not this slice's

While building and at Step 14, by name only:

- the converted files;
- `tests/skip-visibility.test.js` and `tests/skip-guard-integrity.test.js`, which read the text of
  every `tests/*.test.js` file;
- `tests/golden-corpus-fence.test.js`, whose scan reads test files for links to the corpus;
- lint of the converted files with the repository's own eslint, never through npx:
  `node node_modules/eslint/bin/eslint.js --max-warnings 0 tests/export-reachability.test.js tests/unexecutable-instruction-fence.test.js`
  (only the converted ones named);
- the type check by name, `node --test tests/typecheck.test.js`. `tsconfig.json` excludes `tests`
  (line 22), so the converted files are outside what it checks and its result is recorded as
  unchanged by this slice, not as evidence about them.

No other file reads the text of the two candidate files: a search for
`export-reachability\.test|unexecutable-instruction-fence\.test` over `src`, `tests`, `docs`,
`agents` and `skills` found six files, each a path in a comment, a fixture or an instruction
(`agents/iron-loop/iron-loop-executor.md` line 283, `tests/test-writers-get-the-fast-test-rules.test.js`
line 71, `tests/state-manager.test.js` line 121, `src/lib/iron-loop-enforcer.js` line 772,
`docs/FENCES.md` line 62, and a golden-corpus plan sample).

The one full `npm test` of the whole plan runs once, after the last slice, by the CTO Chief, never
by this slice's builder (the CTO Chief's ruling of 2026-10-12, `SCRATCH/MEASUREMENTS.txt` line 19,
restated for this slice on 2026-10-13). Criterion 2 therefore stays unticked in this slice's
record in every case. The builder runs no menu command and commits nothing.

### Build order, test first (for the steps the integrator writes)

1. **Red (Step 8).** Record `BASE` (HEAD when the build starts). Write `make-base.js`,
   `scan-probe.cjs`, `prove-same-proof.js`, `scan-cost.js` and `pairs.js` in `SCRATCH/s5/`. Run
   each candidate on the unchanged tree with the preload, clean: its report shows the
   once-per-file and frozen checks failing (3 and 10 calls by the test file, 0 frozen containers,
   0 refused writes). Quote the output.
2. **Prepare (Step 9).** Make the base clone, then run the full proof on the unchanged tree for
   both candidates: the never-weaker checks pass, the once-per-file and frozen checks fail as in
   Step 8, which shows the proof's two sides work before any edit. Confirm that the "before" text
   of every edit above is in the two files exactly as written (the edits would fail otherwise; a
   mismatch means another plan changed the file, and the build stops and reports it). Run
   `scan-cost.js`: the go or no-go names the converted files. Make or name the before whole-suite
   run.
3. **Implement (Step 10).** The edits to the converted files, nothing else. Lint them.
4. **Green.** The proof passes for every converted file; the tests listed above pass; the exact
   presence check of each converted file holds (`analyzeExports(ROOT)` once in
   export-reachability, `scan(ROOT)` once in the unexecutable fence).
5. **Reviews**, dispatched by the CTO Chief: the builder writes one packet per converted file (the
   file's diff, this plan's section for it and the proof's output) and ends its turn.
6. **Verify (Step 14).** The affected tests, lint, the type check, the three pairs per converted
   file and the one whole-suite timing run.

### Security review

- No file under `src/` changes; the product's behaviour is untouched. The converted files gain no
  input or output: the shared value is computed by the same call on the same root as before.
- No secret, token or personal value is written. The build record holds no absolute path (the
  worktree and scratch paths carry an account name): every path is relative to the repository root
  or `SCRATCH`, including the caller files in the probe's reports.
- The scratch scripts start `git` and `node` with argument lists, never a shell. Their only inputs
  are the repository root (the working folder) and a commit name passed to `git` as one argument.
  `NODE_OPTIONS` carries only `--require=` and a path under `SCRATCH/s5/`, refused if it holds a
  space. The preload is loaded only in the probe runs, never in a timing run or in `npm test`.
- `make-base.js` writes only under `SCRATCH/s5/base`; the other scripts write only under
  `SCRATCH/s5/` (and `timed-run.js` under `SCRATCH`). The one link (`node_modules`) is made inside
  `SCRATCH/s5/base`, and no script deletes anything in a folder that holds a link.

## Wiring — the live call sites

- The converted files are run by `npm test`: `src/scripts/test-gate.js` `resolveTestFiles`
  (line 265) lists every `tests/*.test.js` file and starts `node --test` over them (line 426);
  `npm run test:raw` runs the same glob (`package.json` line 12).
- `deepFreeze` and `scanOfThisRepository` are local to their test files and reached only by those
  files' cases; they are test setup, not product code. The dead-export fence never looks at
  `tests/` (`tests/export-reachability.test.js` line 21), so they add nothing to it.
- No new module, no new export, no change under `src/`.

## Acceptance criteria

Each maps to the functional plan's criterion of the same number.

- [ ] 1. Every run under "Measurement" is in the build record with the functional plan's items,
  including the load at start and end and the longest file of each whole-suite run. "Faster" is
  written for a converted file only when all three of its pairs agree, and for the slice only when
  measures a, b and c agree as the functional plan defines them; otherwise the record says which
  measure did not show it, with the numbers. Left open: no file met the one-second bar on the measurement of 2026-10-13
- [ ] 2. The one full `npm test` of the plan: 0 failed, 0 skipped, coverage at or above the floor in `.ctoc/coverage-baseline.json`; left for the CTO Chief's one full npm test after the last slice
- [ ] 34. The Step 9 measurement of all six census files is in the record, with removable calls,
  the warm median processor time per call and their product, and the go or no-go applied as
  written: the converted files are exactly those at 1.0 s or more among the two candidates, a
  left-out file at 1.0 s or more is reported and not added, and with none qualifying nothing is
  built. In each converted file the scan of the unchanged repository is computed once per file,
  in one `before` hook (with the shared function of export-reachability for its third describe),
  frozen at every level, and read by every case that judged the real repository, each with its
  assertion text unchanged; the cases that scan their own projects keep their own calls. Shown by
  the proof: 1 call by the new file against 3 (export-reachability) or 10 (the unexecutable fence)
  by the old, 1 distinct value among the old calls, every container frozen and every write
  refused, the shared value equal to a fresh scan and to the old file's, and the same failure set
  in the poisoned runs of the old and the new file, holding every reading case. Left open: no file met the one-second bar on the measurement of 2026-10-13
- [ ] 35. For each converted file the multiset of nested test names from the runner's TAP output
  and the multiset of assertion calls from the TypeScript parse are equal before and after; both
  counts are recorded. Left open: no file met the one-second bar on the measurement of 2026-10-13
- [ ] 36. Three paired, interleaved runs per converted file, each file alone: wall-clock and
  processor time before and after in every pair, with the load at start and end, recorded beside
  the whole-suite runs. Left open: no file met the one-second bar on the measurement of 2026-10-13

## Risks

| Risk | Mitigation |
|---|---|
| The saving is small and depends on the load: about 1 s per converted file in Run A, about 2 s in Run B, and the processor time may come out under 1 s | The record states the measured numbers; "faster" is written only when all three pairs agree. The census and the Step 9 measurement make the size visible before anyone counts on it |
| A future case writes into the shared result | It throws a `TypeError` at the write (every level frozen), so it fails loudly instead of changing what the next case reads |
| A future case changes the repository and expects a fresh scan | The comment above each shared scan says a case that changes the repository computes its own; the poisoned runs and the fresh-scan comparison catch a case that silently relies on the shared value |
| A future scan result holds a Map or a Set, which `Object.freeze` does not protect | `deepFreeze` throws on meeting one, so the change fails at once |
| A name filter runs only the third describe of export-reachability, whose hook-less cases need the scan | `scanOfThisRepository` computes it at the first call in the process |
| Other test processes write into folders the scans read while the suite runs | Same exposure as today; one snapshot per file instead of up to ten makes the file's cases consistent with one another |
| The base clone and the worktree differ in files outside the converted ones, so the two sides scan different inputs | The `git status` check before every probe and timing run, and the proof's hash comparison of the base and new results |
| `NODE_OPTIONS` does not reach the runner's child process | No report holds a call by the test file, and the proof fails loudly naming the missing report |
| Slice 3 or slice 4 changes either file before this build | Step 9 confirms every "before" text; a mismatch stops the build and is reported, never patched by guess |
| The processor-time measurement puts every candidate under 1.0 s | The slice builds nothing, records the six measured numbers and reports to the CTO Chief; the measurement is never repeated to move a file across the bar |

## Decisions Taken Under Ambiguity

1. **Two candidates, four left out, by the CTO Chief's one-second rule on the recorded
   durations; the measurement at Step 9 decides what is converted (decision 13).**
   `tests/export-reachability.test.js` (1.03 s in Run A, 2.13 s in Run B) and
   `tests/unexecutable-instruction-fence.test.js` (0.99 s and 1.65 s) reach about one second in both
   recorded runs. Left out, with their numbers: `tests/golden-corpus-fence.test.js` (about 0.77 s
   and 1.8 s), `tests/false-green-fence.test.js` (0.58 s and 1.82 s), `tests/reachability.test.js`
   (0.14 s and 0.29 s), `tests/claim-census.test.js` (about 0.08 s and at most 0.25 s). The golden
   corpus and false-green files pass one second only in Run B, whose load rose to 65 on 18 cores;
   Run A, at 18.8 to 22.7, is the closer proxy for processor time.
2. **The estimates are the runner's per-case durations in two recorded whole-suite runs.** They are
   wall-clock, not processor time; no per-case processor time exists in any recorded run. Step 9
   measures processor time per call for all six files and records it beside them (criterion 34's
   "per-file measurement at this slice's start"), and that measurement, not these estimates,
   decides the converted files (decision 13).
3. **One `before` hook per file.** In the unexecutable fence, at the top of its only describe. In
   export-reachability, in the first describe, with a function that computes the scan at its first
   call in the process, so the third describe's two cases share the same result also when a name
   filter runs them alone. Not chosen: a top-level `before` (once-per-file behaviour unverified,
   research brief line 154); a new describe wrapping the existing ones (changes every nested name).
4. **`deepFreeze` is written into each converted file, not into a shared helper.** It is nine
   lines, no assertion, and a helper module would be one more file for at most two callers. When
   both files are converted the two copies are byte-identical; the review checks that.
5. **Freeze in place.** The scan result is a fresh object the test owns (section "The frozen
   result"); no case writes into it, by reading every case.
6. **A Map or a Set inside a shared result is refused.** `Object.freeze` does not stop `set` or
   `add`; neither result holds one today (by reading), and a future one fails at once.
7. **The never-weaker proof runs the real files in their real places.** The preload replaces the
   scan's export before the test file loads, so the same wrong value reaches the old and the new
   file without editing either; the alternative, a scratch copy with its root and imports
   rewritten, would test a different file. `NODE_OPTIONS` is the carrier because the runner's
   child process inherits the environment.
8. **The removed calls are compared with the kept one by value, not only by function.** The base
   run's report shows every old call returned the same value (one distinct hash), and the new run's
   shared result hashes to that value, so sharing drops no information any old call carried.
9. **Three pairs per converted file, each file in its own call.** One file per call makes each
   run's processor time that file's. Three pairs, one more than slices 1 and 2 used, because the
   expected difference (about one second) is close to the run-to-run variation of a file that
   takes two to three seconds.
10. **The base side runs in a clone at `BASE`** (slice 2's decision 15), not in a copy with links:
    the scans walk `agents/`, `skills/` and `src/`, and a copy with linked folders could be walked
    differently.
11. **Case 18 of the unexecutable fence keeps its whole invariant check.** It is the file's largest
    cost (1.81 s in Run A, 2.82 s in Run B) and calls the enforcer, which runs its own scan inside
    `src/lib/iron-loop-enforcer.js`; sharing it needs a change under `src/`. Listed as a finding.
12. **This slice does not run the plan's one full `npm test`; the CTO Chief runs it once after the
    last slice** (the CTO Chief's ruling of 2026-10-13, replacing this plan's earlier decision that
    this slice runs it as the last in the owner's order). Step 14 runs the affected tests by name,
    lint, the type check (`tests/typecheck.test.js` by name; `tsconfig.json` line 22 excludes
    `tests`, so its result is recorded as unchanged) and one whole-suite timing run (`node --test`
    with the per-file reporter; wall and processor time; load at start and end). Criterion 2 stays
    unticked in every case, its reason at the end of its own checkbox line, never on a new line;
    "then the one full npm test" was deleted from the build order.
13. **The converted files are decided by measurement: `scan-cost.js` at Step 9 is a go or no-go**
    (the CTO Chief's ruling of 2026-10-13, following functional criterion 34's "named in the record
    by a per-file measurement at this slice's start"). A file is converted only if removable calls
    × warm median processor time per call is at least 1.0 s; a candidate under that is dropped; a
    left-out file at or above it is reported, not added (the plan holds no edit text for it and
    does not declare it); with none qualifying the slice builds nothing, records the numbers and
    reports to the CTO Chief. The earlier sentence "the set of converted files does not change in
    the build" was deleted, and the census column now reads "candidate" instead of "converted".
14. **The builder runs no menu command and commits nothing; reviews are dispatched by the CTO
    Chief** (the CTO Chief's ruling of 2026-10-13). The builder writes one review packet per
    converted file at Step 11 and ends its turn there; at most two fix rounds follow, each on the
    CTO Chief's re-dispatch.
15. **`scan-probe.cjs` starts with `'use strict';`** (spec critic finding). In sloppy mode a new
    property on a frozen object is dropped silently, so the write census could count a refused
    write as accepted; in strict mode every write to a frozen container throws a `TypeError`, and
    a write that returns without throwing is counted as accepted. Chosen over counting
    `Reflect.set` returning false because `push` on a frozen array throws in either mode, so one
    rule (a thrown `TypeError`) covers both kinds of write.
16. **The caller frame is `new Error().stack.split('\n')[2]`, read in the wrapper's own body**
    (spec critic finding): line 0 is `Error`, line 1 the wrapper, line 2 its caller; the file is
    recorded relative to the tree's real path. Step 8's red counts (3 and 10 by the test file) show
    the line names the test file.
17. **Refinement loop not gated on: standard mode for Steps 12 to 14.** The plan declares
    `effort: small`, and neither declared path matches a glob in
    `.ctoc/config/refinement-triggers.yaml` (the nearest, `**/export/**`, needs a folder named
    `export`; `tests/export-reachability.test.js` has none).
18. **The base clone is made at Step 9, so the red at Step 8 is the new side alone.** The CTO
    Chief's step list puts the base clone in PREPARE; the red needs no base, because the checks
    that must fail (calls by the test file, frozen containers, refused writes) read only the
    worktree run's report. Step 9 then runs the full proof on the unchanged tree, where the
    never-weaker checks pass and the same two checks fail, before the go or no-go and any edit.
19. **Step 14 lints through `tests/lint.test.js` by name as well as eslint on the converted
    files.** The ruling names "lint"; `tests/lint.test.js` is the repository's own whole-tree
    eslint run (line 37), so it is the lint the full suite would apply, run here by name.
20. **The execution steps were added after a `---` line, in slice 1's form** (Step 7 integration of
    2026-10-13): canonical labels, IMPLEMENT as one step with one sub-item per converted file, a
    dropped candidate never edited, the acceptance section holding one box per criterion this
    slice owns (1, 2, 34, 35, 36) and no other square brackets. "Converted files" in every later
    section now means the files the Step 9 go or no-go names (the proof, the pairs, the presence
    checks, the `git status` filter, the wiring and the risks were reworded to match).

## What was not verified

- The planner ran nothing. Every duration is from a recorded run named above; every behaviour is
  by reading.
- Processor time per scan call: not measured; Step 9 measures it.
- That `NODE_OPTIONS=--require=…` reaches the child process `node --test` starts: believed (the
  child inherits the environment); a run without a report fails the proof loudly.
- That `util.isDeepStrictEqual` ignores whether an object is frozen: believed from Node's
  documentation, not opened this session. If it did not, the fresh-scan comparison would fail
  loudly, never pass falsely.
- That hooks declared inside a describe run before its first case: believed, and already relied on
  by `tests/gate-numbers-fence.test.js` (lines 69-71) and others.
- The stack line the preload reads to name the calling file (`new Error().stack.split('\n')[2]`):
  by reading V8's stack format (line 0 the message, line 1 the wrapper, line 2 its caller); if it
  names another frame, the counts by file are wrong and the proof fails on them rather than
  passing. Step 8's red run on the unchanged tree shows the counts 3 and 10 by the test file, which
  is the check that this line names the test file.
- Whether the machine runs loaded test processes on slower cores, which would make processor time
  itself depend on the load: believed; the Step 9 measurement and the pairs record the load.

## Findings outside this slice's goal (for the owner to schedule)

- `tests/iron-loop-enforcer.test.js` (owned by another round, not touched) is the largest repeat
  of whole-repository work: 7.44 s in Run A, with the whole invariant check run in several cases,
  some on a snapshot copy of the repository (`stableRepoRoot`, lines 43-55; calls at lines 84 and
  561).
- `tests/unexecutable-instruction-fence.test.js` case 18 runs the whole invariant check, 1.81 s
  in Run A; sharing it needs the enforcer to accept a scan already made, a change under `src/`.
- `tests/golden-corpus-fence.test.js` and `tests/false-green-fence.test.js` would take the same
  conversion for about 0.77 s and 0.58 s in Run A (about 1.8 s each in Run B), if the bar is set
  lower.
- `tests/lint.test.js` runs eslint over the whole repository once, 7.19 s in Run A; only a cache
  (eslint's own `--cache`, a change to what the gate writes) could shorten it.

---

## Execution Plan (Steps 8-16)

`SCRATCH` is the build's scratch folder `test-speed-build` that the CTO Chief names in the
builder's brief; this slice's scripts and outputs live in `SCRATCH/s5/`. Every command runs from
the repository root unless the step names the base clone. Every timed run records the items under
"Measurement" through slice 1's `SCRATCH/timed-run.js`. No two timed runs overlap. A run that can
pass 10 minutes is started in the background and the turn ends; never a loop that sleeps and
checks a file. The builder runs no menu command, commits nothing and pushes nothing; the one full
`npm test` is the CTO Chief's, after the last slice. "Converted files" below means the files the
go or no-go of Step 9 names; a dropped candidate is never edited.

### Step 8: TEST (TDD Red)
- [x] Record `BASE` as `git rev-parse HEAD` before anything else is written
- [x] Confirm `node_modules/typescript/package.json` and `node_modules/eslint/bin/eslint.js` exist in the worktree; if either is absent, stop and report it to the CTO Chief, and install nothing
- [x] Write `SCRATCH/s5/scan-probe.cjs` as "The probe preload" describes: first statement `'use strict';`; settings from `S5_TREE`, `S5_MODULE`, `S5_EXPORT`, `S5_TEST_FILE`, `S5_POISON`, `S5_REPORT`; the export replaced by a wrapper before the test file loads; the caller read in the wrapper's own body as `new Error().stack.split('\n')[2]`, made relative to the tree's real path with `/` separators; calls with other roots counted apart and passed through; the `POISONS` table word for word; at exit the fresh-scan equality (clean runs only), then the frozen check and one write per container, a thrown `TypeError` counted as refused and a normal return as accepted; the report `<S5_REPORT>-<pid>.json` with every field the section lists
- [x] Write `SCRATCH/s5/make-base.js`, `SCRATCH/s5/prove-same-proof.js` (files to check as arguments), `SCRATCH/s5/scan-cost.js` and `SCRATCH/s5/pairs.js` (converted files as arguments) as their sections describe: `node` and `git` started with argument lists and no shell, `NODE_TEST_CONTEXT` deleted from every child's environment, a preload path holding a space refused, writes only under `SCRATCH/s5/`
- [x] The red: for each candidate, `tests/export-reachability.test.js` and `tests/unexecutable-instruction-fence.test.js`, one clean run of `node --test --test-reporter=tap <file>` on the unchanged worktree with `NODE_OPTIONS=--require=<the preload>` and `S5_POISON=0`; the report holding calls by the test file must show 3 and 10 calls where 1 is required, 0 frozen containers and 0 refused writes, so the once-per-file and frozen checks fail; each run itself exits 0 with 0 failed
- [x] A report that names no call by the test file, or names a caller other than the test file for the calls at the census lines, is a fault in the preload (the environment did not reach the child, or the stack line is wrong); fix the preload and re-run, never the plan's numbers
- [x] Quote both red reports in the build record, every absolute path rewritten relative to the repository root or `SCRATCH`

### Step 9: PREPARE
- [x] Before this step's proof and timing runs (and, from Step 10 on, before every proof and timing run, the converted files then allowed too), `git status --porcelain` lists nothing but paths under `plans/` and paths under `.ctoc/` other than the `.json` files directly in `.ctoc/`; otherwise stop and report the list to the CTO Chief (git status listed only paths under plans/ and .ctoc/ and one untracked file at the repository root, IRON_LOOP.md, which the brief names as owner-excluded; make-base.js copies it into the base clone so both trees hold the same inputs)
- [x] Make the base clone with `node SCRATCH/s5/make-base.js <BASE>`: shared clone without checkout, detached checkout at `BASE`, the `node_modules` directory link (a junction on Windows); it refuses when the folder exists at another commit
- [x] Run `node SCRATCH/s5/prove-same-proof.js <BASE> tests/export-reachability.test.js tests/unexecutable-instruction-fence.test.js` on the unchanged tree: the assertion-call and name checks pass with equal counts, both poisoned runs exit non-zero with equal failure sets holding every reading case listed under "The wrong values", and the once-per-file and frozen checks fail exactly as in Step 8; any other failure is a fault in the proof, fixed in the proof
- [ ] Confirm that every "before" text under "File 1" and "File 2" is in its file exactly as written; a mismatch means another plan changed the file: stop and report it to the CTO Chief, never patch by guess (not done: nothing was converted, so no edit text was applied)
- [x] Run `node SCRATCH/s5/scan-cost.js` once: per census file the cold call, the warm median processor time per call, the removable calls, their product, and the load at start and end; beside it the before whole-suite durations of the cases holding a removable call
- [x] Apply the go or no-go as written under "The per-file measurement at the start": a candidate at 1.0 s or more is converted; a candidate under it is dropped with its number; a left-out file at 1.0 s or more is reported to the CTO Chief in one line and not added; the measurement is not repeated
- [x] If no file qualifies: record all six measured numbers, make no edit, report to the CTO Chief and end the turn here
- [ ] Name or make the before whole-suite run: slice 4's whole-suite after-run when `git log` shows nothing else landed between it and `BASE`, otherwise `node ../../timed-run.js s5-suite-before @suite` in the base clone; record its longest file with duration and load, and its processor time (not made: nothing was converted, so there is no after side to pair it with)

### Step 10: IMPLEMENT
- [ ] `tests/export-reachability.test.js`, if converted: the four edits under "File 1" exactly as written (the `before` import; `deepFreeze`, `sharedScan` and `scanOfThisRepository` after the `BASELINE_FILE` line; the first describe's `before` hook; the two cases of the third describe calling `scanOfThisRepository()`), no other line changed; then `analyzeExports(ROOT)` occurs exactly once in the file, an exact presence check (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] `tests/unexecutable-instruction-fence.test.js`, if converted: the edits under "File 2" exactly as written (`deepFreeze` after `agent()`; the `before` hook with `liveScan` and `liveFindings` at the top of the describe; the old `liveFindings` line deleted; the nine remaining `scan(ROOT)` lines replaced as the table gives them), no other line changed; then `scan(ROOT)` occurs exactly once in the file (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] When both are converted, the two `deepFreeze` texts are byte-identical (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Lint the converted files: `node node_modules/eslint/bin/eslint.js --max-warnings 0 <the converted files>`, 0 errors and 0 warnings (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Run each converted file by name with `node --test <file>`: 0 failed, 0 skipped (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Run `node SCRATCH/s5/prove-same-proof.js <BASE> <the converted files>` and see it print PASS: equal assertion-call and name multisets with both counts, 1 call by each new file against 3 or 10 by the old, 1 distinct hash among the old calls, every container frozen and every write refused on the new side and accepted on the base side, the shared value equal to a fresh scan and to the base run's hash, equal calls by other files on both sides, equal poisoned failure sets holding every reading case (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] A failure is fixed in the converted file only when the file departs from this plan's edit text; when the plan's edit text itself is wrong, stop and report it to the CTO Chief (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)

### Step 11: REVIEW
- [ ] Re-run the proof of Step 10 in full and see PASS before any review packet is written (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Write one review packet per converted file into `SCRATCH/s5/review/`: the file's diff against `BASE`, this plan's section for it, the census row, the Step 9 measurement, and the proof's output for that file; questions: does the diff hold exactly the plan's edits and nothing else; does every case that judged the real repository read the shared value with its assertion text unchanged; do the fixture cases keep their own calls; is the shared result frozen at every level; is a case that changes the repository still free to scan on its own (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Hand the packets to the CTO Chief with the recommendation to dispatch one `iron-loop-critic` review per converted file in parallel, then end the turn; the builder dispatches nothing itself, and OPTIMIZE onward starts only after the review outcome (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] When re-dispatched with findings, fix each in the converted files only, then re-run the proof and the affected tests of Step 14 by name; the second round re-reviews only the files that changed (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Stop after two fix rounds; every finding still open goes to the CTO Chief in one line each, and a finding outside this slice's goal is listed in one line for the owner to schedule (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)

### Step 12: OPTIMIZE
- [ ] No file under `src/` changes; the saving is the removed scan calls and is measured in Step 14, never by editing an assertion (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Confirm from the presence checks that each converted file holds exactly one scan of this repository, and from the proof that the file's run made exactly one such call (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Confirm lint reports no unused name in the converted files, and that `deepFreeze` walks the shared result once per file, in the hook (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)

### Step 13: SECURE
- [ ] Read the five scratch scripts: they start only `git` and `node`, with argument lists and no shell; they require no `http`, `https`, `net` or `dns` module; their only inputs are the repository root, the commit name and file paths under `tests/`; they write only under `SCRATCH/s5/` (and `timed-run.js` under `SCRATCH`); the one link is made inside `SCRATCH/s5/base`, and no script deletes in a folder that holds a link (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Confirm `NODE_OPTIONS` carries only `--require=` and the preload's path under `SCRATCH/s5/`, refused if it holds a space, and that the preload is loaded only in probe runs, never in a timing run (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Read the converted files and the scratch scripts for any key, token, password or personal value; none may appear, and a found one is named by file and line, never copied (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Search the build record for absolute paths and account names before it is written to the plan, the probe reports' caller files included; every path is relative to the repository root or `SCRATCH` (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)

### Step 14: VERIFY
- [ ] Affected tests by name, never `npm test`: `node --test <the converted files> tests/skip-visibility.test.js tests/skip-guard-integrity.test.js tests/golden-corpus-fence.test.js`; 0 failed, 0 skipped, 0 cancelled (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Lint with 0 warnings: the converted-files eslint command of Step 10, then `node --test tests/lint.test.js` by name (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Type check by name: `node --test tests/typecheck.test.js` passes; `tsconfig.json` excludes `tests` (line 22), so the record states that its result is unchanged by this slice and is no evidence about the converted files (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] The proof once more on the final tree, `node SCRATCH/s5/prove-same-proof.js <BASE> <the converted files>`: PASS, with both assertion totals, both name counts, the report fields of every run, and the deliberately wrong scan's two failure sets (base and new) equal and holding every reading case listed under "The wrong values"; output recorded (criteria 34 and 35) (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] The two exact presence checks of Step 10 hold on the final tree for every converted file (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Criterion 36: `node SCRATCH/s5/pairs.js <the converted files>`, three interleaved pairs per converted file in the order under "Measurement", every run recorded once whatever its load, none repeated or dropped; per pair wall-clock, user, system and processor time, the runner's file duration, passed, failed and skipped counts, load at start and end (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] One whole-suite timing run, `node SCRATCH/timed-run.js s5-suite-after @suite` (`node --test` with the per-file reporter), recorded as it comes out and never repeated: wall and processor time, load at start and end, its longest file with duration, passed, failed and skipped counts; this is a timing run, not the gate (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Criterion 1: "faster" written for a converted file only when its after side is lower in processor time and in the runner's file duration in all three pairs, and for the slice only when measures a, b and c agree; otherwise the record names the measure that did not show it, with the numbers, beside the census estimate and the Step 9 measurement (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] 0 warnings from eslint, the type check and the runner (deprecation notices included); a warning is fixed in the converted files, or reported to the CTO Chief when its cause is outside them (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] A failure in a converted file goes back to Step 10; a failure in any other file is re-run alone once, recorded with its load, and reported to the CTO Chief; `tests/reachability-surface-scan-is-linear.test.js` and `tests/iron-loop-enforcer.test.js` are never edited here (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)

### Step 15: DOCUMENT
- [ ] Write the build record under `## Execution Record` in this plan: `BASE`; the red reports of Step 8; the unchanged-tree proof of Step 9; the go or no-go table of all six files with removable calls, warm median, product, verdict and load; the sources and outputs of the five scratch scripts; the proof outputs of Steps 10 and 14; the review outcome and each fix; the pairs table and the whole-suite timing run as they came out; every changed path under `.ctoc/`; every path relative to the repository root or `SCRATCH` (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Repeat the presence search for `export-reachability\.test|unexecutable-instruction-fence\.test` over `src`, `tests`, `docs`, `agents` and `skills`; a doc that describes a converted file's content and is now wrong is listed for the CTO Chief, since no doc is declared; no other doc, comment or changelog is touched (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)

### Step 16: FINAL-REVIEW
- [ ] Every box of Steps 8 to 15 is ticked and true, or carries at the end of its own line the reason it could not be, with no square brackets (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Verify each acceptance criterion against the evidence it names, by running it or reading the recorded output, and tick its box only then; an open criterion keeps its reason at the end of its own checkbox line, never on a new line, written with no square brackets, and is reported to the CTO Chief (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Criterion 2 stays unticked in every case, its line ending "left for the CTO Chief's one full npm test after the last slice" (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Outside `plans/` and `.ctoc/`, `git status --porcelain` lists only the converted files; every changed path under `.ctoc/` is listed in the build record and never committed (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)
- [ ] Run no `menu` command: no task complete, no move of this plan; commit and push nothing. Hand back to the CTO Chief with the criteria status, the go or no-go numbers, the review outcome and any open finding (not done: no file met the one-second bar on the measurement of 2026-10-13, so nothing was built)

## Execution Record

Build of 2026-10-13. Outcome: **no file met the one-second bar; the slice builds nothing.** No file
under `tests/` or `src/` was edited; this plan file is the only repository file changed. `SCRATCH` is
the build's scratch folder `test-speed-build`; the scripts and outputs below are in `SCRATCH/s5/`.

### BASE

- `BASE` = `29468f62d1b25f0a04ad7296b3fa9c538c0c0fbc` (HEAD when the base clone was made; the commit
  "the hooks-in-process slice is dropped on a measured no-go", which adds only slice 4's plan file).
  The build started at `d0a0cc9b32b422da9fa7e86ae56432399313ea48`; the two commits differ in that one
  plan file only (`git diff --stat`: 1 file, 1323 insertions), so the red run's inputs are the same as
  `BASE`'s. The base clone is at `BASE`.
- `git status --porcelain` before the proof and timing runs listed paths under `plans/`, one directory
  under `.ctoc/audit/dispatches/`, and the untracked `IRON_LOOP.md` at the repository root (named in the
  brief as owner-excluded). `make-base.js` copies that file into the base clone, so both trees hold the
  same inputs; the proof's hash comparison (below) shows the two sides scan the same value.

### Step 8: the red (probe on the unchanged tree, clean runs)

`node --test --test-reporter=tap <file>` with `NODE_OPTIONS=--require=SCRATCH/s5/scan-probe.cjs`,
`S5_POISON=0`. Each run exits 0 with 0 failed. Reports (`SCRATCH/s5/reports/red-*`):

| File | Calls by the test file | Distinct values | Containers | Frozen | Writes refused | Writes accepted | Calls by other files |
|---|---|---|---|---|---|---|---|
| `tests/export-reachability.test.js` | 3 (1 required) | 1 | 5 | 0 | 0 | 5 | none |
| `tests/unexecutable-instruction-fence.test.js` | 10 (1 required) | 1 | 18 | 0 | 0 | 18 | 1 by `src/lib/iron-loop-enforcer.js` |

Both counts name the test file as the caller (3 and 10, the plan's census), which shows the stack line
read in the wrapper's body names the right frame. So the once-per-file and frozen checks fail on the
unchanged tree, as Step 8 requires.

### Step 9: the proof on the unchanged tree

`node SCRATCH/s5/prove-same-proof.js <BASE> tests/export-reachability.test.js tests/unexecutable-instruction-fence.test.js`
(output: `SCRATCH/s5/proof-unchanged2.out`):

- Assertion calls, base against new: 28 and 28 (export-reachability), 55 and 55 (unexecutable fence),
  multisets equal. Nested test names: 20 and 20, 28 and 28, multisets equal. Both clean runs per file:
  exit 0, 0 failed, 0 cancelled, 0 skipped, 0 todo, no SKIP or TODO directive.
- Both poisoned runs per file exit non-zero with the same failure set on the base and the new side.
  Export-reachability: 9 `not ok` paths, holding all 7 reading cases. Unexecutable fence: 14 paths,
  holding cases 1, 6, 8, 10, 11, 13, 14, 15, 16, 20, 22, 23, 25. Nothing beyond the listed cases failed.
- Base and new reports are equal (same value hash `265fcdcd896bbbfa...` for export-reachability,
  `4207bc0249fd1f6e...` for the fence; equal to a fresh scan; 1 distinct value among the old calls).
- Exactly the three expected failures per file, and no other: once per file (3 and 10 calls where 1 is
  required), containers frozen (0 of 5 and 0 of 18), writes refused (0 of 5 and 0 of 18). The proof
  works on both sides.
- Proof faults found and fixed in the proof (not in a test file): the first run failed
  "subtest lines, result lines and the tests counter differ" on all four clean runs, because the
  runner's `# tests` counter counts leaf tests only while subtest lines also count each `describe`
  suite (export-reachability 17 tests + 3 suites = 20 subtests; fence 27 + 1 = 28). The check now
  compares subtest lines and result lines with tests plus suites. The first run's output is in
  `SCRATCH/s5/proof-unchanged.out`.
- Other deviations: `SCRATCH/s5/BASE` collided with the directory `SCRATCH/s5/base` on this machine's
  case-insensitive file system; the file was renamed `base-commit.txt`.

### Step 9: the go or no-go, `SCRATCH/s5/scan-cost.js`, run once (output `SCRATCH/s5/scan-cost.out`)

18 cores, Node v24.14.1, one-minute load 31.7 at start and 31.0 at end (high: the machine was busy
with other work; processor time per call can be inflated by contention, which only favours a file
reaching the bar). Processor time per call in seconds (`process.cpuUsage()`, user plus system, whole
process), fresh process per file, one cold call then five warm calls:

| File | Scan | Cold | Warm calls | Warm median | Removable | Removable x median | Recorded wall-clock saving, Run A / Run B | Verdict |
|---|---|---|---|---|---|---|---|---|
| `tests/export-reachability.test.js` | `analyzeExports` | 0.388 | 0.349 0.322 0.322 0.320 0.322 | 0.322 | 2 | 0.645 | 1.03 / 2.13 | candidate, **dropped: under 1.0 s** |
| `tests/unexecutable-instruction-fence.test.js` | `scan` | 0.073 | 0.062 0.070 0.061 0.058 0.060 | 0.061 | 9 | 0.547 | 0.99 / 1.65 | candidate, **dropped: under 1.0 s** |
| `tests/golden-corpus-fence.test.js` | `scanGoldenCorpus` | 0.101 | 0.080 0.073 0.070 0.073 0.069 | 0.073 | 6 | 0.436 | about 0.77 / about 1.8 | left out, under 1.0 s |
| `tests/false-green-fence.test.js` | `scanFalseGreen` | 0.162 | 0.087 0.064 0.057 0.063 0.062 | 0.063 | 6 | 0.381 | 0.58 / 1.82 | left out, under 1.0 s |
| `tests/reachability.test.js` | `analyze` | 0.119 | 0.081 0.079 0.085 0.080 0.081 | 0.081 | 1 | 0.081 | 0.14 / 0.29 | left out, under 1.0 s |
| `tests/claim-census.test.js` | `censusCorpus` | 0.021 | 0.016 0.017 0.015 0.019 0.017 | 0.017 | 2 | 0.034 | about 0.08 / at most 0.25 | left out, under 1.0 s |

The rule as written: a file is converted only at removable x warm median of 1.0 s or more. None
reaches it (the largest is export-reachability at 0.645 s). Both candidates are dropped with their
numbers; no left-out file reached the bar, so none is reported for adding. The measurement was run
once and not repeated. The recorded wall-clock estimates (about one second each) were wall-clock
durations inside loaded whole-suite runs; the processor time the removed calls actually cost is 0.645 s
and 0.547 s even at a load of 31 on 18 cores.

Per the plan, with no file qualifying: Step 10 makes no edit, the before whole-suite run is not made,
the converted-file lint, proof, presence checks, review packets, pairs and whole-suite timing run do not
exist, and the build ends here. Acceptance criteria 1, 34, 35 and 36 stay open with the reason at the
end of their lines; criterion 2 stays open for the CTO Chief's one full `npm test`.

### Findings for the owner

- The census's wall-clock estimate (about 1 s per candidate) overstated the processor time of the
  removable calls by about 1.5 to 2 times; the profile's "15 to 25 s" estimate for repeated scans
  (functional plan lines 39 and 42) is not reachable by test-file-level sharing in this repository:
  the six repeating files together hold 0.645 + 0.547 + 0.436 + 0.381 + 0.081 + 0.034 = 2.12 s of
  removable processor time by this measurement.
- Scripts written (not committed, in `SCRATCH/s5/`): `scan-probe.cjs`, `make-base.js`,
  `prove-same-proof.js`, `scan-cost.js`, `pairs.js`, `red-run.js`, `annotate-plan.js`.
