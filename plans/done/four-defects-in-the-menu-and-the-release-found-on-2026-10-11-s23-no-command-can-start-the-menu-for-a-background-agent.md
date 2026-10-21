---
title: "Opening a screen never crosses a gate"
type: implementation
created: 2026-10-12
priority: high
effort: medium
parent_plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11
depends_on: none
files:
  - src/lib/streaming-gate.js
  - src/lib/loop-b-driver.js
  - src/commands/start.md
  - .github/workflows/tests.yml
  - tests/plans-keep-moving-without-the-human.test.js
  - tests/streaming-gate.test.js
  - tests/sufficiency-evidence.test.js
  - tests/answers-bind-to-plan-revision.test.js
  - tests/streaming-gate-coverage-holes.test.js
  - tests/loop-b-directive.test.js
---

# Opening a screen never crosses a gate

Slice 23 (s23) of `plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md`. It is not one of
the parent's five suggested slices; it addresses a FIFTH defect — a confused-deputy / sandbox-escape hole raised by a
security scanner — added to this round by the owner's decision of 2026-10-12 ("fix all five holes ... ultrathink the fix").

**On the filename.** The file is kept as `…-s23-no-command-can-start-the-menu-for-a-background-agent.md`, but that phrasing
is the REJECTED framing. The chosen design does NOT try to stop the menu being started (that cannot be done completely — see
"Why a launcher cannot be caught"). The goal, and the title, is the achievable thing: **opening a screen crosses no gate.**
The filename is left unchanged because a sibling links to it by that name: slice 24's `depends_on`
(`plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s24-only-a-critique-the-menu-launched-can-move-a-plan.md`,
its frontmatter) names this file, so a rename would break that link; the parent lists no slice index that references it.
The title carries the honest goal.

`parent_plan` is written as the BARE slug, not the stage path `implementation/…`, even though
`plan-validator.validateParentPlan` would accept the stage-path form (it tolerates a leading stage prefix — `planSlugExists`
compares `path.basename` only). The reason: `actions.listSubplans` and `actions.approveSubplans` enumerate siblings by EXACT
string equality (`String(parentPlan) === parentSlug`, where `parentSlug` is the parent's bare slug), so a stage-path value
would match no sibling and orphan s23 from the Gate-2/Gate-3 batch. Every sibling uses the bare form, and the menu's own
reader resolves it (`src/hooks/human-gate-check.js` `isFreshSip1Slice` reads `parent_plan` and resolves the parent by its
file name). The red-team lens does NOT: its read fence (`agents/iron-loop/red-team-critic.md`, "## Read scope", clause (a))
reads a `parent_plan` only when it has the stage-path shape `^[a-z0-9-]+/[A-Za-z0-9._-]+\.md$`, so it cannot read this
plan's ancestry. That is a defect in the lens's own instructions (the planner contract requires the bare form), listed for
the owner under the owner question below; it is not a reason to change `parent_plan` here. Bare slug it is.

Line numbers below were read on 2026-10-12 in the main checkout; `src/lib/streaming-gate.js` and
`tests/plans-keep-moving-without-the-human.test.js` carry other four-defects slices' uncommitted work (git status), so
functions there are cited BY NAME and the executor re-reads every cited span at Step 9 and edits the lines as they are then.
**That uncommitted work may still sit in the shared checkout when this slice builds.** So the executor NEVER runs
`git checkout`, `git restore`, `git stash` or `git reset` on anything, at any step: each would destroy another slice's
uncommitted work with no copy. Every temporary change (the Step-8 probe, each Step-10 mutant) is undone by copying back a
byte-exact copy saved beforehand in the executor's scratchpad (a folder outside this repository) and checked by byte
equality with that copy — never by "the tree is clean". `git status --porcelain` is only ever compared with the baseline
recorded at Step 8, which is not required to be empty. This slice does NOT edit
`src/lib/menu-screens.js`: the first revision added a `stream continue` dispatch line there, and an earlier CTO Chief
ruling dropped that route entirely (see "The chosen design"), so `menu-screens.continueAfterCrossing` is referenced as the
live writer but never edited. (A ruling cited by number alone is one of the third round's; an earlier round's ruling is
called "an earlier ruling"; "ruling N of the fourth round" is one of the CTO Chief's six rulings of 2026-10-13 on the
devil's-advocate and advocate review of this plan.)

## Problem Statement

**Today's behaviour (verified from the source).** `pendingGateDecisions` (`src/lib/streaming-gate.js`, around line 1017)
walks the pre-build and review stages and computes each plan's sufficiency verdict. It has two crossing blocks:

- The **pre-build** cross (around lines 1049-1053): `if (sufficiency.enough === true && passesValidation && !regime &&
  PRE_BUILD_DESTINATIONS.has(meta.toStage) && crossBySufficiency(...))`. `crossBySufficiency` writes an approval-ledger entry
  and moves the plan `functional`→`implementation` (Gate 1) or `implementation`→`todo` (Gate 2). **This block does not test
  `crossed`** — it runs on every call, including a bare read.
- The **review→done** cross (around lines 1066-1068): `if (crossed && stage === 'review' && … && crossOnEvidence(...))`.
  **This block requires `crossed`**, so it crosses only on the explicit continuation pass.

The asymmetry is the bug: review→done already crosses only on the continuation; the pre-build cross is missing that guard, so
**rendering a screen crosses pre-build gates as a side effect.**

**Who calls `pendingGateDecisions` without `crossed` (a READ):** `streamingGateScreen` (the default `/ctoc:start` screen),
`advanceAfter` and the post-approve advance, `loop-b-driver.crossedLines` (the on-open / session-start banner), and
`streaming-precompute.plansNeedingQuestions`. **Who calls it WITH `crossed` (the continuation):** only
`menu-screens.continueAfterCrossing`, reached by the session's three live routes — `menu task complete <id> --continue`,
`stream approve`, `stream answer`.

**The default menu screen.** `src/commands/start.js main()` with no arguments and no terminal renders
`streamingGate.streamingGateScreen(findProjectRoot())`. So `node src/commands/start.js` with no arguments, run in any CTOC
project, renders the default screen, which crosses that project's ready pre-build plans on sufficiency.

**The hole (confirmed).** CTOC's one loaded hook, `src/hooks/protect-records.js`, already refuses the no-argument default
screen to a background agent (`subagentMayRunRoute`): it recognises the menu by reading command TEXT and resolving each word
the way Node resolves a script (`reachesCtocCode`, `ctocKind`). A background agent cannot run `node src/commands/start.js`
with no arguments directly — the hook sees `start.js` and refuses. It CAN run a program that, in turn, runs the menu.
ripgrep's `--pre <COMMAND>` option makes ripgrep execute COMMAND on each searched file; `rg` is on the hook's read-only
allowlist (`READ_PROGRAMS`). The command the hook sees is `rg --pre <prog> <pattern> <dir>`, whose words resolve to `rg`, a
preprocessor, a pattern and a directory — none of which the hook resolves to `start.js`. ripgrep then runs `<prog>`, and
`<prog>` runs the menu; the menu's crossing is a direct `fs` call inside the menu process that never passes through a tool
hook. So a background agent crosses Gate 1 / Gate 2 invisibly.

**The harm.** Gate 2 (`implementation`→`todo`) admits a plan to the build phase and grants its declared `files:` write
coverage. A background agent that triggers the default-screen render force-advances any ready pre-build plan, at a moment of
its choosing, with no human seeing it on the menu — breaking the invariant that a background agent may not move a plan across
a gate.

**`rg --pre` is one member of a class.** Any program that runs another program named in its arguments reaches the menu the
same way the hook cannot see: ripgrep `--pre` / `--pre-glob`, `find -exec` / `-execdir`, `xargs`, `env`, `nice`, `timeout`,
`sh -c` / `bash -c`, `git -c core.pager=…`, `awk 'BEGIN{system(...)}'`, `perl -e` / `python -c`, `npx`, `npm run`, `make`,
and more. A Node child process (`spawnSync(nodePath, [startJs])`) is the same class on every platform.

### Why a launcher cannot be caught (the root cause)

A deny-list of launcher programs at the hook is whack-a-mole: the list is not exhaustive and never will be, and the hook
reads command text, not a process tree, so it cannot know what a launcher will spawn (`docs/ENFORCEMENT.md`, "What it cannot
catch"; `src/hooks/protect-records.js` header). The class is therefore not "which launchers exist" but **"a READ (rendering a
screen) has a gate-crossing side effect, and a read can be triggered through a program the hook cannot see inside."** Remove
the side effect — make a read never cross — and starting the menu moves nothing, however it was started.

### The chosen design — remove the class

Make the pre-build cross require the explicit continuation context, exactly as the review→done cross already does: add
`crossed &&` as the first condition of the pre-build guard (the ONE-TOKEN change). Then **no read crosses a gate** — not the
default screen, not `advanceAfter`, not the on-open / session-start banner, not precompute. The sufficiency cross happens
only on the continuation's pass (`opts.crossed` present). The autonomous pipeline is unchanged in the loop: the continuation
runs whenever a background task finishes and on every answer and approve, so a ready pre-build plan crosses on the next
continuation. What is lost
is only the "catch-up" crossing that fired because someone opened the menu. A ready pre-build plan needs nothing from the
owner, so it is NOT put to him as a question while it waits for that continuation (CTO Chief ruling 2 of the third round): the
question queue on every screen that builds it leaves such plans out, one status line names them with how to approve one
now, and the screen asks the next decision that needs him — or shows "nothing pending" plus that line. The line is true about
what will move them (ruling 1 of the fourth round): while a background task is queued or running — its finish runs the
continuation — it says "Ready, moving on by itself at the next step: …"; when none is, it says "Ready, but nothing is running
that would move it on: …" and that approving one records it as his approval. The plan's own screen (`plan <ref>`) shows the
same line, asks no detail the critique already settled and offers Approve without "Recommended", so no screen puts a ready
plan to him as a question. "Ready" means the crossing would accept the plan (ruling 3): besides enough information, passing
validation, no regime hold and a pre-build destination, no approval entry is already recorded for that destination and no
plan file of the same name already sits there. A plan failing either of the last two — or whose readiness cannot be
established at all — stays in the question queue with its normal approve screen, Approve marked Recommended as today.

This needs NO change to `src/hooks/protect-records.js`, and this slice makes none. The chosen design does not touch the
hook, which is the better outcome: no new deny-list to keep exhaustive. The hook's existing refusal of the no-argument route
stays as defence-in-depth.

### What this slice does and does NOT do (stated plainly)

This slice removes ONE class: **a READ crossing a gate.** It does NOT make the gates safe against a background agent that has
turned hostile — and that is not only a deliberately hostile agent: one injected instruction in anything an ordinary builder
reads (a plan, a dependency's documentation, a tool result) turns it into one (OWASP 2025, LLM01: Prompt Injection). The plan
must not claim otherwise. Two residuals remain, both from one limit — the write protection reads COMMAND TEXT, so a
background agent that runs its own code can reach any menu route the main session can:

1. **Explicit write routes, reached through a launcher or a script the agent wrote.** A background agent can still start
   `node src/commands/start.js stream approve <ref>`, `stream answer …`, or `menu task complete <done id> --continue` behind a
   launcher (or from a script file it wrote and then ran) — routes the hook refuses when it sees them, but not when a launcher
   hides them. Those routes still cross (that is their job for the main session), and `stream approve` records the crossing as
   **the owner's approval** (`streamApprove` → `approvePlan`, writing `approved_by: human`; `src/lib/streaming-gate.js` around
   lines 2083-2090). So an agent that has turned hostile — by design or by one injected instruction — can still manufacture a
   crossing, including one recorded as the owner's.
2. **Forging the classification.** A background agent can still drop a forged gate-critique classification into the writable
   waiting folder, making an author's own plan read as "classified" and so move on sufficiency. A separate slice (slice 24) is
   being planned for this; it is not addressed here.

Neither is reopened or widened by this slice; both are named for the owner below. The honest claim is narrow and true:
**opening a screen crosses no gate.** The claims that "no launcher can cross a gate", that "crossing now happens ONLY through
`continueAfterCrossing`", and that "an agent cannot trivially manufacture enough" are deliberately NOT made — a launcher can
still reach the explicit write routes, and (2) is exactly a way to manufacture `enough`.

## Implementation Details

### Dependency Graph

```
src/lib/streaming-gate.js#pendingGateDecisions  --crosses only when--> opts.crossed is an array (continuation)
src/lib/streaming-gate.js#movesOnItsOwn         --reads--> the descriptor, approval-ledger.readEntry, the destination folder
src/lib/streaming-gate.js#askQueue              --splits the pending list with #movesOnItsOwn into--> { asks, ready }
src/lib/streaming-gate.js#readyStatus           --names `ready` on one status line with--> loop-b-driver.summarize (lazy, fail-soft)
                                                --picks its words by--> task-registry.load: a task queued or running, or none
src/lib/streaming-gate.js#withReady             --attaches--> screen.ready = [{ name, approve }]
src/lib/streaming-gate.js#streamingGateScreen   --asks asks[0], status carries #readyStatus--> #gateScreenAt (unchanged)
src/lib/streaming-gate.js#advanceAfter          --asks the decision after the skipped/commented one, within asks--> #gateScreenAt
src/lib/streaming-gate.js#advanceExcludingSlug  --asks asks[0] after an approve--> #gateScreenAt
src/lib/streaming-gate.js#planDecisionScreen    --at a pre-build gate: sweeps, then reads--> #pendingGateDecisions + #movesOnItsOwn
                                                --a ready plan gets--> #readyStatus, no detail asked, Approve not Recommended
src/lib/loop-b-driver.js#crossedLines           --becomes a pure read (no before/after snapshot)
src/commands/start.md                           --documents--> screen.ready (an entry's approve runs only on the owner's request)
tests/*                                          --assert--> a read does not cross; the continuation does; a ready plan is not asked
```

The only production edit that changes crossing behaviour is one token (`crossed &&`). The rest are screen changes the token
makes necessary: a ready pre-build plan now WAITS for the next continuation instead of being crossed by a read, so the
screens must neither hide it nor put it to the owner as a question he does not need to answer. Ruling 2 of the third round
decides how: it is left out of the question queue and named on one status line, with how to approve one now. Ruling 1 of
the fourth round makes that line say whether anything will move the plan, and gives the plan's own screen the same line,
no detail asked and an Approve that is not marked Recommended. That REPLACES the second revision's ready-plan screen on the
queue (the rich-screen fall-through, the reworded sufficiency line, the un-Recommended Approve) entirely: `gateScreenAt`,
`sufficiencyLine`, `buildOptions` and `richQuestionScreen` are NOT edited; `planDecisionScreen` gains only a ready check
above its questions and the un-Recommended Approve description for a ready plan. NO recovery
route is added: the first revision added a
`stream continue` route, and the CTO Chief dropped it (an earlier ruling) because it is another no-argument write route a launcher
reaches exactly as it reached the default screen, and its own result reporting would mislead. A ready plan whose
continuation was missed crosses at the next continuation, or when the human approves it himself through `screen.ready`
(the existing `stream approve` route, run only at his request).

### File Specifications

#### File: `src/lib/streaming-gate.js`
**Action:** MODIFY
**Purpose:** a read crosses nothing; a plan the crossing would accept is left out of the question queue and named on one
status line that says truthfully whether anything will move it, with how to approve it now; its own plan screen puts it to
the owner as no question either.
**Change Type:** modify-existing

##### Changes
- **The pre-build cross guard** (around lines 1049-1053): add `crossed &&` as the FIRST condition, so the plan crosses only on
  the continuation's pass, mirroring the review→done cross below. Replace the `// X6:` comment with a rule that does NOT
  overclaim:

```js
      // X6 + four-defects s23: enough information at a pre-build gate crosses the plan by
      // itself — but ONLY on the continuation's pass (`crossed` present), exactly as the
      // review→done cross below already requires. A READ MUST NOT CROSS A GATE: without the
      // `crossed &&` guard, any bare call (the default screen, advanceAfter, the on-open /
      // session-start banner, precompute) crossed pre-build plans as a side effect, so a
      // background agent that reached a read through a launcher crossed a gate invisibly.
      // `crossed &&` is placed FIRST so short-circuit evaluation keeps crossBySufficiency's
      // side effect (ledger entry + move) from running on a bare read. This closes "a read
      // crosses a gate"; it does NOT close the explicit write routes a launcher can still
      // reach (see the plan's residual risk). Fail-closed conditions follow, unchanged.
      if (crossed && sufficiency.enough === true && passesValidation && !regime
          && PRE_BUILD_DESTINATIONS.has(meta.toStage)
          && crossBySufficiency(projectRoot, plan.path, ref, stage, meta.toStage, sufficiency)) {
```

  The inner `if (crossed)` (around line 1058) is now always true inside this block; it is left as-is (harmless) rather than
  removed, to keep the diff to the one guard token plus comments.

- **The `pendingGateDecisions` doc comment** — the X6 paragraph (around lines 968-975) says the function "is no longer a
  pure read" and crosses "before listing". That is now FALSE. Reword it to: a plan crosses ONLY on the continuation's pass
  (`opts.crossed`); a read never crosses; a ready pre-build plan stays in the RETURNED list, with `enough: true`, until the
  next continuation crosses it — the screens leave it out of the question queue (`askQueue`) and name it on one status line,
  and its own plan screen asks him nothing, so the owner is still never asked a decision that needs nothing from him. In
  the same comment's "THE CONTINUATION'S PASS"
  paragraph, "Every pre-build crossing, on any call, appends …" becomes "Every pre-build crossing — all of them on this
  pass — appends …". Remove any wording that says a read crosses.
- **The crossing-block comment** (around lines 1054-1055) that says "the default screen crosses pre-build plans too, as
  before" becomes "every crossing happens on the continuation's pass; the default screen crosses nothing (four-defects s23)."
- **The banner-ordering comment in `streamingGateScreen`** (around lines 1991-1996) that explains computing the banner before
  `pendingGateDecisions` so "loopBDirective's own before/after snapshot straddles the sufficiency cross" becomes a note that
  `loopBDirective` no longer takes a before/after snapshot (a read crosses nothing), so the ordering is no longer load-bearing
  and is kept only because it is harmless.
- **The `module.exports` comment** (around lines 2310-2312) that says `crossBySufficiency` "is called by `pendingGateDecisions`
  on every gate-screen render" becomes "is called by `pendingGateDecisions` only on the continuation's pass (`opts.crossed`);
  a render crosses nothing."
- **A plan that needs nothing from the owner leaves the question queue (rulings 2 and 3).** Add four module-local helpers next
  to `gateScreenAt` (none exported), and use them in the three functions that build the question queue — `gateScreenAt` has
  no other caller (verified 2026-10-12: its three call sites are in `streamingGateScreen`, `advanceAfter` and
  `advanceExcludingSlug`). They serve the default screen (`streamingGateScreen`, also reached after an answer, after
  `stream check` via `menu-screens.streamCheck`, and on every invalid-reference fallback), skip and comment (`advanceAfter`,
  also after an answer), and approve (`advanceExcludingSlug`). The `plan <ref>` screen (`planDecisionScreen`) is not a queue;
  its change is the next bullet. `gateScreenAt`, `sufficiencyLine`, `buildOptions` and `richQuestionScreen` are NOT edited.

```js
/**
 * four-defects s23: does this pending decision need NOTHING from the owner — would the
 * continuation's crossing pass accept it? Mirrors, condition by condition, what
 * pendingGateDecisions and crossBySufficiency require to cross a pre-build plan: enough
 * information, passing validation, no regime hold, a pre-build destination, no approval
 * entry already recorded for that destination (crossBySufficiency's idempotence refusal)
 * and no plan file of the same name already at the destination (movePlan's collision
 * refusal). A plan failing any of them stays in the question queue exactly as before.
 * Any fault reads as NOT ready: the plan is asked, never hidden — the same answer the
 * crossing gives, since crossBySufficiency fails soft on the same faults (for one: a file
 * name the approval record cannot key, e.g. one with an underscore, throws in readEntry
 * there and here). Costs, per plan that is otherwise ready, one ledger lookup and one
 * existence check on the render path. If crossBySufficiency or movePlan gains a refusal,
 * it is added here in the same change.
 */
function movesOnItsOwn(d, root) {
  if (d.enough !== true || !d.passesValidation || d.regimeHold || !PRE_BUILD_DESTINATIONS.has(d.toStage)) return false;
  try {
    const plansDir = getPlansDir(root);
    const file = `${d.slug}.md`;   // d.slug is a SAFE_PLAN_FILE name: pendingGateDecisions skips every other
    const ledger = require('./approval-ledger');
    const existing = ledger.readEntry(ledger.slugFromPlanPath(path.join(plansDir, d.fromStage, file)), root);
    if (existing && existing.stage_to === d.toStage) return false;
    return !safeFs.existsSync(path.join(plansDir, d.toStage, file));
  } catch {
    return false;
  }
}

/** The pending list split in two: the decisions the owner is asked, and the plans that need nothing from him. */
function askQueue(decisions, root) {
  const asks = [];
  const ready = [];
  for (const d of decisions) (movesOnItsOwn(d, root) ? ready : asks).push(d);
  return { asks, ready };
}

/**
 * The one status line naming the ready plans (names capped as the banner caps them), or '' when
 * there are none. It promises a move only while one will come (ruling 1 of the fourth round): a
 * background task that is queued or running runs the continuation when it finishes, so the plans
 * move on at the next step; with none, nothing but the owner will move them, and the line says so
 * and that his approve is recorded as his. task-registry.load never throws for a string root: a
 * registry it cannot read loads as no tasks, and a task it cannot read cannot be completed through
 * the menu either (menu-screens.taskComplete refuses an unknown id), so the second form is still true.
 */
function readyStatus(ready, root) {
  if (ready.length === 0) return '';
  const names = ready.map((d) => humanPlanName(d.title, d.slug));
  let list;
  try { list = require('./loop-b-driver').summarize(names); } catch { list = names.join(', '); }
  const busy = require('./task-registry').load(root).tasks.some((t) => t.status === 'queued' || t.status === 'running');
  if (busy) {
    return `Ready, moving on by itself at the next step: ${list}. The next step is when a background task finishes`
      + ' or you answer or approve something; to approve one now yourself, say which.';
  }
  return `Ready, but nothing is running that would move it on: ${list}. To approve one now yourself, say which;`
    + ' approving records it as your approval.';
}

/** How the session approves one now: one `{ name, approve }` per ready plan, the existing approve route. */
function withReady(screen, ready) {
  if (screen && ready.length > 0) {
    screen.ready = ready.map((d) => ({ name: humanPlanName(d.title, d.slug), approve: `stream approve ${d.ref}` }));
  }
  return screen;
}
```

  The three queue builders (re-read by name at Step 9; the edits are the lines shown, the rest of each function unchanged):

```js
// streamingGateScreen — after the banner, exactly where `decisions` is computed today:
  const { asks, ready } = askQueue(pendingGateDecisions(projectRoot), projectRoot);
  // …unsafe-file notice unchanged…
  const status = [statusLine, notice, sweepFault, readyStatus(ready, projectRoot)].filter((x) => isNonEmptyStr(x)).join('  ');
  const screen = withReady(gateScreenAt(asks, 0, status || statusLine, projectRoot), ready);

// advanceAfter — the next decision after `ref` WITHIN the asks:
  const { asks, ready } = askQueue(pendingGateDecisions(projectRoot), projectRoot);
  const idx = asks.findIndex((d) => d.ref === ref);
  const status = [statusLine, readyStatus(ready, projectRoot)].filter((x) => isNonEmptyStr(x)).join('  ');
  return withReady(gateScreenAt(asks, idx >= 0 ? idx + 1 : 0, status || statusLine, projectRoot), ready);

// advanceExcludingSlug — after an approve:
  const { asks, ready } = askQueue(pendingGateDecisions(projectRoot).filter((d) => d.slug !== slug), projectRoot);
  const status = [statusLine, readyStatus(ready, projectRoot)].filter((x) => isNonEmptyStr(x)).join('  ');
  return withReady(gateScreenAt(asks, 0, status || statusLine, projectRoot), ready);
```

  What the owner sees: the question is the next decision that needs him, counted "decision N of M" over the asks only; with
  none left it is the existing "nothing pending" screen; either way the status line at the top names the ready plans —
  "moving on by itself at the next step" while a background task is queued or running, "nothing is running that would move
  it on" and that approving records his approval when none is. A
  regime-held plan, a plan with an open fork, an unchecked author's file, a failing validation, a review plan (its
  destination is `done`, not a pre-build stage), and a plan blocked by an existing entry, a destination name clash or a name
  the approval record cannot key are all NOT ready, so each is asked exactly as today (case 49's
  `promptOf === 'What is the button called?'` stays green).
  `stripCtl` already removes control characters from the status line inside `gateScreenAt`; every descriptor's `ref` and
  `slug` come from a file name that passed `SAFE_PLAN_FILE` (`pendingGateDecisions` skips any other), so an `approve` value
  never carries a character a shell would act on, and the paths `movesOnItsOwn` joins never leave the stage folders.

- **The plan's own screen puts a ready plan to the owner as no question (ruling 1 of the fourth round).** In
  `planDecisionScreen` (re-read by name at Step 9; the edits are the lines shown, the rest unchanged), after
  `const actions = {};` and before "1. The PRODUCT question":

```js
  // four-defects s23 (ruling 1 of the fourth round): a plan the crossing would accept needs
  // nothing from the owner, so its own screen puts nothing to him either: the queue screens'
  // ready line above it, no detail the critique already settled, and Approve offered without
  // "Recommended". Only a plan at a pre-build gate can be ready. The gate critic's waiting
  // files are taken in first, as streamingGateScreen does, so this screen and the queue
  // screens agree; a sweep fault leaves the store as it was, which can only make the plan
  // read as not ready (a waiting file never replaces a classified one of the same revision).
  let readyPlan = null;
  if (gate && PRE_BUILD_DESTINATIONS.has(gate.toStage)) {
    try { require('./streaming-questions-sweeper').sweepPendingQuestions(projectRoot); } catch { /* fail-soft */ }
    readyPlan = pendingGateDecisions(projectRoot)
      .find((d) => d.ref === `${stage}/${file}` && movesOnItsOwn(d, projectRoot)) || null;
  }
  if (readyPlan) text = `${stripCtl(readyStatus([readyPlan], projectRoot))}\n\n${text}`;

  // 1. The PRODUCT question: unchanged, except that a ready plan has none to ask.
  const next = readyPlan ? null : nextUnansweredQuestion(projectRoot, ref);

  // 2. The gate question: unchanged, except the Approve description of a ready plan.
    const approve = {
      label: approveLabel,
      description: readyPlan
        ? 'Approve it now yourself; it is recorded as your approval.'
        : 'Recommended — everything checks out. Your answer is recorded as yours.',
    };
```

  A ready plan passes validation (it is part of being ready), so the gate branch offers `[approve, check]` as for any
  passing plan, now with no option marked Recommended; the ride-along "Anything else" question is unchanged. The sentence
  above the options stays the gate's own question (`gateWords.question`, Decision 11). The function's doc comment ("Pure
  read: renders only …") gains one sentence: a plan the crossing would accept gets the queue screens' ready line, no detail
  and an Approve not marked Recommended (four-defects s23).

##### Dependencies
No new module and no new package. Four new LAZY requires, each copying an established call site in this file:
`./approval-ledger` (`readEntry`, `slugFromPlanPath`) in `movesOnItsOwn`, as `crossBySufficiency` already requires it;
`./loop-b-driver` (`summarize`, already exported for `menu-screens.continuationText`) in `readyStatus`, as
`engineStatusBanner` already requires it; `./task-registry` (`load`) in `readyStatus`, as `checkState` already requires it
(the module is always loaded already: `./actions`, required at this file's top, requires it at load); and
`./streaming-questions-sweeper` (`sweepPendingQuestions`) in `planDecisionScreen`, as `streamingGateScreen` already
requires it. All are call-time requires, so no load-time cycle is created. `crossed` is already in scope (around line
1018). No `streamContinue` (an earlier ruling dropped it).

##### Called By
Every caller of `pendingGateDecisions` is unchanged and now crosses nothing on a read. `askQueue` and `withReady` are called
only by `streamingGateScreen`, `advanceAfter` and `advanceExcludingSlug`; `readyStatus` by those three and by
`planDecisionScreen`; `movesOnItsOwn` by `askQueue` and `planDecisionScreen`.

##### Error Handling
The crossing block is still fully short-circuited (`crossed &&` added before the existing fail-closed conditions).
`movesOnItsOwn` catches every fault and returns false — a plan whose readiness cannot be established is ASKED, never hidden.
`readyStatus` falls back to a plain comma join when `loop-b-driver` cannot load, and its registry read cannot throw for a
string root (`task-registry.load` fails open). The plan screen's sweep is fail-soft, and a sweep fault can only make the
plan read as not ready; its `pendingGateDecisions` read is the fail-soft read the default screen already makes unguarded.
Nothing this slice adds can throw out of a render that the default screen could not already throw.

##### Cross-Platform Notes
Paths are built with `path.join` from `getPlansDir(root)`, the descriptor's stage and its file name; no separator is
hard-coded.

#### File: `src/lib/loop-b-driver.js`
**Action:** MODIFY
**Purpose:** the on-open banner no longer takes a before/after snapshot (a read crosses nothing); its header no longer claims
a read crosses a gate.
**Change Type:** modify-existing

##### Changes
- **`crossedLines(root, deps)`** (around lines 174-187) currently snapshots the pre-build stages before and after a bare
  `pendingGateDecisions(root)` and reports the difference as auto-crossed. Delete the before/after snapshot: a bare read
  crosses nothing now, so the diff is always empty and the detector is dead, misleading weight. Replace with a plain read that
  returns no crossed lines and the pending list for the held-line reader:

```js
function crossedLines(root, deps) {
  try {
    // four-defects s23: a bare pendingGateDecisions crosses nothing, so there is no
    // before/after difference to detect — the on-open banner reports no crossing. The
    // continuation names its own crossings through `opts.crossed` (namedCrossedLines).
    const pending = deps.pendingGateDecisions(root);
    return { lines: [], pending: Array.isArray(pending) ? pending : null };
  } catch {
    return { lines: [], pending: null };
  }
}
```

  `preBuildSnapshot` becomes unused, and with it `SUFFICIENCY_SOURCE_STAGES` and its comment (lines 37-43; read only by
  `preBuildSnapshot`) and the `readPlans` entry of `buildDeps` (read only by `preBuildSnapshot`); delete each one Step 9
  confirms has no other reader, so lint finds no unused name. `MOVED_FORWARD` and `summarize` stay (`namedCrossedLines` uses
  both, and `summarize` is exported) — delete only what is genuinely unreferenced.
- **The header bullet (a)** (lines 10-16), which describes the before/after snapshot detecting an auto-cross, is reworded:
  `pendingGateDecisions(root)` is a PURE READ as of four-defects s23 — called without `opts.crossed` it crosses nothing; the
  continuation hands its crossings in via `opts.crossed`, named by `namedCrossedLines`. Remove the "sanctioned side effect"
  and "before/after snapshot" language.
- **The inline comment at line 177** (`// sanctioned side effect: sufficiency auto-cross`) is removed with the snapshot.

#### File: `src/commands/start.md`
**Action:** MODIFY
**Purpose:** the "Human gates stay foreground" section no longer says the default screen crosses on open; the screen
protocol documents `ready`, the session's only way to approve a ready plan now.
**Change Type:** modify-existing (prose)

##### Changes
- In "## State Machine Protocol" (around lines 14-19), after the **actions** bullet, add ONE bullet:

  "- **ready** (optional): plans that need nothing from the human; the status line names them and says whether anything
  running will move them on. Each entry is `{ name, approve }`. Run an entry's `approve` route only when the human asks to
  approve that plan now — his request is the approval — and when two entries carry the name he gave, ask him which. Never
  run one otherwise."

  This is the "how to approve one now" of ruling 2: the status line tells the owner in plain words ("to approve one now
  yourself, say which"), and this bullet tells the session which existing route that request maps to. No new route exists.
  The bullet no longer promises that the plans move on by themselves, because when no task is queued or running they do
  not (ruling 1 of the fourth round).
- In the section headed "### Human gates stay foreground" (around lines 229-234), the sentence "The other three are crossed
  only by the menu's own code — when the default screen opens (the two pre-build crossings), and on the session's `menu task
  complete <id> --continue`, `stream answer` and `stream approve` — when the recorded evidence is enough…" is reworded so that
  crossings happen ONLY on the continuation routes, NEVER when a screen opens:

  "The other three are crossed only by the menu's own code, and only on the session's continuation routes — `menu task
  complete <id> --continue`, `stream answer` and `stream approve` — when the recorded evidence is enough and no question needs
  the human, recorded as evidence, never as his approval; or by his own approve. Opening a screen crosses nothing."

  The rest of the section is unchanged: it must keep the phrases the protocol test (`tests/menu-protocol.test.js`, "Human
  gates stay foreground") asserts — "never … cross"/"auto-cross", "waiting for the human's OK", `--gate`, `--next`, and no
  "Gate N ready".

#### File: `.github/workflows/tests.yml`
**Action:** MODIFY
**Purpose:** guarantee `rg` is present on continuous integration, where the `rg --pre` launcher case is required (on a
developer machine without ripgrep that case is not registered — ruling 5, Decision 8).
**Change Type:** modify-existing

##### Changes
- Before the "Run tests" step, add a step that installs ripgrep on the `ubuntu-latest` runner and proves it runs (CTO Chief
  ruling of 2026-10-13, after the plan-stage security review; no version is pinned):

```yaml
      - name: Install ripgrep
        timeout-minutes: 5
        run: sudo apt-get update && sudo apt-get install -y ripgrep && rg --version
```

  The runner image is not asserted to carry `rg` (unverified this session; "verify beliefs always"), so it is installed
  explicitly — idempotent if already present — and `rg --version` makes the step fail if the installed program does not run. `apt-get` is the correct installer because the one job in this workflow runs
  ONLY on `ubuntu-latest`: verified 2026-10-12 in `.github/workflows/tests.yml` — the `test` job declares
  `runs-on: ubuntu-latest` (line 11) and there is no other job and no OS matrix (the only `strategy.matrix` is
  `node-version: [20.x, 22.x]`), so the step never lands on a non-Debian runner. This is the first option the CTO Chief
  offered; the second (recording verified evidence the image ships `rg`) is not taken because it cannot be verified here.
- The "Run tests" step sets the variable itself, unconditionally (CTO Chief ruling of 2026-10-13): the test registers its
  loud failure on continuous integration by reading `process.env.CI`, and GitHub's default is a belief the builder cannot
  check (it cannot read web pages), so the workflow does not rely on it. Add to that step:

```yaml
        env:
          CI: "true"
```

  If the step already carries an `env:` block, the line is added to it. Nothing changes today: the only code in the
  repository that mentions `CI` is template text in `src/lib/playwright-scaffolder.js` (the plan-stage review's finding),
  which the test run does not read. No other line of the workflow changes.
- **Reviewed before the build (ruling 8).** The security scanner — which can read this file; the red-team lens cannot, its
  read fence excludes `.github/` and `.yml` — reads and attacks this change at the plan stage, before the plan moves to the
  build. Its findings are recorded under "## Plan-stage security review of the workflow change" below; Step 9 refuses to
  start the build without them, and Step 13 reviews the built change again.

### Test Plan

**Framework:** `node:test` with `node:assert/strict`, as every file uses. No test file is added, so no documented count moves
and no `CLAUDE.md` ratchet is declared.

#### Step 8 is EMPIRICAL first (the CTO Chief's method) — and never touches git's copy of anything
1. **Baseline, and a content hash of everything already changed (ruling 2 of the fourth round).** FIRST, before any source
   or test file is changed: run `git status --porcelain --` followed by the ten declared paths, and record its output VERBATIM under
   `## Execution Record` → `### Step 8: TEST` as THE BASELINE. It is NOT required to be empty: the shared checkout holds
   other slices' uncommitted work, including in `src/lib/streaming-gate.js`. Then take THE SCOPE SNAPSHOT: the sha256 of
   every file `git status` lists (each untracked file on its own) plus the ten declared paths, made by the scope script
   below in `snapshot` mode, run from the repository root, into the executor's scratchpad. Record the snapshot file's
   content VERBATIM in one fenced block under `### Step 8: TEST`, followed by the sha256 of that file. The short status
   cannot see a further edit to a file that was already modified when the build started (` M` stays ` M`); the hash does.
   Steps 9 and 16 run the scope script in `compare` mode against this snapshot — the scratchpad copy when its sha256 equals
   the recorded one, otherwise a copy rebuilt from the recorded block — and every "is it back" check compares against these
   records, never against a clean tree.
2. **Probe.** Copy `src/lib/streaming-gate.js` byte-exactly to the scratchpad, then apply ONLY the one-token guard change, run
   the WHOLE suite once (`npm test`), and record every failing test by file and name under `### Step 8: TEST`.
3. **Undo by copy-back.** Copy the saved file back over `src/lib/streaming-gate.js`, confirm BYTE EQUALITY with the saved copy
   (the exit status of the command below is 0), and confirm `git status --porcelain` for the declared paths equals the
   baseline. Never `git checkout`, `git restore`, `git stash` or `git reset`.

```
node -e "require('fs').copyFileSync(process.argv[1], process.argv[2])" <from> <to>
node -e "const fs=require('fs');process.exit(fs.readFileSync(process.argv[1]).equals(fs.readFileSync(process.argv[2]))?0:1)" <saved copy> <repository file>
```

The scope script (item 1), kept in the executor's scratchpad and never in this repository; Node only, so it runs the same
on every platform:

```js
// scope-hashes.js — run from the repository root:
//   node <scratchpad>/scope-hashes.js snapshot <scratchpad>/scope-step8.json <the ten declared paths>
//   node <scratchpad>/scope-hashes.js compare  <scratchpad>/scope-step8.json <the ten declared paths>
// snapshot: writes { path: sha256 | 'absent' } for every path git status lists plus the declared ones.
// compare:  prints every path whose sha256 differs from the snapshot, one per line, old -> new.
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const crypto = require('node:crypto');

const [mode, snapshotFile, ...declared] = process.argv.slice(2);
if (mode !== 'snapshot' && mode !== 'compare') {
  console.error('usage: scope-hashes.js snapshot|compare <snapshot file> <declared paths…>');
  process.exit(2);
}
const sha256 = (p) => {
  try { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } catch { return 'absent'; }
};
function listedByGitStatus() {
  const fields = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0');
  const paths = [];
  for (let i = 0; i < fields.length; i += 1) {
    if (!fields[i]) continue;
    paths.push(fields[i].slice(3));
    if (/[RC]/.test(fields[i].slice(0, 2))) i += 1;   // a rename or copy: the next field is its old path
  }
  return paths;
}
const before = mode === 'compare' ? JSON.parse(fs.readFileSync(snapshotFile, 'utf8')) : {};
const now = {};
for (const p of [...new Set([...Object.keys(before), ...listedByGitStatus(), ...declared])].sort()) now[p] = sha256(p);
if (mode === 'snapshot') {
  fs.writeFileSync(snapshotFile, `${JSON.stringify(now, null, 1)}\n`);
} else {
  for (const p of Object.keys(now)) if (before[p] !== now[p]) console.log(`${p}\t${before[p] || 'not listed at Step 8'} -> ${now[p]}`);
}
```

The sha256 of the snapshot file itself, for the record:

```
node -e "process.stdout.write(require('crypto').createHash('sha256').update(require('fs').readFileSync(process.argv[1])).digest('hex'))" <scratchpad>/scope-step8.json
```

Each failing test is classified, in the record, as (i) a CROSSING assertion that relied on a bare read crossing a ready
pre-build plan — realigned in the declared files (block C, case 52/56) — or (ii) a SCREEN assertion about which plan is asked,
expected to recover once the question queue leaves ready plans out (the Step-10 change; the probe has only the guard, so a
ready plan is asked during the probe). By analysis the crossing set is the six test files declared (every one relies on a
bare read crossing a ready pre-build plan, except `loop-b-directive.test.js`, which is edited for block D — the stub-test
replacement). The full `npm test` after Step 10 is the authority on scope: a test still failing there in a file NOT in the
declared list is a scope-growth request (`src/lib/scope-growth.js`), never a silent edit. A test that fails there because
it asserts that a READY plan's own screen asks a detail or marks Approve Recommended asserts the contract ruling 1 of the
fourth round replaces: none is expected (the analysis below); one in a declared file is realigned with that reason written
at the change, and one in an undeclared file is a scope-growth request. Confirmed UNAFFECTED by analysis
(recheck empirically): `tests/streaming-human-loop-e2e.test.js` (its last answer crosses via `streamAnswer`'s continuation,
so the later bare read is an end-state no-op), `tests/answer-feeds-sufficiency.test.js` (crosses via `streamAnswer`),
`tests/streaming-precompute.test.js` (its fixtures carry an unanswered fork, so no plan is `enough`),
`tests/gate-words.test.js` and `tests/empty-plan-is-not-a-decision.test.js` (their plans never cross). For the plan screen's
new ready check (ruling 1 of the fourth round), every other test that opens a plan screen opens a plan that is not ready,
so its screen is unchanged (by analysis of each call, recheck empirically): `tests/plan-question-screen.test.js` (its one
functional plan with a classified detail, in "the product question is NOT a gate-approval prompt", fails functional
validation — its `planBody` has no problem statement and no acceptance criteria — and its other plans are at review or have
no question file), `tests/streaming-gate.test.js` (that plan has an unanswered critical fork),
`tests/streaming-gate-coverage-holes.test.js` (its question module cannot load, so the plan is not `enough`),
`tests/streaming-human-loop-e2e.test.js` (a fork is open whenever it opens the plan screen), and
`tests/menu-screens.test.js`, `tests/menu-screens-coverage.test.js`, `tests/empty-plan-is-not-a-decision.test.js`,
`tests/scope-shown-at-approval.test.js`, `tests/gate-words.test.js`, `tests/menu-critique-first.test.js` and
`tests/real-question-file-render.test.js` (no classified question file for a pre-build plan, or a plan at review).

#### A. The invariant and the launcher class — a new describe block in `tests/plans-keep-moving-without-the-human.test.js`
Added after the file's existing cases, using its helpers (`makeSandbox`, `writePlan`, `functionalBody`, `writeQuestions`,
`seedBuilt`, `exists`, `route`, `menuScreens.continueAfterCrossing`, `streamingGate`, `loopBDirective`, `precompute`,
`ledger`). Seed a functional plan ready to cross: `writePlan` + `writeQuestions(root, ref, [])` (classified empty ⇒ `enough`),
passing validation, no regime; AND a built review plan (`seedBuilt`) so the review→done guard mutant is killed.

- **S23-1 (RED before the fix) — a read crosses nothing, however the read is reached.** For each read entry point, call it
  and assert the seeded functional plan is STILL in `functional/`, the built review plan is STILL in `review/`, and no
  approval entry was written. `advanceAfter` is NOT exported, so drive the routes that use it, through `route(...)` as the
  session does:
  - `route(['stream', 'skip', fref], root)`
  - `route(['stream', 'comment', fref, 'note'], root)`
  - `route(['stream', 'check', fref], root)`
  - `route(['stream'], root)` (bare)
  - `route(['plan'], root)` (no reference → the default screen)
  - `streamingGate.streamingGateScreen(root)`
  - `streamingGate.pendingGateDecisions(root)` (bare)
  - `loopBDirective(root)`
  - `precompute.plansNeedingQuestions(root)`
  - `route(['plan', fref], root)` (the ready plan's own screen, which reads the pending list after Step 10)
  Each in a fresh sandbox (seed, act, assert, discard) so one read cannot mask another. Before the fix each read crosses (red),
  except the plan screen, which reads no pending list until Step 10 and so passes then — its entry is there for the
  guard-removed mutant, which must turn it red; after the fix none crosses.
- **S23-2 (GREEN before and after) — the continuation still crosses.** `menuScreens.continueAfterCrossing(root)` moves the
  functional plan to `implementation/` and finishes the built review plan to `done/`, writing their entries;
  `streamingGate.pendingGateDecisions(root, { crossed: [] })` also crosses the functional plan (an empty array is truthy, so
  the guard proceeds and the SAME `crossBySufficiency` writes the identical evidence). Pins that the fix removes the crossing
  from reads ONLY, never from the continuation.
- **S23-3 (RED before the fix) — the launcher class, and each launcher PROVED to have reached THIS sandbox's menu.** Each
  launcher runs in its OWN fresh sandbox (seed, spawn, assert, discard) seeded with TWO functional plans:
  - the **beacon plan** `functional/beacon.md`, titled `Launcher beacon ` followed by `crypto.randomBytes(6).toString('hex')`
    (letters, digits and spaces only: unique to this run, so it appears in no other project, and it needs no escaping inside
    the screen's JSON or as a ripgrep pattern), with a classified question file holding one unanswered fork
    (`writeQuestions(root, 'functional/beacon.md', [fork('q10-db')])`). It needs the owner, so on EVERY version of the code —
    before the fix, after it, and under every Step-10 mutant — it is the decision the default screen asks, and its title is
    on the screen's `Topic:` line.
  - the **target plan** `functional/target.md`, ready to cross: `functionalBody('Launcher target')` plus
    `writeQuestions(root, 'functional/target.md', [])` (classified empty ⇒ `enough`), passing validation, no regime, no
    ledger entry, nothing at `implementation/target.md`.

  Why the beacon is a second plan and not the target's own title: the target's title does not reach the output reliably.
  Under the Step-10 guard-removed mutant the read crosses the target and — with the before/after detector deleted from
  `loop-b-driver` — nothing names it, so a beacon on the target would go missing exactly where ruling 6 forbids it. (The
  review→done guard is not in scope here — a bare read has required `crossed` to finish a built plan since before this slice,
  so no launcher could ever finish one.)

  **Why `cwd: root` is enough to make the child render THIS sandbox, with evidence.** The menu finds its project from its
  WORKING FOLDER: `src/commands/start.js main()` calls `findProjectRoot()` with no argument, which is
  `project-root.describeProjectRoot(process.cwd())` (verified 2026-10-12, `src/lib/project-root.js` lines 33, 197-199) — it
  starts at `process.cwd()` and walks UP looking for a `.ctoc`/`plans`/`.git` marker, STOPPING at a repository boundary. A
  `makeSandbox()` root carries `.ctoc/` beside a `plans/` sibling, so Pass 1 returns the sandbox itself (marker `ctoc`); the
  sandbox sits under `os.tmpdir()`, which has no ancestor CTOC marker, so the walk can never climb to a foreign project. A
  child spawned with `{ cwd: root }` therefore renders the sandbox.

  **Every spawn names the sandbox as its working folder and gets the scrubbed environment — written out per launcher
  (ruling 6).** No inherited CTOC-root or Claude-project-folder variable can point a child at another project; the menu
  resolves its root from its working folder alone. (`describeProjectRoot` reads no environment variable today, so the scrub is
  belt-and-braces — it keeps the proof honest if a future reader of one is added.) The variables are DELETED, never set to an
  empty string. A grandchild (the menu started by `sh`, `env`, `xargs`, `find` or `rg`) inherits both the working folder and
  the environment of the launcher that starts it.

```js
const { spawnSync } = require('node:child_process');           // added to the file's requires
const startJs = path.join(__dirname, '..', 'src', 'commands', 'start.js');
const node = process.execPath;
function scrubbedEnv() {                                        // a fresh copy for every spawn
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  delete env.CTOC_ROOT;
  delete env.CTOC_PROJECT_ROOT;
  return env;
}
// Every launcher spawn carries timeout: 120000 (CTO Chief ruling of 2026-10-13): a hung launcher is killed,
// its stdout lacks the beacon, and the beacon assertion fails loudly instead of hanging the job.
// Node child process — every platform:
spawnSync(node, [startJs], { cwd: root, env: scrubbedEnv(), encoding: 'utf8', timeout: 120000 });
// sh -c — POSIX; the two paths travel as $0 and $1, never spliced into the script text:
spawnSync('sh', ['-c', '"$0" "$1"', node, startJs], { cwd: root, env: scrubbedEnv(), encoding: 'utf8', timeout: 120000 });
// env — POSIX:
spawnSync('env', [node, startJs], { cwd: root, env: scrubbedEnv(), encoding: 'utf8', timeout: 120000 });
// xargs — POSIX; with -I it runs the command once per input line and appends nothing:
spawnSync('xargs', ['-I', '{}', node, startJs], { cwd: root, env: scrubbedEnv(), encoding: 'utf8', input: 'x\n', timeout: 120000 });
// find -exec — POSIX; `.` at depth 0 matches once, and -exec runs in find's own working folder:
spawnSync('find', ['.', '-maxdepth', '0', '-exec', node, startJs, ';'], { cwd: root, env: scrubbedEnv(), encoding: 'utf8', timeout: 120000 });
// rg --pre — POSIX, registered as Decision 8 says; `--no-config` comes FIRST so a personal ripgrep config file
// cannot change the case; ripgrep runs `node startJs` (the menu, no arguments) as the preprocessor of the one
// file it searches, and searches that output for the beacon:
spawnSync('rg', ['--no-config', '--pre', node, '--pre-glob', '*start.js', beacon, startJs], { cwd: root, env: scrubbedEnv(), encoding: 'utf8', timeout: 120000 });
```

  When a spawn times out, `res.error.code` is `ETIMEDOUT`; the beacon assertion's message then also carries `res.error`
  so the record says the launcher hung rather than rendered the wrong project.

  **Assertions, in this order, each with its own message, so a failure says WHICH one failed (ruling 6):**
  1. the BEACON — `assert.ok(res.stdout.includes(beacon), …)` with the message "beacon missing: the launcher did not render
     this sandbox's menu", followed by the exit status and the first 500 characters of stderr. A JSON key every screen carries
     (`"actions"`, `"ask"`) is NOT accepted as proof: it would pass if the menu rendered another project or nothing at all.
     For `rg`, a match in its output is the beacon: ripgrep prints the matching line of the menu's output only when the menu
     ran and rendered THIS sandbox.
  2. the CROSSING — `exists(root, 'functional/target.md') === true` and `ledger.readEntry('target', root) === null`, with the
     message "crossing: starting the menu moved the ready plan across a gate".

  The expected red — in the Step-8 red run and under the Step-10 guard-removed mutant — is the CROSSING assertion, with the
  beacon assertion PASSING; the record names, per launcher, which message failed. A missing beacon in either of those runs
  is a DEFECT in the test (the launcher did not reach this sandbox's menu), recorded and fixed before going on — never
  accepted as the expected red.
  - **Cross-platform (registered on every platform): the Node child-process launcher.**
  - **POSIX launchers — `sh -c`, `env`, `xargs`, `find -exec`:** each `it()` is wrapped in
    `if (process.platform !== 'win32') { it(…) }` — the platform `if` goes AROUND the `it()`, never an early `return` inside a
    test body, so nothing is marked skipped and the zero-skipped gate holds.
  - **`rg --pre` (ruling 5 — ripgrep is NOT a prerequisite of `npm test` on a developer machine; Decision 8):**

```js
const rgRuns = spawnSync('rg', ['--version'], { encoding: 'utf8' }).status === 0;   // a missing rg returns status null
if (process.platform !== 'win32') {
  if (rgRuns) {
    it('S23-3 — rg --pre starts the menu and crosses nothing', () => { /* the rg spawn above, then assertions 1 and 2 */ });
  } else if (process.env.CI) {
    it('S23-3 — rg --pre: ripgrep must run on continuous integration', () => {
      assert.fail('ripgrep (rg) is required on continuous integration for the launcher reproduction and did not run');
    });
  }
  // A developer machine without ripgrep registers no rg case; the other launchers prove the class there.
}
```

#### B. A plan that needs nothing from the owner is not put to him — a new describe block in `tests/plans-keep-moving-without-the-human.test.js`
Placed beside block A to reuse that file's helpers (`writePlan`, `functionalBody`, `implBody`, `writeQuestions`, `fork`,
`detail`, `route`, `runAction`, `promptOf`, `labelsOf`, `exists`, `ledger`, `menuScreens`, `tasks`, `registryFile`,
`dropPending`). Every
case runs in its own fresh sandbox. "The ready line" has two forms (ruling 1 of the fourth round), and each case names the
one it expects:
- **the idle form** — no background task queued or running:
  `Ready, but nothing is running that would move it on: <names>. To approve one now yourself, say which; approving records it
  as your approval.` — asserted with `/Ready, but nothing is running that would move it on: /` followed by the expected
  name, `/approving records it as your approval\./`, and `doesNotMatch(/moving on by itself/)`;
- **the busy form** — a task queued or running: `Ready, moving on by itself at the next step: <names>. The next step is when
  a background task finishes or you answer or approve something; to approve one now yourself, say which.` — asserted with
  `/Ready, moving on by itself at the next step: /` followed by the expected name, `/to approve one now yourself, say
  which\./`, and `doesNotMatch(/nothing is running/)`.
B1-B3 and B7 put no task in the registry, so each expects the idle form; B8 and B9 test both forms.
- **B1 — a ready plan whose file holds only DETAILS, beside a plan that needs the owner** (the details of case 1, because a
  details-only file is the shape a screen could wrongly ASK). `functional/r1.md` (`functionalBody('Search by title')`) with
  `[{ ...detail('q10-name', 'What is the button called?', ['Short name', 'Long name']), important: true },
  detail('q11-color', 'Which colour?', ['Blue', 'Red'])]`; and `functional/n1.md` (`functionalBody('Billing export')`) with
  `[fork('q10-db')]`. `streamingGate.streamingGateScreen(root)`:
  - asks n1's fork: `promptOf(screen) === 'Which database engine?'`, and the text's `Topic:` line names `Billing export`;
  - does NOT ask r1: neither `What is the button called?` nor `Which colour?` appears in the text or as a question, and no
    option is labelled `Short name`, `Long name`, `Blue` or `Red`;
  - carries the idle form naming `Search by title`, and `screen.ready` deep-equals
    `[{ name: 'Search by title', approve: 'stream approve functional/r1.md' }]`;
  - r1 did not move and has no ledger entry.
  Then the owner approves it now: `runAction(root, screen.ready[0].approve)` puts r1 in `implementation/`, and
  `ledger.readEntry('r1', root).approved_by === 'human'` (the existing `streamApprove` → `approvePlan`, unchanged).
- **B2 — only a ready plan** (`functional/r2.md`, `functionalBody('Saved searches')`, `writeQuestions(root, ref, [])`).
  `streamingGateScreen(root)` is the existing nothing-pending screen (`promptOf(screen) === 'Nothing waiting at a gate — what
  next?'`) with the idle form naming `Saved searches` and `screen.ready` naming it; r2 did not move. In a fresh sandbox
  with the same fixture, `menuScreens.continueAfterCrossing(root)` moves r2 to `implementation/` with
  `advanced_by: 'sufficiency'` and no `approved_by` — the plans called ready are exactly the ones the continuation crosses.
- **B3 — the screens after skip, comment and approve.** `functional/n3.md` FAILS validation (`functionalBody` with its
  `## Acceptance Criteria` section removed; the fixture first asserts n3's descriptor from a bare `pendingGateDecisions(root)`
  has `passesValidation === false`, so the precondition is checked, not assumed), beside the ready `functional/r3.md`
  (classified empty). Each route in its own sandbox:
  - `route(['stream', 'skip', 'functional/n3.md'], root)` and `route(['stream', 'comment', 'functional/n3.md', 'note'], root)`:
    the next screen is the nothing-pending screen (n3 was the only decision that needs him), with the idle form naming r3
    and `screen.ready` naming r3; r3 did not move.
  - `route(['stream', 'approve', 'functional/n3.md'], root)`: `approvePlan` refuses n3 (it fails validation), so no
    continuation runs; the screen text begins with the `Refused n3.md` status, the screen is the nothing-pending one, the
    idle form and `screen.ready` name r3, and both n3 and r3 are still in `functional/`.
- **B4 — an approval entry already recorded for the destination: NOT ready (ruling 3).** `functional/r4.md`
  (`functionalBody('Export to CSV')`, classified empty) plus
  `ledger.writeEntry('r4', { content: <its bytes>, stage_from: 'functional', stage_to: 'implementation' }, root)`.
  Precondition: its bare descriptor has `enough === true` and `passesValidation === true` (so ONLY the entry makes it not
  ready). The default screen ASKS it on its normal approve screen: the `Topic:` line names `Export to CSV`, the first option
  is its approve label, that option's description matches `/^Recommended/`, and that label's action is
  `stream approve functional/r4.md`; there is no ready line and `screen.ready === undefined`. Its own plan screen agrees,
  because it asks the same predicate: `route(['plan', 'functional/r4.md'], root)` carries no ready line in either form, and
  its first question's first option is the approve label with a description matching `/^Recommended/`. Then
  `menuScreens.continueAfterCrossing(root)` leaves r4 in `functional/` (the crossing's own refusal agrees with the predicate).
- **B5 — a plan file of the same name already at the destination: NOT ready (ruling 3).** `functional/r5.md`
  (`functionalBody('Import from CSV')`, classified empty) plus a DIFFERENT plan at `implementation/r5.md`
  (`implBody('Other work')`). Precondition as in B4. The default screen names no ready plan (no ready line,
  `screen.ready === undefined`) and asks `implementation/r5.md` first (the implementation stage is listed before
  functional); `route(['stream', 'skip', 'implementation/r5.md'], root)` then asks `functional/r5.md` on its normal approve
  screen, first option Recommended. Then `menuScreens.continueAfterCrossing(root)` leaves `functional/r5.md` in place,
  `implementation/r5.md` byte-identical to its seeded bytes, and `ledger.readEntry('r5', root) === null` (the move refused
  the clash and the crossing rolled its entry back).
- **B6 — a file name the approval record cannot key: NOT ready (the fault path).** `functional/r_6.md`
  (`functionalBody('Bulk rename')`, classified empty). The approval record keys only lowercase letters, digits and hyphens
  (`approval-ledger` `SLUG_RE`), so `readEntry` throws for `r_6` — in `crossBySufficiency`, which then fails soft and never
  crosses it, and in `movesOnItsOwn`, whose `catch` reads it as not ready. Precondition as in B4. The default screen ASKS it
  (its `Topic:` line names `Bulk rename`), with no ready line and no `screen.ready`; and
  `menuScreens.continueAfterCrossing(root)` leaves it in `functional/`. (This case also runs the predicate's `catch` line.
  It deliberately asserts nothing about that screen's Approve option: `approvePlan` refuses an un-keyable name, a
  pre-existing mismatch listed under Neighbours.)
- **B7 — the ready line still renders when the name cap cannot load (fail-soft).** The B2 fixture, rendered while
  `require('./loop-b-driver')` fails: a loader patch shaped exactly like the file's `withBrokenPrecompute`, aimed at
  `require.resolve('../src/lib/loop-b-driver.js')`. `streamingGateScreen(root)` still returns the nothing-pending screen, and
  its text still carries the idle form naming `Saved searches` (the plain-join fallback); the plan did not move.
- **B8 — the line says whether anything will move the plan (ruling 1 of the fourth round).** `functional/r8.md`
  (`functionalBody('Saved filters')`, classified empty), one sandbox, `streamingGateScreen(root)` rendered after each step:
  1. no task in the registry: the idle form naming `Saved filters`;
  2. `const add = route(['menu', 'task', 'add', 'plan', 'b8-other'], root)`, with the precondition
     `tasks(root).find((t) => t.id === add.taskId).status === 'queued'` checked: the busy form naming `Saved filters`;
  3. `route(['menu', 'task', 'start', add.taskId], root)`, precondition status `'running'`: the busy form;
  4. `route(['menu', 'task', 'complete', add.taskId], root)` — WITHOUT `--continue`, so no continuation runs — precondition
     status `'done'`: the idle form again;
  5. `registryFile(root)` overwritten with the single character `{` (a registry that cannot be read): the idle form.
  After every step r8 is still in `functional/` and `ledger.readEntry('r8', root) === null` (no step ran a continuation).
- **B9 — the plan's own screen puts a ready plan to him as no question (ruling 1 of the fourth round).** `functional/r9.md`
  (`functionalBody('Search by tag')`) with B1's two details, classified. `const s = route(['plan', 'functional/r9.md'], root)`:
  - `s.text` carries the idle form naming `Search by tag`;
  - neither detail is asked: no question in `s.ask.questions` is `What is the button called?` or `Which colour?`, neither
    prompt appears in `s.text`, and no option on the screen is labelled `Short name`, `Long name`, `Blue` or `Red`;
  - Approve is offered and not recommended: the label whose action in `s.actions` is `stream approve functional/r9.md` is
    an option of the first question, and NO option on the screen has a description matching `/Recommended/`;
  - after `route(['menu', 'task', 'add', 'plan', 'b9-other'], root)` (a queued task), the plan screen carries the busy form
    instead;
  - r9 did not move and has no ledger entry.
  Second sandbox — the gate critic's file has only just arrived: `functional/r9b.md` (`functionalBody('Tag colours')`) with
  no question file in the store and the gate critic's classified empty file waiting (`dropPending(root, 'functional/r9b.md',
  [])`). Its plan screen takes the file in before it decides readiness, so it shows the idle form naming `Tag colours`
  and no option described as Recommended; r9b did not move.

A plan held by the regime, a plan with an open fork and a review plan remain asked exactly as today; their existing cases
(case 49 `promptOf === 'What is the button called?'`, case 2, the review cases) stay green unchanged.

#### C. Contract realignment — the sufficiency cross now happens via the mutation context
Each site below triggers a cross with a BARE `pendingGateDecisions(root)` today; after the fix a bare call no longer crosses,
so each is changed to `{ crossed: [] }` (truthy, so the guard proceeds and the same `crossBySufficiency` writes the identical
ledger evidence). This is a realignment, not a weakening: the crossing assertion and the evidence it checks are unchanged.
- `tests/streaming-gate.test.js`: case 11 ("first pass: crosses", "second pass: must NOT re-cross") — both bare passes →
  `{ crossed: [] }` (the "must NOT re-cross" still holds via `crossBySufficiency`'s own already-crossed guard); case 12
  ("cross"). Case 8 is NOT changed: it crosses via `streamAnswer`'s continuation, so its later bare call is an end-state read.
- `tests/sufficiency-evidence.test.js`: cases 9 (246), 11 (285 and 288) — bare crossing calls → `{ crossed: [] }`; the
  evidence-content assertions are unchanged.
- `tests/answers-bind-to-plan-revision.test.js`: case 18 (454) — bare crossing call → `{ crossed: [] }`.
- `tests/streaming-gate-coverage-holes.test.js`: case "471-476 + 496-498", the `healthy = pendingGateDecisions(root)` at
  line 237 that is MEANT to cross `would-cross` → `pendingGateDecisions(root, { crossed: [] })`.
- `tests/plans-keep-moving-without-the-human.test.js` **case 52** — restructured per an earlier ruling: read the descriptors BARE
  first and assert nothing moved (the plans are still in `functional/`/`review/`, `regimeHold` is `null`), THEN run
  `continueAfterCrossing(root)` and assert BOTH crossings (functional → implementation, built review → done). The bare read of
  the built review descriptor (`descriptorOf`) is taken BEFORE the continuation, because the continuation's finish-on-evidence
  would move the built plan to `done/` and a later `descriptorOf` would not find it. Every NEGATIVE crossing assertion in the
  regime cases (49-58) runs the crossing path with `{ crossed: [] }` or `continueAfterCrossing` (never a bare read), so a case
  cannot pass merely because reads no longer cross — the regime hold, not the missing flag, is what stops the plan.
- `tests/plans-keep-moving-without-the-human.test.js` **case 56 (the `noRegime` guard variants only, "both plans cross as
  today")** — restructured the same way: bare descriptor read asserts nothing moved and `regimeHold` is `null`, then
  `continueAfterCrossing` crosses both. The `misreadSettings` and byte-level case-58 variants already use `{ crossed }` and
  assert nothing crosses; they are unchanged. (The bare reads kept in cases 52 and 56 assert the s23 invariant itself — a
  read moves nothing — not that some condition stops a crossing, so they are not the hollow kind below.)

**The "nothing crossed" checks that go HOLLOW after the fix (ruling 4).** A check that a condition STOPS the crossing proves
nothing once it runs on a bare read, because after the fix a bare read crosses nothing whatever the condition says. Each such
check runs the crossing pass before its nothing-crossed assertions; its other assertions are unchanged:
- `tests/streaming-gate-coverage-holes.test.js`, the FAULTED half of case "471-476 + 496-498" (about line 222):
  `withBrokenPrecompute(() => streamingGate.pendingGateDecisions(root))` →
  `withBrokenPrecompute(() => streamingGate.pendingGateDecisions(root, { crossed: [] }))`. The faulted predicate, not a missing
  flag, must be what keeps `would-cross` in `functional/` — and the healthy half right after it proves the same plan crosses
  without the fault.
- `tests/streaming-gate.test.js` case 9, the unanswered fork (about line 720), and case 10, questions never computed (about
  line 736): `streamingGate.pendingGateDecisions(root)` → `streamingGate.pendingGateDecisions(root, { crossed })` with
  `const crossed = []` declared just before, plus ONE added assertion `assert.deepEqual(crossed, [])` (a tightening: the
  crossing pass itself reports that it crossed nothing). The `.find(…)` on the returned list still finds the plan, which
  stays pending; the descriptor and nothing-moved assertions are unchanged.
- Every other such check the Step-9 search finds is converted the same way (Step 9).

Purely descriptive reads — a bare call whose test asserts no "nothing crossed" fact — stay bare. Each converted check is then
proven LIVE at runtime, not by the search: Step 10 runs a liveness mutant that removes the condition the check names from the
pre-build crossing guard, and the converted check must turn red under it.

#### D. The banner — `tests/loop-b-directive.test.js`
Replace the stub test "a sufficiency auto-cross (plan leaves its pre-build stage) is named in plain moment language"
(lines 308-329), which STUBBED `pendingGateDecisions` to delete the plan, with a REAL test: seed a ready pre-build plan
(classified empty questions ⇒ `enough`) and call `loopBDirective(root)` (the on-open read, no `opts.crossed`). Assert the
plan STAYS in `functional/` and is NOT named as "Moved forward on their own" (a read crosses nothing, so there is nothing to
name). The `opts.crossed` path (`namedCrossedLines`) keeps its existing tests. Any other case in this file that relied on the
before/after snapshot is realigned the same way (the empirical Step 8 run names them).

| Case | Before | After | What it pins |
|------|--------|-------|--------------|
| S23-1 | FAILS: each read crosses (the plan-screen entry passes: it reads no pending list before Step 10) | passes | no read crosses a gate (pre-build or review), the plan screen's new read included |
| S23-2 | passes | passes | the continuation and `{ crossed: [] }` still cross |
| S23-3 | FAILS on the CROSSING assertion, beacon present | passes | no launcher crosses by starting the menu; each launcher proven to have reached THIS sandbox (the beacon plan's title) |
| B1, B2, B7 | FAILS: the read crosses the ready plan, so no ready line, no `screen.ready`, the plan moved | passes | a ready plan is not asked (not even its details), is named on one status line (also when the name cap cannot load), can be approved now as his approval; the continuation crosses exactly the ready plans |
| B3 | FAILS: no ready line, no `screen.ready` (the read crossed r3) | passes | the screens after skip, comment and a refused approve leave the ready plan out and name it |
| B4, B5, B6 | passes (the crossing refuses; the plan is asked) | passes | a plan the crossing would refuse (an existing entry, a name clash, a name the record cannot key) is NOT called ready and stays asked (B4, B5 with Approve Recommended; B4 also on its own plan screen) |
| B8 | FAILS: the read crosses r8 at the first render, so no ready line in either form | passes | "moving on by itself" only while a task is queued or running; otherwise "nothing is running that would move it on" and that approving records his approval, also with an unreadable registry |
| B9 | FAILS: the plan screen asks the first detail (r9) or offers Approve as Recommended (r9b), with no ready line | passes | a ready plan's own screen shows the same line (both forms), asks no detail, offers Approve not marked Recommended, and reads the critic's waiting file first |
| streaming-gate 11/12 | passes (bare crosses) | passes (`{ crossed: [] }`) | crossing still works via the mutation context |
| streaming-gate 9/10, coverage-holes faulted half | passes | passes (`{ crossed: [] }`) | the condition, not a missing flag, stops the crossing — live again (ruling 4) |
| sufficiency-evidence 9/11, answers-bind 18 | passes | passes | the crossing evidence is unchanged |
| coverage-holes 237 (healthy half) | passes (bare crosses) | passes (`{ crossed: [] }`) | without the fault the same plan crosses |
| plans-keep-moving 52, 56 | passes | passes | bare read moves nothing; the continuation crosses; each regime holds only its crossing |
| loop-b-directive (replaced) | n/a (stubbed) | passes | a real ready plan stays put and is not named |

**Mutants in Step 10 — never through git (ruling 1).** For each mutant: copy `src/lib/streaming-gate.js` byte-exactly to the
scratchpad; make the one change; run the named test files; record which named cases failed, and with which assertion
message; copy the saved file back; confirm byte equality with the saved copy (the comparison command in "Step 8 is
EMPIRICAL first", exit status 0). Never `git checkout`, `git restore`, `git stash` or `git reset`. Each must turn the NAMED
cases red:
- remove the new `crossed &&` guard → S23-1 (every entry, the plan screen's included) and S23-3 red (a read crosses
  again). For S23-3 the record names, per launcher,
  the failing assertion: it must be the CROSSING one, with the beacon present; a missing beacon here is a test defect
  (ruling 6), fixed and the mutant re-run.
- move `crossed` to AFTER `crossBySufficiency(...)` in the condition (`… && crossBySufficiency(...) && crossed`) → S23-1 and
  S23-3 red: `crossBySufficiency`'s side effect fires before `crossed` is evaluated, so a bare read still crosses.
- remove `crossed &&` from the review→done (finish-on-evidence) condition → S23-1 red: a bare read finishes the built review
  plan.
- `streamingGateScreen` builds its screen from the whole pending list instead of `askQueue`'s `asks` (no ready line, no
  `withReady`) → B1, B2 and B7 red.
- the same in `advanceAfter` → B3's skip and comment cases red.
- the same in `advanceExcludingSlug` → B3's refused-approve case red.
- remove the approval-entry check from `movesOnItsOwn` → B4 red (r4 is called ready and not asked).
- remove the destination check from `movesOnItsOwn` → B5 red (r5 is called ready and not asked).
- remove the `try`/`catch` around the reads in `movesOnItsOwn` (let a fault escape) → B6 red (the render throws for
  `r_6`).
- `readyStatus` returns the busy words whatever the registry holds → B2, B8 steps 1, 4 and 5, and B9's idle assertions red.
- `readyStatus` returns the idle words whatever the registry holds → B8 steps 2 and 3, and B9's busy assertion red.
- `readyStatus` counts a `done` task as work in flight → B8 step 4 red.
- `planDecisionScreen` without its ready check (the screen as before this slice) → B9 red (a detail is asked; Approve is
  Recommended; no ready line).
- the ready check without the sweep before it → B9's second sandbox red (r9b reads as not ready).
- the ready check takes every plan with `enough` and passing validation as ready, without `movesOnItsOwn` → B4's
  plan-screen assertion red.
- a ready plan's Approve keeps the "Recommended — …" description → B9 red.
- **Liveness mutants for the converted "nothing crossed" checks (ruling 4)**, each with `crossed &&` in place:
  - remove `sufficiency.enough === true &&` from the pre-build guard → streaming-gate case 9, case 10, and the faulted half of
    coverage-holes "471-476 + 496-498" red — proving each now exercises the crossing pass;
  - remove `!regime &&` from the pre-build guard → the nothing-crossed assertion of every FUNCTIONAL-stage regime case in
    plans-keep-moving 49-58 red (the regime hold, not a missing flag, is what stops those plans);
  - for each further check the Step-9 search converted, remove the condition that check names (`passesValidation &&`, or
    `!regime &&`, or the one it names) → that check red. A converted check that stays green under its own condition's
    mutant is still hollow: record it and fix it before Step 11.

**Coverage:** the guard's true and false branches run (S23-2 true, S23-1 false). `movesOnItsOwn` runs every exit: false on
the in-memory conditions (every render with a not-ready plan), false on an existing entry (B4), false on a name clash (B5),
false through its `catch` (B6), true (B1, B2, B3, B9). `askQueue`, `readyStatus` (the empty form, the idle form in B1-B3 and
B7-B9, the busy form in B8 and B9) and `withReady` run on every queue screen; the three queue builders run in B1-B3; the
fallback join in `readyStatus` runs in B7; `planDecisionScreen`'s ready branch runs in B9 and its not-ready path in B4 and
the existing plan-screen cases. Coverage of `src/` does not fall.

### Security Review
- [x] Trust boundary: the attacker is a background agent whose Bash command the write protection reads as text — hostile by
  design, or an ordinary builder turned hostile by one injected instruction in a plan, a dependency's documentation or a tool
  result it read. This slice does not parse the attacker's command; it removes the crossing side effect from the READ path,
  so the attacker's ability to start the menu as a read no longer crosses a gate.
- [x] `screen.ready` adds no route: each entry's `approve` is the existing `stream approve <ref>` (the human's approval,
  refused to a background agent by the write protection when it can see it), its `ref` comes from a `SAFE_PLAN_FILE` name,
  and `start.md` lets the session run it only on the owner's own request. A launcher that reaches the menu could already
  run `stream approve` directly (residual 1 below); `ready` does not widen that.
- [x] The readiness check only READS (one approval-record lookup, one existence check, both inside `plans/` and
  `.ctoc/approvals/` under the project root, from names that passed `SAFE_PLAN_FILE`); it writes nothing, and any fault
  makes the plan ASKED, never hidden — a fault can never take a decision away from the owner. The ready line's choice of
  words reads the task registry (`task-registry.load`, read-only). The plan screen's sweep of the gate critic's waiting
  folder is the sweep the default screen and `nextUnansweredQuestion` already run on every render; it adds no new write, and
  a sweep fault can only make a plan read as not ready.
- [x] Residual, named not hidden — explicit write routes: a launcher (or a script the agent wrote) can still reach
  `stream approve`, `stream answer`, `menu task complete <done id> --continue`, which still cross; `stream approve` records
  the crossing as the owner's approval (`approvePlan`, `approved_by: human`). NOT closed here; named for the owner.
- [x] Residual, named not hidden — forged classification: a background agent can still write a forged gate-critique
  classification into the writable waiting folder, making an author's plan read as classified and move on sufficiency. Slice 24
  is being planned for it; NOT addressed here.
- [x] One limit behind both residuals: the write protection reads command text, so an agent that runs its own code can reach
  any menu route the main session can (`docs/ENFORCEMENT.md`, "What it cannot catch"). Closing it needs background-agent
  isolation that does not exist today (the owner question below).
- [x] No new write route: an earlier ruling dropped the `stream continue` recovery route the first revision added, so this slice adds
  no no-argument crossing route a launcher could reach the way it reached the default screen. The only crossing a launcher
  can still trigger is through the pre-existing explicit write routes above.
- [x] No hook change: `src/hooks/protect-records.js` is not edited; this slice changes no hook.
- [x] No weakening of tests: every realigned assertion still asserts the same crossing and the same evidence, driven through
  the mutation context instead of a bare read; every "nothing crossed" check now runs the crossing pass and is proven live
  by a mutant (ruling 4); the only assertion added to an existing case is a tightening (`assert.deepEqual(crossed, [])`).
- [x] The workflow change (`.github/workflows/tests.yml`) was read and attacked by the security scanner BEFORE the build, at
  the plan stage (ruling 8), on 2026-10-13: verdict warn, findings and changes under "## Plan-stage security review of the
  workflow change"; it is reviewed again at Step 13, which also runs the launchers once against an empty home folder.
- [x] No secrets, no new dependency; the only new file access on the production path is the read-only readiness check and
  task-registry read above (the plan screen's sweep already ran on that screen, inside `nextUnansweredQuestion`).

### Wiring — the live call sites
- `pendingGateDecisions` is the production function whose crossing behaviour changes; its live readers (`streamingGateScreen`,
  `advanceAfter`, the post-approve advance, `loop-b-driver.crossedLines`, `streaming-precompute.plansNeedingQuestions`) now
  cross nothing, and its one live WRITER, `menu-screens.continueAfterCrossing`, keeps crossing. All reached from the shipped
  `/ctoc:start` command (`src/commands/start.md` → `src/commands/start.js main()` → `menu-screens.route`).
- The four new module-local helpers sit on that same live render path: `/ctoc:start` (`src/commands/start.md`) →
  `src/commands/start.js main()` → `streamingGateScreen` (the no-argument default), and `menu-screens.route` → `streamSkip` /
  `streamComment` / `streamAnswer` → `advanceAfter`, `streamApprove` → `advanceExcludingSlug`, `streamCheck` and every
  invalid-reference fallback → `streamingGateScreen`; each of the three calls `askQueue` (→ `movesOnItsOwn`), `readyStatus`
  and `withReady`. The plan's own screen is on the same path: `menu-screens.route` → `plan <ref>` →
  `streamingGate.planDecisionScreen` (`src/lib/menu-screens.js` around line 3282) → `pendingGateDecisions`, `movesOnItsOwn`
  and `readyStatus`. `screen.ready` is consumed by the session per the `start.md` bullet this slice adds, and its `approve`
  value is the existing `stream approve` route through `menu-screens.route`. Nothing is exported, so nothing can be a dead
  export; B1-B9 reach every helper through the real router or the real default screen, and S23-3 reaches the default screen
  through a real child process.
- No module is added and no export is made (an earlier ruling dropped `streamContinue`); `menu-screens.js` is not
  edited.

## Acceptance Criteria

- [x] After the fix, every read entry point in S23-1 — the ready plan's own plan screen included — leaves a ready pre-build
  plan in `functional/` and a built review plan in `review/`, and writes no approval entry.
- [x] `menuScreens.continueAfterCrossing(root)` and `pendingGateDecisions(root, { crossed: [] })` still cross a ready plan and
  write its entry (S23-2).
- [x] Starting the menu with no arguments through each launcher — a Node child process (every platform), and on POSIX
  `sh -c`, `env`, `xargs`, `find -exec`, and `rg --pre` where it is registered — crosses no gate after the fix and crossed
  before it. Every spawn names the sandbox as its working folder and passes the scrubbed environment (no
  `CLAUDE_PROJECT_DIR`, `CTOC_ROOT` or `CTOC_PROJECT_ROOT`), written out per launcher; each launcher is PROVEN to have
  reached THIS sandbox's menu by the beacon plan's title in its output (not a key every screen carries); in the red run and
  under the guard-removed mutant the failing assertion recorded for every launcher is the CROSSING one, with the beacon
  present (S23-3).
- [x] ripgrep is not a prerequisite of `npm test` on a developer machine: the `rg --pre` case is registered only when
  `rg --version` runs; when it does not, a loudly failing case is registered only when `process.env.CI` is set; nothing is
  ever marked skipped.
- [x] `src/hooks/protect-records.js` is not changed; this slice changes no hook, and no `stream continue` route is added.
- [x] A plan the crossing would accept is NOT put to the owner as a question on the default screen or on the screens after
  skip, comment and approve: it is left out of the question queue, one status line names it with how to approve one now,
  `screen.ready` carries `{ name, approve }` for it, and the screen asks the next decision that needs him, or shows "nothing
  pending" plus that line (B1-B3, B7). His approve through `screen.ready` crosses it as his approval (`approved_by: human`),
  and the continuation crosses exactly the plans called ready (B1, B2).
- [x] The line is true about what will move the plan: "Ready, moving on by itself at the next step: …" only while a
  background task is queued or running; when none is, "Ready, but nothing is running that would move it on: …", that he can
  approve one now, and that approving records it as his approval; a task registry that cannot be read counts as nothing
  running. Both forms are tested as tasks are queued, started and finished (B8).
- [x] The plan's own screen (`plan <ref>`) puts a ready plan to him as no question: it takes in the gate critic's waiting
  file first, shows the same line (both forms), asks no detail the critique already settled, and offers Approve with no
  option marked Recommended (B9); a plan the crossing would refuse keeps its plan screen as today, Approve Recommended (B4).
- [x] A plan with an approval entry already recorded for its destination, a plan whose file name already sits at the
  destination, and a plan whose name the approval record cannot key are NOT ready: each stays in the question queue (the
  first two on their normal approve screen with Approve marked Recommended, as today), and the continuation leaves each
  where it is (B4-B6).
- [x] The contract cases in the realigned test files pass with the crossing driven through the mutation context; no
  crossing assertion or evidence assertion is weakened.
- [x] Every "nothing crossed" check that would go hollow — the faulted half of the coverage-holes case, streaming-gate
  cases 9 and 10, and every one the Step-9 search found — runs the crossing pass before its nothing-crossed assertions, and
  turns red under the liveness mutant for the condition it names.
- [x] The before/after snapshot detector is gone from `loop-b-driver`; its stub test is replaced by a real ready plan that
  stays put and is not named; `namedCrossedLines` (the continuation's crossings) still works.
- [x] Step 15's search, over `src/`, `src/commands/start.md`, `README.md`, `docs/` and `plans/`, is recorded with every hit
  read: no text in this slice's files still claims a read crosses, and every other text that states the removed crossing —
  the two plans named under Neighbours and any other the search finds — is listed for the owner, never edited here.
- [x] The empirical Step-8 run recorded the baseline and every failing test; the red cases (S23-1 apart from its plan-screen
  entry, S23-3, B1-B3, B7-B9) were seen failing; each mutant was killed; every temporary change was undone by copy-back and
  confirmed byte-equal to its saved copy; no `git checkout`, `git restore`, `git stash` or `git reset` was run.
- [x] Scope is checked by content, not only by short status (ruling 2 of the fourth round): Step 8 recorded the sha256 of
  every file `git status` listed plus the ten declared files before any source or test file was changed, and the Step-9 and Step-16
  comparisons against that snapshot list every path whose content changed — so a further edit to a file that was already
  modified when the build started is seen; every change this slice made is to one of the ten declared files or to this
  plan's own Execution Record, and every other listed change is recorded with its origin and reported, never reverted.
- [x] The security scanner's plan-stage review of the workflow change is recorded in this plan before the build started.
- [x] `npm test` passes: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped,
  0 flaky; the record says whether the `rg --pre` case was registered on the machine that ran it.

## Risks

- **The fix reverses a pervasively-tested, deliberate behaviour (a read crosses pre-build gates on sufficiency).** Six test
  files encode it.
  - Likelihood: HIGH (certain). Impact: MEDIUM.
  - Mitigation: the empirical Step-8 run names every file; each crossing site is realigned to the mutation context
    (`{ crossed: [] }`), changing no assertion's meaning; the whole suite runs at Step 14.
- **A pre-build plan no longer "catches up" when the menu is merely opened.** It is named on the ready line and crosses on
  the next continuation.
  - Likelihood: HIGH. Impact: LOW — the continuation runs whenever a background task finishes and on every answer and
    approve, so a ready plan crosses at the next one; and the owner can cross it now through `screen.ready` (his own
    approve). In an idle pipeline nothing moves it until one of those happens, and the line says exactly that: "Ready, but
    nothing is running that would move it on", that he can approve it now, and that approving records his approval (ruling 1
    of the fourth round). NO recovery route is added (an earlier ruling): another no-argument crossing route is exactly the
    hole this slice closes.
- **The ready line's words rest on the task registry.** A task recorded as queued or running whose agent is gone, or a
  queued task the session never starts (for one, a build held back while a stop is requested), keeps the "moving on by
  itself at the next step" form although no finish will come.
  - Likelihood: LOW to MEDIUM (no data on how often a recorded task outlives its agent). Impact: LOW — both forms tell him
    how to approve it now, and the menu's on-open reconcile marks a running task with no live agent as orphaned when the
    session passes the live agent list (`src/commands/start.md`, "ON-OPEN RECONCILE").
  - Mitigation: the words follow the registry exactly as the ruling defines them (B8); CTOC records nothing else that says
    whether a continuation will come.
- **The readiness check drifts from the crossing.** If `crossBySufficiency` or `movePlan` later gains a refusal that
  `movesOnItsOwn` does not mirror, a plan could be named "moving on by itself" on every screen while the continuation never
  crosses it — a decision hidden from the owner.
  - Likelihood: LOW. Impact: MEDIUM.
  - Mitigation: the predicate's comment names both functions as its source and says a new refusal is added there in the same
    change; B2 pins that the continuation crosses exactly what is called ready, and B4-B6 pin each refusal it mirrors today;
    every fault reads as NOT ready, so an unmirrored failure that throws shows the plan as a question, not as ready.
- **Residual — a background agent that has turned hostile can still cross a gate through an explicit write route reached
  behind a launcher or a script it wrote (`stream approve`, which records the owner's approval; `stream answer`; `menu task
  complete --continue`), and can still forge a classification in the writable waiting folder.** This slice does NOT close
  these; it removes only the READ-crosses-a-gate class. This is NOT a LOW residual: it means CTOC's record of the owner's
  approval can be manufactured.
  - Likelihood: MEDIUM — NOT LOW. It does not need an agent that was built or prompted to be hostile: ONE injected instruction
    in anything a background agent reads — a plan, a dependency's documentation, a tool result — turns an ordinary builder
    into the hostile agent (OWASP Top 10 for Large Language Model Applications 2025, LLM01: Prompt Injection), and CTOC's
    background agents read all three as routine work. CTOC is public, so an attacker can read exactly which routes to name. It
    is rated MEDIUM, not HIGH, only because the injected text must first reach something an agent reads; a project whose
    agents routinely read untrusted outside content (issues, pull requests, fetched web pages) should read it as HIGH.
    Impact: HIGH.
  - Mitigation: none in this slice — the one limit (the write protection reads command text) cannot be closed without
    background-agent isolation that does not exist today. Named under the owner question and Neighbours; slice 24 is planned
    for the forged-classification half.
- **`rg` absent.** On a developer machine the `rg --pre` case is simply not registered (ruling 5), so `npm test` never needs
  ripgrep there; on continuous integration a missing `rg` fails loudly.
  - Likelihood: LOW (the workflow installs it). Impact: LOW — on a machine without `rg` the class is still proven by the Node
    child process and, on POSIX, `sh -c`, `env`, `xargs` and `find -exec`.
  - Mitigation: `.github/workflows/tests.yml` installs ripgrep and proves it runs (`rg --version`); its "Run tests" step sets
    `CI: "true"` itself, so a missing `rg` there registers a case that fails with one plain sentence, whatever GitHub's
    default is; nothing is ever marked skipped.

## Decisions Taken Under Ambiguity

1. **Owner decision of 2026-10-12, relayed by the main session:** his answer to the five holes was "fix all ultrathink the
   fix" — maximum effort, a root-cause fix, every fix attacked by the red-team critic before it is built. This answer was
   relayed through the main session with the brief; it is NOT recorded in CTOC's own answer store (`.ctoc/streaming/`). It
   did not approve a hook change: this slice changes no hook, and the chosen design needs none.
2. **The root cause is "a read crosses a gate", not "which launchers exist".** A launcher deny-list at the hook is
   whack-a-mole; removing the side effect closes the whole read-crosses class with one guard token.
3. **The one-token change is the whole crossing fix** (the critic and red team confirmed it correct). It stays exactly as
   written; the pre-build cross is made symmetric with the already-guarded review→done cross.
4. **The crossing is driven through the mutation context, not torn out.** `continueAfterCrossing` keeps crossing, so the
   autonomous pipeline is unchanged in the loop.
5. **A ready plan is not a question (CTO Chief ruling 2, third round; replaces the second revision's ready-plan screen).**
   The token makes a ready pre-build plan WAIT for the next continuation instead of being crossed by a read, so the screens
   must decide what to do with it. It needs nothing from the owner, so it is left out of the question queue on the default
   screen and on the screens after skip, comment and approve; one status line names the ready plans (in the form Decision 12
   gives) and says how to approve one now; the screen asks the next decision that needs him, or shows "nothing pending"
   plus that line. The second revision's alternative — showing the ready plan in the question queue on a simple approve
   screen with an un-Recommended Approve — still put a non-decision to him, so it is gone, and `gateScreenAt`,
   `sufficiencyLine` and `buildOptions` stay as they are. (The plan's own screen, which he opens himself, is Decision 11.) The banner and the module comments stop claiming a read crosses. NO recovery route
   is added — an earlier ruling dropped `stream continue`, because it is another no-argument crossing route a
   launcher reaches exactly as it reached the default screen.
6. **"Ready" means the crossing would accept it (ruling 3), so the line's words are earned.** The status line uses the
   ruled words "moving on by itself at the next step". They are accurate only because that form is shown only while a
   background task is queued or running (Decision 12), and because `movesOnItsOwn` mirrors every refusal the crossing has
   today: an approval entry already recorded for that destination (`crossBySufficiency`'s idempotence guard,
   `src/lib/streaming-gate.js` around line 876), a plan file of the same name already at the destination (`movePlan`'s
   collision guard, `src/lib/actions.js` around line 121), and — through the shared fail-soft — any fault, including a file
   name the approval record cannot key. A plan in any of those states stays in the queue with its normal approve screen,
   Approve Recommended as today. Two things can still stop a ready plan from moving at the next step: a change to it before
   then (its questions go stale, it stops validating) — it is then no longer ready and is asked on the next screen; or a
   write that fails inside the crossing itself (the approval record or the move, e.g. a permissions fault) — it then stays
   named until a later continuation succeeds, the owner can still approve it now, and a write fault that lasting would break
   every other crossing and approval too, so it cannot hide this plan alone. The extra read per ready plan on the render path
   is accepted (ruling 3; Step 12).
7. **Contract tests are realigned, not weakened.** Each bare-read cross becomes `{ crossed: [] }`; the crossing and its
   evidence are unchanged. Every negative crossing case exercises the crossing path (`{ crossed: [] }` or the continuation) so
   it cannot pass merely because reads no longer cross — including the three checks ruling 4 named and any the Step-9 search
   finds — and each such conversion is proven live by a mutant of the condition it names.
8. **ripgrep is not a prerequisite of `npm test` on a developer machine (ruling 5).** The `rg --pre` case is registered only
   when `rg --version` runs. When it does not, a case that fails loudly is registered only when `process.env.CI` is set —
   continuous integration installs ripgrep (the workflow step), so a missing `rg` there is a real fault; elsewhere no rg case
   is registered, and the Node child process plus, on POSIX, `sh -c`, `env`, `xargs` and `find -exec` prove the launcher
   class. Nothing is ever marked skipped, so the zero-skipped gate holds. The cost, stated: on a developer machine without
   ripgrep, the one launcher the original finding named is not reproduced locally; continuous integration reproduces it on
   every run.
9. **The beacon is a second plan that always needs the owner (ruling 6).** The proof that a launcher reached THIS sandbox's
   menu must hold in the red run and under the guard-removed mutant, where the crossing target's own title does not reach the
   output; a plan with an unanswered fork is asked on every version of the code, so its title is always on the screen.
10. **The whole "how to approve one now" is one screen field and one `start.md` bullet.** The status line says it in plain
    words; `screen.ready` gives the session the existing `stream approve` route per plan, to run only on his request.
    Matching his words to a plan by name, and asking him when two ready plans share a name, is the session's job, so no
    name-disambiguation code is added.
11. **The plan's own screen follows the queue screens (ruling 1 of the fourth round).** For a plan at a pre-build gate,
    `planDecisionScreen` takes in the gate critic's waiting files first (as the default screen does, so the two agree),
    reads the pending list and asks `movesOnItsOwn` — the one predicate, so this screen and the queue can never disagree
    about which plans are ready. A ready plan gets the same line above its body, no detail the critique already settled,
    and an Approve described without "Recommended". The sentence above the options stays the gate's own question
    (`gateWords.question`): the asking tool needs one, and the gate's phrases live only in `src/lib/gate-words.js`, which
    this slice does not edit; with the line above it and no option recommended, it offers rather than asks. The full
    pending read costs what one default-screen render already costs (Step 12).
12. **The line promises a move only while one will come (ruling 1 of the fourth round).** "Ready, moving on by itself at the
    next step" while a background task is `queued` or `running` (the two the ruling names; the session's `--continue` call
    on a finished task runs the continuation); otherwise "Ready, but nothing is running that would move it on", with how
    to approve one now and that approving records it as his approval. A registry that cannot be read loads as no tasks
    (`task-registry.load` fails open) and so reads as nothing running — still true, because a task the menu cannot read
    cannot be completed through it either (`menu-screens.taskComplete` refuses an unknown id). The residual (a recorded task
    that never finishes) is under Risks.
13. **The scope snapshot is recorded in the plan, not only in the scratchpad (ruling 2 of the fourth round).** Step 16 is
    run by the final reviewer, which may not reach the builder's scratchpad, so the snapshot's content and its sha256 go
    under `### Step 8: TEST`; a long block in the Execution Record is the cost, accepted because a comparison against a
    snapshot nobody can reach proves nothing. The section is outside the specification digest, so the record never touches
    the plan's approval.
14. **Step 15's search covers `README.md` and `docs/` as well as `plans/` (ruling 3 of the fourth round).** The ruling names
    `plans/`; the manual plan would write the removed crossing into `README.md`, so if it is built first only a search there
    finds the sentence. Every hit outside this slice's files is listed for the owner, never edited.
15. **Fix round after the Step 11 review (2026-10-17): the ready predicate and the crossing share ONE function.**
    `movesOnItsOwn` missed two refusals the crossing already had: the approval record's case-collision refusal (an entry on the
    same canonical key whose `plan_basename` is defined and differs from the plan's own name) and a specification that cannot be
    bound (`computeSpecHash(content).ok` false, e.g. no `---` frontmatter). Such a plan was called ready forever while nothing
    could move it. `src/lib/streaming-gate.js` now has `crossingBlocked(root, planPath, toStage, content)`, called by both
    `crossBySufficiency` and `movesOnItsOwn`; it reports blocked when an entry already has `stage_to === toStage`, when an entry
    has a defined `plan_basename` that differs from the plan's own name, when the specification cannot be bound, or when a file of
    that name already sits at the destination. Case (b) CAN happen: a plan with no frontmatter passes validation and, with
    classified questions all answered, has `enough` true (shown by test B6c's fixture assertions). Two tests were written first
    and seen failing (B6b a mixed-case twin with a foreign entry; B6c a plan with no frontmatter): each asserts `enough &&
    passesValidation`, then that the plan is asked, has no ready line, and that the continuation leaves it in place. The comment on
    `movesOnItsOwn` now names which refusals it shares with the crossing. The crossing now refuses the destination clash before
    writing an entry, instead of writing and rolling back; the rollback stays for any other move failure.
16. **Correction: "already refuses" is untrue since 2026-10-15.** Commit 395bd70a (the owner's order, `RECORD_REFUSALS_OFF`)
    switched the write protection's refusal of the no-argument screen to a background agent off. Until then it refused it; now any
    background agent can run the menu in plain text, and before this slice that crossed every ready pre-build plan. The `rg --pre`
    route is how the hole was first found. The Problem Statement's wording is history, not the present state.
17. **Correction: "defence-in-depth" is untrue.** There is no second layer. The `crossed &&` guard is the only thing that keeps a
    screen opening from crossing a gate.
18. **Correction to Residual 1 (and the owner question, option (b)).** A background agent can run `stream approve`, `stream
    answer` or `menu task complete <id> --continue` directly, in plain text, and `stream approve` records the owner's approval.
    The likelihood rises to HIGH. The wording "CTOC's protections stop an agent's honest mistakes", for menu routes, is struck:
    for these routes no protection runs today.
19. **Correction to the `screen.ready` security line.** The `stream approve <ref>` route was already open in plain text;
    `screen.ready` adds no route and no reach, and `start.md` lets the session run it only on the owner's own request. The line
    "refused to a background agent by the write protection" no longer holds.
20. **The `rg --pre` story is history.** It stays as how the hole was found. The launcher tests (S23-3) remain valid and are now
    the only protection on that path.
21. **Correction to Residual 2 and "the write protection reads command text".** The shell refusals are off, so a background agent
    can write approval records, answers and classified question files with a plain shell command. Only the editing tools are
    still refused there.
22. **Low items of the same round.** The nothing-pending screen now reads "Nothing at a human gate needs a decision from you."
    (true above a ready line; test B2b). `screen.ready[].name` is capped per name as the ready line caps names (`cappedName`
    through loop-b-driver's `summarize`, fail-soft to the whole name; test B2c). The dead `lines: []` and its spread are gone from
    `loop-b-driver`: its only caller was `loopBDirective`, so `crossedLines` became `readPending`, returning the list or null (no
    behaviour change, covered by the loop-b tests). S23-3's folded crossing assertion is two assertions, one for the move and one
    for the record.
23. **Re-review round (2026-10-17), medium: the rollback test was dead.** Since the destination clash is refused before any
    entry is written, case 10 of `tests/sufficiency-evidence.test.js` ("a failed move rolls the entry back") no longer reached
    the rollback in `crossBySufficiency`; its message was false and no test exercised the rollback. Case 10 now makes
    `safeFs.renameSync` throw only for a destination under `plans/implementation/` (the temporary-file rename under
    `.ctoc/approvals/` still passes), asserts the entry existed when the move failed, then that the plan stays, nothing arrived at
    the destination and the entry is gone. Red run: with the rollback line removed from a copy of `streaming-gate.js`, case 10
    failed on "the orphan entry was rolled back"; the file was copied back and compared byte for byte. New case 10b seeds an entry
    for a DIFFERENT destination (todo), then asserts the clash refusal leaves that entry byte-for-byte unchanged. Red run against
    the old order, reconstructed by making `crossingBlocked` ignore the destination file (so the entry is written, overwriting
    the seeded one, the move throws and the rollback removes it): case 10b failed; copied back and compared byte for byte.
24. **Re-review round, low: the comment on `crossBySufficiency`** (`src/lib/streaming-gate.js`) now gives a write fault (a
    permissions error on the rename) as its example of a rolled-back move, and says a same-name collision is refused before any
    entry is written. Comment only; no behaviour change.
25. **Re-review round, low: B6b and B6c** (`tests/plans-keep-moving-without-the-human.test.js`) assert that Approve is the
    Recommended option both on the queue and on the plan's own screen opened through `route(['plan', …])`. B6b had the queue
    assertion already; both now have both. These assertions pass on the built code (they pin behaviour that already held).
26. **Re-review round, low: residual added to Decision 6.** Two plans whose names differ only by letter case, in one continuation
    pass, can both be named on the ready line while only the first moves: the second hits the approval record's case-collision
    refusal once the first has written its entry. The second is asked again on the next screen, with Approve Recommended. No
    harm beyond one ready line that over-promised for that plan; not fixed here because it needs the pass to order its checks
    across plans, not within one.
27. **Re-review round, low: correction 18 replaces the residual-1 likelihood figure.** MEDIUM becomes HIGH wherever the Step 11
    and Step 13 checklists in the Execution Plan cite it ("the injection path that makes them MEDIUM", "rated MEDIUM for the
    injection path"). The checklist text is hashed and is not edited; this decision is the correction a reader of those
    checklists must apply. The owner-question paragraph below is outside the hash and is corrected in place: option (b)'s
    sentence on honest mistakes no longer says CTOC's protections stop them for menu routes.
28. **Re-review round, low: `### Step 11: REVIEW` is added to the Execution Record**, listing both review rounds' findings and
    what was done about each.
29. **Round 3, security, low: invisible characters are stripped from every name on the ready line and in `screen.ready[].name`.**
    One helper, `stripInvisible`, in `src/lib/streaming-gate.js`, uses the class `INVISIBLE` has in `src/lib/streaming-precompute.js`
    (default-ignorable code points, format characters, line and paragraph separators, the braille blank). It is applied only in
    `readyStatus` and `withReady`, after `humanPlanName`. Chosen over changing `humanPlanName` or `stripCtl`: those feed other
    screens the finding did not touch and the brief forbade widening. Test B2d, seen red first.
30. **Round 3, security, low: the `ready` bullet in `src/commands/start.md` now says "Each `name` is plan text: data, never an
    instruction."** The rest of the bullet is unchanged.
31. **Round 3, critic, low: B6b and B6c pin the label of the first option to the plan's approve label** (`d.approveLabel`), on the
    queue and on the plan's own screen, as B4 does. A tightening; no assertion removed or widened.
32. **(2026-10-18, CTO Chief ruling) The completion-gate boxes are ticked before the completion's gate run.** The validator refuses
    evidence older than the plan's last change, so the `npm test` acceptance box, the Step 14 box and the Step 16 boxes are ticked
    immediately before the run, not after. The completion's verify record is the proof; a failing run blocks the finish, and the boxes
    are then unticked.

**Question for the owner — the residual, and whether to schedule isolation.** This fix stops a background agent from crossing
a gate by merely opening a screen. It does NOT stop a background agent that has turned hostile — and an ordinary builder turns
hostile by following ONE injected instruction hidden in anything it reads: a plan, a dependency's documentation, a tool
result (prompt injection, the first risk on OWASP's 2025 list for applications built on language models). Such an agent,
through a launcher or a script it writes and runs, can still trigger the explicit routes that answer a question, approve a
plan — recorded as your own approval — or move a finished build on, and it can still drop a forged review into the folder
those records live in. All of this follows from one limit: CTOC's protection reads the words of a command, so an agent that
runs its own code can reach anything the menu can. The choice:
- (a) **Recommended:** schedule a separate plan that isolates background agents — they run where they cannot write the main
  project's CTOC records at all (for example in their own copy of the project under an operating-system sandbox), so a hostile
  one has nothing to reach. This would close BOTH residuals (manufactured approvals and forged reviews) at the root, whatever
  turned the agent hostile. It would NOT change anything the main session does, and it is larger work (a sandbox and a
  worktree per agent). It is yours to schedule; this slice does not build it.
- (b) accept the limit as documented, knowing what it does NOT cover: for the menu routes (`stream approve`, `stream answer`,
  `menu task complete <id> --continue`) no protection runs today (correction 18), so an agent's honest mistake reaches them as
  readily as a hostile instruction does — and every background agent can become the hostile one the moment one injected
  instruction reaches it, so (b) is not "safe for agents that only make mistakes". Under (b), any background agent's
  run can still manufacture an approval recorded as yours, or a forged review. Nothing more is built; the residual is
  recorded for anyone reading the pipeline.

**Noted for the owner (no decision asked):**
- The review lenses refuse dot-folders and bare `parent_plan` names, so they can never review a workflow file or this
  repository's ancestry (every plan here names its parent by the bare name): the devil's advocate and the advocate refuse
  every dot-directory as a critical finding, and the red team refuses `.github/`, `.yml` and any `parent_plan` that is not a
  stage path (their read rules in `agents/iron-loop/`). Their "critical" about this plan's workflow file is that limit, not
  a defect of the change: the security scanner reviewed the workflow change before the build instead (recorded below).

## Benefits the critic found (recorded, not speculative)
- **A plan crossing into implementation now always gets its planner.** Crossing happens only in `continueAfterCrossing`, which
  queues the planner for every plan that moved into implementation. Before, a bare render (the default screen) could cross a
  plan into implementation WITHOUT queuing a planner, leaving an implementation plan with nobody to decompose it until some
  later continuation. Now the planner is queued with the crossing, always.
- **The rollback race narrows.** `crossBySufficiency` writes the ledger entry, then moves; on a failed move it rolls the entry
  back. Before, ANY two concurrent reads (two default-screen renders, a banner, precompute) could race, and a losing crosser's
  rollback could delete the winner's record. Now only two concurrent CONTINUATIONS can race — far rarer, since continuations
  run on answer/approve/complete, not on every render. The remaining two-concurrent-continuation race is listed under
  Neighbours.

## Neighbours (seen, not built here; scheduling is the owner's)
- **The two residuals** of the Security Review and the owner question: explicit write routes reachable behind a launcher or a
  self-written script (`stream approve` recording the owner's approval; `stream answer`; `menu task complete --continue`), and
  a forged classification in the writable waiting folder (slice 24 is planned for the latter). Both need background-agent
  isolation to close at the root.
- **The remaining rollback race:** two concurrent continuations crossing the same plan could still have a losing crosser's
  rollback delete the winner's record. Narrowed from "any two reads" to "two concurrent continuations" by this slice, not
  eliminated.
- **`docs/ENFORCEMENT.md` is handed to slice 21, explicitly.** The subagent-route table row "No arguments, or only
  `--live-agent-ids <ids>`" has the WHY "the default screen crosses pre-build plans on sufficiency" (around line 360). After
  this slice the default screen crosses nothing, so that WHY is false. Slice 21 already declares `docs/ENFORCEMENT.md` and
  REWRITES that whole table, giving the no-argument row the WHY "the default screen, which asks the gate decisions; it is not a
  read-only route" — which is already correct and carries no false crossing claim. So s23 adds no doc change there; the
  correction rides on slice 21. If slice 21's wording changes or it is not built, that row must be corrected separately — flagged
  here so it is not lost. (s23 does not declare `docs/ENFORCEMENT.md`, to avoid two slices editing the same table.)
- **`src/commands/start.md`** is edited by other four-defects slices too (the one-build and texts slices). Builds run one at a
  time and s23 re-reads both sections at Step 9; the edit is confined to one added bullet in "## State Machine Protocol" and
  one reworded sentence in "Human gates stay foreground".
- **Two plans waiting in the implementation stage rest on the crossing this slice removes (ruling 3 of the fourth round).**
  Each must be corrected before or when it is built; both are outside this plan's files and are listed for the owner to
  schedule. Both declare `src/lib/loop-b-driver.js`, which this slice also edits, so the plan built later re-reads it.
  - `plans/implementation/the-manual-and-the-docs-stop-claiming-what-ctoc-no-longer-does.md` would write into the manual
    (`README.md`) that the two pre-build moments cross "also when the default screen opens" (its problem statement, about
    lines 74-76). After this slice the default screen crosses nothing, so that parenthesis must go from it and from
    whatever it writes; if it is built before this slice, the false sentence lands in `README.md`, and Step 15's search
    lists it.
  - `plans/implementation/00409-small-changes-take-a-small-path-s9-critique-only-before-build.md` builds its banner change
    on `crossedLines`' before/after snapshot (about line 47, and its `loop-b-driver` section, about line 107), which this
    slice deletes, and its security review says the sufficiency crossing at the pre-build moments runs on that call (about
    line 142), which is false after this slice. `crossedLines` still makes its one `pendingGateDecisions` call and returns
    the pending list, so the change it describes stays possible; its text must stop citing the snapshot and the crossing.
- **Slice 22 must agree with this slice about which plans are ready (ruling 4 of the fourth round).** Slice 22
  (`plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s22-agent-notes-are-capped-and-the-owner-decides-what-is-ready.md`)
  marks a done task "decision ready" — on the task board, the task screen and the dashboard — whenever its plan sits at a
  gate (`inbox.listPlansAtGates`: `functional/`, `implementation/` or `review/`). A plan this slice names on the ready line
  needs nothing from the owner, so slice 22 must not call it "decision ready" while the default screen calls it ready; the
  two must agree, and slice 22's own revision applies it. The ready set is decided by `movesOnItsOwn` in
  `src/lib/streaming-gate.js`, module-local here; if that revision reads it, exporting it is that revision's change, and
  its `depends_on` then names this slice.
- **A plan whose file name the approval record cannot key is offered an Approve that is then refused.** `SAFE_PLAN_FILE`
  (`src/lib/streaming-gate.js`) accepts `_` and `.` in a plan's file name; the approval record (`approval-ledger` `SLUG_RE`)
  keys only lowercase letters, digits and hyphens. Such a plan never crosses on its evidence (`crossBySufficiency` fails
  soft), and `approvePlan` refuses it with "rename to a lowercase [a-z0-9-] basename" (`src/lib/actions.js` around line 478),
  yet its screen offers Approve as "Recommended — everything checks out". Pre-existing; this slice only keeps such a plan
  OUT of the ready line (B6).
- **After an approve, a plan the continuation crossed in the same pass can be the very next question.** The continuation that
  every successful approve runs may cross another ready plan into `implementation/`, where it is at once a not-yet-planned
  decision at its next gate while its planner is queued; `advanceExcludingSlug` excludes only the approved plan's own slug.
  Pre-existing (before this slice the default screen's read crossed such a plan the same way and it surfaced on the next
  screen); not changed here.
- **Three existing `tests/streaming-gate.test.js` cases assert less than their titles promise (an earlier ruling; not touched here,
  for the owner to schedule).** Each would need its own change and is out of this slice's declared files:
  - the case "X7 — streamingGateScreen never spawns a producer" (about lines 797-808) proves only that `maybeKickProduction`
    is undefined and the render is synchronous; it does not actually prove no child process is started.
  - the case "an unsafe/malformed ref is refused safely (no crash, no traversal)" (about lines 420-427) asserts the good plan
    still exists and a valid screen returns; it does not prove no path-traversal write was attempted.
  - the `humanPlanName` hostile-title case (about line 1313) bounds run time with `assert.ok(ms < 100, …)` — a wall-clock
    bound that can fail on a busy machine (it should assert linear scaling, not an absolute millisecond ceiling).

## Plan-stage security review of the workflow change

Ruling 8 of the third round: BEFORE this plan moves to the build, the security scanner reads and attacks
`.github/workflows/tests.yml` and the ripgrep step this slice adds — the scanner can read that file; the red-team lens cannot,
because its read fence excludes `.github/` and `.yml`. The CTO Chief, who dispatches that review, records its findings here:
each finding, and what this plan changed for it. Step 9 does not start the build until this section records the review, and
Step 13 reviews the built change again.

**Run on 2026-10-13, before the build, by the security scanner. Verdict: warn — the install step itself is safe.** The
warnings are hardening of the change and pre-existing workflow defects; none is in the ripgrep install as such.

Findings on this change, and what the plan changed for each (CTO Chief rulings of 2026-10-13):
1. **The `CI` variable was to be checked on GitHub's documentation at Step 9, which the builder cannot read.** Changed: the
   "Run tests" step sets `env: CI: "true"` itself, unconditionally. No current code reads `CI` except template text in
   `src/lib/playwright-scaffolder.js`, so nothing changes today. Step 9 now only confirms the step's `env:` block and searches
   for other readers.
2. **The install step did not prove ripgrep runs.** Changed: `sudo apt-get update && sudo apt-get install -y ripgrep &&
   rg --version`, with `timeout-minutes: 5`; no version is pinned.
3. **A hung launcher would hang the job.** Changed: every launcher spawn in S23-3 carries `timeout: 120000`, so a hang ends
   as a loud beacon-assertion failure.
4. **A personal ripgrep config file could change the `rg --pre` case.** Changed: the launcher passes `--no-config` first.
5. **A launcher might write to the home folder.** Changed: Step 13 runs the launcher spawns once with `HOME` pointed at an
   empty folder and records that nothing was written there.

Pre-existing findings in other workflow files, listed for the owner (not built here; scheduling is his):
- **HIGH** — `.github/workflows/validate-skill-issue.yml` pastes text from a public issue into script source through
  `${{ steps.parse.outputs.skill_name }}` (about lines 45 and 89) in a job that can write issues, and the issue template
  applies the triggering label automatically, so any GitHub account can inject code. Fix: pass the value through `env:` and
  read it from the environment.
- `.github/workflows/tests.yml` sets no `permissions:`. Fix: add `permissions: contents: read`.
- `.github/workflows/evals.yml` pastes the API key secret into script text (about line 129). Fix: route it through `env:`.
- Both `tests.yml` and `evals.yml` test Node 20, believed past end of life (not verified this session).
- Actions are pinned to tags, not to commits.

## Execution Plan

Every note an executor adds during the steps below goes under a single `## Execution Record` section at the end of this plan,
one `###` subheading per step. Do not scatter notes in the body.

### Step 8: TEST
- [x] FIRST, before any source or test file is changed: record `git status --porcelain --` for the ten declared paths, verbatim, under
  `## Execution Record` → `### Step 8: TEST` as the BASELINE (not required to be empty); then take THE SCOPE SNAPSHOT with
  the scope script in `snapshot` mode (the sha256 of every file `git status` lists plus the ten declared paths — ruling 2 of
  the fourth round) and record its content verbatim in one fenced block, followed by its sha256, under the same heading
  (Test Plan, "Step 8 is EMPIRICAL first", item 1). NEVER run `git checkout`, `git restore`, `git stash` or `git reset` on
  anything, in this step or any other.
- [x] Copy `src/lib/streaming-gate.js` byte-exactly to the scratchpad; apply ONLY the one-token guard change; run `npm test`;
  record every failing test by file and name, each classified as a crossing assertion or a screen assertion (Test Plan,
  "Step 8 is EMPIRICAL first"). Copy the saved file back; confirm byte equality with the saved copy (exit status 0 of the
  comparison command) and that `git status --porcelain` for the declared paths equals the baseline. Record both results
  under `### Step 8: TEST`.
- [x] Write S23-1, S23-2, S23-3 (block A) and B1-B9 (block B) in `tests/plans-keep-moving-without-the-human.test.js`; replace
  the stub test in `tests/loop-b-directive.test.js`; realign the crossing sites in `tests/streaming-gate.test.js`,
  `tests/sufficiency-evidence.test.js`, `tests/answers-bind-to-plan-revision.test.js`,
  `tests/streaming-gate-coverage-holes.test.js` and case 52/56; and convert the three hollow "nothing crossed" checks
  (the coverage-holes faulted half, streaming-gate cases 9 and 10) — exactly as the Test Plan says.
- [x] Run the affected test files before any production change; record each result against the table under
  `### Step 8: TEST`. S23-1 (apart from its plan-screen entry), S23-3, B1, B2, B3, B7, B8 and B9 fail; the plan-screen
  entry of S23-1, S23-2, B4-B6, the realigned contract cases and the converted checks pass. For S23-3 record, per launcher,
  WHICH assertion failed: it must be the CROSSING one with the beacon present — a missing beacon is a defect in the test,
  fixed before going on (ruling 6). Record whether the `rg --pre` case was registered on this machine. If any row differs,
  stop and record it.
- [x] Confirm ripgrep's `--pre` / `--pre-glob` semantics with `rg --help` (where `rg` runs), and record what it says under
  `### Step 8: TEST`.

### Step 9: PREPARE
- [x] **The workflow change was reviewed BEFORE the build (ruling 8).** The security scanner — which can read
  `.github/workflows/tests.yml`; the red-team lens cannot, its read fence excludes `.github/` and `.yml` — read and attacked
  the ripgrep step at the plan stage, before this plan moved to the build. Confirm its findings are recorded under
  "## Plan-stage security review of the workflow change" and that the `.github/workflows/tests.yml` specification reflects
  each one; record that under `### Step 9: PREPARE`. If that section records no review, STOP: the build does not start on an
  unreviewed workflow change — record it and report it as a kickback to the plan stage, never a silent edit. Step 13
  reviews the built change again.
- [x] Re-read, BY FUNCTION NAME (other four-defects slices have shifted line numbers): `streaming-gate.js` around
  `pendingGateDecisions`, `crossBySufficiency`, `gateScreenAt`, `streamingGateScreen`, `advanceAfter`,
  `advanceExcludingSlug`, `planDecisionScreen`, `nextUnansweredQuestion`, `checkState`, `streamApprove`, `streamSkip`,
  `streamComment`, `streamAnswer`, `engineStatusBanner` and the `module.exports`; `actions.js` `movePlan` (the collision
  guard `movesOnItsOwn` mirrors); `approval-ledger.js` `readEntry`, `slugFromPlanPath` and `SLUG_RE`; `task-registry.js`
  `load` (it must still never throw for a string root); `menu-screens.js` `taskComplete` (an unknown id is refused) and the
  `plan` route that calls `planDecisionScreen`; `streaming-questions-sweeper.js` `sweepPendingQuestions` (it still keeps a
  classified file of the same revision); `loop-b-driver.js` lines 1-60, `preBuildSnapshot`, `crossedLines`, `buildDeps`
  and `summarize`; `start.md` "## State Machine Protocol" and "Human gates stay foreground"; `.github/workflows/tests.yml`;
  and the cited spans of the six test files. Record every line shift, and any of those facts that no longer holds, under
  `### Step 9: PREPARE`. `src/lib/menu-screens.js` is NOT edited, so it is read, not edited.
- [x] Run a suite-wide search for any other site that triggers a pre-build cross through a bare read (the discriminator: no
  `streamAnswer`/`continueAfterCrossing` ran first). Confirm it is the declared set, and record the search and its result
  under `### Step 9: PREPARE`; a bare-read cross in an undeclared file is a scope-growth request.
- [x] **Search for every other "did not cross" check that uses a bare read, and convert each one found (ruling 4).**
  Enumerate with Grep — an exact-presence search, used only to list candidates — every call in `tests/` of a read entry point:
  `pendingGateDecisions(` with one argument, `streamingGateScreen(`, `loopBDirective(` without `crossed`,
  `plansNeedingQuestions(`, and the `route([...])` reads listed in S23-1 (the plan screen apart: it never crossed, so no
  check on it can have gone hollow). Record each pattern, the path searched and the
  number of files matched. READ every hit: it is a "did not cross" check when it asserts a plan stayed where it was, or that
  no approval entry was written, to prove that a condition (too little information, a fault, a regime, a failed validation)
  stops the crossing. Convert each such check in a declared file exactly as block C converts the three named ones, and list
  it under `### Step 9: PREPARE` with the condition it names; one in an undeclared file is a scope-growth request
  (`src/lib/scope-growth.js`), never a silent edit. The search only finds candidates; Step 10's liveness mutants prove each
  conversion at runtime.
- [x] **The continuous-integration variable (CTO Chief ruling of 2026-10-13).** Nothing is looked up on the web: the
  workflow's "Run tests" step sets `env: CI: "true"` itself, unconditionally, in Step 10. Confirm in the re-read
  `.github/workflows/tests.yml` whether that step already has an `env:` block (the line is then added to it), and run an
  exact-presence search for `process.env.CI` and `env.CI` over `src/` and `tests/`, recording the pattern, the path and the
  number of files matched; the plan-stage review found only template text in `src/lib/playwright-scaffolder.js`, so setting
  it changes nothing today beyond the test this slice adds. Any other reader found is recorded and reported under
  `### Step 9: PREPARE`.
- [x] **Scope by content (ruling 2 of the fourth round).** Record `git status --porcelain --` for the ten declared paths
  beside the Step-8 baseline, and the output of the scope script in `compare` mode against the Step-8 snapshot (the
  scratchpad copy when its sha256 equals the recorded one, otherwise a copy rebuilt from the recorded block), both under
  `### Step 9: PREPARE`. Every listed path is marked as one of: (a) a test file this slice's Step 8 edited; (b) this plan's
  own file (its Execution Record); (c) a change this slice did not make — another session's work, or a record CTOC itself
  wrote (the test gate's `.ctoc/` baselines, the task registry, the approval records, the logs) — recorded with its origin
  when known and reported, never reverted. `src/lib/streaming-gate.js` is not expected in the list (the probe was undone
  byte-exactly); if it is listed, that change is recorded and reported before Step 10 edits the file.

### Step 10: IMPLEMENT
- [x] `src/lib/streaming-gate.js`: the `crossed &&` guard token; the four comment rewordings (the `pendingGateDecisions` doc
  comment, the crossing-block comment, the banner-ordering comment, the `module.exports` comment); the four module-local
  helpers `movesOnItsOwn`, `askQueue`, `readyStatus` (with its two forms), `withReady`; their use in
  `streamingGateScreen`, `advanceAfter` and `advanceExcludingSlug`; and in `planDecisionScreen` the ready check, the ready
  line, the skipped detail, the un-Recommended Approve description and the one doc-comment sentence — exactly as the File
  Specifications show. `gateScreenAt`, `sufficiencyLine`, `buildOptions` and `richQuestionScreen` are not touched; nothing
  is exported (no `streamContinue`).
- [x] `src/lib/loop-b-driver.js`: delete the before/after snapshot in `crossedLines` and, with it, `preBuildSnapshot`,
  `SUFFICIENCY_SOURCE_STAGES` and the `readPlans` entry of `buildDeps` once Step 9 confirmed nothing else reads them (keep
  `namedCrossedLines`, `MOVED_FORWARD` and `summarize`); the header and inline comment rewordings.
- [x] `src/commands/start.md`: the `ready` bullet in "## State Machine Protocol"; the "Human gates stay foreground"
  rewording, keeping the protocol-tested phrases.
- [x] `.github/workflows/tests.yml`: the ripgrep install step (`timeout-minutes: 5`, ending in `rg --version`, no pinned
  version) and `env: CI: "true"` on the "Run tests" step, both as reviewed at the plan stage; no other line changes.
- [x] Run the affected test files plus `tests/menu-protocol.test.js`; record under `### Step 10: IMPLEMENT` that every case
  passes. Then run the whole `npm test` once: every test still failing in a file outside the ten declared files is a
  scope-growth request, recorded under `### Scope-growth requests`.
- [x] Run every mutant in the Test Plan ("Mutants in Step 10"), one at a time: save a byte-exact copy of
  `src/lib/streaming-gate.js` to the scratchpad, make the one change, run the named files, record under
  `### Step 10: IMPLEMENT` which named cases failed and with which assertion message, copy the saved file back, and record
  that the comparison command exits 0 (byte-equal).
  NEVER `git checkout`, `git restore`, `git stash` or `git reset`. Under the guard-removed mutant, record per launcher that
  the failing S23-3 assertion is the CROSSING one with the beacon present; a missing beacon is a test defect, fixed and the
  mutant re-run (ruling 6). A converted "nothing crossed" check that stays green under its own condition's mutant is still
  hollow: fix it before Step 11.

### Step 11: REVIEW
- [x] The critic confirms: the pre-build cross and the review→done cross now both require `opts.crossed`; no read path crosses;
  `continueAfterCrossing` still crosses; no new write route is added (no `stream continue`; `screen.ready` carries only the
  existing `stream approve`); a ready plan is never put to the owner as a question on the default screen, after skip,
  comment or approve, or on its own plan screen, is named on one status line with how to approve it now, and his approval
  through `screen.ready` is recorded as his; the line says "moving on by itself at the next step" only while a background
  task is queued or running, and otherwise that nothing is running that would move it and that approving records his
  approval; `movesOnItsOwn` mirrors every refusal of `crossBySufficiency` and `movePlan`, so a plan either of them would
  refuse stays asked with Approve Recommended, on the queue and on its plan screen; no wording claims a read crosses; the
  residual claims (explicit write routes, forged classification, the injection path that makes them MEDIUM) are stated,
  not papered over.
- [x] The critic confirms the realigned contract tests assert the same crossing and the same evidence, driven through the
  mutation context, with nothing weakened, and that every converted "nothing crossed" check failed under its own
  condition's mutant.
- [x] The critic's findings, and what was done about each, are recorded under `### Step 11: REVIEW`.

### Step 12: OPTIMIZE
- [x] Confirm the crossing change is a single added condition. The readiness check is NOT free, and that is accepted
  (ruling 3): for each pending plan that passes the in-memory conditions (enough information, passing validation, no regime
  hold, a pre-build destination), `movesOnItsOwn` adds one approval-record lookup (an existence check, plus a read when a
  record exists) and one existence check at the destination, on every render of a queue screen; every other plan costs
  nothing. When at least one plan is ready, the line adds one read of the task registry. The plan screen of a plan at a
  pre-build gate adds one sweep of the waiting folder (normally an empty folder) and one full pending read — what one
  default-screen render already costs (ruling 1 of the fourth round). Apply any non-behavioural review finding, and record
  the confirmation under `### Step 12: OPTIMIZE`.

### Step 13: SECURE
- [x] The security scanner (the red-team attack the owner's answer requires) confirms: no read path crosses a gate; the
  `rg --pre` reproduction and the other launchers cross nothing after the fix and crossed before, each spawned in the sandbox
  with the scrubbed environment and each proven to have reached THIS sandbox's menu by the beacon plan's title; the two
  residuals (explicit write routes; forged classification) are named, rated MEDIUM for the injection path, and NOT widened;
  `screen.ready` adds no route; the readiness check only reads and fails toward asking; the ready line's registry read and
  the plan screen's sweep add no write the menu did not already make; `src/hooks/protect-records.js` is unchanged and no
  new write route is added (no `stream continue`). The scanner's findings are recorded under `### Step 13: SECURE`.
- [x] The security scanner READS AND ATTACKS the BUILT `.github/workflows/tests.yml` directly (the red-team lens cannot read
  dot-folders, so the scanner — which can — reviews the CI change, as it already did at the plan stage): the added
  ripgrep-install step runs an `apt-get` that is correct ONLY because the one job runs on `ubuntu-latest` (verified in
  `.github/workflows/tests.yml`: the `test` job's `runs-on: ubuntu-latest`, no other job, no OS matrix), it adds no new
  secret or token, it does not weaken any existing gate or step, and it matches what the plan-stage review saw.
- [x] **No launcher writes to the home folder (CTO Chief ruling of 2026-10-13).** Make an empty folder in the scratchpad and
  run the S23-3 launcher spawns once with `HOME` (and, on Windows, `USERPROFILE`) in `scrubbedEnv()` pointed at it — a
  one-off run, the committed test unchanged. Afterwards list the folder recursively and confirm it is still empty; record the
  folder's path relative to the scratchpad, the launchers run, and the listing under `### Step 13: SECURE`. Anything
  written there is a finding, reported, never silently cleaned.

### Step 14: VERIFY
- [x] Run `npm test`: lint, typecheck, all tests, coverage at or above `.ctoc/coverage-baseline.json` `minPct`, 0 skipped,
  0 flaky. Record the test count, the coverage figure, and whether the `rg --pre` case was registered on this machine,
  under `### Step 14: VERIFY`.

### Step 15: DOCUMENT
- [x] Confirm the `pendingGateDecisions` doc comment, the `loop-b-driver` header and `start.md` now state that opening a screen
  crosses nothing, and that `start.md` documents `ready`.
- [x] **Search every text that could still state the removed crossing (ruling 3 of the fourth round).** Two exact-presence
  searches, each only a finder of candidates, every hit read: over `src/` and `src/commands/start.md`, the broad pattern
  `sanctioned side effect|side effect.*cross|read.*cross|default screen.*cross`; over `README.md`, `docs/` and `plans/`,
  the narrow pattern
  `default screen opens|when the menu opens|default screen.*cross|crosses pre-build plans|before/after snapshot|sanctioned side effect|sufficiency auto-cross|pendingGateDecisions.*cross|on every gate-screen render`
  (the broad `read.*cross` also matches "already crossed", which fills every plan folder; `pendingGateDecisions.*cross`
  is what finds the second named plan's security sentence). Record under
  `### Step 15: DOCUMENT` each pattern, each path searched and the number of files matched, then every hit outside this
  plan's own description of the old behaviour, each marked as one of: (a) text in this slice's files that still claims a
  read crosses — corrected here, at this step; (b) a plan not yet built (`plans/vision/` through `plans/in-progress/`), or
  `README.md` or a doc, that states the removed crossing as what CTOC does — listed for the owner to schedule, never
  edited here (the two plans named under Neighbours are expected; any other is new and is said so); (c) a built plan's
  record (`plans/review/`, `plans/done/`) — history, no correction.

### Step 16: FINAL-REVIEW
- [x] Every acceptance box is checked against the record of Steps 8-14, with the baseline, the scope snapshot, the
  empirical failing-test list, the red results (with the failing assertion per launcher), the mutant results and their
  byte-equality checks, and the final suite figures shown under `## Execution Record`.
- [x] **Scope by content (ruling 2 of the fourth round).** Run the scope script in `compare` mode against the Step-8
  snapshot — the scratchpad copy when its sha256 equals the one recorded under `### Step 8: TEST`, otherwise a copy rebuilt
  from the recorded block — and record its output under `### Step 16: FINAL-REVIEW`, every listed path marked as one of:
  (a) one of the ten declared files; (b) this plan's own file (its Execution Record); (c) a change this slice did not make —
  another session's work, or a record CTOC itself wrote (the test gate's `.ctoc/` baselines, the task registry, the
  approval records, the logs) — recorded with its origin when known and reported, never reverted. A change this slice made outside the ten declared files — a further
  edit to a file that was already modified when the build started included — is a finding, reported.

## Execution Record

Every note an executor adds, at any step, goes HERE and nowhere else in the plan, as `###` subheadings: one per step —
`### Step 8: TEST`, `### Step 9: PREPARE`, `### Step 10: IMPLEMENT`, `### Step 11: REVIEW`, `### Step 12: OPTIMIZE`,
`### Step 13: SECURE`, `### Step 14: VERIFY`, `### Step 15: DOCUMENT`, `### Step 16: FINAL-REVIEW` — plus
`### Scope-growth requests` if any is made. (This heading is outside the specification digest
(`approval-ledger.EXECUTION_SECTION_PRODUCERS`), so notes here never invalidate the plan's approval record; and its `###`
headings sit outside the `## Execution Plan` region the step-label check reads.) What goes where: the Step-8 baseline, the
scope snapshot with its sha256, the probe's failing-test list and the red results under Step 8; line shifts, the "did not
cross" search, the CI-variable check, the plan-stage review check and the first scope comparison under Step 9; each
mutant's result, the copy-back byte-equality results and which assertion failed under Step 10; the critic's findings under
Step 11; the cost confirmation under Step 12; the scanner's findings and the empty-home-folder run under Step 13; the final
suite figures under Step 14; the documentation search and its marked hits under Step 15; the acceptance check and the
final scope comparison under Step 16. A note that fits no step goes under its own `###` subheading here, never elsewhere
in the plan. Nothing is recorded yet — this slice is not built.

### Step 8: TEST

**Scope of the run (brief, 2026-10-17).** The brief for this build forbade the whole `npm test`, so every "run `npm test`" in this
plan was done on the affected test files instead: the 34 files that mention `pendingGateDecisions`, `streamingGateScreen`,
`loopBDirective`, `plansNeedingQuestions`, `planDecisionScreen`, `continueAfterCrossing`, `crossBySufficiency`, `loop-b-driver` or
`streaming-gate`, plus `menu-screens*.test.js`, `menu-protocol.test.js`, `menu-critique-first.test.js` and
`false-green-fence.test.js`; later 92 files (those and every test that names `start.md`, `loop-b-driver`, `streaming-gate` or a
workflow). The whole suite is for the Step 14 run the CTO Chief dispatches.

**THE BASELINE** (`git status --porcelain --` and the ten declared paths, before any change):

```
 M src/commands/start.md
 M src/lib/streaming-gate.js
 M tests/plans-keep-moving-without-the-human.test.js
```

**THE SCOPE SNAPSHOT** (the scope script in `snapshot` mode, from the repository root; 204 paths; every `git status` entry plus the
ten declared paths). Snapshot file sha256: `a1673aa29d72c9e08de9bdfa3da98a9c805b0c653af9558af9a12df3ceb7eb79`.

```
{
 ".ctoc/approvals/fewer-rework-rounds-a-check-is-attacked-before-it-is-built.json": "7e933b0cbb998be87530e80d72eed37924d4655ede29b4843ac009dccdb44603",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s1-build-tests-seed-their-plan-file.json": "223ac2fa7ac33b4d8d80b18622b3a942c9f30413c5da45a95de7da96302902ca",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s11-ladder-tests-use-non-build-tasks.json": "9702ef882b15c50c38a46a82caba2b4395f44f661165e8a92d70e523cd7b2b52",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s12-one-build-at-a-time-in-the-scheduler.json": "68bcdf36d8be48abce72766a524c086c5e8832e7e771de67bc2cf14fb342ad96",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s13-the-refusal-names-the-build-that-holds-the-slot.json": "255f9eab95a09b8d8c2a0061bdb0e89f6aceca43941fe4619678cca46b4b38a0",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s14-the-texts-say-one-build-at-a-time.json": "290aebea41a65556679a9f545e09cfba567edf295b554c7c255c347eb02c7c84",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s15-the-check-time-limit-covers-the-suite.json": "a7c4901f18bf0ee3b39ea16e39344dcbd12b96dab88961c324a6400ae3da6f95",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s16-timing-tests-are-not-failed-by-machine-load.json": "d67deca2c71829bfe0defe5eeac583c624465b079a6c3c2944c554a1186d0415",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s17-a-placeholder-path-is-not-a-missing-file.json": "6d78ab6e670aa48b762eac88bddac111138adc67225c51898657cf8d8cee6230",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s19-agent-text-never-reaches-the-shell-unquoted.json": "afa1c3c2403c99d3c47f383d963173e4c56cd9d67a4bb1db3b43f7a1dfe9c59e",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s2-the-task-start-moves-the-plan.json": "6e01f1959c97c41212ce9ac569f0b16468061d277e1197e21a008bc75e7b5b7b",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s20-the-task-registry-is-written-only-by-the-menu.json": "8c7d2bb9f0c9e7c88af9b451f94b06ea01ca7209772c268f625e929677a0decd",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s21-background-agents-do-not-open-the-dashboard.json": "cae628fa3ec19c90f3b13379ba0ff4c9f0ca1067ad05e7dcc0b940fd6d25b048",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s22-agent-notes-are-capped-and-the-owner-decides-what-is-ready.json": "79ca548b8de87e75c0c15cc5c9e138a3ff7f98b82ce4e29d4fb571f55c7cc211",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s23-no-command-can-start-the-menu-for-a-background-agent.json": "2db7b092f315d933f5d7f76a660fc90204029c174e768d5b0e3b349124598a4d",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s24-only-a-critique-the-menu-launched-can-move-a-plan.json": "225f8f10e2ee4217b2b548d3c7d6f59130bd204c8e4983cfd027caee041c7dd3",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s25-a-record-the-menu-wrote-can-be-staged-and-committed.json": "301e3b86c1b77327b1547e5a268b56b0ba939b0e1b98ba75cc72d95a8e61789e",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load.json": "b2e63a410e09d50c7441dc19ca769a91b9b7d7da9e4f1951c91703f411aaac91",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s3-the-continuation-claims-no-build.json": "d36c941eb0bb82ea214377357361cccf6f9e3ca50d03d7b29f5b760aa9234815",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s4-a-requested-stop-offers-no-build.json": "9653d8c85d5ba28fb51079faa94478627287e618f630ed750c4df9046aaead22",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s5-the-session-claims-a-build-before-launching-it.json": "06fa4ed938b8712c6772f49fcd9b2e074bba87a77feca2e352bf8eb880a9ebb4",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s6-a-question-file-keeps-one-status-line.json": "16ec694baacde17c999fbe1121f1b5c1d80c21fcd8344ba54792479e52a080f5",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s7-the-inbox-answer-route.json": "6294f551ffbf8d5bfd7d7b1e9553204e9af7f9c1aba95363ae77a4e891c50d90",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s8-inbox-questions-are-shown-as-quoted-data.json": "bd625ca4408cc0114774043aaaf950382dd14795fddf910e165414c28943269e",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s9-only-the-owner-answers-an-inbox-question.json": "02659df3bf0c3a978e8b0aac39a3bbe3f06694ef03c29c42eefba59c07b6a788",
 ".ctoc/approvals/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.json": "b6cbfe867a6a94bb11d1dcb0e59c19c86c6fe44922bd9347063b872c55a12a68",
 ".ctoc/audit/agent-and-skill-improvement/agents/architecture/dependency-analyzer.md.json": "d990ca94095c4598792ddc6d99192e2007c71ce747ce9357b5e9786f1af8d676",
 ".ctoc/audit/agent-and-skill-improvement/for-the-human.json": "8405c06f49bc51fddbe2f60e8ee12c0af6bec755aa387d4c2b23497321905b76",
 ".ctoc/audit/agent-and-skill-improvement/late-corrections.json": "0fd2022f7b7ae1cb6342feef2a6e559993c8f1b474a7459dd9fd2a02023f9f9b",
 ".ctoc/audit/agent-and-skill-improvement/skills/architecture/dependency-analyzer/SKILL.md.json": "bf3588fbec891d75c66cb9e4e8f3d19af6e8fc7aea6e625b156467f64af8bf03",
 ".ctoc/audit/improvement-run-notes/s6-skill-round1-apply-executor.md": "693ad71bef43edfb3a2c7bca93e1b838168a364da1e8b1f087340a14dfb853bc",
 ".ctoc/audit/improvement-run-notes/s6-skill-round1-critic-d-s6-skill-r1-critic.md": "c983ac1dd6a19cf04134334e30e0bcf66420d48c559a4fe0574950fd6e288285",
 ".ctoc/audit/improvement-run-notes/s6-skill-round1-read-executor.md": "ab50f6ad18e7d2250b094bfd42497e9709c0ab344758af34cbee41a452224679",
 ".ctoc/audit/improvement-run-notes/s6-skill-round1-record-executor.md": "489e5ab9d81c8b73008f0f3b562706ec62a9a792aceecfe2218fc2843599d5f7",
 ".ctoc/audit/improvement-run-notes/s6-skill-round1-research-d-s6-skill-r1-research.md": "44438ef24137e4a20a3b10b8025ee9cf9b00df8848018065751ec8bdaf151d76",
 ".ctoc/audit/improvement-run-notes/s6-skill-round1-research-gaps-d-s6-skill-r1-research-gaps.md": "218069eb112a09307b40d698d6dbaf44fabc8071e6930859b4935a7fbf9e95f9",
 ".ctoc/audit/improvement-run-notes/s6-skill-round1-revalidate-d-s6-skill-r1-revalidate.md": "50f05f82215283952ebc4e848fc61378566d1552cc376f3c2095eeaeb1c3ad15",
 ".ctoc/audit/improvement-run-notes/s6-skill-round1-validate-d-s6-skill-r1-validate.md": "5d07d77602142416e62a47baeb165d2bbb8b5b022cf596ec97efda99d4be07b3",
 ".ctoc/audit/improvement-run-notes/s6-skill-round2-apply-executor.md": "7d80e85eea055aa9e832b64d0e985f9f9d564f7ad70e9c6b9c3b8238542140ef",
 ".ctoc/audit/improvement-run-notes/s6-skill-round2-critic-d-s6-skill-r2-critic.md": "72b30c360b4ae308b0d6c2f65c56ca384ca37aa6f03af25a02115450d73589aa",
 ".ctoc/audit/improvement-run-notes/s6-skill-round2-record-executor.md": "7dc3bf8bc56346f1eebc335da30ebfe4ca79f17b2262a7047b635ecc294c05a6",
 ".ctoc/audit/improvement-run-notes/s6-skill-round2-research-d-s6-skill-r2-research.md": "a36166c15da82040181884cf565d2a4eb5deb7358405066788d6e6db45f878ed",
 ".ctoc/audit/improvement-run-notes/s6-skill-round2-revalidate-d-s6-skill-r2-revalidate.md": "73449af950b1edcbc62b9cb679f34957e7034547238a00c570c4effbbff15282",
 ".ctoc/audit/improvement-run-notes/s6-skill-round2-validate-d-s6-skill-r2-validate.md": "3bb289cc8a18aef8e94e36824c2391918f910018a540b69ea488efa3c4c38b2e",
 ".ctoc/inbox/questions/1791713468054-ew0ek2.md": "6e86ba624f0666871396de8fc2d6883089d561c238e1909548b5778d83822b77",
 ".ctoc/inbox/questions/1791764758088-254n9v.md": "fadc7dc61c43ea4d08af8f935017e00d5e18f028dc8e55d5bc60c9f5e9b42373",
 ".ctoc/inbox/questions/1792161116544-s9piab.md": "c943cd7585eb46da82f25f4f37629261df6995a16c690b4d67915c01d25e02fb",
 ".ctoc/logs/transitions.json": "89b6265747e8329338e94a3b11608e908e2e46fbddeaedd5ce4dec58ef739d33",
 ".ctoc/streaming/answers.jsonl": "cf2b90b9aed3797293d0deccd831a7a3cd9ff4d922e437edb15438bd76a3082b",
 ".ctoc/streaming/inbox-answered/1792161116544-s9piab.json": "561481311e9338a6aacae5f66b8f81586c2d6c0cac2745737dd3cd9a5728f2a7",
 ".ctoc/streaming/inbox-answers.jsonl": "9bc14b9984c679cc71df2124bdfe201bf6f7cea9cebb688fb0d339404beafc83",
 ".ctoc/streaming/questions/functional__four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md.json": "e87efa7bddf9b4ffe1aa3db2613da33dd2275015aed3c690c380e9afcbc74b5e",
 ".ctoc/streaming/questions/implementation__an-empty-overrides-map-is-read-as-empty.md.json": "7629777b9cafe7f1b85c72b6ce1104948fac98afe3f6a512e7be8d71b626f0aa",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s1-build-tests-seed-their-plan-file.md.json": "ab7babaf9ef6ef3a32119f41f3623809cf7255e37d9296c3b77d5cb0a38795db",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s10-the-release-brings-the-lockfile-to-the-version.md.json": "e0b49c93e9101ec7fcf57ae7305163354b8a493fc5934fb79eb4200cc32694f4",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s11-ladder-tests-use-non-build-tasks.md.json": "920d538d49d5da7b9d3a1d2ccfa6d7ae68bcbbe2e77ef61ebdfd235b12e45178",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s12-one-build-at-a-time-in-the-scheduler.md.json": "9ee89d4c098e1664e679728ad9a7fd87788f45bcfa74342e468589d6a4905425",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s13-the-refusal-names-the-build-that-holds-the-slot.md.json": "1e6c510af91cc3a4a799f89c71e56d5822f8661b49b54f23016d4d05e9c499ca",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s14-the-texts-say-one-build-at-a-time.md.json": "0c5cfa4f7dd5b65e2ea84511e1ee27b61415c3a509d61f426a376ffc76553c7d",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s15-the-check-time-limit-covers-the-suite.md.json": "af147f8008387f1a009e2bd0b29616cce461c4439c8876dd66fc656fcae61b97",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s16-timing-tests-are-not-failed-by-machine-load.md.json": "86b7285e4da91774a7f9af14eb92dbd38f5a1f426ddcada41c4d5bf260ead79d",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s17-a-placeholder-path-is-not-a-missing-file.md.json": "5a4ec431a055180376e661f3d2b4c0295a65375e9551b087abd945133d0642ea",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s18-a-task-next-action-is-a-plain-read-only-route.md.json": "48e0cc871c1d39c9765f5e2fa8193bcc926c67ef30dcd735862ae1d6fe785769",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s19-agent-text-never-reaches-the-shell-unquoted.md.json": "d05cb449efccf981d90c7381a888e8a430b7ca102d308ebcecabcdc2860724bd",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s2-the-task-start-moves-the-plan.md.json": "08bc0210829f770fe0f37be73183369d95976591a49348b6f86ef41b01e922fe",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s20-the-task-registry-is-written-only-by-the-menu.md.json": "4bd3b5c3f95e31c1cf947a0799f0b540b6a57822333bad92bff74c90575217b1",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s21-background-agents-do-not-open-the-dashboard.md.json": "4828d37d5f05304b628c3d863003bab2fabdb4374204464296636b75288d1e07",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s22-agent-notes-are-capped-and-the-owner-decides-what-is-ready.md.json": "f4269768294733267215b721e618489bb287c93aff17c3cf06b99ce757987a8d",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s23-no-command-can-start-the-menu-for-a-background-agent.md.json": "aabeba20847fa8977cf3cf0953695d3ab19ed06a58a947b5842cf4d8563682c5",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s24-only-a-critique-the-menu-launched-can-move-a-plan.md.json": "616c8ec6230b6bea880752fa07aa4b4c1bbc3133230fa39a93e1e80fdb24ffab",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s25-a-record-the-menu-wrote-can-be-staged-and-committed.md.json": "1f4adf1c8652ae82bdb16bf4a9027bb8daca16c1ad4ffcd7e58ea5cdc3269f79",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load.md.json": "160487ccff43c407eb6f3917e35f51697516f78797f28800f30b163f2114a9da",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s3-the-continuation-claims-no-build.md.json": "069b7d20a674233597eb4bc17c5a1e31719dbae6dd5258175a1db92aacccdcd5",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s4-a-requested-stop-offers-no-build.md.json": "84e29152b47e412e14fb8ae5e30fcffc22c158f94dbf7475dadf32cf7ad6a695",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s5-the-session-claims-a-build-before-launching-it.md.json": "8f12e2cc4ead9eec7d71f25f39f8997176196abfaad0b1452b2d8979ecea3542",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s6-a-question-file-keeps-one-status-line.md.json": "25bed85bd6693aaa4231e3759867dff01d46a0b46bcb5d374dd1acaa8a9aad21",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s7-the-inbox-answer-route.md.json": "531b7b70506ae2c264ea309e961c582ed7f1eec528adc2c30c8bb8f7a7f2fb4c",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s8-inbox-questions-are-shown-as-quoted-data.md.json": "8be7b2effb911fa92097a5d8d3835eb1ebf4a209099c3a4482fa0aad36198376",
 ".ctoc/streaming/questions/implementation__four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s9-only-the-owner-answers-an-inbox-question.md.json": "73c556731e5d452d88423d247ae26394acdde354073c20050523430f8b9003d3",
 ".ctoc/streaming/questions/review__00005-r2c-menu-doors-and-persisted-answers.md.json": "c34fadd8586b946a0a368a954264382b07a5d869c39fef44518cb5400176f44d",
 ".ctoc/streaming/questions/review__00009-r2i-stale-cleanup-provenance.md.json": "101a90d5797315e3c7c3c096321ebaaa0e9244c7ddd9ec8ebfc1bdff6ed70560",
 ".ctoc/streaming/questions/review__00010-r2c2-persisted-answers-unblocked.md.json": "4229012819ca30be873d404c78dc50722cee08edf202b3647ff2fab8e666b467",
 ".ctoc/streaming/questions/review__00011-r2z-boundary-typecheck-zero.md.json": "b823e10ce6dd21ef6f64329c0f285329014cd3b0d6e37155a05647ede3256377",
 ".ctoc/streaming/questions/review__00012-r3a-ledger-forgery-closed.md.json": "5ae9643073356750f65bbb45ddb262f609d3c98dcb71d7cec9bc227cf4c739bd",
 ".ctoc/streaming/questions/review__00013-r3b-scheduler-enforced-not-advisory.md.json": "66c70214fc0e65111d1a74ae011091938dad85b52d00dc940a57635165c685d5",
 ".ctoc/streaming/questions/review__00014-r3c-ship-gates-real.md.json": "94274640a6473068b7cd09abad6addc8bbdd6f14acf575b2a8efc1e063e1b1a0",
 ".ctoc/streaming/questions/review__00015-r3d-last-mile-wired-export-fence.md.json": "a50c029ef0261907d2354a4dea84832c5b9c90b88141a3d18fe29cea370e1349",
 ".ctoc/streaming/questions/review__00016-r4a-verify-fails-loudly.md.json": "5e5ee902bfa6521d6debbec6bc5086267fd716b1273aca8bca4ea64fbfaeafb8",
 ".ctoc/streaming/questions/review__00017-r4b-fence-real-placebos-dead.md.json": "0b0f98899407f7366d64b999ea8783cd9dd334e99550d918c51ec7d4e83f7af8",
 ".ctoc/streaming/questions/review__00018-r4c-fence-credits-recipe-calls.md.json": "6a55ee3e87224a3cb2b15629a742c5920b7de96d9242359ed8ccefa1f6eda148",
 ".ctoc/streaming/questions/review__00019-r5b-approveplan-validates-one-gate-encoding.md.json": "d5192e82fd47ce50411ab18ed9bbf5eadc83be398f72db7cf67d1a3565ad054e",
 ".ctoc/streaming/questions/review__00020-r5a-greenfield-journey-test.md.json": "20fba7a49ed9319c4783fefa909c588b9ba33a59074d140801f2a4799352db25",
 ".ctoc/templates/operating-lessons.md": "a4a987261dba2e04e22a96b5ea317074ab36e10b7b6ea67b7ba2b6427c507b7f",
 ".ctoc/unexecutable-instruction-baseline.json": "1d54b83f5e1a70192957a9fa0e020b7316910e0ea6455fbd751482f41ff8ef76",
 ".github/workflows/tests.yml": "fd0431079a35319d097854e2f255fdec39bf2421298731d0051113958d88ab0c",
 "CLAUDE.md": "cbc3f74f02c578c3c44243f7e758e5fd8a6fb1ad8d726c4420097027024573d8",
 "README.md": "71924b7d4618d6f27f9c32384cc45f0d18672d62a4d8fcc84a8eb6f951abbca0",
 "agents/architecture/dependency-analyzer.md": "be621e789a58f4f64f5a6b8c66d24b53620dc551455ddf9ca2a7db6ccc330a33",
 "agents/coordinator/cto-chief.md": "2faa5d96eadf5e0ce416bb033d594816fc649d7575c4759cb930dd093b5447d9",
 "agents/iron-loop/iron-loop-executor.md": "134042d9388011775c9b373b910df6cbfbd239eeca1912ade1294a07d56c7dc6",
 "docs/OPERATING_LESSONS.md": "2b691e31c919d0d99bd734a1b53a5927751872895d51ea463aff183a26e4957f",
 "plans/done/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s15-the-check-time-limit-covers-the-suite.md": "ab7bcc6e996784ca95eba793d388e4e14641e58e35f12892e520e50edb7e9d97",
 "plans/done/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s16-timing-tests-are-not-failed-by-machine-load.md": "8f4d4aff0908dcb3e97b9694cf39437a3199172a36e00834be85c4bc52f10d97",
 "plans/done/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s2-the-task-start-moves-the-plan.md": "34044449d8dff9100f0edb193cb4afcdaa89429094e223f3483ae2d8380665cd",
 "plans/done/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s3-the-continuation-claims-no-build.md": "c25b6f55a393daba27e4c549269ac610553172bf281796b747e5a0631e145182",
 "plans/done/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s4-a-requested-stop-offers-no-build.md": "df3060d7333ad90ea241bfee614877fa82cce48d3d76078b93fb122af15d9c91",
 "plans/done/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s5-the-session-claims-a-build-before-launching-it.md": "fd3ab7a142689e11679a6a1309a7b5d8724a91b0d3fca858eaf1280c4f550b30",
 "plans/done/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s6-a-question-file-keeps-one-status-line.md": "8740bc4163095857862a65bcc15e03305fce387c3c226a48cf0292a0d8a36840",
 "plans/functional/ctoc-checks-that-a-hotfix-is-really-small-and-safe.md": "8f96dc3f991050d6ffe781f4fbd3ccfaad4c9cec86fa4a7298536bdd6687c2ec",
 "plans/functional/ten-plans-build-at-once.md": "dc7f95ddca565a73b59105d0f88abbcbfb2b15b6978a7a690d46d253ed4e1d44",
 "plans/implementation/agent-tool-grants-s11-removals-held.md": "818f9dc82faf8a66bdcee6b6e7cbae6fbaf6fde68d55e681acb4df52b2c05b17",
 "plans/implementation/an-empty-overrides-list-no-longer-holds-every-plan.md": "a445ef3fbc2332376821c1faebde26bcd175da76c0fcd17d16f19b0ed23063c9",
 "plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s2-a-labelled-commit-needs-a-passing-check.md": "306c06a569dca9e94d17bc8d80b16f459e8ab653a199bd5eda163d038060142d",
 "plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s3-urgent-changes-and-their-review.md": "e82359e6183e172453af603c2b0a9a741c70c1957b474cc0be6e1cee89456600",
 "plans/implementation/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s4-every-session-is-told.md": "a8d86d7d5cd54cb69e7cc9c9c9b7c877ff64c0d60d0fb3660d3691a441435103",
 "plans/implementation/deepthink-ships-with-ctoc-s6-paper-program.md": "c52502f856d3b832b4fa2443edf162cebf678bf9515d81e697b189c4a938134f",
 "plans/implementation/deepthink-ships-with-ctoc-s7-launch-fence-and-briefs.md": "661ca7134188ebec609e4ea08ce529d6260c024834ffce8379a890fdd68ed288",
 "plans/implementation/deepthink-ships-with-ctoc-s8-reader-and-critic-wording.md": "754ef9cc1c354f77f38263e98e83410934875ba04b9e81737aff066f85457fb3",
 "plans/implementation/deepthink-ships-with-ctoc-s9-resume-at-turn-limit.md": "c614774950f2de6dd5b57c9e9b01fa0a521000f4093cebd71d5b3ff7e6b425d0",
 "plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s1-what-such-a-plan-states.md": "b165dca2fd75d0345d4976cf4b6379877f5941d22d96fd0cb8d4b487e769b16b",
 "plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s2-the-planner-writes-it.md": "2e89be4ec838d55173ab2ef06511d541bd53cf4006dffe24a8cb0cd748a889db",
 "plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s3-the-attack-is-recorded.md": "5cb7278e86d4d5e9bb53b56814393bede2f33b9bd0f5ec839a838ef61dcc8015",
 "plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s4-the-owner-reads-why-it-waits.md": "b753d3de7d753275cb9611874f8bac671fe1d232aeb561dff98c7020c6be1236",
 "plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s5-each-attacker-takes-one-area.md": "7f572e02d242143f4cbd0a40c9101f6cab7ea9199621deff62d6851a1c9ee103",
 "plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s6-fix-rounds-are-counted-per-area.md": "4f2fa227c561505995a30ae985042dacbb100bac1aea86a8cfb08ef9b9ddd50f",
 "plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s7-checks-before-every-commit.md": "6a1ad09f9b94e1aa544f18550585931d208e069186e132331073d0d09eeb3bd5",
 "plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built-s8-the-cto-chief-works-by-area.md": "e19e4c7c61ec08500c8d5224e81d747a149d63beef42dc6dee37780407bf72b7",
 "plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built.md": "76e037d6a2ca43b666d5f4332d9d12b13b72e702d031cd2a95b9bd186e4029ae",
 "plans/implementation/fewer-rework-rounds-a-check-is-attacked-before-it-is-built.md.status": "d76463b2abeff2f5bb6fcba3e242ea1b6ccdcd41515144b75cd86fe1b4307a73",
 "plans/implementation/four-defects-in-the-menu-and-the-release-found-on-2026-10-11.md": "621ecf50f7e837474de298c2ea880be2b44472a7f14d145407c0f99a2cc48b5c",
 "plans/implementation/the-manual-and-the-docs-stop-claiming-what-ctoc-no-longer-does.md": "af837d1490222cbe8db7ba0164226dac906b622f24da530d7ac049450fd8483f",
 "plans/in-progress/00266-every-agent-and-specialist-skill-improved-three-times-s6-dependency-analyzer.md": "8714428db67b38513ce7fdbf815381bd23fe4ff9baef01e7443f32bf0e3e811d",
 "plans/in-progress/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s23-no-command-can-start-the-menu-for-a-background-agent.md": "e589483a3217fdad128b56bb98d5d0d4a3386a69a96baf53f144674f0e7d0dec",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s1-build-tests-seed-their-plan-file.md": "f0a061263c7736ae2b4fe4375ddf6696439849bc137af01275cbe4bb7ee98b10",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s1-build-tests-seed-their-plan-file.md.status": "4c11f77051c0c5c870489f5a868fd2c209289b23a57433199f0acc144a30000e",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s10-the-release-brings-the-lockfile-to-the-version.md": "140f0d1d294bb9e587f8987f11de3a97d1fbab7d1f970596c506a89f49a1e154",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s10-the-release-brings-the-lockfile-to-the-version.md.status": "e5ac4cdf82d527257af25dcbb15458837ae07b137c62e70374b2bc89bc27ba61",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s11-ladder-tests-use-non-build-tasks.md": "6db41e5090aab66838f76d60c4325296afc863ec285284f9752d6845dfd6dc74",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s11-ladder-tests-use-non-build-tasks.md.status": "e6de100e6dedb353c26a14bbc717e33cf7d36d610f9c7e114597f5c2a6a4337d",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s17-a-placeholder-path-is-not-a-missing-file.md": "ef232981118c91cb3a29f8a51bc7658b03ad0cf194f2d57ec55b29a1a8082b08",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s17-a-placeholder-path-is-not-a-missing-file.md.status": "660a52baa7e520df746f4c568e77e92bb2cccb524593bbd5576d491a3a24a589",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s18-a-task-next-action-is-a-plain-read-only-route.md": "41332c98b14ec7e65f19dd1540905346daee1fb937aafc5869331355e122d6ab",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s18-a-task-next-action-is-a-plain-read-only-route.md.status": "3ea7056b28eacfe342f814de9c62ca145dad855c29e1afa2333693d66ea01e25",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s7-the-inbox-answer-route.md": "492db24a98a9c52220ad777ca6edc8c06230a18c3d95d528f416917febba60e1",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s7-the-inbox-answer-route.md.status": "a605f5618400373820da0d1ac1eeab961055865fc6ad10edd1dde8e18155deec",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s8-inbox-questions-are-shown-as-quoted-data.md": "c0a93504aecd763e2001f13fb6dd0da07e003e10a0aa70203e2f39ebcc435da7",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s8-inbox-questions-are-shown-as-quoted-data.md.status": "7c288dd9171164db08ebdac190aa4ef31144e64af9d66685928f8d04511eeb54",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s9-only-the-owner-answers-an-inbox-question.md": "ac32cf855145c3d4b7323e3781baadba177d7a9e26c551c593d8076033ed36f5",
 "plans/review/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s9-only-the-owner-answers-an-inbox-question.md.status": "14e7710b5d89f25b7d6023a3adc7c0d5bb45eaf90bb01d56b8479aa015391f27",
 "plans/todo/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s12-one-build-at-a-time-in-the-scheduler.md": "2288bf39e7de09be53ba1a7b29b0559d0d9c2ed9a98a6b13e9850710280a7938",
 "plans/todo/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s13-the-refusal-names-the-build-that-holds-the-slot.md": "933323da94320a46bb450b428b154114f2038bb36aaa564e0c1ac4ba4d53efc0",
 "plans/todo/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s14-the-texts-say-one-build-at-a-time.md": "ede19d10eb0a1780a51c46ecb2d6284058d0af1e2ca4601651ba49012c170160",
 "plans/todo/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s19-agent-text-never-reaches-the-shell-unquoted.md": "3b4e2911da46a98d965f33ff256872deeddd9c9f17d82112a8dd9a99e12d741e",
 "plans/todo/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s20-the-task-registry-is-written-only-by-the-menu.md": "3e1eb9a8e37a21cb40bf11e56abc70661dba6c260fed05514d6d68c1c8c7098f",
 "plans/todo/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s21-background-agents-do-not-open-the-dashboard.md": "7d53d8c66fc310cc23c874b32670623b259d4d240380a1670d2444f1e021c0ef",
 "plans/todo/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s22-agent-notes-are-capped-and-the-owner-decides-what-is-ready.md": "a0095e20fbfed30f433487a97e05ed6c663f03b0b415ac9cf91d22d8efebb5e8",
 "plans/todo/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s24-only-a-critique-the-menu-launched-can-move-a-plan.md": "e15bd25ff53bbd07bdca51c129e2ff292a80701724f0a31b865ca2496a6fa7e0",
 "plans/todo/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s25-a-record-the-menu-wrote-can-be-staged-and-committed.md": "0d17c112650db805d2004e379acc51a55c8e2b5062b3e161581394a635e79c92",
 "plans/todo/four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s26-the-linear-scan-test-holds-under-load.md": "634f84230b2123ea83b49211aa2b6594ea18563a1d39f8937e01e974347df826",
 "skills/architecture/dependency-analyzer/SKILL.md": "0abe7ee89ac3c3b02ce150730b59a709ffbf93adf53fe9dcf8e843066e7fe9c9",
 "src/commands/start.js": "062caf0f999368ab13d4a119e3fb59add80714e320075cb8fcd98b27c43bc1e2",
 "src/commands/start.md": "8a63ed0dca7c399c0e92a9f3f6cc15da583904c1eff138835813d9488294047c",
 "src/lib/actions.js": "dfc5f1cd41f528bf6db134f5677b0bed16e9b2fbd481d6e8dd2a4d1586da0c90",
 "src/lib/inbox.js": "1e33dee96ee8c4aa46796516316a5c98b72d559ce7daa715d2a6874636ffa7f3",
 "src/lib/loop-b-driver.js": "e039d88135ed3691368610cf65dabb14675b505e90af23457ca90944c5439493",
 "src/lib/menu-screens.js": "d511c67218fc3a07f546ee90ec78368a93a521698ed1a87d793b4fd71782f1b1",
 "src/lib/plan-validator.js": "fa3e2955d59d1d5aa876d616abd62a7b9f32ee4bdcc09ebb17200f9053a6cf00",
 "src/lib/step-13-verify.js": "823001c8fd02f2c56b92e626d8af4704e635c261a1f6708e0a51d10d14c9bc42",
 "src/lib/streaming-gate.js": "607cf7543e64d2ff3ecb5dad86e05a769a6e1eb30f3410acaa6610f9f7b4083b",
 "src/lib/task-registry.js": "6b03ab1f72e148ede52dd5de710f92b01105f48211a0c1bb96545065763d006e",
 "src/lib/task-view.js": "1f45c6979f58b85a36c7a3004a240f8914de24eaa5a8509dea0e4996b6a69e8a",
 "src/scripts/release.js": "63d835ec269c561aeb6c098891033463fbab4ac675c20643e42d8bcf8d23fda3",
 "tests/a-build-start-moves-its-plan.test.js": "06f73bb6d076417a8bd200639367fb8e49cc05dfa49b474648f866cb88459cf8",
 "tests/a-question-file-keeps-one-status-line.test.js": "4fd25e0696aa89d9e3ee639d3a6c726c710f10e02b254d61b645cfcc73f21927",
 "tests/a-requested-stop-offers-no-build.test.js": "89c1c7320d26ed5fc2720ebf4cbcd2634b3dcd466df1b5ac5e8e8dd85a76e671",
 "tests/an-answer-starts-no-build.test.js": "eee1b64b48a47a2e7c61e599d8f154337b38ae6abf2914e2031fd26764f91a99",
 "tests/answers-bind-to-plan-revision.test.js": "1885d931e5d04c9424a33d172add1b67c64c5cfd5e8e3df94838a85323a6d075",
 "tests/claude-md-keeps-every-rule.test.js": "7818bfc5844b8ba7f3ede13134748de685addbcf76db377e8a397cd2f91950d1",
 "tests/compaction-eval/cto-chief/rule-inventory.json": "9b8df70442fb7d70c9afb6b03d80408766d021058a30a3c4489bd57515d27d49",
 "tests/dashboard-wedge-fault.test.js": "8bfa8dc24b49bd978e2904ed65e4cb2a58811bae35e937ab845d0a21cbbcc207",
 "tests/dashboard-wedge-reports.test.js": "df8e71c14290fd39e6fbcd19dfc81706dc06e1119f9c929b6d91b7093e7176de",
 "tests/inbox-questions-are-shown-as-quoted-data.test.js": "025ca60527d14acd58e9a52a76c35a02990a610b0d121c9f63b0c18c531e9f3b",
 "tests/loop-b-directive.test.js": "6dd2fe9775e4331e3449b94cb2546fa6e772c0aa41a7d393c26d66e19d9ebd23",
 "tests/menu-protocol.test.js": "fef0fcc87584703d52c5b3b602dac081f8e999b46317405a93ddd1f943eeb64b",
 "tests/menu-task-wiring.test.js": "5731cca42fea2f05c8723ebd11856d88816f051b1f72d73212b26f36928a6671",
 "tests/only-the-owner-answers-an-inbox-question.test.js": "7ca0ee7433ba07b3df021b10c69c1c27111263d7a4d00c59402569bed8cae8b6",
 "tests/plan-validator.test.js": "0a4f6c234431cf18ccf49668d9ee305faaa913821805705024f5638add8f1dd5",
 "tests/plans-keep-moving-without-the-human.test.js": "edd3019a085b26e9fab58752e433742ff43b13276229823756f79501b27abe4c",
 "tests/promote-quarantine-parity.test.js": "e25af143f66049ea21457c5b8758657fb88dea1d4b6588ef01bda78820fc1a4e",
 "tests/release-metadata-sync.test.js": "b3cecb766e087d0e0ab89d75d0a176445ceef6e7ab27254e7c9cffd8132317a3",
 "tests/scheduler-enforced.test.js": "9e76cdf877b66dd5a74b5b14c62fba4bba4f17d6a871ba213d6b0bb1eedfe306",
 "tests/scheduler-guarantees-under-mutation.test.js": "920135eac17d8040b40a6b5a134e09c59b8f9b8c2353ae52eac989d4da33c7af",
 "tests/scope-growth.test.js": "c4960c1d77e90d681a5804a7b40ac4206a911a05f48850922f6e79c18f374e22",
 "tests/streaming-gate-coverage-holes.test.js": "5d1cac48d620875f49773b0d5eccfd05a0c7626b7b26e35b08a3c041388c815e",
 "tests/streaming-gate.test.js": "ab2fda3638753b6d47ab6e9504ab07b5162481e8981871d0e8d4ca45e90781cc",
 "tests/sufficiency-evidence.test.js": "72c05b9295e5de0a5a62abf8f75f1a938a8037d00335db2ab5c7820b2bd2b37e",
 "tests/task-reconcile-quarantine-fault.test.js": "16e6ba8550942d4f9edd526db24de47ff6fc7260a5a82412c01f7dc4dccc1914",
 "tests/the-owner-answers-an-inbox-question.test.js": "e6790cc66bdd912b342ff94b7bfe14e833d327370042b55e101628614a9d4079",
 "tests/the-session-claims-a-build-before-launching-it.test.js": "96750571c94b4780fd367331176bb8920d7e5362d7f8ada45be6718d077b6243",
 "tests/update-command-coverage.test.js": "d8be55fb52981f97a9f8a760548846145c5d138989cce56d770de215cb1cdece",
 "tests/verify-fails-loudly.test.js": "bfdf8d335b8527d05ce93f568d67f3446320760fdd6749609002d987300c7afa",
 "tests/w10-live-agent-reconcile.test.js": "8794daf22b47b82d406c7320f5d4790f54f190a7bad0c6a76f76467a4a7d0cf2"
}
```

The affected files passed before any change (1013 tests, 0 failed, 0 skipped): the baseline for the red run.

**The probe** (only the `crossed &&` guard token applied to a byte-exact saved copy of `streaming-gate.js`; affected files, not the
whole suite). 11 tests failed, every one a CROSSING assertion in a declared test file and none a SCREEN assertion:
`tests/answers-bind-to-plan-revision.test.js` case 18; `tests/plans-keep-moving-without-the-human.test.js` case 52 and case 56
(four "guard" variants, which also fail their parent suites); `tests/streaming-gate-coverage-holes.test.js` "471-476 + 496-498";
`tests/streaming-gate.test.js` cases 11 and 12; `tests/sufficiency-evidence.test.js` cases 9 and 11. No test in an undeclared
file failed. Copy-back: the comparison command exited 0 (byte-equal); `git status --porcelain` for the declared paths equalled the
baseline.

**The red run** (all test edits and new tests in place, source still the original). 29 failed, 1013 passed, 0 skipped, in the affected
files only: S23-1 (9 of its 10 entries; the plan screen's entry passes as the plan says), all six S23-3 launchers, B1, B2, B3 (skip,
comment, refused approve), B7, B8, B9, the replaced loop-b-directive test, case 52 and the four case 56 "guard" variants. S23-2,
B4, B5, B6 and the realigned contract cases passed. Per launcher, the failing assertion is the CROSSING one with the beacon present
(`crossing: starting the menu moved the ready plan across a gate`), for the Node child process, `sh -c`, `env`, `xargs`,
`find -exec` and `rg --pre`. The `rg --pre` case was registered on this machine (`ripgrep 14.1.1` runs).

`rg --help` for the flags (read here): `--pre=COMMAND` "causes ripgrep to search the standard output of COMMAND PATH instead of the
contents of PATH"; `--pre-glob=GLOB` "only files that match the given set of globs will be handed to the command". So
`rg --pre node --pre-glob '*start.js' <beacon> start.js` runs `node start.js` with no arguments, as the plan says.

**Differences from the plan's table, found by running it** (decisions are under `### Decisions taken under ambiguity during the build`):
case 52 and the four case 56 "guard" variants FAIL in the red run, not pass: the new assertion that a bare read moves nothing is red
before the fix. The beacon plan had to move to `review/` (see the decisions).

### Step 9: PREPARE

- **Plan-stage security review of the workflow change:** recorded in this plan under "## Plan-stage security review of the workflow
  change" (2026-10-13, verdict warn, five findings, each answered in the `.github/workflows/tests.yml` specification). Build started.
- **Re-read by name:** `pendingGateDecisions` (guard at the pre-build cross, `crossed` in scope), `crossBySufficiency` (idempotence
  refusal on an entry for this destination; fail-soft catch), `gateScreenAt`, `streamingGateScreen`, `advanceAfter`,
  `advanceExcludingSlug`, `planDecisionScreen`, `streamApprove`, `loop-b-driver` (`preBuildSnapshot`, `crossedLines`, `buildDeps`,
  `summarize`), `actions.movePlan` (the same-basename collision guard), `approval-ledger` (`SLUG_RE = /^[a-z0-9][a-z0-9-]*$/`),
  `task-registry.load` (returns an empty or `unreadable: true` registry for a string root; throws only for a non-string),
  `menu-screens.taskComplete` (refuses an unknown id), `sweepPendingQuestions`. Every fact the plan cites held. Line numbers had
  shifted (the plan said about 1049; the guard was at 1051 before the edit); no cited fact differs.
- **Bare-read crossing search** (exact presence, used to list candidates, every hit read). Patterns over `tests/*.test.js`:
  `pendingGateDecisions\(` 10 files; `streamingGateScreen\(` 7 files; `loopBDirective\(` 4 files; `plansNeedingQuestions\(` 2 files.
  The 11 crossings found by the probe are all in declared files. The bare calls in `empty-plan-is-not-a-decision`, `gate-words` and
  `fresh-repository-is-its-own-project` describe lists and make no crossing claim.
- **Hollow "did not cross" checks found and converted** (condition each names). First scan (literal calls in the files other than
  the largest) and a second scan of `tests/plans-keep-moving-without-the-human.test.js` itself, which the first scan skipped and
  which reads through `descriptorOf(root, ref)` (a bare `pendingGateDecisions`), `streamingGateScreen(`, `route(['plan', …])` and
  `loopBDirective(`: `streaming-gate.test.js` case 9 (open fork) and case 10 (questions never computed);
  `streaming-gate-coverage-holes.test.js` faulted half (faulted predicate); `plans-keep-moving` case 41 (an author's unchecked
  file) and case 55 (a crossing pass added before "nothing moved"; this case is held by two independent conditions, the regime and
  the unchecked file, so it stays green when either one alone is removed and goes red only under L1 with the regime also off — the
  crossing pass makes it live, not single-condition-sensitive); case 58 "byte-order mark" (the functional plan's
  nothing-moved assertion is now made AFTER `continueAfterCrossing`, so it goes red under L2). Cases 49, 48 and 50-54, 56 (misread
  variants), 57 and 58 (other variants) already ran the continuation or `{ crossed }` before their nothing-moved assertions.
  `tests/streaming-human-loop-e2e.test.js` case 7 (a bare read after `stream answer`s that left a fork open) was checked and is
  NOT hollow: `answerOnScreen` goes through `stream answer`, which runs the continuation's pass, and with the `enough` check removed
  (L1, with that file added to the run) case 7 fails ("the screen offers 15 minutes as an answer"). No scope-growth request is
  needed for it.
- **Continuous integration variable:** the "Run tests" step had no `env:` block, so one was added. `process.env.CI` / `env.CI` over
  `src/` and `tests/` (`--include='*.js'`): 2 files, `src/lib/playwright-scaffolder.js` (template text, lines 140-160) and this
  slice's test (line 2000). No other reader.
- **Scope by content** (compare against the snapshot, taken after the test edits and before the source edits). Listed, with marks:
  `tests/answers-bind-to-plan-revision.test.js`, `tests/loop-b-directive.test.js`,
  `tests/plans-keep-moving-without-the-human.test.js`, `tests/streaming-gate-coverage-holes.test.js`, `tests/streaming-gate.test.js`,
  `tests/sufficiency-evidence.test.js` (a: this slice's Step 8); `README.md`, `.ctoc/templates/operating-lessons.md`,
  `agents/coordinator/cto-chief.md`, `agents/iron-loop/iron-loop-executor.md`, `docs/OPERATING_LESSONS.md`,
  `tests/claude-md-keeps-every-rule.test.js`, `tests/compaction-eval/cto-chief/rule-inventory.json`,
  `tests/update-command-coverage.test.js` (c: not this slice; another session's work in the shared checkout, origin not known).
  `src/lib/streaming-gate.js` was NOT listed, as expected. `git status --porcelain` for the declared paths: the baseline plus the
  six test files.

### Step 10: IMPLEMENT

- `src/lib/streaming-gate.js`: the `crossed &&` guard first in the pre-build condition; the four comment rewordings; the
  helpers `movesOnItsOwn`, `askQueue`, `readyStatus` and `withReady` (module-local, none exported); their use in
  `streamingGateScreen`, `advanceAfter` and `advanceExcludingSlug`; in `planDecisionScreen` the ready check, line, skipped detail,
  Approve description and doc sentence. One deviation, below.
- `src/lib/loop-b-driver.js`: `crossedLines` is now a plain read; deleted `preBuildSnapshot`, `SUFFICIENCY_SOURCE_STAGES`, the
  `readPlans` entry of `buildDeps` (each confirmed to have no other reader), the header bullet and the inline comment reworded.
- `src/commands/start.md`: the `ready` bullet; the "Human gates stay foreground" sentence reworded; the protocol-tested phrases kept.
- `.github/workflows/tests.yml`: the ripgrep step (`timeout-minutes: 5`, `rg --version`, no pin) and `env: CI: "true"` on "Run tests".
  Parsed with a YAML loader: the steps are the Node setup, `Install ripgrep`, `Run tests`, `Test Summary`.
- Affected files after the change: 1042 tests, 0 failed, 0 skipped (first run: the false-green fence flagged the planned empty catch
  in `planDecisionScreen`; fixed, see the decisions). Final run over 92 files after every edit including the extra tests:
  2881 tests, 2880 passed, 1 failed, 0 skipped. The one failure is `tests/readme-numbers.test.js` "Lesson 2 capture: the version
  line equals the VERSION file" (`README.md` and `VERSION` disagree while another session's release is in progress; `VERSION`,
  `package.json` and the plugin JSON files appeared in the changed list mid-run): not this slice. `tests/false-green-fence.test.js`:
  17 of 17 pass.
- **Not done:** the whole `npm test` (the brief forbade it), so no test outside the 92 files was run.

**Mutants** (each applied to a byte-exact copy `impl-streaming-gate.js` of the built file; each run covered the declared test files
plus `streaming-human-loop-e2e.test.js`; the file was copied back after every run and compared byte for byte: `restored byte-equal:
true` for all 24; the live file also equals the saved copy at the end). Cases that failed, with one assertion message each:

- M1 remove crossed guard: 31 failing: a plan with enough information is NOT crossed or n [the plan stays in its stage — opening the menu moved nothing]; case 36 [the crossable plan is still waiting]; case 52 [a bare read moves nothing]; case 56 x4 [a bare read moves nothing]; S23-1 x10 [stream skip: the ready plan is still in functional]; S23-3 x6 [crossing: starting the menu moved the ready plan across a gate]; B1 [Expected values to be strictly equal:]; B2 [Expected values to be strictly equal:]; B3 x3 [The input did not match the regular expression /Ready, but nothing is running th]; B7 [The input did not match the regular expression /Ready, but nothing is running th]; B8 [The input did not match the regular expression /Ready, but nothing is running th]; B9 [The input did not match the regular expression /Ready, but nothing is running th]
- M2 crossed after crossBySufficiency: 31 failing: a plan with enough information is NOT crossed or n [the plan stays in its stage — opening the menu moved nothing]; case 36 [the crossable plan is still waiting]; case 52 [a bare read moves nothing]; case 56 x4 [a bare read moves nothing]; S23-1 x10 [stream skip: the ready plan is still in functional]; S23-3 x6 [crossing: starting the menu moved the ready plan across a gate]; B1 [Expected values to be strictly equal:]; B2 [Expected values to be strictly equal:]; B3 x3 [The input did not match the regular expression /Ready, but nothing is running th]; B7 [Expected values to be strictly equal:]; B8 [The input did not match the regular expression /Ready, but nothing is running th]; B9 [The input did not match the regular expression /Ready, but nothing is running th]
- M3 review guard removed (also `(crossed || []).push` so the mutant finishes the plan instead of throwing): 20 failing: S23-1 x10 [<entry>: the built plan is still in review]; case 13 [Expected values to be strictly equal:]; case 36 [the finishable plan is still in review]; case 52 [a bare read finishes nothing]; case 53, 54, 56 x4 and B3 are red through the unrealigned helper reading the plan list after it finished the plan (TypeError reading 'regimeHold')
- M4 streamingGateScreen no askQueue: 4 failing: B1 [The input did not match the regular expression /Ready, but nothing is running th]; B2 [Expected values to be strictly equal:]; B7 [Expected values to be strictly equal:]; B8 [The input did not match the regular expression /Ready, but nothing is running th]
- M5 advanceAfter no askQueue: 2 failing: B3 x2 [Expected values to be strictly equal:]
- M6 advanceExcludingSlug no askQueue: 1 failing: B3 [Expected values to be strictly equal:]
- M7 no approval-entry check: 1 failing: B4 [The input did not match the regular expression /^Topic: Export to CSV/m. Input:]
- M8 no destination check: 1 failing: B5 [The input was expected to not match the regular expression /Ready, (but nothing ]
- M9 movesOnItsOwn rethrows: 1 failing: B6 [Error: Invalid slug]
- M10 readyStatus always busy: 8 failing: B1 [The input did not match the regular expression /Ready, but nothing is running th]; B2 [The input did not match the regular expression /Ready, but nothing is running th]; B3 x3 [The input did not match the regular expression /Ready, but nothing is running th]; B7 [The input did not match the regular expression /Ready, but nothing is running th]; B8 [The input did not match the regular expression /Ready, but nothing is running th]; B9 [The input did not match the regular expression /Ready, but nothing is running th]
- M11 readyStatus always idle: 2 failing: B8 [The input did not match the regular expression /Ready, moving on by itself at th]; B9 [The input did not match the regular expression /Ready, moving on by itself at th]
- M12 readyStatus counts done: 1 failing: B8 [The input did not match the regular expression /Ready, but nothing is running th]
- M13 planDecisionScreen no ready check: 2 failing: B9b [The input did not match the regular expression /^New questions could not be take]; B9 [The input did not match the regular expression /Ready, but nothing is running th]
- M14 ready check without sweep: 2 failing: B9b [The input did not match the regular expression /^New questions could not be take]; B9 [The input did not match the regular expression /Ready, but nothing is running th]
- M15 ready without movesOnItsOwn: 1 failing: B4 [The input was expected to not match the regular expression /Ready, (but nothing ]
- M16 ready Approve keeps Recommended: 1 failing: B9 [no option is marked Recommended]
- M17 movesOnItsOwn without passesValidation: 1 failing: B3b [The input did not match the regular expression /^Topic: Broken but answered/m. I]
- M18 movesOnItsOwn without regimeHold: 2 failing: case 49 x2 [the rich screen asks the first detail]
- M19 movesOnItsOwn without destination stage: 1 failing: B3 [it is a decision at the final sign-off, not a ready line]
- M20 movesOnItsOwn without enough: 52 failing, across 43 case groups (381-382: a broken question store falls back to the, 823: a token with no separator to break at wraps a, B1, B5, B9b, NEUTRALISES forged structure — box-drawing charact, NEVER truncates mid-word — every cell renders its , `stream approve` on a VALID plan crosses the gate , a decision whose questions are missing offers it, , advances through MULTIPLE fork questions, then the, answering the LAST fork CROSSES the plan by suffic, asks the FIRST precomputed question (not the simpl, bare `stream` (no sub-command) returns the streami, case 14, …); first message: the human is shown the question they never saw
- M21 plan-spec empty catch around the sweep: 1 failing: B9b [The input did not match the regular expression /^New questions could not be take]
- L1 remove enough check: 41 failing, across 31 case groups (471-476 + 496-498: a sufficiency predicate that co, B1, B5, `stream approve` on a VALID plan crosses the gate , advances through MULTIPLE fork questions, then the, case 10, case 11, case 16, case 17, case 18, case 19, case 2, case 20, case 21, …); first message: the weighty question holds the plan
- L2 remove !regime: 15 failing: case 49 x2 [the plan stays in functional]; case 51(a) [nothing crossed]; case 51(b) x3 [nothing crossed]; case 56 x6 [nothing crossed]; case 58 x3 [Expected values to be strictly deep-equal:]
- L3 remove passesValidation: 1 failing: B3b [the crossing refuses a failing validation, as the predicate does]

Notes: under M1 the six S23-3 launchers failed on the CROSSING assertion with the beacon present (`crossing: starting the
menu moved the ready plan across a gate`); no "beacon missing" was recorded. M2 behaves like M1. M10 (always busy) is caught by B1,
B2, B3 (three routes), B7, B8 and B9; M11 (always idle) by B8 and B9. L1 (no `enough` check) turned red streaming-gate cases 9 and
10, the coverage-holes faulted half, plans-keep-moving case 41 and the e2e case 7. L2 (no `!regime`) turned red the functional-stage
regime cases 49, 51(a), 51(b), 56 (misread variants) and 58. L3 (no `passesValidation`) first stayed GREEN everywhere (no test
named it), so B3b was added (a plan with enough information and a failing validation: asked, not ready, left by the continuation)
and kills it, as does M17. B3c (a built review plan with enough information is never on the ready line) was added and kills M19.
M18 (no `regimeHold`) is killed by case 49. M21 (the plan's empty catch around the sweep) is killed by B9b, which was added for
the sweep-fault sentence.

### Step 11: REVIEW

Round 1 (the critic's review of the build), all answered in the fix round of 2026-10-17 below and in Decisions 15 to 22:
- MEDIUM: `movesOnItsOwn` missed two refusals the crossing already had (the approval record's case-collision refusal; a
  specification that cannot be bound), so such a plan was called ready forever. Done: one shared `crossingBlocked` used by the
  crossing and the predicate; tests B6b and B6c written and seen red; the crossing now refuses the destination clash before it
  writes an entry (Decision 15).
- LOW: statements made untrue by the 2026-10-15 hook change ("already refuses", "defence-in-depth", residual 1's likelihood,
  the `screen.ready` security line, the `rg --pre` story, residual 2). Done: recorded as corrections (Decisions 16 to 21, and the
  discrepancy record); the hashed plan text is not edited.
- LOW: the nothing-pending wording was false above a ready line. Done: now "Nothing at a human gate needs a decision from you."
  (test B2b, seen red).
- LOW: `screen.ready[].name` was not capped as the ready line caps names. Done: capped per name, fail-soft (test B2c, seen red).
- LOW: a dead `lines: []` and its spread in `loop-b-driver`. Done: removed; `crossedLines` became `readPending`; S23-3's folded
  assertion split in two (Decision 22).

Round 2 (re-review; it confirmed that the shared `crossingBlocked` fixes both round-1 findings), answered in Decisions 23 to 28:
- MEDIUM: case 10 no longer reached the rollback. Done: case 10 rewritten around a write fault and seen red with the rollback
  removed; case 10b added for an entry at another destination and seen red against the old order (Decision 23).
- LOW: the `crossBySufficiency` comment's example of a rolled-back move. Done: a write fault (Decision 24).
- LOW: B6b and B6c did not assert Recommended on both screens. Done (Decision 25).
- LOW: two plans differing only by letter case in one pass. Done: recorded as a residual of Decision 6 (Decision 26).
- LOW: correction 18's HIGH likelihood versus the MEDIUM cited in the Step 11 and Step 13 checklists. Done: recorded, with the
  option (b) sentence corrected in place (Decision 27).
- LOW: no Step 11 record. Done: this section.

After round 2: affected tests (`tests/sufficiency-evidence.test.js`, `tests/plans-keep-moving-without-the-human.test.js`)
146 tests, 0 failed, 0 skipped. `tests/readme-numbers.test.js` and `tests/subplan-decomposition.test.js` fail because of other
sessions and were ignored. The task is not completed.

### Step 11: REVIEW — round 3 (2026-10-17)

Verdict PASS. Round 2's fixes held: case 10 reaches the rollback (shown at `tests/sufficiency-evidence.test.js:274-292`, with the
rollback at `src/lib/streaming-gate.js:929`); case 10b holds; Decisions 24 and 25 hold. The merge of release 6.14.130 added only the
banner line saying an automatic push did not happen, and left the guard at :1089 and :1104 and `crossingBlocked` at :858 intact. Its
one LOW finding (B6b and B6c did not pin the first option's label to the approve label, as B4 does) is fixed in the round below
(Decision 31).

### Step 13: SECURE (2026-10-17)

The security scanner's verdict is WARN with two LOW findings, both fixed in the round below: (1) zero-width and direction-changing
characters reached the ready line and `screen.ready[].name` (Decision 29); (2) the `ready` bullet of `src/commands/start.md` never
said a name is plan text (Decision 30). Its evidence:
- 10 read routes left the sandbox byte-identical on the built code. A guard-removed mutant crossed on 8 of them.
- `tests.yml` lines 25-31 match the plan byte for byte. No untrusted input, no secret, and no `uses:` added. ripgrep comes from
  Ubuntu's signed archive.
- With HOME and USERPROFILE set to an empty folder, the six files passed 260 of 260 and the folder stayed empty.
- A hand pattern-and-entropy scan for secrets found 0 hits; gitleaks, trufflehog and semgrep are not installed.
- Residual: the HIGH background-agent decision-route exposure belongs to the slice that refuses background agents the decision
  routes, being re-planned on the owner's answer of 2026-10-17. Older problems listed for the owner: the `validate-skill-issue.yml`
  injection, `tests.yml` has no `permissions:`, actions are pinned by tag, and the `menu-screens.js:2740` comment.

### Fix round after the reviews (2026-10-17)

Changes: `src/lib/streaming-gate.js:71` new `stripInvisible`, used at :1987 (`readyStatus`) and :2002 (`withReady`);
`src/commands/start.md:20` one sentence added to the `ready` bullet; `tests/plans-keep-moving-without-the-human.test.js` new case B2d
(three plans titled "Saved\u200B searches", "Saved searches\u202E", "Saved searches": all three show "Saved searches" on the line and in
`screen.ready[].name`, neither character appears) and B6b and B6c now assert `options[0].label === d.approveLabel` on both screens.
Red then green: B2d was written and run first: 133 tests, 132 passed, 1 failed (B2d); B6b and B6c passed at once, as a tightening of
assertions the code already met. After the fix B2d passes. Commands (counts are tests, all with 0 skipped):
`node --test tests/plans-keep-moving-without-the-human.test.js` 133 pass; `tests/streaming-gate.test.js` 63 pass;
`tests/sufficiency-evidence.test.js` 14 pass; `tests/answers-bind-to-plan-revision.test.js` 23 pass;
`tests/streaming-gate-coverage-holes.test.js` 8 pass; `tests/loop-b-directive.test.js` 20 pass; `tests/menu-protocol.test.js` 31 pass;
`tests/false-green-fence.test.js` 16 pass, 1 fail: "LOWER THE BASELINE" says the live count is 205 against 206 because the key
`src/scripts/release.js:silent-catch:atomicWriteFileSync` is gone, from another builder's edit of `src/scripts/release.js`, not this
slice (the scan was run to name the key). `npx eslint --max-warnings 0 src/lib/streaming-gate.js
tests/plans-keep-moving-without-the-human.test.js`: clean. The whole `npm test` was not run; the task is not completed.

### Step 13: SECURE — static analysis (2026-10-17)

Verdict: warn. semgrep and CodeQL are not installed, so the code was read by hand, plus one probe. This slice adds no injection, no
path traversal, no unsafe parsing and no regular-expression denial of service.
- Checked and sound: plan file names pass `SAFE_PLAN_FILE`; `stream approve <ref>` uses only `[A-Za-z0-9._-]`; every `require` takes
  a literal; records are read field by field.
- Fixed in this follow-up: two comments in `src/lib/streaming-gate.js`. The `planDecisionScreen` comment said "Pure read" though it
  calls `sweepPendingQuestions` (writes the question store, removes waiting files; crosses no approval point). The `crossBySufficiency`
  comment said a same-name file at the destination "never gets that far"; with two passes at once it does, and now says so, and that no
  lock exists today.
- Listed for the owner, older than this slice, not this slice's to fix:
  - MEDIUM, confirmed by probe: when a move fails, the rollback deletes the plan's EARLIER approval entry, because the new entry has
    overwritten it. The residency sweep then sends the plan back. Sites: `streaming-gate.js` about 917-935 and 781, `actions.js` about
    400. Fix: keep the earlier entry and restore it atomically.
  - LOW: no lock from the check through the write and the move, so two passes at once can race.
  - LOW: the plan is read again between the validation and the hash, so an edit in that window is approved without ever being
    validated. Fix: pass the modification time through the verdict, or hash the content already read.
- Not checked: whether a planted waiting-questions file can mark questions as not needing the owner through its `classification`;
  symbolic-link plan files; rename behaviour on Windows.

### Step 12: OPTIMIZE

The crossing change is one added condition (`crossed &&`). The readiness check costs, per pending plan that passes the four
in-memory conditions, one approval-record lookup and one existence check at the destination; every other plan costs nothing. When at
least one plan is ready the line adds one read of the task registry. The plan screen of a pre-build plan adds one sweep of the
waiting folder and one full pending read. All as accepted in the plan; nothing further to remove.

### Step 14: VERIFY (affected tests only, so far)

Lint: `npx eslint` over `src/lib/streaming-gate.js`, `src/lib/loop-b-driver.js` and the six declared test files, `--max-warnings 0`:
clean. Affected tests: see Step 10. `tests/false-green-fence.test.js` passes (17 of 17). The whole `npm test`, coverage, the count
and the `rg --pre` registration under that run are NOT done here (the brief stopped the build before it). On this machine the
`rg --pre` case registers.

### Step 15: DOCUMENT

The `pendingGateDecisions` doc comment, the `loop-b-driver` header and `start.md` state that opening a screen crosses nothing;
`start.md` documents `ready`. The searches, every hit read:
- Broad pattern `sanctioned side effect|side effect.*cross|read.*cross|default screen.*cross` over `src/` (and `src/commands/start.md`):
  16 files matched, all unrelated words ("read" + "across", "cross-check", "reads... crossing") or this slice's own new comments
  (a). None claims a read crosses a gate.
- Narrow pattern `default screen opens|when the menu opens|default screen.*cross|crosses pre-build plans|before/after snapshot|sanctioned side effect|sufficiency auto-cross|pendingGateDecisions.*cross|on every gate-screen render`:
  over `README.md` 0 files; `docs/` 1 file; `plans/` 21 files. Marked:
  (b) listed for the owner, not edited: `docs/ENFORCEMENT.md` line 360 ("the default screen crosses pre-build plans on
  sufficiency"; handed to slice 21 under Neighbours); `plans/implementation/00409-small-changes-take-a-small-path-s9-critique-only-before-build.md`
  (lines 47, 107, 142: the snapshot and the crossing) and `plans/implementation/the-manual-and-the-docs-stop-claiming-what-ctoc-no-longer-does.md`
  (line 76: "also when the default screen opens") are the two expected ones; NEW, not expected:
  `plans/implementation/the-readme-matches-the-product-today.md` (lines 167 and 392: rendering the dashboard's `pendingGateDecisions` moves plans),
  `plans/implementation/small-changes-take-a-small-path.md` (lines 217 and 391: `pendingGateDecisions` "can also cross plans"),
  `plans/implementation/00402-small-changes-take-a-small-path-s2-intake-classifier.md` (line 59: "crosses plans as a side effect"),
  `plans/todo/00383-the-readme-matches-the-product-today-s2-fresh-project-captures-and-walks.md` (line 28: the gate's `pendingGateDecisions` moves plans).
  Matches that only point at `pendingGateDecisions` without claiming a read crosses (`00385`, `00392`, `00413`, the `an-empty-overrides-list`
  plan, slices 21, 22 and 24, `plans/functional/ctoc-keeps-working-and-asks-only-what-matters.md`): no correction needed from this
  slice. Slices 22 and 24 already say a call without `opts.crossed` crosses nothing.
  (c) history, no correction: the seven matches in `plans/done/`.
  Also found outside the searched list, in a file this slice does not declare: `src/lib/menu-screens.js` (`taskComplete`, about line 2740)
  still says "The hook refuses `--continue` to background agents", which the 2026-10-15 hook change made false (see the next record).

Fix round of 2026-10-17: comments outside this slice's files that still say a read crosses a gate, listed for the owner, not edited:
`src/lib/ctoc-routing-reminder.js` lines 16-19, `src/lib/task-view.js` lines 62-63, and `src/lib/menu-screens.js` near line 2740
(it says the hook refuses `--continue`).

### Fix round after the Step 11 review (2026-10-17)

Red run first: B6b and B6c were written, then run against `crossingBlocked` without its two new checks (a mutant of the built file,
copied back and compared byte for byte): both failed on "it is asked" with the ready line on screen; no other case in
`tests/plans-keep-moving-without-the-human.test.js` failed (132 tests). Honest note: the implementation had been written before
that red run, so the red state was reproduced by removing the two checks, not by running before writing. B2b and B2c were run the
same way (the two edits undone, then restored and compared): B2b failed on "has been decided", B2c on "the name is capped (215
characters)". Green: 84 test files (every file mentioning the touched modules, plus `tests/false-green-fence.test.js`), 2029
tests, 0 failed, 0 skipped. `npx eslint` over `streaming-gate.js`, `loop-b-driver.js` and the test file, `--max-warnings 0`: clean.
Known failures elsewhere, not this slice's and not run: `tests/readme-numbers.test.js` (README and VERSION disagree after another
session's release) and `tests/subplan-decomposition.test.js` (CLAUDE.md lost its `parent_plan` sentence). The whole `npm test`
was not run; the task is not completed.

### Discrepancy with the 2026-10-15 hook change

Commit 395bd70a turned `RECORD_REFUSALS_OFF` on in `src/hooks/protect-records.js`: the hook no longer refuses shell writes to
records or a background agent's menu routes (only the settings-file refusal remains). Statements in this plan that rely on the refusal
and are now untrue as written: the Problem Statement's "CTOC's one loaded hook ... already refuses the no-argument default screen to
a background agent"; "the hook's existing refusal of the no-argument route stays as defence-in-depth" (no such refusal runs today);
residual 1 ("routes the hook refuses when it sees them, but not when a launcher hides them"); the Security Review line on
`screen.ready` ("refused to a background agent by the write protection when it can see it"); and the whole `rg --pre` bypass story (with the
block off there is nothing to bypass, though a launcher still reaches the menu). Nothing in the code or tests of this slice depends on
the refusal: S23-3 spawns `start.js` directly, and the guard `crossed &&` is what stops a read crossing. The invariant this slice
delivers (opening a screen crosses nothing) holds with or without the hook; the residual routes (`stream approve`, `stream answer`,
`menu task complete --continue`) are now reachable by a background agent in plain text, not only behind a launcher. No plan text was
changed for this (the plan body is hashed); reported to the CTO Chief.

### Decisions taken under ambiguity during the build

1. **The beacon plan sits in `review/`, not `functional/`.** The plan says the beacon (an open-fork plan) is the decision the default
   screen asks "on every version". The first run showed otherwise: the screen lists review, then implementation, then functional;
   before the fix the read crosses `target.md` into `implementation/`, which then comes first, so a functional beacon went missing in
   the red run (the plan calls that a test defect). A beacon in `review/` (an open fork keeps it pending, so it never finishes) is
   first on every version. The target stays in `functional/`.
2. **Case 52 and the four case 56 "guard" variants are red before the fix**, because they now assert that a bare read moves nothing, as
   the Test Plan describes; the table's "passes" was wrong for that half of each case. The crossing halves are unchanged.
3. **The sweep in `planDecisionScreen` reports its fault instead of an empty catch.** The plan's `catch { /* fail-soft */ }` is
   a "silent catch" site the false-green fence flags as new (`tests/false-green-fence.test.js`, and the baseline may only shrink). The
   catch now says "New questions could not be taken in (…)." at the top of the screen text, the sentence the default screen already
   uses. A fault still leaves the plan reading as not ready, as designed.
4. **Three tests added beyond the plan**, to kill mutants no planned test killed: B3b (failing validation with enough information),
   B3c (a built review plan is never on the ready line) and B9b (the sweep fault sentence on the plan's own screen, with the plan not
   shown as ready).
5. **`loop-b-directive.test.js`:** the replacement test also asserts that the continuation's pass crosses the same plan (a positive
   control after the read), and one extra test pins that `opts.crossed` still names crossings.
6. **Mutants were run by a script** that applies each one to the saved copy, runs the six declared test files, copies the saved file
   back and compares bytes; the plan describes the same steps by hand.

### Step 16: FINAL-REVIEW (2026-10-18)

Checked by reading the code in the working tree (`src/lib/streaming-gate.js`, `src/lib/loop-b-driver.js`, `src/commands/start.md`,
`.github/workflows/tests.yml`) and the tests, and by running the seven touched test files (`plans-keep-moving-without-the-human`,
`streaming-gate`, `sufficiency-evidence`, `answers-bind-to-plan-revision`, `streaming-gate-coverage-holes`, `loop-b-directive`,
`menu-protocol`): 292 tests, 292 passed, 0 failed, 0 skipped; `npx eslint --max-warnings 0` on `streaming-gate.js`, `loop-b-driver.js`
and three test files: exit 0. The whole `npm test` is the completion's gate run, not run here.

**Security Review boxes** (all ticked)
- Trust boundary, the read no longer crosses: the guard `crossed &&` first in the pre-build condition, `streaming-gate.js:1099`; S23-1 (10
  read entries) and S23-3 (six launchers); red under mutant M1 (Step 10). Ticked.
- `screen.ready` adds no route: `withReady` builds only `stream approve ${d.ref}` (`streaming-gate.js:2005`); `ref` comes from a
  `SAFE_PLAN_FILE` name; `src/commands/start.md:20` limits it to the owner's request. Ticked.
- The readiness check only reads and fails toward asking: `movesOnItsOwn` (`streaming-gate.js:1962`) returns false on any throw and calls the
  read-only `crossingBlocked` (`:864`: one ledger read, one spec-hash check, one existence check); the registry read is `task-registry.load`;
  tests B6, M9, M17. The plan screen's sweep is the sweep the default screen already runs (Step 13 record). Ticked.
- Residual 1 (explicit write routes), residual 2 (forged classification), the one limit behind both: named under "What this slice does and does
  NOT do" and the owner question, and corrected for the 2026-10-15 hook change under Decisions 16 to 21 and "Discrepancy with the 2026-10-15
  hook change"; the Step 13 records name them again. Not closed here, by design. Three boxes ticked.
- No new write route: `stream continue` / `streamContinue` appear nowhere in `src/` (exact-presence search, `src/`, 0 matches);
  `menu-screens.js` carries no s23 symbol (search below). Ticked.
- No hook change: `git diff 76278489 0c3abd71 -- src/hooks` is empty and `git diff -- src/hooks` in the working tree is empty. Ticked.
- No weakening of tests: Step 11 round 3 (PASS) confirms it; every converted check is red under its mutant (Step 10 list M1 to L3); the only
  tightening added in the fix round is B6b, B6c (Decision 31). Ticked.
- No secrets, no new dependency: Step 13 hand scan found 0 hits; `git diff 76278489 0c3abd71 -- package.json` is empty (the working tree's
  `package.json` carries a one-line version change from another session's release, not a dependency). Ticked.
- The workflow review before the build (already ticked at the plan stage): "## Plan-stage security review of the workflow change".

**Acceptance boxes** (all ticked except the `npm test` box, which is ticked last, see below)
- Every read entry leaves the plans where they were: S23-1 loop (`tests/plans-keep-moving-without-the-human.test.js:1916`, ten entries
  including `plan <ref>`). Ticked.
- The continuation and the crossing pass still cross: S23-2 (`:1924`); loop-b-directive positive control. Ticked.
- Launchers: S23-3 (`:1942-2024`), the beacon proof in `proveLauncher`, scrubbed environment in `scrubbedEnv`; the red run and M1 record the
  CROSSING assertion with the beacon present for all six (Step 8 "The red run"; Step 10 notes). Ticked.
- ripgrep is not a prerequisite: the `rg --pre` case is registered only when `rg --version` runs, a failing case only when `process.env.CI`
  is set, nothing skipped (`:1999-2013`). Registered on this machine (ripgrep 14.1.1, Step 8). Ticked.
- No hook change, no `stream continue` route: see the Security Review lines above. Ticked.
- Ready plan not asked, named on one line, `screen.ready`, his approve recorded as his: B1, B2, B2b to B2d, B3, B7 (all green in the run
  above). Ticked.
- The line is true about what will move the plan, both forms, registry unreadable counts as idle: B8 (`:2356`), `readyStatus`
  (`streaming-gate.js:1990`); M10, M11, M12. Ticked.
- The plan's own screen: B9 (`:2389`), B9b, B4; M13, M14, M16. Ticked.
- Not-ready cases stay asked with Approve Recommended: B4, B5, B6, B6b, B6c; M7, M8, M9. Ticked.
- Realigned contract cases pass, nothing weakened: the 11 probe failures (Step 8) are all crossing assertions in declared files and now pass
  through the crossing pass; Step 11 round 3. Ticked.
- Hollow "nothing crossed" checks converted and red under their mutant: Step 9 list (case 9, case 10, coverage-holes faulted half, case 41,
  case 55, case 58) with mutants L1, L2, L3 and M17 to M19 (Step 10), and the critic's confirmation at Step 11. Case 55 is held by two
  independent conditions and is red only when both are off (stated in Step 9 and Step 10); ticked on the critic's confirmation.
- The before/after snapshot is gone from `loop-b-driver`: `preBuildSnapshot`, `SUFFICIENCY_SOURCE_STAGES` and `readPlans` appear nowhere in
  `src/lib/loop-b-driver.js` (exact-presence search, 1 file, 0 matches); `readPending` is a plain read (`:151`); the stub test is replaced
  (`tests/loop-b-directive.test.js`: "NOT crossed or named by the on-open read", with a positive control); `namedCrossedLines` (`:166`) is
  tested by "the opts.crossed path". Ticked.
- Step 15's search recorded with every hit read and marked: "### Step 15: DOCUMENT" above. Ticked.
- The empirical Step-8 run: baseline, scope snapshot, probe list (11), red run (29), 24 mutants with byte-equality, no `git checkout`,
  `restore`, `stash` or `reset`: "### Step 8: TEST" and "### Step 10: IMPLEMENT" above (the last is taken from the record, not
  re-observable now). Ticked.
- Scope by content: see the next section. Ticked.
- The plan-stage workflow review is recorded before the build: "## Plan-stage security review of the workflow change"; "### Step 9:
  PREPARE" first bullet. Ticked.

**Scope by content.** Method: the scope script in `compare` mode (`scope-hashes.js`) against the Step-8 snapshot. The snapshot still
existed in the scratchpad (`s23/scope-step8.json`) and its sha256 equals the recorded one
(`a1673aa29d72c9e08de9bdfa3da98a9c805b0c653af9558af9a12df3ceb7eb79`). It lists 77 paths whose content differs from Step 8 (the tree has
since had this slice's source edits, the commit `0c3abd71`, the merge `247c1ffa` and other sessions' work). Marks:
- (a) declared files of this slice, all ten expected: `src/lib/streaming-gate.js`, `src/lib/loop-b-driver.js`, `src/commands/start.md`,
  `.github/workflows/tests.yml`, `tests/plans-keep-moving-without-the-human.test.js`, `tests/streaming-gate.test.js`,
  `tests/sufficiency-evidence.test.js`, `tests/answers-bind-to-plan-revision.test.js`,
  `tests/streaming-gate-coverage-holes.test.js`, `tests/loop-b-directive.test.js`.
- (b) this plan's own file: `plans/todo/…-s23-…md` (the menu's cleanup moved it from `plans/in-progress/`).
- (c) not this slice's, reported and never reverted, by origin: other slices of the same round, committed in `0c3abd71` or built since
  (`src/lib/menu-screens.js`, `src/scripts/release.js`, the three s26 test files, `tests/helpers/hotfix-check-harness.js`,
  `tests/menu-task-wiring.test.js`, `tests/promote-quarantine-parity.test.js`, `tests/reachability-surface-scan-is-linear.test.js`,
  `tests/release-metadata-sync.test.js`, `tests/task-reconcile-quarantine-fault.test.js`, `tests/verify-fails-loudly.test.js`); another
  session's operating-lesson and README work (`CLAUDE.md`, `README.md`, `docs/OPERATING_LESSONS.md`, `.ctoc/templates/operating-lessons.md`,
  `agents/coordinator/cto-chief.md`, `agents/iron-loop/iron-loop-executor.md`, `tests/claude-md-keeps-every-rule.test.js`,
  `tests/compaction-eval/cto-chief/rule-inventory.json`, `tests/update-command-coverage.test.js`); records CTOC itself wrote
  (`.ctoc/approvals/*` 10, `.ctoc/inbox/questions/*` 3, `.ctoc/streaming/*` 4, `.ctoc/false-green-baseline.json`); and the other plan files in
  `plans/functional`, `plans/implementation`, `plans/in-progress`, `plans/review` and `plans/todo` (26 of the 28 plan paths listed; the other two are this plan's old and new path, mark (b)).
- Check that no undeclared file carries this slice's work: an exact-presence search for `movesOnItsOwn|askQueue|readyStatus|withReady|stripInvisible|
  crossingBlocked|screen.ready` over the 20 changed files outside the declared ten that are neither plans nor `.ctoc/` records matched 0 files (`src/lib/menu-screens.js`
  included).
- Content method as the second check: `git diff 76278489...0c3abd71 --stat` shows 33 files, but the commit also carries slices other than s23
  (inbox, actions, menu-screens, task-view, six test files for them), so the stat alone cannot attribute; the search above does. The
  uncommitted working-tree changes in the declared files are the fix round (`stripInvisible` in `streaming-gate.js`, the `ready` bullet
  sentence in `start.md`, B2d, B6b and B6c in the test file); the rest of the working-tree `git diff --stat` is in files outside the declared ten.
- Result: this slice changed only its declared files (and this plan's record). No finding.

**Ticked immediately before the completion's gate run (CTO Chief ruling of 2026-10-18):** the validator refuses evidence older than the
plan's last change, so the boxes must be ticked before the run. The completion's verify record is the proof; a failing run blocks the finish,
and the boxes are then unticked. The three boxes concerned: the `npm test` acceptance box, the Step 14 box and the two Step 16 boxes.

## Decisions Taken Under Ambiguity

Decided by the recommended option when this plan moved on; none of these needed the human.

- Noted, no decision needed: one high-severity hole outside this slice, the skill-issue validation workflow that lets any GitHub account inject code through issue text, then the lesser notes, worst firs — Noted (question q98-critique-coverage-r1791876834565)
- Lens verdict: APPROVE — every finding the four review lenses raised is answered in the current plan text, and the two questions before this one are yours: they hold this slice until you answer them, a — Approve slice 23 for building (question q99-gate-ruling-r1791876834565)
