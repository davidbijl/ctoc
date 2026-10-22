---
title: "The circuit breaker's old count reader reads every shape the old library read"
created: "2026-10-22"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 16
risk_level: HIGH
---

# The circuit breaker's old count reader reads every shape the old library read

## Problem Statement

Version 6.14.135 ("CTOC runs without installed packages") replaced the `js-yaml` reading of a plan's legacy `kickback_counts:` frontmatter block with a hand-written reader, `legacyCountsFromBlock` in `src/lib/circuit-breaker.js` (lines 167-188). The circuit breaker folds that legacy count with the sidecar count by maximum, so a legacy count that reads LOWER than it is makes a plan escalate to the owner later than it should (the breaker's limits: three send-backs to one step, five per plan). The review and the security pass of 6.14.135 both passed with low findings; these are the findings, from reading the reader and from a differential probe that compared it with the old `js-yaml` reading over hand-built shapes and over every checked-in plan, plus a timing probe at one, two and four times the input size:

1. A blank line or a comment line inside the `kickback_counts:` block drops every count after it (the reader leaves the steps map on any line that is not deeper than `by_step:`).
2. A comment at column 0 inside the block ends the block (`^\S` is read as the next top-level key).
3. A trailing comment on a count line (`total: 3  # x`) and a comment after the block key (`kickback_counts:  # x`) make the line fail to match, so that count reads 0 or the block is never entered.
4. Flow style (`by_step: {"10": 2}`), quoted values, anchored values and hex values (`0x3`) read lower than `js-yaml` read them.
5. An oversized count (more digits than a JavaScript number holds) becomes 0 after normalization instead of escalating.

The owner's fix direction: skip lines matching `/^\s*(#|$)/` before the `^\S` break, strip `\s+#.*$` before matching a line, accept `/^kickback_counts:\s*(#.*)?$/` as the block key, read the shapes `js-yaml` read (or read them at least as high), and map an oversized count (`Infinity`) to `Number.MAX_SAFE_INTEGER` so it escalates rather than becomes 0. The safe direction for a breaker is fixed: a count may read higher than written, never lower.

Three defects in `tests/runs-without-installed-packages.test.js` belong to the same change:

- the polluted-key fixture is vacuous: it carries only `"__proto__": 9`, which a null-prototype map drops anyway; it must also carry `"constructor": 9` so the forbidden-key filter is actually exercised;
- a missing shim output file is read as "no bare requests" (`fs.existsSync(out) ? ... : []`), so a shim that never ran passes; the test must fail when the file is missing (`assert.ok(fs.existsSync(out))`);
- the `after` hook calls `fs.rmSync(tmp, ...)` unconditionally, so a setup error that left `tmp` undefined is masked by a second error; it must be `if (tmp) fs.rmSync(...)`.

### Checked against the code in this refinement

Read, not run: the product owner holds no shell. Files read at version 6.14.135: `src/lib/circuit-breaker.js`, `tests/runs-without-installed-packages.test.js`, the five circuit-breaker test files, and the installed old library's integer and float types (`js-yaml` 4.3.2, a development dependency, `lib/type/int.js` and `lib/type/float.js`). `legacyCountsFromBlock` is at lines 167-188, as the stub says.

- **Finding 1, verified and made precise.** An empty line, or any line (a comment included) that is not indented deeper than `by_step:`, ends the step map: line 183 resets it, and nothing re-opens it. Every step count below such a line is dropped. A `total:` below it is still read, because line 184 does not depend on the step map. A comment or a whitespace-only line indented deeper than `by_step:` is harmless today.
- **Finding 2, verified.** Line 176 ends the block on any line whose first character is not whitespace, a `#` included.
- **Finding 3, verified.** The step pattern (line 179) and the total pattern (line 184) both end in `\s*$`, and line 173 accepts the block key only when nothing but whitespace follows `kickback_counts:`.
- **Finding 4, verified on the reader's side.** Every value pattern is `(\d+)`, and a `by_step:` line holding `{…}` opens a step map with no deeper lines. What the old library read for these shapes comes from the stub's comparison, which ran outside the repository and is not re-run here. For hex, octal, binary and signed integers it also follows from the old library's integer type, read in 4.3.2.
- **Finding 5, verified, and corrected on one point.** The old library did not escalate on an oversized count either. Its integer type refuses a value that does not fit a JavaScript number (`int.js`, line 89), and its float type refuses one too. So it returned the digits as text. `Number` of that text is Infinity, and `normalizeCounts` (lines 113-127) turns any count that is not finite into 0. Mapping it to the largest safe integer raises the reading above what the old library gave. It restores nothing.
- **The forbidden-key fixture, conclusion verified, reason corrected.** On a map made with `Object.create(null)`, `"__proto__"` is an ordinary own key: the reader keeps it, and the forbidden-key filter in `normalizeCounts` drops it. The fixture is vacuous for another reason. The last step of `readKickbackCounts` (lines 361 and 373) copies the counts onto a plain object with `Object.assign`, and assigning a number to `__proto__` on a plain object does nothing. So the assertion passes even with the filter removed. A `constructor` or `prototype` key survives that copy, so only those keys prove the filter works. This comes from reading the code and the language rule, not from a run.
- **The other two test defects, verified.** Line 90 of the no-packages test reads a missing shim file as "no bare requests", and line 112 calls `fs.rmSync(tmp, …)` unguarded.
- **Who reads the legacy count.** `recordKickback` folds it in on every recorded send-back (line 559). `readKickbackCounts` reads it when the plan has no readable kickback counter file. Recording has three live routes, all through `actions.recordStepKickback`: a completion refused before review and a failing verify (`src/lib/actions.js` lines 1492 and 1612), and a review, security or quality round's send-back (`src/lib/menu-screens.js` line 2895). The menu prints the result as "the send-back to Step N was counted: X of a limit of 3 for Step N, Y of a limit of 5 for the plan" (`src/lib/menu-screens.js` line 2829). Search: pattern `readKickbackCounts|recordKickback\(|recordStepKickback\(` over `src/`, 3 files matched. `readKickbackCounts` has no caller under `src/` apart from its own export.
- **Real legacy counters in this repository.** Pattern `^\s*kickback_counts:` over `plans/` matched 16 files. In 14 of them, comparing the line's position with the file's `---` lines puts the counter inside the plan's leading frontmatter. All 14 are in the old writer's shape: a `by_step:` map with single-quoted step keys, then `total:`. The other 2 are examples inside a plan's body, which the breaker never reads: `plans/functional/plan-completion-works-on-a-clean-install.md` line 69 and `plans/done/ctoc-audit-w05-s5-circuit-breaker.md` line 70. So, by reading, none of the five findings changes the count of any plan in this repository today. They affect a counter that a person or an agent edits by hand.

## Business Alignment

**Job to Be Done:** When a plan whose frontmatter still carries an old send-back count is sent back again, I want that count read in full however the counter is written, so I can be told on the send-back that crosses the limit of three per step or five per plan, not on a later one or never.

**Impact Map:**
- **Goal:** The circuit breaker's promise holds: three send-backs to one step, five per plan, then the owner is told. The review findings on "CTOC runs without installed packages" (6.14.135) are filed and fixed through CTOC instead of worked around. This is the vision's ruling that every friction found while building CTOC with CTOC becomes a plan, with each fix proven by a test that drives the real route.
- **Actor:** The owner, Tijn van der Zant, who receives the escalation. Also the maintainers who rely on the no-packages check: the CTO Chief and the background agents that build for him. Both groups are the vision's target user.
- **Impact:** A plan whose old counter was edited by hand reaches the owner on the send-back that crosses a limit, and the menu's "counted X of a limit of 3" line shows the real count. A green no-packages check means the breaker really read the counts with no package installed.
- **Deliverable:** The changes below. They cover one module's legacy reader and the test that guards it:
  - a legacy count reader in `src/lib/circuit-breaker.js` that reads every shape the old library read, at least as high as that library read it;
  - an oversized count that escalates;
  - the three test defects in `tests/runs-without-installed-packages.test.js`, fixed.

**Alignment checks:**
1. The goal traces to the vision's problem statement. YES: this stub is a friction found while building CTOC with CTOC, filed by the vision's own ruling.
2. The actor is in the vision's target audience. YES: the owner and the agents that build for him.
3. The impact is observable. YES: the send-back line the menu prints, and the plan listed on the inbox escalations screen.
4. The deliverable is one functional area. YES: the breaker's legacy reader and the check that guards it.

**Overlap check.** One same-vision sibling stub is in `plans/functional/`: "The background-agent protection is measured before the owner decides whether it is on". It concerns a hook, so there is no overlap. The plan "A plan completion and the inbox escalation read work on a clean install, and a check loads the shipped tree with no installed packages" is not a sibling, but it overlaps; see Out of Scope and Risks.

## User Stories

**As the** owner, **I want** a plan's old send-back count read in full when its counter holds blank lines or comments, **so that** the send-back that crosses the limit of three per step or five per plan reaches me as an escalation on that send-back, not one or more send-backs later.

**As the** owner, **I want** an old count read at least as high as the old YAML library read it, in every notation that library accepted, and I want a counter line the reader cannot read at all to escalate rather than count as zero, **so that** no way of writing the old counter lets a plan run past the limit unseen. The notations include flow maps, quoted values, anchors and aliases, and hex, octal, binary, signed and fractional numbers.

**As the** owner, **I want** an oversized count to escalate and every real old counter in the repository to read exactly as before, **so that** no number is too big to stop a plan and the fix raises no false alarm on the plans that carry the old counter today.

**As a** maintainer who ships CTOC, **I want** the check that CTOC runs with no installed packages to fail when its forbidden-key fixture, its shim or its setup does not do what the test assumes, **so that** a green run of that check means the breaker really read the counts with no package installed.

## Acceptance Criteria

How to read these scenarios:
- The kickback counter file is `.ctoc/state/kickbacks/<plan>.json`, where the breaker keeps its count today. The old frontmatter counter is the `kickback_counts:` block that older plans still carry.
- Every plan in a scenario is being built (in `plans/in-progress/`) and has no kickback counter file yet, unless the scenario says otherwise, so its count comes from the old frontmatter counter.
- Fixtures are JavaScript strings, written the way the existing circuit-breaker tests write them.
- "Counted X of a limit of 3 for Step N, Y of a limit of 5 for the plan" is the line the menu prints for a recorded send-back.
- "Escalated" means that line ends with "over the limit, so <plan> needs you", and the plan is listed on the inbox escalations screen.
- Each scenario states what happens today, so its test can be seen failing before the fix.
- 9007199254740991 is `Number.MAX_SAFE_INTEGER`. One send-back on top of it prints 9007199254740992.

### Comments and blank lines (first story)

- [ ] **Scenario: A blank line inside the step map drops no count (driven through the real menu route)**
  Given a plan whose frontmatter is `"---\ntitle: \"Fixture plan\"\nkickback_counts:\n  by_step:\n    '8': 1\n\n    '10': 3\n  total: 4\n---\n"`
  When a review round sends it back to Step 10 through `menu task complete <id> --continue --send-back 10`
  Then the completion text says the send-back was counted 4 of a limit of 3 for Step 10 and 5 of a limit of 5 for the plan, and that the plan needs you
  And the inbox escalations screen lists the plan with "Step 10 kicked back 4× (max 3)"
  (Today: counted 1 of a limit of 3 for Step 10, no escalation.)

- [ ] **Scenario: A comment line at the step map's own indentation drops no count**
  Given a plan whose counter is `"kickback_counts:\n  by_step:\n    '8': 1\n  # added after the security round\n    '10': 3\n  total: 4\n"`
  When a send-back to Step 10 is recorded
  Then it is counted 4 of a limit of 3 for Step 10 and 5 of a limit of 5 for the plan, and escalated
  (Today: counted 1 of a limit of 3 for Step 10, no escalation.)

- [ ] **Scenario: A comment starting in the first column does not end the counter**
  Given a plan whose counter is `"kickback_counts:\n  by_step:\n    '10': 2\n# carried over from the old plan\n  total: 5\n"`
  When a send-back to Step 12 is recorded
  Then it is counted 1 of a limit of 3 for Step 12 and 6 of a limit of 5 for the plan, and escalated
  (Today: the total reads 0, so it is counted 1 of a limit of 5 for the plan, no escalation.)

- [ ] **Scenario: A comment after a count is not part of the count**
  Given a plan whose counter is `"kickback_counts:\n  by_step:\n    '10': 3  # third, from the security round\n  total: 5  # all steps\n"`
  When a send-back to Step 10 is recorded
  Then it is counted 4 of a limit of 3 for Step 10 and 6 of a limit of 5 for the plan, and escalated
  (Today: both counts read 0, so it is counted 1 of a limit of 3 and 1 of a limit of 5, no escalation.)

- [ ] **Scenario: The counter is found whatever follows or quotes its key**
  Given four plans whose counter body is `"  by_step:\n    '10': 3\n  total: 3\n"`, under these four key lines:
  - `kickback_counts:  # read only since the counter file`
  - `'kickback_counts':`
  - `"kickback_counts":`
  - `kickback_counts: &counts`
  When a send-back to Step 10 is recorded for each plan
  Then each is counted 4 of a limit of 3 for Step 10, and escalated
  (Today: the counter is never entered, so each is counted 1 of a limit of 3, no escalation.)

### Every notation the old library read (second story)

- [ ] **Scenario: Flow maps are read**
  Given three plans whose counters are:
  - `"kickback_counts:\n  by_step: {'10': 3, '8': 1}\n  total: 4\n"`
  - `"kickback_counts: {by_step: {'10': 3, '8': 1}, total: 4}\n"`
  - `"kickback_counts:\n  by_step: {\n    '10': 3,\n    '8': 1\n    }\n  total: 4\n"`
  When a send-back to Step 10 is recorded for each plan
  Then each is counted 4 of a limit of 3 for Step 10 and 5 of a limit of 5 for the plan, and escalated
  And a counter holding `by_step: {}` still reads no step counts, as today
  (Today: Step 10's count reads 0 in all three plans, so each is counted 1 of a limit of 3. The second plan's total also reads 0. In the third plan, only the `'8': 1` line is read, because the `3,` after `'10':` fails the count pattern.)

- [ ] **Scenario: Quoted values are read**
  Given a plan whose counter is `"kickback_counts:\n  by_step:\n    '10': \"3\"\n    '8': '1'\n  total: '4'\n"`
  When a send-back to Step 10 is recorded
  Then it is counted 4 of a limit of 3 for Step 10 and 5 of a limit of 5 for the plan, and escalated
  (Today: counted 1 of a limit of 3 and 1 of a limit of 5, no escalation.)

- [ ] **Scenario: Anchored values and aliases are read**
  Given a plan whose frontmatter is `"---\nlimit: &three 3\nkickback_counts:\n  by_step:\n    '10': &perStep 3\n    '11': *perStep\n    '12': *three\n  total: &all 5\n---\n"`
  When send-backs to Step 11, then Step 12, then Step 10 are recorded
  Then they are counted as follows, and each is escalated:
  - Step 11: 4 of a limit of 3 for the step, 6 of a limit of 5 for the plan;
  - Step 12: 4 of a limit of 3 for the step, 7 of a limit of 5 for the plan;
  - Step 10: 4 of a limit of 3 for the step, 8 of a limit of 5 for the plan.
  (Today: every count reads 0, so the three send-backs are counted 1 of a limit of 3 each, with plan totals 1, 2 and 3, and none is escalated.)

- [ ] **Scenario: Hex, octal, binary, signed and fractional counts, and a step key in another notation, are read**
  Given six copies of a plan whose counter is `"kickback_counts:\n  by_step:\n    '10': 0x3\n    '11': 0o3\n    '12': 0b11\n    '13': +3\n    '14': 3.9\n    0xF: 3\n  total: 0x5\n"`
  When one send-back is recorded on each copy, to Steps 10, 11, 12, 13, 14 and 15 in turn
  Then each send-back is counted 4 of a limit of 3 for its step and 6 of a limit of 5 for the plan, and escalated (`3.9` counts as 3, and the key `0xF` counts for Step 15)
  (Today: each is counted 1 of a limit of 3 and 1 of a limit of 5, no escalation.)

- [ ] **Scenario: A counter line the reader cannot read escalates instead of counting as zero**
  Given a plan whose counter is `"kickback_counts:\n  by_step:\n    '10': 1\n  total: >-\n    2\n"`. That is a folded block value, which the old library read as 2.
  And a second plan whose counter is `"kickback_counts:\n  by_step:\n    '10': 1\n    this is not a count\n  total: 2\n"`
  When a send-back to Step 12 is recorded for each plan
  Then each is counted 1 of a limit of 3 for Step 12 and 9007199254740992 of a limit of 5 for the plan, and escalated
  (Today: the first is counted 1 of a limit of 5 for the plan, and the second 3 of a limit of 5, neither escalated.)

### Oversized counts, no false alarm, and the whole catalogue (third story)

- [ ] **Scenario: An oversized count escalates instead of reading as zero**
  Given a plan whose counter is `"kickback_counts:\n  by_step:\n    '10': " + '9'.repeat(400) + "\n  total: 1\n"`
  When a send-back to Step 10 is recorded
  Then it is counted 9007199254740992 of a limit of 3 for Step 10, and escalated
  And a plan whose total is 400 nines, and a plan whose total is `.inf`, each have their next send-back to Step 12 counted 9007199254740992 of a limit of 5 for the plan, and escalated
  And a plan whose kickback counter file holds `{"by_step":{"10":1e999},"total":1}` has its next send-back to Step 10 counted 9007199254740992 of a limit of 3, and escalated
  (Today, and under the old library: each oversized count reads 0, so each send-back is counted 1 of its limit, no escalation.)

- [ ] **Scenario: Every real old counter reads exactly as before, with no false alarm**
  Given two real counters copied byte for byte as test fixtures:
  - the leading frontmatter block of "Two scheduler guarantees get a test that goes red when they are removed" (`plans/done/00096-two-scheduler-guarantees-that-no-test-defends.md`), whose counter `"kickback_counts:\n  by_step:\n    '8': 1\n    '14': 1\n  total: 2\n"` opens the block;
  - the leading frontmatter block of "The sync barrier is undefended where work actually starts" (`plans/done/00125-the-sync-barrier-is-undefended-where-work-actually-starts.md`), whose counter sits after a folded title and a `files:` list and before the approval keys.
  When a send-back to Step 14 is recorded for each
  Then the first is counted 2 of a limit of 3 for Step 14 and 3 of a limit of 5 for the plan, and the second 2 of a limit of 3 and 2 of a limit of 5, and neither is escalated
  And the five counter shapes of the no-packages check read as they do today: a bare key, single quotes, Windows line endings, an empty flow map, and forbidden keys
  And the five circuit-breaker test files pass unmodified: `tests/ctoc-audit-w05-circuit-breaker.test.js`, `tests/circuit-breaker-block-prepend.test.js`, `tests/circuit-breaker-malformed-frontmatter.test.js`, `tests/circuit-breaker-coverage.test.js` and `tests/circuit-breaker-wiring.test.js`

- [ ] **Scenario: The whole shape catalogue is pinned, and checked once against the old library**
  Given the shape catalogue in this plan, with one row per shape and the count the reader must return
  When a table-driven test reads every row through the breaker
  And the build runs the old library once, as `js-yaml` 4.3.2 from the development tree with the unchanged normalisation, over the same rows and over the leading frontmatter of every plan file under `plans/`
  Then every row reads exactly the catalogue's count
  And the plan's execution record lists, for each row and for each plan file that carries an old counter, both readings and the number of plan files compared
  And no row and no plan file reads lower than the old library read it; any that does stops the build and is reported by name

### The no-packages check cannot pass vacuously (fourth story)

- [ ] **Scenario: The forbidden-key fixture proves the filter works**
  Given the no-packages check's polluted fixture carries `"__proto__": 9`, `"constructor": 9` and `"prototype": 9` beside `"10": 1`, with `total: 1`
  When the check runs, and when it runs once against a copy of the breaker with the forbidden-key filter removed
  Then the first run passes with the reading `{ by_step: { 10: 1 }, total: 1 }`
  And the second run fails, naming a `constructor` or `prototype` step in the reading
  And that failing run is recorded in the plan's execution record
  (Today: with only `"__proto__"`, removing the filter leaves the check green.)

- [ ] **Scenario: A shim that wrote nothing fails the check**
  Given a child process that exits without writing the shim's output file
  When the check reads that child's bare-package requests
  Then the test fails with a message naming the missing file and the child's exit status, instead of reading "no bare requests"
  And this is shown once, by a run in which the shim's output path is not passed to the child, and that run is recorded in the plan's execution record
  (Today: a missing file reads as an empty list and the check passes.)

- [ ] **Scenario: A setup failure is reported once, not masked by the clean-up**
  Given the check's setup fails before it creates its temporary folder
  When the clean-up runs
  Then the clean-up does not throw, and the only failure reported is the setup's own error
  And this is shown once, by forcing the folder creation to fail, and that run is recorded in the plan's execution record
  (Today: the clean-up calls `fs.rmSync(undefined, …)`, which throws a second error.)

## Scope

### In Scope
- Blank lines and comment lines anywhere inside the counter, comments after a count, and a comment, quotes or an anchor on the counter's key line (the first five scenarios).
- Flow maps, quoted values, anchors and aliases, every integer and float notation the old library accepted, and step keys in those notations (the flow, quoted, anchor and notation scenarios).
- A line inside the counter that the reader cannot read: the plan's old total reads as the largest safe integer (the unreadable-line scenario).
- An oversized or infinite count reads as the largest safe integer. This holds in the old counter and in a step count of the kickback counter file, because both pass through the same normalisation (the oversized scenario).
- Real old counters and the existing tests are unchanged (the real-counter scenario).
- The shape catalogue below, pinned by a table-driven test, and a one-time comparison with the old library, recorded in the execution record (the catalogue scenario).
- The three defects in `tests/runs-without-installed-packages.test.js` (the last three scenarios).

### Out of Scope
- These belong to "A plan completion and the inbox escalation read work on a clean install, and a check loads the shipped tree with no installed packages" (`plans/functional/plan-completion-works-on-a-clean-install.md`):
  - the clean-copy runtime check;
  - the three lint rules;
  - the inbox's catch;
  - removing `js-yaml` from `tests/ctoc-audit-w05-circuit-breaker.test.js`.

  The reader that plan describes has already shipped in 6.14.135: `src/lib/circuit-breaker.js` no longer requires the package. Two parts of that plan are contradicted by the owner's ruling recorded here:
  - its reader decision, "anything else contributes zero for that entry";
  - its differences table, in which flow maps, anchors and booleans read lower.

  This refinement does not edit that plan; see Risks.
- The limits (three per step, five per plan), the escalation rule, the kickback counter file's format and lock, and the escalation log are unchanged.
- A kickback counter file whose total is not a finite number keeps today's handling: it is read as unreadable, counted from the plan, and reported as a breaker failure.
- A way to lower or clear a count is not part of this plan. Search: pattern `reset[A-Za-z]*Kickback|kickback[A-Za-z]*[Rr]eset|unlink[^\n]*kickbacks` over `src/`, 0 files. I did not search the plans for one.
- A frontmatter block written as a single flow map (`{kickback_counts: …}`) is not read. Search: no plan under `plans/` opens its frontmatter that way (multiline pattern `\A\s*---\r?\n\s*\{`, 0 files). A control search for a block-style opening (`\A\s*---\r?\n\s*[a-z]`) matched 470 files in `plans/done/`.
- Counting send-backs from review and security rounds belongs to "Send-backs from review and security rounds count toward the three-per-step limit", which is in review.
- Any hook, the approval ledger, who crosses an approval point, and `package.json`: no new dependency, runtime or development.
- A timing test in the gated suite. Timing tests stay out of it by the owner's rule of 2026-10-18. The timing probe is re-run once and recorded (see Risks).

## Risks

### Technical Risks
- The fix lowers a count that reads correctly today.
  - Likelihood: MEDIUM
  - Impact: HIGH (a real plan would run past its limit unseen)
  - Mitigation: Run the five circuit-breaker test files unmodified, pin two real counters byte for byte (the real-counter scenario), and record the one-time comparison over every plan file, stopping the build on any file that reads lower (the catalogue scenario).
- The new shapes need more parsing, and a pattern that backtracks would let a hostile plan file slow every recorded send-back.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Re-run the stub's timing probe on the new reader at one, two and four times the input size, record the times in the execution record, and have the security pass read every new pattern for backtracking. No timing test enters the gated suite.
- A line the reader cannot read makes its plan escalate on every following send-back. The first escalation writes the largest safe integer into the kickback counter file, and nothing lowers a count.
  - Likelihood: LOW (none of the 14 real counters has such a line)
  - Impact: MEDIUM (a false alarm that repeats)
  - Mitigation: Keep every shape a person plausibly writes on an exact reading: comments, blank lines, quotes, flow maps, anchors and number notations. Then only the shapes in the catalogue's escalating row reach this rule. The escalation names the plan, so the owner can open its counter.
- The comment rule is applied inside quotes, so a quoted value or key holding ` #` is cut into a line the reader cannot read.
  - Likelihood: MEDIUM
  - Impact: LOW (a false escalation)
  - Mitigation: Test a `#` inside quotes and a `#` with no whitespace before it as catalogue rows.

### Business Risks
- The owner sees an escalation with a 16-digit count for a plan whose counter is oversized or unreadable.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Accept it, by the owner's ruling that a count may read higher than written but never lower. The escalation line names the plan and the step.
- "A plan completion and the inbox escalation read work on a clean install, and a check loads the shipped tree with no installed packages" is refined into technical plans with its decision "anything else contributes zero" left in place, and brings back the lower readings.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Name the contradiction in this plan's Out of Scope. Keep the catalogue's table-driven test and the notation scenarios as permanent tests, so a lower reading fails the suite whichever plan introduces it.

### Dependency Risks
- `src/lib/circuit-breaker.js` is also edited by "Send-backs from review and security rounds count toward the three-per-step limit", which is in review.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Declare the file in the technical plan, so the scheduler orders the two builds.
- The one-time comparison needs `js-yaml`, which is present only in the development tree, as a development dependency.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Run the comparison in the development tree during the build, record its output in the execution record, and have no test require the library.

## Priority

**Priority: MEDIUM** (Score: 6/9)
- Dependency: 2. No other plan waits on this one. It runs beside other work, sharing one file with a plan in review.
- Business Impact: 2. It supports the vision's goal and protects the breaker's promise to the owner. By reading, though, no checked-in counter is affected today: only a counter edited by hand is.
- Technical Risk: 2. It is a small reader for a subset of YAML, held to a rule that it never reads lower. That is moderate complexity, and it is well covered by existing tests.

The stub carried HIGH from the decomposition. The scoring matrix gives MEDIUM.

## Shape catalogue

One row per shape. "Reader returns" is the count the breaker must produce after its normalisation, and it is what the catalogue scenario's table-driven test pins. The "Old library" column has three kinds of evidence:
- "verified" means read in `js-yaml` 4.3.2's source;
- "stub's comparison" means the stub's run outside the repository;
- "believed" means not checked.

The catalogue scenario's one-time run replaces every entry in that column with an observed reading.

| Shape | Example inside the counter | Reader returns | Old library read | Direction |
|---|---|---|---|---|
| The old writer's shape | `'14': 1` | 1 | 1 (14 real plans) | equal |
| Double-quoted or plain step key | `"10": 3`, `10: 3` | 3 | 3 | equal |
| Windows line endings | any row ending in `\r\n` | as with `\n` | as with `\n` | equal |
| Empty flow step map | `by_step: {}` | no step counts | no step counts | equal |
| Empty or whitespace-only line anywhere in the counter | (empty line) | ignored | ignored (stub's comparison) | equal |
| Comment line at any indentation, the first column included | `  # note` | ignored | ignored (stub's comparison) | equal |
| Comment after a value, after `by_step:` or after the key line | `total: 5  # note` | 5 | 5 (stub's comparison) | equal |
| `#` with no whitespace before it | `total: 5#x` | 0 (the value is the word `5#x`) | 0 (believed) | equal |
| `#` inside quotes | `total: "5 #x"` | 0 (the value is the text `5 #x`) | 0 (believed) | equal |
| Quoted key line, or an anchor on the key line | `'kickback_counts':`, `kickback_counts: &c` | read | read (believed) | equal |
| Flow step map on one line or over several lines | `by_step: {'10': 3}` | 3 | 3 (stub's comparison for one line; believed for several) | equal |
| The whole counter as one flow map | `kickback_counts: {by_step: {'10': 3}, total: 4}` | 3 and 4 | 3 and 4 (believed) | equal |
| Double- or single-quoted value | `"3"`, `'3'` | 3 | 3 (text, then `Number`; stub's comparison) | equal |
| Quoted value that is not plain decimal | `"0x3"`, `" 3 "`, `""` | 3, 3, 0 | 3, 3, 0 (text, then `Number`; believed) | equal |
| Anchored value | `&a 3` | 3 | 3 (stub's comparison) | equal |
| Alias to a number anchored earlier in the same frontmatter block | `*a` | 3 | 3 (believed) | equal |
| Alias with no anchor | `*missing` | 0 for that entry | 0 for the whole block (believed) | equal or higher |
| Hex, octal or binary integer | `0x3`, `0o3`, `0b11` | 3 | 3 (verified) | equal |
| Signed integer | `+3`, `-3` | 3, 0 | 3, 0 (verified; a negative count normalises to 0) | equal |
| Decimal with a leading zero | `010` | 10 | 10 (verified: read as base 10) | equal |
| Fraction or exponent | `3.9`, `3e0`, `.5` | 3, 3, 0 | 3, 3, 0 (verified; floored by the normalisation) | equal |
| Step key in another notation | `0xF: 3`, `010: 3` | Step 15 = 3, Step 10 = 3 | the same (believed: a number key becomes its decimal text) | equal |
| Boolean | `true`, `false` | 1, 0 | 1, 0 (believed: `Number(true)` is 1) | equal |
| Empty or null value | `total:`, `~`, `null` | 0 | 0 | equal |
| Not a number | `.nan`, `lots` | 0 | 0 | equal |
| Positive infinity | `.inf` | 9007199254740991 | 0 (the normalisation drops it) | higher, by the owner's ruling |
| Integer too large for a JavaScript number | 400 nines | 9007199254740991 | 0 (verified) | higher, by the owner's ruling |
| Large but finite count | 20 nines | 1e20 (JavaScript rounds the 20 nines up to it) | the same | equal |
| The same key twice in the counter (`total`, a step, or the counter key itself) | two `total:` lines | the larger | 0 (believed: duplicate keys refuse the block) | higher |
| Tab used for indentation | a tab before `total:` | read | 0 (believed: tabs refuse the block) | higher |
| Malformed YAML elsewhere in the same block, outside the counter | `title: "Bad plan` | counter read | 0 (believed) | higher |
| Any other line inside the counter: a literal or folded block value, a tag (`!!int 5`), a merge key (`<<:`), an explicit key (`? `), a list or nested map under a step, a continued plain value, text that is not YAML | `total: >-` then `    2` | plan total 9007199254740991 | the value it denoted, or 0 when malformed | higher: escalates |
| A frontmatter block written as one flow map | `{kickback_counts: …}` | 0 | read (believed) | lower; no plan under `plans/` opens this way, and no CTOC writer produced it (believed) |

## Decisions Taken Under Ambiguity

1. **A line the reader cannot read inside the counter makes the plan's old total read as the largest safe integer, 9007199254740991.** The next send-back therefore escalates for the plan.
   - Why: the owner's ruling is "higher, never lower". Without a complete YAML parser, this is the only rule that makes "every shape the old library read" true.
   - Not chosen: ignoring the line, which can read lower than the old library and so breaks the ruling.
   - Not chosen: reporting a breaker failure and keeping the partial count, which can also read lower.
   - Consequence: such a plan escalates on every following send-back, as one with an oversized count does under the owner's own ruling.
2. **The readable grammar is the catalogue.** Inside the counter the reader accepts:
   - empty and whitespace-only lines;
   - comment lines;
   - `key: value` lines at the counter's level (`by_step` and `total` are used, any other key is ignored);
   - `by_step:` with an optional flow map;
   - step lines `key: value` indented deeper than `by_step:`;
   - the continuation lines of a flow map opened on the `by_step:` line or the key line.

   Every other line falls under decision 1. A line in the first column that is not a comment ends the counter, as today. Two edges are settled here:
   - A key at the counter's level other than `by_step`, `total` and the merge key `<<` is ignored together with every line nested under it. The old library put those lines under a key the breaker never reads. The merge key is never ignored, because the old library merged its map into the counter; it falls under decision 1.
   - A plain value on the key line itself, such as `kickback_counts: removed`, means the counter holds no counts, which is how the old library read it. Any indented line under such a key falls under decision 1.
3. **Values and keys are read as the old library read them.** A plain value is resolved by `js-yaml` 4.3.2's default rules:
   - null;
   - a boolean;
   - an integer in decimal, hex, octal or binary, with a sign;
   - a float with a fraction or exponent, `.inf` or `.nan`.

   A quoted value stays text. The unchanged normalisation then turns either kind into a count. A plain step key is resolved the same way and written as its decimal text, so `0xF` counts for Step 15.
   - Why: producing the old library's own value and keeping the normalisation is the smallest rule that equals the old library on every catalogue row.
4. **What counts as a comment.** A `#` starts a comment at the start of a line, after any indentation, or after whitespace, but never inside quotes.
   - Why: this is YAML's own rule. The owner's strip pattern `\s+#.*$`, applied as written, would cut a quoted key or value holding ` #`. That would make an unreadable line under decision 1 and a false escalation. This decision only narrows where his pattern applies.
5. **The oversized rule lives in the shared normalisation, `normalizeCounts`.** It therefore covers both readers.
   - The kickback counter file is affected too. A step count there that `JSON.parse` turns into Infinity (`1e999`) now reads as the maximum. Today it is silently 0.
   - A counter file whose total is not finite keeps today's handling. `readKickbackState` classifies it as unreadable, and that is already reported as a breaker failure.
   - Why: one rule where every count passes, and the counter file's silent zero is the same defect.
6. **Aliases resolve to a value anchored earlier in the same frontmatter block.** An alias with no anchor reads 0 for its own entry. The old library refused the whole block. An alias of a map or list, and a merge key, fall under decision 1.
7. **A duplicate key inside the counter reads the larger value.** This covers two `total:` lines, one step written twice, and a second counter key in the same block. The old library refused such a block and read 0 (believed).
8. **How the tests are laid out.**
   - The blank-line scenario drives the real menu route. The other scenarios may record through `actions.recordStepKickback`, whose result is exactly what the menu prints.
   - The new reader tests go into a new circuit-breaker test file, which the technical plan names. The no-packages check keeps its five shapes and gets only its three fixes.
   - The catalogue is a table-driven test holding constants. The comparison with `js-yaml` runs once in the build and is recorded, so no new test requires the library. The clean-install plan aims to remove the last test that does.
9. **Real data.** Two of the 14 real counters are copied byte for byte as fixtures: one that opens its block, and one placed after a folded title and before the approval keys. The one-time comparison covers all 14.
10. **The polluted fixture carries all three forbidden keys.** The stub asked for `constructor`. Adding `prototype` costs nothing and covers the third member of the set.
11. **The missing-shim failure names the file and the child's exit status.** A child that timed out then still says why it failed.
12. **The vision calls a change to the circuit breaker gate logic that needs the owner's explicit approval.** This plan changes no limit, no escalation rule and no route. It changes only how an old count is read, in the direction the owner ruled. His ruling and fix direction are relayed in the brief of this refinement. The plan still moves to technical planning only on his OK.
13. **The priority is MEDIUM, not the decomposition's HIGH.** This follows the scoring matrix under Priority.
14. **No question is put to the owner.** Every open choice here is a parsing rule, a test layout or a file choice, which the brief leaves to the product owner. No technology stack, algorithm, cost or hook change remains open. The questions file holds an empty list.

## What was not verified

- Nothing was run. The product owner holds no shell, so every statement about behaviour comes from reading the code.
- Some of the old library's readings come from the stub's comparison, which ran outside the repository and was not repeated here, or from my belief. These cover blank lines, comments, flow maps, quoted values, anchors, aliases, booleans, block values, duplicate keys and tabs. The catalogue scenario's one-time run replaces each of them with an observed reading. Only its integer and float handling was read in the installed source.
- That assigning a number to `__proto__` on a plain object is ignored, so the `Object.assign` copy drops the key. I believe this with high confidence; I did not run it.
- That `js-yaml` accepts the multi-line flow-map fixture, with its closing brace indented deeper than `by_step:`. Believed. If it does not, the reader's reading of 3 is still not lower than the library's.
- The review, security and timing results of 6.14.135 are taken from the stub.
- That no CTOC writer ever produced a frontmatter block written as one flow map. Believed; the search covers only the current plans.

## Slices (dependency-ordered)

| # | Slice file | Scope (one line) | depends_on |
|---|---|---|---|
| 1 | `the-circuit-breakers-old-count-reader-reads-every-shape-the-old-library-read-s1-the-reader-reads-every-shape-at-least-as-high.md` | `legacyCountsFromBlock` reads blank lines, comments, quotes, flow maps, anchors, aliases and every number notation at least as high as `js-yaml` 4.3.2 read them; an unreadable line saturates the count it names; one count rule turns an infinite count into the largest safe integer; the shape catalogue is a permanent table-driven test | - |
| 2 | `the-circuit-breakers-old-count-reader-reads-every-shape-the-old-library-read-s2-the-no-packages-check-cannot-pass-vacuously.md` | `tests/runs-without-installed-packages.test.js`: the polluted fixture carries `__proto__`, `constructor` and `prototype`; a missing shim output file fails naming the file and the child's ending; the clean-up runs only when the setup created its folder | - |

Neither slice depends on the other: their files are disjoint (`src/lib/circuit-breaker.js`, the new `tests/circuit-breaker-legacy-reader.test.js` and the count lines of `CLAUDE.md` and `README.md`, against `tests/runs-without-installed-packages.test.js`). The no-packages slice's demonstration deletes the forbidden-key line of `normalizeCounts` in a scratch copy only, and the reader slice keeps that line byte for byte. The `#` column is the order of the table only; each slice is named by its scope. Other plans name one of these two files (searched: pattern `src/lib/circuit-breaker\.js|runs-without-installed-packages` over `plans/{todo,in-progress,review,implementation}`, 8 files: this plan, the send-back-rounds plan in review, `a-kickback-must-not-revoke-the-builds-own-permission`, `the-test-suite-runs-faster-and-never-weaker`, and the parent and three slices of `fewer-rework-rounds-a-check-is-attacked-before-it-is-built`, all still in technical planning). A match shows the name in the text, not a `files:` declaration; the scheduler orders builds whose declared files overlap.

### Technical planning notes on this plan's decisions

- **Decision 1 is narrowed (the gate critic asked for the width to be settled on evidence).** A line the reader cannot read saturates the count whose key it carries or continues: that step, or `total`; the plan total when no key can be named. Every count still reads at least as high as the old library read it, and every escalation the old library would have caused still fires; a send-back to another step is counted exactly, so the repeating false alarm the Risks section names is confined to the step whose value could not be read. Both escalating fixtures of the scenario "A counter line the reader cannot read escalates instead of counting as zero" keep their numbers (one names `total`, the other names no key). The full evidence and trade-off are in the reader slice, "The saturation width, settled on evidence"; the catalogue's last escalating row is split there into rows per shape.
- **The catalogue scenario's "no row reads lower" is made precise.** Under decision 1 as written and as narrowed, a merge key, a list item, an explicit key or a flow sequence among the steps carries step counts the reader cannot name; those step counts read below the old library's while the plan total is saturated, so the escalation is never lost. The one-time comparison lists them by name instead of stopping on them; any other lower reading still stops the build. The reader slice also adds a date or timestamp value (read by the old library as milliseconds) as an escalating row, and a top-level explicit key (`? kickback_counts`, 0 files under `plans/`) beside the flow-map frontmatter as the two shapes that still read lower.
- **Decision 12 said this plan would reach technical planning only on the owner's OK.** Its approval record (`.ctoc/approvals/the-circuit-breakers-old-count-reader-reads-every-shape-the-old-library-read.json`) shows it crossed on recorded evidence: `advanced_by: sufficiency`, no questions computed. The fix direction is the owner's own ruling, and both slices read only higher, inside it; no question is put, and the fact is stated here for him to see.
