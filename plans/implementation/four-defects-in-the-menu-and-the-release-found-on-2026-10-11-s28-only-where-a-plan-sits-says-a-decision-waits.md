---
title: "Only where a plan sits says a decision waits"
type: implementation
created: 2026-10-18
priority: high
effort: medium
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s27-agent-words-are-capped-and-shown-as-data, four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s23-no-command-can-start-the-menu-for-a-background-agent, four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s24-only-a-critique-the-menu-launched-can-move-a-plan
files:
  - src/lib/task-view.js
  - src/lib/menu-screens.js
  - src/lib/streaming-gate.js
  - src/commands/start.md
  - tests/menu-task-wiring.test.js
  - tests/menu-screens-coverage.test.js
---

# Only where a plan sits says a decision waits

One of two plans that replace the plan "Agent notes are capped and shown as the agent's own; only where a plan sits says a
decision is ready" (`four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s22-agent-notes-are-capped-and-the-owner-decides-what-is-ready.md`),
split on the owner's answer of 2026-10-18 along the seam that plan's own decisions named: the words an agent writes into a
task (the companion plan, `four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s27-agent-words-are-capped-and-shown-as-data.md`,
built first) and the read that says a decision waits (this plan). The parent plan is
`four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`. The hole was listed by the review of the next-action
plan (slice 18, Risks, "Found in the review round"), and the owner's words of 2026-10-12, as the main session relayed
them, ask for it to be fixed at its root.

Every line number below was read on 2026-10-18 in the main checkout. The task-start plan (slice 23) is built; the
companion plan and the critique plan (slice 24, `…-s24-only-a-critique-the-menu-launched-can-move-a-plan.md`) are not.
This plan edits `src/lib/task-view.js`, `src/lib/menu-screens.js` and `src/commands/start.md` as the companion plan leaves
them and reads slice 24's classification rule as that plan specifies it on 2026-10-18. The builder re-reads every cited
span at Step 9 and edits the text as it then stands.

## Problem Statement

**"Decision ready" is the agent's word.**
- An agent sets `--gate N` on its own completion. Nothing refuses it: since the owner's removal of 2026-10-15
  (`RECORD_REFUSALS_OFF`, `src/hooks/protect-records.js` line 597) the write protection reads no background agent's `menu
  task` call, and slice 21's revision of 2026-10-18 refuses only the routes that record the owner's decisions. The store
  records whatever `parseInt` reads as an integer (`src/lib/menu-screens.js` lines 2774-2779 and 2872).
- Every "a decision waits" signal is that integer: the board's "→ decision ready" (`src/lib/task-view.js` lines 313-321),
  the task screen's "next: a decision is waiting for you" (lines 387-389), its "Decision ready ▸" option label (lines
  402-403) and the dashboard's "⊙ Decision ready — <plan>" (lines 429-432).
- So an agent can make any task look like a decision waiting for the owner.

**What CTOC itself knows.** A plan waits for the owner's decision at a gate while it sits in `functional/`,
`implementation/` or `review/` (`inbox.listPlansAtGates`, `src/lib/inbox.js` lines 998-1012, its stages at lines 98-102).
The one approval that is always the owner's, vision to functional, waits outside those folders: a vision sits in
`plans/vision/` while the functional stubs its decomposer wrote carry `parent_vision` naming it (`state.getVisionStubs`,
`src/lib/state.js` lines 598-632, the read behind the `stubs <slug>` screen), until his `claude:approve-stubs` moves it to
`done/`. A decompose task names its vision as its plan.

**One kind of plan at a gate waits for nothing from him (slice 23, built).** Slice 23 decides "ready" with one rule,
`movesOnItsOwn` (`src/lib/streaming-gate.js` lines 1949-1971), and its `askQueue` (lines 1973-1979) splits the pending
list into the decisions the owner is asked and the ready plans; the default screen builds its questions and its ready line
from that split (`streamingGateScreen`, line 2146). A task screen that marked a ready plan "a decision is waiting for you"
would ask him what the default screen says needs nothing from him. `askQueue` is not exported (`module.exports`, lines
2523-2539).

**The read must stay bounded.** The readiness read reads every plan file of the three gate folders before it can filter
(`readPlans`, `src/lib/state.js` lines 20-61), and a vision's stubs read reads every functional plan (line 611). A screen
that read readiness or stubs for every plan its tasks name would grow with the registry.

## Technical approach

### The gate is accepted and no longer recorded

A `--gate` flag or a payload's `gate` is still accepted, so no agent briefed the old way fails, and is no longer recorded
in the task's result. No screen reads `result.gate`.

### Whether a decision waits: CTOC's read, never the agent's flag

`menu-screens.decisionStages(root, tasks)` returns `{ waiting, unreadable, unchecked }` for the plans the done tasks among
`tasks` name, and reads nothing when there are none — the dashboard and the board pass every task, the task screen only the
task it opens:
1. **Where each named plan sits.** The three gate folders are listed one at a time, as the default screen reads them
   (`pendingGateDecisions`, `src/lib/streaming-gate.js` lines 1062-1069), so a folder that cannot be listed hides only its
   own plans and is named in `unreadable`; the board and the task screen say so on one line ("could not read
   plans/review/: a decision waiting there is not shown"). A named plan in none of them with a file in `plans/vision/` is a
   vision; each such name is tested in its own `try`, so a name safe-fs refuses hides nothing else.
2. **At most five are checked per render.** Of those named plans and visions, at most `DECISION_CHECK_MAX` (five, the most
   decision lines the dashboard shows) distinct names are checked, the first in the registry's order. Every later one is
   counted in `unchecked`, is **never shown as a waiting decision**, and the board and the dashboard say on one line how
   many were not checked and that each task's own screen checks its plan. A task screen names one plan, so it always
   checks it.
3. **A checked plan at a gate waits unless the default screen calls it ready.** Readiness is slice 23's own split,
   `streamingGate.askQueue` over `streamingGate.pendingGateDecisions(root, { only })` — exported and called, never
   copied. `only` (new, honoured on reads only) skips the validation and the question-store read of every plan it does not
   name. A readiness read that fails removes no plan: a plan that sits at a gate is shown, never hidden, on that fault —
   the one way a checked plan is shown without the split's verdict.
4. **A checked vision waits when at least one functional stub names it** (`state.getVisionStubs`); no ready rule applies,
   because that approval is always the owner's. A stubs read that fails shows nothing and is counted in `unchecked`.

So a task whose plan the default screen calls ready is not marked "a decision is waiting for you", and once that plan
needs the owner it is. The read takes in no waiting gate-critic file and writes nothing. A done task's decision route is
`plan <folder>/<file>.md` for its own plan at a gate, or `stubs <slug>` for its own vision, and only when it is an exact
read-only route; the board's "→ decision ready", the task screen's "next: a decision is waiting for you" and "Decision
ready ▸", and the dashboard's "⊙ Decision ready — <plan>" (one line per plan, at most five) all come from it. When no
decision waits, the agent's suggested next screen (slice 18's checks) is still offered, under its own label.

### The session's instructions

`src/commands/start.md` stops asking for `"gate"` in the completion payload, stops listing "its gate" among the texts Rule
15 routes through the payload file (the shell-quoting plan's sentences), and says in "Human gates stay foreground" that
whether a decision waits is read from where the plan sits, never from the agent's flag; that a plan file moved or written
into a gate folder by hand still shows one; and that the board and the dashboard check at most five named plans and
visions each time and say how many they did not check.

## Implementation Details

### Dependency Graph

```
menu-screens.buildDashboardTable / taskBoardScreen (also behind taskCommand('board')) / taskDetailScreen --call once--> menu-screens.decisionStages(root, tasks)
  menu-screens.decisionStages --lists, one folder at a time--> plans/functional, plans/implementation, plans/review (safeFs.readdirSync); plans/vision/<name>.md (safeFs.existsSync)
  menu-screens.decisionStages --for at most DECISION_CHECK_MAX names--> streamingGate.askQueue(streamingGate.pendingGateDecisions(root, { only }), root) (exported here); state.getVisionStubs
  --pass { waiting, unreadable, unchecked } to--> taskView.renderTaskBoard / renderTaskDetail; { waiting, unchecked } to taskView.tasksInboxLine
taskView renderers --call--> decisionRoute --> isNavRoute; unreadableLine; uncheckedLine; shownPlan, ownPlanName (the companion plan)
menu-screens.taskComplete --accepts and drops--> --gate / payload gate
src/commands/start.md (loaded by /ctoc:start) --tells the session--> no gate in the payload; where a decision is read from; the check cap
tests/menu-task-wiring.test.js, tests/menu-screens-coverage.test.js --call--> menu-screens.route, task-view renderers, streaming-gate, streaming-precompute
```

No module is added and no `require` is added (`menu-screens.js` already imports `safeFs`, line 23, `getPlansDir` and
`getVisionStubs`, line 25, `task-view.js`, line 42, and `streaming-gate.js`, line 49), and no cycle appears:
`task-view.js` still requires only `path` and `./task-registry`, and `streaming-gate.js` reaches `menu-screens.js` only
lazily, as today. Exports added: `askQueue` from `src/lib/streaming-gate.js` (called by `menu-screens.decisionStages`) and
`decisionStages` from `src/lib/menu-screens.js` (called by four screens of its own module; exported so Step 12 times it
alone). `pendingGateDecisions` gains one option, `only`.

### File Specifications

#### File: `src/lib/task-view.js`
**Action:** MODIFY
**Purpose:** whether a decision waits is read from `reads.waiting`, CTOC's own read, never from the task; a folder that
could not be listed and the plans not checked are each named on one line.
**Change Type:** modify-existing

##### Changes (against the file as the companion plan leaves it)

1. **The header's first bullet** (lines 17-19, "The detail next-action NAVIGATES …") becomes:

```js
 *   • The detail next-action NAVIGATES (an exact read-only route) — it NEVER
 *     performs a mutation and NEVER crosses a human gate. Whether a decision waits
 *     is never read from a task: the caller passes `reads.waiting`, CTOC's own read
 *     of where each checked plan waiting for the owner sits (a gate folder, or
 *     plans/vision/ with stubs waiting), and `decisionRoute` builds the route to the
 *     task's own plan from it (four-defects slice 28).
```

2. **After the companion plan's `isCtocSummary`**, three module-local helpers:

```js
/**
 * The route of the decision waiting on a task's own plan, or null. `waiting` is CTOC's own read of where each checked
 * plan waiting for the owner sits — a Map from the file name without `.md` to its folder, built by
 * menu-screens.decisionStages: a gate folder ('functional', 'implementation' or 'review'), less every plan the default
 * screen calls ready (slice 23's streamingGate.askQueue), or 'vision' for a vision whose stubs wait for his approval.
 * Nothing the task records decides it: an agent's `gate` is never read. A plan at a gate opens its own screen
 * (`plan <folder>/<file>.md`), which asks the decision from CTOC's question store; a vision opens its stubs screen
 * (`stubs <name>`). The route is returned only when it is an exact read-only route (isNavRoute).
 * @param {{plan?:*}} task
 * @param {*} waiting
 * @returns {string|null}
 */
function decisionRoute(task, waiting) {
  if (!(waiting instanceof Map)) return null;
  const name = ownPlanName(task);
  const stage = name ? waiting.get(name) : undefined;
  if (typeof stage !== 'string') return null;
  const route = stage === 'vision' ? `stubs ${name}` : `plan ${stage}/${name}.md`;
  return isNavRoute(route) ? route : null;
}

/**
 * The one line the board and the task screen show when plan folders could not be listed for their decisions
 * (menu-screens.decisionStages), '' when none: a decision waiting in such a folder cannot be shown, and the screen says
 * so rather than read as "no decision". The dashboard shows none: it does not open while a gate folder cannot be read.
 * The folder names are CTOC's own (`plans/<stage>/`), never an agent's.
 * @param {*} unreadable
 * @returns {string}
 */
function unreadableLine(unreadable) {
  return Array.isArray(unreadable) && unreadable.length > 0
    ? `  ⚠ could not read ${unreadable.join(', ')}: a decision waiting there is not shown\n`
    : '';
}

/**
 * The one line a screen shows when named plans or visions were not checked for a waiting decision in this render
 * (menu-screens.decisionStages: past the cap of five, or a vision whose stubs could not be read), '' when none. An
 * unchecked plan is never shown as a waiting decision, so the line says it was not checked rather than read as "no
 * decision". On the task screen the one plan is the task's own (four-defects slice 28).
 * @param {*} unchecked
 * @param {boolean} onTaskScreen
 * @returns {string}
 */
function uncheckedLine(unchecked, onTaskScreen) {
  if (!Number.isInteger(unchecked) || unchecked <= 0) return '';
  if (onTaskScreen) return "  ⚠ whether a decision waits on this task's plan could not be checked\n";
  return `  ⚠ ${unchecked} plan${unchecked === 1 ? '' : 's'} not checked here for a waiting decision; each task's own screen checks its plan\n`;
}
```

3. **`renderTaskBoard(registry, reads)`** (lines 275-343): the JSDoc gains `@param {{waiting?: Map<string,string>,
   unreadable?: string[], unchecked?: number}} [reads]  CTOC's own read of the decisions waiting on the tasks' plans
   (menu-screens.decisionStages)`. Its first line becomes `function renderTaskBoard(registry, reads) {` followed by
   `const r = reads && typeof reads === 'object' ? reads : {};`. After the heading line (line 285) comes
   `text += unreadableLine(r.unreadable) + uncheckedLine(r.unchecked, false);`. The suffix block (lines 313-321) becomes:

```js
      let suffix = '';
      // Whether a decision waits is CTOC's read of where the task's plan sits (`r.waiting`), never the agent's `gate`
      // (four-defects slice 28). The board points AT the decision; the plan's screen asks it.
      if (t.status === 'done' && decisionRoute(t, r.waiting)) suffix = ' → decision ready';
```

4. **`renderTaskDetail(registry, id, reads)`**: the JSDoc's `reads` gains `waiting`, `unreadable` and `unchecked`, and its
   first paragraph becomes "The task-detail screen. Unknown / null id → a safe "Task not found" screen whose only option
   navigates back to the board. A done task whose own plan waits for the owner's decision (`decisionRoute`, from
   `reads.waiting`) offers `Decision ready ▸`, the route to that plan's screen or that vision's stubs; otherwise a done
   task whose `result.nextAction` is an exact read-only route to its own plan offers it as "Open", labelName and "▸".
   Neither is ever a `claude:` mutation or a gate cross. Only CTOC's own sentences are shown as `result:`, bare — a verify
   verdict only when `reads.verifyPassed` agrees; the agent's note and any other summary are shown as quoted words CTOC
   did not check. A plan folder that could not be listed, and a plan that could not be checked, are each named on one
   line. Always a final `◀ Back` → `tasks`." The decision echo (lines 383-389) becomes

```js
  const decision = task.status === 'done' ? decisionRoute(task, r.waiting) : null;
  if (decision) text += '  next:   a decision is waiting for you\n';
  text += unreadableLine(r.unreadable) + uncheckedLine(r.unchecked, true);
```

   and the option block (lines 394-406) becomes:

```js
  // A waiting decision is offered from CTOC's own read (decisionRoute); the agent's suggested next screen only when none
  // waits, under its own label, and only as an exact read-only route to its own plan (isNavRoute, opensOwnPlan —
  // slice 18). Neither is ever a `claude:` mutation or a gate cross (four-defects slice 28).
  const next = task.status === 'done' && task.result ? task.result.nextAction : undefined;
  if (decision) {
    options.push({ label: 'Decision ready ▸', description: "Open the decision waiting on this task's plan" });
    actions['Decision ready ▸'] = decision;
  } else if (isNavRoute(next) && opensOwnPlan(task, next)) {
    const label = `Open ${labelName(task, next)} ▸`;
    options.push({ label, description: 'Navigate to the next action (does not perform it)' });
    actions[label] = next;
  }
```

5. **`tasksInboxLine(registry, reads)`** (lines 417-434): its doc comment says "one `⊙ Decision ready — <plan>` line per
   plan whose decision waits (`decisionRoute`, from `reads.waiting`), at most 5, then the not-checked line
   (`reads.unchecked`)", with the `reads` `@param`. It takes no `unreadable`: its one caller, the dashboard, does not open
   while a gate folder cannot be read. After its first line, `const r = reads && typeof reads === 'object' ? reads : {};`,
   and its loop (lines 429-432) becomes:

```js
  // One line per plan whose decision waits — CTOC's read, never the agent's `gate` — at most five; then how many named
  // plans this render did not check (four-defects slice 28).
  const named = new Set();
  for (const t of g.done) {
    if (named.size === 5) break;
    const name = ownPlanName(t);
    if (named.has(name) || !decisionRoute(t, r.waiting)) continue;
    named.add(name);
    out += `  ⊙ Decision ready — ${shownPlan(t.plan)}\n`;
  }
  out += uncheckedLine(r.unchecked, false);
```

   A route exists only for a name the read-only route shapes accept, so `shownPlan` gives that name bare here.

##### Error Handling
Every renderer stays total: a missing or non-object `reads` means no decision is shown and no fault line (the safe default:
CTOC claims nothing it did not read).

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** the agent's gate no longer recorded, and CTOC's read of waiting decisions, capped per render, handed to the
screens.
**Change Type:** modify-existing

##### Changes (against the file as the companion plan leaves it)

1. **`taskComplete`**: the gate parse (lines 2774-2779 today, `let gate; … if (Number.isInteger(g)) gate = g; }`) and the
   companion plan's `if (gate != null) result.gate = gate;` are deleted, and the store-check comment the companion plan
   wrote gains its last sentence: "A `--gate` or a payload's `gate` is accepted and not recorded: whether a decision waits
   is CTOC's own read of where the plan sits (decisionStages), never the agent's word (four-defects slice 28)." The flag
   still parses (`parseTaskArgs`, line 2348) and the shell-quoting plan's payload table still admits `gate`, so a caller
   that sends one is not refused.

2. **`decisionStages`**, before `taskList`:

```js
/** The three plan folders a decision at a gate waits in — the folders inbox.listPlansAtGates reads (inbox.js lines
 *  98-102). */
const DECISION_FOLDERS = ['functional', 'implementation', 'review'];

/** The most distinct named plans and visions whose waiting decision one render checks, the first in the registry's
 *  order — five, the most decision lines the dashboard shows. A later one is not checked, so it is never shown as a
 *  waiting decision; the screens count it on one line (four-defects slice 28). */
const DECISION_CHECK_MAX = 5;

/**
 * Where each plan waiting for the owner's decision sits, for the plans the given tasks name (four-defects slice 28):
 * `waiting`, a Map from the file name without `.md` to its folder ('functional', 'implementation', 'review' or
 * 'vision'); `unreadable`, the plan folders that could not be listed; `unchecked`, how many named plans and visions were
 * not checked in this render. Only done tasks that name a plan count, and with none nothing is read: the dashboard and
 * the board pass every task, the task screen only the task it opens.
 *   1. Where each named plan sits: each gate folder listed on its own, as the default screen reads them, so a folder
 *      that cannot be listed hides only its own plans and is named; a name in none of them with a file in plans/vision/
 *      is a vision, each name tested in its own try (a name safe-fs refuses, one holding a NUL, is no vision).
 *   2. At most DECISION_CHECK_MAX of those names are checked, the first in the registry's order; every later one is
 *      counted in `unchecked` and never shown.
 *   3. A checked plan at a gate waits unless the default screen calls it ready: slice 23's split, streamingGate.askQueue
 *      — the one rule, read here, never copied — over streamingGate.pendingGateDecisions(root, { only }), whose `only`
 *      skips the validation and the question-store read of every plan it does not name (readPlans still reads every
 *      plan file of the three folders). A readiness read that fails removes no plan: the decision is shown, never
 *      hidden, on that fault.
 *   4. A checked vision waits when at least one functional stub names it (state.getVisionStubs, the read behind the
 *      `stubs <slug>` screen) — the approval that is always the owner's, so no ready rule applies. A stubs read that
 *      fails shows nothing and is counted in `unchecked`.
 * The task screens build "Decision ready" from this and never from an agent's `gate`. Pure read: unlike the default
 * screen it takes in no waiting gate-critic file, and it writes nothing.
 * @param {string} root
 * @param {Array<object>} tasks
 * @returns {{waiting: Map<string, string>, unreadable: string[], unchecked: number}}
 */
function decisionStages(root, tasks) {
  /** @type {Map<string, string>} */
  const waiting = new Map();
  /** @type {string[]} */
  const unreadable = [];
  const named = new Set();
  for (const t of Array.isArray(tasks) ? tasks : []) {
    if (t && t.status === 'done' && t.plan != null) named.add(path.posix.basename(String(t.plan)).replace(/\.md$/, ''));
  }
  if (named.size === 0) return { waiting, unreadable, unchecked: 0 };
  const plansDir = getPlansDir(root);
  /** @type {Map<string, string>} where each named plan sits: a gate folder, or 'vision' */
  const where = new Map();
  for (const stage of DECISION_FOLDERS) {
    try {
      const dir = path.join(plansDir, stage);
      if (!safeFs.existsSync(dir)) continue;
      for (const f of safeFs.readdirSync(dir)) {
        const name = f.replace(/\.md$/, '');
        if (f.endsWith('.md') && named.has(name)) where.set(name, stage);
      }
    } catch {
      unreadable.push(`plans/${stage}/`); // this folder's decisions cannot be shown; the board and the task screen say so
    }
  }
  const visionDir = path.join(plansDir, 'vision');
  for (const name of named) {
    if (where.has(name)) continue; // a name at a gate wins over a vision of the same name
    try {
      if (safeFs.existsSync(path.join(visionDir, `${name}.md`))) where.set(name, 'vision');
    } catch {
      // A name safe-fs refuses (a NUL in it, planted past the store) has no vision to check; every other name is read
      // on its own.
    }
  }
  const candidates = [...named].filter((name) => where.has(name));
  const checked = candidates.slice(0, DECISION_CHECK_MAX);
  let unchecked = candidates.length - checked.length;
  const atGates = checked.filter((name) => where.get(name) !== 'vision');
  if (atGates.length > 0) {
    let ready = new Set();
    try {
      const split = streamingGate.askQueue(streamingGate.pendingGateDecisions(root, { only: new Set(atGates) }), root);
      ready = new Set(split.ready.filter((d) => where.get(d.slug) === d.fromStage).map((d) => d.slug));
    } catch {
      // A readiness read that fails removes no plan: the decision stays shown, never hidden.
    }
    for (const name of atGates) if (!ready.has(name)) waiting.set(name, String(where.get(name)));
  }
  for (const name of checked) {
    if (where.get(name) !== 'vision') continue;
    try {
      if (getVisionStubs(name, root).length > 0) waiting.set(name, 'vision');
    } catch {
      unchecked += 1; // its stubs could not be read: counted as not checked, never shown as a decision or as none
    }
  }
  return { waiting, unreadable, unchecked };
}
```

   The folders are listed here rather than through `inbox.listPlansAtGates`, which reads the same three with no catch, so
   one bad folder throws away the other two (`src/lib/inbox.js` lines 998-1012). The rule is the same — a file whose name
   ends in `.md`, named without it — and `listPlansAtGates` stays as it is for the dashboard's count and the `inbox gates`
   door. `pendingGateDecisions` called without `opts.crossed` crosses nothing (slice 23, lines 1099-1101), so the read-only
   `tasks` and `task <id>` screens stay read-only (S22-10 holds the whole project byte for byte across them).

   Its callers, each calling it once per screen. `buildDashboardTable` (lines 664-665), inside the `try` it has today:

```js
  let bgLine = '';
  try {
    // CTOC's own read of the decisions waiting on done tasks' plans (four-defects slice 28). The dashboard does not open
    // while a gate folder cannot be read (its plan and inbox counts above throw first), so it shows the not-checked line
    // and no folder fault line.
    bgLine = taskView.tasksInboxLine(taskReg, decisionStages(root, taskReg.tasks));
  } catch { bgLine = ''; }
```

   `taskBoardScreen` (lines 3165-3172) — and `taskCommand`'s `board` (line 3156) becomes `case 'board': return
   taskBoardScreen(root);`, so no case clause holds a lexical declaration (ESLint's `no-case-declarations`):

```js
function taskBoardScreen(projectPath) {
  const root = getProjectPath(projectPath);
  const reg = loadReg(root);
  return taskView.renderTaskBoard(reg, decisionStages(root, reg.tasks));
}
```

   `taskDetailScreen`, as the companion plan leaves it:

```js
function taskDetailScreen(id, projectPath) {
  const root = getProjectPath(projectPath);
  const reg = loadReg(root);
  const task = reg.tasks.find((t) => t.id === id);
  // Only the opened task is read for a decision, and only when it is done (decisionStages ignores any other).
  const { waiting, unreadable, unchecked } = decisionStages(root, task ? [task] : []);
  return taskView.renderTaskDetail(reg, id, { verifyPassed: storedVerifyOutcome(root, task), waiting, unreadable, unchecked });
}
```

3. **Exports**: `decisionStages` is added to `module.exports` (lines 3312-3357 today), after `taskDetailScreen`, with the
   comment `// The decision read behind the task screens' "Decision ready" (four-defects slice 28); exported so its own
   cost is timed in-process, apart from the screens (that plan's Step 12).`

##### Error Handling
`decisionStages` never throws: each folder listing, each vision test, the readiness read and each stubs read catches its
own fault — a folder's fault is named in `unreadable`, a stubs fault counted in `unchecked`, a readiness fault removes
nothing — and the dashboard's call sits inside the `try` around `bgLine` as today.

#### File: `src/lib/streaming-gate.js`
**Action:** MODIFY
**Purpose:** the task screens read slice 23's readiness rule from its one place instead of copying it, and skip the
validation and the question-store read of every plan their tasks do not name.
**Change Type:** modify-existing

##### Changes
1. One insertion in `module.exports` (lines 2523-2539), after `pendingGateDecisions`:

```js
  // The default screen's own split of the pending list into the decisions the owner is asked and the plans that need
  // nothing from him (four-defects slice 23, movesOnItsOwn); also read by menu-screens.decisionStages, so no task screen
  // marks a ready plan "a decision is waiting for you" (four-defects slice 28).
  askQueue,
```

2. **`pendingGateDecisions` gains `opts.only`** (lines 999-1160). Its JSDoc type (line 1048) becomes
   `@param {{crossed?: Array<{ref:string, toStage:string, name:string}>, only?: Set<string>}} [opts]`, and the paragraph
   below follows the paragraph "A REGULATED PROJECT" (lines 1038-1045). After `const crossed = …` (line 1058) comes
   `const only = !crossed && opts && opts.only instanceof Set ? opts.only : null;`, and after the stage's `readPlans`
   try/catch (lines 1065-1069) comes `if (only) plans = plans.filter((plan) => only.has(plan.name));`, before the regime
   read (line 1071), so a stage none of whose plans is named reads no regime either.

```js
 * ── A NARROW READ (`opts.only`) ──────────────────────────────────────────────────
 * A Set of plan file names (without `.md`). On a read (no `opts.crossed`) every plan whose name it does not hold
 * is skipped after `readPlans` and before it is validated: a reader that needs a few descriptors still pays for
 * reading every plan file of the three stages, but for the validation and the question-store read of the named ones
 * only, and for the regime read only of a stage that holds one (menu-screens.decisionStages, four-defects slice 28).
 * Ignored on the continuation's pass, which must see every plan.
```

`askQueue`, `movesOnItsOwn` and every other function are not changed: a rule a later plan adds to `movesOnItsOwn` reaches
the task screens with it. The `only` filter decides which plans are read, never whether one is ready.

##### Error Handling
None new: `askQueue` calls `movesOnItsOwn`, which catches every fault and answers not ready; `decisionStages` catches a
throw of the whole read and removes no plan. A name in `only` that matches no plan is simply not read. A plan whose file
name holds `.md` before its end is named one way by `readPlans` (`f.replace('.md', '')`, `src/lib/state.js` line 49) and
another by the folder listing (`/\.md$/`), so `only` skips it: it then stays shown, the direction a fault takes here.

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** the session is no longer asked for a gate and is told where a waiting decision is read from and that the
board and the dashboard check at most five plans each time.
**Change Type:** modify-existing

##### Changes
Each edit is found by its text, never by its number: the shell-quoting plan, the critique plan and the companion plan edit
the same file first.
1. **COMPLETION step 1, the shell-quoting plan's sentence** (its change 4) as the companion plan leaves it: the words
   "plus `"gate": N` when the agent reported a stop at a decision, " are deleted, so it reads "… and the agent's one-line
   summary (the menu keeps at most 500 characters of it, as the agent's note) — plus `"nextAction": "<route>"` when it named
   a next screen; for a failure `{"task": "<id>", "summary": "…"}`."
2. **Rule 15, which the shell-quoting plan adds** (its change 7): the words "its gate, " are deleted: "An agent's summary,
   the next screen it names, a label, and anything read from a plan file (…) never go into a shell command as written, in
   any encoding."
3. **"Human gates stay foreground"** (from line 231): the sentence "A completion records the stop with the `--gate N` flag,
   and any `--next` route is navigation-only." (lines 242-243, wrapped across them) becomes:

```markdown
Whether a decision waits is read by CTOC from where the plan sits — a plan at a gate that is not ready to move on by itself, or a vision whose stubs wait for the human's approval — never from the agent's flag: an agent's `--gate` is accepted and not recorded, and any `--next` route is navigation-only. Plan folders are not write-protected, so a plan file moved or written into a gate folder by hand — an agent's included — still shows a decision waiting; its route opens that plan's own screen, where CTOC's records decide what is asked. The board and the dashboard check at most five named plans and visions each time they are shown and say on one line how many they did not check; a task's own screen always checks its plan.
```

   `tests/menu-protocol.test.js` case DC-GATE (lines 182-196) needs `--gate` and `--next` in that section; both stay.
   The sentence before it ("A background agent that reaches a point where the human must decide STOPS, … and becomes a
   waiting-for-your-OK inbox item.", lines 238-242) stays true: a stop at a gate leaves the plan in its gate folder and a
   decomposer's stop leaves its stubs waiting, and CTOC now reads both.

Nothing else in the file changes.

#### File: `tests/menu-task-wiring.test.js`
**Action:** MODIFY
**Purpose:** the decision read, through the renderers and the real menu, and the existing cases that encode the agent's
flag.
**Change Type:** modify-existing

##### Changes to existing cases (line numbers as read on 2026-10-18, before the companion plan)
1. **S9** (lines 195-214) becomes:

```js
  it('S9: a done task whose plan waits for a decision says so, read from where the plan sits, never from the agent flag', () => {
    const waiting = new Map([['LH1', 'review']]);
    const reg = mkReg([
      T({ id: 't1', kind: 'review', plan: 'LH1', status: 'done', result: { ok: true, note: 'gate reached', nextAction: 'browse review' } }),
      T({ id: 't2', kind: 'review', plan: 'LH2', status: 'done', result: { ok: true, nextAction: 'browse review', gate: 3 } }),
    ]);
    const line = taskView.tasksInboxLine(reg, { waiting });
    assert.match(line, /Decision ready — LH1/);
    assert.doesNotMatch(line, /LH2/, "the agent's gate alone shows no decision");
    assert.doesNotMatch(line, /\bGate\s+[0-3]\b/, 'a gate number returned to the inbox line');
    const d1 = taskView.renderTaskDetail(reg, 't1', { waiting });
    assert.equal(d1.actions['Decision ready ▸'], 'plan review/LH1.md', "the decision opens the task's own plan where it sits");
    assert.ok(!Object.values(d1.actions).some((v) => /^claude:/.test(v)), 'no gate-crossing mutation');
    assert.match(d1.text, /a decision is waiting for you/);
    assert.doesNotMatch(JSON.stringify(d1), /\bGate\s+[0-3]\b/, 'a gate number returned to the detail screen');
    const d2 = taskView.renderTaskDetail(reg, 't2', { waiting });
    assert.doesNotMatch(d2.text, /decision is waiting/);
    assert.ok(!('Decision ready ▸' in d2.actions));
    assert.equal(d2.actions['Open LH2 ▸'], 'browse review', "the agent's suggested screen is still offered, under its own label");
  });
```

2. **The board-suffix case** (lines 394-408) becomes:

```js
  it('renderTasksSection: malformed queued task degrades wait reason; board shows decision-ready only where the plan waits', () => {
    const reg = mkReg([
      T({ id: 'q1', kind: 'implement', plan: 'pq', status: 'queued', blockedBy: 'oops' }), // non-array → canRun throws
      T({ id: 'g1', kind: 'review', plan: 'LH1', status: 'done', result: { ok: true, gate: 2 } }),
    ]);
    assert.match(taskView.renderTasksSection(reg), /waits: queued/, 'canRun throw degrades to generic label');
    const waiting = new Map([['LH1', 'implementation']]);
    assert.match(taskView.renderTaskBoard(reg, { waiting }).text, /decision ready/, 'done row carries the decision-ready suffix');
    assert.doesNotMatch(taskView.renderTaskBoard(reg).text, /decision ready/, "the agent's gate alone shows nothing");
    assert.doesNotMatch(taskView.renderTaskBoard(reg, { waiting }).text, /\bGate\s+[0-3]\b/, 'a gate number returned to the board');
  });
```

3. **The fall-back case** (lines 410-427, as the companion plan leaves it): its inbox part — the comment, the
   `tasksInboxLine` call and the assertion `/Decision ready — "gatelbl"/` — becomes

```js
    // A task with no plan has no plan folder to read, so no decision line, whatever its gate says (four-defects s28).
    const line = taskView.tasksInboxLine(mkReg([
      T({ id: 't9', kind: 'review', plan: null, label: 'gatelbl', status: 'done', result: { ok: true, gate: 1 } }),
    ]), { waiting: new Map([['gatelbl', 'review']]) });
    assert.doesNotMatch(line, /Decision ready/);
```

   followed by its existing `assert.doesNotMatch(line, /\bGate\s+[0-3]\b/, …)`.
4. **GS2** (lines 470-486): `assert.match(d.text, /a decision is waiting for you/, …)` (line 484) becomes
   `assert.doesNotMatch(d.text, /decision is waiting/, "the agent's gate alone shows no decision");`, and its comment (lines
   481-483) says the decision is now read from where the plan sits, never from the agent's gate.
5. **GS6** (lines 523-534) becomes:

```js
  it('GS6: a waiting decision is offered from where the plan sits, even with no next action; the gate alone shows none', () => {
    const reg = mkReg([T({ id: 't1', kind: 'review', plan: 'LH1', status: 'done', result: { ok: true, summary: 's', gate: 2 } })]);
    const d = taskView.renderTaskDetail(reg, 't1', { waiting: new Map([['LH1', 'implementation']]) });
    assert.match(d.text, /a decision is waiting for you/, 'decision shown as informational text');
    assert.doesNotMatch(d.text, /\bGate\s+[0-3]\b/, 'a gate number returned to the detail screen');
    assert.deepEqual(Object.keys(d.actions), ['Decision ready ▸', '◀ Back']);
    assert.equal(d.actions['Decision ready ▸'], 'plan implementation/LH1.md');
    const none = taskView.renderTaskDetail(reg, 't1');
    assert.doesNotMatch(none.text, /decision is waiting/);
    assert.deepEqual(Object.keys(none.actions), ['◀ Back'], 'no waiting plan, no next action → only Back');
  });
```

Unchanged and still passing, read for this plan: S18-4 (lines 978-986), S18-6 (lines 999-1012), S18-7 and S18-7b (lines
1014-1047) set `gate: 3` on tasks whose route is hostile or names another plan and expect only Back, or "Open OTHER ▸";
with no plan of theirs at a gate, no decision is offered. N3 (lines 831-840) passes `--gate 0`, accepted and not recorded,
and is offered `stubs my-vision` as "Open my-vision ▸". GS1 (line 461) passes `--gate 3` with a refused route.

##### A new describe at the end of the file

```js
describe('four-defects s28 — only where a plan sits says a decision waits', () => {
  const b64 = (v) => Buffer.from(JSON.stringify(v), 'utf8').toString('base64');
  const task = (id) => taskRegistry.load(root).tasks.find((t) => t.id === id);
  const CLASSIFIED = { by: 'gate-critic', at: 1786000000000 };
  const FORK = { id: 'q10-db', prompt: 'Which database engine?', critical: false, important: false, topic: 'technology-stack',
    options: [{ key: '1', label: 'Postgres', recommended: true }, { key: '2', label: 'SQLite' }] };
  /** The session's channel (start.md Rule 15): one JSON object in a scratch file, passed by its path. */
  const payloadFile = (obj) => {
    const dir = path.join(root, 'scratch');
    fs.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, `pl-${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(f, JSON.stringify(obj));
    return f;
  };
  function seedRunning(plan = 'LH1') {
    const reg = taskRegistry.load(root);
    const t = taskRegistry.addTask(reg, { kind: 'review', plan });
    taskRegistry.updateTask(reg, t.id, { status: 'running' });
    taskRegistry.save(root, reg);
    return t.id;
  }
  function planFile(stage, name) {
    fs.mkdirSync(path.join(root, 'plans', stage), { recursive: true });
    fs.writeFileSync(path.join(root, 'plans', stage, `${name}.md`), `# ${name}\n`);
  }
  function allStages() {
    fs.mkdirSync(path.join(root, '.ctoc'), { recursive: true });
    for (const stage of ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done']) {
      fs.mkdirSync(path.join(root, 'plans', stage), { recursive: true });
    }
  }
  /**
   * A functional plan that passes validation, with the gate critic's classified questions for its text. Under the
   * critique-attribution plan (four-defects s24) a classification counts only when bound to the plan's text; the store's
   * own writer binds a direct caller's classification to the text as it is now, which the last assertion holds.
   */
  function functionalPlan(name, questions) {
    const precompute = require('../src/lib/streaming-precompute');
    const file = path.join(root, 'plans', 'functional', `${name}.md`);
    fs.writeFileSync(file, `---\ntitle: ${name} feature\n---\n\n# ${name} feature\n\n## Problem Statement\nThe thing is broken.\n\n`
      + '## Acceptance Criteria\n- [ ] the thing works\n\n## Scope\nThe module.\n');
    const ref = `functional/${name}.md`;
    const res = precompute.writePlanQuestions(root, ref, questions, fs.statSync(file).mtimeMs, undefined, CLASSIFIED);
    assert.equal(res.ok, true, `fixture: questions for ${name} were written (${(res.errors || []).join('; ')})`);
    const sha = require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    assert.equal(precompute.planQuestionsStatus(root, ref).critiquedPlanSha256, sha,
      `fixture: ${name}'s classification is bound to its text (the critique-attribution plan)`);
  }

  it('S22-6: through the real menu, "decision ready" follows where the plan sits; the agent flag alone shows nothing; a folder that cannot be read hides only its own plans and is named on the task screens and the board', () => {
    planFile('review', 'LH1');
    planFile('todo', 'LH2');
    planFile('functional', 'LH3');
    const reg = taskRegistry.load(root);
    const a = seedDone(reg, 'LH1', { ok: true });
    seedDone(reg, 'LH1', { ok: true }); // a second done task on the same plan
    const b = seedDone(reg, 'LH2', { ok: true, gate: 3, nextAction: 'tasks' });
    const c = seedDone(reg, 'LH3', { ok: true, gate: 1, nextAction: 'tasks' }); // flagged, and its plan at a gate
    taskRegistry.save(root, reg);
    const dash = ms.route([], root).text;
    assert.equal((dash.match(/Decision ready — LH1/g) || []).length, 1, 'one line per plan');
    assert.match(dash, /Decision ready — LH3/);
    assert.doesNotMatch(dash, /Decision ready — LH2/);
    const board = ms.route(['tasks'], root).text;
    assert.match(board, new RegExp(`${a.id}\\s+review LH1\\s+\\[done\\] → decision ready`));
    assert.doesNotMatch(board, new RegExp(`${b.id}\\s+review LH2\\s+\\[done\\] → decision ready`));
    assert.equal(ms.route(['task', a.id], root).actions['Decision ready ▸'], 'plan review/LH1.md');
    assert.equal(ms.route(['task', c.id], root).actions['Decision ready ▸'], 'plan functional/LH3.md',
      'precondition of the fault below: LH3 waits while the folders can be read');
    const db = ms.route(['task', b.id], root);
    assert.ok(!('Decision ready ▸' in db.actions));
    assert.doesNotMatch(db.text, /decision is waiting/);
    fs.mkdirSync(path.join(root, 'plans', 'done'), { recursive: true });
    fs.renameSync(path.join(root, 'plans', 'review', 'LH1.md'), path.join(root, 'plans', 'done', 'LH1.md'));
    assert.ok(!('Decision ready ▸' in ms.route(['task', a.id], root).actions), 'the plan moved on: no decision waits');
    assert.doesNotMatch(ms.route([], root).text, /Decision ready — LH1/);
    // One plan folder that cannot be read — a file where review/ should be — hides only its own plans, and every task
    // screen and the board say so on one line; LH3 in functional/ still shows its decision. a (its plan now in done/)
    // and b (its plan in todo/, its agent's flag set) show none: a fall-back to the agent's flag fails on b. The
    // dashboard does not open while a gate folder cannot be read, so it is not opened here (Neighbours).
    fs.rmSync(path.join(root, 'plans', 'review'), { recursive: true, force: true });
    fs.writeFileSync(path.join(root, 'plans', 'review'), 'not a folder');
    const FAULT = '  ⚠ could not read plans/review/: a decision waiting there is not shown';
    assert.equal(ms.route(['task', c.id], root).actions['Decision ready ▸'], 'plan functional/LH3.md',
      'a folder that can be read still shows its decision');
    for (const t of [a, b]) {
      const d = ms.route(['task', t.id], root);
      assert.ok(!('Decision ready ▸' in d.actions), `no decision: ${t.id}`);
      assert.doesNotMatch(d.text, /decision is waiting/);
    }
    for (const t of [a, b, c]) {
      assert.ok(ms.route(['task', t.id], root).text.split('\n').includes(FAULT), `the fault is said on ${t.id}'s screen`);
    }
    const boardAfter = ms.route(['tasks'], root).text;
    assert.ok(boardAfter.split('\n').includes(FAULT), 'the board says it too');
    assert.match(boardAfter, new RegExp(`${c.id}\\s+review LH3\\s+\\[done\\] → decision ready`));
    assert.doesNotMatch(boardAfter, new RegExp(`${b.id}\\s+review LH2\\s+\\[done\\] → decision ready`));
  });

  it('S22-8: a --gate flag and a payload gate are accepted and not recorded', () => {
    for (const extra of [
      () => ['--gate', '3'],
      () => ['--b64', b64({ summary: 's', gate: 3 })],
      (id) => ['--payload-file', payloadFile({ task: id, summary: 's', gate: 3 })],
    ]) {
      const id = seedRunning();
      assert.equal(ms.route(['menu', 'task', 'complete', id, ...extra(id)], root).ok, true);
      assert.ok(!('gate' in task(id).result), JSON.stringify(task(id).result));
    }
  });

  it('S22-10: a plan the default screen calls ready is no decision waiting on any task screen; once it needs the owner, it is (slice 23, under the critique-attribution plan)', () => {
    const streamingGate = require('../src/lib/streaming-gate');
    const precompute = require('../src/lib/streaming-precompute');
    allStages();
    functionalPlan('rdy1', []); // classified, nothing to ask: the crossing would accept it
    functionalPlan('ask1', [FORK]); // an unanswered fork: the owner is asked
    const reg = taskRegistry.load(root);
    const r = seedDone(reg, 'rdy1', { ok: true });
    const a = seedDone(reg, 'ask1', { ok: true });
    taskRegistry.save(root, reg);
    const readyOnDefault = () => (streamingGate.streamingGateScreen(root).ready || []).map((e) => e.approve);
    // The precondition comes from the default screen itself: rdy1 is ready, ask1 is asked.
    assert.deepEqual(readyOnDefault(), ['stream approve functional/rdy1.md'], 'fixture: the default screen calls exactly rdy1 ready');
    // A file now waits in the quarantine folder, as one does between a critic's write and the next screen that takes it
    // in. Under the critique-attribution plan a file no started critique wrote is taken in unclassified, so it can make no
    // plan ready; it is here only so that a screen that swept the waiting folder would be seen: the file would be gone.
    const pending = precompute.pendingQuestionsPath(root, 'functional/ask1.md');
    fs.mkdirSync(path.dirname(pending), { recursive: true });
    fs.writeFileSync(pending, JSON.stringify({ ref: 'functional/ask1.md', questions: [], classification: CLASSIFIED }));
    // The baseline is the whole project, taken BEFORE the first task screen opens, so a write on that first open shows:
    // the task screens, the board and the dashboard take in no waiting file and write nothing.
    const tree = (dir) => (fs.statSync(dir).isDirectory()
      ? Object.fromEntries(fs.readdirSync(dir).sort().map((n) => [n, tree(path.join(dir, n))]))
      : fs.readFileSync(dir, 'utf8'));
    const before = JSON.stringify(tree(root));
    const unchanged = (what) => {
      assert.ok(fs.existsSync(pending), `${what}: the file still waits in the quarantine folder`);
      assert.equal(JSON.stringify(tree(root)), before, `${what}: nothing in the project changed`);
    };
    const dr = ms.route(['task', r.id], root); // the first task screen this case opens
    unchanged('the first task screen');
    const board = ms.route(['tasks'], root).text;
    unchanged('the board');
    const dash = ms.route([], root).text;
    unchanged('the dashboard');
    const da = ms.route(['task', a.id], root);
    unchanged('the second task screen');
    // rdy1: no decision on the task screen, the board or the dashboard.
    assert.ok(!('Decision ready ▸' in dr.actions));
    assert.doesNotMatch(dr.text, /decision is waiting/);
    assert.doesNotMatch(board, new RegExp(`${r.id}\\s+review rdy1\\s+\\[done\\] → decision ready`));
    assert.doesNotMatch(dash, /Decision ready — rdy1/);
    // ask1: the decision is shown on all three and opens the plan's own screen.
    assert.equal(da.actions['Decision ready ▸'], 'plan functional/ask1.md');
    assert.match(board, new RegExp(`${a.id}\\s+review ask1\\s+\\[done\\] → decision ready`));
    assert.match(dash, /Decision ready — ask1/);
    // Fault injection, restored in `finally`: a readiness read that fails removes no decision.
    const realAskQueue = streamingGate.askQueue;
    streamingGate.askQueue = () => { throw new Error('readiness read failed'); };
    try {
      assert.equal(ms.route(['task', r.id], root).actions['Decision ready ▸'], 'plan functional/rdy1.md');
    } finally {
      streamingGate.askQueue = realAskQueue;
    }
    // rdy1 comes to need the owner (an open fork): the default screen asks it, and the task screens agree.
    functionalPlan('rdy1', [FORK]);
    assert.ok(!readyOnDefault().includes('stream approve functional/rdy1.md'), 'fixture: the default screen asks rdy1 now');
    assert.equal(ms.route(['task', r.id], root).actions['Decision ready ▸'], 'plan functional/rdy1.md');
  });

  it('S22-11: a vision whose stubs wait for the owner is a decision waiting on its decompose task, read by CTOC and routed to its stubs', () => {
    planFile('vision', 'my-vision');
    const visionFile = path.join(root, 'plans', 'vision', 'my-vision.md');
    const doneFile = path.join(root, 'plans', 'done', 'my-vision.md');
    const reg = taskRegistry.load(root);
    const t = taskRegistry.addTask(reg, { kind: 'decompose', plan: 'my-vision' });
    taskRegistry.updateTask(reg, t.id, { status: 'running' });
    taskRegistry.updateTask(reg, t.id, { status: 'done', result: { ok: true, nextAction: 'stubs my-vision' } });
    taskRegistry.save(root, reg);
    // No stub yet: the vision is still being broken into plans, and nothing waits for the owner.
    assert.ok(!('Decision ready ▸' in ms.route(['task', t.id], root).actions), 'a vision with no stubs waits for nothing');
    // A functional stub naming the vision as its parent: the owner's approval of the stubs waits.
    fs.mkdirSync(path.join(root, 'plans', 'functional'), { recursive: true });
    fs.writeFileSync(path.join(root, 'plans', 'functional', 'stub-a.md'),
      '---\ntitle: "Stub A"\nparent_vision: vision/my-vision.md\n---\n\n# Stub A\n\n## Problem Statement\nPart of my vision.\n');
    const d = ms.route(['task', t.id], root);
    assert.equal(d.actions['Decision ready ▸'], 'stubs my-vision', "the decision opens the vision's stubs");
    assert.match(d.text, /a decision is waiting for you/);
    assert.match(ms.route(['tasks'], root).text, new RegExp(`${t.id}\\s+decompose my-vision\\s+\\[done\\] → decision ready`));
    assert.match(ms.route([], root).text, /Decision ready — my-vision/);
    // A second done task whose plan name holds a NUL, planted past the store: safe-fs refuses the vision path built from
    // it, and that hides only its own decision. The board reads every task, so the vision's task still shows its decision.
    const planted = taskRegistry.load(root);
    const nul = seedDone(planted, 'my\u0000vision', { ok: true });
    taskRegistry.save(root, planted);
    const boardWithNul = ms.route(['tasks'], root).text;
    assert.match(boardWithNul, new RegExp(`${t.id}\\s+decompose my-vision\\s+\\[done\\] → decision ready`),
      "a planted name safe-fs refuses hides only its own vision's decision");
    assert.doesNotMatch(boardWithNul, new RegExp(`${nul.id}\\s.*decision ready`));
    // Approved: claude:approve-stubs moves the vision to done/, and nothing waits any more.
    fs.mkdirSync(path.join(root, 'plans', 'done'), { recursive: true });
    fs.renameSync(visionFile, doneFile);
    assert.ok(!('Decision ready ▸' in ms.route(['task', t.id], root).actions), 'approved: no decision waits');
    // plans/functional/ made unreadable — where the stubs live: no stub can be read, so no vision decision is shown; the
    // screen still opens, names the folder it could not read, and says the decision could not be checked.
    fs.renameSync(doneFile, visionFile);
    fs.rmSync(path.join(root, 'plans', 'functional'), { recursive: true, force: true });
    fs.writeFileSync(path.join(root, 'plans', 'functional'), 'not a folder');
    const blind = ms.route(['task', t.id], root);
    assert.ok(!('Decision ready ▸' in blind.actions),
      'with plans/functional/ unreadable no stub can be read, so no vision decision is shown and the screen still opens');
    const blindLines = blind.text.split('\n');
    assert.ok(blindLines.includes('  ⚠ could not read plans/functional/: a decision waiting there is not shown'), blind.text);
    assert.ok(blindLines.includes("  ⚠ whether a decision waits on this task's plan could not be checked"), blind.text);
  });

  it("S22-16: one render checks at most five distinct named plans and visions, in the registry's order; one past the cap is never shown as a waiting decision, the board and the dashboard count it, and its own task screen checks it", () => {
    const streamingGate = require('../src/lib/streaming-gate');
    allStages();
    for (const name of ['cap1', 'cap2', 'cap3', 'cap4', 'cap5', 'cap6']) functionalPlan(name, [FORK]); // each one asked
    // A vision whose one functional stub names it: the owner's approval of its stubs waits.
    planFile('vision', 'vis1');
    fs.writeFileSync(path.join(root, 'plans', 'functional', 'vis1-stub.md'),
      '---\ntitle: "Vis1 stub"\nparent_vision: vision/vis1.md\n---\n\n# Vis1 stub\n\n## Problem Statement\nPart of vis1.\n');
    const ready = (streamingGate.streamingGateScreen(root).ready || []).map((e) => e.approve);
    assert.ok(!ready.some((x) => /cap\d/.test(x)), `fixture: the default screen asks every capN: ${JSON.stringify(ready)}`);
    // Eight done tasks in this order: cap1 twice (the cap counts plans, not tasks), vis1's decompose task, then cap2 to cap6.
    const reg = taskRegistry.load(root);
    const last = {};
    for (const name of ['cap1', 'cap1', 'vis1', 'cap2', 'cap3', 'cap4', 'cap5', 'cap6']) {
      const t = taskRegistry.addTask(reg, { kind: name === 'vis1' ? 'decompose' : 'review', plan: name });
      taskRegistry.updateTask(reg, t.id, { status: 'running' });
      taskRegistry.updateTask(reg, t.id, { status: 'done', result: { ok: true } });
      last[name] = t;
    }
    taskRegistry.save(root, reg);
    const NOT_CHECKED = "  ⚠ 2 plans not checked here for a waiting decision; each task's own screen checks its plan";
    const row = (name) => new RegExp(`${last[name].id}\\s+\\S+ ${name}\\s+\\[done\\] → decision ready`);
    const board = ms.route(['tasks'], root).text;
    for (const name of ['cap1', 'vis1', 'cap2', 'cap3', 'cap4']) assert.match(board, row(name), `${name}: checked, and waiting`);
    for (const name of ['cap5', 'cap6']) assert.doesNotMatch(board, row(name), `${name}: past the cap, not checked, not shown`);
    assert.ok(board.split('\n').includes(NOT_CHECKED), board);
    const dash = ms.route([], root).text;
    for (const name of ['cap1', 'vis1', 'cap2', 'cap3', 'cap4']) assert.match(dash, new RegExp(`Decision ready — ${name}\\b`));
    assert.doesNotMatch(dash, /Decision ready — cap[56]\b/);
    assert.ok(dash.split('\n').includes(NOT_CHECKED), dash);
    // A task screen checks its own task's plan only, so cap6's own screen checks it and shows the decision.
    const own = ms.route(['task', last.cap6.id], root);
    assert.equal(own.actions['Decision ready ▸'], 'plan functional/cap6.md');
    assert.ok(!own.text.includes('not checked') && !own.text.includes('could not be checked'), own.text);
  });

  it('S22-18: start.md asks for no gate and says where a waiting decision is read from and how many plans a screen checks', () => {
    const flat = fs.readFileSync(path.join(__dirname, '..', 'src', 'commands', 'start.md'), 'utf8').replace(/\s+/g, ' ');
    for (const gone of [
      'A completion records the stop with the `--gate N` flag',
      'plus `"gate": N`',
      'the next screen it names, its gate, a label',
    ]) assert.ok(!flat.includes(gone), `start.md still says: ${gone}`);
    for (const said of [
      'the next screen it names, a label',
      "Whether a decision waits is read by CTOC from where the plan sits — a plan at a gate that is not ready to move on by itself, or a vision whose stubs wait for the human's approval — never from the agent's flag: an agent's `--gate` is accepted and not recorded, and any `--next` route is navigation-only. Plan folders are not write-protected, so a plan file moved or written into a gate folder by hand — an agent's included — still shows a decision waiting; its route opens that plan's own screen, where CTOC's records decide what is asked. The board and the dashboard check at most five named plans and visions each time they are shown and say on one line how many they did not check; a task's own screen always checks its plan.",
    ]) assert.ok(flat.includes(said), `start.md lacks: ${said}`);
  });
});
```

S22-10 and S22-16 write the classified question files with the store's own writer, and S22-10's precondition is read from
the default screen, so if a later change alters what makes a plan ready, the first assertion to fail names the fixture,
never a task-screen assertion. The waiting file is written only after that precondition, because the default screen sweeps
the folder first (`streamingGateScreen`, line 2132); a sweep consumes every `.json` file there, so a task screen, the board
or the dashboard that swept would remove it. The later `readyOnDefault()` call takes it in; nothing after that call reads
ask1.

#### File: `tests/menu-screens-coverage.test.js`
**Action:** MODIFY
**Purpose:** one case's name says the gate number is parsed into the task's result, which stops being true.
**Change Type:** modify-existing

##### Changes
Line 1013: the name `complete_parses_a_gate_number_and_a_nav_next_action_into_the_result` becomes
`complete_accepts_a_gate_flag_and_a_nav_next_action`. Only the name changes: the body (lines 1014-1018) asserts that the
completion is accepted (`ok`, status `done`), which stays true.

### Test Plan

**Framework:** `node:test` with `node:assert/strict`, as the two files use. No test file is added, so no documented count
moves and no ratchet file is declared. No case times anything (the owner's rule of 2026-10-18: timing tests stay out of
the gated suite); the timing is Step 12's recorded measurement.

| Case | Before the change | After | What it pins |
|------|-------------------|-------|--------------|
| S22-6 | FAILS: LH1 (no gate) shows no decision and LH2 (gate 3) shows one | passes | the decision read from the folder, through the real menu; one line per plan; gone once the plan moves on; an unreadable folder hides only its own plans, the flag never stands in, and the task screens and the board name the folder |
| S22-8 | FAILS: the gate is recorded | passes | accepted, not recorded |
| S22-10 | FAILS at ask1's first assertion: no task shows a decision (their agents set no gate); its precondition, its four no-write checks and rdy1's assertions pass | passes | the task screens, the board and the dashboard take in nothing and change nothing; a plan the default screen calls ready is no decision; a plan that needs the owner is; a readiness fault removes nothing; readiness that ends brings the decision back |
| S22-11 | FAILS: the vision with a stub shows no decision; its task offers only the agent's "Open my-vision ▸" | passes | a vision whose stubs wait is a decision, routed to its stubs; a planted NUL name hides only its own; none once approved; with `plans/functional/` unreadable no vision decision, the folder named, and the plan named as not checked |
| S22-16 | FAILS at its first board assertion: no task shows a decision (no agent set a gate); its precondition passes | passes | at most five distinct named plans and visions checked per render, in the registry's order; past the cap never shown, counted on the board and the dashboard; the task screen checks its own |
| S22-18 | FAILS: start.md still asks for the gate and lacks the sentence | passes | the session's instructions |
| S9, the board-suffix case (rewritten) | FAIL: the decision comes from the gate | pass | the old expectation replaced |
| GS6 (rewritten) | FAILS first at its options assertion: no option is offered — the waiting decision is not read from where the plan sits, and with no next action no option appears; its two text assertions pass before it (the agent's `gate: 2` prints the decision text) | passes | a waiting decision offered from where the plan sits, also with no next action; with nothing waiting, only Back |
| GS2 (changed) | FAILS: the gate shows a decision | passes | the flag alone shows nothing |
| the fall-back case (its inbox part changed) | FAILS: the gate gives the planless task a decision line | passes | a task with no plan shows no decision, whatever its gate says |
| `complete_accepts_a_gate_flag_and_a_nav_next_action` (renamed only) | passes | passes | its name no longer says the gate is parsed into the result |

**Never through git.** The checkout the build runs in may hold other work, so no step runs `git checkout`, `git restore`,
`git stash` or `git reset`. Each mutant below is one Edit-tool edit, undone by the reverse edit (the mutant's text as
`old_string`, the original as `new_string`). Before the first mutant, record the sha256 of the three source files with

```
node -e "const c=require('crypto'),f=require('fs');for(const p of process.argv.slice(1))console.log(c.createHash('sha256').update(f.readFileSync(p)).digest('hex'),p)" src/lib/task-view.js src/lib/menu-screens.js src/lib/streaming-gate.js
```

run from the repository root; after each reversal the same command must print the same three lines. If it does not, the
reversal is corrected with the Edit tool before anything else runs.

**Mutants** (Step 10, after the change). Each must turn the named cases red:
- read `result.gate` again for the board suffix: the board-suffix case and S22-6 fail;
- let `decisionRoute` return a route whatever `waiting` holds: S9 (LH2) and S22-6 fail;
- drop the de-duplication in `tasksInboxLine`: S22-6 fails (two lines for LH1);
- record the gate again: S22-8 fails;
- drop the readiness read (keep every checked plan at a gate): S22-10 fails (rdy1 shows a decision);
- remove the asked plans instead of the ready ones (`split.asks` for `split.ready`): S22-10 fails (ask1 shows none);
- hide every checked plan at a gate on a readiness fault (`ready = new Set(atGates)` in the `catch`): S22-10 fails;
- make the decision read take in the waiting files (in `decisionStages`, before the readiness read,
  `require('./streaming-questions-sweeper').sweepPendingQuestions(root);`): S22-10 fails at its first task screen;
- make the decision read write (in `decisionStages`, before its return, `taskRegistry.save(root, taskRegistry.load(root));`):
  S22-10 fails at its first task screen;
- drop the cap (`const checked = candidates;`): S22-16 fails (cap5 and cap6 shown);
- show an unchecked plan at a gate as waiting (set every candidate past the cap into `waiting`): S22-16 fails;
- count tasks, not plans (build `candidates` from the done tasks' plan names with repeats): S22-16 fails (cap4 is past the
  cap);
- drop the not-checked line (`uncheckedLine` returns ''): S22-16 and S22-11 fail;
- drop the `try` around each folder listing in `decisionStages`: S22-6 fails (the task screen throws);
- list the three folders through `listPlansAtGates(root)` inside one `try` whose catch names all three (the binding
  `src/lib/menu-screens.js` imports from `./inbox`, line 28): S22-6 fails at its first assertion after the fault (LH3's
  decision is hidden by the unreadable `review/`);
- drop the fault line (`unreadableLine` returns ''): S22-6 and S22-11 fail;
- drop the vision read from `decisionStages`: S22-11 and S22-16 fail;
- test every vision name in one `try` whose catch removes every vision: S22-11 fails (the planted NUL name);
- show a vision whose stubs read failed as a decision: S22-11 fails.

**Edge cases:** a second task on the same plan; a plan that moves on; a vision with and without stubs, approved, with a
stubs folder that cannot be read, and with a planted name holding a NUL; a plan the default screen calls ready beside one it
asks; a ready plan that comes to need the owner; a readiness read that throws; one gate folder that cannot be read while a
plan sits in another; a waiting file in the quarantine folder while the task screens, the board and the dashboard open; six
asked plans and a vision named by eight done tasks, one plan twice; a task with no plan and a gate; a gate flag and a
payload gate; a generated project of 300 plans at its gates and 20 waiting visions (Step 12).

**Coverage:** every line of the new code is reached by S22-6 to S22-18 and the changed cases. Reached in `decisionStages`:
no named plan, a gate folder that does not exist, a gate folder that cannot be read beside ones that can, a plan at a
gate, a vision with and without stubs, a vision name safe-fs refuses, a stubs read that fails, a ready plan removed, an
asked plan kept, a failing readiness read, more named plans and visions than the cap. In `decisionRoute`, a waiting name
no read-only route shape accepts (a plan file at a gate whose name holds a space) shares its line with a reached condition;
the coverage floor counts lines, so coverage of `src/` does not fall.

**Timing (Step 9 makes the copies before the change; Step 12 makes the generated project and measures in one sitting
after it).** The dashboard's table runs the reconcile pass, which can save the task registry, and plan recovery, which can
move an orphaned build's plan back to `todo/` (`buildDashboardTable`, `src/lib/menu-screens.js` lines 502-726). Opened on
the checkout itself it could orphan a running task whose fate is the owner's call. So the renders are timed on a copy of
this repository's plans and records and on a generated project, both in-process: the script below loads the menu's modules
and calls their routes and `decisionStages` directly, each given a scratchpad folder as its root; it never launches the
menu. None of these routes is one slice 21's revision refuses a background agent (the routes that record the owner's
decision). The script runs with its working directory set to `<scratchpad>/cwd`, an empty folder Step 9 makes, takes the
repository root as an argument, refuses to start unless that folder is empty and both paths are absolute, and prints last
whether the folder is still empty, so a write some module makes relative to the working directory lands in the scratchpad
and is seen. `git status --porcelain=v1 --untracked-files=all` is read before and after each run, and a change stops the
build. `git status` cannot see a path git ignores — the task registry `.ctoc/state/tasks.json` and its warn log
`.ctoc/logs/task-registry.json` among them (`.gitignore`) — so Steps 8 and 16 record their sha256 with

```
node -e "const c=require('crypto'),f=require('fs');for(const p of process.argv.slice(1))console.log(f.existsSync(p)?c.createHash('sha256').update(f.readFileSync(p)).digest('hex')+'  '+p:'absent: '+p)" .ctoc/state/tasks.json .ctoc/logs/task-registry.json
```

run from the repository root. A difference shows a write between the two steps, not whose — the session's own menu writes
the registry while this build runs — so it is recorded as it is and does not stop the build.

```js
// time.js — in the executor's scratchpad, never in this repository. Run with the working directory set to
// <scratchpad>/cwd, an empty folder, never the repository; both paths given are absolute:
//   node <scratchpad>/time.js copy <repository root> <scratchpad>
//   node <scratchpad>/time.js generate <repository root> <scratchpad> <count>
//   node <scratchpad>/time.js time <repository root> <scratchpad> <timing|generated> <task id> <code A> <code B> <rounds>
// copy (Step 9, before the change): copies the repository's plans/, .ctoc/ and VERSION into <scratchpad>/timing (the
//   data), and its src/, VERSION and .ctoc/regulatory-regimes into <scratchpad>/before and <scratchpad>/before-again (the
//   code before this plan, twice, so the noise run compares two copies of one code); then one dashboard render of the
//   code before settles the data copy (its reconcile pass and plan recovery act on the copy only).
// generate (Step 12, just before the sitting): makes <scratchpad>/generated, a project with <count> plans at its gates —
//   more than the repository holds, or it refuses — a third in each gate folder, named gen-0001 on, each a copy of one of
//   the repository's plans at a gate taken in turn, so each reads as long as a real plan; 20 visions in plans/vision/,
//   gen-vision-01 on, each named as its parent by one functional stub, gen-stub-01 on; and done tasks written with the
//   code before's own task registry, in this order: decompose tasks for the first four visions, one review task per plan,
//   then decompose tasks for the other sixteen visions. So the first five names one render checks are four visions and
//   one plan at a gate — four full reads of functional/ and one readiness read of all three gate folders, the costliest
//   mix of checks under the cap by plan files read — and the dashboard and the board pass the cap. Made minutes before it
//   is timed, so the reconcile pass's seven-day retention keeps every done task. Prints the repository's count, what it
//   made, and the first plan task's id, whose screen this data set times.
// time (Step 12): <timing|generated> names the data set. Code A and code B each name a code — `before` or `before-again`
//   (those folders in <scratchpad>) or `after` (the repository root, the code as this plan leaves it) — whose menu modules
//   are loaded into this one process. For each of the dashboard, the task board, the task screen of <task id> and
//   decisionStages over every task (only for a code that exports it), it calls each code once to warm it, then runs
//   <rounds> rounds, A and B alternating (A first in even rounds, B first in odd ones); every call is on the data set,
//   after clearing that code's in-process cache (cache.js memoizes the plan and inbox counts for 5 seconds), so each call
//   reads the folders as a fresh menu process does. Prints per call each code's median and times in milliseconds, and B's
//   median minus A's.
// Every mode reads the repository and writes only inside <scratchpad>.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const [mode, repo, scratch, ...rest] = process.argv.slice(2);
const absolute = (p) => typeof p === 'string' && path.isAbsolute(p);
if (!absolute(repo) || !absolute(scratch) || fs.readdirSync(process.cwd()).length > 0) {
  console.error('usage, from an empty working directory: time.js copy|generate|time <repository root> <scratchpad> …,'
    + ' both absolute');
  process.exit(2);
}
const DATA = { timing: path.join(scratch, 'timing'), generated: path.join(scratch, 'generated') };
const CODES = { before: path.join(scratch, 'before'), 'before-again': path.join(scratch, 'before-again'), after: repo };
const GATES = ['functional', 'implementation', 'review'];
const VISIONS = 20;
const load = (code) => {
  const lib = path.join(code, 'src', 'lib');
  return {
    menu: require(path.join(lib, 'menu-screens.js')),
    cache: require(path.join(lib, 'cache.js')),
    registry: require(path.join(lib, 'task-registry.js')),
  };
};
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2;
};
const [dataName, taskId, codeA, codeB, roundsArg] = rest;
if (mode === 'copy') {
  const data = DATA.timing;
  for (const p of ['plans', '.ctoc', 'VERSION']) fs.cpSync(path.join(repo, p), path.join(data, p), { recursive: true });
  for (const code of ['before', 'before-again']) {
    for (const p of ['src', 'VERSION', path.join('.ctoc', 'regulatory-regimes')]) {
      fs.cpSync(path.join(repo, p), path.join(CODES[code], p), { recursive: true });
    }
  }
  load(CODES.before).menu.route(['dashboard'], data, {});
  console.log(`copy: ${data}`);
} else if (mode === 'generate' && /^\d+$/.test(String(rest[0]))) {
  const data = DATA.generated;
  const count = Number(rest[0]);
  const sources = GATES.flatMap((g) => fs.readdirSync(path.join(repo, 'plans', g)).filter((f) => f.endsWith('.md'))
    .sort().map((f) => path.join(repo, 'plans', g, f)));
  if (sources.length === 0 || count <= sources.length || fs.existsSync(data) || !fs.existsSync(CODES.before)) {
    console.error(`generate: needs a count above the repository's ${sources.length} plans at its gates, no ${data} yet,`
      + ' and the copy of the code before (time.js copy, Step 9)');
    process.exit(2);
  }
  for (const stage of ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done']) {
    fs.mkdirSync(path.join(data, 'plans', stage), { recursive: true });
  }
  fs.mkdirSync(path.join(data, '.ctoc'), { recursive: true });
  fs.copyFileSync(path.join(repo, 'VERSION'), path.join(data, 'VERSION'));
  const two = (n) => String(n).padStart(2, '0');
  for (let v = 1; v <= VISIONS; v += 1) {
    fs.writeFileSync(path.join(data, 'plans', 'vision', `gen-vision-${two(v)}.md`), `# gen-vision-${two(v)}\n\nA generated vision.\n`);
    fs.writeFileSync(path.join(data, 'plans', 'functional', `gen-stub-${two(v)}.md`),
      `---\ntitle: "gen-stub-${two(v)}"\nparent_vision: vision/gen-vision-${two(v)}.md\n---\n\n# gen-stub-${two(v)}\n\n`
      + `## Problem Statement\nPart of gen-vision-${two(v)}.\n`);
  }
  const { menu, registry } = load(CODES.before);
  const reg = registry.emptyRegistry();
  const done = (kind, plan) => {
    const t = registry.addTask(reg, { kind, plan });
    registry.updateTask(reg, t.id, { status: 'running' });
    registry.updateTask(reg, t.id, { status: 'done', result: { ok: true } });
    return t;
  };
  for (let v = 1; v <= 4; v += 1) done('decompose', `gen-vision-${two(v)}`);
  let firstPlanTask = null;
  for (let i = 0; i < count; i += 1) {
    const name = `gen-${String(i + 1).padStart(4, '0')}`;
    fs.copyFileSync(sources[i % sources.length], path.join(data, 'plans', GATES[i % GATES.length], `${name}.md`));
    const t = done('review', name);
    if (firstPlanTask === null) firstPlanTask = t;
  }
  for (let v = 5; v <= VISIONS; v += 1) done('decompose', `gen-vision-${two(v)}`);
  registry.save(data, reg);
  menu.route(['dashboard'], data, {});
  console.log(`generate: ${data}; the repository holds ${sources.length} plans at its gates, this project ${count}`
    + ` and ${VISIONS} waiting visions; first plan task ${firstPlanTask.id}`);
} else if (mode === 'time' && Object.hasOwn(DATA, dataName) && taskId && Object.hasOwn(CODES, codeA)
    && Object.hasOwn(CODES, codeB) && Number(roundsArg) >= 10) {
  const data = DATA[dataName];
  const codes = [['A', load(CODES[codeA])], ['B', load(CODES[codeB])]];
  for (const [, m] of codes) m.tasks = m.registry.load(data).tasks;
  const calls = {
    dashboard: (m) => m.menu.route(['dashboard'], data, {}),
    board: (m) => m.menu.route(['tasks'], data, {}),
    task: (m) => m.menu.route(['task', taskId], data, {}),
    decisionStages: (m) => m.menu.decisionStages(data, m.tasks),
  };
  for (const [name, call] of Object.entries(calls)) {
    const live = codes.filter(([, m]) => name !== 'decisionStages' || typeof m.menu.decisionStages === 'function');
    if (live.length === 0) continue;
    const times = Object.fromEntries(live.map(([label]) => [label, []]));
    for (const [, m] of live) {
      m.cache.invalidate();
      call(m);
    }
    for (let round = 0; round < Number(roundsArg); round += 1) {
      for (const [label, m] of round % 2 === 0 ? live : [...live].reverse()) {
        m.cache.invalidate();
        const start = process.hrtime.bigint();
        call(m);
        times[label].push(Number(process.hrtime.bigint() - start) / 1e6);
      }
    }
    const each = live.map(([label]) => `${label} median ${median(times[label]).toFixed(1)} ms (${times[label].map((t) => t.toFixed(1)).join(', ')})`);
    const diff = live.length === 2 ? `; B minus A ${(median(times.B) - median(times.A)).toFixed(1)} ms` : '';
    console.log(`${name}: ${each.join('; ')}${diff}`);
  }
} else {
  console.error('usage: time.js copy <repository root> <scratchpad> | time.js generate <repository root> <scratchpad>'
    + ' <count> | time.js time <repository root> <scratchpad> <timing|generated> <task id>'
    + ' <before|before-again|after> <before|before-again|after> <rounds, at least 10>');
  process.exit(2);
}
console.log(`working directory still empty: ${fs.readdirSync(process.cwd()).length === 0}`);
```

The task screen timed on the copy is that of the first done task in the settled copy's registry whose plan sits in the
copy's `functional/`, `implementation/` or `review/` (the screen that pays for the readiness read), else of the first done
task; its id is chosen and recorded at Step 9. On the generated project it is the first plan task `generate` prints, whose
plan sits in its `functional/`.

**The sitting (Step 12).** First `node <scratchpad>/time.js generate <repository root> <scratchpad> 300` makes the
generated project (if the repository then holds 300 or more plans at its gates, `generate` refuses and prints its count,
and is run again with twice that). Then four runs, one after another, all from `<scratchpad>/cwd`: for each data set —
first `timing`, with Step 9's task id, then `generated`, with the id `generate` printed — the noise run, the code before
against its own second copy (`… time <repository root> <scratchpad> <data set> <task id> before before-again 10`), whose
"B minus A" on each render states the noise of this machine and this method on that data set, then at once the code
before against the code after (`… before after 10`). All outputs are recorded whole.
**The bound:** on each of the dashboard, the task board and the task screen, the code after's median exceeds the code
before's by at most 100 milliseconds in both runs of the code before against the code after. `decisionStages`' own median is
recorded beside them. A noise run whose "B minus A" exceeds 100 milliseconds on any render makes the sitting inconclusive:
all four runs are repeated once with 30 rounds, and both sittings are recorded; a second inconclusive sitting is not
repeated again and counts as a breach.
**On a breach** — a render over the bound in a conclusive sitting, or a second inconclusive sitting — the times are recorded
with every sitting, the timing's acceptance box stays unchecked, so the plan cannot finish on its checks, and the build goes
on through Step 16; it does not go back to Step 10, because the cap is built from the start. The measured times go to the
owner as one question in the format of `.ctoc/ask-me-questions.md`, written under `### Step 12: OPTIMIZE — the question for
the owner`, with two options: **a)** schedule a change to `state.readPlans` that reads only the named plans' files —
Recommended: `readPlans` reads, stats and parses every plan file of a folder before a caller can filter (`src/lib/state.js`
lines 20-61), the one cost the cap does not bound; it is outside this plan, which does not declare `src/lib/state.js`;
**b)** accept the measured times, so that the owner's OK finishes this plan with the box unchecked and the times on record.
With no breach, no question is written.

### Security Review
- [ ] Spoofing a decision: no screen reads the agent's `gate`, and the store no longer records it; "Decision ready" comes
  only from CTOC's read of the plan folders, less the plans slice 23's own rule calls ready, and of `plans/vision/` with
  stubs that name the vision; the route is built by CTOC to the task's own plan where it sits, or to its vision's stubs,
  and offered only as an exact read-only route. Not covered: a plan file moved or written by hand into a gate folder — an
  agent's included — raises "Decision ready", because plan folders are not write-protected (`src/hooks/protect-records.js`
  lines 10-24 name the records it guards, and no plan folder); the route still opens CTOC's own screen for that plan.
- [ ] Hiding a decision: a registry flooded with done tasks naming other plans can push a real waiting decision past the
  cap of five on the board and the dashboard; the screens then say how many plans they did not check, the plan's own task
  screen checks it, and the default screen still asks every pending decision.
- [ ] No second rule: readiness is slice 23's `askQueue`, exported and called, never copied; a fault in it keeps the
  decision shown.
- [ ] The read-only task screens stay read-only: `pendingGateDecisions` without `opts.crossed` crosses nothing, and nothing
  `decisionStages` calls takes in a waiting gate-critic file; S22-10 holds the whole project byte for byte across a task
  screen, the board, the dashboard and a second task screen, and two mutants (a sweep, a registry save) show it can fail.
- [ ] Denial of service: the decision read runs only when a done task names a plan, once per screen, and checks at most
  five names per render; it does not bound `readPlans`' full read of the three gate folders, and each checked vision costs
  one full read of `functional/`. Step 12 measures it on a copy of this repository and on a generated project of 300
  plans at its gates and 20 waiting visions.
- [ ] No secrets, no new dependency, and no file read that CTOC's own screens do not already make: the three plan folders
  (here one at a time), a vision's file and the functional plans (`state.getVisionStubs`, the stubs screen's read), and
  what `pendingGateDecisions` and `askQueue` read for the default screen.

### Wiring — the live call sites
- `/ctoc:start` loads `src/commands/start.md`, which runs `src/commands/start.js`; `main` → `route`
  (`src/lib/menu-screens.js` line 3191) → `tasks` (`taskBoardScreen`), `task <id>` (`taskDetailScreen`), `menu task board`
  (`taskCommand`, now through `taskBoardScreen`), and every route that renders the dashboard (`dashboardPipeline` and
  `dashboardCommands` → `buildDashboardTable`, whose INBOX lines this plan changes). Each calls `decisionStages(root,
  tasks)` once and passes what it returns to the renderer; `decisionStages` calls `streamingGate.askQueue` (newly exported)
  on `streamingGate.pendingGateDecisions(root, { only })` and `state.getVisionStubs`.
- `menu task complete` → `taskComplete`, which accepts a gate and records none.
- The session's instructions: start.md, loaded by `/ctoc:start`.
- Root: the shipped slash command `/ctoc:start`. No module is added; the new helpers and exports are called by the routes
  and renderers above.

## Acceptance Criteria

- [ ] A `--gate` flag or a payload `gate` is accepted and not recorded; no screen reads a task's `gate` (S22-8, the
  board-suffix case, S9, GS2, GS6, the fall-back case).
- [ ] "Decision ready" appears on the board, the task screen and the dashboard only for a done task whose own plan was
  checked in that render and sits in `functional/`, `implementation/` or `review/`, or whose vision sits in `plans/vision/`
  with stubs naming it; the route opens that plan where it sits, or the vision's stubs; one dashboard line per plan; it
  disappears when the plan moves on or the stubs are approved; a plan folder that cannot be listed hides only its own plans,
  and the task screens and the board name it on one line; a planted plan name that safe-fs refuses hides only its own
  vision's decision (S9, GS6, S22-6, S22-11).
- [ ] A checked plan at a gate that the default screen calls ready (slice 23's `askQueue`, read from
  `src/lib/streaming-gate.js`, never copied) shows no "Decision ready" and no "a decision is waiting for you" on the board,
  the task screen or the dashboard; one the default screen asks shows it; a ready plan that comes to need the owner shows
  it again; and a readiness read that fails removes no checked plan — the one way a checked plan is shown without the
  split's verdict (S22-10).
- [ ] Each render checks at most five distinct named plans and visions, the first in the registry's order; a plan or vision
  not checked — past the cap, or a vision whose stubs could not be read — is never shown as a waiting decision, and the
  board, the dashboard and the task screen say on one line that it was not checked; a task's own screen checks its plan
  (S22-16, S22-11).
- [ ] The task screens, the board and the dashboard take in no waiting gate-critic file and change nothing in the project
  (S22-10).
- [ ] start.md asks for no gate, says that a waiting decision is read from where the plan sits and never from the agent's
  flag, that a plan file moved or written into a gate folder by hand still shows one, and that the board and the dashboard
  check at most five each time and say how many they did not (S22-18).
- [ ] The red cases were seen failing before the change, and each mutant was killed and undone by reversing its edit with
  the Edit tool, the three sha256 lines matching the ones recorded before the first mutant each time; no `git checkout`,
  `git restore`, `git stash` or `git reset` was run.
- [ ] Only the six declared files and this plan were changed by this build: at Step 16 a fresh `git status` against Step
  8's baseline lists every other changed path in the record, and the build edited none of them; the sha256 of the task
  registry and its warn log are recorded beside Step 8's; and `time.js` ran with the working directory set to the empty
  `<scratchpad>/cwd`, every run's last line reading `working directory still empty: true`.
- [ ] At most 100 milliseconds added to each of the dashboard, the task board and the task screen, in a conclusive
  sitting, on the copy of this repository's plans and records and on the generated project, which holds more plans at its
  gates than this repository (300, or twice the repository's count if that is 300 or more) and 20 waiting visions.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0
  skipped and 0 flaky.

## Risks

- **A plan file moved or written by hand into a gate folder still raises "Decision ready".** Plan folders are not
  write-protected, and the hook that reverts an unrecorded move is not registered (`docs/ENFORCEMENT.md`). The signal never
  comes from the agent's flag, but it can come from an agent's file move; the route opens CTOC's own screen for that plan,
  where its records decide what is asked. start.md says so. Likelihood LOW, impact LOW.
- **Past the cap, a waiting decision is not shown on the board or the dashboard.** With more than five named plans and
  visions at once, the later ones are not checked; the screens say how many, each task's own screen checks its plan, and
  the default screen asks every pending decision. Likelihood MEDIUM on a busy project, impact LOW.
- **A vision's stubs are matched by a substring.** `state.getVisionStubs` counts every functional plan whose `parent_vision`
  contains the vision's name anywhere (`src/lib/state.js` lines 613-617), so a vision named `auth` also counts the stubs of
  `oauth-flow`; the route opens `stubs auth`, which lists the same stubs. Likelihood LOW, impact LOW.
- **A gate critic's file that has only just landed.** The task screens take in no waiting file, while the default screen
  takes it in before it reads, so in the moment between the file landing and the next screen that takes it in, a task screen
  can show "Decision ready" for a plan the default screen would call ready. It errs toward showing, and the route opens the
  plan's own screen, which takes the file in first. Likelihood LOW, impact LOW.
- **The decision read costs time.** The readiness read reads every plan file of the three gate folders before `only`
  filters, and each checked vision reads all of `functional/`; the cap bounds the validations, the question-store reads and
  the stubs reads to five per render, not the folder reads. Step 12 measures it, and a breach goes to the owner with the
  times (above). Likelihood MEDIUM, impact LOW.
- **The critique plan changes what makes a plan ready, and is not built.** This plan's `depends_on` names it, so it builds
  after it, and its fixtures are written to its rule: a classification counts only when bound to the plan's text, which
  the store's own writer records for a direct caller (that plan's `writePlanQuestions` change and its case at its lines
  1967-1969, read on 2026-10-18). Each fixture asserts the binding, so a change to that rule fails on the fixture, never on
  a task-screen assertion. If the owner withdraws the critique plan, this plan waits on it until its `depends_on` is
  changed. Likelihood MEDIUM, impact LOW.
- **Existing expectations change** (S9, the board-suffix case, the fall-back case's inbox part, GS2, GS6, and the renamed
  coverage case). Each encodes the agent's flag, which this plan replaces; none is weakened: each now asserts that the flag
  alone shows nothing.

## Decisions Taken Under Ambiguity

All taken on 2026-10-18.

1. **The old plan is split in two, along the seam its own decisions named (the owner's answer of 2026-10-18,
   "Split along Decision 76's seam into two shorter-named plans, then re-run the critique", Recommended).** This plan holds
   the read that says a decision waits; the companion plan holds the words an agent writes. They share `renderTaskBoard`,
   `renderTaskDetail` and `tasksInboxLine`, so this plan builds after the companion plan and edits them as it leaves them.
   **The pre-mortem lens's hold is answered by the split:** it refused the old file's 126-character name against its
   120-character limit; this file's name is 112 characters, and the plan is short enough to be read whole.
2. **A decision waits when the task's own plan was checked and sits at a gate the default screen does not call ready, or
   names a vision whose stubs wait.** The alternative — also counting an open inbox question that names the task's plan — is
   not built: inbox question files are not write-protected, and such a question is shown by the inbox's own screens.
3. **Readiness is slice 23's rule, reused, never copied.** The task screens call the default screen's own split,
   `askQueue`, exported from `src/lib/streaming-gate.js`; `movesOnItsOwn` stays module-local. A review plan is never ready by
   that rule (its destination is `done`), so it keeps showing a decision, as the default screen keeps asking it.
4. **The two readiness criteria agree: a plan is never shown as a waiting decision unless it was checked (the owner's answer
   of 2026-10-18, "Send back — make the two readiness criteria agree", Recommended).** Past the cap of five per render a
   plan or vision is not checked and not shown, and the board, the dashboard and the task screen say on one line how many
   were not checked, so nothing is hidden silently. The one named exception, written into the criterion itself: a
   readiness read that fails removes no checked plan, because a plan that sits at a gate may need the owner and its route
   opens its own screen, which asks properly. A vision whose stubs cannot be read is counted as not checked: whether a
   decision waits on it is unknown.
5. **One cap for plans and visions, five per render (the owner's answer of 2026-10-18 on the uncapped vision read, "Send
   back — cap the waiting-vision read or add visions to the timing run", Recommended).** Both are done: the vision read
   counts toward the same five, the most decision lines the dashboard shows, and the generated timing project holds 20
   waiting visions, ordered so the first five checks are the costliest mix.
6. **Build order with the critique plan, and fixtures fitted to its rule (the owner's answer of 2026-10-18, "Send back —
   declare the order with slice 24 and fit the fixtures", Recommended).** This plan names the critique plan in `depends_on`:
   it reads the readiness rule that plan changes, so it is built and its fixtures written against the rule as it will be;
   the critique plan's builder then never has to edit this plan's tests, which are outside its files. Every classified file
   whose classification must count is written through `writePlanQuestions`, which binds the plan's text under that plan,
   and the fixture asserts the binding. The raw waiting file in S22-10 is now only a sweep detector: under that plan it is
   taken in unclassified and makes no plan ready.
7. **The gate stays accepted and is not recorded.** Refusing it would fail every agent briefed the old way; the shell-quoting
   plan's payload table still admits it.
8. **The gate folders are listed one at a time, and a folder that cannot be listed is named on the board and the task
   screen.** `listPlansAtGates` lists all three under no catch, so one bad folder would hide every decision. The dashboard
   shows no folder fault line: it does not open while a gate folder cannot be read (Neighbours).
9. **Each vision name is tested in its own `try`**, so a planted name safe-fs refuses hides only its own decision.
10. **The task screens take in no waiting gate-critic file.** Taking one in writes the question store, and `tasks` and
    `task <id>` are read-only routes. The waiting folder is swept by the default screen, the plan's own screen and the
    continuation (`src/lib/streaming-gate.js` lines 410, 1634 and 2132; `src/lib/menu-screens.js` line 2966); none is
    reached from `decisionStages`, the board or the dashboard. The cost is the moment the Risks describe.
11. **Six files, over the ~1-3 budget**: the renderers and the read are two modules that change together, the readiness rule
    lives in a third that gains an export and one read option, the session's instructions must stop asking for the gate,
    and two test files encode the replaced behaviour.
12. **`depends_on` the companion plan, the task-start plan (built) and the critique plan.** The companion plan writes the
    renderers' `reads` object, `ownPlanName` and `shownPlan`, which this plan extends and calls; the task-start plan added
    `askQueue` and stopped a bare `pendingGateDecisions` from crossing, which keeps the task screens read-only; the critique
    plan, decision 6.
13. **The dependencies are confirmed by running their own cases, not by a scratch script.** Step 9 runs the task-start
    plan's cases, the critique plan's cases and the companion plan's cases; each passing case is that code's behaviour. Only
    the timing script is kept, because the timing is a recorded measurement, never a test.
14. **The breach goes to the owner, not back to Step 10.** The cap is built from the start, so no further remedy is kept;
    the one cost it does not bound is `readPlans`' full read, whose change lies outside this plan. A second inconclusive
    sitting counts as a breach: it shows no bound.
15. **The cases keep the old plan's S22 names**, so the critique's findings and these cases name the same thing; S22-18 is
    new, holding the start.md sentences this plan changes.

## Neighbours (seen, not built here; scheduling is the owner's)

- `skills/agent-fragments/plain-gate-words.md` and `docs/OPERATING_LESSONS.md` name `menu task complete … --gate N` as a
  place where numbers stay legal; the flag still parses, but it no longer records anything.
- **The dashboard does not open while a plan folder cannot be read.** Every route that renders it reads the plan counts
  outside a `try` before its decision lines (`dashboardPipeline`, `src/lib/menu-screens.js` line 739; `buildDashboardTable`,
  lines 504 and 649), and every screen is a fresh process, so the in-process cache is never warm. The task screens and the
  board open and name the folder.
- **The task screens could say that a plan is ready and what will move it on** — slice 23's ready line — instead of showing
  nothing for it.
- **`state.readPlans` reads every plan file of a folder before a caller can filter** (`src/lib/state.js` lines 20-61); a
  narrower read would cut the cost the cap does not bound.
- **The red-team lens never walks a slice's ancestry.** It reads a `parent_plan` only in the `<stage>/<file>.md` shape
  (`agents/iron-loop/red-team-critic.md` lines 31 and 139), while slices store it as a bare slug, as this plan does.

## Execution Plan

Every note the executor adds while building — red runs, results, line shifts, refused commands, mutant checks,
measurements, findings — goes under a `## Execution Record` heading placed after the last step below, as one `###`
subheading per note (for example `### Step 8: TEST — red evidence`). Nothing is written inside the steps except their check
marks, and no other section is edited. No step runs `git checkout`, `git restore`, `git stash` or `git reset`.

### Step 8: TEST
- [ ] **The baseline.** Before any test or source line is written, record the output of
  `git status --porcelain=v1 --untracked-files=all` verbatim under `### Step 8: TEST — the baseline` (it need not be empty),
  and the two sha256 lines of the task registry and its warn log (the Test Plan's command, run from the repository root).
- [ ] Write the new describe and the changed cases in `tests/menu-task-wiring.test.js` (S9, the board-suffix case, the
  fall-back case's inbox part, GS2, GS6) and the renamed case in `tests/menu-screens-coverage.test.js`, exactly as
  specified.
- [ ] Run the two files before any source change (`node --test <file>` each) and record each case's result. It must match the
  Test Plan table; if a row differs, stop and record it.

### Step 9: PREPARE
- [ ] **The dependencies are built, by behaviour.** Run `node --test tests/plans-keep-moving-without-the-human.test.js`
  (the task-start plan's S23 and B cases), `node --test --test-name-pattern "S24-" tests/streaming-questions-sweeper.test.js`
  (the critique plan's cases) and `node --test --test-name-pattern "S22-(1|2|3|4|5|7|9|12|13|14|15|17):|a FAILED verify" tests/menu-task-wiring.test.js`
  (the companion plan's cases; the pattern leaves out the cases Step 8 just wrote or changed, which are red by design),
  and record the output: every one of those cases passes. A failing or missing case stops the build here.
- [ ] Re-read `src/lib/task-view.js` whole; in `src/lib/menu-screens.js` lines 23-49, `buildDashboardTable`'s INBOX lines,
  `taskComplete`, `taskCommand`, `taskBoardScreen`, `taskDetailScreen` and `module.exports`; in `src/lib/streaming-gate.js`
  `pendingGateDecisions`, `movesOnItsOwn`, `askQueue`, `streamingGateScreen` and `module.exports`; in
  `src/lib/streaming-precompute.js` `writePlanQuestions` and `planQuestionsStatus` as the critique plan leaves them;
  `state.getVisionStubs` and `state.readPlans`; `src/lib/inbox.js` `listPlansAtGates`; and `src/commands/start.md` COMPLETION
  step 1, Rule 15 and "Human gates stay foreground". Record every line shift.
- [ ] **The copies for the timing**, before any source line of this plan is written: write `time.js` (the Test Plan) to the
  scratchpad, make the empty folder `<scratchpad>/cwd`, read `git status --porcelain=v1 --untracked-files=all`, run
  `node <scratchpad>/time.js copy <repository root> <scratchpad>` with the working directory set to `<scratchpad>/cwd`
  (both paths absolute), and read `git status` again (it must not have changed, and the run's last line must read `working
  directory still empty: true`). Choose the task screen as the Test Plan says. Record the three folders (`timing`,
  `before`, `before-again`), the task id, the run's last line and both readings under `### Step 9: PREPARE — the copies
  for the timing`.

### Step 10: IMPLEMENT
- [ ] `src/lib/task-view.js`: the header bullet, `decisionRoute`, `unreadableLine`, `uncheckedLine`, `renderTaskBoard`,
  `renderTaskDetail`'s decision lines and option block, and `tasksInboxLine`; `src/lib/menu-screens.js`: the gate dropped
  in `taskComplete`, `DECISION_FOLDERS`, `DECISION_CHECK_MAX` and `decisionStages` with its four call sites (`taskCommand`'s
  `board` through `taskBoardScreen`) and its export; `src/lib/streaming-gate.js`: the `askQueue` export and
  `pendingGateDecisions`'s `opts.only` (its JSDoc type, its paragraph and its two lines), nothing else;
  `src/commands/start.md`: the three edits — exactly as specified.
- [ ] Run `npm run lint` and `npm run typecheck`: no warning, and the type error count exactly at
  `.ctoc/typecheck-baseline.json` `maxErrors` — a new error is fixed in the new code's JSDoc, never by moving the baseline.
- [ ] Run the two declared test files plus `tests/menu-protocol.test.js`, `tests/plans-keep-moving-without-the-human.test.js`,
  `tests/streaming-questions-sweeper.test.js`, `tests/dashboard-survives-unreadable-registry.test.js` and
  `tests/inbox-questions-are-shown-as-quoted-data.test.js`; record that every case passes.
- [ ] Run the mutant checks of the Test Plan — the sha256 lines recorded first, each mutant made and reversed with the Edit
  tool, the same lines printed after each — and record which case fails for each.

### Step 11: REVIEW
- [ ] The critic confirms that no screen reads `result.gate` and the store records none; that readiness is read only
  through `streamingGate.askQueue` — no condition of `movesOnItsOwn` restated in `src/lib/menu-screens.js` or
  `src/lib/task-view.js`; that a plan is shown as waiting only when it was checked in that render, with the one named
  exception of a readiness fault; and that every plan the default screen's ready line names shows no decision on the task
  screens.
- [ ] The red-team critic's attack list from this plan's review is run against the built code, and each attack is recorded
  with its outcome.

### Step 12: OPTIMIZE
- [ ] Confirm that each screen calls `decisionStages` once, that it reads nothing when no done task among its tasks names a
  plan (the task screen passes only the task it opens), and that it checks at most `DECISION_CHECK_MAX` names on every
  call, with no caller passing an option.
- [ ] Apply the review's findings that change no behaviour.
- [ ] **The sitting** (the Test Plan), on the code as the box above leaves it: read `git status --porcelain=v1
  --untracked-files=all`; with the working directory set to `<scratchpad>/cwd`, run `time.js generate` with the repository
  root and 300 (then with twice the count it printed if it refuses), then, for the copy (`timing`) and then the generated
  project (`generated`), the noise run and then the run of the code before against the code after, each with 10 rounds;
  read `git status` again (it must not have changed, and each run's last line must read `working directory still empty:
  true`). Record `generate`'s line and all four outputs whole under `### Step 12: OPTIMIZE — the sitting`. In both runs of
  the code before against the code after, each render's "B minus A" must be at most 100 milliseconds; an inconclusive
  sitting is repeated once with 30 rounds. A breach, or a second inconclusive sitting, is recorded, leaves the timing's
  acceptance box unchecked, and goes to the owner as the one question the Test Plan states, under `### Step 12: OPTIMIZE —
  the question for the owner`; the build goes on through Step 16. With no breach, no question is written.

### Step 13: SECURE
- [ ] The security scanner attacks the decision read: a planted gate, a plan moved or written into a decision folder, a
  planted vision with a stub naming it, a plan made to read as ready by a planted question file, a readiness read that
  throws, a gate folder that cannot be read, a plan name holding a NUL, a zero-width space or a direction override, and a
  registry flooded with done tasks to push a real decision past the cap.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0
  flaky. Record the test count and the coverage figure, and that the export-reachability fence reports no new dead export.
  A failing test is investigated to its cause before anyone touches it, and is changed only with a written finding, under
  the Execution Record, that the test itself is wrong.

### Step 15: DOCUMENT
- [ ] The doc comments of `decisionStages`, `DECISION_CHECK_MAX`, `decisionRoute`, `unreadableLine`, `uncheckedLine`,
  `renderTaskBoard`, `renderTaskDetail`, `tasksInboxLine`, the `askQueue` and `decisionStages` exports,
  `pendingGateDecisions`'s `only` and the task-view header say what this plan changed; start.md says where a waiting
  decision is read from, that a plan file moved or written by hand still shows one, and how many plans a screen checks.
  Record the search `result\.gate` over `src/` (expected: no match).

### Step 16: FINAL-REVIEW
- [ ] Run `git status --porcelain=v1 --untracked-files=all` again and record every path that differs from Step 8's
  baseline other than the six declared files and this plan; the build edited none of them. Record the two sha256 lines of
  the task registry and its warn log beside Step 8's; a difference is recorded as it is and does not stop the build.
- [ ] Every acceptance box is checked against the record of Steps 8-14, with Step 9's dependency runs, the red results,
  the mutant results and sha256 lines, the noise runs and the times before and after, and the final suite figures shown.
