---
title: "Text an agent wrote never reaches the shell unquoted"
type: implementation
created: 2026-10-12
priority: high
effort: medium
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s9-only-the-owner-answers-an-inbox-question, four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s18-a-task-next-action-is-a-plain-read-only-route
files:
  - src/lib/menu-screens.js
  - src/lib/inbox.js
  - src/commands/start.md
  - agents/iron-loop/iron-loop-executor.md
  - tests/menu-task-wiring.test.js
  - tests/menu-screens-coverage.test.js
  - tests/the-session-claims-a-build-before-launching-it.test.js
  - tests/test-writers-get-the-fast-test-rules.test.js
revision: 1
rejection_reason: "Owner's answer of 2026-10-17, Refuse decision routes (Recommended): background agents are refused on"
tag: rejected
---
# REVISION 1

## Rejection Feedback

Owner's answer of 2026-10-17, Refuse decision routes (Recommended): background agents are refused only the routes that record his decisions (stream approve, stream answer, stream comment, inbox answer, the approve actions); his 2026-10-15 removal stands for everything else. Re-plan to that scope.

---


# Text an agent wrote never reaches the shell unquoted

Slice 19 of `plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`. It is not one of the
parent's five suggested slices: slice 18's review listed the hole ("The completion recipe passes the summary in double
quotes", slice 18, Risks, the last item under "Found in the review round"), and the owner's words of 2026-10-12, as the main
session relayed them, ask for it to be fixed with the round's other holes (Decision 1). Every line number below was read on
2026-10-12. `src/lib/menu-screens.js` was being changed by slice 8's build while this plan was written, so its numbers are
those of the working tree at that moment; `src/commands/start.md` carries the uncommitted work of the finished slices 2-5
and is also declared by slices 9, 14 and 18; `src/hooks/protect-records.js`, `src/hooks/PreToolUse.Bash.js`,
`docs/ENFORCEMENT.md` and the four test files carried no uncommitted work. The second revision of 2026-10-13 applies the CTO
Chief's rulings after the maximum-effort red-team critique, which found three high problems in the first revision: the
main-session check was skipped for three spellings of the menu's script word; the long-word skip in the link check was
unsound because shell expansion (a brace list, a `${VAR:+…}` word) can turn a long word into a record path; and the whole
channel rested on the session computing base64 itself, which is unverified, fails mostly silently, and invites an encoding
command that is itself an injection path. The **root fix**: no agent-written text reaches any command line at all. The
session writes the payload object to a fresh file in its own scratch folder with the Write tool and passes only that plain
path, `--payload-file <path>`; the menu reads the file through a safe reader (a regular file, a size cap, valid UTF-8 JSON,
the same key-and-type check). No base64 is computed by the model anywhere. The main-session check in the write protection
stays as a backstop, now unevadable for the three script-word spellings and correct about a line break inside single
quotes; the long-word skip is narrowed to a word of plain path characters only. The revision keeps the owner's own recorded
answer before the build, hook edits that hold whichever of slices 19 and 20 is built first, and no git command to undo
anything in the shared checkout; it re-read every span it newly cites: `src/commands/start.md` had moved since 2026-10-12 (WORK
dispatch step 1 is at line 120, the completion recipe at line 130, the `search` recipe at lines 324-326, Rule 14 at line
457, and slice 9's "Answering an inbox question" stands at lines 416-434); the cited lines of the hook,
`src/hooks/PreToolUse.Bash.js` and `tests/protect-records.test.js` were unchanged. The builder re-reads every cited span at
Step 9 and edits the lines as they are then.

The **third revision of 2026-10-13** applies the CTO Chief's rulings on the round-3 review (the LAST round Step 7 allows;
there is no round 4): case 101 now actually exercises the long-word fix with two forgeries OVER 4096 characters; the short
shell-expanded record-path family is honestly stated as not caught and left to slice 20, and every "always resolved and
refused" claim is corrected to what the code does; the background-agent `menu task fail` refusal is removed from case 99
(slice 19 leaves that grammar to slice 21), and case 99 seeds its own build task; case 98 is stated to pass before the
change, its red evidence the mutants; an unquoted backslash is refused and the payload path is passed with forward slashes;
each payload is bound to its call (`task`/`kind`/`plan`); the narrowed guard's new refusal is listed; a real-shell check
(S19-5) confirms the backstop's model against bash and zsh; the launcher residual and the macOS zsh 5.9 shell (verified)
are stated. Each is Decisions 18-28 below, one per round-3 finding.

## Revision 2 (2026-10-18): no hook change

Names used in this plan:
- **"Revision 2"** is this re-plan of 2026-10-18, made after the owner's send-back (the block at the top, headed
  REVISION 1).
- **"Revision 1"** is the plan as it stood before it, including its revisions of 2026-10-13 described in the two
  paragraphs above.

Those two paragraphs are history. Where they speak of a backstop, a hook check or the long-word fix, revision 2 removes
it. Where they speak of "its own scratch folder", an unquoted `--payload-file <path>` or "valid UTF-8 JSON", the last
review round below supersedes them (Decisions 43, 44 and 46).

The owner's two decisions bind this revision:
- **2026-10-15:** "remove that hook block, it is wrong". `RECORD_REFUSALS_OFF = true` in `src/hooks/protect-records.js`,
  line 597, read on 2026-10-18.
- **2026-10-17:** inbox question 1792309430830-sftztp, answer "Refuse decision routes (Recommended)", recorded in
  `.ctoc/streaming/inbox-answers.jsonl` line 8. His removal stands for everything but the routes that record his
  decisions, which slice 21 now refuses to a background agent.

So this slice keeps only its work outside the hook:
- **The payload-file channel.** The session writes an agent's text with the Write tool to a file in the payload
  folder, `.ctoc/state/payloads/`, and passes `--payload-file '<path>'` (single quotes and the named folder since the
  last review round, Decisions 43 and 44). The menu reads it through a safe reader, checks keys, types and the
  binding to the call, and refuses an unreadable payload out loud.
- **The quoting.** Start.md's Rule 15 and recipes put no agent text on a command line; the owner's comment is single
  quoted with `'\''`; the claim-failure summaries use fixed words; the `search` recipe reads its concept from a file.
- **The summary handling.** `menu task fail` reads its summary from the payload.
- **The build agent's completion** (added by the last review round, Decision 42). The build agent's definition writes
  its summary to a payload file too.

Removed:
- **The write protection's main-session backstop.** `REFUSAL_MAIN_SHELL`, `runsCtocMenu`, `heredocCallLine` and
  `mainSessionMenuRefusal`.
- **The `'\''` branch in the hook's word reader**, the move of the hook's `B64_KEYS` and the `payloadFile` field. Each
  is reached only by the background-agent reading that `RECORD_REFUSALS_OFF` leaves unreached.
- **The narrowed length skip in `src/hooks/PreToolUse.Bash.js`.** It is now reached only by the settings refusal
  (Neighbours).
- **Every claim that the hook refuses something for this slice.**

With them go the hook-change approval question, its Step 8 box and the free-text-flag question about the backstop
(Decisions 32-37). `files:` shrinks from nine to five; `depends_on` stays slices 9 and 18. (Superseded 2026-10-18 by
the last review round below: `files:` is now eight.)

**Build order.** This slice runs after slices 9 and 18 (`depends_on`). It no longer touches the hook, so it has no
order with slices 20, 24 or the hotfix check's slices. Slice 22 depends on it. (Corrected 2026-10-18: slice 21, the
plan that refuses a background agent the routes recording the owner's decisions, does edit `src/commands/start.md`;
the order with it is stated under the last review round below, Decision 50.)

## The last review round (2026-10-18): the owner's answers folded in

The gate critique of 2026-10-18 put seven findings and a coverage note to the owner; he answered each with its
recommended option (`.ctoc/streaming/answers.jsonl` lines 94-108, read on 2026-10-18; the gate ruling itself was
held). This is the last
review round the iron loop allows. What changes, each with its decision below (Decisions 40-54, dated 2026-10-18):

- **The recipes are checked by an allowlist, not by a list of old phrasings** (critical answer). S19-6 walks every
  menu call start.md shows and admits only a payload file, fixed words in single quotes, and what the menu or the
  harness gave the session (Decision 40).
- **One recorded real-session trial** at Steps 14 and 16: a session completes a task whose agent summary holds `$( )`
  and backticks, and the record shows the payload file was used and nothing ran (Decision 41).
- **The build agent's own completion goes through the payload file.** `agents/iron-loop/iron-loop-executor.md` line
  189 put its summary in double quotes. It now writes the payload file and passes `--payload-file`. X3 pins that the
  double-quoted form is gone (Decision 42).
- **The payload path is single-quoted** in every recipe and in Rule 15, and the menu's path check no longer admits a
  space or a backslash. S19-5 has a case whose path holds a space (Decision 43).
- **The payload folder is named:** `.ctoc/state/payloads/`, under the project root, passed as a relative path. The
  main session's own scratch folder was checked and is not used (Decision 44).
- **Each payload-reader guard gets one test case and one mutant** (S19-5; Decision 45).
- **The reader opens the file once,** checks the open descriptor and reads at most the size cap, through the inbox's
  existing descriptor reader. Decision 17 is corrected to what that does (Decisions 46 and 17).
- **S19-3 runs in the shell Claude Code itself uses** on each platform: Git Bash on Windows (Decision 47).
- **A `..` segment in the payload path is refused** (Decision 48).
- **A refusal and the log never echo** the payload's key names or its kind, plan and task values (Decision 49).
- **The order with slice 21 is stated** (Decision 50).
- **Two corrections found while re-reading the fences:** the rewritten `search` recipe reads its file through
  `src/lib/safe-fs`, because the recipe-execution test resolves every `require` under the repository (Decision 53);
  and "Human gates stay foreground" stops describing `--gate N` and `--next` as the completion's flags (Decision 54).

`files:` grows from five to eight: `src/lib/inbox.js` (the descriptor reader is exported), the build agent's
definition, and `tests/test-writers-get-the-fast-test-rules.test.js`, whose end marker is the build agent's old
completion line (Decision 51). `depends_on` stays slices 9 and 18.

## Problem Statement

**The recipe that carries an agent's words.** When a background agent finishes, the session runs the completion recipe,
`src/commands/start.md` line 132 (re-read on 2026-10-18, as slice 18 left it): ``menu task complete <id> --continue
--summary "…" [--gate N] [--next '<route>']``, or ``menu task fail <id> --summary "…"`` on failure. The `…` is the
agent's one-line summary (the brief asks the agent to "return a one-line summary … plus a nav route", line 126). It sits
inside double quotes; the next screen the agent named sits on the command line too, inside single quotes the session
must keep it out of whenever it holds anything but the listed characters (slice 18). (Written on 2026-10-12, before
slice 18, the line read `[--next <navroute>]`, unquoted.)

**What the shell does with it.** Inside double quotes the shell still runs a dollar-parenthesis and backticks and expands
`$NAME`; a double quote in the summary ends the word and the rest is read as shell syntax. An unquoted `--next` value is
shell syntax as written: a `;`, `|`, `&&`, `#`, `*` or line break splits, pipes, comments out or globs. So a summary
`$(curl … | sh)`, or a next action `tasks; rm -rf ~`, runs in the main session's shell as the session pastes it, before
the menu sees anything: the menu reads its arguments after the shell has rewritten them (`src/commands/start.js` lines
931-966).

**Why the write protection does not stop it.** The one loaded hook is `src/hooks/protect-records.js`, registered alone in
`hooks/hooks.json`. Since the owner's removal of 2026-10-15 (`RECORD_REFUSALS_OFF`, line 597), its shell decision refuses
nothing but a settings write (`bashRefuses`, lines 599-606, read on 2026-10-18), for the main session and background
agents alike. Even before the removal, it read the main session's menu call only for a record or settings path. A summary
that runs `curl … | sh` touches neither, so it was never refused. This slice adds no hook check. The owner removed the
hook's broad refusals as wrong, so the fix lives where agent text enters, in the session's recipes and the menu.

**Why that matters.** Text an agent wrote, pasted by the main session into its own shell, runs with the main session's
freedom. The main session is the one whose words the owner trusts (start.md, "Answering an inbox question").

**The menu already has a `--b64` payload, but it rests on the model computing base64 — which the red-team critic
rejected.** `menu task complete` and `menu task add` read a `--b64` payload (`decodeB64`, `src/lib/menu-screens.js` lines
2306-2318): the base64 of one JSON object, whose alphabet no shell reads as anything but text. But the session computes
that base64 itself, which is unverified, fails mostly silently (a wrong character decodes to valid JSON with garbled
values), and makes the session reach for an encoding command that is itself an injection path. So the root fix does not put
agent text on the command line in ANY encoding: the session writes the JSON object with the Write tool to a fresh
file in the payload folder, `.ctoc/state/payloads/` under the project root (Decision 44), and the menu reads that file. Today a payload that does not decode is ignored, not refused
(`taskComplete` reads `const extra = p.b64 ? decodeB64(p.b64) : null;`, line 2764 on 2026-10-18, and goes on without it; `buildAddSpec`
keeps the positional values, lines 2372-2382); `menu task fail` reads no payload at all (its branch stores
`p.summary || 'failed'`). Both change: the menu reads a `--payload-file '<path>'` (and still a legacy `--b64`) for `add`,
`complete` and `fail`, refuses out loud a payload it cannot read, and logs each refusal.

**The long-word skip in the records' link test** (`MAX_CANDIDATE_LEN`, `src/hooks/PreToolUse.Bash.js` lines 264-275) is
unconditional on the word's characters, which the round-1 critic found unsound. Revision 1 narrowed it here. Since the
owner's removal it decides only the settings refusal, so revision 2 lists it under Neighbours for that line and does not
change it (Decision 34).

**Every recipe and route that puts text into a shell command.** `start.md` was read whole for this plan, so was the one
skill that tells the session to run the menu (search `commands/start\.js` over `skills/`, 2026-10-13: 1 file,
`skills/deepthink/SKILL.md`), and every route that takes free text was read in `route` (`src/lib/menu-screens.js` lines
3191-3310 on 2026-10-18). The start.md, menu-screens.js, streaming-gate.js and test line numbers in the rows below were
re-read on 2026-10-18; the other rows keep their first writing's numbers, and Step 9 re-reads them all.

| # | Where | The text | Who wrote it | Today | After this slice |
|---|---|---|---|---|---|
| 1 | start.md line 132, completion | `--summary "…"` | the agent | double quotes: `$(…)`, backticks and `$NAME` expand | a payload file; `summary` in the JSON object (the build agent's own recipe too, `agents/iron-loop/iron-loop-executor.md` line 189, Decision 42) |
| 2 | line 132 | `[--next '<route>']` (slice 18) | the agent | single quotes, only for a listed shape | `nextAction` in the payload file; `--next` leaves the recipe (Decision 38) |
| 3 | line 132 | `[--gate N]` | the agent | unquoted | `gate` in the payload file |
| 4 | line 132, failure | `menu task fail <id> --summary "…"` | the agent | double quotes | a payload file, `summary`; the menu reads it (new) |
| 5 | line 122, WORK dispatch | `[--touches files]`, from the plan's `files:` | the planner, an agent | unquoted | a payload file, `touches` |
| 6 | lines 123 and 134 | `--summary '<slug> claim returned no plan path'`, `--summary '<slug> build agent launch refused'` | the plan's file name | single quotes; a `'` in a file name ends them | fixed words, no file name |
| 7 | lines 123 and 134 | `menu task add implement <slug> --touches <files>` | the file name and the plan's `files:` | unquoted | a payload file, `plan` and `touches` |
| 8 | line 327, plan-index `search` (the recipe spans lines 326-328) | `search('<concept>', …)` inside JavaScript inside a double-quoted shell word | what a lens asked for | `$(…)` expands; a `'` ends the JavaScript string | the concept read from a file in the payload folder the `node -e` recipe opens (Rule 15), never on the command line |
| 9 | line 29, `stream comment {stage}/{file}.md {text}` | the comment | the owner (the "Other" answer, `src/lib/streaming-gate.js` lines 1450, 1658, 1704, 2082) | quoting unstated | single quotes, a `'` written `'\''` |
| 10 | slice 9's "Answering an inbox question" | the inbox answer | the owner | a quoted here-document with a fresh marker | unchanged |
| 11 | line 19, a menu action run as the next command | e.g. `plan <stage>/<name>.md` | names on disk: `stageBrowse` puts any plan file name in an action (line 2050) | as given | as given; Rule 15 has the session run a menu action word for word as the menu gave it (Neighbours: the menu could refuse such names itself) |
| 12 | lines 49, 267, 361 | `menu task add precompute '{ref}' …`, the classify record | CTOC: these refs pass `SAFE_PLAN_FILE` (`src/lib/streaming-gate.js` line 95) | single-quoted plain characters | unchanged |
| 13 | lines 279, 286 | `related('plans/{ref}', …)`, `detectConflicts('plans/{ref}', …)` | the same refs | plain characters | unchanged |
| 14 | line 57, `claude:cleanup-exec` | `<slug> <action>`, `<category>` as arguments | the slug is the one the `inbox cleanup plan <slug>` call carried (`inboxCleanupPlanReview` looks the item up by that slug and builds the action from it, from line 1806, its `claude:cleanup-exec` action at line 1846); action and category come from `CLEANUP_CATEGORY_TABLE` (lines 72-76) | unquoted | unchanged: the slug is the one the menu's own `inbox cleanup plan <slug>` screen built the action from |
| 15 | lines 68-71, settings recipes | `{env}`, `{profile}` | the menu, closed sets (`src/commands/start.js` lines 45-47 and 111-114) | plain | unchanged |
| 16 | lines 50-52, `approvePlan` and `approveSubplans` | refs and parent slugs inside inline code | the menu; plan files | allowed for the main session since the owner's removal of 2026-10-15 (the inline-code refusal of `isLedgerForgery` is no longer reached); slice 21 refuses them to a background agent | unchanged |
| 17 | lines 65, 119, 130 and 201 | `--agent-id <harness id>`, `--live-agent-ids <ids>` | the harness | `AGENT_ID` checks the first (`src/lib/menu-screens.js` line 2496) | unchanged |
| 18 | route `hotfix check [--run-tests] [<file> …]` (lines 3304-3305) | file names | — | no start.md recipe passes text to it (search `hotfix` in start.md: 0 matches) | unchanged: no recipe, so no agent text |
| 19 | `skills/deepthink/SKILL.md` lines 79, 82, 88-90 and 104: `menu task add discuss --label "…"`, `menu task fail` and `menu task complete` with `--summary "…"` | the label and the summaries | the session, from the run's slug, checked against `^[a-z0-9]+(-[a-z0-9]+)*$` (lines 70-71) | double quotes around letters, digits, spaces and a colon | unchanged (that file is not declared here): the slug is the session's own validated text, plain, with no `$`, backtick or backslash for the shell to expand inside the double quotes; moving it to a payload file is a Neighbour |
| 20 | `enqueueWaveSync`'s `label` (`src/lib/actions.js` line 2421) | the wave-sync label | the menu, in-process: `opts.label` or the fixed word `'wave-sync'`, and syncs are enqueued programmatically, never from a start.md recipe | never on a command line | unchanged; fixed words or task ids, set in the menu process, so no payload file is needed |

## Technical approach

### The rule

Text an agent wrote — its summary, the next screen it names, its gate, a label, and anything read from a plan file (a name
taken from a returned `planPath`, the plan's `files:` list) — never reaches a shell command, in any encoding. The session
writes the payload as one JSON object with the Write tool to a fresh file in the payload folder, `.ctoc/state/payloads/`
under the project root, and passes only that file's path, relative to the project root and in single quotes:
`--payload-file '.ctoc/state/payloads/<name>.json'`, written `--payload-file '<path>'` in the recipes. The session's
instructions say so in one rule (start.md Rule 15); every recipe that carried such text uses it, and so does the build
agent's own completion (Decision 42); a test admits no other kind of argument in any menu call start.md shows (S19-6,
Decision 40); and the menu reads the file through a safe reader and refuses a payload it cannot read.
`--b64` stays a working option for compatibility, but no recipe uses it, and the model computes no base64 anywhere. No
hook check backs the rule up (revision 2): the owner removed the hook's broad refusals on 2026-10-15, and a backstop that
refuses main-session menu calls would be one (Decision 32).

### The three parts

1. **The session's instructions** (`src/commands/start.md`): Rule 15; the completion, failure, WORK dispatch and resume
   recipes pass agent text only through a payload file (`--payload-file '<path>'`); the two claim-failure summaries use
   fixed words; the plan-index `search` recipe reads the concept from a file in the payload folder its `node -e` snippet
   opens, never on the command line; the `stream comment` row says how the owner's words are quoted.
2. **The menu** (`src/lib/menu-screens.js`): one table of the keys each sub-command's payload may carry (`B64_KEYS`, the
   menu's own, with rows `add`, `complete` and `fail`; the hook's same-named table is left as it is, unreached while
   `RECORD_REFUSALS_OFF` stands, Decision 33) and, beside it, a table of each key's type (`B64_TYPES`); one reader,
   `taskPayload`, used by `add`, `complete` and `fail`, which reads a `--payload-file` path (plain characters, no space,
   no backslash, no `..` segment, resolved against the project root) through the inbox's descriptor reader
   `readRegularFile` (a regular file — no link, no folder, no pipe — opened once, its open descriptor checked, at most
   the size cap read; `src/lib/inbox.js` exports it for this) or a legacy `--b64`, and refuses — out loud, and logged with
   `taskRegistry.warnLog`, naming none of the payload's keys or values — a payload that is not one JSON object holding
   only those keys with those types and bound to its call; `fail` takes its summary from the payload.
3. **The build agent's definition** (`agents/iron-loop/iron-loop-executor.md`): its completion writes the summary to a
   payload file and passes `--payload-file`, never `--summary "…"` (Decision 42).

### Why the menu does not refuse shell characters in a `--summary`

Earlier rounds asked whether the menu should also refuse a plain `--summary` that holds shell characters. It cannot help.
The menu receives its arguments after the shell has run every `$(…)` and backtick in them and put their output in their
place. What ran is gone from what the menu sees, so a refusal there would only refuse text already safely quoted. The fix
is therefore the channel: agent text no longer travels as a `--summary` at all. It is in the payload file, so the only
`--summary` a main-session `menu task` call carries is the session's own fixed words.

## Implementation Details

### Dependency Graph

```
src/commands/start.md (loaded by /ctoc:start) --tells the session--> Rule 15 and the --payload-file recipes
src/commands/start.js main --route--> menu-screens.taskCommand --> taskAdd | taskTransition('fail') | taskComplete
menu-screens.taskAdd / taskTransition('fail') / taskComplete --call--> menu-screens.taskPayload(sub, p, root)
menu-screens.taskPayload --checks--> PLAIN_PATH_RE + the `..` test; --reads--> readPayloadFile(root, path) --> inbox.readRegularFile (lstat, one descriptor, fstat, size cap) | decodeB64 (legacy), then B64_KEYS + B64_TYPES; taskRegistry.warnLog on a refusal
src/lib/inbox.js --exports--> readRegularFile (new export; its one new reader is menu-screens)
agents/iron-loop/iron-loop-executor.md (the build agent) --tells the agent--> write the payload file, then menu task complete <taskId> --payload-file '…'
tests/menu-task-wiring.test.js --calls--> menu-screens.route; --spawns--> the shell Claude Code uses (src/commands/start.js); --reads--> start.md, iron-loop-executor.md
tests/menu-screens-coverage.test.js --calls--> menu-screens.route
tests/the-session-claims-a-build-before-launching-it.test.js --reads--> start.md
tests/test-writers-get-the-fast-test-rules.test.js --reads--> iron-loop-executor.md
```

No module is added and no hook is touched. `menu-screens.js` already requires `./inbox` (its line 27-30 destructure
gains `readRegularFile`), and `inbox.js` requires nothing from `menu-screens.js`, so no cycle; `menu-screens.js`
requires nothing from `src/hooks/`.

### File Specifications

#### File: `src/lib/menu-screens.js`
**Action:** MODIFY
**Purpose:** `--payload-file` parsed; one table of what a payload may carry (with the binding key `task`) and one of each
key's type; one reader that reads a `--payload-file` (or a legacy `--b64`) through the inbox's descriptor reader and
refuses — out loud and logged, naming none of the payload's keys or values — a payload whose path is not plain, that is
unreadable, wrong-typed, or NOT bound to its call (a `complete`/`fail` `task`, or an `add` `kind`/`plan`, that differs
from the command line); and `menu task fail` reading its summary from the payload. `path` (line 24), the `./inbox`
destructure (lines 27-30) and `taskRegistry` (line 41) are already required; the destructure gains `readRegularFile`.
**Change Type:** modify-existing

##### Changes

1. **`parseTaskArgs`** — beside the `--b64` case, add:

```js
      case '--payload-file': out.payloadFile = String(args[++i] == null ? '' : args[i]); break;
```

2. **After `decodeB64`**: the key table, the type table, the file reader, and the one payload reader:

```js
/**
 * The keys a payload may carry, per `menu task` sub-command — exactly the fields that sub-command reads, plus
 * the binding key `task` (`complete`/`fail`) that ties the payload to the call. The menu refuses a payload
 * holding any other key (`taskPayload`). (The write protection keeps a same-named table of its own for its
 * background-agent reading, unreached since the owner's removal of 2026-10-15; it is not this one.) `add` is the main
 * session's own `menu task add` payload (start.md's WORK dispatch and the resume of a refused launch); `fail`
 * reads its summary from a payload since four-defects slice 19. `task` binds the payload to the call (ruling 6):
 * if present it must equal the id argument, else the payload is refused out loud (`taskPayload`); the shipped
 * completion and failure recipes emit it, a hand-written or legacy payload may omit it.
 */
const B64_KEYS = Object.freeze({
  add: new Set(['kind', 'plan', 'label', 'touches', 'blockedBy', 'gitOp']),
  complete: new Set(['task', 'summary', 'nextAction', 'gate']),
  fail: new Set(['task', 'summary']),
});

/**
 * The type each key must have (four-defects slice 19). A key present with the wrong type is refused out loud,
 * never coerced: `task`/`kind`/`plan`/`label`/`summary`/`nextAction` are strings; `touches`/`blockedBy` are
 * arrays of strings; `gate` is an integer or a string of digits; `gitOp` is a boolean.
 */
const B64_TYPES = Object.freeze({
  task: 'string', kind: 'string', plan: 'string', label: 'string', summary: 'string', nextAction: 'string',
  touches: 'string[]', blockedBy: 'string[]', gate: 'int', gitOp: 'boolean',
});

/** The largest payload file the menu will read (bytes). A compact task payload is far under this. */
const MAX_PAYLOAD_BYTES = 65536;
/**
 * The characters a payload-file path may hold: letters, digits and `. _ / : + = @ % -`. No space (an unquoted
 * path would be split by the shell, and a Windows account folder can hold one) and no backslash (the shell reads
 * it as an escape outside quotes). The session passes `.ctoc/state/payloads/<name>.json`, relative to the project
 * root and in single quotes (start.md Rule 15). A `..` segment is refused separately (`taskPayload`).
 * (four-defects slice 19, the last review round of 2026-10-18)
 */
const PLAIN_PATH_RE = /^[A-Za-z0-9._/:+=@%-]+$/;

/** Does a value match its declared type (`B64_TYPES`)? */
function payloadTypeOk(type, v) {
  if (type === 'string') return typeof v === 'string';
  if (type === 'string[]') return Array.isArray(v) && v.every((x) => typeof x === 'string');
  if (type === 'int') return Number.isInteger(v) || (typeof v === 'string' && /^\d+$/.test(v));
  if (type === 'boolean') return typeof v === 'boolean';
  return false;
}

/**
 * Read a payload FILE. The path is resolved against the project root, never the working directory, and read
 * through the inbox's descriptor reader `readRegularFile` (`src/lib/inbox.js`): it lstats the path and refuses
 * anything but a regular file before opening (a link, a folder, a pipe), opens it ONCE without following a final
 * link where the platform has O_NOFOLLOW (macOS, Linux), requires the open descriptor to be a regular file with
 * the device and inode the lstat saw (which also refuses a link swapped in on Windows), refuses one larger than
 * `MAX_PAYLOAD_BYTES`, and reads at most that many bytes through the descriptor, as UTF-8. The text must be JSON
 * holding one plain object. Returns the object, or null on any fault (the caller refuses out loud). The caller
 * has already checked the path's characters and its `..` segments. Text an agent wrote reaches the menu this way
 * (start.md Rule 15), never on the command line.
 * @param {string} root  the project root
 * @param {string} filePath  the value after `--payload-file`
 * @returns {object|null}
 */
function readPayloadFile(root, filePath) {
  try {
    const obj = JSON.parse(readRegularFile(path.resolve(root, filePath), MAX_PAYLOAD_BYTES));
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : null;
  } catch {
    return null;
  }
}

/**
 * A `menu task <sub>` call's payload, read once. `{ ok: true, payload: null }` when neither `--payload-file` nor
 * `--b64` was given; `{ ok: true, payload }` when the value is ONE JSON object whose every key is in
 * `B64_KEYS[sub]` with the type in `B64_TYPES` AND whose binding key matches the call; otherwise
 * `{ ok: false, refusal }`, logged with `taskRegistry.warnLog(root, 'payload_unreadable', …)`, and the route
 * records nothing. The session writes the object to a file and passes `--payload-file '<path>'` (Rule 15); `--b64`
 * stays a legacy transport; giving both is refused. An unreadable payload is refused out loud, never dropped —
 * dropping it lost the summary, or the files a task touches, without a word. Every refusal reason is fixed words:
 * neither the refusal nor the log ever echoes a payload's key names or its kind, plan or task values.
 * BINDING (ruling 6): the payload is tied to the call so a stale or wrong payload file is caught, never applied
 * silently. A `complete`/`fail` payload's `task`, when present, must equal the id argument (`p.positional[0]`);
 * an `add` payload's `kind`/`plan`, when present, must equal the kind/plan given positionally. A mismatch is
 * refused out loud. `p` carries `positional`, so the one reader both transports pass through does the binding.
 * @param {'add'|'complete'|'fail'} sub
 * @param {{b64?: string, payloadFile?: string, positional: string[]}} p  parseTaskArgs output
 * @param {string} root
 * @returns {{ok: true, payload: (object|null)} | {ok: false, refusal: {ok: false, error: string, text: string}}}
 */
function taskPayload(sub, p, root) {
  const hasFile = p.payloadFile !== undefined;
  const hasB64 = p.b64 !== undefined;
  if (!hasFile && !hasB64) return { ok: true, payload: null };
  const keys = B64_KEYS[sub];
  const reject = (why) => {
    taskRegistry.warnLog(root, 'payload_unreadable', { sub, why });
    return { ok: false, refusal: { ok: false, error: 'payload-unreadable',
      text: `Nothing was recorded: the payload must be one JSON object holding only ${[...keys].join(', ')}, each the right type and bound to this call (${why}).` } };
  };
  if (hasFile && hasB64) return reject('give --payload-file or --b64, not both');
  // The path guards: plain characters only, and no `..` segment (backslashes are already refused, so `/` is
  // the only separator).
  if (hasFile && !PLAIN_PATH_RE.test(p.payloadFile)) {
    return reject('the path holds a character other than a letter, a digit or . _ / : + = @ % -');
  }
  if (hasFile && p.payloadFile.split('/').includes('..')) return reject('the path holds a .. segment');
  const d = hasFile ? readPayloadFile(root, p.payloadFile) : decodeB64(p.b64);
  if (!d || Array.isArray(d)) return reject(hasFile ? 'the file is not a readable JSON object' : 'the --b64 value is not one JSON object');
  for (const k of Object.keys(d)) {
    if (!keys.has(k)) return reject('a key is not one this route reads');
    if (!payloadTypeOk(B64_TYPES[k], d[k])) return reject('a key has the wrong type');
  }
  // Bind the payload to the call (ruling 6): a payload that names another task or plan is a mistake, not a
  // silent override. For add the command line always carries the kind positionally and often the plan.
  if (sub === 'add') {
    if (d.kind !== undefined && p.positional[0] !== undefined && d.kind !== p.positional[0]) {
      return reject('the payload kind is not the kind argument');
    }
    if (d.plan !== undefined && p.positional[1] !== undefined && d.plan !== p.positional[1]) {
      return reject('the payload plan is not the plan argument');
    }
  } else if (d.task !== undefined && d.task !== p.positional[0]) {
    return reject('the payload task is not the id argument');
  }
  return { ok: true, payload: d };
}
```

2b. **The `./inbox` destructure** (lines 27-30): add `readRegularFile` to the names it takes from `./inbox`.

3. **`buildAddSpec(p, payload)`**: it takes the payload already read instead of decoding; its block
   `if (p.b64) { const d = decodeB64(p.b64); if (d) { … } }` becomes `if (payload) { … }` with `d` renamed `payload`, the
   six named-field copies unchanged (the type check is already done by `taskPayload`). Its doc comment: "A payload, already
   read and type-checked by `taskPayload`, overrides matching named fields."

4. **`taskAdd`**: its first two lines become

```js
  const p = parseTaskArgs(rest);
  const read = taskPayload('add', p, root);
  if (!read.ok) return read.refusal; // an unreadable payload records nothing
  const spec = buildAddSpec(p, read.payload);
```

5. **`taskTransition`**: after the agent-id check, insert

```js
  // A failure's summary may arrive in a payload file (start.md Rule 15); it is read, and refused when
  // unreadable, before anything is written.
  let failPayload = null;
  if (kind === 'fail') {
    const read = taskPayload('fail', p, root);
    if (!read.ok) return read.refusal;
    failPayload = read.payload;
  }
```

   and in the `fail` branch the result becomes

```js
      const given = p.summary != null ? p.summary
        : (failPayload && typeof failPayload.summary === 'string' ? failPayload.summary : undefined);
      taskRegistry.updateTask(reg, id, { status: 'failed', result: { ok: false, summary: given || 'failed' } });
```

6. **`taskComplete`**: `const extra = p.b64 ? decodeB64(p.b64) : null;` becomes

```js
  const read = taskPayload('complete', p, root);
  if (!read.ok) return read.refusal; // before the plan completion and before any write
  const extra = read.payload;
```

   The task its agent already completed keeps its earlier branch, which returns before the payload is read: the session's
   `--continue` call on such a task still ignores a payload, as start.md says.

7. **Exports**: none added. `B64_KEYS`, `B64_TYPES`, `PLAIN_PATH_RE`, `taskPayload`, `readPayloadFile` and
   `payloadTypeOk` stay module-local. Nothing outside the menu reads them once the hook keeps its own table (Decision
   33), and an export with no reader would trip the dead-export fence. The tests drive them through `route`.

##### Error Handling
A refusal is `{ ok: false, error: 'payload-unreadable', text }`, logged with `taskRegistry.warnLog(root,
'payload_unreadable', { sub, why })` where `why` is one of the fixed reasons in `taskPayload`, and returned before any
registry write or plan completion; `taskCommand` passes it through, and the process still exits 0 with JSON.
`readPayloadFile` never throws: every fault `readRegularFile` throws (`ENOTREG`, `ESTALE`, `EFBIG`, `ENOENT`, `ELOOP`
and the rest) and every JSON fault is caught and becomes a refusal.

#### File: `src/lib/inbox.js`
**Action:** MODIFY
**Purpose:** export the one descriptor reader, `readRegularFile` (lines 247-288 on 2026-10-18), so the menu's payload
reader uses it instead of a second copy (Decision 46).
**Change Type:** new export of an existing function

##### Changes
1. **`module.exports`** (lines 1102-1118 on 2026-10-18): add `readRegularFile`, after `readStandardInput`.
2. **Its doc comment** (lines 247-263) gains one closing sentence: "Exported for the menu's payload reader
   (`readPayloadFile` in `src/lib/menu-screens.js`, four-defects slice 19)."

Nothing else in the file changes; the function's body and its callers in this file are untouched.

##### Called By
- `src/lib/menu-screens.js` `readPayloadFile(root, filePath)`, reached from `taskPayload` for `menu task add`,
  `complete` and `fail` (the live root is `/ctoc:start` → `src/commands/start.js` → `route` → `taskCommand`).
- Its four callers inside `inbox.js` (lines 316, 407, 485, 732), unchanged.

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** one rule for agent text, and every recipe that carries it uses `--payload-file`.
**Change Type:** modify-existing

##### Changes (each old text as read on 2026-10-18, slice 18's change to COMPLETION step 1 already in the file)

On 2026-10-18 (re-read again after the review of that day) the texts stand at line 29 (the `stream comment` row), lines
122 and 123 (WORK dispatch steps 1 and 2), lines 132 and 134 (COMPLETION steps 1 and 3), lines 326-328 (the `search`
recipe, its `search('<concept>', …)` call at line 327), line 459 (Rule 14) and lines 242-243 ("Human gates stay
foreground", item 8, read in the last review round). The item headings below carry those numbers. Each edit is found
by its old text, never by its number.

1. **Line 29**, the `stream comment` row, becomes:

```markdown
| `stream comment {stage}/{file}.md '{text}'` | Record the owner's free-text comment to `.ctoc/streaming/comments.jsonl` (never edits the plan or crosses a gate), then advance. His words go in single quotes, each single quote inside them written as `'\''`, nothing else changed |
```

2. **Line 122**, WORK dispatch step 1, becomes:

```markdown
1. **Record first.** `node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task add K [P] [--payload-file '<path>'] [--gitop] [--blocked ids]` → `{taskId, decision, reason}`. This consults the NB1 scheduler (`canRun`) as it records — the `decision` is `run` or `queue`. `K` is the task kind and `P` the plan reference the menu's own action named; both go in as written (the menu put them there, not an agent). **Populate the touched files** for any file-editing kind (implement, quality, security, review) from the target plan's `files:` frontmatter: write `{"touches": ["<file>", …]}` with the Write tool to a fresh payload file and pass its path in single quotes as `--payload-file '<path>'` (Rule 15) — never as a plain `--touches` list: a plan's `files:` is text read from a plan file (Rule 15). Set `--gitop` for any kind that commits or pushes — **so the scheduler can enforce file-conflict and git-exclusive scheduling.** A task recorded with no touched files makes NB1's file-conflict rule a no-op, so two parallel file-editing WORK tasks (e.g. quality + security on the same plan) could clobber each other; always derive them from `files:`.
```

3. **Line 123**, WORK dispatch step 2: the text from "An `ok` claim with no `planPath`:" to "resumes it." becomes:

```markdown
An `ok` claim with no `planPath`: launch no agent, say so in one line, and run `menu task fail <taskId> --summary 'claim returned no plan path'`. If the launch is refused after an `ok` claim, run `menu task fail <taskId> --summary 'build agent launch refused'` and say so in one line; the plan stays in plans/in-progress/, and `menu task add implement --payload-file '<path>'`, with the payload file holding `{"plan": "<slug>", "touches": [<the plan's files:>]}` (<slug> is the file name in the returned `planPath` without `.md`, never the plan's title; a name from a returned planPath goes in the payload file, Rule 15), then, on `run`, the build order above (claim, launch on `ok`, stamp) resumes it.
```

4. **Line 132**, COMPLETION step 1, as slice 18 left it — eight replacements and one addition (the sixth and seventh
   added 2026-10-18, Decision 38, so no sentence still speaks of `--next` or of quotes the recipe no longer has; the
   eighth added by the last review round, Decision 42, because the build agent's own completion now carries a flag):
   - "`menu task complete <id> --continue --summary "…" [--gate N] [--next '<route>']`" (as read on 2026-10-18, line 132)
     becomes "`menu task complete <id> --continue --payload-file '<path>'`";
   - "(`--next` takes exactly one read-only route:" becomes "(the next action, `nextAction` in the payload file, takes
     exactly one read-only route:";
   - "Include `--next` only when the agent's route matches one of these shapes character for character, and always inside
     single quotes (none of the shapes holds a quote); otherwise leave --next out; never repair a route." becomes "Put
     `nextAction` in the payload only when the agent's route matches one of these shapes character for character;
     otherwise leave it out; never repair a route.";
   - "on a task its agent already completed, `--next` is ignored)" becomes "on a task its agent already completed, the
     payload is ignored)";
   - "or `menu task fail <id> --summary "…"` on failure" becomes "or `menu task fail <id> --payload-file '<path>'` on failure";
   - "any other character — a quote above all — means leave `--next` out." becomes "any other character means leave
     `nextAction` out." (the quote was named because it ended the shell's single quotes; with the route in a file, no
     quote reaches a shell, and a quote is still outside the character set);
   - "a flag or a shell character inside the quotes — refuses the whole completion" becomes "a flag or a shell
     character in it — refuses the whole completion" (the menu still refuses such a `nextAction`: it matches no shape,
     slice 18's `isNavRoute`);
   - "A build agent completes its own task with `menu task complete <id>` and no flag (the only form a background agent
     may run)" becomes "A build agent completes its own task with `menu task complete <id> --payload-file '<path>'` and
     no other flag (the only form a background agent may run)" (Decision 42: its definition now passes its summary in a
     payload file);
   - after "Never put `--continue` in an agent's brief." add:

```markdown
 `<path>` is `.ctoc/state/payloads/<name>.json`, relative to the project root (the menu resolves it there), with a `<name>` of letters, digits, `_` and `-` that you make new for each call; it always goes in single quotes. Into that file you write one JSON object with the Write tool (Rule 15): for a completion `{"task": "<id>", "summary": "…"}` — the id this call names, bound so a stale file is caught, and the agent's one-line summary (at most 200 characters) — plus `"gate": N` when the agent reported a stop at a decision, plus `"nextAction": "<route>"` when it named a next screen; for a failure `{"task": "<id>", "summary": "…"}`. The menu reads the file (a regular file, under the size cap, JSON holding only those keys and types, its `task` equal to the id on the command line) and refuses it out loud if it is anything else; a refusal recorded nothing, so write a new file and call again. A build agent completes its own task: your `--continue` call on that task carries no payload, and the menu ignores one.
```

   Slice 18's test S18-9 finds this line by its start, "1. `menu task complete <id> --continue", and needs every accepted
   shape in backticks and "refuses the whole completion, the continuation included" in it; all stay. Its assertions on
   `[--next '<route>']`, "always inside single quotes", "otherwise leave --next out; never repair a route", "a shell
   character inside the quotes" and the character-set sentence (`tests/menu-task-wiring.test.js` lines 1131 and
   1134-1139, read on 2026-10-18) pin text this item replaces; the test file's change 2b rewrites them to the same
   intent (Decision 38).

5. **Line 134**, COMPLETION step 3: the same replacement as item 3, with `<id>` in place of `<taskId>`.

6. **Lines 326-328**, the plan-index `search` recipe, become:

```markdown
   `search` is reached the same way when a lens needs concept-presence across the corpus. The concept
   is text a lens asked for, so it never goes into the command as written (Rule 15): write the concept with
   the Write tool to a fresh file `.ctoc/state/payloads/<name>.txt` in the payload folder, then run
   `node -e "const pi=require('${CLAUDE_PLUGIN_ROOT}/src/lib/plan-index');const sf=require('${CLAUDE_PLUGIN_ROOT}/src/lib/safe-fs');const f=pi.search;let c='';try{c=sf.readFileSync(process.argv[1],'utf8').trim();}catch{}if(typeof f!=='function'||!c){console.log('[]');}else{f(c,{projectPath:process.cwd(),limit:10}).then(r=>console.log(JSON.stringify(r||[])),()=>console.log('[]'));}"`
   from the project root with one argument, that path in single quotes — same `undefined` guard, same
   fail-open degrade. The dispatcher runs it and passes the hits down; the critic never holds the shell.
```

   `search` is the plan-index barrel's lazy getter (`src/lib/plan-index/index.js` lines 68-72) for the asynchronous
   `search(query, opts)` (`src/lib/plan-index/search.js` line 285). The recipe keeps `.search` beside `plan-index`, which
   `tests/agent-layer-reachability.test.js` requires, and it is one of the `node -e` recipes
   `tests/protect-records.test.js` case 51 sends to the write protection, which allows it before and after. Its safety
   is Rule 15: the concept travels in a file, never on the command line.
   (Corrected 2026-10-18, the last review round.) The file is read through `src/lib/safe-fs`, not `require('fs')`:
   `tests/shipped-recipes-execute.test.js` extracts every `node -e` program of start.md (`src/lib/recipe-harness.js`
   lines 83-126 and 166-181) and its case 2 resolves each `require` target under the repository root, where `fs` does
   not resolve, while its case 3 requires every named function to exist (`safe-fs` exports `readFileSync`). The
   recipe calls nothing in the harness's state-changing list (lines 41-49), so it needs no entry in
   `.ctoc/recipe-coverage.json`. `tests/shell-write-targets.test.js` case 37 and
   `tests/the-bash-channel-cannot-reach-the-ledger-through-a-link.test.js` case 10 also send every `node -e` recipe of
   start.md to the edit-protection hook; Step 10 runs both.

7. **Rule 15**, after Rule 14 (line 435 on 2026-10-12, 457 on 2026-10-13), separated by one blank line as the rules
   above it are:

```markdown
15. **Text an agent wrote reaches the menu only through a payload file, never on the command line.** An agent's summary, the next screen it names, its gate, a label, and anything read from a plan file (a name taken from a returned `planPath`, the plan's `files:` list) never go into a shell command as written, in any encoding. Write them as one JSON object with the Write tool to a fresh file in the payload folder, `.ctoc/state/payloads/` under the project root — the file `<name>.json`, its `<name>` letters, digits, `_` and `-`, new for each call — and pass only that path, relative to the project root and in single quotes: `--payload-file '.ctoc/state/payloads/<name>.json'`, written `--payload-file '<path>'` in the recipes above. The path holds no space, no backslash and no `..`; the menu refuses one that does. A `complete`/`fail` payload carries `"task": "<id>"` equal to the id on the command line, and an `add` payload's `kind`/`plan` matches any given positionally; the menu refuses a payload whose binding differs, so a stale or wrong file is caught, never applied. The menu reads the file — a regular file (no link, no folder, no pipe), under the size cap, JSON holding only the keys and types that route reads — and refuses it out loud if it is anything else, naming none of the payload's keys or values; a refusal recorded nothing, so write a new file and call again. A plan name the MENU's own action already carries (the `P` in `menu task add K P`, a `plan <stage>/<name>.md` action) goes in as written — the menu put it there, not an agent; a name you took from a returned `planPath` or read from a plan file goes in the payload file. Words you write yourself go in single quotes and hold no single quote. The owner's own words travel only as their recipe says: an inbox answer on standard input (Answering an inbox question), a comment in single quotes with each single quote inside written as `'\''`. Run a menu action word for word as the menu gave it, and run every menu call as one plain call: no `$`, backtick, backslash, `;`, `&`, `|`, `<`, `>`, `#`, `*`, `?`, `~` or bracket outside quotes, and no second command. Nothing outside you checks this rule: CTOC's write protection does not read the main session's menu calls for it.
```

8. **Lines 242-243**, "Human gates stay foreground" (added by the last review round, Decision 54): "A completion records
   the stop with the `--gate N` flag, and any `--next` route is navigation-only." becomes "A completion records the
   stop as `gate` in its payload file (the menu's `--gate N`), and any next route, `nextAction` in the payload file
   (the menu's `--next`), is navigation-only." The next sentence, "no `--next`, no promotion and no file move performs
   a transition", stays.

Nothing else in the file changes.

#### File: `agents/iron-loop/iron-loop-executor.md`
**Action:** MODIFY
**Purpose:** the build agent's own completion puts its summary in a payload file, never in double quotes on the
command line (Decision 42). Its summary routinely names code in backticks and may restate text from the plan it built;
inside double quotes the shell runs every backtick and `$(…)` in it.
**Change Type:** modify-existing

##### Changes (old text as read on 2026-10-18, lines 185-190)
The text from "When steps 8-16 are done, complete through the menu's completion route with the" to the closing fence
of the `bash` block after it becomes:

````markdown
When steps 8-16 are done, complete through the menu's completion route with the
`taskId` from your brief. First write one JSON object, `{"task": "<taskId>", "summary": "<one line>"}`, with the
Write tool to a fresh file `.ctoc/state/payloads/<name>.json` under the project root you run the menu from
(`<name>`: letters, digits, `_` and `-`, new for this call). Then pass only that path, in single quotes. Never put
the summary on the command line: inside double quotes the shell runs any `$(…)` or backtick in it.

```bash
node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task complete <taskId> --payload-file '.ctoc/state/payloads/<name>.json'
```
````

Nothing else in the file changes. The box at its lines 168-170 ("4. COMPLETE — `menu task complete <taskId>`") names
the route without its arguments and stays.

##### Wiring
The build agent reads this file when CTO Chief dispatches it (start.md's WORK dispatch launches it for an `implement`
task); the command it runs reaches `src/commands/start.js` → `route` → `taskComplete` → `taskPayload` →
`readPayloadFile`. X3 (`tests/menu-task-wiring.test.js`) pins the text.

#### File: `tests/test-writers-get-the-fast-test-rules.test.js`
**Action:** MODIFY
**Purpose:** its case "the builder verifies and ticks each acceptance criterion before the completion command" reads
the build agent's completion section up to the end marker `'menu task complete <taskId> --summary'` (line 168 on
2026-10-18). That text leaves the build agent's definition (Decision 42), so `between()` would fail on a missing
marker.
**Change Type:** modify-existing

##### Changes
Line 168: `'menu task complete <taskId> --summary',` becomes `'menu task complete <taskId> --payload-file',`.
Nothing else changes. The case's intent is unchanged: the acceptance-criteria rule (`TICK_RULE`) still has to stand
in the completion section before the completion command; only the command's spelling moved. It is not weakened: the
section the case reads still ends at the completion command.

#### File: `tests/menu-task-wiring.test.js`
**Action:** MODIFY
**Purpose:** the menu side of the channel and its reader's guards, the byte-for-byte round trip through the shell
Claude Code uses, start.md's text and every menu call it shows, and the build agent's completion line.
**Change Type:** modify-existing

##### Changes
1. **Case B1** (from line 585, re-read on 2026-10-18) encodes the old fail-soft payload and becomes:

```js
  it('B1: an oversized --b64 payload (> 65536 raw) refuses the add and records nothing (four-defects s19: never dropped silently)', () => {
    const big = 'x'.repeat(70000);
    const payload = Buffer.from(JSON.stringify({ label: big }), 'utf8').toString('base64');
    assert.ok(payload.length > 65536, 'payload exceeds the cap');
    const add = ms.route(['menu', 'task', 'add', 'review', 'p', '--b64', payload], root);
    assert.equal(add.ok, false, 'an unreadable --b64 refuses the add');
    assert.equal(add.error, 'payload-unreadable');
    assert.equal(taskRegistry.load(root).tasks.length, 0, 'no task was recorded');
  });
```

2. **Slice 18's S18-9**: in its `REFUSED_ROWS`, the key `'stream comment {stage}/{file}.md {text}'` becomes
   `"stream comment {stage}/{file}.md '{text}'"`, sample and reason unchanged (`stream comment review/LH1.md fine`,
   "records a comment").
2b. **Slice 18's S18-9, the recipe assertions** (lines 1129-1140 on 2026-10-18; added 2026-10-18, Decision 38). Its
   intent stays whole: the agent's route reaches the menu only when it is one of the listed shapes, character for
   character, never repaired, and never as shell text. Only the carrier changes, from a single-quoted `--next` to
   `nextAction` in the payload file. The comment and the eight lines from
   `assert.ok(recipe.includes("[--next '<route>']"), …` to `assert.match(recipe, /a shell character inside the quotes/);`
   and the character-set assertion become:

```js
    // The agent's route never reaches the session's shell (four-defects s19): it travels as `nextAction` in the
    // payload file, only when it matches a listed shape character for character, never repaired.
    assert.ok(recipe.includes("`menu task complete <id> --continue --payload-file '<path>'`"), 'the recipe passes a payload file');
    assert.ok(!recipe.includes('--next'), 'no --next on the command line: the route is in the payload file');
    assert.ok(!recipe.includes('<navroute>'), 'the unquoted placeholder is gone');
    assert.match(recipe, /only when the agent's route matches one of these shapes character for character/);
    assert.match(recipe, /otherwise leave it out; never repair a route/);
    assert.match(recipe, /a flag or a shell character in it/);
    assert.ok(recipe.includes('A route matches only when every character is an ASCII letter, digit, space, `/`, `.`, `_` or `-`; any other character means leave `nextAction` out.'),
      'the recipe states the route character set, word for word');
```

   The five argument-limit assertions after it (`plan {stage}` is never `vision` … at most 256 characters), the
   accepted-shape loop, "refuses the whole completion, the continuation included" and the status-line assertion stay as
   they are. The rewrite is a change of carrier, not a weakening: the absence check on `--next` is stricter than the
   old presence check on its quoting, and every character and shape rule is still pinned word for word.
3. **A new describe at the end of the file:**

```js
describe('four-defects s19 — text an agent wrote reaches the menu only through a payload file', () => {
  const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v), 'utf8').toString('base64');
  const REGISTRY = () => path.join(root, '.ctoc', 'state', 'tasks.json');
  const bytes = () => (fs.existsSync(REGISTRY()) ? fs.readFileSync(REGISTRY(), 'utf8') : null);
  // The payload folder start.md's Rule 15 names: the file is written under the project root and passed as its path
  // relative to that root, with forward slashes, on every platform (Decision 44).
  const PAYLOADS = () => path.join(root, '.ctoc', 'state', 'payloads');
  const payloadFile = (obj, name = `pl-${Math.random().toString(36).slice(2)}`) => {
    fs.mkdirSync(PAYLOADS(), { recursive: true });
    fs.writeFileSync(path.join(PAYLOADS(), `${name}.json`), JSON.stringify(obj));
    return `.ctoc/state/payloads/${name}.json`;
  };
  // The shell Claude Code's Bash tool runs a command in, found as Claude Code 2.1.300 finds it (read in its installed
  // binary on 2026-10-18, Decision 47): on Windows CLAUDE_CODE_GIT_BASH_PATH when it names bash or sh and exists,
  // then Git for Windows' bash.exe under Program Files, then the bash.exe two folders above the git.exe on PATH;
  // elsewhere CLAUDE_CODE_SHELL, then SHELL, when it names bash or zsh and exists, then zsh or bash (bash first
  // when SHELL names bash) in /bin, /usr/bin, /usr/local/bin and /opt/homebrew/bin. Null when there is none.
  function claudeCodeShell() {
    const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
    if (process.platform === 'win32') {
      const set = process.env.CLAUDE_CODE_GIT_BASH_PATH;
      if (set && ['bash.exe', 'sh.exe', 'bash', 'sh'].includes(path.basename(set).toLowerCase()) && isFile(set)) return set;
      const gitDirs = (process.env.PATH || '').split(path.delimiter).filter((d) => d && isFile(path.join(d, 'git.exe')));
      const candidates = ['C:\\Program Files\\Git\\bin\\bash.exe', 'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        ...gitDirs.map((d) => path.join(d, 'git.exe', '..', '..', 'bin', 'bash.exe'))];
      return candidates.find(isFile) || null;
    }
    for (const named of [process.env.CLAUDE_CODE_SHELL, process.env.SHELL]) {
      if (named && /bash|zsh/.test(named) && isFile(named)) return named;
    }
    const order = /bash/.test(process.env.SHELL || '') ? ['bash', 'zsh'] : ['zsh', 'bash'];
    for (const name of order) {
      for (const dir of ['/bin', '/usr/bin', '/usr/local/bin', '/opt/homebrew/bin']) {
        if (isFile(path.join(dir, name))) return path.join(dir, name);
      }
    }
    return null;
  }
  function seedRunning() {
    const reg = taskRegistry.load(root);
    const t = taskRegistry.addTask(reg, { kind: 'review', plan: 'LH1' });
    taskRegistry.updateTask(reg, t.id, { status: 'running' });
    taskRegistry.save(root, reg);
    return t.id;
  }

  it("S19-1: menu task fail reads its summary from --payload-file, --summary still wins; a matching task binds; the main session's menu task add reads plan and files from --payload-file", () => {
    const a = seedRunning();
    assert.equal(ms.route(['menu', 'task', 'fail', a, '--payload-file', payloadFile({ summary: 'tests red: 3 of 40' })], root).ok, true);
    assert.equal(taskRegistry.load(root).tasks.find((t) => t.id === a).result.summary, 'tests red: 3 of 40');
    // a payload bound to its call (ruling 6): a `task` equal to the id is accepted and the summary is stored
    const c = seedRunning();
    assert.equal(ms.route(['menu', 'task', 'fail', c, '--payload-file', payloadFile({ task: c, summary: 'red' })], root).ok, true);
    assert.equal(taskRegistry.load(root).tasks.find((t) => t.id === c).result.summary, 'red');
    const b = seedRunning();
    ms.route(['menu', 'task', 'fail', b, '--summary', 'flag', '--payload-file', payloadFile({ summary: 'payload' })], root);
    assert.equal(taskRegistry.load(root).tasks.find((t) => t.id === b).result.summary, 'flag');
    // start.md's WORK dispatch and the resume after a refused launch: the menu's `add` row reads the payload file.
    const add = ms.route(['menu', 'task', 'add', 'implement', '--payload-file', payloadFile({ plan: 'LH2', touches: ['src/a.js', 'src/b.js'] })], root);
    assert.equal(add.ok, true, JSON.stringify(add));
    const added = taskRegistry.load(root).tasks.find((t) => t.id === add.taskId);
    assert.equal(added.plan, 'LH2');
    assert.deepEqual(added.touches, ['src/a.js', 'src/b.js']);
  });

  it('S19-2: an unreadable, wrong-typed or mis-bound payload refuses add, complete and fail, writes nothing, and is logged', () => {
    const BAD = {
      add: [
        payloadFile({ kind: 'review', approve: true }), // unknown key
        payloadFile({ touches: 'src/a.js' }),            // touches must be an array of strings (ruling 4)
        payloadFile([1, 2]),                             // not an object
        '.ctoc/state/payloads/missing.json',             // absent file
        payloadFile({ kind: 'implement' }),              // kind differs from the 'review' argument (ruling 6)
        payloadFile({ plan: 'other' }),                  // plan differs from the 'LH1' argument (ruling 6)
      ],
      complete: [
        payloadFile({ summary: 1 }),                     // summary must be a string (ruling 4)
        payloadFile({ summary: 'x', continue: true }),   // unknown key
        payloadFile({ gate: 'soon' }),                   // gate must be an integer or a string of digits
        payloadFile({ summary: 'x', task: 't999' }),     // task differs from the id argument (ruling 6)
      ],
      fail: [
        payloadFile({ summary: 1 }),                     // summary must be a string
        payloadFile({ summary: 'x', nextAction: 'tasks' }), // unknown key for fail
        payloadFile({ summary: 'x', task: 't999' }),     // task differs from the id argument (ruling 6)
      ],
    };
    for (const v of BAD.add) {
      const before = bytes();
      const res = ms.route(['menu', 'task', 'add', 'review', 'LH1', '--payload-file', v], root);
      assert.equal(res.ok, false, `add refuses ${v}`);
      assert.equal(res.error, 'payload-unreadable');
      assert.match(res.text, /^Nothing was recorded: the payload/);
      assert.equal(bytes(), before, 'the registry is unchanged');
    }
    for (const sub of ['complete', 'fail']) {
      for (const v of BAD[sub]) {
        const id = seedRunning();
        const before = bytes();
        const res = ms.route(['menu', 'task', sub, id, '--payload-file', v], root);
        assert.equal(res.ok, false, `${sub} refuses ${v}`);
        assert.equal(res.error, 'payload-unreadable');
        assert.equal(bytes(), before, `${sub}: the registry is unchanged`);
        assert.equal(taskRegistry.load(root).tasks.find((t) => t.id === id).status, 'running');
      }
    }
    // a legacy --b64 is type-checked too; giving both --payload-file and --b64 is refused
    assert.equal(ms.route(['menu', 'task', 'complete', seedRunning(), '--b64', b64({ gate: 'soon' })], root).error, 'payload-unreadable');
    assert.equal(ms.route(['menu', 'task', 'complete', seedRunning(), '--payload-file', payloadFile({ summary: 'x' }), '--b64', b64({ summary: 'y' })], root).error, 'payload-unreadable');
    // nothing the payload holds is echoed (Decision 49): neither its key names nor its kind, plan or task values,
    // in the refusal or in the log
    const SENTINELS = ['zzKeySentinel', 'zzKindSentinel', 'zzPlanSentinel', 'zzTaskSentinel'];
    const echoes = [
      ms.route(['menu', 'task', 'add', 'review', 'LH1', '--payload-file', payloadFile({ zzKeySentinel: 1 })], root),
      ms.route(['menu', 'task', 'add', 'review', 'LH1', '--payload-file', payloadFile({ kind: 'zzKindSentinel' })], root),
      ms.route(['menu', 'task', 'add', 'review', 'LH1', '--payload-file', payloadFile({ plan: 'zzPlanSentinel' })], root),
      ms.route(['menu', 'task', 'fail', seedRunning(), '--payload-file', payloadFile({ task: 'zzTaskSentinel', summary: 'x' })], root),
    ];
    // every refusal is logged with taskRegistry.warnLog
    const logText = fs.readFileSync(path.join(root, '.ctoc', 'logs', 'task-registry.json'), 'utf8');
    const log = JSON.parse(logText);
    assert.ok(log.some((e) => e.event === 'payload_unreadable'), 'a refused payload is logged');
    for (const r of echoes) assert.equal(r.error, 'payload-unreadable', 'each sentinel payload is refused');
    for (const s of SENTINELS) {
      for (const r of echoes) assert.ok(!r.text.includes(s), `the refusal echoes ${s}`);
      assert.ok(!logText.includes(s), `the log holds ${s}`);
    }
  });

  it('S19-3: the completion start.md shows carries an agent summary byte for byte through the shell Claude Code uses, and runs none of it', () => {
    const md = fs.readFileSync(path.join(__dirname, '..', 'src', 'commands', 'start.md'), 'utf8');
    assert.ok(md.includes("`menu task complete <id> --continue --payload-file '<path>'`"), 'start.md shows this form');
    const shell = claudeCodeShell();
    assert.ok(shell, `no shell Claude Code would run a command in was found on ${process.platform}; the case cannot run, so it fails`);
    const id = seedRunning();
    const summary = "built $(touch pwned) `touch pwned2` it's \"q\" \\ done";
    // the payload folder Rule 15 names, the path relative to the project root and in single quotes; `task` binds
    // the payload to this call (ruling 6)
    const file = payloadFile({ task: id, summary, nextAction: 'tasks' });
    const command = `node "\${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task complete ${id} --continue --payload-file '${file}'`;
    const sh = require('node:child_process').spawnSync(shell, ['-c', command], {
      cwd: root, encoding: 'utf8', env: { ...process.env, CLAUDE_PLUGIN_ROOT: path.join(__dirname, '..') },
    });
    assert.ok(!sh.error, `${shell} could not be started on ${process.platform}: ${sh.error && sh.error.message}`);
    assert.equal(sh.status, 0, sh.stderr);
    assert.equal(JSON.parse(sh.stdout).ok, true, sh.stdout);
    const t = taskRegistry.load(root).tasks.find((x) => x.id === id);
    assert.equal(t.result.summary, summary, 'the summary arrives byte for byte');
    assert.equal(t.result.nextAction, 'tasks');
    assert.ok(!fs.existsSync(path.join(root, 'pwned')) && !fs.existsSync(path.join(root, 'pwned2')), 'nothing in the summary ran');
  });

  it("S19-4: start.md — Rule 15, and no recipe puts agent text, a planPath name or a plan's files: in a shell command except in a payload file", () => {
    const flat = fs.readFileSync(path.join(__dirname, '..', 'src', 'commands', 'start.md'), 'utf8').replace(/\s+/g, ' ');
    for (const text of [
      '15. **Text an agent wrote reaches the menu only through a payload file, never on the command line.**',
      'pass only that path, relative to the project root and in single quotes',
      "`--payload-file '.ctoc/state/payloads/<name>.json'`",
      'The path holds no space, no backslash and no `..`',
      "`menu task complete <id> --continue --payload-file '<path>'`",
      "`menu task fail <id> --payload-file '<path>'`",
      "`menu task complete <id> --payload-file '<path>'` and no other flag",
      '`<path>` is `.ctoc/state/payloads/<name>.json`, relative to the project root',
      '"task": "<id>"',
      'never as a plain `--touches` list',
      "--summary 'claim returned no plan path'",
      "--summary 'build agent launch refused'",
      "`menu task add implement --payload-file '<path>'`",
      '`.ctoc/state/payloads/<name>.txt`',
      "sf.readFileSync(process.argv[1],'utf8')",
      "`stream comment {stage}/{file}.md '{text}'`",
      'A completion records the stop as `gate` in its payload file (the menu\'s `--gate N`)',
    ]) assert.ok(flat.includes(text), `start.md lacks: ${text}`);
    for (const old of [
      '--payload-file <path>',
      'scratch folder',
      'and no flag (the only form',
      'with the `--gate N` flag',
      '--summary "…"',
      '[--next <navroute>]',
      "[--next '<route>']",
      'Include `--next` only when',
      '[--touches files]',
      '--touches <files>',
      "--summary '<slug>",
      "search('<concept>'",
      '--b64 <code>',
      "Buffer.from(process.argv[1]||'','base64')",
      '`stream comment {stage}/{file}.md {text}`',
    ]) assert.ok(!flat.includes(old), `start.md still says: ${old}`);
  });

  it('S19-5: each guard of the payload reader refuses on its own: a space, a backslash, a .. segment, a link, a folder, a file over the cap', () => {
    // Every file below holds a VALID fail payload, so only the guard named can refuse it; the last call reads the
    // same content at a plain path and is accepted, which shows the refusals were the guards.
    const refuses = (file, why) => {
      const id = seedRunning();
      const before = bytes();
      const res = ms.route(['menu', 'task', 'fail', id, '--payload-file', file], root);
      assert.equal(res.ok, false, `${why}: refused`);
      assert.equal(res.error, 'payload-unreadable', why);
      assert.equal(bytes(), before, `${why}: the registry is unchanged`);
    };
    const target = payloadFile({ summary: 'guarded' }, 'target');
    refuses(payloadFile({ summary: 'guarded' }, 'a b'), 'a space in the path');                  // the plain-character guard
    refuses('.ctoc\\state\\payloads\\target.json', 'a backslash in the path');                       // the plain-character guard
    refuses('.ctoc/state/payloads/../payloads/target.json', 'a .. segment');                        // the .. guard
    const link = path.join(PAYLOADS(), 'link.json');
    try {
      fs.symlinkSync(path.join(PAYLOADS(), 'target.json'), link);
    } catch (e) {
      assert.fail(`symbolic-link creation is unavailable on ${process.platform} (${e.code || e.message}); the link case cannot run, so it fails`);
    }
    refuses('.ctoc/state/payloads/link.json', 'a symbolic link');                                   // the regular-file guard
    fs.mkdirSync(path.join(PAYLOADS(), 'folder.json'));
    refuses('.ctoc/state/payloads/folder.json', 'a folder');                                        // the regular-file guard
    refuses(payloadFile({ summary: 'x'.repeat(70000) }, 'big'), 'a file over the size cap');        // the size cap
    const ok = seedRunning();
    assert.equal(ms.route(['menu', 'task', 'fail', ok, '--payload-file', target], root).ok, true, 'the same content at a plain path is read');
    assert.equal(taskRegistry.load(root).tasks.find((t) => t.id === ok).result.summary, 'guarded');
  });

  it('S19-6: every menu call start.md shows carries only a payload file, fixed words in single quotes, or what the menu, the harness or the owner gave', () => {
    const md = fs.readFileSync(path.join(__dirname, '..', 'src', 'commands', 'start.md'), 'utf8');
    const MENU = 'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"';
    // The calls: each fenced line that begins with MENU; each inline code span that begins with MENU or with `menu `,
    // its backticks paired within its block as Markdown pairs them (a block ends at a blank line or a fence, and a
    // table row or a list item starts a new one), so a span that wraps onto the next line is read whole; and every
    // code span in the first cell of a Navigation Commands row (the routes the session runs after MENU).
    const calls = [];
    const blocks = [];
    let fenced = false;
    let block = null;
    for (const line of md.split(/\r?\n/)) {
      if (line.startsWith('```')) { fenced = !fenced; block = null; continue; }
      if (fenced) { if (line.startsWith(MENU)) calls.push(line); continue; }
      if (!line.trim()) { block = null; continue; }
      if (block === null || /^\s*(\||\d+\.\s|[-*]\s)/.test(line)) { block = { text: line }; blocks.push(block); }
      else block.text += ` ${line.trim()}`;
    }
    for (const b of blocks) {
      for (const m of b.text.matchAll(/`([^`]+)`/g)) {
        const span = m[1].replace(/\s+/g, ' ').trim();
        if (span.startsWith(MENU) || span.startsWith('menu ')) calls.push(span);
      }
    }
    const nav = md.slice(md.indexOf('### Navigation Commands'), md.indexOf('### Claude Actions'));
    for (const row of nav.split(/\r?\n/).filter((l) => l.startsWith('| `'))) {
      for (const m of row.split('|')[1].matchAll(/`([^`]+)`/g)) calls.push(m[1]);
    }
    assert.ok(calls.length >= 40, `expected start.md's menu calls to be found, got ${calls.length}: a small count is vacuous`);
    // The menu's own words: its routes, sub-commands, task kinds and the flags that take no value.
    const WORDS = new Set(['menu', 'task', 'add', 'start', 'complete', 'fail', 'cancel', 'commands', 'stream', 'approve',
      'skip', 'comment', 'dashboard', 'browse', 'section', 'plan', 'more', 'discuss', 'stubs', 'validate', 'inbox',
      'questions', 'decisions', 'gates', 'question', 'answer', 'escalations', 'stale', 'verify', 'cleanup', 'tasks',
      'precompute', 'classify', 'implement', '--continue', '--gitop', '--stdin']);
    // What the MENU gave the session: a kind or plan its own action named, a ref or stage it put in an action, a
    // task id it returned. Never an agent's text.
    const MENU_GIVEN = new Set(['K', 'P', '<id>', '<taskId>', '<task.id>', '{ref}', "'{ref}'", '{stage}', '{name}',
      '{slug}', '{id}', '{stage}/{file}.md']);
    // A flag and the only values it may carry: the payload file; fixed words in single quotes; what the menu gave
    // (task ids, a question ref); what the harness gave (agent ids).
    const VALUES = {
      '--payload-file': (v) => v === "'<path>'",
      '--summary': (v) => /^'[a-z][a-z ]*'$/.test(v),
      '--touches': (v) => v === "'.ctoc/streaming/questions/{ref}'",
      '--blocked': (v) => v === 'ids',
      '--agent-id': (v) => v === '<the harness agent id>' || v === '<harness id>',
      '--live-agent-ids': (v) => v === '<id1>,<id2>,<id3>',
    };
    // The owner's own words, each only where its recipe puts them (Rule 15): his comment in single quotes, and his
    // inbox answer on standard input through the quoted here-document of "Answering an inbox question".
    const OWNER_COMMENT = "'{text}'";
    const OWNER_STDIN = "inbox answer <id> --stdin <<'CTOC_ANSWER_<id>_<fresh>'";
    const TOKEN = /(?:'[^']*'|<[^>]*>|\[[^\]]*\]|[^\s'<\[])+/g;
    const check = (words, call) => {
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (w.startsWith('[') && w.endsWith(']')) { check(w.slice(1, -1).match(TOKEN) || [], call); continue; }
        if (VALUES[w]) {
          assert.ok(i + 1 < words.length && VALUES[w](words[i + 1]),
            `${call}: ${w} carries ${words[i + 1]}, which is not a payload file, fixed words in single quotes, or what the menu or the harness gave`);
          i++;
          continue;
        }
        if (w === OWNER_COMMENT && call.startsWith('stream comment ')) continue;
        assert.ok(WORDS.has(w) || MENU_GIVEN.has(w),
          `${call}: ${w} is not a menu word, a payload file, fixed words in single quotes, or what the menu, the harness or the owner gave`);
      }
    };
    for (const raw of calls) {
      const call = (raw.startsWith(MENU) ? raw.slice(MENU.length) : raw).trim();
      assert.ok(!call.includes('"'), `${raw}: a double quote; the shell runs $(…) and backticks and expands $NAME inside one`);
      if (call === OWNER_STDIN) continue;
      assert.equal(call.replace(TOKEN, '').trim(), '', `${raw}: holds a character no word accounts for`);
      check(call.match(TOKEN) || [], call);
    }
  });
});
```

   If no shell Claude Code would use can be found, S19-3 fails with the platform named; if a symbolic link cannot be
   made, S19-5 fails with the platform and the error named. Neither ever skips. Revision 1's S19-5 (a real shell
   confirming the hook backstop's model) is gone with the backstop (Decision 32); the name S19-5 now belongs to the
   reader-guard case above.

4. **Case X3 in the describe "R3-D — the iron-loop-executor definition"** (lines 1251-1268 on 2026-10-18), after X2:

```js
  it('X3: its completion puts the summary in a payload file, never in double quotes on the command line (four-defects s19)', () => {
    assert.ok(!def.includes('--summary "'), 'no double-quoted --summary: the shell would run every $(…) and backtick in it');
    assert.ok(def.includes(`node "\${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task complete <taskId> --payload-file '.ctoc/state/payloads/<name>.json'`),
      'the completion command passes a payload file, in single quotes');
    assert.ok(def.includes('`{"task": "<taskId>", "summary": "<one line>"}`'), 'the payload binds the task and holds the summary');
  });
```

#### File: `tests/menu-screens-coverage.test.js`
**Action:** MODIFY
**Purpose:** three cases encode behaviour this slice removes — two the old fail-soft payload (lines 843-856, re-read on
2026-10-18), one a payload whose kind is not the kind argument, which the binding now refuses (lines 835-841, Decision
31), its refusal reason fixed words since the last review round (Decision 49) — and a new case keeps the payload
driving kind and plan where the binding allows it.
**Change Type:** modify-existing

##### Changes

The case `add_decodes_a_b64_payload_and_lets_it_drive_kind_and_plan` (lines 835-841) is replaced by the first two cases
below (Decision 31), and the two fail-soft cases (lines 843-856) by the last two.

```js
  test('add_refuses_a_b64_payload_whose_kind_is_not_the_kind_argument_and_records_nothing', () => {
    const root = mkProject();
    const b64 = Buffer.from(JSON.stringify({ kind: 'review', plan: 'zeta', label: 'L' })).toString('base64');
    // 'ignored-positional' is the KIND argument (positional[0]) and no plan argument is given; the payload's kind
    // 'review' is not that argument, so the binding refuses the whole add (four-defects s19, Decision 31).
    const r = menu.route(['menu', 'task', 'add', 'ignored-positional', '--b64', b64], root);
    assert.equal(r.ok, false);
    assert.equal(r.error, 'payload-unreadable');
    // the reason is fixed words: it never echoes the payload's kind (Decision 49)
    assert.match(r.text, /\(the payload kind is not the kind argument\)\.$/);
    assert.equal(menu.route(['menu', 'task', 'list'], root).tasks.length, 0, 'no task was recorded');
    const log = JSON.parse(fs.readFileSync(path.join(root, '.ctoc', 'logs', 'task-registry.json'), 'utf8'));
    assert.ok(log.some((e) => e.event === 'payload_unreadable' && e.sub === 'add'
      && e.why === 'the payload kind is not the kind argument'), 'the refusal is logged');
  });

  test('add_lets_a_b64_payload_drive_kind_and_plan_when_the_command_line_gives_none_or_the_same', () => {
    const root = mkProject();
    const b64 = Buffer.from(JSON.stringify({ kind: 'review', plan: 'zeta', label: 'L' })).toString('base64');
    // no kind or plan argument: nothing to bind against, so the payload supplies both
    const none = menu.route(['menu', 'task', 'add', '--b64', b64], root);
    assert.equal(none.ok, true, JSON.stringify(none));
    // the same kind and plan as arguments: the payload is bound to this call and applied (its label shows it)
    const same = menu.route(['menu', 'task', 'add', 'review', 'zeta', '--b64', b64], root);
    assert.equal(same.ok, true, JSON.stringify(same));
    assert.deepEqual(menu.route(['menu', 'task', 'list'], root).tasks.map((t) => [t.id, t.kind, t.plan, t.label]),
      [[none.taskId, 'review', 'zeta', 'L'], [same.taskId, 'review', 'zeta', 'L']]);
  });

  test('add_refuses_an_oversized_b64_payload_and_records_nothing', () => {
    const root = mkProject();
    const huge = 'A'.repeat(65537); // exceeds the 65536 decode bound → decodeB64 returns null
    const r = menu.route(['menu', 'task', 'add', 'review', '--b64', huge], root);
    assert.equal(r.ok, false);
    assert.equal(r.error, 'payload-unreadable');
    assert.equal(menu.route(['menu', 'task', 'list'], root).tasks.length, 0, 'no task was recorded');
  });

  test('add_refuses_a_non_json_b64_payload', () => {
    const root = mkProject();
    const r = menu.route(['menu', 'task', 'add', 'plan', '--b64', '@@@not-base64-json@@@'], root);
    assert.equal(r.ok, false);
    assert.equal(r.error, 'payload-unreadable');
    assert.equal(menu.route(['menu', 'task', 'list'], root).tasks.length, 0, 'no task was recorded');
  });
```

#### File: `tests/the-session-claims-a-build-before-launching-it.test.js`
**Action:** MODIFY
**Purpose:** slice 5's test pins the two claim-failure sentences and the resume command word for word (lines 39-45); they
change here.
**Change Type:** modify-existing

##### Changes

```js
const recipePins = (id) => [
  'Never pass --force on a claim unless the owner says so in the current conversation.',
  'An `ok` claim with no `planPath`: launch no agent, say so in one line, and run `menu task fail ' + id + " --summary 'claim returned no plan path'`",
  'If the launch is refused after an `ok` claim, run `menu task fail ' + id + " --summary 'build agent launch refused'` and say so in one line",
  'the plan stays in plans/in-progress/, and `menu task add implement --payload-file \'<path>\'`, with the payload file holding `{"plan": "<slug>", "touches": [<the plan\'s files:>]}` (<slug> is the file name in the returned `planPath` without `.md`, never the plan\'s title; a name from a returned planPath goes in the payload file, Rule 15), then, on `run`, the build order above (claim, launch on `ok`, stamp) resumes it',
  STAMP_REFUSED,
];
```

and its list of retired sentences (lines 50-59) gains `"--summary '<slug>"`, `'--touches <files>'`, the old base64
resume form `'--b64 <code>'` and the unquoted payload path `'--payload-file <path>'`.

### Test Plan

**Framework:** `node:test` with `node:assert/strict`, as every declared test file uses. No test file is added, so no
documented count moves and no ratchet file is declared.

| Case | Before the change | After | What it pins |
|------|-------------------|-------|--------------|
| S19-1 | FAILS: `fail` ignores the payload and stores `failed` | passes | `fail` reads the payload file; `--summary` wins; a matching `task` binds (ruling 6); the main session's `menu task add --payload-file` records plan and files |
| S19-2 | FAILS: `add` and `complete` accept an unreadable, wrong-typed or mis-bound payload; `fail` ignores it; nothing is logged | passes | an unreadable, wrong-typed or mis-bound payload refuses, writes nothing, and is logged; a payload whose `task`/`kind`/`plan` differs from the call is refused (binding, ruling 6); no refusal and no log entry echoes a payload's key name or its kind, plan or task value (Decision 49) |
| S19-3 | FAILS: start.md does not show the `--payload-file '<path>'` form | passes | the channel, byte for byte, through the shell Claude Code uses on the platform (Decision 47); the path is the payload folder's, relative and single-quoted, and the payload carries a matching `task` (rulings 5, 6) |
| S19-4 | FAILS: start.md has none of the new text | passes | Rule 15, the named payload folder and every recipe |
| S19-5 (new) | FAILS: `--payload-file` is no flag, so `fail` takes the path as a word and succeeds | passes | each reader guard refuses on its own: a space and a backslash (plain characters), a `..` segment, a link and a folder (a regular file only), a file over the size cap; the same content at a plain path is read (Decisions 43, 45, 46, 48) |
| S19-6 (new) | FAILS: start.md's completion recipe carries `--summary "…"` and the resume `<slug> --touches <files>` | passes | every menu call start.md shows carries only a payload file, fixed words in single quotes, or what the menu, the harness or the owner gave (Decision 40) |
| X3 (new) | FAILS: the build agent's definition carries `--summary "<one line>"` | passes | the build agent's completion passes a payload file (Decision 42) |
| fast-test rules, the acceptance-criteria case (end marker changed) | FAILS: the new marker `menu task complete <taskId> --payload-file` is not yet in the build agent's definition | passes | the acceptance-criteria rule still stands before the completion command (Decision 51) |
| S18-9 (row key) | FAILS: the new row is not in start.md | passes | the navigation table stays classified |
| S18-9 (recipe assertions, change 2b) | FAILS: start.md still carries `--next '<route>'` and the old sentences | passes | the agent's route reaches the menu only as `nextAction` in the payload file, only for a listed shape, never repaired; the character set word for word |
| B1 (changed), two coverage cases (changed: the oversized and the non-JSON payload) | FAIL: the payload is ignored and the add succeeds | pass | the payload is never dropped silently |
| coverage case `add_refuses_a_b64_payload_whose_kind_is_not_the_kind_argument_and_records_nothing` (replaces `add_decodes_a_b64_payload_and_lets_it_drive_kind_and_plan`) | FAILS: the payload's kind replaces the kind argument and the add succeeds | passes | a payload whose kind is not the kind argument is refused, nothing is recorded, the refusal is logged (binding, Decision 31) |
| coverage case `add_lets_a_b64_payload_drive_kind_and_plan_when_the_command_line_gives_none_or_the_same` (new) | passes (today every readable payload is applied) | passes | the payload still drives kind and plan when the command line gives none or the same; its red evidence is two Step 10 mutants (Decision 31) |
| slice 5's pins (changed) | FAIL: start.md has the old sentences | pass | the recipes' exact words |

**Never through git (the CTO Chief's ruling).** The shared checkout holds other slices' uncommitted work, so no step runs
`git checkout`, `git restore`, `git stash` or `git reset`, on anything. Every temporary change — each mutant below — is
undone from a byte-exact copy saved beforehand in the executor's scratchpad (a folder outside this repository) and
compared with that copy byte for byte; `git status` is only ever read and compared with the baseline recorded at Step 8,
which need not be empty. The copies are made and restored with this script, kept in the scratchpad (Node only, so it runs
the same on every platform):

```js
// keep.js — in the executor's scratchpad, never in this repository. Run from the repository root:
//   node <scratchpad>/keep.js save|restore|compare <scratchpad>/<list file> <scratchpad>/<copies folder>
// The list file holds one repository path per line, written with the Write tool, so the command stays short
// and the paths are read from one place.
// save copies each listed file (an absent one is reported and skipped); restore copies each saved file back;
// restore and compare then print every listed file whose bytes differ from its copy, and exit 1 if any does.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const [mode, listFile, folder] = process.argv.slice(2);
if (!['save', 'restore', 'compare'].includes(mode) || !listFile || !folder) {
  console.error('usage: keep.js save|restore|compare <list file> <copies folder>');
  process.exit(2);
}
const files = fs.readFileSync(listFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const copyOf = (file) => path.join(folder, encodeURIComponent(file));
const bytes = (p) => (fs.existsSync(p) ? fs.readFileSync(p) : null);
if (mode === 'save') fs.mkdirSync(folder, { recursive: true });
let differ = 0;
for (const file of files) {
  if (mode === 'save') {
    if (fs.existsSync(file)) fs.copyFileSync(file, copyOf(file)); else console.log(`absent: ${file}`);
    continue;
  }
  if (mode === 'restore') fs.copyFileSync(copyOf(file), file);
  const now = bytes(file);
  const kept = bytes(copyOf(file));
  if (!(now === null ? kept === null : kept !== null && now.equals(kept))) {
    differ += 1;
    console.log(`differs: ${file}`);
  }
}
console.log(`${mode}: ${files.length} files, ${differ} differ`);
process.exit(differ === 0 ? 0 : 1);
```

Mutant checks at Step 10, after the change. Before the first: write `src/lib/menu-screens.js`,
`src/commands/start.md` and `agents/iron-loop/iron-loop-executor.md`, one per line, to `<scratchpad>/mutated.txt` and
run `keep.js save` on it into `<scratchpad>/built`. Then for each: make the one change with the Edit tool; run the named
test file; record which case failed and with which message; run `keep.js restore` with the same list and folder and
record its last line, which must read `restore: 3 files, 0 differ` (exit status 0). Each must turn the named cases red:
- drop the type check in `taskPayload` (keys only): S19-2 fails (`touches: 'src/a.js'` and `summary: 1` are accepted);
- drop the payload-to-call binding in `taskPayload` (keys and types only): S19-2 fails (a payload whose `task`, `kind` or
  `plan` differs from the call is then accepted), and so does the coverage case
  `add_refuses_a_b64_payload_whose_kind_is_not_the_kind_argument_and_records_nothing` (read as below); S19-1's
  matching-`task` assertion stays green (ruling 6, Decision 31);
- bind an `add` payload against an absent argument (drop the two `p.positional[…] !== undefined` tests in `taskPayload`):
  the coverage case `add_lets_a_b64_payload_drive_kind_and_plan_when_the_command_line_gives_none_or_the_same` fails (its
  first call, with no kind or plan argument, is refused; read as below), and so does S19-1 (its `add` gives no plan
  argument) (Decision 31);
- make the `add` binding refuse on presence alone (drop the two value comparisons, `d.kind !== p.positional[0]` and
  `d.plan !== p.positional[1]`): the same coverage case fails (its second call, whose arguments equal the payload's, is
  refused; read as below) (Decision 31);
- put the fall-back back into `taskPayload` (return `payload: null` on an unreadable value): S19-2 and B1 fail (the two
  unreadable-payload coverage cases too, read as below);
- let `fail` ignore the payload: S19-1 fails;
- drop `fail` from the menu's `B64_KEYS`: S19-1 fails (the menu refuses the `summary` key).

Added by the last review round (2026-10-18), one mutant per reader guard (Decision 45) and one for each new text test:
- the plain-character guard: drop the `PLAIN_PATH_RE` test in `taskPayload`: S19-5 fails (the file named `a b.json`
  is read). Its backslash case flips only on Windows, where a backslash is a separator; on macOS and Linux the
  backslash path names no file, so the space case is what kills this mutant there;
- the `..` guard: drop the `..` segment test in `taskPayload`: S19-5 fails (`../payloads/target.json` is read);
- the regular-file guard: in `readPayloadFile`, read with `safeFs.readFileSync(path.resolve(root, filePath), 'utf8')`
  instead of `readRegularFile(…)`: S19-5 fails (the link is followed and read, and the file over the cap is read).
  The folder case stays refused under this mutant, because the operating system refuses to read a folder as a file;
  it is pinned as a case and kills no mutant;
- the size cap: pass `Number.MAX_SAFE_INTEGER` instead of `MAX_PAYLOAD_BYTES` to `readRegularFile`: S19-5 fails (the
  file over the cap is read). (`Infinity` would not do: `BigInt(Infinity)` throws inside the reader, which still
  refuses);
- no echo: make the unknown-key reason `` `unknown key ${k}` `` again: S19-2 fails (the refusal and the log hold
  `zzKeySentinel`);
- the allowlist: in `src/commands/start.md`, put `--summary "…"` back into COMPLETION step 1's command in place of
  `--payload-file '<path>'`: S19-6 fails (a double quote), and so do S19-3 and S19-4;
- the build agent: in `agents/iron-loop/iron-loop-executor.md`, put back `--summary "<one line>"` in place of
  `--payload-file '.ctoc/state/payloads/<name>.json'`: X3 fails.

The descriptor reader's own swap check (the device and inode the lstat saw against the open descriptor's) has no
mutant here: no test can place a link between the two system calls deterministically, and a mutant no test can kill
proves nothing (Decision 46). It is `src/lib/inbox.js`'s code, unchanged by this slice.

`tests/menu-screens-coverage.test.js` is run by name (`node --test tests/menu-screens-coverage.test.js`). Revision 1 read
it from a whole-suite run because the write protection then refused a background agent's `node --test` on a file whose
name holds `menu-screens`. That refusal is off since the owner's removal of 2026-10-15, and slice 21 refuses only
decision routes.

**Edge cases covered:** an empty, non-object or wrong-typed payload; an unknown key; a payload whose
`task`/`kind`/`plan` differs from the call (binding, ruling 6); a missing payload file; both `--payload-file` and `--b64`
given; a summary holding every shell character, a single quote and a backslash (in the payload file, read byte for byte,
through the shell Claude Code uses); a payload-file path holding a space, a backslash or a `..` segment; a link, a
folder and a file over the size cap at the payload path; a payload whose key name or kind, plan or task value must not
be echoed; a menu call in start.md holding a double quote or any argument outside the allowlist.

No named pipe case is written: Node cannot make one without the `mkfifo` program, which Windows lacks, and a case that
runs on some platforms only is a skip. A pipe is refused by the same check that refuses the folder (`readRegularFile`
lstats the path and refuses anything but a regular file before it opens anything, `src/lib/inbox.js` lines 265-266),
so it never blocks the open.

**Coverage:** every branch of `readPayloadFile`, `payloadTypeOk` and `taskPayload` — the two path guards and the
binding branch (add kind/plan, complete/fail `task`) included — is reached by S19-1, S19-2, S19-3, S19-5, B1 and the
coverage cases. Each reader guard has its own case in S19-5 and its own mutant at Step 10 (Decision 45); the swap check
inside `readRegularFile` has neither (Decision 46). Coverage of `src/` does not fall.

### Security Review
- [ ] Command injection: text an agent wrote never reaches a shell command. It is written to a file and passed as a
  single-quoted path (Rule 15, every recipe, and the build agent's completion). No hook check backs the rule up
  (Decision 32): a session that ignores Rule 15 and pastes agent text into a double-quoted argument is not stopped.
  S19-6 fails the build if any menu call start.md shows carries anything but a payload file, fixed words in single
  quotes, or what the menu, the harness or the owner gave. Inside single quotes nothing expands, and `'\''` keeps the
  owner's comment whole.
- [ ] Input validation: a payload (file or legacy `--b64`) must be one JSON object holding only the keys its route reads,
  each the right type (`B64_KEYS` + `B64_TYPES`, one pair of tables), AND bound to the call — a `complete`/`fail` `task`,
  or an `add` `kind`/`plan`, that differs from the command line is refused out loud (ruling 6), so a stale or wrong file
  is caught. A payload-file path holds only letters, digits and `. _ / : + = @ % -` (no space, no backslash) and no `..`
  segment, is resolved against the project root, and must be a regular file (no link, no folder, no pipe), opened once,
  its open descriptor checked, at most `MAX_PAYLOAD_BYTES` read, JSON (Decisions 43, 46, 48). (Superseded 2026-10-18:
  the earlier line that `PLAIN_PATH_RE` admits `..` as harmless.)
- [ ] Information exposure: a refusal and the task-registry log name only the menu's own allowed keys and a fixed
  reason; never a payload's key names or its kind, plan or task values (Decision 49).
- [ ] Silent failure: an unreadable or wrong-typed payload refuses the whole route with one sentence, writes nothing, and
  is logged with `taskRegistry.warnLog(root, 'payload_unreadable', …)`.
- [ ] Fail-soft: `readPayloadFile` catches every fault and returns null, which refuses out loud; nothing throws past
  `taskCommand`.
- [ ] Denial of service: `readRegularFile` refuses a descriptor larger than `MAX_PAYLOAD_BYTES` and reads at most that
  many bytes, so a file that grows after the check is cut; a pipe is refused before it is opened, so it never blocks;
  `decodeB64` keeps its 65536-character bound.
- [ ] Background agents: the build agent completes its own task through `--payload-file` (Decision 42). Under the
  owner's removal a background agent's `menu task` call is not refused; the payload is read through the same checks,
  and the call is no different from one it could already make with `--summary` (Decision 33).
- [ ] No hook is changed, so no refusal is added or removed by this slice.
- [ ] No secrets, no new dependency; the menu reads only the path the call names, through `readRegularFile`, and
  writes nothing new. Payload files stay in `.ctoc/state/payloads/`, which CTOC's init lists in the project's
  `.gitignore` (`src/lib/init-project.js` lines 839-846, when the project has one) and this repository ignores
  (`.gitignore` line 6), so a commit does not pick them up.

### Wiring — the live call sites
- The menu: `/ctoc:start` loads `src/commands/start.md`, which runs `src/commands/start.js`; `main` → `route` →
  `taskCommand` → `taskAdd`, `taskTransition('fail')` and `taskComplete`, each calling `taskPayload(sub, p, root)` →
  `readPayloadFile` → `inbox.readRegularFile` (or legacy `decodeB64`) → `payloadTypeOk`.
- The new export `readRegularFile` of `src/lib/inbox.js`: its one new reader is `readPayloadFile` above, reached from
  `/ctoc:start`.
- The session's instructions: Rule 15 and the recipes in `src/commands/start.md`, loaded by `/ctoc:start`.
- The build agent's instructions: `agents/iron-loop/iron-loop-executor.md`, read by the build agent CTO Chief launches
  for an `implement` task (start.md's WORK dispatch); its completion command reaches `taskComplete` above.
- Root: the shipped slash command `/ctoc:start`. No module is added.

## Acceptance Criteria

- [ ] `menu task add`, `complete` and `fail` refuse a payload (file or legacy `--b64`) that is not one JSON object holding
  only their keys with the right types, OR whose binding (`complete`/`fail` `task`, `add` `kind`/`plan`) differs from the
  call, write nothing, answer `error: 'payload-unreadable'` with one sentence, and log it with `taskRegistry.warnLog`
  (S19-2, B1, the coverage cases; ruling 6).
- [ ] `menu task fail` stores a summary read from `--payload-file`; `--summary` wins when both are given; a matching `task`
  binds; the main session's `menu task add --payload-file` records the plan and files of its payload (S19-1).
- [ ] The completion form start.md shows, run through the shell Claude Code itself uses on the platform (Git Bash on
  Windows, found as Claude Code 2.1.300 finds it) with a summary (in the payload file) holding `$(…)`, backticks, a
  single quote, a double quote and a backslash, the path given relative to the project root and in single quotes and
  the payload carrying a matching `task`, stores the summary byte for byte and runs nothing (S19-3).
- [ ] The payload reader refuses a path holding a space or a backslash, a path with a `..` segment, a symbolic link, a
  folder and a file over the size cap, each by its own guard, and reads the same content at a plain path; it opens the
  file once and reads at most the cap through the open descriptor (S19-5, the reader-guard mutants).
- [ ] No refusal and no task-registry log entry names a payload's key names or its kind, plan or task values (S19-2).
- [ ] Every menu call start.md shows, in its inline code, its fenced commands and its navigation table, carries only a
  payload file, fixed words in single quotes, or what the menu, the harness or the owner gave, and no double quote
  (S19-6, and its mutant killed).
- [ ] The build agent's definition completes through `--payload-file` with the summary in the payload file, and no
  double-quoted `--summary` is left in it (X3, and its mutant killed).
- [ ] The recorded real-session trial at Step 14 shows a session completing a task whose agent summary holds `$( )` and
  backticks through the payload file, the summary stored byte for byte and no marker file made, and the final review at
  Step 16 confirms it from the trial project's own files.
- [ ] start.md carries Rule 15; no recipe puts an agent's text, a name from a returned `planPath`, or a plan's `files:` in
  a shell command except in a payload file; a plan name the menu's own action carries goes in as written; the claim-failure
  summaries are fixed words; the `search` recipe reads the concept from a file; the `stream comment` row says how the
  owner's words are quoted (S19-4, slice 5's pins, S18-9). The completion recipe carries no `--next`: the agent's route
  travels as `nextAction` in the payload, and no sentence of it speaks of `--next` or of quotes (S18-9 as rewritten by
  change 2b). Rule 15 names the payload folder, `.ctoc/state/payloads/`, and every recipe passes the payload path in
  single quotes (S19-4).
- [ ] start.md's Rule 15 claims no hook check: it says nothing outside the session checks the one-plain-call rule.
- [ ] The red cases were seen failing before the change, and each mutant was killed and undone from its saved copy,
  `keep.js restore` reporting `0 differ` each time; no `git checkout`, `git restore`, `git stash` or `git reset` was run.
- [ ] No hook file changed: `src/hooks/protect-records.js` and `src/hooks/PreToolUse.Bash.js` are byte-identical to the
  copies taken at Step 8.
- [ ] Only the eight declared files and this plan were changed by this build: at Step 16, `keep.js compare` against the
  copies taken at Step 8 and a fresh `git status` list every other changed path in the record, and the build edited none
  of them.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0
  skipped and 0 flaky.

## Risks

- **The session may write a malformed or wrong-typed payload file.** The session writes the JSON object itself, so it can
  mis-type a field or write invalid JSON. A malformed, wrong-typed or wrong-keyed payload is refused with one sentence,
  logged with `taskRegistry.warnLog`, and nothing is recorded; the session rewrites the file and calls again. No model
  base64 is computed anywhere — the first revision's Step 9 encoding measurement and its claims are deleted. Likelihood
  LOW, impact LOW (loud, recoverable).
- **Nothing enforces Rule 15.** With no hook check (Decision 32), a session that ignores the rule and pastes agent text
  into a double-quoted `--summary` or an unquoted `--next` lets the shell run it, exactly as today.
  - Likelihood: LOW. The recipes name only `--payload-file`, and S19-6 fails the build on any menu call in start.md
    that carries a double quote or an argument outside its allowlist, a new or reworded recipe included (Decision 40).
    The recorded trial shows one real session following the rule (Decision 41). What no check covers: a session that
    composes a menu call start.md does not show.
  - Impact: HIGH: a command runs with the main session's freedom.
  - Mitigation: the recipes, S19-6, the trial, the rule's own sentence that nothing outside the session checks it,
    and the Neighbours entry for a backstop the owner may schedule.
- **Other slices edit the same files.**
  - Slices 9, 14, 18 and 21 declare `src/commands/start.md`; slices 8 and 13 change `src/lib/menu-screens.js`; slice
    18 changes `tests/menu-task-wiring.test.js`; slice 22 edits the same menu functions after this slice (Decision 30).
  - Builds run one at a time. This slice depends on 9 and 18, and the builder re-reads every cited span at Step 9.
    Slice 21 edits one sentence of "Answering an inbox question" (start.md line 436); this slice does not touch that
    sentence, and neither slice's tests pin the other's text (Decision 50).
  - Slice 14's test pins "only when that answers `ok` launch" and slice 5's pins "a build (`implement` naming a plan) is
    claimed FIRST". Neither phrase is touched here.
  - Slice 22 passes absolute temporary paths to `--payload-file` in its planned tests (its helper and its Step 9
    check, its lines 1326-1331 and 2211-2216). They hold no space or backslash on macOS and Linux and stay readable;
    on Windows they hold backslashes, which the narrowed path check now refuses (Decision 43). Slice 22's own Risks
    already name a Windows payload-path problem (its lines 2514-2520); the narrower check widens it. Listed under
    Neighbours.
  - Likelihood: MEDIUM. Impact: LOW.
- **A Windows path.** The session passes the payload path relative to the project root, with forward slashes,
  `.ctoc/state/payloads/<name>.json`, so no account folder, drive letter or backslash reaches the command line on any
  platform; the menu resolves the path against the project root (Decision 44). Whether Claude Code on Windows hands
  the session the plugin root written with backslashes is unverified; inside the recipe's double quotes a backslash
  followed by a letter stays as written in Git Bash. Both the planning and the build machines run macOS, so S19-3's
  Windows branch ships unrun there (Decision 47). Likelihood: unknown (believed LOW). Impact: LOW: a wrong path only
  fails to find the file, and the menu refuses out loud.
- **The main session's Write tool asks before it writes in the project.** In Claude Code's default permission mode,
  writing `.ctoc/state/payloads/<name>.json` may ask the owner to allow each write, where Claude Code's own scratchpad
  "can generally be used without permission prompts" (Claude Code's own description of it). Believed, not measured;
  a session in a mode that accepts edits, or with an allow rule for the folder, is not asked. The scratchpad cannot be
  the payload folder for every user (Decision 44). Likelihood: unknown. Impact: LOW (one more click per completion).
- **Payload files accumulate.** The menu reads a payload file and leaves it; `.ctoc/state/payloads/` grows by one small
  file per completion, failure and add. It is ignored by git (Security Review). Removing each file after it is read
  is a Neighbour. Likelihood: HIGH. Impact: LOW.
- **Existing tests change their expectation** (B1, three coverage cases — one because the binding refuses a payload
  whose kind is not the kind argument, Decision 31, its reason now fixed words, Decision 49 — slice 5's pins, S18-9's
  row key and its recipe assertions, Decision 38, and the end marker of the fast-test rules' acceptance-criteria case,
  Decision 51). Each encodes behaviour this slice replaces, and each change is named here with its reason; none is
  weakened: the payload cases now assert a refusal (unreadable, wrong-typed or mis-bound) and an unchanged registry,
  the mis-bound one its warn-log entry too; the reason assertion is as exact as before, on fixed words; the fast-test
  case still reads the completion section up to the completion command; and a new coverage case keeps the payload
  driving kind and plan where the binding allows it.

## Decisions Taken Under Ambiguity

Decisions 1-5, 12-16, 18-22 and 24-29 belonged to revision 1's hook work. Revision 2 (2026-10-18) withdraws them; each
now says so in one line. Decisions 32-37, dated 2026-10-18, say why. Decisions 40-52, dated 2026-10-18, fold in the
owner's answers to the last review round, and Decisions 53 and 54 record two corrections found while doing so; where they
change an earlier decision, that decision says "Superseded" and names the new one.

1. **Withdrawn (revision 2).** It concerned the owner's approval of a hook change; this slice no longer changes the hook.
2. **Withdrawn (revision 2).** The check no longer lives in the write protection; there is no hook check (Decision 32).
3. **Withdrawn (revision 2).** It described the main-session backstop's call shape.
4. **Withdrawn (revision 2).** It described the backstop's here-document allowance.
5. **Withdrawn (revision 2).** It changed the hook's word reader, which only the background-agent reading uses, and that
   reading is unreached since 2026-10-15 (Decision 33). The owner's comment still uses `'\''`, which the shell itself
   reads as one literal quote.
6. **The session writes a payload FILE, not base64 (the root fix, the CTO Chief's ruling 1).** The first revision had the
   session compute base64 on the command line; the red-team critic rejected it as unverified, mostly-silent on error, and
   an invitation to an encoding command that is itself an injection path. The session now writes the JSON object to a
   fresh file in its own scratch folder with the Write tool and passes only that plain path; the menu reads the file
   through a safe reader. `--b64` stays a working legacy transport, but no recipe uses it, and the model computes no base64
   anywhere. (Superseded in part 2026-10-18: the file goes in the named payload folder, `.ctoc/state/payloads/`, not
   "its own scratch folder", and its path is single-quoted, Decisions 43 and 44.)
7. **An unreadable or wrong-typed payload refuses the route** instead of being ignored. Once the payload carries the
   summary and the files a task touches, ignoring it would lose them without a word; this tightens B1 and two coverage
   cases, and every refusal is logged with `taskRegistry.warnLog(root, 'payload_unreadable', …)`.
8. **The menu gets its own `B64_KEYS`, with a sibling type table `B64_TYPES`** (the CTO Chief's ruling 4, narrowed by
   revision 2): one key table and one type table in the menu, so a wrong key or type is refused out loud. `fail` gains
   `summary` for the session's failure recipe, and `add` stays, because the main session's own
   `menu task add --payload-file` is read against it. The hook's own table is not moved or touched (Decision 33).
9. **The claim-failure summaries drop the file name.** The task id already names the plan; the words are the session's
   own.
10. **The owner's comment is single-quoted, not base64.** His words arrive byte for byte that way; base64 encoded by the
    session could alter them.
11. **Names from disk in menu actions are not changed here.** `stageBrowse`, `validateScreen`, the cleanup screens and
    `visionStubsBrowse` put file names into actions without `SAFE_PLAN_FILE`. Rule 15 has the session run a menu action
    word for word, and nothing refuses such a name today. Making the menu refuse them itself is listed under Neighbours.
12. **Withdrawn (revision 2).** It justified nine files. There are five now (Decision 36).
13. **depends_on slices 9 and 18**: Rule 15 names slice 9's inbox-answer recipe; slice 18 rewrote the parenthesis of
    COMPLETION step 1 that this slice edits, and its exact read-only shapes are what `nextAction` may hold. No hook slice
    is a dependency.
14. **Withdrawn (revision 2).** The long-word skip is not changed here (Decision 34).
15. **Withdrawn (revision 2).** No hook edit remains to anchor.
16. **Withdrawn (revision 2).** A background agent's grammar and `TASK_FIELDS` are not touched.
17. **The menu reads the payload file through a narrow safe reader** (`readPayloadFile`): a plain path (no shell-active
    character), a regular file read with `lstat` so a symbolic link is not followed, under `MAX_PAYLOAD_BYTES`, valid UTF-8
    JSON that is one plain object. The session writes to its own scratch folder, and the reader makes sure that even a
    wrong path cannot make the menu read a link, a device or an oversized file. Built on `safe-fs`, which
    `menu-screens.js` already requires.
    **Superseded 2026-10-18 (the owner's answer to the review's question on the reader reopening the file; Decision
    46).** The text above was wrong in two places: the reader checked the path with `lstat` and then opened the path
    a second time, so a link swapped in between, or a file that grew past the cap, was still read; and "valid UTF-8"
    was never checked. What holds now: the payload path holds plain characters only and no `..` segment (Decisions 43
    and 48) and is resolved against the project root; the file is read through `readRegularFile` of
    `src/lib/inbox.js`, which lstats the path and refuses anything but a regular file before opening it (a link, a
    folder, a pipe, a device), opens it ONCE without following a final link where the platform has O_NOFOLLOW (macOS,
    Linux), requires the open descriptor to be a regular file with the device and inode the lstat saw (which refuses a
    link swapped in after the lstat, on Windows too, where O_NOFOLLOW does not exist), refuses a descriptor larger
    than `MAX_PAYLOAD_BYTES`, and reads at most that many bytes through it, as UTF-8 (a byte that is not UTF-8 becomes
    the replacement character; the JSON and key checks still apply). What it does NOT do: a folder ABOVE the file that
    is a link is followed, as for every other file the menu reads under `.ctoc/state/`; and the swap check has no
    deterministic test (Decision 46). The session writes to the payload folder, `.ctoc/state/payloads/` (Decision 44).

The entries below closed the round-3 review findings, each the CTO Chief's ruling on them. Those about the hook are
withdrawn by revision 2.

18. **Withdrawn (revision 2).** It concerned the hook test of the long-word fix.
19. **Withdrawn (revision 2).** It concerned what the hook's link test misses. That is now a Neighbour.
20. **Withdrawn (revision 2).** It concerned a background agent's routes in a hook test.
21. **Withdrawn (revision 2).** It concerned the backstop's test.
22. **Windows: the payload path is written with forward slashes** (closes round-3 finding 5, narrowed by revision 2).
    Node reads forward slashes the same on every platform, and in a bare word the shell reads a backslash as an escape.
    S19-3 passes the path with forward slashes (`split(path.sep).join('/')`). Nothing refuses a backslash any more. This
    is unverified on a real Windows session; the planning and build machines run macOS.
    **Superseded 2026-10-18 (Decisions 43 and 44).** The menu refuses a backslash in the path again, and the path is
    the payload folder's, relative to the project root and single-quoted, so no Windows path is converted at all.
23. **Each payload is bound to its call (closes round-3 finding 6).** A `complete`/`fail` payload's `task`, when present,
    must equal the id argument; an `add` payload's `kind`/`plan`, when present, must equal the kind/plan given
    positionally. A mismatch is refused out loud, never recorded silently. The check lives in the shared reader
    `taskPayload` that both transports (`--payload-file`, legacy `--b64`) pass through; `task` is added to `B64_KEYS`
    (`complete`, `fail`) and `B64_TYPES` (string); the shipped completion and failure recipes emit it; mismatch cases are
    added to S19-2 and a matching case to S19-1, with a binding mutant.
24. **Withdrawn (revision 2).** It listed a refusal the narrowed guard added; the guard is not built.
25. **Withdrawn (revision 2).** S19-5 confirmed the backstop's model; with no backstop it has nothing to confirm.
26. **Withdrawn (revision 2).** It stated a residual of the backstop.
27. **The session's shell is zsh 5.9 on macOS** (closes round-3 finding 10). On macOS the Bash tool runs a fresh
    non-interactive `zsh -c` per call (verified then: `echo $ZSH_VERSION` printed 5.9). `'\''`, here-documents and quoting
    behave as in bash, so the recipes hold for both. `PLAIN_PATH_RE` admits `..`, which is harmless because the reader
    only reads and the type table refuses a non-payload file. The backstop half of this decision is withdrawn by
    revision 2. (Superseded in part 2026-10-18: a `..` segment is refused now, Decision 48. Which shell Claude Code
    uses was read again in its installed binary for S19-3, Decision 47.)
28. **Withdrawn (revision 2).** It concerned slice 20's hook code, which slice 20's revision of 2026-10-18 recommends
    withdrawing.

29. **Withdrawn (revision 2).** It concerned the hook's link test and how the narrowed skip would widen a gap there. The
    skip is not changed, so this slice widens nothing.
30. **Slice 22 depends on this slice and builds on the functions this slice changes (found 2026-10-13).** Slice 22
    (`plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s27-agent-words-are-capped-and-shown-as-data.md`
    since 2026-10-18, the plan that caps an agent's words and shows them as data; corrected that day: the owner split
    slice 22 in two and these caps went to that plan, which also lists this slice in its `depends_on`; the line numbers
    and the quote below are the replaced plan's, read on 2026-10-13)
    lists this slice in its `depends_on` (its line 8) and says plainly that "slice 19 changes `taskAdd`, `taskTransition`
    and `taskComplete` before this slice" (its lines 26-28). Its hole-1 caps sit in exactly those functions as this slice
    leaves them: `taskComplete`'s stored summary (its line 2738, the `extra`/payload this slice feeds from `taskPayload`),
    `taskTransition`'s `p.summary || 'failed'` fail branch (its line 2647, now also fed by a `fail` payload here), and
    `buildAddSpec` within `taskAdd` (its lines 2344-2350, the label/plan/touches this slice reads from a payload) — all
    reached through this slice's shared reader `taskPayload` and the `B64_KEYS`/`B64_TYPES` tables. So any change to the
    SIGNATURES of `taskAdd`, `taskTransition`, `taskComplete`, `buildAddSpec` or `taskPayload` made here MUST be carried
    into slice 22's edits of the same functions. Slice 22 is added to Neighbours to record the coupling.
31. **The binding refuses one existing test that this plan had said passes unchanged; the test is tightened and a case is
    added (found 2026-10-13 by a reviewer of slice 22, after this plan's review rounds had closed: a decision, not a new
    round).** `add_decodes_a_b64_payload_and_lets_it_drive_kind_and_plan` (`tests/menu-screens-coverage.test.js` lines
    835-841 on 2026-10-18) runs `menu task add ignored-positional --b64 <{kind: 'review', plan: 'zeta', label: 'L'}>`.
    `ignored-positional` is the first positional, which is the KIND argument (`buildAddSpec`, `src/lib/menu-screens.js`
    line 2367, reads `kind: p.positional[0], plan: p.positional[1]`), and no plan argument is given. Decision 23's binding
    therefore compares the payload's kind `review` with `ignored-positional`, finds them different, and `taskPayload`
    refuses the add ("the payload kind "review" is not the kind argument "ignored-positional""); the payload's plan `zeta`
    has no plan argument to bind against, so the plan check never fires. Today the payload's kind silently replaces the
    kind argument and the add succeeds. That override is exactly what the binding removes, so the File Specification's
    "passes unchanged" was wrong. The case is changed only by tightening: renamed
    `add_refuses_a_b64_payload_whose_kind_is_not_the_kind_argument_and_records_nothing`, it asserts the refusal (`ok:
    false`, `error: 'payload-unreadable'`, the kind reason in the text), that no task was recorded, and the warn-log entry
    (`payload_unreadable`, `sub: 'add'`, the same reason); it fails before the change. The rest of what it pinned, a
    payload driving kind and plan, stays the menu's behaviour wherever the binding allows it, so it keeps a test: the new
    case `add_lets_a_b64_payload_drive_kind_and_plan_when_the_command_line_gives_none_or_the_same` adds one task from the
    payload alone (no kind or plan argument) and one whose arguments equal the payload's (`review zeta`), and asserts both
    carry kind `review`, plan `zeta` and the payload's label `L`. It passes before the change too (today every readable
    payload is applied), so its red evidence is two Step 10 mutants: binding against an absent argument refuses its first
    call, and refusing on presence alone refuses its second.
    **No other test caller breaks** (searched 2026-10-13, each match read before it was counted). `b64|base64` over
    `tests/`: 170 matching lines in 24 files. The 121 lines in the 15 files under `tests/compaction-eval/` are data, not
    callers: 119 sit inside SHA-256 hex values (`(^|[^0-9a-f])b64|b64([^0-9a-f]|$)` over that folder: 4 lines, each at the
    edge of a `"sha"` value) and 2 are agent prose naming base64. Of the 49 lines in 9 test files, six files pass no menu
    payload (`plan-index-store` and `store-coverage`: embeddings; `inbox-questions-are-shown-as-quoted-data`: a file
    snapshot; `security`: a scanner sample; `ledger-forgery-closed` and `pretooluse-bash-coverage`: a shell `base64 -d`).
    The other three hold the 13 payload calls. B1 (`tests/menu-task-wiring.test.js` line 585, a `{label}` payload over the
    cap) and the coverage cases at lines 846 and 853 (over the cap; not JSON; re-read on 2026-10-18) are refused as
    unreadable before the binding is reached, and this plan already rewrites all three. Line 838 is the case above. Case 84 of
    `tests/protect-records.test.js` is decided by the hook alone, which this slice does not touch (revision 2); since the
    owner's removal it asserts every one of its payloads allowed. `payload-file|payloadFile` over `tests/`: 0 matches.
    `taskPayload|taskAdd|taskComplete|taskTransition|taskCommand|buildAddSpec|decodeB64|parseTaskArgs` over `tests/`: 43
    matching lines in 8 files, none a call with a payload: 30 are the own `taskPayload()` helper of
    `tests/pretooluse-task-coverage.test.js` (its line 117, a Task launch for the launch hook, not the menu's reader); 5 are
    calls without a payload (case 89's `parseTaskArgs`, `tests/protect-records.test.js` lines 562 and 573; `taskCommand`,
    `tests/promote-quarantine-parity.test.js` line 191 and `tests/menu-screens-coverage-holes.test.js` lines 279 and 286);
    8 are comments. The menu exports none of `taskAdd`, `taskTransition`, `taskComplete` and `buildAddSpec`, and a `menu
    task` call with no payload never reaches the binding (`taskPayload` returns `payload: null` first). So this one case
    is the only break. Every place that called the file unchanged or counted two changed cases in it (its Purpose and
    Changes, the Test Plan table, the mutant list and the reading of its cases, Risks, and Step 8's fourth box) now names
    three changed cases and one new.
    (Superseded in part 2026-10-18, Decision 49: the reason quoted above, which named the payload's kind `"review"`
    and the argument, is now the fixed words "the payload kind is not the kind argument"; the case asserts those words
    in the text and in the warn-log entry. Its other assertions stand.)

### Revision 2 (2026-10-18)

All dated 2026-10-18, the CTO Chief's re-plan under the owner's decisions of 2026-10-15 and 2026-10-17.

32. **No hook backstop.** Revision 1 added a main-session check to the write protection. It refused every main-session
    menu call the shell would read as more than one plain call, with `REFUSAL_MAIN_SHELL`. The owner's order of
    2026-10-15 removed the hook's broad refusals as wrong. His answer of 2026-10-17 keeps only one refusal, the
    background agent's decision routes, which slice 21 builds. A new refusal of the main session's own menu calls is
    neither. So the backstop, its tests (cases 97-101 and the changed case 82) and S19-5 are removed. The fix stays at
    its root: agent text never reaches a command line, because it travels in a file the menu reads. Rule 15 says
    plainly that nothing outside the session checks the one-plain-call rule. A backstop is listed under Neighbours for
    the owner to schedule if he wants one.
33. **The hook's `B64_KEYS`, `b64Allowed`, `TASK_FIELDS` and `simpleWords` are not touched.** They serve only the
    background-agent reading (`subagentMenuRefusal`), which `RECORD_REFUSALS_OFF` leaves unreached. Moving the table
    into the menu, adding `payloadFile`, or accepting `'\''` there would change dead code and still be a hook change. The
    menu gets its own `B64_KEYS` and `B64_TYPES`, exported to nobody. Under the removal a background agent's
    `menu task` call is not refused, so it can pass `--payload-file` too, through the same checks.
34. **The narrowed length skip in `src/hooks/PreToolUse.Bash.js` is not built here.** Since the removal, the link test it
    lives in is reached only by the settings refusal (`bashRefuses`, lines 602-606). Narrowing it would tighten that
    refusal: a hook change for the settings line, which is neither of the owner's decisions and belongs with the
    settings write-gap fix (Neighbours).
35. **No owner question remains on this plan.** Revision 1's two questions were the approval of the hook change and
    whether the backstop should refuse any free-text flag. Both asked about the hook, which this slice no longer
    changes. He answered the first on 2026-10-16 with option 1, approve (`.ctoc/streaming/answers.jsonl` line 40). That
    approved revision 1's hook change, which revision 2 no longer makes, so it is moot, as is the answer "No" to the
    second, recorded at revision 1's crossing by its recommended option. No waiting-folder question file is written by this re-plan: the brief allows edits to the six plan files only.
    (Superseded 2026-10-18: the gate critique of that day asked eight new questions on revision 2; the owner answered
    each with its recommended option, and the last review round below folds them in. None remains open.)
36. **Five files.** `src/lib/menu-screens.js`, `src/commands/start.md` and the three test files whose expectations
    encode the payload behaviour replaced: B1, the coverage cases, and slice 5's pins. That is over the ~1-3 budget for
    the same reason as before. Split, the session would be told to use a channel the menu ignores, or the menu would
    accept a channel no recipe uses. (Superseded 2026-10-18: eight files, Decision 51.)
37. **Line numbers re-read on 2026-10-18** for start.md and for the hook lines cited under Revision 2
    (`RECORD_REFUSALS_OFF` at line 597, `bashRefuses` at lines 599-624). `src/lib/menu-screens.js`'s functions are cited
    by name, and the builder re-reads them at Step 9. (Revised the same day after review: the item headings now carry
    today's numbers too, Decision 39.)
38. **(2026-10-18, review finding, HIGH.) `--next` leaves the completion recipe; S18-9 is rewritten to the same intent.**
    Change 4 removed `[--next '<route>']`, "always inside single quotes" and "otherwise leave --next out; never repair a
    route" from line 132, but `tests/menu-task-wiring.test.js` S18-9 asserts all three (lines 1131, 1134 and 1135, read
    on 2026-10-18), and two sentences left behind still spoke of `--next` ("means leave `--next` out") and of quotes the
    recipe no longer has ("a shell character inside the quotes"). Two ways were open: keep `--next` in the recipe, or let
    the payload file replace it. The payload file replaces it, because the rule of this slice is that no agent text
    reaches a command line in any form (Rule 15), and the next screen is agent text: single quotes made it safe only for
    a route that matches the character set, which the session must check by eye before the shell sees it, while in the
    file a wrong route reaches the menu as data and is refused there (slice 18's `isNavRoute`, `nextAction` already a
    `complete` payload key, `B64_KEYS`). Keeping `--next` would leave one agent field on the command line and two
    channels to describe. So change 4 gains two replacements for the orphaned sentences, and the test file's change 2b
    rewrites S18-9's recipe assertions: the payload form present, no `--next` on the line, the shape-only and
    never-repaired rule, the refusal of a shell character, and the character-set sentence word for word. Nothing is
    weakened; the absence check is stricter than the quoting check it replaces. The menu still parses `--next` (S18-3),
    for a caller that passes one.
39. **(2026-10-18, review finding.) The stale line numbers the review listed were re-read and refreshed**, each from
    the file, not copied from the review: start.md 128→132, 122→126, 118→122, 119/130→123/134, 322-324→326-328 (the
    `search` call at 327), 28→29; `src/lib/menu-screens.js` 2737→2764, 3164-3282→3191-3310, 2469→2496, 1779→1806,
    3277→3304; `src/lib/streaming-gate.js` 1402/1585/1629/1939→1450/1658/1704/2082 and 89→95;
    `tests/menu-task-wiring.test.js` B1 581→585; `tests/menu-screens-coverage.test.js` 834-840→835-841, 842-855→843-856,
    845/852/837→846/853/838 (the review's "835-858" read 835-856 on the file).

### The last review round (2026-10-18)

All dated 2026-10-18. Each folds in one of the owner's answers of that day to the gate critique's questions, every one
answered with its recommended option (`.ctoc/streaming/answers.jsonl` lines 94-108). Every line cited below was re-read
on 2026-10-18 on the main checkout.

40. **Every menu call start.md shows is checked against an allowlist (S19-6).** The critique found that the only test
    behind "no recipe puts agent text on a command line" was a list of eleven old phrasings that must be gone (S19-4),
    which a new or reworded recipe passes. S19-6 instead finds every call: each inline code span and each fenced line
    that begins with the menu command or with `menu `, and every code span in the first cell of a Navigation Commands
    row. Each must hold no double quote, and every word must be one of: the menu's own words (its routes,
    sub-commands, task kinds, and the flags that take no value); a placeholder for what the MENU gave the session (a
    kind or plan its action named, a ref or stage it put in an action, a task id it returned); a flag followed by one
    of the values it may carry (`--payload-file '<path>'`; `--summary` with lower-case fixed words in single quotes;
    the question ref after `--touches`; task ids after `--blocked`; the harness's agent ids after `--agent-id` and
    `--live-agent-ids`); or the owner's own words where their recipe puts them (`'{text}'` in `stream comment`, and
    the quoted here-document of the inbox answer, matched whole). Optional parts in square brackets are checked word
    by word. A count floor of 40 keeps it from passing on an empty scan (about 70 calls are found today). Its mutant
    puts `--summary "…"` back into the completion recipe. What it does not check: the deepthink skill's recipes
    (inventory row 19, not a file of this slice), the build agent's definition (X3 pins that one), and a call the
    session composes that start.md does not show. Its cost, as the question said: a recipe that legitimately gains a
    menu word or placeholder must add it to S19-6's lists in the same plan.
41. **One recorded real-session trial, at Steps 14 and 16.** A file check cannot show that a session follows Rule 15;
    a session doing it can. Project rules forbid starting a second Claude, so the executor plays the session at Step
    14 with its own Write and Bash tools, in a throwaway CTOC project in its scratchpad (outside this repository, so
    the shared checkout's registry is untouched). It reads start.md's built COMPLETION step 1 and Rule 15, and
    completes a seeded running task whose agent summary is the fixed text given in Step 14 (it holds `$( )` and
    backticks). Three adjustments, each recorded: the command runs without `--continue`, because the continuation is
    not what is tried and a background agent's `--continue` may be refused by the write protection once slice 21 is
    built with the owner's answer "Refuse both" (the form without it is also the build agent's own); `cd` into the
    trial project is put in front, because a background agent's working directory resets between calls; and
    `${CLAUDE_PLUGIN_ROOT}` is the repository root, so the build under test runs. The record shows the Write call
    (the path and the object), the command verbatim, the menu's answer, the stored summary read back byte for byte,
    and that no marker file exists. At Step 16 the final-review critic, which holds Read and Glob, checks the record
    against the trial project's own files.
42. **The build agent's completion goes through the payload file.** `agents/iron-loop/iron-loop-executor.md` line 189
    ran `menu task complete <taskId> --summary "<one line>"`: inside double quotes the shell runs every backtick and
    `$(…)`, and a build summary routinely names code in backticks. It now writes `{"task": "<taskId>", "summary":
    "<one line>"}` to a fresh file in the payload folder and passes `--payload-file '.ctoc/state/payloads/<name>.json'`;
    X3 pins it, and start.md's sentence on the build agent's own form ("and no flag") is corrected. The task binding
    is emitted so a stale file is caught. No other agent or skill file double-quotes a menu `--summary` except the
    deepthink skill, whose summary is the session's own checked slug (inventory row 19; search `--summary "` over
    `agents/`, `skills/`, `src/` and `docs/` on 2026-10-18: 6 lines in 4 files, read before counting: start.md line
    132, which this slice rewrites; two comments in `src/commands/start.js`; the deepthink skill's lines 82 and 104;
    and the build agent's line 189).
43. **The payload path is single-quoted, and the path check admits no space and no backslash.** The critique showed
    that an unquoted path holding a space is split by the shell, and every completion would then be refused with
    advice that cannot help. Every recipe and Rule 15 now put the path in single quotes, and `PLAIN_PATH_RE` drops the
    space and the backslash: `/^[A-Za-z0-9._/:+=@%-]+$/`. S19-5 has a case whose path holds a space, and one holding
    a backslash. A refused path gets its own fixed reason, so the session knows to write a new file under a plain name.
44. **The payload folder is named: `.ctoc/state/payloads/` under the project root, passed relative to it.** The brief
    asked to check, from the session's own environment, where the main session's scratch folder is and that the menu
    process can read it. Checked on 2026-10-18:
    - *Verified:* this planner's environment names its scratchpad under the system temporary folder, at
      `/private/tmp/claude-<user id>/<the project path, its slashes as dashes>/<session id>/scratchpad` on this macOS
      machine, outside the project. Its session id is the main session's (the main session's memory notes name the
      same id as their origin), so the main session and its agents share it.
    - *Verified:* the on-disk record of the sandbox trial of 2026-10-14 and 2026-10-15, kept in that scratchpad, shows a
      sandboxed shell of a Claude Code session running a script stored there (its error lines name the script's path
      in the scratchpad). A process the session starts can read the scratchpad; the sandbox blocks shell writes
      outside the project, not reads.
    - *Believed* (read in the minified code of the installed Claude Code 2.1.300 binary, not run): Claude Code makes a
      scratchpad only when a server-side feature switch (`tengu_scratch`) or the artifact tool's eligibility is on;
      otherwise the session has none. Its absolute path holds the account's temporary folder, which on Windows can
      hold a space, which the path check now refuses (Decision 43).
    So the main session's scratchpad is readable here but not given to every CTOC user, and start.md cannot quote its
    path. The named folder is one inside the project instead, which every session has:
    - *Verified:* the menu finds the project root by walking up from the working directory (`findProjectRoot`,
      `src/commands/start.js` line 292) and reads `.ctoc/state/tasks.json` under it on every task call; the reader
      resolves the payload path against that same root, never the working directory.
    - *Verified:* `.ctoc/state/` is ignored by this repository's git (`.gitignore` line 6), and CTOC's init adds it to
      a project's `.gitignore` when the project has one (`src/lib/init-project.js` lines 839-846).
    - *Verified:* the write protection refuses the editing tools only under `.ctoc/approvals/`, `.ctoc/state/verify/`,
      `.ctoc/streaming/` (except the waiting folder) and the settings (`src/hooks/protect-records.js` lines 159 and
      632-645), so the Write tool may write in `.ctoc/state/payloads/`.
    - A build agent in a worktree writes under the checkout it runs the menu from, which is the root the menu finds.
    - S19-3 uses exactly this folder in its temporary project, as the answer asked.
    The relative path also keeps every account folder, drive letter and backslash off the command line on Windows. The
    plan-index `search` concept file goes in the same folder. Costs, in Risks: the Write tool may ask before each write
    in Claude Code's default permission mode (believed), and payload files accumulate. Removing each payload file
    after it is read is listed under Neighbours and not built: this last round adds nothing the answers do not require.
45. **Each payload-reader guard has one test case and one mutant (S19-5).** The guards are the plain-character check
    (cases: a space, a backslash), the `..` check (case: `../payloads/target.json`), the regular-file check (cases: a
    symbolic link, a folder) and the size cap (case: a valid payload of 70,000 characters). Every case's file holds a
    VALID payload, so only its guard can refuse it, and the last call reads the same content at a plain path. Each
    guard's mutant is in the Test Plan. Two honest limits: the folder case kills no mutant, because the operating
    system itself refuses to read a folder as a file, so the link case kills the regular-file mutant; and no named pipe
    case is written, because Node cannot make one without `mkfifo`, which Windows lacks, and a platform-only case is a
    skip. The link case fails loudly, naming the platform and the error, where a link cannot be made (the pattern of
    `tests/the-bash-channel-cannot-reach-the-ledger-through-a-link.test.js` lines 45-66).
46. **The reader opens the file once, through the inbox's existing descriptor reader.** `readRegularFile`
    (`src/lib/inbox.js` lines 247-288) already does what the answer asks: lstat first and refuse a non-regular entry
    before opening; open with O_NOFOLLOW and O_NONBLOCK where the platform has them (they read as 0 on Windows, lines
    73-77); require the open descriptor to be a regular file with the lstat's device and inode; refuse it over the
    cap; read exactly the size the descriptor reported. Writing a second copy in the menu would duplicate fifteen
    lines with the same platform handling; exporting it costs one line and one declared file. Decision 17 is corrected
    to what it does. Two residuals, stated there: a linked folder above the file is followed, and the swap check has
    no deterministic test (no test can place a link between two system calls on demand), so no mutant is listed for
    it.
47. **S19-3 runs in the shell Claude Code itself uses.** Read on 2026-10-18 in the installed Claude Code 2.1.300 binary
    (its minified code, not run): on macOS and Linux it takes `CLAUDE_CODE_SHELL`, then `SHELL`, when either names
    bash or zsh and can run, else zsh or bash (bash first when `SHELL` names bash) from `/bin`, `/usr/bin`,
    `/usr/local/bin`, `/opt/homebrew/bin` and what `which` finds; on Windows it takes `CLAUDE_CODE_GIT_BASH_PATH`
    when its file name is `bash.exe`, `sh.exe`, `bash` or `sh` and it exists, else `C:\Program Files\Git\bin\bash.exe`,
    else `C:\Program Files (x86)\Git\bin\bash.exe`, else the `bash.exe` two folders above the `git.exe` found on PATH,
    and with none it reports "Git Bash not found; BashTool will be unavailable". The test's `claudeCodeShell()` follows
    that order, without the `which` search. With no shell found the case fails loudly with the platform named: on such
    a machine Claude Code has no Bash tool, so start.md's recipes cannot run there either. The Windows branch ships
    unrun: the planning and build machines run macOS.
48. **A `..` segment in the payload path is refused.** The earlier claim that a `..` path is harmless rested on the
    reader only reading; the answer chose to refuse it outright. Since a backslash is refused too, `/` is the only
    separator, so `split('/').includes('..')` finds every `..` segment. Its own fixed reason; its own case and mutant.
49. **A refusal and the log never echo the payload.** The reasons named the first unknown key and the payload's kind,
    plan and task values, and `taskRegistry.warnLog` wrote the same reason to `.ctoc/logs/task-registry.json`. Every
    reason is now fixed words. The refusal still lists the menu's own allowed keys, which are not the payload's. S19-2
    sends a sentinel key, kind, plan and task and asserts that none appears in a refusal or in the log; the coverage
    case that asserted the old reason (Decision 31) now asserts the fixed words.
50. **The order with slice 21 (the plan that refuses a background agent the routes recording the owner's decisions).**
    Neighbours said it "edits no file of this slice"; that was wrong. Slice 21 declares `src/commands/start.md` and
    rewrites one sentence of "Answering an inbox question" (its plan, lines 199 and 863-882: start.md line 436), the
    subsection Rule 15 points to by name. Checked for a technical order on 2026-10-18: this slice does not touch that
    sentence and neither slice's tests pin the other's text (S19-4 and S19-6 read no part of line 436; slice 21's case
    1 pins only its own sentence), and slice 21's hook refuses only the decision routes, so the build agent's new
    completion (no `--continue`) and S19-3 (a shell started by the test, outside any hook) pass either way. So there is
    no technical order: `depends_on` gains no edge, builds run one at a time, and whichever of the two builds second
    re-reads its start.md spans at Step 9. Two touch points are recorded: the trial runs without `--continue`
    (Decision 41); and slice 21's planned hook comment says a build agent's own completion "carries no flag" (its plan,
    line 459), which this slice makes stale (Neighbours).
51. **Eight files.** Over the ~1-3 budget for the reason of Decision 36, plus three: `src/lib/inbox.js` exports the
    descriptor reader (Decision 46); `agents/iron-loop/iron-loop-executor.md` carries the build agent's completion
    (Decision 42); and `tests/test-writers-get-the-fast-test-rules.test.js` reads the build agent's completion section
    up to the end marker `'menu task complete <taskId> --summary'` (its line 168), which that change removes, so its
    case "the builder verifies and ticks each acceptance criterion before the completion command" would fail on a
    missing marker; the marker becomes `'menu task complete <taskId> --payload-file'`, the case's intent unchanged. No
    file is created, so no documented count moves and `CLAUDE.md` is not declared. Searched for a pin of the build
    agent's bytes: `iron-loop-executor` over `.ctoc/*.json` matched only lists and records of names, none a hash or a
    size.
52. **The owner's two rules of 2026-10-18 are written into the steps.** A failing test is investigated to its cause
    before anyone touches it, and is changed only with a written finding that the test itself is wrong (Step 14). No
    test of this slice asserts a time; any timing check would be a recorded Step 12 measurement, and none is needed
    here (Step 12).
53. **The `search` recipe reads its concept file through `src/lib/safe-fs`, not `require('fs')`** (found while
    re-reading the recipe's test fences for this round, not an owner question). The rewritten recipe is the first
    `node -e` program in start.md to require a module by a bare name; `tests/shipped-recipes-execute.test.js` case 2
    resolves every `require` target under the repository root (`require.resolve(path.join(REPO_ROOT, module))`, its
    lines 186-200), so `require('fs')` would turn it red. `safe-fs` resolves there and exports `readFileSync`, which its
    case 3 checks, and it accepts a relative path. Nothing else in the recipe changes. The other fences that read
    start.md's `node -e` programs were read for the new one on 2026-10-18: `tests/protect-records.test.js` case 51,
    `tests/ledger-forgery-closed.test.js` (lines 133-141 and 387-393) and `tests/shell-write-targets.test.js` case 37
    send each program to a hook and assert it allowed, with a floor of at least 5 programs and no exact count; the
    hook's inline-code check (`isLedgerForgery`, `src/hooks/PreToolUse.Bash.js` lines 508-555) refuses only a ledger
    token (lines 430-442, none in the recipe), a `$(` or backtick (none), or a non-literal `require` argument (both
    are single-quoted literals, as in the other recipes). Case 95's fixed count of three covers only the settings rows.
    `tests/agent-layer-reachability.test.js` needs `search` in a qualified form near `plan-index` (its lines 31-36):
    `pi.search` is one. Step 10 runs all of them.
54. **"Human gates stay foreground" stops saying a completion carries `--gate N` and `--next` flags** (found the same
    way). Its sentence at start.md lines 242-243 described the old completion recipe; after this slice the gate and the
    next route travel in the payload file. The sentence now names both carriers, the payload key and the menu flag,
    so it is true and still names `--gate` and `--next`, which `tests/menu-protocol.test.js` case DC-GATE requires of
    that section (its lines 189-194). S19-4 pins the new wording and the absence of the old.
    S19-6 pairs backticks per Markdown block rather than per line for the same reason: the span at start.md lines
    235-236 (`menu task complete <id>` wrapped onto `--continue`) is otherwise never read.

## Neighbours (seen, not built here; scheduling is the owner's)

- **A backstop in the write protection** that refuses a main-session menu call the shell would read as more than one plain
  call. Revision 1 planned it (its cases 97-101). It is a hook change outside the owner's two decisions, so it is his to
  schedule or not.
- **The unconditional long-word skip** in the hook's link test (`MAX_CANDIDATE_LEN`, `src/hooks/PreToolUse.Bash.js`
  lines 264-275). It now decides only the settings refusal, so it belongs with the settings write-gap fix
  (`plans/todo/settings-files-cannot-turn-edit-protection-off.md`) or a plan the owner schedules.
- The menu puts names from disk into actions without the plain-character check `streaming-gate.js` applies
  (`SAFE_PLAN_FILE`, `src/lib/streaming-gate.js` line 95 on 2026-10-18): `stageBrowse` (line 2050), `validateScreen`'s approve actions (its `isUnsafePlanFile`, lines
  111-121, refuses only separators, `..`, white space and controls), the cleanup screens (from line 1806 on 2026-10-18) and
  `visionStubsBrowse`. Nothing refuses such a name today; the menu could refuse them itself.
- `stream comment` joins every word after the reference (`src/lib/menu-screens.js` line 3226); a payload-file form would
  carry any comment, but the single-quote rule already does, and the owner's words must arrive byte for byte.
- Slice 21's revision of 2026-10-18 refuses a background agent the routes that record the owner's decision. It edits no
  file of this slice. (Corrected 2026-10-18: it does edit `src/commands/start.md`, one sentence of "Answering an inbox
  question"; there is no technical order between the two, Decision 50.) Its planned hook comment says a build agent's
  own `menu task complete <id>` "carries no flag" (its plan, line 459); after this slice the build agent's completion
  carries `--payload-file`, so that comment needs one word changed in whichever plan touches the hook next. Its
  behaviour is unaffected: it refuses `--continue`, not `--payload-file`.
- **Removing each payload file once the menu has read it.** `.ctoc/state/payloads/` grows by one small, git-ignored
  file per completion, failure and add (Risks). The menu could remove the file after reading it; not built here
  (Decision 44).
- **The payload paths of the two plans that replaced slice 22.** The plan that caps an agent's words and shows them as
  data and the plan in which only where a plan sits says a decision waits (both named in the last entry) pass absolute
  paths under their test root's `scratch` folder to `--payload-file` in their planned tests (the first's helper at its
  lines 834-840, the second's at its lines 608-614, read on 2026-10-18). On Windows those hold backslashes, which this
  slice's path check now refuses (Decision 43), and the first plan's Risks name only a short Windows temporary path
  holding `~` (its lines 1389-1391). Writing their payload files under `.ctoc/state/payloads/` and passing the relative
  path, as S19's tests do, removes that.
- The deepthink skill's `menu task` calls still pass `--label "…"` and `--summary "…"` (inventory row 19). Their text is
  the session's own checked slug, so nothing runs; moving them to a payload file would make S19-6's rule hold there
  too.
- The plan that caps an agent's words and shows them as data
  (`plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s27-agent-words-are-capped-and-shown-as-data.md`,
  one of the two that replaced slice 22 on 2026-10-18)
  depends on this slice (its `depends_on`) and caps and escapes the fields this slice routes through the payload channel:
  it edits `taskComplete` (the stored summary), `taskTransition`'s `fail` branch and `taskAdd` after its `buildAddSpec`
  call (label/plan/touches), all built on this slice's `taskPayload` reader and the `B64_KEYS`/`B64_TYPES` tables. A
  change to the signatures of those functions here must be carried into that plan (Decision 30). (Added 2026-10-18: the
  refusal reasons are now fixed words, Decision 49, and `readPayloadFile` takes the project root first, Decision 46;
  `taskPayload(sub, p, root)` keeps its signature.) The other, the plan in which only where a plan sits says a decision
  waits (`plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s28-only-where-a-plan-sits-says-a-decision-waits.md`),
  does not list this slice in its `depends_on`; it lists the first, so it builds after this slice, and it deletes the
  gate from this slice's Rule 15 and completion payload sentence (its lines 493-499) and replaces the "Human gates stay
  foreground" sentence this slice's change 8 rewrites and S19-4 pins (its lines 500-504).

## Execution Plan

Every note the executor adds while building goes under a `## Execution Record` heading placed after the last step below,
as one `###` subheading per note (for example `### Step 8: TEST — red evidence`). That covers red runs, results, line
shifts, mutant checks and findings. Nothing is written inside the steps except their check marks, and no other section is
edited. No step runs `git checkout`, `git restore`, `git stash` or `git reset`.

### Step 8: TEST
- [ ] **No hook change.** Confirm that this plan's `files:` names no file under `src/hooks/` and that
  `src/hooks/protect-records.js` still holds `RECORD_REFUSALS_OFF = true`. If the switch is gone or false, stop and
  report: revision 2 was written for the owner's removal.
- [ ] **The baseline, by content.** Before any test or source line is written:
  - record the output of `git status --porcelain=v1 --untracked-files=all` verbatim under
    `### Step 8: TEST — the baseline`. It need not be empty.
  - write `keep.js` (the Test Plan) to the scratchpad;
  - write the eight declared files plus `src/hooks/protect-records.js` and `src/hooks/PreToolUse.Bash.js`, one per line,
    to `<scratchpad>/own.txt`;
  - write every other existing path the baseline lists to `<scratchpad>/others.txt`. Record a deleted or renamed entry
    as text instead.
  - run `keep.js save` on each, into `<scratchpad>/own-at-start` and `<scratchpad>/others-at-start`, and record both
    last lines.
- [ ] Write the tests exactly as specified:
  - in `tests/menu-task-wiring.test.js`, the S19 block (S19-1 to S19-6, with the `payloadFile` and `claudeCodeShell`
    helpers), the changed B1, S18-9's row key and its recipe assertions (change 2b), and X3 in the R3-D describe;
  - in `tests/menu-screens-coverage.test.js`, the three changed cases and the new one;
  - in `tests/the-session-claims-a-build-before-launching-it.test.js`, slice 5's changed pins;
  - in `tests/test-writers-get-the-fast-test-rules.test.js`, the end marker at line 168.
- [ ] Run the four files before any source change, and record each case's result. It must match the Test Plan table:
  S19-1 to S19-6, X3, B1, the changed coverage cases, S18-9 (its row key and its recipe assertions), slice 5's pins and
  the fast-test rules' acceptance-criteria case fail; the new coverage case passes, its red evidence being the mutants.
  If any row differs, stop and record it.

### Step 9: PREPARE
- [ ] Confirm slices 9 and 18 are built: start.md holds the "Answering an inbox question" subsection and slice 18's
  parenthesis in COMPLETION step 1, and `src/lib/task-view.js` holds slice 18's anchored `NAV_ROUTE`. If not, stop.
- [ ] Re-read the cited spans and record every line shift:
  - in `src/lib/menu-screens.js`: `parseTaskArgs`, `decodeB64`, `buildAddSpec`, `taskAdd`, `taskTransition`,
    `taskComplete` and the exports;
  - in `src/commands/start.md`: lines 19-45, 118-165, 228-246, 320-340 and 418-465 (widened on 2026-10-18 to today's
    numbers);
  - in `tests/menu-task-wiring.test.js`: S18-9 (lines 1071-1150 on 2026-10-18), confirming the eight recipe
    assertions change 2b replaces read as quoted, and the R3-D describe (lines 1251-1268);
  - in `src/lib/inbox.js`: `readRegularFile` (lines 247-288), the open flags (lines 73-77) and `module.exports`
    (lines 1102-1118);
  - in `agents/iron-loop/iron-loop-executor.md`: lines 181-190, the completion section and its `bash` block;
  - in `tests/test-writers-get-the-fast-test-rules.test.js`: line 168, the end marker;
  - every old text the start.md items and the build agent's change quote, confirmed to read as quoted.
- [ ] Record whether slice 21 (the plan that refuses a background agent the routes recording the owner's decisions)
  is built: read start.md's sentence after step 4 of "Answering an inbox question". Either way this slice's edits stand
  (Decision 50); record which sentence stands, so the trial's note on `--continue` is read in context.

### Step 10: IMPLEMENT
- [ ] `src/lib/menu-screens.js`, as specified:
  - `parseTaskArgs`'s `--payload-file` case;
  - `B64_KEYS` (rows `add`, `complete` and `fail`, with `task` on `complete` and `fail`) and `B64_TYPES` (with `task`);
  - `PLAIN_PATH_RE` (no space, no backslash), `payloadTypeOk`, `readPayloadFile(root, filePath)` and `taskPayload`
    (with the two path guards, the payload-to-call binding, ruling 6, and fixed reasons only);
  - the `./inbox` destructure gains `readRegularFile`;
  - `buildAddSpec`, `taskAdd`, `taskTransition` and `taskComplete`.
  - Nothing new is exported.
- [ ] `src/lib/inbox.js`: `readRegularFile` added to `module.exports`, and the one sentence in its doc comment.
- [ ] `src/commands/start.md`: items 1-8.
- [ ] `agents/iron-loop/iron-loop-executor.md`: the completion section, as specified.
- [ ] Run `npm run lint` and `npm run typecheck`. Expect no warning, and the type error count exactly at
  `.ctoc/typecheck-baseline.json` `maxErrors`. A new error is fixed in the new code's JSDoc, never by moving the baseline.
- [ ] Run the four test files, plus `tests/menu-protocol.test.js`, `tests/agent-layer-reachability.test.js`,
  `tests/claude-md-keeps-every-rule.test.js`, `tests/protect-records.test.js`,
  `tests/only-the-owner-answers-an-inbox-question.test.js`, `tests/shell-write-targets.test.js` and
  `tests/the-bash-channel-cannot-reach-the-ledger-through-a-link.test.js` (the last two send every `node -e` recipe
  of start.md, the rewritten `search` recipe included, to the edit-protection hook), `tests/ledger-forgery-closed.test.js`
  (the same, through the ledger check), `tests/shipped-recipes-execute.test.js` and
  `tests/unexecutable-instruction-fence.test.js` (both read start.md's recipes), and the inbox's own test files,
  whose routes call `readRegularFile` (`tests/inbox.test.js`, `tests/inbox-coverage.test.js`,
  `tests/the-owner-answers-an-inbox-question.test.js`, `tests/inbox-questions-are-shown-as-quoted-data.test.js`;
  listed by Glob `tests/*inbox*.test.js` on 2026-10-18). Record that every case passes.
- [ ] Run the mutant checks of the Test Plan with `keep.js`: saved copies, the Edit tool, and `keep.js restore`
  reporting `0 differ` after each. Record which case fails for each, and each restore line.

### Step 11: REVIEW
- [ ] The critic walks every row of the inventory table against start.md, the deepthink skill and the build agent's
  definition as built.
- [ ] The critic confirms that no hook file changed, and that start.md claims no hook check (Rule 15's last sentence).
- [ ] The critic confirms that `taskPayload` is the one reader `add`, `complete` and `fail` pass through, that it
  reads a file only through `readRegularFile`, and that no refusal reason holds a payload's key or value.
- [ ] The critic confirms that S19-6's allowlist holds no entry wider than a call in start.md needs.

### Step 12: OPTIMIZE
- [ ] Confirm the regular expressions are module-level literals and that the payload file is opened once, its size
  checked on the open descriptor before any byte is read.
- [ ] No test of this slice asserts a time (the owner's rule of 2026-10-18: timing tests stay out of the gated suite).
  No timing measurement is needed for this slice; if the review asks for one, it is taken and recorded here as a
  measurement, never added as a test.
- [ ] Apply the review's findings that change no behaviour.

### Step 13: SECURE
- [ ] The security scanner attacks the payload reader: non-objects, extra keys, wrong types, oversized values, a path
  holding a space, a backslash or a `..` segment, a symbolic link, a folder, a pipe, a mis-bound `task`/`kind`/`plan`,
  and a payload whose key name or value must not be echoed.
- [ ] It confirms that no recipe in start.md and no line of the build agent's definition still puts agent text on a
  command line, and records that nothing outside the session enforces Rule 15 (Decision 32).

### Step 14: VERIFY
- [ ] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped,
  0 flaky. Record the test count and the coverage figure, and that the export-reachability fence reports no new dead
  export (`readRegularFile` has its reader in `src/lib/menu-screens.js`).
- [ ] **A failing test is investigated first** (the owner's rule of 2026-10-18). Any test that fails, in this slice's
  files or anywhere in the suite, is investigated to its cause before anyone touches it: read the test, the code it
  calls and the failure, and record the cause. The code is fixed when the code is wrong. A test is changed only with a
  written finding, recorded under the Execution Record, that the test itself is wrong, and then only to tighten it.
- [ ] **The real-session trial** (Decision 41). The executor plays the session; record each item below verbatim under
  `### Step 14: VERIFY — the real-session trial`:
  1. Make an empty folder `<scratchpad>/s19-trial/` holding an empty `.ctoc/` folder (the menu takes the folder
     holding `.ctoc/` as the project root), and run `cd '<scratchpad>/s19-trial' && node '<repository root>/src/commands/start.js'`
     once, so CTOC initializes it.
  2. Seed a running task through the menu, in the same way: `menu task add review LH1`, then `menu task start <id>`
     with the id it returned.
  3. The agent's summary is exactly: ``built $(touch pwned) and `touch pwned2` it's done``.
  4. Read start.md's COMPLETION step 1 and Rule 15 as built, and follow them: write the payload object
     `{"task": "<id>", "summary": "<the summary above>"}` with the Write tool to
     `<scratchpad>/s19-trial/.ctoc/state/payloads/trial.json`; record the Write call's path and content.
  5. Run the completion as the recipe shows it, without `--continue` (Decision 41):
     `cd '<scratchpad>/s19-trial' && node '<repository root>/src/commands/start.js' menu task complete <id> --payload-file '.ctoc/state/payloads/trial.json'`;
     record the command and the menu's whole answer. The command line holds no part of the summary.
  6. Read `<scratchpad>/s19-trial/.ctoc/state/tasks.json` with the Read tool and record that the task's stored summary
     equals the text of item 3 byte for byte.
  7. Glob `pwned*` under `<scratchpad>/s19-trial/` and under the repository root, and record that nothing is found.

### Step 15: DOCUMENT
- [ ] start.md's Rule 15 and recipes say the same thing, and the build agent's completion section agrees with them.
- [ ] Record the search `--payload-file` over `src/commands/start.md`, `src/lib/menu-screens.js` and
  `agents/iron-loop/iron-loop-executor.md` at this step.

### Step 16: FINAL-REVIEW
- [ ] Run `keep.js compare` twice and `git status --porcelain=v1 --untracked-files=all` again:
  - with `<scratchpad>/others.txt` against `<scratchpad>/others-at-start`;
  - with `<scratchpad>/own.txt` against `<scratchpad>/own-at-start`, which must show the two hook files unchanged.
  - Record every path that differs from the baseline other than the eight declared files and this plan; the build
    edited none of them.
- [ ] **The trial, checked.** The final-review critic reads the trial record of Step 14 and, from the trial project's
  own files, confirms with Read and Glob: the command line recorded holds no part of the summary and names the payload
  file; the stored summary in `<scratchpad>/s19-trial/.ctoc/state/tasks.json` equals the agent's text byte for byte;
  no `pwned` or `pwned2` file exists in the trial folder or the repository root.
- [ ] Check every acceptance box against the record of Steps 8-14, with the red results, the mutant results and restore
  lines, the trial, and the final suite figures shown.

## Decisions Taken Under Ambiguity

**SUPERSEDED (2026-10-18).** The entries below were recorded for revision 1 of this slice: q11 asked about a hook
backstop revision 2 no longer builds (Decision 35), and q99 approved revision 1's design for building. Revision 2 and
the review round of 2026-10-18 (Decisions 38 and 39) changed the plan; no build approval of revision 1 approves it.

Decided by the recommended option when this plan moved on; none of these needed the human.

- (superseded) Should the backstop also refuse any free-text flag on a main-session menu task call, such as --summary, --next, --touches or --label? — No — refuse only a menu call the shell would read as more than one plain call (question q11-free-text-flags-on-menu-calls-r1791897274792)
- Noted for your record: what this critique covered, and what it could not check. — Noted (question q98-critique-coverage-r1791897274792)
- (superseded) Lens verdict: APPROVE — every finding the four lenses raised in this last review round is carried by the plan, in its Decisions 18 to 30, and the holes it leaves open are put to you in the write-prote — Approve four-defects…s19-agent-text-never-reaches-the-shell-unquoted for building (question q99-gate-ruling-r1791897274792)
