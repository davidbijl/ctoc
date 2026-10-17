'use strict';

/**
 * sync-coverage.test.js — DARK-branch coverage for src/lib/sync.js (the git-sync
 * manager: auto-commit, the refused push, rate-limited remote checks, full plans sync).
 * The plan sync never pushes: with automatic pushing on it commits and says that
 * nothing was pushed and that /ctoc:push ships (the final describe pins every path).
 *
 * This file deliberately targets the branches tests/sync.test.js leaves dark: the
 * timestamp-file error/mkdir paths, the detectConflicts empty/throw returns, the
 * autoCommitPlan guards + message fallbacks, the whole of autoPush / fullPlansSync /
 * getCurrentBranch / silentPull, and the onPlanOperation disabled + offline + online
 * opted-in (autoPush asked) branches. Every test pins a branch that goes RED under mutation of the production
 * line — none is an obvious-path restatement of an existing test.
 *
 * BOUNDARY DISCIPLINE. The only two boundaries sync.js has are the git subprocess and
 * the settings singleton. This file uses:
 *   • REAL git — a fresh `git init` repo under os.tmpdir(), with a local *bare* remote
 *     (file://, no network) when a push/pull path is exercised. No execSync fake: the
 *     real command strings run, so a mutated command or flag is actually caught.
 *   • REAL fs — real reads/writes under the tmpdir; the catch blocks are triggered by
 *     genuine EISDIR / ENOTDIR conditions (a directory where a file is expected, and a
 *     file where a directory is expected), never by a stubbed fs that throws on cue.
 *   • A settings-singleton fake ONLY for the two guards real settings cannot reach:
 *     `getSetting('sync', …)` is always undefined because the `sync` category is not in
 *     SETTINGS_SCHEMA, so config.enabled / config.auto_commit can never be false from a
 *     real settings.json. Those two tests patch settings.getSetting, re-require sync so
 *     the fresh copy binds the patched function, and restore in finally.
 *
 * Every temp dir is removed in a per-test finally AND swept in `after`.
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { execSync, execFileSync } = require('node:child_process');

// Real module under test (real getSetting / isAutoPushEnabled / execSync bindings).
const sync = require('../src/lib/sync.js');

const SYNC_RESOLVED = require.resolve('../src/lib/sync.js');
const SETTINGS_RESOLVED = require.resolve('../src/lib/settings.js');

// ── temp-dir bookkeeping ──────────────────────────────────────────────────────
const madeDirs = [];
function mkTmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  madeDirs.push(d);
  return d;
}
function rm(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}
after(() => { for (const d of madeDirs) rm(d); });

// ── real-git fixture ──────────────────────────────────────────────────────────
function git(cwd, args) {
  return execSync(`git ${args}`, { cwd, stdio: 'pipe', encoding: 'utf8' });
}

// Argv form (no shell): used by the "never pushes" section, where commit subjects and
// paths are passed as separate argument-vector entries.
const gitArgv = (cwd, args) => execFileSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf8' });

/**
 * Fresh git repo on branch `main` with one commit. With `{ remote: true }` it also
 * gets a local bare remote wired as `origin` and the branch pushed, so fetch/pull/push
 * paths run against a real (offline) remote.
 */
function makeRepo({ remote = false } = {}) {
  const dir = mkTmp('sync-cov-');
  git(dir, 'init -q');
  git(dir, 'config user.email test@example.com');
  git(dir, 'config user.name Test');
  git(dir, 'config commit.gpgsign false');
  fs.mkdirSync(path.join(dir, 'plans'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'README.md'), 'seed\n');
  git(dir, 'add -A');
  git(dir, 'commit -q -m init');
  git(dir, 'branch -M main');
  let remoteDir = null;
  if (remote) {
    remoteDir = mkTmp('sync-rem-');
    git(remoteDir, 'init -q --bare');
    git(dir, `remote add origin "${remoteDir}"`);
    git(dir, 'push -q origin main');
  }
  return { dir, remoteDir };
}

// A directory that is NOT a git repository (git commands throw ENOENT-repo).
function makeNonRepo() {
  return mkTmp('sync-nonrepo-');
}

function writePlanChange(dir, name = 'p1.md') {
  fs.writeFileSync(path.join(dir, 'plans', name), `# ${name}\n\nbody ${Date.now()}\n`);
}

function writeAutoPush(dir, enabled) {
  fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.ctoc', 'settings.json'),
    JSON.stringify({ git: { autoPushEnabled: enabled } })
  );
}

/**
 * Patch the settings singleton (the config boundary) so `getSetting('sync', key)`
 * returns `syncCfg[key]` and `isAutoPushEnabled()` returns `autoPush`, then re-require
 * sync so the fresh copy binds the patched functions. Restores + evicts in finally.
 */
function withFakeConfig({ syncCfg = {}, autoPush = false }, fn) {
  const settings = require('../src/lib/settings.js');
  const origGet = settings.getSetting;
  const origPush = settings.isAutoPushEnabled;
  settings.getSetting = (cat, key) => (cat === 'sync' ? syncCfg[key] : undefined);
  settings.isAutoPushEnabled = () => autoPush;
  delete require.cache[SYNC_RESOLVED];
  const fresh = require('../src/lib/sync.js');
  try {
    return fn(fresh);
  } finally {
    settings.getSetting = origGet;
    settings.isAutoPushEnabled = origPush;
    delete require.cache[SYNC_RESOLVED];
    require('../src/lib/sync.js'); // restore a clean cached instance
    // settings module itself is untouched (we only reassigned properties, now restored)
    void SETTINGS_RESOLVED;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Cluster A — startAutoSync interval CALLBACK (line 60): only fires on a tick.
// ══════════════════════════════════════════════════════════════════════════════
describe('startAutoSync interval callback', () => {
  it('should_commit_pending_plan_changes_when_the_interval_callback_fires', (t) => {
    // Arrange — clean repo; enable mock setInterval so we can drive the timer.
    const { dir } = makeRepo();
    t.mock.timers.enable({ apis: ['setInterval'] });
    try {
      sync.startAutoSync(dir);            // initial sync runs now: tree clean → no commit
      const before = git(dir, 'log --oneline').trim().split('\n').length;
      writePlanChange(dir);              // create work only the CALLBACK can commit

      // Act — fire exactly the interval callback (5 min default).
      t.mock.timers.tick(5 * 60 * 1000);

      // Assert — the callback ran syncPlans, which committed the pending change.
      const log = git(dir, 'log --oneline');
      assert.match(log, /auto-sync plans/, 'interval callback committed via syncPlans');
      assert.ok(git(dir, 'log --oneline').trim().split('\n').length > before, 'a new commit landed');
    } finally {
      sync.stopAutoSync();
      rm(dir);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Cluster B — timestamp file: read-error catch (188-189), mkdir branch (200-201),
// write-error catch (204-205), and the parseInt→NaN boundary feeding isRateLimited.
// ══════════════════════════════════════════════════════════════════════════════
describe('last-sync timestamp file', () => {
  it('should_return_null_when_the_timestamp_path_is_a_directory_unreadable', () => {
    // Arrange — last-sync exists but as a DIRECTORY → readFileSync throws EISDIR.
    const dir = mkTmp('sync-ts-dir-');
    fs.mkdirSync(path.join(dir, '.ctoc', 'last-sync'), { recursive: true });
    try {
      // Act
      const ts = sync.getLastSyncTimestamp(dir);
      // Assert — the catch swallowed the read error and returned null.
      assert.equal(ts, null);
    } finally { rm(dir); }
  });

  // saveLastSyncTimestamp is not exported — it is reached only via onPlanOperation.
  // The mkdir branch (fresh .ctoc) is pinned by the offline onPlanOperation test
  // below (it asserts .ctoc/last-sync is created). The write-error catch is pinned by
  // the ".ctoc is a file" onPlanOperation test in Cluster F.

  it('should_yield_NaN_on_malformed_content_and_isRateLimited_treats_it_as_not_limited', () => {
    // Arrange — a corrupt timestamp file (parseInt → NaN); NaN is falsy in `!lastTimestamp`.
    const dir = mkTmp('sync-ts-bad-');
    fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.ctoc', 'last-sync'), 'not-a-number');
    try {
      // Act
      const ts = sync.getLastSyncTimestamp(dir);
      const limited = sync.isRateLimited(dir);
      // Assert — coercion yields NaN, and the guard reads NaN as "no prior sync".
      assert.ok(Number.isNaN(ts), 'malformed content coerces to NaN');
      assert.equal(limited, false, 'NaN timestamp is treated as not rate-limited');
    } finally { rm(dir); }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Cluster C — detectConflicts: empty-local return (277-278) and throw→[] (294-295).
// ══════════════════════════════════════════════════════════════════════════════
describe('detectConflicts dark returns', () => {
  it('should_return_empty_array_when_there_are_no_local_plan_changes', () => {
    // Arrange — clean repo: `git status --porcelain plans/` is empty.
    const { dir } = makeRepo({ remote: true });
    try {
      // Act
      const conflicts = sync.detectConflicts(dir);
      // Assert — the length===0 short-circuit returns [] BEFORE any remote diff.
      assert.deepEqual(conflicts, []);
    } finally { rm(dir); }
  });

  it('should_return_empty_array_when_git_is_unavailable', () => {
    // Arrange — not a git repo: the very first execSync throws.
    const dir = makeNonRepo();
    try {
      // Act
      const conflicts = sync.detectConflicts(dir);
      // Assert — the catch degrades to [] rather than propagating.
      assert.deepEqual(conflicts, []);
    } finally { rm(dir); }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Cluster D — autoCommitPlan guards + message fallbacks.
//   303-304 disabled · 315-316 no-changes · `|| COMMIT_MESSAGES.edit` · `|| 'unknown'`.
// ══════════════════════════════════════════════════════════════════════════════
describe('autoCommitPlan', () => {
  it('should_return_disabled_when_auto_commit_is_off', () => {
    // Arrange — the only way config.auto_commit is false: fake the sync-category read.
    withFakeConfig({ syncCfg: { auto_commit: false } }, (mod) => {
      // Act
      const r = mod.autoCommitPlan('create', 'x.md', os.tmpdir());
      // Assert
      assert.equal(r.committed, false);
      assert.equal(r.reason, 'auto-commit disabled');
    });
  });

  it('should_return_no_changes_when_the_working_tree_is_clean', () => {
    // Arrange — real clean repo → `git status --porcelain plans/` empty.
    const { dir } = makeRepo();
    try {
      // Act
      const r = sync.autoCommitPlan('create', 'x.md', dir);
      // Assert — the empty-status guard returns before staging.
      assert.equal(r.committed, false);
      assert.equal(r.reason, 'no changes');
      assert.equal(git(dir, 'log --oneline').trim().split('\n').length, 1, 'no extra commit created');
    } finally { rm(dir); }
  });

  it('should_fall_back_to_the_edit_message_for_an_unknown_action', () => {
    // Arrange — an action key absent from COMMIT_MESSAGES exercises `|| COMMIT_MESSAGES.edit`.
    const { dir } = makeRepo();
    writePlanChange(dir, 'weird.md');
    try {
      // Act
      const r = sync.autoCommitPlan('frobnicate', 'weird.md', dir);
      // Assert — the unknown action commits with the edit ("update") format.
      assert.equal(r.committed, true);
      assert.equal(r.message, 'plan: update weird.md');
      assert.match(git(dir, 'log -1 --pretty=%s'), /plan: update weird\.md/);
    } finally { rm(dir); }
  });

  it('should_default_approve_transition_to_unknown_when_opts_absent', () => {
    // Arrange — approve WITHOUT opts drives both `opts?.from || 'unknown'` fallbacks.
    const { dir } = makeRepo();
    writePlanChange(dir, 'appr.md');
    try {
      // Act
      const r = sync.autoCommitPlan('approve', 'appr.md', dir);
      // Assert — missing from/to render as unknown → unknown.
      assert.equal(r.committed, true);
      assert.equal(r.message, 'plan: unknown → unknown appr.md');
    } finally { rm(dir); }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Cluster E — autoPush: the gate-closed guard, and the opted-in answer (which never
// pushes and runs no git command, so an unreachable remote changes nothing).
// ══════════════════════════════════════════════════════════════════════════════
describe('autoPush ship gate', () => {
  it('should_be_a_no_op_when_the_ship_gate_is_closed', () => {
    // Arrange — default settings (no settings.json) → isAutoPushEnabled false.
    const { dir } = makeRepo({ remote: true });
    try {
      // Act
      const r = sync.autoPush(dir);
      // Assert — the guard returns the ship-gate reason and never runs git push.
      assert.equal(r.pushed, false);
      assert.match(r.reason, /auto-push disabled/);
    } finally { rm(dir); }
  });

  it('should_not_push_and_say_why_when_the_ship_gate_is_open', () => {
    // Arrange — gate open + a local commit ahead of origin. The plan sync never pushes
    // (the whole-suite check lives in /ctoc:push), so the remote must stay where it was.
    const { dir, remoteDir } = makeRepo({ remote: true });
    writeAutoPush(dir, true);
    writePlanChange(dir, 'ship.md');
    git(dir, 'add -A');
    git(dir, 'commit -q -m "local ahead"');
    const localHead = git(dir, 'rev-parse HEAD').trim();
    const remoteBefore = git(remoteDir, 'rev-parse main').trim();
    try {
      // Act
      const r = sync.autoPush(dir);
      // Assert — nothing pushed, the reason says so, the remote did not move, local is ahead.
      assert.equal(r.pushed, false);
      assert.match(r.reason, /never pushes/);
      assert.equal(git(remoteDir, 'rev-parse main').trim(), remoteBefore, 'remote main did not move');
      assert.notEqual(localHead, remoteBefore, 'local HEAD is ahead of the remote');
    } finally { rm(dir); }
  });

  it('should_attempt_no_push_even_when_the_remote_is_unreachable', () => {
    // Arrange — gate open but origin points nowhere: a push would throw, so no error
    // proves none was attempted.
    const { dir } = makeRepo({ remote: true });
    writeAutoPush(dir, true);
    git(dir, 'remote set-url origin "/no/such/remote/path.git"');
    try {
      // Act
      const r = sync.autoPush(dir);
      // Assert — no push attempt, so no push error; the refusal reason is returned.
      assert.equal(r.pushed, false);
      assert.equal(r.error, undefined);
      assert.match(r.reason, /never pushes/);
    } finally { rm(dir); }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Cluster F — onPlanOperation: disabled (359-360), online opted-in path (autoPush is
// asked and refuses), offline path (autoPush skipped, `count || 0`, conflicts ternary
// false side).
// ══════════════════════════════════════════════════════════════════════════════
describe('onPlanOperation', () => {
  it('should_return_disabled_when_sync_is_disabled', () => {
    // Arrange — config.enabled false is only reachable via the sync-category fake.
    withFakeConfig({ syncCfg: { enabled: false } }, (mod) => {
      // Act
      const r = mod.onPlanOperation('create', 'x.md', os.tmpdir());
      // Assert
      assert.equal(r.checked, false);
      assert.equal(r.reason, 'sync disabled');
    });
  });

  it('should_commit_but_not_push_on_the_online_opted_in_path', () => {
    // Arrange — gate open, real remote, a pending plan change, no prior last-sync.
    const { dir, remoteDir } = makeRepo({ remote: true });
    writeAutoPush(dir, true);
    writePlanChange(dir, 'op-online.md');
    try {
      // Act
      const r = sync.onPlanOperation('create', 'op-online.md', dir);
      // Assert — the !offline && committed branch asked autoPush, which refused.
      assert.equal(r.checked, true);
      assert.equal(r.offline, false);
      assert.equal(r.committed, true);
      assert.equal(r.pushed, false);
      assert.match(r.pushReason, /never pushes/);
      const remoteHead = git(remoteDir, 'rev-parse main').trim();
      const localHead = git(dir, 'rev-parse HEAD').trim();
      assert.notEqual(remoteHead, localHead, 'the committed plan did not reach the remote');
    } finally { rm(dir); }
  });

  it('should_commit_without_pushing_and_report_zero_remote_count_when_offline', () => {
    // Arrange — no remote at all → git fetch throws → offline mode.
    const { dir } = makeRepo(); // no remote
    writePlanChange(dir, 'op-offline.md');
    try {
      // Act
      const r = sync.onPlanOperation('edit', 'op-offline.md', dir);
      // Assert — committed locally, push branch skipped, count||0 → 0, conflicts [].
      assert.equal(r.offline, true);
      assert.equal(r.committed, true);
      assert.equal(r.pushed, false);
      assert.equal(r.remoteCount, 0);
      assert.deepEqual(r.conflicts, []);
      // And the save-timestamp mkdir branch ran: .ctoc was created fresh + written.
      const raw = fs.readFileSync(path.join(dir, '.ctoc', 'last-sync'), 'utf8');
      assert.match(raw, /^\d+$/, 'saveLastSyncTimestamp created .ctoc and wrote an epoch');
    } finally { rm(dir); }
  });

  it('should_swallow_a_timestamp_write_failure_when_ctoc_is_a_file', () => {
    // Arrange — .ctoc is a FILE, so saveLastSyncTimestamp's write throws ENOTDIR and is
    // swallowed; onPlanOperation must still complete. (readRawSettings sees no
    // settings.json under a file path → defaults, so config stays enabled.)
    const { dir } = makeRepo(); // no remote
    fs.writeFileSync(path.join(dir, '.ctoc'), 'i am a file, not a dir');
    writePlanChange(dir, 'op-tsfail.md');
    try {
      // Act + Assert — no throw escapes; the operation proceeds past the failed save.
      let r;
      assert.doesNotThrow(() => { r = sync.onPlanOperation('create', 'op-tsfail.md', dir); });
      assert.equal(r.checked, true, 'onPlanOperation ran past the swallowed write error');
      assert.ok(fs.statSync(path.join(dir, '.ctoc')).isFile(), '.ctoc stayed a file (write failed silently)');
    } finally { rm(dir); }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Cluster G — fullPlansSync (420-482): pull-success + no-commit + gate-closed;
// dirty-commit; non-git errors + branch fallback; gate-open (no push, says why);
// gate-open with an unreachable remote (no push attempted, so no error).
// ══════════════════════════════════════════════════════════════════════════════
describe('fullPlansSync', () => {
  it('should_pull_commit_nothing_and_skip_push_on_a_clean_repo_with_gate_closed', () => {
    // Arrange — clean tree so the rebase pull succeeds; default gate closed.
    const { dir } = makeRepo({ remote: true });
    try {
      // Act
      const r = sync.fullPlansSync(dir);
      // Assert — pull succeeded, nothing to commit, push skipped by the ship gate.
      assert.equal(r.pulled, true);
      assert.equal(r.committed, false);
      assert.equal(r.pushed, false);
      assert.match(r.pushSkipped, /auto-push disabled/);
    } finally { rm(dir); }
  });

  it('should_commit_pending_plan_changes_and_skip_push_with_gate_closed', () => {
    // Arrange — a pending change; gate closed.
    const { dir } = makeRepo({ remote: true });
    writePlanChange(dir, 'fps-commit.md');
    try {
      // Act
      const r = sync.fullPlansSync(dir);
      // Assert — the commit branch ran (committed true) and push was ship-gated off.
      assert.equal(r.committed, true);
      assert.equal(r.pushed, false);
      assert.match(r.pushSkipped, /auto-push disabled/);
      assert.match(git(dir, 'log -1 --pretty=%s'), /plans: sync pipeline state/);
    } finally { rm(dir); }
  });

  it('should_record_pull_and_commit_errors_outside_a_git_repo', () => {
    // Arrange — not a repo: getCurrentBranch → null (branch falls back to config.branch),
    // and both the pull and the status/commit execSync throw.
    const dir = makeNonRepo();
    try {
      // Act
      const r = sync.fullPlansSync(dir);
      // Assert — both stages errored, nothing pulled/committed, gate-closed skip stands.
      assert.equal(r.pulled, false);
      assert.equal(r.committed, false);
      assert.ok(r.errors.some((e) => e.startsWith('Pull:')), 'pull error captured');
      assert.ok(r.errors.some((e) => e.startsWith('Commit:')), 'commit error captured');
      assert.equal(r.pushed, false);
    } finally { rm(dir); }
  });

  it('should_not_push_and_say_why_when_the_ship_gate_is_open', () => {
    // Arrange — gate open, a local commit ahead, clean tree so pull rebases cleanly.
    const { dir, remoteDir } = makeRepo({ remote: true });
    writeAutoPush(dir, true);
    writePlanChange(dir, 'fps-push.md');
    git(dir, 'add -A');
    git(dir, 'commit -q -m "ahead for fullPlansSync push"');
    const localHead = git(dir, 'rev-parse HEAD').trim();
    try {
      // Act
      const r = sync.fullPlansSync(dir);
      // Assert — not pushed, the reason says so, and the remote did not follow the local commit.
      assert.equal(r.pushed, false);
      assert.match(r.pushSkipped, /never pushes/);
      assert.notEqual(git(remoteDir, 'rev-parse main').trim(), localHead);
    } finally { rm(dir); }
  });

  it('should_attempt_no_push_when_the_remote_is_unreachable', () => {
    // Arrange — gate open, a local commit, but origin points nowhere: a push would throw.
    const { dir } = makeRepo({ remote: true });
    writeAutoPush(dir, true);
    git(dir, 'add -A');
    git(dir, 'commit -q --allow-empty -m "ahead"');
    git(dir, 'remote set-url origin "/no/such/remote/path.git"');
    try {
      // Act
      const r = sync.fullPlansSync(dir);
      // Assert — no push attempted: no Push: entry, the refusal is the reason.
      assert.equal(r.pushed, false);
      assert.ok(!r.errors.some((e) => e.startsWith('Push:')), 'no push was attempted');
      assert.match(r.pushSkipped, /never pushes/);
    } finally { rm(dir); }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Cluster H — getCurrentBranch (489-499): name on success, null on throw.
// ══════════════════════════════════════════════════════════════════════════════
describe('getCurrentBranch', () => {
  it('should_return_the_checked_out_branch_name', () => {
    // Arrange
    const { dir } = makeRepo();
    try {
      // Act + Assert
      assert.equal(sync.getCurrentBranch(dir), 'main');
    } finally { rm(dir); }
  });

  it('should_return_null_outside_a_git_repository', () => {
    // Arrange — not a repo → rev-parse throws → catch returns null.
    const dir = makeNonRepo();
    try {
      // Act + Assert
      assert.equal(sync.getCurrentBranch(dir), null);
    } finally { rm(dir); }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Cluster I — silentPull (506-518): true on success, false on failure.
// ══════════════════════════════════════════════════════════════════════════════
describe('silentPull', () => {
  it('should_return_true_when_the_rebase_pull_succeeds', () => {
    // Arrange — clean repo with an up-to-date remote.
    const { dir } = makeRepo({ remote: true });
    try {
      // Act + Assert
      assert.equal(sync.silentPull(dir), true);
    } finally { rm(dir); }
  });

  it('should_return_false_when_there_is_no_upstream', () => {
    // Arrange — a repo (branch resolves) but no remote → pull throws → false.
    const { dir } = makeRepo(); // no remote
    try {
      // Act + Assert
      assert.equal(sync.silentPull(dir), false);
    } finally { rm(dir); }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Cluster J — the plan sync NEVER pushes (the owner's order of 2026-10-14: a push
// follows the whole declared suite, which only /ctoc:push runs; running it here would
// hold the menu for minutes). Every fixture is a temporary repository with a local bare
// `origin` and a committed test command that appends to a counter file OUTSIDE the
// repository — so "the counter file does not exist" is runtime proof that no test ran.
// ══════════════════════════════════════════════════════════════════════════════
const NEVER_PUSHES = /never pushes/;
const POINTS_TO_PUSH = /\/ctoc:push/;

/**
 * An opted-in fixture (git.autoPushEnabled true) whose committed, pushed test command
 * is `node suite.js`: `failing` prints 2 failing tests and exits 1, `passing` prints 3
 * passing tests and exits 0. The bare remote's `main` is the recorded baseline.
 */
function makeSuiteRepo(kind) {
  const { dir, remoteDir } = makeRepo({ remote: true });
  const counter = path.join(mkTmp('sync-ctr-'), 'counter.txt');
  const failing = kind === 'failing';
  const summary = failing ? 'ℹ tests 2\nℹ pass 0\nℹ fail 2' : 'ℹ tests 3\nℹ pass 3\nℹ fail 0';
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '1.0.0', scripts: { test: 'node suite.js' } })
  );
  fs.writeFileSync(
    path.join(dir, 'suite.js'),
    `require('fs').appendFileSync(${JSON.stringify(counter)}, 'ran\\n');\n` +
    `console.log(${JSON.stringify(summary)});\nprocess.exit(${failing ? 1 : 0});\n`
  );
  gitArgv(dir, ['add', 'package.json', 'suite.js']);
  gitArgv(dir, ['commit', '-q', '-m', 'fixture suite']);
  gitArgv(dir, ['push', '-q', 'origin', 'main']);
  writeAutoPush(dir, true);
  return { dir, remoteDir, counter, baseline: gitArgv(remoteDir, ['rev-parse', 'main']).trim() };
}

function remoteMain(fx) { return gitArgv(fx.remoteDir, ['rev-parse', 'main']).trim(); }
function newestSubject(dir) { return gitArgv(dir, ['log', '-1', '--pretty=%s']).trim(); }

function assertNothingPushedOrRun(fx) {
  assert.equal(remoteMain(fx), fx.baseline, 'the bare remote main did not move');
  assert.equal(fs.existsSync(fx.counter), false, 'the fixture test command never ran');
}

describe('with automatic pushing on, the plan sync never pushes', () => {
  for (const kind of ['failing', 'passing']) {
    describe(`and a ${kind} test command`, () => {
      it(`S1 syncPlans commits, does not push, and says /ctoc:push ships (${kind})`, () => {
        const fx = makeSuiteRepo(kind);
        writePlanChange(fx.dir);
        try {
          const r = sync.syncPlans(fx.dir);
          assert.equal(r.synced, true);
          assert.equal(r.pushed, false);
          assert.equal(r.pushRefused, true);
          assert.match(r.reason, NEVER_PUSHES);
          assert.match(r.reason, POINTS_TO_PUSH);
          assert.match(newestSubject(fx.dir), /chore: auto-sync plans/);
          assertNothingPushedOrRun(fx);
        } finally { rm(fx.dir); }
      });

      it(`S1 manualSync is the same (${kind})`, () => {
        const fx = makeSuiteRepo(kind);
        writePlanChange(fx.dir);
        try {
          const r = sync.manualSync(fx.dir);
          assert.equal(r.synced, true);
          assert.equal(r.pushed, false);
          assert.equal(r.pushRefused, true);
          assert.match(r.reason, NEVER_PUSHES);
          assert.match(r.reason, POINTS_TO_PUSH);
          assert.match(newestSubject(fx.dir), /chore: auto-sync plans/);
          assertNothingPushedOrRun(fx);
        } finally { rm(fx.dir); }
      });

      it(`S1 onPlanOperation commits through autoPush, which refuses (${kind})`, () => {
        const fx = makeSuiteRepo(kind);
        writePlanChange(fx.dir, 'p.md');
        try {
          const r = sync.onPlanOperation('create', 'p.md', fx.dir);
          assert.equal(r.committed, true);
          assert.equal(r.pushed, false);
          assert.match(r.pushReason, NEVER_PUSHES);
          assert.match(r.pushReason, POINTS_TO_PUSH);
          assert.match(newestSubject(fx.dir), /plan: create p\.md/);
          assertNothingPushedOrRun(fx);
        } finally { rm(fx.dir); }
      });

      it(`S1 autoPush alone commits nothing and does not push (${kind})`, () => {
        const fx = makeSuiteRepo(kind);
        writePlanChange(fx.dir, 'p.md');
        gitArgv(fx.dir, ['add', 'plans/']);
        gitArgv(fx.dir, ['commit', '-q', '-m', 'plan: by hand']);
        const head = gitArgv(fx.dir, ['rev-parse', 'HEAD']).trim();
        try {
          const r = sync.autoPush(fx.dir);
          assert.equal(r.pushed, false);
          assert.match(r.reason, NEVER_PUSHES);
          assert.match(r.reason, POINTS_TO_PUSH);
          assert.equal(gitArgv(fx.dir, ['rev-parse', 'HEAD']).trim(), head, 'autoPush made no commit');
          assertNothingPushedOrRun(fx);
        } finally { rm(fx.dir); }
      });

      it(`S1 fullPlansSync commits, does not push, and says why (${kind})`, () => {
        const fx = makeSuiteRepo(kind);
        writePlanChange(fx.dir);
        try {
          const r = sync.fullPlansSync(fx.dir);
          assert.equal(r.committed, true);
          assert.equal(r.pushed, false);
          assert.match(r.pushSkipped, NEVER_PUSHES);
          assert.match(r.pushSkipped, POINTS_TO_PUSH);
          assert.ok(!r.errors.some((e) => e.startsWith('Push:')), 'no push was attempted');
          assert.match(newestSubject(fx.dir), /plans: sync pipeline state/);
          assertNothingPushedOrRun(fx);
        } finally { rm(fx.dir); }
      });
    });
  }

  it('S2 syncPlans and fullPlansSync on a branch other than main, with an uncommitted change outside plans/, push nothing', () => {
    // Arrange — local main is AHEAD of the remote's main (an unpushed commit), then a
    // feature branch is checked out with a tracked file modified outside plans/ and a
    // pending plan change. The sync never pushes, so the remote must not move.
    const fx = makeSuiteRepo('passing');
    fs.appendFileSync(path.join(fx.dir, 'README.md'), 'unpushed on main\n');
    gitArgv(fx.dir, ['add', 'README.md']);
    gitArgv(fx.dir, ['commit', '-q', '-m', 'ahead on main']);
    gitArgv(fx.dir, ['checkout', '-q', '-b', 'feature']);
    fs.appendFileSync(path.join(fx.dir, 'README.md'), 'uncommitted outside plans\n');
    writePlanChange(fx.dir);
    try {
      // Act + Assert — syncPlans
      const r = sync.syncPlans(fx.dir);
      assert.equal(r.pushRefused, true);
      assert.match(r.reason, NEVER_PUSHES);
      assert.equal(remoteMain(fx), fx.baseline, 'the remote main did not move');

      // Act + Assert — fullPlansSync on the same tree
      const f = sync.fullPlansSync(fx.dir);
      assert.match(f.pushSkipped, NEVER_PUSHES);
      assert.equal(remoteMain(fx), fx.baseline, 'the remote main still did not move');
      assert.throws(
        () => gitArgv(fx.remoteDir, ['rev-parse', '--verify', 'feature']),
        'the remote has no feature branch'
      );
      assert.equal(fs.existsSync(fx.counter), false, 'the fixture test command never ran');
    } finally { rm(fx.dir); }
  });

  for (const kind of ['failing', 'passing']) {
    it(`S3 with automatic pushing off the sync commits as today and reports today's reason (${kind})`, () => {
      const fx = makeSuiteRepo(kind);
      writeAutoPush(fx.dir, false);
      writePlanChange(fx.dir, 'off.md');
      try {
        const r = sync.syncPlans(fx.dir);
        assert.equal(r.synced, true);
        assert.equal(r.pushed, false);
        assert.equal(r.pushRefused, undefined, 'no refusal flag with the gate closed');
        assert.equal(r.reason, 'auto-push disabled (ship gate) — commit only; push with /ctoc:push');
        assert.match(newestSubject(fx.dir), /chore: auto-sync plans/);

        writePlanChange(fx.dir, 'off2.md');
        const o = sync.onPlanOperation('create', 'off2.md', fx.dir);
        assert.equal(o.committed, true);
        assert.equal(o.pushed, false);
        assert.equal(o.pushReason, 'auto-push disabled (ship gate) — push with /ctoc:push');

        writePlanChange(fx.dir, 'off3.md');
        const f = sync.fullPlansSync(fx.dir);
        assert.equal(f.committed, true);
        assert.equal(f.pushed, false);
        assert.equal(f.pushSkipped, 'auto-push disabled (ship gate) — push with /ctoc:push');
        assertNothingPushedOrRun(fx);
      } finally { rm(fx.dir); }
    });
  }

  it('a conflicting pull is reported, not hidden', () => {
    // Arrange — plans/p1.md is committed and pushed ("base"); a second clone changes it
    // to "theirs" and pushes; the fixture changes the same file to "ours" (uncommitted).
    // syncPlans commits plans/p1.md first, then the rebase conflicts and stops partway,
    // leaving the rebase in progress.
    const fx = makeSuiteRepo('passing');
    fs.writeFileSync(path.join(fx.dir, 'plans', 'p1.md'), 'base\n');
    gitArgv(fx.dir, ['add', 'plans/p1.md']);
    gitArgv(fx.dir, ['commit', '-q', '-m', 'plan: base']);
    gitArgv(fx.dir, ['push', '-q', 'origin', 'main']);
    const other = mkTmp('sync-other-');
    gitArgv(other, ['clone', '-q', '-b', 'main', fx.remoteDir, other + path.sep + 'clone']);
    const clone = path.join(other, 'clone');
    gitArgv(clone, ['config', 'user.name', 'Other']);
    gitArgv(clone, ['config', 'user.email', 'other@example.com']);
    gitArgv(clone, ['config', 'commit.gpgsign', 'false']);
    fs.writeFileSync(path.join(clone, 'plans', 'p1.md'), 'theirs\n');
    gitArgv(clone, ['add', 'plans/p1.md']);
    gitArgv(clone, ['commit', '-q', '-m', 'plan: theirs']);
    gitArgv(clone, ['push', '-q', 'origin', 'main']);
    const remoteAfterTheirs = gitArgv(fx.remoteDir, ['rev-parse', 'main']).trim();
    fs.writeFileSync(path.join(fx.dir, 'plans', 'p1.md'), 'ours\n');
    try {
      // Act
      const r = sync.syncPlans(fx.dir);
      // Assert — the failed pull is reported with a fixed phrase (git's wording is not
      // pinned), the sync still never pushes, and the remote stayed where the clone left it.
      assert.equal(r.synced, true);
      assert.equal(r.pushRefused, true);
      assert.match(r.reason, /^pull --rebase failed \(run git status\); /);
      assert.match(r.reason, NEVER_PUSHES);
      assert.match(r.reason, POINTS_TO_PUSH);
      assert.equal(remoteMain(fx), remoteAfterTheirs, 'the remote main did not move');
      assert.equal(fs.existsSync(fx.counter), false, 'the fixture test command never ran');
    } finally { rm(fx.dir); }
  });

  it('S4 startAutoSync commits on open and on one timer tick, never pushes, never runs the test command', (t) => {
    // Arrange — mocked interval only; opted-in passing fixture with a pending plan change.
    const fx = makeSuiteRepo('passing');
    writePlanChange(fx.dir, 'open.md');
    t.mock.timers.enable({ apis: ['setInterval'] });
    const autoSyncCommits = () =>
      gitArgv(fx.dir, ['log', '--pretty=%s']).split('\n').filter((s) => /auto-sync plans/.test(s)).length;
    try {
      // Act — the immediate sync at menu open
      sync.startAutoSync(fx.dir);
      assert.equal(autoSyncCommits(), 1, 'the immediate sync committed');
      assertNothingPushedOrRun(fx);

      // Act — one interval of the timer
      writePlanChange(fx.dir, 'tick.md');
      t.mock.timers.tick(5 * 60 * 1000);
      assert.equal(autoSyncCommits(), 2, 'the timer tick committed');
      assertNothingPushedOrRun(fx);
    } finally {
      sync.stopAutoSync();
      rm(fx.dir);
    }
  });
});
