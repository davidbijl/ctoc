---
title: "The test suite passes on a clean machine"
type: functional
created: 2026-10-22
priority: high
effort: small
depends_on: none
files:
  - tests/test-selection-scope.test.js
  - tests/quality-agent-coverage-holes.test.js
  - tests/step-13-verify.test.js
  - tests/readme-numbers.test.js
  - README.md
approved_by: human
approved_at: 2026-10-22T13:30:27.149Z
gate_crossed: functional → implementation
---

# The test suite passes on a clean machine

## Problem Statement
On an untouched copy of commit `46bfbff5` in this sandbox (Node v22.23.1, git 2.43.0), `npm test`
reports four failing tests. These facts come from the brief; I did not re-run them. VERIFY runs the
whole suite, so every VERIFY record written here fails. No plan can then be called done on its
evidence, whatever its own change was. Three of the four failures depend on how the machine is set
up, not on CTOC's code: git's default branch name, and Node's default test reporter. The fourth is
a stale count.

Everything below was found by reading the files named. I ran nothing.

1. **"No delta" and "could not determine" log different messages**
   (`tests/test-selection-scope.test.js`, test 8, line 349). The brief concludes this is not the
   main/master cause, because it still failed after `git config --global init.defaultBranch main`.
   That conclusion does not follow. The test's `git()` helper (lines 58-70) runs every git command
   with `GIT_CONFIG_GLOBAL` and `GIT_CONFIG_SYSTEM` set to the null device, so a global setting
   never reaches it. By reading, the cause is the same unborn-branch problem:
   - `makeEmptyDeltaClone` creates the bare remote with `git init --bare` (line 118). Its HEAD
     names git's built-in default, `master`, because no configuration can reach it.
   - The seed repository pushes only `main` (lines 124-126). The clone at line 132 then has a HEAD
     that names a branch that does not exist: nothing is checked out and nothing is tracked.
   - In that clone, `getPushDeltaBlobs` (`src/lib/quality-agent.js`, lines 1604-1644) finds no
     upstream. Its fallback `git rev-list HEAD` fails on the unborn HEAD, and the catch returns
     `null`.
   - `runSmartTests` therefore prints "Could not determine the push delta — git is unavailable or
     this is not a git repository" (line 1234), the same line the non-git folder prints. So the
     assertion at line 372 fails, and the one at line 369 fails if the two outputs are otherwise
     the same.

   Test 6 (line 305) uses the same fixture and passes. It only checks that the full suite ran with
   a count of 3, which the `null` branch also gives. So today it never reaches the empty-delta
   branch its title names.
2. **A push the remote rejects is recorded as "push-failed"**
   (`tests/quality-agent-coverage-holes.test.js`, lines 1100-1128). `makeRepoWithRemote` (lines
   271-286) creates the bare remote with `git init -q --bare` (line 282). Its HEAD names the
   machine's default branch, which is `master` when nothing sets it. Only `main` is pushed to it.
   - The test clones that remote (line 1107) and commits on the clone's unborn `master` (line
     1113). The `git push -q origin main` at line 1114 then has no local `main` and fails with
     "src refspec main does not match any".
   - By reading, line 1107 is the only clone in the file. The other tests that use the helper push
     from the fixture's own `main` (line 280) with a plain `git push` (`pushToRemote`,
     `src/lib/quality-agent.js` line 2200), so they do not depend on the remote's HEAD.
   - The brief's second failing name, "main(): a refused automatic push …", is the title of the
     enclosing describe block (line 1027). I believe Node reports the block as failed because the
     test inside it failed. This is a belief, not something I observed.
3. **VERIFY over a suite with a real failure, under FORCE_COLOR=3, does not certify**
   (`tests/step-13-verify.test.js`, case 7, lines 311-389).
   - The fixture's `run-tests.js` (lines 328-331) starts `node --test suite.test.js` without
     naming a reporter. `runVerify` runs `npm test` with standard output piped
     (`src/lib/step-13-verify.js`, lines 852-857), so that grandchild does not write to a terminal.
   - Per the brief, Node 22.23.1 then picks the TAP reporter. TAP output carries no colour, so the
     test's own check at line 376, that FORCE_COLOR reached the runner, fails before anything is
     tested.
   - The test relies on a Node default that `package.json` (`engines.node >= 18`) does not fix.
     The source comment at `src/lib/step-13-verify.js` lines 79-80 also calls spec "the default".
4. **docs/: 20 docs files** (`tests/readme-numbers.test.js`, line 202). `countDocsFiles` (line
   91) counts the `.md` files directly under `docs/`, and there are 21. The 21st is
   `docs/UPDATING.md`. No other file in the repository names it (pattern `UPDATING\.md`, whole
   repository, 0 files). `README.md` line 1121 also says "20 docs" and lists 20 names without it.
   The README line is not checked by any test (pattern `OPERATING_LESSONS\.md|20 docs|docs:`,
   `tests/*.test.js`: only `readme-numbers` at line 202 and two unrelated lines matched). Nothing
   under `src/` rewrites this count (pattern `docs\b.*\\d|\\d\+ docs|countDocs|docsFiles`, `src/`,
   0 matches).

There is also a fifth problem that is not a test failure. Run with the default temp folder, the
suite fills this sandbox's 256 MB `/tmp`, so the brief ran it with `TMPDIR=/home/ctoc/ctoc-tmp`.
A suite that needs more temp space than a common small `/tmp` holds fails on such a machine for a
reason unrelated to the code. Where the space goes has not been measured: 363 test files create
folders under the system temp folder (pattern `mkdtempSync\(path\.join\(os\.tmpdir\(\)`,
`tests/`, 363 files matched).

## Desired Outcome
On a machine whose git has no `init.defaultBranch` set, running `npm test` with the temp folder on
disk reports 0 failures and 0 skipped tests, at the coverage floor in
`.ctoc/coverage-baseline.json`. VERIFY records written here can then pass on their own merits.

- The test fixtures that create a bare remote say which branch it starts on. They no longer depend
  on the machine's git configuration.
- The colour test's fixture names the reporter it needs. It no longer depends on Node's default
  for piped output.
- The docs count, the test title and the README docs list match the 21 files on disk.
- The temp-folder use of the suite is measured and recorded, so a follow-up has a real number.

## Acceptance Criteria
- **Every failure is seen first.** Given an untouched copy of the tree, the temp folder on disk,
  and git's `init.defaultBranch` unset for the run (without changing the owner's own git
  configuration), when `npm test` runs, then the record lists every failing test by file and name.
  The list holds the four tests above, plus the describe block at line 1027 if Node reports it.
  Any other failing test stops the build and is reported, not fixed under this plan.
- **The cause of test 8 is confirmed before it is fixed.** Given the unchanged
  `makeEmptyDeltaClone` fixture, when its clone is made and `runSmartTests` runs in it, then the
  record shows that `git rev-parse HEAD` fails in the clone and that the run printed "Could not
  determine the push delta". If either is not what happens, the build stops and reports the
  observed cause. No fix is written on an unconfirmed cause.
- **Test 8 passes, for its stated reason.** Given the fix, when test 8 runs, then the empty-delta
  run prints "Git reports no delta for this push" and the non-git run prints "Could not determine
  the push delta". The test passes with its assertions unchanged.
- **Test 6 reaches the branch its title names.** Given the fix, when test 6 runs, then it also
  asserts that the "no delta" line was printed and not "Could not determine", and it passes. This
  is a tightening, recorded with its reason.
- **The rejected-push test holds under any default branch.** Given git's `init.defaultBranch`
  unset, then set to `master`, then set to `main`, when the "a push the remote rejects" test runs
  in each case, then it passes in each. So does every other test in
  `tests/quality-agent-coverage-holes.test.js` that uses `makeRepoWithRemote`.
- **The colour test covers colour on this Node.** Given Node v22.23.1 with standard output piped,
  when case 7 runs, then the captured output contains escape bytes, the assertion at line 376 is
  unchanged, and the test passes. The fixture's runner names the reporter it uses and no longer
  relies on Node's default.
- **The docs count matches the disk.** Given 21 `.md` files directly under `docs/`, when
  `tests/readme-numbers.test.js` runs, then it asserts 21 and its title names `UPDATING.md` as the
  addition. The `README.md` project-structure block says "21 docs" and names each of the 21 files
  exactly once.
- **No test is weakened.** Given each changed test file, when its diff is read, then each changed
  test asserts at least what it asserted before. Each change carries the written reason Operating
  Lesson 14 asks for: the outside contract, why the test changes and not the code, and what now
  fails that did not.
- **The whole suite passes on a clean machine.** Given an untouched copy of the tree with this
  change, git's `init.defaultBranch` unset, and `TMPDIR` pointing at a folder on disk, when
  `npm test` runs, then it reports 0 failures and 0 skipped tests at the coverage floor in
  `.ctoc/coverage-baseline.json`, and `npx eslint .` passes.
- **The temp-folder use is measured.** Given an empty folder on disk as `TMPDIR`, when `npm test`
  finishes, then the record states the bytes and the number of entries the run left in that folder,
  and the ten largest entries by name. It states the largest size the folder reached during the run
  if that was measured; if not, it says it was not measured. The figures are outputs, not targets.
  A nonzero amount left behind is reported as a finding for a follow-up plan.

## Out of Scope
- **The six other test files that create a bare remote without naming its branch.** The pattern
  `--bare` in `tests/` matches 8 files; two are in this plan. Per the brief's run they pass with the
  default branch unset. They are not planned; a follow-up is opened if one fails.
- **Reducing the suite's temp-folder use.** This needs a follow-up plan built on the measurement
  above.
- **The message `runSmartTests` prints for a repository with an unborn HEAD.** It says "git is
  unavailable or this is not a git repository" when git is available. The header of
  `getPushDeltaBlobs` (`src/lib/quality-agent.js` line 1598) also says it returns null only when git
  is unavailable. This needs a separate plan if the owner wants it; no `src/` file is declared here.
- **The comment at `src/lib/step-13-verify.js` lines 79-80** that calls spec Node's default
  reporter. The parser already reads both reporters (cases 1-3), so only the comment is inaccurate.
  Not planned.
- **Deriving the docs count from the disk.** Other growing tallies are derived through
  `computeDocCounts`; this one is not. The brief asked for the literal. Not planned.
- **Redrawing the README project-structure block without box-drawing characters.** Not planned.
- **Changing any git or Node setting on the machine, a version bump, a release, or a push.** None
  is planned.

## Risks
- **The cause of test 8 comes from reading, not from a run.** It rests on two of my beliefs:
  `git clone` of a remote whose HEAD names a missing branch exits 0 with a warning, and the clone's
  HEAD then names that missing branch. The brief's report is consistent with both, because test 6
  uses the same fixture and is not among the failures.
  - Likelihood: LOW. Impact: MEDIUM.
  - Mitigation: Confirm the cause by a run before fixing it (the second criterion), and stop on a
    mismatch.
- **Older git rejects `--initial-branch`.** That flag needs git 2.28 or later. On older git, every
  test that uses the changed helpers would fail.
  - Likelihood: LOW. Impact: MEDIUM.
  - Mitigation: Run the criteria on this machine's git 2.43. If older git must be supported, the
    implementation planner records the alternative: setting the bare remote's HEAD with
    `git symbolic-ref`.
- **Older Node may lack the reporter flag.** I believe `--test-reporter` first shipped in Node
  18.15, while `package.json` allows Node 18.0 and later. I also believe, not verified, that the
  spec reporter colours piped output when FORCE_COLOR is set.
  - Likelihood: LOW. Impact: LOW.
  - Mitigation: Keep the escape-byte assertion unchanged, so a Node that does not colour fails the
    test loudly instead of passing it silently.
- **The suite needs more temp space than a small `/tmp` holds.** Where the space goes is
  unmeasured. One candidate, which I believe but did not check: `npm test` runs with
  `--experimental-test-coverage` (`package.json` line 11), and Node may write its coverage data
  under the system temp folder.
  - Likelihood: HIGH on machines with a small `/tmp`. Impact: MEDIUM. Every recorded VERIFY run
    fails there, for a reason unrelated to the code.
  - Mitigation: Measure it (the last criterion), and open a follow-up plan on the number.
- **The docs count can go stale again.** `docs/UPDATING.md` describes this fork's own setup. If it
  is moved, or a merge from the original repository adds or removes a doc, the literal 21 fails
  again, the way 20 did.
  - Likelihood: MEDIUM. Impact: LOW.
  - Mitigation: Accept the literal as the brief asked. Deriving the count stays out of scope.
- **The environment facts come from the brief and were not re-run.** These are the commit, the
  Node and git versions, the four failing tests, the "src refspec" error and the TAP observation.
  - Likelihood: LOW. Impact: LOW.
  - Mitigation: Check them against the first criterion's recorded list.

## Slices (dependency-ordered)

| # | Slice file | Scope (one line) | depends_on |
|---|------------|------------------|------------|
| 1 | `the-test-suite-passes-on-a-clean-machine-s1-four-failures-fixed.md` | The two bare-remote fixtures start on `main` by name, case 6 asserts the empty-delta message, case 7's fixture names the spec reporter, the docs count, its test title and the README entry say 21, and the README entry gets its own check. Each cause is confirmed by a real run before its fix, and the final whole-suite run measures what it leaves in a fresh temp folder. | - |

One slice. The whole-suite check, and the build's own VERIFY run, can pass only when all four
fixes are present. A slice holding one fix would record a VERIFY run that fails on the other
three, which is the problem this plan removes. The five edits are a few lines each, and none
touches `src/`.
