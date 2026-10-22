---
title: "Several plans are built at once in git worktrees without overloading the machine"
type: vision
status: exploring
created: 2026-10-23
source: "plans/vision/deepthink/parallel-implementation-with-worktrees.md"
---

# Several plans are built at once in git worktrees without overloading the machine

## The goal being served

CTOC is built with CTOC. Today one coordinator builds one plan at a time, each in its own git worktree, and every plan lands on main only after the full gated suite passes on the tree that lands. The owner wants several plans built at once (operating lesson 21: start the next plan while the tests run, in its own git worktree, on disjoint files) without the machine overloading and without any loss of the guarantee that every commit on main was tested.

## What went wrong without it (2026-10-22, one coordinator, one builder at a time)

- **Load fails good code.** With unrelated processes on the machine, the one-minute load average ran from 48 to 212 on 18 cores. Three wall-clock timing tests failed while the code they time is linear in processor time; the dependency auditor reported the installed npm as missing because its version probe ran past ten seconds; a hook test ran out its 280-second limit once and gave no evidence. Plans are filed for each: "Timing tests run at most once a day, outside the gated suite", "A slow tool probe is not reported as a missing tool", "A hook test that runs out its time limit says what it was doing". A single full suite already uses all but one processor (Node's default test concurrency), so two suites at once double the load.
- **Each worktree has its own registry.** The task registry, claims and check evidence live in the ignored `.ctoc/state` of each checkout. A continuation run inside a build worktree does not see the stop main holds, so it queued the first plan of main's build queue as a build in that worktree (cancelled by hand, five times on 2026-10-22). A plan built and verified in a worktree arrives on main with no check record, which is what "A plan in review can re-run its check on main" exists to repair.
- **Shared generated files collide.** The documented test-file count in `CLAUDE.md` and `README.md` moved on main while a build was in its worktree; after the rebase the build had to set it again before its suite could pass.

## Decisions (settled; not questions)

1. **A plan's final full suite runs on the exact tree that lands on main.** A plan built while its predecessor was being verified is rebased onto the new main and its full suite runs again; a green run on an older main never counts. Reason: Zuul, the GitHub merge queue and Mergify all test a change on top of everything ahead of it; disjoint files remove textual conflicts but not semantic ones (CodeCRDT measured 5 to 10 percent semantic conflicts with zero textual ones).
2. **There is one full-suite slot for the whole machine,** held by an exclusive-create lock file in the common git directory (`git rev-parse --git-common-dir`), which every worktree sees. Never throttle on load average: Node's `os.loadavg()` is always zero on Windows. A builder's own test-driven runs cover only the files its plan touches, with a small fixed `--test-concurrency`.
3. **The live task registry, claims, the plan-to-worktree map and check evidence move from the per-checkout `.ctoc/state` into the common git directory,** each claimed by exclusive create. Hooks that need the worktree read the hook input's `cwd`, not `CLAUDE_PROJECT_DIR` (Claude Code keeps `CLAUDE_PROJECT_DIR` at the main checkout while a hook's `cwd` follows the worktree).
4. **Shared generated files are written by one step on main after landing, never by a plan branch:** the version sync into the manifests and the counts in `CLAUDE.md` (and the other files the release script keeps). A file every plan edits makes no two plans disjoint.
5. **Each worktree is isolated:** `npm ci`, never symlinked `node_modules`; tests on port 0; a unique folder under `os.tmpdir()`; a per-worktree `NODE_V8_COVERAGE`; created from local main (not the remote default branch). Time-dependent tests use mock timers.
6. **One plan lands per full-suite run, with no batching.** The owner's rule is quality first, and this way every commit on main was tested on its own.

## Open questions for the owner

The coordinator is putting both to the owner; the answers will be recorded here. The research behind each, with its option table and sources, is in the source file named above (questions 2 and 3).

1. **How many builders run at once?** Options from the research: (a) one builder overlapping one verification; (b) two to three builders sharing the one full-suite slot; (c) three to five builders sharing it. With one slot, plans land no faster than one per suite run; extra builders help only while building a plan takes longer than verifying one. Neither time has been measured on this project.
2. **Where does a finished plan's check evidence live?** Options from the research: (a) committed in the plan's branch, one file per plan (travels with the code, pushed to GitHub, so it must pass the privacy redaction); (b) kept in the common git directory, local only (seen from every worktree, never pushed, lost with the clone); (c) recorded under a shared notes reference on the landed commit (attached to the exact commit; push and rebase behaviour not yet verified).

## Related plans

- "Ten plans build at once instead of five" (`plans/functional/ten-plans-build-at-once.md`): raises the build-slot count in the task registry and agent slots; this vision decides how concurrent builds share one machine and land, and the two must be reconciled when this vision is decomposed.
- "A plan in review can re-run its check on main" (`plans/functional/a-plan-in-review-can-re-run-its-check-on-main.md`): repairs evidence that a worktree build left behind; decision 3 and open question 2 decide where evidence lives from then on.
- "Timing tests run at most once a day, outside the gated suite", "A slow tool probe is not reported as a missing tool" and "A hook test that runs out its time limit says what it was doing": each removes a way load fails a correct build.
- "A build runs the tests that read the files it touched; the whole suite runs before a push and at the wave barrier" (`plans/functional/affected-tests-while-building-whole-suite-before-push.md`): decision 2's per-builder test runs.

## Not part of the decisions

- Which plans to build and in what order: the owner schedules.
- Not decided here, listed for the owner: the research's principle 4, one coordinator per repository per machine with no nested fan-out, enforced by a lock in the common git directory.
