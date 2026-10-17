/**
 * NB2 — Task view (pure renderers over an NB1 registry VALUE).
 *
 * Formats a background-task registry into strings / screen fragments so
 * `menu-screens.js` stays thin and the rendering is unit-testable with in-memory
 * literals. Every function here is DETERMINISTIC: no filesystem, no mutation, no
 * clock. The only dependency is the PURE `canRun` from `./task-registry` (used to
 * annotate a queued task's wait reason) and Node's `path` for basename extraction
 * — neither touches the disk at call time.
 *
 * Design (see plans/todo/NB2-menu-task-wiring.md):
 *   • Empty / absent registry → '' for the section, inbox and list fragments and a
 *     safe "no tasks" screen for the board — so an empty registry adds ZERO output
 *     to the dashboard (regression-safe).
 *   • Rule 1 (numbers open plans ONLY) is sacred: the board is selected by free-text
 *     `t<n>` ids (never bare digits); the detail screen is selected by label.
 *   • The detail next-action NAVIGATES (a `plan …`/`browse …` route string) — it
 *     NEVER performs a mutation and NEVER crosses a human gate. NB2 stores and
 *     renders the metadata the caller supplied; it decides nothing.
 *   • Every attacker-influenceable field (label, plan, kind, summary) is passed
 *     through `stripCtl` (C0/C1 control-char strip) before rendering.
 */

'use strict';

const path = require('path');
const { canRun, TERMINAL } = require('./task-registry');

// ── module-local helpers (not exported) ─────────────────────────────────────

// Security (S1): strip C0 (0x00-0x1F) and C1 (0x7F-0x9F) control chars before
// rendering any attacker-influenceable string. Mirrors menu-screens.js's
// sanitizer. Literal regex (allowed — the security lint bans `new RegExp` on a
// non-literal, not literal control-char classes).
const stripCtl = (s) => String(s == null ? '' : s).replace(/[\x00-\x1f\x7f-\x9f]/g, '');

// Terminal statuses: the CANONICAL frozen set imported from task-registry (R3-B rework).
// The former local mirror omitted `cancelled`, so a cancelled task's result summary was
// never rendered — one encoding closes that divergence.

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
// The optional word after browse STAGE is written `(?: word|)`, not `(?: word)?`: the same
// language, but the lint's star-height check reads a starred class inside a `?` group as unsafe.
const NAV_ROUTE = /^(?:tasks|task t\d+|browse (?:vision|canvas|functional|implementation|todo|in-progress|review|done)(?: [a-z0-9][a-z0-9-]*|)|section (?:business|implementation|execution)|plan (?:canvas|functional|implementation|todo|in-progress|review|done)\/[A-Za-z0-9_][A-Za-z0-9._-]*\.md|stubs [A-Za-z0-9_][A-Za-z0-9._-]*|inbox (?:questions|decisions|gates|escalations|stale|verify)|inbox question \d{13,15}-[a-z0-9]{6})$/;

// The detail option's label carries the plan's name only when it is a plain file name
// (SAFE_PLAN_FILE's characters, without `.md`) once Unicode format characters — a
// right-to-left override, a zero-width space — are removed, cut at LABEL_NAME_MAX.
// Anything else reads "Open next ▸": agent-written words never become an option label.
const SAFE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
const FORMAT_CHARS = /\p{Cf}/gu;
const LABEL_NAME_MAX = 80;
// The longest value isNavRoute accepts. The longest plan file name in plans/ is 126 characters, so
// `plan in-progress/<name>` stays far under the cap; a longer value is refused, never cut.
const NAV_ROUTE_MAX = 256;

// Pagination caps (defense against an oversized/crafted registry flooding a
// screen). Independent of NB1's MAX_TASKS — these bound the RENDER, not the store.
const BOARD_GROUP_CAP = 50;
const LIST_CAP = 100;

// Board id shape: a selectable task id is `t<n>` and NOTHING else. This keeps
// Rule 1 ("numbers open plans ONLY") sacred — a crafted bare-digit id ("3") or a
// reserved key ("b"/"back") can never become a board action key.
const TASK_ID = /^t\d+$/;

/**
 * Is this next action safe to store and to offer? Only when it is a string of at most
 * NAV_ROUTE_MAX characters that is exactly one read-only route shape (NAV_ROUTE).
 * The store and the detail screen ask this. The write protection still calls it, but its
 * background-agent refusal has been off since commit 395bd70a (2026-10-15), so today it
 * decides nothing. Whether a `plan …` route opens the task's own plan is asked only where
 * the option is built (renderTaskDetail → opensOwnPlan).
 * @param {*} s
 * @returns {boolean}
 */
function isNavRoute(s) {
  return typeof s === 'string' && s.length <= NAV_ROUTE_MAX && NAV_ROUTE.test(s);
}

/**
 * The human-readable plan name of a task: the basename of `plan` without `.md`,
 * control-stripped. `''` when the task carries no plan.
 * @param {{plan?:string|null}} task
 * @returns {string}
 */
function planName(task) {
  if (!task || task.plan == null) return '';
  // posix: a plan reference is always '/'-separated, and every platform must read it the same way
  const base = path.posix.basename(String(task.plan)).replace(/\.md$/, '');
  return stripCtl(base);
}

/**
 * The name as it may appear in an option label, used only when it is a plain file name
 * (SAFE_NAME) and cut at LABEL_NAME_MAX; otherwise 'next'. For a `plan STAGE/FILE.md` route
 * it is the route's own, already-checked file name, so the label names the plan the option
 * really opens; for any other route it is `planName` with Unicode format characters removed.
 * @param {{plan?:string|null}} task
 * @param {string} next - an accepted route
 * @returns {string}
 */
function labelName(task, next) {
  const name = next.startsWith('plan ')
    ? next.slice(next.indexOf('/') + 1, -'.md'.length)
    : planName(task).replace(FORMAT_CHARS, '');
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
  const own = `${path.posix.basename(String(task.plan)).replace(/\.md$/, '')}.md`;
  return next.slice(next.indexOf('/') + 1) === own;
}

/**
 * A one-line human label for a task: `${kind} ${planName || label || id}`,
 * sanitized.
 * @param {object} task
 * @returns {string}
 */
function taskLabel(task) {
  if (!task) return '';
  const name = planName(task) || stripCtl(task.label) || stripCtl(task.id);
  return `${stripCtl(task.kind)} ${name}`.trim();
}

/**
 * Group a registry's tasks by status. Defensive against a null registry or
 * malformed entries.
 *
 * R2-C2 item 7: `cancelling` gets its OWN bucket — it is a NON-terminal, ACTIVE
 * state that still occupies a concurrency slot and holds its file locks until the
 * harness agent is confirmed gone (task-registry OCCUPYING set). Dropping it made
 * the dashboard lie: a cancelling task silently blocked other tasks with no visible
 * cause. The terminal `cancelled` status (and `orphaned`, and any legacy
 * `result.cancelled` flag) fold into `failed` — the terminal/settled bucket —
 * rendered with its own status word so it is never dropped either.
 * @param {{tasks?:Array<object>}} registry
 * @returns {{running:object[], queued:object[], cancelling:object[], done:object[], failed:object[]}}
 */
function byStatus(registry) {
  const out = { running: [], queued: [], cancelling: [], done: [], failed: [] };
  const tasks = registry && Array.isArray(registry.tasks) ? registry.tasks : [];
  for (const t of tasks) {
    if (!t || typeof t.status !== 'string') continue;
    if (t.status === 'running') out.running.push(t);
    else if (t.status === 'queued') out.queued.push(t);
    else if (t.status === 'cancelling') out.cancelling.push(t);
    else if (t.status === 'done') out.done.push(t);
    else if (t.status === 'failed' || t.status === 'orphaned' || t.status === 'cancelled') out.failed.push(t);
  }
  return out;
}

/**
 * The reason a queued task is waiting, resolved to human names. For a blocked-dep
 * the dep ids are resolved to the dep task's planName/label so "waits: pi1" reads
 * by name. Any throw in the pure scheduler degrades to the generic label.
 * @param {object} task
 * @param {{tasks?:Array<object>}} registry
 * @returns {string}
 */
function waitReason(task, registry) {
  try {
    const reg = /** @type {{tasks:Array<object>}} */ (
      registry && Array.isArray(registry.tasks) ? registry : { tasks: [] }
    );
    const r = canRun(task, reg);
    if (r.run) return 'ready';
    if (r.reason === 'blocked-dep') {
      const deps = Array.isArray(task.blockedBy) ? task.blockedBy : [];
      const tasks = registry && Array.isArray(registry.tasks) ? registry.tasks : [];
      const names = deps.map((id) => {
        const dep = tasks.find((t) => t.id === id);
        return dep ? (planName(dep) || stripCtl(dep.label) || stripCtl(dep.id)) : stripCtl(id);
      }).filter(Boolean);
      return names.length ? names.join(', ') : 'blocked-dep';
    }
    return r.reason;
  } catch {
    return 'queued';
  }
}

// ── exports ──────────────────────────────────────────────────────────────────

/**
 * The dashboard TASKS section (running / queued / done counts + queued wait
 * reasons). Returns `''` when there are no tasks in any surfaced status so an
 * empty/absent registry adds NOTHING to the dashboard. No leading blank line
 * (the caller owns spacing); each line ends in `\n`.
 * @param {{tasks?:Array<object>}} registry
 * @returns {string}
 */
function renderTasksSection(registry) {
  const g = byStatus(registry);
  // R2-C2 item 7: a cancelling-only registry must NOT read as empty.
  if (!g.running.length && !g.queued.length && !g.cancelling.length && !g.done.length && !g.failed.length) return '';

  let out = 'TASKS\n';
  if (g.running.length) {
    const labels = g.running.slice(0, 6).map(taskLabel);
    let line = labels.join(' · ');
    if (g.running.length > 6) line += ` … +${g.running.length - 6}`;
    out += `  ▶ ${g.running.length} running   ${line}\n`;
  }
  // R2-C2 item 7: cancelling is ACTIVE (holds files) — surface it right after
  // running so a blocked queue has a visible cause. Never silently dropped.
  if (g.cancelling.length) {
    const labels = g.cancelling.slice(0, 6).map(taskLabel);
    let line = labels.join(' · ');
    if (g.cancelling.length > 6) line += ` … +${g.cancelling.length - 6}`;
    out += `  ⊗ ${g.cancelling.length} cancelling ${line} (holds files until the agent is gone)\n`;
  }
  if (g.queued.length) {
    const first = g.queued[0];
    out += `  ⏸ ${g.queued.length} queued    ${taskLabel(first)} (waits: ${waitReason(first, registry)})\n`;
  }
  if (g.done.length) {
    const awaiting = g.done.filter((t) => !(t.result && t.result.reviewed)).length;
    out += `  ✓ ${g.done.length} done → ${awaiting} awaiting review\n`;
  }
  if (g.failed.length) {
    const f = g.failed[0];
    const suffix = f.result && f.result.cancelled ? ' (cancelled)' : '';
    out += `  ✗ ${g.failed.length} failed   ${taskLabel(f)}${suffix}\n`;
  }
  return out;
}

/**
 * The task-board screen: tasks grouped by status heading, each row selectable by
 * its `t<n>` id (free text — Rule 1: never a bare digit). No `ask` key (mirrors
 * `plan-select`); the driver shows `text` and takes a free-text reply.
 * @param {{tasks?:Array<object>}} registry
 * @returns {{text:string, inputMode:'task-select', prompt:string, actions:Object}}
 */
function renderTaskBoard(registry) {
  const g = byStatus(registry);
  const actions = { b: '', back: '' };
  let text = `Background Tasks\n${'─'.repeat(40)}\n`;

  const total = g.running.length + g.queued.length + g.cancelling.length + g.done.length + g.failed.length;
  if (total === 0) {
    text += '\n  No background tasks.\n\n\n';
    return {
      text,
      inputMode: 'task-select',
      prompt: "No background tasks. Reply 'b' for back.",
      actions,
    };
  }

  // R2-C2 item 7: Cancelling is its own group (active, occupies a slot), placed
  // after Running; a cancelling row is selectable by its t<n> id like any other.
  const groups = [
    ['Running', g.running],
    ['Cancelling', g.cancelling],
    ['Queued', g.queued],
    ['Done', g.done],
    ['Failed', g.failed],
  ];
  for (const [heading, list] of groups) {
    if (!list.length) continue;
    text += `\n${heading} (${list.length})\n`;
    const shown = list.slice(0, BOARD_GROUP_CAP);
    for (const t of shown) {
      const status = t.result && t.result.cancelled ? 'cancelled' : t.status;
      let suffix = '';
      if (t.status === 'done' && t.result && Number.isInteger(t.result.gate)) {
        // The integer signals "this finished task is at a human decision" — that
        // signal drives the suffix, but the NUMBER is never printed: a person cannot
        // decode "Gate 3", and the board only points AT the decision (the decision
        // screen itself words the moment via gate-words). No stage travels with the
        // task here, so the honest, number-free status is the generic one.
        suffix = ' → decision ready';
      }
      // Rule 1: only a well-formed `t<n>` id is selectable. A crafted bare-digit
      // ("3") or reserved key ("b"/"back") id is rendered as a NON-selectable row
      // (never added to the action map) so it can neither re-break "numbers open
      // plans ONLY" nor clobber the Back affordance.
      const selectable = TASK_ID.test(String(t.id));
      const tag = selectable ? '' : '  (unavailable)';
      text += `  • ${stripCtl(t.id)}  ${taskLabel(t)}  [${status}]${suffix}${tag}\n`;
      if (selectable) actions[t.id] = `task ${t.id}`;
    }
    if (list.length > BOARD_GROUP_CAP) {
      text += `  … +${list.length - BOARD_GROUP_CAP} more\n`;
    }
  }
  text += "\n  Reply with a task id (e.g. t3) to open it, or 'b' for back.\n\n\n";

  return {
    text,
    inputMode: 'task-select',
    prompt: "Reply with a task id (e.g. t3) to open it, or 'b' for back.",
    actions,
  };
}

/**
 * The task-detail screen. Unknown / null id → a safe "Task not found" screen whose
 * only option navigates back to the board. A done task whose `result.nextAction` is an
 * exact read-only route (isNavRoute) — and, for a `plan …` route, the task's own plan —
 * offers a single navigating option (label `Decision ready ▸` when `result.gate` is set,
 * else "Open", labelName and "▸") whose action is that route as stored — never a
 * `claude:` mutation, never a gate cross. Always a final `◀ Back` → `tasks`.
 * Selection is by label (never a digit).
 * @param {{tasks?:Array<object>}} registry
 * @param {string} id
 * @returns {{text:string, ask:Object, actions:Object}}
 */
function renderTaskDetail(registry, id) {
  const tasks = registry && Array.isArray(registry.tasks) ? registry.tasks : [];
  const task = id == null ? null : tasks.find((t) => t.id === id);

  if (!task) {
    return {
      text: `Task not found: ${stripCtl(String(id == null ? '' : id))}\n${'─'.repeat(40)}\n\n  No such background task.\n\n\n`,
      ask: {
        questions: [{
          question: 'Task not found.',
          header: 'Task',
          options: [{ label: '◀ Back', description: 'Return to the task board' }],
        }],
      },
      actions: { '◀ Back': 'tasks' },
    };
  }

  const status = task.result && task.result.cancelled ? 'cancelled' : task.status;
  let text = `Task ${stripCtl(task.id)}\n${'─'.repeat(40)}\n\n`;
  text += `  kind:   ${stripCtl(task.kind)}\n`;
  text += `  plan:   ${planName(task) || '(none)'}\n`;
  text += `  status: ${status}\n`;
  if (TERMINAL.has(task.status) && task.result && task.result.summary) {
    text += `  result: ${stripCtl(task.result.summary)}\n`;
  }
  // Echo the decision point as INFORMATIONAL text (parity with the board/inbox) even
  // when the next-action is absent or dropped — so a task at a human decision still
  // SHOWS a waiting decision while the ACTION stays nav-only or Back (never a gate
  // cross). The gate integer is the SIGNAL; it is never printed as a number.
  if (task.result && Number.isInteger(task.result.gate)) {
    text += `  next:   a decision is waiting for you\n`;
  }
  text += '\n\n\n';

  const options = [];
  const actions = {};
  // Nav-only invariant: emit the next-action option ONLY when the stored value is exactly a
  // read-only route (isNavRoute) and, for a `plan …` route, the task's own plan
  // (opensOwnPlan). A crafted or `--next`-supplied `claude:approve review/x.md`, a value
  // that only begins like a route, or a route to another plan is DROPPED here (Back only) —
  // the renderer does NOT trust the caller/registry. The action is the value as stored; the
  // label carries a name only through labelName.
  const next = task.status === 'done' && task.result ? task.result.nextAction : undefined;
  if (isNavRoute(next) && opensOwnPlan(task, next)) {
    const gate = Number.isInteger(task.result.gate) ? task.result.gate : null;
    const label = gate != null ? 'Decision ready ▸' : `Open ${labelName(task, next)} ▸`;
    options.push({ label, description: 'Navigate to the next action (does not perform it)' });
    actions[label] = next;
  }
  options.push({ label: '◀ Back', description: 'Return to the task board' });
  actions['◀ Back'] = 'tasks';

  return {
    text,
    ask: { questions: [{ question: 'Task detail.', header: 'Task', options }] },
    actions,
  };
}

/**
 * The INBOX pull-notice fragment for completed background work. Returns `''` when
 * there are no done tasks (so it never perturbs the "Inbox clear" state). Otherwise
 * a `⊙ N background tasks done — awaiting review` line, plus one
 * `⊙ Decision ready — <plan>` line per gate-ready done task (cap 5). Newline-terminated.
 * @param {{tasks?:Array<object>}} registry
 * @returns {string}
 */
function tasksInboxLine(registry) {
  const g = byStatus(registry);
  if (!g.done.length) return '';
  let out = `  ⊙ ${g.done.length} background task${g.done.length === 1 ? '' : 's'} done — awaiting review\n`;
  const gated = g.done.filter((t) => t.result && Number.isInteger(t.result.gate)).slice(0, 5);
  for (const t of gated) {
    out += `  ⊙ Decision ready — ${planName(t) || stripCtl(t.label) || stripCtl(t.id)}\n`;
  }
  return out;
}

/**
 * A one-line-per-task list for `menu task list`'s human `text`. `''` when empty.
 * @param {{tasks?:Array<object>}} registry
 * @returns {string}
 */
function renderTaskList(registry) {
  const tasks = registry && Array.isArray(registry.tasks) ? registry.tasks : [];
  if (!tasks.length) return '';
  let out = '';
  const shown = tasks.slice(0, LIST_CAP);
  for (const t of shown) {
    const status = t.result && t.result.cancelled ? 'cancelled' : t.status;
    out += `  ${stripCtl(t.id)}  ${stripCtl(t.kind)}  ${planName(t) || stripCtl(t.label) || '-'}  [${status}]\n`;
  }
  if (tasks.length > LIST_CAP) out += `  … +${tasks.length - LIST_CAP} more\n`;
  return out;
}

module.exports = {
  renderTasksSection,
  renderTaskBoard,
  renderTaskDetail,
  tasksInboxLine,
  renderTaskList,
  isNavRoute,
};
