---
title: "One build at a time: the scheduler's single start rule refuses a second build"
type: implementation
created: 2026-10-11
priority: high
effort: medium
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s11-ladder-tests-use-non-build-tasks
files:
  - src/lib/task-registry.js
  - src/lib/task-reconcile.js
  - src/lib/menu-screens.js
  - src/lib/actions.js
  - tests/task-registry.test.js
  - tests/scheduler-rule-projection-gate.test.js
  - tests/actions-scheduler.test.js
  - tests/scheduler-enforced.test.js
revision: 1
rejection_reason: "Owner's revision of 2026-10-17: one build at a time covers builds in the main checkout only; a build"
tag: rejected
---
# REVISION 1

## Rejection Feedback

Owner's revision of 2026-10-17: one build at a time covers builds in the main checkout only; a build recorded with its own worktree path runs alongside (lesson 21). Revise the rule, the refusal and the texts to that scope.

---


# One build at a time: the scheduler's single start rule refuses a second build

Slice 12 of 14 of `plans/functional/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`:
the parent's slice 5, the rule itself — the owner's decision of 2026-10-11 ("One now; worktrees for
parallel (Recommended)"), parent decision 1, and the scheduler-side scenarios "other task kinds keep the
five-slot ladder" and "a completion offers the next build, and only one" (its scheduler half). The
refusal sentence is slice 13; the session texts and README are slice 14.

**Scope since the owner's revision of 2026-10-17 (Operating Lesson 21).** One build at a time holds
in the MAIN CHECKOUT only. A build recorded with its own worktree — a folder directly inside the
project's `.claude/worktrees/`, recorded when the session claims it with `menu task start <id>
--worktree <path>` — runs alongside the main checkout's build and alongside builds in other worktree
folders; one worktree folder holds one build (decision 19, 2026-10-18). File disjointness (Rule 4, `file-conflict`) still applies to every build, in any checkout. Items 0
and 1-1c below carry that scope; everything else in this plan reads "build" as "main-checkout build"
wherever Rule 5 is meant.

## Problem Statement

Nothing limits builds to one at a time: the scheduler allows twenty (`MAX_CONCURRENT = 20` since the
owner's order of 2026-10-15, `src/lib/task-registry.js` line 122), and `evaluateConcurrency` (line 929) has no rule by task kind; its
header records the retired rule as "do NOT relitigate" (lines 10-14) and the ladder comment repeats it
(line 924). Every start path consults this one ladder: `canRun` (the menu's task start through
`actions.claimBuild`, Start agent's `addAndClaim`) and `nextRunnable` (every `promote[]` list).

## Technical approach — `src/lib/task-registry.js`

0. **The worktree record** (the owner's revision of 2026-10-17, Operating Lesson 21; decisions 11-17).
   No field a task records today says where its build runs: `normalizeLoadedTask` keeps exactly `id`,
   `kind`, `label`, `plan`, `status`, `agentTaskId`, `touches`, `gitOp`, `blockedBy`, `result` and `ts`
   (lines 338-358) and drops every other field on load (`src/lib/task-reconcile.js` line 381 relies on
   that); `label` is free display text, never validated. So one field is added, `worktree`, holding the
   project-relative form `.claude/worktrees/<name>` (forward slashes on every platform).
   0a. **Constants**, after `MAX_TOUCH_LENGTH` (line 136):
       ```js
       /** Every build worktree lives directly inside this folder of the project (forward slashes). */
       const WORKTREES_DIR = '.claude/worktrees/';
       /** The characters a worktree folder name may hold: no separator, so no traversal (no regex here). */
       const WORKTREE_NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-';
       ```
   0b. **The form check and the scheduler's predicate**, after `isEditing` (line 825), exactly:
       ```js
       /**
        * Whether a recorded worktree value has the one form `worktreeOf` records:
        * `.claude/worktrees/<name>`, the name 1-128 characters of WORKTREE_NAME_CHARS and neither
        * `.` nor `..`. Any other value — a forged one in a hand-edited registry included — is not
        * a worktree, so its build counts as a main-checkout build.
        * @param {any} w
        * @returns {boolean}
        */
       function isWorktreeForm(w) {
         if (typeof w !== 'string' || !w.startsWith(WORKTREES_DIR)) return false;
         const name = w.slice(WORKTREES_DIR.length);
         return name.length >= 1 && name.length <= 128 && name !== '.' && name !== '..' &&
           [...name].every(c => WORKTREE_NAME_CHARS.includes(c));
       }

       /**
        * Whether a task is a build recorded with its own worktree (the owner's revision of
        * 2026-10-17, Operating Lesson 21): it runs alongside the main checkout's build and builds
        * in other worktree folders; Rule 5 and its orphan clause hold it only against a build
        * recording the same worktree. Every other rule, file-conflict included, applies to it as
        * to any task.
        * @param {object} t
        * @returns {boolean}
        */
       function isWorktreeBuild(t) {
         return !!t && t.kind === 'implement' && isWorktreeForm(t.worktree);
       }
       ```
   0c. **The route's validator**, directly after `isWorktreeBuild` (not pure: it reads the file
       system, and only `menu task start` calls it), exactly:
       ```js
       /**
        * The recorded form of a `menu task start --worktree <value>`, or null when the value is
        * not usable. It must resolve (against root) to a folder directly inside
        * `<root>/.claude/worktrees/`, whose name has the form isWorktreeForm accepts, that exists
        * as a folder now under exactly that spelling in the folder listing (so a second
        * spelling of one folder on a case-insensitive file system is refused, and every claim of
        * one folder records one string), and whose real path equals that spelled path — no
        * symbolic link or junction anywhere on the way — so it can be neither the main checkout
        * itself nor a folder outside the project. The value itself is never echoed by the caller.
        * @param {string} root  the project root (the main checkout)
        * @param {any} value  the raw `--worktree` argument
        * @returns {string|null}  `.claude/worktrees/<name>`, or null
        */
       function worktreeOf(root, value) {
         if (typeof root !== 'string' || root.length === 0) return null;
         if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TOUCH_LENGTH) return null;
         const base = path.resolve(root, '.claude', 'worktrees');
         const abs = path.resolve(root, value);
         if (path.dirname(abs) !== base) return null;
         const name = path.basename(abs);
         const recorded = WORKTREES_DIR + name;
         if (!isWorktreeForm(recorded)) return null;
         try {
           // The name must be one the folder listing holds EXACTLY, as claimBuildLocked finds a
           // plan (src/lib/actions.js line 1149): on a case-insensitive file system `W1` would
           // otherwise reach the folder `w1` and be recorded under a second spelling, and two
           // builds could hold one folder under two strings.
           if (!safeFs.readdirSync(base).includes(name)) return null;
           if (!safeFs.lstatSync(abs).isDirectory()) return null;
           const real = path.join(safeFs.realpathSync(root), '.claude', 'worktrees', path.basename(abs));
           if (safeFs.realpathSync(abs) !== real) return null;
         } catch {
           return null; // absent or unreadable: not a usable worktree folder
         }
         return recorded;
       }
       ```
       `safeFs.readdirSync`, `safeFs.lstatSync` and `safeFs.realpathSync` exist (`src/lib/safe-fs.js`
       lines 98, 106 and 118, re-read on 2026-10-18).
   0d. **The record survives a load and a patch.** `normalizeLoadedTask` (lines 330-359) adds, after
       `result`, `...(typeof t.worktree === 'string' ? { worktree: t.worktree } : {})` — present only
       when recorded, so every existing task loads byte-for-byte as today, and a malformed string is
       kept for the predicate to judge (counted as a main-checkout build). `MUTABLE_FIELDS` (line 195)
       gains `'worktree'`. `addTask` is unchanged: a queued task records no worktree.
   0e. **Exports** (`module.exports`, line 1269): `isWorktreeBuild` and `worktreeOf`, next to `canRun`.

1. **Rule 5 in `evaluateConcurrency`**, after Rule 4 (file-conflict, lines 946-956) and before "Otherwise
   runnable", exactly:
   ```js
     // Rule 5 — one build at a time in the main checkout (the owner's decisions of 2026-10-11 and
     // 2026-10-17): a build waits while another main-checkout build runs or is cancelling. A build
     // recorded with its own worktree (isWorktreeBuild) runs alongside, Operating Lesson 21. After
     // Rule 4, so an overlapping build still reports file-conflict, in any checkout.
     if (candidate.kind === 'implement' && !isWorktreeBuild(candidate) &&
         running.some(t => t.kind === 'implement' && !isWorktreeBuild(t))) {
       return { run: false, reason: 'one-build' };
     }
     // Rule 5, one build per worktree folder (2026-10-18): a worktree build waits while a running
     // or cancelling build records the same worktree — two agents in one folder share a tree as
     // two main-checkout builds would. worktreeOf records the folder's exact listed name, so one
     // folder is one string, also after it was deleted and made again.
     if (isWorktreeBuild(candidate) &&
         running.some(t => isWorktreeBuild(t) && t.worktree === candidate.worktree)) {
       return { run: false, reason: 'one-build' };
     }
   ```
   `running` already holds every task that occupies a slot, `running` or `cancelling` (lines 815-837), and
   in `nextRunnable` the projected set, so a pass promotes at most one main-checkout build (a queued
   task carries no worktree: it is recorded only at the claim, item 0d). Non-build kinds are
   untouched: Rules 1-4 and the `MAX_CONCURRENT` slots stay as they are. The worktree half compares
   the recorded strings exactly; since `worktreeOf` records only a name the folder listing holds
   exactly (item 0c), a second spelling of one folder (`W1` for `w1` on a case-insensitive file
   system) never reaches the registry through the route, and a folder deleted and made again under
   its old name is still the same string, so its second claim waits (ONE-BUILD-10, decision 19).

   **Rule 5's orphan clause — a build orphaned on age alone keeps the build slot** (the CTO Chief's
   decision of 2026-10-11, decision 4 below). The reconcile pass orphans a running build on age alone
   after 120 minutes when no list of live agents confirms it (`src/lib/task-reconcile.js` lines 360-367,
   floor line 103) and marks it `result.orphanReason: 'staleness'` (lines 377-391); its agent may still be
   editing the shared checkout. It stops being `running`, so Rule 5's `running` set no longer sees it. The
   clause keeps it holding the build slot until it is released, on the same two signals that end its
   file quarantine in task-reconcile: the marker flips to `confirmed-dead` (its recorded agent id absent
   from a present live list, lines 429-430) or `presumed-dead` (twice the 120-minute floor past its start,
   lines 431-434, multiple line 130) — **or, with no reconcile pass at all, the orphan reaches that same
   presumed-dead age** (decision 9: the scheduler applies the age bound itself, because the reconcile
   pass runs only when the dashboard is rendered — `src/lib/menu-screens.js` line 575 in
   `buildDashboardTable`, and the tools tab, `src/tabs/tools.js` line 417 — never on a `menu task …`
   command). The orphan is NOT added to the running set `evaluateConcurrency` receives (it holds no
   concurrency slot, no touched files beyond the existing belt, no sync barrier); the clause sits where
   `canRun` already consults `overlapsStaleOrphanReservation`, and in `nextRunnable`:
   1a. **The predicate**, after `overlapsStaleOrphanReservation` (line 916), exported from
       `module.exports` next to `staleOrphanReservedFiles` (line 1290) so slice 13's refusal names the
       holder with the same predicate. An orphaned build recorded with its own worktree does not hold
       the main checkout's build slot (its agent edits its own worktree), so with no third argument
       the predicate returns false for `isWorktreeBuild(t)` — the form slice 13 and `nextRunnable`
       call. Given a worktree (the recorded form) as the third argument, it asks instead whether `t`
       holds THAT worktree's build slot (2026-10-18, decision 19: its agent may still be editing that
       folder):
       ```js
       /**
        * Whether a task is a build orphaned on AGE ALONE that still holds the main checkout's build
        * slot (Rule 5's orphan clause, the CTO Chief's decisions of 2026-10-11; a build recorded with
        * its own worktree never holds it, the owner's revision of 2026-10-17): an `implement` task
        * without its own worktree, orphaned with
        * `result.orphanReason === 'staleness'` — never confirmed dead, so its agent may still be
        * editing the shared checkout — and younger than the presumed-dead bound. It stops holding the
        * slot when task-reconcile flips the marker (`confirmed-dead` or `presumed-dead`), OR once
        * `now − ts.started` reaches the bound task-reconcile applies to a build
        * (DEFAULT_STALE_MS_BY_KIND.implement × DEFAULT_PRESUMED_DEAD_MULTIPLE, 240 minutes today),
        * exactly as if the reconcile pass had marked it `presumed-dead` — so the slot is released
        * on every route, including those that never run the reconcile pass. An absent or unparseable
        * `ts.started` is released at once, as task-reconcile presumes it dead at once. The marker is
        * never rewritten here. It is NOT in the running set: it holds no concurrency slot and no sync
        * barrier, only the build slot. Unlike `staleOrphanReservedFiles`, which reads the marker only,
        * this reads the age too.
        * Call it with an explicit task and clock, never as an array callback (`some`/`find` pass the
        * index as the second argument, which would be read as the clock).
        * @param {object} t
        * @param {number} [now] epoch milliseconds; default Date.now()
        * @param {string|null} [worktree] null (default): the main checkout's slot; a recorded
        *   worktree form: that worktree's slot, held only by an orphan recording the same string
        * @returns {boolean}
        */
       function isUnreleasedStaleOrphanBuild(t, now = Date.now(), worktree = null) {
         if (!t || t.kind !== 'implement' || t.status !== 'orphaned' ||
             !t.result || t.result.orphanReason !== 'staleness') return false;
         if (worktree === null ? isWorktreeBuild(t) : !(isWorktreeBuild(t) && t.worktree === worktree)) return false;
         // Lazy: task-reconcile requires this module at load, so a top-level require would be a cycle.
         const { DEFAULT_STALE_MS_BY_KIND, DEFAULT_PRESUMED_DEAD_MULTIPLE } = require('./task-reconcile');
         const started = typeof (t.ts && t.ts.started) === 'string' ? Date.parse(t.ts.started) : NaN;
         const presumedDead = !Number.isFinite(started) ||
           (now - started) >= DEFAULT_STALE_MS_BY_KIND.implement * DEFAULT_PRESUMED_DEAD_MULTIPLE;
         return !presumedDead;
       }
       ```
       The bound is read from task-reconcile's exported constants (`src/lib/task-reconcile.js` lines
       102-105 and 130, exported at 804 and 807), never a second literal; the `started` parse and the
       `>=` comparison are task-reconcile's own (`parseTs`, line 208-210; line 433). No caller in `src/`
       overrides the per-kind floor or the multiple (search `staleThresholdMsByKind|presumedDeadMultiple`
       over `src/`: 1 file, `task-reconcile.js` itself), so the defaults are the bound the reconcile pass
       applies on every route.
   1b. **The injectable clock.** `canRun` and `nextRunnable` take no time today (`canRun(candidate,
       registry)` line 975, `nextRunnable(registry)` line 1007; every call in `src/` passes no third
       argument: search `\b(canRun|nextRunnable)\(` over `src/`, re-read on 2026-10-18: 5 files, 9
       calls besides the two definitions — `src/lib/menu-screens.js` lines 2419, 2468 and 2637,
       `src/lib/actions.js` lines 1130, 1206 and 1301, `src/lib/task-registry.js` line 1211,
       `src/lib/task-view.js` line 212, `src/lib/task-reconcile.js` line 634 — each read). Each gains
       a last optional `opts = {}` with `opts.now`, in task-reconcile's style (line 250): `const now =
       Number.isFinite(opts.now) ? opts.now : Date.now();`. JSDoc: `@param {{now?:number}} [opts]` —
       "now: epoch ms for the orphan clause's age bound (default Date.now()); injectable for tests". The
       existing callers are unchanged and use the real clock.
       **In `canRun`**, after the concurrent-edit belt (lines 988-990) and before `return decision;`,
       exactly:
       ```js
         // Rule 5's orphan clause: a build orphaned on age alone keeps the build slot until it is
         // released — by task-reconcile's marker, or by reaching the presumed-dead age, checked here
         // (isUnreleasedStaleOrphanBuild). After the belt, so a build that also overlaps that orphan's
         // files still reports staleness-orphan-quarantine. A build with its own worktree is exempt.
         const now = Number.isFinite(opts.now) ? opts.now : Date.now();
         if (candidate.kind === 'implement' && !isWorktreeBuild(candidate) &&
             registry.tasks.some(t => isUnreleasedStaleOrphanBuild(t, now))) {
           return { run: false, reason: 'one-build' };
         }
         // The same clause for one worktree (2026-10-18): an age-only orphan recording the
         // candidate's worktree keeps that worktree's build slot until it is released.
         if (isWorktreeBuild(candidate) &&
             registry.tasks.some(t => isUnreleasedStaleOrphanBuild(t, now, candidate.worktree))) {
           return { run: false, reason: 'one-build' };
         }
       ```
   1c. **In `nextRunnable`**, after `const result = [];` (line 1009):
       ```js
         // Rule 5's orphan clause (isUnreleasedStaleOrphanBuild): no build is offered while a build
         // orphaned on age alone still holds the build slot (unreleased and under the presumed-dead age).
         const now = Number.isFinite(opts.now) ? opts.now : Date.now();
         const orphanHoldsBuildSlot = registry.tasks.some(t => isUnreleasedStaleOrphanBuild(t, now));
       ```
       and inside the loop, directly after the dependency line (line 1011), exactly:
       ```js
           if (cand.kind === 'implement' && orphanHoldsBuildSlot) continue; // Rule 5's orphan clause (one-build)
       ```
   The reason code stays `one-build`. Non-build kinds are untouched by the clause, and so is the
   concurrent-edit belt: `nextRunnable` still offers a non-build candidate on the orphan's files, so
   `task-reconcile.applyQuarantine` holds and reports it as before (BELT-5). The nextRunnable line
   needs no worktree test: its candidates are queued, and a queued task records no worktree (item
   0d); a forged queued value is held, the conservative direction.
1d. **Recording the worktree at the claim** — `src/lib/menu-screens.js` and `src/lib/actions.js`
   (decision 12):
   - `parseTaskArgs` (menu-screens.js line 2327) gains, next to `--agent-id` (line 2347):
     `case '--worktree': out.worktree = String(args[++i] == null ? '' : args[i]); break;`
   - `taskTransition` (line 2534), directly after the `--agent-id` check (lines 2571-2581) and before
     any registry read, exactly:
     ```js
       // The owner's revision of 2026-10-17 (Operating Lesson 21): a build claimed with
       // `--worktree` runs in its own git worktree, beside the main checkout's one build. Only a
       // folder directly inside this project's `.claude/worktrees/` is accepted; any other value
       // is refused, unechoed, and nothing is written.
       let worktree = null;
       if (kind === 'start' && p.worktree !== undefined) {
         worktree = taskRegistry.worktreeOf(root, p.worktree);
         if (worktree === null) {
           return {
             ok: false,
             refused: true,
             taskId: id,
             reason: 'worktree-unusable',
             text: `Task ${stripCtl(String(id)).slice(0, 40)} NOT started — the --worktree value does not ` +
               `name a folder directly inside .claude/worktrees/ of this project (reached with no link, ` +
               `never the main checkout itself).`,
           };
         }
       }
     ```
     Inside the registry mutator, after the build-delegation branch (lines 2595-2599) and before the
     stamp branch (line 2605), exactly:
     ```js
         // A worktree is recorded only at the claim: relabelling a running main-checkout build
         // would free the main checkout's slot while its agent still edits the main checkout.
         if (kind === 'start' && worktree !== null && task.status !== 'queued') {
           ctx.abort();
           return {
             ok: false,
             refused: true,
             taskId: id,
             reason: 'worktree-not-at-claim',
             text: `Task ${id} NOT changed — a worktree is recorded only when a queued task is started, ` +
               `never on a ${task.status} one.`,
           };
         }
     ```
     The registry-only start (line 2637) asks `taskRegistry.canRun(worktree
     ? { ...task, worktree } : task, reg)` and its `updateTask` (line 2658) adds `...(worktree ? {
     worktree } : {})`; directly after the `forced_start` line (2653) it writes, exactly, `if
     (worktree) taskRegistry.warnLog(root, 'worktree_start', { id, worktree });` — a worktree
     claim passes the main checkout's rule, so it leaves one warn-log line, as `--force` does
     (decision 20). The delegation (lines 2695-2698) passes `worktree` to `claimBuild` next to
     `agentTaskId` and `force`.
   - `actions.claimBuild` (line 1292) and `actions.claimBuildLocked` (line 1116): `opts.worktree`
     (`string|null`, the recorded form `taskRegistry.worktreeOf` returned, never a raw argument; JSDoc
     added to both `@param` blocks). Each scheduler check asks about the candidate as it will run —
     `const asClaimed = (t) => (opts.worktree ? { ...t, worktree: opts.worktree } : t);` and
     `canRun(asClaimed(task), reg)` at lines 1130 and 1301, `canRun(asClaimed(t), fresh)` at line 1206
     — and the claim's write (line 1208) becomes `updateTask(fresh, id, { status: 'running',
     agentTaskId, ...(opts.worktree ? { worktree: opts.worktree } : {}) })`. After a claim, directly
     after the `forced_start` line (1219), exactly: `if (opts.worktree)
     taskRegistry.warnLog(root, 'worktree_start', { id, worktree: opts.worktree });` (decision 20). A
     refused claim writes nothing, as today — no registry write and no warn-log line. `startAgent` and `addAndClaim` pass no worktree: Start agent and the
     continuation claim in the main checkout.
2. **The header** (lines 10-18) is rewritten: "Serialization model — ONE BUILD AT A TIME IN THE MAIN
   CHECKOUT. At most one `implement` task without its own worktree occupies the main checkout (Rule 5),
   the owner's decision of 2026-10-11 ('One now; worktrees for parallel'), scoped to the main checkout
   by his revision of 2026-10-17 (Operating Lesson 21), which supersedes for the main checkout vision
   F1's 'two builds at once when their files are disjoint' (plans/vision/ctoc-background-engine-rebuild.md
   lines 166-167). A build recorded with its own worktree (`worktree`, a folder directly inside
   `.claude/worktrees/`, recorded when `menu task start <id> --worktree <path>` claims it;
   isWorktreeBuild) runs alongside the main checkout's build and builds in other worktree folders;
   one worktree folder holds one build. A build
   orphaned on age alone keeps the main checkout's build slot until task-reconcile releases it or it
   reaches the presumed-dead age (Rule 5's orphan clause, the CTO Chief's decisions of 2026-10-11: its
   agent may still be editing the checkout, and the slot must free on every route). Every task, a build
   in any checkout included, runs concurrently only when its touched files are DISJOINT — file-conflict
   (Rule 4) serializes them — up to MAX_CONCURRENT. `touches` stays MANDATORY for every `implement` task
   …" (the rest of the old paragraph's last sentence kept).
3. **The ladder list in the header** (lines 39-48) gains, after Rule 4 and aligned like it ("Rule 5",
   two spaces, the name), "Rule 5  one-build: an `implement` candidate without its own worktree waits
   while any `implement` task without its own worktree is running or cancelling (the owner's decision
   of 2026-10-11, scoped to the main checkout on 2026-10-17; a build recorded with its own worktree is
   exempt, isWorktreeBuild), and — outside the running set, in canRun and nextRunnable — while a
   main-checkout build orphaned on age alone is not yet released by task-reconcile and is under the
   presumed-dead age (isUnreleasedStaleOrphanBuild). A worktree build waits while a running or
   cancelling build, or (in canRun) an unreleased age-only orphan, records the same worktree: one
   build per worktree folder."
4. **"WHERE THE LADDER IS ENFORCED"** (lines 50-60) is corrected: after slice 2 the build start that calls
   `canRun` is `actions.claimBuild` (the menu's `menu task start` of a build), `actions.claimBuildLocked`
   (inside `claimBuild`'s lock, and Start agent's existing queued task) and `actions.startAgent` (its walk,
   under slice 2's build-start lock), not
   `menu-screens.taskTransition`. The bullet becomes: "`menu task start` of a build — actions.claimBuild
   (and actions.startAgent) call canRun under the build-start lock and REFUSE on a false decision; `--force`
   is a human override that is LOGGED (`forced_start`), never silent." A non-build `menu task start` (and a
   build with no plan, which stays on today's start path) keeps the `menu-screens.taskTransition('start')`
   line.
5. **The `evaluateConcurrency` comment** (lines 918-924): "1 max-concurrent → 2 sync-barrier → 3
   git-exclusive → 4 file-conflict → 5 one-build → ok. (One build at a time in the main checkout — the
   owner's decisions of 2026-10-11 and 2026-10-17; a build with its own worktree runs alongside, one
   build per worktree folder; vision F1's two builds at once is superseded for the main checkout.)"
   Plus one sentence: "Rule 5's orphan clause is not here: an orphaned build is not in `running`; canRun and
   nextRunnable apply it (isUnreleasedStaleOrphanBuild)."
6. **The `nextRunnable` comment** (lines 994-1006, re-read on 2026-10-18; line 1001 reads "never
   violates ≤MAX_CONCURRENT / sync-barrier / git-exclusive / file-conflict"): it becomes "never violates
   ≤MAX_CONCURRENT / sync-barrier / git-exclusive / file-conflict / one-build (its orphan clause
   included: no build is offered while a build orphaned on age alone is unreleased)" — the
   `≤MAX_CONCURRENT` kept as written, never a number.
7. **The `assertImplementTouches` comment** (lines 640-651): "file disjointness (Rule 4) is what serializes
   plan-mutating work now that kind-based plan-serial is gone" becomes "file disjointness (Rule 4) keeps a
   build from editing what any running task holds, in any checkout (main-checkout builds among themselves
   also wait by Rule 5)".
   After items 2-7 the file holds no "plan-serial" and no "relitigate" (search over the file: 0 matches).
8. **The header NOTE** (lines 31-38), which lists the scheduler's readers of `result.orphanReason`
   (the belt and the confirm-liveness rule), adds the third: "and Rule 5's orphan clause (canRun and
   nextRunnable: a build orphaned on age alone keeps the build slot until task-reconcile releases it or
   it reaches the presumed-dead age, read with task-reconcile's own constants — the one place the
   scheduler reads `ts.started`)".

## `src/lib/task-reconcile.js` — one comment and one call

9. `applyQuarantine`'s "WHY THIS IS NOT IN THE SCHEDULER" paragraph (lines 662-668) says the marker
   `result.orphanReason` belongs to the projection, "never to `canRun` or `nextRunnable`". The belt
   (canRun) already contradicts it and the orphan clause adds `nextRunnable`, so the paragraph would tell
   a reader to remove this slice's rule. It becomes: "WHY THE FILE GUARD IS ALSO HERE. The scheduler reads
   `result.orphanReason` for three rules — canRun's concurrent-edit belt, the sync barrier's
   confirm-liveness rule and Rule 5's orphan clause (a build orphaned on age alone keeps the build slot,
   in canRun and nextRunnable, until this module releases it or it reaches the presumed-dead age, which
   the scheduler reads from this module's exported constants). `nextRunnable` deliberately still OFFERS
   a candidate that overlaps an age-only orphan's files, so this projection can hold it and REPORT it;
   canRun refuses to start it."
10. `reconcileState`'s scheduler call (line 634) passes the pass's own clock (line 620), so the reconcile
    pass and the orphan clause judge the age at one instant (and a test's `opts.now` reaches both):
    `promote = taskRegistry.nextRunnable(reconciled, { now });`. No other code line in the file changes.

## Tests that encode the retired rule — changed only to express the owner's decision

- `tests/task-registry.test.js`:
  - ST-07 (lines 184-190) → "ST-07: a second build waits while one runs, even with DISJOINT touches
    (one build at a time — the owner's decision of 2026-10-11)", expecting `{ run: false, reason:
    'one-build' }`.
  - ST-21 (c) (lines 613-618) → two queued builds with disjoint touches give `['q1']`, comment "one build
    at a time in the main checkout".
  - F2 (lines 399-448) → expected `['q3', 'q6']`; q4's comment "a second build → one-build"; the union
    checks unchanged (they hold), plus one after line 429:
    `assert.ok(union.filter(t => t.kind === 'implement').length <= 1, 'at most one build in the union (one build at a time)');`
  - New defenders, each named with its id so the mutation gate can require it red:
    `ONE-BUILD-1: canRun refuses a second build beside a running build` (running implement on `x.js`,
    candidate implement on `y.js` → `{ run: false, reason: 'one-build' }`);
    `ONE-BUILD-1b: a cancelling build still holds the build slot`;
    `ONE-BUILD-2: nextRunnable promotes at most one build per pass` (three queued disjoint builds, nothing
    running → `['q1']`; with a running build → `[]`);
    `ONE-BUILD-3 (control): non-build tasks run beside a build and keep the MAX_CONCURRENT ladder` (one
    running build on `x.js` plus `reg.MAX_CONCURRENT - 1` queued `review`/`quality` tasks on disjoint
    files `n1.js` … → `nextRunnable` returns all of them; one more queued `review` on `e.js` is not
    returned. Then, with those marked `running`, `canRun` of that `review` on `e.js` → `{ run: false,
    reason: 'max-concurrent' }`. With one running `quality` on `a.js` and no build, `canRun` of a
    `quality` on `a.js` → `{ run: false, reason: 'file-conflict' }`. The count is read from
    `reg.MAX_CONCURRENT`, 20 since the owner's order of 2026-10-15, never a literal);
    `ONE-BUILD-4: an overlapping second build reports file-conflict (Rule 4 precedes Rule 5)`.
  - New defenders of the main-checkout scope (the owner's revision of 2026-10-17). `W1 =
    '.claude/worktrees/w1'`, `W2 = '.claude/worktrees/w2'`; ONE-BUILD-1 above is the case "two
    main-checkout builds: the second is refused".
    `ONE-BUILD-8: a main-checkout build runs alongside a worktree build` (running implement on `x.js`
    with `worktree: W1`, candidate implement on `y.js` with no worktree → `{ run: true, reason: 'ok' }`;
    the reverse, running main-checkout build on `x.js` and candidate on `y.js` with `worktree: W2` →
    run; `nextRunnable` with the running `W1` build and a queued build on `y.js` → `['q1']`);
    `ONE-BUILD-8b: two worktree builds run alongside` (running implement on `x.js` with `W1`, candidate
    on `y.js` with `W2` → run; with a main-checkout build also running on `z.js`, a candidate on `w.js`
    with `'.claude/worktrees/w3'` → run, and one on `w.js` with no worktree → `one-build`);
    `ONE-BUILD-8c: file disjointness still applies in any checkout` (running implement on
    `src/shared.js` with `W1`: a main candidate on `src/shared.js` → `file-conflict`; a candidate with
    `W2` on `src/shared.js` → `file-conflict`; and with a running main build on `src/shared.js`, a `W2`
    candidate on it → `file-conflict`);
    `ONE-BUILD-8d: a malformed worktree value counts as a main-checkout build` (a running build on `x.js`
    whose `worktree` is, in turn, `'../..'`, `'.'`, `'.claude/worktrees'`, `'.claude/worktrees/'`,
    `'.claude/worktrees/..'`, `'.claude/worktrees/../..'`, `'.claude/worktrees/a/b'`,
    `'.claude/worktrees/a b'`, `'.claude\\worktrees\\w1'`, `'/abs/.claude/worktrees/w1'`, `'.claude/worktrees/'
    + 'q'.repeat(129)`, `''`, `42` and `null` → a main candidate on `y.js` is refused `one-build`; and a
    candidate on `y.js` carrying each of those values beside a running main build → refused `one-build`;
    `isWorktreeBuild` is false for each, and true for `W1`);
    `ONE-BUILD-8e: an orphaned worktree build does not hold the main checkout's build slot` (the
    `staleOrphan` fixture with `worktree: W1`, started `ORPHAN_STARTED`, under the bound; a main
    candidate on `src/y.js` → run; `isUnreleasedStaleOrphanBuild` is false for it);
    `ONE-BUILD-8f: worktreeOf accepts only a folder directly inside .claude/worktrees/` (a temporary
    project with `.claude/worktrees/w1/` made: `worktreeOf(root, '.claude/worktrees/w1')` and its absolute
    path, and `'.claude/worktrees/w1/'`, each return `'.claude/worktrees/w1'`; each of these returns
    `null`: `'.'`, `root` itself, `'..'`, `'.claude/worktrees'`, `'.claude/worktrees/../..'`,
    `'.claude/worktrees/w1/sub'` with that folder made, `'.claude/worktrees/missing'`, a plain file
    `.claude/worktrees/f`, `'.claude/worktrees/a b'` with that folder made, a link
    `.claude/worktrees/link` to `root` (`fs.symlinkSync(root, p, process.platform === 'win32' ?
    'junction' : 'dir')`, a junction needs no privilege on Windows), a second project whose
    `.claude` is such a link to a folder holding `worktrees/w1/`, a value of 513 characters, `''`, `42`,
    `undefined`, and `'.claude/worktrees/W1'` — a second spelling of the made folder `w1`, refused on a
    case-insensitive file system because the listing holds only `w1`, and on a case-sensitive one
    because no such folder exists, so the expectation is the same on every platform).
    `ONE-BUILD-10: two builds never hold one worktree folder` (added 2026-10-18, decision 19): a
    running implement on `x.js` with `W1`, candidate implement on `y.js` with `W1` → `{ run: false,
    reason: 'one-build' }`; the same with the holder `cancelling` → `one-build`; with the holder
    `done` → run; a candidate with `W2` beside it → run (control). Because the folder is named by its
    recorded string, a folder deleted and made again under the same name is the same slot: proved
    through the route in ONE-BUILD-9.
    `ONE-BUILD-10b: an age-only orphan keeps its own worktree's build slot` (the `staleOrphan` fixture
    with `worktree: W1`, `started: ORPHAN_STARTED`): a candidate implement on `src/y.js` with `W1` →
    `{ now: UNDER }` `one-build`, `{ now: AT }` run; with `W2` → run under the bound; with the marker
    `confirmed-dead` → run under the bound; `isUnreleasedStaleOrphanBuild(o1, UNDER, W1)` is true,
    `isUnreleasedStaleOrphanBuild(o1, UNDER, W2)` and `isUnreleasedStaleOrphanBuild(o1, UNDER)` are false.
  - The four cases the owner's revision asks for map as: two main-checkout builds → ONE-BUILD-1 and
    ONE-BUILD-9; a main-checkout build alongside a worktree build → ONE-BUILD-8 and -9; two worktree
    builds → ONE-BUILD-8b (two folders run alongside) and ONE-BUILD-10, -10b and -9 (one folder holds one
    build); a forged worktree value → ONE-BUILD-8d (a malformed value counts as main-checkout), -8f and
    -9 (refused by the route).
  - New defenders of the orphan clause (in the "Concurrent-edit belt" describe block, using its
    `staleOrphan` fixture, line 974: an `implement` task `o1`, `orphaned`, `orphanReason: 'staleness'`).
    The fixture gains two optional fields, `over.worktree` (set only when given, for ONE-BUILD-8e) and
    `over.started`, the latter written as `ts: { created:
    '2026-07-02T00:00:00.000Z', started: over.started ?? null, done: null }` — the BELT cases keep
    `started: null` (the belt reads only the marker). The orphan-clause cases set `started: ORPHAN_STARTED`
    (`'2026-07-02T00:00:00.000Z'`) and pass the clock explicitly: `BOUND =
    taskReconcile.DEFAULT_STALE_MS_BY_KIND.implement * taskReconcile.DEFAULT_PRESUMED_DEAD_MULTIPLE`
    (imported from `src/lib/task-reconcile.js`, never a literal), `UNDER = Date.parse(ORPHAN_STARTED) +
    BOUND - 1`, `AT = Date.parse(ORPHAN_STARTED) + BOUND`; "under the bound" below means `{ now: UNDER }`.
    `ONE-BUILD-5: canRun refuses a build while a build orphaned on age alone is unreleased` (`o1` on
    `src/x.js`, candidate implement on `src/y.js`, nothing running, under the bound → `{ run: false,
    reason: 'one-build' }`);
    `ONE-BUILD-5b: the orphaned build is not in the running set` (`o1` plus `reg.MAX_CONCURRENT - 1`
    running `review` tasks with empty touches — the count read from `reg.MAX_CONCURRENT`, never
    arithmetic for five slots; candidate `quality` on `src/y.js` → `{ run: true, reason: 'ok' }` — counted as
    running, `o1` would fill the last slot and it would be `max-concurrent`; and a `quality` candidate on `src/y.js` beside `o1` alone →
    run; a non-build orphan — `o1` with `kind: 'quality'` — does not hold the build slot: an implement
    candidate on `src/y.js` → run);
    `ONE-BUILD-5c: a released orphan no longer holds the build slot` (for `presumed-dead` and
    `confirmed-dead`, under the bound: the implement candidate on `src/y.js` → run);
    `ONE-BUILD-5d: an orphan reaching the presumed-dead age releases the build slot with no reconcile pass`
    (`o1` with `staleness`, candidate implement on `src/y.js`: `{ now: UNDER }` → `one-build`; `{ now: AT
    }` → `{ run: true, reason: 'ok' }`; `{ now: AT + 1 }` → run; `o1` with `started: null` → run at any
    clock, as task-reconcile presumes it dead at once; after every call `o1.result.orphanReason` is still
    `'staleness'` and `o1` deep-equals its fixture — the scheduler does not rewrite the marker; no
    `task-reconcile` function is called in the case);
    `ONE-BUILD-5e: canRun with no clock uses the real clock` (`o1` started `new Date(Date.now() - BOUND +
    60_000).toISOString()` → `one-build`; started `new Date(Date.now() - BOUND - 60_000).toISOString()` →
    run) — the live callers pass no clock, so this is the path the menu takes;
    `ONE-BUILD-6: nextRunnable offers no build while a build orphaned on age alone is unreleased`
    (`o1`, queued implement `q1` on `src/y.js`, queued `review` `q2` with empty touches, under the bound →
    `['q2']`);
    `ONE-BUILD-6b: once released, nextRunnable offers the build` (`o1` with `presumed-dead`, under the
    bound → `['q1', 'q2']`);
    `ONE-BUILD-6c: nextRunnable offers the build once the orphan reaches the presumed-dead age` (`o1` with
    `staleness`: `{ now: UNDER }` → `['q2']`; `{ now: AT }` → `['q1', 'q2']`; the marker unchanged).
  - BELT-2 (line 991) uses a disjoint `implement` candidate beside the age-only orphan build to prove the
    belt holds only genuine collisions; its outcome would then hang on the orphan clause and the
    fixture's `ts.started` (today `null`, which the clause releases at once). Its candidate becomes `kind:
    'quality'` (same id, same touches, same assertion) — the belt is kind-blind, and the disjoint build
    case is ONE-BUILD-5. BELT-5 (line 1011) proves `nextRunnable` still offers the colliding candidate;
    its `t2` becomes `kind: 'quality'` (same touches, same assertion), for the same reason (the build case
    is ONE-BUILD-6). BELT-1, BELT-1b, BELT-3 and
    BELT-4 are unchanged (BELT-1/1b keep their reason: the belt precedes the orphan clause).
- `tests/scheduler-enforced.test.js` — a new case in "R3-B item 8", after Q1 (the CTO Chief's decision 3
  of slice 11, proved here because it needs Rule 5):
  `ONE-BUILD-7: a build the quarantine holds keeps the projected build slot until the reservation is released`.
  The registry (as Q1 builds it): `holder` = a `quality` task on `src/shared.js`, `running`, `agentTaskId:
  'gone-agent'`, started 40 minutes ago (past the 30-minute floor for `quality`, inside its 60-minute
  presumed-dead bound); then queued `b1` = implement for `p1` on `src/shared.js`, then queued `b2` =
  implement for `p2` on `src/free.js` (in that order).
  Pass 1, `taskReconcile.reconcileState(root, {})` (no live list): `report.stalenessOrphaned` names
  `holder`; `report.quarantined` names `b1`; `promote` holds no `implement` task (b2 is refused `one-build`
  in the projection behind b1). Pass 2, the same call: the same — the hold lasts while the reservation
  does. Pass 3, `reconcileState(root, { liveAgentIds: ['someone-else'] })`: `report.quarantineReleased`
  names `holder` (confirmed gone); `promote` holds exactly one `implement` task, `b1`; `b2` is not
  promoted (Rule 5 behind b1).
- `tests/scheduler-enforced.test.js` — one more case, in "R3-B item 1", through the real route
  (`ms.route`, the `writePlan` writer at lines 59-76):
  `ONE-BUILD-9: menu task start --worktree claims a build beside the main checkout's build`. Plans
  `pA` (`src/a.js`), `pB` (`src/b.js`) and `pC` (`src/c.js`) in `todo/`; `.claude/worktrees/wB/` made.
  `menu task add implement pA --touches src/a.js`, `menu task start <tA>` → running (the main
  checkout's build). `menu task add implement pB --touches src/b.js`, `menu task start <tB> --worktree
  .claude/worktrees/wB` → `ok: true`; tB is `running` with `worktree === '.claude/worktrees/wB'`; pB is
  in `in-progress/`; the warn log (`.ctoc/logs/task-registry.json`, `logPath` in
  `src/lib/task-registry.js` line 214) holds exactly
  one `worktree_start` entry, with `id` tB and `worktree` `'.claude/worktrees/wB'`, and no
  `forced_start` entry (every case starts in a fresh temporary project, the file's top-level `beforeEach`, lines 47-48
  read on 2026-10-18, so no other case's log line is there). `menu task add implement pC --touches src/c.js`; `menu task start <tC>` → `ok:
  false`, `reason: 'one-build'` (two main-checkout builds), pC in `todo/`. Then `menu task start <tC>
  --worktree V` for each forged `V` in `.claude/worktrees/../..`, `.`, `root` itself,
  `.claude/worktrees/missing`, `.claude/worktrees/WB` (a second spelling of `wB`) → `ok: false`,
  `reason: 'worktree-unusable'`; the text contains none of `"V"`, `'V'` and `` `V` `` (the value
  quoted — a bare substring test can never pass, because the refusal sentence itself contains `.`
  many times) and is the same sentence for every `V`; for
  `root`, the text also does not contain the temporary folder's base name; the registry file is
  byte-identical and its generation unchanged, the warn log gains no entry, pC in `todo/`. Then the
  same folder twice (decision 19): `menu task start <tC> --worktree .claude/worktrees/wB` beside the
  running tB → `ok: false`, `reason: 'one-build'`, registry byte-identical; the folder `wB` removed
  and made again (`fs.rmSync(…, { recursive: true })`, `fs.mkdirSync`) and the same start → still
  `one-build`; pC in `todo/`. Finally `menu task start <tB> --agent-id agent-b --worktree
  .claude/worktrees/wB` on the running tB → `reason: 'worktree-not-at-claim'`, registry byte-identical.
- `tests/scheduler-rule-projection-gate.test.js`: six more `one-build` entries, each named for its
  branch, because a branch that reuses an existing reason is invisible to the enumeration (the gate's
  header, lines 27-29):
  ```js
  { reason: 'one-build', name: "delete Rule 5's orphan clause in canRun",
    find: "  if (candidate.kind === 'implement' && !isWorktreeBuild(candidate) &&\n      registry.tasks.some(t => isUnreleasedStaleOrphanBuild(t, now))) {\n    return { run: false, reason: 'one-build' };\n  }",
    replace: '', expectRedCases: ['ONE-BUILD-5:'] },
  { reason: 'one-build', name: "delete Rule 5's one-build-per-worktree half in evaluateConcurrency",
    find: "  if (isWorktreeBuild(candidate) &&\n      running.some(t => isWorktreeBuild(t) && t.worktree === candidate.worktree)) {\n    return { run: false, reason: 'one-build' };\n  }",
    replace: '', expectRedCases: ['ONE-BUILD-10:'] },
  { reason: 'one-build', name: "delete the orphan clause's one-build-per-worktree half in canRun",
    find: "  if (isWorktreeBuild(candidate) &&\n      registry.tasks.some(t => isUnreleasedStaleOrphanBuild(t, now, candidate.worktree))) {\n    return { run: false, reason: 'one-build' };\n  }",
    replace: '', expectRedCases: ['ONE-BUILD-10b:'] },
  { reason: 'one-build', name: 'accept a malformed worktree value as a worktree build',
    find: "  return !!t && t.kind === 'implement' && isWorktreeForm(t.worktree);",
    replace: "  return !!t && t.kind === 'implement' && typeof t.worktree === 'string';",
    expectRedCases: ['ONE-BUILD-8d:'] },
  { reason: 'one-build', name: "delete Rule 5's orphan clause in nextRunnable",
    find: "    if (cand.kind === 'implement' && orphanHoldsBuildSlot) continue; // Rule 5's orphan clause (one-build)",
    replace: '', expectRedCases: ['ONE-BUILD-6:'] },
  { reason: 'one-build', name: "drop the orphan clause's presumed-dead age bound",
    find: "  const presumedDead = !Number.isFinite(started) ||\n    (now - started) >= DEFAULT_STALE_MS_BY_KIND.implement * DEFAULT_PRESUMED_DEAD_MULTIPLE;",
    replace: '  const presumedDead = !Number.isFinite(started);',
    expectRedCases: ['ONE-BUILD-5d:', 'ONE-BUILD-6c:'] }
  ```
  Each `find` is byte-identical to item 1b's first four `if` lines, item 1's second `if` block (its
  four code lines after the comment), item 1b's second `if` block, item 0b's `return` line of
  `isWorktreeBuild`, item 1c's loop line and item 1a's two `presumedDead` lines; G3 requires each
  exactly once (the canRun `find` cannot match Rule 5, whose second line reads `running.some`; the
  two worktree-half `find`s differ in their second line, `running.some` against `registry.tasks.some`,
  and neither matches a main-checkout block, which opens `candidate.kind === 'implement'`; the
  age-bound `find` names the predicate's own constants, which nothing else in the file reads). The
  malformed-value and age-bound entries' replacements are non-empty mutations: the first keeps the
  predicate whole and drops only the form check, so a malformed value would exempt a build from Rule 5;
  the second removes only the age release, which is what makes slice 13's "at the latest" sentence
  true.
- `tests/scheduler-rule-projection-gate.test.js`: `DECLARED_REASONS` (lines 96-99) gains `'one-build'`;
  G1's title "(seven)" becomes "(eight)"; `MUTATION_TABLE` gains `{ reason: 'one-build', name: 'delete Rule
  5 (one-build) in evaluateConcurrency', find, replace: '', expectRedCases: ['ONE-BUILD-1:',
  'ONE-BUILD-2:'] }`, where `find` is, on one line:
  ```js
  find: "  if (candidate.kind === 'implement' && !isWorktreeBuild(candidate) &&\n      running.some(t => t.kind === 'implement' && !isWorktreeBuild(t))) {\n    return { run: false, reason: 'one-build' };\n  }",
  ```
  byte-identical to item 1's four code lines; G3 requires exactly one occurrence.
- `tests/actions-scheduler.test.js` lines 213-223 → "two file-DISJOINT todo plans: the second waits while
  the first builds (one build at a time)": `r1.started === true`; `r2.started === false`, `r2.queued ===
  true`, `r2.reason === 'one-build'`; one running implement task; the second plan still in `todo/`.

## Implementation Details

### Dependency Graph

```
task-registry.isUnreleasedStaleOrphanBuild ← canRun, nextRunnable (Rule 5's orphan clause, with their clock)
                                           ← actions.oneBuildRefusal (slice 13, via the export, real clock)
task-registry.isUnreleasedStaleOrphanBuild --lazy require--> task-reconcile.DEFAULT_STALE_MS_BY_KIND,
                                                             DEFAULT_PRESUMED_DEAD_MULTIPLE (the age bound)
task-reconcile.reconcileState → task-registry.nextRunnable(reconciled, { now })   (one clock per pass)
task-registry.evaluateConcurrency ← canRun ← actions.claimBuild (menu task start),
                                             actions.claimBuildLocked (Start agent's queued task),
                                             addAndClaim (Start agent's new task), task-view.waitReason
                                  ← nextRunnable ← menu-screens.computePromote (every promote[] list),
                                                   task-reconcile.applyQuarantine callers
tests/scheduler-rule-projection-gate.test.js → mutates a copy of task-registry.js and runs the scheduler test files
task-registry.isWorktreeBuild ← evaluateConcurrency (Rule 5), canRun (orphan clause), isUnreleasedStaleOrphanBuild,
                                actions.oneBuildRefusal (slice 13, via the export)
task-registry.worktreeOf ← menu-screens.taskTransition ('start' with --worktree) ← menu-screens.parseTaskArgs
menu-screens.taskTransition → actions.claimBuild(…, { worktree }) → actions.claimBuildLocked (records it in the claim's write)
```

### File Specifications

- `src/lib/task-registry.js` — MODIFY: the worktree record (item 0: constants, `isWorktreeForm`,
  `isWorktreeBuild`, `worktreeOf`, the load and patch whitelist, two exports), Rule 5, its orphan clause
  (items 1a-1c: the predicate with its age bound, exported; the optional clock on `canRun` and
  `nextRunnable`), and items 2-8 (comments).
- `src/lib/menu-screens.js` — MODIFY (added 2026-10-18 for the main-checkout scope): item 1d, the
  `--worktree` flag in `parseTaskArgs` and its check, refusal and record in `taskTransition`.
- `src/lib/actions.js` — MODIFY (added 2026-10-18 for the main-checkout scope): item 1d, `claimBuild`
  and `claimBuildLocked` check the candidate with its worktree and record it in the claim's write.
- `src/lib/task-reconcile.js` — MODIFY: item 9, one comment paragraph, and item 10, the clock passed to
  `nextRunnable`. Added to this slice's files because the paragraph states the opposite of the orphan
  clause.
- `tests/task-registry.test.js` — MODIFY: ST-07, ST-21 (c), F2, BELT-2, BELT-5, the `staleOrphan`
  fixture's optional `worktree` and `started`, twenty-one new cases (ONE-BUILD-1, -1b, -2, -3, -4, -5,
  -5b, -5c, -5d, -5e, -6, -6b, -6c, -8, -8b, -8c, -8d, -8e, -8f, -10, -10b).
- `tests/scheduler-rule-projection-gate.test.js` — MODIFY: the declared reason, seven defenders, G1's
  title.
- `tests/actions-scheduler.test.js` — MODIFY: the one case.
- `tests/scheduler-enforced.test.js` — MODIFY: ONE-BUILD-7 and ONE-BUILD-9. Added to this slice's files
  because the cases need Rule 5 (slice 11, decision 3).

### Test Plan

Written first: the ONE-BUILD cases (1-10, with 1b, 5b-5e, 6b, 6c, 8b-8f, 10b), the three flipped
expectations and the two BELT kind changes are run on today's code; ONE-BUILD-1, -1b, -2, -5, -5d, -5e,
-6, -6c, -7, -8b (its last check, a main candidate beside a running main build, expects `one-build`),
-8d, -8e (`isUnreleasedStaleOrphanBuild` does not exist today), -8f, -9, -10 and -10b and the three
flipped expectations fail there (ONE-BUILD-3, -4, -5b, -5c, -6b, -8, -8c and the BELT changes pin
behaviour that holds today and must keep holding); the projection gate's G1 fails (it finds seven
reasons, eight declared) and G3/G5 fail for the seven `one-build` entries (nothing to mutate) until the
rule exists. The build record lists the measured red set.

The reproduction through the real menu command (in this slice, refusal text as it stands until slice
13): in a temporary project with plans delta and echo in `todo/`, `menu task add implement delta
--touches src/delta.js`, `menu task start t1`, `menu task add implement echo --touches src/echo.js`,
`menu task start t2` as child processes → the last answers `ok: false`, `reason: 'one-build'`; echo still
in `todo/`. Recorded in the build record (slice 13's test file carries it permanently with the final
sentence).

### Security Review

- [x] A refusal rule only: it can stop a start, never start one. `--force` on `menu task start` still
  overrides it, logged as `forced_start` (unchanged code path, slice 2). Re-read on 2026-10-18: the
  write protection no longer refuses a background agent's menu routes — the owner's order of
  2026-10-15, "remove that hook block, it is wrong" (`src/hooks/protect-records.js` lines 597-602,
  `RECORD_REFUSALS_OFF`; `tests/protect-records.test.js` test 83 at line 467 now ALLOWS `menu task
  start t7 --force` from one). The CTO Chief's ruling of 2026-10-18 (decision 21): a background agent
  passing `--force` to a build start is refused by the decision-route refusal of slice 21, because only
  the owner forces a build start; until slice 21 ships, only the session's instructions stop it.
  `--worktree` needs no refusal: the existence check (`worktreeOf`) and the file-overlap rule (Rule 4)
  hold whoever passes it. No hook change is made here.
- [x] The worktree exemption is the one way past Rule 5 without `--force`, so its input is checked at
  the trust boundary: `worktreeOf` accepts only a folder directly inside `<root>/.claude/worktrees/`
  with a 1-128 character name of letters, digits, `.`, `_`, `-` (no separator, so no traversal), that
  exists as a folder under exactly that spelling in the folder listing and whose real path equals its
  spelled path (no link or junction, so never the main checkout or a folder outside the project); a
  refused value is never echoed (ONE-BUILD-8f, -9). Every worktree claim writes one `worktree_start`
  warn-log line, as `--force` writes `forced_start` (decision 20). One worktree folder holds one build
  (ONE-BUILD-10, -10b, decision 19).
  A value already in the registry is judged again by `isWorktreeForm` on every scheduler read, and
  exactly this holds: only a MALFORMED hand-edited value counts as a main-checkout build (ONE-BUILD-8d,
  defended by the mutation gate). A well-formed hand-edited value, `.claude/worktrees/<name>` naming any
  folder or none, is exempt from the main checkout's rule like a claimed one: the scheduler never
  re-checks the folder, and a hand edit to the registry is outside what it can judge.
- [x] Not checkable by the scheduler: that the agent briefed for a worktree build really works there.
  A build claimed with `--worktree` whose agent edits the main checkout would run beside the main
  build; the session's brief (slice 14) is the guard. Listed under Risks.

### Wiring — the live call sites

Rule 5 lives in `evaluateConcurrency`, which `canRun` and `nextRunnable` call; those are reached from
every start path (`menu task start` via `actions.claimBuild`, Start agent via `addAndClaim` and
`claimBuildLocked`) and every `promote[]` list (`computePromote`). The orphan clause lives in `canRun` and
`nextRunnable` themselves, so it reaches the same callers; the board's "waits: one-build" comes from
`task-view.waitReason`, which asks `canRun`. The worktree record is reached from `/ctoc:start`'s
`menu task start <id> --worktree <path>` (`src/commands/start.js` → `menu-screens.route` →
`taskCommand` → `taskTransition` → `actions.claimBuild`), the claim slice 14's session text tells the
session to run for Operating Lesson 21; `isWorktreeBuild` is read by every scheduler entry point
above.

**Two starts at once.** The parent's two "two starts of two builds at once" scenarios (the menu twice;
Start agent and the menu) hold because of slice 2's build-start lock (`withBuildStartLock`,
`.ctoc/state/build-start.lock`), which wraps `claimBuild` and Start agent's walk, claim and plan move —
including Start agent's fresh-claim path through `addAndClaim` for a plan with no task. They do not rely
on the registry's compare-and-swap write: Rule 5 decides what the one start inside the lock may do, and
the lock makes the second start wait its turn (refused `build-start-busy` while the first holds it).
Slice 13 case 4 tests both.

## Acceptance Criteria

- [ ] A second main-checkout build is refused `one-build` while a main-checkout build is running or
  cancelling, through `canRun` and `nextRunnable`; non-build kinds keep the `MAX_CONCURRENT` ladder.
- [ ] A build recorded with its own worktree runs alongside a main-checkout build and alongside another
  worktree build, and `file-conflict` still refuses an overlapping build in any checkout (ONE-BUILD-8,
  -8b, -8c, -8e); a malformed worktree value in the registry counts as a main-checkout build (ONE-BUILD-8d);
  `menu task start <id> --worktree <path>` records the worktree only for a folder directly inside
  `.claude/worktrees/` reached with no link and spelled exactly as the folder listing holds it, refuses
  any other value unechoed (no quoted form of it in the text) with the registry and the warn log
  unchanged, refuses a worktree on a task that is not queued, and writes one `worktree_start` warn-log
  line per worktree claim (ONE-BUILD-8f, -9).
- [ ] One worktree folder holds one build: a worktree build is refused `one-build` while a running or
  cancelling build, or an unreleased age-only orphan, records the same worktree, also after the folder
  was deleted and made again (ONE-BUILD-9, -10, -10b).
- [ ] While a build orphaned on age alone is unreleased and under the presumed-dead age, `canRun` refuses
  a build `one-build` and `nextRunnable` offers none; once task-reconcile releases it (`confirmed-dead` or
  `presumed-dead`), both allow it (ONE-BUILD-5, -5c, -6, -6b); the orphan is not counted in the running
  set (ONE-BUILD-5b).
- [ ] With no reconcile pass run and the marker still `staleness`, the orphan holds the slot one
  millisecond under `DEFAULT_STALE_MS_BY_KIND.implement × DEFAULT_PRESUMED_DEAD_MULTIPLE` past its start
  and releases it at that age, through `canRun` and `nextRunnable`, with an injected clock and with the
  real one (ONE-BUILD-5d, -5e, -6c).
- [ ] A build the file quarantine holds keeps the projected build slot until the reservation is released,
  then it alone is promoted (ONE-BUILD-7).
- [ ] The projection gate declares `one-build` with seven defenders — Rule 5, its one-build-per-worktree
  half, its canRun clause, that clause's one-build-per-worktree half, the worktree form check, its
  nextRunnable clause and the clause's age bound — whose named cases go red when each is mutated (G1,
  G2, G3, G5), and its no-op control is green (G4).
- [ ] In the full-suite run at the end of Step 10, every case Step 8 wrote passes; every other failing test is
  listed by name in the build record, and one outside this slice's `files:` is requested through
  `src/lib/scope-growth.js`, never edited silently or adjusted.
- [ ] `npm test` passes.

## Risks

| Risk | Mitigation |
|---|---|
| Task t121 in main has been running with no agent id since 2026-10-01 and will hold the only build slot once this lands | Landed last of the build-path slices (parent, "Why the one-build rule lands last"); reported to the owner when it lands; the refusal names t121 and `menu task cancel t121 --force` (slice 13); what happens to t121 is his call. If a reconcile pass orphans it on age, the orphan clause does not hold the slot for it at all: its age is far past the 240-minute presumed-dead bound, which the clause itself applies (decision 9) |
| A build orphaned on age alone holds the build slot for up to 240 minutes from its start when no live list ever confirms its agent gone (the default `/ctoc:start` path passes none) | The CTO Chief's decision (decision 4): the shared checkout may still be under that agent's hands. The wait is bounded by the presumed-dead age on every route, because the scheduler applies it itself (decision 9), and is named in the refusal (slice 13) |
| The concurrent-edit belt (`staleOrphanReservedFiles`, `overlapsStaleOrphanReservation`, lines 880-916) reads the marker only and applies no age bound of its own (no time is read anywhere in task-registry.js's scheduler today: its one `Date.now` is the temp-file name, line 512), so on a route with no reconcile pass an age-only orphan's FILES stay reserved past 240 minutes while its BUILD SLOT is released | Not this slice's rule: the belt predates it and is a separate defect, listed for the owner to schedule. Effect here: a build overlapping such an orphan's files is refused `staleness-orphan-quarantine` (the belt runs before the clause), and slice 13 names no holder for it (`oneBuildRefusal` returns `null`: no holder, code not `one-build`), so no false promise is made on that path |
| 131 queued builds in main drain one by one in the main checkout | The owner's decision; since his revision of 2026-10-17 a build the session claims with its own worktree runs alongside (Operating Lesson 21, item 0) |
| A build claimed with `--worktree` whose agent in fact edits the main checkout runs beside the main build, so two builds edit one tree | Not checkable by the scheduler; the session briefs the agent with its worktree and branch (slice 14's text); file-conflict still holds the two apart on their declared files |
| Not traced in this revision: where a worktree build's completion runs its checks — `completeExecution` takes the menu's project root (`src/lib/actions.js` lines 1328-1329), so Step 14's evidence may be the main checkout's, not the worktree's | Outside this rule; listed for the owner to schedule with Operating Lesson 21's merge practice |
| A test outside the measured eleven breaks, including test files slices 2-10 create, which the measurement at v6.14.125 never ran | The full-suite run at the end of Step 10 runs the whole suite with the rule and lists every failure Step 8 did not write by name; a file outside `files:` goes through `src/lib/scope-growth.js` |
| A hand-edited registry value of the well-formed shape `.claude/worktrees/<name>` exempts a build from the main checkout's rule, whatever folder it names | Only a malformed value counts as a main-checkout build (decision 14); the route never writes such a value without `worktreeOf`'s checks, every route claim leaves a `worktree_start` warn-log line (decision 20), so a worktree build with no such line was hand-edited |

## Decisions Taken Under Ambiguity

1. **The reason code is `one-build`**, a plain word the task board shows as "waits: one-build"
   (`task-view.waitReason`), like the other ladder codes.
2. **Rule 5 comes after Rule 4**, as measured by the CTO Chief, so a build that also overlaps a running
   build's files still reports `file-conflict` and every existing refusal test keeps its reason. An
   overlapping second build is reported `file-conflict`; slice 13 names the holder on that path too.
3. **Six files**: the rule and the three test files whose expectations encode the retired rule must
   change in the same build, or the suite is red between them; `tests/scheduler-enforced.test.js` carries
   ONE-BUILD-7, and `src/lib/task-reconcile.js` one comment that would otherwise contradict the rule.
   (2026-10-18: eight files — `src/lib/menu-screens.js` and `src/lib/actions.js` carry the worktree
   record at the claim, item 1d; without them the rule's exemption would have no writer.)
4. **(The CTO Chief's decision, 2026-10-11, the gate critic's recommended option.) A build orphaned on age
   alone keeps the build slot until its agent is confirmed gone or presumed dead** — the same condition
   under which task-reconcile releases its file quarantine. Reason: the one-build rule exists because
   builds share the checkout; after the 120-minute staleness sweep an age-only orphan may still be
   editing, and canRun's concurrent-edit belt and the sync barrier's dependency check
   (`src/lib/task-registry.js` lines 871-875)
   already treat it as possibly alive. Mechanism: the running set `evaluateConcurrency` receives still
   excludes orphaned tasks (they hold no concurrency slot and no sync barrier); the clause lives where
   canRun already consults `overlapsStaleOrphanReservation`, and in `nextRunnable`; the reason code stays
   `one-build`.
5. **The orphan clause comes after the belt in `canRun`**, as Rule 5 comes after Rule 4: a build that
   also overlaps the orphan's files reports `staleness-orphan-quarantine`, so BELT-1 and BELT-1b keep
   their reason.
6. **The predicate is exported** so slice 13 names the orphan holder with the same test the scheduler
   applies — the one-predicate rule `staleOrphanReservedFiles` already follows for the quarantine.
7. **Two more mutation-gate defenders, though the gate does not require them**: G2 asks one entry per
   reason and the header says per-clause completeness is not enforced (lines 27-29), but a branch reusing
   `one-build` is invisible to the enumeration, so without its own entry nothing proves it defended.
8. **BELT-2 and BELT-5 change kind, not meaning**: both used a build only as a generic editing candidate;
   with a build, their outcome would hang on the orphan clause and the fixture's start time, which
   neither tests. ONE-BUILD-5 and -6 now carry the build case.
9. **(The CTO Chief's decision, 2026-10-11.) The scheduler applies the presumed-dead age itself.**
   `isUnreleasedStaleOrphanBuild` treats an age-only orphan as released once `now − ts.started` reaches
   `DEFAULT_STALE_MS_BY_KIND.implement × DEFAULT_PRESUMED_DEAD_MULTIPLE` (240 minutes today), exactly as if
   the reconcile pass had marked it `presumed-dead`; a `confirmed-dead` or `presumed-dead` marker still
   releases it earlier. Reason: the reconcile pass runs only when the dashboard is rendered
   (`src/lib/menu-screens.js` line 575, re-read on 2026-10-18; `src/tabs/tools.js` line 417), never on a `menu task …` command,
   so without this the slot could stay held past 240 minutes and slice 13's refusal ("at the latest once
   the build is 240 minutes past its start") would be false. Mechanism:
   - the bound is task-reconcile's exported constants, read through a lazy `require` inside the predicate
     (task-reconcile requires task-registry at load, line 84, and reads `taskRegistry.TERMINAL` at load,
     line 139, so a top-level require in task-registry would be a cycle that breaks one of them); no second
     literal;
   - an absent or unparseable `ts.started` releases at once, mirroring task-reconcile line 433, so the
     clause never holds a slot the next reconcile pass would release;
   - the scheduler never rewrites the marker: it stays `staleness` until a reconcile pass flips it, so the
     file belt and the sync barrier's confirm-liveness rule are unchanged by this decision;
   - the clock is injectable through a last optional `opts.now` on `canRun` and `nextRunnable`, in
     task-reconcile's style (line 250), default `Date.now()`; no existing caller passes it, and
     `reconcileState` passes its own (item 10) so one pass judges the age at one instant;
   - the predicate is never passed as an array callback: `some`/`find` would pass the element's index as
     the clock (index 0 is "1970", so the orphan would look never-aged and hold the slot forever) — the
     call sites wrap it, and its JSDoc says so.
10. **The belt is not given the age bound here.** The brief asked to match an age bound the belt already
    applies; it applies none (it reads only the marker, lines 880-900). Adding one would change a rule
    this slice does not own; the gap is a Risk row and listed for the owner to schedule.
11. **(2026-10-18, the owner's revision of 2026-10-17.) A new task field, `worktree`, records that a
    build runs in its own worktree.** No existing field says so: the loaded task keeps exactly the
    fields `normalizeLoadedTask` names (lines 338-358) and drops the rest; `label` is free display text,
    never validated, so reusing it would let any label exempt a build. The field holds the
    project-relative form `.claude/worktrees/<name>` with forward slashes, so the record reads the same
    on every platform.
12. **(2026-10-18.) It is recorded at the claim, `menu task start <id> --worktree <path>`, never at
    `menu task add` and never later.** Lesson 21 claims "the next ready plan", which usually already has
    a queued task (the continuation queues builds, and `taskAdd` refuses a second implement task for a
    plan, `src/lib/menu-screens.js` lines 2402-2416), so the claim is the one place every such build
    passes. A worktree on a task that is not queued is refused (`worktree-not-at-claim`): relabelling a
    running main-checkout build would free the main slot while its agent still edits the main checkout.
    Start agent and the continuation record none; they claim in the main checkout.
13. **(2026-10-18.) The path must name an existing folder directly inside `<root>/.claude/worktrees/`,
    reached with no link.** Name 1-128 characters of letters, digits, `.`, `_`, `-`, neither `.` nor
    `..`; the folder must exist now, and its real path must equal its spelled path, so neither the main
    checkout (directly or through a link or junction) nor a folder outside the project passes. Required
    to exist so a typo cannot exempt a build; it means the session makes the worktree and its branch
    before the claim, which lesson 21's "brief its agent with its own worktree and branch" already
    implies (slice 14 says so). Not checked: that the folder is a registered git worktree, or that the
    agent works there — the scheduler cannot see either. A refused value is never echoed.
14. **(2026-10-18, corrected after review the same day.) Only a malformed value counts as a
    main-checkout build; one predicate judges it.** `isWorktreeForm` re-judges the recorded value on
    every scheduler read, so a hand-edited MALFORMED value gains nothing; a hand-edited value of the
    well-formed shape `.claude/worktrees/<name>` is exempt like a claimed one, because the scheduler
    never re-checks the folder (a Risks row). The route refuses a bad argument before any write. A
    mutation-gate entry defends the form check (item 1's table), because dropping it exempts a build
    silently.
15. **(2026-10-18.) Rule 4 and every other rule are unchanged for a worktree build**, as the owner's
    brief says: file disjointness applies to every build, in any checkout (ONE-BUILD-8c). An orphaned
    worktree build does not hold the main checkout's slot (its agent edits its own worktree,
    ONE-BUILD-8e); the file belt still reserves its files.
16. **(2026-10-18.) `nextRunnable` and `promote[]` are unchanged in what they offer**: their candidates
    are queued tasks, which record no worktree, so a list offers at most one main-checkout build; a
    worktree build is the session's own claim with `--worktree`, on a promoted entry or any queued one.
17. **(2026-10-18, revised after review the same day by decision 21.) No hook change.**
    `src/hooks/protect-records.js` lists the fields `parseTaskArgs` can set (`TASK_FIELDS`, line 299,
    re-read on 2026-10-18) and does not gain `worktree`, and none is needed: by the CTO Chief's ruling
    (decision 21) `--worktree` is not an owner-only word — the existence check and the file-overlap
    rule hold whoever passes it. Its background-agent refusal is off by the owner's order of 2026-10-15
    (lines 597-602).
18. **(2026-10-18.) Facts that moved since 2026-10-11 are corrected where this plan states them**:
    `MAX_CONCURRENT` is 20 (the owner's order of 2026-10-15), so ONE-BUILD-3 and ONE-BUILD-5b read the
    count from `reg.MAX_CONCURRENT` instead of assuming five, and the `nextRunnable` comment keeps
    `≤MAX_CONCURRENT`; the background-agent refusal is off, so the Security Review no longer claims it;
    line numbers were re-read on today's main checkout (release 6.14.130) and the moved ones corrected.
19. **(2026-10-18, review finding.) One worktree folder holds one build.** Without it, two builds could
    claim the same folder — or one folder deleted and made again — and edit one tree, the very thing
    Rule 5 prevents in the main checkout. So Rule 5 also refuses `one-build` to a worktree build while
    a running or cancelling build records the same worktree (item 1, second block), and canRun's orphan
    clause refuses it while an unreleased age-only orphan records it (item 1b, second block; the
    predicate's optional third argument, item 1a). The comparison is exact string equality on the
    recorded form, which is sound because `worktreeOf` takes the folder name from the folder listing by
    exact match, as `claimBuildLocked` finds a plan (`src/lib/actions.js` line 1149, re-read on
    2026-10-18): on a case-insensitive macOS file system `W1` would otherwise reach `w1` and be recorded
    as a second string. Defended by ONE-BUILD-9, -10, -10b and two mutation-gate entries.
    `nextRunnable` needs no such clause: its candidates are queued and record no worktree.
20. **(2026-10-18, review finding.) A worktree claim writes one warn-log line, as `--force` does.**
    It passes the main checkout's rule, so it must never be silent: `worktree_start` with the task id and
    the recorded worktree, written next to `forced_start` in `claimBuildLocked` (line 1219) and in the
    registry-only start (line 2653), only after a successful claim (ONE-BUILD-9).
21. **(2026-10-18, the CTO Chief's ruling R1.) A background agent passing `--force` to a build start is
    refused by the decision-route refusal of slice 21**, because only the owner forces a build start.
    Until slice 21 ships, only the session's instructions stop it. `--worktree` needs no refusal: the
    existence check and the file-overlap rule hold. So this plan no longer treats `--worktree` like
    `--force` (Security Review, decision 17).
22. **(2026-10-18, review finding.) Step 9 only re-reads.** Rule 5 is code, so it is added in Step 10
    with the rest of the code, and the full-suite breakage run follows the code at the end of Step 10.

## Execution Plan

### Step 8: TEST
- [ ] Write the ONE-BUILD cases 1-6c, 8-8f, 10 and 10b in `tests/task-registry.test.js` (including -5d, -5e and -6c, the presumed-dead age with no reconcile pass, with the bound computed from task-reconcile's exported constants; -8 to -8f, the main-checkout scope; -10 and -10b, one build per worktree folder), the `staleOrphan` fixture's optional `worktree` and `started`, ONE-BUILD-7 and -9 in `tests/scheduler-enforced.test.js`, the three flipped expectations, the BELT-2 and BELT-5 kind changes, the gate's declaration and seven defenders, and the actions-scheduler case; run the five test files and record which fail on today's code (Test Plan).

### Step 9: PREPARE
- [ ] Re-read only, write nothing: every line this plan names in `src/lib/task-registry.js`, `src/lib/menu-screens.js`, `src/lib/actions.js` (line 1149's exact-listing match included) and `src/lib/task-reconcile.js`, and the test files' named cases, on the checkout as it is now; record each line that moved and its new number in the build record before Step 10 uses it.

### Step 10: IMPLEMENT
- [ ] `src/lib/task-registry.js`: the worktree record (item 0: `WORKTREES_DIR`, `WORKTREE_NAME_CHARS`, `isWorktreeForm`, `isWorktreeBuild`, `worktreeOf` with its exact-listing check, `worktree` kept by `normalizeLoadedTask` and in `MUTABLE_FIELDS`, the two exports), Rule 5 with its worktree exemption and its one-build-per-worktree half, the orphan clause (`isUnreleasedStaleOrphanBuild` with its worktree argument, its presumed-dead age bound and lazy constant read, and its export; the optional `opts.now` on `canRun` and `nextRunnable`; the canRun clause and its worktree half, the nextRunnable clause) and the seven comment changes.
- [ ] `src/lib/menu-screens.js`: `--worktree` in `parseTaskArgs`; in `taskTransition` the `worktreeOf` check and `worktree-unusable` refusal, the `worktree-not-at-claim` refusal, the registry-only start's candidate, record and `worktree_start` warn-log line, and `worktree` passed to `claimBuild` (item 1d).
- [ ] `src/lib/actions.js`: `claimBuild` and `claimBuildLocked` check the candidate with `opts.worktree`, record it in the claim's write and write the `worktree_start` warn-log line after a claim; their JSDoc (item 1d).
- [ ] `src/lib/task-reconcile.js`: the `applyQuarantine` comment paragraph (item 9) and `nextRunnable(reconciled, { now })` (item 10).
- [ ] The four test files as specified.
- [ ] After every item above, run `npm test` once. Every case Step 8 wrote must now pass; list every other failing test by name in the build record, including test files created by slices 2-10, which the measurement at v6.14.125 never ran. A failure in a file outside this slice's `files:` is requested through `src/lib/scope-growth.js`, never edited silently, and no assertion is changed to make it pass.

### Step 11: REVIEW
- [ ] The critic checks that every path that sets a build `running` goes through `canRun` (search `status: 'running'` over `src/`, each match read), that the orphan clause's predicate is the same marker test and the same age bound task-reconcile releases on (`src/lib/task-reconcile.js` lines 406-449, the constants read from its exports, never a literal), that no call site passes the predicate as an array callback, and that loading `task-reconcile` first and `task-registry` first both leave `taskRegistry.TERMINAL` and the constants defined (no load-time cycle).

### Step 12: OPTIMIZE
- [ ] One rule in the one ladder plus its orphan clause in the two scheduler entry points; no second check in a caller; the nextRunnable clause is computed once per call, not per candidate.

### Step 13: SECURE
- [ ] The security scanner confirms Rule 5 and its orphan clause cannot be bypassed except by the logged `--force` and by a worktree recorded through `worktreeOf` (traversal, the main checkout itself, a link or junction on the way, a missing folder, a second spelling of a folder, an over-long or non-string value, a malformed hand-edited registry value — ONE-BUILD-8d, -8f, -9), that one worktree folder never holds two builds (ONE-BUILD-10, -10b), and that the orphan clause cannot hold the slot forever on any route, a reconcile pass or none (the predicate's own presumed-dead age always elapses; ONE-BUILD-5d, -5e).

### Step 14: VERIFY
- [ ] Run `npm test`: lint, typecheck, all tests (the mutation gate included), coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.
- [ ] Run the reproduction above through the real menu command and quote it in the build record.

### Step 15: DOCUMENT
- [ ] The scheduler header and ladder comments state the rule, its orphan clause and the owner's and the CTO Chief's decisions as their reasons; `isUnreleasedStaleOrphanBuild` has its JSDoc; the `applyQuarantine` paragraph matches the code.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box is checked against its quoted evidence; report to the owner that t121 now holds the build slot in main once this is installed.
