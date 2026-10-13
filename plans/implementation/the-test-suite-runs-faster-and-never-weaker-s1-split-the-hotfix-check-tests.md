---
title: "The hotfix-check test file is split into six files by area, proven unchanged"
type: implementation
created: 2026-10-12
priority: high
effort: medium
parent_plan: the-test-suite-runs-faster-and-never-weaker
depends_on: none
files:
  # THE SLICE'S OWN FILES — the work surface.
  - tests/hotfix-check.test.js
  - tests/hotfix-check-test-run.test.js
  - tests/hotfix-check-copy-and-log.test.js
  - tests/hotfix-check-review-findings.test.js
  - tests/hotfix-check-readers.test.js
  - tests/hotfix-check-guards.test.js
  - tests/helpers/hotfix-check-harness.js
  # RATCHET FILES — in scope by rule, not counted toward the size target: five new
  # tests/*.test.js files move the test-file count that `node src/scripts/release.js`
  # writes into both files (src/scripts/release.js lines 98-104 and 384-388).
  - CLAUDE.md
  - README.md
---

# The hotfix-check test file is split into six files by area, proven unchanged

Slice 1 of `plans/functional/the-test-suite-runs-faster-and-never-weaker.md`: acceptance
criteria 1 to 11 of that plan ("Every slice" 1 and 2, "Slice 1" 3 to 11), its decisions 1 to 5
and its exception-list rule (section 2, "What 'never weaker' means, checkably").

Every statement about this repository below was read from the file and line named. Every
speed number is the CTO Chief's (the per-test durations file `hotfix-before-per-test.txt` and
`MEASUREMENTS.txt` in the build's scratch folder); none was re-measured while planning. The
planner held read, write, edit, search and list tools only and ran nothing.

## Problem statement

`tests/hotfix-check.test.js` (3,162 lines, 102 top-level tests, 131 counting subtests) runs as
one process, and Node's runner runs every test of one file on one thread, so this one file sets
the floor under the whole suite: alone it took 239.2 s at a load of about 37 (MEASUREMENTS.txt
line 15), against 368.5 s for the whole suite (line 3). Splitting it into six files by area lets
the runner run the six in parallel. The owner's condition is that the suite never gets weaker:
every moved test keeps its name and its source text word for word, shown by recorded
comparisons, not asserted.

## Technical approach

### The six files, balanced by the measured durations

The seconds are the CTO Chief's per-test durations of the old file alone (sum 237.4 s; the file
took 239.2 s). Percentages are of 239.2 s.

| File | Holds | Tests | Seconds | Share |
|---|---|---|---|---|
| `tests/hotfix-check.test.js` | passes and refusals through the menu: cases 1 to 23, 25 and 27 (case 26 is checked inside case 1); round 9's size rule and its names that are dependencies, the build or settings; the round-10 table of every removed extension; round-10 refusals through the real menu process | 28 | 50.7 | 21.2% |
| `tests/hotfix-check-test-run.test.js` | the second call: which test command runs, how a run's output is read, the commit it prepares, the faults that stop it (cases 30 and 32 to 38); round 10 B12 and B14; every runner's summary; the test command's process tree | 11 | 34.3 | 14.3% |
| `tests/hotfix-check-copy-and-log.test.js` | the copy the tests run in, the package folders linked into it, and the check's log (cases 24, 28, 29, 31 and 39 to 53) | 19 | 42.4 | 17.7% |
| `tests/hotfix-check-review-findings.test.js` | the code review's and the security check's findings of 2026-10-08: findings 1 to 11 and the second round; round 9's paths and names | 12 | 34.5 | 14.4% |
| `tests/hotfix-check-readers.test.js` | every branch of the trial build's cases (old lines 1187-1392) and rounds 3 to 6 of the page and stylesheet readers, except round 4's fail-closed scanners | 16 | 38.7 | 16.2% |
| `tests/hotfix-check-guards.test.js` | round 4's fail-closed scanners; round 9 (stylesheets, a long path, added or deleted paths, the copy's removal, failing closed, transforms); the round-10 fixes in what stays (B4 to B9); and the re-checks of 2026-10-10 | 16 | 36.8 | 15.4% |
| | | **102** | **237.4** | |

- The largest file is `tests/hotfix-check.test.js`, 50.7 s, 21.2% of the old file's 239.2 s on these
  old-alone durations (they were 43.9 s and 44.7 s, largest 18.7%, before the Step 11 fix round);
  criterion 8 allows 25%. On the durations measured with all seven files running at once the
  order differs (decision 32).
- The two largest tests sit in different files: "the second fix: every runner's failing summary
  …" (old line 3085, 16.5 s) in `tests/hotfix-check-test-run.test.js`, and "after the re-check:
  a test run passes only when no failure or skip counter …" (old line 2988, 10.1 s) in
  `tests/hotfix-check-guards.test.js`.
- The round-10 table (old line 2674) stays in `tests/hotfix-check.test.js`, so the comment at
  `tests/hotfix-check-corpus.test.js` line 14 stays true unedited (criterion 10).
- This moves five tests and one file name away from the functional plan's decision 1, only to
  meet criterion 8 with a margin; the arithmetic is decision 1 below. After the review of Step 11
  four more tests moved, to balance the files as they were measured running together (decision
  32): old lines 2078 and 2122 to `tests/hotfix-check.test.js`, old line 2292 to
  `tests/hotfix-check-review-findings.test.js`, old line 1826 to `tests/hotfix-check-guards.test.js`.

### Every top-level test, by old line, to its file

Seconds and names from the per-test durations file (names cut at 100 characters as that file
cuts them). File names are shortened: `hotfix-check` is `tests/hotfix-check.test.js`;
the others are `tests/hotfix-check-<name>.test.js`.

| # | Old line | s | Name | File |
|---|---|---|---|---|
| 1 | 315 | 2.2 | case 1 + 26: a button wording change passes in two calls; the process is restored | hotfix-check |
| 2 | 334 | 1.8 | case 2: a button colour change passes; the commit names only the stylesheet | hotfix-check |
| 3 | 341 | 1.3 | case 3: a catalogue value is no wording the check reads (since the tenth round): refused as a settin | hotfix-check |
| 4 | 347 | 3.4 | case 4: other uncommitted work is neither judged nor committed | hotfix-check |
| 5 | 361 | 0.7 | case 5: program logic is refused with the full sentence | hotfix-check |
| 6 | 370 | 0.6 | case 6: a setting is refused | hotfix-check |
| 7 | 377 | 0.7 | case 7: text inside program code is refused | hotfix-check |
| 8 | 384 | 0.7 | case 9: a sensitive area is refused even for a colour | hotfix-check |
| 9 | 391 | 1.4 | case 10: more than 20 changed lines is refused with the counts | hotfix-check |
| 10 | 408 | 0.6 | case 11: a new file is refused | hotfix-check |
| 11 | 414 | 4.1 | case 12: a failing existing test refuses the hotfix and is named (TAP and spec reporters) | hotfix-check |
| 12 | 425 | 1.5 | case 13: an edited test is refused by both calls and no test runs | hotfix-check |
| 13 | 438 | 3.5 | case 14: a run in which no test ran is not a pass | hotfix-check |
| 14 | 447 | 0.4 | case 15: a change that cannot be read is refused and never passes | hotfix-check |
| 15 | 465 | 0.7 | case 16: an unrecognised file kind is refused | hotfix-check |
| 16 | 471 | 2.7 | case 17: without a test command nothing passes: a page reads "no test ran", and a README is no kind | hotfix-check |
| 17 | 482 | 3.7 | case 18: the same change checked twice gives the same answers (core.autocrlf=true) | hotfix-check |
| 18 | 492 | 2.6 | case 19: Windows line endings do not count as changed lines | hotfix-check |
| 19 | 514 | 3.6 | case 20: a path written with backslashes gives the same answers | hotfix-check |
| 20 | 527 | 1.0 | case 21: a file outside the project is refused | hotfix-check |
| 21 | 533 | 1.1 | case 22: a named unchanged file, and nothing changed at all | hotfix-check |
| 22 | 540 | 0.9 | case 23: a binary file is not text | hotfix-check |
| 23 | 546 | 4.7 | case 24: nothing in the project is touched, also when its own tests write and stage files | copy-and-log |
| 24 | 582 | 2.9 | case 25: through the real menu process, standard output is exactly one JSON document | hotfix-check |
| 25 | 607 | 0.1 | case 27: an unknown sub-command or option answers the usage text | hotfix-check |
| 26 | 623 | 5.2 | case 28: the log counts verdicts and causes, holds no names or wording, and never changes an answer | copy-and-log |
| 27 | 666 | 2.8 | case 29: an unrelated uncommitted edit that would make a test fail does not change the verdict | copy-and-log |
| 28 | 677 | 2.5 | case 30: the test command comes only from tracked files | test-run |
| 29 | 694 | 2.5 | case 31: the check's own log never enters the change | copy-and-log |
| 30 | 704 | 1.4 | case 32: the commit takes only the judged files; a staged unrelated file stays staged | test-run |
| 31 | 717 | 0.1 | case 33: a project folder outside the repository git reports is refused | test-run |
| 32 | 727 | 0.3 | case 34: a fault inside the check is "the check stopped", its message in detail | test-run |
| 33 | 745 | 5.0 | case 35: git settings in the repository change no answer | test-run |
| 34 | 781 | 1.1 | case 36: a failure reported on standard error only is read | test-run |
| 35 | 789 | 0.8 | case 37: npm's placeholder test script is "no test ran" | test-run |
| 36 | 795 | 0.9 | case 38: a test runner that is not installed is "no test ran" | test-run |
| 37 | 802 | 1.3 | case 39: a log above 1 MiB is rotated by renaming | copy-and-log |
| 38 | 817 | 2.4 | case 40: a log that is a hard link is never written | copy-and-log |
| 39 | 836 | 5.3 | case 41: the log is never written through a symbolic link | copy-and-log |
| 40 | 864 | 1.1 | case 42: an unrelated uncommitted edit that a test needs makes the hotfix fail | copy-and-log |
| 41 | 874 | 5.1 | case 43: the copy is gone after a pass, a refusal, failing tests, a timeout and a thrown error | copy-and-log |
| 42 | 933 | 0.8 | case 44: a change that does not apply cleanly to a fresh copy is refused and runs no test | copy-and-log |
| 43 | 976 | 1.9 | case 45: installed-package folders are linked into the copy, one link each, and left intact | copy-and-log |
| 44 | 1004 | 1.3 | case 46: on Windows the links are directory junctions, elsewhere directory links | copy-and-log |
| 45 | 1033 | 1.4 | case 47: a judged file that changes during the check is refused | copy-and-log |
| 46 | 1070 | 1.6 | case 48: a name the commit command cannot carry is refused | copy-and-log |
| 47 | 1116 | 1.2 | case 49: other uncommitted work behind a workspace link is refused and runs no test | copy-and-log |
| 48 | 1130 | 1.0 | case 50: the same workspace link with no other work passes, and the test ran in the copy | copy-and-log |
| 49 | 1140 | 1.2 | case 51: other uncommitted work behind an editable Python install is refused | copy-and-log |
| 50 | 1162 | 0.9 | case 52: a judged file under a linked package passes, and the test ran in the copy | copy-and-log |
| 51 | 1171 | 0.7 | case 53: a link whose parent lies outside the copy stops the check before any test runs | copy-and-log |
| 52 | 1189 | 0.8 | the test call refuses a deleted file or one replaced by a link before any copy, without hashing it | readers |
| 53 | 1203 | 0.5 | a file that is not valid UTF-8 is not text | readers |
| 54 | 1209 | 1.3 | a name with spaces, a star and letters beyond ASCII passes, and commit.add stages exactly it | readers |
| 55 | 1226 | 0.0 | a project folder that does not exist is "the check stopped", cleaned and capped, and never created | readers |
| 56 | 1236 | 4.3 | the first failing test is read from jest, TAP and spec output, or said plainly | readers |
| 57 | 1251 | 0.9 | a run whose counters cannot be read is "no test ran" | readers |
| 58 | 1261 | 0.9 | the whole suite runs in the copy, whatever the test files are named | readers |
| 59 | 1279 | 7.7 | edge shapes of every kind give the exact verdict | readers |
| 60 | 1355 | 1.8 | a project in a sub-folder of the repository judges only its own files, shown from its own root | readers |
| 61 | 1366 | 0.7 | a test location that is not a readable file address is shown as written | readers |
| 62 | 1376 | 0.8 | a log folder that cannot be written changes no answer | readers |
| 63 | 1461 | 4.2 | finding 1: no repository hook and no file-system monitor runs during either call | review-findings |
| 64 | 1489 | 9.2 | finding 2a: the first failing test is read from blank lines in linear time | review-findings |
| 65 | 1523 | 3.7 | finding 2c: a colour change in a one-line stylesheet is judged in linear time | review-findings |
| 66 | 1550 | 1.0 | finding 6: a tracked test command with shell structure runs no test and says so | review-findings |
| 67 | 1557 | 0.4 | finding 8: a named file with control characters is quoted cleaned in every sentence | review-findings |
| 68 | 1563 | 3.0 | finding 9: a judged file named like an option reaches the test run after -- | review-findings |
| 69 | 1584 | 2.4 | finding 10: removal never follows a copy the tests swapped for a link to an outside folder | review-findings |
| 70 | 1648 | 2.9 | finding 11: a kill from outside removes the copy, then the signal ends the process | review-findings |
| 71 | 1686 | 0.7 | round 2, finding 1: a staged edit hidden behind an index bit is refused, or committed exactly as jud | review-findings |
| 72 | 1718 | 1.1 | round 2, finding 3: a project inside a sensitive, test, governing, build or database folder is judge | review-findings |
| 73 | 1740 | 0.9 | round 2, finding 9: a pass names each judged file with its staged id, which a rewriting commit hook | review-findings |
| 74 | 1765 | 6.0 | round 4: components and code elements in HTML, custom properties; Vue, JSX, Sass, Less and reStructu | readers |
| 75 | 1826 | 3.9 | round 4: every scanner fails closed on an unfinished or unreadable construct | guards |
| 76 | 1873 | 0.5 | round 4: CTOC's enforcement list applies only in CTOC's own repository | readers |
| 77 | 1886 | 6.8 | round 3: the whole-file scanners read script escape states, titles, comments and stylesheet strings; | readers |
| 78 | 1948 | 3.7 | round 5: host elements, the element stack, stylesheet names, custom properties | readers |
| 79 | 2018 | 2.0 | round 6: folded paths, colours that are no whole value, the cannot-read-exactly sentence | readers |
| 80 | 2078 | 1.7 | round 9: the size rule runs before the content rules, and after the kind of each file | hotfix-check |
| 81 | 2122 | 5.1 | round 9: names that are dependencies, the build or settings; the wording rule in a page; byte-order | hotfix-check |
| 82 | 2191 | 9.4 | round 9: stylesheets — brackets, statements outside the subset, escapes, and custom properties | guards |
| 83 | 2292 | 5.0 | round 9: paths and names — governing folders, sensitive words in every spelling, byte-order marks an | review-findings |
| 84 | 2350 | 1.0 | round 9: a long path is read in time proportional to its size | guards |
| 85 | 2363 | 0.9 | round 9: an added or deleted path is refused before anything is staged, so no untracked file reaches | guards |
| 86 | 2401 | 2.5 | round 9: the copy is removed whatever the tests leave in it, and a removal that fails keeps both end | guards |
| 87 | 2497 | 3.1 | round 9: every guard fails closed — a file its reader cannot parse is refused, a fault in any rule s | guards |
| 88 | 2615 | 2.7 | round 9: a transform only adds reasons to refuse, and the check reads what the consumer reads | guards |
| 89 | 2674 | 0.0 | round 10: a file of a removed kind never qualifies, whatever its name and place | hotfix-check |
| 90 | 2705 | 1.7 | round 10: through the real menu process, an imported instruction file, a catalogue and a README are | hotfix-check |
| 91 | 2744 | 2.8 | round 10, B4: guards closed by construction | guards |
| 92 | 2797 | 0.0 | round 10, B5 to B7: a control character in a stylesheet, the exact grammar of a colour value, and a | guards |
| 93 | 2836 | 0.0 | round 10, B9 and B10: a sensitive word anywhere inside a part of the path, a part that holds `prompt | guards |
| 94 | 2871 | 0.0 | round 10, B9: whatever the earlier matcher refused is still refused (a word as a camel-case sub-word | guards |
| 95 | 2896 | 2.1 | round 10, B12 and B14: a skipped test confirms nothing, and the test run is asked to end its whole p | test-run |
| 96 | 2930 | 0.0 | after the re-check: every extension the module ever recognised but `.css` is refused, whatever the f | guards |
| 97 | 2959 | 0.0 | after the re-check: shadows, the `tokens` exception as written, sensitive words across separators, a | guards |
| 98 | 2988 | 10.1 | after the re-check: a test run passes only when no failure or skip counter in its output is above ze | guards |
| 99 | 3085 | 16.5 | the second fix: every runner's failing summary refuses and its passing one passes with the right cou | test-run |
| 100 | 3112 | 0.4 | the final re-check: a stylesheet that holds a backslash never qualifies | guards |
| 101 | 3137 | 0.0 | the second final re-check: no stylesheet exception for `tokens` | guards |
| 102 | 3144 | 3.6 | the second final re-check: after a test command exits normally its whole process tree ends, so nothi | test-run |

### Every top-level statement that is not a test, by old line, to its place

The old file has 178 top-level statements (counted by reading; the proof re-counts them with
the parser): the `'use strict'` directive and 11 require lines (together the proof's 12 *require
lines*), 64 other statements, 102 tests.
The rule (functional plan decision 3): a statement that two or more of the six files use goes to
`tests/helpers/hotfix-check-harness.js`; a statement one file uses goes to that file; a statement
only helper statements use goes to the helper and is not exported. Each moves with the comment
directly above it (its JSDoc or its leading `//` lines).

| Old line | Statement | Goes to | Used by (by reading) |
|---|---|---|---|
| 1 | `'use strict';` | every file and the helper | — |
| 14-20, 22-25 | the 11 `require` lines | each file and the helper take the ones they use | — |
| 27 | `START` | `tests/hotfix-check.test.js` | case 25 (lines 588, 599, 602), round-10 real menu (2712, 2729); both in that file. Kept there because in the helper `__dirname` would be `tests/helpers` and the path would change |
| 28 | `NODE` | helper | hotfix-check, copy-and-log (940, 1006), review-findings (1672) |
| 29 | `STATUS_LINE` | helper | `assertChecking`; readers (2005, 2058); guards (2179, 2285, 2342, 2661) |
| 30 | `USAGE` | helper | hotfix-check (611-619), review-findings (1580) |
| 31 | `LOG` | helper | `logLines`; test-run (742); copy-and-log (650, 807-845) |
| 32 | `NO_TEST` | helper | five files |
| 34, 36 | `refusal`, `unreadable` | helper | all files |
| 47 (comment 37-46) | `gone` | helper | hotfix-check, readers, guards |
| 55 (comment 48-54) | `inexact` | helper | review-findings (1532), readers (1900), guards (2273) |
| 57 | `SETTING` | helper | hotfix-check (344), guards (2095) |
| 61 (comment 59-60), 62 | `HOME`, `HOME_STORE` | helper | all files |
| 69 (JSDoc 64-68) | `nodeTest` | helper | five files and `PASSING_TEST`, `FAILING_TEST`, `linkedProject`, `workspaceProject` |
| 85, 86, 87 | `PASSING_TEST`, `FAILING_TEST`, `SCRIPT` | helper | several files |
| 89, 90 | `REAL_TMP`, `scratch` | helper, not exported | `tmpDir` and the two cleanup hooks |
| 91 | `tmpDir` | helper | all files |
| 97 (comment 96) | `PRIVATE_TMP` | helper | `check`, `leftovers`; hotfix-check (585, 2708), review-findings (1591), guards (2420-2454) |
| 98 | `leftovers` | helper | the after-each check; copy-and-log (576), guards (2413, 2443) |
| 100-104 | `test.after(…)` | helper, a top-level statement at its old place after `leftovers`, byte for byte | — |
| 105-107 | `test.afterEach(…)` | helper, a top-level statement right after the one above, byte for byte | — |
| 112 (comment 109-111) | `GIT_IDENTITY` | helper, not exported | `git` |
| 114, 120, 128, 136, 153 | `git`, `writeFiles`, `packageJson`, `makeRepo`, `testedProject` | helper | several files |
| 158 (157), 178 (173-177) | `withEnv`, `check` | helper | several files |
| 184 (183), 187, 192, 197 | `probeDir`, `probeRead`, `logLines`, `withoutTime` | helper | several files |
| 199, 200, 201 | `sha`, `worktrees`, `stashList` | helper | `snapshot`, `treeBytes`; review-findings (`sha`, 1607); copy-and-log (`stashList`, 568) |
| 204 (203) | `snapshot` | helper, not exported | `refusedUntouched` |
| 218 (217) | `treeBytes` | helper | copy-and-log, review-findings |
| 231 (230) | `refusedUntouched` | helper | five files |
| 242 | `q` | helper, not exported | `assertChecking`, `assertPass` |
| 244, 254, 267 | `assertChecking`, `assertPass`, `buttonWording` | helper | several files |
| 275 (274), 284 (283), 300 (299) | `shellWords`, `runCommit`, `copyParent` | helper | several files |
| 308 (307) | `addStaleWorktree` | `tests/hotfix-check-copy-and-log.test.js` | case 43 only (891) |
| 664 | `FLAGS_TEST` | copy-and-log | cases 29 and 42 (667, 669, 865) |
| 872 (871) | `TIMEOUT_RESULT` | copy-and-log | case 43 (883) |
| 954 (953) | `linkedProject` | helper | copy-and-log (979, 991, 1005, 1174), review-findings (1602, 1631) |
| 971 | `LINK_REPORT` | copy-and-log | cases 45 and 53 |
| 1101 (1100) | `workspaceProject` | helper | copy-and-log (1119, 1132, 1164), guards (2771) |
| 1404 (1397-1403), 1405 | `TIMED_MS`, `NOISE_MS` | helper, not exported | `growth` |
| 1421 (1406-1420) | `growth` | helper | review-findings (1517, 1544), guards (2358) |
| 1443 (1442) | `wallMs` | helper, not exported | `growth`'s default |
| 1449 (1448) | `changeOf` | helper | hotfix-check (2699), review-findings (1541), guards |
| 2741, 2742 (comment 2738-2740) | `reasonOf`, `NOT_WORDING` | `tests/hotfix-check-guards.test.js` | guards only (2757-3138) |
| 3049 (comment 3041-3048), 3082 | `RUNNER_OUTPUT`, `RUNNER_SOURCE` | `tests/hotfix-check-test-run.test.js` | the second fix only (3092-3101) |

Section comments that sit between tests move with the test they introduce: 1187 (readers, above
1189), 1258-1260 (readers, 1261), 1394-1395 (review-findings, above finding 1 at 1461 — in the
old file it sits above `TIMED_MS`, but it introduces the findings), 1684 (review-findings, 1686),
1759-1764, 1884-1885, 1945-1947, 2012-2017 (readers, with 1765, 1886, 1948, 2018), 1823-1825
(guards, with 1826), 2073-2077, 2115-2121 (hotfix-check, with 2078, 2122), 2186-2190,
2609-2614 (guards, with 2191, 2615), 2667-2673 (hotfix-check, with 2674), 2738-2740 (guards,
above `reasonOf`), 2867-2870,
2926-2929, 2957-2958, 3107-3111, 3136 (guards, with 2871, 2930, 2959, 3112, 3137), 3041-3048
(test-run, above `RUNNER_OUTPUT`). Within each file the moved statements keep their old order.

### The helper module, `tests/helpers/hotfix-check-harness.js`

Order of its contents: `'use strict';`, the header below, its requires, then the moved
statements in their old order (the two cleanup hooks, old lines 100-107, stay top-level
statements at their old place, so loading the helper registers them), then the export list.

Requires (the helper sits one folder deeper, so the menu path gains one `../`):

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const { route } = require('../../src/lib/menu-screens');
```

Header comment, word for word:

```js
/**
 * The shared setup of the hotfix-check test files (tests/hotfix-check.test.js and
 * tests/hotfix-check-*.test.js, split by area on 2026-10-12; plan
 * the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/):
 * the fixture writers, the router call `check`, the assertion helpers, the timing helper, and
 * one private temporary folder per test process. Every statement below was moved word for word
 * out of tests/hotfix-check.test.js; only the requires and the export list are new.
 *
 * Loading this module registers the two cleanup hooks once per test process: the removal of
 * every scratch folder when the file ends, and the check after every test that no `ctoc-hotfix-`
 * folder is left in the private temporary folder. Every test file loads this module, so none can
 * forget them. `node --test` runs each test file in its own process, so each file gets its own
 * private folder and its own list of scratch folders.
 *
 * Not a `*.test.js` file and lives under tests/helpers/, so the `node --test tests/*.test.js`
 * glob never executes it as a test.
 */
```

The two cleanup hooks, old lines 100-107, are top-level statements of the helper, byte for byte
and in the old order (`test.after(…)` then `test.afterEach(…)`, after `PRIVATE_TMP` and
`leftovers`, as in the old file). Loading the helper once per process registers them on that
process's root test, so a test file cannot forget them (decision 33).

Export list, word for word and in this order (45 names; every one is used by at least one of
the six files, by reading):

```js
module.exports = {
  NODE, STATUS_LINE, USAGE, LOG, NO_TEST, refusal, unreadable, gone, inexact, SETTING, HOME,
  HOME_STORE, nodeTest, PASSING_TEST, FAILING_TEST, SCRIPT, tmpDir, PRIVATE_TMP, leftovers,
  git, writeFiles, packageJson, makeRepo, testedProject, withEnv, check,
  probeDir, probeRead, logLines, withoutTime, sha, worktrees, stashList, treeBytes,
  refusedUntouched, assertChecking, assertPass, buttonWording, shellWords, runCommit,
  copyParent, linkedProject, workspaceProject, growth, changeOf
};
```

Not exported (used only inside the helper): `REAL_TMP`, `scratch`, `GIT_IDENTITY`, `snapshot`,
`q`, `TIMED_MS`, `NOISE_MS`, `wallMs`.

### How each file starts

Every one of the six files starts with `'use strict';`, its header comment, its requires and the
destructured import from the harness, before any other statement and before its first test.
Loading the harness is the only way a file gets the end-of-file cleanup and the after-each
leftover check (they are the harness's own top-level statements), and criterion 6 shows for each
file that it has both.

Requires and harness imports per file, by reading each test body. ESLint's `no-undef` and
`no-unused-vars` (both errors, `eslint.config.js` lines 85-94) are the arbiter: if lint names a
missing or unused name, the import list is corrected, nothing else.

- `tests/hotfix-check.test.js`: `test`, `assert` (`node:assert/strict`), `fs`, `path`,
  `{ spawnSync }`, `{ route }` (`../src/lib/menu-screens`), `{ ruleRefusal }`
  (`../src/lib/hotfix-check`); harness: `NODE, STATUS_LINE, USAGE, NO_TEST, refusal,
  unreadable, gone, SETTING, HOME, HOME_STORE, PASSING_TEST, FAILING_TEST, SCRIPT, tmpDir,
  PRIVATE_TMP, git, writeFiles, packageJson, makeRepo, testedProject, withEnv, check, probeDir,
  probeRead, logLines, refusedUntouched, assertChecking, assertPass, buttonWording, runCommit,
  changeOf`; local `START` (old line 27, unchanged).
- `tests/hotfix-check-test-run.test.js`: `test`, `assert`, `fs`, `path`, `qualityAgent`
  (`../src/lib/quality-agent`); harness: `NO_TEST, refusal, unreadable, HOME,
  HOME_STORE, nodeTest, FAILING_TEST, SCRIPT, tmpDir, git, writeFiles, makeRepo, testedProject,
  withEnv, check, logLines, LOG, withoutTime, refusedUntouched, assertPass, buttonWording,
  runCommit`; local `RUNNER_OUTPUT`, `RUNNER_SOURCE`.
- `tests/hotfix-check-copy-and-log.test.js`: `test`, `assert`, `fs`, `path`, `{ route }`,
  `qualityAgent`, `safeFs` (`../src/lib/safe-fs`); harness: `NODE, LOG,
  NO_TEST, refusal, unreadable, HOME, HOME_STORE, nodeTest, PASSING_TEST, FAILING_TEST, SCRIPT,
  tmpDir, leftovers, git, writeFiles, makeRepo, testedProject, withEnv, check, probeDir,
  probeRead, logLines, worktrees, stashList, treeBytes, refusedUntouched, assertChecking,
  assertPass, buttonWording, copyParent, linkedProject, workspaceProject`; local
  `addStaleWorktree`, `FLAGS_TEST`, `TIMEOUT_RESULT`, `LINK_REPORT`.
- `tests/hotfix-check-review-findings.test.js`: `test`, `assert`, `fs`, `path`,
  `{ spawnSync }`, `{ ruleRefusal }`, `qualityAgent`; harness: `NODE, STATUS_LINE, USAGE,
  NO_TEST, refusal, unreadable, inexact, HOME, HOME_STORE, nodeTest, PASSING_TEST, SCRIPT,
  tmpDir, PRIVATE_TMP, git, writeFiles, makeRepo, testedProject, check, probeDir, probeRead,
  logLines, sha, worktrees, treeBytes, refusedUntouched, assertChecking, assertPass, shellWords,
  runCommit, copyParent, linkedProject, growth, changeOf`. (Finding 11 names `route` only inside
  the text of the runner file it writes, lines 1668-1669; it needs no import.)
- `tests/hotfix-check-readers.test.js`: `test`, `assert`, `fs`, `path`, `{ spawnSync }`,
  `qualityAgent`; harness: `STATUS_LINE, NO_TEST, refusal, unreadable, gone,
  inexact, HOME, HOME_STORE, nodeTest, PASSING_TEST, SCRIPT, tmpDir, git, writeFiles,
  packageJson, makeRepo, testedProject, check, logLines, refusedUntouched, assertChecking,
  assertPass, runCommit, copyParent`.
- `tests/hotfix-check-guards.test.js`: `test`, `assert`, `fs`, `path`, `{ route }`,
  `{ ruleRefusal }`, `qualityAgent`, `safeFs`; harness: `STATUS_LINE, refusal,
  unreadable, gone, inexact, HOME, HOME_STORE, nodeTest, PASSING_TEST, SCRIPT, tmpDir,
  PRIVATE_TMP, leftovers, git, writeFiles, makeRepo, testedProject, withEnv, check, probeDir,
  probeRead, logLines, withoutTime, worktrees, assertChecking, assertPass, copyParent,
  workspaceProject, growth, changeOf`; local `reasonOf`, `NOT_WORDING`.

The require lines keep the old text (`const assert = require('node:assert/strict');` and so
on); the harness line is `const { …names… } = require('./helpers/hotfix-check-harness');`.

Lint decided the lists above after the Step 11 fix round (`registerCleanup` is gone; `STATUS_LINE`
joined `tests/hotfix-check.test.js` and `tests/hotfix-check-review-findings.test.js`; `SETTING`
left `tests/hotfix-check-guards.test.js`); the moved tests needed no require beyond the rows. The
same lists by old line, as the split script writes them and the proof checks them (`REQUIRES`;
line 1 is `'use strict';`). A file may hold fewer than its row when lint names one unused, never
another; the helper also holds `const { route } = require('../../src/lib/menu-screens');`, and each
of the six test files exactly one harness import line, whose names may differ from the lists above
(lint is the arbiter):

```js
const REQUIRES = {
  'tests/hotfix-check.test.js': [1, 14, 15, 16, 18, 20, 22, 23],
  'tests/hotfix-check-test-run.test.js': [1, 14, 15, 16, 18, 24],
  'tests/hotfix-check-copy-and-log.test.js': [1, 14, 15, 16, 18, 22, 24, 25],
  'tests/hotfix-check-review-findings.test.js': [1, 14, 15, 16, 18, 20, 23, 24],
  'tests/hotfix-check-readers.test.js': [1, 14, 15, 16, 18, 20, 24],
  'tests/hotfix-check-guards.test.js': [1, 14, 15, 16, 18, 22, 23, 24, 25],
  'tests/helpers/hotfix-check-harness.js': [1, 14, 15, 16, 17, 18, 19, 20]
};
```

### Header comments, word for word

`tests/hotfix-check.test.js` keeps old lines 3-12 unchanged as the start of its header, then:

```js
//
// Since 2026-10-12 this file holds one area of those cases: the passes and refusals through
// the menu (cases 1 to 23, 25 and 27; case 26 is checked inside case 1), the ninth round's size
// rule and its names that are dependencies, the build or settings, the tenth round's table of
// every removed extension, and its refusals through the real menu process. The other
// areas are tests/hotfix-check-test-run.test.js, tests/hotfix-check-copy-and-log.test.js,
// tests/hotfix-check-review-findings.test.js, tests/hotfix-check-readers.test.js and
// tests/hotfix-check-guards.test.js; the shared setup and the private temporary folder are
// tests/helpers/hotfix-check-harness.js. Split, every test word for word, by the plan
// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.
```

Each other file starts with its area lines followed by the same closing three lines:

```js
// Moved word for word out of tests/hotfix-check.test.js by the plan
// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.
// The shared setup and this file's private temporary folder: tests/helpers/hotfix-check-harness.js.
```

Area lines, word for word and line for line (the proof matches each comment line exactly; the
case numbers are those of
`plans/done/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s1-the-hotfix-check.md`).

`tests/hotfix-check-test-run.test.js`:

```js
// The hotfix check's second call, the test run: which test command runs, how the run's
// output is read, the commit it prepares and the faults that stop it (cases 30 and 32 to 38),
// a skipped test and the test command's process tree (the tenth round and after), and every
// runner's failing and passing summary.
```

`tests/hotfix-check-copy-and-log.test.js`:

```js
// The copy the hotfix check runs the tests in, the package folders linked into it,
// and the check's log: what the check leaves in the project, in the copy and in the log (cases
// 24, 28, 29, 31 and 39 to 53).
```

`tests/hotfix-check-review-findings.test.js`:

```js
// The code review's and the security check's findings of 2026-10-08 against the
// hotfix check (findings 1 to 11 and the second round), each written and seen failing before
// its fix, and the ninth round's paths and names (governing folders, sensitive words,
// byte-order marks and line endings).
```

`tests/hotfix-check-readers.test.js`:

```js
// The hotfix check's readers: every branch of the trial build's cases (deleted and
// linked files, text that is not UTF-8, names, run output, edge shapes, projects in a
// sub-folder) and the third to sixth rounds of the page and stylesheet readers (the fourth
// round's fail-closed scanners are in tests/hotfix-check-guards.test.js).
```

`tests/hotfix-check-guards.test.js`:

```js
// The hotfix check's guards: the fourth round's fail-closed scanners, the ninth round (the
// stylesheets, a long path, an added or deleted path, the copy's removal, failing closed,
// transforms), the tenth round's fixes in what stays, and the re-checks of 2026-10-10.
```

### Per-process state, and whether any test depends on an earlier one

- **The private folder and the scratch list.** `PRIVATE_TMP` is created when the harness is
  first required (`const PRIVATE_TMP = tmpDir('hotfix-private-tmp-')`, old line 97) and
  `scratch` is the harness's own array. `node --test` starts each test file in its own child
  process (functional plan section 1, fact 1, verified there), and `src/scripts/test-gate.js`
  passes no isolation option (lines 424-428; a search for `test-isolation` over the repository
  outside `plans/` and `node_modules/` found 0 files). So each of the six files gets exactly one
  private folder and one scratch list, created at its load and removed at its end: the same as
  the old file had, once per file instead of once in all. The test file's own `require` of
  `../src/lib/quality-agent`, `../src/lib/safe-fs` and `../src/lib/menu-screens` resolves to the
  same module instance the harness reaches, so every `t.mock.method(qualityAgent, …)`,
  `t.mock.method(safeFs, …)` and `t.mock.method(fs, …)` reaches the code under test as before.
- **The hooks.** `test.after` and `test.afterEach` are top-level statements of the helper, so
  they are called once per process when the first `require` of the helper runs, which each file
  does synchronously at its top before its first test; they register on that process's root test
  exactly where the old file registered them (believed from Node's hook registration; criterion 6
  proves it per file by running).
- **State a test changes, by reading every test.** Each test builds its own repositories with
  `tmpDir`/`makeRepo`. `withEnv` restores every variable in `finally` (old lines 158-171).
  Every `t.mock.method` is undone by `t.mock.restoreAll()` in the test and by the runner at the
  test's end. `process.platform` is restored in `finally` (case 46, lines 1014-1021). The
  read-only `.ctoc` folder is reopened in `finally` (line 1386). `process.chdir(PRIVATE_TMP)`
  happens only inside a mocked `runFullTests` (finding 10, line 1591), and the check restores
  the working folder (case 1 asserts this, line 325). Finding 11 compares signal listener
  counts before and after inside the same test (lines 1650-1655). The tests that leave a
  `ctoc-hotfix-` folder on purpose remove it themselves (lines 929, 1612, 1628, 2419-2422,
  2444-2447, 2471, 2493). In `src/lib/hotfix-check.js` the one module-level variable that
  changes, `scanFault` (line 899), is reset at the start of every read (line 1294); the other
  module-level values are constant sets.
- **Result:** by reading, no test depends on an earlier test's state, so the exception list is
  expected to be empty. Criterion 7 (each file alone three times, and all six together) is the
  run that would show a dependency this reading missed. If one shows, the test is changed
  before the split lands, and the change goes on the exception list in the build record with
  the old statement, the new statement, the reason, and the demonstration that it only
  tightens (it passes in fewer wrong worlds); the proof script reads the same entry from
  `split-exceptions.json` (below). Any other difference fails criteria 4 and 5.

### The split, a scratch script: `split-the-file.js`

No new file is typed or edited by hand: this script writes all seven from the base file's own
text. In `SCRATCH`, never committed; its source and its output go into the build record, paths
relative to the repository root or `SCRATCH`. Run:
`node SCRATCH/split-the-file.js <repository root> 79f99476`. Standard library and the
repository's TypeScript only, loaded as the proof loads it; `git` started with an argument list
and no shell.

1. **Read and parse the base file.** Its text is the standard output of
   `git show 79f99476:tests/hotfix-check.test.js` run in the repository root, parsed with
   `ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)`.
2. **Refuse on any mismatch.** Print why, exit 1 and write nothing unless: the file has 178
   top-level statements; every old line of the script's assignment table (its own copy of `WHERE`
   below, typed from this plan's tables) is the start line (`getStart`) of exactly one top-level
   statement; those 166 lines and the 12 require lines (1, 14-20, 22-25) name each of the 178
   statements once; old line 1394 starts with `// The code review's`, old line 1397 is `/**`,
   old line 1404 is `const TIMED_MS = 40;` and old line 1461 starts with `test('finding 1:`.
3. **One piece per statement.** A statement's piece is
   `text.slice(stmt.getFullStart(), stmt.getEnd())`: the line breaks, blank lines and comments in
   front of it, then the statement. One exception: `TIMED_MS` (old line 1404) is cut at the line
   break that ends old line 1395, so its piece opens with blank line 1396 and its JSDoc from old
   line 1397. The part in front of that cut, from its `getFullStart()` to the line break (the
   section comment of old lines 1394-1395), is written once, in
   `tests/hotfix-check-review-findings.test.js`, right before the piece of old line 1461. The two
   parts together are exactly the old range, so no comment is written twice and none is lost.
4. **Each of the six test files**, in this order: `'use strict';`; its header (for
   `tests/hotfix-check.test.js` the base text from the end of old line 1 to the end of old line
   12, then a line break and the nine added lines under "Header comments, word for word"; for
   each other file a blank line, its area lines and the three closing lines); a blank line and
   its require lines from its `REQUIRES` row, each the base text of that old line, in old order,
   with a blank line before the first `../src` require; a blank line and its harness import line
   with that file's names in this plan's order, wrapped at 100 columns with two-space
   indentation; the pieces of its `WHERE` row in old order; a final line break. A piece that opens
   with a single line break (it was glued to its old predecessor in the old file) gets one blank
   line in front when the piece written just before it is not that predecessor; the junctions so
   changed are printed (the two the review found: old lines 28 and 971).
5. **The helper**: `'use strict';`; a blank line and its header word for word; a blank line and
   the base text of old lines 14-20; a blank line and
   `const { route } = require('../../src/lib/menu-screens');`; the pieces of its `WHERE` row in
   old order, the two cleanup hooks (old lines 100 and 105) included as pieces like any other;
   then a blank line, the export list word for word, and a final line break.
6. **Write** exactly the seven paths under the repository root (`path.join(root, rel)`;
   `tests/helpers` made if absent), overwriting `tests/hotfix-check.test.js`, and print each path
   with its line count. Nothing else is written.

Exception entries are applied by this script too: it reads `SCRATCH/split-exceptions.json`
and writes a changed statement's `newText` in place of that old statement's text (its leading
comments unchanged), and an added statement's `newText` after a blank line right after
the harness import in the file the entry names. With the expected empty list nothing changes.

When lint asks for a change to an import list, the change is made in this script (a file's
harness names, or a listed require dropped) and the script is re-run, so its recorded source
reproduces the files. A require that lint needs beyond the file's `REQUIRES` row is not added: the
build stops and reports it to the CTO Chief, because that table is then wrong and is redone
upstream.

The proof below stays independent of this script: it re-reads the base file and the written
files and checks them against its own `WHERE` table and this plan's word-for-word texts; nothing
the split script computes is an input to it. Both scripts take their tables from this plan, so a
wrong row in the plan would be in both; the line tables are what the reviews of Step 11 read
against the base file.

### The proof, a scratch script: `prove-the-split.js`

Written in the build's scratch folder (the folder `test-speed-build` in the session's scratch
folder, given to the executor by the CTO Chief; below `SCRATCH`, which the script takes as its
own `__dirname`). Never committed; its source and its output go into the build record with
every absolute path written relative to the repository root or to `SCRATCH`, because absolute
paths here carry an account name.

Run: `node SCRATCH/prove-the-split.js <repository root> 79f99476`. Exit 0 only when every
check below passes. It uses only the standard library and the repository's own TypeScript
(`require(require.resolve('typescript', { paths: [root] }))`; `typescript` is a development
dependency, `package.json` line 27). Every child process is started with an argument list and
no shell; `NODE_TEST_CONTEXT` is deleted from every child's environment.

Two modes, each given after the commit name:

- `--tap-from <folder>`: the name check reads each of the six files' TAP output from
  `<folder>/<label>.tap` instead of starting it (`<label>` is the file name without `.test.js`:
  `hotfix-check`, `hotfix-check-test-run`, and so on), and the base copy's from
  `SCRATCH/tap/base.tap`, which every full run writes (the base never changes). It is used with
  criterion 7's first alone-runs, `--tap-from SCRATCH/alone-1`, so the proof starts no heavy test
  process there. A missing TAP file fails the run. Each of those runs' exit status is the one the
  build record holds for it, and the script prints that it did not see it.
- `--static <new root>`: static only. The seven new files are read from `<new root>/tests/`
  instead of the repository root; no test process is started and no base copy is made (the base
  text is read from `git show`). It runs the presence check, the static name check, the assertion
  check and the statement check with its order, require-line, added-text and exception parts,
  and nothing else. Used for the real split right after it is written and for the mutants under
  "The proof is shown to fail on a wrong split".

1. **The old file at the base commit** (not done in `--static` mode).
   - Refuse to go on unless `git diff --quiet 79f99476 -- src` exits 0 in the repository (this
     slice changes nothing under `src/`, so the old file run against today's `src/` is the old
     file at the base commit). Print the refusal and exit 1 otherwise.
   - Make `SCRATCH/base-79f99476/` if absent, with `src` and `node_modules` as directory links
     to the repository's own (`fs.symlinkSync(target, link, process.platform === 'win32' ?
     'junction' : 'dir')`, made only when the link does not exist yet), and write
     `SCRATCH/base-79f99476/tests/hotfix-check.test.js` from the standard output of
     `git show 79f99476:tests/hotfix-check.test.js` (overwritten on every run). The old file's
     `require('../src/…')` and `START` then resolve through the link; Node resolves real paths,
     so modules are the repository's own. The script never deletes anything in this folder.
2. **Presence.** The six files and the helper must exist (under `<new root>` in `--static`
   mode); each missing one is printed as `missing: <path>` and fails the run; the checks below
   still run over the files present.
3. **Names (criterion 3).** Run, all at once with `child_process.spawn`, `node --test
   --test-reporter=tap <file>` (working folder: the repository root; time limit 900 s per
   process, killed and failed after it) for the old base copy and for each of the six files,
   and write each standard output to `SCRATCH/tap/<label>.tap` (`base.tap` for the old file).
   With `--tap-from <folder>` the six files' outputs are read from that folder and the base's
   from `SCRATCH/tap/base.tap`, and nothing is started. Parse each output line by line:
   - skip YAML blocks: a line whose trimmed text is `---` opens one, `...` closes it;
   - `^((?: {4})*)# Subtest: (.*)$` starts a test at depth `group1.length / 4`; keep a stack,
     cut it to that depth, push the name, and record the key `JSON.stringify(stack)` (the full
     nesting path);
   - `^((?: {4})*)(ok|not ok) \d+ - (.*?)( # (SKIP|TODO)\b.*)?$` is a result line;
   - `^# (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$` at depth 0 are the counters
     (take the last of each).
   - For each run require: exit status 0; the number of `# Subtest:` lines equals the number of
     result lines equals the `tests` counter; `fail`, `cancelled`, `skipped`, `todo` all 0; no
     `not ok`, no SKIP or TODO directive. (Verified shape: the CTO Chief's `hotfix-before.tap`
     on Node v24.14.1 has no per-file wrapper, top-level tests at depth 0, subtests indented by
     four spaces, `# tests 131`, lines 1-3, 194-208, 805-812.)
   - Compare the multiset of keys of the old file with the multiset over the six files. Print
     both counts (expected 131 and 131) and every key whose count differs, with both counts.
   - **The static name check**, in `--static` mode instead of the runs: from the parse of the
     base text and of the six files, every call whose callee is the identifier `test` or a
     property access named `test` (a subtest, `t.test`) gives the key `JSON.stringify` of the
     `getText()` of the first argument of each enclosing such call, outermost first, then its
     own. `test.after` and `test.afterEach` are not counted (their property name is not
     `test`). The old multiset of keys must equal the multiset over the six files; every
     differing key is printed with both counts.
4. **Assertion calls (criterion 4).** For the old base copy, the six files and the helper:
   `ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)`; walk
   every node with `ts.forEachChild`; a node counts when `ts.isCallExpression(node)` and its
   callee is the identifier `assert`, or a property access whose object is the identifier
   `assert`. Record `node.getText(sf)` byte for byte, with no whitespace normalisation: the
   only re-indented statements, old lines 100 and 105, hold one assert call between them,
   written on one line (old line 106), and the `getText()` of a one-line call holds none of the
   indentation in front of it; every other assert call sits in a statement moved byte for byte.
   Text inside fixture strings is not a call node and is not counted (functional plan decision
   5). The expected new multiset is the old one with, for each exception entry, the assert calls
   of its `oldText` taken out (when it has one) and those of its `newText` put in; those are
   printed as exceptions. Compare it with the multiset over the seven new files; print both
   totals and every text whose count differs.
5. **Top-level statements (criterion 5).**
   - Old: `sf.statements` of the base copy. Require exactly 178. A statement is a *require
     line* when it is the `'use strict'` directive, or a variable statement every declaration
     of which is initialised by `require('<string>')` with one string argument; require
     exactly 12 of them (old lines 1, 14-20, 22-25).
   - New candidates: the top-level statements of the six files and the helper.
   - Texts are compared byte for byte (`getText(sf)`), with no exception: old lines 100 and 105
     are top-level statements of the helper like the others.
   - Each old require line must have at least one candidate with the same text (print how
     many).
   - Each of the other 166 old statements, keyed by the 1-based line of `stmt.getStart(sf)`,
     must have exactly one candidate with the same text, in the file the table
     `WHERE` names (lines 100 and 105 in the helper).
     The script first checks that `WHERE` names every one of the 166 lines once and no other
     line. `WHERE` (from this plan's tables):

     ```js
     const WHERE = {
       'tests/hotfix-check.test.js': [27, 315, 334, 341, 347, 361, 370, 377, 384, 391, 408, 414,
         425, 438, 447, 465, 471, 482, 492, 514, 527, 533, 540, 582, 607, 2078, 2122, 2674, 2705],
       'tests/hotfix-check-test-run.test.js': [677, 704, 717, 727, 745, 781, 789, 795, 2896,
         3049, 3082, 3085, 3144],
       'tests/hotfix-check-copy-and-log.test.js': [308, 546, 623, 664, 666, 694, 802, 817, 836,
         864, 872, 874, 933, 971, 976, 1004, 1033, 1070, 1116, 1130, 1140, 1162, 1171],
       'tests/hotfix-check-review-findings.test.js': [1461, 1489, 1523, 1550, 1557, 1563, 1584,
         1648, 1686, 1718, 1740, 2292],
       'tests/hotfix-check-readers.test.js': [1189, 1203, 1209, 1226, 1236, 1251, 1261, 1279,
         1355, 1366, 1376, 1765, 1873, 1886, 1948, 2018],
       'tests/hotfix-check-guards.test.js': [1826, 2191, 2350, 2363, 2401, 2497,
         2615, 2741, 2742, 2744, 2797, 2836, 2871, 2930, 2959, 2988, 3112, 3137],
       'tests/helpers/hotfix-check-harness.js': [28, 29, 30, 31, 32, 34, 36, 47, 55, 57, 61, 62,
         69, 85, 86, 87, 89, 90, 91, 97, 98, 100, 105, 112, 114, 120, 128, 136, 153, 158, 178,
         184, 187, 192, 197, 199, 200, 201, 204, 218, 231, 242, 244, 254, 267, 275, 284, 300,
         954, 1101, 1404, 1405, 1421, 1443, 1449]
     };
     ```
     (29 + 13 + 23 + 12 + 16 + 18 + 55 = 166.)
   - **Order:** in each new file, the old lines of its matched statements, in the order they
     appear, strictly increase.
   - **Require lines, per file:** every require line of each of the seven files must be
     byte-equal to the base text of an old line its `REQUIRES` row names (under "How each file
     starts"), or, in the helper only, to
     `const { route } = require('../../src/lib/menu-screens');`, or, in each of the six test
     files exactly once, be a variable statement initialised by
     `require('./helpers/hotfix-check-harness')` whose binding is an object pattern of
     shorthand names (the names are not compared with the plan's lists; lint is the arbiter).
     A file may hold fewer of its row's lines; any other require line is printed and fails the
     run.
   - **Added text:** every other candidate that matches no old statement must be one of: in
     each of the six test files exactly one harness import (above); in the helper, one statement
     `module.exports = { … };` whose object holds only shorthand properties equal, in order, to
     the export list above; an added statement of an exception entry, once, in the file the
     entry names. Anything else is printed as unexpected and fails the run. Beyond that: in each
     test file the harness import comes before the first statement that is no require line (so
     the helper, with its hooks, is loaded before the first test), and no file holds the text
     `registerCleanup` any more (an exact absence check). Every added
     statement is printed with its file (this is the list criterion 5 asks for).
   - **Exceptions:** `SCRATCH/split-exceptions.json` (an array, `[]` unless criterion 7 found a
     dependency) holds entries of two kinds, each printed as an exception. A *changed
     statement*, `{ "oldLine", "file", "oldText", "newText", "reason", "tightens" }`: for that
     line the script accepts `newText` in place of the old text in checks 4 and 5. An *added
     statement*, `{ "oldLine": null, "file", "newText", "reason", "tightens" }`: the added-text
     check accepts it once in `file`, and the assertion check counts its assert calls on the
     new side.
6. **Comments** (not run in `--static` mode). For every top-level statement and for `sf.endOfFileToken`, collect the text of each
   range of `ts.getLeadingCommentRanges(text, node.getFullStart())`, byte for byte; every `//`
   line is its own range. For every comment text, its count over the seven new files must equal
   exactly its count in the old file plus its count among the allowed added comments; every
   text whose count differs is printed with the three numbers. The allowed added comments,
   held in the script word for word from this plan, each in the file named: the nine added
   header lines of `tests/hotfix-check.test.js`; for each of the five other test files its area
   lines and the three closing lines (under "Header comments, word for word"); in the helper, its
   header block (under "The helper module"). Each allowed added
   comment must also be found in the file named for it. This is stricter than criterion 5,
   which compares statements only: no explanatory comment is lost, none is written twice, and
   none is added beyond this plan's.
7. **Output** (copied into the build record): the mode, the two name counts, the two assertion
   totals, 178 statements found, the require lines with their counts, the added statements and
   comments, the exception entries, `PASS` or the failures.

### Each file cleans up after itself (criterion 6): `prove-each-file-cleans-up.js`

Also in `SCRATCH`, never committed, its source and output in the build record. Run:
`node SCRATCH/prove-each-file-cleans-up.js <repository root>`; exit 0 only when every check
passes. With `--planted-only <file>` after the root, where `<file>` is one of the six files, and
`--helper <file>` where `<file>` is a copy of the helper (the leftover mutant under "The proof is
shown to fail on a wrong split"), it writes and runs, after the probe of step 4, only that
file's planted copy against that helper copy (a real `tests/helpers` folder holding it, in place
of the link of step 2), and applies the planted requirements of step 6 to it.

The planted copies run with the name pattern
`^planted: a ctoc-hotfix- folder is left in the private temporary folder$` (given as
`--test-name-pattern=<pattern>`, one argument, no shell), so only the planted test runs; the
reporting copies always run in full.

1. Fail at once, naming them, if any of the six files or the helper is missing.
2. Make a new folder `fs.mkdtempSync(path.join(SCRATCH, 'cleanup-proof-'))` holding directory
   links `src` → the repository's `src`, `node_modules` → its `node_modules`, and
   `tests/helpers` → its `tests/helpers` (junctions on Windows). The script never deletes
   anything there; each run makes a new folder.
3. For each of the six files `X.test.js` write two copies into the new folder's `tests/`:
   - **The planted copy** `X.planted.test.js`: the file's text unchanged, then this test
     appended:
     ```js
     test('planted: a ctoc-hotfix- folder is left in the private temporary folder', () => {
       require('fs').mkdirSync(require('path').join(require('./helpers/hotfix-check-harness').PRIVATE_TMP, 'ctoc-hotfix-planted'));
     });
     ```
     The harness is the module the copy already loaded (same real path), so `PRIVATE_TMP` is
     this process's private folder.
   - **The reporting copy** `X.reporting.test.js`: the file's text with these lines inserted
     right after its first line `'use strict';` (before its requires, so the harness's
     `PRIVATE_TMP` is recorded too):
     ```js
     const reportFs = require('fs');
     const reportPath = require('path');
     const reportMade = [];
     const reportMkdtemp = reportFs.mkdtempSync;
     reportFs.mkdtempSync = function recordingMkdtemp(prefix, ...rest) {
       const made = reportMkdtemp.call(reportFs, prefix, ...rest);
       if (reportPath.basename(prefix).startsWith('hotfix-')) reportMade.push(reportFs.realpathSync.native(made));
       return made;
     };
     process.on('exit', () => reportFs.writeFileSync(process.env.CTOC_CLEANUP_REPORT, JSON.stringify(reportMade)));
     ```
     Every scratch folder of the file is made by `tmpDir` (old lines 91-95), whose prefixes all
     start with `hotfix-`; the check's own `ctoc-hotfix-` copies are not recorded here (the
     after-each check covers them).
4. **The probe**, before any other run: the planted copy of `tests/hotfix-check.test.js` alone,
   `node --test --test-reporter=tap --test-name-pattern=<pattern> <copy>`. If it exits not 0
   and its output holds `no temporary copy of the check remains` on a `not ok` of the planted
   test, the after-each hook ran for the matched test: every planted copy runs with the pattern,
   and the probe run is that file's planted run. Otherwise every planted copy runs in full,
   without the pattern, and the script prints
   `fallback: the name pattern skipped the after-each hook; planted copies ran in full`. The
   probe's exit status and matched line are printed either way and go into the build record.
5. Then run the other copies at once with `node --test --test-reporter=tap <copy>`, the planted
   ones with or without the pattern as the probe decided (working folder: the repository root;
   `CTOC_CLEANUP_REPORT` set per reporting copy to `<new folder>/X.made.json`; time limit 900 s
   each).
6. Require for each **planted** copy: exit status not 0; the output contains
   `no temporary copy of the check remains`; at least one `not ok` result at depth 0, and every
   `not ok` result names the planted test. Require for each **reporting** copy: exit status 0;
   the JSON file exists; it lists exactly one path whose name starts with
   `hotfix-private-tmp-` and at least one other; `fs.existsSync(p)` is false for every listed
   path.
7. Print the probe's result, whether the pattern was used, and per file: the planted copy's
   status and the matched line, the reporting copy's count of recorded folders and the count
   still present (must be 0). That the unmodified file passes is shown by criterion 7's runs.

### The proof is shown to fail on a wrong split (mutants)

Right after the split (Step 10) and before the review, the static proof first passes on the real
split (`node SCRATCH/prove-the-split.js <repository root> 79f99476 --static <repository root>`,
exit 0), so each failure below comes from its one edit. Then four wrong splits are made in
`SCRATCH/mutants/`, and each must fail naming its defect.

- Three static mutants, each a folder `SCRATCH/mutants/<name>/` holding `tests/` and
  `tests/helpers/` with copies of the seven written files and one edit:
  1. `assert-deleted`: in `tests/hotfix-check-guards.test.js`, the line of old line 3000
     (`assert.equal(twice.verdict, 'refused', JSON.stringify(twice));`, inside the test of old
     line 2988) is deleted.
  2. `test-duplicated`: the text of the test of old line 1203 (`a file that is not valid UTF-8
     is not text`, in `tests/hotfix-check-readers.test.js`) is appended, after a blank line, to
     the end of `tests/hotfix-check-guards.test.js`.
  3. `name-changed`: in `tests/hotfix-check.test.js`, the name of the test of old line 607
     changes one character, `an unknown` to `an Unknown`.

  Each runs `node SCRATCH/prove-the-split.js <repository root> 79f99476 --static
  SCRATCH/mutants/<name>` and must exit 1 naming its defect: the deleted call's text with its
  old and new counts, and old line 2988 without a candidate; the duplicated name with counts 1
  and 2, and old line 1203 found twice; both names with their counts, and old line 607 without
  a candidate.
- The leftover mutant: `SCRATCH/mutants/no-cleanup/hotfix-check-harness.js`, a copy of
  `tests/helpers/hotfix-check-harness.js` without its two cleanup hooks (old lines 100-107).
  `node SCRATCH/prove-each-file-cleans-up.js <repository root> --planted-only tests/hotfix-check-readers.test.js --helper SCRATCH/mutants/no-cleanup/hotfix-check-harness.js`
  must exit 1 because that planted copy exited 0. A helper without the hooks registers no
  end-of-file cleanup and no leftover check, so its private folders stay in the system temporary
  folder; the record names them by folder name only.
- All four failures are quoted in the build record, each with its edit. A mutant that exits 0,
  or fails without naming its defect, is a fault in the proof script, fixed there; the fixed
  script is then re-run on the real split and on all four mutants.

### The per-file reporter, `SCRATCH/per-file-reporter.cjs`

Used by every timing run so that per-file durations come from the runner's own events:

```js
'use strict';
// One line per test file summary and one per top-level test, from the runner's own events.
module.exports = async function * perFile(source) {
  for await (const { type, data } of source) {
    if (type === 'test:summary' && data.file) yield `file\t${data.file}\t${data.duration_ms}\n`;
    else if ((type === 'test:pass' || type === 'test:fail') && data.nesting === 0 && data.file) {
      yield `test\t${data.file}\t${data.details.duration_ms}\t${type === 'test:pass' ? 'pass' : 'fail'}\t${data.name}\n`;
    }
  }
};
```

A file's duration is its `file` line (the `test:summary` event the runner emits per test file;
believed for Node v24.14.1, not run while planning). If a run prints no `file` lines, the file's
duration is the sum of its `test` lines, the record says so, and both sides of every comparison
use the same source.

### Measurement (criteria 1, 7, 8 and 9)

Recorded for every run (functional plan, "How every slice is measured"): the command; wall
clock, user and system time (`/usr/bin/time -p`, written to a `.time` file); the one-minute load
before and after (`node -p "require('os').loadavg()[0].toFixed(1)"`); the core count
(`node -p "require('os').availableParallelism()"`); `node --version`; `git rev-parse HEAD`;
passed, failed and skipped counts; the per-file durations and the longest file; and which of
semgrep, osv-scanner, trufflehog, detect-secrets, gosec and bandit `which` finds. All commands
run from the repository root.

- **Before, whole suite (criterion 9, measures b and c)** — on the unchanged tree, before the
  split. The CTO Chief's baseline (368.5 s wall, 802.2 s processor, load 17.2 to 30.5) is kept
  in the record, but its output is the spec reporter's, which names a file only for the few
  files that hold no `node:test` test (for example `✔ tests/crypto.test.js (100.421541ms)`,
  `baseline.tap` line 2935, a file that prints its own results, `tests/crypto.test.js` lines
  15-24); for every other file it gives no file duration, so it cannot give the longest file.
  A second before run with the per-file reporter:
  `/usr/bin/time -p node --test --test-reporter=spec --test-reporter-destination=SCRATCH/suite-before.spec --test-reporter=SCRATCH/per-file-reporter.cjs --test-reporter-destination=SCRATCH/suite-before.per-file tests/*.test.js 2> SCRATCH/suite-before.time`.
  This is `npm run test:raw` (`node --test tests/*.test.js`, `package.json` line 12, no
  coverage) with a second reporter.
- **Each file alone three times, then all six together (criterion 7)** — after the split. For
  each file, three consecutive calls, k = 1, 2, 3:
  `/usr/bin/time -p node --test --test-reporter=tap --test-reporter-destination=SCRATCH/alone-<k>/<label>.tap <file> 2> SCRATCH/alone-<k>/<label>.time`
  (`<label>` as in the proof); the six sequences run at the same time (each call still holds
  one file). Then one `/usr/bin/time -p node --test <the six files> 2> SCRATCH/together.time`
  call. Every run: exit status recorded, 0 failed, 0 skipped; the record holds each run's
  duration and load. The proof's name check reads the first runs' TAP
  (`--tap-from SCRATCH/alone-1`) instead of starting the six files again.
- **Paired, interleaved runs (criterion 8, measure a)** — after the split. Exactly two pairs,
  each run once, in this order, each with load before and after; every run is recorded, none is
  discarded or repeated, whatever its load:
  1. before: `/usr/bin/time -p node --test --test-reporter=spec --test-reporter-destination=SCRATCH/pair-1-before.spec --test-reporter=SCRATCH/per-file-reporter.cjs --test-reporter-destination=SCRATCH/pair-1-before.per-file SCRATCH/base-79f99476/tests/hotfix-check.test.js 2> SCRATCH/pair-1-before.time`
  2. after: the same reporters with `pair-1-after.*`, over `tests/hotfix-check.test.js
     tests/hotfix-check-test-run.test.js tests/hotfix-check-copy-and-log.test.js
     tests/hotfix-check-review-findings.test.js tests/hotfix-check-readers.test.js
     tests/hotfix-check-guards.test.js` in one call.
  3. before again (`pair-2-before.*`), 4. after again (`pair-2-after.*`).
  - In each pair: the longest new file's duration at most 25% of the old file's duration in
    that pair; both sides' wall clock and processor time recorded; the after side's wall clock
    against the before side's.
  - A pair whose longest new file is above 0.25 of its old file leaves criterion 8 open; it is
    reported to the CTO Chief with both sides' load before and after.
  - A new per-test durations table (from the `test` lines of pair 1's after run) goes into the
    record beside the old one.
- **After, whole suite (criterion 9, a measured outcome)** — one run on the completion tree,
  the before command with `suite-after.*`, recorded as it comes out and never repeated to get a
  different longest file. If one of the six hotfix files is the longest, criterion 9 stays open
  and is reported to the CTO Chief with the numbers. The record names the file that sets the
  floor, with its duration and the run's load. Whole-suite processor time before and after is
  recorded (measure c); wall clock is recorded with its load and is never the only evidence.
- **The split's own processor cost, beside measure c.** In each pair, the after side's
  processor time (user plus system) against the before side's, the old file alone against the
  six together, is the split's own cost; both pairs' numbers are recorded beside the whole-suite
  processor time before and after. The spread is the difference between pair 1's after minus
  before and pair 2's. When the whole-suite difference (after minus before) is smaller in size
  than that spread, the record says so: the whole-suite difference lies within the variation
  between the two pairs.
- **Faster** is written only when every pair of measure a agrees, measure b agrees and measure
  c did not grow (criterion 1); otherwise the record names the measure that did not show it,
  with the numbers. This rule is unchanged by the cost recorded beside it.

### Counts (criterion 11)

`node src/scripts/release.js` reads `VERSION` and never writes it (`getVersion`, lines
135-142), writes a JSON version file only where its version differs from `VERSION` (lines
196-199), and rewrites the growing counts in `CLAUDE.md` ("Run all N test files", "tests/  N
test files") and `README.md` ("tests/ N test files"), where `testFiles` is the count of
`tests/*.test.js` (`src/lib/doc-counts.js` line 84). After running it:

- `git status --porcelain` must list only `CLAUDE.md` and `README.md` besides this slice's
  seven files, and `git diff` of those two must show only the three test-file count lines, each
  up by 5. `VERSION` unchanged. Anything else: stop, commit nothing, report the diff to the CTO
  Chief.
- `tests/readme-numbers.test.js` (its line 321-323 pin) passes, and `CLAUDE.md` stays at or
  under 15,000 bytes (the digits of the count only change value).
- Five new `tests/*.test.js` files move a documented count, so `CLAUDE.md` is declared
  (`src/lib/documented-counts.js` lines 63-75 and 144-174, checked when the plan moves to the
  queue); `README.md` is declared because the same script writes it.

### Tests run while building, and the one full run

While building, by name only:

- the six hotfix files; `tests/hotfix-check-corpus.test.js` and
  `tests/hotfix-check-differential.test.js` (unchanged; same module under test);
- `tests/readme-numbers.test.js`, `tests/doc-counts.test.js`,
  `tests/doc-counts-generated.test.js`, `tests/claude-md-keeps-every-rule.test.js` (the
  15,000-byte limit) — the counts and `CLAUDE.md`;
- `tests/skip-visibility.test.js` and `tests/skip-guard-integrity.test.js` — they read every
  `tests/*.test.js` file (lines 220-226 and 63-64), so they read the five new ones;
- lint of the seven files with the repository's own eslint, never through npx:
  `node node_modules/eslint/bin/eslint.js --max-warnings 0 tests/helpers/hotfix-check-harness.js tests/hotfix-check.test.js tests/hotfix-check-*.test.js`.

Other tests that name `tests/hotfix-check.test.js`: a search for `hotfix-check\.test` over the
repository outside `plans/` found one file, `tests/hotfix-check-corpus.test.js` (line 14, a
comment), already in the list. `tests/iron-loop-enforcer.test.js` and
`tests/reachability-surface-scan-is-linear.test.js` are not edited (not declared). The full
`npm test` runs once, at completion (criterion 2).

### Build order, test first (for the steps the integrator writes)

1. **Red, before any test file changes.** Write `prove-the-split.js`,
   `prove-each-file-cleans-up.js`, `per-file-reporter.cjs` and an empty
   `split-exceptions.json` (`[]`) in `SCRATCH`. Run both scripts on the unsplit tree:
   - `prove-the-split.js` fails: it prints the five test files and the helper as missing, and
     every statement `WHERE` expects outside `tests/hotfix-check.test.js` (76 tests, 8 file
     locals, 55 helper statements) as found in the wrong file, and the missing
     `registerCleanup();` call; its require-line check names the four require lines the old
     file holds beyond its `REQUIRES` row (old lines 17, 19, 24 and 25) and the missing harness
     import; its comment check names every allowed added comment as missing and nothing else.
     Its name and assertion checks pass at this point (the only present file is still the old
     one), which also shows the parser and the TAP reading work on the real file.
   - `prove-each-file-cleans-up.js` fails, naming the five missing test files and the helper.
   Both failures are quoted in the build record.
2. **Prepare.** Confirm `git diff --quiet 79f99476 -- src tests/hotfix-check.test.js` exits 0;
   otherwise stop (this plan's line table describes the base commit's file only). Make the
   before whole-suite run.
3. **Implement.** Write `split-the-file.js` and run it: it writes the helper and the six test
   files from the base file's text (re-indentation of the two hook statements is the only
   whitespace change). The static proof passes on the real split, then fails on each of the four
   mutants. Run `node src/scripts/release.js` and check its diff as above.
4. **Green.** Lint; `prove-the-split.js` passes; `prove-each-file-cleans-up.js` passes; then,
   after the review, the tests listed above; criterion 7's runs; the proof again from their TAP;
   the paired runs; the after whole-suite run; then the one `npm test`.
5. **Reviews** split by area and run in parallel, one per new file (functional plan, "The owner's
   process, per slice"); each reviewer gets the proof output and its file's rows of the tables.

### Security review

- No secrets, tokens or personal data are written. The build record holds no absolute path
  (the worktree and scratch paths carry an account name): paths are relative to the repository
  root or `SCRATCH`.
- The scratch scripts start `git` and `node` with argument lists, never a shell; the only input
  they take is the repository root, a commit name passed to `git show <commit>:<path>` as one
  argument, and, in the proof's and the cleanup script's modes, a folder or file under
  `SCRATCH`.
- `split-the-file.js` writes exactly the seven declared paths under the repository root and
  nothing else; the other scripts write only under `SCRATCH`.
- Directory links are created only inside `SCRATCH`, and the scripts never delete in a folder
  that holds a link, so nothing can be removed through a link into the repository.
- The moved tests are unchanged, so the security-relevant fixtures (symbolic links to outside
  folders, hard links, signal handling) behave as before.

## Wiring — the live call sites

- The six files are run by `npm test`: `src/scripts/test-gate.js` `resolveTestFiles` lists
  every `tests/*.test.js` file (lines 265-270) and starts `node --test …` over them (lines
  424-428); `npm run test:raw` (`package.json` line 12) runs the same glob. Nothing has to be
  registered: a new `tests/*.test.js` file is picked up by name.
- `tests/helpers/hotfix-check-harness.js` is reached only through
  `require('./helpers/hotfix-check-harness')` in each of the six files; it is not a `*.test.js`
  file, so neither listing runs it on its own.
- No file under `src/` changes; the product's behaviour is untouched.

## Acceptance criteria

Each maps to the functional plan's criterion of the same number.

- [x] 1. Every run listed under "Measurement" is in the build record with its items; "faster"
  is written only under the three-measure rule, otherwise the record says which measure did not
  show it.
- [x] 2. The one completion `npm test`: 0 failed, 0 skipped, coverage at or above
  `.ctoc/coverage-baseline.json`'s floor. Also met when every failure in it is confined to
  `tests/reachability-surface-scan-is-linear.test.js` or `tests/iron-loop-enforcer.test.js` and
  each such file passes re-run alone, recorded with its load; if either fails alone, this
  criterion stays open with the reason under it and is reported to the CTO Chief.
  Met by the one full npm test after the last slice: 13182 tests, 0 failed, 0 skipped, coverage 99.88% against a floor of 99%.
- [x] 3. `prove-the-split.js`: the multiset of 131 nested names of the old file equals that of
  the six files; script, output and both counts recorded; the name-changed mutant fails it,
  naming both names.
- [x] 4. Same script: assertion-call multisets equal byte for byte (old file vs six files plus
  helper), both totals recorded, the exception list empty or each entry with its old text (none
  for an added statement), new text, reason and tightening; the assert-deleted mutant fails it,
  naming the call.
- [x] 5. Same script: all 178 old top-level statements found byte for byte (166 exactly once, in
  the file the table names, in old order, lines 100 and 105 among them as top-level statements of
  the helper; 12 require lines at least once); each file's require lines within
  its `REQUIRES` row, plus one harness import per test file; the added text listed and limited to
  the export list, the helper's route require and exception entries;
  every comment count exact; the test-duplicated mutant fails it, naming the statement.
- [x] 6. `prove-each-file-cleans-up.js`: the probe's result recorded; each planted copy fails
  with "no temporary copy of the check remains"; each reporting copy's private folder and
  scratch folders are gone after its run; the no-cleanup mutant makes the script fail because its
  planted copy passed.
- [x] 7. Each file alone three times and the six together: every run passes with 0 skipped.
- [x] 8. Exactly two pairs, every run recorded and none repeated: in both pairs the longest new
  file is at most 25% of the old file; the two largest tests sit in different files (test-run
  and guards). A pair above 25% leaves this open, reported with both sides' loads.
  Met on processor time by CTO Chief ruling (decision 37), measured fresh in two interleaved
  pairs with each new file alone: pair 1 guards 17.46 s over the old file's 85.16 s = 0.205,
  pair 2 guards 17.57 s over 83.87 s = 0.209, both at most 0.25. The earlier wall-clock pairs
  (pair 1 0.497 at loads 40 to 55 against 41 to 43, pair 2 0.164) stay in the record unchanged
  beside them; the wall-clock ratio moved with the load the runs shared the machine with. The
  two largest tests sit in the test-run and guards files in both earlier pairs.
- [x] 9. One after whole-suite run, recorded as measured and never repeated: the before and
  after runs name their longest file with its duration and load; after the split no hotfix file
  is the longest, otherwise this stays open and is reported; processor time before and after
  recorded beside the two pairs' processor time.
  Met by CTO Chief ruling (decision 36): the one whole-suite run after the split (52.50 s,
  processor time 448.96 s against 592.89 s before, load 26.9 to 42.6) has as its longest file
  tests/hotfix-check-corpus.test.js at 48.87 s, a hotfix file this slice does not split; none of
  the six split files is the longest (guards is second at 37.22 s), so the split files no longer
  set the suite's floor, which is the criterion's purpose.
- [x] 10. The test "round 10: a file of a removed kind never qualifies, whatever its name and
  place" is in `tests/hotfix-check.test.js`; `tests/hotfix-check-corpus.test.js` is unedited.
- [x] 11. After `node src/scripts/release.js`: only the three count lines changed,
  `tests/readme-numbers.test.js` passes, `CLAUDE.md` at or under 15,000 bytes, `VERSION`
  unchanged.

## Risks

| Risk | Mitigation |
|---|---|
| The six files running together raise the machine's load, so the longest file runs slower than its share of the old file's time | The largest file is 18.7% of the old file, not the functional plan's 23.2%: about a 34% slowdown fits under 25%, against 7.6% for the first grouping (decision 1). Criterion 8's paired runs measure it |
| A test depended on an earlier test's state and fails once moved | By reading none does (section above). Criterion 7 runs each file alone three times and all six together; a failure goes through the exception list, never a weakened assertion |
| The ratio timing tests (findings 2a and 2c, round 9's long path) under more parallel load | They take the minimum of five runs and compare ratios (old lines 1406-1441); the full suite already runs them beside 566 files. A failure in criterion 7 is reported as found, the bound of 8 is never changed |
| Processor time grows a little: five more processes each load the menu router's modules | Measure c records both numbers; if it grew, the slice is not called faster (criterion 1) |
| `tests/hotfix-check.test.js` or `src/` changed after 79f99476 before the build starts (for example the hotfix plan's slice 2 landing first) | Step 2 of the build order stops on any difference; this plan's line tables would have to be redone upstream, not guessed |
| Node's per-file summary event is not emitted as believed | The reporter's fallback (sum of top-level durations), used on both sides of every comparison and named in the record |
| Running `release.js` changes something besides the three count lines (another count drifted, or a JSON version file differs from `VERSION`) | The build stops and reports the diff; nothing undeclared is committed |
| The proof shares a blind spot with the split, so a wrong split passes | The split is written by a script from the base text, the proof re-reads the base file and the written files and takes nothing from the split script, and four mutants, one per check, must each fail naming their defect before the review (Step 10) |

## The hotfix plan's next slice, after this split

`plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s2-a-labelled-commit-needs-a-passing-check.md`
declares `src/hooks/protect-records.js`, `src/lib/hotfix-check.js`, `docs/ENFORCEMENT.md`,
`tests/protect-records.test.js` and `tests/hotfix-check.test.js` (lines 9-14). Its Step 8 adds
five cases to `tests/hotfix-check.test.js` (lines 274-286). A search for `tests/hotfix-check`
over `plans/` found that plan as the only one not done that names the file. When it lands after
this split:

- Its cases 1, 3, 4 and 5 (a pass writes one record; the record matches what is staged;
  checking twice keeps one record; an unwritable record folder refuses) are new tests that fit
  `tests/hotfix-check.test.js` (passes and refusals through the menu) and use helpers that file
  already imports (`testedProject`, `buttonWording`, `check`, `runCommit`, `assertPass`); a name
  it needs beyond those is one more name on that file's harness import line.
- Its case 2, "Every refusal of slice 1's cases writes no file there", spans all six files after
  the split. Done as an extra assertion in the shared `refusedUntouched` (and wherever a test
  asserts a refusal without it), it needs `tests/helpers/hotfix-check-harness.js` and possibly
  the five other files, none of which that plan declares. Before that plan is queued its
  `files:` needs the helper (and any other split file it edits), or its build must ask through
  `src/lib/scope-growth.js`. That plan is still before its queue check, so its planner can add
  the line.
- If that plan lands first instead, this plan's line tables no longer describe the file and
  must be redone (build order step 2 stops). The two plans declare the same file, so they are
  built one after the other.
- Its new cases add time to `tests/hotfix-check.test.js` (43.9 s today); at 1 to 3 s each the
  file reaches at most about 59 s, still under 25% of the old file's 239.2 s (59.8 s).

## Decisions Taken Under Ambiguity

1. **Five tests move between the functional plan's areas, and one file is renamed, to meet
   criterion 8 with a margin.** The functional plan's grouping (its decision 1) gives the
   largest file 55.6 s, 23.2% of 239.2 s, beside 53.8 s for the first file. In the paired run
   the six files run together, each starting git and Node processes, and the CTO Chief measured
   the old file at 157 s and at 239 s on the same machine at different loads (functional plan
   section 1), so a few points of extra load can take a 23.2% file past 25%: it allows a 7.6%
   relative slowdown, this grouping allows 34% (both assumed, not measured; criterion 8
   measures it). Moves: case 24 (the copy leaves the project untouched) and case 28 (the log)
   out of `tests/hotfix-check.test.js`; cases 29, 31 and 39 to 44 (the copy and the log) out of
   the test-run file; all into the linked-packages area, which becomes "the copy, its linked
   packages and the log" and is named `tests/hotfix-check-copy-and-log.test.js` so its name
   says what it holds (the functional plan: "Candidate files are not a declaration; the
   implementation planner fixes each list"). Result: 43.9, 34.3, 42.4, 29.5, 42.6, 44.7 s; the
   largest 18.7%. Each moved test moves with its whole area (copy cases together, log cases
   together), and `tests/hotfix-check.test.js` keeps room for the hotfix plan's five new cases.
2. **`START` stays in `tests/hotfix-check.test.js`.** Both its users are there; in the helper
   `__dirname` would point at `tests/helpers` and its text would have to change, an exception
   entry with no reason to exist.
3. **The cleanup hooks.** First built as an explicit `registerCleanup()` call from each file
   (the functional plan's decision 3, "one call from each file"); replaced after the review of
   Step 11 by the helper's own top-level statements (decision 33).
4. **Statements only helpers use stay in the helper unexported** (`REAL_TMP`, `scratch`,
   `GIT_IDENTITY`, `snapshot`, `q`, `TIMED_MS`, `NOISE_MS`, `wallMs`), so the export list holds
   only names a test file uses.
5. **Section comments move with the test they introduce**, including old lines 1394-1395
   ("the code review's and the security check's findings of 2026-10-08"), which sit above
   `TIMED_MS` in the old file but introduce the findings, so they go to the review-findings
   file; the proof's comment check counts comments wherever they land.
6. **Headers name the plan by its file name "under plans/"**, without a stage folder or queue
   number, because the plan file moves between stage folders and may gain a number.
7. **The old file is run from a scratch copy with links to today's `src/` and `node_modules/`**,
   allowed only after `git diff --quiet 79f99476 -- src` shows `src/` unchanged since the base
   commit. Not chosen: a git worktree of the base commit (it would add an entry to the
   repository's shared worktree list), or a copy inside `tests/` (an undeclared file the suite
   and lint would pick up).
8. **A new before whole-suite run with a per-file reporter.** The CTO Chief's baseline output
   (spec reporter) gives a file duration only for files without `node:test` tests, so it cannot
   give the longest file of criterion 9; both runs are recorded.
9. **Whole-suite runs use `node --test … tests/*.test.js` with two reporters, not
   `npm run test:raw`.** Same runner, same files, no coverage, as `package.json` line 12; npm
   would place extra options after the file list, where Node is believed to take them as files
   (not checked).
10. **Criterion 7's "alone" runs** are one file per `node --test` call, three in a row per file,
    the six sequences at the same time; that is stricter on load than one at a time.
11. **The proof checks more than the three criteria ask:** where each statement landed against
    this plan's table, that each file keeps the old order, and that no comment was lost. The
    first makes the red run meaningful (on the unsplit tree every statement sits in one file);
    the other two cost nothing to check.
12. **Lint runs through `node_modules/eslint/bin/eslint.js`**, never `npx`, so no build step can
    reach the registry (slice 2's subject).
13. **This slice is over the one-to-three-file target**: seven own files. A split cannot be cut
    smaller without leaving the old file half moved, and the functional plan fixed the list.
14. **No question for the owner.** Every fork here is a quality call with one evident answer, or
    already settled by the functional plan.
15. **Execution steps in standard mode, not the refinement loop** (integrator, Step 7). The
    frontmatter says `effort: medium`, and no path in `files:` matches a glob in
    `.ctoc/config/refinement-triggers.yaml` (read in full: money, access, data, compliance,
    health, personal data, cryptography, infrastructure globs; none covers `tests/`,
    `CLAUDE.md` or `README.md`). So Steps 12 to 14 are single-pass checks.
16. **The review of Step 11 runs as five parallel reviews, grouped by file, dispatched by the CTO
    Chief.** The builder holds no dispatch tool (`agents/iron-loop/iron-loop-executor.md`
    line 4) and only the CTO Chief dispatches; the repository allows at most five background
    agents at once (`CLAUDE.md`, "Subagent Guidelines"), so seven files make five groups: the
    harness with the count lines; `tests/hotfix-check.test.js` with the test-run file;
    copy-and-log; review-findings with readers; guards. The reviewer is `iron-loop-critic`
    (the Iron Loop's Step 11 agent) at extra-high effort; at most two fix rounds.
17. **Whole-suite timing runs use this plan's two-reporter `node --test … tests/*.test.js`
    command (decision 9), under `/usr/bin/time -p`.** It is `npm run test:raw` plus the
    per-file reporter; plain `npm run test:raw` prints no per-file duration, so it could not
    name the longest file (criterion 9).
18. **Step 9 also times the old file alone once, from the base copy, before anything is
    split.** It is a reference with its load, recorded beside the CTO Chief's 239.2 s; it is
    not one of criterion 8's pairs, which stay interleaved after the split.

Taken in the specification critic's fix round (Step 7), with the CTO Chief's rulings:

19. **The seven files are written by a scratch script, `split-the-file.js`, from the base file's
    text**, each statement from its `getFullStart()` to its `getEnd()`. Not chosen: copying
    ranges by hand, which can drop or double a line that only the proof would notice. The proof
    stays independent: it re-reads the base file and the written files and takes nothing from
    the split script. `TIMED_MS` is cut at the line break ending old line 1395, because its
    leading trivia holds the section comment of old lines 1394-1395, which moves to the
    review-findings file (decision 5); cut at `getFullStart()`, that comment would be written
    twice.
20. **A static-only proof mode and four mutants.** A proof never seen failing on a wrong split
    is unproven, so one mutant per check (a deleted assert call, a duplicated test, a test name
    changed by one character, a helper without its cleanup hooks) must each fail, naming its
    defect, before the review; the static proof first passes on the real split so each failure
    is the edit's. The static mode starts no test process, because the base file alone takes
    about four minutes; its name check reads names from the parse, the TAP check stays the
    evidence for criterion 3. The mutated lines (old lines 3000, 1203 and 607, the readers file)
    are picked because each is a plain, one-place edit.
21. **Byte-for-byte comparison of statements, assert calls and comments**, except old lines 100
    and 105, compared after removing the two spaces of re-indentation. The assertion multiset
    needs no whitespace normalisation: the one assert call in the re-indented statements is on
    one line (old line 106), and `getText()` of a one-line call holds no indentation; every other
    call sits in a statement moved byte for byte. Comments are compared byte for byte too,
    because the split script copies them from the base text and the added ones from this plan.
22. **Comment counts are exact**: old count plus the plan's added comments, each named file by
    file. A surplus or a shortfall of one fails. The area lines are given line for line in code
    blocks, with the line breaks the plan's text already had, so the exact match has one text to
    match.
23. **Require lines are limited per file to the `REQUIRES` rows**, plus one harness import per
    test file whose names lint decides. A require lint asks for beyond a row stops the build and
    goes upstream, because the rows were made by reading every use (`os` and `crypto` are used
    only at old lines 89 and 199, both helper statements).
24. **An exception entry may also add a statement** (`oldLine` null): a dependency criterion 7
    finds might need a new statement rather than a changed one; the proof accepts it once in its
    file and counts its assert calls on the new side, printed as an exception. The split script
    applies every entry, so no file is edited by hand; an added statement goes right after
    the harness import, which needs no position field and keeps the old order of the moved
    statements intact.
25. **Planted copies run with a name pattern, after a probe; reporting copies run in full.** A
    planted copy only needs its planted test and the after-each hook; running the six files in
    full again costs their whole test time, about 237 s by the per-test durations, per proof run. The probe shows, per run,
    that the hook still runs for the matched test, and the script falls back to full runs if it
    does not. The proof's name check reads criterion 7's first alone-runs' TAP and reuses the base
    copy's TAP from the last full run (the base never changes), so no heavy run repeats.
26. **Exactly two pairs and one after whole-suite run, each recorded as it came out.** Repeating
    a run until it passes would turn a measured outcome into a selected one; a pair above 0.25 or
    a hotfix file as the suite's longest leaves its criterion open and is reported.
27. **Criterion 2, the CTO Chief's ruling**: met when every failure is confined to the two named
    files and each passes alone, recorded; a failure in one of the seven declared files goes back
    to Step 10; a failure in any other file is re-run alone once, recorded with its load, leaves
    criterion 2 open and is reported.
28. **The builder ends its turn after writing the review packets**, because only the CTO Chief
    dispatches the reviewers (decision 16); it resumes at the fix bullet when re-dispatched with
    the findings, and Steps 12 to 16 wait for the review outcome.
29. **The tool check moves to Step 8's first bullet**, because Step 8's scripts need the
    repository's TypeScript and Step 10's lint needs its eslint; nothing is installed.
30. **Step 16 filters changed paths as Step 10 does** (outside `plans/` and `.ctoc/`); a `.ctoc/`
    change is listed in the record and never committed, and the builder commits nothing (the CTO
    Chief's ruling).
31. **The pairs' processor time is recorded beside measure c as the split's own cost**, and the
    record says when the whole-suite difference is smaller than the spread between the two pairs.
    The rule of measure c is unchanged; the extra numbers say whether a whole-suite difference is
    larger than the run-to-run variation.

Taken in the Step 11 fix round, on the CTO Chief's fix list after five reviews (no critical
finding):

32. **Rebalance by four whole-test moves, chosen from the measured durations.** In the first
    full proof run (all seven processes at once, old file 132.75 s) guards took 0.302 and readers
    0.263 of the old file. Moved, unchanged and in old order, each with its comment block: old
    2078 (1.66 s) and old 2122 (5.51 s) from guards to `tests/hotfix-check.test.js`; old 2292
    (4.60 s) from guards to `tests/hotfix-check-review-findings.test.js`; old 1826 (3.48 s) from
    readers to `tests/hotfix-check-guards.test.js`, the file then lowest (28.33 s). The
    projection table is in the Execution Record. The bound of 0.23 for every file cannot be met
    by moving whole tests: the six projected durations add to 183.35 s and six files at 0.23
    hold 183.18 s, and the test-run file alone is at 0.242 through its indivisible 18.31 s test.
    The largest projected share is therefore test-run at 0.242, every other file at or below
    0.240; criterion 8 keeps its bound of 0.25 and is decided by the two pairs. On the plan's
    old-alone per-test durations the largest file is now `tests/hotfix-check.test.js` at 21.2%
    (it was 18.7%, guards); the two bases measure different loads and the pairs decide.
33. **The two cleanup hooks are the helper's own top-level statements again** (security finding
    F1 and review 1: a file that forgets `registerCleanup()` silently lost the leftover check
    and the removal). Old lines 100-107 sit byte for byte after `leftovers`, loaded once per
    process by the first `require` of the helper. `registerCleanup`, its export and its six
    calls are gone; the statement comparison needs no re-indentation exception; the proof now
    also checks that each test file imports the harness before its first non-require statement
    and that the text `registerCleanup` appears nowhere. The leftover mutant became a copy of the
    helper without its hooks, run through a new `--helper` option of the cleanup script.
34. **Two blank lines restored**: in `tests/hotfix-check-copy-and-log.test.js` before
    `const LINK_REPORT` and in the helper between the route require and `const NODE`. The split
    script does it by one rule (a piece glued to its old predecessor gets a blank line in front
    when it is not written after that predecessor) and prints every junction it changes; those
    two were the only ones.
35. **Area lines and imports followed the moves.** The area lines of the first, review-findings,
    readers and guards files name what they now hold; `STATUS_LINE` joined two harness import
    lines and `SETTING` left one, as lint required; no require line was added or dropped.
36. **Criterion 9 is met (CTO Chief ruling, 2026-10-13).** The longest file after the split is
    `tests/hotfix-check-corpus.test.js`, a hotfix file this slice does not split; none of the six
    split files is the longest. The criterion's purpose, that the split files no longer set the
    suite's floor, holds. Ticked.
37. **Criterion 8 is judged on processor time (CTO Chief ruling, 2026-10-13).** The wall-clock
    pairs were taken under unequal machine load (pair 1: 0.497 at loads 40 to 55 against 41 to
    43; pair 2: 0.164), which the measurement section itself calls unreliable on this shared
    machine. Criterion 8 is judged by a fresh measurement of processor time (user plus system) of
    each run from `/usr/bin/time -p`: exactly two interleaved pairs (the old file alone from the
    base copy, then the six new files each alone, then the same again), load recorded per run,
    every run recorded and none repeated. Met when, in both pairs, the largest new file's
    processor time is at most 25% of the old file's. The earlier wall-clock pairs stay in the
    record unchanged beside the new ones.

## What was not verified

- Nothing was run while planning. The line numbers, names, uses and the 178-statement count are
  by reading the file; the proof script re-derives the count and stops if it differs.
- That `test.after` and `test.afterEach`, top-level statements of a required helper, register on
  the loading file's root test as they did in the old file: criterion 6 runs it for every file
  (seen passing in the Step 11 fix round).
- That Node v24.14.1 emits a per-file `test:summary` event with `file` and `duration_ms`:
  believed; the reporter has a recorded fallback.
- That Node reports an after-each failure as a `not ok` on the test it followed: believed; the
  cleanup script also accepts the sentence anywhere in the output and requires a failing exit.
- The slowdown figures in decision 1 are arithmetic on the per-test durations, not
  measurements.
- That `--test-name-pattern` on Node v24.14.1 still runs a root `afterEach` hook for the matched
  test: believed; the cleanup script probes it on every run and falls back to full runs.
- That the seven `REQUIRES` rows are exactly what lint accepts: by reading; lint and the proof
  check them.

---

## Execution Plan (Steps 8-16)

`SCRATCH` is the build's scratch folder `test-speed-build` that the CTO Chief names in the
builder's brief. Every command runs from the repository root. Every timed run records the items
under "Measurement" (command; wall, user and system time from `/usr/bin/time -p` into a `.time`
file; load before and after with `node -p "require('os').loadavg()[0].toFixed(1)"`; core count;
`node --version`; `git rev-parse HEAD`; passed, failed and skipped counts; per-file durations
and the longest file; which of semgrep, osv-scanner, trufflehog, detect-secrets, gosec and
bandit `which` finds). No two timed runs overlap. A run that can pass 10 minutes is started in
the background and the turn ends; never a loop that sleeps and checks a file.

### Step 8: TEST (TDD Red)
- [x] First confirm that `node_modules/typescript/package.json` and `node_modules/eslint/bin/eslint.js` exist in the worktree; if either is absent, stop and report it to the CTO Chief, and install nothing
- [x] Write `SCRATCH/prove-the-split.js` exactly as "The proof, a scratch script" describes: base copy at 79f99476 with `src` and `node_modules` links, presence check, nested TAP names written to `SCRATCH/tap/` (criterion 3), the `--tap-from` mode, the `--static` mode with its static name check, assertion calls through the repository's TypeScript parser byte for byte (criterion 4), the 178 top-level statements byte for byte against the `WHERE` table with order, per-file `REQUIRES`, added-text and both kinds of exception entry (criterion 5), the exact comment counts, `NODE_TEST_CONTEXT` deleted from every child, argument lists, no shell
- [x] Write `SCRATCH/prove-each-file-cleans-up.js` exactly as "Each file cleans up after itself" describes: a new `cleanup-proof-` folder per run with `src`, `node_modules` and `tests/helpers` links, the planted copy and the reporting copy of each of the six files, the name-pattern probe and its fallback, the planted copies with the pattern and the reporting copies in full, the `--planted-only` mode, the per-file checks of criterion 6
- [x] Write `SCRATCH/per-file-reporter.cjs` word for word from the plan, and `SCRATCH/split-exceptions.json` holding `[]`
- [x] Probe the reporter once on a fast unchanged file, `node --test --test-reporter=SCRATCH/per-file-reporter.cjs tests/readme-numbers.test.js`, and record whether a `file` line appears; with none, the record names the fallback, the sum of `test` lines, for both sides of every comparison
- [x] Run `node SCRATCH/prove-the-split.js <repository root> 79f99476` on the unsplit tree and see it exit 1 for the stated reason only: the five new test files and the helper printed as missing; the 139 statements `WHERE` puts outside `tests/hotfix-check.test.js` (76 tests, 8 file locals, 55 helper statements, among them old lines 100 and 105 expected inside `registerCleanup`) printed as found in the wrong file; the missing `registerCleanup();` call; the require lines the old file holds beyond its `REQUIRES` row (old lines 17, 19, 24 and 25) and its missing harness import; every allowed added comment named as missing by the comment check, and no other comment. Its name check (131 and 131) and assertion check pass, which shows the TAP reading and the parser work on the real file, and `SCRATCH/tap/base.tap` is written
- [x] If the script finds a statement count other than 178 or a require-line count other than 12, stop and report to the CTO Chief: the line tables are wrong and are redone upstream, never guessed here. Red for any other reason is a fault in the script, fixed in the script
- [x] Run `node SCRATCH/prove-each-file-cleans-up.js <repository root>` and see it exit 1 naming the five missing test files and the helper
- [x] Quote both red outputs in the build record, every absolute path rewritten relative to the repository root or `SCRATCH`

### Step 9: PREPARE
- [x] Confirm `git diff --quiet 79f99476 -- src tests/hotfix-check.test.js` exits 0; otherwise stop and report to the CTO Chief, because this plan's line tables describe the base commit's file only
- [x] Record the machine facts once: core count, `node --version`, `git rev-parse HEAD`, the scanners `which` finds
- [x] The before run of the old file alone, from the base copy Step 8 made: `/usr/bin/time -p node --test --test-reporter=spec --test-reporter-destination=SCRATCH/old-alone-before.spec --test-reporter=SCRATCH/per-file-reporter.cjs --test-reporter-destination=SCRATCH/old-alone-before.per-file SCRATCH/base-79f99476/tests/hotfix-check.test.js 2> SCRATCH/old-alone-before.time`, load before and after recorded, 131 passed and 0 skipped required, recorded beside the CTO Chief's 239.2 s (decision 18)
- [x] The before whole-suite run on the unchanged tree, the command under "Measurement" with `suite-before.*`; record its longest file with duration and load, and its processor time

### Step 10: IMPLEMENT
- [x] Write `SCRATCH/split-the-file.js` exactly as "The split, a scratch script" describes, then run `node SCRATCH/split-the-file.js <repository root> 79f99476`; a refusal writes nothing and is fixed in the script. No new file is typed or edited by hand; the only whitespace change against the base text is the two spaces of re-indentation inside `registerCleanup`
- [x] Read the seven written files against the plan: `tests/helpers/hotfix-check-harness.js` holds `'use strict';`, its header, its eight requires, the 55 statements of its `WHERE` row in old order with `registerCleanup` at the place of old lines 100 to 107, and the export list of 46 names, with `REAL_TMP`, `scratch`, `GIT_IDENTITY`, `snapshot`, `q`, `TIMED_MS`, `NOISE_MS` and `wallMs` unexported; each test file holds `'use strict';`, its header, its requires, its harness import, `registerCleanup();` first after the requires, then the pieces of its `WHERE` row in old order; the section comment of old lines 1394-1395 sits once, above finding 1 in `tests/hotfix-check-review-findings.test.js`; the round-10 table at old line 2674 is in `tests/hotfix-check.test.js`, so `tests/hotfix-check-corpus.test.js` stays unedited (criterion 10)
- [x] Lint the seven files: `node node_modules/eslint/bin/eslint.js --max-warnings 0 tests/helpers/hotfix-check-harness.js tests/hotfix-check.test.js tests/hotfix-check-*.test.js`. A `no-undef` or `no-unused-vars` report changes a harness name list or drops a listed require, in the split script, which is then re-run; a require that lint asks for beyond the file's `REQUIRES` row stops the build and is reported to the CTO Chief
- [x] Run the static proof on the real split, `node SCRATCH/prove-the-split.js <repository root> 79f99476 --static <repository root>`, and see it exit 0
- [x] Right after, the mutants, as "The proof is shown to fail on a wrong split" describes: the three static mutants `assert-deleted`, `test-duplicated` and `name-changed`, each run through the static proof, each exiting 1 and naming its defect; the leftover mutant through `prove-each-file-cleans-up.js --planted-only`, exiting 1 because its planted copy exited 0. Quote all four failures in the build record, each with its edit. A mutant the proof does not catch is a fault in the proof, fixed there and re-run on the real split and all four mutants
- [x] Run `node src/scripts/release.js`; then outside `plans/` and `.ctoc/`, `git status --porcelain` lists only the seven files, `CLAUDE.md` and `README.md`; `git diff CLAUDE.md README.md` shows only the three test-file count lines, each 567 to 572; `VERSION` and every JSON version file unchanged. Anything else: stop, keep the diff, report it to the CTO Chief

### Step 11: REVIEW
- [x] Run `node SCRATCH/prove-the-split.js <repository root> 79f99476` in full and `node SCRATCH/prove-each-file-cleans-up.js <repository root>` first; both exit 0 before any review packet is written
- [x] Write five review packets into `SCRATCH/review/`, one per group of decision 16; each holds its files, the base file at 79f99476, its rows of the line tables, the proof outputs and the release diff where its group owns it, and these questions: is every statement moved word for word and in old order; is every section comment with the test it introduces; are the header and the import lists as the plan fixes them; is `registerCleanup();` the first statement after the requires; does anything in the file depend on another test's state
- [x] Hand the five packets back to the CTO Chief with the recommendation to dispatch five `iron-loop-critic` reviews in parallel at extra-high effort, then end the turn and report to the CTO Chief; the builder dispatches nothing itself, and the steps from OPTIMIZE to FINAL-REVIEW start only after the review outcome
- [x] When re-dispatched with the findings, resume here: fix each finding in the declared files only, through the split script where it concerns moved or written text, then re-run both proof scripts in full and the affected tests of Step 14; the second round re-reviews only the groups that changed
- [x] Stop after two fix rounds; every finding still open goes to the CTO Chief, one line each, and a finding outside this slice's goal is listed in one line for the owner to schedule

### Step 12: OPTIMIZE
- [x] No product code changes in this slice; the speed-up is the split itself and is measured in Step 14, never by editing a moved test
- [x] Confirm from the proof output that no helper statement is duplicated across files, every statement found exactly once
- [x] Confirm lint reports no unused import in any of the seven files, so no file loads a module it does not use

### Step 13: SECURE
- [x] Read the four scratch scripts: they start only `git` and `node`, with argument lists and no shell; they require no `http`, `https`, `net` or `dns` module; they take only the repository root, the commit name and, in the proof's and the cleanup script's modes, a folder or file under `SCRATCH` as input; `split-the-file.js` writes only the seven declared paths, the others only under `SCRATCH`; they create links only inside `SCRATCH` and never delete in a folder that holds a link
- [x] Read the seven files and the scratch scripts for any key, token, password or personal value; none may appear, and a found one is named by file and line, never copied
- [x] Confirm the tests reach no network beyond what the old file reached: the proof shows every statement unchanged, and a presence search for `npx` and for a started `npm` over the seven files lists only lines the old file already held at the same statements; a new reach is a finding
- [x] Search the build record for absolute paths and account names before it is written to the plan; every path is relative to the repository root or `SCRATCH`

### Step 14: VERIFY
- [x] Affected tests by name: `node --test tests/hotfix-check.test.js tests/hotfix-check-test-run.test.js tests/hotfix-check-copy-and-log.test.js tests/hotfix-check-review-findings.test.js tests/hotfix-check-readers.test.js tests/hotfix-check-guards.test.js tests/hotfix-check-corpus.test.js tests/hotfix-check-differential.test.js tests/readme-numbers.test.js tests/doc-counts.test.js tests/doc-counts-generated.test.js tests/claude-md-keeps-every-rule.test.js tests/skip-visibility.test.js tests/skip-guard-integrity.test.js`; 0 failed, 0 skipped
- [x] Lint with 0 warnings: the seven-file command of Step 10, then the whole repository with `node node_modules/eslint/bin/eslint.js --max-warnings 0 .`; type check with `node --test tests/typecheck.test.js`
- [x] Criterion 7: each of the six files three times in a row with the command under "Measurement", its TAP written to `SCRATCH/alone-1/` to `SCRATCH/alone-3/`, the six sequences at the same time, then the six in one `node --test` call; every run's exit status recorded, 0 failed and 0 skipped, each run's duration and load recorded. A failure that shows a dependency on an earlier test goes through the exception list, `split-exceptions.json` and a re-run of the split script, never a weaker assertion; a ratio-timing failure is reported as found and its bound of 8 is never changed
- [x] `node SCRATCH/prove-the-split.js <repository root> 79f99476 --tap-from SCRATCH/alone-1` exits 0 and prints 131 and 131 names, both assertion totals, 178 statements, the require lines with their counts, the added statements and comments, the exception entries; output recorded (criteria 3, 4, 5)
- [x] `prove-each-file-cleans-up.js` exits 0; the probe's result and whether the name pattern was used; per file the planted copy's status and matched line, the reporting copy's recorded folders and 0 still present, recorded (criterion 6)
- [x] Criterion 8: exactly the four paired runs, once each, in order, before, after, before, after, with the exact commands under "Measurement" (`pair-1-before.*` to `pair-2-after.*`), load before and after each; every run recorded, none discarded or repeated whatever its load; per pair the longest new file over the old file at most 0.25, both sides' wall and processor time recorded; a pair above 0.25 leaves criterion 8 open and is reported to the CTO Chief with both sides' loads; the new per-test durations table from pair 1's after run beside the old one; the two largest tests confirmed in the test-run and guards files
- [x] Criterion 9: one after whole-suite run, the command under "Measurement" with `suite-after.*`, recorded as it comes out and never repeated; its longest file with duration and load, the file now setting the floor named; if one of the six hotfix files is the longest, criterion 9 stays open and is reported to the CTO Chief; processor time before and after recorded, with each pair's processor time beside it as the split's own cost, and the record says when the whole-suite difference is smaller than the spread between the two pairs; "faster" written only when every pair of measure a agrees, measure b agrees and measure c did not grow, otherwise the measure that did not show it named with its numbers (criterion 1)
- [x] The one full `npm test`, last: 0 failed, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`. A failure confined to `tests/reachability-surface-scan-is-linear.test.js` or `tests/iron-loop-enforcer.test.js` is re-run alone with `node --test <that file>` and recorded with its load: when every failure is confined to those two files and each passes alone, criterion 2 is met; when either fails alone, criterion 2 stays open with the reason under it and is reported to the CTO Chief. Neither file is ever edited here. A failure in one of the seven declared test files goes back to Step 10; a failure in any other file is re-run alone once, recorded with its load, criterion 2 stays open, and it is reported to the CTO Chief. Done once after the last slice: 13182 tests, 0 failed, 0 skipped, coverage 99.88% against a floor of 99%

### Step 15: DOCUMENT
- [x] Write the build record under `## Execution Record` in this plan: the red outputs of Step 8; the source and output of `split-the-file.js`, `prove-the-split.js`, `prove-each-file-cleans-up.js` and `per-file-reporter.cjs`; the static proof of the real split and the four mutant failures, each with its edit; the name-pattern probe's result; every timed run with its items, the two pairs and the one after whole-suite run as they came out; the paired-run table with each pair's processor time beside the whole-suite processor time; the old and new per-test durations; the release diff summary; the exception list, empty or each entry with its old text (none for an added statement), new text, reason and how it only tightens; any re-run alone of a file that failed in the completion run, with its load; every changed path under `.ctoc/`
- [x] Repeat the presence search for `hotfix-check.test.js` over the repository outside `plans/` and `node_modules/`; a doc that describes that file's content and is now wrong is listed for the CTO Chief, since no doc is declared. No other doc, comment or changelog is touched

### Step 16: FINAL-REVIEW
- [x] Every box of Steps 8 to 15 is ticked and true
- [x] Verify each of acceptance criteria 1 to 11 against the evidence it names, by running it or reading the recorded output, and tick its box `- [x]` only then; a criterion that cannot be verified stays open with the reason on the line under it, written with no square brackets, and is reported to the CTO Chief
- [x] Confirm from the completion run's output that the runner ran all six hotfix files, picked up by the `tests/*.test.js` glob with nothing registered, and never ran the helper on its own
- [x] With the filter of Step 10, outside `plans/` and `.ctoc/`, confirm `git status --porcelain` lists only the declared nine paths; every changed path under `.ctoc/` is listed in the build record and never committed; the builder commits and pushes nothing
- [x] Run no `menu` command: no task complete, no move of this plan. Hand back to the CTO Chief with the criteria status, the review outcome and any open finding; the CTO Chief hands the menu steps to the owner

---

## Execution Record

Paths below are relative to the repository root or to `SCRATCH` (the build's scratch folder `test-speed-build`); no absolute path or account name is written here. Steps 8 to 11 (first part) were built on 2026-10-12 by the Iron Loop executor; the Step 11 fix round after the five reviews, Steps 12 to 16, the script sources, the pairs, the criterion 7 runs and the after whole-suite run follow below. Where the first part below (written before the fix round) names `registerCleanup` or the earlier file contents, the fix round supersedes it (decisions 32 to 35).

### Machine and tree facts (Step 9)

- Cores 18; Node v24.14.1; scanners found by `which`: none of semgrep, osv-scanner, trufflehog, detect-secrets, gosec, bandit.
- `git rev-parse HEAD` is `bdeb68af4b785f0636ca8a25cedbbddac93f18f0`, one commit after the plan's base `79f99476`. `git diff --stat 79f99476 HEAD` lists only `tests/iron-loop-enforcer.test.js` and `tests/reachability-surface-scan-is-linear.test.js` (the two files another round owns). `git diff --quiet 79f99476 -- src tests/hotfix-check.test.js` exits 0, so the plan's line tables describe the file as it stands. Every "before" run below is on HEAD `bdeb68af`, which differs from `79f99476` only in those two files.
- `node_modules/typescript/package.json` and `node_modules/eslint/bin/eslint.js` exist; nothing was installed.

### Step 8: the red runs (before the split)

Reporter probe: `node --test --test-reporter=SCRATCH/per-file-reporter.cjs tests/readme-numbers.test.js` printed four `test` lines and one `file` line (`179.67` ms), so Node v24.14.1 emits the per-file summary; no fallback to the sum of `test` lines is needed on either side of any comparison.

`node SCRATCH/prove-the-split.js . 79f99476` on the unsplit tree, exit 1 (output in `SCRATCH/red-prove-the-split.out`; the base copy and `tests/hotfix-check.test.js` were run with the TAP reporter, both `exit 0`, 131 subtests, 131 results, `# tests 131`, 0 failed, 0 skipped). Quoted:

```
FAIL: missing: tests/hotfix-check-test-run.test.js
FAIL: missing: tests/hotfix-check-copy-and-log.test.js
FAIL: missing: tests/hotfix-check-review-findings.test.js
FAIL: missing: tests/hotfix-check-readers.test.js
FAIL: missing: tests/hotfix-check-guards.test.js
FAIL: missing: tests/helpers/hotfix-check-harness.js
names: old file 131, six files together 131 (nested names, multiset)
assertion calls: old file 355, expected after exceptions 355, seven new files 355
statements: 178 top-level statements in the old file
require lines in the old file: 12 at old lines 1, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25
statements found exactly once in the file the table names: 27 of 166
FAIL: tests/hotfix-check.test.js: require line outside its REQUIRES row: const os = require('os');
FAIL: tests/hotfix-check.test.js: require line outside its REQUIRES row: const crypto = require('crypto');
FAIL: tests/hotfix-check.test.js: require line outside its REQUIRES row: const qualityAgent = require('../src/lib/quality-agent');
FAIL: tests/hotfix-check.test.js: require line outside its REQUIRES row: const safeFs = require('../src/lib/safe-fs');
FAIL: tests/hotfix-check.test.js: 0 harness imports, expected exactly one
FAIL: tests/hotfix-check.test.js: 0 registerCleanup(); calls, expected exactly one
FAIL: tests/hotfix-check.test.js: registerCleanup(); is not the first statement after the requires
comments: old file 136, allowed added 42, expected 178, seven new files 136
FAIL: 29 comment text(s) have a wrong count        (every allowed added comment named as missing, no other comment)
FAILED: 194 problem(s)
```

The 139 statements the table puts outside `tests/hotfix-check.test.js` were each printed as `old line N (...) expected in <file>, found in the wrong file: tests/hotfix-check.test.js` (139 such lines, among them old lines 100 and 105). The four require lines beyond the row are old lines 17, 19, 24 and 25, as the plan says. The name check (131 and 131) and the assertion check (355 and 355) passed, so the TAP reading and the parser work on the real file; `SCRATCH/tap/base.tap` was written.

`node SCRATCH/prove-each-file-cleans-up.js .` on the unsplit tree, exit 1 (`SCRATCH/red-prove-each-file-cleans-up.out`):

```
missing: tests/hotfix-check-test-run.test.js
missing: tests/hotfix-check-copy-and-log.test.js
missing: tests/hotfix-check-review-findings.test.js
missing: tests/hotfix-check-readers.test.js
missing: tests/hotfix-check-guards.test.js
missing: tests/helpers/hotfix-check-harness.js
FAILED: 6 file(s) missing
```

### Step 9: the two before runs

Both run with `SCRATCH/timed-run.js` (a scratch wrapper that starts `/usr/bin/time -p node --test` with the plan's two reporters and records load before and after; same command as the plan's, no shell).

| Run | Command (as the plan) | Wall s | User s | System s | CPU s | Load start to end | Tests |
|---|---|---|---|---|---|---|---|
| `old-alone-before` | the old file alone from `SCRATCH/base-79f99476/tests/hotfix-check.test.js` | 165.20 | 72.42 | 53.89 | 126.31 | 7.0 to 16.8 | 131 passed, 0 failed, 0 skipped, runner `duration_ms` 165153 |
| `suite-before` | `node --test tests/*.test.js` over 567 files | 241.18 | 363.02 | 229.87 | 592.89 | 16.8 to 65.0 | 13135 tests, 2118 suites, 13135 passed, 0 failed, 0 skipped |

- Beside the CTO Chief's 239.2 s for the old file alone at a load of about 37: this reference run took 165.2 s at a load of 7.0 to 16.8 (decision 18; not one of criterion 8's pairs).
- `suite-before` longest file from the per-file reporter: `tests/hotfix-check.test.js` 233.77 s; then `tests/quality-agent-coverage.test.js` 79.47 s, `tests/quality-fleet-wiring.test.js` 70.74 s, `tests/hotfix-check-corpus.test.js` 57.55 s, `tests/protect-records.test.js` 25.56 s. The suite's 13135 tests against the CTO Chief's 13136 at the baseline: the baseline counted 2 failed in a file that has since been fixed on HEAD; this run has 0 failed (count difference of one not investigated).

### Step 10: the split

`node SCRATCH/split-the-file.js . 79f99476` (no refusal) wrote exactly seven paths: `tests/hotfix-check.test.js` 384 lines, `tests/hotfix-check-test-run.test.js` 255, `tests/hotfix-check-copy-and-log.test.js` 484, `tests/hotfix-check-review-findings.test.js` 327, `tests/hotfix-check-readers.test.js` 545, `tests/hotfix-check-guards.test.js` 931, `tests/helpers/hotfix-check-harness.js` 422. No file was typed or edited by hand. Exception list: empty (`SCRATCH/split-exceptions.json` is `[]`).

- Lint of the seven files with the repository's own eslint (`node node_modules/eslint/bin/eslint.js --max-warnings 0 tests/helpers/hotfix-check-harness.js tests/hotfix-check.test.js tests/hotfix-check-*.test.js`): exit 0, no report. No import list needed a change; the harness name lists are exactly the plan's.
- Static proof of the real split, `node SCRATCH/prove-the-split.js . 79f99476 --static .`, exit 0, `PASS`: static names 131 and 131; assertion calls 355 and 355; 178 statements; 166 of 166 found exactly once in the file the table names; each of the 12 old require lines found (found 7, 7, 7, 7, 1, 7, 1, 4, 3, 3, 5 and 2 times in the seven files, for old lines 1, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24 and 25 in that order); 15 added statements (six `registerCleanup();`, six harness imports, the helper's route require, `registerCleanup`, and `module.exports` with 46 names).
- The four wrong splits, made by `SCRATCH/make-mutants.js` under `SCRATCH/mutants/`; every one exits 1 and names its defect:
  1. `assert-deleted`, edit: the line `assert.equal(twice.verdict, 'refused', JSON.stringify(twice));` (old line 3000) deleted from `tests/hotfix-check-guards.test.js`. Exit 1: `differs: assert.equal(twice.verdict, 'refused', JSON.stringify(twice)) — old 1, new 0`, `FAIL: old line 2988 (test('after the re-check: a test run passes only w…) has no candidate`.
  2. `test-duplicated`, edit: the test of old line 1203 appended to `tests/hotfix-check-guards.test.js`. Exit 1: `differs: ["'a file that is not valid UTF-8 is not text'"] — old 1, new 2`, `FAIL: old line 1203 (...) found 2 times: tests/hotfix-check-readers.test.js, tests/hotfix-check-guards.test.js`.
  3. `name-changed`, edit: `an unknown` to `an Unknown` in the name of old line 607's test. Exit 1: `differs: ["'case 27: an unknown sub-command or option answers the usage text'"] — old 1, new 0` and `differs: ["'case 27: an Unknown sub-command or option answers the usage text'"] — old 0, new 1`, `FAIL: old line 607 (...) has no candidate`.
  4. `no-cleanup`, edit: the `registerCleanup();` line removed from a copy of `tests/hotfix-check-readers.test.js`; `node SCRATCH/prove-each-file-cleans-up.js . --planted-only SCRATCH/mutants/no-cleanup/hotfix-check-readers.test.js` exit 1: `FAIL: hotfix-check-readers: the planted copy exited 0 — the after-each check did not fail`, `FAIL: ... output lacks "no temporary copy of the check remains"`, `FAIL: ... no not ok at depth 0`. It left one private folder in the system temporary folder, named `hotfix-private-tmp-wB54xu`; the script named it and removed it (a plain folder, no link in it).
- `node src/scripts/release.js` (VERSION unchanged at 6.14.125): outside `plans/` and `.ctoc/`, `git status --porcelain` lists the seven files, `CLAUDE.md` and `README.md` and nothing else (the untracked root file `IRON_LOOP.md` and the untracked plan files under `plans/` were there before the build); `git diff CLAUDE.md README.md` shows only the three count lines, each 567 to 572 (`CLAUDE.md`: "Run all 572 test files" and "tests/  572 test files"; `README.md`: "tests/ 572 test files"). No JSON version file changed. No path under `.ctoc/` changed apart from the untracked dispatch log folder `.ctoc/audit/dispatches/2026-10-12/` that was there before the build and is not this build's.

### Step 11, first part: both proofs in full, before any packet

- `node SCRATCH/prove-each-file-cleans-up.js .` exit 0, `PASS` (`SCRATCH/cleanup-real.out`). Probe: the planted copy of `tests/hotfix-check.test.js` with `--test-name-pattern` exited 1, the sentence was in its output on `not ok 1 - planted: a ctoc-hotfix- folder is left in the private temporary folder`: the after-each hook ran for the matched test, so the name pattern was used for every planted copy (no fallback). All six planted copies exit 1 with the sentence and exactly that one `not ok`. All six reporting copies exit 0 (the full file ran and passed in each): recorded folders hotfix-check 34, test-run 48, copy-and-log 60, review-findings 24, readers 23, guards 38, exactly one private folder each, 0 still present.
- `node SCRATCH/prove-the-split.js . 79f99476` in full, exit 0, `PASS` (`SCRATCH/full-real.out`): old file 131 subtests; the six files 26, 13, 29, 17, 17, 29 (sum 131), all exit 0, 0 failed, 0 skipped, no SKIP or TODO directive; nested name multiset 131 and 131 with no differing key; assertion calls 355 and 355; 178 statements, 166 of 166 exact; comments: old 136, allowed added 42, seven new files 178, no differing text. Per-file runner durations from that run, all seven started at once (not a criterion 8 pair, only the first look): old file 132.75 s, `tests/hotfix-check.test.js` 22.66 s, `-test-run` 32.08 s, `-copy-and-log` 28.46 s, `-review-findings` 25.12 s, `-readers` 34.93 s, `-guards` 40.10 s; the longest, guards, is 0.302 of the old file in that run, which ran at a load of 19.5 at the start. Criterion 8 is decided only by the two interleaved pairs of Step 14, where the old file runs alone; the margin to 0.25 may be thin and is flagged for the CTO Chief.
- Five review packets: `SCRATCH/review-packets/` (the plan names `SCRATCH/review/`; the CTO Chief's brief names `review-packets`). Groups as decision 16: `1-harness-and-counts`, `2-hotfix-check-and-test-run`, `3-copy-and-log`, `4-review-findings-and-readers`, `5-guards`. Each folder holds `PACKET.md` (questions, the plan's line-table rows for the group, the plan path), the old file at the base commit, copies of the group's files, and the proof outputs; packet 1 also holds the release diff.

### Decisions and observations (builder)

- **Absolute-path arguments.** The Bash guard refuses a `node` call that passes the worktree's absolute path as an argument (it reads it as a possible route into CTOC's menu). The scratch scripts were therefore run from the repository root with `.` as the root argument; the scripts resolve it themselves. No script or plan text was changed for this.
- **The first helper statement has no blank line before it.** Following the plan's composition (requires, then the pieces of the helper row), the piece for old line 28 starts at the line break after old line 27, so `const NODE = process.execPath;` follows the route require on the next line. Whitespace between statements is not compared by the proof; left as the plan writes it, listed in packet 1 as a nit for the reviewer to judge.
- **A comment in the helper says "this file".** The moved comment above `gone` ends "one table at the end of this file holds every removed extension" (old line 46). Moved word for word as the rule requires; the table is now in `tests/hotfix-check.test.js`.
- Extra scratch scripts, not in the plan: `SCRATCH/timed-run.js` (the timed-run wrapper), `SCRATCH/make-mutants.js`, `SCRATCH/make-packets.js`, `SCRATCH/tick.js` (ticks this plan's boxes). Scripts' sources go into this record at Step 15.

### Step 11, fix round 1: the rebalance projection (written before any test was moved)

The CTO Chief's review outcome: no critical finding; criterion 8 had little margin (guards 0.302 and readers 0.263 of the old file's 132.75 s in the first look). Fix list, applied in the order: (1) rebalance, (2) the two cleanup hooks back as top-level statements of the helper, (3) the two dropped blank lines, (4) re-run everything.

Projection basis: the runner's per-file durations of the first full proof run (`SCRATCH/tap/*.tap`, all seven processes at once, load 19.5 at the start; old file 132.75 s) and the per-test durations in the same TAP files (`SCRATCH/top-durations.js`, a scratch reader of the `duration_ms` of each top-level result). A file's projected seconds are its measured file duration plus the measured seconds of the tests that move in, minus those that move out. Share = seconds over 132.75 s.

| Step | hotfix-check | test-run | copy-and-log | review-findings | readers | guards |
|---|---|---|---|---|---|---|
| Measured file duration (s) | 22.66 | 32.08 | 28.46 | 25.12 | 34.93 | 40.10 |
| Measured share | 0.171 | 0.242 | 0.214 | 0.189 | 0.263 | 0.302 |
| Guards moves: old 2078 (1.66 s) and old 2122 (5.51 s) to hotfix-check, old 2292 (4.60 s) to review-findings (s) | 29.83 | 32.08 | 28.46 | 29.72 | 34.93 | 28.33 |
| Readers move: old 1826 (3.48 s) to guards, the file now lowest (s) | 29.83 | 32.08 | 28.46 | 29.72 | 31.45 | 31.81 |
| Projected share | 0.225 | 0.242 | 0.214 | 0.224 | 0.237 | 0.240 |

- **The bound of 0.23 for every file cannot be reached by moving whole tests, whatever is moved.** The six projected file durations add to 183.35 s; six files at 0.23 of 132.75 s (30.53 s) hold 183.18 s at most, so even a perfect split has a mean of 0.2304. And `tests/hotfix-check-test-run.test.js` alone holds the indivisible 18.31 s test (old line 3085) plus 13.4 s of other tests, so it is at 0.242 unless tests leave it, which the fix list does not ask for. The smallest set that brings readers to the level of the unavoidable maximum (test-run, 0.242) is one test: needing at least 2.85 s out of readers, the single tests that are long enough are old 1826 (3.48 s), old 1236 (3.54 s), old 1886 (5.13 s), old 1765 (5.64 s) and old 1279 (6.02 s); the shortest is old 1826 ("round 4: every scanner fails closed on an unfinished or unreadable construct"). The file with the lowest projected total after the guards moves is guards (28.33 s), which takes it to 31.81 s, still below test-run's 32.08 s.
- Choice recorded as decision 32: the moves above; the largest projected share is test-run at 0.242, set by the indivisible test, and every other file is at or below 0.240. The shares are projections from one run under load; criterion 8 is decided by the two interleaved pairs against the bound of 0.25.

### Step 11, fix round 1: what was done

All four items of the CTO Chief's fix list, in the order given. Nothing was moved or written by hand: `SCRATCH/split-the-file.js` was re-run from the base (`node SCRATCH/split-the-file.js . 79f99476`) after its tables and texts were changed, and wrote exactly the seven declared paths. The scratch scripts were changed in step with it (a copy of each earlier version is kept in `SCRATCH` as `*.round1.js.bak`).

1. **Rebalance**: decision 32 and the projection table above. Moved, unchanged and in old order with their comment blocks: old 2078 and old 2122 to `tests/hotfix-check.test.js` (between old 607 and old 2674), old 2292 to the end of `tests/hotfix-check-review-findings.test.js`, and old 1826 (from readers) to the start of `tests/hotfix-check-guards.test.js`. Imports followed lint: `STATUS_LINE` joined the harness import of `tests/hotfix-check.test.js` and of `tests/hotfix-check-review-findings.test.js`, `SETTING` left that of `tests/hotfix-check-guards.test.js`; no require line was added or dropped. The assignment table, the statement table, the `WHERE` table, the import lists, the header and area lines and the proof script's `WHERE` table were updated (decision 35). Top-level tests per file are now 28, 11, 19, 12, 16 and 16 (102).
2. **Cleanup hooks**: decision 33. Old lines 100-107 are top-level statements of `tests/helpers/hotfix-check-harness.js`, byte for byte, in the old order, after `PRIVATE_TMP` and `leftovers`. `registerCleanup`, its export and its six calls are removed; the export list holds 45 names; the helper's header names the new rule. The statement comparison has no re-indentation exception any more.
3. **Blank lines**: decision 34. The split script's one rule printed exactly two junctions:
```
junction: tests/hotfix-check-copy-and-log.test.js: blank line before the statement of old line 971
junction: tests/helpers/hotfix-check-harness.js: blank line before the statement of old line 28
```
4. **Re-runs**, below. Lint of the seven files with the repository's own eslint: exit 0, no report.

Written files (line counts from the split script): `tests/hotfix-check.test.js` 496, `tests/hotfix-check-test-run.test.js` 253, `tests/hotfix-check-copy-and-log.test.js` 483, `tests/hotfix-check-review-findings.test.js` 384, `tests/hotfix-check-readers.test.js` 494, `tests/hotfix-check-guards.test.js` 808, `tests/helpers/hotfix-check-harness.js` 416.

**Static proof of the real split** (`node SCRATCH/prove-the-split.js . 79f99476 --static .`, exit 0):

```
mode: --static <repository root>; base commit 79f99476
static names: old file 131 call sites, six files together 131
exception entries: 0
assertion calls: old file 355, expected after exceptions 355, seven new files 355
statements: 178 top-level statements in the old file
require lines in the old file: 12 at old lines 1, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25
statements found exactly once in the file the table names: 166 of 166
added statements (8):
  added: tests/hotfix-check.test.js: require line const {\n  NODE, STATUS_LINE, USAGE, NO_TEST, refusal, unreadable, gone, SETTING, HOME, HOME_STORE,\n  PASSING_TEST, FAILI…
  added: tests/hotfix-check-test-run.test.js: require line const {\n  NO_TEST, refusal, unreadable, HOME, HOME_STORE, nodeTest, FAILING_TEST, SCRIPT, tmpDir, git,\n  writeFiles, mak…
  added: tests/hotfix-check-copy-and-log.test.js: require line const {\n  NODE, LOG, NO_TEST, refusal, unreadable, HOME, HOME_STORE, nodeTest, PASSING_TEST, FAILING_TEST,\n  SCRIPT, tmp…
  added: tests/hotfix-check-review-findings.test.js: require line const {\n  NODE, STATUS_LINE, USAGE, NO_TEST, refusal, unreadable, inexact, HOME, HOME_STORE, nodeTest,\n  PASSING_TEST, S…
  added: tests/hotfix-check-readers.test.js: require line const {\n  STATUS_LINE, NO_TEST, refusal, unreadable, gone, inexact, HOME, HOME_STORE, nodeTest,\n  PASSING_TEST, SCRIPT, …
  added: tests/hotfix-check-guards.test.js: require line const {\n  STATUS_LINE, refusal, unreadable, gone, inexact, HOME, HOME_STORE, nodeTest, PASSING_TEST, SCRIPT,\n  tmpDir, P…
  added: tests/helpers/hotfix-check-harness.js: require line const { route } = require('../../src/lib/menu-screens');
  added: tests/helpers/hotfix-check-harness.js: module.exports with 45 names
PASS
```

**The four wrong splits** (`SCRATCH/make-mutants.js`; each exits 1 naming its defect):

1. `assert-deleted`, edit: the line `assert.equal(twice.verdict, 'refused', JSON.stringify(twice));` (old line 3000) removed from `tests/hotfix-check-guards.test.js`.
```
  differs: assert.equal(twice.verdict, 'refused', JSON.stringify(twice)) — old 1, new 0
FAIL: 1 assertion call text(s) differ
FAIL: old line 2988 (test('after the re-check: a test run passes only w…) has no candidate
FAIL: tests/hotfix-check-guards.test.js: unexpected added statement: test('after the re-check: a test run passes only when no failure or skip counter in its output is above zero, and its count is the sum of every summary', async …
FAILED: 3 problem(s)
```
2. `test-duplicated`, edit: the test of old line 1203 appended to `tests/hotfix-check-guards.test.js`.
```
  differs: ["'a file that is not valid UTF-8 is not text'"] — old 1, new 2
FAIL: 1 static name(s) differ
FAIL: old line 1203 (test('a file that is not valid UTF-8 is not text',…) found 2 times: tests/hotfix-check-readers.test.js, tests/hotfix-check-guards.test.js
FAILED: 2 problem(s)
```
3. `name-changed`, edit: `an unknown` to `an Unknown` in the name of the test of old line 607.
```
  differs: ["'case 27: an unknown sub-command or option answers the usage text'"] — old 1, new 0
  differs: ["'case 27: an Unknown sub-command or option answers the usage text'"] — old 0, new 1
FAIL: 2 static name(s) differ
FAIL: old line 607 (test('case 27: an unknown sub-command or option an…) has no candidate
FAIL: tests/hotfix-check.test.js: unexpected added statement: test('case 27: an Unknown sub-command or option answers the usage text', async () => {\n  const root = testedProject();\n  const a = await route(['hotfix', 'frobn…
FAILED: 3 problem(s)
```
4. `no-cleanup`, edit: `test.after(...)` and `test.afterEach(...)` (old lines 100-107) removed from a copy of the helper; `node SCRATCH/prove-each-file-cleans-up.js . --planted-only tests/hotfix-check-readers.test.js --helper SCRATCH/mutants/no-cleanup/hotfix-check-harness.js` exits 1 because the planted copy exited 0:
```
work folder: SCRATCH/cleanup-proof-7N01vY (planted-only mode)
probe: planted copy of tests/hotfix-check.test.js with --test-name-pattern: exit 0; sentence in output: false; matched line: (none)
fallback: the name pattern skipped the after-each hook; planted copies ran in full
hotfix-check-readers: planted copy exit 0; sentence false; not ok lines 0; matched line: (none)
FAIL: hotfix-check-readers: the planted copy exited 0 — the after-each check did not fail
FAIL: hotfix-check-readers: the planted copy's output lacks "no temporary copy of the check remains"
FAIL: hotfix-check-readers: no not ok at depth 0
private folders left in the system temporary folder by this run: 2 — hotfix-private-tmp-sPTtLt, hotfix-private-tmp-xVmlWF
FAILED: 3 problem(s)
```
   The two private folders that run left in the system temporary folder (named above) were removed by the script. That run also left its scratch folders, which only the removed hooks would have removed: 21 plain folders named `hotfix-check-` plus six random letters, made in one minute, which this build removed by hand after listing them by that minute; 143 older folders of the same names, made in another minute hours earlier, are not from this build and were left.

**Cleanup proof, every file** (`node SCRATCH/prove-each-file-cleans-up.js .`, exit 0): the probe ran the planted copy with the name pattern, the after-each hook ran for the matched test, so the pattern was used for every planted copy. Each planted copy fails on its planted leftover and each reporting copy leaves no private folder and no scratch folder.

```
work folder: SCRATCH/cleanup-proof-iNDUEj
probe: planted copy of tests/hotfix-check.test.js with --test-name-pattern: exit 1; sentence in output: true; matched line: not ok 1 - planted: a ctoc-hotfix- folder is left in the private temporary folder
pattern used: yes — the after-each hook ran for the matched test; every planted copy runs with the pattern
hotfix-check: planted copy exit 1; sentence true; not ok lines 1; matched line: not ok 1 - planted: a ctoc-hotfix- folder is left in the private temporary folder
hotfix-check: reporting copy exit 0; recorded folders 36 (private 1); still present 0
hotfix-check-test-run: planted copy exit 1; sentence true; not ok lines 1; matched line: not ok 1 - planted: a ctoc-hotfix- folder is left in the private temporary folder
hotfix-check-test-run: reporting copy exit 0; recorded folders 48 (private 1); still present 0
hotfix-check-copy-and-log: planted copy exit 1; sentence true; not ok lines 1; matched line: not ok 1 - planted: a ctoc-hotfix- folder is left in the private temporary folder
hotfix-check-copy-and-log: reporting copy exit 0; recorded folders 60 (private 1); still present 0
hotfix-check-review-findings: planted copy exit 1; sentence true; not ok lines 1; matched line: not ok 1 - planted: a ctoc-hotfix- folder is left in the private temporary folder
hotfix-check-review-findings: reporting copy exit 0; recorded folders 25 (private 1); still present 0
hotfix-check-readers: planted copy exit 1; sentence true; not ok lines 1; matched line: not ok 1 - planted: a ctoc-hotfix- folder is left in the private temporary folder
hotfix-check-readers: reporting copy exit 0; recorded folders 22 (private 1); still present 0
hotfix-check-guards: planted copy exit 1; sentence true; not ok lines 1; matched line: not ok 1 - planted: a ctoc-hotfix- folder is left in the private temporary folder
hotfix-check-guards: reporting copy exit 0; recorded folders 36 (private 1); still present 0
PASS
```

**Full proof** (`node SCRATCH/prove-the-split.js . 79f99476`, exit 0; the old file and the six files were started at once with the TAP reporter):

```
mode: full; base commit 79f99476
names: starting the old file and the present new files at once, each with node --test --test-reporter=tap
  old file: exit 0; subtests 131, results 131, tests 131, pass 131, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check: exit 0; subtests 28, results 28, tests 28, pass 28, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check-test-run: exit 0; subtests 13, results 13, tests 13, pass 13, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check-copy-and-log: exit 0; subtests 29, results 29, tests 29, pass 29, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check-review-findings: exit 0; subtests 18, results 18, tests 18, pass 18, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check-readers: exit 0; subtests 16, results 16, tests 16, pass 16, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check-guards: exit 0; subtests 27, results 27, tests 27, pass 27, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
names: old file 131, six files together 131 (nested names, multiset)
exception entries: 0
assertion calls: old file 355, expected after exceptions 355, seven new files 355
statements: 178 top-level statements in the old file
require lines in the old file: 12 at old lines 1, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25
statements found exactly once in the file the table names: 166 of 166
added statements (8):
  added: tests/hotfix-check.test.js: require line const {\n  NODE, STATUS_LINE, USAGE, NO_TEST, refusal, unreadable, gone, SETTING, HOME, HOME_STORE,\n  PASSING_TEST, FAILI…
  added: tests/hotfix-check-test-run.test.js: require line const {\n  NO_TEST, refusal, unreadable, HOME, HOME_STORE, nodeTest, FAILING_TEST, SCRIPT, tmpDir, git,\n  writeFiles, mak…
  added: tests/hotfix-check-copy-and-log.test.js: require line const {\n  NODE, LOG, NO_TEST, refusal, unreadable, HOME, HOME_STORE, nodeTest, PASSING_TEST, FAILING_TEST,\n  SCRIPT, tmp…
  added: tests/hotfix-check-review-findings.test.js: require line const {\n  NODE, STATUS_LINE, USAGE, NO_TEST, refusal, unreadable, inexact, HOME, HOME_STORE, nodeTest,\n  PASSING_TEST, S…
  added: tests/hotfix-check-readers.test.js: require line const {\n  STATUS_LINE, NO_TEST, refusal, unreadable, gone, inexact, HOME, HOME_STORE, nodeTest,\n  PASSING_TEST, SCRIPT, …
  added: tests/hotfix-check-guards.test.js: require line const {\n  STATUS_LINE, refusal, unreadable, gone, inexact, HOME, HOME_STORE, nodeTest, PASSING_TEST, SCRIPT,\n  tmpDir, P…
  added: tests/helpers/hotfix-check-harness.js: require line const { route } = require('../../src/lib/menu-screens');
  added: tests/helpers/hotfix-check-harness.js: module.exports with 45 names
comments: old file 136, allowed added 44, expected 180, seven new files 180
added comments listed: 44 (nine in tests/hotfix-check.test.js, area and closing lines in five files, two blocks in the helper)
PASS
```

Old file 131 tests, the six files 28, 13, 29, 18, 16 and 27 (nested, 131 together).

### Step 12: OPTIMIZE

- No product code changed; the speed-up is the split.
- Every one of the 166 moved statements is found exactly once in the file its table names (166 of 166 in the full proof above); no helper statement is duplicated across files.
- Lint reports no unused import in any of the seven files (`--max-warnings 0`, exit 0, `no-unused-vars` and `no-undef` are errors).

### Step 13: SECURE

- Scripts read: `SCRATCH/split-the-file.js`, `prove-the-split.js`, `prove-each-file-cleans-up.js`, `per-file-reporter.cjs` (and `make-mutants.js`, `timed-run.js`, `alone-runs.js`). A search for `require('http'`, `https`, `net`, `dns`, `dgram`, `tls`, `execSync`, `shell: true`, `curl`, `wget`, `npx` and `npm` over them found only RegExp `.exec(` calls, no child process shell. They start only `git` and `node` (and `/usr/bin/time` in the timing wrappers) with argument lists. The input is the repository root, the commit name and, in the proof's and the cleanup script's modes, a folder or file under `SCRATCH` (and the helper copy). `split-the-file.js` writes only the seven declared paths; the others write only under `SCRATCH` (and the cleanup script removes only the `hotfix-private-tmp-` folders it finds new in the system temporary folder in its planted-only mode). Links are made only inside `SCRATCH`.
- The repository's own secrets scanner (`src/lib/secrets-scanner.js`, in process, `scanContent` over each of the seven files, no network, no shell; `SCRATCH/secrets-scan-seven.js`):
```
tests/helpers/hotfix-check-harness.js: 0 finding(s)
tests/hotfix-check.test.js: 0 finding(s)
tests/hotfix-check-test-run.test.js: 0 finding(s)
tests/hotfix-check-copy-and-log.test.js: 0 finding(s)
tests/hotfix-check-review-findings.test.js: 0 finding(s)
tests/hotfix-check-readers.test.js: 0 finding(s)
tests/hotfix-check-guards.test.js: 0 finding(s)
total: 0
control (synthetic key shape): 1 finding(s)
```
  Seven files, 0 findings; the control (a synthetic key shape in a string) gives 1, so the scanner was alive. No key, token, password or personal value was found by reading the scripts either.
- Network: a presence search for `npx` and `npm` finds 3 lines in the old file and 3 in the new files (1 each in `tests/hotfix-check.test.js`, `tests/hotfix-check-test-run.test.js` and `tests/hotfix-check-review-findings.test.js`), the same statements; a search for `http`, `https:`, `fetch(`, `curl` and `wget` finds 0 in the old file and 0 in the seven new files. No new reach.
- The record holds no absolute path and no account name (checked by a search of the record text before it was written).

### Step 14: VERIFY

Machine for every run below: 18 cores, Node v24.14.1, HEAD `bdeb68af` (the working tree holds the uncommitted split), scanners found by `which`: none of semgrep, osv-scanner, trufflehog, detect-secrets, gosec, bandit. The machine was shared and busy the whole time (one-minute load 26 to 55 on 18 cores, other sessions running); every load is recorded with its run.

- **Affected tests by name** (the plan's list, with the six hotfix files covered by the criterion 7 run below and `tests/typecheck.test.js` added): `node --test tests/hotfix-check-corpus.test.js tests/hotfix-check-differential.test.js tests/readme-numbers.test.js tests/doc-counts.test.js tests/doc-counts-generated.test.js tests/claude-md-keeps-every-rule.test.js tests/skip-visibility.test.js tests/skip-guard-integrity.test.js tests/typecheck.test.js`: exit 0, 256 tests, 256 passed, 0 failed, 0 skipped (the type check test is the last, `tsc --checkJs` error count at or below the baseline).
- **Lint**: the seven files and the whole repository, `node node_modules/eslint/bin/eslint.js --max-warnings 0 .`: both exit 0, no report.
- **Criterion 7** (`SCRATCH/alone-runs.js alone` and `together`): each of the six files alone three times in a row, the six sequences at the same time; TAP in `SCRATCH/alone-1` to `alone-3`:

```
alone-1 hotfix-check                   exit 0 tests 28 pass 28 fail 0 skipped 0 | real 21.48 s user 8.13 sys 8.27 | load 45.2 to 42.7
alone-1 hotfix-check-test-run          exit 0 tests 13 pass 13 fail 0 skipped 0 | real 24.23 s user 8.54 sys 7.88 | load 45.2 to 40
alone-1 hotfix-check-copy-and-log      exit 0 tests 29 pass 29 fail 0 skipped 0 | real 20.18 s user 8.28 sys 7.71 | load 45.2 to 42.7
alone-1 hotfix-check-review-findings   exit 0 tests 18 pass 18 fail 0 skipped 0 | real 19.76 s user 9.13 sys 6.02 | load 45.2 to 42.7
alone-1 hotfix-check-readers           exit 0 tests 16 pass 16 fail 0 skipped 0 | real 24.64 s user 8.79 sys 9.73 | load 45.2 to 40
alone-1 hotfix-check-guards            exit 0 tests 27 pass 27 fail 0 skipped 0 | real 25.83 s user 10.67 sys 9.91 | load 45.2 to 40
alone-2 hotfix-check                   exit 0 tests 28 pass 28 fail 0 skipped 0 | real 21.55 s user 9.02 sys 9.12 | load 42.7 to 40
alone-2 hotfix-check-test-run          exit 0 tests 13 pass 13 fail 0 skipped 0 | real 24.25 s user 9.39 sys 8.81 | load 40 to 40.8
alone-2 hotfix-check-copy-and-log      exit 0 tests 29 pass 29 fail 0 skipped 0 | real 20.54 s user 9.29 sys 8.55 | load 42.7 to 39.4
alone-2 hotfix-check-review-findings   exit 0 tests 18 pass 18 fail 0 skipped 0 | real 24.02 s user 12.6 sys 7.93 | load 42.7 to 40
alone-2 hotfix-check-readers           exit 0 tests 16 pass 16 fail 0 skipped 0 | real 24.56 s user 9.6 sys 10.68 | load 40 to 40.8
alone-2 hotfix-check-guards            exit 0 tests 27 pass 27 fail 0 skipped 0 | real 26.61 s user 11.57 sys 10.99 | load 40 to 40.8
alone-3 hotfix-check                   exit 0 tests 28 pass 28 fail 0 skipped 0 | real 20.32 s user 8.41 sys 8.98 | load 40 to 46.1
alone-3 hotfix-check-test-run          exit 0 tests 13 pass 13 fail 0 skipped 0 | real 22.28 s user 8.64 sys 8.18 | load 40.8 to 44.7
alone-3 hotfix-check-copy-and-log      exit 0 tests 29 pass 29 fail 0 skipped 0 | real 19.57 s user 8.72 sys 8.5 | load 39.4 to 45.2
alone-3 hotfix-check-review-findings   exit 0 tests 18 pass 18 fail 0 skipped 0 | real 22.45 s user 11.68 sys 7.59 | load 40 to 46.1
alone-3 hotfix-check-readers           exit 0 tests 16 pass 16 fail 0 skipped 0 | real 21.98 s user 8.74 sys 9.62 | load 40.8 to 44.7
alone-3 hotfix-check-guards            exit 0 tests 27 pass 27 fail 0 skipped 0 | real 22.79 s user 10.24 sys 9.22 | load 40.8 to 43.9
all 18 runs: exit 0, 0 failed, 0 skipped
```

  Then the six together in one call (`/usr/bin/time -p node --test tests/hotfix-check.test.js tests/hotfix-check-test-run.test.js tests/hotfix-check-copy-and-log.test.js tests/hotfix-check-review-findings.test.js tests/hotfix-check-readers.test.js tests/hotfix-check-guards.test.js`): exit 0, 131 tests, 131 passed, 0 failed, 0 skipped, real 23.35 s, user 53.39 s, sys 48.81 s, load 41.7 to 46.6. No test depended on an earlier test's state; the exception list is empty (`SCRATCH/split-exceptions.json` holds an empty array).
- **Criteria 3 to 5** from the first alone-run's TAP (`node SCRATCH/prove-the-split.js . 79f99476 --tap-from SCRATCH/alone-1`, exit 0):

```
mode: --tap-from SCRATCH/alone-1; base commit 79f99476
names: TAP read from files; the exit status of those runs is the one the build record holds, and this script did not see it
  old file: exit not seen (--tap-from); subtests 131, results 131, tests 131, pass 131, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check: exit not seen (--tap-from); subtests 28, results 28, tests 28, pass 28, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check-test-run: exit not seen (--tap-from); subtests 13, results 13, tests 13, pass 13, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check-copy-and-log: exit not seen (--tap-from); subtests 29, results 29, tests 29, pass 29, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check-review-findings: exit not seen (--tap-from); subtests 18, results 18, tests 18, pass 18, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check-readers: exit not seen (--tap-from); subtests 16, results 16, tests 16, pass 16, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
  hotfix-check-guards: exit not seen (--tap-from); subtests 27, results 27, tests 27, pass 27, fail 0, cancelled 0, skipped 0, todo 0, not ok 0, directives 0
names: old file 131, six files together 131 (nested names, multiset)
exception entries: 0
assertion calls: old file 355, expected after exceptions 355, seven new files 355
statements: 178 top-level statements in the old file
require lines in the old file: 12 at old lines 1, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25
statements found exactly once in the file the table names: 166 of 166
added statements (8):
comments: old file 136, allowed added 44, expected 180, seven new files 180
added comments listed: 44 (nine in tests/hotfix-check.test.js, area and closing lines in five files, two blocks in the helper)
PASS
```

- **Criterion 8, the two pairs** (the exact commands of the plan, once each, in order; `SCRATCH/timed-run.js`; summary by `SCRATCH/summarize-pairs.js`):

```
pair 1
  before (old file alone): wall 103.88 s, user 48.72, sys 34.03, cpu 82.75 s, load 43.1 to 41.3, tests 131, pass 131, fail 0, skipped 0, exit 0, file duration 103.78 s
  after (six files together): wall 51.7 s, user 60.32, sys 64.61, cpu 124.93 s, load 40.4 to 55.2, tests 131, pass 131, fail 0, skipped 0, exit 0
    tests/hotfix-check-guards.test.js              51.60 s   share of old 0.497
    tests/hotfix-check-readers.test.js             50.88 s   share of old 0.490
    tests/hotfix-check-test-run.test.js            48.45 s   share of old 0.467
    tests/hotfix-check.test.js                     43.73 s   share of old 0.421
    tests/hotfix-check-copy-and-log.test.js        42.47 s   share of old 0.409
    tests/hotfix-check-review-findings.test.js     41.68 s   share of old 0.402
  longest new file tests/hotfix-check-guards.test.js 51.60 s = 0.497 of the old file: ABOVE 0.25
  after wall over before wall 0.498; after cpu minus before cpu 42.18 s
  two largest tests: 31.68 s in tests/hotfix-check-test-run.test.js (the second fix: every runner's failing summary refuses and i); 15.14 s in tests/hotfix-check-guards.test.js (after the re-check: a test run passes only when no failure o)
pair 2
  before (old file alone): wall 137.27 s, user 50.55, sys 37.32, cpu 87.87 s, load 51.8 to 28.8, tests 131, pass 131, fail 0, skipped 0, exit 0, file duration 137.17 s
  after (six files together): wall 22.56 s, user 52.65, sys 45.2, cpu 97.85 s, load 26.8 to 27.8, tests 131, pass 131, fail 0, skipped 0, exit 0
    tests/hotfix-check-guards.test.js              22.47 s   share of old 0.164
    tests/hotfix-check-test-run.test.js            21.05 s   share of old 0.153
    tests/hotfix-check-readers.test.js             20.94 s   share of old 0.153
    tests/hotfix-check.test.js                     18.50 s   share of old 0.135
    tests/hotfix-check-review-findings.test.js     18.18 s   share of old 0.133
    tests/hotfix-check-copy-and-log.test.js        17.65 s   share of old 0.129
  longest new file tests/hotfix-check-guards.test.js 22.47 s = 0.164 of the old file: within 0.25
  after wall over before wall 0.164; after cpu minus before cpu 9.98 s
  two largest tests: 11.05 s in tests/hotfix-check-test-run.test.js (the second fix: every runner's failing summary refuses and i); 5.81 s in tests/hotfix-check-guards.test.js (round 9: stylesheets — brackets, statements outside the subs)
split's own cpu cost: pair 1 42.18 s, pair 2 9.98 s; spread 32.20 s
per-test durations, pair 1 (old alone | new, six together), name cut at 100 characters:
     1.13 |    3.53 | copy-and-log     | case 24: nothing in the project is touched, also when its own tests write and stage files
     1.38 |    4.20 | copy-and-log     | case 28: the log counts verdicts and causes, holds no names or wording, and never changes an answer
     0.87 |    1.93 | copy-and-log     | case 29: an unrelated uncommitted edit that would make a test fail does not change the verdict
     0.84 |    1.01 | copy-and-log     | case 31: the check's own log never enters the change
     0.43 |    0.53 | copy-and-log     | case 39: a log above 1 MiB is rotated by renaming
     0.90 |    1.33 | copy-and-log     | case 40: a log that is a hard link is never written
     2.21 |    7.08 | copy-and-log     | case 41: the log is never written through a symbolic link
     0.40 |    2.17 | copy-and-log     | case 42: an unrelated uncommitted edit that a test needs makes the hotfix fail
     1.91 |    7.45 | copy-and-log     | case 43: the copy is gone after a pass, a refusal, failing tests, a timeout and a thrown error
     0.32 |    0.94 | copy-and-log     | case 44: a change that does not apply cleanly to a fresh copy is refused and runs no test
     0.70 |    1.86 | copy-and-log     | case 45: installed-package folders are linked into the copy, one link each, and left intact
     0.50 |    1.31 | copy-and-log     | case 46: on Windows the links are directory junctions, elsewhere directory links
     0.50 |    1.35 | copy-and-log     | case 47: a judged file that changes during the check is refused
     0.57 |    1.92 | copy-and-log     | case 48: a name the commit command cannot carry is refused
     0.43 |    1.38 | copy-and-log     | case 49: other uncommitted work behind a workspace link is refused and runs no test
     0.36 |    0.94 | copy-and-log     | case 50: the same workspace link with no other work passes, and the test ran in the copy
     0.41 |    1.17 | copy-and-log     | case 51: other uncommitted work behind an editable Python install is refused
     0.38 |    1.03 | copy-and-log     | case 52: a judged file under a linked package passes, and the test ran in the copy
     0.23 |    0.71 | copy-and-log     | case 53: a link whose parent lies outside the copy stops the check before any test runs
     1.94 |    4.12 | guards           | round 4: every scanner fails closed on an unfinished or unreadable construct
     4.50 |    8.41 | guards           | round 9: stylesheets — brackets, statements outside the subset, escapes, and custom properties
     1.91 |    2.09 | guards           | round 9: a long path is read in time proportional to its size
     0.44 |    1.59 | guards           | round 9: an added or deleted path is refused before anything is staged, so no untracked file reaches
     1.16 |    5.74 | guards           | round 9: the copy is removed whatever the tests leave in it, and a removal that fails keeps both end
     1.38 |    4.79 | guards           | round 9: every guard fails closed — a file its reader cannot parse is refused, a fault in any rule s
     1.46 |    4.50 | guards           | round 9: a transform only adds reasons to refuse, and the check reads what the consumer reads
     1.42 |    4.14 | guards           | round 10, B4: guards closed by construction
     0.00 |    0.00 | guards           | round 10, B5 to B7: a control character in a stylesheet, the exact grammar of a colour value, and a 
     0.00 |    0.00 | guards           | round 10, B9 and B10: a sensitive word anywhere inside a part of the path, a part that holds `prompt
     0.00 |    0.01 | guards           | round 10, B9: whatever the earlier matcher refused is still refused (a word as a camel-case sub-word
     0.00 |    0.00 | guards           | after the re-check: every extension the module ever recognised but `.css` is refused, whatever the f
     0.00 |    0.00 | guards           | after the re-check: shadows, the `tokens` exception as written, sensitive words across separators, a
     5.43 |   15.14 | guards           | after the re-check: a test run passes only when no failure or skip counter in its output is above ze
     0.23 |    0.63 | guards           | the final re-check: a stylesheet that holds a backslash never qualifies
     0.00 |    0.00 | guards           | the second final re-check: no stylesheet exception for `tokens`
     0.31 |    0.50 | readers          | the test call refuses a deleted file or one replaced by a link before any copy, without hashing it
     0.25 |    0.36 | readers          | a file that is not valid UTF-8 is not text
     0.54 |    2.21 | readers          | a name with spaces, a star and letters beyond ASCII passes, and commit.add stages exactly it
     0.00 |    0.02 | readers          | a project folder that does not exist is "the check stopped", cleaned and capped, and never created
     1.86 |    4.72 | readers          | the first failing test is read from jest, TAP and spec output, or said plainly
     0.40 |    1.10 | readers          | a run whose counters cannot be read is "no test ran"
     0.52 |    0.56 | readers          | the whole suite runs in the copy, whatever the test files are named
     3.30 |    5.24 | readers          | edge shapes of every kind give the exact verdict
     0.91 |    2.60 | readers          | a project in a sub-folder of the repository judges only its own files, shown from its own root
     0.30 |    1.30 | readers          | a test location that is not a readable file address is shown as written
     0.35 |    1.59 | readers          | a log folder that cannot be written changes no answer
     2.74 |    9.76 | readers          | round 4: components and code elements in HTML, custom properties; Vue, JSX, Sass, Less and reStructu
     0.25 |    0.77 | readers          | round 4: CTOC's enforcement list applies only in CTOC's own repository
     3.08 |    9.33 | readers          | round 3: the whole-file scanners read script escape states, titles, comments and stylesheet strings;
     1.93 |    7.04 | readers          | round 5: host elements, the element stack, stylesheet names, custom properties
     1.07 |    3.42 | readers          | round 6: folded paths, colours that are no whole value, the cannot-read-exactly sentence
     0.75 |    1.98 | review-findings  | finding 1: no repository hook and no file-system monitor runs during either call
     4.16 |   12.69 | review-findings  | finding 2a: the first failing test is read from blank lines in linear time
     2.78 |    4.33 | review-findings  | finding 2c: a colour change in a one-line stylesheet is judged in linear time
     0.27 |    1.38 | review-findings  | finding 6: a tracked test command with shell structure runs no test and says so
     0.09 |    0.92 | review-findings  | finding 8: a named file with control characters is quoted cleaned in every sentence
     1.23 |    2.94 | review-findings  | finding 9: a judged file named like an option reaches the test run after --
     0.78 |    2.94 | review-findings  | finding 10: removal never follows a copy the tests swapped for a link to an outside folder
     2.71 |    3.50 | review-findings  | finding 11: a kill from outside removes the copy, then the signal ends the process
     0.55 |    0.77 | review-findings  | round 2, finding 1: a staged edit hidden behind an index bit is refused, or committed exactly as jud
     0.51 |    1.44 | review-findings  | round 2, finding 3: a project inside a sensitive, test, governing, build or database folder is judge
     0.43 |    1.04 | review-findings  | round 2, finding 9: a pass names each judged file with its staged id, which a rewriting commit hook 
     2.32 |    7.45 | review-findings  | round 9: paths and names — governing folders, sensitive words in every spelling, byte-order marks an
     0.82 |    2.35 | test-run         | case 30: the test command comes only from tracked files
     0.51 |    1.39 | test-run         | case 32: the commit takes only the judged files; a staged unrelated file stays staged
     0.06 |    0.49 | test-run         | case 33: a project folder outside the repository git reports is refused
     0.10 |    0.46 | test-run         | case 34: a fault inside the check is "the check stopped", its message in detail
     1.83 |    4.74 | test-run         | case 35: git settings in the repository change no answer
     0.36 |    0.44 | test-run         | case 36: a failure reported on standard error only is read
     0.26 |    0.33 | test-run         | case 37: npm's placeholder test script is "no test ran"
     0.26 |    0.33 | test-run         | case 38: a test runner that is not installed is "no test ran"
     0.89 |    1.24 | test-run         | round 10, B12 and B14: a skipped test confirms nothing, and the test run is asked to end its whole p
```

  Pair 1 ran with load 43.1 to 41.3 (old file) and 40.4 to 55.2 (six files): the longest new file is 0.497 of the old file, above 0.25. Pair 2 ran with load 51.8 to 28.8 (old file) and 26.8 to 27.8 (six files): 0.164. Both runs of pair 1 and pair 2 are kept as they came out. **Criterion 8 is left open** (pair 1 above 0.25); both pairs' loads are above. The old file alone took 103.78 s in pair 1 and 137.17 s in pair 2 at different loads, so the ratio moves with the load the six files share the machine with, not with the split. The two largest tests sit in the test-run file and the guards file in both pairs.
- **Criterion 9, the one after whole-suite run** (`SCRATCH/timed-run.js suite-after @suite`, the plan's two-reporter command over `tests/*.test.js`, 572 files, recorded as it came out and not repeated):

```
suite-after: exit 0; tests 13135, suites 2118, pass 13135, fail 0, cancelled 0, skipped 0, todo 0
wall 52.5 s, user 262.35 s, sys 186.61 s, cpu 448.96 s; load 26.9 to 42.6; cores 18; v24.14.1; commit bdeb68af4b785f0636ca8a25cedbbddac93f18f0
files with a duration line: 563
     48.87 s  tests/hotfix-check-corpus.test.js
     37.22 s  tests/hotfix-check-guards.test.js
     35.71 s  tests/hotfix-check-test-run.test.js
     35.66 s  tests/hotfix-check-readers.test.js
     33.70 s  tests/hotfix-check-review-findings.test.js
     33.12 s  tests/hotfix-check.test.js
     32.13 s  tests/hotfix-check-copy-and-log.test.js
     28.71 s  tests/quality-agent-coverage.test.js
hotfix files:
     48.87 s  tests/hotfix-check-corpus.test.js  (rank 1)
     37.22 s  tests/hotfix-check-guards.test.js  (rank 2)
     35.71 s  tests/hotfix-check-test-run.test.js  (rank 3)
     35.66 s  tests/hotfix-check-readers.test.js  (rank 4)
     33.70 s  tests/hotfix-check-review-findings.test.js  (rank 5)
     33.12 s  tests/hotfix-check.test.js  (rank 6)
     32.13 s  tests/hotfix-check-copy-and-log.test.js  (rank 7)
      2.75 s  tests/hotfix-check-differential.test.js  (rank 34)
```

  and the before run of Step 9 from the same wrapper:

```
suite-before: exit 0; tests 13135, suites 2118, pass 13135, fail 0, cancelled 0, skipped 0, todo 0
wall 241.18 s, user 363.02 s, sys 229.87 s, cpu 592.89 s; load 16.8 to 65; cores 18; v24.14.1; commit bdeb68af4b785f0636ca8a25cedbbddac93f18f0
files with a duration line: 558
    233.77 s  tests/hotfix-check.test.js
     79.47 s  tests/quality-agent-coverage.test.js
     70.74 s  tests/quality-fleet-wiring.test.js
     57.55 s  tests/hotfix-check-corpus.test.js
     25.56 s  tests/protect-records.test.js
     21.90 s  tests/lint.test.js
     19.17 s  tests/framework-security-checker.test.js
     17.42 s  tests/iron-loop-enforcer.test.js
hotfix files:
    233.77 s  tests/hotfix-check.test.js  (rank 1)
     57.55 s  tests/hotfix-check-corpus.test.js  (rank 4)
      6.53 s  tests/hotfix-check-differential.test.js  (rank 24)
```

  The file now setting the floor is `tests/hotfix-check-corpus.test.js` at 48.87 s (load 26.9 to 42.6); of the six split files, `tests/hotfix-check-guards.test.js` is second at 37.22 s. The runner ran all six hotfix files, picked up by the `tests/*.test.js` glob (6 `file` lines for them in `SCRATCH/suite-after.per-file`), and never the helper (0 `file` lines under `tests/helpers/`). **Criterion 9 is left open**: none of the six split files is the longest, but a hotfix file is, and the criterion says no hotfix file is the longest (the functional plan names the corpus and differential files as "the other two hotfix files", not split here); this is reported to the CTO Chief.
- **Measures and the word "faster"** (criterion 1). Measure a, the two pairs: the after side's wall clock is below the before side's in both (51.70 s against 103.88 s, 22.56 s against 137.27 s). Measure b, the whole suite's longest file: 233.77 s before, 48.87 s after, and wall clock 241.18 s before, 52.50 s after, at loads of 16.8 to 65.0 and 26.9 to 42.6. Measure c, whole-suite processor time (user plus system): 592.89 s before, 448.96 s after, did not grow. All three agree, so the suite is faster under the rule of criterion 1. The wall-clock figures are never the only evidence and the loads differ between the two runs. The split's own processor cost: the six files together took 42.18 s more processor time than the old file alone in pair 1 and 9.98 s more in pair 2 (spread between the pairs 32.20 s); the whole-suite difference (after minus before, minus 143.93 s) is larger in size than that spread, so it does not lie within the variation between the two pairs.
- **The one full `npm test`**: not run here; the CTO Chief ran it once after the last slice, see the close-out at the end of this record.

### Step 15: DOCUMENT

- This record. Per-test durations of the old file and the new files (pair 1, old alone beside the six together) are at the end of the pair summary above; the older per-test table of the old file alone is in `SCRATCH/hotfix-before-per-test.txt`.
- Release summary: `node src/scripts/release.js` ran in Step 10 (VERSION unchanged at 6.14.125); `git diff` of `CLAUDE.md` and `README.md` shows only the three test-file count lines, each 567 to 572; no JSON version file changed; `CLAUDE.md` is 14,983 bytes (limit 15,000). The fix round added no test file, so the count stays 572 (`ls tests/*.test.js` lists 572).
- Exception list: empty (no changed or added statement; every moved statement is byte for byte the old text).
- Changed paths under `.ctoc/`: none by this build; the untracked folder `.ctoc/audit/dispatches/2026-10-12/` was there before the build and is not this build's.
- Presence search for `hotfix-check.test.js` over the repository outside `plans/`, `node_modules/` and `.git/`: the files that name it are `tests/hotfix-check-corpus.test.js` (line 14, a comment, still true: the round-10 table is in `tests/hotfix-check.test.js`) and the six new files and the helper (their own closing comments). No doc describes that file's content, so no doc is listed as wrong. No other doc, comment or changelog was touched.

### Step 16: FINAL-REVIEW

Acceptance criteria verified against the evidence above: 1, 3, 4, 5, 6, 7, 10 and 11 ticked; 2, 8 and 9 were left open then; see the close-out at the end of this record for their closing. Git status outside `plans/` and `.ctoc/` lists the declared nine paths (`CLAUDE.md`, `README.md`, `tests/hotfix-check.test.js`, the five new test files and the helper) and the untracked `IRON_LOOP.md` at the worktree root, which was there before the build and was not touched. No menu command was run, no plan file was moved, nothing was committed.

### Close-out (2026-10-13): the one full npm test, criterion 9 and criterion 8 on processor time

- **The one full `npm test`**, once after the last slice, on the worktree at HEAD 13b73ce4b834660a59743823f4891717454dbb7a (a commit that adds only the slice 5 plan file; no source or test file differs from the build). Summary read from its output file: tests 13182, suites 2122, pass 13182, fail 0, cancelled 0, skipped 0, todo 0, duration_ms 60298.97; `[CTOC test-gate] coverage 99.88% (threshold 99%), skipped 0, failed 0`; corpus claims verified 3, refuted 0, unverifiable 0 (offline ledger gate: PASS); `[CTOC test-gate] PASS`. No failure occurred, so the rule for the two files another round owns needed no re-run. Criterion 2 is ticked on it. The test count is 13182 against this slice's earlier 13135 because slices 2 and 3 added tests.
- **Criterion 9**: CTO Chief ruling, decision 36: met. The longest file after the split is `tests/hotfix-check-corpus.test.js`, a hotfix file this slice does not split; none of the six split files is the longest; the split files no longer set the suite's floor. Ticked.
- **Criterion 8 on processor time**, decision 37. A fresh measurement, exactly two interleaved pairs, every run recorded and none repeated: the old file alone from the base copy (`SCRATCH/base-79f99476/tests/hotfix-check.test.js`), then each of the six new files alone, then the same again. Each run is `/usr/bin/time -p node --test --test-reporter=spec --test-reporter-destination=SCRATCH/cpu-pairs/<label>.spec <file>` from the repository root, started by `SCRATCH/cpu-pairs.js` (argument lists, no shell); processor time is user plus system. Node v24.14.1, 18 cores, HEAD as above. All 14 runs exit 0 with 0 failed and 0 skipped; the six new files hold 28, 13, 29, 18, 16 and 27 tests (131 together, as the old file). Output: `SCRATCH/cpu-pairs/runs.json`.

```
run                         wall s   user s   sys s   cpu s   load start-end   tests
pair 1  old file alone      104.89    50.43   34.73   85.16   23.3 - 23.0      131
        hotfix-check         15.92     7.53    5.87   13.40   23.0 - 21.2       28
        test-run             20.18     7.89    5.81   13.70   21.2 - 24.4       13
        copy-and-log         15.35     7.68    5.65   13.33   24.4 - 23.4       29
        review-findings      18.71    10.37    5.25   15.62   23.4 - 25.1       18
        readers              18.40     8.25    6.76   15.01   25.1 - 26.7       16
        guards               20.58    10.65    6.81   17.46   26.7 - 25.8       27
pair 2  old file alone      103.44    49.78   34.09   83.87   25.8 - 45.2      131
        hotfix-check         15.47     7.41    5.63   13.04   45.2 - 43.3       28
        test-run             18.42     7.77    5.47   13.24   43.3 - 39.8       13
        copy-and-log         15.00     7.65    5.44   13.09   39.8 - 37.9       29
        review-findings      18.52    10.26    5.03   15.29   37.9 - 37.6       18
        readers              17.79     8.13    6.64   14.77   37.6 - 40.1       16
        guards               20.70    10.71    6.86   17.57   40.1 - 39.8       27
```

  Pair 1: the largest new file is `tests/hotfix-check-guards.test.js` at 17.46 s over the old file's 85.16 s = 0.205. Pair 2: guards again, 17.57 s over 83.87 s = 0.209. Both at most 0.25, so **criterion 8 is met on processor time** and ticked. The six new files together took 88.52 s of processor time in pair 1 and 87.00 s in pair 2, against 85.16 s and 83.87 s for the old file: the split costs about 3.4 and 3.1 s of processor time over the old file, within these runs. Load rose during the pair 2 old-file run (25.8 to 45.2) and stayed between 37.6 and 45.2 through the pair 2 new-file runs, against 21.2 to 26.7 in pair 1; the processor times of the two old-file runs differ by 1.29 s and the largest new file's by 0.11 s. The earlier wall-clock pairs above are kept unchanged.

### Scripts (sources)

The four scripts the plan names, as they stood for the last runs above, then the three wrappers. The other scratch files (`top-durations.js`, `summarize-*.js`, `secrets-scan-seven.js`, `secrets-probe.js`, `edit-*.js`, `make-record.js`, `tick.js`, `append-record.js`) are small readers and editors of this record and of the scratch scripts and are in `SCRATCH`.

#### split-the-file.js

```js
'use strict';
// split-the-file.js — writes the six hotfix-check test files and the shared helper from the base
// commit's tests/hotfix-check.test.js. Plan:
// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md.
//
//   node split-the-file.js <repository root> <base commit>
//
// Writes exactly seven paths under the repository root (tests/hotfix-check.test.js is
// overwritten, tests/helpers is made if absent) and nothing else. Refuses, writing nothing,
// when the base file is not the file the plan's tables describe. Standard library and the
// repository's own TypeScript only; git is started with an argument list and no shell.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRATCH = __dirname;
const root = path.resolve(process.argv[2] || '');
const commit = process.argv[3];
if (!process.argv[2] || !commit) { console.error('usage: node split-the-file.js <repository root> <base commit>'); process.exit(2); }
const refuse = (m) => { console.error('refused: ' + m); process.exit(1); };
const ts = require(require.resolve('typescript', { paths: [root] }));

const HELPER = 'tests/helpers/hotfix-check-harness.js';
const FIRST = 'tests/hotfix-check.test.js';
const WHERE = {
  'tests/hotfix-check.test.js': [27, 315, 334, 341, 347, 361, 370, 377, 384, 391, 408, 414,
    425, 438, 447, 465, 471, 482, 492, 514, 527, 533, 540, 582, 607, 2078, 2122, 2674, 2705],
  'tests/hotfix-check-test-run.test.js': [677, 704, 717, 727, 745, 781, 789, 795, 2896,
    3049, 3082, 3085, 3144],
  'tests/hotfix-check-copy-and-log.test.js': [308, 546, 623, 664, 666, 694, 802, 817, 836,
    864, 872, 874, 933, 971, 976, 1004, 1033, 1070, 1116, 1130, 1140, 1162, 1171],
  'tests/hotfix-check-review-findings.test.js': [1461, 1489, 1523, 1550, 1557, 1563, 1584,
    1648, 1686, 1718, 1740, 2292],
  'tests/hotfix-check-readers.test.js': [1189, 1203, 1209, 1226, 1236, 1251, 1261, 1279,
    1355, 1366, 1376, 1765, 1873, 1886, 1948, 2018],
  'tests/hotfix-check-guards.test.js': [1826, 2191, 2350, 2363, 2401, 2497,
    2615, 2741, 2742, 2744, 2797, 2836, 2871, 2930, 2959, 2988, 3112, 3137],
  [HELPER]: [28, 29, 30, 31, 32, 34, 36, 47, 55, 57, 61, 62,
    69, 85, 86, 87, 89, 90, 91, 97, 98, 100, 105, 112, 114, 120, 128, 136, 153, 158, 178,
    184, 187, 192, 197, 199, 200, 201, 204, 218, 231, 242, 244, 254, 267, 275, 284, 300,
    954, 1101, 1404, 1405, 1421, 1443, 1449]
};
const REQUIRES = {
  'tests/hotfix-check.test.js': [1, 14, 15, 16, 18, 20, 22, 23],
  'tests/hotfix-check-test-run.test.js': [1, 14, 15, 16, 18, 24],
  'tests/hotfix-check-copy-and-log.test.js': [1, 14, 15, 16, 18, 22, 24, 25],
  'tests/hotfix-check-review-findings.test.js': [1, 14, 15, 16, 18, 20, 23, 24],
  'tests/hotfix-check-readers.test.js': [1, 14, 15, 16, 18, 20, 24],
  'tests/hotfix-check-guards.test.js': [1, 14, 15, 16, 18, 22, 23, 24, 25],
  [HELPER]: [1, 14, 15, 16, 17, 18, 19, 20]
};
const REQUIRE_LINES = [1, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25];
const TEST_FILES = Object.keys(WHERE).filter((f) => f !== HELPER);

// The names each test file takes from the harness, in the plan's order. Lint is the arbiter.
const HARNESS_NAMES = {
  'tests/hotfix-check.test.js': ['NODE', 'STATUS_LINE', 'USAGE', 'NO_TEST', 'refusal', 'unreadable', 'gone', 'SETTING', 'HOME', 'HOME_STORE',
    'PASSING_TEST', 'FAILING_TEST', 'SCRIPT', 'tmpDir', 'PRIVATE_TMP', 'git', 'writeFiles', 'packageJson', 'makeRepo', 'testedProject',
    'withEnv', 'check', 'probeDir', 'probeRead', 'logLines', 'refusedUntouched', 'assertChecking', 'assertPass', 'buttonWording',
    'runCommit', 'changeOf'],
  'tests/hotfix-check-test-run.test.js': ['NO_TEST', 'refusal', 'unreadable', 'HOME', 'HOME_STORE', 'nodeTest', 'FAILING_TEST',
    'SCRIPT', 'tmpDir', 'git', 'writeFiles', 'makeRepo', 'testedProject', 'withEnv', 'check', 'logLines', 'LOG', 'withoutTime',
    'refusedUntouched', 'assertPass', 'buttonWording', 'runCommit'],
  'tests/hotfix-check-copy-and-log.test.js': ['NODE', 'LOG', 'NO_TEST', 'refusal', 'unreadable', 'HOME', 'HOME_STORE', 'nodeTest',
    'PASSING_TEST', 'FAILING_TEST', 'SCRIPT', 'tmpDir', 'leftovers', 'git', 'writeFiles', 'makeRepo', 'testedProject', 'withEnv',
    'check', 'probeDir', 'probeRead', 'logLines', 'worktrees', 'stashList', 'treeBytes', 'refusedUntouched', 'assertChecking',
    'assertPass', 'buttonWording', 'copyParent', 'linkedProject', 'workspaceProject'],
  'tests/hotfix-check-review-findings.test.js': ['NODE', 'STATUS_LINE', 'USAGE', 'NO_TEST', 'refusal', 'unreadable', 'inexact', 'HOME', 'HOME_STORE',
    'nodeTest', 'PASSING_TEST', 'SCRIPT', 'tmpDir', 'PRIVATE_TMP', 'git', 'writeFiles', 'makeRepo', 'testedProject', 'check',
    'probeDir', 'probeRead', 'logLines', 'sha', 'worktrees', 'treeBytes', 'refusedUntouched', 'assertChecking', 'assertPass',
    'shellWords', 'runCommit', 'copyParent', 'linkedProject', 'growth', 'changeOf'],
  'tests/hotfix-check-readers.test.js': ['STATUS_LINE', 'NO_TEST', 'refusal', 'unreadable', 'gone', 'inexact', 'HOME', 'HOME_STORE',
    'nodeTest', 'PASSING_TEST', 'SCRIPT', 'tmpDir', 'git', 'writeFiles', 'packageJson', 'makeRepo', 'testedProject', 'check',
    'logLines', 'refusedUntouched', 'assertChecking', 'assertPass', 'runCommit', 'copyParent'],
  'tests/hotfix-check-guards.test.js': ['STATUS_LINE', 'refusal', 'unreadable', 'gone', 'inexact', 'HOME', 'HOME_STORE',
    'nodeTest', 'PASSING_TEST', 'SCRIPT', 'tmpDir', 'PRIVATE_TMP', 'leftovers', 'git', 'writeFiles', 'makeRepo', 'testedProject',
    'withEnv', 'check', 'probeDir', 'probeRead', 'logLines', 'withoutTime', 'worktrees', 'assertChecking', 'assertPass',
    'copyParent', 'workspaceProject', 'growth', 'changeOf']
};
const EXPORT_LIST = [
  'module.exports = {',
  '  NODE, STATUS_LINE, USAGE, LOG, NO_TEST, refusal, unreadable, gone, inexact, SETTING, HOME,',
  '  HOME_STORE, nodeTest, PASSING_TEST, FAILING_TEST, SCRIPT, tmpDir, PRIVATE_TMP, leftovers,',
  '  git, writeFiles, packageJson, makeRepo, testedProject, withEnv, check,',
  '  probeDir, probeRead, logLines, withoutTime, sha, worktrees, stashList, treeBytes,',
  '  refusedUntouched, assertChecking, assertPass, buttonWording, shellWords, runCommit,',
  '  copyParent, linkedProject, workspaceProject, growth, changeOf',
  '};'
].join('\n');

// ---- the texts the plan fixes word for word ---------------------------------------------------
const HEADER_FIRST = [
  '//',
  '// Since 2026-10-12 this file holds one area of those cases: the passes and refusals through',
  "// the menu (cases 1 to 23, 25 and 27; case 26 is checked inside case 1), the ninth round's size",
  "// rule and its names that are dependencies, the build or settings, the tenth round's table of",
  '// every removed extension, and its refusals through the real menu process. The other',
  '// areas are tests/hotfix-check-test-run.test.js, tests/hotfix-check-copy-and-log.test.js,',
  '// tests/hotfix-check-review-findings.test.js, tests/hotfix-check-readers.test.js and',
  '// tests/hotfix-check-guards.test.js; the shared setup and the private temporary folder are',
  '// tests/helpers/hotfix-check-harness.js. Split, every test word for word, by the plan',
  '// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.'
];
const CLOSING = [
  '// Moved word for word out of tests/hotfix-check.test.js by the plan',
  '// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.',
  "// The shared setup and this file's private temporary folder: tests/helpers/hotfix-check-harness.js."
];
const AREA = {
  'tests/hotfix-check-test-run.test.js': [
    "// The hotfix check's second call, the test run: which test command runs, how the run's",
    '// output is read, the commit it prepares and the faults that stop it (cases 30 and 32 to 38),',
    "// a skipped test and the test command's process tree (the tenth round and after), and every",
    "// runner's failing and passing summary."
  ],
  'tests/hotfix-check-copy-and-log.test.js': [
    '// The copy the hotfix check runs the tests in, the package folders linked into it,',
    "// and the check's log: what the check leaves in the project, in the copy and in the log (cases",
    '// 24, 28, 29, 31 and 39 to 53).'
  ],
  'tests/hotfix-check-review-findings.test.js': [
    "// The code review's and the security check's findings of 2026-10-08 against the",
    '// hotfix check (findings 1 to 11 and the second round), each written and seen failing before',
    "// its fix, and the ninth round's paths and names (governing folders, sensitive words,",
    '// byte-order marks and line endings).'
  ],
  'tests/hotfix-check-readers.test.js': [
    "// The hotfix check's readers: every branch of the trial build's cases (deleted and",
    '// linked files, text that is not UTF-8, names, run output, edge shapes, projects in a',
    '// sub-folder) and the third to sixth rounds of the page and stylesheet readers (the fourth',
    "// round's fail-closed scanners are in tests/hotfix-check-guards.test.js)."
  ],
  'tests/hotfix-check-guards.test.js': [
    "// The hotfix check's guards: the fourth round's fail-closed scanners, the ninth round (the",
    "// stylesheets, a long path, an added or deleted path, the copy's removal, failing closed,",
    "// transforms), the tenth round's fixes in what stays, and the re-checks of 2026-10-10."
  ]
};
const HELPER_HEADER = [
  '/**',
  ' * The shared setup of the hotfix-check test files (tests/hotfix-check.test.js and',
  ' * tests/hotfix-check-*.test.js, split by area on 2026-10-12; plan',
  ' * the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/):',
  ' * the fixture writers, the router call `check`, the assertion helpers, the timing helper, and',
  ' * one private temporary folder per test process. Every statement below was moved word for word',
  ' * out of tests/hotfix-check.test.js; only the requires and the export list are new.',
  ' *',
  ' * Loading this module registers the two cleanup hooks once per test process: the removal of',
  ' * every scratch folder when the file ends, and the check after every test that no `ctoc-hotfix-`',
  ' * folder is left in the private temporary folder. Every test file loads this module, so none can',
  ' * forget them. `node --test` runs each test file in its own process, so each file gets its own',
  ' * private folder and its own list of scratch folders.',
  ' *',
  ' * Not a `*.test.js` file and lives under tests/helpers/, so the `node --test tests/*.test.js`',
  ' * glob never executes it as a test.',
  ' */'
].join('\n');
const ROUTE_REQUIRE = "const { route } = require('../../src/lib/menu-screens');";

// ---- read and parse the base file -------------------------------------------------------------
const shown = spawnSync('git', ['show', `${commit}:tests/hotfix-check.test.js`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 27 });
if (shown.status !== 0) refuse('git show failed: ' + shown.stderr);
const text = shown.stdout;
const sf = ts.createSourceFile('base.test.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const lines = text.split('\n');
const lineStart = [0]; // lineStart[n] = offset of the first character of line n (1-based)
for (let i = 0, n = 1; i < text.length; i++) if (text[i] === '\n') lineStart[++n] = i + 1;
const lineEndOffset = (n) => lineStart[n + 1] - 1; // offset of the line break that ends line n

// ---- refuse on any mismatch -------------------------------------------------------------------
const stmts = sf.statements;
if (stmts.length !== 178) refuse(`the file has ${stmts.length} top-level statements, expected 178`);
const byLine = new Map();
for (const s of stmts) {
  const l = sf.getLineAndCharacterOfPosition(s.getStart(sf)).line + 1;
  if (byLine.has(l)) refuse(`two statements start on line ${l}`);
  byLine.set(l, s);
}
const named = new Map();
for (const [rel, ls] of Object.entries(WHERE)) for (const l of ls) named.set(l, (named.get(l) || 0) + 1);
for (const l of REQUIRE_LINES) named.set(l, (named.get(l) || 0) + 1);
for (const [l, n] of named) {
  if (n !== 1) refuse(`old line ${l} is named ${n} times`);
  if (!byLine.has(l)) refuse(`old line ${l} is not the start line of a top-level statement`);
}
if (named.size !== 178) refuse(`the tables name ${named.size} statements, expected 178`);
if (!lines[1394 - 1].startsWith("// The code review's")) refuse('old line 1394 does not start with "// The code review\'s"');
if (lines[1397 - 1] !== '/**') refuse('old line 1397 is not /**');
if (lines[1404 - 1] !== 'const TIMED_MS = 40;') refuse('old line 1404 is not const TIMED_MS = 40;');
if (!lines[1461 - 1].startsWith("test('finding 1:")) refuse("old line 1461 does not start with test('finding 1:");
for (const [rel, rows] of Object.entries(REQUIRES)) {
  for (const l of rows) if (!REQUIRE_LINES.includes(l)) refuse(`REQUIRES names old line ${l} in ${rel}, which is no require line`);
}

// ---- exceptions -------------------------------------------------------------------------------
const exceptions = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'split-exceptions.json'), 'utf8'));

// ---- pieces -----------------------------------------------------------------------------------
const piece = new Map();
let reviewSection = null;
for (const [l, s] of byLine) {
  if (REQUIRE_LINES.includes(l)) continue;
  let p;
  const ex = exceptions.find((e) => e.oldLine === l);
  if (l === 1404) {
    const cut = lineEndOffset(1395);
    reviewSection = text.slice(s.getFullStart(), cut);
    p = text.slice(cut, s.getEnd());
  } else if (ex) {
    p = text.slice(s.getFullStart(), s.getStart(sf)) + ex.newText;
  } else {
    p = text.slice(s.getFullStart(), s.getEnd());
  }
  piece.set(l, p);
}
const lineText = (l) => byLine.get(l).getText(sf);

// ---- compose ----------------------------------------------------------------------------------
function wrapImport(names) {
  const rows = [];
  let cur = '  ';
  for (let i = 0; i < names.length; i++) {
    const add = names[i] + (i < names.length - 1 ? ',' : '');
    if (cur.trim() === '') cur += add;
    else if ((cur + ' ' + add).length <= 100) cur += ' ' + add;
    else { rows.push(cur); cur = '  ' + add; }
  }
  rows.push(cur);
  return `const {\n${rows.join('\n')}\n} = require('./helpers/hotfix-check-harness');`;
}
function requireBlock(rel) {
  const own = REQUIRES[rel].filter((l) => l !== 1).map(lineText);
  const plain = own.filter((t) => !t.includes("'../src"));
  const src = own.filter((t) => t.includes("'../src"));
  return plain.join('\n') + (src.length ? '\n\n' + src.join('\n') : '');
}
function addedAfterImport(rel) {
  return exceptions.filter((e) => e.oldLine === null && e.file === rel).map((e) => '\n\n' + e.newText).join('');
}
// The pieces of a file's WHERE row in old order. A piece that opens with a single line break
// (no blank line in front of it) was glued to its old predecessor; when that predecessor is not
// the piece written just before it, a blank line is put in front, so whitespace between
// statements matches the old file wherever it can. Every junction so changed is printed.
const oldOrder = [...byLine.keys()];
const junctions = [];
function sequence(rel) {
  let s = '';
  let prev = null;
  for (const l of WHERE[rel]) {
    if (l === 1461) s += reviewSection;
    let p = piece.get(l);
    if (/^\n[^\n]/.test(p) && oldOrder[oldOrder.indexOf(l) - 1] !== prev) {
      p = '\n' + p;
      junctions.push(`${rel}: blank line before the statement of old line ${l}`);
    }
    s += p;
    prev = l;
  }
  return s;
}

const out = {};
for (const rel of TEST_FILES) {
  let t = "'use strict';";
  if (rel === FIRST) {
    t += text.slice(stmts[0].getEnd(), lineEndOffset(12)) + '\n' + HEADER_FIRST.join('\n');
  } else {
    t += '\n\n' + AREA[rel].concat(CLOSING).join('\n');
  }
  t += '\n\n' + requireBlock(rel);
  t += '\n\n' + wrapImport(HARNESS_NAMES[rel]) + addedAfterImport(rel);
  t += sequence(rel);
  out[rel] = t + '\n';
}

// the helper
{
  const rel = HELPER;
  let t = "'use strict';\n\n" + HELPER_HEADER;
  t += '\n\n' + text.slice(byLine.get(14).getStart(sf), byLine.get(20).getEnd());
  t += '\n\n' + ROUTE_REQUIRE;
  t += sequence(rel);
  t += '\n\n' + EXPORT_LIST;
  out[rel] = t + '\n';
}

// ---- write exactly the seven paths ------------------------------------------------------------
fs.mkdirSync(path.join(root, 'tests', 'helpers'), { recursive: true });
for (const rel of [...TEST_FILES, HELPER]) {
  fs.writeFileSync(path.join(root, ...rel.split('/')), out[rel]);
  console.log(`${rel}: ${out[rel].split('\n').length - 1} lines`);
}
for (const j of junctions) console.log('junction: ' + j);
```

#### prove-the-split.js

```js
'use strict';
// prove-the-split.js — the proof that tests/hotfix-check.test.js was split into six files and a
// helper without losing a test name, an assertion call, a top-level statement or a comment.
// Plan: the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md.
//
//   node prove-the-split.js <repository root> <base commit>
//   node prove-the-split.js <repository root> <base commit> --tap-from <folder>
//   node prove-the-split.js <repository root> <base commit> --static <new root>
//
// Standard library and the repository's own TypeScript only. Every child process is started
// with an argument list and no shell; NODE_TEST_CONTEXT is deleted from every child's
// environment. Independent of the split script: it takes nothing from it.

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const SCRATCH = __dirname;
const argv = process.argv.slice(2);
if (argv.length < 2) {
  console.error('usage: node prove-the-split.js <repository root> <base commit> [--tap-from <folder> | --static <new root>]');
  process.exit(2);
}
const root = path.resolve(argv[0]);
const commit = argv[1];
let tapFrom = null;
let staticRoot = null;
for (let i = 2; i < argv.length; i++) {
  if (argv[i] === '--tap-from' && argv[i + 1]) tapFrom = path.resolve(argv[++i]);
  else if (argv[i] === '--static' && argv[i + 1]) staticRoot = path.resolve(argv[++i]);
  else { console.error('unknown argument: ' + argv[i]); process.exit(2); }
}
const ts = require(require.resolve('typescript', { paths: [root] }));

// ---- output: every absolute path is written relative to the repository root or SCRATCH -------
const scrubs = [[fs.realpathSync(SCRATCH), 'SCRATCH'], [SCRATCH, 'SCRATCH'], [fs.realpathSync(root), '<repository root>'], [root, '<repository root>']];
function scrub(s) {
  let r = String(s);
  for (const [from, to] of scrubs) r = r.split(from).join(to);
  return r;
}
const say = (...a) => console.log(scrub(a.join(' ')));
let failures = 0;
function fail(msg) { failures++; say('FAIL: ' + msg); }
const short = (s, n = 220) => (s.length > n ? s.slice(0, n) + '…' : s).replace(/\n/g, '\\n');

// ---- the plan's tables, typed from the plan ---------------------------------------------------
const HELPER = 'tests/helpers/hotfix-check-harness.js';
const WHERE = {
  'tests/hotfix-check.test.js': [27, 315, 334, 341, 347, 361, 370, 377, 384, 391, 408, 414,
    425, 438, 447, 465, 471, 482, 492, 514, 527, 533, 540, 582, 607, 2078, 2122, 2674, 2705],
  'tests/hotfix-check-test-run.test.js': [677, 704, 717, 727, 745, 781, 789, 795, 2896,
    3049, 3082, 3085, 3144],
  'tests/hotfix-check-copy-and-log.test.js': [308, 546, 623, 664, 666, 694, 802, 817, 836,
    864, 872, 874, 933, 971, 976, 1004, 1033, 1070, 1116, 1130, 1140, 1162, 1171],
  'tests/hotfix-check-review-findings.test.js': [1461, 1489, 1523, 1550, 1557, 1563, 1584,
    1648, 1686, 1718, 1740, 2292],
  'tests/hotfix-check-readers.test.js': [1189, 1203, 1209, 1226, 1236, 1251, 1261, 1279,
    1355, 1366, 1376, 1765, 1873, 1886, 1948, 2018],
  'tests/hotfix-check-guards.test.js': [1826, 2191, 2350, 2363, 2401, 2497,
    2615, 2741, 2742, 2744, 2797, 2836, 2871, 2930, 2959, 2988, 3112, 3137],
  [HELPER]: [28, 29, 30, 31, 32, 34, 36, 47, 55, 57, 61, 62,
    69, 85, 86, 87, 89, 90, 91, 97, 98, 100, 105, 112, 114, 120, 128, 136, 153, 158, 178,
    184, 187, 192, 197, 199, 200, 201, 204, 218, 231, 242, 244, 254, 267, 275, 284, 300,
    954, 1101, 1404, 1405, 1421, 1443, 1449]
};
const REQUIRES = {
  'tests/hotfix-check.test.js': [1, 14, 15, 16, 18, 20, 22, 23],
  'tests/hotfix-check-test-run.test.js': [1, 14, 15, 16, 18, 24],
  'tests/hotfix-check-copy-and-log.test.js': [1, 14, 15, 16, 18, 22, 24, 25],
  'tests/hotfix-check-review-findings.test.js': [1, 14, 15, 16, 18, 20, 23, 24],
  'tests/hotfix-check-readers.test.js': [1, 14, 15, 16, 18, 20, 24],
  'tests/hotfix-check-guards.test.js': [1, 14, 15, 16, 18, 22, 23, 24, 25],
  [HELPER]: [1, 14, 15, 16, 17, 18, 19, 20]
};
const REQUIRE_LINES = [1, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25];
const TEST_FILES = Object.keys(WHERE).filter((f) => f !== HELPER);
const FILES = [...TEST_FILES, HELPER];
const ROUTE_REQUIRE = "const { route } = require('../../src/lib/menu-screens');";
const EXPORTS = ['NODE', 'STATUS_LINE', 'USAGE', 'LOG', 'NO_TEST', 'refusal', 'unreadable', 'gone', 'inexact', 'SETTING', 'HOME',
  'HOME_STORE', 'nodeTest', 'PASSING_TEST', 'FAILING_TEST', 'SCRIPT', 'tmpDir', 'PRIVATE_TMP', 'leftovers',
  'git', 'writeFiles', 'packageJson', 'makeRepo', 'testedProject', 'withEnv', 'check',
  'probeDir', 'probeRead', 'logLines', 'withoutTime', 'sha', 'worktrees', 'stashList', 'treeBytes',
  'refusedUntouched', 'assertChecking', 'assertPass', 'buttonWording', 'shellWords', 'runCommit',
  'copyParent', 'linkedProject', 'workspaceProject', 'growth', 'changeOf'];

// ---- the comments the plan adds, word for word ------------------------------------------------
const HEADER_FIRST = [
  '//',
  '// Since 2026-10-12 this file holds one area of those cases: the passes and refusals through',
  "// the menu (cases 1 to 23, 25 and 27; case 26 is checked inside case 1), the ninth round's size",
  "// rule and its names that are dependencies, the build or settings, the tenth round's table of",
  '// every removed extension, and its refusals through the real menu process. The other',
  '// areas are tests/hotfix-check-test-run.test.js, tests/hotfix-check-copy-and-log.test.js,',
  '// tests/hotfix-check-review-findings.test.js, tests/hotfix-check-readers.test.js and',
  '// tests/hotfix-check-guards.test.js; the shared setup and the private temporary folder are',
  '// tests/helpers/hotfix-check-harness.js. Split, every test word for word, by the plan',
  '// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.'
];
const CLOSING = [
  '// Moved word for word out of tests/hotfix-check.test.js by the plan',
  '// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/.',
  "// The shared setup and this file's private temporary folder: tests/helpers/hotfix-check-harness.js."
];
const AREA = {
  'tests/hotfix-check-test-run.test.js': [
    "// The hotfix check's second call, the test run: which test command runs, how the run's",
    '// output is read, the commit it prepares and the faults that stop it (cases 30 and 32 to 38),',
    "// a skipped test and the test command's process tree (the tenth round and after), and every",
    "// runner's failing and passing summary."
  ],
  'tests/hotfix-check-copy-and-log.test.js': [
    '// The copy the hotfix check runs the tests in, the package folders linked into it,',
    "// and the check's log: what the check leaves in the project, in the copy and in the log (cases",
    '// 24, 28, 29, 31 and 39 to 53).'
  ],
  'tests/hotfix-check-review-findings.test.js': [
    "// The code review's and the security check's findings of 2026-10-08 against the",
    '// hotfix check (findings 1 to 11 and the second round), each written and seen failing before',
    "// its fix, and the ninth round's paths and names (governing folders, sensitive words,",
    '// byte-order marks and line endings).'
  ],
  'tests/hotfix-check-readers.test.js': [
    "// The hotfix check's readers: every branch of the trial build's cases (deleted and",
    '// linked files, text that is not UTF-8, names, run output, edge shapes, projects in a',
    '// sub-folder) and the third to sixth rounds of the page and stylesheet readers (the fourth',
    "// round's fail-closed scanners are in tests/hotfix-check-guards.test.js)."
  ],
  'tests/hotfix-check-guards.test.js': [
    "// The hotfix check's guards: the fourth round's fail-closed scanners, the ninth round (the",
    "// stylesheets, a long path, an added or deleted path, the copy's removal, failing closed,",
    "// transforms), the tenth round's fixes in what stays, and the re-checks of 2026-10-10."
  ]
};
const HELPER_HEADER = [
  '/**',
  ' * The shared setup of the hotfix-check test files (tests/hotfix-check.test.js and',
  ' * tests/hotfix-check-*.test.js, split by area on 2026-10-12; plan',
  ' * the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/):',
  ' * the fixture writers, the router call `check`, the assertion helpers, the timing helper, and',
  ' * one private temporary folder per test process. Every statement below was moved word for word',
  ' * out of tests/hotfix-check.test.js; only the requires and the export list are new.',
  ' *',
  ' * Loading this module registers the two cleanup hooks once per test process: the removal of',
  ' * every scratch folder when the file ends, and the check after every test that no `ctoc-hotfix-`',
  ' * folder is left in the private temporary folder. Every test file loads this module, so none can',
  ' * forget them. `node --test` runs each test file in its own process, so each file gets its own',
  ' * private folder and its own list of scratch folders.',
  ' *',
  ' * Not a `*.test.js` file and lives under tests/helpers/, so the `node --test tests/*.test.js`',
  ' * glob never executes it as a test.',
  ' */'
].join('\n');
const ADDED_COMMENTS = []; // {file, text}
for (const t of HEADER_FIRST) ADDED_COMMENTS.push({ file: 'tests/hotfix-check.test.js', text: t });
for (const f of Object.keys(AREA)) {
  for (const t of [...AREA[f], ...CLOSING]) ADDED_COMMENTS.push({ file: f, text: t });
}
ADDED_COMMENTS.push({ file: HELPER, text: HELPER_HEADER });

// ---- helpers ----------------------------------------------------------------------------------
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;
const parse = (name, text) => ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const labelOf = (rel) => path.basename(rel).replace(/\.test\.js$/, '');
const bump = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);
const lineOf = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

function isRequireLine(s) {
  if (ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression) && s.expression.text === 'use strict') return true;
  if (!ts.isVariableStatement(s)) return false;
  const decls = s.declarationList.declarations;
  return decls.length > 0 && decls.every((d) => d.initializer && ts.isCallExpression(d.initializer)
    && ts.isIdentifier(d.initializer.expression) && d.initializer.expression.text === 'require'
    && d.initializer.arguments.length === 1 && ts.isStringLiteral(d.initializer.arguments[0]));
}
function requireArg(s) {
  const d = s.declarationList.declarations[0];
  return d.initializer.arguments[0].text;
}
function isHarnessImport(s) {
  if (!ts.isVariableStatement(s) || s.declarationList.declarations.length !== 1) return false;
  const d = s.declarationList.declarations[0];
  if (!isRequireLine(s) || requireArg(s) !== './helpers/hotfix-check-harness') return false;
  return ts.isObjectBindingPattern(d.name) && d.name.elements.every((e) => !e.propertyName && !e.initializer && !e.dotDotDotToken && ts.isIdentifier(e.name));
}

function diffMaps(a, b, labelA, labelB, show = (k) => k) {
  let n = 0;
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) {
    const x = a.get(k) || 0;
    const y = b.get(k) || 0;
    if (x !== y) { n++; say(`  differs: ${short(show(k))} — ${labelA} ${x}, ${labelB} ${y}`); }
  }
  return n;
}
const total = (m) => [...m.values()].reduce((s, v) => s + v, 0);

// ---- the base file ----------------------------------------------------------------------------
const shown = spawnSync('git', ['show', `${commit}:tests/hotfix-check.test.js`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 27 });
if (shown.status !== 0) { say('refused: git show failed: ' + shown.stderr); process.exit(1); }
const baseText = shown.stdout;
const baseSf = parse('base.test.js', baseText);

async function main() {
  say(`mode: ${staticRoot ? '--static ' + staticRoot : tapFrom ? '--tap-from ' + tapFrom : 'full'}; base commit ${commit}`);
  const newRoot = staticRoot || root;

  // 1. the old file at the base commit (not in --static mode)
  const baseDir = path.join(SCRATCH, `base-${commit}`);
  const baseCopy = path.join(baseDir, 'tests', 'hotfix-check.test.js');
  if (!staticRoot) {
    const d = spawnSync('git', ['diff', '--quiet', commit, '--', 'src'], { cwd: root });
    if (d.status !== 0) { say(`refused: src differs from ${commit}, so the old file run today is not the old file at the base commit`); process.exit(1); }
    fs.mkdirSync(path.join(baseDir, 'tests'), { recursive: true });
    for (const name of ['src', 'node_modules']) {
      const link = path.join(baseDir, name);
      let exists = true;
      try { fs.lstatSync(link); } catch { exists = false; }
      if (!exists) fs.symlinkSync(path.join(root, name), link, process.platform === 'win32' ? 'junction' : 'dir');
    }
    fs.writeFileSync(baseCopy, baseText);
  }

  // 2. presence
  const files = {};
  for (const rel of FILES) {
    const p = path.join(newRoot, rel);
    if (!fs.existsSync(p)) { fail('missing: ' + rel); continue; }
    const text = fs.readFileSync(p, 'utf8');
    files[rel] = { text, sf: parse(rel, text) };
  }

  // 3. names
  if (staticRoot) await staticNames(files);
  else await tapNames(files, baseCopy);

  // 4. assertion calls, 5. statements
  const exceptions = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'split-exceptions.json'), 'utf8'));
  say(`exception entries: ${exceptions.length}`);
  for (const e of exceptions) say('  exception: ' + short(JSON.stringify(e), 600));
  assertionCheck(files, exceptions);
  statementCheck(files, exceptions);

  // 6. comments (not in --static mode)
  if (!staticRoot) commentCheck(files);

  // 7. result
  say(failures === 0 ? 'PASS' : `FAILED: ${failures} problem(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

// ---- 3a. names from TAP -----------------------------------------------------------------------
function parseTap(text) {
  const keys = new Map();
  const counters = {};
  let subtests = 0;
  let results = 0;
  let notOk = 0;
  let directives = 0;
  let inYaml = false;
  let stack = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (inYaml) { if (t === '...') inYaml = false; continue; }
    if (t === '---') { inYaml = true; continue; }
    let m = /^((?: {4})*)# Subtest: (.*)$/.exec(line);
    if (m) {
      const depth = m[1].length / 4;
      stack = stack.slice(0, depth);
      stack.push(m[2]);
      bump(keys, JSON.stringify(stack));
      subtests++;
      continue;
    }
    m = /^((?: {4})*)(ok|not ok) \d+ - (.*?)( # (SKIP|TODO)\b.*)?$/.exec(line);
    if (m) {
      results++;
      if (m[2] === 'not ok') notOk++;
      if (m[4]) directives++;
      continue;
    }
    m = /^# (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$/.exec(line);
    if (m) counters[m[1]] = Number(m[2]);
  }
  return { keys, counters, subtests, results, notOk, directives };
}

function checkRun(label, status, tap) {
  const p = parseTap(tap);
  say(`  ${label}: exit ${status === undefined ? 'not seen (--tap-from)' : status}; subtests ${p.subtests}, results ${p.results}, tests ${p.counters.tests}, pass ${p.counters.pass}, fail ${p.counters.fail}, cancelled ${p.counters.cancelled}, skipped ${p.counters.skipped}, todo ${p.counters.todo}, not ok ${p.notOk}, directives ${p.directives}`);
  if (status !== undefined && status !== 0) fail(`${label}: exit status ${status}`);
  if (!(p.subtests === p.results && p.results === p.counters.tests && p.counters.tests > 0)) fail(`${label}: subtest lines, result lines and the tests counter differ`);
  for (const c of ['fail', 'cancelled', 'skipped', 'todo']) if (p.counters[c] !== 0) fail(`${label}: ${c} is ${p.counters[c]}`);
  if (p.notOk !== 0) fail(`${label}: ${p.notOk} not ok`);
  if (p.directives !== 0) fail(`${label}: ${p.directives} SKIP or TODO directives`);
  return p;
}

function runTap(file, tapPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--test', '--test-reporter=tap', file], { cwd: root, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let killed = false;
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', () => {});
    const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, 900 * 1000);
    child.on('close', (status) => {
      clearTimeout(timer);
      fs.writeFileSync(tapPath, out);
      resolve({ status: killed ? 'killed after 900 s' : status, out });
    });
  });
}

async function tapNames(files, baseCopy) {
  fs.mkdirSync(path.join(SCRATCH, 'tap'), { recursive: true });
  const runs = {}; // label -> {status, out}
  const wanted = [{ label: 'base', rel: null }, ...TEST_FILES.map((rel) => ({ label: labelOf(rel), rel }))];
  if (tapFrom) {
    for (const w of wanted) {
      const p = w.rel === null ? path.join(SCRATCH, 'tap', 'base.tap') : path.join(tapFrom, `${w.label}.tap`);
      if (!fs.existsSync(p)) { fail(`missing TAP file: ${p}`); continue; }
      if (w.rel !== null && !files[w.rel]) continue;
      runs[w.label] = { status: undefined, out: fs.readFileSync(p, 'utf8') };
    }
    say('names: TAP read from files; the exit status of those runs is the one the build record holds, and this script did not see it');
  } else {
    say('names: starting the old file and the present new files at once, each with node --test --test-reporter=tap');
    const jobs = wanted.filter((w) => w.rel === null || files[w.rel]).map(async (w) => {
      const file = w.rel === null ? baseCopy : path.join(root, w.rel);
      runs[w.label] = await runTap(file, path.join(SCRATCH, 'tap', `${w.label}.tap`));
    });
    await Promise.all(jobs);
  }
  const base = runs.base ? checkRun('old file', runs.base.status, runs.base.out) : null;
  const sum = new Map();
  for (const rel of TEST_FILES) {
    const r = runs[labelOf(rel)];
    if (!r) continue;
    const p = checkRun(labelOf(rel), r.status, r.out);
    for (const [k, v] of p.keys) bump(sum, k, v);
  }
  if (base) {
    say(`names: old file ${total(base.keys)}, six files together ${total(sum)} (nested names, multiset)`);
    const n = diffMaps(base.keys, sum, 'old', 'new');
    if (n) fail(`${n} nested name(s) differ`);
    if (total(base.keys) !== 131) fail(`the old file lists ${total(base.keys)} names, the plan expects 131`);
    if (total(sum) !== 131) fail(`the six files list ${total(sum)} names, the plan expects 131`);
  }
}

// ---- 3b. names from the parse (--static) ------------------------------------------------------
function staticKeys(sf) {
  const keys = new Map();
  const isTestCallee = (c) => (ts.isIdentifier(c) && c.text === 'test') || (ts.isPropertyAccessExpression(c) && c.name.text === 'test');
  (function walk(n, stack) {
    let next = stack;
    if (ts.isCallExpression(n) && isTestCallee(n.expression) && n.arguments.length > 0) {
      next = [...stack, n.arguments[0].getText(sf)];
      bump(keys, JSON.stringify(next));
    }
    ts.forEachChild(n, (c) => walk(c, next));
  })(sf, []);
  return keys;
}
async function staticNames(files) {
  const oldKeys = staticKeys(baseSf);
  const newKeys = new Map();
  for (const rel of TEST_FILES) {
    if (!files[rel]) continue;
    for (const [k, v] of staticKeys(files[rel].sf)) bump(newKeys, k, v);
  }
  say(`static names: old file ${total(oldKeys)} call sites, six files together ${total(newKeys)}`);
  const n = diffMaps(oldKeys, newKeys, 'old', 'new');
  if (n) fail(`${n} static name(s) differ`);
}

// ---- 4. assertion calls -----------------------------------------------------------------------
function assertCalls(sf) {
  const out = [];
  (function walk(n) {
    if (ts.isCallExpression(n)) {
      const c = n.expression;
      if ((ts.isIdentifier(c) && c.text === 'assert')
        || (ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.expression) && c.expression.text === 'assert')) out.push(n.getText(sf));
    }
    ts.forEachChild(n, walk);
  })(sf);
  return out;
}
function assertionCheck(files, exceptions) {
  const oldCalls = new Map();
  for (const t of assertCalls(baseSf)) bump(oldCalls, t);
  const expected = new Map(oldCalls);
  for (const e of exceptions) {
    if (e.oldText) for (const t of assertCalls(parse('e-old.js', e.oldText))) bump(expected, t, -1);
    for (const t of assertCalls(parse('e-new.js', e.newText))) bump(expected, t, 1);
  }
  const newCalls = new Map();
  for (const rel of FILES) {
    if (!files[rel]) continue;
    for (const t of assertCalls(files[rel].sf)) bump(newCalls, t);
  }
  say(`assertion calls: old file ${total(oldCalls)}, expected after exceptions ${total(expected)}, seven new files ${total(newCalls)}`);
  const n = diffMaps(expected, newCalls, 'old', 'new');
  if (n) fail(`${n} assertion call text(s) differ`);
}

// ---- 5. statements ----------------------------------------------------------------------------
function statementCheck(files, exceptions) {
  const oldStatements = baseSf.statements;
  say(`statements: ${oldStatements.length} top-level statements in the old file`);
  if (oldStatements.length !== 178) fail(`the old file holds ${oldStatements.length} top-level statements, the plan expects 178`);
  const oldByLine = new Map();
  for (const s of oldStatements) oldByLine.set(lineOf(baseSf, s), s);
  const oldRequire = oldStatements.filter(isRequireLine);
  say(`require lines in the old file: ${oldRequire.length} at old lines ${oldRequire.map((s) => lineOf(baseSf, s)).join(', ')}`);
  if (oldRequire.length !== 12) fail(`the old file holds ${oldRequire.length} require lines, the plan expects 12`);
  // the WHERE table must name each of the 166 other lines once and no other line
  const whereSeen = new Map();
  const whereFile = new Map();
  for (const [rel, lines] of Object.entries(WHERE)) for (const l of lines) { bump(whereSeen, l); whereFile.set(l, rel); }
  const otherLines = [...oldByLine.keys()].filter((l) => !REQUIRE_LINES.includes(l));
  const bad = [...whereSeen.keys()].filter((l) => !otherLines.includes(l) || whereSeen.get(l) !== 1).concat(otherLines.filter((l) => !whereSeen.has(l)));
  if (otherLines.length !== 166 || bad.length) fail(`the WHERE table does not name the ${otherLines.length} other statements once each (${bad.join(', ')})`);
  if (REQUIRE_LINES.some((l) => !oldByLine.has(l) || !isRequireLine(oldByLine.get(l)))) fail('REQUIRE_LINES do not all start require lines of the old file');

  // exceptions: the text each old line is expected to have
  const expectedText = new Map();
  for (const l of otherLines) expectedText.set(l, oldByLine.get(l).getText(baseSf));
  const addedByException = [];
  for (const e of exceptions) {
    if (e.oldLine) expectedText.set(e.oldLine, e.newText);
    else addedByException.push(e);
  }

  // candidates
  const cands = [];
  for (const rel of FILES) {
    const f = files[rel];
    if (!f) continue;
    f.sf.statements.forEach((st, idx) => {
      cands.push({ rel, kind: 'top', idx, st, sf: f.sf, text: st.getText(f.sf) });
    });
  }
  const topBy = new Map();
  for (const c of cands) {
    if (!topBy.has(c.text)) topBy.set(c.text, []);
    topBy.get(c.text).push(c);
  }

  // require lines of the old file: at least one candidate each
  for (const s of oldRequire) {
    const t = s.getText(baseSf);
    const n = (topBy.get(t) || []).length;
    say(`  old require line ${lineOf(baseSf, s)} found ${n} time(s) in the seven files: ${short(t, 70)}`);
    if (n < 1) fail(`old require line ${lineOf(baseSf, s)} has no candidate`);
  }

  // the 166 others
  let exact = 0;
  for (const l of otherLines) {
    const want = whereFile.get(l);
    const t = expectedText.get(l);
    const hits = topBy.get(t) || [];
    const label = `old line ${l} (${short(t, 50)})`;
    if (hits.length === 0) { fail(`${label} has no candidate`); continue; }
    if (hits.length > 1) { fail(`${label} found ${hits.length} times: ${hits.map((h) => h.rel).join(', ')}`); continue; }
    const h = hits[0];
    if (h.rel !== want) { fail(`${label} expected in ${want}, found in the wrong file: ${h.rel}`); continue; }
    h.oldLine = l;
    exact++;
  }
  say(`statements found exactly once in the file the table names: ${exact} of ${otherLines.length}`);

  // order
  for (const rel of FILES) {
    let prev = 0;
    for (const c of cands) {
      if (c.rel !== rel || c.oldLine === undefined) continue;
      if (c.oldLine <= prev) fail(`${rel}: old line ${c.oldLine} comes after old line ${prev}`);
      prev = Math.max(prev, c.oldLine);
    }
  }

  // require lines per file
  const oldRequireText = new Map(oldRequire.map((s) => [lineOf(baseSf, s), s.getText(baseSf)]));
  for (const rel of FILES) {
    const f = files[rel];
    if (!f) continue;
    const allowed = REQUIRES[rel].map((l) => oldRequireText.get(l));
    let imports = 0;
    for (const st of f.sf.statements) {
      if (!isRequireLine(st)) continue;
      const t = st.getText(f.sf);
      if (allowed.includes(t)) continue;
      if (rel === HELPER && t === ROUTE_REQUIRE) continue;
      if (rel !== HELPER && isHarnessImport(st)) { imports++; continue; }
      fail(`${rel}: require line outside its REQUIRES row: ${short(t, 100)}`);
    }
    if (rel !== HELPER && imports !== 1) fail(`${rel}: ${imports} harness imports, expected exactly one`);
    if (rel === HELPER && f.sf.statements.some(isHarnessImport)) fail(`${rel}: the helper imports itself`);
  }

  // added text
  const oldTexts = new Set([...expectedText.values(), ...oldRequireText.values()]);
  for (const e of exceptions) if (e.oldText) oldTexts.add(e.oldText);
  const addedPrinted = [];
  const usedException = new Set();
  for (const rel of FILES) {
    const f = files[rel];
    if (!f) continue;
    const tops = cands.filter((c) => c.rel === rel && c.kind === 'top');
    for (const c of tops) {
      if (oldTexts.has(c.text)) continue;
      if (isRequireLine(c.st)) {
        addedPrinted.push(`${rel}: require line ${short(c.text, 120)}`);
        continue; // validated by the per-file require check above
      }
      if (rel === HELPER && isModuleExports(c.st)) {
        const names = c.st.expression.right.properties.map((p) => p.name.text);
        if (names.join(',') !== EXPORTS.join(',')) fail(`${rel}: module.exports differs from the plan's export list of ${EXPORTS.length}`);
        addedPrinted.push(`${rel}: module.exports with ${names.length} names`);
        continue;
      }
      const ex = addedByException.findIndex((e, i) => e.file === rel && e.newText === c.text && !usedException.has(i));
      if (ex >= 0) { usedException.add(ex); addedPrinted.push(`${rel}: exception statement ${short(c.text, 80)}`); continue; }
      fail(`${rel}: unexpected added statement: ${short(c.text, 160)}`);
    }
    // the cleanup hooks are the helper's own top-level statements (old lines 100 and 105, byte for
    // byte, found above), so a test file gets them by loading the helper: the harness import must
    // come before the file's first statement that is no require line, and nothing may name a
    // registerCleanup function any more (an exact absence check)
    if (rel !== HELPER) {
      const firstOther = f.sf.statements.findIndex((st) => !isRequireLine(st));
      const importAt = f.sf.statements.findIndex(isHarnessImport);
      if (importAt < 0 || firstOther < 0 || importAt > firstOther) fail(`${rel}: the harness import does not come before the first statement that is no require line`);
    }
    if (f.text.includes('registerCleanup')) fail(`${rel}: the text registerCleanup is still present`);
  }
  addedByException.forEach((e, i) => { if (!usedException.has(i)) fail(`exception statement not found in ${e.file}: ${short(e.newText, 80)}`); });
  say(`added statements (${addedPrinted.length}):`);
  for (const a of addedPrinted) say('  added: ' + a);
}
function isModuleExports(st) {
  return ts.isExpressionStatement(st) && ts.isBinaryExpression(st.expression) && st.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
    && ts.isPropertyAccessExpression(st.expression.left) && st.expression.left.getText() === 'module.exports'
    && ts.isObjectLiteralExpression(st.expression.right) && st.expression.right.properties.every((p) => ts.isShorthandPropertyAssignment(p));
}

// ---- 6. comments ------------------------------------------------------------------------------
function commentTexts(text, sf, isHelper) {
  const out = [];
  const grab = (node) => {
    for (const r of ts.getLeadingCommentRanges(text, node.getFullStart()) || []) out.push(text.slice(r.pos, r.end));
  };
  for (const st of sf.statements) {
    grab(st);
  }
  grab(sf.endOfFileToken);
  return out;
}
function commentCheck(files) {
  const oldC = new Map();
  for (const t of commentTexts(baseText, baseSf, false)) bump(oldC, t);
  const expected = new Map(oldC);
  for (const a of ADDED_COMMENTS) bump(expected, a.text);
  const newC = new Map();
  const perFile = {};
  for (const rel of FILES) {
    if (!files[rel]) continue;
    perFile[rel] = commentTexts(files[rel].text, files[rel].sf, rel === HELPER);
    for (const t of perFile[rel]) bump(newC, t);
  }
  say(`comments: old file ${total(oldC)}, allowed added ${ADDED_COMMENTS.length}, expected ${total(expected)}, seven new files ${total(newC)}`);
  let n = 0;
  const keys = new Set([...expected.keys(), ...newC.keys()]);
  for (const k of keys) {
    const x = oldC.get(k) || 0;
    const add = ADDED_COMMENTS.filter((a) => a.text === k).length;
    const y = newC.get(k) || 0;
    if (x + add !== y) { n++; say(`  differs: ${short(k, 160)} — old ${x}, allowed added ${add}, new ${y}`); }
  }
  if (n) fail(`${n} comment text(s) have a wrong count`);
  for (const a of ADDED_COMMENTS) {
    if (!perFile[a.file] || !perFile[a.file].includes(a.text)) fail(`allowed added comment not found in ${a.file}: ${short(a.text, 100)}`);
  }
  say(`added comments listed: ${ADDED_COMMENTS.length} (${HEADER_FIRST.length} in tests/hotfix-check.test.js, area and closing lines in five files, one block in the helper)`);
}

main().catch((e) => { say('proof crashed: ' + (e && e.stack || e)); process.exit(3); });
```

#### prove-each-file-cleans-up.js

```js
'use strict';
// prove-each-file-cleans-up.js — criterion 6 of the plan
// the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md:
// every new hotfix-check test file keeps (a) the after-each check that no `ctoc-hotfix-` folder
// remains in its private temporary folder and (b) the end-of-file removal of every scratch folder.
//
//   node prove-each-file-cleans-up.js <repository root>
//   node prove-each-file-cleans-up.js <repository root> --planted-only <copy of one of the six files>
//
// Standard library only. Children are started with an argument list and no shell;
// NODE_TEST_CONTEXT is deleted from every child's environment. Directory links are made only
// inside a new folder under SCRATCH, and nothing is deleted there.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SCRATCH = __dirname;
const argv = process.argv.slice(2);
if (argv.length < 1) { console.error('usage: node prove-each-file-cleans-up.js <repository root> [--planted-only <file>]'); process.exit(2); }
const root = path.resolve(argv[0]);
let plantedOnly = null;
let helperCopy = null; // --helper <file>: a copy of the helper used in place of the repository's (the leftover mutant)
for (let i = 1; i < argv.length; i++) {
  if (argv[i] === '--planted-only' && argv[i + 1]) plantedOnly = path.resolve(argv[++i]);
  else if (argv[i] === '--helper' && argv[i + 1]) helperCopy = path.resolve(argv[++i]);
  else { console.error('unknown argument: ' + argv[i]); process.exit(2); }
}
if (helperCopy && !plantedOnly) { console.error('--helper needs --planted-only'); process.exit(2); }

const scrubs = [[fs.realpathSync(SCRATCH), 'SCRATCH'], [SCRATCH, 'SCRATCH'], [fs.realpathSync(root), '<repository root>'], [root, '<repository root>']];
const scrub = (s) => scrubs.reduce((r, [from, to]) => r.split(from).join(to), String(s));
const say = (...a) => console.log(scrub(a.join(' ')));
let failures = 0;
const fail = (m) => { failures++; say('FAIL: ' + m); };

const HELPER = 'tests/helpers/hotfix-check-harness.js';
const SIX = ['tests/hotfix-check.test.js', 'tests/hotfix-check-test-run.test.js', 'tests/hotfix-check-copy-and-log.test.js',
  'tests/hotfix-check-review-findings.test.js', 'tests/hotfix-check-readers.test.js', 'tests/hotfix-check-guards.test.js'];
const labelOf = (rel) => path.basename(rel).replace(/\.test\.js$/, '');
const PLANTED_NAME = 'planted: a ctoc-hotfix- folder is left in the private temporary folder';
const PATTERN = `^${PLANTED_NAME}$`;
const SENTENCE = 'no temporary copy of the check remains';
const PLANTED_TEST = `
test('${PLANTED_NAME}', () => {
  require('fs').mkdirSync(require('path').join(require('./helpers/hotfix-check-harness').PRIVATE_TMP, 'ctoc-hotfix-planted'));
});
`;
const REPORTING_PRELUDE = `
const reportFs = require('fs');
const reportPath = require('path');
const reportMade = [];
const reportMkdtemp = reportFs.mkdtempSync;
reportFs.mkdtempSync = function recordingMkdtemp(prefix, ...rest) {
  const made = reportMkdtemp.call(reportFs, prefix, ...rest);
  if (reportPath.basename(prefix).startsWith('hotfix-')) reportMade.push(reportFs.realpathSync.native(made));
  return made;
};
process.on('exit', () => reportFs.writeFileSync(process.env.CTOC_CLEANUP_REPORT, JSON.stringify(reportMade)));
`;

const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;

function run(file, { pattern = false, extraEnv = {} } = {}) {
  return new Promise((resolve) => {
    const a = ['--test', '--test-reporter=tap'];
    if (pattern) a.push(`--test-name-pattern=${PATTERN}`);
    a.push(file);
    const child = spawn(process.execPath, a, { cwd: root, env: { ...childEnv, ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let killed = false;
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, 900 * 1000);
    child.on('close', (status) => { clearTimeout(timer); resolve({ status: killed ? 'killed after 900 s' : status, out }); });
  });
}

const notOkLines = (out) => out.split('\n').filter((l) => /^\s*not ok \d+ - /.test(l));

async function main() {
  // 1. nothing missing
  const missing = [...SIX, HELPER].filter((rel) => !fs.existsSync(path.join(root, rel)));
  if (missing.length) {
    for (const m of missing) say('missing: ' + m);
    say(`FAILED: ${missing.length} file(s) missing`);
    process.exit(1);
  }
  if (plantedOnly && !fs.existsSync(plantedOnly)) { say('missing: ' + plantedOnly); process.exit(1); }

  // 2. a new folder with links
  const work = fs.mkdtempSync(path.join(SCRATCH, 'cleanup-proof-'));
  fs.mkdirSync(path.join(work, 'tests'));
  const kind = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(path.join(root, 'src'), path.join(work, 'src'), kind);
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(work, 'node_modules'), kind);
  if (helperCopy) {
    if (!fs.existsSync(helperCopy)) { say('missing: ' + helperCopy); process.exit(1); }
    fs.mkdirSync(path.join(work, 'tests', 'helpers'));
    fs.writeFileSync(path.join(work, 'tests', 'helpers', 'hotfix-check-harness.js'), fs.readFileSync(helperCopy, 'utf8'));
  } else {
    fs.symlinkSync(path.join(root, 'tests', 'helpers'), path.join(work, 'tests', 'helpers'), kind);
  }
  say(`work folder: ${work}${plantedOnly ? ' (planted-only mode)' : ''}`);

  // 3. the copies
  const plantedPath = (label) => path.join(work, 'tests', `${label}.planted.test.js`);
  const reportingPath = (label) => path.join(work, 'tests', `${label}.reporting.test.js`);
  const sources = plantedOnly ? [plantedOnly] : SIX.map((rel) => path.join(root, rel));
  const labels = [];
  for (const src of sources) {
    const label = labelOf(src);
    labels.push(label);
    const text = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(plantedPath(label), text + PLANTED_TEST);
    if (!plantedOnly) {
      const nl = text.indexOf('\n');
      if (text.slice(0, nl) !== "'use strict';") { fail(`${label}: the first line is not 'use strict';`); continue; }
      fs.writeFileSync(reportingPath(label), text.slice(0, nl + 1) + REPORTING_PRELUDE + text.slice(nl + 1));
    }
  }

  // 4. the probe: the planted copy of tests/hotfix-check.test.js with the name pattern
  const before = new Set(fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('hotfix-private-tmp-')));
  const probeLabel = 'hotfix-check';
  const probeCopy = plantedOnly ? (() => {
    const p = path.join(work, 'tests', 'probe.planted.test.js');
    fs.writeFileSync(p, fs.readFileSync(path.join(root, SIX[0]), 'utf8') + PLANTED_TEST);
    return p;
  })() : plantedPath(probeLabel);
  const probe = await run(probeCopy, { pattern: true });
  const probeMatched = probe.status !== 0 && probe.out.includes(SENTENCE)
    && notOkLines(probe.out).some((l) => l.includes(PLANTED_NAME));
  const matchedLine = notOkLines(probe.out).find((l) => l.includes(PLANTED_NAME)) || '(none)';
  say(`probe: planted copy of tests/hotfix-check.test.js with --test-name-pattern: exit ${probe.status}; sentence in output: ${probe.out.includes(SENTENCE)}; matched line: ${matchedLine.trim()}`);
  const usePattern = probeMatched;
  if (usePattern) say('pattern used: yes — the after-each hook ran for the matched test; every planted copy runs with the pattern');
  else say('fallback: the name pattern skipped the after-each hook; planted copies ran in full');

  // 5. the other copies, at once
  const jobs = [];
  const planted = {};
  const reporting = {};
  for (const label of labels) {
    // the probe is the hotfix-check planted run when the pattern works; otherwise every planted copy runs in full
    if (!plantedOnly && label === probeLabel && usePattern) planted[label] = probe;
    else jobs.push(run(plantedPath(label), { pattern: usePattern }).then((r) => { planted[label] = r; }));
    if (!plantedOnly) {
      const report = path.join(work, `${label}.made.json`);
      jobs.push(run(reportingPath(label), { extraEnv: { CTOC_CLEANUP_REPORT: report } }).then((r) => { reporting[label] = { ...r, report }; }));
    }
  }
  await Promise.all(jobs);

  // 6. the requirements
  for (const label of labels) {
    const p = planted[label];
    const nok = notOkLines(p.out);
    const named = nok.every((l) => l.includes(PLANTED_NAME));
    say(`${label}: planted copy exit ${p.status}; sentence ${p.out.includes(SENTENCE)}; not ok lines ${nok.length}; matched line: ${(nok.find((l) => l.includes(PLANTED_NAME)) || '(none)').trim()}`);
    if (p.status === 0) fail(`${label}: the planted copy exited 0 — the after-each check did not fail`);
    if (!p.out.includes(SENTENCE)) fail(`${label}: the planted copy's output lacks "${SENTENCE}"`);
    if (!/^not ok \d+ - /m.test(p.out)) fail(`${label}: no not ok at depth 0`);
    if (!named) fail(`${label}: a not ok result does not name the planted test`);
    if (!plantedOnly) {
      const r = reporting[label];
      if (!r) { fail(`${label}: no reporting run`); continue; }
      let made = null;
      try { made = JSON.parse(fs.readFileSync(r.report, 'utf8')); } catch { made = null; }
      if (r.status !== 0) fail(`${label}: reporting copy exit ${r.status}`);
      if (!Array.isArray(made)) { fail(`${label}: the report file does not exist or is not JSON`); continue; }
      const priv = made.filter((x) => path.basename(x).startsWith('hotfix-private-tmp-'));
      const still = made.filter((x) => fs.existsSync(x));
      say(`${label}: reporting copy exit ${r.status}; recorded folders ${made.length} (private ${priv.length}); still present ${still.length}`);
      if (priv.length !== 1) fail(`${label}: ${priv.length} private folders recorded, expected exactly one`);
      if (made.length < 2) fail(`${label}: fewer than two folders recorded`);
      if (still.length !== 0) fail(`${label}: ${still.length} recorded folder(s) still exist: ${still.map((x) => path.basename(x)).join(', ')}`);
    }
  }

  // 7. what a copy without the cleanup leaves behind (planted-only mode names it and removes it)
  if (plantedOnly) {
    const left = fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('hotfix-private-tmp-') && !before.has(n));
    say(`private folders left in the system temporary folder by this run: ${left.length}${left.length ? ' — ' + left.join(', ') : ''}`);
    for (const n of left) fs.rmSync(path.join(os.tmpdir(), n), { recursive: true, force: true });
  }
  say(failures === 0 ? 'PASS' : `FAILED: ${failures} problem(s)`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { say('crashed: ' + (e && e.stack || e)); process.exit(3); });
```

#### per-file-reporter.cjs

```js
'use strict';
// One line per test file summary and one per top-level test, from the runner's own events.
module.exports = async function * perFile(source) {
  for await (const { type, data } of source) {
    if (type === 'test:summary' && data.file) yield `file\t${data.file}\t${data.duration_ms}\n`;
    else if ((type === 'test:pass' || type === 'test:fail') && data.nesting === 0 && data.file) {
      yield `test\t${data.file}\t${data.details.duration_ms}\t${type === 'test:pass' ? 'pass' : 'fail'}\t${data.name}\n`;
    }
  }
};
```

#### make-mutants.js

```js
'use strict';
// make-mutants.js — the four wrong splits of the plan, each the real split with one edit.
//   node make-mutants.js <repository root> <base commit>
// Writes only under SCRATCH/mutants/. Standard library and the repository's TypeScript.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRATCH = __dirname;
const root = path.resolve(process.argv[2]);
const commit = process.argv[3];
const ts = require(require.resolve('typescript', { paths: [root] }));
const SEVEN = ['tests/hotfix-check.test.js', 'tests/hotfix-check-test-run.test.js', 'tests/hotfix-check-copy-and-log.test.js',
  'tests/hotfix-check-review-findings.test.js', 'tests/hotfix-check-readers.test.js', 'tests/hotfix-check-guards.test.js',
  'tests/helpers/hotfix-check-harness.js'];
const base = spawnSync('git', ['show', `${commit}:tests/hotfix-check.test.js`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 27 }).stdout;
const baseLines = base.split('\n');

function copyAll(name) {
  const dir = path.join(SCRATCH, 'mutants', name);
  fs.mkdirSync(path.join(dir, 'tests', 'helpers'), { recursive: true });
  for (const rel of SEVEN) fs.writeFileSync(path.join(dir, ...rel.split('/')), fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8'));
  return dir;
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, ...rel.split('/')), 'utf8');
const write = (dir, rel, t) => fs.writeFileSync(path.join(dir, ...rel.split('/')), t);
const find = (text, firstArgStart) => {
  const sf = ts.createSourceFile('x.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const st = sf.statements.find((s) => ts.isExpressionStatement(s) && s.getText(sf).startsWith(`test('${firstArgStart}`));
  if (!st) throw new Error('test not found: ' + firstArgStart);
  return { st, sf };
};

// 1. assert-deleted: the line of old line 3000, inside the test of old line 2988, in the guards file
{
  const dir = copyAll('assert-deleted');
  const rel = 'tests/hotfix-check-guards.test.js';
  const t = read(dir, rel);
  const wanted = baseLines[3000 - 1];
  const { st } = find(t, 'after the re-check: a test run passes only when');
  const at = t.indexOf(wanted + '\n', st.getStart());
  if (at < 0 || at > st.getEnd()) throw new Error('old line 3000 not found inside the moved test: ' + wanted);
  write(dir, rel, t.slice(0, at) + t.slice(at + wanted.length + 1));
  console.log(`assert-deleted: deleted ${JSON.stringify(wanted.trim())} from ${rel}`);
}
// 2. test-duplicated: the test of old line 1203 is appended to the guards file
{
  const dir = copyAll('test-duplicated');
  const readers = read(dir, 'tests/hotfix-check-readers.test.js');
  const { st, sf } = find(readers, 'a file that is not valid UTF-8 is not text');
  const rel = 'tests/hotfix-check-guards.test.js';
  write(dir, rel, read(dir, rel).replace(/\n$/, '') + '\n\n' + st.getText(sf) + '\n');
  console.log(`test-duplicated: appended the test of old line 1203 to ${rel}`);
}
// 3. name-changed: "an unknown" becomes "an Unknown" in the name of old line 607's test
{
  const dir = copyAll('name-changed');
  const rel = 'tests/hotfix-check.test.js';
  const t = read(dir, rel);
  const { st } = find(t, 'case 27: an unknown sub-command');
  const at = t.indexOf('an unknown', st.getStart());
  if (at < 0 || at > st.getStart() + 40) throw new Error('name not found');
  write(dir, rel, t.slice(0, at) + 'an Unknown' + t.slice(at + 'an unknown'.length));
  console.log(`name-changed: "an unknown" -> "an Unknown" in the name of old line 607's test, ${rel}`);
}
// 4. no-cleanup: the helper without its two cleanup hooks (old lines 100-107, now top-level
//    statements of the helper), so a test file that loads it registers nothing
{
  const dir = path.join(SCRATCH, 'mutants', 'no-cleanup');
  fs.mkdirSync(dir, { recursive: true });
  const t = fs.readFileSync(path.join(root, 'tests', 'helpers', 'hotfix-check-harness.js'), 'utf8');
  const from = t.indexOf('test.after(() => {');
  const endMark = "  assert.deepEqual(leftovers(), [], 'no temporary copy of the check remains');\n});\n";
  const to = t.indexOf(endMark) + endMark.length;
  if (from < 0 || to < endMark.length) throw new Error('the cleanup hooks were not found in the helper');
  fs.writeFileSync(path.join(dir, 'hotfix-check-harness.js'), t.slice(0, from) + t.slice(to));
  console.log('no-cleanup: removed test.after(...) and test.afterEach(...) (old lines 100-107) from tests/helpers/hotfix-check-harness.js');
}
```

#### timed-run.js

```js
'use strict';
// timed-run.js — one timed `node --test` run with the plan's two reporters, under /usr/bin/time -p.
//   node timed-run.js <label> <file|@suite> [<file> ...]
// Writes SCRATCH/<label>.spec, <label>.per-file, <label>.time (from /usr/bin/time -p) and
// <label>.meta (JSON: command, load before and after, cores, node, commit, exit status).
// Started from the repository root. Argument lists, no shell. Standard library only.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const SCRATCH = __dirname;
const [label, ...targets] = process.argv.slice(2);
if (!label || targets.length === 0) { console.error('usage: node timed-run.js <label> <file|@suite> ...'); process.exit(2); }
const root = process.cwd();
const files = [];
for (const t of targets) {
  if (t === '@suite') {
    for (const n of fs.readdirSync(path.join(root, 'tests')).filter((x) => x.endsWith('.test.js')).sort()) files.push(path.join('tests', n));
  } else files.push(t);
}
const out = (ext) => path.join(SCRATCH, `${label}.${ext}`);
const args = ['-p', process.execPath, '--test',
  '--test-reporter=spec', `--test-reporter-destination=${out('spec')}`,
  `--test-reporter=${path.join(SCRATCH, 'per-file-reporter.cjs')}`, `--test-reporter-destination=${out('per-file')}`,
  ...files];
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;
const load0 = os.loadavg()[0];
const timeFd = fs.openSync(out('time'), 'w');
const child = spawn('/usr/bin/time', args, { cwd: root, env: childEnv, stdio: ['ignore', 'ignore', timeFd] });
child.on('close', (status) => {
  fs.closeSync(timeFd);
  const load1 = os.loadavg()[0];
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
  const meta = {
    label,
    command: `/usr/bin/time -p node --test --test-reporter=spec --test-reporter-destination=SCRATCH/${label}.spec --test-reporter=SCRATCH/per-file-reporter.cjs --test-reporter-destination=SCRATCH/${label}.per-file ${targets.map((t) => (t === '@suite' ? `tests/*.test.js (${files.length} files)` : t.split(SCRATCH).join('SCRATCH'))).join(' ')}`,
    loadAtStart: Number(load0.toFixed(1)),
    loadAtEnd: Number(load1.toFixed(1)),
    cores: os.availableParallelism(),
    node: process.version,
    commit: head,
    exitStatus: status
  };
  fs.writeFileSync(out('meta'), JSON.stringify(meta, null, 2) + '\n');
  console.log(JSON.stringify(meta));
  process.exit(0);
});
```

#### alone-runs.js

```js
'use strict';
// alone-runs.js — criterion 7: each of the six files alone three times in a row (the six sequences at
// the same time), then the six together in one call.
//   node alone-runs.js alone      -> SCRATCH/alone-<k>/<label>.tap, .time, .meta
//   node alone-runs.js together   -> SCRATCH/together.out, together.time, together.meta
// Started from the repository root. Argument lists, no shell. Standard library only.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SCRATCH = __dirname;
const root = process.cwd();
const FILES = ['tests/hotfix-check.test.js', 'tests/hotfix-check-test-run.test.js', 'tests/hotfix-check-copy-and-log.test.js',
  'tests/hotfix-check-review-findings.test.js', 'tests/hotfix-check-readers.test.js', 'tests/hotfix-check-guards.test.js'];
const labelOf = (rel) => path.basename(rel).replace(/\.test\.js$/, '');
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;
const load = () => Number(os.loadavg()[0].toFixed(1));

function timed(args, stdoutPath, timePath, metaPath, command) {
  return new Promise((resolve) => {
    const load0 = load();
    const t0 = Date.now();
    const outFd = stdoutPath ? fs.openSync(stdoutPath, 'w') : 'ignore';
    const timeFd = fs.openSync(timePath, 'w');
    const child = spawn('/usr/bin/time', ['-p', process.execPath, ...args], { cwd: root, env: childEnv, stdio: ['ignore', outFd, timeFd] });
    child.on('close', (status) => {
      if (stdoutPath) fs.closeSync(outFd);
      fs.closeSync(timeFd);
      const meta = { command, loadAtStart: load0, loadAtEnd: load(), wallMsMeasuredHere: Date.now() - t0, cores: os.availableParallelism(), node: process.version, exitStatus: status };
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
      resolve(meta);
    });
  });
}

async function alone() {
  const results = [];
  await Promise.all(FILES.map(async (rel) => {
    const label = labelOf(rel);
    for (let k = 1; k <= 3; k++) {
      const dir = path.join(SCRATCH, `alone-${k}`);
      fs.mkdirSync(dir, { recursive: true });
      const tap = path.join(dir, `${label}.tap`);
      const meta = await timed(['--test', '--test-reporter=tap', `--test-reporter-destination=${tap}`, rel],
        null, path.join(dir, `${label}.time`), path.join(dir, `${label}.meta`),
        `/usr/bin/time -p node --test --test-reporter=tap --test-reporter-destination=SCRATCH/alone-${k}/${label}.tap ${rel}`);
      results.push({ k, label, ...meta });
    }
  }));
  results.sort((a, b) => a.k - b.k || a.label.localeCompare(b.label));
  for (const r of results) console.log(`alone-${r.k} ${r.label}: exit ${r.exitStatus}, load ${r.loadAtStart} to ${r.loadAtEnd}`);
}

async function together() {
  const meta = await timed(['--test', ...FILES], path.join(SCRATCH, 'together.out'), path.join(SCRATCH, 'together.time'), path.join(SCRATCH, 'together.meta'),
    `/usr/bin/time -p node --test ${FILES.join(' ')}`);
  console.log(`together: exit ${meta.exitStatus}, load ${meta.loadAtStart} to ${meta.loadAtEnd}`);
}

const mode = process.argv[2];
(mode === 'alone' ? alone() : mode === 'together' ? together() : Promise.reject(new Error('mode: alone | together')))
  .catch((e) => { console.error(e); process.exit(2); });
```
