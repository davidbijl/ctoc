---
title: "Fewer rework rounds: a check is attacked before it is built"
type: feature
status: refined
parent_vision: "none (the owner's request of 2026-10-10, quoted below)"
created: 2026-10-10
priority: HIGH
effort: medium
depends_on: none
acceptance_criteria_count: 9
risk_level: MEDIUM
approved_by: human
approved_at: 2026-10-10T09:25:22.499Z
gate_crossed: functional → implementation
---

# Fewer rework rounds: a check is attacked before it is built

## What the owner asked

> "fix the rework rounds" (2026-10-10)

In plain words: the hotfix check is in its tenth fix round. Anything CTOC builds that decides what is let through (a check, a guard, a reader, a classifier) must stop coming back from review one way through at a time. This plan states six rules for plans of that kind, as behaviour. It builds nothing.

## The six rules

1. For each kind of thing it lets through, the plan states why letting it through is safe (a positive reason, never a list of dangers) and which real implementation its answers are compared against; that comparison is the first test written. A kind with neither is not let through in that plan.
2. Before the plan may be built, CTOC's red-team critic and threat modeler attack its rules, in parallel, one area each; the build starts only when each way through they find is closed by a change to the plan's rules, or its kind is taken out of the plan.
3. Two strikes: fix rounds after a review are counted by the existing circuit breaker (at most 3 kickbacks to one step, 5 per plan, then the owner is told), whoever starts them; an area gets a first fix round and a second, and when the review after the second fix round still finds a way through in that area, no third fix round starts: the area is taken out of the plan and the rest ships, or the plan goes back to planning.
4. One kind per plan: a plan lets through one kind of thing, and each further kind is its own plan.
5. Before every commit the build agent runs the linter, the check for tests that cannot fail, and the tests of the files it touched; before its last commit, the full gated suite.
6. A review runs as several reviewers in parallel, one area each.

## What needs the owner's approval first

Rule 2 adds one condition a plan of this kind must meet before it may be built, and a change to what a plan needs before building needs the owner's explicit approval, so nothing here is built until he has said yes to that rule. No hook is added or changed: CTOC's hooks stay hidden, and the one loaded write protection is untouched.

**The owner's answer (2026-10-10): "yes".** He was asked whether a plan that builds a check, guard or reader may be built only after the red-team critic and the threat modeler have attacked its rules and every way through they find is closed or taken out, at the cost of two extra agent runs per area before each such build.

## Problem Statement

The hotfix check has been through nine recorded fix rounds and, by the owner's count, a tenth. Each round closed the instances a review had found and the next review found others of the same kind; the reason recorded with the option the owner chose on 2026-10-09 (he answered "a") was that "five rounds of security attacks, each with real runs, found new ways to get a change of behaviour committed as a hotfix" (`plans/functional/ctoc-checks-that-a-hotfix-is-really-small-and-safe.md`). Its rules 5 and 6 are lists of words and characters to refuse, not a reason why a change is safe, and one plan let through four kinds of content, in six formats, in one module that is now 3,739 lines.

Two build faults add rounds. In round 9 the whole suite was red for six commits (795325ab to afb3d7a6, repaired by 2ce215bd) because the build agent ran only "the hotfix test files and a few others" before committing; and a lint error was committed because the commit command did not stop on the linter's exit code. The plan had been reviewed before the build, but I found nothing in the record showing that its rules were attacked before it.

One reviewer over a whole build is also weaker than reviewers split by area. In the trial of 2026-10-08 (`.ctoc/audit/speed-and-size/benchmarks/MODEL-TRIAL-2026-10-08.md`) one critic over a whole build found 5 of 6 known problems at extra-high and at high effort, and 4 of 6 at medium. In the session's trial of 2026-10-09, not in the repository (figures as given in the request), three reviewers with one area each found 5 of 5 known problems in 8.3 minutes, and one reviewer on everything found 2 of 5 in 13.5 minutes.

## What the record shows

Read from the first slice's build record (`.claude/worktrees/hotfix-s1-build/plans/todo/ctoc-checks-that-a-hotfix-is-really-small-and-safe-s1-the-hotfix-check.md`). It has nine fix-round sections (round 1 is the one without a number); the tenth round is not in it. It marks no finding "blocking", and its units differ by round, so no total is given.

| Round | What the record lists | Where it says it came from |
|---|---|---|
| 1 | 13 rows | the code review and the security check: 4 rows named to the security check, 8 to one joint brief, 1 found by the build agent |
| 2 | 12 items | a targeted security check on real inputs: 9 (two marked high); the re-review: 3 |
| 3 | 10 items in 12 rows | the third security round (one marked high) and the re-review: 8; an automated commit security review: 2 |
| 4 | 14 rows | a security attack on real inputs: 3 (two high, one medium); a code review by reading: 10, plus 2 requests for evidence; the coordinator: 1 |
| 5 | 9 fixes | called "the session's fixes"; the review that found them is not named |
| 6 | 12 rows | a final code reading and a security attack: 9; the build agent: 1; the amended functional plan: 2 |
| 7 | 19 classes, then 3 more | one security run that compared generated edits with real parsers (9 classes in pages, 10 in Markdown); the 3 more by longer runs |
| 8 | 24 decisions | five reviews, one area each: three security checks on real inputs and two code readings |
| 9 | 27 decisions | a brief in six parts (Markdown, catalogue files, stylesheets, paths and names, the test run, evidence) and five points from the coordinator, after automated security reviews |

Where the record differs from the first account of it:

- **Sources.** The six items that carry a severity (five high, one medium, rounds 2 to 4) all came from security checks or attacks. But no finding is marked blocking; a code review or reading is named in rounds 1, 4, 6 and 8 and a re-review in rounds 2 and 3; the build agent found items itself in at least rounds 1, 4, 5, 6, 7, 8 and 9; and not every item was a way through (round 1 lists slow inputs, repository hooks that ran during the check, a copy left behind when the process was killed, and a cleanup that removed installed-package folders outside the copy). In the trial of 2026-10-08 an Opus critic reviewed each build blind, and its write-up says most shared findings trace to the plan.
- **The comparison.** The page reader, held to a real HTML parser since round 7, still had eight fixes in round 8 and at least one in round 9 (the character set). The longest run reports zero disagreements at 6,000,000 page cases for each of three seeds; I did not find the figure 1.2 million in the record. Round 7 says one seed's soak is no proof: a class of one in 399,028 cases showed only under another seed. In round 9 the YAML reader, matched to one YAML loader, disagreed with two others on passed edits, and the stylesheet reader shared one mistake with the parser it was compared against. A comparison with a real implementation helped; it did not end the findings.
- **Size and kinds.** The module is 3,739 lines, read from the file in the build's working copy (the record gives 3,543 after round 7, 2,952 after round 8, none for round 9). The functional plan counts four kinds (Markdown and plain text are one); the record's last list of formats names six.
- **Counting.** The circuit breaker's own header (`src/lib/circuit-breaker.js`) lists two places where it records a kickback, a blocked completion before review and a failing verification; a fix round after a review is neither. `.ctoc/state/kickbacks/` holds 11 counter files in the main checkout, none for the hotfix check's plan, and none in the build's working copy.

## Business Alignment

**Job to Be Done:** When a plan builds something that decides what is let through and its reviews keep finding new ways through, I want its rules attacked before the build and its repair work counted and capped, so I can get it built and reviewed in two fix rounds instead of ten.

**Impact Map:** Goal: fewer fix rounds (the owner's request of 2026-10-10). Actor: the owner, and the sessions that build for him. Impact: a plan of this kind reaches "built and reviewed" in at most two fix rounds, and the owner reads one sentence when an area is taken out. Deliverable: the six rules, written as behaviour.

**How it will be known to work:** the next plan of this kind reaches "built and reviewed" in at most two fix rounds, read from its own record. For comparison, the record of the hotfix check's first slice holds nine fix-round sections.

## User Stories

- **As the owner,** **I want** a plan that builds a check, guard, reader or classifier attacked before it is built, **so that** ways through are found while a rule can still be changed in a sentence.
- **As the owner,** **I want** every fix round counted and capped, whoever starts it, **so that** a plan that keeps failing in one area stops being patched and I am told.
- **As the owner,** **I want** builds checked before every commit and reviews split by area, **so that** a red suite is not carried over many commits and no reviewer has to hold the whole build.

## Acceptance Criteria

- [ ] **Scenario: A plan that states a reason and a comparison for each kind may be built**
  Given a plan for a reader of web pages that says why a changed page is safe to let through (a real HTML parser shows one plain text node changed and nothing else) and names that parser as what its answers are compared against
  When the build starts
  Then the first test written is the comparison against that parser, and it is seen failing before any reader exists

- [ ] **Scenario: A kind with a list of dangers and no comparison is not let through**
  Given a plan whose rules for stylesheet colours list the dangers to catch and name no real implementation to compare against
  When the plan is read before the build
  Then stylesheet colours are not let through in that plan
  And the build does not start until the kind is taken out, or the plan states a reason and a comparison for it

- [ ] **Scenario: Every area is attacked before the build, and an open way through holds it**
  Given a plan that passes the first scenario and names two areas, the page reader and the paths it accepts
  When its turn to be built comes
  Then the red-team critic and the threat modeler each attack the rules of both areas, all at the same time, before any code is written, and the findings are listed by area
  And while any way through they report is open, the build does not start and the owner reads one sentence naming it
  And a way through is closed when the plan's rules are changed, or the kind is taken out, and the attacker that found it, run again, no longer reports it

- [ ] **Scenario: A fix round started by hand is counted**
  Given a review found a way through and a person, not the CTO Chief, starts the fix round
  When that fix round ends
  Then the plan's kickback count in the circuit breaker is one higher than before it
  And when the count passes the limits the circuit breaker already has (3 for one step, 5 for the plan) the owner is told, as today

- [ ] **Scenario: A way through still found after the second fix round takes the area out**
  Given a first and a second fix round closed the ways through found in the page reader, and the review after the second finds another way through in the page reader
  When a third fix round for the page reader would start
  Then it does not start: the page reader is taken out of the plan and the rest goes on to be finished, or the plan goes back to planning
  And the owner reads one sentence saying which of the two happened and why
  And a way through found in a different area counts as a first finding for that area, which gets its own first and second fix round

- [ ] **Scenario: A plan that lets through two kinds is split**
  Given a functional plan that lets through web pages and stylesheet colours
  When it is turned into plans to build
  Then pages and stylesheet colours are two plans, each with its own reason, comparison, attack and review
  And a plan that lets through both is not built

- [ ] **Scenario: The build agent checks before every commit**
  Given a build agent has changed two source files and their tests
  When it is about to commit
  Then it has just run the linter, the check for tests that cannot fail, and the tests of those two files, and all three passed
  And with one linter error it makes no commit, fixes the error, and runs the three again

- [ ] **Scenario: The last commit follows a passing full suite**
  Given all the build's work is done
  When the build agent is about to make its last commit
  Then the full gated suite (`npm test`) has run and passed, and its result is in the build record
  And with one failing test it makes no commit

- [ ] **Scenario: Several reviewers look at once, one area each**
  Given a built plan of this kind with five areas
  When the review starts
  Then five reviewers start at the same time, each given one area, and no area is left without one
  And no reviewer is asked to review the whole build

## Scope

### In Scope
- What a plan that decides what is let through must state for each kind, and the comparison as the first test (first and second scenarios).
- The attack on the plan's rules before the build, and the hold while a way through is open (third scenario).
- Counting every fix round in the circuit breaker, and the stop after two fix rounds in one area (fourth and fifth scenarios).
- One kind per plan (sixth scenario).
- The runs before every commit and before the last one (seventh and eighth scenarios).
- Review by several reviewers at once, one area each (ninth scenario).

### Out of Scope
- Model and effort choices, and the menu's speed: not planned here; the owner schedules them.
- The hotfix check itself, its rules, its remaining areas and whether they ship: `plans/functional/ctoc-checks-that-a-hotfix-is-really-small-and-safe.md` and its slices.
- Any hook: none is added or changed (`docs/ENFORCEMENT.md` keeps the owner's decision).
- How the build is held back, where a plan's areas are listed and how the counter is fed: the implementation plan's choices.
- Plans that decide nothing about what is let through: unchanged.

## Risks

- **Technical:** counting needs a new recording point, because a fix round after a review reaches no counter today (see "Counting" above), and the two-strike stop would never fire.
  - Likelihood: MEDIUM. Impact: MEDIUM. Mitigation: Create a test, red first, that starts a fix round by hand and reads the plan's counter before and after.
- **Business:** a plan is held for a way through the owner would have accepted, and the build he wanted waits.
  - Likelihood: MEDIUM. Impact: MEDIUM. Mitigation: Show the way through in one sentence at the hold, and offer taking the kind out as the other way to proceed.
- **Dependency:** the red-team critic reads only the plan reference, the moment the plan is at and optional changed line ranges, and its own file says a brief never sets its method (`agents/iron-loop/red-team-critic.md`); a limit to one area is not an input it has today.
  - Likelihood: MEDIUM. Impact: MEDIUM. Mitigation: Test one area-limited run of each attacker on a finished plan before building the rule, and add the area as an input in the implementation plan if the critic cannot take it.

## Priority

**Priority: HIGH** (Score: 7/9)
- Dependency: MEDIUM (2) -- nothing waits on it; it governs the plans built after it.
- Business Impact: HIGH (3) -- the owner asked for it by name, after nine recorded fix rounds on one piece of work.
- Technical Risk: MEDIUM (2) -- counting fix rounds that reach no counter today needs new wiring; the rest is written instructions and agent runs.

## Decisions Taken Under Ambiguity

1. **"Plan" means the plan that is built,** the implementation plan: rule 4 says each further kind is its own plan, so a functional plan that names several kinds becomes one implementation plan per kind.
2. **"A kind with neither" is read as "a kind lacking either a reason or a comparison",** because rule 1's first sentence demands both.
3. **"Closed" means the attacker that found the way through, run again on the changed rule, no longer reports it,** so the build agent cannot close its own finding. Cost: one more run per finding.
4. **"One area each" means both attackers run on every area,** each limited to that area, all at once; the other reading, one attacker per area, leaves each area seen through one lens (cost: two runs per area). An area is the part of a plan one attacker or reviewer is given: the plan names its areas (the record's ninth round used Markdown, catalogue files, stylesheets, paths and names, the test run), and the attack and the review use the same list.
5. **Two strikes means two fix rounds per area, then out:** an area gets a first fix round and a second, and when the review after the second still finds a way through in it, no third fix round starts. Reason: the page reader needed fixes in rounds 8 and 9 after it was first held to a real parser and then held under attack; one fix round would have taken out the one area that works. Taking the area out is the default over going back to planning when the rest of the plan still delivers what it was for; otherwise the plan goes back to planning. The owner is told in one sentence and may overrule, because the choice changes what ships.
6. **A commit of tests written to fail first** shows them failing for the stated reason, with the linter and the check for tests that cannot fail passing; read literally, rule 5 would forbid test-first work.
7. **Rule 3 widens what an existing counter counts** (`src/lib/circuit-breaker.js`) and adds no hook and no gate, so I did not mark it as needing the owner's explicit approval beyond this plan's; rule 2 is the one that does.
