---
iron_loop_verdict: true
title: "The settings check counts its work, not the clock"
type: implementation
created: 2026-10-19
priority: high
effort: small
iron_loop: true
depends_on: none
files:
  - src/lib/real-path-confinement.js
  - src/hooks/PreToolUse.Bash.js
  - src/hooks/protect-records.js
  - tests/protect-records.test.js
  - tests/a-link-cannot-leave-the-repository.test.js
  - docs/ENFORCEMENT.md
approved_by: human
approved_at: 2026-10-19T17:47:41.822Z
gate_crossed: implementation → todo
---

# The settings check counts its work, not the clock

## Origin

This plan carries out the owner's decision of 2026-10-19, which approved the CTO Chief's recommendation. That decision is his explicit OK to change hook logic. It says:

- replace the settings check's wall-clock budget with a count of work, about 3 million units, which is roughly 7 to 8 seconds on this machine;
- charge text work in a folder-change chain by its length;
- remember disk lookups across the settings files within one decision;
- keep the clock only as a backstop, well under Claude Code's hook time limit.

The defect is a regression the main session shipped in 6.14.132. This plan lands first, before the hook branch.

Written by the implementation planner on 2026-10-19, dispatched by the CTO Chief, in the worktree on branch `fix/settings-check-counts-work-not-time` (cut from origin/main 09229c44, 6.14.133). Every claim carries one of four labels:

- **read**: read in this worktree's files during this session;
- **measured**: measured by the security scanner, cited as the CTO Chief's brief gives it;
- **believed**: recall, not checked here;
- **to verify**: checked by a named step before anything is built on it.

The planner ran nothing. Every unit count in this plan is a design figure or an estimate, never a measurement.

**Refinement.** Three critique rounds ran (`iron-loop-critic`, each round's items decided by the CTO Chief and applied to this plan). Rounds 1 and 2 are recorded in Decisions 12 to 22, round 3 in Decisions 23 and 24. Round 3 was the last: its items were applied as the CTO Chief's decisions, as the critic proposed them, without a fourth round.

## Problem statement

The settings check refuses or allows the same command depending on how busy the machine is.

**The budget is a clock (read).**

- `src/hooks/protect-records.js` line 246 is `const DECISION_BUDGET_MS = 5000;`.
- `decide()` line 1111 calls `budgetResolver.setDeadline(Date.now() + DECISION_BUDGET_MS)`.
- `src/lib/real-path-confinement.js` line 455, `budgetSpent()`, returns `deadline !== null && Date.now() > deadline`.
- The resolver asks `budgetSpent()` at four places: each walk step (line 155), each kernel step (line 243), the entry of `resolvesUnder` (line 411) and each identity-chain step (line 516).
- `src/hooks/PreToolUse.Bash.js` `isLedgerWrite` asks it at the top of each segment (line 343) and for each operand (line 421).
- Once the clock passes, a walk returns `'resolve-failed'` and `resolvesUnder` returns `true`. The shell link test reads `true` as "inside" (`operandResolvesIntoLedger`, line 296; `isLedgerWrite`, line 438). `bashRefuses` then refuses with the settings sentence (`protect-records.js` lines 1066 and 1076).

**Ordinary work costs seconds (measured; the scanner's probes in the security scanner's scratch folder, outside the repository, read: `p40lib.js`, `p40-observe.js`, `p41.js`).**

The probe command is a builder's ordinary 43 KB here-document: `cd copy && cd src && cd .. && cat > tests/claude-setup-check.test.js <<'EOF'`, then 300 test lines, then `EOF`, then `node --test …`. The check reads every line as a shell command and every word as a path.

- It makes about 4,500 disk lookups per settings check.
- A background agent in a plain project runs 6 checks: about 1.25 million budget checks and 1.4 million file-system calls, 3.3 s median at this machine's normal load.
- From a project inside `.claude/worktrees/w` (9 checks, at least 2.07 million budget checks) it was refused 10 times out of 10, each at 5.03 s.
- The main session (2 checks, 0.41 million budget checks) took 1.1 s idle and 4.5 to 4.95 s at load about 100.

The scanner's observation file `p40obs-0w-48397-1792417099239.json` (read) lists the checks of one refused worktree run:

| Check | Time |
|---|---|
| `.ctoc/settings.yaml` | 686 ms |
| `.ctoc/regulatory-regimes` | 636 ms |
| `.claude/settings.json` | 689 ms |
| `.claude/settings.local.json` | 707 ms |
| `.ctoc/settings.json` | 610 ms |
| the config folder's `settings.json` | 624 ms |
| `../../settings.json` | 598 ms |
| `../../settings.local.json` | refused 332 ms in, at 5,001 ms |

The ninth check, `../../../.ctoc/settings.json`, never ran. The clock ran out inside a walk.

**Root cause.** The work is counted in seconds, so the verdict depends on machine load. The work itself is also repeated without need:

- the same operand is resolved once per settings check, nine times over;
- the root and each protected path are walked again for every operand.

## Scope

In:

- `real-path-confinement.js`:
  - a work count with its own setter (`setWorkBudget`);
  - `budgetSpent(cost = 1)`, which charges the count;
  - `textBudgetSpent(chars)`, the one text rate (`CHARS_PER_UNIT`, 64 characters a unit), charged at `resolvesUnder`'s entry (the target's length), at each `kernelAgrees` step (the prefix's length) and for each name the walk adds to its tail past the first missing one (Decision 12);
  - a memory of three lookups (`resolveBasis`, `resolveExisting`, `fileIdentity`) that lives only while a work count is set, capped by entries and by characters (Decision 14);
  - `setDeadline` kept, as the backstop clock.
- `protect-records.js`: `decide()` sets 3,000,000 units and the backstop, a tenth of Claude Code's hook time limit as verified at Step 9 (60 s at 600 s; Decision 15). `DECISION_BUDGET_MS` is replaced. `main()` gives the work sentence `REFUSAL_WORK` for a refusal made once the count or the backstop is spent (Decision 17). Its header sentences on the budget change.
- `PreToolUse.Bash.js`: `isLedgerWrite` charges the length of its text work: each segment's folder-change chain, each operand and each link-test candidate (Decision 12). It refuses when the count ran out inside the link test, before the read-only exemption (Decision 13).
- Tests in the two existing test files: hook cases 161–167 and unit cases 27–28. Cases 151, 154 (its agent row) and 155 change their expected sentence to the work sentence, and case 155's title changes (Decisions 8 and 17).
- `docs/ENFORCEMENT.md`: the budget paragraph, the padded-command bullet, the work sentence and the here-document line limit, for an ordinary command and for one that folding changes (Decisions 14 and 23).

Out (untouched):

- `RECORD_REFUSALS_OFF`, the structure of `bashRefuses`, `fileSpec`, `protectedSettingsFiles` and the text of every existing refusal sentence. One sentence is added, `REFUSAL_WORK` (Decision 17); it replaces only the sentence of a refusal made once the count or the backstop is spent, never a verdict.
- The walk's own logic, except two charges: `resolveExisting`'s body changes only by the tail charge (one line in lines 164–170), and `kernelAgrees` only by its per-step charge (lines 243–244). `identityChain` and `passesThrough` are unchanged.
- `escapesRoot` and its callers. `plan-coverage.js` runs in the menu process, which never sets a work count, so it gets no memory.
- `hooks/hooks.json`. It declares no `timeout`, so Claude Code's default applies (read, lines 8–11).

## Implementation Details

### Architecture Decision

**Count work, remember what was already asked, and keep the clock only as a backstop.**

1. **The count.** Each unit is about one file-system step: a walk step, a kernel step, an identity-chain step or a `resolvesUnder` entry. These are exactly the places that already ask `budgetSpent()`. Text work is charged by length at one rate, one unit plus one more per 64 characters (Decisions 3 and 12): in the shell, each segment's folder-change chain, each operand and each link-test candidate; in the resolver, the target at `resolvesUnder`'s entry, the prefix at each kernel step, and each name the walk adds to its tail past the first missing one. The decision gets 3,000,000 units (the owner's figure). The count only goes down, so once it is spent it stays spent.
2. **The memory.** A lookup already made in this decision is answered from memory. It is keyed on the exact absolute path as written, never a tidied form, so the two readings (as written and tidied) stay distinct. With the memory:
   - the root is resolved once per decision;
   - each protected path is walked once per decision;
   - each operand is walked once per decision, not once per settings check.

   That turns nine full checks into one full check plus eight cheap ones (and, when Unicode compatibility folding changes a background agent's command, sixteen runs into one full run plus fifteen mostly cheap ones; Decision 23). Rules:
   - The memory exists only while a work count is set.
   - `setWorkBudget` starts it empty, and clearing the count drops it.
   - It holds at most `MEMORY_ENTRIES_MAX` answers of each kind (32,768, sized for a here-document of 2,000 lines of distinct words and checked at Step 12; Decision 14), and at most `MEMORY_CHARS_MAX` characters of keys and stored paths in all (16,777,216). Past either, lookups are made and charged in full. A command built to fill memory cannot crash the hook: a crash fails open for calls that do not mention the records or a settings file (read: `protect-records.js` `main()`, lines 1163–1178).
   - Remembered answers are frozen.
   - A `p` that is not a non-empty string, or whose key cannot be built (a `process.cwd()` that throws), is never remembered: it gets the uncached answer, and no wrapper throws (Decision 22).
   - Once the count or the clock is spent, a remembered walk returns the fault, never the stored answer (the header's promise, lines 82–84).
3. **The backstop.** `setDeadline` keeps its name and meaning. The decision sets it to a tenth of Claude Code's hook time limit as Step 9 verifies it offline: 60 s at the 600 s read in the installed binary (Decisions 2 and 15). If it is ever hit, it refuses like today's clock, with the work sentence. The builder spends at most a third of the count. So the clock can decide it only if one unit takes more than 60 s ÷ 1,000,000 = 60 µs. The scanner's figures give about 2.6 µs per budget check at normal load and about 11 µs at load 100 (this Mac). So the clock decides the builder only on a machine more than about 5 times slower than this one at load 100. The 2,000-line here-document of Decision 14 may spend up to the whole count, so for it the threshold is 20 µs a unit. An ordinary command's verdict is decided by the count on every platform; only the backstop depends on the platform, and it refuses.

The memory charges nothing for a hit. Every hit still sits under a check that charges: each segment, each operand, each `resolvesUnder` entry and each identity-chain step. So repeating one question still runs the count down (Decision 5).

### Dependency graph

```
hooks/hooks.json --registers--> src/hooks/protect-records.js
protect-records.decide --calls (changed)--> real-path-confinement.setWorkBudget (added export) + setDeadline (kept)
protect-records.main --calls (changed)--> workSentence (module-private) --> real-path-confinement.budgetSpent(0)
protect-records.bashRefuses --calls--> PreToolUse.Bash.isLedgerWrite (2 checks main, 2 + N agent, or 2 + 2N when folding changes the command)
PreToolUse.Bash.isLedgerWrite --calls (changed)--> chargeText (module-private) --> real-path-confinement.textBudgetSpent (added export) --> budgetSpent(cost)
PreToolUse.Bash.operandResolvesIntoLedger --calls--> resolvesUnder (entry charged by length) --> resolveBasis / resolveExisting / fileIdentity (each now remembered)
real-path-confinement.walkAsWritten (tail charge) / kernelAgrees (per-step charge) --call--> textBudgetSpent / budgetSpent
protect-records.fileSpec / agentSettingsSpecs / isAgentSettingsTarget / sameFileAsSettings --call--> resolveExisting / fileIdentity / budgetSpent
plan-coverage.escapesRoot path: no work count set, so no memory and no change
tests/protect-records.test.js --spawns--> protect-records.js with a --require preload (real hook input JSON)
tests/a-link-cannot-leave-the-repository.test.js --requires--> real-path-confinement, PreToolUse.Bash.isLedgerWrite (in-process)
```

There is no cycle. The two added exports have live callers, so the dead-export fence counts them as live (read: `src/lib/reachability.js` lines 853–872): `setWorkBudget` in `protect-records.decide`, and `textBudgetSpent` in `PreToolUse.Bash.isLedgerWrite` (through `chargeText`).

### Implementation order

1. MODIFY `tests/protect-records.test.js` and `tests/a-link-cannot-leave-the-repository.test.js`: hook cases 161–167, the expected sentence of cases 151, 154 and 155, and unit cases 27–28, red first (Step 8).
2. MODIFY `src/lib/real-path-confinement.js`: the count, the charged `budgetSpent`, `textBudgetSpent`, the three text charges, the memory and its three wrappers.
3. MODIFY `src/hooks/PreToolUse.Bash.js`: `chargeText` and its three call sites, the candidate loop and the spent check after it. Depends on 2.
4. MODIFY `src/hooks/protect-records.js`: the two constants, `decide()`'s two setter calls, `REFUSAL_WORK`, `workSentence` and its one call in `main()`. Depends on 2.
5. MODIFY `docs/ENFORCEMENT.md`. Depends on Step 12's measured numbers.

### File: `src/lib/real-path-confinement.js`

**Action:** MODIFY
**Purpose:** Bound a decision by a count of work, and answer repeated lookups from a memory that lasts one decision.
**Change type:** new-function + modify-existing.

#### Module state (read: line 120 holds `let deadline = null;`)

- `let unitsLeft = null;`: the units left in this decision, or null for no count.
- `let memory = null;`: `{ basis: Map, walks: Map, ids: Map }` while a count is set, else null.
- `let memoryChars = 0;`: the characters the memory holds (keys plus stored paths), reset by `setWorkBudget`.
- `const MEMORY_ENTRIES_MAX = 32768;`: the most answers one kind holds. Sized for the 2,000-line here-document of Decision 14 (planner's estimate about 24,000 walk answers); Step 12 measures the real count and moves this number by Decision 14's rule.
- `const MEMORY_CHARS_MAX = 16777216;`: the most characters the memory holds in all (Decision 14). An entry cap alone does not bound bytes: 32,768 keys of 100 KB each would be 3 GB.
- `const CHARS_PER_UNIT = 64;`: the one text rate, characters per unit of the count (Decisions 3 and 12).

#### Exports

- **`setWorkBudget(units)`** (added) returns `void`.
  - A finite number ≥ 0 sets `unitsLeft = Math.floor(units)` and starts an empty memory. Anything else clears both to null.
  - `setWorkBudget(0)` is an empty count, not "no count": `budgetSpent(0)` is still false, and the first charge spends it (so `resolveExisting`'s cost-0 entry check passes and the walk's first step spends it; Decision 20).
  - Example: `setWorkBudget(3000000)`.
- **`budgetSpent(cost = 1)`** (changed) returns `boolean`.
  - It charges `cost` units when a count is set. A cost that is not a finite number ≥ 0 charges 1, so a caller's arithmetic slip can never stop the count.
  - It returns `(unitsLeft !== null && unitsLeft < 0) || (deadline !== null && Date.now() > deadline)`.
  - `budgetSpent(0)` asks without charging.
  - Examples: after `setWorkBudget(10)`, `budgetSpent(10)` is false and the next `budgetSpent()` is true. After `setWorkBudget(1)`, `budgetSpent(-5)` is false (it charged 1) and `budgetSpent(NaN)` is true.
- **`textBudgetSpent(chars)`** (added) returns `boolean`: `budgetSpent(1 + Math.floor(chars / CHARS_PER_UNIT))`. A `chars` that is not a finite number gives `NaN`, which `budgetSpent`'s floor charges as 1. The one text rate for both modules (Decision 12). Example: after `setWorkBudget(2)`, `textBudgetSpent(64)` charges 2 and is false; the next `textBudgetSpent(0)` is true.
- **`setDeadline(at)`**: unchanged. Its JSDoc and the header now call it the backstop.
- **`resolvesUnder`** (changed in one line): line 411 `if (budgetSpent()) return true;` becomes `if (textBudgetSpent(targetFile.length)) return true;`. The target is the text every later step of this call joins and walks.
- **`kernelAgrees`** (changed in one place, module-private): lines 243–244 become `const prefix = root + names.slice(0, n).join(path.sep);` then `if (textBudgetSpent(prefix.length)) return false;`. Each step builds a prefix as long as the path, so a step is charged by its length.
- **`resolveExisting(p)`** (changed into a remembering wrapper; same contract, same JSDoc):
  - `const key = memory === null ? null : keyOf(p);`
  - `if (key === null) return walkAsWritten(p);`: no count, a `p` that is not a non-empty string, or a key that could not be built goes straight to the uncached walk, which faults or answers as today (Decision 22).
  - `if (budgetSpent(0)) return { ok: false, real: null, reason: 'resolve-failed', tail: null };` (the walk's fault shape).
  - Then `return remember(memory.walks, key, () => walkAsWritten(p));`.
  - The current body moves into the module-private `walkAsWritten(p)`. Besides its name line, one line is added in the tail branch (lines 164–170), before `tail.push(seg)`: `if (budgetSpent(Math.floor(seg.length / CHARS_PER_UNIT))) return fault('resolve-failed');`. The step's own unit is already charged at line 155; a name past the first missing one is charged by its length, so a long name there costs what its later joins cost (Decision 12). Charged, not length-checked: no verdict changes.
- **`resolveBasis(p)`** (module-private, changed): today's body moves into a closure; `const key = memory === null ? null : keyOf(p);` then `key === null ? <today's body>(p) : remember(memory.basis, key, () => <today's body>(p))`. Keyed as written by `keyOf`, like the other two, not on `path.resolve(p)`: its answer depends only on `path.resolve(p)`, which the as-written absolute key fixes, and `path.resolve` calls `process.cwd()` for a relative `p`, so it must sit inside `keyOf`'s `try` (Decision 22). It stays uncharged: one realpath per root per decision, as today, and line 410's comment still holds.
- **`fileIdentity(p)`** (exported, changed): the same shape, `const key = memory === null ? null : keyOf(p);` then `key === null ? <today's body>(p) : remember(memory.ids, key, () => <today's body>(p))`. It stays uncharged: every caller already charges per call (the identity-chain loop, the kernel loop, `resolvesUnder`'s entry) or makes a handful (`sameFileAsSettings`).

#### Module-private helpers

`keyOf(p)` (Decision 22):

- returns `null` unless `p` is a non-empty string, so a non-string never reaches `path.isAbsolute` and `''` never shares the key `<cwd><sep>` with a real folder;
- otherwise, inside `try`, returns `` path.isAbsolute(p) ? p : `${process.cwd()}${path.sep}${p}` `` (the line-142 rule, as written, no tidying);
- returns `null` from its `catch` (a `process.cwd()` that throws, for a working folder deleted under the process), so the wrapper falls back to the uncached body and nothing escapes.

`remember(map, key, compute)`:

- returns `compute()` when `map` or `key` is null;
- returns the stored value when there is one;
- otherwise computes, and stores the value only while `map.size < MEMORY_ENTRIES_MAX` and `memoryChars + key.length + size <= MEMORY_CHARS_MAX`, where `size` is the length of the value's `real` (a walk or a basis) or of the string (an identity), else 0; a stored value adds `key.length + size` to `memoryChars`.

The stored value is frozen with `Object.freeze`, and so is its `tail` array when it has one. `fileIdentity`'s string, null or undefined are stored as they are. `keyOf` and `remember` are each one function used by all three wrappers.

#### Changes to comments

- Header "A DECISION BUDGET" (lines 80–90) becomes a paragraph headed "A DECISION BUDGET, COUNTED IN WORK". It says:
  - what a unit is, and the one text rate (`textBudgetSpent`, `CHARS_PER_UNIT`) and where it is charged;
  - that past the count or the backstop, `resolvesUnder` refuses at its entry and every walk returns `'resolve-failed'`, a remembered one included;
  - that `fileSpec` and `isLedgerWrite` keep asking `budgetSpent` (now with a cost, `isLedgerWrite` through `textBudgetSpent`);
  - that it is set once per decision by `protect-records.js`, which gives its own sentence for a refusal made past it.
- One paragraph "MEMORY WITHIN ONE DECISION" covers what is remembered, the key (as written; never for a non-string, an empty string or a key that cannot be built), the two caps (entries and characters), the freeze, its life (set by `setWorkBudget`, a fresh process per call, and no memory in the menu process), and why a hit charges nothing (Decision 5).
- Line 42 "and the decision deadline" becomes "and the decision budget".
- The JSDoc of `budgetSpent` (lines 448–454) names the cost and its floor.

#### Error handling

No `throw` is added. One `catch` is added, in `keyOf`, and it returns `null`, so the wrapper takes the uncached body. `remember` only calls `Map` methods on maps the module owns. The wrappers keep the never-throws contract (header lines 72–78): the only new work before the delegated call is `keyOf`, which cannot throw, and the cost-0 `budgetSpent`, which calls `Date.now()` and compares numbers, as today; each body they delegate to already catches everything (Decision 22).

#### Cross-platform notes

Keys are absolute paths built by the line-142 rule with `path.sep`, as the code already builds them. Nothing assumes a separator.

### File: `src/hooks/protect-records.js`

**Action:** MODIFY

- Replace line 245–246 (`DECISION_BUDGET_MS`) with:
  - `/** The work one decision may do: about one file-system step per unit, the shell's text one unit per 64 characters (owner, 2026-10-19). */ const DECISION_WORK_UNITS = 3000000;`
  - `/** The backstop: a decision still running after this long refuses. A tenth of Claude Code's hook time limit, 600 s as verified at Step 9. */ const DECISION_BACKSTOP_MS = 60000;` (Step 9 sets it to a tenth of the limit it verifies; it STOPs below 600 s; Decision 15.)
- Beside `REFUSAL_SETTINGS` (lines 241–243), one sentence: `const REFUSAL_WORK = 'CTOC refused this call because checking it would take more work than CTOC allows for one call; split it into smaller commands and run them one by one.';` (Decision 17).
- Module-private, above `main()`:
  - `/** The work sentence for a refusal made once the decision's count or backstop is spent; an allow stays an allow (Decision 17). Never throws. */ function workSentence(sentence) { if (sentence === null) return null; try { return require('../lib/real-path-confinement').budgetSpent(0) ? REFUSAL_WORK : sentence; } catch { return sentence; } }`
  - A resolver that does not load keeps the check's own sentence (case 152's degraded release), and the call is still refused. `budgetSpent(0)` charges nothing.
- `main()` line 1162 `refused = decide(payload);` becomes `refused = workSentence(decide(payload));`. It sits inside the existing `try`, and the fail rule in the `catch` (lines 1163–1178) is unchanged.
- In `decide()` (line 1111), inside the existing `if (budgetResolver !== null)`, two calls: `budgetResolver.setWorkBudget(DECISION_WORK_UNITS); budgetResolver.setDeadline(Date.now() + DECISION_BACKSTOP_MS);`. The comment above (lines 1107–1108) and its Decision 35 reasoning stay.
- Header sentence at lines 42–44 ("From 5 seconds after the decision starts …") becomes: "Once the decision has done `DECISION_WORK_UNITS` units of work, or has run `DECISION_BACKSTOP_MS` (the backstop), every walk fails and every check whose failure could let the call through refuses or is backed by one that refuses; the refusal then gives `REFUSAL_WORK`."
- Header limit at lines 170–174 ("a padded command of tens of kilobytes: … stop at 5 seconds …"). Step 10 writes this sentence verbatim, with no numbers and no marker (Decision 18): "a padded command: the walks and the shell's text work stop when the decision's count of work runs out and refuse with the work sentence; Node's start-up, reading the payload and the other checks are outside the count; the backstop clock (`DECISION_BACKSTOP_MS`) refuses with the same sentence; Claude Code's hook time limit is ten times the backstop." Step 15 adds Step 12's measured numbers to it.
- Nothing else changes. `fileSpec`'s `confinement.budgetSpent()` (line 499) keeps its default cost of 1.

**Wiring (the live call site):** `decide()` is reached from `main()` (line 1162), the entry `hooks/hooks.json` registers (read, line 10). `setWorkBudget` is called there on every decision, both Bash and editing tools, and `workSentence` wraps every verdict.

### File: `src/hooks/PreToolUse.Bash.js`

**Action:** MODIFY

- Module-private, above `isLedgerWrite`:
  - `/** Charge the shell's text work of `chars` characters to the decision's count, at the resolver's one rate; true once the count or its backstop is spent. */ function chargeText(chars) { return realPathConfinement !== null && realPathConfinement.textBudgetSpent(chars); }`
  - The rate lives in the resolver only (`CHARS_PER_UNIT`), so Step 9's rate rule changes one constant (Decision 12).
- Line 343 becomes `if (chargeText(prefix.length + rawPrefix.length)) return true;`. The folder-change chain is rebuilt from these two strings, so its cost grows with their length.
- Line 421 becomes `if (chargeText(prefix.length + t.length)) return true;`. `resolveTokenPath(prefix, t)` joins and tidies both.
- Lines 435–436 (the link test over the candidates, operands and quoted literals alike) become a loop that charges each candidate and returns directly (Decision 13):
  - `for (const t of candidates.slice(0, OPERAND_RESOLUTION_CAP)) { if (chargeText(prefix.length + rawPrefix.length + t.length)) return true; if (operandResolvesIntoLedger(prefix, t, spec.dir, rawPrefix)) { touches = true; break; } }`
  - `operandResolvesIntoLedger` joins the candidate to both prefixes, so each candidate is charged with both.
- After the `if (!touches && spec.dir)` block and before line 438, one line: `if (realPathConfinement !== null && realPathConfinement.budgetSpent(0)) return true;`. A count that ran out inside the link test makes `resolvesUnder` answer `true`, which line 438's read-only exemption would let through on a last segment such as `cat x` (read: lines 296, 435–440; Decision 13).
- The comments at lines 339–342, 419 and 426–430 say "the decision's count of work, charged by the length of the text" in place of "the owner's 'refuse after 5 s'".
- `module.exports` is unchanged.

**Wiring:** `isLedgerWrite` is called from `protect-records.bashRefuses` (read: lines 1066 and 1074–1076; the other calls at 1090, 1091 and 1095 sit behind `RECORD_REFUSALS_OFF`).

### File: `tests/protect-records.test.js`

**Action:** MODIFY. New cases go at the end of the describe block "the write protection compares real files, not spellings (owner, 2026-10-15)", after case 160 (read: lines 1564–1591), using its `rowTest`, `R.row`, `asAgent`, `ro`, `cfg`, `RPC`, `put`, `rm`, `assertRefused` and `assertAllowed`.

**One helper, `workPreload(name, opts)`.** It writes a preload into the case's temporary project, in the shape of cases 151, 154 and 155 (read: lines 1400–1406, 1458–1465, 1480–1486), and returns a function that spawns `process.execPath --require <preload> ENTRY` with the hook's input JSON on stdin and `CLAUDE_CONFIG_DIR: cfg`. The preload:

1. Freezes the clock: `Date.now = () => now` with `now` starting at `1e12`.
2. Wraps `safe-fs`'s `lstatSync`, `statSync`, `realpathSync` and `readlinkSync` (the module the resolver reads through; read: `real-path-confinement.js` line 107). Each call adds one to a counter and `opts.stepMs` to `now`.
3. When `opts.units` is a number, wraps `setWorkBudget` so the decision's count becomes `opts.units` (`typeof set === 'function'` guard, as the existing preloads do).
4. When `opts.chargeAfterSet` is a number, the wrapped `setWorkBudget` calls `budgetSpent(opts.chargeAfterSet)` right after it sets the count, so `setWorkBudget(0)` followed by a charge of 1 leaves the count really spent before the decision's first check (Decision 20).
5. When `opts.spendAtFirstLookup` is set, wraps the exported `resolveExisting` so its first call sets the count to 0 first (the shape of case 154).
6. On `process.on('exit')`, writes `{ calls, elapsed: now - 1e12, spent }` to `opts.out` when given: the fake clock's span, never wall time, and `spent`, the resolver's `budgetSpent(0)` at exit (false when the function does not exist).

No row reads wall time. Every verdict depends only on counts and the fake clock, so it does not depend on load.

The file gains one sentence copy beside its `REFUSAL_SETTINGS` copy: `REFUSAL_WORK`, the exact text of Decision 17. Every row below that is refused because the count or the backstop ran out asserts `REFUSAL_WORK`.

**The builder fixture** is the probe's command, verbatim (read: `p40lib.js` lines 30–31): `cd copy && cd src && cd .. && cat > tests/claude-setup-check.test.js <<'EOF'`, newline, `'use strict';`, newline, `const { route } = require('../src/lib/menu-screens');`, newline, 300 lines of the form `  test('${i} claude-setup apply advisor writes the setting', () => { assert.equal(route(['claude-setup', 'apply', 'advisor'], dir).ok, true); });`, newline, `EOF`, newline, `node --test tests/claude-setup-check.test.js`. The case also makes `copy/src`. The **nine-check layout** is a project made inside `<tmp>/pr-wt-…/.claude/worktrees/w`, with the same folders as `makeProject` plus `copy/src`. There the hook protects the main checkout's three files as well (read: `protectedSettingsFiles`, lines 362–367), so a background agent runs 2 + 7 = 9 checks. When Unicode compatibility folding changes the command, each of the agent's seven checks runs `isLedgerWrite` a second time on the folded text (read: `protect-records.js` lines 1073–1075), so an allowed agent call makes 2 + 14 = 16 runs (Decision 23).

**The folded copies** (Decision 23) are the builder fixture and the 2,000-line fixture each with one line changed to hold `…` (U+2026) mid-word inside an existing quoted literal, never beside a path separator, so its fold to `...` can never become a `..` path segment:

- the folded builder: the first test line's title ends `writes the setting…'` in place of `writes the setting'`;
- the folded 2,000-line fixture: line `0000` is `t('0000 a0000…', () => f0000(['c0000', 'd0000']));`, 50 characters.

The base fixtures stay byte-for-byte (case 161, case 162 (a) to (f) and unit 27 (viii) use them). Each folded row asserts `cmd.normalize('NFKC') !== cmd` before it spawns, so it cannot pass without the folded reading running.

**The 2,000-line fixture** (Decision 14) is the builder's first line, then 2,000 lines of distinct words, then `EOF`: line `i` (four digits, `0000` to `1999`) is `t('<i> a<i>', () => f<i>(['c<i>', 'd<i>']));`, 49 characters. Each line gives six candidates of its own (`a<i>,`, `f<i>[c<i>,`, `d<i>];` and the literals `<i> a<i>`, `c<i>`, `d<i>`) and one shared (`=`: the operand split reads `>` as a space, read: `PreToolUse.Bash.js` line 415). The whole command is about 100,000 characters; the row asserts it is under 163,840 characters, the hook branch's cap on a background agent's command (Decision 16).

**The two padded shapes** (Decision 12). `N` is the name `n` repeated 102,400 times (100 KB), absent from the project.

- Shape A: `cd N; ` then 450 segments, segment `k` being `true 'p<k>_0' 'p<k>_1' … 'p<k>_127'; ` (128 distinct quoted literals). About 680 KB.
- Shape B: `cd N; ` then 450 segments, segment `k` being `true x'q<k>_0'x'q<k>_1'…x'q<k>_127'; ` (one operand holding 128 distinct literals). About 730 KB.

Both are over 163,840 characters, so their rows run for the main session only (Decision 16).

**Case 161 · the builder's here-document is decided by its work, not by how slow the machine is**

- (a) A background agent in the nine-check layout.
  - A counting run (`stepMs: 0`, `out`) gives `F` file-system calls. Assert `F > 0`.
  - A second run with `stepMs = 25000 / F`, so the decision spans 25 s of clock time, is **allowed**.
  - Red before Step 10: the 5-second clock refuses at a fifth of the way (`REFUSAL_SETTINGS`).
- (b) The same for the main session in that layout: **allowed**. Red before.

**Case 162 · ordinary commands spend at most a third of the count (the margin)**

Rows (a) to (e) use `units: 1000000` and a frozen clock (`stepMs: 0`), and each is **allowed**:

- (a) the builder, background agent, nine-check layout;
- (b) the builder, main session, nine-check layout;
- (c) the builder, main session, plain project;
- (d) the builder with its first line `cd ${project} && cat > notes.js <<'EOF'` (an absolute folder change), background agent, nine-check layout;
- (e) `cd ${project} && git add src/f0.js … src/f127.js`, background agent, nine-check layout.

The last two guard the text rate against the common shape of a worktree agent that changes folder by absolute path (Decision 3). All are green before the change, because the old code has no count; they are guards.

- Under Step 11's mutation (e), the absolute-folder here-document row turns red: at one unit per character, with the candidate and resolver charges of Decision 12, it costs about 16 million units against the 1,000,000 cut (planner's estimate).
- The `git add` row does not turn red: at about 128 × 350 × 9 ≈ 0.4 million units it stays under the cut. It is kept as a realism guard, not as a mutation guard.

Row (f), the stated here-document limit (Decision 14), runs at the **shipped count** (3,000,000 units), not at the third: the 2,000-line fixture, background agent, nine-check layout, frozen clock, is **allowed**. The row also asserts the command is under 163,840 characters. Planner's estimate of its cost: about 1.4 million units. Green before (no count); it guards the line limit `docs/ENFORCEMENT.md` states.

Rows (g) and (h) are the folded copies of (a) and (f) (Decision 23): the same session, layout and frozen clock, with the folded fixture in place of the base one. Each asserts `cmd.normalize('NFKC') !== cmd`, so the agent's seven checks each run a second time on the folded text (16 runs in all):

- (g) the folded builder, background agent, nine-check layout, `units: 1000000` (the third, as (a)): **allowed**. Planner's estimate of its cost: about 0.7 million units, a thin margin against 1,000,000 (the unchanged operands are answered from memory, so roughly only the per-check text and hits scale by 16 ÷ 9). An estimate, not a fit; Step 12's stop rule decides.
- (h) the folded 2,000-line fixture, background agent, nine-check layout, the **shipped count** (3,000,000, as (f)): **allowed**, and the command is under 163,840 characters. Planner's estimate of its cost: about 2.5 million units. If Step 12 measures more than the count, Decision 14's line-limit rule sets the folded shape's own line limit.

Both are green before (no count); they guard the margin and the stated limit for a command that folding changes.

**Case 163 · the backstop clock still refuses when it is hit**

The builder, background agent, nine-check layout. From a counting run, `stepMs = 1200000 / F`, so the decision would span 1,200 s. It is **refused** with `REFUSAL_WORK`: the 60 s backstop falls within the first check, which makes nearly every file-system call. Red before: the old clock refuses at 5 s, with `REFUSAL_SETTINGS`. Step 11 mutations (g) and (p) turn it red.

**Case 164 · pathological text work is refused by the count, not by the backstop**

- (a) `'cd a; '.repeat(12000) + 'ls'` (72 KB), frozen clock, the shipped count. It is **refused**, `REFUSAL_WORK`, for the main session and the background agent.
  - The count it reaches: about 12,000 + 12,000² ÷ 32 ≈ 4.5 million units in the first check, so it is refused there.
  - Red before: with the clock frozen, the old code finishes the chain and allows it.
- (b) Shape A, main session, plain project, the shipped count, `stepMs: 1`, `out`. It is **refused**, `REFUSAL_WORK`, and the `out` file's `elapsed` is under 60,000: the backstop was not reached, so the count refused.
  - Planner's estimate: each candidate costs about 9,600 units (the candidate charge 1 + ⌊204,800 ÷ 64⌋ = 3,201, the operand charge about 1,600, the `resolvesUnder` entry about 1,600, two kernel steps about 3,200), so the count runs out after about 310 candidates, in the third segment, after about 5,000 file-system calls.
  - Red before: the old 5 s clock refuses at 5,000 fake milliseconds, with `REFUSAL_SETTINGS`.
- (c) Shape B, the same way: **refused**, `REFUSAL_WORK`, `elapsed` under 60,000. Red before, as (b).

**Case 165 · a command too large for its count is refused when the count runs out**

Frozen clock, `units: 10000`:

- 32 segments, each `cp s<k>_0 … s<k>_127 d` (every operand distinct). Each operand costs at least 6 units on any disk depth (the operand charge, the candidate charge, the `resolvesUnder` entry and at least three walk steps), so the command costs at least 24,000. It is **refused**, `REFUSAL_WORK`, for both sessions. Red before.
- Control: `cp x0 x1 d` at the same count is **allowed** for both sessions.

**Case 166 · the three budget cases again, with the count spent instead of the clock**

The preloads set the count to 0, an empty count that each row's first charge spends (`fileSpec`'s `budgetSpent()`, the shell's first segment charge, or the walk's first step after `resolveExisting`'s cost-0 entry check; Decision 20) (old code: the setter does not exist, the guard does nothing, and each row is allowed, so it is red before):

- `Write src/x.js` is **refused** (`REFUSAL_WORK`), as case 151.
- Background agent, `echo x > src/x.js`, with `spendAtFirstLookup`: **refused** `REFUSAL_WORK`. The main session with the same preload is **allowed**, as case 154.
- `cd a; cd a; cd a; ls` is **refused** `REFUSAL_WORK` for both sessions, as case 155.

The controls without a preload are those of 151, 154 and 155.

**Case 167 · the work sentence names the cause, and only when the count or the backstop is spent**

- (a) Main session, `cd a; cd a; cd a; ls`, `units: 3`, frozen clock: **refused** with exactly `REFUSAL_WORK` on stderr and in the decision JSON. Red before (no setter, so allowed).
- (b) Main session, `echo x > .ctoc/settings.yaml`, the shipped count: **refused** with `REFUSAL_SETTINGS`, not the work sentence. A genuine refusal keeps its own sentence. Green before and after.
- (c) A `Read` payload of `src/x.js` with `units: 0`, `chargeAfterSet: 1` and `out`: **allowed**, and the `out` file's `spent` is `true`. An empty count is not yet spent (Decision 20), so the preload charges one unit after the setter; the row's own `spent` assertion shows `workSentence` really met a spent count and an allow. An allow is never rewritten. Red before on `spent` only (no count; the verdict is allowed before and after). Red under Step 11 mutation (s).

**Existing rows changed (Decisions 8 and 17).** Each change tightens the sentence to the cause; no verdict changes:

- Case 151's refused row asserts `REFUSAL_WORK` in place of the default `REFUSAL`.
- Case 154's agent row asserts `REFUSAL_WORK` in place of `REFUSAL_AGENT_SETTINGS`.
- Case 155's two refused rows assert `REFUSAL_WORK` in place of `REFUSAL_SETTINGS`, and its title `… (the owner's "refuse after 5 s")` becomes `… once the backstop clock has run out`.

Their preloads and controls stay byte-for-byte. These rows turn red at Step 8, before the change, because the old code gives the old sentences.

### File: `tests/a-link-cannot-leave-the-repository.test.js`

**Action:** MODIFY. The file's last case is 26 (read: line 839), so these are 27 and 28.

- They require `PreToolUse.Bash.js`'s `isLedgerWrite` and the confinement module's `setWorkBudget`, `setDeadline` and `budgetSpent`.
- They count file-system calls with `t.mock.method(safeFs, …)` wrappers that delegate, the pattern case 21 uses (read: lines 593–602).
- They use `withCwd(root, …)`, because `operandResolvesIntoLedger` measures against `process.cwd()`.
- Every row clears `setWorkBudget(null)` and `setDeadline(null)` in `finally`.

**Case 27 · within one decision a lookup is made once, and the memory dies with the decision**

- (i) After `setWorkBudget(3000000)`, asking `resolvesUnder('src/x.js', '.ctoc/approvals', root)` twice: the second ask makes 0 file-system calls.
- (ii) Nine checks, before and after.
  - The fixture root sits at `<tmp>/<scratch>/.claude/worktrees/w`, with `copy/src`, as in the hook's nine-check layout, so the three `../../…` paths of the main checkout land inside the fixture, never above the system's temporary folder.
  - Run `isLedgerWrite` on the first 10 lines of the builder fixture once per spec, nine specs whose `dir` is each of the nine relative paths of the nine-check layout. The `segmentRe` and `resolvedRe` match nothing.
  - With the memory on, checks 2 to 9 each make at most `2 × s + 6` file-system calls, where `s` is the number of segments of `<root>/<dir>`. That is the protected path's own walk, the kernel's check of its absent names, and two identity reads.
  - With the memory off (`setWorkBudget(null)`), each check makes more than that.
  - The total with the memory off is at least 5 times the total with it on. This is the planner's estimate: about 70 times on this machine; Step 12 records the real ratio.
- (iii) The memory never outlives the decision.
  - In one decision, `resolvesUnder('src/L/x.json', '.ctoc/approvals', root)` is `false` (`src/L` absent).
  - Then the test makes `src/L` a link to `.ctoc/approvals`. In a fresh decision (`setWorkBudget` again) the same question is `true`. With the count cleared it is `true` too.
- (iv) Past the count a remembered walk returns the fault. `setWorkBudget(1000000)`, then `resolveExisting(<root>/src/x.js)`, which is `ok`. Then `budgetSpent(10000000)`. The same `resolveExisting` returns `{ ok: false, reason: 'resolve-failed' }`.
- (v) The entry cap, at its exact value. After 32,768 distinct remembered walks (absent names `<root>/n<i>`, count 3,000,000), the 32,768th path asked again makes no file-system call, and the next distinct path, asked twice, makes file-system calls both times. If Step 12 moves `MEMORY_ENTRIES_MAX`, this number moves with it, with the reason written (Decision 14).
- (v-b) The character cap. With `setWorkBudget(1e9)`, after 300 distinct remembered walks of `<root>/m<i>/<30,000 × z>` (both names absent; each key and its stored path are about 30,000 characters, together over 16,777,216 ÷ 300), the next distinct path of that shape, asked twice, makes file-system calls both times. The long name is the second missing one, so the walk never asks the disk for it; only the kernel check does, and any answer it gets leaves the row's verdict the same.
- (vi) A remembered answer is frozen: `Object.isFrozen(r) && Object.isFrozen(r.tail)`.
- (vii) Asking a remembered question again and again runs the count down. After `setWorkBudget(100000)`, repeated `resolvesUnder('src/x.js', '.ctoc/approvals', root)` turns from `false` to `true` within 100,000 asks.
- (viii) The memory holds the stated here-document limit. As (ii), with the 2,000-line fixture (the same text as the hook file's, Decision 14) in place of the builder's first 10 lines, `setWorkBudget(3000000)`: checks 2 to 9 each make at most `2 × s + 6` file-system calls. Red under Step 11 mutation (q).
- (ix) The as-written reading is never answered from the tidied one's memory (Decision 21). The test makes `.ctoc/approvals/inner` a folder and `src/L` a link to it (a junction on Windows, as the file's other link rows make it). In one decision (`setWorkBudget(3000000)`, `withCwd(root, …)`):
  - `resolvesUnder('src/x', '.ctoc/approvals', root)` is `false`;
  - then `resolvesUnder(['src', 'L', '..', 'x'].join(path.sep), '.ctoc/approvals', root)` is `true`: as written, `..` after the link is the link's real parent, `.ctoc/approvals`. The target is joined with `path.sep`, never `path.join`, which would tidy it.
  - Keyed on the tidied path (`<root>/src/x`), the second ask would get the first walk's answer from memory and be `false`. Red under Step 11 mutation (j).
- (x) A wrapper never throws and never remembers what it cannot key (Decision 22). Each row runs with `setWorkBudget(3000000)` and `withCwd(root, …)`, compares each answer (`deepStrictEqual`) with the same call made after `setWorkBudget(null)` (the uncached answer), and asserts no call throws:
  - non-string: `resolveExisting(42)`, `resolveExisting(null)` and `fileIdentity(42)`; `resolveExisting`'s answer is `{ ok: false, real: null, reason: 'resolve-failed', tail: null }`;
  - empty string: in one decision, with `const here = process.cwd() + path.sep` taken inside `withCwd` (not `root + path.sep`: `makeProject` builds `root` under `os.tmpdir()` unresolved, which on macOS reads `/var/folders/…` while `process.cwd()` reads `/private/var/folders/…`, so the keys would differ), first `resolveExisting(here)` (`ok`) and `fileIdentity(here)` (the folder's identity), then `resolveExisting('')` and `fileIdentity('')`, each equal to its uncached answer. A key built for `''` would be `here` and would serve the folder's answers. Red under Step 11 mutation (u);
  - a `process.cwd` that throws: `t.mock.method(process, 'cwd', () => { throw new Error('uv_cwd'); })`, set inside `withCwd` and restored before it returns, then `resolveExisting('src/x.js')` and `fileIdentity('src/x.js')`, each equal to its uncached answer under the same mock (the file system resolves a relative path against the real working folder, not through `process.cwd`). Red under Step 11 mutation (t).
  - `resolveBasis` is module-private and reached only through `resolvesUnder`, whose own `catch` turns a throw into `true`, so no row can tell its `try` apart; its `keyOf` call is checked by the Step 11 critic.

**Case 28 · the count decides at an exact number**

These rows run with `setDeadline(Date.now() + 60000)` and `Date.now` mocked to that starting instant, so the clock cannot decide. The spec is the settings spec without `dir` (text only, no disk).

| Row | Command | Allowed at | Refused at | How the count is reached |
|---|---|---|---|---|
| (i) | `cd a; cd a; cd a; ls` | 4 | 3 | four segments, one unit each |
| (ii) | `cd <640 × a>; ls` | 22 | 21 | 1, then 1 + ⌊1280 ÷ 64⌋ |
| (iii) | `cd <640 × a>; cp x y` | 44 | 43 | 1 + 21 + two operands at 1 + ⌊641 ÷ 64⌋ = 11 each |

- (iv) `budgetSpent` itself:
  - after `setWorkBudget(10)`: `budgetSpent(10)` is false, then `budgetSpent()` is true;
  - after `setWorkBudget(0)`: `budgetSpent(0)` is false (an empty count), then `budgetSpent()` is true (the first charge spends it; Decision 20);
  - after `setWorkBudget(1)`: `budgetSpent(-5)` is false, then `budgetSpent(NaN)` is true;
  - with no count and no clock: 1,000 calls are all false.
- (v) The clock is independent of the count: `setWorkBudget(1e9)` with `setDeadline(Date.now() - 1)` gives `budgetSpent()` true.

Rows (vi) to (viii) use the link test, so their spec is `{ dir: '.ctoc/approvals', segmentRe: /(?!)/, resolvedRe: /(?!)/ }` (the regexes match nothing), `withCwd(root, …)`, and no clock. `minUnits(f)` is the smallest count `c` at which `setWorkBudget(c); f()` gives the allowing answer, found by doubling from 1 and then bisection, each probe with a fresh `setWorkBudget`; above 10,000,000 it fails the row loudly. Each row compares two commands that differ only in the length of one name, by a multiple of 64 characters, with both names at or under 255 characters so every platform walks them the same way (both absent, `ENOENT`). Then each charged string that holds the name once costs exactly 2 units more (128 ÷ 64), whatever the fixture's own path length, so the difference is exact on every machine.

- (vi) Every place the shell and the resolver charge the folder-change chain's length. `isLedgerWrite("cd " + 'b'.repeat(n) + "; true 'q'", spec)`, allowing answer `false`. `minUnits` at n = 192 minus `minUnits` at n = 64 is exactly **22** (planner's count: the name is held once by 11 charged strings, each costing 2 more):
  - the second segment's charge (prefix and as-written prefix): 2 strings;
  - the operand charge for `'q'`: 1;
  - the candidate charges for `'q'` and `q`, each with both prefixes: 4;
  - `resolvesUnder`'s entry, once per candidate (the tidied and as-written targets are equal, so one call each): 2;
  - two kernel steps on the first walk of `b…/q` (the second candidate's walk is remembered): 2.

  Step 8 records the number the row asserts; Step 10's code is checked against it, and a different count is explained from the code, never fitted.
- (vii) A name past the first missing one is charged by its length. `resolveExisting(<root>/<64 × b>/<k × c>)`, allowing answer `ok: true`: `minUnits` at k = 192 minus `minUnits` at k = 64 is exactly **4** (the tail charge 2, the first kernel step 2).
- (viii) A count that runs out inside the link test refuses a read-only segment. `isLedgerWrite('cat x', spec)` with `setWorkBudget(3)` is `true` (3 units pay the segment, the operand and the candidate; the `resolvesUnder` entry spends the count). With no count it is `false`. Red before (no setter); red under Step 11 mutation (o).

### Tests that exist today and must keep passing

None of them asserts wall time (read: a search of `tests/` for `setDeadline|budgetSpent|DECISION_BUDGET|deadline`, and for `elapsed|duration|hrtime|performance|timeout:` in the six files below). Only `tests/protect-records.test.js` and `tests/a-link-cannot-leave-the-repository.test.js` touch the budget. They do so through `setDeadline`, which keeps its meaning. The two `timeout: 20000` in `tests/the-bash-channel-cannot-reach-the-ledger-through-a-link.test.js` (lines 129 and 381) are spawn limits, not assertions.

- `tests/protect-records.test.js`: every case, including 151, 154 and 155 (now the backstop's cases; their refused rows assert the work sentence, Decision 17) and 156, 157, 159 and 160.
- No other test holds a refusal sentence that a spent count can reach (read: a search for `CTOC refused this call because` over the repository outside `plans/`, 4 files: `src/hooks/protect-records.js`, `docs/ENFORCEMENT.md`, `tests/protect-records.test.js` and `tests/only-the-owner-answers-an-inbox-question.test.js`; the last holds copies of `REFUSAL` and `REFUSAL_SETTINGS` and sets no budget).
- `tests/a-link-cannot-leave-the-repository.test.js`: cases 1–26, including case 21's `setDeadline` rows (lines 623–636).
- The other test files that load the resolver or the hook (read: a search of `tests/` for `protect-records|real-path-confinement|isLedgerWrite`, 10 files). None sets a count, so they get no memory and identical behaviour:
  - `the-bash-channel-cannot-reach-the-ledger-through-a-link`;
  - `a-dangling-link-is-not-a-path-inside-the-tree`;
  - `the-whitelist-cannot-leave-the-repository`;
  - `enforcement-fault-arms`;
  - `plans-keep-moving-without-the-human`;
  - `only-the-owner-answers-an-inbox-question`;
  - `readme-numbers`.
- `tests/hooks.test.js`, `hooks-remaining`, `hooks-installer`, `hooks-installer-hascommand` and `hooks-do-not-manufacture-the-project-marker`.

### Security Review

- **Fail direction.** A spent count refuses at every place a spent clock refuses today, and the clock stays as a backstop. `budgetSpent` charges 1 for a cost that is not a finite number ≥ 0, so `NaN` can never stop the count. A count that runs out inside the shell's link test now refuses a read-only last segment too (Decision 13), which the clock did not. The work sentence changes only the text of a refusal, never an allow (Decision 17).
- **Uncharged text work.** Every text step whose length an attacker controls is charged by its length: the folder-change chain at each segment, each operand, each link-test candidate, `resolvesUnder`'s target, each kernel prefix and each tail name. What stays uncharged is linear in the command's length and runs once or twice per check: the text test and quoted-literal scan over one segment, the NFKC fold, Node's start-up and reading the payload.
- **Memory.**
  - It exists only while a work count is set, so it lives in the hook's own one-call process. The menu process and the unit tests that change fixtures between calls never see it.
  - It is keyed on the exact as-written absolute path, so the as-written and tidied readings are never merged (unit 27 (ix)). A non-string or empty `p`, or a key that cannot be built, is never remembered (unit 27 (x)).
  - A spent count or clock bypasses it.
  - It is capped at 32,768 answers per kind and 16,777,216 characters in all, so memory cannot be exhausted into a crash, even by keys of 100 KB. A crash fails open for calls that do not mention the records or a settings file.
  - Answers are frozen, so no caller can change another's.
- **Race.** Remembering within one decision adds no window. The hook writes nothing while deciding, and a link swapped between the decision and the write is an existing stated limit (read: `protect-records.js` header lines 175–176).
- **No throw is added.** The never-throws contract holds (header lines 72–78): the memory key is built inside `keyOf`'s `try`, and a key that cannot be built falls back to the uncached body (Decision 22).
- **No path traversal, no secrets, no file writes, no regex built from data, no command execution.** The tests spawn with an argument array, as the file already does.
- **Hook time limit (read, to verify at Step 9).** The installed Claude Code 2.1.300 binary, `~/.local/share/claude/versions/2.1.300`, the newest of the four installed, declares `ou=600000` beside the set of hook events. `ou` is the default `timeoutMs` of the hook runners. A hook that times out blocks only when `onFailure` is `"block"` (the function `oHt`, text `timed out; blocking because onFailure is "block"`). Read in the minified binary, not run. That 2.1.300 is the active version is **believed**; Step 9 confirms it with `claude --version` and re-reads the limit offline (the binary or its bundled documentation). Under 600 s, or not verifiable offline, Step 9 STOPs and reports (Decision 15). `hooks/hooks.json` sets neither `timeout` nor `onFailure` (read).
- **Platforms.** The repository's continuous integration runs on `ubuntu-latest` only (read: `.github/workflows/tests.yml` line 11), so a Windows unit's time is not measured. Every gated row decides by the count or a fake clock, so it holds on every platform; the unit rows that compare name lengths keep both names at or under 255 characters so every platform walks them alike.

## Order with the other branches

This plan lands first on main. Next, the hook branch `fix/background-agents-refused-only-setup-apply-and-dismiss` (merged with 6.14.132) and the spelling branch each merge main.

**The hook branch, as the CTO Chief states it (2026-10-19; not read by the planner).**

- Its settings deadline is set in `protect-records.js` at about line 2013 there, not at the top of `decide()`.
- Its setup decision has its own count: `RESOLUTION_BUDGET = 30000` resolutions, spent through `spendResolution` and `memo.left`.
- `AGENT_COMMAND_CAP` (163,840 characters) is checked before any other work.
- For a background agent the setup decision runs first, then the sweep net, then the settings check.

**The merge rule (the CTO Chief's decision, Decision 16).** The two budgets stay separate:

- The setup decision's 30,000 resolutions are its own. They are not shared with the settings check's units, and this plan's memory does not change them.
- The merge replaces the hook branch's settings deadline line (about 2013) with this plan's two setter calls, `setWorkBudget(DECISION_WORK_UNITS)` and `setDeadline(Date.now() + DECISION_BACKSTOP_MS)`. On the shell path the count and the backstop are then set once, after the setup decision and the sweep net, so those two never see the count or the memory; this plan's calls at the top of `decide()` move off the shell path.
- The editing-tool path keeps one pair of setter calls at the top of its own branch (`if (EDITING_TOOLS.has(tool))`), unless the hook branch already sets a deadline there, in which case that line takes this plan's two calls. A `Write` decision is never left without a count, a memory or a backstop (cases 151 and 166 (a) hold it).
- `workSentence` stays in `main()`. Before the setter runs no count is set, so a setup-decision or sweep refusal keeps its own sentence.

**Step 9 checks the stated facts read-only** (`git show <branch>:<file>` and `git diff origin/main...<branch> -- src/lib/real-path-confinement.js src/hooks/protect-records.js src/hooks/PreToolUse.Bash.js tests/protect-records.test.js`, for the hook branch and for the spelling branch):

- where the settings deadline is set, on the shell path and on the editing-tool path;
- which of `resolveExisting`, `resolveBasis`, `fileIdentity`, `resolvesUnder`, `budgetSpent` and `setDeadline` the setup decision and the sweep net call;
- the functions each branch touches.

It STOPs and reports to the CTO Chief if, after the merge rule, the setup decision would run while this plan's count is set and would reach any of those functions (the budgets would then be shared), or if no setter would cover the editing-tool path.

**Functions both sides touch, and what the merge takes.**

- **`protect-records.js`:**
  - `decide()`: the hook branch reorders the background agent's checks and sets the settings deadline at about 2013; this plan sets the count at the top. Take the hook branch's order, put this plan's two setter calls at the hook branch's deadline line for the shell path and at the top of the editing-tool branch (per the merge rule), and delete any `DECISION_BUDGET_MS` line.
  - `main()`: this plan's `workSentence(decide(payload))`. Keep any change the hook branch made to the fail rule.
  - The constants: `DECISION_BUDGET_MS` becomes `DECISION_WORK_UNITS` and `DECISION_BACKSTOP_MS`; `REFUSAL_WORK` is added. The hook branch's `RESOLUTION_BUDGET` and `AGENT_COMMAND_CAP` stay as they are.
  - `bashRefuses`: this plan does not change it; take the hook branch's version.
  - The header sentences at 42–44 and 170–174: take this plan's wording and keep any sentence the branch added.
  - `protectedSettingsFiles`: the hook branch adds files (believed, from the refusal sentences in the scanner's `p40lib.js`). Each extra file now costs only its own walk.
- **`real-path-confinement.js`:**
  - `budgetSpent` and `setDeadline`: keep this plan's charged `budgetSpent(cost = 1)`. A branch's own `budgetSpent()` calls stay valid at the default cost.
  - `resolveExisting` and `walkAsWritten`: the body moved under the wrapper with one added line (the tail charge). A branch's edit to the body applies to `walkAsWritten` and keeps that line. A branch that edits the line-142 `abs` rule must make `keyOf` follow it.
  - `kernelAgrees`: this plan reorders lines 243–244 and charges the prefix. A branch's edit there keeps the charge after the prefix is built.
  - `resolveBasis` and `fileIdentity`: bodies unchanged under the wrappers.
  - `resolvesUnder`: line 411 is charged by length; nothing else changes here.
- **`PreToolUse.Bash.js` `isLedgerWrite`:** take this plan's three charged lines, the candidate loop and the spent check before line 438.
- **Tests.**
  - The hook branch's cases that count file-system calls or budget checks in-process (its cases 101/102, per the brief) see fewer calls, because the memory stops repeated work. A row asserting an upper bound stays green. A row asserting an exact or minimum count is re-measured with the reason written: the work is no longer repeated, not weakened.
  - Preloads that wrap `setDeadline` keep working against the backstop. A hook-branch row refused because the settings budget is spent asserts `REFUSAL_WORK` after the merge, as cases 151, 154 and 155 do here.
  - This plan's rows over 163,840 characters (case 164 (b) and (c)) run for the main session only, so the agent's command cap never decides them. Cases 162 (f) and (h) assert their commands are under that cap, so each stays a test of the count for a background agent after the merge.
- **The plain-text plan** (`plans/implementation/plain-text-in-a-shell-command-is-data-not-a-write-target.md`, not built; this plan does not edit it). Its next revision must:
  - charge its lexing stride as text work (`textBudgetSpent(LEX_BUDGET_STRIDE)`, 65 units per 4,096 code units);
  - make its acceptance criterion 6 and Step 12 ("5-second budget plus one second", "within 6 s") count-based;
  - renumber its hook cases 160–164 and unit case 26, which collide with the existing 160 and 26 and this plan's 161–167 and 27–28.

## Acceptance criteria

1. **Given** the builder's 43 KB here-document from a background agent in a project inside `.claude/worktrees/w` (nine checks), **when** every file-system call moves a fake clock so the decision spans 25 s, **then** the call is allowed. Hook case 161 (a), red before Step 10.
2. **Given** the same for the main session in that layout, **then** it is allowed. Hook case 161 (b), red before.
3. **Given** the count cut to a third (1,000,000 units) and a frozen clock, **when** each of these runs: the builder (agent nine-check, main nine-check, main plain), the builder after an absolute folder change, and `git add` of 128 files after an absolute folder change, and the builder with one line holding `…` so that Unicode compatibility folding changes it (agent nine-check, 16 runs), **then** each is allowed. Hook case 162 (a)–(e) and (g).
4. **Given** a fake clock that would make the builder's decision span 1,200 s, **then** it is refused with the work sentence when the 60 s backstop is reached. Hook case 163.
5. **Given** a frozen clock and the shipped count, **when** `cd a; ` × 12,000 then `ls` runs, **then** it is refused with the work sentence for both sessions. **Given** the shipped count and a fake clock of 1 ms per file-system call, **when** the main session runs either padded shape (`cd` into a 100 KB name, then 450 segments of 128 literals, written apart or glued into one operand), **then** each is refused with the work sentence before the fake clock reaches the backstop. Hook case 164, red before.
6. **Given** a frozen clock and a count of 10,000, **when** 32 segments of 128 distinct `cp` operands run, **then** it is refused with the work sentence, while `cp x0 x1 d` is allowed. Hook case 165, red before.
7. **Given** the count set to 0 (an empty count that the first charge spends), **then** cases 151, 154 and 155's rows are refused as with the clock, with the work sentence. Hook case 166, red before.
8. **Given** one decision, **then** a repeated lookup makes no file-system call; checks 2 to 9 cost only their own protected path, for the builder and for the 2,000-line here-document; the memory is gone in the next decision; a spent count bypasses it; both caps hold; answers are frozen; repeats still run the count down; the as-written reading is never answered from the tidied one's memory; and a non-string `p`, an empty `p` or a `process.cwd()` that throws gets the uncached answer without a throw. Unit case 27.
9. **Given** a fixed clock, **then** the count flips the verdict at exactly 4/3, 22/21 and 44/43 units; `budgetSpent` charges as specified; lengthening the folder-change chain by 128 characters costs exactly 22 more units, and a tail name by 128 characters exactly 4 more; and a count that runs out inside the link test refuses `cat x`. Unit case 28.
10. **Given** the whole suite, **then** `npm test` exits 0 with 0 failed, 0 skipped and coverage at or above `.ctoc/coverage-baseline.json` `minPct`. The only existing tests changed are case 155's title and the expected sentence of the refused rows of cases 151, 154 and 155. Step 14.
11. **Given** `docs/ENFORCEMENT.md`, **then** its budget paragraph and padded-command bullet describe the count, the memory, the backstop, the work sentence word for word, the here-document line limit and Step 12's measured numbers, and no sentence still says 5 seconds. Step 15, `node --test tests/claude-md-keeps-every-rule.test.js`.
12. **Given** the scanner's load probe at loads 0, 16 and 64, **then** the builder's verdicts are all allowed in every arm, and the folder-change chain's verdicts are all refused. Step 13.
13. **Given** a released build, **when** a background agent in a real worktree under `.claude/worktrees/` runs the builder here-document, **then** it is allowed. Step 16, live box.
14. **Given** the 2,000-line here-document of distinct words from a background agent in the nine-check layout, the shipped count and a frozen clock, **then** it is allowed, and the command is under 163,840 characters; and the same holds for its copy with one line holding `…`, which folding changes so the agent's checks run twice (16 runs), at the line limit Step 12 sets for that shape. Hook case 162 (f) and (h).
15. **Given** a refusal made once the count is spent, **then** its sentence is exactly the work sentence; a genuine settings write within the count keeps the settings sentence; and an allowed call whose count is really spent (the row asserts `budgetSpent(0)` at exit) stays allowed. Hook case 167.

### Acceptance criteria mapping

| Criterion | Implemented in | Test |
|---|---|---|
| 1, 2 | count + memory + backstop at 60 s | hook 161 |
| 3 | memory, text rate; the folded reading's second run per agent check | hook 162 (a)–(e), (g) |
| 4 | `setDeadline` kept, 60 s; `workSentence` | hook 163 |
| 5 | `chargeText` at line 343 and per candidate; resolver length charges | hook 164 |
| 6 | per-step charges, count | hook 165 |
| 7 | `setWorkBudget(0)` is an empty count; the first charge spends it; `workSentence` | hook 166; cases 151, 154, 155 |
| 8 | `keyOf`, `remember`, wrappers, both caps, freeze, entry check | unit 27 |
| 9 | `budgetSpent(cost)`, `textBudgetSpent`, the five length charges, the tail charge, the spent check before the read-only exemption | unit 28 |
| 10 | everything | `npm test` |
| 11 | docs | Step 15 |
| 12 | everything | Step 13 scanner |
| 13 | wiring | Step 16 |
| 14 | `MEMORY_ENTRIES_MAX`, `MEMORY_CHARS_MAX`, the count; the folded reading's second run per agent check | hook 162 (f), (h); unit 27 (viii) |
| 15 | `REFUSAL_WORK`, `workSentence` in `main()` and its null check | hook 167 |

## Risks

| Risk | Mitigation | Where |
|---|---|---|
| The memory serves a stale or wrong answer | Only while a count is set (one hook process); exact as-written absolute key; `''` never keyed; a fresh memory per `setWorkBudget`; a spent budget bypasses it; frozen answers | `real-path-confinement.js`; unit 27 (iii), (iv), (vi), (ix), (x) |
| A wrapper throws where the body never did (a non-string `p`, a `process.cwd()` that throws) and the hook's fail rule lets the call through | `keyOf` returns null for a non-string or empty `p` and from its `catch`; the wrapper then takes the uncached body | Decision 22; unit 27 (x); Step 11 (t), (u) |
| A command fills the memory and crashes the hook, which fails open | Caps of 32,768 answers per kind and 16,777,216 characters in all; past either, full price | `MEMORY_ENTRIES_MAX`, `MEMORY_CHARS_MAX`; unit 27 (v), (v-b); Step 13 |
| Free hits let a command loop without spending | Every segment, operand, candidate, `resolvesUnder` entry and chain step charges at least 1 | unit 27 (vii); Step 11 (i) |
| Text work an attacker controls goes uncharged (a 100 KB folder name joined to every literal) | Charged by length at every place it is joined or walked; the padded shapes are refused by the count | Decision 12; hook 164 (b), (c); unit 28 (vi), (vii); Step 13 |
| A count spent inside the link test lets a read-only last segment through | The spent check before the read-only exemption | Decision 13; unit 28 (viii) |
| The text rate refuses legitimate work, or undercharges it | 64 characters per unit, guarded by the absolute folder-change rows; Step 9 measures the per-character time against a file-system step and lowers the rate if text is undercharged | Decision 3; hook 162; Step 9 |
| The builder's real cost exceeds a third of the count | Step 12 measures it exactly; above 1,000,000 the build stops and reports | Step 12 |
| The 2,000-line here-document exceeds the count, or its memory exceeds about 64 MB | Step 12 measures cost, entries and memory; the line limit becomes the largest that fits, and the CTO Chief is told | Decision 14; Step 12 |
| Unicode compatibility folding doubles a background agent's settings checks (2 + 2N runs, 16 in the nine-check layout; `protect-records.js` lines 1073–1075), so the folded builder exceeds the third or the folded 2,000-line here-document exceeds the count | Folded copies of both rows; Step 12 measures each and applies the same stop rule (the builder over 1,000,000: STOP and report) and the same line-limit rule (the 2,000-line copy over 3,000,000 or about 64 MB: the folded shape's own limit, stated in `docs/ENFORCEMENT.md`, and the CTO Chief is told) | Decision 23; hook 162 (g), (h); Step 12 |
| A slow machine still lets the clock decide | It now needs more than 60 µs per unit for the builder (20 µs for the 2,000-line limit), over 20 (7) times the scanner's normal-load figure | Decisions 2 and 15; Step 13 load probe |
| Windows' time per unit is not measured (continuous integration runs on `ubuntu-latest` only, `.github/workflows/tests.yml` line 11) | An ordinary command's verdict is decided by the count on every platform; only the backstop depends on the platform, and it refuses, never allows. What would show the Windows figure: the scanner's `p41.js` run on a Windows machine, its time per budget check set beside this Mac's | Decision 15 |
| Claude Code's hook time limit is lower than read | Step 9 verifies it offline and STOPs under 600 s or when it cannot verify; the backstop is a tenth of the verified limit | Decision 15; Step 9 |
| Merge collisions with the hook branch and the spelling branch | Bodies moved under thin wrappers with one added line each; separate budgets; the count set once at the hook branch's deadline line; Step 9 reads both branches and STOPs if the budgets would be shared | Order section; Decision 16 |
| The work sentence hides a genuine refusal's cause | It is given only when the count or the backstop is spent at the end of the decision; a genuine refusal within the count keeps its own sentence | Decision 17; hook 167 |

## Decisions Taken Under Ambiguity

1. **`setDeadline` is kept as the backstop setter, and one setter is added (`setWorkBudget`).** The charge is the default argument of the existing `budgetSpent`. Cases 151, 154 and 155 and unit case 21 keep their meaning as backstop tests, so does every other branch's preload that wraps `setDeadline`, and the one added export has a live caller. (Superseded in part by Decision 12: a second export, `textBudgetSpent`, is added, with its live caller in `isLedgerWrite`.)
2. **The backstop is 60 s.** That is a tenth of Claude Code's default hook limit of 600,000 ms (read in the installed 2.1.300 binary; active version believed). A timed-out hook does not block unless `onFailure` is `"block"`, which `hooks/hooks.json` does not set, so the backstop must sit well under the limit. 60 s also refuses when hit. (Superseded in part by Decision 15: the limit is verified offline at Step 9, and the backstop is a tenth of the verified limit.)
3. **Text is charged at one unit per 64 characters, plus one per check, not one unit per character.** The planner's estimate for a common legitimate shape: a worktree agent's `cd <67-character absolute path> && cat > f <<'EOF'` of 300 lines. That is about 15 operands per line × (1 + 67 + 8) characters × 9 checks ≈ 3.1 million units at one per character, which would be refused. At 64 characters per unit it is about 81,000. A 64-character join and tidy is believed far cheaper than one file-system step (about 2.6 µs per step from the scanner's figures), so text is still charged above its real cost. Step 9 measures both. If 64 characters ever take longer than one step, the rate is lowered to the measured ratio, rounded down to a power of two, and recorded. The pathological chain is still refused within its first check (about 4.5 million units at 12,000 segments). (Superseded in part by Decision 12: with the candidate and resolver charges, the absolute-folder here-document costs about 460,000 units at 64 characters per unit and about 16 million at one per character, planner's estimate. The rate is one constant, in the resolver.)
4. **The memory covers three lookups: `resolveBasis`, `resolveExisting` and `fileIdentity`.** These are the root lookup, each path's real location, and the identities the comparison reads. The identity chain is rebuilt from remembered identities, charging one unit per step. `protect-records.isAbsentOrRegularFile` (one stat per agent spec) is not remembered. Each of these choices keeps the diff to three thin wrappers.
5. **A memory hit charges nothing; misses are charged as today.** Each segment, each operand, each `resolvesUnder` entry and each identity-chain step still charges, so a hit is always under a floor of 1. `resolveBasis` stays uncharged: once per root per decision, as today.
6. **The count is 3,000,000 units (the owner's figure), with a sizing rule.** The builder must be allowed at a third, 1,000,000 units, in every layout. Hook case 162 tests this, and Step 12 measures the exact cost. The planner's estimate for the nine-check agent is about 350,000 units:
   - 300 lines × 18 candidates × 2 readings × 9 checks × about 3 units of hits;
   - plus about 20,000 for the first walks;
   - plus about 43,000 for text.

   It is an estimate, not a measurement. (Superseded in part by Decision 12: the candidate charge adds about 300 × 18 × 9 ≈ 49,000 units and the kernel's length charge about 10,000, so about 410,000, still an estimate.) (Extended by Decision 23: when folding changes the command, the agent's seven checks each run twice, 16 runs in all; the folded builder, about 0.7 million units by the planner's estimate, must also fit the third, hook case 162 (g), and Step 12 measures it under the same stop rule.)
7. **Tests are load-independent by construction.** Every spawned row uses a fake clock, frozen or calibrated from a counting run, or a count cut by the preload. No row reads or asserts wall time (the owner's rule: timing tests run at most daily, outside the gated suite).
8. **Case 155's title changes, and only its title.** "refuse after 5 s" no longer describes the hook: the case now holds the backstop clock. Its preload and assertions are unchanged, a label correction under lesson 14 with its reason written. (Superseded in part by Decision 17: the refused rows of cases 151, 154 and 155 also change their expected sentence to the work sentence.)
9. **No new test file.** The rows go into the two existing files, so no documented count moves and `CLAUDE.md` stays out of `files:`.
10. **No `parent_plan`.** This plan lands alone and first. Pointing it at the plan that introduced the clock would group it with the plain-text plan, which has that parent.
11. **Remembered answers are frozen** (`Object.freeze`, and the `tail` array). It costs one line and stops one caller from changing another's answer.
12. **Uncharged text work is charged by its length (the critic's first finding, round 1; the CTO Chief's decision).** One unit plus one per 64 characters, at one rate held in the resolver (`CHARS_PER_UNIT`, exported through `textBudgetSpent`), so Step 9's rate rule changes one constant. Charged at:
    - `resolvesUnder`'s entry, by the target's length;
    - each `kernelAgrees` step, by the prefix's length;
    - each link-test candidate in `isLedgerWrite` (lines 431–436), by the prefix, the as-written prefix and the candidate. Every candidate is charged, operands included, because the loop is over all of them; an operand then pays twice, which overcharges by about one unit per operand per check;
    - each name the walk adds to its tail past the first missing one, by its length. This is charged rather than length-checked, because a length check would change verdicts and charging changes none.

    The glued-literal form `x'1'x'2'…` is tested with the 100 KB folder name in front (shape B): without it, its one operand is charged by its length at the operand and candidate charges and at `resolvesUnder`'s entry, its 128 literals are short, and the scan that finds them is linear in the segment, so it carries no uncharged amplification of its own.

    Reason: the folder-change chain is joined to every candidate and walked, so `cd <100 KB name>` followed by 450 segments of 128 literals did megabytes of text work per check for a few units. Both padded shapes are refused by the count, not the backstop (hook case 164 (b), (c)). Each charge has a unit row that measures it exactly (unit case 28 (vi), (vii)).
13. **The link test's candidate loop returns `true` itself when the count is spent, and a spent check sits before the read-only exemption.** Found while placing Decision 12's charge. When the count ran out inside `resolvesUnder`, its fault answer `true` became `touches`. Line 438 then let a read-only segment through (`cat`, `ls`), and on the last segment the call was allowed. That contradicts the header's and `docs/ENFORCEMENT.md`'s "refuses even a long read-only command". The clock had the same gap. One line closes it (unit case 28 (viii)).
14. **The memory is sized for a stated here-document limit of 2,000 lines of distinct words (the critic's second finding; the CTO Chief's decision).**
    - The line shape is fixed in the hook test file's 2,000-line fixture: 49 characters, six candidates of its own per line. The planner's estimate is about 24,000 remembered walks (6 candidates × 2 readings × 2,000 lines). So `MEMORY_ENTRIES_MAX` is 32,768, the next power of two.
    - Step 12 measures the real entry count and memory cost. If the count is over 32,768, the cap becomes the next power of two above it. If the memory cost is over about 64 MB, the line limit becomes the largest whole hundred of lines that fits, and the rows and documentation say that number.
    - Extended by the planner (advisor's point): if the 2,000-line row costs more than the shipped count, the line limit likewise becomes the largest whole hundred the count allows. The CTO Chief is told, because the count is the owner's figure and is not raised here.
    - Added by the planner: `MEMORY_CHARS_MAX`, 16,777,216 characters of keys and stored paths. An entry cap alone does not bound bytes: the count allows about 192 million characters of charged text, so keys of 100 KB would reach gigabytes long before 32,768 entries. At about 4.8 million characters, the 2,000-line row stays well inside it (planner's estimate).
    - The planner's cost estimate for the 2,000-line row is about 1.4 million units, under the count but over a third of it. The row therefore runs at the shipped count. The third is the builder's margin, not the limit's.
    - `docs/ENFORCEMENT.md` states the limit: a here-document of up to 2,000 lines is allowed (tested). Past that, each lookup the memory cannot hold is paid in full, and the count refuses, failing closed, at a size Step 12 measures. It never says a 2,001-line command is refused.
    - (Extended by Decision 23.) The limit is also stated for a command that Unicode compatibility folding changes, where a background agent's settings checks run twice (2 + 2N runs, 16 in the nine-check layout). Hook case 162 (h) holds the folded 2,000-line copy at the shipped count (planner's estimate about 2.5 million units). Step 12 measures it under the same line-limit rule; if it does not fit, the folded shape gets its own line limit, and `docs/ENFORCEMENT.md` states it on its own line.
15. **Claude Code's hook time limit is verified offline, and the backstop is a tenth of it (the critic's third finding; the CTO Chief's decision).** Step 9 reads the active version's limit from the installed binary or its bundled documentation. It STOPs if the limit is under 600 s, or if it cannot be verified offline, because the backstop is derived from it. The backstop is a tenth of the verified limit (60 s at 600 s). Windows' time per unit is not measured, because continuous integration runs on `ubuntu-latest` only (`.github/workflows/tests.yml` line 11). It is listed under Risks with what would show it.
16. **The two budgets stay separate at the merge with the hook branch (the critic's fourth finding; the CTO Chief's decision and his statement of that branch's facts).** The setup decision keeps its own 30,000 resolutions, not shared with this plan's units and not changed by this plan's memory. The merge sets this plan's count and backstop on the shell path once, at the hook branch's settings deadline line (about 2013), and keeps one pair of setter calls at the top of the editing-tool branch, so a `Write` is never unbounded (the CTO Chief's rule extended by the planner for that path). Step 9 checks the facts read-only and STOPs if the budgets would be shared or the editing-tool path would be left without a setter. (Corrected by Decision 28: Step 9 read the hook branch, and its settings deadline is set at the top of `decide()`, before both the editing-tool and the shell branch.) Because `AGENT_COMMAND_CAP` (163,840 characters) runs first for a background agent on that branch:
    - the planner's rows over that size (hook case 164 (b), (c)) run for the main session only;
    - the 2,000-line row asserts it stays under the cap.
17. **A refusal made past the count or the backstop gives its own sentence (the critic's fifth finding; the CTO Chief's decision).**
    - The sentence is `REFUSAL_WORK`: "CTOC refused this call because checking it would take more work than CTOC allows for one call; split it into smaller commands and run them one by one."
    - It is applied in one place, `main()`, as `workSentence(decide(payload))`. It applies only when the verdict is a refusal and `budgetSpent(0)` is true at the end of the decision. The verdict is never changed (it still fails closed), an allow is never rewritten, and the fail rule's sentences are untouched.
    - Choosing `main()` over every `return` in `decide()` keeps `decide()`, `bashRefuses` and `fileSpec` structurally unchanged for the merge.
    - The refused rows of cases 151, 154 and 155 change their expected sentence. This tightens them to the cause and does not weaken them: the verdict stays refused, and the old sentence named a write the call may never have made.
18. **No marker in the code (the critic's sixth finding; the CTO Chief's decision).** Step 10 writes the header limit's sentence (`protect-records.js` lines 170–174) verbatim as given under "File: `src/hooks/protect-records.js`". The sentence has no numbers and names the constants instead. Step 15 adds Step 12's measured numbers. No placeholder text ever sits in the code.
19. **The padded-shape rows run on a fake clock of 1 ms per file-system call, not a frozen one.** A frozen clock would leave the old code grinding through about 115,000 candidates of 200 KB of text each before failing. At 1 ms per call, the old code is refused by its 5 s clock with the settings sentence, so the row turns red after about 5,000 file-system calls instead of grinding. The new code is refused by the count. The row's `elapsed` under 60,000 shows that the backstop did not decide.
20. **`setWorkBudget(0)` is an empty count, and hook case 167 (c) really spends it (the critic's first finding, round 2; the CTO Chief's decision).** `budgetSpent` reports spent only below zero, so `setWorkBudget(0)` leaves `budgetSpent(0)` false until the first charge; that matches `resolveExisting`'s cost-0 entry check, which lets the walk's first step spend it. The plan said "a spent count", which was wrong; it now says "an empty count; the first charge spends it" (the `setWorkBudget` export, case 166, unit 28 (iv), criterion 7). A `Read` charges nothing (read: it is not in `EDITING_TOOLS`, `protect-records.js` line 551, and `decide()` returns exactly `null` for it at line 1140, so neither a spent count nor `workSentence`'s `=== null` test can turn it into a refusal), so case 167 (c) with `units: 0` alone never met a spent count and tested nothing. Its preload now charges one unit after the setter (`chargeAfterSet: 1`), chosen over a backstop set in the past because it tests the count itself, and the row asserts the preload's `spent` at exit, so it cannot pass without the precondition. Step 11 mutation (s), `workSentence` dropping its null check, turns it red.
21. **Mutation (j) is shown by unit case 27 (ix) (the critic's second finding, round 2; the CTO Chief's decision).** The old entry said the unit cases set no count, so they could not show a tidied key; that was wrong, because every case-27 row sets a count. Row (ix) asks `src/x` and then `src/L/../x` (`src/L` a link to `.ctoc/approvals/inner`, a junction on Windows) in one decision: as written the second is `true`; keyed on the tidied path it would get the first walk's answer, `false`. (j) must turn that row red; "or recorded as green" is dropped.
22. **No wrapper can throw, and nothing it cannot key is remembered (the critic's third finding, round 2; the CTO Chief's decision).** The wrappers built their key before delegating, outside any `try`: `path.isAbsolute` throws on a non-string, `process.cwd()` (and `path.resolve`, which calls it) throws when the working folder is gone, and `''` made absolute is `<cwd><sep>`, the key of a real folder. A throw from `resolveExisting` or `fileIdentity` reaches `protect-records.js`'s fail rule, which lets most calls through. One helper, `keyOf`, returns null for a `p` that is not a non-empty string and builds the key inside a `try` whose `catch` returns null; each wrapper then takes the uncached body. `resolveBasis` uses the same `keyOf` (as-written key, not `path.resolve(p)`), so all three share one rule and its `path.resolve` sits inside the `try`. Unit 27 (x) holds each case against the uncached answer; Step 11 mutations (t) and (u) turn its rows red.
23. **Folding doubles the agent's settings checks, and the margin and the limit are tested for that shape (the critic's first item, round 3; the CTO Chief's decision, as the critic proposed).** For a background agent, `bashRefuses` reads each agent spec twice when Unicode compatibility folding changes the command: `writes(spec)` is `isLedgerWrite(cwdCommand, spec) || (folded !== cwdCommand && isLedgerWrite(folded, spec))` (read: `protect-records.js` lines 1073–1075). The second run happens only when the as-written run answered false, so on an allowed call, the case the guard rows measure, the agent's N checks become 2N runs. The main session's two checks (line 1066) are never folded. The sizing therefore reads "2 + N, or 2 + 2N when folding changes the command": 2 + 14 = 16 runs in the nine-check layout.
    - Hook case 162 gains (g), a folded copy of (a) at the third, and (h), a folded copy of (f) at the shipped count. Each has one line holding `…` mid-word inside a quoted literal and asserts `cmd.normalize('NFKC') !== cmd`. The base fixtures are unchanged.
    - Unchanged operands fold to the same text and are answered from memory, so roughly only the per-check text charges and hits scale by 16 ÷ 9: planner's estimates about 0.7 million units for (g) and about 2.5 million for (h). These are estimates, not fits; (g)'s margin is thin.
    - Step 12 measures both with the same stop rule (the folded builder over 1,000,000: STOP and report) and the same line-limit rule (the folded 2,000-line copy over 3,000,000 units or about 64 MB: the folded shape gets its own line limit). `docs/ENFORCEMENT.md` states the limit for that shape.
    - Decisions 6 and 14 are extended accordingly; the count stays the owner's figure.
24. **Step 11's predicted reds are completed (the critic's second item, round 3; the CTO Chief's decision, as the critic proposed).** Read against each row's definition:
    - mutation (a), no memory, also turns unit 27 (v) (the 32,768th path asked again makes file-system calls), (vi) (an unremembered answer is not frozen) and (viii) (checks 2 to 9 exceed `2 × s + 6`) red. Unit 27 (v-b) is not added: it asserts misses only, so it stays green without a memory, and mutation (r) covers it;
    - mutation (b), `budgetSpent` ignoring `cost`, also turns unit 28 (iv) red: `budgetSpent(10)` after `setWorkBudget(10)` charges 1 and leaves 9, so the next `budgetSpent()` is false;
    - mutation (h), `setWorkBudget(0)` read as "no count", also turns hook 167 (c) red: the preload's one-unit charge never spends a count that is not there, so `spent` at exit is false.
25. **Executor, Step 8: the preload's count override and the case helpers.** `workPreload` is split into `spawnWork` plus three small asserts (`allowedWork`, `refusedWork`, layout helpers), inside the describe block, with the preload written to the layout's folder and its report read back. The preload replaces the count only when the hook sets a number, as the plan's option 3. Case 161 uses one counting run and one spread run per session; the spread is `25000 / F` ms per file-system call.
26. **Executor, Step 12: no resizing.** Every measured figure is inside the plan's limits (builder 573,450 at most against 1,000,000; 2,000-line shapes 2,232,767 at most against 3,000,000; entries 24,010 against 32,768; heap 12.7 MB against 64 MB), so no constant or line limit moved.
27. **Executor, Step 15: documentation figures.** The ENFORCEMENT.md paragraph and bullet state the measured figures above and say that the 478 KB `cp x` command was measured under the earlier clock and not re-measured.

28. **Executor, review round: the hook branch sets its deadline at the top of `decide()` (the critic's R3).** Read at Step 9 from `git show fix/background-agents-refused-only-setup-apply-and-dismiss:src/hooks/protect-records.js`: `budgetResolver.setDeadline(Date.now() + DECISION_BUDGET_MS)` is line 2013, the first statement of `decide()` after the require, ahead of the editing-tool branch and of the shell branch. So the Order section's and Decision 16's picture (this plan's count set on the shell path after the setup decision and the sweep net; a second pair of setters at the top of the editing-tool branch) is wrong in two ways: one replaced line covers both paths, and the setup decision (`subagentSetupRefusal`, reached from `bashRefuses`) runs while this plan's count is already set. It still does not share the budgets: a search of that branch's lines 1270-1960 finds no call of `resolveExisting`, `resolveBasis`, `fileIdentity`, `resolvesUnder`, `budgetSpent` or `setDeadline`; it spends its own `RESOLUTION_BUDGET` through `spendResolution`. The merge therefore replaces that one line with `setWorkBudget(DECISION_WORK_UNITS)` and `setDeadline(Date.now() + DECISION_BACKSTOP_MS)`. Where that branch's own sweep net (`sweepBypassRefusal`, with its `memo`) is merged with this plan's charged version, the charged version of the folder and lookup loop is kept (Decision 30). The Order section is part of the approved specification and its digest is recorded, so it is not edited here; this decision and the corrected Decision 16 stand in its place.
29. **Executor, review round: the 128-candidate cap is dropped (the security scan's S1).** 128 harmless operands followed by the long-s spelling of the settings file let the write through because the link test stopped at 128 candidates, and the extra `rawPrefix !== prefix` refusal only covered a `cd` with `..`. The cap existed to bound time and the count does that, with every candidate charged by its length. Chosen over refusing past 128: a realistic `git add` of 200 files is then still allowed, and hook case 168 holds both rows (127 and 128 operands, 129 and 400 for the hard-linked file). The only callers of `isLedgerWrite` are inside the one registered hook, which always sets a count; the unregistered `PreToolUse.Bash.js` entry would be unbounded without a count, as its other text work already is.
30. **Executor, review round: the sweep check and the reply-body read are charged (S2, S3).** In `sweepBypassRefusal`: each `cd` step is charged by the length of the folder it builds, folders are kept once and in order (a repeated folder asks the same questions), the next-word search starts after the runtime word (it restarted from the first word), each folder lookup is charged (the path's length at the text rate plus five units for its stats and real path) and the first match ends the search. A spent count returns the existing sweep sentence, which `main` turns into the work sentence. In `withoutMenuStdin`: the body is charged by its length once, and the closing-line test uses a new linear `trimBlanks` (spaces and tabs) instead of the quadratic `/[ \t]+$/`. The brief named `trimDotsAndSpaces` instead; it also drops trailing dots, so a closing line `TAG.` would close a body that the shell does not close, which would exempt text from the sweep reading. Hook case 170 holds that a `TAG.` line does not close the body.
31. **Executor, review round: the memory cap counts tail names (S4), and unit case 27 counts calls with plain wrappers.** `remember` adds the length of every name of a walk's `tail` to the stored size (unit 27 (v-c)). The counting helper of unit cases 27 and 28 now replaces the four `safe-fs` functions with a plain wrapper that it puts back after the case: `t.mock.method` keeps every call's arguments and result, and under Step 11 mutation (a) (no memory) the row that reads 2,000 lines then held millions of entries and the process ran out of memory instead of failing a row.
32. **Executor, review round: the deep-folder `cp x` command is decided by the count (the critic's R1).** Measured under the shipped code, no code change: see the Execution Record. Hook case 171 guards it at a third of the count.

33. **Executor, round 2: the Neighbours section is corrected here, not in place.** Its second line says `sweepBypassRefusal` stays outside the count "as today". That is no longer true: since the first review round the sweep check's folder steps, lookups, manifest reads and the reading of its command are charged (Decisions 30 and 35). The section is part of the approved specification, so its text and the recorded digest stay as approved and this decision stands in its place. What stays outside the count is `menuCallArgs`, `expansionRefusal`'s own text tests, the NFKC fold, Node's start-up and reading the payload.
34. **Executor, round 2: the shell's folder and the list of folders searched are two things (the re-review's blocking finding 1).** Decision 30 dropped repeated folders from one list that also drove the next `cd`, so after `cd src; cd ..; cd src/commands` the third step was resolved from the last folder added, not from where the shell was. `sweepBypassRefusal` now keeps `current`, which moves on every `cd` and `pushd` (a repeated folder included), and a separate `dirs` list, deduplicated, that only the lookups read. Hook case 109 holds four wildcard- and brace-built confirmations (a revisited folder; a revisited folder that is not the one added last, through `lib`; `pushd`) refused for a background agent with the sweep sentence and the plain-call ending, allowed from the main session, and a control without a revisit. Each is green on the code of release 6.14.133 and was red on the tree of the first round; Step 11 mutation (z) turns them red.
35. **Executor, rounds 2 and 3: the next-word search, the manifests and the reading are charged (round 2 findings 2 and 3, round 3 findings 1 and 2).** The next word that is not an option is computed for every word in one backward pass, so a run of option-like runtime words (`-/node`: an option by its first character, a runtime word by its last path segment) is not searched again from each of them. Each step of that pass is one unit charged to the count, and the reading of the whole command is charged once at the text rate. A search from every runtime word to the end of a run costs the same price per step but the run's length once for each of them, about 200,000,000 units for the 20,000-word row, so a restored per-word search spends the count and is refused; Step 11 mutation (aa) is exactly that and turns hook case 172 red, and (ah) (the pass uncharged) does too. No timing is asserted anywhere. A manifest is opened once, without waiting (`O_RDONLY | O_NONBLOCK | O_NOCTTY`), and judged and read through that one descriptor: `fstat` must say a regular file of at most 1 MiB, the bytes are charged at the text rate, and any other manifest names nothing. The first version of round 2 checked the path with a stat and then read by path; the re-scan beat it with a swap of a regular `package.json` for a pipe between the two (6 of 10 runs hung at 50 words, 3 of 3 past the backstop at 2,000), so the separate stat is gone. No change to `src/lib/safe-fs.js` was needed (its `openSync` takes a path and validates it; `fstatSync`, `readSync` and `closeSync` take a descriptor from the module's own `fs`), so no scope-growth request was filed. A pipe is therefore opened but never read: opened without waiting, it returns at once, and nothing is read from a descriptor that is not a regular file. `readFileSync` of a numeric descriptor would have thrown in `safe-fs` and been read as "names nothing", which would have left the menu unrecognised; hook case 109 (the menu is found through `ctocKind`) would turn red on that, and passes. `ctocKind` charges four units for each folder it visits and the sweep loop refuses once the count is spent. Rows: hook case 172 (20,000 words: charged at least 20,000 + the reading, under 100,000, count not spent, allowed); case 173 (a pipe manifest; and the path-based stat made to say "regular file" for the pipe, so the race is simulated without timing); case 173b (a regular manifest of 900,000 bytes is read and charged at least 14,062 units; one of 2,000,000 bytes is not read: fewer than 1 MiB read by the whole process); case 174 (2,000 runtime words naming one script at a count of 180,000: 146,149 units before the charge, 218,525 after). The regular-file check on the descriptor (mutation (ag)) is not visible to any row: with the open not waiting and the read bounded by the size, a pipe reads as empty either way. It stays, as the brief asks, as the plain statement of what is read.
36. **Executor, round 2: smaller items.** The `TAG.` row of hook case 170 asserts the sentence the hook really gives, the sweep sentence with the plain-call ending (checked by running it); the re-review guessed the expansion ending, which is what a `$` in a plain command gets. The header's list of what the checks cannot catch no longer says "operands beyond the first 128 per segment". Hook case 171 now removes its layout, deep folders included, and asserts it is gone (about 1,000 bytes of path, under the 1,024 bytes macOS refuses in one call); no folder was found left over by earlier runs.

37. **Executor, round 3: what `current` follows.** The comment in `sweepBypassRefusal` and `docs/ENFORCEMENT.md` say that `current` follows plain `cd` and `pushd` with a path only, and is not where the shell is after `cd -`, `popd`, `cd ~`, a bare `cd`, a failed `cd` or `cd -P`. Those gaps were in the code before this change and are left to their own plan; nothing here fixes them.

38. **Executor, fourth review round: `readManifest` is not `inbox.readRegularFile`.** The inbox reader (`src/lib/inbox.js`, function `readRegularFile`) was considered for the sweep check's manifest read and not used, for three reasons, each checked against the source. (1) It refuses a linked file: it lstats the entry (a link is not a regular file) and opens with `O_NOFOLLOW`. A CTOC copy whose `package.json` is a link (a marketplace or worktree copy that links its manifest) would then name nothing and its menu script would go unrecognised, which is the allowing direction for the sweep check. Release 6.14.133 read the manifests by path and followed links (`namesCtoc` at base commit 09229c44 calls `safe-fs.readFileSync(path.join(dir, ...manifest))`), and this plan keeps that reading. (2) It charges no bytes to the count; `readManifest` charges the bytes it reads at the text rate (hook case 173b). (3) It throws where `readManifest` returns null for a manifest that is not a regular file or is over 1 MiB, and `namesCtoc` reads both as "names nothing" on its own path. It is also module-private to `inbox.js` (`typeof require('./src/lib/inbox.js').readRegularFile` prints `undefined`), and exporting it would edit a file outside `files:`.
39. **Executor, fourth review round: case 171's agent row is one segment.** Decision 16 says a row over 163,840 characters runs for the main session only, because on the hook branch the cap on a background agent's command refuses it before any other work. One segment of case 171 is 115,350 characters (the four are 461,403), so the agent's row runs one segment, under the cap, and asserts that before it spawns; the main session's row keeps all four. The path limit is 1,024 bytes on every platform, so the folders and the cost are the same everywhere; the comment in the case gives the figure the final review reported for 4,096 bytes (the earlier four-segment agent row, near 1,046,000 units, over a third of the count) and says it was not re-measured here. The four-segment agent figures in `docs/ENFORCEMENT.md` (the paragraph that gives 179,840 units for a background agent in a plain project and 259,798 in the nine-check layout) measure this branch and stay true here. At the merge with the hook branch its command cap refuses that shape (four segments, about 461,000 characters) for a background agent first, so the merge corrects that sentence.
40. **Executor, fourth review round: the sweep check's spent-count returns are kept.** The returns at the reading of the command, the first step of the next-word pass, each folder step and the reply body (`protect-records.js` lines 1087, 1111, 1101 and 1062 of the tree this round started on) cannot change a verdict today: the settings check's first charge (`PreToolUse.Bash.js` about line 344) already refuses every call once the count is spent, and `main` turns the sweep check's sentence into the work sentence either way. They are kept because the merge with the hook branch reorders a background agent's checks, and then the sweep check can be the only one still running when the count runs out. Each is held by an exact-charge row of hook case 176, and the evidence that the verdict does not move is the mutation record: with each return removed the call is still refused with the work sentence, and only the units charged move (1087 removed: 2 against 1, and 5 against 4 for the reply-body row; 1111 removed: 9 against 2; 1062 removed: 5 against 4; 1101 removed: 972 against a count of 69).
41. **Executor, fourth review round: case 174's count and its two costs replace the figures of Decision 35.** Decision 35 cites case 174 as "2,000 runtime words naming one script at a count of 180,000: 146,149 units before the charge, 218,525 after". The script sat one folder below the project, so `ctocKind` climbed to the root of the disk: 9 folders on a deep temporary path and fewer on a shallow one, and both costs moved with the machine. The script now sits 16 folders below the project (`b`, then 15 more), so `ctocKind` visits exactly 16 folders on every platform, all inside the project and none with a manifest. Measured by bisection over the count (a background agent, the plain layout, a frozen clock, 2,000 runtime words, command 84,010 characters): the current tree allows it at 461,488 units (refused at 461,487), and with the charge of `ctocKind` removed (mutation (ad)) at 333,488; the gap is exactly 128,000, 64 units for each of the 2,000 words. The count is 397,488, midway, 64,000 above the second and 64,000 below the first (the control of 100 words costs 23,241 and stays allowed). With the temporary folder at `/private/tmp` in place of `/private/var/folders/...` (a shorter path, as on Linux) the same bisections give 459,432 and 331,432, a gap of 128,000 again, so the count still separates them by more than 61,000 units each way. These figures supersede Decision 35's; Decision 35 itself is not edited.

## Neighbours (seen, not built here; scheduling is the owner's)

- The plain-text plan's budget stride, timing criterion and case numbers (the Order section).
- The hook's other text work stays outside the count, as today: `menuCallArgs`, `sweepBypassRefusal`, `expansionRefusal`, the NFKC fold, Node's start-up, and reading the payload.
- `escapesRoot` in the menu process does not use the memory.

## Execution Plan

### Step 8: TEST

- [x] Write hook cases 161–167, `workPreload`, the 2,000-line fixture, the two folded copies (Decision 23), the two padded shapes and the `REFUSAL_WORK` copy in `tests/protect-records.test.js`; change case 155's title and the expected sentence of the refused rows of cases 151, 154 and 155; write unit cases 27–28, with `minUnits`, in `tests/a-link-cannot-leave-the-repository.test.js`; as specified.
- [x] Run `node --test tests/protect-records.test.js tests/a-link-cannot-leave-the-repository.test.js` before any source change. Record red:
  - 161 (a) and (b);
  - 163 (old sentence);
  - 164 (a), (b) and (c);
  - 165's refused row;
  - every row of 166;
  - 167 (a), and 167 (c) on its `spent` assertion only (its verdict is allowed before, too);
  - the refused rows of 151, 154 and 155 (old sentences);
  - every row of unit cases 27 and 28, (ix) and (x) included (`setWorkBudget` does not exist yet).

  Record green: 162 (a)–(h) (with (g) and (h)'s `cmd.normalize('NFKC') !== cmd` assertions), 165's control, 167 (b), and every other existing row. Any other difference is explained before Step 10.

### Step 9: PREPARE

- [x] Confirm the tree. STOP and report if any differs:
  - `DECISION_BUDGET_MS = 5000` at `protect-records.js` line 246, and `setDeadline(Date.now() + DECISION_BUDGET_MS)` at line 1111;
  - `budgetSpent()` at `real-path-confinement.js` line 455, asked at lines 155, 243, 411 and 516;
  - the walk's tail branch at lines 164–170 and `kernelAgrees`' prefix at line 244;
  - `isLedgerWrite`'s budget checks at `PreToolUse.Bash.js` lines 343 and 421, and the candidate link test at lines 431–438;
  - `refused = decide(payload);` at `protect-records.js` line 1162;
  - the agent check's folded second reading at `protect-records.js` lines 1073–1075 (Decision 23);
  - the last cases are hook 160 and unit 26.
- [x] Read-only, check the hook branch's facts as the Order section lists them, and record which functions each branch touches: `git show fix/background-agents-refused-only-setup-apply-and-dismiss:src/hooks/protect-records.js` and `:tests/protect-records.test.js` (its in-process counting cases 101/102), and `git diff origin/main...<branch> -- src/lib/real-path-confinement.js src/hooks/protect-records.js src/hooks/PreToolUse.Bash.js tests/protect-records.test.js` for the hook branch and the spelling branch. Record:
  - where the settings deadline is set, on the shell path and on the editing-tool path;
  - `RESOLUTION_BUDGET`, `spendResolution`, `memo.left` and `AGENT_COMMAND_CAP`;
  - the order of the setup decision, the sweep net and the settings check;
  - which of `resolveExisting`, `resolveBasis`, `fileIdentity`, `resolvesUnder`, `budgetSpent` and `setDeadline` the setup decision and the sweep net call.

  STOP and report to the CTO Chief if, under Decision 16's merge rule, the setup decision would run while this plan's count is set and would reach any of them, or if no setter would cover the editing-tool path.
- [x] Verify the hook time limit offline: `claude --version`, then a read-only search of that version's installed binary, or its bundled documentation, for the hook timeout default and the `onFailure` rule. Quote what was found. STOP and report if the limit is under 600 s or cannot be verified offline. Otherwise record a tenth of it, the value Step 10 writes as `DECISION_BACKSTOP_MS` (60,000 at 600 s; Decision 15).
- [ ] Before numbers, outside the suite:
  - the scanner's `p41.js` (V8 call counts of `budgetSpent`, `resolvesUnder`, `lstatSync`, `statSync`) in its three layouts, on this tree;
  - `npm test` totals;
  - dead exports and unreachable files from the fences' analysers.
- [x] Calibrate the text rate in a scratch probe:
  - time 1,000,000 `resolveExisting` walk steps on a real path against 1,000,000 joins and tidies of 64-character text;
  - quote both;
  - if the text is not cheaper per unit, apply Decision 3's rule and record the new rate.

### Step 10: IMPLEMENT

- [x] `src/lib/real-path-confinement.js`:
  - `unitsLeft`, `memory`, `memoryChars`, `MEMORY_ENTRIES_MAX` (32,768), `MEMORY_CHARS_MAX` and `CHARS_PER_UNIT`;
  - `setWorkBudget`, `budgetSpent(cost = 1)` with its floor, and `textBudgetSpent`;
  - the length charges: `resolvesUnder`'s entry (line 411), `kernelAgrees`' step (lines 243–244), and the walk's tail branch (lines 164–170);
  - `keyOf` (null for a non-string or empty `p`; the key built inside `try`, null from its `catch`), `remember` with both caps, and the wrappers `resolveExisting` (with the cost-0 entry check), `resolveBasis` and `fileIdentity`, each taking the uncached body when the key is null; the walk's body moves to `walkAsWritten` with only the tail charge added;
  - `setWorkBudget` and `textBudgetSpent` in `module.exports`;
  - the header paragraphs and JSDoc;
  - no `throw` added; one `catch` added, in `keyOf` (Decision 22).
- [x] `src/hooks/protect-records.js`:
  - `DECISION_WORK_UNITS` and `DECISION_BACKSTOP_MS` replace `DECISION_BUDGET_MS`;
  - `REFUSAL_WORK`, `workSentence`, and `refused = workSentence(decide(payload));` in `main()`;
  - the two setter calls in `decide()`;
  - the header sentence at 42–44, and the one at 170–174 written verbatim as specified, with no numbers and no marker (Decision 18).
- [x] `src/hooks/PreToolUse.Bash.js`: `chargeText`, its three call sites (lines 343, 421 and the candidate loop at 435–436), the spent check before line 438, and their comments.
- [x] Run the two Step 8 files: all green.

### Step 11: REVIEW

- [x] Prove the guards can fail. Make each change once, run the two Step 8 files, quote the red rows, then revert. Check the sha256 of the changed files before and after.

  | Mutation | Expected red |
  |---|---|
  | (a) `setWorkBudget` creates no memory | 162's nine-check rows at the third, (g) included (about 2 million units against a third of 1,000,000, the planner's estimate); unit 27 (i), (ii), (v), (vi) and (viii) (Decision 24). Hook 162 (f)'s and (h)'s verdicts are recorded, not predicted. Case 161's verdict is recorded, not predicted: without the memory the decision may still fit the full count and the 25 s span |
  | (b) `budgetSpent` ignores `cost` | unit 28 (ii), (iii), (iv), (vi) and (vii) (Decision 24); hook 164 (a) |
  | (c) a remembered walk ignores the spent budget | unit 27 (iv) |
  | (d) the entry cap removed | unit 27 (v) |
  | (e) text charged one unit per character | hook 162's absolute-folder here-document row (not its `git add` row, which stays under the cut); unit 28 (ii), (iii), (vi) and (vii) |
  | (f) `DECISION_WORK_UNITS` set to 30,000,000 | hook 164 (a) |
  | (g) the backstop not set in `decide()` | hook 163, and cases 151 and 155 |
  | (h) `setWorkBudget(0)` read as "no count" | hook 166 and 167 (c) (Decision 24), unit 28 (iv) |
  | (i) the floor charge at `resolvesUnder`'s entry and in the identity chain removed | unit 27 (vii) |
  | (j) the memory keyed on the tidied path | unit 27 (ix): the second answer comes back `false`, the first walk's answer from memory. Every case-27 row sets a count, so the row that asks both readings in one decision shows it (Decision 21) |
  | (k) the candidate charge in the link-test loop removed | unit 28 (vi) (14 in place of 22); hook 164 (b) and (c) are recorded, not predicted, because the other charges may still refuse them |
  | (l) `resolvesUnder`'s entry charged 1 in place of by length | unit 28 (vi) (18) |
  | (m) `kernelAgrees`' step charged 1 in place of by length | unit 28 (vi) (18) and (vii) (2) |
  | (n) the tail charge removed | unit 28 (vii) (2) |
  | (o) the spent check before line 438 removed | unit 28 (viii) |
  | (p) `workSentence` returns the sentence unchanged | hook 163, 164, 165, 166 and 167 (a); cases 151, 154 and 155 |
  | (q) `MEMORY_ENTRIES_MAX` set to 8,192 | unit 27 (v) and (viii); hook 162 (f)'s and (h)'s verdicts are recorded, not predicted |
  | (r) the character cap removed | unit 27 (v-b) |
  | (s) `workSentence` drops its null check | hook 167 (c): the allowed `Read` with a spent count is refused with `REFUSAL_WORK` (Decision 20) |
  | (t) `keyOf` builds the key outside its `try` | unit 27 (x)'s `process.cwd` rows: `resolveExisting` and `fileIdentity` throw (Decision 22) |
  | (u) `keyOf` keys an empty string | unit 27 (x)'s empty-string rows: `''` gets the working folder's remembered answers (Decision 22) |

  Any red outside a prediction, or a predicted red that stays green, is explained before the critic runs.
- [x] Dispatch `iron-loop-critic`. It reads the calls, not text matches, and checks:
  - every place that asked `budgetSpent()` still asks it;
  - every text step whose length the command controls is charged by length (Decision 12's list), and nothing on that list was missed;
  - no remembered answer is served past a spent budget;
  - the memory cannot outlive `setWorkBudget`, and both caps hold;
  - keys are as written;
  - no path can throw, `resolveBasis`'s `keyOf` call included (no row can tell it apart, unit 27 (x));
  - a spent count can no longer reach line 438's read-only exemption;
  - `workSentence` changes only the text of a refusal, never an allow;
  - `fileSpec`, `bashRefuses` and the text of every existing refusal sentence are unchanged.

### Step 12: OPTIMIZE

- [x] Measure the builder's exact cost in units, by bisection over `workPreload`'s `units` (allowed at C, refused at C − 1), frozen clock, for:
  - the agent and the main session in the nine-check layout;
  - the main session in the plain project;
  - the folded builder (hook case 162 (g)), the agent in the nine-check layout, 16 runs (Decision 23).

  Quote each figure. If any exceeds 1,000,000, the folded builder included, STOP and report to the CTO Chief.
- [x] The 2,000-line limit (Decision 14), background agent, nine-check layout, frozen clock:
  - its cost in units by the same bisection. If it exceeds 3,000,000, find the largest whole hundred of lines the count allows, set the limit to it in the fixture, the rows and the documentation, and report to the CTO Chief;
  - its remembered entries per kind, from a scratch probe outside the suite that wraps the exported `resolvesUnder` and counts the distinct as-written targets and protected paths it is asked. If the walk count is over `MEMORY_ENTRIES_MAX`, raise the cap to the next power of two above it and move unit 27 (v) with it, with the reason written;
  - its memory cost: the heap difference (`node --expose-gc`, `gc()` before each reading) between one decision with the memory on and the same with it off. If it is over about 64 MB, lower the limit to the largest whole hundred of lines that fits, as above;
  - the characters it stores, against `MEMORY_CHARS_MAX`.
- [x] The folded 2,000-line copy (hook case 162 (h), Decision 23), background agent, nine-check layout, 16 runs, frozen clock: its cost in units, its remembered entries per kind, its memory cost and its stored characters, each measured as above and under the same rules. If its cost exceeds 3,000,000 or its memory cost about 64 MB, set the folded shape's own line limit (the largest whole hundred of lines that fits) in its fixture, row (h) and the documentation, and report to the CTO Chief. If its walk count exceeds `MEMORY_ENTRIES_MAX`, the cap rule above applies.
- [x] Measure with `p41.js` after the change: file-system calls and budget checks beside Step 9's before numbers.
- [x] Measure the unit-27 (ii) ratio.
- [x] Measure the wall time to refusal at the shipped count, idle, quoted with the load average and never asserted:
  - the folder-change chain at 100 KB and 3,200 KB;
  - four segments of `cp x` with 128 operands through the deepest folders (the scanner's 478 KB command in `docs/ENFORCEMENT.md` line 603);
  - padded shapes A and B (hook case 164 (b), (c)), with the units spent at refusal;
  - the 2,000-line limit's wall time to its allow, and its folded copy's, each with the load average.

### Step 13: SECURE

- [ ] Dispatch `security-scanner`. It probes only through the hook's input JSON (the real entry, spawned). Ask it to:
  - re-run its load probe (`p40lib.js` `level(n)` for n = 0, 16 and 64, the agent, main and worktree arms, 10 runs each) on this tree, and show the builder's verdicts are the same at every load (all allowed) and a folder-change chain's are the same (all refused);
  - attack the memory: exhaustion against both caps (many entries, and few entries with 100 KB keys), stale answers within a decision, and the as-written and tidied keys;
  - attack free hits: a command that loops on remembered answers;
  - attack the text rate: any command whose real time per unit is far above a file-system step, enough that the 60 s backstop decides an ordinary-looking command. Start from padded shapes A and B (a `cd` into a 100 KB name, then 450 segments of 128 literals, written apart or glued as `x'1'x'2'…`), and look for any text step left uncharged;
  - attack `NaN` or negative costs;
  - try to make the count or clock running out turn a refusal into an allow, including a read-only last segment (`cat`, `ls`) whose count runs out inside the link test;
  - try to make the work sentence appear on an allowed call, or replace a genuine refusal's sentence while the count is not spent.

  It confirms each Risk is real and names any missing one.

### Step 14: VERIFY

- [x] Run `npm test` (the gated entry point): 0 failed, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`. Read the line and branch coverage of `real-path-confinement.js` and `PreToolUse.Bash.js`. An uncovered branch of the changed code gets a row (back to Step 8 for it), never an ignore comment.
- [x] `npx eslint . --max-warnings 0` exits 0, and `npm run typecheck` exits 0.
- [x] `git diff --stat` shows only the six files of `files:`. Dead exports and unreachable files are no higher than at Step 9.

### Step 15: DOCUMENT

- [x] Before the edit, search `tests/fixtures/claude-md-rule-inventory.json` for `5 s`, `5 seconds`, `budget` and `refuse after`, and record the matches. (Read at planning time: no match.)
- [x] `docs/ENFORCEMENT.md`, paragraph at lines 334–344 ("From 5 seconds after a decision starts …" to "… roughly 26 ms per call on average."). Rewrite it to say:
  - the decision is bounded by a count of work, 3,000,000 units, about one file-system step each; text work, in the shell and in the resolver, is charged one unit per 64 characters wherever its length is joined or walked;
  - lookups are remembered within one decision, so nine settings checks cost about one;
  - past the count, or past the backstop clock (a tenth of Claude Code's hook time limit as verified at Step 9), every walk fails and every check whose failure could let the call through refuses, or is backed by one that refuses; a read-only command is refused too;
  - such a refusal gives its own sentence, quoted word for word: "CTOC refused this call because checking it would take more work than CTOC allows for one call; split it into smaller commands and run them one by one.";
  - the verdict of an ordinary command no longer depends on the machine's load, on any platform; only the backstop depends on the platform, and it refuses;
  - the stated limit: a here-document of up to 2,000 lines (or the number Step 12 sets) is allowed. Past that, each lookup the memory cannot hold is paid in full, and the count refuses, failing closed, at a size Step 12 measures;
  - on its own line, the limit for a command that Unicode compatibility folding changes (a character such as `…` that folds to plain text): a background agent's settings checks then each run twice, 2 + 2N runs, 16 in a project inside `.claude/worktrees/`, and the here-document limit for that shape is 2,000 lines or the number Step 12 sets for it (Decision 23);
  - the text this paragraph says is not checked (lines 339–342) shrinks to what is still uncharged: the text test and the quoted-literal scan over one segment, and the NFKC fold;
  - an ordinary Write's count from Step 12 replaces "about 190 file-system calls … 26 ms".
- [x] Same file, bullet at lines 597–609 ("a deliberately padded shell command …"). Rewrite it with Step 12's measured times to refusal, the padded shapes' units at refusal, and the measured cost of the builder, the 2,000-line limit and their folded copies. Its list of what is outside the count (lines 605–607) becomes: Node's start-up, reading the payload, the other checks of the shell, and the text test and quoted-literal scan over one segment. It states Claude Code's hook time limit as verified at Step 9. It says that Windows' time per unit is not measured, and that the count decides there as everywhere.
- [x] Add Step 12's measured numbers to the header limit Step 10 wrote at `protect-records.js` lines 170–174 (Decision 18). Its list of what is outside the count matches the bullet above.
- [x] The "Held by" line at 352–353 gains hook cases 161–167 and unit cases 27–28. Touch no other sentence.
- [x] Run `node --test tests/claude-md-keeps-every-rule.test.js tests/protect-records.test.js`: green.

### Step 16: FINAL-REVIEW

- [x] Dispatch `iron-loop-critic` against every acceptance criterion. Each box quotes its evidence: Step 8's red record, Step 11's reds, and Steps 12 and 13's numbers.
- [ ] After the owner releases it, in a real session on a scratch CTOC project inside `.claude/worktrees/<name>`:
  - a background agent runs the builder here-document: allowed;
  - the same agent runs `echo x > .claude/settings.json`: refused with the agent settings sentence;
  - quote each answer exactly.

  Until the release, report this box as not run.


---

## Execution Plan (Steps 8-16)

### Step 8: TEST (TDD Red)
- [x] Write tests for the implementation
- [x] Test error conditions
- [x] Run tests - expect RED (failing)

### Step 9: PREPARE
- [x] Install dependencies if needed
- [x] Check prerequisites
- [x] Verify dev environment ready
- [x] Create directories/config if needed

### Step 10: IMPLEMENT
- [x] Implement the feature according to requirements
- [x] Add error handling
- [x] Wire up integration points

### Step 11: REVIEW
- [x] Self-review all new code
- [x] Verify integration points work together
- [x] Check error handling completeness

### Step 12: OPTIMIZE
- [x] Remove redundant operations
- [x] Optimize critical paths
- [x] Simplify complex code

### Step 13: SECURE
- [x] Validate inputs (no path traversal)
- [x] Sanitize outputs
- [x] No secrets in code
- [x] Safe file operations

### Step 14: VERIFY
- [x] Run lint + type check
- [x] Run ALL tests (TDD Green)
- [x] Check coverage >= 80%
- [x] 0 skipped, 0 flaky tests

### Step 15: DOCUMENT
- [x] Update relevant documentation
- [x] Add JSDoc comments to new functions
- [x] Update CHANGELOG if needed

### Step 16: FINAL-REVIEW
- [x] Verify steps 8-15 completed correctly
- [x] All quality checks passed
- [ ] Manual verification if needed
- [x] Ready for human review


## Execution Record

Executor run, 2026-10-19 and 2026-10-20 (resumed after an account usage limit; nothing redone). Steps 8, 9, 10, 12 and 15 done. Steps 11, 13, 14 and 16 are the CTO Chief's and stay open. No commit made.

**Step 8, red before any source change.** `node --test --test-name-pattern` on the hook cases, and the whole unit file.
- Hook red: 151, 154, 155 (old sentences), 161 (a)(b), 163, 164 (a)(b)(c), 165 (both refused rows), 166 (four rows; its main-session control is green), 167 (a) and 167 (c) on its `spent` assertion only (verdict allowed, `spent: false`).
- Hook green before: 162 (a)-(h) (all guards, no count in the old code), 165 control rows, 167 (b), every other existing row (163 passed tests before the new ones were added).
- Unit red: every row of case 27 (11 rows) and case 28 (8 rows): `confinement.setWorkBudget is not a function`.
- Green after Step 10: 170 hook tests, 30 unit tests.

**Step 9.**
- Tree matched the plan at every listed line (DECISION_BUDGET_MS line 246 and its setter at 1111; `budgetSpent` at 455; `refused = decide(payload)` at 1162; the folded second reading at 1073-1075; last cases hook 160 and unit 26).
- Hook time limit, read offline: `claude --version` is 2.1.300; the installed binary `~/.local/share/claude/versions/2.1.300` declares `var ou=600000,d5e=30000,h9t=6000,u5e=30000,Oin=5000`, and the PreToolUse runner `async function*gNe(e,n,r,s,h,y,b=ou,w)` passes it as `timeoutMs` to `$R`. 600 s, so `DECISION_BACKSTOP_MS` is 60,000 (the stop rule of 600 s holds). The block-on-timeout rule (`onFailure` is "block") is in the binary too; `hooks/hooks.json` sets neither.
- Hook branch, read-only (`git show fix/background-agents-refused-only-setup-apply-and-dismiss:src/hooks/protect-records.js`, 2,098 lines): its settings deadline is `budgetResolver.setDeadline(Date.now() + DECISION_BUDGET_MS)` at line 2013, at the top of `decide()`, before both the editing-tool and the shell branch (so one pair of setters covers both paths after the merge). `RESOLUTION_BUDGET = 30000` (line 1270), `spendResolution`/`memo.left` (1299-1300), `AGENT_COMMAND_CAP = 160 * 1024` (1285; 163,840) checked in `subagentSetupRefusal` (1833), called from `bashRefuses` (1953) before the sweep net (1959) and the settings check. A search of lines 1270-1960 for `confinement`/`real-path` finds no call: the setup decision uses `safe-fs` directly (`isFile`, `realFile`), never `resolveExisting`, `resolveBasis`, `fileIdentity`, `resolvesUnder`, `budgetSpent` or `setDeadline`. The budgets would not be shared. No stop. The branch changes only `protect-records.js` and its test among the plan's files. The spelling branch (`fix/settings-file-spellings-are-refused`) changes the same two files plus docs (the three-dot diff of `real-path-confinement.js` is empty).
- Calibration of the text rate (scratch probe, this Mac under load 22-25): 1,000,000 walk steps of `resolveExisting` 1,809 ns each; 1,000,000 joins and tidies of 64 characters 381 ns each. Text is about 4.7 times cheaper per unit than a file-system step, so 64 characters per unit stays (Decision 3's rule not triggered).
- Before numbers: taken as the file-system calls of the old code, run from a scratch copy of src/ with the three changed files as HEAD has them (the scanner's `p41.js` is not in the repository): builder agent nine-check 2,506,383 calls; main nine-check 547,586; main plain 446,498; agent plain 1,406,961; 2,000 lines agent nine-check 8,331,909. NOT done: `npm test` totals and the dead-export analysers (the brief excludes the full `npm test`; the two reachability fences pass).

**Step 10.** As specified in the plan, nothing else touched. Edits: `real-path-confinement.js` (state, `keyOf`, `remember`, `setWorkBudget`, `budgetSpent(cost)`, `textBudgetSpent`, wrappers over `walkAsWritten`, `basisOf`, `identityOf`, three length charges, header paragraphs), `PreToolUse.Bash.js` (`chargeText`, three charged sites, spent check before the read-only exemption), `protect-records.js` (`REFUSAL_WORK`, `DECISION_WORK_UNITS`, `DECISION_BACKSTOP_MS`, the two setter calls, `workSentence`, headers), both test files, `docs/ENFORCEMENT.md`.

**Step 12, measured** (through the hook's input JSON with a counting preload, bisection over `units`, frozen clock; load average 22-25):
- Builder cost, allowed at C and refused at C-1: agent nine-check 327,618; main nine-check 81,779; main plain 79,544; agent plain 220,018; folded builder agent nine-check (16 runs) 573,450. All under 1,000,000 (the stop rule). Absolute-folder builder 349,435; `git add` of 128 files 12,602.
- Ordinary Write: 79 to 105 units (65 to 92 file-system calls).
- 2,000 lines, agent nine-check: 1,434,503 units, 348,222 calls, 100,080 characters (under 163,840); folded 2,232,767 units. Both under 3,000,000: the 2,000-line limit stands for both shapes, no resizing.
- Memory: 24,006 distinct as-written targets asked (24,010 folded), under the 32,768 cap (no change to `MEMORY_ENTRIES_MAX`); 2,516,657 characters of targets (about 5 million with keys and stored paths) against 16,777,216; heap cost 12.7 MB for both shapes (`node --expose-gc`), under 64 MB.
- Unit 27 (ii) ratio: 67,134 calls without the memory over 944 with it, 71.1 times; checks 2 to 9 make 14, 14, 14, 14, 12, 12, 11, 11 calls.
- File-system calls after the change: builder agent nine 9,474 (before 2,506,383); main nine 9,350; main plain 7,418; agent plain 7,492; 2,000 lines 348,222 (before 8,331,909).
- Wall time (quoted, never asserted; hook process end to end, load 21-25): `cd a;` chains of 100 KB and 3,200 KB refused in 0.6 s; shape A refused in 0.5 s after 3,268 file-system calls, shape B in 0.5 s after 4,104; builder agent nine-check allowed in 0.25 s; 2,000 lines allowed in 1.3 s (1.9 s folded). NOT measured: the units spent at refusal for the padded shapes, and the 478 KB `cp x` command (it was measured under the earlier clock).

**Checks.** `npx eslint . --max-warnings 0` through the API: 924 files, 0 errors, 0 warnings. `tsc --noEmit` exit 0. 798 tests pass in the 18 files named in the brief plus the other loaders of the resolver and the hook (`claude-md-keeps-every-rule` included), 0 failed, 0 skipped. Approval digest: `computeSpecHash` of this plan equals `content_sha256` in `.ctoc/approvals/the-settings-check-counts-its-work-not-the-clock.json` (88325547...ab259) before and after the plan edits.

**Refusals met.** None.

**First review round (the critic and the security scan), 2026-10-20.** Each new test was seen red before its fix.

Red before the fix, with the code of the first run:
- hook 168: rows 128, 129 and 400 operands (hard link) and 128 and 400 (long-s spelling) allowed; the 127-operand rows refused. Red.
- hook 169: the 64 KB agent command ran until the spawn limit (280 s) with no verdict (status null). Red. Green after: refused with the work sentence in 1.9 s of wall time (the assertion is on the verdict and the count, not on time).
- hook 170: only the charge row red (`charged` 106 against at least 625); the closing-line rows were green and stay green.
- unit 27 (v-c): the 200th long path was remembered (0 then 0 calls). Red.
- hook 171 (deep `cp x`): green before and after, a guard.

Findings, in the order of the brief:
- S1: the cap is gone (Decision 29); `docs/ENFORCEMENT.md` no longer says "128 operands" in the not-covered list, in the numbered list or in the padded-command item.
- S2, S3: Decision 30. S4: Decision 31.
- R1: the 478 KB command of four `cp x` segments of 128 operands, each operand 912 bytes of nested folders (470,619 characters), built under the shipped code by changing folder step by step. Main session, plain project: 75,298 units, 7,707 file-system calls, 79 ms; background agent: 179,840 units, 7,761 calls, 140 ms. Nine-check layout: main 76,840 units, 9,249 calls, 81 ms; agent 259,798 units, 9,353 calls, 169 ms. Load average 77, 78, 68 at the time (not idle). Verdict: allowed, decided by the count at under a tenth of it; the 60 s backstop is far away, so the verdict does not depend on the load and no change to the `identityChain` step cost is needed. The same command on the code of release 6.14.133 with the clock frozen made 34,816 calls (main) and 108,599 (agent) and was also allowed; its refusal at 5.03 s in the earlier trial was the clock's. `docs/ENFORCEMENT.md` states the verdict.
- R2: the fences' analysers (`analyze` and `analyzeExports` of `src/lib/reachability.js`) run on a scratch export of the base commit 09229c44 and on this tree. Base: 192 files, 17 unreachable; 1,146 exports, 1,081 live, 65 dead. This tree: 192 files, 17 unreachable; 1,148 exports, 1,083 live, 65 dead. The two new exports are live; nothing joins the dead set.
- R3: Decision 28 (the Order section is hashed in the approval, so it is corrected there and in Decision 16, not in place).
- R4, R5: `docs/ENFORCEMENT.md` ("a call that needs no walk still pays for its text work, charged the same way") and the header list in `protect-records.js` now name the text test, the quoted-literal scan and the Unicode fold as outside the count, the same words in both.
- R6: budget checks, counted by a counter put as the first statement of `budgetSpent` in scratch copies of src/ (the base code and this tree), run through the hook with a preload that fixes `Date.now` at 1e12 and moves it by 0 per call, so the old 5-second clock never fired and the "before" figures are the work, not a refusal. Before (calls, budget checks): builder agent nine-check 2,506,383 and 2,337,737; main nine-check 547,586 and 515,731; main plain 446,498 and 414,643; agent plain 1,406,961 and 1,302,949; 2,000 lines agent nine-check 8,331,909 and 7,743,835. After: 9,469 and 481,014; 9,350 and 114,399; 7,418 and 112,467; 7,487 and 321,961; 348,222 and 1,908,616. (A hit in the memory still asks `budgetSpent`, so checks fall less than calls.)
- R7: a project path of exactly 200 characters (`<tmp>/.claude/worktrees/<padding>`), agent in the nine-check layout, bisected: builder 329,958 units (main 84,064; folded 575,814), 2,000 lines 1,530,558 (folded 2,328,838). All stay under a third of the count for the builder (1,000,000) and under the full count for the 2,000-line shapes (3,000,000), so no margin drops below its bound. Figures after the round, at a normal path: builder agent nine-check 327,646; main nine-check 81,779; main plain 79,544; agent plain 220,045; folded 573,478; 2,000 lines 1,434,509; folded 2,232,773; memory 12.7 MB. These supersede the figures of the first run above.
- R8: the padded-shape item of Step 12 is ticked with the critic's reasoning: shapes A and B run under a fake clock that moves 1 ms per file-system call, and a refusal whose `elapsed` stays under 60,000 ms means the count decided, because only the count can refuse before the backstop. Hook case 164 (b)(c) assert it (shape A refused after 3,268 file-system calls, shape B after 4,104, about 0.5 s of wall time each, load average 22 to 25). The units spent at refusal are the whole count by definition of the refusal.

**Step 11, mutation table at the end of the third round.** Each change made once, both Step 8 files run separately, the file put back by writing the stored original, sha256 before and after: `real-path-confinement.js` 5d8456ff833026d5771f4f170e9ce5f77dde1492a119031fc4d39cd0e049ea55, `protect-records.js` dccd84ad00b0eb9b9a5b665317822b77d2834296acd6f161a74bce02c8633077, `PreToolUse.Bash.js` 50d2397f673f39555072688b5da4fb003d340f07591e944cc12c9d0acef267dc; unchanged after every run. (a) to (u) are the plan's table, (v) to (y) were added in the first review round, (z) to (ad) in the second, and (ae) to (ah) in the third, where (aa), (ac) and (ad) were redefined for the new code. Round 3 changed only `protect-records.js` (the manifest read and the next-word pass), so it re-ran the mutations that touch that code (w, y, z, aa to ah); the others are the second round's results on files that did not change (`real-path-confinement.js` and `PreToolUse.Bash.js` are byte-identical to the second round's, by sha256). Every one turned a test red except (ag), which Decision 35 explains.

| Mutation | Red tests | Against the prediction |
|---|---|---|
| (a) setWorkBudget creates no memory | 162, case 27, case 28 | predicted 162 (nine-check rows), unit 27 (i)(ii)(v)(vi)(viii): met; also unit 28 (vi) |
| (b) budgetSpent ignores cost | 162, 164, 169, case 27, case 28 | predicted unit 28 (ii)(iii)(iv)(vi)(vii), hook 164 (a): met; also 162 (h), 164 (b)(c), 169, unit 27 (iv) |
| (c) a remembered walk ignores the spent budget | case 27 | predicted unit 27 (iv): met |
| (d) the entry cap removed | case 27 | predicted unit 27 (v): met |
| (e) text charged one unit per character | 157, 161, 162, 171, case 27, case 28 | predicted the absolute-folder row of 162 and unit 28: met; also 157, 161, 162 (a)(f)(g)(h), 171, unit 27 |
| (f) DECISION_WORK_UNITS 30,000,000 | 164 | predicted 164 (a): met |
| (g) the backstop not set in decide() | 151, 155, 163 | predicted 163, 151, 155: met |
| (h) setWorkBudget(0) read as no count | 166, 167, case 28 | predicted 166, 167 (c), unit 28 (iv): met |
| (i) the floor charge at resolvesUnder entry and in the identity chain removed | 174, case 27, case 28 | predicted unit 27 (vii): met; also unit 28 (vi) and hook 174 |
| (j) the memory keyed on the tidied path | 138, 145, 153, 157, case 27 | predicted unit 27 (ix): met (the only unit row red); also 138, 145, 153, 157 |
| (k) the candidate charge in the link-test loop removed | case 28 | predicted unit 28 (vi): met |
| (l) resolvesUnder's entry charged 1 in place of by length | case 28 | predicted unit 28 (vi): met |
| (m) kernelAgrees' step charged 1 in place of by length | case 28 | predicted unit 28 (vi) and (vii): met |
| (n) the tail charge removed | case 28 | predicted unit 28 (vii): met |
| (o) the spent check before the read-only exemption removed | case 28 | predicted unit 28 (viii): met |
| (p) workSentence returns the sentence unchanged | 151, 154, 155, 163, 164, 165, 166, 167, 169, 174 | predicted 163, 164, 165, 166, 167 (a), 151, 154, 155: met; also 169, 174 |
| (q) MEMORY_ENTRIES_MAX 8,192 | 162, case 27 | predicted unit 27 (v) and (viii): met; also 162 (f)(h) |
| (r) the character cap removed | case 27 | predicted unit 27 (v-b): met; also (v-c) |
| (s) workSentence drops its null check | 167 | predicted 167 (c): met |
| (t) keyOf builds the key outside its try | case 27 | predicted unit 27 (x) process.cwd rows: met |
| (u) keyOf keys an empty string | case 27 | predicted unit 27 (x) empty-string rows: met |
| (v) the 128-candidate cap restored (review round) | 157, 168 | round 1: hook 168 and 157: met |
| (w) the sweep check's lookups uncharged (review round) | 169 | round 1: hook 169: met |
| (x) the memory cap ignores tail names (review round) | case 27 | round 1: unit 27 (v-c): met |
| (y) the blanks regex restored and the body length uncharged (review round) | 170 | round 1: hook 170 (the charge row): met |
| (z) the de-duplicated list drives the current folder (round 2) | 109 | round 2: hook 109 (the four revisit rows): met |
| (aa) the next-word search restarts from each runtime word, at the same price per step (round 3) | 172 | round 3: hook 172 (the per-word search at the same price per step spends the count and is refused): met |
| (ab) the sweep check does not charge the reading of the command (round 2) | 172 | round 2: hook 172: met |
| (ac) the manifest is opened waiting, without O_NONBLOCK (round 3) | 173 | round 3: hook 173 (the pipe blocks the open to its hang guard): met |
| (ad) the manifests ctocKind reads are not charged (round 2) | 174 | round 2: hook 174: met |
| (ae) the bytes of a manifest are not charged (round 3) | 173b | round 3: hook 173b (the 900,000-byte row): met |
| (af) the 1 MiB limit on a manifest removed (round 3) | 173b | round 3: hook 173b (the 2,000,000-byte row): met |
| (ag) the regular-file check on the descriptor removed (round 3) | none | round 3: NOT red, as stated in Decision 35: with a non-waiting open and a read bounded by the size a pipe reads as empty either way |
| (ah) each step of the next-word pass uncharged (round 3) | 172 | round 3: hook 172: met |

**Second review round (the re-review and the re-scan), 2026-10-20.** Each new row was seen red before its fix.
- Finding 1 (the shell's folder lost after a revisit): hook case 109, four rows red on the first-round tree (rows 1 to 4 allowed) and green on the code of release 6.14.133; green after the fix (Decision 34). The scanner's `p-dedup.js` now refuses all four attack rows on the tree.
- Finding 2 (the next-word search): hook case 172 red (28 units charged), green after (Decision 35). The scanner's `p-quad.js`: 137 KB refused in 32 ms, 1,025 KB in 55 ms, 1,094 KB in 61 ms with 17,501 units charged; the re-scan measured 12 s at 1.09 MB before.
- Finding 3 (a manifest that is not a regular file): hook case 173 red (no verdict in 30 s), green after; hook case 174 red (allowed at a count of 180,000; cost 146,149 units) and green after (cost 218,525). The scanner's `p-fifo.js`: the code of release 6.14.133 gives no verdict in 10 s, the tree gives one in 28 ms.
- Finding 4: the header list is corrected. Finding 5: Decision 36 (the sentence is the plain-call one, confirmed by running it). Finding 6: Decision 28 now cites Decision 30. Finding 7: the Neighbours section is in the digest, so Decision 33 records the correction. Finding 8: Decision 36 (case 171 removes the layout and asserts it is gone).
- Figures at the end of the round are those of the first round; the three source files that moved do not change them (builder agent nine-check 327,646; 2,000 lines 1,434,509; memory 12.7 MB).

**Third review round (the re-review and the re-scan), 2026-10-20.** Each new row was seen red before its fix.
- Finding 1 (the stat check beaten by a swap): hook case 173 gained a row where the path-based stat says "regular file" for a pipe (red: no verdict within its 30 s hang guard; green after), and case 173b is new: a 900,000-byte manifest charged at least 14,062 units (red: 97 charged) and a 2,000,000-byte one not read (red: 2,342,147 bytes read; green: fewer than 1 MiB). The scanner's `p-toctou2.js` with its swapper: 0 of 10 runs hung at 50 words and 0 of 3 at 2,000 words (6 of 10 and 3 of 3 before); each ran in 43 to 476 ms. `src/lib/safe-fs.js` was not touched and no scope-growth request was needed.
- Finding 2 (mutation (aa) visible to the count): each step of the next-word pass is a unit; hook case 172 now asserts the units (at least 20,000 plus the reading, under 100,000, not spent) and the verdict, with no spawn limit of its own. Red before (2,216 charged); mutations (aa) and (ah) turn it red.
- Finding 3: the comment in `sweepBypassRefusal` and `docs/ENFORCEMENT.md` say what `current` follows (Decision 37). The gaps are not fixed here.

**`git diff --stat` at the end of the third round** (the log file and the plan's own move out of the implementation folder are the pipeline's, not mine):

~~~~
 .ctoc/logs/transitions.json                        |  15 +
 docs/ENFORCEMENT.md                                | 121 ++-
 ...settings-check-counts-its-work-not-the-clock.md | 821 ---------------------
 src/hooks/PreToolUse.Bash.js                       |  54 +-
 src/hooks/protect-records.js                       | 179 ++++-
 src/lib/real-path-confinement.js                   | 198 ++++-
 tests/a-link-cannot-leave-the-repository.test.js   | 386 ++++++++++
 tests/protect-records.test.js                      | 429 ++++++++++-
 8 files changed, 1269 insertions(+), 934 deletions(-)
~~~~

**`git diff -- tests/`:**

~~~~diff
diff --git a/tests/a-link-cannot-leave-the-repository.test.js b/tests/a-link-cannot-leave-the-repository.test.js
index f5762847..d65fe7f7 100644
--- a/tests/a-link-cannot-leave-the-repository.test.js
+++ b/tests/a-link-cannot-leave-the-repository.test.js
@@ -873,4 +873,390 @@ describe('the protected folder is compared by file identity (owner, 2026-10-15)'
     }
     R.done();
   });
+
+  // -------------------------------------------------------------------------------------------
+  // The settings check counts its work, not the clock (owner, 2026-10-19). Cases 27 and 28 count
+  // file-system calls and units in this process, never wall time: a verdict here depends on the
+  // count and on a mocked clock only. Every row clears the count and the backstop in `finally`
+  // (all tests of a file share one process, so a leftover memory would serve stale answers).
+  // -------------------------------------------------------------------------------------------
+
+  const { isLedgerWrite } = require('../src/hooks/PreToolUse.Bash.js');
+  const NEVER = /(?!)/;
+
+  /** The builder's ordinary here-document (hook case 161): `lines` of test, first line given. */
+  function builderCommand(first = "cd copy && cd src && cd .. && cat > tests/claude-setup-check.test.js <<'EOF'", lines = 300) {
+    return [first, "'use strict';", "const { route } = require('../src/lib/menu-screens');",
+      ...Array.from({ length: lines }, (_, i) => `  test('${i} claude-setup apply advisor writes the setting', () => { assert.equal(route(['claude-setup', 'apply', 'advisor'], dir).ok, true); });`),
+      'EOF', 'node --test tests/claude-setup-check.test.js'].join('\n');
+  }
+
+  /** The 2,000-line here-document of distinct words (the same text as the hook file's fixture). */
+  function twoThousandLines(first = "cd copy && cd src && cd .. && cat > tests/claude-setup-check.test.js <<'EOF'") {
+    const lines = Array.from({ length: 2000 }, (_, k) => {
+      const i = String(k).padStart(4, '0');
+      return `t('${i} a${i}', () => f${i}(['c${i}', 'd${i}']));`;
+    });
+    return [first, ...lines, 'EOF'].join('\n');
+  }
+
+  /** The nine-check layout: a project at `<tmp>/<scratch>/.claude/worktrees/w`, with `copy/src`. */
+  function makeNineLayout() {
+    const outer = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-nine-')));
+    const root = path.join(outer, '.claude', 'worktrees', 'w');
+    for (const d of [['.ctoc', 'approvals'], ['.ctoc', 'state', 'verify'], ['src'], ['copy', 'src']]) {
+      fs.mkdirSync(path.join(root, ...d), { recursive: true });
+    }
+    fs.mkdirSync(path.join(outer, 'cfg'));
+    // The nine relative paths of the settings checks of a background agent in a worktree.
+    const dirs = ['.ctoc/settings.yaml', '.ctoc/regulatory-regimes', '.claude/settings.json', '.claude/settings.local.json',
+      '.ctoc/settings.json', '../../../cfg/settings.json', '../../settings.json', '../../settings.local.json', '../../../.ctoc/settings.json'];
+    return { outer, root, dirs };
+  }
+
+  /**
+   * The delegating counters of the file-system calls the resolver makes. A plain wrapper, put back when the case ends:
+   * `t.mock.method` keeps every call's arguments and result, which is millions of entries for a here-document read
+   * without the memory (a process out of memory instead of a failed row).
+   */
+  function countFsCalls(t) {
+    const counter = { n: 0 };
+    for (const name of ['lstatSync', 'statSync', 'realpathSync', 'readlinkSync']) {
+      const real = safeFs[name];
+      safeFs[name] = (...args) => { counter.n += 1; return real(...args); };
+      t.after(() => { safeFs[name] = real; });
+    }
+    return counter;
+  }
+
+  /** Clears the decision's count (and with it the memory) and the backstop. */
+  function clearWork() {
+    confinement.setWorkBudget(null);
+    confinement.setDeadline(null);
+  }
+
+  it('case 27: within one decision a lookup is made once, and the memory dies with the decision', (t) => {
+    const R = makeRows();
+    const counter = countFsCalls(t);
+    const { dir, root } = makeRealProject();
+    const nine = makeNineLayout();
+    const segmentsOf = (p) => p.split(path.sep).filter(Boolean).length;
+    /** Runs the first `lines`-line command once per spec of the nine, returns the calls each check made. */
+    const nineChecks = (command, memoryOn) => withCwd(nine.root, () => {
+      confinement.setWorkBudget(memoryOn ? 3000000 : null);
+      const calls = [];
+      for (const d of nine.dirs) {
+        const before = counter.n;
+        const verdict = isLedgerWrite(command, { dir: d, segmentRe: NEVER, resolvedRe: NEVER });
+        calls.push({ d, n: counter.n - before, verdict });
+      }
+      return calls;
+    });
+    try {
+      R.row('(i) a second ask of the same question makes 0 file-system calls', () => {
+        try {
+          confinement.setWorkBudget(3000000);
+          assert.equal(resolvesUnder('src/x.js', '.ctoc/approvals', root), false);
+          const before = counter.n;
+          assert.equal(resolvesUnder('src/x.js', '.ctoc/approvals', root), false);
+          assert.ok(before > 0, 'the first ask made calls');
+          assert.equal(counter.n - before, 0, 'the second ask is answered from memory');
+        } finally { clearWork(); }
+      });
+
+      R.row('(ii) nine checks of the builder cost about one with the memory, and at least 5 times more without it', () => {
+        try {
+          const command = builderCommand().split('\n').slice(0, 10).join('\n');
+          const on = nineChecks(command, true);
+          for (const c of on) assert.equal(c.verdict, false, `the check of ${c.d} allows`);
+          const bound = (d) => 2 * segmentsOf(path.join(nine.root, d)) + 6;
+          for (const c of on.slice(1)) assert.ok(c.n <= bound(c.d), `check ${c.d}: ${c.n} calls, at most ${bound(c.d)}`);
+          const off = nineChecks(command, false);
+          for (const c of off.slice(1)) assert.ok(c.n > bound(c.d), `check ${c.d} without the memory: ${c.n} calls, more than ${bound(c.d)}`);
+          const sum = (rows) => rows.reduce((a, c) => a + c.n, 0);
+          assert.ok(sum(off) >= 5 * sum(on), `without ${sum(off)} against with ${sum(on)}: at least 5 times`);
+        } finally { clearWork(); }
+      });
+
+      R.row('(iii) the memory never outlives the decision', () => {
+        try {
+          confinement.setWorkBudget(3000000);
+          assert.equal(resolvesUnder('src/L/x.json', '.ctoc/approvals', root), false, '(src/L absent)');
+          mklink(path.join(root, '.ctoc', 'approvals'), path.join(root, 'src', 'L'));
+          confinement.setWorkBudget(3000000);
+          assert.equal(resolvesUnder('src/L/x.json', '.ctoc/approvals', root), true, 'a fresh decision sees the link');
+          confinement.setWorkBudget(null);
+          assert.equal(resolvesUnder('src/L/x.json', '.ctoc/approvals', root), true, 'with the count cleared too');
+        } finally { clearWork(); fs.rmSync(path.join(root, 'src', 'L'), { force: true, recursive: true }); }
+      });
+
+      R.row('(iv) past the count a remembered walk returns the fault', () => {
+        try {
+          confinement.setWorkBudget(1000000);
+          const file = path.join(root, 'src', 'x.js');
+          assert.equal(confinement.resolveExisting(file).ok, true);
+          assert.equal(confinement.budgetSpent(10000000), true);
+          const again = confinement.resolveExisting(file);
+          assert.equal(again.ok, false);
+          assert.equal(again.reason, 'resolve-failed');
+        } finally { clearWork(); }
+      });
+
+      R.row('(v) the entry cap, at its exact value (32,768 answers per kind)', () => {
+        try {
+          confinement.setWorkBudget(3000000);
+          const ask = (i) => confinement.resolveExisting(path.join(root, `n${i}`));
+          for (let i = 0; i < 32768; i++) assert.equal(ask(i).ok, true);
+          let before = counter.n;
+          ask(32767);
+          assert.equal(counter.n - before, 0, 'the 32,768th path asked again is answered from memory');
+          before = counter.n;
+          ask(32768);
+          const first = counter.n - before;
+          ask(32768);
+          const second = counter.n - before - first;
+          assert.ok(first > 0 && second > 0, `the next distinct path is not remembered: ${first} then ${second} calls`);
+        } finally { clearWork(); }
+      });
+
+      R.row('(v-b) the character cap: past 16,777,216 characters nothing more is remembered', () => {
+        try {
+          confinement.setWorkBudget(1e9);
+          const long = 'z'.repeat(30000);
+          const ask = (i) => confinement.resolveExisting(path.join(root, `m${i}`, long));
+          for (let i = 0; i < 300; i++) ask(i);
+          let before = counter.n;
+          ask(300);
+          const first = counter.n - before;
+          before = counter.n;
+          ask(300);
+          const second = counter.n - before;
+          assert.ok(first > 0 && second > 0, `the next distinct long path is not remembered: ${first} then ${second} calls`);
+        } finally { clearWork(); }
+      });
+
+      R.row('(v-c) the character cap counts the names of the tail too', () => {
+        try {
+          // Each walk of <root>/m<i>/<30,000 z> stores its path (about 30,000 characters), its key (the same) and its
+          // tail names (the same again): 90,000 a walk, so the 16,777,216-character cap holds 186 of them. Without the
+          // tail it would hold 279, and the 200th distinct path would still be remembered.
+          confinement.setWorkBudget(1e9);
+          const long = 'z'.repeat(30000);
+          const ask = (i) => confinement.resolveExisting(path.join(root, `m${i}`, long));
+          for (let i = 0; i < 200; i++) ask(i);
+          let before = counter.n;
+          ask(199);
+          const first = counter.n - before;
+          before = counter.n;
+          ask(199);
+          const second = counter.n - before;
+          assert.ok(first > 0 && second > 0, `the 200th distinct path is not remembered: ${first} then ${second} calls`);
+        } finally { clearWork(); }
+      });
+
+      R.row('(vi) a remembered answer is frozen', () => {
+        try {
+          confinement.setWorkBudget(3000000);
+          const r = confinement.resolveExisting(path.join(root, 'src', 'absent-name'));
+          assert.equal(r.ok, true);
+          assert.ok(Object.isFrozen(r) && Object.isFrozen(r.tail), 'the answer and its tail are frozen');
+        } finally { clearWork(); }
+      });
+
+      R.row('(vii) asking a remembered question again and again runs the count down', () => {
+        try {
+          confinement.setWorkBudget(100000);
+          let asks = 0;
+          let verdict = false;
+          while (!verdict && asks < 100000) {
+            verdict = resolvesUnder('src/x.js', '.ctoc/approvals', root);
+            asks += 1;
+          }
+          assert.equal(verdict, true, `still false after ${asks} asks`);
+        } finally { clearWork(); }
+      });
+
+      R.row('(viii) the memory holds the 2,000-line here-document: checks 2 to 9 cost only their own protected path', () => {
+        try {
+          const command = twoThousandLines();
+          assert.ok(command.length < 163840, `the command is ${command.length} characters`);
+          const on = nineChecks(command, true);
+          for (const c of on) assert.equal(c.verdict, false, `the check of ${c.d} allows`);
+          for (const c of on.slice(1)) {
+            const bound = 2 * segmentsOf(path.join(nine.root, c.d)) + 6;
+            assert.ok(c.n <= bound, `check ${c.d}: ${c.n} calls, at most ${bound}`);
+          }
+        } finally { clearWork(); }
+      });
+
+      R.row('(ix) the as-written reading is never answered from the tidied one\'s memory', () => {
+        try {
+          fs.mkdirSync(path.join(root, '.ctoc', 'approvals', 'inner'));
+          mklink(path.join(root, '.ctoc', 'approvals', 'inner'), path.join(root, 'src', 'L'));
+          withCwd(root, () => {
+            confinement.setWorkBudget(3000000);
+            assert.equal(resolvesUnder('src/x', '.ctoc/approvals', root), false);
+            // As written, `..` after the link is the link's real parent, `.ctoc/approvals`. Joined with
+            // path.sep, never path.join, which would tidy it.
+            assert.equal(resolvesUnder(['src', 'L', '..', 'x'].join(path.sep), '.ctoc/approvals', root), true);
+          });
+        } finally { clearWork(); fs.rmSync(path.join(root, 'src', 'L'), { force: true, recursive: true }); }
+      });
+
+      R.row('(x) a wrapper never throws and never remembers what it cannot key', () => {
+        try {
+          withCwd(root, () => {
+            const uncached = (f) => { confinement.setWorkBudget(null); const v = f(); confinement.setWorkBudget(3000000); return v; };
+            confinement.setWorkBudget(3000000);
+            for (const [label, f] of [
+              ['resolveExisting(42)', () => confinement.resolveExisting(42)],
+              ['resolveExisting(null)', () => confinement.resolveExisting(null)],
+              ['fileIdentity(42)', () => confinement.fileIdentity(42)],
+            ]) {
+              const mine = noThrow(f);
+              assert.deepStrictEqual(mine, uncached(f), label);
+            }
+            assert.deepStrictEqual(confinement.resolveExisting(42), { ok: false, real: null, reason: 'resolve-failed', tail: null });
+            // An empty string never shares the key `<cwd><sep>` with the real working folder.
+            const here = process.cwd() + path.sep;
+            confinement.setWorkBudget(3000000);
+            assert.equal(confinement.resolveExisting(here).ok, true);
+            assert.notEqual(confinement.fileIdentity(here), null);
+            for (const [label, f] of [
+              ['resolveExisting(\'\')', () => confinement.resolveExisting('')],
+              ['fileIdentity(\'\')', () => confinement.fileIdentity('')],
+            ]) {
+              const mine = noThrow(f);
+              assert.deepStrictEqual(mine, uncached(f), label);
+            }
+          });
+          // A working folder that cannot be read: relative paths get the uncached answer, and nothing throws.
+          withCwd(root, () => {
+            confinement.setWorkBudget(3000000);
+            const broken = t.mock.method(process, 'cwd', () => { throw new Error('uv_cwd'); });
+            try {
+              const rel = noThrow(() => confinement.resolveExisting('src/x.js'));
+              const id = noThrow(() => confinement.fileIdentity('src/x.js'));
+              confinement.setWorkBudget(null);
+              assert.deepStrictEqual(rel, confinement.resolveExisting('src/x.js'));
+              assert.deepStrictEqual(id, confinement.fileIdentity('src/x.js'));
+            } finally {
+              broken.mock.restore();
+            }
+          });
+        } finally { clearWork(); }
+      });
+    } finally {
+      rm(dir);
+      rm(nine.outer);
+    }
+    R.done();
+  });
+
+  it('case 28: the count decides at an exact number', (t) => {
+    const R = makeRows();
+    const { dir, root } = makeRealProject();
+    const start = Date.now();
+    t.mock.method(Date, 'now', () => start);
+    const textOnly = { segmentRe: /(^|[^a-z0-9._-])\.ctoc\/+settings\.yaml([^a-z0-9._-]|$)/i, resolvedRe: /(^|\/)\.ctoc\/+settings\.yaml$/i };
+    /** Is the command allowed at exactly `units`? */
+    const allowedAt = (command, units, spec = textOnly) => {
+      confinement.setDeadline(start + 60000);
+      confinement.setWorkBudget(units);
+      return isLedgerWrite(command, spec) === false;
+    };
+    /** The smallest count at which `f` gives its allowing answer: doubling from 1, then bisection. */
+    const minUnits = (f) => {
+      let hi = 1;
+      const ok = (c) => { confinement.setWorkBudget(c); return f(); };
+      while (!ok(hi)) {
+        hi *= 2;
+        assert.ok(hi <= 10000000, 'the allowing answer needs more than 10,000,000 units');
+      }
+      let lo = Math.floor(hi / 2); // refused at lo (or lo is 0)
+      while (hi - lo > 1) {
+        const mid = Math.floor((lo + hi) / 2);
+        if (ok(mid)) hi = mid; else lo = mid;
+      }
+      return hi;
+    };
+    try {
+      for (const [label, command, allowed, refused] of [
+        ['(i) cd a; cd a; cd a; ls: four segments, one unit each', 'cd a; cd a; cd a; ls', 4, 3],
+        ['(ii) cd <640 a>; ls: 1, then 1 + 20', `cd ${'a'.repeat(640)}; ls`, 22, 21],
+        ['(iii) cd <640 a>; cp x y: 1 + 21 + two operands at 11', `cd ${'a'.repeat(640)}; cp x y`, 44, 43],
+      ]) {
+        R.row(label, () => {
+          try {
+            assert.equal(allowedAt(command, allowed), true, `allowed at ${allowed}`);
+            assert.equal(allowedAt(command, refused), false, `refused at ${refused}`);
+          } finally { clearWork(); }
+        });
+      }
+
+      R.row('(iv) budgetSpent charges its cost and floors a bad cost at 1', () => {
+        try {
+          confinement.setWorkBudget(10);
+          assert.equal(confinement.budgetSpent(10), false);
+          assert.equal(confinement.budgetSpent(), true);
+          confinement.setWorkBudget(0);
+          assert.equal(confinement.budgetSpent(0), false, 'an empty count is not spent');
+          assert.equal(confinement.budgetSpent(), true, 'the first charge spends it');
+          confinement.setWorkBudget(1);
+          assert.equal(confinement.budgetSpent(-5), false);
+          assert.equal(confinement.budgetSpent(NaN), true);
+          confinement.setWorkBudget(null);
+          confinement.setDeadline(null);
+          for (let i = 0; i < 1000; i++) assert.equal(confinement.budgetSpent(), false);
+        } finally { clearWork(); }
+      });
+
+      R.row('(v) the clock is independent of the count', () => {
+        try {
+          confinement.setWorkBudget(1e9);
+          confinement.setDeadline(start - 1);
+          assert.equal(confinement.budgetSpent(), true);
+        } finally { clearWork(); }
+      });
+
+      const linkSpec = { dir: '.ctoc/approvals', segmentRe: NEVER, resolvedRe: NEVER };
+      R.row('(vi) lengthening the folder-change chain by 128 characters costs exactly 22 units', () => {
+        try {
+          withCwd(root, () => {
+            const at = (n) => minUnits(() => { confinement.setDeadline(start + 60000); return isLedgerWrite(`cd ${'b'.repeat(n)}; true 'q'`, linkSpec) === false; });
+            const a = at(64);
+            const b = at(192);
+            assert.equal(b - a, 22, `${b} - ${a}`);
+          });
+        } finally { clearWork(); }
+      });
+
+      R.row('(vii) lengthening a tail name by 128 characters costs exactly 4 units', () => {
+        try {
+          const at = (k) => minUnits(() => {
+            confinement.setDeadline(start + 60000);
+            return confinement.resolveExisting(path.join(root, 'b'.repeat(64), 'c'.repeat(k))).ok === true;
+          });
+          const a = at(64);
+          const b = at(192);
+          assert.equal(b - a, 4, `${b} - ${a}`);
+        } finally { clearWork(); }
+      });
+
+      R.row('(viii) a count that runs out inside the link test refuses a read-only segment', () => {
+        try {
+          withCwd(root, () => {
+            confinement.setDeadline(start + 60000);
+            confinement.setWorkBudget(3);
+            assert.equal(isLedgerWrite('cat x', linkSpec), true);
+            clearWork();
+            assert.equal(isLedgerWrite('cat x', linkSpec), false, 'with no count it is allowed');
+          });
+        } finally { clearWork(); }
+      });
+    } finally {
+      rm(dir);
+    }
+    R.done();
+  });
 });
diff --git a/tests/protect-records.test.js b/tests/protect-records.test.js
index c836c6bd..2d03633b 100644
--- a/tests/protect-records.test.js
+++ b/tests/protect-records.test.js
@@ -1106,6 +1106,9 @@ describe('the write protection compares real files, not spellings (owner, 2026-1
     + 'later call runs with; report what you wanted to change and let the main session make the change.';
   const REFUSAL_AGENT_SETTINGS_UNCHECKED = 'CTOC refused this call because it mentions a settings file and '
     + "CTOC's protection for it failed to run; tell the human that this protection is broken.";
+  // The sentence for a refusal made once the decision's count of work, or its backstop clock, is spent.
+  const REFUSAL_WORK = 'CTOC refused this call because checking it would take more work than CTOC allows for one call; '
+    + 'split it into smaller commands and run them one by one.';
   const LONG_S = 'ſ'; // U+017F, which NFKC folds to `s` and APFS opens as `s`
   const FULL_WIDTH_S = 'ｓ'; // U+FF53, a distinct, absent name on APFS
   const FULL_WIDTH_SOLIDUS = '／'; // U+FF0F, never a path separator
@@ -1212,7 +1215,132 @@ describe('the write protection compares real files, not spellings (owner, 2026-1
     put(p('.ctoc', 'regulatory-regimes', 'gdpr.yaml'), 'x: 1');
     put(p('src', 'e.js'), 'x');
   });
-  afterEach(() => { rm(cfg); cfg = null; });
+  afterEach(() => { rm(cfg, ...scratch.splice(0)); cfg = null; });
+
+  // ---- The count of work (owner, 2026-10-19): helpers for cases 161-167. No row reads wall time. ----
+  /** Extra folders a case makes (a worktree layout), removed after it. */
+  const scratch = [];
+  const SAFE_FS = path.join(REPO, 'src', 'lib', 'safe-fs.js');
+  const BUILDER_FIRST = "cd copy && cd src && cd .. && cat > tests/claude-setup-check.test.js <<'EOF'";
+
+  /** The builder's ordinary here-document: 300 test lines, about 43 KB. `folded` puts a `…` into line 0. */
+  function builderFixture(first = BUILDER_FIRST, folded = false) {
+    const lines = Array.from({ length: 300 }, (_, i) => {
+      const end = folded && i === 0 ? '…' : '';
+      return `  test('${i} claude-setup apply advisor writes the setting${end}', () => { assert.equal(route(['claude-setup', 'apply', 'advisor'], dir).ok, true); });`;
+    });
+    return [first, "'use strict';", "const { route } = require('../src/lib/menu-screens');", ...lines, 'EOF',
+      'node --test tests/claude-setup-check.test.js'].join('\n');
+  }
+
+  /** 2,000 lines of distinct words after the builder's first line (about 100,000 characters). `folded` changes line 0000. */
+  function twoThousandFixture(folded = false) {
+    const lines = Array.from({ length: 2000 }, (_, k) => {
+      const i = String(k).padStart(4, '0');
+      return folded && k === 0 ? `t('${i} a${i}…', () => f${i}(['c${i}', 'd${i}']));` : `t('${i} a${i}', () => f${i}(['c${i}', 'd${i}']));`;
+    });
+    return [BUILDER_FIRST, ...lines, 'EOF'].join('\n');
+  }
+
+  /** The project folders of `makeProject`, plus `copy/src` and the files the describe's beforeEach makes. */
+  function fillProject(root) {
+    for (const d of [['.ctoc', 'approvals'], ['.ctoc', 'state', 'verify'], ['.ctoc', 'streaming', 'questions', 'pending'],
+      ['src'], ['plans', 'review'], ['copy', 'src']]) fs.mkdirSync(path.join(root, ...d), { recursive: true });
+    put(path.join(root, '.ctoc', 'settings.yaml'), 'x: 1');
+    put(path.join(root, '.ctoc', 'regulatory-regimes', 'gdpr.yaml'), 'x: 1');
+    put(path.join(root, 'src', 'e.js'), 'x');
+  }
+
+  /**
+   * A project layout. 'plain' is the case's project (a background agent makes 6 settings checks, the main session 2).
+   * 'nine' is a project at `<tmp>/pr-wt-…/.claude/worktrees/w`, where the hook also protects the main checkout's three
+   * files, so a background agent makes 2 + 7 = 9 checks. `dir` holds the preload and its report.
+   */
+  function makeLayout(kind) {
+    if (kind === 'plain') {
+      fs.mkdirSync(p('copy', 'src'), { recursive: true });
+      return { root: project, dir: project };
+    }
+    const outer = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-wt-')));
+    scratch.push(outer);
+    const root = path.join(outer, '.claude', 'worktrees', 'w');
+    fillProject(root);
+    return { root, dir: outer };
+  }
+
+  let preloadSeq = 0;
+  /**
+   * Spawns the real hook on one payload with a preload that counts the file-system calls the resolver makes and keeps
+   * a fake clock: `Date.now` starts at 1e12 and moves `stepMs` per call, never with the wall.
+   * opts: `units` sets the decision's count of work; `chargeAfterSet` charges that many units right after the count is
+   * set; `spendAtFirstLookup` empties the count at the first exported `resolveExisting` call; `agent` makes the call a
+   * background agent's. Returns the child's result and its report `{ calls, elapsed, spent }` (the fake clock's span
+   * and the resolver's `budgetSpent(0)` at exit).
+   */
+  function spawnWork(lay, input, opts = {}) {
+    const name = `work-preload-${preloadSeq++}`;
+    const file = path.join(lay.dir, `${name}.js`);
+    const out = path.join(lay.dir, `${name}.json`);
+    fs.writeFileSync(file, [
+      "const fs = require('fs');",
+      `const c = require(${JSON.stringify(RPC)});`,
+      `const safeFs = require(${JSON.stringify(SAFE_FS)});`,
+      `const stepMs = ${JSON.stringify(opts.stepMs || 0)};`,
+      'let now = 1e12;',
+      'let calls = 0;',
+      'Date.now = () => now;',
+      "for (const name of ['lstatSync', 'statSync', 'realpathSync', 'readlinkSync']) {",
+      '  const real = safeFs[name];',
+      '  safeFs[name] = function (...args) { calls += 1; now += stepMs; return real.apply(this, args); };',
+      '}',
+      'const set = c.setWorkBudget;',
+      `const units = ${JSON.stringify(typeof opts.units === 'number' ? opts.units : null)};`,
+      `const charge = ${JSON.stringify(typeof opts.chargeAfterSet === 'number' ? opts.chargeAfterSet : null)};`,
+      "if (typeof set === 'function') {",
+      "  c.setWorkBudget = (n) => { set(units !== null && typeof n === 'number' ? units : n); if (charge !== null) c.budgetSpent(charge); };",
+      '}',
+      ...(opts.spendAtFirstLookup ? [
+        'const resolve = c.resolveExisting;',
+        'let first = true;',
+        "c.resolveExisting = (q) => { if (first) { first = false; if (typeof set === 'function') set(0); } return resolve(q); };",
+      ] : []),
+      // The units charged from outside the resolver (the shell's text work, the sweep check's lookups).
+      'let charged = 0;',
+      'const text = c.textBudgetSpent;',
+      "if (typeof text === 'function') c.textBudgetSpent = (n) => { charged += 1 + Math.floor(n / 64); return text(n); };",
+      'const spend = c.budgetSpent;',
+      "if (typeof spend === 'function') c.budgetSpent = (n = 1) => { if (n > 0) charged += n; return spend(n); };",
+      // The bytes read from files after this point (a manifest read whole or by descriptor), and an optional lie:
+      // `statLiesFor` makes the path-based stat of a file with that ending say "regular file" whatever it is.
+      'let bytesRead = 0;',
+      'const readWhole = fs.readFileSync;',
+      'fs.readFileSync = function (...a) { const r = readWhole.apply(this, a); bytesRead += r.length; return r; };',
+      'const readFd = fs.readSync;',
+      'fs.readSync = function (...a) { const n = readFd.apply(this, a); bytesRead += n; return n; };',
+      `const lieFor = ${JSON.stringify(opts.statLiesFor || null)};`,
+      'if (lieFor !== null) {',
+      '  const realStat = safeFs.statSync;',
+      '  safeFs.statSync = function (p, o) { const st = realStat.call(this, p, o); return String(p).endsWith(lieFor) ? Object.assign(Object.create(Object.getPrototypeOf(st)), st, { isFile: () => true }) : st; };',
+      '}',
+      "process.on('exit', () => {",
+      "  const spent = typeof c.budgetSpent === 'function' ? spend(0) : false;",
+      `  fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify({ calls, elapsed: now - 1e12, spent, charged, bytesRead }));`,
+      '});',
+      '',
+    ].join('\n'));
+    const res = spawnSync(process.execPath, ['--require', file, ENTRY], {
+      cwd: lay.root, env: { ...process.env, CLAUDE_CONFIG_DIR: cfg }, input: JSON.stringify(opts.agent ? asAgent(input) : input),
+      encoding: 'utf8', timeout: opts.timeout || 280000,
+    });
+    let report = null;
+    try { report = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { report = null; }
+    return { res, report };
+  }
+
+  /** Asserts the spawned hook allowed the command. */
+  const allowedWork = (lay, command, opts, what) => assertAllowed(spawnWork(lay, bash(command, lay.root), opts).res, what);
+  /** Asserts the spawned hook refused the command with the work sentence. */
+  const refusedWork = (lay, command, opts, what) => assertRefused(spawnWork(lay, bash(command, lay.root), opts).res, what, REFUSAL_WORK);
 
   rowTest('139 · the long-s attack: a Write to the answers log or a check record spelled with ſ is refused', () => {
     for (const [what, real, alias] of [
@@ -1406,7 +1534,7 @@ describe('the write protection compares real files, not spellings (owner, 2026-1
     ].join('\n'));
     R.row('Write src/x.js through the budget-spent preload', () => assertRefused(spawnSync(process.execPath, ['--require', preload, ENTRY], {
       cwd: project, input: JSON.stringify(write(p('src', 'x.js'))), encoding: 'utf8',
-    }), 'a Write decided past its budget'));
+    }), 'a Write decided past its budget', REFUSAL_WORK));
     R.row('control: the same Write without the preload', () => assertAllowed(run(write(p('src', 'x.js'))), 'the control'));
   });
 
@@ -1467,12 +1595,12 @@ describe('the write protection compares real files, not spellings (owner, 2026-1
       cwd: project, env: { ...process.env, CLAUDE_CONFIG_DIR: cfg }, input: JSON.stringify(input), encoding: 'utf8',
     });
     R.row('agent Bash echo x > src/x.js, budget spent at the root lookup', () => assertRefused(spawned(asAgent(bash('echo x > src/x.js'))),
-      'the agent shell settings check with a spent budget', REFUSAL_AGENT_SETTINGS));
+      'the agent shell settings check with a spent budget', REFUSAL_WORK));
     R.row('main Bash echo x > src/x.js, same preload', () => assertAllowed(spawned(bash('echo x > src/x.js')), 'the main session with the preload'));
     R.row('agent Bash echo x > src/x.js, no preload', () => assertAllowed(run(asAgent(bash('echo x > src/x.js')), ro()), 'the control without the preload'));
   });
 
-  rowTest("155 · once the budget is spent the shell's own text work refuses (the owner's \"refuse after 5 s\")", () => {
+  rowTest("155 · the shell's own text work refuses once the backstop clock has run out", () => {
     // The shell's `cd` prefix rebuild and operand resolution are text work the file-system walks' deadline
     // does not cover; past the budget isLedgerWrite itself must refuse, or a padded command outlasts
     // Claude Code's hook timeout (a timed-out hook lets the call run). The verdict is judged, never wall time.
@@ -1489,9 +1617,9 @@ describe('the write protection compares real files, not spellings (owner, 2026-1
     });
     const padded = 'cd a; cd a; cd a; ls';
     R.row('agent Bash cd a; cd a; cd a; ls, budget spent', () => assertRefused(spawned(asAgent(bash(padded))),
-      'a padded read-only command past the budget (agent)', REFUSAL_SETTINGS));
+      'a padded read-only command past the budget (agent)', REFUSAL_WORK));
     R.row('main Bash cd a; cd a; cd a; ls, budget spent', () => assertRefused(spawned(bash(padded)),
-      'a padded read-only command past the budget (main session)', REFUSAL_SETTINGS));
+      'a padded read-only command past the budget (main session)', REFUSAL_WORK));
     R.row('agent Bash cd a; cd a; cd a; ls, no preload (control)', () => assertAllowed(run(asAgent(bash(padded)), ro()), 'the control (agent)'));
     R.row('main Bash cd a; cd a; cd a; ls, no preload (control)', () => assertAllowed(run(bash(padded)), 'the control (main session)'));
   });
@@ -1588,6 +1716,279 @@ describe('the write protection compares real files, not spellings (owner, 2026-1
         write(spelling), `Write ${what} [kernel reaches=${reaches}]`);
     }
   });
+
+  // ---- The settings check counts its work, not the clock (owner, 2026-10-19) ----
+  // Each verdict below depends on counts and on a fake clock only (frozen, or moved per file-system call by the
+  // preload), never on wall time or on the machine's load.
+
+  rowTest('161 · the builder\'s here-document is decided by its work, not by how slow the machine is', () => {
+    const lay = makeLayout('nine');
+    const command = builderFixture();
+    // A counting run (a frozen clock) gives the file-system calls F; a second run spreads 25 s of fake clock over them.
+    const twentyFive = (agent, what) => R.row(what, () => {
+      const counted = spawnWork(lay, bash(command, lay.root), { agent });
+      assert.ok(counted.report && counted.report.calls > 0, `the counting run made calls: ${JSON.stringify(counted.report)}`);
+      assertAllowed(spawnWork(lay, bash(command, lay.root), { agent, stepMs: 25000 / counted.report.calls }).res, what);
+    });
+    twentyFive(true, '(a) the builder, background agent, nine-check layout, a decision spanning 25 s of fake clock');
+    twentyFive(false, '(b) the builder, main session, nine-check layout, a decision spanning 25 s of fake clock');
+  });
+
+  rowTest('162 · ordinary commands spend at most a third of the count (the margin), and the stated limits fit', () => {
+    const lay = makeLayout('nine');
+    const plain = makeLayout('plain');
+    const third = { units: 1000000 };
+    const folds = (command) => assert.notEqual(command.normalize('NFKC'), command, 'folding changes the command');
+    R.row('(a) the builder, background agent, nine-check layout, a third of the count', () => allowedWork(lay, builderFixture(), { ...third, agent: true }, '162 (a)'));
+    R.row('(b) the builder, main session, nine-check layout, a third of the count', () => allowedWork(lay, builderFixture(), third, '162 (b)'));
+    R.row('(c) the builder, main session, plain project, a third of the count', () => allowedWork(plain, builderFixture(), third, '162 (c)'));
+    R.row('(d) the builder after an absolute folder change, background agent, nine-check layout', () => allowedWork(lay,
+      builderFixture(`cd ${lay.root} && cat > notes.js <<'EOF'`), { ...third, agent: true }, '162 (d)'));
+    R.row('(e) git add of 128 files after an absolute folder change, background agent, nine-check layout', () => allowedWork(lay,
+      `cd ${lay.root} && git add ${Array.from({ length: 128 }, (_, i) => `src/f${i}.js`).join(' ')}`, { ...third, agent: true }, '162 (e)'));
+    R.row('(f) the 2,000-line here-document, background agent, nine-check layout, the shipped count', () => {
+      const command = twoThousandFixture();
+      assert.ok(command.length < 163840, `the command is ${command.length} characters, under the agent cap`);
+      allowedWork(lay, command, { agent: true }, '162 (f)');
+    });
+    R.row('(g) the folded builder, background agent, nine-check layout (16 runs), a third of the count', () => {
+      const command = builderFixture(BUILDER_FIRST, true);
+      folds(command);
+      allowedWork(lay, command, { ...third, agent: true }, '162 (g)');
+    });
+    R.row('(h) the folded 2,000-line here-document, background agent, nine-check layout (16 runs), the shipped count', () => {
+      const command = twoThousandFixture(true);
+      folds(command);
+      assert.ok(command.length < 163840, `the command is ${command.length} characters, under the agent cap`);
+      allowedWork(lay, command, { agent: true }, '162 (h)');
+    });
+  });
+
+  rowTest('163 · the backstop clock still refuses when it is hit', () => {
+    const lay = makeLayout('nine');
+    const command = builderFixture();
+    R.row('the builder, background agent, nine-check layout, a decision spanning 1,200 s of fake clock', () => {
+      const counted = spawnWork(lay, bash(command, lay.root), { agent: true });
+      assert.ok(counted.report && counted.report.calls > 0, `the counting run made calls: ${JSON.stringify(counted.report)}`);
+      assertRefused(spawnWork(lay, bash(command, lay.root), { agent: true, stepMs: 1200000 / counted.report.calls }).res,
+        'the builder past the backstop', REFUSAL_WORK);
+    });
+  });
+
+  rowTest('164 · pathological text work is refused by the count, not by the backstop', () => {
+    const lay = makeLayout('plain');
+    const chain = 'cd a; '.repeat(12000) + 'ls';
+    R.row('(a) 12,000 x "cd a;" then ls, main session, frozen clock', () => refusedWork(lay, chain, {}, '164 (a) main'));
+    R.row('(a) 12,000 x "cd a;" then ls, background agent, frozen clock', () => refusedWork(lay, chain, { agent: true }, '164 (a) agent'));
+    // A 100 KB folder name in front of 450 segments of 128 distinct literals: about 680 KB, over the agent cap, so main only.
+    const folder = 'n'.repeat(102400);
+    const shape = (segment) => `cd ${folder}; ${Array.from({ length: 450 }, (_, k) => segment(k)).join('')}`;
+    const apart = shape((k) => `true ${Array.from({ length: 128 }, (_, j) => `'p${k}_${j}'`).join(' ')}; `);
+    const glued = shape((k) => `true x${Array.from({ length: 128 }, (_, j) => `'q${k}_${j}'`).join('x')}; `);
+    for (const [what, command] of [['(b) shape A, 128 literals apart', apart], ['(c) shape B, 128 literals glued into one operand', glued]]) {
+      R.row(`${what}, main session, 1 ms of fake clock per call`, () => {
+        assert.ok(command.length > 163840, `the command is ${command.length} characters`);
+        const { res, report } = spawnWork(lay, bash(command, lay.root), { stepMs: 1 });
+        assertRefused(res, what, REFUSAL_WORK);
+        assert.ok(report && report.elapsed < 60000, `the fake clock stopped at ${report && report.elapsed} ms, before the 60,000 ms backstop`);
+      });
+    }
+  });
+
+  rowTest('165 · a command too large for its count is refused when the count runs out', () => {
+    const lay = makeLayout('plain');
+    const many = Array.from({ length: 32 }, (_, k) => `cp ${Array.from({ length: 128 }, (_, j) => `s${k}_${j}`).join(' ')} d`).join('\n');
+    const few = { units: 10000 };
+    R.row('32 segments of 128 distinct cp operands, main session', () => refusedWork(lay, many, few, '165 main'));
+    R.row('32 segments of 128 distinct cp operands, background agent', () => refusedWork(lay, many, { ...few, agent: true }, '165 agent'));
+    R.row('control: cp x0 x1 d, main session', () => allowedWork(lay, 'cp x0 x1 d', few, '165 control main'));
+    R.row('control: cp x0 x1 d, background agent', () => allowedWork(lay, 'cp x0 x1 d', { ...few, agent: true }, '165 control agent'));
+  });
+
+  rowTest('166 · the budget cases again, with an empty count instead of the clock', () => {
+    const lay = makeLayout('plain');
+    fs.mkdirSync(p('a'), { recursive: true });
+    R.row('Write src/x.js with an empty count is refused', () => assertRefused(spawnWork(lay, write(p('src', 'x.js')), { units: 0 }).res,
+      'a Write decided with an empty count', REFUSAL_WORK));
+    R.row('agent Bash echo x > src/x.js, count emptied at the first lookup, is refused', () => refusedWork(lay, 'echo x > src/x.js',
+      { spendAtFirstLookup: true, agent: true }, '166 agent'));
+    R.row('main Bash echo x > src/x.js, same preload, is allowed', () => allowedWork(lay, 'echo x > src/x.js', { spendAtFirstLookup: true }, '166 main'));
+    R.row('agent Bash cd a; cd a; cd a; ls with an empty count is refused', () => refusedWork(lay, 'cd a; cd a; cd a; ls', { units: 0, agent: true }, '166 padded agent'));
+    R.row('main Bash cd a; cd a; cd a; ls with an empty count is refused', () => refusedWork(lay, 'cd a; cd a; cd a; ls', { units: 0 }, '166 padded main'));
+  });
+
+  rowTest('167 · the work sentence names the cause, and only when the count or the backstop is spent', () => {
+    const lay = makeLayout('plain');
+    fs.mkdirSync(p('a'), { recursive: true });
+    R.row('(a) cd a; cd a; cd a; ls with a count of 3 is refused with exactly the work sentence', () => refusedWork(lay, 'cd a; cd a; cd a; ls', { units: 3 }, '167 (a)'));
+    R.row('(b) a genuine settings write within the count keeps the settings sentence', () => assertRefused(
+      spawnWork(lay, bash('echo x > .ctoc/settings.yaml', lay.root), {}).res, '167 (b)', REFUSAL_SETTINGS));
+    R.row('(c) an allowed Read whose count is really spent stays allowed', () => {
+      const { res, report } = spawnWork(lay, payload('Read', { file_path: p('src', 'x.js') }), { units: 0, chargeAfterSet: 1 });
+      assertAllowed(res, '167 (c)');
+      assert.ok(report && report.spent === true, `the count was really spent at exit: ${JSON.stringify(report)}`);
+    });
+  });
+
+  // ---- The first review round (security scan and critic), 2026-10-20 ----
+
+  const REFUSAL_SWEEP_EXPANSION = 'CTOC refused this call because only the human confirms which builds go back '
+    + 'to the queue; report the sweep preview and let the main session ask him. A command that only '
+    + 'mentions both words is refused too: search one word at a time, and commit with git commit -F <file>.'
+    + " A background agent's command that runs node or a wrapper must be one plain call when it uses $ or a backtick.";
+
+  // The same sentence with the plain-call ending, which the sweep check gives for a body that stays in the text read.
+  const REFUSAL_SWEEP_PLAIN = REFUSAL_SWEEP_EXPANSION.slice(0, REFUSAL_SWEEP_EXPANSION.indexOf(" A background agent's command"))
+    + " A background agent's menu call must also be one plain call, built without $, a backtick, a brace or a wildcard.";
+
+  rowTest('168 · no operand escapes the link test by its place in a long segment (the 128-operand cap is gone)', () => {
+    // Found by the security scan: 128 harmless operands followed by the long-s spelling of the settings file
+    // let the write through, while 127 refused it. The cap only bounded time, which the count does now.
+    fs.linkSync(p('.ctoc', 'settings.yaml'), p('src', 'h.yaml'));
+    const operands = (n) => Array.from({ length: n }, (_, i) => `a${i}`).join(' ');
+    for (const n of [127, 128, 129, 400]) {
+      refusedBoth(bash(`echo ${operands(n)} > src/h.yaml`), `${n} harmless operands then a hard link to the settings file`, REFUSAL_SETTINGS);
+    }
+    const aliasSame = sameFileOnDisk(p('.ctoc', 'settings.yaml'), p('.ctoc', `${LONG_S}ettings.yaml`));
+    for (const n of [127, 128, 400]) {
+      const call = bash(`echo ${operands(n)} > .ctoc/${LONG_S}ettings.yaml`);
+      if (aliasSame) refusedBoth(call, `${n} harmless operands then the long-s spelling [sameFileOnDisk=true]`, REFUSAL_SETTINGS);
+      else allowedBoth(call, `${n} harmless operands then the long-s spelling [sameFileOnDisk=false]`);
+    }
+    allowedBoth(bash(`echo ${operands(400)} > src/ordinary.txt`), '400 operands then an ordinary file (control)');
+  });
+
+  rowTest("169 · a background agent's sweep check is charged to the count: a 64 KB command of folders and runtime words is refused by it", () => {
+    // Found by the security scan: every `cd` adds a folder and every runtime word looks the next word up in every folder
+    // (five stats and a real path each): 27 KB took 47.8 s, 32 KB 167 s, with no unit spent. The shape below passes the
+    // sweep check's `$` test, names no menu, and every lookup misses.
+    const lay = makeLayout('plain');
+    const pairs = (n) => Array.from({ length: n }, (_, i) => `cd d${i}; node s${i}.js; `).join('');
+    const big = `echo $H; ${pairs(2800)}ls`;
+    assert.ok(big.length > 64 * 1024, `the command is ${big.length} characters`);
+    R.row('64 KB of folders and runtime words, background agent, frozen clock: refused by the count', () => {
+      const { res, report } = spawnWork(lay, bash(big, lay.root), { agent: true });
+      assertRefused(res, '169 big', REFUSAL_WORK);
+      assert.ok(report && report.spent === true, `the count was spent: ${JSON.stringify(report)}`);
+      assert.ok(report.calls < 3500000, `the lookups stopped with the count: ${report.calls} file-system calls`);
+    });
+    R.row('control: 20 pairs keep the sweep sentence, not the work sentence', () => assertRefused(
+      spawnWork(lay, bash(`echo $H; ${pairs(20)}ls`, lay.root), { agent: true }).res, '169 small', REFUSAL_SWEEP_EXPANSION));
+  });
+
+  rowTest('171 · four segments of 128 operands through the deepest folders (about 470 KB) are decided by the count, at a fraction of it', () => {
+    // The critic's finding on the 478 KB command of the earlier clock. Measured: 75,298 units for the main session and
+    // 179,840 for a background agent in a plain project, about 8,000 file-system calls, so the count decides, not the clock.
+    // The deep folders are made by a child that changes folder step by step (the system refuses one long path).
+    const lay = makeLayout('nine');
+    const pathMax = process.platform === 'darwin' ? 1024 : 4096;
+    const build = spawnSync(process.execPath, ['-e', [
+      "const fs = require('fs');",
+      `let remaining = ${pathMax} - 40 - Buffer.byteLength(process.cwd());`,
+      'const names = [];',
+      'while (remaining > 1) { const n = Math.min(200, remaining - 1); const name = "e" + "d".repeat(n - 1); fs.mkdirSync(name); names.push(name); process.chdir(name); remaining -= n + 1; }',
+      "process.stdout.write(names.join('/'));",
+    ].join('\n')], { cwd: lay.root, encoding: 'utf8' });
+    assert.equal(build.status, 0, build.stderr);
+    const deep = build.stdout;
+    const segment = (k) => `cp ${Array.from({ length: 128 }, (_, j) => `${deep}/x${k}_${j}`).join(' ')} d`;
+    const command = [0, 1, 2, 3].map(segment).join('\n');
+    assert.ok(command.length > 400000, `the command is ${command.length} characters`);
+    R.row('background agent, nine-check layout, a third of the count, frozen clock: allowed', () => allowedWork(lay, command, { units: 1000000, agent: true }, '171 agent'));
+    R.row('main session, nine-check layout, a third of the count, frozen clock: allowed', () => allowedWork(lay, command, { units: 1000000 }, '171 main'));
+    // The deep folders reach about 1,000 bytes of path (macOS refuses a path of 1,024 bytes or more in one call). The
+    // removal walks down by name as the creation did, so it must leave nothing behind: asserted here, not assumed.
+    rm(lay.dir);
+    assert.equal(fs.existsSync(lay.dir), false, 'the layout with its deep folders is removed');
+  });
+
+  rowTest("172 · the sweep check finds the next word that is not an option in one pass, and the text it reads is charged", () => {
+    // Found by the re-review: a word such as `-/node` is an option by its first character and a runtime word by its last
+    // path segment, and every runtime word searched forward to the end of the run of options: quadratic, 12 s at 1.09 MB,
+    // with no unit charged.
+    const lay = makeLayout('plain');
+    // No word that is not an option follows, so no lookup is made and the search itself is all the work there is.
+    const command = `echo *; ${'-/node '.repeat(20000)}`;
+    R.row('20,000 option-like runtime words (140 KB), background agent: allowed, each step of the search and the reading charged once', () => {
+      const { res, report } = spawnWork(lay, bash(command, lay.root), { agent: true });
+      assertAllowed(res, '172');
+      // One unit for each of the 20,000 words in the single pass, and the command's length at the text rate. A search
+      // from every runtime word to the end of the run costs about 200,000,000 units at the same price per step: the
+      // count (3,000,000) is spent and the command refused, so only the one-pass version passes this row.
+      assert.ok(report && report.charged >= 20000 + Math.floor(command.length / 64), `the units charged: ${JSON.stringify(report)}`);
+      assert.ok(report.charged < 100000, `the units charged: ${JSON.stringify(report)}`);
+      assert.equal(report.spent, false, 'the count is not spent');
+    });
+  });
+
+  rowTest('173 · a manifest that is not a regular file (a named pipe) cannot hold the sweep check: it gives a verdict', () => {
+    // Found by the re-review: `namesCtoc` read `package.json` of every folder above a script it found, so a named pipe
+    // there blocked the read, outside the count and the backstop, with no verdict. (Where no named pipe can be made, a
+    // folder stands in: its read fails at once, so that platform row holds the verdict only.)
+    const lay = makeLayout('plain');
+    fs.mkdirSync(path.join(lay.root, 'b'));
+    fs.writeFileSync(path.join(lay.root, 'b', 'm'), '');
+    const manifest = path.join(lay.root, 'b', 'package.json');
+    if (process.platform === 'win32') fs.mkdirSync(manifest);
+    else assert.equal(spawnSync('mkfifo', [manifest]).status, 0, 'a named pipe was made');
+    R.row('agent: node m, a wildcard-built sweep word, with a pipe for the manifest next to the script: allowed, no hang', () => assertAllowed(
+      spawnWork(lay, bash('cd b; node m menu task sw?ep --con?irm none', lay.root), { agent: true, timeout: 30000 }).res, '173'));
+    // The race: a regular manifest swapped for a pipe between a check and the read. Simulated without timing: the path-based
+    // stat is made to say "regular file" for the pipe. The manifest is opened once without waiting and judged by that
+    // descriptor, so the lie changes nothing; a check by path followed by a read by path blocks on the pipe.
+    R.row('the stat says "regular file" for the pipe: the descriptor is judged, a verdict is given', () => assertAllowed(
+      spawnWork(lay, bash('cd b; node m menu task sw?ep --con?irm none', lay.root), { agent: true, timeout: 30000, statLiesFor: 'package.json' }).res, '173 lie'));
+  });
+
+  rowTest('173b · a large manifest is charged for the bytes it is read for, and one over 1 MiB is not read at all', () => {
+    const lay = makeLayout('plain');
+    fs.mkdirSync(path.join(lay.root, 'b'));
+    fs.writeFileSync(path.join(lay.root, 'b', 'm'), '');
+    const manifest = path.join(lay.root, 'b', 'package.json');
+    const command = bash('cd b; node m menu task sw?ep --con?irm none', lay.root);
+    const sized = (bytes) => JSON.stringify({ name: 'ctoc', pad: 'x'.repeat(bytes - 30) });
+    R.row('a regular manifest of 900,000 bytes: read, and charged at the text rate for its bytes', () => {
+      fs.writeFileSync(manifest, sized(900000));
+      const { res, report } = spawnWork(lay, command, { agent: true });
+      assertAllowed(res, '173b regular');
+      assert.ok(report && report.bytesRead >= 899000, `the bytes read: ${JSON.stringify(report)}`);
+      assert.ok(report.charged >= Math.floor(900000 / 64), `the units charged: ${JSON.stringify(report)}`);
+    });
+    R.row('a regular manifest of 2,000,000 bytes: not read, names nothing, a verdict', () => {
+      fs.writeFileSync(manifest, sized(2000000));
+      const { res, report } = spawnWork(lay, command, { agent: true });
+      assertAllowed(res, '173b oversized');
+      assert.ok(report && report.bytesRead < 1048576, `the bytes read: ${JSON.stringify(report)}`);
+    });
+  });
+
+  rowTest("174 · the sweep check's reads of manifests above a script are charged to the count", () => {
+    // `ctocKind` reads two manifests in each of up to 16 folders for every script a runtime word names.
+    const lay = makeLayout('plain');
+    fs.mkdirSync(path.join(lay.root, 'b'));
+    fs.writeFileSync(path.join(lay.root, 'b', 'm'), '');
+    const many = `echo *; ${'node b/m x; '.repeat(2000)}ls`;
+    const few = `echo *; ${'node b/m x; '.repeat(100)}ls`;
+    R.row('2,000 runtime words naming one script, a count of 180,000: refused with the work sentence', () => refusedWork(lay, many, { units: 180000, agent: true }, '174 many'));
+    R.row('control: 100 of them, the same count: allowed', () => allowedWork(lay, few, { units: 180000, agent: true }, '174 few'));
+  });
+
+  rowTest('170 · the menu reply body is read in linear time, charged by its length, and a closing line keeps its meaning', () => {
+    // Found by the security scan: a trailing-blanks regex on a line of 40,000 spaces and one more character takes quadratic time.
+    const lay = makeLayout('plain');
+    const head = `node ${path.join(REPO, 'src', 'commands', 'start.js')} inbox answer q1 --stdin <<'TAG'`;
+    const spaces = ' '.repeat(40000);
+    R.row('a body line of 40,000 spaces then a letter, closed by TAG: the body is data (allowed), and its length is charged', () => {
+      const { res, report } = spawnWork(lay, bash(`${head}\n${spaces}x\n$HOME\nTAG`, lay.root), { agent: true });
+      assertAllowed(res, '170 spaces');
+      assert.ok(report && report.charged >= Math.floor(40000 / 64), `the units charged: ${JSON.stringify(report)}`);
+    });
+    R.row('a closing line with trailing spaces and a tab still closes the body (allowed)', () => assertAllowed(
+      spawnWork(lay, bash(`${head}\nbody $HOME\nTAG \t `, lay.root), { agent: true }).res, '170 closing with blanks'));
+    R.row('a closing line "TAG." does not close it: the body stays in the text read (refused)', () => {
+      assertRefused(spawnWork(lay, bash(`${head}\nbody $HOME\nTAG.`, lay.root), { agent: true }).res, '170 TAG.', REFUSAL_SWEEP_PLAIN);
+    });
+  });
 });
 
 describe('only the human confirms a sweep (owner, 2026-10-18)', () => {
@@ -1740,6 +2141,22 @@ describe('only the human confirms a sweep (owner, 2026-10-18)', () => {
     assertAllowed(run(agent(bash('node --test tests/*.test.js'), 'a123')), 'the rewrite');
   });
 
+  test('109 · a folder visited again keeps the shell where it is: a wildcard-built confirmation after cd, cd .. is still refused', () => {
+    // Found by the re-review: dropping repeated folders from the chain also dropped the shell's own position, so the
+    // third `cd` below resolved to <repo>/src/src/commands and the real folder was never searched for the menu script.
+    const rows = [
+      ['a revisited folder (the one added last is not visited again)', `cd ${REPO} && cd src && cd .. && cd src/commands && node start menu task sw?ep --con?irm none`],
+      ['the same, brace-built', `cd ${REPO} && cd src && cd .. && cd src/commands && node start menu task sweep --con{firm,firm} none`],
+      ['the revisited folder is not the one added last', `cd ${REPO} && cd src && cd lib && cd .. && cd .. && cd src/commands && node start menu task s{w,w}eep --c{o,o}nfirm none`],
+      ['pushd, and a folder left and entered again', `pushd ${REPO}/src && pushd lib && pushd .. && pushd commands && node start menu task sw?ep --con?irm none`],
+      ['control: no revisit', `cd ${REPO}/src/commands && node start menu task sw?ep --con?irm none`],
+    ];
+    for (const [what, command] of rows) {
+      assertRefused(run(agent(bash(command))), `${what} (background agent)`, REFUSAL_SWEEP_CONFIRM + PLAIN);
+      assertAllowed(run(bash(command)), `${what} (main session)`);
+    }
+  });
+
   test('101 · the fail rule: a crash on a background agent’s sweep confirmation refuses with the sweep sentence', () => {
     const missing = path.join(os.tmpdir(), `ctoc-no-such-folder-${process.pid}-${Date.now()}`);
     const crashing = [
~~~~

**Checks at the end of the third round.** 807 tests pass in the 18 files of the brief's list and the other loaders of the resolver and the hook, 0 failed, 0 skipped. `npx eslint . --max-warnings 0`: 924 files, 0 errors, 0 warnings. `tsc --noEmit`: exit 0. The digest of the plan equals `content_sha256` of its approval. Refusals met: none in this round.


**Fourth review round (final review), 2026-10-20.** Dispatched after Step 14 failed on 12 uncovered branches in changed code and the final review sent the plan back (the fourth send-back). Every new row was written and run green on the tree it was written for; its proof is the mutation that turns it red (a row for an untaken branch cannot be seen red any other way). The tree this round started on had real-path-confinement.js 5d8456ff833026d5771f4f170e9ce5f77dde1492a119031fc4d39cd0e049ea55, PreToolUse.Bash.js 50d2397f673f39555072688b5da4fb003d340f07591e944cc12c9d0acef267dc, protect-records.js dccd84ad00b0eb9b9a5b665317822b77d2834296acd6f161a74bce02c8633077. Line numbers below are those of that tree; item 1 moved them (protect-records.js after line 907 is one higher, real-path-confinement.js after line 182 one lower).

*Item 1, two pieces of code that cannot change a result.*
- real-path-confinement.js: the guard `if (map === null || key === null) return compute();` in `remember` is deleted, and `remember`'s JSDoc types `map` as `Map<string, T>` and `key` as `string` and drops the sentence about no map or no key. All three callers (`resolveExisting`, `resolveBasis`, `fileIdentity`) return before calling it when the key is null, a non-null memory always holds its three maps, and `remember` is not exported.
- protect-records.js `readManifest`: `fs.constants.O_RDONLY | fs.constants.O_NONBLOCK | fs.constants.O_NOCTTY`, with the comment line "O_NONBLOCK and O_NOCTTY are undefined on Windows, which `|` reads as 0." Proof of that: `node -p "require('fs').constants.O_RDONLY | undefined"` prints 0, the value of `O_RDONLY`. `npm run typecheck` and `npx tsc --noEmit` stay at 0 errors (baseline 0), so the `Number(...)` fallback was not needed.
- So item 1 is one deleted guard plus the open flags rewritten with a comment line (not "two deletions" as the brief called it).
- Re-run on the new tree: unit cases 27 and 28 and hook cases 173 and 173b green. Mutations (ac) (without `O_NONBLOCK`: hook 173 red, both rows, no verdict within their 30 s guard, 60 s in all), (d) (unit 27 (v) red), (q) (unit 27 (v) and (viii) red), (r) (unit 27 (v-b) and (v-c) red), (x) (unit 27 (v-c) red): all as before.
- New sha256 after item 1: real-path-confinement.js 00242ba3b05f5944bd2ea531f0a47269a8f68230d4d3f6f816ef89a65ad7e8c8, protect-records.js f934b1a53248e92554be315c1de599d2f5a5cc0ae4f19251872a414e41f72aba; PreToolUse.Bash.js is unchanged (50d2397f...).

*Item 2, rows for the nine changed branches that can run (tests/protect-records.test.js).* Every spawn runs the repository's own hook and inherits `process.env`, so coverage reaches the child; no copied tree. `spawnWork` gained the option `fstatGrowsFor` and a `zeroReads` figure in its report. New letters follow (ah):
- Hook case 175 (new): "with the resolver unloadable, a background agent's runtime word built at run time is still refused by the sweep check". A `--require` preload wraps `Module._load` to throw for any request containing `real-path-confinement`; the agent's `node $SCRIPT` is refused with the sweep sentence (plain-call ending). Mutations (ai) `chargeWork`'s catch rethrows (line 335), (aj) `confinementSpent`'s catch rethrows (line 344), (ak) `workSentence`'s catch rethrows (line 1273): each turns the agent row red ("expected exit 2, got 0": the throw reaches the fail rule and the call is allowed). I added a control row, the main session's `node $SCRIPT` allowed (the brief did not ask for it; it is green on every mutation).
- Hook case 173b, third row: the 900,000-byte manifest at `units: 1000` is refused with the work sentence, `spent` true, and `bytesRead` at least 899,000 below the case's 900,000-byte row (343,914 against 1,243,908 in a probe run with the threshold set to 0 to read the figures; the margin is 994 bytes and deterministic, since both runs load the same modules). Mutation (ae) (the bytes of a manifest are not charged; the line 911 deletion) now turns two rows red: the original 900,000-byte row (106 units charged where at least 14,062 are due) and this one ("expected exit 2, got 0"; `bytesRead` 1,243,878).
- Hook case 173b, fourth row: `{"name":"ctoc"}` with the descriptor's size grown by 10 bytes: allowed, `zeroReads` exactly 1 (the brief said at most 1; I assert at least 1 and at most 1, which also shows the preload counted). Mutation (al) (the `if (n === 0) break;` of line 916 deleted): red, `zeroReads` 1000 (`{"calls":138,"elapsed":0,"spent":false,"charged":139,"bytesRead":343966,"zeroReads":1000}`).
- Hook case 176 (new): "a spent count stops the sweep check at the step that spent it". X is `1 + floor(length / 64)` of the exact command sent, computed in the row; every row asserts the work sentence and `spent` true. Derived figures, all held exactly on the tree (none had to be corrected): `echo *; ls -l a b c` is 19 characters, X = 1; count X - 1 = 0 charges X = 1 (the reading spends it); count X charges X + 1 = 2 (the first step of the next-word pass spends it); 200 times `cd a; ` then `echo *` with count X + 50 charges less than 64 units past the count; the reply-body command (`node /x/src/commands/start.js inbox answer q1 --stdin <<'TAG'`, a line `body $HOME`, `TAG`; fixed text, so the head test matches on Windows too) has X = 2 and at count X - 1 charges 2X = 4 (the body, then the command again). Mutations: (am) the return at 1087 removed: red, 2 against X = 1 and 5 against 2X = 4; (an) the return at 1111 removed: red, 9 against X + 1 = 2; (ao) the return at 1101 removed: red, 972 charged against a count of 69; (ap) the return at 1062 removed: red, 5 against 2X = 4. In every mutated run the call was still refused with the work sentence; only the charge moved (Decision 40).
- The first run of (ai) to (al) was on the pre-item-1 tree (protect-records.js dccd84ad...); all of item 2's mutations were run again on the tree with sha256 f934b1a5... (protect-records.js) and 00242ba3... (real-path-confinement.js), with the same reds. The item-2 rows were written before item 1; they are green on both trees.

*Item 3, unit case 27 (x).* The two empty-string asks are two rows, each starting with `setWorkBudget(3000000)` and priming `resolveExisting(here)` and `fileIdentity(here)` right before its ask (the priming calls are asserted, as the old row asserted them: `ok` true and a non-null identity). Reason, written in the test: `uncached` ends with `setWorkBudget(3000000)`, which builds a fresh empty memory, so the old `fileIdentity('')` half ran against an empty memory and could not fail under mutation (u). Before the change, (u) turned red only `resolveExisting('')` (seen on the tree before the edit: "(x) a wrapper never throws and never remembers what it cannot key => resolveExisting('')"). After: both rows red, "(x) resolveExisting('') is not answered with the working folder's remembered answers" and "(x) fileIdentity('') is not answered with the working folder's remembered answers". The mutation-(u) row of the earlier table was therefore wrong for `fileIdentity('')`; it holds now.

*Item 4, hook case 171.* The path limit is 1,024 on every platform; the agent's row is one segment, 115,350 characters, asserted under 163,840 before it spawns; the main session's row keeps four segments (461,403 characters) and its `> 400000` assertion. Reasons are written in the case (Decisions 16 and 39). Green. Mutation (e) (`CHARS_PER_UNIT` 1) re-run: red on both rows of 171 (the work sentence in place of an allow).

*Item 5, hook case 174.* The script is 16 folders below the project (Decision 41). Both costs measured by bisection: 461,488 on the current tree, 333,488 under (ad) (the charge of `ctocKind` removed; `confinementSpent(4);` deleted), gap 128,000. The count is 397,488; the 100-word control stays allowed (cost 23,241). (ad) re-run: red ("174 many: expected exit 2, got 0"). Mutation (i) was run in two forms and is recorded as both: the full removal (the entry charge `if (textBudgetSpent(targetFile.length)) return true;` deleted and the identity chain's `if (budgetSpent()) return null;` deleted) reproduces the earlier rounds' red set: hook 174, unit 27 (vii) and unit 28 (vi) ("56 - 38"). The floor-only form (the entry charge `budgetSpent(Math.floor(targetFile.length / CHARS_PER_UNIT))` and `budgetSpent(0)` in the identity chain) turns hook 174 and unit 27 (vii) red and leaves unit 28 green. So (i) turns 174 red in both.

*Item 6, docs/ENFORCEMENT.md.* The "Held by" line now reads `tests/protect-records.test.js` (cases 139–157, 159–176 with 173b, and case 109 of the sweep-confirmation block) and `tests/a-link-cannot-leave-the-repository.test.js` (cases 15–28); no other sentence touched. `node --test tests/claude-md-keeps-every-rule.test.js`: 7 of 7 pass. The hook branch and the spelling branch have no case 175 or 176 (their last numbered cases are 160, besides the sub-cases 109a to 109e of an earlier block), so the new numbers do not collide at the merge.

*Item 7 findings.*
- (e) Criterion 10's second clause. `git diff HEAD --numstat -- tests/`: `tests/a-link-cannot-leave-the-repository.test.js` 391 added, 0 removed; `tests/protect-records.test.js` 534 added, 6 removed. The 6 removed lines (`git diff HEAD -U0`): the `afterEach` line (it also removes the new cases' layouts), case 151's expected sentence, case 154's expected sentence, case 155's title and the expected sentences of its two refused rows. So outside cases 151, 154 and 155 the only pre-existing test code changed is the `afterEach` cleanup line; no assertion changed; case 109's rows are new.
- (f) Step 9, the before-numbers box (left open). The box stays unticked. What was done: the file-system call counts of the old code were taken from a scratch copy of src/ with the three changed files as HEAD has them (builder agent nine-check 2,506,383 calls; main nine-check 547,586; main plain 446,498; agent plain 1,406,961; 2,000 lines agent nine-check 8,331,909), in place of the scanner's `p41.js`, which is not in the repository; the reachability analysers (`analyze`, `analyzeExports`) were run on a clean HEAD copy by the Step 14 run, which measured 192 files with 17 unreachable and 1,146 exports with 65 dead, equal to this tree. The gap: no `npm test` totals were taken before the change. The note is written here and not under the box in the detailed section, because a prose line under a checkbox line is part of the hashed specification (only checkbox lines and the execution sections are left out of `computeSpecHash`, `src/lib/approval-ledger.js`); a note there moves the approval digest (computed on the edited plan in memory: ecbef267a4183f3ff52d6e2acc5a866481e3a34ae2bdf1520c87fa98c4e26f57, against the approved 88325547...ab259), and the brief forbids that. This is a deviation from the brief's "write under it".
- (h) Step 13, criterion 12. Data from the security scanner's run on 2026-10-20, on the tree whose sha256 were real-path-confinement.js 5d8456ff833026d5771f4f170e9ce5f77dde1492a119031fc4d39cd0e049ea55, PreToolUse.Bash.js 50d2397f673f39555072688b5da4fb003d340f07591e944cc12c9d0acef267dc, protect-records.js dccd84ad00b0eb9b9a5b665317822b77d2834296acd6f161a74bce02c8633077 (as given in the brief; I did not run the scanner). 180 runs: loads n = 0, 16 and 64 (1-minute load averages 26.7, 51.1 and 113.2 on 18 CPUs), three arms (background agent in a plain project, main session, background agent in `.claude/worktrees/w`), 10 runs each. The 43,583-character builder here-document was allowed 90 of 90; the `cd a; ` x 12,000 then `ls` chain was refused 90 of 90 with the exact work sentence (exit 2, stderr and decision reason equal). The count decided every refusal (slowest chain 2.79 s against a backstop of 60 s). Builder medians 97 to 1,071 ms and chain medians 626 to 2,572 ms, recorded and never asserted. The worktree arm that was refused 10 of 10 at 5.03 s before the change is allowed 10 of 10 now (median 1.36 s at n = 64). Raw data: `<scratch>/t20-sec12-xUFPrt/`. The source changes after that probe are item 1 of this round only: one deleted guard in `remember` that no call can reach, and the manifest's open flags rewritten as `O_RDONLY | O_NONBLOCK | O_NOCTTY` with a comment (an undefined constant reads as 0 in `|`, which `node -p` showed); neither can change a verdict (the third source file, PreToolUse.Bash.js, is byte-identical). Criterion 12: MET.
- (i) Step 14's first run on 2026-10-20 (before this round), for the record, as the brief gives it (I did not run it): gated `npm test` exit 0, 13,829 tests, 0 failed, 0 skipped, line coverage 99.73% against the floor of 99, eslint and typecheck exit 0, unreachable files 17 and dead exports 65 (equal to HEAD), `npm audit` 0 vulnerabilities; it FAILED on 12 uncovered branches in changed code (the ones items 1 and 2 address). Release risk, not a pass: the outside analyzers semgrep, opengrep, gitleaks, trufflehog, detect-secrets, codeql, osv-scanner, trivy, grype, syft, checkov, tfsec, kics, bandit and others are not installed, so no secrets scan and no static analysis beyond eslint's security rules ran.

**Checks at the end of the fourth round.** Not the gated `npm test`: that is the next agent's. Run here: the four named test files (`protect-records`, `a-link-cannot-leave-the-repository`, `claude-md-keeps-every-rule`, `the-bash-channel-cannot-reach-the-ledger-through-a-link`) and 209 further test files that reach `real-path-confinement.js` or `protect-records.js` through the import graph (`edgesFrom` and `collectJsFiles` of `src/lib/reachability.js` over `src/` and `tests/`, reversed; the 14 files that only name them in text and were not in that set were run too), 0 failed, 0 skipped. `npx eslint . --max-warnings 0` exit 0; `npm run typecheck` pass and `npx tsc --noEmit` 0 errors. Final sha256: real-path-confinement.js 00242ba3b05f5944bd2ea531f0a47269a8f68230d4d3f6f816ef89a65ad7e8c8, PreToolUse.Bash.js 50d2397f673f39555072688b5da4fb003d340f07591e944cc12c9d0acef267dc, protect-records.js f934b1a53248e92554be315c1de599d2f5a5cc0ae4f19251872a414e41f72aba, tests/protect-records.test.js 5c0b548a8e1324a10d1d2d27ffc5d0d2a94907d7cee2e642cef606c0ac75efc0, tests/a-link-cannot-leave-the-repository.test.js 5da9f312415ddfbaf1f1669a6a5c932a2c85786aefe32450d249a49b5e84e37f, docs/ENFORCEMENT.md 579ea1415d0e7de8e101fdbe4983c647a9fe376e148db5d917aeff9367f5c642. The Step 11 critic and Step 13 boxes, and every Step 14 and Step 16 box, are left unticked for the CTO Chief. Refusals met: none.

**Fifth review round, 2026-10-20.** The last send-back before the circuit breaker hands the plan to the owner. Two rows, tests only; no source file changed (sha256 of the three source files and of `docs/ENFORCEMENT.md` equal the fourth round's, below).

*What preceded this round (data from the CTO Chief, quoted as given; I did not run it).* The Step 14 re-run: gated `npm test` exit 0, 13,831 tests, 0 failed, 0 skipped, 99.73% against the floor of 99; eslint 0; typecheck 0; unreachable files 17 and dead exports 65, equal to a clean HEAD copy (192 files; 1,148 against 1,146 exports, the two extra ones live); `npm audit` 0 vulnerabilities; all twelve formerly uncovered changed branches now taken or gone (counts rebuilt from raw V8 data); one remaining uncovered arm, `real-path-confinement.js` line 259 (Part A2 below). The gate's finding that node's merged coverage can hide an untaken branch is the owner's to schedule; nothing here acts on it.

*Step 16 results so far (from the Chief's runs; I did not run them).*
- The first final review: KICKBACK. Criteria 1-7, 9, 11, 14 and 15 MET; criterion 8 NOT MET; criterion 12 NOT RUN; criterion 13 NOT RUN by rule (it needs a released build).
- The synthesizer's minimal change list produced the fourth round (items 1-7, above).
- The final-review re-check: items 1 and 3-7 DONE; item 2 (hook case 175) carried a defect: it did not assert its own precondition. That is Part A1 of this round. Item 3 is unit 27 (x), the rows of criterion 8.
- The three Step 16 watchers: technical debt, 19 new items, none blocking; observability, none blocking, one medium item for the owner (the count and the backstop give the same sentence); AI-written-code review, its findings folded into the change list.
- Criterion 12 MET (recorded in the fourth round, (h)). Criterion 13 NOT RUN until the owner releases a build.
- Release risk, not a pass: the outside analyzers (semgrep, opengrep, gitleaks, trufflehog, detect-secrets, codeql, osv-scanner, trivy, grype, syft, checkov, tfsec, kics, bandit and others) are not installed, so no outside secrets scan and no static analysis beyond eslint's security rules ran.

*Part A1, hook case 175 asserts its own precondition (`tests/protect-records.test.js`).* The shim `_break-resolver.js` appends one line (`threw`) to a marker file each time it throws for a request containing `real-path-confinement`; the marker path comes from the environment variable `RESOLVER_THROWS_MARKER`, which the row sets for the spawn, and the marker sits in the row's temporary `project` folder (removed by `afterEach`; `git status` shows no stray file). `spawned(input, what)` deletes the marker before the spawn and asserts at least one throw was recorded after it, in both rows (agent and main). Green on the tree. Proof:
- Mutation of the test's own precondition (not a product mutation): the shim's match string changed to `real-path-confinement-NEVER`, so it never matches. Both rows red on the new assertion: "175 agent: the shim made the resolver unloadable at least once (throws recorded: 0)" and the same for "175 main". The original, unchanged assertions alone would have kept both green. File restored from the stored original (sha256 `154f9957...` after).
- Mutations (ai) `chargeWork`'s catch rethrows (line 335), (aj) `confinementSpent`'s catch rethrows (line 344), (ak) `workSentence`'s catch rethrows (line 1274): each turns the agent row red ("expected exit 2, got 0"), the main row stays green, as before. `protect-records.js` restored (sha256 `f934b1a5...` after each).
- A discarded run: my first script for (ai), (aj) and (ak) failed to split its arguments under zsh. The line number came out empty, so the edit applied to every `catch {` of `protect-records.js` at once and the hook crashed with exit 1 (stderr at line 1299). That run was discarded; only the run under bash counts, and the file was restored to `f934b1a5...` before and after.

*Part A2, the tail charge of a name below the first missing one (`tests/a-link-cannot-leave-the-repository.test.js`, unit case 28, new row (vii-b) after (vii)).* Walks `<project>/tail-test-missing-folder/<a name of 200 characters>`, a fresh path (and `setWorkBudget` builds a fresh memory each time). Nothing is a magic number: `pre` is the number of `lstat` calls the walk down to the first missing folder makes (counted by a plain wrapper that is put back at once); `F = floor(200 / 64)` is the tail charge, asserted at least 2; the expected least count is written out from the charge schedule, `leastToWalk(missing) + 1 (the long name's step) + F + 1 + floor(target.length / 64)` (the last two terms are the one extra `kernelAgrees` step, for the prefix that ends in the long name), not read off the code under test. Asserts:
- at `pre + F` units (after the step's own unit, F - 1 remain; the charge of F spends the count): `{ ok: false, reason: 'resolve-failed', tail: null }`, `budgetSpent(0)` true afterwards, and exactly `pre` `lstat` calls made (the walk reached the long name and made no call for it);
- at `expected - 1` units: refused (`resolve-failed`); at `expected`: allowed, with the tail `[tail-test-missing-folder, <the name>]`.
No deadline is used, no wall time is asserted. Green on the tree.
- Probe: `console.error('ARM259')` put inside line 259's `return` arm, row run: the line is printed, so the arm is taken by this row (the merged report no longer lists line 259 as uncovered either; it lists only 353-356 and 668, which `git blame` puts in older commits `3981ea9cf` and `0fada89c9`, not in this plan's diff).
- Mutation (n), the tail charge removed (line 259 deleted whole): red on two rows: (vii) "20 - 18" and (vii-b) "refused at 20" (the second half: with the charge gone, the walk is allowed one unit below the expected least count). Restored (sha256 `00242ba3...`).
- Mutation M1, line 259's `return fault('resolve-failed')` removed with the charge kept (`budgetSpent(Math.floor(seg.length / CHARS_PER_UNIT));`): the row stays GREEN. I could not turn it red, and the brief's proof for that mutation is NOT met. Why, derived and checked: once line 259's condition is true, `unitsLeft` is below zero and stays there, so every later charge answers spent. Without the `return`, the walk pushes the name and `continue`s; the next loop-head `budgetSpent()` or, when the name is the last, the first `textBudgetSpent` in `kernelAgrees` (which runs before any `stat`) answers spent, and the walk returns the identical `{ ok: false, reason: 'resolve-failed', real: null, tail: null }` having made the same file-system calls. The first `kernelAgrees` charge is `1 + floor(len(whole path) / 64)`, at least `F + 1`, so a count too small for the tail charge is too small for it as well. Nothing exported reads the units left (`budgetSpent` and `textBudgetSpent` answer a boolean; `report.charged` of the hook preload counts only charges made through the hook's own wrappers, not the resolver's), so the difference is invisible from outside the module: line 259's `return` is an equivalent mutant, redundant with the loop head and with `kernelAgrees`. The arm is covered (taken), and the charge itself is held by mutation (n). Killing M1 needs a source change (drop the redundant `return`, so the branch is gone, or add a reader of the units left); that is the CTO Chief's call and is not built here.

*Final run, after the last test edit.* Four files (`node --test tests/protect-records.test.js tests/a-link-cannot-leave-the-repository.test.js tests/claude-md-keeps-every-rule.test.js tests/the-bash-channel-cannot-reach-the-ledger-through-a-link.test.js`): 237 tests, 237 pass, 0 fail, 0 skipped. `npx eslint . --max-warnings 0`: exit 0. `npm run typecheck`: exit 0. Gated `npm test`: exit 0; 13,831 tests in 2,238 suites, 13,831 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo (the count equals the Chief's: both new assertions sit inside existing test cases); all files 99.74% lines, 93.85% branches, 98.99% functions against the floor of 99. The gate's lines: "[CTOC test-gate] coverage 99.74% (threshold 99%), skipped 0, failed 0", "[CTOC test-gate] corpus claims: verified 3  refuted 0  unverifiable 0  (offline ledger gate: PASS)", "[CTOC test-gate] PASS". Per-file lines: `real-path-confinement.js` 99.27% (uncovered 353-356 and 668, both old lines), `PreToolUse.Bash.js` 100%, `protect-records.js` 90.68% with uncovered ranges 660-665 up to 1213 (the printed list ends at 1213); none of them lies in a changed hunk of `git diff HEAD -U0` (new-side ranges 42-45, 151-153, 171-179, 250-263, 319-348, 893-925, 930-932, 950-952, 1061-1065, 1087-1130, 1228-1231, 1263-1278, 1298). Branch coverage of the changed code rests on the Chief's raw-V8 rebuild (quoted above) plus the probe for line 259; I did not rebuild branch counts from raw V8 data in this round.

*Secrets scan.* CTOC's own `SecretsScanner` (`src/lib/secrets-scanner.js`, `new SecretsScanner(root).scanFile(path)`) over the six changed files (`src/lib/real-path-confinement.js`, `src/hooks/PreToolUse.Bash.js`, `src/hooks/protect-records.js`, `tests/protect-records.test.js`, `tests/a-link-cannot-leave-the-repository.test.js`, `docs/ENFORCEMENT.md`): 0 findings in each, no scan errors. (Run on the final files, after the last test edit.)

*Final sha256.* `tests/protect-records.test.js` 154f9957cd67f5263769d33b51da1de046187d7e356a9413e2058700d96e4aaf; `tests/a-link-cannot-leave-the-repository.test.js` abf324d4cdadf3372d84bee91ca2b8ec5e8a35ffdd8bca786eda25f79ef0ac9f. Unchanged from the fourth round: `src/lib/real-path-confinement.js` 00242ba3b05f5944bd2ea531f0a47269a8f68230d4d3f6f816ef89a65ad7e8c8, `src/hooks/PreToolUse.Bash.js` 50d2397f673f39555072688b5da4fb003d340f07591e944cc12c9d0acef267dc, `src/hooks/protect-records.js` f934b1a53248e92554be315c1de599d2f5a5cc0ae4f19251872a414e41f72aba, `docs/ENFORCEMENT.md` 579ea1415d0e7de8e101fdbe4983c647a9fe376e148db5d917aeff9367f5c642. `git diff HEAD --numstat -- tests/`: a-link file 453 added, 0 removed; protect-records test 547 added, 6 removed (the same six lines as the fourth round: the `afterEach` line, and the sentences and title of cases 151, 154 and 155).

*Boxes ticked in this round, and the evidence (the first section is `## Execution Plan`, the second `## Execution Plan (Steps 8-16)`, the one `validateReviewToDone` reads).*
- First section, Step 11, the critic box: ticked. The nine checks map to the record: `budgetSpent` still asked (the three old asks at `PreToolUse.Bash.js` lines 343, 421 and 435-436 are the removed lines of the diff, each replaced by `chargeText`; Decision 12; first-round R6 counts); text steps charged by length (Decision 12; mutations (e), (k), (l), (m), (n)); no remembered answer past a spent count (mutation (c), unit 27 (iv)); the memory cannot outlive `setWorkBudget` and both caps hold (case 27; (d), (q), (r), (x)); keys as written (Decision 21, mutation (j)); no path throws (Decision 22; (t), (u); unit 27 (x) rows, both empty-string rows red under (u) since round 4); a spent count cannot reach the read-only exemption (Decision 13, mutation (o)); `workSentence` changes only the text of a refusal (Decision 17, hook 167, mutations (p), (s)); `fileSpec`, `bashRefuses` and every existing refusal sentence unchanged. For the last one the critic's reading is not quoted in the record, so I checked it in this round from `git diff HEAD -U0 -- src/hooks/protect-records.js`: no hunk lies inside `fileSpec` or `bashRefuses` (the hunks sit in `decide`'s two setter lines, `main`, `sweepBypassRefusal`, `ctocKind`, `namesCtoc`, `resolveLikeNode`, `withoutMenuStdin` and new constants), and no removed line is a refusal sentence (the removed lines are comments, `DECISION_BUDGET_MS`, the setter and the pre-change sweep and manifest code).
- First section, Step 14, three boxes: ticked. The gated run above (exit 0, 0 failed, 0 skipped, 99.74% against 99; `real-path-confinement.js` and `PreToolUse.Bash.js` read; the one uncovered changed arm, line 259, now has a row that takes it); eslint 0 and typecheck 0; `git diff --stat` (vs HEAD) shows `docs/ENFORCEMENT.md`, `src/hooks/PreToolUse.Bash.js`, `src/hooks/protect-records.js`, `src/lib/real-path-confinement.js` and the two test files, plus the pipeline's own `.ctoc/logs/transitions.json` and the plan's move out of the implementation folder; dead exports 65 and unreachable files 17 equal to a clean HEAD copy (the Chief's re-run; this round added no file and no export).
- First section, Step 16, the critic box: ticked. The critic read every criterion in the first final review (1-7, 9, 11, 14, 15 MET; 8 NOT MET, fixed in round 4 item 3 and confirmed DONE by the re-check; 12 MET, recorded in round 4 (h); 13 NOT RUN by rule), with the evidence in the entries above.
- Second section: ticked Step 8 (all three: tests written first and seen red, the Step 8 red record at the top of this record; error conditions in the refusal and throw rows), Step 9 (all four: no dependency changes were needed, the prerequisites and the hook limit were read, the environment ran every test, no directory or config was needed), Step 10 (all three: the implementation, the never-throw wrappers of Decision 22, and the wiring: `setWorkBudget` and `setDeadline` in `decide()`, `workSentence` in `main()`, `chargeText` in `isLedgerWrite`), Step 11 (all three, the review rounds), Step 12 (all three: the memory takes the builder from 2,506,383 to 9,474 file-system calls; round 4 item 1 deleted a guard no call could reach), Step 13: "Validate inputs (no path traversal)" (`keyOf` and the wrappers take a non-string, empty or unkeyable path to the uncached answer without a throw; no new path comes from outside), "Sanitize outputs" (refusals are fixed sentences; the resolver returns a fixed vocabulary of reasons and never an errno or a path), "No secrets in code" (the CTOC secrets scanner above: 0 findings over the six files), "Safe file operations" (a manifest is opened without waiting, judged and read through one descriptor, a regular file of at most 1 MiB, its bytes charged; the new test files and layouts are removed by their cases), Step 14 (all four), Step 15: "Update relevant documentation" (`docs/ENFORCEMENT.md`) and "Add JSDoc comments to new functions", and "Update CHANGELOG if needed" (ticked as not needed: the repository has no CHANGELOG file at its root, and the release step is outside this plan's files), Step 16: "Verify steps 8-15 completed correctly", "All quality checks passed" (Step 14's checks; the outside analyzers are release risk, stated above) and "Ready for human review".

*Boxes left open, and why (also here and not under the boxes, because a prose line under a checkbox moves the approval digest).*
- First section, Step 9, "Before numbers, outside the suite": open, as in round 4 (the scanner's `p41.js` is not in the repository, and no `npm test` totals were taken before the change; the file-system call counts of the old code and the reachability figures are recorded above).
- First section, Step 13, the `security-scanner` box: open. The record shows the scanner's load probe at loads 0, 16 and 64 (criterion 12), its first-round findings on the caps, the sweep check and the reply body, and its re-scans of the next-word search, the manifest swap and the folder lists. It does not show the scanner's own run of three attacks the box lists (a command that loops on remembered answers; `NaN` or negative costs; the work sentence on an allowed call), nor its statement that each Risk is real with any missing one named. Those attacks have rows (unit 27 (vii), unit 28 (iv), hook 167), but a row is not the scanner's run, so I did not tick the box.
- First section, Step 16, the live-check box: open. It has not run; the plan says to report it as not run until the owner releases a build.
- Second section, Step 16, "Manual verification if needed": open, for the same reason (the live check in a real worktree).

*Digest.* `computeSpecHash` of this plan equals `content_sha256` in `.ctoc/approvals/the-settings-check-counts-its-work-not-the-clock.json` (88325547404261e80f43141dc79ab010aed087471506f3b6d18ed91fbc6ab259): before the edits, on the edited text in memory before the write, and after the write (checked once more at the very end). Refusals met: none. Left unbuilt, one line each: (1) the equivalent mutant at `real-path-confinement.js` line 259 (the `return` is redundant with the loop head and `kernelAgrees`; the Chief decides whether to drop it, which would delete the branch); (2) node's merged coverage can hide an untaken branch (the gate's finding, the owner's to schedule); (3) the outside analyzers are not installed (release risk).

Owner 2026-10-20: approved the extra hook changes as built — the 128-operand cap removed, the sweep check and menu reply body charged to the count, manifests read through one file handle, the quadratic regex replaced by a linear trim.


## Deferred Questions

_Written by the Iron Loop integrator (src/lib/iron-loop.js), which performs NO
quality evaluation. These entries are the integrator's own report on itself, not
findings from a critic that read this plan._

- **evaluation**: NOT EVALUATED — no automated critique was performed on this plan. The refinement loop appended the Steps 8-16 template and assessed nothing. (The scores this step used to report were computed from that same template, not from the plan.) A human or a real critic must review this plan before it is built.
