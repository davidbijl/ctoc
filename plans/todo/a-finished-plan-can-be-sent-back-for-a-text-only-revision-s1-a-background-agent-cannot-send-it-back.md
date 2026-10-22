---
title: "A background agent cannot send a finished plan back, nor write its send-back record"
type: implementation
parent_plan: a-finished-plan-can-be-sent-back-for-a-text-only-revision
depends_on: none
created: 2026-10-22
priority: HIGH
files:
  # The one loaded hook: two background-agent refusals that hold whatever RECORD_REFUSALS_OFF says.
  - src/hooks/protect-records.js
  # The enforcement document's rows and fail rule for the two refusals.
  - docs/ENFORCEMENT.md
  # The one test file this slice creates.
  - tests/a-background-agent-cannot-send-a-finished-plan-back.test.js
  # RATCHET FILES — not planned work: the new test file moves the documented test-file count,
  # which CLAUDE.md (Gate 2 requires the declaration) and README.md both state.
  - CLAUDE.md
  - README.md
---

# A background agent cannot send a finished plan back, nor write its send-back record

The hook-refusal slice of "A finished plan can be sent back for a text-only revision". It carries the owner's two hook answers of 2026-10-21 (`.ctoc/streaming/answers.jsonl` lines 268 and 276, option 1 each):
- "Who may send a finished plan back?": only his own reply in the menu; background agents are refused by the write protection.
- "Should a background agent's shell write of the send-back record be refused, whatever the record-refusal switch says?": yes.

Both are hook changes, and they are the ones the owner approved in those two answers. This slice crosses into the build queue on recorded evidence, on the owner's instruction to the CTO Chief, 2026-10-22, to take this plan into the build queue on recorded evidence. `src/hooks/**` is on CTOC's protected list (`src/lib/protected-paths.js` line 70), but that list's human-kind rule is enforced today only by edit hooks Claude Code does not load: the check (`src/lib/plan-coverage.js` lines 613-621) is reached only from `src/hooks/PreToolUse.Bash.js` line 879 and `src/hooks/PreToolUse.Edit.js` lines 733 and 775, and `hooks/hooks.json` registers only `src/hooks/protect-records.js`. The crossing on recorded evidence in `src/lib/streaming-gate.js` has no protected-file condition. That gap is reported to the owner as a CTOC friction, not fixed here (the parent plan, "Decisions Taken Under Ambiguity — technical planning").

## Implementation Details

### Architecture Decision

Both refusals sit in `bashRefuses` beside the sweep-confirmation refusal, before `if (RECORD_REFUSALS_OFF)`, exactly as the owner's sweep rule does (`src/hooks/protect-records.js` lines 1172-1178). The switch stays as it is. The editing tools need no change: a write into `.ctoc/approvals/` and anything beneath it is refused for every caller already (`src/hooks/protect-records.js` lines 1243-1245; `isProtectedLedgerPath`, `src/hooks/PreToolUse.Edit.js` lines 233-254), so the send-back folder `.ctoc/approvals/sent-back/` is guarded from the editing tools from the start. This slice only pins that with a test.

The text test reads command text, the same class of guard as the sweep refusal: it stops mistakes and plain spellings, not a determined agent with a shell (the hook header's own limits, `src/hooks/protect-records.js` lines 129-137).

### Dependency Graph

```
Claude Code PreToolUse (Bash) --> src/hooks/protect-records.js main() (:1289)
  --> decide() (:1222) --> bashRefuses() (:1172)
        [NEW] sendsFinishedPlanBack(command)            --> REFUSAL_FINISHED_SEND_BACK
        [NEW] bash.isLedgerWrite(cwdCommand, SENT_BACK_SPEC) --> REFUSAL (existing sentence, :209-211)
  --> main() catch (:1299-1315)
        [NEW] a crash on a background agent's send-back --> REFUSAL_FINISHED_SEND_BACK
tests/a-background-agent-cannot-send-a-finished-plan-back.test.js --spawns--> the hook with payloads
```

No new module and no new require: `isLedgerWrite` is already reached through `bash` (the exports of `PreToolUse.Bash.js`, `src/hooks/PreToolUse.Bash.js` line 1135, loaded by `decide` at `src/hooks/protect-records.js` line 1255), and `menuCallArgs` is local (:617-649).

### File Specifications

#### File: `src/hooks/protect-records.js`
**Action:** MODIFY
**Purpose:** Refuse a background agent's send-back of a finished plan and its shell write of a send-back record, whatever `RECORD_REFUSALS_OFF` says.
**Change Type:** new-function + modify-existing
**Protected-list status:** on the list (`src/hooks/**`, `src/lib/protected-paths.js` line 70); its human-kind rule is not enforced by any loaded hook (above). Hook logic: yes, the change the owner approved in his answers of 2026-10-21 (`.ctoc/streaming/answers.jsonl` lines 268 and 276).

Changes:
- **Add**, directly after `REFUSAL_SWEEP_EXPANSION` (:224-225):

```js
/** The owner's answer of 2026-10-21: only he sends a finished plan back for a text revision. */
const REFUSAL_FINISHED_SEND_BACK = 'CTOC refused this call because only the owner sends a finished plan back '
  + 'for a text revision; report what in its text should change and let the main session ask him. A command '
  + 'that only mentions both words is refused too: search one word at a time, and commit with git commit -F <file>.';
/**
 * A background agent's send-back of a finished plan, read fail-closed in two readings of the text:
 * quotes and backslashes removed (so `cl\aude:reject` is caught), and backslashes read as `/` with quotes
 * removed (so `plans\done\x.md` is caught). It holds the send-back command or a send-back function
 * (`claude:reject`, `rejectPlan`, `sendFinishedPlanBack`) together with a `done` path segment
 * (`done/`, or `done,` as an argument of `path.join`).
 * @param {string} command
 * @returns {boolean}
 */
const sendsFinishedPlanBack = (command) => [
  command.replace(/["'\\]/g, ''),
  command.replace(/\\/g, '/').replace(/["']/g, ''),
].some((flat) => /claude:reject|rejectPlan|sendFinishedPlanBack/i.test(flat) && /(^|[\s/=:(,])done[/,]/i.test(flat));
```

- **Add**, after `REGIMES_SPEC` (:275-279):

```js
/**
 * The send-back records of finished plans (`.ctoc/approvals/sent-back/`, written by the menu's
 * text-revision send-back, src/lib/text-revision.js), for a background agent's shell. The owner's
 * answer of 2026-10-21: refused whatever RECORD_REFUSALS_OFF says, because the menu admits a revised
 * plan into done on that record alone. `isLedgerWrite`'s spec shape (src/hooks/PreToolUse.Bash.js :226-231).
 */
const SENT_BACK_SPEC = Object.freeze({
  dir: '.ctoc/approvals/sent-back',
  segmentRe: /(^|[^a-z0-9._-])\.ctoc\/+approvals\/+sent-back(\/|\s|$)/i,
  resolvedRe: /(^|\/)\.ctoc\/+approvals\/+sent-back(\/|$)/i,
});
```

- **Modify** `bashRefuses` (:1172-1214). Lines :1173-1178 become:

```js
  // Owner, 2026-10-18: only the human confirms a sweep. Holds whatever RECORD_REFUSALS_OFF says.
  if (subagent && confirmsSweep(command)) return REFUSAL_SWEEP_CONFIRM;
  // Owner, 2026-10-21: only the owner sends a finished plan back for a text revision, and a background
  // agent never writes a send-back record on the shell. Both hold whatever RECORD_REFUSALS_OFF says.
  if (subagent && sendsFinishedPlanBack(command)) return REFUSAL_FINISHED_SEND_BACK;
  if (subagent) {
    const bypass = sweepBypassRefusal(command, base) || expansionRefusal(command);
    if (bypass) return bypass;
    // A genuine pure call of this plugin's own menu keeps its arguments as data, as for the settings files (:1187).
    if (!menuCallArgs(command, base)) {
      const cwdCommand = cwdRel ? `cd ./${cwdRel} && ${command}` : command;
      if (bash.isLedgerWrite(cwdCommand, SENT_BACK_SPEC)) return REFUSAL;
    }
  }
```

  Everything from the switch on (:1179-1213) is unchanged.
- **Modify** `main`'s fail rule (:1305-1312). After the sweep branch, add `} else if (parsed && isSubagent(payload) && sendsFinishedPlanBack(scanned)) { refuse(REFUSAL_FINISHED_SEND_BACK);` before the `UNCHECKED_SUSPECT_RE` branch, so a crash on a background agent's send-back refuses with its own sentence. `scanned` is the JSON of the tool input, whose quotes are escaped with backslashes; both readings of `sendsFinishedPlanBack` remove them.
- **Modify** the header comment's "WHAT IT REFUSES" (:111-114): one paragraph after the sweep paragraph, naming the send-back refusal, its two readings, the record-folder refusal for a background agent's shell, and that both hold whatever `RECORD_REFUSALS_OFF` says; and in "FAIL RULE" (:190-195) one clause for the crash on a background agent's send-back.

Error handling: both checks are pure text work except `isLedgerWrite`, which already charges the decision's count of work and refuses when it is spent (`src/hooks/PreToolUse.Bash.js` lines 422-443). Nothing new can throw: `sendsFinishedPlanBack` runs regular expressions on a string `decide` has already checked (:1251-1254).

#### File: `docs/ENFORCEMENT.md`
**Action:** MODIFY
**Purpose:** The two refusals, where the agent refusals are documented.

- In the table "Refused when the call carries an `agent_id`" (:488-500), after the sweep row (:499), add a row:
  `| \`claude:reject done/<file>.md review …\`; and any command whose text, read with quotes and backslashes removed or with backslashes read as \`/\`, holds \`claude:reject\`, \`rejectPlan\` or \`sendFinishedPlanBack\` together with a \`done\` path segment (\`done/\` or \`done,\`) | only the owner sends a finished plan back for a text revision (owner, 2026-10-21). Refused with its own sentence whatever \`RECORD_REFUSALS_OFF\` says ("CTOC refused this call because only the owner sends a finished plan back for a text revision; …"). A background agent's shell write into \`.ctoc/approvals/sent-back/\` (the send-back records the menu admits a revised plan on) is refused with the record sentence, also whatever that switch says; a genuine pure call of the menu keeps its arguments as data. Same class of guard as the sweep row: it reads command text, so a script file the agent writes and runs, or a folder-level copy into \`.ctoc/approvals/\`, is not caught |`
- In **Fail rule** (:529-538), after the sweep sentence: "A crash on a background agent's call whose tool input holds a finished plan's send-back, read as above, refuses with that send-back sentence."

#### Files: `CLAUDE.md` and `README.md`
**Action:** MODIFY (count lines only). Step 15 runs the release script's two count functions (`updateDocCountsInClaudeMd`, `updateDocCountsInReadme`, `src/scripts/release.js` lines 390 and 404); only count lines may differ.

### Test Plan

**File:** `tests/a-background-agent-cannot-send-a-finished-plan-back.test.js` (CREATE). **Framework:** `node:test`, `node:assert/strict`. The hook is spawned with `process.execPath` and a JSON payload on standard input, the helpers of `tests/protect-records.test.js` lines 32-79 copied (`makeProject`, `payload`, `run`, `assertRefused`), with `agent_id: 'a1b2c3'` for a background agent (:409). No timing.

Every case names its first-run result before any source change.
1. **A background agent's plain send-back is refused** (red: allowed today). `node "<plugin>/src/commands/start.js" claude:reject done/x.md review --stdin` as an agent gives exit 2 and exactly `REFUSAL_FINISHED_SEND_BACK` on stderr.
2. **The here-document form is refused** (red). The same with `<<'CTOC_ANSWER_reject_0123456789abcdef'`, a reason line and the closing marker.
3. **Inline code is refused** (red). `node -e "require('./src/lib/actions').rejectPlan('plans/done/x.md','r')"` and the `path.join(root,'plans','done','x.md')` spelling.
4. **Shell escapes and Windows separators are refused** (red). `cl\aude:reject done/x.md review` and `node -e "...rejectPlan('plans\\done\\x.md')"`.
5. **The main session is not refused** (green, a pin). Cases 1 and 2 without `agent_id` exit 0 with empty stdout.
6. **Searches that name one word are allowed for an agent** (green, a pin). `grep -n "claude:reject" src/lib/streaming-gate.js`, `ls plans/done/`, `grep -rn rejectPlan src/lib/actions.js` exit 0.
7. **A command naming both words is refused for an agent** (red, the accepted false refusal). `git commit -m "claude:reject done/x"` is refused with the send-back sentence.
8. **An agent's shell write of a send-back record is refused** (red). As an agent: `echo {} > .ctoc/approvals/sent-back/x.json`, `mkdir -p .ctoc/approvals/sent-back`, `cd .ctoc/approvals && cp /dev/null sent-back/x.json`, and a symbolic link `lnk` to `.ctoc/approvals` with `echo {} > lnk/sent-back/x.json`. Each is refused with `REFUSAL`.
9. **Reading the record is allowed** (green, a pin). `cat .ctoc/approvals/sent-back/x.json` as an agent exits 0.
10. **The main session's shell write is not refused** (green, a pin of the switch): the case-8 commands without `agent_id` exit 0. The test names this as the residual the owner accepted (the switch at :1170).
11. **The editing tools are refused for everyone** (green, a pin). Write, Edit, MultiEdit and NotebookEdit to `.ctoc/approvals/sent-back/x.json`, with and without `agent_id`, are refused with `REFUSAL`.
12. **A crash on an agent's send-back refuses with its own sentence** (red). The fault seam of test 81 in `tests/protect-records.test.js` (lines 389-403): the hook is copied into a temporary plugin folder with only `src/lib/hook-deny-signal.js` beside it (lines 390-396), so `decide`'s first unguarded require, `require('../lib/project-root')` (`src/hooks/protect-records.js` line 1223), fails before the shell branch is reached, and `main`'s fail rule (lines 1299-1315) catches it. Run as an agent with case 1's command: exit 2 and the send-back sentence; the same without `agent_id`: allowed, as test 81's main-session half is.
13. **The sweep refusal still wins for a sweep command** (green, a pin): an agent's `menu task sweep --confirm a@0123456789ab` gives the sweep sentence.
14. **A pure menu call naming the folder as data is not refused for the record write** (green): an agent's `node "<plugin>/src/commands/start.js" menu task complete t1 --summary 'wrote nothing in .ctoc/approvals/sent-back'` is not refused by the new record check.

**Coverage target:** every new line and both arms of every new condition: both readings of `sendsFinishedPlanBack` (cases 3, 4), the menu-call skip (case 14), the record check (case 8), the crash branch (case 12). The suite floor is `.ctoc/coverage-baseline.json` `minPct`.

### Security Review

| Check | Result |
|---|---|
| Path traversal | Pass. No path is joined from input by the new code; `isLedgerWrite` resolves operands as it does for every protected folder, `..` and links included. |
| Input validation | Pass. The command is a string (checked at :1253). |
| Command injection | Pass. Nothing is run; only text is read. |
| No secrets | Pass. |
| Fail direction | Pass. A crash on an agent's send-back refuses (case 12); a spent count of work refuses (`isLedgerWrite`). |
| Residuals, stated | A script file the agent writes and runs; a folder-level copy into `.ctoc/approvals/` that creates `sent-back/`; a path built at run time. The main session's shell write is not refused while the switch is off. These are the owner's accepted limits (his answer's own cons: "it narrows the way into done rather than closing it"). |
| Regular-expression cost | Linear: two anchored alternations with no nested quantifier, over text already bounded by the decision's work count. |

## Wiring — the live call sites

- **The root.** `hooks/hooks.json` registers `node "${CLAUDE_PLUGIN_ROOT}/src/hooks/protect-records.js"` on `PreToolUse` for Write, Edit, MultiEdit, NotebookEdit and Bash (lines 4-13). Claude Code runs it before every such call.
- **The call sites.** `main()` (:1289) → `decide()` (:1222) → `bashRefuses()` (:1258 calls it) → `sendsFinishedPlanBack` and the `SENT_BACK_SPEC` check; and `main()`'s catch (:1299) → `sendsFinishedPlanBack`.
- No export is added, so the export-reachability fence is unaffected.
- A session runs the installed plugin's copy of the hook, so the refusal holds in a session only after CTOC is updated and Claude Code restarted (the same note as the sweep row, `docs/ENFORCEMENT.md` line 499).

## Decisions Taken Under Ambiguity — technical planning

- **The send-back is recognised by command text, in two readings.** Mirrors `confirmsSweep` (`src/hooks/protect-records.js` lines 220-223), the owner's own precedent, and adds the backslash-as-`/` reading because the first reading would turn `plans\done\x.md` into `plansdonex.md`.
- **The record folder gets its own `isLedgerWrite` spec and the existing record sentence.** The spec shape is the one every protected folder uses (`src/hooks/PreToolUse.Bash.js` lines 226-231; `REGIMES_SPEC`, `src/hooks/protect-records.js` lines 275-279). A pure menu call is skipped, as the settings check skips it (:1187), because the menu is the legitimate writer and its arguments are data.
- **The folder name is a literal in the hook, not imported.** The hook loads as little as it can (its fail rule depends on that, :184-196); the second-finish slice's test pins that the literal equals the folder `src/lib/text-revision.js` writes.
- **No change to the editing tools.** They already refuse `.ctoc/approvals/` and every path beneath it for every caller (:1243-1245).

## Execution Plan

### Step 8: TEST
- [ ] Write `tests/a-background-agent-cannot-send-a-finished-plan-back.test.js` exactly as the Test Plan says, before any source change.
- [ ] Run `node --test tests/a-background-agent-cannot-send-a-finished-plan-back.test.js`. Record per case red with the reason named, or green where the plan says green (5, 6, 9, 10, 11, 13, 14). A case green where red is expected does not test the change: fix the case first.

### Step 9: PREPARE
- [ ] Re-read every cited line of `src/hooks/protect-records.js`, `src/hooks/PreToolUse.Bash.js` and `docs/ENFORCEMENT.md`. Where the code differs from this plan, follow the code and record the difference here.
- [ ] Re-read test 81 of `tests/protect-records.test.js` (lines 389-403), the fault seam case 12 copies, and the sweep's own crash case, test 101 (lines 2284-2294). Where either moved, record the new lines here.
- [ ] Run `node --test tests/protect-records.test.js` and record the result as the baseline.

### Step 10: IMPLEMENT
- [ ] `src/hooks/protect-records.js`: `REFUSAL_FINISHED_SEND_BACK`, `sendsFinishedPlanBack`, `SENT_BACK_SPEC`, the `bashRefuses` lines, the fail-rule branch and the header paragraphs, exactly as specified.
- [ ] Rerun the Step 8 file until every case is green, then the Step 9 baseline. An existing assertion that now fails is read before anything changes; the code is wrong until proven otherwise.

### Step 11: REVIEW
- [ ] Dispatch `iron-loop-critic` with these attacks: a spelling of the send-back an agent can type that neither reading catches and no earlier check refuses; a send-back record write by an agent's shell that `isLedgerWrite` misses; an ordinary build-agent command this refuses (the builders of this plan's later slices run `node --test` and `grep`); any path by which the main session is now refused.

### Step 12: OPTIMIZE
- [ ] Confirm the added work per agent Bash call: two string replacements and two regular-expression tests, and one `isLedgerWrite` pass, charged to the decision's count. No change is expected.

### Step 13: SECURE
- [ ] Dispatch `security-scanner` on the diff with the Security Review table; scope: both refusals hold whatever `RECORD_REFUSALS_OFF` says, fail direction on a crash, no new require on the hook path, linear expressions.

### Step 14: VERIFY
- [ ] Run `npm test`: `# fail 0`, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [ ] Run `npx eslint --max-warnings 0 src/hooks/protect-records.js tests/a-background-agent-cannot-send-a-finished-plan-back.test.js` and `npm run typecheck`: both clean.
- [ ] Run `node --test tests/protect-records.test.js tests/export-reachability.test.js tests/false-green-fence.test.js tests/gate-numbers-fence.test.js`: all green, no baseline changed.

### Step 15: DOCUMENT
- [ ] The header paragraphs of `src/hooks/protect-records.js` and the two `docs/ENFORCEMENT.md` additions as specified.
- [ ] Update the count lines with `node -e "const r=require('./src/scripts/release.js');console.log(JSON.stringify([r.updateDocCountsInClaudeMd(process.cwd()),r.updateDocCountsInReadme(process.cwd())]))"`. Read the diff of `CLAUDE.md` and `README.md`: only count lines differ, and `CLAUDE.md` stays at or under 15,000 bytes.

### Step 16: FINAL-REVIEW
- [ ] Dispatch `iron-loop-critic` against the parent plan's scenario "A background agent's send-back is refused" and the owner's two answers; each box quotes the test that proves it and its result.
- [ ] Put in front of the owner, from the built tree, the refusal an agent's send-back gets and the refusal an agent's shell write of a send-back record gets.
