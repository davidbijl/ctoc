---
iron_loop_verdict: true
iron_loop: true
title: "The push runs the whole declared test suite and never counts a zero-test run as a pass"
type: implementation
created: 2026-10-14
priority: high
effort: medium
parent_plan: a-push-never-reaches-github-on-a-zero-or-partial-test-run
depends_on: none
files:
  - src/lib/quality-agent.js
  - src/commands/push.js
  - src/commands/push.md
  - README.md
  - src/lib/tool-detector.js
  - tests/w10-push-entry-point.test.js
  - tests/push-command-coverage.test.js
  - tests/quality-agent.test.js
  - tests/tool-detector-defects.test.js
  - tests/remainder-hooks-commands-coverage.test.js
revision: 1
rejection_reason: "Sent back: the approve route recorded this as the owner approval; it crosses again on recorded evide"
tag: rejected
---
# REVISION 1

## Rejection Feedback

Sent back: the approve route recorded this as the owner approval; it crosses again on recorded evidence.

---


# The push runs the whole declared test suite and never counts a zero-test run as a pass

Slice 1 of 3 of `plans/implementation/a-push-never-reaches-github-on-a-zero-or-partial-test-run.md`
(the parent; read it in full first, it is the whole ancestry). This slice builds the one shared
whole-suite check that every push path calls, and makes `/ctoc:push` call it. Slice 2 makes the
quality agent's automatic push call it; slice 3 stops the plan sync from pushing.

The owner's order of 2026-10-14 ("improve the push") is the explicit approval for this change
to the push's test check (parent, Decision 0).

## Acceptance Criteria

The scenario numbers are the parent's. Each is a committed test written first and seen red on
today's code (Step 8), except where marked "guard" (green today and must stay green).

- [x] Scenario 1: `/ctoc:push` runs the declared test command once with no test-file arguments, and the selected-tests path is never consulted (test P1).
- [x] Scenario 2: a cached "nothing changed" answer is never a pass; two pushes with nothing changed run the suite twice and the second states the count (test P2).
- [x] Scenario 3: a failing test blocks the push, `pushToRemote` is never called, the text states the failing count (test P3).
- [x] Scenario 4: no test command means no push; the text says no test command was found, nothing was tested, and `--skip-tests` pushes without tests; `runFullTests` on the same tools still passes (test P4; the existing case in `tests/quality-fleet-wiring.test.js` 816-823 stays unedited and green).
- [x] Scenario 5: a readable zero in the node:test, jest and mocha forms blocks, and the text says zero tests ran (test P5).
- [x] Scenario 6: exit 0 with no count printed passes, and the text says the test count is unknown ("test count unknown (no node:test, jest or mocha pass count in its output)", slice Decision 14 (parent Decision 22)) and never that 0 tests ran; the console never prints "(0 total)" either (test P6).
- [x] Scenario 7: on a push that succeeds, a dry run, and a push blocked by lint, both the console and the returned `text` contain the declared command and the count 3 (test P7).
- [x] Scenario 8: `--skip-tests` calls no test function, runs lint, type check and the security scan once each, says no test ran before this push, and pushes when the rest pass (existing case 4, tightened).
- [x] Scenario 9: a `package.json` test script plus a `tsconfig.json` (two languages, one `npm test`) runs once and the count is not doubled (test P9).
- [x] Scenario 10: a run past a short time limit set through the push's test seam is undetermined with "timed out", nothing is pushed, and the text says so and names the limit (test P10).
- [x] Scenario 12 (guard): `tests/hotfix-check.test.js` and every existing `runFullTests` case in `tests/quality-agent.test.js` and `tests/quality-fleet-wiring.test.js` pass with their assertions unedited (`runFullTests` without the new `omitTotalLine` and `env` options prints and answers exactly as today).
- [x] Scenario 13: `src/commands/push.md` no longer contains "tests (47 affected)", says the push runs the project's whole declared test command before every push, its `--skip-tests` row and example say lint, type check and the security scan still run and no test runs, it tells the session to run the command with the Bash tool's longest limit (10 minutes) and to start it in the background and wait when the suite can take longer, it says `--skip-tests` is passed only when the human's own message asks for it, it states the limits (whole suite means the declared command; the runners whose count cannot be read; `push.default=matching`), and its "Integration with the quality checks" sentence no longer says the push runs "the same quality checks that gate a commit" (test P13, which also pins the corrected `README.md` push line and the no-command block text).
- [x] The pushed commit is the commit the checks ran on (CTO Chief, 2026-10-15, B1): a commit that arrives during the checks stops the push, and the text says "a newer commit arrived during the checks and was not tested; not pushing — run /ctoc:push again" (test P14); a commit git cannot report stops the push with its own text (test P16); uncommitted tracked changes are named as tested and not pushed, without blocking (test P15).
- [x] Each test command runs with a 15-minute limit, named on the first line (Q1) and in the text of a run that timed out (P10, Q15) (B3).
- [x] A test command set in `.ctoc/quality-config.yaml` is marked by the detector (the new tool-detector case) and named as such in the text (Q20) (B4).
- [x] A count that only the unanchored fallback can read is reported as "test count unknown", never as a number (Q5b) (B8).
- [x] A whole-suite run started from inside a whole-suite run for the same project is refused, and says so (Q19) (B11).
- [x] A detected language with no test command is named "not tested" in a passing text (Q21) (B13).
- [x] A block on a later command keeps the earlier commands' counts in front of it (Q8) (A3).
- [x] One real `node src/commands/push.js --dry-run` on this repository is recorded with its wall-clock time, the test count it printed, and whether the menu (`/ctoc:start`) was open in a terminal during it (Step 16).

## Implementation Details

### Architecture decision

The zero-test rules live in ONE new exported function in `src/lib/quality-agent.js`,
`runWholeSuiteBeforePush(tools, options)`. It calls the existing `runFullTests` once per distinct
test command (`distinctCommands(tools, 'test')`), each call with a one-language tools object, so
every command is judged on its own and the function always knows which command a result belongs
to. `runFullTests`' `passed` and every existing field stay exactly as they are for every input
(the hotfix check reads them, `src/lib/hotfix-check.js` 1861); the only changes to it are one
additive field, `passCountRead`, on its passing result, an explicit `@returns` type (A4), and two
options that only the new function passes: `omitTotalLine`, that skips only its closing
`Tests passed (N total)` console line (Decision 7), and `env`, extra environment variables for the
commands it starts (B11, through one additive `env` option on `runCommandArgv`). No `wholeTree` on
`/ctoc:push` (parent, Decision 8); slice 2 passes it on the detached agent's push path (B10).
Each command runs with a 15-minute limit (B3). Three small exported git readers (`readGitHead`,
`untestedCommitReason`, `uncommittedTrackedPaths`, argv, no shell) let `push.js` refuse a push when
the commit moved during the checks and name uncommitted tracked paths (B1); slice 2 reuses
`untestedCommitReason` for the automatic push, so the comparison lives in one place.

### Dependency graph

```
src/commands/push.js  --calls-->  quality-agent.runWholeSuiteBeforePush   (new export)
src/commands/push.js  --calls-->  quality-agent.readGitHead, untestedCommitReason, uncommittedTrackedPaths   (new exports)
quality-agent.runWholeSuiteBeforePush  --calls-->  undeterminedTestLanguages, undeterminedTestsResult,
                                                   distinctCommands, runFullTests, parseFailCount   (all existing)
quality-agent.runFullTests  --uses-->  runCounters -> readRunnerCounters -> readPassCount (new internal)
quality-agent.runFullTests --env--> runProjectTestCommand -> runNpmTool | runConfiguredCommand -> runCommandArgv (new env option)
quality-agent.parsePassCount  --delegates-->  readPassCount   (behaviour identical)
src/lib/tool-detector.js  --sets-->  tools.testFromOverride  --read by-->  runWholeSuiteBeforePush
src/lib/hotfix-check.js  --calls-->  runFullTests   (unchanged; its verdicts must not move)
tests/w10-push-entry-point.test.js, tests/push-command-coverage.test.js, tests/quality-agent.test.js,
tests/tool-detector-defects.test.js  --test-->  the above
```

No cycle: `push.js` already requires `quality-agent.js`; nothing new is required anywhere
(`execFileSync` and `path` are already imported by `quality-agent.js`).

### File: `src/lib/quality-agent.js`

**Action:** MODIFY. **Purpose:** add the shared whole-suite check the push paths call, the one
additive field it needs to tell a read count from an unknown one, the option that keeps
`runFullTests` from printing "(0 total)" under it, the `env` option its recursion guard needs,
and the three git readers that keep the pushed commit the tested one.

Changes (item 3a sits earlier in the file than item 3; the numbering follows the reading order):

1. **`readPassCount(out)` (new, internal, NOT exported)**, defined just above `parsePassCount`
   (line ~581). It is today's `parsePassCount` body, returning `{ count: number, anchored: boolean }`
   or `null`: the node:test, jest and mocha branches return `anchored: true`; the final unanchored
   `N passed|passing` fallback returns `anchored: false`. `parsePassCount(out)` becomes
   `const read = readPassCount(out); return read ? read.count : null;` so its return is identical
   for every input (it is read by `counterText` at 737, and changing it could move which stream is
   read, and so a verdict).
2. **`readRunnerCounters(out)`** (line ~715) reads `readPassCount` once and adds
   `passCountRead: read !== null && read.anchored`. A count — zero or not — counts as read only
   from an anchored node:test, jest or mocha summary (slice Decision 2 (parent Decision 22), as amended by B8: a number only
   the unanchored fallback found, such as cargo's first test binary or a pytest-style
   `=== 3 passed in 0.12s ===` line, is "count unknown"). `passCount` stays
   `read ? read.count : 0`, so `parsePassCount`, the hotfix check, `runSpecificTests` and every
   existing field of `runFullTests` answer exactly as today. Update its JSDoc `@returns` and
   `runCounters`' JSDoc `@returns` (line ~750) to include `passCountRead: boolean` (the
   repository type-checks JavaScript).
3. **`runFullTests(tools, options)`** (line ~1030): `let countsRead = true;` and `let ran = 0;`
   before the loop; on the passing path, beside `totalPassed += counters.passCount`, add
   `countsRead = countsRead && counters.passCountRead;` and `ran += 1;`; the final passing return
   gains `passCountRead: ran > 0 && countsRead` (no command ran — the loop never entered — is
   never a read count). The closing console line (line ~1108) becomes
   `if (!options.omitTotalLine) console.log(\`   Tests passed (${totalPassed} total)\`);`.
   `omitTotalLine` is NOT added to the local `limits` object (line ~1041), so it never reaches
   `runProjectTestCommand`; `env` IS added to it, `...(options.env ? { env: options.env } : {})`,
   beside `timeout` and `wholeTree` (B11). Nothing else in the function changes: no early return,
   no other console line, no other field. JSDoc:
   `@param {{timeout?: number, wholeTree?: boolean, omitTotalLine?: boolean, env?: Object<string, string>}} [options]`
   with `omitTotalLine` described as "skip only the closing 'Tests passed (N total)' line; the
   whole-suite check before a push prints its own line" and `env` as "extra environment
   variables for the commands started, merged over the process's own"; and an explicit
   `@returns {Promise<{passed: boolean, passCount: number, failed: number, skipped: number, flaky: number, output: string, passCountRead?: boolean, undetermined?: boolean, refused?: boolean}>}`
   — one object type whose fields that only some returns carry are optional, so reading
   `passCountRead`, `undetermined` or `refused` on any result type-checks (A4); name the new field
   and say it is additive.
3a. **`runCommandArgv(bin, args, options)`** (line ~177) gains one additive option, `env`: the
   `spawnSync` options gain `...(options.env ? { env: { ...process.env, ...options.env } } : {})`
   — merged over the process's own environment, never replacing it (a replaced environment
   would lose `PATH`). Without `env` the call is byte-for-byte today's. The `@param` options type
   of `runCommandArgv`, `runNpmTool` (line ~262), `runConfiguredCommand` (line ~372) and
   `runProjectTestCommand` (line ~414) gains `env?: Object<string, string>`; those three pass
   their `options` object through unchanged already (lines 270, 378, 423 and 425), so no other
   line changes.
4. **`runWholeSuiteBeforePush(tools, options = {})` (new, exported)**, placed directly after
   `runSmartTests` (line ~1209), with two module constants beside it:
   `const WHOLE_SUITE_TIMEOUT_MS = 900000;` (15 minutes per test command, the limit the
   completion check's owner-accepted precedent uses; no new setting, B3) and
   `const WHOLE_SUITE_ENV = 'CTOC_WHOLE_SUITE_ROOT';` (B11).
   - `@param {Object<string, Object>} tools` detected tools per language;
     `@param {{timeout?: number}} [options]` the time limit of each command,
     `WHOLE_SUITE_TIMEOUT_MS` by default.
   - `@returns {Promise<{passed: boolean, passCount: number, failed: number, skipped: number, flaky: number, commands: string[], countKnown?: boolean, undetermined?: boolean, refused?: boolean, output?: string, text: string}>}`
     — one object type, every field only some returns carry optional (A4); `output` only on a
     non-pass (so a block can show why); the passing result carries none.
   - **Recursion guard first (B11).** `const root = path.resolve(process.cwd());` — the
     directory every test command runs in. When `process.env[WHOLE_SUITE_ENV] === root`, return
     `{ passed: false, refused: true, passCount: 0, failed: 0, skipped: 0, flaky: 0, commands: [], text: 'Tests: not run — a whole-suite run is already in progress for this project.' }`
     and start nothing. A project's own suite that reaches this check for the same project (a
     test left on an old injection key, a script that runs `/ctoc:push`) is refused instead of
     running the whole suite again from inside itself; a different root is not refused.
   - `const limitMs = options.timeout !== undefined ? options.timeout : WHOLE_SUITE_TIMEOUT_MS;`
     and `const limitText = limitMs % 60000 === 0 ? \`${limitMs / 60000} minutes\` : \`${limitMs} ms\`;`
   - First line: `console.log(\`\n  Running the whole declared test suite before the push (time limit: ${limitText} per test command)...\`);`
     (slice 2's child-process test reads its start; Q1 reads "time limit: 15 minutes per test
     command", which is how the 900000 ms default is shown to be the default).
   - Detector gave up (`undeterminedTestLanguages(tools)` non-empty): `const r = undeterminedTestsResult(langs)`;
     return `{ ...r, commands: [], text: 'Tests: not verified — ' + r.output }`.
   - No distinct test command (`distinctCommands(tools, 'test')` empty): return
     `{ passed: false, passCount: 0, failed: 0, skipped: 0, flaky: 0, commands: [], text: "Tests: no test command was found, so nothing was tested. Pushing without tests is the human's choice: /ctoc:push --skip-tests." }` (B2).
   - Otherwise `parts = []`, `passCount = 0`, `skipped = 0`, `countKnown = true`, and for each
     `[lang, langTools]` of `distinctCommands(tools, 'test')`:
     - `command` is `'npm test'` when `langTools.testFromScript`, else `String(langTools.test)`
       (Decision 3); push it to `commands`. `named` is the command in backticks, followed by
       ` (test command set in .ctoc/quality-config.yaml, not by the project's own files)` when
       `langTools.testFromOverride` (B4); every text below names the command as `named`.
     - `const run = await runFullTests({ [lang]: langTools }, { omitTotalLine: true, timeout: limitMs, env: { [WHOLE_SUITE_ENV]: root } })`
       (Decision 7: a zero or no-count run never prints "Tests passed (0 total)" right before the
       push says zero tests ran or that the count is unknown).
     - `const before = parts.length ? 'Tests: ' + parts.join('; ') + '. ' : '';` — what the
       earlier commands showed, kept in front of a block (A3).
     - `!run.passed` → return `{ ...run, commands, text: before + blockedText(run, named, limitText) }` (below).
     - `run.passCountRead && run.passCount === 0` → return `{ ...run, passed: false, commands, countKnown: true, text: before + zeroText }`
       where `zeroText` is: `Tests: zero tests ran — ` + `named` + ` reported 0 passing tests`,
       then `, N skipped` when `run.skipped` is above 0, then a full stop. Example:
       ``Tests: zero tests ran — `npm test` reported 0 passing tests, 2 skipped.``
     - `run.passCountRead` → part `` `${named}: ${run.passCount} passed` ``, then
       `` , ${run.skipped} skipped `` only when `run.skipped` is above 0 (the same rule as the
       zero-test text; a clean run's line never contains the word "skipped");
       `passCount += run.passCount`.
     - otherwise → part `` `${named}: exit 0, test count unknown (no node:test, jest or mocha pass count in its output)` ``;
       `countKnown = false`; NOTHING is added to `passCount` — a number only the unanchored
       fallback read is never reported (B8).
     - `skipped += run.skipped`.
   - After the loop, for each `[lang, t]` of `Object.entries(tools)` whose `t.test` is empty or
     null (an undetermined one already returned above), push the part
     `` `not tested: ${lang} (no test command)` `` (B13).
   - Then return `{ passed: true, passCount, failed: 0, skipped, flaky: 0, commands, countKnown, text }`
     — built field by field, never by spreading `run`, so it carries NO `output` (a passing run's
     output can be up to 10 MiB, and slice 2 persists `tier1.tests` to
     `.ctoc/quality-state/status.json`). `text` is `'Tests: passed — ' + parts.join('; ') + '.'`.
     Examples: ``Tests: passed — `npm test`: 3 passed.``,
     ``Tests: passed — `npm test`: 8 passed, 3 skipped.`` and
     ``Tests: passed — `npm test`: 3 passed; not tested: python (no test command).``
   - `blockedText(run, named, limitText)` (a small internal function next to it, not exported):
     `run.undetermined` → `` `Tests: not verified — ${run.output}` `` (the output already says
     "the test run timed out", "more than 10 MiB", "could not be started", or "fail counter could
     not be read"), plus `` ` The time limit is ${limitText} per test command.` `` when
     `String(run.output).includes('the test run timed out')` (B3; the limit is named here only,
     `undeterminedRunResult`'s own output is unchanged because the hotfix check reads it);
     `run.refused` → `` `Tests: not run — ${run.output}` ``; `run.flaky` →
     `` `Tests: failed — ${named} reported a flaky test (zero tolerance).` ``; otherwise
     `const failing = parseFailCount(String(run.output || ''))` and, when it is above 0,
     `` `Tests: failed — ${named} reported ${failing} failing test${failing === 1 ? '' : 's'}.` ``,
     else `` `Tests: failed — ${named} exited with a failure.` `` (Decision 4).
4a. **Three git readers (new, exported), placed after `runWholeSuiteBeforePush` (B1)**, with two
   module constants:
   `const HEAD_MOVED_TEXT = 'a newer commit arrived during the checks and was not tested; not pushing — run /ctoc:push again';`
   and `const NO_HEAD_TEXT = 'the commit could not be read from git, so nothing shows that what would be pushed is what was tested; not pushing';`.
   - `readGitHead(cwd = process.cwd())` → `string|null`:
     `execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000, windowsHide: true }).trim()`,
     `null` when it throws or prints nothing. Argv, no shell.
   - `untestedCommitReason(testedHead, cwd = process.cwd(), read = readGitHead)` → `string|null`:
     `NO_HEAD_TEXT` when `testedHead` is empty or null; otherwise `const now = read(cwd)`,
     `NO_HEAD_TEXT` when `now` is null, `null` when `now.startsWith(testedHead)` (a full hash
     from `readGitHead`, or the short hash `quality-state.js` records at `setRunning`, line 55 —
     never compared with `===`), else `HEAD_MOVED_TEXT`. The one place the comparison lives;
     `push.js` calls it here and slice 2's `maybePushOnSuccess` calls it for the automatic push.
   - `uncommittedTrackedPaths(cwd = process.cwd())` → `string[]`:
     `execFileSync('git', ['status', '--porcelain', '-z', '--untracked-files=no'], …)` (argv, same
     options). The output is NEVER trimmed (a record can start with a space, ` M src/widget.js`,
     and a trim before `slice(3)` would yield `rc/widget.js`). It is split on `\0` and empty
     fields dropped; each record gives `record.slice(3)`, the path as git stores it, never quoted
     (`-z` turns git's quoting off); when the record's X or Y status is `R` or `C`, the next field
     is the old path (`-z` writes a rename as `new\0old`) and is skipped. `[]` when git fails.
     Informational only: nothing blocks on it, because CTOC rewrites its own tracked state files
     and a dirty-tree block would block every push.
5. **`module.exports`**: add `runWholeSuiteBeforePush`, `readGitHead`, `untestedCommitReason`
   and `uncommittedTrackedPaths` after `runSmartTests`.
6. **Header comment** (lines 17-23): the library surface lists the four new exports, and says
   `/ctoc:push` gets its test verdict from `runWholeSuiteBeforePush`, not from `runSmartTests`.

Error handling: every non-pass of `runFullTests` (timeout, oversize output, not started, refused,
unreadable, failure, flaky) passes through unchanged with a `text`; nothing throws that did not
throw before; the git readers never throw (`null` or `[]`). Cross-platform: the git readers use
`execFileSync` with an argument list and `windowsHide`; the environment is merged with object
spread; the root is `path.resolve`; the command text is shown, not run. Throws: never, beyond
what `runFullTests` already throws.

### File: `src/commands/push.js`

**Action:** MODIFY. **Purpose:** the push's test check is the shared whole-suite check, and its
output always states the count and command, or that `--skip-tests` ran no test.

- `run()`'s deps: replace `runSmartTests: deps.runSmartTests || qualityAgent.runSmartTests` with
  `runWholeSuite: deps.runWholeSuite || qualityAgent.runWholeSuiteBeforePush`, and add
  `readHead: deps.readHead || qualityAgent.readGitHead` and
  `uncommittedPaths: deps.uncommittedPaths || qualityAgent.uncommittedTrackedPaths` (B1). Keep
  each property read from the module object at call time (a test that patches the export must
  still reach it).
- First, before detection and every check (B1): `const root = opts.projectRoot || process.cwd();`
  and `const testedHead = d.readHead(root);` — the commit the checks run on.
- The test block (lines 100-103) becomes: when `opts.skipTests`,
  `say('Tests: skipped (--skip-tests) — no test ran before this push.')`; otherwise
  `const tests = await d.runWholeSuite(tools); if (!tests.passed) blockedBy.push('tests'); say(tests.text);`.
  The line is said before the security scan, so it reaches both `d.logger` and `text` on every
  outcome: pushed, dry run, blocked, push failed. `d.runWholeSuite` gets the tools only, no
  options: no `wholeTree` on `/ctoc:push` (parent, Decision 8).
- After the Tier-1 block return and BEFORE the dry-run branch (B1):
  `const untested = qualityAgent.untestedCommitReason(testedHead, root, d.readHead);` and, when it
  is not null, `say(untested)` and return `{ ok: false, pushed: false, blockedBy: [], tier: null, dryRun: !!opts.dryRun, text: lines.join('\n') }`
  — nothing is pushed and a dry run does not claim it would push. Then
  `const dirty = d.uncommittedPaths(root);` and, when it is not empty,
  `` say(`Note: tested with uncommitted changes that are not pushed: ${dirty.slice(0, 5).join(', ')}${dirty.length > 5 ? `, +${dirty.length - 5} more` : ''}.`) ``
  — informational, never a block. The push itself stays the bare `git push` in `pushToRemote`
  (no explicit refspec: that would change the upstream and no-upstream behaviour); with
  `push.default=matching` git pushes other matching branches too, untested, which `push.md`
  states as a limit.
- Header comment and `run`'s JSDoc: the test check runs the project's whole declared suite through
  `runWholeSuiteBeforePush`; the dep keys are `runWholeSuite`, `readHead` and
  `uncommittedPaths`; `--skip-tests` says no test ran; a commit that moved during the checks
  stops the push.
- Nothing else changes: the Tier-1 order, `--force`, the security skip disclosure, the dry-run
  line, `pushToRemote` and `main()`.

### File: `src/lib/tool-detector.js`

**Action:** MODIFY one statement (B4). In the user-override loop (lines ~593-608), inside
`if (phase === 'test') { … }`, beside `delete tools.testFromScript;`, add
`tools.testFromOverride = true;` with a one-line comment: the test command came from
`.ctoc/quality-config.yaml`, so the whole-suite check before a push names it as such. Additive:
the only reader is `runWholeSuiteBeforePush`; `distinctCommands` keys on `test`, `testFromScript`
and `testFramework` only, so deduplication is unchanged; nothing blocks on it. A `test: null`
override is marked too, and changes nothing (the no-command block applies either way).

### File: `src/commands/push.md`

**Action:** MODIFY (only the lines scenario 13 names, plus the time-limit note).

- After the bash block under "Manually trigger quality checks and push to remote" add two
  paragraphs (B2, B3):
  "Before every push this runs the project's whole declared test command, which takes minutes on
  a large suite; each test command may run for up to 15 minutes. Run the command with the Bash
  tool's longest time limit, 10 minutes (`timeout: 600000`); when the suite can take longer,
  start it in the background (`run_in_background: true`) and wait for it to finish: end the turn
  and be woken when it finishes, never a loop that sleeps and checks. A shorter limit stops the
  run before the tests finish, and then nothing is pushed."
  "Pass `--skip-tests` only when the human's own message asks for it; never add it to retry a
  blocked or timed-out push."
- Options table, `--skip-tests` row: "Run no test: lint, type check and the security scan still
  run, and the output says no test ran before this push".
- The diagram line `• tests (47 affected)...` becomes `• tests (whole declared suite)...`, padded
  so the box keeps its width.
- Under the diagram, one paragraph: "The test check runs the project's whole declared test command
  before every push, never a subset picked from the changed files and never a cached earlier
  result. A run in which zero tests ran, or a project with no test command, blocks the push. A
  runner that exits 0 without printing a count passes, and the output says the test count is
  unknown. The output always names the command that ran and how many tests passed."
- Right after it, one paragraph of limits (B1, B5, B8): "Limits. \"Whole suite\" means the
  project's declared test command: a declared command that runs only part of the tests, or a
  focused test (`it.only` and the like), passes with a real count. A count is read only from a
  node:test, jest or mocha summary; for cargo, go, pytest, vitest, or an npm script that chains two
  runners (only the last summary is read), the output says the count is unknown, and a zero from
  them is not recognised. The push is a bare `git push`, so git's own settings choose what is
  pushed: with `push.default=matching`, other branches whose names match the remote's are pushed
  too, untested. If a newer commit arrives while the checks run, nothing is pushed. A commit made
  during the checks, by the menu's plan sync (it commits plan changes every 5 minutes while
  `/ctoc:start` is open in a terminal) or by a background bookkeeping commit, moves the commit and
  the push is refused; run `/ctoc:push` again once nothing is committing. Uncommitted
  changes are tested but not pushed; the output names them."
  Source of the plan-sync clause: the timer at `src/lib/sync.js` 77-79 runs `syncPlans`, which
  commits `plans/` at 108-111 whether or not automatic pushing is on (slice 3 keeps that commit);
  `startAutoSync` is called at `src/commands/start.js` 963, only when `process.stdin.isTTY`
  (960), and runs when `general.syncEnabled` is on, which defaults to `true`
  (`src/lib/settings.js` 42; interval `general.syncInterval`, default 5, line 41).
- "Quick push (skip tests)" example comment: `# Runs lint, type check and the security scan; no test runs, and the output says so`.
- "## Integration with the quality checks", line 241: "`/ctoc:push` runs the same quality checks
  that gate a commit, then pushes on success." becomes, on one line, "`/ctoc:push` runs lint, the
  type check, the project's whole declared test command (never only the affected tests) and the
  security scan, and pushes only when every one passes." The old sentence is false once the push's
  test check is the whole suite and the after-commit check's is the selected tests.
- Every new line names the command as `/ctoc:push`; never a lowercase `ctoc` followed by a space and
  a word (`tests/no-phantom-command-family.test.js` holds this file at zero).

### File: `README.md`

**Action:** MODIFY one sentence (line 889, "Smart Quality Gates"): "`/ctoc:push` runs the same
checks in the foreground" becomes "`/ctoc:push` runs the same checks in the foreground, except that
its test check is always the project's whole declared test suite, never only the affected tests."
This slice makes the old sentence false, so it is corrected here (Decision 9). Nothing else in
`README.md` changes; no count in it moves.

### Test plan (Step 8, written first, run, seen red)

**Hard rules for every new push test.** (a) Every fixture lives under `os.tmpdir()` and is removed
in `after`/`finally`. (b) Every test that can reach the real default check runs with
`process.cwd()` set to its own fixture directory (save and restore in `finally`) and with
`qualityState.getFileHashes` and `qualityState.updateFileHashes` replaced by an in-memory cache
through `t.mock.method` — `src/lib/quality-state.js` caches its directory for the whole process
(line 23), so a red run on today's code (which still calls `runSmartTests`) must never write this
repository's hash cache. (c) `pushToRemote`, `runLint`, `runTypecheck` and `runSecurityScan` are
injected (passing unless stated); no test pushes or scans for real. (d) A fixture runner is a node
file run as a configured command `${JSON.stringify(process.execPath)} ${JSON.stringify(file)}`;
where a count is needed it prints the literal node:test summary lines; where a run count is needed
it appends `JSON.stringify(process.argv.slice(2))` plus a newline to a counter file. (e) Every
`detect` double returns the detector's shape, `{ languages: ['javascript'], tools: { … } }`:
`src/commands/push.js` 87-88 reads `detection.tools`, so a bare tools map reads as no tools at all.
(f) Every test that calls the REAL `runWholeSuiteBeforePush` — directly (Q1-Q21, P13's no-command
call) or through `push.run`'s default (P1-P10, case 12, `tests/quality-agent.test.js` case 8) —
runs with `process.cwd()` set to its own temporary directory, saved and restored in `finally`.
`/ctoc:push` on this repository runs this suite with `CTOC_WHOLE_SUITE_ROOT` naming the
repository root (B11), so a call made from the repository root would be refused there and the
case would be green under a plain `npm test` and red under the push. Step 14 runs the suite
once with that variable set to prove it. (g) Every `push.run` call in the three push test files
injects `readHead: () => 'h1'` and `uncommittedPaths: () => []` (both `makeDeps` helpers and
`tests/quality-agent.test.js` case 8 included), except P14-P16, which test the real readers on
their own fixtures; otherwise a case reads this repository's commit and its dirty tree, and the
paths it names would land in `text` and decide assertions such as cases 9 and 10's `!/skip/i`.
The fourth `push.run` caller, `tests/quality-fleet-wiring.test.js` line 99, is read and needs no
change: it passes `projectRoot` of its own git fixture (so the commit read before the checks reads
that fixture) and is blocked by the security scan, so the moved-commit guard and the dirty-tree
line, which run only after every check passed, are never reached; it is not in this slice's files.

#### `tests/w10-push-entry-point.test.js` — new describe "the push runs the whole declared suite"

Each case drives `push.run` with the REAL default test check (no `runWholeSuite` injected) unless
stated.

- **P1 (scenario 1).** Fixture: a real git repository (`git init`, user config, `commit.gpgsign false`)
  committing `src/widget.js` and `tests/widget.test.js`, no upstream, so the push delta is the whole
  first commit; cwd set to it. `t.mock.method(qualityAgent, 'runSmartTests', ...)` counting calls;
  the in-memory hash cache counting `getFileHashes` calls; `detect` returns
  `{ languages: ['javascript'], tools: { javascript: { test: <counter runner printing ℹ tests 1 / ℹ pass 1 / ℹ fail 0> } } }`.
  `push.run({ dryRun: true }, deps)`. Assert: counter file has exactly one line, `[]`;
  `runSmartTests` spy 0 calls; `getFileHashes` 0 calls; `ok` true. Red today: push.js reads
  `qualityAgent.runSmartTests` (the spy is called, the runner never runs).
- **P2 (scenario 2).** Same git fixture plus `.ctoc/settings.json` `{}`; `pushToRemote` returns
  false on its first call, true after. `push.run({})` twice. Assert: counter file has two lines; the
  second result's `text` matches `/1 passed/`. Red today: the second run answers "Cache valid"
  from the in-memory cache and runs nothing (one line).
- **P3 (scenario 3).** Fixture: `tests/fail.test.js` with one `node:test` test that fails; `detect`
  returns `{ languages: ['javascript'], tools: { javascript: { test: '<node> --test "<that file>"' } } }`; `process.env.NODE_TEST_CONTEXT` deleted
  for the case and restored in `finally` (a nested `node --test` otherwise reports to the outer
  runner — the same handling as `tests/step-13-verify.test.js` 341-349). `push.run({ dryRun: true })`.
  Assert `ok` false, `blockedBy` includes `tests`, `pushToRemote` never called, `text` matches
  `/1 failing test\b/`. Red today: no such text.
- **P4 (scenario 4).** `detect` returns
  `{ languages: ['javascript'], tools: { javascript: { lint: 'eslint .', test: null } } }` (no
  undetermined flag). `push.run({})`. Assert blocked on `tests`, `pushToRemote` never called, `text`
  matches `/no test command was found/`, `/nothing was tested/` and `/--skip-tests/`; and
  `await qualityAgent.runFullTests(sameTools)` (the `tools` object, not the detection) returns
  `passed: true`. Red today: today's
  `runSmartTests` passes it.
- **P5 (scenario 5).** Three fixtures, exit 0: `ℹ tests 0\nℹ pass 0\nℹ fail 0`;
  `Tests:       0 passed, 0 total`; `  0 passing (2ms)`. For each, `push.run({})` is blocked on
  `tests` and `text` matches `/zero tests ran/`. Red today: each pushes. The jest string is NOT
  observed output: jest is not installed in this worktree, and jest's summary is believed to list
  only categories above zero, so real jest is believed never to print `0 passed` (an all-skipped
  jest run then prints no pass count and passes as "count unknown", a stated limit). The jest
  form is kept only as a parser-shape test (B8); the node:test form is real node output, and the
  mocha `0 passing` form is believed real, not observed here.
- **P6 (scenario 6).** Runner prints `ok` and exits 0. `console.log` is captured for the case with
  `t.mock.method(console, 'log', …)` collecting every line (`runFullTests` writes to the global
  console, not to the push's logger). `push.run({ dryRun: true })`: `ok` true, `text` matches
  `/test count unknown \(no node:test, jest or mocha pass count in its output\)/` and does not
  match `/\b0 tests\b/i` or `/0 passed/`; and no captured console line matches `/\(0 total\)/`.
  Red today: no such text, and today's `runFullTests` prints "Tests passed (0 total)".
- **P7 (scenario 7).** Runner passes 3 (`ℹ tests 3 / ℹ pass 3 / ℹ fail 0`). A logger that collects
  every line. Three runs: `push.run({})` with `pushToRemote` true; `push.run({ dryRun: true })`;
  `push.run({})` with `runLint` returning `{ passed: false }`. In all three, both the collected
  console lines and `text` contain the configured command string and match `/3 passed/`. Red today.
- **P9 (scenario 9).** Fixture: `package.json` `{ "name": "f", "version": "1.0.0", "private": true,
  "scripts": { "test": "node run.js" } }`, `tsconfig.json` `{}`, `run.js` appending to a counter
  outside the fixture and printing `ℹ tests 2\nℹ pass 2\nℹ fail 0`; cwd set to it;
  `detect: () => toolDetector.detectTools(fixtureDir)` (the real detector, so the case proves two
  detected languages share one command). `push.run({ dryRun: true })`. Assert counter has one line,
  `text` matches `/`npm test`: 2 passed/` and not `/4 passed/`. Red today: no such text.
- **P10 (scenario 10).** Runner `setTimeout(() => {}, 5000)`. Inject
  `runWholeSuite: (tools) => qualityAgent.runWholeSuiteBeforePush(tools, { timeout: 300 })` — the
  real check with a short limit. Assert blocked on `tests`, `pushToRemote` never called, `text`
  matches `/timed out/`, `/The time limit is 300 ms per test command/` and `/Not pushing/`. Red
  today: the export does not exist.
- **P13 (scenario 13; B2).** Reads `src/commands/push.md` and `README.md`, whitespace runs
  collapsed to one space. Assert: push.md does not contain `tests (47 affected)`; matches
  `/whole declared test command before every push/`; the table row starting `` | `--skip-tests` ``
  matches `/lint, type check and the security scan still run/` and `/no test/`; the code block
  under `### Quick push (skip tests)` contains `lint, type check and the security scan` and
  `no test runs`; push.md matches `/10 minutes/`, `/600000/`, `/run_in_background/` and
  `/15 minutes/`; contains "Pass `--skip-tests` only when the human's own message asks for it;
  never add it to retry a blocked or timed-out push."; matches `/cargo, go, pytest, vitest/` and
  `/push\.default=matching/`; does not contain `runs the same quality checks that gate a commit`
  and contains `` `/ctoc:push` runs lint, the type check, the project's whole declared test command ``;
  README's Smart Quality Gates sentence naming `/ctoc:push` contains `whole declared test suite`.
  And, under rule (f), `qualityAgent.runWholeSuiteBeforePush({ javascript: { lint: 'x', test: null } })`
  returns `passed` false with `text` strictly equal to
  "Tests: no test command was found, so nothing was tested. Pushing without tests is the human's choice: /ctoc:push --skip-tests."
  Red today.
- **P14 (B1, a commit arrives during the checks; red today).** The P1 git fixture; cwd set to
  it; `readHead` and `uncommittedPaths` NOT injected (the real readers); `runWholeSuite` injected
  as a function that runs `execFileSync('git', ['commit', '--allow-empty', '-m', 'arrived during the checks'], { cwd: dir })`
  and returns `{ passed: true, text: 'Tests: passed — `x`: 1 passed.' }`; `pushToRemote` a spy.
  `push.run({ projectRoot: dir }, deps)`: `pushToRemote` 0 calls, `ok` false, `pushed` false,
  `text` contains "a newer commit arrived during the checks and was not tested; not pushing — run /ctoc:push again".
  Red today: `push.js` pushes.
- **P15 (B1, uncommitted changes are named; red today).** The P1 git fixture with
  `src/widget.js` changed and left uncommitted, and `tests/widget.test.js` renamed with
  `git mv` to `tests/w.test.js` (a staged rename, so the `-z` form `R  tests/w.test.js\0tests/widget.test.js`
  is read); real readers;
  passing doubles for the four checks; `push.run({ dryRun: true, projectRoot: dir }, deps)`: `ok`
  true, `text` contains "Note: tested with uncommitted changes that are not pushed:" and names
  both `src/widget.js` and `tests/w.test.js`, and does not contain `tests/widget.test.js` (the old
  path is skipped; neither named path contains it). Red today: no such line.
- **P16 (B1, no commit can be read; red today).** A plain temporary directory with no git
  repository; real readers; passing doubles for the four checks; `push.run({ projectRoot: dir }, deps)`:
  `pushToRemote` 0 calls, `ok` false, `text` contains "the commit could not be read from git".
  In the same directory, `qualityAgent.untestedCommitReason('abc1234', dir)` (a tested commit
  given, the current one unreadable) returns the same text, and
  `qualityAgent.uncommittedTrackedPaths(dir)` deep-equals `[]`. Red today: `push.js` pushes and
  the exports do not exist.

#### `tests/w10-push-entry-point.test.js` — existing cases whose contract this replaces

Written reason for every change below: the owner's order of 2026-10-14 ("improve the push")
replaces the contract "the push takes its test verdict from the selected-tests function"; each
change only tightens toward the new behaviour.

- `makeDeps`: the key `runSmartTests` becomes `runWholeSuite` (and `calls.runWholeSuite`); the
  default passing double returns `{ passed: true, passCount: 3, countKnown: true, commands: ['npm test'], text: 'Tests: passed — `npm test`: 3 passed.' }`
  (no "skipped" in it: cases 9 and 10, lines ~166 and ~175, assert `!/skip/i.test(result.text)`
  and stay unedited); and it injects `readHead: () => 'h1'` and `uncommittedPaths: () => []`
  (rule g).
- Case 2: the override key becomes `runWholeSuite`, returning `{ passed: false, text: 'Tests: failed — `npm test` reported 1 failing test.' }`; adds `assert.match(result.text, /1 failing test/)`.
- Case 3: `calls.runWholeSuite === 1`; adds `assert.match(result.text, /3 passed/)`.
- Case 4 (scenario 8): `calls.runWholeSuite === 0`; adds `assert.match(result.text, /no test ran before this push/)`.
- Case 12 (A2): its title (line ~197) becomes "12. an auto-undetermined test command BLOCKS
  the push (the real whole-suite check, not injected)"; the comment at ~199 says the REAL
  `quality-agent.runWholeSuiteBeforePush` runs (not injected); the comment at ~207 becomes
  `// runWholeSuite intentionally NOT injected → the real check must surface undetermined.`;
  it injects `readHead` and `uncommittedPaths` (rule g), runs with its own cwd (rule f), and adds
  `assert.match(result.text, /not verified/)`. After this, the name `runSmartTests` appears
  nowhere in this file.
- Header comment (lines 7-14): "--skip-tests omits ONLY the test runner" stays; it adds that the
  test check is the whole declared suite.

#### `tests/push-command-coverage.test.js` — existing cases whose contract this replaces

Same written reason.

- `makeDeps` (line 54): `runSmartTests: overrides.runSmartTests || pass` becomes
  `runWholeSuite: overrides.runWholeSuite || passTests`, where `passTests` returns
  `{ passed: true, text: 'Tests: passed — `npm test`: 3 passed.' }` (every caller of
  `push.run` in this file must stop using the old key, or the real check runs with the test's tools);
  and it injects `readHead: () => 'h1'` and `uncommittedPaths: () => []` (rule g).
- `realQA` (line 220) and `patchBoundary` (line 230): `runSmartTests` becomes
  `runWholeSuiteBeforePush`, patched to return the same passing double. Without this, the real check
  sees `detectTools` patched to `{}` tools, answers "no test command", and "exits 0 on a clean pass"
  goes red. `realQA` also snapshots, and `patchBoundary` also patches, `readGitHead` (to
  `() => 'h1'`) and `uncommittedTrackedPaths` (to `() => []`): `main()` reads them from the module,
  and unpatched they would read this repository's commit and dirty tree (rule g).
- "runs the real deps path and exits 0 on a clean pass" adds
  `assert.match(result.text, /3 passed/)`: it proves `main()` reaches the check by its real export
  name.

#### `tests/quality-agent.test.js` — the shared check's own cases, plus one replaced contract

- Case 8 (line 205-227): the injected `runSmartTests: async () => result` is removed; `detect`
  returns `{ languages: ['javascript'], tools: runnerEmitting(UNREADABLE_INSTRUMENT, 0) }` (hard
  rule e), `readHead` and `uncommittedPaths` are injected (rule g), and the REAL default check
  runs the same real runner. Hard rules (b) and (f) apply: the case
  takes `t`, runs with `process.cwd()` set to its own fresh directory under the file's `tmpRoot`
  (saved and restored in `finally`), and replaces `qualityState.getFileHashes` and
  `qualityState.updateFileHashes` with an in-memory cache through `t.mock.method` (the file adds
  `const qualityState = require('../src/lib/quality-state');`). Without this, its red run on
  today's code runs the real `runSmartTests` in this repository: it reads
  `.ctoc/quality-state` and the real push delta, and could reach the throwing `pushToRemote`. With
  it, today's `runSmartTests` finds no git in that directory, runs the full suite over the same
  runner and blocks, so the case is red only on the new `text` assertion. Assertions unchanged
  (`pushed` false, `ok` false, `blockedBy` `['tests']`) plus
  `assert.match(pushResult.text, /not verified/)`. Written reason: the owner's 2026-10-14 order;
  stricter, because the real consumer now runs the real check over the real runner instead of a
  verdict handed to it. The header comment (lines 4-7) names `runWholeSuiteBeforePush`.
- New cases, `runWholeSuiteBeforePush` called directly with `runnerEmitting` fixtures, each with
  `process.cwd()` set to its own fresh directory under `tmpRoot` (rule f; each red today: the
  export does not exist). Q1 a node:test count of 8 → `passed`, `passCount` 8,
  `countKnown` true, text has the command and `8 passed`, the result has no own `output`
  property (`Object.hasOwn(result, 'output')` is false), and the console line captured through
  `t.mock.method(console, 'log', …)` contains "(time limit: 15 minutes per test command)" (B3:
  the 900000 ms default). Q2 `PLAIN_ASSERTION_SCRIPT` → `passed`, `countKnown` false, text has
  "test count unknown (no node:test, jest or mocha pass count in its output)" and no `0 passed`.
  Q3 the node:test, jest and mocha zero forms → `passed` false, text "zero tests ran" (the jest
  form is a parser-shape test only, see P5). Q4 `ℹ tests 2 / ℹ pass 0 / ℹ fail 0 / ℹ skipped 2` →
  blocked, text "zero tests ran" and "2 skipped". Q5 an unanchored zero
  (`ok: 0 passed to the parser`) → `passed` true with the count-unknown wording (slice Decision 2 (parent Decision 22)).
  Q5b (B8) a pytest-style summary `=== 3 passed in 0.12s ===`, exit 0 → `passed` true,
  `countKnown` false, `passCount` 0, text has "test count unknown" and does NOT match
  `/3 passed/`; and `runFullTests` on the same runner still returns `passCount` 3 (as today) with
  `passCountRead` false. Q6 `{ javascript: { lint: 'x', test: null } }` → blocked, the
  no-command text including "Pushing without tests is the human's choice: /ctoc:push --skip-tests."
  Q7 `{ javascript: { test: null, testUndetermined: true } }` → `undetermined`, text "not verified".
  Q8 (A3) two languages, first passes 3, second prints a readable zero → blocked, the text names
  the second command and "zero tests ran", AND contains `` `<first command>`: 3 passed `` in front
  of it. Q9 two languages, one passes 3, one prints no count → `passed`, `passCount` 3,
  `countKnown` false, text holds both parts. Q10 exit 1 with `ℹ fail 2` → text "2 failing tests",
  and `result.output` is a non-empty string (a non-pass keeps the output so a block can show
  why). Q11 exit 1, no count → text "exited with a failure". Q12 `NODE_TEST_LIAR` → text "3 failing
  tests". Q13 exit 1 printing `retry` → text "flaky". Q14 a configured `a && b` → `refused`, text
  "not run". Q15 a sleeping runner with `{ timeout: 300 }` → `undetermined`, text "timed out" and
  "The time limit is 300 ms per test command" (B3). Q16 `UNREADABLE_INSTRUMENT` → text "not
  verified". The two sides of the skipped rule: Q17 `NODE_TEST_SPEC` (0 skipped) → `text`
  strictly equals ``Tests: passed — `${tools.javascript.test}`: 8 passed.`` and does not match
  `/skip/i`; Q18 `NODE_TEST_SKIPPED` (8 passed, 3 skipped) → `passed`, `skipped` 3, `text`
  strictly equals ``Tests: passed — `${tools.javascript.test}`: 8 passed, 3 skipped.``
  Q19 (B11) the recursion guard: a fresh directory `F` set as the cwd; its runner file reads the
  number in `F/depth` (0 when absent) and writes that number plus one, exits 1 printing
  `depth exceeded` when the number it read is 2 or more (so a missing guard cannot recurse
  without bound), and otherwise calls
  `require(<absolute path of src/lib/quality-agent.js>).runWholeSuiteBeforePush(<the same tools>)`,
  appends the inner result's `text` to `F/inner.txt`, and prints `ℹ tests 1 / ℹ pass 1 / ℹ fail 0`.
  The outer `runWholeSuiteBeforePush(tools)` → `passed`, text `1 passed`; the depth file reads
  `1`; `inner.txt` matches `/Tests: not run — a whole-suite run is already in progress for this project\./`.
  Q20 (B4) `{ javascript: { test: <runner passing 3>, testFromOverride: true } }` → text contains
  "(test command set in .ctoc/quality-config.yaml, not by the project's own files)". Q21 (B13)
  `{ javascript: <runner passing 3>, python: { lint: 'x', test: null } }` → `passed`, text
  contains "not tested: python (no test command)".
- New case, `runFullTests` additive field and option: `NODE_TEST_SPEC` → `passCountRead` true;
  `PLAIN_ASSERTION_SCRIPT` → false; the unanchored zero → false; the pytest-style `3 passed` line
  → false with `passCount` 3; `{ javascript: { test: null } }` (no command runs) →
  `passCountRead` false; and `passed` is `true` for all five, as today. Then,
  with `console.log` captured through `t.mock.method`, `PLAIN_ASSERTION_SCRIPT` with
  `{ omitTotalLine: true }` prints no line matching `/Tests passed \(/`, and the same call without
  the option prints `Tests passed (0 total)` (today's line, kept for the hotfix check and the
  after-commit check); `passed`, `passCount` and `passCountRead` are equal between the two calls.
  Written as a new case so no existing assertion is edited (scenario 12).

#### `tests/tool-detector-defects.test.js` — the override flag (B4)

- New `it` in the "user quality-config overrides are applied honestly (Finding 8)" describe
  (line ~215), no existing case edited: the Finding 8 fixture (`package.json` `{}` plus a
  `languages.javascript.test: my-runner --all` override) → `res.tools.javascript.testFromOverride`
  is `true`; a fixture whose `package.json` declares `scripts.test` and has no
  `.ctoc/quality-config.yaml` → `testFromOverride` is `undefined` and `testFromScript` is `true`.
  Red today: the flag does not exist.

#### `tests/remainder-hooks-commands-coverage.test.js` — one comment, no assertion change

- The comment at lines 505-506 says the fault fires at "the FIRST thing run() does (tool
  detection)"; after this slice `run()` first reads the commit (`readGitHead`). Line 505 becomes
  `    // The fault fires before any check runs, so no lint,` and line 506 is unchanged. No
  assertion changes, and the case still holds: in its temporary directory, which is not a git
  repository, `readGitHead` returns `null` without throwing; detection then throws, so the run
  still exits 1 and prints "push error:". Not part of the Step 8 red run (a comment only).

Coverage: Q1-Q21, Q5b, the additive-field case, the tool-detector case and P1-P16 reach every new
branch (the recursion guard, no command, detector undetermined, run undetermined with and
without a time-out, refused, flaky, failure with and without a readable count, readable zero,
unknown count, two commands with a block after a pass, skipped above and at zero, a language
with no command beside one with a command, the override note, `omitTotalLine` on and off,
`passCountRead` with no command run, `env` given and not, the commit moved, the commit
unreadable, a dirty and a clean tree). The coverage floor in `.ctoc/coverage-baseline.json` is
not touched.

### Security review

- [x] The check runs test commands only through the existing `runProjectTestCommand` (argv,
      `shell: false`, a configured shell operator refused). The only new process starts are two
      read-only git commands with fixed arguments (`rev-parse HEAD`,
      `status --porcelain -z --untracked-files=no`) through `execFileSync` with an argument list, no
      shell, a 10-second limit and `windowsHide`; the only input reaching them is `cwd`, the
      push's own project root.
- [x] The added environment variable is a fixed name whose value is `path.resolve(process.cwd())`;
      it is merged over the process's environment, never replacing it, and carries no secret.
- [x] No path is built from input; the shown command is display text, never executed or joined.
- [x] The informational dirty-tree line names repository paths only, never file contents, at
      most five of them.
- [x] The output names the command and counts only; it never prints test output, so a secret in a
      test's output is not copied into `text`.
- [x] No secret in code or fixtures; fixtures live under `os.tmpdir()`.
- [x] Tests never push (`pushToRemote` injected), never scan for real, and never write this
      repository's quality state (in-memory hash cache, Rule b).
- [x] Cross-platform: fixtures use `path.join`, `process.execPath`, `os.tmpdir()`; npm starts
      through the existing `npmLauncher` on Windows.

## Wiring — the live call sites

- `runWholeSuiteBeforePush` (new export) ← `run()` in `src/commands/push.js` (its default
  `runWholeSuite` dep) ← `main()` in the same file ← `node "${CLAUDE_PLUGIN_ROOT}/src/commands/push.js"`
  in `src/commands/push.md`, the shipped `/ctoc:push` slash command (a root of the file fence).
  Reachable by a human the moment `/ctoc:push` runs; the export fence sees the cross-module use in
  `push.js`.
- `readGitHead`, `untestedCommitReason` and `uncommittedTrackedPaths` (new exports) ← `run()` in
  `src/commands/push.js` (the `readHead` and `uncommittedPaths` dep defaults and the guard before
  the dry-run branch) ← the same `main()` and `/ctoc:push` chain. Slice 2 adds
  `maybePushOnSuccess` as a second caller of `untestedCommitReason`.
- `testFromOverride` (new field) ← set by `detectTools()` in `src/lib/tool-detector.js`, which
  `push.js` calls through its `detect` dep default ← the same chain; read by
  `runWholeSuiteBeforePush`.
- `runCommandArgv`'s `env` option ← `runFullTests`' `limits` ← `runWholeSuiteBeforePush` ← the
  same chain.
- `readPassCount` (new, internal) ← `parsePassCount` and `readRunnerCounters` in the same file.
- `runSmartTests` and `runSpecificTests` stay live for the after-commit check: git runs the
  installed `.git/hooks/post-commit`, which runs `src/hooks/post-commit.js` (a declared root,
  `.ctoc/reachability-roots.json` line 9, reason line 16); `startAgent()` spawns
  `node src/lib/quality-agent.js`, whose `main()` calls `runTieredChecks`, which calls
  `runSmartTests`, which calls `runSpecificTests`. Confirmed by reading those call sites. Honest
  limit: the file fence does not see the spawn edge (the literal `'quality-agent.js'` has no path
  separator, `src/lib/reachability.js` 243-253); `quality-agent.js` is live through `push.js`'s
  `require`, and the export fence credits both functions only by its same-file rule (definition
  plus at least one call, `src/lib/reachability.js` 522-530), which holds after this slice because
  `runTieredChecks` still calls `runSmartTests`. Step 9 and Step 14 run the fences to re-confirm.

## Decisions Taken Under Ambiguity

1. **One `runFullTests` call per distinct command**, inside the new function, rather than one call
   with a new per-command array on `runFullTests`' result. The function then always knows which
   command a result belongs to, and `runFullTests` gains a single additive boolean.
2. **A count — zero or not — counts as read only from an anchored runner summary** (node:test,
   jest, mocha; widened from "a zero" by slice Decision 15 (parent Decision 22)). The unanchored `N passed|passing` fallback
   can read a number out of a test's name; reading a zero there would block a push on a false
   red, and reading another number there would report a count nobody measured. Cost: a runner
   that prints its count only in an unanchored form passes, with the "test count unknown" wording.
3. **The command shown** is `npm test` for a command taken from the `package.json` script (the
   program actually started), and the configured string otherwise.
4. **The failing count in the text** is read from the failing run's output with `parseFailCount`.
   On a non-zero exit `runFullTests`' `failed` counts commands, not tests, so it is not shown as a
   test count; when no count can be read the text says the command exited with a failure.
5. **The seam key is `runWholeSuite`.** Written reason for renaming it in the tests: the owner's
   2026-10-14 order replaces the contract the old key encoded.
6. **Scenario 10's short time limit** is set by injecting the real check with `{ timeout }`; no new
   option on `push.run`.
7. **`runFullTests` gains one option, `omitTotalLine`, that skips only its closing
   `Tests passed (N total)` console line.** `runWholeSuiteBeforePush` passes it, so a zero or
   no-count run never prints "(0 total)" right before the push says zero tests ran or that the
   test count is unknown (the parent's "never say 0 tests ran"). The hotfix check and
   `runSmartTests` do not pass it, so their console output and every verdict stay as today. Not
   chosen: keeping the line (it contradicts the push's own wording on the same screen), or
   removing it for every caller (it would change the hotfix check's and the after-commit check's
   console).
8. **`tests/quality-agent.test.js` case 8** now runs the real check over the same real runner
   instead of injecting a verdict: stricter, and it needs no seam inside the check.
9. **`README.md` line 889 is corrected in this slice**: the slice makes "runs the same checks"
   false, and the corrected line is pinned by test P13.
10. **An in-memory hash cache in every push test** (Rule b): today's code writes the hash cache
    through a directory cached for the whole process; a red run must never touch this repository's
    `.ctoc/quality-state/`.
11. **The real dry run** on this repository is the last item of Step 16, run in the foreground with
    a 10-minute limit, never from inside the suite.
12. **The shared check's passing result carries no `output`**; a non-pass keeps it. A passing
    run's output can be up to 10 MiB, it is never shown on a pass, and slice 2 persists the test
    result to `.ctoc/quality-state/status.json`.
13. Critic round 1 (2026-10-15): findings 1, 2, 3, 5, 6, 7, 8 applied.
14. CTO Chief, 2026-10-15: the no-count wording is "test count unknown (no node:test, jest or mocha pass count in its output)", true both for a runner that printed no count and for one whose count only the unanchored fallback could read (replaces "the runner reported no test count").
15. CTO Chief, 2026-10-15 (B8): `passCountRead` is `read.anchored` only; a count read only by the unanchored fallback is "count unknown" and adds nothing to the reported total; `parsePassCount`'s return is unchanged for every input.
16. CTO Chief, 2026-10-15 (B8): the jest zero string in P5 and Q3 is not observed output (believed never printed by jest); it stays only as a parser-shape test.
17. CTO Chief, 2026-10-15 (B1): the HEAD is read before the checks and compared (prefix match) right before the push; a moved or unreadable HEAD stops the push; implemented once in `untestedCommitReason`, beside the unchanged `pushToRemote`, because every push test injects `pushToRemote`.
18. CTO Chief, 2026-10-15 (B1): the push stays a bare `git push` (no explicit refspec); `push.default=matching` is stated as a limit in `push.md` and the parent.
19. CTO Chief, 2026-10-15 (B1): uncommitted tracked paths are named in the output as tested and not pushed, at most five, and never block.
20. CTO Chief, 2026-10-15 (B2): `push.md` says `--skip-tests` is passed only on the human's own request, and the no-command text names it as the human's choice; both pinned in P13.
21. CTO Chief, 2026-10-15 (B3): each test command runs with a 900000 ms (15-minute) limit, no new setting; the first line and the timed-out text name it; `push.md` says 10-minute Bash limit, or background and wait.
22. CTO Chief, 2026-10-15 (B4): the detector marks an override test command `testFromOverride: true`; the text names it as set in `.ctoc/quality-config.yaml`; no block.
23. CTO Chief, 2026-10-15 (B5): "whole suite" means the declared command; a subset or a focused test passes with a real count; stated as a limit, no focus guard here.
24. CTO Chief, 2026-10-15 (B11): a whole-suite run refuses when `CTOC_WHOLE_SUITE_ROOT` already names the same project root; passed through one additive `env` option on `runCommandArgv` and `runFullTests`.
25. CTO Chief, 2026-10-15 (B13): a passing text names each detected language with no test command as "not tested".
26. CTO Chief, 2026-10-15 (A2): Step 11's check is narrowed to the injection key (no `runSmartTests:` in a `push.run` deps object or `patchBoundary`); case 12's title and both comments renamed.
27. CTO Chief, 2026-10-15 (A3): a block on a later command keeps the earlier commands' parts in front of its text; Q8 asserts it.
28. CTO Chief, 2026-10-15 (A4): `runFullTests` and `runWholeSuiteBeforePush` carry an explicit `@returns` type; the type check stays at zero errors.
29. CTO Chief, 2026-10-15 (B14): Step 11's reviewer runs the false-green test checks on the test files this slice changes.
30. CTO Chief, 2026-10-15 (after round 3): Step 9 lists all six fields `src/lib/hotfix-check.js` reads from `runFullTests`' result (`passed`, `output`, `skipped`, `passCount`, `undetermined`, `refused`); behaviour unaffected.
31. CTO Chief, 2026-10-15 (after round 3): `push.md`'s limits paragraph says a commit made during the checks (the menu's plan-sync timer, or a background bookkeeping commit) stops the push, and to run it again once nothing is committing; Step 16 records whether the menu was open.
32. CTO Chief, 2026-10-15 (after round 3): `tests/remainder-hooks-commands-coverage.test.js` joins the files for one comment change at 505-506 ("before any check runs"); no assertion changes.
33. CTO Chief, 2026-10-15 (after round 3): a slice decision that has a parent counterpart is cited as "slice Decision N (parent Decision M)" (14 and 22, 2 and 22, 15 and 22, 19 and 20, 18 and 19).
34. CTO Chief, 2026-10-15 (after round 3): `uncommittedTrackedPaths` reads `git status --porcelain -z --untracked-files=no` (argv), split on NUL and never trimmed, so names are never shown quoted; a rename or copy (`new\0old`) gives the new path and skips the old; P15 also asserts the old path is absent.

35. Executor (2026-10-15, Phase A): `src/lib/tool-detector.js` also gained `testFromOverride?: boolean` in the JSDoc type of the `tools` variable it is set on (line ~518). The type check (`tsc --checkJs`) reports TS2339 without it, and the baseline stays 0 (A4). No behaviour; declared file, no new file.
36. Executor: one small internal helper, `readGit(args, cwd)`, in `quality-agent.js` runs the two read-only git commands (argv, no shell, 10-second limit, `windowsHide`, and a 10 MiB `maxBuffer` so a very dirty tree does not throw into an empty list); `readGitHead` and `uncommittedTrackedPaths` call it instead of repeating the same `execFileSync` options. Not exported; same behaviour as the slice describes.
37. Executor: the limit text writes "1 minute" for 60000 ms (singular) and "N minutes" otherwise; the default 900000 ms still reads "15 minutes" as Q1 and the first line require.
38. Executor: the worktree had no `node_modules`, so `tests/typecheck.test.js` (which needs `node_modules/typescript`) could not run; `npm ci` was run once from the committed lockfile (110 packages, 0 vulnerabilities). `node_modules` is gitignored.
39. Executor: the Step 8 red run revealed a side effect the slice's hard rule (b) already warns about, now for the existing `makeDeps` cases: with `push.js` still reading `runSmartTests` and the tests injecting `runWholeSuite`, cases 2, 3 and the `main()` "real deps path" case fell through to the REAL `runSmartTests` from the worktree root (about 14 s each) and wrote `.ctoc/quality-state/file-hashes.json` (about 986 KB). That directory did not exist before the run (it was absent from the `.ctoc` listing taken just before); it is gitignored worktree-local state and held only that file. It was removed with `rm -rf .ctoc/quality-state` right after the run. The four test files were not re-run against unchanged source. After the change those cases inject `runWholeSuite` and nothing writes the directory (checked: absent after every green run).

40. CTO Chief, 2026-10-15 (Step 11/13 synthesis, change 1): the push reads the dirty tree BEFORE it checks the commit, so the commit check is the last step before `pushToRemote` (a commit made while the tree is read is caught, test P17). `uncommittedTrackedPaths` returns `null` when git cannot list the changes (`''` is a clean tree and stays `[]`); the push then says "Note: git could not list uncommitted changes, so whether the tested tree is what gets pushed is unknown." and goes on (a note, never a block).
41. CTO Chief, 2026-10-15 (synthesis, change 2): inside `runWholeSuiteBeforePush` only, an internal helper `readSuiteSummary` (next to `readPassCount`; `parseSkippedCount`, `readRunnerCounters`, `readPassCount` and `runFullTests` untouched, the hotfix check reads them) reads the skipped count from a runner summary line only (node `skipped` plus `todo`, else jest's `Tests:` line, else mocha `pending`, else 0) and whether the last jest `Tests:` line has a total and no pass. The push counts a run as zero tests when the anchored pass count is 0, or, with no anchored pass count, when that jest line shows a total and no pass (an all-skipped or todo-only jest run); the zero result carries `passCount: 0`, `countKnown: true` and the anchored skipped count, which is also the count shown and summed on a pass. The jest shape is believed, not observed (jest is not installed here).
42. CTO Chief, 2026-10-15 (synthesis, change 3): P15 now also pins `uncommittedTrackedPaths(dir)` to exactly `['src/widget.js', 'tests/w.test.js']`. The old text-only check could not fail: with the rename skip lost the old path is read as a record and cut at three characters (`ts/widget.test.js`), which does not contain `tests/widget.test.js`. Proven: with the rename-skip `i++` deleted, P15 failed with `+ 'ts/widget.test.js'` extra in the list; restored.
43. CTO Chief, 2026-10-15 (synthesis, change 4): the not-verified text names the command (`Tests: not verified (`cmd`) — <reason>`); a readable failing count is said ("reported N failing tests") before the flaky guess, and the flaky wording is "exited with a failure and its output mentions a flaky or retried test (zero tolerance)". `push.md` now promises exactly what the code does ("names each test command that ran and says how many tests passed, that the test count is unknown, or why the push was blocked"). `undeterminedRunResult` and `unreadableTestsResult` are untouched.
44. CTO Chief, 2026-10-15 (synthesis, additions 5, 6): everything shown from outside the run is made safe for display: `escapeForDisplay` (exported; code points 0-31, 127-159, U+2028 and U+2029 become `\x0a` style escapes, or a backslash, u and four hex digits for the two separators) is applied to every uncommitted path printed and to the configured command; the configured command is first masked (`scheme://user:pass@` becomes `scheme://***@`; the value of a `NAME=value` token whose name holds token, secret, pass, key, auth or cred, case-insensitive, becomes `NAME=***`), in the text and in `commands`. The command that runs is untouched. `push.md` states both. Departure from the brief: the escape helper is exported (not internal) because `push.js` calls it for the paths; the masking helper `displayCommand` stays internal.
49. Executor (phase B, found on the advisor's review of the diff): a refused command's text (`runConfiguredCommand`, `error: ... REFUSED (...): ${shown}.`, read at `quality-agent.js` 389-398) echoes the whole configured command, and a start failure can name it, so `blockedText` also passes the refusal and not-verified reasons through `displayCommand`; `undeterminedRunResult`, `refusedTestsResult` and the run's own `output` are untouched. Q27 (a refused `run-tests https://deploy:...@example.com API_TOKEN=... <ESC> && echo done`) was run red first (it printed the password, the token value and the raw escape byte) and is green after.
45. CTO Chief, 2026-10-15 (synthesis, addition 7): `git --no-optional-locks status --porcelain -z --untracked-files=no`, so the read never takes git's index lock. Test P19 reads git's own trace file (`GIT_TRACE2`) for the full argv, because `execFileSync` is destructured in the module and cannot be spied on.
46. CTO Chief, 2026-10-15 (synthesis, addition 8): when git cannot read the commit, the refusal text ends with "(git said: <first line of git's error, escaped>)", from an internal `noHeadText` that runs `git rev-parse HEAD` once more on the refusal path only.
47. Executor (phase B): the `push.md` sentence of change 4 was edited before P13's pin for it was run, so that pin was green on its first run (it can fail: the sentence is absent from the committed file). Every other new or tightened case was run red first (12 red cases, listed in the Execution Record).
48. Executor (phase B): the Edit tool turns a lone backslash-u-2028 escape in an edit into the raw character; the two test lines and one source comment that got it were rewritten (a constant built with `String.fromCharCode(0x2028)` in the tests; the regex uses `\p{Cc}\p{Zl}\p{Zp}`), so no invisible character is left in a source line.
50. Executor (kickback from the final review by `iron-loop-critic`, 2026-10-15): two `push.md` sentences said more than the code does and were corrected, pinned in P13 (run red against the old text, then green). (a) "an npm script that chains two runners (only the last summary is read), the output says the count is unknown" was false: `readPassCount` tries the node:test pattern first and takes the last match, so `node --test a && node --test b` shows b's count and a node-then-jest chain shows the node count. New: "Only one summary is read (the last node:test one, else jest, else mocha), so for an npm script that chains runners the count shown can be one runner's alone." The list "cargo, go, pytest, vitest" stays (an existing P13 pin; now "and the like"). (b) "Uncommitted changes are tested but not pushed" ignored that git is read with `--untracked-files=no`: now "Uncommitted changes to tracked files are tested but not pushed; the output names them (new untracked files are not named)". Also comment only: the `env` paragraph of `runCommandArgv`'s doc comment moved into the `options` description.
51. Fake credentials in the masking tests are assembled at run time so no credential-shaped literal is committed (CTO Chief, 2026-10-15).
52. The dry run's exit 1 does not block this slice's completion: the test check it exists to prove passed (13184 passed, named command, override source shown), and the three failing checks are unchanged by this slice and caused by the environment and configuration recorded in the Execution Record; their fixes are outside the owner's order for this slice and are listed for him (CTO Chief, 2026-10-15).

## Findings for the owner to schedule (not built here)

- Uncommitted tracked changes are tested but not pushed: an uncommitted fix can make the suite
  pass while the pushed commit fails. The output now names those paths (slice Decision 19 (parent Decision 20)); it does
  not block, because CTOC rewrites its own tracked state files.
- No guard against a focused test (`it.only` and the like) or a declared command that runs a
  subset (B5).
- An anchored, summed `cargo test` reader (one count per test binary, added up) would let the
  push read cargo's count and zero; it changes parsers the hotfix check shares, so it is not
  built here (B8).
- With `push.default=matching`, the bare `git push` pushes other matching branches, untested
  (slice Decision 18 (parent Decision 19)).

## Execution Plan

### Step 8: TEST
- [x] Write P1-P7, P9, P10 and P13-P16 in `tests/w10-push-entry-point.test.js`, Q1-Q21, Q5b and the `passCountRead`/`omitTotalLine` case in `tests/quality-agent.test.js`, the override-flag case in `tests/tool-detector-defects.test.js`, and the changed cases in all three push files exactly as listed under "existing cases whose contract this replaces" (case 8 of `tests/quality-agent.test.js` with its own cwd and in-memory hash cache); follow the hard rules (fixtures under `os.tmpdir()`, own cwd for every real whole-suite call, in-memory hash cache, injected push and scans, injected git readers except P14-P16, `detect` in the detector's shape).
- [x] Run `node --test tests/w10-push-entry-point.test.js tests/push-command-coverage.test.js tests/quality-agent.test.js tests/tool-detector-defects.test.js`; record which cases are red and why (each new case must be red for the stated reason; a case green on today's code is rewritten until it is red).

### Step 9: PREPARE
- [x] Re-read `src/lib/quality-agent.js` 170-275, 364-426, 488-530, 555-760, 1019-1209 and 2008-2029, `src/lib/tool-detector.js` 590-610 and `src/commands/push.js`; confirm the line anchors above still hold.
- [x] Run `node --test tests/export-reachability.test.js tests/reachability.test.js` and record the dead-export count (65 in `.ctoc/export-reachability-baseline.json`) and the unreachable-file count before the change.
- [x] Confirm by reading that `src/lib/hotfix-check.js` 1861-1884 reads only `passed`, `output`, `skipped`, `passCount`, `undetermined` and `refused` from `runFullTests`' result (the last two at 1883); none of the six changes, and it reads neither `passCountRead` nor the new options, so its behaviour is unaffected.

### Step 10: IMPLEMENT
- [x] `src/lib/quality-agent.js`: `readPassCount`, `parsePassCount` delegating, `readRunnerCounters` and `runCounters` with `passCountRead` (`read.anchored` only), `runFullTests`' additive `passCountRead` (`ran > 0 && countsRead`), its `omitTotalLine` and `env` options and its explicit `@returns`, `runCommandArgv`'s `env` option (merged over `process.env`) and the four options JSDoc types, `WHOLE_SUITE_TIMEOUT_MS` and `WHOLE_SUITE_ENV`, `runWholeSuiteBeforePush` with the recursion guard, the limit line, `blockedText`, the override note, the earlier parts kept before a block, the unknown count adding nothing, the "not tested" parts and its explicit `@returns` (passing `omitTotalLine: true`; a passing result without `output`; `, M skipped` only when M > 0), `HEAD_MOVED_TEXT`, `NO_HEAD_TEXT`, `readGitHead`, `untestedCommitReason`, `uncommittedTrackedPaths`, the exports, the header comment, JSDoc on every changed function.
- [x] `src/commands/push.js`: the `runWholeSuite`, `readHead` and `uncommittedPaths` deps, the HEAD read before the checks, the test block saying the check's text or the `--skip-tests` line, the moved-commit guard before the dry-run branch, the dirty-tree line, header and JSDoc.
- [x] `src/lib/tool-detector.js`: `tools.testFromOverride = true` in the test-override branch, with its comment.
- [x] `src/commands/push.md`: the time-limit and `--skip-tests` paragraphs, the `--skip-tests` row, the diagram line, the paragraph under the diagram, the limits paragraph, the quick-push example, the sentence at line 241.
- [x] `README.md`: the one sentence at line 889.
- [x] `tests/remainder-hooks-commands-coverage.test.js`: the comment at 505-506 only ("the FIRST thing run() does (tool detection)" becomes "before any check runs"); no assertion change.
- [x] Run the four test files and `tests/remainder-hooks-commands-coverage.test.js` green.

### Step 11: REVIEW
- [x] (run by independent agents before phase B; their findings applied as Decisions 40-49) Dispatch `iron-loop-critic`: `runFullTests`' `passed` and every existing field unchanged for every input; `omitTotalLine` suppresses only the closing console line, is passed only by `runWholeSuiteBeforePush`, and never reaches `runProjectTestCommand`; `env` is merged over `process.env` and absent everywhere else; `parsePassCount`'s return unchanged for every input; each distinct command judged on its own; no number read only by the unanchored fallback appears in a text; no path in `push.js` can push after a zero-test, no-command, undetermined, refused, flaky or failing run, or after the commit moved or could not be read; `wholeTree` never set on `/ctoc:push`; no `push.run` deps object and no `patchBoundary` in the three push test files carries a `runSmartTests:` key, and case 12's title and comments name the whole-suite check; every real whole-suite call in the tests runs with its own cwd; `push.md` and `README.md` say what the code does.
- [x] (the reviewer's check, run before phase B) The reviewer runs the false-green test checks (an assertion that cannot fail, a mocked-away core, an early return without an assertion, a swallowed error, a skipped case) on the four test files whose cases this slice changes (B14); the fifth, `tests/remainder-hooks-commands-coverage.test.js`, changes one comment only.

### Step 12: OPTIMIZE
- [x] Each distinct command runs exactly once per push; `readPassCount` is called once per counter read; no duplicated regex; the new function holds no state between calls; `readGitHead` runs once before the checks and once more only after they pass; `uncommittedTrackedPaths` runs once, only after they pass.

### Step 13: SECURE
- [x] (run by an independent agent before phase B; its one high finding applied as Decision 40, with Decisions 44-46) Dispatch `security-scanner` on the diff: no shell; the only new process starts are the two read-only git commands (argv, fixed arguments, 10-second limit); the environment is merged, never replaced, and carries no secret; the shown command is never executed; no test output copied into `text`; tests never push, never scan for real, never write this repository's quality state.

### Step 14: VERIFY
- [x] `npm test` in the foreground with a 10-minute limit: `# fail 0`, 0 skipped, 0 flaky, coverage at or above `.ctoc/coverage-baseline.json` `minPct` (unchanged).
- [x] `npm test` once more with `CTOC_WHOLE_SUITE_ROOT` set to this repository's absolute root in its environment (what `/ctoc:push` passes): `# fail 0`, so no test calls the real check from the repository root (rule f).
- [x] Lint clean with zero warnings; `npm run typecheck` reports zero type errors — `.ctoc/typecheck-baseline.json` `maxErrors` stays 0 and may not rise (A4).
- [x] `tests/export-reachability.test.js` and `tests/reachability.test.js` green; dead-export count not above the Step 9 number (each of the four new exports has a live caller in `push.js`); `runSmartTests` and `runSpecificTests` not reported dead.
- [x] `tests/hotfix-check.test.js`, `tests/quality-fleet-wiring.test.js` and the existing `runFullTests` cases green with their assertions unedited (scenario 12).

### Step 15: DOCUMENT
- [x] JSDoc on `readPassCount`, `readRunnerCounters`, `runCounters`, `runCommandArgv` (the `env` option), `runFullTests` (the `passCountRead` field, the `omitTotalLine` and `env` options, the explicit `@returns`), `runWholeSuiteBeforePush`, `blockedText`, `readGitHead`, `untestedCommitReason`, `uncommittedTrackedPaths` and `push.run`; the comment on `testFromOverride` in `tool-detector.js`; the module header comments of `quality-agent.js` and `push.js` match the code.
- [x] Record in this plan that the change reaches users only once the installed plugin version contains it; it is not reported as "the push now does this" before then.

### Step 16: FINAL-REVIEW
- [x] Run `node src/commands/push.js --dry-run` once on this repository in the foreground with a 10-minute limit; record in this plan the wall-clock time, the exact tests line it printed (command and count), its exit code, and whether the menu (`/ctoc:start`) was open in a terminal during the run (its plan-sync timer can commit and stop the push).
- [x] Dispatch `iron-loop-critic` against the Acceptance Criteria above; every box ticked only on recorded evidence. (2026-10-15: iron-loop-critic final review — all 21 built criteria met by tests that can fail; two push.md sentences corrected (Decision 50); dry run pending, run by the main session)


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
- [x] Self-review all new code (independent review agents, then the synthesis applied in phase B)
- [x] Verify integration points work together
- [x] Check error handling completeness

### Step 12: OPTIMIZE
- [x] Remove redundant operations
- [x] Optimize critical paths
- [x] Simplify complex code

### Step 13: SECURE
- [x] Validate inputs (no path traversal)
- [x] Sanitize outputs (paths and the configured command are escaped, secrets masked)
- [x] No secrets in code
- [x] Safe file operations

### Step 14: VERIFY
- [x] Run lint + type check
- [x] Run ALL tests (TDD Green)
- [x] Check coverage >= 80% (99.87%, floor 99)
- [x] 0 skipped, 0 flaky tests (one unrelated timing failure on one run, see the Execution Record)

### Step 15: DOCUMENT
- [x] Update relevant documentation
- [x] Add JSDoc comments to new functions
- [x] Update CHANGELOG if needed (not edited: it is not among this slice's files; the release step owns it)

### Step 16: FINAL-REVIEW
- [x] Verify steps 8-15 completed correctly
- [x] All quality checks passed
- [x] Manual verification if needed (the real `push.js --dry-run` on this repository: the main session ran it, see the Execution Record)
- [x] Ready for human review


## Execution Record

- Fake credentials in the masking tests (Q26, Q27 in `tests/quality-agent.test.js`) are assembled at run time so no credential-shaped literal is committed (CTO Chief, 2026-10-15).

### Phase A (Steps 8, 9, 10, 12) — iron-loop-executor, 2026-10-15

**Step 8 (red).** Tests were written before any `src/` edit and run: `node --test tests/w10-push-entry-point.test.js tests/push-command-coverage.test.js tests/quality-agent.test.js tests/tool-detector-defects.test.js` gave 89 tests, 46 pass, 43 fail. The 43 red cases and the reason each fails on the unchanged code:
- `tests/quality-agent.test.js`: Q1-Q21 and Q5b (22 cases): `qualityAgent.runWholeSuiteBeforePush is not a function`; the `runFullTests` additive-field case: `passCountRead` is `undefined` (expected `true`); case 8: the real default push consumer blocks but its text is "Quality checks failed (Tier 1): tests. Not pushing." with no "not verified".
- `tests/tool-detector-defects.test.js`: the override-flag case: `testFromOverride` is `undefined`.
- `tests/w10-push-entry-point.test.js`: cases 2, 3, 4 and 12 (changed contract): the injected `runWholeSuite` is ignored because `push.js` reads `runSmartTests` (case 2 pushes though the injected check failed; case 3 counted 0 calls instead of 1; case 4 text is "Pushed to remote." with no "no test ran before this push"; case 12 text lacks "not verified"). P1: runner never ran (`[]`, the `runSmartTests` path ran instead). P2: counter has 1 line, not 2 (second push answered from the hash cache). P3: blocked, but the text has no "1 failing test". P4: `ok` true (today's check passes a project with no test command). P5: pushes on a readable zero (all three forms). P6, P7, P9: the text has no count/command ("Would push ..." only). P10: the push ignores the injected seam and pushes. P13: the docs still say "tests (47 affected)". P14: pushed after a commit arrived. P15: no "Note: tested with uncommitted changes" line. P16: pushed with no readable commit.
- `tests/push-command-coverage.test.js`: "runs the real deps path and exits 0 on a clean pass": text is "Pushed to remote." with no "3 passed" (real `runSmartTests` ran, see Decision 39).
- Green on today's code, as intended (guards): every other existing case in the four files.
- `tests/remainder-hooks-commands-coverage.test.js` is a comment change only (Step 10); it was not part of the red run.

**Step 9.** Baseline on the unchanged source: `tests/hotfix-check.test.js`, `tests/quality-fleet-wiring.test.js`, `tests/remainder-hooks-commands-coverage.test.js`, `tests/test-selection-scope.test.js`, `tests/quality-agent-coverage-holes.test.js`, `tests/no-phantom-command-family.test.js`: 208 tests, 208 pass. `tests/export-reachability.test.js` + `tests/reachability.test.js`: 47 tests, 0 fail; dead-export `maxDead` is 65 and `maxUnreachable` is 17 in the baselines (unchanged by this slice). Line anchors in `quality-agent.js` (170-275, 364-426, 488-530, 555-760, 1019-1209, 2008-2029), `tool-detector.js` (590-610) and `push.js` re-read: all held. `src/lib/hotfix-check.js` 1861-1884 reads only `passed`, `output`, `skipped`, `passCount`, `undetermined` and `refused` from `runFullTests`' result: confirmed. Test files that start `push.js` or call `push.run`/`push.main` were searched in `tests/`: `remainder-hooks-commands-coverage.test.js` (a child process in a non-git temp dir with the detector faulted; `readGitHead` returns null without throwing, detection then throws, still exit 1 and "push error:") and `quality-fleet-wiring.test.js` (`projectRoot` of its own git fixture, blocked by security before the commit guard): neither needed an edit.

**Step 10.** Implemented as the slice specifies, in the declared files only: `quality-agent.js` (`readPassCount`, `parsePassCount` delegating, `passCountRead` in `readRunnerCounters`/`runCounters` and `runFullTests`, `omitTotalLine` and `env` options, `env` on `runCommandArgv` and the four option types, `WHOLE_SUITE_TIMEOUT_MS`, `WHOLE_SUITE_ENV`, `blockedText`, `runWholeSuiteBeforePush`, `HEAD_MOVED_TEXT`, `NO_HEAD_TEXT`, `readGitHead`, `untestedCommitReason`, `uncommittedTrackedPaths`, exports, header), `push.js` (deps `runWholeSuite`, `readHead`, `uncommittedPaths`; HEAD read first; test block; moved-commit guard before the dry-run branch; dirty-tree note; header and JSDoc), `tool-detector.js` (`testFromOverride`), `push.md`, `README.md` line 889, and the comment at `tests/remainder-hooks-commands-coverage.test.js` 505. Wiring: `push.js` calls all four new `quality-agent.js` exports; `push.js` is reached by `main()` and `/ctoc:push`.

**Step 12.** Reviewed for redundancy: each distinct command runs once; `readPassCount` is read once per counter read; `runWholeSuiteBeforePush` holds no state; `readGitHead` runs once before the checks and once after they pass (inside `untestedCommitReason`); `uncommittedTrackedPaths` runs once, after they pass. The only simplification made: the two git readers share the private `readGit` helper (Decision 36); a redundant `readHead: undefined` pair in test P14 was removed.

**Green after Step 12.** Test files: w10-push-entry-point, push-command-coverage, quality-agent, tool-detector-defects, remainder-hooks-commands-coverage, hotfix-check, quality-fleet-wiring, test-selection-scope, quality-agent-coverage-holes, no-phantom-command-family, export-reachability, reachability, ship-gate-real, tool-detector: 371 tests, 371 pass, 0 fail, 0 skipped. The three push test files plus `quality-agent.test.js` also pass (70 of 70) with `CTOC_WHOLE_SUITE_ROOT` set to the repository root (rule f). `npm run lint`: clean, zero warnings. `npm run typecheck`: 1 pass, 0 errors (after Decision 35). The full `npm test` and the other Step 14 checks have not been run yet.


### Phase B (the review synthesis, Steps 14, 15, 16) — iron-loop-executor, 2026-10-15

Every edit was made with the Edit tool; no source or test was written through a script.

**Red first (12 red cases of 67 in `tests/w10-push-entry-point.test.js` and `tests/quality-agent.test.js`, then Q27 red on its own).** Q15 and Q16 (tightened to start with "Tests: not verified (`<cmd>`) — "): the old text had no command. Q22: `parseSkippedCount` took "5 skipped" from a test title. Q23: an all-skipped or todo-only jest run printed no pass count and passed as "count unknown". Q24: the flaky guess outranked a readable "fail 2". Q25, Q26: the command was shown raw (control characters, URL password, `API_TOKEN` value). P16: `uncommittedTrackedPaths` returned `[]` where git could not look (no null, no note). P17: the commit check ran before the tree was read, so a commit made during the read was not caught. P18: raw control characters in a path. P19: the argv had no `--no-optional-locks` (git's own `GIT_TRACE2` start line). P20: no "(git said: ...)". Q27 (found on the review of the diff, Decision 49): a refusal echoed the password, the token value and the raw escape byte. Green guards, unchanged: P16b (a clean tree is `[]`), Q13 (still "flaky"), JEST_OUTPUT (8 passed), `runFullTests` on the jest all-skipped runner (still `passed: true`).
**P15 mutation proof (change 3).** With the rename-skip `i++` deleted, P15 failed: the list held an extra `'ts/widget.test.js'`; restored, green.
**P13's pin of the new `push.md` sentence** was green on its first run (Decision 47).
**Green.** The five test files of the slice plus `hotfix-check` and `quality-fleet-wiring`: 242 of 242 (and 241 of 241 with `CTOC_WHOLE_SUITE_ROOT` set, before Q27). `npm run lint`: clean, 0 warnings. `npm run typecheck`: 1 pass, 0 errors. `tests/reachability.test.js` + `tests/export-reachability.test.js`: 47 of 47, 0 skipped (the one new export, `escapeForDisplay`, is called by `push.js`).
**`npm test`, final code, foreground, summaries:** run 1: tests 13184, pass 13184, fail 0, skipped 0, coverage 99.87% (threshold 99%), duration 129.7 s, `[CTOC test-gate] PASS`. Run 2: tests 13184, pass 13184, fail 0, skipped 0, coverage 99.87%, 140.3 s, PASS. With `CTOC_WHOLE_SUITE_ROOT` set to this worktree's root: first attempt 13183 of 13184, the one failure `tests/hotfix-check-corpus.test.js` "the whole-file scanners stay linear on input built against them" (`src/styles/urls.css: size 2048 took 46.9 ms and size 8192 took 377.3 ms, 8.0 times as long`), a timing-ratio test of code this slice does not touch; it passed three times alone and in every other full run, and the rerun of the same command passed: tests 13184, pass 13184, fail 0, skipped 0, coverage 99.87%, 126.4 s, PASS. Recorded as one timing flake observed in unrelated code, not hidden. (Before Q27 and the refusal masking, two earlier full runs: 13183 of 13183, 99.87%, 135.8 s and 136.0 s, PASS.)
**Not done here.** The real `node src/commands/push.js --dry-run` on this repository (a background agent's command naming `src/commands` is refused by the protection): the main session runs it, with the wall-clock time, the tests line, the exit code and whether `/ctoc:start` was open. The Step 16 critic dispatch against the Acceptance Criteria is the CTO Chief's. `menu task complete` is not run (the completion check's default limit is shorter than the suite).
**Reaches users:** the change reaches users only once the installed plugin version contains it; it is not reported as "the push now does this" before then. No CHANGELOG edit (not in this slice's files; the release step owns it).
**Worktree state:** `.ctoc/quality-state/security-results.json` (gitignored) was written by the full-suite runs; the hash cache file of Decision 39 was not.

**Step 16 — the real dry run.** 2026-10-15 — the real dry run, run by the main session from the worktree after commit ea485e76: `node src/commands/push.js --dry-run`, CTOC_WHOLE_SUITE_ROOT unset, /ctoc:start not open in a terminal, exit 1 after 222 s. Tests line: `passed — \`npm test\` (test command set in .ctoc/quality-config.yaml, not by the project's own files): 13184 passed; not tested: github-actions (no test command)` — the whole-suite check worked as specified. The push was blocked by three checks this slice does not change: lint and type check (the configured commands in .ctoc/quality-config.yaml, `eslint .` and `tsc --noEmit`, run as bare programs and neither eslint nor tsc is on PATH — they live in node_modules/.bin; the same happens on main; the package's own `npm run lint` and `npm run typecheck` pass) and the security scan (this worktree branch has no upstream, so the push delta is the whole history of about 1,325 commits; 77 secret findings, classified by the secrets-detector agent from each committed blob: 61 test fixtures, 16 false positives, 0 real; none in the files this slice changed; ea485e76 alone produces zero findings). All three are listed for the owner to schedule.

**Owner findings (not built here)**
- The lint and type-check commands in .ctoc/quality-config.yaml cannot run as bare programs (use the package scripts).
- The push prints no detail when lint or type check fails.
- The push's security scan rescans the whole history when the branch has no upstream (scan only commits not on any remote) and rescans whole files (scan added lines).
- Committed scanner fixtures need a reviewed fingerprint list under tests/ (no values stored, new values still block).
- The AWS and database-URL scanner rules pass only the prefix to the placeholder check.
- A branch `fix/push-gate-false-positives` (ee5d1293) exists unreviewed.
- "not tested: github-actions" names a workflow folder, not a language with tests.
- The timing test in tests/hotfix-check-corpus.test.js ("whole-file scanners stay linear") failed once under load.
- push.md's older sections (overview line 31, Background Agent Behavior, the dry-run and Tier-1 samples) do not match push.js.
- A later automatic push cannot ship commits refused for an unknown count.
- Untracked new files are not named in the uncommitted note.
- The configured test command can be changed (quality-config.yaml or package.json) to one that runs nothing.

## Deferred Questions

_Written by the Iron Loop integrator (src/lib/iron-loop.js), which performs NO
quality evaluation. These entries are the integrator's own report on itself, not
findings from a critic that read this plan._

- **evaluation**: NOT EVALUATED — no automated critique was performed on this plan. The refinement loop appended the Steps 8-16 template and assessed nothing. (The scores this step used to report were computed from that same template, not from the plan.) A human or a real critic must review this plan before it is built.
