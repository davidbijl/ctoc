---
title: "Opening the dashboard changes nothing; a dead build goes back to the build queue only when the human names it in `menu task sweep`"
type: implementation
created: 2026-10-18
priority: high
effort: medium
parent_plan: real-projects-do-not-stall-on-the-menu
depends_on: real-projects-do-not-stall-on-the-menu-s1-settings-route
files:
  # THE SLICE'S OWN FILES — the work surface (fifteen; far over the ~1–3 budget, see decision S2-1).
  - src/lib/task-reconcile.js
  - src/lib/plan-recovery.js
  - src/lib/menu-screens.js
  - src/tabs/tools.js
  - src/commands/start.md
  - docs/ENFORCEMENT.md
  - tests/the-dashboard-never-sends-live-work-back.test.js
  - tests/w10-live-agent-reconcile.test.js
  - tests/plan-recovery-wiring.test.js
  - tests/dashboard-wedge-reports.test.js
  - tests/dashboard-wedge-fault.test.js
  - tests/dashboard-reconcile-failure.test.js
  - tests/menu-screens-coverage.test.js
  - tests/tab-modules.test.js
  - tests/menu-protocol.test.js
  # RATCHET FILES — the new tests/*.test.js moves the documented test-file count
  # (src/lib/documented-counts.js at implementation → todo; tests/readme-numbers.test.js for README.md).
  - "CLAUDE.md"
  - README.md
---

# Opening the dashboard changes nothing; a dead build goes back to the build queue only when the human names it in `menu task sweep`

Slice 2 of 2 of `plans/implementation/real-projects-do-not-stall-on-the-menu.md`. It builds
Story 2: scenarios 2.1–2.12 and decisions 5–11, 18–25 and 29.

- **It depends on slice 1** (`real-projects-do-not-stall-on-the-menu-s1-settings-route`).
  Both add a branch to `src/lib/menu-screens.js` `route`. Both edit `src/commands/start.md`,
  `docs/ENFORCEMENT.md`, `CLAUDE.md` and `README.md`. So they build one after the other. Slice
  1's counts (136 modules, 575 test files) are this slice's starting point.
- **Sources.** Every statement about this repository was read in this worktree
  (origin/main 6.14.130) at the file and line named. Lines read from the unpushed local `main`
  come from the main checkout's working tree and say so. Git and Node behaviour that was not
  read in source is labelled *believed*, and each such item has a test below that fails if it
  is wrong.
- **Nothing was run.** This planner held read, search, write and edit tools only.

## The bug this slice fixes first

On origin/main, `menu task start <id>` without `--agent-id` records the task id as the agent id
(`src/lib/menu-screens.js` line 2292: `agentTaskId: p.agentId || id`). That placeholder counts
as a recorded id (`src/lib/task-reconcile.js` line 323: `t.agentTaskId != null`).

1. When the session passes `--live-agent-ids` (start.md lines 185–202 require it), the build's
   "id" is absent from every live list.
2. Once the 60-second grace ends (`task-reconcile.js` lines 92, 356–361), the render's reconcile
   orphans it as **confirmed dead**. It leaves `result` untouched, so no `staleness` marker is
   written.
3. In the **same render**, `planRecovery.recoverOrphanedPlans` (menu-screens line 603) reads
   that orphan as released (`plan-recovery.js` lines 189–203) and moves the plan from
   `in-progress/` to `todo/`.

start.md's own recipes start tasks without `--agent-id`: lines 119 and 130, the classify
paragraph at line 355, and Rule 12 at line 423. So opening the dashboard one minute after a
build starts throws away a live build. Case **B0** below reproduces this exactly, and it is the
FIRST test written in Step 8.

## What changes, in one paragraph

- **The dashboard writes nothing.** It calls one new preview, which computes in memory what a
  sweep would do, and renders one line counting it.
- **The sweep moves things only on the human's word.** `menu task sweep` shows each build with
  its reason. `menu task sweep --confirm <plan>@<token>,…` applies it: named plans move only if
  they are still eligible, and the task changes that move no plan are applied.
  `menu task sweep --confirm none` applies only those task changes.
- **Repair state is a sweep that names nothing.** The Doctor screen's "Repair state" key runs
  it.
- **Agent ids are honest.** A start without `--agent-id` records no agent id. An id equal to
  the task id is read as unknown. A stamp must be a real id.
- **start.md's recipes stamp the harness id** after every launch.

## Implementation Details

### Dependency Graph

```
src/commands/start.js main() ─▶ menu-screens.route()
   ├─ 'menu' | 'dashboard' | []  ─▶ dashboardPipeline ─▶ buildDashboardTable ─▶ planRecovery.previewSweep   (reads only)
   └─ 'menu' 'task' 'sweep' …    ─▶ taskCommand(…, opts) ─▶ taskSweep ─▶ planRecovery.previewSweep | planRecovery.applySweep
src/tabs/tools.js Doctor key '2' ─▶ planRecovery.applySweep(root, { confirm: [] })

plan-recovery.previewSweep ─▶ taskRegistry.load, state.readPlans, sweepVerdict (pure), findWorkAfterClaim (git, lazy child_process)
plan-recovery.sweepVerdict  ─▶ taskReconcile.reconcile ×2 (pure), taskRegistry.nextRunnable (pure), taskReconcile.applyQuarantine (pure), crypto
plan-recovery.applySweep    ─▶ previewSweep, taskReconcile.reconcileState (writes the registry), recoverOrphanedPlans (moves plans, appends cleanup log)
menu-screens.taskTransition ─▶ taskReconcile.isRealAgentId
```

No new cycle.

- `plan-recovery.js` already requires `./actions`, `./state`, `./task-registry` and
  `./project-root` (lines 65–70).
- It gains `./task-reconcile` and `crypto`. `task-reconcile.js` requires only `./safe-fs`,
  `./task-registry` and `./plan-coverage` (lines 82–87).
- `tools.js` drops its `../lib/task-reconcile` import (line 17), and with it every `src/tabs`
  import of that module: a search for `task-reconcile` over `src/tabs` matched 1 file.

### File Specifications

#### File: `src/lib/task-reconcile.js`
**Action:** MODIFY
**Purpose:** Read an old placeholder as "unknown". Give the sweep two options: hold unnamed
builds, and release a long-dead task in the same pass.
**Change Type:** new-function + modify-existing

- **Add** `isRealAgentId(agentId: unknown, taskId: string)` → `boolean`, after `cloneTask` (line 217):

  ```js
  /**
   * A real agent id: a non-empty string that is not the task's own id. An id equal to the task id is
   * the placeholder `menu task start` recorded up to 6.14.130 — read as UNKNOWN, never as evidence
   * of death (owner, 2026-10-18). Pure; the one encoding the reconcile, the sweep and `menu task
   * start` share.
   */
  function isRealAgentId(agentId, taskId) {
    return typeof agentId === 'string' && agentId !== '' && agentId !== taskId;
  }
  ```

- **Modify** line 323 and line 429. `const hasRecordedId = t.agentTaskId != null;` becomes `const
  hasRecordedId = isRealAgentId(t.agentTaskId, t.id);` in both places.
- **Add option** `opts.releaseBuilds` (`Array<string> | Set<string> | null | undefined`).
  Normalise it once, beside `live` (line 303): `const releaseBuilds = opts.releaseBuilds == null
  ? null : new Set(Array.from(opts.releaseBuilds, String));`.
  - In the running branch, compute `const held = releaseBuilds !== null && t.status === 'running'
    && t.kind === 'implement' && t.plan != null && !releaseBuilds.has(t.id);`.
  - Change line 356 from `} else if (hasLive) {` to `} else if (hasLive || held) {`.
  - A held build is never terminated, which is decisions 19 and 29.
  - When the option is absent, behaviour is byte-for-byte today's, so every test that calls
    `reconcile` or `reconcileState` directly keeps its contract. That includes
    `tests/task-reconcile*.test.js`, `tests/scheduler-enforced.test.js` and
    `tests/promote-quarantine-parity.test.js`.
- **Add option** `opts.onePass` (boolean). Inside the `if (stalenessBased)` block (lines 377–400):
  - compute `const presumed = opts.onePass === true && (!Number.isFinite(startedMs) || ageMs >=
    kindThreshold * presumedDeadMultiple);`;
  - when `presumed`, set `t.result` to the same `presumed-dead` object the across-passes branch
    writes (lines 442–447), and push `t.id` to `report.quarantineReleased`;
  - otherwise keep the `staleness` marker.
  - `report.stalenessOrphaned` is pushed exactly as today in both cases, so the one-pass
    deferral of dependents (lines 474–491) still sees the task.

  This is decision 23, the reconcile and the release composed in one pass, without calling
  `reconcile` twice. A second pass would fail a dependent that the first pass deferred.
- **JSDoc:** add both options to the `reconcile` options list (lines 226–247).
- **Module header** (lines 1–78): add one bullet naming the two sweep options and the
  placeholder rule.
- **Export** `isRealAgentId` (line 796). Its live callers are `menu-screens.taskTransition` and
  `plan-recovery.sweepVerdict`.
- **No other line changes.** `reconcileState` passes `opts` through to `reconcile` (line 589)
  unchanged. This file stays a `cache-freshness` whitelist entry (that test's line 578): it
  gains no `movePlan` and no `invalidate`.

#### File: `src/lib/plan-recovery.js`
**Action:** MODIFY
**Purpose:** Hold the one sweep verdict (pure), the preview, the git work check and the apply.
`recoverOrphanedPlans` stays as the plan mover, now limited to the named plans.
**Change Type:** new-function + modify-existing

**Requires added:** `const crypto = require('crypto');` and `const taskReconcile =
require('./task-reconcile');`. `child_process` is required lazily inside `findWorkAfterClaim`
only (the pattern at `stale-detector.js` line 501).

**Modify `recoverOrphanedPlans(root, opts = {})`.**

- Add `opts.plans` (`Set<string> | undefined`). When it is present, skip a task whose `plan` is
  not in it, as the first statement of the loop (line 176).
- Update the JSDoc type to `{ now?: number, plans?: Set<string> }`.
- When `plans` is absent the function is unchanged. It keeps its liveness veto (line 184), its
  staleness surface (line 190) and its cleanup-log entry (`appendCleanupLog`, line 199).
- Update the module header (lines 1–63): recovery no longer runs on the render. It runs only in
  a confirmed sweep, for the plans the human named. Replace the "SUPERSEDES the forward sweep …
  runs on the menu render" paragraph (lines 49–55) to say so.

**Add `sweepVerdict(registry, input = {})` → `SweepVerdict`. Exported, pure, the one verdict
(decision 20).** It does no file or process I/O. Its input is `{ inProgress: string[],
liveAgentIds?: (string[]|null), now?: number, work?: Object<string, Work> }`.

The two reconcile passes:

1. `const base = { liveAgentIds: input.liveAgentIds, now, onePass: true };`
2. `const whatIf = taskReconcile.reconcile(registry, base);` gives every task's fate if every
   dead build were named.
3. `const held = taskReconcile.reconcile(registry, { ...base, releaseBuilds: [] });` gives what
   a sweep naming nothing changes.
4. `candidates = taskRegistry.nextRunnable(held.tasks)`. A throw or a non-array gives `[]`,
   mirroring `reconcileState` lines 632–642.
5. `guard = taskReconcile.applyQuarantine(held.tasks, candidates)`, then `report = {
   ...held.report, quarantined: guard.quarantined }`, plus `quarantineFaulted` when `guard.faulted`.

The rows. A **build** is a task with `kind === 'implement'` and `plan != null`. Rows come from
the INPUT registry, in registry order:

- **(R1)** every `running` build;
- **(R2)** every `orphaned` build whose `plan` is in `inProgress`, has no non-terminal implement
  task (`taskRegistry.findActivePlanTask(registry, plan, 'implement')` is falsy), and is the
  first orphan seen for that plan.

Row fields:

- `id` (the task id), `plan`, `status`, and `agentTaskId` (the recorded value, or `null`);
- `realId = isRealAgentId(t.agentTaskId, t.id)`;
- `ageMin`, rounded down from `ts.started`, or `null` when unparseable;
- `bound = (DEFAULT_STALE_MS_BY_KIND.implement × DEFAULT_PRESUMED_DEAD_MULTIPLE) / 60 000`
  minutes (240; both constants are exported by `task-reconcile.js`, lines 802–807);
- `unknown`, which is one of:
  - `'no agent id recorded'` when `!realId`;
  - `'no live agent list was given'` when the list is null;
  - `` `agent ${id} is not in the live list` `` otherwise;
- `o = whatIf` task with the same id.

Each row is put in exactly one group, with a code and a reason:

| Condition (R1 unless stated) | `group` | `code` | `reason` |
|---|---|---|---|
| `o.status === 'running'` and the live list holds its real id | `never-moved` | `alive` | `the builder is alive (agent <id> is in the live list)` |
| `o.status === 'running'`, younger than the 60 s grace | `not-yet` | `young` | `started under a minute ago` |
| `o.status === 'running'`, otherwise | `not-yet` | `under-floor` | `<unknown>; <age> min old; it can be named once it is <bound> min old` |
| `o.status === 'orphaned'`, `o.result.orphanReason === 'staleness'` (R1 or R2) | `not-yet` | `files-held` | `<unknown>; <age> min old; its files stay held until it is <bound> min old` |
| `o` released (R1: a confirmed-dead orphan, or `presumed-dead`), plan not in `inProgress` | `never-moved` | `not-here` | `its plan is not among the plans being built in this checkout` |
| released, `input.work[id]` undefined | `would-go-back` | `confirmed-dead` / `presumed-dead` / `already-dead` (R2) | `agent <id> is not in the live list` / `<unknown>; <age> min old, past the <bound>-minute bound` / `its task was already marked dead` |
| released, `work.found === true`, `work.gitFailed !== true` | `never-moved` | `work-found` | `work was found after the claim: <work.detail>` |
| released, `work.gitFailed === true` | `never-moved` | `git-failed` | `git could not show whether work came after the claim: <work.detail>` |
| released, `work.found === false` | `would-go-back` | as above | as above |

- A row is `confirmed-dead` when the live list is present, `realId` is true, the id is absent
  from the list, and the task is past the grace.
- The age is shown as "unknown" when `ageMin` is `null`, never `NaN`.
- Rows with codes `work-found`, `git-failed` or `not-here` get `wayOut: true`. Their screen line
  names `menu task complete <id>` (send the work that was found to review) and `menu task fail
  <id>` (give it up), as decision 25 says.
- **The token.** `token = crypto.createHash('sha256').update(JSON.stringify([t.id, t.plan,
  t.status, t.agentTaskId ?? null, group, code, work ? (work.ref || '') : ''])).digest('hex').slice(0,
  12)`. It is the row's fingerprint (decision 6), and it changes only when what the preview
  showed about that plan changes. Time inside one group never changes it.
- **Counts** (all derived from `rows` and `report`):
  - `buildsBack` is the number of `would-go-back` rows;
  - `deadHeld` is the number of `never-moved` rows whose code is not `alive`;
  - `otherDead` is `report.orphaned.length + report.cancelled.length`;
  - `neverRun` is `report.unsatisfiable.length`;
  - `released` counts the ids in `report.quarantineReleased` that are not in `report.orphaned`;
  - `old` is `report.swept.length`;
  - `pending = buildsBack + otherDead + neverRun + released + old`.

`SweepVerdict` is `{ builds: Row[], counts, report }`.

**Add `findWorkAfterClaim(root, task)` → `Work`, internal and not exported (decisions 7 and
18).** `Work` is `{ found: boolean, gitFailed?: boolean, ref?: string, detail?: string }`.

Before any git call:

- `startedMs = Date.parse(task.ts && task.ts.started)`. When it is not finite, the result is
  `{ found: true, gitFailed: true, ref: 'no-start', detail: 'the task has no start time' }`.
- The task's `plan` must match `/^[A-Za-z0-9_][A-Za-z0-9._-]*$/`, otherwise the result is
  `found: true, gitFailed: true` (fail closed).

The pathspecs:

- One per `task.touches` entry: `':(glob)' + touch.replace(/\\/g, '/')`. A touch that is
  empty, absolute (or a drive letter), holds a `..` segment, starts with `:` or holds a control
  character (`tui.stripCtl(x) !== x`) is not passed. It gives `{ found: true, gitFailed: true,
  ref: 'unreadable-file', detail: 'a declared file cannot be checked' }` (fail closed).
- Every pathspec carries the `:(glob)` magic, and a touch starting with `:` is refused before
  git runs. So the only magic that reaches git is this module's own `:(glob)` prefix. Whether
  git would read a second magic after it was not checked; it cannot arise.
- Plus one pathspec for the plan's own file at any stage: `:(glob)plans/*/<plan>.md`.

The git call:

- `sinceSec = Math.floor(startedMs / 1000)`.
- `r = require('child_process').spawnSync('git', ['log', '--branches', '--full-history', '-M',
  '--name-status', '--no-color', '--since=' + new Date((sinceSec - 86400) * 1000).toISOString(),
  '--format=%x01%H%x09%ct%x09%S', '--', ...specs], { cwd: root, encoding: 'utf8', timeout:
  10_000, maxBuffer: 64 * 1024 * 1024, windowsHide: true, shell: false })`.
- `--branches` looks at every local branch (decision 18). Builders' worktree branches share the
  repository's branches.
- `--since` is a traversal bound with one day of slack against clock skew. The exact test is
  made in code, below.
- `r.error`, or `r.status !== 0`, gives `{ found: true, gitFailed: true, ref: 'git-failed',
  detail: <first line of r.stderr or r.error.message, after stripCtl, capped at 120> }`. A
  timeout and an output overflow fall here too. Decision 7: a git failure counts as work found.

Reading the output:

- Split `r.stdout` on `'\u0001'`. Each record is a header line `<sha>\t<ct>\t<source>` followed
  by name-status lines.
- A record with `Number(ct) < sinceSec` is skipped. A commit in the same second as the start
  counts as after it, which is the safe direction.
- The record is skipped when it is the plan sync's claim commit: exactly one name-status line,
  `R100\t<from>\t<to>`, with `to === 'plans/in-progress/<plan>.md'`, `from` starting `plans/`
  and ending `/<plan>.md`, and `from !== to`.

  Read: `startExecution` is a pure rename (`actions.js` lines 997–1000), and `movePlan` renames
  without touching the bytes (lines 95–127). So the claim commits as a 100% rename. Case B8c
  shows it.
- Any other record, a merge with no name-status lines included, returns `{ found: true, ref:
  sha, detail: 'commit <sha first 12> on <source without refs/heads/>' }`. An empty source
  shows as "a local branch".

  `%S` prints the ref through which the commit was reached (*believed*: git ≥ 2.21; if it does
  not expand, the detail shows the literal and case B8b's branch assertion fails).
- No match gives `{ found: false }`.

**Add `previewSweep(root, opts = {})` → `SweepVerdict`. Exported, writes nothing.**

- `now = Number.isFinite(opts.now) ? opts.now : Date.now()`.
- `reg = taskRegistry.load(root)` inside a try. A throw returns `{ builds: [], counts: zero
  counts, report: { …empty report arrays…, corrupt: { reason: 'load-failed' } } }`. That is
  what keeps `tests/dashboard-survives-unreadable-registry.test.js` cases 4–5 (the
  `could not be read (load-failed)` line) passing unchanged.
- `inProgress = readPlans(path.join(getPlansDir(root), 'in-progress')).map((p) => p.name)`.
- `first = sweepVerdict(reg, { inProgress, liveAgentIds: opts.liveAgentIds, now })`.
- For each `would-go-back` row, set `work[row.id] = findWorkAfterClaim(root, <the registry task>)`.
- Return `first` when `work` is empty, else `sweepVerdict(reg, { …, work })`. Both calls use the
  same `now`.
- The dashboard, `menu task sweep` and `applySweep` all call this one function, so their counts
  cannot disagree (scenario 2.2).

**Add `applySweep(root, opts)` → `SweepResult`. Exported.** `opts = { confirm: Array<{ plan:
string, token: string }>, liveAgentIds?: string[], now?: number }`. `confirm: []` names nothing.

1. Compute `preview = previewSweep(root, { liveAgentIds, now })`.
2. **The staleness check.** For each confirmed item, find the row whose `plan` matches. If there
   is none, or its `token` differs, return `{ ok: false, stale: true, preview }` with no write
   at all (decision 6, scenario 2.9).
3. Let `named` be the set of confirmed plans. `eligible` is the `would-go-back` rows in it.
4. `blocked` is the eligible rows where `plans/todo/<plan>.md` already exists. `movePlan` would
   refuse to overwrite it (`actions.js` lines 120–125), so those builds are kept off the registry
   change rather than marked dead with no move. `go` is the rest of `eligible`.
5. `const { report } = taskReconcile.reconcileState(root, { liveAgentIds, now, onePass: true,
   releaseBuilds: go.filter((r) => r.status === 'running').map((r) => r.id) })`.

   This applies the task changes that move no plan, plus the dead-marking of the named eligible
   builds. Inside its compare-and-swap, `reconcile` judges each named build again by the same
   rules, so a build stamped alive in between is not marked dead (decision 19). It also runs the
   temporary-file sweep (`task-reconcile.js` lines 620–625), which now happens only here and in
   the Doctor key, never at render.
6. `moved = go.length ? recoverOrphanedPlans(root, { now, plans: new Set(go.map((r) => r.plan))
   }) : empty`. Each named, released build's plan moves `in-progress/` → `todo/` with one
   cleanup-log entry.
7. Return `{ ok: true, stale: false, preview, report, moved: moved.recovered, notMoved: [...named
   rows not in eligible (with their reason), ...blocked (reason: 'a plan of the same name already
   waits in the build queue'), ...moved.skipped, ...moved.surfaced], unnamed: <count of
   would-go-back rows not named>, waiting: preview.counts.buildsBack - moved.recovered.length }`.

**Exports become:** `{ recoverOrphanedPlans, sweepVerdict, previewSweep, applySweep }`.

- `sweepVerdict` has an intra-module caller, `previewSweep`. Per the definition in
  `.ctoc/export-reachability-baseline.json`, that counts as live.
- `previewSweep` is called by `menu-screens`.
- `applySweep` is called by `menu-screens` and `tools.js`.
- `recoverOrphanedPlans` is called by `applySweep`, intra-module.
- `findWorkAfterClaim` is not exported.

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** A read-only dashboard, the `menu task sweep` route, and honest agent ids.
**Change Type:** modify-existing + new functions (none exported)

**`buildDashboardTable` (lines 546–643).** Replace the reconcile block (566–582) and the recovery
block (583–606) with:

```js
  // The dashboard WRITES NOTHING (owner, 2026-10-18): no task-registry write, no plan move. It
  // previews what `menu task sweep` would do (src/lib/plan-recovery.js previewSweep) and says so.
  /** @type {object|null} */ let preview = null;
  /** @type {string|null} */ let previewThrew = null;
  try {
    preview = planRecovery.previewSweep(root, { liveAgentIds: opts.liveAgentIds });
  } catch (err) {
    previewThrew = (err && err.message) ? String(err.message) : String(err);
  }
```

- Keep lines 607–618 unchanged (the second registry read, and the TASKS block).
- Then: `out += renderReconcileHealth(previewThrew, preview && preview.report);` then `out +=
  renderSweepLine(preview);` then `out += renderWedgeReports(preview && preview.report);`.
- Delete the orphan line (lines 627–632) and the `renderRecoveryReport` call (line 643).
- Rewrite the long comment (546–565 and 583–597) to say: the preview, the one line, why nothing
  is written, and that `menu task sweep` is the one route that applies it.

**Delete `renderRecoveryReport`** (lines 440–492). Its two lines described plans moved or
surfaced at render, which no longer happens. A preview failure is rendered by
`renderReconcileHealth`'s threw line, because it is one call.

**`renderReconcileHealth`** (lines 223–300).

- Delete the `report.saveFailed` branch (lines 293–297) and its two mentions in the comment
  (lines 239–247). The dashboard has no save to fail.
- The threw line and the corrupt line stay word for word.

**`renderWedgeReports`** (lines 320–438). Three lines change their words, because they described
changes made at render and must now say what a sweep would do (decision 24):

- (3) `⛔ N task(s) can NEVER run — the scheduler failed them` becomes `⛔ N task(s) can NEVER
  run — a sweep marks ${n === 1 ? 'it' : 'them'} failed · view: tasks`.
- (4) `⊙ N task(s) held one pass — every dead dependency was orphaned on age alone and may still
  finish` becomes `⊙ N task(s) held one pass by a sweep — every dead dependency would be marked
  dead on age alone and may still finish · view: tasks`.
- (5) `⚠ N task(s) orphaned on age alone — the agent was never confirmed dead and may still be
  alive` becomes `⚠ N task(s) would be marked dead on age alone — the agent was never confirmed
  dead and may still be alive · view: tasks`. Its detail line is unchanged.
- The fault line (1) and the held line (2) are unchanged. The preview computes the guard (above),
  and "held this pass" describes the scheduling state, not a write.
- The header comment changes "written by reconcileState" to "computed by the sweep preview".

**Add `renderSweepLine(preview)`** → `string`, beside `renderWedgeReports`.

- It returns `''` when there is no preview, or when `counts.pending + counts.deadHeld === 0`.
  That keeps a clean project's dashboard byte-identical.
- Otherwise it returns one line, `  ⚠ <parts joined by ', '>: review them with \`menu task
  sweep\`\n`. The parts, each present only when its count is above 0, in this order, with
  singular and plural spelled out:
  - `<b> build(s) would go back to the build queue when you name it/them`
  - `<d> dead build(s) cannot go back on its/their own (work was found after the claim, or it could not be checked)`
  - `<o> other task(s) look(s) dead`
  - `<u> task(s) can never run`
  - `the files of <r> dead task(s) would be released`
  - `<w> old task(s) would leave the view`

**`taskTransition`** (lines 2208–2328). Keep the edits to a few lines, so the merge into local
main stays small (see "Merge notes").

- **Insert,** after the cancel block (after line 2243, before `return taskRegistry.withRegistry`):

  ```js
  // An agent id is the launched agent's own (owner, 2026-10-18): never empty, never the task id.
  if (kind === 'start' && p.agentId !== undefined && !taskReconcile.isRealAgentId(p.agentId, id)) {
    return { ok: false, refused: true, taskId: id, reason: 'agent-id-not-real',
      text: `Task ${stripCtl(String(id)).slice(0, 40)} NOT started — --agent-id must be the launched agent's own id: not empty and not the task id. Nothing was changed.` };
  }
  ```

- **Line 2253:** `task.agentTaskId == null` becomes `!taskReconcile.isRealAgentId(task.agentTaskId,
  task.id)`. A stamp may now replace an empty id or an old placeholder (decision 21).
- **Line 2292:** `agentTaskId: p.agentId || id` becomes `agentTaskId: p.agentId || null`
  (decision 8).
- Comments: lines 2068–2071 in `parseTaskArgs` ("Defaults to the task id downstream when
  omitted") and lines 2289–2291 become "Records no agent id when omitted; the session stamps the
  harness id after the launch".
- `parseTaskArgs` itself is NOT changed: the hook reads it (`protect-records.js` lines 327–336).

**`taskCommand`** (line 2744).

- Its signature becomes `taskCommand(subArgs, projectPath, opts = {})`.
- Add `case 'sweep': return taskSweep(root, rest, opts.liveAgentIds);` after `case 'board'`.
- In `route` (line 2805): `return taskCommand(args.slice(2), projectPath, opts);`.

**Add `parseSweepArgs(words)`** → `{ ok: true, confirm: null | Array<{plan, token}> }` or
`{ ok: false, text }`. Its own parser.

- `[]` gives `confirm: null`, the preview.
- `['--confirm', 'none']` gives `confirm: []`.
- `['--confirm', list]` splits `list` on `,` into items of the form `<plan>@<token>`. Each `plan`
  must match `/^[A-Za-z0-9_][A-Za-z0-9._-]{0,199}$/` and each `token` `/^[0-9a-f]{12}$/`. The
  same plan with two different tokens is refused. Duplicates are merged.
- Anything else is refused with "`menu task sweep` takes nothing, `--confirm <plan>@<token>,…`
  from its preview, or `--confirm none`; nothing was changed." The offending word is shown after
  `stripCtl`, capped at 40.

**Add `taskSweep(root, words, liveAgentIds)`.**

- A parse refusal returns `{ ok: false, refused: true, text, ask: <◀ Back to dashboard>, actions }`.
- `confirm === null` returns `sweepScreen(root, planRecovery.previewSweep(root, { liveAgentIds
  }), '')`.
- Otherwise call `res = planRecovery.applySweep(root, { confirm, liveAgentIds })`:
  - when `res.stale`, return `sweepScreen(root, res.preview, 'Nothing changed: what you confirmed
    no longer matches the sweep (a build changed since). This is the sweep now; confirm again
    from it.')` with `ok: false, stale: true`;
  - else return `appliedScreen(root, res)`. Attach `promote: computePromote(loadReg(root)).promote`
    when it is non-empty, since freed slots can make queued tasks runnable. The session launches
    them as the COMPLETION recipe's step 3 says.

**Add `sweepScreen(root, preview, lead)`** → `{ ok: true, text, ask, actions, sweep: { builds:
[{ plan, id, group, code, reason, token }], counts } }`. The text holds:

- the title `Background tasks ▸ Sweep — a preview, nothing has changed`, a rule of 40 `─`, and
  `lead` when it is given;
- `Would go back to the build queue when you name them (<n>)`, then one line per row: `  •
  <name> — <reason> · name: <plan>@<token>`;
- `Never moved, even when named (<n>)`, its rows, and on `wayOut` rows the sentence `Way out:
  \`menu task complete <id>\` sends the work that was found to review; \`menu task fail <id>\`
  gives it up.`;
- `Not yet eligible (<n>)` and its rows;
- `Changes a sweep makes that move no plan: <the counts in the dashboard line's words>`, or
  `… : none`;
- a final `\n\n\n`.

Details:

- An empty group is left out.
- `<name>` is `planNameAt(path.join(root, 'plans', 'in-progress', plan + '.md'), plan)`, the
  existing helper at line 2700. It falls back to the slug.
- No raw stage folder name reaches the text (the vocabulary rule pinned by
  `tests/dashboard-says-the-moment.test.js` line 46).
- Options:
  - when some row would go back: `Send back the <n> plan(s) listed first` →
    `menu task sweep --confirm <plan>@<token>,…`;
  - when the counts other than builds are above 0: `Free only the other tasks` →
    `menu task sweep --confirm none`;
  - `◀ Back` → `dashboard`.
- The question is `Name the dead builds to send back to the build queue` when some row would go
  back, else `Nothing waits for your name`.

**Add `appliedScreen(root, res)`** → `{ ok: true, text, ask: <◀ Back>, actions }`. The text
holds, in order:

- `Background tasks ▸ Sweep applied`;
- `Sent back to the build queue (<n>): <name> — <reason>; …`;
- `Not moved (<n>): <name> — <reason>; …`;
- `<k> other build(s) that would go back were not named and stay exactly as they were.`;
- `Changes that moved no plan: <n> old task(s) left the view · <n> other task(s) marked dead,
  their slots freed · …`, from `res.report`;
- when `res.report.saveFailed` is set: `⛔ the task changes could NOT be saved:
  <stripCtl+cap 120>`.

**Module header** (lines 1–21): one Usage line, `node start.js menu task sweep [--confirm …] ->
taskSweep()`.

#### File: `src/tabs/tools.js`
**Action:** MODIFY
**Purpose:** "Repair state" is the sweep with no plan named (decision 22).

- Line 17: `const { reconcileState } = require('../lib/task-reconcile');` becomes `const
  planRecovery = require('../lib/plan-recovery');`.
- Lines 414–428 become:

  ```js
      // Repair state — the sweep with NO plan named (owner, 2026-10-18): it applies only the task
      // changes that move no plan; a dead build waits for the human to name it in `menu task sweep`.
      const res = planRecovery.applySweep(app.projectPath, { confirm: [] });
      const report = res.report;
      if (report.corrupt) {
        app.message = `Repair: could not read task state (${report.corrupt.reason})`;
      } else if (report.saveFailed) {
        app.message = `Repair: the task changes could NOT be saved (${stripCtl(String(report.saveFailed)).slice(0, 120)})`;
      } else {
        const fixed = ['orphaned', 'swept', 'cancelled', 'unsatisfiable'].reduce((n, k) => n + report[k].length, 0)
          + report.quarantineReleased.filter((id) => !report.orphaned.includes(id)).length;
        app.message = fixed > 0
          ? `✓ Repaired ${fixed} task-state issue${fixed === 1 ? '' : 's'}`
          : '✓ Task state healthy — nothing to repair';
        if (res.waiting > 0) {
          app.message += ` · ${res.waiting} build${res.waiting === 1 ? ' waits' : 's wait'} for you to name ${res.waiting === 1 ? 'it' : 'them'}: menu task sweep`;
        }
      }
  ```

- `stripCtl` is the file's existing sanitizer: confirm the binding name at Step 9. Use `tui`'s
  if the file imports it under another name.
- The label "2. Repair state" (line 85) is unchanged.

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** The session stamps the real id and sweeps only on the human's word (decision 8,
scenario 2.12).

- **Line 119 (WORK dispatch, step 2):** "launch `Agent(run_in_background)` with a self-contained
  brief, THEN `menu task start <taskId>`" becomes "… THEN `menu task start <taskId> --agent-id <the
  harness agent id>` (the id the launch returned; a start without it records no agent, and such a
  build goes back to the build queue only when the human names it in `menu task sweep`)".
- **Line 130 (COMPLETION, step 3):** "launch `Agent(run_in_background)` + `menu task start <id>`"
  becomes "launch `Agent(run_in_background)` + `menu task start <id> --agent-id <the harness agent
  id>`". The rest of the line is word for word, including "with the concurrent-edit guard
  applied", `nextRunnable`, "MINUS the candidates the guard held" and "never start a queued task
  the scheduler did not return". `tests/dashboard-reconcile-failure.test.js` case 13 pins those.
- **Lines 132–141:** the screens carrying `promote[]` gain `menu task sweep --confirm …`. The
  stamp sentence gains "or the task's own id that an older version recorded (read as no id)".
- **Lines 185–217, the ON-OPEN RECONCILE section,** are rewritten as `### ON-OPEN PREVIEW AND THE
  SWEEP`, with these points and no `node -e` program:
  - Opening the menu changes nothing: no task-registry write and no plan move (the owner's order
    of 2026-10-18).
  - The dashboard shows one line counting what a sweep would do, and names `menu task sweep`.
  - When the Task tool is available, pass the live harness agent-id list on every render and on
    both sweep commands, with the flag `start.js` parses: the existing line `node
    "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" --live-agent-ids <id1>,<id2>,<id3>`, kept as is.
  - The honesty rule stays word for word, including "An EMPTY list means \"I could not determine
    liveness\" — NOT \"nobody is alive\"". `tests/menu-task-wiring.test.js` lines 711–715 pin
    `--live-agent-ids` and "EMPTY list".
  - Without the flag a build is judged on its age alone, and can be named once it is twice its
    kind's floor old (240 minutes for a build).
  - `menu task sweep` lists every build in one of three groups with its reason, and the task
    changes that move no plan. It writes nothing.
  - `menu task sweep --confirm <plan>@<token>,…` is run only with the plans the HUMAN named in his
    own reply on that preview, each with the token the preview printed. Never on your own
    initiative, never naming a plan he did not name, always with the same `--live-agent-ids` as
    the preview. A changed plan returns the new preview: show it.
  - `--confirm none` applies only the task changes that move no plan, on his word too.
  - A sweep's `promote[]` is handled as in the COMPLETION recipe's step 3.
  - A project that is not a git repository can never send a dead build back: the work check
    cannot answer, and that counts as work found (decision 7). Such a build ends with `menu task
    complete <id>` or `menu task fail <id>`.
- **Line 355 (classify):** "then `menu task start <id>`" becomes "then `menu task start <id>
  --agent-id <the harness agent id>`".
- **Line 423 (Rule 12):** "dispatch `Agent(run_in_background)` + `menu task start`" becomes
  "dispatch `Agent(run_in_background)` + `menu task start <taskId> --agent-id <the harness agent
  id>`".
- **The Navigation Commands table** gains, after slice 1's `menu settings` row: `| \`menu task
  sweep\` · \`menu task sweep --confirm {plan}@{token},…\` · \`menu task sweep --confirm none\` |
  The sweep: a preview naming every build's group and reason, and the human's confirmation that
  sends named dead builds back to the build queue (the only route that does) |`.

#### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY

- **Line 375:** "| `menu`, `menu commands`, `dashboard` | the pipeline dashboard: task reconcile and
  orphan recovery (in-progress back to todo, not a human gate) |" becomes "| … | the pipeline
  dashboard: a read-only preview of `menu task sweep`; it writes nothing |".
- **The refused table** (lines 358–369) gains `| \`menu task sweep …\` | the sweep: marks tasks
  dead, frees slots and, on the human's named confirmation, moves plans back to the build queue;
  not on the background-agent list |`.

#### File: `tests/the-dashboard-never-sends-live-work-back.test.js`
**Action:** CREATE. It holds the cases in the Test Plan below.

#### Existing tests whose contract the owner replaced on 2026-10-18

Each case below is rewritten in place. Its first comment line reads "Contract replaced 2026-10-18
(owner): opening the dashboard writes nothing; a dead build moves only when the human names it in
`menu task sweep` — plan real-projects-do-not-stall-on-the-menu-s2", followed by what the old
case asserted. No assertion is loosened. Each new case asserts the new behaviour at least as
tightly.

- **`tests/w10-live-agent-reconcile.test.js`**
  - The header gains the replacement paragraph.
  - `seedRunning` gives each spec its own plan. Today both default to `w10-s4-demo` (line 110),
    so two running tasks share one plan.
  - Each rewritten case is listed below. Cases 7, 7b, 7c, 8 and 9 are unchanged.

  | Case | New body | Old body (replaced) |
  |---|---|---|
  | **1+2** | A git fixture (see the helpers below). `route(['menu'], root, { liveAgentIds: ['a1'] })` leaves the registry bytes unchanged, and its text matches `/1 build would go back to the build queue when you name it/`. Then `menu task sweep` (same list) shows t1 `never-moved`/`alive` and t2 `would-go-back`/`confirmed-dead`. Confirming both plans with their tokens leaves t1 running and its plan in `in-progress/`, marks t2 `orphaned` and puts its plan in `todo/`. | It asserted the render orphaned t2 and printed `1 task orphaned — offer re-run`. |
  | **3** | `menu task sweep --confirm none` with all live ids. Every one of the cap's tasks stays `running`, and `canRun` refuses with `max-concurrent`. | It used a render to reconcile. |
  | **4** | The same `--confirm none` with `['a1']`, then the completion is accepted. | |
  | **5** | No live list; the preview shows the 150-min build `not-yet`/`files-held` and the 45-min build `not-yet`/`under-floor`. A confirm naming both with their tokens moves neither, and each task's JSON is `deepEqual` before and after. The kind-aware floor stays pinned: a regression to a 30-minute floor turns the 45-min code into `files-held`. | |
  | **6** | A start without `--agent-id` records `agentTaskId === null`, and `!== t2.id`. | It asserted the placeholder; scenario 2.3 replaces it. |
  | **6b** | The preview with `liveAgentIds: ['h1']` lists the task as `never-moved`/`alive`. | It used a render. |

- **`tests/plan-recovery-wiring.test.js`**
  - The header is rewritten: the render no longer recovers; the sweep does, on the human's name.
  - **Case 1:** a git fixture and a `presumed-dead` orphan in `in-progress/`. The render leaves
    the plan where it is and prints `/1 build would go back to the build queue when you name it/`.
    `menu task sweep --confirm alpha@<token>` then puts the plan in `todo/` with one
    `cleanup.json` entry, `action: 'recovered'`.
  - **Case 2:** the 100-min staleness orphan. The preview shows `not-yet`/`files-held`, the plan
    stays, and there is no "would go back" count.
  - **Case 3** is kept. It also asserts the absence of `/would go back|look(s)? dead/`.
  - **Case 4:** the banner and INBOX render beside the sweep line.
  - **Case 5:** inject `planRecovery.previewSweep = () => { throw … }` (the seam moves from
    `recoverOrphanedPlans`). The text then holds `the background task check DID NOT RUN` and the
    injected message.
- **`tests/dashboard-wedge-reports.test.js`**
  - The case at line 184 asserts `would be marked dead on age alone` instead of `orphaned on age
    alone`. `(implement)`, `min old` and `the floor for this kind is 120 min` stay.
  - The clean-project marker list at line 89 adds `marked dead on age alone` and `would go back`.
    That is a tightening.
- **`tests/dashboard-wedge-fault.test.js`**
  - `renderReport` injects `planRecovery.previewSweep = () => ({ report, builds: [], counts: {
    buildsBack: 0, deadHeld: 0, otherDead: 0, neverRun: 0, released: 0, old: 0, pending: 0 } })`.
  - `afterEach` restores it, instead of `taskReconcile.reconcileState`.
  - The three `orphaned on age alone` strings, at lines 150, 170 and 213, become `marked dead on
    age alone`.
- **`tests/dashboard-reconcile-failure.test.js`**
  - The seam moves to `planRecovery.previewSweep` in cases 1, 2, 5, 8, 10, 11 and 12.
  - **Case 4** replaces `taskRegistry.load` (not `withRegistry`) so that it throws.
  - **Case 6** is replaced: with the tasks.json rename injected to throw, the render leaves the
    registry bytes unchanged and prints no `could NOT be saved`. The reason: the dashboard saves
    nothing.
  - **Case 8** asserts that the health line leads the sweep line and the wedge block. The orphan
    line is gone.
  - **Case 9** is replaced: an injected report carrying `corrupt` and `saveFailed` renders the
    corrupt line and no save line.
  - **Case 13** is unchanged.
- **`tests/menu-screens-coverage.test.js`, the case at line 300.** A 3-hour-old `plan`-kind task
  with no live list renders `/1 other task looks dead/` and `/would be marked dead on age alone/`.
  The registry bytes are unchanged.
- **`tests/tab-modules.test.js`**
  - `loadTabWithMocks` intercepts `'/lib/plan-recovery'` with a `mockPlanRecovery`. Its default
    `applySweep` returns `{ ok: true, report: { orphaned: [], swept: [], cancelled: [],
    unsatisfiable: [], quarantineReleased: [], corrupt: null }, waiting: 0 }`.
  - `mockReconcile` and its interception are deleted, since no tab requires task-reconcile.
  - The four Doctor "2" cases (lines 884–954) assert the call `applySweep('/test/project', {
    confirm: [] })`. They keep their message assertions: the count of 3, the singular, healthy,
    and `load-failed`.
  - Add two cases: `saveFailed` gives `/could NOT be saved/`; `waiting: 2` gives `/2 builds wait
    for you to name them: menu task sweep/`.
- **`tests/menu-protocol.test.js`.** Add scenario 2.12; see case B15.
- **Must pass unchanged** (Step 14 proves it): `tests/dashboard-survives-unreadable-registry.test.js`,
  `tests/menu-task-wiring.test.js`, `tests/scheduler-enforced.test.js`,
  `tests/promote-quarantine-parity.test.js`, `tests/task-reconcile.test.js`,
  `tests/task-reconcile-coverage.test.js`, `tests/task-reconcile-quarantine-fault.test.js`,
  `tests/plan-recovery.test.js`, `tests/plans-keep-moving-without-the-human.test.js`,
  `tests/protect-records.test.js`, `tests/cache-freshness.test.js`, `tests/dashboard-says-the-moment.test.js`.
  If one fails, the build stops at Step 14 and reports it. It never edits a file this list does
  not declare.

#### Files: `CLAUDE.md`, `README.md`
**Action:** MODIFY (counts only). These are on top of slice 1's values.

| File | Line | From | To |
|---|---|---|---|
| `CLAUDE.md` | 61 | `575` | `576` |
| `CLAUDE.md` | 94 | `575` | `576` |
| `README.md` | 1145 | `575 test files` | `576 test files` |

### Merge notes (the unpushed local main, read in the main checkout's working tree)

These are the expected conflicts and their resolutions.

1. **`taskTransition`.** Local main lines 2571–2581 insert an agent-id format check (`AGENT_ID`,
   line 2496) at the same place as this slice's real-id check. Keep both, format first. Note that
   main's check lets `''` through and lets an id equal to the task id through. The real-id check
   refuses both.
2. **The stamp block.** Main lines 2601–2623 rewrote it with the condition `task.agentTaskId ==
   null || task.agentTaskId === task.id`, and the `agent-recorded` refusal. Keep main's block and
   replace that condition with `!taskReconcile.isRealAgentId(task.agentTaskId, task.id)`. It is
   equivalent for null and the placeholder, and also accepts `''`.
3. **The `p.agentId || id` fallback appears twice in main.** Line 2658 is the registry-only start.
   Line 2696 is the `claimBuild` delegate. Both become `p.agentId || null`. Main's
   `claimBuildLocked` accepts a null id (`actions.js` line 1118, main).
4. **`start.md`.** Main rewrote WORK dispatch step 2 and COMPLETION step 3 around a
   claim-before-launch for builds (main lines 123 and 134).
   - Take main's text, and add `--agent-id <the harness agent id>` to its non-build "launch …
     THEN `menu task start <taskId>`" clauses.
   - Main's claim `menu task start <taskId>` comes before any launch, so it is not a start after a
     launch and stays as it is.
   - Case B15's guard is written to hold on main's text.
   - Main's line 143, "the task's own id (the placeholder `menu task start <id>` records)", becomes
     "an old placeholder an earlier version recorded".
5. **Counts.** Main already has 575 test files. Resolve by running `node src/scripts/release.js`,
   which syncs counts, or by recounting.
6. **The other branches.** No edit here touches `src/hooks/protect-records.js`. `sweepVerdict` is
   pure and exported, so the parallel-workers plans' `menu task release-silent` can call it.
   Those plans must re-base on `menu task sweep` (parent plan, line 85).

## Wiring — the live call sites

| New or changed code | Live call site | Root |
|---|---|---|
| `planRecovery.previewSweep` | `menu-screens.buildDashboardTable` → `dashboardPipeline` | `start.js` `main()` → `route([])`, `route(['menu'])`, `route(['dashboard'])`, which `/ctoc:start` runs |
| `planRecovery.previewSweep`, `applySweep` | `menu-screens.taskSweep` ← `taskCommand` `case 'sweep'` | `route(['menu','task','sweep',…])` from `start.js`; start.md's new section and table row |
| `planRecovery.applySweep` | `src/tabs/tools.js` Doctor key `'2'` | the TUI (`start.js` interactive mode → System → Doctor) |
| `planRecovery.sweepVerdict`, `findWorkAfterClaim` | `previewSweep` (intra-module) | as above |
| `recoverOrphanedPlans` (`plans` filter) | `applySweep` (intra-module) | as above |
| `taskReconcile.isRealAgentId` | `menu-screens.taskTransition`; `task-reconcile.reconcile`; `plan-recovery.sweepVerdict` | `route(['menu','task','start',…])`; the sweep |
| `reconcile` `releaseBuilds`, `onePass` | `sweepVerdict` (through `reconcile`); `applySweep` (through `reconcileState`) | the sweep, the dashboard, the Doctor key |

Case B0 and cases B1–B14 drive these through `route()` and `tools.handleKey`, the paths a human
and the session use.

## Test Plan

### Tests: `tests/the-dashboard-never-sends-live-work-back.test.js`
**Action:** CREATE
**Framework:** `node:test`, `node:assert/strict`.

**Helpers.**

- `makeProject({ git = true })` makes a realpath'd `mkdtemp` folder holding the eight `plans/`
  stage folders and `.ctoc/state/`. With `git`:
  - `git init`;
  - `git add README.md && git commit` of a one-line `README.md`, with `GIT_AUTHOR_DATE` and
    `GIT_COMMITTER_DATE` set to `2020-01-01T00:00:00Z`;
  - git is run with the identity flags of `tests/helpers/hotfix-check-harness.js` lines 118–119
    and `shell: false`.

  A repository with no commit makes `git log` fail, and a git failure counts as work found
  (decision 7). Without the commit, every case would land in "never moved".
- `gitFails(root)` writes `<root>/.git` as a file holding `gitdir: <root>/nowhere`. Git then
  fails deterministically, even when the temporary folder sits inside another repository.
- `seedPlan(root, stage, slug, { ticked })` writes a plan file, using the body shape of
  `tests/last-mile-wired.test.js` lines 86–132 with `files: ["src/<slug>.js"]`.
- `seedTasks(root, tasks)` saves a registry through `taskRegistry.save`. Tasks are built from
  named fields with `ts.started = minutesAgo(n)`.
- `bytes(root)` gives the sha256 of `.ctoc/state/tasks.json` and of every file under `plans/`,
  plus the sorted list of every `plans/<stage>/` folder and `.ctoc/logs/cleanup.json`. An absent
  file is recorded as absent.
- `sweep(root, live, ...words)` is `ms.route(['menu','task','sweep',…words], root, {
  liveAgentIds: live })`. `tokensOf(res)` reads `res.sweep.builds`.

**Cases.**

- **B0. The bug, first.** A queued build `t1` for plan `b0`, with `b0` in `in-progress/` and a
  git fixture.
  - Act: `route(['menu','task','start','t1'], root)`. Set `ts.started` to 2 minutes ago, through
    `taskRegistry.load` and `taskRegistry.save`. Then `route(['menu'], root, { liveAgentIds:
    ['a1','a2'] })`.
  - Asserts:
    - `agentTaskId === null`;
    - the plan file is still in `in-progress/`;
    - `t1` is still `running`.
  - Red on origin/main: the agent id is `'t1'`, and the plan is in `todo/` after this one
    render.
- **B1. Scenario 2.1.**
  - Given:
    - build A, 300 min old, with no agent id;
    - build B, 10 min old, `agentTaskId: 'b-agent'`;
    - a `plan` task P, 60 min old, `agentTaskId: 'p-agent'`;
    - a `review` task D, done 8 days ago;
    - A's and B's plans in `in-progress/`;
    - a git fixture.
  - Act, twice each: `route(['menu'])`, `route(['dashboard'])` and `route([])`, with
    `liveAgentIds: ['zz']` and without it.
  - Asserts:
    - `bytes(root)` is equal after every render;
    - with the list: `/2 builds would go back to the build queue when you name them/`, `/1 other
      task looks dead/`, `/1 old task would leave the view/` and `/review them with `menu task
      sweep`/`;
    - without the list: `/1 build would go back to the build queue when you name it/`, `/1 other
      task looks dead/`, `/1 old task would leave the view/`, and the 10-minute build is absent
      from the counts;
    - every text `doesNotMatch(/orphaned|re-queued/i)`.
- **B2. Scenario 2.2.** A running build with `agentTaskId: 'gone'`, 30 min old, a git fixture,
  and `live = ['other']`.
  - Asserts:
    - the dashboard text holds `/1 build would go back/`;
    - `sweep(root, live).sweep.counts.buildsBack === 1`, and its single row is `would-go-back`;
    - a screen-text check reads the integer from both screens, and the two are equal.
- **B3. Scenario 2.3.** A queued build started with `menu task start <id>`, its start set to 5
  minutes ago, and `live = ['a1','a2']`.
  - Asserts:
    - `agentTaskId === null`;
    - the preview row is `not-yet` with a reason containing `no agent id recorded`;
    - the dashboard holds no "would go back";
    - `sweep(root, live, '--confirm', 'none')` leaves the task JSON and the plan bytes equal.
- **B4. Scenario 2.4.** `t1` is 10 minutes old and `t2` is 300 minutes old. Both have `agentTaskId`
  equal to their own id. The live list is `['x']`, and there is a git fixture.
  - Asserts:
    - `t1` is `not-yet`/`under-floor`, and `t2` is `would-go-back`/`presumed-dead`;
    - both reasons contain `no agent id recorded`, and neither contains `confirmed`;
    - after `route(['menu','task','start','t1','--agent-id','h7'])`, `t1.agentTaskId === 'h7'`.
- **B5. Scenario 2.5.** A running build `t3`.
  - Asserts: `--agent-id t3` and `--agent-id ''` each give `{ ok: false, reason:
    'agent-id-not-real' }`, a text saying "not empty and not the task id", and registry bytes
    unchanged.
  - Control: `--agent-id real-1` on a running build whose id is null is accepted.
- **B6. Scenario 2.6.** A running build with `agentTaskId: 'h1'`, `live = ['h1']`, and the human
  names it with its token.
  - Asserts: the plan is in `in-progress/`, the status is `running`, and the applied text holds
    `the builder is alive`.
- **B7. Scenario 2.8.** Builds A, B and C are 30 min old, with ids absent from `live = ['d-agent']`.
  Build D carries `d-agent`. There is a git fixture.
  - Act: `--confirm A@…,C@…,D@…`.
  - Asserts:
    - A and C are in `todo/`;
    - `cleanup.json` holds exactly two entries, A and C, each with `action: 'recovered'`;
    - B and D are in `in-progress/`;
    - B's task JSON is `deepEqual` before and after;
    - D is still `running`;
    - the text holds `Sent back to the build queue (2)`, `Not moved (1)` with D's alive reason,
      and `1 other build that would go back was not named`.
- **B8. Scenario 2.7.** A git fixture, built in this order:
  1. Commit all three plans `wa`, `wb` and `wc` in `plans/todo/`, dated 2020.
  2. Seed the three running builds, each started 30 minutes ago with an id absent from the
     list.
  3. `git mv` each plan into `plans/in-progress/`.
  4. Commit only `wc`'s rename, dated now (`git commit -- plans/todo/wc.md plans/in-progress/wc.md`).
     This is the claim, as the plan sync commits it.

  `wa`'s and `wb`'s renames stay staged and uncommitted. A staged rename is not a commit, so it
  is not work. Then:
  - (a) Builder `wa` commits `src/wa.js` on the current branch, dated now (`git add src/wa.js`,
    then `git commit -- src/wa.js`, so the staged renames stay out of it).
  - (b) Builder `wb` commits `src/wb.js` on branch `other-b` only (`git checkout -b other-b`,
    the commit, `git checkout -`).
  - (c) `wc` has no commit after its start other than the claim.
  - Act: name all three.
  - Asserts:
    - `wa` and `wb` stay in `in-progress/`, with their task JSON unchanged;
    - their rows are `never-moved` with `work was found after the claim`;
    - `wb`'s reason names `other-b`;
    - each line holds the way-out sentence with its own task id;
    - `wc` moves to `todo/`.
  - (d) A second project with `gitFails`: its one dead build stays put, and its reason holds `git
    could not show`.
- **B9. Scenario 2.9.** A, with no id, 300 minutes old, a git fixture, and an old done task E past
  retention.
  - Act: preview, then `route(['menu','task','start','A','--agent-id','h1'])`, then record the
    registry bytes, then `sweep(root, ['h1'], '--confirm', 'A@<old token>')`.
  - Asserts:
    - `ok === false`, `stale === true`;
    - the plan is still in `in-progress/`;
    - the registry bytes are unchanged, so E was not swept either;
    - the text starts with `Nothing changed` and lists A as `never-moved`/`alive`.
- **B10. Scenario 2.10.** A dead build B (id absent from the live list) for plan `b10`. Its plan is
  in `in-progress/`, fully ticked, passes `validateForReview`, and its mtime is set 3 hours back
  with `fs.utimesSync`.
  - Act: `sweep(root, ['x'], '--confirm', 'none')`, then `actions.startAgent(root)`.
  - Asserts: `b10` is still in `in-progress/`, B is `running`, and `cleanedUp` does not include
    `b10`.
- **B11. The git work check, edge cases** (all through the preview).
  - (a) A build with `ts.started` set to `'not-a-date'`. It becomes presumed-dead via
    `!isFinite`. The work check gives `git-failed` with `no start time`, so the row is
    `never-moved`.
  - (b) A touch of `'../outside.js'` gives `never-moved`, `a declared file cannot be checked`.
  - (c) A touch of `':(exclude)src/c.js'` gives `never-moved`, `a declared file cannot be
    checked`: it is refused before git runs. A second build's touch `src/*.js`, with a commit to
    `src/d.js` after the start, gives `work-found`: the glob is honoured.
  - (d) A commit dated in the same second as the start counts as after.
- **B12. Scenario 2.11, the real Doctor key.** The B1 registry and plans, and a git fixture.
  - Act: `require('../src/tabs/tools').handleKey({ name: '2', sequence: '2' }, { toolMode: '1',
    projectPath: root })`.
  - Asserts:
    - D is gone from the registry;
    - A and B are still `running`, with unchanged JSON;
    - no plan file moved;
    - `app.message` matches `/1 build waits for you to name it: menu task sweep/`. Without a live
      list only A is eligible.
- **B13. The dashboard line's parts.**
  - Fixtures, one per part:
    - an already-orphaned `staleness` task of kind `review`, 300 minutes old, gives `the files of
      1 dead task would be released`;
    - a queued task blocked by a missing id gives `1 task can never run`;
    - a dead build with work found gives `1 dead build cannot go back on its own`.
  - Each is asserted on its own line, and a clean project renders none of the six parts.
- **B14. Argument faults and the apply screen.**
  - Each of these gives `refused` and unchanged bytes:
    - `sweep(root, null, 'x')`;
    - `sweep(root, null, '--confirm')`;
    - `sweep(root, null, '--confirm', 'p@ZZ')`;
    - `sweep(root, null, '--confirm', 'p@0123456789ab,p@ba9876543210')`.
  - An unknown plan `nope@0123456789ab` gives `stale`.
  - A blocked move: the named plan already exists in `todo/`. It gets `Not moved` with `a plan of
    the same name already waits`, and its task stays `running`.
  - A save fault: inject `safeFs.renameSync` to throw for `tasks.json`. The apply screen holds
    `could NOT be saved`.
  - The `promote` field. Given:
    - a done task `tA`;
    - a queued `sync` task with `blockedBy: ['tA']`, held only by the scheduler's rule that no
      integration task starts while any task runs (`task-registry.js` line 936);
    - a dead running `plan` task, 60 min old, whose id is absent from the live list.

    After `--confirm none` with that live list, the `sync` task appears in `res.promote`.
- **B15, in `tests/menu-protocol.test.js`. Scenario 2.12.**
  - `sectionBody(md, /^### WORK dispatch \(turn recipe\)/m)` holds `` `menu task start <taskId>
    --agent-id <the harness agent id>` ``.
  - The COMPLETION section holds `` `Agent(run_in_background)` + `menu task start <id> --agent-id
    <the harness agent id>` ``.
  - The classify paragraph holds `` `menu task start <id> --agent-id <the harness agent id>` ``.
  - Rule 12 holds `` `menu task start <taskId> --agent-id <the harness agent id>` ``.
  - The guard: `md.match(/run_in_background[^.\n]*?menu task start <[^>]+>(?! --agent-id)/)` is
    `null`. No start follows a launch in one sentence without the id. A claim before a launch, as
    on local main, is not matched.

**Coverage target.** Every new or changed line in `plan-recovery.js`, `task-reconcile.js`,
`menu-screens.js` and `tools.js` is executed by the cases above. The suite floor is 99
(`.ctoc/coverage-baseline.json`).

**Independence.** Each case makes its own project, restores every injected function in
`afterEach`, and calls `cache.invalidate()` before and after, as `tests/last-mile-wired.test.js`
lines 46–53 do.

### Security Review

- [x] **Command injection.** git runs with an argument list and `shell: false`. Every registry
  value reaching git is a pathspec carrying our own `:(glob)` magic, or it is refused before the
  call:
  - `..`, absolute paths, a leading `:` and control characters;
  - a plan slug outside `[A-Za-z0-9._-]`.

  Every refusal of a value counts as work found (fail closed).
- [x] **Input validation.** The sweep's words go through its own parser. The plan and token
  character sets are closed. `parseTaskArgs` is untouched, so the hook's reading of `menu task`
  is unchanged. `--agent-id` must be a real id.
- [x] **Authority.**
  - A plan moves only when the human names it, and only if it is still eligible on a fresh
    preview with the same token.
  - Inside the registry's compare-and-swap, `reconcile` judges each named build again.
  - A build nobody named keeps its task exactly as it was. So `startAgent`'s in-progress clean-up
    (`actions.js` lines 2176–2199) cannot treat it as finished (decision 19).
- [x] **No silent failure.**
  - A git failure is shown as a reason.
  - A preview failure is the DID NOT RUN line.
  - A save failure is named on the apply screen and in the Doctor message.
  - A blocked move is listed.
- [x] **Error messages.** Only stripped, capped first lines. No absolute path and no stack.
- [x] **Terminal injection.** Every registry value rendered passes `stripCtl` and a cap (the
  existing render helpers).
- [x] **No secrets** are read or written.

### Architecture checks

- `lib` modules require no `hooks` and no `commands`. `tools.js` (a tab) requires `lib`.
- The scheduler (`task-registry.js`) is not changed.
- `reconcile` keeps its pure core. The two new options are inert when absent.
- One verdict function serves the dashboard, the preview, the apply and the Doctor key
  (decision 20).
- Cross-platform:
  - `path.join` everywhere;
  - git through `spawnSync` with `windowsHide`;
  - name-status paths compared in git's own `/` form;
  - no shell.

## Acceptance Criteria Mapping

| Criterion | Implemented in | Test |
|---|---|---|
| 2.1 opening the dashboard writes nothing; the one line counts | `buildDashboardTable`, `previewSweep`, `renderSweepLine` | B1, B13 |
| 2.2 the dashboard and the preview agree | one `previewSweep` | B2 |
| 2.3 a start without an id is unknown, not dead | `taskTransition` (records null, never the task id), `isRealAgentId` | B0, B3 |
| 2.4 the old placeholder is unknown and can be replaced | `isRealAgentId`, the stamp condition | B4 |
| 2.5 a stamp refuses a fake id | the early refusal in `taskTransition` | B5 |
| 2.6 a live agent is never moved | `sweepVerdict` (`alive`), `reconcile` held/live | B6 |
| 2.7 work after the claim is never moved | `findWorkAfterClaim` | B8, B11 |
| 2.8 exactly the named, still-eligible plans move | `applySweep`, `recoverOrphanedPlans({ plans })` | B7 |
| 2.9 a stale confirmation is refused | the token check in `applySweep` | B9, B14 |
| 2.10 an unconfirmed build cannot be pushed forward | `releaseBuilds` hold | B10 |
| 2.11 the Doctor key moves no plan | `tools.js` → `applySweep(…, { confirm: [] })` | B12, tab-modules |
| 2.12 the recipes stamp the real id | `start.md` | B15 |
| Decision 23 (one pass) | `onePass` in `reconcile` | B1 (300-min build counted on the first look), B4 |

## Risk Mitigations

| Risk | Mitigation | Where |
|---|---|---|
| A crashed build holds its slot, its files and the wave barrier until named (decision 29) | Counted on the dashboard line, named with its reason in the preview, and freed by the human's one command | `renderSweepLine`, `sweepScreen` |
| Dead tasks of other kinds, and the stale-orphan file reservations, are no longer freed at render | Counted on the line ("look dead", "files would be released"), and freed by `--confirm none` or the Doctor key | `renderSweepLine`, `tools.js` |
| A plan-sync or other commit holds a dead build forever | The claim's 100% rename is excluded; the line names the commit and branch and gives the way out | `findWorkAfterClaim`, decision 25 |
| A project with no git repository can never sweep a build back | Said in start.md; the way out is complete or fail | start.md section |
| The dashboard gets slower | git runs only for builds that would otherwise go back, once per render each, bounded by `--since` with one day of slack and a 10-second timeout | `previewSweep` |
| Builds already orphaned by 6.14.130 renders stay exposed to `startAgent`'s forward clean-up | Residual. They are already terminal, and the preview lists those still in `in-progress/` as `already-dead`, so the human can name them | R2 rows |
| The preview and the apply disagree | One function, and per-plan tokens checked on a fresh preview | `applySweep` step 2 |

## Decisions Taken Under Ambiguity

- **S2-1. Fifteen own files, far over the ~1–3 budget.** The owner's brief fixes exactly one
  slice per story.
  - Nine of the files are existing tests whose contract the owner replaced. Each must be
    rewritten, not loosened.
  - Two are the docs that describe the old behaviour.
  - Splitting the source change from those tests would leave a slice that fails `npm test`.
- **S2-2. The confirmation carries a token per plan (`<plan>@<token>`), not one fingerprint for
  the whole preview.** Decision 6 asks that a change to "anything the preview showed about a
  named plan" refuses the confirmation. A whole-preview fingerprint would also refuse when an
  unrelated build starts or finishes, which in a busy queue can refuse every try. A per-row token
  refuses exactly what decision 6 names. The preview prints the tokens and its confirm action
  carries them, which is the inbox clean-up's confirm pattern (`inboxCleanupCategoryConfirm`,
  `menu-screens.js` lines 1499–1524).
- **S2-3. The apply marks the task dead first, then moves the plan.** This reuses the one plan
  mover, with its liveness veto and its cleanup-log entry. The main way a move fails, a plan of
  the same name already in the build queue, is checked before the registry is touched, and such
  a build is listed as not moved. Its task is left as it was. A rename failing for another reason
  leaves a named, dead-judged build marked dead with its plan still in place. The next preview
  lists it again as `already-dead`.
- **S2-4. The one-pass release (decision 23) is an option inside `reconcile`, not two calls.**
  `reconcile` defers a dependent only on this pass's `stalenessOrphaned` (lines 474–491). A
  second call would fail a dependent that the first call deferred.
- **S2-5. A "build" is an implement task with a plan.** The sweep holds every running build
  unless it is named and eligible. A running build whose plan is not among this checkout's plans
  being built is listed as never moved, with the way out.
- **S2-6. The work check uses `--since` one day before the claim, and an exact second-level test
  in code.** The day of slack covers clock skew between a builder's commits and the claim. The
  bound keeps the per-render git call short on a long history.
- **S2-7. `renderRecoveryReport` and the `saveFailed` dashboard branch are deleted, not kept
  behind injection.** The dashboard can never produce them now. Keeping them would leave code
  that only a test reaches. Save failures are shown where saving happens: the apply screen and
  the Doctor message.
- **S2-8. "Held this pass" stays on the dashboard.** The preview computes the concurrent-edit
  guard the same way `reconcileState` did, and the line describes which queued tasks are held,
  not a write.

## Execution Plan

### Step 8: TEST
Write the failing tests FIRST, before any source file changes, in this order. Run each new file
with `node --test <file>`, and record the red output in the build record.

1. `tests/the-dashboard-never-sends-live-work-back.test.js`, case **B0** first. Run it and record
   the failure: `agentTaskId` is `'t1'`, and the plan is in `todo/` after one render. That is the
   bug, seen failing.
2. Cases B1–B14 of the same file. All are red: there is no sweep route, no `previewSweep`, and
   the render still writes.
3. B15 in `tests/menu-protocol.test.js`. Red: start.md lines 119, 130, 355 and 423 lack
   `--agent-id`.
4. The replaced cases listed under "Existing tests whose contract the owner replaced". Each is
   written with its replacement comment, and each is red against origin/main for the reason its
   row states.

### Step 9: PREPARE
- Re-read every line range this plan cites in `menu-screens.js`, `task-reconcile.js`,
  `plan-recovery.js`, `tools.js`, `start.md` and `docs/ENFORCEMENT.md`. Stop and report any that
  moved since slice 1 landed.
- Confirm the sanitizer binding in `tools.js`.
- Run `git --version`, and record whether `%S` and `--name-status -M` behave as cases B8 and B11
  assume. These are *believed* items.

### Step 10: IMPLEMENT
- `src/lib/task-reconcile.js`: `isRealAgentId`, the two call sites, `releaseBuilds`, `onePass`,
  the JSDoc, the export.
- `src/lib/plan-recovery.js`: the requires, `sweepVerdict`, `findWorkAfterClaim`,
  `previewSweep`, `applySweep`, the `plans` filter on `recoverOrphanedPlans`, the header, the
  exports.
- `src/lib/menu-screens.js`:
  - the `buildDashboardTable` preview block;
  - `renderSweepLine`;
  - the deletion of `renderRecoveryReport` and of the `saveFailed` branch;
  - the three `renderWedgeReports` strings;
  - the `taskTransition` lines;
  - `taskCommand` and `route` with `opts`;
  - `parseSweepArgs`, `taskSweep`, `sweepScreen`, `appliedScreen`;
  - the header.
- `src/tabs/tools.js`: the import, the Doctor key '2'.
- `src/commands/start.md`: lines 119, 130, 132–141, the new section in place of 185–217, 355,
  423, and the table row.
- `docs/ENFORCEMENT.md`: line 375 and the refused-table row.
- The nine replaced test files, as listed.
- `CLAUDE.md` and `README.md`: the three count edits.

### Step 11: REVIEW
iron-loop-critic reads the diff against this plan. It checks:

- that no render path writes, by reading every call reachable from `buildDashboardTable`;
- that `reconcile`'s defaults are unchanged;
- the token covers exactly the shown fields;
- that `parseTaskArgs` is untouched;
- that every replaced test states its reason and asserts at least as much as before.

### Step 12: OPTIMIZE
- Confirm git runs only for `would-go-back` candidates, once per render.
- Confirm `sweepVerdict` runs `reconcile` exactly twice per call.
- Confirm no double `previewSweep` per route.

### Step 13: SECURE
security-scanner reviews the git call, with its argument list, the pathspec refusals and
`:(glob)`. It also reviews the token and plan character sets, the stale refusal, and the
refusal of a fake `--agent-id`.

### Step 14: VERIFY
- Run `npm run lint` (eslint, `--max-warnings 0`).
- Run `npm run typecheck`.
- Then run `npm test`: the gated entry point, holding the whole suite, the coverage floor in
  `.ctoc/coverage-baseline.json` (`minPct` 99) and zero skipped.
- Every test must report `# fail 0`, including every file listed under "Must pass unchanged".

### Step 15: DOCUMENT
- Check that the start.md section, the table row and `docs/ENFORCEMENT.md` match the shipped
  words of the dashboard line, the preview and the apply screen.
- Check that the module headers of `plan-recovery.js` and `task-reconcile.js` say that recovery
  runs only in a confirmed sweep.
- Check the CLAUDE.md and README.md counts against disk.

### Step 16: FINAL-REVIEW
iron-loop-critic checks scenarios 2.1–2.12 one by one against the passing test names and the
wiring table. It confirms `git diff --stat -- src/hooks` is empty, and that the merge notes still
match the local main lines they name.
