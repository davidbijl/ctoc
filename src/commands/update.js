#!/usr/bin/env node
/**
 * CTOC Self-Updater — in-place fork checkout.
 *
 * CTOC is installed IN PLACE from its git checkout (the plugin registry's
 * install location is the checkout itself, e.g. /projects/ctoc/ctoc), NOT copied into a
 * ~/.claude/plugins/cache/<marketplace>/... directory. So "update" means
 * fast-forwarding that checkout's current branch from its own `origin` (the
 * owner's fork) — not cloning a marketplace copy or rewriting the plugin
 * registry (the pre-6.9.x behavior, now obsolete and the cause of the stale
 * `/ctoc:update` that pointed at a cache dir that no longer exists).
 *
 * It pulls `origin` ONLY (the owner's fork). It never touches the `upstream`
 * remote (robotijn/ctoc) — syncing upstream is a separate, human-gated review
 * workflow. The update is fast-forward-only, so it can never force-reset,
 * merge, or otherwise clobber local commits or in-flight work in the checkout
 * (which is where the plugin is actually developed).
 */

const safeFs = require('../lib/safe-fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * The plugin's in-place checkout root. CLAUDE_PLUGIN_ROOT is set by Claude Code
 * when the command runs; otherwise derive it from this script's own location
 * (…/<root>/src/commands/update.js → <root>).
 */
function pluginRoot() {
  return process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..', '..');
}

/**
 * Refresh the local project's CTOC-managed operating-lessons block. Fail-open:
 * a lessons-injection failure is logged to stderr and NEVER aborts the update.
 */
function refreshLocalLessons() {
  try {
    const { ensureLessonsBlock } = require('../lib/claude-md-lessons');
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    const ctocRoot = path.resolve(__dirname, '..', '..');
    ensureLessonsBlock(claudeMdPath, ctocRoot);
  } catch (err) {
    console.error('[CTOC] Lessons block refresh skipped:', err.message);
  }
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
  } catch (e) {
    if (opts.silent) return null;
    throw e;
  }
}

function readVersion(root) {
  const versionFile = path.join(root, 'VERSION');
  if (safeFs.existsSync(versionFile)) {
    return safeFs.readFileSync(versionFile, 'utf8').trim();
  }
  return 'unknown';
}

function update() {
  const root = pluginRoot();
  const currentVersion = readVersion(root);

  console.log('CTOC Update');
  console.log('─'.repeat(40));
  console.log(`Plugin dir:      ${root}`);
  console.log(`Current version: ${currentVersion}`);

  // The plugin loads in place from a git checkout; without .git we cannot pull.
  if (!safeFs.existsSync(path.join(root, '.git'))) {
    console.error(`\n✗ ${root} is not a git checkout — cannot self-update.`);
    console.error('  This build expects CTOC installed in place from its fork checkout');
    console.error('  (the plugin registry\'s install location === the checkout).');
    process.exit(1);
  }

  // 1. Fetch from origin (the fork) — never the `upstream` remote.
  console.log('\n1. Fetching latest from origin (your fork)...');
  try {
    run(`git -C "${root}" fetch origin`);
  } catch (e) {
    console.error('   Failed to fetch from GitHub (origin). Check network connection.');
    process.exit(1);
  }

  const branch = run(`git -C "${root}" rev-parse --abbrev-ref HEAD`, { silent: true }) || 'main';

  // 2. Fast-forward ONLY. Never a destructive reset, never a merge commit — so local
  //    commits or uncommitted work in the checkout are never clobbered. A
  //    non-fast-forward (diverged history, local commits ahead, or local
  //    changes that would be overwritten) fails safely with no mutation.
  console.log(`\n2. Fast-forwarding ${branch} from origin/${branch}...`);
  const merged = run(`git -C "${root}" merge --ff-only "origin/${branch}"`, { silent: true });
  if (merged === null) {
    console.error(`\n✗ Could not fast-forward ${branch} to origin/${branch}.`);
    console.error('  The checkout has diverged (local commits ahead or a non-FF history),');
    console.error('  or local changes would be overwritten. Resolve it with git, then re-run.');
    console.error('  (Deliberate: /ctoc:update never force-resets the checkout the plugin is developed in.)');
    process.exit(1);
  }

  const newVersion = readVersion(root);

  console.log('\n' + '─'.repeat(40));
  if (currentVersion === newVersion) {
    console.log(`✓ Already up to date (v${newVersion})`);
  } else {
    console.log(`✓ Updated: ${currentVersion} → ${newVersion}`);
  }

  // Refresh the local project's CLAUDE.md operating-lessons block (fail-open).
  refreshLocalLessons();

  console.log('\nNew Claude Code sessions pick up the change automatically (the plugin');
  console.log('loads in place from this checkout). Restart a running session to use it now.');
}

if (require.main === module) {
  update();
}

module.exports = { update, refreshLocalLessons, readVersion, pluginRoot };
