---
title: "Opening the dashboard changes nothing; a dead build goes back to the build queue only when the human names it in `menu task sweep`"
type: implementation
created: 2026-10-18
priority: high
effort: medium
parent_plan: real-projects-do-not-stall-on-the-menu
depends_on: none
files:
  # THE SLICE'S OWN FILES — the work surface (eighteen; far over the ~1–3 budget, see decision S2-1).
  - src/lib/task-reconcile.js
  - src/lib/plan-recovery.js
  - src/lib/menu-screens.js
  - src/lib/actions.js
  - src/tabs/tools.js
  - src/hooks/protect-records.js
  - src/commands/start.md
  - docs/ENFORCEMENT.md
  - tests/the-dashboard-never-sends-live-work-back.test.js
  - tests/protect-records.test.js
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
  # The count is set from disk at Step 15 (decision S2-26), whichever slice builds first.
  - "CLAUDE.md"
  - README.md
---

# Opening the dashboard changes nothing; a dead build goes back to the build queue only when the human names it in `menu task sweep`

Slice 2 of 2 of `plans/implementation/real-projects-do-not-stall-on-the-menu.md`. It builds
Story 2: scenarios 2.1–2.12 and decisions 5–11, 18–25 and 29.

- **It does not wait for slice 1, and it builds FIRST on this branch** (decision S2-26, the CTO
  Chief's dispatch order). Slice 1 waits on an owner question; this slice is the fix for the
  queue that froze on the real project. Both slices still touch `src/lib/menu-screens.js`,
  `src/commands/start.md`, `docs/ENFORCEMENT.md`, `CLAUDE.md` and `README.md`, so every edit
  here is written order-independent: each insert names the neighbouring text of origin/main
  6.14.130 it goes beside (never a line slice 1 adds), and the documented counts are set from
  disk at Step 15. Whichever slice builds second rebases onto the first.
- **Slice 1's case 6** ("the write protection is unchanged", for slice 1's own scope) must still
  pass when slice 1 builds after this slice.
- **It changes one hook file, `src/hooks/protect-records.js`** (decision S2-9): one refusal, so
  that only the human confirms a sweep. Claude Code runs the hook as a fresh process per call,
  but a session runs the installed plugin's copy, so every session must update CTOC and restart
  Claude Code after this release before the refusal holds there.
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

- **The dashboard writes no task change, moves no plan and logs no clean-up.** It calls one new
  preview, which computes in memory what a sweep would do, and renders one line counting it. (A
  corrupt registry still appends to the task warn log, as every registry read does today;
  decision S2-14.)
- **The sweep moves things only on the human's word.** `menu task sweep` shows each build with
  its reason. `menu task sweep --confirm <plan>@<token>,…` applies it: named plans move only if
  they are still eligible, and the task changes that move no plan are applied.
  `menu task sweep --confirm none` applies only those task changes.
- **Repair state is a sweep that names nothing.** The Doctor screen's "Repair state" key runs
  it.
- **Agent ids are honest.** A start without `--agent-id` records no agent id. An id equal to
  the task id is read as unknown. A stamp must be a real id.
- **start.md's recipes stamp the harness id** after every launch.
- **A background agent cannot confirm a sweep.** The write-protection hook refuses a background
  agent's command holding both `sweep` and `--confirm`, or naming `applySweep`, whatever the
  owner's 2026-10-15 switch says (decisions S2-9 and S2-25).

## Implementation Details

### Dependency Graph

```
src/commands/start.js main() ─▶ menu-screens.route()
   ├─ 'menu' | 'dashboard' | []  ─▶ dashboardPipeline ─▶ buildDashboardTable ─▶ planRecovery.previewSweep   (reads only)
   └─ 'menu' 'task' 'sweep' …    ─▶ taskCommand(…, opts) ─▶ taskSweep ─▶ planRecovery.previewSweep | planRecovery.applySweep
src/tabs/tools.js Doctor key '2' ─▶ planRecovery.applySweep(root, { confirm: [] })   (inside try/catch)

plan-recovery.previewSweep ─▶ taskRegistry.load, state.readPlans, sweepVerdict (pure), findWorkAfterClaim (git, lazy child_process, one time budget)
plan-recovery.findWorkAfterClaim ─▶ actions.planDeclaredFiles, planCoverage.readPlanFiles, planCoverage.globToRegex, tui.stripCtl
plan-recovery.sweepVerdict  ─▶ taskReconcile.reconcile ×2 (pure), taskRegistry.nextRunnable (pure), taskReconcile.applyQuarantine (pure), crypto
plan-recovery.applySweep    ─▶ previewSweep, taskReconcile.reconcileState (writes the registry), recoverOrphanedPlans (moves plans, appends cleanup log), taskRegistry.withRegistry (the compensating write)
menu-screens.taskTransition ─▶ taskReconcile.isRealAgentId

src/hooks/protect-records.js bashRefuses ─▶ (no new require) one regex test on the command text
src/hooks/protect-records.js main() fail rule ─▶ the same test on the scanned tool input
```

No new cycle.

- `plan-recovery.js` already requires `./actions`, `./state`, `./task-registry` and
  `./project-root` (lines 65–70). Line 68 destructures `movePlan`; it becomes the namespace
  `const actions = require('./actions');`, called as `actions.movePlan(...)` and
  `actions.planDeclaredFiles(...)`, so a test can inject a move failure on the exports object
  (case B22).
- It gains `./task-reconcile`, `./plan-coverage`, `./tui` (`const { stripCtl } =
  require('./tui');`; `tui.js` requires only `readline`, line 6) and `crypto`.
  `task-reconcile.js` requires only `./safe-fs`, `./task-registry` and `./plan-coverage` (lines
  82–87), and `actions.js` is already required, so no cycle is added.
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

**Requires added:** `const crypto = require('crypto');`, `const taskReconcile =
require('./task-reconcile');`, `const planCoverage = require('./plan-coverage');` and `const {
stripCtl } = require('./tui');`. Line 68 becomes `const actions = require('./actions');` (see
the dependency graph). `child_process` is required lazily, at call time, inside
`findWorkAfterClaim` only (the pattern at `stale-detector.js` line 501), so a test can patch
`require('child_process').spawnSync`.

**Modify `recoverOrphanedPlans(root, opts = {})`.**

- Add `opts.released` (`Array<{ id: string, plan: string }> | undefined`): builds the caller has
  already judged released (decision S2-11). When it is present, the loop walks these records
  instead of the registry's orphaned tasks, and step 2 (the staleness surface, line 190) is
  skipped for them, because the caller judged them on a fresh preview. The liveness veto (line
  184) still reads the registry loaded at line 156, and the plan must still be resident in
  `in-progress/` (line 180). When `released` is present, the `orphaned` list is `released`
  itself and the early return at line 167 tests it; the registry load at line 156 is still
  made, for the liveness veto (finding C12).
- Add `opts.log` (`Map<string, object> | undefined`): extra fields per plan for its cleanup-log
  entry. `appendCleanupLog(root, plan, now)` (line 91) gains a fourth parameter `extra = {}`,
  spread into the entry after `at` (decision S2-15).
- Line 198, `movePlan(planObj.path, 'todo', root)`, becomes `actions.movePlan(...)`.
- Update the JSDoc type to `{ now?: number, released?: Array<{id:string, plan:string}>, log?:
  Map<string, object> }`.
- When `released` is absent the function is unchanged. It keeps its liveness veto, its
  staleness surface and its cleanup-log entry.
- Update the module header (lines 1–63): recovery no longer runs on the render. It runs only in
  a confirmed sweep, for the plans the human named. Replace the "SUPERSEDES the forward sweep …
  runs on the menu render" paragraph (lines 49–55) to say so.

**Add `sweepVerdict(registry, input = {})` → `SweepVerdict`. Exported, pure, the one verdict
(decision 20).** It does no file or process I/O. Its input is `{ inProgress: string[],
liveAgentIds?: (string[]|null), now?: number, work?: Object<string, Work> }`. `now` is resolved
once at its top (`Number.isFinite(input.now) ? input.now : Date.now()`).

**The live-list fingerprint.** `liveHash = input.liveAgentIds == null ? 'none' :
crypto.createHash('sha256').update(JSON.stringify(Array.from(new Set(Array.from(input.liveAgentIds,
String))).sort())).digest('hex')`. It goes into every token, so an apply run with a different
live list than its preview is refused as stale (decision S2-2, F9).

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
- `o = whatIf` task with the same id. It is `undefined` when that pass's retention swept the task
  (an R2 orphan whose `ts.done` is past retention, `task-reconcile.js` lines 514–522). An R2 row
  with `o` undefined is read as released with code `already-dead`; it never throws (case B16).

The table is read top to bottom; the first matching condition wins. Each row is put in exactly
one group, with a code and a reason:

| Condition (R1 unless stated) | `group` | `code` | `reason` |
|---|---|---|---|
| R1: another non-terminal implement task of the same plan exists in the input registry | `never-moved` | `plan-shared` | `another build of this plan is still recorded as running or queued` |
| R1 or R2: a segment of `plan` fails `/^[A-Za-z0-9._-]+$/` | `never-moved` | `unsafe-name` | `its plan name holds characters the menu will not put in a command` |
| `o.status === 'running'` and the live list holds its real id | `never-moved` | `alive` | `the builder is alive (agent <id> is in the live list)` |
| `o.status === 'running'`, younger than the 60 s grace | `not-yet` | `young` | `started under a minute ago` |
| `o.status === 'running'`, otherwise | `not-yet` | `under-floor` | `<unknown>; <age> min old; it can be named once it is <bound> min old` |
| `o.status === 'orphaned'`, `o.result.orphanReason === 'staleness'` (R1 or R2) | `not-yet` | `files-held` | `<unknown>; <age> min old; its files stay held until it is <bound> min old` |
| `o` released (R1: a confirmed-dead orphan, or `presumed-dead`), plan not in `inProgress` | `never-moved` | `not-here` | `its plan is not among the plans being built in this checkout` |
| released, `input.work[id]` undefined | `would-go-back` | `confirmed-dead` / `presumed-dead` / `already-dead` (R2, or `o` undefined) | `agent <id> is not in the live list` / `<unknown>; <age> min old, past the <bound>-minute bound` / `its task was already marked dead` |
| released, `work.found === true`, `work.gitFailed !== true` | `never-moved` | `work-found` | `work was found after the claim: <work.detail>` |
| released, `work.gitFailed === true` | `never-moved` | `git-failed` | `git could not show whether work came after the claim: <work.detail>` (a timeout reads `not checked in time`) |
| released, `work.found === false` | `would-go-back` | as above | as above |

`plan-shared` (threat model TM-16): two R1 rows of one plan are both `plan-shared`, so one plan
never has two rows a confirmation could choose between. R2 rows already require that no
non-terminal implement task exists, so an R1 and an R2 row never share a plan.

- A row is `confirmed-dead` when the live list is present, `realId` is true, the id is absent
  from the list, and the task is past the grace.
- The age is shown as "unknown" when `ageMin` is `null`, never `NaN`.
- Rows with codes `work-found`, `git-failed`, `not-here` or `plan-shared` get `wayOut: true`.
  Their screen line names `menu task complete <id>` (send the work that was found to review) and
  `menu task fail <id>` (give it up), as decision 25 says.
- **Safe values only (threat model TM-04).** A registry value enters an offered action or a
  shown command only when every segment matches `/^[A-Za-z0-9._-]+$/`, the rule
  `menu-screens.js` applies to `parent_plan` at line 1783. Each row carries `safeId` and
  `safePlan` booleans. A row whose id fails gets no way-out command (its line says "finish or
  give up this task from the task board"); a row whose plan fails is never in the confirm
  action, and is `never-moved` with code `unsafe-name` and reason `its plan name holds
  characters the menu will not put in a command`. The R1/R2 plan test in `findWorkAfterClaim`
  stays as a second guard.
- **The token.** `token = crypto.createHash('sha256').update(JSON.stringify([t.id, t.plan,
  t.status, t.agentTaskId ?? null, group, code, work ? (work.ref || '') : '',
  liveHash])).digest('hex').slice(0, 12)`. It is the row's fingerprint (decision 6). It changes
  when what the preview showed about that plan changes, or when the live list changes. Time
  inside one group never changes it. It identifies nobody (decision S2-10).
- **Counts** (all derived from `rows` and `report`):
  - `buildsBack` is the number of `would-go-back` rows;
  - `deadHeld` is the number of `never-moved` rows whose code is not `alive`;
  - `notYet` is the number of `not-yet` rows whose code is `under-floor` or `files-held` (F5);
  - `otherDead` is `report.orphaned.length + report.cancelled.length`, minus the ids of build rows
    (R1 and R2), so a build is never counted twice (F14);
  - `neverRun` is `report.unsatisfiable.length`;
  - `released` counts the ids in `report.quarantineReleased` that are in neither
    `report.orphaned` nor the build rows (F14: an R2 build's flip is its own row);
  - `old` is `report.swept.length`;
  - `pending = buildsBack + otherDead + neverRun + released + old`.

`SweepVerdict` is `{ builds: Row[], counts, report }`.

**Add `findWorkAfterClaim(root, tasks)` → `Object<string, Work>`, internal and not exported
(decisions 7 and 18; findings F1, F8, TM-05, TM-06, TM-07).** It checks every candidate of one
preview together: ONE `git log` call per preview, never one per build. `Work` is `{ found:
boolean, gitFailed?: boolean, ref?: string, detail?: string }`. The result maps each task id to
its `Work`.

**One time budget per preview.** `SWEEP_GIT_BUDGET_MS = 5_000` (module constant, not exported).
`deadline = Date.now() + SWEEP_GIT_BUDGET_MS` is taken once at the top. Before EVERY spawn,
`remaining = deadline - Date.now()`. When `remaining <= 0`, that spawn does not run, and every
task whose answer is not yet known gets `{ found: true, gitFailed: true, ref: 'timeout', detail:
'not checked in time' }`, which counts as work found. Each spawn's `timeout` is `remaining`. The
dashboard, the preview and the apply all go through `previewSweep`, so all three use this
budget (decision S2-12).

**One environment for every git call (finding TM-07, same rule as slice 1's decision S1-10).**
`gitEnv()` returns a copy of `process.env` without any key matching `/^GIT_/i` (case-blind:
Windows environment keys are case-insensitive; finding C04). It is a local helper, not an
import from slice 1's module, so it holds whichever slice lands first. Every spawn is
`require('child_process').spawnSync('git', args, { cwd, encoding: 'utf8', timeout: remaining,
maxBuffer: 64 * 1024 * 1024, windowsHide: true, shell: false, env: gitEnv() })`.

**The minimum git version (finding C05, decision S2-27).** *Believed:* `git worktree list
--porcelain -z` needs git 2.36, and the `%S` log placeholder needs git 2.21; so the minimum is
2.36. Nothing probes the version up front. When any git call below exits with status 129 (git's
usage-error status, which an unknown option gives), one `git --version` call runs, with the same
environment and a timeout from the same budget (`remaining <= 0` skips it). When its stdout
parses (`/(\d+)\.(\d+)(?:\.(\d+))?/`) to a version older than 2.36, the failure's `detail` is `git
<version> is older than 2.36`; when it does not parse, or the version is 2.36 or newer, the
`detail` is the usual first line of stderr. Either way it is the `git-failed` result.

Per task, before any git call:

- `startedMs = Date.parse(task.ts && task.ts.started)`. When it is not finite, the task's `Work`
  is `{ found: true, gitFailed: true, ref: 'no-start', detail: 'the task has no start time' }`.
- The task's `plan` must match `/^[A-Za-z0-9_][A-Za-z0-9._-]*$/`, otherwise `{ found: true,
  gitFailed: true, ref: 'unsafe-plan', detail: 'the plan name cannot be checked' }` (fail
  closed).
- **The declared files (TM-05).** Read `planPath = <root>/plans/in-progress/<plan>.md` with
  `safeFs.readFileSync` inside a try. A throw gives `{ found: true, gitFailed: true, ref:
  'unreadable-plan', detail: 'the plan file cannot be read' }`. Otherwise `files` is the union
  of `task.touches`, `planCoverage.readPlanFiles(planPath, content)` and
  `actions.planDeclaredFiles({ content })` (both readers, because they disagree on plans with
  several leading frontmatter blocks; more paths can only hold more builds).
  `actions.planDeclaredFiles` is not exported today (a search for `planDeclaredFiles` over
  `src/` matched 2 files: its definition and caller in `actions.js` lines 1611 and 1722, and an
  unrelated same-named function in `scope-growth.js` line 78); this slice adds it to the
  `actions.js` exports.
- **Plan paths leave `files` first (finding C01a).** Before any check, spec or matcher below is
  built, every `files` entry that, after `f.replace(/\\/g, '/')`, is `plans` or starts with
  `plans/` is dropped. The plan's own file is handled only by the log rule below (its
  `:(glob)plans/*/<plan>.md` spec and the per-task claim exclusion), so a claim rename, committed,
  staged or a plain rename, can never match a declared file.
- Each `files` entry `f` becomes `f.replace(/\\/g, '/')`. An entry that is empty, absolute (a
  leading `/`), a drive letter (`/^[A-Za-z]:/`), holds a `..` segment, starts with `:` or holds a
  control character (`stripCtl(f) !== f`) gives `{ found: true, gitFailed: true, ref:
  'unreadable-file', detail: 'a declared file cannot be checked' }` (fail closed).
- **Another repository (TM-07).** For each entry, take its literal prefix (the segments before
  the first segment holding `*`, `?` or `[`). For every NON-EMPTY leading part of that prefix (at
  least one segment: `a`, `a/b`, …; finding C10a), if `<root>/<that part>/.git` exists
  (`safeFs.existsSync`), the task's `Work` is `{ found: true, gitFailed: true, ref:
  'other-repository', detail: 'a declared file sits in another repository' }`. The empty part is
  never tested: `<root>/.git` is the project's own repository and exists in every git fixture.
- The task's pathspecs for the log call: `':(glob)' + f` per remaining entry, plus
  `:(glob)plans/*/<plan>.md` for the plan's own file at any stage. A touch starting with `:` is
  refused before git runs, so the only magic that reaches git is this module's own `:(glob)`
  prefix. The status calls get only the `files` specs (Calls 4…).
- The task's matchers, for splitting git's answer per task in code: `planCoverage.globToRegex(f)`
  per entry, plus a test that a path equals `f` or starts with `f + '/'` (a folder entry).
  `globToRegex` is exported (`plan-coverage.js` line 679) and never throws (its JSDoc, lines
  193–205).

Tasks whose `Work` is already set above take no part in the git calls. When none remain, no git
runs.

**Call 1, the folder offset (F1).** `git rev-parse --show-prefix` with `cwd: root`. Its trimmed
stdout is `prefix` (`''` at the repository's top, `sub/` when the CTOC root is a subfolder). A
failure gives every remaining task `{ found: true, gitFailed: true, ref: 'git-failed', detail:
<first line of stderr or error message, stripCtl, capped at 120> }`, and nothing else runs.

**Call 2, the commits.** `sinceSec` per task is `Math.floor(startedMs / 1000)`; `minSince` is the
smallest of them. `specs` is the union of every remaining task's pathspecs.

```js
['--no-replace-objects', '-c', 'log.showSignature=false', '-c', 'core.quotePath=false', 'log',
 '--branches', '--remotes', '--full-history', '--diff-merges=first-parent', '-M', '--relative',
 '--name-status', '--no-color',
 '--since=' + new Date((minSince - 86400) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
 '--format=%x01%H%x09%ct%x09%S', '--', ...specs]
```

- `--no-replace-objects` and `log.showSignature=false` keep a replace ref or a signature
  setting from changing what is read or printed (F1).
- `-c core.quotePath=false` prints a path holding non-ASCII bytes (`src/café.js`) verbatim
  instead of as a quoted octal escape, so it matches its declared file (finding C14). A path git
  still quotes (one holding a control character, `"` or `\`) matches no matcher; such a record
  stays fail closed through step 5 below, unless another path on it ties it to a task.
- `--diff-merges=first-parent` prints a merge's changes against its first parent, so a merge
  that brings a branch's claim commits in shows them as claim lines and is read by the same
  steps as any commit (finding C15). *Believed:* available from git 2.31, below this plan's 2.36
  minimum; the CTO Chief measured this machine's git as `git version 2.54.0`. On an older git
  the call exits 129 and the version probe below names it. A merge git still prints with no
  lines stays fail-closed work (step 2; round-1 decision F6).
- `--relative` prints paths relative to the CTOC root, so the claim test below holds when the
  CTOC root is a subfolder of the repository (F1, case B8e). Pathspecs are already read from
  `cwd`.
- `--branches --remotes` look at every local and remote-tracking branch (decision 18; TM-07).
- `--since` is a traversal bound with one day of slack against clock skew, with no milliseconds
  (TM-07). The exact test per task is made in code, below.
- `r.error`, or `r.status !== 0`, gives every remaining task `{ found: true, gitFailed: true,
  ref: 'git-failed', detail: <first line of r.stderr or r.error.message, stripCtl, capped at
  120> }`. A timeout and an output overflow fall here too (decision 7).

Reading the output, per record:

- Split `r.stdout` on `'\u0001'`. The text before the first `\u0001` is not a record (the format
  starts every record with `%x01`, so that chunk is always empty), and an empty stdout means no
  commit matched. Each record is a header line `<sha>\t<ct>\t<source>` followed
  by name-status lines. A record whose header does not parse (no 40- or 64-hex sha, or `ct` not
  an integer) counts as work found for every remaining task, with detail `a commit could not be
  read` (fail closed).
- A task X's **claim line** is the name-status line `R100\t<from>\t<to>` with `to ===
  'plans/in-progress/<X.plan>.md'`, `from` starting `plans/` and ending `/<X.plan>.md`, and `from
  !== to`. Read: `startExecution` is a pure rename (`actions.js` lines 997–1000), and `movePlan`
  renames without touching the bytes (lines 95–127). So a claim commits as a 100% rename, and a
  plan sync that commits several claims at once puts several claim lines in ONE record (case B8).

Each record is then read in this order; the first step that decides it wins (finding C01b):

1. Drop every empty line inside the record (finding C10b). The remaining lines are its
   name-status lines; `paths` is every path on them (both sides of a rename or copy).
2. **No lines left** (a merge, or `%S` empty): the record is work for EVERY remaining task whose
   start it follows (fail closed; F6).
3. **Only claims:** when every line is the claim line of some remaining task, the record is work
   for no task, and step 5 does not apply to it.
4. **Per task.** For each remaining task X: skip the record when `Number(ct) < sinceSec(X)` (a
   commit in the same second as the start counts as after it, the safe direction). Otherwise
   remove X's own claim line from the record, if present, and the record is X's work when any
   path left on the remaining lines matches one of X's matchers or is `plans/<stage>/<X.plan>.md`.
   Another task's claim line is never removed for X; it only counts for X when it matches X's
   matchers or X's plan path, which, with `plans/` dropped from `files` (C01a), it cannot.
5. **Tied to no task, decided on matching alone (finding C13):** a record that reached step 4,
   in which no remaining path (after removing the claim lines of every remaining task) matches
   ANY remaining task's matchers or plan path, whatever the time test of step 4 said, is work for
   every remaining task it follows, detail `a commit could not be tied to one build` (fail
   closed: git's glob and `globToRegex` disagreeing, or a path git still quotes). A record whose
   paths match only a task that started after it is tied to that task and is work for nobody
   (case B11h).
- The first work record per task gives `{ found: true, ref: sha, detail: 'commit <sha first 12>
  on <source without refs/heads/ or refs/remotes/>' }`. An empty source shows as "a local
  branch". `%S` prints the ref through which the commit was reached (*believed*: git ≥ 2.21; if
  it does not expand, the detail shows the literal and case B8's `other-b` assertion for `we`
  fails).

**Call 3, the worktrees (TM-07).** `git worktree list --porcelain -z` with `cwd: root`. Fields
are NUL-separated and blocks end with an empty field. Each block's first field is `worktree
<path>`; a block holding `bare` or `prunable` is skipped (a pruned dead agent's folder must not
hold every build). A failure gives every task still `found: false` the `git-failed` result; an
exit status of 129 runs the version probe above, so a git older than 2.36 reads `git <version>
is older than 2.36` (case B23).

**Calls 4…, uncommitted changes.** For each listed worktree, `git --no-optional-locks status
--porcelain -z --untracked-files=all -- <file specs only>` with `cwd: path.join(<worktree>,
prefix)`. `--no-optional-locks` is a global option, placed before `status`, on EVERY status call
(finding C03): a status must never take the index lock a live builder in that worktree may need
(*believed*: without it `git status` may write a refreshed index under `index.lock`; case B17a
asserts every status call carries the option). No path under `plans/` is among these specs,
because every `files` entry under `plans/` was dropped before the specs were built (C01a) and
the plan's own `:(glob)plans/*/<plan>.md` spec goes only to the log call. So a claim that is
staged, or left as a plain uncommitted rename, is never uncommitted work (case B8).
*Believed:* pathspecs are read from `cwd`, and porcelain paths are relative to the worktree's
top, so `prefix` is stripped from each output path before matching. Case B8e fails if either is
wrong. Entries are NUL-separated `XY <path>`; a rename or copy entry (`X` or `Y` is `R` or `C`)
is followed by one more NUL-separated field, the source path, and both paths are read. Any
entry matching a task's matchers gives `{ found: true, ref: 'uncommitted', detail:
'uncommitted changes in <worktree path, stripCtl, capped at 120>' }`. A missing `cwd` folder or a
failed call gives the `git-failed` result to every task still `found: false`.

- A task with no work record and no uncommitted entry is `{ found: false }`.

**Add `previewSweep(root, opts = {})` → `SweepVerdict`. Exported. It makes no task-registry
write, no plan move and no cleanup-log write** (decision S2-14).

- `now = Number.isFinite(opts.now) ? opts.now : Date.now()`.
- `reg = taskRegistry.load(root)` inside a try. A throw returns `{ builds: [], counts: zero
  counts, report: { …empty report arrays…, corrupt: { reason: 'load-failed' } } }`. That is
  what keeps `tests/dashboard-survives-unreadable-registry.test.js` cases 4–5 (the
  `could not be read (load-failed)` line) passing unchanged.
- `inProgress = readPlans(path.join(getPlansDir(root), 'in-progress')).map((p) => p.name)`.
- `first = sweepVerdict(reg, { inProgress, liveAgentIds: opts.liveAgentIds, now })`.
- `work = findWorkAfterClaim(root, <the registry tasks of every would-go-back row>)`, one call.
- Return `first` when there is no `would-go-back` row, else `sweepVerdict(reg, { …, work })`.
  Both calls use the same `now`.
- The dashboard, `menu task sweep` and `applySweep` all call this one function, so their counts
  cannot disagree (scenario 2.2).

**Add `applySweep(root, opts)` → `SweepResult`. Exported.** `opts = { confirm: Array<{ plan:
string, token: string }>, liveAgentIds?: string[], now?: number, by?: string }`. `confirm: []`
names nothing.

0. `now` is resolved once, first: `const now = Number.isFinite(opts.now) ? opts.now :
   Date.now();` Every call below receives this `now` (F16).
1. Compute `preview = previewSweep(root, { liveAgentIds, now })`.
2. **The staleness check.** For each confirmed item, find the rows whose `plan` matches. If there
   is not exactly one, or its `token` differs, return `{ ok: false, stale: true, preview }` with
   no write at all (decision 6, scenario 2.9; TM-16).
3. Let `named` be the set of confirmed plans. `eligible` is the `would-go-back` rows in it.
4. `blocked` is the eligible rows where `plans/todo/<plan>.md` already exists. `movePlan` would
   refuse to overwrite it (`actions.js` lines 120–125), so those builds are kept off the registry
   change rather than marked dead with no move. `go` is the rest of `eligible`.
5. `before = taskRegistry.load(root)` (inside a try; a throw leaves `before` null), kept for the
   compensating write in step 8.
6. `const { report } = taskReconcile.reconcileState(root, { liveAgentIds, now, onePass: true,
   releaseBuilds: go.filter((r) => r.status === 'running').map((r) => r.id) })`.

   This applies the task changes that move no plan, plus the dead-marking of the named eligible
   builds. Inside its compare-and-swap, `reconcile` judges each named build again by the same
   rules, so a build stamped alive in between is not marked dead (decision 19). It also runs the
   temporary-file sweep (`task-reconcile.js` lines 620–625), which now happens only here and in
   the Doctor key, never at render.
7. **What may move (F2, F4).** `released` is:
   - every `go` row with `status === 'orphaned'` (R2), taken from the preview's own records, so
     a task this same reconcile swept by retention still moves its plan (case B16) — except,
     when `report.saveFailed` is set, an R2 row that still carried the `staleness` marker (its
     release was not saved);
   - every `go` row with `status === 'running'` (R1) whose id is in `report.orphaned`, only when
     `report.saveFailed` is not set.

   `moved = released.length ? recoverOrphanedPlans(root, { now, released, log }) : empty`, where
   `log` maps each plan to `{ by: 'menu task sweep', code: row.code, token: row.token,
   liveCount, liveSha256, requester }` (decision S2-15). `liveCount` is the live list's size or
   `null`; `liveSha256` is `liveHash`; `requester` is `` `${stripCtl(opts.by).slice(0, 80)}
   (declared, not verified)` `` when `--by` was given, else `'not declared'`.
8. **The compensating write (TM-19).** For each `moved.skipped` entry whose reason starts `move
   failed:` and whose plan belongs to an R1 row: `taskRegistry.withRegistry(root, (reg, ctx) =>
   …)` replaces that task with its record from `before`, only when the task on disk is still
   `orphaned` with `ts.done === new Date(now).toISOString()` (the record this apply wrote);
   otherwise `ctx.abort()`. A throw is caught and its message joins the row's not-moved reason
   ("and its task could not be restored: <msg, stripCtl, capped at 120>"). The build is then as
   it was before the apply: running, its files and slot held.
9. Return `{ ok: true, stale: false, preview, report, moved: moved.recovered, notMoved, unnamed:
   <count of would-go-back rows not named>, waiting: preview.counts.buildsBack -
   moved.recovered.length }`. `notMoved` lists, once each and in row order, EVERY named row not
   in `moved.recovered`, with its reason:
   - a named row not in `eligible`: its own row reason;
   - `blocked`: `a plan of the same name already waits in the build queue`;
   - an R1 row skipped because `report.saveFailed` is set: `the task changes could not be
     saved`;
   - an R1 row not in `report.orphaned`: `judged alive again when the sweep was applied`;
   - a `moved.skipped` or `moved.surfaced` entry: its reason (plus the restore note of step 8).

**Exports become:** `{ recoverOrphanedPlans, sweepVerdict, previewSweep, applySweep }`.

- `sweepVerdict` has an intra-module caller, `previewSweep`. Per the definition in
  `.ctoc/export-reachability-baseline.json`, that counts as live.
- `previewSweep` is called by `menu-screens`.
- `applySweep` is called by `menu-screens` and `tools.js`.
- `recoverOrphanedPlans` is called by `applySweep`, intra-module.
- `findWorkAfterClaim`, `gitEnv` and `SWEEP_GIT_BUDGET_MS` are not exported.

#### File: `src/lib/actions.js`
**Action:** MODIFY (one export line)

- Add `planDeclaredFiles,` to `module.exports` (line 2461). Its live caller is
  `plan-recovery.findWorkAfterClaim`. No other line changes.

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** A read-only dashboard, the `menu task sweep` route, and honest agent ids.
**Change Type:** modify-existing + new functions (none exported)

**`buildDashboardTable` (starts at line 499; its TASKS block is lines 546–643).** Replace the
reconcile block (566–582) and the recovery block (583–606) with:

```js
  // The dashboard makes no task-registry write, no plan move and no cleanup-log write (owner,
  // 2026-10-18). It previews what `menu task sweep` would do (src/lib/plan-recovery.js
  // previewSweep) and says so.
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

**Add `renderSweepLine(preview)`** → `string`, beside `renderWedgeReports`. It is total (F12):
it never throws.

- It returns `''` when `preview` is not an object, when `preview.counts` is not an object, or
  when any count it reads is not a finite number (a malformed preview), and when
  `counts.pending + counts.deadHeld + counts.notYet === 0`. That keeps a clean project's
  dashboard byte-identical.
- Otherwise it returns one line, `  ⚠ <parts joined by ', '>: review them with \`menu task
  sweep\`\n`. The parts, each present only when its count is above 0, in this order, with
  singular and plural spelled out:
  - `<b> build(s) would go back to the build queue when you name it/them`
  - `<d> dead build(s) cannot go back on its/their own (work was found after the claim, or it could not be checked)`
  - `<n> build(s) show(s) no sign of life (it/they can be named once it is/they are 240 min old)`,
    the bound read from the rows (F5)
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
- Add `case 'sweep': return taskSweep(root, rest, opts.liveAgentIds);` directly after the line
  `case 'board': return taskView.renderTaskBoard(loadReg(root));` (line 2756).
- In `route`, the line `return taskCommand(args.slice(2), projectPath);` (line 2805 on origin/main
  6.14.130; found by its text, not its number, since slice 1 adds a `menu settings` branch to the
  same function) becomes `return taskCommand(args.slice(2), projectPath, opts);`.

**Add `parseSweepArgs(words)`** → `{ ok: true, confirm: null | Array<{plan, token}> }` or
`{ ok: false, text }`. Its own parser.

- `[]` gives `confirm: null`, the preview.
- `['--confirm', 'none']` gives `confirm: []`.
- `['--confirm', list]` splits `list` on `,` into items of the form `<plan>@<token>`. Each `plan`
  must match `/^[A-Za-z0-9_][A-Za-z0-9._-]{0,199}$/` and each `token` `/^[0-9a-f]{12}$/`. The
  same plan with two different tokens is refused. Duplicates are merged.
- An optional `--by <name>` (after the confirm list) is the declared requester for the
  cleanup-log entry (F18). It is control-stripped and capped at 80 (the same treatment slice 1
  specifies for its own `--by`; no code is shared, so the order of the slices does not matter).
  It is accepted only with `--confirm`.
- Anything else is refused with "`menu task sweep` takes nothing, `--confirm <plan>@<token>,…`
  from its preview, or `--confirm none`, optionally followed by `--by <name>`; nothing was
  changed." The offending word is shown after `stripCtl`, capped at 40.

**Add `taskSweep(root, words, liveAgentIds)`.**

- A parse refusal returns `{ ok: false, refused: true, text, ask: <◀ Back to dashboard>, actions }`.
- `confirm === null` returns `sweepScreen(root, planRecovery.previewSweep(root, { liveAgentIds
  }), '')`.
- Otherwise call `res = planRecovery.applySweep(root, { confirm, liveAgentIds, by })`:
  - when `res.stale`, return `sweepScreen(root, res.preview, 'Nothing changed: what you confirmed
    no longer matches the sweep (a build changed since). This is the sweep now; confirm again
    from it.')` with `ok: false, stale: true`;
  - else return `appliedScreen(root, res)`. Attach `promote: computePromote(loadReg(root)).promote`
    when it is non-empty, since freed slots can make queued tasks runnable. The session launches
    them as the COMPLETION recipe's step 3 says.

**Add `sweepScreen(root, preview, lead)`** → `{ ok: true, text, ask, actions, sweep: { builds:
[{ plan, id, group, code, reason, token }], counts } }`. The text holds:

- `lead` as the FIRST line when it is given (F11: a stale apply's text starts with `Nothing
  changed`, asserted in B9), then the title `Background tasks ▸ Sweep — a preview, nothing has
  changed` and a rule of 40 `─`;
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
  existing helper at line 2700, ONLY for a plan in the preview's in-progress set (TM-17).
  Any other plan shows as `stripCtl(plan).slice(0, 80)`, and no path is built from it.
- A row with `safeId === false` shows no way-out command; a row with `safePlan === false` is
  never in the confirm action (TM-04).
- No raw stage folder name reaches the text (the vocabulary rule pinned by
  `tests/dashboard-says-the-moment.test.js` line 46).
- Options:
  - when some row would go back: `Send back the <n> plan(s) listed first` →
    `menu task sweep --confirm <plan>@<token>,…`;
  - when the counts other than builds are above 0: `Free only the other tasks` →
    `menu task sweep --confirm none` (asserted in case B20h);
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
  their slots freed · …`, from `res.report`. "Other tasks" is `report.orphaned` plus
  `report.cancelled` MINUS the ids of every build row (F14), and "files released" leaves out
  the R2 build ids, so a named build is never counted twice;
- when `res.report.saveFailed` is set: `⛔ the task changes could NOT be saved:
  <stripCtl+cap 120>`.

**Module header** (lines 1–21): one Usage line, `node start.js menu task sweep [--confirm …] ->
taskSweep()`.

#### File: `src/tabs/tools.js`
**Action:** MODIFY
**Purpose:** "Repair state" is the sweep with no plan named (decision 22).

- Line 17: `const { reconcileState } = require('../lib/task-reconcile');` becomes `const
  planRecovery = require('../lib/plan-recovery');`.
- The body of the `'2'` branch, lines 415–426 (between `if (key.sequence === '2') {` at line 414
  and `return true;` at line 427), becomes:

  ```js
      // Repair state — the sweep with NO plan named (owner, 2026-10-18): it applies only the task
      // changes that move no plan; a dead build waits for the human to name it in `menu task sweep`.
      let res = null;
      try {
        res = planRecovery.applySweep(app.projectPath, { confirm: [] });
      } catch (err) {
        app.message = `Repair: the task check could not run (${stripCtl(String((err && err.message) || err)).slice(0, 120)})`;
      }
      const report = res && res.report;
      if (report && report.corrupt) {
        app.message = `Repair: could not read task state (${report.corrupt.reason})`;
      } else if (report && report.saveFailed) {
        app.message = `Repair: the task changes could NOT be saved (${stripCtl(String(report.saveFailed)).slice(0, 120)})`;
      } else if (report) {
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

- `stripCtl` is the file's own sanitizer, a local function at `tools.js` line 240 (read).
- The `try/catch` is F2's guard: a throw from the sweep becomes one plain message, never a
  crashed TUI (case B20g).
- The label "2. Repair state" (line 85) is unchanged.

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** The session stamps the real id and sweeps only on the human's word (decision 8,
scenario 2.12).

Line numbers below are origin/main 6.14.130's. Each edit is located by the quoted text (or the
section heading) it names, so it holds whether or not slice 1's start.md edits landed first
(decision S2-26).

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
    changes that move no plan. It changes no task, moves no plan and logs no clean-up.
  - `menu task sweep --confirm <plan>@<token>,…` is run only with the plans the HUMAN named in his
    own reply on that preview, each with the token the preview printed. Never on your own
    initiative, never naming a plan he did not name, always with the EXACT `--live-agent-ids`
    list passed to that preview, even if the harness list has changed since (every token carries
    that list's fingerprint; a different list returns the new preview). A changed plan returns
    the new preview: show it.
  - `--confirm none` applies only the task changes that move no plan, on his word too.
  - A background agent cannot run `--confirm`: the write protection refuses it. Report the
    preview and let the main session ask him.
  - The confirmation carries the human's name for the log with `--by <name>`; it is recorded as
    declared, not verified.
  - A sweep's `promote[]` is handled as in the COMPLETION recipe's step 3.
  - A project that is not a git repository can never send a dead build back: the work check
    cannot answer, and that counts as work found (decision 7). Such a build ends with `menu task
    complete <id>` or `menu task fail <id>`.
- **Line 65 (`claude:start-agent`):** "to stamp the live id (so the on-open reconcile never
  falsely orphans it)" becomes "to stamp the live id (so a sweep never treats it as dead)" (F7).
- **Lines 396–404 (cancel):** "stay locked until `task-reconcile` confirms the harness agent is
  gone" becomes "stay locked until a sweep or Repair state confirms the harness agent is gone",
  and "a running-cancel holds its slot until reconcile confirms death" becomes "… until a sweep
  or Repair state confirms death". Add one sentence: "A cancelling build is not held back from a
  sweep the way a running one is: the human's cancel already names it." (F7; `releaseBuilds`
  holds only `status === 'running'`.)
- **Line 355 (classify):** "then `menu task start <id>`" becomes "then `menu task start <id>
  --agent-id <the harness agent id>`".
- **Line 423 (Rule 12):** "dispatch `Agent(run_in_background)` + `menu task start`" becomes
  "dispatch `Agent(run_in_background)` + `menu task start <taskId> --agent-id <the harness agent
  id>`".
- **The Navigation Commands table** gains, directly after its row `| \`tasks\` · \`task {id}\` |
  Background task board / task detail |` (line 40 on origin/main 6.14.130; not slice 1's `menu
  settings` row, which may or may not exist yet): `| \`menu task sweep\` · \`menu task sweep
  --confirm {plan}@{token},…\` · \`menu task sweep --confirm none\` | The sweep: a preview naming
  every build's group and reason, and the human's confirmation that sends named dead builds back
  to the build queue (the only route that does) |`.
- **The sweep section** states the minimum git version: "The work check needs git 2.36 or newer
  (believed: `git worktree list --porcelain -z`); on an older git every dead build is held with
  the reason `git <version> is older than 2.36`." (finding C05)

#### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY

Every edit below is located by the quoted text of origin/main 6.14.130, never by a line slice 1
adds (decision S2-26).

- **The allowed-table row** "| `menu`, `menu commands`, `dashboard` | the pipeline dashboard: task
  reconcile and orphan recovery (in-progress back to todo, not a human gate) |" (line 375)
  becomes "| … | the pipeline dashboard: a preview of `menu task sweep`; it changes no task,
  moves no plan and logs no clean-up |".
- **The refused table** (lines 358–369) gains ONE row (decisions S2-9 and S2-25), inserted
  directly after its row "| `menu task complete <id> … --continue` | the continuation: crossings,
  planner and classification tasks, builds started |" (line 368) and before "| any route not in
  the allowed table | fail closed |" (line 369): `| \`menu task sweep …\`; and any command whose
  text, with \`'\`, \`"\` and \`\\\` removed, holds both \`sweep\` and \`--confirm\`, or holds
  \`applySweep\` | the sweep marks tasks dead, frees slots and, on the human's named
  confirmation, moves plans back to the build queue. The confirmation is refused with its own
  sentence whatever the 2026-10-15 switch (\`RECORD_REFUSALS_OFF\`) says ("CTOC refused this call
  because only the human confirms which builds go back to the queue; report the sweep preview and
  let the main session ask him. A command that only mentions both words is refused too: search
  one word at a time, and commit with git commit -F <file>."); the preview is refused only when
  that switch is off |`.
- **The crash paragraph after the allowed table** ("A crash on a background agent's call whose
  tool input mentions `start.js`, `menu-screens` or `streaming-gate` refuses with the
  \"protection failed to run\" sentence; …", lines 381–384) gains, after "sentence": ", except a
  sweep confirmation, which gets the sweep sentence (see the fail rule)".
- **The fail-rule paragraph** ("**Fail rule.** A crash refuses only a call that mentions the
  records, …", lines 397–403) gains, after its first sentence: "A crash on a background agent's
  call whose tool input, with quotes and backslashes removed, holds both `sweep` and `--confirm`,
  or holds `applySweep`, refuses with the sweep sentence above instead (finding C09)."

#### File: `src/hooks/protect-records.js`
**Action:** MODIFY (one refusal; decision S2-9)
**Purpose:** Only the human confirms a sweep. A background agent can run every menu route today
(the owner's switch `RECORD_REFUSALS_OFF`, lines 597–606), so without this a background agent
could run `menu task sweep --confirm …`.

The edit is four pieces and nothing else (the constant, the test, one `if` in `bashRefuses`,
one branch in the fail rule; plus the header sentences), so the merge with the branch "a
background agent cannot change Claude Code's settings", which rewrites this file, stays small:

1. A constant beside the other refusal sentences, placed directly after the two-line
   `REFUSAL_UNCHECKED` constant (lines 118–119), before the `REFUSAL_QUOTE` comment at line 120
   (finding C10c):

   ```js
   const REFUSAL_SWEEP_CONFIRM = 'CTOC refused this call because only the human confirms which builds go back '
     + 'to the queue; report the sweep preview and let the main session ask him. A command that only '
     + 'mentions both words is refused too: search one word at a time, and commit with git commit -F <file>.';
   ```

   The last sentence (finding C08) tells a background agent refused for a harmless search or
   commit message how to proceed, so the accepted false positive costs it one retry, not a stall.

2. One test, beside it:

   ```js
   /** A background agent's sweep confirmation, read fail-closed: quotes and backslashes removed, anywhere in the text. */
   const confirmsSweep = (command) => {
     const flat = command.replace(/["'\\]/g, '');
     return (/sweep/i.test(flat) && /--confirm/i.test(flat)) || /applysweep/i.test(flat);
   };
   ```

   The `applysweep` arm (decision S2-25) also refuses inline code that calls the apply by name
   (`node -e "require('./src/lib/plan-recovery').applySweep(…)"`), the nearest way around the
   route once the route is refused; inline code naming `src/lib/` is otherwise allowed to a
   background agent since 2026-10-15 (existing case 88).

3. One `if`, the FIRST statement of `bashRefuses` (line 599), before the `if
   (RECORD_REFUSALS_OFF)` early return at line 602, so it holds whatever that switch says:

   ```js
     // Owner, 2026-10-18: only the human confirms a sweep. Holds whatever RECORD_REFUSALS_OFF says.
     if (subagent && confirmsSweep(command)) return REFUSAL_SWEEP_CONFIRM;
   ```

4. **One branch in the fail rule (finding C09).** When `decide` throws (a module that fails to
   load, a payload `cwd` that does not exist, a non-string command), `main`'s catch (lines
   679–691) decides. Today a background agent's sweep confirmation reaching it would be refused
   with `REFUSAL_UNCHECKED` only if it also names a menu module, and allowed otherwise (the
   `applySweep` inline code names none). A new branch is placed directly BEFORE the existing `if
   (UNCHECKED_SUSPECT_RE.test(scanned) || …)` at line 687, so the sweep sentence wins over the
   unchecked one:

   ```js
       // Owner, 2026-10-18: a background agent's sweep confirmation fails closed with its own sentence.
       if (parsed && isSubagent(payload) && confirmsSweep(scanned)) {
         refuse(REFUSAL_SWEEP_CONFIRM);
       } else if (UNCHECKED_SUSPECT_RE.test(scanned) || (parsed && isSubagent(payload) && MENU_MENTION_RE.test(scanned))) {
         refuse(REFUSAL_UNCHECKED);
       }
   ```

   The existing condition is kept word for word as the `else if`; only the `if` before it is new.
   `scanned` is `JSON.stringify(payload.tool_input)` when the payload parsed (line 683), and
   `confirmsSweep` strips the `"` and `\` that serialisation adds. The branch is `parsed`-only,
   because `isSubagent` reads the parsed payload; an unparsable payload keeps today's rule.

- `subagent` is `isSubagent(payload)` (line 654; a non-empty `agent_id`, line 276). A call
  without `agent_id` is unchanged.
- Refusal goes through the existing `refuse` (lines 664–667): the sentence on stderr, the deny
  JSON on stdout, exit 2.
- It does not re-enable the switched-off refusals. It adds a refusal for a route that did not
  exist on 2026-10-15, so it reverses nothing the owner removed.
- **Header** (lines 26–92): after line 73 ("… is refused (fail closed)."), add: "Whatever
  `RECORD_REFUSALS_OFF` says, a background agent's command whose text, with quotes and
  backslashes removed, holds both `sweep` and `--confirm`, or holds `applySweep`, is refused
  with its own sentence: only the human confirms which builds go back to the build queue
  (owner, 2026-10-18). When the hook itself fails to run, such a call is refused with the same
  sentence. A script file that runs the confirmation, inline code moving a plan by other means,
  or text built at run time, is not caught."
- **Accepted false positive:** a background agent's read or commit whose text names both words
  (`grep -n "sweep --confirm"`, `git commit -m "… sweep --confirm …"`) is refused too. A builder
  searches one word at a time and commits with `git commit -F <file>`; the refusal sentence
  itself says so (C08). This slice's own builder
  is such an agent once the hook is installed; the release, not the worktree, installs it.

#### File: `tests/the-dashboard-never-sends-live-work-back.test.js`
**Action:** CREATE. It holds the cases in the Test Plan below.

#### Existing tests whose contract the owner replaced on 2026-10-18

Each case below is rewritten in place. Its first comment line reads "Contract replaced 2026-10-18
(owner): opening the dashboard changes no task and moves no plan; a dead build moves only when the human names it in
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
  - **Case 12** injects `planRecovery.previewSweep = () => ({})` (a malformed preview, F12): the
    render does not throw, holds no sweep line, and holds no wedge line.
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
  - Add three cases: `saveFailed` gives `/could NOT be saved/`; `waiting: 2` gives `/2 builds wait
    for you to name them: menu task sweep/`; an `applySweep` that throws `boom\u001b[31m` gives
    `/Repair: the task check could not run \(boom\[31m\)/` and `handleKey` still returns `true`
    (case B20g).
- **`tests/menu-protocol.test.js`.** Add scenario 2.12; see case B15.
- **`tests/protect-records.test.js`.** Not a replaced contract: five cases are added at the end,
  in a new `describe` "only the human confirms a sweep (owner, 2026-10-18)", numbered 97–101 after
  the file's last case, 96 (see the Test Plan). Every existing case stays as it is: a search for
  `sweep` in this file matched 0 lines, and none of the background-agent routes of
  `tests/plans-keep-moving-without-the-human.test.js` (lines 1121–1131) holds `sweep`.
- **Must pass unchanged** (Step 14 proves it): `tests/dashboard-survives-unreadable-registry.test.js`,
  `tests/menu-task-wiring.test.js`, `tests/scheduler-enforced.test.js`,
  `tests/promote-quarantine-parity.test.js`, `tests/task-reconcile.test.js`,
  `tests/task-reconcile-coverage.test.js`, `tests/task-reconcile-quarantine-fault.test.js`,
  `tests/plan-recovery.test.js`, `tests/plans-keep-moving-without-the-human.test.js`,
  `tests/cache-freshness.test.js`, `tests/dashboard-says-the-moment.test.js`.
  If one fails, the build stops at Step 14 and reports it. It never edits a file this list does
  not declare.

#### Files: `CLAUDE.md`, `README.md`
**Action:** MODIFY (the documented test-file count only). Set from disk at Step 15, never from a
number written here (decision S2-26).

| File | Where (origin/main 6.14.130, read) | Today | Becomes |
|---|---|---|---|
| `CLAUDE.md` | line 61, `# Run all 574 test files` | `574` | the number of `tests/*.test.js` files on disk at Step 15 |
| `CLAUDE.md` | line 94, `tests/  574 test files` | `574` | the same number |
| `README.md` | line 1145, `574 test files (run with \`npm test\`)` | `574` | the same number |

- This slice adds one test file and no `src/lib` module, so on origin/main the number is 575 and
  the `lib/  135 JS modules` line (CLAUDE.md line 89) is not touched. If slice 1 landed first,
  the number is whatever is on disk then (slice 1 adds its own test file and a module).
- Whichever slice builds second rebases onto the first and recounts; the edit is never a
  hand-merged pair of numbers. `tests/readme-numbers.test.js` and the documented-counts check
  fail if the number is wrong.

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
   which syncs counts, or by recounting on disk (decision S2-26).
6. **The hook.** This slice edits `src/hooks/protect-records.js` (a constant, a test, one `if` in
   `bashRefuses`, one branch in `main`'s fail rule, and the header sentences) and appends cases
   97–101 to `tests/protect-records.test.js`. The branch "a background agent cannot change Claude
   Code's settings" rewrites the same file. Expected conflicts: `bashRefuses`' opening lines, the
   fail rule in `main`, the header's WHAT IT REFUSES paragraph, and the end of the test file.
   Resolution: take that branch's text whole, then re-insert this slice's constant, its
   `confirmsSweep` test, its `if` as the first statement of `bashRefuses` ahead of any switch,
   and its fail-rule branch ahead of that branch's own fail-rule refusal; renumber cases 97–101
   after that branch's last case.
7. **The other branches.** `sweepVerdict` is pure and exported, so the parallel-workers plans'
   `menu task release-silent` can call it. Those plans must re-base on `menu task sweep` (parent
   plan, line 85).
8. **`computePromote` and the start (F15).** On local main, `computePromote` takes `root`: pass
   it in `taskSweep`'s `promote` call. On local main a build is claimed before its launch, so
   cases B0 and B3 put the plan in `plans/todo/` and let `menu task start` claim it into
   `in-progress/`, instead of seeding it in `in-progress/`.

## Wiring — the live call sites

| New or changed code | Live call site | Root |
|---|---|---|
| `planRecovery.previewSweep` | `menu-screens.buildDashboardTable` → `dashboardPipeline` (line 744) and `dashboardCommands` (line 1625, with no options, so no live list) | `start.js` `main()` (line 953) → `route(['menu'])`, `route(['dashboard'])`, `route(['menu','commands'])`, which `/ctoc:start` runs |
| `confirmsSweep`, `REFUSAL_SWEEP_CONFIRM` | `protect-records.bashRefuses` ← `decide` (line 654) ← `main`; and `main`'s fail rule (line 687) when `decide` throws | Claude Code's `PreToolUse` on every Bash call (`hooks/hooks.json`) |
| `actions.planDeclaredFiles` (new export) | `plan-recovery.findWorkAfterClaim` | the sweep, the dashboard, the Doctor key |
| `planRecovery.previewSweep`, `applySweep` | `menu-screens.taskSweep` ← `taskCommand` `case 'sweep'` | `route(['menu','task','sweep',…])` from `start.js`; start.md's new section and table row |
| `planRecovery.applySweep` | `src/tabs/tools.js` Doctor key `'2'` | the TUI (`start.js` interactive mode → System → Doctor) |
| `planRecovery.sweepVerdict`, `findWorkAfterClaim` | `previewSweep` (intra-module) | as above |
| `recoverOrphanedPlans` (`released`, `log`) | `applySweep` (intra-module) | as above |
| `taskReconcile.isRealAgentId` | `menu-screens.taskTransition`; `task-reconcile.reconcile`; `plan-recovery.sweepVerdict` | `route(['menu','task','start',…])`; the sweep |
| `reconcile` `releaseBuilds`, `onePass` | `sweepVerdict` (through `reconcile`); `applySweep` (through `reconcileState`) | the sweep, the dashboard, the Doctor key |

Cases B0–B23 drive these through `route()`, `start.js` as a child process and
`tools.handleKey`, the paths a human and the session use; cases 97–101 drive the hook with real
payloads on stdin.

## Test Plan

### Tests: `tests/the-dashboard-never-sends-live-work-back.test.js`
**Action:** CREATE
**Framework:** `node:test`, `node:assert/strict`.

**Helpers.**

- `makeProject({ git = true })` makes a realpath'd `mkdtemp` folder holding the eight `plans/`
  stage folders, `.ctoc/state/` and `.ctoc/logs/` (finding C06: the logs folder exists before
  the first render, so a render that creates it is never mistaken for one that does not). With
  `git`:
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
- `tree(root)` gives the sorted list of every file and folder under `root` (`.git/` excluded)
  with each file's sha256, for the whole-tree snapshot (TM-18).
- Every git call in the helpers runs with an environment holding no key matching `/^GIT_/i`
  (finding C04), `shell: false`.
- `withSpawn(fake, fn)` replaces `require('child_process').spawnSync` for the duration of `fn`
  and restores it in a `finally` (F6). The module requires `child_process` at call time, so the
  replacement is seen.
- `sweep(root, live, ...words)` is `ms.route(['menu','task','sweep',…words], root, {
  liveAgentIds: live })`. `tokensOf(res)` reads `res.sweep.builds`.

**Cases.**

- **B0. The bug, first.** A queued build `t1` for plan `b0`, seeded with `touches:
  ['src/b0.js']` (finding C07: the plan's `files:` path, so the seed is a realistic build), with
  `b0` in `in-progress/` and a git fixture.
  - Act: `route(['menu','task','start','t1'], root)`. Set `ts.started` to 2 minutes ago, through
    `taskRegistry.load` and `taskRegistry.save`. Then `route(['menu'], root, { liveAgentIds:
    ['a1','a2'] })`.
  - Asserts, in this order (C07: the human-visible harm is asserted first, so the red output on
    origin/main names the lost build, not the id):
    - the plan file is still in `in-progress/`;
    - `t1`'s `status === 'running'`;
    - `agentTaskId === null`.
  - Red on origin/main: the agent id is `'t1'`, and the plan is in `todo/` after this one
    render.
- **B1. Scenario 2.1.**
  - Given:
    - build A, 300 min old, with no agent id;
    - build B, 10 min old, `agentTaskId: 'b-agent'`;
    - a `plan` task P, 60 min old, `agentTaskId: 'p-agent'`;
    - a `review` task D, done 8 days ago;
    - A's and B's plans in `in-progress/`;
    - a two-hour-old temporary file `.ctoc/state/tasks.json.tmp-x` (`fs.utimesSync`; F19);
    - a git fixture.
  - Act, twice each: `route(['menu'])`, `route(['dashboard'])`, `route([])` and
    `route(['menu','commands'])` (F13), with `liveAgentIds: ['zz']` and without it; then `node
    src/commands/start.js menu`, `… dashboard` and `… menu commands` as child processes with
    `cwd: root`, after one earlier `start.js tasks` run lets `ensureInitialized` (start.js line
    926) finish setting the project up.
  - Asserts:
    - `tree(root)` is equal after every render, through `route` and through `start.js` (TM-18);
      the temporary file is still there;
    - with the list: `/2 builds would go back to the build queue when you name them/`, `/1 other
      task looks dead/`, `/1 old task would leave the view/` and `/review them with `menu task
      sweep`/`;
    - without the list (and always for `menu commands`, which passes no options, line 1625):
      `/1 build would go back to the build queue when you name it/`, `/1 build shows no sign of
      life \(it can be named once it is 240 min old\)/` (B, F5), `/1 other task looks dead/` and
      `/1 old task would leave the view/`;
    - every text `doesNotMatch(/orphaned|re-queued/i)`.
  - A second project whose `tasks.json` holds `{not json`: every render above leaves `tree(root)`
    equal with exactly ONE allowed difference, the file `.ctoc/logs/task-registry.json` (created
    or grown; finding C06), whose new lines are all `registry_load_failed` entries (decision
    S2-14); the text holds `could not be read (load-failed)`. The `.ctoc/logs/` folder itself is
    not a difference, because `makeProject` created it. In the first project (a readable
    registry) no difference is allowed at all.
  - If the whole-tree snapshot shows a write by code outside this slice's files, the case stays
    red and the build kicks back with the path; it is never allow-listed.
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
      and `1 other build that would go back was not named`;
    - the "Changes that moved no plan" line holds no `other task` count: A and C are builds and
      are not counted again (F14);
    - each `cleanup.json` entry carries `by: 'menu task sweep'`, its row's `code` and `token`,
      `liveCount: 1`, `liveSha256` equal to the sha256 of `JSON.stringify(['d-agent'])`, and
      `requester: 'not declared'`; a second run naming B with `--by tijn` records `requester:
      'tijn (declared, not verified)'` (F18).
- **B8. Scenario 2.7: real claims, batched and uncommitted, are never work (finding C01c).** A
  git fixture, built in this order:
  1. Seed five unticked plans `wa`, `wb`, `wc`, `wd` and `we` in `plans/todo/` (each declaring
     `src/<slug>.js`) and commit them, dated 2020. They keep fresh mtimes, so a later
     `startAgent`'s stale clean-up leaves the plans already claimed in `in-progress/`. Then
     write `<root>/.ctoc/state/todo-order.json` as the JSON array `["wa.md","wb.md","wd.md",
     "we.md","wc.md"]` (finding C11). `readTodoQueueOrder` (`src/lib/state.js` lines 96–134)
     reads that file from `<todo>/../../.ctoc/state/` as an array of `*.md` basenames and puts
     the listed ones first, in array order; `readPlans` applies it to the `todo` folder (line
     77), and `startAgent` walks `readPlans(<plans>/todo)` in that order (`actions.js` line
     1842). The file is not committed (it sits outside `plans/`).
  2. Call `actions.startAgent(root)` four times: each is the REAL claim (`addAndClaim` plus
     `startExecution`, `actions.js` lines 1873 and 1885). Assert each returns `started: true`,
     and that the four results' `plan.name` are, in order, `wa`, `wb`, `wd` and `we`; keep each
     result's `task.id`. `wc` is still in `todo/`. (The cap is 20 running tasks,
     `task-registry.js` line 122, and the five declared files are disjoint, so no claim is
     refused.)
  3. Commit those four claims in ONE commit, dated now, as a plan sync does: `git add plans/`,
     then `git commit -m claims`. Its record holds four `R100` claim lines.
  4. Call `actions.startAgent(root)` a fifth time: assert `started: true` and `plan.name ===
     'wc'`; its claim is left uncommitted (a plain rename on disk, not staged).
  5. For each of the five tasks, stamp a real id with `route(['menu','task','start',<id>,
     '--agent-id','<slug>-agent'])` (a running task with no id accepts a stamp, decision 21),
     then set `ts.started` to 30 minutes ago through `taskRegistry.load` and `taskRegistry.save`.
     So the claim commit is dated AFTER every start: the per-task claim exclusion, not the time
     test, is what keeps it from being work.
  6. Builder `wd` commits `src/wd.js` on the current branch, dated now (`git add src/wd.js`, then
     `git commit -m wd -- src/wd.js`, so `wc`'s rename stays out of it).
  7. Builder `we` commits `src/we.js` on branch `other-b` only (`git checkout -b other-b`, the
     same kind of commit, `git checkout -`).

  - Act: preview with live list `['x']`, then name all five with their tokens.
  - Asserts:
    - `wa`, `wb` (claims committed together in one commit) and `wc` (claim uncommitted) are
      `would-go-back`/`confirmed-dead` in the preview, and all three move to `todo/`;
    - `wd` and `we` stay in `in-progress/`, with their task JSON unchanged; their rows are
      `never-moved` with `work was found after the claim`; `we`'s reason names `other-b`; each
      line holds the way-out sentence with its own task id.
  - What makes it red: the round-1 rule (a claim is skipped only when it is the record's ONE
    line) reads the batched record as work for `wa` and `wb` through their own plan paths; a
    `files` entry under `plans/` left in place (C01a) does the same; and a status call given the
    plan's path reads `wc`'s uncommitted rename as work.
  - (d) A second project with `gitFails`: its one dead build stays put, and its reason holds `git
    could not show`.
  - (e) **The CTOC root is a subfolder of the repository (F1).** `git init` in a folder `repo/`,
    the CTOC project in `repo/sub/` (its `plans/` and `.ctoc/` there), the 2020 commit made from
    `repo/`. A claim-only build (as `wa`: its plan's 100% rename committed from `repo/sub/`, no
    other commit) moves to `todo/` when named. A second build whose declared file
    `src/e.js` (under `repo/sub/`) has an uncommitted edit in the main worktree is `never-moved`
    with `uncommitted changes in`. This case is what fails if `--relative`, the status `cwd` or
    the prefix stripping (*believed* items) is wrong.
- **B9. Scenario 2.9.** A, with no id, 300 minutes old, a git fixture, and an old done task E past
  retention.
  - Act: preview, then `route(['menu','task','start','A','--agent-id','h1'])`, then record the
    registry bytes, then `sweep(root, ['h1'], '--confirm', 'A@<old token>')`.
  - Asserts:
    - `ok === false`, `stale === true`;
    - the plan is still in `in-progress/`;
    - the registry bytes are unchanged, so E was not swept either;
    - the text starts with `Nothing changed` and lists A as `never-moved`/`alive`.
  - A second act on a fresh copy: preview with `['h1']`, then the same confirm with `['h1','h2']`
    (a live list that differs from the preview's) is `stale` with no write (F9).
- **B10. Scenario 2.10.** A dead build B, 30 minutes old, with `agentTaskId: 'b-agent'` (a real
  id absent from `['x']`), for plan `b10`, and a git fixture. Its plan is in `in-progress/`,
  fully ticked, passes `validateForReview`, and its mtime is set 3 hours back with
  `fs.utimesSync` (F3).
  - Act: `res = sweep(root, ['x'], '--confirm', 'none')`, then `actions.startAgent(root)`.
  - Asserts: `res.ok === true` and `res.text` holds `Sweep applied`; `b10` is still in
    `in-progress/`, B is `running`, and `cleanedUp` does not include `b10`.
  - Red on origin/main: there is no `sweep` sub-command, so `res.ok` is not `true`. Step 8
    records that output.
- **B11. The git work check, edge cases** (all through the preview). Every build here is 300
  minutes old, has no agent id, and lives in a git fixture (F17), so it is presumed dead and
  reaches the work check.
  - (a) A build with `ts.started` set to `'not-a-date'`. It becomes presumed-dead via
    `!isFinite`. The work check gives `git-failed` with `no start time`, so the row is
    `never-moved`.
  - (b) Touches of `'../outside.js'`, `'/abs/x.js'`, `'C:/x.js'`, `''` and `'src/\u0007x.js'`
    each give `never-moved`, `a declared file cannot be checked` (F6).
  - (c) A touch of `':(exclude)src/c.js'` gives `never-moved`, `a declared file cannot be
    checked`: it is refused before git runs. A second build's touch `src/*.js`, with a commit to
    `src/d.js` after the start, gives `work-found`: the glob is honoured.
  - (d) A commit dated in the same second as the start counts as after.
  - (e) **The plan's own `files:` (TM-05).** The build's registry `touches` are rewritten to
    `['nothing/x.js']`; its plan file declares `src/e.js`; a commit to `src/e.js` dated after the
    start gives `work-found`. The same build with its plan file made unreadable (replaced by a
    folder of the same name) gives `git-failed`, `the plan file cannot be read`.
  - (f) A touch under a folder holding its own `.git` (`vendor/lib/.git` created as a folder,
    touch `vendor/lib/a.js`) gives `git-failed`, `a declared file sits in another repository`.
  - (g) A plan slug `bad slug` (with a space) gives `never-moved`/`unsafe-name` and is absent
    from the confirm action.
  - (h) **A commit tied only to a build that started after it (finding C13).** Two builds, each
    with a real id absent from the live list `['x']`, so both are `confirmed-dead` candidates of
    the work check (the exception to this case's "300 minutes old, no id"): build X, started 30
    minutes ago, declaring `src/x.js`; build Z, started 2 minutes ago (decision S2-37: "now" is
    read as just past the 60-second grace), declaring `src/z.js`. One commit to `src/z.js`, dated
    10 minutes ago. Asserts: X is `would-go-back`/`confirmed-dead` (the commit matches Z's
    matchers, so step 5 does not hold X); Z's row is `would-go-back`/`confirmed-dead`, the same
    row as in a copy of the fixture without that commit (the commit precedes Z's start). Red
    under the round-2 step 5, which held X with `a commit could not be tied to one build`.
  - (i) **A non-ASCII declared file (finding C14).** Build C declares `src/café.js`, spelled in
    the test as `'src/café.js'` (the composed form, so the plan's `files:`, the name on disk
    and git's output agree whatever an editor saves); a commit to
    it is dated after C's start; a sibling build S, declaring `src/s.js`, has no commit. Asserts:
    C is `never-moved`/`work-found`; S stays `would-go-back`. Red without `-c
    core.quotePath=false`: git prints `"src/caf\303\251.js"`, which matches no matcher, so step 5
    holds both builds.
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
    - a dead build with work found gives `1 dead build cannot go back on its own`;
    - a 45-minute-old build with no agent id gives `1 build shows no sign of life (it can be
      named once it is 240 min old)` (F5);
    - an already-orphaned, `staleness`-marked BUILD, 300 minutes old, with its plan in
      `in-progress/`, is a `would-go-back` row and does NOT add to `the files of … dead task(s)
      would be released` (F14).
  - Each is asserted on its own line, and a clean project renders none of the seven parts.
- **B14. Argument faults and the apply screen.**
  - Each of these gives `refused` and unchanged bytes:
    - `sweep(root, null, 'x')`;
    - `sweep(root, null, '--confirm')`;
    - `sweep(root, null, '--confirm', 'p@ZZ')`;
    - `sweep(root, null, '--confirm', 'p@0123456789ab,p@ba9876543210')`.
  - An unknown plan `nope@0123456789ab` gives `stale`.
  - Three dead builds named `t1`, `t2` and `t3` (F17), each 30 minutes old with a real id absent
    from the live list, all named:
    - `t1`'s plan already exists in `todo/`: `Not moved` with `a plan of the same name already
      waits`, and its task stays `running`;
    - `t2` (recorded id `gone2`) becomes alive between the apply's own preview and its
      reconcile: the live list is `['h2']`, and `taskReconcile.reconcileState` is wrapped on its
      exports object (restored in `afterEach`) so that it first stamps `t2.agentTaskId = 'h2'`
      through `taskRegistry.withRegistry`, then calls the original. `Not moved` names `t2` with
      `judged alive again when the sweep was applied`, its plan stays, and it is `running`
      (F4);
    - `t3` moves.
  - A save fault: inject `safeFs.renameSync` to throw for `tasks.json`, then name a dead running
    build. The apply screen holds `could NOT be saved`, the plan is still in `in-progress/`, and
    `Not moved` names it with `the task changes could not be saved` (F4).
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
- **B16. An orphan already swept by retention in the same pass (F2).** An `orphaned` build,
  `orphanReason: 'presumed-dead'`, `ts.started` and `ts.done` both 8 days ago (retention keys on
  `ts.done`), its plan in `in-progress/`, no other task of that plan, a git fixture.
  - Asserts: the preview does not throw; its row is `would-go-back`/`already-dead` with `its task
    was already marked dead`; naming it moves the plan to `todo/` with one `recovered` entry; the
    task has left the registry (swept).
- **B17. One time budget per preview (F8, TM-06).** Three `would-go-back` builds, a git fixture.
  - (a) `withSpawn` records every call and passes it to the real `spawnSync`. One render of
    `route(['menu'])` makes exactly ONE call whose arguments hold `log`; every call whose
    arguments hold `status` has `'--no-optional-locks'` as its FIRST argument (C03); and every
    call's `options.timeout` is at most 5 000 and holds `shell: false` and an `env` with no key
    matching `/^GIT_/i` (C04). The test sets `process.env.git_dir_probe = 'x'` (lower case,
    restored in `finally`) and asserts it is absent from every call's `env`.
  - (b) `withSpawn` returns `{ error: Object.assign(new Error('spawnSync git ETIMEDOUT'), { code:
    'ETIMEDOUT' }), status: null, stdout: '', stderr: '' }` for every call (no sleeping stub).
    The render returns; all three rows are `never-moved`/`git-failed`.
  - (c) `Date.now` is replaced (restored in `finally`) by a clock that advances 6 000 ms on each
    read after the first: no git spawn runs, and every row's reason holds `not checked in time`.
- **B18. Uncommitted work in another worktree (TM-07).** A git fixture with a linked worktree
  (`git worktree add ../wt -b wt`) holding an uncommitted edit to the build's declared file
  `src/w.js`. The build is 300 minutes old, no id.
  - Asserts: the row is `never-moved`/`work-found` and its reason holds `uncommitted changes in`
    and the worktree's folder name. After `git -C ../wt checkout -- src/w.js` the row is
    `would-go-back`.
  - A process environment with `GIT_DIR` pointing at another repository (set in the test,
    restored in `finally`) does not change either answer.
- **B19. A task id that is not safe in a command (TM-04).** A build whose task id is `t1;x`, with
  work found. Its line shows no `menu task complete` and no `menu task fail` text, and says
  `finish or give up this task from the task board`.
- **B20. Every remaining branch (F6).**
  - (a) A 30-second-old running build with a real id absent from the list: `not-yet`/`young`.
  - (b) A released build whose plan is in `todo/`, not `in-progress/`: `never-moved`/`not-here`.
  - (c) The work check's `r.error` path through `withSpawn`, returning `{ error: new
    Error('spawn git ENOENT') }`: `git-failed`, reason holds `spawn git ENOENT`.
  - (d) A `withSpawn` log answer (the other calls passed to the real `spawnSync`) holding one
    record with a valid header and no name-status lines, the shape git prints for a merge: work
    found for every candidate whose start it follows, and not for a candidate started after its
    `%ct`. A fake answer is used because whether git lists a given merge under a pathspec is not
    something this plan read.
  - (e) A `withSpawn` log answer holding a record with an empty `%S` and no name-status lines:
    work found, detail `on a local branch`.
  - (f) `renderSweepLine({ counts: { pending: 'x' } })`, `renderSweepLine(null)` and
    `renderSweepLine({})` each return `''`, read through a render with
    `planRecovery.previewSweep` injected.
  - (g) The Doctor key with `planRecovery.applySweep` throwing: see `tests/tab-modules.test.js`.
  - (h) The `Free only the other tasks` option is present, pointing at `menu task sweep
    --confirm none`, when only a dead `plan` task is pending, and absent on a clean project.
- **B21. One plan, two builds (TM-16).** Two running implement tasks of plan `p21`, both dead by
  the live list. Both rows are `never-moved`/`plan-shared` with the way-out sentence; neither
  token is in the confirm action; `--confirm p21@<either token>` is `stale` (not exactly one
  row).
- **B22. A move that fails after the task was marked dead (TM-19).** One dead running build,
  named. `actions.movePlan` is replaced on the exports object by a function that throws
  `EBUSY` (restored in `afterEach`).
  - Asserts: `Not moved` names the plan with `move failed: EBUSY`; the plan is still in
    `in-progress/`; the task's JSON is `deepEqual` to its record before the apply (status
    `running`, the same `agentTaskId`, no `ts.done`); `cleanup.json` holds no entry.
- **B23. A git older than the minimum (finding C05).** One `would-go-back` build (300 minutes
  old, no id) in a git fixture. `withSpawn` passes every call to the real `spawnSync` except two:
  the call whose arguments start `worktree list` returns `{ status: 129, stdout: '', stderr:
  "error: unknown option `z'\n" }`, and the call whose arguments are `['--version']` returns `{
  status: 0, stdout: 'git version 2.30.0\n', stderr: '' }` (faked too, so the machine's real git
  never decides the reason).
  - Asserts: the row is `never-moved`/`git-failed`, and its reason holds `git 2.30.0 is older
    than 2.36`.
  - Control: the same 129 answer with `--version` answering `git version 2.47.1` gives the
    reason `error: unknown option` and no `older than`.

### Tests: `tests/protect-records.test.js` (appended)

Using the file's own `run`, `bash`, `assertRefused` and `assertAllowed` (lines 51–76), a new
`describe("only the human confirms a sweep (owner, 2026-10-18)")`, with `MENU = 'node
"${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"'` and the sentence `REFUSAL_SWEEP_CONFIRM` copied
into the test as a literal, in full: `'CTOC refused this call because only the human confirms
which builds go back to the queue; report the sweep preview and let the main session ask him. A
command that only mentions both words is refused too: search one word at a time, and commit with
git commit -F <file>.'` (C08):

- **97.** A background agent's (`agent_id: 'a1b2c3'`) `${MENU} menu task sweep --confirm
  p1@0123456789ab` is refused: exit 2, that literal alone on stderr. So are `${MENU} menu task
  sweep --confirm none`, `${MENU} 'menu' 'task' 's'w'eep' --con"firm" none`, `${MENU} menu
  task SWEEP --CONFIRM none` (quoting and letter case), and `node -e
  "require('./src/lib/plan-recovery').applySweep(process.cwd(),{confirm:[]})"` (decision S2-25).
- **98.** The same commands without `agent_id`, and with `agent_id: ''`, are allowed (exit 0,
  empty stdout).
- **99.** A background agent's preview, `${MENU} menu task sweep` and `${MENU} menu task sweep
  --live-agent-ids a,b`, is allowed. This holds only while the 2026-10-15 switch stays on. With
  the switch off, `subagentMayRunRoute` refuses the route; slice 1's scenario 1.6 pins that once
  slice 1 has landed, in either order.
- **100.** The accepted false positive is pinned, so it is a decision, not a surprise: a
  background agent's `grep -n "sweep --confirm" src/commands/start.md` is refused with the
  literal, and `grep -n sweep src/commands/start.md` is allowed.
- **101. The fail rule (C09).** Two background-agent payloads that make `decide` throw, each
  carrying `agent_id: 'a1b2c3'`:
  - `tool_input.command` = `${MENU} menu task sweep --confirm none`, with a payload `cwd` that
    does not exist (`path.join(os.tmpdir(), 'ctoc-no-such-folder-<random>')`);
  - `tool_input.command` = `['menu task sweep --confirm none']` (an array, so `decide` throws
    `Bash command is not a string`, line 649; this payload reaches the fail rule on every
    platform whatever `findProjectRoot` does with a missing folder).

  Each is refused: exit 2, the sweep literal alone on stderr (not the `REFUSAL_UNCHECKED`
  sentence). The same two payloads without `agent_id` are allowed (exit 0): the fail rule's
  scanned text holds no record word, so the main session is not locked out.

**Coverage target.** Every new or changed line in `plan-recovery.js`, `task-reconcile.js`,
`menu-screens.js`, `tools.js`, `actions.js` (the export) and `protect-records.js` is executed by
the cases above (the hook's lines by cases 97–101, which run the real hook as a child process).
The suite floor is 99 (`.ctoc/coverage-baseline.json`).

**Independence.** Each case makes its own project, restores every injected function in
`afterEach`, and calls `cache.invalidate()` before and after, as `tests/last-mile-wired.test.js`
lines 46–53 do.

### Security Review

- [x] **Command injection.** git runs with an argument list, `shell: false`, and an environment
  holding no variable matching `/^GIT_/i`; every status call carries `--no-optional-locks`, so
  the check never takes a live builder's index lock. Every registry or plan value reaching git is a pathspec carrying
  our own `:(glob)` magic, or it is refused before the call:
  - `..`, absolute paths, drive letters, empty entries, a leading `:` and control characters;
  - a plan slug outside `[A-Za-z0-9._-]`;
  - a declared file inside another repository.

  Every refusal of a value counts as work found (fail closed). `--no-replace-objects`,
  `-c log.showSignature=false` and `-c core.quotePath=false` keep repository settings from
  changing what git reads or prints.
- [x] **Commands offered on screen.** A task id or plan name enters an offered action or a
  shown command only when every segment matches `/^[A-Za-z0-9._-]+$/` (TM-04, case B19).
- [x] **Input validation.** The sweep's words go through its own parser. The plan and token
  character sets are closed; `--by` is stripped and capped at 80. `parseTaskArgs` is untouched,
  so the hook's reading of `menu task` is unchanged. `--agent-id` must be a real id.
- [x] **Authority (F9, TM-01).**
  - A plan moves only when it is named in a confirmation, and only if it is still eligible on a
    fresh preview with the same token.
  - The token is a staleness fingerprint: the row's shown fields plus a sha256 of the sorted
    live-agent list. It identifies nobody and proves no one's consent.
  - That the HUMAN names the plans is enforced by two things: the session's instructions
    (start.md: only the plans he named in his own reply), and the hook refusal for background
    agents (decision S2-9). The main session confirming without asking him is the same
    documented limit as every answering route (the hook header, lines 89–91: "the main session
    running the menu's answering routes without the human's reply").
  - Inside the registry's compare-and-swap, `reconcile` judges each named build again.
  - A build nobody named keeps its task exactly as it was. So `startAgent`'s in-progress clean-up
    (`actions.js` lines 2176–2199) cannot treat it as finished (decision 19).
  - A named build whose move fails gets its task record back (TM-19, case B22).
- [x] **Audit.** Each move's cleanup-log entry names the route, the verdict code, the token, the
  live list's size and sha256, and the requester `--by` labelled "declared, not verified"
  (TM-15). The log is not tamper-evident: an agent with a shell can edit it.
- [x] **No silent failure.**
  - A git failure, and a check that ran out of time, are shown as reasons.
  - A preview failure is the DID NOT RUN line.
  - A save failure is named on the apply screen and in the Doctor message.
  - A blocked or failed move is listed with its reason; every named plan that did not move is
    listed.
  - A throw in the Doctor key is one plain message.
- [x] **Error messages.** Only stripped, capped first lines. No absolute path and no stack.
- [x] **Terminal injection.** Every registry value rendered passes `stripCtl` and a cap (the
  existing render helpers). A plan's name is read from its file only for plans in the in-progress
  set (TM-17).
- [x] **No secrets** are read or written.

### Trust boundaries and adversaries (TM-10)

| Boundary | What crosses it | Control |
|---|---|---|
| agent or session → menu process | a `menu task sweep` command line | the sweep's own parser; for a background agent, the hook refusal of `--confirm` |
| agent-writable stores → the verdict | `tasks.json`, plan files, approval records | every value is validated before git, rendering or an offered command; a value that fails counts as work found or is shown stripped |
| menu → git | arguments, working folder, environment | fixed words, no shell, no variable matching `/^GIT_/i`, `--no-optional-locks` on every status, one time budget |
| screen action → the session's next shell call | the confirm action's `<plan>@<token>` list | only safe segments enter it (TM-04) |
| human ↔ session | the human's naming of plans | the session's instructions (start.md); not enforceable by the menu |

- **A1, a misdirected or prompt-injected background agent using menu routes.** Stopped: its
  `--confirm` on the menu route, and inline code calling `applySweep` by name, are refused by
  the hook whatever the 2026-10-15 switch says (case 97). It can still run the preview, which
  changes no task and moves no plan.
- **A2, an agent writing files or running code through its shell** (editing `tasks.json` or a
  plan, inline code calling `actions.movePlan` or `recoverOrphanedPlans` directly, or a script
  file). Not stopped, only made visible: the hook reads command text, so a script file or text
  built at run time passes, and since 2026-10-15 shell writes and inline code naming `src/lib/`
  are allowed to background agents. `recoverOrphanedPlans`' new `released` option adds nothing
  to this class: `actions.movePlan` is already exported and moves any plan. What remains: the
  dashboard line, the preview's reasons, the cleanup-log entry and git history. The owner's
  switch accepted this class.

### Architecture checks

- `lib` modules require no `hooks` and no `commands`. `tools.js` (a tab) requires `lib`. The
  hook gains no require.
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
| 2.1 opening the dashboard changes no task, moves no plan and logs no clean-up; the one line counts | `buildDashboardTable`, `previewSweep`, `renderSweepLine` | B1, B13 |
| 2.2 the dashboard and the preview agree | one `previewSweep` | B2 |
| 2.3 a start without an id is unknown, not dead | `taskTransition` (records null, never the task id), `isRealAgentId` | B0, B3 |
| 2.4 the old placeholder is unknown and can be replaced | `isRealAgentId`, the stamp condition | B4 |
| 2.5 a stamp refuses a fake id | the early refusal in `taskTransition` | B5 |
| 2.6 a live agent is never moved | `sweepVerdict` (`alive`), `reconcile` held/live | B6 |
| 2.7 work after the claim is never moved; a claim alone is not work | `findWorkAfterClaim` (per-task claim exclusion, `plans/` dropped from `files`) | B8, B11, B17, B18, B20, B23 |
| 2.8 exactly the named, still-eligible plans move | `applySweep`, `recoverOrphanedPlans({ released })` | B7, B14, B16, B21, B22 |
| 2.9 a stale confirmation is refused | the token check in `applySweep` | B9, B14, B21 |
| Only the human confirms (the owner's order of 2026-10-18) | the hook refusal, in `bashRefuses` and in the fail rule | protect-records 97–101 |
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
| The dashboard gets slower | git runs only when some build would otherwise go back: one `log` for all of them, one worktree list, one status per worktree, bounded by `--since` with one day of slack and ONE 5-second budget per preview; a row not reached in time is held as "not checked in time" | `findWorkAfterClaim`, B17 |
| Uncommitted edits to a declared file (the human's own, in the main checkout) hold a dead build | Fail closed by design (TM-07); the reason names the worktree, and the way out is complete or fail | `findWorkAfterClaim`, B18 |
| A background agent's harmless command naming both `sweep` and `--confirm` is refused | Accepted false positive; search one word at a time, commit with `-F <file>` | the hook, case 100 |
| Builds already orphaned by 6.14.130 renders stay exposed to `startAgent`'s forward clean-up | Residual. They are already terminal, and the preview lists those still in `in-progress/` as `already-dead`, so the human can name them | R2 rows |
| The preview and the apply disagree | One function, and per-plan tokens (with the live list's hash) checked on a fresh preview | `applySweep` step 2 |
| A new agent starting between preview and confirm refuses the whole confirmation | Accepted (decision S2-2): the session re-previews and asks again | B9 |

## Decisions Taken Under Ambiguity

- **S2-1. Eighteen own files, far over the ~1–3 budget.** The owner's brief fixes exactly one
  slice per story.
  - Eight of the files are existing tests whose contract the owner replaced (F20: `w10`,
    `plan-recovery-wiring`, `dashboard-wedge-reports`, `dashboard-wedge-fault`,
    `dashboard-reconcile-failure`, `menu-screens-coverage`, `tab-modules`, `menu-protocol`).
    Each must be rewritten, not loosened.
  - `tests/protect-records.test.js` gains cases 97–101; no existing case changes.
  - Two are the docs that describe the old behaviour.
  - `actions.js` gains one export line and `protect-records.js` one refusal (S2-9, S2-13).
  - Splitting the source change from those tests would leave a slice that fails `npm test`.
- **S2-2. The confirmation carries a token per plan (`<plan>@<token>`), and every token carries
  the live list's hash (the CTO Chief, F9).** Decision 6 asks that a change to "anything the
  preview showed about a named plan" refuses the confirmation. A per-row token refuses that,
  and another plan's row changing group leaves the named plans' tokens valid. The live list's
  sha256 is part of every token, so an apply with a different live list than its preview is
  refused as stale. Cost, accepted: the session confirms with the EXACT list it passed to the
  preview, not a fresh query of the harness. If it re-queries and an agent has started or ended
  since, every token is stale, and it re-previews and asks again. The
  preview prints the tokens and its confirm action carries them, which is the inbox clean-up's
  confirm pattern (`inboxCleanupCategoryConfirm`, `menu-screens.js` line 1499).
- **S2-3. The apply marks the task dead first, then moves the plan; a failed move restores the
  task (the CTO Chief, TM-19).** This reuses the one plan mover, with its liveness veto and its
  cleanup-log entry. The main way a move fails, a plan of the same name already in the build
  queue, is checked before the registry is touched, and such a build is listed as not moved with
  its task left as it was. A rename failing for another reason now gets a compensating write
  inside `withRegistry`: the task's record from before the apply is put back, only when the task
  on disk is still the record this apply wrote. The build is then running again, its files and
  slot held, and the not-moved list says so. `recoverOrphanedPlans` reports such a failure in
  `skipped` (lines 201–203), which is what the compensation keys on.
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
- **S2-9. One hook change: a background agent cannot confirm a sweep (the CTO Chief, on the
  owner's order of 2026-10-18).** The owner ordered "move them only after the human confirms on
  that screen". Today any background agent can run any menu route (the switch
  `RECORD_REFUSALS_OFF`, `protect-records.js` lines 597–606), so it could confirm a sweep.
  - The refusal is placed before that switch's early return, so it holds whatever the switch
    says. It does not re-enable the switched-off refusals; it adds one for a route that did not
    exist on 2026-10-15.
  - The test strips `'`, `"` and `\` and matches `sweep` and `--confirm` anywhere, case-blind
    (fail closed against quoting tricks). A script file, or text built at run time (`$'…'`
    escapes, variables), is a documented limit, the same class the hook header already names
    (lines 84–91).
  - Kept to a constant, one test, one `if` in `bashRefuses` and one branch in `main`'s fail rule
    (C09: a crash in `decide` must not let the confirmation through), because the branch "a
    background agent cannot change Claude Code's settings" rewrites this file (merge note 6).
  - **Supersedes, for this one refusal only, three lines of the parent plan:** line 370
    ('Changing the write-protection hook in any way'), line 456 ('do not touch the hook') and
    line 501 ('NOT changed: src/hooks/protect-records.js'). Reason: the owner's order of
    2026-10-18, 'move them only after the human confirms on that screen', which no menu-side
    control can enforce against a background agent while RECORD_REFUSALS_OFF is on; the
    parent's line 19 records his OK for hook changes in this fix, and the CTO Chief decided this
    refusal on it. The parent is not edited; where it and this slice disagree about
    protect-records.js, this slice governs for the refusal named here and nothing else. Parent
    decision 9 still holds: the sweep route is not added to the background-agent route list.
    (Finding C02; the four parent line numbers, 19, 370, 456 and 501, and decision 9 at line
    554, were re-read in this worktree.)
  - Sessions must update CTOC and restart Claude Code after the release before the refusal holds
    (the intro says so).
- **S2-10. What the token proves (the CTO Chief, F9 and TM-01).** The token is a staleness
  fingerprint and identifies nobody. That the human named the plans rests on the session's
  instructions plus the hook refusal for background agents. The main session confirming without
  asking him is the same documented limit as every answering route; no menu-side control can
  tell the human's reply from the session's own words.
- **S2-11. A build's release is judged once, on the preview, and the plan mover is handed the
  judged builds (the CTO Chief, F2).** A running build must be marked dead before its plan
  moves, but an already-orphaned build can be swept by retention in the same reconcile pass
  (`task-reconcile.js` lines 514–522), after which the registry no longer holds it.
  `recoverOrphanedPlans` therefore takes `opts.released`, the judged `{ id, plan }` records:
  already-orphaned builds from the preview, running builds only when this apply's report
  orphaned them. Its liveness veto still reads the fresh registry. The verdict maps a missing
  what-if task to `already-dead` instead of throwing.
- **S2-12. One `git log` per preview and one 5-second budget for all its git calls (the CTO
  Chief, F8 and TM-06).** Per-build calls with a 10-second timeout each made the render's worst
  case grow with the number of dead builds. The union of every candidate's pathspecs goes to one
  `log` call and the answer is split per task in code with `planCoverage.globToRegex`. 5 seconds
  is this plan's choice of budget: long enough for a log over a day of history plus a few
  worktree statuses, short enough that a stuck git cannot freeze the dashboard for long. A row
  not reached in time is "not checked in time" and counts as work found. Tests never sleep: the
  timeout is injected as an `ETIMEDOUT` answer or a clock.
- **S2-13. What counts as work (the CTO Chief, F1, TM-05, TM-07).**
  - The paths: the registry `touches` and the plan's own `files:` read by BOTH
    `planCoverage.readPlanFiles` and `actions.planDeclaredFiles` (they disagree on plans with
    several leading frontmatter blocks; more paths only hold more builds), with every entry
    under `plans/` dropped (C01a); and, in the log only, the plan's own path at any stage.
    `planDeclaredFiles` is exported for this, one line. An unreadable plan file counts as git
    failed, because `readPlanFiles` alone returns `[]` on a read failure (line 271).
  - A claim is never work, wherever it sits (C01): in a commit, in a merge read against its
    first parent (`--diff-merges=first-parent`, C15) or uncommitted. A committed claim line is
    removed per task, only for the task it claims, so a plan sync committing several claims in
    one commit holds no build; a record made only of claims is work for nobody; and the status
    calls never see a path under `plans/`, so a staged or plain uncommitted claim rename is not
    uncommitted work. A merge git still prints with no lines stays fail-closed work (round-1
    decision F6), and case B20(d) stays valid for it.
  - Uncommitted changes in any worktree count as work: a live builder with no recorded id that
    has not committed yet must not be sent back. Worktrees marked `prunable` or `bare` are
    skipped. Every status runs as `git --no-optional-locks status` (C03).
  - `--remotes` joins `--branches`; a declared file under a folder holding its own `.git` counts
    as git failed; `--since` has no milliseconds.
  - `--relative`, `--no-replace-objects` and `-c log.showSignature=false` make the answer hold
    when the CTOC root is a subfolder of the repository and when the repository carries replace
    refs or signature settings.
  - Every git call runs without any variable matching `/^GIT_/i` (C04), the rule of slice 1's
    decision S1-10, case-blind. The helper is local, not shared, so neither slice needs the
    other to land first.
  - A declared file's other-repository check tests only non-empty leading parts (C10a), so the
    project's own `<root>/.git` never holds every build; empty lines inside a log record are
    ignored (C10b).
- **S2-14. The dashboard's write claim is narrowed to what is true (the CTO Chief, TM-18).**
  `taskRegistry.load` appends to the task warn log on every corrupt or malformed registry
  (`task-registry.js` lines 420, 424, 429, 439, 445, 457), and the TASKS block reads the
  registry a second time (`menu-screens.js` line 615). A quiet load would change the scheduler
  module and that second read for a diagnostic the human wants. So the claim is "no
  task-registry write, no plan move, no cleanup-log write", and case B1 snapshots the whole tree
  with only `.ctoc/logs/task-registry.json` allowed to change, and only in the corrupt-registry
  project. Any other writer the snapshot finds fails the case and kicks the build back.
- **S2-15. The cleanup-log entry records who and on what (the CTO Chief, F18 and TM-15).** Each
  move's entry adds `by: 'menu task sweep'`, the verdict code, the token, the live list's count
  and sha256, and `requester`: the `--by` value labelled "(declared, not verified)", or "not
  declared". The menu cannot verify a name; the label says so.
- **S2-16. One plan, one row (the CTO Chief, TM-16).** A running build whose plan has another
  non-terminal implement task is `never-moved` with code `plan-shared`, and a confirmation must
  match exactly one row per named plan, or it is refused as stale.
- **S2-17. Only safe values reach a command, and names are read only from in-progress plans (the
  CTO Chief, TM-04 and TM-17).** The segment rule is the one `menu-screens.js` applies to
  `parent_plan` (line 1783). A plan outside the in-progress set shows its stripped slug and no
  file is opened for it.
- **S2-18. Every named plan that did not move is listed with its reason, and a failed save moves
  no running build (the CTO Chief, F4).** A running build whose dead-marking was not saved is
  still running on disk; moving its plan would put a live task's plan in the build queue.
- **S2-19. The dashboard line counts builds with no sign of life, and never throws (the CTO
  Chief, F5, F11, F12).** A build under its floor with no liveness evidence is counted ("can be
  named once it is 240 min old"), so the line no longer hides it; it joins the empty-line rule.
  `renderSweepLine` returns `''` on a malformed preview. A sweep screen's `lead` is its first
  line.
- **S2-20. DECLINED: requiring a stamped agent id to be in a passed live list (the CTO Chief,
  TM-08).** It changes the stamp contract that the unpushed local `main` also rewrites (merge
  cost); the adversary is accidental; and no plan moves without the human's naming anyway.
- **S2-21. A cancelling build is not held from a sweep (the CTO Chief, F7).** `releaseBuilds`
  holds only `status === 'running'`. The human's cancel already names the build, so a sweep or
  Repair state may resolve it to `cancelled`. start.md lines 65 and 396–404 are reworded to say
  a sweep, not the render, confirms death.
- **S2-22. Test tightenings (the CTO Chief, F3, F13, F17, F19).** B10 is made red on origin/main
  (a real id, 30 minutes old, `res.ok === true` and `Sweep applied`); B1 adds `menu commands`
  and the 2-hour temporary file that a render used to delete; B11's builds are 300 minutes old
  with no id in a git fixture so they reach the work check; B14's tasks are `t1`–`t3`.
- **S2-23. Small mechanics (the CTO Chief, F10, F14, F15, F16).** `plan-recovery.js` requires
  `stripCtl` from `./tui`; named builds are never counted again as "other tasks" or released
  files; `applySweep` resolves `now` once; the merge notes cover `computePromote(root)` and the
  claim-before-launch order on local main.
- **S2-24. The refinement loop stays off for this slice.** The gate in
  `src/lib/refinement-loop.js` runs it on `effort_level: high` or higher, or when a declared file
  matches `.ctoc/config/refinement-triggers.yaml`. This plan declares `effort: medium`, and none
  of its eighteen files matches a trigger glob (read: lines 23–99 of that file; `src/hooks/` is
  not among them). Steps 12–14 are therefore single-pass checks. The hook change is covered by
  Step 13's scanner review and cases 97–101.
- **S2-25. The hook's test also matches `applySweep` (this integrator's extension of the CTO
  Chief's spec; inside the same constant-and-test footprint).** Since 2026-10-15 a
  background agent may run inline code naming `src/lib/` (existing case 88), so `node -e
  "require('./src/lib/plan-recovery').applySweep(…)"` would confirm a sweep with no `--confirm`
  in its text: the nearest workaround once the route is refused. One more alternative in the
  same regular expression refuses it. Inline code moving a plan by other means
  (`actions.movePlan`, already exported) stays in adversary class A2, visible but not stopped;
  the `released` option on `recoverOrphanedPlans` adds nothing to that class. The CTO Chief may
  drop the arm; case 97's last command then goes too.
- **S2-26. This slice no longer waits for slice 1, and builds first (the CTO Chief's dispatch
  order, decision A of round 2).** Reason: slice 1 now waits on an owner question, and this slice
  is the fix for the queue that froze on the real project, so holding it behind slice 1 would
  keep the real project stalled for a reason that has nothing to do with it. `depends_on` is the
  parent's own, `none` (parent frontmatter line 8); slice 1 is removed. Every place that stacked
  on slice 1 is made order-independent:
  - the documented test-file count in CLAUDE.md (lines 61, 94) and README.md (line 1145) is set
    from disk at Step 15, not from a number in this plan (the old "575 → 576" table was also
    wrong: origin/main reads 574);
  - the router edit, the start.md edits and the `docs/ENFORCEMENT.md` edits each name the
    origin/main 6.14.130 text they replace or insert beside (`case 'board': …`, `return
    taskCommand(args.slice(2), projectPath);`, the `tasks · task {id}` table row, the `menu task
    complete <id> … --continue` refused row, the fail-rule paragraph), never a line slice 1
    adds;
  - whichever slice builds second rebases onto the first;
  - slice 1's case 6 ("the write protection is unchanged", for slice 1's own scope) must still
    pass when slice 1 builds after this slice; this slice's hook change is outside that scope.
  The parent's slice table (line 767) still lists s1 as this slice's dependency; that row is
  superseded by this decision, and the parent is not edited after it crossed (decision S2-41).
  An ordering choice is not a question for the owner.
- **S2-27. The minimum git version is 2.36, learned only on a usage error (finding C05).**
  *Believed:* `git worktree list --porcelain -z` arrived in git 2.36 and `%S` in 2.21. A probe on
  every preview would add a spawn to every render; instead `git --version` runs only after a
  call exits 129, inside the same budget, and turns an opaque usage error into "git <version>
  is older than 2.36". start.md's sweep section states the minimum. Step 9 records the build
  machine's version; case B23 fails if the reason is not produced.
- **S2-28. A claim is never work, decided per task (finding C01).** Entries under `plans/` are
  dropped from `files` before specs and matchers exist; for task X only X's own `R100` claim line
  is removed from a record before X's matchers run; a record made only of claims is work for
  nobody, and that check runs before the fail-closed "tied to no task" rule. Reason: the plan
  sync commits several claims at once, and `startAgent`'s real claim is a plain rename that may
  sit uncommitted; the round-1 rule (one-line records only) held every build of such a batch.
  Qualified in round 3 (finding C15): this holds for a claim in a commit, in a merge read
  against its first parent, or uncommitted; a merge that git still prints with no lines stays
  fail-closed work (round-1 decision F6, case B20d).
- **S2-29. Every status runs as `git --no-optional-locks status` (finding C03).** Reason
  (*believed*): a plain status may take `index.lock` to refresh the index, which can fail a live
  builder's own `git add` in that worktree; a read-only check must never do that. B17a asserts it.
- **S2-30. The git environment is stripped with `/^GIT_/i` (finding C04).** Reason: Windows
  environment keys are case-insensitive, so `git_dir` would steer git there. Same rule in the
  test helpers and B17a.
- **S2-31. `makeProject` creates `.ctoc/logs/` (finding C06).** Reason: B1's corrupt-registry
  project then has exactly one allowed difference, the file `.ctoc/logs/task-registry.json`,
  rather than a folder plus a file; the readable project has none.
- **S2-32. B0 seeds `touches: ['src/b0.js']` and asserts the plan's place and `running` before
  the null id (finding C07).** Reason: the red output on origin/main then names the lost build,
  the harm the human sees, not an internal field.
- **S2-33. The refusal sentence says how to proceed (finding C08).** Reason: the accepted false
  positive must cost a refused builder one retry, not a stall; the sentence names searching one
  word at a time and `git commit -F <file>`. Case 97's literal carries the full sentence.
- **S2-34. The hook's fail rule refuses a background agent's sweep confirmation with the sweep
  sentence (finding C09).** Reason: when `decide` throws (a missing `cwd`, a module that fails to
  load), today's fail rule would allow an `applySweep` inline call and answer a menu call with
  the unchecked sentence. Applied as its own branch placed BEFORE line 687's condition, not as an
  `||` inside it: inside it, the call would get `REFUSAL_UNCHECKED`, contradicting "returning the
  sweep refusal sentence". This widens the hook footprint by one branch; case 101 covers it.
- **S2-35. Three small corrections (finding C10).** Only non-empty leading parts are tested for a
  nested `.git` (the empty part is the project's own `<root>/.git`, which would hold every build
  in every git repository); empty lines inside a log record are ignored, so they cannot turn a
  record into a merge-shaped "no lines" record wrongly or a path `''` into a mismatch; the
  constant sits after `REFUSAL_UNCHECKED`'s second line, 119, not inside it.
- **S2-36. B8 fixes its claim order with `.ctoc/state/todo-order.json` (finding C11, medium).**
  Before step 2 the fixture writes `["wa.md","wb.md","wd.md","we.md","wc.md"]` there, and each
  `startAgent` result's `plan.name` is asserted in that order. Reason: the FIFO fallback sorts
  on birthtime with a name tiebreak (`state.js` lines 107–108), which on a fast fixture would
  claim `wa`, `wb`, `wc`, `wd` (`wc` third) and leave `we` in `todo/`, so the literal names of steps 6–7 and the asserts
  would not hold. The order file is the queue's own single source of truth (lines 88–95), read
  at `<todo>/../../.ctoc/state/todo-order.json` (line 112) as an array of strings (lines
  115–116); it is a test-fixture file in the temporary project, not a write under this
  repository's `.ctoc/state/`.
- **S2-37. Step 5 of the record reading is decided on matching alone (finding C13, medium).** A
  record is "tied to no task" only when, after the claim lines of every remaining task are
  removed, none of its paths matches ANY remaining task's matchers or plan path, whatever the
  time test said. Reason: under the round-2 wording, a commit to a later-started build's file
  was work for nobody in step 4 and then held every earlier build in step 5, although it is
  plainly tied to that later build. Case B11(h) reads the critic's "Z started now" as 2 minutes
  ago: Z must be past the 60-second grace to be a `confirmed-dead` candidate of the work check,
  because only a candidate's pathspecs reach the log call, and only Z's pathspec makes git print
  the commit made before Z started; only then is step 5 exercised. A Z inside the grace is
  `not-yet`/`young` and not a candidate, so `src/z.js` is not among the specs, the commit is
  never printed (*believed*: with a pathspec and no `--full-diff`, `--name-status` lists only
  paths inside it), and X goes back under both the round-2 and the round-3 rule: the case could
  not be red. A non-candidate's files never reach the log call, so its commits can neither tie a
  record to a task nor hold one.
- **S2-38. `recoverOrphanedPlans` with `released` (finding C12, low).** The `orphaned` list is
  `released` itself and the early return at line 167 tests it; the registry load at line 156 is
  still made, for the liveness veto at line 184. Reason: the builder must not guess whether the
  early return and the load still apply on the new path.
- **S2-39. `-c core.quotePath=false` on the log call (finding C14, low).** Reason: git's default
  quotes non-ASCII paths as octal escapes, which match no matcher, so step 5 would hold every
  dead build in a project with a non-ASCII file name. A path git still quotes (control
  character, `"`, `\`) stays fail closed through step 5. Case B11(i) covers it. The status calls
  already use `-z`, which prints paths verbatim.
- **S2-40. `--diff-merges=first-parent` on the log call (finding C15, low).** Reason: a merge
  that brings claim commits in is then read like any commit (its claim lines removed per task),
  instead of printing no lines and holding every build. *Believed* available from git 2.31,
  below the plan's 2.36 minimum; the CTO Chief measured this machine's git as 2.54.0, and Step 9
  records the build machine's version. Decisions S2-13 and S2-28 are qualified accordingly: a
  claim is never work in a commit, in a first-parent merge or uncommitted; a merge git still
  prints with no lines stays fail-closed work (F6), and B20(d) stays valid for that case.
- **S2-41. The Step 7 refinement loop ended after round 3, its maximum, with no finding left
  open.** This is the Step 7 specification rounds between the integrator and the critic, not
  the Steps 12–14 refinement loop that decision S2-24 keeps off. Findings C11–C15 of round 3 are applied above (S2-36 to S2-40). The parent's slice
  table (parent plan line 767, re-read) still lists s1 as this slice's dependency; that row is
  superseded by decision S2-26, and the parent is not edited after it crossed.

## Execution Plan

### Step 8: TEST
Write the failing tests FIRST, before any source file changes, in this order. Run each new file
with `node --test <file>`, and record the red output in the build record.

1. `tests/the-dashboard-never-sends-live-work-back.test.js`, case **B0** first. Run it and record
   the failure: its first assertion fails because the plan is in `todo/` after one render (and
   the agent id is `'t1'`). That is the bug, seen failing.
2. Cases B1–B14 and B16–B23 of the same file. All are red: there is no sweep route, no
   `previewSweep`, and the render still writes. Record B10's red output (`res.ok` is `false`,
   "Unknown task subcommand: sweep"), B1's (the 2-hour temporary file is deleted by the render,
   and `tasks.json` changes) and B8's (no sweep route; once the route exists, B8 is what fails
   on a one-line-only claim rule). B8's steps 2 and 4 assert the claim order `wa`, `wb`, `wd`,
   `we`, `wc` set by the fixture's `todo-order.json` (decision S2-36); that part runs on
   origin/main and must already pass, so a failure there is a fixture fault, fixed before
   Step 10. B11(h) and B11(i) are what fail if step 5 is decided on the time test or the log call
   lacks `core.quotePath=false` (decisions S2-37, S2-39).
3. B15 in `tests/menu-protocol.test.js`. Red: start.md lines 119, 130, 355 and 423 lack
   `--agent-id`.
4. Cases 97–101 in `tests/protect-records.test.js`. Red: case 97, case 100's refusal of
   `grep -n "sweep --confirm"` and case 101's two background-agent payloads are allowed today
   (exit 0). Cases 98 and 99, and the allowed halves of 100 and 101, pass already and pin what
   must not change. Record the red output.
5. The replaced cases listed under "Existing tests whose contract the owner replaced", the three
   new `tests/tab-modules.test.js` cases and case 12 of `tests/dashboard-reconcile-failure.test.js`.
   Each is written with its replacement comment, and each is red against origin/main for the
   reason its row states.

### Step 9: PREPARE
- Re-read every line range this plan cites in `menu-screens.js`, `task-reconcile.js`,
  `plan-recovery.js`, `actions.js` (lines 1822–1911 and 2461), `tools.js`, `protect-records.js`
  (lines 26–92, 115–121, 597–606, 649, 654, 664–667, 679–691), `start.md` and
  `docs/ENFORCEMENT.md` (lines 358–384, 397–403), against origin/main 6.14.130. This slice
  builds first (decision S2-26); if slice 1 has nonetheless landed on this branch, locate each
  edit by its quoted text and report any quoted text that is gone.
- Run `git --version` and record it; it must be 2.36 or newer (decision S2-27). Record whether
  `%S`, `--relative`, `--diff-merges=first-parent`, `-c core.quotePath=false`, `git worktree
  list --porcelain -z`, `git --no-optional-locks status` and porcelain status paths behave as
  cases B8, B8e, B11(i), B17a and B18 assume. These are *believed*
  items; the cases fail if they are wrong.
- Confirm no other branch has landed a change to `src/hooks/protect-records.js` in this
  worktree since origin/main 6.14.130; if one has, apply merge note 6.

### Step 10: IMPLEMENT
- `src/lib/task-reconcile.js`: `isRealAgentId`, the two call sites, `releaseBuilds`, `onePass`,
  the JSDoc, the export.
- `src/lib/plan-recovery.js`:
  - the requires (`crypto`, `./task-reconcile`, `./plan-coverage`, `{ stripCtl }` from `./tui`)
    and `actions` as a namespace in place of the `movePlan` destructure;
  - `sweepVerdict` with the live-list hash, `plan-shared`, `unsafe-name`, `already-dead` for a
    swept task, `notYet` and the F14 counts;
  - `findWorkAfterClaim` for all candidates at once: the declared paths with `plans/` entries
    dropped, the refusals, the non-empty-part other-repository check, `gitEnv` (`/^GIT_/i`), the
    5-second budget, the version probe on exit 129, the prefix, one `log` (with `-c
    core.quotePath=false` and `--diff-merges=first-parent`), the five-step record reading
    (empty lines, merges, claim-only records, the per-task claim exclusion, the fail-closed
    rule decided on matching alone against every remaining task), the worktree list, the
    `--no-optional-locks` statuses;
  - `previewSweep`; `applySweep` with `now` resolved once, the stale check (exactly one row per
    plan), `released`, the `log` fields, the compensating write and the full `notMoved` list;
  - `recoverOrphanedPlans`' `released` and `log` options (with `released`, the `orphaned` list
    is `released`, the early return tests it, and the registry load stays for the liveness
    veto; decision S2-38) and `appendCleanupLog`'s `extra`;
  - the header; the exports.
- `src/lib/actions.js`: `planDeclaredFiles` in `module.exports`.
- `src/lib/menu-screens.js`:
  - the `buildDashboardTable` preview block;
  - `renderSweepLine` (total, with the no-sign-of-life part);
  - the deletion of `renderRecoveryReport` and of the `saveFailed` branch;
  - the three `renderWedgeReports` strings;
  - the `taskTransition` lines;
  - `taskCommand` and `route` with `opts`;
  - `parseSweepArgs` (with `--by`), `taskSweep`, `sweepScreen` (lead first, safe values only,
    names only for in-progress plans), `appliedScreen` (F14 counts);
  - the header.
- `src/tabs/tools.js`: the import, the Doctor key '2' with its try/catch.
- `src/hooks/protect-records.js`: `REFUSAL_SWEEP_CONFIRM` (after line 119, with the C08
  sentence), `confirmsSweep`, the first `if` of `bashRefuses`, the fail-rule branch before line
  687's `if`, and the header sentences. Nothing else.
- `src/commands/start.md`: lines 65, 119, 130, 132–141, the new section in place of 185–217
  (with the git 2.36 minimum), 355, 396–404, 423, and the table row after the `tasks · task
  {id}` row; each located by its quoted text.
- `docs/ENFORCEMENT.md`: the allowed-table row (line 375), the refused-table row after the
  `--continue` row (line 368), and the fail-rule sentence; each located by its quoted text.
- The eight replaced test files, as listed, and cases 97–101 in `tests/protect-records.test.js`.
- `CLAUDE.md` and `README.md`: the three count edits, left for Step 15 to set from disk.
- This slice's builder runs as a background agent: it commits with `git commit -F <file>` and
  searches for `sweep` and `--confirm` separately (the hook's accepted false positive), in case
  the installed plugin already carries the refusal.

### Step 11: REVIEW
iron-loop-critic reads the diff against this plan. It checks:

- that no render path makes a task-registry write, a plan move or a cleanup-log write, by
  reading every call reachable from `buildDashboardTable` and `dashboardCommands`;
- that `reconcile`'s defaults are unchanged;
- that the token covers exactly the shown fields plus the live list's hash;
- that `parseTaskArgs` is untouched;
- that the hook diff is exactly the constant, the test, the `if` before line 602's switch, the
  fail-rule branch ahead of the unchanged `UNCHECKED_SUSPECT_RE` condition, and the header
  sentences;
- that every git call carries `shell: false`, `windowsHide`, `gitEnv()` and a timeout taken from
  the one budget, and every status call starts `--no-optional-locks`;
- that no `files` entry under `plans/` reaches a spec or matcher, and that a record's claim line
  is removed only for the task it claims, before the fail-closed rule;
- that the fail-closed "tied to no task" rule tests matching against every remaining task and
  ignores the time test (decision S2-37), and that the log call carries `-c
  core.quotePath=false` and `--diff-merges=first-parent`;
- that no edit to a shared file depends on a line slice 1 adds (decision S2-26);
- that every replaced test states its reason and asserts at least as much as before.

### Step 12: OPTIMIZE
**Standard mode** (the refinement loop is off; decision S2-24).
- Confirm git runs only when some row would go back, with exactly one `log` per preview (B17a).
- Confirm `sweepVerdict` runs `reconcile` exactly twice per call.
- Confirm no double `previewSweep` per route, and one `previewSweep` per dashboard render.
- Confirm `findWorkAfterClaim` reads each plan file once, and that `git --version` runs only after
  a call exits 129 (B17a sees no `--version` call on a modern git).

### Step 13: SECURE
**Standard mode.** security-scanner reviews:
- the git calls: argument lists, no shell, the environment stripped case-blind, `--no-replace-objects`,
  `--no-optional-locks` on every status, the pathspec refusals, `:(glob)`, the other-repository
  check (non-empty parts only), the budget, the version probe;
- the claim exclusion: that only the named task's own `R100` claim line is ever removed, so a
  commit cannot hide a builder's work by also carrying a claim; that a first-parent merge is
  read by the same rule and a merge printed with no lines stays work; that a path git still
  quotes falls to the fail-closed rule;
- the token, the plan and token character sets, `--by`'s stripping, the stale refusal (including
  a changed live list), and the refusal of a fake `--agent-id`;
- the segment rule on every offered action and shown command (B19), and that a plan's name is
  read only from in-progress plans;
- the hook refusal: placement before the switch, the fail-rule branch, the quote-stripping test,
  the sentence, exit 2, and that no other decision of the hook changed (cases 97–101 and the
  unchanged cases 1–96);
- the trust-boundaries table against the code.

### Step 14: VERIFY
**Standard mode.**
- Run `npm run lint` (eslint, `--max-warnings 0`).
- Run `npm run typecheck`.
- Then run `npm test`: the gated entry point, holding the whole suite, the coverage floor in
  `.ctoc/coverage-baseline.json` (`minPct` 99) and zero skipped.
- Every test must report `# fail 0`, including every file listed under "Must pass unchanged".
- 0 warnings across every toolchain (lint, typecheck, Node deprecation warnings in the test
  output).

### Step 15: DOCUMENT
- Check that the start.md section, the table row and `docs/ENFORCEMENT.md` match the shipped
  words of the dashboard line, the preview, the apply screen and the hook sentence.
- Check that the module headers of `plan-recovery.js` and `task-reconcile.js` say that recovery
  runs only in a confirmed sweep, and that the hook header names the new refusal and its limit.
- Set the test-file count in CLAUDE.md (lines 61 and 94) and README.md (line 1145) to the number
  of `tests/*.test.js` files on disk now (`node src/scripts/release.js` syncs counts), whatever
  slice 1 has or has not added (decision S2-26); `tests/readme-numbers.test.js` must pass.
- Check that `docs/ENFORCEMENT.md` carries the full refusal sentence (with the C08 sentence) word
  for word as shipped in the constant, and that start.md's sweep section states the git 2.36
  minimum.
- The release note says that this version changes `src/hooks/protect-records.js`, so each
  session must update CTOC and restart Claude Code.

### Step 16: FINAL-REVIEW
iron-loop-critic checks scenarios 2.1–2.12 one by one against the passing test names and the
wiring table, and the owner's "only the human confirms" against cases 97–101. It confirms that
`git diff --stat -- src/hooks` lists only `protect-records.js`, holding the constant, the test,
the one `if` in `bashRefuses`, the one fail-rule branch and the header sentences; that `git diff
-- src/lib/actions.js` is the one export line; that the documented counts match disk; and that
the merge notes still match the local main lines they name.

## Execution Record

### Step 8 TEST — red results (before any source change, origin/main 6.14.130)

- `tests/the-dashboard-never-sends-live-work-back.test.js`: 41 of 42 red, 1 green (B20f, which
  pins "a malformed preview prints no sweep line", true on origin/main for lack of a preview).
  - **B0** red for the right reason: "the live build's plan must still be in the building folder
    (it was thrown back to the build queue)"; the recorded agent id was `'t1'`.
  - **B1** red: "a render changed the tree" — the render deleted the old temporary file, rewrote
    `tasks.json`, moved a plan to `todo/`, wrote `cleanup.json` and the plan index.
  - **B3/B5**: "actual 't1', expected null"; "--agent-id <task id> accepted, expected refusal".
  - **B10**: no sweep route (`res.ok` not true; "Unknown task subcommand: sweep").
  - **B2, B4, B6–B9, B11–B14, B16–B23**: no `menu task sweep` route (`Cannot read properties of
    undefined (reading 'builds')` / `refused` undefined). **B8**'s fixture part (the five real
    claims through `startAgent`, in the order of `todo-order.json`) passed on origin/main; only
    the sweep part was red.
  - **B12/B13**: the render still orphaned the build and printed no sweep line.
  - **B17**: zero git calls (the work check did not exist).
- `tests/protect-records.test.js` 97, 100, 101 red (exit 0 instead of 2); 98 and 99 green, as the plan says.
- `tests/menu-protocol.test.js` scenario 2.12: five red (start.md lacks the stamps, the guard
  finds `menu task start <taskId>` after a launch, the sweep row and section are absent).
- Replaced cases, red against origin/main: `plan-recovery-wiring` 1, 2, 4, 5; `dashboard-wedge-reports`
  (age-alone line); `dashboard-wedge-fault` (3 cases); `dashboard-reconcile-failure` 1, 4, 5, 6, 8, 9,
  10, 11; `menu-screens-coverage` (the 3-hour task line); `tab-modules` six Doctor "2" cases;
  `w10-live-agent-reconcile` 1+2, 3, 4, 5, 6, 6b.

### Step 9 PREPARE — findings (scratch repository under /private/tmp/claude-501/, not the project)

- `git version 2.54.0 (Apple Git-157)`, above the 2.36 minimum.
- Confirmed by running: `--diff-merges=first-parent` (a merge prints its changes against the first
  parent as ordinary lines); `-c core.quotePath=false` prints `src/café.js` verbatim (default prints
  `"src/caf\303\251.js"`); a pathspec-limited `-M` log (`:(glob)plans/*/p.md` plus a source file) prints
  the claim as one `R100\tplans/todo/p.md\tplans/in-progress/p.md` line; `%S` prints the ref name
  (`main`, `other-b`); `--no-optional-locks status --porcelain -z --untracked-files=all` prints
  ` M src/café.js` NUL-terminated; `git worktree list --porcelain -z` prints NUL-separated fields with an
  empty field ending each block; `rev-parse --show-prefix` prints an empty line at the top; an unknown
  option makes `worktree list` exit 129. The log format also prints one empty line between a record's
  header and its name-status lines, which the parser drops.
- All line ranges the plan cites were found where it says. The settings-file protection branch is
  already part of 6.14.130 in `protect-records.js` (cases 90–96 exist), so cases 97–101 follow case 96.

### Step 10 IMPLEMENT — files changed

`src/lib/task-reconcile.js`, `src/lib/plan-recovery.js`, `src/lib/actions.js` (one export line),
`src/lib/menu-screens.js`, `src/tabs/tools.js`, `src/hooks/protect-records.js`, `src/commands/start.md`,
`docs/ENFORCEMENT.md`; tests: the new file, `w10-live-agent-reconcile`, `plan-recovery-wiring`,
`dashboard-wedge-reports`, `dashboard-wedge-fault`, `dashboard-reconcile-failure`,
`menu-screens-coverage`, `tab-modules`, `menu-protocol`, `protect-records`. `CLAUDE.md` and `README.md`
are left for Step 15 (the count is set from disk). Affected test files: 600 tests, 0 failed; lint and
typecheck clean on the changed files.

## Decisions Taken Under Ambiguity (build)

- **The unreadable-plan half of B11(e) cannot use a folder named like the plan.** `readPlans` skips an
  entry whose read fails, so the build's plan is absent from the in-progress listing and the row reads
  `not-here`, never `the plan file cannot be read`. The case instead makes the work check's second read
  of the plan file fail (the listing's read succeeds), which is the path the plan means.
- **A corrupt `tasks.json` (`{not json`) does not print `could not be read (load-failed)`.** The loader
  fails open (no throw), so the preview sees an empty view and, as in the kept case 3 of
  `dashboard-reconcile-failure`, stays quiet; the agent status line speaks. B1 asserts that and that
  the only files changed are `.ctoc/logs/` entries holding only `registry_load_failed` events. The
  `load-failed` line is printed when the loader throws, as the plan says.
- **Step 3 and step 5 of the record reading test claim lines against every candidate of the check, not
  only the tasks undecided when the record is reached.** B8 requires it: the log lists newest first, so
  the commit that holds four claims is read after two of those four builds were already decided as
  having work, and "undecided only" read the batch as work for the other two. A decision is still taken
  only for undecided tasks.
- Rows carry two internal fields the plan does not list (`staleMarker`, and `liveHash` on the verdict)
  so the apply can tell an already-orphaned build that still carried the staleness marker, and can log
  the live list's fingerprint without recomputing it. The sweep screen's `sweep.builds` entries carry only
  the plan's listed fields.
- Names that are `.` or `..` are refused by the safe-name test in addition to the segment character set.
- A git status whose worktree folder is missing counts as git failed (fail closed), and a status is
  skipped when a task has no declared file left after the `plans/` entries are dropped (an empty
  pathspec would list every change). *Superseded by the review round below: that case is now held
  with "the plan declares no file to check".*

### Review kickback round (the CTO Chief's change list) — red-then-green, merge fixture, decisions

Red evidence (each test written and run first, red for the stated reason; green after the fix):
1. Hook bypass: case 102 red (exit 0 for `sw${E}eep --confirm none`); 103 and 104 (main session, empty
   agent id, and the eight must-allow calls) green before and after. Case 4 of the list uses
   `…/sta*.js menu task sweep --con${X}firm none`: with the literal `sweep --confirm` the old text test
   already refuses it with the old sentence, so the new sentence could not show.
2. Work check per task: (a) and (b) red ("would-go-back", no refusal), (c) red (the throw escaped
   `previewSweep`: `res.sweep` undefined). Green after the per-task try and the empty-files rule.
3. Worktrees first: (a) red (`would-go-back` with an empty worktree list), (b) red (the detached-HEAD
   commit was not reached by `--branches`). Green after listing worktrees before the log and passing
   their HEAD shas.
4. `core.fsmonitor=false`: the B17 assertion red on the log call; green after.
5. Timeout words: B17's reason assertion red with the fix switched off ("spawnSync git ETIMEDOUT"),
   green with it.
6. Merge records: see the fixture below; (b) red (work found on the merge of main into a branch), (a),
   (c) green before and after (pins).
7. Not-moved reasons: (a) red ("its plan is no longer being built here"), (b) red (no restore note).
8. One name rule: red for the 201-character name and `.hidden` (neither was `unsafe-name`).
9. Tests unweakened: w10 cases 3-5 and the wiring case 2 now assert the preview row, the contrast,
   both "not moved" reasons and the dashboard words; each failed once with its input flipped (a build
   aged 400 minutes; a 60-minute stale build).

MERGE-RECORDS fixture (real git 2.54, the exact log arguments, a pathspec of the declared file and the
plan's claim glob): a `--no-ff` merge of a branch that changed no declared file is NOT printed at all;
a `--no-ff` merge into main that brings declared-file changes is printed WITH `M`/`A` lines against its
first parent; main merged INTO a branch that holds declared-file work is printed with NO name-status
lines and two parents (the work itself is printed as its own record). So git does print a merge with no
lines, and the change was made: the format ends with `%P`, and a record with no lines and two parents or
more is "no change on the first-parent line" (work for nobody); a record with no lines and fewer than two
parents stays fail-closed. Planned case B20(d) is split by parent count (B20(d) carries one parent and
is work; the new merge-records (d) holds the two-parent, one-parent and no-parent cases). This is the CTO
Chief's decision, not a weakening: a merge's work is always printed by the records that hold it.

Correction to the threat-model rows A1 and A2 (recorded here, not in the approved text: editing the
approved sections moves the specification hash and the residency check refuses the plan, which
happened once during this round and was reverted):
- **A1 now:** a background agent's `--confirm` and inline `applySweep` are refused (case 97), and so are
  the spellings the shell builds (`sw${E}eep --con${X}firm`, `$'\x2d-confirm'`, a wildcard script word) in
  a command that is not one plain call, with the plain-call sentence (cases 102-104). It can still run the
  preview.
- **A2 residual now:** a `cd` into `src` then a relative `commands/…` word, inline code, `git mv`, and a
  script file run later.

Decisions taken (review round):
- The hook's new check applies only to a command that is not one plain call AND holds `$`, a backtick,
  a brace or a wildcard (after `${CLAUDE_PLUGIN_ROOT}` is removed). Without that gate it refused
  compound menu calls that carry no expansion, which five older cases pin as allowed (the text test
  reads those exactly). Four older allowed forms of case 82 that hold an expansion
  (`$(echo x)`, a backtick, `$HOME`, `$P/…`) are now refused for a background agent with the plain-call
  sentence, because the shell can build `sweep --confirm` from any of them; case 82 states that as a
  new refusal test and keeps the main-session allowance. That is the CTO Chief's rule, not a weakening.
- `plan-coverage.js` says `readPlanFiles` has "ONE call site"; that comment is now false (the work check
  calls it too). The file is not in this plan's `files:`, so it is not edited.
- `isSafeName` is not exported: after the one plan rule, `menu-screens` has no use for it (ids are
  judged inside the verdict as `safeId`), and a new export with no live caller fails the dead-export
  fence. `isSafePlan` is exported and used by `menu-screens` (two places); `SAFE_PLAN_RE`,
  `SWEEP_PLAN_RE` and `safeCommandName` are deleted.
- A commit reached only through a linked worktree's HEAD is named "a detached worktree" in the reason
  (git prints the sha as its source).
- `recoverOrphanedPlans` without `released` has no production caller; it is kept because existing tests
  call it. Deleting it is for the owner to schedule.

### Step 11 REVIEW — executed

The review round ran: critic findings R1-R15, security findings S1-S5, the synthesizer's change list and what was applied are recorded in the "Review kickback round" section above.

### Step 12 OPTIMIZE — executed

Checked: one `git log` per preview (all candidates together, one time budget); the `--version` call is made only on git's usage-error status 129, so a modern git makes no `--version` call. No change needed.

### Step 13 SECURE — executed

The security scan's verdict was warn. Its findings S1-S5 and their resolution are in the "Review kickback round" section above (hook bypass spellings refused, work check fails closed per task, one name rule, no variable matching GIT_ reaches git). The final review then found one more bypass, fixed in the final kickback round below.

### Step 14 VERIFY — executed

- The CTO Chief's `npm test` on eb2b9150: 13358 tests, 13358 pass, 0 fail, 0 skipped, coverage 99.66% against the 99% floor, test gate PASS.
- After the final kickback round, `npm test` from the project root: 13359 tests, 13359 pass, 0 fail, 0 cancelled, 0 skipped, coverage 99.66% (threshold 99%), corpus claims verified 3 refuted 0, test gate PASS. The one added test is B6b.

### Step 15 DOCUMENT — executed

575 test files on disk; `CLAUDE.md` lines 61 and 94 and `README.md` line 1145 carry that count; `docs/ENFORCEMENT.md` and `src/commands/start.md` are updated (and reworded in the final kickback round).

### Step 16 FINAL-REVIEW — kickback round and its red-then-green evidence

1. A build already marked dead (an orphan left by an older dashboard render), started 300 minutes ago, whose real agent id `h1` is in the live list was offered as "would go back" and a confirmation moved it. B6b (both a `presumed-dead` and a `staleness` marker) was RED: actual `would-go-back`, expected `never-moved`. Fix: `sweepVerdict` tests `live !== null && realId && live.has(id)` before the status branches, so any such row is never-moved with code `alive`. GREEN: the plan stays in `in-progress/` after a confirmation. `applySweep` builds its eligible set from a fresh preview made with the same live list in the same call, so the move-time check is the same function.
2. `$NODE "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task sw${E}eep --con${E}firm none` from a background agent was allowed. Case 102 (new entry in the shell-built list) was RED (exit 0). Fix: after the expansion check passes, `sweepBypassRefusal` refuses when any word names `start.js` or a `src/commands` folder. GREEN: cases 82 and 97-104 pass, all eight must-allow calls in case 104 stay allowed, case 103 allows the command for the main session and an empty agent id (108 pass, 0 fail in `tests/protect-records.test.js`).
3. The sentence said "no &&, |", but case 104 allows both. Reworded in the hook, `src/commands/start.md`, `docs/ENFORCEMENT.md` and the two pinned test strings to: "built without $, a backtick, a brace or a wildcard".
