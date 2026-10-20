---
title: "The classification brief for the gate critic carries the plan file modification time"
created: "2026-10-20T13:37:49.348Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 8
risk_level: MEDIUM
files:
  - src/lib/menu-screens.js
  - src/commands/start.md
  - tests/the-classification-brief-carries-the-plan-time.test.js
  # RATCHET FILES — not counted toward the work surface: this plan CREATES a test file, which
  # moves the test-file count in CLAUDE.md ("Run all N test files", "tests/  N test files")
  # and in README.md's structure block ("tests/           N test files").
  - CLAUDE.md
  - README.md
---

# The classification brief for the gate critic carries the plan file modification time

## Problem Statement
Nothing hands the gate critic the plan file's modification time when it is launched to classify a plan's questions. So, reportedly, it stamps its classification with the time it can find, the author's revision stamp, and after a later plan edit the classification is refused as out of date. The coordinator session that launches the gate critic is left with a plan that cannot move on without the owner's approval, or a classification it has to re-run by hand. That is the off-menu work the vision "CTOC is built with CTOC, and every friction found while building it becomes a plan" exists to remove.

Evidence, labelled as in the vision:
- **read in this pass:**
  - `agents/iron-loop/gate-critic.md:37` says the dispatcher supplies `planMtimeMs`. `:94` writes it into the pending file "digits copied character for character", and `:98` says a stamp older than the plan's current modification time is refused as superseded.
  - The classify paragraph of `src/commands/start.md` (`:380-391`) gives the brief only the task id, the plan path and "classify the questions of `{ref}`". It also has the session launch the gate critic *before* `menu task start` (`:385`), so nothing the task start returns can reach the brief.
  - The task the menu hands the session to launch carries only `id`, `kind`, `plan`, `touches` and `gitOp` (`computePromote`, `src/lib/menu-screens.js:2391-2406`).
  - The classify task's label is the question file's stamp rounded down to the whole millisecond (`queueClassification`, `src/lib/menu-screens.js:3000-3011`).
- **read in this pass, the check that refuses:** the sweeper refuses as `superseded` any payload whose `planMtimeMs` is strictly below the plan's current modification time. It compares at full precision and accepts a payload that carries no stamp at all (`src/lib/streaming-questions-sweeper.js:188-192`). It always stamps the live file with the plan's current time (`:215-217`).
- **reported, not re-checked:** on 2026-10-20 the gate critic reused the author's revision stamp, and its classification was refused after a later plan edit.
  - I searched for that refusal with the pattern `superseded` in the four sweeper logs that exist: the main checkout's `.ctoc/logs/streaming-sweeper.jsonl` and those of the agent worktrees `agent-a01f296ce9da6d4b6`, `agent-a92caf11a57443f01` and `agent-aadfde140804ea5df`. This worktree has no sweeper log.
  - Result: one line, dated 2026-10-11, in the main checkout, and nothing from 2026-10-20.
  - The plan therefore starts by reproducing the refusal by construction (the scenario "Reproduce the reported refusal"), not from a log.

## Business Alignment

**Job to Be Done:** When the menu hands me a plan's question classification to launch, I want the gate critic's brief to carry the plan file's modification time, so I can launch the classification once and have it accepted, without re-running it by hand after a plan edit.

**Impact Map:**
- **Goal:** Every plan move the maintainers need is a menu route with usable output. This is the decomposition's first goal, traced to the vision's problem: frictions that pushed the coordinator off the menu.
- **Actor:** the coordinator session (the CTO Chief) that launches the gate critic for a promoted classify task, and the gate critic it launches. Both are named in the vision's target users ("the CTO Chief and background agents that work for him … the critics").
- **Impact:** the coordinator launches a classification once and it lands, or it is refused only when the plan really changed after the critic was handed its time. No classification is re-run by hand, and no `node -e` call reads the plan's time.
- **Deliverable:** the plan file's modification time in the classify task the menu hands over and in the gate critic's brief, proven by tests that drive the real continuation, the real "Check its questions" route and the real sweep.

**Alignment checks:**
1. The goal traces to the vision's problem statement: YES. "Gate critics lack the plan file time" is one of its ten frictions, verbatim.
2. The actor is in the vision's target users: YES.
3. The impact is observable: YES. A classification is accepted or refused, and the plan's gate screen shows which.
4. The deliverable covers one functional area, the classification hand-over: YES.

**Overlap check:**
- I listed the sibling plans with the pattern `plans/functional/ctoc-is-built-with-ctoc-*.md`: 10 files, all of them still stubs.
- I searched `plans/` for the patterns "classify the questions of", "promoted `classify`" and "classify task". Four files matched: this stub, the vision, the decomposition, and the finished plan "ctoc-keeps-working-and-asks-only-what-matters-s2-plans-cross-on-their-evidence", which added the classify paragraph.
- No sibling describes the same behaviour.

## User Stories

**As the** gate critic, **I want** the classification brief to carry the plan file's modification time, **so that** my stamp matches the plan I read and is not refused as superseded.
- INVEST:
  - Independent: yes.
  - Negotiable: yes. It names the outcome, a time in the hand-over and the brief, not how the time is read.
  - Valuable: yes. Without it, every classification after a plan edit is refused.
  - Estimable: yes.
  - Small: yes. It is one field in the hand-over and one line in the brief.
  - Testable: yes, the five scenarios under its story heading in Acceptance Criteria.

**As the** coordinator, **I want** a classification made after a plan edit to be accepted when it carries the new modification time, and refused when it carries the old one, **so that** the out-of-date refusal fires only when it should.
- INVEST:
  - Independent: qualified pass. Its end-to-end scenario needs the first story's time in the hand-over. Its two refusal scenarios run on the sweep alone and already pass today: they reproduce and pin existing behaviour. The decomposition's "passes all six" is narrowed here.
  - Negotiable: yes.
  - Valuable: yes.
  - Estimable: yes.
  - Small: yes.
  - Testable: yes, the three scenarios under its story heading in Acceptance Criteria.

## Decomposition

Source: `plans/decomposition/ctoc-is-built-with-ctoc.md`. Stories marked `[MVP]` are the smallest end-to-end version; there are no remaining stories in this plan, and no phase or schedule (the owner alone chooses what is built and when).

### Vision item carried
- "Gate critics lack the plan file time."

### Goal: Every plan move the maintainers need is a menu route with usable output
- **Actor:** the owner and the CTO Chief, coordinator session and background agents that build CTOC through its menu; after them, every CTOC user on the same routes.
- **Impact:** the coordinator moves plans through the menu without `node -e` calls into `src/lib/actions` or scratch scripts.
- **Success metric:** this plan has a test that drives the real brief and the real out-of-date check, and no classification has to be re-run by hand after a plan edit.

### Activities
1. Promote a classify task and build its brief.
2. The gate critic classifies, and its result is accepted.

### Stories
- [ ] `[MVP]` As the gate critic, I want the classification brief to carry the plan file's modification time, so that my stamp matches the plan I read and is not refused as superseded.
  - Acceptance: the brief built for a promoted `classify` task names the task id, the plan path, "classify the questions of `{ref}`" and `planMtimeMs`, as `agents/iron-loop/gate-critic.md` requires.
  - INVEST: passes all six criteria.
- [ ] `[MVP]` As the coordinator, I want a classification made after a plan edit to be accepted when it carries the new modification time, and refused when it carries the old one, so that the out-of-date refusal fires only when it should.
  - Acceptance: edit the plan, run the classification with the fresh time: accepted; replay it with the old time: refused as superseded.
  - INVEST: passes all six criteria.

### Dependencies
- Story level: the accept-and-refuse story depends on the brief carrying the modification time.
- Plan level: none.
- Shared file (a scheduling concern, not a dependency): `src/commands/start.md` with the existing slice "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect" (`plans/implementation/00412-small-changes-take-a-small-path-s12-critique-queue-and-four-lenses.md`); the two must not edit that file at the same time.

## Acceptance Criteria

Story: the gate critic's brief carries the plan file's modification time.

- [ ] **Scenario: The continuation hands over a classify task with the plan's time**
  Given a plan at a gate whose question file was written by its author, is current, and has not been checked by the gate critic
  When the coordinator runs a continuation (`menu task complete <id> --continue`, `stream answer` or `stream approve`) and the menu returns the classify task to launch
  Then the returned task names the plan and carries the plan file's modification time
  And that time equals, at full precision and with any fraction of a millisecond, the time the operating system reports for the plan file when the list is built

- [ ] **Scenario: "Check its questions" hands over the same time**
  Given the same plan, with no classify task yet recorded for its current question file
  When the human chooses "Check its questions" (`stream check <ref>`)
  Then the classify task it returns to launch carries the plan file's modification time at full precision, exactly as the continuation does

- [ ] **Scenario: The gate critic's brief names the time it was handed**
  Given the session's dispatch instructions for a promoted classify task (the classify paragraph of `src/commands/start.md`)
  When the coordinator composes the gate critic's brief from them
  Then the instructions list the task id, the plan path, "classify the questions of `{ref}`" and `planMtimeMs`
  And they name the handed-over task as the only source of that time, copied digit for digit
  And they require no `node -e` call or other by-hand read to obtain it

- [ ] **Scenario: A time with a fraction of a millisecond survives the round trip (boundary)**
  Given an unedited plan whose modification time has a fraction of a millisecond, and a classify task handed over for it
  When the gate critic's classification carries the handed-over time, copied digit for digit, and the next continuation sweeps it in
  Then the classification is accepted, and the plan's gate screen no longer says that the gate critic's check of its questions is not done
  And the same classification carrying that time rounded down to the whole millisecond (the classify task's label value) is refused as superseded

- [ ] **Scenario: An unreadable plan time is never invented (error)**
  Given a classify task whose plan file cannot be read when the menu builds the list of tasks to launch
  When the coordinator runs a continuation
  Then the continuation completes and returns every other task unchanged
  And the classify task's time is stated as not available, never as a guessed, rounded or zero value

Story: a classification after a plan edit is accepted with the new time and refused with the old one.

- [ ] **Scenario: Reproduce the reported refusal, with the author's stamp after an edit (error)**
  Given a plan whose author's question file was written when the plan's time was A, and the plan was then edited so that its time is B, later than A
  When a gate-critic classification stamped A (the author's stamp, as reused on 2026-10-20) is swept in
  Then it is refused as superseded, and the plan does not move on by itself
  And its gate screen still offers "Generate its questions"
  And the discard log of the waiting folder (`.ctoc/logs/streaming-sweeper.jsonl`) gains one line with the reason `superseded`

- [ ] **Scenario: After an edit, the classification carrying the handed-over time is accepted (happy path, end to end)**
  Given a classify task recorded for question revision A, and the plan edited to time B before the task is launched
  When the menu hands the task over, and the gate critic's classification carries the time it was handed and is swept in
  Then the handed-over time is B, and the classification is accepted
  And the plan's gate screen offers neither "Generate its questions" nor the line saying that the gate critic's check of its questions is not done

- [ ] **Scenario: An edit after the classification was stamped is still refused (edge)**
  Given a gate-critic classification stamped with the plan's time B at the moment it was written
  When the plan is edited to time C before that classification is swept in
  Then the classification carrying B is refused as superseded, and the plan stays waiting for the owner's approval

Which scenarios fail first:
- Fail before the change: the five scenarios of the first story, and "After an edit, the classification carrying the handed-over time is accepted".
- Already pass: "Reproduce the reported refusal" and "An edit after the classification was stamped is still refused". They reproduce and pin the sweep's existing refusal, and their setup needs nothing this plan adds.
- A test of either of those two that is green on its first run is the expected result, not a weakened test.

## Scope

### In Scope
- The plan file's modification time, at full precision, in the classify task the menu hands over on both routes: the continuation and "Check its questions". This is covered by the scenarios "The continuation hands over a classify task with the plan's time", "Check its questions hands over the same time" and "An unreadable plan time is never invented".
- The classify paragraph of `src/commands/start.md`, so the gate critic's brief lists that time and names the hand-over as its source. This is covered by the scenario "The gate critic's brief names the time it was handed".
- Tests that drive the real continuation, the real `stream check` route and the real sweep. These are the scenarios "A time with a fraction of a millisecond survives the round trip", "Reproduce the reported refusal", "After an edit, the classification carrying the handed-over time is accepted" and "An edit after the classification was stamped is still refused". "Reproduce the reported refusal" is the reproduction the vision asks for.

### Out of Scope
- The four-lens critique briefs and the synthesis brief. They belong to the slice "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect" (`plans/implementation/00412-small-changes-take-a-small-path-s12-critique-queue-and-four-lenses.md`). That slice also edits `src/commands/start.md`, so the two edits must not run at the same time. This plan edits only the classify paragraph.
- Any change to `agents/iron-loop/gate-critic.md`, which this plan does not need.
  - It already requires the time from the brief (`:37`, `:94`, `:98`).
  - Its wording is held by `tests/compaction-eval/gate-critic/rule-inventory.json`.
- Any change to the sweeper's or the question store's rules, including the acceptance of a payload with no stamp and the rule that a classified file may only grow within one revision. These rules decide what reaches the owner, and the vision excludes gate-logic changes without his explicit approval.
- A finding outside this plan's goal, listed for the owner to schedule:
  - After a plan edit, the rule that a classification must keep every author question does not run. The store compares only against a file of the same revision (`existingFor` and `writePlanQuestions`, `src/lib/streaming-precompute.js:566-574` and `:654-664`).
  - Today a classification after an edit usually carries the author's stamp and is refused. After this plan it is accepted. So the path on which no code checks that the author's questions were kept becomes the normal outcome after an edit, not an edge case reached only by a classification with no stamp.
  - Why the added exposure is small: within one revision, the classifier already decides by topic which questions reach the owner. With a classification present, only blocking-topic questions go to him (`goesToHuman`, `src/lib/streaming-precompute.js:944-946`). A classifier that wanted to keep a question from him can already do so without dropping it.

## Risks

### Technical Risks
- **The handed-over time is rounded.** If the hand-over carries the task label (`revision-<whole millisecond>`) or a rounded value, every classification on a plan whose time has a fraction of a millisecond is refused, because the sweep compares at full precision.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test the scenario "A time with a fraction of a millisecond survives the round trip" on a fixture whose time has a fraction. First assert that the filesystem kept the fraction, and fail loudly if it did not.
- **The time is read too late to reach the brief.** The session launches the gate critic before `menu task start` (`src/commands/start.md:385`), so a time returned only by the task start never reaches the brief.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: In the two hand-over scenarios, assert that the time is in the task returned by the continuation and by `stream check`, before any task start.
- **Tests that pin the handed-over task's exact fields break when a field is added.**
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Review every test that asserts a handed-over task's fields. Update only to the new, stricter shape, and write down the reason.
- **The classify paragraph is the recipe that the instruction fence requires for the `classify` task kind.** The finished plan "ctoc-keeps-working-and-asks-only-what-matters-s2-plans-cross-on-their-evidence" records this in its decision on adding the classify paragraph to `src/commands/start.md`, and `tests/unexecutable-instruction-fence.test.js` enforces it. An edit could drop the recipe.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Run `tests/unexecutable-instruction-fence.test.js` after the edit. Keep the `menu task add classify` recipe line word for word.

### Business Risks
- **A classification accepted after an edit keeps the author's questions, which were written for the older text.**
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Keep the gate critic's existing duty to read the edited plan and add a question for every weighty choice left unasked (`agents/iron-loop/gate-critic.md:103`). Report the cross-revision finding under Out of Scope to the owner.

### Dependency Risks
- **Shared file with the critique-queue slice.** The slice "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect" also edits `src/commands/start.md`, and it was written against an older section heading, "background precompute (never-wait)". I checked: the current heading at `:265` is "Streaming gate questions — written with the plan, the fleet only on request".
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Sequence the two edits of `src/commands/start.md`. This plan touches only lines `:380-391`.
- **No retry after a refused classification.** After a refusal like the one in the scenario "An edit after the classification was stamped is still refused", the classify task is not retried for the same question revision (one task per revision, `src/lib/menu-screens.js:3000-3011`).
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Test in that scenario that the plan stays waiting for the owner's approval, which fails safe. A new question file from the author queues a new task.

## Priority

**Priority: MEDIUM** (Score: 5/9)
- Dependency: 2. No other stub depends on it. It runs in parallel with its siblings and shares one file with an existing slice.
- Business Impact: 2. It supports the primary goal: it is one of five route frictions under "Every plan move the maintainers need is a menu route with usable output".
- Technical Risk: 1. The refusal check already exists and is well understood. The change adds one field to the hand-over and one line to the brief.

## Decisions Taken Under Ambiguity

1. **Which time.**
   - The brief carries the plan file's current modification time, at full precision, read when the menu builds the list of tasks to launch.
   - It is neither the task label's whole millisecond nor the question file's stored stamp. The sweep compares at full precision (`src/lib/streaming-questions-sweeper.js:190`), the label is rounded down (`src/lib/menu-screens.js:3004`), and the stored stamp is what produced the reported refusal.
2. **Where the time comes from.**
   - It comes from the task the coordinator already holds before launching the gate critic.
   - It does not come from the task start, which runs after the launch (`src/commands/start.md:385`).
   - It is not read by the session itself either: that would be the `node -e` workaround the vision removes.
   - The critique-queue slice uses the same pattern: the code computes the times, and the texts carry them.
   - The exact carrier is the implementation planner's choice, within the first story's scenarios.
3. **A classification after an edit is accepted when it carries the new time.**
   - The vision and this stub ask for exactly this, and it changes no gate code.
   - The gate critic reads the edited plan, not the older one.
4. **"Reproduce the reported refusal" and "An edit after the classification was stamped is still refused" pin existing behaviour.**
   - They are the reproduction the stub asks for, and the guard that the refusal still fires when it should.
   - They are not new behaviour.
5. **The reproduction is constructed.** No sweeper log records the 2026-10-20 refusal. The search is in the Problem Statement.
6. **`agents/iron-loop/gate-critic.md` stays unchanged.**
   - It already demands the time.
   - With no time, its improvised fallback is to copy the author's stamp. That fails closed (refused), which is safer than omitting the stamp, which the sweep accepts.
7. **An unreadable plan time is stated as not available, never invented.**
   - A guessed time could make an older classification read as fresh.
   - The brief then says the time is not available.
   - The gate critic records `planMtimeMs` as not supplied under its existing rule (`agents/iron-loop/gate-critic.md:35`), and the sweep applies its existing rules. No new path is added.
8. **No question for the owner.**
   - No fork in this plan meets the bar of high uncertainty or great importance.
   - The one gate-logic observation is listed under Out of Scope for him to schedule, not decided here.
9. **No questions file and no status file were written.** The brief allowed only this plan file.

## Implementation Details

Technical planning, 2026-10-20, main checkout. Every line number below was read in this pass; the builder re-reads each cited span at the PREPARE step and edits the text as it then stands. Project type: CTOC developing itself (internal tool); no stack template, no Product Loop file (`plans/canvas/<slug>-kpis.yaml` does not apply), no production-readiness checklist.

### The owner's answer this plan is built on

The question "Once the gate critic is handed the plan file's time, a classification made after a plan edit is accepted, and no code then checks that it kept every question the author wrote …" (`q10-post-edit-classification-unchecked-r1792506215818`) was answered with option 1, "Build the plan as written; the check is a separate plan, built if and when you choose" (`.ctoc/streaming/answers.jsonl` line 258, 2026-10-20T16:02:33.757Z). This plan therefore changes no rule of the sweeper or the question store. The check that a classification after an edit keeps every author question stays out of scope, listed for the owner to schedule.

### Architecture decision — where the time is read and how it travels

- **Read in `computePromote`** (`src/lib/menu-screens.js:2391-2417`), the one function that builds every `promote[]` list. Its callers, read in this pass:
  - `menu task cancel` (`:2489`) and `menu task fail` (`:2605`);
  - `menu task complete` without `--continue` (`:2848`);
  - the continuation `continueAfterCrossing` (`:2905` on a failed crossing pass, `:2937` otherwise). It is reached from `menu task complete <id> --continue` (`:2843-2846`), from `stream approve` (`src/lib/streaming-gate.js:2314` → `continueAfter` `:2343-2352` → `:2322`) and from `stream answer` (`src/lib/streaming-gate.js:2519`);
  - `stream check` (`streamCheck`, `:3035`) and `menu task sweep --confirm` (`taskSweep`, `:3282`).

  One change covers both hand-over routes of the acceptance criteria, the continuation and "Check its questions".
- **Read when the list is built, never when the task is queued.** The time recorded at queue time would be time A. The scenario "After an edit, the classification carrying the handed-over time is accepted" needs time B, the plan's time when the session receives the task.
- **The same read as the sweeper.** `precompute.refToPlanPath(root, ref)` then `safeFs.statSync(path).mtimeMs`, exactly the pair `promotePendingFile` uses (`src/lib/streaming-questions-sweeper.js:177` and `:183`), so the handed-over value equals the value step 10 compares against (`:188-192`). `statSync` follows a link as the sweeper's does; `lstat` would let the two times disagree on a linked plan file. `refToPlanPath` (`src/lib/streaming-precompute.js:198-206`) is the traversal guard: a ref with a separator, `..`, NUL or an absolute part returns null, and nothing outside `plans/<stage>/` is ever stat-ed.
- **Carried as a field `planMtimeMs` on `classify` entries only.** The name is the one the gate critic's contract uses (`agents/iron-loop/gate-critic.md:37`, `:94`). Every other kind keeps its exact current key set `id, kind, plan, touches, gitOp`.
- **Printed as written.** `src/commands/start.js:966-967` prints the route's result with `JSON.stringify(result, null, 2)`. JSON writes a double in its shortest round-trip form and never in exponent form below 1e21, so the digits the session copies parse back to the very same double the sweep compares.
- **Unreadable → `null`.** No plan file at the ref (moved, deleted), an unsafe ref, or a null `plan`: the stat throws (`safe-fs.validatePath` throws a `TypeError` on a null path, `src/lib/safe-fs.js:59-74`) and the entry carries `planMtimeMs: null`. A thrown stat never empties or shortens the list.

### Dependency graph

```
[MODIFY src/lib/menu-screens.js]
  computePromote(reg, root) --calls--> handedOverPlanMtimeMs(root, ref)   (new, not exported)
  handedOverPlanMtimeMs --uses--> streaming-precompute.refToPlanPath (lazy require, as queueClassification :3002)
                        --uses--> safe-fs.statSync                       (already imported, :24)
  callers of computePromote (unchanged): taskTransition cancel :2489, fail :2605; taskComplete :2848;
    continueAfterCrossing :2905, :2937 <- taskComplete --continue :2844, streaming-gate continueAfter :2345
    (stream approve :2314, stream answer :2519); streamCheck :3035; taskSweep :3282
[MODIFY src/commands/start.md] classify paragraph :380-391
  --instructs--> the session --briefs--> gate-critic --writes--> .ctoc/streaming/questions/pending/<ref>.json
  --swept by--> streaming-questions-sweeper.promotePendingFile :188-192 (unchanged)
[CREATE tests/the-classification-brief-carries-the-plan-time.test.js]
  --drives--> menu-screens.route (in process), src/commands/start.js (child process),
              streaming-gate.streamingGateScreen, streaming-precompute.planQuestionsStatus / writePlanQuestions
[MODIFY CLAUDE.md, README.md] test-file count only
```

No cycle: `streaming-precompute` requires `safe-fs`, `state` and, lazily, `streaming-gate`, never `menu-screens`.

### File specifications

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** the classify task the menu hands over carries the plan file's modification time at full precision.
**Change Type:** new-function + modify-existing

##### New function (place it directly above `computePromote`, after its JSDoc block ends at `:2390`)
- `handedOverPlanMtimeMs(root: string, ref: string|null)` → `number|null`
  - Description: the plan file's modification time for a `classify` hand-over, read the way the sweeper reads it.
  - Throws: never. Every failure returns null.
  - Example: `handedOverPlanMtimeMs('/p', 'functional/x.md')` → `1784271999196.2705` when `plans/functional/x.md` exists with that time; `null` when it does not.

```js
/**
 * The plan file's modification time for a `classify` hand-over: the sweeper's own read
 * (`refToPlanPath`, then `statSync().mtimeMs`), at full precision, so the gate critic's stamp equals
 * the time the sweep compares against. null when it cannot be read (no plan file, an unsafe ref or
 * no ref: `refToPlanPath` returns null and a null path throws too) — never a guessed, rounded or
 * zero time.
 * @param {string} root
 * @param {string|null} ref `stage/file.md`
 * @returns {number|null}
 */
function handedOverPlanMtimeMs(root, ref) {
  try {
    return safeFs.statSync(require('./streaming-precompute').refToPlanPath(root, ref)).mtimeMs;
  } catch {
    return null;
  }
}
```

##### Changes to `computePromote` (`:2391-2417`)
- **Modify** the `.map` at `:2400-2406`:

```js
    .map((t) => {
      const plan = t.plan == null ? t.plan : stripCtl(t.plan);
      return {
        id: stripCtl(t.id),
        kind: t.kind,
        plan,
        touches: t.touches,
        gitOp: t.gitOp,
        // Read now, when the list is built (never when the task was queued): the gate critic's
        // brief copies it digit for digit (src/commands/start.md, the classify paragraph).
        ...(t.kind === 'classify' ? { planMtimeMs: handedOverPlanMtimeMs(root, plan) } : {}),
      };
    });
```

  The time is read for the ref the brief will name (the control-character-stripped `plan`), so the critic's stamp is the time of the file it is told to read. The conditional spread keeps `tsc --checkJs` content, because no property is added to an inferred literal type. The `/^t\d+$/` id filter (`:2399`) and the stop filter (`:2407-2416`) stay where they are.
- **Update** the JSDoc above (`:2358-2361`): after "Each entry carries only what the dispatcher needs (id + the scheduler inputs), never the whole task object." add "A `classify` entry also carries `planMtimeMs`, the plan file's modification time read when the list is built, at full precision, or null when the plan file cannot be read: the stamp the gate critic's brief copies."
- **Update** `@returns` (`:2389`) to `{promote:Array<{id:string, kind:string, plan:(string|null), touches:string[], gitOp:boolean, planMtimeMs?:(number|null)}>, quarantined:Array<{id:string,reason:string,summary:string}>}`.

##### Dependencies
`safeFs` (already imported, `:24`); `require('./streaming-precompute')` lazily, as `queueClassification` does at `:3002`.

##### Called by
`computePromote` only. It is reached from every `promote[]` route listed under the architecture decision.

##### Data flow
```
task registry entry {kind:'classify', plan:'functional/x.md'} -> computePromote -> stripCtl(plan)
  -> refToPlanPath -> safeFs.statSync -> mtimeMs (or null) -> promote[i].planMtimeMs
  -> start.js JSON.stringify -> the session -> gate-critic brief -> pending file planMtimeMs
  -> sweeper step 10: stamped < current mtime ? superseded : promoted
```

##### Error handling
A failed stat is caught and returns null; there is no other I/O. No write and no log.

##### Cross-platform
No path is built by hand (`refToPlanPath` uses `path.join`). `mtimeMs` has a fraction of a millisecond on APFS, ext4, tmpfs and NTFS (100 ns).

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** the session's instructions for the gate critic's classification brief list `planMtimeMs`, name the promoted entry as its only source, and forbid a by-hand read.
**Change Type:** modify-existing

The classify paragraph (`:380-391`). The edit changes only the text after "its brief:", so that the prefix the slice "Only a critique the menu launched can move a plan" rewrites in its change 7 ("Launch `gate-critic` alone as background WORK, then `menu task start <id> --agent-id <the harness agent id>`; its brief:") stays byte-identical. The recipe line `menu task add classify '{ref}' --touches '.ctoc/streaming/questions/{ref}'` stays word for word; `tests/unexecutable-instruction-fence.test.js` needs it for the `classify` kind.

Old text (`:385-391`, from "its brief:"):
```
its brief: the task id,
the plan path, and "classify the questions of `{ref}`" (its section "Classifying the
questions", which has it read the plan and its parent plan, classify the author's questions
and add a question for every weighty choice the author left unasked); never the three lens
critics. It writes the classified file to the waiting folder; the next continuation sweeps it
in. If it fails, the plan stays where it is: every question keeps reaching the human, and only
his approval moves it.
```

New text:
```
its brief: the task id,
the plan path, "classify the questions of `{ref}`" (its section "Classifying the
questions", which has it read the plan and its parent plan, classify the author's questions
and add a question for every weighty choice the author left unasked), and `planMtimeMs`; never
the three lens critics. `planMtimeMs` is the `planMtimeMs` of the promoted entry, the plan
file's modification time the menu read when it built `promote[]`, and the only source of that
time: copy it into the brief digit for digit, never rounded. Never read the plan's time
yourself: no `node -e`, no file listing, never the task's `revision-…` label and never the
question file's stamp. When the entry's `planMtimeMs` is `null`, the menu could not read the
plan file: the brief says the plan's time is not available and carries no number in its place.
It writes the classified file to the waiting folder; the next continuation sweeps it
in. If it fails, the plan stays where it is: every question keeps reaching the human, and only
his approval moves it.
```

The test pins five sentences of the new text, collapsed to single spaces. These are listed under case 3 of the test plan; any rewording changes the test with it.

#### File: `tests/the-classification-brief-carries-the-plan-time.test.js`
**Action:** CREATE. Specified under the test plan.

#### Files: `CLAUDE.md` and `README.md` (ratchet)
**Action:** MODIFY, the test-file count only: `CLAUDE.md` "Run all 586 test files" and "tests/  586 test files", `README.md:1145` "tests/           586 test files". Each becomes the count `tests/doc-counts.test.js` reports after the new file exists: 587 if no other plan added or removed a test file meanwhile. Edit the numbers by hand. Do not run `src/scripts/release.js`, which is a release step and syncs version files this plan does not declare. `CLAUDE.md` keeps its size, because the number keeps its digit count; it stays at or under 15,000 bytes.

### Test plan

**File:** `tests/the-classification-brief-carries-the-plan-time.test.js` (CREATE), `node:test` + `node:assert/strict`. Every case drives the real functions in a temporary project: real plan files, real task registry, real question store, real waiting folder, real sweeper log, the real menu router `menuScreens.route`, and in case 4 the real command `node src/commands/start.js`. Nothing in CTOC is mocked. No case sleeps, waits or asserts on elapsed time. Every plan time is set with `fs.utimesSync` to a fixed value in the past and read back with `fs.statSync`.

**Fixtures and helpers** (modelled on `tests/a-requested-stop-offers-no-build.test.js:36-100` and `tests/plans-keep-moving-without-the-human.test.js:162-213`):
- `makeSandbox()`: `os.tmpdir()` + pid + counter; `plans/<every stage>` and `.ctoc/state`; returns `fs.realpathSync(dir)`; removed in `afterEach`.
- Times in seconds, in the past (a future stamp is refused by `writePlanQuestions` as `future-stamp`, `src/lib/streaming-precompute.js:651`): `T_A = 1784271999.1962705`, `T_B = 1784272099.3141592`, `T_C = 1784272199.7182818`.
- `setPlanTime(root, ref, seconds)`: `fs.utimesSync(file, seconds, seconds)`, then returns `fs.statSync(file).mtimeMs`. It asserts `ms % 1 !== 0`, failing loudly with "this file system did not keep a fraction of a millisecond; the full-precision cases cannot run here" (functional Risks, first risk).
- `QUESTION`: `{ id: 'q10-db', prompt: 'Which database engine?', critical: false, important: false, topic: 'technology-stack', options: [{ key: '1', label: 'Postgres', recommended: true }, { key: '2', label: 'SQLite' }] }`. Its topic is a weighty one, so after an accepted classification the question still goes to the human and the plan stays at its gate, where its screen can be read. A classification with only `detail` questions would let the same continuation move the plan on (as `tests/plans-keep-moving-without-the-human.test.js` case 26 does), and the screen assertions would then pass or fail for the wrong reason.
- `authorPlan(root, slug, seconds = T_A)`: writes `functional/<slug>.md` (the functional body of `a-requested-stop-offers-no-build.test.js:51-54`), sets its time, and writes the author's file `precompute.writePlanQuestions(root, ref, [QUESTION], mtimeMs)` with no classification. Returns `{ ref, mtimeMs }`.
- `continuation(root)`: the coordinator's call. `menu task add review some-reviewed-plan-<n>`, `menu task start <id>`, `menu task complete <id> --continue`, all through `route`; returns the completion result.
- `classifyEntry(res, ref)`: the `promote[]` entry with `kind === 'classify'` and `plan === ref`, asserted present with the list in the message.
- `dropPendingRaw(root, ref, stampText)`: writes the waiting file at `precompute.pendingQuestionsPath(root, ref)` as the gate critic does: `{"ref":"<ref>","planMtimeMs":<stampText>,"questions":[QUESTION],"classification":{"by":"gate-critic","at":1786000000000}}`, with `stampText` inserted as characters, never re-formatted.
- `sweeperLog(root)`: the parsed lines of `.ctoc/logs/streaming-sweeper.jsonl`, or `[]` when it is absent.
- `assertCheckedScreen(root)`: `streamingGate.streamingGateScreen(root)`. Its option labels include neither "Generate its questions" nor "Check its questions". Its text includes none of "has not yet checked the questions its author wrote", "check of its questions did not finish" and "being checked by the gate critic" (`src/lib/streaming-gate.js:1850-1857`). `JSON.stringify(screen)` includes "Which database engine?", which proves that the accepted classification's question is the one being asked.

**Cases** (each fails before the change unless marked as a pin):

1. **1a — `menu task complete <id> --continue` hands over the classify task with the plan's time at full precision.** `authorPlan(root, 'c1')`; `res = continuation(root)`; `e = classifyEntry(res, ref)`; `assert.equal(e.plan, ref)`; `assert.equal(e.planMtimeMs, fs.statSync(file).mtimeMs)` (strict, so `undefined` today fails); `assert.notEqual(e.planMtimeMs % 1, 0)`.
   **1b — the same through `stream answer`.** A second plan with one classified fork question (the `oneFork` fixture, `a-requested-stop-offers-no-build.test.js:93-100`); `route(['stream', 'answer', fref, qid, '1', digest])`; the same assertions on `res.promote`.
   **1c — the same through `stream approve`.** A second functional plan approved with `route(['stream', 'approve', 'functional/approved.md'])`; the same assertions. Every non-`classify` entry in each of the three lists has exactly the keys `['id', 'kind', 'plan', 'touches', 'gitOp']`.
2. **2 — "Check its questions" (`stream check`) hands over the same time.** `authorPlan(root, 'c2')`; `screen = route(['stream', 'check', ref])`. Its classify entry carries `planMtimeMs` strictly equal to `fs.statSync(file).mtimeMs`, with a fraction. The time is in the returned list itself, so it is there before any task start (functional Risks, second risk).
3. **3 — the session's classify paragraph names `planMtimeMs`, the promoted entry as its only source, and no by-hand read.** Read `src/commands/start.md`, slice from "**A promoted `classify` task" to "### Build-flow idea submit", and collapse whitespace to single spaces. Assert the span includes each of these:
   - `` its brief: the task id, the plan path, "classify the questions of `{ref}`" ``
   - `` the author left unasked), and `planMtimeMs`; never the three lens critics. ``
   - `` `planMtimeMs` is the `planMtimeMs` of the promoted entry, the plan file's modification time the menu read when it built `promote[]`, and the only source of that time: copy it into the brief digit for digit, never rounded. ``
   - `` Never read the plan's time yourself: no `node -e`, no file listing, never the task's `revision-…` label and never the question file's stamp. ``
   - `` When the entry's `planMtimeMs` is `null`, the menu could not read the plan file: the brief says the plan's time is not available and carries no number in its place. ``
   - the recipe `` `menu task add classify '{ref}' --touches '.ctoc/streaming/questions/{ref}'` ``

   Then assert that the span, with the "Never read the plan's time yourself …" sentence removed, contains no `node -e`.
4. **4 — boundary: a time with a fraction of a millisecond survives the round trip through the real menu output; its whole-millisecond label value is refused.** One sandbox, in this order:
   1. `authorPlan(root, 'c4')`, an unedited plan.
   2. Run `node src/commands/start.js stream check functional/c4.md` with `execFileSync(process.execPath, [MENU_ENTRY, …], { cwd: root, encoding: 'utf8', env })`, `env` without `CLAUDE_PROJECT_DIR` (as `a-requested-stop-offers-no-build.test.js:229-238`). Parse the JSON (from the first `{`) and assert that its `promote` holds the classify entry for the ref and that the entry has the own key `planMtimeMs`, with the stdout in the message: this is the first assertion that fails today. Then take the digits from the raw text of that entry only: slice stdout from its `"id": "<the entry's id>"` to the next `}`, and match `/"planMtimeMs": ([0-9]+(?:\.[0-9]+)?)/` inside that slice, so no other key of the screen can supply them. Assert `Number(digits) === fs.statSync(file).mtimeMs`.
   3. Take `label` from the queued classify task in `taskRegistry.load(root)`. Drop a pending file stamped with `label.slice('revision-'.length)`, the whole millisecond. Run `continuation(root)`. Assert: the sweeper log gained exactly one line `{ file: 'functional__c4.md.json', reason: 'superseded' }`; `precompute.planQuestionsStatus(root, ref).classified === false`; the plan is still at `functional/c4.md`.
   4. Start the classify task with `menu task start <id> --agent-id gate-critic-c4`. Drop the pending file with the digits from step 2, inserted as characters. Run `menu task complete <id> --continue`. Assert: no new log line; `planQuestionsStatus` is `ready`, `classified === true` and `questionsRevisionMs === fs.statSync(file).mtimeMs`; `assertCheckedScreen(root)`.
5. **5 — error: an unreadable plan time is never invented.** Queue a planner with `menu task add plan other-plan`. `authorPlan(root, 'c5')`; `first = continuation(root)` queues the classify task. Keep the planner's entry from `first.promote`. Then `fs.rmSync(file)`, the plan gone as after a move: never `chmod`, which does not stop a stat and means nothing on Windows. `res = continuation(root)`. Assert:
   - `res.ok === true`;
   - the classify entry has the own key `planMtimeMs`, strictly `null`;
   - the planner's entry deep-equals the one kept from `first`;
   - every non-classify entry has exactly the keys `['id', 'kind', 'plan', 'touches', 'gitOp']`.
6. **6 — reproduction (pin, green before the change): a classification carrying the author's stamp after a plan edit is refused.** `authorPlan(root, 'c6', T_A)` → A; `continuation(root)` queues the classify task. Rewrite the plan body and `setPlanTime(… T_B)` → B > A. `dropPendingRaw(root, ref, String(A))` (the author's stamp, as reused on 2026-10-20); start and complete the classify task with `--continue`. Assert:
   - the log gained exactly one line `{ file: 'functional__c6.md.json', reason: 'superseded' }`;
   - the plan is still at `functional/c6.md`;
   - `planQuestionsStatus(root, ref).status === 'stale'`;
   - the gate screen's labels include "Generate its questions".
7. **7 — after an edit, the classification carrying the handed-over time is accepted (end to end).** `authorPlan(root, 'c7', T_A)`; `continuation(root)` records the classify task, label `revision-<floor A>`. Rewrite the plan and set its time to B. `res = continuation(root)`, the hand-over. Assert `classifyEntry(res, ref).planMtimeMs === B` (strict) and that the task id equals the one recorded for revision A. Start the task with an agent id; drop the pending file with `JSON.stringify(entry.planMtimeMs)` as the stamp; complete it with `--continue`. Assert: no new log line; `planQuestionsStatus` is `ready`, `classified === true`, `questionsRevisionMs === B`; `assertCheckedScreen(root)`.
8. **8 — edge (pin, green before the change): an edit after the classification was stamped is still refused.** `authorPlan(root, 'c8', T_B)` → B; `continuation(root)` queues the classify task. Start it. `dropPendingRaw(root, ref, String(B))`, B read with `fs.statSync` when the classification is written. Rewrite the plan and set its time to C. Complete the task with `--continue`. Assert:
   - the log gained one `superseded` line;
   - the plan is still at `functional/c8.md`;
   - no classified file: `planQuestionsStatus(root, ref).classified !== true`;
   - the plan's descriptor in `streamingGate.pendingGateDecisions(root)` has `enough === false`, so it waits for the owner's approval.

Cases 6 and 8 pin the sweep's existing refusal. Green on their first run is the expected result, not a weakened test (functional plan, "Which scenarios fail first").

**Existing tests that must stay green, and why.**
- `tests/a-requested-stop-offers-no-build.test.js` adds a classify task for `functional/c.md`, which has no plan file. Its entry now carries `planMtimeMs: null`, and the file asserts only on membership.
- `tests/plans-keep-moving-without-the-human.test.js` cases 24-27 check the classify task's registry fields and `promote` membership, never the entry's key set.
- I searched `tests/` for a `deepEqual` over a promote entry or `Object.keys` of one: no test pins a classify entry's shape. The searches were the patterns `promote.*deep(Strict)?Equal|deep(Strict)?Equal\(.*promote` and `Object\.keys\((p|t|entry|e|promote|promoted|res\.promote)[^)]*\)`.
- `tests/unexecutable-instruction-fence.test.js` needs the `menu task add classify` recipe, which is kept verbatim.
- `tests/doc-counts.test.js` checks the new count in `CLAUDE.md`.

**Coverage.** The new function's two paths are both run: the stat succeeds in cases 1, 2, 4 and 7, and it throws in case 5 and in the existing stop test. The spread's two arms run in every case that holds a non-classify entry. Line and branch coverage of the new lines: 100%. The project floor (`.ctoc/coverage-baseline.json` `minPct`) must still hold.

### Security review

- [x] **Path traversal.** The stat path comes only from `refToPlanPath`, which refuses separators, `..`, NUL and absolute parts and joins under `plans/<stage>/`. The task registry is not write-protected (the owner's removal of 2026-10-15). A forged `classify` entry can therefore learn at most the modification time of a file inside `plans/`, which the session can already read.
- [x] **Input validation.** No new input. The ref is the registry's, control characters stripped as before.
- [x] **No secrets.** None in the code, the tests or this plan.
- [x] **Safe file operations.** No new write. One `statSync` per classify entry, read-only. The tests write only inside their own temporary directories.
- [x] **Error messages.** The failure path returns null and prints nothing; no path or stack reaches anyone.
- [x] **Prototype pollution.** The entry is an object literal built from named fields; nothing from the registry is spread into it.
- [x] **Command injection.** No `exec`. The test's `execFileSync` passes an argument array, with no shell. The new instruction text removes a by-hand `node -e` read from the session's path: it shrinks an execution habit and grants none.
- [x] **Injection into the gate critic.** The value handed over is a number or null computed by code at hand-over time, never a string from a plan, a task label or the registry. Nothing an attacker writes can choose it.
- [x] **Gate logic.** Unchanged. The sweeper still refuses an older stamp and still accepts a payload with no stamp (functional Out of Scope; the owner's answer above).

### Architecture checks

- Dependencies point the right way: lib → lib (`menu-screens` → `streaming-precompute`, `safe-fs`); no hook, command or tab is imported.
- One parameter each, and only what the function uses: `root`, `ref`.
- Open/closed: `computePromote` gains one conditional field; its filters and order are untouched.
- Test independence: every case builds its own sandbox; nothing is shared between cases.
- Cross-platform: `path.join` everywhere, `fs.utimesSync` and `fs.statSync` (portable), `process.execPath` for the child process, no shell script.

### Implementation order

1. CREATE `tests/the-classification-brief-carries-the-plan-time.test.js`. It uses existing exports only: `menuScreens.route`, `streamingGate.streamingGateScreen` and `pendingGateDecisions`, `precompute.planQuestionsStatus`, `writePlanQuestions`, `pendingQuestionsPath` and `questionDigest`, and `taskRegistry.load`.
2. MODIFY `src/lib/menu-screens.js`: `handedOverPlanMtimeMs`, then the `computePromote` map, JSDoc and `@returns`.
3. MODIFY `src/commands/start.md`: the classify paragraph.
4. MODIFY `CLAUDE.md` and `README.md`: the test-file count.

### Acceptance criteria mapping

| Criterion (scenario) | Implemented in | Test case |
|---|---|---|
| The continuation hands over a classify task with the plan's time | `computePromote` + `handedOverPlanMtimeMs` | 1a, 1b, 1c |
| "Check its questions" hands over the same time | the same (`streamCheck` → `computePromote`) | 2 |
| The gate critic's brief names the time it was handed | `src/commands/start.md` classify paragraph | 3 |
| A time with a fraction of a millisecond survives the round trip | `computePromote` (full precision) + `start.js` JSON output | 4 |
| An unreadable plan time is never invented | `handedOverPlanMtimeMs` returns null | 5 |
| Reproduce the reported refusal | the sweeper, unchanged (pin) | 6 |
| After an edit, the classification carrying the handed-over time is accepted | `computePromote` reads the time at list-build time | 7 |
| An edit after the classification was stamped is still refused | the sweeper, unchanged (pin) | 8 |

### Risk mitigations

| Risk | Mitigation | Where |
|---|---|---|
| The handed-over time is rounded | the raw `mtimeMs`, never the label; the fixture asserts the fraction first; case 4 refuses the label value and accepts the digits | `computePromote`; case 4 |
| The time is read too late to reach the brief | it is in `promote[]` itself, before any task start | cases 1a-1c, 2 |
| Tests that pin a handed-over task's fields break | none found (the searches above); non-classify entries keep their exact keys, which case 5 pins | case 5 |
| The classify paragraph loses the fence's recipe | the recipe line kept verbatim, asserted in case 3, and the fence test run at the VERIFY step | case 3; `tests/unexecutable-instruction-fence.test.js` |
| A classification accepted after an edit keeps questions written for the older text | the gate critic's existing duty to read the edited plan (`agents/iron-loop/gate-critic.md:103`); the keep-check is the separate plan the owner chose to schedule himself | Out of Scope |
| No retry after a refused classification | case 8 asserts that the plan stays waiting for the owner's approval | case 8 |
| Shared files with neighbouring plans | the PREPARE step re-reads every cited span; the prefix up to "its brief:" stays byte-identical | see Neighbours |

### Wiring — the live call sites

- **New function `handedOverPlanMtimeMs`** is called by `computePromote` (`src/lib/menu-screens.js`). That is reached from the shipped slash command `/ctoc:start` through `src/commands/start.js` → `menuScreens.route`. The routes are:
  - `menu task complete <id> --continue`, the session's COMPLETION recipe (`src/commands/start.md:133`);
  - the gate-screen actions `stream approve` (`src/lib/streaming-gate.js:1702`, `:2078`), `stream check` (`:1719`, `:2088`) and `stream answer` (each option of a rich question);
  - `menu task fail|cancel` and `menu task sweep --confirm`. It is wired in this same build; no follow-up.
- **The new field `planMtimeMs`** is read by the session through the classify paragraph of `src/commands/start.md`, which `/ctoc:start` loads, and copied into the gate critic's brief. `agents/iron-loop/gate-critic.md:94` writes it into the pending file, and `streaming-questions-sweeper.promotePendingFile` (`:188-192`) compares it. That is reached from every continuation (`continueAfterCrossing` `:2896`) and every gate-screen render (`streamingGateScreen`).
- No new export, hook, script or route.

### Neighbours (seen, not built here; scheduling is the owner's)

- "Only a critique the menu launched can move a plan" (`plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s24-only-a-critique-the-menu-launched-can-move-a-plan.md`, held by the owner) edits the same classify paragraph (its change 7 rewrites up to "its brief:" and inserts after "sweeps it in."), `queueClassification`, `continueAfterCrossing` and `tests/plans-keep-moving-without-the-human.test.js`. This plan keeps that prefix byte-identical and adds no test to that file. Whichever of the two builds second re-reads the paragraph.
  - That slice also changes what the sweeper accepts. A file carrying the gate critic's classification keeps it only when the write protection recorded the gate critic's Write of exactly that content (its change 6 to `src/commands/start.md` step 4, and its addition to `docs/ENFORCEMENT.md`, both read in this pass).
  - Cases 4 and 7 here write the accepted classification with a plain `fs.writeFileSync`, so no such record exists.
  - If that slice is built first, this plan's builder writes those two accepted-path files through the record that slice's tests create (its corrected `dropPending`), and never loosens an acceptance assertion.
  - If this plan is built first, that slice's builder must change this plan's new test file too. Its `files:` does not list the file, so the change goes through `src/lib/scope-growth.js`.
  - Cases 6 and 8 are unaffected either way, because the out-of-date refusal fires before any attribution check.
- "An agent's words are capped and shown as data" (`…-s27-agent-words-are-capped-and-shown-as-data.md`): its problem statement names `computePromote`'s handling of `touches` (`src/lib/menu-screens.js`), and it declares `src/lib/menu-screens.js` and `src/commands/start.md`. I did not confirm that its changes touch `computePromote` itself.
- "Every trigger dispatches from one critique queue, and names the same four lenses the agents expect" (`plans/implementation/00412-small-changes-take-a-small-path-s12-critique-queue-and-four-lenses.md`) edits other spans of `src/commands/start.md` and `CLAUDE.md`.
- The two `src/commands/start.md` edits must not run at the same time. Plans run one at a time, so that holds by construction.

## Decisions Taken Under Ambiguity — technical planning

1. **The carrier is a `planMtimeMs` field on `classify` entries of `promote[]`, computed in `computePromote`.** It is the one function behind every hand-over route, it runs when the list is built, and the session already holds the entry before it launches the gate critic. A field read by `menu task start` would arrive after the launch (`src/commands/start.md:385`). A time stored on the task when it is queued would be the old time A. The functional plan's decision 2 left the carrier to this planner.
2. **The read is the sweeper's own** (`refToPlanPath` + `statSync`, following links), not `lstat` and not a hand-built path, so the handed-over time and the compared time are one read of one file.
3. **An unreadable time is `planMtimeMs: null`, with the key always present on a classify entry**, so the session can tell "not available" from an older menu that never sent one. Every other kind is left byte-for-byte as it was.
4. **No `Number.isFinite` guard.** `statSync().mtimeMs` is always a finite number. The guard's false branch could never run and would only cost coverage.
5. **Only `classify`, not `precompute`.** The fleet's synthesis brief belongs to the critique-queue slice (functional Out of Scope).
6. **The tests classify a `technology-stack` question,** so the plan stays at its gate after acceptance and its screen can be read; a `detail`-only classification can let the same continuation move the plan.
7. **A new test file, not new cases in `tests/plans-keep-moving-without-the-human.test.js`,** which the held slice "Only a critique the menu launched can move a plan" also edits. The new file moves the test count, so `CLAUDE.md` and `README.md` are declared, as the slice "While a stop is requested, no promote list offers a build" did. The count is edited by hand; `release.js` is not run.
8. **`agents/iron-loop/gate-critic.md` stays unchanged** (functional decision 6). It already requires the time from the brief and records a missing input as not supplied (`:35`).
9. **No question for the owner.** His one fork is answered (option 1, `answers.jsonl` line 258). The carrier, the null form and the test layout are internal choices that are cheap to reverse, with no stack, algorithm, persisted data shape, security posture or cost at stake. The author question file carries an empty list.

## Execution Plan

### Step 8: TEST
- [ ] Write `tests/the-classification-brief-carries-the-plan-time.test.js` with cases 1a, 1b, 1c, 2, 3, 4, 5, 6, 7 and 8 as specified in the test plan.
- [ ] Run `node --test tests/the-classification-brief-carries-the-plan-time.test.js`. Record that 1a-1c, 2, 5 and 7 fail on `planMtimeMs` being absent from the entry, that 3 fails on the missing sentences, that 4 fails at its stdout match, and that 6 and 8 pass, as pins of the existing refusal.
- [ ] If the fraction assertion in `setPlanTime` fails on this machine, stop and report it; never drop the fraction from the fixture.

### Step 9: PREPARE
- [ ] Re-read `src/lib/menu-screens.js` `computePromote` with its JSDoc and `queueClassification`, the classify paragraph of `src/commands/start.md`, and the two count lines in `CLAUDE.md` and `README.md`. A span that moved or changed (for example because a neighbouring plan built first) is edited as it now stands; a change that takes away the place this plan edits stops the build for a re-plan.
- [ ] If the sweeper already carries the attribution check of the slice "Only a critique the menu launched can move a plan" (a classified pending file keeps its classification only with a recorded Write by the gate critic), write the accepted-path pending files of cases 4 and 7 through the same record that slice's tests create. Never loosen an acceptance assertion to make them pass.
- [ ] Run `node --test tests/doc-counts.test.js tests/unexecutable-instruction-fence.test.js tests/a-requested-stop-offers-no-build.test.js tests/plans-keep-moving-without-the-human.test.js` and record that they are green before any edit.

### Step 10: IMPLEMENT
- [ ] `src/lib/menu-screens.js`: add `handedOverPlanMtimeMs(root, ref)` above `computePromote`; change the `.map` to carry `planMtimeMs` on `classify` entries; update the JSDoc sentence and `@returns`.
- [ ] `src/commands/start.md`: replace the classify paragraph's text after "its brief:" with the new text, keeping the prefix and the `menu task add classify` recipe line byte-identical.
- [ ] `CLAUDE.md` and `README.md`: set the test-file count to the number `tests/doc-counts.test.js` expects.
- [ ] Run the new test file: all ten cases green.

### Step 11: REVIEW
- [ ] The critic checks:
  - that the hand-over time and the sweeper's compared time come from the same read;
  - that no route builds a `promote[]` list without `computePromote`, by tracing every caller from the call sites listed under Wiring, not by a text search;
  - that the start.md text leaves the session no way to obtain the time except the entry;
  - that cases 6 and 8 are pins, while the other eight fail without the change.

### Step 12: OPTIMIZE
- [ ] Confirm that only `classify` entries are stat-ed, one `statSync` each, and that nothing else was added (no cache, no stored time, no new export).

### Step 13: SECURE
- [ ] The security scanner checks the items of the security review above against the diff:
  - the stat path only through `refToPlanPath`;
  - no string from the registry or a plan reaches the new field;
  - no new write, shell or export;
  - the start.md text grants no execution step.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, type check, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky. Any failing test, including one that passes on a rerun, is reproduced and root-caused in the product code before anything is reported.

### Step 15: DOCUMENT
- [ ] The JSDoc of `computePromote` and `handedOverPlanMtimeMs`, and the classify paragraph of `src/commands/start.md`, are the documentation; no other document lists a promote entry's fields. The build record lists each changed span with its file and the final test count.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box in this plan is checked against its test case and its recorded run. Cases 6 and 8 are confirmed as pins. Out of Scope still lists the check that a classification after an edit keeps every author question, for the owner to schedule.
