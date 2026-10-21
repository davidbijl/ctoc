---
title: "The check's default time limit covers the full test suite"
type: implementation
created: 2026-10-11
priority: high
effort: small
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s1-build-tests-seed-their-plan-file
files:
  - src/lib/step-13-verify.js
  - tests/verify-fails-loudly.test.js
---

# The check's default time limit covers the full test suite

Slice 15 of `plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`. The owner added it on
2026-10-11 (relayed by the coordinating session); it is not one of the parent's five suggested slices. It is built after
slice 1 and before slice 2. Every line number below was read at v6.14.125 for this plan.

## Problem Statement

- `menu task complete <id>` on a build runs the Step 14 check. The path: `taskComplete` (`src/lib/menu-screens.js` line
  2360, the call at line 2416) → `completeTaskPlan` (`src/lib/actions.js` line 1377, the call at line 1421) →
  `completeExecution` (line 1017) → `persistVerifyResult` (line 1067; `src/lib/step-13-verify.js` line 935) → `runVerify`
  (line 115) → `runFallbackChecks` (line 655). That function runs `npm run lint`, `npm run typecheck` and `npm test`, each
  through its own `tryCommand` call (line 751).
- `tryCommand` takes each command's wall-clock limit from `resolveVerifyTimeout` (line 724, called at line 768). The order
  is: a positive numeric `opts.timeout`, then `CTOC_VERIFY_TIMEOUT_MS` when it is a positive finite number, then **120000 ms**
  (line 731). No caller passes `opts.timeout`: `tryCommands` calls `tryCommand(cmd, cwd)` (line 864), and `runVerify`
  calls `tryCommand('ctoc quality --tier=1', projectPath)` (line 127).
- This repository's `npm test` (`node src/scripts/test-gate.js --experimental-test-coverage`, `package.json` line 11) took
  139 s on 2026-10-11 with 13,136 tests. That figure was relayed by the coordinating session and was not re-measured for this
  plan. Three full runs recorded in `plans/done/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s1-the-hotfix-check.md`
  (line 5366) each took between 2 min 24 s and 2 min 29 s. On today's default the test command is killed at 120 s, and the
  completion records the run as UNCERTIFIED (lines 787-795). That refuses the check on a green suite.
- The only way to raise the limit is the environment variable. CTOC's write protection refuses a background agent's menu
  call that carries an `env` or `NAME=value` prefix (`src/hooks/protect-records.js`, header line 69). So a build agent
  cannot finish its own build: every completion comes back to the main session, which runs it with
  `CTOC_VERIFY_TIMEOUT_MS=900000` (`HANDOFF.md` line 91).

**Fix:** the default becomes 900000 ms (15 minutes). This is the CTO Chief's choice and the value the main session has used
for this repository's completions. The variable overrides it exactly as today, and no hook changes.

## Implementation Details

### Dependency Graph

```
tests/verify-fails-loudly.test.js --calls--> src/lib/step-13-verify.js#resolveVerifyTimeout (new export)
tests/verify-fails-loudly.test.js --calls--> src/lib/step-13-verify.js#tryCommand (existing, V8/V8b)
src/lib/step-13-verify.js#tryCommand --calls--> resolveVerifyTimeout (line 768, unchanged)
```

No new module and no new `require`.

### File Specifications

#### File: `src/lib/step-13-verify.js`
**Action:** MODIFY
**Purpose:** the Step 14 check runner; its per-command time limit gets a default that covers the full suite.
**Change Type:** modify-existing

#### Changes
- **`resolveVerifyTimeout`, line 731:** `return 120000;` becomes `return 900000;`. Nothing else in the function changes. A
  positive finite `override` still wins, then a positive finite `CTOC_VERIFY_TIMEOUT_MS`, then the default.
- **`resolveVerifyTimeout`, lines 725 and 729:** `Number.isFinite(override)` becomes `Number.isInteger(override)` and
  `Number.isFinite(n)` becomes `Number.isInteger(n)`. A fractional value (`'1.5'`) now falls back to the default instead of
  reaching `execSync`, which rejects a non-integer timeout with `ERR_OUT_OF_RANGE` that the generic catch recorded as a
  failing check. `Number.isInteger` implies finite, so no other guard changes.
- **Its JSDoc, lines 715-719:** "the 120000ms default" becomes "the 900000ms (15-minute) default". Add one sentence: "The
  limit is per command, so it must cover the longest single check; this repository's own `npm test` took 139 s on
  2026-10-11."
- **File header, lines 33-35:** "default 120000ms" becomes "default 900000ms, 15 minutes".
- **`module.exports`, lines 982-993:** add `resolveVerifyTimeout` after `tryCommand`. The dead-export fence still counts it
  as live because `tryCommand` calls it inside the same module. Under `src/lib/reachability.js` lines 818-829, an export
  whose name appears at least twice in its own comment-stripped body (the definition plus a call) is live, and
  `tests/export-reachability.test.js` line 260 pins that rule.
- **Unchanged:**
  - The history comment at lines 762-767 ("Hardcoding 120000 meant …"). It describes the state before the limit became
    raisable, and it is still true as history.
  - The timeout message at lines 791-793.
  - The variable's validation at lines 725-730, apart from the integer check above.

#### Exports (new export of an existing function)
- `resolveVerifyTimeout(override?: number)` → `number`
  - Description: the per-command wall-clock limit in ms.
  - Throws: nothing, on any environment value.
  - Examples:
    - unset variable, no override → `900000`
    - `CTOC_VERIFY_TIMEOUT_MS='250'` → `250`
    - `'abc'` → `900000`
    - `resolveVerifyTimeout(300)` → `300`

#### Dependencies
None added.

#### Called By
`tryCommand` (line 768). The test file reads it from outside the module; no other code does.

#### Error Handling
Unchanged. A malformed variable falls back to the finite default and never to "no limit" (lines 717-719). A run that
reaches the limit is reported as UNCERTIFIED, never as a test failure (lines 787-795).

#### Cross-Platform Notes
No path, shell or OS-specific change. `execSync`'s `timeout` behaves the same on Windows, macOS and Linux.

#### File: `tests/verify-fails-loudly.test.js`
**Action:** MODIFY
**Purpose:** pin the new default, and pin that the variable still overrides it and still falls back to it.
**Change Type:** modify-existing

Add a new `describe` after the existing timeout group, after line 190. It has one local helper that sets or deletes
`CTOC_VERIFY_TIMEOUT_MS` for one call and restores the previous value in `finally`, the same restore V8b does at lines
185-188. V8 and V8b do not change.

```js
describe('resolveVerifyTimeout — the default limit covers the full suite', () => {
  function withVerifyTimeoutEnv(value, fn) {
    const prev = process.env.CTOC_VERIFY_TIMEOUT_MS;
    if (value === undefined) delete process.env.CTOC_VERIFY_TIMEOUT_MS;
    else process.env.CTOC_VERIFY_TIMEOUT_MS = value;
    try { return fn(); } finally {
      if (prev === undefined) delete process.env.CTOC_VERIFY_TIMEOUT_MS;
      else process.env.CTOC_VERIFY_TIMEOUT_MS = prev;
    }
  }
  // V8c, V8d, V8e, V8f as in the Test Plan below.
});
```

### Test Plan

**File:** `tests/verify-fails-loudly.test.js`, written first. It uses `node:test` and `node:assert/strict`, as the file
already does.

1. **V8c, the default covers the suite.** Delete the variable; setting it to an empty string is not enough, because a session
   that runs `CTOC_VERIFY_TIMEOUT_MS=900000 npm test` passes it on to the test process. Then
   `verify.resolveVerifyTimeout()` must equal `900000`.
2. **V8d, a valid variable still overrides the default.**
   - `'250'` gives `250`, below the default.
   - `'1800000'` gives `1800000`, above the default, so the limit can be raised past it.
3. **V8e, an invalid variable falls back to the default.** Each of `''`, `'abc'`, `'0'`, `'-5'` and `'1.5'` gives
   `900000`, and `resolveVerifyTimeout(300.5)` with the variable unset gives `900000`. The assertion message names the value
   tried.
3b. **V8f, a fractional variable does not fail the check.** With `CTOC_VERIFY_TIMEOUT_MS='1.5'`,
   `verify.tryCommand('node -e "process.exit(0)"', dir)` returns `success: true`. Red today: the believed Node behaviour
   makes `execSync` throw `ERR_OUT_OF_RANGE`, which is recorded as `success: false`. Step 8 records the actual result. If
   V8f passes at Step 8, record that the belief was wrong; the case stays as a guard.
4. Every case restores the variable to its earlier value, also when an assertion fails.

**Red first:**
- At Step 8, all three cases fail with "verify.resolveVerifyTimeout is not a function".
- After Step 9's export, V8c and V8e fail on the value (`120000` where `900000` is expected, and `1.5` and `300.5`
  returned as given), V8f fails as at Step 8, and V8d passes. After Step 10, all four pass.

**Why no end-to-end case on the default:** seeing a 900000 ms limit fire through `tryCommand` takes 15 minutes. V8 and V8b
already show that `tryCommand` hands the resolver's value to `execSync`: with `opts.timeout` 300, and with the variable set to
`'250'`, the command is terminated and reported UNCERTIFIED. The new cases show which value the resolver returns. The
completion of this slice itself is the live check (see the acceptance criteria).

**Coverage:** no new branch. The fall-back branch, the variable branch and the override branch already exist, and are now
each asserted on their value.

### Security Review
- [x] No new input: the same environment variable, read by the same lines (725-730).
- [x] Still bounded. Every command keeps a finite limit, and a hung command is now killed after at most 15 minutes instead
  of 2. Malformed values still fall back to a finite default, never to "no limit".
- [x] No hook or write-protection change: `src/hooks/protect-records.js` is not touched.
- [x] No path, secret or shell change. The command strings are still fixed candidates and never user input (lines 737-739).
- [x] Error messages are unchanged.

### Wiring — the live call sites
`resolveVerifyTimeout` is already live. Its calling chain, from the inside out:

1. `tryCommand` (line 768)
2. `tryCommands` (line 864)
3. `evalCategory` (line 344)
4. `runFallbackChecks` (lines 681, 688 and 696)
5. `runVerify` (line 140; its `ctoc quality` attempt at line 127 calls `tryCommand` directly)
6. `persistVerifyResult` (line 936)
7. `completeExecution` (`src/lib/actions.js` line 1067)
8. `completeTaskPlan` (`src/lib/actions.js` line 1421)
9. `taskComplete` (`src/lib/menu-screens.js` line 2416)
10. `node src/commands/start.js menu task complete <id>`, the menu that the shipped `/ctoc:start` command runs

The new export adds no call path. The test is the only reader outside the module.

## Acceptance Criteria

- [x] With `CTOC_VERIFY_TIMEOUT_MS` unset, `resolveVerifyTimeout()` returns 900000 (V8c). Evidence: V8c passes in the Step 14 runs, in a shell where the variable was unset.
- [x] A valid variable still overrides the default, both below and above it (V8d). Evidence: V8d passes.
- [x] An invalid variable (`''`, `'abc'`, `'0'`, `'-5'`) still falls back to the default, which is now 900000 (V8e). Evidence: V8e passes.
- [x] A fractional variable (`'1.5'`) or override (`300.5`) falls back to the default (V8e), and `tryCommand` under `'1.5'`
  runs a passing command as `success: true` (V8f). Evidence: V8e and V8f pass.
- [x] V8 and V8b pass unchanged. Evidence: the file run shows 13 of 13 passing; the Step 12 edits touched comments only and neither test was edited.
- [x] The file header and the `resolveVerifyTimeout` JSDoc state 900000 ms, and the JSDoc says the limit is per command. Evidence: both re-read after the Step 12 edit; a search for the literal 120000 in the file matches one line, the history comment. In
  `src/lib/step-13-verify.js`, the literal `120000` remains only in the history comment that begins "Hardcoding 120000
  meant".
- [x] `npm test` passes (13140 of 13140, coverage 99.88% against 99, 0 skipped, 0 failed; see the Step 14 record): lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped
  and 0 flaky. This includes the dead-export fence (`tests/export-reachability.test.js`), with
  `.ctoc/export-reachability-baseline.json` unchanged.
- [x] (Verified by (a) V8c passing with the variable unset in the shell, and (b) a measured `npm test` of about 151 s wall clock, well under 900 s. The completion's own evidence record will confirm it.) This slice's own completion is run as `node src/commands/start.js menu task complete <id>` with no
  `CTOC_VERIFY_TIMEOUT_MS` set. Its recorded evidence (`.ctoc/state/verify/<slug>.json`) shows that the tests check ran and
  passed, not UNCERTIFIED.
- [x] No file outside `files:` changed, and nothing under `src/hooks/` changed. Evidence: this slice's edits were to the two declared files only; a modification-time search of `src/hooks/` and of the export-reachability baseline found nothing changed in the last four hours. Git was refused to this agent, so no diff was read.

## Decisions Taken Under Ambiguity

1. **The default stays a number inside the resolver.** It has one reader, so it gets no named constant and no setting.
2. **The test reads the resolver through a new export.** The alternative was to replace `execSync` in a child process. The
   file's tests use no doubles ("ZERO doubles", header lines 22-23), and the export stays live under the fence through its
   internal call.
3. **"Covers the full suite" means it covers the longest single command.** The limit is per command: `tryCommand` resolves
   it on every call, so lint and typecheck each get their own 900000 ms. The longest single command is `npm test`, and
   900000 ms is about six times the 139 s measured.
4. **History comments that name the old hard-coded value stay.** These are `src/lib/step-13-verify.js` lines 762-763 and
   `tests/verify-fails-loudly.test.js` line 154. They explain why the limit was made raisable, and they are still true.
5. **The variable's validation is unchanged except for whole numbers.** A fractional variable or override now falls back
   to the default, matching the JSDoc's existing "positive finite integer" and its "falls back to the default" rule. It is
   fixed here because this slice edits the same function, the same JSDoc and the same fall-back test.
6. **Known limit, not changed here.** In an agent's foreground shell call, Claude Code's own command limit (at most 10
   minutes) stops a completion before a 15-minute check limit could fire. That 10-minute figure is believed from the tool's
   documented maximum, also stated in `agents/iron-loop/iron-loop-executor.md` line 296; it was not checked in this
   session. The check's own limit decides only for a call started in the background. Today's suite fits under both.

**Open question:** none. The value was chosen by the CTO Chief and relayed as decided.

## Neighbours (seen, not built here; scheduling is the owner's)

- `plans/functional/affected-tests-while-building-whole-suite-before-push.md` line 456 says "The completion route's default
  time budget is 120000 milliseconds". It is stale once this slice lands.
- `HANDOFF.md` line 91: the `CTOC_VERIFY_TIMEOUT_MS=900000` prefix in the completion recipe becomes redundant but stays
  harmless. HANDOFF.md is committed only through `/handoff`.
- `plans/done/00016-r4a-verify-fails-loudly.md` line 325 and `plans/done/00252-close-the-coverage-holes-s18-remainder-hooks-commands.md`
  line 331 name the 120 s limit as it was at the time. Done plans are records and are not edited.
- The timeout message (lines 791-793) tells the reader to raise the limit with `CTOC_VERIFY_TIMEOUT_MS`. A background agent
  cannot set that variable on a menu call (`src/hooks/protect-records.js` line 69).
- Security scanner, low: `CTOC_VERIFY_TIMEOUT_MS` has no upper cap, so a very large value is accepted as given. This was true
  before this slice (availability only) and is not changed here; it is for the owner to schedule.
- Security scanner, low: the worst-case completion time grows to 4 commands of up to 15 minutes each. Accepted.
- Slice 2 (`…-s2-the-task-start-moves-the-plan.md`) lists only slice 1 in its `depends_on`. So no plan file puts this slice
  before slice 2; the order comes from the order in which the CTO Chief starts them.

## Execution Plan

### Step 8: TEST
- [x] Add V8c, V8d, V8e and V8f to `tests/verify-fails-loudly.test.js`.
- [x] Run `node --test tests/verify-fails-loudly.test.js`. Record that V8c, V8d and V8e fail with
  "verify.resolveVerifyTimeout is not a function", that V8f fails on `success` (or, if it passes, that the belief was
  wrong), and that V1 to V8b pass. (Recorded in the Execution Record.)

### Step 9: PREPARE
- [x] Add `resolveVerifyTimeout` to `module.exports` in `src/lib/step-13-verify.js`.
- [x] Re-run the file. Record that V8c and V8e now fail on the value (`120000` where `900000` is expected), and that V8d
  passes. (Recorded in the Execution Record.)

### Step 10: IMPLEMENT
- [x] `src/lib/step-13-verify.js`, in this one step:
  - the default becomes 900000 (line 731);
  - lines 725 and 729: `Number.isFinite` becomes `Number.isInteger`;
  - the JSDoc (lines 715-719) states the new default and that the limit is per command;
  - the file header (lines 33-35) states the new default.
- [x] Re-run the file and record that every case passes.

### Step 11: REVIEW
- [x] The critic (extra-high) found no blocking and no should-fix finding; three nits, applied at Step 12. The critic checks four points:
  - inside the resolver only the default and the two integer checks changed;
  - V8 and V8b are untouched;
  - the new export is live under the dead-export fence;
  - the comments say the limit is per command and give the measured reason.

### Step 12: OPTIMIZE
- [x] Nothing to optimize in the code: one number, one export and two comments. The three review nits were applied, comments only, no behaviour change (see the Execution Record).

### Step 13: SECURE
- [x] The security scanner (extra-high): verdict warn, no critical and no high finding. The scanner confirms three points:
  - every command still has a finite limit;
  - no new input is read;
  - no hook file and no write-protection file changed.

### Step 14: VERIFY
- [x] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped,
  0 flaky.
- [x] Record the run's wall-clock time and its test count, as evidence that 900000 ms covers the suite. (Execution Record, Step 14.)

### Step 15: DOCUMENT
- [x] The file header and the JSDoc carry the new default and the per-command note.
- [x] No other document states this default. The search `120000|CTOC_VERIFY_TIMEOUT_MS` over `docs/`, `README.md` and
  `CLAUDE.md` found no match on 2026-10-11. The stale sibling-plan sentence is listed under Neighbours.

### Step 16: FINAL-REVIEW
- [x] Every acceptance box is checked against its evidence. This includes this slice's own completion evidence, recorded
  without the environment variable.

## Execution Record

### Step 8 (red)
V8c to V8f added after the existing timeout group of `tests/verify-fails-loudly.test.js`. First run: 13 tests, 9 pass
(V1 to V8b), 4 fail.
- V8c, V8d, V8e: `TypeError: verify.resolveVerifyTimeout is not a function`, as predicted.
- V8f: failed on `success`, and the belief was right. `tryCommand` returned `success:false, spawnFailed:false` with the
  error `The value of "timeout" is out of range. It must be an unsigned integer. Received 1.5` (`execSync`'s
  `ERR_OUT_OF_RANGE`, recorded by the generic catch as a failing check).

### Step 9 (export added)
`resolveVerifyTimeout` added to `module.exports`. Second run: 10 pass, 3 fail.
- V8c: `120000 !== 900000`.
- V8e: `120000 !== 900000` on the first bad value (`''`); the loop stops there, so `'abc'`, `'0'`, `'-5'`, `'1.5'` and
  `300.5` were not yet reached.
- V8f: unchanged from Step 8 (same `Received 1.5` error).
- V8d passes (it asserts the override values, which already worked).

### Step 10 (green)
`src/lib/step-13-verify.js`: default `120000` to `900000`; `Number.isFinite` to `Number.isInteger` at both checks;
JSDoc states 900000 ms (15 minutes), that the limit is per command, and the 139 s measurement; file header states
"default 900000ms, 15 minutes". The history comment ("Hardcoding 120000 meant ...") is untouched. Re-run of the file:
13 tests, 13 pass, 0 fail, 0 skipped.

`npm test` (foreground): tests 13140, pass 13140, fail 0, skipped 0; test-gate line `coverage 99.87% (threshold 99%),
skipped 0, failed 0`, `PASS`; mocha-style duration reported by the runner 143 s (143145 ms). This is one run, so it shows
the suite is above the old 120 s default and below the new 900 s one on this machine; the flaky count is not measured by a
single run.

## Decisions Taken Under Ambiguity (build)

1. V8e checks each bad value in one loop inside a single test, so the first failing value hides the later ones while red.
   The assertion message names the value tried, as the plan requires.

### Step 11 to 13 (reviews)
- Step 11, critic (extra-high): no blocking and no should-fix finding; three nits (JSDoc precedence wording, the measured
  figure, header wrap).
- Step 12: all three applied in `src/lib/step-13-verify.js`, comments only. The JSDoc now says an explicit positive-integer
  override wins, and that a malformed override or environment value is ignored and falls through to the next source. The
  measurement reads "about 140 s (139-143 s)". The header lines were re-wrapped to the header's width. No behaviour change.
- Step 13, security scanner (extra-high): verdict warn, no critical or high finding. Two low findings (no upper cap on the
  variable, a pre-existing availability matter; worst-case completion time up to 4 x 15 minutes, accepted) are listed under
  Neighbours. Missing evidence: the CTO Chief runs the secrets detector and the static scanner on the combined change before
  the release.

### Step 14 (verify)
After the Step 12 edits: `node --test tests/verify-fails-loudly.test.js` gave 13 tests, 13 pass, 0 fail, 0 skipped.
`npm test`, foreground, with `CTOC_VERIFY_TIMEOUT_MS` unset in the shell: tests 13140, pass 13140, fail 0, cancelled 0,
skipped 0; runner duration 135437 ms; wall clock about 151 s (real 150.96 s); test-gate line `coverage 99.88% (threshold 99%),
skipped 0, failed 0`, corpus claims verified 3 refuted 0 unverifiable 0, `PASS`. An earlier run in the same state gave the same
`PASS` at 99.87%. The flaky count is not measured by single runs. The wall clock is about one sixth of the 900 s limit.

### Step 15 (document)
No user-facing text was edited. Text that states the old 120 s default, all outside this slice and listed, not edited:
- `plans/functional/affected-tests-while-building-whole-suite-before-push.md` line 456 (stale once this lands);
- `HANDOFF.md` line 91, where the `CTOC_VERIFY_TIMEOUT_MS=900000` prefix is now redundant but harmless;
- done-plan records (`plans/done/00016-r4a-verify-fails-loudly.md`, `plans/done/00252-close-the-coverage-holes-s18-remainder-hooks-commands.md`),
  which are not edited.

### Step 16 (final review)
Every acceptance box is ticked against the evidence above. The box about this slice's own completion is ticked on the two
checks the CTO Chief set: V8c passing with the variable unset, and a measured `npm test` well under 900 s. The completion's own
evidence record (`.ctoc/state/verify/<slug>.json`) will confirm it. The completion itself was not run by this agent.
