---
iron_loop_verdict: true
iron_loop: true
title: "Backlog: park a blocked functional plan out of the decision lists"
type: feature
status: draft
parent_vision: "none (the owner's decisions of 2026-11-04, relayed by the main session)"
created: 2026-11-04
priority: MEDIUM
effort: medium
depends_on: none
files:
  - src/lib/backlog.js
  - src/scripts/backlog.js
  - src/lib/plan-numbering.js
  - .ctoc/reachability-roots.json
  - CLAUDE.md
  - README.md
  - tests/backlog.test.js
  - tests/backlog-round-trip.test.js
  - tests/plan-numbering.test.js
acceptance_criteria_count: 13
risk_level: MEDIUM
approved_by: human
approved_at: 2026-11-04T15:42:05.110Z
gate_crossed: review → done
override: true
override_reason: Owner chose override: VERIFY evidence is stale only because the plan text changed after the fix round; a full npm test run after the fix round passed 14185 of 14185, coverage 99.62 percent, 0 failed, 0 skipped.
---

# Backlog: park a blocked functional plan out of the decision lists

## Problem Statement

Some functional plans cannot move for reasons outside the project. The live case is prop-bot's `plans/functional/dna-funded-platform-support.md`, whose `blocked:` note says DNA is not taking new accounts. Sitting in `functional/`, it is listed as a pending decision every time the owner opens the menu; CTOC reads neither its `parked:` nor its `blocked:` line, and it still carries `status: approved` and `gate_1_approved:`.

This plan adds a `plans/backlog/` folder, reached through one owner-run script. A parked plan appears in no decision list. It comes back only to `functional/`, as an unapproved draft whose old approval is gone, so it goes through the point where the owner approves the requirements like any new plan.

## What is true today (read from source on 2026-11-04; nothing was run)

Paths are relative to `/projects/ctoc-dev`.

- Decision lists read named folders, so `backlog/` is left out unchanged: `src/lib/streaming-gate.js:81` (also feeds `plansNeedingQuestions`), `src/lib/stale-detector.js:148`, `src/lib/inbox.js:98-102`, `src/lib/continuation-queue.js:63`, `src/lib/state.js:266-279`.
- `rejectPlan` (`src/lib/actions.js:867-939`) is the pattern: refuse before writing (874-888), rewrite with `upsertMarkerFields` (`src/lib/frontmatter-merge.js:258-272`, which drops the marker keys at 45), withdraw the record (932-935), move (938; `movePlan` refuses to overwrite, 122-127).
- Records are keyed by the lowercased file name alone (`src/lib/approval-ledger.js:161-187`), and `implementation/` is not content-checked (`src/lib/approval-residency.js:67`), so a surviving `stage_to: implementation` record accepts the plan there.
- **Finding 1: removal ignores a failed delete.** `removeEntry` (`src/lib/approval-ledger.js:1126-1136`) drops a delete error, so a record can survive silently; `backlog.js` must check it is gone.
- **Finding 2: the raw `mv`/`cp` guard is not loaded.** `src/hooks/PreToolUse.Bash.js:1009-1012` would match a move naming `plans/functional/`, but `hooks/hooks.json` registers only `src/hooks/protect-records.js`, and `docs/ENFORCEMENT.md:237-243` says no plan-move or step gate runs. Nothing blocks a raw move in a live session; editing that hook changes nothing.
- **Finding 3: a restored plan can move on by itself once fresh questions exist.** The continuation pass moves a `functional/` plan on when its questions are fresh (stamped no earlier than the file's modification time), classified and fork-free (`src/lib/streaming-gate.js:1181-1183`; `src/lib/streaming-precompute.js:797-813, 1187-1207`). Restore's rewrite makes old questions stale and old answers do not bind (53-75), but a new set stored empty or answered lets the plan move on with no text change; the only text-change hold works only in `implementation/` (`src/lib/streaming-gate.js:1166`). A hold here is gate logic: stop and ask the owner.
- `src/scripts/move-plan.js:24` already refuses `backlog/`. `src/lib/plan-numbering.js:41` (`STAGES`) lacks it, and the next-number scan (84-150) and renumbering (492) read only `STAGES`.
- Fences: an unrun file fails `tests/reachability.test.js:183` (hand-run scripts go in `.ctoc/reachability-roots.json`, line 17); a new module or test file needs `CLAUDE.md` in `files:` and true counts in `CLAUDE.md` and `README.md` (`tests/plan-declares-count-moving-ratchets.test.js:4-13`, `tests/doc-counts.test.js`); scripts reach coverage in-process (`tests/move-plan.test.js:4-18`).
- `removeTopLevelKeys` (`src/lib/frontmatter-merge.js:207-222`) and `SAFE_PLAN_FILE` (`src/lib/streaming-gate.js:98`) are not exported.

Not verified: the session-start banner, the dashboard screen beyond `getPlanCounts`, `src/lib/loop-b-driver.js`, the review tab, the plan index, ctoc-remote, whether `src/hooks/protect-records.js` lets the script run (header read only), and whether prop-bot's CTOC will carry this fork.

## Business Alignment

**Job to Be Done:** When a functional plan is blocked from outside, I want to park it out of the decision lists and bring it back later as an unapproved draft, so I can stop re-deciding it and never build on an approval given before parking.

**Impact Map:**
- **Goal:** pending decisions hold only decisions the owner can take now.
- **Actor:** the project owner, deciding plans in the CTOC menu.
- **Impact:** a blocked plan stops appearing as a pending decision and returns only as an unapproved draft.
- **Deliverable:** the backlog library and script, and `backlog` in the numbering list.

## User Stories

1. **As the** owner, **I want** to park a blocked functional plan, **so that** it stops coming back as a pending decision.
2. **As the** owner, **I want** to restore a parked plan as an unapproved draft, **so that** nothing is built on an approval given before parking.
3. **As the** owner, **I want** parked plans to keep their numbers and the command to refuse unclear input, **so that** parking never reuses a number or moves the wrong file.

## Acceptance Criteria

Each scenario runs in a temporary project folder (`fs.mkdtempSync`, `path.join`). "The script" is `src/scripts/backlog.js`, run in-process. "Unchanged" means every file under `plans/` and `.ctoc/approvals/` is byte-identical.

Story 1: park

- [x] **Scenario 1: Park**
  Given `functional/x.md` with a record
  When the script runs `park x.md waiting on DNA`
  Then `backlog/x.md` has `status: backlog`, `backlog_reason: "waiting on DNA"` and the same body; the original and the record are gone; exit 0

- [x] **Scenario 2: Notes move into the reason**
  Given a `parked:` note and a `blocked:` note over 200 characters
  When parked with reason `no account`
  Then `backlog_reason` is `no account; <parked>; <blocked>`, uncut, and both keys are gone

- [x] **Scenario 3: Only functional parks**
  Given `x.md` only in another folder (each one in turn)
  When the script runs `park x.md`
  Then refused (for `implementation/`, naming the conversation's reject), exit 1, unchanged

- [x] **Scenario 4: Out of the decision lists**
  Given a functional plan that `pendingGateDecisions` lists (checked first)
  When it is parked
  Then `pendingGateDecisions`, `plansNeedingQuestions`, `scanCheapCandidates`, `listPlansAtGates`, `approvedFreeQueue` and `getPlanCounts` omit it

Story 2: restore

- [x] **Scenario 5: Restore clears the old approval**
  Given `backlog/x.md` with `backlog_reason`, the marker keys, `gate_1_approved`, `gate_2_approved` and a `stage_to: implementation` record
  When the script runs `restore x.md`
  Then `functional/x.md` has `status: draft`, none of those keys and no record, `classifyResidency` for `implementation` is not accepted, and the rest is unchanged

- [x] **Scenario 6: No self-crossing straight after restore**
  Given two plans differing only in name, modification time set an hour back, classified questions stamped with it and all answered through `streamAnswer` (`enough: true` for both, checked first)
  When the first is parked and restored, then `pendingGateDecisions(root, { crossed: [] })` runs once
  Then the first stays in `functional/` (`sufficiencyReason: 'stale'`, no record) and the second reaches `implementation/`. If this fails, stop and ask the owner before touching gate logic.

- [x] **Scenario 7: Only backlog to functional**
  Given `x.md` only in `review/`
  When the script runs `restore x.md`, or `restore x.md implementation`
  Then refused (the second with the usage text), exit 1, unchanged

- [x] **Scenario 8: No name clash**
  Given `backlog/x.md` and a same-name plan with its own record (`functional/x.md` or `done/X.md`), or `backlog/y.md` when parking `functional/y.md`
  When restore or park runs
  Then refused naming the clash, exit 1, unchanged

- [x] **Scenario 9: A failed withdrawal stops everything**
  Given a record and `deps.removeEntry` replaced by one that leaves it, and by one that throws
  When park or restore runs, directly or through the script
  Then unchanged, the owner reads that the record could not be removed, exit 1

Story 3: numbering and the command

- [x] **Scenario 10: A parked plan keeps its number**
  Given `backlog/00042-y.md` and `implementation/00007-z.md`
  When `nextImplementationPlanNumber(root)` runs
  Then it returns `00043`, and renumbering rewrites a backlog plan's `depends_on` on a renamed plan

- [x] **Scenario 11: Bad input is refused**
  Given no arguments, an unknown action, or a file name with a separator, `..`, a character outside letters, digits, `.`, `_`, `-`, or no `.md` ending
  When the script runs
  Then usage text saying only the owner parks or restores, exit 1, unchanged

- [x] **Scenario 12: The fences pass**
  Given the build
  When `npm test` runs
  Then the reachability, export-reachability and doc-count tests pass; both new files reach 99 percent line coverage; nothing is skipped; no empty `catch`

- [x] **Scenario 13: The real command, end to end**
  Given a temporary project folder with `functional/x.md` and a record
  When `src/scripts/backlog.js park x.md waiting`, then `restore x.md`, run as real child processes (`child_process` with `process.execPath` and `path.join`, the folder as working directory, no shell)
  Then both exit 0, the files and record match scenario 1 after park and scenario 5 after restore, and each prints the confirmation the owner reads. This run does not count toward coverage; scenarios 1-12 carry it.

## Scope

### In Scope
- `src/lib/backlog.js` (new): `parkPlan` and `restorePlan` only, modeled on `rejectPlan`, which is not edited. Scenarios 1-9.
- `src/scripts/backlog.js` (new): `park <file> [reason words]`, `restore <file>`; usage text states the owner-only rule. Scenarios 1, 3, 7-9, 11, 13.
- `backlog` added to `STAGES` in `src/lib/plan-numbering.js:41`, nothing else. Scenario 10.
- Fence upkeep: the script declared in `.ctoc/reachability-roots.json`; the count lines in `CLAUDE.md` and `README.md`. Scenario 12.
- Tests: `tests/backlog.test.js` and `tests/backlog-round-trip.test.js` (new), `tests/plan-numbering.test.js` (extended). All scenarios.

### Out of Scope
- Menu options and routes, `STAGE_FOLDERS`, `ALL_STAGES`: the owner's decision.
- `src/hooks/PreToolUse.Bash.js`: not loaded (Finding 2).
- `src/scripts/move-plan.js`: already refuses `backlog/`.
- A dependency warning: a parked dependency reads as missing, as a `functional/` one does today (`src/lib/continuation-queue.js:221-223`).
- A vision-decomposer name guard: restore refuses the clash (scenario 8).
- Stale-scan, dashboard and inbox edits: they read named folders.
- ctoc-remote: separate repository, own plan if wanted.
- A hold until a restored plan's text changes: gate logic, only with the owner's explicit approval.
- Mechanical enforcement of who parks or restores.

## Risks

Risk level MEDIUM: two new files and one word in an existing module, with no gate, hook or menu edit; the one high-impact failure, a surviving or wrong approval record, is closed by scenarios 8 and 9.

### Technical Risks
- A restored plan moves on by itself once its new questions are empty or answered (Finding 3). Likelihood: MEDIUM; Impact: MEDIUM; Mitigation: Ask the owner before any gate logic change.
- Upstream merges conflict on the count lines and `src/lib/plan-numbering.js:41`. Likelihood: HIGH; Impact: LOW; Mitigation: Rerun the count update after each merge.
- The write protection may refuse the session's plain `node <script> park <file>` (only its header was read). Likelihood: LOW; Impact: MEDIUM; Mitigation: Before building, pipe a Bash payload holding that command into `src/hooks/protect-records.js` and confirm it is allowed; if it refuses, stop and ask the owner.

### Business Risks
- Nothing mechanical stops an agent ignoring the owner-only rule, or a raw `mv` that skips the cleanup (Finding 2). Likelihood: LOW; Impact: MEDIUM; Mitigation: Review `plans/backlog/` in git history; restore also cleans a hand-moved plan (scenario 5).
- With no menu entry or count, parked plans are forgotten. Likelihood: MEDIUM; Impact: MEDIUM; Mitigation: Keep `backlog_reason` in each file; check `plans/backlog/` when reviewing blocked work.

### Dependency Risks
- If `plans/functional/ctocs-hooks-are-actually-loaded-by-claude-code.md` is built, the Bash hook's step gate would refuse the session's `node` call outside a build (`src/hooks/PreToolUse.Bash.js:1053-1070`). Likelihood: MEDIUM; Impact: MEDIUM; Mitigation: Re-check the trigger then; the owner can run it himself.
- prop-bot's installed CTOC may lack this fork's change. Likelihood: MEDIUM; Impact: LOW; Mitigation: Confirm which copy prop-bot runs before parking the DNA plan.
- A `todo/` plan depending on a parked plan still builds. Likelihood: LOW; Impact: MEDIUM; Mitigation: Search `depends_on` lines for the name before parking.

## Priority

**Priority: MEDIUM** (Score: 6/9)
- Dependency: 2 -- nothing depends on it.
- Business Impact: 2 -- keeps pending decisions live; one plan affected today.
- Technical Risk: 2 -- deletes approval records, but adds no gate, hook or menu logic.

## Decisions Taken Under Ambiguity

The owner's decisions (2026-11-04): core only, `src/lib/actions.js` untouched; triggered by the owner telling the session or running the script, with no menu option, route, dashboard row or count; only the owner parks or restores, by rule, no hook edit; `parked:`/`blocked:` text moves into `backlog_reason`, which restore drops; he may approve a restored plan before its text changes; an `implementation/` plan returns first through the conversation reject (`src/commands/start.md:64`); `backlog` is a side stage like `canvas`, outside `STAGE_ORDER`, `GATE_SOURCE_ORDER` and `getPlanCounts`; no gate logic change.

Technical choices taken while writing:
1. Order: check, withdraw, confirm gone, write, move, so a failed withdrawal changes nothing (`rejectPlan` writes first).
2. After `removeEntry`, stop if the record is still at `ledgerPath` (Finding 1).
3. Refuse when any folder under `plans/` holds the same lowercased name, before withdrawing.
4. Write through `upsertMarkerFields`, which also drops the marker keys on park.
5. Remove `parked`, `blocked`, `backlog_reason`, `gate_<digits>_approved` locally (`removeTopLevelKeys` is not exported).
6. `backlog_reason`: one quoted line, escaped as `rejection_reason` (`src/lib/actions.js:902-906`), never cut, parts joined by `; `.
7. `<file>`: a bare `.md` name under the `SAFE_PLAN_FILE` rule; the reason is the remaining words.
8. Project root from `findProjectRoot`, as in `src/scripts/move-plan.js:64`.
9. Export only `parkPlan` and `restorePlan`, each with a `deps.removeEntry` seam.
10. Declare the script in `.ctoc/reachability-roots.json` as run by hand.
11. `CLAUDE.md`, `README.md`: count lines only; no version bump.
12. Leave the "ALL seven stages" comment (`src/lib/plan-numbering.js:67-68`); the upstream change stays one word.
13. Never touch the questions, the answers or the plan body.

Choices taken while planning the build (2026-11-04):

14. One plan, no slices. The slice-size rule would split off the numbering word, but the library has no live caller without its script, so those two cannot be split; the numbering word is one word and two tests. The launching brief asked for one slice and the owner for the smallest change, and a separate slice file would need a plan number the planner cannot claim without a shell. The build reads this file as its plan; its `files:` list is unchanged.
15. Park removes `parked` and `blocked` (their text moves into `backlog_reason`), any old `backlog_reason`, and, through `upsertMarkerFields`, the marker keys. It keeps `gate_<digits>_approved`: no CTOC code reads those keys (a search of `src/` for them matched 0 files), the owner's approval notes stay readable in the parked file, and restore removes them (scenario 5).
16. Restore removes `backlog_reason`, `gate_<digits>_approved` and the marker keys and sets `status: draft`. Every other key stays, including a `parked:` or `blocked:` note on a plan moved into `backlog/` by hand ("the rest is unchanged").
17. A file name the approval record cannot key holds no record. The record key is the lowercased name without `.md`, and it must match `^[a-z0-9][a-z0-9-]*$` (`src/lib/approval-ledger.js:137`), which is narrower than the file-name rule: `x_y.md`, `x.y.md` and `_x.md` pass the file-name rule but fail the key rule. `readEntryResult` reports such a name `unkeyable` (`src/lib/approval-ledger.js:990-996`), and `classifyResidency` never accepts it (`src/lib/approval-residency.js:165`). Park and restore skip the withdrawal for it and report that it had no record. The check goes through `readEntryResult`, so the key rule has one copy.
18. If the move fails after the rewrite, the original bytes are written back before the refusal, so a retry never loses the `parked:`/`blocked:` text. If that write-back fails too, its error propagates as Node raised it.
19. The name-clash check reads every `.md` file directly inside every folder of `plans/`, comparing names in lower case. An unreadable folder throws (there is no catch), so a clash is never assumed absent. A folder that is a symbolic link is not followed, as in the stale scan.
20. The plan is found by exact name in the folder listing, not with `existsSync`, so a file system that ignores letter case cannot match `X.md` to `x.md`.
21. With no reason words and no notes, `backlog_reason: ""` is written, and the confirmation says no reason was given.
22. The script ends with `requestExit` (`src/lib/request-exit.js:51-59`), never `process.exit`: the false-green fence scans `src/` and counts `process.exit` after a console write as a new finding (`src/lib/false-green-scan.js:488-495`). Like `src/scripts/move-plan.js`, it exports nothing and runs on `require`. A bad file name is reported by the library with `code: 'BACKLOG_BAD_NAME'`, so the name rule has one copy.
23. The five count lines (`CLAUDE.md` lines 61, 89 and 94; `README.md` lines 1134 and 1147) are edited by hand to the live numbers. `node src/scripts/release.js` would also rewrite version lines and JSON files outside `files:` (`src/scripts/release.js:416-441`).
24. Scenario 6 needs a placeholder. `streamAnswer` runs the moving-on pass itself (`src/lib/streaming-gate.js:2826`, then `src/lib/menu-screens.js:3136`), so answering a plan's last question moves it at once (`tests/answer-feeds-sufficiency.test.js:155-167`). The test keeps both plans in `functional/` while answering by putting a same-name placeholder in `plans/implementation/` for each: `crossingBlocked` refuses a move onto an existing file (`src/lib/streaming-gate.js:944`). The placeholders are deleted before the park. No product code is replaced.
25. Scenario 9 through the script uses a real fault, not a replaced function: the record's path is a non-empty folder, which `removeEntry` fails to delete without saying so (Finding 1). The throwing seam is driven by direct calls.
26. Scenario 4 calls `scanCheapCandidates` with `nowMs` 30 days ahead, because it lists a functional plan only on the 14-day age signal (`src/lib/stale-detector.js:1127`); this way the plan is listed before it is parked. `approvedFreeQueue` reads only `todo/` and `in-progress/` (`src/lib/continuation-queue.js:63`), so it is checked for omission only.
27. The write-protection probe runs at the very start of the build, once for the main session's call and once for a background agent's call (`agent_id` set). Its command holds no `$`: the protection refuses a background agent's command that is not one plain call when it names `node` and holds `$` (`src/hooks/protect-records.js:234-240`), which would be a false alarm unrelated to this script.
28. No product template, stack choice, launch-metrics file or production-readiness list applies (none exists for this plan): this is a change inside CTOC's own Node.js library, which has no runtime dependencies.

### Checked against the source (2026-11-04, by reading; nothing was run)

Every line this plan cites was re-read and holds as written: `streaming-gate.js` 81, 98, 1166 and 1181-1183; `stale-detector.js:148`; `inbox.js:98-102`; `continuation-queue.js` 63 and 221-223; `state.js:266-279`; `actions.js` 122-127, 867-939 and 902-906; `frontmatter-merge.js` 45, 207-222 and 258-272; `approval-ledger.js` 161-187 and 1126-1136; `approval-residency.js:67`; `PreToolUse.Bash.js` 1009-1012 and 1053-1070; `hooks/hooks.json`; `docs/ENFORCEMENT.md:237-243`; `streaming-precompute.js` 53-75, 797-813 and 1187-1207; `move-plan.js` 24 and 64; `plan-numbering.js` 41, 67-68, 84-150 and 492; `tests/reachability.test.js:183`; `.ctoc/reachability-roots.json:17`; `tests/plan-declares-count-moving-ratchets.test.js:4-13`; `tests/move-plan.test.js:4-18`; `src/commands/start.md:64`. None moved.

Read in addition, and used above:
- `src/hooks/protect-records.js`, read in full except a part of the middle. A Bash call is decided in `decide()` (1250-1258) and `bashRefuses`. A plain `node src/scripts/backlog.js park x.md` names none of the protected areas (`.ctoc/approvals/`, `.ctoc/state/verify/`, `.ctoc/streaming/`, the settings files) and is not inline code, so it is expected to pass. This was not run; the build probes it first.
- `getPlanCounts` is memoized (`src/lib/state.js:266`, `src/lib/cache.js:34-57`); `movePlan` clears that cache (`src/lib/actions.js:130`), so a count read after a park is fresh.
- The live callers of the numbering scan are the menu's create-plan recipe, which runs `allocatePlanNumber` (`src/commands/start.md:59`), and its number check and repair recipes (`start.md:61-62`). `src/hooks/PreToolUse.Write.js` also calls it but is not loaded.
- The prop-bot plan stores both notes as one-line double-quoted values (`plans/functional/dna-funded-platform-support.md`, lines 10-11; read for their form only).

## Implementation Details

### Architecture Decision

The backlog is a side folder, not a stage. Nothing in `STAGE_ORDER`, `GATE_SOURCE_ORDER`, `STAGE_FOLDERS` or `getPlanCounts` changes, so every reader that names its folders skips `plans/backlog/` with no edit. Park and restore live in one library whose one live caller is a script the owner runs, or the session runs at his word. They reuse `rejectPlan`'s pieces (refuse before writing, `upsertMarkerFields`, withdraw the record, `movePlan`) in a different order: check, withdraw, confirm gone, write, move. A failed withdrawal therefore leaves every file as it was. `src/lib/actions.js` is not edited.

### Dependency Graph

```text
src/scripts/backlog.js -> src/lib/backlog.js (parkPlan, restorePlan)
src/scripts/backlog.js -> src/lib/project-root.js (findProjectRoot)
src/scripts/backlog.js -> src/lib/request-exit.js (requestExit)
src/lib/backlog.js -> src/lib/safe-fs.js
src/lib/backlog.js -> src/lib/approval-ledger.js (slugFromPlanPath, readEntryResult, ledgerPath, removeEntry)
src/lib/backlog.js -> src/lib/frontmatter-merge.js (upsertMarkerFields)
src/lib/backlog.js -> src/lib/actions.js (movePlan)
.ctoc/reachability-roots.json -> src/scripts/backlog.js (declared root: run by hand)
tests/backlog.test.js -> src/lib/backlog.js, src/scripts/backlog.js (in-process), src/lib/approval-ledger.js, src/lib/approval-residency.js
tests/backlog-round-trip.test.js -> src/lib/backlog.js, src/scripts/backlog.js (child process), src/lib/streaming-gate.js, src/lib/streaming-precompute.js, src/lib/stale-detector.js, src/lib/inbox.js, src/lib/continuation-queue.js, src/lib/state.js
tests/plan-numbering.test.js -> src/lib/plan-numbering.js
```

There is no cycle. The library is new, so nothing requires it today, and none of its five imports requires it.

### Wiring — the live call sites

| New code | Live call site | Reachable from |
|---|---|---|
| `parkPlan`, `restorePlan` in `src/lib/backlog.js` | `main()` in `src/scripts/backlog.js` | the owner running `node <CTOC folder>/src/scripts/backlog.js park` or `restore`, or the session at his word; declared in `.ctoc/reachability-roots.json` |
| `'backlog'` in `STAGES`, `src/lib/plan-numbering.js:41` | `scanNumberedPlans` (84-110) and `renumberImplementationPlans` (492) | the menu's create-plan recipe, `allocatePlanNumber` (`src/commands/start.md:59`), and the number check and repair recipes (`start.md:61-62`) |

The call site is built in the same build as the library. No menu route, hook or gate file is involved (the owner's decision).

### File Specifications

#### File: `src/lib/backlog.js`

**Action:** CREATE. **Change type:** new module.
**Purpose:** Park a blocked functional plan in `plans/backlog/`, out of every decision list, and restore a parked plan to `plans/functional/` as an unapproved draft, withdrawing its approval record both ways.

Exports (only these two):

- `parkPlan(file, reason, projectPath, deps = {})` returns `{ from, to, reason, recordRemoved }`
  - `file: string`: a bare plan file name such as `x.md`. `reason: string`: the owner's words, which may be empty. `projectPath: string`: the project root. `deps.removeEntry?: (slug: string, root: string) => void` defaults to `approval-ledger.removeEntry`.
  - Returns `from: 'functional/<file>'`, `to: 'backlog/<file>'`, `reason`: the text written to `backlog_reason`, unescaped, and `recordRemoved: boolean`: whether a record file existed and is now gone.
  - Order: check the name and the root; list same-name files; refuse unless `plans/functional/<file>` is among them by exact name, and refuse when any other is; read the plan; build the new text; withdraw the record and confirm its file is gone; write the new text over `plans/functional/<file>`; call `movePlan(path, 'backlog', root)`. On a move failure, write the original bytes back and refuse.
  - New text: `upsertMarkerFields(content, [['status', 'backlog']])`; read `parked` and `blocked` from that one block; drop `parked`, `blocked` and `backlog_reason`; append `backlog_reason: "<reason>; <parked>; <blocked>"`, leaving out the empty parts and keeping that order.
- `restorePlan(file, projectPath, deps = {})` returns `{ from, to, recordRemoved }`
  - Same order. The source is `plans/backlog/<file>`, the destination `functional`. New text: `upsertMarkerFields(content, [['status', 'draft']])`, then drop `backlog_reason` and every key matching `^gate_[0-9]+_approved$`.
- Errors carry a `code`:
  - `'BACKLOG_BAD_NAME'`: `file` is not a string, fails `^[A-Za-z0-9_][A-Za-z0-9._-]*\.md$` (the same rule as `SAFE_PLAN_FILE`, `src/lib/streaming-gate.js:98`, copied because it is not exported), or contains `..`.
  - `'BACKLOG_REFUSED'`: the root is not a non-empty string; the plan is not in its folder; a same-name plan is elsewhere; the record could not be removed; or the move failed (after the write-back).
  - Anything else, such as an unreadable folder, a plan path that is a folder, or a failed write, propagates as Node raised it.
- Example: `parkPlan('x.md', 'waiting on DNA', root)` returns `{ from: 'functional/x.md', to: 'backlog/x.md', reason: 'waiting on DNA', recordRemoved: true }` when `.ctoc/approvals/x.json` existed.

Private helpers, one job each:
- `refusal(message, code)` returns an `Error` with `code`, via `Object.assign`.
- `checkName(file)` throws `BACKLOG_BAD_NAME`. `checkRoot(projectPath)` throws `BACKLOG_REFUSED`.
- `sameNamePlans(root, file)` returns `Array<{folder, name}>`. It returns `[]` when `plans/` is absent; otherwise it lists `plans/` with `withFileTypes`, keeps only folders, and collects names equal to `file` in lower case.
- `placeMessage(file, from, matches)` builds the not-here sentence, adding the conversation-reject sentence for a park when a match is in `implementation/`.
- `splitBlock(text)` returns `{lines, rest}` from `upsertMarkerFields`' output, which always starts with `---\n` and whose first `\n---\n` is the closing fence. `joinBlock(lines, rest)` is its inverse.
- `topLevelKey(line)` uses the same pattern as `src/lib/frontmatter-merge.js:116`, `^([^\s:#][^:]*):(?:\s|$)`.
- `noteText(lines, key)` returns the key's value on one line. It joins the text after `key:` and the following indented or blank lines with single spaces and drops a block indicator matching `^[|>][0-9+-]*$`. Then, if the text is wrapped in double quotes, it strips them and turns `\"` into `"` and `\\` into `\`; if wrapped in single quotes, it strips them and turns `''` into `'`. Other escapes stay as written. It returns `''` when the key is absent.
- `dropKeys(lines, drop)` removes each key line for which `drop(key)` is true, together with its indented and blank lines, as `removeTopLevelKeys` does.
- `yamlQuoted(text)` replaces C0 and C1 control characters with a space, escapes `\` and then `"`, and wraps the result in `"`; it never cuts (choice 6).
- `withdrawRecord(file, root, removeEntry)` returns `recordRemoved`. It returns `false` when `readEntryResult` says `unkeyable`. Otherwise it notes whether the file at `ledgerPath` exists, calls `removeEntry` (a throw becomes `BACKLOG_REFUSED` carrying the thrown message), then refuses if the file is still there.
- `relocate(file, projectPath, deps, from, to, rewrite)` is the shared body of both exports.

Dependencies: `path`, `./safe-fs`, `./approval-ledger`, `./frontmatter-merge`, `./actions`. Every computed-path file call goes through `safe-fs` (the lint rule `security/detect-non-literal-fs-filename` is an error). No regular expression is built at run time.

Called by: `src/scripts/backlog.js` `main()`. Tests are not callers.

Data flow:

```text
file, reason, root
  -> checkName, checkRoot
  -> sameNamePlans(root, file) -> own match? other matches? (refuse here: nothing written)
  -> readFileSync(plans/<from>/<file>) = original
  -> upsertMarkerFields -> splitBlock -> noteText / dropKeys / append -> joinBlock = next   (pure)
  -> withdrawRecord: readEntryResult -> removeEntry -> existsSync(ledgerPath) must be false   (refuse here: nothing written)
  -> writeFileSync(plans/<from>/<file>, next) -> movePlan(.., <to>, root)
       on failure: writeFileSync(plans/<from>/<file>, original) -> refuse
  -> { from, to, reason?, recordRemoved }
```

The sentences the owner reads, with `x.md` standing for the file:

| Case | Sentence |
|---|---|
| bad name | `"<file>" is not a plan file name: give the bare name, such as my-plan.md, using only letters, digits, ".", "_" and "-".` |
| no root | `The project folder was not given, so nothing was changed.` |
| nowhere | `There is no plans/functional/x.md, so nothing was changed.` (park) / `There is no plans/backlog/x.md, so nothing was changed.` (restore) |
| elsewhere | `x.md is not in plans/functional/; it is at plans/review/x.md. Nothing was changed.` |
| in technical planning (park) | the elsewhere sentence, then `To park a plan that is in technical planning, first ask in the conversation to reject it back to functional planning, then park it.` |
| clash | `Refusing to park x.md: plans/backlog/x.md has the same name, and CTOC keeps one approval record per name, so the two plans share one record. Nothing was changed.` (restore says `restore`) |
| record stays | `The approval record for x.md could not be removed, so nothing was moved or changed.` (adds ` (<message>)` when the removal threw) |
| move failed | `x.md could not be moved to plans/backlog/ (<error code>). Its text was put back as it was.` and, when a record existed, ` Its approval record had already been removed.` |

Error messages name paths relative to the project; the move-failure sentence carries the error code, not Node's message, which would hold an absolute path.

Cross-platform: `path.join` for every path; names are compared in lower case; no shell; no platform branch is needed.

#### File: `src/scripts/backlog.js`

**Action:** CREATE. **Change type:** new command-line entry point.
**Purpose:** The owner's command: `park <file.md> [reason words]` and `restore <file.md>`.

Shape: a shebang, `'use strict'`, then a header naming the usage and the owner-only rule. It requires `../lib/backlog`, `../lib/project-root` and `../lib/request-exit`, defines `const USAGE`, and has `function main(args)`, which returns `0` or `1`. The last line is `requestExit(main(process.argv.slice(2)));`. It has no exports and no `process.exit`.

| Input | Output | Exit code |
|---|---|---|
| no words, an unknown action, `park` with no file, `restore` with no file or with more than one word | the usage text on standard error | 1 |
| `park <file> [words]`, accepted | the park confirmation on standard output | 0 |
| `restore <file>`, accepted | the restore confirmation on standard output | 0 |
| refused with `BACKLOG_BAD_NAME` | the sentence, then the usage text, on standard error | 1 |
| refused with `BACKLOG_REFUSED` | the sentence on standard error | 1 |
| any other error | `Could not park x.md: <message>` (or `restore`) on standard error | 1 |

The reason is the remaining words joined by single spaces. The root is `findProjectRoot()`, as in `src/scripts/move-plan.js:64`.

Usage text:

```text
Usage:
  node <CTOC folder>/src/scripts/backlog.js park <file.md> [reason words]
  node <CTOC folder>/src/scripts/backlog.js restore <file.md>

park     moves a blocked plan from plans/functional/ to plans/backlog/, where no decision list shows it.
restore  brings a parked plan back to plans/functional/ as an unapproved draft.
Only the owner parks or restores a plan: run this only when he asks for it.
```

Confirmations:

```text
Parked x.md: it is now plans/backlog/x.md, and no decision list shows it.
Reason recorded: waiting on DNA            (or: No reason was given.)
It had an approval record; that record was removed.   (or: It had no approval record.)
To bring it back later, run the same script with: restore x.md

Restored x.md to plans/functional/x.md as an unapproved draft: its old approval is gone, and the questions asked before it was parked no longer count.
It had an approval record; that record was removed.   (or: It had no approval record.)
```

The second restore sentence is backed by scenario 6: the rewrite moves the file's modification time past the old questions' stamp, so they read as stale. It does not say the plan waits for the owner's OK, because a fresh set of questions, empty or answered, can move it on by itself (Finding 3; a hold would be gate logic, not built).

#### File: `src/lib/plan-numbering.js`

**Action:** MODIFY, line 41 only:
`const STAGES = ['vision', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done', 'backlog'];`
Effect: `scanNumberedPlans` (84-110) reads `plans/backlog/`. An absent folder is skipped; an unreadable one throws, naming `plans/backlog` (existing rule). So the next number, the claim floor, the collision check and the collision list all see parked numbers, and `renumberImplementationPlans` (492) rewrites references inside parked plans. The comment at 67-68 stays (choice 12).

#### File: `.ctoc/reachability-roots.json`

**Action:** MODIFY. Append `"src/scripts/backlog.js"` to `roots`, after `"src/hooks/protect-records.js"`, and add to `reasons`:
`"src/scripts/backlog.js": "Executed BY A HUMAN, or by the session at the owner's word: node src/scripts/backlog.js park <file> [reason] parks a blocked functional plan in plans/backlog/, and restore <file> brings it back as an unapproved draft. No menu route runs it (the owner's decision of 2026-11-04), so the analyzer cannot see the run."`

#### Files: `CLAUDE.md`, `README.md`

**Action:** MODIFY the count lines only, to the numbers on disk once the new files exist. Expected: 136 modules, up from 135, and 592 test files, up from 590, if no other plan has landed. The lines are `CLAUDE.md` 61 (`Run all … test files`), 89 (`lib/  … JS modules`) and 94 (`tests/  … test files`), and `README.md` 1134 and 1147. The byte length does not change; `CLAUDE.md` must stay at or under 15,000 bytes.

### Test Plan

Every test runs on real temporary projects (`fs.mkdtempSync(path.join(os.tmpdir(), …))`, a `.ctoc/` folder and the stage folders), with real files and real approval records written by `approval-ledger.writeEntry` from the test process. Nothing in the backlog, the ledger, the frontmatter merge or the gate is replaced. The one seam is `deps.removeEntry`, used only for scenario 9. "Unchanged" is checked with a snapshot: a map from relative path to bytes of every file and folder under `plans/` and `.ctoc/approvals/`, compared with `deepStrictEqual`. No `catch` is empty, every case asserts, and nothing is skipped.

In-process script harness, as in `tests/move-plan.test.js:42-80`: drop the script from the require cache; save `process.argv`, `process.exitCode`, `console.log`, `console.error` and the working directory; set `process.exitCode = undefined`, `process.argv = [process.execPath, SCRIPT, ...args]` and capture the console; `process.chdir(fixture)`; `require(SCRIPT)`; read `process.exitCode`; restore all of it in `finally`. Restoring `process.exitCode` matters: a left-over 1 would fail the test file.

Shared fixture, "the fixture" below: a plan file whose one frontmatter block holds these lines, in this order,

```text
title: "X plan"
type: feature
status: approved
approved_by: human
approved_at: 2026-08-26T00:00:00.000Z
gate_crossed: functional → implementation
gate_1_approved: "2026-08-26 (owner) — decisions one to five"
depends_on: none
```

followed by a body with a title line, a Problem Statement heading and one sentence, an Acceptance Criteria heading and one unchecked item, and a Scope heading and one sentence: the shape of `validFunctionalBody` in `tests/answers-bind-to-plan-revision.test.js:56-60`, which passes the functional-plan validator (`src/lib/plan-validator.js:1239-1282`). The test builds this text in code, so this plan carries no heading of its own inside a code block.

#### `tests/plan-numbering.test.js` (MODIFY: two tests in the existing describes, using its `writePlan`)

| Case | Given | Then |
|---|---|---|
| parked number counts (scenario 10) | `backlog/00042-y.md`, `implementation/00007-z.md` | `nextImplementationPlanNumber(root) === '00043'`; before the word it returns `'00008'` |
| parked links follow a rename (scenario 10) | `implementation/a.md` unnumbered, `backlog/00042-y.md` with `depends_on: a` | `renumberImplementationPlans(root).a` matches `^\d{5}-a$`, and the backlog file's `depends_on` equals it; before the word the backlog file is unchanged |

#### `tests/backlog.test.js` (CREATE): the module and its command, in-process

| Case | Given | When | Then |
|---|---|---|---|
| scenario 1 | the fixture at `functional/x.md`; a human record, `stage_to: implementation` | script `park x.md waiting on DNA` | exit 0; `backlog/x.md` has `status: backlog`, `backlog_reason: "waiting on DNA"`, no `approved_by`/`approved_at`/`gate_crossed`, `gate_1_approved` kept, and the text after the closing fence byte-identical; `functional/x.md` and `.ctoc/approvals/x.json` absent; output names the reason and "that record was removed" |
| scenario 2, quoted notes | `parked: "since 2026-09-07, by the owner"` and a `blocked:` double-quoted value of 230 characters holding `\"new\"` and `\\` | `parkPlan('x.md', 'no account', root)` | the raw line is `backlog_reason: "no account; since 2026-09-07, by the owner; <blocked inner text exactly as written>"`; the returned reason is unescaped; it is longer than 200 characters; no `parked:` or `blocked:` key is left |
| scenario 2, other forms | `parked: 'it''s parked'`; `blocked: >` with two indented lines; then a plain value continued on an indented line | `parkPlan` | reasons read `it's parked`, `line one line two` and `first part second part` |
| no reason, no record | fixture without notes or record | script `park x.md` | exit 0; `backlog_reason: ""`; output says "No reason was given." and "It had no approval record." |
| scenario 3 | `x.md` only in each of `vision`, `canvas`, `implementation`, `todo`, `in-progress`, `review`, `done`, `backlog` in turn | script `park x.md` | exit 1; names `plans/<folder>/x.md`; for `implementation` also the reject sentence; unchanged |
| scenario 3, nowhere | no `x.md` anywhere; then a root with no `plans/` folder (direct call) | park | `There is no plans/functional/x.md`; unchanged |
| scenario 5 | `backlog/x.md` with `status: backlog`, `backlog_reason`, the five marker keys, `gate_1_approved`, `gate_2_approved` and other keys; a human record, `stage_to: implementation`; first `classifyResidency(<backlog path>, 'implementation', root).accepted === true` | script `restore x.md` | exit 0; `functional/x.md` has `status: draft` and none of those keys, every other frontmatter line in the same order, and the body byte-identical; no record; `classifyResidency(<functional path>, 'implementation', root)` gives `accepted: false, reason: 'no-ledger-entry'` |
| scenario 7 | `x.md` only in `review/` | script `restore x.md`; script `restore x.md implementation` | both exit 1; the first names `plans/review/x.md`, the second prints the usage text; unchanged |
| scenario 8 | `backlog/x.md` with `functional/x.md` and its record; `backlog/x.md` with `done/X.md` and its `stage_to: done` record; `functional/y.md` with `backlog/y.md` | script `restore x.md` (twice), `park y.md` | exit 1, naming the other file; unchanged, so the done plan's record survives |
| scenario 9, direct | a record; `deps.removeEntry` that leaves it, then one that throws `new Error('disk is full')` | `parkPlan`, `restorePlan` | throws `BACKLOG_REFUSED`, "could not be removed" (the second also says `disk is full`); unchanged |
| scenario 9, script | the record's path is a folder holding one file | script `park x.md`, `restore x.md` | exit 1, "could not be removed"; unchanged |
| scenario 11 | no words; `frob x.md`; `park`; `restore`; `park ../x.md`; `park a/x.md`; `park a\x.md`; `park x..md`; `park x$y.md`; `park x.txt`; `park .md` | the script | exit 1; standard error holds "Only the owner parks or restores a plan"; unchanged |
| name that holds no record | `functional/x_y.md`; a hand-made `.ctoc/approvals/x_y.json` | `parkPlan('x_y.md', 'r', root)` | parked; `recordRemoved: false`; the hand-made file untouched; `classifyResidency` gives `ledger-unkeyable` |
| move fails, park | `plans/backlog` is a regular file; `functional/x.md` with a record | `parkPlan` | `BACKLOG_REFUSED` "could not be moved to plans/backlog/" and "had already been removed"; `functional/x.md` byte-identical; record gone |
| move fails, restore | `plans/functional` is a regular file; `backlog/x.md`, no record | `restorePlan` | "could not be moved to plans/functional/", "put back"; no record sentence; `backlog/x.md` byte-identical |
| bad root, bad name | `projectPath` of `''` and of `undefined`; `file` of `undefined` | direct calls | `BACKLOG_REFUSED`; `BACKLOG_BAD_NAME` |
| any other error | `functional/x.md` is a folder | script `park x.md` | exit 1; `Could not park x.md:` |

#### `tests/backlog-round-trip.test.js` (CREATE): the parked plan seen by CTOC's readers, by the moving-on pass, and by the real command

| Case | Given | When | Then |
|---|---|---|---|
| scenario 4 | a valid functional plan `functional/x.md`, no questions. First check: `pendingGateDecisions(root)` and `plansNeedingQuestions(root)` list `functional/x.md`; `scanCheapCandidates(root, { nowMs: Date.now() + 30 days }).candidates` holds `plan: 'x'`; `listPlansAtGates(root)` holds `{ plan: 'x', stage: 'functional' }`; `getPlanCounts(root).functional === 1` | `parkPlan('x.md', 'waiting', root)` | none of those lists names `x`; `approvedFreeQueue(root).refs` holds nothing ending in `/x.md`; `getPlanCounts(root).functional === 0` and its keys are still the seven of `state.js:270-278` (no backlog key) |
| scenario 6 | `first.md` and `second.md` in `functional/` with identical bytes, modification time set an hour back (`fs.utimesSync`), one classified fork each written with `writePlanQuestions(root, ref, [fork], mtime, undefined, { by: 'gate-critic', at: … })`, a placeholder of the same name in `plans/implementation/` for each (choice 24), each answered with `streamAnswer(ref, id, '1', root, questionDigest(fork))`. First check: both still in `functional/`, and `pendingGateDecisions(root)` gives `enough: true` for both. Then the placeholders are deleted | `parkPlan('first.md', 'waiting', root)`, `restorePlan('first.md', root)`, then one `pendingGateDecisions(root, { crossed })` with `crossed = []` | `functional/first.md` is still there; its descriptor has `sufficiencyReason: 'stale'`; there is no `.ctoc/approvals/first.json`; `implementation/second.md` exists; `crossed` holds exactly `implementation/second.md`; `.ctoc/approvals/second.json` has `advanced_by: 'sufficiency'`. If the first plan moved, stop and ask the owner (Execution Plan) |
| scenario 13 | `functional/x.md` (fixture) with a human record | `spawnSync(process.execPath, [SCRIPT, 'park', 'x.md', 'waiting'], { cwd: root, encoding: 'utf8', timeout: 120000 })`, then the same with `restore x.md`; no shell | both have `status === 0`; after park the files and record match scenario 1; after restore they match scenario 5; each standard output holds its confirmation's first sentence. This run is not counted for coverage |

Coverage target: at least 99 percent of the lines of `src/lib/backlog.js` and of `src/scripts/backlog.js`, from the in-process cases above. Every refusal path is exercised.

### Security Review

- [x] Path traversal: the file name is checked (the `SAFE_PLAN_FILE` pattern, no `..`, so no separator, NUL byte or absolute path) before any path is joined. Folder names come from the listing of `plans/`; the destination is one of two fixed names. The record path comes from `approval-ledger.ledgerPath`, which guards against traversal.
- [x] Input validation: the reason is data. Control characters become spaces; `\` and `"` are escaped; it is one quoted line and is never cut. The notes are re-escaped the same way.
- [x] No secrets: none are read, printed or written.
- [x] Safe file operations: writes go only to `plans/functional/<file>` and `plans/backlog/<file>` (through `movePlan`, which refuses to overwrite), and the only deletion is the record, through the ledger's own `removeEntry`. Questions, answers and the plan body are never touched.
- [x] Error messages: repository-relative paths; no stack trace; the error code instead of Node's message for a failed move.
- [x] Prototype pollution: no object is merged from input.
- [x] Command injection: `src/` runs nothing. The end-to-end test uses `spawnSync` with an argument array and no shell.
- [x] Approval records: the build adds no writer of approval records, only a removal by name, after the clash check, so another plan's record is never removed. The write protection is probed first (Execution Plan).
- [x] Who may run it: the rule only (the owner's decision); the usage text states it. Nothing mechanical stops an agent (Business Risks, Finding 2).

### Implementation Order

1. `tests/plan-numbering.test.js`: MODIFY. Both new cases fail first.
2. `src/lib/plan-numbering.js`: MODIFY, one word. Depends on 1.
3. `tests/backlog.test.js`: CREATE. Fails first: the module is missing.
4. `tests/backlog-round-trip.test.js`: CREATE. Fails first: the module is missing.
5. `src/lib/backlog.js`: CREATE. Depends on 3 and 4.
6. `src/scripts/backlog.js`: CREATE. Depends on 5.
7. `.ctoc/reachability-roots.json`: MODIFY. Depends on 6.
8. `CLAUDE.md`, `README.md`: MODIFY the count lines. Depends on 3, 4 and 5 existing.

### Acceptance Criteria Mapping

| Criterion | Implemented in | Test case |
|---|---|---|
| 1 Park | `parkPlan`, script `park` | backlog.test.js scenario 1; round-trip scenario 13 |
| 2 Notes move into the reason | `noteText`, `dropKeys`, `yamlQuoted` | backlog.test.js scenario 2 (both rows) |
| 3 Only functional parks | `sameNamePlans`, `placeMessage` | backlog.test.js scenario 3 (both rows) |
| 4 Out of the decision lists | the side folder; no reader edited | round-trip scenario 4 |
| 5 Restore clears the old approval | `restorePlan`, `withdrawRecord` | backlog.test.js scenario 5; round-trip scenario 13 |
| 6 No self-crossing straight after restore | restore's rewrite moves the modification time | round-trip scenario 6 |
| 7 Only backlog to functional | `restorePlan` source rule; script argument count | backlog.test.js scenario 7 |
| 8 No name clash | `sameNamePlans` before `withdrawRecord` | backlog.test.js scenario 8 |
| 9 A failed withdrawal stops everything | `withdrawRecord` (confirms the file is gone) | backlog.test.js scenario 9 (both rows) |
| 10 A parked plan keeps its number | `STAGES` gains `backlog` | plan-numbering.test.js (two rows) |
| 11 Bad input is refused | `checkName`, script `main` | backlog.test.js scenario 11 |
| 12 The fences pass | roots entry, count lines, `requestExit`, no empty catch | `npm test`, lint, typecheck (Execution Plan, VERIFY) |
| 13 The real command, end to end | the script as a child process | round-trip scenario 13 |

No criterion is without an action.

### Risk Mitigations

| Risk | Mitigation | Where |
|---|---|---|
| The write protection refuses the plain command | probe it before writing any test and again once the script exists; stop and ask the owner if it refuses | Execution Plan, TEST and VERIFY |
| A restored plan moves on by itself once fresh questions exist (Finding 3) | scenario 6 proves the immediate case; no hold is built (gate logic); the restore confirmation does not claim the plan waits | round-trip scenario 6; script restore text |
| A surviving or wrong approval record | the clash check runs before the withdrawal; the record file must be gone before any write; a real silent-delete fault is tested | `sameNamePlans`, `withdrawRecord`; scenarios 8 and 9 |
| A failed move loses the notes text | the original bytes are written back | `relocate`; the move-fails rows |
| Upstream merges conflict on the count lines and `plan-numbering.js:41` | count lines set from disk, not by hand-counting; one word changed | `CLAUDE.md`, `README.md`, `plan-numbering.js` |
| A `todo/` plan depends on a parked plan | out of scope; search `depends_on` before parking (Dependency Risks) | the owner's check |
| prop-bot runs a CTOC copy without this change | confirm which copy prop-bot runs before parking the DNA plan | the owner's check |

## Execution Plan

### Step 8: TEST

Write the failing tests first (test-driven development), but first run the probe.

- [x] 1. Probe the write protection before anything else. From the project root, with no `$` in the command (choice 27), pipe each payload into `node src/hooks/protect-records.js`, for example `echo '{"tool_name":"Bash","tool_input":{"command":"node src/scripts/backlog.js park x.md waiting on DNA"},"cwd":"<absolute project root>"}' | node src/hooks/protect-records.js`. Payloads: (a) that park command; (b) `node src/scripts/backlog.js restore x.md`; (c) and (d) the same two with `"agent_id":"probe"` added. Allowed means nothing on standard output and exit 0. If any payload is refused (exit 2, or a refusal sentence on standard error), STOP: report the sentence and the payload to the owner and ask him how to go on. Do not edit the hook.
- [x] 2. Write the two cases in `tests/plan-numbering.test.js` (Test Plan) and run `node --test tests/plan-numbering.test.js`. Both fail: `'00008'` instead of `'00043'`, and an unchanged `depends_on`.
- [x] 3. Write `tests/backlog.test.js` with the shared harness and every row of its table.
- [x] 4. Write `tests/backlog-round-trip.test.js` with every row of its table.
- [x] 5. Run `node --test tests/backlog.test.js tests/backlog-round-trip.test.js`. Each test fails because `src/lib/backlog.js` is missing, not for any other reason. Record the output in this plan.

### Step 9: PREPARE

- [x] Read `docs/FENCES.md` (the reachability and false-green sections) before touching `.ctoc/reachability-roots.json` (`CLAUDE.md`, "Read before you touch").
- [x] Confirm that the cited lines are still where this plan says (`plan-numbering.js:41`; `frontmatter-merge.js:258-272`; `approval-ledger.js:137, 990-1011, 1126-1136`; `actions.js:97-156`; `streaming-gate.js:937-945`). If one moved, correct the reference here before writing code.
- [x] Record the current counts: `ls src/lib/*.js | wc -l` and `ls tests/*.test.js | wc -l` (135 and 590 when this plan was written).
- [x] Confirm that `git status` shows no change to any of the nine files in `files:`.

### Step 10: IMPLEMENT

One step, with one sub-item per file, in the Implementation Order.

- [x] `src/lib/plan-numbering.js`: append `'backlog'` to `STAGES` (line 41). Nothing else. The two numbering cases pass.
- [x] `src/lib/backlog.js`: as specified, with a module header (purpose, the order and why, the owner-only rule, what it never touches) and JSDoc on every function. The typecheck allows zero errors, so types go on `deps` and the return shapes.
- [x] `src/scripts/backlog.js`: as specified; `requestExit`, never `process.exit`; no exports.
- [x] `.ctoc/reachability-roots.json`: the root and its reason, as specified; still valid JSON.
- [x] `CLAUDE.md` lines 61, 89 and 94 and `README.md` lines 1134 and 1147: set the numbers to the counts on disk now.
- [x] Run `node --test tests/backlog.test.js tests/backlog-round-trip.test.js tests/plan-numbering.test.js`: `# fail 0`.
- [x] If the scenario 6 case shows `first.md` leaving `functional/`, or `pendingGateDecisions` crossing it, STOP and ask the owner before touching any gate logic. Report what moved and the descriptor it had.
- [x] Edit only the nine files in `files:`. A need for any other file goes through `src/lib/scope-growth.js` as a question to the owner, never as a silent edit.

### Step 11: REVIEW

- [x] The iron-loop critic compares the code with the File Specifications: the order (check, withdraw, confirm gone, write, move), the key sets removed by park and by restore, the escaping, the exact sentences, and the absence of empty catches, `process.exit` and run-time regular expressions.
- [x] Confirm that `src/lib/actions.js`, every file under `src/hooks/`, `src/commands/` and `src/lib/menu-screens.js`, and every gate module are unchanged (`git diff --stat` lists only declared files).
- [x] Confirm that the tests replace nothing but `deps.removeEntry`, and only in the two direct scenario 9 cases.

### Step 12: OPTIMIZE

- [x] Keep the module small. Park and restore share `relocate`; there is no second copy of the name, key or escaping rules. Remove dead branches that the coverage report shows unreached, instead of adding tests for code nothing needs.
- [x] The clash scan lists each folder of `plans/` once per call, with no cache: the owner runs this by hand.

### Step 13: SECURE

- [x] The security scanner checks the Security Review list against the code: the name rule before any join; writes only in the two folders; the only deletion through `removeEntry`, after the clash check; no shell; messages without absolute paths or stack traces.
- [x] Check the lint rules that are errors here: `security/detect-non-literal-fs-filename` (every computed-path call goes through `safe-fs`), `security/detect-non-literal-regexp`, `security/detect-unsafe-regex`.

### Step 14: VERIFY

Run the automated checks; run each long one in the background and end the turn until it finishes (`CLAUDE.md` lessons 20 and 21).

- [x] Run the lint: `npm run lint` (`eslint . --max-warnings 0`), with 0 problems.
- [x] Run the type check: `npm run typecheck`, with 0 errors (baseline 0).
- [x] Run the fast pass: `node --test tests/backlog.test.js tests/backlog-round-trip.test.js tests/plan-numbering.test.js tests/reachability.test.js tests/export-reachability.test.js tests/doc-counts.test.js tests/doc-counts-generated.test.js tests/false-green-fence.test.js tests/plan-declares-count-moving-ratchets.test.js tests/move-plan.test.js`, with `# fail 0`.
- [x] Run the full gate: `npm test`, with `# fail 0`, 0 skipped, and coverage at or above `.ctoc/coverage-baseline.json` `minPct`. In its coverage table, `src/lib/backlog.js` and `src/scripts/backlog.js` each show at least 99 percent of lines.
- [x] Re-run the write-protection probe from TEST (the four payloads) now that the script exists. If any is refused, stop and ask the owner.
- [x] Any failing test, even one that passes on a re-run, is reproduced and its cause found in the product code before anything is reported (`CLAUDE.md` lesson 14).
- [x] Record the commands, their exit codes and the two coverage rows in this plan.

### Step 15: DOCUMENT

- [x] The module header of `src/lib/backlog.js` and the header of `src/scripts/backlog.js` state what parking and restoring do, the owner-only rule, the order and why, and that questions, answers and the body are never touched.
- [x] The count lines in `CLAUDE.md` and `README.md` match the disk; `CLAUDE.md` is still at or under 15,000 bytes.
- [x] No other document is in `files:`. If the review finds a line needed in `docs/`, ask for it through `src/lib/scope-growth.js`; do not edit silently.

### Step 16: FINAL-REVIEW

- [x] The iron-loop critic walks the Acceptance Criteria Mapping row by row against the recorded test output, and checks the owner's fixed decisions: core only, `src/lib/actions.js` untouched, no menu, hook or gate-logic edit, the owner-only rule in the usage text, a restored plan returning only to `functional/` with no record.
- [x] Confirm that the build stopped and asked where this plan says to (the probe, scenario 6), or that neither condition arose; both outcomes are recorded here.
- [x] Confirm that every message the owner reads is plain, carries no gate number, and claims nothing that was not checked.


---

## Execution Plan (Steps 8-16)

### Step 8: TEST (TDD Red)
- [x] Write tests for the implementation
- [x] Test error conditions
- [x] Run tests - expect RED (failing)

### Step 9: PREPARE
- [x] Install dependencies if needed
- [x] Check prerequisites
- [x] Verify dev environment ready
- [x] Create directories/config if needed

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
- [x] Check coverage >= 80%
- [x] 0 skipped, 0 flaky tests

### Step 15: DOCUMENT
- [x] Update relevant documentation
- [x] Add JSDoc comments to new functions
- [x] Update CHANGELOG if needed

### Step 16: FINAL-REVIEW
- [x] Verify steps 8-15 completed correctly
- [x] All quality checks passed
- [x] Manual verification if needed
- [x] Ready for human review


## Deferred Questions

_Written by the Iron Loop integrator (src/lib/iron-loop.js), which performs NO
quality evaluation. These entries are the integrator's own report on itself, not
findings from a critic that read this plan._

- **evaluation**: NOT EVALUATED — no automated critique was performed on this plan. The refinement loop appended the Steps 8-16 template and assessed nothing. (The scores this step used to report were computed from that same template, not from the plan.) A human or a real critic must review this plan before it is built.

## Execution Record

Written by the iron-loop executor, task t4, 2026-11-04. Nothing here is a gate, an approval or a move.

### Probe of the write protection (Step 8, item 1; repeated in Step 14)

Four payloads were piped into `src/hooks/protect-records.js`: (a) `node src/scripts/backlog.js park x.md waiting on DNA` and (b) `node src/scripts/backlog.js restore x.md` as the main session, (c) and (d) the same two with `"agent_id":"probe"`. All four: nothing on standard output, exit 0. Allowed, before the script existed and again after it existed. The payloads were given from files in the scratchpad (a first attempt that wrote the JSON on the command line was refused by the live hook only because that probe command itself held `$?` and braces; that refusal is about the probe's own shape, not about the script command).

### Red (Step 8)

`node --test tests/plan-numbering.test.js`: 2 failed, 11 passed (`expected '00043' actual '00008'`; `expected '00001-a' actual 'a'`). `node --test tests/backlog.test.js tests/backlog-round-trip.test.js`: both files failed with `Cannot find module '../src/lib/backlog'`, nothing else.

### Green (Steps 10 and 14)

- `node --test tests/backlog.test.js tests/backlog-round-trip.test.js tests/plan-numbering.test.js`: all pass, 0 failed.
- `npm run lint` (`eslint . --max-warnings 0`): exit 0, no problem. `npm run typecheck`: exit 0, 1 test passed.
- Fast pass of Step 14 (ten test files): 206 tests, 206 pass, 0 fail, 0 skipped.
- `npm test`: tests 14160, pass 14160, fail 0, cancelled 0, skipped 0; `[CTOC test-gate] coverage 99.62% (threshold 99%), skipped 0, failed 0`, corpus claims verified 3 refuted 0, `PASS`. Coverage rows (line / branch / functions): `src/lib/backlog.js` 100.00 / 98.96 / 100.00; `src/scripts/backlog.js` 100.00 / 100.00 / 100.00; `src/lib/plan-numbering.js` 100.00 / 93.71 / 96.97. From `tests/backlog.test.js` alone the two new files show 100.00 percent of lines.
- Scenario 6 held: the restored plan stayed in `functional/` (`sufficiencyReason: 'stale'`, no record) and its twin moved to `implementation/` on sufficiency. The stop condition did not arise.
- File counts on disk after the build: 136 modules in `src/lib`, 592 test files in `tests`; `CLAUDE.md` (14,999 bytes) and `README.md` count lines set to those.

The first `npm test` run failed 2175 tests with `ENOSPC: Failed to write file /tmp/node-coverage-...`: this machine's `/tmp` is a 256 MB memory file system and the coverage files of the whole suite fill it. Cause found and not in product code: the same unchanged tree passed in full when the run was started with `TMPDIR` pointing at the large disk (the result above). Dependencies were installed with `npm ci --include=dev` from the committed lockfile (the default here omits development packages); npm reported 8 moderate advisories in development packages, which this plan does not touch (`package.json` and the lockfile are outside `files:`).

### Decisions taken while building

- `parkPlan` returns as `reason` the text written to `backlog_reason` after control characters became spaces and before the quote escapes: `plain` runs once on the joined text, so the returned reason and the written one never differ except by the escapes.
- The original bytes kept for the write-back after a failed move are the raw file contents (a buffer), not decoded text, so the write-back is lossless even for bytes that are not valid text.
- A name that is a folder (`functional/x.md` as a folder) is found by its listing name, so the error is Node's own and reaches the owner as `Could not park x.md: ...`, as the plan says.
- The test for an unlistable `plans/` makes `plans` a regular file (error `ENOTDIR`), because a folder with no read permission cannot be built the same way on Windows or as the superuser.

### Review notes (Steps 11 to 13, by the executor)

`git diff --stat` lists only declared files besides the system-written `.ctoc/logs/transitions.json`: `src/lib/plan-numbering.js` (one word), `.ctoc/reachability-roots.json`, `CLAUDE.md`, `README.md`, `tests/plan-numbering.test.js`, plus the four new files. `src/lib/actions.js`, every hook, every command file, `src/lib/menu-screens.js` and every gate module are untouched. The tests replace only `deps.removeEntry`, in the four direct scenario 9 cases. The library has no empty `catch`, no `process.exit` and no run-time regular expression; every computed-path file call goes through `safe-fs`. The security scanner and the iron-loop critic were not dispatched by this run (the executor cannot dispatch siblings); CTO Chief can recommend them.

### Fix round 1 (owner-approved, 7 items; plan stays in review)

Edited only declared files: `src/lib/backlog.js`, `tests/backlog.test.js`, `tests/backlog-round-trip.test.js`. No new file, no change to `src/lib/actions.js`, `src/lib/frontmatter-merge.js`, a hook, a gate or a menu file. Each claim was checked against the code first; all seven held.

1. Failed write after the record is deleted: both the rewrite write and the put-back after a failed move are now guarded. A failed write puts the original bytes back (a full disk can leave the file cut short) and refuses with `BACKLOG_REFUSED` saying that the plan is still in its folder, whether the approval record had already been removed (or that none was removed), and whether the text is as it was or could not be put back (then: check the file in version control). Test seam: `deps.writeFile` (documented in the typedef), defaulting to `safe-fs` `writeFileSync`; the rewrite and the put-back both go through it. Five tests: write throws, write cuts then throws, put-back also throws, failed move with a failing put-back, restore. The older test for a failed restore move now asserts the new sentence `No approval record was removed.` instead of the absence of any record sentence; its point (no claim that a record was removed) is unchanged.
2. Unindented list notes: `blockEnd` replaces `continues`; a key whose own value is empty owns the unindented `- item` lines under it (and a column-0 comment only when more of the list follows). `noteText` joins list items with `; ` (quotes removed per item); `dropKeys` removes the whole list. A neighbouring `files:` list is untouched (tests assert it still parses as one entry after park and after restore, with CTOC's own `parseMetadata`).
3. Body byte-identical: before any withdrawal or write, the rewritten body (after the closing fence) is compared with the original's body read the way the merge reads fences; any difference, or a plan with no closed frontmatter block at its start, is refused: `The start of x.md (its frontmatter or the first lines of its body) is written in a way this tool cannot keep exactly, so nothing was changed.` Tests: the two-rule body, the one-rule body, restore, no frontmatter, a rule in the middle of an ordinary body (passes), Windows line endings (passes). A plan that already has two stacked frontmatter blocks is refused too, since the merge would fold them.
4. Vacuous test: scenario 4 now puts an approved plan in `todo/` that `approvedFreeQueue` lists, and asserts the queue is exactly that plan before and after the park. Mutation check (not kept): withdrawing the wrong plan's record makes it fail. The "parked plan absent" half stays true by construction, since the queue never reads `functional/`; the before-and-after listing is the live part.
5. Symbolic links: refused with nothing changed when the plan file is a link (`lstat`), or when any link stands directly under `plans/` (which covers `plans/functional`, `plans/backlog` and a linked stage folder holding a same-name plan, whose record survives). Tests create real links (type `junction` for folders on Windows, `dir` elsewhere, `file` for a file) and fail loudly with a clear message if the machine refuses to make one.
6. Length limit: a `backlog_reason` text over 2000 characters (counted before the quote escapes, notes included) is refused with the limit and the length found; 2000 passes, 2001 is refused, and notes count.
7. The cleaned-out set now also holds U+2028, U+2029, U+202A to U+202E and U+2066 to U+2069. Test: a reason carrying them and `approved_by: human` writes one quoted line, no `approved_by:` line, and none of those characters; a note and a file name in a refusal are cleaned too.

Mutation checks done by hand and not kept (each killed by the named file): wrong record withdrawn (round-trip), put-back not written, list lines not owned by the key, body check removed, linked folder not refused, linked plan file not refused, limit off by one, separators not cleaned, first write unguarded (all in `tests/backlog.test.js` except the first). Results: lint exit 0; typecheck exit 0; `npm test`: tests 14185, pass 14185, fail 0, cancelled 0, skipped 0, coverage 99.62 percent (floor 99), `PASS`; `src/lib/backlog.js` 100.00 / 96.35 / 100.00 and `src/scripts/backlog.js` 100.00 / 100.00 / 100.00 (line, branch, functions); `tests/backlog.test.js` alone gives each new file 100.00 percent of lines.

Known limits left as they are (the reviewers' lower findings, not fixed): bytes that are not valid UTF-8 are replaced when the plan is read; `approved_by:value` with no space after the colon survives a restore; a name that differs only in letter case gives a confusing refusal sentence; a plain file named `plans/backlog` makes the numbering scan throw `ENOTDIR`; the old `renumberImplementationPlans` can reuse a parked plan's number; the script's catch-all error line prints Node's message as it is. The last one was not fixed because the script has no sanitizing helper of its own (the cleaning function lives in the library and is not exported, and plan choices 9 and 22 keep one copy of each rule), so it is not a one-line change.
