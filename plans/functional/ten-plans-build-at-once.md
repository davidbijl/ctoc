---
title: "Ten plans build at once instead of five"
type: functional
status: functional
created: 2026-10-15
priority: medium
effort: small
files:
  - src/lib/task-registry.js
  - src/lib/agent-slots.js
  - src/lib/menu-screens.js
  - src/lib/actions.js
  - src/lib/task-reconcile.js
  - src/lib/circuit-breaker.js
  - src/hooks/PreToolUse.Task.js
  - src/hooks/SubagentStop.js
  - src/commands/start.md
  - agents/iron-loop/iron-loop-executor.md
  - CLAUDE.md
  - README.md
  - docs/PROJECT_REFERENCE.md
  - docs/OPERATING_LESSONS.md
  - .ctoc/templates/CLAUDE.md.template
  - tests/fixtures/claude-md-rule-inventory.json
  - tests/task-registry.test.js
  - tests/agent-slots.test.js
  - tests/pretooluse-task-coverage.test.js
  - tests/plans-keep-moving-without-the-human.test.js
  - tests/task-reconcile.test.js
  - tests/w10-live-agent-reconcile.test.js
  - tests/scheduler-enforced.test.js
  - tests/menu-screens-coverage.test.js
  - tests/menu-protocol.test.js
  - tests/scheduler-guarantees-under-mutation.test.js
depends_on: none
---

# Ten plans build at once instead of five

## 1. ASSESS — Problem Understanding

The owner, 2026-10-15: "raise concurent plans limit to 10, it is now 5, do that in the
ctoc so we can push it", then "this is parallel processing of plans". So the subject is
how many plans CTOC builds at the same time: five today, ten after.

What the code does today (read 2026-10-15):

1. **The number.** `src/lib/task-registry.js:122` holds `const MAX_CONCURRENT = 5;`.
   The first rule of the scheduler, `evaluateConcurrency` (lines 929-931), refuses with
   `max-concurrent` when that many tasks are running. `canRun`, `nextRunnable` (the
   promote list) and `addAndClaim` (which `actions.startAgent` calls to claim a build)
   all go through it. Plans whose declared `files:` do not overlap build side by side;
   plans that share a file wait (`file-conflict`). This constant is the cap on plans
   built in parallel.
2. **The same number caps background agents.** `src/lib/agent-slots.js:51` imports
   `MAX_CONCURRENT` from the scheduler. `src/hooks/PreToolUse.Task.js` uses agent-slots
   to refuse a launch past the cap. Every building plan runs as one background agent,
   so the agent cap has to move with the plan cap. Otherwise it would still hold plans
   to five. That hook is not loaded today: `hooks/hooks.json` registers only
   `src/hooks/protect-records.js` (checked; `docs/ENFORCEMENT.md` line 3 says the
   same). So the cap that is live today is the scheduler's.
3. **A second, separate limit.** `src/lib/menu-screens.js:2632`, inside
   `continueAfterCrossing`, runs `for (let i = 0; i < 5; i++) { … actions.startAgent(root) … }`.
   `continueAfterCrossing` is the continuation after `menu task complete --continue`,
   `stream approve` and `stream answer`. It starts at most five builds per pass, even
   when more approved plans could build.
4. **Wording that contradicts the code.** These lines say plans build one at a time:
   - `CLAUDE.md:147`: "Plans one at a time, never in parallel. Other independent work fans out, at most 5 background subagents at once."
   - `docs/PROJECT_REFERENCE.md:241-251`: "Plans: ALWAYS sequential", "Never parallelize plan implementation", "up to 5 concurrent subagents". The table also lists "Plan implementation" under "Must serialize".
   - `.ctoc/templates/CLAUDE.md.template:128`: "Plans are ALWAYS processed sequentially". This template is installed into user projects.

   The scheduler has built file-disjoint plans in parallel since the file-based model
   replaced one-build-at-a-time (`task-registry.js` header, lines 10-17).
5. **Other text that says five for this limit:**
   - `src/commands/start.md`: lines 65, 212, 255 and 322
   - `agents/iron-loop/iron-loop-executor.md:52`
   - `README.md`: lines 195 and 400
   - Comments:
     - `task-registry.js`: lines 14 and 1001
     - `actions.js:1793`
     - `menu-screens.js`: lines 553, 2202 and 2576
     - `task-reconcile.js:22`
     - `agent-slots.js`: lines 4, 7 and 16
     - `SubagentStop.js:8`
     - `PreToolUse.Task.js`: lines 6-39 and 215-216
   - The hook's refusal sentence at `PreToolUse.Task.js:126`: "no phrase creates a sixth place to run".
   - `src/lib/circuit-breaker.js:44` gives the old "Never parallelize plan implementation" rule as the reason it needs no lock. The real reason is different. Each plan's kickback counter is its own file, `.ctoc/state/kickbacks/<slug>.json`, and only that plan's build writes it.
6. **Tests that hold the old value.** Each of these either sets five as the value or fills the cap with a hand-written five:
   - `agent-slots.test.js:69`
   - `task-registry.test.js`: lines 176, 599-603, 1050-1052 and 1348-1349
   - `task-reconcile.test.js:175`, four live agent ids written out by hand
   - `w10-live-agent-reconcile.test.js:178-201`
   - `scheduler-enforced.test.js:98-112`
   - `menu-screens-coverage.test.js:876-898`
   - `menu-protocol.test.js:316-329`

   Three more files describe the cap as "sixth" or "five":
   - test names in `pretooluse-task-coverage.test.js`
   - test names in `agent-slots.test.js`
   - comments quoting the source in `scheduler-guarantees-under-mutation.test.js`

   The rule inventory `tests/fixtures/claude-md-rule-inventory.json` holds the
   PROJECT_REFERENCE sentences as r0085, r0086 and r0087. Changing those sentences
   needs `new` plus `old_home: "docs/OPERATING_LESSONS.md"`, and the old words kept
   there word for word (`tests/claude-md-keeps-every-rule.test.js:90-101`). The same
   test caps CLAUDE.md at 15,000 bytes. The CTO Chief measured it at 14,983.

## 2. ALIGN — Approach

- `MAX_CONCURRENT` becomes 10. It stays the one shared number for plans and background
  agents.
- `continueAfterCrossing` loops up to `taskRegistry.MAX_CONCURRENT` times instead of
  using the literal 5.
- The text in items 4 and 5 is rewritten to say what the code does:
  - plans whose declared files do not overlap build in parallel, up to 10 at once;
  - plans that touch the same file wait for each other;
  - the same 10 caps background agents.

  The hook's refusal sentence becomes number-free, for example "no phrase creates
  another place to run". The circuit-breaker comment gives the per-plan sidecar file
  as its reason.
- Proposed `CLAUDE.md:147`, all plain characters, 126 bytes counted by hand against 112
  today. That gives about 14,997 bytes, under 15,000; measure the real size with
  `fs.statSync` at build:

  ```text
  Plans with disjoint `files:` build in parallel, a shared file waits. At most 10 background subagents at once, builds included.
  ```
- In `docs/PROJECT_REFERENCE.md`:
  - "Plan implementation" leaves the "Must serialize" column and becomes "Plan implementation (same file)".
  - The "When 5 are running…" sentence says 10.
  - r0085, r0086 and r0087 each get a `new` holding the replacement sentence exactly as written in that file.
- `docs/OPERATING_LESSONS.md` gets a section "Replaced on the owner's instruction of
  2026-10-15". It keeps word for word, each with the file it came from:
  - the three pinned sentences;
  - the old `CLAUDE.md:147` line;
  - the old template sentence.
- Tests that hold five as the value or fill the cap by hand are changed to fill it with
  `MAX_CONCURRENT` and assert the refusal at exactly the cap. The boundary is still
  asserted, so no assertion gets weaker. The two tests that pin the value move from 5
  to 10.

## 3. CAPTURE — Acceptance Criteria

Each item below is a runnable check.

- [ ] **The eleventh build waits.** Given 10 build tasks with disjoint files running,
  when an 11th file-disjoint build is checked with `canRun`, then it is refused with
  `max-concurrent`. Given 9 running, the 10th is allowed. Tested in
  `tests/task-registry.test.js`.
- [ ] **The promote list fills to ten.** Given 11 queued disjoint builds and none
  running, `nextRunnable` returns exactly 10, the first ten in order. Tested in
  `tests/task-registry.test.js`.
- [ ] **One continuation pass starts ten.** Given 11 approved, file-disjoint plans ready
  to build, when one `continueAfterCrossing` pass runs, then 10 plans are in
  `plans/in-progress/` with running build tasks and the 11th is still in `plans/todo/`.
  Tested in `tests/plans-keep-moving-without-the-human.test.js`.
- [ ] **A shared file still waits.** Given one running build and a second plan that
  touches one of the same files, with fewer than 10 running, the second is refused with
  `file-conflict`. Tested in `tests/task-registry.test.js`.
- [ ] **The agent cap is the same ten.** `agentSlots.MAX_CONCURRENT ===
  taskRegistry.MAX_CONCURRENT === 10`. Ten acquires succeed and the eleventh returns
  `{ ok: false, reason: 'max-concurrent', running: 10 }`. Tested in
  `tests/agent-slots.test.js`.
- [ ] **No file still says one-at-a-time or five for this limit.** The files are:
  - `CLAUDE.md`, `README.md`, `docs/PROJECT_REFERENCE.md`, `.ctoc/templates/CLAUDE.md.template`
  - `src/commands/start.md`, `agents/iron-loop/iron-loop-executor.md`
  - the eight source files in `files:`

  A case-insensitive search of those files finds no match for this pattern:

  ```text
  plans? (one at a time|sequentially)|ALWAYS sequential|processed sequentially|Never parallelize|never in parallel|up to (5|five)\b|≤ ?5\b|5-slot|five[- ]concurrent|five-subagent|5 concurrent|5 background|When 5 are running|\bsixth\b|five are running|five live|at five\b|`5` in CTOC
  ```

  Run before the build on 2026-10-15, this pattern hits 33 lines in 14 files. Each one is
  a line this plan changes, and none is an out-of-scope five.

  The positive half: `CLAUDE.md`, `docs/PROJECT_REFERENCE.md`, the template, `README.md`,
  `start.md` and the executor agent each state 10 for this limit.
- [ ] **CLAUDE.md fits.** `CLAUDE.md` is at or under 15,000 bytes. All of
  `tests/claude-md-keeps-every-rule.test.js` passes, with the old words of r0085-r0087
  present in `docs/OPERATING_LESSONS.md`.
- [ ] **The whole suite passes.** `npm test` passes, with the coverage floor met and
  nothing skipped.

## Scope

**In:** the constant, the continuation loop, and the text and tests listed above.

**Out — these fives mean something else and stay:**
- kickback maximum per plan (`circuit-breaker` `PER_PLAN_MAX`)
- compare-and-swap retry counts: `task-registry` `WITH_REGISTRY_ATTEMPTS`, `quality-state`, `traceability-matrix`
- display caps:
  - `menu-screens` `WEDGE_RENDER_CAP`
  - `loop-b-driver` `NAME_CAP`
  - the `task-view` decision-ready lines
  - the top-5 lists in related-plans and duplicate-guard
  - the overview and inbox slices
  - `src/areas/pipeline.js` conflict rows
- the refinement-loop budget
- the rate limits of 5 per hour in `.ctoc/operations`
- the size of the gate-critique fleet in `agents/coordinator/cto-chief.md:174`
- the "creating 5 skill files" example at `PROJECT_REFERENCE.md:251`, which is still true at a cap of 10
- the historical quote at `PreToolUse.Task.js:108`
- dated records under `.ctoc/audit/` and `.ctoc/eval/`

**Out:** registering the Task hook.

## Decisions Taken Under Ambiguity

- **One shared number for plans and background agents.** Every build is one background
  agent, so a separate agent cap of five would still hold plans to five (item 2).
- **The continuation loop reads the shared constant** instead of a second literal. A
  second literal is how this limit split in two in the first place.
- **The hook's refusal sentence becomes number-free.** It reads correctly at any cap, and
  the message already prints the cap as "N of MAX".
- **The Task hook stays unregistered.** Today it is dormant. Registering it is a separate
  decision about hooks, and that decision is the owner's.
- **The owner's request covers only this.** It is his OK for this one value change in the
  scheduler, the hook text and the documentation that states the value, and for nothing
  more.
- **Tests that pinned five are corrected to the cap, not weakened.** They fill to
  `MAX_CONCURRENT` and still assert the refusal at exactly the cap. They were plainly
  wrong once the owner changed the value. The search for them was by pattern, so it can
  miss a test that fills the cap some other way. The build's full `npm test` run is the
  authority. Any further test it turns red is reported through `src/lib/scope-growth.js`,
  never edited silently.
- **The old CLAUDE.md line and the old template sentence are also kept** in
  `docs/OPERATING_LESSONS.md`, although no test pins them. The existing "Replaced on the
  owner's instructions" section keeps old CLAUDE.md words the same way.
