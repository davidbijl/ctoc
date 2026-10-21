---
title: "A task's next action is a plain read-only route"
type: implementation
created: 2026-10-12
priority: high
effort: small
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s8-inbox-questions-are-shown-as-quoted-data
files:
  - src/lib/task-view.js
  - src/commands/start.md
  - tests/menu-task-wiring.test.js
  - tests/protect-records.test.js
revision: 1
rejection_reason: "Close the open command-injection box: state the route character set in the start.md recipe and pin i"
tag: rejected
approved_by: human
approved_at: 2026-10-18T12:22:01.093Z
gate_crossed: review → done
---
# REVISION 1

## Rejection Feedback

Close the open command-injection box: state the route character set in the start.md recipe and pin it in its test, then re-run the gate.

---


# A task's next action is a plain read-only route

Slice 18 of `plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`. It is not one of the
parent's five suggested slices: the main session added it to the round on 2026-10-12 from slice 7's security review, which
reported "a planted `--next` option reaching this route" as "a `src/lib/task-view.js` `isNavRoute` fix" (slice 7, decision
33, lines 521-522). It was revised on 2026-10-12 on the CTO Chief's rulings after the critic and the four gate lenses
reviewed it. Every line number below was read on 2026-10-12 in the main checkout. `src/lib/menu-screens.js` and
`src/commands/start.md` carry other slices' uncommitted work there, so their line numbers are those of the working tree;
`src/lib/task-view.js`, `src/hooks/protect-records.js` and the two declared test files carry none.

## Problem Statement

**Today's check.** `isNavRoute` (`src/lib/task-view.js` lines 77-80) removes control characters (`stripCtl`, line 35) and
then accepts any value whose first word is `plan`, `browse`, `section`, `inbox`, `tasks`, `task`, `validate`, `stubs` or
`menu` (`NAV_ROUTE`, line 55, a word boundary after the word) and that does not begin with `claude:` (line 56). Nothing
after the first word is read. A non-string is turned into a string first (line 78), so an array such as
`['browse', 'review']` stored in the registry reads as `browse,review` and passes too.

**Who asks it.**
- The store: `taskComplete` (`src/lib/menu-screens.js` lines 2589-2598) takes the next action from `--next` or from a
  `--b64` payload's `nextAction` (line 2591), refuses the whole completion when `isNavRoute` says no (lines 2596-2597),
  and otherwise stores the value as given (line 2696).
- The detail screen: `renderTaskDetail` (`src/lib/task-view.js` lines 333-338) offers a done task's stored next action as
  an "Open … ▸" option ("Decision ready ▸" when a gate is recorded), described as "Navigate to the next action (does not
  perform it)" (line 337). Its action is the stored value with control characters removed (line 338), and the session runs
  a picked action as the next menu command (`src/commands/start.md` line 19). The label is "Open", the task's plan name
  and "▸" (line 336). The plan name is agent-written text with only control characters removed (`planName`, lines 88-92),
  so a plan named "Approve — everything checks out", or one holding a right-to-left override or a zero-width space,
  becomes an option label as written. Any `plan` route is offered, also one naming a plan that is not the task's own.
- The write protection: its own `isNavRoute` (`src/hooks/protect-records.js` lines 306-309) calls this one, for a
  background agent's `--next` (line 336) and for a decoded `nextAction` (line 319).

**Who can set the value.**
- A background agent completing its own task: `menu task complete` with `--next` is in its grammar
  (`TASK_GRAMMAR`, `src/hooks/protect-records.js` line 294), checked only by `isNavRoute`.
- Anything that writes `.ctoc/state/tasks.json` directly: the write protection's list of what it protects names the
  approval records, the check records, `.ctoc/streaming/` and the settings (`src/hooks/protect-records.js` lines 10-22),
  not the task registry.

**Values that pass today** (each checked against the line-55 pattern for this plan):
- `inbox questions; any command`: if the session runs the action as a shell command, the part after the semicolon runs in
  the main session.
- `inbox answer` with a question id and `--stdin`, followed by a here-string (three less-than signs, then words): run by the
  session, it records the agent's words as the owner's answer (the answer route, `src/lib/menu-screens.js` route line 3077,
  slice 7).
- Anything that begins with `menu`, among them `menu task start t2 --force` (a forced build start) and
  `menu task complete t1 --continue` (the continuation, which moves plans on their recorded evidence).

**What `menu` as a navigation word really opens** (`route`, `src/lib/menu-screens.js` lines 3024-3032):
- `menu` alone: `dashboardPipeline` (line 3032), the classic pipeline dashboard, the same screen as `dashboard` (lines
  3064-3065).
- `menu commands`: `dashboardCommands` (line 3026; the function, lines 1719-1782), the Commands screen (Vision, Start or
  Stop agent, Sync plans).
- `menu task` and a sub-command: `taskCommand` (line 3030; the function, lines 2969-2988). `add`, `start`, `complete`,
  `fail` and `cancel` change the task registry; `start` claims a build and moves its plan into `plans/in-progress/`
  (slice 2); `complete` on a build runs the plan's completion (lines 2609-2612). Only `list` and `board` just read.
- `menu` with any other word, for example `menu stream approve review/x.md`: there is no `menu stream` route; it falls
  through to the classic dashboard (line 3032).
- Both dashboard screens build their table with `buildDashboardTable` (`dashboardPipeline` line 747, `dashboardCommands`
  line 1725). That runs the reconcile pass (line 575), which saves the task registry when it orphans, sweeps, cancels or
  releases a task (`src/lib/task-reconcile.js` lines 588-603), and plan recovery (line 606), which moves an orphaned
  build's plan from `plans/in-progress/` back to `plans/todo/` (`src/lib/plan-recovery.js` line 198). So even `menu`,
  `menu commands` and `dashboard` change state when they open.

**The owner's ruling (2026-10-12).** `isNavRoute` accepts only an exact read-only route: words of `[A-Za-z0-9._/@:-]+`
joined by single spaces, no word beginning with `-`, and the whole value one of the read-only route shapes `start.md` lists
as navigation. Anything that changes state is refused: explicitly `inbox answer`, `inbox cleanup`, every `menu task` route,
every `menu stream` route, every `stream` route, and any route that moves, approves, starts or completes.

**The review round's rulings (CTO Chief, 2026-10-12).** The rule is stated once in this plan (Technical approach, "The
rule") and once in the comment above `NAV_ROUTE`. `validate` is not a shape, because its confirm screen hides which plan
it approves. A `plan` next action is offered only for the task's own plan. The option label stops being agent text.
`inbox question` and an ignored word after `browse` STAGE are shapes. `src/commands/start.md` and the write protection's
tests are declared, because one tells the session this check and the other enforces it.

## Technical approach

### The rule

A next action is refused when opening it moves a plan, changes a task, or records an answer, an approval or a comment.
Two writes are allowed on open, because they record none of those: the question sweep that the plan screen and the default
screen both run (`sweepPendingQuestions`, `src/lib/streaming-questions-sweeper.js` lines 268-328, which promotes a waiting
question file through `writePlanQuestions` or discards it, deletes it from `.ctoc/streaming/questions/pending/` and logs
a discard), and log lines. On top of the rule the value must be exactly one of the shapes below, word for word; a route the
rule would allow but that is not listed is refused until it is listed (fail closed).

### Every allowed shape

Read from `start.md`'s navigation table (`src/commands/start.md` lines 21-40) and its list of navigation routes (lines
85-87), then checked against `route` (`src/lib/menu-screens.js` lines 3016-3134) and the screen each shape opens. Capital
words below stand for an argument.

| Shape | Argument | Screen (where) | What opening it writes |
|---|---|---|---|
| `tasks` | none | `taskBoardScreen` (route lines 3035-3036; lines 2994-2997) | nothing: renders the registry |
| `task` ID | `t` and digits, the board's own id shape (`TASK_ID`, `src/lib/task-view.js` line 66) | `taskDetailScreen` (route lines 3038-3039; lines 3004-3007) | nothing: renders one task |
| `browse` STAGE, optionally one more WORD | STAGE one of `vision`, `canvas`, `functional`, `implementation`, `todo`, `in-progress`, `review`, `done` (`STAGE_FOLDERS`, lines 88-96, and `vision`, line 1799); WORD lower-case letters, digits and hyphens, beginning with a letter or digit | `stageBrowse` (route lines 3067-3068; lines 1790-1932); the route passes only STAGE, so WORD changes nothing | nothing: lists plans through `readPlans` (`src/lib/state.js` lines 20-70) |
| `section` NAME | `business`, `implementation` or `execution` (lines 816-820) | `sectionBrowse` (route lines 3070-3071; lines 811-897) | nothing: shows counts |
| `plan` STAGE/FILE`.md` | STAGE one of `canvas`, `functional`, `implementation`, `todo`, `in-progress`, `review`, `done` (`ALL_STAGES`, `src/lib/streaming-gate.js` lines 173-181); FILE a letter, digit or underscore, then letters, digits, dots, underscores or hyphens (`SAFE_PLAN_FILE`, `src/lib/streaming-gate.js` line 89). The detail screen offers it only when FILE`.md` is the file name of the task's own plan | `planDecisionScreen` (route lines 3101-3107; `src/lib/streaming-gate.js` lines 1518-1691) | the question sweep, allowed by the rule: `planDecisionScreen` calls `nextUnansweredQuestion` (line 1573), which runs the sweep before it reads (line 404). Its comment "Pure read: renders only" (lines 1511-1512) means that it crosses no gate |
| `stubs` SLUG | a letter, digit or underscore, then letters, digits, dots, underscores or hyphens | `visionStubsBrowse` (route lines 3109-3110; lines 1939-1989) | nothing: reads functional plans (`getVisionStubs`, `src/lib/state.js` lines 606-632) |
| `inbox questions` | none | `inboxQuestionsScreen` (lines 974-985) | nothing: the inbox doors are "PURE reads" (lines 899-907) |
| `inbox decisions` | none | `inboxDecisionsScreen` (line 992) | as above |
| `inbox gates` | none | `inboxGatesScreen` (lines 1271-1283) | nothing: "Read-only" (lines 1266-1268) |
| `inbox escalations` | none | `inboxEscalationsScreen` (lines 1143-1200) | nothing: a read-only question (line 1193) |
| `inbox stale` | none | `inboxStalePlansDrillIn` (lines 1292-1352) | nothing: "No file op, no plan move" (lines 1286-1287) |
| `inbox verify` | none | `inboxVerifyProposals` (lines 1363-…) | nothing: "No write, no plan move, no gate crossing" (lines 1358-1360); it runs git to read at most 20 candidates (line 1375) |
| `inbox question` QID | QID as `QUESTION_ID_RE` (`src/lib/inbox.js` line 66): 13 to 15 digits, a hyphen, six lower-case letters or digits | slice 8's `inboxQuestionScreen` | nothing: slice 8 specifies "The view writes nothing" and its test case 2 pins every question file and the answer record byte-identical across the view |

`inbox question` exists only once slice 8 is built. Before that, `route` sends an unknown inbox word to the classic
dashboard (route line 3091), whose table runs the reconcile pass; that is why this slice depends on slice 8.

"Nothing" in the last column is what each screen's own comment and code say; Step 11 confirms it for every helper module
each screen calls. Each of these screens may offer the owner options that do change state (for example the plan screen's
approve option). Those run only when he picks them; opening the screen changes nothing beyond the sweep and log lines.

### Every refused route, and why

- `menu`, `menu commands`, `dashboard`: both dashboard screens build their table with `buildDashboardTable`, which runs the
  reconcile pass (it can save the task registry) and plan recovery (it can move a plan back to todo); see the Problem
  Statement.
- Every `menu task` route: `add`, `start`, `complete`, `fail` and `cancel` change tasks; `list` and `board` only read, but
  `tasks` opens the same board, so neither is a shape. Every other `menu` value, `menu stream …` included, opens the
  classic dashboard.
- Every `stream` route (route lines 3046-3060): `stream approve` crosses a gate (`streamApprove`,
  `src/lib/streaming-gate.js` lines 2074-2101); `stream skip` renders the next decision through `advanceAfter` (lines
  2135-2139 and 2041-2046), which calls `pendingGateDecisions` (line 1017), and that moves plans on recorded evidence
  (`crossBySufficiency` at line 1053, `crossOnEvidence` at line 1068); `stream comment` records a comment; `stream check`
  queues a task (route lines 3052-3053); `stream answer` records an answer and runs the continuation (route line 3058);
  bare `stream` renders the default screen, which moves plans on recorded evidence when it opens (`src/commands/start.md`
  lines 230-233).
- `validate` STAGE/FILE: opening it only validates, but on a clean plan its screen asks "All checks passed — approve"
  followed by the two stage words, offers "Confirm approve" described as "Approve now — move plan to" the next stage, and
  never names the plan (`src/lib/menu-screens.js` lines 2030 and 2071-2074). A next action naming another plan would put
  the owner one click from approving a plan the screen does not name. `validate` with no reference, or with no slash,
  renders the classic dashboard (route lines 3114-3120).
- `plan` with no reference renders the default screen (route lines 3103-3105). `plan` STAGE/FILE `more` and `plan`
  STAGE/FILE `discuss` are in `start.md` (lines 33-34), but `route` ignores the third word and the comment at lines
  3093-3100 says those sub-screens are gone.
- `inbox answer` (route line 3077) records an answer. `inbox cleanup` and its sub-routes (route lines 3084-3090) lead to the
  cleanup confirmation and override.
- `inbox migration` (route line 3081) is a read-only screen (lines 1214-1216), but `start.md`'s navigation table does not
  list it.
- `hotfix check` (route lines 3128-3129) runs the hotfix check, which can run the tests.
- Any `claude:` action; the empty value; any value with a control character, a tab, a no-break space, two spaces in a row,
  a leading or trailing space, a character outside plain ASCII (a full-width semicolon, a Cyrillic look-alike letter), a
  capital letter where the shape has a lower-case word, a shell character or a word beginning with `-`; and any value that
  is not a string.

### The change

1. `src/lib/task-view.js`: `NAV_ROUTE` and `CLAUDE_ACTION` (lines 41-56) become one anchored literal pattern with the rule
   in its comment, and `isNavRoute` (lines 68-80) tests the value as given. `renderTaskDetail` offers a `plan` next action
   only for the task's own plan, and builds the label from the plan name only when that name is a plain file name.
2. `src/commands/start.md`: the completion recipe names the accepted shapes and says what any other value does; the
   navigation table writes every plan reference with `.md` and gets the `section` row it lacks.
3. The store and the write protection call `isNavRoute` and change nowhere else; both refuse more with it.

## Implementation Details

### Dependency Graph

```
src/lib/menu-screens.js#taskComplete --calls--> src/lib/task-view.js#isNavRoute (store; unchanged caller)
src/lib/task-view.js#renderTaskDetail --calls--> #isNavRoute, #opensOwnPlan, #labelName (render)
src/hooks/protect-records.js#isNavRoute --requires--> src/lib/task-view.js#isNavRoute (write protection; unchanged caller)
src/commands/start.md (loaded by /ctoc:start) --tells the session--> the shapes --next takes
tests/menu-task-wiring.test.js --calls--> menu-screens.route, task-view.isNavRoute, task-view.renderTaskDetail, task-registry
tests/menu-task-wiring.test.js --reads--> src/commands/start.md (navigation table, completion recipe)
tests/protect-records.test.js --spawns--> src/hooks/protect-records.js (PreToolUse payloads on stdin)
```

No new module, no new `require`, no cycle (`src/lib/task-view.js` still requires only `path` and `./task-registry`).
`opensOwnPlan` and `labelName` are module-local helpers with one caller, `renderTaskDetail`.

### File Specifications

#### File: `src/lib/task-view.js`
**Action:** MODIFY
**Purpose:** a task's next action is accepted only when it is an exact read-only route; a `plan` route is offered only
for the task's own plan; the option label carries no agent-written text.
**Change Type:** modify-existing

##### Changes
- **Replace lines 41-56** (the comment, `NAV_ROUTE` and `CLAUDE_ACTION`) with:

```js
// NAV-ROUTE allowlist (Decision 5, the feature's load-bearing safety invariant; made exact
// by four-defects slice 18, the owner's ruling of 2026-10-12). A task's next action is
// offered to the owner as an "Open … ▸" option and run as a menu command when he picks it.
//
// THE RULE: a route is refused when opening it moves a plan, changes a task, or records an
// answer, an approval or a comment. Allowed on open: the question sweep that the plan screen
// and the default screen run (streaming-questions-sweeper), and log lines. On top of the
// rule the value must be EXACTLY one shape below — words joined by single spaces, no word
// beginning with '-', nothing else — so a route the rule would allow but that is not listed
// is refused until it is listed here (fail closed). The old rule read only the first word,
// so "inbox questions; any command", "inbox answer ID --stdin" with a here-string, and every
// `menu task …` route passed.
//
// Allowed: tasks · task tN · browse STAGE [WORD] (STAGE vision, canvas, functional,
//   implementation, todo, in-progress, review or done; the route ignores WORD) ·
//   section business|implementation|execution · plan STAGE/FILE.md (STAGE a plan stage,
//   not vision; FILE as streaming-gate's SAFE_PLAN_FILE; renderTaskDetail offers it only
//   for the task's own plan) · stubs SLUG · inbox questions|decisions|gates|escalations|
//   stale|verify · inbox question QID (inbox.js QUESTION_ID_RE).
// Refused: menu, menu commands, dashboard (the dashboard table runs the reconcile pass,
//   which can save the task registry, and plan recovery, which can move a plan back to
//   todo); every menu task route; every stream route (approve crosses; skip and bare stream
//   reach pendingGateDecisions, which moves plans on recorded evidence; comment and answer
//   record; check queues a task); bare plan (the default screen); validate (its confirm
//   screen names only stage words, never the plan it approves); plan … more|discuss (the
//   route ignores the third word); inbox answer (records an answer); inbox cleanup (leads to
//   the cleanup confirmation and override); inbox migration (not in start.md's navigation
//   table); hotfix check (can run the tests); every claude: action.
//
// The value is tested AS GIVEN: a control character makes it refused, never cleaned into a
// different command. No i flag: "Browse review" and "TASKS" are refused. Literal regex (the
// security lint bans `new RegExp` on a non-literal). Linear: anchored at both ends, and each
// starred class is followed only by `\.md` or the end.
const NAV_ROUTE = /^(?:tasks|task t\d+|browse (?:vision|canvas|functional|implementation|todo|in-progress|review|done)(?: [a-z0-9][a-z0-9-]*)?|section (?:business|implementation|execution)|plan (?:canvas|functional|implementation|todo|in-progress|review|done)\/[A-Za-z0-9_][A-Za-z0-9._-]*\.md|stubs [A-Za-z0-9_][A-Za-z0-9._-]*|inbox (?:questions|decisions|gates|escalations|stale|verify)|inbox question \d{13,15}-[a-z0-9]{6})$/;

// The detail option's label carries the plan's name only when it is a plain file name
// (SAFE_PLAN_FILE's characters, without `.md`) once Unicode format characters — a
// right-to-left override, a zero-width space — are removed, cut at LABEL_NAME_MAX.
// Anything else reads "Open next ▸": agent-written words never become an option label.
const SAFE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
const FORMAT_CHARS = /\p{Cf}/gu;
const LABEL_NAME_MAX = 80;
```

- **Replace `isNavRoute`** (lines 68-80) with:

```js
/**
 * Is this next action safe to store and to offer? Only when it is a string that is exactly
 * one read-only route shape (NAV_ROUTE). Exported so the store (menu-screens.taskComplete)
 * and the write protection (protect-records.js) ask the SAME question as the detail screen —
 * defense in depth (store + render + hook). Whether a `plan …` route opens the task's own
 * plan is asked only where the option is built (renderTaskDetail → opensOwnPlan).
 * @param {*} s
 * @returns {boolean}
 */
function isNavRoute(s) {
  return typeof s === 'string' && NAV_ROUTE.test(s);
}
```

- **After `planName`** (after line 92), two module-local helpers, not exported:

```js
/**
 * The plan's name as it may appear in an option label: `planName` with Unicode format
 * characters removed, used only when it is a plain file name (SAFE_NAME) and cut at
 * LABEL_NAME_MAX; otherwise 'next'.
 * @param {{plan?:string|null}} task
 * @returns {string}
 */
function labelName(task) {
  const name = planName(task).replace(FORMAT_CHARS, '');
  if (!SAFE_NAME.test(name)) return 'next';
  return name.length > LABEL_NAME_MAX ? `${name.slice(0, LABEL_NAME_MAX)}…` : name;
}

/**
 * Does this next action open the task's own plan? A `plan STAGE/FILE.md` route (already
 * NAV_ROUTE-checked, so it holds exactly one '/') qualifies only when FILE.md is the file
 * name of the task's `plan`, whatever stage folder it names (plans move between stages);
 * every other accepted route qualifies.
 * @param {{plan?:string|null}} task
 * @param {string} next
 * @returns {boolean}
 */
function opensOwnPlan(task, next) {
  if (!next.startsWith('plan ')) return true;
  if (task.plan == null) return false;
  const own = `${path.basename(String(task.plan)).replace(/\.md$/, '')}.md`;
  return next.slice(next.indexOf('/') + 1) === own;
}
```

- **In `renderTaskDetail`, replace lines 328-339** (the nav-only comment and the `if` block) with:

```js
  // Nav-only invariant: emit the next-action option ONLY when the stored value is exactly a
  // read-only route (isNavRoute) and, for a `plan …` route, the task's own plan
  // (opensOwnPlan). A crafted or `--next`-supplied `claude:approve review/x.md`, a value
  // that only begins like a route, or a route to another plan is DROPPED here (Back only) —
  // the renderer does NOT trust the caller/registry. The action is the value as stored; the
  // label carries a plan name only through labelName.
  const next = task.status === 'done' && task.result ? task.result.nextAction : undefined;
  if (isNavRoute(next) && opensOwnPlan(task, next)) {
    const gate = Number.isInteger(task.result.gate) ? task.result.gate : null;
    const label = gate != null ? 'Decision ready ▸' : `Open ${labelName(task)} ▸`;
    options.push({ label, description: 'Navigate to the next action (does not perform it)' });
    actions[label] = next;
  }
```

- **In `renderTaskDetail`'s doc comment, replace lines 281-285** (from "The task-detail screen." to "never a gate
  cross. Always a final `◀ Back` → `tasks`.") with:

```js
 * The task-detail screen. Unknown / null id → a safe "Task not found" screen whose
 * only option navigates back to the board. A done task whose `result.nextAction` is an
 * exact read-only route (isNavRoute) — and, for a `plan …` route, the task's own plan —
 * offers a single navigating option (label `Decision ready ▸` when `result.gate` is set,
 * else "Open", labelName and "▸") whose action is that route as stored — never a
 * `claude:` mutation, never a gate cross. Always a final `◀ Back` → `tasks`.
```

- Nothing else changes. `stripCtl` stays, because every other renderer in the file uses it; the action needs it no
  more, because an accepted value holds no control character.

##### Dependencies
None new (`path` is already required, line 26).

##### Called By
`taskComplete` (`src/lib/menu-screens.js` line 2596), `renderTaskDetail` (`src/lib/task-view.js` lines 333-334) and
`isNavRoute` in `src/hooks/protect-records.js` (lines 306-309, used at lines 319 and 336). `labelName` and `opensOwnPlan`
are called by `renderTaskDetail` only.

##### Data Flow
```
--next VALUE or --b64 {nextAction} (untrusted, from an agent) --taskComplete--> isNavRoute --false--> whole completion refused
                                                                              --true--> stored as given (line 2696)
.ctoc/state/tasks.json result.nextAction (untrusted, any writer) --renderTaskDetail--> isNavRoute && opensOwnPlan
      --false--> Back only
      --true--> option labelled "Decision ready ▸" or "Open" + labelName + "▸", action = the value as stored
```

##### Error Handling
- `isNavRoute` never throws: a non-string answers false before the pattern runs. `opensOwnPlan` runs only on a string
  `isNavRoute` accepted; a task with no plan answers false for a `plan` route.
- The store's refusal is unchanged: `{ ok: false, error: 'nextAction must be a navigation route', … }` and nothing is
  written (`src/lib/menu-screens.js` lines 2596-2597).

##### Cross-Platform Notes
No path is built and no file is read.

#### File: `tests/menu-task-wiring.test.js`
**Action:** MODIFY
**Purpose:** the existing task-view test file (its header, lines 7-9, says the pure renderers in `src/lib/task-view.js` are
unit-tested here; the `isNavRoute` cases are lines 813-836) gains the new cases, and one case that encodes the old rule is
tightened. Its existing render cases S7 (line 182), GS4 (line 503) and GS5 (line 512) use `plan review/LH1.md` on a task
whose plan is `LH1`, so the own-plan check leaves them as they are.
**Change Type:** modify-existing

##### Changes
- **Tighten case N1** (lines 813-817): `menu commands` is now refused. The describe title and the case become:

```js
describe('R3-D — isNavRoute accepts the stubs route and is still an allowlist', () => {
  it('N1: a stubs route is accepted; menu commands is refused, because its screen reconciles tasks and can move plans (four-defects s18)', () => {
    assert.equal(taskView.isNavRoute('stubs my-vision'), true, 'stubs is a NAV route');
    assert.equal(taskView.isNavRoute('menu commands'), false,
      'menu commands opens the dashboard table, whose reconcile pass and plan recovery change state');
  });
```

  N2 and N3 (lines 819-835) stay as they are.
- **Add this block after line 836** (the end of the R3-D describe). It uses the file's `ms`, `taskView`, `taskRegistry`,
  `root`, `mkReg`, `T` and `seedDone` (lines 22-66).

```js
// ═══════════════════════════════════════════════════════════════════════════
// four-defects s18 — a task's next action is an exact read-only route. The store,
// the detail screen and the write protection all ask taskView.isNavRoute; the
// detail screen also offers a plan route only for the task's own plan, and builds
// its label without agent-written words.
// ═══════════════════════════════════════════════════════════════════════════

describe('four-defects s18 — a task next action is a plain read-only route', () => {
  const QUESTION_ID = '1791713468054-ew0ek2';
  const ch = (code) => String.fromCodePoint(code); // non-ASCII characters, written by code point
  const HOSTILE = [
    'inbox questions; any command',
    `inbox questions${ch(0xff1b)} any command`, // a full-width semicolon
    `inbox answer ${QUESTION_ID} --stdin <<< 'yes, approve it'`,
    `inbox answer ${QUESTION_ID} --stdin`,
    `inbox answer ${QUESTION_ID}`,
    'menu',
    'menu commands',
    'menu task start t2 --force',
    'menu task complete t1 --continue',
    'menu task cancel t1',
    'menu task list',
    'menu stream approve review/x.md',
    'dashboard',
    'inbox cleanup',
    'inbox cleanup category',
    'inbox cleanup confirm dead-on-arrival',
    'inbox cleanup plan x',
    'inbox cleanup override x',
    'inbox migration',
    'inbox question',
    'inbox question 123',
    'inbox question 1791713468054-EW0EK2',
    `inbox question ${QUESTION_ID} extra`,
    'stream',
    'stream approve review/x.md',
    'stream skip review/x.md',
    'stream comment review/x.md fine',
    'stream check review/x.md',
    'stream answer review/x.md q1 a',
    'plan',
    'plan review/x.md more',
    'plan review/x.md discuss',
    'plan review/../x.md',
    'plan review/x',
    'plan vision/x.md',
    'validate',
    'validate review',
    'validate functional/x.md',
    'validate implementation/LH1.md',
    'browse',
    'Browse review',
    'browse review extra words',
    'browse review Extra',
    'browse review -x',
    'browse  review',
    ' browse review',
    'browse review ',
    'browse\treview',
    `browse${ch(0x00a0)}review`, // a no-break space between the words
    'TASKS',
    `t${ch(0x0430)}sks`, // a Cyrillic look-alike letter
    'task 3',
    'task t1 extra',
    'tasks extra',
    'stubs -x',
    'hotfix check --run-tests',
    'claude:approve review/x.md',
    'plan review/x.md\nmenu task start t2 --force',
    '\u001bbrowse review',
    '',
  ];
  const NON_STRINGS = [null, undefined, 5, ['browse', 'review'], { toString: () => 'browse review' }];
  // Accepted, stored, and offered on the task screen of a task whose plan is LH1.
  const ALLOWED = [
    'tasks', 'task t1', 'task t42',
    'browse vision', 'browse canvas', 'browse functional', 'browse implementation',
    'browse todo', 'browse in-progress', 'browse review', 'browse done',
    'browse functional review', 'browse in-progress todo-2',
    'section business', 'section implementation', 'section execution',
    'plan canvas/LH1.md', 'plan review/LH1.md', 'plan in-progress/LH1.md', 'plan done/LH1.md',
    'stubs my-vision',
    'inbox questions', 'inbox decisions', 'inbox gates', 'inbox escalations', 'inbox stale', 'inbox verify',
    `inbox question ${QUESTION_ID}`,
  ];
  // Accepted and stored, but naming a plan other than LH1: never offered on an LH1 task's screen.
  const OTHER_PLAN = ['plan in-progress/a_b.c-d.md', 'plan functional/_x.md', 'plan review/OTHER.md'];

  /** A running review task, seeded through the registry API: the scheduler is not under test here. */
  function seedRunningReview() {
    const reg = taskRegistry.load(root);
    const t = taskRegistry.addTask(reg, { kind: 'review', plan: 'LH1' });
    taskRegistry.updateTask(reg, t.id, { status: 'running' });
    taskRegistry.save(root, reg);
    return t.id;
  }

  it('S18-1: isNavRoute refuses every hostile value and every non-string', () => {
    for (const v of [...HOSTILE, ...NON_STRINGS]) {
      assert.equal(taskView.isNavRoute(v), false, `must be refused: ${JSON.stringify(v)}`);
    }
  });

  it('S18-2: isNavRoute accepts every read-only route shape', () => {
    for (const v of [...ALLOWED, ...OTHER_PLAN]) assert.equal(taskView.isNavRoute(v), true, `must be accepted: ${v}`);
  });

  it('S18-3: the store refuses each hostile value, by --next and by --b64, and completes nothing', () => {
    for (const v of HOSTILE) {
      const id = seedRunningReview();
      const res = ms.route(['menu', 'task', 'complete', id, '--next', v], root);
      assert.equal(res.ok, false, `store must refuse --next ${JSON.stringify(v)}`);
      assert.match(res.error, /navigation route/);
      const t = taskRegistry.load(root).tasks.find((x) => x.id === id);
      assert.equal(t.status, 'running', `the task must stay running for ${JSON.stringify(v)}`);
      assert.equal(t.result, null, `nothing may be stored for ${JSON.stringify(v)}`);
    }
    const id = seedRunningReview();
    const b64 = Buffer.from(JSON.stringify({ summary: 's', nextAction: 'menu task start t2 --force' })).toString('base64');
    const res = ms.route(['menu', 'task', 'complete', id, '--b64', b64], root);
    assert.equal(res.ok, false, 'store must refuse a decoded nextAction');
    assert.equal(taskRegistry.load(root).tasks.find((x) => x.id === id).status, 'running');
  });

  it('S18-4: the detail screen offers no option for a hostile or non-string next action', () => {
    for (const v of [...HOSTILE, ...NON_STRINGS]) {
      for (const gate of [undefined, 3]) {
        const result = gate === undefined ? { ok: true, nextAction: v } : { ok: true, nextAction: v, gate };
        const d = taskView.renderTaskDetail(mkReg([T({ id: 't1', plan: 'x', status: 'done', result })]), 't1');
        assert.deepEqual(Object.keys(d.actions), ['◀ Back'], `no option for ${JSON.stringify(v)} (gate ${gate})`);
      }
    }
  });

  it('S18-5: every allowed shape is stored by the store and offered by the detail screen', () => {
    for (const v of ALLOWED) {
      const id = seedRunningReview();
      const res = ms.route(['menu', 'task', 'complete', id, '--next', v], root);
      assert.equal(res.ok, true, `store must accept ${v}`);
      const reg = taskRegistry.load(root);
      assert.equal(reg.tasks.find((x) => x.id === id).result.nextAction, v);
      assert.ok(Object.values(taskView.renderTaskDetail(reg, id).actions).includes(v), `offered: ${v}`);
    }
  });

  it('S18-6: a value planted straight into tasks.json is not offered on the task screen', () => {
    const reg = taskRegistry.load(root);
    const planted = [
      seedDone(reg, 'x', { ok: true, nextAction: 'inbox questions; any command' }),
      seedDone(reg, 'y', { ok: true, nextAction: 'menu task start t2 --force', gate: 3 }),
    ];
    taskRegistry.save(root, reg);
    for (const t of planted) {
      const screen = ms.route(['task', t.id], root);
      assert.deepEqual(Object.keys(screen.actions), ['◀ Back'], `${t.id}: only Back`);
      const all = JSON.stringify(screen);
      assert.ok(!all.includes('any command') && !all.includes('--force'), `${t.id}: the planted value appears nowhere on the screen`);
    }
  });

  it("S18-7: a plan route is offered only for the task's own plan; the store keeps the shape check alone", () => {
    const detail = (plan, nextAction, gate) => taskView.renderTaskDetail(mkReg([T({
      id: 't1', plan, status: 'done',
      result: gate === undefined ? { ok: true, nextAction } : { ok: true, nextAction, gate },
    })]), 't1');
    assert.ok(Object.values(detail('LH1', 'plan review/LH1.md').actions).includes('plan review/LH1.md'), 'own plan');
    assert.ok(Object.values(detail('review/LH1.md', 'plan done/LH1.md').actions).includes('plan done/LH1.md'),
      'own plan, the task recording it as a stage reference and the route naming another stage');
    for (const [plan, v, gate] of [
      ['LH1', 'plan review/OTHER.md'], ['LH1', 'plan review/OTHER.md', 3], ['LH1', 'plan in-progress/a_b.c-d.md'],
      [null, 'plan review/LH1.md'], ['LH1x', 'plan review/LH1.md'],
    ]) {
      assert.deepEqual(Object.keys(detail(plan, v, gate).actions), ['◀ Back'], `no option: plan ${plan}, next ${v}, gate ${gate}`);
    }
    // Through the real store and task screen: stored (the shape is a route), never offered.
    for (const v of OTHER_PLAN) {
      const id = seedRunningReview();
      assert.equal(ms.route(['menu', 'task', 'complete', id, '--next', v], root).ok, true, `stored: ${v}`);
      assert.deepEqual(Object.keys(ms.route(['task', id], root).actions), ['◀ Back'], `not offered: ${v}`);
    }
  });

  it('S18-8: the option label carries the plan name only when it is a plain file name', () => {
    const RLO = String.fromCodePoint(0x202e); // a right-to-left override
    const ZWSP = String.fromCodePoint(0x200b); // a zero-width space
    const keys = (plan) => Object.keys(taskView.renderTaskDetail(mkReg([T({
      id: 't1', plan, status: 'done', result: { ok: true, nextAction: 'tasks' },
    })]), 't1').actions);
    assert.equal(keys('LH1')[0], 'Open LH1 ▸');
    assert.equal(keys('review/LH1.md')[0], 'Open LH1 ▸');
    assert.equal(keys(`LH1${RLO}evorppa`)[0], 'Open LH1evorppa ▸', 'a right-to-left override is removed');
    assert.equal(keys(`LH${ZWSP}1`)[0], 'Open LH1 ▸', 'a zero-width space is removed');
    assert.equal(keys('Approve — everything checks out')[0], 'Open next ▸', 'agent words never become a label');
    assert.equal(keys(null)[0], 'Open next ▸');
    assert.equal(keys('a'.repeat(200))[0], `Open ${'a'.repeat(80)}… ▸`, 'cut at 80 characters');
    for (const plan of [`LH1${RLO}evorppa`, `LH${ZWSP}1`, 'Approve — everything checks out']) {
      const all = keys(plan).join(' ');
      assert.ok(!all.includes(RLO) && !all.includes(ZWSP) && !all.includes('Approve'),
        `no format character and no agent words in the labels: ${JSON.stringify(plan)}`);
    }
  });

  it('S18-9: start.md — every navigation-table row is accepted or refused with its reason, and the completion recipe names every accepted shape', () => {
    const md = fs.readFileSync(path.join(__dirname, '..', 'src', 'commands', 'start.md'), 'utf8');
    // Each accepted row as start.md writes it → a filled-in sample.
    const ACCEPTED_ROWS = {
      'tasks': 'tasks',
      'task {id}': 'task t1',
      'browse {stage}': 'browse review',
      'section {name}': 'section execution',
      'plan {stage}/{file}.md': 'plan review/LH1.md',
      'stubs {slug}': 'stubs my-vision',
      'inbox questions': 'inbox questions',
      'inbox decisions': 'inbox decisions',
      'inbox gates': 'inbox gates',
      'inbox escalations': 'inbox escalations',
      'inbox stale': 'inbox stale',
      'inbox verify': 'inbox verify',
      'inbox question {id}': `inbox question ${QUESTION_ID}`, // slice 9's row
    };
    // Each refused row → [a filled-in sample, why opening it is refused].
    const REFUSED_ROWS = {
      '(no args)': ['', 'the default screen moves plans on recorded evidence when it opens'],
      'stream approve {stage}/{file}.md': ['stream approve review/LH1.md', 'crosses a gate'],
      'stream skip {stage}/{file}.md': ['stream skip review/LH1.md', 'renders the next decision through the list that moves plans on recorded evidence'],
      'stream comment {stage}/{file}.md {text}': ['stream comment review/LH1.md fine', 'records a comment'],
      'dashboard': ['dashboard', 'the dashboard table runs the reconcile pass and plan recovery'],
      'menu commands': ['menu commands', 'the dashboard table runs the reconcile pass and plan recovery'],
      'plan {stage}/{file}.md more': ['plan review/LH1.md more', 'the route ignores the third word; the sub-screen is gone'],
      'plan {stage}/{file}.md discuss': ['plan review/LH1.md discuss', 'the route ignores the third word; the sub-screen is gone'],
      'validate {stage}/{file}.md': ['validate functional/LH1.md', 'its confirm screen names only stage words, never the plan it approves'],
      'inbox cleanup': ['inbox cleanup', 'leads to the cleanup confirmation and override'],
      'inbox answer {id} --stdin': [`inbox answer ${QUESTION_ID} --stdin`, 'records an answer'], // slice 9's row
    };
    const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    const table = md.split('### Navigation Commands')[1].split('\n### ')[0];
    const commands = table.split('\n')
      .filter((l) => l.startsWith('| ') && !l.startsWith('| Command'))
      .flatMap((l) => {
        const cell = l.split('|')[1].trim();
        const spans = cell.match(/`[^`]+`/g);
        return spans ? spans.map((s) => s.slice(1, -1)) : [cell];
      });
    assert.ok(commands.length >= 20, `the navigation table was read (${commands.length} commands)`);
    for (const c of commands) {
      assert.ok(has(ACCEPTED_ROWS, c) || has(REFUSED_ROWS, c),
        `start.md navigation row "${c}" is neither accepted nor refused with a reason: classify it here and in NAV_ROUTE`);
      if (has(ACCEPTED_ROWS, c)) {
        assert.equal(taskView.isNavRoute(ACCEPTED_ROWS[c]), true, `accepted row: ${c}`);
      } else {
        const [sample, reason] = REFUSED_ROWS[c];
        assert.equal(taskView.isNavRoute(sample), false, `refused row: ${c} (${reason})`);
      }
    }
    const recipe = md.split('\n').find((l) => l.startsWith('1. `menu task complete <id> --continue'));
    assert.ok(recipe, 'the completion recipe line was found');
    for (const shape of Object.keys(ACCEPTED_ROWS)) {
      assert.ok(recipe.includes(`\`${shape}\``), `the completion recipe names ${shape}`);
    }
    assert.match(recipe, /refuses the whole completion, the continuation included/);
  });
});
```

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** the session's instructions say exactly which next actions a completion accepts and what any other value
does, and the navigation table writes plan references the one way the check accepts them.
**Change Type:** modify-existing

##### Changes
1. **The completion recipe, line 128.** In its step 1, the parenthesis "(the store rejects a `claude:` `--next`)" becomes:

```markdown
(`--next` takes exactly one read-only route: `tasks`, `task {id}`, `browse {stage}` (one more lower-case word is allowed; the screen ignores it), `section {name}`, `plan {stage}/{file}.md` (the task screen offers it only when it names the task's own plan), `stubs {slug}`, `inbox questions`, `inbox decisions`, `inbox gates`, `inbox escalations`, `inbox stale`, `inbox verify` or `inbox question {id}`; any other value — `menu`, `menu commands`, `dashboard`, `validate …`, a `stream`, `menu task` or `inbox answer` route, a `claude:` action, a flag or a shell character — refuses the whole completion, the continuation included, and records nothing; on a task its agent already completed, `--next` is ignored)
```

   Each claim was read in `taskComplete`: the refusal returns before anything is written and before the continuation runs
   (`src/lib/menu-screens.js` lines 2596-2597, the continuation at 2738-2741), and on a task its agent already completed the
   session's `--continue` call ignores `--next` (lines 2547-2554 and 2566-2579).
2. **The navigation table.** The four rows that name a plan reference without `.md` (lines 32, 33, 34 and 36) get `.md`
   after `{file}`, the one form `stream approve` already uses (line 26) and the only one the check accepts; and after the
   `browse {stage}` row (line 31) one row is inserted for `section`, which `start.md` names as a navigation route (line 85)
   and Rule 10 sends answers to (line 427), but which the table lacks:

```markdown
| `browse {stage}` | Stage plan list |
| `section {name}` | Pipeline section: business, implementation or execution |
| `plan {stage}/{file}.md` | Plan actions |
| `plan {stage}/{file}.md more` | Plan more actions |
| `plan {stage}/{file}.md discuss` | Discussion menu |
| `stubs {slug}` | Vision stubs browse (human checkpoint) |
| `validate {stage}/{file}.md` | Pre-transition validation |
```

Nothing else in the file changes.

#### File: `tests/protect-records.test.js`
**Action:** MODIFY
**Purpose:** the write protection calls this same check for a background agent's `--next` and a decoded `nextAction`
(`src/hooks/protect-records.js` lines 306-309, used at 319 and 336, reached through `subagentMayRunRoute` lines 350-365
and `taskArgsAllowed` lines 327-337), so it refuses more after this change; this case pins that through the real hook
entry.
**Change Type:** modify-existing

##### Changes
One test after case 84 (lines 482-492), inside the describe "a background agent: one reading of a command (security
review leads, 2026-10-07)" (lines 395-498). That describe already defines `MENU`, `refusedAgent`, `allowedAgent` and
`b64` (lines 396-403); `refusedAgent` and `allowedAgent` send the call with an agent id and expect the background-agent
refusal sentence or an allow.

```js
  test("84b · a background agent's next action is an exact read-only route (four-defects slice 18)", () => {
    refusedAgent(`${MENU} menu task complete t7 --next 'inbox questions; x'`);
    refusedAgent(`${MENU} menu task complete t7 --next 'menu task start t2 --force'`);
    refusedAgent(`${MENU} menu task complete t7 --next dashboard`);
    refusedAgent(`${MENU} menu task complete t7 --b64 ${b64({ summary: 'built', nextAction: 'inbox answer 1791713468054-ew0ek2 --stdin' })}`);
    allowedAgent(`${MENU} menu task complete t7 --next 'browse review'`);
  });
```

Case 83's `--next tasks` (line 476) and case 84's `nextAction: 'tasks'` (line 489) stay as they are: `tasks` is still a
route. A single-quoted `--next` value reaches the check as one word: the hook's `simpleWords` takes anything inside single
quotes (lines 377-423) and `splitCliArgs` leaves a multi-word argument list as it is (`src/commands/start.js` lines
883-887).

### Test Plan

**Framework:** `node:test` with `node:assert/strict`, as both test files use today. No test file is added, so no
documented count moves and no ratchet file is declared.

| Case | Before the change | After the change | What it pins |
|------|-------------------|------------------|--------------|
| S18-1 | FAILS: the old pattern accepts every hostile value that begins with an allowed word, the array and the object | passes | the exact shape rule, the word rule, no `i` flag, plain ASCII only |
| S18-2 | passes | passes | no read-only shape is lost |
| S18-3 | FAILS: the store completes the task for the first hostile value | passes | the store refuses, by `--next` and by `--b64` |
| S18-4 | FAILS: the detail screen offers "Open x ▸" for the first hostile value | passes | the render refuses, with and without a gate |
| S18-5 | passes | passes | the allowed shapes still round-trip through the store and the render |
| S18-6 | FAILS: the planted value is offered | passes | a value written straight into the registry file is not offered |
| S18-7 | FAILS: the detail screen offers a `plan` route naming another plan | passes | a `plan` option only for the task's own plan; the store keeps the shape check alone |
| S18-8 | FAILS: the label carries the plan name as written and uncut | passes | the label is a plain file name of at most 80 characters, or "next" |
| S18-9 | FAILS: `menu commands` is accepted, the row `plan {stage}/{file}` without `.md` is not classified, and the recipe names no shape | passes | `start.md` and the check cannot drift apart |
| N1 (tightened) | FAILS: `menu commands` is accepted | passes | `menu commands` is refused |
| 84b (`tests/protect-records.test.js`) | FAILS: three refused calls are allowed (the `inbox questions; x`, forced-start and `inbox answer` values); the `dashboard` call is refused already, because `dashboard` is not one of the old first words | passes | the write protection refuses with the check |

The cases that pass before the change pin what must keep working; the red evidence is S18-1, S18-3, S18-4, S18-6, S18-7,
S18-8, S18-9, N1 and 84b. `tests/w10-task-arg-splitting.test.js` case 4 (`browse functional review`) passes before and
after, because a third word after `browse` STAGE is a shape (Decision 7).

Mutant checks in Step 10, after the change, each made in the working tree, run, recorded and reverted (confirmed with
`git diff`):
- drop the `$` anchor: S18-1 fails (`tasks extra`, `task t1 extra`).
- go back to the first-word rule: S18-1, S18-3, S18-4, S18-6, S18-9 and 84b fail.
- strip control characters before the test again: S18-1 fails (`\u001bbrowse review`).
- replace the `typeof` test by turning any value into a string first: S18-1 fails on the object whose `toString` gives
  `browse review`.
- add the `i` flag to `NAV_ROUTE`: S18-1 fails (`Browse review`, `TASKS`).
- put `validate` back beside `plan` in the pattern: S18-1 (`validate functional/x.md`) and S18-9 (its refused row) fail.
- drop `opensOwnPlan` from the condition in `renderTaskDetail`: S18-7 fails.
- build the label from `planName` instead of `labelName`: S18-8 fails.

**Error paths:** every refused value at the store, the render and the write protection. **Edge cases:** non-strings,
control and format characters, a tab, a no-break space, double, leading and trailing spaces, a full-width semicolon, a
Cyrillic look-alike, capitals, a dot-dot file part, a task with no plan, a plan recorded as a stage reference, a
gate-labelled option, a 200-character plan name.

**Coverage:** `isNavRoute`'s two operands run both ways in S18-1 and S18-2; `opensOwnPlan`'s three outcomes (not a plan
route, no plan, a comparison either way) in S18-5 and S18-7; `labelName`'s three (not plain, cut, plain) in S18-8.
Coverage of `src/` does not fall.

### Security Review
- [x] Input validation: the next action comes from a background agent (`--next`, `--b64`) or from any writer of
  `.ctoc/state/tasks.json`; both are untrusted. The check is an exact allowlist of whole values, tested as given; a `plan`
  route is also checked against the task's own plan where the option is built.
- [x] (Closed by Decision 31: the recipe states the route character set and S18-9 pins it.) Command injection: no accepted value holds a space other than the single separators of its shape, a quote, a
  semicolon, a less-than or greater-than sign, a pipe, a dollar sign, a backtick, a control or format character or any
  character outside plain ASCII, so the session cannot be steered into a second command, a here-string or a flag.
- [x] Gate safety: no accepted value moves a plan, changes a task, or records an answer, an approval or a comment when it
  opens (the rule; the Technical approach table; confirmed in Step 11). `validate`, whose confirm screen hides the plan it
  approves, is not accepted. What the owner picks on an opened screen is his own act.
- [x] Label spoofing: the option label is "Decision ready ▸", "Open next ▸", or "Open" plus a plain ASCII file name of at
  most 80 characters and "▸", so agent words such as "Approve — everything checks out", a right-to-left override or a
  zero-width space never become a label.
- [x] (Overtaken by Decision 24: the hook's refusal has been off since commit 395bd70a.) Defense in depth is kept: the store, the render and the write
  protection's file is not edited; its decision on a background agent's `--next` and decoded `nextAction` follows this
  function and refuses more — a hook behaviour change, put to the owner (Decision 10).
- [x] Denial of service: the patterns are linear, so a long stored value costs time in proportion to its length; the
  label is cut at 80 characters.
- [x] No secrets, no file access, no new dependency.

### Wiring — the live call sites
- The store: `menu task complete` (`src/lib/menu-screens.js` route lines 3029-3030, `taskCommand` line 2977) runs
  `taskComplete`, which calls `taskView.isNavRoute` at line 2596.
- The render: `task` and an id (route lines 3038-3039) runs `taskDetailScreen` (lines 3004-3007), which calls
  `renderTaskDetail`; it calls `isNavRoute`, `opensOwnPlan` and `labelName` in the block that today is
  `src/lib/task-view.js` lines 328-339.
- The write protection: `src/hooks/protect-records.js` lines 306-309, 319 and 336; the hook is registered alone in
  `hooks/hooks.json` (its header, lines 4-6).
- The session's instructions: `src/commands/start.md` is the file `/ctoc:start` loads; its completion recipe (line 128)
  is what the session follows when it completes a task.
- The root is the shipped slash command `/ctoc:start` (`src/commands/start.md`, which runs `src/commands/start.js`).
- No module is added; the two new helpers are module-local and called by `renderTaskDetail`.

## Acceptance Criteria

- [x] `isNavRoute` answers true only for a string that is exactly one of these shapes: `tasks`; `task` and an id of `t`
  and digits; `browse` and one of the eight stage words, optionally followed by one word of lower-case letters, digits and
  hyphens; `section` and one of the three section words; `plan`, a plan stage, a slash and a plan file name ending in
  `.md`; `stubs` and a slug; `inbox` and one of `questions`, `decisions`, `gates`, `escalations`, `stale`, `verify`;
  `inbox question` and a question id of 13 to 15 digits, a hyphen and six lower-case letters or digits.
- [x] Every hostile value in the S18 list is refused by the function, by the store (by `--next`, and a decoded
  `nextAction` by `--b64`), and by the detail screen with and without a gate, and the task stays running with nothing
  stored.
- [x] `menu`, `menu commands`, `dashboard`, `validate`, every `menu task` and `menu stream` value, every `stream` route,
  `inbox answer`, `inbox cleanup` and its sub-routes are among the refused values.
- [x] A value with a control character, a tab, a no-break space, two spaces, a leading or trailing space, a character
  outside plain ASCII, a capital where the shape is lower-case, a shell character or a word beginning with `-`, and any
  non-string, is refused.
- [x] Every allowed shape is still stored by the store and offered by the detail screen as its action; a `plan` route is
  offered only when it names the task's own plan, and one naming another plan is stored but not offered.
- [x] The option label is "Open" plus the plan name only when that name, with Unicode format characters removed, is a
  plain file name, cut at 80 characters; otherwise "Open next ▸". A right-to-left override or a zero-width space never
  reaches a label, and a plan named "Approve — everything checks out" gives "Open next ▸".
- [x] A hostile value written straight into the task registry file is not offered on the task screen and does not appear
  on it.
- [x] `start.md`'s completion recipe names every accepted shape and says any other value refuses the whole completion,
  the continuation included; every row of its navigation table is accepted or refused with its reason (S18-9).
- [x] (Case 84b withdrawn, Decision 24: the hook's refusal is off by the owner's order of 2026-10-15; nothing to check.) A background agent's completion with `--next 'inbox questions; x'`, `--next 'menu task start t2 --force'`,
  `--next dashboard`, or a `--b64` next action that is an `inbox answer` route, is refused by the write protection;
  `--next 'browse review'` is allowed (84b).
- [x] Opening each allowed screen writes nothing beyond the question sweep and log lines (Step 11, both checks recorded).
- [x] Case N1 now asserts that `menu commands` is refused; no other existing case changed;
  `tests/w10-task-arg-splitting.test.js` passes unchanged.
- [x] The red cases were seen failing before the change, and each mutant was killed. (Case 84b and its mutant withdrawn, Decision 24.)
- [x] Only `src/lib/task-view.js`, `src/commands/start.md`, `tests/menu-task-wiring.test.js` and
  `tests/protect-records.test.js` changed.
- [x] `npm test` passes: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped
  and 0 flaky.

## Risks

- **A completion that passes a now-refused `--next` is refused whole** (the store refuses the whole completion, lines
  2596-2597), and for a background agent the write protection refuses the command first. Main's task registry holds the
  next action `browse implementation` twice and no other (read in `.ctoc/state/tasks.json` for this plan), and no agent or
  skill file mentions `--next` or `nextAction` (search over `agents/` and `skills/`: 0 files). The session's own
  completions follow `start.md`'s recipe, which now names the shapes. Likelihood LOW, impact MEDIUM: a refused completion
  is loud, and it can be run again without the option.
- **The store's refusal text still says "(not a gate-crossing action)"** (`src/lib/menu-screens.js` line 2597), which is
  narrower than the new rule. It is not changed here, because slice 7 declares `src/lib/menu-screens.js` and is being
  built. Listed under Neighbours.
- **A read-only route added later is refused until it is listed here.** That fails closed: the option is missing, nothing
  runs; S18-9 fails when a row is added to `start.md`'s navigation table without being classified.
- **A file part with a dot-dot inside it** (for example `a..md`) fits the plan shape; the screen itself refuses it and shows
  its invalid-reference screen (`isUnsafePlanFile`, `src/lib/streaming-gate.js` lines 98-107), which only reads. On the
  task screen it is offered only when the task's own plan has that file name. Likelihood LOW, impact LOW.
- **`src/commands/start.md` is also declared by slices 9 and 14.** Builds run one at a time, and slices 9 and 14 are
  already approved for building while this one is not, so this slice is expected to be built after them; whichever order
  the builds take, this slice's builder re-reads the navigation table (lines 21-40), the completion recipe (line 128) and
  lines 85 and 427 at Step 9 and edits the lines as they are then. Slice 9 adds the `inbox question` and `inbox answer`
  rows to the table; S18-9 already classifies both, so it passes whether or not slice 9 has been built. Slice 14 changes
  lines 50, 65 and 256 and Rule 13, and adds a paragraph after the one that ends "its own agent file says how" (line 149
  today); none of those is a line this slice changes.
- **Found in the review round, for the owner to schedule (not built here):**
  - **The "Decision ready" flag is the agent's to set.** An agent sets `--gate` on its own completion (`TASK_GRAMMAR`,
    `src/hooks/protect-records.js` line 294), and the detail screen then labels the next action "Decision ready ▸"
    (`src/lib/task-view.js` line 336) and the inbox line says "Decision ready" with the plan's name (line 364), for any
    task and pointing at any accepted route. Deriving the flag from the plan's real folder (a plan sitting at a decision
    stage) instead of the agent's word would end that.
  - **An agent's task summary is stored uncapped and shown as fact.** `taskComplete` stores `--summary` or the `--b64`
    summary as given, with no length cap (`src/lib/menu-screens.js` lines 2590 and 2691-2692), and the detail screen shows
    it to later sessions (`src/lib/task-view.js` lines 314-315) with only control characters removed, not marked as
    unverified agent text.
  - **The task registry is not write-protected.** `.ctoc/state/tasks.json` is not on the write protection's list
    (`src/hooks/protect-records.js` lines 10-22), so a background agent can write it directly and add `implement` and
    `classify` tasks that the session will start from `promote[]`. Closing it is a hook change.
  - **The completion recipe passes the summary in double quotes** (`--summary "…"`, `src/commands/start.md` line 128). The
    shell still expands a dollar-parenthesis and backticks inside double quotes, so an agent's summary pasted there could
    run a command in the main session's shell. Passing agent text only through `--b64` would close it.

## Decisions Taken Under Ambiguity

1. **The rule, and the two writes it allows.** A route is refused when opening it moves a plan, changes a task, or records
   an answer, an approval or a comment. The question sweep that the plan screen and the default screen run on open, and
   log lines, are allowed: the sweep promotes or discards a waiting question file and records nothing that the owner or a
   gate reads as decided. This corrects the `plan` row, which an earlier version of this plan called a pure read on the
   strength of its comment (`src/lib/streaming-gate.js` lines 1511-1512); the sweep runs through `nextUnansweredQuestion`
   (line 1573, the sweep at line 404). The default screen stays refused, because it also moves plans on recorded evidence.
2. **`menu`, `menu commands` and `dashboard` are refused.** `start.md` lists them as navigation, but the screens they open
   run the reconcile pass (which can save the task registry) and plan recovery (which can move a plan back to todo). The
   cost is case N1's old assertion and any stored `menu` next action (main has none).
3. **`validate` is not a shape.** Opening it only validates, but its clean screen offers "Confirm approve" under a
   question that names only the two stage words (`src/lib/menu-screens.js` lines 2030 and 2071-2074), so the owner could
   approve a plan the screen does not name. A plan's own screen offers its validation itself (`streaming-gate.js` lines
   1611-1628), so nothing is lost.
4. **A `plan` route is checked against the task's own plan where the option is built,** in `renderTaskDetail`, not in
   `isNavRoute`: the store and the write protection keep the shape check alone, so a completion naming another plan is
   stored but never offered. The own plan is the file name of the task's `plan` field, `.md` added when it is missing,
   whatever stage folder the route names, because plans move between stages.
5. **The label.** Unicode format characters (`\p{Cf}`) are removed first; the name is used only when it is then
   `SAFE_PLAN_FILE`'s characters without `.md`, and is cut at 80 characters with an ellipsis. 80 keeps CTOC's long plan
   names readable (this plan's file name is 110 characters) and bounds a crafted one; what remains is always plain ASCII.
   "Decision ready ▸" stays as it is; the flag behind it is listed under Risks for the owner.
6. **`inbox question` QID is a shape** (slice 8's full-question view, which writes nothing), with QID exactly
   `QUESTION_ID_RE`. This slice depends on slice 8, because until slice 8 is built the words open the classic dashboard.
7. **`browse` STAGE takes one optional word, which the route ignores** (route line 3068 passes only the stage), so it opens
   the same read-only screen. The word is lower-case letters, digits and hyphens, so it carries no flag, capital or shell
   character. `tests/w10-task-arg-splitting.test.js` case 4 (`browse functional review`) passes unchanged, so that file is
   not declared.
8. **`plan` STAGE/FILE `more` and `discuss` are refused.** `start.md` lists them (lines 33-34), but the route ignores the
   third word and those sub-screens are gone (`src/lib/menu-screens.js` lines 3093-3100); the two-word shape opens the same
   screen.
9. **`inbox migration` is refused.** Its screen only reads, but `start.md`'s navigation table does not list it.
   `section` is allowed because `start.md` names it as a navigation route (line 85); this slice adds its missing table row.
10. **The hook file is not edited, but the write protection refuses more.** It calls `isNavRoute` for a background agent's
    `--next` and decoded `nextAction`, so a completion that passed before — `inbox questions; x`, `menu task start t2
    --force`, an `inbox answer` route — is refused after. That is a change in hook behaviour, which the parent plan and
    the project rules reserve for the owner's explicit approval; it is put to him at this plan's crossing (the question
    below), recommended yes because it only ever refuses more. **Closed, not waiting (amended 2026-10-16, Decision 24):**
    the owner's order of 2026-10-15 (commit 395bd70a) turned the hook's refusal of background agents' menu routes off,
    so the write protection no longer decides on a `--next` at all. The question below is overtaken and nobody needs to
    answer it; the store and the detail screen are now the only guard on a stored next action.
11. **Each argument is a closed list or a narrow shape:** the stage and section words are the route's own lists; the plan
    file mirrors `SAFE_PLAN_FILE`; the stub slug uses the same leading-character rule without `.md`; the task id mirrors
    the board's `TASK_ID`; the question id mirrors `QUESTION_ID_RE`.
12. **The value is tested as given.** Today control characters are removed before the test (line 78); now any control
    character makes the value refused, because a cleaned value is not what was stored.
13. **One anchored pattern holds every shape.** The owner's word rule (single spaces, no word beginning with `-`) holds by
    construction, because every shape is made of such words; the tests pin it with their own hostile values. There is no
    `i` flag, and every class is plain ASCII.
14. **`CLAUDE_ACTION` is deleted.** Every `claude:` value fails the pattern; cases GS1-GS3 and S18-1 still pin it.
15. **The existing task-view test file is used,** `tests/menu-task-wiring.test.js` (its header, lines 7-9), so no test
    file is added and no count moves.
16. **Non-strings are refused.** Today an array is turned into a string first and can pass (line 78).
17. **`start.md`: the recipe names the shapes; the table gets `.md` and a `section` row.** `.md` on the four plan-reference
    rows matches the form `stream approve` already uses (line 26) and the only form the check accepts. The `more` and
    `discuss` rows stay; their removal is listed under Neighbours.
18. **Four files, over the ~1-3 budget,** because the session's instructions and the write protection's tests describe or
    enforce this same check and must land with it. (Fix round 2026-10-16: only three of them changed; see Decision 24.)
19. **The recipe passes the agent's route single-quoted, and only when it matches a listed shape (security review, fix
    round 2026-10-16).** An agent's route reaches the session's shell before `isNavRoute` runs, so `tasks; echo X`
    written unquoted after `--next` would run. `src/commands/start.md` now writes `[--next '<route>']` (`<navroute>`
    renamed `<route>`), says to include `--next` only when the route matches one of the listed shapes character for
    character, always inside single quotes, and otherwise to leave it out, never repair it. None of the shapes holds a
    quote, so a matching route cannot close the quotes. "A shell character" became "a shell character inside the quotes".
    S18-9 pins the quoted placeholder, the absence of `<navroute>` and the three sentences. The summary stays in double
    quotes; that is the open item under Risks ("The completion recipe passes the summary in double quotes"), not this
    slice's.
20. **`isNavRoute` caps the value at 256 characters.** `typeof s === 'string' && s.length <= 256 && NAV_ROUTE.test(s)`.
    The longest file name under `plans/` is 126 characters (listed on 2026-10-16), so `plan in-progress/<name>` is at most
    143 characters and a real own-plan route is never refused. The cap bounds what a stored value costs the pattern and
    the screen. S18-1 gained a 300-digit `task t…`, a 300-character `stubs …` and a 257-character `stubs …`; S18-2 gained a
    256-character value that is accepted.
21. **The label of a `plan` route is built from the route's own file name.** `labelName(task, next)` takes the name from
    the already-checked `FILE.md` of the route (without `.md`) for a `plan` route, and from the task's plan for every
    other route, then applies the same plain-file-name test and the 80-character cut. Behind `opensOwnPlan` the two names
    are always the same string (the route's file part is plain ASCII and equals the task plan's base name), so this change
    cannot be observed through `renderTaskDetail`: no red run exists and none is claimed. The mutant that builds the label
    from the task's plan again was run and no case fails. It is a second line of defence for the day the own-plan
    check changes. Case S18-7b writes the registry directly: a plan route to the task's own plan is offered and labelled
    with the route's plan; a task with plan OTHER and a route to a different plan is not offered. The plan's acceptance
    wording "one naming another plan is stored but not offered" is read as the store path: the store keeps the shape
    check alone, and a plan route to another plan is stored; on the screen, the own-plan check and the route-derived
    label hold for any writer of the registry, but the check is only as good as the `plan` field it reads, which a direct
    writer sets himself. `opensOwnPlan` stays (Decision 4, the CTO Chief's ruling); it was not relaxed to make a case go red.
22. **`start.md` classification: the owner's reply is one class, a stored next action another.** The list at lines 88-90
    classifies the owner's own reply, and `menu`, `validate`, `stream` and `dashboard` must still render when he picks
    them (the next sentence relies on `stream approve`). It now says a route an agent stored as a task's next action is a
    NAV route only when it is one of the shapes the completion recipe lists. The "Ready for inspection" status line shows
    the agent's route only when it is one of those shapes, and otherwise ends without a route. S18-9 pins both sentences.
23. **Two comments said the write protection guards the value.** The comment above `isNavRoute` in
    `src/lib/task-view.js` and the one above the S18 block in `tests/menu-task-wiring.test.js` now read: the store and the
    detail screen ask this; the write protection still calls it, but its background-agent refusal has been off since
    commit 395bd70a (2026-10-15), so today it decides nothing.
24. **Case 84b is withdrawn, not written; the plan lines that still describe the hook as a live check are overtaken by this
    decision.** The refusal it asserts is off by the owner's order of 2026-10-15 (commit 395bd70a), so the case can never go
    red. If the owner turns that refusal back on, 84b must be written then. Decision 10's owner question is closed. The
    lines below stay as approved and are overtaken: Dependency Graph (the `protect-records.js#isNavRoute` line and the
    `tests/protect-records.test.js --spawns-->` line); the Test Plan's 84b row, its red-evidence sentence ("S18-1, … and
    84b") and the mutant line "go back to the first-word rule … 84b fail"; the Security Review's "Defense in depth" box
    and its "Command injection" and "Input validation" wording about the hook; the Wiring bullet "The write protection";
    acceptance boxes "A background agent's completion with `--next 'inbox questions; x'`…" and "The red cases were seen
    failing"; and Step 13's "the write protection still refuses a `claude:` next action". Only a checkbox line can be
    marked in place without arming a hash mismatch (the hashed specification excludes checkbox lines, the execution
    sections and these decisions, and nothing else); so the in-place marks are made on those first lines, and every other
    line is overtaken here and by the Execution Record. `tests/protect-records.test.js` is not edited.
25. **Low items.** S18-7 gained `[null, 'plan review/null.md']` and `['x\\LH1.md', 'plan review/LH1.md']` (a backslash
    plan reference); S18-8 gained an exactly-80-character name with no ellipsis and an 81-character one with it; S18-3's
    `--b64` part now asserts `result` stays null. `planName` and `opensOwnPlan` use `path.posix.basename`, so a plan
    reference reads the same on every platform. On this platform the posix and native base names agree, so the backslash
    case cannot be red before the change; it was shown to bite with a mutant that swaps in `path.win32.basename` (S18-7
    fails).
26. **Step 11, "opening a screen writes nothing" (b), was run** in a temporary project; the result is in the Execution
    Record.
27. **(a) The rule's wording also has CTOC's own setup repair.** Check (a) found a third allowed write besides the sweep and
    the log lines: `src/commands/start.js` `ensureInitialized` runs before every screen and, only when the setup check finds
    something missing, writes the settings file, the Iron Loop state file and the `plans/*` folders. It moves no plan,
    changes no task and records no answer, so it passes the rule, but Decision 1 and the comment above `NAV_ROUTE` do not
    name it. The clause goes into the next slice that edits `src/lib/task-view.js`'s route comment and the plan rule, "agent
    notes are capped and the owner decides what is ready". Not edited here: it would change the declared files after the
    passing test evidence.
28. **(b) The recipe at `src/commands/start.md` line 131 needs an explicit character set.** A route matches only when every
    character is an ASCII letter, digit, space, `/`, `.`, `_` or `-`; any other character, above all a quote, means leave
    `--next` out. Its test must pin that. The `--summary "…"` double-quote risk (Risks) also stays open. Both go to the
    slice "agent text never reaches the shell unquoted", which carries agent text out of the shell. Not done here, because a
    change now would make this slice's passing test evidence stale.
29. **(c) The Step 13 re-check gave a warn verdict, not a block.** The blocking finding is fixed, shown through `/bin/sh`,
    `/bin/bash` and `/bin/zsh`. gitleaks, trufflehog, semgrep and codeql are not installed; CTOC's own secrets scanner and
    eslint-plugin-security ran clean. The release runs the secrets detector and the static scanner on the combined change.
30. **(d) The recipe's per-argument character sets (the final review's finding 4) go with Decision 28 (b),** to the slice
    "agent text never reaches the shell unquoted". Until then the recipe names whole shapes, not each argument's characters.
31. **The recipe now states the route character set and each argument's limits; this replaces Decision 28's hand-off of (b) and Decision 30's hand-off of (d) to the slice "agent text never reaches the shell unquoted".** The security review's finding `46b5cf9f89a6` (a route written single-quoted with a quote inside still ran a second command in sh, bash and zsh) leaves the Command injection box open until the recipe names the character set and S18-9 pins it, so the change is made in this slice (rejection round, revision 1). `src/commands/start.md` line 131 now reads: "A route matches only when every character is an ASCII letter, digit, space, `/`, `.`, `_` or `-`; any other character — a quote above all — means leave `--next` out." Then, as one sentence for the final review's finding 4: "Per argument: `plan {stage}` is never `vision`; `{id}` after `task` is `t` and digits; `{id}` after `inbox question` is 13 to 15 digits, a hyphen and six lower-case letters or digits; `{slug}` and the plan file start with a letter, digit or underscore and go on with letters, digits, `.`, `_` or `-`; the whole route is at most 256 characters." Wording chosen: the per-argument limits fit one sentence, so they are one; `plan {stage}` is stated by what it excludes (`vision`, the one word `browse` allows that `plan` does not) because the recipe already lists the stages elsewhere. S18-9 requires the character-set sentence word for word and each limit's phrase. The `--summary "…"` double-quote risk is unchanged: it stays with "agent text never reaches the shell unquoted".

**Question for the owner at this plan's crossing — the write protection refuses more.** After this change a background
agent's `menu task complete` whose `--next` or decoded `nextAction` passed the old first-word check but is not an exact
read-only route is refused by the write protection, without its file being edited. Options: (a) **Recommended:** accept
it — the protection only ever refuses more, never allows more, and every value it newly refuses is one the store now
refuses too, so the agent's completion fails loudly either way; (b) keep the hook's old decision — it needs a copy of the
old first-word check inside the hook, so the hook would let through what the store refuses.

**Closed, not waiting (Decisions 10 and 24):** overtaken by the owner's order of 2026-10-15 (commit 395bd70a), which turned the
hook's refusal of background agents' menu routes off. Nobody needs to answer this.

## Neighbours (seen, not built here; scheduling is the owner's)

- The store's refusal text (`src/lib/menu-screens.js` line 2597) says "(not a gate-crossing action)"; once slice 7 is
  built, it could name the allowed shapes.
- `start.md` lists `plan` STAGE/FILE `more` and `discuss` (lines 33-34), which the route no longer has, and does not list
  `inbox migration` in its navigation table.
- `docs/ENFORCEMENT.md` (lines 348-349) says a `--next` must be a navigation route without naming the shapes.
- The write protection still lets a background agent run `menu`, `menu commands` and `dashboard` itself
  (`subagentMayRunRoute`, `src/hooks/protect-records.js` lines 353-357), whose screens run the reconcile pass and plan
  recovery. A hook decision for the owner; not built here.
- The detail screen's `plan:` line (`src/lib/task-view.js` line 312), the board rows and the inbox line show the plan name
  with only control characters removed; bidirectional and zero-width characters stay there.
- `tests/w10-task-arg-splitting.test.js` case 4's comment (lines 111-115) quotes the old first-word pattern; the case
  passes unchanged.

## Execution Plan

### Step 8: TEST
- [x] (Case 84b withdrawn, Decision 24.) Write the S18 block (S18-1 to S18-9) and the tightened N1 in `tests/menu-task-wiring.test.js`, and case 84b in
  `tests/protect-records.test.js`, exactly as the File Specifications say.
- [x] Run `node --test tests/menu-task-wiring.test.js tests/protect-records.test.js` before any change to
  `src/lib/task-view.js` or `src/commands/start.md`, and record each case's result. It must match the Test Plan's table:
  S18-1, S18-3, S18-4, S18-6, S18-7, S18-8, S18-9, N1 and 84b fail; S18-2 and S18-5 pass; inside 84b the `dashboard` call
  is refused already. If any row differs, stop and record it.

### Step 9: PREPARE
- [x] Confirm slice 8 is built: in a temporary project, `route(['inbox', 'question', '1791713468054-ew0ek2'], root)`
  returns slice 8's question view (its one-sentence refusal for a missing question), not the classic dashboard. If it
  returns the dashboard, stop: this slice depends on slice 8.
- [x] Re-read `src/lib/task-view.js` lines 26-92 and 280-347, `src/lib/menu-screens.js` lines 2589-2598 and 3016-3134,
  `src/commands/start.md` lines 21-40, 85-87, 128 and 427 (slices 9 and 14 also declare that file), and
  `tests/protect-records.test.js` lines 395-498; record any line shift.
- [x] Record `git diff --name-only` for the four declared files.

### Step 10: IMPLEMENT
- [x] `src/lib/task-view.js`: the new comment, `NAV_ROUTE`, `SAFE_NAME`, `FORMAT_CHARS` and `LABEL_NAME_MAX` in place of
  lines 41-56; the new `isNavRoute` with its JSDoc; `labelName` and `opensOwnPlan` after `planName`; the new
  `renderTaskDetail` block and doc-comment sentence; exactly as specified.
- [x] `src/commands/start.md`: the completion recipe's parenthesis on line 128, `.md` on the four plan-reference rows of
  the navigation table, and the `section {name}` row, exactly as specified.
- [x] Run `node --test tests/menu-task-wiring.test.js tests/protect-records.test.js tests/w10-task-arg-splitting.test.js`
  and record that every case passes.
- [x] Run the eight mutant checks from the Test Plan against the changed source, record which case fails for each, revert,
  and confirm with `git diff`.

### Step 11: REVIEW
- [x] The critic checks every allowed shape against the screen it opens (the Technical approach table), every refused
  route against its reason, that the only changed existing expectation is N1 with its reason, and that no caller of
  `isNavRoute` needed a change.
- [x] The critic confirms that opening each allowed screen writes nothing through its helper modules —
  `src/lib/state.js`, `src/lib/inbox.js`, `src/lib/stale-detector.js`, `src/lib/step-13-verify.js`,
  `src/lib/documented-counts.js` and every other module a screen calls — apart from the question sweep and log lines.
  Both checks are recorded:
  - (a) Trace the call graph from each screen function (`taskBoardScreen`, `taskDetailScreen`, `stageBrowse`,
    `sectionBrowse`, `planDecisionScreen`, `visionStubsBrowse`, the six inbox doors and slice 8's `inboxQuestionScreen`)
    to every write it can reach. A presence search for this plan found file writes at `src/lib/inbox.js` lines 108, 162,
    206, 619-635, 732-807 and 942, `src/lib/state.js` lines 429-442 and 554-557, `src/lib/stale-detector.js` lines
    971-975 and `src/lib/step-13-verify.js` lines 952-953, and none in `src/lib/documented-counts.js`; whether an allowed
    screen reaches any of them is what the trace answers, not the search.
  - (b) Open each allowed route once through `route` in a temporary project seeded with a plan in each stage, a waiting
    question file, an inbox question and a task registry holding a running and a done task, and compare every file's
    bytes before and after, apart from `.ctoc/streaming/questions/` and `.ctoc/logs/`.
  A write found either way is a finding: the shape leaves the list, or the owner is asked.
- [x] The critic reads `start.md`'s recipe as the session would and confirms the shapes it names are exactly those
  `NAV_ROUTE` accepts.

### Step 12: OPTIMIZE
- [x] Confirm the patterns are module-level literals compiled once and record the S18 block's run time. Apply the review's
  non-behavioural findings.

### Step 13: SECURE
- [x] (The write-protection clause below is overtaken by Decision 24.) The security scanner confirms that no accepted value can carry a second command, a here-string, a flag, a control or
  format character or a non-ASCII look-alike; that every accepted route opens a screen that writes nothing beyond the sweep
  and log lines; that a `plan` option is offered only for the task's own plan; that no option label carries agent text
  other than a plain file name; and that the write protection still refuses a `claude:` next action.

### Step 14: VERIFY
- [x] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped,
  0 flaky. Record the test count and the coverage figure, and that `tests/w10-task-arg-splitting.test.js`,
  `tests/menu-screens-coverage.test.js`, `tests/menu-protocol.test.js` and
  `tests/instruction-surfaces-say-the-moment.test.js` pass unchanged.

### Step 15: DOCUMENT
- [x] The comment above `NAV_ROUTE` states the rule, every allowed shape and every refused family with its reason, and
  `start.md`'s recipe names the shapes. No document under `docs/` lists them (record the search
  `isNavRoute|navigation route` over `docs/` at this step).

### Step 16: FINAL-REVIEW
- [x] Every acceptance box is checked against the record of Steps 8-14, with the red results, the mutant results, both
  Step 11 write checks and the final suite figures shown.

## Decisions Taken Under Ambiguity

Decided by the recommended option when this plan moved on; none of these needed the human.

- What this review covered, and what it saw that this slice does not fix. — Noted (question q98-critique-coverage-r1791815151398)

## Execution Record

### Step 8 red run (tests written, source untouched)
`node --test tests/menu-task-wiring.test.js` before any change to `src/lib/task-view.js` or `src/commands/start.md`: 67 tests, 59 pass, 8 fail. Failing: N1 (`menu commands` accepted), S18-1 (first hostile value `inbox questions; any command` accepted), S18-3 (store completes the task), S18-4 (detail screen offers "Open x"), S18-6 (planted value offered), S18-7 (a plan route naming another plan offered), S18-8 (right-to-left override reaches the label), S18-9 (`menu commands` row accepted). S18-2 and S18-5 pass. This matches the Test Plan table for every row except 84b.

### Case 84b not written: the premise is gone
Case 84b (`tests/protect-records.test.js`) cannot be written as specified. Commit 395bd70a (2026-10-15, "the record-write and background-agent refusals are off", the owner's order "remove that hook block, it is wrong") turned the background-agent refusal off: the describe at tests line 398 now says "allowed since 15 Oct 2026", every case there asserts `allowedAgent`, and the helper `refusedAgent` the plan names no longer exists. `isNavRoute` in `src/hooks/protect-records.js` (lines 306-309, used at 319 and 336) is still called, but only through `subagentMayRunRoute`, whose refusal is not applied to the call any more, so a `refusedAgent(...)` call cannot be red before or green after. Nothing was written to `tests/protect-records.test.js`. Step 8 (both boxes) is left unticked for this reason; the Test Plan's 84b row, the acceptance box on the write protection and Decision 10's owner question are stale and need an upstream ruling.

### Step 9 prepare
Slice 8 is built: `route(['inbox','question','1791713468054-ew0ek2'], root)` in a temporary project returns the question view's "Nothing to show: there is no question ..." screen, not the dashboard. `git diff --name-only` for the four declared files before the build: `src/commands/start.md` only (other slices' uncommitted work). Table and recipe lines have shifted in `src/commands/start.md` (the recipe is now line 130, because slice 9 added rows and slice 14 text); slice 9's `inbox question {id}` and `inbox answer {id} --stdin` rows are present and S18-9 classifies both.

### Step 10 implement and mutants
Changed: `src/lib/task-view.js` as specified, with one deviation: the optional word after `browse STAGE` is written `(?: [a-z0-9][a-z0-9-]*|)` instead of `(?: [a-z0-9][a-z0-9-]*)?`, because eslint `security/detect-unsafe-regex` flags the specified form (checked with `safe-regex`: only that alternative was unsafe). The language is identical; a comment above `NAV_ROUTE` says so. `src/commands/start.md`: the recipe parenthesis, `.md` on the four plan-reference rows, the `section {name}` row. `node --test tests/menu-task-wiring.test.js tests/protect-records.test.js tests/w10-task-arg-splitting.test.js`: 172 tests, 172 pass, 0 fail, 0 skipped. Mutants against the changed source, each killed, then the saved copy written back and compared byte for byte with `cmp` (`git diff` cannot isolate this slice in `src/commands/start.md`, but `src/lib/task-view.js` carries only this slice): no `$` anchor, killed by S18-1, S18-3, S18-4, S18-6, S18-9; first-word rule, killed by N1, S18-1, S18-3, S18-4, S18-6, S18-9; strip control characters first, killed by S18-1, S18-3, S18-4; coerce to string, killed by S18-1, S18-4; `i` flag, killed by S18-1, S18-3, S18-4; `validate` beside `plan`, killed by S18-1, S18-3, S18-4, S18-9; drop `opensOwnPlan`, killed by S18-7; label from `planName`, killed by S18-8. The 84b mutant was not run (no 84b).

### Step 12 optimize
`NAV_ROUTE`, `SAFE_NAME` and `FORMAT_CHARS` are module-level literals compiled once. The S18 block's nine cases ran in 0.2 ms to 25 ms each (S18-3 about 25 ms, S18-5 about 17 ms, the rest under 2 ms). No non-behavioural review findings yet (the review has not run).

### Step 14 affected tests (the full gate is the completion's)
Also run and green (303 tests, 0 fail, 0 skipped): `tests/false-green-fence.test.js`, `tests/menu-screens-coverage.test.js`, `tests/menu-protocol.test.js`, `tests/instruction-surfaces-say-the-moment.test.js`, `tests/ctoc-start-command.test.js`, `tests/no-phantom-command-family.test.js`, `tests/shipped-recipes-execute.test.js`, `tests/shipped-cleanup-recipe-executes.test.js`, `tests/r3b-consolidation-rework.test.js`, `tests/only-the-owner-answers-an-inbox-question.test.js`, `tests/session-start-question-dispatch.test.js`, `tests/export-reachability.test.js`, `tests/reachability.test.js`, `tests/menu-auto-init.test.js`. `npx eslint src/lib/task-view.js tests/menu-task-wiring.test.js tests/protect-records.test.js --max-warnings 0`: clean. `npm test` not run, by the stop point.

### Step 15 document
Search `isNavRoute|navigation route` over `docs/`: 1 file matched, `docs/ENFORCEMENT.md` line 349, which says a `--next` or decoded `nextAction` must be a navigation route without naming shapes (already listed under Neighbours; the file is not declared, so not edited). The comment above `NAV_ROUTE` states the rule, every allowed shape and every refused family; the recipe in `src/commands/start.md` names the shapes.

### Fix round 2026-10-16: the critic's and the security review's findings (all in the main checkout)
**Red run first.** After the new cases were written and before `src/lib/task-view.js` or `src/commands/start.md` changed,
`node --test tests/menu-task-wiring.test.js`: 68 tests, 64 pass, 4 fail: S18-1, S18-3, S18-4 (the 300-digit `task t…`,
the 300- and 257-character `stubs …` values were accepted) and S18-9 (the recipe still wrote `[--next <navroute>]`). S18-2's
256-character boundary, S18-7 (the `null`-plan and backslash-plan cases), S18-7b and S18-8's 80-character case passed
already, as they must: they pin behaviour the old code already had, or behaviour no input can tell apart (Decisions 21 and 25).
**Fixes.** `src/lib/task-view.js`: the 256-character cap; the `plan`-route label from the route's file name; `path.posix.basename` in
`planName` and `opensOwnPlan`; the `isNavRoute` comment. `src/commands/start.md`: the recipe's `--next '<route>'`, the "only when it
matches" sentences, "a shell character inside the quotes", the classification line, the status-line sentence.
`tests/menu-task-wiring.test.js`: the cases above and the reworded comment.
**Mutants** (each run on `tests/menu-task-wiring.test.js`, then the saved copy written back and compared with `cmp`): no length cap,
killed by S18-1, S18-3, S18-4; `path.win32.basename` instead of posix, killed by S18-7 (the backslash plan); a cut at 80 instead of
above 80, killed by S18-8. The mutant that builds the plan-route label from the task's plan again is NOT killed (0 failures), as
Decision 21 says it cannot be.
**Green.** `node --test` over `tests/menu-task-wiring.test.js`, `tests/protect-records.test.js`, `tests/w10-task-arg-splitting.test.js`,
`tests/false-green-fence.test.js`, `tests/ctoc-start-command.test.js`, `tests/menu-protocol.test.js`,
`tests/shipped-recipes-execute.test.js`, `tests/instruction-surfaces-say-the-moment.test.js`,
`tests/no-phantom-command-family.test.js` and `tests/menu-screens-coverage.test.js`: 379 tests, 379 pass, 0 fail, 0 skipped.
`npx eslint src/lib/task-view.js tests/menu-task-wiring.test.js tests/protect-records.test.js --max-warnings 0`: clean.
`npm test` (the whole gate): 13467 tests, 13467 pass, 0 fail, 0 skipped; coverage 99.62% against the 99% floor; test gate PASS.
`git status` for the four declared files: `src/commands/start.md`, `src/lib/task-view.js` and `tests/menu-task-wiring.test.js` changed;
`tests/protect-records.test.js` did not (Decision 24).

### Step 11 check (b): opening an allowed screen writes nothing (run 2026-10-16)
A temporary project from `fs.mkdtempSync` under the system temporary folder, seeded with a plan in each of the eight stages, a
running task and a done task whose next action is `plan review/p-review.md`, a waiting question file in
`.ctoc/streaming/questions/pending/` and an open inbox question with the real id `1791713468054-ew0ek2` (its screen rendered the
question, not a refusal). Each of 30 routes was opened once through `route` (`tasks`, `task` of both seeded ids, `browse` of
all eight stages and `browse review approve`, the three `section` names, `plan` of the seven plan stages, `stubs p-vision`, the six
`inbox` doors and `inbox question` of the seeded id). Before and after each route the SHA-256 of every file and the file list were
compared, apart from `.ctoc/streaming/questions/` and `.ctoc/logs/`. Result: 30 routes, none threw, none returned an empty screen,
none created, changed or deleted a file outside those two folders. Inside them, one route wrote: `plan canvas/p-canvas.md` (the first
plan route) deleted the waiting question file and created `.ctoc/logs/streaming-sweeper.jsonl`, which is the question sweep the
rule allows (Decision 1). The control route `menu task add review p-review` modified `.ctoc/state/tasks.json`, so the check can fail.
Verdict PASS. Check (a), the call-graph trace to every write a screen can reach, was not repeated in this fix round; it belongs to
the critic's record, which this plan does not reproduce. The script is `s18fix-opens.js` in the session scratch folder, outside
the repository.

### Boxes left for the reviewers
Step 11's three boxes, Step 13's box and Step 16's box are the critic's and the security scanner's to tick on their own record; this
fix round ticks only Step 8, Step 14, the acceptance criteria its record evidences, and the withdrawn-84b marks (Decision 24).

### Step 11 check (a): every write each accepted route can reach (final review, 2026-10-16)
The final reviewer traced the call graph by reading the code. Writes reachable per accepted route:
- `tasks` and `task tN`: only the shared registry-load log row.
- `browse` (vision, STAGE, STAGE WORD), `section NAME`, `stubs SLUG`, and `inbox` questions, decisions, gates, escalations, stale and `question QID`: none.
- `inbox verify`: no file write (`git rev-parse` and `git log` only read).
- `plan STAGE/FILE.md`: the question sweep, which writes `.ctoc/streaming/questions/<ref>.json` for every waiting ref, deletes the waiting file and appends to `.ctoc/logs/streaming-sweeper.jsonl`; plus the registry-load log row.
- Shared, every call: `src/commands/start.js` `ensureInitialized` calls `initProject`, which writes `.ctoc/settings.yaml`, `.ctoc/state/iron-loop.yaml` and the `plans/*` folders, but only when the setup check finds something missing.
- Shared, registry load: `src/lib/task-registry.js` `warnLog` rewrites `.ctoc/logs/task-registry.json`, but only on a malformed registry.

This agrees with check (b): its run saw the sweep delete the waiting question file and create `streaming-sweeper.jsonl`, and nothing else outside the two excluded folders (its project was fully set up and its registry well-formed, so the two conditional writes did not fire). Every write is acceptable: the sweep and the logs are the allowed writes (Decision 1), and the setup repair moves no plan, changes no task and records no answer. The setup repair is not named in Decision 1's wording; that is Decision 27 (a), for the next slice that edits the route comment.

### File scope at Step 16 (2026-10-17)
`git status --porcelain` in the main checkout, each path matched to the `files:` lists under `plans/` (frontmatter of every `.md` in every stage folder). Attribution is by declaration, not by who wrote the edit: the working tree holds many slices' uncommitted work, and shared files list several plans.

| Changed path | Declared by (plans whose `files:` lists it) |
|---|---|
| `src/lib/task-view.js` | this slice (S18); also slice 22 (todo) and older done plans |
| `src/commands/start.md` | this slice (S18); also slice 9 (review), slices 14, 19, 21 to 24 (todo), slice 5 (done) and others |
| `tests/menu-task-wiring.test.js` | this slice (S18); also slices 19 and 22 (todo) and older done plans |
| `tests/protect-records.test.js` | this slice declares it; NOT changed (Decision 24) |
| `src/commands/start.js` | slice 7 (review), hotfix-check slice 3 (implementation) |
| `src/lib/menu-screens.js` | slices 7 and 8 (review), slices 13, 19, 22, 24 (todo), fewer-rework slices 3 and 6 (implementation) |
| `src/lib/inbox.js` | slices 7 and 8 (review) |
| `src/lib/actions.js` | slice 13 (todo) and done slices 2 and 4 |
| `src/lib/task-registry.js` | slices 12 and 24 (todo) |
| `src/lib/streaming-gate.js` | slices 22, 23, 24 (todo), fewer-rework slice 4 (implementation) |
| `src/lib/plan-validator.js` | slice 17 (review), fewer-rework slices 1 and 3 (implementation) |
| `src/lib/step-13-verify.js` | slice 15 (done) |
| `src/scripts/release.js` | slice 10 (review) |
| `tests/menu-protocol.test.js`, `tests/w10-live-agent-reconcile.test.js` | slice 1 (review) |
| `tests/dashboard-wedge-fault.test.js`, `tests/dashboard-wedge-reports.test.js`, `tests/promote-quarantine-parity.test.js`, `tests/scheduler-guarantees-under-mutation.test.js`, `tests/task-reconcile-quarantine-fault.test.js` | slice 11 (in-progress) |
| `tests/scheduler-enforced.test.js` | slices 1 (review), 11 (in-progress), 12 (todo) |
| `tests/plan-validator.test.js` | slice 17 (review), fewer-rework slices 1 and 3 (implementation) |
| `tests/plans-keep-moving-without-the-human.test.js` | slices 21, 23, 24 (todo), fewer-rework slice 4 (implementation) |
| `tests/release-metadata-sync.test.js` | slice 10 (review) |
| `tests/scope-growth.test.js` | slice 8 (review) |
| `tests/verify-fails-loudly.test.js` | slice 15 (done) |
| `tests/inbox-questions-are-shown-as-quoted-data.test.js` | slice 8 (review) |
| `tests/only-the-owner-answers-an-inbox-question.test.js` | slice 9 (review), slice 21 (todo) |
| `tests/the-owner-answers-an-inbox-question.test.js` | slice 7 (review) |
| `tests/a-build-start-moves-its-plan.test.js`, `tests/an-answer-starts-no-build.test.js`, `tests/a-requested-stop-offers-no-build.test.js`, `tests/a-question-file-keeps-one-status-line.test.js`, `tests/the-session-claims-a-build-before-launching-it.test.js` | slices 2, 3, 4, 6 and 5 (done) |
| `CLAUDE.md`, `README.md` | many done and todo plans (README: the-readme-matches-the-product-today slices; CLAUDE.md: settings-files-cannot-turn-edit-protection-off, claude-md-gets-small-and-keeps-every-rule) |
| `agents/architecture/dependency-analyzer.md`, `skills/architecture/dependency-analyzer/SKILL.md`, the `.ctoc/audit/agent-and-skill-improvement` dependency-analyzer, `for-the-human` and `late-corrections` records | 00266 slice 6 (in-progress, dependency-analyzer) |
| `.ctoc/unexecutable-instruction-baseline.json` | 00073 and 00110 (done), vision-file-names-and-planning-agent-orders (functional) |
| `.ctoc/approvals/*`, `.ctoc/streaming/*` (questions, answers, inbox answers), `.ctoc/logs/transitions.json`, `.ctoc/inbox/questions/*`, `.ctoc/audit/improvement-run-notes/*`, `plans/**` (stage moves, new plan files, status sidecars) | no plan declares these: they are CTOC's own records written by the menu and its hooks, not slice code |

Result: every code, test, agent and skill path has at least one declaring plan; none is undeclared. This slice's own changes are `src/lib/task-view.js`, `src/commands/start.md` and `tests/menu-task-wiring.test.js` (`git diff --stat`: 461 insertions, 61 deletions across the three), all inside its `files:`; `tests/protect-records.test.js` did not change. No path this slice changed is outside its `files:`. `src/commands/start.md` and `src/lib/menu-screens.js` also carry other slices' uncommitted work, so `git status` alone cannot isolate this slice there; the `cmp` checks in the fix round did.

### Boxes at Step 16 (2026-10-17)
Ticked, with their evidence: Step 11 box 1 (shapes and refusals, final review); Step 11 box 2 (check (a) above plus check (b)); Step 11 box 3 (the recipe was read as the session would and the shapes it names match `NAV_ROUTE`; the per-argument character-set gap is carried by Decision 30 (d) and Decision 28 (b)); Step 13 (warn verdict, no block, Decision 29 (c)). The acceptance box "Opening each allowed screen writes nothing beyond the question sweep and log lines (Step 11, both checks recorded)" was already ticked; both checks are now recorded, and it holds "and CTOC's setup repair", per Decision 27 (a). The acceptance box "Only `src/lib/task-view.js`, `src/commands/start.md`, `tests/menu-task-wiring.test.js` and `tests/protect-records.test.js` changed" was already ticked and the table above confirms it (no out-of-scope change).
Left unticked: Step 16's box, because not every other box is ticked. The seven boxes under "Security Review" in the specification are still open; they are the security scanner's to tick, and this record-keeping task did not include them. Step 16's box stays open until they are ticked.

### Security Review boxes (2026-10-17)
The security scanner judged each box against the re-check of 2026-10-16 (Decision 29), whose files are in the session scratch folder, outside the repository. The code is the same code: `src/lib/task-view.js` was last written on 2026-10-16 at 18:03, before the re-check ran (18:14 to 18:20), and it is byte-identical to the fix round's `s18fix-task-view.new.js`. Fresh checks were run in the throwaway folder `s18-boxes-6bKtE7` inside that scratch folder. Six boxes are ticked and one is left open.
- **Input validation: ticked.** `isNavRoute` (`src/lib/task-view.js` lines 109-110) is a string check, then the 256-character cap, then the anchored `NAV_ROUTE` (line 76), tested on the value exactly as given. The store applies it at `src/lib/menu-screens.js` lines 2770-2772, to `--next` and to a decoded `--b64` `nextAction` that is a string (line 2766), and refuses the whole completion. A decoded value that is not a string is dropped before the check and stored nowhere, without the completion being refused. The render applies it at `task-view.js` line 401, together with `opensOwnPlan` (lines 152-157) for a `plan` route. Evidence: `s18-recheck-attack.json` checks 89 values and accepts 7. All 7 are read-only shapes: `browse review approve` and `stubs approve`, which write nothing (`s18-recheck-opens.json`), plus `plan review/OTHER.md`, `plan done/OTHER.md`, `plan review/x.md.md`, `stubs other-vision` and `task t999`. A `plan` route to another plan passes the store, but the screen does not offer it (`render.otherPlan` shows only "◀ Back"). Further evidence: `s18-recheck-shell.json` (`f_257_chars` is not stored, `f_256_chars` is). The own-plan check is only as good as the registry's `plan` field, which a direct writer sets himself (Decision 21).
- **Command injection: left open.** The part about accepted values holds. Every class in `NAV_ROUTE` is ASCII letters, digits, `.`, `_`, `-` or `/`, spaces appear only as literal separators, and no word can begin with `-`. `s18-recheck-attack.json` (the compound, invisible and look-alike groups) refuses every quote, semicolon, pipe, `$`, backtick, redirection, control character, format character and non-ASCII look-alike. The conclusion, "so the session cannot be steered into a second command", does not hold yet. The route reaches the session's shell before `isNavRoute` runs (Decision 19), and only the recipe's prose shape check at `src/commands/start.md` line 131 keeps a quote out. `s18-recheck-shell.json` case `d_quote_in_value` (`stubs x'; echo SECOND-COMMAND-RAN; '`, which `isNavRoute` refuses) ran the second command in `/bin/sh`, `/bin/bash` and `/bin/zsh`. That is finding `46b5cf9f89a6` in `s18-recheck-security-results.json` (medium, new, warn). It is deferred by Decision 28 (b) to the slice "agent text never reaches the shell unquoted", not waived. The box can be ticked when the recipe names the allowed character set and S18-9 pins it.
- **Gate safety: ticked.** `s18-recheck-opens.json`: 31 accepted routes, each opened once, and none changed a file outside the question sweep and log folders. These include the two accepted values that read like actions, `browse review approve` and `stubs approve`. `s18-recheck-opens-control.json`: the control `menu task add review p-review` modified `.ctoc/state/tasks.json`, so the comparison can fail. The `attack.json` group `writes` refuses `validate`, every `stream`, `menu task` and `inbox answer` route, `inbox cleanup`, `menu`, `menu commands` and `dashboard`. The call-graph trace is in "Step 11 check (a)" above. The setup repair it found is Decision 27 (a).
- **Label spoofing: ticked.** The labels are built at `task-view.js` line 403, `labelName` is lines 135-141, and `SAFE_NAME` is line 82. A fresh re-run of `s18-recheck-label.js` (the JSON was absent) gave these results. The own plan in another stage shows "Open OTHER ▸". A route to a plan that is not the task's own is not offered, with or without a gate. With the own-plan check switched off in memory, the label names the route's plan ("Open LH1 ▸"), not the task's. A 120-character file name is cut to 80 characters plus "…". In `s18-recheck-attack.json` `render`, look-alike, combining and embedded control characters give "Open next ▸", and a right-to-left override is removed ("Open LH1x ▸"). The "…" (U+2026) and "▸" are CTOC's own characters, not agent text (S18-8, Decision 25). The name itself is plain ASCII.
- **Defense in depth: ticked on the part this plan still claims; the hook clause is overtaken (Decision 24).** Both layers check: the store at `menu-screens.js` lines 2770-2772 and the render at `task-view.js` line 401. `git status --porcelain -- src/hooks/protect-records.js` (2026-10-17) is empty, so the write protection's file is not edited, which agrees with the "File scope at Step 16" table. That `src/lib/menu-screens.js` shows as modified is other slices' work: it is not in this slice's `files:`. The "refuses more" clause was not checked, because that refusal has been off since commit 395bd70a.
- **Denial of service: ticked.** A fresh run of `s18-recheck-static.js` found that safe-regex rates `NAV_ROUTE`, `SAFE_NAME` and `FORMAT_CHARS` safe. The 1,000,000-character timings in `s18-recheck-attack.json` measured the 256-character cap returning first, not the pattern. So a fresh run (`dos.js`, output `dos.out.json`) timed `NAV_ROUTE` without the cap on five near-miss inputs at 10^4, 10^5 and 10^6 repeats. The time scales tenfold with length each time: about 3.1 ms at 3,000,000 characters for `plan review/` plus `a.m` repeated, and 0.94 ms at 1,000,007 for `stubs a…!`. The cap bounds what the pattern ever sees, and the label is cut at 80 (line 140).
- **No secrets, no file access, no new dependency: ticked.** `task-view.js` requires only `path` and `./task-registry` (lines 26-27), and the diff adds no `require`, `fs`, `child_process` or `process.env` line. `git status --porcelain` shows no change to `package.json` or `package-lock.json`. A fresh run of `s18-recheck-static.js` found CTOC's `SecretsScanner` reporting nothing in the three changed files or in their 54, 102 and 305 added lines, with no scanner errors. gitleaks, trufflehog, semgrep and codeql are not installed (finding `36d7742ea2e3`, low, warn), so this rests on the stand-in scanners, as Decision 29 records.

Step 16's box stays open. The two record items the final review of 2026-10-16 waited for are now recorded: "Step 11 check (a)" and "File scope at Step 16" above. But the Command injection box in "Security Review" is not ticked, so not every other box is ticked.

### Rejection round 2026-10-17: red run (command-injection fix)
S18-9 in `tests/menu-task-wiring.test.js` gained assertions that the completion recipe contains the character-set sentence word for word and the per-argument limits (`plan {stage}` is never `vision`; the `task` id; the `inbox question` id; the slug and plan-file characters; the 256-character cap). Run before the change to `src/commands/start.md`: S18-9 failed with "the recipe states the route character set, word for word" (`tests/menu-task-wiring.test.js:1136`). After the recipe change: 68 tests, 68 pass, 0 fail.

### Rejection round 2026-10-17: character check (every accepted shape uses only the stated characters)
Throwaway folder `s18-charset-*` in the session scratch folder. For 17 seeds (every shape, a maximum-length plan file) every one-character insertion and replacement at every position, over code points U+0000 to U+2FFF, was fed to `isNavRoute` (12,681,216 mutations). 33,934 distinct values were accepted; 0 held a character outside ASCII letter, digit, space, `/`, `.`, `_`, `-`, and 0 held a quote. A sample of 1 in 25 of the accepted values (every shape is represented) was passed single-quoted to `printf` in `/bin/sh`, `/bin/bash` and `/bin/zsh`: 0 mismatches, so each shell received exactly the value, and a session that follows the sentence never puts a quote inside the single quotes. The per-argument phrases match `NAV_ROUTE` (`task t\d+`; `\d{13,15}-[a-z0-9]{6}`; `[A-Za-z0-9_][A-Za-z0-9._-]*`; no `vision` in the `plan` stage list; `NAV_ROUTE_MAX` 256).
