---
title: "The menu's task start claims a build: it moves the plan into the build, and the stamp accepts the placeholder"
type: implementation
created: 2026-10-11
priority: high
effort: medium
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s1-build-tests-seed-their-plan-file
files:
  - src/lib/actions.js
  - src/lib/menu-screens.js
  - tests/a-build-start-moves-its-plan.test.js
  # RATCHET FILES — not counted toward the ~1–3 budget. This slice CREATES a test file,
  # which moves the test-file count in CLAUDE.md (doc-counts.test.js) and in README.md's
  # structure block (readme-numbers.test.js, `tests/ N test files`).
  - CLAUDE.md
  - README.md
---

# The menu's task start claims a build: it moves the plan into the build, and the stamp accepts the placeholder

Slice 2 of 14 of `plans/functional/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`:
the parent's slice 1 ("the menu's task start moves the plan"), scenarios 1-10 of its Acceptance
Criteria, decisions 3 and 4.

## Problem Statement

`menu task start <id>` (`taskTransition`, `src/lib/menu-screens.js` line 2208; the start at
2270-2304) only sets the task running and records `p.agentId || id` (line 2292). It never moves the
plan, so `menu task complete` refuses later (`taskComplete` line 2447, "no plan file for … in
in-progress/ or review/"). The only code that moves a plan from `todo/` to `in-progress/` is
`startExecution` (`src/lib/actions.js` line 997), called only by `startAgent` (line 1885), and
`startAgent` skips every plan that already has a queued build task (lines 1873-1877, `already-queued`).
So a build recorded with `menu task add` can be started by no route. The stamp branch (menu-screens
lines 2253-2257) accepts only a running task with `agentTaskId == null`, so once the start records the
task's own id as a placeholder, the session's later `--agent-id` stamp is refused.

## Technical approach

### One build start at a time: `withBuildStartLock(root, fn)`

New internal function in `src/lib/actions.js`, placed directly before `claimBuild` (below), not
exported. It copies the create, steal and release pattern of `src/lib/plan-index/store.js` lines
486-526, without that store's wait:

```
withBuildStartLock(root: string, fn: () => T) → { busy: false, value: T } | { busy: true }
```

1. `lockPath = path.join(root, '.ctoc', 'state', 'build-start.lock')`;
   `safeFs.mkdirSync(path.dirname(lockPath), { recursive: true })`.
2. `token = \`${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}\``;
   `safeFs.writeFileSync(lockPath, token, { flag: 'wx' })`.
3. On `EEXIST`: `safeFs.statSync(lockPath)`. When the lock's modification time is more than 60 s old
   (`Date.now() - st.mtimeMs > 60000`), delete it (`safeFs.unlinkSync`; a file already gone is ignored)
   and try the create once more. When the stat finds no file (the holder released between the create
   and the stat), try the create once more too. A lock 60 s old or younger returns `{ busy: true }` at
   once. Any error from the stat (not only a missing file) → try the create once more. Any error from the
   stale delete is ignored; the second create decides. A second `EEXIST` → `{ busy: true }`. On
   `process.platform === 'win32'`, `EPERM`, `EACCES` or `EBUSY` from either create also returns `{ busy:
   true }` (a lock file being deleted reads that way there). Any other create error is thrown. No sleep,
   no wait loop: at most two creates. 60 s exceeds the 15 s the plan-index store can wait for its own lock
   (`src/lib/plan-index/store.js` line 56).
4. `try { return { busy: false, value: fn() }; } finally { … }`: in `finally`, read the lock and delete it
   only if it still holds our token; a read or delete failure is ignored (the lock was taken over or is
   already gone), so a start never deletes another start's lock.

### The one build-start step: `actions.claimBuild`

New function in `src/lib/actions.js`, placed directly after `startExecution` (line 1001), exported next
to `startExecution` in `module.exports` (line ~2476):

```
claimBuild(projectPath: string, taskId: string,
           opts?: { agentTaskId?: string|null, force?: boolean })
  → { ok: true,  taskId, task, slug, planPath, newPath, moved: boolean, forced: boolean, reason, text }
  | { ok: false, refused: true, taskId, reason, text }
throws Error('task-registry: unknown task id <id>')        — the task does not exist
throws Error('task-registry: invalid transition <s> → running') — the task is not queued
rethrows a registry write failure (after putting the plan back, unless the task is running)
```

Steps, in this order:

1. **Read-only scheduler check, outside the lock.** `reg = taskRegistry.load(root)`; `task =
   reg.tasks.find(id)`; missing → throw unknown id; `task.status !== 'queued'` → throw invalid
   transition (the same messages `taskTransition` throws today, so the dispatcher's `{ok:false, error}`
   shape is unchanged). `decision = taskRegistry.canRun(task, reg)`; not `run` and not `force` → return
   `{ ok:false, refused:true, reason: decision.reason, text: 'Task <id> NOT started — the scheduler
   refuses it (<reason>). Wait for the blocker to clear, or override with --force (human decision,
   logged).' }` — today's sentence, word for word. No lock is taken; the registry is untouched.
2. **Inside the lock.** `r = withBuildStartLock(root, () => claimBuildLocked(root, id, opts))`.
   `r.busy` → `{ ok:false, refused:true, taskId, reason: 'build-start-busy', text: 'Task <id> NOT started —
   another build start is being recorded at this moment; run the same command again.' }`, nothing moved
   or written. Otherwise return `r.value`.

`claimBuildLocked(root, id, opts)` — internal, not exported; its caller holds the lock:

a. **Reload and re-check.** `reg = taskRegistry.load(root)`; the task missing → throw unknown id; status
   `running` or `cancelling` → refuse `reason: 'already-started'`, text `Task <id> NOT started — another
   start claimed it first; it is running.`; any other status that is not `queued` → refuse `reason:
   'not-queued'`, text `Task <id> NOT started — it was <status> while starting.`; `canRun(task, reg)`
   refuses and not `force` → refuse with today's scheduler sentence and its reason. Nothing moved or
   written.
b. **Locate the plan.** `slug = String(task.plan).replace(/\.md$/i, '')`; `isSafePlanSlug(slug)` false, or
   neither `plans/todo/<slug>.md` nor `plans/in-progress/<slug>.md` exists (`safeFs.existsSync` on
   `path.join(getPlansDir(root), stage, slug + '.md')`) → refuse, also when forced (parent decision 3):
   `reason: 'plan-not-found'`, text `Task <id> NOT started — its plan "<slug>" is in neither plans/todo/
   nor plans/in-progress/, so it cannot be built.` (the slug control-stripped and cut at 80 characters).
c. **Move (before the registry write).** If `todo/<slug>.md` exists: `newPath = startExecution(todoPath,
   root)` (clears the status file and moves through `movePlan`, which busts the cache), `moved = true`.
   If that throws, whether or not the todo file is still there, refuse `reason: 'plan-move-failed'`, text
   `Task <id> NOT started — its plan "<slug>" could not be moved from plans/todo/ to plans/in-progress/
   (<error message, control-stripped, cut at 120>); it stays in plans/todo/.` If only the in-progress file
   exists (a start moved it and its registry write failed — parent scenario 4), `moved = false`, no move.
d. **Registry write (compare-and-swap, pure mutator).** `taskRegistry.withRegistry(root, (fresh, ctx) =>
   …)`: the task in `fresh` is missing or not `queued` → `ctx.abort()`, outcome `lost`; `canRun(t, fresh)`
   refuses and not `force` → `ctx.abort()`, outcome `refused` with that reason; otherwise `updateTask(fresh,
   id, { status: 'running', agentTaskId: opts.agentTaskId ?? null })`, outcome `claimed`. `forced` and the
   `forced_start` reason come from the `canRun` decision inside the mutator that committed. The lock keeps
   other build starts out; the mutator's re-check covers the writers the lock does not hold back (a
   completion, a cancel, a task add or a reconcile in another process).
e. **After the write.**
   - `claimed`: when forced, `taskRegistry.warnLog(root, 'forced_start', { id, reason })` (today's event);
     return ok with `text` `Task <id> → running · its plan <slug> is in plans/in-progress/` (forced:
     today's FORCED sentence, word for word, then the same suffix), `planPath:
     'plans/in-progress/<slug>.md'`.
   - `refused` or `lost`, and every throw from the write (a real write failure or an exhausted
     compare-and-swap retry): when this call moved the plan, reload the registry; when the task is
     `running` or `cancelling`, leave the plan in `in-progress/` (it belongs to that start); otherwise move
     it back (`movePlan(inProgressPath, 'todo', root)`; a failed move back is named in the text or in the
     rethrown error's message, never thrown on its own). A reload that throws counts as not running: move
     the plan back. A failed move back appends to the text, or to the rethrown error's message: ` Its plan
     could not be moved back to plans/todo/ (<message, control-stripped, cut at 120>); it is in
     plans/in-progress/.`
   - Then: a throw is rethrown, so the dispatcher reports the failure. `refused` → `{ ok:false,
     refused:true }` with the scheduler's reason and today's sentence. `lost` → text by the reloaded
     state: `running` or `cancelling` → `reason: 'already-started'`, `Task <id> NOT started — another start
     claimed it first; it is running.`; `cancelled`, `failed` or missing (any other state) → `reason:
     'not-queued'`, `Task <id> NOT started — it was <status, or removed when missing> while starting; its
     plan is back in plans/todo/.` (the last clause only when this call moved the plan back).

The plan's place in the todo order survives a move back: `.ctoc/state/todo-order.json` lists basenames
(`state.readTodoQueueOrder`).

### `taskTransition` (`src/lib/menu-screens.js`)

- Before the `withRegistry` call at line 2245, for `kind === 'start'`: peek with `loadReg(root)`; when
  the task is `implement`, `queued` and names a plan (`plan != null`), return
  `menuClaimResult(require('./actions').claimBuild(root, id, { agentTaskId: p.agentId || id, force:
  p.force === true }))`, where the local mapper keeps the menu's response shape: `{ ok, taskId, status:
  'running', text, planPath }` plus `forced: true, reason` when forced, or `{ ok:false, refused:true,
  taskId, reason, text }`. A build with no plan, every non-build kind, and every non-queued task keep
  today's path unchanged (parent scenario "starting a task that is not a build moves no plan file").
- The stamp branch (lines 2249-2257) becomes: a `start` with a non-empty `--agent-id` on a `running`
  task stamps it when its recorded agent is null or equals its own task id; otherwise it `ctx.abort()`s
  and returns `{ ok:false, refused:true, taskId, reason: 'agent-recorded', text: 'Task <id> NOT stamped —
  it already records agent <agent, control-stripped>; a build is never launched twice.' }`. Its comment
  says exactly that: null is a claim by Start agent, the task's own id is the claim's placeholder from
  `menu task start <id>`; nothing about the continuation.
- The doc comment above `taskTransition` (lines 2197-2207) names `actions.claimBuild` as the build start
  and keeps the ladder list.

### `startAgent` (`src/lib/actions.js` lines 1822-1910)

- Its steps 3-5 (the todo walk, the claim, the plan move; the code comments numbered 3, 4 and 5, lines
  1840-1902) run inside `withBuildStartLock(root, …)`; steps 1 (the drain stop) and 2 (the stale sweep)
  stay before it. A busy lock returns `{ started: false, error: 'another build start is being recorded at
  this moment; press Start agent again' }`.
- When `addAndClaim(..., { uniquePlan: true })` answers `existing`: a `queued` existing task is claimed
  with the unlocked inner `claimBuildLocked(root, task.id, { agentTaskId: null })` — never `claimBuild`,
  whose nested acquisition of the lock this call already holds would refuse itself as busy — and never
  forced (Start agent's `force` only clears a requested stop). Claimed → the same `setAgentStatus` and `{
  started: true, task, plan: { name, path: newPath }, … }` return as a fresh claim. Refused →
  `queuedTasks.push({ plan, taskId, reason })` and the walk continues; the already-started and not-queued
  refusals push their own reason like any refusal. A throw because the task is gone (the unknown-id
  error) → `queuedTasks.push({ plan: plan.name, taskId: task.id, reason: 'already-queued' })` and the walk
  continues; any other throw propagates as today.
- A `running` or `cancelling` existing task is left alone with reason `already-queued`, as today.
- The fresh-claim path keeps `addAndClaim` + `startExecution`, under the same lock.
- The comment at lines 1867-1872 says the queued task is claimed through `claimBuildLocked` under the
  build-start lock.

## Implementation Details

### Dependency Graph

```
src/lib/menu-screens.js:taskTransition --lazy require--> src/lib/actions.js:claimBuild
src/lib/actions.js:claimBuild          --calls---------> withBuildStartLock, claimBuildLocked
src/lib/actions.js:startAgent          --calls---------> withBuildStartLock, claimBuildLocked
src/lib/actions.js:claimBuildLocked    --calls---------> task-registry (load, canRun, withRegistry, updateTask, warnLog),
                                                         startExecution / movePlan, isSafePlanSlug, state.getPlansDir,
                                                         tui.stripCtl
src/lib/actions.js:withBuildStartLock  --calls---------> safe-fs (mkdirSync, writeFileSync 'wx', statSync, readFileSync, unlinkSync)
tests/a-build-start-moves-its-plan.test.js --drives--> menu-screens.route, actions.startAgent, src/commands/start.js (child process)
```
No cycle: menu-screens already requires actions lazily (`cancelTask`, `completeTaskPlan`); `src/lib/tui.js`
requires only `readline`.

### File Specifications

- `src/lib/actions.js` — MODIFY: add `withBuildStartLock`, `claimBuildLocked` and `claimBuild` (above),
  export `claimBuild`; `startAgent` runs its walk under the lock and claims an existing queued task
  through `claimBuildLocked`; text that carries an agent id or an error message is control-stripped with
  `require('./tui').stripCtl` (`src/lib/tui.js` line 37, exported at line 272 — the same expression a new
  local helper would have).
- `src/lib/menu-screens.js` — MODIFY: `taskTransition`'s build branch, stamp branch and comments.
- `tests/a-build-start-moves-its-plan.test.js` — CREATE (below).

### Test Plan — `tests/a-build-start-moves-its-plan.test.js` (written first, `node:test`)

Fixture: a temporary project (`fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-claim-'))`) with
`plans/{todo,in-progress,review,done}`, `.ctoc/state`, and a gated plan writer copied from
`tests/scheduler-enforced.test.js` lines 59-76 (two front-matter blocks, `files:`, all nine steps
checked), so a completion passes pre-review validation. `regBytes()` reads `.ctoc/state/tasks.json`
raw; `LOCK` is `.ctoc/state/build-start.lock`. Each case is named after the parent's scenario.

1. **a queued build starts and its plan moves with it**: add `implement delta --touches src/delta.js`,
   `route(['menu','task','start',t1])` → ok, status running, `agentTaskId === 't1'`, `planPath ===
   'plans/in-progress/delta.md'`, delta in `in-progress/` and not in `todo/`; then `menu task complete
   t1` → `ok: true` (no "no plan file" refusal).
2. **a start the scheduler refuses moves nothing**: a running `quality` task touching `src/delta.js`;
   start t1 → `ok:false`, `refused`, `reason 'file-conflict'`; delta still in `todo/`; t1 queued with
   `agentTaskId null`; `regBytes()` byte-identical (so the generation did not move).
3. **a plan that cannot be moved refuses the start**: (a) delta in `review/`; (b) no delta file; (c)
   delta in `todo/` and `safeFs.renameSync` mocked (`t.mock.method`) to throw for the todo→in-progress
   source path only → each refused with one sentence naming "delta" and the two folders (c: the
   could-not-be-moved sentence), t1 queued, `regBytes()` unchanged, delta still where it was; (d) `--force`
   with no plan file → refused the same way, no `forced_start` warn entry.
4. **a plan already in the build is not moved again**: delta only in `in-progress/`, t1 queued → start
   → ok, running, `planPath === 'plans/in-progress/delta.md'`, exactly one `delta.md` under `plans/` (in
   `in-progress/`), none in `todo/`.
5. **the stamp accepts the placeholder and refuses a foreign agent id**: (A) claimed by `menu task start
   t1` (agent `t1`); (B) claimed by `actions.startAgent(root)` (agent null). In each: `start t1
   --agent-id H1` → ok, `stamped`, agent H1, delta not moved again (one file, in `in-progress/`); then
   `--agent-id H2` → `ok:false`, `reason 'agent-recorded'`, H1 still recorded, `regBytes()` unchanged.
6. **Start agent claims the queued task of the first plan**: `todo-order.json` `["delta.md","echo.md"]`,
   t1 queued for delta, no task for echo → `startAgent(root)` → `started: true`, `task.id === 't1'`,
   `plan.name === 'delta'`, delta in `in-progress/`, echo in `todo/`, exactly one implement task for
   delta, none for echo.
7. **Start agent leaves a queued task that the scheduler refuses queued**: as 6 plus a running `quality`
   task touching `src/delta.js` (delta's declared file), so the refusal is `reason 'file-conflict'` → t1
   queued, one task for delta, delta in `todo/`, and the walk starts echo (`plan.name === 'echo'`), as
   today. The blocker is deliberately a non-build task, never a running or cancelling `implement` task:
   slice 13 makes Start agent's walk stop at the first refusal caused by a running or cancelling build, so
   a build blocker here would turn this case red once slice 13 lands.
8. **starting a task that is not a build moves no plan file**: for each of `review`, `plan`, `classify`,
   `precompute` with plan `delta` → running, delta still in `todo/`.
9. **the reproduction runs through the real menu command**: in a temporary project with `.ctoc/` and
   plans delta and echo in `todo/` (each with `files:`), run `node src/commands/start.js` as a child
   process (`execFileSync(process.execPath, [MENU, ...args], { cwd })`, JSON parsed): `menu task add
   implement delta --touches src/delta.js,plans/todo/delta.md`, `menu task start t1` (delta now in
   `in-progress/`), `menu task start t1 --agent-id agent-xyz` (t1 records agent-xyz), `menu task complete
   t1 --continue` → `ok: true`, delta in `review/`, `.ctoc/state/verify/delta.json` exists.
10. **two starts of the same queued build at once claim it once** — each start passes the scheduler check
    (the read-only check, outside the lock) before either writes:
    (a) two menu starts: mock `safeFs.renameSync` so that the first rename whose source is
    `plans/todo/delta.md` first runs a second `route(['menu','task','start','t1'])` to completion, then
    performs the original rename. The second start runs after the first's read-only check, inside the
    first's lock → the second answers `ok:false`, `reason 'build-start-busy'`; the first answers ok;
    (b) Start agent and the menu start: the same seam runs `actions.startAgent(root)` as the second start
    → it answers `started: false` with the busy error; the first answers ok;
    (c) after the first releases: mock `taskRegistry.canRun` so that its first call, made by start A's
    read-only check, first runs start B (a menu start of t1) to completion, then returns the original
    decision → A takes the lock after B released it, reloads, finds t1 running → `ok:false`, `reason
    'already-started'`, delta not moved again;
    (d) two real processes: spawn two `node start.js menu task start t1` at once (`child_process.spawn`,
    await both `close` events) → exactly one of the two child-process outputs has `ok: true`.
    In every case: t1 running exactly once, one implement task for delta, exactly one `delta.md`, in
    `in-progress/`; after both have returned, never `in-progress/` with t1 queued; `LOCK` is gone.
11. **a write-time refusal puts the plan back**: mock `taskRegistry.withRegistry` so that its first call
    first commits (through the real function) a running `quality` task touching `src/delta.js` → start
    refused `file-conflict`, delta back in `todo/`, t1 queued.
12. **a failing registry write puts the plan back and is reported**: mock `safeFs.renameSync` to throw
    `EIO` once for a source under `.ctoc/state/` → the route answers `ok:false` with the error, delta in
    `todo/`, `regBytes()` unchanged.
13. **a forced build start is logged, as today**: a running `quality` task on delta's file; `start t1
    --force` → ok, `forced`, `reason 'file-conflict'`, text matches /FORCED/, delta in `in-progress/`,
    a `forced_start` warn entry `{ id: 't1', reason: 'file-conflict' }`.
14. **a stale lock is taken over; a live lock refuses at once**: (a) `LOCK` written with a foreign token
    and its modification time set 61 s back (`fs.utimesSync`) → start t1 → ok, delta in `in-progress/`,
    `LOCK` gone; (b) `LOCK` written with a foreign token and the current time → start t1 → `ok:false`,
    `reason 'build-start-busy'`, delta in `todo/`, `regBytes()` unchanged, and `LOCK` byte-identical to
    what the test wrote.
15. **the lock is released on every path**: `LOCK` is gone after (a) an ok start, with delta in
    `in-progress/`; (b) a refused start, the plan-not-found refusal of case 3(b), answering `reason
    'plan-not-found'`; and (c) a start whose registry write throws `EIO` (case 12's seam), answering
    `ok:false` with the error and delta in `todo/`. (d) A lock replaced during the start (the case-12 seam
    rewrites `LOCK` with a foreign token before throwing) is left in place, byte-identical, and that start
    answers `ok:false` with the error and delta in `todo/`.
16. **a cancel during the start puts the plan back**: mock `taskRegistry.withRegistry` so that its first
    call first commits `route(['menu','task','cancel','t1'])` → start refused, `reason 'not-queued'`,
    text names "cancelled", delta back in `todo/`, t1 cancelled, `LOCK` gone.
17. **the remaining lock and claim branches**: (a) the lock vanishes between the create and the stat —
    mock `safeFs.statSync` to delete `LOCK` and throw `ENOENT` → the start is ok and `LOCK` is gone
    afterwards; (b) the stale delete throws `EPERM` (mocked) while a foreign `LOCK` stays →
    `build-start-busy`; (c) a create error other than `EEXIST` (mocked `EIO`) → `ok:false` with the error,
    and no `LOCK` left; (d) t1 cancelled between the read-only check and the lock (the case-10(c) `canRun`
    seam runs a cancel) → `not-queued`, delta stays in `todo/`; (e) the move back fails (case 12's seam
    plus `renameSync` throwing for the in-progress→todo source) → the message names it and delta is in
    `in-progress/`; (f) Start agent's existing-task path with the task gone at reload (mock
    `taskRegistry.load` on its reload call) → `queuedTasks` holds `already-queued` and the walk goes on;
    (g) Start agent's existing-task path with a registry write throwing `EIO` → `startAgent` throws.

Coverage: every branch of `withBuildStartLock` (create, busy, stale takeover, vanished lock, release of
our own lock only), of `claimBuildLocked` (each refusal, both move paths, move back, rethrow) and of
`startAgent`'s existing-task path, plus both stamp outcomes; the coverage floor is checked at Step 14.

### Security Review

- [x] Path traversal: `task.plan` comes from the registry (writable by `menu task add`); it is joined
  into a path only after `isSafePlanSlug` (`^[A-Za-z0-9._-]+$`, no `..`), the check the completion uses.
- [x] Text injection: agent ids and error messages are control-stripped (`tui.stripCtl`) before they
  reach a result text; plan slugs are already restricted by `isSafePlanSlug`.
- [x] One new write location: `.ctoc/state/build-start.lock`, created exclusively (`'wx'`) through
  `safeFs` and deleted only by the start whose token it holds, or by a start that finds it more than 60 s
  old. A planted or left-behind lock blocks build starts for at most 60 s, each refused with a plain
  sentence. Plans move only between `plans/todo/` and `plans/in-progress/`, through `movePlan` (which
  refuses to overwrite a different same-named plan).
- [x] The write protection is unchanged (`src/hooks/protect-records.js` is not touched): a background
  agent may still run `menu task start <id> --agent-id <id>` only (`TASK_GRAMMAR` line 291); that start
  now also moves the plan, which crosses no gate (`src/lib/gate-order.js` lines 24-27).
- [x] No secrets, no shell, no new dependency.

### Wiring — the live call sites

- `claimBuild` is called by `menu-screens.taskTransition` (route `menu task start`, reached from
  `src/commands/start.js` through `route`); `claimBuildLocked` and `withBuildStartLock` are called by
  `claimBuild` and by `actions.startAgent` (the menu's `claude:start-agent` recipe, `src/commands/start.md`
  line 65, and the agent area's `g` key, `src/areas/agent.js` line 108).
- The stamp change lives in the same live route.

## Acceptance Criteria

- [x] Parent scenarios 1-10 of its slice 1 pass as the test cases above, through the router, through
  `startAgent`, and (case 9 and 10d) through the real menu command in a temporary project.
- [x] Two build starts are never inside the build-start step at once; a busy start is refused at once
  with a plain sentence, and the lock is gone after every start (cases 10, 14, 15).
- [x] The case-9 reproduction of 2026-10-11 now ends with delta in `review/` and its check evidence on
  disk.
- [x] `npm test` passes; CLAUDE.md's and README.md's test-file counts are updated by
  `node -e "const r=require('./src/scripts/release.js');r.updateDocCountsInClaudeMd();r.updateDocCountsInReadme()"`.

## Risks

| Risk | Mitigation |
|---|---|
| Another existing test starts a build whose plan is in neither folder | Slice 1 fixed the fifteen found by reading; the last sub-item of Step 10 runs the full suite with the change and lists any other; a test that starts a build only to hold a file gets the slice-1 treatment, recorded by name; any other failure is a regression in this code |
| A start that holds the lock for more than 60 s has its lock taken over by another start | Two holders are possible after a takeover: a holder slower than 60 s, or two starts taking over the same stale lock at once (the second's delete removes the first's new lock). The mutator re-check keeps the registry single-claimed; the one outcome it cannot repair is a running task whose plan is back in plans/todo/, reachable only when one holder's registry write also throws. Recovery: `menu task cancel <id> --force`, then start again. `withBuildStartLock` carries a `ponytail:` comment naming this ceiling. |
| `plans/implementation/the-manual-and-the-docs-stop-claiming-what-ctoc-no-longer-does.md` also declares `src/lib/menu-screens.js` | Plans build one at a time; Step 9 re-reads the file as it then is |
| For the owner, outside this plan: the task registry's save is not atomic between processes. `save()` reads the generation from disk (`src/lib/task-registry.js` line 495), then writes and renames (lines 521-522) with no lock between, so a claim racing a completion, an add, a cancel or a reconcile in another process can be lost; the header's statement at line 81 that two live processes cannot lose each other's updates is not true | The build-start lock protects a build start against another build start only. A neighbour for the owner to schedule; not changed here |

## Decisions Taken Under Ambiguity

1. **One build start at a time, through an exclusive lock file (the CTO Chief's choice).** The parent
   leaves the mechanism to the planner; no question is open. `withBuildStartLock` holds
   `.ctoc/state/build-start.lock` across the re-check, the plan move and the registry write, so no number
   of interleaved starts can leave a plan and its task out of step. A busy lock refuses at once instead of
   waiting (no sleep loop); a lock more than 60 s old is taken over, so a crashed start blocks others for at
   most 60 s. The scheduler check runs once read-only outside the lock, so a start the scheduler refuses
   takes no lock and writes nothing (parent scenarios 2 and 3), and the parent's test shape — both starts
   pass the scheduler check before either writes — is produced directly (case 10). The registry write
   keeps its compare-and-swap mutator re-check for the writers the lock does not cover.
2. **The scheduler check runs before the plan check.** A start the scheduler refuses keeps today's
   reason (`file-conflict`, `blocked-dep`, …), so the existing refusal tests stay meaningful; `--force`
   overrides only the scheduler (decision 3).
3. **A build task that names no plan (`plan: null`) keeps today's registry-only start.** It has nothing to
   move and completes registry-only (`taskComplete` line 2413); refusing it would change behaviour no
   scenario asks for.
4. **The stamp rule applies to every kind, not only builds.** A non-build started without `--agent-id`
   also records its own id; letting the session stamp it later is the same rule, and a foreign agent id is
   refused for every kind as before (today by "invalid transition", now by a plain sentence).
5. **The claim returns the plan's `in-progress/` path (`planPath`)** so the session can brief the agent
   with it (slice 5 writes that into the instructions).
6. **Start agent never forces a claim.** Its `force: true` only clears a requested stop (parent decision
   1); the claim of an existing queued task obeys the scheduler like any other start.
7. **A task that left `queued` while starting is refused by its state.** `running` or `cancelling` reads
   `already-started` ("another start claimed it first; it is running."); `cancelled`, `failed` or missing
   reads `not-queued` ("it was <status> while starting"). Two reasons, because the session acts
   differently: the first has an agent coming, the second has none.

8. **Fix round 1, rulings by the CTO Chief beyond the spec text (Steps 11 and 13 findings).**
   - The build-or-registry decision is made inside the write snapshot of `taskTransition`
     (abort, then delegate to `claimBuild`), with no separate read before it.
   - A stamp whose `--agent-id` equals the agent id already recorded is an idempotent success
     without a write ("Task <id> → running (agent <id> already recorded)"); a different
     recorded id is still refused as `agent-recorded`.
   - `--agent-id` is accepted only as `^[A-Za-z0-9._:-]{1,128}$`, on the claim and on the
     stamp (reason `agent-id-unusable`, the raw value never echoed); a recorded agent id is
     shown only in that form, else "an agent id of unexpected form".
   - The build-start lock path is judged with `lstat`: a symbolic link is deleted and the create
     retried once; a directory or any non-regular file is refused with reason
     `build-start-lock-unusable` and left untouched; staleness counts both ways
     (`Math.abs`), so a lock dated in the future is taken over after 60 s of difference.
   - `claimBuildLocked` requires `task.plan` to be exactly a bare plan name (reason
     `plan-name-not-bare` for a `.md` suffix) and finds the file by exact name in a
     directory listing (`Delta` does not find `delta.md`). A plan found only in
     `plans/in-progress/` is refused (`plan-held-by-another-build`, naming the task) when
     another non-terminal implement task covers the same name, `.md` and letter case aside.
   - A reload that finds the registry unreadable (a throw, or the `unreadable` marker) says
     "the task registry could not be read", not "removed".
   - Start agent's busy result carries `busy: true`; the continuation records the reason
     `build-start-busy`. The words for any `reasons` entry are not written anywhere in this
     repository (no consumer of `reasons` exists in `src/`, `agents/`, `skills/` or `docs/`;
     searched for the sibling reasons `sweep-failed` and `plan-not-queued`: one file, the
     producer), so the sentence for `build-start-busy` is for the CTO Chief to give the
     session; no file of this plan carries it. An unusable lock answers
     `{ started: false, error }` without `busy`: running the command again would not help.
   - `claimBuild` throws for a task that is not an `implement` task naming a plan, and its
     unknown-id error carries `code: 'unknown-task'`.
   - A failed delete of our own lock is written to the task warn log
     (`build_start_lock_release_failed`, with the project-relative lock path); the start
     still answers its own result.
   - Correction to the Security Review above (not to the spec text): background agents may
     also run `menu task add`, besides `menu task start <id> --agent-id <id>`.

## Execution Plan

### Step 8: TEST
- [x] Write `tests/a-build-start-moves-its-plan.test.js` with the seventeen cases above; run `node --test tests/a-build-start-moves-its-plan.test.js` and record that every case except 2, 7, 8, 11 and 12 (guards, which pass on today's code) fails on today's code, case 17 included.

### Step 9: PREPARE
- [x] Re-read `taskTransition`, `startAgent`, `startExecution`, `movePlan` and `src/lib/plan-index/store.js` lines 480-526 as they are now.

### Step 10: IMPLEMENT
- [x] `src/lib/actions.js`: `withBuildStartLock`, `claimBuildLocked`, `claimBuild` and its export; `startAgent` runs steps 3-5 under the lock and claims an existing queued task through `claimBuildLocked`; the comment at lines 1867-1872.
- [x] `src/lib/menu-screens.js`: the build branch and mapper in `taskTransition`, the stamp branch, both comments.
- [x] `CLAUDE.md`, `README.md`: the test-file count lines, through the release script's two count functions.
- [x] With the change in place, run the full suite once and list every failing test by name in the build record before fixing anything; classify each per the first risk row.

### Step 11: REVIEW
- [x] The critic replays each interleaving in case 10 on paper against the code, and checks that no path leaves a plan in `in-progress/` with its task queued after the start returns, and that every path releases the lock it took. (Two rounds ran: round 1 found 9 items, all fixed; round 2 found all round-1 fixes correct, two low items, fixed. See the Execution Record.)

### Step 12: OPTIMIZE
- [x] One build-start encoding: `startAgent`'s existing-task path and the menu's build start both go through `claimBuildLocked`; the fresh-claim path keeps `addAndClaim` + `startExecution`, under the same lock; no second move or write sequence remains. (Checked in the code, see the record.)

### Step 13: SECURE
- [x] The security scanner attacks the slug-to-path join, the move back, a hostile `--agent-id`, and the lock file (planted, stale, replaced mid-start). (Round 1 warn, round 2 PASS; the secrets detector and static scanner on the combined change are the CTO Chief's, before the release.)

### Step 14: VERIFY
- [x] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.
- [x] Re-run case 9 (the real menu command in a temporary project) and quote its four outputs in the build record.

### Step 15: DOCUMENT
- [x] The comments named above say what the code does; the build record lists every changed test by name.

### Step 16: FINAL-REVIEW
- [x] Every acceptance box is checked against its quoted evidence.

## Execution Record

Build of steps 8-10 (a first builder died on a rate limit before recording anything; this run resumed from its uncommitted files, re-read them in full, and changed only what is named below).

### Step 8 — red phase on today's code

The test file holds 35 `it` cases covering the plan's seventeen numbered cases (3 = 3a-d, 5 = 5a-b, 7 = 7 and 7b, 10 = 10a-d, 14 = 14a-b, 15 = 15a-d, 17 = 17a-g). Run with `node --test` in an unmodified scratch worktree of commit 79f99476 (`.../scratchpad/defects/wt`), with only the new test file copied in:

- Result: 35 cases, 6 pass, 29 fail.
- Pass on today's code: 2, 7, 8, 11, 12 (the five expected guards) and 17f.
- Fail on today's code: 1, 3a, 3b, 3c, 3d, 4, 5a, 5b, 6, 7b, 9, 10a, 10b, 10c, 10d, 13, 16, 14a, 14b, 15a, 15b, 15c, 15d, 17a, 17b, 17c, 17d, 17e, 17g.
- Deviation from the plan's expectation: 17f also passes on today's code. Today's `startAgent` already pushes `already-queued` and continues for any existing task, so the "task gone at the claim" case (a new `catch` branch of this slice) is a guard there, not a red case. It exercises the new branch in the build (a throw `unknown-task` from `claimBuildLocked`), so it stays.
- 7b (the refused task is reported with the scheduler's reason `file-conflict`, not `already-queued`) is the part of plan case 7 that fails today.

### Step 10 — what was built

- `src/lib/actions.js`: `withBuildStartLock`, `claimBuildLocked`, `claimBuild` (exported), `startAgent` = drain stop + stale sweep, then `claimFirstTodoPlan` (steps 3-5) under the lock; an existing queued task goes through `claimBuildLocked` (never forced); comment updated. The previous builder had written all of this; this run completed and corrected it (see Step 10 fixes).
- `src/lib/menu-screens.js`: `menuClaimResult` mapper, the build branch in `taskTransition`, the stamp branch (`agent-recorded` refusal), both comments.
- `CLAUDE.md`, `README.md`: test-file counts 567 -> 568; the release script's `updateDocCountsInClaudeMd` and `updateDocCountsInReadme` report nothing left to update.

### Step 10 — full suite first run, before any fix (`npm test`, 13175 tests)

The new test file: 35 of 35 pass. Seven other tests failed, all caused by this slice's own code (regressions of the new code, not of earlier tests, so none gets the slice-1 treatment):

1. `false-green fence › NO NEW FALSE-GREEN SITE: every finding is already baselined or whitelisted` — four empty catches in `withBuildStartLock` (3) and `claimBuildLocked` (1).
2. `false-green fence › THE RATCHET ONLY TIGHTENS: the finding count never exceeds the baseline` — 211 > 207, same four sites.
3. `false-green fence › LOWER THE BASELINE when you pay debt down` — 211 vs 207, same four sites.
4. `iron-loop-enforcer › CTOC repo passes the thorough self-check with 0 critical and 0 block` — block finding `false-green-fence`, same cause.
5. `iron-loop-enforcer › (7) the summary counts are unchanged — plan-counts still reports exactly one info` — block 1, same cause.
6. `Lint enforcement › ESLint reports zero errors across the codebase` — `security/detect-possible-timing-attacks` at the lock owner comparison (the variable was named `token`).
7. `Typecheck enforcement › tsc --checkJs error count stays at or below the committed baseline` — 10 errors (baseline 0): `decision` possibly null (6), `refuse` result widened to `ok: boolean` (2), `.value` read after the `busy` test (2).

### Step 10 — fixes (all in `src/lib/actions.js`)

- Empty catches replaced by real statements: `statSync` failure sets `st = null`; the stale delete and the release go through a local `attempt(op)` helper (returns false on a throw) with a comment saying why the failure is not a verdict; the registry reload failure sets `state = null`. The behaviour is unchanged (cases 14, 15, 17 still pass).
- Lock owner variable renamed `token` -> `ownerMark` (the repo's own precedent in `claude-md-lessons.js` for this lint rule).
- `decision` starts as `{ run: false, reason: 'not-evaluated' }` instead of null; `refuse` helpers carry a JSDoc `@returns` with literal `ok: false`; the busy tests read `!('value' in locked)` so the type narrows.

### Step 10 — green run

After the fixes: `npm test` -> 13175 tests, 13175 pass, 0 fail, 0 skipped; coverage 99.88% (floor 99); `[CTOC test-gate] PASS`. `npm run lint` clean; `tsc --noEmit` clean.

### Uncertain / for the critic

- Cases 1 and 9 print a Step 14 "no verifiable toolchain" warning to stderr from the temporary project's completion; the cases assert only `ok: true` and the plan in review, as the Test Plan says.
- The test file uses 35 `it` blocks for the plan's seventeen numbered cases; 7b is the only block beyond the plan's lettered list (it pins the refusal reason Start agent reports for the queued task it leaves).

### Fix round 1 of Steps 11-13 — each finding, its test, red and green

Red = `node --test` on the new cases against the code before the fix (all 19 new behavioural cases failed, each for the stated reason; the 35 earlier cases passed). Green = the same file after the fix (54 cases then, 56 with S4b and S4c added for coverage of two reload branches).

- C1 (decision inside the write snapshot): test `C1. an earlier read that fails does not turn a build start into a registry-only start`; red: ok but no `planPath`, plan left in todo/ (registry-only start); green.
- C2 (stale test on Math.abs): test `14c. a lock dated one hour ahead is taken over`; red: `build-start-busy`; green.
- C3 (busy flag and continuation reason): test `C3. Start agent's busy result carries busy: true and the continuation names build-start-busy`; red: `busy` undefined; green. The sentence for the reason is not in any file of this plan (see Decisions 8); for the CTO Chief.
- C4 (own lock undeletable is logged): tests `C4. our own lock that cannot be deleted is named in the warn log, and the start still succeeds` (red: no warn entry; green) and the guard `C4b. a lock another start took over is not named` (passes before and after).
- C5 (comment and return type of Start agent): comment only, no test.
- C6 (claimBuild throws): tests `C6a`, `C6b` (red: no exception) and `C6c` (red: no `code`); green.
- C7 (idempotent stamp): test `C7. the agent id already recorded is an idempotent success with no write; a different one is still refused`; red: text lacked "already recorded"; green.
- C8, C9 (join inside `if (isSafePlanSlug)`, one module-level `refuse`, no `id` alias): refactors, covered by every existing case; no new test.
- S1 (lstat, link, directory, future date): tests `14d` (broken link; red: busy), `14e` (directory; red: `build-start-busy` instead of `build-start-lock-unusable`), `14f` (Start agent says the same words and no `busy`; red: the busy sentence), `14c` (above); green.
- S2 (bare plan name, exact file name, one live build per name): tests `S2a` (`delta.md`; red: the start succeeded), `S2b` (`Delta`; red: the start succeeded on a case-insensitive file system), `S2c` (second live task for the same plan; red: the start succeeded); green.
- S3 (agent id form): tests `S3a` (claim), `S3b` (stamp; 128 characters accepted), `S3c` (a recorded id of unexpected form is not echoed); red: unusable ids accepted and echoed; green.
- S4 (unreadable registry): test `S4. a reload that finds the registry unreadable does not say the task was removed` (red: "it was removed while starting"; green), plus `S4b` (reload throws) and `S4c` (task claimed meanwhile keeps the plan in the build, reason `already-started`), added green-only for the two branches the first full run showed uncovered.
- S-note: recorded under Decisions 8 (background agents may also run `menu task add`).

Existing tests adjusted for the new call order and the mandated `lstat` (no assertion weakened): `11`, `16` and `S4` arm their seam on the claim's own registry write (a shared helper `beforeClaimWrite`: the first `withRegistry` call made once delta is in the build), because the menu's new decision snapshot is now the first `withRegistry` call and writes nothing; `17a` mocks `lstatSync` instead of `statSync`.

Full run (`npm test`, includes ESLint and `tsc` checks): 13196 tests, 13196 pass, 0 fail, 0 skipped; coverage 99.88% (floor 99); `src/lib/actions.js` 100% lines; `[CTOC test-gate] PASS`.

### Fix round 2 (the last) — each finding, its test, red and green

Red = the new cases run before the fix (all four failed, each for the stated reason); green = the same file after (60 cases, 60 pass, 0 skipped).

- R1 (critic, low; `withBuildStartLock`): a symbolic link at the lock path whose delete fails is now returned as unusable (`build-start-lock-unusable`, the project-relative path) instead of falling through to busy. Test `R1. a symbolic link at the lock path that cannot be deleted is refused as unusable, not busy` (`unlinkSync` mocked to throw EPERM for the lock path, link planted); red: reason `build-start-busy`; green.
- R2 (critic, cosmetic; `src/lib/menu-screens.js`): the missing space in "`actions.claimBuild`: the shape". Comment only, no test.
- R3 (security, low; the release in `finally`): the lock path is `lstat`ed first and read only when it is a plain file of at most 64 bytes; otherwise it is left and nothing is logged. The doc comment now says links are never followed when the lock is taken and when it is released. Tests `R3a. a lock replaced by a link to a file holding our own mark is not read through, and the link stays` (the lock is replaced during the start by a link to a file holding our own mark; red: the link was read through and deleted) and `R3b. a lock replaced by a file longer than 64 bytes is not read and is left in place` (red: the file was read); green.
- R4 (security, low; `claimBuildLocked`): `typeof task.plan !== 'string'` is refused with reason `plan-name-not-bare` before the name is turned into text. Test `R4. a task whose plan is a list is refused as not bare; the plan of the same name stays in todo/` (registry task with plan `["delta"]`); red: the start succeeded and moved delta; green: refused, delta in `todo/`, registry bytes unchanged, no lock left.

### Step 12 — one build-start encoding (checked in the code)

`claimBuild` (the menu's route) and `startAgent`'s existing-task path both call `claimBuildLocked`, each under `withBuildStartLock`; the fresh-claim path keeps `addAndClaim` + `startExecution` under the same lock (the only other caller of `startExecution` inside the build start is `claimBuildLocked` itself). `menu-screens.js` reaches the build start only through `actions.claimBuild`; it holds no move and no second registry-write sequence. No change needed.

### Step 13 — security record

Round 1 (security scanner): warn, 2 medium and 2 low findings, all fixed in fix round 1 (lstat on the lock path, bare plan name and exact file name, hostile `--agent-id` form, unreadable registry). Round 2: PASS with 2 low items (R3, R4 above), fixed in fix round 2. For the CTO Chief: the secrets detector and the static scanner run on the combined change before the release; not run here.

### Step 14 — verify

- `node --test tests/a-build-start-moves-its-plan.test.js`: 60 tests, 60 pass, 0 fail, 0 skipped.
- `npm test` (lint, typecheck, suite, coverage gate): 13200 tests, 13200 pass, 0 fail, 0 skipped, 0 cancelled; coverage 99.88% (floor 99); `[CTOC test-gate] PASS`; `actions.js` 100.00% lines; `menu-screens.js` 99.54% lines (uncovered lines 2390-2394 and others, outside this slice's new code).
- Case 9 re-run through the real menu command (`node src/commands/start.js`, a temporary project with delta and echo in `plans/todo/`, a gated plan writer), four outputs:
  1. `menu task add implement delta --touches src/delta.js,plans/todo/delta.md` → `{"ok":true,"taskId":"t1","decision":"run","reason":"ok","status":"queued","text":"Task t1 queued (implement delta) — run: ok"}`
  2. `menu task start t1` → `{"ok":true,"taskId":"t1","status":"running","text":"Task t1 → running · its plan delta is in plans/in-progress/","planPath":"plans/in-progress/delta.md"}`
  3. `menu task start t1 --agent-id agent-xyz` → `{"ok":true,"taskId":"t1","status":"running","stamped":true,"text":"Task t1 → running (agent agent-xyz recorded)"}`
  4. `menu task complete t1 --continue` → `{"ok":true,"taskId":"t1","status":"done","text":"Task t1 → done · moved to review (the checks FAILED; the evidence is saved for when you decide it’s finished)", "completion":{"ran":true,"blocked":false,"stage":"in-progress","newPath":"<temporary project>/plans/review/delta.md","verify":{"passed":false, … "no-verifiable-toolchain" …}}}`; afterwards `plans/review/delta.md` exists and `.ctoc/state/verify/delta.json` exists. The failed check is the temporary project having no toolchain (as in the first run's note); the acceptance box asks for the plan in review with its evidence on disk, and that holds.

### Step 15 — document

The comments say what the code does: the lock doc comment (links never followed when the lock is taken and when released, the 64-byte read limit), the `claimBuildLocked` and `taskTransition` comments, the stamp-branch comment. Every changed test, by name, in `tests/a-build-start-moves-its-plan.test.js`: the 35 original cases (1, 2, 3a-d, 4, 5a-b, 6, 7, 7b, 8, 9, 10a-d, 11, 12, 13, 14a-b, 15a-d, 16, 17a-g); round 1 added C1, 14c, 14d, 14e, 14f, C3, C4, C4b, C6a, C6b, C6c, C7, S2a, S2b, S2c, S3a, S3b, S3c, S4, S4b, S4c; round 2 added R1, R3a, R3b, R4. Round 1 adjusted 11, 16, S4 (arm on the claim's own registry write) and 17a (mocks `lstatSync`), no assertion weakened. For the CTO Chief: `src/commands/start.md` lines ~136-138 ("A claimed build is already running with no agent id") are rewritten by slice 5, not here.

### Step 16 — acceptance boxes

All four ticked against the evidence above: scenarios 1-10 = the named cases, all in the 60 passing; the two-starts and lock-release box = cases 10a-d, 14a-f, 15a-d; the case-9 box = the four outputs above; `npm test` = 13200 pass and the count lines in CLAUDE.md and README.md are held by the doc-count tests, which passed. Nothing left unticked. `menu task complete` is for the CTO Chief.
