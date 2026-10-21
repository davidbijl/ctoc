---
title: "Only a critique the menu launched can move a plan"
type: implementation
created: 2026-10-12
priority: high
effort: large
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s23-no-command-can-start-the-menu-for-a-background-agent, four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s21-background-agents-do-not-open-the-dashboard
files:
  - src/hooks/protect-records.js
  - src/lib/streaming-questions-sweeper.js
  - src/lib/streaming-precompute.js
  - src/lib/streaming-gate.js
  - src/lib/menu-screens.js
  - src/lib/task-registry.js
  - src/commands/start.md
  - docs/ENFORCEMENT.md
  - .gitignore
  - tests/protect-records.test.js
  - tests/streaming-questions-sweeper.test.js
  - tests/plans-keep-moving-without-the-human.test.js
  - tests/real-question-file-render.test.js
  - tests/sufficiency-evidence.test.js
revision: 1
rejection_reason: "Owner's answer of 2026-10-17, Refuse decision routes (Recommended): background agents are refused on"
tag: rejected
---
# REVISION 1

## Rejection Feedback

Owner's answer of 2026-10-17, Refuse decision routes (Recommended): background agents are refused only the routes that record his decisions (stream approve, stream answer, stream comment, inbox answer, the approve actions); his 2026-10-15 removal stands for everything else. Re-plan to that scope.

---

## Revision 3 (2026-10-19): the owner's answers folded in

The gate critique of 2026-10-18 recommended sending revision 2 back (its ruling's recommended option, "Send this plan
back for rework"). On that ruling the owner chose CTOC's Hold instead (`.ctoc/streaming/answers.jsonl` line 178:
`questionId` `ctoc-hold`, `optionKey` `hold`, `holds: true`, `heldOn` `q99-gate-ruling-r1792323789864`). Every other
question of that critique he answered with its key 1 (lines 160-176, the coverage note among them), and the adoption
question himself (line 198). This revision folds in all of them. It is the last review round the iron loop allows.
Where revision 2 or revision 1 below says otherwise, this section decides; the specification, test, acceptance, risk
and step sections below are edited to match it. The send-back block at the top stays as the record.

**His Hold stands, and this plan does not move by itself.** A hold is matched by the plan's file name, so it survives
revisions and stage moves, and only a later `ctoc-hold` entry with the key `release` and CTOC's digest ends it
(`readAnsweredQuestionIds`, `src/lib/streaming-precompute.js` lines 1036-1043 and 1119-1128, read on 2026-10-19). No
release follows line 178 in the log (every line naming this plan's file, read on 2026-10-19). So the menu asks him to keep
or release it first, and only his release moves it on (Decision 58). Nothing in this revision claims otherwise.

**The owner's decision: adopt it now.** Question `q11-adopt-the-attribution-record-now-r1792323789864`, answer "Adopt
it now, knowing it only stops honest mistakes" (`.ctoc/streaming/answers.jsonl` line 198, `ts`
2026-10-18T12:21:58.428Z, `optionKey` 1). He knows it stops only honest mistakes, and the hook's `recordWaitingWrite` is
part of what he adopted. Step 8 binds that line by its `ref`, `questionId`, `optionKey` and `questionDigest`. The
question file a later critique files carries new ids; the answer is never looked up under them (the gate critic's note
on its ruling).

**The detail answers, all key 1:**
1. **Test case 10b's verdict is bound** (`q10-clash-refusal-test-goes-vacuous`, line 160). `tests/sufficiency-evidence.test.js`
   case 10b (lines 295-314 on 2026-10-19) hands `crossBySufficiency` a verdict it made itself. Unbound, the crossing would
   refuse before `crossingBlocked` (`src/lib/streaming-gate.js` line 911) and the case would stay green without reaching
   the same-name clash it exists for. Its verdict gains the hash of the plan text, as case 10's does, and a mutant that
   drops the collision line (line 871) must make it fail (Decision 48).
2. **The fail-closed design stays, with its first live check after the release** (`q12-agent-id-match-fails-closed`,
   line 162). Risks and Step 15 already say so; nothing changes.
3. **Step 16 reads one answer, and revision 1's decisions are marked void** (`q13-revision-1-approvals-left-in-the-plan`,
   line 164). Step 16 checks against the one answer of line 198. Decisions 18 and 34 are marked superseded, and the two
   closing bullets the menu wrote for revision 1's critique of 2026-10-16 are marked void where they stand (Decision 56).
4. **`dropPending` completes what it starts, and all thirteen call sites are listed**
   (`q14-fixture-leaves-a-critique-running`, line 166; Decision 49).
5. **Case 110 stays as written** (`q15-test-pins-the-shell-forgery-route`, line 168): it pins the owner's removal of
   2026-10-15.
6. **A case for a refused Write, and the gap named among the residuals** (`q16-record-written-before-the-write-runs`,
   line 170): S24-21 and residual 6 (Decision 53).
7. **A guard, with a case, for a critique of the same plan that is still running**
   (`q17-classification-can-supersede-a-precompute`, line 172): `queueClassification` queues no classification while a
   `precompute` or `classify` task of that plan is queued or running (`'critique-running'`); S24-22 (Decision 50).
8. **The orphaned case is worded truthfully** (`q18-orphaned-check-told-as-unfinished`, line 174): `checkState` gains
   `'orphaned'`, with a line that claims neither that the check finished nor that it did not; S24-23 (Decision 51).

**The decision-route plan builds first.** `depends_on` adds
`four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s21-background-agents-do-not-open-the-dashboard`, which
crossed into the build queue with the owner's module-level rule of 2026-10-19. Both plans edit
`src/hooks/protect-records.js`, `tests/protect-records.test.js`, `tests/plans-keep-moving-without-the-human.test.js`,
`src/commands/start.md` and `docs/ENFORCEMENT.md`. Its neighbour table calls the spans disjoint (its row on this plan),
and Step 9 re-reads them. What its rule changes here:
- A background agent may run CTOC's menu only for its read-only views and a task's completion without `--continue`.
  `menu task add`, `menu task start` (the stamp included), `fail`, `cancel`, `stream check` and every decision route are
  refused to it in every form the hook reads. It may not run CTOC code that loads a module writing plans, tasks,
  answers, approvals, check records or settings: inline code, a preload, CTOC's own scripts. `node --test` and
  `npm test` stay allowed, and the build agent keeps its own plain completion.
- It does not stop a script file the agent writes and then runs, a path built at run time, or a shell write of the
  records, which the owner's removal of 2026-10-15 leaves open.
- So the stamp `menu task start <id> --agent-id <its own id>` is no longer an ordinary command for a background agent,
  and the denial-of-service forms through `menu task add`, `start`, `fail` and `cancel` need a script too. Residual 1
  still holds with ordinary commands: a shell append to the waiting-folder record and a shell write of the task registry,
  which holds the critic and the text hash. Wherever the text below says that nothing refuses a background agent the
  stamp, or that slice 21 refuses it only `--force`, read this paragraph.
- Nothing in this plan has a background agent run the menu or CTOC's writer code. The session starts and stamps every
  critique, and the gate critic only writes its file with the Write tool. This plan's own build is a background agent:
  its test runs stay allowed, and Step 12 measures through a throwaway `node --test` file, never through inline code
  (Decision 54).

**What moved on the main checkout since revision 2** (re-read on 2026-10-19, `VERSION` 6.14.133):
- `src/hooks/protect-records.js` holds the real-file resolver and the sweep refusal at the head of `bashRefuses`
  (lines 1056-1061). It also holds the settings protection for background agents (the owner, 2026-10-15, "fix that
  gap"): `isAgentSettingsTarget` and `REFUSAL_AGENT_SETTINGS` in `decide`'s editing branch (line 1127), and
  `agentSettingsSpecs` on the shell (line 1076). `decide`'s editing branch is lines 1115-1129, and
  `RECORD_REFUSALS_OFF` is line 1053. The record line goes after every refusal of that branch, the settings one
  included.
- So Claude Code's settings files are no longer refused to nobody. A background agent's Write of
  `{"disableAllHooks": true}` into the project's `.claude/settings.local.json` is refused, within that protection's own
  limits (`docs/ENFORCEMENT.md`, "What it cannot catch", lines 554-581 on 2026-10-19). Residual 5, the Problem Statement
  and Neighbours are corrected to that.
- `menu task start <id>` without `--agent-id` records no agent (`agentTaskId: p.agentId || null`,
  `src/lib/menu-screens.js` line 2588), and `--agent-id` must be the launched agent's own id, never the task id (lines
  2507-2511). The stamp branch accepts a running task whose recorded agent is not a real agent id
  (`taskReconcile.isRealAgentId`, line 2541; `src/lib/task-reconcile.js` lines 228-239). Wherever the text below says a
  start records the task's own id as a placeholder, read: it records no agent. An id equal to the task id, written up to
  6.14.130, reads as none.
- The reconcile reads a task without a real agent id as unknown, never as dead. Such a task is orphaned only past the
  staleness floor (30 minutes for a critique, `DEFAULT_STALE_MS`, `src/lib/task-reconcile.js` line 103), and only a
  confirmed sweep and the Doctor's "Repair state" key run the reconcile (the same file, lines 68-76). S24-11 moves past that floor, and Decision 10 and the Neighbours
  bullet on non-build tasks are corrected.
- `src/commands/start.md` now starts a non-build task once, after its launch, with `--agent-id` (WORK dispatch step 2,
  line 124; COMPLETION step 3, line 135; the classification paragraph, line 385). A gate critique started that way
  would record the plan's text after its critic began reading, so this plan's start-first order is still needed. Its
  seven changes are re-anchored on today's text below.
- Two pins hold. The build sentences of `tests/the-session-claims-a-build-before-launching-it.test.js` case 2 stay word
  for word. So does the literal its case 1 finds at its line 70, `if (kind === 'start' && task.status === 'running'`:
  the late stamp of a gate critique is a branch of its own after the existing stamp branch, never a change to that
  branch's condition (Decision 52).
- `tests/protect-records.test.js` holds cases 100-138: the sweep work's 100-108 and the settings protection's 112-138.
  Every number this plan gave its hook cases (108-115) is taken, so Step 9 numbers them after the last case the file
  then holds.
- `tests/plans-keep-moving-without-the-human.test.js` already requires `spawnSync` (line 22), so the new `dropPending`
  adds no second require.
- The inbox answer record `.ctoc/streaming/inbox-answers.jsonl` and five files in `.ctoc/streaming/inbox-answered/` now
  exist in the main checkout. Neither path is in git's index (an exact search of `.git/index` for
  `.ctoc/streaming/inbox-answer`: no match; the same search finds `.ctoc/streaming/answers.jsonl`). So `.gitignore`'s two
  lines ignore them without untracking anything.
- The installed copy is 6.14.133 (one profile's `installed_plugins.json`, read on 2026-10-19).
- The owner decided there will be no GitHub Actions. This plan names none (search
  `GitHub Actions|\bCI\b|workflow|\.github` over this plan: no match), so nothing is removed.

**`files:` lists fourteen files, two over the build's usual dozen — a need waiting for the owner.** This revision adds
none; all fourteen were declared before. Decision 17's reason is unchanged: the attribution's files mean something only
together, and split, the hook's record and the menu's record would each ship as data nobody reads. The text binding
(`streaming-precompute.js`, `streaming-gate.js`'s crossing, and its two test files) could ship alone, but only by
splitting this slice into two plans in its last review round. The recommendation, put to him in the planner's report:
keep it as one slice of fourteen files.

### Decisions Taken Under Ambiguity (revision 3; the owner's answers of 2026-10-18, folded in on 2026-10-19)

48. **Case 10b is bound as case 10 is** (the owner's answer to q10). Its verdict gains
    `critiquedPlanSha256: require('node:crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex')`. Its
    assertions are unchanged; what changes is that they now pass because `crossingBlocked` refuses the clash, which the
    collision-line mutant proves (Step 10). No new assertion is needed, read in the code on 2026-10-19: with the collision
    line dropped, `writeSufficiencyEntry` reaches `persistEntry`, whose only refusal is a different `plan_basename`
    (`src/lib/approval-ledger.js` lines 885-895; both entries carry `suff-clash`), so it overwrites the other
    destination's entry atomically (lines 905-912); `movePlan` then refuses the resident at the destination
    (`src/lib/actions.js` lines 121-126); and `crossBySufficiency`'s rollback removes the entry (`src/lib/streaming-gate.js`
    lines 935-940). The case's last read of that file then throws, so the case fails. Not run; Step 10 runs it.
49. **`dropPending` completes the critique it starts, without `--continue`** (the owner's answer to q14). The session
    completes a critique when its gate critic returns. The fixture does the same after the file is written, but leaves
    out `--continue`, because each of its thirteen callers decides itself when a continuation runs (case 4 through a
    planner's completion, B9 through the plan screen's sweep, the rest through `continueAfterCrossing`). A done critique
    still counts (`COUNTED_CRITIQUE_STATUSES`), so every caller tests what it tested, and B9 and B9b see no task queued
    or running.
50. **The guard covers any gate critique of the plan that is queued or running** (the owner's answer to q17, which
    named a running precompute). The same supersession follows from a classification of the same plan that is queued or
    running, and so does the same wrong sentence: "it waits for your approval" would be false while a check of it is on
    its way. So `queueClassification` answers `'critique-running'` for either kind, before its same-revision test, and
    the continuation's sentence says "a check of it is already queued or running". An orphaned, cancelling, failed,
    cancelled or done critique does not hold it: the menu cannot tell whether an orphaned one's agent lives, and holding
    every new check behind it could hold the plan until the owner acts. A precompute whose gate critic's file was
    already dropped while it still runs holds the new check until the session completes it; that completion's
    continuation queues the check (S24-20 a).
51. **The orphaned line claims neither outcome** (the owner's answer to q18). The menu cannot tell from its registry
    whether an orphaned critic wrote its file, and the screen shows the line only while the stored questions are
    unclassified. So the line says the menu lost track of the check, cannot tell whether it finished, and took none in.
    Like `'ended'`, it offers no second check: a classification is never retried in a loop.
52. **The late stamp is its own branch.** `tests/the-session-claims-a-build-before-launching-it.test.js` case 1, outside
    this plan's files, finds the stamp branch by its literal head and reads the comment above it. Widening that
    condition would break the pin. A second branch after it, for a gate critique that is orphaned or done, keeps the
    existing branch byte for byte and is refused exactly as the first when another agent is recorded.
53. **Residual 6 is named and S24-21 pins it** (the owner's answer to q16). The record is written when this hook allows
    a Write, before the Write runs. A Write that something later refuses leaves a line, and a later write of exactly those
    bytes counts as that critic's, for the text its critique started on. S24-21 pins the credit, and its second half pins
    that other bytes count for nothing. Closing it needs a record made after the tool ran, which this plan does not
    have.
54. **Step 12 measures through a throwaway test run** (slice 21's rule). Under slice 21 a background agent's inline code
    that loads CTOC's writer modules (`streaming-gate`, `streaming-questions-sweeper`, `task-registry`) is refused, and
    `node --test` stays allowed. So the build's measurements run as a `node --test` file in its own scratch folder,
    outside `tests/`, never committed, and the timing stays out of the gated suite.
55. **Line numbers re-read on 2026-10-19.** `src/hooks/protect-records.js` moved: the header's "WHAT IT PROTECTS" is
    lines 10-31, "WHAT IT CANNOT CATCH" lines 147-177, "FAIL RULE" line 179, the allow sentence line 196,
    `RECORD_SEGMENT_RE` 534, `PLUGIN_ROOT` 556, `isSubagent` 644-652, `RECORD_REFUSALS_OFF` 1053, `bashRefuses`
    1055-1097, `decide` 1105-1141 with its editing branch 1115-1129, `main` 1153-1182. `src/hooks/PreToolUse.Edit.js`
    `targetsStreamingLive` is 308-325. `src/lib/menu-screens.js` moved: `taskTransition` 2458-2629 (its stamp branch
    2531-2553, the guarded start 2588), `taskComplete` 2661 (`continuationText` called at 2679 and 2846),
    `continueAfterCrossing` 2891-2941 (the sweep 2895-2899, the crossing pass 2902-2907, the classification loop
    2923-2929, the return 2940), `queueNextBuild` 2956, `queueClassification` 3000-3011 (its label 3004),
    `streamCheck` 3023-3038, `continuationText` 3041-3052, `route`'s `stream check` 3382. `src/lib/streaming-gate.js`:
    `nextUnansweredQuestion`'s sweep 410, `crossingBlocked` 864-872, `crossBySufficiency` 904 with its read 908,
    `pendingGateDecisions`' calls 1087 and 1101, `planDecisionScreen`'s `checkState` 1713 and its check offer 1717,
    `checkState` 1827-1847, `CHECK_LINES` 1850-1854, `uncheckedLines` 1859-1870, `gateScreenAt`'s `checkState` 2067
    and its check offer 2086, `streamingGateScreen`'s sweep 2132, `streamApprove` 2297 (its `approvePlan` 2306, its
    `continueAfter` 2314), `continueAfter` 2337-2352 (its sentence 2347), `streamAnswer`'s `continueAfter` 2505.
    `src/commands/start.md`: the precompute task 54, WORK dispatch step 2 line 124, COMPLETION steps 1 and 3 lines
    133 and 135, the stamp paragraph 137-148, the precompute recipe 288-291, its steps 3 and 4 lines 354-374, the
    classification paragraph 380-391. `docs/ENFORCEMENT.md`: "Streaming questions" 133-161, "What it protects" 243-247,
    "What it refuses" from 369, "What it cannot catch" from 522. Unchanged since 2026-10-18:
    `src/lib/streaming-questions-sweeper.js`, `src/lib/streaming-precompute.js`, `src/lib/task-registry.js`,
    `.gitignore`, `src/lib/actions.js`' `cancelTask` (2335, stamping at 2353 and 2364), `streaming-gate.js`' lines before
    1236 (`sufficiencyFor` 594, `MATRIX_BOX_DRAWING` 1235), and the cited lines of the five test files.
56. **Revision 1's leftovers are marked, not deleted** (the owner's answer to q13). Decisions 18 and 34, which put two
    questions to him and waited for both, are marked superseded by Decision 46 and this revision. The two closing bullets
    the menu wrote when revision 1 moved on record a critique of an earlier text and its approval; a void note stands
    above them, and the menu still appends its own record beneath them when this plan next moves on.
57. **Case 110 and the fail-closed design stay as written** (the owner's answers to q15 and q12).
58. **The owner's Hold on the gate ruling is his and stays** (`.ctoc/streaming/answers.jsonl` line 178). It is not read
    as a send-back, an approval or an answer to any other question, and this revision neither releases it nor asks the
    build to: only his own release, recorded by the menu, ends it. Step 8 checks it is still the latest hold entry for
    this plan's file and records whether a release followed; the build itself never writes one.

---

## Revision 2 (2026-10-18): the attribution record stays; its new refusals go; its claims are made honest

"Revision 2" is this re-plan of 2026-10-18, made after the send-back above. "Revision 1" is the plan as it stood before,
including its revisions of 2026-10-13 and 2026-10-15. Where revision 1's text below still says otherwise, this section
decides. The spec, test, acceptance and step sections below are edited to match it.

**The owner's decisions.**
- **2026-10-15**, "remove that hook block, it is wrong". `RECORD_REFUSALS_OFF = true` in `src/hooks/protect-records.js`
  (line 597, read on 2026-10-18). The shell refuses only a settings write. The background-agent menu reading is
  unreached. The editing tools' protection of the records stays on (`decide`, lines 637-645).
- **2026-10-17**, inbox question 1792309430830-sftztp, answer "Refuse decision routes (Recommended)". A background agent
  is refused only the routes that record his decisions; slice 21 builds that.

**What stays (the attribution record).**
- The hook records a background agent's Write into a waiting folder (`recordWaitingWrite`) in
  `.ctoc/streaming/waiting-folder-writes.jsonl`.
- The sweeper keeps a gate critic's classification only when the record, the plan's latest started critique task and
  the plan's text agree.
- The text binding, the owner's view, the stamp after an orphaning or an early completion, start.md's start-first
  order, `.gitignore` and the realigned fixtures.
- None of these refuses anything. `recordWaitingWrite` is still a change to the hook. It needs his approval, which is
  asked in the re-filed question 1: his approvals of 2026-10-16 were given for the broader scope and are void after his
  re-scope of 2026-10-17 (the CTO Chief's ruling R3 of 2026-10-18; Decision 46; Step 8's first box).

**What goes (Decisions 39-41).**
- The refusal of every editing tool inside CTOC's installed code (`isInstalledCode`, `REFUSAL_INSTALLED`, case 116).
- The refusal of a background agent's editing tools on Claude Code's settings files (`isClaudeSettingsFile`,
  `CLAUDE_SETTINGS_RE`, `CLAUDE_SETTINGS_FILES`, `isFolder`, `REFUSAL_CLAUDE_SETTINGS`, the `os` require, case 117).
- The inline-script refusal of `waitingWritesPath` (`CHECK_RECORD_EVAL_TOKENS`). It sits in the shell record refusals
  that `RECORD_REFUSALS_OFF` leaves unreached, so it would refuse nothing anyway.
- All three gaps are listed under Neighbours for the owner to schedule.

**What the attribution now stops, said plainly (Decision 42).** It is a guard against honest mistakes, not a barrier.
Each of the three records can be written by one ordinary command today:
- **The hook's record** is refused to every editing tool, since it is under `.ctoc/streaming/`. A shell append to it
  (`echo … >> .ctoc/streaming/waiting-folder-writes.jsonl`) is allowed under the removal.
- **The menu's record of the critic.** The menu records a task's agent through `menu task start <id> --agent-id <id>`.
  Slice 21's revision of 2026-10-18 refuses a background agent only `--force` on that route, so a background agent may
  stamp its own id on an unstamped critique. *(Superseded 2026-10-19 by revision 3: slice 21's rule, now in the build
  queue, refuses a background agent's plain `menu task start`, the stamp included; a script it writes and runs is not
  refused.)*
- **The task registry**, which holds that record and the text hash, is writable by any shell command. Slice 20, which
  would have guarded it, is recommended for withdrawal.

So the attribution stops:
- a background agent's stray Write of a classified file, whether a critic of another plan, a superseded critique or a
  non-critic. Without a matching record, the menu's critic and the text, the classification is dropped and the plan
  waits;
- a text changed after the critique started;
- a time set back.

It does not stop an agent that deliberately stamps itself as a critique's critic and writes a classified file, or that
appends a forged line to the record. Revision 1's "residual 1" said a program could do that. Under the removal, ordinary
commands can. Isolating background agents is the barrier against that. It is separate work, not built here.

**Dependencies.** *(Superseded 2026-10-19 by revision 3: `depends_on` holds slices 23 and 21; slice 21 builds first.)*
`depends_on` drops slices 20 and 21 and keeps slice 23. This slice relies on neither any more:
- Slice 20 is recommended for withdrawal.
- Slice 21's revision of 2026-10-18 has no own-build binding. Its Step 9 check for that binding is removed.
- Slice 21 refuses a background agent's `stream approve` and `stream answer`, which narrows one way to cross. The
  attribution does not need it.
- Builds run one at a time. Slice 21 also edits `src/hooks/protect-records.js` and `tests/protect-records.test.js`, so
  whichever is built second re-reads the other's lines at Step 9.

**Wherever revision 1's text below** says that slice 20 refuses writes of the task registry, that slice 21 refuses a
background agent's `menu task add`, `menu task start` or the stamp, or its completion of a task that is not its own
build, or that the record is refused to every shell command: that no longer holds. Read it as the paragraph above says.

### Decisions Taken Under Ambiguity (revision 2, 2026-10-18)

39. **The installed-code refusal is dropped** (supersedes Decision 31). It is a new refusal outside both of the owner's
    decisions, and the brief applies them: "Drop its new plugin-folder and settings refusals." The gap stays: one Edit of
    the installed sweeper or hook can switch the attribution off (Neighbours).
40. **The Claude Code settings refusal is dropped** (supersedes Decision 35), for the same reason. The gap stays: one
    Write of `{"disableAllHooks": true}` into a project's `.claude/settings.local.json` can switch the hook off
    (Neighbours). Whether Claude Code obeys it mid-session stays unverified, and the Step 15 check that would settle it is
    removed with the refusal. *(Revision 3, 2026-10-19: the settings protection now on the main checkout refuses that
    Write to a background agent, within its own named limits; this plan still builds no refusal of its own.)*
41. **The inline-script refusal of `waitingWritesPath` is dropped** (supersedes Decision 28). It would sit in
    `CHECK_RECORD_EVAL_TOKENS`, which only the shell record refusals read, and those are unreached while
    `RECORD_REFUSALS_OFF` stands. Adding it would be dead code, and claiming it would be false.
42. **The attribution is kept as a guard against honest mistakes, and every claim says so** (supersedes the parts of
    Decisions 2, 16, 18, 36 and 37 that rest on slices 20 and 21). Above, "What the attribution now stops". It still
    closes the one-call forgery the owner's fifth hole named for the honest and careless case: a stray classified Write
    no longer moves a plan. Revision 1 called it a deliberate-forgery close. It is not one under the removal.
43. **(Superseded 2026-10-19 by revision 3: `depends_on` holds slices 23 and 21.) `depends_on` keeps slice 23 only**
    (supersedes Decision 16). Slices 20 and 21 are dropped as dependencies: this
    slice uses nothing either builds now.
44. **No waiting-folder question file is written.** The brief allows edits to the six plan files only. The owner's
    question 1, reworded, is in this plan and in the planner's report.
45. **(Superseded on 2026-10-18 by Decision 46.)** It held that line 38 of 2026-10-16 stood for the hook change as a
    strict subset, and that only question 1 was asked again.
46. **(2026-10-18, the CTO Chief's ruling R3.) The owner's approvals of 2026-10-16 are void; the hook change goes into
    the re-asked question 1.** Both answers (`.ctoc/streaming/answers.jsonl` lines 36 and 38) were given for the broader
    scope; his re-scope of 2026-10-17 ended that scope, so neither approves revision 2. A subset of a void approval is not
    an approval. So question 1 now asks him to adopt the whole change, the hook's `recordWaitingWrite` included, with the
    recommended option "Adopt it now, knowing it only stops honest mistakes"; revision 1's question 2 is withdrawn, and
    Step 8's first box reads only his answer to the re-filed question 1. Lines 36 and 38 are not read as approval.
47. **(2026-10-18, review finding.) The Problem Statement's line numbers of 2026-10-12 to 2026-10-14 were re-read on the
    main checkout and refreshed where they moved:** `src/lib/streaming-gate.js` (`pendingGateDecisions` 1017→1057,
    `sufficiencyFor` 588→594 with its call at 600→606, `crossBySufficiency` 869→904 with its call 1051→1101 and its
    plan read 878→908, the `approvePlan` call 2083→2306 in `streamApprove`), `src/lib/streaming-precompute.js`
    (`planQuestionsStatus` 797-813→from 738, the plan's time at 750), `src/commands/start.md` (completion 130→132, the
    stamp 121→123, a promoted task 132→134, a classification 365→367, the precompute 51 and 268-271→53 and 270-273),
    `src/hooks/protect-records.js` (`decide`'s editing branch 628-636→637-645) and the forging tests (`dropPending` from
    line 172 with its callers, the sweeper's cases 13b, 19 and 20 from lines 194, 534 and 563). Lines that read the same
    on 2026-10-18 are unchanged: `continueAfterCrossing` 2961-3011 and its lines 2966, 2973 and 3002; `queueClassification`
    3070-3080 and 3074; `taskTransition`'s line 2658; `RECORD_SEGMENT_RE` 159; `RECORD_REFUSALS_OFF` 597; `PLUGIN_ROOT`
    181; `targetsStreamingLive` 304; `HIGH_STAKES_TOPICS` 215; `isGateCriticClassification` 250 and its use at 833;
    `writePlanQuestions` 634; `isBlockingQuestion`'s line 928; `goesToHuman` 944; `hasEnoughInformation` 1236; the
    sweeper's call at 215. Also refreshed: the matrix lines of the forged-cell test (`MATRIX_BOX_DRAWING` 1187→1235,
    `matrixCellText` 1187-1197→1235-1245, `matrixEdge` 1295→1343, `matrixRow` 1300→1348, the `┌ ┬ ┐` line 1327→1375,
    the plan's screen 1567/1583→1618/1656) and the installed copy (6.14.125→6.14.130). The other numbers in the File
    Specifications and Step lists below, which carry no date of their own, keep their first writing; each edit is anchored
    by its text, and Step 9 re-reads every cited span before Step 10 edits it.

---


# Only a critique the menu launched can move a plan

Slice 24 of `plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`. It is not one of the
parent's five suggested slices. It is the root cause behind the fifth hole the round's reviews found — a background agent
starting the menu with `rg --pre` so that ready plans move on — as slice 23's critic traced it: slice 23 stops a screen from
crossing a gate, and names what remains (slice 23, "What this slice does and does NOT do", point 2): the evidence every
crossing trusts can be forged.

Every line number below was read on 2026-10-12 in the main checkout; the spans the second and third revisions add were read
there on 2026-10-13. `src/lib/menu-screens.js`, `src/lib/task-registry.js`,
`src/lib/streaming-gate.js`, `src/commands/start.md` and `tests/plans-keep-moving-without-the-human.test.js` carry other
slices' uncommitted work there (git status), so their numbers are those of the working tree; `src/hooks/protect-records.js`,
`src/lib/streaming-questions-sweeper.js`, `src/lib/streaming-precompute.js`, `docs/ENFORCEMENT.md`, `.gitignore` and the
four other declared test files carry none. *(Revision 3: the numbers this plan relies on were re-read on 2026-10-19,
Decision 55; it depends on slices 21 and 23, and slice 20 is not in `plans/`.)* Slices 20, 21 and 23, which this slice
depended on when this was written, change
`src/hooks/protect-records.js`, `src/lib/streaming-gate.js`, `src/commands/start.md`, `tests/protect-records.test.js`,
`tests/plans-keep-moving-without-the-human.test.js`, `tests/sufficiency-evidence.test.js` and `docs/ENFORCEMENT.md` before it
is built; functions are therefore cited by name as well, and the executor re-reads every cited span at Step 9.

## Problem Statement

**A plan crosses on a question file that any background agent can write.**
- At a pre-build gate a plan crosses by itself when its sufficiency verdict says `enough`: `pendingGateDecisions`
  (`src/lib/streaming-gate.js` line 1057, re-read on 2026-10-18) asks `sufficiencyFor` (from line 594, which calls
  `hasEnoughInformation` at line 606) and crosses through `crossBySufficiency` (called at line 1101, defined from line
  904), which writes a sufficiency record and moves the
  plan. With slice 23 that pass runs only inside the continuation, `continueAfterCrossing` (`src/lib/menu-screens.js` lines
  2891-2941 on 2026-10-19), which sweeps the waiting folder first (line 2896), then crosses (line 2903), then queues the
  next build (`queueNextBuild`, called at line 2932). The session runs the continuation on every task it completes
  (`menu task complete <id> --continue`, `src/commands/start.md` line 133 on 2026-10-19), and on `stream answer` and
  `stream approve`.
- `hasEnoughInformation` (`src/lib/streaming-precompute.js` lines 1236-1303) answers `enough` when no open question goes to
  the human and the file is classified (lines 1283-1302). In a classified file only `isBlockingQuestion` sends a question to
  the human (`goesToHuman`, lines 944-946), so a classified file with no questions — or with only details that each carry
  one recommended option — is enough.
- "Classified" is `isGateCriticClassification(parsed.classification)` (line 833): exactly the two keys `by: "gate-critic"`
  and a positive whole `at` (lines 250-254). Anyone who can type those two keys can make the claim.
- The live store `.ctoc/streaming/questions/` is written only by `writePlanQuestions` (lines 634-687), whose one production
  caller is the sweeper (`src/lib/streaming-questions-sweeper.js` lines 215-217; search `writePlanQuestions\(` over `src/`:
  2 files, the definition and this call). The sweeper promotes every waiting file that passes its ladder (lines 131-223) and
  hands the payload's `classification` to the writer unchecked — "the reader ... decides whether it counts" (lines 212-217).
- The waiting folder `.ctoc/streaming/questions/pending/` is writable on purpose: the write protection's record pattern
  excludes it (`RECORD_SEGMENT_RE`, `src/hooks/protect-records.js` line 534 on 2026-10-19), and so does the reused
  `targetsStreamingLive` (`src/hooks/PreToolUse.Edit.js` lines 308-325), so every background agent holding the Write or
  Edit tool can put any file there. The editing tools are refused for the rest of the store. Since the owner's removal of
  2026-10-15 (`RECORD_REFUSALS_OFF`, `src/hooks/protect-records.js` line 1053) the shell is not refused anywhere in it.
- Plans under `plans/` are not protected (the hook's list, lines 10-31). Every freshness rule is a modification-time rule —
  the stored stamp against the plan's time (`planQuestionsStatus`, `src/lib/streaming-precompute.js` from line 738, the
  plan's time read at line 750, re-read on 2026-10-18) and the
  sweeper's supersession (`src/lib/streaming-questions-sweeper.js` lines 188-192) — and a time can be set back
  (`touch -r`, `fs.utimesSync`).
- The crossing reads the plan twice. The verdict reads it through `planQuestionsStatus`; `crossBySufficiency` then reads it
  again (`src/lib/streaming-gate.js` line 908 on 2026-10-18) and records and moves whatever bytes it finds there, so a text swapped in
  between the two reads crosses on a verdict read for another text.
- CTOC's installed code is not protected. The hook, the menu and the sweeper all run from the installed plugin folder
  (`hooks/hooks.json` line 10 runs `${CLAUDE_PLUGIN_ROOT}/src/hooks/protect-records.js`; the hook names that folder
  `PLUGIN_ROOT`, `src/hooks/protect-records.js` line 556 on 2026-10-19), and the editing branch of `decide` (lines
  1115-1129) refuses nothing there. One Edit of the installed sweeper or hook would switch off every check this slice adds.
  The installed copy is the plugin cache's versioned folder, not this repository (the `installPath` of `ctoc` in one
  profile's `installed_plugins.json`, read on 2026-10-13: `plugins/cache/robotijn/ctoc/6.14.125`; on 2026-10-18:
  `plugins/cache/robotijn/ctoc/6.14.130`; on 2026-10-19: `plugins/cache/robotijn/ctoc/6.14.133`). Revision 2 does not
  close this (Decision 39; Neighbours), and `docs/ENFORCEMENT.md` already names the installed plugin's own files as not
  protected ("What it cannot catch", lines 557-559 on 2026-10-19).
- Claude Code's own settings are protected for background agents since revision 2 was written, by the settings protection
  on the main checkout (the owner, 2026-10-15, "fix that gap"; read on 2026-10-19). A background agent's editing tools are
  refused on the project's `.claude/settings.json` and `.claude/settings.local.json`, CTOC's `.ctoc/settings.json` and the
  user-level `settings.json` of the active Claude config folder (`isAgentSettingsTarget`, `decide`'s editing branch, line
  1127), and so are its shell writes the hook can read (`agentSettingsSpecs`, line 1076). Its limits are named in
  `docs/ENFORCEMENT.md` ("What it cannot catch", lines 554-581): a script written then run, a path in a variable,
  another profile's config folder and the rest of that list. One line there can switch the write protection off, so the
  facts below still matter. This plan builds no refusal of its own (Decision 40). Claude
  Code reads its settings from the project's `.claude/settings.json` and `.claude/settings.local.json` and from the user's
  Claude Code home folder — the folder `CLAUDE_CONFIG_DIR` names when it is set, else `.claude` in the home folder
  (`(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude")).normalize("NFC")`), whose user file is `settings.json`,
  or `cowork_settings.json` in Claude Code's cowork mode. Its code names a setting that turns hooks off
  (`disableAllHooks`: "hooks are turned off in your settings (disableAllHooks)") and one that decides which plugins load
  (`enabledPlugins`, read from `.claude/settings.json` and `.claude/settings.local.json`). All of this was read in the
  installed build 2.1.296's own code; none of it was run. This repository's own evaluation runs pass that setting to start
  Claude Code without hooks (`HOOKLESS`, `tests/compaction-eval.test.js` line 473). When revision 2 was written the
  editing branch of `decide` refused nothing there, so one Write by a background agent — `{"disableAllHooks": true}` into
  the project's `.claude/settings.local.json` — could have switched off the write protection and with it every check this
  slice adds; that Write is now refused to a background agent (above).
- **Not verified: whether Claude Code obeys such a setting written mid-session, or only at the next start.** Its code
  carries a settings change detector and reloads plugin hooks when "plugin-affecting settings changed", yet one of its
  messages tells a user to remove `disableAllHooks` from the project's settings "then start a new session". Revision 2
  drops the refusal this question bore on, and the Step 15 check that would have settled it; the question stays open
  under Neighbours.

**The attack, in one tool call.** Any background agent Writes
`{"ref":"implementation/x.md","questions":[],"classification":{"by":"gate-critic","at":1}}` to
`.ctoc/streaming/questions/pending/implementation__x.md.json`. At the session's next `menu task complete … --continue` the
continuation sweeps it in, the plan is enough, it crosses into `todo/` with a sufficiency record, and its build is queued.
No launcher is needed. A variant changes the plan's text after a real critique and sets its time back, so the old
classification keeps counting for the new text.

**The repository's own tests forge it.** `dropPending` (`tests/plans-keep-moving-without-the-human.test.js` from line 172
on 2026-10-18, "Drop a file in the waiting folder, as the gate critic does") writes the classified file with
`fs.writeFileSync`; on 2026-10-18 it is used with its default classification at lines 298, 340, 479, 805, 1014-1015, 1062,
1083, 1336, 2178 and 2417, and with another classification or none at lines 831 and 1309. The sweeper's own cases 13b, 19
and 20 do the same (`tests/streaming-questions-sweeper.test.js` from lines 194, 534 and 563 on 2026-10-18).

**What the menu knows today about the critique it launched: nothing that ties it to a file.** The menu records a `classify`
task itself (`queueClassification`, `src/lib/menu-screens.js` lines 3000-3011, label `revision-<ms>` at line 3004,
re-read on 2026-10-19) and the session records a `precompute` task when the owner asks for a plan's questions
(`src/commands/start.md` lines 54 and 288-291). For both the session launches the agent first and only then runs
`menu task start <id> --agent-id <the harness agent id>` (start.md line 124 for any non-build task, line 135 for a
promoted one, line 385 for a classification). A precompute launches four agents, and start.md names none of them as the
one to record. A start without `--agent-id` records no agent (`taskTransition`, `src/lib/menu-screens.js` line 2588:
`agentTaskId: p.agentId || null`). Nothing records who wrote a waiting file, or which text of the plan a critique was
started on, and the start comes only after the critic began reading.

**The agent id in the hook's input is the id the session stamps (verified for this plan).**
- Claude Code's own code, read in the installed build 2.1.296: the common builder of every hook input returns
  `{ session_id, transcript_path, cwd, …, permission_mode, agent_id: s?.agentId, agent_type, effort }`, and the PreToolUse
  call passes it the tool-use context (`{...$d(s.session, se(), h, s), hook_event_name: "PreToolUse", tool_name, tool_input,
  tool_use_id}`), so `agent_id` is the running agent's `agentId` and is absent on the main thread. The SubagentStop input
  sets `agent_id: h` and `agent_transcript_path: lg(h)`, where `lg(t)` returns the folder joined with
  `` `agent-${t}.jsonl` ``. The Agent tool's result text is `agentId: ${n.agentId} (internal ID …)`, and the subagent's run
  is set up and its progress records stamped with that same id (`Gls({agentId: ce, …, parentAgentId: n.agentId})`,
  `agentId: ce`). The same `permission_mode:r,agent_id:s?.agentId,agent_type` text is in the older installed build 2.1.291.
- This planner's own session records agree: the dispatching session's transcript holds an Agent result reporting an
  `agentId`, the task notification carries that id as `<task-id>`, and the subagent transcript is named `agent-ID.jsonl`, ID
  being that id, with `"agentId":"ID"` on every line.
- So the id the Agent tool returns — the one start.md tells the session to pass as `--agent-id` (line 124 on 2026-10-19) — is the
  `agent_id` the write protection receives for that agent's tool calls. Not observed directly: a PreToolUse payload of a
  live background agent (this planner cannot run one). Decision 5 says what the design does if a future Claude Code breaks
  it.
- **Neither the agent-id match nor the session's order can be checked live before the release.** The hook that runs in
  every session is the installed copy (`hooks/hooks.json` line 10), and `/ctoc:start` loads the installed `start.md`; this
  slice's code and instructions reach a live session only once the release is installed. Step 15 records the first live
  check: the first gate critique the menu starts after the release must be taken in. A mismatch fails closed — the
  classification is not taken in, the file keeps its questions unclassified, the status line and the plan's screen say the
  gate critic's check was not taken in — and the owner's own approval still moves the plan: `stream approve` calls
  `approvePlan` (`src/lib/streaming-gate.js` line 2306 on 2026-10-18, in `streamApprove`), which reads no question file (search
  `hasEnoughInformation|isGateCriticClassification|planQuestionsStatus|classif` over `src/lib/actions.js`: 4 matches, none
  in `approvePlan`).

## Technical approach

### The rule

A question file can move a plan only when three records agree. This is a guard against honest mistakes, not a barrier
(revision 2, Decision 42): under the owner's removal of 2026-10-15 each record below can also be written by an ordinary
command, so a background agent that sets out to forge them can (residual 1). A waiting file that carries the gate
critic's classification keeps it only when the three records agree:

1. **The write protection's record** — a background agent's Write of exactly that content (the sha256 of its JSON value) to
   exactly that waiting file, written by the hook from the `agent_id` Claude Code put in its input, into
   `.ctoc/streaming/waiting-folder-writes.jsonl` of the project the Write targets (the folder above its
   `.ctoc/streaming/questions/pending`, never the agent's working folder). The hook's existing rules refuse it to every
   editing tool; a shell command is not refused since 2026-10-15.
2. **The menu's record** — the plan's most recently started gate-critique task (`classify` or `precompute`) — running,
   orphaned or done, never one whose cancellation was requested and never a failed one — whose recorded agent is that
   writer: the session starts the task before any of its agents is launched, then stamps it with `--agent-id` (the id the
   gate critic's launch returned). The stamp is accepted while the task records no agent, also after the reconcile
   orphaned it or after the session completed it early; a task records at most one agent. The decision-route plan
   (slice 21, revision 3) refuses a background agent's plain `menu task start`, the stamp included; a script file the
   agent writes and runs is not refused, and the task registry that holds this record is writable by any shell command
   (residual 1).
3. **The plan's text** — the sha256 of the plan's bytes the menu recorded on that task when it started equals the plan's
   bytes now.

Any other classified file — another agent's Write, the main session's, a program's, a launcher's, a critic launched for
another plan, a critique a later one superseded, a cancelled or failed one, a critique of an earlier text, a replay — keeps
its questions and loses every claim: its classification, its attestation, and the gate ruling and coverage notice that only
an attested synthesis may carry. It is taken in as an author's file is: it moves nothing, the continuation queues a fresh
classification of it unless one already ran for that question revision, and the log records
`classification-not-attributed`. The owner is told: the continuation's status line says the gate critic's check of that plan
was not taken in, that its questions were kept unchecked, and whether a new check is queued or the plan waits for his
approval. A file taken in classified records the text it is bound to (`critiquedPlanSha256`), and every later read compares
it: a classified file whose plan text changed reads `stale`, whatever the plan's time says; a classified file without that
record counts as unclassified. The crossing then reads the plan once and refuses bytes that are not the text the verdict was
read for. An author's unclassified file needs none of this — it moves nothing.

One more hole closes with it: a critique's status decides no more than it must. An early completion, by anyone, no longer
voids a critique (the stamp is still accepted, and a done critique counts), and a critique whose cancellation was requested
never counts again, even when it is completed afterwards. Revision 1's refusals inside CTOC's installed code and on Claude
Code's settings files are dropped (Decisions 39 and 40).

### Why this design

- **(a) A write record kept by the write protection, checked by the consumer — chosen.** The hook is the only component that
  sees who writes what, and it runs outside every agent's control. The consumer (the sweeper) requires positive evidence, so
  every way of writing the file that the hook does not see — a program, a launcher (`rg --pre`, `find -exec`, `sh -c`), a
  restored copy — produces no record and fails closed, unless the same program also forges the record (residual 1 below). A
  deny-list at the hook alone (refuse a non-critic's classified Write) would be bypassed by those programs without even that
  second forgery, because a missing refusal is silent.
- **(b) The menu writing the file from the critic's returned text — rejected.** It would route the critic's output, derived
  from untrusted plan text, through the main session's context — the most privileged one — and make the session transcribe
  several kilobytes of JSON byte for byte into a menu call. The sweeper exists to keep that text out of the session (its
  header, lines 7-29). It needs a new route, a new recipe and a change to the critic, and a program can call that route with
  forged text exactly as it could call any other: it closes nothing (a) does not.
- **(c) Binding to the plan's content hash — adopted as part of the design.** Without it, the text a classification counts
  for is decided by modification times, which any agent can set back: a real critique of one text keeps counting after the
  plan is rewritten, and a program can replay a real critique of an earlier text. The hash is taken by the menu when the
  critique starts — before any of its critics is launched, because the session starts every gate critique first — compared
  before promotion, stored with the promoted file, compared on every read, and compared once more with the bytes the
  crossing records and moves.
- **Not chosen: the hook's `agent_type`.** It names the kind of agent, not the critique: it would let a critic launched for
  one plan classify another, and it binds nothing to the plan's text. The task's recorded agent id does both.

### What this slice does and does NOT close (stated plainly)

Closed, for honest and careless writes: a classified file moves no plan unless the three records agree. A background
agent's stray Write of a classified file is caught: a critic writing another plan's file, the late write of a critique a
later one superseded, or of one cancelled (even if completed afterwards) or failed, the main session's own Write. So is a
changed or replayed plan text, a time set back, and a text swapped in between the verdict and the crossing. Such a file
still keeps its questions, unclassified. That includes the brief's case: a background agent drops a classified empty file
by mistake; it moves nothing before or after a continuation. And a completion no longer decides whether a critique counts:
the session completing a precompute early leaves its gate critic's stamp and file counting, and no other completion voids
a critique (Decision 30).

Open, and why:
1. **A background agent that sets out to forge the records.** Under the owner's removal of 2026-10-15, ordinary shell
   commands reach two of the three records, and a script file the agent writes reaches the third (revision 3):
   - **the record:** a shell append to `.ctoc/streaming/waiting-folder-writes.jsonl`;
   - **the task registry**, which holds the menu's record of the critic and the text hash: any shell write of
     `.ctoc/state/tasks.json`;
   - **the menu's stamp:** `menu task start <id> --agent-id <its own id>` is refused to a background agent's plain call
     by the decision-route plan (slice 21), and so are `menu task add` and inline code that loads the task registry; a
     script file the agent writes and then runs is not refused.

   A background agent that records itself as a critique's critic in one of these ways and then writes a classified file
   has its own Write recorded truthfully, and that file counts for the text the start recorded (Decision 37). Slice 21
   refuses it every decision route, so it cannot approve directly through a route the hook reads. It can still make a
   plan cross on a classification it wrote itself. No same-user mechanism separates them. Closing it needs background
   agents isolated from the main project's records, separate work, not built here. This slice raises the bar from one
   Write call to a deliberate act: a forged record line and a registry write, or a script, beside that Write.
2. **A plan text swapped only while the critic reads it.** The critic reads an unprotected file; nothing can attest what it
   read. An agent that swaps the text in exactly while the critic reads and swaps it back before the menu checks makes the
   original text cross on a critique of the swapped one. By that swap it cannot make its own text cross (Decision 9); a
   menu call the write protection cannot read can (residual 1).
3. **The gate critic itself, misled by plan text,** classifies wrongly. It is the trusted classifier; its own rules govern
   that (`agents/iron-loop/gate-critic.md`, "Trust boundary").
4. **CTOC's installed code.** Nothing refuses a write there (revision 2, Decision 39): one Edit of the installed sweeper or
   hook could switch these checks off. `docs/ENFORCEMENT.md` already names the installed plugin's own files as not
   protected. Listed under Neighbours.
5. **Claude Code's settings.** Revision 1's own refusal is not built (Decision 40). The settings protection now on the main
   checkout refuses a background agent's editing tools, and the shell writes it can read, on the project's two settings
   files, CTOC's `.ctoc/settings.json` and the user-level `settings.json` of the active config folder (revision 3). What
   it cannot catch — a script written then run, a path in a variable, another profile's config folder and the rest of its
   list in `docs/ENFORCEMENT.md` — could still switch the hook off with one line such as `{"disableAllHooks": true}`.
6. **A record written before its Write runs** (revision 3, the owner's answer to q16). The hook records a background
   agent's Write when it allows it, before the Write runs. If something after this hook refuses the Write — Claude Code's
   permission rules, or another hook — the line stays, and a later write of exactly those bytes into that waiting file,
   by anyone, counts as that critic's: only while its critique is the plan's latest counted one, and only for the text that
   critique started on (S24-21). Identical bytes are that critic's own words, so what counts is its own verdict. Closing it
   needs a record made after the tool ran, not built here.

### The change

1. `src/hooks/protect-records.js`: a background agent's Write into a waiting folder is allowed as today and first recorded
   (agent, file, sha256 of the JSON) in the record of the project the Write targets, appended only to a regular file.
   Nothing is refused that was allowed; a record that cannot be written never refuses.
2. `src/lib/streaming-questions-sweeper.js`: a waiting file carrying the gate critic's classification keeps it only when the
   three records agree — the record read only from regular files, the plan's latest started critique task running,
   orphaned or done and never asked to cancel; the verified text hash is handed to the writer by name. Any other such file is
   taken in unclassified: its questions kept, its classification, attestation, gate ruling and coverage notice dropped; the
   sweep reports it as `declassified`.
3. `src/lib/streaming-precompute.js`: `planContentSha256`, the one encoding of "the plan's text"; the writer takes a named
   options object as its seventh parameter and stores `critiquedPlanSha256` with a classification, and keeps only a bound
   classified file from replacement; the reader treats a changed text as `stale` and an unbound classification as none, and
   hands the bound text to the verdict; `isTopiclessId` is exported for the sweeper.
4. `src/lib/streaming-gate.js`: the verdict carries that text; the crossing reads the plan once and refuses other bytes; the
   status line of `stream approve` and `stream answer` names a check that was not taken in; the plan's screen and the gate
   screen say a finished check was not taken in, and say of a check the menu lost track of that it cannot tell whether it
   finished (revision 3).
5. `src/lib/menu-screens.js`: a gate-critique task records the plan's text hash when it starts; its critic's id can be
   stamped also after the reconcile orphaned it or after it was completed, while it records no agent, through a branch of
   its own; the continuation keeps its sweep's report and names each plan whose gate critic's check was not taken in,
   saying whether a new check is queued, a check is already queued or running, or the plan waits for the owner; no
   classification is queued while a gate critique of the same plan is queued or running (revision 3); "Check its
   questions" says so instead of "already recorded".
6. `src/lib/task-registry.js`: the task keeps that hash through a load and an update.
7. `src/commands/start.md`: the session starts every gate critique before any of its agents is launched, then launches, then
   stamps the gate critic's id; a question precompute is completed only on its gate critic's return, after the stamp — a
   lens critic's return completes nothing.
8. `docs/ENFORCEMENT.md`: the rule, the record, and what stays open, said as a guard against honest mistakes.
9. `.gitignore`: the record and its older half are per-machine runtime records; so are slice 7's answer record and claim
   folder (the owner's answer, Decision 25).
10. Tests: the hook's record (`tests/protect-records.test.js`), the
    end-to-end attacks, the owner's view and the real path (`tests/streaming-questions-sweeper.test.js`), the fixtures that
    forged the classification or left it unbound, the two crossing cases whose verdicts must now carry the text they were
    read for (`tests/sufficiency-evidence.test.js` cases 10 and 10b), and the always-green structure check of
    `tests/real-question-file-render.test.js`, made able to fail — a forged column rule inside a cell included.

## Implementation Details

### Dependency Graph

```
hooks/hooks.json (PreToolUse: Write|Edit|MultiEdit|NotebookEdit|Bash) --runs--> src/hooks/protect-records.js#main --> #decide
#decide --editing tool, a background agent's Write, after every refusal--> #recordWaitingWrite (new, module-local)
#recordWaitingWrite --requires (only for a .json file in a folder named pending)--> src/lib/streaming-questions-sweeper.js
                     #pendingDir, #MAX_PENDING_BYTES, #waitingWritesPath (new), #waitingFileSha256 (new),
                     #WAITING_WRITES_ROTATE_BYTES (new)
src/lib/streaming-questions-sweeper.js#promotePendingFile --> #attributedCritique (new, local) --> #recordedWriters (new, local)
#attributedCritique --requires--> src/lib/task-registry.js#load ; src/lib/task-reconcile.js#isRealAgentId (existing export) ;
                                  src/lib/streaming-precompute.js#planContentSha256 (new)
#promotePendingFile --unattributed--> streaming-precompute#isTopiclessId (newly exported): drop the ruling and the notice
#promotePendingFile --calls--> src/lib/streaming-precompute.js#writePlanQuestions(…, classification, { critiquedPlanSha256 })
#sweepPendingQuestions --report gains--> declassified: refs taken in without their classification
src/lib/streaming-precompute.js#planQuestionsStatus --calls--> #planContentSha256 (classified files only)
#planQuestionsStatus ('ready'.critiquedPlanSha256) --> #hasEnoughInformation (enough.critiquedPlanSha256)
  --> streaming-gate#sufficiencyFor
streaming-gate#pendingGateDecisions --verdict--> #crossBySufficiency (one read, sha256 compared with
                                                  verdict.critiquedPlanSha256)
src/lib/menu-screens.js#taskTransition (start of classify/precompute) --requires--> streaming-precompute#planContentSha256
menu-screens#taskTransition --a stamp of an orphaned or done gate critique--> its own branch, after the existing stamp branch
menu-screens#continueAfterCrossing --keeps--> sweepPendingQuestions report (declassified) + each ref's queueClassification outcome
  --> #notTakenInSentences (new, local)
  --> #continuationText (menu task complete --continue) ; streaming-gate#continueAfter (stream approve, stream answer)
menu-screens#queueClassification ('critique-running', 'not-taken-in', new outcomes) --> #streamCheck (their sentences)
streaming-gate#checkState ('not-taken-in', 'orphaned', new states) --> #uncheckedLines --> planDecisionScreen, gateScreenAt
src/lib/task-registry.js#normalizeLoadedTask / #updateTask --keep--> task.critiquedPlanSha256
src/commands/start.md --tells the session--> start the critique, launch its agents, stamp the gate critic's id; complete a
                                            precompute only on its gate critic's return
tests/protect-records.test.js --spawns--> src/hooks/protect-records.js
tests/streaming-questions-sweeper.test.js --spawns--> the hook; --calls--> menu-screens.route, continueAfterCrossing, sweeper,
                                                     streaming-gate.crossBySufficiency; --reads--> src/commands/start.md
tests/plans-keep-moving-without-the-human.test.js#dropPending --spawns--> the hook; --calls--> menu-screens.route
tests/sufficiency-evidence.test.js (cases 10 and 10b) --calls--> streaming-gate.crossBySufficiency with a bound verdict
tests/real-question-file-render.test.js --calls--> streaming-gate.planDecisionScreen (the real renderer, a forged cell too)
```

No module is added. One new edge: the hook requires `src/lib/streaming-questions-sweeper.js` (lazily, inside
`recordWaitingWrite`, and only for a `.json` file in a folder named `pending`). The sweeper requires only `path`, `./safe-fs` and
`./streaming-precompute` today (lines 63-65) and gains `crypto` and a lazy `./task-registry` and `./task-reconcile`.
`streaming-gate` gains `crypto`. `task-registry` requires `path`, `./safe-fs` and `./plan-coverage`; `task-reconcile`
requires `path`, `./safe-fs`, `./task-registry` and `./plan-coverage` (lines 91-96); nothing requires a hook. No cycle:
`menu-screens` already requires `streaming-gate` at load and `streaming-precompute` lazily; `streaming-gate` reaches
`menu-screens` only lazily (`continueAfter`).

### File Specifications

#### File: `src/hooks/protect-records.js`
**Action:** MODIFY
**Purpose:** record every background agent's Write into a waiting folder — who, which file, the hash of the JSON — in the
project that waiting folder belongs to, so the menu can tell the critic it started from anyone else. It refuses nothing
new (revision 2).
**Change Type:** modify-existing

##### Changes
- **The header, "WHAT IT PROTECTS"** (lines 10-31 on 2026-10-19): after the bullet on `.ctoc/streaming/` (lines 13-15),
  insert:

```js
 *     That store includes this hook's own record of the waiting folder's writers (below).
```

- **The header, between "WHAT IT CANNOT CATCH"** (it ends at line 177 on 2026-10-19, after its settings paragraph)
  **and "FAIL RULE"** (line 179), insert a section:

```js
 * WHAT IT RECORDS (four-defects slice 24)
 *   A background agent's Write into a waiting folder is allowed, as before, and first
 *   recorded as one line of `.ctoc/streaming/waiting-folder-writes.jsonl` in the project that
 *   waiting folder belongs to — the folder above its `.ctoc/streaming/questions/pending`,
 *   never the agent's working folder, so a critic working in its own worktree that writes the
 *   main waiting folder is recorded there: the agent id Claude Code put in this input, the
 *   file's name and the sha256 of the JSON written (the sweeper's `waitingFileSha256`).
 *   One older half, `.1`, is kept. The menu counts the gate critic's
 *   classification only when this record ties that exact content to the agent it recorded on
 *   the plan's latest gate-critique task, for the plan text that task started on. The record
 *   is under `.ctoc/streaming/`, so the editing tools are refused it; since the owner's
 *   removal of 2026-10-15 (`RECORD_REFUSALS_OFF`) a shell command is not, so the record is a
 *   guard against honest mistakes, not a barrier. This hook writes it only to a regular file,
 *   never through a link or into a folder in its place. Only the Write tool is recorded (an
 *   Edit's result is not known before it runs). The line is written when this hook allows the
 *   Write, before the Write runs: a Write that a later check refuses still leaves its line,
 *   and a later write of exactly those bytes counts as that critic's. A record that cannot be
 *   written never refuses the Write: the file is then unattributed, and the sweeper takes it in
 *   without its classification.
```

- **"WHAT IT CANNOT CATCH"** (lines 147-154 on 2026-10-19, its first paragraph): after "the main session running the
  menu's answering routes without the human's reply (it carries no `agent_id`)" append "; a shell command or a background
  agent's own program that writes the waiting-folder record itself (only the editing tools are refused there since
  2026-10-15)".
- **Line 196**, "Allow = exit 0 with nothing on stdout. No banner, no log file." becomes "Allow = exit 0 with nothing on
  stdout. No banner; the one file it writes is the record above."
- Revision 1's other header edits, the `CHECK_RECORD_EVAL_TOKENS` entry, the `os` require, `REFUSAL_INSTALLED`,
  `REFUSAL_CLAUDE_SETTINGS`, `isInstalledCode`, `CLAUDE_SETTINGS_RE`, `CLAUDE_SETTINGS_FILES`, `isFolder` and
  `isClaudeSettingsFile` are **not** made (revision 2, Decisions 39-41).
- **After `isSubagent`** (lines 644-652 on 2026-10-19), insert:

```js
/** The agent ids `menu task start --agent-id` accepts (`menu-screens` AGENT_ID, line 2420); no other id is recorded. */
const RECORDABLE_AGENT_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

/**
 * RECORD a background agent's Write into a waiting folder (four-defects slice 24): one line
 * `{ ts, agent, file, sha256 }` in the sweeper's `waitingWritesPath` of the Write target's own
 * project — the folder above its `.ctoc/streaming/questions/pending`, never the agent's
 * working folder, so a critic working in its own worktree that writes the main waiting folder
 * is still recorded there. The agent id Claude Code put in this input, the file's name, and
 * `waitingFileSha256` of the content. Recorded only for a `.json` file directly in a waiting
 * folder (its four folder names exactly as the sweeper spells them), string content within the
 * sweeper's size limit that parses as JSON, and an agent id of the form the menu records; and
 * only into a regular file (lstat), never through a link or into a folder in its place. Never
 * throws and never refuses: an unrecorded write proves nothing, and the sweeper drops a
 * classification nobody recorded (fail closed).
 * ponytail: the record is rotated to `.1` past WAITING_WRITES_ROTATE_BYTES and one older half
 * is kept, so a write older than roughly ten thousand waiting-folder writes (a line is about
 * 200 bytes) loses its record and the sweeper drops its classification; a longer history would
 * need a record per plan.
 * @param {string} abs - the Write's absolute target
 * @param {object} payload - the PreToolUse input
 * @returns {void}
 */
function recordWaitingWrite(abs, payload) {
  try {
    const agent = payload.agent_id;
    const content = payload.tool_input && payload.tool_input.content;
    if (typeof agent !== 'string' || !RECORDABLE_AGENT_ID_RE.test(agent) || typeof content !== 'string') return;
    // Cheap first: only a `.json` file in a folder named `pending` loads the sweeper.
    if (!abs.endsWith('.json') || path.basename(path.dirname(abs)) !== 'pending') return;
    const sweeper = require('../lib/streaming-questions-sweeper');
    const dir = path.dirname(abs);
    const project = path.resolve(dir, '..', '..', '..', '..');
    if (sweeper.pendingDir(project) !== dir) return; // not `<project>/.ctoc/streaming/questions/pending`
    if (Buffer.byteLength(content, 'utf8') > sweeper.MAX_PENDING_BYTES) return;
    const sha256 = sweeper.waitingFileSha256(content);
    if (sha256 === null) return;
    const safeFs = require('../lib/safe-fs');
    const record = /** @type {string} */ (sweeper.waitingWritesPath(project));
    safeFs.mkdirSync(path.dirname(record), { recursive: true });
    let st = null;
    try { st = safeFs.lstatSync(record); } catch { /* no record yet */ }
    if (st !== null && !st.isFile()) return; // a link or a folder in its place is never written through
    if (st !== null && st.size > sweeper.WAITING_WRITES_ROTATE_BYTES) {
      // ponytail: two hooks that rotate at the same moment can rotate twice and drop the older
      // half; a lost line only drops that classification (fail closed). A lock would close it.
      try { safeFs.renameSync(record, `${record}.1`); } catch { /* another hook rotated it first */ }
    }
    safeFs.appendFileSync(record, `${JSON.stringify({ ts: new Date().toISOString(), agent, file: path.basename(abs), sha256 })}\n`);
  } catch { /* an unrecorded write proves nothing: the sweeper fails closed on it */ }
}
```

- **In `decide`, the editing-tool branch's last statements** (lines 1126-1128 on 2026-10-19: the regulatory-settings
  refusal, the background-agent settings refusal, `return null;`) gain one line before the allow. Every refusal stays as
  it stands and before the record line, which comes last before `return null`:

```js
    if (forms.some(isRegimeFile)) return REFUSAL_SETTINGS;
    if (isSubagent(payload) && isAgentSettingsTarget(target, abs, raw)) return REFUSAL_AGENT_SETTINGS;
    if (isSubagent(payload) && tool === 'Write') recordWaitingWrite(abs, payload);
    return null;
```

  If a neighbour built first (slice 21, or another) added a refusal to that branch, it too stays before the record line.
- Nothing else changes: no refusal is added or removed, and the shell branch is untouched, slice 21's checks included.

##### Dependencies
`../lib/streaming-questions-sweeper` (new edge, lazy) and `../lib/safe-fs` (already used lazily, lines 379, 595, 822, 838
and 850 on 2026-10-19).

##### Called By
`decide` (lines 1105-1141 on 2026-10-19), from `main` (lines 1153-1182), the command `hooks/hooks.json` registers (lines
4-14, the command at line 10).
The hook is a declared reachability root (`.ctoc/reachability-roots.json` line 11), so the sweeper exports it uses have a
live caller.

##### Error Handling
`recordWaitingWrite` catches everything, and `decide`'s fail rule is unchanged.

##### Cross-Platform Notes
Paths through `path.dirname`, `path.resolve`, `path.basename` and the sweeper's `path.join`, so the comparison with
`pendingDir(project)` holds on Windows separators; the record's place follows the Write target, so a working folder spelled
through a symbolic link or a Windows junction changes nothing; `Buffer.byteLength` measures bytes as the sweeper's size limit
does. A folder name in another letter case is not recorded: the sweeper then drops that file's classification (fail
closed).

#### File: `src/lib/streaming-questions-sweeper.js`
**Action:** MODIFY
**Purpose:** a classified waiting file keeps its classification only when the critique the menu started wrote it, for the
plan's current text; any other keeps its questions and is taken in unclassified.
**Change Type:** modify-existing

##### Changes
- **The header**: after the paragraph that ends "it can never AUTHOR the file a human reads." (line 29), insert:

```js
 *
 * ── Only a critique the menu started (four-defects slice 24) ────────────────────
 * A waiting file can be written by any background agent holding the Write tool, and by any
 * program. The gate critic's classification block in it is a claim anybody can type, and a
 * classified file can move its plan. So a file carrying a valid block keeps it only when
 * three records agree: the write protection recorded a background agent's Write of exactly
 * this content to exactly this file (`waitingWritesPath`); that agent is the one the menu
 * recorded on this plan's most recently started gate-critique task (`classify` or
 * `precompute`), which is running, orphaned or done and was never asked to cancel; and the
 * plan's text is the text that task started on (its `critiquedPlanSha256`). Any other such
 * file keeps its questions and loses every claim — the block, its attestation, and the gate
 * ruling and coverage notice only an attested synthesis may carry — and goes on as an
 * author's file: it moves nothing, and the continuation queues a fresh classification of it
 * (`classification-not-attributed` in the log, `declassified` in the report). The verified
 * text hash is handed to the writer by name: the binding is the menu's, never the payload's.
```

- **"Who reads the discard log"** (header, lines 55-60): after "is one of the closed-set literals below." add "A line
  with reason `classification-not-attributed` records a file whose classification was dropped; its questions were taken in
  unless a second line names why that file was discarded."

- **After `MAX_LOG_BYTES`** (line 83), insert:

```js
/** The write protection's record of the waiting folder's writers, under `.ctoc/streaming/`. */
const WAITING_WRITES_FILE = 'waiting-folder-writes.jsonl';

/**
 * The record is rotated to `<record>.1` (one older half kept) once it passes this size; the
 * reader ignores a half past twice this size (the write protection never writes one that big).
 */
const WAITING_WRITES_ROTATE_BYTES = 1024 * 1024;

/**
 * The write protection's record of who wrote into the waiting folder (four-defects slice 24):
 * one JSON line per background agent's Write, `{ ts, agent, file, sha256 }`. CTOC writes it
 * only from `src/hooks/protect-records.js`; that hook refuses it to every editing tool, as
 * everything under `.ctoc/streaming/` but the waiting folder. Since the owner's removal of
 * 2026-10-15 a shell command is not refused, so the record guards against honest mistakes,
 * not deliberate forgery.
 * @param {*} root project root
 * @returns {string|null} null when `root` is not a usable non-empty string
 */
function waitingWritesPath(root) {
  if (typeof root !== 'string' || root.length === 0) return null;
  return path.join(root, '.ctoc', 'streaming', WAITING_WRITES_FILE);
}

/**
 * sha256 (hex) of a waiting file's JSON VALUE — `JSON.stringify(JSON.parse(text))` — so the
 * whitespace or line endings a tool writes change nothing; null when the text is not JSON.
 * The one encoding the write protection records and the sweeper checks.
 * @param {*} text
 * @returns {string|null}
 */
function waitingFileSha256(text) {
  try {
    return crypto.createHash('sha256').update(JSON.stringify(JSON.parse(text))).digest('hex');
  } catch {
    return null;
  }
}

/**
 * The agents the record names as writers of `file` with content hash `sha256`, from both
 * halves. Fail-soft to none: an absent, unreadable or oversized half, a link or a folder in a
 * half's place (lstat: never read through), and an unparseable line name nobody.
 * @returns {Set<string>}
 */
function recordedWriters(root, file, sha256) {
  const writers = new Set();
  // Never null here: promotePendingFile reaches this only after pendingQuestionsPath accepted `root` (step 7).
  const current = /** @type {string} */ (waitingWritesPath(root));
  for (const p of [`${current}.1`, current]) {
    let raw;
    try {
      const st = safeFs.lstatSync(p);
      if (!st.isFile() || st.size > 2 * WAITING_WRITES_ROTATE_BYTES) continue;
      raw = safeFs.readFileSync(p, 'utf8');
    } catch {
      continue; // absent or unreadable: it names nobody
    }
    for (const line of raw.split('\n')) {
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      if (entry && entry.file === file && entry.sha256 === sha256 && typeof entry.agent === 'string' && entry.agent !== '') {
        writers.add(entry.agent);
      }
    }
  }
  return writers;
}

/** The statuses of a started critique whose critic's file may count: never cancelling, cancelled or failed. */
const COUNTED_CRITIQUE_STATUSES = new Set(['running', 'orphaned', 'done']);

/**
 * Did the gate critique the menu started for `ref` write this classified file, for the plan
 * text it started on? Only the plan's most recently started `classify` or `precompute` task
 * decides (highest `ts.started`, a later registry entry winning a tie; a start that records no
 * agent included, so a critique started after another supersedes it before its gate critic is
 * stamped), and only while it is running, orphaned or done and its cancellation was never
 * requested: `actions.cancelTask` stamps `ts.cancelRequested` on every cancel of a running
 * task and the registry keeps it through every load and update, so a critique cancelled and
 * then completed anyway (cancelling → done) never counts again. True when that task records a
 * real agent id (`task-reconcile.isRealAgentId`: a non-empty id that is not the task's own; a
 * start without `--agent-id` records none), its `critiquedPlanSha256` is the plan's text now,
 * and the record names that agent as a writer of exactly this content to this file. Any
 * recorded Write of the same content by that agent counts: identical bytes are the critic's
 * own words, and the text check stops a replay of an earlier critique.
 * @param {string} root
 * @param {string} ref
 * @param {string} file the waiting file's name
 * @param {string} raw the waiting file's text
 * @param {string|null} currentSha256 the plan's text now (`planContentSha256`)
 * @returns {boolean}
 */
function attributedCritique(root, ref, file, raw, currentSha256) {
  if (typeof currentSha256 !== 'string') return false;
  const sha256 = waitingFileSha256(raw);
  if (sha256 === null) return false;
  let latest = null;
  let latestAt = -Infinity;
  for (const t of require('./task-registry').load(root).tasks) {
    if ((t.kind !== 'classify' && t.kind !== 'precompute') || t.plan !== ref) continue;
    const at = Date.parse(t.ts && t.ts.started);
    if (Number.isNaN(at) || at < latestAt) continue; // never started, or started before the latest so far
    latest = t;
    latestAt = at;
  }
  return latest !== null && COUNTED_CRITIQUE_STATUSES.has(latest.status)
    && typeof latest.ts.cancelRequested !== 'string' // a cancel was requested: never counts again
    && require('./task-reconcile').isRealAgentId(latest.agentTaskId, latest.id)
    && latest.critiquedPlanSha256 === currentSha256
    && recordedWriters(root, file, sha256).has(latest.agentTaskId);
}
```

  and `const crypto = require('crypto');` beside the other requires (lines 63-65). `task-registry.load` never throws for a
  usable root (its own fail-open contract, `src/lib/task-registry.js` lines 401-464), and `promotePendingFile` is reached
  only after `pendingQuestionsPath` resolved for that root (step 7), so no catch is written around it. Every loaded task
  carries a `ts` object (`normalizeLoadedTask`, lines 349-357), and the cancel request is recorded already: `cancelTask`
  writes `ts.cancelRequested` when a running task is cancelled, with or without `--force` (`src/lib/actions.js` lines 2353
  and 2364), `updateTask` merges `ts` (`src/lib/task-registry.js` line 797), `normalizeLoadedTask` keeps it (line 355), and
  `cancelling → done` is a legal transition (line 188). A queued task cancels straight to `cancelled`, which never counts.
- **`promotePendingFile`'s doc comment** (lines 96-130): the ladder gains, after step 10, "11. ONLY A CRITIQUE THE MENU
  STARTED: a payload carrying a valid gate-critic classification block keeps it only through `attributedCritique`;
  otherwise its classification, its attestation and its gate ruling and coverage notice are dropped and it goes on as an
  author's file, marked `declassified`"; the old step 11 becomes step 12, and it receives the verified text hash by name.
  After "THE FRESHNESS STAMP IS THE SWEEPER'S, NEVER THE PAYLOAD'S" add the sentence "Nor is the text binding: a payload's
  own `critiquedPlanSha256` is never read." The `@returns` becomes `{{ok: true, ref: string, declassified?: boolean} |
  {ok: false, reason: string, errors?: string[], declassified?: boolean}}`.
- **In `promotePendingFile`, between step 10 (lines 188-192) and step 11 (line 194)**, insert:

```js
  // 11. ONLY A CRITIQUE THE MENU STARTED (four-defects slice 24). A valid gate-critic block is
  //     a claim anybody can type, and a classified file can move its plan: it keeps the block
  //     only when the gate critic of this plan's latest critique task wrote exactly this
  //     content, for this text. Otherwise the file keeps its questions and loses every claim —
  //     the block, the attestation, and the gate ruling and coverage notice that only an
  //     attested synthesis may carry (`streaming-precompute` `reservedIdErrors`) — and goes on
  //     as an author's file does: it moves nothing, and the continuation queues its check.
  let questions = payload.questions;
  let attestation = payload.attestation;
  let classification = payload.classification;
  let critiquedPlanSha256;
  let declassified = false;
  if (precompute.isGateCriticClassification(classification)) {
    const now = precompute.planContentSha256(root, ref);
    if (attributedCritique(root, ref, path.basename(absFile), raw, now)) {
      critiquedPlanSha256 = now;
    } else {
      declassified = true;
      classification = undefined;
      attestation = undefined;
      if (Array.isArray(questions)) questions = questions.filter((q) => !(q && precompute.isTopiclessId(q.id)));
    }
  }
```

  and the writer call with its result (lines 215-222) becomes:

```js
  const written = precompute.writePlanQuestions(
    root, ref, questions, currentMtimeMs, attestation, classification, { critiquedPlanSha256 },
  );
  /** Set only on a file whose classification step 11 dropped (four-defects s24). */
  const mark = declassified ? { declassified: true } : {};
  if (written.ok === true) return { ok: true, ref, ...mark };
  // The writer keeps the gate critic's classified file for this revision; that refusal gets its
  // own closed-set reason in the discard log, so a human can see why the file did not land.
  const reason = written.reason === 'would-replace-classified' ? 'would-replace-classified' : 'invalid-questions';
  return { ok: false, reason, errors: written.errors, ...mark };
```

  The comment above that call (lines 194-214) is renumbered `// 12.`, reads `questions`, `attestation` and `classification`
  for `payload.…`, and gets one more sentence: "The classification counts only bound to the text step 11 verified, which
  travels by name in the writer's options." A file without a valid block takes exactly today's path: `declassified` stays
  false and the three values are the payload's own.
- **In `sweepPendingQuestions`**, the report's type gains `declassified?: string[]` (doc and `@type`, lines 264-270: "the
  refs taken in without the classification they carried; present only when one was"), and the per-file block (lines
  311-318) becomes:

```js
    const result = promotePendingFile(root, absFile);
    // four-defects s24: a classification nobody could tie to the critique the menu started is
    // logged first, whether its questions were then taken in or the file was discarded.
    if (result.declassified === true) logDiscard(root, name, 'classification-not-attributed');
    // `=== true` narrows the discriminated union for `tsc --checkJs`.
    if (result.ok === true) {
      report.promoted.push(result.ref);
      if (result.declassified === true) {
        if (!report.declassified) report.declassified = [];
        report.declassified.push(result.ref);
      }
    } else {
      report.discarded.push({ file: name, reason: result.reason });
      logDiscard(root, name, result.reason);
    }
```

  Present only when non-empty, so every report of a sweep without such a file is byte for byte today's (four cases of
  `tests/streaming-questions-sweeper.test.js` compare the whole report: lines 172, 178, 460 and 499-500).
- **`module.exports`** (lines 330-338) gains `WAITING_WRITES_ROTATE_BYTES`, `waitingWritesPath` and `waitingFileSha256`.

##### Dependencies
`crypto`; `./task-registry` (lazy, read only); `./task-reconcile` (lazy, for its pure `isRealAgentId`, the one encoding of
"a real agent id" the reconcile, the sweep and `menu task start` share); `./streaming-precompute` (already required, line
65), now also for `planContentSha256` and `isTopiclessId`.

##### Called By
`sweepPendingQuestions` (lines 268-328), from `streaming-gate.nextUnansweredQuestion` (`src/lib/streaming-gate.js` line 410
on 2026-10-19), `streaming-gate.streamingGateScreen` (line 2132), `streaming-gate.planDecisionScreen` (line 1634) and
`menu-screens.continueAfterCrossing` (`src/lib/menu-screens.js` line 2896), which now keeps the sweep's report and reads its
`declassified`. `waitingWritesPath`, `waitingFileSha256` and
`WAITING_WRITES_ROTATE_BYTES` are used by the hook.

##### Data Flow
```
waiting file (untrusted, any writer) --ladder 1-10--> payload, raw
  --valid gate-critic block?--no--> writePlanQuestions as today (unclassified, unbound)
                           --yes--> planContentSha256(plan now)
                                    + the plan's latest started critique task {classify|precompute, plan=ref}
                                      (running, orphaned or done; no cancel requested; agent stamped;
                                       critiquedPlanSha256 = now)
                                    + the record names that agent as a writer of (file, sha(raw JSON))
                                    --yes--> writePlanQuestions(…, classification, { critiquedPlanSha256 })
                                    --no--> log 'classification-not-attributed'; drop the block, the attestation,
                                            the ruling and the notice; writePlanQuestions as an author's file
                                            --ok--> promoted + declassified (the continuation queues its check)
                                            --refused--> discarded with the writer's reason (e.g. a bound
                                                         classified file of this revision stays)
```

##### Error Handling
Every new read fails toward "not attributed", and "not attributed" keeps the questions and drops the claims; a file the
writer then refuses joins the existing closed set and the existing log and delete.

##### Cross-Platform Notes
`path.join` for the record; `path.basename` for the file name; no shell.

#### File: `src/lib/streaming-precompute.js`
**Action:** MODIFY
**Purpose:** one encoding of the plan's text; a classification is stored and read only bound to it, under a field name that
is this slice's own; the writer's new value travels by name.
**Change Type:** modify-existing

##### Changes
- **After `refToPlanPath`** (lines 193-206), insert:

```js
/** A sha256 digest in lower-case hex, the one form a plan-text binding takes. */
const SHA256_HEX = /^[0-9a-f]{64}$/;

/**
 * sha256 (hex) of the bytes of the plan file `ref` names, or null when the ref is malformed or
 * the file cannot be read. The one encoding of "the plan's text" a gate critique is bound to
 * (four-defects slice 24): the menu records it when a gate-critique task starts
 * (`menu-screens.taskTransition`), the sweeper compares it before it promotes a classified file,
 * the writer stores it with the classification, `planQuestionsStatus` compares it on every read
 * and hands it to the verdict, and `streaming-gate.crossBySufficiency` compares that with the
 * bytes it moves. A modification time can be set back; a text cannot be faked.
 * @param {string} root project root
 * @param {string} ref plan reference ("stage/file.md")
 * @returns {string|null}
 */
function planContentSha256(root, ref) {
  const planPath = refToPlanPath(root, ref);
  if (planPath === null) return null;
  try {
    return crypto.createHash('sha256').update(safeFs.readFileSync(planPath)).digest('hex');
  } catch {
    return null; // unreadable: no text to bind to
  }
}
```

- **`writePlanQuestions`** (lines 591-687) takes a seventh parameter, `opts`, an object of named values: this slice's one
  new value travels by name, never by position (plan 00411 plans a sixth positional parameter for the same function;
  Neighbours). Its doc comment gains, after the block on the classification (lines 612-629):

```js
 * ── The optional `opts` (seventh parameter): values passed by name ────────────
 * A new value reaches this writer by name in `opts`, never as one more position
 * (four-defects slice 24). `opts.critiquedPlanSha256` is the plan text a gate-critic
 * classification is bound to. Stored only with a valid classification: the value given when
 * it is a lower-case hex sha256 (the sweeper passes the text its attribution check verified),
 * else the plan's text as it is now (`planContentSha256`; every production classification
 * comes through the sweeper, so this branch serves direct callers — a new production caller
 * that passes a classification must pass the verified text). A plan that cannot be read
 * leaves the file unbound, and an unbound classification counts as none
 * (`planQuestionsStatus`). Any other key of `opts` is ignored.
 * @param {{critiquedPlanSha256?: string}} [opts] values passed by name
```

  The signature becomes `function writePlanQuestions(root, ref, questions, planMtimeMs, attestation, classification,
  opts = {})`, and after the `classification` block (lines 671-673) insert:

```js
  if (isGateCriticClassification(classification)) {
    const given = opts && typeof opts === 'object' ? opts.critiquedPlanSha256 : undefined;
    const bound = typeof given === 'string' && SHA256_HEX.test(given) ? given : planContentSha256(root, ref);
    if (bound !== null) record.critiquedPlanSha256 = bound;
  }
```

  A write without a valid classification is byte-for-byte as today, whatever `opts` holds.
- **`existingClassified`** (line 655) becomes

```js
  // A classified file counts as one only bound to its plan text (four-defects slice 24): an
  // unbound block is none, so it neither blocks an author's file nor binds the next write.
  const existingClassified = existing !== null && isGateCriticClassification(existing.classification)
    && typeof existing.critiquedPlanSha256 === 'string';
```

  and the doc comment's sentence "A file the gate critic classified is never replaced by an unclassified one for the SAME
  plan revision" (line 617) reads "A file the gate critic classified — bound to its plan text, `critiquedPlanSha256` — is
  never replaced by an unclassified one for the SAME plan revision".
- **`planQuestionsStatus`**: after the staleness check (lines 808-813), insert:

```js
  // 3b. THE TEXT (four-defects slice 24). A file the gate critic classified records the sha256
  //     of the plan text its critique started on. When the plan's text no longer matches, the
  //     plan changed after its questions were checked — whatever its modification time says,
  //     because a time can be set back. Read only for a file that records one.
  const bound = typeof parsed.critiquedPlanSha256 === 'string';
  if (bound && parsed.critiquedPlanSha256 !== planContentSha256(root, ref)) {
    return {
      status: 'stale',
      reason: `${shownRef} changed after its questions were checked: its text is not the text they were checked against`,
    };
  }
```

  and the `classified` field (lines 832-833) becomes, with the bound text handed on beside it:

```js
    // Did the independent gate critic assign these topics, for this text of the plan? A block
    // without the text it was checked against (written before four-defects slice 24, or around
    // the writer) is not evidence: without it no topic decides.
    classified: bound && isGateCriticClassification(parsed.classification),
    // The text the stored questions are bound to — just compared, so it is the plan's text as
    // read now — or null. A crossing compares it with the bytes it moves (four-defects s24).
    critiquedPlanSha256: bound ? parsed.critiquedPlanSha256 : null,
```

- **`hasEnoughInformation`**: its last return (line 1302), the only `enough: true` one, carries the binding:

```js
  // The text this verdict was read for (four-defects slice 24): an `enough` verdict is always of
  // a classified file, so always bound; the crossing refuses bytes that hash otherwise.
  return { enough: true, reason: 'enough', unanswered, blocking: [], unboundAnswers: answers.unbound, computed, answered, classified, revisionMs, critiquedPlanSha256: status.critiquedPlanSha256 };
```

- **Doc comments**: the `'ready'` shape of `planQuestionsStatus` (line 697) gains `critiquedPlanSha256` and its `@returns`
  (lines 734-736) gains `critiquedPlanSha256?:(string|null)`; the `'stale'` line (line 703) becomes "computed, but the plan
  changed since: its time is newer, or a classified file's text binding no longer matches"; the `'unclassified'` entry of
  `hasEnoughInformation` (lines 1201-1203) gains "— and a block that does not record the plan text it was checked against
  is no classification", and its `@returns` (lines 1218-1220) gains `critiquedPlanSha256?: string` ("on an `enough`
  verdict only: the plan text it was read for").
- **`isTopiclessId`** (lines 218-231) is unchanged and is exported: the sweeper drops, from a file whose classification it
  drops, the two reserved questions the writer accepts only in an attested synthesis (`reservedIdErrors`, lines 549-560).
- **`module.exports`** (from line 1305) gains `planContentSha256` and `isTopiclessId`.
- `isGateCriticClassification` (lines 250-254) is unchanged: the block stays exactly `{ by, at }`, and the binding is a field
  of the file, next to `planMtimeMs`. The field is named `critiquedPlanSha256`, never `planSha256`: plan 00410 adds a field
  named `planSha256` to every question file with another meaning (Neighbours).

##### Dependencies
None new (`crypto` line 78, `safeFs` line 80).

##### Called By
`planContentSha256`: the sweeper (`promotePendingFile`), `menu-screens.taskTransition`, `writePlanQuestions`,
`planQuestionsStatus`. `isTopiclessId`: the sweeper (`promotePendingFile`), and inside this module as today.
`planQuestionsStatus` keeps its callers (`hasEnoughInformation`, `nextUnansweredQuestion`, `queueClassification`,
`plansNeedingQuestions`, the screens); the verdict's `critiquedPlanSha256` is read by `streaming-gate.sufficiencyFor`, which
hands it to `crossBySufficiency`.

##### Error Handling
`planContentSha256` never throws. A reader that cannot hash the plan reads a bound file as `stale` (fail closed).

##### Cross-Platform Notes
The hash is of the file's bytes as stored; it is compared on the same machine that recorded it.

#### File: `src/lib/streaming-gate.js`
**Action:** MODIFY
**Purpose:** a sufficiency crossing records and moves exactly the text its verdict was read for; the owner's screens say when
a gate critic's check was not taken in.
**Change Type:** modify-existing

##### Changes
- **Requires** (lines 42-48): add `const crypto = require('crypto');`.
- **`sufficiencyFor`** (from line 594 on 2026-10-19): `closed` (lines 595-602) gains `critiquedPlanSha256: null`; the
  return (lines 619-633) gains

```js
      // The plan text an `enough` verdict was read for (four-defects slice 24); null otherwise.
      critiquedPlanSha256: typeof v.critiquedPlanSha256 === 'string' ? v.critiquedPlanSha256 : null,
```

  and its `@returns` (lines 587-593) gains `critiquedPlanSha256:(string|null)`.
- **`crossBySufficiency`** (from line 904): the read at line 908, `const content = safeFs.readFileSync(planPath, 'utf8');`,
  becomes

```js
    // ONE read (four-defects slice 24): the bytes recorded and moved are the bytes whose text the
    // verdict's classification was checked against. A plan rewritten after the verdict was read —
    // its time set back or not — is not crossed on a check of another text.
    const bytes = safeFs.readFileSync(planPath);
    if (typeof verdict.critiquedPlanSha256 !== 'string'
        || crypto.createHash('sha256').update(bytes).digest('hex') !== verdict.critiquedPlanSha256) return false;
    const content = bytes.toString('utf8');
```

  and the doc comment's `@param {object} verdict` gains "Its `critiquedPlanSha256` must be the sha256 of the bytes read
  here, or nothing is crossed; a verdict without one crosses nothing." Decoding the one Buffer is what
  `readFileSync(planPath, 'utf8')` did, so the ledger content is unchanged. The comparison comes before
  `crossingBlocked` (line 911), so a verdict that carries no text never reaches the refusals there; that is why
  sufficiency-evidence cases 10 and 10b bind theirs.
- **`continueAfter`** (lines 2337-2352 on 2026-10-19): the sentence (line 2347) becomes

```js
    const notTakenIn = Array.isArray(cont.notTakenIn) ? cont.notTakenIn : [];
    const sentence = [started.length > 0 ? `Started in the background: ${started.join('; ')}.` : '', ...notTakenIn]
      .filter(Boolean).join(' ');
```

  and its doc comment "phrase what it started in one sentence" becomes "phrase what it started in one sentence, followed by
  one sentence per plan whose gate critic's check was not taken in (four-defects slice 24)".
- **`checkState`** (lines 1827-1847 on 2026-10-19): a revision whose `classify` task is done while its file is still
  unclassified (both callers read it only then) is `'not-taken-in'`, and one the reconcile orphaned is `'orphaned'`
  (revision 3, the owner's answer to q18):

```js
  if (tasks.some((t) => t.status === 'queued' || t.status === 'running' || t.status === 'cancelling')) return 'checking';
  if (tasks.some((t) => t.status === 'done')) return 'not-taken-in'; // four-defects s24: it ran; its file was not taken in
  // four-defects s24: the menu lost track of its agent; it cannot tell whether that check finished.
  if (tasks.some((t) => t.status === 'orphaned')) return 'orphaned';
  return tasks.length > 0 ? 'ended' : 'none';
```

  Its doc comment's "`'ended'` when one finished or failed" becomes "`'not-taken-in'` when one is done but the file is still
  unclassified (its classification was dropped, or it never wrote one), `'orphaned'` when the reconcile orphaned one (the
  menu cannot tell whether it finished), `'ended'` when one failed or was cancelled"; the `@returns` gains
  `'not-taken-in'` and `'orphaned'`.
- **`CHECK_LINES`** (lines 1850-1854) gains

```js
  'not-taken-in': "  The gate critic's check of its questions ran but was not taken in; they stay unchecked and it waits for your approval.\n",
  orphaned: '  The menu lost track of the gate critic checking its questions, so it cannot tell whether that check finished; none was taken in, so they stay unchecked. Approve it yourself, or change the plan to have them checked again.\n',
```

  and `uncheckedLines`' `@param` (line 1863) gains `'not-taken-in'` and `'orphaned'`. Neither caller offers "Check its
  questions" for either (both offer it only on `'none'`, lines 1717 and 2086): a classification is never retried in a loop.
  The `'orphaned'` line claims neither that the check finished nor that it did not: the menu cannot tell from its registry
  whether an orphaned critic wrote its file, and the screen shows the line only while the stored questions are
  unclassified (Decision 51).
- Nothing else changes; slice 23's changes to `pendingGateDecisions`, `gateScreenAt` and the screens stay as it leaves them.

##### Dependencies
`crypto` (new require); nothing else.

##### Called By
`sufficiencyFor` and `crossBySufficiency` from `pendingGateDecisions` (lines 1087 and 1101 on 2026-10-19), the
continuation's crossing pass; `continueAfter` from `streamApprove` (line 2314) and `streamAnswer` (line 2505); `checkState`
from `planDecisionScreen` (line 1713) and `gateScreenAt` (line 2067), the plan's screen and the default gate screen.

##### Error Handling
`crossBySufficiency` keeps its fail-soft `catch` (a read fault returns false); a hash that differs returns false before
anything is written. `continueAfter` keeps its catch.

##### Cross-Platform Notes
The hash is of the bytes as stored; no path is built.

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** a gate-critique task records the text of its plan when it starts, and its critic's id can be recorded even after
the reconcile orphaned it or the session completed it early; the owner is told when a gate critic's check was not taken in.
**Change Type:** modify-existing

##### Changes
In `taskTransition` (lines 2458-2629 on 2026-10-19), inside the `withRegistry` callback:
- **After** `if (!task) throw new Error('task-registry: unknown task id ' + String(id));` (line 2518), insert:

```js
    /** A gate critique: its critic's classified file counts only through this task (four-defects s24). */
    const critique = task.kind === 'classify' || task.kind === 'precompute';
```

- **The existing stamp branch** (lines 2531-2553: a running task, accepted while its recorded agent is not a real agent id,
  `taskReconcile.isRealAgentId`) is **not changed**, comment and condition included:
  `tests/the-session-claims-a-build-before-launching-it.test.js` case 1 finds it by its literal head
  `if (kind === 'start' && task.status === 'running'` and reads the comment above it (Decision 52). **After its closing
  brace** (line 2553), insert a branch of its own for a gate critique that is orphaned or done:

```js

    // four-defects s24: a gate critique (`classify` or `precompute`) is stamped also after the
    // reconcile orphaned it, and after it was completed — the session may have completed a
    // precompute early, when a lens critic returned — because the sweeper counts its critic's
    // file only when the critic's id is recorded here. Its status stays as it is, and it still
    // records at most one agent: the id already recorded is accepted again without a write, and
    // any other recorded agent refuses the stamp.
    if (kind === 'start' && critique && (task.status === 'orphaned' || task.status === 'done')
        && typeof p.agentId === 'string' && p.agentId !== '') {
      if (task.agentTaskId === p.agentId) {
        ctx.abort();
        return { ok: true, taskId: id, status: task.status, text: `Task ${id} → ${task.status} (agent ${p.agentId} already recorded)` };
      }
      if (!taskReconcile.isRealAgentId(task.agentTaskId, task.id)) {
        taskRegistry.updateTask(reg, id, { agentTaskId: p.agentId });
        return { ok: true, taskId: id, status: task.status, stamped: true, text: `Task ${id} → ${task.status} (agent ${p.agentId} recorded)` };
      }
      ctx.abort();
      return {
        ok: false,
        refused: true,
        taskId: id,
        reason: 'agent-recorded',
        text: `Task ${id} NOT stamped — it already records agent ${shownAgentId(task.agentTaskId)}; a critique records one agent.`,
      };
    }
```

  The agent id has already passed the two checks above the callback (`AGENT_ID`, line 2496; `isRealAgentId`, line 2508).
  A running task of any kind takes the existing branch exactly as today. A done or orphaned task of any other kind still
  falls through to `canTransition` and is refused as today (`orphaned → running` and `done → running` are illegal,
  `src/lib/task-registry.js` lines 185-193). The menu checks no caller. Slice 21 refuses a background agent's plain
  `menu task start`, the stamp included; a script the agent writes and runs is not refused, so it could stamp its own id
  on an unstamped critique (residual 1, Decision 37).
- **The guarded start**: `taskRegistry.updateTask(reg, id, { status: 'running', agentTaskId: p.agentId || null });` (line
  2588) becomes:

```js
      // four-defects s24: a gate critique records the text of its plan as it starts, so the
      // sweeper counts the critic's classification only for that text. The session starts every
      // gate critique before any of its agents is launched (start.md), so this is the text each
      // of its critics reads; the later `--agent-id` stamp keeps it. A read with no side effect,
      // repeated as is on a compare-and-swap retry.
      /** @type {{status: string, agentTaskId: (string|null), critiquedPlanSha256?: (string|null)}} */
      const patch = { status: 'running', agentTaskId: p.agentId || null };
      if (critique) patch.critiquedPlanSha256 = require('./streaming-precompute').planContentSha256(root, task.plan);
      taskRegistry.updateTask(reg, id, patch);
```

  The H8 comment above it (lines 2585-2587) stays.
- Nothing else in `taskTransition` changes: a build's start still goes to `actions.claimBuild` (lines 2525-2529,
  2624-2628); `fail` and `cancel` are untouched.

In the continuation and the human's "Check its questions":
- **`continueAfterCrossing`** (lines 2891-2941 on 2026-10-19): the sweep (lines 2895-2899) keeps its report:

```js
  let swept = null;
  try {
    swept = require('./streaming-questions-sweeper').sweepPendingQuestions(root);
  } catch {
    reasons.push('sweep-failed');
  }
```

  the classification loop (lines 2923-2929) also keeps each plan's outcome:

```js
  const classifying = [];
  const outcomes = new Map(); // four-defects s24: what queueClassification answered, per ref
  for (const d of pending) {
    if (d.sufficiencyReason !== 'open-forks' && d.sufficiencyReason !== 'unclassified') continue;
    const queued = queueClassification(root, d.ref);
    outcomes.set(d.ref, queued);
    if (queued === 'queued') classifying.push(streamingGate.humanPlanName(d.title, d.slug));
    else if (queued === 'failed') reasons.push('classify-not-queued');
  }
```

  and the result gains `notTakenIn`, after that loop:

```js
  // four-defects s24: each gate critic's check this sweep could not tie to the critique the
  // menu started is told to the owner, one sentence per plan still waiting at a gate.
  const notTakenIn = notTakenInSentences(swept, pending, outcomes);
```

  returned as `{ crossed, promote, quarantined, pending, reasons, started, notTakenIn }` (line 2940); the early return of a
  failed crossing pass (line 2906) carries `notTakenIn: []`. The doc comment's step 1 (line 2867) gains "; its report is
  kept, and each plan whose gate critic's check it took in without the classification is named in `notTakenIn`, one
  sentence per plan still waiting"; the `@returns` (lines 2888-2889) gains `notTakenIn: string[]`.
- **After `continueAfterCrossing`**, insert:

```js
/**
 * One plain sentence per plan still waiting at a gate whose gate critic's check the sweep
 * could not tie to the critique the menu started, so took its questions in without the
 * classification (the report's `declassified`; four-defects slice 24). A ref is matched among
 * the decisions still pending and named by the menu's own title, so no text from the file
 * reaches a screen. The sentence says whether this pass queued a new check of it, a gate
 * critique of it is already queued or running, or the plan waits for the owner's approval (a
 * check already ran, failed or was cancelled for that question revision).
 * Fail-soft: a fault names nothing.
 * @param {{declassified?: string[]}|null} swept the sweep's report
 * @param {Array<{ref: string, title: string, slug: string}>} pending
 * @param {Map<string, string>} outcomes what queueClassification answered this pass, per ref
 * @returns {string[]}
 */
function notTakenInSentences(swept, pending, outcomes) {
  try {
    const refs = new Set((swept && swept.declassified) || []);
    if (refs.size === 0) return [];
    return pending.filter((d) => refs.has(d.ref)).map((d) => {
      const name = streamingGate.humanPlanName(d.title, d.slug);
      const head = `The gate critic's check of ${name} was not taken in; its questions were kept unchecked and`;
      const outcome = outcomes.get(d.ref);
      if (outcome === 'queued') return `${head} a new check is queued.`;
      if (outcome === 'critique-running') return `${head} a check of it is already queued or running.`;
      return `${head} it waits for your approval.`;
    });
  } catch {
    return []; // the sweep's own log still records it
  }
}
```

- **`continuationText`** (lines 3041-3052 on 2026-10-19): before `return out;` insert

```js
  for (const sentence of cont.notTakenIn || []) out += ` · ${sentence}`; // four-defects s24
```
- **`queueClassification`** (lines 2992-3011): the `@returns` gains `'critique-running'` and `'not-taken-in'`, and its doc
  comment the sentences "While a gate critique of the plan — a `precompute` or a `classify`, of any revision — is queued or
  running, nothing is queued (`'critique-running'`): that critique brings its own check, and a classification queued now
  would become the plan's latest critique once started and void that critique's file. A revision whose classification task
  is done while the file is still unclassified is `'not-taken-in'`: the check ran, and its classification was dropped or
  never written (four-defects slice 24)." The `exists` line (line 3005) becomes:

```js
    const tasks = taskRegistry.load(root).tasks;
    // four-defects s24: a gate critique of this plan still queued or running brings its own check;
    // a classification queued now would supersede it once started and void that critique's file.
    if (tasks.some((t) => (t.kind === 'precompute' || t.kind === 'classify') && t.plan === ref
      && (t.status === 'queued' || t.status === 'running'))) return 'critique-running';
    const same = tasks.filter((t) => t.kind === 'classify' && t.plan === ref && t.label === label);
    if (same.length > 0) return same.some((t) => t.status === 'done') ? 'not-taken-in' : 'exists';
```

  The continuation (lines 2926-2928) treats `'critique-running'` and `'not-taken-in'` as it treats `'exists'`: nothing is
  queued and nothing is added to `reasons`. A queued or running classification of the same revision now answers
  `'critique-running'` where it answered `'exists'`; both queue nothing (Decision 50).
- **`streamCheck`** (lines 3023-3038): the status map gains

```js
    'critique-running': `A check of ${file} is already queued or running; nothing was added.`,
    'not-taken-in': `The gate critic's check of ${file} ran but was not taken in; its questions stay unchecked and it waits for your approval.`,
```

##### Dependencies
`./streaming-precompute` (lazy, as `queueClassification` already requires it at line 3002); `./streaming-questions-sweeper`
(lazy, already); `streamingGate.humanPlanName` (already used at line 2927); `taskReconcile` and `shownAgentId` (already
in the module, lines 2508 and 2423).

##### Called By
`taskCommand` (from line 3297) for `menu task start`, reached through `route` from `src/commands/start.js`; the session runs
it as start.md tells it (below). `notTakenIn` is read by `continuationText` (`menu task complete <id> --continue`, lines 2679
and 2846) and by `streaming-gate.continueAfter` (`stream approve`, `stream answer`). `streamCheck` from `route`'s
`stream check` (line 3382).

##### Error Handling
`planContentSha256` returns null for a plan it cannot read; the task then records `critiquedPlanSha256: null`, which the
registry drops on load and which matches nothing (fail closed). `notTakenInSentences` and `queueClassification` fail soft,
as the other continuation steps do.

##### Cross-Platform Notes
No path is built here.

#### File: `src/lib/task-registry.js`
**Action:** MODIFY
**Purpose:** keep a gate-critique task's `critiquedPlanSha256` through every load and update.
**Change Type:** modify-existing

##### Changes
- **`MUTABLE_FIELDS`** (line 195) becomes
  `Object.freeze(['status', 'agentTaskId', 'result', 'label', 'touches', 'blockedBy', 'plan', 'critiquedPlanSha256'])`, its
  comment gaining "`critiquedPlanSha256`: the plan text a gate critique started on (four-defects slice 24)".
- **`normalizeLoadedTask`** (lines 330-359): after `result: t.result ?? null,` insert:

```js
    // four-defects s24: the text of its plan a gate critique started on (sha256), kept only in
    // its one valid form — a load never drops it and never keeps anything else in its place.
    ...(typeof t.critiquedPlanSha256 === 'string' && /^[0-9a-f]{64}$/.test(t.critiquedPlanSha256)
      ? { critiquedPlanSha256: t.critiquedPlanSha256 } : {}),
```

  A task without the field loads with exactly today's keys.

##### Called By
`load` (line 437), `updateTask` (lines 789-794); every registry reader and writer.

##### Error Handling / Cross-Platform Notes
None new.

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** the session starts every gate critique before any of its agents is launched — the moment the menu records the
plan's text — then launches, then records the gate critic's id, so the menu can tie the critic's file to that task and text;
and it completes a question precompute only when its gate critic returns.
**Change Type:** modify-existing

The build's own sentences stay word for word: `tests/the-session-claims-a-build-before-launching-it.test.js` (case 2, read
on 2026-10-19) pins "If `decision === "run"` and the task is not a build (a build's order is at the end of this step):
launch", "a build (`implement` naming a plan) is the exception: `menu task start <taskId>` comes FIRST", "Any other task:
launch `Agent(run_in_background)` + `menu task start <id> --agent-id <the harness agent id>`", the stamp paragraph's
"none (Start agent's claim) or the task's own id (an old placeholder an earlier version recorded, read as no id); the id
already recorded is accepted again without a write; any other recorded agent id is refused", and `STAMP_REFUSED`. Step 3
must stay one line (the test finds it by `**Promote.**`), and its first "launch `Agent(run_in_background)`" must still
come after "claimed FIRST". The gate critique's start-first order is added beside them; no pinned sentence is cut.

##### Changes
1. **WORK dispatch, step 2** (line 124 on 2026-10-19). (a) After the first sentence's parenthesis, which ends "only when
   the human names it in `menu task sweep`).", insert "A gate critique is the other exception; its order is at the end of
   this step." (b) At the end of the
   step, after "Any other refused stamp: show its text and leave the agent running.", append: "A gate critique — a
   `precompute` the owner asked for, or a `classify` the menu queued — is started FIRST too, like a build:
   `menu task start <taskId>` with no `--agent-id` records the text of the plan its critics will read, so it runs before any
   of that critique's agents is launched; a start that does not answer `ok` launches no agent: show its text. Then launch its
   agents — a `precompute` by the precompute recipe below, a `classify` by the classification paragraph below — and stamp the
   gate critic's id with `menu task start <taskId> --agent-id <the gate critic's harness agent id>`."
2. **COMPLETION step 1** (line 133): at its end, after "Never put `--continue` in an agent's brief.", append "A question
   precompute is completed only on its gate critic's return, after the stamp; a lens critic's return completes nothing."
3. **COMPLETION step 3** (line 135, on the same line): before "Any other task: launch `Agent(run_in_background)` +
   `menu task start <id> --agent-id <the harness agent id>`."
   insert "A gate critique is started FIRST too: a promoted `classify` — `menu task start <id>` with no `--agent-id` (it
   records the text of the plan its critic will read), then launch `gate-critic` as the classification paragraph below says,
   then stamp its id with `menu task start <id> --agent-id <the harness agent id>`; a promoted `precompute` follows the
   precompute recipe: start, lens critics, gate critic, stamp. A gate critique's start that does not answer `ok` launches no
   agent: show its text."
4. **The stamp paragraph** "Every screen that carries `promote[]` is handled the same way" (lines 137-148): after its
   pinned "any other recorded agent id is refused." and before "If the stamp answers", insert "On a gate critique
   (`classify` or `precompute`) the stamp is also taken once the reconcile orphaned it or it was completed, while it
   records no agent."
5. **The precompute recipe** (lines 288-291): "and on the scheduler's `run`:" becomes "and on the scheduler's `run`, first
   `menu task start <id>` with no `--agent-id` — it records the text of the plan the critics will read, so it comes before
   any critic is launched; a start that does not answer `ok` launches none: show its text. Then:". Step 3 (lines 354-359):
   after "the last question the gate ruling." append "Then stamp the task with the gate critic's id:
   `menu task start <id> --agent-id <the gate critic's harness agent id>` — the gate critic's, never a lens critic's: its
   file moves the plan only when the menu can tie it to that id. Complete the task only when the gate critic returns, after
   that stamp: a lens critic's return completes nothing."
6. **Step 4** (lines 360-374): after "deletes the pending file." insert "A file that carries the gate critic's classification
   keeps it only when CTOC's write protection recorded the gate critic of the plan's most recently started critique task —
   running, orphaned or done, never one whose cancellation was requested and never a failed one — writing exactly that
   content, and only while the plan's text is the text that task started on. Any other such file loses its classification,
   its attestation and its gate ruling and coverage notice, and is taken in as an author's file: its questions are kept, it
   moves nothing, the continuation queues a new check of it unless a check of it is already queued or running or one
   already ran for that question revision, and the status line says the gate critic's check of that plan was not taken in
   (`classification-not-attributed` in `.ctoc/logs/streaming-sweeper.jsonl`)."
7. **The classification paragraph** (lines 380-391): "Launch `gate-critic` alone as background WORK, then
   `menu task start <id> --agent-id <the harness agent id>`; its brief:" becomes "Start it first — `menu task start <id>`, no `--agent-id`: it records the
   text of the plan the critic will read, and a start that does not answer `ok` launches nothing — then launch `gate-critic`
   alone as background WORK, then stamp its id with `menu task start <id> --agent-id <the harness agent id>`, the id its
   launch returned. Its brief:". After "the next continuation sweeps it in." insert "It counts only when the write
   protection recorded this critic writing it and the plan's text has not changed since the task started; otherwise its
   questions are kept unchecked, the status line and the plan's screen say the check was not taken in, and the plan waits
   for the owner's approval as on a failed classification."

Nothing else in the file changes. Slices 9, 14, 18, 19, 21, 22 and 23 change other lines of this file (slice 21, built
first: the scope-growth paragraph and the inbox answer sentence); Step 9 re-reads these spans. The order and the
completion rule are pinned by S24-17 (a text assertion on five spans).

#### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY
**Purpose:** the streaming rules and the write protection say what the code now decides.
**Change Type:** modify-existing

##### Changes
1. **"Streaming questions"** (lines 133-161): after the paragraph at line 135, insert:

```markdown
**Only the critique the menu started counts (four-defects slice 24).** A question file that carries the gate critic's
classification can move its plan, so the sweeper lets it keep that classification only when three records agree. This is
a guard against honest mistakes, not a barrier: the first record is refused to every editing tool but, since the
owner's removal of 2026-10-15, not to a shell command, and the other two live in the task registry, which any shell
command can write; they are set through `menu task start --agent-id`, which the write protection refuses to a background
agent's plain call but not to a script file it wrote and runs. The three records: the write protection
recorded a background agent's Write of exactly that content (the sha256 of its JSON) to exactly that waiting file;
that agent is the one
the menu recorded on the plan's most recently started gate-critique task — the `classify` the continuation queues or the
`precompute` the owner asked for — and that task is running, orphaned or done, was never asked to cancel and did not fail
(the session starts the task before any of its agents is launched, then records the gate critic's id with
`menu task start <id> --agent-id`, the id its launch returned — also once the task was orphaned or completed early, while it
records no agent; it completes a precompute only when its gate critic returns); and the plan's text is the text
that task started on (its sha256, recorded by the menu at the start). Any other such file — another agent's Write, the main
session's, a program's, a launcher's, a critic launched for another plan, a critique a later one superseded, a cancelled or
failed one, a file written for an earlier text — keeps its questions and loses its classification, its attestation and the
gate ruling and coverage notice only an attested synthesis may carry; it is taken in as an author's file, moves nothing, is
logged as `classification-not-attributed`, and the continuation queues a new check of it unless a gate critique of that
plan is already queued or running or one already ran for that question revision. The continuation's status line tells the
owner that the gate critic's check of that plan was not taken in, that its questions were kept unchecked, and whether a new
check is queued, a check is already queued or running, or the plan waits for his approval; for a classification that
already ran, the plan's screen says it too, and "Check its questions" answers that the check ran but was not taken in. A
classification the menu lost track of (orphaned) is shown as such: the plan's screen says the menu cannot tell whether that
check finished, and that none was taken in. A file taken in classified records the plan text's sha256 (`critiquedPlanSha256`): a classified file whose
plan text no longer matches reads as stale whatever its modification time says, a classified file without that record
decides nothing, and a crossing on sufficiency reads the plan once and refuses when those bytes are not the text its verdict
was read for. An author's unclassified file needs none of this: it moves nothing.
```

2. **"The one loaded hook — write protection for the records"**, after the "What it protects" paragraph (lines 243-247),
   insert:

```markdown
**What it records (four-defects slice 24).** A background agent's Write into a waiting folder is allowed and first recorded
as one line of `.ctoc/streaming/waiting-folder-writes.jsonl` in the project that waiting folder belongs to — the folder above
its `.ctoc/streaming/questions/pending`, never the agent's working folder, so a critic working in its own worktree that
writes the main project's waiting folder is recorded there: the agent id Claude Code put in the hook's input, the file's name
and the sha256 of the JSON written. One older half, `.1`, is kept past 1 MiB. CTOC writes it only from the hook, and only to
a regular file, never through a symbolic link or into a folder in its place; it is under `.ctoc/streaming/`, so every
editing tool that would write it is refused. A shell command is not, since the owner's removal of 2026-10-15, so the record
guards against honest mistakes, not deliberate forgery. Both halves are per-machine runtime records, ignored by git. Only the Write tool is recorded, and a record
that cannot be written never refuses the Write — the file is then unattributed and is taken in without its classification.
The line is written when the hook allows the Write, before the Write runs: a Write that something later refuses (Claude
Code's permission rules, another hook) still leaves its line, and a later write of exactly those bytes into that waiting file
counts as that critic's, for the text its critique started on.
The `agent_id` Claude Code puts in a subagent's hook input is that agent's id, the one its launch returns and the session
records with `--agent-id` (read in Claude Code 2.1.296's own code). That cannot be observed live before a release: the hook
that runs is the installed copy, so the first gate critique after the release is the first live check. Were the two ever to
differ, no classification would be taken in — fail closed, shown to the owner on the status line and the plan's screen —
and his own approval would still move every plan, never the other way round.
```

3. **"What it refuses"** is not changed (revision 2: no inline-script name, no installed-code item, no Claude Code
   settings item; Decisions 39-41).

4. **"What it cannot catch"** (from line 522 on 2026-10-19, or wherever slice 21 left that list): insert the bullets "- a
   background agent that forges the critique's records: a shell append to the waiting-folder record or a shell write of
   the task registry — each allowed since the owner's removal of 2026-10-15 — or a script file it wrote and runs that
   stamps its own id on an unstamped critique, after which its own classified Write counts; the attribution is a guard
   against honest mistakes, and only isolating background agents from the main project's records would separate them;"
   and "- a background agent's Write that something after this hook refuses: its record line stays, and a later write of
   exactly those bytes into that waiting file, by anyone, counts as that critic's;". The existing bullet on the installed
   plugin's own files (lines 557-559, ending "holds only while the loaded hook is intact;") gains, before its closing
   semicolon, ", and the question sweeper and the menu run from there too, so a write there can also switch off the
   critique attribution". The settings protection's own bullets (lines 554-581) are
   not changed: they already name what it cannot catch on Claude Code's settings files (revision 3; revision 2's bullet
   "a write of Claude Code's settings files … nothing refuses it" is not written, because the settings protection now
   refuses it to a background agent).

#### File: `.gitignore`
**Action:** MODIFY
**Purpose:** per-machine runtime records of the question store stay out of git.
**Change Type:** modify-existing

##### Changes
After the "Deepthink's paper library" block (lines 49-50), append:

```gitignore

# The question store's per-machine runtime records (four-defects slices 24 and 7): the write
# protection's record of the waiting folder's writers and its older half, and the inbox answer
# record and its claim folder. The owner's answers log, answers.jsonl, stays tracked.
.ctoc/streaming/waiting-folder-writes.jsonl
.ctoc/streaming/waiting-folder-writes.jsonl.1
.ctoc/streaming/inbox-answers.jsonl
.ctoc/streaming/inbox-answered/
```

On 2026-10-19 the inbox answer record and five files in its claim folder exist in the main checkout (file search
`.ctoc/streaming/{inbox-answered/**,inbox-answers*,waiting-folder-writes*}`: six matches, no waiting-folder record), and
neither path is in git's index (an exact search of `.git/index` for `.ctoc/streaming/inbox-answer`: no match), so the
lines ignore them and untrack nothing. Step 15 records `git ls-files` (nothing tracked) and `git check-ignore -v`
(ignored) for each.

### Test Plan

**Framework:** `node:test` with `node:assert/strict`, as the five test files use today. No test file is added, so no
documented count moves and no ratchet file is declared. A case that needs a symbolic link is registered only off Windows,
with the platform check around the `test()`/`it()` (113, 115); a case of which only one part needs a link runs that part
inside the one registered case, behind the same platform check (S24-12). Never a skipped test: the zero-skipped
gate refuses one.

#### `tests/protect-records.test.js` — a describe after the last one

This plan calls these cases 108-115, the numbers they were first written with. Every one of those numbers is taken in the
file on 2026-10-19 (the sweep work's 100-108 and the settings protection's 112-138), and slice 21, built first, adds its
own. So Step 9 writes them after the last case the file then holds, in this order, records the mapping under
`## Execution Record`, and the plan keeps calling them 108-115; the titles after the number stay.

```js
// ═══════════════════════════════════════════════════════════════════════════
// four-defects slice 24 — a background agent's Write into a waiting folder is recorded (who,
// which file, the hash of the JSON written) in the project that folder belongs to, so the menu
// counts the gate critic's classification only when the critic it started wrote it. A guard
// against honest mistakes: since the owner's removal of 2026-10-15 a shell command can write
// the record (case 110 pins both).
// ═══════════════════════════════════════════════════════════════════════════

describe("the waiting folder's writers are recorded (four-defects slice 24)", () => {
  const crypto = require('node:crypto');
  const AGENT = 'a1b2c3d4e5f60718';
  const RECORD = () => p('.ctoc', 'streaming', 'waiting-folder-writes.jsonl');
  const PENDING = (...name) => p('.ctoc', 'streaming', 'questions', 'pending', ...name);
  const asAgent = (call, agent = AGENT) => ({ ...call, agent_id: agent, agent_type: 'gate-critic' });
  const agentWrite = (file, content, agent) => asAgent(payload('Write', { file_path: file, content }), agent);
  /** The hash the menu checks, derived here independently: the JSON value re-serialised without whitespace. */
  const canonical = (text) => crypto.createHash('sha256').update(JSON.stringify(JSON.parse(text))).digest('hex');
  const lines = () => (fs.existsSync(RECORD())
    ? fs.readFileSync(RECORD(), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  const pretty = JSON.stringify({ ref: 'implementation/x.md', questions: [], classification: { by: 'gate-critic', at: 1786000000000 } }, null, 2);

  test("108 · a background agent's Write of a JSON file into the waiting folder is allowed and recorded once", () => {
    assertAllowed(run(agentWrite(PENDING('implementation__x.md.json'), pretty)), 'the gate critic writes its file');
    const rec = lines();
    assert.equal(rec.length, 1);
    assert.deepEqual(Object.keys(rec[0]).sort(), ['agent', 'file', 'sha256', 'ts']);
    assert.equal(rec[0].agent, AGENT);
    assert.equal(rec[0].file, 'implementation__x.md.json');
    assert.equal(rec[0].sha256, canonical(pretty), 'the hash of the JSON value, whatever its whitespace');
    assert.ok(!Number.isNaN(Date.parse(rec[0].ts)));
  });

  test('109 · nothing else is recorded, and every one of these calls is still allowed', () => {
    const calls = {
      "the main session's Write into the waiting folder": payload('Write', { file_path: PENDING('x.json'), content: pretty }),
      'a Write elsewhere': agentWrite(p('src', 'x.json'), pretty),
      'a Write into a folder inside the waiting folder': agentWrite(PENDING('sub', 'x.json'), pretty),
      'a Write into a folder named pending that is no waiting folder': agentWrite(p('src', 'pending', 'x.json'), pretty),
      'a Write into a folder that does not exist yet': agentWrite(p('nowhere', 'x.json'), pretty),
      'a file that is not .json': agentWrite(PENDING('x.txt'), pretty),
      'content that is not JSON': agentWrite(PENDING('x.json'), '{ not json'),
      'no content at all': asAgent(payload('Write', { file_path: PENDING('x.json') })),
      'content over 512 KiB': agentWrite(PENDING('x.json'), JSON.stringify({ pad: 'x'.repeat(512 * 1024) })),
      'an agent id with a line break': agentWrite(PENDING('x.json'), pretty, 'a1\nb2'),
      'an agent id of 129 characters': agentWrite(PENDING('x.json'), pretty, 'a'.repeat(129)),
      "a background agent's Edit": asAgent(payload('Edit', { file_path: PENDING('x.json'), old_string: 'a', new_string: 'b' })),
      "a background agent's MultiEdit": asAgent(payload('MultiEdit', { file_path: PENDING('x.json'), edits: [{ old_string: 'a', new_string: 'b' }] })),
    };
    for (const [what, call] of Object.entries(calls)) {
      assertAllowed(run(call), what);
      assert.equal(fs.existsSync(RECORD()), false, `${what}: nothing recorded`);
    }
  });

  test('110 · the record and its older half are refused to every editing tool; a shell write is allowed (the owner\'s removal of 2026-10-15)', () => {
    for (const file of [RECORD(), `${RECORD()}.1`]) {
      assertRefused(run(write(file)), `Write of ${path.basename(file)}`);
      assertRefused(run(asAgent(write(file))), `a background agent's Write of ${path.basename(file)}`);
      assertRefused(run(payload('Edit', { file_path: file, old_string: 'a', new_string: 'b' })), `Edit of ${path.basename(file)}`);
    }
    // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the shell record refusal is off, so a shell write of
    // the record is allowed: the attribution is a guard against honest mistakes, not a barrier (revision 2, Decision 42).
    for (const command of ['echo x >> .ctoc/streaming/waiting-folder-writes.jsonl',
      'rm .ctoc/streaming/waiting-folder-writes.jsonl.1', 'cp /tmp/forged .ctoc/streaming/waiting-folder-writes.jsonl']) {
      allowedBash(command);
      assertAllowed(run(asAgent(bash(command))), `${command} (background agent)`);
    }
    allowedBash('cat .ctoc/streaming/waiting-folder-writes.jsonl');
  });

  test('111 · a record that cannot be written never refuses the Write', () => {
    fs.mkdirSync(RECORD(), { recursive: true }); // a folder in the record's place: nothing is appended
    const res = run(agentWrite(PENDING('implementation__x.md.json'), pretty));
    assertAllowed(res, 'the Write goes ahead');
    assert.equal(res.stderr, '');
  });

  test('112 · past 1 MiB the record moves to its older half and a fresh record holds the next line', () => {
    const old = 'x'.repeat(1024 * 1024 + 1);
    fs.writeFileSync(RECORD(), old);
    assertAllowed(run(agentWrite(PENDING('implementation__x.md.json'), pretty)), 'rotated');
    assert.equal(fs.readFileSync(`${RECORD()}.1`, 'utf8'), old, 'the older half is the old record, byte for byte');
    assert.equal(lines().length, 1, 'the fresh record holds only the new line');
  });

  if (process.platform !== 'win32') {
    test("113 · a working folder spelled through a link and a target spelled with the real path: recorded in the target's project", () => {
      const link = path.join(os.tmpdir(), `pr-rec-link-${process.pid}-${Date.now()}`);
      fs.symlinkSync(project, link);
      try {
        const call = { ...agentWrite(PENDING('implementation__x.md.json'), pretty), cwd: link };
        assertAllowed(run(call, { cwd: link }), "the critic's Write");
        assert.equal(lines().length, 1, 'recorded once, in the record of the project the Write targets');
      } finally {
        fs.rmSync(link, { force: true });
      }
    });
  }

  test("114 · a critic working in another folder (its own worktree) that writes this project's waiting folder is recorded here", () => {
    const other = makeProject(); // another project, standing in for the critic's own worktree
    try {
      const call = { ...agentWrite(PENDING('implementation__x.md.json'), pretty), cwd: other };
      assertAllowed(run(call, { cwd: other }), "the critic's Write");
      assert.equal(lines().length, 1, 'recorded in the project the Write targets');
      assert.equal(fs.existsSync(path.join(other, '.ctoc', 'streaming', 'waiting-folder-writes.jsonl')), false,
        'nothing in the working folder');
    } finally {
      fs.rmSync(other, { recursive: true, force: true });
    }
  });

  if (process.platform !== 'win32') {
    test("115 · a symbolic link in the record's place is never written through, and the Write is still allowed", () => {
      const elsewhere = p('src', 'elsewhere.jsonl');
      fs.writeFileSync(elsewhere, '');
      fs.symlinkSync(elsewhere, RECORD());
      assertAllowed(run(agentWrite(PENDING('implementation__x.md.json'), pretty)), 'the Write goes ahead');
      assert.equal(fs.readFileSync(elsewhere, 'utf8'), '', 'nothing was written through the link');
    });
  }

});
```

Revision 1's cases 116 (CTOC's installed code) and 117 (Claude Code's settings files) are not written: their refusals are
dropped (Decisions 39 and 40).

The cases use `ENTRY`, `payload`, `run`, `p`, `write`, `bash`, `assertRefused`, `assertAllowed`, `allowedBash`,
`makeProject` and `project` (lines 20-87 on 2026-10-19); `os` and `spawnSync` are required at lines 17 and 18.

*(Superseded, revision 1's leftover: "Cases 116 and 117 need a symbolic link only for their link parts …" through "nothing
is written into any settings file." Neither case is written.)*

#### `tests/streaming-questions-sweeper.test.js` — helpers, three realigned cases, and the S24 block

**Requires and helpers**, after `const streamingGate = …` (line 26):

```js
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const menuScreens = require('../src/lib/menu-screens.js');
const taskRegistry = require('../src/lib/task-registry.js');
const ledger = require('../src/lib/approval-ledger.js');
const { reconcileState } = require('../src/lib/task-reconcile.js');

const HOOK = path.join(__dirname, '..', 'src', 'hooks', 'protect-records.js');
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

/**
 * A gate critique as the session runs it (src/commands/start.md, four-defects slice 24): the
 * menu's task for `ref`, started first (the menu records the plan's text), then stamped with the
 * gate critic's agent id — the id its launch returned.
 */
function launchCritique(root, ref, agent, kind = 'precompute') {
  const add = menuScreens.route(['menu', 'task', 'add', kind, ref, '--touches', `.ctoc/streaming/questions/${ref}`], root);
  assert.equal(add.ok, true, JSON.stringify(add));
  const start = menuScreens.route(['menu', 'task', 'start', add.taskId], root);
  assert.equal(start.ok, true, JSON.stringify(start));
  const stamp = menuScreens.route(['menu', 'task', 'start', add.taskId, '--agent-id', agent], root);
  assert.equal(stamp.ok, true, JSON.stringify(stamp));
  return add.taskId;
}

/**
 * CTOC's real write protection decides a Write as Claude Code asks it (and records a background
 * agent's Write into the waiting folder); returns the target as passed. `agent` null is the main
 * session, whose input carries no agent id. The target is passed as its real path: macOS's
 * temporary folder is a link (/var → /private/var), and the write protection refuses the waiting
 * folder spelled through it.
 */
function hookDecides(root, file, content, agent) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const target = path.join(fs.realpathSync(path.dirname(file)), path.basename(file));
  const input = { session_id: 's', cwd: root, hook_event_name: 'PreToolUse', tool_name: 'Write',
    tool_input: { file_path: target, content }, ...(agent ? { agent_id: agent, agent_type: 'gate-critic' } : {}) };
  const res = spawnSync(process.execPath, [HOOK], { cwd: root, input: JSON.stringify(input), encoding: 'utf8' });
  assert.equal(res.status, 0, `the write protection allows the Write: ${res.stderr}`);
  return target;
}

/** A Write as Claude Code makes it: the write protection decides first, then the file is written. */
function toolWrite(root, file, content, agent) {
  fs.writeFileSync(hookDecides(root, file, content, agent), content);
}
```

**Cases 13b, 19 and 20 take the real way in.** In each, the `dropPending` of the classified payload is replaced by the
critic's launch and Write (`toolWrite`, so the hook sees the target's real path although `makeProject`'s root, line 33, is
spelled through macOS's link), with this comment above it:

```js
    // four-defects s24: a classified file counts only when the critique the menu started wrote it.
```

- 13b (lines 194-207): `launchCritique(classified.root, classified.ref, 'critic-a');` then
  `toolWrite(classified.root, pendingFileFor(classified.root, classified.ref), JSON.stringify({ ref: classified.ref,
  questions: validQuestions(), classification }), 'critic-a');` in place of line 197. One assertion is appended:
  `assert.equal(JSON.parse(fs.readFileSync(questionsFile(classified.root, classified.ref), 'utf8')).critiquedPlanSha256,
  sha(fs.readFileSync(planPathFor(classified.root, classified.ref))));`. The author half is unchanged.
- 19 (lines 541-546) and 20 (lines 564-569): `launchCritique(root, ref, 'critic-a');` then `toolWrite(root,
  pendingFileFor(root, ref), JSON.stringify({ ref, planMtimeMs: …, questions: validQuestions(), classification: … }),
  'critic-a');` with the payload exactly as today. Every assertion is unchanged.

**The S24 block**, after the "REACHABILITY" describe (it ends at line 579):

```js
// ═══════════════════════════════════════════════════════════════════════════
// four-defects slice 24 — only a gate critique the menu started, for the plan's current text,
// can move a plan; any other classified file keeps its questions, unclassified, and the owner
// is told when a check was not taken in. Every case drives the real menu routes, the real
// continuation and the real write protection; nothing in CTOC is mocked.
// ═══════════════════════════════════════════════════════════════════════════

describe("four-defects slice 24 — only a critique the menu started, for the plan's current text, moves a plan", () => {
  /** An implementation slice whose move into the build queue needs only a classified question file. */
  function writeSlice(root, slug, { title = true } = {}) {
    const ref = `implementation/${slug}.md`;
    fs.writeFileSync(planPathFor(root, ref),
      `---\niron_loop: true\ntitle: ${slug}\nfiles:\n  - src/${slug}.js\n---\n\n${title ? `# ${slug}\n\n` : ''}## Implementation\nBody.\n`);
    return ref;
  }
  function makeSlice(slug = 's', opts) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-s24-')));
    roots.push(root);
    for (const stage of STAGES) fs.mkdirSync(path.join(root, 'plans', stage), { recursive: true });
    fs.mkdirSync(path.join(root, '.ctoc', 'streaming', 'questions', 'pending'), { recursive: true });
    return { root, ref: writeSlice(root, slug, opts) };
  }
  /** The gate critic's classified file: nothing in it needs the owner. */
  const classifiedEmpty = (root, ref, extra = {}) => JSON.stringify({ ref, planMtimeMs: fs.statSync(planPathFor(root, ref)).mtimeMs,
    questions: [], classification: { by: 'gate-critic', at: 1786000000000 }, ...extra });
  /** Rewrite a file and set its modification time back to what it was. */
  function rewriteKeepingTime(file, body) {
    const st = fs.statSync(file);
    fs.writeFileSync(file, body);
    fs.utimesSync(file, st.atime, st.mtime);
  }
  const inStage = (root, stage, slug) => fs.existsSync(path.join(root, 'plans', stage, `${slug}.md`));
  const crossingRecorded = (root, slug) => fs.existsSync(ledger.ledgerPath(slug, root));
  const discardLog = (root) => {
    const f = path.join(root, '.ctoc', 'logs', 'streaming-sweeper.jsonl');
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  };
  const RECORD = (root) => path.join(root, '.ctoc', 'streaming', 'waiting-folder-writes.jsonl');
  const addTitle = (text) => text.replace('## Implementation', '# s\n\n## Implementation');
  /** The live question file of `ref`, as stored. */
  const liveFile = (root, ref) => JSON.parse(fs.readFileSync(questionsFile(root, ref), 'utf8'));
  /** Was a fresh classification of `ref` queued (and not yet started)? */
  const checkQueued = (root, ref) => taskRegistry.load(root).tasks
    .some((t) => t.kind === 'classify' && t.plan === ref && t.status === 'queued');
  /** Taken in without its classification: it keeps its questions and claims nothing. */
  function assertDeclassified(root, ref, what) {
    const live = liveFile(root, ref);
    for (const key of ['classification', 'attestation', 'critiquedPlanSha256']) {
      assert.equal(key in live, false, `${what}: no ${key} on the stored file`);
    }
    assert.equal(precompute.planQuestionsStatus(root, ref).classified, false, `${what}: unclassified`);
  }
  /**
   * The classification the continuation queued for an author's file, started and stamped as the
   * session does, whose file another background agent wrote; then the session's completion.
   */
  function checkNotTakenIn(slug) {
    const { root, ref } = makeSlice(slug);
    fs.writeFileSync(pendingFileFor(root, ref), JSON.stringify({ ref, questions: [] })); // the author's file
    menuScreens.continueAfterCrossing(root); // sweeps it in and queues the classification
    const t = taskRegistry.load(root).tasks.find((x) => x.kind === 'classify' && x.plan === ref);
    assert.ok(t, 'precondition: the classification was queued');
    assert.equal(menuScreens.route(['menu', 'task', 'start', t.id], root).ok, true);
    assert.equal(menuScreens.route(['menu', 'task', 'start', t.id, '--agent-id', 'critic-a'], root).ok, true);
    toolWrite(root, pendingFileFor(root, ref), classifiedEmpty(root, ref), 'agent-b'); // not the critic the menu recorded
    const done = menuScreens.route(['menu', 'task', 'complete', t.id, '--continue', '--summary', 'classified'], root);
    assert.equal(done.ok, true, JSON.stringify(done));
    return { root, ref, done };
  }

  it('S24-1: a classified file another background agent wrote moves nothing, before or after a continuation, and keeps its questions unclassified', () => {
    const { root, ref } = makeSlice();
    launchCritique(root, ref, 'critic-a');
    toolWrite(root, pendingFileFor(root, ref), classifiedEmpty(root, ref), 'agent-b');
    streamingGate.streamingGateScreen(root); // a read sweeps the waiting folder
    menuScreens.route(['plan', ref], root); // so does the plan's own screen
    assert.ok(inStage(root, 'implementation', 's'), 'nothing moved before a continuation');
    menuScreens.continueAfterCrossing(root);
    assert.ok(inStage(root, 'implementation', 's'), 'nothing moved after it');
    assert.equal(crossingRecorded(root, 's'), false, 'no crossing record');
    assert.match(discardLog(root), /"reason":"classification-not-attributed"/);
    assert.equal(precompute.planQuestionsStatus(root, ref).status, 'ready', 'its questions reached the store');
    assertDeclassified(root, ref, 'the forged file');
    // Revision 3 (the owner's answer to q17): the plan's own critique still runs, so no classification is queued
    // beside it; its gate critic brings the check (S24-22).
    assert.equal(checkQueued(root, ref), false, "no new check while the plan's own critique runs");
  });

  it('S24-2: a background agent that writes a classified file for a plan nobody is critiquing moves nothing', () => {
    const { root, ref } = makeSlice();
    toolWrite(root, pendingFileFor(root, ref), classifiedEmpty(root, ref), 'agent-b');
    menuScreens.continueAfterCrossing(root);
    assert.ok(inStage(root, 'implementation', 's'));
    assert.equal(crossingRecorded(root, 's'), false);
    assertDeclassified(root, ref, 'no critique at all');
  });

  it("S24-3: a program, a launcher or the main session's own Write moves nothing, even while the plan's critique runs", () => {
    for (const how of ['program', 'main session']) {
      const { root, ref } = makeSlice();
      launchCritique(root, ref, 'critic-a');
      // A payload that names its own text binding: the binding is the menu's, never the payload's.
      const forged = classifiedEmpty(root, ref, { critiquedPlanSha256: sha(fs.readFileSync(planPathFor(root, ref))) });
      if (how === 'program') fs.writeFileSync(pendingFileFor(root, ref), forged); // no tool call: nothing recorded
      else toolWrite(root, pendingFileFor(root, ref), forged, null);
      streamingGate.streamingGateScreen(root);
      assert.ok(inStage(root, 'implementation', 's'), `${how}: nothing moved before a continuation`);
      menuScreens.continueAfterCrossing(root);
      assert.ok(inStage(root, 'implementation', 's'), `${how}: nothing moved after it`);
      assert.match(discardLog(root), /classification-not-attributed/, how);
      assertDeclassified(root, ref, how);
    }
  });

  it('S24-4: a critic launched for one plan cannot classify another', () => {
    const { root, ref } = makeSlice('x');
    const other = writeSlice(root, 'y');
    launchCritique(root, ref, 'critic-a');
    toolWrite(root, pendingFileFor(root, other), classifiedEmpty(root, other), 'critic-a');
    menuScreens.continueAfterCrossing(root);
    assert.ok(inStage(root, 'implementation', 'y'));
    assert.equal(crossingRecorded(root, 'y'), false);
    assertDeclassified(root, other, 'another plan');
  });

  it('S24-5: the critique the menu started moves the plan — the classification it queued, and the precompute the owner asked for', () => {
    // (a) The author's file, the continuation's classify task, its start, the critic's stamp, its Write, the completion.
    const a = makeSlice();
    fs.writeFileSync(pendingFileFor(a.root, a.ref), JSON.stringify({ ref: a.ref, questions: [] })); // an author's file needs no record
    menuScreens.continueAfterCrossing(a.root);
    const t = taskRegistry.load(a.root).tasks.find((x) => x.kind === 'classify' && x.plan === a.ref);
    assert.ok(t, 'the continuation queued the classification');
    assert.equal(menuScreens.route(['menu', 'task', 'start', t.id], a.root).ok, true);
    assert.equal(menuScreens.route(['menu', 'task', 'start', t.id, '--agent-id', 'critic-a'], a.root).ok, true);
    const text = fs.readFileSync(planPathFor(a.root, a.ref));
    toolWrite(a.root, pendingFileFor(a.root, a.ref), classifiedEmpty(a.root, a.ref, { critiquedPlanSha256: '0'.repeat(64) }), 'critic-a');
    const done = menuScreens.route(['menu', 'task', 'complete', t.id, '--continue', '--summary', 'classified'], a.root);
    assert.equal(done.ok, true, JSON.stringify(done));
    assert.ok(inStage(a.root, 'todo', 's'), 'the slice moved into the build queue');
    assert.equal(ledger.readEntry('s', a.root).advanced_by, 'sufficiency');
    assert.equal(liveFile(a.root, a.ref).critiquedPlanSha256, sha(text), "the store binds the text the critique started on, not the payload's");
    // (b) Started before its lens critics, stamped with the gate critic's id; its file then re-written with other
    //     whitespace: the same JSON value is the same critique.
    const b = makeSlice();
    const add = menuScreens.route(['menu', 'task', 'add', 'precompute', b.ref, '--touches', `.ctoc/streaming/questions/${b.ref}`], b.root);
    assert.equal(menuScreens.route(['menu', 'task', 'start', add.taskId], b.root).ok, true);
    assert.equal(menuScreens.route(['menu', 'task', 'start', add.taskId, '--agent-id', 'gate-critic-g'], b.root).ok, true);
    const content = classifiedEmpty(b.root, b.ref);
    toolWrite(b.root, pendingFileFor(b.root, b.ref), content, 'gate-critic-g');
    fs.writeFileSync(pendingFileFor(b.root, b.ref), JSON.stringify(JSON.parse(content), null, 2));
    menuScreens.continueAfterCrossing(b.root);
    assert.ok(inStage(b.root, 'todo', 's'));
  });

  it('S24-6: a classification counts only for the text its critique started on', () => {
    // (a) The text changes while the critic runs, its time set back: the critic's own file loses its classification.
    const a = makeSlice();
    launchCritique(a.root, a.ref, 'critic-a');
    rewriteKeepingTime(planPathFor(a.root, a.ref), `${fs.readFileSync(planPathFor(a.root, a.ref), 'utf8')}\nChanged by another agent.\n`);
    toolWrite(a.root, pendingFileFor(a.root, a.ref), classifiedEmpty(a.root, a.ref), 'critic-a');
    menuScreens.continueAfterCrossing(a.root);
    assert.ok(inStage(a.root, 'implementation', 's'), 'the changed text does not move on a critique of the old one');
    assert.match(discardLog(a.root), /classification-not-attributed/);
    assertDeclassified(a.root, a.ref, 'a critique of another text');
    // (b) The text changes after the classification was taken in, its time set back: the stored questions read stale.
    const b = makeSlice('s', { title: false }); // its move into the build queue fails: no title
    launchCritique(b.root, b.ref, 'critic-a');
    toolWrite(b.root, pendingFileFor(b.root, b.ref), classifiedEmpty(b.root, b.ref), 'critic-a');
    menuScreens.continueAfterCrossing(b.root);
    assert.ok(inStage(b.root, 'implementation', 's'), 'precondition: held by its validation');
    assert.equal(precompute.planQuestionsStatus(b.root, b.ref).classified, true, 'precondition: the classification was taken in');
    rewriteKeepingTime(planPathFor(b.root, b.ref), addTitle(fs.readFileSync(planPathFor(b.root, b.ref), 'utf8')));
    assert.equal(precompute.planQuestionsStatus(b.root, b.ref).status, 'stale');
    menuScreens.continueAfterCrossing(b.root);
    assert.ok(inStage(b.root, 'implementation', 's'), 'the changed text waits for a critique of its own');
  });

  it('S24-7: a real critique of an earlier text, put back by a program with the plan time set back, moves nothing', () => {
    const { root, ref } = makeSlice('s', { title: false });
    launchCritique(root, ref, 'critic-a');
    const genuine = classifiedEmpty(root, ref);
    toolWrite(root, pendingFileFor(root, ref), genuine, 'critic-a');
    menuScreens.continueAfterCrossing(root);
    assert.ok(inStage(root, 'implementation', 's'), 'precondition: held by its validation');
    const before = fs.statSync(planPathFor(root, ref));
    fs.writeFileSync(planPathFor(root, ref), addTitle(fs.readFileSync(planPathFor(root, ref), 'utf8'))); // the author fixes it
    fs.writeFileSync(pendingFileFor(root, ref), genuine); // a program puts the earlier critique back
    fs.utimesSync(planPathFor(root, ref), before.atime, before.mtime); // and sets the plan's time back
    menuScreens.continueAfterCrossing(root);
    assert.ok(inStage(root, 'implementation', 's'), 'a critique of the earlier text does not move the new one');
    assert.match(discardLog(root), /classification-not-attributed/);
  });

  it('S24-8: a classified question file that does not record the text it was checked against decides nothing and keeps nothing', () => {
    const { root, ref } = makeSlice();
    const stamp = fs.statSync(planPathFor(root, ref)).mtimeMs;
    fs.mkdirSync(path.dirname(questionsFile(root, ref)), { recursive: true });
    fs.writeFileSync(questionsFile(root, ref), JSON.stringify({ ref, planMtimeMs: stamp,
      questions: [], classification: { by: 'gate-critic', at: 1786000000000 } }));
    assert.equal(precompute.planQuestionsStatus(root, ref).classified, false);
    assert.equal(precompute.hasEnoughInformation(root, ref).reason, 'unclassified');
    menuScreens.continueAfterCrossing(root);
    assert.ok(inStage(root, 'implementation', 's'));
    // An unbound block is no classification to keep: an author's file for the same revision replaces it.
    assert.deepEqual(precompute.writePlanQuestions(root, ref, [], stamp), { ok: true });
  });

  it("S24-9: an author's file, and a block that is not the gate critic's, need no record and are bound to nothing (as before)", () => {
    const { root, ref } = makeSlice();
    fs.writeFileSync(pendingFileFor(root, ref), JSON.stringify({ ref, questions: [], critiquedPlanSha256: '0'.repeat(64),
      classification: { by: 'product-owner', at: 1786000000000 } }));
    const report = sweeper.sweepPendingQuestions(root);
    assert.deepEqual(report.promoted, [ref]);
    assert.equal('declassified' in report, false, 'no gate-critic block, nothing dropped');
    assert.equal(precompute.planQuestionsStatus(root, ref).classified, false);
    assert.equal('critiquedPlanSha256' in liveFile(root, ref), false);
    assert.doesNotMatch(discardLog(root), /classification-not-attributed/);
  });

  it('S24-10: the menu records the text a gate critique starts on, keeps it through a stamp and a reload, and records none for other kinds', () => {
    const { root, ref } = makeSlice();
    const text0 = fs.readFileSync(planPathFor(root, ref));
    const add = menuScreens.route(['menu', 'task', 'add', 'precompute', ref, '--touches', `.ctoc/streaming/questions/${ref}`], root);
    menuScreens.route(['menu', 'task', 'start', add.taskId], root); // started before any of its critics reads
    rewriteKeepingTime(planPathFor(root, ref), `${text0}\nLater text.\n`);
    menuScreens.route(['menu', 'task', 'start', add.taskId, '--agent-id', 'gate-critic-g'], root);
    const task = (id) => taskRegistry.load(root).tasks.find((x) => x.id === id);
    assert.equal(task(add.taskId).critiquedPlanSha256, sha(text0), 'the text at the start, not at the stamp');
    assert.equal(task(add.taskId).agentTaskId, 'gate-critic-g');
    const review = menuScreens.route(['menu', 'task', 'add', 'review', 's'], root); // another registry write
    assert.equal(task(add.taskId).critiquedPlanSha256, sha(text0), 'kept through a reload and another write');
    menuScreens.route(['menu', 'task', 'start', review.taskId], root);
    assert.equal('critiquedPlanSha256' in task(review.taskId), false, 'only a gate critique records a text');
    const ghost = menuScreens.route(['menu', 'task', 'add', 'classify', 'implementation/missing.md'], root);
    menuScreens.route(['menu', 'task', 'start', ghost.taskId, '--agent-id', 'critic-z'], root);
    assert.equal('critiquedPlanSha256' in task(ghost.taskId), false, 'no plan, no text');
  });

  it('S24-11: a precompute the reconcile orphaned before its gate critic was stamped still counts', () => {
    const { root, ref } = makeSlice();
    const add = menuScreens.route(['menu', 'task', 'add', 'precompute', ref, '--touches', `.ctoc/streaming/questions/${ref}`], root);
    menuScreens.route(['menu', 'task', 'start', add.taskId], root);
    // A confirmed sweep's reconcile (revision 3): a task that records no agent is unknown, never dead, so it is orphaned
    // only past the 30-minute staleness floor (`DEFAULT_STALE_MS`, src/lib/task-reconcile.js line 103).
    reconcileState(root, { liveAgentIds: ['another-agent'], now: Date.now() + 31 * 60_000 });
    assert.equal(taskRegistry.load(root).tasks.find((x) => x.id === add.taskId).status, 'orphaned', 'precondition');
    const stamp = menuScreens.route(['menu', 'task', 'start', add.taskId, '--agent-id', 'gate-critic-g'], root);
    assert.equal(stamp.ok, true, JSON.stringify(stamp));
    assert.equal(taskRegistry.load(root).tasks.find((x) => x.id === add.taskId).status, 'orphaned', 'its status stays');
    toolWrite(root, pendingFileFor(root, ref), classifiedEmpty(root, ref), 'gate-critic-g');
    menuScreens.continueAfterCrossing(root);
    assert.ok(inStage(root, 'todo', 's'));
  });

  it('S24-12: the record is read fail-closed: a junk line is skipped; an unreadable, oversized or linked record attributes nothing', () => {
    // A symbolic link in the record's place needs a link: off Windows only, inside the one registered case.
    const damages = ['junk line', 'folder', 'oversized', ...(process.platform === 'win32' ? [] : ['link'])];
    for (const damage of damages) {
      const { root, ref } = makeSlice();
      launchCritique(root, ref, 'critic-a');
      toolWrite(root, pendingFileFor(root, ref), classifiedEmpty(root, ref), 'critic-a');
      const kept = fs.readFileSync(RECORD(root), 'utf8');
      if (damage === 'junk line') fs.writeFileSync(RECORD(root), `not json\n${kept}`);
      if (damage === 'folder') { fs.rmSync(RECORD(root)); fs.mkdirSync(RECORD(root)); }
      if (damage === 'oversized') fs.writeFileSync(RECORD(root), `${kept}${'x'.repeat(2 * sweeper.WAITING_WRITES_ROTATE_BYTES)}`);
      if (damage === 'link') { // the same valid lines, reached only through a link: never read through
        const elsewhere = path.join(root, 'elsewhere.jsonl');
        fs.writeFileSync(elsewhere, kept);
        fs.rmSync(RECORD(root));
        fs.symlinkSync(elsewhere, RECORD(root));
      }
      menuScreens.continueAfterCrossing(root);
      assert.equal(inStage(root, 'todo', 's'), damage === 'junk line', damage);
    }
    assert.equal(sweeper.waitingWritesPath(''), null, 'no root, no record');
    assert.equal(sweeper.waitingFileSha256('{ not json'), null, 'text that is not JSON has no hash');
    assert.equal(sweeper.waitingFileSha256('{"a": 1}'), sweeper.waitingFileSha256('{"a":1}\r\n'), 'whitespace changes nothing');
  });

  it("S24-13: the continuation's status line tells the owner when a gate critic's check was not taken in", () => {
    // (a) The session's completion of the classification: that revision's check already ran, so none is queued again.
    const { root, done } = checkNotTakenIn('billing');
    assert.match(done.text, /The gate critic's check of billing was not taken in; its questions were kept unchecked and it waits for your approval\./);
    assert.ok(inStage(root, 'implementation', 'billing'));
    // (b) The owner's own answer to another plan runs the continuation too: after a precompute ended, a file another
    //     agent wrote is kept unchecked and a new check of it is queued.
    const b = makeSlice('invoices');
    const other = writeSlice(b.root, 'ledger');
    const q = validQuestions()[0];
    precompute.writePlanQuestions(b.root, other, [q], fs.statSync(planPathFor(b.root, other)).mtimeMs, undefined,
      { by: 'gate-critic', at: 1786000000000 });
    const bId = launchCritique(b.root, b.ref, 'critic-a');
    // Completed (revision 3): while it runs, no new check is queued beside it (S24-22).
    assert.equal(menuScreens.route(['menu', 'task', 'complete', bId, '--summary', 'the gate critic returned'], b.root).ok, true);
    toolWrite(b.root, pendingFileFor(b.root, b.ref), classifiedEmpty(b.root, b.ref), 'agent-b');
    const answered = menuScreens.route(['stream', 'answer', other, q.id, '1', precompute.questionDigest(q)], b.root);
    assert.match(answered.text, /The gate critic's check of invoices was not taken in; its questions were kept unchecked and a new check is queued\./);
    assert.ok(checkQueued(b.root, b.ref));
    // (c) A check that was taken in says nothing of the kind.
    const c = makeSlice('payments');
    const id = launchCritique(c.root, c.ref, 'critic-a');
    toolWrite(c.root, pendingFileFor(c.root, c.ref), classifiedEmpty(c.root, c.ref), 'critic-a');
    assert.doesNotMatch(menuScreens.route(['menu', 'task', 'complete', id, '--continue'], c.root).text, /not taken in/);
  });

  it('S24-14: "Check its questions" says a check that ran but was not taken in, never "already recorded"', () => {
    const { root, ref } = checkNotTakenIn('billing');
    const check = menuScreens.route(['stream', 'check', ref], root);
    assert.match(check.text, /The gate critic's check of billing\.md ran but was not taken in; its questions stay unchecked and it waits for your approval\./);
    assert.doesNotMatch(check.text, /already recorded/);
    assert.equal(taskRegistry.load(root).tasks.filter((x) => x.kind === 'classify').length, 1, 'nothing was added');
  });

  it("S24-15: the plan's screen and the gate screen say the check ran but was not taken in, and offer no second check", () => {
    const { root, ref } = checkNotTakenIn('billing');
    const line = /The gate critic's check of its questions ran but was not taken in; they stay unchecked and it waits for your approval\./;
    const plan = menuScreens.route(['plan', ref], root);
    assert.match(plan.text, line);
    assert.equal(Object.keys(plan.actions).includes('Check its questions'), false);
    const gate = streamingGate.streamingGateScreen(root);
    assert.match(gate.text, line);
    assert.equal(Object.keys(gate.actions).includes('Check its questions'), false);
  });

  it('S24-16: a sufficiency crossing reads the plan once and refuses bytes that are not the text its verdict was read for', () => {
    const { root, ref } = makeSlice();
    const p = planPathFor(root, ref);
    precompute.writePlanQuestions(root, ref, [], fs.statSync(p).mtimeMs, undefined, { by: 'gate-critic', at: 1786000000000 });
    const original = fs.readFileSync(p);
    assert.equal(precompute.planQuestionsStatus(root, ref).critiquedPlanSha256, sha(original), "the binding rides on 'ready'");
    const read = precompute.hasEnoughInformation(root, ref);
    assert.equal(read.enough, true, 'precondition');
    assert.equal(read.critiquedPlanSha256, sha(original), 'the verdict carries the text it was read for');
    const verdict = { enough: true, reason: 'enough', computed: 0, answeredQuestionIds: [], unansweredQuestionIds: [],
      blockingQuestionIds: [], unboundAnswers: 0, critiquedPlanSha256: read.critiquedPlanSha256 };
    rewriteKeepingTime(p, `${original}\nSwapped in after the check.\n`);
    assert.equal(streamingGate.crossBySufficiency(root, p, ref, 'implementation', 'todo', verdict), false, 'not on a check of another text');
    assert.ok(inStage(root, 'implementation', 's'));
    assert.equal(crossingRecorded(root, 's'), false);
    assert.equal(streamingGate.crossBySufficiency(root, p, ref, 'implementation', 'todo', { ...verdict, critiquedPlanSha256: undefined }), false,
      'a verdict that carries no text crosses nothing');
    rewriteKeepingTime(p, original);
    assert.equal(streamingGate.crossBySufficiency(root, p, ref, 'implementation', 'todo', verdict), true, 'the text it was read for crosses');
    assert.ok(inStage(root, 'todo', 's'));
  });

  it("S24-17: start.md starts a gate critique before any of its agents, stamps the gate critic after the launch, and completes a precompute only on its gate critic's return", () => {
    const md = fs.readFileSync(path.join(__dirname, '..', 'src', 'commands', 'start.md'), 'utf8').replace(/\s+/g, ' ');
    /** The text from `from` up to the next `to`. */
    const span = (from, to) => {
      const a = md.indexOf(from);
      const b = a === -1 ? -1 : md.indexOf(to, a + from.length);
      assert.ok(a !== -1 && b !== -1, `${from} … ${to}`);
      return md.slice(a, b);
    };
    /** Each part appears in `text`, in this order. */
    const inOrder = (text, parts) => parts.reduce((at, part) => {
      const i = text.indexOf(part, at);
      assert.ok(i !== -1, `"${part}", in order`);
      return i + part.length;
    }, 0);
    inOrder(span('2. **Dispatch only on `run`.**', '3. **Render now.**'), [
      'A gate critique — a `precompute` the owner asked for, or a `classify` the menu queued — is started FIRST too',
      '`menu task start <taskId>` with no `--agent-id`',
      'Then launch its agents',
      "`menu task start <taskId> --agent-id <the gate critic's harness agent id>`",
    ]);
    inOrder(span('3. **Promote.**', 'This is the ONLY sanctioned promotion'), [
      'a promoted `classify` — `menu task start <id>` with no `--agent-id`',
      'then launch `gate-critic`',
      'then stamp its id with `menu task start <id> --agent-id <the harness agent id>`',
      'a promoted `precompute` follows the precompute recipe: start, lens critics, gate critic, stamp',
    ]);
    inOrder(span('### COMPLETION (turn recipe)', '2. Emit **ONE** compact'), [
      "A question precompute is completed only on its gate critic's return, after the stamp; a lens critic's return completes nothing.",
    ]);
    inOrder(span('**The gate-critique precompute — the fleet dispatch (background WORK).**', '**A promoted `classify` task'), [
      'first `menu task start <id>` with no `--agent-id`',
      'Dispatch the three adversarial lens critics',
      'dispatch `gate-critic` to **synthesize**',
      "`menu task start <id> --agent-id <the gate critic's harness agent id>`",
      "Complete the task only when the gate critic returns, after that stamp: a lens critic's return completes nothing.",
    ]);
    inOrder(span('**A promoted `classify` task', '### Build-flow idea submit'), [
      'Start it first — `menu task start <id>`, no `--agent-id`',
      'then launch `gate-critic` alone as background WORK',
      'then stamp its id with `menu task start <id> --agent-id <the harness agent id>`',
    ]);
  });

  it('S24-18: only the most recently started critique of a plan counts, and never one cancelled, being cancelled, failed, or completed after its cancellation was requested', () => {
    // (a) A later critique, started but its gate critic not yet stamped, supersedes an earlier one.
    const a = makeSlice();
    const t1 = launchCritique(a.root, a.ref, 'critic-old');
    assert.equal(menuScreens.route(['menu', 'task', 'complete', t1, '--summary', 'ran'], a.root).ok, true);
    const t2 = menuScreens.route(['menu', 'task', 'add', 'precompute', a.ref, '--touches', `.ctoc/streaming/questions/${a.ref}`], a.root).taskId;
    assert.equal(menuScreens.route(['menu', 'task', 'start', t2], a.root).ok, true);
    toolWrite(a.root, pendingFileFor(a.root, a.ref), classifiedEmpty(a.root, a.ref), 'critic-old'); // a late write of the earlier one
    menuScreens.continueAfterCrossing(a.root);
    assert.ok(inStage(a.root, 'implementation', 's'), 'the superseded critique moves nothing');
    assert.match(discardLog(a.root), /classification-not-attributed/);
    assert.equal(menuScreens.route(['menu', 'task', 'start', t2, '--agent-id', 'critic-new'], a.root).ok, true);
    toolWrite(a.root, pendingFileFor(a.root, a.ref), classifiedEmpty(a.root, a.ref), 'critic-new');
    menuScreens.continueAfterCrossing(a.root);
    assert.ok(inStage(a.root, 'todo', 's'), 'the latest critique moves it');
    // (b) A critique cancelled, being cancelled, or failed counts for nothing, its own critic's file included.
    for (const end of [['cancel', '--force'], ['cancel'], ['fail', '--summary', 'crashed']]) {
      const { root, ref } = makeSlice();
      const t = launchCritique(root, ref, 'critic-a');
      assert.equal(menuScreens.route(['menu', 'task', end[0], t, ...end.slice(1)], root).ok, true, end.join(' '));
      toolWrite(root, pendingFileFor(root, ref), classifiedEmpty(root, ref), 'critic-a');
      menuScreens.continueAfterCrossing(root);
      assert.ok(inStage(root, 'implementation', 's'), end.join(' '));
      assert.match(discardLog(root), /classification-not-attributed/, end.join(' '));
    }
    // (c) A critique whose cancellation was requested never counts again, even when it is completed afterwards.
    const c = makeSlice();
    const tc = launchCritique(c.root, c.ref, 'critic-a');
    assert.equal(menuScreens.route(['menu', 'task', 'cancel', tc], c.root).ok, true);
    assert.equal(menuScreens.route(['menu', 'task', 'complete', tc, '--summary', 'finished anyway'], c.root).ok, true);
    assert.equal(taskRegistry.load(c.root).tasks.find((x) => x.id === tc).status, 'done', 'precondition: cancelling → done');
    toolWrite(c.root, pendingFileFor(c.root, c.ref), classifiedEmpty(c.root, c.ref), 'critic-a');
    menuScreens.continueAfterCrossing(c.root);
    assert.ok(inStage(c.root, 'implementation', 's'), 'a critique whose cancellation was requested never counts again');
    assert.match(discardLog(c.root), /classification-not-attributed/);
  });

  it("S24-19: a precompute the session completed early, when a lens critic returned, still takes its gate critic's stamp and file", () => {
    const { root, ref } = makeSlice();
    const add = menuScreens.route(['menu', 'task', 'add', 'precompute', ref, '--touches', `.ctoc/streaming/questions/${ref}`], root);
    assert.equal(menuScreens.route(['menu', 'task', 'start', add.taskId], root).ok, true);
    // A lens critic returned, and the session completed the task too early.
    assert.equal(menuScreens.route(['menu', 'task', 'complete', add.taskId, '--continue', '--summary', 'a lens returned'], root).ok, true);
    const stamp = menuScreens.route(['menu', 'task', 'start', add.taskId, '--agent-id', 'gate-critic-g'], root);
    assert.equal(stamp.ok, true, JSON.stringify(stamp));
    assert.equal(stamp.status, 'done', 'its status stays');
    const again = menuScreens.route(['menu', 'task', 'start', add.taskId, '--agent-id', 'gate-critic-h'], root);
    assert.equal(again.reason, 'agent-recorded', 'it still records at most one agent');
    // Revision 3: the id already recorded is accepted again without a write.
    assert.equal(menuScreens.route(['menu', 'task', 'start', add.taskId, '--agent-id', 'gate-critic-g'], root).ok, true);
    toolWrite(root, pendingFileFor(root, ref), classifiedEmpty(root, ref), 'gate-critic-g');
    menuScreens.continueAfterCrossing(root);
    assert.ok(inStage(root, 'todo', 's'), "the gate critic's file was taken in and the plan moved");
  });

  it('S24-20: a classified file that cannot be tied to its critique keeps its questions, drops every claim, and never replaces a checked file', () => {
    // (a) The session forgot the stamp: the gate critic's real synthesis cannot be tied to the critique.
    const { root, ref } = makeSlice();
    const add = menuScreens.route(['menu', 'task', 'add', 'precompute', ref, '--touches', `.ctoc/streaming/questions/${ref}`], root);
    assert.equal(menuScreens.route(['menu', 'task', 'start', add.taskId], root).ok, true);
    const lens = { state: 'clean-pass', coverage: 'full', findings: 1 };
    const notice = { id: 'q98-critique-coverage', prompt: 'Coverage', critical: false, important: false,
      options: [{ key: '1', label: 'Noted', recommended: true }] };
    const ruling = { id: 'q99-gate-ruling', prompt: 'Lens verdict: APPROVE — nothing unresolved. Rule now.', critical: false,
      important: false, options: [{ key: '1', label: 'Approve', recommended: true }, { key: '2', label: 'Reject' }] };
    toolWrite(root, pendingFileFor(root, ref), JSON.stringify({ ref, questions: [...validQuestions(), notice, ruling],
      attestation: { generated_by: 'gate-critic', generated_at: 1,
        lenses: { premortem: lens, 'devils-advocate': lens, 'red-team': lens, advocate: lens } },
      classification: { by: 'gate-critic', at: 1786000000000 } }), 'gate-critic-g');
    // The session completes the precompute on its gate critic's return (revision 3: while it ran, its own check was
    // still on its way, so the completion's continuation is the one that queues the new check).
    const done = menuScreens.route(['menu', 'task', 'complete', add.taskId, '--continue', '--summary', 'the gate critic returned'], root);
    assert.equal(done.ok, true, JSON.stringify(done));
    assert.deepEqual(liveFile(root, ref).questions.map((q) => q.id), ['q10-store', 'q11-expiry'],
      'its findings are kept; the ruling and the notice went with the attestation');
    assertDeclassified(root, ref, 'an unstamped critique');
    assert.ok(inStage(root, 'implementation', 's'), 'it moves nothing');
    assert.match(discardLog(root), /classification-not-attributed/);
    assert.ok(checkQueued(root, ref), 'a new check is queued');
    assert.match(done.text,
      / · The gate critic's check of s was not taken in; its questions were kept unchecked and a new check is queued\./);
    // (b) A file the menu's own critique already checked for this revision is never replaced by an unattributed one.
    const b = makeSlice('s', { title: false }); // held by its validation, so the checked file stays to be compared
    launchCritique(b.root, b.ref, 'critic-a');
    toolWrite(b.root, pendingFileFor(b.root, b.ref), classifiedEmpty(b.root, b.ref), 'critic-a');
    menuScreens.continueAfterCrossing(b.root);
    assert.equal(precompute.planQuestionsStatus(b.root, b.ref).classified, true, 'precondition: taken in classified');
    // Other content than the critic's (a recorded Write of the same content by the critic would count).
    toolWrite(b.root, pendingFileFor(b.root, b.ref), classifiedEmpty(b.root, b.ref, { questions: validQuestions() }), 'agent-b');
    menuScreens.continueAfterCrossing(b.root);
    assert.equal(precompute.planQuestionsStatus(b.root, b.ref).classified, true, 'the checked file stays');
    assert.deepEqual(liveFile(b.root, b.ref).questions, [], "the forger's questions did not replace it");
    assert.match(discardLog(b.root), /"reason":"would-replace-classified"/);
  });

  // Revision 3 (2026-10-19): the owner's answers of 2026-10-18 to q16, q17 and q18.

  it('S24-21: a Write the write protection recorded but that never ran counts when a program later puts exactly those bytes there; other bytes count for nothing (residual 6)', () => {
    // (a) The hook allowed and recorded the critic's Write; something after it refused the Write, so nothing was written.
    const a = makeSlice();
    launchCritique(a.root, a.ref, 'critic-a');
    const content = classifiedEmpty(a.root, a.ref);
    hookDecides(a.root, pendingFileFor(a.root, a.ref), content, 'critic-a');
    assert.equal(fs.existsSync(pendingFileFor(a.root, a.ref)), false, 'precondition: the Write never ran');
    fs.writeFileSync(pendingFileFor(a.root, a.ref), content); // a program writes exactly those bytes
    menuScreens.continueAfterCrossing(a.root);
    assert.ok(inStage(a.root, 'todo', 's'), "identical bytes are that critic's own words: the earlier line is credited");
    // (b) The same, but the program writes other bytes: nothing is credited.
    const b = makeSlice();
    launchCritique(b.root, b.ref, 'critic-a');
    hookDecides(b.root, pendingFileFor(b.root, b.ref), classifiedEmpty(b.root, b.ref), 'critic-a');
    fs.writeFileSync(pendingFileFor(b.root, b.ref), classifiedEmpty(b.root, b.ref, { note: 'other bytes' }));
    menuScreens.continueAfterCrossing(b.root);
    assert.ok(inStage(b.root, 'implementation', 's'), 'other bytes move nothing');
    assert.match(discardLog(b.root), /classification-not-attributed/);
  });

  it('S24-22: while a critique of the plan is queued or running, a stray classified file queues no classification that would void it', () => {
    const { root, ref } = makeSlice('invoices');
    const id = launchCritique(root, ref, 'gate-critic-g'); // the precompute the owner asked for, running
    toolWrite(root, pendingFileFor(root, ref), classifiedEmpty(root, ref, { note: 'a stray copy' }), 'agent-b');
    const cont = menuScreens.continueAfterCrossing(root);
    assertDeclassified(root, ref, 'the stray file');
    assert.equal(checkQueued(root, ref), false, 'no classification is queued beside the running precompute');
    assert.deepEqual(cont.notTakenIn,
      ["The gate critic's check of invoices was not taken in; its questions were kept unchecked and a check of it is already queued or running."]);
    assert.match(menuScreens.route(['stream', 'check', ref], root).text,
      /A check of invoices\.md is already queued or running; nothing was added\./);
    assert.equal(taskRegistry.load(root).tasks.filter((t) => t.kind === 'classify').length, 0, 'nothing was added');
    // The precompute's own gate critic still counts, and the session's completion moves the plan.
    toolWrite(root, pendingFileFor(root, ref), classifiedEmpty(root, ref), 'gate-critic-g');
    const done = menuScreens.route(['menu', 'task', 'complete', id, '--continue', '--summary', 'the gate critic returned'], root);
    assert.equal(done.ok, true, JSON.stringify(done));
    assert.ok(inStage(root, 'todo', 'invoices'), "the precompute's gate critic's file moved the plan");
  });

  it('S24-23: a classification the menu lost track of is told truthfully: it cannot tell whether that check finished', () => {
    const { root, ref } = makeSlice('billing');
    fs.writeFileSync(pendingFileFor(root, ref), JSON.stringify({ ref, questions: [] })); // the author's file
    menuScreens.continueAfterCrossing(root); // sweeps it in and queues the classification
    const t = taskRegistry.load(root).tasks.find((x) => x.kind === 'classify' && x.plan === ref);
    assert.ok(t, 'precondition: the classification was queued');
    assert.equal(menuScreens.route(['menu', 'task', 'start', t.id], root).ok, true);
    assert.equal(menuScreens.route(['menu', 'task', 'start', t.id, '--agent-id', 'critic-a'], root).ok, true);
    // A confirmed sweep's reconcile with a live agent list that no longer holds the critic, past the grace window.
    reconcileState(root, { liveAgentIds: ['another-agent'], now: Date.now() + 5 * 60_000 });
    assert.equal(taskRegistry.load(root).tasks.find((x) => x.id === t.id).status, 'orphaned', 'precondition');
    const line = /The menu lost track of the gate critic checking its questions, so it cannot tell whether that check finished; none was taken in, so they stay unchecked\. Approve it yourself, or change the plan to have them checked again\./;
    for (const screen of [menuScreens.route(['plan', ref], root), streamingGate.streamingGateScreen(root)]) {
      assert.match(screen.text, line);
      assert.doesNotMatch(screen.text, /did not finish/);
      assert.equal(Object.keys(screen.actions).includes('Check its questions'), false, 'no second check is offered');
    }
  });
});
```

`roots`, `STAGES`, `planPathFor`, `pendingFileFor`, `questionsFile`, `validQuestions`, `sweeper`, `precompute` and
`streamingGate` are the file's own (lines 24-89); `precompute.questionDigest` is exported (its live callers are the
streaming screens).

#### `tests/plans-keep-moving-without-the-human.test.js` — `dropPending` takes the real way in

Replace `dropPending` (lines 171-176 on 2026-10-19, its doc line and its body) with the following. `spawnSync` is already
required (line 22), so no require is added; `HOOK` and `criticSeq` are new and taken by no other name in the file (search
`HOOK|criticSeq` over the file: no match; the one `hook` at line 1145 is a local of its own case).

Its thirteen call sites (revision 3, the owner's answer to q14; each read on 2026-10-19) are unchanged:
- **The classified drops, which now take the real way:** line 298 (case 4), 340 (case 5), 479 (case 12), 805 (case 26),
  1014 and 1015 (case 33, plans a33 and b33), 1062 (case 34, once per topic), 1083 (case 34 beside an author's detail),
  1336 (`builtAndDone`, cases 46, 46b and 47), 2178 (B9b) and 2417 (B9).
- **The author's way, as before:** line 831 (case 27, the block `{ by: 'product-owner', … }`) and line 1309 (case 45,
  `null`).

Where the continuation already queued the plan's classification (cases 26, 33 and 34 per topic), the helper starts that
task, so the cases' counts of classification tasks are unchanged; elsewhere it records a question precompute, as the
session records one. It completes the critique it started, as the session does when the gate critic returns, but without
`--continue`: each caller decides itself when a continuation runs (Decision 49). A done critique still counts, so every
caller tests what it tested; B9 (lines 2414-2419) then finds no task queued or running and shows the idle line its
`idleLine` asserts, which `readyStatus` (`src/lib/streaming-gate.js` lines 1995-2001) shows only then. `makeSandbox`
(line 45) spells its root through `os.tmpdir()`, which on macOS is a link (`/var` → `/private/var`), and the write
protection refuses the waiting folder spelled through it; so the helper passes the hook the target's real path, as Claude
Code passes an agent's.

```js
const HOOK = path.join(__dirname, '..', 'src', 'hooks', 'protect-records.js');
let criticSeq = 0;

/**
 * Drop a file in the waiting folder the way the gate critic does. A file carrying the gate
 * critic's classification counts only when the critique the menu started wrote it
 * (four-defects slice 24), so such a drop goes the real way: the plan's queued classification —
 * or, when none is queued, a question precompute as the session records it — is started, then
 * stamped with the critic's agent id; the critic's Write passes CTOC's real write protection,
 * which records it, before the file is written; and the critique is completed, as the session
 * completes it when its gate critic returns, without `--continue`: the caller decides when a
 * continuation runs. Any other drop is written as an author's is.
 */
function dropPending(root, ref, questions, classification = CLASSIFIED, extra = {}) {
  const p = precompute.pendingQuestionsPath(root, ref);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const content = JSON.stringify({ ref, questions, ...(classification ? { classification } : {}), ...extra });
  if (!precompute.isGateCriticClassification(classification)) {
    fs.writeFileSync(p, content);
    return;
  }
  const agent = `critic-${++criticSeq}`;
  const queued = tasks(root).find((t) => t.kind === 'classify' && t.plan === ref && t.status === 'queued');
  const id = queued ? queued.id
    : route(['menu', 'task', 'add', 'precompute', ref, '--touches', `.ctoc/streaming/questions/${ref}`], root).taskId;
  assert.equal(route(['menu', 'task', 'start', id], root).ok, true, `fixture: the critique of ${ref} started`);
  assert.equal(route(['menu', 'task', 'start', id, '--agent-id', agent], root).ok, true, 'fixture: its critic recorded');
  // The target's real path: macOS's temporary folder is a link, and the hook refuses the link-spelled waiting folder.
  const target = path.join(fs.realpathSync(path.dirname(p)), path.basename(p));
  const hook = spawnSync(process.execPath, [HOOK], { cwd: root, encoding: 'utf8', input: JSON.stringify({
    session_id: 's', cwd: root, hook_event_name: 'PreToolUse', tool_name: 'Write',
    tool_input: { file_path: target, content }, agent_id: agent, agent_type: 'gate-critic' }) });
  assert.equal(hook.status, 0, `fixture: the write protection allowed the critic's Write (${hook.stderr})`);
  fs.writeFileSync(p, content);
  const done = route(['menu', 'task', 'complete', id, '--summary', 'fixture: the gate critic returned'], root);
  assert.equal(done.ok, true, `fixture: the critique of ${ref} completed (${JSON.stringify(done)})`);
}
```

`tasks` (line 212) and `route` (line 34) are the file's own; `tasks` is read only when the helper runs. The cwd stays the
root as `makeSandbox` spells it, so on macOS these drops are also the reverse shape of protect-records case 113.

#### `tests/real-question-file-render.test.js` — the staged classified file records its plan text, and the structure check can fail

1. Line 64's staged object gains
   `critiquedPlanSha256: crypto.createHash('sha256').update(fs.readFileSync(PLAN_SAMPLE)).digest('hex')` (the sample plan
   copied at line 70), with `const crypto = require('node:crypto');` among the requires (lines 30-34) and the comment
   "four-defects slice 24: a classification counts only bound to the plan text it was checked against".
2. `renderMatrixFromRealSample` (lines 50-85) takes one optional parameter, `mapQuestion` (default `(q) => q`), applied to
   every staged question after its topic is added: line 64's `questions: real.questions.map(…)` gains `.map(mapQuestion)`.
   Every existing caller passes nothing and renders exactly as today.
3. The case "no cell content forges the matrix structure with box-drawing characters" (lines 166-181) can never fail today:
   its one assertion is `assert.ok(!/[┌-╿]/.test(…) || true, …)` and it ends with `assert.ok(true)`. It is replaced by:

```js
  // Structure not forged — untrusted subagent prose introduces no box-drawing character into a
  // cell. The rule, exactly: on a content line (one holding the vertical rule │), every
  // character between its first and its last │ is cell text or a column rule, and a column
  // rule stands only under a junction of the matrix's top edge (┌ ┬ ┐). Any other box-drawing
  // character (U+2500–U+257F) there, and any │ anywhere else on the line, is forged structure.
  // The renderer turns each one in a cell's text into a space (`matrixCellText`), and the real
  // sample's text holds none.
  it('no cell content forges the matrix structure with box-drawing characters', () => {
    /** The indexes of `line`'s characters that `re` matches, in UTF-16 units (as `padEnd` pads). */
    const at = (line, re) => line.split('').flatMap((ch, i) => (re.test(ch) ? [i] : []));
    /** Forged structure on the content lines of `box`: a box-drawing character other than │
     *  between a line's outer rules (the class is U+2500, U+2501 and U+2503 to U+257F; │ is
     *  U+2502), and a │ that does not stand under a junction of the top edge. */
    const forgedIn = (box) => {
      const top = box.find((l) => l.startsWith('┌'));
      assert.ok(top, 'the matrix has a top edge');
      const rules = new Set(at(top, /[┌┬┐]/));
      return box.filter((l) => l.includes('│')).flatMap((l) => [
        ...(l.slice(l.indexOf('│') + 1, l.lastIndexOf('│')).match(/[─━┃-╿]/g) || []),
        ...at(l, /│/).filter((i) => !rules.has(i)).map(() => '│'),
      ]);
    };
    // The check can fail: under a top edge whose junctions stand at 0, 6 and 12, a forged
    // junction run and a forged column rule inside a cell are caught; an honest line is not.
    const edge = '┌─────┬─────┐';
    assert.deepEqual(forgedIn([edge, '│ abc │ def │']), []);
    assert.deepEqual(forgedIn([edge, '│ ├─┤ │ def │']), ['├', '─', '┤']);
    assert.deepEqual(forgedIn([edge, '│ a│c │ def │']), ['│']);
    // Prose carrying a junction run and a column rule, in every option of every question,
    // renders without them.
    const forged = renderMatrixFromRealSample((q) => ({
      ...q, options: q.options.map((o) => ({ ...o, pros: `├──┼──┤ │ ${o.pros || ''}` })),
    }));
    assert.deepEqual(forgedIn(forged.box), [], 'a forged cell kept its box-drawing characters');
    // And the real sample, as captured.
    assert.deepEqual(forgedIn(renderMatrixFromRealSample().box), [], 'a cell introduced a box-drawing character');
  });
```

   The real sample holds no box-drawing character inside any cell, legitimately or otherwise: its text holds none (search
   U+2500–U+257F over `tests/fixtures/golden-corpus/streaming-questions/review__00003-r2a-scheduler-lifecycle-honesty.md.json`:
   no match), and the renderer replaces every one in a cell's text with a space (`MATRIX_BOX_DRAWING` and `matrixCellText`,
   `src/lib/streaming-gate.js` lines 1235-1245 on 2026-10-18, 1187-1197 when first written). The only such characters on a content line are its rules `│`
   (`matrixRow`, lines 1348-1356 on 2026-10-18 — the one place in `src/lib/` that writes `│`: search `│` over `src/lib/`, one file, one
   line), and they stand exactly under the top edge's junctions: `matrixRow` pads every cell to its column's width between
   a space on each side, and `matrixEdge` (lines 1343-1345 on 2026-10-18) draws each column as a run of `─` two longer than that width,
   so on every content line the rules fall where the top edge's `┌ ┬ ┐` do — the one place in `src/lib/` that writes those
   three is line 1375 on 2026-10-18 (search over `src/lib/`: one line) — counted in UTF-16 units, as `padEnd` counts. A forged `│` in a
   cell stands between two of them, never on one. The edges (`┌ ┬ ┐ ├ ┼ ┤ └ ┴ ┘ ─`) hold no `│` and are not content lines.
   The plan's screen starts the matrix on a line of its own (line 1618 on 2026-10-18 ends the text before it with line
   breaks; the matrix is added at line 1656), so its top edge is the box's one line that starts with `┌`; were it not, `forgedIn`'s
   first assertion fails loudly. The sample plan the test copies holds none either (search U+2500–U+257F over
   `tests/fixtures/golden-corpus/plan-frontmatter/review__00003-r2a-scheduler-lifecycle-honesty.md`: no match; both
   searches, and the two over `src/lib/`, run on 2026-10-13; the streaming-gate.js lines re-read on 2026-10-18). Red on a forged cell is seen in Step 10, twice: with the
   box-drawing replacement dropped from `matrixCellText`, the forged render fails on the junction run and the column rule;
   with only `│` let through (`MATRIX_BOX_DRAWING`, line 1235 on 2026-10-18, without U+2502), it fails on the column rule alone.
   Restored, it passes on the forged cell and on the real sample.

Nothing else in the file changes.

#### `tests/sufficiency-evidence.test.js` — cases 10 and 10b carry the text their verdicts were read for

Case 10 (lines 257-293 on 2026-10-19) drives `crossBySufficiency` with a hand-made verdict to prove that a failed move rolls
the crossing record back. Without a `critiquedPlanSha256` the crossing now refuses before it writes anything, so the case
would stay green without reaching the move it exists to test. Its verdict (lines 266-269) gains
`critiquedPlanSha256: require('node:crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex'),` with the comment
"four-defects slice 24: a crossing refuses a verdict that does not carry the text it reads; this one does, so the move is
reached and fails" — the verdict a real `sufficiencyFor` returns. Its assertions are unchanged.

Case 10b (lines 295-314; revision 3, the owner's answer to q10) proves that a same-name clash at the destination is
refused before any entry is written. Its verdict (lines 305-308) is hand-made too, so without the text the crossing would
refuse at the new comparison, before `crossingBlocked` (`src/lib/streaming-gate.js` line 911), and the case would stay
green without reaching the clash. Its verdict gains the same
`critiquedPlanSha256: require('node:crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex'),` with the
comment "four-defects slice 24: a crossing refuses a verdict that does not carry the text it reads; this one does, so
the same-name clash is what refuses it". Its assertions are unchanged; Step 10's collision mutant shows it reaches the
clash (Decision 48).

Slice 23 edited cases 9 and 11 of this file (it is done); Step 9 re-reads the file.

#### Before and after

| Case | Before the change | After | What it pins |
|------|-------------------|-------|--------------|
| 108 | FAILS: nothing is recorded | passes | a background agent's Write into the waiting folder is recorded, hash of the JSON value |
| 109 | passes | passes | nothing else is recorded (a folder named `pending` elsewhere included); every call is allowed as today |
| 110 | passes (the editing tools are refused under `.ctoc/streaming/` today; the shell is allowed since 2026-10-15) | passes | the record and its older half are refused to every editing tool, and a shell write of them is allowed: the attribution is a guard against honest mistakes, said in a test |
| 111 | passes | passes | a folder in the record's place: nothing appended, nothing refused |
| 112 | FAILS: no older half | passes | rotation keeps the old record byte for byte |
| 113 (off Windows) | FAILS: nothing is recorded | passes | a working folder spelled through a link changes nothing: the record follows the Write target |
| 114 | FAILS: nothing is recorded | passes | a critic in its own worktree writing this project's waiting folder is recorded here, not in its working folder |
| 115 (off Windows) | passes (nothing is recorded at all) | passes | a link in the record's place is never written through |
| 13b, 19, 20 (realigned) | pass (13b's new assertion FAILS: no `critiquedPlanSha256`) | pass | a real critique still reaches the human |
| S24-1 | FAILS: the plan crosses on the continuation | passes | another agent's Write moves nothing, before or after a continuation; its questions are kept unclassified, and no second check is queued beside the plan's own running critique |
| S24-2 | FAILS: the plan crosses | passes | the brief's attack: no critique at all |
| S24-3 | FAILS: the plan crosses | passes | a program's file and the main session's Write move nothing; a payload's own binding is ignored |
| S24-4 | FAILS: plan y crosses | passes | a critique counts only for its own plan |
| S24-5 | crossings pass; FAILS only on the stored `critiquedPlanSha256` | passes | the real ways in — classification and precompute, started, then stamped — still move the plan; the binding is the menu's |
| S24-6 | FAILS: both changed texts cross | passes | the text, not the time, decides — before and after promotion |
| S24-7 | FAILS: the replay crosses | passes | a replay of an earlier critique moves nothing |
| S24-8 | FAILS: the unbound file crosses, and keeps the author's file out | passes | an unbound classification is none, and keeps nothing |
| S24-9 | passes | passes | authors and other blocks are as before, bound to nothing, never logged as unattributed |
| S24-10 | FAILS: no `critiquedPlanSha256` on the task | passes | the menu's record, at the start, kept through a stamp and a reload |
| S24-11 | FAILS: the stamp of an orphaned task is refused | passes | a precompute the reconcile orphaned past the 30-minute floor still counts |
| S24-12 | FAILS on the junk line: no record exists | passes | the record's reader fails closed, a linked record included |
| S24-13 | FAILS: the forged file is taken in and the plan crosses; no sentence | passes | the status line of the session's completion and of the owner's answer names the check that was not taken in, and says whether a new check is queued |
| S24-14 | FAILS: the forged file is taken in; "Nothing to check" | passes | "Check its questions" says the check ran but was not taken in |
| S24-15 | FAILS: the forged file is taken in | passes | the plan's screen and the gate screen say the same, and offer no second check |
| S24-16 | FAILS: the swapped text crosses (and no `critiquedPlanSha256` on the status) | passes | the crossing reads once and refuses other bytes; a verdict without a text crosses nothing |
| S24-17 | FAILS: start.md launches before it starts, and says nothing of when a precompute completes | passes | the session starts a gate critique before any of its agents, then stamps the gate critic, and completes a precompute only on its gate critic's return |
| S24-18 | FAILS: the superseded, cancelled, failed and cancelled-then-completed critiques' files are taken in | passes | only the latest started critique counts, never one cancelled, being cancelled or failed, and never one whose cancellation was requested, even once completed |
| S24-19 | FAILS: the stamp of a completed task is refused (`invalid transition done → running`) | passes | an early completion no longer voids a critique; the task still records at most one agent |
| S24-20 | FAILS: the unattributed synthesis is taken in classified, attested and with its ruling, and the plan crosses | passes | an unattributable classified file keeps its findings, loses its classification, attestation, ruling and notice, queues a new check once its critique is completed, and never replaces a checked file of its revision |
| S24-21 | (a) passes: nothing is checked; (b) FAILS: the other bytes cross | passes | residual 6, pinned: a recorded Write that never ran is credited when exactly those bytes arrive later; other bytes count for nothing |
| S24-22 | FAILS: the stray file is taken in classified and the plan crosses | passes | while a critique of the plan is queued or running no classification is queued beside it; the status line and "Check its questions" say a check is already queued or running; the running precompute's own file still moves the plan |
| S24-23 | FAILS: the screens say the check "did not finish" | passes | a classification the menu lost track of is told truthfully, on both screens, with no second check offered |
| plans-keep-moving (realigned `dropPending`) | pass | pass | the fixture takes the real way; its cases test what they tested |
| real-question-file-render, the staging | passes | passes | a staged classified file is bound to its plan |
| real-question-file-render, the structure case | passes (it cannot fail today) | passes | its check fails on a forged junction run and on a forged column rule `│` inside a cell; on a forged cell once the box-drawing replacement is dropped, and on its column rule alone once only `│` is let through (Step 10) |
| sufficiency-evidence case 10 | passes | passes | with the text in its verdict it still reaches the failed move and its rollback |
| sufficiency-evidence case 10b | passes | passes | with the text in its verdict it still reaches the same-name clash in `crossingBlocked`; the collision mutant turns it red (Step 10) |

**Mutant checks in Step 10**, each made in the working tree by an edit, run, recorded, and undone by editing it back —
never by a git command, which in this shared checkout would also undo other slices' uncommitted work — then confirmed with
`git diff`:
- drop step 11 from `promotePendingFile`: S24-1, S24-2, S24-3, S24-4, S24-6 (a), S24-7, S24-13, S24-14, S24-15, S24-18,
  S24-20, S24-21 (b) and S24-22 fail.
- drop the guard in `queueClassification` (queue a classification while a critique of the plan is queued or running):
  S24-1 and S24-22 fail.
- read an orphaned classification as `'ended'` again (drop the `'orphaned'` state): S24-23 fails.
- drop the destination-collision line of `crossingBlocked` (`src/lib/streaming-gate.js` line 871 on 2026-10-19):
  sufficiency-evidence case 10b fails (its verdict now reaches the clash, the crossing writes an entry over the other
  destination's, the move throws, and the rollback removes the file the case compares byte for byte).
- credit a recorded writer whatever the bytes (drop the sha256 match in `recordedWriters`): S24-21 (b) fails.
- discard an unattributed classified file whole instead of taking its questions in: S24-1, S24-20 (a) and S24-13 (b) fail.
- keep the attestation, or the gate ruling and the coverage notice, on a file whose classification is dropped: S24-20 (a)
  fails (the attestation is still stored; or the writer refuses the ruling without one and the questions are lost).
- count any started critique of the plan, not only the latest: S24-18 (a) fails.
- count a cancelled, cancelling or failed critique: S24-18 (b) fails.
- count a critique whose cancellation was requested (drop the `ts.cancelRequested` test): S24-18 (c) fails.
- accept any recorded writer without the task match: S24-1, S24-4 and S24-18 (a) fail.
- drop the task's `critiquedPlanSha256` comparison: S24-6 (a) and S24-7 fail.
- pass the payload's own `critiquedPlanSha256` to the writer: S24-5 (a) fails.
- drop the text check from `planQuestionsStatus`: S24-6 (b) and S24-7 fail (the earlier critique, still in the store, reads
  fresh again).
- count a classification without `critiquedPlanSha256`: S24-8 fails.
- keep an unbound classified file from replacement (drop the `typeof existing.critiquedPlanSha256` check): S24-8 fails.
- drop the hash comparison from `crossBySufficiency`: S24-16 fails.
- drop `critiquedPlanSha256` from `sufficiencyFor`'s verdict: S24-5 and every realigned crossing fail (nothing crosses).
- record the text at the stamp instead of the start: S24-10 fails.
- drop `critiquedPlanSha256` in `normalizeLoadedTask`: S24-5, S24-10 and S24-11 fail (and every realigned fixture).
- hash the raw text in `waitingFileSha256`: 108 and S24-5 (b) fail.
- refuse the stamp of an orphaned gate critique again: S24-11 fails; of a completed one: S24-19 fails.
- record the main session's Write too: 109 fails.
- place the record by the working folder's project instead of the target's: 113 and 114 fail.
- accept any folder named `pending`: 109 fails.
- append through a link (drop the lstat check in the hook): 115 fails; read through one (in the sweeper): S24-12 fails.
- drop the rotation: 112 fails.
- drop `notTakenIn` from `continuationText` or from `continueAfter`: S24-13 (a) or (b) fails; say the same sentence whether
  or not a check was queued: S24-13 (a) or (b) and S24-20 (a) fail.
- return `'exists'` instead of `'not-taken-in'`: S24-14 fails; drop the `checkState` state: S24-15 fails.
- launch before the start in any of the four start.md spans, or drop either completion sentence: S24-17 fails.
- drop the box-drawing replacement from `matrixCellText` (`src/lib/streaming-gate.js` line 1242 on 2026-10-19): the
  structure case of `tests/real-question-file-render.test.js` fails on the forged cell, on its junction run and its column
  rule — its red; let only `│` through (`MATRIX_BOX_DRAWING`, line 1235, as `/[─━┃-╿]/g`): it fails on the forged
  cell's column rule alone; restored, it passes on the forged cell and on the real sample.

**Error paths:** every unattributed, rebound and replayed file; a superseded, cancelled, cancelling, failed or
cancelled-then-completed critique; a critique completed early; a record that cannot be written, read, that is oversized or a
link; an orphaned critique; a plan that cannot be read; a plan rewritten between the verdict and the crossing; a dropped
classification whose questions the writer then refuses; a recorded Write that never ran (S24-21); a stray file while a
critique of the plan runs (S24-22); a classification the menu lost track of (S24-23); a hand-made verdict that must still
reach the same-name clash (sufficiency-evidence case 10b).
**Edge cases:** whitespace-only differences, a working folder
spelled through a link, a working folder in another project, a folder inside the waiting folder, a folder named `pending`
elsewhere, a missing folder, an oversized Write, malformed agent ids, a payload carrying its own binding; a forged column
rule `│` inside a matrix cell.

**Coverage:** every early return of `recordWaitingWrite` (108, 109, 111, 115), its project test (109, 113, 114), the rotation
(112); `recordedWriters`' absent, unreadable, oversized, linked and junk branches (S24-12)
and `attributedCritique`'s outcomes (S24-1 to S24-7, S24-18, S24-19); step 11's three outcomes — kept, dropped and taken in,
dropped and refused (S24-5, S24-20 a, S24-20 b); `planContentSha256`'s three outcomes (S24-5, S24-10, the existing
a-build-start case 8); the writer's given, computed and unbound branches (S24-5, S24-16, the existing question-blocking
cases, the existing sufficiency-audit case 4) and its unbound-existing branch (S24-8); the reader's stale and unbound
branches (S24-6, S24-8); the stamp of an orphaned and of a completed task (S24-11, S24-19); `crossBySufficiency`'s refusal
and its rollback (S24-16, sufficiency-evidence case 10) and the clash it now reaches (case 10b); `notTakenInSentences`'
three sentences, `continuationText`, `continueAfter`, `queueClassification`'s and `checkState`'s new outcomes (S24-13 to
S24-15, S24-20, S24-22, S24-23); the late-stamp branch's three outcomes (S24-11 and S24-19 record; S24-19 refuses another
agent and accepts the recorded one again). Coverage of `src/` does not fall.

### Security Review
- [ ] Trust boundary, a guard against honest mistakes (revision 2, Decision 42): the waiting folder and the plans are
  writable by every background agent. The hook's record is refused to every editing tool, but a shell command can write
  it since the owner's removal of 2026-10-15 (case 110 pins both). The task registry, which holds the menu's record of
  the critic and the text hash, is writable by any shell command. The stamp `menu task start <id> --agent-id <id>`,
  which sets the critic, is refused to a background agent's plain call by slice 21 (revision 3), but not to a script
  file it writes and runs. CTOC's installed code is refused to nobody (Decision 39); Claude Code's settings are refused
  to a background agent by the settings protection on the main checkout, within its named limits (residual 5). So the
  three records stop a stray or careless classified Write. A background agent that sets out to forge them can
  (residual 1).
- [ ] Positive evidence, fail closed: the consumer requires the record; every way of writing the file that the hook does not
  see produces none (S24-3) unless the same program forges the record too (residual 1), and every fault reads as "not
  attributed" (S24-12), a link in the record's place included (115, S24-12). "Not attributed" keeps the questions and drops
  every claim: classification, attestation, gate ruling and coverage notice (S24-20).
- [ ] Binding: a classification counts only for the text its critique started on, before promotion (S24-6 a, S24-7) and on
  every read (S24-6 b), and the crossing moves only that text (S24-16); a time set back changes nothing; a payload's own
  binding is never read (S24-3, S24-5). The session starts every critique before any of its critics reads (S24-17).
- [ ] Scope: a critic counts only for the plan its task names (S24-4), only on that plan's latest critique and never on one
  cancelled, failed, or completed after its cancellation was requested (S24-18); the main session's Write is not a way in
  (S24-3).
- [ ] A task's status decides no more than it must: a completion — the session's early one, or a background agent's — never
  voids a critique, because the stamp is accepted on a completed critique that records no agent and a done
  critique counts (S24-19); a background agent's completion of a critique voids it no more than the session's early one
  does; and the one status change that ends a critique — a cancel request — is recorded (`ts.cancelRequested`) and
  excludes it for good (S24-18 c).
- [ ] CTOC's installed code and Claude Code's settings: not refused by this slice (revision 2, Decisions 39 and 40); the
  settings are refused to a background agent by the settings protection already on the main checkout (revision 3);
  residuals 4 and 5, listed under Neighbours.
- [ ] Visibility: a check that was not taken in is told to the owner on the status line, the plan's screen and "Check its
  questions" (S24-13 to S24-15, S24-20, S24-22), and a check the menu lost track of is told as such, claiming neither
  outcome (S24-23); nothing from the file reaches a screen (the plan is named from the menu's own list).
- [ ] No over-reach: no call is refused that was allowed (revision 2); an author's file is as before (S24-9); the hook never
  refuses for its record (111, 115).
- [ ] Denial of service, accepted and named: another agent overwriting the critic's file, or flooding the record past two
  halves, makes the critic's classification dropped — its questions are kept, the plan waits for a new check or the owner,
  nothing crosses. The latest-critique rule adds one more such way, to whoever can start a critique: slice 21 refuses a
  background agent's plain `menu task add`, `start`, `fail` and `cancel` (revision 3), so a background agent needs a
  script file or a shell write of the task registry to start, fail or cancel one, which then never counts. A superseding
  start, a failure or a cancel makes the plan wait for a new check or the owner; none crosses one. A forged file taken in
  unclassified queues no classification while a critique of the same plan is queued or running (`'critique-running'`,
  S24-22), so it cannot supersede that critique through the menu's own queue.
- [ ] Residuals named, not hidden:
  - a background agent that sets out to forge the records can: a shell append to the record or a shell write of the task
    registry, each allowed under the owner's removal, or a script file that stamps its own id on a critique;
  - a text swapped only while the critic reads it;
  - CTOC's installed code, refused to nobody, and Claude Code's settings, within the settings protection's named limits;
  - a record line of a Write that something after this hook refused, credited when exactly those bytes arrive later
    (residual 6, S24-21).

  Closing the first and the third needs isolating background agents, separate work; closing the last needs a record made
  after the tool ran.
- [ ] No secret in the record (agent ids, file names, hashes, times); the record and its older half are ignored by git
  (`.gitignore`), and nothing personal is written.
- [ ] No new dependency; no shell; all paths through `path`.

### Wiring — the live call sites
- The hook: `hooks/hooks.json` registers `protect-records.js` alone (lines 4-14) → `main` (lines 1153-1182 on
  2026-10-19) → `decide` (lines 1105-1141) → for a background agent's Write, `recordWaitingWrite`, last in the
  editing-tool branch (lines 1115-1129), after every refusal there. A declared reachability root
  (`.ctoc/reachability-roots.json` line 11).
- The sweeper: `promotePendingFile` → `attributedCritique` → `recordedWriters`, and its declassified branch, reached from
  `continueAfterCrossing` (`src/lib/menu-screens.js` line 2896), `streamingGateScreen` (`src/lib/streaming-gate.js` line
  2132), `planDecisionScreen` (line 1634) and `nextUnansweredQuestion` (line 410) — the session's continuation and every
  screen that reads questions.
- The precompute module: `planContentSha256` called by the sweeper, `taskTransition`, `writePlanQuestions` and
  `planQuestionsStatus`; `isTopiclessId`, newly exported, called by the sweeper; the reader's rule reaches every gate verdict
  through `hasEnoughInformation`, whose `enough` verdict carries the bound text to `sufficiencyFor` and `crossBySufficiency`
  (`pendingGateDecisions`, lines 1087 and 1101).
- The owner's view: `notTakenInSentences` from `continueAfterCrossing`, read by `continuationText` (`menu task complete <id>
  --continue`) and `streaming-gate.continueAfter` (`stream approve`, `stream answer`); `queueClassification`'s new outcomes
  by the continuation's classification loop and by `streamCheck` (`stream check <ref>`, the "Check its questions" option);
  `checkState`'s new states by `planDecisionScreen` (`plan <ref>`) and `gateScreenAt` (the default screen of
  `/ctoc:start`).
- The menu: `menu task start` (`route` → `taskCommand` → `taskTransition`, its late-stamp branch included), run by the
  session as start.md now tells it:
  start every gate critique first, launch, stamp the gate critic (WORK dispatch step 2, COMPLETION step 3, the precompute
  recipe, the classification paragraph); complete a precompute only on its gate critic's return (COMPLETION step 1, the
  precompute recipe).
- The session's instructions: `src/commands/start.md`, loaded by `/ctoc:start`.
- No module is added; the new functions are module-local except the five exports named (`WAITING_WRITES_ROTATE_BYTES`,
  `waitingWritesPath`, `waitingFileSha256`, `planContentSha256`, `isTopiclessId`), each with a live caller.

## Acceptance Criteria

- [ ] A background agent's Write of a JSON file into a waiting folder is allowed and recorded once — agent, file, sha256 of
  the JSON value, time — in the record of the project the Write targets, whatever the agent's working folder (108, 113,
  114); nothing else is recorded; every call allowed before is allowed after (109).
- [ ] The record and its older half are refused to every editing tool, for the main session and background agents, and a
  shell write of them is allowed (the owner's removal, pinned so the guard's limit is stated in a test); a record that
  cannot be written never refuses; a link in its place is never written through; past 1 MiB the record rotates (110, 111,
  112, 115).
- [ ] No new refusal: the hook refuses nothing it allowed before (revision 2, Decisions 39-41).
- [ ] A classified file written by another background agent, by a program, by the main session, by a critic launched for
  another plan, or carrying its own binding, moves nothing before or after a continuation; it keeps its questions, loses its
  classification, attestation, gate ruling and coverage notice, is logged as `classification-not-attributed`, and a new
  check of it is queued unless a critique of that plan is queued or running or one already ran for that question revision
  (S24-1 to S24-4, S24-20 a, S24-22); it never replaces a file the menu's own critique checked for that revision
  (S24-20 b).
- [ ] While a `precompute` or `classify` task of a plan is queued or running, no classification of that plan is queued;
  the continuation's status line and "Check its questions" say a check of it is already queued or running, and the
  running precompute's own file still moves the plan (S24-22).
- [ ] A record line of a Write that never ran is credited only to exactly the bytes recorded, for the text the critique
  started on; other bytes count for nothing (S24-21); the gap is named as residual 6 in the plan, the hook header and
  `docs/ENFORCEMENT.md`.
- [ ] Only the plan's most recently started critique counts, and never one cancelled, being cancelled, failed, or
  completed after its cancellation was requested (S24-18).
- [ ] The classification the menu queued and the precompute the owner asked for — started, then stamped with the gate
  critic's id, also after the reconcile orphaned it or the session completed it early — move the plan, and the store
  records the text they started on (S24-5, S24-11, S24-19, realigned 13b, 19, 20).
- [ ] A changed plan text — while the critic runs, after the file was taken in, under a replayed critique, or between the
  verdict and the crossing — moves nothing, whatever the plan's time says (S24-6, S24-7, S24-16).
- [ ] A classified file without the text it was checked against counts as unclassified and keeps nothing from replacement
  (S24-8); an author's file and another block are as before (S24-9).
- [ ] A gate-critique task records the plan text at its start, keeps it through a stamp, a reload and other writes; no other
  kind and no missing plan records one (S24-10).
- [ ] The record's reader fails closed on an unreadable, oversized or linked record and skips a junk line (S24-12).
- [ ] The owner is told when a gate critic's check was not taken in, and whether a new check is queued: the status line of
  the session's completion and of his own answer, "Check its questions", the plan's screen and the gate screen (S24-13,
  S24-14, S24-15, S24-20); a classification the menu lost track of is shown as such on both screens, claiming neither that
  it finished nor that it did not, with no second check offered (S24-23).
- [ ] `start.md` tells the session to start every gate critique before any of its agents is launched, then launch, then
  stamp the gate critic's id, in all four places, and to complete a question precompute only on its gate critic's return
  (S24-17), and every sentence `tests/the-session-claims-a-build-before-launching-it.test.js` pins is still there word
  for word, as is the stamp branch's literal head in `src/lib/menu-screens.js` (that file passes); `docs/ENFORCEMENT.md`
  and the hook header state the rule, the record, that it is a guard against honest mistakes, and the residuals, the
  installed code among them as not refused.
- [ ] The structure check of `tests/real-question-file-render.test.js` can fail, a forged column rule `│` inside a cell
  included: it was seen red on a forged cell with the box-drawing replacement dropped, and on the forged cell's column rule
  alone with only `│` let through, and passes on the real sample.
- [ ] The owner's answer to the re-filed question 1, which includes the hook change, was on record before the build
  began — `.ctoc/streaming/answers.jsonl` line 198, `q11-adopt-the-attribution-record-now-r1792323789864`, option 1,
  "Adopt it now, knowing it only stops honest mistakes" — and is quoted under `## Execution Record`; lines 36 and 38 of
  2026-10-16 were not read as approval (Step 8's first box; Decision 46; revision 3).
- [ ] `.gitignore` ignores the record, its older half, the inbox answer record and its claim folder (Step 15's
  `git check-ignore`).
- [ ] The repository's fixtures no longer forge a classification: `dropPending` and the sweeper's cases take the real way,
  passing the hook the target's real path, and `dropPending` completes the critique it starts, so its thirteen callers
  test what they tested (B9 and B9b included); sufficiency-evidence case 10 still reaches the failed move and case 10b
  the same-name clash.
- [ ] The red cases were seen failing before the change, and each mutant was killed.
- [ ] Only the fourteen declared files changed.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped
  and 0 flaky.

## Risks

- **The design relies on Claude Code's `agent_id` being the id its Agent tool returns.** Read in Claude Code's own code
  (2.1.296, the same line in 2.1.291) and in this session's records; it is not a documented contract, and neither it nor the
  session's start-launch-stamp order can be observed live before the release, because the hook and `start.md` that run are
  the installed copies.
  - Likelihood: LOW. Impact: MEDIUM — fail closed: no classification would be taken in, every file would keep its questions
    unclassified, the status line and the plan's screen would say the check was not taken in, and the owner's own approval
    (`stream approve`) would still move every plan; nothing would cross unseen. The log names it
    (`classification-not-attributed`).
  - Mitigation: Step 9 re-reads the installed build and records its version; Step 15 records the first live check after the
    release.
- **Classified files written before this change stop counting.** In main, every such file belongs to a plan that has already
  left the stage the file is for (search `"by": "gate-critic"` over `.ctoc/streaming/questions/`: 20 files — slices 1-18 at
  `implementation/`, the parent at `functional/`, and `an-empty-overrides-map-is-read-as-empty`, now in `done/`). In another
  project, a plan waiting on one waits for the owner's approval or a new check: an unbound file no longer keeps an author's
  file out, and "Check its questions" queues a check when none is recorded for that revision, and otherwise says the check
  ran but was not taken in.
  - Likelihood: MEDIUM. Impact: LOW.
- **A critique in flight when this release is installed is not taken in.** Its task was started before the change, so it
  records no `critiquedPlanSha256` (and it was started the old way, after its critic was launched): its
  critic's file keeps its questions unclassified, the status line says the check was not taken in, and a new check is
  queued unless one already ran for that question revision, in which case the plan waits for the owner's approval.
  - Likelihood: MEDIUM (any critique running across the update). Impact: LOW — fail closed, its questions kept, and told.
- **A session that forgets the start-first order, the stamp, or when to complete.** A critique started after its critic was
  launched records the plan's text at that later moment, which need not be the text the critic read (residual 2 widens to
  the launch-to-start gap); a missing stamp leaves no agent recorded, and the critic's file keeps its questions
  unclassified, the owner is told, and the plan waits for a new check or his approval. A precompute completed early — when
  a lens critic returns — no longer voids the critique: the stamp is still accepted (S24-19). start.md now says the order at
  all four places a critique is started and when a precompute is completed, pinned by S24-17.
  - Likelihood: LOW. Impact: LOW.
- **A file declassified first by a screen is not on the continuation's status line.** Every screen that reads questions
  sweeps the waiting folder too (`nextUnansweredQuestion`, `streamingGateScreen`); a file taken in without its
  classification there is not in the continuation's own sweep report. Then the log has it, its questions are on the plan's
  screen unchecked, the next continuation queues a new check unless one already ran for that question revision, and for a
  classification that ran the plan's screen and "Check its questions" say the check ran but was not taken in.
  - Likelihood: LOW (the session's completion of the critique's task normally runs the first sweep after its critic writes).
    Impact: LOW — nothing crosses, nothing is lost; only the sentence is missing.
- **The precompute is started before its gate critic exists.** Handled: the stamp is accepted also on a precompute the
  reconcile orphaned (S24-11) or the session completed early (S24-19).
- **A running critique holds the new check** (revision 3, Decision 50). While a critique of a plan is queued or running,
  a file declassified meanwhile gets no classification of its own; if that critique's own file was the one dropped (the
  session forgot the stamp), the new check waits until the session completes the critique, whose continuation queues it
  (S24-20 a). An orphaned critique holds nothing.
  - Likelihood: LOW. Impact: LOW — nothing crosses; the status line says a check is already queued or running.
- **The attribution is a guard against honest mistakes, not a barrier** (revision 2). A background agent that sets out to
  make a plan cross can append a forged record line or write the task registry with an ordinary shell command under the
  owner's removal, or stamp itself as a critique's critic through a script file it writes (slice 21 refuses the plain
  menu call, revision 3).
  - Likelihood: LOW for an honest agent. Impact: HIGH — a plan crosses on a classification the agent wrote.
  - Mitigation: said plainly in the hook header, `docs/ENFORCEMENT.md` and the owner's question 1, which he answered
    knowing it. Isolating background agents is the barrier, separate work. Slice 21 keeps every decision route and every
    task route but the plain completion from a background agent's calls the hook reads.
- **CTOC's installed code stays writable** (revision 2, Decision 39). One Edit there can switch every check off. Claude
  Code's settings are refused to a background agent by the settings protection, within its named limits (revision 3).
  - Likelihood: LOW. Impact: HIGH.
  - Mitigation: Neighbours, for the owner to schedule.
- **The hook writes a file for the first time.** It never refuses for it, its growth is bounded (two halves of about 1 MiB),
  and the sweeper is loaded only for a background agent's Write of a `.json` file into a folder named `pending`. Step 12
  measures the added time.
  - Likelihood: LOW. Impact: LOW.
- **Fourteen files, edited by other slices too** (search of the round's plans' `files:` lists, brought up to date by
  revision 2; revision 3 adds slice 21 as a dependency): `src/hooks/protect-records.js`, `docs/ENFORCEMENT.md`,
  `tests/protect-records.test.js`, `tests/plans-keep-moving-without-the-human.test.js` and `src/commands/start.md` by
  slice 21, which builds first (its new cases, its case 36, its scope-growth paragraph and inbox sentence; its neighbour
  table calls the spans disjoint), and the hook files by the settings change and the hotfix check's labelled-commit plan;
  `src/lib/streaming-gate.js` and `tests/sufficiency-evidence.test.js` by slice 23 (done); `src/commands/start.md` by
  slices 9, 14, 18, 19, 22, 27 and 28 too; `src/lib/menu-screens.js` by slices 7, 8, 13, 19 and 22; `src/lib/task-registry.js`
  by slice 12. Builds run one at a time; Step 9 re-reads every span.
  - Likelihood: MEDIUM. Impact: LOW.
- **A test outside the declared files may rely on an unbound classification, a forged waiting file, or a hand-made verdict
  without a text.** By search (pattern `gate-critic['"]?\s*,\s*at` over `tests/`: 15 files, each match read; plus
  `tests/streaming-questions-sweeper.test.js`, which holds a NUL byte, so a search of the folder skips it as binary and only
  a search of the file itself finds its three matches), every other file writes classified files through
  `writePlanQuestions`, which binds them for a direct caller. `crossBySufficiency` is called directly by two test files
  (search `crossBySufficiency` over `tests/`: 4 files, each read): `tests/sufficiency-evidence.test.js` cases 10 and 10b
  (declared) and `tests/streaming-gate-coverage-holes.test.js` "628-629", whose injected read fault fires before the new comparison, so
  it still reaches the `catch` it covers; `tests/protect-records.test.js` and `tests/sufficiency-audit.test.js` only name it.
  Step 9 repeats the searches with binary files included, and Step 10's whole-suite run is the authority; a failing file
  outside the list is a scope-growth request, never a silent edit.
  - Likelihood: LOW. Impact: LOW.
- **Residual — a background agent that sets out to forge every record can, with ordinary shell commands and a script**
  (revisions 2 and 3), and CTOC's installed code is refused to nobody. Not closed by this slice (above, "What this slice
  does and does NOT close"). Likelihood LOW (a deliberately hostile agent), impact HIGH. Isolation is separate work; the
  owner chose on 2026-10-18 to adopt this slice before it (question 1 below).
- **A test outside the declared files may pin what revision 3 changes.** `queueClassification` answers
  `'critique-running'` where a queued or running classification of the same revision answered `'exists'`; `checkState`
  answers `'orphaned'` where it answered `'ended'`. Searches on 2026-10-19 over `tests/` for the texts these change
  ("already recorded; nothing was added": no match; "did not finish": no match) and for `checkState|'ended'` (no match)
  found no test that pins them; the sweeper test, which a folder search skips as binary, is declared. Step 10's
  whole-suite run is the authority, and a failing file outside the list is a scope-growth request.
  - Likelihood: LOW. Impact: LOW.

## Questions for the owner (they wait for his answer when this plan is otherwise ready to be built)

**Answered on 2026-10-18 (revision 3).** The gate critique filed question 1 as
`q11-adopt-the-attribution-record-now-r1792323789864`, and the owner answered it himself: "Adopt it now, knowing it only
stops honest mistakes" (`.ctoc/streaming/answers.jsonl` line 198, `ts` 2026-10-18T12:21:58.428Z, `optionKey` 1). He
knows it stops only honest mistakes, and the hook's `recordWaitingWrite` is part of what he adopted. Step 8 quotes that
line. Since his answer, slice 21's rule (in the build queue) refuses a background agent's plain `menu task start`, so the
stamp named below now needs a script file; the record append and the task registry write remain ordinary shell commands.
On the same critique's gate ruling he chose CTOC's Hold (line 178), which still holds this plan (revision 3, Decision 58).
The text below is the question as he was asked it.

It is his: the gate critique of this plan files it in the question store as a blocking question on the security posture
— topic `security-posture`, one of the high-stakes topics (`HIGH_STAKES_TOPICS`, `src/lib/streaming-precompute.js` line
215) that `isBlockingQuestion` always sends to the owner (line 928) — so the plan cannot move on until he answers, and
it is never settled by its recommended option. Step 8's first box stops the build unless his answer is on record in
`.ctoc/streaming/answers.jsonl`.

**His answers of 2026-10-16 do not carry over** (the CTO Chief's ruling R3 of 2026-10-18, Decision 46). He answered
revision 1's two questions with option 1 (`.ctoc/streaming/answers.jsonl` lines 36 and 38: adopt now; approve the hook
change). Both were given for the broader scope that his re-scope of 2026-10-17 ended, so both are void. The hook change
(`recordWaitingWrite`) is therefore no longer a separate question 2: it is part of question 1, asked again in revision
2's words below. Revision 1's question 2 is withdrawn.

**1. Adopt this change now — including the change to CTOC's write protection — knowing it only stops honest mistakes,
or hold it until background agents are isolated?** (topic: security-posture)

Today any background agent can move a plan into the build queue by writing one small file, even by mistake. This change
stops the mistake: a question file counts only when CTOC's write protection recorded the very critic the menu started
writing it, for the plan text the critique started on. To do that it changes the write protection, CTOC's one loaded
hook (`recordWaitingWrite` in `src/hooks/protect-records.js`): the hook keeps a record of every background agent's Write
into the questions waiting folder — who, which file, and the hash of what was written — in
`.ctoc/streaming/waiting-folder-writes.jsonl`. It refuses nothing new, and a record it cannot write never blocks a
Write; revision 1's refusals (CTOC's installed code, Claude Code's settings files, one inline-script name) are dropped.
Under your removal of 2026-10-15, an agent that sets out to forge can still do it with ordinary commands: stamp itself
as a critique's critic (`menu task start <id> --agent-id <its id>`), append a line to the record, or write the task
registry. It stops nobody determined until background agents are isolated.

| Option | Pros | Cons |
|---|---|---|
| **Adopt it now, knowing it only stops honest mistakes (Recommended)** | a stray or careless classified Write no longer moves a plan; a file it cannot tie to the critique keeps its questions but not its check, and the plan waits for a new check or your approval; you are told on the status line; the text binding stops a time set back or a text changed after the critique started; the hook only adds one appended line per background agent's Write into the waiting folder | fourteen files change, the write protection among them, which for the first time writes a file (a shell command can write that file too); a question file the gate critic classified before this change, or during the update, stops counting, so its plan waits for a new check or your approval; a determined agent still gets through |
| Hold it until isolation is decided | nothing changes now, the write protection included | one Write call by any background agent, even by mistake, can still move a plan into the build queue |

Recommended: adopt it now, knowing it only stops honest mistakes. It closes the careless case at once and costs
nothing in the deliberate case, which is open either way until isolation; the hook change records and refuses nothing.
The evidence is this plan's own trace of the crossing (Problem Statement); how often an honest stray Write happens is
not measured.

(Revision 1's question 2, "Approve this change to CTOC's write protection?", is withdrawn: its subject is in question 1.)

**Lens limits, for the owner:** the critique lenses refuse dot-files and bare `parent_plan` names, so they could not read
`.gitignore` or this plan's ancestry.

Revision 2 did not write the plan's pending questions file; the gate critique of 2026-10-18 filed the question, and the
owner answered it. Revision 3 writes no question file either (its brief).

## Decisions Taken Under Ambiguity

Decisions 39-47 (revision 2, 2026-10-18) and 48-58 (revision 3, folding in the owner's answers of 2026-10-18) stand at
the top of this plan, under their revisions' own "Decisions Taken Under Ambiguity" headings; where they differ from the
decisions below, they decide.

1. **The owner's instruction.** On 2026-10-12 the main session relayed the owner's answer "fix all ultrathink the fix"; it is
   not in CTOC's own answer store. This plan reads it as: fix every hole the round's reviews found, at maximum effort, at the
   root cause, each fix attacked by the red-team critic before it is built. It does not read it as approving this change to
   the write protection: that approval is asked (Questions for the owner, question 1 since 2026-10-18, Decision 46). This slice is the root cause behind his fifth
   hole, a background agent starting the menu with `rg --pre` so that ready plans move on.
2. **(Its reach is superseded by revision 2's Decision 42: the three records are reachable by ordinary commands under
   the owner's removal, so this is a guard against honest mistakes.) The root cause** is that the evidence every crossing trusts is a self-asserted block in a file any background agent can
   write, bound to the plan by a modification time any agent can set back. The fix makes the evidence positive: three
   records, written by the hook, the menu and CTOC's own code. The hook's record and the live store are out of reach of
   every Write and Edit call and of every command whose paths the write protection reads; the menu's, in the task
   registry, only of an agent's ordinary writes and of a background agent's menu calls the write protection reads, which
   slices 20 and 21 refuse as guards against mistakes, not barriers — a deliberate write, such as a program the agent
   writes, or a menu call the write protection cannot read can still forge it (residual 1).
3. **Design (a) with (c), not (b)**, for the reasons under "Why this design": (b) puts untrusted critic output into the
   session's context and closes nothing more; a hook deny-list is bypassed silently by programs; `agent_type` binds neither a
   plan nor a text.
4. **The consumer decides, the hook records.** The hook refuses nothing new (revision 2: Decisions 28, 31 and 35 are
   superseded by Decisions 39-41); the sweeper requires the record.
5. **The agent id is relied on, verified in Claude Code's code, not yet live.** Claude Code's own code sets `agent_id` from
   the running agent's `agentId`, the id its Agent tool returns and the session passes as `--agent-id`. Neither that nor the
   session's start-launch-stamp order can be observed before the release, because the hook and `start.md` that run in a
   session are the installed copies; Step 15 records the first live check. If the ids ever differ, the failure is closed
   (no classification is taken in; every file keeps its questions unclassified), shown to the owner (the status line and
   the plan's screen say the check was not taken in) and never open: his own approval still moves a plan (`stream
   approve` → `approvePlan`, which reads no question file).
6. **Only the Write tool is recorded.** An Edit's result is not known before it runs; the gate critic writes its one file
   with one Write and never uses Edit (`agents/iron-loop/gate-critic.md` lines 89-99). An Edit-made classified file is
   unattributed and taken in without its classification.
7. **The hash is of the JSON value**, not the bytes, so whitespace or line endings a tool writes change nothing (S24-5 b).
8. **Any recorded Write of the same content by the critique's agent counts**, not only the last write to that file:
   identical bytes are the critic's own words, and the text binding stops a replay; "last writer" would let another agent's
   copy drop a real critique's classification.
9. **The text is taken when the critique task starts**, not at the stamp or at promotion, and the session starts every gate
   critique before any of its agents is launched (start.md, pinned by S24-17), so no critic reads before the text is taken;
   a text changed after that is refused at promotion (S24-6 a). An agent that swaps the text in only while the critic reads
   and back before the check makes the original text cross on a critique of the swapped one; by that swap it cannot make a
   text of its own cross (a menu call the write protection cannot read can: residual 1). Named as residual 2.
10. **A gate critique orphaned by the reconcile can still be stamped.** *(Revision 3, 2026-10-19: a start without
    `--agent-id` now records no agent, which the reconcile reads as unknown, never as dead; such a critique is orphaned
    only past the 30-minute staleness floor, when a confirmed sweep or the Doctor's "Repair state" runs the reconcile
    (`src/lib/task-reconcile.js` lines 68-76, 103 and 357-404). The rule below stands for that case.)* Its placeholder
    can never match a live agent id
    (`src/lib/task-reconcile.js` lines 323-361), so a precompute whose lens critics run past the 60-second grace window
    (line 92) would otherwise lose its gate critic's file. Its status stays; only the agent is recorded. The same holds for
    a completed one (Decision 29).
11. **An unbound classification counts as none.** A block without the text it was checked against is exactly what a forger
    writes, before this change or around it. Cost: legacy classified files stop counting (Risks).
12. **The writer binds a direct caller to the plan's current text.** Every production classification comes through the
    sweeper, which passes the verified text by name; computing it for a direct caller keeps the thirteen test files that
    write classified files through `writePlanQuestions` valid without change. The writer's doc comment says that a new
    production caller passing a classification must pass the verified text — plan 00411's fan-out is the one planned caller
    that would otherwise reach this branch (Neighbours).
13. **A classified file that cannot be tied to its critique keeps its questions** (CTO Chief's ruling, second revision): its
    classification and its attestation are dropped, and with the attestation the gate ruling and the coverage notice, which
    the store accepts only in an attested synthesis (`reservedIdErrors`, `src/lib/streaming-precompute.js` lines 549-560);
    every other question is kept and the file is taken in as an author's file is. It moves nothing — an unclassified file
    never does — and the continuation queues a fresh classification of it, once per question revision (a classification
    already run for that revision is never retried in a loop; the plan then waits for the owner's approval, told). The
    earlier rule, discard it whole, lost a real critique's work whenever the menu could not attribute it — a forgotten stamp,
    an early completion, an agent-id mismatch — and gained nothing: any background agent can already drop an author's
    unclassified file with any questions in it. The writer's only-grow rule still keeps a checked, bound file of the same
    revision from being replaced (S24-20 b); such a file is then discarded with that reason. The log records
    `classification-not-attributed` for every such file, and the sweep's report lists the refs taken in this way
    (`declassified`).
14. **The record lives under `.ctoc/streaming/` of the project the Write targets,** which the hook already refuses to every
    editing tool (a shell write is allowed since the owner's removal of 2026-10-15; revision 2), so no new protection rule
    is added for the file itself. It is a per-machine runtime record, not
    a project record: `.gitignore` ignores it and its older half (unlike the owner's answers log, which stays tracked). It
    holds no personal data.
15. **Rotation at 1 MiB with one older half**, and a reader that ignores a half past 2 MiB, bound the hook's and the
    sweeper's work.
16. **(Superseded by revision 2's Decision 43: `depends_on` is slice 23 only.) `depends_on`: slices 20, 21 and 23.** The menu's record holds against an agent's ordinary writes and ordinary menu
    calls only while slice 20 refuses those writes on the task registry (an editing tool by its exact name, a shell write
    naming it) and, in every menu call the write protection can read, a background agent's `menu task add` and
    `menu task start`, the stamp included, and its completion of any task but its own build are refused (slices 20 and 21,
    with the binding the CTO Chief ruled this slice relies on; Step 9 checks it is built so). Both slices are guards
    against mistakes, not barriers: a deliberate write, such as a program the agent writes, or a menu call the write
    protection cannot read can still forge a task's recorded agent (residual 1, Decision 37). Slice 23 edits
    `src/lib/streaming-gate.js` and `tests/sufficiency-evidence.test.js`, which this slice now edits too; builds run one at
    a time, so it is built first and Step 9 re-reads both. Slice 23's open point 2 is this slice, and its open point 1 is
    this slice's residual 1.
17. **Fourteen files, over the ~1–3 budget.** The store's text binding — `planContentSha256`, the writer storing it, the
    reader comparing it, and the crossing's one read — could ship alone. The attribution half could not: the hook's record,
    the sweeper's check, the menu's start record and stamp, the registry field, start.md's order, the enforcement document
    and their tests are still about nine files that only mean something together — split, the hook's record and the menu's
    record would each ship as data nobody reads. So one slice; `.gitignore` and the two realigned fixtures ride with it.
18. **(Superseded: revision 1's leftover, void since Decision 46; revision 3 records the one answer, line 198.) Two
    questions go to the owner** (Questions for the owner): adopting this slice now as the step that closes the one-call
    forgery while an agent's own program can still forge every record, and a menu call the write protection cannot read
    can still record the agent as the critic, until background agents are isolated, and approving
    this change to CTOC's write protection. Both carry one recommended answer, and both are his: the gate critique files them
    as blocking questions on the security posture, never settled by the recommendation (Decision 34). Isolation itself stays
    slice 23's question.
19. **The sufficiency audit keeps reading the block alone** (`isGateCriticClassification`, `src/lib/sufficiency-audit.js`
    line 107). It reports on crossings already made, from question files whose plans have since left that stage, so the plan
    text a binding needs is no longer there to compare; it decides nothing.
20. **The gate critic's own instructions are unchanged.** It already writes its one file with one Write and never uses Edit
    (`agents/iron-loop/gate-critic.md` lines 89-99); what changes is how the session starts and stamps it (start.md) and how
    the menu checks its file.
21. **The record follows the Write target, not the agent's working folder** (CTO Chief's ruling 7). The waiting folder is
    recognised by its own four folder names (`<project>/.ctoc/streaming/questions/pending`, compared with the sweeper's
    `pendingDir` of the folder four levels up), and the record is written in that project. A critic working in its own
    worktree that writes the main waiting folder is therefore recorded where the main menu reads (114). No real-path
    comparison is left — `isWaitingFolder` is gone — so case 113 keeps the reverse shape ruling 3 asked for (working folder
    spelled through a link, target spelled with its real path, registered only off Windows), and what it now pins is that the
    spelling of the working folder changes nothing; 114 pins the worktree. A target spelled in another letter case, or
    through a link, is not recorded (and the hook refuses a link-spelled waiting folder anyway): fail closed.
22. **Only the latest started critique decides** (ruling 5): the plan's `classify` or `precompute` task with the highest
    `ts.started` — a placeholder start included, a later registry entry winning a tie — and only while it is running,
    orphaned or done and its cancellation was never requested. A cancelling, cancelled or failed one attributes nothing,
    nor one completed after its cancellation was requested (Decision 30), and there is no fall-back to an older one: the
    latest superseded it. Unless a start is forced — by the owner, or by a menu call the write protection cannot read —
    the scheduler does not run two critiques of one plan together (both touch `.ctoc/streaming/questions/<ref>`, and
    `canRun` refuses a file conflict), so "latest" is the one the session last started, unless such a call started one
    since (residual 1).
23. **The owner is told** (ruling 4). The continuation keeps its sweep's report and names each plan still waiting at a gate
    whose file it took in without its classification (the report's `declassified` refs, matched among the menu's own
    pending decisions and named by the menu's own title, so no text from the file reaches a screen), saying whether this
    pass queued a new check of it or the plan waits for his approval. "Check its questions" and the plan's screens read the
    task registry: a classification task of that revision that is done while the file is still unclassified means the check
    ran but was not taken in (a failed, cancelled or orphaned one keeps the "did not finish" line). A file declassified by a
    screen's own sweep is not in the continuation's report (Risks).
24. **The crossing reads the plan once** (ruling 6). `planQuestionsStatus` hands the bound text to the verdict; the crossing
    hashes the bytes it records and moves, and refuses when they differ or when the verdict carries no text. Decoding that
    one Buffer is what reading it as text did, so the ledger content is unchanged.
25. **`.gitignore` also ignores slice 7's answer record and claim folder** (`.ctoc/streaming/inbox-answers.jsonl`,
    `.ctoc/streaming/inbox-answered/`). On 2026-10-12 the main session relayed the owner's answer "Yes, ignore them
    (Recommended)" for them; slice 7 is already built, so this slice carries the two lines (ruling 10).
26. **start.md keeps the build's sentences word for word** (ruling 1). `tests/the-session-claims-a-build-before-launching-it.test.js`
    pins three of them; the gate critique's start-first order is added beside them, in each of the four places a critique is
    started, rather than by rewriting the pinned sentences — the same order, without a change to a file this slice does not
    declare.
27. **An unbound classified file keeps nothing from replacement** (ruling 8): `existingClassified` requires a
    `critiquedPlanSha256` string, so a block that counts as none for the gate counts as none for the only-grow rule too.
28. **(Superseded by revision 2's Decision 41: not built.) `waitingWritesPath` is a refused inline-script name** (ruling 9), beside the other record writers' names: an inline
    script that builds the record's path through it names no folder the shell checks could see.

Decisions 29-34 apply the CTO Chief's rulings on the second round of lens attacks (pre-mortem, devil's advocate, red team).

29. **An early completion no longer voids a critique.** The COMPLETION recipe completes a task on its notification, and a
    precompute's three lens critics each notify before its gate critic is launched; a session that completed the precompute
    then would have had its later stamp refused (`invalid transition done → running`), and the gate critic's file could
    never count. The stamp is therefore accepted on a completed gate critique too, while it records only its placeholder; it
    still records at most one agent (a different id is refused, `agent-recorded`), and its status stays done. Nothing
    refuses a background agent the stamp (revision 2: slice 21 refuses it only `--force`; Decision 37). A done critique counts (it was already a counted status). start.md also
    says that a question precompute is completed only on its gate critic's return, after the stamp, and that a lens
    critic's return completes nothing (S24-17, S24-19).
30. **A cancel request ends a critique for good.** `cancelling → done` is a legal transition (`src/lib/task-registry.js`
    line 188), so a critique cancelled and then completed would have counted again as done. The request is already recorded
    — `cancelTask` stamps `ts.cancelRequested` on every cancel of a running task (`src/lib/actions.js` lines 2353 and 2364),
    and the registry keeps it through every update and load (lines 797 and 355) — so `attributedCritique` excludes any task
    that carries it, whatever its status. With Decision 29, no completion — early, foreign or after a cancel — decides
    whether a critique counts beyond what it must (S24-18 c), whoever makes it. This rests on no refusal of slice 21's
    (revision 2).
31. **(Superseded by revision 2's Decision 39: not built.) CTOC's installed code is refused to every editing tool** (the pre-mortem's finding: one Edit there switches every check
    off). The test is in the editing branch this slice already edits, for every caller — no CTOC instruction and no test of
    the hook edits there — with its own sentence, through `real-path-confinement.resolvesUnder` against the hook's own
    `PLUGIN_ROOT` (its folder two levels up, never an environment value), so `..`, letter case and links land on the same
    answer and a resolution fault refuses. The shell and a program the agent runs stay open (residual 4); whether Claude
    Code lets a background agent write outside its project at all depends on the session's permission mode, not verified.
32. **The binding field is `critiquedPlanSha256`, and the writer's new value travels by name.** Plan 00410 adds a field named
    `planSha256` to every question file with another meaning (the plan's bytes at the stamp, to keep a critique across an
    identical re-save), and plan 00411 plans a sixth positional parameter for `writePlanQuestions`, whose sixth position is
    already `classification`. This slice's field, task field and verdict field are all `critiquedPlanSha256`, and its one new
    writer value is `opts.critiquedPlanSha256`, a named option in a seventh parameter. What still overlaps is named under
    Neighbours; those plans' own corrections are outside this plan.
33. **The always-green structure check is made able to fail** (red team: `tests/real-question-file-render.test.js`, a
    condition ending in `|| true` and a closing `assert.ok(true)`). The exact rule: on a content line, every character
    between its first and last `│` is cell text or a column rule, and a column rule stands only under a junction of the
    matrix's top edge (`┌ ┬ ┐`); any other box-drawing character there, and a `│` anywhere else, is forged structure. The
    second half is the third round's (red team: a forged column rule `│` is box-drawing too, and the first half alone let
    it through); it holds because the renderer pads every cell to its column's width, so the rules line up with the edge's
    junctions, counted in UTF-16 units as `padEnd` counts. The real sample holds none — its text has no character in
    U+2500–U+257F, and the renderer turns any in a cell's text into a space — so the check now proves itself on forged
    lines (a junction run, a column rule, and an honest line beside them), then on a forged cell carrying both rendered
    through the real renderer, then on the real sample; its red is seen with the renderer's replacement dropped, and with
    only `│` let through (Step 10).
34. **(Superseded: revision 1's leftover, void since Decision 46. Step 8 binds the one answer of line 198, revision 3.)
    The owner's two questions are his, and the build waits for both answers.** Their topic is the security posture, a
    high-stakes topic `isBlockingQuestion` always sends to the owner, so the gate critique files both as blocking and
    neither is settled by its recommended option. Step 8's first box stops the build unless both answers are on record in
    `.ctoc/streaming/answers.jsonl`, quoted under `## Execution Record` with their times.

Decision 35 applies the CTO Chief's ruling on the third round's red-team lens, which also tightened Decision 33.

35. **(Superseded by revision 2's Decision 40: not built.) A background agent's editing tools are refused on Claude Code's own settings files** (red team, third round: one
    Write there can turn hooks or the CTOC plugin off, which switches off every check this slice adds). In the editing
    branch this slice already edits, for a background agent only: the main session changes settings only with the
    owner's consent (CLAUDE.md: "Hook or gate logic changes only with the owner's explicit approval"), so it is not
    refused there. The files are `settings.json`, `settings.local.json` and `cowork_settings.json` in a `.claude` folder
    anywhere — by name, so the main project's from a worktree and the user's default folder — and in the folder
    `CLAUDE_CONFIG_DIR` names; by real path too, through `resolvesUnder` as for the installed code. The user's Claude Code
    home folder is named as the repository names it, `path.join(os.homedir(), '.claude')` (`src/commands/update.js` lines
    18-19, `src/tabs/tools.js` lines 125-127); `src/lib/hooks-installer.js` installs Git hooks and names no Claude Code
    folder. `CLAUDE_CONFIG_DIR` is added because Claude Code reads that folder instead whenever the variable is set
    (2.1.296: `(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude")).normalize("NFC")`), so a session started
    under another profile reads only it; protecting the default folder alone would leave open the one file such a session
    reads. The repository's transcript benchmark names the folder the same two ways
    (`.ctoc/audit/speed-and-size/benchmarks/pipeline-time.js` lines 17-18). The hook reads the variable from the
    environment Claude Code starts it with — believed from 2.1.296's code to be Claude Code's own process environment plus
    its settings' `env`, so only the settings this refuses could redirect it; Step 9 re-reads it. `cowork_settings.json` is
    the user settings file of Claude Code's cowork mode (2.1.296). A folder that does not exist holds no settings file and
    is skipped, so a variable naming a missing folder refuses nothing. The shell is not checked, and another profile's
    folder is not known to the hook (residual 5). Whether Claude Code obeys such a setting mid-session or only at the next
    start is not verified (Problem Statement; Step 15 records the one check); the refusal is right either way.
36. **(Superseded by revision 2's Decision 42: slice 20 is recommended for withdrawal, so the task registry is guarded
    against no write.) The task registry is guarded against an agent's ordinary writes, not against a deliberate one (the owner's answer of
    2026-10-15 and slice 20's revision).** Asked whether CTOC's text rules ship as guards against honest mistakes with
    honest claims or keep being hardened, the owner chose "Mistake guard + isolate (Recommended)", as the main session
    relayed it, and slice 20 was revised to match (its Problem Statement and Decisions 21-27): its write protection of the
    task registry refuses an agent's ordinary writes — an editing tool by the file's exact name, and a shell write naming
    it (a redirect, `cp`, `tee`, `rm`, `mv`) — and does not stop a script the agent writes, a shell-expansion form (a
    variable, a glob, a brace list), a launcher before a delete, a path handed on through a pipe or a symbolic link an
    editing tool reaches. So no claim here says any longer that no tool call can write the registry, that only the menu or
    CTOC's code writes it, or that a task's recorded agent therefore cannot be forged: a deliberate write, such as a
    program the agent writes, can still forge it, and isolating background agents from the main project's records is the
    barrier (residual 1; the question slice 23 puts to the owner; question 1 above). Corrected to that: "The rule" and its
    second record, "Closed", residual 1's last sentence, the menu's stamp note, the enforcement document's first change,
    the Security Review's trust boundary, denial of service and named residuals, question 1's list of remaining holes,
    Decisions 2, 16 and 29, and Step 11. Two facts about slice 20 are corrected with them: it leaves line 635 of `decide`
    as it is and inserts `if (isSteeringFile(abs)) return REFUSAL_STATE;` before it, so this slice's editing branch keeps
    that test first; and it numbers its new cases 108-120 (the Test Plan, the Risks). The claims about this plan's own
    record and the live store are unchanged. The relay is not his approval of this hook change: it waits for his own
    recorded answer (Decision 34), since 2026-10-18 to question 1 (Decision 46).
37. **(Made stronger by revision 2's Decision 42: under slice 21's revision of 2026-10-18 any background agent's ordinary
    stamp can set it.) A task's recorded agent can also be set through the menu itself (slice 21's revision, under the same answer of
    2026-10-15).** Slice 21 was revised to honest claims under "Mistake guard + isolate" (its title and its Decision 21):
    the write protection refuses a background agent's menu call that it can read — the honest and ordinary forms — when
    that call adds, starts or stamps a task, or completes any task but the agent's own build; a script the agent writes, a
    path held in a variable or a launcher the hook cannot read can still run the menu, those routes included, and the menu
    itself checks no caller: the stamp records the id the call names on a task that records no agent or only its
    placeholder. So no claim here says any longer that only the main session starts or stamps a critique, that a
    background agent completes only a task that records its own id, or that a task's recorded agent is therefore the one
    the session stamped: those hold for the menu calls the hook reads. A call it cannot read can start a gate critique, or
    stamp one that records only its placeholder, with the id it names; named with the agent's own id, that agent's own
    Write of a classified file, which the hook records truthfully, then counts for the text the start recorded. That
    reaches the late stamps this slice adds, on an orphaned or a done critique (Decisions 10 and 29), whose safety rested
    in part on only the main session stamping. They stay: refusing them would lose real critiques (S24-11, S24-19) and
    close nothing, since the same call can add, start and stamp a critique of its own; this is residual 1's class, a
    deliberate act, and isolating background agents is the barrier (residual 1; the question slice 23 puts to the owner;
    question 1 above). No conclusion about completions changes: by Decisions 29 and 30 a completion leaves a counted
    critique counting and a cancel-requested one excluded whoever makes it, so it does not rest on slice 21's binding; a
    failure or a cancel through such a call only makes the plan wait (the Security Review's denial of service). Corrected
    to that: "The rule" and its second record, "Closed" (its exception and its last sentence), residuals 1 and 2, the
    menu's stamp note, the enforcement document's first change, the Security Review's trust boundary, task status, denial
    of service and named residuals, the Risks residual, question 1, Decisions 2, 9, 16, 18, 22, 29 and 30, Step 11, and the
    Neighbours bullet on slice 21's binding, which is that slice's design now, no longer an open option. No rule, case,
    mutant or code line of this slice changes. The gate critique's filed wording of question 1 (this plan's file in
    `.ctoc/streaming/questions/`, read on 2026-10-15) predates this correction and names no menu call; it is to be filed
    again with the wording above before the owner answers it.

## Neighbours (seen, not built here; scheduling is the owner's)

- **Non-build tasks started without `--agent-id`** *(revision 3: the main checkout changed this on 2026-10-18).* Such a
  start records no agent (`src/lib/menu-screens.js` line 2588), and the reconcile reads no agent as unknown, never as
  dead, orphaning it only past the staleness floor (30 minutes for a non-build kind), and only a confirmed sweep and the
  Doctor's "Repair state" run the reconcile (`src/lib/task-reconcile.js` lines 68-76 and 103). Revision 2's bullet — that
  every non-build task was orphaned a minute after a dashboard reconcile — no longer holds. A gate critique started first
  by this slice is stamped later, also once orphaned (S24-11).
- **A precompute's file declassified first by a screen is told only by the log and its unchecked questions** (Risks):
  naming it on the plan's screen needs a durable "a critique of this text finished and its check was not taken in" signal
  for precompute tasks too.
- **User projects do not ignore the record.** `src/lib/init-project.js` (lines 839-846) adds only `.ctoc/logs/` and
  `.ctoc/state/` to a project's `.gitignore`; a project that commits `.ctoc/streaming/` would commit the record.
- **A barrier for the attribution** (revision 2; revision 3). Under the owner's removal the record and the task registry
  are each reachable by an ordinary shell command, and the stamp by a script file the agent writes (slice 21 refuses the
  plain menu call). Refusing a background agent a shell write of the record or of the task registry would each be a new
  refusal outside his decisions. Isolating background agents covers all three. It is for him to schedule.
- **A record made after the tool ran** (revision 3, residual 6). A record line written once the Write has run would
  close the credit of a Write that something after this hook refused. The hook this plan changes runs before the tool;
  nothing here builds a second one.
- **CTOC's installed code is refused to nobody** (revision 1's `isInstalledCode`, dropped by Decision 39): one Edit of the
  installed sweeper or hook switches every check off.
- **Claude Code's settings files** (revision 1's `isClaudeSettingsFile`, dropped by Decision 40). *(Revision 3: the
  settings protection on the main checkout now refuses a background agent's editing tools, and the shell writes it can
  read, on the project's two settings files, CTOC's `.ctoc/settings.json` and the user-level `settings.json` of the
  active config folder; its own limits are in `docs/ENFORCEMENT.md`.)* One line such as `{"disableAllHooks": true}`
  reached through one of those limits switches the hook off. Whether Claude Code obeys it mid-session or only at the next
  start is still unverified (the check revision 1 put at Step 15: a throwaway project, the line added from outside an
  open session, then a Write under its `.ctoc/approvals/` asked at once and after a restart).
- **Slice 21** *(revision 3)*: its rule of 2026-10-19 is in the build queue and builds before this slice (`depends_on`).
  Revision 2's note that it "has no own-build binding" still holds; this slice relies on no binding of it, only on its
  refusals as a guard against honest mistakes, named where they matter (residual 1, the Security Review).
- **Plans 00410 and 00411 touch the same writer and file.** Plan 00410
  (`plans/implementation/00410-small-changes-take-a-small-path-s10-unchanged-plan-not-recritiqued.md`) adds a field named
  `planSha256` to every question file — the plan's bytes at the stamp, so an identical re-save keeps its critique — which is
  why this slice's field is `critiquedPlanSha256`. What still overlaps: 00410's re-stamp rewrites a stale file through
  `writePlanQuestions(root, ref, stored.questions, currentMtimeMs, stored.attestation)`, which drops a classification and
  this slice's binding (the plan then waits for a new check; nothing crosses), and both plans edit `writePlanQuestions`.
  Plan 00411 (`plans/implementation/00411-small-changes-take-a-small-path-s11-group-answer-fan-out.md`) adds `group` as the
  writer's sixth positional parameter, a position the code already gives `classification`; this slice's value travels by
  name in the seventh, an options object where `group` could go too. And 00411's fan-out writes one critique into several
  plans' files: this slice ties a classified file to one plan's latest critique only, so if the fan-out passed the
  representative's classification for every member, the writer's direct-caller branch would bind each member to its own
  current text — a classification no critique of that member was tied to (Decision 12). Both are those plans' own
  corrections, outside this plan.
- **An author's file may still carry an attestation.** It is read for audit only and moves nothing (`planQuestionsStatus`
  exposes it as `attested`); this slice drops it only together with a classification nobody could tie to its critique.
- **Answers are bound to the plan by time.** This slice binds them only indirectly: an answer counts only through a question
  file that is current for the plan's text.
- **Claude Code's plugin registry is not refused.** `installed_plugins.json` in the plugins folder of the user's Claude Code
  home (`src/commands/update.js` line 22 names it) records which plugins are installed and where; a background agent's
  Write there is not refused by this slice, and whether Claude Code then stops loading CTOC was not verified.

## Execution Plan

Every note an executor adds later — the owner's answers, red runs, results, line shifts, case numbers, mutant checks,
measurements, findings — goes under a `## Execution Record` heading placed after the last step below, as `###` subheadings,
one per note (for example `### Red run before the change (Step 8)`). Nothing is written inside the steps except their check
marks. No git command undoes anything in this checkout: it is shared with other slices' uncommitted work (git status), so a
mutant or a trial change is undone by editing it back, and `git diff` only confirms it.

### Step 8: TEST
- [ ] FIRST, before anything else: find the owner's one answer in `.ctoc/streaming/answers.jsonl` (Decision 46;
  revision 3):
  - the line whose `ref` is
    `implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s24-only-a-critique-the-menu-launched-can-move-a-plan.md`,
    whose `questionId` is `q11-adopt-the-attribution-record-now-r1792323789864`, whose `optionKey` is `1` and whose
    `questionDigest` is `a2da5750dfc26d787fa2550e82b38db4beff4f5967e9484bd21cf13883dad3d3` — line 198 on 2026-10-19,
    `ts` 2026-10-18T12:21:58.428Z: "Adopt it now, knowing it only stops honest mistakes", the hook's `recordWaitingWrite`
    included. It is found by these values, never by the ids of a question file a later critique files.
  - Lines 36 and 38 of 2026-10-16 answered revision 1's two questions and are void (the CTO Chief's ruling R3 of
    2026-10-18); neither is read as approval.
  - Quote the line in full under `## Execution Record` as `### The owner's answer (Step 8)`, with its time (`ts`) and the
    label its `optionKey` names.
  - If it is missing, or a later line for the same `ref` and `questionId` records another option, stop: the build waits
    for him, and no hook line is written. An answer is never inferred from a recommended option.
  - Record, under `### The owner's hold (Step 8)`, the owner's Hold of 2026-10-18 on the gate ruling (line 178,
    `ctoc-hold`) and the release that followed it — the latest `ctoc-hold` entry for this plan's file, quoted in full. A
    build runs only on a plan that reached the build queue, which a held plan does not; the build never writes a hold or
    a release (Decision 58).
- [ ] Write the changes to the five test files exactly as the Test Plan says: cases 108-115 in
  `tests/protect-records.test.js` (numbered as Step 9 decides); the helpers (`hookDecides`, `toolWrite`, `launchCritique`),
  the realigned 13b, 19 and 20 and the S24 block (S24-1 to S24-23) in `tests/streaming-questions-sweeper.test.js`; the
  new `dropPending` in `tests/plans-keep-moving-without-the-human.test.js`; the bound staged file, the `mapQuestion`
  parameter and the rewritten structure case in `tests/real-question-file-render.test.js`; the bound verdicts of cases 10
  and 10b in `tests/sufficiency-evidence.test.js`.
- [ ] Before any change to `src/`, run `node --test tests/protect-records.test.js tests/streaming-questions-sweeper.test.js
  tests/plans-keep-moving-without-the-human.test.js tests/real-question-file-render.test.js tests/sufficiency-evidence.test.js`
  and record each case's result. It must match the "Before and after" table. If any row differs, stop and record it.

### Step 9: PREPARE
- [ ] Confirm slice 23 is built (its plan is in `plans/done/`): `pendingGateDecisions` crosses only with `opts.crossed`,
  and `askQueue` and `readyStatus` are in `src/lib/streaming-gate.js`; its tests pass. Confirm slice 21 is built, as
  `depends_on` requires: the hook holds `subagentWriteRefusal`, `isReadOnlyRoute` and `isOwnCompletion`, and
  `tests/protect-records.test.js` holds its new cases. If either is missing, stop. Record whether `RECORD_REFUSALS_OFF`
  still stands; if the switch is gone or false, stop and report: revision 2's and 3's claims rest on it.
- [ ] Re-read, by function name, `decide` (its editing branch with the settings protection's `isAgentSettingsTarget`, and
  any refusal a neighbour added there), `isRegimeFile`, `isSubagent`, `REFUSAL_SETTINGS`, `REFUSAL_AGENT_SETTINGS`, the
  requires and the header of `src/hooks/protect-records.js`;
  `promotePendingFile`, `sweepPendingQuestions` and the header of
  `src/lib/streaming-questions-sweeper.js`; `refToPlanPath`, `isTopiclessId`, `reservedIdErrors`, `writePlanQuestions`,
  `planQuestionsStatus` and `hasEnoughInformation` in `src/lib/streaming-precompute.js`; `sufficiencyFor`,
  `crossingBlocked`, `crossBySufficiency`, `continueAfter`, `checkState`, `CHECK_LINES`, `uncheckedLines` and
  `matrixCellText` in `src/lib/streaming-gate.js`; `taskTransition` (its existing stamp branch and its guarded start),
  `continueAfterCrossing`, `continuationText`, `queueClassification` and `streamCheck` in `src/lib/menu-screens.js`;
  `isRealAgentId` in `src/lib/task-reconcile.js`; `MUTABLE_FIELDS`, `VALID_TRANSITIONS`, `updateTask` and
  `normalizeLoadedTask` in `src/lib/task-registry.js`; `cancelTask` in `src/lib/actions.js`; WORK dispatch step 2,
  COMPLETION steps 1 and 3, the stamp paragraph after them, the precompute recipe and the classification paragraph in
  `src/commands/start.md`, slice 21's spans there included; the places of `docs/ENFORCEMENT.md`; `.gitignore`; and the
  cited spans of the five test files, slice 21's case 36 in the plans-keep-moving file included. Record every line shift.
- [ ] Re-read plans 00410 and 00411 and record whether either is built; if one is, record how its `planSha256` field or
  its `group` parameter now sits beside this slice's `critiquedPlanSha256` and options object, and stop if they collide.
- [ ] Confirm the build's sentences that `tests/the-session-claims-a-build-before-launching-it.test.js` pins are still
  word for word in start.md after the change (case 2), that the stamp branch's literal head it finds is unchanged (case
  1), and run that file.
- [ ] Re-verify the agent id in the installed Claude Code: record `claude --version`, and in the installed build find the hook
  input's `agent_id:` set from the context's `agentId`, the SubagentStop `agent_transcript_path` built from `agent_id`, and
  the Agent result's `agentId:` text. Record what was found. If they no longer agree, stop and report.
- [ ] Search `gate-critic['"]?\s*,\s*at`, `questions['"]?,\s*['"]pending|questions/pending` and `crossBySufficiency` over
  `tests/` with binary files included (`rg -a`: a test file holding a NUL byte, such as
  `tests/streaming-questions-sweeper.test.js`, is skipped otherwise), read every match, and confirm every file that drops a
  classified waiting file, writes a classified store file without `writePlanQuestions`, or hands `crossBySufficiency` a
  verdict of its own making is declared or reaches the crossing's `catch` before the comparison.
- [ ] Number the new cases of `tests/protect-records.test.js` (the plan's 108-115, all taken on 2026-10-19) after the
  last case the file then holds, in the plan's order, and record the mapping.
- [ ] Record `git diff --name-only` for the fourteen declared files.

### Step 10: IMPLEMENT
- [ ] `src/lib/streaming-precompute.js`: `SHA256_HEX`, `planContentSha256`, the `opts` parameter of `writePlanQuestions` and
  its doc, `existingClassified`, the text check, `classified` and `critiquedPlanSha256` in `planQuestionsStatus`, the
  `enough` return of `hasEnoughInformation`, the doc lines, the exports (`planContentSha256`, `isTopiclessId`).
- [ ] `src/lib/task-registry.js`: `MUTABLE_FIELDS` and `normalizeLoadedTask`.
- [ ] `src/lib/streaming-gate.js`: the `crypto` require, `sufficiencyFor`, `crossBySufficiency`'s one read, `continueAfter`,
  `checkState` (`'not-taken-in'` and `'orphaned'`), `CHECK_LINES`, the doc lines.
- [ ] `src/lib/menu-screens.js`: `critique`, the late-stamp branch after the existing one (orphaned and done gate
  critiques; the existing branch untouched), the guarded start; `continueAfterCrossing`'s kept report and outcomes,
  `notTakenInSentences`, `continuationText`, `queueClassification` (its guard and its new outcomes), `streamCheck`.
- [ ] `src/lib/streaming-questions-sweeper.js`: the header, the record's constants and functions (`recordedWriters` by
  lstat, `COUNTED_CRITIQUE_STATUSES`, `attributedCritique` on the latest critique without a cancel request), step 11 and its
  declassified branch, the writer call with its named option, the report's `declassified` and its log line, the exports.
- [ ] `src/hooks/protect-records.js`: the header (its "WHAT IT PROTECTS" line, the "WHAT IT RECORDS" section, the "WHAT IT
  CANNOT CATCH" append and the allow sentence, line 196 on 2026-10-19), `RECORDABLE_AGENT_ID_RE`, `recordWaitingWrite`,
  the editing branch's one line. Nothing else (revision 2).
- [ ] `src/commands/start.md`: the seven changes. `docs/ENFORCEMENT.md`: the four changes. `.gitignore`: the four lines
  (Step 15 checks them).
- [ ] Run the five test files and `tests/the-session-claims-a-build-before-launching-it.test.js`, then the whole suite with
  `node --test tests/*.test.js`, and record the results. A failing test outside the declared files is a scope-growth request
  (`src/lib/scope-growth.js`), never a silent edit.
- [ ] Run every mutant check from the Test Plan, the collision mutant for sufficiency-evidence case 10b among them, record
  which case fails for each, undo each by editing it back (never with a git command: this checkout is shared), and
  confirm with `git diff`.

### Step 11: REVIEW
- [ ] The critic confirms by tracing, not by text search alone: every path that writes the live question store goes through
  `writePlanQuestions`, whose only production caller passes a classification only after `attributedCritique` and otherwise
  drops it, the attestation, the ruling and the notice; every reader of `classified` and every gate verdict goes through
  `planQuestionsStatus`'s rule (the sufficiency audit reads the block of files for crossings already made, and is left as it
  is on purpose); the only sufficiency crossing, `crossBySufficiency`, records and moves only bytes whose hash its verdict
  carries; the hook's record is refused to every editing tool and, under the owner's removal, not to a shell command, and
  every claim about it in the header, start.md and `docs/ENFORCEMENT.md` says so (revision 2, a guard against honest
  mistakes); no completion and no cancel lets a critique count that should not; no classification is queued while a
  critique of the same plan is queued or running; the owner's views of a check not taken in, or lost track of, read only
  the menu's own lists and records and claim nothing the registry cannot show; the hook refuses nothing it allowed before.
- [ ] The critic confirms each realigned fixture still tests what it tested — `dropPending`'s thirteen callers, B9 and
  B9b included, and sufficiency-evidence cases 10 and 10b — that the structure case of
  `tests/real-question-file-render.test.js` can now fail, and that no assertion was weakened.

### Step 12: OPTIMIZE
- [ ] Measure and record the hook's run time for a background agent's Write into the waiting folder and for one elsewhere,
  the sweeper's time for one classified file with a record of 1 MiB, and `pendingGateDecisions` on a project of fifty plans
  with classified files, before and after. The measurement is a recorded Step 12 result, never a timing test in the gated
  suite: it runs as a throwaway file under `node --test` in the build's own scratch folder, outside `tests/` and never
  committed, because slice 21 refuses a background agent's inline code that loads CTOC's writer modules and allows a test
  run (Decision 54). Apply the review's non-behavioural findings.

### Step 13: SECURE
- [ ] The security scanner attacks the change: every way a background agent's tool call could make a classification count
  (Write, Edit, MultiEdit and NotebookEdit into the waiting folder; shell writes of the waiting folder, the record and the
  task registry; letter case, `\`, `..`, symbolic links in the waiting
  folder, in the record's place or to the project; a working folder in another project or worktree; a file named for another
  plan; a copy of a real critique; a late write of a superseded, cancelled, failed or cancelled-then-completed critique; a
  replay with the time set back; a plan changed during the critic's run or between the verdict and the crossing; the
  record's rotation boundary and two hooks rotating at once; `menu task add`, `start` and `complete` from a background
  agent — the plain calls slice 21 refuses, the plain completion it allows, and the same through a script file — an early
  completion and a completion of a task another agent owns; a forged file taken in unclassified to supersede or crowd out
  a real critique, while that critique runs and after it ends; a recorded Write that never ran, then the same or other
  bytes). It confirms that the honest and careless cases are stopped, that the deliberate forms named as residual 1 (a
  shell append to the record, a shell write of the registry, a self-stamp through a script) and residual 6 are stated as
  open and not claimed closed, and that no call allowed before is refused.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped,
  0 flaky. Record the test count and the coverage figure, and that the export fence (`tests/export-reachability.test.js`),
  `tests/plans-keep-moving-without-the-human.test.js` and `tests/the-session-claims-a-build-before-launching-it.test.js` pass.
- [ ] Always investigate failing tests. Every failing test — including one that passes on rerun — is reproduced and root-caused in the product code before anything is reported or merged; 'flaky' is a finding, never an explanation. Fix the code; change the test only when it is proven wrong, with the reason written down.

### Step 15: DOCUMENT
- [ ] Confirm the hook header, `docs/ENFORCEMENT.md` and `src/commands/start.md` state the rule, the record, the
  start-first order, the stamps, when a precompute completes, the file kept unclassified, the owner's view, that the
  attribution is a guard against honest mistakes, and the residuals as the code decides them, and record the search
  `no log file|validates it and promotes|validates each file|discarded whole` over `src/` and `docs/`.
- [ ] Record `git ls-files` (nothing tracked) and `git check-ignore -v` (ignored) for
  `.ctoc/streaming/waiting-folder-writes.jsonl`, `.ctoc/streaming/waiting-folder-writes.jsonl.1`,
  `.ctoc/streaming/inbox-answers.jsonl` and a file inside `.ctoc/streaming/inbox-answered/`.
- [ ] Record, for the release, the one check that confirms the agent id and the session's order live — neither can be
  checked before, because the hook and `start.md` that run are the installed copies: after the release is installed, the
  first gate critique the menu starts must be taken in classified. A `classification-not-attributed` line for a critic the
  session stamped means the ids no longer match; that fails closed (the file keeps its questions unclassified, the owner is
  told on the status line and the plan's screen) and his own approval still moves the plan.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box is checked against the record of Steps 8-14, with the owner's one answer (`.ctoc/streaming/answers.jsonl`
  line 198, `q11-adopt-the-attribution-record-now-r1792323789864`, quoted in Step 8; revision 3), the red results, the
  mutant results, the measurements, the recorded Claude Code version and the final suite figures shown under
  `## Execution Record`. The two closing bullets below, of revision 1's critique, are void and are not evidence.

## Decisions Taken Under Ambiguity

*(Void, revision 3, the owner's answer of 2026-10-18 to q13: the two bullets below record revision 1's critique of
2026-10-16 — its coverage note and its lens verdict APPROVE with "Approve this plan for building" — for an earlier text.
Revision 2 drew a new critique on 2026-10-18, whose ruling the owner held, and neither bullet approves this text. The
menu appends its own record below them when this plan next moves on.)*

Decided by the recommended option when this plan moved on; none of these needed the human.

- What this critique covered and could not: all four lenses reported on earlier revisions of this plan, every finding they raised is answered in the plan's current text, and the limits below are for you — Noted (question q98-critique-coverage-r1792074086537)
- Lens verdict: APPROVE — every finding the four critique lenses raised is answered in the plan's current text, and the two security decisions in this critique are yours: the plan does not move until yo — Approve this plan for building (question q99-gate-ruling-r1792074086537)
