/**
 * The menu's task start CLAIMS a build: `menu task start <id>` moves the build's plan from
 * plans/todo/ into plans/in-progress/ together with the registry write, one build start at a
 * time (an exclusive lock file), and the later `--agent-id` stamp accepts the placeholder the
 * start recorded.
 *
 * Plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s2-the-task-start-moves-the-plan.
 * Real fs on isolated temp roots; the only mocks are seams on fs.rename / the registry's own
 * entry points, used to interleave a SECOND start at an exact moment of the first (never to
 * replace core logic). Raw fs/os are permitted in tests/**.
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const ms = require('../src/lib/menu-screens');
const taskRegistry = require('../src/lib/task-registry');
const actions = require('../src/lib/actions');
const safeFs = require('../src/lib/safe-fs');
const ledger = require('../src/lib/approval-ledger');

const MENU = path.join(__dirname, '..', 'src', 'commands', 'start.js');
const STAGES = ['todo', 'in-progress', 'review', 'done', 'implementation', 'functional'];

let root;
let LOCK;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-claim-'));
  for (const d of STAGES) fs.mkdirSync(path.join(root, 'plans', d), { recursive: true });
  fs.mkdirSync(path.join(root, '.ctoc', 'state'), { recursive: true });
  LOCK = path.join(root, '.ctoc', 'state', 'build-start.lock');
});
afterEach(() => {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
});

/** A gated plan (two front-matter blocks, `files:`, all nine steps checked), like scheduler-enforced's. */
function writePlanIn(dir, stage, name, files) {
  const declared = files || [`src/${name}.js`];
  const filesBlock = 'files:\n' + declared.map((f) => `  - "${f}"`).join('\n') + '\n';
  const stepBlock = ['8: TEST', '9: PREPARE', '10: IMPLEMENT', '11: REVIEW', '12: OPTIMIZE',
    '13: SECURE', '14: VERIFY', '15: DOCUMENT', '16: FINAL-REVIEW']
    .map((s) => `### Step ${s}\n- [x] done\n`).join('\n');
  const content =
    '---\napproved_by: human\ngate_crossed: implementation → todo\n---\n\n' +
    `---\ntitle: "${name}"\ntype: implementation\niron_loop: true\n${filesBlock}---\n\n` +
    `# ${name}\n\n## Execution Plan (Steps 8-16)\n\n${stepBlock}\n`;
  const p = path.join(dir, 'plans', stage, `${name}.md`);
  fs.writeFileSync(p, content);
  return p;
}
const writePlan = (stage, name, files) => writePlanIn(root, stage, name, files);

const run = (...args) => ms.route(['menu', 'task', ...args], root);
const regBytes = () => fs.readFileSync(path.join(root, '.ctoc', 'state', 'tasks.json'), 'utf8');
const taskOf = (id) => taskRegistry.load(root).tasks.find((t) => t.id === id);
const planFile = (stage, name) => path.join(root, 'plans', stage, `${name}.md`);
/** The stage folders that currently hold `<name>.md`. */
const stagesOf = (name) => STAGES.filter((s) => fs.existsSync(planFile(s, name)));
const implementTasksFor = (plan) => taskRegistry.load(root).tasks.filter((t) => t.kind === 'implement' && t.plan === plan);

/** Add a queued build for `name` touching its own source file; returns its task id. */
function addBuild(name, touches) {
  const r = run('add', 'implement', name, '--touches', touches || `src/${name}.js`);
  assert.equal(r.ok, true, 'the build task is recorded: ' + JSON.stringify(r));
  return r.taskId;
}
/** A running quality task (not a build) that holds `file`. */
function holdFile(file) {
  const q = run('add', 'quality', 'qa', '--touches', file);
  const s = run('start', q.taskId);
  assert.equal(s.status, 'running', 'the blocker is running');
  return q.taskId;
}
const ioError = (code, msg) => Object.assign(new Error(`${code}: ${msg}`), { code });

/** After a start that claimed the build exactly once. */
function assertClaimedOnce(plan = 'delta') {
  const tasks = implementTasksFor(plan);
  assert.equal(tasks.length, 1, 'one implement task for the plan');
  assert.equal(tasks[0].status, 'running', 'it is running');
  assert.deepEqual(stagesOf(plan), ['in-progress'], 'exactly one plan file, in in-progress/');
  assert.equal(fs.existsSync(LOCK), false, 'the build-start lock is gone');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. The menu's task start moves the plan
// ═══════════════════════════════════════════════════════════════════════════════

describe('a build start moves its plan', () => {
  it('1. a queued build starts and its plan moves with it', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const res = run('start', t1);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(res.status, 'running');
    assert.equal(taskOf(t1).agentTaskId, 't1', 'the placeholder is the task id');
    assert.equal(res.planPath, 'plans/in-progress/delta.md');
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
    const done = run('complete', t1);
    assert.equal(done.ok, true, 'the completion finds its plan: ' + JSON.stringify(done));
    assert.deepEqual(stagesOf('delta'), ['review']);
  });

  it('2. a start the scheduler refuses moves nothing', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    holdFile('src/delta.js');
    const before = regBytes();
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.equal(res.refused, true);
    assert.equal(res.reason, 'file-conflict');
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(taskOf(t1).status, 'queued');
    assert.equal(taskOf(t1).agentTaskId, null);
    assert.equal(regBytes(), before, 'the registry is byte-identical');
  });

  it('3a. a plan in review cannot be started as a build', () => {
    writePlan('review', 'delta');
    const t1 = addBuild('delta');
    const before = regBytes();
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.equal(res.refused, true);
    assert.match(res.text, /delta/);
    assert.match(res.text, /plans\/todo\//);
    assert.match(res.text, /plans\/in-progress\//);
    assert.equal(taskOf(t1).status, 'queued');
    assert.equal(regBytes(), before);
    assert.deepEqual(stagesOf('delta'), ['review']);
  });

  it('3b. a build with no plan file cannot be started', () => {
    const t1 = addBuild('delta');
    const before = regBytes();
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.equal(res.refused, true);
    assert.equal(res.reason, 'plan-not-found');
    assert.match(res.text, /delta/);
    assert.match(res.text, /plans\/todo\//);
    assert.match(res.text, /plans\/in-progress\//);
    assert.equal(taskOf(t1).status, 'queued');
    assert.equal(regBytes(), before);
  });

  it('3c. a plan that cannot be moved refuses the start and stays in todo', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const before = regBytes();
    const orig = safeFs.renameSync;
    t.mock.method(safeFs, 'renameSync', (src, dst) => {
      if (String(src).endsWith(path.join('plans', 'todo', 'delta.md'))) throw ioError('EXDEV', 'cross-device link');
      return orig.call(safeFs, src, dst);
    });
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.equal(res.refused, true);
    assert.equal(res.reason, 'plan-move-failed');
    assert.match(res.text, /delta/);
    assert.match(res.text, /could not be moved from plans\/todo\/ to plans\/in-progress\//);
    assert.equal(taskOf(t1).status, 'queued');
    assert.equal(regBytes(), before);
    assert.deepEqual(stagesOf('delta'), ['todo']);
  });

  it('3d. --force overrides the scheduler only: no plan file still refuses, with no forced_start entry', () => {
    const t1 = addBuild('delta');
    holdFile('src/delta.js');
    const before = regBytes();
    const res = run('start', t1, '--force');
    assert.equal(res.ok, false);
    assert.equal(res.refused, true);
    assert.equal(res.reason, 'plan-not-found');
    assert.match(res.text, /delta/);
    assert.equal(regBytes(), before);
    assert.equal(taskRegistry.readWarnLog(root).filter((e) => e.event === 'forced_start').length, 0);
  });

  it('4. a plan already in the build is not moved again', () => {
    writePlan('in-progress', 'delta');
    const t1 = addBuild('delta');
    const res = run('start', t1);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(res.status, 'running');
    assert.equal(res.planPath, 'plans/in-progress/delta.md');
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
    assert.equal(taskOf(t1).status, 'running');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. The stamp accepts the placeholder and refuses a foreign agent id
// ═══════════════════════════════════════════════════════════════════════════════

describe('the --agent-id stamp', () => {
  function stampTwice(t1) {
    const h1 = run('start', t1, '--agent-id', 'H1');
    assert.equal(h1.ok, true, JSON.stringify(h1));
    assert.equal(h1.stamped, true);
    assert.equal(taskOf(t1).agentTaskId, 'H1');
    assert.deepEqual(stagesOf('delta'), ['in-progress'], 'the plan is not moved again');
    const before = regBytes();
    const h2 = run('start', t1, '--agent-id', 'H2');
    assert.equal(h2.ok, false);
    assert.equal(h2.reason, 'agent-recorded');
    assert.equal(taskOf(t1).agentTaskId, 'H1', 'H1 is still recorded');
    assert.equal(regBytes(), before);
  }

  it('5a. claimed by `menu task start` (agent = its own id): the session stamps it, a second id is refused', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    assert.equal(run('start', t1).ok, true);
    assert.equal(taskOf(t1).agentTaskId, 't1');
    stampTwice(t1);
  });

  it('5b. claimed by Start agent (agent null): the session stamps it, a second id is refused', () => {
    writePlan('todo', 'delta');
    const started = actions.startAgent(root);
    assert.equal(started.started, true, JSON.stringify(started));
    const t1 = started.task.id;
    assert.equal(taskOf(t1).agentTaskId, null);
    stampTwice(t1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6-7. Start agent claims the queued task of the first plan
// ═══════════════════════════════════════════════════════════════════════════════

describe('Start agent and a plan whose build is already queued', () => {
  const orderTodo = () => fs.writeFileSync(path.join(root, '.ctoc', 'state', 'todo-order.json'), JSON.stringify(['delta.md', 'echo.md']));

  it('6. Start agent claims the queued task of the first plan', () => {
    writePlan('todo', 'delta');
    writePlan('todo', 'echo');
    orderTodo();
    const t1 = addBuild('delta');
    const res = actions.startAgent(root);
    assert.equal(res.started, true, JSON.stringify(res));
    assert.equal(res.task.id, t1);
    assert.equal(res.plan.name, 'delta');
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
    assert.deepEqual(stagesOf('echo'), ['todo']);
    assert.equal(implementTasksFor('delta').length, 1);
    assert.equal(implementTasksFor('echo').length, 0);
    assert.equal(fs.existsSync(LOCK), false);
  });

  it('7. Start agent leaves a queued task that the scheduler refuses queued, and starts the next plan', () => {
    writePlan('todo', 'delta');
    writePlan('todo', 'echo');
    orderTodo();
    const t1 = addBuild('delta');
    holdFile('src/delta.js');
    const res = actions.startAgent(root);
    assert.equal(res.started, true, JSON.stringify(res));
    assert.equal(res.plan.name, 'echo');
    assert.equal(taskOf(t1).status, 'queued');
    assert.equal(implementTasksFor('delta').length, 1);
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.ok(res.queuedTasks.some((q) => q.plan === 'delta' && q.taskId === t1), JSON.stringify(res.queuedTasks));
  });

  it('7b. Start agent names the scheduler\'s reason for the queued task it left', () => {
    writePlan('todo', 'delta');
    writePlan('todo', 'echo');
    orderTodo();
    const t1 = addBuild('delta');
    holdFile('src/delta.js');
    const res = actions.startAgent(root);
    assert.ok(res.queuedTasks.some((q) => q.plan === 'delta' && q.taskId === t1 && q.reason === 'file-conflict'), JSON.stringify(res.queuedTasks));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Not a build
// ═══════════════════════════════════════════════════════════════════════════════

describe('a task that is not a build', () => {
  it('8. starting a task that is not a build moves no plan file', () => {
    writePlan('todo', 'delta');
    for (const kind of ['review', 'plan', 'classify', 'precompute']) {
      const a = run('add', kind, 'delta');
      assert.equal(a.ok, true, JSON.stringify(a));
      const s = run('start', a.taskId);
      assert.equal(s.ok, true, `${kind}: ${JSON.stringify(s)}`);
      assert.equal(s.status, 'running', kind);
      assert.deepEqual(stagesOf('delta'), ['todo'], `${kind} moved no plan file`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. The reproduction of 2026-10-11 through the real menu command
// ═══════════════════════════════════════════════════════════════════════════════

describe('the real menu command', () => {
  it('9. add, start, stamp and complete end with the plan in review and its evidence on disk', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-claim-cli-'));
    try {
      for (const d of STAGES) fs.mkdirSync(path.join(dir, 'plans', d), { recursive: true });
      fs.mkdirSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
      writePlanIn(dir, 'todo', 'delta');
      writePlanIn(dir, 'todo', 'echo');
      const menu = (...args) => JSON.parse(execFileSync(process.execPath, [MENU, ...args], {
        cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      }));
      const added = menu('menu', 'task', 'add', 'implement', 'delta', '--touches', 'src/delta.js,plans/todo/delta.md');
      assert.equal(added.ok, true, JSON.stringify(added));
      const started = menu('menu', 'task', 'start', added.taskId);
      assert.equal(started.ok, true, JSON.stringify(started));
      assert.ok(fs.existsSync(path.join(dir, 'plans', 'in-progress', 'delta.md')), 'delta is now in in-progress/');
      assert.ok(!fs.existsSync(path.join(dir, 'plans', 'todo', 'delta.md')));
      const stamped = menu('menu', 'task', 'start', added.taskId, '--agent-id', 'agent-xyz');
      assert.equal(stamped.ok, true, JSON.stringify(stamped));
      assert.equal(stamped.stamped, true);
      const reg = JSON.parse(fs.readFileSync(path.join(dir, '.ctoc', 'state', 'tasks.json'), 'utf8'));
      assert.equal(reg.tasks.find((x) => x.id === added.taskId).agentTaskId, 'agent-xyz');
      const completed = menu('menu', 'task', 'complete', added.taskId, '--continue');
      assert.equal(completed.ok, true, JSON.stringify(completed));
      assert.ok(fs.existsSync(path.join(dir, 'plans', 'review', 'delta.md')), 'delta is in review/');
      assert.ok(fs.existsSync(path.join(dir, '.ctoc', 'state', 'verify', 'delta.json')), 'the check evidence is on disk');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Two starts of the same queued build at once claim it once
// ═══════════════════════════════════════════════════════════════════════════════

describe('two starts at once', () => {
  /** Run `second()` once, at the first rename of plans/todo/delta.md, then rename. */
  function secondStartAtTheMove(t, second) {
    const orig = safeFs.renameSync;
    const seen = { result: undefined, fired: false };
    t.mock.method(safeFs, 'renameSync', (src, dst) => {
      if (!seen.fired && String(src).endsWith(path.join('plans', 'todo', 'delta.md'))) {
        seen.fired = true;
        seen.result = second();
      }
      return orig.call(safeFs, src, dst);
    });
    return seen;
  }

  it('10a. two menu starts: the second is refused as busy, the first claims', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const seen = secondStartAtTheMove(t, () => run('start', t1));
    const first = run('start', t1);
    assert.equal(seen.fired, true);
    assert.equal(seen.result.ok, false);
    assert.equal(seen.result.reason, 'build-start-busy');
    assert.equal(first.ok, true, JSON.stringify(first));
    assertClaimedOnce();
  });

  it('10b. Start agent against a menu start: Start agent is refused as busy, the menu start claims', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const seen = secondStartAtTheMove(t, () => actions.startAgent(root));
    const first = run('start', t1);
    assert.equal(seen.fired, true);
    assert.equal(seen.result.started, false);
    assert.match(seen.result.error, /another build start is being recorded/);
    assert.equal(first.ok, true, JSON.stringify(first));
    assertClaimedOnce();
  });

  it('10c. a start that waited behind another finds the build already running', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const origCanRun = taskRegistry.canRun;
    let inner;
    let armed = true;
    t.mock.method(taskRegistry, 'canRun', (c, r) => {
      if (armed) { armed = false; inner = run('start', t1); }
      return origCanRun(c, r);
    });
    const a = run('start', t1);
    assert.equal(inner.ok, true, JSON.stringify(inner));
    assert.equal(a.ok, false);
    assert.equal(a.reason, 'already-started');
    assertClaimedOnce();
  });

  it('10d. two real processes: exactly one claims', async () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const go = () => new Promise((resolve, reject) => {
      const c = spawn(process.execPath, [MENU, 'menu', 'task', 'start', t1], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      c.stdout.on('data', (d) => { out += d; });
      c.on('error', reject);
      c.on('close', () => resolve(out));
    });
    const outs = await Promise.all([go(), go()]);
    const parsed = outs.map((o) => JSON.parse(o));
    assert.equal(parsed.filter((r) => r.ok === true).length, 1, outs.join('\n'));
    assertClaimedOnce();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11-13, 16. The registry write decides last
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Make the claim's own registry write (the first withRegistry call made once delta is in the
 * build, i.e. after the plan has moved) run `before()` (through the real function) first. The
 * menu's decision snapshot, which writes nothing, comes earlier and is not the claim.
 */
function beforeClaimWrite(t, before) {
  const orig = taskRegistry.withRegistry;
  let armed = true;
  t.mock.method(taskRegistry, 'withRegistry', (r, mutator, o) => {
    if (armed && fs.existsSync(planFile('in-progress', 'delta'))) { armed = false; before(); }
    return orig(r, mutator, o);
  });
}

describe('the registry write', () => {
  const beforeFirstWrite = beforeClaimWrite;

  it('11. a write-time refusal puts the plan back', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const orig = taskRegistry.withRegistry;
    beforeFirstWrite(t, () => orig(root, (reg) => {
      const q = taskRegistry.addTask(reg, { kind: 'quality', plan: 'qa', touches: ['src/delta.js'] });
      taskRegistry.updateTask(reg, q.id, { status: 'running' });
    }));
    const res = run('start', t1);
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.equal(res.refused, true);
    assert.equal(res.reason, 'file-conflict');
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(taskOf(t1).status, 'queued');
    assert.equal(fs.existsSync(LOCK), false);
  });

  it('12. a failing registry write puts the plan back and is reported', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const before = regBytes();
    const orig = safeFs.renameSync;
    let fired = false;
    t.mock.method(safeFs, 'renameSync', (src, dst) => {
      if (!fired && String(src).includes(path.join('.ctoc', 'state'))) { fired = true; throw ioError('EIO', 'simulated write failure'); }
      return orig.call(safeFs, src, dst);
    });
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.match(res.error, /EIO/);
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(regBytes(), before);
  });

  it('13. a forced build start is logged, as today', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    holdFile('src/delta.js');
    const res = run('start', t1, '--force');
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(res.forced, true);
    assert.equal(res.reason, 'file-conflict');
    assert.match(res.text, /FORCED/);
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
    const entries = taskRegistry.readWarnLog(root).filter((e) => e.event === 'forced_start');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, t1);
    assert.equal(entries[0].reason, 'file-conflict');
  });

  it('16. a cancel during the start puts the plan back', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    beforeFirstWrite(t, () => run('cancel', t1));
    const res = run('start', t1);
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.equal(res.reason, 'not-queued');
    assert.match(res.text, /cancelled/);
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(taskOf(t1).status, 'cancelled');
    assert.equal(fs.existsSync(LOCK), false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 14-15. The lock
// ═══════════════════════════════════════════════════════════════════════════════

describe('the build-start lock', () => {
  it('14a. a stale lock (61 s old) is taken over', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    fs.writeFileSync(LOCK, 'foreign-owner');
    const old = new Date(Date.now() - 61_000);
    fs.utimesSync(LOCK, old, old);
    const res = run('start', t1);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
    assert.equal(fs.existsSync(LOCK), false);
  });

  it('14b. a live lock refuses at once and is left untouched', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    fs.writeFileSync(LOCK, 'foreign-owner');
    const before = regBytes();
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.equal(res.refused, true);
    assert.equal(res.reason, 'build-start-busy');
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(regBytes(), before);
    assert.equal(fs.readFileSync(LOCK, 'utf8'), 'foreign-owner');
  });

  it('15a. the lock is released after an ok start', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    assert.equal(run('start', t1).ok, true);
    assert.equal(fs.existsSync(LOCK), false);
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
  });

  it('15b. the lock is released after a refused start', () => {
    const t1 = addBuild('delta');
    const res = run('start', t1);
    assert.equal(res.reason, 'plan-not-found');
    assert.equal(fs.existsSync(LOCK), false);
  });

  it('15c. the lock is released when the registry write throws', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const orig = safeFs.renameSync;
    let fired = false;
    let heldDuringWrite = false;
    t.mock.method(safeFs, 'renameSync', (src, dst) => {
      if (!fired && String(src).includes(path.join('.ctoc', 'state'))) {
        fired = true;
        heldDuringWrite = fs.existsSync(LOCK);
        throw ioError('EIO', 'simulated write failure');
      }
      return orig.call(safeFs, src, dst);
    });
    const res = run('start', t1);
    assert.equal(heldDuringWrite, true, 'the lock is held across the registry write');
    assert.equal(res.ok, false);
    assert.match(res.error, /EIO/);
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(fs.existsSync(LOCK), false);
  });

  it('15d. a lock replaced during the start is left in place', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const orig = safeFs.renameSync;
    let fired = false;
    let heldDuringWrite = false;
    t.mock.method(safeFs, 'renameSync', (src, dst) => {
      if (!fired && String(src).includes(path.join('.ctoc', 'state'))) {
        fired = true;
        heldDuringWrite = fs.existsSync(LOCK);
        fs.writeFileSync(LOCK, 'taken-over-by-another-start');
        throw ioError('EIO', 'simulated write failure');
      }
      return orig.call(safeFs, src, dst);
    });
    const res = run('start', t1);
    assert.equal(heldDuringWrite, true, 'the lock is held across the registry write');
    assert.equal(res.ok, false);
    assert.match(res.error, /EIO/);
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(fs.readFileSync(LOCK, 'utf8'), 'taken-over-by-another-start', 'a start never deletes another start\'s lock');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 17. The remaining lock and claim branches
// ═══════════════════════════════════════════════════════════════════════════════

describe('the remaining lock and claim branches', () => {
  const isLock = (p) => String(p).endsWith('build-start.lock');

  it('17a. a lock that vanishes between the create and the stat is retried', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    fs.writeFileSync(LOCK, 'foreign-owner');
    const orig = safeFs.lstatSync;
    t.mock.method(safeFs, 'lstatSync', (p, o) => {
      if (isLock(p)) { fs.unlinkSync(LOCK); throw ioError('ENOENT', 'no such file'); }
      return orig.call(safeFs, p, o);
    });
    const res = run('start', t1);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(fs.existsSync(LOCK), false);
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
  });

  it('17b. a stale delete that fails leaves the foreign lock and the start busy', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    fs.writeFileSync(LOCK, 'foreign-owner');
    const old = new Date(Date.now() - 61_000);
    fs.utimesSync(LOCK, old, old);
    const orig = safeFs.unlinkSync;
    t.mock.method(safeFs, 'unlinkSync', (p) => {
      if (isLock(p)) throw ioError('EPERM', 'operation not permitted');
      return orig.call(safeFs, p);
    });
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'build-start-busy');
    assert.equal(fs.readFileSync(LOCK, 'utf8'), 'foreign-owner');
    assert.deepEqual(stagesOf('delta'), ['todo']);
  });

  it('17c. a create error other than EEXIST is reported and leaves no lock', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const orig = safeFs.writeFileSync;
    t.mock.method(safeFs, 'writeFileSync', (p, d, o) => {
      if (isLock(p)) throw ioError('EIO', 'simulated create failure');
      return orig.call(safeFs, p, d, o);
    });
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.match(res.error, /EIO/);
    assert.equal(fs.existsSync(LOCK), false);
    assert.deepEqual(stagesOf('delta'), ['todo']);
  });

  it('17d. a task cancelled between the scheduler check and the lock is refused by its state', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const origCanRun = taskRegistry.canRun;
    let armed = true;
    t.mock.method(taskRegistry, 'canRun', (c, r) => {
      if (armed) { armed = false; run('cancel', t1); }
      return origCanRun(c, r);
    });
    const res = run('start', t1);
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.equal(res.reason, 'not-queued');
    assert.match(res.text, /cancelled/);
    assert.deepEqual(stagesOf('delta'), ['todo']);
  });

  it('17e. a move back that fails is named, and the plan stays in the build', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const orig = safeFs.renameSync;
    let fired = false;
    t.mock.method(safeFs, 'renameSync', (src, dst) => {
      if (!fired && String(src).includes(path.join('.ctoc', 'state'))) { fired = true; throw ioError('EIO', 'simulated write failure'); }
      if (String(src).endsWith(path.join('plans', 'in-progress', 'delta.md'))) throw ioError('EXDEV', 'cross-device link');
      return orig.call(safeFs, src, dst);
    });
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.match(res.error, /EIO/);
    assert.match(res.error, /could not be moved back to plans\/todo\//);
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
    assert.equal(taskOf(t1).status, 'queued');
    assert.equal(fs.existsSync(LOCK), false);
  });

  /** Start agent with delta first in line and its queued task t1; `after` runs right after addAndClaim answers. */
  function startAgentWithQueuedDelta(t, after, withEcho = true) {
    writePlan('todo', 'delta');
    if (withEcho) writePlan('todo', 'echo');
    fs.writeFileSync(path.join(root, '.ctoc', 'state', 'todo-order.json'), JSON.stringify(['delta.md', 'echo.md']));
    const t1 = addBuild('delta');
    const orig = taskRegistry.addAndClaim;
    t.mock.method(taskRegistry, 'addAndClaim', (r, spec, o) => {
      const out = orig(r, spec, o);
      if (out.existing === true) after(t1);
      return out;
    });
    return t1;
  }

  it('17f. Start agent: the queued task gone at the claim is "already-queued" and the walk goes on', (t) => {
    const t1 = startAgentWithQueuedDelta(t, (id) => {
      const reg = JSON.parse(regBytes());
      reg.tasks = reg.tasks.filter((x) => x.id !== id);
      fs.writeFileSync(path.join(root, '.ctoc', 'state', 'tasks.json'), JSON.stringify(reg, null, 2));
    });
    const res = actions.startAgent(root);
    assert.equal(res.started, true, JSON.stringify(res));
    assert.equal(res.plan.name, 'echo');
    assert.ok(res.queuedTasks.some((q) => q.plan === 'delta' && q.taskId === t1 && q.reason === 'already-queued'), JSON.stringify(res.queuedTasks));
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(fs.existsSync(LOCK), false);
  });

  it('17g. Start agent: a registry write that throws on the claim of an existing task propagates', (t) => {
    let armed = false;
    const orig = safeFs.renameSync;
    startAgentWithQueuedDelta(t, () => { armed = true; }, false); // delta alone: the throw can only come from t1's claim
    t.mock.method(safeFs, 'renameSync', (src, dst) => {
      if (armed && String(src).includes(path.join('.ctoc', 'state'))) { armed = false; throw ioError('EIO', 'simulated write failure'); }
      return orig.call(safeFs, src, dst);
    });
    assert.throws(() => actions.startAgent(root), /EIO/);
    assert.deepEqual(stagesOf('delta'), ['todo'], 'the plan is back in todo/');
    assert.equal(fs.existsSync(LOCK), false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fix round 1 (critic findings C1-C7, security findings S1-S4)
// ═══════════════════════════════════════════════════════════════════════════════

describe('fix round 1: the decision is made in the write snapshot', () => {
  it('C1. an earlier read that fails does not turn a build start into a registry-only start', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const orig = taskRegistry.load;
    // Any read made by menu-screens itself fails: the decision must not depend on one.
    t.mock.method(taskRegistry, 'load', (r) => {
      const caller = (new Error().stack || '').split('\n').slice(1)
        .find((l) => !l.includes('node:internal') && !l.includes('a-build-start-moves-its-plan'));
      if (caller && caller.includes('menu-screens')) throw ioError('EIO', 'simulated read failure');
      return orig(r);
    });
    const res = run('start', t1);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(res.planPath, 'plans/in-progress/delta.md');
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
    assert.equal(taskOf(t1).status, 'running');
  });
});

describe('fix round 1: the lock file', () => {
  const isLock = (p) => String(p).endsWith('build-start.lock');

  it('14c. a lock dated one hour ahead is taken over', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    fs.writeFileSync(LOCK, 'foreign-owner');
    const ahead = new Date(Date.now() + 3_600_000);
    fs.utimesSync(LOCK, ahead, ahead);
    const res = run('start', t1);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
    assert.equal(fs.existsSync(LOCK), false);
  });

  it('14d. a broken symbolic link at the lock path is removed and the start succeeds', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    fs.symlinkSync(path.join(root, 'nowhere', 'target'), LOCK);
    const res = run('start', t1);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
    assert.throws(() => fs.lstatSync(LOCK), { code: 'ENOENT' }, 'the link is gone');
    assert.equal(fs.existsSync(path.join(root, 'nowhere')), false, 'nothing was created through the link');
  });

  it('14e. a directory at the lock path is refused as unusable and left untouched', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    fs.mkdirSync(LOCK);
    fs.writeFileSync(path.join(LOCK, 'keep'), 'x');
    const before = regBytes();
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.equal(res.refused, true);
    assert.equal(res.reason, 'build-start-lock-unusable');
    assert.match(res.text, /\.ctoc\/state\/build-start\.lock is not a plain file; remove it and start again/);
    assert.equal(fs.readFileSync(path.join(LOCK, 'keep'), 'utf8'), 'x', 'the directory is untouched');
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(regBytes(), before);
  });

  it('14f. Start agent also refuses an unusable lock, in the same words', () => {
    writePlan('todo', 'delta');
    fs.mkdirSync(LOCK);
    const res = actions.startAgent(root);
    assert.equal(res.started, false);
    assert.match(res.error, /\.ctoc\/state\/build-start\.lock is not a plain file; remove it and start again/);
    assert.notEqual(res.busy, true, 'running the same command again would not help');
    assert.deepEqual(stagesOf('delta'), ['todo']);
  });

  it('C4. our own lock that cannot be deleted is named in the warn log, and the start still succeeds', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const orig = safeFs.unlinkSync;
    t.mock.method(safeFs, 'unlinkSync', (p) => {
      if (isLock(p)) throw ioError('EPERM', 'operation not permitted');
      return orig.call(safeFs, p);
    });
    const res = run('start', t1);
    assert.equal(res.ok, true, JSON.stringify(res));
    const entries = taskRegistry.readWarnLog(root).filter((e) => e.event === 'build_start_lock_release_failed');
    assert.equal(entries.length, 1, JSON.stringify(taskRegistry.readWarnLog(root)));
    assert.ok(String(entries[0].lockPath).endsWith('build-start.lock'));
    assert.equal(fs.existsSync(LOCK), true, 'the undeletable lock is still there');
  });

  it('C4b. a lock another start took over is not named: it was never ours to delete', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const orig = safeFs.renameSync;
    let fired = false;
    t.mock.method(safeFs, 'renameSync', (src, dst) => {
      if (!fired && String(src).includes(path.join('.ctoc', 'state'))) { fired = true; fs.writeFileSync(LOCK, 'taken-over'); }
      return orig.call(safeFs, src, dst);
    });
    run('start', t1);
    assert.equal(taskRegistry.readWarnLog(root).filter((e) => e.event === 'build_start_lock_release_failed').length, 0);
    assert.equal(fs.readFileSync(LOCK, 'utf8'), 'taken-over');
  });
});

describe('fix round 1: the continuation and Start agent say a busy start is busy', () => {
  it('C3. Start agent\'s busy result carries busy: true and the continuation reports no build start', (t) => {
    fs.writeFileSync(LOCK, 'foreign-owner');
    const deltaPath = writePlan('todo', 'delta');
    ledger.writeEntry('delta', { content: fs.readFileSync(deltaPath, 'utf8'), stage_from: 'implementation', stage_to: 'todo' }, root);
    t.mock.method(require('../src/lib/continuation-queue'), 'nextBuildable', () => ({ buildable: ['todo/delta.md'] }));
    const direct = actions.startAgent(root);
    assert.equal(direct.started, false);
    assert.equal(direct.busy, true);
    // Slice 3: the continuation no longer calls Start agent, so a busy start cannot be reported
    // through it; it starts no build and sets no task running, and never touches the lock.
    const runningBefore = taskRegistry.load(root).tasks.filter((t) => t.status === 'running').map((t) => t.id);
    const cont = ms.continueAfterCrossing(root);
    assert.ok(!cont.reasons.includes('build-start-busy'), JSON.stringify(cont.reasons));
    assert.ok(!cont.reasons.includes('start-failed'), JSON.stringify(cont.reasons));
    assert.equal(cont.building, undefined, 'the result reports no build start');
    assert.ok(!cont.started.some((s) => /build/i.test(s)), JSON.stringify(cont.started));
    const runningAfter = taskRegistry.load(root).tasks.filter((t) => t.status === 'running').map((t) => t.id);
    assert.deepEqual(runningAfter, runningBefore, 'no task changed to running');
    // The plan is buildable, so the continuation queues its build; it claims nothing and moves nothing.
    assert.deepEqual(implementTasksFor('delta').map((x) => x.status), ['queued'], 'delta\'s build is queued');
    assert.deepEqual(stagesOf('delta'), ['todo'], 'delta stays in todo/');
    assert.deepEqual(fs.readdirSync(path.join(root, 'plans', 'in-progress')), [], 'in-progress/ stays empty');
    assert.equal(fs.readFileSync(LOCK, 'utf8'), 'foreign-owner');
  });
});

describe('fix round 1: claimBuild refuses what is not a build, by throwing', () => {
  it('C6a. a task that is not a build throws', () => {
    writePlan('todo', 'delta');
    const a = run('add', 'review', 'delta');
    assert.throws(() => actions.claimBuild(root, a.taskId), /not a build that names a plan/);
  });

  it('C6b. a build that names no plan throws', () => {
    const a = run('add', 'implement', '--label', 'loose', '--touches', 'src/loose.js');
    assert.equal(a.ok, true, JSON.stringify(a));
    assert.throws(() => actions.claimBuild(root, a.taskId), /not a build that names a plan/);
  });

  it('C6c. an unknown task id throws with the code unknown-task', () => {
    assert.throws(() => actions.claimBuild(root, 't99'), { code: 'unknown-task', message: /unknown task id t99/ });
  });
});

describe('fix round 1: the stamp', () => {
  it('C7. the agent id already recorded is an idempotent success with no write; a different one is still refused', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    assert.equal(run('start', t1).ok, true);
    let before = regBytes();
    const again = run('start', t1, '--agent-id', 't1'); // the placeholder itself
    assert.equal(again.ok, true, JSON.stringify(again));
    assert.equal(again.status, 'running');
    assert.match(again.text, /Task t1 → running \(agent t1 already recorded\)/);
    assert.equal(regBytes(), before, 'no write');
    assert.equal(run('start', t1, '--agent-id', 'H1').stamped, true);
    before = regBytes();
    const h1 = run('start', t1, '--agent-id', 'H1');
    assert.equal(h1.ok, true, JSON.stringify(h1));
    assert.match(h1.text, /already recorded/);
    assert.equal(regBytes(), before, 'no write');
    const h2 = run('start', t1, '--agent-id', 'H2');
    assert.equal(h2.ok, false);
    assert.equal(h2.reason, 'agent-recorded');
    assert.equal(regBytes(), before);
  });
});

describe('fix round 1: the plan name is joined into a path only when it is exactly a bare name', () => {
  it('S2a. a plan name with the .md suffix is refused as not bare', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta.md');
    const before = regBytes();
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'plan-name-not-bare');
    assert.match(res.text, /delta\.md/);
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(regBytes(), before);
  });

  it('S2b. a plan name that differs from the file name in letter case is not found', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('Delta', 'src/delta.js');
    const res = run('start', t1);
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'plan-not-found');
    assert.deepEqual(fs.readdirSync(path.join(root, 'plans', 'todo')), ['delta.md'], 'the file is untouched');
    assert.equal(taskOf(t1).status, 'queued');
  });

  it('S2c. a plan already in the build is not claimed by a second task for the same plan', () => {
    writePlan('in-progress', 'delta');
    const t1 = addBuild('delta');
    taskRegistry.withRegistry(root, (reg) => {
      const q = taskRegistry.addTask(reg, { kind: 'implement', plan: 'DELTA', touches: ['src/other.js'] });
      taskRegistry.updateTask(reg, q.id, { status: 'running' });
    });
    const before = regBytes();
    const res = run('start', t1);
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.equal(res.reason, 'plan-held-by-another-build');
    assert.match(res.text, /\bt2\b/);
    assert.equal(taskOf(t1).status, 'queued');
    assert.deepEqual(stagesOf('delta'), ['in-progress']);
    assert.equal(regBytes(), before);
  });
});

describe('fix round 1: a hostile --agent-id', () => {
  const unusable = ['H1\u0007', 'H1 x', 'a b', 'x'.repeat(129), 'café', 'H1;x'];

  it('S3a. a claim with an unusable id is refused, nothing is moved, and the id is not echoed', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const before = regBytes();
    for (const bad of unusable) {
      const res = run('start', t1, '--agent-id', bad);
      assert.equal(res.ok, false, JSON.stringify(bad));
      assert.equal(res.reason, 'agent-id-unusable');
      assert.ok(!res.text.includes(bad), 'not echoed: ' + JSON.stringify(bad));
      assert.deepEqual(stagesOf('delta'), ['todo']);
      assert.equal(regBytes(), before);
    }
  });

  it('S3b. a stamp with an unusable id is refused and writes nothing; 128 characters of the form are accepted', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    assert.equal(run('start', t1).ok, true);
    const before = regBytes();
    for (const bad of unusable) {
      const res = run('start', t1, '--agent-id', bad);
      assert.equal(res.ok, false, JSON.stringify(bad));
      assert.equal(res.reason, 'agent-id-unusable');
      assert.ok(!res.text.includes(bad), 'not echoed: ' + JSON.stringify(bad));
      assert.equal(regBytes(), before);
    }
    const longest = 'A.b_c:d-'.repeat(16);
    assert.equal(longest.length, 128);
    const okRes = run('start', t1, '--agent-id', longest);
    assert.equal(okRes.ok, true, JSON.stringify(okRes));
    assert.equal(taskOf(t1).agentTaskId, longest);
  });

  it('S3c. a recorded id of an unexpected form is never echoed in a refusal', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    assert.equal(run('start', t1).ok, true);
    taskRegistry.withRegistry(root, (reg) => { taskRegistry.updateTask(reg, t1, { agentTaskId: 'rec orded\u001b[31m' }); });
    const res = run('start', t1, '--agent-id', 'H2');
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'agent-recorded');
    assert.match(res.text, /an agent id of unexpected form/);
    assert.ok(!res.text.includes(' ') && !res.text.includes('\u001b'));
  });
});

describe('fix round 1: an unreadable registry is named as such', () => {
  it('S4. a reload that finds the registry unreadable does not say the task was removed', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const origWrite = taskRegistry.withRegistry;
    const origLoad = taskRegistry.load;
    let unreadable = false;
    beforeClaimWrite(t, () => {
      origWrite(root, (reg) => { taskRegistry.updateTask(reg, t1, { status: 'cancelled' }); });
      unreadable = true;
    });
    t.mock.method(taskRegistry, 'load', (r) => (unreadable
      ? { version: 1, generation: 0, seq: 0, tasks: [], unreadable: true, reason: 'simulated' }
      : origLoad(r)));
    const res = run('start', t1);
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.match(res.text, /the task registry could not be read; its plan is back in plans\/todo\//);
    assert.doesNotMatch(res.text, /removed/);
    assert.deepEqual(stagesOf('delta'), ['todo']);
  });

  it('S4b. a reload that throws is named the same way, and the plan goes back', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const origWrite = taskRegistry.withRegistry;
    const origLoad = taskRegistry.load;
    let broken = false;
    beforeClaimWrite(t, () => {
      origWrite(root, (reg) => { taskRegistry.updateTask(reg, t1, { status: 'cancelled' }); });
      broken = true;
    });
    t.mock.method(taskRegistry, 'load', (r) => {
      if (broken) throw ioError('EIO', 'simulated read failure');
      return origLoad(r);
    });
    const res = run('start', t1);
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.match(res.text, /the task registry could not be read; its plan is back in plans\/todo\//);
    assert.deepEqual(stagesOf('delta'), ['todo']);
  });

  it('S4c. a task another start claimed meanwhile keeps the plan in the build and reads already-started', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const origWrite = taskRegistry.withRegistry;
    beforeClaimWrite(t, () => {
      origWrite(root, (reg) => { taskRegistry.updateTask(reg, t1, { status: 'running', agentTaskId: 'other-start' }); });
    });
    const res = run('start', t1);
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.equal(res.reason, 'already-started');
    assert.deepEqual(stagesOf('delta'), ['in-progress'], 'the plan belongs to the start that claimed the task');
    assert.equal(taskOf(t1).agentTaskId, 'other-start');
  });
});

describe('fix round 2: a link at the lock path is never followed, taking or releasing the lock', () => {
  const isLock = (p) => String(p).endsWith('build-start.lock');

  it('R1. a symbolic link at the lock path that cannot be deleted is refused as unusable, not busy', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    fs.symlinkSync(path.join(root, 'nowhere', 'target'), LOCK);
    const orig = safeFs.unlinkSync;
    t.mock.method(safeFs, 'unlinkSync', (p) => {
      if (isLock(p)) throw ioError('EPERM', 'operation not permitted');
      return orig.call(safeFs, p);
    });
    const before = regBytes();
    const res = run('start', t1);
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.equal(res.reason, 'build-start-lock-unusable');
    assert.match(res.text, /\.ctoc\/state\/build-start\.lock is not a plain file; remove it and start again/);
    assert.ok(fs.lstatSync(LOCK).isSymbolicLink(), 'the link is left in place');
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(regBytes(), before);
  });

  /** Replace our own lock with `make()` at the moment of the registry write; the start itself goes on. */
  function replaceLockDuringStart(t, make) {
    const orig = safeFs.renameSync;
    let fired = false;
    t.mock.method(safeFs, 'renameSync', (src, dst) => {
      if (!fired && String(src).includes(path.join('.ctoc', 'state'))) {
        fired = true;
        const ours = fs.readFileSync(LOCK, 'utf8');
        fs.unlinkSync(LOCK);
        make(ours);
      }
      return orig.call(safeFs, src, dst);
    });
  }

  it('R3a. a lock replaced by a link to a file holding our own mark is not read through, and the link stays', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const target = path.join(root, 'mark-copy');
    replaceLockDuringStart(t, (ours) => {
      fs.writeFileSync(target, ours);
      fs.symlinkSync(target, LOCK);
    });
    const res = run('start', t1);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.ok(fs.lstatSync(LOCK).isSymbolicLink(), 'the link is not ours: it is left in place');
    assert.ok(fs.existsSync(target), 'what the link points at is untouched');
    assert.equal(taskRegistry.readWarnLog(root).filter((e) => e.event === 'build_start_lock_release_failed').length, 0);
  });

  it('R3b. a lock replaced by a file longer than 64 bytes is not read and is left in place', (t) => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    const big = 'x'.repeat(200);
    replaceLockDuringStart(t, () => { fs.writeFileSync(LOCK, big); });
    const origRead = safeFs.readFileSync;
    let readLock = false;
    t.mock.method(safeFs, 'readFileSync', (p, ...rest) => {
      if (isLock(p)) readLock = true;
      return origRead.call(safeFs, p, ...rest);
    });
    const res = run('start', t1);
    assert.equal(res.ok, true, JSON.stringify(res));
    assert.equal(readLock, false, 'a file that cannot be our mark is not read');
    assert.equal(fs.readFileSync(LOCK, 'utf8'), big);
  });
});

describe('fix round 2: a plan name that is not text is refused', () => {
  it('R4. a task whose plan is a list is refused as not bare; the plan of the same name stays in todo/', () => {
    writePlan('todo', 'delta');
    const t1 = addBuild('delta');
    taskRegistry.withRegistry(root, (reg) => { reg.tasks.find((x) => x.id === t1).plan = ['delta']; });
    assert.deepEqual(taskOf(t1).plan, ['delta'], 'the registry holds the list');
    const before = regBytes();
    const res = run('start', t1);
    assert.equal(res.ok, false, JSON.stringify(res));
    assert.equal(res.reason, 'plan-name-not-bare');
    assert.deepEqual(stagesOf('delta'), ['todo']);
    assert.equal(taskOf(t1).status, 'queued');
    assert.equal(regBytes(), before);
    assert.equal(fs.existsSync(LOCK), false);
  });
});
