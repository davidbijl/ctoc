---
title: "A menu route writes the deployment block and the entry point, on the owner's OK"
type: implementation
created: 2026-10-19
priority: high
effort: medium
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s25-a-record-the-menu-wrote-can-be-staged-and-committed, four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s21-background-agents-do-not-open-the-dashboard, four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s19-agent-text-never-reaches-the-shell-unquoted
files:
  # THE SLICE'S OWN FILES (nine, over the ~1–3 budget; Decision 14): the route, its writer, the
  # reader it shares with the check run, the two texts that drive it, the document, and three tests.
  - src/lib/menu-screens.js
  - src/lib/settings.js
  - src/lib/app-runner.js
  - src/commands/start.md
  - agents/infrastructure/deployment-setup.md
  - docs/ENFORCEMENT.md
  - tests/a-menu-route-writes-the-deployment-block.test.js
  - tests/agent-tool-grants.test.js
  - tests/menu-task-wiring.test.js
  # RATCHET FILES — the new test file moves the test-file count: CLAUDE.md is required at the
  # implementation → todo crossing by src/lib/documented-counts.js, and README.md's count line is
  # asserted against disk by tests/readme-numbers.test.js (lines 321-323).
  - "CLAUDE.md"
  - README.md
---

# A menu route writes the deployment block and the entry point, on the owner's OK

Slice 29 of `plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`.

Names used in this plan:
- **the settings change**: `…-s25-a-record-the-menu-wrote-can-be-staged-and-committed.md`, revision 4 (in
  `plans/implementation/`). It closes `.ctoc/settings.json` to every tool, for every session.
- **the decision-route plan**: `…-s21-background-agents-do-not-open-the-dashboard.md`, revision 4 (in `plans/todo/`). A
  background agent may run the menu only for its read-only views and its own completion, and no CTOC code that writes
  records or settings.
- **the shell-unquoted plan**: `…-s19-agent-text-never-reaches-the-shell-unquoted.md` (in `plans/implementation/`). It
  builds the payload channel: a file in `.ctoc/state/payloads/`, read by the menu through `readPayloadFile`.
- **the nested-settings plan**: `plans/implementation/real-projects-do-not-stall-on-the-menu-s1-settings-route.md`. It
  adds the route `menu settings <folder>`.

Every line number below was read on 2026-10-19 in the main checkout. "Its line" means a line of the named plan file.

## The owner's decisions this plan carries

- **2026-10-18:** a menu route writes the deployment block into `.ctoc/settings.json` on the owner's OK (the settings
  change's decisions list, its line 95; the decision-route plan, its line 263).
- **2026-10-19, the settings change's entry-point question** (`q14-entry-point-has-no-route-r1792327921096`, key 1, the
  answers log line 208 as the settings change records it): the last-mile message and the document tell the human to add
  the entry point by hand, and a menu route for it joins the findings. The settings change's Finding 10 hands that route
  to this plan: "write `general.entry_point` as well as the `deployment` block, and then change
  `src/lib/app-runner.js`'s two sentences and `docs/ENFORCEMENT.md`'s entry-point paragraph to name its route".
- **2026-10-19, "fix it":** asked how a deployment block should get into the protected file, the owner answered that a
  menu route writes it on his OK. The coordinator's brief relays it; no answers-log line holds it.

## Problem Statement

**The file is closed, and two documented writers lose their way in.** The settings change protects
`.ctoc/settings.json` like `.ctoc/settings.yaml`: every Write, Edit, MultiEdit, NotebookEdit and shell write is refused,
for the main session and background agents alike (its Technical approach, item 3). The file holds three things a
person sets:
- `general.entry_point`, the command the check run executes (`ENTRY_POINT_KEY`, `src/lib/app-runner.js` line 120, read
  raw by `readDeclaredEntryPoint`, lines 147-187);
- the `deployment` block that `src/lib/deployment.js` reads (`getDeploymentConfig`, lines 58-72);
- the push switch, which the menu already toggles (`src/lib/settings.js` line 94).

After the settings change, two of them have no way in but a hand edit outside Claude Code:
- **The deployment block.** Today `agents/infrastructure/deployment-setup.md` line 490 has the agent report its block
  and the main session write it with the owner's OK. With the file closed to every tool the main session cannot, so
  the settings change rewrites that paragraph into a hand-over to the user (its item 5).
- **The entry point.** `NO_DECLARATION_SUFFIX` (`src/lib/app-runner.js` lines 123-126) and the malformed reason (lines
  158-159) tell the reader to set or fix the key in the file. The settings change makes both say "by hand" and names
  this plan as the one that makes them name a route (its `app-runner.js` section and Finding 10).

**No CTOC writer can set one key safely.** `setSetting` (`src/lib/settings.js` lines 279-289) reads through
`readRawSettings` (lines 177-185), which answers `{}` for a file that is not valid JSON, so a write on such a file drops
every other key. It sets `raw[category][key]` only, so it cannot replace the top-level `deployment` block, and
`saveSettings` (lines 251-260) writes in place, so a crash mid-write truncates the file.

**What already exists to build on.**
- The shell-unquoted plan's channel: the agent writes a file in `.ctoc/state/payloads/` with the Write tool, and the
  menu reads it through `readPayloadFile` (module-local in `src/lib/menu-screens.js`, its lines 355-376): a regular file
  only, opened once, at most 64 KiB, one JSON object, never a throw.
- The decision-route plan's rule refuses this route to a background agent without a hook edit. A plain call of the
  menu is decided by its route alone (`menuRoute`, then `isReadOnlyRoute` and `isOwnCompletion`, its lines 1047-1098
  and 1318-1322). `menu set …` is neither a view (`task-view` `NAV_ROUTE`, `src/lib/task-view.js` line 76, and its
  `TASK_VIEWS`, its line 1061) nor a completion, so it gets `REFUSAL_WRITE` (its lines 742-744). Inline code that loads
  `settings` or `menu-screens` is refused too: both are on its writer list (its lines 549 and 555, and the test list at
  its lines 1664-1670). It names `settings` among the refused routes (its line 141).
- The sweep's confirmation pattern (`taskSweep`, `src/lib/menu-screens.js` lines 3259-3285): a preview that writes
  nothing, whose option carries a token of what was shown, and a "no longer matches" screen when the token is stale.
- The pipeline's own key set: `DEFAULT_CONFIG` (`src/lib/deployment.js` lines 18-49), the environment keys the six
  strategies read (lines 376-545), and the strategies `executeStrategy` runs (lines 257-273).

**A name collision.** The nested-settings plan's router line is
`if (args[1] === 'settings') return require('./nested-settings').settingsRoute(…)` (its line 590), and its parser
reads the first word as a folder (its lines 223-233). `menu settings deployment` would read `deployment` as a folder,
so this route is `menu set` (Decision 1).

## Technical approach

1. **One route, two settings** (`src/lib/menu-screens.js`):
   `menu set deployment|entry-point --payload-file <path> [--confirm <token>]`.
   - `<path>` must be `.ctoc/state/payloads/<name>.json`, one file directly in the payload folder. It is read through
     the shell-unquoted plan's `readPayloadFile`. The file holds the value itself: the deployment block, or the
     entry-point declaration.
   - The value is checked first against the keys the setting holds, with their types:
     - deployment: what `src/lib/deployment.js` reads;
     - entry point: `command`, `expect` and `timeout_ms`, the reader's own checks (`entryPointProblem`, extracted from
       `readDeclaredEntryPoint`), and a command the last mile can launch.
   - Then every key and string is checked for a character the screen could not show. Such a value is refused, never
     cleaned.
   - **Without `--confirm`** the route answers a preview and writes nothing. The preview shows the value in plain
     words (the deployment block as the pipeline will read it, with its defaults filled in by its own `mergeConfig`) and
     exactly as it will be written. It offers "Write this …", whose action carries the SHA-256 of the setting's name and
     the value shown, and "Do not write it".
   - **With `--confirm`** the route re-reads and re-checks the file. It writes only when the token matches what the
     file holds now; otherwise it answers the preview of what the file holds now and writes nothing.
2. **One strict writer** (`src/lib/settings.js`): `writeOneSetting(keyPath, value, projectPath)`.
   - It sets `deployment`, or `general.entry_point`, and keeps every other key.
   - It refuses a file that is not one JSON object, and a category that is not an object, leaving the file untouched.
   - It writes a temporary file beside the settings file and renames it over it.
3. **The last mile names the route** (`src/lib/app-runner.js`). Both reasons keep "by hand" (outside Claude Code) and
   "write protection", which the settings change's case 6c asserts, and add the route.
4. **The deployment-setup agent uses the route.**
   - It writes its block with `Write` to `.ctoc/state/payloads/deployment-block.json`.
   - Its report says the session runs the route.
   - Its steps that read the settings run after the menu wrote the block, on a second dispatch.
5. **The session knows the route**: one row in start.md's Navigation Commands table. The fixed payload paths keep every
   agent word off the session's command line.
6. **No hook edit.** The decision-route plan's allowlist refuses the route to a background agent. Case S29-9 pins it,
   and pins the main session's two calls passing the settings change's refusal.

**What it does not change.** No file under `src/hooks/` changes. `setSetting`, `saveSettings` and `readRawSettings`
are unchanged, and so are the push switch's toggle and every other menu route. `src/lib/deployment.js` is not edited:
the route only reads its `DEFAULT_CONFIG` and `mergeConfig`, so the decision-route plan's list of non-writer modules,
which holds `deployment` (its line 568), stays true.

## Implementation Details

### Dependency Graph

```
/ctoc:start (src/commands/start.md row) --> src/commands/start.js#main --> src/lib/menu-screens.js#route
  case 'menu', args[1] === 'set' --> #setCommand (new)
     --> #readPayloadFile (the shell-unquoted plan's, module-local) --> inbox.readRegularFile
     --> #deploymentProblem / #environmentProblem (new) | #entryPointValueProblem (new)
            --> app-runner.entryPointProblem (new export), app-runner.resolveScriptCommand (existing export)
     --> #hasUnshowable (new)
     --> crypto.createHash('sha256')
     --> #setPreview --> #describeDeployment --> deployment.DEFAULT_CONFIG, deployment.mergeConfig (existing exports)
                     --> #describeEntryPoint
     --> settings.writeOneSetting (new export) --> safe-fs (readFileSync, writeFileSync, renameSync, unlinkSync)
src/lib/step-13-verify.js#driveAppSync caller --> app-runner#readDeclaredEntryPoint --> #entryPointProblem
                                              --> NO_DECLARATION_SUFFIX and the malformed reason (name ENTRY_POINT_ROUTE)
agents/infrastructure/deployment-setup.md --tells the agent--> Write .ctoc/state/payloads/deployment-block.json
src/hooks/protect-records.js (unchanged) --refuses a background agent--> the route (the decision-route plan's rule)
tests/a-menu-route-writes-the-deployment-block.test.js --requires--> menu-screens, app-runner, deployment, settings;
   --spawns--> src/commands/start.js, src/hooks/protect-records.js
tests/agent-tool-grants.test.js --reads--> agents/infrastructure/deployment-setup.md
tests/menu-task-wiring.test.js --reads--> src/commands/start.md
```

No cycle. `menu-screens` loads `settings`, `app-runner`, `deployment` and `crypto` lazily, inside the route's
functions. `settings` requires only `safe-fs` and `path`. `app-runner` requires `settings` (already), never
`menu-screens`. `deployment` requires neither.

### File Specifications

Every edit is anchored by its text: the three dependencies land first and move the lines. Step 9 records where each
anchor stands.

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** the route `menu set`, its checks, its preview, its confirmation and its one write.
**Change Type:** new-function (module-local) and one router line

##### Changes
1. **The header's Usage block** (lines 6-12): after the line `node start.js menu task sweep [--confirm ...] ->
   taskSweep()`, add
   ` *   node start.js menu set deployment|entry-point --payload-file <path> [--confirm <token>] -> setCommand()`.
2. **A new section directly before `taskCommand`'s doc comment** (`menu task <sub>` dispatcher):

```js
// ── menu set (four-defects slice 29) ────────────────────────────────────────────────

/**
 * The payload file `menu set` reads: one JSON file directly in the payload folder (start.md names
 * `deployment-block.json` and `entry-point.json`). Nothing else is read, so the route never takes a
 * setting from another file of the project.
 */
const SET_PAYLOAD_RE = /^\.ctoc\/state\/payloads\/[A-Za-z0-9_][A-Za-z0-9._-]*\.json$/;
/** The confirmation a preview's Write option carries: the SHA-256, in hex, of the setting and the value shown. */
const SET_TOKEN_RE = /^[0-9a-f]{64}$/;
/**
 * A character the screen could not show as it is: a control or format character, a line or paragraph
 * separator, a default-ignorable code point or the braille blank (`streaming-gate`'s invisible set,
 * plus the controls). A value holding one is refused, never cleaned, so what the owner reads is what
 * is written.
 */
const UNSHOWABLE_RE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}⠀]/u;
/** The keys the deployment pipeline reads at the top of its block (`src/lib/deployment.js`), with their types. */
const DEPLOYMENT_KEYS = Object.freeze({
  enabled: 'boolean', dry_run: 'boolean', remote: 'string', environments: 'environments',
  approval: 'approval', notifications: 'notifications', rollback: 'rollback',
});
/** The keys it reads in one environment (`deployToEnvironment` and the six strategies), with their types. */
const ENVIRONMENT_KEYS = Object.freeze({
  name: 'string', enabled: 'boolean', strategy: 'strategy', remote: 'string', branch: 'string',
  tagPattern: 'string', url: 'string', allow_internal_webhooks: 'boolean', script: 'string', image: 'string',
  imageTag: 'string', context: 'string', push: 'boolean', host: 'string', user: 'string', command: 'string',
});
/** The strategies `deployment.executeStrategy` runs. */
const STRATEGIES = new Set(['git-branch', 'git-tag', 'webhook', 'script', 'docker', 'ssh']);
/** The key a strategy cannot run without (`executeWebhook`, `executeScript` and `executeSsh` throw without it). */
const STRATEGY_NEEDS = Object.freeze({ webhook: 'url', script: 'script', ssh: 'host' });
/** The keys of `general.entry_point` the last mile reads (`app-runner.readDeclaredEntryPoint`). */
const ENTRY_POINT_KEYS = new Set(['command', 'expect', 'timeout_ms']);
/** How a type of the key tables reads in a refusal. */
const TYPE_WORDS = Object.freeze({ boolean: 'true or false', string: 'a string' });

/** Does `o` hold `k` as its own key, never through the prototype? */
const ownKey = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
/** One JSON object: not null, not a list. */
const isJsonObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * What is wrong with one environment of a deployment block, in fixed words, or null.
 * @param {*} env
 * @returns {string|null}
 */
function environmentProblem(env) {
  if (!isJsonObject(env)) return 'it must be one JSON object';
  for (const [k, v] of Object.entries(env)) {
    if (!ownKey(ENVIRONMENT_KEYS, k)) return 'it holds a key the deployment pipeline does not read';
    const type = ENVIRONMENT_KEYS[k];
    if (type === 'strategy' ? !STRATEGIES.has(v) : typeof v !== type) {
      return `\`${k}\` must be ${type === 'strategy' ? 'one of git-branch, git-tag, webhook, script, docker and ssh' : TYPE_WORDS[type]}`;
    }
  }
  if (typeof env.name !== 'string' || env.name.trim() === '') return '`name` is required';
  if (!ownKey(env, 'strategy')) return '`strategy` is required';
  const needs = ownKey(STRATEGY_NEEDS, env.strategy) ? STRATEGY_NEEDS[env.strategy] : null;
  if (needs !== null && (typeof env[needs] !== 'string' || env[needs].trim() === '')) {
    return `\`${needs}\` is required for the ${env.strategy} strategy`;
  }
  return null;
}

/**
 * What is wrong with a deployment block, or null when every key is one `src/lib/deployment.js` reads,
 * with its type. Fixed words that name only the pipeline's own keys and positions: an agent's key or
 * value is never echoed (four-defects slice 29).
 * @param {*} block
 * @returns {string|null}
 */
function deploymentProblem(block) {
  if (!isJsonObject(block)) return 'the file must hold the deployment block itself, as one JSON object';
  for (const [k, v] of Object.entries(block)) {
    if (!ownKey(DEPLOYMENT_KEYS, k)) return 'the block holds a key the deployment pipeline does not read';
    const type = DEPLOYMENT_KEYS[k];
    if (type === 'environments') {
      if (!Array.isArray(v)) return '`environments` must be a list';
      for (let i = 0; i < v.length; i += 1) {
        const why = environmentProblem(v[i]);
        if (why !== null) return `environment ${i + 1}: ${why}`;
      }
    } else if (type === 'approval') {
      if (!isJsonObject(v) || !Object.values(v).every((m) => m === 'manual' || m === 'auto')) {
        return '`approval` must map each environment name to `manual` or `auto`';
      }
    } else if (type === 'notifications') {
      if (!isJsonObject(v) || !Object.entries(v).every(([n, list]) => (n === 'on_success' || n === 'on_failure')
        && Array.isArray(list) && list.every((u) => typeof u === 'string'))) {
        return '`notifications` holds only `on_success` and `on_failure`, each a list of addresses';
      }
    } else if (type === 'rollback') {
      if (!isJsonObject(v) || !Object.entries(v).every(([n, x]) => (n === 'auto_rollback' && typeof x === 'boolean')
        || (n === 'keep_history' && Number.isInteger(x) && x >= 1))) {
        return '`rollback` holds only `auto_rollback` (true or false) and `keep_history` (a whole number from 1)';
      }
    } else if (typeof v !== type) {
      return `\`${k}\` must be ${TYPE_WORDS[type]}`;
    }
  }
  return null;
}

/**
 * What is wrong with an entry-point declaration, or null: only the keys the last mile reads, the last
 * mile's own checks (`app-runner.entryPointProblem`, the one source it shares with its reader), and a
 * command the last mile can launch, without a shell operator (`app-runner.resolveScriptCommand`).
 * @param {*} decl
 * @returns {string|null}
 */
function entryPointValueProblem(decl) {
  const appRunner = require('./app-runner');
  if (isJsonObject(decl) && Object.keys(decl).some((k) => !ENTRY_POINT_KEYS.has(k))) {
    return 'the declaration holds a key the last mile does not read (it reads `command`, `expect` and `timeout_ms`)';
  }
  const why = appRunner.entryPointProblem(decl);
  if (why !== null) return why;
  if (appRunner.resolveScriptCommand(decl.command).unsupported) {
    return 'the command holds a shell operator (&&, ||, |, ; or &), which the last mile never runs';
  }
  return null;
}

/**
 * Does any key or string of a checked value hold a character the screen could not show as it is
 * (`UNSHOWABLE_RE`)? Called only after the key check, which bounds the depth to the setting's shape.
 * @param {*} v
 * @returns {boolean}
 */
function hasUnshowable(v) {
  if (typeof v === 'string') return UNSHOWABLE_RE.test(v);
  if (Array.isArray(v)) return v.some(hasUnshowable);
  if (isJsonObject(v)) return Object.entries(v).some(([k, x]) => UNSHOWABLE_RE.test(k) || hasUnshowable(x));
  return false;
}

/**
 * What one environment's strategy does, in plain words, with the defaults `src/lib/deployment.js`
 * fills in. Every value from the file is JSON-quoted: data, never an instruction.
 * @param {object} env - one environment of the merged block
 * @param {string} remote - the remote it pushes to
 * @returns {string}
 */
function strategyWords(env, remote) {
  const q = (v) => JSON.stringify(v);
  switch (env.strategy) {
    case 'git-branch': return `pushes the approved commit to branch ${q(env.branch || `deploy/${env.name}`)} of remote ${q(remote)}`;
    case 'git-tag': return `tags the approved commit ${env.tagPattern ? `as ${q(env.tagPattern)}` : 'with its short hash and the target name'} and pushes the tag to remote ${q(remote)}`;
    case 'webhook': return `posts the deployment to ${q(env.url)}${env.allow_internal_webhooks === true ? ', an internal address allowed' : ''}`;
    case 'script': return `runs the script ${q(env.script)} in the project folder`;
    case 'docker': return `builds the image ${q(env.image || 'app')}${env.push === true ? ' and pushes it' : ''}`;
    default: return `runs ${env.command ? q(env.command) : 'an echo of the commit'} on ${q(`${env.user || 'deploy'}@${env.host}`)} over ssh`;
  }
}

/**
 * A deployment block in plain words: what the pipeline will do with it, read through the pipeline's
 * own `mergeConfig` over its `DEFAULT_CONFIG`, so the defaults it fills in are shown too.
 * @param {object} block - checked by `deploymentProblem`
 * @returns {string}
 */
function describeDeployment(block) {
  const { DEFAULT_CONFIG, mergeConfig } = require('./deployment');
  const c = mergeConfig(DEFAULT_CONFIG, block);
  const q = (v) => JSON.stringify(v);
  const lines = ['What the pipeline will do with it (the defaults it fills in included):'];
  lines.push(`  Pipeline: ${c.enabled === true ? 'on' : 'off — nothing below runs until it is on'}`);
  lines.push(c.dry_run === false
    ? '  Runs for real: YES — `dry_run` is false, so it really pushes, posts, runs scripts and connects over ssh'
    : '  Runs for real: no — a dry run: it builds each command and runs none');
  lines.push(`  Targets (${c.environments.length}):`);
  for (const env of c.environments) {
    const asks = c.approval[env.name] === 'manual' ? 'asks before deploying' : 'deploys without asking';
    lines.push(`    • ${q(env.name)}: ${env.enabled === true ? 'on' : 'off'} — ${strategyWords(env, env.remote || c.remote || 'origin')}; ${asks}`);
  }
  lines.push(`  When a deployment fails: ${c.rollback.auto_rollback ? 'it rolls back automatically' : 'it does not roll back'}; the history keeps the last ${c.rollback.keep_history || 10} deployments`);
  lines.push(`  Notifications: ${c.notifications.on_success.length} address(es) on success, ${c.notifications.on_failure.length} on failure`);
  return `${lines.join('\n')}\n`;
}

/**
 * An entry-point declaration in plain words: what the check run will do with it.
 * @param {object} decl - checked by `entryPointValueProblem`
 * @returns {string}
 */
function describeEntryPoint(decl) {
  const q = (v) => JSON.stringify(v);
  return `${[
    'What the check run will do with it:',
    `  It runs this command in the project folder, as one command and never through a shell: ${q(decl.command.trim())}`,
    `  It passes when ${typeof decl.expect === 'string' ? `the output holds ${q(decl.expect)}` : 'the command exits cleanly'}`,
    `  Time limit: ${Number.isFinite(decl.timeout_ms) && decl.timeout_ms > 0 ? `${decl.timeout_ms} ms` : "the check run's default"}`,
  ].join('\n')}\n`;
}

/** The two settings `menu set` writes: where each lives, how it is checked and shown, and what comes next. */
const SET_KINDS = Object.freeze({
  deployment: Object.freeze({
    title: 'deployment block', key: '`deployment`', keyPath: ['deployment'],
    problem: deploymentProblem, describe: describeDeployment,
    next: 'Next: dispatch the deployment-setup agent again for steps 4 to 6 of its Post-Setup Verification: it checks that the settings hold this block, then runs the dry run.',
  }),
  'entry-point': Object.freeze({
    title: 'entry point', key: '`general.entry_point`', keyPath: ['general', 'entry_point'],
    problem: entryPointValueProblem, describe: describeEntryPoint,
    next: "The next check run starts this command as the project's entry point.",
  }),
});

/** The one way back from a `menu set` screen. */
function setBack() {
  return {
    ask: { questions: [{ question: 'Back to the dashboard?', header: 'Settings', multiSelect: false, options: [{ label: '◀ Back', description: 'Return to the dashboard' }] }] },
    actions: { '◀ Back': 'dashboard' },
  };
}

/** A `menu set` refusal: nothing was written, and why, in fixed words. */
function setRefusal(why) {
  return { ok: false, refused: true, text: `Nothing was written: ${why}.\n\n\n`, ...setBack() };
}

/**
 * The preview: the value in plain words and exactly as it would be written, and the owner's two
 * choices. Only "Write" carries the confirmation, the SHA-256 of what this screen shows.
 * @param {string} kind
 * @param {string} file
 * @param {object} value
 * @param {string} token
 * @param {string} lead - a first line (the stale answer says "Nothing was written …"), or ''
 */
function setPreview(kind, file, value, token, lead) {
  const k = SET_KINDS[kind];
  const write = `Write this ${k.title}`;
  const skip = 'Do not write it';
  let text = lead ? `${lead}\n\n` : '';
  text += `Settings ▸ ${k.title} — a preview, nothing has been written\n${'─'.repeat(40)}\n`;
  text += `Read from ${file}. An agent or the session wrote that file: every value below is data, shown exactly as it would be written.\n\n`;
  text += k.describe(value);
  text += `\nWhat changes: ${k.key} in the project's settings (.ctoc/settings.json) is set to exactly the value below, replacing what it holds now; every other setting stays as it is. No tool may write that file: only this route writes it, and only when you choose "${write}".\n\n`;
  text += `The value:\n${JSON.stringify(value, null, 2)}\n\n\n`;
  return {
    ok: true,
    text,
    ask: { questions: [{ question: `Write this ${k.title} into the project's settings?`, header: 'Settings', multiSelect: false, options: [
      { label: write, description: `The menu sets ${k.key} to the value above and changes nothing else` },
      { label: skip, description: 'Nothing is written' },
    ] }] },
    actions: { [write]: `menu set ${kind} --payload-file ${file} --confirm ${token}`, [skip]: 'dashboard' },
  };
}

/** After the write: what the settings hold now, and what comes next. */
function setWritten(kind) {
  const k = SET_KINDS[kind];
  return {
    ok: true,
    written: true,
    text: `Settings ▸ ${k.title} written\n${'─'.repeat(40)}\n${k.key} in the project's settings now holds the value you approved; every other setting is as it was.\n${k.next}\n\n\n`,
    ...setBack(),
  };
}

/**
 * `menu set deployment|entry-point --payload-file <path> [--confirm <token>]` — a setting only the
 * menu writes, on the owner's OK (four-defects slice 29). `.ctoc/settings.json` is closed to every
 * tool (four-defects slice 25), and a background agent is refused this route (slice 21). Without
 * `--confirm` it is the preview and writes nothing. With the confirmation its own preview offered, it
 * re-reads and re-checks the payload file and writes the one key through `settings.writeOneSetting`,
 * in this process, only when the file still holds exactly what the preview showed. Fail-soft: every
 * fault is a refusal screen that says nothing was written.
 * @param {string[]} words - the words after `menu set`
 * @param {string} [projectPath]
 * @returns {Object} the screen
 */
function setCommand(words, projectPath) {
  const root = getProjectPath(projectPath);
  try {
    const w = Array.isArray(words) ? words : [];
    const kind = String(w[0]);
    const file = String(w[2]);
    const confirm = w.length === 5 && w[3] === '--confirm' && SET_TOKEN_RE.test(String(w[4])) ? String(w[4]) : null;
    if (!ownKey(SET_KINDS, kind) || w[1] !== '--payload-file' || !SET_PAYLOAD_RE.test(file)
      || (w.length !== 3 && confirm === null)) {
      return setRefusal('`menu set` takes `deployment` or `entry-point`, then `--payload-file` with a file `.ctoc/state/payloads/<name>.json`, and `--confirm` only from its own preview');
    }
    const value = readPayloadFile(root, file);
    if (value === null) {
      return setRefusal('the payload file is missing, is not a regular file, is larger than 64 KiB, or does not hold one JSON object');
    }
    const k = SET_KINDS[kind];
    const why = k.problem(value)
      || (hasUnshowable(value) ? 'a key or value holds an invisible or control character, so the screen could not show it as it would be written' : null);
    if (why) return setRefusal(why);
    const token = require('crypto').createHash('sha256').update(`${kind}\n${JSON.stringify(value)}`).digest('hex');
    if (confirm === null) return setPreview(kind, file, value, token, '');
    if (confirm !== token) {
      return {
        ...setPreview(kind, file, value, token, 'Nothing was written: the payload file no longer holds what the preview showed. This is what it holds now; write it only from this screen.'),
        ok: false,
        stale: true,
      };
    }
    const res = require('./settings').writeOneSetting(k.keyPath, value, root);
    return res.ok ? setWritten(kind) : setRefusal(res.reason);
  } catch (err) {
    return setRefusal(`the settings file could not be written (${(err && err.code) || 'no error code'}), and its old text stays whole`);
  }
}
```

3. **`route`, inside `case 'menu':`**, directly after the `if (args[1] === 'task') { … }` branch:

```js
      // `menu set deployment|entry-point --payload-file <path> [--confirm <token>]` — the owner writes
      // one setting from a preview (four-defects slice 29): `.ctoc/settings.json` is closed to every tool.
      if (args[1] === 'set') {
        return setCommand(args.slice(2), projectPath);
      }
```

4. **Exports:** none added. `setCommand` and its helpers are reached through `route`; an export only a test calls would
   trip the dead-export fence (`tests/export-reachability.test.js`).

##### Error Handling
- Every fault is a refusal screen `{ ok: false, refused: true, text: 'Nothing was written: …' }`: a malformed call, an
  unreadable payload, a failed check, a settings file that is not one JSON object. Nothing is written on any of them.
- `readPayloadFile` never throws (the shell-unquoted plan).
- A write fault thrown by `writeOneSetting` is caught. The answer names its error code only, never a path, and says
  the old text stays whole: the rename never happened.
- A stale confirmation is `{ ok: false, stale: true }` with the preview of what the file holds now.

##### Cross-Platform Notes
- The payload path is relative, with `/` only. `readPayloadFile` resolves it against the project root with
  `path.resolve`, which reads `/` on Windows too.
- `crypto`, `JSON` and the regular expressions behave the same on every platform.

#### File: `src/lib/settings.js`
**Action:** MODIFY
**Purpose:** one strict writer that sets one key and keeps every other key, and comments that say how deployment is
configured now.
**Change Type:** new-function (exported)

##### Changes
1. **The header** (lines 14-17): the four lines from " * Deployment is NOT configured through this schema" to
   " * settings.json that src/lib/deployment.js reads." become:

```js
 * Deployment is NOT configured through this schema — it has no flat-toggle UI
 * (toggles cannot express strategy/branch/approval). The deployment-setup agent
 * writes the nested `deployment` block to a payload file, and the menu's
 * `menu set deployment` route writes it into settings.json, which
 * src/lib/deployment.js reads, on the owner's OK (`writeOneSetting`,
 * four-defects slice 29): no tool may write settings.json.
```

2. **The NOTE in `SETTINGS_SCHEMA`** (lines 121-124): the lines from "// NOTE: no `deployment` category here." to
   "// branch, or per-environment approval, so a partial UI would mislead." become:

```js
  // NOTE: no `deployment` category here. Deployment is configured by the
  // deployment-setup agent and written by the menu's `menu set deployment` route
  // into the nested `deployment` block of settings.json (read by
  // src/lib/deployment.js) — flat toggles cannot express strategy, branch, or
  // per-environment approval, so a partial UI would mislead.
```

3. **A new function directly after `setSetting`:**

```js
/**
 * Set ONE key of `.ctoc/settings.json` and keep every other key as it is (four-defects slice 29: the
 * menu's `menu set` route, on the owner's OK). `keyPath` is one name (`['deployment']`) or a category
 * and a name (`['general', 'entry_point']`); `value` replaces what that key held.
 *
 * Unlike `setSetting`, it never writes over a file it cannot read: `readRawSettings` reads a file that
 * is not valid JSON as `{}`, so `setSetting` would drop every other key. Here a file that is not one
 * JSON object, or a category that is not an object, is answered `{ ok: false, reason }` and left
 * untouched. The new text goes to a temporary file beside it, which is renamed over it, so a crash
 * leaves the old file whole; the rename replaces a symbolic link at that path instead of writing
 * through it. The text is rewritten with two-space indentation, as `saveSettings` writes it.
 *
 * @param {string[]} keyPath
 * @param {*} value - JSON-serialisable
 * @param {string} [projectPath]
 * @returns {{ok: true} | {ok: false, reason: string}}
 * @throws {Error} on a key path that is not one or two safe names, or when the file system refuses
 *   the write (the old file stays whole)
 */
function writeOneSetting(keyPath, value, projectPath = process.cwd()) {
  if (!Array.isArray(keyPath) || keyPath.length < 1 || keyPath.length > 2
    || !keyPath.every((k) => typeof k === 'string' && k !== '' && !UNSAFE_SETTING_NAMES.has(k))) {
    throw new Error('writeOneSetting: the key path is one or two safe names');
  }
  const file = getSettingsPath(projectPath);
  let raw = {};
  if (safeFs.existsSync(file)) {
    try {
      raw = JSON.parse(safeFs.readFileSync(file, 'utf8'));
    } catch {
      return { ok: false, reason: 'the settings file is not valid JSON, so it was left as it is' };
    }
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, reason: 'the settings file does not hold one JSON object, so it was left as it is' };
    }
  }
  let holder = raw;
  if (keyPath.length === 2) {
    const category = keyPath[0];
    if (!Object.prototype.hasOwnProperty.call(raw, category)) raw[category] = {};
    holder = raw[category];
    if (holder === null || typeof holder !== 'object' || Array.isArray(holder)) {
      return { ok: false, reason: `the settings file's "${category}" is not an object, so it was left as it is` };
    }
  }
  holder[keyPath[keyPath.length - 1]] = value;
  safeFs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  try {
    safeFs.writeFileSync(tmp, JSON.stringify(raw, null, 2));
    safeFs.renameSync(tmp, file);
  } catch (err) {
    try { safeFs.unlinkSync(tmp); } catch { /* the temporary file may not exist */ }
    throw err;
  }
  return { ok: true };
}
```

4. **`module.exports`**: add `writeOneSetting` after `setSetting`.

##### Called By
`src/lib/menu-screens.js` `setCommand`, on a confirmation that matches its preview. No other caller.

##### Error Handling
- A file it cannot read as one JSON object, or a category that is not an object: `{ ok: false, reason }`, file
  untouched.
- A write fault: the temporary file is removed and the error rethrown. The rename never ran, so the old file is
  whole.
- An unsafe key path: a throw. The route passes only its two fixed paths.

#### File: `src/lib/app-runner.js`
**Action:** MODIFY
**Purpose:** the entry-point checks get one source, shared with the menu's route, and both last-mile reasons name the
route.
**Change Type:** new-function (exported) and two sentences

##### Changes
1. **Directly after `const ENTRY_POINT_KEY = 'general.entry_point';`:**

```js
/** The menu route that writes the entry point on the human's OK (four-defects slice 29). */
const ENTRY_POINT_ROUTE = "menu set entry-point --payload-file '.ctoc/state/payloads/entry-point.json'";
```

2. **`NO_DECLARATION_SUFFIX`** (main lines 122-126, as the settings change leaves it) becomes:

```js
/** Sentence appended to every not-applicable reason, naming the way to enable the check. */
const NO_DECLARATION_SUFFIX =
  'No entry point was declared either: to have the last mile run this project\'s real entry point ' +
  `instead of reporting nothing to launch, declare \`${ENTRY_POINT_KEY}\` through the menu. The ` +
  'session writes `{"command": "<the command>"}` (with an optional `expect` substring) to ' +
  '.ctoc/state/payloads/entry-point.json with the Write tool and runs ' +
  `\`${ENTRY_POINT_ROUTE}\`; the menu shows it to the human and writes the key only on the human's OK. ` +
  'CTOC\'s write protection refuses every tool\'s write to .ctoc/settings.json; the human can also set ' +
  'the key there by hand, outside Claude Code.';
```

3. **A new function directly before `readDeclaredEntryPoint`'s doc comment:**

```js
/**
 * What is wrong with an entry-point declaration, in the words the malformed reason uses, or null when
 * it is well formed. The one source of these checks: `readDeclaredEntryPoint` reads the settings with
 * it, and the menu's entry-point route (`menu set entry-point`, four-defects slice 29) checks a value
 * with it before the human approves the write.
 * @param {*} decl - the declaration (never undefined)
 * @returns {string|null}
 */
function entryPointProblem(decl) {
  if (decl === null || typeof decl !== 'object' || Array.isArray(decl)) {
    return `the declaration must be an object, got ${Array.isArray(decl) ? 'an array' : (decl === null ? 'null' : typeof decl)}`;
  }
  if (typeof decl.command !== 'string' || decl.command.trim() === '') {
    return '`command` is required and must be a non-empty string';
  }
  if (decl.expect !== undefined && decl.expect !== null
    && (typeof decl.expect !== 'string' || decl.expect === '')) {
    return '`expect` must be a non-empty string when present (it is a literal substring, never a pattern)';
  }
  if (decl.timeout_ms !== undefined && decl.timeout_ms !== null
    && !(Number.isFinite(decl.timeout_ms) && decl.timeout_ms > 0)) {
    return '`timeout_ms` must be a finite number greater than zero when present';
  }
  return null;
}
```

4. **`readDeclaredEntryPoint`:** the `const bad = (detail) => ({ … });` helper and the four `if (…) return bad(…);`
   tests (main lines 156-175) become:

```js
  const problem = entryPointProblem(decl);
  if (problem !== null) {
    return {
      declaration: null,
      reason: `A malformed \`${ENTRY_POINT_KEY}\` declaration was found in .ctoc/settings.json: ${problem}. ` +
        'Nothing was launched. Fix it through the menu: write the corrected declaration to ' +
        `.ctoc/state/payloads/entry-point.json and run \`${ENTRY_POINT_ROUTE}\`, which writes the key on the ` +
        'human\'s OK, so the last mile can drive this project\'s entry point. CTOC\'s write protection refuses ' +
        'every tool\'s write to that file; the human can also fix it there by hand, outside Claude Code.'
    };
  }
```

   The early `return { declaration: null, reason: null }` for an absent or null declaration, and the final return of the
   validated declaration, stay as they are.
5. **`module.exports`**: add `entryPointProblem` after `readDeclaredEntryPoint`.

The existing assertions still hold:
- "No entry point was declared" (`tests/last-mile-drives-entry-point.test.js` line 295);
- `entry_point` (lines 188, 297, 313, 316, 598 and 599);
- "malformed" (line 186) and "`command` is required" (line 600);
- "the declaration must be an object" and `got ${named}` (`tests/app-runner-coverage-holes.test.js` lines 140-142);
- `general.entry_point` (its line 144);
- the settings change's case 6c, "by hand" and "write protection" in both reasons.

##### Called By
- `entryPointProblem`: `readDeclaredEntryPoint` (reached from `driveAppSync`, which `src/lib/step-13-verify.js`
  line 67 calls), and `menu-screens.entryPointValueProblem`.
- `ENTRY_POINT_ROUTE`: the two reasons, returned as the check run's evidence.

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** the session knows the route, when to run it, and which fixed path it reads.
**Change Type:** modify-existing (one table row)

##### Changes
In the Navigation Commands table, directly after the row that begins `` | `menu task sweep` ``, add:

```markdown
| `menu set deployment --payload-file '<path>'` · `menu set entry-point --payload-file '<path>'` | A setting only the menu writes, on the owner's OK. It reads the payload file, refuses a key the setting does not hold, and shows the value in plain words and exactly as it would be written; only the owner's pick of "Write" runs the confirmation that screen carries, and the menu then sets that one key of the project's settings and keeps every other key. No tool may write `.ctoc/settings.json`. `<path>` is `.ctoc/state/payloads/deployment-block.json`, which the deployment-setup agent writes (run the route when it reports its block), or `.ctoc/state/payloads/entry-point.json`, which you write with the Write tool from the owner's words, holding `command` and optionally `expect` and `timeout_ms` (run the route when the owner sets the entry point, or when a check's reason names it) |
```

Both payload paths are fixed words, so no agent text reaches the session's command line (the shell-unquoted plan's Rule
15).

#### File: `agents/infrastructure/deployment-setup.md`
**Action:** MODIFY
**Purpose:** the agent writes its block to the payload file, and the menu's route writes the settings on the owner's
OK.
**Change Type:** modify-existing

##### Changes
1. **"## Configuration Output":** the whole paragraph under the heading, whatever the settings change and its
   neighbours leave there, becomes:

```markdown
You never write `.ctoc/settings.json`, with any tool: CTOC's write protection refuses every tool's write to it, because it holds the command CTOC's check run executes (`general.entry_point`) and the push switch; only the menu writes it, on the owner's OK. Saving the configuration — the "[1] Save configuration" choice, and a partial save under Error Recovery — means this: write the `deployment` block itself (its value, without the `deployment` key around it), as one JSON object and nothing else, with `Write` to `.ctoc/state/payloads/deployment-block.json`, replacing that file when it exists. A partial save writes only the parts completed so far; its markers for the incomplete steps go into your report, never into the block. The block holds only keys the pipeline reads, because the menu refuses any other: at the top `enabled`, `dry_run`, `remote`, `environments`, `approval`, `notifications` and `rollback`; in each environment `name` and `strategy` (both required; the strategy one of `git-branch`, `git-tag`, `webhook`, `script`, `docker` and `ssh`, with `url` required for a webhook, `script` for a script and `host` for ssh), and `enabled`, `remote`, `branch`, `tagPattern`, `url`, `allow_internal_webhooks`, `script`, `image`, `imageTag`, `context`, `push`, `user` and `command`; in `approval`, each environment name mapped to `manual` or `auto`; in `notifications`, `on_success` and `on_failure`, each a list of addresses; in `rollback`, `auto_rollback` and `keep_history`. A choice the user made that no such key holds (a timeout, a retry count, a rollout plan, a GitOps repository) goes into your report as a note for the pipeline the user runs. Run Post-Setup Verification steps 1 to 3 and validate every field before you write the file. Then report that the block is in `.ctoc/state/payloads/deployment-block.json` and that the main session runs the menu's deployment route on it (`menu set deployment`), which shows the block to the owner in plain words and writes it into `.ctoc/settings.json` only on the owner's OK, replacing the value of the `deployment` key and leaving every other key as it is. The owner decides whether it is written. A dry run, wherever this file offers one, reads that settings file, so it waits for Post-Setup Verification steps 4 to 6, after the menu has written your block. Always include `dry_run`: leave it `true` (simulate — build commands, execute nothing) unless the user explicitly confirms they want real pushes/POSTs/ssh, then the block sets `dry_run: false`. Do NOT put any standing "deploy on approval" flag in the block — the deploy decision is the per-crossing `options.deploy === true` stamp on the approval that moves a plan from review to done, checked in `src/lib/actions.js`; no config field arms it (see Step 4b). Example shape of the file: `{ "enabled": true, "dry_run": true, "remote": "origin", "environments": [...], "approval": {...}, "notifications": {...}, "rollback": {...} }`.
```

2. **"## Post-Setup Verification":** everything from the heading's next line to the line before "## Infrastructure
   as Code Integration" becomes:

```markdown
Steps 1 to 3 need no saved settings: run them against the block and the repository before you write the payload file.
1. Check that referenced scripts exist (for script strategy)
2. Verify git branches can be created (for git-branch strategy)
3. Test webhook connectivity (for webhook strategy)

Steps 4 to 6 read `.ctoc/settings.json`, so they run only after the menu has written your block; the main session says so when it dispatches you again for them.
4. `Read` `.ctoc/settings.json` and check that its `deployment` key holds exactly the block in `.ctoc/state/payloads/deployment-block.json`. If it does not, say what differs and run neither step below: they would check a configuration other than the one the owner approved.
5. Dry-run deployment to validate the full pipeline
6. Show next steps and how to trigger a deployment
```

Nothing else in the file changes. The network paragraph (line 18) still finds "the git branch checks and the webhook
connectivity test of Post-Setup Verification". The summary menu (lines 397-400) is left to the agent-questions plan,
which rewrites the file's menus (Neighbours).

#### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY
**Purpose:** the entry-point section and the two settings paragraphs say how the two keys are written now.
**Change Type:** modify-existing

##### Changes
1. **The entry-point section:** the paragraph the settings change inserts directly after the one fenced `json` block
   naming `entry_point` (from "The human writes this block into `.ctoc/settings.json` by hand" to "the last-mile
   messages then name it.") becomes the text below. It adds no fenced block: `tests/last-mile-drives-entry-point.test.js`
   requires exactly one `json` block naming `entry_point`.

```markdown
The menu writes this block on the owner's OK (four-defects slice 29). The session writes the declaration — the object
under `entry_point` — to `.ctoc/state/payloads/entry-point.json` with the Write tool and runs
`menu set entry-point --payload-file '.ctoc/state/payloads/entry-point.json'`. The menu refuses a key other than
`command`, `expect` and `timeout_ms`, applies the reader's own checks, refuses a command with a shell operator, shows
the declaration in plain words, and only when the owner picks "Write" sets `general.entry_point`, keeping every other
key. CTOC's write protection refuses every tool's write to `.ctoc/settings.json`, for the main session and background
agents alike, and a background agent is refused the route itself; the human can also edit the file by hand, outside
Claude Code.
```

2. **The settings paragraph** (the settings change's "The regulatory settings … and the settings JSON file"): its
   sentences from "No menu route writes `general.entry_point` or the `deployment` block yet:" to "which is to write the
   entry point too." become:

```markdown
The menu's `menu set` route writes `general.entry_point` and the `deployment` block, each read from a payload file in
`.ctoc/state/payloads/` and written only when the owner picks "Write" on its preview (the entry-point section above;
the `deployment-setup` agent writes its block to that folder and checks the settings before its dry run). A background
agent is refused that route, as every menu route but the read-only views and its own completion (four-defects slice
21).
```

3. **The background-agent settings paragraph** (main lines 303-306): the sentence "The owner decides; the main session
   shows the exact change and its source before writing (`agents/infrastructure/deployment-setup.md` reports its
   `deployment` block this way and writes no settings file)." becomes:

```markdown
The owner decides: `agents/infrastructure/deployment-setup.md` writes its `deployment` block to
`.ctoc/state/payloads/deployment-block.json`, and the menu's `menu set deployment` route shows it to the owner with
its source and writes it only on the owner's OK (four-defects slice 29); the agent writes no settings file.
```

#### File: `tests/agent-tool-grants.test.js`
**Action:** MODIFY
**Purpose:** the pinned sentences of deployment-setup follow its new text. The pin moves to the new text and is not
weakened: four sentences, where the settings change pins three.
**Change Type:** modify-existing

##### Changes
1. **The comment above `AGENT_BODY_SENTENCES`** (main lines 634-635): its last sentence, from "deployment-setup writes
   no settings file" to its end, becomes "deployment-setup writes no settings file: it writes its `deployment` block
   to a payload file, the menu's `menu set deployment` route writes it on the owner's OK, and it checks the settings
   before its dry run (four-defects slice 29)."
2. **`'infrastructure/deployment-setup'` in `AGENT_BODY_SENTENCES`:** its first entry, the network paragraph, stays.
   Every other entry is replaced by these four:

```js
    'You never write `.ctoc/settings.json`, with any tool: CTOC\'s write protection refuses every tool\'s write to it',
    'with `Write` to `.ctoc/state/payloads/deployment-block.json`, replacing that file when it exists',
    'writes it into `.ctoc/settings.json` only on the owner\'s OK, replacing the value of the `deployment` key and leaving every other key as it is',
    '`Read` `.ctoc/settings.json` and check that its `deployment` key holds exactly the block in `.ctoc/state/payloads/deployment-block.json`',
```

   Today main holds one such entry (line 641: "Never write `.ctoc/settings.json` yourself, with any tool: …"). The
   settings change replaces it with its three. Step 9 records which stand when this plan builds.

#### File: `tests/menu-task-wiring.test.js`
**Action:** MODIFY
**Purpose:** the start.md row is classified and its words are known, so the two start.md checks keep holding.
**Change Type:** modify-existing

##### Changes
1. **Case S18-9's `REFUSED_ROWS`** (main lines 1090-1105): after the entry `'menu task sweep --confirm none'`, add:

```js
      // four-defects slice 29: the settings route writes the project's settings, only from its own preview.
      "menu set deployment --payload-file '<path>'": ["menu set deployment --payload-file '.ctoc/state/payloads/deployment-block.json'", "writes the project's settings, and only from its own preview on the owner's OK"],
      "menu set entry-point --payload-file '<path>'": ["menu set entry-point --payload-file '.ctoc/state/payloads/entry-point.json'", "writes the project's settings, and only from its own preview on the owner's OK"],
```

2. **The shell-unquoted plan's case S19-6, its `WORDS` set** (its lines 970-973): add `'set'`, `'deployment'` and
   `'entry-point'`, with the comment `// four-defects slice 29: the settings route's own words`. The written reason:
   they are the menu's own fixed route words, like `sweep`. No value check is widened: `--payload-file` still carries
   only `'<path>'`.

#### File: `tests/a-menu-route-writes-the-deployment-block.test.js`
**Action:** CREATE
**Purpose:** the route's behaviour as the session and the owner meet it, the background agent's refusal through the real
hook, and the wiring texts.

```js
'use strict';
/**
 * A menu route writes the deployment block and the entry point, on the owner's OK
 * (four-defects slice 29).
 *
 * `.ctoc/settings.json` is closed to every tool by the settings change (four-defects slice 25).
 * `menu set deployment|entry-point --payload-file '<path>'` reads a payload file in
 * `.ctoc/state/payloads/`, refuses a key the setting does not hold, shows the value in plain words,
 * and writes that one key, keeping every other key, only when the owner picks "Write", whose action
 * carries the confirmation of what the preview showed. A background agent is refused the route by
 * the write protection's rule that it may run the menu only for its read-only views and its own
 * completion (four-defects slice 21): no hook was edited for it, and case S29-9 pins that.
 */
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ms = require('../src/lib/menu-screens');
const appRunner = require('../src/lib/app-runner');
const settings = require('../src/lib/settings');
const safeFs = require('../src/lib/safe-fs');
const { DEFAULT_CONFIG } = require('../src/lib/deployment');

const REPO = path.resolve(__dirname, '..');
const START = path.join(REPO, 'src', 'commands', 'start.js');
const HOOK = path.join(REPO, 'src', 'hooks', 'protect-records.js');
const START_MD = path.join(REPO, 'src', 'commands', 'start.md');
const AGENT_MD = path.join(REPO, 'agents', 'infrastructure', 'deployment-setup.md');

const DEPLOY = '.ctoc/state/payloads/deployment-block.json';
const ENTRY = '.ctoc/state/payloads/entry-point.json';
const ENTRY_ROUTE = "menu set entry-point --payload-file '.ctoc/state/payloads/entry-point.json'";
/** The decision-route plan's sentence (four-defects slice 21), as its hook holds it. */
const REFUSAL_WRITE = "CTOC refused this call because a background agent may run CTOC's menu only for its "
  + "read-only views and a task's completion without --continue, and may not run CTOC code that writes plans, "
  + 'tasks, answers, approvals, check records or settings; report your result and let the main session run it.';
/** The settings change's sentence (four-defects slice 25). */
const REFUSAL_SETTINGS = "CTOC refused this call because it writes, or could write, the project's settings "
  + "file or its regulatory profiles, which only CTOC's menu writes; tell the human what you wanted to "
  + 'change and let the menu change it.';

const BLOCK = {
  enabled: true, dry_run: true, remote: 'origin',
  environments: [
    { name: 'staging', enabled: true, strategy: 'git-branch', branch: 'deploy/staging' },
    { name: 'production', enabled: false, strategy: 'webhook', url: 'https://deploy.example.com/hook' },
  ],
  approval: { production: 'manual', staging: 'auto' },
  notifications: { on_success: [], on_failure: ['https://notify.example.com/x'] },
  rollback: { auto_rollback: true, keep_history: 10 },
};
/** Every strategy once, for the plain words of each. */
const EVERY_STRATEGY = {
  ...BLOCK,
  environments: [
    { name: 'tag', enabled: true, strategy: 'git-tag', tagPattern: 'v{commit}-{env}' },
    { name: 'run', enabled: true, strategy: 'script', script: 'scripts/deploy.js' },
    { name: 'image', enabled: true, strategy: 'docker', image: 'shop', push: true },
    { name: 'box', enabled: true, strategy: 'ssh', host: 'deploy.example.com', user: 'ops', command: 'systemctl restart shop' },
  ],
};
const OTHER = {
  general: { environment: 'dev', environment_prompt_dismissed: true },
  git: { autoPushEnabled: false },
  sync: { interval: 5 },
  deployment: { enabled: false },
};

const made = [];
let root;

function makeRoot(prefix) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  made.push(dir);
  fs.mkdirSync(path.join(dir, '.ctoc', 'state', 'payloads'), { recursive: true });
  for (const stage of ['functional', 'implementation', 'todo', 'in-progress', 'review', 'done']) {
    fs.mkdirSync(path.join(dir, 'plans', stage), { recursive: true });
  }
  return dir;
}

beforeEach(() => { root = makeRoot('ctoc-set-'); });
afterEach(() => { for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

const settingsFile = () => path.join(root, '.ctoc', 'settings.json');
const text = () => (fs.existsSync(settingsFile()) ? fs.readFileSync(settingsFile(), 'utf8') : null);
const seed = (obj) => fs.writeFileSync(settingsFile(), JSON.stringify(obj, null, 2));
const read = () => JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
/** Write a payload file, as the agent or the session does with the Write tool. */
function payload(rel, value) {
  fs.writeFileSync(path.join(root, ...rel.split('/')), typeof value === 'string' ? value : JSON.stringify(value));
  return rel;
}
const set = (...words) => ms.route(['menu', 'set', ...words], root);
/** The command the owner's pick of "Write" runs: the preview's own action. */
function writeAction(screen) {
  const label = Object.keys(screen.actions || {}).find((l) => l.startsWith('Write this '));
  assert.ok(label, `the preview offers "Write this …": ${JSON.stringify(screen.actions)}`);
  return screen.actions[label];
}
const pick = (screen) => ms.route(writeAction(screen).split(' '), root);
const noWrite = (screen, what) => {
  assert.equal(screen.ok, false, `${what}: refused`);
  assert.ok(!Object.values(screen.actions || {}).some((a) => a.includes('--confirm')), `${what}: no Write option`);
  assert.ok(screen.text.startsWith('Nothing was written'), `${what}: says nothing was written; got ${screen.text}`);
};

describe('a menu route writes the deployment block and the entry point, on the owner\'s OK (four-defects slice 29)', () => {
  it('S29-1: the preview shows the block in plain words and exactly as written, and writes nothing; the owner\'s pick writes it', () => {
    seed(OTHER);
    const before = text();
    const screen = set('deployment', '--payload-file', payload(DEPLOY, BLOCK));
    assert.equal(screen.ok, true, screen.text);
    for (const words of [
      'Settings ▸ deployment block — a preview, nothing has been written',
      `Read from ${DEPLOY}.`,
      'Runs for real: no — a dry run: it builds each command and runs none',
      '• "staging": on — pushes the approved commit to branch "deploy/staging" of remote "origin"; deploys without asking',
      '• "production": off — posts the deployment to "https://deploy.example.com/hook"; asks before deploying',
      'Notifications: 0 address(es) on success, 1 on failure',
      `The value:\n${JSON.stringify(BLOCK, null, 2)}`,
    ]) assert.ok(screen.text.includes(words), `the preview says: ${words}\n---\n${screen.text}`);
    assert.equal(text(), before, 'the preview wrote nothing');
    assert.deepEqual(Object.values(screen.actions).filter((a) => a === 'dashboard').length, 1, '"Do not write it" goes back');
    const done = pick(screen);
    assert.equal(done.ok, true, done.text);
    assert.equal(done.written, true);
    assert.deepEqual(read().deployment, BLOCK);
    // Every strategy in plain words.
    const all = set('deployment', '--payload-file', payload(DEPLOY, EVERY_STRATEGY));
    for (const words of [
      '• "tag": on — tags the approved commit as "v{commit}-{env}" and pushes the tag to remote "origin"',
      '• "run": on — runs the script "scripts/deploy.js" in the project folder',
      '• "image": on — builds the image "shop" and pushes it',
      '• "box": on — runs "systemctl restart shop" on "ops@deploy.example.com" over ssh',
    ]) assert.ok(all.text.includes(words), `the preview says: ${words}`);
  });

  it('S29-2: every other key of the file is unchanged afterwards, in value and in order', () => {
    seed(OTHER);
    pick(set('deployment', '--payload-file', payload(DEPLOY, BLOCK)));
    const after = read();
    assert.deepEqual(Object.keys(after), Object.keys(OTHER), 'the top-level keys and their order are kept');
    for (const key of ['general', 'git', 'sync']) assert.deepEqual(after[key], OTHER[key], `${key} is unchanged`);
    pick(set('entry-point', '--payload-file', payload(ENTRY, { command: 'node src/cli.js --version', expect: 'v1.' })));
    const again = read();
    assert.deepEqual(again.general, { ...OTHER.general, entry_point: { command: 'node src/cli.js --version', expect: 'v1.' } });
    assert.deepEqual(again.deployment, BLOCK, 'the deployment block written first is unchanged');
    assert.deepEqual(again.git, OTHER.git);
    assert.deepEqual(again.sync, OTHER.sync);
  });

  it('S29-3: an unknown key is refused, at the top, in an environment, in a nested part and in the entry point; nothing is written', () => {
    seed(OTHER);
    const before = text();
    for (const [kind, value, what] of [
      ['deployment', { ...BLOCK, deploy_on_approval: true }, 'a standing deploy flag at the top'],
      ['deployment', { ...BLOCK, allow_internal_webhooks: true }, 'a key the pipeline reads per environment only'],
      ['deployment', { ...BLOCK, environments: [{ ...BLOCK.environments[0], timeout: 30 }] }, 'a key in an environment'],
      ['deployment', { ...BLOCK, rollback: { auto_rollback: true, keep: 3 } }, 'a key in rollback'],
      ['deployment', { ...BLOCK, notifications: { on_success: [], slack: 'x' } }, 'a key in notifications'],
      ['deployment', JSON.parse('{"__proto__": {"enabled": true}}'), 'a prototype key'],
      ['entry-point', { command: 'node x.js', shell: true }, 'a key the last mile does not read'],
    ]) {
      const rel = payload(kind === 'deployment' ? DEPLOY : ENTRY, value);
      noWrite(set(kind, '--payload-file', rel), what);
      noWrite(set(kind, '--payload-file', rel, '--confirm', 'a'.repeat(64)), `${what}, with a made-up confirmation`);
    }
    assert.equal(text(), before, 'nothing was written');
    // Control: a block holding every key of the pipeline's own defaults is accepted.
    assert.equal(set('deployment', '--payload-file', payload(DEPLOY, DEFAULT_CONFIG)).ok, true, 'the defaults pass');
  });

  it('S29-4: a wrong type, a missing required key, a shell operator, an invisible character, a path outside the payload folder and an unreadable payload are refused; nothing is written', () => {
    seed(OTHER);
    const before = text();
    const env0 = BLOCK.environments[0];
    for (const [kind, value, what] of [
      ['deployment', { ...BLOCK, dry_run: 'false' }, 'dry_run as a string'],
      ['deployment', { ...BLOCK, environments: {} }, 'environments not a list'],
      ['deployment', { ...BLOCK, environments: [{ ...env0, strategy: 'ftp' }] }, 'an unknown strategy'],
      ['deployment', { ...BLOCK, environments: [{ enabled: true, strategy: 'git-branch' }] }, 'an environment without a name'],
      ['deployment', { ...BLOCK, environments: [{ name: 'x' }] }, 'an environment without a strategy'],
      ['deployment', { ...BLOCK, environments: [{ name: 'x', strategy: 'webhook' }] }, 'a webhook without a url'],
      ['deployment', { ...BLOCK, environments: [{ name: 'x', strategy: 'ssh', host: ' ' }] }, 'ssh without a host'],
      ['deployment', { ...BLOCK, approval: { production: 'sometimes' } }, 'an approval that is neither manual nor auto'],
      ['deployment', { ...BLOCK, rollback: { keep_history: 0 } }, 'keep_history 0'],
      ['deployment', { ...BLOCK, notifications: { on_failure: 'https://x' } }, 'on_failure not a list'],
      ['deployment', { ...BLOCK, remote: 'origin‮' }, 'a right-to-left override in a value'],
      ['deployment', { ...BLOCK, approval: { 'prod​': 'manual' } }, 'a zero-width space in a key'],
      ['entry-point', {}, 'no command'],
      ['entry-point', { command: 'x', expect: '' }, 'an empty expect'],
      ['entry-point', { command: 'x', timeout_ms: -1 }, 'a negative time limit'],
      ['entry-point', { command: 'npm test && rm -rf build' }, 'a shell operator'],
      ['entry-point', { command: 'node x.js\u0007' }, 'a control character'],
      ['entry-point', [1], 'a list'],
    ]) noWrite(set(kind, '--payload-file', payload(kind === 'deployment' ? DEPLOY : ENTRY, value)), what);
    fs.writeFileSync(path.join(root, 'package.json'), '{"name":"x"}');
    fs.mkdirSync(path.join(root, '.ctoc', 'state', 'payloads', 'sub'), { recursive: true });
    fs.writeFileSync(path.join(root, '.ctoc', 'state', 'payloads', 'sub', 'x.json'), JSON.stringify(BLOCK));
    for (const [rel, what] of [
      ['package.json', 'a file outside the payload folder'],
      ['.ctoc/state/payloads/sub/x.json', 'a file below the payload folder'],
      [path.join(root, DEPLOY), 'an absolute path'],
      ['.ctoc\\state\\payloads\\deployment-block.json', 'a backslash'],
      ['.ctoc/state/payloads/missing.json', 'a missing file'],
      [payload('.ctoc/state/payloads/broken.json', '{not json'), 'a file that is not JSON'],
    ]) noWrite(set('deployment', '--payload-file', rel), what);
    for (const words of [['theme', '--payload-file', DEPLOY], ['deployment'], ['deployment', '--payload-file', DEPLOY, 'extra'],
      ['deployment', '--payload-file', DEPLOY, '--confirm', 'abc']]) noWrite(set(...words), words.join(' '));
    assert.equal(text(), before, 'nothing was written');
  });

  it('S29-5: nothing is written without the owner\'s OK: no confirmation, a confirmation that is not the preview\'s, and a payload changed after the preview', () => {
    seed(OTHER);
    const before = text();
    const preview = set('deployment', '--payload-file', payload(DEPLOY, BLOCK));
    assert.equal(text(), before, 'the preview wrote nothing');
    const wrong = set('deployment', '--payload-file', DEPLOY, '--confirm', '0'.repeat(64));
    assert.equal(wrong.ok, false);
    assert.equal(wrong.stale, true);
    payload(DEPLOY, { ...BLOCK, dry_run: false }); // the file changes after the owner saw it
    const swapped = pick(preview);
    assert.equal(swapped.ok, false);
    assert.equal(swapped.stale, true);
    assert.ok(swapped.text.startsWith('Nothing was written: the payload file no longer holds what the preview showed.'));
    assert.ok(swapped.text.includes('Runs for real: YES'), 'the stale screen shows what the file holds now');
    assert.equal(text(), before, 'nothing was written');
    // The new preview's own pick writes what it shows.
    assert.equal(pick(swapped).ok, true);
    assert.equal(read().deployment.dry_run, false);
  });

  it('S29-6: a settings file that is not one JSON object, or whose category is not an object, is never overwritten; a write fault leaves the old text whole', (t) => {
    for (const bad of ['{not json', '[1,2]', JSON.stringify({ general: 'dev' })]) {
      fs.writeFileSync(settingsFile(), bad);
      const res = pick(set('entry-point', '--payload-file', payload(ENTRY, { command: 'node x.js' })));
      assert.equal(res.ok, false, bad);
      assert.equal(text(), bad, `the file is unchanged: ${bad}`);
    }
    fs.rmSync(settingsFile());
    assert.equal(pick(set('deployment', '--payload-file', payload(DEPLOY, BLOCK))).ok, true);
    assert.deepEqual(read(), { deployment: BLOCK }, 'with no settings file, the one key is written into a new file');
    seed(OTHER);
    const before = text();
    t.mock.method(safeFs, 'renameSync', () => { throw Object.assign(new Error('denied'), { code: 'EACCES' }); });
    const res = pick(set('deployment', '--payload-file', payload(DEPLOY, BLOCK)));
    t.mock.restoreAll();
    assert.equal(res.ok, false);
    assert.ok(res.text.includes('(EACCES)'), res.text);
    assert.equal(text(), before, 'the old text stays whole');
    assert.deepEqual(fs.readdirSync(path.join(root, '.ctoc')).filter((f) => f.includes('.tmp-')), [], 'no temporary file is left');
    assert.throws(() => settings.writeOneSetting(['__proto__'], 1, root), /one or two safe names/);
  });

  it('S29-7: the entry point is set through the route, the check run reads it, and both last-mile reasons name the route', async () => {
    const preview = set('entry-point', '--payload-file', payload(ENTRY, { command: 'node src/cli.js --version', expect: 'v1.', timeout_ms: 20000 }));
    assert.ok(preview.text.includes('It runs this command in the project folder, as one command and never through a shell: "node src/cli.js --version"'));
    assert.ok(preview.text.includes('It passes when the output holds "v1."'));
    assert.equal(appRunner.readDeclaredEntryPoint(root).declaration, null, 'not written before the pick');
    assert.equal(pick(preview).ok, true);
    assert.deepEqual(appRunner.readDeclaredEntryPoint(root),
      { declaration: { command: 'node src/cli.js --version', expect: 'v1.', timeoutMs: 20000 }, reason: null });
    const bad = makeRoot('ctoc-set-bad-');
    fs.writeFileSync(path.join(bad, '.ctoc', 'settings.json'), JSON.stringify({ general: { entry_point: {} } }));
    assert.ok(appRunner.readDeclaredEntryPoint(bad).reason.includes(ENTRY_ROUTE), 'the malformed reason names the route');
    const none = makeRoot('ctoc-set-none-');
    fs.writeFileSync(path.join(none, '.ctoc', 'settings.json'), JSON.stringify({ general: {} }));
    fs.writeFileSync(path.join(none, 'package.json'), JSON.stringify({ name: 'fixture', version: '1.0.0', main: 'index.js' }));
    fs.writeFileSync(path.join(none, 'index.js'), 'module.exports = {};');
    const res = await appRunner.driveApp(none);
    assert.ok(res.evidence.reason.includes(ENTRY_ROUTE), `the not-declared reason names the route; got ${res.evidence.reason}`);
  });

  it('S29-8: through the real menu command, the owner\'s pick writes the block (the session\'s two calls)', () => {
    seed(OTHER);
    payload(DEPLOY, BLOCK);
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    const menu = (args) => {
      const r = spawnSync(process.execPath, [START, ...args], { cwd: root, env, encoding: 'utf8', timeout: 30000 });
      assert.equal(r.status, 0, `status ${r.status}, signal ${r.signal}: ${r.stderr}`);
      return JSON.parse(r.stdout);
    };
    const preview = menu(['menu', 'set', 'deployment', '--payload-file', DEPLOY]);
    assert.equal(read().deployment.enabled, false, 'the preview wrote nothing');
    const done = menu(writeAction(preview).split(' '));
    assert.equal(done.ok, true, done.text);
    assert.deepEqual(read().deployment, BLOCK);
    assert.deepEqual(read().git, OTHER.git);
  });

  it('S29-9: a background agent is refused the route and the settings writer; the main session runs both calls; the agent may write its payload file', () => {
    const MENU = 'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"';
    const q = (words) => words.map((w) => `'${w}'`).join(' ');
    const base = (tool, input) => ({ session_id: 't', transcript_path: path.join(root, 't.jsonl'), cwd: root,
      permission_mode: 'default', hook_event_name: 'PreToolUse', tool_name: tool, tool_input: input });
    const bash = (command) => base('Bash', { command, description: 'd' });
    const agent = (input) => ({ ...input, agent_id: 'a1b2c3', agent_type: 'deployment-setup' });
    const hook = (input) => spawnSync(process.execPath, [HOOK], { cwd: root, input: JSON.stringify(input), encoding: 'utf8' });
    const deny = (s) => JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: s } });
    const refused = (res, what, s) => {
      assert.equal(res.status, 2, `${what}: expected exit 2, got ${res.status}; ${res.stderr}`);
      assert.equal(res.stdout, deny(s), `${what}: the sentence`);
    };
    const allowed = (res, what) => {
      assert.equal(res.status, 0, `${what}: expected exit 0, got ${res.status}; ${res.stdout} ${res.stderr}`);
      assert.equal(res.stdout, '', what);
    };
    for (const words of [
      ['menu', 'set', 'deployment', '--payload-file', DEPLOY],
      ['menu', 'set', 'deployment', '--payload-file', DEPLOY, '--confirm', 'a'.repeat(64)],
      ['menu', 'set', 'entry-point', '--payload-file', ENTRY],
      ['menu', 'set', 'entry-point', '--payload-file', ENTRY, '--confirm', 'a'.repeat(64)],
    ]) {
      const command = `${MENU} ${q(words)}`;
      refused(hook(agent(bash(command))), `background agent: ${command}`, REFUSAL_WRITE);
      allowed(hook(bash(command)), `main session: ${command}`);
    }
    const inline = 'node -e "require(\'${CLAUDE_PLUGIN_ROOT}/src/lib/settings\').writeOneSetting([\'deployment\'], {}, process.cwd())"';
    refused(hook(agent(bash(inline))), 'background agent: the settings writer in inline code', REFUSAL_WRITE);
    allowed(hook(agent(base('Write', { file_path: path.join(root, '.ctoc', 'state', 'payloads', 'deployment-block.json'), content: '{}' }))),
      'background agent: its payload file');
    refused(hook(base('Write', { file_path: settingsFile(), content: '{}' })), 'main session: the settings file itself', REFUSAL_SETTINGS);
  });

  it('S29-10: the session and the agent are told the route: start.md\'s row and the agent\'s paragraph', () => {
    const md = fs.readFileSync(START_MD, 'utf8');
    const row = md.split('\n').find((l) => l.startsWith("| `menu set deployment --payload-file '<path>'`"));
    assert.ok(row, 'a Navigation Commands row for the route');
    for (const words of ["`menu set entry-point --payload-file '<path>'`", '`.ctoc/state/payloads/deployment-block.json`',
      '`.ctoc/state/payloads/entry-point.json`', "only the owner's pick of \"Write\""]) {
      assert.ok(row.includes(words), `the row says ${words}`);
    }
    const agentText = fs.readFileSync(AGENT_MD, 'utf8');
    assert.ok(agentText.includes('the main session runs the menu\'s deployment route on it (`menu set deployment`)'), 'the agent names the route');
    assert.ok(agentText.includes('Steps 4 to 6 read `.ctoc/settings.json`, so they run only after the menu has written your block'),
      'the steps that read the settings wait for the menu');
  });
});
```

The `__proto__` row: `JSON.parse('{"__proto__": …}')` makes an own key named `__proto__`, which `Object.entries` lists,
so the top-level key check refuses it. Step 9 confirms which shared helpers of the dependencies the file can reuse
(`deny`'s shape in `tests/protect-records.test.js` line 69). It keeps its own short copies, because a test file
requiring another test file couples them.

### Test Plan

**Framework:** `node:test` with `node:assert/strict`. One test file is added, so the test-file count moves. "Before"
is the tree with the three dependencies landed and none of this plan's edits.

| Case | Before | After | What it pins |
|---|---|---|---|
| S29-1 | FAILS: `menu set` falls through to the dashboard | passes | the preview's plain words for every strategy and its exact value; the preview writes nothing; the pick writes the block |
| S29-2 | FAILS | passes | every other key unchanged, in value and order, for both settings |
| S29-3 | FAILS: the dashboard has no `ok: false` | passes | an unknown key refused at every level, with and without a made-up confirmation; the pipeline's own defaults accepted |
| S29-4 | FAILS | passes | wrong types, required keys, per-strategy needs, a shell operator, invisible characters, every path outside the folder, unreadable payloads, malformed calls |
| S29-5 | FAILS: no preview to pick from | passes | nothing written without the matching confirmation; a payload swapped after the preview is shown, not written |
| S29-6 | FAILS | passes | a malformed file or category never overwritten; a new file holds only the key; a write fault leaves the old text and no temporary file |
| S29-7 | FAILS | passes | the entry point written through the route and read by the check run; both reasons name the route |
| S29-8 | FAILS | passes | the session's two calls through the real `start.js` |
| S29-9 | passes (a guard: the decision-route plan's rule already refuses any route that is not a view) | passes | the route and the writer refused to a background agent with `REFUSAL_WRITE`; the main session's calls pass the settings refusal; the agent's payload write allowed; the file closed to the main session |
| S29-10 | FAILS | passes | start.md's row and the agent's paragraph name the route and the fixed paths |
| agent-tool-grants, the four pinned sentences | FAIL | pass | the agent's new paragraph and its step 4 |
| menu-task-wiring S18-9 and S19-6 | pass | pass | the start.md row classified and its words known; without these entries Step 10's row would turn both red |

Every other case of the touched files passes before and after. The settings change's case 6c passes after: both
reasons keep "by hand" and "write protection".

**Mutant checks in Step 10.** Before each mutant, save a copy of the file outside the checkout. Then make the change, run
the new test file, record which case fails, write the saved copy back, and record that the file's sha256 equals the
copy's. No git command undoes anything in the shared checkout.

| Mutant | Must fail |
|---|---|
| 1. `setCommand` writes on the preview (calls `writeOneSetting` when `confirm === null`) | S29-1 "the preview wrote nothing", S29-5 |
| 2. Drop the token comparison | S29-5 |
| 3. Drop the top-level key check in `deploymentProblem` | S29-3's top-level rows |
| 4. Drop the key check in `environmentProblem` | S29-3's environment row |
| 5. Drop the `ENTRY_POINT_KEYS` check | S29-3's entry-point row |
| 6. Accept any object for `notifications` and `rollback` | S29-3's nested rows |
| 7. `hasUnshowable` returns false | S29-4's invisible-character rows |
| 8. `SET_PAYLOAD_RE` replaced by "any plain path" | S29-4's path rows |
| 9. `STRATEGY_NEEDS` check dropped | S29-4's webhook and ssh rows |
| 10. The `resolveScriptCommand` check dropped | S29-4's shell-operator row |
| 11. `writeOneSetting` reads through `readRawSettings` | S29-6's malformed rows |
| 12. `writeOneSetting` writes `{ [key]: value }` alone | S29-2 |
| 13. The category-not-object guard dropped | S29-6's `general: 'dev'` row |
| 14. `NO_DECLARATION_SUFFIX` without `ENTRY_POINT_ROUTE` | S29-7 |
| 15. The malformed reason without `ENTRY_POINT_ROUTE` | S29-7 |

**Coverage:** every branch of `setCommand`, `deploymentProblem`, `environmentProblem`, `entryPointValueProblem`,
`hasUnshowable`, `strategyWords` (six strategies), `describeDeployment` (both `dry_run` sentences, an on and an off
target), `describeEntryPoint` (with and without `expect` and `timeout_ms`; S29-2's declaration has no `timeout_ms`),
`writeOneSetting` (absent file, valid file, both malformed forms, the category forms, the write fault, the unsafe key
path) and `entryPointProblem` (each check, through S29-4 and the existing last-mile cases). The coverage of `src/` must
not fall (Step 14).

### Security Review

- [ ] **Only the owner's pick writes.**
  - The write runs only on `--confirm <token>`, where the token is the SHA-256 of the setting's name and the exact value
    the preview showed. Only the preview's "Write" action carries it.
  - The confirmation re-reads and re-checks the file, so a payload swapped after the preview is shown again, never
    written (S29-5).
  - A background agent cannot run the route, cannot load `settings` or `menu-screens` in inline code (the decision-route
    plan; S29-9), and cannot write the file with any tool (the settings change).
  - **Limit, stated:** the menu cannot tell the owner's pick from the session running the Write action unasked. That
    holds for every menu action (the sweep, the stream approve). The session is bound by start.md's protocol: the
    screen's `ask` goes to the owner, and an option's action runs on his pick.
- [ ] **The payload is read narrowly.**
  - Only `.ctoc/state/payloads/<name>.json` is read: no folder below it, no other file, no absolute path, no backslash.
  - It is read through the shell-unquoted plan's `readPayloadFile`: a regular file, no link, one descriptor, at most 64
    KiB, one JSON object.
- [ ] **Agent text is shown as data.**
  - Every value from the file is JSON-quoted in the plain words.
  - A key or value holding a control, format or invisible character is refused, not cleaned, so the screen shows exactly
    what is written.
  - Refusal reasons are fixed words that name only CTOC's own keys and positions, never an agent's key or value.
- [ ] **Nothing the pipeline does not read reaches the block.**
  - The key tables follow `src/lib/deployment.js`, and the pipeline's own defaults pass (S29-3).
  - `dry_run: false` is shown as "Runs for real: YES", and every command, script, host and address is shown.
  - The entry-point command is shown, and a command with a shell operator is refused.
- [ ] **One key, written safely.**
  - Every other key is kept, in value and order (S29-2).
  - A file or category that is not an object is never overwritten (S29-6).
  - The write is a temporary file plus a rename. A write fault leaves the old text and no temporary file. The rename
    replaces a link at the path instead of writing through it.
  - Nothing is written outside `.ctoc/settings.json` and its temporary sibling.
- [ ] **Prototype pollution.** The key path comes from the route's fixed table. `writeOneSetting` refuses the three
  unsafe names. The key checks use `hasOwnProperty`. A `__proto__` key in the payload is refused (S29-3).
- [ ] **Command injection.** The menu runs no command. Its action holds only menu words, the path the regular expression
  allows and a hex token. start.md shows fixed paths, so no agent word reaches the session's command line.
- [ ] **Secrets.** The preview shows every value, an address holding a token included: it must show what is written.
  The agent's Security Considerations already forbid a secret in the block. The plain words and the JSON land in the
  session's conversation, as the agent's report does today.
- [ ] **Denial of service.** The payload is at most 64 KiB. The key check bounds the depth before the
  invisible-character walk.
- [ ] **No hook, no dependency, no secret added.** Exports added: `settings.writeOneSetting` and
  `app-runner.entryPointProblem`, each with a live caller.

### Wiring — the live call sites

| New code | Live call site | Root it is reachable from |
|---|---|---|
| `menu-screens.setCommand` and its helpers | `route`, `case 'menu'`, `args[1] === 'set'` | `/ctoc:start` → `src/commands/start.js` `main()` → `route(splitArgs, app.projectPath, …)`. The session runs it from start.md's new row when the deployment-setup agent reports its block, when the owner sets the entry point, or when a check's reason names the route |
| `settings.writeOneSetting` | `menu-screens.setCommand`, on a matching confirmation | the same |
| `app-runner.entryPointProblem` | `readDeclaredEntryPoint`, and `menu-screens.entryPointValueProblem` | the check run: `src/lib/step-13-verify.js` line 67 → `driveAppSync` → `readDeclaredEntryPoint`; and the route |
| `ENTRY_POINT_ROUTE` in the two reasons | `readDeclaredEntryPoint` and the not-applicable paths that append `NO_DECLARATION_SUFFIX` | the check run's evidence, which the session and the owner read |
| the agent's new paragraph and Post-Setup Verification | the deployment-setup agent, when the CTO Chief dispatches it | its dispatch; its second dispatch for steps 4 to 6 is named on the route's written screen |

No module is added. Each new function is reached from the menu's entry point or the check run in this slice's own Step
10, not in a follow-up.

## Implementation Order

1. MODIFY `tests/menu-task-wiring.test.js` and `tests/agent-tool-grants.test.js`, CREATE
   `tests/a-menu-route-writes-the-deployment-block.test.js` (Step 8; they depend on nothing new).
2. MODIFY `src/lib/app-runner.js` (`entryPointProblem`, `ENTRY_POINT_ROUTE`, the two reasons).
3. MODIFY `src/lib/settings.js` (`writeOneSetting`, the comments).
4. MODIFY `src/lib/menu-screens.js` (the route; it uses 2 and 3).
5. MODIFY `src/commands/start.md` and `agents/infrastructure/deployment-setup.md` (the texts that drive 4).
6. MODIFY `docs/ENFORCEMENT.md`, `CLAUDE.md` and `README.md` (Step 15).

## Acceptance Criteria Mapping

| Criterion (the brief) | Implemented in | Test |
|---|---|---|
| The agent writes its block to a payload file in the shell-unquoted plan's folder | `deployment-setup.md` Configuration Output | agent-tool-grants pins, S29-9 (payload write allowed), S29-10 |
| The session runs one menu route | `menu-screens.setCommand`, start.md row | S29-1, S29-8, S29-10 |
| The route checks the block against allowed keys and shows it in plain words | `deploymentProblem`, `environmentProblem`, `describeDeployment` | S29-1, S29-3, S29-4 |
| Only on his OK the menu writes that one key through `settings.js`, in its own process, keeping every other key | `setCommand` confirmation, `settings.writeOneSetting` | S29-2, S29-5, S29-6, S29-8 |
| The route sets `general.entry_point` | `SET_KINDS['entry-point']`, `entryPointValueProblem` | S29-7 |
| The last-mile messages name the route | `app-runner.js` `ENTRY_POINT_ROUTE` | S29-7 |
| No hook edit; a background agent is refused, pinned by a test | the decision-route plan's rule (unchanged) | S29-9 |
| The deployment-setup agent uses the route | `deployment-setup.md` | agent-tool-grants pins, S29-10 |

## Acceptance Criteria

- [ ] Step 8's first box found the three dependencies' code on the branch, and no hold in force for this plan.
- [ ] An unknown key is refused at every level, and a made-up confirmation of one writes nothing (S29-3).
- [ ] Every other key of the file is unchanged afterwards, in value and order (S29-2).
- [ ] Nothing is written without the owner's OK: a preview, a confirmation that is not the preview's, and a payload
  changed after the preview each write nothing (S29-1, S29-5).
- [ ] A background agent is refused the route and the settings writer with the decision-route sentence; the main session
  runs both calls; the agent may write its payload file; no hook file changed (S29-9; Step 16 checks `git diff
  --name-only` holds no `src/hooks/` file).
- [ ] The entry point is set through the route and read by the check run; both last-mile reasons name the route, and
  the settings change's case 6c still passes (S29-7).
- [ ] A malformed settings file is never overwritten, and a write fault leaves the old text whole (S29-6).
- [ ] The session's two calls work through the real `start.js` (S29-8).
- [ ] The agent's paragraph and its Post-Setup Verification use the route; its four pinned sentences pass.
- [ ] start.md's row is classified in S18-9 and its words are known to S19-6; both pass.
- [ ] Each of the fifteen mutants was killed and undone from its saved copy, compared byte for byte. No git command
  undid anything.
- [ ] Only the eleven declared files changed.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0
  skipped and 0 flaky.

## Risks

| Risk | Likelihood, impact | Mitigation | Where |
|---|---|---|---|
| A dependency lands with another name or shape (`readPayloadFile`, `REFUSAL_WRITE`, the settings change's sentences) | MEDIUM, LOW | Step 8 checks each marker and stops if one is missing; Step 9 takes each sentence as its file holds it | Step 8, Step 9 |
| The nested-settings plan and this plan both add a branch under `case 'menu'` | certain if both land, LOW | different words (`settings` and `set`); text anchors; whichever lands second re-reads `route` | Step 9 |
| The agent's key list drifts from the route's tables | LOW, LOW | the route refuses with the position, and the agent fixes the block; S29-3 holds the tables to the pipeline's defaults | S29-3 |
| A legitimate block is refused (a key the pipeline does not read) | MEDIUM, LOW | the agent writes such choices into its report as notes (its paragraph) | `deployment-setup.md` |
| The session runs the Write action without the owner's pick | LOW, MEDIUM | the same trust as every menu action; stated in the Security Review | — |
| The preview shows a secret placed in the block | LOW, MEDIUM | the agent's Security Considerations forbid it; the preview must show what is written | — |
| Neighbour edits to the same files | MEDIUM, LOW | every edit anchored by its text; at the release both sides of an append are kept | Neighbours |

## Findings for the owner to schedule

Seen while planning, not built here. Whether and when any is built is the owner's call.

1. **The internal-webhook switch is documented on the block but read per environment.** `src/lib/deployment.js` line 332
   says "Override with deployment.allow_internal_webhooks: true", and its two error messages (lines 354 and 366) say
   the same. Yet the webhook strategy reads `config.allow_internal_webhooks` (line 423), where `config` is one
   environment merged with the remote (line 146). Notifications never pass it (line 661). A user who follows the
   message changes nothing. This route accepts the key per environment only, and S29-3 pins that the top-level form is
   refused.
2. **The deployment-setup interview collects choices the pipeline never reads.** These are the webhook's authentication
   method, timeout and retries, the rollout strategy, GitOps, feature flags and the infrastructure tool (its Steps 3, 3b
   and the later sections). From this slice they go into the agent's report as notes, never into the block.
3. **The settings change's anchors in two files no longer match the main checkout.** Its "line 490, from 'Put the
   deployment config into …'" in `agents/infrastructure/deployment-setup.md` does not match: main's line 490 already
   reads "Never write `.ctoc/settings.json` yourself, with any tool: …", from the agent-settings plan. Its "line 640,
   'change only the `deployment` key …'" in `tests/agent-tool-grants.test.js` does not match either: main's pinned
   entry at line 641 is that same sentence. Its Step 9 re-reads. This plan replaces the whole paragraph and every
   pinned entry after the network paragraph, so it does not depend on that wording.

## Neighbours (seen, not built here; scheduling is the owner's)

Every plan outside `plans/done/` whose `files:` names one of this plan's files. Searched on 2026-10-19: the `files:`
lines over `plans/{implementation,todo,in-progress,review}`, each match read.

| Neighbour | Shared file | How it merges |
|---|---|---|
| The settings change (`depends_on`) | `src/lib/app-runner.js`, `agents/infrastructure/deployment-setup.md`, `tests/agent-tool-grants.test.js`, `docs/ENFORCEMENT.md` | Lands first. This plan rewrites the two reasons, the agent's paragraph and post-setup list, its pinned entries and its two document passages, as the settings change's Finding 10 asks. |
| The decision-route plan (`depends_on`) | `src/commands/start.md`, `docs/ENFORCEMENT.md` | Lands first. This plan edits no line of its rule; it adds one table row and one document sentence that cites it. |
| The shell-unquoted plan (`depends_on`) | `src/lib/menu-screens.js`, `src/commands/start.md`, `tests/menu-task-wiring.test.js` | Lands first. This plan calls its `readPayloadFile` and adds three words to its S19-6 set. |
| The nested-settings plan, `real-projects-do-not-stall-on-the-menu-s1-settings-route.md` | `src/lib/menu-screens.js` (the `case 'menu'` branch, the Usage block), `src/commands/start.md` (a Navigation row), `docs/ENFORCEMENT.md` | Different route word (`settings` and `set`, Decision 1), adjacent lines; whichever lands second re-reads `route` and the table. |
| The agent-questions plan, `plans/todo/dispatched-agents-route-their-questions-to-the-session.md` | `agents/infrastructure/deployment-setup.md`, `tests/agent-tool-grants.test.js`, `src/commands/start.md` | It turns the agent's menus into questions. This plan leaves the summary menu alone and edits only the Configuration Output paragraph, the post-setup list and the pinned entries. |
| The deployment-setup improvement, `plans/todo/00285-every-agent-and-specialist-skill-improved-three-times-s25-deployment-setup.md` | `agents/infrastructure/deployment-setup.md` | Whichever lands second keeps the payload-file paragraph and the two-part post-setup list; Step 9 records which. |
| Slices 12, 13, 24, 27 and 28 of this parent | `src/lib/menu-screens.js`, `src/commands/start.md`, `tests/menu-task-wiring.test.js` (27, 28) | Disjoint spans; text anchors. |
| `small-changes-take-a-small-path.md` and `00414-…-s14-critique-cap.md` | `src/lib/settings.js` | They edit the schema; this plan adds a function after `setSetting` and two comments. |
| `00402-…`, `00406-…`, `00412-…`, the hotfix plans `…-s2-…` and `…-s4-…`, the fewer-rework plans s3, s6 and s8, `the-manual-and-the-docs-stop-claiming-what-ctoc-no-longer-does.md`, `plain-text-in-a-shell-command-is-data-not-a-write-target.md` | `src/commands/start.md`, `src/lib/menu-screens.js` or `docs/ENFORCEMENT.md` | Disjoint spans; text anchors. |
| `agent-tool-grants-s11-removals-held.md`, `agents-that-hold-the-shell-search-with-it-s2-blocked.md` | `tests/agent-tool-grants.test.js` | Different entries. |
| The read-only dashboard and sweep plan (`plans/review/…-s2-read-only-dashboard-and-sweep.md`) and the agent-settings plan (`plans/review/a-background-agent-cannot-change-claude-codes-settings.md`) | `src/lib/menu-screens.js`, `src/commands/start.md`, `docs/ENFORCEMENT.md`, `agents/infrastructure/deployment-setup.md`, `tests/agent-tool-grants.test.js` | Built on main; this plan's anchors are read after them. |

## Decisions Taken Under Ambiguity

All taken on 2026-10-19.

1. **The route is `menu set`, not `menu settings`.** The brief's example name collides with the nested-settings plan's
   `menu settings <folder>`, which reads the first word as a folder (its lines 223-233 and 590). `set` keeps both
   routes and says what this one does.
2. **The payload file holds the value itself, at a fixed name.** The files are `deployment-block.json` and
   `entry-point.json`, and the route reads only `.ctoc/state/payloads/<name>.json`. With the names fixed in start.md,
   no agent word reaches the session's command line. The narrower path rule also keeps the route from taking a setting
   out of another file of the project.
3. **The allowed keys are the keys `src/lib/deployment.js` reads, and nothing else.** A key the pipeline does not read
   is refused, not dropped: dropping would write something other than the file the agent reported.
   - Each environment needs `name` and `strategy`, and `url`, `script` or `host` where its strategy throws without it.
   - `allow_internal_webhooks` is accepted per environment only, where the code reads it (Finding 1).
   - The tables live in `menu-screens.js` beside the route. Exporting them for a test would add dead exports.
     S29-3's defaults row holds them to the pipeline.
4. **The entry point is checked by the reader's own checks.** They are extracted into `entryPointProblem`, so the route
   and the check run cannot disagree. The route adds the key list `command`, `expect` and `timeout_ms`, and refuses a
   command with a shell operator (`resolveScriptCommand`): such a declaration would fail every check run.
   `readDeclaredEntryPoint` keeps ignoring unknown keys in an existing file, so no project's reading changes.
5. **The confirmation is the full SHA-256 of the setting's name and the exact JSON.** It follows the sweep's
   token-in-the-option pattern. It is the full 64 hex characters, because a short prefix could be matched by a crafted
   second payload.
6. **A value with an invisible or control character is refused, not cleaned.** The owner must read exactly what is
   written. The check runs after the key check, which bounds the depth.
7. **The preview does not read the settings file.** A malformed settings file shows at the confirmation, with nothing
   written. That keeps the preview a pure read of one file.
8. **A new strict writer, `writeOneSetting`, in `src/lib/settings.js`.** `setSetting` and `saveSettings` are left
   alone: changing them would change every caller. The writer refuses a malformed file and writes through a
   temporary file and a rename.
9. **The route lives in `menu-screens.js`.** That is where the shell-unquoted plan's `readPayloadFile` is
   module-local. It loads `settings`, `app-runner`, `deployment` and `crypto` lazily, so no other screen loads them. No
   new module, so the decision-route plan's writer list needs no change.
10. **The Write option carries no "Recommended" label.** The screen confirms content an agent wrote, and the menu cannot
    judge its intent. Like the sweep's confirmation, it shows everything and recommends nothing.
11. **The route is refused to a background agent by the decision-route plan's allowlist, with no hook edit.** It is
    pinned by S29-9. That plan's hook test lists its refused routes; this plan does not add `menu set` to them, because
    the allowlist refuses every route that is not a view.
12. **The last-mile reasons keep "by hand" and "write protection".** Both stay true: the owner can edit the file
    outside Claude Code, and every tool is refused. The settings change's case 6c is left unchanged and still passes.
    The route's name is pinned in this plan's own test (S29-7).
13. **Post-Setup Verification is split in two.**
    - Steps 1 to 3 (scripts, branches, webhook) need no saved settings and run before the payload is written.
    - Steps 4 to 6 (check the file, dry run, next steps) run on a second dispatch after the menu wrote the block. The
      route's written screen names that second dispatch.
    - The YAML/JSON well-formedness step is gone: the menu checks the block.
14. **Nine own files.** That is over the slice budget and the brief's six to eight. The two test files beyond the new
    one are forced: the agent's pinned sentences and start.md's two checks would turn red without them. `README.md` and
    `CLAUDE.md` are the test-count ratchet.
15. **No timing test.** Step 12 records the run times of the two calls through `start.js` as measurements.
16. **`effort: medium`.** One route of about two hundred lines in an existing module, one writer, one extracted
    function, and text.
17. **The internal-webhook mismatch is a finding, not fixed here.** It is outside the route's job, and fixing it would
    edit `src/lib/deployment.js`, which the decision-route plan lists as writing no record.

## Execution Plan (Steps 8-16)

The build may run in a worktree. Every note an executor adds goes under a `## Execution Record` heading placed after
Step 16, as one `###` subheading per note: the dependency check, red runs, results, line shifts, mutant checks,
measurements, findings. Nothing is written inside the steps except their check marks. No git command (checkout,
restore, stash, reset) undoes anything in the shared checkout: every mutant is undone by writing back a copy saved
outside the checkout, and the file is compared byte for byte.

### Step 8: TEST
- [ ] **FIRST — the three dependencies have landed on this branch, or the build stops here.** Record each item with
  its file and line:
  - the shell-unquoted plan: `src/lib/menu-screens.js` holds `function readPayloadFile(root, filePath)`, and
    `src/lib/inbox.js` exports `readRegularFile`;
  - the settings change: `src/hooks/protect-records.js` holds `SETTINGS_JSON_SPEC`, and `src/lib/app-runner.js`'s two
    reasons hold "by hand";
  - the decision-route plan: `src/hooks/protect-records.js` holds `REFUSAL_WRITE`, `isReadOnlyRoute` and
    `isOwnCompletion`.

  If any is missing, build nothing and say in one line: "A plan this one depends on has not landed, so nothing is
  built." The queue does not check code: a `depends_on` counts as met once its plan reaches review
  (`src/lib/continuation-queue.js` lines 127-129).
- [ ] No CTOC hold may be in force for this plan. A hold is matched by the plan's file name in
  `.ctoc/streaming/answers.jsonl`, read from the main checkout. It stands until a later `ctoc-hold` entry for it with
  key `release` (the menu's rule, `src/lib/streaming-precompute.js` lines 1119-1128). If the gate critique of this plan
  filed questions under this plan's `ref`, the last answer to each counts, bound as the menu binds an answer
  (`readAnsweredQuestionIds`, lines 1060-1160). An answer that declines the change stops the build. Quote each under
  `## Execution Record`.
- [ ] Take `REFUSAL_WRITE` and `REFUSAL_SETTINGS` word for word from `src/hooks/protect-records.js` as it holds them.
  If either differs from this plan's test constant, the test takes the file's sentence, and that is recorded.
- [ ] Write every test change exactly as the File Specifications say, before any source or text edit:
  - CREATE `tests/a-menu-route-writes-the-deployment-block.test.js`;
  - the four pinned sentences and the comment in `tests/agent-tool-grants.test.js`;
  - the two `REFUSED_ROWS` entries and the three `WORDS` in `tests/menu-task-wiring.test.js`.

  If a label S29-n is already taken, record it and stop.
- [ ] Run the three files before any source or text edit, and record each case's result. It must match the Test Plan's
  "Before" column:
  - **must fail:** S29-1 to S29-8 and S29-10, and the four pinned sentences;
  - **must pass:** S29-9, S18-9 and S19-6.

  If any row differs, stop and record it. If S29-9 fails, the decision-route rule does not refuse the route as read,
  and its cause is found first: no hook is edited here.

### Step 9: PREPARE
- [ ] Re-read, by name, and record every line shift:
  - `src/lib/menu-screens.js`: the Usage block, `route`'s `case 'menu':`, `taskCommand`, `readPayloadFile`, and that the
    names `setCommand`, `SET_KINDS`, `ownKey`, `isJsonObject`, `DEPLOYMENT_KEYS` and the other new names are free;
  - `src/lib/settings.js`: the header, the `SETTINGS_SCHEMA` NOTE, `setSetting`, `module.exports`;
  - `src/lib/app-runner.js`: `ENTRY_POINT_KEY`, `NO_DECLARATION_SUFFIX`, `readDeclaredEntryPoint`, `module.exports`;
  - `src/commands/start.md`: the Navigation Commands table, and whether the nested-settings plan's row is there;
  - `agents/infrastructure/deployment-setup.md`: the Configuration Output paragraph and the Post-Setup Verification list
    as the settings change and the neighbours leave them;
  - `docs/ENFORCEMENT.md`: the entry-point section, the settings paragraph and the background-agent settings paragraph;
  - `tests/agent-tool-grants.test.js`: the comment and the `'infrastructure/deployment-setup'` entries;
  - `tests/menu-task-wiring.test.js`: S18-9's `REFUSED_ROWS` and S19-6's `WORDS`.
- [ ] Confirm how `start.js` picks the project root for a temporary folder with `.ctoc/` and `plans/` and no
  `CLAUDE_PROJECT_DIR`, as `tests/the-owner-answers-an-inbox-question.test.js` lines 130-136 and 263-268 set it up.
  S29-8 follows that.
- [ ] Confirm that the dead-export fence (`tests/export-reachability.test.js`) counts `require('./app-runner')
  .entryPointProblem` and `require('./settings').writeOneSetting`, read inside a function, as uses. If it does not,
  take each by destructuring at the call, and record it.
- [ ] Measure, before the change, the run time of `node src/commands/start.js menu commands` in a temporary project.
  Record it for Step 12.
- [ ] Record `git diff --name-only` for the declared files (a read).

### Step 10: IMPLEMENT
- [ ] Make the changes of the File Specifications at the anchors Step 9 recorded:
  - `src/lib/app-runner.js`: changes 1-5;
  - `src/lib/settings.js`: changes 1-4;
  - `src/lib/menu-screens.js`: changes 1-4;
  - `src/commands/start.md`: the row;
  - `agents/infrastructure/deployment-setup.md`: the paragraph and the post-setup list;
  - `docs/ENFORCEMENT.md`, `CLAUDE.md` and `README.md` wait for Step 15.
- [ ] Run `npm run lint` and `npm run typecheck`: no warning, and the type error count stays at
  `.ctoc/typecheck-baseline.json` `maxErrors`. Confirm `security/detect-unsafe-regex` passes on the new regular
  expressions.
- [ ] Run the affected tests and record every result:
  - the three Step 8 files;
  - the last-mile and app-runner tests: `tests/last-mile-drives-entry-point.test.js`,
    `tests/app-runner-coverage-holes.test.js`, `tests/app-runner-coverage.test.js`, `tests/app-runner.test.js`, and
    every test file whose name starts with `step-13-verify`;
  - the settings tests: every test file whose name holds `settings` or `environment`, and
    `tests/ship-gate-real.test.js`;
  - the menu tests: `tests/menu-coverage.test.js`, `tests/e2e-menu-lifecycle.test.js`,
    `tests/export-reachability.test.js`, `tests/reachability.test.js`;
  - the hook test: `tests/protect-records.test.js`;
  - the readers of the agent file: `tests/agent-model-floor.test.js`, `tests/architecture-invariants.test.js`,
    `tests/corpus-audit-ledger.test.js`;
  - the start.md readers: `tests/only-the-owner-answers-an-inbox-question.test.js`,
    `tests/the-dashboard-never-sends-live-work-back.test.js`, `tests/shipped-recipes-execute.test.js`;
  - the false-green fence `tests/false-green-fence.test.js`.

  Run each only if it exists, and record any that is absent. A failing test is investigated to its cause before
  anything is touched (Step 14's rule). A failing test outside the declared files is a scope-growth request
  (`src/lib/scope-growth.js`), never a silent edit.
- [ ] Run the fifteen mutant checks of the Test Plan. For each one, save a copy outside the checkout, make the change,
  run, record which case fails, write the copy back, and record that the file's sha256 equals the copy's.

### Step 11: REVIEW
- [ ] The critic confirms by reading the code:
  - the route writes only on a confirmation equal to the SHA-256 of what the file holds at that moment;
  - every refusal writes nothing and echoes no agent text;
  - the key tables match what `src/lib/deployment.js` reads, strategy by strategy;
  - `entryPointProblem` returns the same words the old `bad(…)` calls did, so `readDeclaredEntryPoint`'s answers are
    unchanged but for the closing sentence;
  - `writeOneSetting` keeps every other key, never writes over a malformed file, and leaves no temporary file on a
    fault;
  - no file under `src/hooks/` changed, and S29-9 refuses the route through the decision-route rule;
  - the agent's paragraph, start.md's row and the document say what the code does;
  - every neighbour's anchor is intact.

### Step 12: OPTIMIZE
- [ ] Measure the run time of the preview and the confirmation through `start.js` in a temporary project, beside Step
  9's figure for `menu commands`, and record them.
  - This is a recorded measurement, not a gated test: no time limit is asserted in any test (the owner's rule of
    2026-10-18).
  - A preview more than a few tens of milliseconds slower than `menu commands` is recorded as a finding with its
    cause. The likely cause is loading `deployment` or `app-runner`.
- [ ] Apply the review's findings that change no behaviour.

### Step 13: SECURE
- [ ] The security scanner attacks the route and confirms the stated limits. It tries:
  - a payload path with `..`, a backslash, an absolute path, a link, a folder, a pipe and a file over 64 KiB;
  - a block with a prototype key at every level, a key differing only in letter case, a nested unknown key, a huge
    environment list, and every type mix-up;
  - an invisible or control character in a key and in a value, at every level;
  - a confirmation from another kind, another file, an earlier preview, a forged token, and a payload swapped between
    the preview and the pick;
  - a settings file that is a link, a folder, a malformed text and a file whose `general` is a list;
  - an entry-point command with each shell operator, quoted and unquoted;
  - a background agent's call of the route in every form the decision-route plan reads (plain, through `sh -c`, `env`,
    `npx`, inline code loading `settings` or `menu-screens`), and its Write of a payload file;
  - the main session's call through the settings change's two readings of a command.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0
  skipped, 0 flaky. Record the test count and the coverage figure.
- [ ] Always investigate failing tests. Every failing test — including one that passes on rerun — is reproduced and root-caused in the product code before anything is reported or merged; 'flaky' is a finding, never an explanation. Fix the code; change the test only when it is proven wrong, with the reason written down.

### Step 15: DOCUMENT
- [ ] `docs/ENFORCEMENT.md`: the three changes of the File Specifications, at the anchors Step 9 recorded. The
  entry-point section keeps exactly one fenced `json` block naming `entry_point`.
- [ ] `CLAUDE.md` (its two test-file count lines) and `README.md` (its `tests/` structure line): the count of
  `tests/*.test.js` on disk. `tests/readme-numbers.test.js` and the documented-count checks confirm it.
- [ ] Confirm that every one of these says what the code does: the module comments of `menu-screens.js`, `settings.js`
  and `app-runner.js`, the agent's paragraph and list, start.md's row and the document. Record the search
  `menu set|writeOneSetting|entryPointProblem|deployment-block\.json|entry-point\.json` over `src/`, `agents/`, `docs/`
  and `tests/`. Explain any match the File Specifications do not name.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box is checked against the record of Steps 8-15, with these shown under `## Execution Record`:
  - the dependency check and any quoted answers;
  - the red results;
  - the mutant results;
  - the measurements;
  - `git diff --name-only`, holding only the eleven declared files and no file under `src/hooks/`;
  - the final suite figures.
