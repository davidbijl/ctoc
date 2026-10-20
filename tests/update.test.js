/**
 * Update Command Tests — in-place fork-checkout model.
 *
 * As of v6.9.x CTOC installs IN PLACE from its git checkout (installPath in
 * installed_plugins.json === the checkout), so `/ctoc:update` fast-forwards
 * that checkout from its own `origin` (the fork) — it does NOT clone a
 * ~/.claude/plugins/cache/robotijn/... copy, does NOT `reset --hard`, and does
 * NOT rewrite the plugin registry. These tests assert that current contract.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

function test(name, fn) {
  try {
    fn();
    console.log(`# ✓ ${name}`);
  } catch (err) {
    console.log(`# ✗ ${name}`);
    console.log(`#   ${err.message}`);
    process.exitCode = 1;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

const UPDATE_JS = path.join(__dirname, '..', 'src', 'commands', 'update.js');
const UPDATE_MD = path.join(__dirname, '..', 'src', 'commands', 'update.md');

console.log('# Update Command Tests');

// ── update.js — in-place fast-forward contract ─────────────────────────────

test('update.js exists and fetches from origin', () => {
  assert(fs.existsSync(UPDATE_JS), 'update.js should exist');
  const content = fs.readFileSync(UPDATE_JS, 'utf8');
  assert(content.includes('fetch origin'), 'should git fetch origin');
  assert(content.includes('--ff-only'), 'should fast-forward only');
});

test('update.js never force-resets or clones (in-place, non-destructive)', () => {
  const content = fs.readFileSync(UPDATE_JS, 'utf8');
  assert(!content.includes('reset --hard'), 'must NOT reset --hard (would clobber the dev checkout)');
  assert(!content.includes('git clone'), 'must NOT clone a marketplace copy (plugin loads in place)');
});

test('update.js has no stale robotijn-cache / marketplace references', () => {
  const content = fs.readFileSync(UPDATE_JS, 'utf8');
  for (const stale of ['cache/robotijn', 'marketplaces', 'MARKETPLACE_DIR', 'CACHE_DIR', 'installed_plugins.json']) {
    assert(!content.includes(stale), `must not reference the obsolete \`${stale}\` plumbing`);
  }
});

test('update.js pulls origin (the fork), not the upstream remote', () => {
  const content = fs.readFileSync(UPDATE_JS, 'utf8');
  assert(content.includes('origin/') || content.includes('fetch origin'), 'should operate on origin');
  // It must not fetch/merge the upstream (robotijn) remote — that is the
  // separate, human-gated review workflow, never /ctoc:update's job.
  assert(!/merge[^\n]*upstream/.test(content) && !/fetch[^\n]*upstream/.test(content),
    'must NOT fetch or merge the `upstream` remote');
});

test('update.js resolves an in-place plugin root (not a hard-coded path)', () => {
  const content = fs.readFileSync(UPDATE_JS, 'utf8');
  assert(content.includes('CLAUDE_PLUGIN_ROOT'), 'should honor CLAUDE_PLUGIN_ROOT');
  for (const bad of ['/home/tijn/ctoc-build', 'ctoc-public', '/ctoc-build/']) {
    assert(!content.includes(bad), `must not contain local dev path: ${bad}`);
  }
});

test('update.js keeps the require.main guard and expected exports', () => {
  const content = fs.readFileSync(UPDATE_JS, 'utf8');
  assert(content.includes('require.main === module'), 'requiring the module must NOT run the update');
  // Sibling test (claude-md-lessons) depends on refreshLocalLessons being exported.
  delete require.cache[require.resolve('../src/commands/update')];
  const mod = require('../src/commands/update');
  for (const fn of ['update', 'refreshLocalLessons', 'readVersion', 'pluginRoot']) {
    assert(typeof mod[fn] === 'function', `should export ${fn}()`);
  }
});

test('update.js error message mentions GitHub, not a vague network note', () => {
  const content = fs.readFileSync(UPDATE_JS, 'utf8');
  assert(content.includes('GitHub'), 'fetch-failure message should name GitHub');
});

// ── behavioral checks of the new pure-ish exports (no process.exit path) ────

test('pluginRoot() honors CLAUDE_PLUGIN_ROOT', () => {
  delete require.cache[require.resolve('../src/commands/update')];
  const { pluginRoot } = require('../src/commands/update');
  const prev = process.env.CLAUDE_PLUGIN_ROOT;
  try {
    process.env.CLAUDE_PLUGIN_ROOT = '/tmp/some-ctoc-root';
    assert(pluginRoot() === '/tmp/some-ctoc-root', 'should return the env-provided root');
  } finally {
    if (prev === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
    else process.env.CLAUDE_PLUGIN_ROOT = prev;
  }
});

test('readVersion() reads VERSION and falls back to "unknown"', () => {
  delete require.cache[require.resolve('../src/commands/update')];
  const { readVersion } = require('../src/commands/update');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-update-'));
  try {
    assert(readVersion(dir) === 'unknown', 'no VERSION file → "unknown"');
    fs.writeFileSync(path.join(dir, 'VERSION'), '9.9.9\n');
    assert(readVersion(dir) === '9.9.9', 'reads and trims the VERSION file');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('VERSION file is valid semver', () => {
  const versionFile = path.join(__dirname, '..', 'VERSION');
  if (fs.existsSync(versionFile)) {
    const version = fs.readFileSync(versionFile, 'utf8').trim();
    assert(/^\d+\.\d+\.\d+$/.test(version), `VERSION should be semver, got: ${version}`);
  } else {
    console.log('#   (VERSION file not present, skipping)');
  }
});

// ── update.md — runs the in-place script, no stale cache plumbing ──────────

test('update.md runs the in-place update.js via CLAUDE_PLUGIN_ROOT', () => {
  const content = fs.readFileSync(UPDATE_MD, 'utf8');
  assert(content.includes('${CLAUDE_PLUGIN_ROOT}/src/commands/update.js'),
    'should invoke the in-place script via CLAUDE_PLUGIN_ROOT');
  assert(!content.includes('cache/robotijn'), 'must not find update.js in the obsolete robotijn cache');
  assert(!content.includes('plugin marketplace add'), 'must not suggest a marketplace reinstall (plugin is in place)');
});

test('update.md does not suppress node stderr', () => {
  const content = fs.readFileSync(UPDATE_MD, 'utf8');
  for (const line of content.split('\n')) {
    if (line.includes('update.js') && line.trim().startsWith('node ')) {
      assert(!line.includes('2>/dev/null'), 'node call should surface stderr (2>&1), not suppress it');
    }
  }
});

console.log('# All update tests passed!');
