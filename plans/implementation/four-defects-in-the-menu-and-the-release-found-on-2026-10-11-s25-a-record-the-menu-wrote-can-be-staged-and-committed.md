---
title: "The settings refusal reads a command as the shell cuts it and also guards settings.json"
type: implementation
created: 2026-10-13
priority: high
effort: medium
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: the-write-protection-compares-real-files-not-spellings
files:
  - src/hooks/PreToolUse.Bash.js
  - src/hooks/protect-records.js
  - src/lib/real-path-confinement.js
  - src/lib/app-runner.js
  - tests/protect-records.test.js
  - tests/a-link-cannot-leave-the-repository.test.js
  - tests/last-mile-drives-entry-point.test.js
  - tests/agent-tool-grants.test.js
  - agents/infrastructure/deployment-setup.md
  - docs/ENFORCEMENT.md
revision: 4
rejection_reason: "Owner's answer of 2026-10-17, Refuse decision routes (Recommended): background agents are refused only the routes that record his decisions (stream approve, stream answer, stream comment, inbox answer, the approve actions); his 2026-10-15 removal stands for everything else. Re-plan to that scope."
tag: rejected
---
# REVISION 1

## Rejection Feedback

Owner's answer of 2026-10-17, Refuse decision routes (Recommended): background agents are refused only the routes that record his decisions (stream approve, stream answer, stream comment, inbox answer, the approve actions); his 2026-10-15 removal stands for everything else. Re-plan to that scope.

---

The send-back above is the one of 2026-10-17. Revision 3 answered it; revision 4 below answers the gate critique of
revision 3 and the owner's send-back of 2026-10-19. Revisions 1 and 2 are no longer in this file: git keeps them in the
commits before revision 4.

# The settings refusal reads a command as the shell cuts it and also guards settings.json

Parent plan: `plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`.

## Revision 4 (2026-10-19): what changed and why

The gate critique of revision 3 (premortem, devil's advocate, red team, advocate) found seven defects. The owner chose
"send back, fix all three properly" on 2026-10-19; every other question took its Recommended option (answers log lines
200-216). Revision 4 answers each:

1. **The cut reads the command as the shell does.** Revision 3 added a single `&` to a split that ignores quotes and
   escapes, so it would have turned refused writes into allowed ones (`tee "&cat" .ctoc/settings.yaml < /tmp/x`). Now a
   second reading cuts the way bash and zsh cut, and today's cut stays as the first reading. Either reading refusing
   refuses, so no command refused today is allowed after this change.
2. **`find` from the parent folder stays open, stated and pinned** (`find .ctoc -name settings.yaml -delete`). The
   document no longer claims `find -delete` is closed.
3. **The long-name rule belongs to the real-file plan,** which this plan now depends on. This plan adds one thing to
   it: on Linux, a name over 255 bytes in a short path counts as absent. It also adds a multi-byte commit-message row and
   states the deep-link case.
4. **The deployment agent checks that the file holds its block before any step that reads it.**
5. **The last-mile messages and the document tell the human the file is protected and to add the entry point by
   hand.** The deployment-route plan is to cover the key.
6. **The executed entry-point command is back on the findings list as an open route,** with a control at the point where
   the check run reads the key as the option to schedule.
7. **Revisions 1 and 2 are out of this file.**

Names used in this plan:
- **the real-file plan**: "the write protection compares real files, not spellings"
  (`plans/in-progress/the-write-protection-compares-real-files-not-spellings.md` on its own branch, read in worktree
  `.claude/worktrees/agent-ac3ce4106d17e75a7-realfile` on 2026-10-19; not in the main checkout's `plans/`);
- **the agent-settings plan**: "a background agent cannot change Claude Code's settings", the real-file plan's own
  dependency, built on the same branch;
- **the spelling plan**: the small plan for the settings spelling bypass, being written on another branch (not on disk
  in the main checkout on 2026-10-19: searched `plans/` for "spelling bypass", "settings spelling" and "brace group",
  0 files);
- **the deployment-route plan**: "a menu route writes the deployment block", the owner's choice of 2026-10-18,
  planned separately (named in the decision-route plan, `…-s21-background-agents-do-not-open-the-dashboard.md` line 172).

## The owner's decisions this plan carries

- **2026-10-18:** this plan's withdrawal question, "Keep it, re-planned as a settings-only change"; the task-registry
  plan's withdrawal question, the same; its question on `.ctoc/settings.json`, "Cover .ctoc/settings.json in the
  settings change" (answers log lines 196, 192 and 194).
- **2026-10-19, the critique of revision 3, all key 1:**
  - the cut reads quotes, escapes and a background `cd` as the shell does (line 200);
  - `find` from the parent folder stays listed as open and a test pins it (line 202);
  - **his approval of the long-name rule's narrowing,** each path part counted in its file system's own unit, the
    deep-link case stated as a limit (line 204);
  - the deployment agent's post-setup steps wait for, or check, the handed-over block (line 206);
  - the last-mile message and the document tell the human to add the entry point by hand, and a menu route for it is
    named (line 208);
  - each path part counted in the unit its file system counts, the unit confirmed on the build machine, and a
    multi-byte commit-message test (line 210);
  - the struck finding reworded to the open run-time spelling, with a control where the key is read (line 212);
  - the red-team lens gets the parent's full path next round (line 214);
  - the superseded revisions move out of the file (line 216).
- **2026-10-19, the ruling:** "send back, fix all three properly", the owner's own choice, relayed by the coordinator.
  No answers-log line holds it; the hold at line 220 is on that ruling.
- **2026-10-15:** the record refusals stay off (`RECORD_REFUSALS_OFF = true`).
- **2026-10-18:** a menu route writes the deployment block into `.ctoc/settings.json` on the owner's OK.

## Who owns which change

| Change | Owner |
|---|---|
| `MAX_CANDIDATE_LEN` and its length skip removed; every candidate resolved | the real-file plan |
| The walk segment by segment; one name over 255 UTF-16 units counts as absent; any other "name too long" is a fault | the real-file plan |
| `.ctoc/settings.json` refused to background agents, with the agent sentence | the agent-settings plan |
| On Linux, "name too long" for a name over 255 bytes in a path under 4,096 bytes counts as absent too | **this plan**: one added alternative in the real-file plan's condition, built after it lands |
| The second reading of the cut, the background `cd`, a part's opening redirect, `find` given a writing option | **this plan** |
| `.ctoc/settings.json` refused to every session, with the settings sentence | **this plan** |
| Where `$'…'` ends, for the cut only | **this plan** |
| A backslash inside a name, decoding `$'…'` into a name, brace groups and lists that name a file | the spelling plan |
| A menu route that writes the `deployment` block and `general.entry_point`, and the messages that then name it | the deployment-route plan |

The spelling plan and this plan both touch `isLedgerWrite`'s neighbourhood: this plan adds the cut and changes the loop's
`cd` and read lines; the spelling plan changes how a name is matched. Neither depends on the other; whichever lands second
re-reads the function at its Step 9.

## Problem Statement

Every line number below was read on 2026-10-19 in the main checkout, unless it says "the dependency's", which means the
real-file plan's worktree, read the same day.

**The settings refusal is the one shell refusal still on.** In `bashRefuses` (`src/hooks/protect-records.js` lines
734-765), inside `if (RECORD_REFUSALS_OFF)` (line 743), the settings sentence `REFUSAL_SETTINGS` (lines 179-181) is
returned when `isLedgerWrite` (`src/hooks/PreToolUse.Bash.js` lines 340-422) finds the command writing either of:
- `.ctoc/settings.yaml` (`SETTINGS_SPEC`, lines 188-192);
- a profile under `.ctoc/regulatory-regimes/` (`REGIMES_SPEC`, lines 193-197).

The editing tools are refused by `isRegimeFile` (lines 206-210). In the dependency the same branch sits at lines 923-938,
and it also runs the background agent's settings-file check (lines 926-936).

**Three commands get past it** (the CTO Chief's run of the loaded hook on 2026-10-18):

| Command | Why it passes today |
|---|---|
| `git status & rm .ctoc/settings.yaml` | `isLedgerWrite` cuts at a line break, `;`, `&&`, `\|\|` and `\|` (line 341), never at a single `&`. The one part starts with `git status`, which the read test calls a read (lines 494-495). |
| `cat .ctoc/settings.yaml & git checkout -- .ctoc/settings.yaml` | One part again. It starts with `cat` (the read list, line 496), and the write list (line 497) holds no `git`. |
| `find .ctoc/settings.yaml -delete` | `find` is on the read list, and `-delete` is on neither list. |

**The cut reads the command as plain text.** Found by the critique of 2026-10-19 and re-traced for this revision by reading
the code; not run:

| Command | Why it passes today |
|---|---|
| `tee ";cat" .ctoc/settings.yaml < /tmp/x` (also `\|` or a line break inside the quotes) | The split cuts inside the quotes. The second part starts with `cat` and holds no `>`, so it is a read; the shell runs one `tee` that overwrites the file. |
| `tee \;cat .ctoc/settings.yaml < /tmp/x` | The same, with an escaped `;`. |
| `tee $'\';cat' .ctoc/settings.yaml < /tmp/x` | The same, inside `$'…'`. |
| `cd /tmp & echo x > src/settings-link.yaml` (a link to the file) | One part that starts with `cd`. The `cd` branch (lines 346-395) takes `/tmp` as the folder and `continue`s, so the rest is never read. The shell runs the `cd` in the background and writes through the link from where it stands. |
| `cd .ctoc && > settings.yaml` | The operand list drops a part's first word (line 405, `tokens.slice(1)`), which here is the redirect's target, and the part never names `.ctoc/settings.yaml`. |

Revision 3's fix, a single `&` added to the same plain-text split, would also have turned refused commands into allowed
ones:
- `tee "&cat" .ctoc/settings.yaml < /tmp/x` and `tee \&cat …`: the cut falls inside the quotes, or at the escaped `&`;
- through a link `L` to `.ctoc` at the project root, `true & cd .. & echo x > L/settings.yaml`: the `cd` part would move
  the folder;
- `cat .ctoc/settings.yaml &> L/settings.yaml`: the `&` of `&>` would cut the redirect off its `cat`.

Revision 4 keeps all four refused and tests them (S25-3).

**`.ctoc/settings.json`.** In the main checkout it is not protected at all: `REGIME_SEGMENT_RE` (line 184) and
`REGIME_TARGETS` (line 186) name `settings.yaml` only, and no shell spec names `settings.json`. The agent-settings plan
protects it for background agents only, with its own sentence. That is the dependency's `REFUSAL_AGENT_SETTINGS`
(lines 210-212), `AGENT_SETTINGS_PATH_RE` (line 217) and `decide` (line 986). The main session stays free by design: its
`docs/ENFORCEMENT.md` lists "the main session changing a settings file" as not caught. Yet the file holds:
- `general.entry_point`, the command the check run executes (`ENTRY_POINT_KEY`, `src/lib/app-runner.js` line 120, read
  raw by `readDeclaredEntryPoint`, lines 147-151);
- `git.autoPushEnabled`, the one push switch (`isAutoPushEnabled`, `src/lib/settings.js` lines 308-310).

**Who tells anyone to write `.ctoc/settings.json`.** Two searches, each match read:
- `\.ctoc/settings\.json` over `agents/`, `skills/`, `src/commands/*.md`, `hooks/` and `.ctoc/templates/`: 3 files.
  - `src/commands/push.md` line 211 shows the push switch in a sample.
  - `agents/quality/quality-gate.md` line 20 says the agent never changes that switch.
  - `agents/infrastructure/deployment-setup.md` line 490 tells the agent to put its `deployment` block there with `Edit`.
- `entry_point` over `src/`: `src/lib/app-runner.js` only. Its two messages tell the reader to set or fix the key in the
  file: `NO_DECLARATION_SUFFIX`, lines 123-126, used at lines 386 and 408; and the malformed reason, lines 158-159.
  `docs/ENFORCEMENT.md` lines 40-63 say the same.

The menu writes the file in its own process, which passes no tool hook (`src/lib/settings.js`). Protecting the file
therefore changes two documented routes: the deployment agent's and the entry point's.

**The deployment agent's dry run.** Its "Post-Setup Verification" (`agents/infrastructure/deployment-setup.md` lines
536-544) runs, "after saving configuration", a dry run "to validate the full pipeline" (line 543). The dry run reads the
file: `getDeploymentConfig` reads `.ctoc/settings.json`'s `deployment` key (`src/lib/deployment.js` lines 58-71). After a
hand-over, the dry run would check what the file held before and report it as the new setup.

**The two false refusals of revision 3.** The dependency fixes both on macOS. The walk asks the file system one name at a
time and stops at the first missing one, so the long `--touches` word never reaches `lstat` whole (its hook case 156).
One name over 255 UTF-16 units counts as absent (its unit case 22).

One case stays. A disk that counts bytes (ext4, XFS, Btrfs on Linux) answers "name too long" for a quoted stretch of 255
or fewer UTF-16 units and over 255 bytes; an em dash is one unit and three bytes. The dependency counts that answer as a
fault (its `real-path-confinement.js` line 186 and its comment, "the safe side"). So on Linux a commit message whose
quoted stretch is rich in em dashes is still refused with the settings sentence. Read in the dependency's code; not run on
Linux.

## Technical approach

1. **Two readings of the cut** (`src/hooks/PreToolUse.Bash.js`). `isLedgerWrite` reads the command twice and refuses when
   either reading finds a write:
   - **today's cut**, unchanged: at every line break, `;`, `&&`, `||` and `|`, quotes or not;
   - **the shell's cut** (`shellParts`, new):
     - it cuts at a line break, `;`, `&&`, `||`, `|`, `|&` and a single `&`;
     - it never cuts inside single quotes, double quotes or `$'…'`, and never at a character a backslash escapes;
     - `&>`, `>&`, `<&` and `>|` are redirects, not cuts;
     - each part records whether a single `&` ended it, and whether a line break sits inside a quote in it.

   The loop that reads the parts (`partsWrite`, today's loop moved into its own function) changes in three places:
   - a `cd` or `pushd` part ended by a single `&` moves no folder, because the shell runs it in the background;
   - a part holding a line break inside a quote is never a read. A quote spanning lines is either a real multi-line
     argument or this reader's misreading of a here-document body or a comment. Either way, refusing is the safe side;
   - an output redirect that opens a part (`> f`, `>> f`, `2> f`, `&> f`) has its target read as an operand.

   Because today's cut is one of the two readings, every command refused today stays refused. The shell's reading adds
   refusals only. When the two readings give the same parts, the parts are read once.
2. **`find` given a writing option is no read** (`isReadOnlyLedgerCommand`). The options are `-delete`, `-fprint`,
   `-fprint0`, `-fprintf` and `-fls`. Quotes and backslashes are dropped first, as the shell drops them.

   It applies only to a part that already touches a settings file. So `find .ctoc/settings.yaml -delete` is refused, and
   `find .ctoc -name settings.yaml -delete` is not: no operand of it names or reaches the file (the owner's answer of
   2026-10-19, pinned by S25-9).
3. **`.ctoc/settings.json` joins the settings files,** with the same tests as `.ctoc/settings.yaml` and the same
   sentence:
   - its name joins `REGIME_SEGMENT_RE` and its path joins `REGIME_TARGETS`;
   - a shell spec of its own, `SETTINGS_JSON_SPEC`, because the link test takes one target per spec;
   - `bashRefuses` tests the three specs in both of its settings tests.

   The settings tests run before the agent-settings check, so a background agent now gets the settings sentence for this
   file too.
4. **On Linux, "name too long" on a name over 255 bytes in a short path counts as absent**
   (`src/lib/real-path-confinement.js`, inside the dependency's condition). The dependency counts one name over 255
   UTF-16 units as absent; that is the measured unit of APFS and the unit of NTFS. On Linux the usual file systems count
   bytes, and a whole path under 4,096 bytes cannot itself be too long. So an ENAMETOOLONG there for a name over 255 bytes
   can only be about the name, which no such disk can hold. Any other "name too long" stays a fault and refuses, Windows
   included: the safe side when in doubt.
5. **The deployment agent hands its block to the user and checks it is in the file** before any step that reads it.
6. **The last-mile messages tell the human to add or fix the entry point by hand,** because the file is protected. The
   deployment-route plan is to write `general.entry_point` too and then make these messages name its route.

**What it does not change.**
- `RECORD_REFUSALS_OFF` stays `true`, so the loaded hook does not test the record specs. The shared functions give them
  the same changes, which shows only in `PreToolUse.Bash.js`'s own `main()`, which no manifest registers, and in tests
  that call the functions directly.
- The settings sentence is unchanged.
- No module, export or `require` is added: `shellParts`, `partsWrite`, `nameCannotExist`, `LEADING_OUTPUT_REDIRECT_RE`,
  `SETTINGS_JSON_SPEC` and `SETTINGS_SPECS` are module-local.

**The deep-link case, stated as the owner asked.** Take a link planted where the whole path from the project root reaches
the system's path limit (1,024 bytes on macOS, 4,096 on Linux):
- the walk asks the file system and gets "name too long" for a name of 255 or fewer units, which is a fault;
- so a write through such a link is refused, not followed (the dependency's unit case 23);
- so is every honest write under such a deep folder. That is the cost: an over-refusal, not an open route.
- On Linux, a link whose own name is over 255 bytes in a short path cannot exist on a byte-counting disk. On a disk that
  counts units, the name is not too long, so the error never arises.

**What stays open after it** (each one line under "Findings for the owner to schedule", item 7):
- `find` from a folder above a settings file (`find .ctoc -name settings.yaml -delete`, and the `settings.json` form);
- `find` with `-exec`, `-execdir`, `-ok` or `-okdir` running a program off the write list;
- a command substitution that hides a git write behind a read
  (`cat .ctoc/settings.yaml $(git checkout -- .ctoc/settings.yaml)`);
- `git -C .ctoc rm -- settings.yaml`;
- a `cd` that does not start its part (`if cd .ctoc; then rm settings.yaml; fi`);
- a launcher before a git write (`env git -C …`);
- a path built at run time (`.ctoc/settings${UNSET}.json`, a glob, a script file). The spelling plan takes the backslash,
  `$'…'` and brace forms;
- a shell that does not read `$'…'` (dash, POSIX `sh`), which can cut where neither reading does.

## Implementation Details

### Dependency Graph

```
hooks/hooks.json (PreToolUse; Write|Edit|MultiEdit|NotebookEdit|Bash) --runs--> src/hooks/protect-records.js#main --> #decide
#decide --editing tool--> #isRegimeFile --> REGIME_SEGMENT_RE (+ settings.json) | real-path-confinement#resolvesUnder over REGIME_TARGETS (+ .ctoc/settings.json) --> REFUSAL_SETTINGS
#decide --Bash--> #bashRefuses --RECORD_REFUSALS_OFF branch--> SETTINGS_SPECS (SETTINGS_SPEC, SETTINGS_JSON_SPEC new, REGIMES_SPEC), then the dependency's agent settings-file specs
  --each--> src/hooks/PreToolUse.Bash.js#isLedgerWrite (two readings)
     --today's split-----------> #partsWrite (new home of the old loop)
     --#shellParts (new)-------> #partsWrite
        --a cd part ended by a single &--> no folder change
        --a touching part--> #isReadOnlyLedgerCommand (a part with a quoted line break is no read; `find` given a writing option is no read)
        --operands (an opening output redirect's target included)--> #operandResolvesIntoLedger --> real-path-confinement#resolvesUnder --> #resolveExisting --> #nameCannotExist (new)
src/lib/step-13-verify.js#driveAppSync (line 67) --> src/lib/app-runner.js (NO_DECLARATION_SUFFIX, the malformed reason)
agents/infrastructure/deployment-setup.md --read by--> the deployment-setup agent when CTO Chief dispatches it
tests/protect-records.test.js --spawns--> src/hooks/protect-records.js (main session and background agent payloads)
tests/a-link-cannot-leave-the-repository.test.js --requires--> src/lib/real-path-confinement.js, src/hooks/PreToolUse.Bash.js
tests/last-mile-drives-entry-point.test.js --requires--> src/lib/app-runner.js
tests/agent-tool-grants.test.js --reads--> agents/infrastructure/deployment-setup.md (its pinned body sentences)
docs/ENFORCEMENT.md --describes--> the rule
```

No cycle: `PreToolUse.Bash.js` requires nothing from `protect-records.js`, and `real-path-confinement.js` requires only
`path` and `./safe-fs`.

### File Specifications

Every change is found by its text: after the dependency lands, line numbers move, and Step 9 records where each anchor
stands. "Main" line numbers are those of 2026-10-19; "the dependency's" are those of its worktree.

#### File: `src/hooks/PreToolUse.Bash.js`
**Action:** MODIFY
**Purpose:** the command is read twice, once cut as today and once as the shell cuts it. A background `cd` moves no folder.
An opening output redirect's target is an operand. `find` given a writing option is no read.
**Change Type:** modify-existing

##### Changes
1. **A new constant,** directly after `const OPERAND_RESOLUTION_CAP = 128;`:

```js
/**
 * An output redirect that opens a segment (`> f cmd`, `>> f`, `2> f`, `&> f`): its target is the
 * segment's first word, so it is an operand, never the program (four-defects slice 25:
 * `cd .ctoc && > settings.yaml` truncated the file unread).
 */
const LEADING_OUTPUT_REDIRECT_RE = /^(?:\d*>|&>)/;
```

2. **A new function `shellParts`,** directly before `isLedgerWrite`'s doc comment:

```js
/**
 * The command cut into parts the way bash and zsh cut it (four-defects slice 25): at a line break,
 * `;`, `&&`, `||`, `|`, `|&` and a single `&`, never inside single quotes, double quotes or `$'…'`,
 * and never at a character a backslash escapes. `&>`, `>&`, `<&` and `>|` are redirects, not cuts.
 * Each part says whether a single `&` ended it (the shell runs it in the background, so a `cd` there
 * moves no folder for what follows) and whether it may be read as a read: not when a line break sits
 * inside a quote in it, which is either a real multi-line argument or this reader's misreading of a
 * here-document body or a comment (both are read as plain text here). `isLedgerWrite` runs today's
 * cut beside this one, so a misreading can only add a refusal. Linear in the text.
 * @param {string} command
 * @returns {Array<{text: string, background: boolean, mayRead: boolean}>}
 */
function shellParts(command) {
  const s = String(command);
  const parts = [];
  let start = 0;
  let quote = '';     // '' outside quotes, else "'", '"' or "$'"
  let escaped = -1;   // the index of the last character a backslash escaped
  let broken = false; // a line break inside a quote in the current part
  const cut = (end, next, background) => {
    parts.push({ text: s.slice(start, end), background, mayRead: !broken });
    start = next;
    broken = false;
  };
  /** Is the character at `j` an unescaped `ch`? */
  const is = (j, ch) => s[j] === ch && escaped !== j;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote === "'") {
      if (c === "'") quote = ''; else if (c === '\n') broken = true;
      continue;
    }
    if (c === '\\') { escaped = i + 1; i += 1; continue; } // outside quotes, in "…" and in $'…'
    if (quote !== '') {
      if (c === (quote === '"' ? '"' : "'")) quote = ''; else if (c === '\n') broken = true;
      continue;
    }
    if (c === '"') quote = '"';
    else if (c === "'") quote = is(i - 1, '$') ? "$'" : "'";
    else if (c === '\n' || c === ';') cut(i, i + 1, false);
    else if (c === '|') {
      if (is(i - 1, '>')) continue;                      // `>|`: a redirect
      const pair = s[i + 1] === '|' || s[i + 1] === '&'; // `||`, and `|&`: a pipe
      cut(i, i + (pair ? 2 : 1), false);
      if (pair) i += 1;
    } else if (c === '&') {
      if (s[i + 1] === '&') { cut(i, i + 2, false); i += 1; }
      else if (s[i + 1] !== '>' && !is(i - 1, '>') && !is(i - 1, '<')) cut(i, i + 1, true); // not `&>`, `>&`, `<&`
    }
  }
  parts.push({ text: s.slice(start), background: false, mayRead: !broken });
  return parts;
}
```

3. **`isLedgerWrite` becomes two readings.** Its body moves into a new function `partsWrite(parts, spec)`, placed directly
   after it. Its own body becomes:

```js
function isLedgerWrite(command, spec = LEDGER_SPEC) {
  const quoteBlind = String(command).split(/[\n;]|&&|\|\||\|/)
    .map((text) => ({ text, background: false, mayRead: true }));
  const shell = shellParts(command);
  // Today's cut is kept as a reading of its own: either reading refusing refuses, so no command
  // refused before four-defects slice 25 is allowed now. The same parts are read once.
  const same = shell.length === quoteBlind.length
    && shell.every((p, i) => p.text === quoteBlind[i].text && !p.background && p.mayRead);
  return partsWrite(quoteBlind, spec) || (!same && partsWrite(shell, spec));
}
```

   `partsWrite` gets this doc comment:

```js
/**
 * The per-segment test of `isLedgerWrite` over one reading's parts, tracking the cwd across
 * `cd`/`pushd`. A `cd` part the shell runs in the background moves no folder; a part that may not be
 * read as a read (`shellParts`) is a write when it touches the folder.
 * @param {Array<{text: string, background: boolean, mayRead: boolean}>} parts
 * @param {{dir?: string, segmentRe: RegExp, resolvedRe: RegExp}} spec
 * @returns {boolean}
 */
```

   Its body is today's loop, from `let prefix = '';` (and the dependency's `let rawPrefix = '';`) to `return false;`,
   with four edits:
   - `for (const rawSeg of segments) {` becomes `for (const part of parts) {`, and in
     `const seg = rawSeg.replace(/^[\s({]+/, '').trim();`, `rawSeg` becomes `part.text`;
   - the first line inside `if (cdKw) {` becomes
     `if (part.background) continue; // run in the background, the cd moves no folder for what follows`;
   - in the operand list, the `.slice(1)` that drops a segment's first word becomes
     `.slice(LEADING_OUTPUT_REDIRECT_RE.test(r) ? 0 : 1)`. The reading it is applied to is `r` in the dependency's
     `operandsOf`; on main it is `tokens.slice(1)` over `seg`, and there it becomes
     `tokens.slice(LEADING_OUTPUT_REDIRECT_RE.test(seg) ? 0 : 1)`;
   - `if (touches && !isReadOnlyLedgerCommand(seg)) return true;` becomes
     `if (touches && !(part.mayRead && isReadOnlyLedgerCommand(seg))) return true;`.

   The dependency's budget check at the top of the loop stays where it is.
4. **`isLedgerWrite`'s doc comment:** the line " * Evaluated PER shell segment, tracking the cwd across `cd`/`pushd`:"
   becomes:

```js
 * Read TWICE (four-defects slice 25): cut as before, at every line break, `;`, `&&`, `||` and `|`
 * whatever the quotes, and cut as the shell cuts it (`shellParts`: also at a single `&`, never inside
 * quotes or at an escaped character). Either reading refusing refuses, so nothing refused before is
 * allowed now. Each reading is evaluated PER shell segment, tracking the cwd across `cd`/`pushd`
 * (`partsWrite`); a `cd` the shell runs in the background moves nothing:
```

5. **`isReadOnlyLedgerCommand`:** between the git-read test (main lines 494-495) and `const READ_CMD = …` (line 496),
   insert:

```js
  // four-defects slice 25: `find` given an option that deletes or writes a file is no read. Quotes and
  // backslashes are dropped first, as the shell drops them (`find x '-delete'`, `find x -de\lete`).
  if (/^\s*find\b/i.test(command)
    && /(^|\s)-(delete|fprint0?|fprintf|fls)(\s|$)/i.test(command.replace(/['"\\]/g, ''))) return false;
```

6. **`isReadOnlyLedgerCommand`'s doc comment:** after "`checkout`, `restore`, `stash`, `reset` and every other
   subcommand naming the folder stay refused.", add the line
   " * `find` given `-delete`, `-fprint`, `-fprint0`, `-fprintf` or `-fls` is no read (four-defects slice 25)."

Nothing else in the file changes.

##### Error Handling
No new throw. `shellParts` indexes a string and compares characters. `partsWrite` throws only what today's loop throws:
none. A throw out of `isLedgerWrite` still reaches `protect-records.js`'s fail rule, unchanged.

##### Cross-Platform Notes
`shellParts` reads command text only. It follows bash and zsh; a Windows Bash tool runs Git Bash, which is bash.

#### File: `src/lib/real-path-confinement.js`
**Action:** MODIFY (after the dependency lands; its line numbers)
**Purpose:** on Linux, "name too long" for a name over 255 bytes in a path under 4,096 bytes counts as absent.
**Change Type:** modify-existing

##### Changes
1. **A new module-local function,** directly before `resolveExisting`'s doc comment:

```js
/**
 * Can a name the file system answered "name too long" for not exist at all (four-defects slice 25)?
 * Yes when it is over 255 UTF-16 units: no disk holds that (APFS and NTFS count units, measured on
 * APFS; a byte-counting disk never counts fewer bytes than units). On Linux also when it is over 255
 * bytes and the whole path is under Linux's path limit (4,096 bytes with the closing NUL): the answer
 * can then only be about the name, which a byte-counting disk (ext4, XFS, Btrfs) cannot hold, and a
 * disk that counts units would not have refused it. Anywhere else the answer may be about the whole
 * path, so it stays a fault (the safe side). Reads `process.platform` at call time.
 * @param {string} seg - the name
 * @param {string} next - the whole path that was asked
 * @returns {boolean}
 */
function nameCannotExist(seg, next) {
  if (seg.length > 255) return true;
  return process.platform === 'linux' && Buffer.byteLength(seg) > 255 && Buffer.byteLength(next) < 4096;
}
```

2. **In `resolveExisting`'s `lstat` catch** (the dependency's line 186):
   `if (code === 'ENOENT' || (code === 'ENAMETOOLONG' && !linked && seg.length > 255)) {` becomes
   `if (code === 'ENOENT' || (code === 'ENAMETOOLONG' && !linked && nameCannotExist(seg, next))) {`.

   The comment above it (the dependency's lines 178-185, from "ONE name over the file system's limit of 255 cannot exist"
   to "(On a disk that counts bytes, a name of 255 or fewer units but over 255 bytes is refused: the safe side.)")
   becomes:

```js
        // ONE name that cannot exist cannot be written either: out of the caller's text it is a name still to
        // be made, like ENOENT (`nameCannotExist`: over 255 UTF-16 units anywhere; on Linux also over 255
        // bytes in a path under 4,096 bytes, four-defects slice 25). Any other ENAMETOOLONG is a fault
        // (below): macOS gives it for a WHOLE path of 1,024 bytes or more, and such an object exists, reached
        // by `cd` into a deep folder. Out of a link's contents too.
```

Nothing else in the file changes.

##### Error Handling
No new throw: `length`, `Buffer.byteLength` and a comparison.

#### File: `src/hooks/protect-records.js`
**Action:** MODIFY
**Purpose:** `.ctoc/settings.json` is protected like `.ctoc/settings.yaml`, for the editing tools and the shell, for every
session.
**Change Type:** modify-existing

##### Changes
1. **The header's settings bullet** (main lines 16-18): the three lines from " *   - the project's settings file
   `.ctoc/settings.yaml` and its regulatory profiles," to " *     regime they declare decides whether a plan may move on
   by itself. Same tests as the" become:

```js
 *   - the project's settings files `.ctoc/settings.yaml` and `.ctoc/settings.json` and its
 *     regulatory profiles, everything under `.ctoc/regulatory-regimes/` (owner's answers "a",
 *     2026-10-08, and of 2026-10-18): the regime they declare decides whether a plan may move
 *     on by itself, and `.ctoc/settings.json` holds `general.entry_point`, the command the check
 *     run executes, and the push switch. Since the owner's removal of 2026-10-15 this is the
 *     one shell refusal that runs for every session (`RECORD_REFUSALS_OFF`). Same tests as the
```

2. **`REGIME_SEGMENT_RE` and `REGIME_TARGETS`** (main lines 183-186) become:

```js
/** The two settings files or the profile folder as a path segment anywhere in an absolute path. */
const REGIME_SEGMENT_RE = /(^|\/)\.ctoc\/+(settings\.(?:yaml|json)|regulatory-regimes)(\/|$)/i;
/** The same three, relative to the project root, for the real-path (symbolic link) test. */
const REGIME_TARGETS = Object.freeze(['.ctoc/settings.yaml', '.ctoc/settings.json', '.ctoc/regulatory-regimes']);
```

3. **After `REGIMES_SPEC`** (main line 197), insert:

```js
/**
 * `.ctoc/settings.json` for the shell (four-defects slice 25, the owner's answer of 2026-10-18):
 * its `general.entry_point` is the command the check run executes (`src/lib/app-runner.js`).
 * A spec of its own, because the real-path test takes one target per spec.
 */
const SETTINGS_JSON_SPEC = Object.freeze({
  dir: '.ctoc/settings.json',
  segmentRe: /(^|[^a-z0-9._-])\.ctoc\/+settings\.json([^a-z0-9._-]|$)/i,
  resolvedRe: /(^|\/)\.ctoc\/+settings\.json$/i,
});
/** Every spec the settings refusal tests, in the order it tests them. */
const SETTINGS_SPECS = Object.freeze([SETTINGS_SPEC, SETTINGS_JSON_SPEC, REGIMES_SPEC]);
```

4. **`isRegimeFile`'s doc comment:** "Is an editing tool's absolute target the settings file or inside the profile
   folder" becomes "Is an editing tool's absolute target one of the two settings files or inside the profile folder".
5. **`bashRefuses`, the settings test inside `if (RECORD_REFUSALS_OFF)`:** the expression
   `bash.isLedgerWrite(cwdCommand, SETTINGS_SPEC) || bash.isLedgerWrite(cwdCommand, REGIMES_SPEC)` becomes
   `SETTINGS_SPECS.some((spec) => bash.isLedgerWrite(cwdCommand, spec))`. It stays in whatever statement holds it:
   `return … ? REFUSAL_SETTINGS : null;` on main, `if (…) return REFUSAL_SETTINGS;` in the dependency.
6. **`bashRefuses`'s last settings test:** the expression
   `bash.isLedgerWrite(analysed, SETTINGS_SPEC) || bash.isLedgerWrite(analysed, REGIMES_SPEC)` becomes
   `SETTINGS_SPECS.some((spec) => bash.isLedgerWrite(analysed, spec))`.

`RECORD_REFUSALS_OFF`, `REFUSAL_SETTINGS`, `decide`, the agent-settings check and every other line stay as they are.

##### Error Handling
No new throw. A crash still reaches `main`'s fail rule, unchanged.

#### File: `src/lib/app-runner.js`
**Action:** MODIFY
**Purpose:** the last-mile messages tell the reader the file is protected and that the human adds or fixes the entry point
by hand.
**Change Type:** modify-existing

##### Changes
1. **`NO_DECLARATION_SUFFIX`** (main lines 123-126) becomes:

```js
const NO_DECLARATION_SUFFIX =
  `No entry point was declared either: the human sets \`${ENTRY_POINT_KEY}.command\` (with an optional ` +
  '`expect` substring) in .ctoc/settings.json by hand, because CTOC\'s write protection refuses every ' +
  'tool\'s write to that file, to have the last mile run this project\'s real entry point instead of ' +
  'reporting nothing to launch.';
```

2. **The malformed reason** (main lines 158-159) becomes:

```js
    reason: `A malformed \`${ENTRY_POINT_KEY}\` declaration was found in .ctoc/settings.json: ${detail}. ` +
      'Nothing was launched. The human fixes the declaration in that file by hand, because CTOC\'s write ' +
      'protection refuses every tool\'s write to it, so the last mile can drive this project\'s entry point.'
```

The existing assertions still hold: "No entry point was declared" (`tests/last-mile-drives-entry-point.test.js` line
295), `entry_point` (lines 297, 313, 316, 598, 599), and `general.entry_point` (`tests/app-runner-coverage-holes.test.js`
line 144). The deployment-route plan changes both sentences to name its route once it exists.

#### File: `agents/infrastructure/deployment-setup.md`
**Action:** MODIFY
**Purpose:** the agent hands its `deployment` block to the user, and its post-setup steps run only once the file holds that
block.
**Change Type:** modify-existing

##### Changes
1. **Line 490**, the paragraph under "## Configuration Output", from "Put the deployment config into
   `.ctoc/settings.json`" to "then set `dry_run: false`.", becomes the text below. The rest of the line, from " Do NOT
   write any standing" to the end of the example shape, stays as it is.

```markdown
The deployment config belongs in `.ctoc/settings.json` under the `deployment` key — the file `src/lib/deployment.js` actually reads (the documented, executed config home) — but you do not write that file: CTOC's write protection refuses every agent's write to it, with any tool, because it also holds the command CTOC's check run executes (`general.entry_point`) and the push switch. Saving, wherever this file says save, means handing the config to the user: show the whole `deployment` block as JSON in your report and tell the user to put it into `.ctoc/settings.json` themselves, replacing the value of the `deployment` key when one exists and adding it when none does, with every other key in the file left as it is. A dry run, wherever this file offers one, reads that file, so it waits until the first step of Post-Setup Verification has found your block there. Validate all fields before handing it over. Always include `dry_run`: leave it `true` (simulate — build commands, execute nothing) unless the user explicitly confirms they want real pushes/POSTs/ssh, then the block you hand over sets `dry_run: false`.
```

2. **"## Post-Setup Verification"** (lines 538-544): the list from "After saving configuration:" to "6. Show next steps and
   how to trigger a deployment" becomes:

```markdown
After handing the configuration over (Configuration Output):
1. Wait until the user says the block is in `.ctoc/settings.json`, then `Read` the file and check that its `deployment` key holds exactly the block you handed over. If the user has not put it in, or it differs, say what differs and run none of the steps below: they would check a configuration other than the one you handed over.
2. Validate the JSON block is well-formed
3. Check that referenced scripts exist (for script strategy)
4. Verify git branches can be created (for git-branch strategy)
5. Test webhook connectivity (for webhook strategy)
6. Dry-run deployment to validate the full pipeline
7. Show next steps and how to trigger a deployment
```

Nothing else in the file changes. The summary menu (lines 397-400) is left to the agent-questions plan, which rewrites the
file's menus (Neighbours). Its "[1] Save configuration" and "[3] Test deployment (dry run)" now read through the
paragraph above.

#### File: `tests/agent-tool-grants.test.js`
**Action:** MODIFY
**Purpose:** the pinned body sentences of deployment-setup follow its new text. The pin moves to the new text and is not
weakened: it pins three sentences where it pinned one.
**Change Type:** modify-existing

##### Changes
1. **Line 634**, the comment's last sentence, "deployment-setup's settings write stays inside one key." becomes
   "deployment-setup writes no settings file: it hands its one key to the user and checks the file holds it before its
   dry run (four-defects slice 25)."
2. **Line 640**, the pinned sentence
   `'change only the \`deployment\` key — replace its value when it exists, add it when it does not — and never rewrite the whole file with \`Write\`',`
   becomes the three lines:

```js
    'you do not write that file: CTOC\'s write protection refuses every agent\'s write to it, with any tool',
    'replacing the value of the `deployment` key when one exists and adding it when none does, with every other key in the file left as it is',
    'Wait until the user says the block is in `.ctoc/settings.json`, then `Read` the file and check that its `deployment` key holds exactly the block you handed over',
```

#### File: `tests/last-mile-drives-entry-point.test.js`
**Action:** MODIFY
**Purpose:** the two reasons say the human edits the protected file by hand.
**Change Type:** modify-existing

##### Changes
After case "6b" (the `it('6b: the native/registry not-applicable reason ALSO names the absent declaration', …)` block),
insert:

```js
  it('6c: both reasons say the human adds the entry point by hand, because the file is protected (four-defects slice 25)', async () => {
    const none = makeProject('ctoc-ep-hand-');
    libraryPkg(none);
    declare(none, undefined);
    const res = await driveApp(none);
    const bad = makeProject('ctoc-ep-hand-bad-');
    declare(bad, {}); // declared, but no command: malformed
    const read = appRunner.readDeclaredEntryPoint(bad);
    for (const [what, reason] of [['the not-applicable reason', res.evidence.reason], ['the malformed reason', read.reason]]) {
      assert.ok(/by hand/.test(reason), `${what} must say the human edits the file by hand; got: ${reason}`);
      assert.ok(/write protection/.test(reason), `${what} must say why, CTOC's write protection; got: ${reason}`);
    }
  });
```

It uses the file's own `makeProject`, `libraryPkg`, `declare`, `driveApp` and `appRunner`, and the file's own clean-up of
the projects it makes (Step 9 confirms how the file cleans up and follows it).

#### File: `tests/a-link-cannot-leave-the-repository.test.js`
**Action:** MODIFY (the dependency's cases)
**Purpose:** the Linux byte rule, shown on any machine with the file system's answer injected. Two of the dependency's rows
expect "allowed" on Linux too.
**Change Type:** modify-existing

##### Changes
1. **The dependency's unit case 22**, row 'a name of 100 non-Latin characters (300 bytes) is a name still to be made where
   the disk allows it':
   - its expected value `process.platform !== 'darwin'` becomes
     `process.platform !== 'darwin' && process.platform !== 'linux'`;
   - its two comment lines become "Absent on macOS (its disk counts UTF-16 units: 100 is under 255) and on Linux (over
     255 bytes in a short path, four-defects slice 25); elsewhere a 'name too long' on it is a fault, refused."
2. **The dependency's unit case 23**, row 'echo of a quoted name of 100 non-Latin characters': the same change to its
   expected value and its comment line.
3. **A new case** after the dependency's last case:

```js
  it('case S25-L: on Linux, "name too long" for a name over 255 bytes in a short path is a name still to be made (four-defects slice 25)', (t) => {
    const safeFs = require('../src/lib/safe-fs');
    const { dir, root } = makeRealProject();
    const R = makeRows();
    const platform = Object.getOwnPropertyDescriptor(process, 'platform');
    const asPlatform = (name) => Object.defineProperty(process, 'platform', { ...platform, value: name });
    const realLstat = safeFs.lstatSync;
    const wide = 'あ'.repeat(100);   // 100 UTF-16 units, 300 UTF-8 bytes
    const narrow = 'あ'.repeat(80);  // 80 units, 240 bytes: every disk holds it
    const deep = Array.from({ length: 20 }, (_, k) => `${k}${'d'.repeat(199)}`); // 4,000 bytes of folders
    const fakeFolder = { isSymbolicLink: () => false, isDirectory: () => true, isFile: () => false };
    /** lstat as the disk would answer: the named leaf is too long; the deep folders exist. */
    const answer = (leaf) => (p) => {
      if (path.basename(p) === leaf) throw Object.assign(new Error('name too long'), { code: 'ENAMETOOLONG' });
      if (deep.some((d) => p.endsWith(`${path.sep}${d}`))) return fakeFolder;
      return realLstat(p);
    };
    const tail = (leaf) => confinement.resolveExisting(path.join(root, leaf));
    try {
      assert.ok(Buffer.byteLength(path.join(root, ...deep, wide)) >= 4096, 'fixture: the deep path reaches 4,096 bytes');
      asPlatform('linux');
      t.mock.method(safeFs, 'lstatSync', answer(wide));
      R.row('a 300-byte name of 100 units in a short path is in the tail', () => assert.deepEqual(
        tail(wide), { ok: true, real: path.join(root, wide), reason: null, tail: [wide] }));
      R.row('control: the same name below 4,000 bytes of folders is a fault (the answer may be about the whole path)',
        () => assert.equal(confinement.resolveExisting(path.join(root, ...deep, wide)).ok, false));
      t.mock.restoreAll();
      t.mock.method(safeFs, 'lstatSync', answer(narrow));
      R.row('control: a 240-byte name the disk calls too long is a fault', () => assert.equal(tail(narrow).ok, false));
      t.mock.restoreAll();
      asPlatform('darwin');
      t.mock.method(safeFs, 'lstatSync', answer(wide));
      R.row('control: on macOS the same answer is a fault (its disk counts units)', () => assert.equal(tail(wide).ok, false));
    } finally {
      t.mock.restoreAll();
      Object.defineProperty(process, 'platform', platform);
      rm(dir);
    }
    R.done();
  });
```

The fake folders exist only in the injected answer. Step 9 confirms which `Stats` methods the dependency's walk calls on
an existing folder, and `fakeFolder` carries exactly those. The label "S25-L" is new; Step 8 stops if it is taken.

#### File: `tests/protect-records.test.js`
**Action:** MODIFY
**Purpose:** the closes, the guards, the new file, the kept switch-off, the false refusals and the open `find` form, each
through the real hook. The dependency's rows that this change tightens follow it.
**Change Type:** modify-existing

##### Changes
1. **Append**, after the file's last `describe` as it then stands, the block below. It reuses the file's `run` (with the
   dependency's `env` option), `bash`, `payload`, `write`, `p`, `project`, `assertRefused`, `assertAllowed`, `assert`,
   `fs`, `path` and `os`.

```js
// ═══════════════════════════════════════════════════════════════════════════
// four-defects slice 25, revision 4 (the owner's answers of 2026-10-18 and 2026-10-19). The settings
// refusal, the one shell refusal his removal of 2026-10-15 kept, reads a command twice: cut as before
// and cut the way bash and zsh cut it; either refusing refuses. `find` given an option that deletes or
// writes is no read; `.ctoc/settings.json` is protected for every session; the record refusals stay off.
// ═══════════════════════════════════════════════════════════════════════════
describe('the settings refusal reads a command as the shell cuts it and also guards settings.json (four-defects slice 25)', () => {
  const REFUSAL_SETTINGS = "CTOC refused this call because it writes, or could write, the project's settings "
    + "file or its regulatory profiles, which only CTOC's menu writes; tell the human what you wanted to "
    + 'change and let the menu change it.';
  const REFUSAL_AGENT_SETTINGS = "CTOC refused this call because a background agent may not change Claude Code's "
    + "settings files or CTOC's .ctoc/settings.json, which decide the hooks, environment and permissions every "
    + 'later call runs with; report what you wanted to change and let the main session make the change.';
  const agentPayload = (input) => ({ ...input, agent_id: 'a1b2c3', agent_type: 'iron-loop-executor' });
  const refusedBoth = (call, what) => {
    assertRefused(run(call), what, REFUSAL_SETTINGS);
    assertRefused(run(agentPayload(call)), `${what} (background agent)`, REFUSAL_SETTINGS);
  };
  const allowedBoth = (call, what) => {
    assertAllowed(run(call), what);
    assertAllowed(run(agentPayload(call)), `${what} (background agent)`);
  };
  const seed = () => {
    fs.mkdirSync(p('.ctoc', 'regulatory-regimes'), { recursive: true });
    fs.writeFileSync(p('.ctoc', 'settings.yaml'), 'x: 1\n');
    fs.writeFileSync(p('.ctoc', 'settings.json'), '{"general":{}}\n');
    fs.writeFileSync(p('.ctoc', 'regulatory-regimes', 'gdpr.yaml'), 'x: 1\n');
    fs.symlinkSync(p('.ctoc', 'settings.yaml'), p('src', 'settings-link.yaml'));
    fs.symlinkSync(p('.ctoc'), p('L'), 'junction'); // `L/settings.yaml` is the settings file
  };
  /** Comma-joined relative paths, exactly `bytes` long; every path part stays far under 255. */
  const touchesList = (bytes) => {
    let list = 'src/lib/m.js';
    while (list.length + ',src/lib/m.js'.length <= bytes) list += ',src/lib/m.js';
    return list + 'x'.repeat(bytes - list.length);
  };
  const PROSE = 'the settings refusal closes a gap '.repeat(10); // 340 characters, no slash, no apostrophe
  const DASHES = 'a — '.repeat(55); // 220 UTF-16 units, 330 UTF-8 bytes: an em dash is one unit and three bytes

  test('S25-1 · the three commands run past the settings refusal on 2026-10-18 are refused', () => {
    seed();
    for (const c of ['git status & rm .ctoc/settings.yaml',
      'cat .ctoc/settings.yaml & git checkout -- .ctoc/settings.yaml',
      'find .ctoc/settings.yaml -delete']) refusedBoth(bash(c), c);
  });

  test('S25-2 · what the plain-text cut let through is refused: every settings file, quoted and escaped separators, a background cd, an opening redirect, find writer options', () => {
    seed();
    for (const c of [
      'git status & rm .ctoc/regulatory-regimes/gdpr.yaml',
      'cat .ctoc/regulatory-regimes/gdpr.yaml & git checkout -- .ctoc/regulatory-regimes/gdpr.yaml',
      'find .ctoc/regulatory-regimes -name gdpr.yaml -delete',
      'git status & rm .ctoc/settings.json',
      'cat .ctoc/settings.json & git checkout -- .ctoc/settings.json',
      'find .ctoc/settings.json -delete',
      "find .ctoc/settings.yaml '-delete'",
      'find .ctoc/settings.yaml -de\\lete',
      'find . -fprint .ctoc/settings.yaml',
      'cd . & rm .ctoc/settings.yaml',
      'tee ";cat" .ctoc/settings.yaml < /tmp/x',
      'tee "a|cat" .ctoc/settings.yaml < /tmp/x',
      'tee "a\ncat" .ctoc/settings.yaml < /tmp/x',
      'tee \\;cat .ctoc/settings.yaml < /tmp/x',
      "tee $'\\';cat' .ctoc/settings.yaml < /tmp/x",
      'cd /tmp & echo x > src/settings-link.yaml',
      'cd .ctoc && > settings.yaml',
      'true; > src/settings-link.yaml',
      "cat > m.txt <<'EOF'\ncat's\nEOF\ncat x & git checkout -- .ctoc/settings.yaml",
    ]) refusedBoth(bash(c), c);
  });

  test('S25-3 · refused before this change and after it: what a plain-text or background-blind cut would open, and the earlier closes', () => {
    seed();
    for (const c of [
      'tee "&cat" .ctoc/settings.yaml < /tmp/x',
      'tee \\&cat .ctoc/settings.yaml < /tmp/x',
      'true & cd .. & echo x > L/settings.yaml',
      'cat .ctoc/settings.yaml &> L/settings.yaml',
      'cat .ctoc/settings.yaml &> /dev/null',
      // A shell that does not read $'…' (dash) cuts at the `;`: today's cut still refuses it.
      "cat .ctoc/settings.yaml $'\\';git checkout -- .ctoc/settings.yaml #'",
      'rm .ctoc/settings.yaml', 'echo $(rm .ctoc/settings.yaml)',
      'rm .ctoc/regulatory-regimes/gdpr.yaml', 'echo $(rm .ctoc/regulatory-regimes/gdpr.yaml)',
    ]) refusedBoth(bash(c), c);
  });

  test('S25-4 · .ctoc/settings.json is protected for the editing tools and the shell, for every session', () => {
    seed();
    fs.symlinkSync(p('.ctoc', 'settings.json'), p('src', 'settings-link.json'));
    fs.linkSync(p('.ctoc', 'settings.json'), p('src', 'settings-hard.json'));
    const calls = {
      'Write of .ctoc/settings.json': write(p('.ctoc', 'settings.json')),
      'Edit of .ctoc/settings.json': payload('Edit', { file_path: p('.ctoc', 'settings.json'), old_string: '{}', new_string: '{"entry_point":{}}' }),
      'MultiEdit of a relative .ctoc/settings.json': payload('MultiEdit', { file_path: '.ctoc/settings.json', edits: [{ old_string: 'a', new_string: 'b' }] }),
      'NotebookEdit of .ctoc/settings.json': payload('NotebookEdit', { notebook_path: p('.ctoc', 'settings.json'), new_source: 'x' }),
      'letter case .CTOC/Settings.JSON': write(p('.CTOC', 'Settings.JSON')),
      'Windows separators': write('.ctoc\\settings.json'),
      '`..` through src': write(`${project}/src/../.ctoc/settings.json`),
      'another copy, outside the project': write(path.join(os.tmpdir(), 'pr-elsewhere', '.ctoc', 'settings.json')),
      'a symbolic link to it': write(p('src', 'settings-link.json')),
      'a hard link to it': write(p('src', 'settings-hard.json')),
    };
    for (const [what, call] of Object.entries(calls)) refusedBoth(call, what);
    for (const c of ['echo x >> .ctoc/settings.json', 'echo x &> .ctoc/settings.json', 'rm .ctoc/settings.json',
      'echo $(rm .ctoc/settings.json)', 'sed -i s/a/b/ .ctoc/settings.json', 'cd .ctoc && tee settings.json < /tmp/x',
      'echo x >> src/settings-link.json', 'echo x >> src/settings-hard.json']) refusedBoth(bash(c), c);
  });

  test('S25-5 · ordinary commands stay allowed, and nothing else named settings.json is caught', () => {
    seed();
    for (const c of ['git status', 'cat .ctoc/settings.yaml', 'cat .ctoc/settings.json',
      'grep -n entry_point .ctoc/settings.json', 'grep -rn active_profiles .ctoc/regulatory-regimes',
      'jq .general .ctoc/settings.json', 'find .ctoc -name settings.json', 'git diff .ctoc/settings.json',
      'git add .ctoc/settings.json', 'git status & cat .ctoc/settings.yaml', "grep 'a&b' .ctoc/settings.yaml",
      'git commit -m "the settings note & more"', 'cd .ctoc & cat settings.yaml', 'npm test 2>&1 | tail -5',
      'cat .ctoc/settings.yaml |& head', 'echo x >| src/out.txt', 'echo x > src/settings.json']) allowedBoth(bash(c), c);
    allowedBoth(write(p('.ctoc', 'settings.json.example')), 'a different file name');
    allowedBoth(write(p('src', 'settings.json')), 'a settings.json outside .ctoc');
  });

  test('S25-6 · the record refusals stay off: plain, chained, quoted and find record writes are allowed, as before', () => {
    for (const c of ['rm .ctoc/approvals/a.json', 'git status & rm .ctoc/approvals/a.json',
      'cat .ctoc/state/verify/x.json & git checkout -- .ctoc/state/verify/x.json',
      'find .ctoc/approvals -name a.json -delete', 'echo x >> .ctoc/streaming/answers.jsonl',
      'tee ";cat" .ctoc/approvals/a.json < /tmp/x']) allowedBoth(bash(c), c);
  });

  test("S25-7 · the menu call with a --touches list past every system's path limit is allowed", () => {
    const list = touchesList(4200);
    assert.ok(Buffer.byteLength(path.join(project, list)) >= 4096, 'fixture: past every path limit from the project root');
    assertAllowed(run(bash(`node src/commands/start.js menu task add implement plans/todo/x.md --touches ${list}`)),
      'the menu call with a 4,200-character --touches list');
  });

  test('S25-8 · writing a commit message to a scratch file is allowed, also with a quoted stretch over 255 bytes', () => {
    const stretch = `s note ${DASHES}and the plan`;
    assert.ok(stretch.length <= 255 && Buffer.byteLength(stretch) > 255,
      'fixture: the quoted stretch is 255 or fewer UTF-16 units and over 255 bytes');
    const heredoc = `cat > scratch/msg.txt <<'EOF'\nfix: the owner's settings note ${PROSE}and the plan's text\nEOF`;
    const inline = `node -e "require('fs').writeFileSync('scratch/msg.txt', 'subject: ${PROSE}body')"`;
    const multiByte = `cat > scratch/msg.txt <<'EOF'\nfix: the owner's note ${DASHES}and the plan's text\nEOF`;
    assertAllowed(run(bash(heredoc)), 'a heredoc commit message');
    assertAllowed(run(bash(inline)), 'a node -e commit message');
    assertAllowed(run(bash(multiByte)), 'a heredoc commit message whose quoted stretch is over 255 bytes');
  });

  test('S25-9 · stated, not closed: find from a folder above a settings file still deletes it, pinned so a change is seen', () => {
    seed();
    for (const c of ['find .ctoc -name settings.yaml -delete', 'find .ctoc -name settings.json -delete']) {
      allowedBoth(bash(c), c);
    }
  });

  test("S25-10 · a background agent's own settings files get the same closes, with the agent sentence", () => {
    const cfg = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-cfg-')));
    try {
      fs.mkdirSync(p('.claude'), { recursive: true });
      fs.writeFileSync(p('.claude', 'settings.json'), '{}');
      const opts = { env: { CLAUDE_CONFIG_DIR: cfg } };
      for (const c of ['git status & rm .claude/settings.json', 'find .claude/settings.json -delete',
        "tee ';cat' .claude/settings.json < /tmp/x"]) {
        assertRefused(run(agentPayload(bash(c)), opts), `${c} (background agent)`, REFUSAL_AGENT_SETTINGS);
        assertAllowed(run(bash(c), opts), `${c} (main session)`);
      }
    } finally {
      fs.rmSync(cfg, { recursive: true, force: true });
    }
  });
});
```

2. **The agent-settings plan's block,** titled "a background agent may not change Claude Code's settings files or
   CTOC's .ctoc/settings.json (owner, 2026-10-15)". Every row there writes `.ctoc/settings.json` and expects the
   background agent refused with `REFUSAL_AGENT_SETTINGS` and the main session allowed. Each such row now expects the
   main session, the background agent and the empty agent id refused with `REFUSAL_REGIME_SETTINGS`, the block's own name
   for the settings sentence.
   - A helper `bothSettings(input, what, opts = {})` is added beside `agentOnly` in that block. It runs the three payloads
     with the block's `env`.
   - The rows, as read in the dependency on 2026-10-19:
     - case 112: 'Write .ctoc/settings.json' and 'Edit .ctoc/settings.json';
     - case 113: 'letter case .ctoc' and 'backslash .ctoc';
     - the row 'hard link to .ctoc/settings.json';
     - case 129: 'tee .ctoc/settings.json < in.json', 'mv in.json .ctoc/settings.json' and
       'echo x > src/../.ctoc/settings.json';
     - case 132: 'summary naming .ctoc/settings.json', which goes from allowed to refused for the background agent and
       the main session.
   - Case 129's long-s row `echo x > .ctoc/ſettings.json` expects both sessions refused with the settings sentence on
     macOS, where APFS opens it as the protected file and the identity test sees it. Elsewhere it stays as the dependency
     wrote it.
   - Step 9 lists every such row as it stands after the merge, and no other row changes.
3. **The dependency's hook case 159,** row 'echo of a quoted name of 100 non-Latin characters (control)':
   - its selector `process.platform === 'darwin' ? allowedBoth : …` becomes
     `process.platform === 'darwin' || process.platform === 'linux' ? allowedBoth : …`;
   - its comment line becomes "Absent on macOS (its disk counts UTF-16 units) and on Linux (over 255 bytes in a short
     path, four-defects slice 25); elsewhere a 'name too long' on it is a fault, refused."

#### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY
**Purpose:** the entry-point section and "The one loaded hook" state the rule as the hook now decides it.
**Change Type:** modify-existing

##### Changes
1. **The entry-point section:** directly after the JSON block (main lines 50-56, the one fenced `json` block that names
   `entry_point`; `tests/last-mile-drives-entry-point.test.js` "ladder 7" requires exactly one), insert this paragraph:

```markdown
The human writes this block into `.ctoc/settings.json` by hand: CTOC's write protection refuses every
tool's write to that file, for the main session and background agents alike (the settings paragraph
under the loaded hook below), and no menu route writes it yet. The planned menu route that writes the
deployment block on the owner's OK is to write this key too; the last-mile messages then name it.
```

2. **The settings paragraph** (main lines 249-264, from "**The regulatory settings (owner's answer "a",
   2026-10-08).**" to "Held by `tests/protect-records.test.js` (cases 91–96, and case 13).") becomes:

```markdown
**The regulatory settings (owner's answer "a", 2026-10-08) and the settings JSON file (owner's answer of
2026-10-18).** The project's settings files `.ctoc/settings.yaml` and `.ctoc/settings.json`, and everything under
`.ctoc/regulatory-regimes/`, are protected the same way: the regime they declare decides whether a plan may move on by
itself, and `.ctoc/settings.json` holds `general.entry_point`, the command the check run executes
(`src/lib/app-runner.js`), and the push switch. Every Write, Edit, MultiEdit and NotebookEdit and every shell write to
them is refused — by name in any letter case, with `\` read as `/`, after `..`, after a `cd`, through a symbolic link and
root-independently — for the main session and background agents alike; reading them stays allowed. Since the owner's
removal of 2026-10-15 (`RECORD_REFUSALS_OFF` in `src/hooks/protect-records.js`) this is the one shell refusal that runs
for every session. A command is read twice (four-defects slice 25): cut as before, at every line break, `;`, `&&`, `||`
and `|` whatever the quotes; and cut the way bash and zsh cut it, also at a single `&` and at `|&`, never inside single
quotes, double quotes or `$'…'` and never at an escaped character, with `&>`, `>&`, `<&` and `>|` read as redirects.
Either reading refusing refuses, so nothing refused before is allowed now. In the second reading a `cd` the shell runs in
the background (ended by a single `&`) moves no folder, and a part holding a line break inside quotes is never a read. In
both, an output redirect that opens a part has its target checked (`cd .ctoc && > settings.yaml`), and `find` given
`-delete`, `-fprint`, `-fprint0`, `-fprintf` or `-fls` is no read. So `git status & rm .ctoc/settings.yaml`,
`cat .ctoc/settings.yaml & git checkout -- .ctoc/settings.yaml`, `find .ctoc/settings.yaml -delete` and
`tee ";cat" .ctoc/settings.yaml < /tmp/x` are refused. Its costs: a non-read program naming `.ctoc/settings.json` is
refused (`node -e` reading it, an editor, a menu call whose `--summary` names its path), as one naming
`.ctoc/settings.yaml` already was; and a read naming a settings file is refused when a line break sits inside its quoted
arguments or it follows a here-document whose body holds an unmatched apostrophe. The refusal is its own sentence: "CTOC
refused this call because it writes, or could write, the project's settings file or its regulatory profiles, which only
CTOC's menu writes; tell the human what you wanted to change and let the menu change it." The menu's own routes write
them: `start.js`, and the start.md recipes `claude:set-environment`, `claude:env-keep-defaults` and
`claude:set-compliance-regime`, which write through `src/lib/` and name no path — so they pass the protection, for the
main session and, since the owner's removal of 2026-10-15, for a background agent too. No menu route writes
`general.entry_point` or the `deployment` block yet: the human puts each into `.ctoc/settings.json` by hand (the
entry-point section above; the `deployment-setup` agent hands its block over and checks the file before its dry run),
until the planned menu route that writes the deployment block, which is to write the entry point too. Limits are those
of the records below; in addition, any inline script that writes a settings file without naming its path passes, and so
do `find` from a folder above a settings file (`find .ctoc -name settings.yaml -delete`), a command substitution that
hides a git write behind a read (`cat .ctoc/settings.yaml $(git checkout -- .ctoc/settings.yaml)`) and
`git -C .ctoc rm -- settings.yaml` (read from the code). A `~/.ctoc/settings.yaml` or `~/.ctoc/settings.json` counts too,
because the test does not depend on the project root. Held by `tests/protect-records.test.js` (cases 91–96, case 13 and
the cases S25-1 to S25-10).
```

3. **"What it refuses", item 2** (main lines 271-274): the closing "without `--output` or `>`)." becomes "without
   `--output` or `>`; `find` given `-delete`, `-fprint`, `-fprint0`, `-fprintf` or `-fls` is no read). The command is
   read in segments cut twice — at a line break, `;`, `&&`, `||` and `|` whatever the quotes, and as bash and zsh cut it
   (the settings paragraph above) — and either reading refusing refuses."
4. **"What it cannot catch"**, the bullet "read commands with a write side effect (`find -delete`, `tree -o`), which can
   delete or corrupt a record but never forge one;" (main lines 420-421) becomes:

```markdown
- read commands with a write side effect: `tree -o`, and `find` given `-delete` or a writing option from a folder
  above the protected file (`find .ctoc -name settings.yaml -delete`), which can delete or corrupt a record but never
  forge one (`find` naming the protected file's own path with such an option is no read);
```

5. **"What it cannot catch"**, a new bullet directly after it:

```markdown
- the shell's cut follows bash and zsh: a shell that does not read `$'…'` (dash, POSIX `sh`) can cut where neither
  reading does; a `#` comment and a here-document body are read as text (a quote they hold can only add a refusal);
  and a `cd` that does not start its part (`if cd .ctoc; then rm settings.yaml; fi`) is not followed;
```

6. **The agent-settings plan's bullets** (the dependency's lines 546-548 and 580-582):
   - "the main session changing a settings file (by design: …" begins "the main session changing Claude Code's settings
     files (by design: …", and the bullet ends with "; `.ctoc/settings.json` is refused for every session by the
     settings refusal";
   - "on the shell, a settings file read by `find … -delete` or `find … -exec <program> {} +`: both count as reads and
     are not refused (measured: …)" becomes "on the shell, `find … -exec <program> {} +` on a settings file, and `find`
     with `-delete` or a writing option from a folder above it: they count as reads and are not refused (measured before
     four-defects slice 25: an agent could delete or overwrite the config folder's settings file that way); `find` naming
     the file's own path with such an option is no read since that slice;".
7. **The dependency's "name too long" text** (its lines 608-615): its closing "(on a disk that counts bytes, a name of
   255 or fewer units but over 255 bytes is refused too: the safe side)." becomes "On Linux, whose usual file systems
   count bytes, that error for a name over 255 bytes in a path under 4,096 bytes can only be about the name, so that
   name is absent too (four-defects slice 25: a commit message's quoted stretch of em dashes); on any other system a name
   of 255 or fewer units that the disk calls too long is refused: the safe side."

### Test Plan

**Framework:** `node:test` with `node:assert/strict`, as each file uses. No test file is added, so no documented count
moves and no ratchet file is declared. "Before" is the tree with the dependency landed and none of this plan's edits.
Every hook case drives the real hook with main-session and background-agent payloads. The one unit case drives the
resolver with the file system's answer injected, the only way to show the Linux rule on a macOS build machine.

| Case | Before | After | What it pins |
|---|---|---|---|
| S25-1 | allowed (the run of 2026-10-18) | refused, settings sentence, both sessions | the three commands the owner named |
| S25-2 | allowed | refused | every settings file, the quoted and escaped separators, `$'…'`, a background `cd`, an opening redirect, a here-document's unmatched apostrophe, the `find` writer options |
| S25-3 | refused | refused | a guard: what a plain-text or background-blind cut would open (revision 3's loosenings); the `$'…'` form a POSIX shell cuts (only today's reading refuses it); the earlier closes |
| S25-4 | allowed for the main session; the agent sentence for a background agent | refused, settings sentence, both sessions | `.ctoc/settings.json` on every tool and spelling, through a symbolic and a hard link, another copy, the shell |
| S25-5 | allowed | allowed | a guard: reads, staging, a quoted `&`, a background `cd` before a read, `2>&1`, same-name files elsewhere |
| S25-6 | allowed | allowed | a guard: the record refusals stay off |
| S25-7 | allowed (the dependency's walk) | allowed | a guard: the long `--touches` menu call past every path limit |
| S25-8 | allowed on macOS; the multi-byte row refused on Linux | allowed | the commit-message false refusal, ASCII and multi-byte |
| S25-9 | allowed | allowed | the open `find` form, stated, so a change is seen |
| S25-10 | allowed for a background agent | refused, agent sentence; main session allowed | the closes reach the agent-settings plan's files too |
| agent-settings rows (item 2) | main allowed, agent sentence | settings sentence, both sessions | tightened by the owner's answer of 2026-10-18 |
| case 159 row, unit case 22 and 23 rows | refused on Linux, allowed on macOS | allowed on both | the owner's answer of 2026-10-19 on each file system's unit |
| unit case S25-L | its first row a fault | its first row in the tail; controls faults | the Linux byte rule and its whole-path bound |
| last-mile case 6c | fails | passes | the two reasons say "by hand" and "write protection" |
| agent-tool-grants pinned sentences | fail | pass | the hand-over and the post-setup wait |

Every other case of the touched files passes before and after.

**Mutant checks in Step 10.** Before each mutant, save a copy of the file outside the checkout. Then make the change, run
the affected files, record which case fails, write the saved copy back, and record that the file's sha256 equals the
copy's. No git command undoes anything in the shared checkout.

| Mutant | Must fail |
|---|---|
| 1. Drop the shell reading (the second `partsWrite` call removed). | S25-1's first two; S25-2's `&`, quoted, escaped, `$'…'`, background-`cd` and here-document rows |
| 2. Make `shellParts` ignore quotes. | S25-2's quoted `;`, `\|` and line-break rows |
| 3. Drop today's reading (the first `partsWrite` call removed). | S25-3's `$'…'` row a POSIX shell cuts |
| 4. Ignore `background` in `partsWrite`. | S25-2's `cd /tmp & echo x > src/settings-link.yaml` |
| 5. Ignore `mayRead` in `partsWrite`. | S25-2's here-document row |
| 6. Read `$'` as a plain single quote in `shellParts`. | S25-2's `tee $'\';cat' …` row |
| 7. Make `shellParts` ignore backslashes. | S25-2's `tee \;cat …` row |
| 8. Drop `LEADING_OUTPUT_REDIRECT_RE` (always `.slice(1)`). | S25-2's `cd .ctoc && > settings.yaml` and `true; > src/settings-link.yaml` |
| 9. Drop the `find` line. | S25-1's third; S25-2's `find` rows; S25-10's `find` row |
| 10. Drop the quote-and-backslash dropping from the `find` line. | S25-2's `'-delete'` and `-de\lete` rows |
| 11. Drop the writing options other than `-delete` from the `find` line. | S25-2's `-fprint` row |
| 12. Drop `SETTINGS_JSON_SPEC` from `SETTINGS_SPECS`. | S25-2's `settings.json` rows; S25-4's shell rows |
| 13. Drop `json` from `REGIME_SEGMENT_RE`, keep `REGIME_TARGETS`. | S25-4's "another copy, outside the project" |
| 14. Drop `.ctoc/settings.json` from `REGIME_TARGETS`, keep the name. | S25-4's "a hard link to it" |
| 15. Set `RECORD_REFUSALS_OFF` to `false`. | S25-6 |
| 16. `nameCannotExist` returns `seg.length > 255` alone. | unit case S25-L's first row |
| 17. Drop `Buffer.byteLength(next) < 4096` from it. | unit case S25-L's deep control |

The `&>`, `>&`, `<&` and `>|` exceptions in `shellParts` have no mutant: today's reading refuses every such form that
touches a settings file, so no row can fail without them. They are kept so that a `cd … 2>&1` part is not read as
backgrounded.

**Coverage:** every branch of `shellParts` is reached by S25-2, S25-3 and S25-5:
- each quote kind, an escape, `$'`, and a quoted line break;
- `;`, `|`, `&&` and a single `&`;
- `|&` (S25-5's `cat .ctoc/settings.yaml |& head`) and `>|` (S25-5's `echo x >| src/out.txt`);
- `>&` (S25-5's `npm test 2>&1 | tail -5`) and `&>` (S25-3).

`||` is reached by the file's existing cases. `nameCannotExist` is reached both ways. The coverage of `src/` must not fall
(Step 14).

### Security Review

- [ ] **Every verdict this slice changes, in both directions** (traced by reading the code; the red run and the mutants
  confirm).
  - **From allowed to refused** (the loaded hook, every session unless said):
    - a write after a read and a single `&` (S25-1, S25-2);
    - `find` naming a settings file's path, or inside the profile folder, with `-delete`, `-fprint`, `-fprint0`,
      `-fprintf` or `-fls` (S25-1, S25-2);
    - a write behind a quoted or escaped `;`, `|` or line break, or inside `$'…'` (S25-2);
    - a write after a `cd` the shell runs in the background (S25-2);
    - an output redirect opening a part, whose target reaches a settings file through a `cd` or a link (S25-2);
    - a write after a here-document whose body holds an unmatched apostrophe (S25-2);
    - every write to `.ctoc/settings.json` by the main session. A background agent's refusal for it changes from the
      agent sentence to the settings sentence (S25-4, the agent-settings rows);
    - for a background agent, the agent-settings plan's files (Claude Code's settings files and the config folder's) get
      the same closes, with the agent sentence (S25-10);
    - **cost:** a non-read program naming `.ctoc/settings.json`, such as `node -e` reading it, an editor, a script given
      its path, or a menu call whose `--summary` names its path (case 132's row). `.ctoc/settings.yaml` already had this
      cost;
    - **cost:** a read naming a settings file when a line break sits inside its quoted arguments, or when it follows a
      here-document whose body holds an unmatched apostrophe;
    - **cost:** `find` over a settings file with `-fprint` or `-fls` writing its list elsewhere.
  - **From refused to allowed:**
    - on Linux only, a command whose only refusal was "name too long" on a name of 255 or fewer UTF-16 units and over 255
      bytes, in a path under 4,096 bytes. Such a name cannot exist on a byte-counting disk. On a disk that counts units it
      is not too long, so the error cannot come from it (S25-8's multi-byte row, unit case S25-L). The owner approved the
      long-name rule's narrowing on 2026-10-19 (line 204); its base is the dependency's;
    - nothing else. Today's cut is one of the two readings and every test it ran still runs; mutant 3 shows the second
      reading does not replace it.
- [ ] **The deep-link case** is stated in the Technical approach: refused, not followed; its cost is an over-refusal.
- [ ] **The record specs.** The loaded hook does not test them while `RECORD_REFUSALS_OFF` is `true` (S25-6). The shared
  functions give them the same changes; that shows only in `PreToolUse.Bash.js`'s unregistered `main()` and in tests
  that call the functions directly (Step 10 runs them).
- [ ] **No sentence, module, export, `require` or dependency is added**, and no secret.
- [ ] **The deployment-setup agent loses only a write route.** Its tools stay as they are; the user applies the block, and
  the agent checks it before any step that reads it.
- [ ] **Stated, not hidden:** the open forms listed in the Technical approach, in `docs/ENFORCEMENT.md` and in the
  findings.

### Wiring — the live call sites

- The root is the one hook `hooks/hooks.json` registers. The editing tools go through `src/hooks/protect-records.js`
  `main`, then `decide`, then `isRegimeFile`, which reads `REGIME_SEGMENT_RE` and `REGIME_TARGETS` with `settings.json`
  in both.
- The shell goes `decide` → `bashRefuses`, its `RECORD_REFUSALS_OFF` branch → `SETTINGS_SPECS`, then the dependency's
  agent specs → `isLedgerWrite` → `shellParts` and `partsWrite` → `isReadOnlyLedgerCommand` (the `find` line) and
  `operandResolvesIntoLedger` → `resolvesUnder` → `resolveExisting` → `nameCannotExist`, then `REFUSAL_SETTINGS` or
  `REFUSAL_AGENT_SETTINGS`.
- The last-mile messages are returned by `driveAppSync`, which `src/lib/step-13-verify.js` (line 67) calls for the check
  run's evidence.
- The deployment-setup agent's paragraph and post-setup steps are read by the agent whenever CTO Chief dispatches it.
- No module is added. Every changed line is reached from the registered hook, the check run or the dispatched agent.

## Acceptance Criteria

- [ ] Step 8's first box found the owner's twelve answers bound by question id, option key, revision stamp and digest,
  and no hold in force. They are quoted under `## Execution Record` before any test or source line was written.
- [ ] Step 8's second box found the real-file plan's code on the branch.
- [ ] The three commands of 2026-10-18 are refused with the settings sentence for the main session and a background agent
  (S25-1), and so is every form of S25-2.
- [ ] The forms revision 3 would have opened, and the earlier closes, stay refused (S25-3).
- [ ] `.ctoc/settings.json` is refused for Write, Edit, MultiEdit and NotebookEdit, in every spelling, through a symbolic
  and a hard link, and for shell writes, for every session (S25-4 and the agent-settings rows).
- [ ] The ordinary commands of S25-5 stay allowed, and the record refusals stay off (S25-6).
- [ ] The long `--touches` menu call and the three commit-message scratch writes are allowed (S25-7, S25-8). The
  multi-byte row is allowed on Linux too (unit case S25-L).
- [ ] `find` from a folder above a settings file is allowed, pinned and stated as open (S25-9).
- [ ] A background agent's own settings files get the same closes with the agent sentence (S25-10).
- [ ] The two last-mile reasons say "by hand" and "write protection" (case 6c), and the existing reason assertions pass.
- [ ] The deployment-setup paragraph hands the block over; its post-setup steps start by checking the file holds it; its
  three pinned sentences pass in `tests/agent-tool-grants.test.js`.
- [ ] The hook header, the functions' comments, `real-path-confinement.js`'s comment and `docs/ENFORCEMENT.md` state the
  rule, its costs and its limits as the code decides them; `find -delete` is never called closed.
- [ ] Step 9 recorded the build machine's name unit and path limits, and the shell beliefs, each as measured.
- [ ] Each of the seventeen mutants was killed and undone from its saved copy, compared byte for byte. No git command
  undid anything.
- [ ] Only the ten declared files changed.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0
  skipped and 0 flaky.

## Risks

- **A legitimate command is refused** (the costs in the Security Review). Likelihood MEDIUM, impact LOW. The sentence
  tells the agent to ask the human. For the release commit, use `git commit -F <file>` or a one-line `-m`: both are git
  reads.
- **The deployment-setup route changes.** A user who configures deployment pastes one block by hand. Likelihood
  certain, impact LOW: the step is rare and one-off, and `dry_run: false` arms real pushes, which no agent should flip
  unseen. The deployment-route plan removes the hand step.
- **A belief about the shell's grammar is wrong.** Likelihood LOW, impact LOW. Step 9 probes each belief with harmless
  commands under bash and zsh. Today's cut stays as a reading of its own, so a wrong belief can only add a refusal.
- **A belief about the file systems is wrong** (APFS counts UTF-16 units; Linux's usual disks count bytes; path limits
  1,024 and 4,096). Likelihood LOW, impact MEDIUM. Step 9 measures the build machine's unit and limits and stops if
  APFS holds a 128-emoji name. The Linux facts are believed from Linux's `limits.h` and cannot be measured on the macOS
  build machine; the injected unit case shows the branch's logic.
- **The dependency's merge moves every anchor.** Likelihood certain, impact LOW. Every edit is anchored by text, and Step
  9 records where each stands.
- **Two readings cost time.** Likelihood certain, impact LOW: the link tests run twice for a command with quotes, a
  single `&` or an escape. A padded command reaches the dependency's 5-second budget sooner and is refused (the safe
  side). Step 12 records the figures; no time limit is asserted.
- **Neighbour edits** (Neighbours). Likelihood MEDIUM, impact LOW. Every edit is anchored by its text, and at the release
  both sides of an append are kept.

## Findings for the owner to schedule

Items 3-6 and 11 were re-read on 2026-10-18 and not re-read for revision 4. Whether and when any is built is the owner's
call.

1. ~~The shell hook reads `find … -delete` as a read for the settings refusal.~~ Taken into this plan for the spelling
   that names the file's path. From a folder above the file it stays open (item 7).
2. **The command the check run executes can still be chosen by a write the hook cannot read.** `.ctoc/settings.json`'s
   `general.entry_point` is the command the check run executes (`src/lib/app-runner.js`, `readDeclaredEntryPoint`, read
   raw). This plan refuses every named, linked and look-alike write to the file. A path built at run time still reaches
   it: `printf … > .ctoc/settings${UNSET}.json`, a script file, or `node -e` building the name. So an agent steered by
   injected text can still choose the command the next check run executes, or switch on pushing. **The option to
   schedule:** a control where the check run reads the key. For example, the check run executes the declared command
   only when it equals one the menu recorded on the owner's OK, in a record the write protection already refuses to
   every tool. No spelling of a write to the settings file can then choose what runs.
3. **The quality cache can say "Cache valid" without running tests.** The push check compares
   `.ctoc/quality-state/file-hashes.json` and, when no file's hash changed, prints "No file content changes detected.
   Cache valid." (`src/lib/quality-agent.js` line 1253) and passes with zero tests. That file is writable by any tool
   call.
4. **The stop request.** A folder at `.ctoc/state/drain-stop` keeps the stop on: `isDrainStopRequested` uses
   `existsSync` (`src/lib/task-registry.js` line 1254). `clearDrainStop` cannot lift it and fails silently: its `catch`
   ignores every error (line 1266), so a forced Start agent goes on as if the stop were lifted while the next check
   still reads it as on.
5. **The `hooks/hooks.json` description is wrong** (its line 2). It says CTOC loads only its write protection "for the
   approval records, the check records and the owner's recorded answers". The hook refuses settings writes, and since
   2026-10-15 no record writes on the shell.
6. **There is no menu route to lift a stop without claiming a build, or to reorder the build queue.** `moveUpInQueue`
   and `moveDownInQueue` (`src/lib/actions.js` lines 936 and 955) have no caller outside the tests.
7. **Open forms of the settings refusal, read from the code, not run:**
   - `find .ctoc -name settings.yaml -delete`, and the `settings.json` form (pinned by S25-9);
   - `find` with `-exec`, `-execdir`, `-ok` or `-okdir` running a program off the write list;
   - `cat .ctoc/settings.yaml $(git checkout -- .ctoc/settings.yaml)`;
   - `git -C .ctoc rm -- settings.yaml`, and a launcher before it (`env git -C …`);
   - `if cd .ctoc; then rm settings.yaml; fi`;
   - a shell that does not read `$'…'` (dash, POSIX `sh`).
8. **`docs/ENFORCEMENT.md`'s loaded-hook section still describes the shell record refusals as on.** Its "What it
   refuses" items and its refusal sentence say so, but they are off since 2026-10-15. Searched
   `RECORD_REFUSALS_OFF|2026-10-15` over the file on 2026-10-19: 0 matches. This plan corrects only the settings
   paragraph and item 2.
9. **The link test reads a target's fault as "inside":** a word whose path runs through a file (`README.md/x`, "not a
   folder") is refused with the settings sentence. The real-file plan changes how a fault on the *protected* folder is
   read, not a target's (read in its design, not run).
10. **The deployment-route plan is to write `general.entry_point` as well as the `deployment` block,** and then to change
    `src/lib/app-runner.js`'s two sentences and `docs/ENFORCEMENT.md`'s entry-point paragraph to name its route. Until
    then the human edits the file by hand. The owner chose this route on 2026-10-18; it is recorded here so the key is
    not left out.
11. **The menu cuts a send-back's reason to 100 characters** in the plan's `rejection_reason`
    (`src/lib/actions.js` lines 870-874).

## Neighbours (seen, not built here; scheduling is the owner's)

Every plan outside `plans/done/` whose `files:` shares a file with this plan. Searched 2026-10-19: the `files:` lines over
`plans/{implementation,todo,in-progress,review,functional}` naming any of the ten files; each match read.

| Neighbour | Shared file | How it merges |
|---|---|---|
| **The real-file plan** (this plan's `depends_on`), with the agent-settings plan on the same branch | `src/hooks/PreToolUse.Bash.js`, `src/hooks/protect-records.js`, `src/lib/real-path-confinement.js`, both test files, `docs/ENFORCEMENT.md` | Lands first. This plan edits its lines only where "Who owns which change" says, and changes three of its rows' Linux expectations and the agent-settings rows for `.ctoc/settings.json`, each with its reason. |
| The spelling plan (another branch) | `src/hooks/PreToolUse.Bash.js` (expected) | No `depends_on` either way; whichever lands second re-reads `isLedgerWrite` at its Step 9. |
| The decision-route plan, `…-s21-background-agents-do-not-open-the-dashboard.md` | `src/hooks/protect-records.js`, the test file, the document | It builds after this plan (its own `depends_on`). It inserts at the top of `bashRefuses`'s `RECORD_REFUSALS_OFF` branch; this plan changes only that branch's settings expression. |
| The critique-attribution plan, `…-s24-only-a-critique-the-menu-launched-can-move-a-plan.md` | `src/hooks/protect-records.js`, the test file, the document | Disjoint spans: it edits `decide`'s editing branch, after `REFUSAL_SETTINGS`, and the header's "WHAT IT CANNOT CATCH". |
| The hotfix labelled-commit plan, `ctoc-checks-that-a-hotfix-is-really-small-and-safe-s2-a-labelled-commit-needs-a-passing-check.md`, and its urgent-changes plan `…-s3-…` | `src/hooks/protect-records.js`, the test file, the document | Disjoint; both append tests. |
| The five small-change slices `00401-…` to `00405-…` and `small-changes-take-a-small-path.md` | `src/hooks/PreToolUse.Bash.js` | They touch its unregistered `main()` and `checkWriteCoverage`; disjoint. |
| `plans/functional/ctocs-hooks-are-actually-loaded-by-claude-code.md` | `src/hooks/PreToolUse.Bash.js` | Its implementation plans come later and re-read the file. |
| The task-registry plan, `…-s20-the-task-registry-is-written-only-by-the-menu.md` | both hook files, the test file, the document | A note that builds nothing. |
| The sweep plan, `plans/review/real-projects-do-not-stall-on-the-menu-s2-read-only-dashboard-and-sweep.md`, and the settings-route plan, `…-s1-settings-route.md` | `src/hooks/protect-records.js`, the test file, the document | The sweep plan is built: its refusals sit before `RECORD_REFUSALS_OFF` and are untouched. The settings-route plan edits another section of the document. |
| The attack-recorded plan, `fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s3-the-attack-is-recorded.md`, and `plans/functional/ctoc-keeps-working-and-asks-only-what-matters.md` | the test file, the document | Append; both sides kept. |
| The agent-questions plan, `plans/todo/dispatched-agents-route-their-questions-to-the-session.md` | `agents/infrastructure/deployment-setup.md`, `tests/agent-tool-grants.test.js` | It turns the agent's menus into questions. This plan leaves the summary menu alone and edits line 490, the post-setup list and the pinned sentences, re-read at Step 9. |
| The deployment-setup improvement, `plans/todo/00285-every-agent-and-specialist-skill-improved-three-times-s25-deployment-setup.md` | `agents/infrastructure/deployment-setup.md` | It may rewrite "Configuration Output". Whichever lands second keeps the hand-over and the post-setup check; Step 9 records which. |
| `plans/implementation/agent-tool-grants-s11-removals-held.md` and `plans/todo/agents-that-hold-the-shell-search-with-it-s2-blocked.md` | `tests/agent-tool-grants.test.js` | Different entries. |

No neighbour edits `src/lib/app-runner.js`, `tests/last-mile-drives-entry-point.test.js` or
`tests/a-link-cannot-leave-the-repository.test.js` besides the real-file plan.

## Decisions Taken Under Ambiguity

### Carried from revision 3 (2026-10-18), still holding

1. **The scope is the owner's answers and nothing else.** The record refusals stay off, as his removal of 2026-10-15
   left them; S25-6 pins it.
2. **`.ctoc/settings.json` gets a shell spec of its own and the same sentence.** The link test takes one target per spec.
   "The project's settings file" is true of it. "Let the menu change it" is true today for the push switch (the menu's
   toggle, `src/lib/settings.js` line 94). For the entry point and the deployment block it becomes true once the
   deployment-route plan lands; until then the last-mile messages and the document say "by hand".
3. **The deployment-setup agent hands its block to the user.** It is the one tool-writer of `.ctoc/settings.json`.
   Its pinned sentence moves to the new text and is not weakened.
4. **Step 8 binds the owner's answers literally:** question id, option key, revision stamp and digest. The question files
   are replaced by later critiques, so the digests are quoted, not recomputed.
5. **No timing test.** Steps 9 and 12 record the hook's run times as measurements.
6. **The substitution form and `git -C` are findings, not built.** They are outside the gaps the owner named.

### Revision 4 (2026-10-19)

7. **Two readings, not one shell-like cut.** A single reader that follows the shell would misread what it does not parse:
   here-document bodies, comments, shell dialects. Keeping today's cut as a reading of its own means such a misreading
   can only add a refusal, and nothing refused before is allowed. The cost: today's over-refusals of quoted `;` and `|`
   in reads stay. Revision 3's `grep 'a&b' .ctoc/settings.yaml` over-refusal does not arise.
8. **The shell reading reads quotes, `$'…'` and escapes, and leaves comments, here-documents, `$(…)`, backticks and
   arithmetic as text.**
   - Reading `#` as a comment would be a bypass in a shell that does not (an interactive zsh without
     `INTERACTIVE_COMMENTS`).
   - Parsing here-documents is what the real-file plan's phase E tried and took out after nine bypasses.
   - A quote the reader opens in such text either spans a line break, and the part is no read (decision 9), or ends on
     the same line, where the shell runs nothing after a comment.
9. **A part holding a line break inside a quote is no read.** This is the safe answer to here-document bodies and
   comments without parsing them. Its cost is in the Security Review.
10. **`&>`, `>&`, `<&` and `>|` are redirects in the shell reading.** No row can show it, because today's reading refuses
    every such form. It is kept so that a `cd … 2>&1` part is not read as backgrounded.
11. **"A bare `&>` redirect has its target checked"** is met two ways:
    - the cut never separates `&>` from its command;
    - any output redirect that opens a part has its target read as an operand (`> f`, `>> f`, `N> f`, `&> f`).

    An input redirect (`< f`) is left as it is: it reads.
12. **`find` given `-fprint`, `-fprint0`, `-fprintf` or `-fls` is no read, in the same line as `-delete`.** It is the
    same defect class, and the line is the same; leaving `find . -fprint .ctoc/settings.yaml` open would be the shallow
    fix. `-exec` and its relatives stay a finding: refusing them would refuse `find … -exec cat {} +`.
13. **`find` from a folder above a settings file stays open, pinned as allowed** (the owner's answer of 2026-10-19). If a
    later plan closes it, that plan changes S25-9 with its reason.
14. **The long-name rule is the real-file plan's; this plan adds only Linux's byte count.**
    - The owner's brief said "characters (Unicode code points) on APFS". The real-file plan measured on this Mac that
      APFS counts UTF-16 units: 127 emoji (254 units) accepted, 128 (256 units) refused, 255 Chinese characters
      accepted. That is its Phase H, recorded in its Execution Record.
    - Code points would call a 128-emoji name too short and refuse it falsely. This plan follows the measurement, and
      Step 9 re-measures it.
    - For every character in the basic plane, em dashes and Chinese included, units and code points are the same count.
    - On Linux this plan counts bytes, bounded by the whole path, so an answer that may be about the whole path stays a
      fault. Windows keeps the units rule and refuses otherwise: the safe side when in doubt.
15. **`depends_on` names the real-file plan, and Step 8 checks its code.** It lands the long-name rule first, and its
    `resolveExisting` is where the byte rule goes. A `depends_on` missing from `plans/` never blocks the queue
    (`src/lib/continuation-queue.js` lines 167-171), and that plan sits on its own branch, so Step 8 looks for its code.
16. **Three of the dependency's rows change their Linux expectation from refused to allowed** (unit cases 22 and 23, hook
    case 159). The written reason: the owner's answer of 2026-10-19 that each part is counted in its file system's own
    unit. On Linux the old expectation encoded the very false refusal he asked to remove. Windows is left as the dependency
    wrote it.
17. **The agent-settings rows for `.ctoc/settings.json` are tightened, not loosened.** The main session goes from allowed
    to refused, and the background agent's sentence becomes the settings sentence, by the owner's answer of 2026-10-18.
    The menu call whose `--summary` names the file's path goes the same way, as one naming `.ctoc/settings.yaml` already
    did.
18. **The deployment agent waits for the hand-over and checks the file** (the owner's answer of 2026-10-19). It leaves the
    summary menu to the agent-questions plan, which rewrites its menus. "Validate the YAML is well-formed" becomes "the
    JSON block" in the list this plan renumbers: the block is JSON.
19. **`src/lib/app-runner.js` is in `files:`** because the message lives there (the owner's answer of 2026-10-19). Case
    6c is added test-first. The existing assertions on the two sentences still hold.
20. **The executed-entry-point finding is reworded and kept** (the owner's answer of 2026-10-19). It now names the
    run-time spelling and the control at the point of reading.
21. **The superseded revisions are out of the file** (the owner's answer of 2026-10-19). The send-back block of
    2026-10-17 stays at the top, and `revision: 4` follows this file's names; the menu's next send-back writes 5. The
    parent's full path is named at the top for the red-team lens's next round (the owner's answer on its shape test).
22. **`effort: medium`:** ten files. The hook code is one new function, the old loop moved into another, two lines in the
    loop, one line in the read test, one spec and one added condition in the resolver.
23. **S25-7 keeps one list, past every path limit.** The dependency's case 156 covers the 1,900-byte macOS form.
24. **S25-10 pins the agent-settings plan's files.** The shared function changes their verdicts in the loaded hook too,
    so the change is listed and tested, not left implicit.
25. **The decisions of revision 4 are dated 2026-10-19, the day they were taken,** and revision 3's carried decisions
    keep 2026-10-18.

## Execution Plan (Steps 8-16)

The build may run in a worktree. Step 8's first box reads the answers log from the main checkout wherever the build
runs.

Every note an executor adds goes under a `## Execution Record` heading placed after Step 16, as one `###` subheading per
note: the owner's answers, the dependency check, red runs, results, line shifts, measured beliefs, mutant checks,
measurements, findings. Nothing is written inside the steps except their check marks. No git command (checkout,
restore, stash, reset) undoes anything in the shared checkout: every mutant is undone by writing back a copy saved
outside the checkout, and the file is compared byte for byte.

### Step 8: TEST
- [ ] **FIRST — the owner's decisions for this change are on record, bound as below, or the build stops here.**
  - Read `.ctoc/streaming/answers.jsonl` from the MAIN checkout. From a linked worktree, the main checkout is the parent
    folder of the path `git rev-parse --path-format=absolute --git-common-dir` prints (a read).
  - For each row below, take the LAST entry whose `ref` and `questionId` match. Accept it only when its `optionKey`,
    `holds`, `planMtimeMs` and `questionDigest` equal the row's values.
  - The `ref`s:
    - this plan: `implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s25-a-record-the-menu-wrote-can-be-staged-and-committed.md`;
    - the task-registry plan: `implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s20-the-task-registry-is-written-only-by-the-menu.md`.

    | Plan | `questionId` | `optionKey` | `holds` | `planMtimeMs` | `questionDigest` | Recorded |
    |---|---|---|---|---|---|---|
    | this plan | `q10-settings-refusal-gap-unowned-r1792323170060` | `1` | `false` | `1792323170060.1936` | `e60fedbdf9ea178f0018596dc01c6c1104285d1be8c8d5fe82af8b92a4ab7ec2` | 2026-10-18T12:21:57.608Z, line 196 |
    | the task-registry plan | `q10-withdrawal-leaves-settings-gaps-r1792323724461` | `1` | `false` | `1792323724461.8638` | `782e510046fe07ba9c55434b6a4d3ada14aee73e35cac1c94463ee3f7dc6f516` | 2026-10-18T12:21:55.811Z, line 192 |
    | the task-registry plan | `q11-entry-point-settings-unprotected-r1792323724461` | `1` | `false` | `1792323724461.8638` | `97c8153b206953bab2a0c204f573aff3e7f65c7c4f2fae0ff087afedf1de31d2` | 2026-10-18T12:21:56.778Z, line 194 |
    | this plan | `q10-ampersand-cut-ignores-quotes-r1792327921096` | `1` | `false` | `1792327921096.1763` | `1c516eed2d45b4af009845549cdbf6a7abf5d7411ea2894a75b80e06dae95933` | 2026-10-19T10:28:46.011Z, line 200 |
    | this plan | `q11-find-from-parent-folder-r1792327921096` | `1` | `false` | `1792327921096.1763` | `248eb84e04296f96985e8178be7bedbf233cc384361d0bd3c32b73aa817f6601` | 2026-10-19T10:28:46.822Z, line 202 |
    | this plan | `q12-long-name-skip-needs-approval-r1792327921096` | `1` | `false` | `1792327921096.1763` | `a720e7690edfdc600e7b266d6d806010daff65b801074ea643ab189d605435b9` | 2026-10-19T10:28:47.353Z, line 204 |
    | this plan | `q13-dry-run-before-hand-over-r1792327921096` | `1` | `false` | `1792327921096.1763` | `9eb43488fbf72c5494fb337af7e289d4ab1ffb94dcc7f068b1eb80f6addda0ec` | 2026-10-19T10:28:47.844Z, line 206 |
    | this plan | `q14-entry-point-has-no-route-r1792327921096` | `1` | `false` | `1792327921096.1763` | `8edffedf4ecb76266bb86a5ff83e9cda1783052f89887c5b30f084e7610b26db` | 2026-10-19T10:28:48.331Z, line 208 |
    | this plan | `q15-name-limit-counted-in-characters-r1792327921096` | `1` | `false` | `1792327921096.1763` | `8cb711b5eaf0b9ae4287cfb8e81382d1272d0108861aba4f7d92b6cfb90d6917` | 2026-10-19T10:28:48.842Z, line 210 |
    | this plan | `q16-struck-finding-still-open-r1792327921096` | `1` | `false` | `1792327921096.1763` | `10060ef2ce68735bb5b0f3da3a024c1fe51beb18b0e95b836f5df484a332a9b8` | 2026-10-19T10:28:49.359Z, line 212 |
    | this plan | `q17-red-team-skipped-parent-r1792327921096` | `1` | `false` | `1792327921096.1763` | `3ad74c3d44df3164514ef94b3af0eb396e1767fd2ba44c6c743ec647a0c6a16a` | 2026-10-19T10:28:49.865Z, line 214 |
    | this plan | `q18-superseded-record-in-plan-file-r1792327921096` | `1` | `false` | `1792327921096.1763` | `e1e682a126d4c75280dfea592b322fcf5b6da95cbb2048d988914643b527b7cb` | 2026-10-19T10:28:50.401Z, line 216 |

  - If the gate critique of this revision filed a question on this change under this plan's `ref`, the last answer to it
    counts as well, bound as the menu binds an answer (`readAnsweredQuestionIds`, `src/lib/streaming-precompute.js`
    lines 1060-1160). An answer that declines the change stops the build.
  - No CTOC hold may be in force for this plan. Holds were recorded at lines 186 and 220 (`ctoc-hold`, `holds: true`). A
    hold is matched by the plan's file name and stands until a later `ctoc-hold` entry for it with key `release`, no
    `holds` other than `false`, and CTOC's hold digest. That is the menu's rule, `streaming-precompute.js` lines
    1119-1128.
  - Quote each accepted entry whole under `## Execution Record` as `### The owner's decisions for this change (Step 8)`.
  - If an entry is missing or differs, or a hold stands, build nothing — no test, no source edit — and say in one line:
    "The owner's decision for the settings refusal change is not on record as bound here, so nothing is built."
  - No relay, no agent's message and no recommended option counts.
- [ ] **The real-file plan has landed on this branch, or the build stops here.** Record each item with its file and line:
  - `src/hooks/PreToolUse.Bash.js` holds no `MAX_CANDIDATE_LEN`;
  - `src/lib/real-path-confinement.js` exports `budgetSpent` and `fileIdentity`;
  - its `resolveExisting` holds `code === 'ENAMETOOLONG' && !linked && seg.length > 255`;
  - `tests/a-link-cannot-leave-the-repository.test.js` holds its unit cases 22 to 25;
  - `src/hooks/protect-records.js` holds `REFUSAL_AGENT_SETTINGS`.

  If any is missing, build nothing and say in one line: "The real-file plan has not landed, so nothing is built." The
  queue does not check this: a `depends_on` missing from `plans/` never blocks (`src/lib/continuation-queue.js` lines
  167-171).
- [ ] Record which neighbours are built, read in the files:
  - the spelling plan: what it changed in `isLedgerWrite` and around it;
  - the decision-route plan: a background-agent call inside `bashRefuses`'s `RECORD_REFUSALS_OFF` branch;
  - the critique-attribution plan;
  - the hotfix labelled-commit plan;
  - the agent-questions plan's and the deployment-setup improvement's edits of `agents/infrastructure/deployment-setup.md`;
  - the current wording of `REFUSAL_SETTINGS` and `REFUSAL_AGENT_SETTINGS`.

  For each, record where this plan's anchors now stand. If a refusal sentence reads differently from the block's
  constant, the block's constant takes the sentence as the file holds it, and that is recorded.
- [ ] Write every test change exactly as the File Specifications say, before any source or agent edit:
  - the S25 block, the agent-settings rows and the case 159 row in `tests/protect-records.test.js`;
  - the two expectations and case S25-L in `tests/a-link-cannot-leave-the-repository.test.js`;
  - case 6c in `tests/last-mile-drives-entry-point.test.js`;
  - the three pinned sentences in `tests/agent-tool-grants.test.js`.

  If a label S25-n, S25-L or 6c is already taken, record it and stop.
- [ ] Run the four test files before any source or agent edit, and record each new or changed case's result. It must
  match the Test Plan's "Before" column:
  - **must fail:** S25-1, S25-2, S25-4 and S25-10; the changed agent-settings rows; unit case S25-L's first row; case 6c;
    the three pinned sentences;
  - **must pass:** S25-3, S25-5, S25-6, S25-7 and S25-9; S25-8 on macOS. On Linux, S25-8's multi-byte row and the three
    changed Linux expectations fail.

  If any row differs, stop and record it. A row of S25-2 that passes means the plain-text cut was misread for it, and its
  cause is found first.

### Step 9: PREPARE
- [ ] Re-read, by name, and record every line shift:
  - in `src/hooks/PreToolUse.Bash.js`: `OPERAND_RESOLUTION_CAP`, `operandResolvesIntoLedger`, `isLedgerWrite` and its
    doc comment (the loop, the `cd` branch, the operand list, the read line), and `isReadOnlyLedgerCommand` and its doc
    comment;
  - in `src/lib/real-path-confinement.js`: `resolveExisting`, its `lstat` catch and the comment above it, and which
    `Stats` methods the walk calls on an existing folder (case S25-L's `fakeFolder` carries exactly those);
  - in `src/hooks/protect-records.js`: the header's settings bullet, `REGIME_SEGMENT_RE`, `REGIME_TARGETS`,
    `SETTINGS_SPEC`, `REGIMES_SPEC`, `isRegimeFile` and both settings expressions in `bashRefuses`;
  - `src/lib/app-runner.js` lines 119-160;
  - `docs/ENFORCEMENT.md`: the entry-point section, the loaded-hook section, "What it cannot catch", and the
    dependency's agent-settings and "name too long" bullets;
  - `agents/infrastructure/deployment-setup.md` line 490 and lines 536-545;
  - `tests/agent-tool-grants.test.js` lines 628-641;
  - `tests/last-mile-drives-entry-point.test.js` cases 6 and 6b and how the file cleans up its projects;
  - the agent-settings rows and case 159 in `tests/protect-records.test.js`, and unit cases 22 and 23.
- [ ] **Confirm the file system's beliefs on the build machine** in a scratch folder outside the checkout, and record
  each result:
  - a name of 255 Chinese characters is created and one of 256 is refused with ENAMETOOLONG;
  - a name of 127 emoji is created and one of 128 is refused;
  - `getconf NAME_MAX /` and `getconf PATH_MAX /`, and `node --version`.

  Believed on macOS: 255 Chinese and 127 emoji created, 256 Chinese and 128 emoji refused, `NAME_MAX` 255 and `PATH_MAX`
  1,024. If 128 emoji are created, APFS does not count UTF-16 units on this disk. The dependency's rule would then call a
  creatable name absent, so stop, record it, and report it as a finding against the real-file plan. The Linux facts (255
  bytes per name on ext4, `PATH_MAX` 4,096) stay believed from Linux's `limits.h`; record that they were not measured.
- [ ] **Confirm the shell's beliefs** with harmless commands that print only, in the scratch folder, under `bash -c` and
  `zsh -c`, and record each output:
  - `cd /tmp & sleep 0.1; pwd` prints the scratch folder: a `cd` before a single `&` moves nothing;
  - `printf '%s\n' $'a\';b'` prints `a';b`: `$'…'` holds an escaped quote;
  - `printf '%s\n' "a;b" 'c&d' e\;f` prints three words;
  - `printf '%s\n' x 2>&1 | cat` prints `x`;
  - `/bin/sh -c` with the `$'…'` command: record what it prints;
  - the value of `$SHELL`.

  If bash or zsh differs from a belief, stop and record it.
- [ ] Measure, before the change, the loaded hook's run time for `git status`, `npm test`, `cat .ctoc/settings.json`, a
  40-operand `git add`, `git commit -m "a & b"`, and the long `--touches` command. Also measure the run time of
  `node --test tests/protect-records.test.js`. Record the figures for Step 12.
- [ ] Record `git diff --name-only` for the declared files (a read).

### Step 10: IMPLEMENT
- [ ] Make the changes of the File Specifications at the anchors Step 9 recorded:
  - `src/hooks/PreToolUse.Bash.js`: changes 1-6 (the constant, `shellParts`, the two readings and `partsWrite`, the doc
    comment, the `find` line, its comment);
  - `src/lib/real-path-confinement.js`: changes 1-2 (`nameCannotExist`, the condition and its comment);
  - `src/hooks/protect-records.js`: changes 1-6 (the header, the editing test, `SETTINGS_JSON_SPEC` and `SETTINGS_SPECS`,
    `isRegimeFile`'s comment, the two settings expressions);
  - `src/lib/app-runner.js`: the two sentences;
  - `agents/infrastructure/deployment-setup.md`: line 490 and the post-setup list;
  - `docs/ENFORCEMENT.md` waits for Step 15.
- [ ] Run `npm run lint` and `npm run typecheck`: no warning, and the type error count stays at
  `.ctoc/typecheck-baseline.json` `maxErrors`. Confirm `security/detect-unsafe-regex` passes on the new regexes.
- [ ] Run the affected tests and record every result:
  - the four Step 8 files;
  - the dependency's companions: `tests/a-dangling-link-is-not-a-path-inside-the-tree.test.js`;
  - the link and forgery tests: `tests/the-bash-channel-cannot-reach-the-ledger-through-a-link.test.js`,
    `tests/ledger-forgery-closed.test.js`;
  - the shell-hook tests: `tests/pretooluse-bash-coverage.test.js`, `tests/security-bash-hook.test.js`,
    `tests/bash-gate-plan-coverage.test.js`, `tests/hooks.test.js`, `tests/enforcement-fault-arms.test.js`,
    `tests/e2e-enforcement-and-gates.test.js`;
  - the other spawners of the hook: `tests/plans-keep-moving-without-the-human.test.js`,
    `tests/only-the-owner-answers-an-inbox-question.test.js`, `tests/readme-numbers.test.js`;
  - the last-mile readers: `tests/app-runner-coverage-holes.test.js`, `tests/app-runner-coverage.test.js`,
    `tests/app-runner.test.js`, and every test file whose name starts with `step-13-verify`;
  - the readers of the agent file: `tests/ship-gate-real.test.js`, `tests/agent-model-floor.test.js`,
    `tests/architecture-invariants.test.js`, `tests/corpus-audit-ledger.test.js`;
  - the false-green fence `tests/false-green-fence.test.js`.

  Run each only if it exists, and record any that is absent. A failing test is investigated to its cause before
  anything is touched (Step 14's rule). A failing test outside the declared files is a scope-growth request
  (`src/lib/scope-growth.js`), never a silent edit.
- [ ] Run the seventeen mutant checks of the Test Plan. For each one, save a copy outside the checkout, make the change,
  run, record which case fails, write the copy back, and record that the file's sha256 equals the copy's.

### Step 11: REVIEW
- [ ] The critic confirms by tracing the code:
  - each row of S25-1 and S25-2 reaches `REFUSAL_SETTINGS`, and each row of S25-3 is refused by at least one reading;
  - no command refused before is allowed: today's cut runs unchanged as a reading of its own;
  - `shellParts` cuts as bash and zsh do, as Step 9 measured;
  - `.ctoc/settings.json` is refused on both channels for every session;
  - the record specs stay untested by the loaded hook;
  - `nameCannotExist` calls a name absent only where no disk can hold it;
  - the deployment-setup text and the last-mile sentences say what the hook now does;
  - every neighbour's anchor is intact.

### Step 12: OPTIMIZE
- [ ] Measure the same hook runs and the test file's run time after the change, and record both pairs beside Step 9's
  figures.
  - This is a recorded measurement, not a gated test: no time limit is asserted in any test (the owner's rule of
    2026-10-18).
  - A slowdown of more than a few milliseconds per call is recorded as a finding with its cause. The likely causes are
    the second reading and the third spec's link test.
- [ ] Apply the review's findings that change no behaviour.

### Step 13: SECURE
- [ ] The security scanner attacks the settings refusal and confirms the stated limits and the findings. It tries:
  - every separator inside single quotes, double quotes, `$'…'`, after a backslash, and inside `$(…)`, backticks and
    arithmetic;
  - a quote or separator inside a `#` comment or a here-document body, with and without an unmatched apostrophe;
  - every `&` position: before and after a read, a `cd`, a stage, `&>`, `>&`, `<&`, `|&`, `>|`, `2>&1`, and zsh's `&|`
    and `&!`;
  - an output redirect opening a part, after a `cd` and through a link;
  - `find` spellings: each writing option quoted, with a backslash, inside `-exec`, after `--`, and from a parent folder;
  - `.ctoc/settings.json` in every spelling, through a symbolic and a hard link, `..`, letter case and another copy;
  - long names around 255 units and 255 bytes, and whole paths around 1,024 and 4,096 bytes, including one that reaches a
    settings file through a planted link;
  - commit-message forms, ASCII and multi-byte;
  - a background agent's payload for each, and the agent-settings plan's files.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0
  skipped, 0 flaky. Record the test count and the coverage figure.
- [ ] Always investigate failing tests. Every failing test — including one that passes on rerun — is reproduced and root-caused in the product code before anything is reported or merged; 'flaky' is a finding, never an explanation. Fix the code; change the test only when it is proven wrong, with the reason written down.

### Step 15: DOCUMENT
- [ ] `docs/ENFORCEMENT.md`: the seven changes of the File Specifications, at the anchors Step 9 recorded. The
  entry-point section keeps exactly one fenced `json` block naming `entry_point`.
- [ ] Confirm that every one of these describes the rule, its costs and its limits as the code decides them:
  - the hook header and the functions' comments;
  - `real-path-confinement.js`'s comment;
  - `docs/ENFORCEMENT.md`;
  - the deployment-setup paragraph and its post-setup list;
  - the two last-mile sentences.

  Record the search `settings\.json|single &|-delete|-fprint|by hand` over `src/hooks/`, `src/lib/app-runner.js`,
  `src/lib/real-path-confinement.js`, `docs/ENFORCEMENT.md` and `agents/infrastructure/deployment-setup.md`. Explain
  any match the File Specifications do not name, and confirm that no sentence calls `find -delete` closed.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box is checked against the record of Steps 8-15, with these shown under `## Execution Record`:
  - the owner's quoted answers;
  - the dependency check;
  - the red results;
  - the measured file-system and shell beliefs;
  - the mutant results;
  - the measurements;
  - the final suite figures.
