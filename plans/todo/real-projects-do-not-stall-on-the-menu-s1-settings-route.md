---
title: "The menu shows a nested folder's settings and creates the missing copies where a plan being built declares them"
type: implementation
created: 2026-10-18
priority: high
effort: medium
parent_plan: real-projects-do-not-stall-on-the-menu
depends_on: none
files:
  # THE SLICE'S OWN FILES — the work surface (six; over the ~1–3 budget, see decision S1-1).
  - src/lib/nested-settings.js
  - src/lib/menu-screens.js
  - tests/nested-settings-route.test.js
  - tests/cache-freshness.test.js
  - src/commands/start.md
  - docs/ENFORCEMENT.md
  # RATCHET FILES — a new src/lib module and a new tests/*.test.js move the documented
  # counts (src/lib/documented-counts.js checks CLAUDE.md at the implementation → todo
  # transition; tests/readme-numbers.test.js pins the same two counts in README.md).
  - "CLAUDE.md"
  - README.md
---

# The menu shows a nested folder's settings and creates the missing copies where a plan being built declares them

Slice 1 of 2 of `plans/implementation/real-projects-do-not-stall-on-the-menu.md` (the functional
plan, now the parent index). It builds Story 1: the route `menu settings <folder> [--create [--by
<requester>]]`, scenarios 1.1–1.8, decisions 1–4, 12, 15, 16, 26–28 and 30–34 (13, 14 and 17 are
withdrawn). It also folds in the two technical inputs the gate critic found: where the route can
run (a checkout or a git worktree), and symbolic links on every file the route copies.

Revised in the specification round by the CTO Chief's decisions on the spec critic's and the
threat model's findings (decisions S1-9 to S1-32 below), and in the second specification round
by the round-2 critic's findings (decisions S1-33 to S1-42), and in the third and last round by
the round-3 critic's finding (decision S1-43). Decision S1-9 amends the parent's
decision 33: a plan in `plans/todo/` also declares, when that checkout's task registry holds a
running build of it.

No file under `src/hooks/` changes (decision 3). The plan's hook scenarios are tests of today's
hook.

**What this planner did and did not do.** Every statement about this repository below was read
from the file and line named, in this worktree (origin/main 6.14.130). Two exceptions are
labelled where they occur: the unpushed local `main` (read from the main checkout's working
tree, not from the commit), and git and Node behaviour labelled *believed*. Nothing was run:
this planner held read, search, write and edit tools only. Every *believed* item has a test
below that would show it wrong.

**What was not verified, and the one precondition now measured.**

- The *believed* items are labelled where they occur (git's `-z` block layout and version, a
  recursive mkdir through a linked parent, macOS `realpath` letter case). Each has a case or a
  Step 9 record that would show it wrong.
- **The real project's precondition — not verified in round 1, now verified (decision S1-34).**
  The CTO Chief read the real project's task registry on 2026-10-18, read-only; this planner did
  not re-read it. The stalled plan's earlier build task was an `implement` task with no recorded
  agent id; the dashboard's sweep marked it dead as "presumed dead", and the plan went back to
  the build queue although its code was already merged on that project's main branch. A new
  `implement` task for that plan is now **queued**, not running, and the plan is in `todo/`.
  So the route serves the real case once the coordinator starts that task (`menu task start
  <id> --agent-id <id>`): the task is then running, and with the building witness of decision
  S1-9 the plan's declaration counts. Called before that start, the route answers `not-declared`,
  and that sentence says to retry once the build task is started.

## The problem in plain words

A real project keeps nested CTOC project roots inside its repository, for example
`streams/<name>/`. One of its plans needed `streams/<name>/.ctoc/settings.yaml` to exist.

- CTOC's write protection refuses that file name at any depth, for editing tools and for the
  shell (`src/hooks/protect-records.js` lines 125–143, 152–156).
- No menu route writes it: the router (`src/lib/menu-screens.js` lines 2791–2807) has no
  settings route.

So the builder stopped, the plan stayed open, and the plans behind it waited.

This slice adds the menu route. It runs in the menu's own process, through Node file calls that
no hook sees. It only ever:

- shows a folder's settings, or
- creates the missing copies of the project's own settings and the project's own active
  regulatory profiles, never changing a value and never writing over a file;

and it creates them only where an approved plan being built declares the folder's settings file.

## Where the route can run (the gate critic's first input)

**What was read.**

- The menu resolves its project root from its working directory: `start.js` line 292, through
  `findProjectRoot`. A git worktree holds its own `.git` file, so the walk stops there
  (`src/lib/project-root.js` lines 128–131).
- The menu moves a plan into `plans/in-progress/` only through `startAgent`'s claim, and only in
  the checkout the menu ran in (`src/lib/actions.js` lines 1873–1885, `startExecution`).
- A build launched through the promote list runs with its plan still in `plans/todo/`. The
  session records it with `menu task add implement <plan>` and starts it with `menu task start
  <id> --agent-id <id>` (`src/commands/start.md` lines 118–119 and 130), and neither route moves
  a plan (`menu-screens.js` lines 2123–2154, 2245–2304). The real project's stalled plan is in
  `todo/` today, with a queued, not yet started, `implement` task (the CTO Chief's read-only
  measurement, 2026-10-18; decision S1-34).
- `plan-coverage.js` lines 439–451 name the "building witness": a plan in `plans/in-progress/`,
  or a running implement task naming its slug.
- A builder's worktree is a separate checkout of the same repository. Its `plans/` shows what was
  committed when it was made, and its `.ctoc/state/tasks.json` (the task registry,
  `task-registry.js` line 206) is its own.

**What the route does (decision S1-9, which amends the parent's decision 33; the worktree lookup
is decision S1-2).**

1. In **this checkout**, it reads the declaring plan through `findCoveringPlan` (approval record
   still required). The match counts when it is in `in-progress`, or when it is in `todo` and
   this checkout's task registry holds a **running** `implement` task whose plan is the matched
   plan (the building witness).
2. When none counts and this checkout is a **linked git worktree** (its `<root>/.git` is a
   regular file, not a folder), it asks git for the repository's **main worktree** with every
   variable matching `/^GIT_/i` removed from git's environment, accepts it only when that worktree's `.git`
   is a real folder equal to `git rev-parse --git-common-dir`, and applies the same rule there,
   with the main worktree's own task registry.
3. In every case it writes only into the checkout it runs in. A builder's own call from its
   worktree therefore lands the file in the builder's branch, where the plan's work is
   committed. A call from the claiming checkout lands it there.

The log names which checkout's plan allowed the write. When it was the main worktree's, the same
log line is also appended to the main worktree's log, naming the writing checkout (decision
S1-16).

- **Why not only this checkout.** The builder could then never do it itself. The coordinating
  session would have to run the route from the claiming checkout. The file would then sit in
  that checkout's working tree, outside the builder's branch, which is the stall the real
  project hit, moved one step.
- **Why the main worktree and not "the claiming checkout".** No file records which checkout
  claimed a plan. The task registry is per checkout. The main worktree is the one checkout git
  itself names. If the coordinating session runs in another linked worktree, the lookup finds
  no plan and refuses (fail closed), with a sentence saying where it looked.
- **A CTOC root that is not the git top folder never falls back** (decision S1-24): its
  `<root>/.git` does not exist, so it is not a linked worktree, by design.

## Implementation Details

### Dependency Graph

```
src/commands/start.js main() ──route()──▶ src/lib/menu-screens.js route()  case 'menu', args[1]==='settings'
                                                   │  (require('./nested-settings') lazily, inside the branch)
                                                   ▼
                                     src/lib/nested-settings.js settingsRoute(args, root)   (NEW)
                                        ├─▶ src/lib/safe-fs.js            (every file call, as a namespace)
                                        ├─▶ src/lib/plan-coverage.js      findCoveringPlan  (called, NOT edited: protected-paths.js line 59)
                                        ├─▶ src/lib/task-registry.js      load              (read; the building witness)
                                        ├─▶ src/lib/durable-log.js        appendEntry       (the write log, both checkouts)
                                        ├─▶ src/lib/project-root.js       describeProjectRoot
                                        ├─▶ src/lib/regulatory-regime.js  loadActiveProfiles, loadProfile, unloadableProfiles
                                        ├─▶ src/lib/enforcement-mode.js   resolveEnforcementMode
                                        ├─▶ src/lib/tui.js                stripCtl
                                        └─▶ require('child_process').spawnSync('git', …)   (looked up at call time; only from a linked worktree)
                                               ['worktree','list','--porcelain','-z']  and  ['rev-parse','--git-common-dir']
tests/nested-settings-route.test.js ──▶ menu-screens.route(['menu','settings',…])  +  start.js as a child process
                                    ──▶ src/hooks/protect-records.js as a child process, and its subagentMayRunRoute through Module._compile
tests/cache-freshness.test.js       ──▶ whitelist entry for nested-settings.js
```

No cycle: `nested-settings.js` requires nothing that requires `menu-screens.js`. None of
`plan-coverage`, `task-registry`, `durable-log`, `project-root`, `regulatory-regime`,
`enforcement-mode`, `tui` or `safe-fs` requires `menu-screens`. The require lines were read at
the top of each file (`task-registry.js` lines 111–113: `path`, `safe-fs`, `plan-coverage`;
`durable-log.js` lines 49–50: `path`, `safe-fs`). One partial read: `enforcement-mode.js` lines
31–32 (it requires `settings`). `hotfix-check.js` is not required (decision S1-10).

### File Specifications

#### File: `src/lib/nested-settings.js`
**Action:** CREATE
**Purpose:** The `menu settings` route. It shows a folder's settings, or creates the missing
copies of the project's own settings and active profiles where a plan being built declares
them, and it logs every write.
**Change Type:** new-module

**Exports (exactly one, so the dead-export fence (`.ctoc/export-reachability-baseline.json`,
`maxDead` 65) gains nothing):**

- `settingsRoute(args: string[], root: string)` → `ScreenResult`
  - `args` are the words after `menu settings`, as `route` hands them over.
  - `root` is the menu's resolved project root (`menu-screens.getProjectPath`).
  - It returns `{ ok: boolean, refused?: true, reason?: string, text: string, ask:
    { questions: [{ question, header: 'Settings', options }] }, actions: object }`.
  - `text` always ends with `\n\n\n` (start.md: "always ends with").
  - It never throws (the orchestration below).

**Module constants:**

- `SETTINGS_FILES = ['settings.yaml', 'settings.json']`
- `PROFILES_DIR = 'regulatory-regimes'`
- `LOG_REL = ['.ctoc', 'logs', 'nested-settings.jsonl']`
- `LOG_MAX_ENTRIES = 1000` (the `maxEntries` cap of `durable-log.appendEntry`, lines 203,
  231–235; a count of lines, not bytes)
- `SHOW_CAP = 120` (every value shown in a sentence, the refused flag and a settings key)
- `REQUESTER_CAP = 80` (`--by`, the parent's decision 27)
- `SIZE_CAP = 1024 * 1024` (bytes read of any one settings or profile file)
- `GIT_TIMEOUT_MS = 10_000`
- `OFFERABLE_SEGMENT_RE = /^[A-Za-z0-9._-]+$/` (the rule at `menu-screens.js` line 1783)

**Requires:**

- `path`
- `./safe-fs`, held as the namespace `safeFs`, so tests can inject faults on its exports object.
  This is the seam `tests/dashboard-reconcile-failure.test.js` lines 56 and 218 already use.
- `{ findCoveringPlan }` from `./plan-coverage`
- `taskRegistry = require('./task-registry')`, as a namespace (`load`, line 401)
- `durableLog = require('./durable-log')`, as a namespace (`appendEntry`, line 207)
- `projectRoot = require('./project-root')`, as a namespace (`describeProjectRoot`), so case 13
  can reach its `fallback` arm
- `regime = require('./regulatory-regime')`, as a namespace for the same reason as `safeFs`
- `{ resolveEnforcementMode }` from `./enforcement-mode`
- `{ stripCtl }` from `./tui` (`tui.js` line 37; reused, never re-encoded)
- `child_process` is never held: each git call is `require('child_process').spawnSync(…)`,
  looked up at call time, so a test can stub `spawnSync` on that module object (decision S1-14).

**Internal functions (not exported).**

`show(value)` → `stripCtl(String(value)).slice(0, SHOW_CAP)`. Every value interpolated into a
sentence goes through it.

`parseArgs(args)` → `{ ok: true, folder: string, create: boolean, by: (string|null) }` or a
refusal `{ ok: false, reason, text }`. Its rules:

- `--create` sets `create`. A second `--create` gives reason `flag`.
- `--by` takes the next word. That word must exist and must not start with `--`; otherwise the
  reason is `by-missing`. A second `--by` gives reason `flag`.
- Any other word starting with `-`, such as `--set` or `-x`, gives reason `flag`. The text names
  the two accepted flags (decision 31) and the refused word through `show`.
- The first positional word is the folder. A second one gives reason `extra-word`.
- `--by` without `--create` gives reason `by-without-create`.
- No folder gives reason `no-folder`.
- This route keeps its own parser and never extends `menu-screens.parseTaskArgs`. That parser is
  also the hook's reader (`protect-records.js` lines 327–336), so a new field there would
  silently change what the hook accepts.

`requesterLabel(by)` → `string`:

- `by === null` gives `'not declared'`.
- Otherwise `clean = stripCtl(by).slice(0, REQUESTER_CAP)`. An empty `clean` gives
  `'not declared'`, else `` `${clean} (declared, not verified)` `` (decision 27).

`checkFolder(root, arg)` → `{ ok: true, rel: string, abs: string, rootReal: string }` or a
refusal. The checks run in this order and the first failure wins (decisions 15 and 34). Each
failure has its own reason code and sentence (table below):

1. `stripCtl(arg) !== arg` gives `control-character`.
2. `s = arg.replace(/\\/g, '/')` (decision S1-23). `path.isAbsolute(arg)`, or `s` starting with
   `/` (which covers `//`), or `s` matching `/^[A-Za-z]:/` gives `absolute`.
3. Any segment of `s` equal to `..` gives `parent-segment`. This is checked before normalising,
   so `streams/../..` is refused rather than collapsed.
4. Normalise with `path.posix.normalize(s)` and drop a trailing `/`. The result `.` or `''`
   gives `root`.
5. Any segment of the normalised result matching `/^\.(ctoc|git)$/i` gives `ctoc-or-git`. The
   match ignores letter case, so `.CTOC` is refused on a case-insensitive disk too.
6. Any segment of the normalised result holding `:`, or ending in `.` or a space, gives
   `name-alias` (decision S1-21). Checks 5 and 6 run on the normalised segments, so a leading
   `./` (dropped by normalising) is not refused as a name ending in a dot; case 15's `./-lead`
   shows it.
7. `rootReal = safeFs.realpathSync(root)`, inside a try; a fault gives `unreadable` with its
   code. Then walk the segments from the root down, never following a link:
   - `safeFs.lstatSync(<segment>)`: ENOENT or ENOTDIR gives `missing`; any other error gives
     `unreadable`, naming the code.
   - A symbolic link at any segment gives `link`. The sentence adds "which leads outside the
     project" when `safeFs.realpathSync(segment)` throws (a dangling link), or when its path
     relative to `rootReal` starts with `..` or is absolute.
   - `safeFs.readdirSync(<parent>)` must list the segment exactly as written; otherwise
     `name-alias` (another letter case, or a short name the disk also answers to). A fault of
     that listing gives `unreadable`.
   - A last segment that is not a folder gives `not-a-folder`.
8. `lstat(<abs>/.ctoc)`:
   - absent is fine;
   - a link gives `ctoc-link`;
   - present but not a folder gives `ctoc-not-folder`;
   - any other error gives `unreadable`.
9. When `.ctoc` is a folder, `lstat` each of `settings.yaml`, `settings.json` and
   `regulatory-regimes`, never following a link:
   - a link gives `settings-link` (`profiles-link` for the folder);
   - present but of the wrong kind gives `settings-not-file` (`profiles-not-folder`);
   - any other error gives `unreadable`;
   - absent is fine.

   This is the gate critic's second input. These checks sit among the folder rules, before the
   declaration, so a linked target never earns the no-declaring-plan sentence (scenario 1.3).

`rel` is the normalised POSIX form, for example `streams/alpha`. `abs` is `path.join(root,
...rel.split('/'))`.

`gitEnv()` → a copy of `process.env` without any key matching `/^GIT_/i` (decisions S1-10 and
S1-39; the flag `i` because Windows reads environment names without regard to letter case). That
removes, among others, the eight variables `hotfix-check.js` lines 290–292 list as pointing git
at another repository or index (`GIT_REDIRECTS`), which the module comment names.

`mainWorktree(root)` → `string | null`. Every fault returns `null`.

- `opts = { cwd: root, encoding: 'utf8', timeout: GIT_TIMEOUT_MS, maxBuffer: 1024 * 1024,
  windowsHide: true, shell: false, env: gitEnv() }`.
- `list = require('child_process').spawnSync('git', ['worktree', 'list', '--porcelain', '-z'],
  opts)`. `list.error`, or `list.status !== 0`, gives `null`.
- Split `list.stdout` on `\0`. The first block is the fields before the first empty field
  (*believed*: with `-z`, every field ends in NUL and a block ends in one more; git documents
  the main worktree first. Case 14 and case 7 fail if either is wrong):
  - its first field must start with `worktree `, and its remainder is `main`; otherwise `null`;
  - a field equal to `bare` in that block gives `null`, since a bare repository has no main
    checkout.
- `common = require('child_process').spawnSync('git', ['rev-parse', '--git-common-dir'],
  opts)`. An error or a non-zero status gives `null`. Its output, with the trailing line end
  removed, is resolved against `root` (it may be relative).
- Inside a try: `safeFs.lstatSync(path.join(main, '.git'))` must be a folder and not a link, and
  `safeFs.realpathSync(path.join(main, '.git')) === safeFs.realpathSync(resolvedCommon)`;
  otherwise, or on any fault, `null`.
- Return `main`. A main worktree equal to `root` cannot pass: `root`'s `.git` is a file and
  `main`'s must be a folder (decision S1-24).

`buildingTask(base, ref)` → `string | null`, the building witness for a `todo` match:

- `slug = ref.split('/').pop()`; `ref` is `findCoveringPlan`'s `<stage>/<slug>`
  (`plan-coverage.js` lines 554, 627).
- `reg = taskRegistry.load(base)`, inside a try (it throws only on a bad root, line 402; on an
  unreadable registry it returns `tasks: []`, lines 415–421).
- The first task with `kind === 'implement'`, `status === 'running'` and
  `planSlug(task.plan) === slug` gives its `id`; otherwise `null`.
- `planSlug(p)`: a non-string gives `null`; else `p.replace(/\\/g, '/').split('/').pop()` with a
  final `.md` removed. A build `startAgent` records carries the bare slug (`actions.js` line
  1783, `plan.name`, from `state.js` line 49); a recorded `menu task add implement <plan>`
  carries the caller's word (`menu-screens.js` line 2092), so a path form also matches
  (decision S1-32).

`findDeclaringPlan(root, rel)` → `{ plan: string, where: 'this checkout' | 'the main
worktree', base: string, task: (string|null) } | null`:

- For `base` in `[root]`, plus `mainWorktree(root)` when `safeFs.lstatSync(path.join(root,
  '.git')).isFile()` (inside a try; any fault means "not a linked worktree"):
  - for `f` of `SETTINGS_FILES`, call `m = findCoveringPlan(path.join(base, ...rel.split('/'),
    '.ctoc', f), base)` (the target first, then the root: `plan-coverage.js` line 642);
  - `m !== null && m.stage === 'in-progress'` returns `{ plan: m.plan, where, base, task: null
    }` (`findCoveringPlan` returns `null` when nothing covers the path; decision S1-37);
  - `m !== null && m.stage === 'todo'` and `t = buildingTask(base, m.plan)` not null returns
    `{ plan: m.plan, where, base, task: t }`.
- Otherwise return `null`.
- The scan returns an `in-progress` match before it looks at `todo` (`STAGE_PRIORITY`, line 84;
  lines 518–628), and inside one stage only the most specific approved match (lines 622–627).
  So a less specific plan being built behind a more specific idle one in `todo` refuses (fail
  closed, decision S1-9).

`readCapped(p)` → `{ ok: true, bytes: Buffer }` or `{ ok: false, code }`: `lstat` must show a
regular file (a link gives `code: 'link'`, another kind `code: 'not-file'`), its `size` at most
`SIZE_CAP` (else `code: 'too-large'`), then `safeFs.readFileSync(p)`. A fault gives its
`err.code || 'no error code'`.

`planCopies(root, abs)` → `{ ok: true, items: Array<{ bytes: Buffer, dst: string, relDst:
string, present: boolean }>, notes: string[] }` or a refusal. Nothing is written here.

- **One mapping for every source** (decision S1-12), `sourceRefusal(code, relSrc)`: `link`
  gives `source-link`; `not-file` gives `source-not-file`; `too-large` gives `too-large`; any
  other code gives `unreadable`. Only the ENOENT handling differs per source, below, so the
  profile side adds no line of its own that no case reaches (a folder at a profile path makes
  `loadProfile` throw `EISDIR` first, which gives `regime-unreadable`).
- **The order of the reads (decision S1-38).** The capped, link-refusing reads of both settings
  sources run first; `regime.loadActiveProfiles` runs only after `settings.yaml` passed; then
  `settings.yaml` is read once more and checked against the bytes that will be copied.
- **Settings sources**, `<root>/.ctoc/<f>`, read with `readCapped`:
  - `settings.yaml`: ENOENT gives `no-source`; any other failure goes through `sourceRefusal`.
  - `settings.json`: ENOENT skips it with the note "the project has no `.ctoc/settings.json` of
    its own to copy"; any other failure goes through `sourceRefusal`.
- **Profiles.** `names = [...new Set(regime.loadActiveProfiles(root).profiles)]`, duplicates
  removed before the loop (decision S1-36: a name listed twice would otherwise give two items
  for one `dst`, and the second exclusive create would fail and roll the first back); a throw
  gives `regime-unreadable` (the copy would not carry the same regime, so nothing is written).
- **The source re-check.** `again = readCapped(<root>/.ctoc/settings.yaml)`. A failure of that
  read, or `!again.bytes.equals(yaml.bytes)`, gives the refusal `source-changed`: the profile
  names came from a read `loadActiveProfiles` made itself (uncapped, `regulatory-regime.js`
  lines 189–200), and the re-check shows that read saw the same bytes the route copies, unless
  the file was changed and changed back between the reads (adversary A2, accepted). Nothing is
  written and nothing is logged.
- For each name:
  - `regime.loadProfile(root, name)` inside a try; a throw gives `regime-unreadable`. A `null`
    skips it with the note "the project's active profile `<name>` cannot be loaded by the
    project either; nothing to copy". That reuses the module's name rule, so `PROFILE_NAME_RE`
    is not exported or copied, and no unchecked name is ever joined into a path.
  - `readCapped(<root>/.ctoc/regulatory-regimes/<name>.yaml)`: ENOENT skips it with the note
    "the project reads profile `<name>` from the profiles shipped with CTOC, and so will the
    folder" (true: `loadProfile` falls back to the shipped copy only when the project's own
    path does not exist, `regulatory-regime.js` lines 274–275); any other failure goes through
    `sourceRefusal`.
  - Otherwise `dst = <abs>/.ctoc/regulatory-regimes/<name>.yaml`.
- **Order of `items`:** the profiles first, then `settings.yaml`, then `settings.json`
  (decision S1-11).
- **Presence of each `dst`,** read with `lstat`, never following a link:
  - ENOENT means `present: false`;
  - a regular file means `present: true`, and is compared with its source (decision S1-17):
    a different `size` differs without reading; an equal size is read and compared byte for
    byte (the size equals the source's, so the read is capped too). A fault of that read gives
    `unreadable`;
  - a link gives `profile-link` (for settings files, check 9 already refused it);
  - any other kind gives `profile-not-file`;
  - any other error gives `unreadable`.
- Any present file that differs from its source gives `present-differs`, naming every such
  file, and nothing is written. The missing ones are not created either.

`ensureFolder(dir)` → `{ made: boolean }` on success or `{ code: string }`:

- `safeFs.mkdirSync(dir)` without `recursive` gives `{ made: true }`. A recursive mkdir would
  walk through a linked parent (*believed*; never relied on, because check 8 already refused a
  linked `.ctoc`).
- On `EEXIST`, re-`lstat`. A real folder that is not a link gives `{ made: false }`, because a
  concurrent creation is fine. Anything else, a fault of that `lstat` included, gives `{ code:
  'EEXIST' }`.
- Any other error gives `{ code: err.code || 'no error code' }`.

`createCopies(root, rel, ctx, copies, declaring, by)` → `ScreenResult`. `ctx` is
`checkFolder`'s result. The whole body runs inside one try; an unexpected throw is handled as a
write failure of the item in hand (its code), so this function never throws.

1. If no item is missing, write nothing, append no log and answer reason `all-present`
   (decision 30). The text says the files already exist and are the same as the project's, and
   carries the change sentence.
2. Ensure `<abs>/.ctoc` when any item is missing, and `<abs>/.ctoc/regulatory-regimes` when any
   profile item is missing. A failure answers reason `folder-failed`: "could not create the
   folder `<relDir>` (<code>); no file was created", plus "the empty folder `<x>` made before
   it was left" when `.ctoc` was made first. An empty `.ctoc/` does not make the folder a
   project root (`project-root.js` lines 95–98: it needs a settings file or a `plans/`
   sibling). No log.
3. For each missing item in order (profiles, `settings.yaml`, `settings.json`):
   - `safeFs.writeFileSync(dst, item.bytes, { flag: 'wx' })`. Exclusive create fails with
     EEXIST on any existing name, a dangling link included. It guards the file, not the folders
     above it (decision S1-20).
   - Then `safeFs.realpathSync(dst)` must equal `path.join(ctx.rootReal, ...rel.split('/'),
     '.ctoc', …)`, the expected place. A difference, or a fault of that call, stops the loop
     with reason `raced` (decision S1-20).
   - A write failure stops the loop with reason `write-failed`, recorded as `` `${relDst}:
     ${code}` ``.
4. On `write-failed` or `raced`, every file this call created (the `raced` one included) is
   removed with `safeFs.unlinkSync`. A file that cannot be removed is named with its code
   (decision S1-11). The folders this call made stay, empty, and are named.
5. When at least one file was created, append one log entry with
   `durableLog.appendEntry(<root>/.ctoc/logs/nested-settings.jsonl, entry, { maxEntries:
   LOG_MAX_ENTRIES })`. Each of the two appends builds its own entry inside the same try as the
   append itself (decision S1-40), so a fault while building it, `writtenIn`'s `realpath`
   included, is reported like a failed append and never reaches the outer try (which would
   misreport it as a write failure and remove the created files). Its fields: `{ at: new Date().toISOString(), folder: rel,
   created: [relDst…], declaringPlan: declaring.plan, declaredIn: declaring.where, writer: 'the
   menu', requester: requesterLabel(by) }`, plus `buildingTask` when the plan was in `todo`, and
   on a failure `failed: '<relDst>: <code>'`, `removed: [relDst…]` and `notRemoved: ['<relDst>:
   <code>'…]`.
   - It names files only, never their contents (decision 2).
   - When `declaring.where === 'the main worktree'`, after this checkout's append, the same entry plus `writtenIn:
     path.relative(realpath(declaring.base), ctx.rootReal)` with `/` separators (both real
     paths, so a linked temporary folder cannot make them disagree) is also appended to
     `<declaring.base>/.ctoc/logs/nested-settings.jsonl` (decision S1-16).
   - A failure of either append, or of building its entry, is reported in the answer: "the
     write log could not be updated (<code>)", or "the main worktree's write log could not be
     updated (<code>)". The created files stay, and the answer stays `ok: true`. Never silent.
6. The answer text:
   - one line per created file, each named;
   - on a failure, the failure, every removed file, every file that could not be removed, and
     every empty folder left;
   - the notes;
   - the requester label;
   - the declaring plan, the checkout it was found in, and the building task when there was one;
   - the change sentence (decision 26).

`readOnlyScreen(root, rel, abs)` → `ScreenResult` (no flag; no declaring plan needed;
decision 2). It reads files only after `checkFolder` refused every link. The lines:

- **The files:** each of `.ctoc/settings.yaml`, `.ctoc/settings.json`, and
  `.ctoc/regulatory-regimes/<name>.yaml` for each name of `[...new
  Set(regime.loadActiveProfiles(root).profiles)]` (duplicates removed, decision S1-36) the
  project keeps as its own file (a throw of that call gives the line "the project's active
  profiles could not be read (<code>)" in place of the profile files), marked "missing", "same as the project's" or "differs from the project's" (decision
  S1-17), or "could not be compared (<code>)" when either side cannot be read with
  `readCapped`.
- **Resolution** (decision S1-27): `d = projectRoot.describeProjectRoot(abs)`, `resolved =
  path.relative(root, d.root)` with `/` separators:
  - `d.marker === 'fallback'`: "CTOC could not find a project root for `<rel>`."
  - `d.root === abs` and `d.marker === 'ctoc'`: "`<rel>` is its own CTOC project root."
  - `d.root === abs`, another marker: "`<rel>` is a project root by its own <`plans/` folder |
    `.git` | project file> and has no CTOC settings of its own."
  - otherwise: "`<rel>` is not a CTOC project root; CTOC resolves it to <the project root when
    `resolved === ''` | `<resolved>`> and uses those settings."
- **Enforcement mode:** `resolveEnforcementMode(d.root)` → `strict (from settings.yaml)`.
- **Regulatory profiles:** `regime.loadActiveProfiles(d.root).profiles`, and
  `regime.unloadableProfiles(d.root)` as "none" or the names. Either throwing gives "could not be
  read (<err.code || 'no error code'>)" (decision S1-22).
- **Settings keys** (key names only, never values, decision S1-4):
  - for the folder's own `settings.yaml`: every match of `/^([A-Za-z_][A-Za-z0-9_-]*)[ \t]*:/gm`;
  - for `settings.json`: `Object.keys` of a parsed plain object, or "could not be read as JSON",
    or "is not a JSON object";
  - each key through `show`, at most 30 keys per file.
- **The change sentence:** "To change a setting of `<rel>`, open the menu from inside `<rel>`
  (the first time, this sets it up as its own CTOC project) and change it on its Settings
  screen." (decision 26.)
- **Options** (decision S1-18):
  - "Create its settings" → `menu settings <rel> --create`, only when a file is missing, every
    segment of `rel` matches `OFFERABLE_SEGMENT_RE`, and the first segment does not start with
    `-` (decision S1-42: `parseArgs` reads a word starting with `-` as a flag, so the offered
    command would be refused `flag`). When a file is missing and either rule fails, no action is
    offered and the text says "The folder name `<rel>` cannot be offered as a command.";
  - "◀ Back" → `dashboard`.

`settingsRoute(args, root)` — the orchestration (decision S1-13):

```
try {
  p = parseArgs(args)                         → refusal ends here
  c = checkFolder(root, p.folder)             → refusal ends here
  if (!p.create) return readOnlyScreen(root, c.rel, c.abs)
  d = findDeclaringPlan(root, c.rel)          → null: refusal 'not-declared'
  k = planCopies(root, c.abs)                 → refusal ends here
  return createCopies(root, c.rel, c, k, d, p.by)
} catch (err) {
  return refusal 'internal': "The settings route stopped on an unexpected fault
  (<err.code || 'no error code'>). Nothing was written."
}
```

Every phase before `createCopies` writes nothing of its own, and `createCopies` never throws, so
"Nothing was written" is true on the `internal` path. (`taskRegistry.load` itself appends a warn
line to `.ctoc/logs/task-registry.json` when it meets a corrupt registry, lines 237–251; that is
the registry module's own behaviour.)

**Outcomes.** "Files written" means files that remain after the call.

| reason | ok | refused | files written | log line written |
|---|---|---|---|---|
| (none; created) | true | — | the missing copies | yes; also in the main worktree's log when the plan was found there |
| (none; read-only screen) | true | — | none | no |
| `all-present` | true | — | none | no |
| `no-folder`, `flag`, `by-missing`, `by-without-create`, `extra-word` | false | true | none | no |
| `control-character`, `absolute`, `parent-segment`, `root`, `ctoc-or-git`, `name-alias`, `missing`, `unreadable`, `link`, `not-a-folder` | false | true | none | no |
| `ctoc-link`, `ctoc-not-folder`, `settings-link`, `settings-not-file`, `profiles-link`, `profiles-not-folder` | false | true | none | no |
| `not-declared` | false | true | none | no |
| `no-source`, `source-link`, `source-not-file`, `too-large`, `regime-unreadable`, `source-changed`, `profile-link`, `profile-not-file`, `present-differs` | false | true | none | no |
| `folder-failed` | false | true | none (an empty folder made before the failure stays, named) | no |
| `write-failed`, `raced` | false | true | none (each created file removed; one that could not be removed is named) | yes, with `failed`, `removed`, `notRemoved` |
| `internal` | false | true | none | no |

A created answer whose log append, or the building of its log entry, failed is still `ok: true`
and says so in its text.

**Refusal sentences.** Every value interpolated into a sentence goes through `show`. A fault is
shown by its `err.code` only, never by a message that may hold a path (decision S1-22). Every
refusal but `write-failed`, `raced` and `folder-failed` says "Nothing was written."

| reason | sentence (the folder shown as `<f>`) |
|---|---|
| `no-folder` | "Name a folder inside the project: `menu settings <folder>`." |
| `flag` | "`menu settings` accepts two flags, each once: `--create`, and `--by <requester>` with it. `<word>` is not accepted here; a setting's value is never changed here." |
| `by-missing` / `by-without-create` | "`--by` names who asked for a create; it takes one word and goes with `--create`." |
| `extra-word` | "`menu settings` takes one folder." |
| `control-character` | "The folder name holds a control character." |
| `absolute` | "`<f>` is an absolute path; name a folder relative to the project root." |
| `parent-segment` | "`<f>` uses `..`; name a folder inside the project without `..`." |
| `root` | "That is the project root itself; its own settings are changed on the menu's Settings screen." |
| `ctoc-or-git` | "`<f>` runs through a `.ctoc` or `.git` folder, where no settings file may be planted." |
| `name-alias` | "`<f>` does not name the folder exactly as it is on disk (another letter case, a short name, a `:`, or a name ending in a dot or a space); name it exactly." |
| `missing` | "`<f>` does not exist; the settings route works only on a folder that exists." |
| `unreadable` | "`<f>` could not be read (<code>)." |
| `link` | "`<f>` passes through a symbolic link (`<segment>`)[, which leads outside the project]; the settings route writes only into real folders of the project." |
| `not-a-folder` | "`<f>` is a file, not a folder." |
| `ctoc-link` / `ctoc-not-folder` | "`<f>/.ctoc` is a symbolic link" / "is not a folder"; "its settings could land in another place." |
| `settings-link` / `settings-not-file` | "`<f>/.ctoc/<file>` is a symbolic link" / "exists but is not a regular file"; "the settings route never writes through a link." |
| `profiles-link` / `profiles-not-folder` / `profile-link` / `profile-not-file` | the same shape for `regulatory-regimes` and a profile file |
| `not-declared` | "No plan being built declares `<f>/.ctoc/settings.yaml` or `<f>/.ctoc/settings.json` (looked in this checkout[ and in its repository's main worktree]), so the settings of `<f>` were not created; a plan that needs them declares that file in its `files:` list. If a plan in `plans/todo/` declares it, it counts once its build task is started (`menu task start <id> --agent-id <id>`); retry then." (decisions 32 and S1-34; the bracket only when `<root>/.git` is a file) |
| `no-source` | "The project has no `.ctoc/settings.yaml` of its own, so there is nothing to copy." |
| `source-link` / `source-not-file` | "The project's own `<file>` is a symbolic link" / "is not a regular file"; "the settings route copies only the project's own files." |
| `too-large` | "The project's own `<file>` is larger than 1 MiB; the settings route does not copy it." |
| `regime-unreadable` | "The project's own regulatory settings could not be read, so a copy would not carry the same regime." |
| `source-changed` | "The project's own `.ctoc/settings.yaml` changed while it was being read, so a copy might not carry the same regime; run it again." |
| `present-differs` | "`<files>` already exist in `<f>` and differ from the project's; the settings route never changes a file that exists." |
| `folder-failed` | as in `createCopies` step 2 |
| `write-failed` / `raced` | "`<relDst>` could not be written (<code>)" / "`<relDst>` landed outside `<f>/.ctoc`"; then "every file this call created was removed again" or the files that could not be removed |
| `internal` | as in the orchestration above |

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** Route `menu settings …` to the new module.
**Change Type:** modify-existing (one router line, and the module header's Usage block)

- **No top-level import** (decision S1-28).
- **Add** in `route`, inside `case 'menu':`, after the `args[1] === 'task'` branch (lines
  2804–2806):

  ```js
  // `menu settings <folder> [--create [--by <requester>]]` — a nested folder's settings
  // (src/lib/nested-settings.js): shown read-only, or its missing copies created where a
  // plan being built declares them. Never a setting's value. Required here, so no other
  // screen loads it.
  if (args[1] === 'settings') return require('./nested-settings').settingsRoute(args.slice(2), getProjectPath(projectPath));
  ```

- **Update** the header Usage block (lines 6–11) with one line: `node start.js menu settings
  {folder} [--create [--by {who}]] -> nested-settings.settingsRoute()`.
- No other line changes, and `taskTransition` is untouched, so this slice adds nothing to the
  merge conflict with local main (slice 2 names it).

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** The session can find and drive the route.

- Add one row to the Navigation Commands table, after the `tasks · task {id}` row (line 40):
  `| \`menu settings {folder}\` · \`menu settings {folder} --create [--by {who}]\` | A nested
  folder's CTOC settings, shown read-only; \`--create\` creates the missing copies of the
  project's own settings and active profiles (never a value, never over a file) only where a
  plan being built declares the folder's settings file. Run it from the checkout the build
  works in; it never needs a hand edit of a protected file |`.
- No `node -e` program or `node <script>` line is added. The recipe-execution fence
  (`.ctoc/recipe-coverage.json`) therefore sees no new recipe.

#### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY
**Purpose:** The protection's documentation names every legitimate writer of the settings file.

- In "The regulatory settings" paragraph, lines 257–260, the sentence "The menu's own routes
  write them: `start.js`, and the start.md recipes …" gains: ", and `menu settings <folder>
  --create`, which creates a nested folder's missing copies of the project's own settings and
  profiles, only where an approved plan being built declares that folder's settings file
  (`src/lib/nested-settings.js`)".
- In the "Refused when the call carries an `agent_id`" table (lines 358–369), add the row
  `| \`menu settings <folder> …\` | writes a nested folder's settings files; not on the
  background-agent list, so it is refused for a background agent only when those refusals are
  on, and today they are off |` (decision S1-19). The hook does not change; the row documents
  behaviour `subagentMayRunRoute` already has (scenario 1.6) and the switch at
  `protect-records.js` lines 597–606.

#### File: `tests/cache-freshness.test.js`
**Action:** MODIFY
**Purpose:** The CF1 guard (lines 480–742) flags any `src/lib` file holding a mutating
`safeFs` call together with a count-relevant path token (lines 485–490). The new module holds
`safeFs.writeFileSync(` and `safeFs.unlinkSync(` and the literals `'in-progress'` and `'todo'`
(the stage tests), so the guard flags it. It writes no counted file. The documented answer is a
justified whitelist entry, never a loosened detector (lines 476–478).

- Add to `WHITELIST` (after the `gate-migration.js` entry, line 610):

  ```js
  // The nested-settings route writes ONLY <folder>/.ctoc/settings.yaml, <folder>/.ctoc/settings.json,
  // <folder>/.ctoc/regulatory-regimes/<name>.yaml (exclusive create; removed again only by the same
  // call on a failure) and appends .ctoc/logs/nested-settings.jsonl in this checkout and, when the
  // declaring plan was found there, in the main worktree. It never creates, deletes or moves a plan,
  // vision or inbox file; it is broad-flagged by its 'in-progress'/'todo' stage tests.
  ['nested-settings.js', 'writes only <folder>/.ctoc/settings.{yaml,json}, <folder>/.ctoc/regulatory-regimes/<name>.yaml and appends .ctoc/logs/nested-settings.jsonl; never a counted plan/vision/inbox file'],
  ```

- The whitelist-honesty case (lines 725–741) then proves the entry is flagged and does not bust
  the cache, so it cannot become dead weight.

#### Files: `CLAUDE.md`, `README.md`
**Action:** MODIFY (counts only)

The values below are this branch's (read in this worktree). The unpushed local `main` already
holds one more test file, so Step 15 sets each count from disk after the merge (decision S1-30).

| File | Line | From (this branch) | To (this branch) |
|---|---|---|---|
| `CLAUDE.md` | 61 | `574` | `575` |
| `CLAUDE.md` | 89 | `135` | `136` |
| `CLAUDE.md` | 94 | `574` | `575` |
| `README.md` | 1132 | `135 JS modules` | `136 JS modules` |
| `README.md` | 1145 | `574 test files` | `575 test files` |

`tests/readme-numbers.test.js` lines 314–323 and the doc-count tests derive both counts from
disk.

## Wiring — the live call sites

| New code | Live call site | Root it is reachable from |
|---|---|---|
| `nested-settings.settingsRoute` | `menu-screens.route`, `case 'menu'`, `args[1] === 'settings'` | `src/commands/start.js` `main()`, through `route(splitArgs, app.projectPath, …)` (line 953), which `/ctoc:start` runs (`start.md` line 9, and the new table row) |
| `parseArgs`, `checkFolder`, `findDeclaringPlan`, `mainWorktree`, `gitEnv`, `buildingTask`, `readCapped`, `planCopies`, `ensureFolder`, `createCopies`, `readOnlyScreen`, `requesterLabel`, `show` | intra-module, from `settingsRoute` | same |

Cases 7 and 7b drive the route through the real entry point as a child process, from the
claiming checkout and from a git worktree. Reachability is therefore shown by running it, not by
search.

## Test Plan

### Tests: `tests/nested-settings-route.test.js`
**Action:** CREATE
**Framework:** `node:test` (`describe`, `it`), `node:assert/strict`.

**Fixture contents, as exact JavaScript literals in the file (decision S1-15):**

- `SETTINGS_YAML = 'enforcement:\n  mode: soft\nregulatory_regime:\n  active_profiles: [acme-internal]\n'`
- `SETTINGS_YAML_NO_MODE = 'regulatory_regime:\n  active_profiles: [acme-internal]\n'`
- `SETTINGS_YAML_GDPR = 'enforcement:\n  mode: soft\nregulatory_regime:\n  active_profiles: [acme-internal, gdpr]\n'` (case 12f)
- `SETTINGS_YAML_GHOST = 'enforcement:\n  mode: soft\nregulatory_regime:\n  active_profiles: [acme-internal, ghost]\n'` (case 12g)
- `SETTINGS_YAML_DUP = 'enforcement:\n  mode: soft\nregulatory_regime:\n  active_profiles: [acme-internal, acme-internal]\n'` (case 12m)
- `SETTINGS_JSON = '{"workflow":{"enforcementMode":"soft"},"general":{"environment":"dev"}}\n'`
  (72 bytes)
- `JSON_SAME_LENGTH = '{"workflow":{"enforcementMode":"off" },"general":{"environment":"dev"}}\n'`
  (72 bytes: `"off" ` with its space is as long as `"soft"`; valid JSON; case 12l)
- `JSON_OFF = '{"workflow":{"enforcementMode":"off"}}\n'`
- `PROFILE_YAML = 'name: acme-internal\nrequired_controls:\n  - audit_hash_chain\n'`
- `STATE_YAML = 'session:\n  status: inactive\n  current_step: 0\n'`
- `PACKAGE_JSON = '{"name":"fixture","version":"1.0.0","main":"src/x.js","scripts":{"test":"node -e \\"process.exit(0)\\""}}\n'`
- `X_JS = 'module.exports = 1;\n'`
- `STEPS = ['TEST','PREPARE','IMPLEMENT','REVIEW','OPTIMIZE','SECURE','VERIFY','DOCUMENT','FINAL-REVIEW'].map((l, i) => '### Step ' + (i + 8) + ': ' + l + '\n- [x] done\n').join('\n')`
- `planText(slug, files, item) = '---\ntitle: "' + slug + '"\ntype: implementation\nfiles:\n' + files.map((f) => '  - "' + f + '"').join('\n') + '\n---\n\n# ' + slug + '\n\n## Acceptance\n\n' + item + '\n\n## Execution Plan\n\n' + STEPS`, with `item` defaulting to `'- [x] works'`.

**Shared helpers in the file:**

- `makeProject({ yaml = SETTINGS_YAML } = {})` makes `root =
  fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-nested-')))` and writes:
  - `.ctoc/settings.yaml` = `yaml`; `.ctoc/settings.json` = `SETTINGS_JSON`;
  - `.ctoc/regulatory-regimes/acme-internal.yaml` = `PROFILE_YAML`. The name is absent from the
    shipped folder (`.ctoc/regulatory-regimes/` lists 15 shipped profiles, none of them
    `acme-internal`), so a missing copy cannot pass on the shipped fallback;
  - `.ctoc/state/iron-loop.yaml` = `STATE_YAML`;
  - the eight `plans/` stage folders, each holding an empty `.gitkeep`;
  - `streams/alpha/.gitkeep`, `streams/beta/.gitkeep` (empty) and `src/x.js` = `X_JS`.

  It then asserts `require(START).verifySetup(root).ok === true` (`start.js` exports it, line
  1018), so a child-process run never calls `initProject` (`start.js` lines 621–626, 671–694,
  708–720: the settings file with an inline `active_profiles` value, the state file, the eight
  stage folders).
- `makeRepoWithWorktree({ plans = [] } = {})` → `{ root, wt }` is the fresh fixture of cases 7,
  7b and 16 (decision S1-41). `plans` is an array of `[stage, slug, files, opts]` tuples, each
  handed to `declare(root, stage, slug, files, opts)` before the commit; `opts` is `declare`'s
  own `{ approved, item }`, so case 7b passes `{ approved: false }` and the plan is committed
  without its approval record. The helper runs `makeProject()`, writes `package.json` =
  `PACKAGE_JSON`, declares the plans, runs `git init`, `git add -A`, `git commit` (with
  `GIT_COMMITTER_DATE=2020-01-01T00:00:00Z`), takes `wt =
  fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-nested-wt-')))`, a sibling
  temporary folder taken by its real path (on macOS the temporary folder's link `/var` resolves
  to `/private/var`, the form git and a child's working directory report), removes it, and runs
  `git(root, ['worktree', 'add', wt, '-b', 'builder-wt'])`. It makes no claim: each case claims
  after it returns. The worktree is cut from the commit, so a claim's uncommitted moves in
  `root` never reach it whichever comes first. Each of those cases calls it fresh, so no case
  sees another's plans or files.
- `declare(root, stage, slug, files, { approved = true, item } = {})` writes `planText` to
  `plans/<stage>/<slug>.md` and, when approved, mints the real approval record the way
  `tests/bash-gate-plan-coverage.test.js` lines 94–96 do: `ledger.writeEntry(
  ledger.slugFromPlanPath(p), { content, stage_from: 'implementation', stage_to: 'todo',
  approved_by: 'human' }, root)`.
- `ALPHA_GLOB = 'streams/*/.ctoc/settings.yaml'`; `declared(root)` is `declare(root,
  'in-progress', 'p-streams', [ALPHA_GLOB])`, the Given of cases 1, 3, 4, 11, 12 and 15.
- `snapshot(root)` walks the tree without following links and without entering `.git`. It
  records each entry's kind and, for a file, the sha256 of its bytes; for a link, its
  `readlinkSync` target. The result is compared with `deepEqual`.
- `menu(root, ...words)` is `ms.route(['menu', 'settings', ...words], root)`.
- `cleanEnv()` is a copy of `process.env` without any key matching `/^GIT_/i` (the module's own
  rule, decision S1-39); `git(cwd, args)` is
  `spawnSync('git', [...GIT_IDENTITY, ...args], { cwd, encoding: 'utf8', env: cleanEnv(),
  shell: false })`, asserting `status === 0`. `GIT_IDENTITY` follows
  `tests/helpers/hotfix-check-harness.js` lines 118–119.
- `stubSpawn(fn)` replaces `require('child_process').spawnSync` with `fn` and returns the
  restore function; every case that stubs it restores it in `afterEach`. `countSpawn()` is
  `stubSpawn` with a pass-through: it keeps the real function, records each call's `(cmd, args,
  opts)` in an array it returns, and calls the real `spawnSync` with the same arguments (case
  16).

**Symbolic links on Windows.**

- Folder links use `fs.symlinkSync(target, link, 'junction')`, as `tests/protect-records.test.js`
  line 105 does.
- File links use `'file'`. On `EPERM` under `process.platform === 'win32'` the case places a
  folder where the file should be. It then asserts the matching `…-not-file` refusal and writes
  a `t.diagnostic` naming the substitution. This is the documented environment property of
  `.ctoc/coverage-baseline.json` `measurementEnvironment`, and it is never a skip.

**Cases.** Each lists its Given, its act and what it asserts.

1. **1.1, a copy where a plan being built declares it.**
   - Given: `declared(root)`.
   - Act: `menu(root, 'streams/alpha', '--create', '--by', 'builder-7')`.
   - Asserts:
     - `ok === true`;
     - `streams/alpha/.ctoc/settings.yaml`, `settings.json` and
       `regulatory-regimes/acme-internal.yaml` each equal the project's bytes;
     - the text names all three created files and matches `/open the menu from inside
       `streams\/alpha`/`.
   - Then `--create` again: `reason === 'all-present'`, the text says the files already exist
     and are the same as the project's, the snapshot is unchanged, and the log holds exactly one
     line.
   - Then rewrite `streams/alpha/.ctoc/settings.json` to `'{"edited":true}\n'` and call
     `--create` again: `reason === 'present-differs'`, the text names
     `streams/alpha/.ctoc/settings.json`, both settings files keep their bytes, and the log
     still holds one line.
2. **1.2, showing without writing.**
   - Given: the case-1 folder after its first create, and `src/` with no `.ctoc`.
   - Act: `menu(root, 'streams/alpha')` and `menu(root, 'src')`, with snapshots taken before
     and after.
   - Asserts:
     - the snapshots are equal;
     - the first text marks both settings files and the profile "same as the project's", and
       names `soft`, `acme-internal`, the keys `enforcement` and `regulatory_regime`, the
       sentence "is its own CTOC project root" and the change sentence;
     - after rewriting the folder's `settings.json` to `'{"edited":true}\n'`, it marks that file
       "differs from the project's";
     - the second says `src` has no CTOC settings of its own and "CTOC resolves it to the
       project root", and its `actions['Create its settings'] === 'menu settings src
       --create'`.
3. **1.3, refusals by folder rule, never the not-declared sentence.**
   - Given: `declared(root)` (its glob also covers `streams/out`), plus these fixtures:
     - `streams/out` → a junction to a folder outside the project;
     - `streams/inlink` → a junction to `src`;
     - `streams/gone` → a junction to a folder that is then removed (a dangling folder link);
     - `streams/linked/.ctoc` → a junction;
     - `streams/dangle/.ctoc/settings.yaml` → a file link to a missing path;
     - `streams/outfile/.ctoc/settings.json` → a file link to a file outside;
     - `streams/regs/.ctoc/regulatory-regimes` → a junction;
     - `streams/regfile/.ctoc/regulatory-regimes`, a regular file;
     - `streams/setdir/.ctoc/settings.yaml`, a folder;
     - `streams/ctocfile/.ctoc`, a regular file.
   - Act and assert: for each of the following, `reason` equals the expected code:
     - `..`, `streams/../..` → `parent-segment`;
     - `path.join(root, 'streams', 'alpha')`, `'C:/x'`, `'\\\\server\\share'` → `absolute`;
     - `streams/out` → `link`, and the text says it leads outside;
     - `streams/gone` → `link`, and the text says it leads outside;
     - `streams/inlink` → `link`, without "outside";
     - `.` → `root`;
     - `.ctoc/approvals`, `streams/alpha/.git`, `streams/alpha/.CTOC` → `ctoc-or-git`;
     - `streams/alpha.`, `streams/alpha `, `streams/alpha:x` → `name-alias`;
     - `Streams/alpha` → `name-alias` when `fs.existsSync(path.join(root, 'Streams'))` (a
       case-insensitive disk), else `missing`;
     - `streams/nope` → `missing`;
     - `src/x.js` → `not-a-folder`;
     - `streams/linked` → `ctoc-link`;
     - `streams/ctocfile` → `ctoc-not-folder`;
     - `streams/dangle`, `streams/outfile` → `settings-link`;
     - `streams/setdir` → `settings-not-file`;
     - `streams/regs` → `profiles-link`;
     - `streams/regfile` → `profiles-not-folder`;
     - `streams/alpha --set agents.maxParallelAgents=2` → `flag`, and the text names `--create`
       and `--by`.
   - Also asserts: no text matches `/No plan being built/`; the snapshot is equal before and
     after the whole list; `.ctoc/logs/nested-settings.jsonl` is absent.
4. **1.4, the log.**
   - Given: `declared(root)`.
   - Act:
     - case 1's create;
     - `menu(root, 'streams/beta', '--create')`;
     - a refused call and an all-present call;
     - a folder `streams/gamma2` (made in this case, with `.gitkeep`), created with `--by` set to
       `'a\nb\x1b[2J' + 'x'.repeat(100)`;
     - a folder `streams/delta` (made the same way), created with `--by` set to `'\x07\x1b'`.
   - Asserts: the log holds exactly four JSON lines.
     - Each has `at` (an ISO string), `folder`, `created`, `declaringPlan:
       'in-progress/p-streams'`, `declaredIn: 'this checkout'` and `writer: 'the menu'`, and
       none has `writtenIn`.
     - The requesters are `builder-7 (declared, not verified)`, `not declared`, a value with no
       character below `0x20`, at most 80 characters before the suffix, and `not declared` (the
       `--by` that was empty after stripping).
     - That cleaned value appears in the create's text.
5. **1.5, the folder resolves as its own root with the repository's regime.**
   - Given: a plan in `in-progress`, approved, declaring only `streams/alpha/.ctoc/settings.json`.
   - Act: `--create`, then `describeProjectRoot(path.join(root, 'streams', 'alpha', 'deep'))`
     after `mkdir deep`, then `menu(root, 'streams/alpha/deep')`.
   - Asserts:
     - the root is `streams/alpha`;
     - both settings files were created, and the profile was copied byte for byte;
     - `resolveEnforcementMode(nested).mode === resolveEnforcementMode(root).mode`;
     - `loadActiveProfiles(nested).profiles` deep-equals the root's;
     - `unloadableProfiles(nested)` is `[]`;
     - the read-only text for `streams/alpha/deep` says "CTOC resolves it to `streams/alpha`".
6. **1.6, the write protection is unchanged.** The real hook runs as a child process with real
   payloads (the shape of `tests/protect-records.test.js` lines 44–78).
   - Asserts:
     - Write `streams/alpha/.ctoc/settings.yaml` gives exit 2 and stderr exactly the settings
       sentence (`protect-records.js` lines 125–127, copied as a literal like
       `protect-records.test.js` line 24);
     - Write `.ctoc/approvals/x.json` and Write `.ctoc/state/verify/x.json` give exit 2 and the
       record sentence (lines 642–643, outside the switch at line 597).
   - Then the hook's own function, without editing the hook:
     - `m = new Module(HOOK, module); m.filename = HOOK; m.paths =
       Module._nodeModulePaths(path.dirname(HOOK)); m._compile(fs.readFileSync(HOOK, 'utf8') +
       '\nmodule.exports = { subagentMayRunRoute };\n', HOOK)`. This is the same compile
       `require` performs. `require.main !== m`, so `main()` does not run.
     - Assert `subagentMayRunRoute` returns `false` for `['menu','settings','streams/alpha']`,
       `['menu','settings','streams/alpha','--create','--by','builder-7']`,
       `['menu','task','sweep']` and `['menu','task','sweep','--confirm','none']`.
     - Control, so the function is not vacuously false: `true` for `['menu','task','list']`.
7. **1.7, a plan that needs the file can finish, from the claiming checkout and from a git
   worktree; its plan in `in-progress/`.**
   - Given: `makeRepoWithWorktree({ plans: [['todo', 'p17',
     ['streams/alpha/.ctoc/settings.yaml'], { item: '- [ ] `streams/alpha/.ctoc/settings.yaml`
     exists' }]] })`, so `p17` is approved and committed.
   - Its claim is the menu's real claim: `r = actions.startAgent(root)` gives `started: true`,
     and `id = r.task.id` (decision S1-25). The plan is in `in-progress` in this checkout only;
     in the worktree it is in `todo/`.
   - From the worktree:
     - the real hook, with `{ tool_name: 'Bash', agent_id: 'a1b2c3', cwd: wt, tool_input: {
       command: 'node "<REPO>/src/commands/start.js" menu settings streams/alpha --create --by
       builder-7' } }`, exits 0 with empty stdout (background-agent menu refusals are off,
       decision S1-19);
     - `execFileSync(process.execPath, [MENU, 'menu', 'settings', 'streams/alpha', '--create',
       '--by', 'builder-7'], { cwd: wt, env: cleanEnv() })` gives `ok: true`;
     - `wt/streams/alpha/.ctoc/settings.yaml` equals the worktree's own `.ctoc/settings.yaml`;
     - `root/streams/alpha/.ctoc` is absent;
     - the worktree's log line names `in-progress/p17` and `declaredIn: 'the main worktree'`;
     - the main worktree's own `.ctoc/logs/nested-settings.jsonl` holds the same line plus
       `writtenIn` equal to `path.relative(root, wt)` with `/` separators.
   - From the claiming checkout: the same command with `cwd: root` creates
     `root/streams/alpha/.ctoc/settings.yaml`, and its log line says `this checkout`.
   - Finish: tick the item in `plans/in-progress/p17.md`, then `ms.route(['menu', 'task',
     'complete', id], root)` gives `ok: true`. The plan is in `plans/review/`, and
     `.ctoc/state/verify/p17.json` exists.
   - The same background-agent payload, with the folder argument
     `streams/alpha/.ctoc/settings.yaml`, gives exit 2 with the settings sentence.
     `menu(root, 'streams/alpha/.ctoc/settings.yaml', '--create')` gives `reason ===
     'ctoc-or-git'`, and the snapshot is unchanged.
   - Cleanup in `after`: `git(root, ['worktree', 'remove', '--force', wt])`, then
     `fs.rmSync(wt, { recursive: true, force: true })` and the same for `root`.
7b. **1.7 with the plan still in `todo/`: a build launched through the promote list
   (decision S1-9).**
   - Given: `makeRepoWithWorktree({ plans: [['todo', 'p17b',
     ['streams/alpha/.ctoc/settings.yaml'], { approved: false }]] })`: its only plan, committed
     without an approval record (it is minted below); no `p17`.
   - Its claim is the way `start.md` lines 118–119 and 130 do it, as children of the real menu
     with `cwd: root`: `menu task add implement p17b --touches
     streams/alpha/.ctoc/settings.yaml` gives a `taskId`; then `menu task start <taskId>
     --agent-id a1b2c3` gives `status: 'running'`. `plans/todo/p17b.md` is still there.
   - From the claiming checkout: `--create` on `streams/alpha` gives `ok: true`; the log line
     says `declaringPlan: 'todo/p17b'`, `declaredIn: 'this checkout'`, `buildingTask: <taskId>`.
   - From the worktree (its own registry is empty): `--create` gives `ok: true`; the log line
     says `declaredIn: 'the main worktree'` and the same `buildingTask`; the main worktree's log
     holds it with `writtenIn`.
   - The approval record is still required: `p17b` is written and committed **without** its
     approval record, and the first `--create` from the claiming checkout, after the claim,
     gives `not-declared` and writes nothing. Its record is then minted with `declare`'s
     `ledger.writeEntry` call in `root`, and the steps above run.
8. **1.8, undeclared means refused.**
   - Given:
     - a plan in `todo/`, approved, declaring `streams/alpha/.ctoc/settings.yaml`, with a
       **queued** implement task naming it (`menu task add implement <slug> --touches …`, never
       started);
     - a plan in `todo/`, approved, declaring `streams/zeta/.ctoc/settings.yaml`, with a running
       implement task for another plan only;
     - a plan in `in-progress/` without an approval record, declaring `src/.ctoc/settings.yaml`;
     - a plan in `in-progress/`, approved, declaring `streams/beta/.ctoc/settings.yaml` and
       `**/.ctoc/settings.yaml`, with no `unanchored_scope`;
     - `streams/gamma/.ctoc/` holding both files; `streams/zeta/.gitkeep`.
   - Act: `--create` on `streams/alpha` (no `--by`), on `streams/zeta`, on `src` with `--by
     builder-7`, and on `streams/gamma`.
   - Asserts:
     - each `reason === 'not-declared'`, and its text names its folder;
     - the `streams/alpha` text (the queued task, the real project's measured situation,
       decision S1-34) holds "counts once its build task is started" and `menu task start`;
     - the snapshot is unchanged;
     - no log file exists;
     - `menu(root, 'src')` still says `src` is not a CTOC project root.
9. **The worktree lookup cannot answer.** Given `<root>/.git` is a file holding
   `gitdir: <root>/nowhere` and no declaring plan in this checkout, `--create` gives `reason ===
   'not-declared'`. The text holds "and in its repository's main worktree", and nothing is
   written.
10. **Argument faults.** Each of the following gives its reason, and the snapshot is unchanged:
    - `menu(root)` → `no-folder`;
    - `menu(root, 'streams/alpha', 'x')` → `extra-word`;
    - `menu(root, 'streams/alpha', '--by', 'me')` → `by-without-create`;
    - `menu(root, 'streams/alpha', '--create', '--by')` → `by-missing`;
    - `menu(root, 'streams/alpha', '--create', '--by', '--create')` → `by-missing`;
    - `menu(root, 'streams/alpha', '--create', '--create')` → `flag`;
    - `menu(root, 'streams/alpha', '--create', '--by', 'a', '--by', 'b')` → `flag`;
    - `menu(root, 'streams/alpha', '-' + 'x'.repeat(300))` → `flag`, and the text holds at most
      120 of the `x`;
    - `menu(root, 'a\x07b')` → `control-character`;
    - `menu(root, 'streams\\alpha')`, read-only → accepted as `streams/alpha`;
    - `menu(root, '\\streams\\alpha')` → `absolute`.
11. **File faults, injected on the `safe-fs` exports object** and restored in `afterEach`, for
    the coverage floor of 99 (`.ctoc/coverage-baseline.json`). Given: `declared(root)`.
    - (a) `lstatSync` throws `EACCES` for `streams/alpha` → `unreadable`, the text holding
      `EACCES` and no `/`-path but the folder's.
    - (b) `mkdirSync` throws `EACCES` for `<alpha>/.ctoc` → `folder-failed`, nothing created,
      no log.
    - (c) `mkdirSync` really creates `<alpha>/.ctoc` and then throws `EEXIST`, a race → the files
      are created.
    - (d) `mkdirSync` writes a regular file at `<alpha>/.ctoc/regulatory-regimes` and throws
      `EEXIST` → `folder-failed` (EEXIST), the text naming the empty `.ctoc` folder left.
    - (e) `writeFileSync` throws `EEXIST` on `settings.json` (written last) →
      `reason === 'write-failed'`; no file remains under `streams/alpha/.ctoc`; the text names
      the failure, the removed profile and `settings.yaml`, and the two empty folders left; the
      log line has `created` holding the profile and the yaml, `failed`, and `removed` holding
      both.
    - (f) as (e), and `unlinkSync` throws `EPERM` on the yaml → the text and `notRemoved` name
      it.
    - (g) `realpathSync` returns a path outside the folder for the created profile → `raced`; the
      profile is removed; the log line has `failed`.
    - (h) `durableLog.appendEntry` throws `EIO` → `ok: true`, files created, and the text says
      the write log could not be updated (EIO).
    - (i) `readdirSync` throws `EACCES` on `streams` → `unreadable`.
    - (j) `realpathSync` throws `EACCES` on the root → `unreadable`.
    - (k) `regime.loadActiveProfiles` throws → `regime-unreadable`, nothing written.
    - (l) `regime.loadProfile` throws → `regime-unreadable`, nothing written.
    - (m) `lstatSync` throws `EACCES` on the folder's `.ctoc`, then on its `settings.json`,
      then on a profile `dst` → each `unreadable`.
    - (n) `readFileSync` throws `EIO` reading the folder's present `settings.yaml` of equal size
      → `unreadable`.
    - (o) The `internal` arm: `projectRoot.describeProjectRoot` stubbed to throw
      `Object.assign(new Error('/secret/path'), { code: 'EBOOM' })` (its contract says it never
      throws, `project-root.js` line 24, so this is a genuinely unexpected fault) on a read-only
      call → `reason === 'internal'`, the text holding "unexpected fault" and `EBOOM` and not
      `/secret/path`, and the snapshot unchanged.
    - (p) `regime.loadActiveProfiles` throws `EIO` on its first call (the read-only file list)
      → `ok: true`, the text holding "the project's active profiles could not be read (EIO)".
    - (q) The source re-check (decision S1-38): `regime.loadActiveProfiles` wrapped so it calls
      the real function and then rewrites `<root>/.ctoc/settings.yaml` to `SETTINGS_YAML_GDPR`
      → `reason === 'source-changed'`, `streams/alpha/.ctoc` absent, no log.
    - (r) The same re-check when its read fails: `regime.loadActiveProfiles` wrapped to call the
      real function and, after it returns, arm a fault, so the next `safeFs.readFileSync` of
      `<root>/.ctoc/settings.yaml` throws `EIO` (armed only then, because
      `loadActiveProfiles` reads that file through the same `safeFs`,
      `regulatory-regime.js` line 193) → `source-changed`, nothing written, no log.
12. **Copy-set edges.** Given: `declared(root)`.
    - (a) The project has no `.ctoc/settings.json` → only the profile and the yaml are created,
      with the note.
    - (b) The project has no `.ctoc/settings.yaml` (in-process only) → `no-source`, nothing
      written.
    - (c) The project's own `.ctoc/settings.json` is a file link → `source-link`, nothing
      written.
    - (d) The project's own `.ctoc/settings.yaml` is a folder → `source-not-file`.
    - (e) The project's own `settings.json` is 1 MiB + 1 byte → `too-large`.
    - (f) `makeProject({ yaml: SETTINGS_YAML_GDPR })`: an active shipped profile, `gdpr`,
      alongside `acme-internal` → only `acme-internal` is copied, with the note that the folder
      reads `gdpr` from the shipped profiles like the project.
    - (g) `makeProject({ yaml: SETTINGS_YAML_GHOST })`: an active profile `ghost` neither the
      project nor CTOC holds → skipped with the note "cannot be loaded by the project either".
    - (h) The project's own `regulatory-regimes/acme-internal.yaml` is a file link →
      `source-link`, nothing written.
    - (i) `streams/alpha/.ctoc/regulatory-regimes/acme-internal.yaml` is a file link →
      `profile-link`; a folder → `profile-not-file`; nothing written.
    - (j) **Pre-planted settings (decision S1-17).** `makeProject({ yaml: SETTINGS_YAML_NO_MODE
      })`, `declared(root)`, and `streams/alpha/.ctoc/settings.json` = `JSON_OFF` → `reason ===
      'present-differs'` naming that file; `streams/alpha/.ctoc/settings.yaml` absent; the
      snapshot unchanged; no log.
    - (k) The same with `streams/alpha/.ctoc/regulatory-regimes/acme-internal.yaml` holding
      `'name: acme-internal\nrequired_controls: []\n'` → `present-differs` naming it.
    - (l) **Equal size, different bytes (decision S1-35).** `streams/alpha/.ctoc/settings.json` =
      `JSON_SAME_LENGTH`. The case first asserts `Buffer.byteLength(JSON_SAME_LENGTH) ===
      Buffer.byteLength(SETTINGS_JSON)` (72), so a later edit of either literal cannot send it
      down the different-size path. Then `--create` → `reason === 'present-differs'` naming that
      file; `streams/alpha/.ctoc/settings.yaml` absent; the snapshot unchanged; no log.
    - (m) **A profile listed twice (decision S1-36).** `makeProject({ yaml: SETTINGS_YAML_DUP
      })`: `--create` → `ok: true`; the log line's `created` names
      `streams/alpha/.ctoc/regulatory-regimes/acme-internal.yaml` exactly once, and the file
      equals `PROFILE_YAML`. Then `menu(root, 'streams/alpha')` lists that profile file on
      exactly one line.
13. **Read-only edges.**
    - The folder's `settings.json` is `'not json'` → "could not be read as JSON".
    - It is `'[1]'` → "is not a JSON object".
    - `regime.unloadableProfiles` throws `Object.assign(new Error('/secret/path'), { code: 'EIO'
      })` → "could not be read (EIO)", and the text does not hold `/secret/path`.
    - `regime.loadActiveProfiles` throws on its second call (the folder's resolved root) → the
      same line.
    - A folder holding its own `.git` folder and no `.ctoc` → "is a project root by its own
      `.git`".
    - `projectRoot.describeProjectRoot` stubbed to return `{ root: abs, marker: 'fallback' }`
      (it reports `fallback` only on a fault, `project-root.js` lines 24, 43–47) → "CTOC could
      not find a project root".
14. **The git arms (decision S1-14), from a fixture whose `<root>/.git` is a file**, each with
    `stubSpawn`, and no declaring plan in this checkout but one in the stubbed main worktree
    (a second `makeProject()` with `declared(main)` and a real `.git` folder, `git init`):
    - `spawnSync` returns `{ error: new Error('spawn git ENOENT') }` → `not-declared`;
    - `{ status: 128, stdout: '' }` → `not-declared`;
    - the first block holds `bare` → `not-declared`;
    - the first field does not start with `worktree ` → `not-declared`;
    - `rev-parse` fails → `not-declared`;
    - `rev-parse` prints a different repository's `.git` → `not-declared`;
    - the main path's `.git` is a file → `not-declared`;
    - the list names `main` and `rev-parse` prints `main/.git` relative to the root (`path.relative`)
      → `ok: true`, `declaredIn: 'the main worktree'` (the relative-path arm);
    - **the log-entry fault (decision S1-40):** the same relative-path arm, with
      `durableLog.appendEntry` wrapped to pass through and, after its first call (this
      checkout's log, which step 5 appends first), arm `safeFs.realpathSync` to throw `EIO` when
      its argument equals `main` itself. Armed only then, because `findCoveringPlan` resolves
      `main` during the lookup (`plan-coverage.js` line 506 calls `escapesRoot`, whose
      `resolveBasis` runs `safeFs.realpathSync(path.resolve(root))`,
      `real-path-confinement.js` lines 247 and 188); after the
      first append only the building of `writtenIn` meets it → `ok: true`; the created files stay; the
      text says "the main worktree's write log could not be updated (EIO)"; this checkout's log
      holds its line; the main worktree's log is absent;
    - every stub asserts it received `shell: false` and an `env` with no key matching
      `/^GIT_/i`.
15. **Names that cannot be offered as a command (decision S1-18).** Given folders `streams/a b`
    and `streams/x;y` (each with `.gitkeep`) and `declared(root)`:
    - `menu(root, 'streams/a b')` and `menu(root, 'streams/x;y')`: `actions` has no `Create its
      settings`, and the text holds "cannot be offered as a command";
    - `menu(root, 'streams/a b', '--create')` gives `ok: true` (a create is not an offered
      command);
    - **a leading dash (decision S1-42):** a folder `-lead` (with `.gitkeep`) at the project
      root. `menu(root, '-lead')` gives `reason === 'flag'` (its bare name is read as a flag).
      `menu(root, './-lead')` normalises to `-lead` and gives `ok: true`, `actions` has no
      `Create its settings`, and the text holds "cannot be offered as a command".
16. **Git's own environment cannot redirect the lookup (decisions S1-10 and S1-33).**
    - Given: `{ root, wt } = makeRepoWithWorktree({ plans: [] })`, and only then
      `declare(root, 'in-progress', 'p16', ['streams/beta/.ctoc/settings.yaml'])`. The plan and
      its approval record therefore exist in the main worktree only, never in the worktree's
      commit (approval records travel by name and content hash, `approval-residency.js` lines
      160–183, so a committed record would let the worktree's own match win first,
      `plan-coverage.js` lines 518–627, and git would never run). A third repository `other`
      (`git init`, empty).
    - Act: `calls = countSpawn()`; with `process.env.GIT_DIR = path.join(other, '.git')` and
      `process.env.GIT_WORK_TREE = other` set, an in-process `menu(wt, 'streams/beta',
      '--create')`.
    - Asserts:
      - `ok: true` and `declaredIn: 'the main worktree'`, and `wt/streams/beta/.ctoc/settings.yaml`
        exists;
      - the real git ran: `calls.length === 2`, `calls[0].args[0] === 'worktree'` and
        `calls[1].args[0] === 'rev-parse'`;
      - each call had `opts.shell === false` and an `opts.env` with no key matching `/^GIT_/i`.
    - Both variables and `spawnSync` are restored in `finally`.

**Coverage target:** 100% of `src/lib/nested-settings.js` reachable lines, measured by `npm test`.
**Independence:** every case makes its own temporary project and restores every injected
function, stub and environment variable in `afterEach` or `finally`.

### Security Review

- [x] **Path traversal.** These are refused before any join:
  - `..` in any segment, absolute paths, drive letters and UNC prefixes, with `\` read as `/`
    first;
  - `.ctoc` and `.git` segments in any letter case;
  - a segment holding `:` or ending in a dot or a space, and a segment the disk lists under
    another spelling;
  - every symbolic link on the folder's path, on `.ctoc`, on the settings files, on the profile
    folder and on each profile target (`lstat`, never `stat`), and every linked source file.

  Exclusive create (`wx`) guards each file, not the folders above it. A folder swapped for a
  link between the checks and the write is caught after the write by comparing the created
  file's real path with the expected one; the file is then removed and the call refused
  (`raced`). The source files are read only when `lstat` shows a regular file.
- [x] **Input validation.**
  - Every word passes its own parser, which never touches `parseTaskArgs`, the hook's reader.
    A repeated flag is refused.
  - `--by` is control-stripped and capped at 80.
  - Every interpolated value in a screen sentence is stripped and capped at 120.
  - A folder name enters an offered action only when every segment matches
    `/^[A-Za-z0-9._-]+$/`.
- [x] **No secrets.** The log names files and never contents. The read-only screen shows key
  names and never values.
- [x] **Safe file operations.** It writes only the following:
  - `<folder>/.ctoc/settings.yaml` and `<folder>/.ctoc/settings.json`;
  - `<folder>/.ctoc/regulatory-regimes/<name>.yaml`;
  - `<root>/.ctoc/logs/nested-settings.jsonl`, and the same file in the main worktree when the
    declaring plan was found there;

  plus the two folders `ensureFolder` makes, and it removes only files the same call created.
  The two logs are appended through `durable-log.appendEntry`, which creates `.ctoc/logs` with
  a recursive mkdir and follows a link at that folder or file (lines 207–228). That path is not
  checked by this route: an agent able to plant that link can already write any file through
  the shell (adversary A2 below), and an agent using only the menu's routes cannot plant one.
- [x] **Error messages.** Only error codes and project-relative paths. Never an absolute path
  (the `absolute` refusal echoes the caller's own word, stripped and capped), never an error
  message, never a stack.
- [x] **Prototype pollution.** Settings JSON is parsed only to list `Object.keys`. Nothing is
  merged.
- [x] **Command injection.** Both git calls are `spawnSync('git', [fixed words], { shell: false
  })` and take no caller text. Their environment holds no variable matching `/^GIT_/i`.
- [x] **Authority.**
  - The route writes only where `findCoveringPlan`, the same oracle the edit hook trusts, finds
    an approved plan declaring the file, in `plans/in-progress/`, or in `plans/todo/` with a
    running build of it in that checkout's task registry. That plan is in this checkout, or in
    the repository's main worktree when the call comes from a linked worktree.
  - A plan an agent writes into `plans/in-progress/` or `plans/todo/` grants nothing without its
    approval record (`plan-coverage.js` lines 27–46, 590–591).
  - **Residual, accepted by the owner's switch (decisions S1-19 and S1-43, threat model TM-02).**
    The approval record that makes a plan declare the folder's settings file (the parent's
    decision 32) can be forged today through two channels: through the shell, because the record
    refusals are off by the owner's 15 October 2026 switch (`RECORD_REFUSALS_OFF`,
    `protect-records.js` lines 597–606), and through an editing tool, because
    `protect-records.js` line 643 and `PreToolUse.Edit.js` compare folder names as text while
    macOS's file system folds letters: a Write to `.ctoc/approvalſ/<slug>.json` (long s) or
    `.ctoc/ﬆate/verify/…` (the 'st' ligature) lands in the protected folder (security scan of
    2026-10-18, reproduced on origin/main). Until the fix 'the write protection compares real
    files, not spellings' (commit 0fada89c) ships, decision 32's authority is a residual, not a
    hard control: an agent holding only editing tools, with no shell, can forge a declaration and
    so have this route create a nested folder's settings. `hooks/hooks.json` lines 4–10 register
    only `protect-records.js`, so the Bash-channel deny `approval-ledger.js` lines 43–49 describes does not run. Even with it on,
    a script file can write the record (`protect-records.js` lines 84–91). The route adds no new
    write capability; what it adds is laundering by log: a forged plan's create is logged as the
    menu's write.
  - **Builder self-service depends on the same switch (TM-09).** A background agent's own call
    (case 7) works while background-agent menu refusals are off. If the owner turns them back
    on, the route is refused for background agents (case 6), and the coordinating session runs
    it.
  - **The log is not tamper-evident (TM-14).** Any agent with a shell can edit or delete it. The
    main worktree's copy makes a worktree's write visible where the claim was made, nothing more.
    `init-project.js` lines 839–849 add `.ctoc/logs/` to `.gitignore` only when a `.gitignore`
    exists, so in a project without one the log can be committed.

### Trust boundaries and adversaries

**Boundaries** (decision S1-19, threat model TM-10):

| Boundary | What crosses it | What this route trusts and checks |
|---|---|---|
| agent or session → menu process | the words after `menu settings` | nothing: every word is parsed, stripped, capped and checked against the folder rules |
| agent-writable stores → the decision | `.ctoc/state/tasks.json`, plan files, approval records, a worktree's `.git` file | plan files and approval records through `findCoveringPlan` (approval required); `tasks.json` only as the building witness for a `todo` plan, which is no control (any session or agent can record and start a build through `menu task add` and `menu task start`); the `.git` file only as "this is a linked worktree", after which git, not the file, names the main worktree |
| menu → git | the working directory and the environment | fixed arguments, no shell, every variable matching `/^GIT_/i` removed; the answer accepted only when the main worktree's `.git` folder is git's common folder |
| screen action → the session's next shell call | the offered `menu settings <rel> --create` | offered only when every segment matches `/^[A-Za-z0-9._-]+$/` |
| linked worktree → main worktree | the main worktree's plans, approval records, task registry and log | read as above; the only write is one appended log line |

**Adversaries.**

- **A1, a misdirected or prompt-injected agent using the menu's own routes.** Stopped by: the
  folder rules (no `.ctoc`, `.git`, link, alias or outside path), the declaration with an
  approval record, the exclusive create and the `present-differs` refusal (it can neither
  overwrite nor pre-weaken through the route), and, when the owner turns them on, the
  background-agent refusals. With those refusals off, A1 can create copies only where an
  approved plan declares them, and only as byte copies of the project's own settings. "Being
  built" is no barrier to A1 for a plan in `todo/`: `menu task add …` and `menu task start <id>
  --agent-id …` are on the background-agent allowed list (`docs/ENFORCEMENT.md` line 374), so A1
  can make any approved `todo` plan "being built". Against A1 the controls that hold are the
  approval record and the plan's declaration.
- **A2, an agent writing files through Bash.** Not stopped by this route: it can forge a plan,
  an approval record (while the owner's switch keeps record refusals off) or a running task in
  `tasks.json`, plant a link at the log, or write the settings file through a script file the
  hook cannot read (`protect-records.js` lines 84–91), or change the project's `settings.yaml`
  and change it back between the route's reads, past the re-check of decision S1-38. The route
  only makes A2 more visible: a
  create through a forged declaration is logged with the declaring plan and building task it
  relied on, in this checkout and, for a worktree, in the main worktree.
- **A3, an agent holding only editing tools:** forges an approval record through a folded
  spelling (residual above, until the fix ships); the route logs the create with the forged
  declaring plan, nothing more.

### Architecture checks

- The dependency direction is `lib` to `lib`. The new module requires nothing from `hooks/` or
  `commands/` (`hotfix-check.js`, which requires `../hooks/guard-files`, is not required).
- Single responsibility: one route.
- Open/closed: `plan-coverage.js` (protected), `task-registry.js`, `durable-log.js`,
  `regulatory-regime.js`, `enforcement-mode.js` and `project-root.js` are called, not edited.
- Cross-platform:
  - paths go through `path.join`, and input through `\` → `/` and `path.posix.normalize`;
  - git is called with an argument list and `windowsHide`;
  - names Windows reads as another name (`:`, a trailing dot or space, a short name) are
    refused;
  - folder links are junctions in the tests.

## Acceptance Criteria Mapping

| Criterion | Implemented in | Test case |
|---|---|---|
| 1.1 create as a copy, second call writes nothing | `planCopies`, `createCopies` | 1 |
| 1.2 show without writing | `readOnlyScreen` | 2, 13 |
| 1.3 refusals by folder rule; `--set` refused; links on every target | `parseArgs`, `checkFolder`, `planCopies` | 3, 10, 12c, 12h, 12i |
| 1.4 every write logged with who asked | `createCopies` step 5, `requesterLabel` | 4, 11e, 11h |
| 1.5 the folder resolves as its own root with the same regime | profile copy in `planCopies` | 5 |
| 1.6 write protection unchanged | no hook edit | 6 |
| 1.7 the plan can finish; the background agent's call gets through | `findDeclaringPlan` (both checkouts, both stages), the router | 7, 7b |
| 1.8 undeclared means refused | `findDeclaringPlan`, `buildingTask`, check order | 8, 9 |
| Decision 30 (never overwrite, all-present writes nothing) | `createCopies` step 1, `wx` | 1, 11e |
| Decision S1-17 (a pre-planted differing file refuses) | `planCopies` presence | 1, 12j, 12k, 12l |
| Decisions S1-36 and S1-38 (duplicate names, the source re-check) | `planCopies`, `readOnlyScreen` | 11q, 11r, 12m |
| Decision S1-40 (a log-entry fault keeps the files) | `createCopies` step 5 | 11h, 14 |
| Decision S1-42 (a leading dash is never offered) | `readOnlyScreen` options | 15 |
| Gate critic input 1 (worktree) | `findDeclaringPlan`, `mainWorktree`, `gitEnv` | 7, 7b, 9, 14, 16 |
| Gate critic input 2 (links on copied files) | `checkFolder` 7–9, `planCopies`, `wx`, the real-path check | 3, 11g, 12c, 12h, 12i |

## Risk Mitigations

| Risk | Mitigation | Where |
|---|---|---|
| A covering glob plants settings where they must not go | Folder rules run before the declaration (decision 34) | `checkFolder`, case 3 |
| A link redirects the write | `lstat` on every segment and target, `wx`, and the real-path check after each write | `checkFolder`, `planCopies`, `createCopies`, cases 3, 11g |
| A pre-planted file weakens the new root | A present file that differs refuses the whole call | `planCopies`, cases 12j, 12k |
| The git lookup reads the wrong repository | Only from a linked worktree; no variable matching `/^GIT_/i`; the main worktree's `.git` must be git's common folder; any fault means no plan | `mainWorktree`, cases 9, 14, 16 |
| A build launched through the promote list is refused | A `todo` plan counts with a running build in that checkout's registry | `buildingTask`, case 7b |
| A builder calls the route before `menu task start` (the real project's measured state: its build task is queued) | It gets `not-declared`, and that refusal's sentence says a `todo` plan counts once its build task is started and to retry then (decision S1-34) | refusal table, case 8 |
| The settings file changes between the copied read and the profile-name read | The yaml is read again after `loadActiveProfiles` and must equal the copied bytes; else `source-changed`, nothing written | `planCopies`, cases 11q, 11r |
| A profile listed twice rolls back the whole create | Duplicate names removed before the loop | `planCopies`, `readOnlyScreen`, case 12m |
| A half-written copy stays | Profiles first, then the settings; on a failure every file this call created is removed, and what could not be removed is named | `createCopies`, cases 11e, 11f |
| The CF1 cache guard flags the module | Justified whitelist entry, never a looser detector | `tests/cache-freshness.test.js` |
| The nested folder becomes its own root and later drifts from the repository | Stated on the read-only screen and in the create answer (the change sentence); drift is out of scope (parent plan, "Not in this plan") | `readOnlyScreen`, `createCopies` |

## Decisions Taken Under Ambiguity

- **S1-1. Six own files, over the ~1–3 budget.** The owner's brief fixes exactly one slice per
  story.
  - The module and its test are the work.
  - The router line wires it.
  - The cache-guard entry is forced by a fence.
  - The two doc lines keep the protection's documentation true.

  Splitting would create a slice with no live entry point.
- **S1-2. A linked worktree also reads the main worktree's plans** (the earlier question `q10`,
  Recommended, now settled with S1-9 and S1-10). The reasons are above, under "Where the route
  can run". It writes only into the calling checkout.
- **S1-3. Linked targets are refused among the folder rules, before the declaration.** A linked
  `settings.yaml` that points outside also defeats `findCoveringPlan`'s real-path check, which
  would otherwise produce the wrong sentence. Profile files can only be checked once the profile
  names are known, so they get the same refusal in the presence phase, before any write.
- **S1-4. The read-only screen lists key names, never values.** It is enough to tell whether the
  folder has its own settings. Values are changed and read on the folder's own Settings screen,
  as decision 26 says.
- **S1-5. A project's own profile is copied when it is a regular file in the project's own
  folder; it is skipped only when that path does not exist.** Corrected in this round: the
  earlier text skipped any profile path that was "not a regular file" with a note that the
  folder reads it from the shipped profiles "exactly as the project does". That was false for a
  link or a folder at that path, because `loadProfile` reads the project's own path whenever it
  exists (`regulatory-regime.js` lines 274–275). Now only a missing path is skipped (the project
  and the folder both read the shipped copy); a link refuses `source-link`, another kind
  `source-not-file`.
- **S1-6. When the project's own regime cannot be read, nothing is created.** A partial copy
  would give the nested root a different regime than the repository, which is exactly what
  decision 16 forbids.
- **S1-7. `subagentMayRunRoute` is reached through `Module.prototype._compile` on the hook's own
  source with one appended export line.** The hook exports nothing and its background-agent
  refusals are switched off (`protect-records.js` line 597). This is the only way to test the
  real function body without changing a hook file (decision 3). `_compile` is what `require`
  itself runs.
- **S1-8. The log is JSON Lines at `.ctoc/logs/nested-settings.jsonl`, appended through
  `durable-log.appendEntry`.** Corrected in this round: CTOC's setup adds `.ctoc/logs/` to
  `.gitignore` only when a `.gitignore` already exists (`init-project.js` lines 839–849), so in
  a project without one the log can be committed. The log is an audit trail, never read back as
  a correctness input, and not tamper-evident.
- **S1-9. A plan in `plans/todo/` declares too, when that checkout's task registry holds a
  running `implement` task whose plan is the matched plan.** This amends the parent's decision
  33, which counted only `in-progress`. Reason (the CTO Chief, S1-C1): on origin/main a build
  launched through the promote list (`menu task start <id>` on a queued task, `start.md` lines
  119 and 130) runs with its plan in `todo/`, because only `startAgent`'s claim moves a plan
  (`actions.js` lines 1878–1885); the real project's stalled plan is in `todo/` today, with a
  queued build task that counts once it is started (decision S1-34). The
  approval record is still required. The registry read is `taskRegistry.load`, read only, of the
  checkout where the plan was found (the main worktree's registry for a main-worktree match).
  Only `running` counts, not `queued` (case 8) and not `cancelling`. Only the scan's single best
  match per stage is tested, so a less specific plan being built behind a more specific idle one
  in `todo/` refuses: fail closed, accepted. The witness is not a security control: any session
  or agent may record and start a build through the menu (`docs/ENFORCEMENT.md` line 374), so
  for a `todo` plan the approval record and the declaration are what hold (Security Review,
  adversary A1). It only keeps an approved plan nobody is building from granting.
- **S1-10. Git runs with no `GIT_*` variable, lists worktrees with `-z`, and its main worktree
  is accepted only when that worktree's `.git` is a real folder equal to `git rev-parse
  --git-common-dir` (the CTO Chief, S1-M1 and TM-13).** Removing every `GIT_*` key covers the
  `GIT_REDIRECTS` list in `hotfix-check.js` lines 290–292 without importing it: `hotfix-check.js`
  exports only `hotfixRoute` and `ruleRefusal` (line 2121) and requires `../hooks/guard-files`
  (line 275), so an export would edit a file outside this slice and pull a hook module into
  `lib`. The module comment points at that list. `-z` arrived in a later git than `worktree list`
  itself (*believed*: git 2.36); an older git fails the call, which fails closed, and Step 9
  records the installed version.
- **S1-11. Write order: the profiles, then `settings.yaml`, then `settings.json`; on any failure
  every file this call created is removed (the CTO Chief, S1-M2).** A failure among the profiles
  therefore never leaves a settings file, which is what makes a folder a root. The folders the
  call made stay, empty and named: an empty `.ctoc/` makes no root (`project-root.js` lines
  95–98), and `safe-fs` has no non-recursive folder removal (its exports, lines 220–221), so a
  removal would need a recursive delete. A rolled-back attempt is still logged, with `failed`,
  `removed` and `notRemoved`, because files did touch the disk.
- **S1-12. Source rules (the CTO Chief, S1-M3).** A linked source refuses `source-link`, a
  source of another kind `source-not-file`; the project's missing `settings.yaml` refuses
  `no-source`, even when a `settings.json` exists, because the yaml carries the enforcement mode
  and the regime the copy exists to repeat (decision 2), and a copy of the json alone would make
  a root with neither. Only a missing `settings.json` while the yaml exists is skipped with the
  note. Every source read is capped at 1 MiB (`too-large`), and the bytes read in `planCopies`
  are the bytes written. Corrected in round 2: `settings.yaml` is read three times, once capped
  for the copy, once by `loadActiveProfiles` for the names, and once capped again for the
  re-check of decision S1-38; the bytes written are always the first read's.
- **S1-13. `settingsRoute` is one written-out orchestration inside a try whose catch gives
  `internal` with the error code only; an outcome table states every result (the CTO Chief,
  S1-M4).** `createCopies` handles its own throws as a write failure, so the catch only sees
  phases that write nothing, and its "Nothing was written" is true. The duplicate
  `declaring`/`plan` parameter is gone; `folder-failed` now names the folder that failed and any
  empty folder left.
- **S1-14. Every branch the spec critic listed has a case; the git arms stub
  `require('child_process').spawnSync` at call time (the CTO Chief, S1-M5).** The module looks
  the function up at each call for that reason. The "main equal to root" arm is not built:
  after S1-10 it cannot be reached (this checkout's `.git` is a file, the main worktree's must be
  a folder), and an unreachable arm cannot meet the 100% line target. The real-path comparisons
  that remain run inside a try.
- **S1-15. Every fixture content is an exact one-line JavaScript literal, and the fixture
  project passes `verifySetup` (the CTO Chief, S1-M6).** So the child `start.js` run never
  calls `initProject`, and a reader can rebuild each fixture byte for byte.
- **S1-16. A create allowed by the main worktree's plan is also logged in the main worktree's
  log, with `writtenIn` naming the writing checkout by its path relative to the main worktree
  (the CTO Chief, S1-M7 and TM-14).** A relative path, so the log names no home folder. A
  failure of that append is reported in the answer. Both logs use `durable-log.appendEntry` with
  `maxEntries: 1000` (a line count; the module has no byte cap). The oldest lines beyond 1000
  are dropped, which an audit trail of this rate never reaches in practice (*assumed*).
- **S1-17. A file already present must equal its source; any difference refuses
  `present-differs` and writes nothing (the CTO Chief, TM-03).** Reason: an agent could plant a
  weakened `settings.json` (`enforcementMode: off`) and have the route create the `settings.yaml`
  that turns the folder into a root carrying it. This narrows decision 30: an all-equal folder
  still answers `all-present`; a folder whose files the human later changed now answers
  `present-differs`, which writes nothing either. The read-only screen marks each present file
  "same as the project's" or "differs from the project's".
- **S1-18. A folder name enters an offered action only when every segment matches
  `/^[A-Za-z0-9._-]+$/` (the CTO Chief, TM-04; the rule at `menu-screens.js` line 1783).**
  Otherwise no action is offered and the text says the name cannot be offered as a command. A
  create the session types itself is not an offered action and still works (case 15).
- **S1-19. The Security Review states three residuals the owner's switch carries (the CTO
  Chief, TM-02, TM-09, TM-10):** the approval record, forgeable through the shell (the owner's
  switch) and, until the spelling fix ships, through an editing tool (no new write capability, a new
  laundering by log), builder self-service only while background-agent refusals are off, and
  the trust boundaries with the adversaries (three since decision S1-43). The `docs/ENFORCEMENT.md` row says "refused
  only when those refusals are on, and today they are off".
- **S1-20. After each write the created file's real path is compared with the expected one; a
  difference removes it and refuses `raced` (the CTO Chief, S1-L1 and TM-11).** `wx` is
  described as guarding the file, not the folders above it.
- **S1-21. A name the disk reads as another name is refused `name-alias` (the CTO Chief, S1-L2
  and TM-12), by a directory listing rather than by `realpathSync.native`.** Each segment must
  appear exactly in `readdirSync` of its parent, and `:` and segments ending in a dot or a space
  are refused outright. Reason for the substitution: a directory listing returns the stored name,
  which catches letter case and Windows short names alike. One limit, failing closed and
  accepted: it returns the stored Unicode form too, so on macOS a folder stored decomposed but
  named composed (or the reverse) is refused `name-alias`; whether macOS's
  `realpath` returns the stored letter case is *believed*, not verified, and `safe-fs` exposes
  only the non-native `realpathSync` (line 118). Case 3 shows the result on the build machine's
  disk.
- **S1-22. A fault is shown by `err.code` only, never by a message that may hold a path (the
  CTO Chief, S1-L3).**
- **S1-23. `\` is read as `/` before the absolute, drive and `//` tests (the CTO Chief, S1-L4).**
- **S1-24. Real paths are compared inside a try; a CTOC root that is not the git top folder
  never falls back to the main worktree, by design (the CTO Chief, S1-L5).** Its `<root>/.git`
  does not exist, so it is not a linked worktree.
- **S1-25. Case 7's worktree is a sibling temporary folder, its task id comes from the claim's
  answer, and cleanup is `git worktree remove --force` then `rmSync` (the CTO Chief, S1-L6).**
- **S1-26. One display cap of 120 for every shown value, and a repeated flag refused `flag`
  (the CTO Chief, S1-L7).** `--by` keeps 80, because the parent's decision 27 fixes it and
  case 4 tests it; "one cap" is read as the display caps (40, 60 and 120 before), not as an
  amendment of decision 27.
- **S1-27. The resolution sentence is chosen by `describeProjectRoot(...).marker` (the CTO
  Chief, S1-L8).** `fallback` says no root was found; a root by `plans/`, `.git` or a project
  file says so and that it has no CTOC settings of its own.
- **S1-28. `menu-screens.js` requires `nested-settings` inside the `settings` branch only (the
  CTO Chief, S1-L9).** No other screen pays for loading it.
- **S1-29. Step 9 runs case 6 alone with coverage and records the hook's row (the CTO Chief,
  S1-L10).** The compiled copy of `protect-records.js` carries the hook's file name, so its
  effect on the hook's measured coverage is known before Step 14.
- **S1-30. Step 15 sets the documented counts from disk after the merge (the CTO Chief,
  S1-L11).** The literals in this plan are this branch's values; the unpushed local `main`
  already holds one more test file.
- **S1-31. The refinement loop is not gated on.** The plan's `effort` is `medium` (the gate in
  `src/lib/refinement-loop.js` lines 491–493 needs `high` or `xhigh`), and none of the eight
  `files:` paths matches a glob in `.ctoc/config/refinement-triggers.yaml` lines 18–99. Steps 12,
  13 and 14 are single-pass checks.
- **S1-32. A task's `plan` matches the declaring plan by slug.** `findCoveringPlan` returns
  `<stage>/<slug>`; a build `startAgent` records carries the bare slug (`actions.js` line 1783);
  a task recorded with `menu task add implement <plan>` carries the caller's word
  (`menu-screens.js` line 2092), so a path form (`plans/todo/<slug>.md`) is reduced to its slug
  before the comparison. Case 7b passes the bare slug, the form `startAgent` records.

Round 2 (the round-2 spec critic's findings, applied by the integrator):

- **S1-33. Case 16 declares its plan after the worktree exists, and counts the real git calls
  (TC-1).** Declared before the commit, the plan and its approval record would sit in the
  worktree's commit; records travel by name and content hash (`approval-residency.js` lines
  160–183), so the worktree's own `in-progress` match would win (`plan-coverage.js` lines
  518–627) and git would never run, leaving the case green without testing the environment rule.
  A pass-through spy (`countSpawn`) now proves both git calls ran with no `GIT_*` variable.
- **S1-34. The real project's precondition is measured, and the `not-declared` sentence says
  when to retry (TC-2).** The CTO Chief's read-only measurement (2026-10-18; recorded under
  "What was not verified") shows the real stalled plan in `todo/` with a queued, not running,
  build task. The route serves it once the coordinator runs `menu task start <id> --agent-id
  <id>`. Before that a builder gets `not-declared`; the sentence adds, conditionally so it is
  true for every caller, that a `todo` plan counts once its build task is started and to retry
  then. Case 8's queued-task folder asserts it.
- **S1-35. An equal-length differing file has its own case (TC-3).** `JSON_SAME_LENGTH` is 72
  bytes like `SETTINGS_JSON`, so case 12l reaches the byte-for-byte comparison that a different
  size skips; the case asserts the equal length first.
- **S1-36. Duplicate profile names are removed before the loop, in `planCopies` and the
  read-only file list (TC-4).** `parseRegimeBlock` keeps duplicates (`regulatory-regime.js`
  lines 216–229); two items for one `dst` would make the second exclusive create fail and roll
  the first back. Case 12m.
- **S1-37. `findDeclaringPlan` tests `m !== null` before `m.stage` (TC-5).** `findCoveringPlan`
  returns `null` when nothing covers the path; without the test the route would throw into
  `internal` instead of answering `not-declared`.
- **S1-38. The read order in `planCopies`, and a re-check of the yaml; the refusal is
  `source-changed`, not `raced` (TC-6).** The capped, link-refusing reads of both settings
  sources run first; `loadActiveProfiles` runs only after the yaml passed (so it never reads a
  linked or oversized yaml); then the yaml is read again, capped, and must equal the copied
  bytes. The profile names cannot be parsed from the copied bytes directly: the block regex of
  `loadActiveProfiles` (`regulatory-regime.js` line 196) is not exported, the module is outside
  this slice's `files:`, and copying the regex would re-encode it. The re-check proves the names
  came from the copied bytes unless the file was changed and changed back between the reads
  (adversary A2, which can write the settings file directly anyway; accepted). The critic named
  the refusal `raced`; it is `source-changed` here because `raced` already means "a created file
  landed outside, was removed and the attempt logged", while this refusal writes nothing and
  logs nothing, and one code with two outcomes would make the outcome table false.
- **S1-39. Both `gitEnv` and the test's `cleanEnv` drop keys matching `/^GIT_/i`, and case 14's
  stub checks the same rule (TC-7).** Windows reads environment names without regard to letter
  case, so `git_dir` would redirect git there.
- **S1-40. Each log entry is built inside the same try as its append (TC-9).** A fault while
  building it (the `realpath` of `writtenIn`) would otherwise reach `createCopies`' outer try,
  be treated as a write failure and remove files that were correctly created. It is reported as
  "the main worktree's write log could not be updated (<code>)", and the files stay. Case 14.
- **S1-41. Fixture literals for the profile cases, and the shape of `makeRepoWithWorktree`'s
  `plans` (TC-8).** `SETTINGS_YAML_GDPR`, `SETTINGS_YAML_GHOST` and `SETTINGS_YAML_DUP` are exact
  literals; `plans` is an array of `[stage, slug, files, opts]` handed to `declare`, and 7b
  passes `{ approved: false }`. The helper no longer makes the claim: each case claims after it
  returns, which changes nothing in the worktree because it is cut from the commit; case 7's
  `started: true` assertion fails loudly if that is wrong.
- **S1-42. A folder whose first segment starts with `-` is never offered as an action (TC-10).**
  `parseArgs` reads `menu settings -lead --create` as a flag, so the offered command would be
  refused. The text says the name cannot be offered as a command. The critic's note that "such a
  folder cannot be named" is narrowed to what is true: its bare name cannot be named (it is a
  flag), but `./-lead` passes the parser and normalises to `-lead`, so the session can still
  show or create it by that form. Case 15 asserts both. For that form to pass, `checkFolder`'s
  checks 5 and 6 are stated to run on the normalised segments (a raw `.` segment would otherwise
  be refused as a name ending in a dot).

Round 3 (the round-3 spec critic's finding, applied by the integrator):

- **S1-43. The approval record is forgeable through an editing tool too, until the spelling fix
  ships (R3-1).** The Security Review said the editing-tool channel still refuses
  `.ctoc/approvals/`. That is false on macOS: `protect-records.js` line 643 and
  `PreToolUse.Edit.js` compare folder names as text, while the file system folds letters, so a
  Write to `.ctoc/approvalſ/<slug>.json` (long s) or `.ctoc/ﬆate/verify/…` (the 'st' ligature)
  lands in the protected folder (security scan of 2026-10-18, reproduced on origin/main). The
  Security Review now names both channels, the adversaries gain A3 (an agent holding only
  editing tools), decision S1-19 is re-worded, Step 9 records whether origin/main holds the fix
  'the write protection compares real files, not spellings' (commit 0fada89c), and Step 13
  checks that the residual matches the fix's state. No test pins the bypass: it is a bug, not
  behaviour, and a pin would turn red when the fix ships.
- **The Step 7 refinement loop ended after round 3, the maximum, with no finding left open.**

## Execution Plan

### Step 8: TEST
- [ ] Write `tests/nested-settings-route.test.js` with cases 1–16 (and 7b; 11q, 11r, 12l, 12m,
  case 14's log-entry fault, case 15's leading dash and the rewritten case 16) above, FIRST, before
  any source file changes.
- [ ] Run `node --test tests/nested-settings-route.test.js` and record the output in the build
  record. Expected red: every route case fails, because `route(['menu','settings',…])` falls
  through to the dashboard (`menu-screens.js` line 2807) and returns no `reason`. Cases 7 and 7b
  also fail at the child process.
- [ ] Case 6 is a pin of today's hook and is expected GREEN from the start. Record it as a
  characterization test, not as test-driven red.
- [ ] Write the `tests/cache-freshness.test.js` whitelist entry in Step 10, not here. Before the
  module exists, the honesty case would fail for a reason unrelated to behaviour.

### Step 9: PREPARE
- [ ] Re-read the lines this plan cites, and stop and report any that moved:
  - `menu-screens.js` 1777–1788, 2091–2154, 2245–2304, 2791–2807;
  - `plan-coverage.js` 84, 439–451, 505–645;
  - `task-registry.js` 205–207, 330–358, 401–449;
  - `durable-log.js` 191–239;
  - `actions.js` 1716–1786, 1860–1899;
  - `protect-records.js` 84–91, 125–159, 350–365, 597–606, 632–656;
  - `start.js` 621–626, 671–720;
  - `regulatory-regime.js` 189–200, 216–229, 271–282, 362–369;
  - `approval-residency.js` 160–183; `real-path-confinement.js` 127, 188;
  - `project-root.js` 33–140;
  - `init-project.js` 839–849;
  - `start.md` 40, 118–119, 130.
- [ ] Run `git --version` and `git worktree list --porcelain -z` in this worktree and record
  both outputs (the `-z` form is *believed* to need git 2.36 or later).
- [ ] Run case 6 alone with coverage, `node --test --experimental-test-coverage
  --test-name-pattern="1.6" tests/nested-settings-route.test.js`, and record the coverage
  table's `src/hooks/protect-records.js` row in the build record (decision S1-29).
- [ ] Record whether origin/main holds the fix 'the write protection compares real files, not
  spellings' (commit 0fada89c). If it does, re-word the editing-tool half of the Authority
  residual to match the shipped behaviour (decision S1-43).

### Step 10: IMPLEMENT
- [ ] `src/lib/nested-settings.js`: CREATE exactly as specified. `settingsRoute` is the only
  export. Every file call goes through `safeFs.<fn>`; each git call through
  `require('child_process').spawnSync`. There is no `new RegExp` and no regex literal with a
  control character (stripping reuses `tui.stripCtl`). Every function has JSDoc. A comment at
  `gitEnv` points at `hotfix-check.js`'s `GIT_REDIRECTS`.
- [ ] `src/lib/menu-screens.js`: the router line with its inline require, and the Usage line.
- [ ] `tests/cache-freshness.test.js`: the whitelist entry.
- [ ] `src/commands/start.md`: the table row.
- [ ] `docs/ENFORCEMENT.md`: the writer clause and the refused-route row.
- [ ] `CLAUDE.md` and `README.md`: the five count edits.

### Step 11: REVIEW
- [ ] iron-loop-critic reads the diff against this plan. It checks:
  - the check order: flags, then folder rules, then declaration, then sources and presence;
  - every `lstat` site, and the directory-listing name check;
  - that `wx` and the real-path check follow every write, and that removal touches only files
    this call created;
  - the write order (profiles, yaml, json);
  - that the stage rule is `in-progress`, or `todo` with a running implement task in the same
    checkout's registry;
  - both git calls: fixed words, no shell, no variable matching `/^GIT_/i`;
  - `m !== null` before every `m.stage` in `findDeclaringPlan`;
  - the read order in `planCopies` (capped settings reads, then `loadActiveProfiles`, then the
    yaml re-check giving `source-changed`) and duplicate names removed in `planCopies` and the
    read-only file list;
  - that each log entry is built inside the same try as its append;
  - that no action is offered for a folder whose first segment starts with `-`;
  - the `not-declared` sentence's retry clause;
  - that no `parseTaskArgs` change was made;
  - the refusal table and the outcome table match the code.

### Step 12: OPTIMIZE
- [ ] `mainWorktree` spawns git only on the fallback path: a linked worktree whose own checkout
  holds no declaring plan.
- [ ] `taskRegistry.load` runs only for a `todo` match.
- [ ] Each source file is read once for its copy, in `planCopies`, and those bytes are written;
  the only other reads of `settings.yaml` are `loadActiveProfiles`' own and the one re-check
  (decisions S1-12, S1-38).
- [ ] Confirm no other code path spawns a process.

### Step 13: SECURE
- [ ] security-scanner reviews the new module against the Security Review and the trust
  boundaries above. Its focus:
  - link handling, the name check and the real-path check after each write;
  - `wx` and the removal on failure;
  - both git calls and their environment (`/^GIT_/i` removed);
  - the building witness read from `tasks.json`;
  - the yaml re-check against the copied bytes (`source-changed`);
  - that a log-entry fault never removes created files;
  - log content, in both logs;
  - that no absolute path and no error message appears in any sentence;
  - that every offered action passes the segment rule and never starts with `-`;
  - the Authority residual matches the current state of the spelling fix.

### Step 14: VERIFY
- [ ] Run `npm run lint` (eslint, `--max-warnings 0`).
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`: the gated entry point, which holds the full suite, the coverage floor in
  `.ctoc/coverage-baseline.json` (`minPct` 99) and zero skipped.
- [ ] All must pass with `# fail 0`, 0 skipped and 0 flaky (run the new test file three times;
  every run identical).
- [ ] 0 warnings across all toolchains (linter, type checker, Node deprecation warnings in the
  test output).
- [ ] The new module must report 100% of its reachable lines.

### Step 15: DOCUMENT
- [ ] Confirm that the start.md row and the `docs/ENFORCEMENT.md` lines match the shipped
  behaviour, word for word with the refusal table.
- [ ] After the merge with local `main`, set the CLAUDE.md and README.md counts from disk
  (`tests/readme-numbers.test.js`), not from this plan's literals (decision S1-30).

### Step 16: FINAL-REVIEW
- [ ] iron-loop-critic checks scenarios 1.1–1.8 one by one against the passing test names and
  the wiring table, and the outcome table against the code.
- [ ] It confirms no file under `src/hooks/` changed (`git diff --stat -- src/hooks` empty).
- [ ] Ready for the human's review.
