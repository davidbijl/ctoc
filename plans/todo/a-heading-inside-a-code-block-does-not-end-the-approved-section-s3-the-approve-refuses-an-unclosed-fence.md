---
title: "The owner's approve refuses a plan with an unclosed code fence before it changes anything, naming the line in the file he sees"
type: implementation
parent_plan: a-heading-inside-a-code-block-does-not-end-the-approved-section
depends_on: a-heading-inside-a-code-block-does-not-end-the-approved-section-s2-the-corrected-reading-and-its-stamp
priority: HIGH
effort: small
files:
  - "src/lib/actions.js"
  - "tests/plans-keep-moving-without-the-human.test.js"
---

# The owner's approve refuses a plan with an unclosed code fence before it changes anything, naming the line in the file he sees

**Scope (one line):** in `approvePlan`, refuse a plan whose code fence is never closed before anything is moved or written, with a refusal that names the fence's line in the plan file as it is on disk; and prove, through the real menu, that the continuation leaves such a plan in the questions the owner is asked and writes no record.

Read first, in full: the parent plan (`plans/implementation/a-heading-inside-a-code-block-does-not-end-the-approved-section.md`) and slice 2 (`a-heading-inside-a-code-block-does-not-end-the-approved-section-s2-the-corrected-reading-and-its-stamp.md`, in whichever folder under `plans/` holds it), whose rule R3 this slice relies on.

## Implementation Details

### Why this slice exists

After slice 2, the writer refuses an unclosed fence and names its line (slice 2, rule R3 and `resolveHash`). On the owner's approve route that line is wrong:
- `stampAndLedger` hashes `destContent`, the plan with the approval marker upserted into its frontmatter (`src/lib/actions.js` lines 328–329 and 347–369; `addApprovalMarker`, lines 274–285).
- `upsertMarkerFields` adds the marker lines to the frontmatter, flattens stacked blocks, and creates a block for a plan without one (`src/lib/frontmatter-merge.js` lines 258–272). Every body line, the fence included, can move.
- The writer's throw then rolls the plan back to the bytes `stampAndLedger` read (`src/lib/actions.js` lines 391–403), and `streamApprove` shows "Could not approve <file>: …" with the line counted in the stamped text (`src/lib/streaming-gate.js` lines 2367–2381). The owner opens the file and the line does not match.
- On the approve into the build queue it is worse: `approvePlan` runs `applyIronLoop` on the source file before `stampAndLedger` (`src/lib/actions.js` lines 504–506), and `stampAndLedger` reads the plan after that (line 328), so the rollback restores a plan that already carries the appended Steps 8 to 16. The refused plan is not left as it was.

The parent's scenario "an unclosed code fence is refused" asks for the line; the parent's risk mitigation asks that the refusal "name the fence's line … so the builder closes it". This slice makes that true on the owner's route.

### File: `src/lib/actions.js`

**Action:** MODIFY. **Change:** in `approvePlan` (line 423), inside the `if (isHumanGate)` block that already loads the approval ledger and refuses an un-keyable slug (lines 479–493), directly after that refusal and before `clearStatus` (line 496) and `applyIronLoop` (lines 504–506):
- read the plan file once (`safeFs.readFileSync(planPath, 'utf8')`) and call `ledger.computeSpecHash` on it;
- when the result is `ok: false` with reason `unclosed-code-fence`, return, without any mutation, `{ ok: false, refused: true, reason: '<from>→<to> refused: the code fence opened on line N is never closed, so the approval cannot be recorded; close it and approve again', failures: ['unclosed code fence'], validation: null }`, with N the result's `line`;
- every other result falls through to today's code unchanged.

It runs after the validation refusal (lines 448–464) and also under an override: an override cannot record a binding that does not exist. The return shape is the one the validation and slug refusals already use, which `streamApprove` renders as "Refused <file>: <reason>" (`src/lib/streaming-gate.js` lines 2369–2370).

Error handling: a read failure throws, as the read in `stampAndLedger` (line 328) does today; nothing has been changed when it does.

### File: `tests/plans-keep-moving-without-the-human.test.js`

**Action:** MODIFY. Two new cases beside "B6c — a specification that cannot be bound (no frontmatter)" (lines 2312–2334), reusing that file's `makeSandbox`, `writePlan`, `writeQuestions`, `functionalBody`, `implBody` (line 69), `exists`, `noReadyLine` and `route`:

- **B6d — a specification with an unclosed code fence: not ready, asked, the continuation leaves it, and the owner's approve is refused naming the line in the file.**
  - The plan: `functionalBody('Open fence')`, then a `## Decisions Taken Under Ambiguity` section whose last lines open a three-backtick block that is never closed. The fence's line, L, is computed in the test from the text (1-based), never written as a number.
  - Fixture preconditions, as B6c states its own: `ledger.computeSpecHash(text)` is `ok: false` with reason `unclosed-code-fence` and line L; the pending decision has `enough === true` and `passesValidation === true`, so only the fence keeps it from moving.
  - The default screen asks it and shows no ready line; `menuScreens.continueAfterCrossing(root)` leaves it in `functional/` and `ledger.readEntry` is `null` (the crossing refusal at `src/lib/streaming-gate.js` line 906 agrees with the writer).
  - `route(['stream', 'approve', 'functional/<file>.md'], root)`: the screen text starts with `Refused <file>.md:`, names "line L" and says the code fence is never closed; the plan file is byte-identical to its bytes before the approve, still in `functional/`; no record exists.
  - Red on slice 2's code alone: the approve shows "Could not approve …" with the line counted in the stamped text.
- **B6d, second case — an implementation plan approved into the build queue is refused, stays byte-identical, and gets no Steps appended.**
  - The plan: `implBody('Open fence slice', ['src/open-fence.js'], extra)`, the fixture shape the GDPR case already crosses from implementation into the build queue (lines 1628–1635), with `extra` a `## Decisions Taken Under Ambiguity` section whose last lines open a three-backtick block that is never closed. L is computed from the text.
  - Fixture preconditions: `ledger.computeSpecHash(text)` is `ok: false` with reason `unclosed-code-fence` and line L; the pending decision has `enough === true` and `passesValidation === true`, so only the fence keeps it from moving and the approve is not refused by validation first.
  - `route(['stream', 'approve', 'implementation/<file>.md'], root)`: the screen text starts with `Refused <file>.md:` and names "line L"; the plan file is byte-identical to its bytes before the approve (so no Steps were appended) and still in `implementation/`; no record exists.
  - Red on slice 2's code alone: the writer's refusal comes after `applyIronLoop`, so the rolled-back plan carries the appended Steps and is not byte-identical.

### Test Plan

The two B6d cases above, written first and run red on slice 2's code, then green. The existing B6c case is unchanged and still passes: a plan without frontmatter keeps today's behaviour (Decisions).

### Security Review

- The check only refuses; it never lets through anything today's code refuses, and it runs before any mutation, so a refused plan is left byte-identical in place (the same contract as the refusals at lines 448–464 and 479–493).
- The refusal carries a line number and fixed words, never plan text or a path.
- `src/lib/actions.js` is not on the protected list (`src/lib/protected-paths.js` lines 58–67).

### Wiring — the live call sites

`approvePlan` is already live: `node src/commands/start.js stream approve <ref>` → `streamApprove` (`src/lib/streaming-gate.js` lines 2359–2368) → `approvePlan` (`src/lib/actions.js` line 423). Both B6d cases drive exactly that route. No new module, no new export.

## Decisions Taken Under Ambiguity — technical planning

- **Refuse in `approvePlan`, from the file on disk, rather than translate the writer's line number.** The writer hashes a different text from the one the owner opens; translating its number would need the frontmatter's line count before and after the marker, which `upsertMarkerFields` changes in three ways (adds, replaces, flattens). Reading the file the owner sees is the root-cause fix for this route; every other writer already hashes the file on disk (`src/lib/streaming-gate.js` lines 774 and 944; `src/scripts/ledger-backfill.js` through `backfillEntry`).
- **This refusal is covered by the owner's answer on unclosed fences and is not a new gate-logic change.** His answer to "What happens with an unclosed code fence" (`.ctoc/streaming/answers.jsonl` line 286, the recommended option) is that recording is refused. After slice 2 the writer already refuses such a plan, through its throw and the rollback (`src/lib/actions.js` lines 391–403, reached from `approvePlan`'s call at line 514, after its human-gate block, `clearStatus` and `applyIronLoop`, lines 479–506). This slice only moves that refusal before any change, so nothing is cleared, refined or rolled back, and names the line in the file on disk.
- **Only the unclosed-fence reason is refused here.** A plan without frontmatter is approved today because the marker creates its frontmatter (`src/lib/frontmatter-merge.js` lines 262–263), and B6c pins that it is asked with Approve recommended; refusing every `ok: false` would change that. Residual, stated: a plan with no frontmatter and an unclosed fence still reaches the writer's refusal, whose line counts the created block; no record is written either way.
- **The check sits after the slug refusal and also runs under an override.** The override exists to pass a failed validation; it cannot make a binding that does not exist.
- **The test goes into the existing file beside B6c.** It reuses that file's sandbox, question and route helpers, and no counted file is created.

## Build-record rule (every slice of this plan)

Nothing written into this plan's Execution Record may be a line whose text, after its indentation, starts with a hash mark, inside a code block or not, except real headings. Test-runner figures are written as prose ("tests 26, pass 26, fail 0"). And every code fence opened in the Execution Record is closed with the same character and at least the same length, on a closing line that holds nothing but those characters: after slice 2, the finish on evidence records this slice with the corrected reading (`crossOnEvidence` → `writePipelineEntry`, `src/lib/streaming-gate.js` lines 774–783, then `resolveHash`), an unclosed fence makes that throw, and `crossOnEvidence` returns false (lines 799–800), a silent stall in review.

## Execution Plan

### Step 8: TEST
- Confirm slice 2 is in review or done and its tests pass.
- Write both B6d cases; run the file; each fails on its approve assertions; record the failing lines (as prose).
- [ ] Step 8 done

### Step 9: PREPARE
- Re-read `src/lib/actions.js` lines 274–285, 321–405 and 407–520, and `src/lib/streaming-gate.js` lines 774, 900–908, 944 and 2359–2386; confirm the cited lines.
- [ ] Step 9 done

### Step 10: IMPLEMENT
- `src/lib/actions.js` — the pre-check in `approvePlan`'s human-gate block, and one sentence in the comment above `approvePlan` (lines 407–422) naming the new refusal.
- Run the file until green.
- [ ] Step 10 done

### Step 11: REVIEW
- Dispatch `iron-loop-critic` on the diff: does any path mutate the plan, append Steps or write a record before the refusal; does the refusal name the line of the file on disk; is B6c unchanged?
- [ ] Step 11 done

### Step 12: OPTIMIZE
- One extra read of the plan per approve; record that nothing else was added.
- [ ] Step 12 done

### Step 13: SECURE
- Dispatch `security-scanner` on the diff: refusal only, no mutation before it, no plan text in the message.
- [ ] Step 13 done

### Step 14: VERIFY
- `npm test`, the gated entry point: fail 0, skipped 0, coverage at or above `.ctoc/coverage-baseline.json` `minPct`. Lint the changed files: zero warnings.
- [ ] Step 14 done

### Step 15: DOCUMENT
- The `approvePlan` comment names the refusal. No document under `docs/` describes the approve route's refusal of a plan that cannot be bound (searched: `cannot be bound|could not be established|specification boundary|cannot bind` over `docs/`, 1 line, `docs/ENFORCEMENT.md` line 173, about evidence counts), so none is changed.
- This plan's Execution Record holds no unclosed code fence: every fence opened in it is closed by a line of the same character only, at least as long (the build-record rule); `computeSpecHash` on this plan file returns `ok: true`.
- [ ] Step 15 done

### Step 16: FINAL-REVIEW
- Dispatch `iron-loop-critic` against the parent's scenario "an unclosed code fence is refused" and this slice's two B6d cases.
- [ ] Step 16 done
