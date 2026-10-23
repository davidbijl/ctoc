---
title: "A slow tool probe is not reported as a missing tool"
created: "2026-10-22"
type: feature
parent_vision: "vision/ctoc-is-built-with-ctoc.md"
priority: MEDIUM
status: refined
depends_on: "none"
acceptance_criteria_count: 10
risk_level: MEDIUM
---

# A slow tool probe is not reported as a missing tool

## Problem Statement

The dependency auditor decides whether an audit tool is installed by running its version command with a ten-second limit (`isToolAvailable`, `src/lib/dependency-auditor.js` lines 271-296: `execSync(command, { stdio: 'ignore', timeout: 10000 })`, any exception returns false). A version command that is merely slow is then treated exactly like a tool that is not installed: `runAudit` records "<manager> audit tool not available" (lines 377 and 381), which is untrue, and the audit of that manager does not run.

Found on 2026-10-22 while CTOC was built with CTOC. The gated suite of the answer-commands build, rebased onto main, failed four tests at a one-minute load average of 63 at the start and 141 at the end on 18 cores, from unrelated processes. Three were the wall-clock ratio tests the plan "Timing tests run at most once a day, outside the gated suite" covers. The fourth was `tests/quality-fleet-wiring.test.js` line 355, "LIVE, no internet: the real installed npm, pointed at a closed local port, makes the dependency audit skip loudly with no finding": its precondition `isToolAvailable('npm')` returned false after about 11 seconds ("this live check needs the real installed npm", line 372). npm is installed: `npm --version` took 96 to 128 ms three times at a load average of 108 outside the suite, and the same test passed alone in 1.8 s at a load average of 104. So the probe's limit expired under contention, and the auditor would have told a user that npm is missing.

The other probes of the same shape (`SASTRunner`, `SCARunner`, `SecretsScanner`, `migration-safety-checker.js` line 1164, and any other version probe with a limit) are to be read for the same conflation; this stub names only the one observed.

Disposition: new work. Done when a probe that runs out of time is reported as "did not answer within the limit" (a loud skip naming the tool and the limit), never as "not available", a missing tool is still reported as missing, and a test drives both through the real probe without reading a clock.

### What was read for this refinement

Read on main by the product owner. This agent holds no shell and ran nothing: "read" means the cited lines say what is written here, never that a behaviour was observed. The figures in the paragraphs above (load averages, 96 to 128 ms, 1.8 s, about 11 seconds) are the coordinator's, carried as recorded and not re-measured.

**Every version probe with a time limit, and whether it conflates a time-out with a missing tool.**

| Probe | Where | How it starts, and its limit | What a time-out reads as today | Conflates? |
|---|---|---|---|---|
| Dependency auditor `isToolAvailable` | `src/lib/dependency-auditor.js` lines 271–296 | `execSync` of a command string through a shell, 10000 ms (line 291); any throw answers false | "`<manager>` audit tool not available" (`runAudit`, lines 377 and 381), and before that, in the security scan, "dependency audit skipped: `<manager>` audit tool not installed" (`src/lib/quality-agent.js` line 1883) | yes: the observed case |
| Static analysis (SAST) `isToolAvailable` | `src/lib/sast-runner.js` lines 482–504 | `execSync` through a shell, 10000 ms (line 499); eslint (line 486) starts no process | "SAST skipped for `<language>`: no scanner installed (need semgrep or `<tool>`)" (`quality-agent.js` line 1933); the runner's own result "no security scanner available" (lines 558–567) | yes |
| Dependency scanner (SCA) `isToolAvailable` | `src/lib/sca-runner.js` lines 182–202 | `execFileSync` with an argument list, 10000 ms (line 197); `npm.cmd` on Windows (line 194) | "SCA skipped for `<language>`: no dependency scanner installed (need …)" (`quality-agent.js` line 2014); the runner's reason "no dependency (SCA) scanner available" (line 326) | yes |
| Secrets scanner `isToolAvailable` (trufflehog, detect-secrets) | `src/lib/secrets-scanner.js` lines 1184–1196 | `execSync` through a shell, 10000 ms (line 1191) | "secrets: `<tool>` not installed (external verification NOT performed)" (`quality-agent.js` line 1801) | yes |
| Migration check `isToolAvailable` (Atlas) | `src/lib/migration-safety-checker.js` lines 1164–1177 | `execFileSync` of `atlas version`, 10000 ms (line 1172) | "atlas deeper mode requested but the atlas binary is not available" (`runAtlas`, lines 1191–1196) | yes |
| Completion check `toolExists` | `src/lib/step-13-verify.js` lines 309–322 | `spawnSync` of `<tool> --version`, 15000 ms (line 314); answers `!r.error` (line 318) | a time-out sets `error`, so the answer is false: the ruff, golangci-lint, cargo, mypy, go or pytest command is never added (callers at lines 678–680, 686–687 and 693–695), the category can read "not applicable" (line 363), and the check can pass on its other checks | yes, and it can turn into a pass |
| Git version in the claim sweep | `src/lib/plan-recovery.js` lines 464–483 (the version call at line 475) | `spawnSync` of git under a shared budget | "timeout", "not checked in time" (lines 466 and 471) | no |
| `runCommandArgv` | `src/lib/quality-agent.js` lines 188–223 | `spawnSync` with an argument list, the caller's limit | `timedOut` (line 216), kept apart from `notStarted` (lines 217–220) | no: not a probe, but the split this plan matches |
| `hasCommand` | `src/lib/hooks-installer.js` lines 59–72 | `command -v` or `where`, no limit | cannot time out | no limit, so no |
| `commandExists` | `src/lib/tool-detector.js` lines 202–215 | `which` or `where`, no limit | cannot time out | no limit, so no |
| `driveCli` | `src/lib/app-runner.js` lines 807–851 | `node <entry> --help` under a budget | "CLI failed to launch: …" (lines 837–839), a failure | not a presence probe; a failure, never "missing" and never a pass |

The same file already splits a time-out for the audit itself: `_recordScannerFailure` (`src/lib/dependency-auditor.js` lines 440–458) records a killed or `ETIMEDOUT` audit as "timed out or was killed" (lines 442–445). The completion check already fails a run that runs out of time closed and with its true reason, and its header says such a run "can never be reclassified NOT-RUN and papered over by some other passing check" (`src/lib/step-13-verify.js` lines 28–37, the branch at lines 782–799). Only the probes miss the split.

The same conflation was met before and worked around in a test: `tests/secrets-scanner-coverage.test.js` lines 14–17 and 30–39 record that real version probes "hit the scanner's own 10s (--version) … timeouts" under coverage load, and moved those tests to a faked `execSync`. The product probe kept the conflation.

**What the security scan does with a skip.** A skip never blocks: the scan passes when it has no critical and no high finding (`quality-agent.js` line 2118), prints "`<n>` scanner(s) skipped (see above) — not counted as pass" (lines 2119–2121), and the summary shows "Security: PASS (`<n>` scanner(s) skipped — see log)" (lines 2340–2344). A timed-out audit run is already such a skip (lines 1893–1899).

**The failing live check.** `tests/quality-fleet-wiring.test.js` line 355 replaces the auditor's probe with one that calls the real probe for npm and answers false for yarn and pnpm (lines 363–367), turns the other scanners' probes off (lines 368–370), and inside `withClosedNpmRegistry` (`tests/helpers/security-scan-fixtures.js` lines 120–154: npm's registry pointed at a closed port on 127.0.0.1, every variable put back afterwards) asserts the real probe answers true, "this live check needs the real installed npm" (lines 372–373). That is the assertion that failed after about 11 seconds.

**Searches, every match read.**
- `isToolAvailable` over `src/`: 6 files (the five scanner modules and `quality-agent.js`).
- `timeout:\s*\d` over `src/lib/`: 21 lines in 11 files. The probes among them are the rows above; the rest start a whole scan or audit, a dev server, git or Playwright.
- `--?version` over `src/`: version probes only in `dependency-auditor.js`, `sast-runner.js`, `sca-runner.js`, `secrets-scanner.js`, `step-13-verify.js` and `plan-recovery.js`; the other matches are unrelated words (claim kinds, the release script, a workflow template, a hook comment).
- `\['(-v|-V|version|--help|-h)'\]|'which'|'where'|command -v` over `src/`: `migration-safety-checker.js` line 1166, `hooks-installer.js` lines 49 and 65, `tool-detector.js` lines 186 and 209, `app-runner.js` line 818, and the release script (unrelated).
- `toolExists\(` over the repository outside `plans/`: one file, `src/lib/step-13-verify.js`.
- `isToolAvailable` over `tests/`: 83 lines in 9 files.
- `not available|not installed` over `tests/`: every match on a probe path is a fake that throws a plain error with no time-out marker (for example `tests/dependency-auditor.test.js` lines 453–460 and 1392–1400, `tests/quality-fleet-wiring.test.js` lines 744–749, `tests/sca-runner.test.js` lines 993 and 1032, `tests/migration-safety-checker.test.js` line 171), or a missing eslint, which starts no process. No existing assertion pins the old wording on a time-out path.

Limits: a probe written under another spelling is not found by these patterns. That the scan and the completion check reach these probes is read from their call sites cited above, not from the searches.

## Business Alignment

**Job to Be Done:** When I or a build agent run the security scan or the completion check on a busy machine, I want a tool that was too slow to answer its version check reported as exactly that, with its name and the limit, so I can tell a loaded machine from a missing tool and never read a check that did not run as covered or as not applicable.

**Impact Map:**
- **Goal:** the parent vision's ruling of 2026-10-20: CTOC is built through its own menu, and every friction found while doing so is filed as a plan and not worked around. A probe that calls an installed npm missing sent the coordinator off to prove npm was installed, by hand, before the failed gated run could be explained.
- **Actor:** the owner, Tijn van der Zant, and the CTO Chief and background agents that build CTOC for him (the vision's target users); after them, every CTOC user who runs the security scan or the completion check on a busy machine.
- **Impact:** the person reading the security scan's skip lines or the completion check's reasons sees "did not answer within `<limit>`" for a slow tool and "not installed" only for a missing one, and a completion check never passes while an installed lint, type or test tool did not run.
- **Deliverable:** three probe outcomes (answered, missing, did not answer within the limit) in the six probes that conflate them today, shown in the scan's skip lines and the completion check's reasons; a limit and a command the calling code can set, with today's defaults; the live npm check's precondition naming the outcome.

**Alignment checks:**
1. Does the Goal trace to the vision's problem statement? YES. This friction is not one of the vision's ten; it was found on 2026-10-22 while building CTOC with CTOC, and it is filed under the vision's Source (every dogfooding friction becomes a plan) and its success criterion "Nothing dropped".
2. Is the Actor in the vision's target audience? YES: the CTOC maintainers who build CTOC through its menu, then every user of the same routes.
3. Is the Impact observable? YES: the text of a skip line and of a check reason, and a check's verdict.
4. Is the Deliverable one functional area? YES: how a tool's presence is probed and how that outcome is reported.

**Overlap with other plans:**
- Sibling stubs: `plans/functional/ctoc-is-built-with-ctoc-*.md` lists one file, "the background-agent protection is measured before the owner decides"; it touches no probe. No overlap.
- "Timing tests run at most once a day, outside the gated suite" (`plans/functional/timing-tests-run-at-most-once-a-day-outside-the-gated-suite.md`) owns the tests that read a clock: which they are, where and when they run. This plan owns the product probe. The live check at `tests/quality-fleet-wiring.test.js` line 355 reads no clock and is not in that plan's inventory; its sensitivity to load comes from the product probe's limit, so its precondition is this plan's. The new tests here assert a classification and read no clock, so that plan's row D (tests that a time limit fires, kept on the wall clock) does not claim them, and they stay in the gated suite.
- "The test gate fails on a suite that crashes while loading" (`plans/todo/the-test-gate-fails-on-a-suite-that-crashes-while-loading.md`) lists `src/lib/step-13-verify.js` line 311 as a presence probe and does not change it. No file is shared.
- "Timing tests run at most once a day, outside the gated suite" and "A build runs the tests that read the files it touched; the whole suite runs before a push and at the wave barrier" (`plans/functional/affected-tests-while-building-whole-suite-before-push.md`) both change `src/lib/step-13-verify.js`, which this plan changes too; they are built one after the other (Dependency Risks).

## User Stories

**As the** owner, or the CTO Chief or a build agent running the security scan for him, **I want** a scanner whose version check did not answer within its limit reported as exactly that, naming the tool and the limit, **so that** an installed tool on a busy machine is never reported missing and a skipped scan is never read as covered.

**As the** owner, or a build agent running the completion check, **I want** a tool whose version check did not answer within its limit to fail the check with that reason, as a run that runs out of time already does, **so that** an installed lint, type or test tool that never ran can never be read as not applicable while the other checks pass.

**As the** owner reading a failed gated run, **I want** the live npm check to say whether npm is missing or did not answer within the limit, and every test of the probes to drive the real probe without a clock and without a sleep, **so that** I find a loaded machine in one read and no test is weakened.

## Acceptance Criteria

### The security scan

- [ ] **Scenario: npm too slow to answer is reported as a time-out, not as missing**
  Given a project folder holding `package.json` and `package-lock.json`, the dependency auditor's npm version check set to a command that never answers with a limit of 200 ms, and every other scanner's version check set to a command that does not exist
  When the security scan (`runSecurityScan`) runs
  Then its skipped list holds a line that names npm, says it did not answer within 200 ms and that its dependency audit did not run
  And no line says npm is "not installed" or "not available", no dependency finding appears, and the scan's closing line counts that line among the skipped scanners, "not counted as pass"

- [ ] **Scenario: A missing tool is still reported as missing, word for word as today**
  Given the same project with npm's version check set to a command name that exists nowhere
  When the security scan runs
  Then the skipped list holds "dependency audit skipped: npm audit tool not installed" exactly as today, and no line says "did not answer"

- [ ] **Scenario: Every scanner probe gives the same outcomes**
  Given each of the five scanner probes (the dependency auditor, static analysis, the dependency scanner, the secrets scanner's external tools, the Atlas migration check) set in turn to a command that answers, a command that does not exist, a command that exits with an error, and a command that never answers with a limit of 200 ms
  When each probe runs
  Then it reports, in that order: available; missing; missing, as today; did not answer within 200 ms
  And for the time-out the line the scan prints, or the runner's error, names that tool (for example semgrep, osv-scanner, trufflehog, atlas) and the limit, while every missing line keeps today's wording (`quality-agent.js` lines 1801, 1883, 1933 and 2014; `migration-safety-checker.js` line 1194)
  And in a project holding `yarn.lock`, a yarn version check that never answers is reported as a yarn time-out, and no npm audit is started in its place

- [ ] **Scenario: The calling code sets the limit and the command; the defaults are unchanged**
  Given each of the six probes run with nothing set by its caller, its process start recorded instead of performed
  When it runs
  Then it starts the same version command as today with the same limit (10000 ms for the five scanner probes, 15000 ms for the completion check's probe)
  And neither the limit nor the command is read from the scanned project's files or from the environment

### The completion check

In these three scenarios the check's own runs (`npm test`, `npm run lint`) are answered by the stand-in the existing completion-check tests already use (`tests/step-13-verify-coverage.test.js` lines 51–60, which replace `execSync` and `spawnSync` at the module boundary); only the version check is left real and starts a process.

- [ ] **Scenario: A slow tool's version check fails the completion check with its true reason**
  Given a project with `pyproject.toml`, a declared `test` npm script that passes, no `lint` npm script, and the completion check's version check for ruff set to a command that never answers with a limit of 200 ms
  When the completion check (`runVerify`) runs
  Then lint is not recorded as not applicable, the check fails, and its reasons hold one line that names ruff, says it did not answer its version check within 200 ms, and says lint did not run and this is not a lint failure

- [ ] **Scenario: A missing tool is still not applicable**
  Given the same project with ruff's version check set to a command that does not exist
  When the completion check runs
  Then lint is recorded as not applicable exactly as today, and the check passes on its test run

- [ ] **Scenario: A slow tool that an earlier check made unnecessary changes nothing**
  Given a project with `pyproject.toml` and a declared `lint` npm script that passes, and ruff's version check set to a command that never answers with a limit of 200 ms
  When the completion check runs
  Then lint passes on the npm script, no reason names ruff, and the check passes

### The tests

- [ ] **Scenario: The tests start only Node, never sleep and read no clock**
  Given the tests added or changed for the scenarios above
  When they are read and run on the build machine
  Then the command that answers and the command that never answers are both the running Node executable with arguments, the missing command is a generated name that exists nowhere, no shell script or platform-specific program is started, no test sleeps or asserts a measured time, and the never-answering command ends itself once the process that started it is gone, so a probe whose shell does not hand over to Node leaves nothing running

- [ ] **Scenario: The live npm check names why its precondition failed**
  Given a scratch copy of `tests/quality-fleet-wiring.test.js` in which the live check's npm version check is set to a command that never answers with a limit of 200 ms
  When the live check (line 355) runs
  Then it fails, as today, with a message that says npm did not answer within 200 ms; with the check set to a missing command it fails saying npm is not installed; and unchanged, on the build machine, it runs every assertion it has today

- [ ] **Scenario: No test is loosened and the gated suite holds**
  Given the change, and the assertion map recorded in the plan, which gives each changed assertion its old file and line, its new text and the written reason
  When `npm test` runs and the map is checked against the files
  Then `npm test` reports 0 failed and 0 skipped with coverage at or above `minPct` 99, every existing assertion on the six probes, the scan's skip lines and the completion check is kept word for word or tightened, and every existing test that replaces a probe with one answering false still reads as a missing tool

## Scope

### In Scope
- The three outcomes, answered, missing and did not answer within the limit, in the six probes that conflate them today: the dependency auditor, static analysis, the dependency scanner, the secrets scanner, the Atlas migration check and the completion check's `toolExists` (scenarios 3, 5, 6 and 7).
- The time-out line in the security scan's skipped list and its count in the scan's closing line and summary, for the secrets, dependency, static analysis, dependency scanner and Atlas probes, and the runners' own errors (scenarios 1 and 3).
- The yarn and pnpm fallback in `runAudit` when their probe runs out of time (Decision 6; scenario 3, its last line).
- The completion check's reason and verdict on a probe time-out, on the recommended answer to the question written for this plan (scenarios 5 to 7).
- A limit and a command the calling code can set, with today's defaults (scenario 4).
- The live npm check's precondition message (scenario 9).
- Tests that drive the real probe with Node as the commands, no sleep and no clock, and the assertion map (scenarios 8 and 10).

### Out of Scope
- Tests that read a clock, and where and when they run: "Timing tests run at most once a day, outside the gated suite".
- Whether a skipped security scanner blocks a push: unchanged. Skips do not block (`quality-agent.js` lines 2118 and 2335–2339); a time-out joins the skips. Changing that is gate logic, the owner's.
- Not part of this plan, listed for the owner to schedule:
  - A limit the operator can raise for a heavily loaded machine, as `CTOC_VERIFY_TIMEOUT_MS` does for a check's run. Under the load recorded on 2026-10-22 the live check still fails, now with its true reason (Decision 9).
  - Asking each tool once per scan: the security scan asks npm's version up to three times (`quality-agent.js` lines 1876 and 1878, then `runAudit` lines 372–373 or 380), each up to 10 s on a busy machine.
  - The dependency scanner's npm probe on Windows: it starts `npm.cmd` without a shell (`sca-runner.js` lines 194–197), and the repository states that Node refuses to start a `.cmd` file without a shell (`quality-agent.js` lines 253–254), so on Windows that probe would report npm-audit missing while npm is installed. Read, not run on Windows.
  - Ending the whole process tree of a probe that runs out of time: a probe through a command interpreter on Windows ends the interpreter, not the tool. `endProcessTree` in `quality-agent.js` (lines 234–244) is the existing tree end.
  - `driveCli` in `src/lib/app-runner.js` words a time-out as "CLI failed to launch" (lines 837–839): a failure, never a pass, but the wrong reason.
  - The lookups without a limit, `hasCommand` (`src/lib/hooks-installer.js` lines 59–72) and `commandExists` (`src/lib/tool-detector.js` lines 202–215), can wait for ever on a lookup that hangs; they cannot misreport a time-out.

## Risks

### Technical Risks
- Answer-shape compatibility: the probes' true-or-false answer is read at seven call sites in `quality-agent.js` and replaced in tests across 9 files (83 matching lines), mostly with a function answering false. If false stops meaning "missing", or a probe's process-start function changes so the tests' `execSync` and `execFileSync` fakes no longer catch it, real tools start in tests and existing tests change meaning.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Keep each probe's process-start function and its true-or-false answer for existing callers, add the time-out outcome beside it, and run `tests/security-scan-never-downloads-a-scanner.test.js` and the nine files on the base commit and on the change (scenario 10).
- The time-out marker read wrong: `execSync` and `execFileSync` throw with code `ETIMEDOUT` and the time-limit signal, while `spawnSync` returns them (`step-13-verify.js` lines 784–790; `plan-recovery.js` line 471). A probe that checks the wrong field reports time-outs as missing again.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Drive every probe with a command that really never answers (scenarios 3 and 5), never with a fake error carrying a code.
- A leftover process: on Windows a probe through a command interpreter ends the interpreter, not the program, so the tests' never-answering command would run on.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Make the never-answering command end itself once the process that started it is gone (Node checking its parent's process id), so nothing is left running on any platform whatever the shell does (scenario 8). No assertion reads the process id afterwards, because that would need a wait; so a leak from a command built otherwise would go unasserted, and the builder records one run of the time-out tests with the process list checked before and after.
- The probes start their tools four different ways: a shell string (dependency auditor, static analysis, secrets scanner), an argument list with `npm.cmd` on Windows (dependency scanner), an argument list (Atlas), and `spawnSync` with a shell only on Windows (completion check), while `quality-agent.js` starts npm through `npmLauncher`.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Keep each probe's way of starting its tool in this plan, and list the Windows `npm.cmd` case for the owner (Out of Scope).

### Business Risks
- On a busy machine the scan now says "did not answer within 10000 ms" and the audit for that run is still skipped: the person loses that run's audit as before, but knows why.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Print the limit in the line so the reader re-runs on a quieter machine, and list a raisable limit for the owner.
- On the recommended answer, a busy machine can fail a completion check that passed before, when a tool's version check runs out of time.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Name the tool and the limit in the reason and say it is not a lint, type or test failure, as the check already says for a run that runs out of time (`step-13-verify.js` lines 794–796).

### Dependency Risks
- `src/lib/step-13-verify.js` is also changed by "Timing tests run at most once a day, outside the gated suite" and by "A build runs the tests that read the files it touched; the whole suite runs before a push and at the wave barrier".
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Declare `src/lib/step-13-verify.js` in the slice that changes it, so the scheduler runs the plans one after the other, and re-read the file when that build starts.
- The owner's answer to the question written for this plan decides scenario 5.
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Keep the completion-check change in a slice of its own, so either answer changes only that slice (Decision 5 gives the other answer's wording).

## Priority

**Priority: MEDIUM** (Score: 6/9)
- Dependency: 2 — no plan depends on it; it runs beside the others, one after the other only where `src/lib/step-13-verify.js` is shared.
- Business Impact: 2 — it supports the vision's goal: a false "not installed" sent the coordinator off the menu, and the completion check can pass with an installed tool's check unrun; both need a busy machine to happen.
- Technical Risk: 2 — six probes, a true-or-false answer faked in 9 test files, and four ways of starting a tool; the split itself already exists in three places in the code.

## Decisions Taken Under Ambiguity

1. **All six probes that conflate, not only the observed one.** The stub asks for the others to be read; each answers false on a time-out. Fixing one would leave five callers telling the reader that a slow tool is not installed.
2. **Only the time-out is split out.** Every other outcome keeps today's answer: for the five scanner probes a command that exits with an error stays missing (`cargo audit --version` exiting with an error means cargo-audit is absent), and for the completion check's probe it stays present (`!r.error`, line 318). Reason: it keeps every existing test fake, which throws a plain error, meaning missing, and changes nothing a reader sees today except the time-out.
3. **A time-out is a probe ended because it reached its limit,** read from the markers Node gives: the code `ETIMEDOUT`, or the time-limit signal on a killed process. These are the markers the code already reads for a run (`step-13-verify.js` line 790, `quality-agent.js` line 216, `dependency-auditor.js` line 442, `plan-recovery.js` line 471).
4. **In the security scan a time-out is a loud skip that does not block,** like every other skip there, including a timed-out audit run today (`quality-agent.js` lines 1893–1899). Whether skips block is gate logic and is not changed here.
5. **In the completion check a time-out fails the category closed,** as the recommended answer to the question written for this plan: the timed-out tool's command takes its place among the candidates, and when it is reached it counts as a run that ran out of time, failed closed with its true reason, as `tryCommand` does (`step-13-verify.js` lines 782–799). It is reached only when no earlier candidate of that category ran (scenario 7). Reason: the file's own contract (lines 28–37) says such a run "can never be reclassified NOT-RUN and papered over by some other passing check"; the probe is the one path that does exactly that. If the owner picks the other answer, scenario 5 changes to: lint is recorded as not run with that reason, the summary prints it, and the verdict is decided by the other checks.
6. **yarn and pnpm.** When their native lockfile is absent, the npm fallback runs as today, whatever their probe answers. When the lockfile is present and their probe ran out of time, the time-out is reported for yarn or pnpm by name, and the npm fallback is not run in its place. Reason: the fallback stands in for an absent tool; a tool that is present but slow is not absent, and an npm audit reading another file set would read as that manager's coverage.
7. **The default limits stay 10000 ms and 15000 ms.** npm's version took 96 to 128 ms at a load average of 108 outside the suite (the coordinator's figures), so 10000 ms is about 80 times a normal answer. Raising it would hide nothing this plan fixes; a raisable limit is listed for the owner.
8. **The limit and the command are set only by the calling code,** never read from the scanned project's files or the environment: a probe command taken from a project file would let that project start any program. The tests need both to drive a command that never answers without a sleep. "Calling code" includes a test that replaces the probe on its class to call the real probe with its own command and limit, as the live check already does (`tests/quality-fleet-wiring.test.js` lines 363–367), because the security scan creates its auditor itself (`quality-agent.js` line 1858); for the completion check's `toolExists`, a module-level function, the planner chooses how `runVerify` hands them down.
9. **The live check stays a hard precondition and is not made to pass under load.** Its message names the outcome; under the load recorded on 2026-10-22 it would still fail, now saying npm did not answer within the limit. It reads no clock and is not in the timing plan's inventory, so it is this plan's.
10. **The wording of the time-out line** names the tool, says "did not answer within", gives the limit with its unit, and says what did not run; it never contains "not installed" or "not available". The exact text is the implementation planner's.
11. **The tests use Node as every real command:** Node with arguments that print and exit answers, Node with arguments that never finish never answers, and a generated name is missing. Node is on every platform, so no shell script and no platform-specific program is needed.
12. **One question was written,** on the completion check's verdict: it changes what the check a plan's completion rests on decides, and the project's rule gives such a change to the owner's explicit approval. Everything else is decided here.
13. **Every figure in this plan comes from the coordinator's record in the stub** and was not re-measured.
