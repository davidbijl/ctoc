'use strict';

/**
 * THE MENU RENDER NO LONGER RECOVERS PLANS; THE SWEEP DOES, ON THE HUMAN'S NAME.
 *
 * Contract replaced 2026-10-18 (owner): opening the dashboard changes no task and moves no plan;
 * a dead build moves only when the human names it in `menu task sweep` — plan
 * real-projects-do-not-stall-on-the-menu-s2. The old file asserted that the render re-queued a
 * dead-builder orphan to the build queue and printed "re-queued for a clean rebuild"; these
 * cases assert the replacement, at least as tightly: the render leaves the plan where it is and
 * counts what a sweep would do, and `menu task sweep --confirm <plan>@<token>` is what moves it.
 *
 * These cases drive the REAL human path: a real registry + real plan files on disk (and a real
 * git repository, because a dead build is held when git cannot show that no work came after
 * its claim), then `menuScreens.buildDashboardTable(root)` and the `menu task sweep` route,
 * then assertions on the TEXT a human reads and on where the plan file physically ended up.
 *
 * Every fixture writes to os.tmpdir(); NOTHING touches the real repo root.
 */

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const menuScreens = require('../src/lib/menu-screens.js');
const planRecovery = require('../src/lib/plan-recovery.js');
const taskRegistry = require('../src/lib/task-registry.js');

const WOULD_GO_BACK = /1 build would go back to the build queue when you name it/;
const RECOVERED_LINE = /re-queued for a clean rebuild and re-verification/;
const THREW_LINE = /the background task check DID NOT RUN/;

const sandboxes = [];

function makeSandbox() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-recovery-wiring-')));
  fs.mkdirSync(path.join(dir, 'plans', 'in-progress'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'plans', 'todo'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
  sandboxes.push(dir);
  return dir;
}

/** A git repository with one 2020 commit, so the work check can answer "no work after the claim". */
function initGit(dir) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^GIT_/i.test(k)) env[k] = v;
  env.GIT_AUTHOR_DATE = '2020-01-01T00:00:00Z';
  env.GIT_COMMITTER_DATE = '2020-01-01T00:00:00Z';
  const run = (args) => {
    const r = spawnSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@test.invalid', '-c', 'commit.gpgsign=false',
      '-c', 'maintenance.auto=false', '-c', 'gc.auto=0', ...args], { cwd: dir, encoding: 'utf8', shell: false, env });
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  };
  run(['init', '-q', '-b', 'main']);
  fs.writeFileSync(path.join(dir, 'README.md'), 'readme\n');
  run(['add', 'README.md']);
  run(['commit', '-q', '-m', 'init']);
}

afterEach(() => {
  while (sandboxes.length) {
    const dir = sandboxes.pop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function writeInProgressPlan(sb, slug) {
  const content =
    '---\napproved_by: human\ngate_crossed: implementation → todo\n---\n\n' +
    `---\ntitle: "${slug}"\ntype: implementation\niron_loop: true\nfiles:\n  - "src/${slug}.js"\n---\n\n` +
    `# ${slug}\n\nHalf-built work; the builder died mid-implementation.\n`;
  const p = path.join(sb, 'plans', 'in-progress', `${slug}.md`);
  fs.writeFileSync(p, content);
  return p;
}

function makeOrphanTask(id, opts = {}) {
  const { plan, orphanReason, startedMinutesAgo = 300 } = opts;
  const result = orphanReason === undefined ? null : { ok: false, orphanReason };
  const startedIso = new Date(Date.now() - startedMinutesAgo * 60_000).toISOString();
  return {
    id, kind: 'implement', label: '', plan, status: 'orphaned', agentTaskId: null,
    touches: [`src/${plan}.js`], gitOp: false, blockedBy: [], result,
    ts: { created: startedIso, started: startedIso, cancelRequested: null, done: startedIso },
  };
}

function seedRegistry(sb, tasks) {
  const reg = taskRegistry.emptyRegistry();
  reg.tasks = tasks;
  reg.seq = tasks.length;
  taskRegistry.save(sb, reg);
}

const inProgressExists = (sb, slug) => fs.existsSync(path.join(sb, 'plans', 'in-progress', `${slug}.md`));
const todoExists = (sb, slug) => fs.existsSync(path.join(sb, 'plans', 'todo', `${slug}.md`));
const cleanupLog = (sb) => {
  const p = path.join(sb, '.ctoc', 'logs', 'cleanup.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
};

describe('1 — the dashboard render leaves a dead-builder orphan alone; the sweep re-queues it on the human\'s name', () => {
  it('counts the build on the dashboard, and only the confirmed sweep moves the plan', () => {
    const sb = makeSandbox();
    initGit(sb);
    writeInProgressPlan(sb, 'alpha');
    seedRegistry(sb, [makeOrphanTask('t1', { plan: 'alpha', orphanReason: 'presumed-dead' })]);

    const text = menuScreens.buildDashboardTable(sb);

    assert.match(text, WOULD_GO_BACK, 'the render must COUNT the build a sweep would send back');
    assert.doesNotMatch(text, RECOVERED_LINE, 'the render re-queues nothing any more');
    assert.ok(inProgressExists(sb, 'alpha'), 'opening the dashboard leaves the plan in the building folder');
    assert.ok(!todoExists(sb, 'alpha'));
    assert.equal(cleanupLog(sb).length, 0, 'opening the dashboard logs no clean-up');

    const preview = menuScreens.route(['menu', 'task', 'sweep'], sb);
    const row = preview.sweep.builds.find((b) => b.plan === 'alpha');
    assert.equal(row.group, 'would-go-back');
    menuScreens.route(['menu', 'task', 'sweep', '--confirm', `alpha@${row.token}`], sb);

    assert.ok(!inProgressExists(sb, 'alpha'));
    assert.ok(todoExists(sb, 'alpha'), 'the confirmed sweep re-queues the plan');
    const log = cleanupLog(sb);
    assert.equal(log.length, 1);
    assert.equal(log[0].action, 'recovered');
  });
});

describe('2 — a staleness orphan inside its bound is shown as not yet eligible and never moved', () => {
  it('keeps the plan in the building folder and counts no build that would go back', () => {
    const sb = makeSandbox();
    initGit(sb);
    writeInProgressPlan(sb, 'beta');
    seedRegistry(sb, [makeOrphanTask('t1', { plan: 'beta', orphanReason: 'staleness', startedMinutesAgo: 100 })]);

    const text = menuScreens.buildDashboardTable(sb);
    const preview = menuScreens.route(['menu', 'task', 'sweep'], sb);

    const row = preview.sweep.builds.find((b) => b.plan === 'beta');
    assert.equal(row.group, 'not-yet');
    assert.equal(row.code, 'files-held');
    assert.doesNotMatch(text, /would go back/);
    assert.match(text, /1 build shows no sign of life \(it can be named once it is 240 min old\)/);
    assert.ok(inProgressExists(sb, 'beta'), 'its builder may still be editing — the plan stays');
    assert.ok(!todoExists(sb, 'beta'));
  });
});

describe('3 — a clean project renders no sweep line and no recovery line (no noise)', () => {
  it('shows nothing when there are no orphaned plans', () => {
    const sb = makeSandbox();
    seedRegistry(sb, []);

    const text = menuScreens.buildDashboardTable(sb);

    assert.doesNotMatch(text, RECOVERED_LINE);
    assert.doesNotMatch(text, THREW_LINE);
    assert.doesNotMatch(text, /would go back|look(s)? dead/);
  });
});

describe('4 — the sweep line is additive, never a replacement for the rest of the dashboard', () => {
  it('still renders the version banner and the inbox beside the sweep line', () => {
    const sb = makeSandbox();
    initGit(sb);
    writeInProgressPlan(sb, 'gamma');
    seedRegistry(sb, [makeOrphanTask('t1', { plan: 'gamma', orphanReason: 'presumed-dead' })]);

    const text = menuScreens.buildDashboardTable(sb);

    assert.match(text, WOULD_GO_BACK, 'precondition: the sweep line is present');
    assert.match(text, /CTOC v/, 'the version banner still renders');
    assert.match(text, /INBOX/, 'the inbox block still renders');
  });
});

describe('5 — a preview failure is fail-open and honest, never a bricked dashboard', () => {
  it('still renders the dashboard and says the check did not run when the preview throws', () => {
    const sb = makeSandbox();
    writeInProgressPlan(sb, 'delta');
    seedRegistry(sb, [makeOrphanTask('t1', { plan: 'delta', orphanReason: 'presumed-dead' })]);

    const orig = planRecovery.previewSweep;
    planRecovery.previewSweep = () => { throw new Error('injected-recovery-fault'); };
    let text;
    try {
      assert.doesNotThrow(() => { text = menuScreens.buildDashboardTable(sb); },
        'a preview throw must not brick the dashboard');
    } finally {
      planRecovery.previewSweep = orig;
    }

    assert.match(text, /CTOC v/, 'the dashboard still renders despite the fault');
    assert.match(text, THREW_LINE, 'the failure is stated honestly, not swallowed');
    assert.match(text, /injected-recovery-fault/, 'the failure reason reaches the screen');
  });
});
