---
title: "VERIFY runs the checks with a temp folder of its own, and the protection tests stop depending on the temp folder's name"
type: functional
created: 2026-10-22
priority: high
effort: small
depends_on: verify-finds-the-projects-own-python-tools-s1-venv-tools-first-on-path, the-test-suite-passes-on-a-clean-machine-s1-four-failures-fixed
files:
  - src/lib/step-13-verify.js
  - tests/step-13-verify.test.js
  - tests/protect-records.test.js
approved_by: human
approved_at: 2026-10-22T15:02:47.666Z
gate_crossed: functional → implementation
---

# VERIFY runs the checks with a temp folder of its own, and the protection tests stop depending on the temp folder's name

## Problem Statement
Two slices built on 2026-10-22 ended with a failed VERIFY record. Per the brief, the same suite passes
when it is run by hand with the temp folder on disk. No plan can be called done here on its evidence
while that is so. Facts marked "from the brief" were not re-run. Everything else was read in the files
named. I ran nothing.

What the two records say (read, not run):
- `.ctoc/state/verify/verify-finds-the-projects-own-python-tools-s1-venv-tools-first-on-path.json`
  (2026-10-22T13:14:17.643Z): `passed: false`, the tests check reports `# fail 2593`, coverage `null`.
  The stored output contains "Could not report code coverage".
- `.ctoc/state/verify/the-test-suite-passes-on-a-clean-machine-s1-four-failures-fixed.json`
  (2026-10-22T14:11:12.790Z): `passed: false`, `# fail 2722`, coverage `null`. The stored output contains
  `ENOSPC`, "Failed to write file /tmp/node-coverage" and "Could not report code coverage".
- The stored output is only the first and last 2,000 characters (`boundOutput`,
  `src/lib/step-13-verify.js` line 478). That may be why the first record shows no `ENOSPC` line.

From the brief: in this sandbox `/tmp` is a 256 MB tmpfs. With `TMPDIR` on disk the suite reports
13,841 pass, 0 fail and coverage 99.63%. A full run leaves about 14-18 MB behind. The peak during the run
was not measured.

1. **VERIFY gives the checks CTOC's own temp folder.**
   - The completion path: `completeExecution` (`src/lib/actions.js` line 1328) calls
     `persistVerifyResult(root, planSlug)` (lines 1376-1378). That calls `runVerify`
     (`src/lib/step-13-verify.js` line 124), then `runFallbackChecks` (line 720), then `tryCommand`
     (line 833), which runs `execSync`.
   - The child gets its own environment only when the project has a `pyproject.toml` and a `.venv` or
     `venv` tool folder. That environment is the venv slice's copy with the tool folder first on `PATH`
     (lines 731-734 and 858). In every other case, CTOC's `npm test` included, the child inherits the
     CTOC process's environment, temp folder included.
   - `npm test` here is `node src/scripts/test-gate.js --experimental-test-coverage` (`package.json`
     line 11). `test-gate.js` passes a copy of its own environment to the suite (line 422). So the
     suite and Node's coverage writer use whatever temp folder VERIFY's child was given.
   - Node takes `os.tmpdir()` from `TMPDIR`, `TMP` or `TEMP` on Linux and macOS, and from `TEMP` or
     `TMP` on Windows. This is Node's documented behaviour; I did not check it here.
2. **A temp folder whose path holds a record word breaks two protection tests.**
   - When the decision of `src/hooks/protect-records.js` throws, its fail rule (lines 1299-1314) scans
     the JSON text of the call's `tool_input`, and not the session's working folder (test 73,
     `tests/protect-records.test.js` line 243, pins this). It refuses with "…failed to run…" when that
     text matches `UNCHECKED_SUSPECT_RE` (line 597):
     ```text
     /\.ctoc|approval|verify|ledger|backfill|stampAndLedger|approvePlan|crossBySufficiency|streamApprove|streamAnswer|persistVerifyResult/i
     ```
     For a background agent's call it also refuses when `MENU_MENTION_RE` (line 790, case-sensitive)
     matches. When `SETTINGS_MENTION_RE` (line 294) matches, it refuses with its own sentence.
   - The test file makes its project with `makeProject` (lines 32-39) under `os.tmpdir()`. `p()`
     (line 64) builds absolute paths in it, and `write()` puts such a path into `tool_input`.
   - Test 133 (line 987) and test 152 (line 1561) run a copy of the hook that cannot finish its
     decision. They expect a main-session Write of an absolute project path to be allowed (line 1002;
     line 1574, `main Write src/x.js`). When the temp folder's path contains `verify`, that text matches,
     and the hook exits 2 where 0 was expected. That is the failure the brief reports.
   - By reading, the background-agent Write cases in test 133 (line 1001) also get the records sentence
     instead of the settings sentence, and can fail before line 1002 is reached.
   - The other crash tests (55, 56, 57, 73, 81, 101) put no temp path into `tool_input`, or expect a
     refusal anyway (by reading).
   - The file has 13 temp folders under `os.tmpdir()` (lines 33, 225, 390, 744, 855, 988, 1190, 1209,
     1264, 1410, 1454, 1562, 1590). It also builds one path there that it never creates (line 2299).
     Searching the file for `os\.tmpdir\(\)` gives 14 lines. The brief listed 6 of these places.
   - The hook is right to fail closed. What must change is the tests, and the name VERIFY chooses.
3. **The safe naming rule, read from the three patterns.**
   - A folder path is neutral when it contains none of the following, in any letter case: `.ctoc`,
     `approval`, `verify`, `ledger`, `backfill`, `approveplan`, `crossbysufficiency`, `streamapprove`,
     `streamanswer`. `stampAndLedger` and `persistVerifyResult` are covered by `ledger` and `verify`.
   - For a background agent's call it must also contain none of `MENU_MENTION_RE`'s words, spelled as
     written: `start.js`, `menu-screens`, `streaming-gate`, `streaming-precompute`,
     `continueAfterCrossing`, `approveSubplans`, `crossOnEvidence`, `pendingGateDecisions`. It must also
     not contain `settings.json` or `settings.local.json`.
   - The rule covers the whole path, not only the last name. A folder inside a project's `.ctoc`
     (for example `<project>/.ctoc/tmp`) is never neutral. Neither is a folder with such a word anywhere
     in its parent path, or a folder named after VERIFY (`verify-…`).
4. **The venv slice already changed this file.** Its plan
   (`plans/review/verify-finds-the-projects-own-python-tools-s1-venv-tools-first-on-path.md`) is in
   review, and its code is in the file:
   - `projectVenvBin` (line 324) and `checkEnvWith` (line 349);
   - the `env` passed through `toolExists` (line 371), `evalCategory` (line 405), `tryCommands`
     (line 944) and `tryCommand` (line 858);
   - `firstOnPath` (lines 775-779).

   This plan builds on that path. The clean-machine slice
   (`plans/review/the-test-suite-passes-on-a-clean-machine-s1-four-failures-fixed.md`), also in review,
   declares `tests/step-13-verify.test.js`. The two failed records above belong to these two slices.

## Desired Outcome
VERIFY's checks run with a temp folder that VERIFY makes for that run. The folder is on disk, outside the
system temp folder, has a neutral name, and is removed afterwards, and the record names it. The CTOC
process's own environment never changes. The protection tests pass whatever the temp folder is called.

- **A fresh folder per run.** The fallback checks are lint, typecheck and tests, plus the `--version`
  checks that decide which of them run. Before the first of these, VERIFY makes a folder with a unique
  name inside `path.join(os.homedir(), '.cache', 'ctoc-check-temp')`. The checks get a copy of the
  environment in which `TMPDIR`, `TMP` and `TEMP` all name that folder. When the project also has a venv
  tool folder, the same copy has it first on `PATH`, as today. One environment serves the probe and the
  run.
- **Whose home directory that is.** The base lies under the home directory (`os.homedir()`) of whichever
  machine runs CTOC.
  - In this Docker sandbox, that is the sandbox's own home volume. Per the owner's check (not re-run
    by me): `$HOME` is `/home/ctoc`, a Docker volume (`ctoc-claude-home`), and not the host's home
    folder. `/projects` is the only folder mounted from the host. So the folder never touches the
    host's home. It sits on a real disk (`/dev/nvme0n1p2`, about 177 GB free), unlike the 256 MB
    `/tmp` tmpfs.
  - On a plain install on a host, it is that user's own home directory.

  In both cases the folder is someone's home directory and not a throwaway place. That is why each run
  makes its folder fresh and removes it afterwards.
- **Neutral by check, not only by intent.** Before using the folder, VERIFY checks its full path against
  the rule in fact 3, both as built and as its real path. If the path fails, VERIFY tries a new name, up
  to three times in total, and then falls back.
- **Removed afterwards.** After the last check and before the app launch, the run's folder is removed,
  whatever the outcome: pass, fail, timeout, output overflow, or a check that throws. The base folder may
  stay, empty.
- **Recorded.** Each check that ran carries `tempFolder`: the folder, with `/` separators and the home
  folder written as `~`. A fallback or a failed removal adds `tempFolderNote`, a plain sentence saying
  what happened. Neither one changes the verdict. The one-line summary stays as it is.
- **The fallback is today's behaviour, stated plainly.** In three cases the checks run exactly as today:
  there is no home folder, the folder cannot be made, or no neutral name is found in three tries. Today
  means no temp variable is changed, and an environment is passed only for a venv project.
  `tempFolderNote` says why, and `tempFolder` names the inherited temp folder (`os.tmpdir()`).
- **`process.env` of CTOC itself is never written.** This is the same rule as the venv slice's `PATH`.
  Paths are built with `path.join` and `os`. On Windows, an existing `Temp` or `Tmp` key keeps its
  spelling, as `checkEnvWith` already does for `Path`.
- **The protection tests use a neutral base.** `tests/protect-records.test.js` makes all 14 of its temp
  locations under one base, chosen once for the file:
  - `os.tmpdir()` when its real path is neutral. Nothing changes from today.
  - Otherwise, the user's home directory (`os.homedir()`, with links resolved), if that is neutral.
  - Otherwise, every test in the file fails with a message that names the folders tried and the word
    that matched. No test is skipped.

  The hook does not change.
- **Drift is caught.** A test compares the words that VERIFY and the test file treat as unsafe with the
  hook's pattern as written in `src/hooks/protect-records.js`. It fails when the hook gains a word that
  they do not cover.
- **The two failed records are re-run after this lands.** Each slice's completion is run again from the
  menu. That is a menu action, not part of this plan.

## Acceptance Criteria
- **The failures are seen first.** Given the unchanged tree, these runs are recorded before any change:
  - A fixture project whose `npm test` writes a file into its `os.tmpdir()` and fails when it cannot,
    run while the test process's `TMPDIR` names a path where nothing can be written (a file, not a
    folder). This stands in for a temp location too small for the run, because a test cannot mount a
    small tmpfs. When `runVerify` runs, the record says `passed: false`.
  - `node --test tests/protect-records.test.js`, run with `TMPDIR` set to a fresh folder whose name
    contains `verify`. The record lists each failing test by number and title, and the list includes
    133 and 152.

  Any other failing test is reported, not fixed under this plan.
- **A run whose default temp location cannot hold the suite still passes.** Given the fixture and the
  unusable `TMPDIR` above, when `runVerify` runs, then the record says `passed: true`, the tests check
  ran, and the fixture's file was written inside the folder the record names.
- **The real case in this sandbox.** Given this sandbox, with `/tmp` a 256 MB tmpfs and `TMPDIR` unset,
  when this plan's build is completed from the menu and VERIFY runs CTOC's whole suite, then the record
  says `passed: true`. It has a coverage figure at or above the floor in
  `.ctoc/coverage-baseline.json`, reports 0 skipped tests, and names a folder under
  `~/.cache/ctoc-check-temp`. The completion writes this record, never a hand.
- **The record names the folder.** Given a fixture whose test prints the `os.tmpdir()` it sees, when
  `persistVerifyResult` runs, then `tempFolder` on the tests check in the stored record equals that
  folder in its stored form (`~/…`, `/` separators). The lint and typecheck checks that ran carry the
  same value.
- **Every temp variable names the folder.** Given a fixture whose test prints `TMPDIR`, `TMP` and `TEMP`,
  when VERIFY runs it, then all three equal the run's folder. On Windows, when the inherited environment
  spells a key `Temp` or `Tmp`, the child sees one value for that variable: the run's folder.
- **The folder is removed.** Given a fixture that prints its temp folder, in each of four cases (the tests
  pass; they fail; they exceed a small `CTOC_VERIFY_TIMEOUT_MS`; a check throws), when `runVerify`
  returns, then the printed folder no longer exists. Given a removal that fails, then the record's
  `tempFolderNote` names the folder, and the verdict is what the run alone gives.
- **CTOC's own environment does not change.** Given a snapshot of `process.env` taken before `runVerify`
  (including `TMPDIR`, `TMP`, `TEMP` and `PATH`), for a plain project, a venv project and a fallback run,
  when `runVerify` returns, then `process.env` deep-equals the snapshot.
- **The venv behaviour is unchanged apart from the temp folder.** Given the existing venv tests V1 to
  V10, when they run, then they pass with their assertions unchanged. In V1 the `PATH` line still equals
  the venv tool folder, then the path delimiter, then the inherited `PATH`.
- **The name is neutral by the hook's own words.** Given each alternative of `UNCHECKED_SUSPECT_RE`, read
  from the hook's source text, and a home folder whose path contains it, when VERIFY runs, then it does
  not use a folder there. The checks run with the inherited temp folder, and `tempFolderNote` names the
  word. Given an ordinary home folder, the folder VERIFY uses matches none of the three patterns in
  fact 3.
- **A home folder that cannot hold the base falls back, and says so.** Given a home folder that does not
  exist or cannot be written, when VERIFY runs, then the checks run as today, the verdict comes from the
  run alone, and `tempFolderNote` says that the folder could not be made and why.
- **The protection tests pass whatever the temp folder is called.** Given `TMPDIR` set in turn to fresh
  folders whose paths contain `approval`, `verify`, `ledger` and `.ctoc`, and to an ordinary folder, when
  `node --test tests/protect-records.test.js` runs, then it reports 0 failures and 0 skipped each time.
  With the ordinary folder, every temp folder the file makes lies under it, as today.
- **The protection tests fail loudly when no neutral base exists.** Given a `TMPDIR` and a home folder
  that both contain a record word, when the file runs, then its tests fail with a message naming both
  folders and the matching word. None passes and none is skipped.
- **The hook is untouched.** Given the diff, then `src/hooks/protect-records.js` is unchanged, and tests
  55, 56, 73, 133 and 152 keep every assertion they had.
- **No test is weakened.** Given each changed test file, when its diff is read, then each changed test
  asserts at least what it asserted before. Each change carries the written reason that Operating
  Lesson 14 asks for: the outside contract, why the test changes and not the code, and what now fails
  that did not.
- **The whole gate passes.** Given the change, when `npm test` runs, then it reports 0 failures and 0
  skipped tests at the coverage floor, and `npx eslint .` passes.

## Out of Scope
- **Reducing how much the suite writes to its temp folder.** This is the follow-up already named in
  `plans/implementation/the-test-suite-passes-on-a-clean-machine.md`.
- **Changing the size of `/tmp`, or any other machine setting.** Not planned.
- **The hook `src/hooks/protect-records.js`.** Failing closed when its decision crashes is the intended
  safe side. Not planned.
- **The `ctoc quality --tier=1` probe and the app launch.** The probe is at `src/lib/step-13-verify.js`
  line 136. The app launch is `applyAppRunCheck`, which calls `driveAppSync` in `src/lib/app-runner.js`.
  Both keep the inherited environment, the boundary the venv slice drew for `PATH`. A follow-up plan if
  the owner wants them changed.
- **Choosing the location by free space.** The peak is unmeasured, so any threshold would be invented.
  Not planned.
- **Removing folders that earlier, killed runs left in `~/.cache/ctoc-check-temp`.** Another VERIFY may
  be using one of them, and I found no rule that can tell a dead run's folder from a live one in every
  setup (see the risk "Folders left by runs that were killed"). A follow-up plan if leftovers appear.
- **Re-running the two failed completions.** That is a menu action after this lands.
- **Other test files that drive the hook.** These are
  `tests/only-the-owner-answers-an-inbox-question.test.js` and
  `tests/plans-keep-moving-without-the-human.test.js`. By reading, neither drives the crash path. Not
  changed.
- **Projects whose tests write to a hard-coded `/tmp`.** Changing the temp variables does not reach
  them. Not planned.

## Risks
- **Test runs of VERIFY write under the home directory of the machine running the suite.** Searching
  `tests/` for `\b(runVerify|persistVerifyResult)\(` gives 65 matches in 10 files, and tests that drive
  `completeExecution` reach VERIFY too. Each such call makes and removes a folder under `os.homedir()`
  of whichever machine runs the suite. In this Docker sandbox that is the sandbox's own home volume, not
  the host's. On a plain host install it is that user's home directory.
  - Likelihood: HIGH (by design). Impact: LOW. The folders are removed, and a killed run leaves one
    folder with a name.
  - Mitigation: Point `HOME` (`USERPROFILE` on Windows) at a scratch folder in the new tests. Record how
    many folders are left under the base after the whole-suite run; 0 is expected.
- **A CTOC test assumes its temp folder lies outside the home folder.** The brief's green run had
  `TMPDIR=/home/ctoc/ctoc-tmp`, inside the home folder, so the suite tolerated that once.
  - Likelihood: LOW. Impact: MEDIUM.
  - Mitigation: Report any test that fails for this reason in the completion's record, and fix it under
    its own plan.
- **The home folder is small, slow or unwritable.** Some CI containers have no writable home folder.
  - Likelihood: LOW. Impact: MEDIUM.
  - Mitigation: Fall back to today's behaviour with a `tempFolderNote`, so a failure is never silent and
    always traceable to the folder.
- **Removal races a run that timed out, or Windows holds a file open.** Children of a killed suite may
  still be writing, and Windows refuses to remove an open file (EBUSY).
  - Likelihood: MEDIUM. Impact: LOW.
  - Mitigation: Record a failed removal by name and never change the verdict for it. Cover it with the
    timeout case in the removal criterion.
- **Folders left by runs that were killed.** A run that is killed (the session ends, the machine stops,
  or the process is ended from outside) never reaches its removal step. Its folder stays under
  `~/.cache/ctoc-check-temp`. Nothing removes it later.
  - Why no automatic sweep: I found no rule I can show to be safe.
    - A marker in each folder naming the owning process and machine, and a check that the process is
      gone, fails when two containers mount the same home volume at once. A process alive in another
      container's process space looks dead from this one, so a live run's folder would be deleted.
    - An age limit would need a threshold, and nothing measured gives one: the per-check time budget
      can be raised per call and per environment.
  - Growth is bounded only by cleanup. Per the owner's check, the sandbox's home volume sits on the same
    disk as the rest of the sandbox (`/dev/nvme0n1p2`, about 177 GB free). A full run leaves about
    14-18 MB behind (from the brief), and a killed run may leave up to the peak, which is unmeasured.
    So leftovers from killed runs grow until a person removes them, and per-run removal is the only
    thing that keeps a normal run from adding to the disk.
  - Likelihood: MEDIUM. Impact: LOW for one leftover. Many leftovers could fill the disk over time.
  - Mitigation: Give every run folder the same fixed prefix inside one CTOC-named base, so leftovers are
    easy to find and safe to delete by hand when no VERIFY is running. Record the number of folders left
    under the base after the whole-suite run in the completion's record. Open a follow-up plan for a
    sweep if leftovers appear.
- **The hook's word list changes and VERIFY or the tests fall out of step.**
  - Likelihood: MEDIUM. Impact: MEDIUM.
  - Mitigation: Add the drift test from the Desired Outcome, which reads the hook's source.
- **`tests/step-13-verify-coverage.test.js` fakes `child_process`.** By reading, its fakes take only
  the command and ignore the options (for example lines 104 and 133), so a passed `env` does not affect
  them. The file is not declared.
  - Likelihood: LOW. Impact: LOW.
  - Mitigation: If it must change, ask through `src/lib/scope-growth.js` and do not edit it silently.
- **Other plans edit the same files, so line numbers move.** The two slices in review edit
  `src/lib/step-13-verify.js` and `tests/step-13-verify.test.js`. Eleven plans that are not done declare
  `tests/protect-records.test.js`: the files-list search outside `plans/done/` matched it in 11 plans.
  - Likelihood: HIGH. Impact: LOW.
  - Mitigation: Declare `depends_on` on both slices. Name tests by number and title, not by line.
    Re-read each file when the build starts.
- **Facts from the brief were not re-run.** These are the tmpfs size, the 13,841 / 0 / 99.63% run, the
  14-18 MB left behind, and the ENOSPC cause in the first record, whose stored excerpt does not show it.
  - Likelihood: LOW. Impact: LOW.
  - Mitigation: Check them against the first criterion's recorded runs.

## Decisions Taken Under Ambiguity
1. **The location is under the home directory of the machine running CTOC:
   `path.join(os.homedir(), '.cache', 'ctoc-check-temp', <unique name>)`.**
   - What that is depends on the machine. In this Docker sandbox, `os.homedir()` is `/home/ctoc`, the
     sandbox's own home volume (`ctoc-claude-home`), so the folder never touches the host's home and
     sits on a real disk instead of the 256 MB `/tmp` tmpfs. These facts are from the owner's check,
     not re-run by me. On a plain host install it is that user's home directory.
   - Because it is a home directory in both cases, and not a throwaway place, each run makes its own
     fresh folder and removes it afterwards. Leftovers from killed runs are a recorded risk.
   - Considered and not chosen: a folder under `/projects`, the folder shared with the host. It would
     be visible on the host. But it is more likely to be left behind, and other projects' tools already
     use that folder. It also exists only in this sandbox: a plain host install has no `/projects`, and
     CTOC must run the same way on Windows, macOS and Linux.
   - Not inside the project: tests and tools that walk the project tree while the suite runs would see
     the folder, and the project's `.ctoc` is never neutral.
   - Not chosen by free space: the peak is unmeasured.
   - Evidence that the suite tolerates a temp folder inside the home directory: the brief's green run.
   - The base name contains none of the words in fact 3. `.cache/ctoc` has no `.ctoc` in it.
2. **All three variables (`TMPDIR`, `TMP`, `TEMP`) are set.** Node reads different ones on each
   platform. I believe Python, Go and Rust read `TMPDIR` on Linux and macOS; I did not verify that.
3. **Only the fallback checks and their `--version` probes get the folder.** This is the boundary the
   venv slice drew.
4. **The record holds `tempFolder` on each check that ran, like `firstOnPath`.** The home folder is
   written as `~`. Reason: real VERIFY records are captured byte for byte into
   `tests/fixtures/golden-corpus/verify-evidence/` (`tests/fixtures/golden-corpus/manifest.yaml`
   lines 21-28), which is committed. The field is additive: the readers use only `passed`, `errors`,
   `summary`, `timestamp` and `checks.tests` (`src/lib/plan-validator.js` lines 1133-1156,
   `src/lib/streaming-gate.js` lines 686-737). Searching `tests/` for a hard-coded list of record keys
   found 0 matches.
5. **Neither a fallback nor a failed removal changes the verdict, and the summary line stays as it
   is.** The reason is in `tempFolderNote`.
6. **All 14 temp locations in the protection test file use the base, not only the project folder.** One
   rule for the file. A later crash test that puts another of these paths into `tool_input` stays safe.
7. **The tests' fallback base is the home folder. With no neutral base, the tests fail and are not
   skipped.**
8. **`depends_on` names both slices, comma-separated** (the form used in
   `plans/functional/ctoc-keeps-working-and-asks-only-what-matters.md`). The scheduler treats a plan in
   `review/` as satisfied (`src/lib/actions.js`, the comment at lines 2016-2019). So this orders nothing
   today, but it holds this plan back if either slice is sent back.
9. **Up to three tries for a neutral name, then fall back.** A random six-character suffix could, very
   rarely, spell `verify` or `ledger`.

## Slices (dependency-ordered)

| # | Slice file | Scope (one line) | depends_on |
|---|------------|------------------|------------|
| 1 | `verify-runs-the-test-suite-with-its-own-temp-folder-s1-checks-get-their-own-temp-folder.md` | VERIFY's fallback checks and their `--version` probes get `TMPDIR`, `TMP` and `TEMP` set to a fresh `~/.cache/ctoc-check-temp/run-XXXXXX` in the same environment copy as the venv `PATH`. VERIFY checks the path against the hook's words (as built and as its real path, up to three names). It removes the folder in a `finally` before the app launch, and records `tempFolder` / `tempFolderNote` on each check that ran. When it cannot make or use the folder, the checks run as today, with a note. Files: `src/lib/step-13-verify.js`, `tests/step-13-verify.test.js`. | the venv slice and the clean-machine slice (both in review) |
| 2 | `verify-runs-the-test-suite-with-its-own-temp-folder-s2-protection-tests-use-a-neutral-base.md` | `tests/protect-records.test.js` makes all 14 of its temp locations under one base: the real temp folder when it holds none of the hook's crash-rule words (read from the hook's source), else the real home folder, else every test fails, naming both folders and the word. The hook does not change. | s1, and the clean-machine slice (its test 160 change is in this file) |

Two slices, because the two parts are independent pieces of work. Slice 1 changes VERIFY's
runtime and its own test file. Slice 2 changes only a hook's test file. Slice 2 is ordered after
slice 1 because its own completion runs VERIFY over the whole suite. Before slice 1, that run
uses this sandbox's 256 MB `/tmp`, the failure this plan was written for.

Where each acceptance criterion lands:
- **Slice 1:**
  - the failing fixture run seen first, then passing;
  - the real case in this sandbox (proven by slice 1's own completion record);
  - the record names the folder, and every temp variable names it;
  - the folder is removed;
  - CTOC's environment is unchanged, and the venv behaviour is unchanged;
  - the name is neutral by the hook's own words (with the drift test);
  - the home-folder fallbacks.
- **Slice 2:**
  - the protection tests seen failing first under a `verify` temp folder;
  - they pass whatever the temp folder is called;
  - they fail loudly when no neutral base exists.
- **Both slices:**
  - the hook is untouched;
  - no test is weakened;
  - the whole gate passes.

No question for the owner came out of the technical design. The choices made are recorded under
"Decisions Taken Under Ambiguity" in each slice.
