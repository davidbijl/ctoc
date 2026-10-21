---
title: "The manual, the docs and the screens stop claiming what CTOC no longer does: which moment is the owner's, and which hooks really run"
type: implementation
created: 2026-10-07
priority: high
effort: medium
parent_plan: ctoc-keeps-working-and-asks-only-what-matters
depends_on: ctoc-keeps-working-and-asks-only-what-matters-s3-instructions-say-what-the-code-does
files:
  # The user manual, and the test that pins two of its sentences (it also gains the fence that keeps every corrected sentence corrected)
  - README.md
  - tests/readme-numbers.test.js
  # Docs
  - docs/IRON_LOOP.md
  - docs/PROJECT_REFERENCE.md
  - docs/INDEPENDENCE.md
  - docs/PROCESS_FMEA.md
  - docs/CRITICAL_CONTROL_POINTS.md
  - docs/CONFIG_SOURCES.md
  # The rules file: the key-entry-point rows for two unloaded hooks
  - CLAUDE.md
  # The machine-readable tier registry
  - .ctoc/architecture/tier-definitions.yaml
  # Screens the owner reads, each with the test that pins its words (red first)
  - src/commands/start.js
  - tests/menu-environment.test.js
  - tests/compliance-ride-along.test.js
  - src/lib/gate-words.js
  - tests/gate-words.test.js
  - src/lib/loop-b-driver.js
  - src/lib/menu-screens.js
  - tests/dashboard-says-the-moment.test.js
  # Agents under a compaction inventory: the agent, its inventory (replaced orders, ceiling correction), its inventory test (touched only if an order floor must move)
  - agents/coordinator/cto-chief.md
  - tests/compaction-eval/cto-chief/rule-inventory.json
  - tests/cto-chief-compaction.test.js
  - agents/iron-loop/red-team-critic.md
  - tests/compaction-eval/red-team-critic/rule-inventory.json
  - tests/red-team-critic-compaction.test.js
  - agents/iron-loop/devils-advocate-critic.md
  - tests/compaction-eval/devils-advocate-critic/rule-inventory.json
  - tests/devils-advocate-critic-compaction.test.js
  # Instruction surfaces with no compaction inventory
  - agents/coordinator/ivv-chief.md
  - agents/iron-loop/iron-loop-executor.md
  - skills/agent-fragments/ancestry-read.md
  - src/commands/start.md
---

# The manual, the docs and the screens stop claiming what CTOC no longer does

A sibling of the three slices of `plans/functional/ctoc-keeps-working-and-asks-only-what-matters.md`.
It builds only after slice 3 (`ctoc-keeps-working-and-asks-only-what-matters-s3-instructions-say-what-the-code-does`)
has landed on `main`, because it edits eight of slice 3's files (`CLAUDE.md`, `docs/IRON_LOOP.md`,
`docs/PROJECT_REFERENCE.md`, `src/lib/menu-screens.js`, `src/commands/start.md`,
`agents/coordinator/cto-chief.md`, `agents/iron-loop/red-team-critic.md`,
`agents/iron-loop/devils-advocate-critic.md`, with their inventories) at sentences slice 3 does
not touch. Every location below was read on `main` 547bd62c (v6.14.119) and again on slice 3's
built tree (branch `worktree-agent-aa7748b330f80c58d` at eba3da12), which is what `main` holds
once slice 3 merges; line numbers are those of the built tree. The order ids are as they stand
in that tree's inventories, where slice 3 already replaced, among others, R-043, R-044, R-107,
R-108, R-132, R-193–R-195, R-324, R-395, R-438–R-440, R-443–R-445 and S-001 (CTO Chief), D-369
and D-370 (devil's advocate) and RT-604 (red team); none of those is touched here. The builder
follows the quoted text where a line has moved.

## Problem statement

Two things changed on 2026-10-06 and 2026-10-07, and the manual, several docs, three agents
and four screens the owner reads still describe the old world. Slice 3 corrects the
instruction surfaces it names; its Decisions 16 and 24, its builder's report and the review of
its build leave exactly these.

1. **Which moment is the owner's.** Since v6.14.119 only vision → functional is always the
   owner's approval. Functional → implementation and implementation → todo cross in the menu's
   own code on recorded evidence when the gate critic's classification leaves no question for
   him (also when the default screen opens); review → done crosses on the recorded checks inside
   the continuation after a build. A crossing on evidence is recorded as evidence, never as his
   approval, and the CTO Chief approves no crossing (slice 3, order R-043).
2. **Which hooks run.** `hooks/hooks.json` registers exactly one command,
   `src/hooks/protect-records.js` (the write protection for the approval records, the check
   records and the owner's recorded answers). `.claude-plugin/hooks.json` is not a location
   Claude Code loads, so the edit hooks, the shell hook, the gate hook `human-gate-check.js`,
   the Stop hooks, `SessionStart.js`, `SubagentStop.js` and the two `PostToolUse` hooks do not
   run. `docs/ENFORCEMENT.md` already says so in its first paragraph.
3. **What the menu's crossing does not do.** The crossing in the menu's code reads no IV&V
   finding, no production-readiness checklist and runs no compliance review; the texts that say
   a finish waits for those were written when a human or the CTO Chief drove every crossing.

Verified by reading the files and the code (nothing was run): `revertAll` is called only
inside `human-gate-check.js` itself; `enforcement-mode.js` is required only by
`PreToolUse.Edit.js`; `actions.movePlan` re-paths a moved plan in the plan index but only the
`PostToolUse.plan-index-sync` hook re-embeds changed text; `init-project.js` installs the git
post-commit hook only when `installGitHook` is passed, defaults it to `false`, and says
"nothing OFFERS the hook yet"; `plan-recovery.recoverOrphanedPlans`, run from the dashboard,
moves a plan whose build task is gone from `in-progress` back to `todo`; no module in
`src/lib` reads `ivv`, `isControlEnabled` is called by no crossing code, the only code that
names `production-readiness.yaml` is a file-existence check in `iron-loop-enforcer.js`, and no
compliance call appears in `streaming-gate.js`, `menu-screens.js`, `actions.js`,
`streaming-precompute.js` or `loop-b-driver.js` (presence checks, confirmed at Step 9 by
reading the crossing functions).

**The census — every untrue sentence this plan corrects:**

| File, line | What it says now | Why it is untrue |
|---|---|---|
| `README.md` ~16 | "**4 mandatory human gates**"; "never overriding a human gate"; "adversarial review and the four human gates catch what a first pass misses" (pinned by `tests/readme-numbers.test.js`) | three of four move on evidence |
| `README.md` ~30, ~133, ~184–193, ~208, ~241 | "the four moments that are yours"; "Four transitions never happen without you"; "A plan parked past one of them without your marker is reverted automatically" | as above; no hook reverts |
| `README.md` ~91–106, ~113, ~116 | the first-run capture shows the screen text corrected below in this table; the table says the environment sets "How strict CTO Chief is with *itself* … It never weakens a human gate"; the correction sentence | the screen is corrected in code (item 6), so the capture is retaken and the correction goes |
| `README.md` ~125 | "Every environment keeps all four human gates" | as above |
| `README.md` ~245, ~246 | "You approve what to build … then you confirm"; "You approve how to build it" | both move on evidence |
| `README.md` ~290 | the Lesson 4 capture's header carries "nothing is finished until you say so" | the screen is corrected in code (item 6), so the capture is retaken |
| `README.md` ~322, ~342 | "While you were away, an adversarial critique fleet … already examined each waiting plan"; "questions are computed ahead of demand"; "no critique has been recorded for it yet" | since v6.14.93 the fleet runs only on request; the author writes the questions and the gate critic classifies them |
| `README.md` ~397, ~666 | Step 16: "the plan lands in review, waiting for your OK"; "the plan waits for your OK" | it finishes on its checks unless a question needs him |
| `README.md` ~441 | "Only you, crossing the build gate through the menu, widen scope." | the build crossing may be the menu's on evidence |
| `README.md` ~458–460 | Lesson 6: each review plan is asked "Is … finished?" | a passing build finishes on its own |
| `README.md` ~479, ~889 | "To let the post-commit hook push on its own…"; "A background quality agent runs on every commit" | setup does not install that git hook and nothing offers it |
| `README.md` ~494–527 | Lesson 7 teaches the edit block as something the reader will see; the floor and question 3 name "the four human gates" | the edit and shell hooks are not loaded |
| `README.md` ~591 | recipe "less strict": choosing Development or `enforcement.mode: soft` makes CTOC less strict; "The human gates stay." | the mode takes effect only through an unloaded hook |
| `README.md` ~625–647 | "4 human gates"; "Gate 1/2/3: you approve …" | three move on evidence |
| `README.md` ~672 | "File-edit, shell-write, commit, and gate-residency enforcement are hooked (a plan at a gate destination without a human marker is reverted)" | not loaded |
| `README.md` ~682 | CTO Chief "approves all gate crossings" | it approves none |
| `README.md` ~688, ~725, ~1048 | the fleet examines every waiting plan "ahead of demand"; "pros and cons precomputed in the background"; "Adversarial fleet writes pros/cons before you look" | the fleet runs only on request |
| `README.md` ~724, ~728, ~737 | "Steps 1-7: agents ask questions and you decide … you review the result"; "4 human gates"; one setting "tunes enforcement strictness, auto-push" | as above |
| `README.md` ~805 | "Each ready template carries a **production-readiness checklist** enforced at the final gate (review → done)." | no code checks it at the finish; the implementation planner copies it into the plan |
| `README.md` ~834 | "At the functional → implementation transition, CTO Chief runs the compliance trigger and, when a regime is on, the compliance evaluation as two shipped recipes" | the menu's own crossing runs neither; only a CTO Chief driving that step does |
| `README.md` ~849 | "A `PostToolUse.plan-index-sync` hook re-embeds plans as they change, so search always reflects fresh disk state." | not loaded |
| `README.md` ~857–870 | the Enforcement column of the environments table; "The four human gates are mandatory in every environment" | not loaded; three move on evidence |
| `README.md` ~874–883 | the Enforcement table presents four hook rows as running | only the last row runs |
| `README.md` ~1059 | "Human approval gates — 4 mandatory checkpoints" | as above |
| `README.md` ~1087 | "the gate hook reverted it and logged the violation" | not loaded |
| `src/commands/start.js` ~25–28, ~34–36 | the first-run environment banner "(dev = soft enforcement, never auto-push · staging = strict, manual push · prod = strict, auto-push after gates). The four human gates stay mandatory in every environment."; the options "Soft enforcement…", "Strict enforcement…", "Strict enforcement, auto-push after gates" | enforcement is read only by an unloaded hook; no profile turns auto-push on; three moments move on evidence |
| `src/commands/start.js` ~92–93 | the compliance banner "The four human gates stay mandatory." | as above |
| `src/lib/gate-words.js` ~54, ~61, ~68 | the moment lines "nothing is finished until you say so", "nothing gets built until you say build it", "no idea becomes a build plan until you agree it's the thing to build" | those three move on evidence unless a question needs him |
| `src/lib/loop-b-driver.js` ~250 | the fallback literal "nothing is finished until you say so" | as above |
| `src/lib/menu-screens.js` ~2528 | the completion line "moved to review (… the evidence is saved for when you decide it's finished)" (pinned by `tests/dashboard-says-the-moment.test.js` ~262) | a built plan whose checks passed finishes on that evidence unless a question needs him |
| `.ctoc/architecture/tier-definitions.yaml` ~15 | tier 0: "Sole dispatcher. Owns audit trail. Approves all gate crossings." | it approves none |
| `docs/IRON_LOOP.md` ~14 | "File-edit, commit, and gate-residency enforcement ARE hooked — … a plan parked at a gate without a human marker is auto-reverted." (pinned by `tests/readme-numbers.test.js`) | not loaded |
| `docs/IRON_LOOP.md` ~388–432 | "Hook Enforcement": "The Iron Loop's file-edit enforcement runs as hooks before every Edit/Write operation", a step-based flow and a modes table saying `soft` and `off` are "Planned" | not loaded; and stale against `docs/ENFORCEMENT.md` (all three modes are built, coverage replaced the step check) |
| `docs/IRON_LOOP.md` ~438 | "CTOC automatically detects and offers recovery. Detection is implemented in `src/hooks/SessionStart.js`" | not loaded |
| `docs/PROJECT_REFERENCE.md` ~91 | the synthesizer sentence ends "; CTO Chief approves." | the CTO Chief approves the change list, never a crossing |
| `CLAUDE.md` ~110–111 | key entry points: `PreToolUse.Bash.js` "Edit/commit enforcement"; `human-gate-check.js` "Human gate violation detection + auto-revert" | not loaded |
| `agents/coordinator/cto-chief.md` ~54 (R-011), ~60 (R-014) | "enforced by the Stop hook `stop-continuation-gate.js`"; "the Stop hook BLOCKS a premature stop" | not loaded |
| `agents/coordinator/cto-chief.md` ~121 (R-046, invariant 4) | "the pre-tool hook auto-reverts unauthorized gate crossings" | not loaded |
| `agents/coordinator/cto-chief.md` ~497 (R-323) | the synthesizer integrates the findings "into a minimal change list before the CTO Chief approves." | read against invariant 3 it says the CTO Chief approves the result; it approves only the change list |
| `agents/coordinator/cto-chief.md` ~701 (R-428) | "A pre-tool hook handles detection and auto-revert, but YOU must:" | not loaded |
| `agents/iron-loop/red-team-critic.md` ~350 (RT-605) | "Your JSON is the artifact; [[gate-critic]] synthesizes it and the dispatcher writes the questions file." | the gate critic writes the synthesis to the waiting folder and the menu's sweeper validates it |
| `agents/iron-loop/devils-advocate-critic.md` ~229 (D-304) | "[[gate-critic]] merges your findings and the dispatcher writes them through `streaming-precompute.writePlanQuestions`." | same |
| `agents/coordinator/ivv-chief.md` ~59 | "**You can BLOCK Gate 3.** … a Gate 3 is not crossed over unresolved critical IV&V findings. … the block is the distinct-identity requirement plus the human's decision" | the crossing on evidence reads no IV&V finding, and the identity check is not enforced |
| `agents/iron-loop/iron-loop-executor.md` ~112–113, ~118, ~125, ~127, ~131 | "A pre-tool hook monitors ALL tool calls … automatically reverted"; "the enforcement hook will REFUSE the write"; "REVERTS your plan" twice; "so the Stop hook permits the halt" | not loaded; what really happens is that the plan's approval stops verifying |
| `skills/agent-fragments/ancestry-read.md` ~16 | "(the enforcement hook will block edits outside that list)" | not loaded; read by every dispatchable agent |
| `src/commands/start.md` ~61 | "Without that entry the gate hook correctly flags the archive and reverts it." | not loaded |
| `docs/INDEPENDENCE.md` ~23, ~83 | "This separation is enforced by the hook in `src/hooks/human-gate-check.js`"; "the pre-tool hook … can therefore reach `done/` today with a single approver" | not loaded; a plan can now reach `done/` with no approver |
| `docs/PROCESS_FMEA.md` ~138, ~141, ~334, ~338 | "The human-gate-check hook auto-reverts plans …"; "the human gates are enforced by `src/hooks/human-gate-check.js` … the user does"; "plus the human gate make this rare"; "CTO Chief is the final approver before Gate 3 … verifies … the human-approval marker AND the production-readiness gate" | not loaded; crossings on evidence; the CTO Chief approves none; no code checks production readiness |
| `docs/CRITICAL_CONTROL_POINTS.md` ~122 | "PreToolUse hooks scan for stub markers" | not loaded |
| `docs/CONFIG_SOURCES.md` ~13, ~25 | "The PreToolUse hooks run on **every** file edit"; the enforcement-strictness row | not loaded |

## Technical approach

Smallest true edit per sentence; no gate number in any new sentence a person reads; a screen's
words are changed in its code, and the manual's captures of it are retaken from the real
screen, never edited by hand. Three text patterns, in this order of preference:

- **Rewrite the sentence** to say what the code does (most rows).
- **Where a whole section describes an unloaded hook** (README Lesson 7, README's Enforcement
  table, IRON_LOOP's crash recovery), keep it and add one sentence that the hook is not loaded
  and the section describes it as it works when loaded — the pattern `docs/ENFORCEMENT.md`
  already uses. IRON_LOOP's "Hook Enforcement" body is the exception: it is also stale against
  `docs/ENFORCEMENT.md`, so it is replaced by one paragraph that points there.
- **No branch is added to any code**: each code change replaces a string literal inside an
  existing branch.

### 1. `README.md` (MODIFY)

Every quoted fragment is replaced as shown; text around it is unchanged.

**Lead paragraph (~16).**
- "with **4 mandatory human gates**" → "with **4 gates** — the idea is always yours to approve, and the other three move on their recorded evidence unless a question needs you"
- "always advising, never overriding a human gate" → "always advising, never moving a plan"
- "because adversarial review and the four human gates catch what a first pass misses" → "because adversarial review, the recorded checks and your answers to the questions that matter catch what a first pass misses"

**Course table (~30).** "name the four moments that are yours" → "say which moment is always yours and when the others wait for you"

**Lesson 1.**
- The capture (~91–106) is replaced by a new real capture: after item 6 is built, run `node src/commands/start.js` in a fresh scratch project holding a `package.json` and one source file (the shape the sentence above the capture names), and paste the `text` it prints, verbatim.
- ~113, the environment row's last cell: "How strict CTO Chief is with *itself* — see [Environments](#environments--dev--staging--prod). It never weakens a human gate." → "Cost estimates and the default model — see [Environments](#environments--dev--staging--prod). The edit strictness it sets applies only while CTO Chief's edit hooks are loaded, which they are not today, and it never changes when a plan moves on."
- ~116: the sentence "One correction to the screen text above: … no profile turns auto-push on." is deleted; the screen now says it itself.
- ~125: "→ *No. Every environment keeps all four human gates.*" → "→ *No. No environment changes how a plan crosses: a built plan finishes only when every step 8–16 is checked in the plan and its recorded checks passed, or with your OK.*"

**Lesson 2.**
- ~133: "say which four moments in the pipeline are yours to decide" → "say which moment is always yours and when the other three wait for you"
- ~184: "**The four moments that are yours.** Four transitions never happen without you. In plain words:" → "**The four moments.** Four transitions move a plan forward. In plain words:"; the table header "What you are deciding" → "What is decided"; its rows unchanged.
- ~193, the paragraph "Nothing crosses these on its own. … you will not see those numbers on your screen.)" becomes: "The first is always yours: an idea leaves the vision stage only on your approval. The other three move on by themselves when the plan's recorded evidence is enough — for a plan still being planned, its questions checked by an independent gate critic with none left for you; for a finished build, every step checked and its recorded checks passed — and that crossing is recorded as evidence, never as your approval. A question of high uncertainty or huge importance (a technology stack, an algorithm, a data model, security, cost, anything irreversible) stops its plan until you answer, and you can always approve a plan yourself. No agent crosses any of them. (The docs and the code call them Gate 0–3; you will not see those numbers on your screen.)"
- ~208: "3. Name the four moments that are yours. → *Idea to explore · what to build · how to build it · is it finished.*" → "3. Name the four moments, and the one that is always yours. → *Idea to explore · what to build · how to build it · is it finished. The first is always yours; the other three wait for you when a question needs you.*"

**Lesson 3.**
- ~241: "is the first of your four moments" → "is the moment that is always yours"
- ~245: "4. **You approve what to build.** Each functional plan is validated first, then you confirm (Lesson 4 shows the screen)." → "4. **What to build.** Each functional plan is validated, and the gate critic checks its questions; it moves on to technical planning by itself unless a question needs you (Lesson 4 shows the screen)."
- ~246: "6. **You approve how to build it.** On the implementation list, the word `todo-all` moves every slice to `todo` and starts the build (Lesson 5)." → "6. **How to build it.** Each slice moves to `todo` and starts building by itself once its questions are checked and none needs you; on the implementation list, the word `todo-all` approves every slice yourself and starts the build (Lesson 5)."

**Lesson 4.**
- The capture (~290–307) is replaced by a new real capture: after item 6 is built, create a scratch project with one review plan declaring a few files and paste the header line and scope block that `streaming-gate.streamingGateScreen` prints for it, verbatim, with "…the plan body follows…" kept for the body.
- ~322: "**Precomputed decisions.** While you were away, … exactly one marked recommended when there is an objectively better answer." → "**Decision questions.** The agent that wrote a plan also writes its questions. An independent gate critic checks them, adds one for every weighty choice the author left unasked, and decides which need you: a technology stack, an algorithm, a data model, security, cost, anything irreversible, or a fork with no clearly better answer. Every other question is decided by its recommended option and written into the plan. When a plan has a real fork, the screen asks *that* instead of a bare yes/no — each option with its pros and cons, exactly one marked recommended when there is an objectively better answer. The full adversarial critique (pre-mortem, devil's-advocate, red-team, plus a defense lens arguing *for* crossing) runs in the background when you choose *Generate its questions*." The sentence after it and its capture stay.
- ~342: "You never wait for a critique to run: … no critique has been recorded for it yet." → "You never wait for a critique: it runs in the background, and a plan whose questions are not ready yet simply gets the plain question. While the gate critic has not checked the questions an author wrote, the screen says so and offers *Check its questions*; it never shows you an author's questions unchecked. The line `Enough information: NO — nobody has worked out what this plan still needs to be asked` means that no questions have been written for that plan yet."

**Lesson 5.**
- ~397, in the code block: "16 FINAL-REVIEW → the plan lands in review, waiting for your OK" → "16 FINAL-REVIEW → the plan lands in review, then finishes on its recorded checks unless a question needs you"
- ~441: the sentence "Only you, crossing the build gate through the menu, widen scope." is deleted.

**Lesson 6.**
- ~458 Outcome: "you can approve finished work one plan at a time or as a wave, and push through the quality gate." → "you know when finished work moves on by itself, you can approve what waits for you one plan at a time or as a wave, and you can push through the quality gate."
- ~460: "**One plan.** Open `/ctoc:start`; each review plan is asked as *"Is … finished?"* (Lesson 4)." → "**On its own.** A built plan whose every step is checked and whose recorded verification passed finishes by itself when the session continues after the build, unless a question needs you; that crossing is recorded as evidence naming the check record, never as your approval, and it never deploys. A plan whose verification failed stays in review. **One plan, yourself.** Open `/ctoc:start`; a review plan still waiting is asked as *"Is … finished?"* (Lesson 4)." The rest of the paragraph stays.
- ~479: "To let the post-commit hook push on its own, set `git.autoPushEnabled: true` in `.ctoc/settings.json`." → "The git post-commit hook can push on its own when `git.autoPushEnabled: true` is set in `.ctoc/settings.json`, but project setup does not install that hook and nothing in the menu offers it yet."

**Lesson 7.**
- After the Outcome line (~494), insert: "> [!NOTE]\n> **Today nothing blocks the edit.** The edit and shell hooks that print this message are not loaded: CTO Chief loads only its write protection for the approval records, the check records and your recorded answers (see [Enforcement](#enforcement)). Every agent is instructed to edit only the files a plan in building declares and to ask you through a scope-growth question for any other. The rest of this lesson describes those hooks as they work when loaded."
- ~518: "…the streaming-questions deny, any security deny on the shell channel, or the four human gates." → "…the streaming-questions deny or any security deny on the shell channel, and they change no crossing."
- ~527: "3. Does `enforcement.mode: off` disable the four human gates? → *No. It relaxes edit coverage only.*" → "3. Does `enforcement.mode: off` change how a plan crosses? → *No. It relaxes edit coverage only, and only while the edit hooks are loaded.*"

**Recipes (~591).** "The human gates stay." → "Both take effect only while the edit hooks are loaded, which they are not today (see [Enforcement](#enforcement)); how plans cross does not change."

**Reference — The Iron Loop.**
- ~625: "16 steps, 4 phases, 4 human gates" → "16 steps, 4 phases, 4 gates"
- ~628–647, the code block: "agents ask questions, you decide" → "agents ask what matters, you decide"; "Gate 0: you approve the idea to explore" → "You approve the idea to explore"; "— agents ask what to build, you approve" → "— agents ask what to build"; "Gate 1: you approve what to build" → "Moves on its evidence, or waits for your answer"; "— agents ask how to build it, you approve" → "— agents ask how to build it"; "Gate 2: you approve how to build it" → "Moves on its evidence, or waits for your answer"; "AUTOMATED (Steps 8-16) — agents execute, you review" → "AUTOMATED (Steps 8-16) — agents execute"; "Gate 3: you approve the result" → "Finishes on its recorded checks, or waits for you". The parenthesised transitions stay, aligned in one column.
- ~666, row 16: "Verify Steps 8–15; the plan waits for your OK" → "Verify Steps 8–15; the plan finishes on its recorded checks unless a question needs you"
- ~672: "**Enforcement, honestly scoped.** One hook is loaded: the write protection for the approval records, the check records and your recorded answers. The file-edit, shell-write, commit and gate-residency hooks exist but are not loaded, so keeping to a plan's files, step execution, dispatch logging and the background-task protocol are instruction-level discipline the session model follows, not a code-enforced hook today."

**Reference — architecture, features, templates, compliance, plan index.**
- ~682: "CTO Chief — sole dispatcher, owns the audit trail, approves all gate crossings" → "CTO Chief — sole dispatcher, owns the audit trail and the final review; never approves a crossing itself"
- ~688: "Four lenses examine every plan waiting at a gate, in the background, ahead of demand:" → "When you ask for a plan's critique (*Generate its questions*), four lenses examine it in the background:"; "A **gate-critic** synthesizes them into the decision questions you saw in Lesson 4." → "A **gate-critic** synthesizes them into the decision questions you saw in Lesson 4, and also checks the questions each plan's author writes."
- ~724: "Steps 1-7: agents ask questions and you decide. Steps 8-16: agents execute and you review the result." → "Steps 1-7: agents ask you only what is of high uncertainty or huge importance and record every other choice in the plan. Steps 8-16: agents execute, and the result finishes on its recorded checks unless a question needs you."
- ~725: "…with pros and cons precomputed in the background; you never wait for a critique" → "the dashboard asks you only the decisions that need you, one at a time, most critical first, each option with its pros and cons; the full critique runs in the background when you ask, so you never wait for it"
- ~728: "16 steps across 4 phases with 4 human gates" → "16 steps across 4 phases with 4 gates: you approve the idea, and the other three move on their recorded evidence unless a question needs you"
- ~737: "one setting tunes enforcement strictness, auto-push, default model and log verbosity; no environment weakens a human gate" → "one setting tunes the default model and log verbosity, and the enforcement strictness the edit hooks use when loaded (they are not today); no environment turns on auto-push"
- ~805: "Each ready template carries a **production-readiness checklist** enforced at the final gate (review → done). Block-severity items in the B2C template include:" → "Each ready template carries a **production-readiness checklist**. The implementation planner copies its block-severity items into each plan built from the template; no code checks them when the plan finishes, so they hold as far as the build and its reviewers keep them. Block-severity items in the B2C template include:"
- ~834: "At the functional → implementation transition, CTO Chief runs the compliance trigger and, when a regime is on, the compliance evaluation as two shipped recipes; findings are deduplicated and attached to the plan and your inbox." → "When the CTO Chief takes a plan from what to build to how to build it, its instructions have it run the compliance trigger and, when a regime is on, the compliance evaluation as two shipped recipes; findings are deduplicated and attached to the plan and your inbox. The menu's own crossing on evidence runs neither, so the review happens only when the CTO Chief drives that step."
- ~849: "A `PostToolUse.plan-index-sync` hook re-embeds plans as they change, so search always reflects fresh disk state." → "The menu re-paths a plan in the index when it moves the plan; the `PostToolUse.plan-index-sync` hook, which re-embeds a plan when its text changes, is not loaded today, so search can lag behind a plan's latest text."

**Reference — environments, enforcement, quality gates.**
- After the environments table (~862), add: "The Enforcement column takes effect only through the edit hooks, which are not loaded today (see [Enforcement](#enforcement))."
- ~870: "**The four human gates are mandatory in every environment**, and no profile may set `git.autoPushEnabled` to true — enforced by `tests/environment-mode.test.js`." → "**No environment profile turns the review gate off (`requireReviewGate`) or sets enforcement to `off`**, and none may set `git.autoPushEnabled` to true — enforced by `tests/environment-mode.test.js`."
- Before the Enforcement table (~876), add: "Only the last row runs today: `hooks/hooks.json` registers `src/hooks/protect-records.js` alone, and every other CTO Chief hook stays unregistered on purpose ([`docs/ENFORCEMENT.md`](docs/ENFORCEMENT.md)). The other rows, and the logging described below the table, are those hooks as they work when registered."
- ~889: "A background quality agent runs on every commit without blocking your workflow; `/ctoc:push` runs the same checks in the foreground." → "`/ctoc:push` runs these checks in the foreground before it pushes. A background quality agent runs them on every commit only when the git post-commit hook is installed — project setup does not install it, and nothing in the menu offers it yet."

**Compare table.**
- ~1048: "| Precomputed gate decisions | Adversarial fleet writes pros/cons before you look |" → "| Questions only when they matter | Each plan's author writes its questions and an independent gate critic decides which need you |"
- ~1059: "| Human approval gates | 4 mandatory checkpoints |" → "| Approval points | You approve the idea; the other three move on recorded evidence unless a question needs you |"

**Troubleshooting (~1087).** "**A plan was moved back on its own:** it sat at a gate destination without your approval marker; the gate hook reverted it and logged the violation to `.ctoc/logs/gate-violations.json`. Approve it through the dashboard." → "**A plan was moved back on its own:** no hook reverts plans today — the gate hook that did is not loaded. The dashboard returns a plan from `in-progress` to `todo` when its build task is gone, so it can build again."

### 2. `docs/IRON_LOOP.md` (MODIFY) — lines slice 3 does not touch

- ~14, from "File-edit, commit, and gate-residency enforcement ARE hooked" to the paragraph's end: "One hook is loaded today: the write protection for the approval records, the check records and the owner's recorded answers (`src/hooks/protect-records.js`, described in [`ENFORCEMENT.md`](./ENFORCEMENT.md)). The file-edit, commit and gate-residency hooks exist but are not loaded, so planning before an edit, keeping to a plan's declared files and leaving every crossing to the menu are instruction-level discipline the session model follows, as are step execution, dispatch logging and the two-plane task protocol. So the methodology is enforced by a hook only where one is loaded, and by disciplined honor everywhere else — never a claim of enforcement the code does not keep."
- "## Hook Enforcement" (~388–432): the heading stays; from "The Iron Loop's file-edit enforcement runs as hooks" to the end of its "Escape Phrases" subsection becomes: "These hooks are not registered with Claude Code today; CTOC loads only its write protection for the approval records, the check records and the owner's recorded answers. How the file-edit hooks work when registered — their flow, the three enforcement modes, the always-writable files and the escape phrases — is in [`ENFORCEMENT.md`](./ENFORCEMENT.md). Until they are registered, planning before an edit and keeping to a plan's declared `files:` are instruction-level discipline." The escape-phrase list stays in Phase 1's "Escape Hatch".
- ~438: "…CTOC automatically detects and offers recovery. Detection is implemented in `src/hooks/SessionStart.js` with state managed by `src/lib/state-manager.js`." → "When an implementation session (Steps 8-16) is interrupted, `src/hooks/SessionStart.js` detects it and offers recovery, with state managed by `src/lib/state-manager.js` — when that hook is loaded. It is not loaded today, so CTOC does not detect an interrupted session on its own now; the rest of this section describes detection and recovery as they work when it is."

### 3. `docs/PROJECT_REFERENCE.md` (MODIFY)

~91, the end of the synthesizer sentence: "; CTO Chief approves." → "; the CTO Chief approves that change list, which crosses no gate." Slice 3's final-review sentence before it stays word for word.

### 4. Four further docs (MODIFY)

- `docs/INDEPENDENCE.md` ~23: "This separation is enforced by the hook in `src/hooks/human-gate-check.js`." → "No hook enforces this separation: it is an instruction-level discipline every agent in both chains follows (the IV&V Chief's Hard Isolation Rules), and the one loaded hook protects only the approval records, the check records and the owner's recorded answers." ~83: "the pre-tool hook `src/hooks/human-gate-check.js` does not reference" → "the gate hook `src/hooks/human-gate-check.js` — not loaded today — does not reference"; "A plan can therefore reach `done/` today with a single approver;" → "A plan can therefore reach `done/` today with a single approver, or with none when it finishes on its recorded checks;". `four_eyes_gate3` and `NOT ENFORCED` stay (`tests/agent-honest-status-fence.test.js` case 18, `tests/compliance-claims-match-code.test.js`).
- `docs/PROCESS_FMEA.md`:
  - ~138 Detection rationale: "Moderate. The human-gate-check hook auto-reverts plans missing the `approved_by: human` marker." → "Moderate. The gate critic checks the plan's questions and the plan waits for the human while a weighty one remains; no hook reverts a plan today (`human-gate-check.js` is not loaded)." The score stays 5 (Decision 9).
  - ~141: "**Mitigation**: the human gates are enforced by `src/hooks/human-gate-check.js` per the CLAUDE.md rules. The functional-reviewer NEVER self-approves Gate 1; the user does." → "**Mitigation**: a functional plan moves on to technical planning only in the menu's own code — on recorded evidence when no question needs the human, or on his approval (CLAUDE.md Critical Rule 1); `src/hooks/human-gate-check.js` is not loaded today. The functional-reviewer NEVER approves that crossing itself."
  - ~334 Occurrence rationale: "…plus the four-eyes Gate 3 control (when active) plus the human gate make this rare." → "…plus the four-eyes Gate 3 control (when active) plus the human's answer when a question needs him make this rare." The score stays 3.
  - ~338: "**Mitigation**: CTO Chief is the final approver before Gate 3 per the CLAUDE.md architecture. CTO Chief verifies the fourteen quality dimensions AND the human-approval marker AND the production-readiness gate (when SaaS template is active)." → "**Mitigation**: CTO Chief owns the final review (Step 16) and verifies the fourteen quality dimensions; the plan then finishes in the menu's own code on its passing recorded checks, or on the human's approval when a question needs him — never on the CTO Chief's. No code checks the production-readiness checklist at the finish." The "**NOT ENFORCED**: …" sentence after it stays word for word.
- `docs/CRITICAL_CONTROL_POINTS.md` ~122: "PreToolUse hooks scan for stub markers (`TODO`, `FIXME`, `XXX`, empty function bodies returning `null` or `pass`)." → "No hook scans for stub markers today (CTOC's PreToolUse hooks are not loaded)."
- `docs/CONFIG_SOURCES.md` ~13: "The PreToolUse hooks run on **every** file edit" → "When they are registered (they are not today — see [`ENFORCEMENT.md`](./ENFORCEMENT.md)), the PreToolUse hooks run on **every** file edit". ~25, the enforcement-strictness row's right cell gains at its end: "; it takes effect only while the edit hooks are loaded, which they are not today".

### 5. `CLAUDE.md` (MODIFY)

The rows "| `src/hooks/PreToolUse.Bash.js` | Edit/commit enforcement |" and "| `src/hooks/human-gate-check.js` | Human gate violation detection + auto-revert |" (144 bytes) become one row, "| `src/hooks/protect-records.js` | The one loaded hook: write protection for the records |" (92 bytes). Neither row is in `tests/fixtures/claude-md-rule-inventory.json`; the lessons block is not touched.

### 6. The screens (MODIFY) — string literals inside existing branches

- `src/commands/start.js`, `attachEnvironmentQuestion`: the banner becomes
  "⚙ No CTOC environment chosen yet for this project — pick one below\n  (dev = cost estimates shown · staging = rehearse production ·\n   prod = top model, minimal noise). Pushing stays yours in every\n  environment, and none changes when a plan moves on; the edit strictness\n  each sets applies only while CTO Chief's edit hooks are loaded, and they\n  are not today. Changeable later in System → Settings.\n\n"
  and the three option descriptions become "Shows cost estimates — fast local iteration", "Rehearse production — you push by hand", "Top model, minimal noise — you push by hand". Labels, actions and the "Keep defaults, stop asking" option are unchanged. (The profiles in `src/lib/settings.js`: dev shows cost estimates, staging sets only strict enforcement, prod sets the top model and hides cost estimates.)
- `src/commands/start.js`, `attachComplianceQuestion`: "The four human gates stay mandatory." → "It never changes when a plan moves on." The rest of the banner (RECORDED, NOT ENFORCED) stays.
- `src/lib/gate-words.js`, `EDGES`: `review.moment` → "built work finishes on its passing checks, or on your OK"; `implementation.moment` → "a plan starts building once no question needs you, or on your OK"; `functional.moment` → "an idea becomes a build plan once no question needs you, or on your OK". `vision.moment`, every chip, label and question unchanged. The new phrases carry no digit and no stage word (`tests/gate-words.test.js` cases 1, 3, 6c, 9).
- `src/lib/loop-b-driver.js` ~250: the fallback literal becomes the same review phrase, "built work finishes on its passing checks, or on your OK".
- `src/lib/menu-screens.js` ~2525–2528, the three branches of `verified` keep their conditions and gain their consequence, and the suffix goes:
  - passed: "the checks passed; it finishes on them when the session continues, unless a question needs you"
  - failed: "the checks FAILED; it stays there until they pass"
  - none: "no checks were run; it cannot finish on its own until a check record passes"
  - the line becomes `` text += ` · moved to review (${verified})`; ``

### 7. `.ctoc/architecture/tier-definitions.yaml` (MODIFY)

~15: `description: "Sole dispatcher. Owns audit trail. Approves all gate crossings."` → `description: "Sole dispatcher. Owns audit trail and the final review. Approves no gate crossing."`

### 8. `agents/coordinator/cto-chief.md` (MODIFY; compaction inventory)

Proposed words; final words recorded as each order's `new_anchors`.

- R-011 (~54): "Mechanism (`src/lib/continuation.js`; its Stop hook `stop-continuation-gate.js` is not loaded today, so nothing blocks a stop and keeping to this rule is yours). When the human authorizes a batch of N units, begin it with `continuation.startBatch(root, { label, total: N })`; call `continuation.advance(root)` as each unit completes and `continuation.status(root)` to check progress."
- R-014 (~60): "While the batch has remaining, fork-free work, keep driving it — the Stop hook that would block a premature stop is not loaded today."
- R-046 (~121): "Gate enforcement: no hook reverts an unauthorized gate crossing today (`human-gate-check.js` is not loaded); you find one through the monitoring duties below, alert the user and re-route."
- R-323 (~497): "Synthesizer dispatch: ALWAYS — the `synthesizer` sub-orchestrator (Tier 1) integrates all Step 11 through Step 16 findings into a minimal change list for the CTO Chief to approve; approving that list crosses no gate."
- R-428 (~701): "No hook detects or reverts a crossing today (`human-gate-check.js` is not loaded), so YOU must:"

Not changed: R-015 (pinned; stays true), R-427, R-446, R-071, R-344, line ~141 (each true as written), and every order slice 3 replaced.

### 9. `agents/iron-loop/red-team-critic.md` and `agents/iron-loop/devils-advocate-critic.md` (MODIFY; compaction inventories)

- RT-605 (~350): "Your JSON is the artifact; [[gate-critic]] synthesizes it and writes the synthesis to the waiting folder `.ctoc/streaming/questions/pending/`, where the menu's sweeper validates it before anything reaches the human." Slice 3's sentence before it stays.
- D-304 (~229): "You do not call `validatePlanQuestions` yourself — [[gate-critic]] merges your findings and writes the synthesis to the waiting folder, and the menu's sweeper validates it through `streaming-precompute.writePlanQuestions`."

These match slice 3's wording of the CTO Chief's R-107 ("`gate-critic` writes the synthesis to the waiting folder … and the menu's sweeper validates it"). A synthesis carries the gate ruling and is not classified; classification is the gate critic's separate pass over an author's questions, so neither sentence says "classified".

### 10. The three inventories (MODIFY)

In `tests/compaction-eval/{cto-chief,red-team-critic,devils-advocate-critic}/rule-inventory.json`, R-011, R-014, R-046, R-323, R-428, RT-605 and D-304 get `fate: "replaced"` and a complete `replaced_by` record in the form `tests/compaction-eval/inventory-checks.js` holds: `instruction` — the owner's words of 2026-10-06 ("i am trying to hide the hooks so the llm thinks and ask usefull questions to the user …"), his decision of 2026-10-07 to load only the write protection for the approval records, the check records and his recorded answers, and the same day's decisions that only the menu crosses a gate and that the gate critic writes and classifies the questions; `date` — the build date; `plan: the-manual-and-the-docs-stop-claiming-what-ctoc-no-longer-does`; `new_anchors` — the words as written. The units listing those orders are fated `replaced`. Every sentence of a replaced anchor is gone from its agent or stands inside a new anchor. Baselines are never touched. An agent that ends larger than its `maxBytes` (the CTO Chief's is 54,303 after slice 3) gets `maxBytes` raised by the measured overage only, recorded as one more `ceiling_corrections` entry `{ date, from, to, reason }` (creating the list where none exists). No order is added, so no order floor or kinds digest moves and the three inventory tests stay unchanged unless the build shows otherwise.

### 11. `agents/coordinator/ivv-chief.md` (MODIFY; no compaction inventory)

Invariant 5 (~59): its bold head "**You can BLOCK Gate 3.**" → "**Your verdict does not block the finish by itself.**"; the sentences "Otherwise your verdict reaches the human directly, and a Gate 3 is not crossed over unresolved critical IV&V findings. There is no hook today that reads your audit root and auto-reverts — the block is the distinct-identity requirement plus the human's decision, not a filesystem poll." → "Your verdict reaches the human directly, and no code reads it: a built plan whose recorded checks passed finishes on them unless a question needs the human, so report a critical finding to him at once. No hook reads your audit root, and nothing reverts a plan." The marker sentence and the **NOT ENFORCED** sentence between them stay word for word.

### 12. `agents/iron-loop/iron-loop-executor.md` (MODIFY; no compaction inventory)

- ~112–113: "A pre-tool hook monitors ALL tool calls. If you somehow move a plan across a human gate without the approval marker, it will be automatically reverted." → "No hook watches your tool calls or reverts a plan today: a plan moved across a gate by hand would stay there with no crossing record, which is why you never move one."
- ~117–118: "…you must edit a file that set does NOT cover, the enforcement hook will REFUSE the write." → "…you must edit a file that set does NOT cover, you do not write it: no hook refuses that write today, so the refusal is yours."
- ~125: "and REVERTS your plan mid-build." → "and your plan's approval stops verifying mid-build."; ~127: "and REVERTS your plan." → "and your plan's approval stops verifying."
- ~131: "Filing the request registers the continuation fork for you, so the Stop hook permits the halt — you cannot forget it." → "Filing the request registers the continuation fork for you."

Slice 3's Rule 4 table and refusal line stay word for word.

### 13. `skills/agent-fragments/ancestry-read.md` (MODIFY)

~16: "…those are the files you may touch (the enforcement hook will block edits outside that list)." → "…those are the files you may touch. No hook blocks an edit outside that list today — keeping to it is yours, and a file it does not name is a scope-growth question (`src/lib/scope-growth.js`), never a silent edit; only the approval records, the check records and the owner's recorded answers are write-protected."

### 14. `src/commands/start.md` (MODIFY)

~61: "Without that entry the gate hook correctly flags the archive and reverts it." → "Without that entry nothing records how the vision reached `done/`."

### 15. Tests (MODIFY) — red first

- `tests/readme-numbers.test.js`:
  - The "on the first try" case matches `/adversarial review, the recorded checks and your answers to the questions that matter catch what a first pass misses/` and gains `assert.doesNotMatch(README, /four human gates catch/)`.
  - The "IRON_LOOP scopes hook enforcement" case, renamed "IRON_LOOP says only the write protection is loaded": matches `/One hook is loaded today/` and the existing `/instruction-level discipline the session model follows/`; `assert.doesNotMatch(IRON_LOOP, /enforcement ARE hooked/)`.
  - New `describe('Only the write protection is loaded — no surface claims what CTOC no longer does')`:
    1. **The premise.** Parse `hooks/hooks.json`; every `command` under every event; exactly one, naming `src/hooks/protect-records.js`; `.claude-plugin/plugin.json` has no `hooks` key. Failure message: "a hook is registered again — revisit every sentence the next case fences and say what now runs".
    2. **The fence.** `UNLOADED_CLAIMS`, a table of `{ file, pattern, sample }`; each file is read (unreadable fails, never passes) and must not match. `README.md`: `/reverted automatically/`, `/the gate hook reverted it/`, `/4 mandatory human gates/`, `/4 mandatory checkpoints/`, `/approves all gate crossings/`, `/re-embeds plans as they change/`, `/gate-residency enforcement are hooked/`, `/runs on every commit without blocking/`, `/enforced at the final gate \(review → done\)/`, `/At the functional → implementation transition, CTO Chief runs/`, `/until you say so/`, `/stay mandatory/`; `docs/IRON_LOOP.md`: `/is auto-reverted/`, `/file-edit enforcement runs as hooks/`, `/automatically detects and offers recovery/`; `docs/PROJECT_REFERENCE.md`: `/; CTO Chief approves\.$/m`; `CLAUDE.md`: `/violation detection \+ auto-revert/`, `/Edit\/commit enforcement/`; `.ctoc/architecture/tier-definitions.yaml`: `/Approves all gate crossings/`; `src/commands/start.js`: `/four human gates/`, `/soft enforcement/i`, `/auto-push after gates/`; `src/lib/gate-words.js` and `src/lib/loop-b-driver.js`: `/until you say so/`, `/until you say build it/`, `/until you agree/`; `src/lib/menu-screens.js`: `/when you decide it['’]s finished/`; `agents/coordinator/cto-chief.md`: `/auto-reverts unauthorized gate crossings/`, `/handles detection and auto-revert/`, `/enforced by the Stop hook/`, `/Stop hook BLOCKS a premature stop/`, `/minimal change list before the CTO Chief approves/`; `agents/iron-loop/red-team-critic.md`: `/the dispatcher writes the questions file/`; `agents/iron-loop/devils-advocate-critic.md`: `/the dispatcher writes them through/`; `agents/coordinator/ivv-chief.md`: `/You can BLOCK Gate 3/`, `/not crossed over unresolved critical/`; `agents/iron-loop/iron-loop-executor.md`: `/will be automatically reverted/`, `/enforcement hook will REFUSE/`, `/REVERTS your plan/`, `/Stop hook permits the halt/`; `skills/agent-fragments/ancestry-read.md`: `/enforcement hook will block/`; `src/commands/start.md`: `/flags the archive and reverts it/`; `docs/INDEPENDENCE.md`: `/enforced by the hook in/`; `docs/PROCESS_FMEA.md`: `/hook auto-reverts plans/`, `/gates are enforced by `src\/hooks\/human-gate-check/`, `/final approver before Gate 3/`; `docs/CRITICAL_CONTROL_POINTS.md`: `/PreToolUse hooks scan for stub markers/`; `docs/CONFIG_SOURCES.md`: `/^The PreToolUse hooks run on/m`.
    3. **It bites.** Every entry's `sample` (the old fragment, verbatim) matches its own pattern.
  - The header comment gains one line naming the new block, the 2026-10-07 decisions it rests on, and what it cannot see (an untrue claim phrased outside the listed patterns).
- `tests/menu-environment.test.js`, new case "the environment banner and options say what each environment changes today", driving the real menu with the environment unset: the text does not match `/four human gates/i`, `/soft enforcement/i` or `/auto-push after gates/i`; it matches `/Pushing stays yours in every\s+environment/` and `/not today/`; no Development, Staging or Production description matches `/enforcement|auto-push/i`.
- `tests/compliance-ride-along.test.js`, new case on the real menu with no regime chosen: the text does not match `/four human gates/i` and matches `/It never changes when a plan moves on\./`; `NOT ENFORCED` and `RECORDED` still present.
- `tests/gate-words.test.js`, new case 3b: the three moments equal the new phrases exactly; the vision moment is unchanged; none of the four matches `/until you (say|agree)/`.
- `tests/dashboard-says-the-moment.test.js` case 5: the pin `/when you decide it['’]s finished/i` (a contract the owner replaced) becomes `assert.match(text, /finishes on them when the session continues, unless a question needs you|stays there until they pass|cannot finish on its own until a check record passes/)` plus `assert.doesNotMatch(text, /when you decide it['’]s finished/i)`; its other assertions unchanged.

No new test file, so no documented count moves.

### Wiring — the live call sites

No new module and no new branch. `attachEnvironmentQuestion` and `attachComplianceQuestion` run
inside `src/commands/start.js` on the default `/ctoc:start` screen when the environment or the
regime is unset; `gate-words` feeds the topic line of `streaming-gate`'s decision screens;
`loop-b-driver.needQuestionLines` runs from `streamAnswer`; the completion line is
`menu-screens.taskComplete`, reached by `menu task complete`. `README.md` is the manual a person
reads; `CLAUDE.md` loads into every session; `src/commands/start.md` is what the session executes
for `/ctoc:start`; the five agents are live on their next dispatch; the agent fragment is read
by every dispatchable agent; `.ctoc/architecture/tier-definitions.yaml` is the registry
`docs/AGENT_ARCHITECTURE.md` links. Every changed test runs inside `npm test`.

### Agent rules this plan replaces or adds

The owner had every CTOC hook but the write protection unloaded (2026-10-06: "i am trying to
hide the hooks so the llm thinks and ask usefull questions to the user"; 2026-10-07: load only
the write protection for the approval records, the check records and his recorded answers),
and decided on 2026-10-07 that only the menu crosses a gate and that the gate critic writes and
classifies the questions. These are the compaction-inventory orders this plan may mark replaced
or added, and no others:

- `agents/coordinator/cto-chief.md` — replaced: R-011, R-014, R-046, R-323, R-428; added: none.
- `agents/iron-loop/red-team-critic.md` — replaced: RT-605; added: none.
- `agents/iron-loop/devils-advocate-critic.md` — replaced: D-304; added: none.

`agents/coordinator/ivv-chief.md` has no compaction inventory (no
`tests/compaction-eval/ivv-chief/`), so its change needs no order ids.

## Acceptance criteria

- [ ] Every row of the census says what the code does; no new sentence a person reads carries a gate number; vision → functional is the owner's on every surface touched, and the other three are described as moving on recorded evidence unless a question needs him, never as his approval or the CTO Chief's.
- [ ] The first-run screen, the decision screens' moment line and the completion line say what the code does: the new cases in `tests/menu-environment.test.js`, `tests/compliance-ride-along.test.js`, `tests/gate-words.test.js` and the tightened case 5 of `tests/dashboard-says-the-moment.test.js` are red at Step 8 and green after Step 10.
- [ ] The README's Lesson 1 and Lesson 4 captures are real output of the changed code, retaken at build time, and the README's correction sentence under the first-run capture is gone.
- [ ] The premise case is green; the fence case is red at Step 8 naming every entry and green after Step 10; the bite case is green throughout; the two tightened README pins are red at Step 8 and green after.
- [ ] R-011, R-014, R-046, R-323, R-428, RT-605 and D-304 are `replaced` with `replaced_by` records naming this plan; no order slice 3 replaced is touched; the three inventory tests are green; any ceiling rise equals the measured overage.
- [ ] `CLAUDE.md` is at or under 15,000 bytes and its lessons block is byte-identical to `.ctoc/templates/operating-lessons.md`'s.
- [ ] `npm test`: 0 failed, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`.

## Risks

| Risk | Mitigation |
|---|---|
| Slice 3 is built on its branch but not yet on `main` | `depends_on` holds this plan until slice 3 has landed; every location was read on slice 3's built tree; Step 9 re-reads every quoted fragment on `main` and follows the text where a line moved; nothing slice 3 changed is changed again |
| A new screen sentence overstates the code (no environment or regime changes a crossing; the crossing reads no IV&V finding, no production-readiness checklist, runs no compliance review) | Step 9 reads the crossing functions first; where the code says otherwise the sentence says what it does and the difference is recorded |
| A retaken capture differs from the old one in counts and titles | The manual already says a capture shows the moment it was taken; only real output is pasted |
| The coverage floor (99%) | No branch is added: each code change is a string inside an existing branch |
| `CLAUDE.md` has little room after slice 3 | This plan makes it 52 bytes smaller; measured at Steps 9 and 14 |
| An agent sits near its byte ceiling | The ceiling rises only by the measured overage, recorded as one correction |
| A replaced order is accepted only under the owner's own approval of this plan (inventory check 3) | Step 9 checks the approval kind first and stops if it is not his (Decision 12) |
| A test outside `files:` pins a changed sentence | Reported through `src/lib/scope-growth.js`, never edited outside `files:` |
| The owner registers more hooks later | The premise case fails and names the sentences to revisit — by design |
| The agent-improvement run rewrites one of these agents | The scheduler serializes by file; Step 11 checks that whichever lands second keeps the other's text and records |
| "Nothing blocks the edit" is read as "nothing is protected" | Every such sentence names the write protection that does run (Step 13 checks) |

## Decisions Taken Under Ambiguity

1. **One plan of thirty-one files instead of slices of one to three.** The owner asked for one
   plan and the session folded every untrue claim shown to him into it; each change is a
   sentence or a string literal, plus red-first test cases in existing files.
2. **The census goes beyond the locations named in the briefs**, as they asked: every place
   found that says an unloaded hook blocks, reverts, detects, re-embeds or pushes; every place
   that says all four moments are the owner's or that the CTO Chief approves a crossing; the
   locations the session, slice 3's builder and the review of slice 3 named.
3. **The README's question-contract sentences are included** (Lesson 4, the fleet paragraph,
   two key features, one compare row), as the session confirmed.
4. **Screens are fixed in code and the manual's captures retaken from the real screen**, on the
   session's decision of 2026-10-07; a capture is never edited by hand. The functional and
   implementation moment lines in `gate-words.js` are corrected with the review one: they say
   the same untrue thing about the two pre-build crossings, and the module's own test requires
   the four moments to stay distinct and free of stage words.
5. **IRON_LOOP's "Hook Enforcement" body is replaced by a pointer** rather than corrected line
   by line; it is stale against `docs/ENFORCEMENT.md` and no test pins it.
6. **`CLAUDE.md`'s two unloaded-hook rows become one row for the hook that is loaded.**
7. **The build agent's "REVERTS your plan" becomes "your plan's approval stops verifying"**,
   what `approval-residency.js` does on `hash-mismatch` and `wrong-edge` (checked at Step 9).
8. **The README's scope sentence in Lesson 5 is deleted, not rewritten.**
9. **The process-failure analysis keeps its scores** (Detection 5, Occurrence 3); only untrue
   rationale changes. Rescoring is a judgment for the owner.
10. **Two README pins and one completion-line pin change**: each pins a sentence whose contract
    the owner replaced, and each is tightened — the old phrase must now be absent.
11. **The red-team and devil's-advocate sentences say "writes the synthesis to the waiting
    folder", not "classified"**: a synthesis carries the gate ruling and is not classified
    (slice 2); the wording matches slice 3's R-107. D-304 is included though no brief named it:
    it is the same untrue sentence one paragraph from D-369, which slice 3 corrected.
12. **This plan needs the owner's own approval to be built.** Inventory check 3 accepts a
    replaced order only under a human or backfilled approval of this plan's current
    specification.
13. **No questions file was written for this plan**: the brief said to write nothing but the
    plan. Its stored-question verdict therefore stays "not computed", which matches Decision 12.
14. **Seen and left, each for a stated reason:** `docs/ENFORCEMENT.md` (opens with "These hooks
    are not registered with Claude Code today"; slice 3 owns its archived rule section);
    IRON_LOOP's Validation section (says the label hook is not wired; pinned by
    `tests/step-label-hook-claim-matches-manifest.test.js`); `agents/iron-loop/gate-critic.md`
    line 81 (true in effect: `protect-records.js` reuses `targetsStreamingLive`); the CTO
    Chief's R-015, R-427, R-446, R-071, R-344, line ~141 and line ~265 (true as written, or
    naming the machinery, as slice 3's Decision 23 keeps); the CTO Chief's compliance section
    ("When a plan crosses Gate 1 …", an order to act, not a claim); the README's
    "Every plan at a human gate has been decided" (true of the empty screen it captures);
    `.ctoc/roles.yaml` line 7 (a comment); `docs/CONTINUOUS_IMPROVEMENT.md` ~100 (names a log
    as a data source); `docs/OPERATING_LESSONS.md` ~149 (the archived old words, kept on
    purpose); `tests/loop-b-directive.test.js` ~263 (a fixture field the code does not read).

## Execution Plan

### Step 8: TEST
- [ ] Write the README pins, the premise, fence and bite cases in `tests/readme-numbers.test.js`; the new cases in `tests/menu-environment.test.js`, `tests/compliance-ride-along.test.js` and `tests/gate-words.test.js`; the tightened case 5 in `tests/dashboard-says-the-moment.test.js`.
- [ ] Run those five files; record premise and bite green, the fence red naming every entry, and every other new or tightened case red for the right reason (new words absent, old words present).
- [ ] Write the seven `replaced` records and unit fates in the three inventories; run `node --test tests/cto-chief-compaction.test.js tests/red-team-critic-compaction.test.js tests/devils-advocate-critic-compaction.test.js`; record each failure and confirm it is the right one (new anchors absent, old present), with check 3 green.

### Step 9: PREPARE
- [ ] Confirm slice 3 is on `main` and that `.ctoc/approvals/the-manual-and-the-docs-stop-claiming-what-ctoc-no-longer-does.json` is a human entry matching this plan's specification hash; if not, stop and report (Decision 12).
- [ ] Record before-numbers: `CLAUDE.md` bytes; each inventoried agent's bytes and `maxBytes`; false-green, dead-export and unreachable-file counts; `.ctoc/unexecutable-instruction-baseline.json`.
- [ ] Re-read every quoted fragment on `main`; follow the text where a line moved; confirm the seven orders carry no `fate` yet.
- [ ] Read the crossing code — `crossBySufficiency`, `crossOnEvidence`, `validateReviewToDone`, `continueAfterCrossing`, `streamApprove`, `approval-residency.classifyResidency` — and confirm: none reads `general.environment`, a regulatory regime, an IV&V finding or marker, or a production-readiness checklist; none dispatches or queues compliance work; `classifyResidency` refuses `hash-mismatch` and `wrong-edge`. Also confirm `plan-recovery.recoverOrphanedPlans` runs from the dashboard, `actions.movePlan` re-paths without re-embedding, and no caller passes `installGitHook`. Where the code says otherwise, write what it does and record the difference.
- [ ] List every Markdown link to the removed `IRON_LOOP.md` "Hook Enforcement" subsections; keep each link resolving.

### Step 10: IMPLEMENT
- [ ] The screens (item 6) and `.ctoc/architecture/tier-definitions.yaml` (item 7); run the four screen test files green.
- [ ] `docs/IRON_LOOP.md`, `docs/PROJECT_REFERENCE.md`, the four docs, `CLAUDE.md` (items 2–5); the five agents and three inventories (items 8–12); `skills/agent-fragments/ancestry-read.md`, `src/commands/start.md` (items 13–14); each `new_anchors` is the words as written.
- [ ] `README.md` (item 1), retaking the Lesson 1 and Lesson 4 captures from the changed code in scratch projects and pasting the real output verbatim.
- [ ] Any inventoried agent over its `maxBytes`: raise it by exactly the measured overage with one `ceiling_corrections` entry.
- [ ] Report the order ids actually marked replaced; if they differ from "Agent rules this plan replaces or adds", stop for the session and the owner.

### Step 11: REVIEW
- [ ] Dispatch `iron-loop-critic`: every changed sentence and string matches the code it describes (one loaded hook; which crossings move on evidence; the continuation after a build; who writes the questions; the CTO Chief approving no crossing; what the crossing does not read); vision → functional stays the owner's everywhere; the text around each change, including slice 3's sentences beside it, still reads true; whichever agent-improvement slice lands second keeps the other's text.

### Step 12: OPTIMIZE
- [ ] No new sentence longer than its fact needs; no branch added to code; `CLAUDE.md` smaller than before; no ceiling raised beyond its measured overage; the new test block reads each file once.

### Step 13: SECURE
- [ ] Dispatch `security-scanner`: no new text tells an agent it may write an approval or check record, move a plan, cross a gate or pass `--continue`; every "nothing blocks" sentence names the write protection that does run; no screen or manual sentence suggests the records are writable; the changed screen strings carry no value read from a plan or a file.

### Step 14: VERIFY
- [ ] `npm test`: 0 failed, 0 skipped, coverage at or above `.ctoc/coverage-baseline.json` `minPct`.
- [ ] Lint `src/commands/start.js`, `src/lib/gate-words.js`, `src/lib/loop-b-driver.js`, `src/lib/menu-screens.js` and the five changed test files: zero warnings; `tsc --checkJs`: zero errors.
- [ ] False-green, dead-export and unreachable counts not higher than the Step 9 numbers; `.ctoc/unexecutable-instruction-baseline.json` unchanged; `CLAUDE.md` at or under 15,000 bytes.
- [ ] An existing test outside `files:` that fails because it pins a changed sentence is reported through `src/lib/scope-growth.js`, never edited outside `files:`.

### Step 15: DOCUMENT
- [ ] The header comment of `tests/readme-numbers.test.js` names the new block, the 2026-10-07 decisions it rests on, and what it cannot see; the header comment of `src/lib/gate-words.js` keeps describing the moments correctly.

### Step 16: FINAL-REVIEW
- [ ] Dispatch `iron-loop-critic` against the acceptance criteria; it reads README Lessons 1–7 and the Reference sections as a new user would and names any sentence the code does not keep.
- [ ] In scratch projects, show the owner in full the real first-run screen, one decision screen's header for a built plan, and the completion line for a plan whose checks passed, next to the README text that describes each.
