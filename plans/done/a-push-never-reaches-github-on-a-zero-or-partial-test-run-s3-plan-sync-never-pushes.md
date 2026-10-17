---
iron_loop_verdict: true
iron_loop: true
title: "The plan sync commits plans but never pushes, and says so"
type: implementation
created: 2026-10-14
priority: high
effort: medium
parent_plan: a-push-never-reaches-github-on-a-zero-or-partial-test-run
depends_on: a-push-never-reaches-github-on-a-zero-or-partial-test-run-s1-whole-suite-check-in-the-push
files:
  - src/lib/sync.js
  - src/lib/settings.js
  - src/tabs/tools.js
  - src/commands/push.md
  - src/lib/menu-screens.js
  - README.md
  - tests/sync.test.js
  - tests/sync-coverage.test.js
  - tests/ship-gate-real.test.js
  - tests/tools-tab-coverage.test.js
revision: 1
rejection_reason: "Sent back: the approve route recorded this as the owner approval; it crosses again on recorded evide"
tag: rejected
---
# REVISION 1

## Rejection Feedback

Sent back: the approve route recorded this as the owner approval; it crosses again on recorded evidence.

---


# The plan sync commits plans but never pushes, and says so

Slice 3 of 3 of `plans/implementation/a-push-never-reaches-github-on-a-zero-or-partial-test-run.md`
(the parent; read it in full first, in particular "The plan sync pushes", facts 10-11 and
Decisions 15-16). It depends on slice 1 because its messages say that `/ctoc:push` runs the whole
test suite (true only after slice 1), and because both slices edit `src/commands/push.md` and
`README.md`.
`src/lib/sync.js` never requires the quality agent, so nothing in this slice calls slice 1's
code.

**The choice (Decision 1 below).** With automatic pushing on (`git.autoPushEnabled`), no function
in `src/lib/sync.js` pushes any more. Each one commits where it commits today, does not push, and
its result says nothing was pushed and that `/ctoc:push` ships; the Doctor's "Sync now" message
says the same. With automatic pushing off, nothing changes. The parent allows this choice when the
result says so plainly. It meets the frozen-menu constraint (no test suite ever runs inside the
menu process) and the checked-equals-pushed constraint (nothing is pushed, so nothing unchecked
is).

## Acceptance Criteria

Scenario numbers are the parent's; how each one reads under this slice's choice is stated.
Every sync test runs in a temporary fixture repository with a local bare repository as `origin`,
never this repository and never the default `projectPath`.

- [x] Scenarios 14 and 15 (under Decision 2): with automatic pushing on and a fixture whose test command fails (2 failing), each sync path — `fullPlansSync`, `syncPlans` directly and through `manualSync`, `onPlanOperation` with the `autoPush` it calls, and `autoPush` alone — commits as today (`autoPush` commits nothing), the bare remote's `main` does not move, the fixture's test command never runs (its counter file stays absent), and each result says nothing was pushed and that `/ctoc:push` ships (test S1). The zero-count and no-command fixtures of scenario 15 read the same way: the sync never reads the test command, so what it would have printed cannot change the result (Decision 2).
- [x] Scenario 16 (its own fallback wording): with automatic pushing on and a passing fixture (3 tests), each path does not push and its result says so and that `/ctoc:push` ships (test S1, same loop). The no-count fixture reads the same way, for the same reason.
- [x] With automatic pushing on and nothing new under `plans/`, `syncPlans` still answers "no changes" and adds that nothing was pushed and that `/ctoc:push` ships, so earlier plan commits that sit unpushed are not hidden behind "Sync: no changes"; the Doctor's "Sync now" message shows it (test D3). With automatic pushing off the message stays "Sync: no changes" (the existing case in `tests/tools-tab-coverage.test.js` line 213, unedited).
- [x] Scenario 17: with `syncPlans` on a branch other than `main` and an uncommitted change outside `plans/`, and with `fullPlansSync` on that branch, nothing is pushed (the bare remote has no new commit and no new branch) and the result says why (test S2).
- [x] Scenario 18 (guard): with automatic pushing off, the check never runs, nothing is pushed, the commits are as today, and the Doctor's "Sync now" message is "✓ Synced successfully" (tests S3 and D2; the existing gate-closed cases stay unedited).
- [x] Scenario 19 (under the choice): with automatic pushing on, `startAutoSync`'s immediate sync and one interval of its timer under mocked timers commit, push nothing, and never run the fixture's test command; the Doctor's "Sync now" message names the reason, points to `/ctoc:push`, and does not read "✓ Synced successfully" (tests S4 and D1).
- [x] With automatic pushing on, no function in `src/lib/sync.js` reaches `git push` — shown by the git spy in `tests/ship-gate-real.test.js` (zero push invocations on every sync path, opted in) and by the bare remotes above.
- [x] `src/commands/push.md`'s configuration section no longer says the sync timer and dashboard sync may push (test G5).
- [x] The Commands menu's "Sync plans" option (`dashboardCommands()` in `src/lib/menu-screens.js`) and the `README.md` row for it say the sync pulls and commits plan changes, never pushes, and that `/ctoc:push` ships; neither says "push plan changes" any more (test G5; CTO Chief, 2026-10-15, A1).

## Implementation Details

### Dependency graph

```
src/commands/start.js:963  --calls-->  sync.startAutoSync  --calls (now and on its timer)-->  sync.syncPlans
src/tabs/tools.js:431 (Doctor key 3)  --calls-->  sync.manualSync  --calls-->  sync.syncPlans
src/commands/start.md:67 (recipe claude:sync)  --session runs-->  sync.fullPlansSync
sync.onPlanOperation (no live caller)  --calls-->  sync.autoPush
src/tabs/tools.js  --reads-->  syncPlans' result: synced, pushRefused, reason, error
```

No new module, export or require. `sync.js` does not require the quality agent (and must not:
the check holds the process for minutes, parent fact 11).

### File: `src/lib/sync.js`

**Action:** MODIFY. **Purpose:** no sync path pushes; each says so.

- **New internal constant** (not exported), after `COMMIT_MESSAGES`:
  `const NOT_PUSHED_BY_SYNC = 'not pushed — the plan sync never pushes; /ctoc:push runs the whole test suite and pushes';`
  with a comment giving the reason: a push happens only after the whole declared suite has passed
  (the owner's order of 2026-10-14), and running that suite here would hold the menu for minutes.
- **`syncPlans`** (94-142): the opted-in path keeps its `git pull --rebase origin main` exactly as
  it is (out of the parent's scope; see Decision 3), removes `git push origin main` (line 134), and
  returns `{ synced: true, pushed: false, pushRefused: true, timestamp: lastSync, reason: NOT_PUSHED_BY_SYNC }`.
  The "no changes" branch (102-105): when `isAutoPushEnabled(projectPath)` is true it returns
  `{ synced: false, pushed: false, pushRefused: true, reason: \`no changes; ${NOT_PUSHED_BY_SYNC}\` }`
  (still stamping `lastSync`), so the Doctor's "Sync now" shows "Sync: no changes; not pushed —
  the plan sync never pushes; /ctoc:push runs the whole test suite and pushes" while earlier
  timer commits may sit unpushed; with the gate closed it returns `{ synced: false, reason: 'no changes' }`
  exactly as today (`tests/tools-tab-coverage.test.js` 213, `tests/sync.test.js` 105 and 242
  assert it). The gate-closed commit path and the error path are unchanged.
- **`autoPush`** (355-372): the gate-closed return is unchanged; the opted-in path runs no git
  command and returns `{ pushed: false, reason: NOT_PUSHED_BY_SYNC }`. Its comment says it never
  pushes and why.
- **`onPlanOperation`** (375-422): its final return gains `pushReason: pushResult.reason` (additive;
  `undefined` when offline or not committed). Nothing else changes.
- **`fullPlansSync`** (440-502): step 4 becomes
  `result.pushSkipped = config.auto_push ? NOT_PUSHED_BY_SYNC : 'auto-push disabled (ship gate) — push with /ctoc:push'; return result;`
  and the push `try` block (490-499) is removed. The pull and the commit are unchanged. Its doc
  comment's step 4 says it never pushes.
- **Header comment** (lines 1-11): "Offline mode support (queues commits for later push)" becomes
  "Commits plan changes locally; never pushes — `/ctoc:push` runs the whole test suite and pushes".
- **Stale comments that name a sync push** (comment text only):
  - lines 16-19 (above the `require('./settings')`): `isAutoPushEnabled` is no longer "the ONE
    key every push path in this file consults"; it now decides only whether the opted-in pull
    runs and which "not pushed" wording a result carries. No function in this file pushes.
  - line 30 (`auto_push: false, // SHIP GATE: never push unless the human opted in`): the comment
    says the key mirrors `git.autoPushEnabled` and that the sync never pushes either way.
  - lines 113-116 (`syncPlans`' "SHIP GATE (R3-C)" block): the rebase still happens only on the
    opted-in path; the push no longer happens on any path.
  - line 127 ("Pull first to avoid conflicts (only on the opted-in path)"): there is no push
    after it any more; the comment says the pull is kept as it was (Decision 3).
  - lines 353-354 (`autoPush`'s comment): it never pushes; with the opt-in it says so.
  - line 404 ("If online and committed, push"): `autoPush` is asked, and it never pushes.
  - line 425 ("Full plans sync: pull, commit, push") becomes "Full plans sync: pull and commit;
    never pushes", and step 4 of the same doc comment (432-435) says it never pushes.
- Error handling: unchanged; the removed push removes the only `Push:` error and the only push
  failure path.

### File: `src/lib/settings.js`

**Action:** MODIFY comments only — no logic, no key, no default changes. Two comments list the
plan sync among the push paths the opt-in gates, which this slice makes false:

- lines 83-88 (above the `autoPushEnabled` schema entry): "the ONE canonical key that gates EVERY
  machine push path in CTOC: the quality agent's on-success push, the post-commit hook's argv, the
  sync timer, the plan-operation auto-push and the dashboard's full pipeline sync" becomes "the ONE
  canonical key that gates every machine push in CTOC: the quality agent's on-success push and
  the post-commit hook's argv. The plan sync (its timer, the plan-operation hook and the
  dashboard's full pipeline sync) never pushes; with this key on it only says so."
- lines 290-294 (`isAutoPushEnabled`'s JSDoc): the same correction to its list of push paths.

`isAutoPushEnabled` and the schema are byte-for-byte unchanged apart from these comment lines.

### File: `src/tabs/tools.js`

**Action:** MODIFY line 432 only.

```js
app.message = !result.synced
  ? `Sync: ${result.reason || result.error}`
  : result.pushRefused ? `Sync: plans committed, ${result.reason}` : '✓ Synced successfully';
```

With automatic pushing on and plans committed it reads "Sync: plans committed, not pushed — the
plan sync never pushes; /ctoc:push runs the whole test suite and pushes". With automatic pushing
off the message is today's (scenario 18; the `{ synced: true }` double in
`tests/tab-modules.test.js` 840 still gives "✓ Synced successfully", so that file is not edited).

### File: `src/commands/push.md`

**Action:** MODIFY the `git.autoPushEnabled: true` bullet in "## Configuration" (lines 187-188),
which this slice makes false:
"- **`git.autoPushEnabled: true`** — you have opted in; the after-commit check (when its git hook
is installed) may push once its checks pass. The plan sync (its timer, the Doctor's Sync now and
the dashboard sync) commits plan state but never pushes; it says so and points to `/ctoc:push`."
Nothing else in the file changes. Every new line names the command `/ctoc:push`, never a
lowercase `ctoc` followed by a space and a word.

### File: `src/lib/menu-screens.js`

**Action:** MODIFY one string (A1). In `dashboardCommands()` (line ~1636), the "Sync plans"
option's description `'Pull, commit, and push plan changes'` becomes
`'Pull and commit plan changes; never pushes — /ctoc:push ships'`. The LABEL `Sync plans` and its
route `'Sync plans': 'claude:sync'` (line ~1643) do not change: the label is the key of the
`actions` map. The route runs `fullPlansSync`, which pulls with rebase (`src/lib/sync.js` 452),
commits `plans/`, and after this slice never pushes.

### File: `README.md`

**Action:** MODIFY one table row (A1), line 383:
`| **Sync plans** | Pull, commit, and push plan changes |` becomes
``| **Sync plans** | Pull and commit plan changes; never pushes — `/ctoc:push` ships |``. Slice 1
edits line 889 of the same file; this slice depends on slice 1, so the two edits are ordered.
Nothing else in `README.md` changes; no count in it moves.

### Test plan (Step 8, written first, run, seen red)

**Fixture rules.** Real git under `os.tmpdir()`, argv form (`execFileSync('git', [...])`) for every
new helper; a local bare repository as `origin`; `projectPath` always passed explicitly; every
directory removed in `finally` and swept in `after`. An opted-in fixture is
`makeRepo({ remote: true })` plus `.ctoc/settings.json` `{ "git": { "autoPushEnabled": true } }`
plus, per suite kind, a committed `package.json` whose `scripts.test` is `node suite.js` and a
`suite.js` that first appends a line to a counter file OUTSIDE the repository and then prints:
`failing` — `ℹ tests 2 / ℹ pass 0 / ℹ fail 2`, exit 1; `passing` — `ℹ tests 3 / ℹ pass 3 / ℹ fail 0`.
Only these two kinds are built: the sync never reads the test command, so a zero-count, no-count
or missing command cannot change what it does, and the counter file is the runtime proof that
nothing ran (Decision 2). The fixture files are committed and pushed, so the bare remote's `main`
is the recorded baseline before each path runs. No spy on the quality agent is used:
`src/lib/sync.js` never requires it, so a spy there would record zero calls whatever the sync did.

#### `tests/sync-coverage.test.js` — new describe "with automatic pushing on, the plan sync never pushes"

- **S1 (scenarios 14, 15, 16; red today).** For each suite kind (`failing`, `passing`) and each
  path, a fresh opted-in fixture with a pending plan change (10 fixtures):
  `syncPlans(dir)`, `manualSync(dir)`, `onPlanOperation('create', 'p.md', dir)`, `autoPush(dir)`
  (with the pending change committed by hand first, so there is something it could push),
  `fullPlansSync(dir)`. Assert for each: the bare remote's `main` equals the baseline; the counter
  file does not exist; and the result says why —
  `syncPlans`/`manualSync`: `synced` true, `pushed` false, `pushRefused` true, `reason` matches
  `/never pushes/` and `/\/ctoc:push/`, and the newest local commit is "chore: auto-sync plans …";
  `onPlanOperation`: `committed` true, `pushed` false, `pushReason` matches both; `autoPush`:
  `pushed` false, `reason` matches both, no new local commit; `fullPlansSync`: `committed` true,
  `pushed` false, `pushSkipped` matches both, no `Push:` entry in `errors`. Red today: every path
  pushes (the remote advances).
- **S2 (scenario 17; red today).** Opted-in `passing` fixture; then, on `main`, one more commit
  (a change to `README.md`) that is NOT pushed, so local `main` is ahead of the bare remote's
  `main` and today's `git push origin main` would move it; then `git checkout -b feature`; a
  tracked file outside `plans/` modified and left uncommitted; a pending plan change.
  `syncPlans(dir)`: remote `main` equals the baseline, `pushRefused` true with the reason. Then `fullPlansSync(dir)`
  on the same tree: remote `main` equals the baseline, the remote has no `feature` branch
  (`git -C <bare> rev-parse --verify feature` fails), `pushSkipped` has the reason. Red today:
  `syncPlans` pushes local `main`, so the unpushed commit reaches the remote (the
  `git pull --rebase` before it acts on the checked-out `feature`, not on local `main`, and a
  failure of it is ignored), and `fullPlansSync` pushes `feature`.
- **S3 (scenario 18; guard).** The same two suite kinds with automatic pushing off (no
  `autoPushEnabled` key) through `syncPlans`, `onPlanOperation` and `fullPlansSync`: commits as
  today, remote unchanged, counter absent, and `syncPlans`' result has no `pushRefused` and keeps
  today's reason.
- **S4 (scenario 19; red today).** `t.mock.timers.enable({ apis: ['setInterval'] })`; opted-in
  `passing` fixture with a pending plan change; `sync.startAutoSync(dir)` (its immediate sync):
  a new "auto-sync plans" commit, remote `main` equals the baseline, counter absent. Another plan
  change; `t.mock.timers.tick(5 * 60 * 1000)`: a second "auto-sync plans" commit, remote still at
  the baseline, counter absent. `sync.stopAutoSync()` in `finally`. Red today: the immediate sync
  pushes.

#### `tests/sync-coverage.test.js` — existing cases whose contract this replaces

Written reason for each: the coordinator's decision of 2026-10-14 (parent, Decision 15) that no
sync push happens without the whole-suite check, met here by the sync never pushing (Decision 1).
Each change makes the case stricter toward that behaviour.

- 294-310 `should_push_to_the_remote_when_the_ship_gate_is_open` → `should_not_push_and_say_why_when_the_ship_gate_is_open`:
  `pushed` false, `reason` matches `/never pushes/`, the bare remote's `main` still equals its
  value before the call (recorded first), local HEAD is ahead of it.
- 312-325 `should_report_an_error_when_the_push_fails` → `should_attempt_no_push_even_when_the_remote_is_unreachable`:
  `pushed` false, `error` undefined (no push is attempted, so there is no push error), `reason`
  matches `/never pushes/`.
- 344-361 `should_commit_and_push_on_the_online_opted_in_path` → `should_commit_but_not_push_on_the_online_opted_in_path`:
  `checked`, `offline` false and `committed` as before; `pushed` false; `pushReason` matches
  `/never pushes/`; the bare remote's `main` is not the local HEAD.
- 449-464 `should_push_when_the_ship_gate_is_open` → `should_not_push_and_say_why_when_the_ship_gate_is_open`:
  `pushed` false, `pushSkipped` matches `/never pushes/`, the bare remote's `main` is not the local
  commit.
- 466-480 `should_record_a_push_error_when_the_remote_is_unreachable` → `should_attempt_no_push_when_the_remote_is_unreachable`:
  `pushed` false, no entry of `errors` starts with `Push:`, `pushSkipped` matches `/never pushes/`.
- The file header (lines 4-12) says the sync never pushes; "ship-gated push" becomes "the refused
  push".

#### `tests/sync.test.js` — one existing case whose contract this replaces

Same written reason.

- 155-186 `syncPlans pushes ONLY when the human opened the ship gate` → `syncPlans commits but never pushes, even when the human opened the ship gate`:
  `synced` true, `pushed` false, `pushRefused` true, `reason` matches `/never pushes/` and
  `/\/ctoc:push/`; the recorded commands include `git commit` and no `git push`. The pull case at
  469-508 is unchanged (the pull is not moved, Decision 3).

#### `tests/ship-gate-real.test.js` — the push fence over every sync path

Same written reason for the two changed cases.

- 276-292 `sync auto_push defaults to FALSE and follows the canonical key`: the two `getSyncConfig`
  asserts stay; the opted-in part becomes `spy.mod.autoPush(on).pushed === false`,
  `spy.pushes().length === 0`, and its `reason` matches `/never pushes/`.
- 313-321 `fullPlansSync pushes when the human opted in` → `fullPlansSync never pushes, even when the human opted in`:
  `res.pushed` false, `spy.pushes()` empty, `res.pushSkipped` matches `/never pushes/`.
- New G1-G3 (each red today): with `{ git: { autoPushEnabled: true } }` and the `dirtyGit`
  spy, `syncPlans(on)` (G1, also `pushRefused` true), `startAutoSync(on)` then `stopAutoSync()`
  (G2), and `onPlanOperation('approve', 'some-plan', on, { from: 'todo', to: 'in-progress' })` (G3)
  each make zero push invocations. G3 is red today because a fresh `mkProject` has no
  `.ctoc/last-sync`, so `isRateLimited` is false; the spied `git fetch` returns without throwing,
  so `checkRemoteChanges` reports online; `dirtyGit`'s `git status` shows a plan change, so
  `autoCommitPlan` commits; and `onPlanOperation` then calls `autoPush`, which runs
  `git push origin main` with the opt-in set.
- New G5 (red today): `src/commands/push.md` read, whitespace runs collapsed to one space: it does
  not match `/sync timer, dashboard sync\) may push/` and does match
  `/The plan sync \(its timer, the Doctor's Sync now and the dashboard sync\) commits plan state but never pushes/`.
  And (A1) `require('../src/lib/menu-screens').dashboardCommands(dir)` on a fresh `mkProject()`
  that also has the `plans/` stage folders `tests/menu-screens.test.js` 23-33 creates (vision,
  functional, implementation, todo, in-progress, review, done): the option labelled `Sync plans` in `ask.questions[0].options` has the description
  `Pull and commit plan changes; never pushes — /ctoc:push ships` (strict equality), and
  `README.md`'s line starting `| **Sync plans** |` contains `never pushes` and `/ctoc:push` and
  not `push plan changes`. Red today: the description is "Pull, commit, and push plan changes".
- The header (lines 1-18) says that with the opt-in set the only machine push left is the
  after-commit check; the sync never pushes.

#### `tests/tools-tab-coverage.test.js` — the Doctor's "Sync now" key through the real tab

**Fixture for D1-D3.** A real git repository under `os.tmpdir()` with repo-level identity and
signing set before any commit — `git config user.name t`, `git config user.email a@b.c`,
`git config commit.gpgsign false` — because `syncPlans` runs its own `git commit` with no `-c`
flags, and the existing tools-tab fixture (lines 171 and 206) passes the identity only through
`-c` on its own commit, which would leave `syncPlans`' commit failing on a machine with no global
git identity. Then `plans/.keep` committed, `git branch -M main`, a bare repository as `origin`,
and `git push -q origin main`, so the bare remote's `main` is the recorded baseline.

- **D1 (scenario 19; red today).** The fixture opted in (`.ctoc/settings.json`
  `{ "git": { "autoPushEnabled": true } }` written after the baseline push and left uncommitted;
  it is outside `plans/`, so the sync never stages it) with a pending plan change; `freshTools()`;
  `tools.handleKey(key('sync', '3'), app)` with `toolMode: '1'`:
  `app.message` starts with `Sync: plans committed, not pushed`, matches `/\/ctoc:push/`, is not
  `✓ Synced successfully`; the bare remote's `main` did not move. Red today: the message is
  "✓ Synced successfully" and the remote advances.
- **D2 (scenario 18; guard).** The same without the opt-in: `app.message === '✓ Synced successfully'`
  and the bare remote's `main` did not move.
- **D3 (finding: "no changes" hides unpushed commits; red today).** The fixture opted in, then one
  plan commit made by hand and NOT pushed, and nothing pending under `plans/`;
  `tools.handleKey(key('sync', '3'), app)`: `app.message` starts with
  `Sync: no changes; not pushed`, matches `/\/ctoc:push/`, and is not `Sync: no changes`; the
  bare remote's `main` did not move. Red today: the message is exactly "Sync: no changes". The
  gate-closed side is the existing case at line 213, unedited.

### Security review

- [x] Attack surface shrinks: three `git push` invocations are removed; nothing is added.
- [x] No new process start, path, require or export; the message text is a constant.
- [x] The unattended `git pull --rebase` stays as it was (parent, Out of Scope); it is not widened.
- [x] Tests never push to a network: `origin` is a local bare repository or the git spy.
- [x] No secret in code or fixtures; fixtures live under `os.tmpdir()`.

## Wiring — the live call sites

- `syncPlans` ← `startAutoSync` (its immediate call and its interval) ← `src/commands/start.js`
  line 963, run when `/ctoc:start` opens the menu in a terminal; and ← `manualSync` ←
  `src/tabs/tools.js` line 431, the Doctor's "Sync now" key in that menu. The message the human
  sees is `src/tabs/tools.js` line 432, changed in this slice.
- `fullPlansSync` ← the recipe `claude:sync` in `src/commands/start.md` line 67 ("Run
  fullPlansSync(), show result"), which the session runs; the session shows `pushSkipped`. It runs
  no test suite, so the recipe needs no time-limit note and is not edited.
- The "Sync plans" description the human reads ← `dashboardCommands()` in
  `src/lib/menu-screens.js` ← `route(['menu', 'commands'])` (line ~2800), the screen behind the
  pipeline's `More ▶` option (`menu commands`) in `/ctoc:start`; choosing it routes to
  `claude:sync`, the recipe above.
- `autoPush` ← `onPlanOperation` only (line 407), and `onPlanOperation` has no live caller. How
  this was confirmed:
  1. `.ctoc/export-reachability-baseline.json` line 60 lists `src/lib/sync.js#onPlanOperation` as
     an export of a live file with no live caller.
  2. The export fence's rules (`src/lib/reachability.js` 522-551, 818-829) credit `autoPush` only
     by its same-file rule (a definition plus one call, the call being inside `onPlanOperation`);
     the fence's own stated limit (548-551) is that this credit does not prove the caller is
     reachable. So `autoPush` is unreachable at runtime too.
  3. A search for `onPlanOperation|autoPush\b` over the whole repository except `plans/` matched 8
     files: `src/lib/sync.js` (the only source file that calls either), four test files,
     `.ctoc/export-reachability-baseline.json`, `.ctoc/quality-config.yaml` (an unrelated `autoPush:`
     key, line 138) and `src/commands/push.md` (prose naming a `push.autoPush` key, line 191). The
     matches were read; none outside `sync.js` and the tests is a call.
  Step 9 re-confirms by running `tests/export-reachability.test.js` and `tests/reachability.test.js`.
  Both functions are kept and made to refuse (Decision 4), so no exported function in `sync.js` can
  push, reachable or not.

## Decisions Taken Under Ambiguity

1. **The sync never pushes** (the CTO Chief's recommendation; no reading found a reason against
   it). Frozen menu: no suite runs in the menu process, so the menu never stalls and nothing prints
   over it. Checked equals pushed: nothing is pushed, so nothing untested is. Not chosen: running the
   check inside the sync (freezes the menu about 2.5 minutes at menu open, on each timer firing and
   on the Doctor key, and prints over the screen); starting a detached background check-and-push
   (new process machinery, an outcome neither the timer nor the Doctor could show, and it would
   still test the working tree while pushing `main` or `config.branch`, scenario 17's gap). Cost:
   with automatic pushing on, plan commits stay local until `/ctoc:push` or the after-commit check
   ships them.
2. **Scenarios 14 and 15 take the same fallback as 16 and 19.** They ask the result to say
   "because the tests failed" with a count; no test runs in the sync, so the honest result says the
   sync never pushes and that `/ctoc:push` ships, and the tests show the fixture's test command
   never ran (the counter file stays absent). `src/lib/sync.js` never requires the quality agent,
   so the shared check cannot be called from it; a spy on it would prove nothing and is not used.
   Because the sync never reads the test command, only two suite kinds are built (`failing` and
   `passing`); a zero-count, no-count or missing command would read exactly the same.
3. **The `git pull --rebase` in `syncPlans` (opted-in path) and in `fullPlansSync` stays as it
   is.** The parent puts it out of scope as the owner's finding; `tests/sync.test.js` 469-508 stays
   unedited.
4. **`autoPush` and `onPlanOperation` are kept, and `autoPush` refuses.** Deleting them would
   reach three test files and the export fence's baseline, which this slice does not touch; it is
   listed as a finding instead.
5. **The Doctor message keys on `pushRefused: true`**, a flag on `syncPlans`' result set only on
   the opted-in path, never on the reason text; with automatic pushing off the message stays
   "✓ Synced successfully".
6. **The timer's result stays discarded, as today** (`src/lib/sync.js` 77-82). With automatic
   pushing on, the refusal is in `syncPlans`' result for every caller and on the Doctor's "Sync now"
   key, which shows the same reason. Not chosen: a banner from the timer into the menu, which needs
   new plumbing from `start.js` into the render loop.
7. **The result never mentions the after-commit hook**: `sync.js` cannot know whether it is
   installed; it says only that nothing was pushed and that `/ctoc:push` ships.
8. **`push.md`'s configuration bullet is corrected here**: this slice makes "the machine push paths
   (post-commit hook, sync timer, dashboard sync) may push" false; the corrected bullet is pinned by
   G5 and words the after-commit check so it holds whether or not slice 2 has landed.
9. **`onPlanOperation`'s result gains `pushReason`** (additive), so its caller-facing result says
   why nothing was pushed.
10. **"No changes" with automatic pushing on also says nothing was pushed.** Earlier timer commits
    can sit unpushed while `plans/` is clean; "Sync: no changes" alone would let the person
    believe the plans reached GitHub. The reason is appended to the existing text
    ("no changes; not pushed — …"), so the result keeps `synced: false` and the Doctor shows it
    through its existing `reason` branch; the gate-closed text stays "no changes", which three
    existing tests assert on `syncPlans`' result: `tests/tools-tab-coverage.test.js` 213 and
    `tests/sync.test.js` 105 and 242 (read: none sets the opt-in; `tests/sync.test.js` fakes only
    `getSetting`, and `isAutoPushEnabled` reads a settings file that does not exist there). The
    other two matches for "no changes" in `tests/` are not `syncPlans`: `tests/sync-injection.test.js`
    126 is `autoCommitPlan`, and `tests/release.test.js` 553 is a comment on the version sync.
11. **`src/lib/settings.js` comments are corrected in this slice**, comment text only: they list
    the sync timer, the plan-operation push and the dashboard sync as push paths the opt-in
    gates, which this slice makes false. No logic, key or default changes there.
12. Critic round 1 (2026-10-15): findings 4, 9, 10, 11, 12, 13 applied.
13. CTO Chief, 2026-10-15 (A1): the Commands menu's "Sync plans" description and the `README.md` row say the sync pulls and commits plan changes, never pushes, and that `/ctoc:push` ships; `src/lib/menu-screens.js` and `README.md` join this slice's files; pinned in G5 through `dashboardCommands()`.
14. CTO Chief, 2026-10-15 (B12): the owner finding on the kept `git pull --rebase` now says it precedes no push, so scheduling it means deleting it.
15. CTO Chief, 2026-10-15 (B14): Step 11's reviewer runs the false-green test checks on the test files this slice changes.
16. CTO Chief, 2026-10-16 (Step 11/13 synthesis), change 3 (argv form): the "with automatic pushing on" section of `tests/sync-coverage.test.js` runs every git call through a new `gitArgv` (`execFileSync`, separate argv entries), so no commit subject or path is parsed by a shell; the gate-closed S3 assertions are now strict equality on the three exact reasons (they were regex matches on `/auto-push disabled/`); the false test comments in `sync-coverage.test.js`, `sync.test.js` and `ship-gate-real.test.js` now say what the code does (the sync never pushes; a failed pull is reported with a fixed phrase).
17. CTO Chief, 2026-10-16 (Step 11/13 synthesis), change 1: `syncPlans` reports a failed opted-in pull instead of swallowing it: `reason` starts `pull --rebase failed (run git status); ` followed by the usual never-pushes text. The phrase is fixed, never git's own text (it can carry a remote URL with credentials); a test proves the mocked error text never reaches the reason. This removes the empty catch baselined as `src/lib/sync.js:silent-catch:syncPlans`.
18. CTO Chief, 2026-10-16 (Step 11/13 synthesis), change 2: the false source comments in `src/lib/sync.js` (above `NOT_PUSHED_BY_SYNC`, `autoPush`, `fullPlansSync` step 4 and its inline comment) are rewritten to say the sync never runs the suite and never pushes. The settings.js wording this slice prescribed (that the opt-in "gates" the sync's pull and "only says so") was false about what the key does for the sync and is corrected: the key only decides whether `syncPlans` runs `git pull --rebase` and which "not pushed" wording a result carries. Comment lines only; the diff has no code line.
19. CTO Chief, 2026-10-16: **Process slips in this build** (listed as stated): one test edit (the fake credential-looking URL in the mocked pull-failure error of the test file) was made with `sed -i` instead of the Edit tool; the content equals what an Edit would have produced. The baseline edit in Phase D was made with the Edit tool under the owner's recorded scope growth (inbox 1792163429592-fousz1).

## Findings for the owner to schedule (not built here)

- `onPlanOperation` and `autoPush` have no live caller; deleting both (and their tests and the
  baseline entry) is an option.
- `syncPlans` (opted-in path, `src/lib/sync.js` 129) and `fullPlansSync` (452) still run
  `git pull --rebase` unattended. After this slice it precedes no push, so it serves nothing the
  sync does; scheduling it means deleting it (already in the parent's Out of Scope).

## Execution Plan

### Step 8: TEST
- [x] Write S1-S4 and the five changed cases in `tests/sync-coverage.test.js`, the changed case in `tests/sync.test.js`, the two changed cases and G1-G3, G5 in `tests/ship-gate-real.test.js`, and D1-D3 in `tests/tools-tab-coverage.test.js` (their fixture with repo-level `user.name`, `user.email` and `commit.gpgsign false`), following the fixture rules.
- [x] Run `node --test tests/sync.test.js tests/sync-coverage.test.js tests/ship-gate-real.test.js tests/tools-tab-coverage.test.js tests/tab-modules.test.js`; record each new or changed case red for the stated reason and S3, D2 green (guards). G3's reason is recorded as stated under its test: on today's code `onPlanOperation` with the opt-in and `dirtyGit` is not rate-limited on a fresh project, commits, and reaches `autoPush`'s `git push origin main`. S2's reason: today's `syncPlans` pushes the unpushed commit on local `main`. D3's reason: today's message is exactly "Sync: no changes".

### Step 9: PREPARE
- [x] Confirm slice 1 is built (`runWholeSuiteBeforePush` exported; `src/commands/push.md` carries slice 1's edits).
- [x] Re-read `src/lib/sync.js`, `src/tabs/tools.js` 425-435, `src/commands/start.js` 955-970, `src/commands/start.md` line 67, `src/lib/menu-screens.js` 1615-1645 and `README.md` 376-385; confirm the line anchors above.
- [x] Run `node --test tests/export-reachability.test.js tests/reachability.test.js`; record the dead-export count and confirm `src/lib/sync.js#onPlanOperation` is still listed and `autoPush` is not.

### Step 10: IMPLEMENT
- [x] `src/lib/sync.js`: the constant, `syncPlans` (the opted-in commit path and the opted-in "no changes" branch at 102-105), `autoPush`, `onPlanOperation`'s `pushReason`, `fullPlansSync`, the header and doc comments, and the stale comments at lines 16-19, 30, 113-116, 127, 353-354, 404 and 425 (432-435).
- [x] `src/lib/settings.js`: the comments at lines 83-88 and 290-294 only; no logic change.
- [x] `src/tabs/tools.js`: line 432.
- [x] `src/commands/push.md`: the `git.autoPushEnabled: true` bullet.
- [x] `src/lib/menu-screens.js`: the "Sync plans" description (line ~1636) only.
- [x] `README.md`: the "Sync plans" row (line 383) only.
- [x] Run the Step 8 files green.

### Step 11: REVIEW
- [x] Dispatch `iron-loop-critic`: no `git push` left anywhere in `src/lib/sync.js` (a presence check for the literal `'push'` argument); every sync result with automatic pushing on says nothing was pushed and names `/ctoc:push`, the "no changes" result included; with automatic pushing off every result, commit and message is today's; the pull is untouched; no comment in `src/lib/sync.js` or `src/lib/settings.js` still names a sync push; the `src/lib/settings.js` diff is comment lines only; `push.md`'s bullet, the Commands menu's "Sync plans" description and the `README.md` row match the code, and the menu label and route are unchanged.
- [x] The reviewer runs the false-green test checks (an assertion that cannot fail, a mocked-away core, an early return without an assertion, a swallowed error, a skipped case) on the four test files this slice changes (B14).

### Step 12: OPTIMIZE
- [x] No git command runs on a path that no longer pushes (`autoPush` opted in runs none); no new state.

### Step 13: SECURE
- [x] Dispatch `security-scanner` on the diff: removed push paths only; no new process, path or export; tests touch only temporary repositories and local bare remotes.

### Step 14: VERIFY
- [x] `npm test` in the foreground with a 10-minute limit: `# fail 0`, 0 skipped, 0 flaky, coverage at or above `.ctoc/coverage-baseline.json` `minPct` (unchanged). (Two runs, both `[CTOC test-gate] PASS`; see "Phase D".)
- [x] Lint clean with zero warnings; `npm run typecheck` reports zero type errors (`.ctoc/typecheck-baseline.json` `maxErrors` stays 0). (Phase D: both exit 0.)
- [x] `tests/export-reachability.test.js` and `tests/reachability.test.js` green with counts not above Step 9; `tests/no-phantom-command-family.test.js` green; `tests/tab-modules.test.js`, `tests/menu-screens.test.js`, `tests/menu-screens-coverage.test.js` and `tests/menu-protocol.test.js` green unedited.

### Step 15: DOCUMENT
- [x] Comments in `src/lib/sync.js` (header, the settings import, `DEFAULT_SYNC_CONFIG.auto_push`, `syncPlans`, `autoPush`, `onPlanOperation`, `fullPlansSync`) and in `src/lib/settings.js` (the `autoPushEnabled` schema entry and `isAutoPushEnabled`) say the sync never pushes and why; `push.md`'s bullet, the "Sync plans" menu description and its `README.md` row say the same.

### Step 16: FINAL-REVIEW
- [x] (Recorded evidence: Phase C, tests D1 and D2 drive the real Doctor tab against real git with a local bare `origin`.) Drive the real Doctor "Sync now" key once on a temporary opted-in repository with a bare `origin`, and once with automatic pushing off; record both messages and the remote's `main` before and after in this plan.
- [x] (The iron-loop-critic final review ran on 2026-10-16; its findings are addressed in Phase C or listed for the owner.) Dispatch `iron-loop-critic` against the Acceptance Criteria above; every box ticked only on recorded evidence.


---

## Execution Plan (Steps 8-16)

### Step 8: TEST (TDD Red)
- [x] Write tests for the implementation
- [x] Test error conditions
- [x] Run tests - expect RED (failing)

### Step 9: PREPARE
- [x] Install dependencies if needed (none declared; nothing installed)
- [x] Check prerequisites
- [x] Verify dev environment ready
- [x] Create directories/config if needed (none)

### Step 10: IMPLEMENT
- [x] Implement the feature according to requirements
- [x] Add error handling
- [x] Wire up integration points

### Step 11: REVIEW
- [x] Self-review all new code
- [x] Verify integration points work together
- [x] Check error handling completeness

### Step 12: OPTIMIZE
- [x] Remove redundant operations
- [x] Optimize critical paths
- [x] Simplify complex code

### Step 13: SECURE
- [x] Validate inputs (no path traversal)
- [x] Sanitize outputs
- [x] No secrets in code
- [x] Safe file operations

### Step 14: VERIFY
- [x] Run lint + type check
- [x] Run ALL tests (TDD Green)
- [x] Check coverage >= 80% (99.87%, floor 99%)
- [x] 0 skipped, 0 flaky tests

### Step 15: DOCUMENT
- [x] Update relevant documentation
- [x] Add JSDoc comments to new functions
- [x] Update CHANGELOG if needed (not needed: this plan declares no file for it; the release step owns it)

### Step 16: FINAL-REVIEW
- [x] Verify steps 8-15 completed correctly
- [x] All quality checks passed
- [x] Manual verification if needed (Phase C: the Doctor key is driven by tests D1 and D2 against real git; repeatable by hand)
- [x] Ready for human review


## Execution Record

### Phase A (Steps 8, 9, 10, 12), executor run for menu task t6

**Step 8 red evidence** (`node --test` on the five files, before any source edit): 203 tests, 177 pass, 26 fail. Red for the stated reason (every opted-in path pushed, so `pushed true !== false`, or the new field/message was absent): S1 x10 (five paths x `failing`/`passing`), S2 (`pushRefused` undefined: today's `syncPlans` pushed local `main`), S4 (remote `main` moved on the immediate sync), the five changed `sync-coverage` cases, the changed `sync.test.js` case, the two changed `ship-gate-real` cases, G1 (`pushRefused` undefined), G2 (`git push origin main` recorded), G3 (`pushed` true: it reached `autoPush`'s push), G5 (`push.md` still said "sync timer, dashboard sync) may push"), D1 (message was "✓ Synced successfully"), D3 (message was exactly "Sync: no changes"). Green guards, as planned: S3 (x2) and D2.

**Step 9.** Slice 1 is built (`runWholeSuiteBeforePush` in `src/lib/quality-agent.js`; `push.md` carries its edits). Anchors confirmed: `start.js` 963 `startAutoSync`, `start.md` 67 `claude:sync`, `tools.js` 431-432, `menu-screens.js` 1636/1643, `README.md` 383. `tests/reachability.test.js` + `tests/export-reachability.test.js`: 47 tests, 0 fail; `.ctoc/export-reachability-baseline.json` lists `src/lib/sync.js#onPlanOperation` (line 60) and `#silentPull` (61), not `autoPush`.

**Steps 10 and 12 results.** The five Step 8 files: 203 tests, 203 pass. With the fences, `menu-screens*`, `menu-protocol`, `no-phantom-command-family`, `w10-push-entry-point`, `sync-injection`: 469 tests, 0 fail, 0 skipped. `npm run typecheck`: pass. `npm run lint`: the only 6 errors are unused-variable errors in `tests/quality-agent-coverage-holes.test.js`, the other slice's in-progress file (not in this slice's `files:`); no lint error in any file of this slice. Step 12: `autoPush` opted in runs no git command; the only git calls left in `sync.js` are status/add/commit/fetch/log/diff/rev-parse and the two kept `pull --rebase` calls; the literal `'push'` no longer appears in the file.

### Decisions taken during the build

- **push.md line numbers differ from the slice.** The slice cites lines 187-188; after slice 1 the `git.autoPushEnabled: true` bullet is at lines 221-222, and its old text was "the machine push paths (post-commit hook, sync timer, dashboard sync) may push." The replacement is the slice's text unchanged; G5's two regexes match the file as it is.
- **The "no changes" result when opted in sets `pushed: false` and `pushRefused: true`** (as the slice specifies); the Doctor still shows it through its `!result.synced` branch, so it reads "Sync: no changes; not pushed — …".
- **Fixtures use `git add plans/` for the hand commit in S1's `autoPush` case** (not `git add -A`) so the uncommitted `.ctoc/settings.json` stays out of the commit, as the slice's wording "pending change committed by hand" implies.

### Phase B (Step 11/13 synthesis changes), executor run for menu task t6

- **Change 3 (argv helper, strict S3).** Red proof that the strict S3 assertions can fail: with the gate-closed reasons in `src/lib/sync.js` temporarily set to `'auto-push disabled (MUTATED)'` (syncPlans, autoPush, fullPlansSync), `node --test tests/sync-coverage.test.js` gave 39 tests, 37 pass, 2 fail (the two S3 cases); reverted (no `MUTATED` left in the file), 39/39 pass.
- **Change 1 (reported pull failure).** Red first: the tightened mocked case in `tests/sync.test.js` and the new real-git case "a conflicting pull is reported, not hidden" both failed (reason was only the never-pushes text, expected the `pull --rebase failed (run git status); ` prefix); green after the `syncPlans` edit. `tests/sync.test.js` + `tests/sync-coverage.test.js`: 71 tests, 71 pass.
- **False-green fence (left red on purpose).** `node --test tests/false-green-fence.test.js`: 17 tests, 16 pass, 1 fail ("LOWER THE BASELINE when you pay debt down"): `Live false-green count is 206 but the baseline says 207. You fixed sites — now LOWER maxFindings to 206 and remove the fixed keys from the findings list.` The baseline `.ctoc/false-green-baseline.json` is not edited here (scope growth is with the owner); the key to drop is `src/lib/sync.js:silent-catch:syncPlans`.
- **Change 2 (comments).** Comment text only in `src/lib/sync.js` and `src/lib/settings.js`; the `src/lib/settings.js` diff has no non-comment line (checked).
- **Final runs:** the four sync test files 142/142 pass, 0 skipped; `tests/reachability.test.js` + `tests/export-reachability.test.js` 47/47 pass; `npm run lint` exit 0; `npm run typecheck` exit 0. Full `npm test` not run (Step 14).
- **Process note:** one test-file edit (replacing a credential-looking fake URL in the mocked pull-failure error with a plain `https://example.invalid/private-remote.git`) was made with `sed -i` rather than the Edit tool; same content as an Edit would have produced.

### Phase C (final-review items), executor run for menu task t6

- **Comments corrected (comment text only):** `src/lib/sync.js` above `NOT_PUSHED_BY_SYNC` now says the text is carried by `syncPlans`, `autoPush` and `fullPlansSync` results (`onPlanOperation`'s rate-limited and offline returns do not carry it; it has no live caller); the pull comment in `syncPlans` now says the failure covers "no upstream, or a conflict that leaves the rebase stopped partway" and that the pull failed; `tests/sync-coverage.test.js` "a conflicting pull is reported, not hidden" now says `syncPlans` commits `plans/p1.md` first, then the rebase conflicts and stops partway, leaving the rebase in progress.
- **Step 16, real "Sync now" key.** Evidence is `tests/tools-tab-coverage.test.js` D1 and D2, which drive the real Doctor tab (`tools.handleKey(key('sync', '3'), app)`, `toolMode: '1'`) against real git with a local bare `origin`. `node --test tests/tools-tab-coverage.test.js`, both pass: (D1) "opted in: plans are committed, the message says not pushed and points to /ctoc:push" asserts `app.message` matches `/^Sync: plans committed, not pushed/` and `/\/ctoc:push/`, is not `✓ Synced successfully`, the newest commit matches `auto-sync plans`, and the bare remote's `main` equals its baseline (did not move); (D2) "automatic pushing off: the message is today's and nothing is pushed" asserts `app.message === '✓ Synced successfully'`, the newest commit matches `auto-sync plans`, and the bare remote's `main` equals its baseline. D3 ("no changes" opted in: `/^Sync: no changes; not pushed/`, `/\/ctoc:push/`, not exactly `Sync: no changes`, remote unmoved) also passes. The main session can repeat this by hand in the terminal menu if the owner wants.
- **Approval check.** `node --test tests/approval-hash-survives-execution.test.js`: 40 tests, 40 pass, including "LIVE LEDGER: the deferred-questions exemption invalidated no approval it did not re-record". It examines this plan (specification-scoped, carries a Deferred Questions section), so the specification is unchanged since it crossed.
- **For the completion summary:** Decisions 17 and 18 overrode parts of the hashed specification text — the opted-in pull is no longer silent on failure (the specification said it stays as it was), `tests/sync.test.js` ~469-508 was tightened (the specification said it stays unedited), and the `src/lib/settings.js` wording was corrected from the prescribed text. Those departures are the CTO Chief's approved Step 11/13 synthesis.
- **Runs:** the four sync test files (`tests/sync.test.js`, `tests/sync-coverage.test.js`, `tests/ship-gate-real.test.js`, `tests/tools-tab-coverage.test.js`): 142 tests, 142 pass, 0 skipped. `npm run lint` exit 0 (`--max-warnings 0`); `npm run typecheck` exit 0. Step 14's `npm test` box stays unticked (coverage/false-green baseline pending); the final-review box is the CTO Chief's.

### Phase D (Step 14 verification), executor run for menu tasks t6 and t7 (shared worktree)

- **Baseline edit, under the owner's granted scope growth (inbox 1792163429592-fousz1, 2026-10-16, recorded through the menu):** in `.ctoc/false-green-baseline.json` the key `src/lib/sync.js:silent-catch:syncPlans` was removed (only it) and `maxFindings` set from 207 to 206, the number the fence reports as live. `node --test tests/false-green-fence.test.js`: 17 tests, 17 pass, 0 fail, 0 skipped (before the edit: 16 pass, 1 fail with "Live false-green count is 206 but the baseline says 207").
- **`npm test` run 1 (foreground):** 13241 tests, 13241 pass, 0 fail, 0 skipped, coverage 99.87% (threshold 99%), test duration 141330 ms (about 2 min 42 s wall), `[CTOC test-gate] PASS`.
- **`npm test` run 2 (foreground):** 13241 tests, 13241 pass, 0 fail, 0 skipped, coverage 99.87%, test duration 148788 ms (about 2 min 47 s wall), `[CTOC test-gate] PASS`. No flaky test seen in either run (the known timing test in `tests/hotfix-check-corpus.test.js` passed both times).
- **Lint and typecheck:** `npm run lint` (`--max-warnings 0`) clean; `npm run typecheck` exit 0.
- **Fences and menu tests:** `tests/export-reachability.test.js`, `tests/reachability.test.js`, `tests/no-phantom-command-family.test.js`, `tests/tab-modules.test.js`, `tests/menu-screens.test.js`, `tests/menu-screens-coverage.test.js`, `tests/menu-protocol.test.js`: 294 tests, 294 pass, 0 skipped. Box ticks above rest on these runs and on the final reviews (`iron-loop-critic`, 2026-10-16).

## Deferred Questions

_Written by the Iron Loop integrator (src/lib/iron-loop.js), which performs NO
quality evaluation. These entries are the integrator's own report on itself, not
findings from a critic that read this plan._

- **evaluation**: NOT EVALUATED — no automated critique was performed on this plan. The refinement loop appended the Steps 8-16 template and assessed nothing. (The scores this step used to report were computed from that same template, not from the plan.) A human or a real critic must review this plan before it is built.
