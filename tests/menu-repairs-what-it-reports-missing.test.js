/**
 * The menu REPAIRS what it reports missing, instead of narrating it forever
 * (plan 00176).
 *
 * The dead end this closes, reported by a live user and verified in code: the
 * setup trigger was `!existsSync(path.join(root, '.ctoc'))` — initialization was
 * attempted ONLY when the config directory was entirely absent. But a Write hook
 * (`PreToolUse.Write.js`, `appendLog`) creates `.ctoc/logs/` with
 * `mkdirSync(..., { recursive: true })` before the human ever opens the menu. So
 * `.ctoc/` exists, the trigger never fires, the read-back correctly reports every
 * artifact missing, the message says "Nothing here will work properly until that
 * is fixed" — and no code path anywhere fixes it. The project is permanently
 * uninitialisable, and the message is an honest dead end.
 *
 * The fix: the TRIGGER becomes the read-back. `ensureInitialized` runs
 * `verifySetup` first; when anything is missing it attempts the idempotent
 * `initProject` (which skips every file already present) and re-verifies. A
 * bare/partial `.ctoc/` ends up genuinely set up. A gap that truly cannot be
 * repaired (a permission/ownership failure) still renders the menu — fail-open —
 * AND the message now carries a concrete fix action, not only a description.
 *
 * A lesson these fixtures encode (from the sibling slice): a fixture that is
 * always well-formed cannot find a defect in what happens when the world is not.
 * Every case that matters builds a BROKEN world — a partial `.ctoc/` holding only
 * `.ctoc/logs/`, a bare `.ctoc/`, a deleted stage directory, a `plans` that is a
 * file, a settings write that fails at its real source.
 *
 * Cross-platform: path.join, os.tmpdir(), fs.rmSync teardown, no shell.
 */

'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const menu = require('../src/commands/start');
const safeFs = require('../src/lib/safe-fs');
const { initProject, repairRequiredArtifacts } = require('../src/lib/init-project');

const REPO = path.join(__dirname, '..');
const MENU_ENTRY = path.join(__dirname, '..', 'src', 'commands', 'start.js');
const INIT_PROJECT_PATH = require.resolve('../src/lib/init-project');

const tmpDirs = [];

function freshDir(prefix = 'menu-repair-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  // Resolve symlinks (macOS /var → /private/var) so a spawned-process cwd and the
  // in-process root agree; otherwise a path comparison would differ per platform.
  return fs.realpathSync(dir);
}

after(() => {
  for (const dir of tmpDirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* teardown */ }
  }
});

const STAGE_DIRS = [
  'vision', 'canvas', 'functional', 'implementation',
  'todo', 'in-progress', 'review', 'done'
].map((s) => path.join('plans', s));

/** Build a fully valid, already-set-up project WITHOUT calling initProject. */
function seedValidProject(dir, { settingsBody } = {}) {
  fs.mkdirSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
  for (const d of STAGE_DIRS) fs.mkdirSync(path.join(dir, d), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.ctoc', 'settings.yaml'),
    settingsBody !== undefined
      ? settingsBody
      : 'version: 1\n\nregulatory_regime:\n  active_profiles: []\n',
    'utf8'
  );
  fs.writeFileSync(path.join(dir, '.ctoc', 'state', 'iron-loop.yaml'), 'step: 1\n', 'utf8');
  return dir;
}

/** The exact side effect a Write hook has already had before the menu opens. */
function partialCtocFromWriteHook(dir) {
  fs.mkdirSync(path.join(dir, '.ctoc', 'logs'), { recursive: true });
  return dir;
}

// --- safe-fs seam -----------------------------------------------------------
// A permission fixture would have to be skipped on some platform, and a skipped
// test is a gate failure in this repository. The seam makes a write fail at its
// real source, in-process, on every platform.
const realWriteFileSync = safeFs.writeFileSync;
function throwWritesTo(fragment) {
  safeFs.writeFileSync = function patched(target, ...rest) {
    if (typeof target === 'string' && target.replace(/\\/g, '/').includes(fragment)) {
      throw new Error(`EACCES: permission denied, open '${target}'`);
    }
    return realWriteFileSync.call(this, target, ...rest);
  };
}
function restoreWrites() {
  safeFs.writeFileSync = realWriteFileSync;
}
afterEach(restoreWrites);
beforeEach(restoreWrites);

/** Drive the real entry point and parse the JSON screen it prints. */
function driveMenu(cwd) {
  const out = execFileSync(process.execPath, [MENU_ENTRY], { cwd, env: cleanEnv(), encoding: 'utf8' });
  return { out, parsed: JSON.parse(out.slice(out.indexOf('{'))) };
}

const settingsPath = (dir) => path.join(dir, '.ctoc', 'settings.yaml');

describe('the menu repairs what it reports missing', () => {
  it('1 — the reported dead end is reachable, and the first open repairs it', () => {
    // Partial `.ctoc/` holding only `.ctoc/logs/`, exactly as the Write hook
    // leaves it. The OLD trigger (`.ctoc` exists → never attempt) leaves this
    // permanently `ok:false`. The read-back trigger repairs it on the first open.
    const dir = partialCtocFromWriteHook(freshDir());

    const first = menu.ensureInitialized(dir);
    assert.equal(first.attempted, true, 'a partial .ctoc/ must trigger a repair, not be skipped');
    assert.equal(first.ok, true, `expected repaired, missing: ${JSON.stringify(first.missing)}`);
    assert.ok(fs.existsSync(settingsPath(dir)), '.ctoc/settings.yaml must exist after the repair');

    const second = menu.ensureInitialized(dir);
    assert.equal(second.ok, true, 'and it stays set up on the second open');
    assert.equal(second.attempted, false, 'a now-healthy project attempts nothing on reopen');
  });

  it('2 — a bare .ctoc directory is repaired, not narrated', () => {
    const dir = freshDir();
    fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });

    const setup = menu.ensureInitialized(dir);
    assert.equal(setup.attempted, true, 'a bare .ctoc/ is a broken world, not a set-up project');
    assert.equal(setup.ok, true, `expected repaired, missing: ${JSON.stringify(setup.missing)}`);
    assert.ok(fs.existsSync(settingsPath(dir)), 'settings.yaml exists on disk afterwards');
  });

  it('3 — the repair is provable from disk, not inferred from what init claims', () => {
    const dir = freshDir();
    fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });

    const setup = menu.ensureInitialized(dir);
    assert.ok(Array.isArray(setup.missingBefore), 'missingBefore is part of the verdict');
    assert.ok(setup.missingBefore.length > 0, 'the pre-check found real gaps');
    assert.deepEqual(setup.missing, [], 'the post-check finds none — a repair demonstrably happened');
    assert.equal(setup.ok, true);
  });

  it('4 — a genuinely empty directory still initialises', () => {
    const dir = freshDir();
    const setup = menu.ensureInitialized(dir);
    assert.equal(setup.attempted, true);
    assert.equal(setup.ok, true, `missing: ${JSON.stringify(setup.missing)}`);
    assert.ok(fs.existsSync(settingsPath(dir)), 'artifacts on disk');
  });

  it('5 — re-running is idempotent; settings bytes are stable and .gitignore cannot grow', () => {
    const dir = freshDir();
    fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });
    // Seed a .gitignore holding ONLY `.ctoc/logs/` — the disjunctive-guard state
    // named as a wart in the plan. It may gain the CTOC block at most ONCE more.
    fs.writeFileSync(path.join(dir, '.gitignore'), '.ctoc/logs/\n', 'utf8');

    menu.ensureInitialized(dir);                       // run 1 — repairs
    const settingsAfter1 = fs.readFileSync(settingsPath(dir), 'utf8');
    const gitignoreAfter1 = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');

    menu.ensureInitialized(dir);                       // run 2
    const settingsAfter2 = fs.readFileSync(settingsPath(dir), 'utf8');
    const gitignoreAfter2 = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');

    menu.ensureInitialized(dir);                       // run 3
    const settingsAfter3 = fs.readFileSync(settingsPath(dir), 'utf8');
    const gitignoreAfter3 = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');

    assert.equal(settingsAfter2, settingsAfter1, 'settings.yaml is not rewritten on run 2');
    assert.equal(settingsAfter3, settingsAfter1, 'nor on run 3');
    assert.equal(gitignoreAfter2, gitignoreAfter1, '.gitignore has converged by run 2 — it cannot grow');
    assert.equal(gitignoreAfter3, gitignoreAfter1, 'nor on run 3');
    // The block landed at most once beyond the seeded line.
    const stateLines = gitignoreAfter1.split('\n').filter((l) => l.trim() === '.ctoc/state/');
    assert.ok(stateLines.length <= 1, `.ctoc/state/ appears at most once, got ${stateLines.length}`);
  });

  it('6 — a healthy project attempts nothing and says nothing', () => {
    const dir = seedValidProject(freshDir());
    const setup = menu.ensureInitialized(dir);
    assert.equal(setup.attempted, false, 'no repair on a complete project');
    assert.deepEqual(setup.created, [], 'nothing written');
    assert.equal(menu.setupMessage(setup), null, 'silence is correct for a healthy project');
  });

  it('7 — an unrepairable failure renders AND names both what remains and an action', () => {
    // The settings write fails at its real source. Setup tries, cannot finish,
    // and the human must get more than a description of the problem.
    const dir = freshDir();
    fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });
    throwWritesTo('.ctoc/settings.yaml');
    const setup = menu.ensureInitialized(dir);
    restoreWrites();

    assert.equal(setup.attempted, true);
    assert.equal(setup.ok, false, 'a settings file that could not be written is not set up');
    const message = menu.setupMessage(setup);
    assert.ok(message && message.length > 0, 'the screen still renders a message — fail-open');
    assert.ok(message.includes('.ctoc/settings.yaml'), `must name what remains: ${message}`);
    // The half this slice adds: a concrete action, not only a description.
    assert.match(
      message, /reopen CTOC|make sure CTOC can write/,
      `the message must carry a fix action, got: ${message}`
    );
  });

  it('8 — a partial world is repaired partially; an intact settings file is NOT rewritten', () => {
    const dir = seedValidProject(freshDir());
    const settingsBefore = fs.readFileSync(settingsPath(dir), 'utf8');
    fs.rmSync(path.join(dir, 'plans', 'review'), { recursive: true, force: true });

    const setup = menu.ensureInitialized(dir);
    assert.equal(setup.ok, true, `the missing directory must be recreated, missing: ${JSON.stringify(setup.missing)}`);
    assert.ok(fs.existsSync(path.join(dir, 'plans', 'review')), 'plans/review is back');
    assert.equal(fs.readFileSync(settingsPath(dir), 'utf8'), settingsBefore,
      'the intact settings.yaml is left byte-for-byte alone');
  });

  it('9 — an anchorless settings file is still caught, not falsely repaired', () => {
    // initProject will not overwrite an existing settings.yaml, so an unusable
    // anchor stays unusable — the sibling slice\'s two-part check still governs.
    const dir = seedValidProject(freshDir(), { settingsBody: 'version: 1\nenforcement:\n  mode: strict\n' });
    const setup = menu.ensureInitialized(dir);
    assert.equal(setup.ok, false, 'an unusable anchor is still missing after a repair pass');
    assert.ok(setup.missing.some((m) => m.includes('active_profiles')),
      `missing must name the anchor, got ${JSON.stringify(setup.missing)}`);
  });

  it('10 — a throwing initialisation is attempted-and-failed, and still renders', () => {
    const dir = freshDir();
    fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });
    const original = require.cache[INIT_PROJECT_PATH];
    require.cache[INIT_PROJECT_PATH] = {
      id: INIT_PROJECT_PATH,
      filename: INIT_PROJECT_PATH,
      loaded: true,
      exports: { initProject() { throw new Error('disk on fire'); } }
    };
    let setup;
    try {
      setup = menu.ensureInitialized(dir);
    } finally {
      if (original) require.cache[INIT_PROJECT_PATH] = original;
      else delete require.cache[INIT_PROJECT_PATH];
    }

    assert.equal(setup.attempted, true, '"we tried and failed" is not "we did not try"');
    assert.equal(setup.ok, false);
    assert.ok(setup.reason && setup.reason.includes('disk on fire'), `reason survives: ${setup.reason}`);
    const message = menu.setupMessage(setup);
    assert.ok(message && message.length > 0, 'the screen still renders');
    assert.match(message, /reopen CTOC|make sure CTOC can write/, 'and carries an action');
  });

  it('11 — the dashboard renders in every broken fixture; nothing is bricked', () => {
    // Repairable, across the process boundary: a partial `.ctoc/logs/`.
    const repairable = partialCtocFromWriteHook(freshDir());
    const a = driveMenu(repairable);
    assert.ok(typeof a.parsed.text === 'string' && a.parsed.text.length > 0, 'repairable fixture renders');

    // Unrepairable, across the boundary (no in-process seam survives a child):
    // `plans` is a FILE, so the stage directories can never be created.
    const unrepairable = freshDir();
    fs.mkdirSync(path.join(unrepairable, '.ctoc'), { recursive: true });
    fs.writeFileSync(path.join(unrepairable, 'plans'), 'not a directory\n', 'utf8');
    const b = driveMenu(unrepairable);
    assert.ok(typeof b.parsed.text === 'string' && b.parsed.text.length > 0, 'unrepairable fixture still renders');
    assert.ok(b.parsed.text.includes('plans/'), 'and carries the truth about what is missing');
  });

  it('12 — no absolute path and no stack frame reaches the screen', () => {
    // Case 7 style (in-process seam) and case 10 style (throwing init) both feed
    // `reason` into the message; neither may leak the filesystem layout.
    const dir = freshDir();
    fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });
    throwWritesTo('.ctoc/settings.yaml');
    const setup = menu.ensureInitialized(dir);
    restoreWrites();
    const message = menu.setupMessage(setup);
    assert.ok(!message.includes(dir), `no absolute project path may appear: ${message}`);
    assert.ok(!message.includes(os.homedir()), 'no home-directory path may appear');
    assert.ok(!/\bat\s+\S+:\d+:\d+/.test(message), 'no stack frame may appear');
  });

  it('13 — a nested repository is set up as itself, leaving the outer project untouched', () => {
    const outer = seedValidProject(freshDir());
    const outerReviewBefore = fs.readdirSync(path.join(outer, 'plans', 'review'));
    const inner = path.join(outer, 'inner-repo');
    fs.mkdirSync(path.join(inner, '.git'), { recursive: true });

    const setup = menu.ensureInitialized(inner);
    assert.equal(setup.ok, true, `the inner repository must set itself up, missing: ${JSON.stringify(setup.missing)}`);
    assert.ok(fs.existsSync(path.join(inner, '.ctoc', 'settings.yaml')), 'inner project gets its own settings');
    // The outer project is untouched — the repair reads the root it is given.
    assert.deepEqual(fs.readdirSync(path.join(outer, 'plans', 'review')), outerReviewBefore,
      'the outer project gains nothing');
  });

  it('14 — end to end, as a human runs it: stdout and the filesystem agree', () => {
    const dir = partialCtocFromWriteHook(freshDir());
    const { parsed } = driveMenu(dir);
    const announcedSetUp = /CTOC is set up for this project/.test(parsed.text);
    const settingsOnDisk = fs.existsSync(settingsPath(dir));

    assert.equal(announcedSetUp, settingsOnDisk,
      `announcement and filesystem must agree.\n` +
      `announced set up: ${announcedSetUp}\n` +
      `settings on disk: ${settingsOnDisk}\n` +
      `text: ${parsed.text.slice(0, 300)}`);
    assert.equal(settingsOnDisk, true, 'the partial .ctoc/ must end up genuinely set up');
    assert.ok(announcedSetUp, 'and the screen must say so');
  });
});

// =============================================================================
// Opening the menu in a fresh git worktree writes no stray half-filled
// IRON_LOOP.md (cases 15-32; the last five are the review and security fixes, below).
//
// A fresh worktree is a fresh checkout, so the git-ignored `.ctoc/state/` is absent
// there and the read-back reports the state file missing. Setup then ran in full and
// wrote every absent file, among them a root `IRON_LOOP.md` that git neither tracks
// nor ignores: the raw template with 19 unfilled placeholders. The owner's answer is
// "Stop writing IRON_LOOP.md"; a set-up project (one that holds its settings file)
// is repaired narrowly, writing only empty folders and the ignored state file.
//
// Every fixture is a temporary repository under os.tmpdir(); no case runs git in
// CTOC's own repository or writes into it.
// =============================================================================

// No GIT_* variable may reach a fixture: the local pre-push hook runs this suite, and an
// inherited GIT_DIR would point `git worktree add` at the real repository.
function cleanEnv() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^GIT_/i.test(k)) env[k] = v;
  // Neither the developer's global git settings (a global exclude file would hide a stray
  // file from `git status`) nor the system's reach a fixture or the menu child
  // (as tests/test-selection-scope.test.js does).
  env.GIT_CONFIG_GLOBAL = os.devNull;
  env.GIT_CONFIG_SYSTEM = os.devNull;
  return env;
}

// `maintenance.auto=false` and `gc.auto=0` keep git from starting a detached maintenance run
// that could still write into a fixture while it is read or removed.
const GIT_IDENTITY = ['-c', 'user.name=CTOC Test', '-c', 'user.email=test@test.invalid', '-c', 'commit.gpgsign=false',
  '-c', 'maintenance.auto=false', '-c', 'gc.auto=0'];
function git(cwd, args) {
  const r = spawnSync('git', [...GIT_IDENTITY, ...args], { cwd, encoding: 'utf8', shell: false, env: cleanEnv() });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

const STAGE_NAMES = STAGE_DIRS.map((d) => d.split(path.sep)[1]);
const FIXTURE_PLAN = 'fresh-worktree-fixture.md';
const SETUP_OK = 'CTOC is set up for this project.';
const SETUP_PARTIAL = 'CTOC is not fully set up';
const SETUP_FAILED = 'CTOC could not finish setting up';
const SETUP_SENTENCES = [SETUP_OK, SETUP_PARTIAL, SETUP_FAILED];
const PLACEHOLDER = /\{\{[A-Z0-9_]+\}\}/;
const CTOC_BLOB = 'https://github.com/robotijn/ctoc/blob/main/';
const STATE_FILE = '.ctoc/state/iron-loop.yaml';

/** A committed, already-set-up project (as a maintainer's main checkout holds it). */
function makeSetUpRepo() {
  const root = freshDir('menu-worktree-');
  git(root, ['init', '-q']);
  const put = (rel, text) => {
    const abs = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  };
  put('CLAUDE.md', '# acme-worktree\n\n<!-- CTOC:LESSONS v1 START -->\nan out-of-date lesson line\n<!-- CTOC:LESSONS v1 END -->\n');
  put('.ctoc/settings.yaml', 'version: 1\n\nregulatory_regime:\n  active_profiles: []\n');
  for (const stage of STAGE_NAMES) put(`plans/${stage}/.gitkeep`, '');
  put(`plans/todo/${FIXTURE_PLAN}`, '# A plan in the build queue\n');
  // A byte copy of CTOC's own ignore list: a hand-picked one could be widened until the test passes.
  fs.writeFileSync(path.join(root, '.gitignore'), fs.readFileSync(path.join(REPO, '.gitignore')));
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '--no-verify', '-m', 'base']);
  return root;
}

/** A fresh worktree inside the repository's folder, as CTOC's own sit under `.claude/worktrees/`. */
function addWorktree(root, name) {
  const target = path.join(root, '.claude', 'worktrees', name);
  git(root, ['worktree', 'add', '-q', '--detach', target, 'HEAD']);
  return fs.realpathSync(target);
}

const status = (dir) => git(dir, ['status', '--porcelain', '--untracked-files=all']);

/** Run the real menu as a separate process; returns the raw stdout and the parsed screen. */
function runMenu(cwd, args) {
  const out = execFileSync(process.execPath, [MENU_ENTRY, ...args], { cwd, env: cleanEnv(), encoding: 'utf8' });
  return { out, screen: JSON.parse(out.slice(out.indexOf('{'))) };
}
const runPlan = (cwd) => runMenu(cwd, ['plan', `todo/${FIXTURE_PLAN}`]);

/** Every file under `root` outside `.git/`, as forward-slash relative paths. */
function listFiles(root) {
  const found = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else found.push(path.relative(root, abs).split(path.sep).join('/'));
    }
  })(root);
  return found.sort();
}

/** A brand-new git project folder holding the given files. */
function newProject(files) {
  const dir = freshDir('menu-new-project-');
  git(dir, ['init', '-q']);
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  }
  return dir;
}

describe('a fresh worktree of a set-up project stays clean', () => {
  it('15 — the cause: a fresh worktree lacks exactly the ignored state file', () => {
    const worktree = addWorktree(makeSetUpRepo(), 'cause');
    assert.deepEqual(menu.verifySetup(worktree).missing, [STATE_FILE]);
  });

  it('16 — the control run: with the state file present, the menu changes nothing and says nothing', () => {
    const worktree = addWorktree(makeSetUpRepo(), 'control');
    // The state file as an earlier menu run leaves it in a main checkout (git-ignored).
    fs.mkdirSync(path.join(worktree, '.ctoc', 'state'), { recursive: true });
    fs.writeFileSync(path.join(worktree, '.ctoc', 'state', 'iron-loop.yaml'), 'step: 1\n');
    const before = status(worktree);

    const { out } = runPlan(worktree);

    assert.equal(status(worktree), before, 'git status must be exactly what it was');
    for (const sentence of SETUP_SENTENCES) {
      assert.ok(!out.includes(sentence), `the screen must not say "${sentence}"`);
    }
  });

  it('17 — a fresh worktree stays clean, and the second run is silent', () => {
    const worktree = addWorktree(makeSetUpRepo(), 'clean');
    const before = status(worktree);

    const first = runPlan(worktree);
    assert.equal(status(worktree), before, 'git status must be exactly what it was before the menu opened');
    assert.ok(!fs.existsSync(path.join(worktree, 'IRON_LOOP.md')), 'no IRON_LOOP.md at the worktree root');
    assert.ok(!first.out.includes(SETUP_PARTIAL), 'no "not fully set up" on the screen');
    assert.ok(!first.out.includes(SETUP_FAILED), 'no "could not finish setting up" on the screen');

    const second = runPlan(worktree);
    for (const sentence of SETUP_SENTENCES) {
      assert.ok(!second.out.includes(sentence), `the second run must not say "${sentence}"`);
    }
  });

  it('18 — a repair that cannot write says so and writes nothing else', () => {
    const worktree = addWorktree(makeSetUpRepo(), 'cannot-write');
    // A plain file takes the path `.ctoc/state`: the state file can never be created (same on every platform).
    fs.writeFileSync(path.join(worktree, '.ctoc', 'state'), 'not a directory\n');
    const before = status(worktree);
    assert.match(before, /\?\? \.ctoc\/state\n/, 'the plain file shows, because the ignore pattern matches only a folder');

    const { out, screen } = runPlan(worktree);

    assert.ok(screen.text.startsWith('CTOC could not finish setting up this project.'),
      `the screen must open with the failure sentence, got: ${String(screen.text).slice(0, 200)}`);
    const paragraph = screen.text.split('\n\n')[0];
    assert.ok(paragraph.includes(STATE_FILE), `the first paragraph names the missing state file: ${paragraph}`);
    const at = paragraph.lastIndexOf('To fix it, ');
    assert.ok(at > 0, `the first paragraph ends with its "To fix it, ..." sentence: ${paragraph}`);
    assert.ok(!paragraph.slice(at).includes('. '), 'that sentence is the last one of the paragraph');
    assert.ok(paragraph.endsWith('.'), 'and it ends the paragraph');
    assert.ok(!out.includes(worktree) && !out.includes(JSON.stringify(worktree).slice(1, -1)),
      'the worktree path must not reach the screen');
    assert.equal(status(worktree), before, 'git status must be exactly what it was before the menu opened');
  });
});

describe('a brand-new project gets only true files', () => {
  it('19 — a project that only looks set up (a hook wrote .ctoc/logs/) is still set up in full', () => {
    const dir = newProject({});
    fs.mkdirSync(path.join(dir, '.ctoc', 'logs'), { recursive: true });

    const { screen } = runMenu(dir, []);

    const expected = ['.ctoc/settings.yaml', STATE_FILE, 'CLAUDE.md', ...STAGE_NAMES.map((s) => `plans/${s}`)];
    for (const rel of expected) {
      assert.ok(fs.existsSync(path.join(dir, ...rel.split('/'))), `${rel} must exist after the first open`);
    }
    assert.ok(screen.text.includes(SETUP_OK), `the screen says the project is set up, got: ${screen.text.slice(0, 200)}`);
  });

  describe('after the first open of a project named acme-shop', () => {
    let dir;
    let written;
    let screenText;
    before(() => {
      dir = newProject({
        'package.json': JSON.stringify({ name: 'acme-shop', version: '1.0.0' }),
        'src/index.js': 'console.log("shop");\n'
      });
      const filesBefore = new Set(listFiles(dir));
      screenText = runMenu(dir, []).screen.text;
      written = listFiles(dir).filter((f) => !filesBefore.has(f));
    });

    it('20 — no file setup wrote holds an unfilled placeholder', () => {
      assert.ok(screenText.includes(SETUP_OK), `the screen says the project is set up, got: ${screenText.slice(0, 200)}`);
      assert.ok(written.includes('CLAUDE.md'), `setup wrote files, got: ${JSON.stringify(written)}`);
      for (const rel of written) {
        const text = fs.readFileSync(path.join(dir, ...rel.split('/')), 'utf8');
        assert.ok(!PLACEHOLDER.test(text), `${rel} holds an unfilled placeholder`);
      }
      assert.ok(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').includes('acme-shop'), 'CLAUDE.md names the project');
    });

    it('21 — every link in the new CLAUDE.md leads to a file', () => {
      const claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
      const targets = [...claude.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]);
      for (const target of targets) {
        if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
        const file = target.split('#')[0];
        assert.ok(fs.existsSync(path.join(dir, ...file.split('/'))), `the relative link ${target} names a file that does not exist`);
      }
      assert.ok(claude.includes(`${CTOC_BLOB}docs/IRON_LOOP.md`), 'the Iron Loop links point at CTOC\'s own document');
      const blobLinks = targets.filter((t) => t.startsWith(CTOC_BLOB));
      assert.ok(blobLinks.length >= 1, 'the check must not run on nothing');
      for (const link of blobLinks) {
        const inTree = link.slice(CTOC_BLOB.length).split('#')[0];
        assert.ok(fs.existsSync(path.join(REPO, ...inTree.split('/'))), `${link} names a path that is not in CTOC's tree`);
      }
    });

    it('22 — the README\'s setup promise matches what setup wrote', () => {
      const lines = fs.readFileSync(path.join(REPO, 'README.md'), 'utf8').split('\n');
      const at = lines.findIndex((l) => l.startsWith('There is no init command.'));
      // README has two "You know it worked when" sentences; the one about first setup names the files it makes.
      const worked = lines.find((l) => l.replace(/\*\*/g, '').startsWith('You know it worked when') && l.includes('CLAUDE.md'));
      assert.ok(at >= 0, 'README holds the "There is no init command." paragraph');
      assert.ok(worked, 'README holds the "You know it worked when" sentence');
      const promise = `${lines[at]}\n${worked}`;
      for (const [, token] of promise.matchAll(/`([^`]+)`/g)) {
        if (!/^[\w.-]+(\/[\w.-]*)*$/.test(token) || token.startsWith('/')) continue;
        assert.ok(fs.existsSync(path.join(dir, ...token.split('/').filter(Boolean))), `README promises ${token}, and setup did not write it`);
      }
      assert.equal(/IRON_LOOP\.md/.test(promise), fs.existsSync(path.join(dir, 'IRON_LOOP.md')),
        'README names IRON_LOOP.md only if setup wrote it');
      const next = lines.slice(at + 1).find((l) => l.trim() !== '');
      assert.ok(next && next.includes('IRON_LOOP.md') && /safe to delete/.test(next),
        'the paragraph after it tells projects set up earlier that their IRON_LOOP.md is safe to delete');
    });
  });

  it('23 — a developer\'s own IRON_LOOP.md is kept', () => {
    const dir = newProject({ 'IRON_LOOP.md': '# my own notes' });
    runMenu(dir, []);
    assert.equal(fs.readFileSync(path.join(dir, 'IRON_LOOP.md'), 'utf8'), '# my own notes');
  });
});

describe('the narrow repair and the failure sentence, in process', () => {
  it('24 — the repair writes only what is missing', () => {
    const dir = seedValidProject(freshDir());
    fs.rmSync(path.join(dir, '.ctoc', 'state', 'iron-loop.yaml'));
    fs.rmSync(path.join(dir, 'plans', 'review'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');

    const report = repairRequiredArtifacts(dir);

    assert.ok(report.created.includes('plans/review/'), `created: ${JSON.stringify(report.created)}`);
    assert.ok(report.created.includes(STATE_FILE), `created: ${JSON.stringify(report.created)}`);
    for (const entry of report.created) {
      assert.ok(entry.endsWith('/') || entry === STATE_FILE, `only folders and the state file: ${entry}`);
    }
    assert.ok(!fs.existsSync(path.join(dir, 'CLAUDE.md')), 'no CLAUDE.md');
    assert.equal(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), 'node_modules/\n', '.gitignore is byte-identical');
    assert.equal(report.success, true);
    assert.deepEqual(report.missing, []);
    assert.deepEqual(report.wouldCreate, []);
    assert.equal(report.dryRun, false);
  });

  it('25 — the repair that cannot write reports it, without the project path', () => {
    const dir = seedValidProject(freshDir());
    fs.rmSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.ctoc', 'state'), 'not a directory\n');

    const report = repairRequiredArtifacts(dir);

    assert.equal(report.failed.length, 1, `failed: ${JSON.stringify(report.failed)}`);
    assert.ok(report.failed[0].startsWith(STATE_FILE), report.failed[0]);
    assert.ok(!report.failed[0].includes(dir), 'the project path is scrubbed from the failure');
    assert.equal(report.success, false);
    assert.deepEqual(report.missing, [STATE_FILE]);
  });

  it('26 — the menu chooses by the settings file', () => {
    // (a) A set-up project that lost only its ignored state file: nothing visible is written.
    const a = seedValidProject(freshDir());
    fs.rmSync(path.join(a, '.ctoc', 'state', 'iron-loop.yaml'));
    const claudeA = '# acme\n\n<!-- CTOC:LESSONS v1 START -->\nan out-of-date lesson line\n<!-- CTOC:LESSONS v1 END -->\n';
    fs.writeFileSync(path.join(a, 'CLAUDE.md'), claudeA);
    fs.writeFileSync(path.join(a, '.gitignore'), 'node_modules/\n');

    const setupA = menu.ensureInitialized(a);

    assert.equal(setupA.attempted, true);
    assert.equal(setupA.ok, true, `missing: ${JSON.stringify(setupA.missing)}`);
    assert.equal(fs.readFileSync(path.join(a, 'CLAUDE.md'), 'utf8'), claudeA, 'CLAUDE.md is byte-identical');
    assert.equal(fs.readFileSync(path.join(a, '.gitignore'), 'utf8'), 'node_modules/\n', '.gitignore is byte-identical');
    assert.ok(!fs.existsSync(path.join(a, 'IRON_LOOP.md')), 'no IRON_LOOP.md');

    // (b) No settings file: the full setup runs, CLAUDE.md included.
    const b = partialCtocFromWriteHook(freshDir());
    const setupB = menu.ensureInitialized(b);
    assert.equal(setupB.ok, true, `missing: ${JSON.stringify(setupB.missing)}`);
    assert.ok(fs.existsSync(path.join(b, 'CLAUDE.md')), 'the full setup wrote CLAUDE.md');
  });

  it('27 — the failure sentence reaches a sub-command screen, and only a failure does', () => {
    const failed = { attempted: true, ok: false, missing: [STATE_FILE], reason: null };
    const healthy = { attempted: false, ok: true, missing: [] };
    const sentence = menu.setupMessage(failed);

    const same = { text: 'screen' };
    assert.equal(menu.withSetupFailure(same, healthy), same, 'a healthy verdict returns the same object');
    assert.equal(same.text, 'screen', 'and leaves its text alone');
    assert.equal(menu.withSetupFailure({ text: 'screen' }, failed).text, `${sentence}\n\nscreen`);
    assert.equal(menu.withSetupFailure({}, failed).text, sentence);
    assert.equal(menu.withSetupFailure(undefined, failed), undefined);
  });
});

// =============================================================================
// Setup refuses to write through a symbolic link, scrubs a thrown error where it is
// caught, and the fixtures read none of the developer's git settings (cases 28-32).
// =============================================================================

// A symbolic-link capability probe (the pattern of tests/the-owner-answers-an-inbox-question.test.js):
// where a link cannot be made, the link cases FAIL LOUDLY with the platform and the error, never skip.
let SYMLINK_ERR = null;
before(() => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-repair-link-probe-'));
  try {
    fs.symlinkSync('target', path.join(d, 'l'));
  } catch (e) {
    SYMLINK_ERR = e;
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});
function requireSymlinks() {
  if (SYMLINK_ERR) {
    assert.fail(`symbolic-link creation is unavailable on ${process.platform} ` +
      `(${SYMLINK_ERR.code}: ${SYMLINK_ERR.message}); the link cases cannot run and FAIL rather than skip.`);
  }
}

describe('setup refuses to write through a symbolic link', () => {
  it('28 — the narrow repair refuses links', () => {
    requireSymlinks();
    const cases = [
      ['.ctoc/state replaced by a link to the outside', (dir, outside) => {
        fs.rmSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
        fs.symlinkSync(outside, path.join(dir, '.ctoc', 'state'), 'dir');
      }, [STATE_FILE]],
      ['the state file replaced by a dangling link', (dir, outside) => {
        fs.rmSync(path.join(dir, '.ctoc', 'state', 'iron-loop.yaml'));
        fs.symlinkSync(path.join(outside, 'planted.yaml'), path.join(dir, '.ctoc', 'state', 'iron-loop.yaml'), 'file');
      }, [STATE_FILE]],
      ['.ctoc/learnings as a link to the outside', (dir, outside) => {
        fs.symlinkSync(outside, path.join(dir, '.ctoc', 'learnings'), 'dir');
      }, []]
    ];
    for (const [name, arrange, expectedMissing] of cases) {
      const dir = seedValidProject(freshDir());
      const outside = freshDir('menu-outside-');
      arrange(dir, outside);

      const report = repairRequiredArtifacts(dir);

      assert.deepEqual(fs.readdirSync(outside), [], `${name}: nothing may be written outside the project`);
      assert.ok(report.failed.length > 0, `${name}: the refusal is recorded`);
      for (const entry of report.failed) {
        assert.match(entry, /symbolic link/, `${name}: every failed entry names the link: ${entry}`);
        assert.ok(!entry.includes(dir), `${name}: no absolute path in ${entry}`);
      }
      assert.equal(report.success, false, name);
      assert.deepEqual(report.missing, expectedMissing, name);
    }
  });

  it('28b — a project reached through a link is still repaired: the root itself is never checked', () => {
    requireSymlinks();
    const dir = seedValidProject(freshDir());
    const link = path.join(freshDir('menu-root-link-'), 'project');
    fs.symlinkSync(dir, link, 'dir');
    fs.rmSync(path.join(dir, '.ctoc', 'state', 'iron-loop.yaml'));

    const report = repairRequiredArtifacts(link);

    assert.equal(report.success, true, `failed: ${JSON.stringify(report.failed)}`);
    assert.ok(fs.existsSync(path.join(dir, '.ctoc', 'state', 'iron-loop.yaml')), 'the state file is back');
  });

  it('28c — the state file is created exclusively, so a link planted after the check is not written through', () => {
    requireSymlinks();
    const dir = seedValidProject(freshDir());
    const outside = freshDir('menu-outside-');
    const planted = path.join(outside, 'planted.yaml');
    const stateFile = path.join(dir, '.ctoc', 'state', 'iron-loop.yaml');
    fs.rmSync(stateFile);
    fs.symlinkSync(planted, stateFile, 'file');
    // The race, made deterministic: the link check reads the final name as absent, as if
    // the link were planted only after the check; the write is then the only guard left.
    const realLstat = safeFs.lstatSync;
    safeFs.lstatSync = function patched(target, ...rest) {
      if (typeof target === 'string' && target === stateFile) return undefined;
      return realLstat.call(this, target, ...rest);
    };
    let report;
    try {
      report = repairRequiredArtifacts(dir);
    } finally {
      safeFs.lstatSync = realLstat;
    }

    assert.ok(!fs.existsSync(planted), 'nothing was created at the link target');
    assert.equal(report.failed.length, 1, `failed: ${JSON.stringify(report.failed)}`);
    assert.equal(report.success, false);
  });

  it('29 — the full setup refuses links', () => {
    requireSymlinks();
    const dir = freshDir();
    const outside = freshDir('menu-outside-');
    fs.symlinkSync(outside, path.join(dir, 'plans'), 'dir');

    const report = initProject(dir);

    assert.deepEqual(fs.readdirSync(outside), [], 'no stage folder may be made at the link target');
    const stageEntries = report.failed.filter((f) => f.startsWith('plans/'));
    assert.equal(stageEntries.length, STAGE_NAMES.length, `failed: ${JSON.stringify(report.failed)}`);
    for (const entry of stageEntries) {
      assert.match(entry, /^plans\/[a-z-]+\/ \(refused: plans is a symbolic link\)$/);
    }
    assert.equal(report.success, false);
    assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md')), 'CLAUDE.md is still written inside the project');
    assert.ok(fs.existsSync(path.join(dir, '.ctoc', 'settings.yaml')), 'the settings file is still written inside the project');
  });
});

describe('a thrown setup error is scrubbed where it is caught', () => {
  it('30 — neither the reason nor the screen sentence holds the project or home folder name', () => {
    // The project sits INSIDE the home folder, so the order of the two scrubs matters:
    // home first would turn `<home>/Client Acme` into a leak of the project name.
    const home = freshDir('menu-Jane Doe-');
    const dir = path.join(home, 'Client Acme');
    fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });
    const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    const original = require.cache[INIT_PROJECT_PATH];
    require.cache[INIT_PROJECT_PATH] = {
      id: INIT_PROJECT_PATH,
      filename: INIT_PROJECT_PATH,
      loaded: true,
      exports: {
        initProject() {
          throw new Error(`Cannot find module '${path.join(home, '.claude', 'plugins', 'init-project.js')}' from '${dir}'`);
        }
      }
    };
    let setup;
    try {
      setup = menu.ensureInitialized(dir);
    } finally {
      if (original) require.cache[INIT_PROJECT_PATH] = original;
      else delete require.cache[INIT_PROJECT_PATH];
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }

    assert.equal(setup.ok, false);
    const message = menu.setupMessage(setup);
    for (const text of [setup.reason, message]) {
      assert.ok(!/Doe|Acme/.test(text), `the folder names must not reach: ${text}`);
    }
    assert.ok(setup.reason.includes('<project>') && setup.reason.includes('<home>'), `scrubbed, not dropped: ${setup.reason}`);
  });

  it('30b — a home folder that cannot be found leaves the project scrub and says the rest was skipped', () => {
    const dir = freshDir('menu-Client Acme-');
    fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });
    const original = require.cache[INIT_PROJECT_PATH];
    const realHomedir = os.homedir;
    require.cache[INIT_PROJECT_PATH] = {
      id: INIT_PROJECT_PATH,
      filename: INIT_PROJECT_PATH,
      loaded: true,
      exports: {
        initProject() {
          throw new Error(`setup failed in '${dir}'`);
        }
      }
    };
    os.homedir = () => { throw new Error('no home folder here'); };
    let setup;
    try {
      setup = menu.ensureInitialized(dir);
    } finally {
      os.homedir = realHomedir;
      if (original) require.cache[INIT_PROJECT_PATH] = original;
      else delete require.cache[INIT_PROJECT_PATH];
    }

    assert.equal(setup.ok, false);
    assert.ok(!setup.reason.includes('Acme'), `the project name must not reach: ${setup.reason}`);
    assert.ok(setup.reason.includes('<project>'), `the project scrub still ran: ${setup.reason}`);
    assert.ok(setup.reason.includes('[home-directory scrub skipped:'), `the skipped scrub is named: ${setup.reason}`);
  });
});

describe('the fixtures read none of the developer\'s git settings', () => {
  it('31 — a global exclude file does not hide a stray file from git status', () => {
    const home = freshDir('menu-gitconfig-home-');
    const excludes = path.join(home, 'excludes');
    fs.writeFileSync(excludes, 'stray.txt\n');
    fs.writeFileSync(path.join(home, '.gitconfig'), `[core]\n\texcludesFile = ${excludes.split(path.sep).join('/')}\n`);
    const repo = freshDir('menu-gitconfig-repo-');
    const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    try {
      git(repo, ['init', '-q']);
      fs.writeFileSync(path.join(repo, 'stray.txt'), 'x\n');
      assert.equal(status(repo), '?? stray.txt\n');
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});

describe('the README sentence matches what the narrow repair writes', () => {
  it('32 — every entry the repair creates starts with a path the README sentence names', () => {
    const dir = seedValidProject(freshDir());
    fs.rmSync(path.join(dir, '.ctoc', 'state', 'iron-loop.yaml'));

    const report = repairRequiredArtifacts(dir);

    const sentence = fs.readFileSync(path.join(REPO, 'README.md'), 'utf8').split('\n')
      .flatMap((l) => l.split(/(?<=\.)\s+/))
      .find((s) => s.startsWith('In a project that is already set up'));
    assert.ok(sentence, 'README holds the "In a project that is already set up" sentence');
    const tokens = [...sentence.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    assert.ok(report.created.length > 0, 'the repair made something');
    for (const entry of report.created) {
      assert.ok(tokens.some((t) => entry.startsWith(t)), `${entry} is not named by the README sentence (${tokens.join(', ')})`);
    }
  });
});
