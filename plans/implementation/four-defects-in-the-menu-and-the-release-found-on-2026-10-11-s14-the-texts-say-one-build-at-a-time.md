---
title: "The session's instructions and the README say one build at a time, and that only the owner forces a build start"
type: implementation
created: 2026-10-11
priority: high
effort: small
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s13-the-refusal-names-the-build-that-holds-the-slot
files:
  - src/commands/start.md
  - README.md
  - tests/the-texts-say-one-build-at-a-time.test.js
  # RATCHET FILE — not counted toward the ~1–3 budget: this slice CREATES a test file, which
  # moves the test-file count in CLAUDE.md (README.md, which also holds that count, is already
  # declared above as real work).
  - CLAUDE.md
revision: 1
rejection_reason: "Owner's revision of 2026-10-17: one build at a time covers builds in the main checkout only; a build"
tag: rejected
---
# REVISION 1

## Rejection Feedback

Owner's revision of 2026-10-17: one build at a time covers builds in the main checkout only; a build recorded with its own worktree path runs alongside (lesson 21). Revise the rule, the refusal and the texts to that scope.

---


# The session's instructions and the README say one build at a time, and that only the owner forces a build start

Slice 14 of 14 of `plans/functional/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`:
the parent's slice 5 — scenarios "the session forces a build start only on the owner's word" and "the
session instructions and the code comments state one build at a time".

**Scope since the owner's revision of 2026-10-17 (Operating Lesson 21).** Every text below says one
build at a time IN THE MAIN CHECKOUT, and that a build claimed with its own worktree (`menu task start
<id> --worktree .claude/worktrees/<name>`, slice 12) runs alongside; file disjointness still holds for
every build. Lesson 21 ("Start the next plan while the tests run") is named where the session decides
how to start the next build.

## Problem Statement

`src/commands/start.md` still states the retired rule (line numbers re-read on 2026-10-18): line 54
("file-disjoint slices run concurrently, same-file slices serialize"), line 69 ("The scheduler serializes
by FILES, not by kind (vision F1 — the old kind-based one-implement-at-a-time rule is retired): implement
tasks run CONCURRENTLY (up to 5) when their declared `files:` are DISJOINT", and "`{ started:false,
queued:true, reason }` → the plan is recorded and waiting on a `file-conflict`"), and line 268 ("the same
number `claude:start-agent` uses for concurrent implement tasks"). Line 69 also carries Operating Lesson
21 since 2026-10-17, telling the session to "run this same claim for the next todo plan" — Start agent's
claim, which under one build at a time in the main checkout would leave that plan queued. `README.md`
line 195 says background tasks run "Up to five … at once" including builds (the limit is 20 since the
owner's order of 2026-10-15), and line 400 says plans "build **concurrently** (up to twenty)". Nothing
tells the session when it may pass `--force` on a build start. The scheduler header and ladder comment (slice 12) and the
`startAgent` comment (slice 13) are already corrected; this slice's test pins them with the rest.

## Technical approach — the exact text

`src/commands/start.md`:
1. **Line 54** — replace "— file-disjoint slices run concurrently, same-file slices serialize." with "—
   one build runs at a time in the main checkout, so the slices build there one after another as each
   completes; a slice claimed with its own worktree builds alongside (Operating Lesson 21)."
2. **Line 69** — three replacements in the Start agent recipe:
   - "`{ started:false, queued:true, reason }` → the plan is recorded and waiting on a `file-conflict`;
     launch no agent, show the queued plan and its `reason`." becomes "`{ started:false, queued:true,
     reason }` → the plan is recorded and waiting — on the main-checkout build that holds the build slot
     (the `reason` names it, says this command cannot confirm its agent is alive, and names `menu task
     cancel <id> --force` as the owner's way to free it) or on a `file-conflict`; launch no agent, show
     the queued plan and its `reason` in full."
   - "**The scheduler serializes by FILES, not by kind** (vision F1 — the old kind-based
     one-implement-at-a-time rule is retired): implement tasks run CONCURRENTLY (up to 5) when their
     declared `files:` are DISJOINT, and two plans that touch the same file serialize (scheduler reason
     `file-conflict`)." becomes "**One build at a time in the main checkout** (the owner's decision of
     2026-10-11, scoped to the main checkout on 2026-10-17): an `implement` task waits while another
     main-checkout build runs or is being cancelled (scheduler reason `one-build`); a build claimed with
     `menu task start <id> --worktree .claude/worktrees/<name>` — a folder directly inside
     `.claude/worktrees/` that its builder works in — runs alongside it and alongside other worktree
     builds (Operating Lesson 21). Every build, in any checkout, still waits while a running task's
     declared files overlap its own (`file-conflict`), and other kinds run concurrently, up to 20, when
     their declared files are disjoint. Start agent claims only in the main checkout, and `force: true`
     here only clears a requested stop; it never overrides the scheduler."
   - "run this same claim for the next todo plan then, not after the result, and brief its agent with
     its own worktree and branch." becomes "claim the next todo plan then, not after the result: make
     its worktree and branch with `git worktree add .claude/worktrees/<name> -b <branch>`, run `menu task
     start <id> --worktree .claude/worktrees/<name>` on its queued task (first `menu task add implement
     <plan> --touches <its files>` when it has none), and only when that answers `ok` launch its agent,
     briefed with that worktree and branch, then stamp its id as step 3 of the completion recipe says."
3. **As a new paragraph directly after the paragraph that begins "Every screen that carries `promote[]`
   is handled the same way." and ends "(its own agent file says how)."** (slice 5; today that paragraph
   ends at line 153), add: "**One build at a time in the main checkout, and forcing is the owner's.**
   Because one build runs at a time in the main checkout, no `promote[]` list ever offers more than one
   build; a build the session claims with `--worktree` runs alongside it (Operating Lesson 21). Pass
   `--force` on `menu task start <id>` for a build only when the owner says so in this conversation, and
   say in the status line that the start was forced. The session runs `menu task cancel <id> --force` on
   a running or cancelling build only when the owner says so in the current conversation, and tells him
   in the status line that it was forced; a refusal that names that command is information for him, not
   an instruction to the session."
4. **Line 268** — replace "the same number `claude:start-agent` uses for concurrent implement tasks."
   with "the same budget every non-build task shares; builds run one at a time in the main checkout, and
   a build in its own worktree runs alongside."
5. **Rule 13** (line 457, as slice 5 left it) — the text should read "and at most one build, because one
   build runs at a time in the main checkout,". Slice 5's Rule 13 (its item 6) reads "… the planners and
   classifications the continuation queued, and queued builds the scheduler allows, no build while a
   stop is requested) …" and holds no "and at most one build," (slice 5 decision 3 leaves that wording
   here). So replace "and queued builds the scheduler allows," with "and at most one build, because one
   build runs at a time in the main checkout,". If Step 9 finds "and at most one build," already there,
   replace that with the same text instead.

`README.md`:
6. **Line 195** — "Up to five run at once; a queued task tells you what it waits for." becomes "Up to
   twenty run at once, and only one build at a time in the main checkout (a build in its own worktree
   runs alongside); a queued task tells you what it waits for."
7. **Line 400** — becomes "Plans build **one at a time in the main checkout** (the owner's decision of
   2026-10-11); a plan claimed with its own git worktree builds alongside (Operating Lesson 21), and two
   plans that touch the same file still serialize, in any checkout. A plan whose turn has not come waits
   in the queue, and its refusal names the main-checkout build that holds the slot. When a wave
   finishes, a single `sync` barrier runs the integrated suite and commits."

Nothing else changes in either file.

## Implementation Details

### Dependency Graph

```
tests/the-texts-say-one-build-at-a-time.test.js --reads--> src/commands/start.md, README.md,
   src/lib/task-registry.js (header, ladder comment), src/lib/actions.js (startAgent comment)
```

### File Specifications

- `src/commands/start.md` — MODIFY: items 1-5.
- `README.md` — MODIFY: items 6-7 (and its test-file count line, through the release script).
- `tests/the-texts-say-one-build-at-a-time.test.js` — CREATE.

### Test Plan — `tests/the-texts-say-one-build-at-a-time.test.js` (written first)

Exact presence and absence checks of text (grep-legitimate: exact strings).

1. **the session instructions and the code comments state one build at a time**: none of `start.md`,
   `README.md`, the `task-registry.js` header (from the top to `'use strict'`), its `evaluateConcurrency`
   comment, or the `startAgent` comment in `actions.js` contains "CONCURRENTLY (up to 5)", "build
   **concurrently** (up to twenty)", "file-disjoint slices run concurrently", "MULTIPLE plans may run
   concurrently", "Kind-based \"plan-serial\" (one `implement` task at a time) is DELETED", "Kind-based
   plan-serial is DELETED", "do NOT relitigate", "approved plans start building", "builds the menu
   already claimed", "uses for concurrent implement tasks" (`start.md` line 268), "Up to five run at once;
   a queued task tells you what it waits for." (`README.md` line 195), "run this same claim for the next
   todo plan" (`start.md` line 69) or "The scheduler serializes by FILES, not by kind";
   `src/lib/task-registry.js` as a whole contains neither "plan-serial" nor "relitigate"; `start.md`
   contains "**One build at a time in the main checkout**", "no `promote[]` list ever offers more than
   one build", "a build the session claims with `--worktree` runs alongside it (Operating Lesson 21)",
   "--worktree .claude/worktrees/<name>", "Start agent claims only in the main checkout", "a build
   (`implement` naming a plan) is claimed FIRST" (slice 5, pinned; re-read on 2026-10-18 at line 134) and
   "only when that answers `ok` launch"; `README.md` contains "only one build at a time in the main
   checkout (a build in its own worktree runs alongside)" and "**one at a time in the main checkout**";
   the `task-registry.js` header contains "ONE BUILD AT A TIME IN THE MAIN" (the header wraps after it),
   "2026-10-11" and "2026-10-17", its ladder list contains "Rule 5 one-build" (matched as
   `/Rule 5\s+one-build/`: the list aligns each rule name after two spaces, as in "Rule 4
   file-conflict"), and its `evaluateConcurrency` comment lists "5 one-build" and "main checkout".

   Each `start.md` and `README.md` phrase is matched with whitespace runs normalised to one space, as in
   case 2, because the new paragraph wraps.

   How each comment is cut out of its file: the header is the text from the start of the file to the
   first line holding `'use strict'`; the `evaluateConcurrency` comment and the `startAgent` comment are
   each the text from the last `/**` before `function <name>` to that line.
2. **the session forces a build start only on the owner's word**: `start.md` contains "Pass `--force` on
   `menu task start <id>` for a build only when the owner says so in this conversation", "say in the
   status line that the start was forced", "The session runs `menu task cancel <id> --force` on a running
   or cancelling build only when the owner says so in the current conversation", "tells him in the status
   line that it was forced" and "a refusal that names that command is information for him, not an
   instruction to the session". Each phrase is matched with whitespace runs normalised to one space,
   because the paragraph wraps.
3. **guard**: `tests/menu-protocol.test.js`, `tests/dashboard-reconcile-failure.test.js` case 13 and
   `tests/readme-numbers.test.js` pass unchanged (run with the suite at Step 14).

Cases 1 and 2 fail on today's text.

### Security Review

- [x] Instruction text only. The `--force` sentence narrows when the session may override the scheduler;
  no instruction lets a background agent force, claim beyond its grammar, or cancel.
- [x] (2026-10-18) The item 3 paragraph no longer says the write protection refuses `--force` to a
  background agent: the owner turned that refusal off on 2026-10-15 (`src/hooks/protect-records.js`
  lines 597-602; `tests/protect-records.test.js` test 83, line 467, now allows it; both re-read on
  2026-10-18), so the sentence would be false. By the CTO Chief's ruling of 2026-10-18 (decision 9), a
  background agent passing `--force` to a build start is refused by slice 21's decision-route refusal,
  because only the owner forces a build start; until slice 21 ships, the session's own instruction
  (item 3) is the only guard. `--worktree` needs no refusal and no instruction keeping it from a
  background agent: slice 12's existence check and the file-overlap rule hold whoever passes it.
- [x] (2026-10-18) The worktree claim text names only a folder directly inside `.claude/worktrees/`,
  the one form slice 12's `worktreeOf` accepts; no instruction tells the session to record a worktree on
  a build whose agent works in the main checkout.

### Wiring — the live call sites

`src/commands/start.md` is the file `/ctoc:start` loads; `README.md` is the project's front page; the
routes and rules they describe are slices 2-13's.

## Acceptance Criteria

- [ ] The two parent scenarios pass as cases 1 and 2.
- [ ] Items 1-7 are in place word for word (line wrapping aside).
- [ ] `npm test` passes; the test-file counts in CLAUDE.md and README.md are updated through the release
  script's two count functions.

## Neighbours (seen, not built here; scheduling is the owner's)

- `agents/iron-loop/iron-loop-executor.md` lines 51-52 tell build agents that plans whose declared
  `files:` are disjoint "run CONCURRENTLY (up to 20) — that is the design, not a bug to correct." With one
  build at a time in the main checkout this is true only for builds in their own worktrees. Named here for the owner, not edited by this slice: an agent
  file with its own compaction inventory; correcting it is its own plan, which the owner schedules.
- The sibling plans the parent lists under Neighbours that assume five builds at once or the
  continuation's claim.

## Decisions Taken Under Ambiguity

1. **README line 195 is corrected too**, although the parent names only line 400: it states that builds
   run up to five at once among the background tasks.
2. **The `--force` rule sits next to the promote recipe**, where the session decides how to start a build,
   rather than in the Rules list, which `tests/menu-protocol.test.js` pins by number.
3. **Item 5's anchor is slice 5's Rule 13 text as that slice writes it** ("and queued builds the scheduler
   allows,"), because slice 5 leaves the "at most one build" wording to this slice (its decision 3); the
   resulting words are item 5's, "and at most one build, because one build runs at a time in the main
   checkout," (quoted to match item 5 on 2026-10-18).
4. **The forced cancel needs the owner's word too** (the CTO Chief's choice, taking the gate critic's
   recommended option; closes q10). The item 3 paragraph also says the session runs `menu task cancel
   <id> --force` on a running or cancelling build only when the owner says so in the current
   conversation, tells him in the status line that it was forced, and treats a refusal that names that
   command as information for him, not an instruction to itself; slice 13's refusal names that command,
   so without this sentence a session could read the refusal as a step to carry out. Test case 2 checks
   the sentence is present.
5. **(2026-10-18, the owner's revision of 2026-10-17.) Every text says "in the main checkout" and that a
   build in its own worktree runs alongside, and Operating Lesson 21 is named** where the session
   decides how to start a build: the Start agent recipe, the new paragraph after the promote recipe,
   the advance-all line, the subagent-budget line, Rule 13 and both README lines. The texts also say that
   file overlap still serializes every build, in any checkout, as slice 12 keeps it.
6. **(2026-10-18.) Lesson 21's "run this same claim for the next todo plan" is rewritten to the
   worktree claim.** "This same claim" is Start agent's (`startAgent(root, { force: true })`), which
   claims only in the main checkout and, under slice 12's rule, leaves the next plan queued while the
   plan under test holds the slot — the opposite of what the lesson asks. The new words name the claim
   that runs alongside: make the worktree and its branch, `menu task start <id> --worktree
   .claude/worktrees/<name>` (adding the queued task first when the plan has none), launch only on
   `ok`, then stamp. The worktree is made BEFORE the claim because slice 12 accepts only an existing
   folder (its decision 13). Unverified when this plan was written: that `git worktree add` runs inside
   the session's sandbox — it writes under `.git/worktrees/`, which the sandbox measurement of
   2026-10-14 did not list as blocked. So the main session tries it once inside its own sandbox before
   it dispatches the build, and Step 8 checks the quoted result (decision 10); Step 11's critic still
   checks the whole recipe can be carried out.
7. **(2026-10-18.) The write-protection sentence is dropped from the item 3 paragraph**, not reworded:
   the owner turned that refusal off on 2026-10-15, so the sentence would be false, and naming its
   absence in the session's instructions adds nothing the session can act on.
8. **(2026-10-18.) Facts that moved since 2026-10-11 are corrected where this plan states them**:
   `MAX_CONCURRENT` is 20 (the owner's order of 2026-10-15), so the README line 195 text says "twenty"
   and the Start agent recipe "up to 20" (writing "five" would put a false number in the README);
   README line 400 now reads "(up to twenty)", so case 1's absence check names that phrase; slice 5's
   pinned phrase is "a build (`implement` naming a plan) is claimed FIRST" as it stands at line 134; and
   every `start.md` line number was re-read (50 → 54, 65 → 69, 141 → 153, 256 → 268, 425 → 457).
9. **(2026-10-18, the CTO Chief's ruling R1.) A background agent passing `--force` to a build start is
   refused by the decision-route refusal (slice 21)**, because only the owner forces a build start.
   Until slice 21 ships, only the session's instructions stop it — item 3's sentence. `--worktree` needs
   no refusal: slice 12's existence check and the file-overlap rule hold. So no text here tells the
   session to keep `--worktree` from a background agent.
10. **(2026-10-18, review finding.) `git worktree add` is tried once inside the session's sandbox, before
    the build, and Step 8 checks the result.** Item 2's recipe is only carried out if that command runs
    there. The executor of Steps 8-16 is a background agent, whose sandbox is not the session's, so the
    main session runs the trial itself before it dispatches the build and quotes it into the build
    record; Step 8's first box only checks that quote. The trial makes a worktree with a throw-away name
    under `.claude/worktrees/` and a throw-away branch, and removes both (`git worktree remove`, `git
    branch -D`) — one worktree and one branch, both made and removed by the trial, nothing else touched.
    If the sandbox refuses it, or the quote is missing, the build stops before Step 10 and the refusal
    goes to the owner with the recipe, because item 2 would instruct a step the session cannot carry out.

## Execution Plan

### Step 8: TEST
- [ ] Before anything else: the build record holds the main session's sandbox trial, which the main session ran once before it dispatched this build (the executor is a background agent and cannot run in the session's sandbox; decision 10): `git worktree add .claude/worktrees/ctoc-sandbox-trial -b ctoc-sandbox-trial`, then `git worktree remove .claude/worktrees/ctoc-sandbox-trial` and `git branch -D ctoc-sandbox-trial`, the three commands and their output quoted. Blast radius: one worktree and one branch, both made by the trial and both removed by it; nothing else is touched. If the quote is missing, or the add was refused, stop here and report it to the owner.
- [ ] Write `tests/the-texts-say-one-build-at-a-time.test.js` (cases 1-2); run it and record that both fail on today's text.

### Step 9: PREPARE
- [ ] Re-read `src/commands/start.md` and `README.md` as they are now (another plan declares both) and confirm each old sentence above still reads as quoted.

### Step 10: IMPLEMENT
- [ ] `src/commands/start.md`: items 1-5.
- [ ] `README.md`: items 6-7.
- [ ] `CLAUDE.md`, `README.md`: the test-file count lines through the release script's count functions.

### Step 11: REVIEW
- [ ] The critic reads the Start agent recipe and the promote recipe as a session would with a build running, and checks that every step can be carried out and none says main-checkout builds run in parallel; and reads Operating Lesson 21's worktree claim as a session would while a plan's Step 14 runs — worktree made, `menu task start <id> --worktree …` answering `ok`, agent launched there, id stamped — checking each step can be carried out (decision 6).

### Step 12: OPTIMIZE
- [ ] Each rule is said once; Rule 13 points to the recipe.

### Step 13: SECURE
- [ ] The security scanner confirms no instruction lets the session force without the owner's word or lets a background agent force.

### Step 14: VERIFY
- [ ] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped, 0 flaky.

### Step 15: DOCUMENT
- [ ] The changed text is the documentation; the build record lists each replaced sentence.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box is checked against its evidence.
