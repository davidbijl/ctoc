---
title: "The no-packages check cannot pass vacuously: its forbidden-key fixture, its shim and its clean-up each fail when they do not do what the test assumes"
type: implementation
parent_plan: the-circuit-breakers-old-count-reader-reads-every-shape-the-old-library-read
depends_on: none
created: 2026-10-22
priority: MEDIUM
effort: medium
files:
  # THE SLICE'S OWN FILE: the one test file it changes. It creates no counted artifact, so no ratchet file.
  - tests/runs-without-installed-packages.test.js
---

# The no-packages check cannot pass vacuously: its forbidden-key fixture, its shim and its clean-up each fail when they do not do what the test assumes

**Scope (one line):** three changes to `tests/runs-without-installed-packages.test.js`, so a green run of the check that CTOC runs with no installed packages means the breaker really read the counts with no package installed: the polluted fixture carries all three forbidden keys, a missing shim output file fails the test naming the file and the child's exit status, and the clean-up runs only when the setup created its folder.

Read first, in full: the parent plan (`plans/implementation/the-circuit-breakers-old-count-reader-reads-every-shape-the-old-library-read.md`), its fourth story and its decisions 10 and 11. This slice is independent of the sibling slice "The old count reader reads every shape the old YAML library read, at least as high": the files are disjoint, and the fixture exercises the forbidden-key filter in `normalizeCounts`, which both today's reader and the rewritten one feed.

## Implementation Details

### What is wrong today, by line (read on 2026-10-22)

- **The forbidden-key fixture is vacuous** (line 61: `"__proto__": 9` beside `"10": 1`). The reader stores `__proto__` as an own key of a null-prototype map, and `normalizeCounts` drops it (`src/lib/circuit-breaker.js` line 120). But the last step of `readKickbackCounts` copies the counts onto a plain object with `Object.assign` (lines 361 and 373), and assigning to `__proto__` on a plain object sets its prototype (a number is ignored) instead of creating an own key. So with the filter removed the reading is still `{ by_step: { 10: 1 }, total: 1 }`, and line 145 stays green. A `constructor` or `prototype` key is an ordinary own key after that copy, so only those keys prove the filter works. Believed with high confidence from the language rule; Step 8 runs it.
- **A missing shim output file reads as "no bare requests"** (line 90: `fs.existsSync(out) ? JSON.parse(…) : []`). A child that never wrote the file passes the bare-package check.
- **The clean-up throws when the setup failed early** (line 112: `fs.rmSync(tmp, …)` unguarded). If `fs.mkdtempSync` throws, `tmp` is undefined, and the clean-up's `ERR_INVALID_ARG_TYPE` is reported beside the setup's own error.
- **The child's signal is lost** (line 76: `child.on('close', (code) => …)`). A child killed by the 30-second timer reports `code` null and no reason.

### Dependency Graph

```
npm test (src/scripts/test-gate.js, tests/*.test.js) --runs--> tests/runs-without-installed-packages.test.js
tests/runs-without-installed-packages.test.js --copies and loads in a child--> src/** (the shipped runtime), src/lib/circuit-breaker.js (readKickbackCounts, recordKickback, getEscalations)
```

No product file changes.

### File: `tests/runs-without-installed-packages.test.js`

**Action:** MODIFY. **Framework:** `node:test` and `node:assert/strict`, as today.

- **`EXERCISE`, the polluted fixture (line 61):** the step map carries `"__proto__": 9`, `"constructor": 9` and `"prototype": 9` before `"10": 1`, with `total: 1`, written in the same string style as the line today (`\\n` inside the template literal). A one-line comment above it says why all three: the plain-object copy drops `__proto__` by itself, so only `constructor` and `prototype` prove the forbidden-key filter. The assertion at line 145 is unchanged: `{ by_step: { 10: 1 }, total: 1 }`.
- **`run(args, env, cwd)` (line 76):** `close` receives `(code, signal)` and the result is `{ code, signal, stdout, stderr }`.
- **`runShimmed(args, cwd, tag)` (line 90):** before reading the file, `assert.ok(fs.existsSync(out), …)` with a message that names `out` and the child's ending: `exit status <code>`, or `killed by <signal>` when a signal ended it, and says its bare-package requests are unknown. Then `bare` is `JSON.parse(fs.readFileSync(out, 'utf8'))`; the empty-list fallback is removed.
- **`after` (line 112):** `if (tmp) fs.rmSync(tmp, { recursive: true, force: true });`.
- The header comment gains one sentence: the check fails, never passes, when the shim wrote nothing or the setup did not finish.

**Error handling:** each change turns a silent pass into a loud failure; the message names what is missing. **Cross-platform:** `path.join`, `os.tmpdir()`, and the child's signal is optional (Windows reports `null` for most endings, and then the exit status is named).

### Wiring — the live call sites

No module is added or changed. The test file is reached by `npm test`, whose gate (`src/scripts/test-gate.js`) runs every `tests/*.test.js`, and by `node --test tests/*.test.js`.

### Test Plan

This slice changes a test, so its red is shown by running the unchanged and the changed test against deliberately broken copies, in a scratch tree that is never committed. The scratch tree is a fresh folder in the session's scratch directory holding copies of `src/`, `package.json`, `VERSION` and `tests/runs-without-installed-packages.test.js` in the same layout (the test finds its tree through `path.join(__dirname, '..')`). Each demonstration below is run once with the unchanged test file and once with the changed one, and both outcomes are recorded in the Execution Record.

1. **The forbidden-key filter removed.** In the scratch copy of `src/lib/circuit-breaker.js`, delete the one line `if (FORBIDDEN_STEP_KEYS.has(k)) continue;` in `normalizeCounts`. Unchanged test: passes (the vacuous green). Changed test: fails at the polluted assertion, and the reading it shows holds a `constructor` or a `prototype` step. The real tree with the changed test: passes, with the reading `{ by_step: { 10: 1 }, total: 1 }`.
2. **The shim's output path not passed to the child** (the scenario's run). In the scratch copy of the test, the environment given to the child no longer holds `SHIM_OUT`. Record what each version reports. The changed test fails with the message naming the missing file and the child's exit status. If the unchanged test is already red in this run for another reason (the shim's exit handler throws on an undefined path, so the child's exit status may already be non-zero; not verified), that is recorded, and demonstration 3 shows the vacuous pass itself.
3. **A shim that exits without writing.** In the scratch copy, the shim's `process.on('exit', …)` line is removed, so every child exits 0 and writes nothing. Unchanged test: passes (the vacuous green, "no bare requests"). Changed test: fails with the message naming the missing file and `exit status 0`.
4. **The folder creation forced to fail.** In the scratch copy of the test, the `fs.mkdtempSync` call gets a parent folder that does not exist (`path.join(os.tmpdir(), 'no-such-folder', 'ctoc-no-packages-')`), so it throws `ENOENT` on every platform. Unchanged test: two failures, the setup's `ENOENT` and the clean-up's `ERR_INVALID_ARG_TYPE`. Changed test: the setup's `ENOENT` only; the clean-up does not throw.
5. **The real check.** `node --test tests/runs-without-installed-packages.test.js` on the real tree passes, with the five counter shapes reading as today: a bare key `{10: 3}`, 3; single quotes `{14: 2, 9: 1}`, 3; Windows line endings `{10: 4}`, 4; an empty flow map `{}`, 0; the forbidden keys `{10: 1}`, 1; and the seeded plan's sixth send-back escalating per plan.

### Acceptance Criteria Mapping

| Parent scenario | Implemented in | Shown by |
|---|---|---|
| The forbidden-key fixture proves the filter works | the polluted fixture | demonstrations 1 and 5 |
| A shim that wrote nothing fails the check | `runShimmed`, `run` | demonstrations 2 and 3 |
| A setup failure is reported once, not masked by the clean-up | `after` | demonstration 4 |

### Security Review

- [x] **Path traversal:** none; every path is under `os.tmpdir()` or the session's scratch directory.
- [x] **No secrets:** none.
- [x] **Safe file operations:** the test writes only under its own temporary folder; the scratch trees are outside the repository and never committed; no repository file but this test changes.
- [x] **Error messages:** the new message names a temporary file path at run time only; no path is written into a plan or a committed file.
- [x] **Command injection:** the child is spawned with `process.execPath` and an argument array, as today.

## Decisions Taken Under Ambiguity — technical planning

1. **Its own slice.** The three defects are checked by their own demonstrations, independent of the reader rewrite, and touch a file the reader slice does not; so it can be built and finished on its own, in parallel with the reader slice.
2. **The vacuous shim pass is shown with a shim that exits without writing** (demonstration 3) besides the scenario's own run (demonstration 2). The scenario's run removes `SHIM_OUT`, which may make the shim's exit handler throw and the child exit non-zero, so the unchanged test would already be red for another reason and the run would not show the vacuous pass. Demonstration 3 shows it whatever the exit handler does.
3. **The folder creation is forced to fail through a missing parent folder in a scratch copy**, not through `TMPDIR`, `TEMP` or `TMP`: it fails the same way on every platform and touches nothing the test runner itself may use.
4. **The message names the signal when there is one**, so a child killed by the 30-second timer says so (the parent's decision 11).
5. **No question for the owner.** Every choice here is how a test fails; the parent's fourth story settles what it must catch. The questions file holds an empty list.

## Execution Plan

### Step 8: TEST
- [ ] Build the scratch tree of the Test Plan. Run demonstrations 1, 3 and 4 with the unchanged test file and record each outcome (1 and 3 pass vacuously; 4 reports two failures). Run demonstration 2 with the unchanged test and record its outcome as it is.
- [ ] Step 8 done

### Step 9: PREPARE
- [ ] Run `node --test tests/runs-without-installed-packages.test.js` on the real tree: it passes (the baseline). Re-read lines 61, 76, 90 and 112; if a line moved, record the new number.
- [ ] Confirm the line `if (FORBIDDEN_STEP_KEYS.has(k)) continue;` is in `normalizeCounts` of the real `src/lib/circuit-breaker.js` (whichever version of the reader slice is on the branch).
- [ ] Step 9 done

### Step 10: IMPLEMENT
- [ ] `tests/runs-without-installed-packages.test.js`: the polluted fixture with all three forbidden keys and its comment; `run` keeps the signal; `runShimmed` fails on a missing output file, naming it and the child's ending; `after` guarded by `if (tmp)`; one sentence in the header.
- [ ] Copy the changed test into the scratch tree and run demonstrations 1 to 4 again; record each outcome (1, 2 and 3 fail with the messages above; 4 reports the setup's failure only). Run demonstration 5 on the real tree: it passes.
- [ ] Step 10 done

### Step 11: REVIEW
- [ ] Dispatch `iron-loop-critic` with: can the check still pass when the shim did not run, when the filter is gone, or when the setup did not finish; does any message lose the child's ending; does the changed test still assert all five counter shapes and the seeded escalation exactly as before.
- [ ] Step 11 done

### Step 12: OPTIMIZE
- [ ] Nothing to optimise; record the test file's run time before and after the change.
- [ ] Step 12 done

### Step 13: SECURE
- [ ] Dispatch `security-scanner` on the diff: temporary paths only, no shell, no write outside the temporary folder, the scratch trees outside the repository.
- [ ] Step 13 done

### Step 14: VERIFY
- [ ] `npm test`, the gated entry point: fail 0, skipped 0, coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [ ] `npm run lint`: no warning.
- [ ] Step 14 done

### Step 15: DOCUMENT
- [ ] The Execution Record holds the outcome of every demonstration, unchanged and changed, and the real run. No line in it starts with a hash mark except real headings; test-runner figures are written as prose ("tests 2, pass 2, fail 0"); no temporary or scratch path is written into it.
- [ ] The scratch tree is deleted.
- [ ] Step 15 done

### Step 16: FINAL-REVIEW
- [ ] Dispatch `iron-loop-critic` against the parent's three scenarios of the fourth story and this slice's demonstrations.
- [ ] Step 16 done
