---
title: "The background-agent protection is measured before the owner decides whether it is on"
created: "2026-10-20T13:37:49.348Z"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 10
risk_level: HIGH
---

# The background-agent protection is measured before the owner decides whether it is on

## Problem Statement
The background-agent protection may not hold. Reported: the protection let `menu task complete … --continue` and inline `node -e` calls that load `src/lib/actions` through from a background agent. Read, not run: `src/hooks/protect-records.js` sets `RECORD_REFUSALS_OFF = true`, and its header says the background agent's menu refusal runs inside that switch and that the shell refusals of the records and the agent menu refusal are off on the owner's order of 2026-10-15, so the reported pass-through is most likely that switch, not a defect in the refusal. Unverified. Re-read by the vision advisor: `src/hooks/protect-records.js:1053`. The first step is the measurement: feed crafted hook input (a JSON payload with a non-empty `agent_id`) to the hook on the current release, never in a real shell, for both calls, and record the result in the plan before any build step. Nothing is built on the reported pass-through alone. Then the owner decides whether the background-agent menu refusal is switched back on; changing a hook or gate logic needs the owner's explicit approval, and nothing in the hook changes before his answer. Related: "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection" (`plans/functional/an-agent-cannot-switch-off-ctocs-own-protection.md`), "A background agent is refused when it writes Claude Code's settings files or CTOC's .ctoc/settings.json" (`plans/review/a-background-agent-cannot-change-claude-codes-settings.md`), and the open owner question named in the hook's header about isolating background agents from the main project's records. Disposition: new work, measure first. Done when the measured verdict for both calls is recorded and, whatever the owner decides, a crafted-input test proves the hook behaves as he decided.

**Read in this refinement, not run.** The product owner holds no shell. Each line below is a reading of the named file in this worktree, whose `VERSION` reads 6.14.133.
- `bashRefuses` in `src/hooks/protect-records.js` (lines 1055–1097) returns inside `if (RECORD_REFUSALS_OFF)` (line 1064) before it reaches `subagentMenuRefusal` (line 1081), the background-agent menu refusal. Inside the switch a background agent's shell call meets only the settings-file checks. Ahead of the switch only the sweep-confirmation refusal of 2026-10-18 and its two spelling checks run (lines 1057–1061).
- So, read: both reported calls are allowed for a background agent on this release, and the cause is the switch. With the switch turned on, the same path reaches `subagentMenuRefusal`. Inline code naming `src/lib/` is refused there (`inlineCtocCode`, line 947), and `menu task complete` with `--continue` fails `subagentMayRunRoute` (line 725). Both are refused with the background-agent sentence (line 238): "CTOC refused this call because a background agent may not answer CTOC's questions, approve a plan or move one on through the menu; report your result and let the main session do it."
- The test suite already pins the pass-through. `tests/protect-records.test.js` spawns the real hook with a crafted payload carrying `agent_id: 'a1b2c3'` and asserts "allowed" for four calls:
  - `menu task complete t7 --continue --summary "x"` (case 77);
  - a `--b64` payload decoding to `{"continue":true}` (case 84);
  - `['t7','--continue']` (case 89);
  - `node -e "require('./src/lib/actions').movePlan('a','b')"` (case 88).

  Each sits under the comment `Founder, 15 Oct 2026: "remove that hook block, it is wrong"`. `tests/only-the-owner-answers-an-inbox-question.test.js` carries the same comment on the background-agent cases it allows. Case 89 also shows a spelling trap: the menu's own parser reads `t7 --summary --continue` as no continuation, because `--summary` takes `--continue` as its value.
- The switch is one constant for two things. The first is the shell refusals of the records for every caller, the main session included (`isLedgerForgery`, the check-record and question-store specs, inline code naming a record writer, `ledger-backfill.js`; lines 1088–1093). The second is the background-agent menu refusal. Setting it to `false` turns both back on. Turning on the background-agent refusal alone changes how the hook is built, not just one value.
- No file read records the reason for the order of 2026-10-15. The pattern `remove that hook block` over the whole repository matches 5 files: the hook, the two test files above, `plans/review/a-background-agent-cannot-change-claude-codes-settings.md` and `plans/implementation/real-projects-do-not-stall-on-the-menu.md`. A sixth file, `plans/done/the-write-protection-compares-real-files-not-spellings.md`, turned up in a search for `it is wrong`. Each was read at the match, and each quotes only the sentence. The done plan names commit 395bd70a, which was not read here.
- On 2026-10-18 the owner ordered a narrower background-agent refusal in the same hook that holds whatever the switch says: only the human confirms which builds go back to the build queue (lines 1056–1057, header lines 110–113).
- The hook's own header calls its background-agent checks a guard against honest mistakes, not a containment boundary. A script file written and then run, or a path built at run time, is not caught (header lines 128–136 and 147–154). Closing that gap is the open owner question about isolating background agents from the main project's records.
- On the documented route the continuation is the session's step, not a background agent's. The build agent runs `menu task complete <id>` without `--continue`, and the session then runs it with `--continue` (vision, "Review rounds were driven by hand"; `docs/ENFORCEMENT.md` lines 471–477).

## Business Alignment

**Job to Be Done:** When a background agent's call to the menu's continuation, or its inline load of CTOC's plan code, is reported as let through the protection, I want the hook measured on exactly those calls and the result put to me as one decision, so I can keep or change my own order of 2026-10-15 knowingly instead of on a relayed report.

**Impact Map:**
- **Goal:** The protections CTOC already promises hold, or the owner knowingly decides they do not. This is the decomposition's goal, and the vision's success criterion "The background-agent protection starts with a measurement".
- **Actor:** The owner, Tijn van der Zant, whose explicit approval gates every hook change (vision: Target User, Stakeholders).
- **Impact:** He decides from a measured hook verdict, with "switch or defect" answered by measurement. The hook then behaves exactly as he decided, proven on crafted input.
- **Deliverable:**
  - a measured verdict recorded in this plan;
  - one question to him;
  - a permanent crafted-input test case that asserts his answer.

**Alignment checks:**
1. Goal traces to the vision's problem: YES. The vision names this friction, and its Key risk is building this fix on the reported pass-through alone.
2. Actor is in the vision's target audience: YES. The owner is named there.
3. Impact is observable: YES. It shows as a recorded verdict, a recorded answer, and exit code 0 or 2 on crafted input.
4. Deliverable is one functional area: YES. It is one hook decision on two calls.

**Overlap check:** No sibling plan covers the background-agent refusal. The siblings were listed with Glob (`plans/functional/ctoc-is-built-with-ctoc-*.md`, 10 files, this one included). The eight from the decomposition were compared through that document's description of each. The one added after it, "The vision stubs screen names each stub by its title, not by the shared vision prefix", was read directly. The closest neighbour is "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection" (`plans/functional/an-agent-cannot-switch-off-ctocs-own-protection.md`, read). It covers writes to the hook's own files, not the menu refusal, so the two plans share a file but not a behaviour.

## User Stories

1. **As the** owner, **I want** the hook fed crafted input for the two reported background-agent calls, and the same calls fed to a copy whose switch is on, on the current release and never in a real shell, **so that** I decide on a measured result and know whether the pass-through is my switch or a defect.
   - INVEST:
     - Independent: yes, it is first in the chain.
     - Negotiable: yes, it names what is measured, not the test harness.
     - Valuable: yes, the decision rests on it.
     - Estimable: yes, the crafted-payload harness already exists in `tests/protect-records.test.js`.
     - Small: yes, one test case and one plan section.
     - Testable: yes, scenarios 1 to 5.
   - It is a time-boxed spike; its value is the decision it informs.
2. **As the** owner, **I want** the measured verdict put to me as one decision, whether a background agent is refused these calls again, **so that** my order of 2026-10-15 is changed only by me.
   - INVEST:
     - Independent: qualified. It needs story 1's verdict and is ordered after it inside this plan.
     - Negotiable, Valuable, Estimable, Small: yes.
     - Testable: yes, scenarios 6 and 7.
3. **As the** owner, **I want** my answer carried out and proven by the same crafted-input case, **so that** the hook does what I decided.
   - INVEST:
     - Independent: qualified, it needs his answer.
     - Negotiable, Valuable: yes.
     - Estimable: qualified, because the size depends on his answer:
       - keeping the refusal off changes no hook line;
       - the narrow refusal adds one check and flips the cases that pin the two calls;
       - the full refusal moves the existing background-agent check out of the switch and flips every background-agent case under the 2026-10-15 comment in both test files.
     - Small: yes, on every branch.
     - Testable: yes, scenarios 8 to 10.

## Decomposition

Source: `plans/decomposition/ctoc-is-built-with-ctoc.md`. Stories marked `[MVP]` are the smallest end-to-end version; the others are the remaining stories, with no phase or schedule (the owner alone chooses what is built and when).

### Vision item carried
- "The background-agent protection may not hold."

### Goal: The protections CTOC already promises hold, or the owner knowingly decides they do not
- **Actor:** the owner, whose explicit approval gates every hook and gate-logic change.
- **Impact:** the owner decides on measured evidence, not on a reported pass-through, whether the background-agent menu refusal is switched back on.
- **Success metric:** this plan records a measured hook result before any build step, and the hook changes only as the owner decided.

### Activities
1. Measure the hook on crafted input.
2. Record the verdict and put the decision to the owner.
3. Carry out the owner's decision.

### Stories
- [ ] `[MVP]` Spike: As the owner, I want the hook fed crafted input (a JSON payload with a non-empty `agent_id`) for `menu task complete … --continue` and for an inline `node -e` that loads `src/lib/actions`, on the current release and never in a real shell, so that I decide on a measured result.
  - Acceptance: the plan records, before any build step, the hook's verdict for both calls and whether the pass-through is the `RECORD_REFUSALS_OFF = true` switch (`src/hooks/protect-records.js:1053`) or a defect in the refusal.
  - INVEST: passes as a time-boxed investigation.
- [ ] `[MVP]` As the owner, I want the measured verdict put to me as one decision, whether the background-agent menu refusal is switched back on, so that my order of 2026-10-15 is changed only by me.
  - Acceptance: one question with exactly one Recommended option, its reason and the evidence strength; nothing in the hook changes before the answer. Changing a hook needs the owner's explicit approval.
  - INVEST: passes all six criteria.
- [ ] As the owner, I want my decision carried out and proven by the same crafted-input test, so that the hook does what I decided.
  - Acceptance: if he switches the refusal on, both crafted calls are refused for a background agent and allowed for the main session; if he keeps it off, the plan records that and changes no hook.
  - INVEST: passes; Estimable is qualified, because its size depends on the owner's decision.

### Dependencies
- Story level: a chain of three. The owner's decision depends on the measurement; carrying it out depends on the decision.
- Plan level: none.
- Related: "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection" (`plans/functional/an-agent-cannot-switch-off-ctocs-own-protection.md`) and "A background agent is refused when it writes Claude Code's settings files or CTOC's .ctoc/settings.json" (`plans/review/a-background-agent-cannot-change-claude-codes-settings.md`), both of which also touch `src/hooks/protect-records.js` (a scheduling concern, not a dependency). The open owner question in that hook's header, isolating background agents from the main project's records, is not answered here; the decision on the refusal switch is put to him next to it.

## Acceptance Criteria

The four background-agent calls measured, called "the four calls" below, are:
1. `node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task complete t7 --continue`
2. `node src/commands/start.js menu task complete t7 --continue`, the spelling used inside the CTOC repository
3. the same menu route with `--b64` and a base64 payload of `{"continue":true}`
4. `node -e "require('./src/lib/actions').movePlan('a','b')"`

Each is fed as a crafted PreToolUse Bash payload carrying `agent_id: "a1b2c3"`.

"The counted calls" means call 4, plus each of calls 1 to 3 that scenario 2 counts as a continuation. A spelling that scenario 2 does not count is dropped from every scenario below.

"The narrow refusal's class" covers two kinds of call. Every case in that class flips under the narrow refusal; every case outside it stays as it is today:
- every argument form of `menu task complete` that the menu's own parser reads as a continuation;
- every inline code run by a JavaScript runtime whose text names `src/lib/actions`. That means code after `-e`, `-p`, `--eval` or `--print`, or code piped into the runtime.

Another interpreter carrying the same code is outside the class, like a script file (see Out of Scope).

Story 1, the measurement:

- [ ] **Scenario 1: The shipped hook's verdict on the four calls is recorded before any build step**
  Given the hook of this repository at the release in its `VERSION` file, with that version, the commit and the content hash of `src/hooks/protect-records.js` written into the plan
  When the hook alone is run with each of the four calls' payloads on its standard input, the payload's working directory being a scratch copy of the repository at the same release
  Then the plan gains a section "Measured verdict" that holds, per call, the exit code, the standard output and the standard error, and that section comes before every ticked build step of this plan
  And the scratch copy holds the same files with the same content before and after the run, so no command was executed

- [ ] **Scenario 2: Every measured spelling is one the menu reads as a continuation**
  Given calls 1 to 3
  When the menu's own argument parser (`parseTaskArgs` in `src/lib/menu-screens.js`) reads each one's arguments
  Then it reads the continuation as true for each counted spelling
  And a spelling it reads otherwise, such as `t7 --summary --continue`, is recorded as "not a continuation" and is not counted as a measurement of call 1, 2 or 3

- [ ] **Scenario 3: "Switch or defect" is decided by measurement, not by reading**
  Given a scratch copy of the same release that differs from the shipped files only in `RECORD_REFUSALS_OFF` reading `false`
  When the counted calls' payloads are fed to that copy's hook
  Then the plan records "switch" if the shipped hook allowed every counted call (exit 0, empty standard output) and the copy refuses every counted call with the background-agent sentence quoted under Problem Statement
  And otherwise the plan records "defect", naming each call that broke that pattern and what it returned
  And the shipped `src/hooks/protect-records.js` has the same content hash after the run as before it

- [ ] **Scenario 4: The main session is the control**
  Given the four commands in payloads with no `agent_id`, and again with an empty `agent_id`
  When they are fed to the shipped hook and to the switched copy
  Then all of them are allowed on both (exit 0, empty standard output), and the plan records that next to the verdict

- [ ] **Scenario 5: A call the shipped hook already refuses is recorded as not reproduced**
  Given the shipped hook refuses one of the four background-agent payloads
  When the verdict is recorded
  Then the plan names that call "not reproduced on <version>", with the refusal sentence the hook printed
  And the owner question states this for that call instead of a pass-through

Story 2, the owner's decision:

- [ ] **Scenario 6: One question with one Recommended option, put after the verdict**
  Given the "Measured verdict" section is in the plan
  When the question under "Questions for the owner" is put to him through the menu's question route
  Then he sees one question with exactly one option marked Recommended, that option's reason and evidence strength, and the verdict quoted in full
  And the question names his order of 2026-10-15, with the open question about isolating background agents from the main project's records beside it

- [ ] **Scenario 7: Nothing in the hook changes before his answer**
  Given no answer of his to that question is recorded
  When the plan and the hook are inspected
  Then `RECORD_REFUSALS_OFF` still reads `true`, no ticked build step of this plan edits `src/hooks/protect-records.js`, and the question is still waiting for him

Story 3, carrying out his answer:

- [ ] **Scenario 8: He keeps the refusal off**
  Given his recorded answer keeps the refusal off
  When the permanent crafted-input case built from the measurement runs under `npm test`
  Then it asserts every counted call allowed for a background agent, it passes, and this plan changes no line of `src/hooks/protect-records.js`
  And the plan records his answer and its date

- [ ] **Scenario 9: He switches a refusal on**
  Given his recorded answer is the narrow refusal or the full refusal (both under "Questions for the owner")
  When the same crafted-input case runs under `npm test`
  Then each counted call from a background agent is refused: exit 2, the refusal sentence as the only line on standard error, and the deny decision on standard output
  And the same counted calls with no `agent_id` are allowed
  And a background agent's `menu task complete t7 --summary 'built'`, and its `menu task complete t7 --summary --continue` (which the menu reads as no continuation), stay allowed

- [ ] **Scenario 10: The rest of his order of 2026-10-15 stands when a refusal is switched on**
  Given either refusal is switched on
  When `tests/protect-records.test.js` and `tests/only-the-owner-answers-an-inbox-question.test.js` run
  Then every case that asserts a main-session call allowed today passes unchanged
  And under the narrow refusal, every background-agent case in the narrow refusal's class is refused, and every background-agent case outside it passes unchanged. Examples outside the class: case 88's `loop-b-driver` row, case 90's python, ruby and perl rows, and `cat src/lib/actions.js`.
  And each case whose assertion changes carries his recorded answer, quoted with its date, as the written reason

## Scope

### In Scope
- Measuring the shipped hook on the four background-agent calls and on their main-session controls (scenarios 1, 2 and 4).
- Measuring the same calls on a scratch copy with only the switch turned on, to answer "switch or defect" (scenario 3).
- Recording the verdict in this plan before any build step, including a call that is not reproduced (scenarios 1 and 5).
- Putting one question to the owner, and holding the hook unchanged until he answers (scenarios 6 and 7).
- Carrying out his answer, proven by the same crafted-input case kept in the suite (scenarios 8, 9 and 10).

### Out of Scope
- Isolating background agents from the main project's records. That is the open owner question named in the hook's header; this plan puts its own question beside it and does not answer it.
- A background agent writing the hook's own files. That belongs to "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection" (`plans/functional/an-agent-cannot-switch-off-ctocs-own-protection.md`).
- A background agent writing Claude Code's settings files or `.ctoc/settings.json`. That belongs to "A background agent is refused when it writes Claude Code's settings files or CTOC's .ctoc/settings.json" (`plans/review/a-background-agent-cannot-change-claude-codes-settings.md`).
- The main session's shell refusals of the records, the other half of the switch. They stay off under his order of 2026-10-15, and change only if he names them in his answer.
- The sweep-confirmation refusal of 2026-10-18. It is unchanged and belongs to `plans/review/real-projects-do-not-stall-on-the-menu-s2-read-only-dashboard-and-sweep.md`.
- A script file written and then run, a path built at run time, or another interpreter carrying the call. The hook reads command text and is not a sandbox (header lines 128–136, 147–154). This is the isolation question again.
- The missing menu routes that pushed the coordinator off the menu. Those are the sibling plans of this vision, among them "A plan in the build queue can be sent back to technical planning and keeps its title" and "The menu prints the exact answer command for every option of every streamed question".

## Risks

### Technical Risks
- The crafted calls differ from what was actually run, because the reported command text was not captured.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Measure each of the four spellings under Acceptance Criteria and record each separately. They cover the plugin-root form, the in-repository form, the `--b64` form and inline code.
- A `--continue` spelling that the menu does not read as a continuation makes a measurement or a proof report a false result (case 89: `t7 --summary --continue`).
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: Assert, in the same case, that the menu's own parser reads the continuation as true for every spelling that is counted (scenario 2).
- The scratch copy with the switch on does not run like the shipped hook, so a fault in the harness is recorded as "defect". Causes include a missing module, or a menu the copy does not recognise because its manifest is absent.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Copy the whole repository at the release. Before counting the copy's verdict, check it two ways: against the main-session controls (scenario 4), and against a background agent's Write to `.ctoc/approvals/x.json`, which the editing-tool check refuses whatever the switch says (read: `decide`, lines 1115–1125).
- The refusal checks command text and is not a containment boundary, so a script file written and then run, or a path built at run time, still passes.
  - Likelihood: HIGH, because this is inherent to reading command text.
  - Impact: MEDIUM
  - Mitigation: State the limit in the owner question and keep the question about isolating background agents beside it (scenario 6).
- Turning a refusal on flips crafted-input cases that currently pin the pass-through.
  - Likelihood: HIGH under the narrow or the full refusal.
  - Impact: MEDIUM
  - Mitigation: Change each flipped assertion only with his recorded answer quoted as the written reason, and leave every main-session case unchanged (scenario 10).

### Business Risks
- The hook is changed before his answer, on the reported pass-through or on the recommendation, which overrides his own order.
  - Likelihood: LOW
  - Impact: HIGH
  - Mitigation: Hold every build step on the hook until his answer is recorded (scenario 7).
- The recommendation reverses part of his order without knowing his reason for it.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: State in the question that the reason is not recorded, and what would flip the recommendation.
- If the coordinator that runs the continuation is itself a background agent, either refusal stops the pipeline at every crossing.
  - Likelihood: LOW, because on the documented route the session runs the continuation.
  - Impact: HIGH
  - Mitigation: Name this in the question as the condition under which keeping the refusal off is the better answer.

### Dependency Risks
- "A background agent cannot change the hook Claude Code runs for CTOC, so it cannot switch off CTOC's protection" also edits `src/hooks/protect-records.js`. Parallel edits collide, and the measured release goes stale.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Record the version, commit and content hash with the verdict, and re-run the measurement case before carrying out his answer. The order of the two plans is his to schedule.
- Story 3 waits on his answer.
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Keep the plan at the question with the verdict recorded. No other plan of this vision depends on it.

## Priority

**Priority: MEDIUM** (Score: 6/9)
- Dependency: 2. No plan depends on it and it depends on none, so it runs beside the other plans of this vision.
- Business Impact: 2. It supports the vision's primary goal. Read evidence says the pass-through is his deliberate switch, so no protection CTOC promises is known to be broken.
- Technical Risk: 2. The measurement is low risk on an existing harness. Carrying out a refusal touches a security hook and flips cases the suite pins.

## Questions for the owner

This question is put to him only after the "Measured verdict" section is recorded (scenario 6), and the verdict is quoted into it at that point. Proposed topic: security posture. That is only a proposal; the gate critic classifies the question.

**Should a background agent be refused again when it runs the menu's continuation, or when it loads CTOC's plan code inline?**

His order of 2026-10-15 ("remove that hook block, it is wrong") switched off two things: the shell refusals of the records and the background-agent menu refusal. No file read records his reason. Read, not run: both reported calls pass because of that switch. Beside this question sits the open question about isolating background agents from the main project's records. Isolation is the only measure that would also stop a script file or a path built at run time.

1. **Refuse only these calls for a background agent (Recommended).** A background agent is refused the narrow refusal's class, as defined under Acceptance Criteria:
   - the menu continuation, in every spelling the menu reads as one;
   - inline code, run by a JavaScript runtime, that names `src/lib/actions`.

   The refusal holds whatever the switch says, like the sweep refusal of 2026-10-18. The main session is unchanged, and every other background-agent route allowed since 2026-10-15 stays allowed.
   - Pros:
     - It matches the documented route, where the continuation is the session's step.
     - It closes exactly the two route-arounds that his ruling of 2026-10-20 names as friction.
     - It has the shape of his most recent order on this hook, the narrow refusal of 2026-10-18.
     - It reverses nothing else of 2026-10-15.
   - Cons:
     - It adds new code to a security hook, more than the full refusal needs.
     - It has the limit every text check has: a script file or a path built at run time passes.
     - It flips the cases that pin the four calls.
2. **Keep the refusal off; the order of 2026-10-15 stands.**
   - Pros: no hook change and nothing to build. The existing cases already prove the behaviour.
   - Cons: a background agent can keep crossing gates through the continuation and moving plans through `src/lib/actions`. His ruling of 2026-10-20 calls that routing around the menu, and nothing records it when it happens.
3. **Bring back the whole background-agent menu refusal as it stood from 2026-10-07 to 2026-10-15.** The existing check moves out of the switch, and the main session's shell refusals stay off.
   - Pros: the code and its cases exist and were in force for eight days. It is the broadest guard against a background agent answering, approving or crossing.
   - Cons:
     - It reverses the part of his order whose reason is not recorded.
     - A harmless compound command naming the menu is refused, because the check fails closed (header lines 84–86).
     - It flips every background-agent case under the 2026-10-15 comment.

Not offered: setting the switch itself to `false`, which would also bring back the main session's shell refusals of the records. He can name it in his answer.

**Why the first option is recommended, and how strong the evidence is.**
- On the design, the evidence is moderate. The continuation is documented as the session's step, and his order of 2026-10-18 shows that he accepts a narrow background-agent refusal on this hook.
- On his intent, the evidence is weak, because the reason for 2026-10-15 is not recorded.
- What would flip it to option 2: his reason was that background agents must cross on their own, or the coordinator that runs the continuation is itself a background agent.
- What would flip it to option 3: his reason was only false refusals of ordinary agent work, and he wants the broad guard back.

## Decisions Taken Under Ambiguity

1. **"The current release"** is the `VERSION` of the checkout the measurement runs in (6.14.133 at refinement), recorded with its commit and the hook's content hash. Claude Code runs the installed plugin's copy from the plugin cache, which may be a different version. The recorded version says which one was measured.
2. **"Never in a real shell"** means none of the commands is executed. Only the hook runs, with the payload on its standard input, as `tests/protect-records.test.js` already does. The unchanged scratch copy in scenario 1 checks this.
3. **Four spellings are measured,** because the reported command texts were not captured: the plugin-root form, the in-repository form, the `--b64` form and inline code loading `src/lib/actions`. The payload's working directory is a scratch copy of the repository. That is the dogfooding case, CTOC building CTOC, so the in-repository spelling resolves to a CTOC menu.
4. **"Switch or defect" is answered by a scratch copy that differs only in the switch.** The shipped hook is never edited, so this is a measurement, not a hook change. Scenario 3 checks the hook's content hash.
5. **"Switching the refusal back on" is not one value.** The switch holds both the main session's shell refusals of the records and the background-agent refusal, so the question offers the narrow and the full background-agent refusal. Setting the constant itself is named in the question but not offered.
6. **The measurement stays in the suite as a permanent case,** so "the same crafted-input test" in story 3 proves whichever answer he gives.
7. **The question carries one Recommended option.** This follows his rule that every question names the best-quality option, with what it rests on and how strong that is, even on a decision that is his.
8. **The question is written in this plan only.** The brief allows edits to this plan file and nothing else, so no questions file was written under `.ctoc/streaming/questions/pending/`. Writing one now would be premature in any case: scenario 6 puts the question only once the measured verdict is in the plan. No `.status` file exists for this plan (Glob found only the plan), and none was created.
9. **The frontmatter follows the product-owner agent definition:** `type: feature`, `status: refined`. A text search found no literal comparison of those values: the pattern `(type|status)\s*(===|!==|==)\s*['"](stub|feature|refined)['"]` over `src/` matched 0 files.
10. **Priority stays MEDIUM. The risk level is HIGH,** because six risks carry HIGH likelihood or HIGH impact.
11. **The `## Decomposition` section is kept as the vision-decomposer wrote it.** Its stories are refined above, under User Stories.
12. **Nothing beyond this refinement was asked for.** No instruction in the stub, the vision or the decomposition asked for anything else.
