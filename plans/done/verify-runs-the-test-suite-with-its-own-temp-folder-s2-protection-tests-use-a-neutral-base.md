---
iron_loop_verdict: true
iron_loop: true
title: "The record-protection tests make all their temp folders under one base that holds none of the hook's record words"
type: implementation
created: 2026-10-22
priority: high
effort: small
parent_plan: verify-runs-the-test-suite-with-its-own-temp-folder
depends_on: verify-runs-the-test-suite-with-its-own-temp-folder-s1-checks-get-their-own-temp-folder, the-test-suite-passes-on-a-clean-machine-s1-four-failures-fixed
files:
  - tests/protect-records.test.js
approved_by: human
approved_at: 2026-10-22T18:24:01.099Z
gate_crossed: review → done
---

# The record-protection tests make all their temp folders under one base that holds none of the hook's record words

Slice 2 of 2 of `plans/implementation/verify-runs-the-test-suite-with-its-own-temp-folder.md`.
It is a change to one test file. The hook `src/hooks/protect-records.js` does not change.

It depends on slice 1 for a practical reason: this slice's own completion runs VERIFY over the
whole suite. Without slice 1, that run uses this sandbox's 256 MB `/tmp` and can fail for
lack of space, which is the failure the parent plan was written for. It also depends on the
clean-machine slice, whose uncommitted, owner-approved change to test 160 is in this file
(`plans/review/the-test-suite-passes-on-a-clean-machine-s1-four-failures-fixed.md`, "Scope
growth decision"). Build on that working-tree state.

## Problem statement

When the hook's decision throws, its fail rule (`src/hooks/protect-records.js:1299-1314`) scans
`JSON.stringify(payload.tool_input)` and refuses in these cases:
- the text matches `UNCHECKED_SUSPECT_RE` (`:597`);
- for a background agent's call, it matches `MENU_MENTION_RE` (`:790`) or the sweep
  confirmation (`confirmsSweep`, `:220-223`);
- for a background agent's call, `SETTINGS_MENTION_RE` (`:294`) matches the NFKC text. This one
  refuses with its own sentence.

The test file makes its projects under `os.tmpdir()` (`makeProject`, `:32-39`) and puts
absolute paths in them into `tool_input` (`p()` `:64`, `write()` `:65`). Test 133 ("when the
protection cannot run", `:987`) and test 152 ("a release missing the resolver still runs the
shell's settings text rules", `:1561`) run a copy of the hook that crashes. Both expect a
main-session Write of such a path to be allowed. With a temp folder whose path contains
`verify` (or any other word above), that text matches and the hook exits 2 where 0 was
expected. The hook is right to fail closed. The tests' choice of folder is what changes.

The file has 14 lines with `os.tmpdir()`, at `:33, 225, 390, 744, 855, 988, 1190, 1209, 1264,
1410, 1454, 1562, 1590, 2299` (search `os\.tmpdir\(\)` in this file, 14 matching lines).
Thirteen make a folder; `:2299` (test 101) builds a path it never creates.

## Implementation Details

### Architecture Decision

One base for the whole file, chosen once, lazily, by the hook's own patterns:
- `fs.realpathSync(os.tmpdir())` when that real path trips nothing in the hook's fail rule.
  In that case nothing changes from today.
- Otherwise `fs.realpathSync(os.homedir())`, if that is neutral.
- Otherwise the base is an error naming both folders and the matching word. `tempBase()` throws
  it, and since `makeProject` (run by the top-level `beforeEach` for every test in the file)
  calls `tempBase()`, every test fails with that message. None is skipped.

The patterns are read from the hook's SOURCE TEXT (the hook exports nothing; `grep
module.exports src/hooks/protect-records.js` finds 0 matches), so this file cannot drift from
the hook. If a pattern's line can no longer be found, `tempBase()` throws, naming it, and every
test fails loudly.

Alternatives set aside:
- A neutral folder under the home folder (for example `~/.cache/ctoc-test-temp`). The approved
  functional plan names the home folder itself as the second choice. Its folders are removed
  by the same `afterEach` hooks as today.
- Importing a word check from `src/lib/step-13-verify.js`. The dead-export fence counts an
  export whose only caller is a test as dead, and this file would then judge by VERIFY's
  mirror instead of by the hook itself.

### Dependency Graph

```text
tests/protect-records.test.js:tempBase -> chooseTempBase -> recordWordIn -> hookPattern -> src/hooks/protect-records.js (source text)
tests/protect-records.test.js:makeProject and the 13 other temp locations -> tempBase
tests/protect-records.test.js:'temp base 2' -> node --test tests/protect-records.test.js (a child run of this same file)
```

No production code is touched. No cycle: the child run fails in its `beforeEach` before
reaching 'temp base 2' itself, so it never starts a grandchild.

### File: `tests/protect-records.test.js`
**Action:** MODIFY
**Purpose:** Every temp folder of the file lies under one base that the hook's crash rule never refuses; with none available, every test fails naming why.
**Change Type:** modify-existing (test fixture base; three new tests; no assertion changed)

#### New helpers: place them directly after `const REFUSAL_UNCHECKED = …` (line ~28)

Put a comment over them with the three-part reason Operating Lesson 14 asks for:
- **The outside contract.** When its decision crashes, `src/hooks/protect-records.js` scans the
  call's `tool_input` for the words of `UNCHECKED_SUSPECT_RE`, `MENU_MENTION_RE` and
  `SETTINGS_MENTION_RE` and for the sweep confirmation, and refuses. Cases 133 and 152 put
  absolute temp paths into `tool_input` and expect a main-session Write to be allowed.
- **Why the tests change and not the hook.** Failing closed on a crash is the hook's intended
  safe side (the parent plan keeps it). The tests' choice of folder was the fault.
- **What now fails that did not.** A machine where neither the temp folder nor the home folder
  is neutral now fails every test here, naming the folders and the word. Before, it failed 133
  and 152 for a reason their names do not say.

```js
/** One of the hook's own patterns, read from its source text (the hook exports nothing). */
function hookPattern(name) {
  const text = fs.readFileSync(ENTRY, 'utf8');
  const m = new RegExp(`^const ${name} = /(.+)/([a-z]*);$`, 'm').exec(text);
  if (!m) throw new Error(`could not read ${name} from ${ENTRY}; the temp base check needs the hook's own pattern`);
  return new RegExp(m[1], m[2]);
}

/**
 * The text the hook's fail rule (src/hooks/protect-records.js, main(), the catch) would refuse
 * in a call whose tool_input holds `folder`, for the main session or a background agent; or null.
 */
function recordWordIn(folder) {
  const scanned = JSON.stringify(folder);
  const flat = scanned.replace(/["'\\]/g, '');
  const hit = [
    scanned.match(hookPattern('UNCHECKED_SUSPECT_RE')),
    scanned.match(hookPattern('MENU_MENTION_RE')),
    scanned.normalize('NFKC').match(hookPattern('SETTINGS_MENTION_RE')),
    flat.match(/applysweep/i),
    /sweep/i.test(flat) && /--confirm/i.test(flat) ? ['sweep and --confirm'] : null,
  ].find(Boolean);
  return hit ? hit[0] : null;
}

/** The first candidate whose real path is neutral, or a message naming every folder tried and why. */
function chooseTempBase(candidates) {
  const tried = [];
  for (const [label, where] of candidates) {
    let real;
    try {
      real = fs.realpathSync(where());
    } catch (err) {
      tried.push(`the ${label} cannot be used (${err.code || err.message})`);
      continue;
    }
    const word = recordWordIn(real);
    if (word === null) return { base: real };
    tried.push(`the ${label} ${real} contains "${word}"`);
  }
  return { problem: `No folder here can hold this file's temp folders: ${tried.join('; ')}. `
    + 'When its decision crashes, src/hooks/protect-records.js refuses a call whose input holds such a word, '
    + 'and cases 133 and 152 put these folders into the input; run this file with TMPDIR (TEMP on Windows) '
    + 'naming a folder whose path holds none.' };
}

let tempBaseChoice = null;
/** The base of every temp folder this file makes: the temp folder, else the home folder. Throws naming both when neither is neutral. */
function tempBase() {
  if (tempBaseChoice === null) {
    tempBaseChoice = chooseTempBase([['temp folder', () => os.tmpdir()], ['home folder', () => os.homedir()]]);
  }
  if (tempBaseChoice.problem) throw new Error(tempBaseChoice.problem);
  return tempBaseChoice.base;
}
```

The message is one line, so a reporter does not wrap it. `os.homedir()` may throw (an account
with no home entry; see test 137's comment at `:1061`). The getter form turns that into "the
home folder cannot be used (…)".

#### Changes to existing code
- **The 14 temp locations.** In each of these lines, `os.tmpdir()` becomes `tempBase()`:
  `:33` (`makeProject`), `:225`, `:390` (test 81), `:744`, `:855`, `:988` (test 133), `:1190`
  (`makeOther`), `:1209`, `:1264` (`makeLayout`), `:1410` (test 143), `:1454` (test 145),
  `:1562` (test 152), `:1590` (test 153) and `:2299` (test 101). Nothing else on those lines
  changes: each keeps its `fs.realpathSync(fs.mkdtempSync(path.join(…, '<prefix>')))` shape and
  prefix. Line numbers are those of the working tree on 2026-10-22, and they may move: find the
  14 by the search `os\.tmpdir\(\)` and confirm the count is 14 before editing.
- **The top-level `afterEach` (`:42`)** becomes
  `afterEach(() => { if (project) fs.rmSync(project, { recursive: true, force: true }); project = null; });`.
  Write a one-line reason above it: when `makeProject` throws (no neutral base), `project` is
  `null`, and `fs.rmSync(null)` would add a second, unrelated error after the real one. No
  assertion is involved.
- Nothing else in the file changes. Tests 55, 56, 57, 73, 81, 101, 133, 152 and 160 keep every
  assertion they have.

#### Called By / Wiring
No module is added. The file is run by `npm test` (`package.json:11`, `node
src/scripts/test-gate.js --experimental-test-coverage`), which VERIFY runs on every completed
build (the chain in slice 1's "Wiring" section).

#### Error handling
- The hook's source unreadable, or a pattern line missing: `tempBase()` throws with the
  constant's name, and every test fails with it.
- No neutral base: `tempBase()` throws the one-line message, and every test fails with it.
- A temp location that cannot be made (`mkdtempSync` fails): it fails as today, with the system
  error.

#### Cross-platform notes
- `path.join` and `fs.realpathSync` only. `os.homedir()` reads `USERPROFILE` on Windows.
- `JSON.stringify` doubles a Windows backslash just as the hook's scan does, so the check sees
  the same text the hook sees.
- `symlinkSync(…, 'junction')` in 'temp base 1', as the file already does elsewhere.
- The child run in 'temp base 2' sets `TMPDIR`, `TMP` and `TEMP`. Before setting a name, it
  deletes any key that equals that name ignoring letter case, so Windows sees one value.

### Test Plan

### Tests: `tests/protect-records.test.js`
**Action:** MODIFY (append one `describe('the base of this file\'s temp folders', …)` at the end
of the file).
**Framework:** `node:test` + `node:assert/strict`, as in the file. Every folder is real.

#### Test cases
1. **temp base 1 · the base is the temp folder when neutral, else the home folder, else a
   message naming both.**
   - Under `root = fs.realpathSync(fs.mkdtempSync(path.join(tempBase(), 'pr-base-')))`, make
     these folders: `plain`, `verify-tmp` and `ledger-home`. Also make a link
     `plain-link -> verify-tmp` (`'junction'`).
   - Assert:
     - `chooseTempBase([['temp folder', () => plain], ['home folder', () => ledgerHome]])`
       deep-equals `{ base: plain }`;
     - `[[…verify-tmp], […plain]]` gives `{ base: plain }`;
     - `[[…plain-link], […plain]]` gives `{ base: plain }` (judged by its real path; message
       "a link to a word folder is not neutral");
     - `[[…verify-tmp], […ledger-home]]` has no `base`, and its `problem` includes `verifyTmp`,
       `"verify"`, `ledgerHome`, `"ledger"` and `TMPDIR`;
     - with the home getter throwing `Object.assign(new Error('no home'), { code: 'ENOENT' })`,
       the `problem` includes `cannot be used (ENOENT)`;
     - `recordWordIn(path.join(root, 'verify-x')) === 'verify'`, and
       `recordWordIn(plain) === null`.
   - Remove `root` in `finally`.
2. **temp base 2 · with no neutral folder, every test in this file fails, and the message names
   the folders and the word.**
   - Under `root = fs.realpathSync(fs.mkdtempSync(path.join(tempBase(), 'pr-nobase-')))`, make
     `verify-tmp` and `ledger-home`.
   - Child environment:
     - `{ ...process.env }`;
     - for each of `TMPDIR`, `TMP` and `TEMP`, delete every key that equals it ignoring letter
       case, then set it to `verify-tmp`;
     - set `HOME` and `USERPROFILE` to `ledger-home` the same way;
     - delete `NODE_TEST_CONTEXT`. A nested runner inherits it and changes how it reports (see
       `tests/step-13-verify.test.js` case 7).
   - Run `spawnSync(process.execPath, ['--test', '--test-reporter=tap', __filename], { env, encoding: 'utf8', timeout: 120000 })`.
   - Read the TAP summary counters (`^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$`, multiline).
   - Assert:
     - `tests > 100` (the whole file really loaded);
     - `pass === 0`, `skipped === 0`, `todo === 0` and `cancelled === 0`;
     - `fail === tests`;
     - the output includes `No folder here can hold this file's temp folders`, `verify-tmp` and
       `ledger-home`;
     - the output matches `/contains \\?"verify\\?"/` and `/contains \\?"ledger\\?"/`. This
       tolerates the reporter quoting the message in either YAML style.

     Every assertion message quotes the last 2,000 characters of the child's output.
   - Remove `root` in `finally`.
3. **temp base 3 · every folder this file makes lies under the chosen base: the temp folder
   when its real path is neutral, else the home folder.**
   - `realTmp = fs.realpathSync(os.tmpdir())`.
   - `expected` is `realTmp` when `recordWordIn(realTmp) === null`, else
     `fs.realpathSync(os.homedir())`.
   - Assert:
     - `tempBase() === expected`;
     - `project.startsWith(expected + path.sep)`;
     - `recordWordIn(project) === null`.

   Both branches assert, and neither is skipped.

**Red before Step 10:**
- temp base 1 and 3 fail with `ReferenceError` (`chooseTempBase`/`tempBase` undefined). This is
  the expected TDD red.
- temp base 2 is red on behaviour: on the unchanged file, the child passes most tests, so
  `pass === 0` fails.

#### The recorded runs (acceptance criteria that are runs, not in-suite tests)
These run the whole file five times. That is too slow for the suite, so they are run by hand
and quoted in `## Execution Record`.
- **Seen first (Step 8, unchanged file):**
  `TMPDIR=<fresh folder whose name contains verify> node --test --test-reporter=tap tests/protect-records.test.js`
  (also `TMP` and `TEMP` on Windows). Record the summary counters and every failing test by
  number and title. The list must include 133 and 152. Any other failing test is reported, not
  fixed here.
- **After (Step 14):** the same command five times, with `TMPDIR` set in turn to fresh folders
  whose paths contain `approval`, `verify`, `ledger` and `.ctoc`, and to an ordinary fresh
  folder. Each must report `# fail 0` and `# skipped 0`. Quote the five summary blocks. For the
  ordinary folder, record that 'temp base 3' passed, which proves the folders lie under it, as
  today.

#### Coverage targets
This is a test file, so the coverage floor does not count it. Every branch of `chooseTempBase`
and `recordWordIn` is run by 'temp base 1'. The `problem` throw of `tempBase()` is run by the
child in 'temp base 2'.

### Security Review
- [x] **Path traversal:** the base is `os.tmpdir()` or `os.homedir()`, real path resolved. Every
  folder is made by `mkdtempSync` inside it and removed by the existing `afterEach`/`finally`
  hooks.
- [x] **No secrets:** the error message names local folders only. It is printed to the test
  output, never stored.
- [x] **The hook is untouched:** `src/hooks/protect-records.js` is only read as text.
- [x] **Command injection:** the child run is `spawnSync(process.execPath, [...])` with an argv
  array and no shell.
- [x] **Home folder use:** in the fallback, the file's temp folders are made directly in the
  home folder (the approved plan's choice) and removed by the same hooks as today. A killed
  run can leave a `pr-…` folder there; the risk is named in the parent plan.

### Architecture checks
| Check | Result |
|---|---|
| Dependency direction | the test reads the hook's text; no production module changes |
| Test independence | the base is chosen once from the environment; every test still makes and removes its own folders |
| Cross-platform | `realpathSync`, `JSON.stringify` (same backslash doubling as the hook), case-insensitive env keys in the child |

## Implementation Order
1. Step 8: the "seen first" run on the unchanged file, then append 'temp base 1-3' and see them
   red.
2. Step 10: add the helpers, make the 14 replacements, and add the `afterEach` guard.

## Acceptance Criteria Mapping

| Criterion (parent plan) | Implemented in | Test case |
|---|---|---|
| The failures are seen first: `node --test tests/protect-records.test.js` with a `verify` temp folder lists the failing tests, including 133 and 152 | (no code; Step 8 run) | Step 8 recorded run |
| The protection tests use a neutral base: the temp folder when neutral, else the home folder | `chooseTempBase`, `tempBase`, the 14 replacements | temp base 1, temp base 3 |
| The protection tests pass whatever the temp folder is called (`approval`, `verify`, `ledger`, `.ctoc`, ordinary) | the same | Step 14 recorded runs (five) |
| With the ordinary folder, every temp folder the file makes lies under it, as today | `tempBase` returns the real temp folder | temp base 3 |
| They fail loudly with no neutral base: every test fails, naming both folders and the word, none skipped | `tempBase` throws from `makeProject`'s `beforeEach` | temp base 2 |
| Drift is caught: the hook gains a word | the file reads the hook's own patterns; a missing pattern line throws | temp base 1 (`recordWordIn` via `hookPattern`) |
| The hook is untouched; 55, 56, 73, 133 and 152 keep every assertion | (no hook change) | Step 11 diff check |
| No test is weakened | only `os.tmpdir()` to `tempBase()` and the `afterEach` guard, with the Lesson 14 reason | Step 11 diff review |
| The whole gate passes | all of the above | Step 14 |

## Risk Mitigations

| Risk | Mitigation | Where |
|---|---|---|
| Eleven plans that are not done declare this file, so line numbers move | Find the 14 by search and confirm the count; tests named by number and title | Step 9 |
| A test behaves differently when its project lies under the home folder (the fallback) | The Step 14 runs with word temp folders exercise exactly that. Any failure is reported by name and not loosened | Step 14 |
| A node release reports a failed `beforeEach` as cancelled instead of failed | 'temp base 2' asserts `fail === tests` and `cancelled === 0`. If node differs, stop and report; do not loosen | Step 8 / Step 14 |
| The hook's pattern line is reformatted (for example split over two lines) | `hookPattern` throws naming the constant, so every test fails loudly, never silently | `hookPattern` |
| This slice's completion runs VERIFY over the whole suite on the 256 MB `/tmp` | `depends_on` slice 1, so the completion's VERIFY uses its own folder | frontmatter |

## Decisions Taken Under Ambiguity

1. **The base is the real path of the chosen folder,** so `fs.realpathSync(fs.mkdtempSync(path.join(tempBase(), …)))`
   keeps today's shape exactly, and a temp folder that is a link to a word folder is judged by
   where it really goes.
2. **The sweep confirmation's words are checked too** (`applysweep`, or `sweep` together with
   `--confirm`), written here to mirror `confirmsSweep` (`src/hooks/protect-records.js:220-223`),
   because the fail rule refuses a background agent's call on them first. The parent plan's
   fact 3 named three patterns; leaving out the fourth trigger would leave test 133's agent
   rows open to it.
3. **The five temp-folder runs are recorded runs, not in-suite tests.** Each is a whole run of a
   file that spawns the hook hundreds of times. 'temp base 1-3' prove the mechanism inside the
   suite.
4. **The `hookPattern` helper is about ten lines duplicated from slice 1's test file.** A shared
   helper file is declared by neither slice.
5. **No project template applies** (CTOC's own test code).

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [x] Record the starting state in `## Execution Record`: `node --version`, and
  `git -C /projects/ctoc/ctoc status --porcelain -- tests/protect-records.test.js src/hooks/protect-records.js`.
  The test file is expected to show as modified (the clean-machine slice's test 160 change), and
  the hook as unchanged. Build on it; do not revert it.
- [x] The "seen first" run on the unchanged file:
  `TMPDIR=<fresh folder whose name contains verify> node --test --test-reporter=tap tests/protect-records.test.js`.
  Record the summary counters and each failing test by number and title. It must include 133 and
  152. Report any other failing test; fix nothing for it here.
- [x] Append 'temp base 1-3' exactly as in the Test Plan. Run
  `node --test tests/protect-records.test.js` and record: temp base 1 and 3 red (`ReferenceError`),
  temp base 2 red on `pass === 0`, every other test green.

### Step 9: PREPARE
- [x] Re-read the file. Search `os\.tmpdir\(\)` and confirm 14 matching lines, then list them
  with their test numbers. Search `^const (UNCHECKED_SUSPECT_RE|MENU_MENTION_RE|SETTINGS_MENTION_RE) = /`
  in `src/hooks/protect-records.js` and confirm each is a one-line literal (3 matches).
- [x] Confirm that top-level `beforeEach` hooks run for tests inside nested `describe` blocks on
  the installed node. The file already relies on this: test 56 uses `p(…)` inside a `describe`.

### Step 10: IMPLEMENT
- [x] `tests/protect-records.test.js`:
  - add `hookPattern`, `recordWordIn`, `chooseTempBase` and `tempBase` with the Lesson 14
    comment;
  - make the 14 `os.tmpdir()` to `tempBase()` replacements;
  - add the top-level `afterEach` guard with its reason.

### Step 11: REVIEW
- [x] `git diff -- src/hooks/protect-records.js` is empty.
- [x] Review the diff of the test file. The only removed or changed lines are:
  - the 14 replacements;
  - the `afterEach` line.

  No `assert` line is removed or loosened. Tests 55, 56, 73, 133 and 152 read character for
  character as before, apart from `tempBase()` in 133 and 152.
- [x] After the change, `os\.tmpdir\(\)` occurs only in `tempBase` and in 'temp base 3'.

### Step 12: OPTIMIZE
- [x] Confirm the base is chosen once per file run (`tempBaseChoice` cached) and that the hook's
  source is read at most four times per choice. Record the duration of 'temp base 2'.

### Step 13: SECURE
- [x] The security scanner checks:
  - the child run uses no shell;
  - every folder the new tests make is removed in `finally`;
  - in the home-folder fallback, nothing is written outside a `pr-…` folder.

### Step 14: VERIFY
- [x] The five recorded runs from the Test Plan (`approval`, `verify`, `ledger`, `.ctoc`,
  ordinary): each `# fail 0`, `# skipped 0`. Quote the five summary blocks.
- [x] `npm test` with `TMPDIR` set to a fresh, empty folder on disk: 0 failures, 0 skipped,
  coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [x] `npx eslint . --max-warnings 0`.
- [x] Name these files in the record as run and green: `tests/protect-records.test.js`,
  `tests/only-the-owner-answers-an-inbox-question.test.js`,
  `tests/plans-keep-moving-without-the-human.test.js`, `tests/false-green-fence.test.js`.

### Step 15: DOCUMENT
- [x] Add the Lesson 14 comment over the helpers, JSDoc on the four helpers, and the reason line
  over the `afterEach` guard.
- [x] No count in `CLAUDE.md` moves, because no file is created.

### Step 16: FINAL-REVIEW
- [x] Check each row of the Acceptance Criteria Mapping against its test or recorded run.
- [x] Quote the Step 8 "seen first" run and the five Step 14 runs.
- [x] The record that this slice's completion writes, `.ctoc/state/verify/<this slice's slug>.json`,
  is the menu's to write after the build. It must show `passed: true`, and it is never written
  by hand.


## Deferred Questions

_Written by the Iron Loop integrator (src/lib/iron-loop.js), which performs NO
quality evaluation. These entries are the integrator's own report on itself, not
findings from a critic that read this plan._

- **evaluation**: NOT EVALUATED — no automated critique was performed on this plan. The refinement loop appended the Steps 8-16 template and assessed nothing. (The scores this step used to report were computed from that same template, not from the plan.) A human or a real critic must review this plan before it is built.

## Execution Record

All runs used a scratch copy of the home git config (init.defaultBranch removed) and a fresh TMPDIR under /home/ctoc/ctoc-tmp/pr-s2. Only the "seen first" run and the five recorded runs used temp folder names holding a record word. Raw outputs are kept in /home/ctoc/ctoc-tmp/pr-s2 (seen.out, red.out, green.out, after-*.out, npm-test.out).

### Step 8 starting state
- node v22.23.1.
- git status for tests/protect-records.test.js and src/hooks/protect-records.js: only the test file shows modified (the clean-machine slice's test 160 change, kept intact); the hook is unchanged.

### Step 8 "seen first" run (unchanged file, TMPDIR name holds "verify")
Summary: tests 181, pass 179, fail 2, cancelled 0, skipped 0, todo 0. Failing tests: 133 (when the protection cannot run) and 152 (a release missing the resolver still runs the shell's settings text rules). No other test failed.

### Step 8 red run (3 new tests appended, helpers not yet written, ordinary TMPDIR)
tests 184, pass 181, fail 3: temp base 1, temp base 2 and temp base 3 each failed with ReferenceError (tempBase and chooseTempBase undefined). Temp base 2 also reaches tempBase() in its own body, so it is red on the ReferenceError rather than on pass === 0; every other test was green.

### Step 9
- os.tmpdir() occurred on 14 lines in the original file; after the change it occurs only in tempBase (a getter) and in temp base 3.
- UNCHECKED_SUSPECT_RE, MENU_MENTION_RE and SETTINGS_MENTION_RE are each a one-line literal in src/hooks/protect-records.js (3 matches).
- Top-level beforeEach runs for tests in a nested describe on node v22.23.1 (temp base 3 reads the project it made).

### Step 11 diff review
The only lines removed from the file are the 14 path.join(os.tmpdir(), ...) lines (now path.join(tempBase(), ...)) and the afterEach line. No assert line removed or loosened. The test 160 change (textNamesFolder) is intact. git diff of src/hooks/protect-records.js is empty.

### Step 12
Base chosen once (tempBaseChoice cached). Temp base 2 (child run of the whole file) took about 221 ms in the first all-green run.

### Step 14 recorded runs (node --test --test-reporter=tap tests/protect-records.test.js)
Each run: tests 184, suites 21, pass 184, fail 0, cancelled 0, skipped 0, todo 0.
- TMPDIR .../pr-s2/approval-run (path holds "approval"): pass 184, fail 0, skipped 0.
- TMPDIR .../pr-s2/verify-run (holds "verify"): pass 184, fail 0, skipped 0.
- TMPDIR .../pr-s2/ledger-run (holds "ledger"): pass 184, fail 0, skipped 0.
- TMPDIR .../pr-s2/dot/.ctoc (holds ".ctoc"): pass 184, fail 0, skipped 0.
- TMPDIR .../pr-s2/run-ordinary (ordinary): pass 184, fail 0, skipped 0; "ok 3 - temp base 3" passed; no pr-* folders were left behind in the temp folder or the home folder.
The file takes about 70 s per run.

### Step 14 gates
- npx eslint . --max-warnings 0: no output, exit 0.
- npm test with TMPDIR=/home/ctoc/ctoc-tmp/run-s2-full: tests 13866, pass 13866, fail 0, cancelled 0, skipped 0, todo 0; test-gate: coverage 99.63% (threshold 99%), skipped 0, failed 0, PASS.
- tests/protect-records.test.js, tests/only-the-owner-answers-an-inbox-question.test.js, tests/plans-keep-moving-without-the-human.test.js and tests/false-green-fence.test.js are all part of that green run.

### Step 16 note
The record at .ctoc/state/verify/ for this slice is written by the menu's completion; it was not written by hand. The completion's own result is reported in the build summary.
