---
title: "A finished plan's screen offers the text revision"
type: implementation
parent_plan: a-finished-plan-can-be-sent-back-for-a-text-only-revision
depends_on: a-finished-plan-can-be-sent-back-for-a-text-only-revision-s2-the-send-back-command
created: 2026-10-22
priority: HIGH
files:
  # The option's words, in the one module that encodes every human-facing gate phrase.
  - src/lib/gate-words.js
  # The finished plan's screen offers it.
  - src/lib/streaming-gate.js
  # One clause naming the new screen option in the recipe the send-back-command slice wrote.
  - src/commands/start.md
  # The build-queue plan's B2 pin of the finished plan's screen, updated to the new option.
  - tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js
  # The one test file this slice creates.
  - tests/a-finished-plans-screen-offers-a-text-revision.test.js
  # RATCHET FILES — not planned work: the new test file moves the documented test-file count,
  # which CLAUDE.md (Gate 2 requires the declaration) and README.md state.
  - CLAUDE.md
  - README.md
---

# A finished plan's screen offers the text revision

The screen-offer slice of "A finished plan can be sent back for a text-only revision". It carries the parent scenario "A finished plan's screen offers the text revision". The session's recipe, which carries the owner's answer "Only your own reply in the menu" (`.ctoc/streaming/answers.jsonl` line 268), ships with the send-back-command slice; this slice adds one clause to it naming the new screen option. The hook-refusal slice refuses a background agent in code. Code cannot tell the main session's own decision from the owner's reply (his answer's own cons), so the recipe carries that rule.

Protected-list status:
- `src/lib/streaming-gate.js` is on the list (`src/lib/protected-paths.js` line 65). This slice crosses into the build queue on recorded evidence, on the owner's instruction to the CTO Chief, 2026-10-22; the list's human-kind rule is enforced today only by edit hooks Claude Code does not load (the parent plan, "Decisions Taken Under Ambiguity — technical planning").
- `src/lib/gate-words.js` and `src/commands/start.md` are not on it.
- No hook file and no approval record is edited.

Technical order (a fact, not a schedule): this slice and the checks-again slice both edit `planDecisionScreen` (`src/lib/streaming-gate.js`, its gate and lifecycle branches at lines 1705-1788; the function starts at line 1616) and `src/commands/start.md`, and no `depends_on` edge joins them. They are not built in parallel, in either order; whichever is built second re-reads both at its Step 9.

## Implementation Details

### Architecture Decision

- **The words go into `gate-words.js`**, the module that is "the ONE encoding of every human-facing phrase for a gate moment" (`src/lib/gate-words.js` lines 16-19), beside `SEND_BACK` (lines 154-165), in the same shape: `label` and `description` for the person, `toStage` for the action string only.
- **The offer goes into the lifecycle branch of `planDecisionScreen`** (`src/lib/streaming-gate.js` lines 1773-1788). That is where the build-queue plan's send-back was added, and where a finished plan's screen lands: done is not a decision stage (`GATE_META`, lines 82-86).
- **A decomposed vision archive is not offered it.** The send-back-command slice refuses to send one back; offering a refused option would be the defect the screen's own rule removes ("an option that validation has already refused is not offered", lines 1716-1721).

### Dependency Graph

```
/ctoc:start --> node src/commands/start.js plan done/<file>.md --> route() case 'plan' (menu-screens.js :3456-3462)
  --> streaming-gate.planDecisionScreen()  [MODIFY: the lifecycle branch offers the text revision]
        --> gateWords.TEXT_REVISION         [NEW]
        --> text-revision.isVisionArchive   (the send-back-command slice)
the option's action `claude:reject done/<file>.md review` --> the session's recipe (start.md, the send-back-command slice) [MODIFY: names the option]
  --> node src/commands/start.js claude:reject done/<file>.md review --stdin   (the send-back-command slice)
```

### File Specifications

#### File: `src/lib/gate-words.js`
**Action:** MODIFY
**Purpose:** The words of the one way a finished plan is sent back.
**Change Type:** new constant
**Protected-list status:** not on the list.

- **Add**, after `SEND_BACK` (lines 154-165):

```js
/**
 * The one way a FINISHED plan is sent back: for a change of its text only. `toStage` is the machine
 * identifier for the action string (the stage before done, where the send-back-command slice's command sends it); `label`
 * and `description` carry the words a person reads, and neither of them names a stage.
 */
const TEXT_REVISION = Object.freeze({
  label: 'Send it back for a text revision',
  description: 'It goes back for a change of its text only, such as private paths becoming placeholders, and finishes again once its checks pass. A change of code or scope is a new plan.',
  toStage: 'review',
});
```

- **Update** `module.exports` (lines 167-174): add `TEXT_REVISION` (caller: `streaming-gate.planDecisionScreen`).

#### File: `src/lib/streaming-gate.js`
**Action:** MODIFY
**Purpose:** A finished plan's screen offers "Send it back for a text revision".
**Change Type:** modify-existing
**Protected-list status:** protected.

- **Import** `const { isVisionArchive } = require('./text-revision');` after line 48. `text-revision` requires nothing that requires `streaming-gate` (the send-back-command slice's load-time edges).
- **Modify** the lifecycle branch (lines 1773-1788):

```js
  } else {
    // 3. Not at a gate and nothing precomputed: the plan-lifecycle decision.
    //    A plan waiting in the build queue can also be sent back to be re-planned, and a finished
    //    plan (not a decomposed vision) for a revision of its text (sendBackCommand runs both actions).
    const options = [
      { label: 'Discuss', description: 'EXTREME adversarial critique — nothing held back. The most important step.' },
      { label: 'View/Edit', description: 'Show the plan, then edit it' },
      { label: 'Delete', description: 'Remove this plan permanently' },
    ];
    const revisable = stage === 'done' && !isVisionArchive(content);
    if (stage === 'todo') options.push({ label: BUILD_QUEUE_SEND_BACK.label, description: BUILD_QUEUE_SEND_BACK.description });
    if (revisable) options.push({ label: gateWords.TEXT_REVISION.label, description: gateWords.TEXT_REVISION.description });
    questions.push({ question: `What should happen to ${name}?`, header: name, options });
    actions['Discuss'] = 'claude:discuss';
    actions['View/Edit'] = `claude:view-edit ${stage}/${file}`;
    actions['Delete'] = `claude:delete ${stage}/${file}`;
    if (stage === 'todo') actions[BUILD_QUEUE_SEND_BACK.label] = `claude:reject ${stage}/${file} ${BUILD_QUEUE_SEND_BACK.toStage}`;
    if (revisable) actions[gateWords.TEXT_REVISION.label] = `claude:reject ${stage}/${file} ${gateWords.TEXT_REVISION.toStage}`;
  }
```

  The ride-along (lines 1793-1810) then finds all three lifecycle labels taken and adds no second question. The question has four options, the most the asking tool takes.

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** The recipe the send-back-command slice wrote names the new screen option as the second way the owner asks for the send-back.
**Protected-list status:** not on the list.

The row and the subsection "Sending a finished plan back for a text revision — only on the owner's own reply" exist since the send-back-command slice; this slice changes two sentences in them and nothing else.
- Row `claude:reject` (line 63 before the send-back-command slice; re-read at Step 9): "A finished plan (`done/{file}.md review`)" becomes "A finished plan (`done/{file}.md review`, the "Send it back for a text revision" option on its screen)".
- The subsection's step 1: "asked in his own words to send that finished plan back" becomes "chose the "Send it back for a text revision" option on that plan's screen, or asked in his own words to send that finished plan back". Its step 2's "Take `<file>` only from the plan's own name in `plans/done/`" gains "or from the option's action string".

#### File: `tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js`
**Action:** MODIFY (one expectation)
- B2 (lines 265-319): the expectation for `done/d.md` (line 310) becomes the lifecycle question with four options, the fourth `{ label: 'Send it back for a text revision', description: <TEXT_REVISION.description> }`, and the actions gain `'Send it back for a text revision': 'claude:reject done/d.md review'`. The comment says why: "Updated by the screen-offer slice of 'A finished plan can be sent back for a text-only revision': a finished plan's screen now offers the text revision; the build-queue send-back is still offered nowhere but the build queue (asserted below, unchanged)." The `WRONG_WAY` assertion (line 317) is unchanged, so B2 still proves the build-queue option appears on no other stage.

#### Files: `CLAUDE.md` and `README.md`
**Action:** MODIFY (count lines only), through the release script's two count functions at Step 15.

### Test Plan

**File:** `tests/a-finished-plans-screen-offers-a-text-revision.test.js` (CREATE). **Framework:** `node:test`, `node:assert/strict`, on real temporary projects; helpers copied from the send-back-command slice's test file (`makeSandbox`, `finishedPlan`, `runMenu`); `STAGE_WORD` as in the build-queue plan's test (line 43). No timing.

Every case names its first-run result before any source change.
- **H1 scenario: a finished plan's screen offers the text revision** (red: three options today). A finished plan titled "Placeholders replace private paths", with its human-kind approval record and no question waiting. `route(['plan', 'done/placeholders.md'], root)`:
  - one question, whose option labels are exactly `['Discuss', 'View/Edit', 'Delete', 'Send it back for a text revision']`;
  - the last description holds "text only" and "A change of code or scope is a new plan";
  - `actions['Send it back for a text revision'] === 'claude:reject done/placeholders.md review'`;
  - no option label or description matches `STAGE_WORD`.
- **H2 a decomposed vision archive is not offered it** (green, a pin of today's three options). `type: vision` in `done/` gives `['Discuss', 'View/Edit', 'Delete']` and no `claude:reject` action.
- **H3 the other stages keep their options** (green, a pin). `todo/` gives the build-queue plan's four options; `in-progress/` gives three; `review/` gives "Check validation" and the two review send-backs, character for character as `tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js` B3 pins them.
- **H4 the option's action runs end to end** (spawned; red). H1's action split into words, `--stdin` appended, run through `runMenu` with the reason `replace private paths with placeholders\n`: `ok === true`, the plan is in `review/`, and the result line names the plan.
- **H5 the destination agrees with the command** (red: `TEXT_REVISION` does not exist). `gateWords.TEXT_REVISION.toStage === gateOrder.STAGE_ORDER[gateOrder.STAGE_ORDER.indexOf('done') - 1]`.
- **H6 the recipe names the option** (red: the clause does not exist). In `src/commands/start.md`, the `claude:reject` row and step 1 of "Sending a finished plan back for a text revision — only on the owner's own reply" each hold "Send it back for a text revision", equal to `gateWords.TEXT_REVISION.label`. The recipe's command shape is pinned by the send-back-command slice's F19, which this slice leaves green.

**Coverage target:** both arms of `revisable` and of the vision test. The suite floor is `.ctoc/coverage-baseline.json` `minPct`.

### Security Review

| Check | Result |
|---|---|
| Who runs it | The recipe limits it to the owner's own reply; the hook-refusal slice's hook refuses a background agent. The main session's own decision is ruled out by instruction only, the same trust as his approve today (the owner's answer, `.ctoc/streaming/questions/functional__a-finished-plan-can-be-sent-back-for-a-text-only-revision.md.json`, the cons of the recommended option to "Who may send a finished plan back to review for a text-only revision?"). |
| Command injection | Pass. The action string carries a reference `parseAnyRef` accepted (`SAFE_PLAN_FILE`, `src/lib/streaming-gate.js` line 98); the reason travels on standard input in the quoted here-document of the send-back-command slice's recipe, which this slice does not change. |
| Terminal injection | Pass. The plan's name passes `humanPlanName` and `stripCtl` as every lifecycle question's name does. |
| No secrets | Pass. |

## Wiring — the live call sites

- **The offer.** `/ctoc:start` → `src/commands/start.md` → `node src/commands/start.js plan done/<file>.md` → `main()` → `route()` case `plan` (`src/lib/menu-screens.js` lines 3456-3462) → `streamingGate.planDecisionScreen` → the lifecycle branch → `gateWords.TEXT_REVISION`, `textRevision.isVisionArchive`.
- **The action** `claude:reject done/<file>.md review` is run by the session through the recipe the send-back-command slice wrote, with `--stdin` and the reason, into that slice's command.
- **The new export** is `TEXT_REVISION` (caller: `streaming-gate`).

## Decisions Taken Under Ambiguity — technical planning

- **The option's words name no stage.** The parent scenario asks the description to say it returns to review for a change of its text only, and also that no label or description names a stage folder. "It goes back for a change of its text only … and finishes again once its checks pass" says both without the folder word, as the review screen's own send-back words do (`src/lib/gate-words.js` lines 156-163).
- **`toStage` is a literal in `gate-words.js`, pinned to the stage order by H5.** `gate-words` is "deliberately NOT dependent on gate-order" (lines 37-40); the test keeps the two from drifting.
- **The recipe moved to the send-back-command slice; this slice only names its option in it.** Until the command existed, start.md's `claude:reject` row sent a finished plan to "the conversation, as before", a hand edit; so the row and the subsection now ship with the command. The recipe forbids the session's own decision, unlike the build-queue recipe (`src/commands/start.md` line 461), as the owner chose "Only your own reply in the menu".
- **The text change itself is left to the session's normal editing.** The recipe states the one rule that matters, text only; the check at the finish (the text-only-check slice) enforces it.
- **No order is set against the checks-again slice.** Both edit `planDecisionScreen` and `src/commands/start.md` but neither needs the other's code; the fact is stated above, and the order is the owner's.

## Execution Plan

### Step 8: TEST
- [ ] Write `tests/a-finished-plans-screen-offers-a-text-revision.test.js` and the B2 expectation change exactly as the Test Plan says, before any source change.
- [ ] Run `node --test tests/a-finished-plans-screen-offers-a-text-revision.test.js tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js`. Record per case red with its reason, or green where marked (H2, H3). B2 is red until the option exists.

### Step 9: PREPARE
- [ ] Re-read every cited line of `src/lib/gate-words.js`, `src/lib/streaming-gate.js`, `src/lib/menu-screens.js` and `src/commands/start.md` (the row and subsection the send-back-command slice wrote). If the checks-again slice is already built, re-read its changes to `planDecisionScreen` and to `src/commands/start.md` before editing either. Where the code differs, follow the code and record the difference.
- [ ] Search `tests/` for a pin of a finished plan's screen (patterns `What should happen to`, `'plan', 'done/` and `planDecisionScreen\('done/`), and read each match. At planning time the only pin was the build-queue plan's B2 (`tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js` line 272, used for `done/d.md` at line 310); the `plan done/…` strings in `tests/menu-task-wiring.test.js` lines 927-1044 are navigation routes, not screen pins. Any new pin found is named here and tightened the same way, with its reason.
- [ ] Run `node --test tests/streaming-gate.test.js tests/plan-question-screen.test.js tests/gate-numbers-fence.test.js tests/instruction-surfaces-say-the-moment.test.js tests/a-finished-plan-is-sent-back-for-a-text-revision.test.js` and record the baseline.

### Step 10: IMPLEMENT
- [ ] `src/lib/gate-words.js`: `TEXT_REVISION` and its export.
- [ ] `src/lib/streaming-gate.js`: the import and the lifecycle branch.
- [ ] `src/commands/start.md`: the option named in the row and in the subsection's steps 1 and 2.
- [ ] Rerun the Step 8 files until green, then the Step 9 baseline. An existing assertion that fails is read before anything changes; the code is wrong until proven otherwise.

### Step 11: REVIEW
- [ ] Dispatch `iron-loop-critic` with these attacks: a stage whose screen changed besides done; a finished plan that should be offered it and is not, or the reverse; words a person reads that name a stage or a gate number; a recipe reading that lets the session send a finished plan back without the owner's reply.

### Step 12: OPTIMIZE
- [ ] Confirm the offer costs one `parseMetadata` of content already read, for a plan in done only. No change is expected.

### Step 13: SECURE
- [ ] Dispatch `security-scanner` on the diff with the Security Review table; scope: the action string's reference, the option name added to the recipe, terminal injection through the name.

### Step 14: VERIFY
- [ ] Run `npm test`: `# fail 0`, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [ ] Run `npx eslint --max-warnings 0 src/lib/gate-words.js src/lib/streaming-gate.js tests/a-finished-plans-screen-offers-a-text-revision.test.js tests/a-build-queue-plan-can-be-sent-back-and-keeps-its-title.test.js` and `npm run typecheck`: both clean.
- [ ] Run `node --test tests/export-reachability.test.js tests/gate-numbers-fence.test.js tests/instruction-surfaces-say-the-moment.test.js tests/false-green-fence.test.js`: all green, no baseline changed.

### Step 15: DOCUMENT
- [ ] The JSDoc of `TEXT_REVISION`, the comment of the lifecycle branch, and the start.md clauses as specified.
- [ ] Update the count lines with `node -e "const r=require('./src/scripts/release.js');console.log(JSON.stringify([r.updateDocCountsInClaudeMd(process.cwd()),r.updateDocCountsInReadme(process.cwd())]))"`. Read the diff of `CLAUDE.md` and `README.md`: only count lines differ, and `CLAUDE.md` stays at or under 15,000 bytes.

### Step 16: FINAL-REVIEW
- [ ] Dispatch `iron-loop-critic` against the parent's scenario "A finished plan's screen offers the text revision"; each box quotes the test that proves it and its result.
- [ ] Put in front of the owner, from the built tree on a temporary project, a finished plan's screen with the new option, in full.
