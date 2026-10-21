---
title: "The launch fence answers to the launch tool under both its names, Task and Agent, and a test holds that no plan reader takes a deepthink brief for a plan"
type: implementation
parent_plan: deepthink-ships-with-ctoc
depends_on: none
priority: medium
effort: small
files:
  - .claude-plugin/hooks.json
  - tests/pretooluse-task-coverage.test.js
  - tests/deepthink-ships-with-ctoc.test.js
---

# The launch fence answers to the launch tool under both its names, Task and Agent, and a test holds that no plan reader takes a deepthink brief for a plan

**Scope (one line):** the launch fence's matcher in `.claude-plugin/hooks.json` becomes `Task|Agent`, with checks that the real hook reads an `Agent` launch exactly as it reads a `Task` launch; and one check that every plan reader, scan and the session-start hook leave `plans/vision/deepthink/*.md` alone.

Read first: the parent index; the owner list `.ctoc/audit/deepthink-improvement/for-the-human.json`, entries `h-deepthink-r1-launch-fence-matcher` and `h-deepthink-r1-briefs-under-plans-vision`; `src/hooks/PreToolUse.Task.js` and `src/hooks/SubagentStop.js` in full; `src/lib/dispatch-seat-liveness.js`, its header.

## Implementation Details

### Why this slice exists — the owner's answers it carries

| Subject | Owner-list entry | Answer |
|---|---|---|
| The launch fence is registered on the tool name `Task`, which Claude Code renamed `Agent` in version 2.1.63; if the old name no longer fires, the fence sees no launch | `h-deepthink-r1-launch-fence-matcher` | `match-both` |
| Nothing pins that the plan readers ignore the briefs under `plans/vision/deepthink/` | `h-deepthink-r1-briefs-under-plans-vision` | `pin-it` |

Changing a hook's behaviour needs the owner's approval; the answer above and the owner's approval of this slice to build are that approval.

**What supports the change, read on 2026-10-05.** `src/lib/dispatch-seat-liveness.js` records a measurement of 2026-07-20, taken inside a live launch on this repository: the launch fence was declared and installed, "yet it left NO artifact for a real dispatch". That is what a matcher that never fires looks like. The dashboard's own recipe (`src/commands/start.md`, the work-dispatch steps) launches with `Agent(run_in_background)`.

### The manifest — `.claude-plugin/hooks.json` (modify)

In the `PreToolUse` entry whose command runs `src/hooks/PreToolUse.Task.js`, change `"matcher": "Task"` to `"matcher": "Task|Agent"`. Nothing else in the file changes. The form `A|B` is the one the manifest already uses for `Write|Edit|MultiEdit` and `Read|Edit|Write|Bash`. One launch carries one tool name, so it fires this entry once whichever name the installed Claude Code sends.

**The hook file is not changed.** `PreToolUse.Task.js` reads `tool_name` only to log it (`tool`) and takes its label from `tool_input.subagent_type`, then `tool_input.description`; neither depends on the tool's name. `SubagentStop.js` releases a slot without reading a name. `dispatch-seat-liveness.isTaskEntry` counts a log entry with a `subagent` field as launch evidence, which an `Agent` launch's entry carries. The checks below prove each of these on an `Agent` payload rather than assume it; if one fails, the build stops and asks through the scope-growth question for the hook file, never edits it unplanned.

### The checks, written first

#### In `tests/pretooluse-task-coverage.test.js`

**One check changed, with its justification.** The case "both hooks are actually WIRED in .claude-plugin/hooks.json" finds the fence by `e.matcher === 'Task'`. It now finds the `PreToolUse` entry whose first command matches `src/hooks/PreToolUse.Task.js`, and asserts that its matcher, split on `|` and sorted, equals `['Agent', 'Task']`. Contract from outside the test: the owner's answer `match-both`, and Claude Code's sub-agents page (read 2026-10-02): "In version 2.1.63, the Task tool was renamed to Agent." Why the test and not the code: it pins the exact string the answer replaces. What newly fails: a fence registered on either name alone, or on anything more.

**A new group, "the fence answers to the Agent tool name and reads its payload the same way".** A helper `agentPayload(extra)` returns `{ tool_name: 'Agent', tool_input: { subagent_type: 'code-reviewer', description: 'review the diff', run_in_background: true }, ...extra }`.

1. **In process, under the cap:** `enforce(agentPayload())` in a project marked as CTOC exits 0, emits no deny, takes one slot (`activeCount` 1), and the last enforcement-log entry has `tool: 'Agent'`, `subagent: 'code-reviewer'`, `outcome: 'allow'`.
2. **The label falls back the same way:** `getLabel` on an `Agent` payload with only `description` returns that description; with neither, `'subagent'`.
3. **The real hook, spawned as the harness spawns it:** five launches alternating the names — `Task`, `Agent`, `Task`, `Agent`, `Agent` — all exit 0; a sixth with `Agent` is denied (the deny decision on standard output, exit status 2), standard error says `5 of 5 subagent slots are in use` (built from `MAX_CONCURRENT`, never a literal), and the last log entry has `tool: 'Agent'` and `outcome: 'block'`. One count covers both names.
4. **The real stop hook gives the place back** after an `Agent` launch: `activeCount` returns to 0.
5. **The doctor's seat check reads an `Agent` launch as a launch:** after one `Agent` launch, `seatLiveness(root).sources.enforcementLog` is `'has-task'`.

**What these checks cannot prove, said plainly:** that the installed Claude Code fires this hook for a launch under either name with the new matcher. They prove the hook reads an `Agent` payload correctly once fired. Only a live launch with hook logging on can show the matcher firing; slice 4's real run observes it.

#### In `tests/deepthink-ships-with-ctoc.test.js` — check 34

**34. No plan reader, scan or session-start hook takes a deepthink brief for a plan.** A sandbox project, built as `tests/session-start-question-dispatch.test.js` builds one (every stage folder under `plans/`, an empty `.ctoc/`), holding:

- the brief `plans/vision/deepthink/a-probe-item.md`, whose first line is `Prepared 2026-10-02 for deepthink; a probe item; not yet asked`, then the fixed second line the skill writes, then 2,500 characters;
- a control vision plan, `plans/vision/control-vision-plan.md`, with a title in its frontmatter;
- a control functional plan, `plans/functional/control-functional-plan.md`, with the valid body that test uses, so the gate scanners have something to list.

Each reader is run for real, and each must list its control (so a reader that silently lists nothing fails by name) and must not name `a-probe-item` anywhere in its result (checked on the serialised result):

1. `state.readPlans(<plans/vision>)` and `tabs/vision.js` `readVisions(<plans/vision>)` list `control-vision-plan`; `state.getVisionCounts` and `tabs/vision.js` `getVisionCounts` count one vision plan.
2. The dashboard, spawned as `node <repository>/src/commands/start.js menu dashboard` with the sandbox as working folder: its output, with colour codes stripped, shows one vision plan and does not contain `a-probe-item`. The exact form of the vision count line is read from a run at Step 8 and pinned as read.
3. `streaming-gate.pendingGateDecisions(root)`, `streaming-precompute.plansNeedingQuestions(root)` and `inbox.listPlansAtGates(root)` each name `control-functional-plan`.
4. `stale-detector.scanCheapCandidates(root)` reports `unreadCount` 0 and no candidate whose path contains `deepthink/`.
5. `SessionStart.questionDispatchDirective(root)` names `functional/control-functional-plan.md`; and the real session-start hook, spawned with the sandbox as working folder, exits 0 and prints nothing containing `a-probe-item`. If the hook needs an environment variable to run, the check sets exactly what Claude Code sets (the plugin root, as the repository), read at Step 9.

The check's comment names what it does not cover: an agent told to search `plans/vision/` with a file-search tool, which reaches any file there; a reader written later that this check does not call (the answer's own stated cost); and the plan-index hook (`src/hooks/PostToolUse.plan-index-sync.js`), which matches plan files at any depth and which the parent's scenario 12 asks slice 4's real run to observe.

### The runs to record, in order

1. **With every check written, before the manifest edit:** `node --test tests/pretooluse-task-coverage.test.js tests/deepthink-ships-with-ctoc.test.js`. Expected to fail: the changed "WIRED" case (the matcher is `Task`). Expected to pass, and recorded as the evidence that the hook already reads an `Agent` payload: the new in-process and spawned cases 1 to 5, which drive the hook directly and do not read the matcher; and check 34, which pins behaviour the owner list measured. A case that fails here is a finding about the hook, not about the matcher, and stops the build.
2. **After the manifest edit:** everything passes.

### Tests that must stay green

`tests/pretooluse-task-coverage.test.js`, `tests/the-dispatch-seat-says-whether-it-is-live.test.js`, `tests/dispatch-seat-liveness-coverage-holes.test.js`, `tests/reachability.test.js` (it reads the manifest's commands), `tests/iron-loop-enforcer.test.js`, `tests/gate-migration.test.js`, `tests/gate-hook-revival.test.js`, `tests/installer-paths.test.js`, `tests/step-label-hook-claim-matches-manifest.test.js`, `tests/session-start-question-dispatch.test.js`, `tests/deepthink-ships-with-ctoc.test.js`; then `npm test`.

### Wiring — the live call sites

- **The fence's caller is Claude Code itself:** the manifest entry is the wiring; this slice changes which launches reach it. The hook, the stop hook and the seat check keep their callers.
- **Check 34 adds no code**; it pins existing behaviour.

### Security review

- **The fence now fires on launches under the `Agent` name.** A session that could start a sixth background agent under that name because nothing fired is refused at the sixth, with the existing message saying why and that waiting is the remedy. That is the fence's purpose.
- **No double count:** one launch has one tool name and fires this one entry once. If Claude Code already fired the old `Task` entry for an `Agent` launch as an alias, the change is a no-op for counting, because the old entry is replaced, not kept beside the new one.
- **Unchanged:** no escape phrase lifts the fence; it fails open on an internal error; the human-gate hook keeps its `*` matcher.
- **Check 34** reads and writes only inside a temporary folder and spawns two of CTOC's own programs there.
- No secret, account path or e-mail address enters the manifest or the tests.

### Acceptance criteria

- `.claude-plugin/hooks.json` registers `PreToolUse.Task.js` on `Task|Agent`, and the "WIRED" check holds exactly those two names (owner answer `match-both`).
- An `Agent` payload is fenced, labelled, logged, counted, released and read as a launch exactly as a `Task` payload is (cases 1 to 5).
- Check 34 fails if any named reader, scan or the session-start hook lists a brief, and fails if a reader lists nothing (owner answer `pin-it`).
- **Feeds** parent scenario 7 (a full fence is reported honestly) and scenario 12 (the vision stage does not change; this check holds the readers, slice 4's run observes the plan-index hook).

## Decisions Taken Under Ambiguity

1. **The hook file is not edited**: its fields do not depend on the tool's name, and the checks prove it on an `Agent` payload. A failing check stops the build and asks; the file is not widened into scope silently.
2. **The matcher holds exactly two names**, `Task|Agent`. Whether the fence should also count a resumed agent is a separate open question, carried by slice 9; this slice does not anticipate its answer.
3. **Check 34 lives in the plan's own test file**, not a new file, so it moves no documented test count.
4. **Every reader gets a control plan it must list**, so the check can never pass on a reader that read nothing.
5. **The plan-index hook is named as not covered** rather than added: the owner list's measurement did not include it, and the parent gives that observation to slice 4's real run.
6. **Check number 34 belongs to this slice**, so slices built in any order never reuse a number.

## Execution Plan (Steps 8-16)

### Step 8: TEST (TDD Red)
- [ ] Write tests for the implementation — the changed "WIRED" case, the five `Agent` cases, check 34
- [ ] Test error conditions — the sixth launch under the `Agent` name is denied; a reader that lists nothing fails by name
- [ ] Run tests - expect RED (failing) — run 1 above, with the reason for each failure and each expected pass

### Step 9: PREPARE
- [ ] Install dependencies if needed — none
- [ ] Check prerequisites — record the fingerprints of the three files; read what environment the session-start hook needs to run in a sandbox
- [ ] Verify dev environment ready — record the Node version
- [ ] Create directories/config if needed — none

### Step 10: IMPLEMENT
- [ ] Implement the feature according to requirements — the one matcher edit in `.claude-plugin/hooks.json`
- [ ] Add error handling — none needed: the hook's handling is unchanged
- [ ] Wire up integration points — the manifest entry is the wiring

### Step 11: REVIEW
- [ ] Self-review all new code — through CTOC's review agent
- [ ] Verify integration points work together — the spawned cases drive the real hook and the real stop hook
- [ ] Check error handling completeness — fail-open and the final refusal are unchanged and still tested

### Step 12: OPTIMIZE
- [ ] Remove redundant operations — nothing to remove
- [ ] Optimize critical paths — not applicable: one matcher string
- [ ] Simplify complex code — not applicable

### Step 13: SECURE
- [ ] Validate inputs (no path traversal) — through CTOC's security scan agent: the widened fence, no double count, no escape
- [ ] Sanitize outputs — the block message is unchanged
- [ ] No secrets in code — none
- [ ] Safe file operations — check 34 writes only in its temporary folder

### Step 14: VERIFY
- [ ] Run lint + type check — `npm run lint` and `npm run typecheck`, both exit status 0
- [ ] Run ALL tests (TDD Green) — `npm test`
- [ ] Check coverage >= 80% — at or above the floor read from `.ctoc/coverage-baseline.json`
- [ ] 0 skipped, 0 flaky tests — none

### Step 15: DOCUMENT
- [ ] Update relevant documentation — none needed: no document names the matcher's string
- [ ] Add JSDoc comments to new functions — `agentPayload` carries a comment
- [ ] Update CHANGELOG if needed — no changelog file exists in the repository

### Step 16: FINAL-REVIEW
- [ ] Verify steps 8-15 completed correctly — through CTOC's final review agent
- [ ] All quality checks passed — `npm test` on the final bytes
- [ ] Manual verification if needed — a live launch is slice 4's
- [ ] Ready for human review — through the menu's task completion
