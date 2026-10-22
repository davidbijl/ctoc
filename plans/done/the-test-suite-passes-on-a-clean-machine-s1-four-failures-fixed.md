---
iron_loop_verdict: true
iron_loop: true
title: "The four failing tests stop depending on the machine, the docs count matches the disk, and the suite's temp use is measured"
type: implementation
created: 2026-10-22
priority: high
effort: small
parent_plan: the-test-suite-passes-on-a-clean-machine
depends_on: none
files:
  - tests/test-selection-scope.test.js
  - tests/quality-agent-coverage-holes.test.js
  - tests/step-13-verify.test.js
  - tests/readme-numbers.test.js
  - README.md
revision: 1
rejection_reason: "Recorded verify failed only because the run used the full /tmp; rerun the completion with the on-dis"
tag: rejected
approved_by: human
approved_at: 2026-10-22T18:39:33.494Z
gate_crossed: review → done
---
# REVISION 1

## Rejection Feedback

Recorded verify failed only because the run used the full /tmp; rerun the completion with the on-disk temp folder.

---


# The four failing tests stop depending on the machine, the docs count matches the disk, and the suite's temp use is measured

Slice 1 of 1 of `plans/implementation/the-test-suite-passes-on-a-clean-machine.md`.

This is one slice, not four. The plan's central check is that the whole suite runs with 0 failures,
and the build's own VERIFY runs the whole suite. A slice holding one of the four fixes would
record a VERIFY run that fails on the other three. That is the problem this plan exists to remove.
Each of the five edits is a few lines, and none touches `src/`.

## Problem Statement

On an untouched tree, with git's `init.defaultBranch` unset and Node v22.23.1, `npm test` reports
four failing tests (from the brief, not re-run by this planner). The parent plan sets out the four
causes. This slice fixes them and measures how much the suite writes to the temp folder.

What this planner verified by reading. No command was run, because this agent has no shell.

- **This machine's own git configuration sets the default branch.** `~/.gitconfig` holds
  `[init] defaultBranch = main` (its last two lines). In the owner's normal environment the
  rejected-push test therefore passes, because `gitIn` in `tests/quality-agent-coverage-holes.test.js:256-258`
  inherits the global configuration. Test 8 still fails, because the `git()` helper in
  `tests/test-selection-scope.test.js:58-70` sets `GIT_CONFIG_GLOBAL` and `GIT_CONFIG_SYSTEM` to
  the null device. This matches the brief: test 8 "still failed after `git config --global
  init.defaultBranch main`". The "unset" runs this plan requires are therefore built from copies
  of that file (see "Run environments"). The owner's file is never written.
- **After the fix, test 8's three assertions can hold.** The empty-delta branch prints
  `   Git reports no delta for this push. Running the full suite.` (`src/lib/quality-agent.js:1241`).
  The null branch prints `   Could not determine the push delta — git is unavailable or this is not a git repository. Running the full suite.`
  (`:1234`). After either one, `runFullTests` prints only `   Running full js test suite...`
  (`:1123`) and `   Tests passed (3 total)` (`:1190`). Neither matches
  `could not determine|unavailable|not a git`.
- **The suite's own colour switch does not reach case 7.** `src/scripts/test-gate.js:422` runs
  the suite with `NO_COLOR=1` and `FORCE_COLOR=0`. Case 7 overrides both in its own process
  before calling `runVerify` (`tests/step-13-verify.test.js:343-344`). `runVerify` passes
  `process.env` on to `npm test`.
- **Naming a reporter has precedent here.** `tests/scheduler-rule-projection-gate.test.js:229`
  passes `--test-reporter=tap`, and `tests/hotfix-check.test.js:144` passes
  `--test-reporter=${reporter}`.
- **CTOC already relies on git 2.36** for its work check (`src/commands/start.md:242`).
  `--initial-branch` needs git 2.28.
- **Nothing rewrites the README docs entry.** Pattern `\d+ docs|docs/\s+|countDocs` over `src/`:
  0 files matched. No test reads that entry. Pattern `OPERATING_LESSONS\.md|UPDATING\.md|20 docs|21 docs`
  over `tests/`: only `tests/readme-numbers.test.js:202` matched, plus unrelated lines in
  `tests/claude-md-keeps-every-rule.test.js` and `tests/fixtures/claude-md-rule-inventory.json`.
  `docs/UPDATING.md` is named by no file outside `plans/` (pattern `UPDATING\.md`, whole
  repository except `plans/`: 0 files).
- **The disk holds 21 `.md` files directly under `docs/`** (glob `docs/*.md`: 21 entries, the
  21st being `docs/UPDATING.md`).

Beliefs that are not verified. Each one is checked by a real run before any fix, and each has a
stop condition (Step 9):
- In the unchanged empty-delta fixture, the clone's HEAD names a branch that does not exist, so
  `git rev-parse HEAD` fails there.
- On Node 22.23.1 with standard output piped, `node --test` picks the TAP reporter (the brief's
  observation).
- On Node 22.23.1 the spec reporter colours piped output when `FORCE_COLOR=3`.

## Implementation Details

### Architecture Decision

Fix the fixtures, not the code. Each failing fixture relied on a machine default that nothing
in the repository sets: git's initial branch name and Node's default reporter for piped output.
Each fixture now names what it relies on. Each change is one argument added to an existing argv
call, with no shell. No assertion is removed or loosened. Three assertions are added: two in
case 6 and one README check. The only literal that changes is the docs count, 20 to 21.

Alternatives considered and not taken:
- **Set the bare remote's HEAD with `git symbolic-ref HEAD refs/heads/main` after `git init`.**
  This works on every git version, but it takes a second command. CTOC already needs git 2.36,
  and on a git older than 2.28 `--initial-branch` fails loudly. The functional plan keeps
  `symbolic-ref` as the fallback for older git.
- **Clone with `git clone -b main` in the rejected-push test only.** That fixes one caller and
  leaves the helper building a remote whose HEAD names a branch nobody pushed. The functional
  plan asks the fixtures that make a bare remote to name its branch.
- **Set the reporter through `NODE_OPTIONS` or the environment.** That is less visible than an
  argument in the fixture's own argv, and it would reach every node the fixture starts.

### Dependency Graph

```text
tests/test-selection-scope.test.js:makeEmptyDeltaClone -> git init --bare --initial-branch=main (via git())
tests/test-selection-scope.test.js:case 6 -> src/lib/quality-agent.js:runSmartTests -> getPushDeltaBlobs -> the [] branch (:1240-1243)
tests/test-selection-scope.test.js:case 8 -> src/lib/quality-agent.js:runSmartTests (unchanged assertions)
tests/quality-agent-coverage-holes.test.js:makeRepoWithRemote -> git init -q --bare --initial-branch=main (via gitIn())
tests/quality-agent-coverage-holes.test.js:rejected-push case -> makeRepoWithRemote -> git clone (now checks out main)
tests/step-13-verify.test.js:case 7 fixture run-tests.js -> node --test --test-reporter=spec suite.test.js
tests/step-13-verify.test.js:case 7 -> src/lib/step-13-verify.js:runVerify -> npm test (piped)
tests/readme-numbers.test.js:ground truth -> docs/*.md on disk (literal 21)
tests/readme-numbers.test.js:README pin -> README.md docs entry + docs/*.md on disk
```

No module, export or `require` is added. No cycle is possible: only test files and one Markdown
file change.

### File: `tests/test-selection-scope.test.js`
**Action:** MODIFY
**Purpose:** The empty-delta fixture really produces an empty delta on every machine, and case 6 proves it took that branch.
**Change Type:** modify-existing (fixture argument plus a tightened case)

#### Change a (Step 10): the bare remote names its branch
Lines 114-118 today:
```js
// A local "remote" cloned into a working copy whose HEAD == @{upstream}: git works and
// the push delta @{upstream}..HEAD is GENUINELY empty (`[]`, not null).
function makeEmptyDeltaClone(prefix) {
  const remote = mkTmp(prefix + 'remote-');
  git(['init', '--bare'], remote);
```
They become:
```js
// A local "remote" cloned into a working copy whose HEAD == @{upstream}: git works and
// the push delta @{upstream}..HEAD is GENUINELY empty (`[]`, not null).
//
// The bare remote starts on `main` by name (plan the-test-suite-passes-on-a-clean-machine).
// The outside contract: `git init` names the branch `init.defaultBranch` sets, and git's
// built-in `master` when nothing sets it. git() above hides the machine's configuration, so a
// plain `git init --bare` always named `master`, while the seed pushes only `main`. The clone
// then had an unborn HEAD, getPushDeltaBlobs returned null, and cases 6 and 8 ran the "could
// not determine" branch instead of the empty delta this fixture promises. Why the fixture and
// not the code: the code is right for an empty delta; the fixture never built one. What newly
// fails: nothing here; case 6's assertions below fail if this fixture stops producing an
// empty delta.
function makeEmptyDeltaClone(prefix) {
  const remote = mkTmp(prefix + 'remote-');
  git(['init', '--bare', '--initial-branch=main'], remote);
```
Lines 119-134 (seed, push, clone) do not change. The seed keeps `git init` followed by
`git branch -M main`, which already names its branch.

#### Change b (Step 8): case 6 asserts the branch its title names
Lines 304-315 today:
```js
  // Case 6 — git works, delta genuinely empty (`[]`, HEAD == @{upstream}): full suite.
  gitIt('6. a genuinely empty delta ([]) runs the full suite', async () => {
      const { workdir, cleanup } = makeEmptyDeltaClone('ctoc-sel-empty-');
      try {
        const { res } = await withCwd(workdir, () =>
          captureLog(() => qualityAgent.runSmartTests({ js: { test: GREEN } })));
        assertFullSuiteRan(res, 'empty-delta');
        assert.equal(res.passCount, 3);
      } finally {
        cleanup();
      }
    });
```
They become:
```js
  // Case 6 — git works, delta genuinely empty (`[]`, HEAD == @{upstream}): full suite.
  //
  // Tightened by plan the-test-suite-passes-on-a-clean-machine. The outside contract: this
  // file's header says `[]` and `null` BOTH run the full suite with DISTINCT messages, and this
  // case's title names the `[]` branch. Why the test and not the code: the code already prints
  // "Git reports no delta for this push" for `[]`; this case checked only the full-suite count,
  // which the `null` branch gives too, so it passed while running the wrong branch. What newly
  // fails: a fixture or a code change that sends this case down the "could not determine" branch.
  gitIt('6. a genuinely empty delta ([]) runs the full suite', async () => {
      const { workdir, cleanup } = makeEmptyDeltaClone('ctoc-sel-empty-');
      try {
        const { res, out } = await withCwd(workdir, () =>
          captureLog(() => qualityAgent.runSmartTests({ js: { test: GREEN } })));
        assertFullSuiteRan(res, 'empty-delta');
        assert.equal(res.passCount, 3);
        assert.match(out, /Git reports no delta for this push/,
          'the empty-delta case must take the [] branch and say git found no delta');
        assert.doesNotMatch(out, /could not determine|unavailable|not a git/i,
          'the empty-delta case must never print the "could not determine" (null) message');
      } finally {
        cleanup();
      }
    });
```
Case 8 (lines 347-373) does not change. Its three assertions are the contract (parent criterion
"Test 8 passes, for its stated reason").

#### Dependencies / Called by / Error handling
- No new `require`. `assert` is already `node:assert` (line 26).
- Run by `npm test` (see Wiring).
- A fixture git command that fails still throws from `execFileSync`, and the case fails loudly.
  On git older than 2.28, `--initial-branch` is refused with a usage error, which is also loud.

#### Cross-platform notes
- Argv arrays only. `os.devNull` is already used. No path is built by hand.

### File: `tests/quality-agent-coverage-holes.test.js`
**Action:** MODIFY
**Purpose:** The bare remote the auto-push cases share starts on `main`, so its one clone checks out `main` whatever the machine's default branch.
**Change Type:** modify-existing (fixture argument)

#### Change (Step 10)
- JSDoc at lines 267-270. After "everything committed and pushed." add the sentence: "The bare
  repository's HEAD names `main` as well, so a clone of it checks out `main`."
- Lines 281-282 today:
  ```js
    const bare = mkTmp('ctoc-qa-bare-');
    gitIn(bare, ['init', '-q', '--bare']);
  ```
  They become:
  ```js
    const bare = mkTmp('ctoc-qa-bare-');
    // The bare repository starts on `main` by name (plan the-test-suite-passes-on-a-clean-machine).
    // The outside contract: `git init` names the branch `init.defaultBranch` sets, and `master`
    // when nothing sets it, so a plain `git init --bare` followed the machine, not this fixture.
    // Only `main` is pushed here, so on a machine without that setting the one case that clones
    // this remote (the rejected push) landed on an unborn `master`, and its own
    // `git push origin main` failed with "src refspec main does not match any" before the
    // quality agent ran. Why the fixture and not the code: the agent was never reached. What
    // newly fails: nothing; no assertion changes, and every case that uses this helper now
    // reaches its assertions whatever the machine's default branch.
    gitIn(bare, ['init', '-q', '--bare', '--initial-branch=main']);
  ```
- Nothing else changes. Callers of the helper: lines 928, 1042, 1061, 1102, 1132, 1152, 1184 and
  1295 (pattern `makeRepoWithRemote\(` in this file). Only line 1107 clones the remote (pattern
  `clone` in this file). The others push from the fixture's own `main` (line 280), and
  `bareMain` reads `refs/heads/main` by name (line 290). None of them changes behaviour.

#### Error handling
- A failing git command throws from `execFileSync` (loud). Under every configuration the
  rejected-push case reaches its own assertions on lines 1118-1127.

### File: `tests/step-13-verify.test.js`
**Action:** MODIFY
**Purpose:** Case 7's fixture names the reporter that colours, so the case covers the colour cause on a Node whose default for piped output is TAP.
**Change Type:** modify-existing (fixture argument)

#### Change (Step 10)
Lines 327-331 today:
```js
    // Cross-platform `|| true`: a node wrapper, not a shell operator.
    write('run-tests.js',
      "const { spawnSync } = require('node:child_process');\n"
      + "spawnSync(process.execPath, ['--test', 'suite.test.js'], { stdio: 'inherit' });\n"
      + "process.exit(0); // the exit-0 liar: swallow the child's real exit code\n");
```
They become:
```js
    // Cross-platform `|| true`: a node wrapper, not a shell operator.
    //
    // The runner names its reporter (plan the-test-suite-passes-on-a-clean-machine). The outside
    // contract: node picks its default reporter itself, and on Node 22.23.1 with standard output
    // piped (runVerify pipes `npm test`) it picked TAP, which carries no colour, so the
    // escape-byte check below failed before anything was tested. package.json
    // (`engines.node >= 18`) does not fix that default. Why the fixture and not the code: the
    // parser reads both reporters (cases 1-3); this fixture relied on a default. `spec` is the
    // reporter that colours, which is the cause this case covers. What newly fails: nothing; the
    // escape-byte check is unchanged and still fails loudly on a node whose spec reporter does
    // not colour piped output.
    write('run-tests.js',
      "const { spawnSync } = require('node:child_process');\n"
      + "spawnSync(process.execPath, ['--test', '--test-reporter=spec', 'suite.test.js'], { stdio: 'inherit' });\n"
      + "process.exit(0); // the exit-0 liar: swallow the child's real exit code\n");
```
The assertions on lines 362-388 do not change, including the escape-byte check on lines 375-379.
The comment's statement about Node 22.23.1 is written only after the Step 9 reporter probe has
confirmed it.

#### Error handling
- A Node without `--test-reporter` (18.0-18.14) exits with a bad-option error. The fixture suite
  never runs, and the case fails loudly at "the fixture suite did not really run" (line 363).

### File: `tests/readme-numbers.test.js`
**Action:** MODIFY
**Purpose:** The docs count matches the 21 files on disk, and the README's docs entry is checked for the first time.
**Change Type:** modify-existing (one literal and title; one case appended)

#### Change a (Step 10): the ground-truth count
Lines 202-204 today:
```js
  it('docs/: 20 docs files (LH1 added SECURITY_LINT.md; ENFORCEMENT, FENCES, PROJECT_REFERENCE, OPERATING_LESSONS moved out of CLAUDE.md)', () => {
    assert.equal(countDocsFiles(), 20);
  });
```
They become:
```js
  // 20 -> 21 (plan the-test-suite-passes-on-a-clean-machine). The outside contract: docs/ holds
  // 21 `.md` files directly; the 21st is docs/UPDATING.md, how this fork pulls new CTOC code and
  // makes a running session use it. Why the test and not the tree: the count is a claim about
  // the tree, and the tree is right. What newly fails: a docs/ holding other than 21 files,
  // exactly as before; the README pin in section 2 now fails with it.
  it('docs/: 21 docs files (UPDATING.md added: how this fork pulls new CTOC code; LH1 added SECURITY_LINT.md; ENFORCEMENT, FENCES, PROJECT_REFERENCE, OPERATING_LESSONS moved out of CLAUDE.md)', () => {
    assert.equal(countDocsFiles(), 21);
  });
```

#### Change b (Step 8): the README docs entry is pinned
Insert directly after the case `'Project structure: 18 Claude Code hooks'` (lines 310-312), inside
`describe('README — explicit numeric claims match reality', …)`:
```js
  // Added by plan the-test-suite-passes-on-a-clean-machine. The project-structure block's docs/
  // entry said "20 docs" and left out UPDATING.md, and no test read it. The outside contract:
  // this file's rule that the README's counts are a claim about the tree. What newly fails: a
  // docs/ entry whose count is not 21, or whose names are not exactly the `.md` files under
  // docs/, each once.
  it('Project structure: 21 docs, naming every docs/*.md file exactly once', () => {
    // The tree's entry prefix, written as escapes: a branch and two horizontal box-drawing characters.
    const ENTRY = '├── ';
    const start = README.indexOf(`${ENTRY}docs/`);
    assert.notEqual(start, -1, 'the README project-structure block must hold a docs/ entry');
    const end = README.indexOf(`${ENTRY}src/`, start);
    assert.ok(end > start, 'the docs/ entry must be followed by the src/ entry');
    const entry = README.slice(start, end);
    assert.match(entry, /docs\/\s+21 docs:/);
    const named = (entry.match(/[A-Za-z0-9_]+\.md/g) || []).sort();
    const onDisk = fs.readdirSync(path.join(ROOT, 'docs')).filter((f) => f.endsWith('.md')).sort();
    assert.deepEqual(named, onDisk,
      'the docs/ entry must name each docs/*.md file exactly once, and nothing else');
  });
```
One `deepEqual` over the sorted name lists covers all three ways the entry can be wrong: a
missing name, a name listed twice, and a name with no file. `fs`, `path`, `ROOT` and `README` are
already defined (lines 15, 16, 20, 21). The same `fs.readdirSync(path.join(ROOT, 'docs'))`
expression is already used at line 91, so lint treats the new line the same way.

### File: `README.md`
**Action:** MODIFY
**Purpose:** The project-structure block states the true docs count and names all 21 files.
**Change Type:** modify-existing (two lines inside the existing fenced block)

#### Change (Step 10)
- Line 1121: replace `20 docs:` with `21 docs:`. Nothing else on the line changes.
- Line 1124: after `CONTINUOUS_IMPROVEMENT.md,` append ` UPDATING.md,` (a space, the name and a
  comma). The line becomes the two names it holds today, followed by `UPDATING.md,`.
- No line is added or removed, and the block's tree characters are left as they are. Redrawing
  the block is out of scope (parent plan, "Out of Scope").

### Run environments and probes (used by Steps 8, 9 and 14)

`$SCRATCH` below is the executor session's own scratch folder, outside the repository. Nothing
in it is committed. Every command runs on this Linux sandbox. These are build steps, not
shipped code.

**Git environments.** They copy the owner's global git configuration and change only the copies.
Run them from `$SCRATCH`, so that no repository's local configuration is read:
```bash
cd "$SCRATCH"
git config --show-origin --get-all init.defaultBranch; echo "levels exit $?"
git config --system --get init.defaultBranch; echo "system exit $?"
for c in unset master main; do cp "$HOME/.gitconfig" "$SCRATCH/gitconfig-$c"; done
git config --file "$SCRATCH/gitconfig-unset" --unset-all init.defaultBranch; echo "unset-all exit $?"
git config --file "$SCRATCH/gitconfig-master" init.defaultBranch master
git config --file "$SCRATCH/gitconfig-main" init.defaultBranch main
for c in unset master main; do
  GIT_CONFIG_GLOBAL="$SCRATCH/gitconfig-$c" git config --get init.defaultBranch; echo "$c exit $?"
done
```
Expected: `unset` prints nothing and exits 1, `master` prints `master`, `main` prints `main`.
`--unset-all` exits 5 when the key is already absent; record that and continue. If the system
level also sets the key, also copy the system file (`git config --system --list --show-origin`
names it). Remove the key in that copy and add `GIT_CONFIG_SYSTEM="$SCRATCH/gitconfig-system-unset"`
to every run. If `$HOME/.gitconfig` does not exist, use an empty file for the three copies.
`GIT_CONFIG_GLOBAL` replaces both `~/.gitconfig` and `~/.config/git/config`.

**Empty-delta probe** (`$SCRATCH/probe-empty-delta-clone.js`). The block between BEGIN and END is
copied verbatim from `tests/test-selection-scope.test.js`: lines 52-70, 72-95, 97-101 and 114-134
as they stand before the fix. After Step 10, change only the probe's `git(['init', '--bare'], remote);`
line so that it matches the fixed fixture. The usage line is
`node "$SCRATCH/probe-empty-delta-clone.js" /projects/ctoc/ctoc`.
```js
'use strict';
// Empty-delta probe: a throwaway in the executor's scratch folder, never committed.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');

const ROOT = process.argv[2];
if (!ROOT || !fs.existsSync(path.join(ROOT, 'src', 'lib', 'quality-agent.js'))) {
  process.stderr.write('usage: node probe-empty-delta-clone.js <repository root>\n');
  process.exit(2);
}
const qualityAgent = require(path.join(ROOT, 'src', 'lib', 'quality-agent.js'));

// ---- BEGIN verbatim copy from tests/test-selection-scope.test.js
function mkTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
function rm(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
}
function git(args, cwd) {
  return cp.execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'ctoc-test', GIT_AUTHOR_EMAIL: 'ctoc@test.invalid',
      GIT_COMMITTER_NAME: 'ctoc-test', GIT_COMMITTER_EMAIL: 'ctoc@test.invalid',
      GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_SYSTEM: os.devNull
    }
  }).trim();
}

/** Capture console.log output while fn runs; always restore. */
async function captureLog(fn) {
  const orig = console.log;
  const lines = [];
  console.log = (...a) => lines.push(a.map(String).join(' '));
  let res;
  try {
    res = await fn();
  } finally {
    console.log = orig;
  }
  return { res, out: lines.join('\n') };
}

/** Run fn with cwd temporarily set to dir; always restore. */
async function withCwd(dir, fn) {
  const orig = process.cwd();
  process.chdir(dir);
  try {
    return await fn();
  } finally {
    process.chdir(orig);
  }
}

const NODE = process.execPath;
// A node one-liner that prints a runner summary the parser reads as 3 pass / 0 fail —
// identical on every platform. runFullTests / runSpecificTests run this via the real
// child_process, so a green here PROVES the runner actually executed.
const GREEN = `"${NODE}" -e "console.log('# pass 3'); console.log('# fail 0')"`;

// A local "remote" cloned into a working copy whose HEAD == @{upstream}: git works and
// the push delta @{upstream}..HEAD is GENUINELY empty (`[]`, not null).
function makeEmptyDeltaClone(prefix) {
  const remote = mkTmp(prefix + 'remote-');
  git(['init', '--bare'], remote);
  const seed = mkTmp(prefix + 'seed-');
  git(['init'], seed);
  fs.writeFileSync(path.join(seed, 'app.js'), 'module.exports = 1;\n');
  git(['add', '-A'], seed);
  git(['commit', '-m', 'seed'], seed);
  git(['branch', '-M', 'main'], seed);
  git(['remote', 'add', 'origin', remote], seed);
  git(['push', '-u', 'origin', 'main'], seed);
  rm(seed);
  // Clone into a fresh child dir so HEAD tracks origin/main at the same commit — the
  // push delta @{upstream}..HEAD is then genuinely empty.
  const parent = mkTmp(prefix + 'parent-');
  const checkout = path.join(parent, 'checkout');
  git(['clone', remote, checkout], parent);
  return { workdir: checkout, cleanup: () => { rm(parent); rm(remote); } };
}
// ---- END verbatim copy

/** git with the same isolated configuration as git() above; reports a failure instead of throwing. */
function probeGit(args, cwd) {
  const r = cp.spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_SYSTEM: os.devNull }
  });
  return { args: args.join(' '), status: r.status, stdout: String(r.stdout || '').trim(), stderr: String(r.stderr || '').trim() };
}

async function runIn(dir) {
  return (await withCwd(dir, () => captureLog(() => qualityAgent.runSmartTests({ js: { test: GREEN } })))).out;
}

(async () => {
  const report = { node: process.version, git: probeGit(['--version'], os.tmpdir()).stdout };
  const { workdir, cleanup } = makeEmptyDeltaClone('ctoc-probe-empty-');
  try {
    const remote = probeGit(['remote', 'get-url', 'origin'], workdir).stdout;
    report.remoteHead = probeGit(['symbolic-ref', 'HEAD'], remote);
    report.remoteBranches = probeGit(['for-each-ref', '--format=%(refname)', 'refs/heads'], remote);
    report.cloneHead = probeGit(['symbolic-ref', 'HEAD'], workdir);
    report.cloneRevParseHead = probeGit(['rev-parse', 'HEAD'], workdir);
    report.cloneUpstream = probeGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], workdir);
    report.emptyOut = await runIn(workdir);
  } finally {
    cleanup();
  }
  // Mirrors case 8's null path: a fresh non-git directory, nothing written into it.
  const nogit = mkTmp('ctoc-probe-nogit-');
  try {
    report.nullOut = await runIn(nogit);
  } finally {
    rm(nogit);
  }
  report.emptyPrintedCouldNotDetermine = report.emptyOut.includes('Could not determine the push delta');
  report.emptyPrintedNoDelta = report.emptyOut.includes('Git reports no delta for this push');
  report.nullPrintedCouldNotDetermine = report.nullOut.includes('Could not determine the push delta');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
})().catch((err) => {
  process.stderr.write(`probe failed: ${err && err.stack ? err.stack : err}\n`);
  process.exitCode = 1;
});
```

**Reporter probe** (`$SCRATCH/reporter-probe/`). It holds two files: a suite with the same two
tests as case 7's fixture, and a runner that starts it twice with standard output piped, once on
Node's default reporter and once with `--test-reporter=spec`. Run it from that folder.
```js
// $SCRATCH/reporter-probe/suite.test.js
const test = require('node:test');
const assert = require('node:assert');
test('a real passing test', () => { assert.strictEqual(1, 1); });
test('a real FAILING test', () => { assert.strictEqual(2 + 2, 5); });
```
```js
// $SCRATCH/reporter-probe/probe.js: a throwaway, never committed.
'use strict';
const { spawnSync } = require('node:child_process');
const env = { ...process.env, FORCE_COLOR: '3' };
delete env.NO_COLOR;
delete env.NODE_TEST_CONTEXT;
const ESC = String.fromCharCode(27);
const strip = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');
for (const args of [['--test', 'suite.test.js'], ['--test', '--test-reporter=spec', 'suite.test.js']]) {
  // stdio is piped (the spawnSync default), as it is under runVerify's `npm test`.
  const r = spawnSync(process.execPath, args, { cwd: __dirname, env, encoding: 'utf8' });
  const out = String(r.stdout || '');
  const plain = strip(out);
  process.stdout.write(`${JSON.stringify({
    args: args.join(' '),
    status: r.status,
    firstLine: plain.split('\n')[0],
    hasEscape: out.includes(ESC),
    tapFail1: /^# fail 1$/m.test(plain),
    specFail1: /^\s*ℹ fail 1\s*$/m.test(plain)
  })}\n`);
}
```

**Temp-folder measurement** (final whole-suite run, Step 14):
```bash
MEASURE="$(mktemp -d "$HOME/ctoc-tmp-measure.XXXXXX")"
cd /projects/ctoc/ctoc
GIT_CONFIG_GLOBAL="$SCRATCH/gitconfig-unset" TMPDIR="$MEASURE" npm test > "$SCRATCH/final.log" 2>&1; echo "npm test exit $?"
du -s --block-size=1 "$MEASURE"                      # bytes allocated on disk (includes the folder itself)
du -sb "$MEASURE"                                    # apparent bytes
find "$MEASURE" -mindepth 1 -maxdepth 1 | wc -l      # entries directly in the folder
find "$MEASURE" -mindepth 1 | wc -l                  # entries at any depth
find "$MEASURE" -mindepth 1 -maxdepth 1 -exec du -s --block-size=1 {} + | sort -rn | head -10
```
The record names the folder home-relative (`$HOME/ctoc-tmp-measure.<suffix>`) and lists the ten
largest entries by base name and size. An absolute home path does not go into a tracked file.
The folder is left in place, and deleting it waits for the owner's word (`CLAUDE.md`, Privacy:
recursive deletes wait for an explicit request).

**Long runs.** Follow Operating Lesson 20. Run `npm test` in the foreground with a timeout of up
to 10 minutes. If it can take longer and this build was started in the background, start it with
`run_in_background` and end the turn. Never wait in a loop that sleeps and checks.

### Wiring — the live call sites

This slice adds no module, no export and no call. What runs the changed files:
- The four test files are run by `npm test`. `package.json` `scripts.test` is
  `node src/scripts/test-gate.js --experimental-test-coverage`. `resolveTestFiles`
  (`src/scripts/test-gate.js:265`) lists every `tests/*.test.js`, and the gate starts them at
  `:424-428`. That script is the root.
- The same suite produces the evidence the menu reads when deciding whether a build is done.
  `completeExecution` calls `persistVerifyResult(root, planSlug)` (`src/lib/actions.js:1378`,
  defined at `src/lib/step-13-verify.js:1020`), which runs `runVerify` and with it the project's
  `npm test`.
- `README.md` is read by people and by `tests/readme-numbers.test.js:21`.
- Code the changed tests now reach: case 6 reaches the empty-delta branch of `runSmartTests`
  (`src/lib/quality-agent.js:1240-1243`), which it missed on any machine whose git
  defaulted to `master` inside the isolated helper, and that means every machine.

### Test Plan

### Tests: the four changed files
**Action:** MODIFY
**Framework:** `node:test` with `node:assert` (`tests/test-selection-scope.test.js`) or `node:assert/strict` (the other three), as each file already uses.

#### Cases and their expected states
1. **Case 6, tightened** (`tests/test-selection-scope.test.js`). Red after Step 8 under any
   environment, at the "Git reports no delta" assertion. Its message quotes captured output that
   holds "Could not determine the push delta". Green after Step 10.
2. **Case 8, unchanged.** Red before Step 10, green after, under all three git environments.
3. **Rejected push, unchanged** (`tests/quality-agent-coverage-holes.test.js:1100-1128`). Before
   Step 10: red under `unset` and `master` ("src refspec main does not match any"), green under
   `main`. After Step 10: green under all three. So is every other case in the file.
4. **Case 7, unchanged assertions** (`tests/step-13-verify.test.js:311-389`). Before: red at the
   escape-byte check, with printed output starting `TAP version 13`. After: green, and the
   captured output holds escape bytes.
5. **Docs count** (`tests/readme-numbers.test.js:202`). Before: red (`21 !== 20`). After: green
   at 21.
6. **README pin, appended in Step 8.** Red after Step 8, because the entry says `20 docs:` and
   leaves out `UPDATING.md`. Green after the README edit.
7. **Guards that must stay green before and after:** cases 1-5, 7, 9 and 10 of
   test-selection-scope, every other case in the four files, and the whole suite.

#### Coverage targets
- The suite floor `.ctoc/coverage-baseline.json` `minPct` (99) holds. `src/` does not change, and
  case 6 now covers `src/lib/quality-agent.js:1240-1243`, which it missed before.
- Error paths: the README pin's two structural assertions fail loudly when the block changes
  shape. They never return early.

### Security Review
- [x] **Command injection:** each fixture change adds one argv element (`--initial-branch=main`,
  `--test-reporter=spec`) to an existing `execFileSync`/`spawnSync` call with no shell. No
  string reaches a shell.
- [x] **Path traversal:** the README pin reads `README.md`, which is already read at line 21, and
  lists `docs/` under `ROOT`. Both are read only.
- [x] **Input validation:** the README pin asserts the entry exists and is followed by `src/`
  before it slices.
- [x] **No secrets or personal data in the record:** the scratch copies of `~/.gitconfig` hold the
  owner's name and email. They stay in the scratch folder and are never printed, quoted or
  committed. The record carries only the `git config --get init.defaultBranch` results. The
  measurement folder is named home-relative.
- [x] **Safe file operations:** the owner's configuration is changed only through
  `git config --file <copy>`, never `--global`. The probes write only into `os.tmpdir()` and the
  scratch folder, and they clean up their own temporary repositories.
- [x] **Regex safety:** `/[A-Za-z0-9_]+\.md/g` and `/docs\/\s+21 docs:/` are linear.
- [x] **Prototype pollution:** none. No object is merged from input.
- [x] **No network:** every git remote is a local bare repository.
- [x] **Irreversible actions:** none. No commit, push or recursive delete is made by this slice,
  and the measurement folder is left in place.

### Architecture checks
| Check | Result |
|---|---|
| Dependency direction | tests only; no `src/` file changes |
| No framework coupling | no hook or command imported |
| Open/closed | arguments added to existing calls; no fixture is restructured |
| Test independence | each case still makes and removes its own temporary repositories; the README pin reads files only |
| Cross-platform | argv arrays and `path.join` only; `--initial-branch` and `--test-reporter` behave the same on Windows, macOS and Linux |

## Implementation Order
1. MODIFY `tests/test-selection-scope.test.js` change b and `tests/readme-numbers.test.js` change b (the tightenings), seen red (Step 8; depends on nothing).
2. MODIFY `tests/test-selection-scope.test.js` change a (Step 10; after the empty-delta probe confirmed the cause).
3. MODIFY `tests/quality-agent-coverage-holes.test.js` (Step 10; after the three-environment run confirmed the cause).
4. MODIFY `tests/step-13-verify.test.js` (Step 10; after the reporter probe confirmed TAP and spec colour).
5. MODIFY `tests/readme-numbers.test.js` change a, then `README.md` (Step 10).

## Acceptance Criteria
- [x] Every failure is seen first. On the untouched tree, with the temp folder on disk and `init.defaultBranch` unset for the run (the owner's own configuration unchanged), `npm test`'s failing entries are recorded by file and name. They are the four tests plus their enclosing blocks, and any other failure stops the build.
- [x] The cause of test 8 is confirmed before it is fixed. With the unchanged fixture, the probe shows that `git rev-parse HEAD` fails in the clone and that the run printed "Could not determine the push delta". Otherwise the build stops and reports.
- [x] Test 8 passes, for its stated reason. After the fix the probe shows the empty-delta run printing "Git reports no delta for this push" and the non-git run printing "Could not determine the push delta", and test 8 passes with its assertions unchanged.
- [x] Test 6 reaches the branch its title names. It asserts the "no delta" line and the absence of "Could not determine", it passes, and the reason is recorded in the code.
- [x] The rejected-push test holds under any default branch. It passes under `init.defaultBranch` unset, `master` and `main`, and so does every other case in `tests/quality-agent-coverage-holes.test.js`.
- [x] The colour test covers colour on this Node. On Node v22.23.1 with output piped, case 7's captured output holds escape bytes, the check at line 376 is unchanged, and the test passes. The fixture names its reporter.
- [x] The docs count matches the disk. `tests/readme-numbers.test.js` asserts 21 and its title names `UPDATING.md`. The README entry says `21 docs` and names each of the 21 files exactly once.
- [x] No test is weakened. Each changed test asserts at least what it asserted before, and each change carries the three-part reason from Operating Lesson 14.
- [x] The whole suite passes on a clean machine. With this change, `init.defaultBranch` unset and `TMPDIR` on disk, `npm test` reports 0 failures and `0 skipped` at the floor in `.ctoc/coverage-baseline.json`, and `npx eslint .` passes.
- [x] The temp-folder use is measured. For a fresh, empty `TMPDIR`, the record states the bytes and the number of entries left behind and the ten largest entries by name, and says that the peak was not measured. A nonzero amount is reported as a finding for a follow-up plan.

## Acceptance Criteria Mapping

| Criterion | Implemented in | Test case / evidence |
|---|---|---|
| Every failure is seen first | Step 8 baseline run under the `unset` environment | the baseline log's failing entries, quoted in the record |
| Cause of test 8 confirmed first | Step 9 empty-delta probe, before the fix | probe report: `cloneRevParseHead.status` nonzero, `emptyPrintedCouldNotDetermine` true |
| Test 8 passes for its stated reason | `makeEmptyDeltaClone` change a | case 8 green; post-fix probe report: `emptyPrintedNoDelta` true, `nullPrintedCouldNotDetermine` true; case 6's new assertions (same fixture, same call) |
| Test 6 reaches its branch | case 6 change b | case 6 red after Step 8, green after Step 10 |
| Rejected push under any default branch | `makeRepoWithRemote` change | the file run under `unset`, `master` and `main`, before (red, red, green) and after (green, green, green) |
| Colour test covers colour | `run-tests.js` names `--test-reporter=spec` | Step 9 reporter probe; case 7 green with line 376 unchanged |
| Docs count matches the disk | readme-numbers change a, README lines 1121 and 1124 | ground-truth case at 21; README pin (change b) |
| No test weakened | every change | Step 11 diff review: no `assert` line removed or loosened, reasons present |
| Whole suite passes on a clean machine | all of the above | Step 14 final run log: 0 failures, `0 skipped`, coverage at or above 99; `npx eslint .` exit 0 |
| Temp-folder use measured | Step 14 measurement commands | the figures in `## Execution Record` |

## Risk Mitigations

| Risk | Mitigation | Where |
|---|---|---|
| The owner's `~/.gitconfig` sets `main`, so a normal run hides the rejected-push failure | Every run that needs "unset" or "master" uses `GIT_CONFIG_GLOBAL` pointing at a scratch copy; the owner's file is read, never written | Run environments; Steps 8, 9, 14 |
| The test 8 cause is wrong | The empty-delta probe runs before the fix, with a stop condition | Step 9 |
| The spec reporter does not colour piped output on Node 22.23.1 | The reporter probe runs before the fix; if it has no escape byte, stop and report and leave `tests/step-13-verify.test.js` unchanged | Step 9 |
| Git older than 2.28 rejects `--initial-branch` | Accepted: CTOC already needs 2.36 (`src/commands/start.md:242`), and the failure is a loud usage error. `symbolic-ref` stays the recorded fallback | Decisions 2 |
| Node reports the four enclosing blocks and the four file entries as failed too | Counted with their failing test, not as other failures | Decisions 10; Step 8 |
| The menu's own VERIFY run inherits the menu's temp folder. If that is the 256 MB `/tmp`, the recorded run can fail for space, which this plan does not fix (reducing temp use is out of scope) | The build's own whole-suite run uses `TMPDIR` on disk. If the recorded run fails for space, that is reported plainly with its log line and never worked around | Step 14; `## Execution Record` |
| Line numbers have moved since planning | Step 9 re-reads every cited line; the current text wins | Step 9 |
| The docs count goes stale again | Accepted as the functional plan decided; the README pin now fails together with the count, so both are seen | readme-numbers change b |
| A copied probe differs from the fixture | The reviewer compares the probe's BEGIN/END block with the test file, before and after the fix | Step 11 |

## Decisions Taken Under Ambiguity

1. **One slice.** The whole-suite check, and the build's own VERIFY, can pass only when all four
   fixes are present. Split slices would record failing runs for reasons outside their own change.
2. **`--initial-branch=main` rather than `git symbolic-ref`.** It is one argument that states the
   branch where the repository is made. CTOC already needs git 2.36, and on older git it fails
   loudly. `symbolic-ref HEAD refs/heads/main` is the fallback if older git must ever be supported.
3. **Only the bare remotes change.** The seed and fixture repositories already name their branch
   with `git branch -M main`. The six other test files with a bare remote stay out of scope, as
   the functional plan says.
4. **No extra fixture guard assertions.** Once the branch is named, a bare remote whose HEAD
   names `master` cannot be made on any git that accepts the flag, so a guard could never fire.
   Case 6's new assertions catch a regression of the empty-delta fixture.
5. **Case 8 is not touched.** The parent criterion requires its assertions unchanged. The
   evidence for its stated reason comes from the post-fix probe, and from case 6 on the same
   fixture and call.
6. **The reporter is named in the fixture's argv, as `spec`.** It is visible where it matters,
   reaches only that one node, and matches the existing tests that name a reporter. `spec` because
   the case covers the colour cause, and the spec reporter is the one that colours.
7. **A README check is appended to `tests/readme-numbers.test.js`.** It is a tightening in a
   declared file. It turns the criterion "the README says 21 docs and names each file once" into
   a test, using the literal 21 the brief asked for and the names on disk. The entry prefix is
   written as Unicode escapes, so no box-drawing character appears in new text.
8. **`UPDATING.md` goes on README line 1124.** That line is the shortest in the entry, so the
   block keeps its width and gains no line.
9. **Git environments come from copies of the owner's global configuration**, changed with
   `git config --file`. All other settings (`safe.directory`, user name and email,
   `core.excludesFile`) stay as he has them, so only the default branch differs between runs.
10. **Failing entries are counted with their parent test.** Node marks a block, and in TAP the
    file's own entry, as failed when a test inside it fails. Those entries belong to the four
    expected failures. Only a failing test outside them stops the build.
11. **The peak temp-folder size is not measured.** A sampler running beside the suite adds disk
    load to a run that must show 0 flaky tests, and it would be a polling loop. The functional
    plan allows "not measured", and a follow-up plan can measure the peak in isolation.
12. **Bytes are reported both as allocated on disk (`du --block-size=1`) and as apparent
    (`du -b`).** Allocated bytes are what fill a small `/tmp`.
13. **The measurement folder is left in place.** Deleting it waits for the owner (CLAUDE.md
    Privacy). The baseline run uses `$HOME/ctoc-tmp`, the folder the brief already used, so only
    one new folder is left behind.
14. **The probes live in the executor's scratch folder.** They are quoted in the record and never
    committed. No test file is added for them, because they confirm a cause once and test no
    behaviour.
15. **No project template or production-readiness checklist applies.** These are CTOC's own tests,
    and the parent declares no project type.
16. **Out of scope, unchanged:** the "git is unavailable" wording for an unborn HEAD
    (`src/lib/quality-agent.js:1234`, `:1598`), the reporter comment at
    `src/lib/step-13-verify.js:79-80`, and deriving the docs count from disk.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [x] Record the starting state in `## Execution Record`: `node --version`, `git --version`, `git -C /projects/ctoc/ctoc rev-parse HEAD`, and the output of `git -C /projects/ctoc/ctoc status --porcelain -- tests/test-selection-scope.test.js tests/quality-agent-coverage-holes.test.js tests/step-13-verify.test.js tests/readme-numbers.test.js README.md`, which must be empty. If any of the five files differs from HEAD, stop and report: the first criterion needs an untouched tree.
- [x] Build the three git environments ("Run environments and probes") and record the three `git config --get init.defaultBranch` results and the levels report.
- [x] Run the whole suite on the untouched tree under the `unset` environment, with the temp folder on disk: `mkdir -p "$HOME/ctoc-tmp"`, then `GIT_CONFIG_GLOBAL="$SCRATCH/gitconfig-unset" TMPDIR="$HOME/ctoc-tmp" npm test > "$SCRATCH/baseline.log" 2>&1`, and record the exit code. Follow Lesson 20 if the run is long.
- [x] List every failing entry from the log by file and name. Use the TAP lines matching `^\s*not ok ` and their nesting under each file's own entry, or the spec reporter's closing list if spec was printed. The expected entries (Decision 10 covers the enclosing blocks):
  ```text
  tests/test-selection-scope.test.js
    8. "no delta" ([]) and "could not determine" (null) log different messages
    (block) test selection uses the real push delta, never HEAD~1 (plan 00208)
  tests/quality-agent-coverage-holes.test.js
    a push the remote rejects is recorded as "push-failed" with the tested commit
    (block) main(): a refused automatic push is recorded as a fixed code, and the opening screen shows it
  tests/step-13-verify.test.js
    case 7: VERIFY over a suite with a REAL failure, under FORCE_COLOR=3, does not certify
    (block) X3 — end to end, real node --test, real colour
  tests/readme-numbers.test.js
    docs/: 20 docs files (LH1 added SECURITY_LINT.md; ENFORCEMENT, FENCES, PROJECT_REFERENCE, OPERATING_LESSONS moved out of CLAUDE.md)
    (block) Ground truth — project counts (sanity checks)
  ```
  Any other failing test: stop, report it with its message, and fix nothing.
- [x] Quote from the same log: the rejected-push failure's git text (expected: `src refspec main does not match any`), case 7's printed output (expected to begin with `TAP version 13`, with no escape byte), the docs-count message (expected: actual 21, expected 20), and the gate's summary lines (fail, skipped, coverage).
- [x] Write the two tightenings: `tests/test-selection-scope.test.js` change b (case 6) and `tests/readme-numbers.test.js` change b (the README check). Change nothing else yet.
- [x] Run the two files under the `unset` environment: `GIT_CONFIG_GLOBAL="$SCRATCH/gitconfig-unset" TMPDIR="$HOME/ctoc-tmp" node --test tests/test-selection-scope.test.js tests/readme-numbers.test.js`. Expected red: case 6 at the "Git reports no delta" assertion, with output quoting "Could not determine the push delta"; case 8; the README check; the docs count. Every other case in the two files must be green. A tightened case that passes here does not test the change: fix the test, not the source.

### Step 9: PREPARE
- [x] Re-read the five files and confirm the cited lines: `tests/test-selection-scope.test.js` 52-70, 72-95, 97-101, 114-134, 304-315 and 347-373; `tests/quality-agent-coverage-holes.test.js` 267-286 and 1100-1128; `tests/step-13-verify.test.js` 327-331 and 375-379; `tests/readme-numbers.test.js` 202-204 and 310-312; `README.md` 1121-1126. Where a line has moved, use the current text and note it.
- [x] Confirm the test 8 cause with a real run, before any fix (criterion 2). Write the empty-delta probe with the unchanged fixture and run it under the `unset` environment. Record the whole JSON report. Expected: `remoteHead.stdout` is `refs/heads/master`, `remoteBranches.stdout` is `refs/heads/main`, `cloneHead.stdout` is `refs/heads/master`, `cloneRevParseHead.status` is nonzero, `emptyPrintedCouldNotDetermine` is true, and `nullPrintedCouldNotDetermine` is true. If `cloneRevParseHead.status` is 0 or `emptyPrintedCouldNotDetermine` is false, stop: report the observed values and write no fix.
- [x] Confirm the rejected-push cause: run `node --test tests/quality-agent-coverage-holes.test.js` under each environment, with `GIT_CONFIG_GLOBAL="$SCRATCH/gitconfig-<c>"` and `TMPDIR="$HOME/ctoc-tmp"`, saving each log to the scratch folder. Expected: `unset` and `master` red at the rejected-push case with `src refspec main does not match any`, and `main` green. Any other pattern means the cause differs: stop and report.
- [x] Confirm the reporter cause, and that the fix can work, with the reporter probe. Expected: the default run's `firstLine` is `TAP version 13`, `hasEscape` is false and `tapFail1` is true; the spec run's `hasEscape` is true and `specFail1` is true. If the default run is not TAP, the cause differs: stop and report. If the spec run has no escape byte, this plan's fix cannot make case 7 pass on this Node: stop, report it, and leave `tests/step-13-verify.test.js` unchanged.
- [x] Confirm by search that nothing under `src/` rewrites the README docs entry (pattern `\d+ docs|docs/\s+|countDocs` over `src/`; the planner found 0 files) and that no file outside `tests/readme-numbers.test.js` checks it (pattern `20 docs|21 docs|UPDATING\.md` over `tests/`). Quote both patterns and their counts in the record.

### Step 10: IMPLEMENT
- [x] `tests/test-selection-scope.test.js` change a: `--initial-branch=main` on the bare remote, and its reason comment.
- [x] `tests/quality-agent-coverage-holes.test.js`: `--initial-branch=main` in `makeRepoWithRemote`, its reason comment, and the JSDoc sentence.
- [x] `tests/step-13-verify.test.js`: `--test-reporter=spec` in the fixture's argv, and its reason comment.
- [x] `tests/readme-numbers.test.js` change a: 21, the new title and its reason comment.
- [x] `README.md`: `21 docs:` on line 1121 and ` UPDATING.md,` appended to line 1124.
- [x] Nothing else. No file under `src/` changes, and no assertion other than the docs literal changes.

### Step 11: REVIEW
- [x] The reviewer reads the diff of each test file and confirms: no `assert` line is removed or loosened; the only existing assertion that changes is the docs literal, 20 to 21; each change carries the three-part reason (outside contract, why the test and not the code, what newly fails); the README entry says `21 docs:` and names 21 files, each once; the probe's BEGIN/END block matches the test file before and after the fix, apart from the one `init` line.

### Step 12: OPTIMIZE
- [x] Compare the four files' run times in the baseline log and the final log (each file entry's `duration_ms` in TAP, or the spec reporter's per-file time) and record them. No change is expected: the edits add two output checks, one README scan and two argv entries.

### Step 13: SECURE
- [x] The security scanner checks that the two fixture arguments reach `execFileSync`/`spawnSync` as argv with no shell; that no copied git configuration, name or email appears in the plan, the record or any tracked file; that the record names the measurement folder home-relative; and that no probe file sits inside the repository.

### Step 14: VERIFY
- [x] Run `node --test tests/test-selection-scope.test.js tests/quality-agent-coverage-holes.test.js` under each of the three environments, with `TMPDIR="$HOME/ctoc-tmp"`. All three must be green with 0 failures.
- [x] Re-run the empty-delta probe with its `init` line matching the fixed fixture, under the `unset` environment. Expected: `remoteHead.stdout` is `refs/heads/main`, `cloneHead.stdout` is `refs/heads/main`, `cloneRevParseHead.status` is 0, `cloneUpstream.stdout` is `origin/main`, `emptyPrintedNoDelta` is true, `emptyPrintedCouldNotDetermine` is false, and `nullPrintedCouldNotDetermine` is true. Record the report.
- [x] Run the final whole suite with the measurement commands ("Temp-folder measurement"): a fresh empty `TMPDIR` and the `unset` environment. It must show 0 failures, `0 skipped`, 0 flaky and coverage at or above `.ctoc/coverage-baseline.json` `minPct`. Record the gate's summary lines and the measurement figures, and state that the peak size was not measured.
- [x] Run `npm run lint`, `npx eslint .` and `npm run typecheck`. All must exit 0.
- [x] Name these files in the record as run and green: `tests/test-selection-scope.test.js`, `tests/quality-agent-coverage-holes.test.js`, `tests/step-13-verify.test.js`, `tests/readme-numbers.test.js`, `tests/doc-counts.test.js`, `tests/coverage-gate.test.js`, `tests/false-green-fence.test.js`.

### Step 15: DOCUMENT
- [x] The reason comments in the four test files are this change's documentation. Under `## Execution Record`, add a section "Temp-folder use (finding for a follow-up plan)" with the figures. A nonzero amount left behind is stated as a finding. Moving no count in `CLAUDE.md` is correct: no file is made or removed.

### Step 16: FINAL-REVIEW
- [x] Tick each acceptance criterion above against its evidence in `## Execution Record`: the baseline failure list, the two probe reports, the three-environment runs, the final run and the measurement. Quote the red runs from the first two steps and the final green run. Confirm that the guards listed in the Test Plan were green before and after.


## Deferred Questions

_Written by the Iron Loop integrator (src/lib/iron-loop.js), which performs NO
quality evaluation. These entries are the integrator's own report on itself, not
findings from a critic that read this plan._

- **evaluation**: NOT EVALUATED — no automated critique was performed on this plan. The refinement loop appended the Steps 8-16 template and assessed nothing. (The scores this step used to report were computed from that same template, not from the plan.) A human or a real critic must review this plan before it is built.

## Execution Record

### Step 8 stop (executor, task t19)

No file was edited. Stopped at Step 8 per the plan: "Any other failing test: stop, report it with its message, and fix nothing."

- Versions: Node v22.23.1, git 2.43.0, HEAD 46bfbff5b479db2775ed670aabcd064a1bc61326.
- Starting state: the porcelain status over the five declared files was NOT empty: ` M tests/step-13-verify.test.js`. The diff is purely additive (a `childProcess` require and a new VENV describe block appended after line 387), left by the review-stage plan `verify-finds-the-projects-own-python-tools-s1-venv-tools-first-on-path`, which also has an uncommitted change in `src/lib/step-13-verify.js`. It does not touch case 7. Recorded and continued to the baseline run, which is the real test of whether the tree behaves as planned.
- Git environments: `init.defaultBranch` is set at global level only (`main`, from the owner's global file); system level unset. Three scratch copies were built with `git config --file`; results: unset exits 1 and prints nothing, master, main. The owner's file was not written.
- Baseline run, untouched tree, `unset` environment, fresh `TMPDIR` on disk: `npm test` exit 1. `# tests 13840`, `# pass 13835`, `# fail 5`, `# skipped 0`, coverage 99.62% (floor 99).
- Expected failing entries all present: test-selection-scope 8 (and its block), quality-agent-coverage-holes rejected push (and its block), step-13-verify case 7 (and its block), readme-numbers docs count (and its block).
- UNEXPECTED fifth failing test: `tests/protect-records.test.js:1139`, "160 - a spelling the walk cannot follow (/.vol/<device>/<inode>/..., /.nofollow<path>) that the kernel opens is refused" (inside the block "the write protection compares real files, not spellings (owner, 2026-10-15)"). Two rows failed: a Write to `/.nofollow<project>/.ctoc/approvals/x.json` with `kernel reaches=false`, for the main session and for a background agent, expected exit 0 and got 2 (the hook denied the write). Running that one file alone fails the same way (180 pass, 1 fail), so it is not flaky. It is outside this plan's declared files and is not caused by it.

### Scope growth decision (owner-approved, inbox question 1792677764044-lr93p1)

The owner approved one extra file for this build: `tests/protect-records.test.js`. The plan's `files:` frontmatter is NOT edited. Read-only investigation showed test 160's second row, `/.nofollow<project>/.ctoc/approvals/x.json`, is refused on every platform by the pure-text rule `RECORD_SEGMENT_RE` (`src/hooks/protect-records.js:581`), while the test expected "allowed" whenever the kernel does not reach the path (Linux has no `/.nofollow`). The test was wrong, not the hook; `src/hooks/protect-records.js` is unchanged. The fix is test-only: the loop tuple gets a fourth field `textNamesFolder` (true only for that row) and the refusal selector becomes `reaches || textNamesFolder || (darwin && !kernelReaches)`. The other rows and the macOS kernel assertion are unchanged. The three-part reason (Operating Lesson 14) is written as a comment above the loop. I re-read the test code before editing and it matched the description (test starts at line 1712, the row at 1725).

### Starting-state note

`tests/step-13-verify.test.js` already held the uncommitted VENV tests of the review-stage venv plan. They are intact; only the case-7 fixture argument and its comment were added. `src/lib/step-13-verify.js` also carries that other plan's uncommitted change, untouched by this build.

### Step 8 and 9 evidence

- Baseline (untouched tree, `unset` environment, fresh `TMPDIR` on disk): `# tests 13840`, `# pass 13835`, `# fail 5`, `# skipped 0`. Failing entries: test-selection-scope 8 (+ block), quality-agent-coverage-holes "a push the remote rejects ..." (+ block), step-13-verify case 7 (+ block), readme-numbers "docs/: 20 docs files" (+ block), and the fifth, protect-records 160 (+ block).
- Quoted from the baseline log: the rejected-push text `src refspec main does not match any`; the docs count failure; the gate line `coverage 99.62% (threshold 99%), skipped 0, failed 5`.
- After the two tightenings only (Step 8): `node --test` of test-selection-scope and readme-numbers under `unset`: 73 tests, 69 pass, 4 fail: the docs count, the README pin, case 6 (output quoted "Could not determine the push delta ... Running the full suite."), and case 8. Every other case green.
- Empty-delta probe, unchanged fixture: `remoteHead` refs/heads/master, `remoteBranches` refs/heads/main, `cloneHead` refs/heads/master, `cloneRevParseHead.status` 128, `emptyPrintedCouldNotDetermine` true, `emptyPrintedNoDelta` false, `nullPrintedCouldNotDetermine` true. Cause confirmed.
- Rejected-push cause, before the fix, both git files: `unset` 3 failures (rejected push, case 6, case 8, with blocks), `master` 3 failures, `main` 2 failures (case 6 and 8 only; rejected push green). `src refspec main does not match any` appears in the unset and master logs.
- Reporter probe: default run `firstLine` "TAP version 13", `hasEscape` false, `tapFail1` true; spec run `hasEscape` true, `specFail1` true. Cause confirmed, fix can work.
- Search: pattern `UPDATING` over `src/`: 0 files matched. The planner's earlier patterns over `src/` and `tests/` were not re-run beyond that.

### Step 14 evidence

- After the fixes, `quality-agent-coverage-holes` plus `test-selection-scope` under `unset`, `master` and `main`: 57 tests, 57 pass, 0 fail, 0 skipped, in each of the three.
- Empty-delta probe, fixed fixture, `unset`: `remoteHead` refs/heads/main, `cloneHead` refs/heads/main, `cloneRevParseHead.status` 0, `cloneUpstream` origin/main, `emptyPrintedNoDelta` true, `emptyPrintedCouldNotDetermine` false, `nullPrintedCouldNotDetermine` true.
- `step-13-verify`, `readme-numbers`, `protect-records`, `doc-counts` together: 273 tests, 273 pass, 0 fail.
- `npx eslint . --max-warnings 0` exit 0; `npm run lint` exit 0; `npm run typecheck` exit 0 (`# fail 0`).
- Final whole suite (`GIT_CONFIG_GLOBAL` scratch copy with the key unset, fresh empty `TMPDIR` on disk): `npm test` exit 0, `# tests 13841`, `# pass 13841`, `# fail 0`, `# skipped 0`, `# cancelled 0`; gate line `coverage 99.63% (threshold 99%), skipped 0, failed 0`, `PASS`. `tests/coverage-gate.test.js` and `tests/false-green-fence.test.js` ran inside it and are green; `tests/doc-counts.test.js` was also run on its own, green.
- Case 7 passes with its escape-byte check unchanged.

### Step 11 and 12 notes

- Diff review: the only removed lines are the README's two edited lines, the docs title and literal (20 to 21), the two changed fixture lines, case 6's destructuring line, the protect-records loop header and selector, and one JSDoc line. No `assert` line was removed or loosened. Each change carries the reason comment.
- Run times (describe-block `duration_ms`, baseline then final): test selection block 1105 then 1128; X3 end to end 286 then 292; Ground truth 65 then 49; README claims 6.8 then 8.0. Whole suite `duration_ms` 84456 then 83884. The rejected-push block's time was not extracted from the baseline log.

### Temp-folder use (finding for a follow-up plan)

Fresh empty `TMPDIR`: `$HOME/ctoc-tmp-measure.QDgD4f`, left in place.
- Allocated on disk (`du -s --block-size=1`): 14299136 bytes (about 13.6 MiB, includes the folder itself).
- Apparent (`du -sb`): 7509383 bytes.
- Entries left behind: 117 directly in the folder, 2249 at any depth.
- Ten largest entries by name and allocated bytes: `node-compile-cache` 11075584; `ctoc-incfeed-44hfUd` 98304; `ctoc-bash-cov202-yEGy4l` 61440; `ctoc-version-real-6411Zs`, `ctoc-version-fault-3Ozegf`, `ctoc-stream-unmapped-oURlgT`, `ctoc-stream-back-dkSRYX`, `ctoc-anchor-ok-wtF9C8`, `ctoc-anchor-fault-ub9U37`, `ctoc-activate-fault-rzR1b1`: 57344 each.
- The peak size during the run was NOT measured.
- Finding: the nonzero amount left behind is mostly Node's compile cache (`node-compile-cache`, about 11 MB of 14 MB); the rest is 116 test folders left by tests that do not remove them. A follow-up plan can address both. This is a finding, not a failure; at 14 MB it does not by itself explain a full 256 MB `/tmp`, so the peak, and other users of that `/tmp`, remain unmeasured.

### Step 13 note

Checked by me, not by a separate scanner: the two new fixture arguments are elements of argv arrays passed to `execFileSync` and `spawnSync` (no shell); no git configuration, name or email is in the plan, this record or any tracked file; the measurement folder is named home-relative; the probe files sit in the scratch folder outside the repository.
