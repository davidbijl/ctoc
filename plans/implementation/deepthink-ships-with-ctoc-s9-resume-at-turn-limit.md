---
title: "A deepthink reading agent stopped at its turn limit is resumed once, with a fixed message, to write its result before the run counts as failed"
type: implementation
parent_plan: deepthink-ships-with-ctoc
depends_on: deepthink-ships-with-ctoc-s6-paper-program, deepthink-ships-with-ctoc-s7-launch-fence-and-briefs
priority: medium
effort: small
files:
  - skills/deepthink/SKILL.md
  - tests/deepthink-ships-with-ctoc.test.js
  - .ctoc/audit/deepthink-improvement/skills/deepthink/SKILL.md.json
  # Only if the owner answers the open question below with "count-the-resume"; remove these
  # two lines before this slice is approved to build if he answers otherwise.
  - .claude-plugin/hooks.json
  - tests/pretooluse-task-coverage.test.js
---

# A deepthink reading agent stopped at its turn limit is resumed once, with a fixed message, to write its result before the run counts as failed

**Scope (one line):** the owner's answer `resume-once` to `h-deepthink-r3-turn-limit-relaunch` — the skill resumes the same reading agent once when Claude Code marks its result partial at the turn limit, the pinned failed-run sentence and the order of a run say so, and the task, the record-first rule and the resume tool are settled. **One open question blocks this slice:** how the launch fence counts a resumed agent.

Read first: the parent index; the owner-list entry `h-deepthink-r3-turn-limit-relaunch`; `src/hooks/PreToolUse.Task.js` and `src/hooks/SubagentStop.js` in full, above all the stop hook's "correlation caveat"; `src/commands/start.md`, the work-dispatch steps; slice 7.

## Implementation Details

### What the owner decided, and what is settled here

**Decided (2026-10-05):** when a result is marked partial at the turn limit, resume the same reading agent once, asking it to write the result from what it read, before counting the run failed. The entry's evidence (read 2026-10-02 by round 3's research): Claude Code "marks the returned result as partial output, and Claude can resume the subagent to continue", and "Claude uses the SendMessage tool with the agent's ID or name as the to field to resume it".

**Settled here, because each has one honest answer:**

- **The task's state.** A resume continues the run already recorded. The task stays `running` under the same task identifier and the agent identifier stamped by `menu task start --agent-id`; nothing is recorded with `menu task add`, nothing is started again, and the task is closed once — complete or fail — after the check of the text the resumed agent returns.
- **The record-first rule.** `src/commands/start.md` forbids launching a background agent before it is recorded and the scheduler has decided ("forbids an unrecorded agent"). A resumed agent is not unrecorded: it is the recorded agent of a running task. No new record is made, and the brief's Failures section says the run reached its turn limit and was resumed once, so the owner sees it.
- **Whether the session holds the resume tool.** Not verifiable from the repository; the skill makes it a condition. With `SendMessage` the session resumes; without it, or when the message is refused or the agent cannot be reached, the text first returned is checked, exactly as today. Nothing else is tried in its place.
- **What the message carries.** A fixed sentence, with no placeholder, so no text from the web or from the returned result can enter it.

**Not settled — the open question below:** the launch fence takes a place when an agent is launched and gives one back when an agent stops (`src/hooks/SubagentStop.js` releases the oldest live place, by count, not by identity). The agent stopped at its limit has already given its place back. A resume runs it again through `SendMessage`, which the fence does not see.

### OPEN QUESTION — blocking this slice: how the launch fence counts a resumed reading agent

This slice is not ready for the owner's approval to build until he answers; the answer fixes its hooks part and its `files:` list.

**Evidence.** If a resumed agent's stop fires the stop hook again, that stop gives back a place the resume never took, so from then on the fence counts one fewer agent than are running, until every subagent has stopped; the fence's own header calls this the corruption it exists to prevent ("the cap silently over-subscribes from then on"). If it does not fire, a counted resume holds its place until the stop hook's thirty-minute reap frees it. Whether the stop hook fires on a resumed agent's stop is **not verified**; neither is whether the resumed agent runs in the background (if it does not, the session waits for that one resume, against the skill's never-wait rule).

| Option | Pros | Cons |
|---|---|---|
| `count-the-resume` — the fence also matches `SendMessage` (matcher `Task`, `Agent` and `SendMessage`), so a resume takes a place before it runs | Never counts fewer agents than are running, whichever way the unverified fact falls. | A hook change; a `SendMessage` that is not a resume, or a resumed agent whose stop does not fire the hook, holds a place until the thirty-minute reap, and a launch in that window may be refused. |
| `do-not-count` — no hook change | No hook change; nothing is held. | If a resumed agent's stop fires the stop hook, the fence lets a sixth agent run until every subagent has stopped. |
| `measure-first` — one live resume with hook logging on records whether the stop hook fires again, whether the session holds `SendMessage`, and whether the resume runs in the background, before either is built | The design rests on what the runtime does. | Needs a run that reaches the turn limit; the resume waits until then. |

**Recommended: `count-the-resume`**, because it is the only option that never lets the fence count fewer agents than are running, and an over-count heals itself through the reap while an under-count does not. It needs the owner's approval as a hook change.

### The skill — `skills/deepthink/SKILL.md` (modify)

Record the fingerprint first. Each target found by its text, exactly once.

**R1. The tools line.** `tools: Task, Read, Write, Bash, Glob, Grep` becomes `tools: Task, Read, Write, Bash, Glob, Grep, SendMessage`, so slice 8's sentence ("records the tools a run of this skill uses") stays true.

**R2. The brief's turn rule.** Replace

```
Your run is stopped after 80 turns, and a result stopped there is thrown away.
```

with

```
Your run is stopped after 80 turns; if it is stopped there, you are sent one fixed message asking you to write your result from what you have already read, with no further search or fetch, and a result still without its closing line is thrown away.
```

The prefix check 18 reads, `Your run is stopped after 80 turns`, is kept.

**R3. The order of a run, step 6.** Replace

```
and when it is missing stop here, because the run failed (see "When the reading agent reports")
```

with

```
and when it is missing stop here and follow "When the reading agent reports", which resumes a run stopped at its turn limit once and otherwise fails it
```

**R4. "When the reading agent reports".** Directly before the paragraph that begins `If the returned text lacks its closing line`, add this paragraph, followed by a blank line:

```
When Claude Code marks the returned text as partial because the reading agent reached its turn limit, and this session holds the `SendMessage` tool, send that same agent, once, addressed by the agent id its launch returned, exactly this message and nothing else: `Your turn limit was reached. Make no further search or fetch. Write your result now from what you have already read, with the paper list and the closing line.` The task stays running under the same task id: nothing new is recorded, started or launched, and the brief's Failures section says the run reached its turn limit and was resumed once. The text the resumed agent returns is the text checked below; with no `SendMessage` tool, or when the message is refused or the agent cannot be reached, the text first returned is the text checked.
```

Then, in the paragraph that follows, replace

```
If the returned text lacks its closing line, or the brief file is missing,
```

with

```
If the returned text lacks its closing line, after the one resume the turn-limit rule above allows, or the brief file is missing,
```

The rest of that sentence, the relaunch from recording and the second-failure rule, is unchanged.

**R5 — only on `count-the-resume`.** In `.claude-plugin/hooks.json`, the fence's matcher becomes `Task|Agent|SendMessage`.

**R6. The record.** Append to `after_the_rounds` one entry: `plan` `deepthink-ships-with-ctoc-s9-resume-at-turn-limit`; `answers` `h-deepthink-r3-turn-limit-relaunch` / `resume-once`; the fingerprints chained from the last entry to the skill after R1 to R4.

### The checks, written first

In `tests/deepthink-ships-with-ctoc.test.js`, pins changed, each with its justification — the contract from outside the test is the owner's answer `resume-once`; the test changes because the pinned sentences counted a result cut off at the limit as a failed run with no resume; what newly fails is a skill that relaunches from recording without first resuming once:

- **Check 2:** the tools line becomes `tools: Task, Read, Write, Bash, Glob, Grep, SendMessage`.
- **Check 6:** `FAILED_RUN_SENTENCE` and `RUN_ORDER_SENTENCE` become the sentences R4 and R3 produce.

**36. A turn-limit resume is made once, with a fixed message, and settles the task.** The skill holds the paragraph R4 adds, word for word; the message between its backticks contains no `<` and no `>`, so it holds no placeholder that text could be put into; the skill no longer contains `a result stopped there is thrown away`, and contains `Your run is stopped after 80 turns; if it is stopped there`.

**Only on `count-the-resume`,** in `tests/pretooluse-task-coverage.test.js`: the "WIRED" case's names become `['Agent', 'SendMessage', 'Task']` (contract: the owner's answer; what newly fails: a fence that does not count a resume); and a spawned `SendMessage` payload takes a place, counts toward the sixth-launch refusal with `Task` and `Agent` launches, and the stop hook gives it back.

**Not provable by a test, said plainly:** that a session reaching the turn limit resumes as told. Only a run that reaches the limit shows it; slice 4's real run may or may not reach it.

### The runs to record, in order

1. **With the checks written, before any edit:** checks 2, 6 and 36 fail (and, on `count-the-resume`, the "WIRED" case and the new `SendMessage` case). Recorded.
2. **Skill edited, record not yet:** check 24 fails on `fingerprint-on-disk`.
3. **Record written (and, on `count-the-resume`, the matcher edited):** everything passes.

### Tests that must stay green

`tests/deepthink-ships-with-ctoc.test.js`, `tests/plugin-skill-discovery.test.js`, `tests/architecture-invariants.test.js`, `tests/gate-numbers-fence.test.js`, `tests/instruction-surfaces-say-the-moment.test.js`; on `count-the-resume` also `tests/pretooluse-task-coverage.test.js`, `tests/the-dispatch-seat-says-whether-it-is-live.test.js` and `tests/reachability.test.js`. Then `npm test`.

### Wiring — the live call sites

The resume is an instruction in the skill, reached through `/ctoc:deepthink`; the session carries it out with its own tool. On `count-the-resume`, the manifest entry is the fence's wiring, as in slice 7. No code is added.

### Security review

- **The message is fixed text**; nothing from the web or from the returned result reaches it, and the resumed agent holds the same web-only grant.
- **The resumed result is data**, checked exactly as a first result is; a result still without its closing line fails the run.
- **One resume only**; a second stop at the limit is not resumed.
- **The fence:** on `count-the-resume` a resume is counted before it runs; on `do-not-count` the under-count stated in the open question can occur.
- No secret, account path or e-mail address enters the skill or the tests.

### Acceptance criteria

- A result marked partial at the turn limit is resumed once, with the fixed message, before the run is counted failed (check 36; owner answer `resume-once`).
- The pinned failed-run sentence and the order of a run say so (check 6).
- The task stays running under its identifiers through the resume, nothing new is recorded, and the brief names the resume.
- The fence counts the resume as the owner's answer to the open question says.
- The record accounts for the skill's new fingerprint (check 24).

## Decisions Taken Under Ambiguity

1. **The resume is conditional on the session holding `SendMessage`**, with today's behaviour as the fallback, because whether the session holds it cannot be read from the repository.
2. **A fixed message with no placeholder**, so the resume cannot become a channel for untrusted text.
3. **No new task record and no new dispatch record for a resume**; the brief's Failures section names it, so the owner still sees it.
4. **The tools line gains `SendMessage`** so slice 8's sentence about that line stays true.
5. **The fence's counting is put to the owner**, not chosen here: it is a hook change, and the right choice turns on a runtime fact nobody has measured.
6. **Check number 36 belongs to this slice.**

## Execution Plan (Steps 8-16)

### Step 8: TEST (TDD Red)
- [ ] Write tests for the implementation — checks 2 and 6 changed, check 36 added; on `count-the-resume`, the fence's cases
- [ ] Test error conditions — no placeholder in the message; the old turn rule gone
- [ ] Run tests - expect RED (failing) — run 1 above, recorded

### Step 9: PREPARE
- [ ] Install dependencies if needed — none
- [ ] Check prerequisites — the owner's answer to the open question is recorded in this plan; fingerprints taken
- [ ] Verify dev environment ready — record the Node version
- [ ] Create directories/config if needed — none

### Step 10: IMPLEMENT
- [ ] Implement the feature according to requirements — R1 to R4, R6, and R5 on `count-the-resume`
- [ ] Add error handling — the fallback when no resume is possible
- [ ] Wire up integration points — on `count-the-resume`, the manifest's matcher

### Step 11: REVIEW
- [ ] Self-review all new code — through CTOC's review agent
- [ ] Verify integration points work together — step 6, the resume paragraph and the failed-run sentence read as one order
- [ ] Check error handling completeness — every way a resume can fail ends in the existing check

### Step 12: OPTIMIZE
- [ ] Remove redundant operations — none
- [ ] Optimize critical paths — not applicable
- [ ] Simplify complex code — not applicable

### Step 13: SECURE
- [ ] Validate inputs (no path traversal) — through CTOC's security scan agent: the fixed message, the fence's count
- [ ] Sanitize outputs — not applicable
- [ ] No secrets in code — none
- [ ] Safe file operations — not applicable

### Step 14: VERIFY
- [ ] Run lint + type check — `npm run lint` and `npm run typecheck`, both exit status 0
- [ ] Run ALL tests (TDD Green) — `npm test`
- [ ] Check coverage >= 80% — at or above the floor read from `.ctoc/coverage-baseline.json`
- [ ] 0 skipped, 0 flaky tests — none

### Step 15: DOCUMENT
- [ ] Update relevant documentation — the skill is the documentation
- [ ] Add JSDoc comments to new functions — none added
- [ ] Update CHANGELOG if needed — no changelog file exists in the repository

### Step 16: FINAL-REVIEW
- [ ] Verify steps 8-15 completed correctly — through CTOC's final review agent
- [ ] All quality checks passed — `npm test` on the final bytes
- [ ] Manual verification if needed — a run that reaches the turn limit, when one happens
- [ ] Ready for human review — through the menu's task completion
