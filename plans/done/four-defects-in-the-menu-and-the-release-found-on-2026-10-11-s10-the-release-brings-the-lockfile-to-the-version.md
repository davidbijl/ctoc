---
title: "The release script brings package-lock.json to VERSION"
type: implementation
created: 2026-10-11
priority: high
effort: small
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s9-only-the-owner-answers-an-inbox-question
files:
  - src/scripts/release.js
  - tests/release-metadata-sync.test.js
revision: 3
rejection_reason: "The mode-copy catch swallows every error under the old baseline key; ignore only ENOENT, test first,"
tag: rejected
approved_by: human
approved_at: 2026-10-18T12:21:59.355Z
gate_crossed: review → done
---
# REVISION 3

## Rejection Feedback

The mode-copy catch swallows every error under the old baseline key; ignore only ENOENT, test first, show the removal failure, lower the baseline to 206.

---

# REVISION 2

## Rejection Feedback

Its gate run failed only because another red test set was in place; re-run the gate on the same fix.

---

# REVISION 1

## Rejection Feedback

The fix round left an empty catch in removeTmp, which the false-green fence counts (208 against a baseline of 207); fix it test first.

---


# The release script brings package-lock.json to VERSION

Slice 10 of 14 of `plans/functional/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`:
the parent's slice 4 — scenarios "the lockfile follows VERSION", "a lockfile that cannot be parsed fails
the release", "no lockfile is skipped"; decision 7.

## Problem Statement

`JSON_VERSION_FILES` (`src/scripts/release.js` lines 37-57) lists `.claude-plugin/marketplace.json`,
`.claude-plugin/plugin.json` and `package.json` only, so `package-lock.json` still says 6.14.123 in its
top-level `version` (line 3) and `packages[""].version` (line 9) while `VERSION` is 6.14.125. The script
already writes each listed file as two-space JSON with a trailing newline (`updateJsonVersionFiles`, line
209), skips an absent target (lines 160-163) and fails one that exists but cannot be parsed (lines
167-173) or lacks an expected path (lines 183-205).

## Technical approach

`src/scripts/release.js`:
- Append to `JSON_VERSION_FILES`:
  ```js
  {
    // npm's lockfile records the package version twice: at its top and on the root package ("").
    file: 'package-lock.json',
    updates: [
      { path: ['version'] },
      { path: ['packages', '', 'version'] }
    ]
  }
  ```
- The header list (lines 7-11) gains "- package-lock.json (top-level version and packages[""].version)".
No other change: the existing walk resolves `json.packages['']` and writes through `atomicWriteFileSync`.
A missing `packages` object prints `missing expected path` (line 185); a missing `packages[""]` object fails
silently per file (lines 191-193 set `pathMissing` without a line), and the file is named by the summary
line `Release failed: could not sync 1 file(s): package-lock.json` (line 392).

## Implementation Details

### Dependency Graph

```
node src/scripts/release.js → main → updateJsonVersionFiles → JSON_VERSION_FILES (+ package-lock.json)
tests/release-metadata-sync.test.js → release.js (in-process and as a child process with CTOC_RELEASE_ROOT)
```

### File Specifications

- `src/scripts/release.js` — MODIFY: one list entry, one header line.
- `tests/release-metadata-sync.test.js` — MODIFY: `makeFixture` gains `packageLock` (object written with
  two-space indentation and one trailing newline, or a raw string), and the cases below.

### Test Plan — added to `tests/release-metadata-sync.test.js` (written first)

A realistic lockfile fixture: `{ name: 'ctoc', version: '6.14.123', lockfileVersion: 3, requires: true,
packages: { '': { name: 'ctoc', version: '6.14.123', license: 'PolyForm-Shield-1.0.0', devDependencies: { eslint:
'^9.0.0' } }, 'node_modules/eslint': { version: '9.1.0', dev: true } } }`.

8. **the lockfile follows VERSION**: `VERSION` 6.14.125, the fixture at 6.14.123; run `node
   src/scripts/release.js` as a child process with `CTOC_RELEASE_ROOT` → exit 0; both fields read
   6.14.125; the file's new text equals the old text with exactly those two `"version": "6.14.123"`
   occurrences (top level and the `""` package) changed, `node_modules/eslint` still 9.1.0, two-space
   indentation, and exactly one trailing newline.
9. **a lockfile that cannot be parsed fails the release**: `package-lock.json` is `{ not json` → exit
   non-zero, stderr names `package-lock.json`, the file byte-identical.
10. **a lockfile with no `packages[""]` fails the release**: `{ "version": "6.14.123", "packages": {} }`
    → exit non-zero, stderr matches `/Release failed: could not sync 1 file\(s\): package-lock\.json/`,
    the file byte-identical.
10b. **a `packages[""]` object without a `version` key gets one** (pins decision 1): `{ "version":
    "6.14.123", "packages": { "": { "name": "ctoc" } } }` → exit 0, `packages[""].version === "6.14.125"`,
    two-space indentation, exactly one trailing newline.
11. **no lockfile is skipped**: no `package-lock.json`; the fixture also holds `package.json` and
    `.claude-plugin/plugin.json` at 6.14.123 → stdout holds `Skip: package-lock.json (not found)`, exit 0,
    and both read 6.14.125 afterwards.
12. **the target list names the lockfile**: `JSON_VERSION_FILES` holds `package-lock.json` with exactly
    the two paths above (the style of the existing package.json check, lines 91-104).

Cases 8-12 and 10b fail on today's code (8 and 10b: the versions stay; 9-10: exit 0; 11: no skip line;
12: no entry).
The real repository's `package-lock.json` is not touched by this slice (parent, "After the build": the
normal release run brings it to `VERSION`).

### Security Review

- [x] Same writer, same atomic temp-and-rename, same fail-loud rule as the three existing targets.
- [x] Runs only on the release root; no new input.

### Wiring — the live call sites

`JSON_VERSION_FILES` is read by `updateJsonVersionFiles`, called by `main()`, the script's entry point,
which the release recipe runs (`node src/scripts/release.js`, CLAUDE.md "Release").

## Acceptance Criteria

- [x] The three parent scenarios pass as cases 8-11 (and 10b, decision 1) through the real script in a
  temporary project.
- [x] `npm test` passes, including `tests/release.test.js` and `tests/release-script-coverage.test.js`
  unchanged (their fixtures hold no lockfile, so it is skipped), and
  `tests/remainder-hooks-commands-coverage.test.js` unchanged (lines 238-275: its `releaseFixture` builds
  one file per `JSON_VERSION_FILES` entry, so it now also writes and expects `package-lock.json`).

## Decisions Taken Under Ambiguity

1. **"No `packages[""].version` place" means no `packages[""]` object**; a `packages[""]` object without a
   `version` key gets one, exactly as the other targets get a missing last key (parent decision 7: "like a
   `marketplace.json` that lacks an expected path"). A lockfile always has the root package object.
   Case 10b pins this.
2. **No new test file**: the existing release-sync test file holds the same fixtures and helpers.

3. **A failed release is not all-or-nothing.** Targets are written one by one; when a later one fails, the
   earlier ones are already written. A rerun after the fix recovers (an already-synced file is unchanged).
   Making the release all-or-nothing changes the rule for every target; that is the owner's call.
4. **A lockfile in another layout** (CRLF line ends, tabs, duplicate keys) is rewritten in two-space LF form
   with the same values. Not needed for this repository, whose lockfile is npm's own two-space form.
5. **A temp-file pattern in `.gitignore`** is outside this slice's files (`.gitignore` is not declared);
   listed for the owner: a crash between the temp write and the rename leaves a `*.tmp-*` file.
6. **Listed for the owner, outside this slice:** nothing yet compares the repository's own lockfile with
   `VERSION` (a check would catch a lockfile that drifts again), and `src/lib/version.js` has a second sync
   path that writes neither `package.json` nor the lockfile.
7. **Array rule for the walk:** a name step needs a real object, an index step needs a real array
   (marketplace `plugins[0]` is legitimate); anything else, at any step and in the last container, is the
   named `missing expected path` failure. The empty key prints as `""`.
8. **Baseline lowered to the live count (205), not the request's 206.** Grant `1792226142264-gwoion` asks for
   "207 to 206"; the file already said 206, so the purpose (baseline equals live count, no unused slot) is met
   by 205 and the removal of the `release.js` `atomicWriteFileSync` key.

9. **Case 25 asserts the mode, exactly, instead of being renamed.** A fresh target must get the mode a plain
   create gives in the same directory: the case creates a reference file there and compares `mode & 0o777`.
   This needs no `process.umask()` (its no-argument form is deprecated) and holds on every platform, so no
   platform branch and no skipped assertion is needed.
10. **The Step 14 box is ticked before the completion's gate run, on the CTO Chief's ruling of 2026-10-18.** The
   validator refuses verify evidence older than the plan's last change, so the completion's verify record is
   the proof, and a failing run blocks the finish.

## Execution Plan

### Step 8: TEST
- [x] Write cases 8-12 and 10b in `tests/release-metadata-sync.test.js`; run it and record that they fail on today's code.

### Step 9: PREPARE
- [x] Re-read `updateJsonVersionFiles` and the real `package-lock.json`'s first ten lines to confirm the two places.

### Step 10: IMPLEMENT
- [x] `src/scripts/release.js`: the list entry and the header line.

### Step 11: REVIEW
- [x] The critic confirms the walk handles the `''` key and that only the two version values change.

### Step 12: OPTIMIZE
- [x] No special case: the lockfile is one more list entry.

### Step 13: SECURE
- [x] The security scanner confirms the release writes nothing outside its root and leaves an unparsable file untouched.

### Step 14: VERIFY
- [x] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky. (verified by the gate run in the completion; affected tests, lint and type check run here, see the Execution Record)

### Step 15: DOCUMENT
- [x] The script's header lists the lockfile.

### Step 16: FINAL-REVIEW
- [x] Every acceptance box is checked against its evidence.

## Execution Record

### Step 8 — red on today's code
Cases 8, 9, 10, 10b, 11 and 12 were added to `tests/release-metadata-sync.test.js` (`makeFixture` gained `packageLock`). Run before the change, all six failed: 8 and 10b (versions stayed 6.14.123 / undefined), 9 and 10 (exit 0, expected non-zero), 11 (no skip line), 12 (no list entry). The 8 existing cases stayed green.

### Step 10 and 15 — green
`src/scripts/release.js`: one `JSON_VERSION_FILES` entry for `package-lock.json` (`version`, `packages[""].version`) and one header line. After the change all 14 cases in the file pass.

### Step 14 — affected checks
Test files requiring `release.js` (found with one grep over tests/): release-metadata-sync, release-script-coverage, release, remainder-hooks-commands-coverage, version, update, bash-gate-plan-coverage, doc-counts-generated. Together: 192 tests, 192 pass, 0 fail, 0 skipped. `npm run lint` (eslint, max-warnings 0): clean. `tsc --noEmit`: clean. The repository's own VERSION, package.json and package-lock.json were not touched.

### Fix round after the Step 11 and Step 13 reviews
Tests first (cases 13-22 added, test 9 tightened to status 1 plus the two named lines). Red on the unfixed code: 13, 14, 15 (array and null containers reported "Updated" or no path line), 17 (folder: stack trace), 18 (link replaced by a file), 19 (named pipe: child timed out after 10 s), 20 (mode 0644, expected 0444), 21 (no EEXIST), 22 (huge VERSION exit 0). Test 9 already passed on the old code (status 1 and both lines were already printed); 16 (marketplace `plugins[0]` still syncs) passed as the regression guard. Fix in `src/scripts/release.js`: lstat plus read inside one try ("ERROR: <file> could not be read: <message>"); the walk checks every container (object for a name, array for an index) and prints the path with `""` for the empty key; `atomicWriteFileSync` creates the temp file with `wx`, leaves a name it did not create alone, copies the original's mode; `getVersion` requires safe integers. Green: the file 24/24. Step 14 again: the 8 test files that require release.js (found with one grep): 202 tests, 202 pass, 0 fail, 0 skipped. `npm run lint`: clean. `tsc --noEmit`: clean. Cases 18, 19, 20 and 21 are registered only on POSIX (platform check around the test, no early return). Repository VERSION, package.json and package-lock.json untouched.

### Refused commands in the fix round
The write protection refused three Bash calls with: "PreToolUse:Bash hook error: CTOC refused this call because a background agent may not answer CTOC's questions, approve a plan or move one on through the menu; report your result and let the main session do it." They were: (1) `cat src/lib/safe-fs.js | head -80; grep -l "release" tests/*.test.js | xargs grep -l "scripts/release"`; (2) `grep -n "^function \|^  [a-zA-Z]*Sync,\|^module" <repo>/src/lib/safe-fs.js`; (3) a heredoc append of the new cases to the test file followed by `node --test ... > file; grep ...`. Each was redone as a plain single command or with the Edit tool; no workaround of the refusal.

### Refused command
The write protection refused one Bash call (a python heredoc that edited the test file, followed by a `node --test` pipe): "PreToolUse:Bash hook error: CTOC refused this call because a background agent may not answer CTOC's questions, approve a plan or move one on through the menu; report your result and let the main session do it." The edit was redone with the Edit tool and the test run as a single plain command.

### CTO Chief verification before the completion
- Step 11: the critic passed the build (both version fields written, nothing else changes, every case fails if reverted, no test touches the repository's own version files); its two low items were fixed in the one fix round.
- Step 13: the security scanner gave warn with nothing high or medium (on a copy of the real lockfile only the two version lines changed, every integrity hash identical; nothing written outside the release root); its findings in the shared write loop were fixed in the same round (only regular files are read, an array where an object belongs is a named failure, the temp file is exclusive and keeps the original mode, version parts are safe integers).
- The CTO Chief ran tests/release-metadata-sync.test.js and tests/release-script-coverage.test.js after the fix round: tests 51, pass 51, fail 0, skipped 0.
- The npm test box is ticked before the gate run, which verifies it (owner rule of 2026-10-12); its figures are added after the completion.

### Fix round 2 — removeTmp no longer swallows a failed removal
Choice: `removeTmp` is called in paths that rethrow the original write or rename error, so throwing the cleanup error would hide the real cause. It now takes that error and records a failed removal on it as `cleanupError` (a name already gone, ENOENT, is not a failure and records nothing); the original error stays the one thrown. Tests first: case 23 (a removal that fails is recorded on the thrown error; red on the empty catch: no `cleanupError`) and case 24 (already-gone temp records nothing; guard, green throughout), in `tests/release-metadata-sync.test.js`. Green: that file 26/26; with `tests/release-script-coverage.test.js` and `tests/false-green-fence.test.js` 70/70, 0 skipped; the fence is back at its baseline of 207 (baseline not touched). `npx eslint` on both files with `--max-warnings 0`: clean.

### Completion of fix round 2 — gate result
The completion's full gate recorded passed:false: lint and typecheck clean, coverage 99.34% (floor 99), 0 skipped, 9 failures all in tests/menu-task-wiring.test.js (S18-8, S18-9 and others). Those tests cover src/commands/start.js, start.md and menu screens, files that other plans in flight were editing while the gate ran (git status shows them modified; none is a file of this plan). Run alone afterwards, tests/menu-task-wiring.test.js passes 67/67. The false-green fence passes at its baseline of 207. The evidence file was not edited; the failure is as recorded.

### Gate re-run after the other slice completed — passed
`tests/release-metadata-sync.test.js`, `tests/release-script-coverage.test.js` and `tests/false-green-fence.test.js`: 70 tests, 70 pass, 0 fail, 0 skipped (fence at its baseline of 207). `src/scripts/release.js` still holds the `removeTmp` fix. `menu task complete t335` ran the full gate: lint and typecheck clean, `npm test` coverage 99.61% (floor 99), 0 skipped, 0 failed, corpus claims PASS. Evidence in `.ctoc/state/verify/<slug>.json` records passed:true; the plan is in review. The command's printed JSON also carried fields of other tasks (t330, delta); this plan's evidence file was read directly to confirm.

### Fix round after the final review (2026-10-17)
What changed, in `src/scripts/release.js`: (1) the mode copy in `atomicWriteFileSync` now reads `catch (err) { if (err.code !== 'ENOENT') throw err; }`, so a missing target keeps the default mode and every other stat error propagates before a temp file exists (it was an empty catch that swallowed everything); (2) `removeTmp` now appends ` (temp file <name> could not be removed: <code>)` to the original error's `message` as well as setting `cleanupError`; (3) the header comment (ATOMIC WRITE bullet) now says in plain words that the mode is copied, a missing target keeps the default mode, any other stat failure stops the write, and a failed temp-file removal is named in the thrown message. The old header claim "leaves no *.tmp-* residue" was dropped because a failed removal can leave one, and the message now says so.
Tests first, in `tests/release-metadata-sync.test.js` (cases 25-28). Run before the code change: 28 pass / 2 fail. Red: "27. a stat failure other than ENOENT propagates before any temp file is made" (stubs `safeFs.statSync` to throw EIO; old code swallowed it) and "28. a failed removal puts the temp file name and the removal error code in the message". Green after the change: file 30/30. Not red on the old code, honest note: "25. a target that does not exist yet is written with the default mode" (ENOENT guard) and "26. a target whose parent is a regular file throws ENOTDIR and leaves nothing behind" passed before the change too, because the temp-file write that follows the swallowed stat fails with the same ENOTDIR and removes nothing; they stay as regression guards, and case 27 is the one that pins the stat-error propagation.
Commands: `node --test tests/release-metadata-sync.test.js tests/false-green-fence.test.js`: 47 tests, 46 pass, 1 fail, 0 skipped; the one failure is the fence's "LOWER THE BASELINE" check: live count 205, baseline file says 206 (`maxFindings` 206 at line 2 of `.ctoc/false-green-baseline.json`, key `src/scripts/release.js:silent-catch:atomicWriteFileSync` still listed at line 205). My fix removed that site, so the owner's pending baseline request now needs to lower the count to 205 and delete that key; the baseline file was not touched. The release.js file alone: 30/30. `npx eslint --max-warnings 0 src/scripts/release.js tests/release-metadata-sync.test.js`: clean. `npm test`, the full suite, `menu task complete` and all writing git commands were not run (the Chief runs the gate).

### Baseline lowered on the owner's grant (2026-10-18)
Grant: scope request `1792226142264-gwoion` (status answered) covering `.ctoc/false-green-baseline.json`. The request text says "207 to 206" because it was written when the file held 207; the file had already been lowered once to 206. The live count is now 205, since the `release.js` mode-copy catch no longer swallows errors. Changes, and nothing else: `maxFindings` 206 to 205, and the key `src/scripts/release.js:silent-catch:atomicWriteFileSync` removed from `findings` (`git diff` shows exactly those two hunks). `node --test tests/false-green-fence.test.js tests/release-metadata-sync.test.js`: 47 tests, 47 pass, 0 fail, 0 skipped. `npm test`, `menu task complete` and writing git commands were not run.

### Fix round after the fix-round review (2026-10-18)
Changed: `tests/release-metadata-sync.test.js` case 26 expects `ENOTDIR` on POSIX and `ENOENT` on win32 (one exact code per platform, picked with `process.platform`) and now also asserts the target is not created; case 25 now asserts the new file's mode equals a plain create's mode (Decision 9). `src/scripts/release.js`: the function comment and header now say a failed removal can leave a `*.tmp-*` file and the error then names it, and that a file already at the temporary name (`EEXIST`) is not ours and is left alone (checked: the code skips `removeTmp` on `EEXIST` and rethrows).
Verify: `node --test tests/release-metadata-sync.test.js tests/false-green-fence.test.js`: 47 tests, 47 pass, 0 fail, 0 skipped; `npx eslint --max-warnings 0` on both files: clean. `npm test` not run here.
Known platform difference, listed for the owner (pre-existing, no code change): on Windows a read-only target makes the rename fail with `EPERM`, loudly; POSIX renames over it.
Step 14 box ticked before the completion's gate run, on the CTO Chief's ruling of 2026-10-18 (Decision 10).
