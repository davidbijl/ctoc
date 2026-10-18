/**
 * The dashboard must SAY SO when the reconcile pass did not produce a trustworthy result.
 *
 * Contract replaced 2026-10-18 (owner): opening the dashboard changes no task and moves no plan;
 * a dead build moves only when the human names it in `menu task sweep` — plan
 * real-projects-do-not-stall-on-the-menu-s2. The dashboard no longer reconciles: it calls
 * `planRecovery.previewSweep` (a read), so every injection seam below moved from
 * `taskReconcile.reconcileState` to `planRecovery.previewSweep`; the dashboard saves nothing, so
 * the save-failure cases (6 and 9) now assert that no save line can appear. Every other case
 * asserts the same thing as before.
 *
 * `src/lib/menu-screens.js` wrapped `taskReconcile.reconcileState` in a `try` whose `catch`
 * was empty. The comment on it was half right: a reconcile failure must indeed never BRICK
 * the dashboard — but "do not brick" and "say nothing" are different instructions, and only
 * the second one was implemented. When the pass threw, the dashboard rendered the task
 * registry EXACTLY as it would have if the pass had succeeded: same TASKS block, same
 * counts, no orphan line, nothing amiss. That is presenting STALE STATE AS LIVE, and it is
 * worse than a blank section — a blank section prompts a question, a confident wrong
 * section does not.
 *
 * Three distinct states mean "the task state on this screen is not trustworthy right now",
 * and none of them had a reader:
 *
 *   the thrown pass        — the check DID NOT RUN at all.
 *   `report.corrupt`       — the check ran against an EMPTY view.
 *   `report.saveFailed`    — the check ran and decided, but the decisions are NOT on disk.
 *
 * WHAT IS REACHABLE FROM DISK, verified against the code (recorded here because the plan
 * assumed more was reachable than is):
 *
 *   • An unparseable `tasks.json` does NOT reach `report.corrupt`. `task-registry.load`
 *     fails OPEN (`JSON.parse` throws → `loadedEmpty()`, task-registry.js:381-386), so
 *     `reconcile` receives a well-formed EMPTY registry and sets no corrupt marker. Case 3
 *     pins that real behaviour rather than asserting a line the code cannot emit.
 *   • `corrupt.reason === 'load-failed'` (task-reconcile.js:609) IS reachable: it needs the
 *     load itself to throw, induced here by replacing `taskRegistry.withRegistry`, so the
 *     failure report is still built by the real code.
 *   • `corrupt.reason === 'malformed-entries-skipped'` (task-reconcile.js:453) is NOT
 *     reachable through `reconcileState`: `normalizeLoadedTask` guarantees a string `id`
 *     and `status` on every loaded task, so `reconcile`'s own `isWellFormed` skip counter
 *     (task-reconcile.js:309) is always 0 on this path. It is a live shape for a direct
 *     `reconcile` caller, so it is injected at the `reconcileState` module boundary.
 *   • A throw mid-pass never delivers a HALF report to the dashboard — the report object
 *     does not escape a throw, so `reconcileReport` is `null`. The two reachable PARTIAL
 *     states are `saveFailed` (decided, not persisted) and `load-failed` (an empty view
 *     returned as though it were clean), and both are asserted below.
 *
 * INJECTION SEAMS. `menu-screens` holds `task-reconcile` as a NAMESPACE
 * (`taskReconcile.reconcileState(...)`), the same seam this suite already uses for
 * `stale-detector`, so replacing the collaborator leaves the render under test real. The
 * save failure is induced at its REAL source through the `safe-fs` exports object — a
 * permission-based fixture would have to be skipped on some platform, and a skip is a gate
 * failure under the zero-skipped rule, while a seam behaves identically everywhere.
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const safeFs = require('../src/lib/safe-fs');
const menuScreens = require('../src/lib/menu-screens');
const planRecovery = require('../src/lib/plan-recovery');
const taskRegistry = require('../src/lib/task-registry');

const realPreviewSweep = planRecovery.previewSweep;
const realLoad = taskRegistry.load;
const realRenameSync = safeFs.renameSync;

const MIN = 60_000;

function ago(ageMs) {
  return new Date(Date.now() - ageMs).toISOString();
}

function task(over = {}) {
  return {
    id: 't1',
    kind: 'implement',
    label: 'a task',
    plan: null,
    status: 'queued',
    agentTaskId: null,
    touches: [],
    gitOp: false,
    blockedBy: [],
    result: null,
    ts: { created: ago(5 * MIN), started: null, cancelRequested: null, done: null },
    ...over
  };
}

/** Full report shape, so an injected report is a real one with fields overridden. */
function report(over = {}) {
  return {
    orphaned: [], stalenessOrphaned: [], cancelled: [], stalenessCancelled: [],
    unsatisfiable: [], deferred: [], failed: [], swept: [], quarantineReleased: [],
    corrupt: null,
    ...over
  };
}

let root;

async function seed(registry) {
  await fs.promises.mkdir(path.join(root, '.ctoc', 'state'), { recursive: true });
  await fs.promises.writeFile(
    path.join(root, '.ctoc', 'state', 'tasks.json'),
    typeof registry === 'string' ? registry : JSON.stringify(registry)
  );
}

function cleanRegistry(tasks) {
  return { version: 1, generation: 0, seq: tasks.length, tasks };
}

/** A preview carrying `rep` as its report and no counted work (the shape `previewSweep` returns). */
function previewOf(rep, counts = {}) {
  return {
    report: rep, builds: [],
    counts: { buildsBack: 0, deadHeld: 0, notYet: 0, otherDead: 0, neverRun: 0, released: 0, old: 0, pending: 0, ...counts },
  };
}

/** The one health line containing `needle`, or '' when there is none. */
function lineWith(text, needle) {
  return text.split('\n').find((l) => l.includes(needle)) || '';
}

describe('dashboard — a reconcile pass that did not produce a trustworthy result', () => {
  beforeEach(async () => {
    root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ctoc-reconcile-fail-'));
  });

  afterEach(async () => {
    planRecovery.previewSweep = realPreviewSweep;
    taskRegistry.load = realLoad;
    safeFs.renameSync = realRenameSync;
    await fs.promises.rm(root, { recursive: true, force: true });
  });

  // 1 — the load-bearing case: what a HUMAN SEES when the pass never ran.
  it('announces a pass that THREW instead of rendering as though it succeeded', async () => {
    await seed(cleanRegistry([task({ id: 't1', status: 'queued' })]));
    planRecovery.previewSweep = () => { throw new Error('injected reconcile failure'); };

    const text = menuScreens.buildDashboardTable(root);

    assert.match(text, /the background task check DID NOT RUN/);
    assert.match(text, /injected reconcile failure/);
    // and the rest of the dashboard is still there — this is not a replacement screen.
    assert.match(text, /INBOX/);
    assert.match(text, /AGENT/);
  });

  // 2 — not bricked.
  it('still renders the dashboard when the pass throws', async () => {
    await seed(cleanRegistry([task()]));
    planRecovery.previewSweep = () => { throw new Error('boom'); };

    let text;
    assert.doesNotThrow(() => { text = menuScreens.buildDashboardTable(root); });
    assert.ok(text.length > 0);
  });

  // 3 — the RECONCILE pass must not false-alarm on a corrupt file: its load fails OPEN
  // (no throw), so it observes an empty registry and its own health line — `could not be
  // read (load-failed)` — must be absent, and the `DID NOT RUN` (threw) line must be
  // absent too. But the AGENT status DID observe the corrupt file: `getAgentStatus`'s
  // `load` now distinguishes present-but-unreadable from absent, so the AGENT block
  // correctly says UNKNOWN rather than the false `○ Idle` it used to. This asserts BOTH:
  // the reconcile surface stays quiet (it saw nothing) AND the agent surface speaks (it
  // saw the unreadable file). The two are different observers of the same registry.
  it('reconcile stays quiet on a corrupt file while the agent status reports UNKNOWN', async () => {
    await seed('not json at all');

    const text = menuScreens.buildDashboardTable(root);

    assert.ok(text.length > 0);
    // reconcile's own health line and its threw-line are BOTH absent — it failed open.
    assert.doesNotMatch(text, /could not be read \(load-failed\)/);
    assert.doesNotMatch(text, /DID NOT RUN/);
    // the agent status, a separate observer, correctly reports the unreadable registry.
    assert.match(text, /the agent status is UNKNOWN/);
    assert.doesNotMatch(text, /○ Idle/);
  });

  // 4 — a REAL load failure. The report is built by the REAL code at task-reconcile.js:609;
  // only the loader is replaced, at the `task-registry` module boundary that `task-reconcile`
  // holds as a namespace.
  //
  // NOT induced through `safe-fs`, deliberately, and the reason is a defect this slice does
  // NOT own: making `safeFs.existsSync` throw for `tasks.json` also breaks
  // `state.getAgentStatus`, which calls `taskRegistry.load` UNGUARDED (state.js:258) from
  // `buildDashboardTable` BEFORE reconcile runs — so the whole dashboard throws. That is a
  // real, separate bricking path for an OS-level registry read error (EACCES/EIO), it lives
  // in `src/lib/state.js` which this slice does not declare, and it is reported as a finding
  // rather than fixed here or hidden by choosing a quieter seam.
  it('announces a registry the pass could not read at all', async () => {
    await seed(cleanRegistry([task()]));
    // Only the sweep preview's read fails: `state.getAgentStatus` calls the same loader unguarded
    // (the separate defect recorded above), so a global replacement would brick the whole screen.
    taskRegistry.load = (...args) => {
      if (/previewSweep/.test(new Error().stack)) throw new Error('injected registry read failure');
      return realLoad(...args);
    };

    const text = menuScreens.buildDashboardTable(root);

    assert.match(text, /the task registry could not be read/);
    assert.match(text, /load-failed/);
    assert.match(text, /EMPTY view/);
  });

  // 5 — the per-entry corruption shape, injected because disk cannot produce it.
  it('counts malformed entries the pass had to skip', async () => {
    await seed(cleanRegistry([task()]));
    planRecovery.previewSweep = () => previewOf(report({ corrupt: { reason: 'malformed-entries-skipped', skipped: 2 } }));

    const text = menuScreens.buildDashboardTable(root);

    assert.match(text, /malformed entr/);
    assert.match(text, /2 malformed entries skipped/);
  });

  // 6 — REPLACED 2026-10-18 (owner): the old case injected a failing tasks.json rename and asserted
  // "could NOT be saved". The dashboard saves nothing now, so a failing rename can never be reached:
  // the registry bytes stay as they were and no save line is printed.
  it('saves nothing, so a failing save can neither happen nor be announced', async () => {
    await seed(cleanRegistry([task({
      id: 't1',
      status: 'running',
      ts: { created: ago(210 * MIN), started: ago(200 * MIN), cancelRequested: null, done: null }
    })]));
    const file = path.join(root, '.ctoc', 'state', 'tasks.json');
    const before = fs.readFileSync(file, 'utf8');
    safeFs.renameSync = (from, to, ...rest) => {
      if (typeof to === 'string' && to.endsWith('tasks.json')) {
        throw new Error('injected save failure');
      }
      return realRenameSync(from, to, ...rest);
    };

    const text = menuScreens.buildDashboardTable(root);

    assert.equal(fs.readFileSync(file, 'utf8'), before, 'the dashboard must leave the registry bytes unchanged');
    assert.doesNotMatch(text, /could NOT be saved/);
    assert.doesNotMatch(text, /injected save failure/);
  });

  // 7 — a healthy project is byte-identical.
  it('renders no health line at all for a healthy project', async () => {
    await seed(cleanRegistry([task({ id: 't1', status: 'done', ts: { created: ago(MIN), started: ago(MIN), cancelRequested: null, done: ago(MIN) } })]));

    const text = menuScreens.buildDashboardTable(root);

    assert.doesNotMatch(text, /DID NOT RUN/);
    assert.doesNotMatch(text, /could not be read/);
    assert.doesNotMatch(text, /could NOT be saved/);
  });

  // 8 — trustworthiness leads findings.
  it('renders the health line ABOVE the sweep line and the wedge block', async () => {
    await seed(cleanRegistry([task()]));
    planRecovery.previewSweep = () => previewOf(report({
      corrupt: { reason: 'load-failed' },
      orphaned: ['t9'],
      unsatisfiable: [{ id: 't8', reason: 'dep-cycle', deps: ['t7'], summary: 'wedged' }]
    }), { otherDead: 1, pending: 1 });

    const text = menuScreens.buildDashboardTable(root);
    const health = text.indexOf('the task registry could not be read');
    const sweepLine = text.indexOf('review them with `menu task sweep`');
    const wedge = text.indexOf('can NEVER run');

    assert.ok(health >= 0 && sweepLine >= 0 && wedge >= 0, text);
    assert.ok(health < sweepLine, 'health must lead the sweep line');
    assert.ok(sweepLine < wedge, 'the sweep line leads the wedge block');
    assert.doesNotMatch(text, /orphaned — offer re-run/, 'the orphan line is gone');
  });

  // 9 — REPLACED 2026-10-18 (owner): the dashboard has no save to fail, so a report carrying
  // saveFailed renders the corrupt line and NO save line.
  it('renders the corrupt line and no save line, even for a report that carries saveFailed', async () => {
    await seed(cleanRegistry([task()]));
    planRecovery.previewSweep = () => previewOf(report({
      corrupt: { reason: 'load-failed' },
      saveFailed: 'disk full'
    }));

    const text = menuScreens.buildDashboardTable(root);

    assert.ok(text.indexOf('the task registry could not be read') >= 0, text);
    assert.doesNotMatch(text, /could NOT be saved/);
    assert.doesNotMatch(text, /disk full/);
  });

  // 10 — an unbounded message is how a dashboard line becomes unreadable.
  it('bounds a very long failure message', async () => {
    await seed(cleanRegistry([task()]));
    const huge = 'x'.repeat(500);
    planRecovery.previewSweep = () => { throw new Error(huge); };

    const text = menuScreens.buildDashboardTable(root);
    const line = lineWith(text, 'DID NOT RUN');

    assert.ok(line.length > 0, text);
    assert.ok(line.length <= 260, `health line was ${line.length} chars: ${line}`);
    assert.match(line, /…/);
    assert.ok(!line.includes(huge));
  });

  // 11 — a registry file is attacker-influenceable; a crafted message must not forge a row.
  it('cannot be made to forge a dashboard row with control characters', async () => {
    await seed(cleanRegistry([task()]));
    planRecovery.previewSweep = () => {
      throw new Error('evil\x1b[2Jmessage\nFORGED ROW');
    };

    const text = menuScreens.buildDashboardTable(root);
    const line = lineWith(text, 'DID NOT RUN');

    assert.ok(line.length > 0, text);
    assert.ok(!text.includes('\x1b'), 'no escape character may reach the screen');
    // stripCtl removes the ESC byte and the newline, so the message stays on ONE line.
    assert.match(line, /evil\[2JmessageFORGED ROW/);
  });

  // 12 — a malformed preview is not a failure and must not be announced as one.
  it('renders no health, sweep or wedge line when the preview is malformed', async () => {
    await seed(cleanRegistry([task()]));
    planRecovery.previewSweep = () => ({});

    let text;
    assert.doesNotThrow(() => { text = menuScreens.buildDashboardTable(root); });
    assert.ok(text.length > 0);
    assert.doesNotMatch(text, /DID NOT RUN/);
    assert.doesNotMatch(text, /could not be read/);
    assert.doesNotMatch(text, /could NOT be saved/);
    assert.doesNotMatch(text, /review them with `menu task sweep`/);
    assert.doesNotMatch(text, /can NEVER run|held one pass|marked dead on age alone/);
  });

  // 13 — the promote contract the completion turn reads must describe what it receives.
  it('describes promote[] as the guarded set, not the raw scheduler output', async () => {
    const md = await fs.promises.readFile(
      path.join(__dirname, '..', 'src', 'commands', 'start.md'), 'utf8'
    );
    const promoteLine = md.split('\n').find((l) => l.includes('**Promote.**')) || '';

    assert.ok(promoteLine.length > 0, 'the promote step must still exist');
    assert.match(promoteLine, /with the concurrent-edit guard applied/);
    // It must still NAME the scheduler function (menu-protocol.test.js depends on that),
    // and it must QUALIFY it: the raw set is the one thing `promote[]` is not.
    assert.match(promoteLine, /nextRunnable/);
    assert.match(promoteLine, /MINUS the candidates the guard held/);
    assert.ok(
      promoteLine.indexOf('nextRunnable') < promoteLine.indexOf('concurrent-edit guard'),
      'the guard clause must qualify the scheduler set, not precede it'
    );
    // the sanctioned-promotion rule itself is unchanged
    assert.match(promoteLine, /never start a queued task the scheduler did not return/);
  });
});
