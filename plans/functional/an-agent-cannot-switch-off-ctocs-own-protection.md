---
title: "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection"
type: functional
status: functional
created: 2026-10-19
priority: high
effort: small
depends_on:
  - a-background-agent-cannot-change-claude-codes-settings
  - the-write-protection-compares-real-files-not-spellings
files:
  - src/hooks/protect-records.js
  - tests/protect-records.test.js
  - docs/ENFORCEMENT.md
acceptance_criteria_count: 12
risk_level: HIGH
---

# A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection

Written by the product owner on 2026-10-19, dispatched by the CTO Chief. There is no parent
vision: the problem was found while building the settings-file fix and is listed as the critical
neighbour by every security review of that fix. Every claim below is labelled **measured** (the
owner's or the CTO Chief's measurement, cited as given in the dispatch or in the plan named),
**read** (read in this worktree's files this session), **believed** (recall, not checked here)
or **to verify** (checked by a named step before anything is built on it). Nothing was run by
the product owner.

**What this plan claims, and no more:** a background agent (a call whose hook input carries a
non-empty `agent_id`) is refused when it writes the code or the registration of the hook Claude
Code actually runs for CTOC — by an editing tool, compared by file identity (the real fix), and
by a shell command whose text names those files (a guard against honest mistakes, by the owner's
decision of 2026-10-15). It holds while the loaded hook is intact and while no code has run
outside a tool call (a hook declared elsewhere, an MCP server): it is not a containment boundary;
isolating agents is.

## Problem Statement

**Measured** (dispatch, 2026-10-15 to 2026-10-19): Claude Code loads CTOC's one hook from the
installed plugin's own files in the plugin cache,
`<config folder>/plugins/cache/<marketplace>/ctoc/<version>/hooks/hooks.json` and
`…/src/hooks/protect-records.js` with the `src/lib/` modules it requires. A background agent's
Write or Edit to those files is allowed today (exit 0). The hook runs as a fresh process on
every tool call, so a changed file takes effect on the very next call.

So one write by any background agent switches off every protection CTOC has: the approval and
check records, the owner's answers, the regulatory settings, and the settings-file refusal the
owner ordered on 2026-10-15 ("fix that gap"). `docs/ENFORCEMENT.md` states it as a limit
(**read**, lines 549–551): "until that is built, the settings protection holds only while the
loaded hook is intact". The person hurt is the owner: his gates and records are only as strong
as the hook's own files.

**Read** in this worktree:

- `hooks/hooks.json` registers one command, `node "${CLAUDE_PLUGIN_ROOT}/src/hooks/protect-records.js"`,
  on `PreToolUse` for Write, Edit, MultiEdit, NotebookEdit and Bash.
- `src/hooks/protect-records.js` line 502: `PLUGIN_ROOT = path.resolve(__dirname, '..', '..')`.
  The running hook already knows the folder it was loaded from, by its own location, without
  trusting an environment variable.
- `src/hooks/protect-records.js` `configDir()` (lines 280–288): the active config folder is
  `CLAUDE_CONFIG_DIR` when set and not empty, else `<home>/.claude`. `protectedSettingsFiles`
  and `isAgentSettingsTarget` already refuse a background agent's writes to the settings files
  by file identity and folded name; this plan reuses that machinery for a new set of targets.
- What decides which code runs as CTOC's hook is wider than the two files measured:
  - the loaded plugin folder itself: `hooks/hooks.json`, `.claude-plugin/plugin.json`, the hook
    script and every module it requires now or later (the hook lazily requires parsers from
    `start.js` and `menu-screens`, so the set of required files grows over time);
  - `<config folder>/plugins/installed_plugins.json`, whose `installPath` decides which folder
    loads next time (`src/commands/update.js` lines 22, 307–312, 424–434);
  - the marketplace clone `<config folder>/plugins/marketplaces/<marketplace>/`, which becomes
    the loaded code one update later: `update.js` runs `git reset --hard origin/main` there
    (line 337), which keeps untracked files, and then mirrors everything except `.git` into the
    cache (lines 384, 412), so a file planted in the clone lands in the loaded folder; the
    clone's `.git/config` remote decides what `git fetch` pulls.
- `src/commands/update.js` writes the cache from a child process of one Bash call
  (`node <…>/update.js`); the hook sees only that Bash command's text, never the child's writes.
  `src/commands/update.md` runs it as
  `node "$(find ~/.claude/plugins/cache/robotijn/ctoc -path '*commands/update.js' …)"`, and is
  marked `disable-model-invocation: true`.
- `src/commands/update.js` line 19 hard-codes `<home>/.claude/plugins` and ignores
  `CLAUDE_CONFIG_DIR` (listed under Neighbours).

**Measured** on 2026-10-18 (the settings plan's live check, `plans/review/a-background-agent-cannot-change-claude-codes-settings.md`,
"Step 16: live check"), Claude Code 2.1.300, permission mode `bypassPermissions`: a background
agent's Write carries `agent_id`, the main session's carries none, and the hook's exit 2 blocks
a Write and a Bash call in bypass mode. This plan rests on that, for the same hook.

**Believed** (the owner's sandbox note of 2026-10-14, not re-measured here): Claude Code's
sandbox refuses a background agent's shell writes outside the project, which would include the
config folder. The editing tools are not sandboxed (measured above: exit 0), so the editing-tool
check is the real fix and the shell check stays a mistake guard.

## Business Alignment

**Job to Be Done:** When I run background agents in bypass mode, I want any attempt by one of
them to change the hook CTOC's protections run in refused before it happens, so I can trust that
my gates, records and settings refusals still hold after the agent's next call.

**Impact Map:**
- **Goal:** CTOC's protections (records, regulatory settings, settings files) cannot be switched
  off by the agents they protect against.
- **Actor:** the owner, who runs background agents and relies on CTOC's gates.
- **Impact:** a background agent that tries to edit the loaded hook, its registration or what
  the next update installs is refused with a sentence telling it to report the change to the
  main session; the owner sees the refusal instead of a silently disabled hook.
- **Deliverable:** a new refusal in the loaded hook for background agents' writes into the
  loaded plugin folder and the active profile's plugins folder, with tests and the limits stated
  in `docs/ENFORCEMENT.md`.

Alignment checks: the goal traces to the measured gap (yes); the actor is the owner (yes); the
impact is observable as a refusal with exit 2 and an unchanged file (yes); the deliverable is
one functional area, the write protection of the hook's own files (yes).

## User Stories

**As the** owner, **I want** a background agent's editing-tool write to the code or registration
of the hook Claude Code runs for CTOC refused, **so that** one write cannot switch off every
CTOC protection on the next call.

**As the** owner, **I want** my own main session and CTOC's update route to keep changing those
files, **so that** I can repair, reinstall and update CTOC without a workaround.

**As the** owner, **I want** a background agent's honest shell mistake that would write those
files refused too, **so that** an agent that "fixes" the installed hook from the shell is stopped
the same way as one that uses an editing tool.

## Acceptance Criteria

Fixtures run the hook as a real process with a payload, as `tests/protect-records.test.js`
does; "the plugin folder" is a scratch copy laid out as
`<config folder>/plugins/cache/<marketplace>/ctoc/<version>/` with the hook running from it, and
"the config folder" is a scratch folder named through `CLAUDE_CONFIG_DIR`. "Refused" means exit
2, the refusal sentence on stderr, and the target's bytes unchanged.

Story 1 — editing tools, background agent:

- [ ] **Scenario: the loaded hook script cannot be rewritten**
  Given the hook is running from the plugin folder and the payload carries a non-empty `agent_id`
  When the agent Writes `<plugin folder>/src/hooks/protect-records.js`
  Then the call is refused, and the same holds for Edit of `<plugin folder>/hooks/hooks.json`, MultiEdit of `<plugin folder>/src/lib/real-path-confinement.js`, Write of `<plugin folder>/.claude-plugin/plugin.json`, and Write of a new file `<plugin folder>/src/lib/new-module.js`

- [ ] **Scenario: what loads next time cannot be changed**
  Given the same background agent
  When it Writes `<config folder>/plugins/installed_plugins.json`, or a file under `<config folder>/plugins/marketplaces/<marketplace>/` (its `src/hooks/protect-records.js`, a new untracked file, or `.git/config`)
  Then each call is refused

- [ ] **Scenario: another spelling of the same file is refused**
  Given the same background agent and an existing `<plugin folder>/src/hooks/protect-records.js`
  When it Writes that file through a symbolic link in the project that points at the plugin folder, through a hard link to the file made in the project, through a letter-case or long-s (`ſ`) spelling of a path segment, or through a path with `..`
  Then each call is refused (compared by device and inode, as the settings fix compares)

- [ ] **Scenario: CTOC's own builders can still build CTOC**
  Given a background agent working in a CTOC worktree that is not the plugin folder
  When it Edits the worktree's `src/hooks/protect-records.js` and `hooks/hooks.json`
  Then both calls are allowed (exit 0), as they are today

- [ ] **Scenario: the hook refuses when it cannot decide in time**
  Given a background agent's Write whose file-system walk fails or runs past the hook's existing 5-second budget
  When the target could be inside the plugin folder or the config folder's `plugins` folder
  Then the call is refused, never allowed

Story 2 — the owner and the update route keep working:

- [ ] **Scenario: the main session may change the hook's files**
  Given a payload with no `agent_id`
  When the main session Writes `<plugin folder>/src/hooks/protect-records.js` or `<config folder>/plugins/installed_plugins.json`
  Then the call is decided exactly as today (allowed, exit 0)

- [ ] **Scenario: the owner's update still installs**
  Given the main session
  When it runs the command in `src/commands/update.md`
  Then the hook allows the Bash call and the update script runs to its own end

- [ ] **Scenario: a background agent may run CTOC's own update script and nothing else there**
  Given a background agent
  When it runs `node <plugin folder>/src/commands/update.js` as one simple call, the script having the same real path as the loaded plugin's own update script
  Then the call is allowed, and a call of an update script at any other real path, or with any extra word, pipe, redirect or `$(…)`, is refused (this scenario follows the recommended answer to the question "may a background agent still update CTOC"; with the other answer every background update call is refused)

Story 3 — the shell, as a mistake guard for background agents:

- [ ] **Scenario: an honest shell write to the hook's files is refused**
  Given a background agent
  When it runs `echo x > "${CLAUDE_PLUGIN_ROOT}/src/hooks/protect-records.js"`, `cp x.json ~/.claude/plugins/installed_plugins.json`, `sed -i '' s/a/b/ "$HOME/.claude/plugins/cache/<marketplace>/ctoc/<version>/hooks/hooks.json"`, or the same with the absolute config-folder path
  Then each call is refused

- [ ] **Scenario: reading the hook's files from the shell stays allowed**
  Given a background agent
  When it runs `cat "${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json"`, `ls ~/.claude/plugins/cache`, or `git add src/hooks/protect-records.js` in a CTOC worktree
  Then each call is allowed

- [ ] **Scenario: the existing protections keep their order and sentences**
  Given a background agent's call that writes both a record and the plugin folder, or a regulatory settings file
  When the hook decides it
  Then it is refused with the records or regulatory-settings sentence as today, and every existing case in `tests/protect-records.test.js` still passes unchanged

- [ ] **Scenario: live, in a real session**
  Given a real Claude Code session in bypass mode whose config folder is a scratch folder named through `CLAUDE_CONFIG_DIR`, with the new CTOC version installed into that scratch folder, so nothing in the owner's own profile is touched
  When a background agent Writes the installed `src/hooks/protect-records.js` and then runs `echo x >> "${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json"`, and the main session then makes a one-byte Edit to the same script and reverts it
  Then the agent's two calls are refused with the new sentence and the installed files are byte-identical afterwards, and the main session's Edit goes through; the permission mode is read from the session and recorded

## Scope

### In Scope

- Background agents' editing-tool writes (Write, Edit, MultiEdit, NotebookEdit) into the folder
  the running hook was loaded from (`PLUGIN_ROOT`, by the hook's own location), by file identity
  and by folded name, existing targets and fresh creates — scenarios "the loaded hook script",
  "another spelling", "refuses when it cannot decide in time".
- Background agents' editing-tool writes anywhere under the active config folder's `plugins`
  folder: the cache of every plugin, the marketplace clones, `installed_plugins.json`,
  `known_marketplaces.json` — scenario "what loads next time".
- Background agents' shell writes whose text names the loaded plugin folder or a `plugins`
  folder of the active config folder, including the spellings an honest agent types
  (`${CLAUDE_PLUGIN_ROOT}`, `~/.claude/plugins`, `$HOME/.claude/plugins`,
  `$CLAUDE_CONFIG_DIR/plugins`, the absolute path) — scenarios in story 3.
- The exemption for CTOC's own update script run as one simple call, recognised by real path —
  scenario "a background agent may run CTOC's own update script" (subject to the owner's answer).
- No change for the main session; CTOC worktrees stay buildable — scenarios "main session",
  "owner's update", "CTOC's own builders".
- The new refusal sentence and its limits in `docs/ENFORCEMENT.md`, and replacing the stated
  limit at lines 549–551 — scenario "live" proves the documented claim.

### Out of Scope

Each item below is seen and not built here; scheduling is the owner's. They are listed under
Neighbours.

- Hooks declared in `.claude/agents/*.md` (subagent frontmatter) or in skill frontmatter.
- `.mcp.json` and the user-level `.claude.json` (MCP servers).
- The file passed with `--settings`.
- The owner's other Claude profile folders beside the active config folder (subject to the
  owner's answer to the update question; the recommended answer keeps them out).
- Managed settings files (need administrator rights).

## Risks

### Technical Risks

- Code outside a tool call: a hook declared in an agent or skill file, or an MCP server, runs any
  code without passing through this hook and can rewrite the plugin folder directly.
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: State it in the plan's claim and in `docs/ENFORCEMENT.md`; list those files under
    Neighbours for the owner to schedule.
- Shell routes the text cannot read: a script written then run, a path in another variable or
  built at run time, `sh -c`, `git -C` into the marketplace clone, an archive extracted over the
  folder.
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: State them as limits, as the settings fix does; rely on the sandbox (believed) and
    on isolating agents as the real barrier (owner, 2026-10-15).
- A plugin that keeps its own data under `<config folder>/plugins/` and expects a background agent
  to write it there would be refused (believed: Claude Code gives plugins a data folder there; CTOC
  writes none).
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Verify at the planning step which subfolders of `plugins/` Claude Code itself
    documents; state the refusal of a plugin data folder as an accepted false refusal.
- If the plugin is loaded from a working copy (`--plugin-dir` pointing at a CTOC checkout),
  that checkout is the loaded folder and background agents cannot build CTOC in it.
  - Likelihood: LOW (CTOC is installed from the marketplace only)
  - Impact: MEDIUM
  - Mitigation: State it as a limit; build in a worktree, which is a different folder.
- Added time on every background agent's call: one or two more identity comparisons per target
  and one more text spec per shell segment.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Measure at the optimise step with the 128-operand command the settings fix used.

### Business Risks

- The owner's standing order that CTOC updates run in background agents across his profiles:
  a refusal that catches the update route breaks that routine.
  - Likelihood: HIGH if the update route is not exempted
  - Impact: MEDIUM
  - Mitigation: Ask the owner (question "may a background agent still update CTOC"); the
    recommended answer keeps the routine.
- The update exemption does not close the marketplace clone: `update.js` installs what is on
  GitHub main plus anything already planted in the clone (untracked files survive
  `git reset --hard`; `.git/config` decides the remote). The clone is refused to the editing
  tools by identity, and on the shell only by the mistake guard.
  - Likelihood: LOW
  - Impact: HIGH
  - Mitigation: State it in `docs/ENFORCEMENT.md` and in the update question, as a fact.
- **To verify** before the exemption is built: whether the sandbox already refuses `update.js`
  run from a background agent's Bash call (believed: the sandbox refuses a background agent's
  shell writes outside the project). If it does, the exemption buys nothing on that platform.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Measure it at the planning step in a scratch config folder; record the result
    in the implementation plan.

### Dependency Risks

- This plan reuses the identity and folded-name machinery of the settings fix (in review) and of
  the real-files fix (in progress), and edits the same three files.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Build after both, on their result; the scheduler builds plans that share a file
    one at a time.
- The background-agent menu rule (`docs/ENFORCEMENT.md` lines 407–442, **read**) refuses a
  background agent's call of anything under a CTOC `src/commands/` folder other than the menu.
  It is switched off today by the owner's order of 2026-10-15 (lines 307–309). When the line of
  work that re-plans that switch turns it back on, `node <installed CTOC>/src/commands/update.js`
  is refused whatever this plan allows.
  - Likelihood: HIGH, once the switch is turned back on
  - Impact: MEDIUM
  - Mitigation: Add the same update exemption to that rule in this plan's build, or name it in
    the plan that re-plans the switch; the implementation planner decides which, by which
    builds first.
- A future Claude Code that stops sending `agent_id` makes every call read as the main session's,
  and the refusal does nothing.
  - Likelihood: LOW
  - Impact: HIGH
  - Mitigation: Keep the live scenario in the final review of every release that changes the hook.

## Priority

**Priority: HIGH** (Score: 8/9)
- Dependency: 3 — the settings-file fix and every other protection hold only while this holds.
- Business Impact: 3 — the measured gap switches off every gate record and refusal with one write.
- Technical Risk: 2 — reuses tested identity machinery; the new parts are the target set and the
  update exemption.

## Decisions Taken Under Ambiguity

1. **The protected unit is a folder, not a list of files.** The loaded plugin folder (by the
   hook's own location) and the active config folder's whole `plugins` folder. A file list would
   miss modules the hook requires later, `plugin.json`, the registry and the marketplace clone,
   all of which decide what runs. One rule covers them. Searched: the pattern
   `plugins[/\\](cache|marketplaces)|installed_plugins|known_marketplaces` over `agents/`,
   `skills/`, `src/`, `.ctoc/`, `hooks/` and `.claude-plugin/` matched 17 files: `src/commands/update.js`
   and `src/commands/update.md` (the update route, handled by the update question), and 15 files
   under `.ctoc/audit/`, which are notes and records of past runs, not instructions an agent
   follows (only the matched lines were read, not their full context). No agent or skill file
   tells an agent to write into a plugins folder. CTOC's builders work in worktrees, and the
   update writes from a child process the hook never sees.
2. **"The folder the hook was loaded from" is read from the hook's own location**
   (`__dirname`), not from `CLAUDE_PLUGIN_ROOT`: it is the code that is actually running.
   `${CLAUDE_PLUGIN_ROOT}` in a shell command is read as that same folder, as the menu exemption
   already does.
3. **Other plugins' caches are covered too.** Another plugin's `hooks/hooks.json` also runs code on
   every call; the whole `plugins` folder is the same mechanism.
4. **Background agents only.** The main session is the owner's; every call without `agent_id` is
   decided exactly as today, as in the settings fix.
5. **The refusal is its own sentence:** "CTOC refused this call because a background agent may not
   change the plugin code or plugin registration Claude Code runs as hooks; report what you wanted
   to change and let the main session make the change." The implementation planner may tighten
   the wording, not the meaning.
6. **Order:** the records and regulatory-settings checks run first, then the settings check, then
   this one, so a fault in new code never masks an existing refusal. On the shell it runs where
   the background agent's settings shell check runs (inside the owner's switch of 2026-10-15).
7. **Fail closed** under the existing 5-second budget, as every check that could let a call through
   does today.
8. **Reading stays allowed** on both channels.

## Neighbours (seen, not built here; scheduling is the owner's)

- Hooks declared in `.claude/agents/*.md` (subagent frontmatter) and in skill frontmatter: an agent
  that writes one plants code that runs outside any tool call. In user projects those files are
  ordinary build targets, so a refusal there has a false-refusal cost this plan does not take on.
- `.mcp.json` and the user-level `.claude.json` (MCP servers): a server starts with any command.
  `.claude.json` is also rewritten by Claude Code itself (believed), so an identity rule there
  needs its own measurement.
- The file passed with `--settings`: the hook cannot see the parent process's arguments
  (believed).
- The owner's other Claude profile folders beside the active config folder (unless the owner
  answers the update question with the option that protects them).
- `src/commands/update.js` line 19 hard-codes `<home>/.claude/plugins` and ignores
  `CLAUDE_CONFIG_DIR` (**read**): run in a profile with another config folder, it updates a cache
  that profile does not load.
- Hook and status-line scripts that existing settings already run, and `.npmrc` `node-options`
  (already listed by the settings fix).
- Tools other than the five matched (an MCP filesystem server, a future tool).
