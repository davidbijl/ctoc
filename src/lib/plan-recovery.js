'use strict';

/**
 * Plan recovery — the sweep: send a dead build's plan back to the build queue, on the human's word.
 *
 * WHY THIS EXISTS. The task reconciler (`task-reconcile.js`) already decides "the
 * builder is dead" — with all its kind-aware liveness and staleness logic — and
 * records that verdict DURABLY on the task as `result.orphanReason`. But orphaning
 * the TASK does nothing to the PLAN: the plan file stays in `plans/in-progress/`,
 * where the dashboard renders it as work in flight. A real project (V4) had five
 * approved plans sitting in `in-progress` with no live builder three days after its
 * session ended — they read as active work that nothing was doing. This module
 * closes that gap.
 *
 * A PURE PROJECTION, never a second judgment. Recovery reads the reconciler's own
 * persisted verdict and acts on the plan; it never re-derives liveness or staleness
 * and never edits `task-reconcile.js` / `task-registry.js`.
 *
 * THE HUMAN'S RESOLVED STANCE (2026-07-22) — RE-QUEUE FOR A CLEAN REBUILD, tiered:
 *
 *   | orphaned implement task's result.orphanReason | reconciler's file state | action  |
 *   |-----------------------------------------------|-------------------------|---------|
 *   | 'staleness'                                   | still QUARANTINED       | SURFACE |
 *   | null / 'confirmed-dead' / 'presumed-dead'     | RELEASED                | RE-QUEUE|
 *
 *   • A RELEASED orphan is re-queued `in-progress` → `todo` REGARDLESS of whether its
 *     partial work is structurally review-ready. `validateForReview` checks STRUCTURE
 *     (step labels present, criteria marked), NOT that Step 14 VERIFY actually ran
 *     before the builder died — so a structurally-complete orphan may be functionally
 *     half-built, and letting it flow forward risks a human rubber-stamping unverified
 *     work at the review gate. So this module NEVER calls `validateForReview` and has
 *     no review-readiness gate: the rebuild-and-re-verify path is the chosen stance.
 *   • A STALENESS orphan is only SURFACED, never moved. Its files are still QUARANTINED
 *     because the builder MAY STILL BE ALIVE; re-queuing it would let `startAgent` claim
 *     it and put a SECOND agent on files the first may still be editing — the exact
 *     two-agents-on-one-file hazard the quarantine exists to prevent. `addAndClaim` does
 *     not consult the quarantine, so tiering by the reconciler's own quarantine-release
 *     reuses that safety instead of re-deriving it (and inherits the 120-/240-minute
 *     kind-aware floors for free — recovery never re-computes an age).
 *   • The LIVENESS VETO never touches a plan a fresh agent has re-claimed: because
 *     `orphaned` is a SOFT terminal and a re-claim creates a new RUNNING task for the
 *     same plan, the OLD orphaned task and a LIVE task can both name the plan at once.
 *     `taskRegistry.findActivePlanTask(reg, plan, 'implement')` truthy ⇒ veto.
 *
 * `in-progress → todo` is a BACKWARD recovery edge. The four human gates are FORWARD
 * edges (vision→functional, functional→implementation, implementation→todo,
 * review→done), so an auto-move backward crosses NO gate and needs no approval.
 *
 * RECOVERY NO LONGER RUNS ON THE MENU RENDER (owner, 2026-10-18). It runs only inside a
 * CONFIRMED sweep (`applySweep`, reached by `menu task sweep --confirm <plan>@<token>`), and
 * only for the plans the human named. Opening the dashboard calls `previewSweep`, which
 * computes the same verdict in memory and writes nothing: no task change, no plan move, no
 * cleanup-log entry. A build whose agent id was never recorded is UNKNOWN, not dead, so a
 * live build can no longer be thrown back to the build queue by a dashboard refresh.
 *
 * THE SWEEP VERDICT is one pure function (`sweepVerdict`) shared by the dashboard line, the
 * preview, the apply and the Doctor "Repair state" key. A dead build goes back only when no
 * work came after its claim (`findWorkAfterClaim`: one `git log` over every branch, the
 * worktrees' uncommitted changes, one time budget); a claim itself (the plan's 100% rename)
 * is never work. Git failing, or running out of time, counts as work found (fail closed).
 *
 * FAIL-OPEN + HONEST throughout (matching the reconciler): a bad root, a garbage
 * registry, an absent `in-progress/`, a per-plan move collision, and a broken cleanup
 * log each degrade to a recorded skip/surface or an empty result — never a throw.
 *
 * Cross-platform: `path.join` for every path; `safeFs` (the audited fs choke point)
 * for the log; git through `spawnSync` with an argument list and `shell: false`.
 */

const path = require('path');
const crypto = require('crypto');
const safeFs = require('./safe-fs');
const taskRegistry = require('./task-registry');
// A namespace, so a test can inject a move failure on the exports object.
const actions = require('./actions');
const taskReconcile = require('./task-reconcile');
const planCoverage = require('./plan-coverage');
const { stripCtl } = require('./tui');
const { getPlansDir, readPlans } = require('./state');
const { findProjectRoot } = require('./project-root');

/** The reason recorded on a re-queued plan, in the human's own terms. */
const RECOVER_REASON =
  'its builder is no longer running; the build is re-queued for a clean rebuild and ' +
  're-verification (partial work may remain in the dead worktree)';
/** The reason recorded when an orphan is only surfaced (still quarantined). */
const SURFACE_REASON =
  'orphaned on staleness alone — its builder may still be running; not yet recovered';
/** The reason recorded when a fresh agent has re-claimed the plan. */
const RECLAIM_REASON = 'live registry task — a fresh agent owns this plan';

/** One time budget for ALL the git calls of one preview. */
const SWEEP_GIT_BUDGET_MS = 5_000;
/** A task id or plan name segment that is safe to put in a command the session will run. */
const SAFE_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;
/** THE plan-name rule: safe in a command, in a path and as a pathspec (fail closed otherwise). */
const PLAN_NAME_RE = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,199}$/;
/** The minutes a build needs to be old before a sweep may name it with no sign of life. */
const BUILD_BOUND_MIN = (taskReconcile.DEFAULT_STALE_MS_BY_KIND.implement *
  taskReconcile.DEFAULT_PRESUMED_DEAD_MULTIPLE) / 60_000;

/**
 * Append a best-effort recovery entry to `.ctoc/logs/cleanup.json`. A broken log
 * must NEVER break recovery, so the whole body is wrapped: any failure is swallowed
 * (the log is a rebuildable audit trail, not a correctness dependency).
 *
 * @param {string} root - project root
 * @param {string} plan - the re-queued plan slug
 * @param {number} now - epoch ms for the entry timestamp
 * @param {object} [extra] - more fields for the entry (the sweep's route, code, token, live list)
 */
function appendCleanupLog(root, plan, now, extra = {}) {
  try {
    const logDir = path.join(root, '.ctoc', 'logs');
    safeFs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, 'cleanup.json');
    let log = [];
    if (safeFs.existsSync(logFile)) {
      try {
        const parsed = JSON.parse(safeFs.readFileSync(logFile, 'utf8'));
        if (Array.isArray(parsed)) log = parsed;
      } catch {
        // A corrupt cleanup log is an audit artifact, not a correctness input: start a
        // fresh valid array rather than propagate. The reset is explicit (not a silent
        // fall-through) so the absorbed failure — an unparseable log — is stated in code.
        log = [];
      }
    }
    log.push({
      plan,
      from: 'in-progress',
      to: 'todo',
      action: 'recovered',
      reason: RECOVER_REASON,
      at: new Date(now).toISOString(),
      ...extra,
    });
    safeFs.writeFileSync(logFile, JSON.stringify(log, null, 2));
  } catch (err) {
    // The move already succeeded; a failed cleanup-log write must never turn a real
    // recovery into a reported failure. Record it to stderr (the state.js fail-open
    // style) rather than swallow it silently — a log failure is not a recovery verdict.
    process.stderr.write(
      '[ctoc] plan-recovery: cleanup-log write failed for ' + plan + ': ' +
      ((err && err.message) ? err.message : String(err)) + '\n'
    );
  }
}

/**
 * Project the task reconciler's orphan verdict onto the plan files: re-queue every
 * released (file-freed) orphaned build back to `todo` for a clean rebuild; surface a
 * still-quarantined staleness orphan honestly without moving it; never touch a plan a
 * fresh agent has re-claimed. NEVER THROWS.
 *
 * @param {string} root - project root. Falsy ⇒ `findProjectRoot()`.
 * @param {{ now?: number, released?: Array<{id:string, plan:string}>, log?: Map<string, object> }} [opts]
 *   - `now` — epoch ms for the cleanup-log timestamp (default `Date.now()`),
 *     injectable for deterministic tests.
 *   - `released` — builds the caller (the confirmed sweep) has already judged released. When
 *     present the loop walks THESE instead of the registry's orphaned tasks, and the staleness
 *     surface is skipped for them (the caller judged them on a fresh preview). The liveness
 *     veto still reads the registry loaded here, and the plan must still be resident.
 *   - `log` — extra cleanup-log fields per plan (the sweep's route, code, token, live list).
 * @returns {{ recovered: Array<{plan:string, taskId:string, reason:string}>,
 *             surfaced:  Array<{plan:string, taskId:string, reason:string}>,
 *             skipped:   Array<{plan:string, reason:string}> }}
 *   `recovered` — moved in-progress→todo; `surfaced` — orphaned but still quarantined
 *   (reported, not moved); `skipped` — live-re-claimed or move-failed.
 */
function recoverOrphanedPlans(root, opts = {}) {
  const recovered = [];
  const surfaced = [];
  const skipped = [];

  root = root || findProjectRoot();
  const now = (opts && opts.now != null) ? opts.now : Date.now();

  // The registry load is fail-open on data; the catch guards a bad-root TypeError so a
  // non-string root degrades to an empty result instead of crashing the menu render.
  let reg;
  try {
    reg = taskRegistry.load(root);
  } catch {
    reg = { tasks: [] };
  }

  // Only orphaned IMPLEMENT tasks that carry a plan slug are stalled builds. (Recovery
  // is implement-only, matching how startAgent / cleanupStaleInProgress key on
  // 'implement' for plan↔task mapping.) With `released`, the caller's judged builds ARE the list.
  const judged = Array.isArray(opts && opts.released);
  const orphaned = judged
    ? opts.released
    : (reg.tasks || []).filter(
      (t) => t && t.status === 'orphaned' && t.kind === 'implement' && t.plan != null
    );
  if (orphaned.length === 0) return { recovered, surfaced, skipped };

  // The resident in-progress plans, keyed by slug. `readPlans` is fail-open: an absent
  // directory yields [] (state.js), so a missing in-progress/ simply means nothing to act
  // on. We only reach here with a string root (load did not throw), so this never faults.
  const plans = readPlans(path.join(getPlansDir(root), 'in-progress'));
  const bySlug = new Map(plans.map((p) => [p.name, p]));

  const seen = new Set(); // act ONCE per plan (first orphaned task wins) — idempotent dedup
  for (const task of orphaned) {
    const plan = task.plan;
    if (seen.has(plan)) continue;
    const planObj = bySlug.get(plan);
    if (!planObj) continue; // a task naming a non-resident plan is simply ignored
    seen.add(plan);

    // 1. Liveness veto — a fresh agent re-claimed this plan; never yank it out from under a live build.
    if (taskRegistry.findActivePlanTask(reg, plan, 'implement')) {
      skipped.push({ plan, reason: RECLAIM_REASON });
      continue;
    }

    // 2. Still quarantined (staleness) — the builder may still be alive; surface, do not move.
    //    (A build the sweep judged on a fresh preview skips this: it was judged released.)
    if (!judged && task.result && task.result.orphanReason === 'staleness') {
      surfaced.push({ plan, taskId: task.id, reason: SURFACE_REASON });
      continue;
    }

    // 3. Released (orphanReason null / 'confirmed-dead' / 'presumed-dead') — re-queue for a
    //    clean rebuild, REGARDLESS of review-readiness. One move failure never aborts the batch.
    try {
      actions.movePlan(planObj.path, 'todo', root);
      appendCleanupLog(root, plan, now, (opts && opts.log && opts.log.get(plan)) || {});
      recovered.push({ plan, taskId: task.id, reason: RECOVER_REASON });
    } catch (err) {
      skipped.push({ plan, reason: 'move failed: ' + ((err && err.message) ? err.message : String(err)) });
    }
  }

  return { recovered, surfaced, skipped };
}

// ── the sweep verdict (pure) ─────────────────────────────────────────────────────────

/** Every segment of `v` is safe to put in a command (the rule `menu-screens` applies to `parent_plan`). */
function isSafeName(v) {
  if (typeof v !== 'string' || v === '') return false;
  return v.split('/').every((seg) => seg !== '.' && seg !== '..' && SAFE_SEGMENT_RE.test(seg));
}

/** Is `v` a plan name every part of the menu may use? One rule: the sweep's parser, the verdict and the work check. */
function isSafePlan(v) {
  return typeof v === 'string' && PLAN_NAME_RE.test(v);
}

/** The fingerprint of a live-agent list: it goes into every token, so a different list is stale. */
function liveFingerprint(liveAgentIds) {
  if (liveAgentIds == null) return 'none';
  const ids = Array.from(new Set(Array.from(liveAgentIds, String))).sort();
  return crypto.createHash('sha256').update(JSON.stringify(ids)).digest('hex');
}

const ZERO_COUNTS = Object.freeze({
  buildsBack: 0, deadHeld: 0, notYet: 0, otherDead: 0, neverRun: 0, released: 0, old: 0, pending: 0,
});

function emptyReport(corrupt) {
  return {
    orphaned: [], stalenessOrphaned: [], cancelled: [], stalenessCancelled: [], unsatisfiable: [],
    deferred: [], failed: [], swept: [], quarantineReleased: [], quarantined: [], corrupt: corrupt || null,
  };
}

/**
 * THE sweep verdict. Pure: no file or process I/O. Which builds would go back to the build queue,
 * which never move, which are not yet eligible — and the changes a sweep makes that move no plan.
 *
 * @param {object} registry  a registry value (or any value `task-reconcile.reconcile` accepts)
 * @param {{ inProgress?: string[], liveAgentIds?: (string[]|null), now?: number,
 *           work?: Object<string, {found:boolean, gitFailed?:boolean, ref?:string, detail?:string}> }} [input]
 * @returns {{ builds: object[], counts: object, report: object, liveHash: string }}
 */
function sweepVerdict(registry, input = {}) {
  const now = Number.isFinite(input.now) ? input.now : Date.now();
  const inProgress = new Set(Array.isArray(input.inProgress) ? input.inProgress : []);
  const work = input.work || {};
  const live = input.liveAgentIds == null ? null : new Set(Array.from(input.liveAgentIds, String));
  const liveHash = liveFingerprint(input.liveAgentIds);
  const tasksIn = (registry && Array.isArray(registry.tasks)) ? registry.tasks.filter((t) => t && typeof t.id === 'string') : [];

  const base = { liveAgentIds: input.liveAgentIds, now, onePass: true };
  // Every task's fate if every dead build were named.
  const whatIf = taskReconcile.reconcile(registry, base);
  // What a sweep that names nothing changes: every running build is held.
  const heldPass = taskReconcile.reconcile(registry, { ...base, releaseBuilds: [] });

  let candidates = [];
  try { candidates = taskRegistry.nextRunnable(heldPass.tasks); } catch { candidates = []; }
  if (!Array.isArray(candidates)) candidates = [];
  const guard = taskReconcile.applyQuarantine(heldPass.tasks, candidates);
  const report = { ...heldPass.report, quarantined: guard.quarantined };
  if (guard.faulted) report.quarantineFaulted = guard.faulted;

  const isBuild = (t) => t.kind === 'implement' && t.plan != null;
  const outcome = new Map(whatIf.tasks.tasks.map((t) => [t.id, t]));
  const nonTerminalBuilds = (plan) => tasksIn.filter((o) => o.kind === 'implement' && o.plan === plan && !taskRegistry.TERMINAL.has(o.status));

  // Rows: every running build (R1), and every orphaned build still in the building folder with no
  // live build of its plan, first orphan per plan (R2).
  const sources = [];
  const seenR2 = new Set();
  for (const t of tasksIn) {
    if (!isBuild(t)) continue;
    if (t.status === 'running') sources.push({ t, r: 1 });
    else if (t.status === 'orphaned' && inProgress.has(t.plan) && !taskRegistry.findActivePlanTask(registry, t.plan, 'implement') && !seenR2.has(t.plan)) {
      seenR2.add(t.plan);
      sources.push({ t, r: 2 });
    }
  }

  const builds = sources.map(({ t, r }) => {
    const realId = taskReconcile.isRealAgentId(t.agentTaskId, t.id);
    const startedMs = Date.parse(t.ts && t.ts.started);
    const ageMs = now - startedMs;
    const ageMin = Number.isFinite(ageMs) ? Math.floor(ageMs / 60_000) : null;
    const ageText = ageMin === null ? 'unknown' : String(ageMin);
    const agent = stripCtl(String(t.agentTaskId)).slice(0, 60);
    const unknown = !realId
      ? 'no agent id recorded'
      : (live === null ? 'no live agent list was given' : `agent ${agent} is not in the live list`);
    const o = outcome.get(t.id);
    const w = work[t.id];

    let group; let code; let reason;
    const put = (g, c, text) => { group = g; code = c; reason = text; };

    if (r === 1 && nonTerminalBuilds(t.plan).some((x) => x.id !== t.id)) {
      put('never-moved', 'plan-shared', 'another build of this plan is still recorded as running or queued');
    } else if (!isSafePlan(t.plan)) {
      put('never-moved', 'unsafe-name', 'its plan name holds characters the menu will not put in a command');
    } else if (o && o.status === 'running') {
      if (live !== null && realId && live.has(String(t.agentTaskId))) {
        put('never-moved', 'alive', `the builder is alive (agent ${agent} is in the live list)`);
      } else if (Number.isFinite(ageMs) && ageMs < taskReconcile.DEFAULT_GRACE_MS) {
        put('not-yet', 'young', 'started under a minute ago');
      } else {
        put('not-yet', 'under-floor', `${unknown}; ${ageText} min old; it can be named once it is ${BUILD_BOUND_MIN} min old`);
      }
    } else if (o && o.status === 'orphaned' && o.result && o.result.orphanReason === 'staleness') {
      put('not-yet', 'files-held', `${unknown}; ${ageText} min old; its files stay held until it is ${BUILD_BOUND_MIN} min old`);
    } else if (!inProgress.has(t.plan)) {
      put('never-moved', 'not-here', 'its plan is not among the plans being built in this checkout');
    } else {
      // Released: judged dead. Whether it may go back depends on the work check.
      let deadCode;
      let deadReason;
      if (r === 2 || !o) {
        deadCode = 'already-dead'; deadReason = 'its task was already marked dead';
      } else if (o.result && o.result.orphanReason === 'presumed-dead') {
        deadCode = 'presumed-dead'; deadReason = `${unknown}; ${ageText} min old, past the ${BUILD_BOUND_MIN}-minute bound`;
      } else {
        deadCode = 'confirmed-dead'; deadReason = `agent ${agent} is not in the live list`;
      }
      if (w && w.found === true && w.gitFailed !== true) {
        put('never-moved', 'work-found', `work was found after the claim: ${w.detail}`);
      } else if (w && w.gitFailed === true) {
        put('never-moved', 'git-failed', `git could not show whether work came after the claim: ${w.detail}`);
      } else {
        put('would-go-back', deadCode, deadReason);
      }
    }

    const token = crypto.createHash('sha256').update(JSON.stringify(
      [t.id, t.plan, t.status, t.agentTaskId ?? null, group, code, w ? (w.ref || '') : '', liveHash]
    )).digest('hex').slice(0, 12);
    return {
      id: t.id,
      plan: t.plan,
      status: t.status,
      agentTaskId: t.agentTaskId ?? null,
      realId,
      ageMin,
      bound: BUILD_BOUND_MIN,
      unknown,
      group,
      code,
      reason,
      token,
      wayOut: ['work-found', 'git-failed', 'not-here', 'plan-shared'].includes(code),
      safeId: isSafeName(t.id),
      safePlan: isSafePlan(t.plan),
      staleMarker: !!(t.result && t.result.orphanReason === 'staleness'),
    };
  });

  const buildIds = new Set(builds.map((b) => b.id));
  const buildsBack = builds.filter((b) => b.group === 'would-go-back').length;
  const deadHeld = builds.filter((b) => b.group === 'never-moved' && b.code !== 'alive').length;
  const notYet = builds.filter((b) => b.group === 'not-yet' && (b.code === 'under-floor' || b.code === 'files-held')).length;
  const otherDead = [...report.orphaned, ...report.cancelled].filter((id) => !buildIds.has(id)).length;
  const neverRun = report.unsatisfiable.length;
  const released = report.quarantineReleased.filter((id) => !report.orphaned.includes(id) && !buildIds.has(id)).length;
  const old = report.swept.length;
  const counts = {
    buildsBack, deadHeld, notYet, otherDead, neverRun, released, old,
    pending: buildsBack + otherDead + neverRun + released + old,
  };
  return { builds, counts, report, liveHash };
}

// ── the work check (git) ─────────────────────────────────────────────────────────────

/** The environment for every git call: no variable matching /^GIT_/i (Windows keys are case-blind). */
function gitEnv() {
  /** @type {NodeJS.ProcessEnv} */
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!/^GIT_/i.test(k)) env[k] = v;
  }
  return env;
}

const firstLine = (v) => stripCtl(String(v == null ? '' : v).split('\n').find((l) => l.trim() !== '') || 'no message').slice(0, 120);

/**
 * The worktrees `worktree list --porcelain -z` printed: each block's path and HEAD sha. A bare or
 * prunable block is skipped, and so is a block with no path.
 * @param {string} stdout
 * @returns {Array<{path:string, head:(string|null)}>}
 */
function parseWorktrees(stdout) {
  const list = [];
  let block = [];
  const flush = () => {
    if (block.length > 0 && block[0].startsWith('worktree ') && !block.some((f) => f === 'bare' || f.startsWith('prunable'))) {
      const headField = block.find((f) => f.startsWith('HEAD '));
      const head = headField ? headField.slice('HEAD '.length) : '';
      list.push({ path: block[0].slice('worktree '.length), head: /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(head) && !/^0+$/.test(head) ? head : null });
    }
    block = [];
  };
  for (const field of stdout.split('\0')) {
    if (field === '') flush(); else block.push(field);
  }
  flush();
  return list;
}

/**
 * Whether any work came after each task's claim, for ALL candidates of one preview together: one
 * `git log` over every branch, the worktrees' uncommitted changes, one time budget. Fails closed:
 * anything git cannot answer counts as work found. A claim itself (the plan's 100% rename) is never
 * work, wherever it sits.
 *
 * @param {string} root
 * @param {object[]} tasks  registry tasks (id, plan, touches, ts.started)
 * @returns {Object<string, {found:boolean, gitFailed?:boolean, ref?:string, detail?:string}>}
 */
function findWorkAfterClaim(root, tasks) {
  /** @type {Record<string, any>} */
  const out = {};
  const deadline = Date.now() + SWEEP_GIT_BUDGET_MS;
  const failed = (ref, detail) => ({ found: true, gitFailed: true, ref, detail });

  /** One git call inside the shared budget. */
  const runGit = (args, cwd, noProbe) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return { failed: failed('timeout', 'not checked in time') };
    const r = require('child_process').spawnSync('git', args, {
      cwd, encoding: 'utf8', timeout: remaining, maxBuffer: 64 * 1024 * 1024, windowsHide: true, shell: false, env: gitEnv(),
    });
    if (r.error || r.status !== 0) {
      if ((r.error && /** @type {NodeJS.ErrnoException} */ (r.error).code === 'ETIMEDOUT') || (r.signal && r.status === null)) return { failed: failed('timeout', 'not checked in time') };
      let detail = firstLine(r.error ? r.error.message : r.stderr);
      if (r.status === 129 && !noProbe) {
        // git's usage-error status: an unknown option. Say which git it is when it is too old.
        const v = runGit(['--version'], cwd, true);
        const ver = v.stdout && String(v.stdout).trim().split(/\s+/).find((w) => /^\d+\.\d+/.test(w));
        const [major, minor] = ver ? ver.split('.').map(Number) : [NaN, NaN];
        if (major < 2 || (major === 2 && minor < 36)) detail = `git ${ver} is older than 2.36`;
      }
      return { failed: failed('git-failed', detail) };
    }
    return { stdout: String(r.stdout) };
  };

  // Per task, before any git call.
  const pending = [];
  for (const task of tasks) {
    const startedMs = Date.parse(task.ts && task.ts.started);
    if (!Number.isFinite(startedMs)) { out[task.id] = failed('no-start', 'the task has no start time'); continue; }
    const plan = task.plan;
    if (!isSafePlan(plan)) { out[task.id] = failed('unsafe-plan', 'the plan name cannot be checked'); continue; }
    const planPath = path.join(root, 'plans', 'in-progress', `${plan}.md`);
    let declared;
    try {
      const content = safeFs.readFileSync(planPath, 'utf8');
      declared = new Set([
        ...(Array.isArray(task.touches) ? task.touches : []),
        ...planCoverage.readPlanFiles(planPath, content),
        ...actions.planDeclaredFiles({ content }),
      ]);
    } catch { out[task.id] = failed('unreadable-plan', 'the plan file cannot be read'); continue; }
    const files = [];
    let bad = false;
    for (const f of declared) {
      if (typeof f !== 'string') { bad = true; break; }
      const norm = f.replace(/\\/g, '/');
      // The plan's own file is handled by the log rule, never as a declared file.
      if (norm === 'plans' || norm.startsWith('plans/')) continue;
      if (norm === '' || norm.startsWith('/') || /^[A-Za-z]:/.test(norm) || norm.split('/').includes('..')
          || norm.startsWith(':') || stripCtl(f) !== f) { bad = true; break; }
      files.push(norm);
    }
    if (bad) { out[task.id] = failed('unreadable-file', 'a declared file cannot be checked'); continue; }
    // Nothing declared (the plan's own file is set aside): an empty pathspec would list every change.
    if (files.length === 0) { out[task.id] = failed('unreadable-file', 'the plan declares no file to check'); continue; }

    // Another repository: a non-empty leading part holding its own `.git`.
    let nested = false;
    for (const norm of files) {
      const segs = norm.split('/');
      const lit = [];
      for (const seg of segs) { if (/[*?[]/.test(seg)) break; lit.push(seg); }
      for (let k = 1; k <= lit.length && !nested; k++) {
        if (safeFs.existsSync(path.join(root, ...lit.slice(0, k), '.git'))) nested = true;
      }
      if (nested) break;
    }
    if (nested) { out[task.id] = failed('other-repository', 'a declared file sits in another repository'); continue; }

    const fileMatchers = files.map((f) => planCoverage.globToRegex(f));
    const matchesFile = (p) => fileMatchers.some((m) => m.test(p)) || files.some((f) => p === f || p.startsWith(`${f}/`));
    const planRe = (p) => { const m = /^plans\/[^/]+\/(.+)$/.exec(p); return !!m && m[1] === `${plan}.md`; };
    pending.push({
      id: task.id,
      plan,
      sinceSec: Math.floor(startedMs / 1000),
      fileSpecs: files.map((f) => `:(glob)${f}`),
      specs: [...files.map((f) => `:(glob)${f}`), `:(glob)plans/*/${plan}.md`],
      matchesFile,
      touches: (p) => matchesFile(p) || planRe(p),
    });
  }
  if (pending.length === 0) return out;

  const remaining = () => pending.filter((p) => out[p.id] === undefined);
  const failRest = (res) => { for (const p of remaining()) out[p.id] = res; };

  // Call 1, the folder offset.
  const top = runGit(['rev-parse', '--show-prefix'], root);
  if (top.failed) { failRest(top.failed); return out; }
  const prefix = top.stdout.trim();

  // Call 2, the worktrees: where uncommitted changes are looked for, and the commits no branch holds.
  const wl = runGit(['worktree', 'list', '--porcelain', '-z'], root);
  if (wl.failed) { failRest(wl.failed); return out; }
  const worktrees = parseWorktrees(wl.stdout);
  if (worktrees.length === 0) { failRest(failed('git-failed', 'git listed no worktree')); return out; }
  const heads = Array.from(new Set(worktrees.map((w) => w.head).filter(Boolean)));

  // Call 3, the commits.
  const minSince = Math.min(...pending.map((p) => p.sinceSec));
  const specs = Array.from(new Set(pending.flatMap((p) => p.specs)));
  const log = runGit(['--no-replace-objects', '-c', 'log.showSignature=false', '-c', 'core.quotePath=false', '-c', 'core.fsmonitor=false', 'log',
    '--branches', '--remotes', ...heads, '--full-history', '--diff-merges=first-parent', '-M', '--relative', '--name-status', '--no-color',
    `--since=${new Date((minSince - 86400) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
    '--format=%x01%H%x09%ct%x09%S%x09%P', '--', ...specs], root);
  if (log.failed) { failRest(log.failed); return out; }

  const workFor = (sha, source) => ({
    found: true,
    ref: sha,
    detail: `commit ${sha.slice(0, 12)} on ${/^[0-9a-f]{40,64}$/.test(source || '') ? 'a detached worktree' : (source || '').replace(/^refs\/(heads|remotes)\//, '') || 'a local branch'}`,
  });
  const chunks = log.stdout.split('\u0001').slice(1);
  for (const chunk of chunks) {
    const rem = remaining(); // the tasks still undecided when this record began
    if (rem.length === 0) break;
    const nl = chunk.indexOf('\n');
    const header = (nl === -1 ? chunk : chunk.slice(0, nl)).split('\t');
    const sha = header[0];
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(sha || '') || !/^\d+$/.test(header[1] || '')) {
      failRest({ found: true, ref: 'unreadable-commit', detail: 'a commit could not be read' });
      break;
    }
    const ct = Number(header[1]);
    const lines = (nl === -1 ? '' : chunk.slice(nl + 1)).split('\n').filter((l) => l !== '').map((l) => l.split('\t'));
    const follows = (p) => ct >= p.sinceSec;
    const isClaimOf = (p, parts) => parts[0] === 'R100' && parts.length === 3 && parts[2] === `plans/in-progress/${p.plan}.md`
      && parts[1].startsWith('plans/') && parts[1].endsWith(`/${p.plan}.md`) && parts[1] !== parts[2];

    // 2. No lines left. A merge (two parents or more) changes nothing on its first-parent line: the work
    // it joins is printed as records of its own, so it is work for nobody. Any other record with no
    // lines is unreadable: work for every remaining task it follows.
    if (lines.length === 0) {
      if ((header[3] || '').split(' ').filter(Boolean).length >= 2) continue;
      for (const p of rem) if (follows(p)) out[p.id] = workFor(sha, header[2]);
      continue;
    }
    // 3. Only claims (of any candidate of this check, decided or not): work for nobody.
    if (lines.every((parts) => pending.some((p) => isClaimOf(p, parts)))) continue;
    // 4. Per task: its own claim line removed, then any path left tied to it is its work.
    for (const p of rem) {
      if (!follows(p)) continue;
      const left = lines.filter((parts) => !isClaimOf(p, parts)).flatMap((parts) => parts.slice(1));
      if (left.some((x) => p.touches(x))) out[p.id] = workFor(sha, header[2]);
    }
    // 5. Tied to no task at all (whatever the time test said): fail closed for every task it follows.
    const rest = lines.filter((parts) => !pending.some((p) => isClaimOf(p, parts))).flatMap((parts) => parts.slice(1));
    if (!pending.some((p) => rest.some((x) => p.touches(x)))) {
      for (const p of rem) {
        if (follows(p)) out[p.id] = { ...workFor(sha, header[2]), detail: 'a commit could not be tied to one build' };
      }
    }
  }
  if (remaining().length === 0) return out;

  // Calls 4…, uncommitted changes in each worktree.
  for (const { path: wt } of worktrees) {
    const left = remaining();
    if (left.length === 0) break;
    const fileSpecs = Array.from(new Set(left.flatMap((p) => p.fileSpecs)));
    if (fileSpecs.length === 0) continue;
    const cwd = path.join(wt, prefix);
    if (!safeFs.existsSync(cwd)) { failRest(failed('git-failed', 'a worktree folder is missing')); break; }
    const st = runGit(['--no-optional-locks', '-c', 'core.fsmonitor=false', 'status', '--porcelain', '-z', '--untracked-files=all', '--', ...fileSpecs], cwd);
    if (st.failed) { failRest(st.failed); break; }
    const fields = st.stdout.split('\0');
    const changed = [];
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (f.length < 4) continue;
      changed.push(f.slice(3));
      if (/[RC]/.test(f.slice(0, 2)) && i + 1 < fields.length) changed.push(fields[++i]);
    }
    const rel = changed.map((x) => (prefix && x.startsWith(prefix) ? x.slice(prefix.length) : x));
    for (const p of left) {
      if (rel.some((x) => p.matchesFile(x))) {
        out[p.id] = { found: true, ref: 'uncommitted', detail: `uncommitted changes in ${stripCtl(wt).slice(0, 120)}` };
      }
    }
  }

  for (const p of remaining()) out[p.id] = { found: false };
  return out;
}

// ── preview and apply ────────────────────────────────────────────────────────────────

/**
 * What a sweep would do — in memory only. NO task-registry write, NO plan move, NO cleanup-log
 * write. The dashboard, `menu task sweep` and `applySweep` all call this one function.
 *
 * @param {string} root
 * @param {{ liveAgentIds?: string[], now?: number }} [opts]
 * @returns {{ builds: object[], counts: object, report: object, liveHash: string }}
 */
function previewSweep(root, opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  let reg;
  try {
    reg = taskRegistry.load(root);
  } catch {
    return { builds: [], counts: { ...ZERO_COUNTS }, report: emptyReport({ reason: 'load-failed' }), liveHash: liveFingerprint(opts.liveAgentIds) };
  }
  const inProgress = readPlans(path.join(getPlansDir(root), 'in-progress')).map((p) => p.name);
  const first = sweepVerdict(reg, { inProgress, liveAgentIds: opts.liveAgentIds, now });
  const back = first.builds.filter((b) => b.group === 'would-go-back');
  if (back.length === 0) return first;
  const wanted = new Set(back.map((b) => b.id));
  const work = findWorkAfterClaim(root, reg.tasks.filter((t) => wanted.has(t.id)));
  return sweepVerdict(reg, { inProgress, liveAgentIds: opts.liveAgentIds, now, work });
}

/**
 * Apply a sweep. `confirm` names the plans the human confirmed (with the token the preview
 * printed); `confirm: []` names nothing — only the task changes that move no plan are applied.
 *
 * @param {string} root
 * @param {{ confirm?: Array<{plan:string, token:string}>, liveAgentIds?: string[], now?: number, by?: string }} [opts]
 * @returns {object} `{ ok:false, stale:true, preview }` when a confirmation no longer matches (nothing
 *   written), else `{ ok:true, stale:false, preview, report, moved, notMoved, unnamed, waiting }`.
 */
function applySweep(root, opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const liveAgentIds = opts.liveAgentIds;
  const confirm = Array.isArray(opts.confirm) ? opts.confirm : [];
  const preview = previewSweep(root, { liveAgentIds, now });

  for (const c of confirm) {
    const rows = preview.builds.filter((b) => b.plan === c.plan);
    if (rows.length !== 1 || rows[0].token !== c.token) return { ok: false, stale: true, preview };
  }
  const named = new Set(confirm.map((c) => c.plan));
  const eligible = preview.builds.filter((b) => b.group === 'would-go-back' && named.has(b.plan));
  const blocked = eligible.filter((b) => safeFs.existsSync(path.join(root, 'plans', 'todo', `${b.plan}.md`)));
  const go = eligible.filter((b) => !blocked.includes(b));

  let before = null;
  try { before = taskRegistry.load(root); } catch { before = null; }

  const { report } = taskReconcile.reconcileState(root, {
    liveAgentIds, now, onePass: true,
    releaseBuilds: go.filter((b) => b.status === 'running').map((b) => b.id),
  });

  // What may move: a task this reconcile judged dead, or an already-dead one whose release was saved.
  const released = go.filter((b) => (b.status === 'orphaned'
    ? !(report.saveFailed && b.staleMarker)
    : !report.saveFailed && report.orphaned.includes(b.id)));
  const requester = opts.by ? `${stripCtl(opts.by).slice(0, 80)} (declared, not verified)` : 'not declared';
  const log = new Map(released.map((b) => [b.plan, {
    by: 'menu task sweep',
    code: b.code,
    token: b.token,
    liveCount: liveAgentIds == null ? null : new Set(Array.from(liveAgentIds, String)).size,
    liveSha256: preview.liveHash,
    requester,
  }]));
  const moved = released.length > 0
    ? recoverOrphanedPlans(root, { now, released: released.map((b) => ({ id: b.id, plan: b.plan })), log })
    : { recovered: [], surfaced: [], skipped: [] };

  // A move that failed after the task was marked dead: put the task back as it was.
  const restoreNote = new Map();
  for (const sk of moved.skipped) {
    const row = go.find((b) => b.plan === sk.plan);
    if (!row || row.status !== 'running' || !String(sk.reason).startsWith('move failed:')) continue;
    if (!before) { restoreNote.set(sk.plan, ' and its task could not be restored: its record could not be read before the sweep'); continue; }
    const old = before.tasks.find((t) => t.id === row.id);
    if (!old) continue;
    try {
      taskRegistry.withRegistry(root, (reg, ctx) => {
        const i = reg.tasks.findIndex((t) => t.id === row.id);
        const cur = i === -1 ? null : reg.tasks[i];
        if (cur && cur.status === 'orphaned' && cur.ts && cur.ts.done === new Date(now).toISOString()) {
          reg.tasks[i] = old;
        } else {
          ctx.abort();
        }
      });
    } catch (err) {
      restoreNote.set(sk.plan, ` and its task could not be restored: ${firstLine(err && err.message)}`);
    }
  }

  const recoveredPlans = new Set(moved.recovered.map((m) => m.plan));
  const notMoved = [];
  for (const b of preview.builds) {
    if (!named.has(b.plan) || recoveredPlans.has(b.plan)) continue;
    let reason;
    if (b.group !== 'would-go-back') reason = b.reason;
    else if (blocked.includes(b)) reason = 'a plan of the same name already waits in the build queue';
    else if ((b.status === 'running' || (b.status === 'orphaned' && b.staleMarker)) && report.saveFailed) reason = 'the task changes could not be saved';
    else if (b.status === 'running' && !report.orphaned.includes(b.id)) reason = 'judged alive again when the sweep was applied';
    else {
      const sk = moved.skipped.find((x) => x.plan === b.plan) || moved.surfaced.find((x) => x.plan === b.plan);
      reason = (sk ? sk.reason : 'its plan is no longer being built here') + (restoreNote.get(b.plan) || '');
    }
    notMoved.push({ plan: b.plan, id: b.id, reason });
  }
  const unnamed = preview.builds.filter((b) => b.group === 'would-go-back' && !named.has(b.plan)).length;
  return {
    ok: true, stale: false, preview, report, moved: moved.recovered, notMoved, unnamed,
    waiting: preview.counts.buildsBack - moved.recovered.length,
  };
}

module.exports = { recoverOrphanedPlans, sweepVerdict, previewSweep, applySweep, isSafePlan };
