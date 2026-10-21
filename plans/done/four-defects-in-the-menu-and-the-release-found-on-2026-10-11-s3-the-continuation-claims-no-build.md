---
title: "Answering, approving or completing claims no build: the continuation queues at most one and offers it"
type: implementation
created: 2026-10-11
priority: high
effort: medium
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s2-the-task-start-moves-the-plan
files:
  - src/lib/menu-screens.js
  - tests/plans-keep-moving-without-the-human.test.js
  - tests/an-answer-starts-no-build.test.js
  # RATCHET FILES — not counted toward the ~1–3 budget: this slice CREATES a test file, which
  # moves the test-file count in CLAUDE.md and in README.md's structure block.
  - CLAUDE.md
  - README.md
---

# Answering, approving or completing claims no build: the continuation queues at most one and offers it

Slice 3 of 14 of `plans/functional/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`:
the first half of the parent's slice 2 — scenarios "an answer, an approval or a completion claims
nothing" and "the reproduction runs through the real menu command", decision 8. The stop's filter is
slice 4; the session's instructions are slice 5.

## Problem Statement

`continueAfterCrossing` (`src/lib/menu-screens.js` line 2587) runs on `menu task complete <id>
--continue`, `stream approve` and `stream answer`. When any approved plan is buildable it calls
`actions.startAgent(root)`, unforced, up to five times (lines 2627-2641). Each call claims a build —
the task set running with no agent (`addAndClaim`, `src/lib/task-registry.js` line 1213) and the plan
moved to `in-progress/` (`startExecution`, `src/lib/actions.js` line 1885) — before any agent exists.
Reproduced on 2026-10-11: one `stream answer` left alpha, the answered plan, bravo and charlie in
`in-progress/` with four implement tasks running and agent `null`; in main, t294, t307, t311 and t312
were claimed that way and orphaned.

## Technical approach

### `continueAfterCrossing` (`src/lib/menu-screens.js` lines 2587-2649)

Step 5 (lines 2627-2641) is replaced: no `startAgent` call. Instead, when no stop is requested
(`taskRegistry.isDrainStopRequested(root)` false), `queueNextBuild(root)` records at most one queued
build task:

```
queueNextBuild(root: string) → { taskId: string, plan: string } | null
```
A new internal function placed after `queueClassification` (line ~2670), not exported:
1. `buildable = new Set(require('./continuation-queue').nextBuildable(root).buildable)` — approved
   (ledger-vouched) plans with their dependencies built, as `stage/file.md` refs.
2. Walk `state.readPlans(path.join(getPlansDir(root), 'todo'))` in its order (the todo order file, then
   birth time). Skip a plan whose `todo/<file>` ref is not in `buildable`.
3. `spec = actions.taskSpecFromPlan(plan, root)`; a throw (no `files:`, an unresolvable dependency) skips
   the plan, as Start agent does.
4. `taskRegistry.withRegistry(root, (reg, ctx) => …)`: when `findActivePlanTask(reg, spec.plan,
   'implement')` exists, `ctx.abort()` and go on to the next plan; otherwise `addTask(reg, spec)` and
   return it. The first task added ends the walk.
Any throw records `reasons.push('build-not-queued')` and the pass goes on (fail-soft, like the other
steps). Step 6 returns `computePromote(loadReg(root))` unchanged — the queued build is in it when the
scheduler allows it — with no claimed tasks concatenated (lines 2643-2644 lose the `claimed` merge).

The return value loses `building`; `started` no longer names a build (nothing was started). The header
comment (lines 2560-2586) says, for steps 5 and 6: "when approved plans are buildable and no stop is
requested, at most one queued build task, for the first approved plan in `todo/` (in `todo/`'s order)
that has no live build task. The continuation never claims a build and never moves a plan into the
build; the session claims it with `menu task start <id>` before it launches the build's agent" and "6.
the scheduler's promote list (`computePromote`), which offers that build when the scheduler allows it";
the `@returns` drops `building`.

`continuationText` (lines 2710-2722) drops its `cont.building` line (`· started building: …`).

### Tests that encode the continuation's claim — `tests/plans-keep-moving-without-the-human.test.js`

The parent allows tests that encode the continuation's claim to change only to express the owner's
decision:
- **case 4** (lines 293-326): title "… moves a classified slice to todo and offers its build"; asserts
  `todo/c4.md` exists and `in-progress/c4.md` does not; the implement entry in `promote` is a `queued`
  task with the same `touches`; the text does not match `/started building/` (line 310's assertion is
  replaced); then `route(['menu','task','start', impl.id])` answers ok and moves c4 to `in-progress/`,
  and the existing stamp lines (313-325) follow unchanged.
- **case 12** (lines 467-479): after the continuation, c12 is in `todo/` with a queued build in the
  registry; the test claims it with `route(['menu','task','start', id])`, then the existing append and
  residency assertions run on `in-progress/c12.md`.
- **case 46** (line 1339): the message becomes "the next approved slice is queued for building and
  returned to launch"; the assertion is unchanged.
No other case changes; Step 9 runs the whole file and lists any other failure by name.

## Implementation Details

### Dependency Graph

```
menu-screens.continueAfterCrossing --calls--> queueNextBuild --calls--> continuation-queue.nextBuildable,
                                                                         state.readPlans, actions.taskSpecFromPlan,
                                                                         task-registry (withRegistry, findActivePlanTask, addTask)
streaming-gate.streamApprove / streamAnswer --calls--> continueAfter --calls--> continueAfterCrossing (unchanged)
tests/an-answer-starts-no-build.test.js --drives--> route (stream answer/approve, menu task …), src/commands/start.js (child process)
```

### File Specifications

- `src/lib/menu-screens.js` — MODIFY: `continueAfterCrossing` step 5-6 and header, new internal
  `queueNextBuild`, `continuationText`; delete `planNameAt` (lines 2699-2707), whose only caller was the
  removed step 5; the comment at lines 2537-2538 ends "…planners and classifications are queued, and at
  most one build is queued for the session to claim."
- `tests/plans-keep-moving-without-the-human.test.js` — MODIFY: cases 4, 12, 46 as above.
- `tests/an-answer-starts-no-build.test.js` — CREATE.

### Test Plan — `tests/an-answer-starts-no-build.test.js` (written first)

Fixture helpers copied from `tests/plans-keep-moving-without-the-human.test.js`: `makeSandbox`, the
classified question writer (`precompute.writePlanQuestions(..., CLASSIFIED)`), `fork`, and approved todo
plans: `implBody(title, files)` written to `plans/todo/<slug>.md` plus
`ledger.writeEntry(slug, { content, stage_from: 'implementation', stage_to: 'todo' }, root)`;
`.ctoc/state/todo-order.json` = `["alpha.md","bravo.md","charlie.md"]` for a fixed order.

1. **an answer, an approval or a completion claims nothing** — three projects, each with alpha and bravo
   approved in `todo/`, no task, no build running:
   (a) `stream answer` of a plan's one classified fork question (digest from
   `precompute.questionDigest(q)`); (b) `stream approve` of a functional plan; (c) `menu task complete
   <id> --continue` of a running `review` task. In each: no plan in `in-progress/`, no task is running
   once the call returns, exactly one queued implement task, for alpha, none for bravo, and that task's
   id is in the screen's `promote`.
2. **it is claimed only by the session's task start**: continuing 1(a), `route(['menu','task','start',
   alphaTask])` → ok, alpha in `in-progress/`.
3. **the next pass queues the next plan, still claiming nothing**: a second continuation pass with
   alpha's task still queued records bravo's (decision 8: the first plan with no live build task), and
   no task is running.
4. **a requested stop queues no build**: with `.ctoc/state/drain-stop` present, a completion with
   `--continue` records no implement task.
5. **the reproduction runs through the real menu command**: a temporary project with one plan holding
   one classified fork question, alpha, bravo and charlie approved in `todo/`, no tasks, no drain-stop.
   Run as a child process `node src/commands/start.js stream answer <ref> <qid> <key> <digest>` →
   alpha, bravo, charlie in `todo/`, `in-progress/` empty, no task running, `promote` lists exactly one
   implement entry, alpha's; then `menu task start <alpha task>` → alpha in `in-progress/`, its task
   running; then `menu task start <alpha task> --agent-id agent-xyz` → agent-xyz recorded.

### Security Review

- [x] No new input: the queued spec comes from `taskSpecFromPlan`, the same validated translation Start
  agent uses (unsafe `depends_on` tokens refuse the plan).
- [x] Fewer writes than today: the continuation no longer moves plan files or marks tasks running.
- [x] The write protection is untouched; `--continue` stays refused to background agents.

### Wiring — the live call sites

`queueNextBuild` is called by `continueAfterCrossing`, which runs on `menu task complete <id>
--continue` (`taskComplete`, lines 2370-2383 and 2541-2544), `stream approve` and `stream answer`
(`streaming-gate.continueAfter`, line 2121) — all routes of `src/commands/start.js`.

## Acceptance Criteria

- [x] Scenarios "an answer, an approval or a completion claims nothing" and "the reproduction runs
  through the real menu command" (parent slice 2) pass as cases 1, 2 and 5.
- [x] No code path of the continuation calls `startAgent`, `startExecution` or `addAndClaim`.
- [x] `npm test` passes; the test-file counts in CLAUDE.md and README.md are updated through the release
  script's two count functions.

## Risks

| Risk | Mitigation |
|---|---|
| Until slice 5 lands, `src/commands/start.md` still says the continuation claims builds | Not released between slices (all fourteen ship in one release, parent "How this round runs"); slice 5 corrects it and its test pins it |
| A queued build accumulates per pass when the session does not launch it | Decision 8 of the parent; with one build at a time (slice 12) `promote[]` still offers only one |
| Other tests encode the claim | Step 9 runs the full suite and lists them by name; only tests that encode the claim may change, and only to express the owner's decision |

## Decisions Taken Under Ambiguity

1. **No build is queued while a stop is requested.** Today an unforced Start agent records nothing during
   a stop (`src/lib/actions.js` lines 1828-1834); recording a queued task the stop would hold back anyway
   adds registry entries nobody acts on. Slice 4 separately keeps any build out of every `promote[]`.
2. **"Approved" means in `continuation-queue.nextBuildable`'s set**, the gate the continuation already
   used (line 2630): ledger-vouched, dependencies built. The walk order is `todo/`'s own order (parent
   decision 8), not `nextBuildable`'s priority order.
3. **The status sentence no longer names a build.** Nothing started; the queued build reaches the human
   through the session's own "Starting implementation of …" line once it claims and launches it. The
   `building` field is removed rather than renamed, because nothing else reads it (search
   `\.building\b|building:` over `src/` and `tests/`, read match by match: the continuation's own return
   values, lines 2584, 2602 and 2648, `continuationText` line 2719, and case 4's text assertion, line 310
   of the test file this slice changes; the other matches are prose).
4. **The comments in `streaming-gate.js` that say the continuation starts builds** (lines 2069-2071 and
   2277-2279) are corrected in slice 5 with the other session texts, so this slice stays at three files.

5. **`tests/a-build-start-moves-its-plan.test.js` case C3, continuation half, is replaced (lines ~841-843
   of the file), not deleted.** The continuation no longer calls Start agent by this slice's design, so
   the `build-start-busy` report the case asserted through it cannot happen. The replacement pins the new
   behaviour instead of losing coverage: after a continuation pass (as C3 drives it, with a foreign lock
   held) the reasons hold neither `build-start-busy` nor `start-failed`, the result carries no `building`
   field, nothing in `started` names a build, and the registry's running set is the same before and after.
   The first half of C3 (Start agent's own `busy: true`) and the lock assertion are unchanged; the title
   now ends "the continuation reports no build start". Decided by the main session under the owner's
   standing rule of 2026-10-09 ("decide it yourself"), answering the scope-growth request (inbox question
   1791764758088-254n9v); that question stays open for the owner. The file is outside this plan's
   `files:`, so this is the one approved edit to it.

## Execution Plan

### Step 8: TEST
- [x] Write `tests/an-answer-starts-no-build.test.js` (cases 1-5) and the three changed cases of `tests/plans-keep-moving-without-the-human.test.js`; run both files and record that new-file case 4 (the stop) is a guard; new-file cases 1, 2, 3 and 5 and changed cases 4 and 12 fail on today's code (the continuation claims); changed case 46 changes only its assertion message and passes before and after.

### Step 9: PREPARE
- [x] Re-read `continueAfterCrossing`, `continuationText`, `nextBuildable` and `taskSpecFromPlan` as they are now.

### Step 10: IMPLEMENT
- [x] `src/lib/menu-screens.js`: `queueNextBuild`, the new steps 5-6, the header comment, `continuationText`; delete `planNameAt` (lines 2699-2707), whose only caller was the removed step 5; the comment at lines 2537-2538 ends "…planners and classifications are queued, and at most one build is queued for the session to claim."
- [x] `tests/plans-keep-moving-without-the-human.test.js`: cases 4, 12, 46.
- [x] `CLAUDE.md`, `README.md`: the test-file count lines through the release script's count functions.
- [x] With the change applied, run the full suite and list every failure by name in the build record.

### Step 11: REVIEW
- [x] The critic confirms no remaining path from an answer, an approval or a completion to a running build or a moved plan.

### Step 12: OPTIMIZE
- [x] `queueNextBuild` reuses `taskSpecFromPlan` and `findActivePlanTask`; no second spec builder.

### Step 13: SECURE
- [x] The security scanner checks that the queued spec cannot carry an unsafe path or dependency token.

### Step 14: VERIFY
- [x] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.
- [x] Re-run case 5 (the real menu command) and quote its outputs in the build record.

### Step 15: DOCUMENT
- [x] The continuation's header comment says what it now does; the build record names every changed test.

### Step 16: FINAL-REVIEW
- [x] Every acceptance box is checked against its quoted evidence.

## Execution Record

### Step 8 — red evidence (tree as it was, with slices 1, 2 and 15 in it)
- `tests/an-answer-starts-no-build.test.js` (created): case 4 (a requested stop) passes on the old code, a guard. Cases 1a, 1b, 1c, 2, 3 and 5 fail: the continuation claimed alpha and bravo (in-progress held `alpha.md`, `bravo.md`; case 3 saw alpha, bravo, charlie running; case 5 found todo empty).
- `tests/plans-keep-moving-without-the-human.test.js`: changed cases 4 and 12 fail on the old code (the slice was already in the build, not in todo). Case 46 changed only its assertion message and passed before and after. The other 95 cases of the file passed.

### Step 10 — changes
- `src/lib/menu-screens.js`: `continueAfterCrossing` steps 5-6 replaced by `queueNextBuild` (unless a stop is requested); the claimed-task merge, `building` and the build line of `continuationText` removed; `planNameAt` deleted; header and the `taskComplete` comment rewritten. `queueNextBuild` sits directly after `continueAfterCrossing` and above `queueClassification` (the plan said after it); placement only.
- Tests changed: `tests/plans-keep-moving-without-the-human.test.js` cases 4, 12 and 46 (title and assertions per the plan); created `tests/an-answer-starts-no-build.test.js`.
- Counts: `updateDocCountsInClaudeMd` and `updateDocCountsInReadme` of the release script moved the test-file count 568 to 569 in `CLAUDE.md` (two lines) and `README.md` (one line); nothing else changed.

### Step 10 — full suite, before any fix
`npm test`: 13207 tests, 13205 pass, 2 fail, 0 skipped; coverage 99.88% (floor 99%). Failures by name:
1. `C3. Start agent's busy result carries busy: true and the continuation names build-start-busy` (`tests/a-build-start-moves-its-plan.test.js`, slice 2's test). It asserts the continuation reports `build-start-busy` through `startAgent`, which is exactly the claim this slice removes. The file is not in this plan's `files:`; a scope-growth request was filed.
2. `README — explicit numeric claims match reality` / `Project structure: test-file count (derived from disk)`: the new test file moved the count to 569. Fixed through the count functions (above).

### Step 10 — case C3 replaced (red, green, full suite)
- `tests/a-build-start-moves-its-plan.test.js` C3, continuation half (decision 5): the assertions on `build-start-busy` are replaced by: no `build-start-busy`, no `start-failed`, no `building` field, nothing in `started` naming a build, and the registry's running set equal before and after; the title now ends "the continuation reports no build start". Start agent's own busy half is unchanged.
- Red on slice-2 code: a scratch copy outside the repository, with `continueAfterCrossing` step 5 restored to a loop of up to five unforced Start agent calls collecting claimed builds. C3 there fails: `AssertionError: ["build-start-busy"]` at the new `!reasons.includes('build-start-busy')` assertion.
- Green in main: the whole file passes, 60 of 60, including C3.
- Full `npm test` after the C3 change and the count fix: 13207 tests, 13207 pass, 0 fail, 0 skipped; coverage 99.87% (floor 99%); test-gate PASS.

### Steps 11-13 fix round 1 (test first; red, then green)
- K1 (critic, low) `tests/a-build-start-moves-its-plan.test.js` C3, second half: now writes the plan `delta` in `todo/` with a ledger entry and mocks `nextBuildable` as `todo/delta.md`; asserts delta's implement task is queued, `todo/delta.md` still exists, `in-progress/` is empty, and keeps the lock-unchanged and running-set checks. Stays within decision 5's approved edit to this file. A strengthening of an existing guard: it passed before and after the code change (60 of 60).
- K3 (critic, low) `queueNextBuild` wraps the per-plan registry call in try/catch: a plan the registry refuses is skipped and the walk goes on; the last refusal is thrown (so `build-not-queued` is recorded) only when nothing was queued. Test, new-file case 6: a first todo plan whose `files:` entry is longer than 512 characters, then a normal plan. Red: no task queued (`actual: []`, `expected: ['alpha']`). Green after the fix. Case 6b (only the refused plan: `build-not-queued` recorded, no task) is a guard and passed before and after.
- K4 (critic, medium) new-file case 7: todo order `unvouched`, `nofiles`, `alpha`; `unvouched` has no ledger entry, `nofiles` has an entry but no `files:` block; after one continuation the only implement task is alpha's, queued, nothing running. A guard: it passed on the existing code and stays green after the fix.
- S2 (security, low) a buildable plan whose spec is refused adds the reason `build-spec-refused` (no plan name, no raw message) and the walk continues. Test, new-file case 8: an approved todo plan whose `depends_on` names `foo.md` while `foo` is in `done/` is not queued and the reasons hold `build-spec-refused`. Red: the reasons lacked it. Green after the fix.
- S3 (security, low) the walk now decides approval and spec from one read: it asks the single approval check (`isApprovedForCoverage` with the plan's path, `todo`, the root and the content `readPlans` returned) and skips a plan that fails it. Test, new-file case 9: a plan approved by its ledger whose text is then changed, with `nextBuildable` mocked to still list it (the race). Red: the plan was queued. Green after the fix.
- Slice test files after the fixes: `an-answer-starts-no-build`, `plans-keep-moving-without-the-human` and `a-build-start-moves-its-plan` together: 169 tests, 169 pass, 0 fail, 0 skipped.
- Full `npm test` after the fixes: 13212 tests, 13212 pass, 0 fail, 0 skipped, 0 cancelled; coverage 99.89% (floor 99%); test-gate PASS.

### Neighbours found in review, for the owner (not fixed in this slice)
- The claim (`claimBuildLocked`) does not re-check approval, so a background agent's `menu task add` followed by `menu task start` can claim any plan in `todo/`.
- `docs/ENFORCEMENT.md` (about line 368) still says the continuation starts builds; to be handled in one approved request before the release.
- A corrupt `tasks.json` is overwritten by the next registry write.
- `locatePredecessor` joins unchecked `depends_on` tokens into paths.
- The `.md` stripping differs between `continuation-queue.js` (`normalizeDeps`) and `actions.js` (`taskSpecFromPlan`'s dependency lookup): a plan that depends on `foo.md` is buildable for the selector but its spec is refused; now reported as `build-spec-refused`, not fixed here.
- No caller shows the continuation's `reasons` to anyone.

### Steps 11-16 — review rounds, checks, evidence
- Review round 1: critic 4 findings (K1, K3, K4 fixed here; K2, `docs/ENFORCEMENT.md` line ~368, recorded above as a neighbour and handled in one approved request before the release); security scanner warn (high: the session instructions in `src/commands/start.md` launch the agent and then claim, fixed by slice 5, which ships in the same release; S2 and S3 fixed here).
- Review round 2: critic no findings; security scanner pass.
- Step 12 (optimize), checked by reading `queueNextBuild`: it calls `actions.taskSpecFromPlan` for the spec and `taskRegistry.findActivePlanTask` and `addTask` for the live-build check and the record; no second spec builder and no second live-task check.
- Step 13 (secure): the queued spec comes only from `taskSpecFromPlan`; a refused spec adds the reason `build-spec-refused` (no plan name, no raw message). The CTO Chief runs the secrets detector and the static scanner on the combined change before the release.
- Step 15 (document): the header comment of `continueAfterCrossing` and the doc comment of `queueNextBuild` say what the code now does. Tests changed or created, by name: in `tests/plans-keep-moving-without-the-human.test.js` "case 4 — a finished planner task with --continue moves a classified slice to todo and offers its build", "case 12 — the build agent appending its decisions leaves the admission record valid", "case 46 — the session's --continue on a task its agent completed runs only the continuation" (assertion message only); in `tests/a-build-start-moves-its-plan.test.js` "C3. Start agent's busy result carries busy: true and the continuation reports no build start"; created `tests/an-answer-starts-no-build.test.js` with cases 1a, 1b, 1c, 2, 3, 4, 5, 6, 6b, 7, 8, 9.

### Step 14 and acceptance evidence (final run, tree as it stands)
- Slice test files (`an-answer-starts-no-build`, `plans-keep-moving-without-the-human`, `a-build-start-moves-its-plan`): 169 tests, 169 pass, 0 fail, 0 skipped.
- Full `npm test`: exit 0; 13212 tests, 13212 pass, 0 fail, 0 cancelled, 0 skipped; coverage 99.88% (floor 99%); test-gate PASS; corpus claims verified 3, refuted 0.
- Case 5 (the real menu command, a child process of `src/commands/start.js`), re-run green: after `stream answer` the todo folder holds alpha.md, bravo.md, charlie.md; `in-progress/` is empty; no task is running; `promote` holds exactly one implement entry, alpha's; the menu's task start on alpha's task is ok, `in-progress/` then holds alpha.md and the task is `running`; the same call with `--agent-id agent-xyz` is ok and the task records `agentTaskId` `agent-xyz`.
- Acceptance box 1: cases 1a, 1b, 1c (answer, approval, completion), 2 and 5 pass in the runs above.
- Acceptance box 2: read the continuation path (`continueAfterCrossing` and `queueNextBuild`, `src/lib/menu-screens.js` lines 2663-2762): it calls only `nextBuildable`, `readPlans`, `isApprovedForCoverage`, `taskSpecFromPlan`, `withRegistry`, `findActivePlanTask` and `addTask`. The three claiming names occur in none of `menu-screens.js`, `continuation-queue.js` and `streaming-gate.js` (count 0 each; a presence check only). The runtime proof is cases 1, 2, 3 and 5: no plan in `in-progress/` and no task running after the call.
- Acceptance box 3: `npm test` as above; the count lines in `CLAUDE.md` and `README.md` were moved by the release script's two count functions (Step 10) and the README count test passes.
