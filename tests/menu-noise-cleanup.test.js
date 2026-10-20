/**
 * Menu Rule 15 — silent menu-noise cleanup, on every menu render.
 *
 * (a) Agent area: a stale lock (owning process confirmed dead) is silently
 *     released and rendered as idle — never a "Stale lock" warning. A lock
 *     whose owning process is alive is left completely untouched.
 * (b) Dashboard: a done task whose recovered plan path has reached
 *     `plans/done/` is silently marked `result.reviewed = true` (dismissed
 *     from the inbox). A task whose plan path cannot be confirmed shipped —
 *     or cannot be recovered at all — is left pending (safety guardrail).
 *
 * Follows the tmp-root + addTask/updateTask seeding conventions used in
 * tests/menu-task-wiring.test.js and the area-module contract tests in
 * tests/area-modules.test.js.
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { getLockPath } = require('../src/lib/agent-lock');
const taskRegistry = require('../src/lib/task-registry');
const { buildDashboardTable } = require('../src/lib/menu-screens');

function tempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-rule15-'));
  for (const stage of ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done']) {
    fs.mkdirSync(path.join(dir, 'plans', stage), { recursive: true });
  }
  fs.mkdirSync(path.join(dir, '.ctoc', 'inbox', 'questions'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.ctoc', 'inbox', 'decisions'), { recursive: true });
  return dir;
}

function cleanup(dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ } }

// ── (a) agent area: lock auto-release ───────────────────────────────────────

describe('Rule 15a — agent lock auto-release', () => {
  let root, agentArea;
  beforeEach(() => {
    root = tempProject();
    delete require.cache[require.resolve('../src/areas/agent')];
    agentArea = require('../src/areas/agent');
  });
  afterEach(() => cleanup(root));

  it('dead-PID lock is silently released and renders idle (no warning)', () => {
    const lockPath = getLockPath(root);
    fs.writeFileSync(lockPath, JSON.stringify({
      pid: 999999999,
      agentId: 'dead-agent',
      plan: 'dead-plan',
      startedAt: new Date().toISOString()
    }, null, 2));

    const out = agentArea.render({ projectPath: root });

    assert.match(out, /Idle/, 'renders the normal idle state');
    assert.doesNotMatch(out, /Stale lock/, 'never surfaces the stale-lock warning');
    assert.doesNotMatch(out, /process died/, 'never surfaces the process-died text');
    assert.strictEqual(fs.existsSync(lockPath), false, 'the dead lock file was released');
  });

  it('live-PID lock is left completely untouched and still shown active', () => {
    const lockPath = getLockPath(root);
    const lockData = {
      pid: process.pid, // this test process — guaranteed alive
      agentId: 'live-agent',
      plan: 'live-plan',
      startedAt: new Date().toISOString()
    };
    fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));

    const out = agentArea.render({ projectPath: root });

    assert.match(out, /Active/, 'renders the active state');
    assert.match(out, /live-plan/, 'shows the live plan name');
    assert.strictEqual(fs.existsSync(lockPath), true, 'the live lock file was NOT removed');
    const onDisk = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    assert.deepStrictEqual(onDisk, lockData, 'the live lock contents were NOT mutated');
  });
});

// ── (a') JSON dashboard surface: same lock auto-release ─────────────────────

describe('Rule 15a — agent lock auto-release (JSON dashboard surface)', () => {
  let root;
  beforeEach(() => { root = tempProject(); });
  afterEach(() => cleanup(root));

  it('dead-PID lock is silently released and the dashboard renders idle (no warning)', () => {
    const lockPath = getLockPath(root);
    fs.writeFileSync(lockPath, JSON.stringify({
      pid: 999999999, agentId: 'dead-agent', plan: 'dead-plan',
      startedAt: new Date().toISOString(),
    }, null, 2));

    const out = buildDashboardTable(root);

    assert.match(out, /○ Idle/, 'dashboard renders idle');
    assert.doesNotMatch(out, /Stale lock/, 'no stale-lock warning on the JSON dashboard');
    assert.doesNotMatch(out, /process died/, 'no process-died text on the JSON dashboard');
    assert.strictEqual(fs.existsSync(lockPath), false, 'the dead lock file was released');
  });

  it('live-PID lock is left untouched and shown active on the dashboard', () => {
    const lockPath = getLockPath(root);
    const lockData = {
      pid: process.pid, agentId: 'live-agent', plan: 'live-plan',
      startedAt: new Date().toISOString(),
    };
    fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));

    const out = buildDashboardTable(root);

    assert.match(out, /Active/, 'dashboard shows the active agent');
    assert.strictEqual(fs.existsSync(lockPath), true, 'the live lock file was NOT removed');
    assert.deepStrictEqual(
      JSON.parse(fs.readFileSync(lockPath, 'utf8')), lockData,
      'the live lock contents were NOT mutated',
    );
  });
});

// ── (b) dashboard: shipped-done-task auto-dismiss ──────────────────────────

/** Seed a done task on disk (queued → running → done) with a given result. */
function seedDone(root, result) {
  const reg = taskRegistry.load(root);
  const t = taskRegistry.addTask(reg, { kind: 'review' });
  taskRegistry.updateTask(reg, t.id, { status: 'running' });
  taskRegistry.updateTask(reg, t.id, { status: 'done', result });
  taskRegistry.save(root, reg);
  return t.id;
}

describe('Rule 15b — shipped done-task auto-dismiss', () => {
  let root;
  beforeEach(() => { root = tempProject(); });
  afterEach(() => cleanup(root));

  it('a done task whose recovered plan is in plans/done/ gets result.reviewed = true', () => {
    fs.writeFileSync(path.join(root, 'plans', 'done', 'shipped-plan.md'), '# shipped-plan\n');
    const id = seedDone(root, { ok: true, gate: 3, nextAction: 'plan review/shipped-plan.md' });

    buildDashboardTable(root); // triggers the once-per-render cleanup pass

    const reg = taskRegistry.load(root);
    const task = reg.tasks.find((t) => t.id === id);
    assert.strictEqual(task.result.reviewed, true, 'shipped task was dismissed');
  });

  it('a done task with a gate whose plan is NOT in plans/done/ is left pending', () => {
    // plans/review/ exists but we never create plans/done/still-in-review.md
    const id = seedDone(root, { ok: true, gate: 2, nextAction: 'plan review/still-in-review.md' });

    buildDashboardTable(root);

    const reg = taskRegistry.load(root);
    const task = reg.tasks.find((t) => t.id === id);
    assert.notStrictEqual(task.result.reviewed, true, 'un-shipped task was left pending');
  });

  it('a done task with no recoverable plan path is left pending', () => {
    const id = seedDone(root, { ok: true, summary: 'no plan info here' });

    buildDashboardTable(root);

    const reg = taskRegistry.load(root);
    const task = reg.tasks.find((t) => t.id === id);
    assert.notStrictEqual(task.result.reviewed, true, 'un-recoverable task was left pending');
  });

  it('is idempotent: a second render does not re-dismiss or error', () => {
    fs.writeFileSync(path.join(root, 'plans', 'done', 'twice.md'), '# twice\n');
    const id = seedDone(root, { ok: true, gate: 1, nextAction: 'plan todo/twice.md' });

    buildDashboardTable(root);
    buildDashboardTable(root);

    const reg = taskRegistry.load(root);
    const task = reg.tasks.find((t) => t.id === id);
    assert.strictEqual(task.result.reviewed, true, 'still dismissed after a second render');
  });
});
