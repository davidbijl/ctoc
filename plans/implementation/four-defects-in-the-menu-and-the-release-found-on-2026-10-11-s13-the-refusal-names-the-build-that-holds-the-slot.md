---
title: "Every build refusal names the build that holds the slot, says its agent cannot be confirmed alive, and names what frees the slot"
type: implementation
created: 2026-10-11
priority: high
effort: medium
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s12-one-build-at-a-time-in-the-scheduler
files:
  - src/lib/actions.js
  - src/lib/menu-screens.js
  - tests/actions-scheduler.test.js
  - tests/one-build-at-a-time.test.js
  - tests/greenfield-journey.test.js
  # RATCHET FILES — not counted toward the ~1–3 budget: this slice CREATES a test file, which
  # moves the test-file count in CLAUDE.md and in README.md's structure block.
  - CLAUDE.md
  - README.md
revision: 1
rejection_reason: "Owner's revision of 2026-10-17: one build at a time covers builds in the main checkout only; a build"
tag: rejected
---
# REVISION 1

## Rejection Feedback

Owner's revision of 2026-10-17: one build at a time covers builds in the main checkout only; a build recorded with its own worktree path runs alongside (lesson 21). Revise the rule, the refusal and the texts to that scope.

---


# Every build refusal names the build that holds the slot, says its agent cannot be confirmed alive, and names what frees the slot

Slice 13 of 14 of `plans/functional/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`:
the parent's slice 5 — scenarios "a second build cannot start while one runs or is cancelling", "a
refusal names a build that has no agent", "a refusal says it cannot confirm the holder is alive, and what
frees the slot", "two starts of two builds at once leave one build running", "a completion offers the
next build, and only one", "other task kinds keep the five-slot ladder" (through the routes), "the
owner's override still starts it, and it is logged", "Start agent, forced as the menu calls it, leaves a
second build queued" and "a background agent cannot force a build start" (met by slice 21's
decision-route refusal, not here: the CTO Chief's ruling of 2026-10-18, decisions 14 and 16); decisions
1 and 4.

**Scope since the owner's revision of 2026-10-17 (Operating Lesson 21).** Slice 12 holds one build at a
time in the MAIN CHECKOUT only; a build recorded with its own worktree runs alongside. So the refusal
names the MAIN-CHECKOUT build that holds the slot, never a worktree build, and a build being claimed
with its own worktree is never refused for the main checkout's slot, so it gets no holder sentence.

## Problem Statement

Since slice 12 a second main-checkout build is refused with reason `one-build` — or `file-conflict` when it also
overlaps the running build's files, because Rule 5 sits after the file-conflict rule (slice 12 decision
2). The menu's refusal still says "the scheduler refuses it (<code>). Wait for the blocker to clear, or
override with --force" (`src/lib/menu-screens.js` lines 2645-2646, and slice 2's `claimBuild` and `claimBuildLocked`
through `schedulerRefusalText`, `src/lib/actions.js` lines 1089-1091, which keep that sentence word for word) and Start agent's result says only the code. The parent requires every build
refusal to name the build that holds the slot (task id, plan, recorded agent or "no agent recorded"), to
say the command cannot confirm that agent is alive, and to name the owner's existing `menu task cancel
<id> --force` as what frees it — and no other remedy (decision 4; task t121 in main has run with no agent
id since 2026-10-01).

Slice 12 also keeps the build slot held by a build orphaned on age alone until task-reconcile releases it
or it reaches the presumed-dead age (slice 12, decisions 4 and 9). That holder is not running, and the
owner's cancel cannot act on it (an `orphaned` task cannot become `cancelled`), so its refusal names it as
orphaned on age alone and names what actually frees the slot — the live-list release, or the
presumed-dead age, which the scheduler itself applies — instead of a command that would fail.

## Technical approach

### The rule

When the refused candidate is a main-checkout build (`kind === 'implement'`, claimed without
`--worktree`) and the scheduler refused it (a `canRun` decision) while another main-checkout build is
running or cancelling — or, with none, while a main-checkout build orphaned on age alone still holds
the build slot (slice 12's orphan clause) — the refusal names that build, whatever rule fired first. A
build recorded with its own worktree is never named as the holder (`taskRegistry.isWorktreeBuild`,
slice 12), and a build being claimed with `--worktree` keeps slice 2's sentence on any refusal: it is
not waiting for the main checkout's slot. `claimBuild`'s, `claimBuildLocked`'s and `taskTransition`'s `reason` keeps the first rule's code (`one-build`,
`file-conflict`, `blocked-dep`, …), so every test that asserts a code stays green (`tests/scheduler-
enforced.test.js` E-FILE, line 93). When that code is not `one-build`, the sentence ends with ` (the
scheduler's first refusal: <code>)` before its final period. The non-scheduler refusals of slice 2
(`claimBuild`'s `build-start-busy`; `claimBuildLocked`'s `already-started`, `not-queued`,
`plan-not-found`, `plan-move-failed`) keep slice 2's sentences, and so do slice 12's `worktree-unusable`
and `worktree-not-at-claim`. A build refused by the scheduler with no other main-checkout build running, cancelling or
holding the slot as an age-only orphan (for example `file-conflict` against a running `quality` task,
or against a running worktree build) keeps today's sentence.

### `src/lib/actions.js`

1. **`oneBuildRefusal(registry, candidateId, code)`** — next to `claimBuild`, exported next to it, with a
   JSDoc block (its callers are `claimBuild`, `claimBuildLocked` and `startAgent` in this file, and
   `menu-screens.taskTransition`). The holder is the first task in `registry.tasks`, `id !== candidateId`,
   that is either (a) a main-checkout build occupying a slot — `kind === 'implement'`, status `running`
   or `cancelling`, and `!taskRegistry.isWorktreeBuild(task)` — or, when there is none, (b) a build
   orphaned on age alone that still holds the main checkout's build slot —
   `taskRegistry.isUnreleasedStaleOrphanBuild(task)`, the predicate slice 12 exports and the scheduler
   itself applies (it already excludes worktree builds). The plan and the holder id are written as `JSON.stringify(clean(value))`, where `clean`
   strips `/[\p{Cc}\p{Cf}]/gu` (control and format characters, the bidirectional controls included).
   **The recorded agent id** (`agentTaskId`) is read in this order: `null`, `undefined` or `''` → no agent;
   equal to the holder's own id → the placeholder; a string matching `AGENT_ID_FORM =
   /^[A-Za-z0-9._:-]{1,128}$/` → shown, JSON-quoted; anything else (control or format characters, a
   newline, a space, a quote, more than 128 characters, a non-string) → never shown, and the sentence says
   `an agent id of unexpected form is recorded`. Returns:
   - a running or cancelling holder: `{ holder: { taskId, plan, agent, orphaned: false }, sentence }`, one
     sentence (as in the earlier version of this plan, plus the unexpected-form variant, and since
     2026-10-18 naming the main checkout):
     - agent shown: `another build is running in the main checkout: task "<holder id>" for plan
       "<plan>", with agent "<agent>" recorded; this command cannot confirm that agent is alive, and
       only the owner's "menu task cancel <holder id> --force" frees the build slot.`
     - agent of unexpected form: `…for plan "<plan>", and an agent id of unexpected form is recorded; this
       command cannot confirm that agent is alive, …` (same ending).
     - agent equal to the holder's own id: `…, with its own id recorded as a placeholder (claimed, no agent
       stamped yet); this command cannot confirm that any agent is alive, …` (same ending).
     - no agent: `…, with no agent recorded; this command cannot confirm that any agent is alive, and only
       the owner's "menu task cancel <holder id> --force" frees the build slot.`
     - a cancelling holder: "another build is being cancelled in the main checkout" in place of
       "another build is running in the main checkout".
     - the holder id goes into the cancel command only when it matches `/^t\d+$/` (`computePromote`'s rule,
       `src/lib/menu-screens.js` line 2475); otherwise the ending is `…, and only the owner frees the build
       slot: cancel that task with menu task cancel and --force.`
   - an age-only-orphaned holder: `{ holder: { taskId, plan, agent, orphaned: true }, sentence }`. It names
     NO command: `menu task cancel` cannot act on it — `cancelTask`'s `--force` branch covers only
     `running` and `cancelling` (`src/lib/actions.js` line 2351), and for an `orphaned` task the
     transition `orphaned → cancelled` is refused (`src/lib/actions.js` lines 2376-2384,
     `VALID_TRANSITIONS` in `src/lib/task-registry.js` line 191). It names what actually releases it:
     confirmed gone — the reconcile pass (`src/lib/task-reconcile.js` lines 406-449) sees a list of live
     agents without the recorded id (lines 429-430) — or presumed dead — twice the build staleness floor
     past its start. **The "at the latest" half is true on every route because of slice 12's predicate,
     not the reconcile pass**: `taskRegistry.isUnreleasedStaleOrphanBuild` stops reporting the orphan as
     a holder once `now − ts.started` reaches `DEFAULT_STALE_MS_BY_KIND.implement ×
     DEFAULT_PRESUMED_DEAD_MULTIPLE` (slice 12, item 1a and decision 9), and `canRun` and `nextRunnable`
     apply that same predicate — so the slot frees at that age even on a `menu task …` command, where no
     reconcile pass runs (it runs only on the dashboard render, `src/lib/menu-screens.js` line 575).
     `oneBuildRefusal` calls the predicate as `taskRegistry.isUnreleasedStaleOrphanBuild(task)` — one
     argument, the real clock, the clock `canRun` uses when no clock is passed — never as an array
     callback (`some`/`find` would pass the index as the clock; slice 12, decision 9). `<N>` is computed,
     never written as a literal, from the same two constants the predicate reads:
     `taskReconcile.DEFAULT_STALE_MS_BY_KIND.implement * taskReconcile.DEFAULT_PRESUMED_DEAD_MULTIPLE /
     60000` (240 today; both exported, `src/lib/task-reconcile.js` lines 804 and 807; no caller in `src/`
     overrides them — search `staleThresholdMsByKind|presumedDeadMultiple` over `src/`: 1 file,
     task-reconcile.js itself), through `require('./task-reconcile')` at the top of `actions.js` (no
     cycle: task-reconcile requires only `path`, `safe-fs`, `task-registry` and `plan-coverage`, lines
     82-87). One sentence:
     - an agent recorded (shown, placeholder or unexpected form): `another build holds the main
       checkout's build slot: task "<holder id>" for plan "<plan>", orphaned on age alone — its agent may still be working; <agent
       part>, and this command cannot confirm whether that agent is alive; the build slot frees when the
       dashboard screen's cleanup pass, given the list of live agents, finds its agent gone, or at the
       latest once the build
       is <N> minutes past its start.` — where `<agent part>` is `agent "<agent>" is recorded`, `its own id
       is recorded as a placeholder`, or `an agent id of unexpected form is recorded`.
     - no agent: `another build holds the main checkout's build slot: task "<holder id>" for plan "<plan>", orphaned on age
       alone — its agent may still be working; no agent is recorded, so no list of live agents can confirm
       it gone, and the build slot frees at the latest once the build is <N> minutes past its start.`
   - for every holder, a holder with `plan: null`: `task "<holder id>" (no plan)` in place of `task
     "<holder id>" for plan "<plan>"`; and `code !== 'one-build'`: the final period is replaced by ` (the
     scheduler's first refusal: <code>).`
   - no holder and `code === 'one-build'` (the holder finished or was released between the refusal and
     the reload): `{ holder: null, sentence: 'the build that held the build slot has just released it;
     run the start again.' }` ("released", not "finished": a released orphan did not finish).
   - no holder and any other code: `null` — the caller keeps its existing text.
   Callers call it only for an `implement` candidate claimed without its own worktree: `claimBuild` and
   `claimBuildLocked` only when `opts.worktree` is null, `taskTransition` only when its `worktree` is
   null (slice 12, item 1d); `startAgent` always (it records no worktree).
2. **`claimBuild` and `claimBuildLocked`** (slice 2), when the candidate is a build claimed without its
   own worktree (`opts.worktree` null) and a scheduler check refuses without `force`; each phrases only
   its own checks:
   - `claimBuild` phrases only its read-only check outside the lock: `taskRegistry.load(root)` once and
     `r = oneBuildRefusal(loaded, id, reason)`. `r` not null → text `Task <id> NOT started — ` +
     `r.sentence`, `reason` the scheduler's code, and the result adds `holder: r.holder` (null when the
     holder had just finished). `r` null → slice 2's sentence. Inside the lock it returns
     `claimBuildLocked`'s result as it is.
   - `claimBuildLocked` phrases its own two scheduler refusals (the re-check inside the lock, the check in
     the registry write): after any move back, `taskRegistry.load(root)` once and `r =
     oneBuildRefusal(loaded, id, reason)`. `r` not null → text `Task <id> NOT started — ` + `r.sentence`,
     `reason` the scheduler's code, and the result adds `holder: r.holder` and `holderSentence:
     r.sentence`. `r` null → slice 2's sentence, no `holder` or `holderSentence`.
   The forced start (`--force`) is unchanged: it starts, logs `forced_start` with the scheduler's code, and
   says FORCED.
3. **`startAgent`**: a plan held back by the scheduler while another main-checkout build runs is recorded in
   `queuedTasks` as `{ plan, taskId, reason: <sentence>, holder }`. For an existing queued task it uses the
   `holder` and `holderSentence` that `claimBuildLocked` returned, with no load of its own; it phrases only
   `addAndClaim`'s refusal (a new task), getting `r` the same way (the registry loaded right after the
   refusal) and recording `reason: r.sentence, holder: r.holder`. **The walk stops at the first refusal whose code is `one-build`**:
   that rule depends only on the occupying set, so every later plan would be refused the same way, and
   walking on would add a queued task per remaining plan. The result is `{ started: false, queued: true,
   reason: <that plan's sentence>, holder, cleanedUp, skipped, queuedTasks }` — that plan's entry is the
   last of `queuedTasks`, and `skipped[]` from the plans walked before it is still reported. A refusal
   with no build running (`r` null, or no `holderSentence` from `claimBuildLocked`) keeps its code as `reason` and the walk continues, as today. The
   result's `reason` is shown by `src/areas/agent.js` line 122 as "Queued: <reason>" and by the menu's
   Start agent recipe as the plan's reason.
4. **The `startAgent` comment** (lines 2100-2128) is rewritten: one build at a time in the main checkout
   (Rule 5, the owner's decisions of 2026-10-11 and 2026-10-17) — Start agent claims only in the main
   checkout, a plan whose build cannot start yet keeps its single queued task, the walk stops at the
   first plan the one-build rule holds back, and the result names the main-checkout build that holds the
   slot; a build in its own worktree is claimed by the session with `menu task start <id> --worktree
   <path>` (Operating Lesson 21), never here; `force: true` only clears a requested stop and never
   overrides the scheduler. The sentences
   "file-based serialization … ≤5 concurrent), so MULTIPLE plans may run concurrently when their declared
   files are DISJOINT — that is the point of the file-based model" are removed.

### Where the refusal sentence is built

claimBuildLocked phrases its own two scheduler refusals and returns holder and holderSentence; claimBuild
phrases the read-only check; startAgent uses holderSentence from claimBuildLocked and phrases only
addAndClaim's refusal.

### `src/lib/menu-screens.js`

4b. The claim mapper (menuClaimResult, slice 2) keeps holder on a refused claim: { ok:false, refused:true,
   taskId, reason, text, holder }, with holder present exactly when claimBuild set it or returned claimBuildLocked's result carrying it
   (null included).

5. **A build with no plan** (`menu task add implement --touches x`, `buildAddSpec` line 2367 sets `plan:
   null`) stays on today's start path in `taskTransition` (slice 2 routes only a build that names a plan
   through `claimBuild`). Its refusal (lines 2638-2648) applies the rule: when the task is `implement`
   and `worktree` is null (slice 12, item 1d),
   `r = require('./actions').oneBuildRefusal(reg, id, decision.reason)` on the snapshot that refused (the
   lazy require pattern of lines 2549 and 2695); `r` not null → text `Task <id> NOT started — ` +
   `r.sentence`, `holder: r.holder` added, `reason` unchanged; `r` null → today's sentence.

### `tests/actions-scheduler.test.js`

- Slice 12's case "two file-DISJOINT todo plans: the second waits while the first builds" asserts
  `r2.reason` contains `task "t1" for plan "disj-a"` and `menu task cancel t1 --force` (replacing `===
  'one-build'`), and `r2.queuedTasks[0].holder.taskId === 't1'`.
- Line 235, "two file-OVERLAPPING todo plans": `assert.equal(r2.reason, 'file-conflict', …)` becomes two
  assertions that `r2.reason` contains `task "t1" for plan "ov-a"` and `file-conflict` — a tightening: the
  reason still names the rule and now also names the holder.

### `tests/greenfield-journey.test.js`

- Control D, lines 454-455, assert `second.reason === 'file-conflict'` and turn red after this slice
  (Start agent's reason is now the holder sentence). The exact replacement, a tightening — the reason
  still names the rule and now also names the holder:
  ```js
  assert.match(second.reason, /file-conflict/,
    `the scheduler ladder serializes same-file plans; reason was: ${second.reason}`);
  assert.ok(second.reason.includes(`for plan "${firstName}"`),
    `the refusal names the build that holds the slot; reason was: ${second.reason}`);
  ```

## Implementation Details

### Dependency Graph

```
actions.claimBuild (read-only check), actions.claimBuildLocked (re-check, registry write) → oneBuildRefusal → registry value (task-registry.load, after the refusal)
actions.claimBuild → actions.claimBuildLocked                            (holder, holderSentence returned as they are)
actions.startAgent (existing queued task) → actions.claimBuildLocked     (holder, holderSentence; no load of its own)
actions.startAgent (addAndClaim refusal) → oneBuildRefusal → registry value (task-registry.load, after the refusal)
menu-screens.taskTransition (build with no plan) --lazy require--> actions.oneBuildRefusal (on the refusing snapshot)
menu-screens.taskTransition (build with a plan) → actions.claimBuild    (refusal text reaches the menu answer)
src/areas/agent.js `g` key → actions.startAgent                          ("Queued: <reason>")
tests/one-build-at-a-time.test.js → route, actions.startAgent, src/commands/start.js
actions.oneBuildRefusal → task-registry.isWorktreeBuild (slice 12's export; a worktree build is never the holder)
actions.oneBuildRefusal → task-registry.isUnreleasedStaleOrphanBuild (slice 12's export; the orphaned holder)
actions.oneBuildRefusal → task-reconcile.DEFAULT_STALE_MS_BY_KIND, DEFAULT_PRESUMED_DEAD_MULTIPLE (the minutes)
```

No cycle: menu-screens already requires actions lazily, and task-reconcile does not require actions
(its requires, `src/lib/task-reconcile.js` lines 82-87: `path`, `safe-fs`, `task-registry`,
`plan-coverage`).

### File Specifications

- `src/lib/actions.js` — MODIFY: `require('./task-reconcile')`; `oneBuildRefusal` (running, cancelling
  and age-only-orphaned holders; the agent-id form check) and its export, its use in `claimBuild` (the
  read-only check), in `claimBuildLocked` (its two scheduler refusals, returning `holder` and
  `holderSentence`) and in `startAgent` (`addAndClaim`'s refusal only), `startAgent`'s use of
  `claimBuildLocked`'s `holder` and `holderSentence`, the walk's stop, the `startAgent` comment.
- `src/lib/menu-screens.js` — MODIFY: `taskTransition`'s refusal for a build with no plan; the claim
  mapper's `holder`.
- `tests/actions-scheduler.test.js` — MODIFY: the two reason assertions.
- `tests/one-build-at-a-time.test.js` — CREATE.
- `tests/greenfield-journey.test.js` — MODIFY: control D's reason assertion.

### Test Plan — `tests/one-build-at-a-time.test.js` (written first)

Fixture: a temporary project with gated plans in `todo/` (the writer from
`tests/scheduler-enforced.test.js` lines 59-76), builds added with `menu task add implement <plan>
--touches <file>`; `regBytes()` as in slice 2; where Start agent's plan order matters,
`.ctoc/state/todo-order.json` is written as slice 2 case 6 does.

1. **a second build cannot start while one runs or is cancelling**: t1 for delta running with agent X
   (claimed, stamped X); t2 for echo (disjoint files) queued → `menu task start t2` refused, `reason ===
   'one-build'`, text names `"t1"`, `"delta"`, `"X"` and contains `running in the main checkout`; t2
   queued, echo in `todo/`, `regBytes()` unchanged. The same with t1 `cancelling` (`menu task cancel t1`)
   — the sentence says "being cancelled in the main checkout".
   1b. **an overlapping second build names the holder too**: t1 running on `src/shared.js`, t2 queued on
   `src/shared.js` → refused, `reason === 'file-conflict'`, text names `"t1"` and `menu task cancel t1
   --force` and ends with `(the scheduler's first refusal: file-conflict).`
   1c. **a build with no plan names the holder too**: t1 running for delta; `menu task add implement
   --touches src/other.js` (t2, `plan: null`) → `menu task start t2` refused `one-build`, text names
   `"t1"`, `"delta"` and `menu task cancel t1 --force`, and does not contain "Wait for the blocker".
   1d. **a holder with no plan**: t1 a running build with `plan: null`; t2 queued for echo → the text
   contains `task "t1" (no plan)`.
   1e. **the holder finished between the refusal and the reload**: t1 running for delta, t2 queued for
   echo. (i) `menu task start t2`: mock `taskRegistry.canRun` (the seam of slice 2 case 10c) so that its
   first call computes the real decision (`one-build`), then ends t1 through `menu task fail t1`, then
   returns that decision → `ok: false`, `reason === 'one-build'`, text `Task t2 NOT started — the build
   that held the build slot has just released it; run the start again.`, `holder === null`, echo in
   `todo/`. (ii) Start agent on an existing queued task: the same seam, `startAgent(root)` → `reason` is
   that sentence. (iii) Start agent's fresh claim (echo with no task): mock `taskRegistry.addAndClaim` so
   that its first call runs the real function, then ends t1, then returns → the same sentence.
   (`addAndClaim` calls its module's own `withRegistry` and `canRun`, which an export mock does not
   reach; slice 2 case 11's `taskRegistry.withRegistry` seam acts at the registry write, after the
   read-only check has already refused, so it cannot open this window.)
2. **a refusal names a build that has no agent**: `todo-order.json` `["delta.md","echo.md","foxtrot.md"]`;
   `startAgent(root)` claims delta as t1 (`agentTaskId` null); `menu task add implement echo --touches
   src/echo.js` (t2 for echo, queued); foxtrot in `todo/` with no task → `menu task start t2` and
   `startAgent(root)` each name `"t1"`, `"delta"` and "no agent recorded"; Start agent's result's last
   `queuedTasks` entry is echo with `taskId === 't2'`; foxtrot still has no task; t1 unchanged; then
   `menu task cancel t1 --force` frees the slot and `menu task start t2` succeeds.
3. **a refusal says it cannot confirm the holder is alive, and what frees the slot**: three holders for
   t1, each with t2 queued and `menu task start t2`:
   - agent X → the text contains `with agent "X" recorded`;
   - placeholder (claimed by `menu task start t1`, agent `t1`) → contains `with its own id recorded as a
     placeholder`;
   - no agent (claimed by `startAgent`) → contains `with no agent recorded`.
   Every refusal matches `/cannot confirm/` and contains `menu task cancel t1 --force`, and matches none
   of `/menu task start[^.]*--force/`, `/\bwait\b/i`, `/override/i`; t1 unchanged.
4. **two starts of two builds at once leave one build running** — each pair is held apart by slice 2's
   build-start lock, not by the registry write: the second start runs while the first holds the lock and
   before the first has written the registry. `todo-order.json` `["delta.md","echo.md"]`, no build
   running.
   (a) two menu starts: t1 queued for delta, t2 queued for echo; mock `safeFs.renameSync` so that the
   first rename whose source is `plans/todo/delta.md` first runs `menu task start t2` to completion →
   that start answers `ok: false`, `reason 'build-start-busy'`; the first answers ok.
   (b) Start agent's fresh claim, then the menu: delta with no task, t2 queued for echo; mock
   `taskRegistry.addAndClaim` so that its first call first runs `menu task start t2` to completion, then
   calls the real function → `menu task start t2` answers `reason 'build-start-busy'`; Start agent
   claims delta.
   (c) the menu, then Start agent: t1 queued for delta, t2 queued for echo; the rename seam of (a) runs
   `actions.startAgent(root)` → it answers `started: false` with slice 2's busy error; the menu start of
   t1 answers ok.
   In each: exactly one build running, its plan in `in-progress/`; the other build's task queued, its
   plan in `todo/`; no plan in `in-progress/` whose task is queued; the lock file is gone; running the
   refused start again is refused naming the running build.
5. **a completion offers the next build, and only one**: `todo-order.json`
   `["delta.md","echo.md","foxtrot.md"]`; t1 running for delta, t2 queued for echo, t3 queued for
   foxtrot. A `review` task completes with `--continue` → `promote` has no build. t1 completes with
   `--continue` (delta in `in-progress/` with all steps checked) → `promote` lists exactly one build, t2,
   still queued and unclaimed (echo still in `todo/`, as slice 3 leaves it for the session to claim with
   `menu task start t2`), and t3 is still queued with foxtrot in `todo/`.
6. **other task kinds keep the `MAX_CONCURRENT` ladder** (through the menu): `taskRegistry.MAX_CONCURRENT`
   running non-build tasks (20 since the owner's order of 2026-10-15; read from the export, never a
   literal) → one more start refused `max-concurrent`; two `quality` tasks on one file → `file-conflict`;
   two on disjoint files → both start; one build plus four disjoint non-build tasks → all running.
7. **the owner's override still starts it, and it is logged**: t1 running, `menu task start t2 --force`
   → running, echo in `in-progress/`, text has "FORCED", warn log has `forced_start` with reason
   `one-build`.
8. **Start agent, forced as the menu calls it, leaves a second build queued**: t1 running, echo in
   `todo/` with no task, `taskRegistry.requestDrainStop(root)` → `startAgent(root, { force: true })` →
   the stop is cleared; `started: false`, `queued: true`, `reason` names `"t1"`; echo's task `queued`;
   echo in `todo/`.
9. **(withdrawn 2026-10-18, not written) a background agent cannot force a build start**: re-read on
   2026-10-18, the write protection no longer refuses it. The owner ordered on 2026-10-15 "remove that
   hook block, it is wrong": `src/hooks/protect-records.js` lines 597-602 (`RECORD_REFUSALS_OFF`), and
   `tests/protect-records.test.js` test 83 (line 467) now asserts that `menu task start t7 --force` and
   `menu task cancel t7 --force` from a background agent are ALLOWED. A case asserting a refusal would
   fail against the owner's own order on today's code. By the CTO Chief's ruling of 2026-10-18
   (decision 16) slice 21's decision-route refusal refuses a background agent's forced build start, and
   its tests carry the case (decision 14). The number is kept so the other cases keep theirs.
10. **the reproduction runs through the real menu command**: child processes in a temporary project:
    add and start t1 for delta, stamp `agent-xyz`, add t2 for echo, `menu task start t2` → `ok: false`,
    the text names `"t1"`, `"delta"`, `"agent-xyz"` and `menu task cancel t1 --force`; echo in `todo/`.
11. **Start agent stops at the first plan the one-build rule holds back**: t1 a running build; plans
    golf and hotel in `todo/` (`todo-order.json` `["golf.md","hotel.md"]`), neither with a task →
    `startAgent(root)` → `started: false`, `queued: true`, `reason` names `"t1"`; exactly one queued
    implement task was added (golf's); hotel has no task; `queuedTasks` has one entry, golf.
12. **a hostile holder**: t1's plan holds a quote, a newline, an ANSI escape and U+202E, and its agent id
    holds the same four; t1's id is rewritten to `x1` in a second registry → the text holds none of those
    characters unescaped, the plan value is a valid JSON string, the agent id is not shown and the text
    contains `an agent id of unexpected form is recorded`, and with `x1` the text says `cancel that task
    with menu task cancel and --force` and does not contain `menu task cancel x1`.
12b. **the agent id is shown only in its expected form**: `actions.oneBuildRefusal(registry, 't2',
    'one-build')` on in-memory registries whose running holder t1 (plan delta) carries, in turn, the agent
    ids `'a\u0007b'` (a control character), `'a‮b'` (a format character), `'line1\nline2'` (a
    newline), `'q'.repeat(129)` (over-long), `'a b'` (a space), `'a"b'` (a quote) and `42` (not a string)
    → each sentence contains `an agent id of unexpected form is recorded` and does not contain the value
    (for the over-long one, not `qqqq`); `'A'.repeat(128)` and `'agent-xyz:1.2_3'` → shown as `with agent
    "<value>" recorded`; `''` → `with no agent recorded`. Through the route once: t1 stamped
    `'line1\nline2'`, `menu task start t2` → the text contains `an agent id of unexpected form is
    recorded` and no newline.
13. **an age-only-orphaned holder names what frees the slot, and no command**: t1 an `implement` task for
    delta on `src/delta.js`, `status: 'orphaned'`, `result: { ok: false, orphanReason: 'staleness',
    summary: 'orphaned on staleness alone' }`, started 130 minutes ago (inside the presumed-dead bound);
    t2 queued for echo on `src/echo.js`; `N = DEFAULT_STALE_MS_BY_KIND.implement *
    DEFAULT_PRESUMED_DEAD_MULTIPLE / 60000` from `src/lib/task-reconcile.js`.
    (a) t1 with agent `agent-xyz`: `menu task start t2` → `ok: false`, `reason === 'one-build'`, `holder`
    `{ taskId: 't1', orphaned: true, … }`; the text contains `task "t1" for plan "delta", orphaned on age
    alone — its agent may still be working`, `agent "agent-xyz" is recorded`, `the dashboard screen's
    cleanup pass, given the list of live agents, finds its agent gone` and `${N} minutes past its start`; it does not contain
    `menu task cancel` and matches none of `/\bwait\b/i`, `/override/i`; echo in `todo/`; t1 unchanged.
    (b) t1 with no agent: the text contains `no agent is recorded, so no list of live agents can confirm
    it gone` and `${N} minutes past its start`, and not `finds its agent gone`.
    (c) why no command is named: `menu task cancel t1 --force` answers `ok: false` (the refused
    `orphaned → cancelled` transition) and t1 is unchanged.
    (d) Start agent: echo with no task → `startAgent(root)` → `started: false`, `queued: true`, `reason`
    contains `orphaned on age alone`.
    (e) released by age, the marker untouched: t1 as in (a) but started `N` minutes plus one minute ago
    (`new Date(Date.now() - (N + 1) * 60000).toISOString()`), its marker still `orphanReason:
    'staleness'`, and no dashboard render or reconcile pass run in the case → `menu task start t2` → ok,
    t2 running, echo in `in-progress/`; t1's `result.orphanReason` is still `'staleness'` afterwards (the
    scheduler releases the slot without rewriting the marker). This is the case that makes the sentence's
    "at the latest once the build is <N> minutes past its start" true on a route with no reconcile pass.
    (e2) released by the marker: t1 started 130 minutes ago as in (a), its marker rewritten to
    `orphanReason: 'presumed-dead'` → `menu task start t2` → ok, t2 running, echo in `in-progress/`.
14. **the refusal names only the main-checkout build; a worktree build is neither holder nor refused
    for the slot** (the owner's revision of 2026-10-17): plans delta, echo, foxtrot and golf in `todo/`
    on disjoint files; `.claude/worktrees/w1/` and `.claude/worktrees/w4/` made.
    (a) t1 for delta claimed with `menu task start t1 --worktree .claude/worktrees/w1` (running, its
    worktree recorded); t2 for echo queued → `menu task start t2` → ok (the main checkout's build runs
    alongside the worktree build).
    (b) t3 for foxtrot queued → `menu task start t3` → `ok: false`, `reason === 'one-build'`, `holder.taskId
    === 't2'`; the text names `"t2"` and `"echo"`, contains `running in the main checkout` and `menu task
    cancel t2 --force`, and does not contain `"t1"` or `"delta"`.
    (c) t4 for golf on `src/delta.js`'s file (overlapping t1, the worktree build) claimed with
    `menu task start t4 --worktree .claude/worktrees/w4` → `ok: false`, `reason === 'file-conflict'`,
    no `holder` key, and the text is slice 2's sentence (contains `the scheduler refuses it
    (file-conflict)`) — a worktree claim waits on files, never on the main checkout's slot.
    (d) in memory: `actions.oneBuildRefusal(registry, 't2', code)` on a registry whose only running build
    is t1 with `worktree: '.claude/worktrees/w1'` → for `'one-build'`, `{ holder: null, sentence: 'the
    build that held the build slot has just released it; run the start again.' }`; for
    `'file-conflict'`, `null`.

Cases 1, 1b-1e, 2, 3, 8, 10, 11, 12, 12b, 13 (a, b, d) and 14 (b, d) fail on today's code; 5-7 and 13 (c, e, e2)
pin behaviour (13 (e) pins slice 12's age release, ONE-BUILD-5d, through the route; 14 (a, c) pin
slice 12's worktree exemption and its file rule); case 4 pins the lock and fails only on its re-run clause; the pinned behaviour is what slices
2 and 12 built (recorded in the build record).

### Security Review

- [x] The holder id and plan in the sentence have control and format characters stripped
  (`/[\p{Cc}\p{Cf}]/gu`, the bidirectional controls included) and are JSON-quoted.
- [x] The recorded agent id is shown only when it matches `/^[A-Za-z0-9._:-]{1,128}$/`; any other value
  is never echoed — the sentence says an agent id of unexpected form is recorded (cases 12, 12b).
- [x] The holder id enters the `menu task cancel <id> --force` command text only when it matches
  `/^t\d+$/`, so a crafted id cannot shape the command the owner is told to run (case 12).
- [x] No new remedy: the only action named is the owner's existing `menu task cancel <id> --force`.
  Since the owner's order of 2026-10-15 the write protection no longer keeps a background agent from
  running it (`src/hooks/protect-records.js` lines 597-602, re-read on 2026-10-18); slice 21's
  decision-route refusal does not rule on the cancel, so slice 14's session text is what keeps it to his
  word. The forced START is different (the CTO Chief's ruling of 2026-10-18, decision 16): a background
  agent passing `--force` to a build start is refused by slice 21's decision-route refusal, because only
  the owner forces a build start; until slice 21 ships, only the session's instructions stop it. Case 9
  stays out of this slice: slice 21 carries that refusal and its tests. An age-only-orphaned
  holder names no command at all — the cancel would fail on it (case 13 (c)) — only the live-list release
  and the presumed-dead age.
- [x] No new rule frees the slot in this slice: a running or cancelling holder is freed only by the
  owner's cancel (decision 4); an age-only-orphaned holder only by task-reconcile's release or slice 12's
  presumed-dead age (slice 12, decision 9); t1 is unchanged by every refusal.

### Wiring — the live call sites

`oneBuildRefusal` is called by `claimBuild` for its read-only check (route `menu task start` of a build
with a plan, from `src/commands/start.js`), by `claimBuildLocked` for its two scheduler refusals (reached
from that same route through `claimBuild`, and from `startAgent` for an existing queued task, which uses
the `holder` and `holderSentence` it returns), by `startAgent` for `addAndClaim`'s refusal only (the
menu's Start agent recipe and `src/areas/agent.js` line 108), and by `menu-screens.taskTransition` (route
`menu task start` of a build with no plan).

## Acceptance Criteria

- [ ] Eight of the nine parent scenarios named at the top pass as cases 1-8 (with 1b-1e); the ninth, "a
  background agent cannot force a build start", is met by slice 21's decision-route refusal and its
  tests, not by this slice (the CTO Chief's ruling of 2026-10-18, decisions 14 and 16; until slice 21
  ships, only the session's instructions stop it, which the build record reports); case 10 reproduces
  the refusal through the real menu command; cases 11, 12, 12b, 13 and 14 pass.
- [ ] `tests/scheduler-enforced.test.js` E-FILE (line 93) and E-FORCE pass unchanged: the menu's `reason`
  stays the scheduler's code.
- [ ] `npm test` passes; the test-file counts in CLAUDE.md and README.md are updated through the release
  script's two count functions.

## Decisions Taken Under Ambiguity

1. **The build refusal reaches Start agent's caller as its `reason` sentence**, while refusals with no
   build running stay codes: the parent asks that this result "names t1", and both readers of the field
   (`src/areas/agent.js` line 122, the Start agent recipe) show it to the owner as text.
2. **The refusal is one sentence**, with the holder's values quoted, so the session can show it as it
   comes (the parent asks for "one sentence in plain words").
3. **The holder is computed in `actions.js`, not exported from the scheduler**: one small read of the
   registry value, shared by the four places that phrase build refusals (`claimBuild`'s read-only check,
   `claimBuildLocked`'s two scheduler refusals, `startAgent`'s `addAndClaim` refusal, `taskTransition`
   for a build with no plan); a scheduler export would add a second public surface for
   phrasing, which is not the scheduler's job. Whether an orphaned build holds the slot is not phrasing:
   it is asked of the scheduler's own exported predicate (`isUnreleasedStaleOrphanBuild`, slice 12), so
   the refusal and the rule cannot disagree.
4. **The holder id is JSON-quoted in "task "t1"" like every other registry value**; the cancel command
   carries it unquoted only when it has the canonical `t<n>` shape.
5. **The sentence is phrased from the registry loaded right after the refusal** (after any move back),
   by the function whose check refused: `claimBuild` for its read-only check, `claimBuildLocked` for its
   re-check inside the lock and its registry-write check (returning `holder` and `holderSentence`, which
   `claimBuild` passes on as they are and `startAgent` uses with no load of its own), and `startAgent`
   only for `addAndClaim`'s refusal, which returns no snapshot; the holder may have finished in between,
   which case 1e covers. `taskTransition` phrases from
   the snapshot that refused, where the holder cannot have gone.
6. **The suffix sits before the final period**: `… frees the build slot (the scheduler's first refusal:
   file-conflict).`, so the refusal stays one sentence.
7. **(The CTO Chief's decision, 2026-10-11, the gate critic's recommended option.) The agent id shown in
   a refusal**: the recorded agent id is shown only when it matches `/^[A-Za-z0-9._:-]{1,128}$/`;
   otherwise the refusal says "an agent id of unexpected form is recorded". Stripping control characters
   alone would still echo an attacker-shaped or unbounded value to the owner; an id the harness or the
   menu writes fits the form.
8. **(The CTO Chief's decision, 2026-10-11, the gate critic's recommended option.) The age-only-orphaned
   holder** of slice 12's orphan clause is named as `task "<id>" for plan "<plan>", orphaned on age alone
   — its agent may still be working`, and the refusal names what truly frees the slot — the reconcile
   pass, when the dashboard screen's cleanup pass, given the list of live agents, finds its agent gone
   (`src/lib/task-reconcile.js` lines 406-449; run only from the dashboard render, `src/lib/menu-screens.js`
   line 575), or at the latest once the build is twice the build
   staleness floor past its start (slice 12's predicate, decision 12) — never `menu task cancel`, which
   cannot cancel an
   orphaned task (`src/lib/actions.js` lines 2351 and 2376-2384). The running and cancelling holder texts
   are unchanged.
9. **The sentence does not say "only" for the orphaned holder.** Two further transitions also end an
   orphaned task and so free the slot: the agent's own late `menu task complete` (`orphaned → done`) and
   `menu task fail <id>` (`orphaned → failed`; `VALID_TRANSITIONS`, `src/lib/task-registry.js` line 191,
   allowed by `menu-screens.taskTransition`, line 2631). Neither is named: decision 4 names no remedy
   beyond the cancel, and recording as failed a build whose agent may still be editing is the owner's
   call, not a refusal's suggestion.
10. **"has just released it", not "has just finished"**, for a holder gone between the refusal and the
    reload: a released orphan did not finish.
11. **The `<N>` minutes are computed from task-reconcile's exported constants**, so the sentence cannot
    drift from the bound the reconcile pass applies.
12. **(The CTO Chief's decision, 2026-10-11.) "At the latest once the build is <N> minutes past its
    start" stays, and is true because of slice 12's predicate.** The reconcile pass alone could not make it
    true: it runs only on the dashboard render (`src/lib/menu-screens.js` line 575), never on `menu task
    start`. `taskRegistry.isUnreleasedStaleOrphanBuild` releases an age-only orphan at that age itself,
    reading the same two constants `<N>` is computed from, and `canRun`, `nextRunnable` and
    `oneBuildRefusal` all ask it — so the refusal, the scheduler and the release cannot disagree on any
    route. Case 13 (e) proves it through the menu command with the marker still `staleness`; 13 (e2) keeps
    the marker release.
13. **(2026-10-18, the owner's revision of 2026-10-17.) The refusal names the main checkout's build, in
    words.** The holder is a main-checkout build (`!taskRegistry.isWorktreeBuild`, the scheduler's own
    predicate, so the refusal and Rule 5 cannot disagree), and the sentence says "running in the main
    checkout" / "being cancelled in the main checkout" / "holds the main checkout's build slot", so the
    owner sees that a worktree build would not be held. The sentence does not suggest a worktree as a way
    round: the parent names the owner's cancel as the only remedy, and the worktree route is the
    session's instruction (slice 14), not a refusal's suggestion. A build being claimed with its own
    worktree gets no holder sentence on any refusal, because it never waits for the main checkout's slot
    (case 14 (c)).
14. **(2026-10-18.) Case 9 is withdrawn, not rewritten.** The owner turned the background-agent refusal
    off on 2026-10-15 ("remove that hook block, it is wrong", `src/hooks/protect-records.js` lines
    597-602), and `tests/protect-records.test.js` test 83 now asserts the opposite of case 9. Asserting a
    refusal would fail; asserting that a background agent may force would write a test for a hole. The
    parent's scenario "a background agent cannot force a build start" is therefore met not by this plan
    but by slice 21 (decision 16), and the Security Review says so.
15. **(2026-10-18.) Facts that moved since 2026-10-11 are corrected where this plan states them**:
    case 6 reads the slot count from `taskRegistry.MAX_CONCURRENT` (20 since the owner's order of
    2026-10-15), and line numbers were re-read on today's main checkout (release 6.14.130) and the moved
    ones corrected.
16. **(2026-10-18, the CTO Chief's ruling R1.) A background agent passing `--force` to a build start is
    refused by the decision-route refusal (slice 21)**, because only the owner forces a build start.
    Until slice 21 ships, only the session's instructions stop it. `--worktree` needs no refusal: slice
    12's existence check and the file-overlap rule hold. This slice adds no refusal of its own and names
    no worktree as a remedy (decision 13).

## Execution Plan

### Step 8: TEST
- [ ] Write `tests/one-build-at-a-time.test.js` (cases 1-14, with 1b-1e and 12b; case 9 withdrawn) and the two actions-scheduler assertions; run both and record which cases fail on today's code (1, 1b-1e, 2, 3, 4 (its re-run clause only), 8, 10, 11, 12, 12b, 13 (a, b, d), 14 (b, d), both assertions, and greenfield-journey control D).

### Step 9: PREPARE
- [ ] Re-read `claimBuild`, `claimBuildLocked`, `startAgent`, `taskTransition`'s refusal, `cancelTask`, and slice 12's Rule 5, its orphan clause and the exported `isUnreleasedStaleOrphanBuild` as they are now.

### Step 10: IMPLEMENT
- [ ] `src/lib/actions.js`: `require('./task-reconcile')` at the top; `oneBuildRefusal` with its JSDoc and export (both holder kinds, the agent-id form check, the computed minutes), its use at `claimBuild`'s read-only check, at `claimBuildLocked`'s two scheduler refusals (returning `holder` and `holderSentence`) and at `startAgent`'s `addAndClaim` refusal, `startAgent`'s use of `claimBuildLocked`'s `holder` and `holderSentence` for an existing queued task, the walk's stop at the first `one-build` refusal, the `startAgent` comment.
- [ ] `src/lib/menu-screens.js`: `taskTransition`'s refusal for a build with no plan; the claim mapper's holder.
- [ ] `tests/actions-scheduler.test.js`: the two assertions.
- [ ] `tests/greenfield-journey.test.js` control D: the reason assertion, a tightening.
- [ ] `CLAUDE.md`, `README.md`: the test-file count lines through the release script's count functions.

### Step 11: REVIEW
- [ ] The critic reads each refusal as the owner would — the three holder states, an agent id of unexpected form, a cancelling holder, a holder with no plan, a holder that just released the slot, an age-only-orphaned holder with and without an agent, a first refusal that is not `one-build`, a worktree build running beside the main one and a worktree claim refused on files — and checks that no refusal names a worktree build as the holder, and that a running or cancelling holder names no remedy but the cancel, and an orphaned holder names no command and only the live-list release and the presumed-dead age — and that the age half holds with no reconcile pass (case 13 (e)), because `oneBuildRefusal` asks slice 12's predicate with one argument, never as an array callback.

### Step 12: OPTIMIZE
- [ ] One sentence builder (`oneBuildRefusal`) for its four callers: `claimBuild`, `claimBuildLocked`, `startAgent` (`addAndClaim` only) and `taskTransition`.

### Step 13: SECURE
- [ ] The security scanner tries a hostile plan name, agent id and task id (quotes, control, format and bidirectional characters, a newline, an over-long agent id, a non-string agent id, a non-canonical task id) in a running and in an orphaned holder.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.
- [ ] Re-run case 10 (the real menu command) and quote the refusal in the build record.

### Step 15: DOCUMENT
- [ ] The `startAgent` comment states the rule and the walk's stop; `oneBuildRefusal` has its JSDoc; the build record quotes the sentences.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box is checked against its quoted evidence.
