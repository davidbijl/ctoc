---
title: "Real projects do not stall on CTOC's menu: a nested project's settings file has a menu route, and opening the dashboard never sends live work back"
type: functional
status: functional
created: 2026-10-18
priority: high
effort: medium
depends_on: none
acceptance_criteria_count: 20
risk_level: HIGH
---

# Real projects do not stall on CTOC's menu: a nested project's settings file has a menu route, and opening the dashboard never sends live work back

## Problem Statement

The owner forwarded a report from another Claude session that went wrong on a real project
of his (2026-10-18) and ordered both problems fixed, urgently and small. His order carries
his OK for changes to CTOC's hook and gate logic.

**Problem one: a nested project's settings file has no writer.** The real project keeps
nested CTOC project roots inside its repository, one per folder such as `streams/<name>/`.
One of its plans declared a new `streams/<name>/.ctoc/settings.yaml`. Its builder could not
write it: CTOC's write protection refuses that file name at any depth. No menu route writes
it either. The builder left the acceptance item open and asked for the founder's menu to
write the file. The report says this held 31 files and about 20 plans behind it.

**Problem two: opening the dashboard can send a live build back to the build queue.** Every
dashboard render runs the task reconcile and the plan recovery, and both write. A build whose
task has no usable agent id is sent from `in-progress/` back to `todo/` while its builder may
still be alive, or after its work has already landed. The session's own recipe makes this
worse: it starts a build without `--agent-id`, and the menu then records the task id as the
agent id. Passing the live agent list then marks that build dead after one minute, and the
next render moves its plan back. The coordinating session stopped opening the menu so it would
not lose work, and that froze the whole queue.

Who has the problem: the owner running CTOC on real projects, and the coordinating session and
build agents working for him. What it costs: plans that cannot close, and a queue nobody dares
look at.

## Business Alignment

**Job to Be Done:** When I run several builds of a real project through CTOC's menu, I want
the menu to write the configuration a plan legitimately needs, and to look at the work in
flight without changing it, so I can keep the queue moving without losing finished or running
work.

**Impact Map:**
- **Goal:** CTOC's pipeline keeps moving on real projects. A plan is never stuck on a file
  that only the menu may write, and no build is ever thrown away because someone looked at
  the dashboard.
- **Actor:** The owner, as the human at the menu, and the coordinating session and the build
  agents that act for him.
- **Impact:** A blocked plan asks the menu to create its folder's settings and completes. The
  coordinating session opens the dashboard freely. A dead build goes back to the build queue
  only after the owner has seen it named and confirmed it.
- **Deliverable:** A menu route that shows a nested folder's settings and creates the missing
  copies of the project's own, changing no value. A read-only dashboard that previews what a
  sweep would do. An explicit sweep with a preview and a confirmation. A build start that never
  records a fake agent id.

## What the other session claimed and what is true

Labels: **read** = read by me in this session at the file and line named; **measured** =
measured by the CTO Chief on origin/main 6.14.130 (real hook payloads piped into the hook),
not repeated by me; **brief** = taken from the CTO Chief's brief, not checked by me.

| The report said | What is true | Label |
|---|---|---|
| The write protection "refuses every write under `.ctoc/`" | False. Editing tools (Write, Edit, MultiEdit, NotebookEdit) are refused for the approval records `.ctoc/approvals/` (which are the approval ledger), the check records `.ctoc/state/verify/`, the question store `.ctoc/streaming/` except its waiting folder `questions/pending/`, the settings file `.ctoc/settings.yaml` and `.ctoc/regulatory-regimes/`. The shell is refused only for the settings file and the regulatory profiles. The owner switched the record and background-agent shell refusals off on 2026-10-15 ("remove that hook block, it is wrong"; `RECORD_REFUSALS_OFF = true`). | read: `src/hooks/protect-records.js` lines 10–22, 129–143, 159, 597–606, 637–645; measured |
| Refusing approvals, the ledger and `state/tasks.json` is right | Approvals and the ledger are the same folder and are refused for editing tools. `.ctoc/state/tasks.json` is protected by no tool: the record test names `state/verify` only. This plan adds no protection and does not reverse the owner's 2026-10-15 switch. | read: line 159 (`RECORD_SEGMENT_RE`); brief |
| "A stream's own CTOC settings file" | A nested CTOC project root's `streams/<name>/.ctoc/settings.yaml`. The hook's name test matches `.ctoc/settings.yaml` at any depth, for the main session and for background agents, with editing tools and the shell. The shell even refuses a read-only `test -f` of it. | read: line 130 (`REGIME_SEGMENT_RE`), lines 134–138; measured |
| "A plain configuration file that no gate is built on" | False. It carries `enforcement.mode`, the first source CTOC reads for the enforcement mode, and `regulatory_regime`. A regime that cannot be read holds a plan from moving on by itself. The owner protected the file on 2026-10-08 (his answer "a"). A nested project's file decides these when CTOC runs from that folder. | read: `src/lib/enforcement-mode.js` lines 100–104; `src/lib/streaming-gate.js` lines 937–948; hook header line 17 |
| "Nothing was allowed to write it" | True of the menu. No menu route writes a nested folder's settings: the router has no settings route. Opening the menu from inside a plain nested folder does not help either: the menu resolves the nearest ancestor that is a CTOC root, which is the repository, and project setup runs there and writes nothing in the folder. The walk stops at the folder only when the folder holds a `.ctoc` with a settings file, a `.ctoc` beside a `plans/` folder, a `plans/` folder holding a stage folder, or its own `.git`. | read: `src/lib/menu-screens.js` lines 2791–2835; search `case 'settings'` over `src/`, 0 matches; `src/lib/project-root.js` lines 82–140; `src/commands/start.js` lines 292, 759–798, 926 |
| (not in the report) | Once `--create` has written a folder's settings, the folder is a root, and opening the menu from inside it runs project setup there. Setup writes `CLAUDE.md` and `IRON_LOOP.md` when they are absent, every `plans/` stage folder, the `.ctoc` folders and `.ctoc/state/iron-loop.yaml`, appends `.ctoc/logs/` and `.ctoc/state/` to the folder's `.gitignore` when it has one, and skips the copied `settings.yaml` because it exists. It installs no git hook unless asked, and only in a folder that holds its own `.git`. | read: `start.js` lines 708–719, 759–798, 926; `src/lib/init-project.js` lines 684–904 |
| (not in the report) | The write protection finds the project root from the session's working directory (`payload.cwd`), not from the folder of the file being edited. A nested root changes which root it measures against only for a session that works inside that folder. Even then, editing-tool writes to the repository's own approval records, check records and question store stay refused: the record test matches those folders at any depth of the absolute path. Only this hook was read; whether other hooks find the root the same way is not known to me. | read: `src/hooks/protect-records.js` lines 632–645, 159 |
| The report's example route sets a value: `--set key=value` | Replaced by create plus show (decision 28). `menu settings <folder>` shows the folder's settings read-only, and `menu settings <folder> --create` creates the missing copies of the project's own. A key of a nested folder's settings is changed afterwards on the menu's existing Settings screen, opened from inside that folder. So the normal route still needs no hand edit of a protected file. | brief (the report's example, as the CTO Chief forwards it) |
| (not in the report) | Another branch's fix, "a background agent cannot change Claude Code's settings", is owner-approved and not yet merged. It refuses background agents' writes to `.claude/settings.json`, `.claude/settings.local.json` and `.ctoc/settings.json`, and its name test also matches a nested `streams/<x>/.ctoc/settings.json`. Once it lands, a background builder would stall the same way on that sibling file. | brief |
| Every render runs the reconcile and the recovery (menu-screens 572 and 603); the 120-minute backstop (task-reconcile 103 and 363); the move back (plan-recovery 198) | The line numbers are right. | read: those lines |
| A task with no agent id is moved back at the 120-minute backstop | Imprecise. At 120 minutes it is orphaned on age alone and only surfaced, because its files stay held. At 240 minutes (twice the floor, the "presumed dead" bound) its files are released, and the next render moves its plan back to `todo/`. | read: `task-reconcile.js` lines 130, 362–367, 429–449; `plan-recovery.js` lines 189–198 |
| `--live-agent-ids` cannot protect a task with no recorded id | True, and the report missed something worse. `menu task start <id>` without `--agent-id` records the task id itself as the agent id. That counts as a recorded id. When the session passes `--live-agent-ids` (which `start.md` requires), the build is "confirmed dead" once the 60-second grace window ends. No age-only marker is written, so the recovery treats the build as released and moves its plan to `todo/` on the very next render. `start.md`'s own recipes start a task without `--agent-id`. A test pins the placeholder today. | read: `menu-screens.js` line 2292; `task-reconcile.js` lines 92, 319–324, 356–361; `plan-recovery.js` lines 189–198; `src/commands/start.md` lines 119, 130; `tests/w10-live-agent-reconcile.test.js` line 258 |
| `menu task claim` should record the id | `menu task claim` does not exist. The task commands are add, start, complete, fail, cancel, list and board. It does not exist on the unpushed local main either. | read: `menu-screens.js` lines 2749–2757; search `'claim'` over `src/`, 0 matches; local main: brief |
| (not in the report) | The unpushed local main claims a build with `menu task start <id>` BEFORE launching the agent, then stamps `menu task start <id> --agent-id <harness id>` after launch. So at claim time no agent id exists yet. | brief |
| (not in the report) | Two other writers sit outside the dashboard. The Doctor screen's "Repair state" key writes the reconcile. `startAgent`'s in-progress clean-up moves an idle plan forward to review when its build task is no longer live, and an orphaned task counts as no longer live. | read: `src/tabs/tools.js` line 417; `src/lib/actions.js` lines 2162–2207 |
| (not in the report) | The owner's slice "Opening a screen never crosses a gate" (built, not pushed) covers the gate-question screens and leaves the dashboard's reconcile and recovery as they are. Another branch's plans for parallel workers add `menu task release-silent` and say "opening the menu still runs the same release". This plan makes that sentence untrue, and those plans must be re-based on the explicit sweep. The CTO Chief reports this; this plan does not edit them. | brief |

## User Stories

**Story 1, the settings route.** **As** the owner, or a session or build agent the menu lets
act for him, **I want** the menu to show a folder's settings and, where a plan being built
declares them, create the missing copies of my project's own, **so that** a plan that needs a nested project's settings file can complete
without anyone loosening the write protection and without any agent changing a setting's
value.

**Story 2, a read-only dashboard and an explicit sweep.** **As** the owner and the coordinating
session, **I want** opening the dashboard to change nothing, and a dead build to go back to the
build queue only after I have seen it named and confirmed it, **so that** we can look at the
queue at any time without losing a running or finished build.

INVEST: each story is independent; they share only `src/lib/menu-screens.js` (two different
routes). Each states the outcome, not the code. Each is small enough for one slice, and the
implementation planner cuts one slice per story. Each is testable below. The scenario count is
over the two-to-five guideline, because the owner's order lists these behaviours and the CTO
Chief's decision 10 names them as tests.

## How it behaves

### Story 1: `menu settings <folder> [--create [--by <requester>]]`

- `<folder>` is a folder inside the project, relative to its root. These are refused, each
  with its own plain reason and with nothing written:
  - `..` anywhere in the path, an absolute path, or anything that resolves outside the root,
    including through a symbolic link;
  - the root itself (the project's own settings live on the menu's Settings screen);
  - a path with a `.ctoc` or `.git` segment;
  - a folder that does not exist;
  - a folder whose `.ctoc` is a symbolic link.
- Any flag other than `--create` and `--by`, `--set` among them, is refused with a sentence
  naming the two accepted flags, and nothing is written (decision 31). The route never changes
  a setting's value (decision 28).
- **A plan being built must declare the file (decision 32).** `--create` writes only when an
  approved plan in `plans/in-progress/` declares `<folder>/.ctoc/settings.yaml` or
  `<folder>/.ctoc/settings.json` in its `files:` list, read the way CTOC's plan coverage reads
  it (`plan-coverage.js` `findCoveringPlan`, decision 33). A glob that covers the file counts.
  Declaring either file authorises the whole copy set (decision 34). Otherwise the call is
  refused with one sentence that names the folder, for example: "No plan being built declares
  `streams/alpha/.ctoc/settings.yaml`, so the settings of `streams/alpha` were not created; a
  plan that needs them declares that file in its `files:` list." Nothing is written, the log
  included. The checks run in this order: flags, folder rules, the declaring plan, then which
  files are missing. So a declaration never overrides a folder rule, and a folder no plan
  declares is refused even when its files all exist. The read-only form needs no declaring plan.
- **No flag:** a read-only screen. It shows the files, the enforcement mode and the regulatory
  profiles as CTOC would resolve them from that folder, and the settings keys. When the folder
  has no settings file, it says that the folder is not a CTOC project root and offers the
  create action.
- **`--create`:** a missing `<folder>/.ctoc/settings.yaml` is created as a byte copy of the
  project's own. A missing `<folder>/.ctoc/settings.json` is created as a copy of the project's
  own. Every regulatory profile the copied settings name as active, and that exists in the
  project's own `.ctoc/regulatory-regimes/`, is copied byte for byte into the folder, when the
  folder does not hold it yet. With that, the folder resolves the same enforcement and regime
  as the repository. A file that already exists is never overwritten. A call that finds every
  file present writes nothing, adds no log entry, and says so (decision 30).
- **Where a folder's settings are changed.** The read-only screen and the answer to `--create`
  each carry one sentence that names the folder, for example: "To change a setting of
  `streams/alpha`, open the menu from inside `streams/alpha` (the first time, this sets it up
  as its own CTOC project) and change it on its Settings screen." Opening the menu there runs
  project setup in the folder, which adds `CLAUDE.md` and `IRON_LOOP.md` when absent, the
  `plans/` stage folders and `.ctoc/state/iron-loop.yaml`, appends two CTOC lines to the
  folder's `.gitignore` when it has one, and leaves the copied settings alone (read: `start.js`
  lines 759–798 and 926, `init-project.js` lines 684–904). The menu's
  Settings screen writes the settings of the root the menu resolved, which is the repository
  unless the menu is opened from inside the folder (read: `start.js` line 292,
  `tools.js` lines 512 and 521). So a sentence that only said "the Settings screen" could lead
  the human to change the repository's own setting while believing he changed the folder's
  (decision 26).
- **The log.** Every write appends one entry to a log under the project root's `.ctoc/logs/`
  (a folder git ignores). The entry holds the time, the folder, the files created and the
  declaring plan (decision 32). The writer is always "the menu", plus the requester the call
  names with `--by`, labelled "declared, not verified", or "not declared". The `--by` text has its control characters
  removed and is capped at 80 characters before it reaches the log or the screen. The log names
  files, never their contents.
- The menu writes through Node file calls inside its own process. The write protection does not
  change, and an editing tool still cannot write the file. The write protection finds the
  project root from the session's working directory, not from the folder of the file being
  edited, so a new nested root changes which root it measures against only for a session that
  works inside that folder (read: `protect-records.js` lines 632–645).

### Story 2: the dashboard previews; `menu task sweep` applies

- **The dashboard writes nothing.** It makes no task-registry write and moves no plan file, and
  the plan clean-up log is unchanged. It computes the sweep's verdict in memory and shows it as
  a preview. When the verdict holds any pending change, the dashboard shows one line, for
  example: "2 builds and 1 other task look dead, 3 old tasks would leave the view: review them
  with `menu task sweep`". The line counts every pending change, of every task kind, including
  dead tasks that are not builds (a planner, the gate critic, a quality check), because each one
  still holds a scheduler slot until a sweep frees it. When nothing is pending, the dashboard
  renders exactly as today, without that line. The existing task lines (the orphaned count, the
  recovery counts, the wedge reports) describe the preview, so they say what *would* happen,
  never that something was orphaned or re-queued.
- **One function decides the verdict, in one pass.** The dashboard line, the sweep preview and
  the sweep's apply all call the same pure function, so their counts cannot disagree. It
  composes in one pass what two dashboard renders do today:
  - the reconcile's orphaning of a running task;
  - the release of its files once it is past twice its kind's floor (the "presumed dead" bound,
    240 minutes for a build);
  - the plan recovery's eligibility.

  So a build that has been dead for days, with no usable agent id, shows as "would go back when
  you name it" on the first look, not as "files still held".
- **`menu task sweep`** (the preview) lists each build in exactly one of three groups, each with
  its reason in plain words:
  - **Would go back when you name it.** Dead, with no live agent and no work found: a recorded
    id absent from the live list, or an unknown id past the presumed-dead bound.
  - **Never moved, even when named.** The builder is alive; work was found after the claim (the
    branch is named); or git failed. The line names the way out: `menu task complete <id>` sends
    the work that was found to review, and `menu task fail <id>` gives it up.
  - **Not yet eligible.** Younger than its floor, or its files still held because the builder
    may be alive.

  The preview also counts the registry changes that move no plan: old finished tasks leaving
  the view, tasks that can never run, and dead tasks of other kinds whose slot would be freed.
  It writes nothing. It reads the same `--live-agent-ids` flag as the dashboard.
- **`menu task sweep --confirm <plan,...>`** (the apply) carries the plans the human named and
  the preview's fingerprint.
  - If anything the preview showed about a named plan has changed, the whole confirmation is
    refused and the new preview is shown.
  - Otherwise, each named plan is checked again and moves `in-progress/` to `todo/` only if it
    is still eligible.
  - The registry changes that move no plan are applied.
  - A build task changes status only when its plan was named and it moved. A build nobody
    named stays exactly as it was, so `startAgent`'s in-progress clean-up cannot treat it as
    finished and move it forward under a live builder. A named build that is never moved also
    keeps its task exactly as it was. Its files and its slot stay taken until the human runs
    `menu task complete <id>` or `menu task fail <id>`, which the screen names.
- **Never moved, even when named:**
  - the task's recorded agent id is in `--live-agent-ids`;
  - the task's declared files, or the plan's own text, have a commit on any local branch
    dated (commit date) after the task's start;
  - git fails or cannot answer. This counts as "work found" and is shown.

  A commit whose only change to the plan file is moving it into `in-progress/` (the plan sync
  recording the claim) is not evidence of work. A plan never moved for found work is shown with
  "work was found after the claim" and the way out named above.
- **Agent ids.** A real agent id is non-empty and not equal to the task id.
  - `menu task start <id>` on a queued task without `--agent-id` records no agent id, never the
    task id.
  - Stamping a running task (`--agent-id`) requires a real id. It may replace an empty id or an
    old placeholder equal to the task id.
  - A recorded id equal to the task id, written by 6.14.130 or earlier, is read as "unknown".
  - An unknown id is never evidence of death: such a build reaches the age-only path, and its
    plan moves only when the human names it.
- **The session's recipes** in `start.md` launch the agent and then stamp
  `menu task start <taskId> --agent-id <harness id>`, in the WORK dispatch and in the promotion
  step.
- **The Doctor screen's "Repair state" key** applies the sweep with no plan named, so it applies
  only the registry changes that move no plan. It then tells the human how many builds wait for
  confirmation by name, and the command.

## Acceptance Criteria

Every scenario is a committed test that runs real functions in a temporary project (a real
registry file, real plan files, a real git repository where git is involved), or the real menu
entry point started as a child process where it says so.

### Story 1: the settings route

- [ ] **Scenario 1.1: Creating a nested folder's settings as a copy**
  Given a project with its own `.ctoc/settings.yaml`, `.ctoc/settings.json`, a folder `streams/alpha/` with no `.ctoc/`, and a plan in `plans/in-progress/` with its approval record that declares the glob `streams/*/.ctoc/settings.yaml` in its `files:` list
  When `menu settings streams/alpha --create --by builder-7` runs
  Then `streams/alpha/.ctoc/settings.yaml` is byte-identical to the project's own, `streams/alpha/.ctoc/settings.json` equals the project's own, and the screen names both files as created and carries the sentence that names `streams/alpha` and says to open the menu from inside it to change a setting; and after the folder's `settings.json` is then edited, a second `menu settings streams/alpha --create` leaves both files byte-identical to before, adds no log entry, and says both files already exist

- [ ] **Scenario 1.2: Showing without writing**
  Given the folder from scenario 1.1, and separately a folder with no `.ctoc/` whose settings file no plan declares
  When `menu settings <folder>` runs with no flag
  Then the screen shows the folder's files, enforcement mode, regulatory profiles and settings keys, with the sentence that names the folder and says to open the menu from inside it to change a setting (or, for the folder with no `.ctoc/`, says that the folder is not a CTOC project root and offers the create action), and no file in the project changes

- [ ] **Scenario 1.3: A folder outside the project, one that would plant settings in the wrong place, or a key-setting flag, is refused**
  Given a project with the declaring plan of scenario 1.1, whose glob `streams/*/.ctoc/settings.yaml` also covers `streams/out`, and a symbolic link `streams/out` pointing outside it
  When the folder is `..`, `streams/../..`, an absolute path, `streams/out`, `.`, `.ctoc/approvals`, `streams/alpha/.git`, a folder that does not exist, or a folder whose `.ctoc` is a symbolic link; or the call is `menu settings streams/alpha --set agents.maxParallelAgents=2`
  Then each is refused with its own named reason, never with the no-declaring-plan sentence (the `--set` call with the sentence naming `--create` and `--by` as the accepted flags), and nothing is written anywhere, the log included

- [ ] **Scenario 1.4: Every write is logged with who asked**
  Given scenario 1.1, and a second folder `streams/beta/`, covered by the same declaring plan, created without `--by`
  When the log under the project root's `.ctoc/logs/` is read
  Then it holds one entry per write, with the time, the folder, the files created, the declaring plan, the writer "the menu", and the requester "builder-7 (declared, not verified)" or "not declared"; a refused call (the no-declaring-plan refusal included) and a `--create` that found every file present add no entry; and a `--by` holding a newline or a control character, or over 80 characters, appears stripped and capped in both the log and the screen

- [ ] **Scenario 1.5: The folder now resolves as its own CTOC project with the repository's regime**
  Given a project whose settings name an active regulatory profile that exists only in its own `.ctoc/regulatory-regimes/`, a plan in `plans/in-progress/` with its approval record that declares only `streams/alpha/.ctoc/settings.json`, and the route has created `streams/alpha/`'s settings
  When CTOC resolves the project root and the regime from a working directory inside `streams/alpha/`
  Then both settings files were created, the root is `streams/alpha/`, that profile file was copied byte for byte into `streams/alpha/.ctoc/regulatory-regimes/`, the enforcement mode and the active profiles equal the repository's, and no profile is reported as unloadable

- [ ] **Scenario 1.6: The write protection is unchanged**
  Given the hook `src/hooks/protect-records.js` run with real payloads
  When an editing tool targets `streams/alpha/.ctoc/settings.yaml`, `.ctoc/approvals/x.json` or `.ctoc/state/verify/x.json`
  Then the first is refused with the settings sentence, the other two with the record sentence; and `subagentMayRunRoute` returns false for `menu settings …` and for `menu task sweep …`, so the routes stay closed to background agents if the owner switches those refusals back on

- [ ] **Scenario 1.7: A plan that needs the nested settings file can finish, and a build agent's own call gets through**
  Given a temporary project with a running build whose plan, in `plans/in-progress/` with its approval record, declares `streams/alpha/.ctoc/settings.yaml` in its `files:` list, and whose open acceptance item is that this file exists
  When the real write-protection hook is given a shell payload with a non-empty `agent_id` (a background agent's call) running `node <plugin>/src/commands/start.js menu settings streams/alpha --create --by builder-7`, and that command then runs through the real menu entry point as a child process, the item is ticked, and `menu task complete <id>` runs
  Then the hook allows the call, the file exists with the copied content, the log entry names that plan, and the completion moves the plan to review with its check record; and the same background-agent call with the folder argument `streams/alpha/.ctoc/settings.yaml` is refused (by the hook's settings sentence, and in any case by the route's own `.ctoc` rule) with nothing written

- [ ] **Scenario 1.8: Creating settings that no plan being built declares is refused**
  Given a project with folders `streams/alpha/` and `src/` with no `.ctoc/`, and `streams/gamma/` whose two settings files already exist; a plan in `plans/todo/` with its approval record that declares `streams/alpha/.ctoc/settings.yaml`; a plan in `plans/in-progress/` with no approval record that declares `src/.ctoc/settings.yaml`; and a plan in `plans/in-progress/` with its approval record that declares `streams/beta/.ctoc/settings.yaml` and `**/.ctoc/settings.yaml`, with no unanchored-scope acknowledgement
  When `menu settings streams/alpha --create`, `menu settings src --create --by builder-7` and `menu settings streams/gamma --create` run
  Then each is refused with a sentence that names its folder and says no plan being built declares its settings file; no file or folder is created or changed anywhere in the project and the log gains no entry; and `menu settings src` with no flag still shows that `src` is not a CTOC project root

### Story 2: the dashboard never sends live work back

- [ ] **Scenario 2.1: Opening the dashboard writes nothing**
  Given a registry with a running build 300 minutes old with no agent id (past the 240-minute presumed-dead bound), a running build 10 minutes old whose recorded id is absent from the live list, a running planner task 60 minutes old whose recorded id is absent from the live list, a finished task past the retention window, and the two builds' plans in `in-progress/`
  When the dashboard renders through `menu`, `dashboard` and the no-argument route, with and without `--live-agent-ids`, twice each
  Then the bytes of `.ctoc/state/tasks.json`, every plan file and its folder, and `.ctoc/logs/cleanup.json` are unchanged on every render; with the live list, the one line counts 2 builds that would go back when named, 1 other dead task and 1 old task that would leave the view, and names `menu task sweep`; without the live list, it counts the 300-minute build (on age alone), the planner task and the old task, and holds the 10-minute build as not yet eligible; and no line on the screen says a task was orphaned or a plan was re-queued
  (Scope of this scenario: the dashboard's reconcile and recovery passes. Gate crossings on question screens belong to the slice "Opening a screen never crosses a gate".)

- [ ] **Scenario 2.2: The dashboard's count and the sweep preview agree, including tasks this pass would orphan**
  Given a running build whose recorded id is absent from the live list and which the saved registry still lists as running
  When the dashboard renders and `menu task sweep` previews with the same live list
  Then both count it as "would go back", and the two counts are equal

- [ ] **Scenario 2.3: A build started without an agent id is unknown, not dead**
  Given a queued build started with `menu task start <id>` and no `--agent-id`
  When the registry is read, and the dashboard and `menu task sweep` run 5 minutes after the start with `--live-agent-ids a1,a2`
  Then the task carries no agent id (not its task id), the preview lists it as not yet eligible with the reason "no agent id recorded", the live list does not mark it dead, and a confirmed sweep that does not name its plan leaves both the task and the plan as they were

- [ ] **Scenario 2.4: An old placeholder id is unknown and can be replaced**
  Given a running build started 10 minutes ago whose recorded agent id equals its task id, and a second one like it started 300 minutes ago
  When the preview runs with a live list that contains neither, and then `menu task start <id> --agent-id h7` runs on the first
  Then the preview lists the first as not yet eligible and the second as "would go back when you name it", each with the reason "no agent id recorded" (never "confirmed dead"), and the first task's agent id becomes `h7`

- [ ] **Scenario 2.5: Stamping refuses a fake id**
  Given a running build
  When `menu task start <id> --agent-id <id>` or `--agent-id ''` runs
  Then the call is refused with a plain sentence, and the registry bytes are unchanged

- [ ] **Scenario 2.6: A live agent is never moved, even when named**
  Given a running build whose recorded id is in the live list, and the human names its plan
  When `menu task sweep --confirm <plan>` runs with the preview's fingerprint
  Then the plan stays in `in-progress/`, the task stays running, and the screen says the builder is alive

- [ ] **Scenario 2.7: Work after the claim is never moved, even when named**
  Given dead builds with: (a) a commit to a declared file on the current branch after the task's start; (b) the same on another local branch only; (c) only the plan sync's commit moving the plan into `in-progress/`; (d) a project where git fails
  When the human names all four in a confirmed sweep
  Then (a), (b) and (d) stay in `in-progress/`, their tasks stay exactly as they were, and each is shown as never moved with "work was found after the claim" (with the branch, or the git failure) and the way out, `menu task complete <id>` to send the work to review or `menu task fail <id>` to give it up; and (c) moves to `todo/`

- [ ] **Scenario 2.8: A confirmed sweep moves exactly the named plans that are still eligible**
  Given four dead builds A, B, C and D, where D is held for a live agent
  When `menu task sweep --confirm A,C,D` runs with the preview's fingerprint
  Then A and C move from `in-progress/` to `todo/` with one cleanup-log entry each; B and D stay; B's task is unchanged; and the screen lists what moved and what stayed, with each reason

- [ ] **Scenario 2.9: A stale confirmation is refused**
  Given a preview naming A as "would go back", after which A's task is stamped with a live agent id
  When the confirmation from that preview runs
  Then nothing moves, no registry change is applied, and the new preview is shown

- [ ] **Scenario 2.10: An unconfirmed build cannot be pushed forward under its builder**
  Given a dead build B whose plan the human did not name in a confirmed sweep, with a plan file idle for over 120 minutes that passes the review check
  When `startAgent` runs its in-progress clean-up
  Then B's plan is not moved to review, because its task was not marked finished

- [ ] **Scenario 2.11: The Doctor screen's "Repair state" moves no plan**
  Given the registry of scenario 2.1
  When the Doctor screen's "Repair state" key is pressed
  Then the finished task past retention leaves the view, no build task changes status, no plan file moves, and the message names how many builds wait for confirmation by name with `menu task sweep`

- [ ] **Scenario 2.12: The session's recipes stamp the real id**
  Given `src/commands/start.md`
  When the WORK dispatch recipe and the promotion step are read by `tests/menu-protocol.test.js`
  Then each says to launch the agent and then run `menu task start <taskId> --agent-id <harness id>`, and no recipe starts a task without `--agent-id` after a launch

## Scope

### In Scope
- The route `menu settings <folder>` with `--create` and `--by`: folder validation, refusal of every other flag, the read-only screen, the copy of both settings files and of the active profiles the project holds itself without overwriting a file that exists, the sentence naming the folder and where its settings are changed, the write log naming the declaring plan (scenarios 1.1–1.5, 1.7).
- The rule that `--create` writes only where an approved plan being built declares the folder's settings file, read through CTOC's plan coverage, with its refusal (scenario 1.8; the declaring plan in 1.1, 1.3, 1.5, 1.7).
- Proof that the write protection is unchanged (scenario 1.6).
- A read-only dashboard with the one preview line counting every pending change, and task lines that say what would happen (2.1, 2.2).
- One function, composing the reconcile and the recovery in one pass, shared by the dashboard, the preview and the apply (2.1, 2.2, 2.4).
- `menu task sweep` with its preview and its confirmation bound to the preview (2.6–2.9).
- The never-move rules: a live agent, work after the claim on any local branch, a git failure (2.6, 2.7).
- Agent-id honesty: no placeholder, a real id required to stamp, an old placeholder read as unknown and replaceable (2.3–2.5).
- Build tasks change status only when named (2.8, 2.10).
- The Doctor key through the same rules (2.11).
- `start.md` recipes that stamp the harness id (2.12).
- The documented test-file counts in `CLAUDE.md` and `README.md` for the new test files.

### Not in this plan (each is the owner's to schedule)
- The hook refusing a read-only `test -f` or `[ -f ]` of the settings file in the shell.
- The parallel-workers plans' sentence "opening the menu still runs the same release" (`menu task release-silent`); they must be re-based on `menu task sweep`. The CTO Chief reports it; this plan does not edit them.
- Any new protection for `.ctoc/state/tasks.json`, and any reversal of the owner's 2026-10-15 switch.
- Changing the write-protection hook in any way (decisions 3 and 9).
- Setting any key of a nested folder's settings through this route (decision 28). Both files are created as copies and otherwise left alone; a key is changed on the menu's own Settings screen opened from inside the folder.
- A nested folder's settings are a copy taken when they are created; later changes to the repository's enforcement or regulatory profiles never reach it, and nothing reports the difference.
- `startAgent`'s in-progress clean-up rules themselves. This plan only keeps unconfirmed builds live in the registry, so that clean-up cannot reach them (scenario 2.10).
- The in-flight fix "a background agent cannot change Claude Code's settings", which touches the same hook and the sibling `settings.json` file.
- Other ways a folder becomes a CTOC project root without its settings file: a `plans/` folder holding a stage folder, or a `.ctoc` beside a `plans/` folder, which any session can create (read: `project-root.js` lines 95–112). This plan gates only the menu's settings route.

## Existing tests whose contract the owner replaced

A search for `recoverOrphanedPlans|reconcileState|renderRecoveryReport` over `tests/` matched 14
files, 105 occurrences: `tab-modules`, `cache-freshness`, `promote-quarantine-parity`,
`task-reconcile`, `plan-recovery-wiring`, `task-reconcile-quarantine-fault`, `plan-recovery`,
`dashboard-wedge-reports`, `w10-live-agent-reconcile`, `dashboard-reconcile-failure`,
`task-reconcile-coverage`, `scheduler-enforced`, `dashboard-wedge-fault` (each
`tests/<name>.test.js`), and one fixture plan under `tests/fixtures/golden-corpus/`. A match only
shows the name is written there. The implementation planner reads each one. A test that asserts
a dashboard render writes the registry or moves a plan carries a contract the owner replaced on
2026-10-18. Such a test is rewritten to assert the preview and the explicit sweep, with a written
reason, and never loosened. Tests that call `reconcileState` or `recoverOrphanedPlans` directly
keep their contract unless the function itself changes.

A second search, for `agentTaskId|agent-id|agentId` over `tests/`, matched 12 files, 46
occurrences. Beyond the files above it adds `menu-coverage`, `dashboard-survives-unreadable-registry`,
`menu-task-wiring`, `protect-records`, `plans-keep-moving-without-the-human`, `readme-numbers`,
`deepthink-ships-with-ctoc` and `agent-model-floor` (each `tests/<name>.test.js`), plus the same
fixture plan. The planner reads each for an assertion that a start records the task id as the
agent id, or that a stamp needs an empty id.

A third search, for `menu task start` over `agents/`, `docs/` and `skills/`, matched 2 files, 2
occurrences: `docs/ENFORCEMENT.md` line 340 and `skills/deepthink/SKILL.md` line 91. Both stamp
with `--agent-id`. Neither starts a task without one, so the only recipes to change are in
`src/commands/start.md`.

Read so far:
- `tests/w10-live-agent-reconcile.test.js` case 6 (lines 243–258) asserts that a start without
  `--agent-id` records the task id. Replaced.
- Its render case near line 187 drives `route(['menu'], …, { liveAgentIds })` and expects an
  orphaning. Replaced.
- `tests/menu-protocol.test.js` reads `menu task start` in `start.md` (line 126), so it must
  hold the stamp.
- `start.md` lines 119, 130, 355 and 423 change. The unpushed local main differs on those lines
  (brief).

## Risks

### Technical Risks
- The "work after the claim" check holds a dead build forever, because a plan-sync or other
  commit touches its files.
  - Likelihood: MEDIUM. Impact: MEDIUM.
  - Mitigation: Exclude the plan sync's move-only commit (scenario 2.7c), and name the branch
    and the commit in the held line so the human can complete or inspect the build.
- A crashed build's task stays running until the human names its plan in a confirmed sweep
  (decision 29). Until then it keeps its files, its scheduler slot and the wave-integration
  barrier. The scheduler's rules read the running tasks: rule 1 refuses a start when the
  running count reaches the maximum (`src/lib/task-registry.js` line 931), rule 2 starts no
  integration task while any task is running (line 936), and rule 4 refuses a task whose files
  overlap a running task's (lines 949–955); read in this session. So one crash overnight holds
  every wave's integration until he names its plan.
  - Likelihood: HIGH (it is the design, whenever a build crashes). Impact: MEDIUM (a delay; no
    work is lost, and it ends when he names the plan).
  - Mitigation: Count every such build on the dashboard line with the command (scenario 2.1),
    and name each one with its reason in the sweep preview (scenarios 2.2–2.4). Nothing else
    changes.
- Dead tasks of other kinds (a planner, the gate critic, a quality check) keep their slot and
  the same integration barrier until someone runs the sweep or the Doctor key, because rendering
  no longer frees them.
  - Likelihood: HIGH (it is the design). Impact: MEDIUM.
  - Mitigation: Count them on the dashboard line (scenario 2.1), compose the verdict in one pass
    so a long-dead task is counted on the first look (decision 23), and apply their registry
    changes on any confirmed sweep or the Doctor "Repair state" key without naming anything
    (scenario 2.11). Neither frees a build task.
- The preview and the apply disagree on eligibility.
  - Likelihood: LOW. Impact: HIGH.
  - Mitigation: Use one eligibility function for both (scenario 2.2), and bind the confirmation
    to the preview's fingerprint (scenario 2.9).
- The new folder becomes its own CTOC project root, so anything run from inside it no longer
  sees the repository's plans, and the first menu opened there adds project setup files to it
  (`CLAUDE.md`, `IRON_LOOP.md`, the `plans/` stage folders).
  - Likelihood: HIGH (it is what the real project asked for). Impact: LOW.
  - Mitigation: Create the copies only where an approved plan being built declares the
    folder's settings file (decision 32, scenario 1.8), and state the consequence on the
    read-only screen, in the create answer and in scenario 1.5.
- `menu-screens.js` `taskTransition` is edited on another branch (the four-defects work) and
  `protect-records.js` on a third.
  - Likelihood: HIGH. Impact: LOW.
  - Mitigation: Keep the `taskTransition` edit to the two id lines, put the settings logic in
    its own module, and do not touch the hook.

### Business Risks
- A background agent may run `menu settings` today, because the owner turned the
  background-agent menu refusals off on 2026-10-15.
  - Likelihood: HIGH. Impact: LOW.
  - Mitigation: Let the route only show a folder's settings and create the missing copies of
    the repository's own, never change a value or overwrite a file (decision 28, scenarios
    1.1–1.3), create them only where an approved plan being built declares the folder's
    settings file (decision 32, scenario 1.8), log the declaring plan and the declared
    requester (scenario 1.4), and keep the route off the background-agent list (scenario 1.6).

### Dependency Risks
- The parallel-workers plans assume opening the menu releases work.
  - Likelihood: HIGH. Impact: MEDIUM.
  - Mitigation: The CTO Chief reports the re-base to the owner. Name `menu task sweep` as the
    one route that releases work.
- The in-flight settings fix would refuse background agents a nested `settings.json`.
  - Likelihood: HIGH. Impact: LOW.
  - Mitigation: Create `settings.json` through this menu route, which no hook sees, as a copy
    of the project's own that changes no value and never overwrites (scenario 1.1). Changing a
    value stays with the menu's Settings screen opened from inside the folder (decision 28).

## Priority

**Priority: HIGH** (Score: 8/9)
- Dependency: 3 -- about 20 plans of a real project wait on story 1, and other branches' plans must re-base on story 2.
- Business Impact: 3 -- the queue froze, and a live build can be thrown away by opening the dashboard.
- Technical Risk: 2 -- small routes over existing functions; the git work check is the moderately complex part.

## Candidate files (grounded by reading; not a declaration, the implementation planner fixes the list)

```
src/lib/menu-screens.js          route `menu settings`; `menu task sweep`; the two agent-id lines in
                                 taskTransition (~2253, ~2292); buildDashboardTable read-only (~566-643)
(new) a module in src/lib        the settings route: validation, the declaring-plan check through
                                 plan-coverage.findCoveringPlan (called, not edited), read-only view,
                                 copy, log
src/lib/task-reconcile.js        an id equal to the task id reads as unknown (~319-324, ~429-430)
src/lib/plan-recovery.js         one eligibility function (pure); apply to named plans; the git work check
src/tabs/tools.js                the Doctor "Repair state" key (~414-428)
src/commands/start.md            the recipes stamp the harness id (lines 119, 130, 355, 423)
(new) two test files             one per story
tests/w10-live-agent-reconcile.test.js and the other files listed above   contract replaced, read each
CLAUDE.md, README.md             documented test-file counts
NOT changed: src/hooks/protect-records.js, src/lib/plan-coverage.js (on the protected enforcement
             list, protected-paths.js line 59), any approval or check record,
             .ctoc/state/tasks.json protection
```

## Decisions Taken Under Ambiguity

The CTO Chief's decisions (1–11), carried in substance:

1. **The route is `menu settings <folder> [--create [--by <requester>]]`** (revised by decision
   28; it no longer takes `--set`). `<folder>` is a folder inside the project, relative to its
   root; `..`, absolute paths and anything resolving outside the root are refused. Reason: the
   menu's `stream` routes are the question-stream approve and answer routes that cross gates, so
   a configuration writer must not sit beside them, and "stream" is not a CTOC concept.
2. **With no flag, the route shows the folder's settings, read-only** (revised by decision 28).
   With `--create`, a missing settings file is created as a copy of the project's own
   `.ctoc/settings.yaml`, so the nested project reads the same enforcement and regulatory regime
   as the repository. A missing `.ctoc/settings.json` is created as a copy of the project's own.
   No key is set. Every write is appended to a log under `.ctoc/logs/` with the time, the folder,
   the files created, and who wrote it: always "the menu", plus the requester the call declares
   (`--by`), labelled as declared, not verified.
3. **The write-protection hook is not changed for problem one.** The menu writes the file
   through Node file calls inside its own process, which no hook sees. Narrowing the hook's name
   test would weaken the owner's 2026-10-08 protection for nested projects and collide with the
   in-flight settings-file fix.
4. **"An agent the human has authorised" means any session or agent the menu lets run the
   route.** The route is not added to the hook's background-agent route list. If the owner turns
   background-agent menu refusals back on, an agent cannot run it unasked (fail closed).
5. **Rendering the dashboard writes nothing:** no task-registry write, no plan move. It previews
   instead: the pure reconcile verdict, a dry run of the plan recovery, and one line telling the
   human how many plans would go back to the build queue and the command to review them. Without
   that line, dead builds would hold their slots forever and the queue would freeze the other way.
6. **The sweep is an explicit menu route with a preview and a confirmation** (`menu task sweep`
   to preview, `menu task sweep --confirm <plans>` to apply; the implementation planner fixes the
   exact words, reusing the inbox clean-up's confirm pattern). The confirmation names the plans
   and is bound to what the preview showed, so a changed registry refuses a stale confirmation.
   Only the named plans that are still eligible move.
7. **The sweep never moves a plan when:**
   - the task's recorded agent id is in `--live-agent-ids`;
   - the plan's file or the task's declared files have commits after the claim time (this
     covers "merged on main"; CTOC records no branch per task);
   - git fails. A git error counts as "commits found": the sweep fails closed and reports it.

   A missing agent id, or a placeholder equal to the task id, is unknown, not dead. Such a
   task is never moved unless the human confirms that plan by name.
8. **"Claim refuses without an id" cannot work with claim-before-launch,** because the agent
   does not exist yet when the claim is made. Instead:
   - the stamping start (`--agent-id` on a running task) requires a real id;
   - the menu stops writing the task id as a placeholder;
   - a start of a queued task without `--agent-id` records no agent id;
   - `start.md`'s recipes always stamp the harness id after launch.

   A build with an unknown id is never moved without the human.
9. **The hook's background-agent route list stays as it is;** the sweep route is not on it.
10. **Tests, stated as behaviour (the implementation planner names the files):**
    - the settings route creates a nested folder's settings file as a copy of the project's own, where an approved plan being built declares it (1.1);
    - it refuses to create where no approved plan being built declares the folder's settings file, and writes nothing (1.8; added by decision 32);
    - it shows a folder's settings without writing, and refuses a key-setting flag (1.2, 1.3; these replace "it sets an allowed key" and "it refuses a gate-deciding key", revised by decision 28);
    - it refuses a folder outside the project (1.3);
    - it logs each write (1.4);
    - a direct editing-tool write of the nested settings file is still refused by the hook (1.6);
    - editing-tool writes of an approval record and a check record are still refused (1.6);
    - a plan whose acceptance needs the nested settings file can complete after the route writes it (1.7);
    - a dashboard render changes neither the task registry nor any plan file, even with a task eligible to be orphaned (2.1);
    - a running build started without an agent id and given a live-agent list is not orphaned by that list (2.3);
    - a task whose plan's files have a commit after the claim is not moved by a confirmed sweep (2.7);
    - a task whose agent id is in the live list is not moved (2.6);
    - a confirmed sweep moves exactly the named, still-eligible plans (2.8);
    - a stale confirmation is refused (2.9).
11. **Not in this plan, one line each for the owner:** the hook refusing a read-only `test -f`
    of the settings file; the parallel-workers plans' "opening the menu still runs the release"
    sentence.

Added by the product owner, each closing a gap the CTO Chief's decisions leave open (owner or
critic, overrule any of them):

12. **`--create` creates the copies and sets no key.** Reason: the real project's plan needed
    only the file to exist.
13. (Withdrawn by decision 28: it governed which keys `--set` could write.)
14. (Withdrawn by decision 28: it listed the keys `--set` refused.)
15. **The folder must exist, and cannot be the root itself, or a path through `.ctoc` or `.git`,
    or one whose `.ctoc` is a symbolic link.** Reason: `menu settings .ctoc/approvals` would
    otherwise plant a settings file inside the approval records, and a linked `.ctoc` would
    redirect the write into another project.
16. **Creating the copy also copies the project's own profile files that the copied settings
    name as active.** Reason: a profile kept in the project's own `.ctoc/regulatory-regimes/` is
    not visible from the nested root (`regulatory-regime.js` lines 271–282). Without the copy,
    the nested folder would silently use the shipped profile of that name, or report it as
    unloadable. Decision 2's "same regime" would then be false.
17. (Withdrawn by decision 28: it made one refused `--set` key refuse the whole call.)
18. **Work after the claim is looked for on every local branch, not only the current one.** Only
    commit dates after the task's start count. The plan sync's move-only commit is excluded, and
    git runs with an argument list, never a shell. Reason: the report asked for "its branch has
    commits after the claim", and builders commit on their own worktree branches, which share
    the repository's branches. Looking further can only hold more builds, which is the safe
    direction. The excluded commit would otherwise hold every build whose claim the plan sync
    committed.
19. **A build task changes status only when its plan was named in the confirmation.** Reason:
    `startAgent`'s in-progress clean-up (`actions.js` lines 2162–2207) treats an orphaned task as
    no longer live and can move an idle plan forward to review. Orphaning an unnamed build would
    open that back door under a possibly live builder.
20. **The preview counts what this pass would orphan, through one shared function.** Reason:
    `recoverOrphanedPlans` reads the saved registry (`plan-recovery.js` lines 154–166). A dry run
    of it alone would under-count, because nothing saves the reconcile any more at render.
21. **An old placeholder (agent id equal to the task id) reads as unknown and may be stamped
    over.** Reason: registries written by 6.14.130 and earlier hold such ids. The stamp at
    `menu-screens.js` line 2253 accepts only an empty id, so without this rule those builds
    could never get their real id.
22. **The Doctor screen's "Repair state" key is the sweep with no plan named.** Reason: it calls
    `reconcileState` (`tools.js` line 417), a second registry writer. It stays an explicit
    keypress, but must follow the same rule, or it becomes the back door of decision 19.
23. **The shared function composes in one pass what two renders do today.** That is the
    orphaning of a running task, the release of its files past twice its kind's floor, and the
    plan recovery's eligibility. Reason: the reconcile releases files only for a task that a
    PREVIOUS pass already orphaned (`task-reconcile.js` lines 406–449); a running task orphaned
    in this pass is not looked at again. Today two renders do the two steps. With a read-only
    dashboard, a build dead for days would read as "files still held" and the line would show
    zero.
24. **The dashboard line counts every pending change of every task kind, and the existing task
    lines speak of what would happen.** Reason: only builds have plans, but a dead planner, gate
    critic or quality task also holds a scheduler slot, because the concurrency count reads
    `status === 'running'`. Counting plans alone would hide exactly the freeze decision 5 exists
    to prevent. The orphaned count, the recovery counts and the wedge reports would otherwise
    report changes that no longer happen at render.
25. **A named build that is never moved keeps its task exactly as it was, and the screen names
    the way out** (`menu task complete <id>` sends the found work to review, `menu task fail <id>`
    gives it up). Reason: orphaning it would open the forward back door of decision 19, and
    leaving the human without a next step would hold its slot with no explanation.
26. **The read-only screen and the answer to `--create` each name the folder and say to open the
    menu from inside it to change a setting** (revised by decision 28; it was the `--set`
    refusal sentence). Reason: the menu's Settings screen writes the settings of the root the
    menu resolved, which is the repository unless the menu runs from inside the folder
    (`start.js` line 292; `tools.js` lines 512 and 521). "Change it on the Settings screen" alone
    could make the human change the repository's enforcement or regime while believing he
    changed the folder's.
27. **The `--by` text is stripped of control characters and capped at 80 characters.** Reason: it
    is caller-supplied text that reaches a log and the screen.

The CTO Chief's decisions on the gate critic's two questions (2026-10-18):

28. **The settings route drops key setting** (the gate critic's Recommended option). The route is
    `menu settings <folder>`, which shows the folder's settings read-only, and
    `menu settings <folder> --create [--by <requester>]`, which creates the missing copies
    (the `settings.yaml` byte copy, the `settings.json` copy, the active regulatory profile files)
    and logs the write. A nested folder's settings are edited afterwards on the menu's own
    Settings screen opened from inside that folder, which the read-only screen and the create
    answer say in one sentence naming the folder. `--set`, the schema-type checks and the
    refused-key list are removed; the folder checks (decision 15) and the `--by` handling
    (decision 27) stay. The CTO Chief's reason, quoted: "the blocked plan only needed the files
    to exist (your decision 12); an agent able to set values in a nested `.ctoc/settings.json`
    through a route no hook sees would work against the owner-approved in-flight fix that refuses
    background agents writes to `.ctoc/settings.json`; and a refused-key list is an enumeration
    that any later key slips past."
29. **A dead build moves only after the human names its plan in a confirmed sweep.** No build is
    sent back to the build queue on a live-agent list alone, however its death is proven. This is
    the owner's own order of 2026-10-18 in the forwarded report, quoted from the CTO Chief's
    brief: "Before the sweep moves anything, show which plans it would move and why, and move
    them only after the human confirms on that screen"; "Rendering the dashboard must be
    read-only; the sweep runs only as an explicit menu command". The cost, stated under Risks:
    until he names it, a crashed build keeps its files, its scheduler slot and the
    wave-integration barrier.

Added by the product owner in this revision (owner or critic, overrule if wrong):

30. **`--create` never overwrites a file that exists; a call that finds every file present
    writes nothing and adds no log entry.** Reason: overwriting would change values the human set
    on the folder's own Settings screen, which decision 28 takes away from this route.
31. **Any flag other than `--create` and `--by` is refused with a sentence naming the two, and
    nothing is written.** Reason: a recipe or agent still sending the report's `--set key=value`
    must get a plain refusal, never a silent create or a silent no-op.

The CTO Chief's decision on the gate critic's question in its second classification (2026-10-18):

32. **`--create` writes only where a plan being built declares the folder's settings file** (the
    gate critic's Recommended option). `menu settings <folder> --create` creates the copies only
    when a plan in `plans/in-progress/` declares `<folder>/.ctoc/settings.yaml` or
    `<folder>/.ctoc/settings.json` in its `files:` list. Otherwise it refuses with one sentence
    that names the folder and says no plan being built declares its settings file, and writes
    nothing. The log entry names the declaring plan. The read-only form (`menu settings
    <folder>` with no flag) needs no declaring plan. The CTO Chief's reason: CTOC edits only
    files an approved plan declares, and the route writes through Node file calls no hook sees,
    so without this rule any session or agent could plant the owner-protected settings file at
    any depth (in `src/`, `plans/` or anywhere) and make that folder its own project root,
    unasked. The real project's blocked case still passes, because its plan declared the file.
    - The brief proposed one more sentence: a human who wants a nested root before any plan asks
      for one opens the menu from inside that folder, where project setup creates one. By my
      reading this holds only for a folder that is already a root by another marker (its own
      `.git`, or a `plans/` folder holding a stage folder). In a plain folder the menu resolves
      to the repository's root, and setup writes nothing in the folder (read:
      `project-root.js` lines 82–140; `start.js` lines 292, 759–798 and 926). So the refusal
      does not say it. The way to a nested root through the menu is a plan that declares its
      settings file.
    - The write protection finds the project root from the session's working directory, not from
      the folder of the file being edited (read: `protect-records.js` lines 632–635). A nested
      root changes which root it measures against only for a session that works inside that
      folder.

Added by the product owner with decision 32 (owner or critic, overrule if wrong):

33. **The declaration is read through CTOC's plan coverage, `plan-coverage.js`
    `findCoveringPlan` (line 642), and counts only when the match it returns is in the
    `in-progress` stage.** A glob that covers the file counts, under coverage's own rules:
    - only a plan with an approval record grants (lines 27–46, 590–591);
    - a glob whose first segment is a wildcard, such as `**/.ctoc/settings.yaml`, grants nothing
      without the plan's `unanchored_scope` acknowledgement (line 578);
    - a target that leaves the project, through a symbolic link included, is never covered
      (lines 479–508).

    The coverage scan returns the `in-progress` match before looking at `todo` (lines 84,
    518–628), so testing the returned stage is exact. Reason: plan files are edit-whitelisted,
    so an agent can write a seven-line plan into `plans/in-progress/` (lines 29–34 and 42–46).
    A reader that only lists that folder, such as `actions.js` `planDeclaredFiles` (line 1611,
    the example in the CTO Chief's brief), would let that plan plant the file, which is what
    decision 32 stops. The two readers also disagree on a plan with several `files:` blocks:
    `actions.js` takes the first (line 1622), coverage the last (lines 331–335). The new module
    calls `findCoveringPlan` and does not edit `plan-coverage.js`, which is on CTOC's protected
    enforcement list (`protected-paths.js` line 59).
34. **Declaring either settings file authorises the whole copy set, and the declaration is
    checked before which files are missing.** The copy set is both settings files and the
    active profiles of decision 16. The checks run in this order: flags, folder rules, the
    declaring plan, then presence. Reason: the brief names either file as enough, and decision 16
    makes the profiles part of the same regime. Checking the declaration before presence gives a
    folder no plan declares the same refusal whether or not its files exist. Checking the
    folder rules first means a covering glob never overrides them (scenario 1.3).

## What was not verified

- Nothing was run. I hold no way to execute a program. Every behavioural statement is from
  reading the files named, or from the CTO Chief's measurement where labelled.
- The real project's files (the plan that declared the nested settings file, its 31 files and
  about 20 plans) were not read. They are outside this worktree.
- What project setup writes when the menu opens from inside a nested folder is now read, not
  brief (the claims table and decision 32). It was read in the source, not run.
- Whether the real project's declaring plan has an approval record that `findCoveringPlan`
  accepts: not read, it is outside this worktree. A plan that reached `in-progress/` through the
  menu carries one (believed). If it has none, decision 33 refuses its create.
- That the declaring plan sits in `plans/in-progress/` when its builder calls the route:
  believed. A 2026-07-20 measurement recorded in `plan-coverage.js` lines 440–451 found
  `plans/in-progress/` empty during live builds; Problem two (builds sent from `in-progress/`
  back to `todo/`) and the plan sync's claim commit (scenario 2.7c) say builds sit there now.
  If the July measurement still held, decision 32 would refuse the very case this plan unblocks;
  scenario 1.7 runs the real menu path and would show it.
- `findCoveringPlan` accepts a target whose `.ctoc/` folder does not exist yet: read. Its
  symbolic-link check resolves a path "tolerating a path that does not exist yet"
  (`real-path-confinement.js` lines 105–124, 236–260; the body past line 124 was not read).
- Whether hooks other than the write protection find the project root from the session's
  working directory: only `protect-records.js` `decide` was read.
- The owner's words quoted in decision 29 and the report's `--set key=value` example: brief. I
  did not read the forwarded report.
- The unpushed local main's claim-before-launch flow, and its differing `start.md` lines: brief.
- The other branches' work ("Opening a screen never crosses a gate", the settings.json fix, the
  four-defects work, the parallel-workers plans): brief. None is in this worktree.
- That the plan sync's claim commit is a pure rename. By reading `sync.js` lines 102–124 it
  commits whatever changed under `plans/`. Whether the claim also edits the plan's text is not
  known to me, and the planner checks it before writing scenario 2.7c's fixture.
- That no test outside the 14 files found depends on a render writing. Only the named search
  was run.

## Slices (dependency-ordered)

Decomposed by the implementation planner on 2026-10-18 into exactly two slices, one per story,
as the owner's brief fixed.

| # | Slice file | Scope (one line) | depends_on |
|---|---|---|---|
| 1 | `real-projects-do-not-stall-on-the-menu-s1-settings-route.md` | The route `menu settings <folder> [--create [--by <requester>]]` (Story 1, scenarios 1.1–1.8). It runs in its own module, shows a folder's settings and creates the missing copies where an approved plan being built declares them. It refuses links on every target and writes only with exclusive create. From a git worktree it also reads the main worktree's plans. No hook file changes. | - |
| 2 | `real-projects-do-not-stall-on-the-menu-s2-read-only-dashboard-and-sweep.md` | Story 2, scenarios 2.1–2.12. The dashboard writes nothing and previews the sweep in one line. `menu task sweep` previews each build with its reason. `--confirm <plan>@<token>,…` moves only the named, still-eligible plans. "Repair state" names nothing. A start never records a fake agent id, and the recipes stamp the harness id. The first test is the placeholder-id bug. | s1 (both add a route to `menu-screens.js` and edit `start.md`, `docs/ENFORCEMENT.md`, `CLAUDE.md` and `README.md`, so they build one after the other) |

Both slices are over the ~1–3 file budget, slice 2 by far. Each records why under its own
"Decisions Taken Under Ambiguity" (S1-1, S2-1).

Slice 1 carries one question for the owner: whether a build in its own git worktree may use a
plan claimed in the main worktree (Recommended: yes). Slice 2 carries none.

Checked while planning:

- **The plan sync's claim commit.** The functional plan's open item about the claim commit
  (just above) is answered by reading, not by running. `startExecution` is a pure rename
  (`src/lib/actions.js` lines 997–1000, `movePlan` lines 95–127). Slice 2's case B8c tests the
  100% rename it commits.
- **Further tests whose contract the owner replaced.** These were found beyond the 14 files
  named above, and slice 2 rewrites each with its reason:
  - `tests/menu-screens-coverage.test.js` line 300;
  - `tests/tab-modules.test.js`, its Doctor-key mocks;
  - `tests/menu-protocol.test.js`, which gains scenario 2.12.
