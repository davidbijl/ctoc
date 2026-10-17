/**
 * Sync Manager
 * Event-triggered sync with rate limiting for plans
 *
 * Features:
 * - Event-triggered sync on plan operations (create/edit/approve/delete)
 * - Rate-limited remote checks (60s cooldown by default)
 * - Auto-commit with descriptive messages
 * - Commits plan changes locally; never pushes — `/ctoc:push` runs the whole test
 *   suite and pushes
 * - Conflict detection
 */

const { execFileSync } = require('child_process');
const safeFs = require('./safe-fs');
const path = require('path');
// R3-C: the push ship gate. No function in this file pushes — sync commits plan
// state (local and reversible) and the human ships via /ctoc:push. `isAutoPushEnabled`
// (FALSE unless the human explicitly opted in) now only decides whether the opted-in
// pull runs and which "not pushed" wording a result carries.
const { getSetting, isAutoPushEnabled } = require('./settings');

let syncInterval = null;
let lastSync = null;

// Default sync configuration
const DEFAULT_SYNC_CONFIG = {
  enabled: true,
  check_interval: 60,      // Minimum seconds between remote checks
  auto_commit: true,       // Auto-commit plan changes (local, reversible)
  auto_push: false,        // mirrors git.autoPushEnabled; the sync never pushes either way
  auto_pull: 'prompt',     // prompt | always | never
  branch: 'main'           // Branch to sync
};

// Commit message formats for different actions
const COMMIT_MESSAGES = {
  create: (name) => `plan: create ${name}`,
  edit: (name) => `plan: update ${name}`,
  delete: (name) => `plan: delete ${name}`,
  approve: (name, opts) => `plan: ${opts?.from || 'unknown'} → ${opts?.to || 'unknown'} ${name}`
};

// What every opted-in sync result from syncPlans, autoPush and fullPlansSync says
// (onPlanOperation's rate-limited and offline returns do not carry it; it has no live
// caller). The owner's order of 2026-10-14: a push follows
// the whole declared test suite. Running that suite here would hold the menu for
// minutes, so the sync never runs it and never pushes; /ctoc:push runs it and pushes.
const NOT_PUSHED_BY_SYNC = 'not pushed — the plan sync never pushes; /ctoc:push runs the whole test suite and pushes';

// SECURITY: every git subprocess in this module runs argv-safe via execFileSync — a
// fixed argument vector, NO shell. Nothing (a plan name, a stage name, a branch name,
// a commit message) is ever concatenated into a shell string, so a shell metacharacter
// in plan-controlled data (e.g. autoCommitPlan's commit message) can never break out of
// its argument and execute. This closes the autoCommitPlan commit-message injection: a
// plan name like `a";touch X;echo "` is now an inert literal, not a command.
/**
 * Run git argv-safe (no shell). Defaults to utf8 so the return is a string a
 * caller can `.trim()` — the same encoding the old execSync calls passed. A
 * caller may override any option (cwd, stdio, encoding).
 * @param {string[]} args
 * @param {object} [options]
 * @returns {string}
 */
function git(args, options = {}) {
  return /** @type {string} */ (execFileSync('git', args, { encoding: 'utf8', ...options }));
}

// Start auto-sync
function startAutoSync(projectPath = process.cwd()) {
  const enabled = getSetting('general', 'syncEnabled', projectPath);
  const intervalMinutes = getSetting('general', 'syncInterval', projectPath) || 5;

  if (!enabled) {
    return;
  }

  // Clear existing interval
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Set up new interval
  const intervalMs = intervalMinutes * 60 * 1000;
  syncInterval = setInterval(() => {
    syncPlans(projectPath);
  }, intervalMs);

  // Initial sync
  syncPlans(projectPath);
}

// Stop auto-sync
function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// Sync plans to git
function syncPlans(projectPath = process.cwd()) {
  try {
    // Check for changes in plans directory
    const status = git(['status', '--porcelain', 'plans/'], {
      cwd: projectPath,
      encoding: 'utf8'
    }).trim();

    if (!status) {
      lastSync = new Date();
      // Earlier timer commits may sit unpushed while plans/ is clean, so with the
      // opt-in "no changes" must not read as "the plans reached GitHub".
      if (isAutoPushEnabled(projectPath)) {
        return { synced: false, pushed: false, pushRefused: true, reason: `no changes; ${NOT_PUSHED_BY_SYNC}` };
      }
      return { synced: false, reason: 'no changes' };
    }

    // Add + commit. Committing is local and reversible — it is NOT a ship gate.
    git(['add', 'plans/'], { cwd: projectPath });

    const commitMsg = `chore: auto-sync plans [${new Date().toISOString()}]`;
    git(['commit', '-m', commitMsg], { cwd: projectPath });

    // SHIP GATE (R3-C). This timer fires every 5 minutes from a menu open. It used
    // to rebase and push `origin main` unattended — a machine crossing a human ship
    // gate, on a clock. The rebase (history rewrite) still happens ONLY when the human
    // explicitly opted in; the push happens on no path at all.
    if (!isAutoPushEnabled(projectPath)) {
      lastSync = new Date();
      return {
        synced: true,
        pushed: false,
        timestamp: lastSync,
        reason: 'auto-push disabled (ship gate) — commit only; push with /ctoc:push'
      };
    }

    // Pull (only on the opted-in path). A failure (no upstream, or a conflict that leaves
    // the rebase stopped partway) is reported in the result instead of swallowed, so the
    // person sees that the pull failed. The phrase is FIXED, never git's own text: that can carry a remote URL
    // with credentials, and the Doctor shows this reason on screen.
    let pullNote = '';
    try {
      git(['pull', '--rebase', 'origin', 'main'], { cwd: projectPath, stdio: 'pipe' });
    } catch {
      pullNote = 'pull --rebase failed (run git status); ';
    }

    lastSync = new Date();
    return {
      synced: true,
      pushed: false,
      pushRefused: true,
      timestamp: lastSync,
      reason: `${pullNote}${NOT_PUSHED_BY_SYNC}`
    };

  } catch (error) {
    return { synced: false, error: error.message };
  }
}

// Get last sync time
function getLastSync() {
  return lastSync;
}

// Manual sync trigger
function manualSync(projectPath = process.cwd()) {
  return syncPlans(projectPath);
}

// R4-B: `moveToReviewAfterPush` (a raw renameSync into plans/review/ gated only by
// the auto-move-to-review workflow toggle) was DELETED. It had ZERO callers, was
// default-ON via a visible switch, and offered a second, evidence-LESS door into
// review/ — the exact
// residency the wave exists to abolish. A plan reaches review in exactly ONE place:
// the completion path (actions.completeTaskPlan → completeExecution) that MINTS the
// Step-14 VERIFY evidence Gate 3 reads. Sync commits plan state; it never renames a
// plan into review.

// Get sync configuration (with defaults)
function getSyncConfig(projectPath = process.cwd()) {
  const config = { ...DEFAULT_SYNC_CONFIG };

  // Override with user settings
  const syncSettings = getSetting('sync', 'enabled', projectPath);
  if (syncSettings !== undefined) config.enabled = syncSettings;

  const checkInterval = getSetting('sync', 'check_interval', projectPath);
  if (checkInterval !== undefined) config.check_interval = checkInterval;

  const autoCommit = getSetting('sync', 'auto_commit', projectPath);
  if (autoCommit !== undefined) config.auto_commit = autoCommit;

  // SHIP GATE (R3-C): auto_push is NOT a sync-local setting. It comes from the ONE
  // canonical key `git.autoPushEnabled` (default false). This used to read the
  // sync-category auto_push key while init wrote a push-category one — two different
  // keys, so the visible off-switch was a PLACEBO and the machine pushed regardless.
  config.auto_push = isAutoPushEnabled(projectPath);

  const autoPull = getSetting('sync', 'auto_pull', projectPath);
  if (autoPull !== undefined) config.auto_pull = autoPull;

  const branch = getSetting('sync', 'branch', projectPath);
  if (branch !== undefined) config.branch = branch;

  return config;
}

// Get path to last-sync timestamp file
function getLastSyncPath(projectPath = process.cwd()) {
  return path.join(projectPath, '.ctoc', 'last-sync');
}

// Get last sync timestamp from file
function getLastSyncTimestamp(projectPath = process.cwd()) {
  const lastSyncPath = getLastSyncPath(projectPath);
  try {
    if (safeFs.existsSync(lastSyncPath)) {
      const content = safeFs.readFileSync(lastSyncPath, 'utf8').trim();
      return parseInt(content, 10);
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

// Save last sync timestamp to file
function saveLastSyncTimestamp(projectPath = process.cwd()) {
  const lastSyncPath = getLastSyncPath(projectPath);
  const ctocDir = path.dirname(lastSyncPath);

  try {
    if (!safeFs.existsSync(ctocDir)) {
      safeFs.mkdirSync(ctocDir, { recursive: true });
    }
    safeFs.writeFileSync(lastSyncPath, Date.now().toString());
  } catch (e) {
    // Ignore write errors
  }
}

// Check if rate-limited (within cooldown period)
function isRateLimited(projectPath = process.cwd()) {
  const config = getSyncConfig(projectPath);
  const lastTimestamp = getLastSyncTimestamp(projectPath);

  if (!lastTimestamp) {
    return false; // No previous sync, not rate-limited
  }

  const elapsed = (Date.now() - lastTimestamp) / 1000; // Convert to seconds
  return elapsed < config.check_interval;
}

// Check for remote changes
function checkRemoteChanges(projectPath = process.cwd()) {
  const config = getSyncConfig(projectPath);

  try {
    // Fetch from remote
    git(['fetch', 'origin', config.branch], {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    // Check for remote commits not in local
    const remoteDiff = git(['log', `HEAD..origin/${config.branch}`, '--oneline', 'plans/'], {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    const hasRemoteChanges = remoteDiff.length > 0;
    const remoteCommits = hasRemoteChanges ? remoteDiff.split('\n').filter(Boolean) : [];

    return {
      offline: false,
      hasRemoteChanges,
      remoteCommits,
      count: remoteCommits.length
    };
  } catch (error) {
    // Network error - offline mode
    return {
      offline: true,
      hasRemoteChanges: false,
      error: error.message
    };
  }
}

// Detect conflicts (files changed both locally and remotely)
function detectConflicts(projectPath = process.cwd()) {
  const config = getSyncConfig(projectPath);

  try {
    // Get locally modified files
    const localChanges = git(['status', '--porcelain', 'plans/'], {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    const localFiles = localChanges
      .split('\n')
      .filter(Boolean)
      .map(line => line.slice(3).trim());

    if (localFiles.length === 0) {
      return [];
    }

    // Get remotely modified files
    const remoteChanges = git(['diff', '--name-only', `HEAD..origin/${config.branch}`, '--', 'plans/'], {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    const remoteFiles = remoteChanges.split('\n').filter(Boolean);

    // Find intersection (conflicts)
    const conflicts = localFiles.filter(f => remoteFiles.includes(f));

    return conflicts;
  } catch (error) {
    return [];
  }
}

// Auto-commit a plan change
function autoCommitPlan(action, planName, projectPath = process.cwd(), opts = {}) {
  const config = getSyncConfig(projectPath);

  if (!config.auto_commit) {
    return { committed: false, reason: 'auto-commit disabled' };
  }

  try {
    // Check if there are changes to commit
    const status = git(['status', '--porcelain', 'plans/'], {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    if (!status) {
      return { committed: false, reason: 'no changes' };
    }

    // Stage changes
    git(['add', 'plans/'], { cwd: projectPath, stdio: 'pipe' });

    // Create commit message based on action. The message may contain arbitrary
    // plan-controlled text (plan name, stage names); it is passed as an argv element
    // to execFileSync (no shell), so shell metacharacters in it are inert.
    const messageFunc = COMMIT_MESSAGES[action] || COMMIT_MESSAGES.edit;
    const message = messageFunc(planName, opts);

    git(['commit', '-m', message], { cwd: projectPath, stdio: 'pipe' });

    return { committed: true, message };
  } catch (error) {
    return { committed: false, error: error.message };
  }
}

// Auto-push, which never pushes. With `config.auto_push` (= git.autoPushEnabled) off it
// says automatic pushing is off; with it on it says the sync never pushes. No git
// command runs on either path: the sync never runs the test suite, so it never pushes.
function autoPush(projectPath = process.cwd()) {
  const config = getSyncConfig(projectPath);

  if (!config.auto_push) {
    return { pushed: false, reason: 'auto-push disabled (ship gate) — push with /ctoc:push' };
  }

  return { pushed: false, reason: NOT_PUSHED_BY_SYNC };
}

// Main event handler: called on any plan operation
function onPlanOperation(action, planName, projectPath = process.cwd(), opts = {}) {
  const config = getSyncConfig(projectPath);

  if (!config.enabled) {
    return { checked: false, reason: 'sync disabled' };
  }

  // Check rate limiting
  if (isRateLimited(projectPath)) {
    // Still auto-commit, just skip remote check
    const commitResult = autoCommitPlan(action, planName, projectPath, opts);

    return {
      checked: false,
      reason: 'rate-limited',
      committed: commitResult.committed,
      commitMessage: commitResult.message
    };
  }

  // Update timestamp
  saveLastSyncTimestamp(projectPath);

  // Check for remote changes
  const remoteResult = checkRemoteChanges(projectPath);

  // Auto-commit local changes
  const commitResult = autoCommitPlan(action, planName, projectPath, opts);

  // If online and committed, ask autoPush (which never pushes, and says why)
  let pushResult = { pushed: false };
  if (!remoteResult.offline && commitResult.committed) {
    pushResult = autoPush(projectPath);
  }

  return {
    checked: true,
    action,
    planName,
    offline: remoteResult.offline,
    hasRemoteChanges: remoteResult.hasRemoteChanges,
    remoteCount: remoteResult.count || 0,
    committed: commitResult.committed,
    commitMessage: commitResult.message,
    pushed: pushResult.pushed,
    pushReason: pushResult.reason,
    conflicts: remoteResult.hasRemoteChanges ? detectConflicts(projectPath) : []
  };
}

/**
 * Full plans sync: pull and commit; never pushes
 * Used by the "Sync plans" dashboard command.
 *
 * Steps:
 * 1. git pull --rebase origin {current-branch}
 * 2. git add plans/
 * 3. git commit -m "plans: sync pipeline state" (if changes)
 * 4. Never pushes, opted in or not: `pushed` is false and `pushSkipped` says why;
 *    /ctoc:push runs the whole test suite and pushes.
 *
 * @param {string} projectPath - Project root
 * @returns {Object} Sync result with details
 */
function fullPlansSync(projectPath = process.cwd()) {
  const config = getSyncConfig(projectPath);
  const result = {
    pulled: false,
    committed: false,
    pushed: false,
    errors: []
  };

  // 1. Pull with rebase
  try {
    const branch = getCurrentBranch(projectPath) || config.branch;
    git(['pull', '--rebase', 'origin', branch], {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    result.pulled = true;
  } catch (e) {
    // May fail if no upstream
    result.errors.push(`Pull: ${e.message}`);
  }

  // 2-3. Stage and commit plans/
  try {
    const status = git(['status', '--porcelain', 'plans/'], {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    if (status) {
      git(['add', 'plans/'], { cwd: projectPath, stdio: 'pipe' });
      git(['commit', '-m', 'plans: sync pipeline state'], {
        cwd: projectPath,
        stdio: 'pipe'
      });
      result.committed = true;
    }
  } catch (e) {
    result.errors.push(`Commit: ${e.message}`);
  }

  // 4. No push on any path; the wording says whether automatic pushing is on.
  result.pushSkipped = config.auto_push
    ? NOT_PUSHED_BY_SYNC
    : 'auto-push disabled (ship gate) — push with /ctoc:push';
  return result;
}

/**
 * Get current git branch name
 * @param {string} projectPath
 * @returns {string|null}
 */
function getCurrentBranch(projectPath = process.cwd()) {
  try {
    return git(['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Silent background pull (for dashboard load)
 * @param {string} projectPath
 * @returns {boolean} Whether pull succeeded
 */
function silentPull(projectPath = process.cwd()) {
  try {
    const branch = getCurrentBranch(projectPath) || 'main';
    git(['pull', '--rebase', 'origin', branch], {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  startAutoSync,
  stopAutoSync,
  syncPlans,
  getLastSync,
  manualSync,
  // New event-triggered sync exports
  getSyncConfig,
  getLastSyncTimestamp,
  isRateLimited,
  checkRemoteChanges,
  detectConflicts,
  autoCommitPlan,
  autoPush,
  onPlanOperation,
  // Plans sync exports
  fullPlansSync,
  getCurrentBranch,
  silentPull
};
