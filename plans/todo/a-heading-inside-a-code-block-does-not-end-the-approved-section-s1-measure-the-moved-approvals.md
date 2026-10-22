---
title: "Measure, read-only, which recorded approvals the corrected fingerprint reading would move, before anything changes"
type: implementation
parent_plan: a-heading-inside-a-code-block-does-not-end-the-approved-section
depends_on: none
priority: HIGH
effort: medium
# This slice changes no source, test or record file. Its one output is the measurement
# file below (the full table and lists), as the README census slice declares its record;
# a pointer and the totals go into its own execution record. Its throwaway program lives
# in the session's scratch directory and is never committed.
files:
  - ".ctoc/verification/a-heading-inside-a-code-block-measurement.md"
---

# Measure, read-only, which recorded approvals the corrected fingerprint reading would move, before anything changes

**Scope (one line):** before any product code changes, run a throwaway, read-only program over every approval record whose `hash_scope` is `specification` and over every plan file, write the full table of verdicts and the three lists into `.ctoc/verification/a-heading-inside-a-code-block-measurement.md` with a pointer and the totals in this slice's own Execution Record. It writes no question.

Read first, in full: the parent plan (`plans/implementation/a-heading-inside-a-code-block-does-not-end-the-approved-section.md`), and slice 2's section "The corrected reading, rule by rule" (`plans/implementation/a-heading-inside-a-code-block-does-not-end-the-approved-section-s2-the-corrected-reading-and-its-stamp.md`, or wherever that slice then sits). This slice implements that rule list a second, independent time; slice 2 builds it into the product and, at its Step 14, checks that both implementations agree on every plan this table covers.

## Implementation Details

### Why this slice exists on its own

- The parent's acceptance criterion "the moved records are measured before anything changes" requires the table before any product code changes and before any reading stamp is written.
- Slice 2 edits `src/lib/approval-ledger.js`, which is on CTOC's protected list (`src/lib/protected-paths.js` line 61). On 2026-10-22 the owner ordered this plan taken into the build queue on recorded evidence, so there is no approve of slice 2 at which to show him this table (slice 2, "What the protected list requires"). The moment the table is put in front of him is this slice's completion: the coordinator's report of it shows the measurement file in full (Step 16). Slice 2's `depends_on` names this slice, so slice 2 cannot start building before this slice has reached review (`src/lib/continuation-queue.js` lines 129 and 141–158: a predecessor in review or done is satisfied). Slice 2 depends on this slice only for the measurement file being written, which happens at Step 10, before this slice can reach review; slice 2 holds on no answer, and its Step 9 reads the file.
- Why a declared file and not `files: []`: the build queue reads `files:` only as a block key (`src/lib/actions.js` line 2085, pattern `^files:\s*$`), so `files: []` reads as no files, and `taskSpecFromPlan` then refuses the plan as declaring none (lines 2185–2192). Start agent and the continuation's build queuing would skip this slice (lines 2350–2355; `src/lib/menu-screens.js` lines 2993–2997), and slice 2's dependency on it would throw as unresolvable (`src/lib/actions.js` lines 2231–2240), so nothing would build.

### The population

- Every file in `.ctoc/approvals/` whose name ends in `.json` and does not start with a dot (the same filter as `countLedgerEntries`, `src/scripts/ledger-backfill.js` line 239), read at run time. Count is not fixed: 409 such records carried `"hash_scope": "specification"` on 2026-10-21 (the parent plan) and 411 on 2026-10-22 (searched: that pattern over `.ctoc/approvals/`, 411 files).
- A file that does not parse is a row with the verdict `record-unreadable`. A parsed record whose `hash_scope` is not `specification` is outside the population and only counted, by kind, in the totals: a whole-file record is compared byte for byte and no reading change can move it (`contentMatches`, `src/lib/approval-ledger.js` line 622).
- Separately, every plan file under every folder of `plans/` (listed at run time, not a fixed list), whether or not it has a record, for the three lists below and the `ok: false` totals.

### The throwaway program

- Lives in the session's scratch directory and is never committed (precedent: slice "The census of the README as it stands", `plans/todo/00382-the-readme-matches-the-product-today-s1-census-and-empty-record.md` line 75). It takes the repository root as its argument and never writes anywhere but the scratch directory and its own standard output. When the session's scratch directory is not writable, the program and its output go into `.ctoc/state/a-heading-measurement-scratch/` instead: git-ignored (`.gitignore` line 6, `.ctoc/state/`), outside the only protected part of that folder, `.ctoc/state/verify/` (`src/hooks/protect-records.js` line 12), never committed, and deleted at Step 15. The builder copies the program's output into the declared measurement file; the program itself writes nothing into the repository.
- Today's reading comes from the product itself: it requires the repository's `src/lib/approval-ledger.js` and calls only `computeSpecHash`, `contentMatches`, `entryKind` and `readEntryResult`. Nothing else from the module is called.
- The corrected reading is the program's own code, written from slice 2's rule list. It has three switches, one per correction, so it can also produce three partial readings:
  - fences: rules R2 and R3 on (code fences, and the unclosed-fence refusal), every other rule as today;
  - heading names and levels: rule R5 parts (a) and (c) on (level 2 or deeper; whole name, or name then a space or an opening parenthesis), no fence tracking, indentation ignored;
  - indentation: rule R5 part (b) on (four or more columns of leading spaces and tabs, or any other leading whitespace, cannot start a section), no fence tracking, names by prefix at every level.
  - With all three on it is the corrected reading; with all three off it must be today's reading.
- Its built-in checks run before any row is printed, and any failure stops the program with a non-zero exit and no table:
  - all switches off: the program's full result equals the product's `computeSpecHash` result for every plan file read, compared field by field on `ok`, `reason` and `hash`, with zero exceptions (proves the program's base walk is today's walk, its refusals included: `empty-content` and `no-frontmatter-delimiters`, `src/lib/approval-ledger.js` lines 428–456). Plan files whose today's result is `ok: false` are counted separately in the totals, by reason, and are never folded into a digest comparison;
  - for each record, `contentMatches(entry, content).match` from the product equals "today's digest equals `content_sha256`" (proves the program reads the records as the product does);
  - the hand fixtures of the Test Plan below, each against a digest built in the program from hand-listed kept lines;
  - on the triggering plan "A placeholder path in a plan is not a missing file" (located by file name in whatever folder holds it), the corrected digest equals the corrected digest of every line before its execution-record heading (found by the module's exported `EXECUTION_SECTIONS[0]`, never by a copied line);
  - every file under `.ctoc/approvals/` hashed byte for byte (sorted names, sha256 of each file) before the first read and after the last; the two combined digests are equal.
- A built-in check that fails is the only thing that stops this slice: it is a defect in this throwaway program, and the builder fixes the program, never the check.

### Locating a record's plan

- The plan's file name is the record's `plan_basename` when present, else the record's slug; matched case-insensitively against the listing of every folder under `plans/`.
- When the plan is found in more than one folder, every folder is listed in the row, and the verdict is computed on the copy in the folder the record's `stage_to` names (or `in-progress` for a `todo` record whose plan is building), else on the first in the stage order of `src/lib/gate-order.js` line 21.
- When it is found nowhere, the verdict is `no-plan`.

### The table, one row per record in the population

The table, its totals and the three lists below are written into `.ctoc/verification/a-heading-inside-a-code-block-measurement.md`, under a level-1 title naming this slice and a line stating the date and the commit the measurement ran on. This slice's Execution Record holds a pointer to that file and the totals.

Columns, in this order:
1. record (the slug, never a path);
2. folder(s) holding the plan;
3. record kind (`entryKind`);
4. edge (`stage_to`);
5. verdict — exactly one of, in this precedence: `record-unreadable`; `no-plan`; `corrected-cannot-bind` (the corrected reading has no result; the cell after says why); `both` (matches today's reading and the corrected reading); `moved` (matches today's reading only); `repaired` (matches the corrected reading only); `neither`;
6. moved by — for every row whose today's digest differs from its corrected digest: each partial reading (fences, heading names and levels, indentation) whose digest alone differs from today's; `interaction` when none alone does; `–` when the two digests are equal;
7. corrected boundary — `ok`, or `unclosed fence at line N` (1-based line of the file);
8. plan bytes — the first 12 hexadecimal characters of the sha256 of the whole plan file;
9. corrected digest — the first 16 hexadecimal characters of the corrected digest, or `–`.

Under the table: the totals per verdict (they add up to the number of records read), per folder and per kind, the count of whole-file records outside the population, the number of plan files under `plans/` whose today's reading is `ok: false`, per reason, and the number whose corrected reading has no result, per reason, the triggering plan's row repeated on its own with one sentence on what it means for the sibling plan "A finished plan can be sent back for a text-only revision", and the before-and-after digests of `.ctoc/approvals/`.

Under the owner's answer to "How moved approvals are handled" (keep each approval on the reading it was made with), no record in this table changes its result when slice 2 lands: every record here is unstamped and stays on today's reading. The table says what changes for each plan the next time it is recorded, and the `moved by` column is the evidence for which correction does it.

### The three further lists

- **Plans the corrected reading cannot bind.** Every plan file under `plans/`, with or without a record: its folder, whether it has a record, and the line of its unclosed fence. These are the plans whose next approval record would be refused once slice 2 lands (parent, scenario "an unclosed code fence is refused"). The list asks nothing of the owner: his answer to "What happens with an unclosed code fence" (`.ctoc/streaming/answers.jsonl` line 286) settles that such a plan is refused until its fence is closed, slice 3 makes the refusal name the line, and slice 2 names each listed plan outside `plans/done/` in its own Execution Record.
- **Test-runner summary lines.** Every line in `plans/` that matches the coordinator's shape (pattern `^\s*#\s+(tests|pass|fail|skipped|duration_ms)\s+\d+`, used as a presence check only) with its plan, line and whether the corrected reading puts it inside a code fence. On 2026-10-22 the pattern matched 7 lines in 2 files (searched over `plans/`): `plans/done/00084-approval-hash-survives-its-own-pipeline.md` lines 381–383 and 398, `plans/done/00158-a-fresh-repository-is-its-own-project.md` lines 371–373. The parent leaves open whether any lies outside a fence; this list settles it for the record.
- **Code blocks that carry a left-out section past its own end.** Every plan file under `plans/` where, under the corrected reading, a code fence opens inside a left-out section and closes after a heading-shaped line whose level is the same as or higher than that section's (a line today's reading would have ended the section at): its folder, the fence's opening line, each such heading-shaped line and the closing line. This is the real extent of the property slice 2 discloses in its Security Review ("lines inside a code block that opens inside a left-out section are left out, up to the block's closing line"); every listed plan is one whose recorded text that property reaches.

### Build-record rule (every slice of this plan)

This slice's own approval record is read with today's reading, which still ends a left-out section at any line starting with a hash mark. So nothing written into this plan's Execution Record may be a line whose text, after its indentation, starts with a hash mark, inside a code block or not, except real headings. Test-runner figures are written as prose ("tests 26, pass 26, fail 0"). And every code fence opened in the Execution Record is closed with the same character and at least the same length, on a closing line that holds nothing but those characters: once slice 2 lands, the finish on evidence records this slice with the corrected reading (`crossOnEvidence` → `writePipelineEntry`, `src/lib/streaming-gate.js` lines 774–783, then `resolveHash`), an unclosed fence makes that throw, and `crossOnEvidence` returns false (lines 799–800), a silent stall in review. The table lives in the measurement file, whose rows start with a vertical bar; the measurement file is not a plan and no fingerprint reads it.

### Wiring — the live call sites

No module is added or changed. The measurement file is read by the owner in the coordinator's report of this slice's completion, by slice 2's Steps 8 and 9 (Step 9 names, in slice 2's Execution Record, every plan outside `plans/done/` on the "cannot bind" list), and by slice 2's Step 14, which re-runs the measurement with the product's corrected reading and compares it with this table row by row.

### Test Plan

The program's checks are written first and run before the corrected reading exists, so they fail (Step 8); then the reading is written and they pass (Step 10). Fixtures live inside the program, never in a committed file:
1. Today's walk reproduced: all switches off equals `computeSpecHash` on every plan file under `plans/`, on `ok`, `reason` and `hash` alike; one hand fixture without frontmatter and one empty text give `ok: false` with the product's reasons.
2. A build record holding a three-backtick block with a line reading `# 69 errors`, then build text: the corrected digest equals that of the plan cut before the build-record heading.
3. A three-backtick block in a Scope section holding a line reading `## Deferred Questions`, then a sentence: the corrected kept lines include the sentence.
4. A four-backtick block holding a three-backtick line and a line reading `# done`; a tilde block; a three-backtick block indented four spaces in a list item; a three-backtick block whose inner line is three backticks followed by `js`: each leaves the build record whole.
5. An unclosed three-backtick block: no result, with the opener's 1-based line.
6. A title line reading `# Verification evidence is shown`, and a heading reading `## Execution logging for the menu`: both stay hashed.
7. A heading reading `## Deferred Questions` led by four spaces, by a tab, and by a no-break space: none starts a section; led by three spaces: it starts one.
8. An unfenced line reading `# tests 15` under `## Execution Record`: it ends the record (the owner's answer to "Does a level-1 line end a left-out section").
9. Each partial reading changes only its own rule: fixture 3 moves under fences alone, fixture 6 under heading names and levels alone, fixture 7 under indentation alone.
10. The third list: a build record at level 2 holding a three-backtick block that contains a line reading `## Notes`, then the closing line: the plan is listed with the opening, heading and closing lines; the same block holding only a line reading `### Notes` is not listed.

### Security Review

- Read-only on every file of the repository except the declared measurement file and this plan's own Execution Record (and, only on the fallback, the git-ignored scratch folder); the before-and-after digest of `.ctoc/approvals/` proves no record changed. `src/scripts/ledger-backfill.js` is never run, in any mode.
- The measurement file is committed (`.gitignore` lines 23–24 ignore only `.ctoc/verification/cache/` and `.ctoc/verification/ledger.json`). The table and lists hold slugs, plan titles, folder names, kinds, verdicts, line numbers and digest prefixes only. No line of any plan is copied into it, so no home-folder or scratch path from a plan reaches a committed file or this plan.
- The program runs no shell, takes no input from plan text as a command, and fetches nothing.
- If CTOC's write protection refuses running the program, the refusal is recorded word for word and reported; it is never worked around.

## Decisions Taken Under Ambiguity — technical planning

- **A second, independent implementation of the corrected reading.** The measurement must come before the product change, so the product cannot measure itself. Two implementations of one rule list that agree on every real plan are stronger evidence than either alone; slice 2's Step 14 makes the comparison.
- **One rule list, in slice 2.** The rules are written once, in slice 2's "The corrected reading, rule by rule", so the two implementations cannot follow two different texts.
- **Today's reading is taken from the product, never re-implemented.** "Matches today's reading" must mean what the product decides; the base-walk check proves the program's own walk equals it.
- **The table lives in a declared measurement file, with a pointer and the totals in this slice's Execution Record.** The parent's criterion asks for "a table in the plan's build record"; the build record points at the file and carries its totals, and the file holds every row. A slice with no declared file never builds (`files: []` reads as no files, `src/lib/actions.js` lines 2085 and 2185–2192), and the README census slice sets the precedent of one declared record file under `.ctoc/verification/` (`plans/todo/00382-the-readme-matches-the-product-today-s1-census-and-empty-record.md` line 11). `src/lib/task-registry.js` lines 653–654 would also refuse an implement task with no touches, but `taskSpecFromPlan` always adds the plan's own path to the touches (`src/lib/actions.js` lines 2195–2196), so the refusal that applies is the one at lines 2185–2192. The one hook Claude Code loads does not guard that folder (searched: `verification|claims-ledger` over `src/hooks/protect-records.js`, 0 lines). Rows carry slugs and folder names, never paths, so the plan checker's file-claim scan has nothing to read as a claimed file.
- **The fallback scratch folder is `.ctoc/state/a-heading-measurement-scratch/`.** Used only when the session's scratch directory is not writable: git-ignored (`.gitignore` line 6), outside the protected check records (`src/hooks/protect-records.js` line 12), never committed, deleted at Step 15.
- **The owner sees the table at this slice's completion, not at an approve of slice 2.** The owner's order of 2026-10-22 takes this plan into the build queue on recorded evidence, so no approve of slice 2 happens. The coordinator's completion report of this slice shows the measurement file in full; slice 2 writes no stamp into any real record before it lands.
- **No stop question and no hold on an answer (CTO Chief decision, technical planning round 2, 2026-10-22).** Round 1 had this slice write an owner question when the "cannot bind" list held a plan outside `plans/done/`, and slice 2 hold on its answer. Both are removed: the question could not reach the owner from this slice's stage, and it is not his to answer, because his answer to "What happens with an unclosed code fence" (`.ctoc/streaming/answers.jsonl` line 286) already settles it (parent and slice 2, Decisions). This slice's only stop is a failing built-in check, a defect in its own program.
- **Completion is the build agent's plain `menu task complete <id>`.** The build agent's own call carries no `--continue`; that flag is the session's, which keeps the work moving after it settles the task (`src/lib/menu-screens.js` lines 2300–2302).
- **Plan bytes and corrected digest prefixes are in the table.** Plans keep changing while other work runs; slice 2's Step 14 compares only rows whose plan bytes are unchanged, and the digest prefix makes that comparison exact.
- **Plans on the "cannot bind" list are listed, never asked about.** Under the owner's answer to "What happens with an unclosed code fence" (refuse, `.ctoc/streaming/answers.jsonl` line 286), a plan with an unclosed fence cannot be recorded again until the fence is closed, and slice 3's refusal names the line, so whoever crosses it next closes the fence then. Plans outside done still cross a gate, and slice 2 names them in its Execution Record; plans in done cross again only through a send-back.
- **The population count is read at run time.** It was 409 on 2026-10-21 and 411 on 2026-10-22.
- **No question, in this slice's planning or its build.** Every choice here is how to measure, and the parent's six answers settle what is measured and what an unclosed fence means.

## Execution Plan

### Step 8: TEST
- First, before anything else: snapshot `.ctoc/approvals/` (the combined digest of every file) into the program's output; it is the "before" of the byte-identical check.
- Write the program's built-in checks and fixtures 1 to 10 of the Test Plan; run the program; it fails because the corrected reading does not exist yet. Record the failing output (as prose, per the build-record rule).
- [ ] Step 8 done

### Step 9: PREPARE
- Read slice 2's "The corrected reading, rule by rule" in full; note its date of reading in the Execution Record.
- Confirm the program requires the repository's `src/lib/approval-ledger.js` and calls only the four functions named above.
- [ ] Step 9 done

### Step 10: IMPLEMENT
- Write the corrected reading with its three switches; run the built-in checks until all pass.
- Run the measurement; write the table, the totals, the triggering plan's row, the three lists and the before-and-after digests into `.ctoc/verification/a-heading-inside-a-code-block-measurement.md`; write a pointer to that file and the totals into this plan's Execution Record.
- [ ] Step 10 done

### Step 11: REVIEW
- Dispatch `iron-loop-critic` with three questions: does the program implement slice 2's rule list exactly, rule by rule; do the totals add up and does every record appear once; is any verdict computed on a different plan copy than the one the record vouches for?
- [ ] Step 11 done

### Step 12: OPTIMIZE
- No product code. Record the program's run time and the number of files read.
- [ ] Step 12 done

### Step 13: SECURE
- Dispatch `security-scanner` on the Execution Record and the measurement file: no path from a plan body, no home-folder or scratch path, no secret; and on the program: read-only, no shell, writes only to the scratch directory.
- [ ] Step 13 done

### Step 14: VERIFY
- `npm test`, the gated entry point: fail 0, skipped 0, coverage at or above `.ctoc/coverage-baseline.json` `minPct`. This slice changes no test and no source (its one written file is the measurement file), so a failure is a defect found, investigated to its cause and reported, never fixed here.
- The before-and-after digests of `.ctoc/approvals/` are equal. If they differ, the program wrote nothing (it has no write call into the repository), so a concurrent writer did: name the changed file and re-run the measurement.
- [ ] Step 14 done

### Step 15: DOCUMENT
- The measurement file holds: the table, the totals, the triggering plan's row, the three lists, and the date and commit the measurement ran on. The Execution Record holds: the pointer to that file, the totals, the built-in checks' output, the run time, and the number of plans on the "cannot bind" list, inside and outside `plans/done/`.
- If the fallback scratch folder was used, it is deleted.
- [ ] Step 15 done

### Step 16: FINAL-REVIEW
- Dispatch `iron-loop-critic` against the parent's scenarios "the moved records are measured before anything changes" and "a record the measurement cannot judge is listed, never skipped".
- Complete with `menu task complete <id>` (the build agent's own call, no `--continue`), and hand the result over with this sentence for the coordinator: show the owner the measurement file in full in the report of this slice's completion; no real record is stamped before slice 2 lands, which is what the criterion requires.
- The last line of the scenario "a record the measurement cannot judge is listed, never skipped" (the builder stops and asks when a record would stop matching because the corrected reading cannot find its boundary) cannot arise; see the parent's Decisions — technical planning, second bullet.
- [ ] Step 16 done
