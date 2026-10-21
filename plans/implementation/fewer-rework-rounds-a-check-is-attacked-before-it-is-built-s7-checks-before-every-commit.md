---
title: "The build agent runs three checks before every commit and the full suite before its last, writes the comparison first, and starts no fix round the menu did not count"
type: implementation
created: 2026-10-10
priority: high
effort: small
parent_plan: fewer-rework-rounds-a-check-is-attacked-before-it-is-built
depends_on: fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s1-what-such-a-plan-states, fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s6-fix-rounds-are-counted-per-area
files:
  - agents/iron-loop/iron-loop-executor.md
  - tests/the-build-agent-checks-before-every-commit.test.js
  # Ratchet, not counted toward the slice size: this slice creates a test file, which moves
  # the test-file count in CLAUDE.md.
  - "CLAUDE.md"
---

# The build agent runs three checks before every commit and the full suite before its last, writes the comparison first, and starts no fix round the menu did not count

Slice 7 of 8 of `plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built.md`.
It carries rule 5 and the build agent's part of rules 1 and 3. Everything here is one agent
file: `agents/iron-loop/iron-loop-executor.md`.

## Problem statement

The build agent's file says what to run in one place only, the list under "### Step 14: VERIFY"
(`agents/iron-loop/iron-loop-executor.md:272-280`), and says nothing about a commit. In the
hotfix check's ninth fix round the whole suite was red for six commits because the agent ran
only a few test files before committing, and a lint error was committed because the commit
command did not stop on the linter's exit code. The same file says "Write tests FIRST"
(`:230`) but not which test comes first for a plan that names a real implementation to compare
against, and it has no word about a fix round after a review.

## Technical approach

### `agents/iron-loop/iron-loop-executor.md`

**One line is added** to the list under "### Step 8: TEST (TDD Red)", after "- Write tests FIRST
(TDD - not just identify coverage)", word for word:

```markdown
- In a plan whose frontmatter says `lets_through:`, the first test you write is the comparison with the implementation named in `compared_against:`; run it and see it fail before any of the code it tests exists
```

**Two sections are added**, immediately before "## Waiting for a long build or test", word for
word:

```markdown
## Before every commit

You commit only when your brief or your plan asks for a commit. Before each commit, run these three, each as its own command, and read each exit code before the next:

1. The project's linter, as your plan's Step 14 names it. One error, or one warning where the project allows none, is a failed run.
2. The check for tests that cannot fail: read every test you wrote or changed since your last commit, and fail the check for a test with no assertion, an assertion that cannot fail (only that a value exists or is truthy, or that nothing was thrown with nothing checked after it), a catch that swallows the failure, a return before the assertion, or the logic under test replaced by a mock. Where the project has its own scan for such tests, run it too.
3. The tests of the files you touched: every test file you changed, and the test file of every source file you changed.

Commit only when all three passed in this same run. Never join the commit to them in one command line: a command that commits whatever the linter answered is how a lint error gets committed. When one of the three fails, make no commit: fix the cause, then run all three again.

A commit of tests written to fail first is the one exception in item 3: those tests fail for the reason your plan states. Write that reason and the failing output into the build record; items 1 and 2 still pass.

Before your last commit, run the project's full gated suite, as your plan's Step 14 names it, see it pass, and write its result into the build record. With one failing test, make no commit.

## A fix after a review

A brief that asks you to fix what a review found, in a plan whose frontmatter says `lets_through:`, names the area and the fix round the menu counted for it: `fix round 1 of 2` or `fix round 2 of 2`. Without that line, start nothing: report that the fix round was not counted, and stop. You never run the menu's `fix-round` yourself.
```

No other text of the file changes. This agent has no compaction inventory.

### Wiring — the live surfaces

The file is the whole instruction of the `iron-loop-executor` agent, which the session launches
for every claimed build (`src/commands/start.md`, `claude:start-agent` and the continuation's
`promote[]`). The `lets_through` and `compared_against` lines are the ones slice 1 reads; the
`fix round <n> of 2` words are the start of the text slice 6's `fix-round` route answers, which
slice 8 tells the session to put in the fix brief.

## Acceptance criteria

- [ ] The build agent's file holds the Step 8 line, the section "Before every commit" and the
  section "A fix after a review", word for word, before the section on waiting.
- [ ] The functional plan's seventh scenario, in one live run: a build agent that changed two
  source files and their tests, with one linter error planted, makes no commit, fixes the
  error, runs the three again, and then commits; its record shows the three commands as three
  separate runs.
- [ ] The functional plan's eighth scenario, in the same run: its last commit follows a passing
  run of the full gated suite whose result line is in the build record; with one failing test
  planted in a second run it makes no commit.
- [ ] The functional plan's first scenario, in a live run on a plan that names a kind: the
  first test file the agent writes is the comparison, and its record quotes it failing before
  the code it tests exists.
- [ ] A live run with a fix brief that carries no counted round on such a plan: the agent
  starts nothing and reports that the fix round was not counted.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above the floor, 0 skipped;
  the test-file count in `CLAUDE.md` is updated.

## Risks

| Risk | Mitigation |
|---|---|
| The agent follows the list in a project whose commands differ from this repository's | The text names "the project's linter" and "the project's full gated suite, as your plan's Step 14 names it", never a command of this repository |
| The check in item 2 is a reading by the agent, not a machine check | Stated in Open question 1; the review steps and the red-team critic's class for tests that cannot fail still read the same tests afterwards |
| The agent reads "before every commit" as an order to commit | The section's first sentence says it commits only when asked |
| The fix-brief rule makes the agent refuse an ordinary fix | It applies only to a plan whose front matter names a kind, the only plans whose fix rounds slice 6 counts |
| A test pins text of this file | Step 9 reads `tests/agent-tool-grants.test.js`, `tests/agents-never-wait-in-a-sleep-loop.test.js` and `tests/protect-records.test.js` for the sentences they pin; none is in the places changed |

## Decisions Taken Under Ambiguity

1. **The commands are named by what they are, not by this repository's command lines**,
   because this file is the build agent's instruction in every project CTOC is installed in.
2. **"Never join the commit to them in one command line"** is written out, because that is how
   the recorded lint error was committed.
3. **Test-first commits are the stated exception** (the functional plan's sixth decision): read
   literally, "the tests of the files it touched passed" would forbid committing a failing
   test written first.
4. **The comparison-first line lives under Step 8**, where the agent already reads how to
   write tests.
5. **The agent never counts its own fix round**: the loaded hook refuses that menu route to a
   background agent, and a builder that could count its own rounds could also not count them.
6. **The live runs are dispatched by the session**, in a scratch CTOC project.

## Open question 1 — which check is "the check for tests that cannot fail"

Read in the code: no check by that name exists. The linter (`eslint.config.js`) has no rule
about assertions; `src/lib/false-green-scan.js` and `tests/false-green-fence.test.js` scan
`src/` for checks that report a verdict on input they never read, not test files; the list of
blocked test patterns in this repository's `CLAUDE.md` ("No Silent Test Failures") is prose;
the red-team critic's class "False-green tests" (`agents/iron-loop/red-team-critic.md:61`) is
an agent's reading.

- **a (recommended): the build agent's own reading of every test it wrote or changed, against
  the written list above, plus the project's own scan where it has one.** Works in every
  project today and costs one reading pass per commit. It is a reading, not a machine check.
  Item 2 above is written for this answer.
- **b: a new machine check over changed test files.** It would be a classifier of tests, so it
  is its own plan under the six rules: a reason, a real implementation to compare against, an
  attack before it is built.
- **c: this repository's false-green scan only** (`node --test tests/false-green-fence.test.js`),
  which reads `src/` and exists in no other project.

What it changes here: item 2 of "Before every commit", one paragraph.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [ ] Write `tests/the-build-agent-checks-before-every-commit.test.js`, exact presence checks
  on `agents/iron-loop/iron-loop-executor.md`, each red today: (1) the Step 8 line stands in
  the Step 8 list, after the "Write tests FIRST" line; (2) the heading "## Before every commit"
  stands before "## Waiting for a long build or test", with its three numbered items, the
  "Commit only when all three passed in this same run" sentence, the "Never join the commit"
  sentence, the test-first paragraph and the last-commit paragraph, word for word; (3) the
  heading "## A fix after a review" with its paragraph, word for word, naming both
  `fix round 1 of 2` and `fix round 2 of 2`; (4) the two round texts are the start of what
  `route(['fix-round', …])` answers for a first and a second round in a temporary project, so
  the instruction and slice 6's route cannot drift apart; (5) guard: the file's frontmatter
  still says `model: sonnet` and `effort: high`, and the waiting paragraph is unchanged.
- [ ] Run the new test file: every case red except the guard.

### Step 9: PREPARE
- [ ] Read the then-current build agent file and the tests that hold it
  (`tests/agent-model-floor.test.js`, `tests/agent-tool-grants.test.js`,
  `tests/agents-never-wait-in-a-sleep-loop.test.js`, `tests/protect-records.test.js`,
  `tests/menu-task-wiring.test.js`, `tests/the-dispatch-seat-says-whether-it-is-live.test.js`,
  `tests/architecture-invariants.test.js`, `tests/registry-integrity.test.js`,
  `tests/unexecutable-instruction-fence.test.js`); list every sentence they pin.
- [ ] Confirm slice 6's `fix-round` route is in the tree and quote its two answers' first words.

### Step 10: IMPLEMENT
- [ ] `agents/iron-loop/iron-loop-executor.md`: the Step 8 line and the two sections.
- [ ] `CLAUDE.md`: the test-file count.

### Step 11: REVIEW
- [ ] The critic reads the file as the build agent would and follows it for: a commit after a
  clean change, a commit with a lint warning, a first commit of failing tests, the last
  commit with one failing test, a fix brief with and without a counted round, a plan with and
  without a kind; any case the text leaves open, or in which it contradicts Step 14 or the
  completion section, is a finding.

### Step 12: OPTIMIZE
- [ ] The two sections say each thing once and repeat nothing of the Step 14 list word for word.

### Step 13: SECURE
- [ ] The security scanner confirms that no added sentence tells the agent to run a command
  taken from test output, a finding or a file other than its plan, to commit without being
  asked, to push, or to run a menu route a background agent may not run.

### Step 14: VERIFY
- [ ] `npm test`: lint, typecheck, all tests, coverage at or above the floor in
  `.ctoc/coverage-baseline.json`, 0 skipped, 0 flaky. Named among them: the nine test files
  of Step 9, `tests/agent-honest-status-fence.test.js`, `tests/gate-numbers-fence.test.js`,
  `tests/instruction-surfaces-say-the-moment.test.js`, `tests/watcher-shape.test.js`,
  `tests/agent-and-skill-improvement-record.test.js`, `tests/doc-counts.test.js`,
  `tests/claude-md-keeps-every-rule.test.js`.
- [ ] The live runs of the acceptance criteria, dispatched by the session; the agent's command
  lines, their exit codes and its commits are quoted in the build record.

### Step 15: DOCUMENT
- [ ] The agent file is the documentation; the build record lists each sentence added.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box above is checked against its evidence; the live runs are quoted;
  Open question 1's answer, when the owner has given one, is quoted beside item 2.
