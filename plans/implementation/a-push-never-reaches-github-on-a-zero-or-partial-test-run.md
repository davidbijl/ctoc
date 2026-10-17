---
title: "A push never reaches GitHub on a run that tested nothing or only part of the suite"
type: functional
status: functional
created: 2026-10-14
priority: high
effort: small
depends_on: none
approved_by: human
approved_at: 2026-10-14T14:22:02.760Z
gate_crossed: functional → implementation
---

# A push never reaches GitHub on a run that tested nothing or only part of the suite

## Slices (dependency-ordered)

This plan is built as three small implementation plans in `plans/implementation/`, each linked
here by `parent_plan`. The functional plan text follows the table; on 2026-10-15 its Risks, Out
of Scope and Decisions 17-29 were amended to carry the CTO Chief's decisions of that day.

| # | Slice file | Scope (one line) | depends_on |
|---|------------|------------------|------------|
| 1 | `a-push-never-reaches-github-on-a-zero-or-partial-test-run-s1-whole-suite-check-in-the-push.md` | The one shared whole-suite check (`runWholeSuiteBeforePush` in `src/lib/quality-agent.js`, with the zero-test rules, a 15-minute limit per command, a recursion guard and counts read only from anchored summaries); `/ctoc:push` calls it, always states the command and the count, says plainly when `--skip-tests` ran no test, refuses when the commit moved during the checks and names uncommitted paths; the detector marks a configured test command; `push.md` and the `README.md` push line. Scenarios 1-10, 12, 13 and the recorded real dry run. | - |
| 2 | `a-push-never-reaches-github-on-a-zero-or-partial-test-run-s2-automatic-push-runs-the-whole-suite.md` | The after-commit quality agent uses the shared check (with `wholeTree`) when it is going to push (`--on-success=push`) and keeps the selected tests otherwise; it pushes only the commit it checked and never a pass whose count is unknown; its summary states the count. Scenario 11. | s1 |
| 3 | `a-push-never-reaches-github-on-a-zero-or-partial-test-run-s3-plan-sync-never-pushes.md` | With automatic pushing on, the plan sync commits but never pushes; its results and the Doctor's "Sync now" message say nothing was pushed and that `/ctoc:push` ships; `push.md`'s configuration bullet, the Commands menu's "Sync plans" description and its `README.md` row. Scenarios 14-19. | s1 |

How the sync constraints were met (recorded in slice 3): the sync never pushes, so no test suite
runs inside the menu process (no frozen menu) and nothing unchecked is pushed (checked equals
pushed). Scenarios 14 and 15 therefore take the same fallback wording the plan gives 16 and 19.
The reachability of `onPlanOperation` and `autoPush`, and of `runSmartTests` and
`runSpecificTests` from the post-commit root, is confirmed in the slices' "Wiring" sections.

## 1. ASSESS — Problem Understanding

### What the owner asked

> "is ctoc:push running tests before pushing if there are no github actions for testing?" (2026-10-14)

He was answered from the source and told that changing it is a change to a gate that waits for his OK. He replied:

> "improve the push" (2026-10-14)

In plain terms: before anything reaches the remote, the push runs the project's whole declared test suite and refuses to push when that run tested nothing. Today it can push after running a subset of the tests, or none.

### What is true on disk today

Everything below was read from the files named, in this worktree, on 2026-10-14. Nothing was run. Every statement about behaviour comes from reading the code, not from watching it run.

1. **The push's checks** (`src/commands/push.js`, read in full). Lines 94-107 run lint, type check, `runSmartTests` and the security scan, and the push happens only if all four pass (lines 125-151). `--skip-tests` skips only the test run (line 100); the security scan still runs (line 106). The file reads no CI workflow file. `src/commands/push.md` line 36 says `--skip-tests` runs "lint + typecheck only" and line 276 says "Only runs lint + typecheck". Both are wrong, because the security scan also runs. Its diagram (line 51) shows "tests (47 affected)".
2. **When the push runs the whole suite.** `runSmartTests` (`src/lib/quality-agent.js` 1128-1209) runs `runFullTests`, which is the project's own declared test command, in four cases. In this repository that command is `npm test`, which runs `src/scripts/test-gate.js` with the coverage floor and the zero-skipped rule. The four cases are: git cannot give the push delta (1149-1152); the delta is empty (1156-1159); `findAffectedTests` (`src/lib/coverage-map.js` 184) finds a changed configuration or lock file (195-221); or a changed file has no coverage-map entry and no test file named after it (244-248). Otherwise it runs `runSpecificTests` (1199-1201) on the tests the map or a filename guess links to the changed files.
3. **Two places where `runSmartTests` passes with zero tests run.**
   - Lines 1168-1171: "No file content changes detected. Cache valid." The function returns `passed: true, passCount: 0, cached: true`. This one can happen in real use, for example on a second push after a network failure, when nothing changed since the first push's passing run.
   - Lines 1190-1197: "No tests affected by changes." The function returns `passed: true, passCount: 0`. As far as I can read, the real `findAffectedTests` never produces this shape. Every changed file either adds at least one test or forces the whole suite. `tests/quality-agent-coverage-holes.test.js` (header lines 43-50) records the same conclusion and reaches the branch only by faking the map module.
4. **Two places where `runFullTests` (1030-1122) itself passes with zero tests run.**
   - (a) No detected language has a test command. That happens with an explicit `test: null` override, which deletes the undetermined flag (`src/lib/tool-detector.js` 600), or with an empty tool table. In that case `distinctCommands(tools, 'test')` (833-842) returns nothing, the loop never runs, and line 1108 prints "Tests passed (0 total)". `tests/quality-fleet-wiring.test.js` 816-823 asserts this on purpose: "an intentional no-test-command override must remain a pass". Compare `runLint` (853-882), which treats zero lint tools as "not verified", a non-pass.
   - (b) The runner exits 0 and prints a readable zero count. For node:test that is `ℹ pass 0` or `# pass 0`, for jest `Tests: 0 passed`, for mocha `0 passing` (parsers at 581-591).
   - A runner that exits 0 and prints no count at all also comes out as `passCount: 0`. Examples are a plain assertion script, or the project `tests/greenfield-journey.test.js` seeds at lines 134 and 153-157. This happens because `readRunnerCounters` (715-724) turns an unreadable pass count into 0. So today a run whose count is unknown looks the same as a run of zero tests.
5. **What already blocks the push.** A test command the detector could not determine, with no script and no recognised framework, blocks (`undeterminedTestsResult`, 457-463). A run that timed out, printed more than 10 MiB, could not start, or was refused returns a non-pass (`undeterminedRunResult` 500-510, `refusedTestsResult` 523-525). A summary that is printed but cannot be read also returns a non-pass (`unreadableTestsResult`, used at 1084-1089).
6. **The second way a push can happen.** The post-commit hook (`src/hooks/post-commit.js` 58-62) passes `--on-success=push` only when `git.autoPushEnabled` is on, and that setting is off by default. The hook itself is installed only on an explicit request (`tests/quality-fleet-wiring.test.js` 846-869). The quality agent's `main` (1922-1995) then calls `runTieredChecks` (1775-1803), which calls `runSmartTests` (1780). After that come `maybePushOnSuccess` (1856-1873) and `pushToRemote`. So the same zero-test pass, or the same run of only the selected tests, can reach the remote through the automatic push.
7. **Other callers whose behaviour must not change.**
   - `src/lib/hotfix-check.js` line 1861 calls `runFullTests(tools, { wholeTree: true })`.
   - `runTieredChecks` calls `runSmartTests`, both for the after-commit check and for the automatic push.
8. **How long the whole suite takes.** The figures come from `plans/done/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s15-the-check-time-limit-covers-the-suite.md` in the main checkout (that file is not in this worktree). This repository's `npm test` took 139 s (lines 31-32, a figure relayed to that plan and not re-measured there), 143 s as reported by the runner (line 320), and about 151 s of wall-clock time (line 343). Three earlier runs took 2 min 24 s to 2 min 29 s (line 33-34).
   - `runCommandArgv` stops each command at 300000 ms by default (line 178), so the limit is about twice the measured time. A run that hits the limit is reported as undetermined, which blocks the push.
9. **Ending the whole process tree.** The `wholeTree` option (161-168, 186, 191) starts the test command as the leader of its own process group and ends that group when the run ends. Lines 166-168 explain why it is off by default: "a process group of its own is a session of its own, so an interrupt typed at the terminal no longer reaches the tests, which an interactive `/ctoc:push` relies on." Decision 8 deals with this.
10. **The third way a push can happen: the plan sync** (`src/lib/sync.js`, read in full, 559 lines). Each function below commits and returns before any push when `isAutoPushEnabled` is off, the default (117-125, 358-360, 484-488). When it is on, each pushes with no test run at all:
    - `syncPlans` (94-142) commits `plans/` (108-111), then runs `git pull --rebase origin main` (129, a failure is ignored at 130-132), then `git push origin main` (134). It pushes the local `main` whatever branch is checked out, and the pull rebases the checked-out branch onto `origin/main`. Two callers:
      - `startAutoSync` (62-83) runs it once immediately (82) and then on an interval timer (77-79), every 5 minutes by default (64). `src/commands/start.js` calls `startAutoSync` at line 963, when the menu opens in a terminal (960), before the keyboard is set up (968).
      - `manualSync` (150-152) returns `syncPlans`' result. `src/tabs/tools.js` calls it at line 431, the Doctor's "Sync now" key, and line 432 shows "✓ Synced successfully" whenever the result's `synced` is true. A commit with no push therefore reads as success on the screen.
    - `autoPush` (355-372) commits nothing. It runs `git push origin <config.branch>` (363). `config.branch` is `main` unless a `sync.branch` setting is read (32, 186-187); whether `loadSettings` ever returns one was not checked. Its one caller is `onPlanOperation` (375-422), which commits through `autoCommitPlan` (402) and calls `autoPush` when online and committed (406-407). A text search found no caller of `onPlanOperation` outside `src/lib/sync.js` (pattern `fullPlansSync|syncPlans|manualSync|autoPush\b|onPlanOperation|startAutoSync`: 22 files over the repository, 4 over `src/`: `src/lib/sync.js`, `src/commands/start.js`, `src/tabs/tools.js`, `src/commands/start.md`). The repository's dead-export fence lists `src/lib/sync.js#onPlanOperation` as an export with no live caller (`.ctoc/export-reachability-baseline.json` line 60). `autoPush` counts as live only through that caller.
    - `fullPlansSync` (440-502) pulls with rebase (452), commits `plans/` (464-478), and runs `git push origin <current branch>` (490-495). It is reached through the menu recipe `claude:sync` (`src/commands/start.md` line 67: "Run fullPlansSync(), show result"), which the session runs.
    - Every one of these is synchronous. The sync commits only `plans/`, so any other uncommitted change in the working tree is present when a test runs but is not in what is pushed.
11. **The whole-suite run holds the process.** `runFullTests` is declared `async` (`src/lib/quality-agent.js` 1030), but each command goes through `runProjectTestCommand` (called at 1048, defined at 417-426), then `runNpmTool` (270) or `runConfiguredCommand` (378), then `runCommandArgv`, which calls `spawnSync` (177-179). Awaiting it does not free the event loop: for the length of the run nothing else in the same process runs, including the menu's key handling. It also prints progress with `console.log` (1043).

### The problem in one paragraph

The push is the last check before code reaches the remote, and with no CI workflow it is the only one. Today it can let code through after running only the tests a coverage map or a filename guess picked. It can also let code through after running no test at all: a cached "nothing changed" answer, a project with no test command, a run that counted zero tests. The automatic push has the same gaps, and with automatic pushing on, the plan sync pushes the whole branch with no test run at all. The owner asked for the push to be improved. The improvement is that every push CTOC makes runs the whole declared suite first (unless the human passes `--skip-tests` to `/ctoc:push`), never counts "nothing ran" as a pass, and always says how many tests ran.

## 2. ALIGN — Approach

**What the owner needs:** when he ships, he wants the whole suite to have just run and passed, so that nothing untested reaches GitHub, whether or not the repository has a CI workflow.

### The push's test check

Before every push, `/ctoc:push` runs the project's whole declared test command, once per distinct command (`distinctCommands`), with the runner's default process handling (no `wholeTree`, Decision 8). The selected-tests path and both zero-test passes are no longer part of the push. Each distinct command is judged on its own, and if any command blocks, the push is blocked:

| What the run showed | Verdict | What the output says |
|---|---|---|
| Exit 0, a readable count above zero, no failure counted | pass | the command, tests passed, tests skipped |
| Exit 0, no count printed at all | pass | the command, and that the runner reported no test count (never "0 tests ran") |
| Exit 0, a readable count of zero passing tests (including a run whose only tests were skipped) | **block** | the command, and that zero tests ran |
| No detected language has a test command | **block** | no test command was found, nothing was tested, and `--skip-tests` is the way to push without tests |
| A failure: non-zero exit, failures counted despite exit 0, flaky | block | as today, with the counts |
| Timed out, more than 10 MiB of output, not started, refused, unreadable summary, undetermined command | block | as today, with the reason |

The push output always states how many tests ran and which command ran them, whether the push succeeds, is a dry run, or is blocked. It states this both on the console and in the returned `text`. The skipped count is shown but does not block the push (Decision 6).

`--skip-tests` stays. Lint, type check and the security scan still run. The output says plainly that no test ran before this push.

### One rule, one place

The zero-test rules sit in a single function in `src/lib/quality-agent.js`. That function runs the whole suite and applies the table above, and every push path calls it: `/ctoc:push`, the automatic push, and the sync functions whenever they push. `runFullTests` keeps its current `passed` verdict for every input, so the hotfix check's answers do not move. Any new field on its result is added alongside the existing ones and changes nothing that is already there (for example, whether a pass count was actually read, and how many commands ran).

### The automatic push

When the quality agent is going to push (`--on-success=push`), its test check is the same whole-suite check with the same zero-test rules. `maybePushOnSuccess` still checks `git.autoPushEnabled` before pushing, so the flag only says what the agent intends. With `--on-success=none`, the after-commit check keeps running the selected tests through `runSmartTests`, as it does today. This matches the earlier plan's Decision 19. Decided by the coordinator on 2026-10-14 (Decision 10).

### The plan sync pushes

Decided by the coordinator on 2026-10-14 (Decision 15). The implementation planner may build this as its own slice.

**Requirement.** When automatic pushing is on, no function in `src/lib/sync.js` pushes unless the shared whole-suite check (the one function `/ctoc:push` and the automatic push call, with the same zero-test rules in the table above) has just passed on exactly what is being pushed. When the check does not pass:

- the sync still commits where it commits today (local and reversible, unchanged);
- it does not push;
- its result says plainly why nothing was pushed and how many tests ran (or that the count is unknown, or that no test command was found);
- the Doctor's "Sync now" message (`src/tabs/tools.js` 432) shows that reason instead of "✓ Synced successfully".

When the check passes, including a pass whose count could not be read (Decision 5), the sync pushes as today and its result states the count, or that the count is unknown. With automatic pushing off, behaviour is unchanged: no check runs, nothing is pushed, and the Doctor message stays as it is.

**Constraints the implementation planner resolves and records (not decided here):**

- **A frozen menu.** The sync functions are synchronous. `startAutoSync` runs `syncPlans` immediately when the menu opens (before the keyboard is set up) and then on a timer, and the Doctor key calls the same function. A whole-suite run takes about 2.5 minutes on this repository, and `runFullTests` holds the process for that time even when awaited (fact 11). Run inside these paths, it would freeze the menu, and its `console.log` progress would print over the menu screen. The planner chooses how to meet the requirement without that. Refusing to push from the sync, and pointing to `/ctoc:push`, is an acceptable choice only if the result says so plainly.
- **What the check ran on must be what is pushed.** `syncPlans` and `autoPush` push the local `main` (or `config.branch`) whatever branch is checked out. `fullPlansSync` pushes the current branch. The sync commits only `plans/`, so other uncommitted changes would be tested but not pushed. `syncPlans` and `fullPlansSync` pull with rebase before pushing, so a check run before the pull did not test the result of the pull. The planner either makes the checked commit and the pushed commit the same, or refuses the push and says why.
- **The time limit of the session.** `claude:sync` is run by the session (`src/commands/start.md` line 67). If `fullPlansSync` runs the suite, the same session time limit applies as for `/ctoc:push` (see Risks), and the recipe needs the same 10-minute note.
- **Reachability of `onPlanOperation` and `autoPush`.** The planner confirms it by call graph, or by the repository's reachability and export fences, and records how. Whatever the result, no exported function in `src/lib/sync.js` may push without the check. This repository has deleted dead code rather than wiring it before (`.ctoc/export-reachability-baseline.json`, comment on line 2); that choice is the planner's.

### What stays

`runSmartTests` and `runSpecificTests` stay. The after-commit check still calls them through `runTieredChecks`, and `src/hooks/post-commit.js` is a declared root in `.ctoc/reachability-roots.json` (lines 9 and 16). The implementation planner confirms the callers by reading the call graph or by running the repository's reachability and export checks, not by text search, and records how.

### Existing tests whose contract this replaces

These tests inject `runSmartTests` into `push.run` or patch it on the quality agent module:

- `tests/w10-push-entry-point.test.js`: the `makeDeps` helper and cases 2, 3 and 4
- `tests/push-command-coverage.test.js` lines 54, 220 and 230
- `tests/quality-agent.test.js` line 216

The contract they encode, that the push gets its test verdict from the selected-tests function, is the one the owner's 2026-10-14 order replaces. The injection key may change, and each change carries that written reason. Every change makes an assertion stricter, toward the new behaviour; none loosens one.

`tests/test-selection-scope.test.js` and the `runSmartTests` cases in `tests/quality-agent-coverage-holes.test.js` test the after-commit path. They stay as they are.

These tests assert that a sync function pushes with automatic pushing on and no test run:

- `tests/sync.test.js` lines 155-186 (`syncPlans` pushes once opted in). Lines 469-508 (`syncPlans` attempts the pull and still reports `synced` with automatic pushing on) assert no push; they change only if the planner's choice moves or removes that pull, with that choice as the written reason.
- `tests/sync-coverage.test.js` lines 294-310 and 312-325 (`autoPush` pushes, and reports a push error), 344-361 (`onPlanOperation` commits and pushes), 449-464 and 466-480 (`fullPlansSync` pushes, and reports a push error)
- `tests/ship-gate-real.test.js` lines 276-292 (`autoPush(on).pushed` is true) and 313-321 (`fullPlansSync` pushes when opted in)

The contract they encode, a push with no test run, is the one the coordinator's decision of 2026-10-14 (Decision 15) replaces. Each one changes only to be stricter: it gets a passing whole-suite check (injected, or a fixture whose test command prints a count above zero) and also asserts that the check ran. The tests with automatic pushing off stay as they are.

## 3. CAPTURE — Acceptance Criteria

Every scenario is a runnable test. Tests that need a project use a fixture project in a temporary directory, never this repository's root. Lint, type check and the security scan are injected as passing unless a scenario says otherwise. `pushToRemote` is always injected, so no test pushes to a network.

1. **The push runs the whole declared suite.** GIVEN a fixture git repository with a hash cache and a test file named after the changed file, so that the selected-tests path would pick one file, WHEN `push.run({ dryRun: true })` runs, THEN the declared test command runs with no test-file arguments, once, AND a spy put in place of the quality agent's exported `runSmartTests` records zero calls.
2. **A cached "nothing changed" answer is never a pass.** GIVEN a fixture whose test script adds one line to a counter file each time it runs, and an injected `pushToRemote` that fails on the first call, WHEN `push.run({})` runs twice with nothing changed in between, THEN the counter file has two lines, AND the second run's output states the number of tests that ran.
3. **A failing test blocks the push.** GIVEN a fixture whose declared node:test suite has one failing test, WHEN `push.run({ dryRun: true })` runs with the real test runner (built like case 12 of `tests/w10-push-entry-point.test.js`, which injects everything except the test check), THEN `ok` is false, `blockedBy` includes `tests`, `pushToRemote` is never called, AND the text states the failing count.
4. **No test command means no push.** GIVEN detected tools where a language has a lint command and `test: null` with no undetermined flag, WHEN `push.run({})` runs, THEN the push is blocked on `tests`, `pushToRemote` is never called, AND the text says that no test command was found, that nothing was tested, and that `--skip-tests` pushes without tests. AND `runFullTests` on the same tools still returns `passed: true` (the existing assertion in `tests/quality-fleet-wiring.test.js` 816-823 stays green and is not edited).
5. **A readable zero blocks the push.** GIVEN a fixture whose test command exits 0 and prints a readable zero count, checked for the node:test form (`ℹ tests 0`, `ℹ pass 0`, `ℹ fail 0`), the jest form (`Tests: 0 passed, 0 total`) and the mocha form (`0 passing`), WHEN `push.run({})` runs, THEN each one is blocked on `tests`, AND the text says that zero tests ran.
6. **No count printed, exit 0, is a pass that says so.** GIVEN a fixture whose test command prints `ok` and exits 0, WHEN `push.run({ dryRun: true })` runs, THEN `ok` is true, AND the text says the runner reported no test count, AND the text never says that 0 tests ran.
7. **The output always gives the count and the command.** GIVEN a fixture whose suite passes 3 tests, WHEN the push succeeds (injected `pushToRemote` returns true), when it runs as a dry run, and when it is blocked by a failing lint check, THEN in all three cases both the console output and the returned `text` contain the declared command and the count 3.
8. **`--skip-tests` says so plainly.** GIVEN `push.run({ skipTests: true })`, THEN no test function is called, lint, type check and the security scan each run once, the text says that no test ran before this push, AND the push goes ahead when the rest pass (today's behaviour, unchanged).
9. **One command runs once.** GIVEN a fixture with a `package.json` test script and a `tsconfig.json`, which is detected as two languages that share one `npm test`, WHEN the push runs, THEN the counter file has one line and the reported count is not doubled.
10. **A timeout is a non-pass.** GIVEN a fixture whose test command runs past a short time limit set through the push's test seam, WHEN the push runs, THEN the verdict is undetermined with the reason "timed out", `pushToRemote` is never called, AND the text says the test run timed out and nothing was pushed.
11. **The automatic push.** GIVEN the quality agent run as a real child process, the way the post-commit hook runs it (as in the `main()` cases of `tests/quality-agent-coverage-holes.test.js`):
    - WITH `--on-success=push` and a fixture that prints a readable zero count, THEN the test check fails, the summary says zero tests ran, AND the ship gate is never reached.
    - WITH `--on-success=push` and a fixture with a hash cache that would select one file, THEN the declared command runs with no test-file arguments.
    - WITH `--on-success=none`, THEN `runSmartTests` runs as today, AND the existing cases in `tests/test-selection-scope.test.js` and `tests/quality-agent-coverage-holes.test.js` stay green without edits.
12. **The hotfix check's answers do not move.** GIVEN the change, THEN `tests/hotfix-check.test.js` and every existing `runFullTests` case (`tests/quality-agent.test.js`, `tests/quality-fleet-wiring.test.js`) pass with their assertions unedited.
13. **The documentation matches the code.** GIVEN `src/commands/push.md`, THEN it no longer contains "tests (47 affected)". It says the push runs the project's whole declared test command before every push. Its `--skip-tests` row and example say that lint, type check and the security scan still run and no test runs. It tells the session to run the command with a time limit of 10 minutes, because the whole suite takes minutes. Proof: a test in `tests/w10-push-entry-point.test.js` that reads the file.

Scenarios 14-19 cover the plan sync (Decision 15). Each one runs in a temporary fixture git repository, never this repository's root, and never with the default `projectPath`. Git is either injected or pointed at a local bare repository as `origin` (as `tests/sync-coverage.test.js` already does), so no test pushes over a network. The whole-suite check is either injected or run against a fixture test command. "Each sync path" means `fullPlansSync`, `syncPlans` (directly and through `manualSync`), and `onPlanOperation` together with the `autoPush` it calls, plus `autoPush` called on its own.

14. **A failing check stops every sync push.** GIVEN automatic pushing on, a pending change under `plans/`, and a whole-suite check that fails with 2 failing tests, WHEN each sync path runs, THEN `fullPlansSync`, `syncPlans` and `onPlanOperation` each commit as they do today, `autoPush` commits nothing, no `git push` is called (the bare remote's `main` does not move), AND each result says that nothing was pushed because the tests failed and gives the test count.
15. **Zero tests, or no test command, stops every sync push.** GIVEN automatic pushing on, WHEN each sync path runs once with a fixture test command that exits 0 and prints `ℹ tests 0` / `ℹ pass 0` / `ℹ fail 0`, and once with no test command (the `test: null` override of scenario 4), THEN no `git push` is called, AND each result says that zero tests ran, or that no test command was found, as the reason nothing was pushed.
16. **A passing check pushes as today.** GIVEN automatic pushing on, `main` checked out, no uncommitted change outside `plans/`, and a whole-suite check that passes 3 tests, WHEN each sync path runs, THEN each pushes what it pushes today (the bare remote advances to the pushed commit), AND the result states 3 tests. AND GIVEN a fixture test command that prints `ok` and exits 0 (no count), THEN each pushes, AND the result says the runner reported no test count and never says that 0 tests ran. For a path that, by the planner's choice, never runs the suite (scenario 19), this scenario becomes: it does not push, and its result says so and that `/ctoc:push` ships.
17. **What was checked is what is pushed.** GIVEN automatic pushing on and a passing check, WHEN a sync path is about to push a commit that is not the commit the check ran on (for example, `syncPlans` with a branch other than `main` checked out, or a tree with an uncommitted change outside `plans/`), THEN either the pushed commit is the commit the check ran on, or nothing is pushed AND the result says why. The test records the commit the check ran on and compares it with the commit the bare remote received.
18. **Automatic pushing off is unchanged.** GIVEN automatic pushing off (the default), WHEN each sync path runs, THEN the whole-suite check is never called (a spy records zero calls, or a counter file written by the fixture's test command stays empty), nothing is pushed, the commits are as today, AND the Doctor's "Sync now" message is the one shown today.
19. **The menu stays usable.** GIVEN automatic pushing on and a fixture test command that sleeps 5 seconds before printing a passing count, WHEN `startAutoSync` runs (its immediate sync) and when one interval of its timer fires under mocked timers, and when the Doctor's "Sync now" key is handled, THEN an observer on the real clock keeps running with no gap longer than 2.5 seconds (half the sleep) until the sync's result is available, AND no push happens before the check has passed. The observer is a 100 ms timer whose reference is captured before any timer mocking is enabled, and each gap is measured with `performance.now()`. A mocked `setInterval` would also mock the observer and prove nothing. If the planner's choice is that these paths never run the suite, the same test instead shows that the fixture's counter file stays empty, that nothing is pushed, and that the result and the Doctor message say nothing was pushed and that `/ctoc:push` ships.
   - AND, whatever the choice, when automatic pushing is on and the push was refused, the Doctor's "Sync now" message names the reason and does not read "✓ Synced successfully".

## Definition of Done

- Every scenario above passes as a committed test. Existing test files are extended; no new test file is added (Decision 13).
- `npm test` passes. The coverage floor in `.ctoc/coverage-baseline.json` is unchanged, no test is skipped, and the reachability and export fences are green, with `runSmartTests` and `runSpecificTests` still reachable from the post-commit root.
- One real `node src/commands/push.js --dry-run` on this repository is recorded with its wall-clock time and the test count it printed.
- The implementation plan records how the planner met the frozen-menu and checked-equals-pushed constraints for the sync, and how the reachability of `onPlanOperation` and `autoPush` was confirmed.
- With automatic pushing on, no function in `src/lib/sync.js` reaches `git push` without the shared check having passed (scenarios 14-17), shown by tests, not by reading.
- The push runs from the installed plugin, so this change takes effect only once the installed version contains it. The work is not reported as "the push now does this" before then.

## Scope

### In Scope

- `/ctoc:push`'s test check: the whole declared suite every time, the zero-test rules, the count and the command in the output, and the `--skip-tests` wording. These are scenarios 1-10.
- The quality agent's test check when it is going to push (Decision 10). This is scenario 11.
- `src/commands/push.md`. This is scenario 13.
- The pushes in `src/lib/sync.js` when automatic pushing is on: `syncPlans` (and `manualSync` and `startAutoSync`, which reach it), `onPlanOperation` with `autoPush`, and `fullPlansSync`. This includes what their results say and the Doctor's "Sync now" message when a push is refused (Decision 15). These are scenarios 14-19.

### Out of Scope

Each item below is a finding for the owner to schedule. None of them is fixed here.

- `syncPlans` runs `git pull --rebase origin main` unattended (`src/lib/sync.js` line 129) before pushing, on a timer when automatic pushing is on, and ignores a failure (130-132). That pull rebases whatever branch is checked out onto `origin/main`. This plan does not change it. It only requires that any check runs on what is actually pushed (scenario 17). After slice 3 the pull (and `fullPlansSync`'s, line 452) precedes no push, so scheduling it means deleting it.
- `src/lib/deployment.js` pushes (`git push <remote> HEAD:refs/heads/<branch>` at 374-384, and tags at 388-402). That is a deployment path, not this gate.
- The documented release step `git push origin main` (`docs/PROJECT_REFERENCE.md` line 134) is a raw push gated only by the plan-step hook, not by a test run on the pushed commit. `docs/PROJECT_REFERENCE.md` is not changed here.
- No guard against a focused test (`it.only` and the like) or a declared test command that runs only part of the suite: both pass with a real count (Decision 21).
- An anchored, summed `cargo test` reader (one count per test binary, added up), so that the push could read cargo's count and its zero. It changes parsers the hotfix check shares (Decision 22).
- Any detection of a CI workflow.
- `src/scripts/test-gate.js`, the coverage floor and `.ctoc/coverage-baseline.json` are unchanged.
- The after-commit check's own cached zero-test pass when it is not pushing (`runSmartTests` 1168-1171). It ships nothing. The earlier plan's Move 5 owns it.
- `src/commands/push.md` describes behaviour `push.js` does not have: checking for a running agent (line 136), warnings that do not block plus `--force` (lines 94-110 and 212-223), "Commits: 3 ahead" (line 125), and "Auto-push (default)" (line 157) while the default is off. Only the lines named in scenario 13 change here.
- The push does not take the quality agent's lock, so a background check could run on the same tree at the same time. This is how it works today and it is not changed here (`push.js` reads no lock; Decision 26).

## Relation to the earlier plan

`plans/functional/affected-tests-while-building-whole-suite-before-push.md` (not yet crossed, still in functional) decides in its Move 5, scenarios 29-32 and Decisions 12, 13 and 19 that the push always runs the whole suite, that no cached pass exists, that `--skip-tests` says plainly the suite did not run, and that the automatic push is gated by the whole suite. This plan lands only that push part.

On the sync, this plan goes further than the earlier one. That plan's Move 5 covers `/ctoc:push` and the quality agent's automatic push only; it does not mention `src/lib/sync.js` (a search of that file for `sync\.js|syncPlans|fullPlansSync|autoPush\b|Move 5` matched only the Move 5 heading, line 273). The sync requirement here (Decision 15) is new.

It does not build the whole-gate record, the selector, the read tracer, the scoped completion record, the wave-barrier recipe, or the change to the final approval. Those stay in the earlier plan, untouched. Nothing here contradicts it. When that plan is built, its push work starts from this one, and its whole-gate record is written by the function this plan introduces.

## Candidate files (not a declaration; the implementation planner fixes the exact list)

```
src/commands/push.js
src/commands/push.md
src/lib/quality-agent.js
tests/w10-push-entry-point.test.js
tests/push-command-coverage.test.js
tests/quality-agent-coverage-holes.test.js
tests/quality-agent.test.js            (line 216 injects runSmartTests into push.run)
src/lib/sync.js                        (the sync pushes, Decision 15)
src/tabs/tools.js                      (line 432, the Doctor's "Sync now" message)
src/commands/start.md                  (line 67, claude:sync; only if the planner's choice changes how it runs, e.g. a time-limit note)
tests/sync.test.js                     (syncPlans, manualSync, startAutoSync, onPlanOperation)
tests/sync-coverage.test.js            (real git with a local bare remote: autoPush, onPlanOperation, fullPlansSync, the timer callback)
tests/ship-gate-real.test.js           (the push spy over every sync path, lines 255-321)
tests/tools-tab-coverage.test.js       (the Doctor's "Sync now" key through the real tools tab, lines 164-215)
tests/tab-modules.test.js              (mocks manualSync, lines 181 and 840-848)
NOT changed: src/scripts/test-gate.js, .ctoc/coverage-baseline.json, src/lib/hotfix-check.js
```

## Risks

- **Each push takes longer.** About 139-151 s on this repository, every push. The push's whole-suite check gives each test command 900000 ms (15 minutes, Decision 17), about six times that. As the suite grows it will reach the limit, and then the push fails closed with "timed out", naming the limit, rather than pushing. *Mitigation:* record the measured time (Definition of Done) so the gap is visible.
- **The session's own time limit.** I believe the Bash tool's default limit is 120 s. This is stated in `.ctoc/audit/improvement-run-notes/s5-step13-secure-d-s5-step13-secure.md` line 15; I did not check it against Claude Code's documentation. If the session uses that default, the push is killed before the suite finishes. Nothing is pushed, but the run is wasted. With the default process handling (Decision 8) the test processes stay in the push's process group, so a kill of the session's command can reach them (believed, not verified). *Mitigation:* scenario 13 has `push.md` tell the session to use the Bash tool's longest limit, 10 minutes, and, when the suite can take longer (one command may run up to 15 minutes, Decision 17), to start the push in the background and wait for it to finish.
- **A test left on the old injection key.** If a test still injects `runSmartTests` after the push stops reading that key, the push uses its real default and runs this repository's whole suite from inside the suite. *Mitigation:* update every `push.run` and `push.main` caller in the tests; and the recursion guard (Decision 27) refuses a whole-suite run for the same project from inside one. A text search found them in four files (pattern `(push|pushCommand)\.(run|main)\(` over `tests/`, 4 files, 23 matches): `tests/w10-push-entry-point.test.js`, `tests/push-command-coverage.test.js`, `tests/quality-agent.test.js`, `tests/quality-fleet-wiring.test.js`. The planner confirms the list by reading those files; the fourth already passes `skipTests: true` at line 99.
- **Projects with no tests on purpose.** A project that deliberately has no test command now has to pass `--skip-tests` on every push (Decision 3).
- **Runs that pass with no tests and print no count.** `jest --passWithNoTests` with no tests, and `go test` on packages with no test files, exit 0 and print no count, so they still pass, with the "test count unknown" wording. *Accepted and stated* (Decision 5).
- **Counts the rule cannot read (limit, Decision 22).** A count is read only from a node:test, jest or mocha summary. For cargo, go, pytest, vitest, and an npm script that chains two runners (only the last summary is read), the count is "unknown" and a zero is not recognised, so such a run passes with the "test count unknown" wording. A jest run in which every test was skipped is believed to print no pass count at all (jest's summary is believed to list only categories above zero; not observed, jest is not installed here), so it passes the same way.
- **"Whole suite" is the declared command (limit, Decision 21).** A declared command that runs only part of the tests, or a focused test (`it.only` and the like), passes with a real count.
- **Other branches pushed untested (limit, Decision 19).** The push stays a bare `git push`; with `push.default=matching` git also pushes other branches whose names match the remote's, and none of them was tested.
- **The unattended push is stricter (Decision 25).** The automatic push refuses a pass whose count is unknown; `/ctoc:push` passes it and says so. The same project can therefore ship by hand what the after-commit check would not ship.
- **A refused automatic push is silent (limit, slice 2).** When the automatic push refuses (the commit moved, the commit cannot be read, the count is unknown), the agent's output is discarded (`src/hooks/post-commit.js` 82, `stdio: 'ignore'`), `setCompleted` has already recorded a pass (`src/lib/quality-agent.js` ~1971, before the push call at ~1987), and `maybePushOnSuccess`' result is dropped, so a person who opted into automatic pushing is not told that nothing shipped. Stated limit; persisting the refusal reason to `.ctoc/quality-state/status.json` is a finding for the owner, not built here.
- **A run that hits the time limit.** On `/ctoc:push`, without whole-tree, the time limit ends only the program that was started (npm or the configured runner); a test process it started can run on. That is today's behaviour of the push and is not changed here (Decision 8). The automatic push runs with whole-tree (Decision 26), so there the whole process group is ended. Nothing is pushed either way.
- **A change to gate logic.** The owner's explicit OK of 2026-10-14 covers `/ctoc:push`'s test check. The coordinator decided under that order, the same day, that the automatic push (Decision 10) and the sync pushes (Decision 15) follow the same rule. The implementation plan shows the exact change at its own approval moment.
- **A frozen menu from the sync.** If the whole suite runs inside `syncPlans`, then with automatic pushing on the menu freezes for about 2.5 minutes each time a sync finds plan changes: when the menu opens, at a timer firing (every 5 minutes by default), and on the Doctor's "Sync now" key. And the suite's progress prints over the menu screen (facts 10 and 11). *Mitigation:* the planner resolves it and scenario 19 tests that the menu keeps responding.
- **Pushed is not what was tested.** `syncPlans` and `autoPush` push the local `main` whatever branch is checked out, the sync commits only `plans/`, and two of the paths pull with rebase before pushing. A check on the working tree can pass while a different commit is pushed. *Mitigation:* scenario 17 compares the checked commit with the commit the remote received.
- **Plan commits pile up unpushed.** With automatic pushing on and a failing or empty suite, the sync keeps committing `plans/` locally and stops pushing. The person may believe the plans reached GitHub. *Mitigation:* the result and the Doctor message say plainly that nothing was pushed and why (scenarios 14, 15 and 19).
- **A sync test that runs this repository's suite.** A sync test with automatic pushing on that leaves `projectPath` at its default (`process.cwd()`) would run this repository's whole suite from inside the suite. *Mitigation:* every sync scenario uses a temporary fixture repository and passes its path explicitly.
- **`claude:sync` and the session's time limit.** If `fullPlansSync` runs the suite, the session's command can be killed before the suite finishes, as described for `/ctoc:push` above. Nothing is pushed, but the run is wasted. *Mitigation:* the planner adds the same 10-minute note to the recipe if its choice runs the suite there.

## What was not verified

- Nothing was executed. Every behavioural statement comes from reading the code.
- The Bash tool's default time limit, as described under Risks.
- Whether `spawnSync`, without whole-tree, returns at its time limit while a test process it started still holds the output pipe open. This decides how much the whole-tree option buys when a run times out.
- How an interrupt from Claude Code, as opposed to one typed at a terminal, reaches a test command running in its own process group.
- Ending the whole process tree on Windows. The code's own comment (`src/lib/quality-agent.js` 217-219) says it is not verified there.
- The exact output of `jest --passWithNoTests` with no tests, of `go test` on packages with no test files, and of mocha with zero tests. These are believed, not observed.
- The durations, which are taken from the done plan named in fact 8 and not re-measured.
- The caller lists. They come from text searches: `runFullTests|runSmartTests|runSpecificTests|runTieredChecks` over the repository matched 24 files, and `runSmartTests` over `tests/` matched 43 times in 7 files. A match shows where a name is written, not that the code runs. The planner confirms them by call graph.
- The sync callers. They come from the text search named in fact 10 and from the dead-export fence's baseline, not from a call graph or a run.
- That a whole-suite run inside the menu process freezes its key handling. This follows from `spawnSync` blocking the process (fact 11); it was not run.
- Whether `loadSettings` ever returns a `sync.branch` value, which decides whether `autoPush` can push anything other than `main`.

## Decisions Taken Under Ambiguity

0. **The owner's order.** On 2026-10-14 the owner (Tijn) asked: "is ctoc:push running tests before pushing if there are no github actions for testing?" He was answered from the source and told that changing it is a change to a gate that waits for his OK. He replied: "improve the push". That is his explicit OK to change the push's test gate.
1. **The whole declared suite runs before every push, once per distinct command.**
   - Rejected alternative: run the whole suite only when the repository has no CI workflow that runs tests. It was rejected for three reasons. Detecting that is a guess: a workflow can exist and not run tests, or be disabled. Quality comes first, and time spent is not by itself a reason. A push is rare next to a build.
   - The earlier plan's Decision 12 points the same way.
   - Cost: about 2.5 minutes per push on this repository.
2. **The selected-tests path and both zero-test passes leave the push. `runSmartTests` and `runSpecificTests` stay for the after-commit check when it is not pushing.** Cost: two test paths stay in the module, each with its own caller.
3. **No test command means the push is blocked.**
   - Cost: a project that deliberately has no tests must pass `--skip-tests` on every push.
   - This reverses, for the push only, the earlier deliberate rule that an explicit `test: null` override "must remain a pass" (`tests/quality-fleet-wiring.test.js` 816-823). That rule still holds for `runFullTests`' own verdict, which the hotfix check reads.
   - The coordinator confirmed this on 2026-10-14.
4. **A readable zero blocks, judged per distinct command.** A run whose only tests were skipped counts as zero tests ran. Not chosen: judging the total across commands, which would let one empty declared suite hide behind another that has tests. Cost: a project with one empty declared suite must fix the declaration or skip tests.
   - The coordinator confirmed this on 2026-10-14.
5. **Exit 0 with no count printed stays a pass, worded honestly.** The runner's exit code is its only instrument here: `go test` and plain assertion scripts print no count, and `tests/greenfield-journey.test.js` seeds such a project. Refusing them would be a false red, and a guard that cries wolf gets switched off. Limit, stated: `jest --passWithNoTests` with no tests, and `go test` with no test files, pass this way.
   - The coordinator confirmed this on 2026-10-14.
6. **Skipped tests are shown and do not block.** The project's own gated command owns the zero-skipped rule; CTOC's own `npm test` enforces it. The skipped-count parser's fallback (`src/lib/quality-agent.js` 662-666) is not anchored and could read a test's name, which would be a false red on the check that decides whether code ships.
7. **The zero-test verdict lives in one shared function that every push path calls, not inside `runFullTests`.** `runFullTests`' `passed` is unchanged for every input, and any new field is added alongside the existing ones. Not chosen: changing `runFullTests`' verdict, which would move the hotfix check's answers.
8. **Whole-tree stays off for the push (CTO Chief, 2026-10-14).** The first draft turned it on; the CTO Chief reversed that. `src/lib/quality-agent.js` 166-168 records why it is off by default: a process group of its own no longer receives an interrupt, which an interactive `/ctoc:push` relies on. The common way a push is stopped is an interrupt or the session ending its command, and in both cases a detached test group would run on in the working tree after the push is gone. A run reaching the 300 s limit, about twice the measured suite, is the rare case.
   - Cost: at the time limit only the started program is ended, and a test process it started can run on. That is today's behaviour, unchanged, and nothing is pushed.
   - Rejected alternative: whole-tree on, as the hotfix check uses it. It fixes the rare case and breaks the common one.
   - The gate fails safe both ways.
9. **`--skip-tests` stays, and says plainly that no test ran before this push.** It is the human's explicit choice. Nothing else about the flag changes.
10. **The automatic push is gated by the same rule. This is the coordinator's decision (2026-10-14).** Reason: the goal is that no push reaches GitHub on a zero or partial test run, and the automatic push is a push. The rule applies on `--on-success=push`, which the hook writes only when `git.autoPushEnabled` is on. `maybePushOnSuccess` still checks the setting. Cost: an after-commit check that is going to push takes as long as `/ctoc:push`.
11. **The output always states the count and the command,** on the console and in the returned `text`, so a menu or another program reading the result sees the same thing a person does.
12. **`push.md` tells the session to allow 10 minutes.** This follows the repository's rule for long runs. Cost: none beyond the text.
13. **Existing test files are extended; no new test file is added.** A new test file is a counted artifact and forces `CLAUDE.md` count updates.
14. **The test contract changes only with a written reason.** The `runSmartTests` injection key in the push tests changes, with the owner's 2026-10-14 order as the written reason, and only to make assertions stricter. The sync tests that assert a push with no test run change with Decision 15 as the written reason, also only to make them stricter.
15. **The pushes in `src/lib/sync.js` come into this plan. This is the coordinator's decision (2026-10-14).** Reason: with automatic pushing on, they push the whole branch with no test run at all, which is exactly a push on a zero-test run.
    - The rule: with automatic pushing on, a sync push happens only after the same shared check has passed on what is pushed. When it does not pass, the sync still commits, does not push, and says why and how many tests ran. With automatic pushing off, nothing changes.
    - The implementation planner may split this into its own slice. How to avoid a frozen menu, and how to make the checked commit the pushed one, are the planner's choices to record. Refusing to push from the sync and pointing to `/ctoc:push` is acceptable only if the result says so plainly.
    - Cost: with automatic pushing on, a sync push waits for the whole suite, or does not happen from the sync at all, depending on the planner's choice.
16. **A refused sync push is shown to the person, not only returned.** The product owner's choice. `src/tabs/tools.js` 432 shows "✓ Synced successfully" whenever `synced` is true, so a refused push would read as success on the Doctor screen. Only that case's message changes; the message with automatic pushing off stays as it is.
    - Not chosen: leaving the reason in the returned object only, where the person clicking "Sync now" never sees it.
    - The timer path's result is thrown away today (`src/lib/sync.js` 77-82). Where a refusal from the timer becomes visible is the planner's choice, recorded in the implementation plan.
17. CTO Chief, 2026-10-15: the push's whole-suite check gives each test command 900000 ms (15 minutes), the completion check's owner-accepted figure, with no new setting; the first line and a timed-out text name it; `push.md` tells the session to use the Bash tool's longest limit (10 minutes) or to start the push in the background and wait. This replaces, for the push, the 300 s figure in fact 8 and Decision 8 (the hotfix check keeps its own limits).
18. CTO Chief, 2026-10-15: the pushed commit is the commit the checks ran on. The commit is read before the checks (`git rev-parse HEAD`, argument list, no shell; for the automatic push, the hash `setRunning` already records) and compared right before the push; when it moved, nothing is pushed and the output says "a newer commit arrived during the checks and was not tested; not pushing — run /ctoc:push again"; when git cannot report it, nothing is pushed either. One comparison, in `src/lib/quality-agent.js`, used by `/ctoc:push` and the automatic push.
19. CTO Chief, 2026-10-15: the push stays a bare `git push` (no explicit refspec, which would change the upstream and no-upstream behaviour); `push.default=matching` pushing other branches untested is a stated limit, here and in `push.md`.
20. CTO Chief, 2026-10-15: `/ctoc:push` names uncommitted tracked paths as "tested with uncommitted changes that are not pushed"; informational, never a block, because CTOC rewrites its own tracked state files.
21. CTO Chief, 2026-10-15: "whole suite" means the project's declared test command; a declared command that runs a subset, or a focused test, passes with a real count. Stated as a limit, here and in `push.md`; no focus guard in this plan (a finding, Out of Scope).
22. CTO Chief, 2026-10-15: a count is reported only when read from an anchored node:test, jest or mocha summary; a number only the unanchored fallback could read is "count unknown", never a number. `parsePassCount`'s answer is unchanged for every input, so the hotfix check does not move. The wording of scenario 6's text is therefore "test count unknown (no node:test, jest or mocha pass count in its output)", true both for a runner that printed no count and for one whose count could not be read. The runners whose count and zero the rule cannot read are stated as a limit; a summed `cargo test` reader is a finding (Out of Scope).
23. CTO Chief, 2026-10-15: `push.md` says `--skip-tests` is passed only when the human's own message asks for it, never to retry a blocked or timed-out push; the no-command text says pushing without tests is the human's choice (`/ctoc:push --skip-tests`).
24. CTO Chief, 2026-10-15: the detector marks a test command set in `.ctoc/quality-config.yaml`, and the check's text says so; no block for a silent override.
25. CTO Chief, 2026-10-15: on the automatic push only, a pass whose count is unknown is not pushed, because nobody reads that agent's output (`src/hooks/post-commit.js` starts it with `stdio: 'ignore'`); its summary says "test count unknown — ship with /ctoc:push, which shows it". `/ctoc:push` keeps Decision 5. Stricter on the unattended path only.
26. CTO Chief, 2026-10-15: the automatic push runs the whole-suite check with whole-tree on (a detached agent has no terminal whose interrupt would be lost); `/ctoc:push` keeps it off (Decision 8). A `/ctoc:push` overlapping a running background check stays an existing limit: `push.js` reads no lock in this plan.
27. CTO Chief, 2026-10-15: a whole-suite run refuses with "a whole-suite run is already in progress for this project" when its environment already names the same project root (`CTOC_WHOLE_SUITE_ROOT`, set for the commands it starts), so a project's own suite cannot start the push's whole-suite run again from inside itself.
28. CTO Chief, 2026-10-15: a passing text names each detected language that has no test command as "not tested: <language> (no test command)".
29. CTO Chief, 2026-10-15: the Commands menu's "Sync plans" description and its `README.md` row say the sync pulls and commits plan changes, never pushes, and that `/ctoc:push` ships (slice 3).

## Open Questions For The Human

None. The owner ordered the push improved on 2026-10-14; the coordinator decided the automatic-push and sync parts under that order the same day (Decisions 10 and 15).
