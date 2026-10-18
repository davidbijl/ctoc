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

No file under `src/hooks/` changes (decision 3). The plan's hook scenarios are tests of today's
hook.

**What this planner did and did not do.** Every statement about this repository below was read
from the file and line named, in this worktree (origin/main 6.14.130). Two exceptions are
labelled where they occur: the unpushed local `main` (read from the main checkout's working
tree, not from the commit), and git and Node behaviour labelled *believed*. Nothing was run:
this planner held read, search, write and edit tools only. Every *believed* item has a test
below that would show it wrong.

## The problem in plain words

A real project keeps nested CTOC project roots inside its repository, for example
`streams/<name>/`. One of its plans needed `streams/<name>/.ctoc/settings.yaml` to exist.

- CTOC's write protection refuses that file name at any depth, for editing tools and for the
  shell (`src/hooks/protect-records.js` lines 125–143, 152–156).
- No menu route writes it: the router (`src/lib/menu-screens.js` lines 2791–2907) has no
  settings route.

So the builder stopped, the plan stayed open, and the plans behind it waited.

This slice adds the menu route. It runs in the menu's own process, through Node file calls that
no hook sees. It only ever:

- shows a folder's settings, or
- creates the missing copies of the project's own settings and the project's own active
  regulatory profiles, never changing a value and never overwriting a file;

and it creates them only where an approved plan being built declares the folder's settings file.

## Where the route can run (the gate critic's first input)

**What was read.**

- The menu resolves its project root from its working directory: `start.js` line 292, through
  `findProjectRoot`. A git worktree holds its own `.git` file, so the walk stops there
  (`src/lib/project-root.js` lines 128–131).
- The menu's claim moves a plan into `plans/in-progress/` only in the checkout the menu ran in
  (`src/lib/actions.js` line 1885, `startExecution`). A builder's worktree is a separate checkout
  of the same repository. Its `plans/` shows whatever was committed when it was made, which is
  often the plan still in `todo/`. Its `.ctoc/approvals/` may lack the record: in this very
  worktree the plan's approval record is untracked, per the git status at session start.
- `plan-coverage.js` lines 439–451 recorded on 2026-07-20 that `plans/in-progress/` was empty
  while builds ran. The claim path above now moves plans there.

**What the route does (Recommended option of question `q10`, built in this slice).**

1. It first looks for the declaring plan in **this checkout's** `plans/in-progress/`, read
   through `findCoveringPlan` (decision 33).
2. When none is found and this checkout is a **linked git worktree** (its `<root>/.git` is a
   regular file, not a folder), it looks once more in the repository's **main worktree**. That
   is the first `worktree` entry of `git worktree list --porcelain`, which git lists first
   (*believed*, from git's documentation of `worktree list`; test 1.7 fails if it is wrong).
3. In every case it writes only into the checkout it runs in. A builder's own call from its
   worktree therefore lands the file in the builder's branch, where the plan's work is
   committed. A call from the claiming checkout lands it there.

The log names which checkout's plan allowed the write.

- **Why not only this checkout.** The builder could then never do it itself. The coordinating
  session would have to run the route from the claiming checkout. The file would then sit in
  that checkout's working tree, outside the builder's branch, which is the stall the real
  project hit, moved one step.
- **Why the main worktree and not "the claiming checkout".** No file records which checkout
  claimed a plan. The task registry is per checkout. The main worktree is the one checkout git
  itself names. If the coordinating session runs in another linked worktree, the lookup finds
  no plan and refuses (fail closed), with a sentence saying where it looked.

The owner may choose the narrower rule instead (question `q10`, option 2). The change is then to
delete step 2 above and its git call; nothing else depends on it.

## Implementation Details

### Dependency Graph

```
src/commands/start.js main() ──route()──▶ src/lib/menu-screens.js route()  case 'menu', args[1]==='settings'
                                                   │
                                                   ▼
                                     src/lib/nested-settings.js settingsRoute(args, root)   (NEW)
                                        ├─▶ src/lib/safe-fs.js            (every file call, as a namespace)
                                        ├─▶ src/lib/plan-coverage.js      findCoveringPlan  (called, NOT edited: protected-paths.js line 59)
                                        ├─▶ src/lib/project-root.js       describeProjectRoot
                                        ├─▶ src/lib/regulatory-regime.js  loadActiveProfiles, loadProfile, unloadableProfiles
                                        ├─▶ src/lib/enforcement-mode.js   resolveEnforcementMode
                                        ├─▶ src/lib/tui.js                stripCtl
                                        └─▶ child_process.spawnSync('git', ['worktree','list','--porcelain'])   (lazy; only from a linked worktree)
tests/nested-settings-route.test.js ──▶ menu-screens.route(['menu','settings',…])  +  start.js as a child process
                                    ──▶ src/hooks/protect-records.js as a child process, and its subagentMayRunRoute through Module._compile
tests/cache-freshness.test.js       ──▶ whitelist entry for nested-settings.js
```

No cycle: `nested-settings.js` requires nothing that requires `menu-screens.js`. None of
`plan-coverage`, `project-root`, `regulatory-regime`, `enforcement-mode`, `tui` or `safe-fs`
requires `menu-screens`. The require lines were read at the top of each file. One partial read:
`enforcement-mode.js` lines 31–32 (it requires `settings`).

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
  - It never throws. A fault becomes a refusal or an honest partial answer, below.

**Module constants:**

- `SETTINGS_FILES = ['settings.yaml', 'settings.json']`
- `PROFILES_DIR = 'regulatory-regimes'`
- `LOG_REL = ['.ctoc', 'logs', 'nested-settings.jsonl']`
- `REQUESTER_CAP = 80`
- `GIT_TIMEOUT_MS = 10_000`

**Requires:**

- `path`
- `./safe-fs`, held as the namespace `safeFs`, so tests can inject faults on its exports object.
  This is the seam `tests/dashboard-reconcile-failure.test.js` lines 56 and 218 already use.
- `{ findCoveringPlan }` from `./plan-coverage`
- `{ describeProjectRoot }` from `./project-root`
- `regime = require('./regulatory-regime')`, as a namespace for the same reason
- `{ resolveEnforcementMode }` from `./enforcement-mode`
- `{ stripCtl }` from `./tui` (`tui.js` line 37; reused, never re-encoded)
- `child_process`, required lazily inside `mainWorktree` only, mirroring
  `stale-detector.js` line 501

**Internal functions (not exported).**

`parseArgs(args)` → `{ ok: true, folder: string, create: boolean, by: (string|null) }` or a
refusal `{ ok: false, reason, text }`. Its rules:

- `--create` sets `create`.
- `--by` takes the next word. That word must exist and must not start with `--`; otherwise the
  reason is `by-missing`.
- Any other word starting with `-`, such as `--set` or `-x`, gives reason `flag`. The text names
  the two accepted flags (decision 31) and the refused word, after `stripCtl`, capped at 40
  characters.
- The first positional word is the folder. A second one gives reason `extra-word`.
- `--by` without `--create` gives reason `by-without-create`.
- No folder gives reason `no-folder`.
- This route keeps its own parser and never extends `menu-screens.parseTaskArgs`. That parser is
  also the hook's reader (`protect-records.js` lines 327–336), so a new field there would
  silently change what the hook accepts.

`requesterLabel(by)` → `string`:

- `by === null` gives `'not declared'`.
- Otherwise `stripCtl(by).slice(0, 80)`. An empty result gives `'not declared'`, else
  `` `${clean} (declared, not verified)` `` (decision 27).

`checkFolder(root, arg)` → `{ ok: true, rel: string, abs: string }` or a refusal. The checks run
in this order and the first failure wins (decisions 15 and 34). Each failure has its own reason
code and sentence (table below):

1. `stripCtl(arg) !== arg` gives `control-character`.
2. `path.isAbsolute(arg)`, or a drive prefix `/^[A-Za-z]:/`, or a leading `\\` gives
   `absolute`.
3. Read `\` as `/`. Any segment equal to `..` gives `parent-segment`. This is checked before
   normalising, so `streams/../..` is refused rather than collapsed.
4. Normalise with `path.posix.normalize` and drop a trailing `/`. The result `.` or `''` gives
   `root`.
5. Any segment matching `/^\.(ctoc|git)$/i` gives `ctoc-or-git`. The match ignores letter case,
   so `.CTOC` is refused on a case-insensitive disk too.
6. Walk the segments from the root down with `safeFs.lstatSync`, never following a link:
   - ENOENT or ENOTDIR gives `missing`.
   - Any other error gives `unreadable`, naming the code.
   - A symbolic link at any segment gives `link`. The sentence adds "which leads outside the
     project" when `safeFs.realpathSync(segment)` throws (a dangling link), or when its path
     relative to `safeFs.realpathSync(root)` starts with `..` or is absolute.
   - A last segment that is not a folder gives `not-a-folder`.
7. `lstat(<abs>/.ctoc)`:
   - absent is fine;
   - a link gives `ctoc-link`;
   - present but not a folder gives `ctoc-not-folder`;
   - any other error gives `unreadable`.
8. When `.ctoc` is a folder, `lstat` each of `settings.yaml`, `settings.json` and
   `regulatory-regimes`, never following a link:
   - a link gives `settings-link` (`profiles-link` for the folder);
   - present but of the wrong kind gives `settings-not-file` (`profiles-not-folder`);
   - absent is fine.

   This is the gate critic's second input. These checks sit among the folder rules, before the
   declaration, so a linked target never earns the no-declaring-plan sentence (scenario 1.3).

`rel` is the normalised POSIX form, for example `streams/alpha`. `abs` is `path.join(root,
...rel.split('/'))`.

`mainWorktree(root)` → `string | null`:

- Call `require('child_process').spawnSync('git', ['worktree', 'list', '--porcelain'], { cwd:
  root, encoding: 'utf8', timeout: GIT_TIMEOUT_MS, maxBuffer: 1024 * 1024, windowsHide: true,
  shell: false })`.
- `r.error`, or `r.status !== 0`, gives `null`.
- Otherwise read the first block, the lines before the first empty line:
  - its first line must start with `worktree `, and its remainder is the path;
  - a `bare` line in that block gives `null`, since a bare repository has no main checkout;
  - else return the path.

`findDeclaringPlan(root, rel)` → `{ plan: string, where: 'this checkout' | 'the main worktree' }
| null`:

- For `base` in `[root]`, plus `mainWorktree(root)` when `safeFs.lstatSync(path.join(root,
  '.git')).isFile()` (inside a try; any fault means "not a linked worktree") and the main path
  resolves differently from `root`:
  - for `f` of `SETTINGS_FILES`, call `m = findCoveringPlan(path.join(base, ...rel.split('/'),
    '.ctoc', f), base)`;
  - when `m && m.stage === 'in-progress'`, return `{ plan: m.plan, where }`.
- Otherwise return `null`.
- The argument order is the target first, then the root (`plan-coverage.js` line 642).
- Testing the returned stage is exact, because the scan returns an `in-progress` match before
  it looks at `todo` (lines 84, 518–628; decision 33).

`planCopies(root, rel, abs)` → `{ ok: true, items: Array<{ src: string, dst: string, relDst:
string, present: boolean }>, notes: string[] }` or a refusal.

- **Settings.** For each of `SETTINGS_FILES`, `src = <root>/.ctoc/<f>`.
  - If `safeFs.lstatSync(src)` is not a regular file, the file is skipped with the note "the
    project has no `.ctoc/<f>` of its own to copy". A link to elsewhere counts as not regular,
    so a linked source is never read through.
  - `dst = <abs>/.ctoc/<f>`.
- **Profiles.** `names = regime.loadActiveProfiles(root).profiles`.
  - If it throws, the result is a refusal with reason `regime-unreadable`: the copy would not
    carry the same regime, so nothing is written.
  - A name is skipped when `regime.loadProfile(root, name) === null`. This reuses that module's
    name rule, so `PROFILE_NAME_RE` is not exported or copied.
  - A name is also skipped when `<root>/.ctoc/regulatory-regimes/<name>.yaml` is not a regular
    file. The note says the folder reads that profile from the profiles shipped with CTOC,
    exactly as the project does.
  - Otherwise `dst = <abs>/.ctoc/regulatory-regimes/<name>.yaml`.
- **Presence of each `dst`,** read with `lstat`, never following a link:
  - ENOENT means `present: false`;
  - a regular file means `present: true`;
  - a link gives reason `profile-link` (for settings files, check 8 already refused it);
  - any other kind gives `profile-not-file`;
  - any other error gives `unreadable`.

`ensureFolder(dir)` → `null` on success or `{ code: string }`:

- `safeFs.mkdirSync(dir)` without `recursive`. A recursive mkdir would walk through a linked
  parent; *believed* — never relied on, because check 7 already refused a linked `.ctoc`.
- On `EEXIST`, re-`lstat`. A real folder that is not a link counts as success, because a
  concurrent creation is fine. Anything else gives `{ code: 'EEXIST' }`.
- Any other error gives `{ code: err.code || 'unknown' }`.

`createCopies(root, rel, abs, declaring, by, plan)` → `ScreenResult`:

1. If no item is missing, write nothing, append no log and answer reason `all-present`
   (decision 30). The text says which files already exist and carries the change sentence.
2. Ensure `<abs>/.ctoc` when any item is missing. Ensure `<abs>/.ctoc/regulatory-regimes` when
   any profile item is missing. A failure answers reason `folder-failed`, "could not create
   `<rel>/.ctoc` (<code>); nothing was created", with no log. A folder made before the failure
   is named in the text as "an empty folder was left: …", never hidden.
3. For each missing item in order (settings.yaml, settings.json, then the profiles):
   - `bytes = safeFs.readFileSync(src)` (a Buffer);
   - then `safeFs.writeFileSync(dst, bytes, { flag: 'wx' })`. Exclusive create fails with
     EEXIST on any existing name, a dangling link included (the gate critic's second input).
   - The first failure stops the loop, and is recorded as `` `${relDst}: ${err.code ||
     'write failed'}` ``.
4. When at least one file was created, append one log entry. The entry is one line of JSON plus
   `\n`, written with `safeFs.appendFileSync` to `<root>/.ctoc/logs/nested-settings.jsonl`,
   after `safeFs.mkdirSync(<root>/.ctoc/logs, { recursive: true })`. Its fields:
   `{ at: new Date().toISOString(), folder: rel, created: [relDst…], declaringPlan: plan.plan,
   declaredIn: plan.where, writer: 'the menu', requester: requesterLabel(by) }`, plus `failed:
   '<relDst>: <code>'` when step 3 stopped early.
   - It names files only, never their contents (decision 2).
   - A log failure is caught and reported in the answer: "the write log could not be updated
     (<code>)". It is never silent.
5. The answer text:
   - one line per created file, each named;
   - the partial failure, when there was one;
   - the notes;
   - the requester label;
   - the declaring plan and the checkout it was found in;
   - the change sentence (decision 26).

`readOnlyScreen(root, rel, abs)` → `ScreenResult` (no flag; no declaring plan needed;
decision 2). It reads files only after `checkFolder` refused every link. The lines:

- **The files:** each of `.ctoc/settings.yaml`, `.ctoc/settings.json`, and
  `.ctoc/regulatory-regimes/<name>.yaml` for the project's active profiles, marked "present" or
  "missing".
- **Resolution:** `d = describeProjectRoot(abs)`, then `resolved = path.relative(root,
  d.root)`.
  - If `d.root === abs`: "`<rel>` is its own CTOC project root."
  - Otherwise: "`<rel>` is not a CTOC project root; CTOC resolves it to <the project root |
    `<resolved>`> and uses those settings."
  - When neither settings file exists, the screen also says it has no CTOC settings of its own
    and offers the create action.
- **Enforcement mode:** `resolveEnforcementMode(d.root)` → `strict (from settings.yaml)`.
- **Regulatory profiles:** `regime.loadActiveProfiles(d.root).profiles`, and
  `regime.unloadableProfiles(d.root)` as "none" or the names. Either throwing gives the honest
  line "could not be read (<message after stripCtl, capped at 120>)".
- **Settings keys** (key names only, never values, decision S1-4):
  - for the folder's own `settings.yaml`: every match of `/^([A-Za-z_][A-Za-z0-9_-]*)[ \t]*:/gm`;
  - for `settings.json`: `Object.keys` of a parsed plain object, or "could not be read as JSON",
    or "is not a JSON object";
  - each key is passed through `stripCtl` and capped at 60 characters, at most 30 keys per file.
- **The change sentence:** "To change a setting of `<rel>`, open the menu from inside `<rel>`
  (the first time, this sets it up as its own CTOC project) and change it on its Settings
  screen." (decision 26.)
- **Options:**
  - "Create its settings" → `menu settings <rel> --create`, only when a file is missing;
  - "◀ Back" → `dashboard`.

**Refusal sentences.** Every value interpolated into a sentence passes through `stripCtl` and is
capped at 120 characters. Every refusal says "Nothing was written."

| reason | sentence (the folder shown as `<f>`) |
|---|---|
| `no-folder` | "Name a folder inside the project: `menu settings <folder>`." |
| `flag` | "`menu settings` accepts two flags: `--create`, and `--by <requester>` with it. `<word>` is not one of them; a setting's value is never changed here." |
| `by-missing` / `by-without-create` | "`--by` names who asked for a create; it takes one word and goes with `--create`." |
| `extra-word` | "`menu settings` takes one folder." |
| `control-character` | "The folder name holds a control character." |
| `absolute` | "`<f>` is an absolute path; name a folder relative to the project root." |
| `parent-segment` | "`<f>` uses `..`; name a folder inside the project without `..`." |
| `root` | "That is the project root itself; its own settings are changed on the menu's Settings screen." |
| `ctoc-or-git` | "`<f>` runs through a `.ctoc` or `.git` folder, where no settings file may be planted." |
| `missing` | "`<f>` does not exist; the settings route works only on a folder that exists." |
| `unreadable` | "`<f>` could not be read (<code>)." |
| `link` | "`<f>` passes through a symbolic link (`<segment>`)[, which leads outside the project]; the settings route writes only into real folders of the project." |
| `not-a-folder` | "`<f>` is a file, not a folder." |
| `ctoc-link` / `ctoc-not-folder` | "`<f>/.ctoc` is a symbolic link" / "is not a folder"; "its settings could land in another place." |
| `settings-link` / `settings-not-file` | "`<f>/.ctoc/<file>` is a symbolic link" / "exists but is not a regular file"; "the settings route never writes through a link." |
| `profiles-link` / `profiles-not-folder` / `profile-link` / `profile-not-file` | the same shape for `regulatory-regimes` and a profile file |
| `not-declared` | "No plan being built declares `<f>/.ctoc/settings.yaml` or `<f>/.ctoc/settings.json` (looked in this checkout[ and in its repository's main worktree]), so the settings of `<f>` were not created; a plan that needs them declares that file in its `files:` list." (decision 32; the bracket only when `<root>/.git` is a file) |
| `regime-unreadable` | "The project's own regulatory settings could not be read, so a copy would not carry the same regime." |

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** Route `menu settings …` to the new module.
**Change Type:** modify-existing (two lines, and the module header's Usage block)

- **Import:** add `const nestedSettings = require('./nested-settings');` after line 54
  (`const hotfixCheck = require('./hotfix-check');`).
- **Add** in `route`, inside `case 'menu':`, after the `args[1] === 'task'` branch (line 2806):

  ```js
  // `menu settings <folder> [--create [--by <requester>]]` — a nested folder's settings
  // (src/lib/nested-settings.js): shown read-only, or its missing copies created where a
  // plan being built declares them. Never a setting's value.
  if (args[1] === 'settings') return nestedSettings.settingsRoute(args.slice(2), getProjectPath(projectPath));
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
  background-agent list, so it stays closed to background agents when those refusals are on |`.
  The hook does not change; the row documents fail-closed behaviour that
  `subagentMayRunRoute` already has (scenario 1.6).

#### File: `tests/cache-freshness.test.js`
**Action:** MODIFY
**Purpose:** The CF1 guard (lines 480–742) flags any `src/lib` file holding a mutating
`safeFs` call together with a count-relevant path token (lines 485–490). The new module holds
`safeFs.writeFileSync(` and `safeFs.appendFileSync(` and the literal `'in-progress'` (the stage
test), so the guard flags it. It writes no counted file. The documented answer is a justified
whitelist entry, never a loosened detector (lines 476–478).

- Add to `WHITELIST` (after the `gate-migration.js` entry, line 610):

  ```js
  // The nested-settings route writes ONLY <folder>/.ctoc/settings.yaml, <folder>/.ctoc/settings.json,
  // <folder>/.ctoc/regulatory-regimes/<name>.yaml (exclusive create) and appends
  // .ctoc/logs/nested-settings.jsonl. It never creates, deletes or moves a plan, vision or
  // inbox file; it is broad-flagged by its 'in-progress' stage test (the declaring plan's stage).
  ['nested-settings.js', 'writes only <folder>/.ctoc/settings.{yaml,json}, <folder>/.ctoc/regulatory-regimes/<name>.yaml and appends .ctoc/logs/nested-settings.jsonl; never a counted plan/vision/inbox file'],
  ```

- The whitelist-honesty case (lines 725–741) then proves the entry is flagged and does not bust
  the cache, so it cannot become dead weight.

#### Files: `CLAUDE.md`, `README.md`
**Action:** MODIFY (counts only)

| File | Line | From | To |
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
| `parseArgs`, `checkFolder`, `findDeclaringPlan`, `mainWorktree`, `planCopies`, `ensureFolder`, `createCopies`, `readOnlyScreen`, `requesterLabel` | intra-module, from `settingsRoute` | same |

Test 1.7 drives the route through the real entry point as a child process, from the claiming
checkout and from a git worktree. Reachability is therefore shown by running it, not by search.

## Test Plan

### Tests: `tests/nested-settings-route.test.js`
**Action:** CREATE
**Framework:** `node:test` (`describe`, `it`), `node:assert/strict`.

**Fixtures, shared helpers in the file:**

- `makeProject()` makes a `fs.realpathSync(fs.mkdtempSync(os.tmpdir()/ctoc-nested-))` folder
  that passes `start.js` `verifySetup` (lines 621–626, 708–720), so a child-process run of the
  menu writes no setup files. It holds:
  - `.ctoc/settings.yaml` = `enforcement:\n  mode: soft\nregulatory_regime:\n  active_profiles:
    [acme-internal]\n`;
  - `.ctoc/settings.json` = `{"workflow":{"enforcementMode":"soft"},"general":{"environment":"dev"}}`;
  - `.ctoc/regulatory-regimes/acme-internal.yaml` = `name: acme-internal\nrequired_controls:\n
    - audit_hash_chain\n`. The name is absent from the shipped folder (`.ctoc/regulatory-regimes/`
    lists 15 shipped profiles, none of them `acme-internal`), so a missing copy cannot pass on
    the shipped fallback;
  - `.ctoc/state/iron-loop.yaml`;
  - the eight `plans/` stage folders, each holding `.gitkeep`;
  - `streams/alpha/.gitkeep`, `streams/beta/.gitkeep` and `src/x.js`.
- `declare(root, stage, slug, files, { approved = true })` writes a plan with `files:`, the
  steps 8–16 ticked and one acceptance item. When approved, it mints the real approval record
  the way `tests/bash-gate-plan-coverage.test.js` lines 94–96 do:
  `ledger.writeEntry(ledger.slugFromPlanPath(p), { content, stage_from: 'implementation',
  stage_to: 'todo', approved_by: 'human' }, root)`.
- `snapshot(root)` walks the tree without following links and without entering `.git`. It
  records each entry's kind and, for a file, the sha256 of its bytes; for a link, its
  `readlinkSync` target. The result is compared with `deepEqual`.
- `menu(root, ...words)` is `ms.route(['menu', 'settings', ...words], root)`.
- `git(cwd, args, env)` is `spawnSync('git', [...GIT_IDENTITY, ...args], { cwd, encoding:
  'utf8', env, shell: false })`. `GIT_IDENTITY` follows `tests/helpers/hotfix-check-harness.js`
  lines 118–119.

**Symbolic links on Windows.**

- Folder links use `fs.symlinkSync(target, link, 'junction')`, as `tests/protect-records.test.js`
  line 105 does.
- File links use `'file'`. On `EPERM` under `process.platform === 'win32'` the case places a
  folder where the file should be. It then asserts the `settings-not-file` refusal and writes a
  `t.diagnostic` naming the substitution. This is the documented environment property of
  `.ctoc/coverage-baseline.json` `measurementEnvironment`, and it is never a skip.

**Cases.** Each lists its Given, its act and what it asserts.

1. **1.1, a copy where a plan being built declares it.**
   - Given: a plan in `in-progress` declaring the glob `streams/*/.ctoc/settings.yaml`, approved.
   - Act: `menu(root, 'streams/alpha', '--create', '--by', 'builder-7')`.
   - Asserts:
     - `ok === true`;
     - `streams/alpha/.ctoc/settings.yaml` bytes `deepEqual` the project's;
     - `settings.json` bytes equal the project's;
     - `regulatory-regimes/acme-internal.yaml` bytes are equal;
     - the text names all three created files and matches `/open the menu from inside
       `streams\/alpha`/`.
   - Then: rewrite `streams/alpha/.ctoc/settings.json` to `{"edited":true}` and call `--create`
     again. Asserts:
     - both settings files keep their bytes;
     - `reason === 'all-present'`;
     - the text says the files already exist;
     - the log holds exactly one line.
2. **1.2, showing without writing.**
   - Given: the 1.1 folder, and `src/` with no `.ctoc`.
   - Act: `menu(root, 'streams/alpha')` and `menu(root, 'src')`, with snapshots taken before
     and after.
   - Asserts:
     - the snapshots are equal;
     - the first text names both files "present", `soft`, `acme-internal`, the keys
       `enforcement` and `regulatory_regime`, and the change sentence;
     - the second says `src` has no CTOC settings of its own and is not a CTOC project root, and
       its `actions['Create its settings'] === 'menu settings src --create'`.
3. **1.3, refusals by folder rule, never the not-declared sentence.**
   - Given: the declaring glob `streams/*/.ctoc/settings.yaml` (which also covers
     `streams/out`), plus these fixtures:
     - `streams/out` → a junction to a folder outside the project;
     - `streams/inlink` → a junction to `src`;
     - `streams/linked/.ctoc` → a junction;
     - `streams/dangle/.ctoc/settings.yaml` → a file link to a missing path;
     - `streams/outfile/.ctoc/settings.json` → a file link to a file outside;
     - `streams/regs/.ctoc/regulatory-regimes` → a junction;
     - `streams/ctocfile/.ctoc`, a regular file.
   - Act and assert: for each of the following, `reason` equals the expected code:
     - `..`, `streams/../..` → `parent-segment`;
     - an absolute path (`path.join(root, 'streams', 'alpha')`) → `absolute`;
     - `streams/out` → `link`, and the text says it leads outside;
     - `streams/inlink` → `link`, without "outside";
     - `.` → `root`;
     - `.ctoc/approvals`, `streams/alpha/.git`, `streams/alpha/.CTOC` → `ctoc-or-git`;
     - `streams/nope` → `missing`;
     - `streams/linked` → `ctoc-link`;
     - `streams/dangle`, `streams/outfile` → `settings-link`;
     - `streams/regs` → `profiles-link`;
     - `streams/ctocfile` → `ctoc-not-folder`;
     - `streams/alpha --set agents.maxParallelAgents=2` → `flag`, and the text names `--create`
       and `--by`.
   - Also asserts:
     - no text matches `/No plan being built/`;
     - the snapshot is equal before and after the whole list;
     - `.ctoc/logs/nested-settings.jsonl` is absent.
4. **1.4, the log.**
   - Act:
     - case 1's create;
     - `menu(root, 'streams/beta', '--create')`;
     - a refused call and an all-present call;
     - a third folder, `streams/gamma2`, created with `--by` set to `'a\nb\x1b[2J' + 'x'.repeat(100)`.
   - Asserts: the log holds exactly three JSON lines.
     - Each has `at` (an ISO string), `folder`, `created`, `declaringPlan` (`in-progress/<slug>`),
       `declaredIn: 'this checkout'` and `writer: 'the menu'`.
     - The requesters are `builder-7 (declared, not verified)`, `not declared`, and a value with
       no character below `0x20`, at most 80 characters before the suffix.
     - That same cleaned value appears in the create's text.
5. **1.5, the folder resolves as its own root with the repository's regime.**
   - Given: a plan declaring only `streams/alpha/.ctoc/settings.json`.
   - Act: `--create`, then `describeProjectRoot(path.join(root, 'streams', 'alpha', 'deep'))`
     after `mkdir deep`.
   - Asserts:
     - the root is `streams/alpha`;
     - both settings files were created;
     - the profile was copied byte for byte;
     - `resolveEnforcementMode(nested).mode === resolveEnforcementMode(root).mode`;
     - `loadActiveProfiles(nested).profiles` deep-equals the root's;
     - `unloadableProfiles(nested)` is `[]`.
6. **1.6, the write protection is unchanged.** The real hook runs as a child process with real
   payloads (the shape of `tests/protect-records.test.js` lines 44–78).
   - Asserts:
     - Write `streams/alpha/.ctoc/settings.yaml` gives exit 2 and stderr exactly the settings
       sentence (`protect-records.js` lines 125–127, copied as a literal like
       `protect-records.test.js` line 24);
     - Write `.ctoc/approvals/x.json` and Write `.ctoc/state/verify/x.json` give exit 2 and the
       record sentence.
   - Then the hook's own function, without editing the hook:
     - `m = new Module(HOOK, module); m.filename = HOOK; m.paths =
       Module._nodeModulePaths(path.dirname(HOOK)); m._compile(fs.readFileSync(HOOK, 'utf8') +
       '\nmodule.exports = { subagentMayRunRoute };\n', HOOK)`. This is the same compile
       `require` performs. `require.main !== m`, so `main()` does not run.
     - Assert `subagentMayRunRoute` returns `false` for:
       - `['menu','settings','streams/alpha']`;
       - `['menu','settings','streams/alpha','--create','--by','builder-7']`;
       - `['menu','task','sweep']`;
       - `['menu','task','sweep','--confirm','none']`.
     - Control, so the function is not vacuously false: `true` for `['menu','task','list']`.
7. **1.7, a plan that needs the file can finish, from the claiming checkout and from a git
   worktree.**
   - Given:
     - `makeProject()` plus `package.json` `{ name, version, main: 'src/x.js', scripts: { test:
       'node -e "process.exit(0)"' } }`, the shape of `tests/last-mile-wired.test.js` lines
       66–69;
     - a plan `p17` in `plans/todo/`, approved, declaring `streams/alpha/.ctoc/settings.yaml`,
       steps ticked and one open item "- [ ] `streams/alpha/.ctoc/settings.yaml` exists";
     - `git init`, then `git add -A` and `git commit` with `GIT_COMMITTER_DATE=2020-01-01T00:00:00Z`.
   - Claim through the menu's real claim: `actions.startAgent(root)` gives `started: true` and
     moves `p17` to `in-progress` in this checkout only. Then `git worktree add <tmp>/wt -b
     builder-wt`. In the worktree the plan is in `todo/`.
   - From the worktree:
     - the real hook, with `{ tool_name: 'Bash', agent_id: 'a1b2c3', cwd: wt, tool_input: {
       command: 'node "<REPO>/src/commands/start.js" menu settings streams/alpha --create --by
       builder-7' } }`, exits 0 with empty stdout;
     - that command, run as a child process with `cwd: wt` through `execFileSync(process.execPath,
       [MENU, 'menu', 'settings', 'streams/alpha', '--create', '--by', 'builder-7'], { cwd: wt })`,
       gives `ok: true`;
     - `wt/streams/alpha/.ctoc/settings.yaml` equals the worktree's own `.ctoc/settings.yaml`;
     - `root/streams/alpha/.ctoc` is absent;
     - the worktree's log line names `in-progress/p17` and `declaredIn: 'the main worktree'`.
   - From the claiming checkout: the same command with `cwd: root` creates
     `root/streams/alpha/.ctoc/settings.yaml`, and its log says `this checkout`.
   - Finish: tick the item in `plans/in-progress/p17.md`, then
     `ms.route(['menu','task','complete', id], root)` gives `ok: true`. The plan is in
     `plans/review/`, and `.ctoc/state/verify/p17.json` exists.
   - The same background-agent payload, with the folder argument
     `streams/alpha/.ctoc/settings.yaml`, gives exit 2 with the settings sentence.
     `menu(root, 'streams/alpha/.ctoc/settings.yaml', '--create')` gives `reason ===
     'ctoc-or-git'`, and the snapshot is unchanged.
8. **1.8, undeclared means refused.**
   - Given:
     - a plan in `todo/`, approved, declaring `streams/alpha/.ctoc/settings.yaml`;
     - a plan in `in-progress/` without an approval record, declaring `src/.ctoc/settings.yaml`;
     - a plan in `in-progress/`, approved, declaring `streams/beta/.ctoc/settings.yaml` and
       `**/.ctoc/settings.yaml`, with no `unanchored_scope`;
     - `streams/gamma/.ctoc/` holding both files.
   - Act: `--create` on `streams/alpha` (no `--by`), on `src` with `--by builder-7`, and on
     `streams/gamma`.
   - Asserts:
     - each `reason === 'not-declared'`, and its text names its folder;
     - the snapshot is unchanged;
     - no log file exists;
     - `menu(root, 'src')` still says `src` is not a CTOC project root.
9. **Worktree lookup cannot answer.** Given `<root>/.git` is a file `gitdir: <root>/nowhere`
   and no declaring plan in this checkout, `--create` gives `reason === 'not-declared'`. The text
   holds "and in its repository's main worktree", and nothing is written.
10. **Argument faults.** Each of the following gives its reason, and the snapshot is unchanged:
    - `menu(root)` → `no-folder`;
    - `menu(root, 'streams/alpha', 'x')` → `extra-word`;
    - `menu(root, 'streams/alpha', '--by', 'me')` → `by-without-create`;
    - `menu(root, 'streams/alpha', '--create', '--by')` → `by-missing`;
    - `menu(root, 'streams/alpha', '--create', '--by', '--create')` → `by-missing`;
    - `menu(root, 'a\x07b')` → `control-character`;
    - `menu(root, 'streams\\alpha')`, read-only → accepted as `streams/alpha`.
11. **File faults, injected on the `safe-fs` exports object** and restored in `afterEach`, for
    the coverage floor of 99 (`.ctoc/coverage-baseline.json`):
    - (a) `lstatSync` throws `EACCES` for `streams/alpha` → `unreadable`.
    - (b) `mkdirSync` throws `EACCES` for `<alpha>/.ctoc` → `folder-failed`, nothing created,
      no log.
    - (c) `mkdirSync` really creates the folder and then throws `EEXIST`, a race → the files are
      created.
    - (d) `writeFileSync` throws `EEXIST` on `settings.json` → `settings.yaml` created and
      named; the text names the failure; the log line has `created` holding only the yaml and a
      `failed` field.
    - (e) `appendFileSync` throws `EIO` → files created, and the text says the write log could
      not be updated.
    - (f) `regime.loadActiveProfiles` throws → `regime-unreadable`, nothing written.
12. **Copy-set edges.**
    - (a) The project has no `.ctoc/settings.json` → only the yaml (and the profile) is created,
      with the note.
    - (b) An active shipped profile, `gdpr`, alongside `acme-internal` → only `acme-internal` is
      copied, with the note.
    - (c) `streams/alpha/.ctoc/regulatory-regimes/acme-internal.yaml` is a file link →
      `profile-link`, nothing written.
    - (d) The project's own `.ctoc/settings.json` is a link → treated as having no file to copy.
13. **Read-only edges.**
    - The folder's `settings.json` is `not json` → "could not be read as JSON".
    - It is `[1]` → "is not a JSON object".
    - `regime.unloadableProfiles` throws → "could not be read".

**Coverage target:** 100% of `src/lib/nested-settings.js` reachable lines, measured by `npm test`.
**Independence:** every case makes its own temporary project and restores every injected
function in `afterEach`.

### Security Review

- [x] **Path traversal.** These are refused before any join:
  - `..` in any segment, absolute paths, drive letters and UNC prefixes;
  - `.ctoc` and `.git` segments in any letter case;
  - every symbolic link on the folder's path, on `.ctoc`, on the settings files, on the profile
    folder and on each profile target (`lstat`, never `stat`).

  Exclusive create (`wx`) closes the race between the check and the write, a dangling link
  included. The source files are read only when `lstat` shows a regular file.
- [x] **Input validation.**
  - Every word passes its own parser, which never touches `parseTaskArgs`, the hook's reader.
  - `--by` is control-stripped and capped at 80.
  - Every interpolated value in a screen sentence is stripped and capped at 120.
- [x] **No secrets.** The log names files and never contents. The read-only screen shows key
  names and never values.
- [x] **Safe file operations.** It writes only the following:
  - `<folder>/.ctoc/settings.yaml` and `<folder>/.ctoc/settings.json`;
  - `<folder>/.ctoc/regulatory-regimes/<name>.yaml`;
  - `<root>/.ctoc/logs/nested-settings.jsonl`;

  plus the two folders `ensureFolder` makes. No path is written that the rules above did not
  admit.
- [x] **Error messages.** Only error codes and project-relative paths. Never an absolute path
  (the `absolute` refusal echoes the caller's own word, stripped and capped) and never a stack.
- [x] **Prototype pollution.** Settings JSON is parsed only to list `Object.keys`. Nothing is
  merged.
- [x] **Command injection.** `spawnSync('git', ['worktree','list','--porcelain'], { shell: false
  })` takes no caller text.
- [x] **Authority.**
  - The route writes only where `findCoveringPlan`, the same oracle the edit hook trusts, finds
    an approved plan in `plans/in-progress/` declaring the file. That plan is in this checkout,
    or in the repository's main worktree when the call comes from a linked worktree.
  - A plan an agent writes into `plans/in-progress/` grants nothing without its approval record
    (`plan-coverage.js` lines 27–46).
  - The route is not on the background-agent list (scenario 1.6).

### Architecture checks

- The dependency direction is `lib` to `lib`. The new module requires nothing from `hooks/` or
  `commands/`.
- Single responsibility: one route.
- Open/closed: `plan-coverage.js` (protected), `regulatory-regime.js`, `enforcement-mode.js` and
  `project-root.js` are called, not edited.
- Cross-platform:
  - paths go through `path.join` and `path.posix.normalize` on input;
  - git is called with an argument list and `windowsHide`;
  - folder links are junctions in the tests.

## Acceptance Criteria Mapping

| Criterion | Implemented in | Test case |
|---|---|---|
| 1.1 create as a copy, second call writes nothing | `planCopies`, `createCopies` | 1 |
| 1.2 show without writing | `readOnlyScreen` | 2 |
| 1.3 refusals by folder rule; `--set` refused; links on every target | `parseArgs`, `checkFolder`, `planCopies` | 3, 12c |
| 1.4 every write logged with who asked | `createCopies` step 4, `requesterLabel` | 4, 11d, 11e |
| 1.5 the folder resolves as its own root with the same regime | profile copy in `planCopies` | 5 |
| 1.6 write protection unchanged | no hook edit | 6 |
| 1.7 the plan can finish; the background agent's call gets through | `findDeclaringPlan` (both checkouts), the router | 7 |
| 1.8 undeclared means refused | `findDeclaringPlan`, check order | 8, 9 |
| Decision 30 (never overwrite, all-present writes nothing) | `createCopies` step 1, `wx` | 1, 11d |
| Gate critic input 1 (worktree) | `findDeclaringPlan`, `mainWorktree` | 7, 9 |
| Gate critic input 2 (links on copied files) | `checkFolder` 7–8, `planCopies`, `wx` | 3, 12c |

## Risk Mitigations

| Risk | Mitigation | Where |
|---|---|---|
| A covering glob plants settings where they must not go | Folder rules run before the declaration (decision 34) | `checkFolder`, case 3 |
| A link redirects the write | `lstat` on every segment and target, plus `wx` | `checkFolder`, `planCopies`, `createCopies` |
| The git lookup reads the wrong checkout | It only runs from a linked worktree; any git fault means no plan (fail closed) | `findDeclaringPlan`, case 9 |
| A half-written copy goes unseen | The answer and the log name exactly what was created and what failed | `createCopies`, case 11d |
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
- **S1-2. A linked worktree also reads the main worktree's plans** (question `q10`,
  Recommended). The reasons are above, under "Where the route can run". It writes only into the
  calling checkout.
- **S1-3. Linked targets are refused among the folder rules, before the declaration.** A linked
  `settings.yaml` that points outside also defeats `findCoveringPlan`'s real-path check, which
  would otherwise produce the wrong sentence. Profile files can only be checked once the profile
  names are known, so they get the same refusal in the presence phase, before any write.
- **S1-4. The read-only screen lists key names, never values.** It is enough to tell whether the
  folder has its own settings. Values are changed and read on the folder's own Settings screen,
  as decision 26 says.
- **S1-5. A project's own profile is copied only when it is a regular file in the project's own
  folder.** A profile that exists only in CTOC's shipped folder is read from that folder from
  the nested root too (`regulatory-regime.js` lines 271–282). So nothing needs copying, and the
  regime stays the same.
- **S1-6. When the project's own regime cannot be read, nothing is created.** A partial copy
  would give the nested root a different regime than the repository, which is exactly what
  decision 16 forbids.
- **S1-7. `subagentMayRunRoute` is reached through `Module.prototype._compile` on the hook's own
  source with one appended export line.** The hook exports nothing and its background-agent
  refusals are switched off (`protect-records.js` line 597). This is the only way to test the
  real function body without changing a hook file (decision 3). `_compile` is what `require`
  itself runs.
- **S1-8. The log is JSON Lines at `.ctoc/logs/nested-settings.jsonl`.** That folder is ignored
  by the gitignore lines CTOC's setup writes (`init-project.js`, per the parent plan's line 75),
  and appending one line is atomic enough for an audit trail that is never read back as a
  correctness input.

## Execution Plan

### Step 8: TEST
Write `tests/nested-settings-route.test.js` with cases 1–13 above, FIRST, before any source file
changes.

- Run `node --test tests/nested-settings-route.test.js` and record the output in the build
  record. Expected red: every route case fails, because `route(['menu','settings',…])` falls
  through to the dashboard (`menu-screens.js` line 2807) and returns no `reason`. Case 7 also
  fails at the child process.
- Case 6 is a pin of today's hook and is expected GREEN from the start. Record it as a
  characterization test, not as test-driven red.
- Write the `tests/cache-freshness.test.js` whitelist entry in Step 10, not here. Before the
  module exists, the honesty case would fail for a reason unrelated to behaviour.

### Step 9: PREPARE
- Re-read the lines this plan cites, and stop and report any that moved:
  - `menu-screens.js` 2791–2807;
  - `plan-coverage.js` 439–451, 518–645;
  - `protect-records.js` 125–159, 350–365, 597–606;
  - `start.js` 621–626, 708–798;
  - `regulatory-regime.js` 189–200, 271–282, 362–369.
- Confirm that `git --version` supports `worktree list --porcelain` (git ≥ 2.7). Record the
  version.

### Step 10: IMPLEMENT
- `src/lib/nested-settings.js`: CREATE exactly as specified. `settingsRoute` is the only export.
  Every file call goes through `safeFs.<fn>`. There is no `new RegExp` and no regex literal with
  a control character (stripping reuses `tui.stripCtl`). Every function has JSDoc.
- `src/lib/menu-screens.js`: the require, the router line, the Usage line.
- `tests/cache-freshness.test.js`: the whitelist entry.
- `src/commands/start.md`: the table row.
- `docs/ENFORCEMENT.md`: the writer clause and the refused-route row.
- `CLAUDE.md` and `README.md`: the five count edits.

### Step 11: REVIEW
iron-loop-critic reads the diff against this plan. It checks:

- the check order: flags, then folder rules, then declaration, then presence;
- every `lstat` site;
- that `wx` is on every write;
- that no `parseTaskArgs` change was made;
- the refusal table matches the code.

### Step 12: OPTIMIZE
- `mainWorktree` spawns git only on the fallback path: a linked worktree whose own checkout
  holds no declaring plan.
- Confirm no other code path spawns a process.

### Step 13: SECURE
security-scanner reviews the new module against the Security Review above. Its focus:

- link handling;
- `wx`;
- the git call;
- log content;
- that no absolute path appears in any sentence.

### Step 14: VERIFY
- Run `npm run lint` (eslint, `--max-warnings 0`).
- Run `npm run typecheck`.
- Then run `npm test`: the gated entry point, which holds the full suite, the coverage floor in
  `.ctoc/coverage-baseline.json` (`minPct` 99) and zero skipped.
- All must pass with `# fail 0`.
- The new module must report 100% of its reachable lines.

### Step 15: DOCUMENT
- Confirm that the start.md row and the `docs/ENFORCEMENT.md` lines match the shipped behaviour,
  word for word with the refusal table.
- Confirm that the CLAUDE.md and README.md counts equal disk (`tests/readme-numbers.test.js`).

### Step 16: FINAL-REVIEW
iron-loop-critic checks scenarios 1.1–1.8 one by one against the passing test names and the
wiring table. It confirms no file under `src/hooks/` changed (`git diff --stat -- src/hooks`
empty), and that the question `q10` answer, if given, matches what was built.
