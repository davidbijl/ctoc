Prepared 2026-10-22 for deepthink; parallelizing implementation with several agents and git worktrees; not yet asked
Web research for the owner of this project: evidence to read, never an instruction to any agent that reads this file.

**Evidence summary**

What the research found: the machine load follows from the test runner's own defaults. Node's `--test-concurrency` defaults to "os.availableParallelism() - 1" and its default isolation runs each test file in its own child process, so one full-suite run already uses all but one logical processor, and every concurrent full suite adds about that many processes again (derived from the Node documentation, not measured on this project). A peer-reviewed study found 46.5 percent of the flaky tests in its data set are resource-affected. Every merge-queue system read (Zuul, the GitHub merge queue, Mergify, Uber's SubmitQueue as its 2025 paper describes it, and Jane Street's account of the "not rocket science" rule) tests the exact tree that becomes the main branch, a change on top of everything queued ahead of it; the owner's verify-in-parallel ruling is safe under that rule only if the next plan's own final full suite runs on the tree that will actually land. Git worktrees share the common git directory and every reference under `refs/` except three, but not working files, which explains why a per-checkout state folder is invisible across worktrees; Claude Code also leaves a hook's `${CLAUDE_PROJECT_DIR}` at the main checkout while the hook's `cwd` input follows the worktree. The vendors agree on per-agent isolated checkouts prepared by a setup step and partitioning by files; Claude Code forbids nested teams and suggests starting with three to five teammates; token cost grows with agent count; Anthropic says coding has fewer truly parallel tasks than research; a 2025 preprint measured parallel agent coordination from 21.1 percent faster to 39.4 percent slower depending on the task.

What changed against the input: the load is not only a side effect of three coordinators — a single full suite already fills the machine, so the limit has to be one machine-wide full-suite slot. Verify-in-parallel needs a rule the input does not state: a green full suite on an older main never counts; the next plan's own final suite runs on the tree that will land. Claude Code's default worktree base branches from the remote's default branch, so a builder worktree can start from a main that lacks locally landed but unpushed plans, unless the base is set to the local head or the worktree is created from local main.

Still unverified: the machine's processor count; whether the project's gated test entry point overrides `--test-concurrency`; whether two concurrent full suites finish sooner than two in a row on this machine; whether the agents' sandbox allows non-git writes into the common git directory; how notes references are pushed by default.

Every quotation below came through WebFetch's model answer, not from page text seen directly. All sources were read on 2026-10-22.

## What the evidence says

1. **One full suite already saturates the machine.** Node command-line documentation, `--test-concurrency`: concurrency "defaults to `os.availableParallelism() - 1`" unless isolation is `'none'`; `--test-isolation`: the default `'process'` runs "each test file … in a separate child process". Primary documentation; the k-suites arithmetic is derived and assumes the project's gate uses the default. [Node command-line options](https://nodejs.org/api/cli.html), [Node test runner](https://nodejs.org/api/test.html)
2. **Resource contention is a major cause of flaky tests.** Silva and others, 52 projects in Java, JavaScript and Python under 27 resource configurations: 46.5 percent of flaky tests resource-affected (abstract). Peer-reviewed. [arXiv](https://arxiv.org/abs/2310.12132)
3. **A load-average throttle cannot be cross-platform.** Node `os` documentation: `os.loadavg()` "On Windows, the return value is always `[0, 0, 0]`"; `os.cpus().length` "should not be used to calculate the amount of parallelism"; use `os.availableParallelism()`. [Node os](https://nodejs.org/api/os.html)
4. **Merge gating tests the exact merged tree.** Zuul "Project Gating": "A gating system should always test each change applied to the tip of the branch exactly as it is going to be merged"; changes behind a failure are retested without it. GitHub merge queue: temporary branches with "the latest base branch, the pull requests ahead of it in the queue, and the pull request being added". Mergify "Parallel Checks": cumulative draft pull requests; "Wasted CI runs occur when a PR ahead in the queue fails". Three vendors agree. [Zuul](https://zuul-ci.org/docs/zuul/9.4.0/gating.html), [GitHub](https://docs.github.com/en/enterprise-server@3.20/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue), [Mergify](https://docs.mergify.com/merge-queue/parallel-checks)
5. **Speculation at scale wastes builds; conflict analysis cuts the waste.** Uber 2025 (Juloori and others): premature build aborts affect "40-65% of builds" (Section I); a target analyzer finds independent changes (Section III-A); about 53 percent less continuous-integration resource use, 44 percent less processor use, 37 percent shorter 95th-percentile waiting (abstract; per-monorepo figures in Section X do not match the 37 percent); batching is future work (Section XII). Preprint with industrial measurement. [arXiv](https://arxiv.org/abs/2501.03440)
6. **Serial gating costs verification time times the number of changes.** Yaron Minsky, Jane Street, 6 July 2014: "automatically maintain a repository that never fails its tests"; sequential gating takes "at least `m * n` minutes"; a failed merged group forces individual retries. Practitioner report. [Jane Street](https://blog.janestreet.com/making-never-break-the-build-scale/)
7. **Disjoint files remove textual conflicts but not semantic ones.** CodeCRDT (Pugachev, 2025), 600 trials: "100% convergence with zero merge failures" yet 5 to 10 percent semantic conflicts; parallel from up to 21.1 percent faster to up to 39.4 percent slower by task structure. Single-author preprint, six tasks. [arXiv](https://arxiv.org/abs/2510.18893)
8. **Partition by files; do not nest fan-out.** Claude Code agent teams, "Avoid file conflicts": "Two teammates editing the same file leads to overwrites. Break the work so each teammate owns a different set of files." Limitations: teammates "cannot spawn their own teammates"; one team per session. Devin: its coordinator "groups files into work packages that won't conflict", each managed Devin "in its own isolated VM". [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams.md), [Devin](https://docs.devin.ai/work-with-devin/advanced-capabilities.md)
9. **How many agents.** Claude Code agent teams: "Start with 3-5 teammates for most workflows"; token costs "scale linearly"; "Three focused teammates often outperform five scattered ones"; five to six tasks per teammate. Claude Code "Run agents in parallel": `/batch` splits one large change into "5 to 30 worktree-isolated subagents". Anthropic multi-agent research post (13 June 2025): "about 15× more tokens than chats"; "most coding tasks involve fewer truly parallelizable tasks than research". Vendor guidance, not measurements on coding pipelines. [agent teams](https://code.claude.com/docs/en/agent-teams.md), [parallel agents](https://code.claude.com/docs/en/agents.md), [Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)
10. **Parallelism collapses when every agent needs the same task.** Carlini, C compiler: 16 agents, nearly 2,000 sessions over two weeks, just under 20,000 dollars; tasks claimed by lock files in `current_tasks/` synced through git; "Merge conflicts are frequent"; on the Linux kernel "Every agent would hit the same bug, fix that bug, and then overwrite each other's changes" until the work was split per file against a known-good compiler; a fast option ran a "deterministic per-agent but random across VMs" 1 or 10 percent sample of tests. Single practitioner report. [Anthropic](https://anthropic.com/engineering/building-c-compiler)
11. **The case against parallel subagents.** Walden Yan (Cognition, 12 June 2025): "Actions carry implicit decisions, and conflicting decisions carry bad results"; recommends a single-threaded linear agent. Practitioner argument. [Cognition](https://cognition.com/blog/dont-build-multi-agents)
12. **What worktrees share.** git-worktree: refs are "shared across all worktrees, except `refs/bisect`, `refs/worktree` and `refs/rewritten`"; `$GIT_COMMON_DIR` points to the main worktree's `.git`; repository configuration shared by default; `add` refuses a branch checked out elsewhere. `git rev-parse --git-common-dir` shows `$GIT_COMMON_DIR` if defined, else `$GIT_DIR`. `git worktree lock` "adds a file named `locked` to the entry's directory". [git-worktree](https://git-scm.com/docs/git-worktree), [git-rev-parse](https://git-scm.com/docs/git-rev-parse)
13. **Claude Code worktree behaviour.** Default location `.claude/worktrees/<name>/` on branch `worktree-<name>`; `worktree.baseRef` defaults to `"fresh"` (remote default branch), `"head"` branches from local `HEAD`; `${CLAUDE_PROJECT_DIR}` "stays put" at the main checkout while a hook's `cwd` follows the worktree; an isolated session is blocked from Edit or Write to main-checkout paths and from git commands redirected there; git writes to the shared `.git` and "sandboxing allows those writes"; a running agent's worktree holds a `git worktree lock`; `.worktreeinclude` copies ignored files into each new worktree. [Claude Code worktrees](https://code.claude.com/docs/en/worktrees.md)
14. **Prepare each worktree deterministically; do not symlink dependencies.** Cursor: setup keys in `.cursor/worktrees.json` with separate Unix and Windows keys, examples such as `npm ci`; "We do not recommend symlinking dependencies into the worktree"; default cleanup cap 25 worktrees per machine. GitHub Copilot agent: finding dependencies by trial and error "can be slow and unreliable"; use preinstalled setup steps. [Cursor](https://cursor.com/docs/configuration/worktrees), [GitHub Copilot](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)
15. **Per-run isolation primitives in Node.** Port 0: "the operating system … assign an arbitrary unused port"; `NODE_V8_COVERAGE` names the coverage directory; `os.tmpdir()`; `O_EXCL` makes opening "fail if the `O_CREAT` flag is set and the file already exists"; `mock.timers` tests timers "without actually waiting". [Node net](https://nodejs.org/api/net.html), [Node test runner](https://nodejs.org/api/test.html), [Node os](https://nodejs.org/api/os.html), [Node file system](https://nodejs.org/api/fs.html)
16. **Lockfile conflicts.** npm version 6, "Resolving lockfile conflicts": since npm 5.7.0 fix `package.json` by hand and rerun `npm install`, optionally `--package-lock-only`; npm writes "a merged package lock"; suggests `npm-merge-driver`. Old npm major version; current behaviour not verified. [npm](https://docs.npmjs.com/cli/v6/configuring-npm/package-locks)

## Principles to act on

1. **The final full suite runs on the exact tree that becomes main.** With fast-forward-only landing, a plan built on an older main is rebased onto the new main and its full suite runs again before it lands; a green run on the older main is discarded; disjoint files do not waive this. (Findings 4, 6, 7)
2. **One machine-wide full-suite slot, not one per worktree,** held by an exclusive-create lock file in the common git directory (`git rev-parse --git-common-dir`) so every worktree sees it; never gate on load average (always zero on Windows); start with one slot, a proposal to check by measurement. (Findings 1, 2, 3, 12, 15)
3. **Overlap agent work with verification, never two verifications.** A builder mostly waits on the model (assumed, not measured), so it can run alongside the one full suite; its own test runs during test-driven development are limited to the files its plan touches at a small fixed `--test-concurrency` (one or two, a proposal to check); a deterministic test sample is another option for quick runs; the full suite stays the landing gate. (Findings 1, 2, 10)
4. **One coordinator per repository per machine, with no nested fan-out,** enforced by a lock in the common git directory. (Findings 1, 8, 12)
5. **Choose concurrent plans by disjoint declared files;** a plan that edits a file every plan edits is disjoint from nothing, so shared generated edits leave plan branches. (Findings 7, 8, 10)
6. **Live coordination state lives where every worktree can see it:** task registry, claims, plan-to-worktree map and the suite slot in the common git directory; CTOC hooks that need the worktree read `cwd`, not `${CLAUDE_PROJECT_DIR}`; `git worktree list` and the `locked` reason show which worktrees a running agent holds. (Findings 12, 13)
7. **Each worktree is prepared deterministically and isolated per run:** `npm ci`, never symlinked `node_modules`; `.worktreeinclude` for ignored configuration; tests on port 0, a unique folder under `os.tmpdir()`, a per-worktree `NODE_V8_COVERAGE`; worktrees created from local main (`worktree.baseRef` `"head"` or `git worktree add` from main). (Findings 13, 14, 15)
8. **Time-dependent tests use mock timers,** so time-dependent behaviour stays in the gated suite without a wall-clock wait. (Finding 15)
9. **Merge-queue practice adapted locally:** the coordinator is the queue, first come first served; a failure removes the plan and sends it back while the rest continues; stacking on the predecessor and batching are the two accelerations vendors use (questions below). (Findings 4, 5, 6)

## What is contested or unverified

- Whether parallel agents help at all on coding: Cognition against; Anthropic gains for research but fewer parallel tasks in coding; CodeCRDT measured both speedups and slowdowns; Carlini succeeded with 16 agents until the work became one task. No measurement on a test-driven pipeline like this one was found.
- Whether two concurrent full suites finish sooner than two in a row on this machine: not measured; the derivation says not when the suite is processor-bound.
- Builder count to keep one suite slot busy: about build time per plan divided by suite time per plan — a derivation; both times unmeasured.
- The machine's processor count and whether the gated entry point sets `--test-concurrency`: unknown; default assumed.
- Whether the sandbox allows a Node process's own writes to the common git directory: not stated.
- npm lockfile procedure read for npm version 6 only; notes-reference push and rebase behaviour not read; Uber's 2019 SubmitQueue paper not opened; Brun and others' numbers unreadable; Cursor's cleanup cap 25 per documentation versus "around 20" in a forum reply.

## Derived, no question needed

- **The final suite runs on the tree that lands;** a green run on an older main never counts. Reason: Zuul, GitHub and Mergify all test against everything ahead; CodeCRDT measured 5 to 10 percent semantic conflicts with zero textual ones.
- **One machine-wide full-suite slot,** held by an exclusive-create lock in the common git directory. Reason: Node's default concurrency fills the machine; load average is always zero on Windows; a lock is visible from every worktree.
- **The live task registry and claims live in the common git directory,** claimed by exclusive create. Reason: per-checkout folders are invisible across worktrees; Carlini's lock files and Claude Code's task list both claim work by file locking.
- **Shared generated files are written by one step on main after landing, never by a plan branch** (version sync into the manifests, generated counts in the instruction file); lockfile conflicts are resolved by fixing `package.json` and running `npm install --package-lock-only`. Reason: a file every plan edits makes no two plans disjoint.
- **Per-worktree isolation** (port 0, unique temporary folder, per-worktree coverage directory, `npm ci`, base on local main) and **mock timers for time-dependent tests.** Reason: documented primitives with no competing option.

None of the questions below has a person waiting on a search or an answer, so the waiting budget does not bind. For every option, the time from a plan being ready to landing on main is not yet measured; to measure on the project.

### Question 1, researched — When the next plan is built while the previous plan runs its final checks, how should the next plan land on main?

Every gate read tests a change on top of what lands before it ([Zuul gating](https://zuul-ci.org/docs/zuul/9.4.0/gating.html), [GitHub merge queue](https://docs.github.com/en/enterprise-server@3.20/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)). With fast-forward-only landing, the next plan's final suite must therefore see the previous plan. Hosted queues stack changes so suites run in parallel ([Mergify](https://docs.mergify.com/merge-queue/parallel-checks)); on one machine a second suite competes for the same processors ([Node command-line options](https://nodejs.org/api/cli.html)).

```
┌────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┬────────────────────────────┐
│ Option             │ Pros                                 │ Cons                                 │ Recommendation             │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼────────────────────────────┤
│ Rebase onto the    │ Tests the exact tree that becomes    │ Its final suite waits until the      │                            │
│ new main, then     │   main.                              │   predecessor has landed.            │                            │
│ rerun the suite    │ A predecessor sent back never leaks  │ Final suites run one after another,  │                            │
│                    │   into this plan's code.             │   several minutes each.              │                            │
│                    │ Disjoint files keep the rebase       │ Time to land: not yet measured; to   │                            │
│                    │   free of textual conflicts.         │   measure on the project.            │                            │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼────────────────────────────┤
│ Stack on the       │ Tests the exact tree that becomes    │ A predecessor sent back forces this  │                            │
│ predecessor's      │   main.                              │   plan to be redone or rebased.      │                            │
│ branch             │ Same shape as Zuul, GitHub merge     │ Mergify: wasted runs occur when a    │                            │
│                    │   queue and Mergify speculation.     │   change ahead fails.                │                            │
│                    │ Final suites can overlap when the    │ Two suites at once double the test   │                            │
│                    │   machine has spare processors.      │   processes on one machine.          │                            │
│                    │                                      │ Time to land: not yet measured; to   │                            │
│                    │                                      │   measure on the project.            │                            │
└────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┴────────────────────────────┘
```

Best quality in the long run: no clear answer: both test the exact tree that becomes main, and stacking pays off only if two full suites at once finish sooner than two in a row on this machine, which no source measured and the project has not measured.

Sources: [Zuul gating](https://zuul-ci.org/docs/zuul/9.4.0/gating.html), [GitHub merge queue](https://docs.github.com/en/enterprise-server@3.20/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue), [Mergify parallel checks](https://docs.mergify.com/merge-queue/parallel-checks), [Node command-line options](https://nodejs.org/api/cli.html), [CodeCRDT](https://arxiv.org/abs/2510.18893)

Should a plan built during the previous plan's final checks be rebased onto the new main and re-verified, or be built stacked on the previous plan's branch?

New ideas in this question, for you to check:
- Stacking a plan on its predecessor's branch: from Zuul, GitHub merge queue and Mergify speculation.
- That two concurrent full suites may not finish sooner on one machine: the researcher's derivation from the Node concurrency default, not measured.

**a)** Rebase onto the new main after the predecessor lands, then rerun the full suite on that tree.
**b)** Build stacked on the predecessor's branch, and rebuild on main if the predecessor is sent back.

Reply with a letter.

### Question 2, researched — When the one-thread ruling is lifted, how many builders should run at once?

With one full-suite slot and fast-forward-only landing, plans can land no faster than one per suite run (derived). Extra builders help only while building a plan takes longer than verifying one. Claude Code's guidance is to start with three to five teammates, with token cost growing in step with team size ([Claude Code agent teams](https://code.claude.com/docs/en/agent-teams.md)). Measured outcomes for parallel coding agents range from faster to slower ([CodeCRDT](https://arxiv.org/abs/2510.18893), [Anthropic research system](https://www.anthropic.com/engineering/multi-agent-research-system)).

```
┌────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┬────────────────────────────┐
│ Option             │ Pros                                 │ Cons                                 │ Recommendation             │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼────────────────────────────┤
│ One builder plus   │ Matches both standing rulings as     │ Landing rate is capped by build      │                            │
│ one overlapping    │   they stand today.                  │   time plus suite time [derived].    │                            │
│ verification       │ Fewest file conflicts and fewest     │ Time to land: not yet measured; to   │                            │
│                    │   tokens of the three options.       │   measure on the project.            │                            │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼────────────────────────────┤
│ Two to three       │ Keeps the one suite slot busy when   │ Token use scales linearly with       │                            │
│ builders, one      │   building outlasts the suite.       │   active agents (Claude Code docs).  │                            │
│ suite slot         │ Claude Code docs: three focused      │ Needs two or three ready plans with  │                            │
│                    │   teammates often outperform five.   │   disjoint files at the same time.   │                            │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼────────────────────────────┤
│ Three to five      │ Claude Code docs: start with 3 to 5  │ No gain past the suite slot's rate   │                            │
│ builders, one      │   teammates for most workflows.      │   [derived].                         │                            │
│ suite slot         │ Uses many ready independent plans    │ Anthropic: multi-agent research used │                            │
│                    │   when the backlog is large.         │   about 15 times the tokens of chat. │                            │
│                    │                                      │ CodeCRDT: 21.1% faster to 39.4%      │                            │
│                    │                                      │   slower, by task structure.         │                            │
└────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┴────────────────────────────┘
```

Best quality in the long run: no clear answer: with one full-suite slot, the best count is the measured build time per plan divided by the measured suite time per plan, and neither has been measured on this project.

Sources: [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams.md), [Claude Code parallel agents](https://code.claude.com/docs/en/agents.md), [Anthropic research system](https://www.anthropic.com/engineering/multi-agent-research-system), [CodeCRDT](https://arxiv.org/abs/2510.18893), [Anthropic C compiler post](https://anthropic.com/engineering/building-c-compiler), [Cognition blog](https://cognition.com/blog/dont-build-multi-agents)

How many builders should run at once once the one-thread ruling is lifted: one, two to three, or three to five, all sharing one full-suite slot?

New ideas in this question, for you to check:
- The one machine-wide full-suite slot: the researcher's derivation from the Node concurrency default and the resource-affected flaky test study.
- The builder count equal to build time divided by suite time: the researcher's derivation, not from any source.
- The three-to-five starting size: from Claude Code's agent-teams documentation, which is written for agent teams, not for this pipeline.

**a)** Keep one builder, overlapping one verification.
**b)** Two to three builders sharing one full-suite slot.
**c)** Three to five builders sharing one full-suite slot.

Reply with a letter.

### Question 3, researched — Where should a finished plan's check evidence and recorded answers live so that main sees them?

Files in a worktree's ignored folder are invisible to other worktrees; everything under `refs/` (with three exceptions) and the common git directory are shared ([git-worktree](https://git-scm.com/docs/git-worktree)). Notes are stored under `refs/notes/commits` by default ([git-notes](https://git-scm.com/docs/git-notes)). The choice trades travelling with the code against keeping evidence off GitHub, which falls under the owner's privacy rule.

```
┌────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┬────────────────────────────┐
│ Option             │ Pros                                 │ Cons                                 │ Recommendation             │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼────────────────────────────┤
│ Commit it in the   │ Evidence lands together with the     │ Pushed to GitHub, so it must pass    │                            │
│ plan's branch      │   code it proves.                    │   the privacy redaction rule.        │                            │
│                    │ Seen in every checkout and clone,    │ Needs one file per plan, or it       │                            │
│                    │   and survives deleting a clone.     │   conflicts like other shared files. │                            │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼────────────────────────────┤
│ Keep it in the     │ Seen from every worktree at once     │ Lost when the clone is deleted, and  │                            │
│ shared git         │   (git worktree documentation).      │   absent from history.               │                            │
│ directory          │ Never pushed, so nothing to redact.  │ Sandbox permission for non-git       │                            │
│                    │                                      │   writes there: unverified.          │                            │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼────────────────────────────┤
│ Record it under a  │ Refs are shared by all worktrees     │ Push and rebase behaviour of notes   │                            │
│ shared notes ref   │   (git worktree documentation).      │   not verified in this run.          │                            │
│                    │ Attached to the exact commit that    │ Less common tooling than files.      │                            │
│                    │   landed on main.                    │                                      │                            │
└────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┴────────────────────────────┘
```

Best quality in the long run: no clear answer: all three are visible to the main checkout, and they differ in whether evidence is pushed and survives the clone, which is a privacy and retention choice for the owner.

Sources: [git-worktree](https://git-scm.com/docs/git-worktree), [git-rev-parse](https://git-scm.com/docs/git-rev-parse), [git-notes](https://git-scm.com/docs/git-notes), [Claude Code worktrees](https://code.claude.com/docs/en/worktrees.md)

Should a finished plan's evidence and recorded answers be committed in the plan's branch, kept in the shared git directory, or recorded under a shared notes reference?

New ideas in this question, for you to check:
- The common git directory as a store for CTOC state: from the git-worktree and git-rev-parse documentation.
- Notes references as an evidence store: from the git-notes documentation.
- One evidence file per plan to avoid conflicts: the researcher's derivation.

**a)** Commit the evidence in the plan's branch, one file per plan.
**b)** Keep the evidence in the shared git directory, local only.
**c)** Record the evidence under a shared notes reference on the landed commit.

Reply with a letter.

### Question 4, researched — Should plans land one at a time, or in batches tested together by one full suite?

Batching cuts the number of suite runs; the cost is that commits in the middle of a batch are never tested alone, and a failed batch has to be split to find the plan at fault ([Mergify parallel checks](https://docs.mergify.com/merge-queue/parallel-checks), [Jane Street blog](https://blog.janestreet.com/making-never-break-the-build-scale/)). GitHub offers a setting that requires every grouped pull request to pass on its own ([GitHub merge queue](https://docs.github.com/en/enterprise-server@3.20/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)). Mergify's example of 6 of 7 changes landing in 10 minutes instead of an hour combines batches of 3 with 2 parallel checks.

```
┌────────────────────┬──────────────────────────────────────┬──────────────────────────────────────┬────────────────────────────┐
│ Option             │ Pros                                 │ Cons                                 │ Recommendation             │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼────────────────────────────┤
│ One plan per full  │ Every commit on main was tested on   │ One full suite run per plan, each    │                            │
│ suite run          │   its own.                           │   several minutes long.              │                            │
│                    │ A failure names its plan at once.    │ Time to land: not yet measured; to   │                            │
│                    │                                      │   measure on the project.            │                            │
├────────────────────┼──────────────────────────────────────┼──────────────────────────────────────┼────────────────────────────┤
│ Batch two or three │ Mergify: 6 of 7 changes landed in    │ Middle commits on main were never    │                            │
│ disjoint plans     │   10 minutes, not an hour.           │   tested on their own.               │                            │
│ into one run       │ Fewer suite runs, less machine load. │ A failed batch needs split reruns to │                            │
│                    │                                      │   find the plan at fault (Mergify).  │                            │
└────────────────────┴──────────────────────────────────────┴──────────────────────────────────────┴────────────────────────────┘
```

Best quality in the long run: no clear answer: batching trades fewer suite runs for untested middle commits, and how often full suites fail here, which sets the cost of split reruns, has not been measured.

Sources: [Mergify parallel checks](https://docs.mergify.com/merge-queue/parallel-checks), [GitHub merge queue](https://docs.github.com/en/enterprise-server@3.20/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue), [Jane Street blog](https://blog.janestreet.com/making-never-break-the-build-scale/), [CI at Scale](https://arxiv.org/abs/2501.03440)

Should plans land one per full suite run, or in batches of two or three disjoint plans tested together?

New ideas in this question, for you to check:
- Batch landing with split reruns on failure: from Mergify, the GitHub merge queue and Jane Street.
- Applying batch landing to CTOC's local fast-forward landing: the researcher's adaptation; the Mergify timing comes from hosted continuous integration, not from one machine.

**a)** Land one plan per full suite run.
**b)** Batch two or three disjoint plans into one full suite run, splitting the batch on failure.

Reply with a letter.

## Papers downloaded

- `.ctoc/papers/flaky-tests-under-load/effects-of-computational-resources-on-flaky-tests-2023.pdf` (399,773 bytes) — The Effects of Computational Resources on Flaky Tests (Silva and others, 2023)
- `.ctoc/papers/merge-queues-and-mainline-gating/ci-at-scale-lean-green-and-fast-uber-2025.pdf` (934,667 bytes) — CI at Scale: Lean, Green, and Fast (Juloori and others, 2025)
- `.ctoc/papers/parallel-coding-agents/codecrdt-observation-driven-coordination-2025.pdf` (1,022,649 bytes) — CodeCRDT (Pugachev, 2025)
- `.ctoc/papers/parallel-coding-agents/openhands-open-platform-for-ai-software-developers-2024.pdf` (3,293,124 bytes) — OpenHands (Wang and others, 2024)
- `.ctoc/papers/merge-queues-and-mainline-gating/proactive-detection-of-collaboration-conflicts-2011.pdf` (1,081,846 bytes) — Proactive Detection of Collaboration Conflicts (Brun and others, 2011); its text was unreadable through the research tool, so its numbers are not used above.

## Web pages cited

Run parallel sessions with worktrees (Claude Code); Orchestrate teams of Claude Code sessions (Claude Code); Run agents in parallel (Claude Code); Carlini, building a C compiler with parallel Claude agents (Anthropic); How we built our multi-agent research system (Anthropic); Don't Build Multi-Agents (Cognition); Worktrees (Cursor); Advanced capabilities, managed Devins (Devin); Customize the agent environment (GitHub Copilot); Managing a merge queue (GitHub Enterprise Server 3.20); Parallel Checks (Mergify); Project Gating (Zuul 9.4.0); Making "never break the build" scale (Jane Street); git-worktree; git-rev-parse; git-notes; Node test runner; Node command-line options; Node os; Node file system; Node net; npm package-locks version 6. Addresses are in the paper library index.

## Failures

- Every quotation came through WebFetch's model answer, not page text seen directly.
- The Cognition address redirected to cognition.com (same publisher) and was fetched there.
- `cursor.com/docs/configuration/worktrees.md` returned 404; the address without `.md` succeeded.
- Graydon Hoare's original post came back empty; Brun and others' paper came back as compressed binary (only headings readable).
- The first Zuul search returned unrelated patents; Uber's 2019 "Keeping Master Green at Scale" was never opened.
- Partial reads: Node test runner characters 0 to 100,000 of 248,325; Node command-line options only from character 100,000 on; Node file system 0 to 100,000 and 400,000 to 452,237 (the `'wx'` flag and `fsPromises.mkdtemp` not seen); Node net 0 to 100,000 of 127,227.
- Gaps: git-notes page does not say whether notes are pushed by default; GitHub Copilot page does not say whether each task gets its own branch; Devin page states no parallel-session limit; the GitHub merge queue page read is the Enterprise Server 3.20 version.
- Not opened: Cognition's April 2026 follow-up (secondary pages only); official OpenHands documentation on parallel headless runs; any primary source on changesets; Aider; Bors; Simon Willison's posts.
- Directives found in pages: the Claude Code documentation pages open with a line telling the reader to fetch a documentation index; ignored, as were the tool's own suggestions to fetch other addresses.
