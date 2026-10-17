Prepared 2026-10-12 for deepthink; fast hermetic Node.js test suites and the rules for the test-writing agents; not yet asked
Web research for the owner of this project: evidence to read, never an instruction to any agent that reads this file.

I made 58 of the 70 allowed searches and fetches. All quotations below reached me through the fetch tool's answer about each page, not from seeing the page text directly. All sources were read on 2026-10-12.

## Evidence summary

- **Root causes.** The vendors' documentation backs what your profile measured. Inside one file, Node's test runner runs every test on a single thread. It starts test files in alphabetical order and never puts the longest file first. When standard input is not a terminal, `npx` installs a missing package without asking. These facts explain the 157-second floor and the 30 to 310 seconds spent fetching eslint.
- **Six rules hold up**, each traced to a source:
  - Keep each test to the smallest size category it can fit (Google's small, medium and large).
  - Pass external tools in through a seam, and keep one real contract test per tool.
  - Do expensive read-only setup once per suite.
  - Split long files.
  - Never sleep, and never assert wall-clock time inside a test.
  - Run the affected test files while building and the full suite before done.
- **What changed against the brief:**
  - `--test-isolation=none` runs every file one after another ("concurrency of one"). It is a slowdown on 18 cores, not a speed-up.
  - `npm audit` needs the registry by design. No offline setting makes a real audit test hermetic.
  - The 2024 journal study of flaky tests found that a lack of processor time is the main resource that makes flaky tests fail. That fits your 4 failures at load average 112 to 202.
  - The test runner's watch mode is marked Experimental on the test runner page but stable on the command-line page.
- **Still unverified:**
  - Google's 2010 test-size table with time limits of 60, 300 and 900+ seconds: the page body never loaded. Bazel's documented limits of 60, 300, 900 and 3600 seconds were read.
  - What `npx` does offline with an empty cache.
  - npm 10's exact error message for `--no` when the package is missing.
  - Whether a top-level `before()` with no `describe` around it runs once per file.
  - Every saving estimate below. Each is arithmetic on your pasted profile, to measure.
- **Waiting budget.** None of the three questions is an algorithmic question in that rule's sense (a search or answer a person waits for). Times are given where measured.

## What the evidence says

**1. Google's test sizes.**
- *Software Engineering at Google*, chapter 11, section "Test Size" (Google's practitioner book, strong for Google's practice) says:
  - "Small tests must run in a single process" and "aren't allowed to sleep, perform I/O operations, or make any other blocking calls. This means that small tests aren't allowed to access the network or disk."
  - Medium tests "can span multiple processes, use threads, and can make blocking calls, including network calls, to `localhost`."
  - Large tests "remove the `localhost` restriction".
  - "The slower a test suite, the less frequently it will be run, and the less benefit it provides."
- Time limits come from the Bazel Test Encyclopedia (Google's build tool documentation, strong):
  - Size maps to timeout: small → short, medium → moderate, large → long, enormous → eternal.
  - The timeouts are 60, 300, 900 and 3600 seconds.
  - "`--test_verbose_timeout_warnings` … will show the tests whose specified size is too big", for example "if a 'moderate' test completes in 5.5s, consider setting `timeout = "short"` or `size = "small"`."
  - On hermeticity: "the outcome of a test must depend only on" declared source files, declared build products and "resources whose behavior is guaranteed by the test runner to remain constant".
- The 2010 Testing Blog table (60 / 300 / 900+ seconds; network, database, file system, sleep, threads) reached me only as a search-engine summary. It is unverified.
- **Consequence for this suite:** tests that use temporary folders or spawn a hook are medium. Tests that fetch eslint from the registry are large.

**2. Node's built-in test runner (Node 24 documentation, strong).**
- *Execution model:* "each matching test file is executed in a separate child process", and inside a file "all of those tests will be executed within a single application thread, regardless of the value of the `concurrency` option".
- *`--test-concurrency`* (added v21.0.0 / v20.10.0 / v18.19.0): defaults to `os.availableParallelism() - 1`, which is 17 workers on your 18 cores. The `run()` interface's own `concurrency` defaults to `false`.
- *`--test-isolation`* (added v22.8.0 as `--experimental-test-isolation`, renamed v23.6.0):
  - With `none`, "the top level tests are executed with a concurrency of one".
  - "if a test relies on global state, it is possible for that state to be modified by a test originating from another file."
- *`--test-shard`* (added v20.5.0 / v18.19.0): it "will divide all tests files into `total` equal parts". The split is by count of files, not duration. It is incompatible with watch mode.
- *`--test-name-pattern`* (added v18.11.0): matching tests' hooks "are also run".
- *`--test-timeout`* (added v21.2.0 / v20.11.0): the default is `Infinity`. The per-test `timeout` option also defaults to `Infinity`: "A number of milliseconds the test will fail after."
- *Hooks:*
  - `before()` "creates a hook that runs before executing a suite".
  - `after()` "is guaranteed to run, even if tests within the suite fail".
  - The documented examples sit inside `describe`.
- *`MockTimers`:*
  - Added v20.4.0 / v18.19.0; the options object with `apis` and `now` came in v21.2.0 / v20.11.0; stable since v23.1.0.
  - The `apis` values are `setInterval`, `setTimeout`, `setImmediate` and `Date`.
  - `scheduler.wait` was not mentioned in any part I asked about.
- *Watch mode:* the test runner page says "Stability: 1 - Experimental", but the command-line page says "Watch mode is now stable" (v22.0.0). `--watch-path` "cannot be combined with … `--test`" and works on macOS and Windows only.
- *`NODE_COMPILE_CACHE`* is no longer experimental as of v24.15.0. Your profile measured no gain from it.
- *Per-test durations:* `test:pass` and `test:fail` events carry `details.duration_ms`.
- *File order:* the runner source for v24 (`createTestFileList`) ends in `return ArrayPrototypeSort(results)`. The tool found no ordering by duration or size.

**3. Why one large file sets the wall time.**
- Elapsed time can never be shorter than the longest single job. Within a file, tests share one thread.
- Longest-processing-time-first scheduling (Wikipedia; Graham 1969 is the primary source, not opened) orders jobs longest first and bounds the result at 4/3 − 1/(3m) of the optimum.
- Jest's default sequencer does this. Its source comment reads "running long tests first is an effort to minimize worker idle time", using cached durations and falling back to file size.
- Node sorts alphabetically, so a long file named late in the alphabet also starts late.
- Within node:test, the only remedy is splitting the file. `concurrency` inside a file helps only tests that wait on input and output.

**4. Hermetic tests and `npx`.**
- npm documentation for npx and `npm exec`, versions 10 and 11 (strong):
  - Missing packages "are installed to a folder in the npm cache".
  - "When standard input is not a TTY or a CI environment is detected, `--yes` is assumed."
  - "The `--no-install` option is deprecated, and will be converted to `--no`."
  - "Package names provided without a specifier will be matched with whatever version exists in the local project."
- npm's `libnpmexec` source (latest branch):
  - With `--no` and a missing package it throws "npx canceled due to missing packages and no YES option: [...]".
  - In a non-terminal or continuous integration environment it only logs a warning and installs.
  - It resolves manifests with `preferOnline: true`.
- npm configuration: `offline` will "Force offline mode: no network requests will be done during install". "Any environment variables that start with `npm_config_` will be interpreted as a configuration parameter."
- npm issue 3764 (npm 7.20.3, closed): offline mode fails with `ENOTCACHED`, "cache mode is 'only-if-cached' but no cached response is available".
- `npm audit` "submits a description of the dependencies … to your default registry".
- Supply-chain risk: the US Cybersecurity and Infrastructure Security Agency's alert of 23 September 2025 reports that the "Shai-Hulud" worm "compromised over 500 packages". It advises pinning versions "to known safe releases".
- Seams and contract tests, *Software Engineering at Google* chapter 13:
  - "A seam is a way to make code testable by allowing for the use of test doubles"; dependency injection is "a common technique for introducing seams".
  - "a test double can be very useful when the real implementation is slow".
  - Fakes need "contract tests" run against both the real thing and the fake.
- Martin Fowler's "Contract Test" (2011): such tests follow "the rhythm of changes to the external service", and a failure "should … trigger a task".

**5. Spawning Node per test.**
- Node's `child_process.fork()` section: "Each process has its own memory, with their own V8 instances. Because of the additional resource allocations required, spawning a large number of child Node.js processes is not recommended."
- Your profile: 64 seconds of processor time over 520 spawned tests is about 123 milliseconds per test (my arithmetic).
- Chapter 13 says to prefer realism over isolation where feasible, so a few real spawns per hook stay.

**6. Running only the affected tests.**
- Jest `--findRelatedTests` is "Useful for pre-commit hook integration". `--onlyChanged` "requires a static dependency graph".
- `vitest related` "Works with static imports … but not the dynamic ones".
- Node's watch mode reruns "the tests affected by the change". Explicit file arguments work.
- Ekstazi (Gligoric and others, 2015, peer-reviewed) selected tests by tracking which files each test used at run time. It cut end-to-end testing time by 32% on average, and by 54% on longer suites, over 615 revisions of 32 projects. That figure came through the tool's answer on the abstract page.
- Your ruling already matches this: affected tests during the loop, the full suite before done.

**7. Time budgets.**
- Bazel enforces timeouts by size and warns about oversized ones.
- Jest's `slowTestThreshold` (5 seconds) marks a test as slow and "reported as such". Its `testTimeout` defaults to 5000 milliseconds.
- Mocha flags tests slower than 75 milliseconds in its reports. The page says nothing about failing them.
- Node's default timeout is `Infinity`.
- Silva and others (IEEE Transactions on Software Engineering, 2024, peer-reviewed, 52 projects, 27 resource configurations):
  - "46.5% of the flaky tests in our dataset" are resource-affected (abstract).
  - "CPU starvation is the most significant and ubiquitous factor" (section IV-B1).
  - Across 10 JavaScript projects there were "28 failures under CPU throttling, zero under memory throttling" (section IV-A1).
- Hashemi and others (2022, peer-reviewed) found that waiting on asynchronous work and race conditions are the leading causes of flakiness in JavaScript, with network stability among the next.

## Principles to act on

1. **Size first.** Before writing a test, the agent names its size by Google's definitions and picks the smallest that proves the behavior (finding 1).
   - In-process, with no disk, network or sleep, is the default.
   - A temporary folder, a child process or `localhost` makes it medium, which needs a written reason.
   - The network beyond `localhost` makes it large, and question 2 decides where those run.
2. **No network in a test.** Never `npx <tool>` without `--no` (finding 4). A missing tool then fails loudly with npm's "canceled" error instead of installing silently. The tool version comes from the lockfile, never from the registry at test time.
3. **Seams for every outside effect** (finding 4, chapter 13). The code under test takes:
   - its command runner, so the test passes a fake that returns recorded output;
   - its clock, using `mock.timers` (Node 20.4 or later; `Date` through the options object since Node 21.2);
   - its root folder.
   Each fake gets one clearly named contract test that runs the real tool.
4. **Hooks in-process, with real spawns kept** (finding 5).
   - Call the hook's exported function directly and assert its return value.
   - Keep, per hook, at least one real spawn that feeds standard input and asserts the exit code and standard output. Several are better: one per distinct outcome (proposal).
   - Every assertion the spawned test made must map to an assertion in the in-process test. This keeps the "never weaker" ruling.
   - Estimated saving [unverified, to measure]: keeping 100 of the 520 spawns leaves about 12 of the 64 processor-seconds. In-process cost was not measured.
5. **Expensive read-only setup once** (finding 2).
   - Compute a whole-repository scan once in a `before()` inside the `describe`, and share it read-only. Freezing the result is a proposal.
   - Clean up in `after()`, which runs even when tests fail.
   - Estimated saving [unverified]: the 53 processor-seconds fall to roughly 11 to 18 if each file now repeats its scan 3 to 5 times.
6. **No long files** (finding 3).
   - Split along `describe` blocks so no file is the floor.
   - Proposed target to check: no file longer than the suite's total processor time divided by 17 workers. That total is not in the profile.
   - Splitting is derived: Node sorts files alphabetically and runs each on one thread, so no in-runner alternative exists.
7. **Keep process isolation** (finding 2; Vitest's documentation calls isolation "Safest, slowest").
   - `--test-isolation=none` serialises all files.
   - It would save at most about 23 processor-seconds of start-up (567 files × 40 milliseconds; my arithmetic) and lose 17-way parallelism.
8. **No sleeps, no wall-clock assertions** (findings 2 and 7). Timers are faked. Waits on real processes get generous limits (question 3), never tight ones.
9. **Affected tests during the loop, full suite before done** (finding 6). Use `node --test tests/a.test.js tests/b.test.js`, or `--test-name-pattern` for one test. Not `--watch-path`, which fails on Linux (cross-platform ruling).
10. **Load reliability.** The suite will meet starved machines (finding 7). The paper's own recommendation is to state the resources tests need. Running the suite occasionally under a lowered `--test-concurrency` or a processor limit is the paper's cheap way to find resource-affected tests (proposal).

## What is contested or unverified

- Google's 2010 table (60 / 300 / 900+ seconds): body never loaded. Bazel's figures are verified.
- Watch mode stability: Experimental on the test runner page, stable on the command-line page.
- `mock.timers`: which version brought each timer interface (only the v21.2.0 change to the options object was seen), and whether `scheduler.wait` is supported.
- Whether a top-level `before()` with no `describe` runs once per file.
- `npx` with `npm_config_offline=true` and an empty cache: `ENOTCACHED` is documented for installs on npm 7.20.3 only. The 19.0 → 2.8 seconds is your machine with a warm cache.
- npm 10's exact error text for `--no` with a missing package (only the latest-branch source was read).
- Whether `run({files})` keeps a custom order rather than sorting.
- Node has no related-test finder in the parts I read. That is not proof none exists.
- All saving estimates (principles 4, 5 and 7) are arithmetic on the pasted profile.

## Questions researched

Three questions came back: (1) how a test that checks an external command-line tool gets and runs it — researched recommendation: a fake command runner in most tests plus one contract test per tool that runs the real pinned tool; (2) whether a contract test that needs the live npm registry runs inside every `npm test` or in a separately named run before a release — an owner decision, no recommendation; (3) whether a time budget is asserted inside tests, reported, or enforced as a generous timeout that fails a hang — researched recommendation: report per-file durations and set a generous timeout that fails a hang. Sources for all three: npm exec, npx, npm configuration and npm audit documentation (version 11), the libnpmexec source, npm issue 3764, the Cybersecurity and Infrastructure Security Agency alert of 23 September 2025, Software Engineering at Google chapters 13 and 14, the Bazel Test Encyclopedia, Node 24 command-line and test runner documentation, Jest configuration, Mocha test duration, Hashemi and others 2022, Silva and others 2024, Martin Fowler's Contract Test.

## Failures

1. `https://testing.googleblog.com/2010/12/test-sizes.html`: only the title, the date (13 December 2010), the author label (Simon Stewart) and the comments came back; the post body and its table were not returned.
2. `https://testing.googleblog.com/2010/12/test-sizes.html?m=1`: same result, no body.
3. `https://testing.googleblog.com/2010/12/`: archive page, no body of the post.
4. `https://testing.googleblog.com/feeds/posts/default?q=%22Test+Sizes%22`: 302 redirect to a plain `http` address on another host. Not followed, because only `https` addresses are fetched.
5. `https://arxiv.org/pdf/2310.12132`: binary file, no text extracted. The ar5iv web rendering was read instead, covering characters 0 to 100,000 of 102,954; the final 2,954 were not read.
6. `https://cin.ufpe.br/~damorim/publications/MondalETAL_ICSME21.pdf`: binary file, no text extracted. Not cited.
7. `https://nodejs.org/docs/latest-v24.x/api/cli.html`: the first call (characters 0 to 100,000) returned only contents-level names for the test options. The entries came from a second call at offset 100,000.
8. `https://nodejs.org/docs/latest-v24.x/api/test.html` (236,605 characters), read in three parts with question-specific answers. Not reached: the built-in reporters and `--test-reporter`, and whether a top-level `before()` with no `describe` runs once per file.
9. `https://nodejs.org/docs/latest-v24.x/api/child_process.html`: the final 18,054 characters were not read.
10. `https://jestjs.io/docs/configuration`: the final 11,595 characters were not read. The default sequencer's order is not in the part read, so the sequencer source was read instead.
11. `https://mochajs.org/`: the home page had no `--slow` text. The duration explainer page was read instead.
12. `https://abseil.io/resources/swe-book/html/ch11.html`: the test-size figure (Figure 11-2) is an image, and no time limits came back from the chapter text.
13. `https://users.ece.utexas.edu/~gligoric/papers/abstracts/GligoricETAL15Ekstazi.txt`: no title, authors or venue on the page; those come from search-result summaries. No page opened offered the paper's file.
14. `https://research.google/pubs/taming-google-scale-continuous-testing/`: no file link was shown. Not cited.
15. `https://buttondown.com/nelhage/archive/test-size-and-scope/`: the tool's answer gave an author name that does not match the newsletter's name. Not cited.
16. The search for 2024 and 2025 empirical studies of slow tests returned only vendor and blog pages. Not used.
17. `https://raw.githubusercontent.com/nodejs/node/v24.x/lib/internal/test_runner/runner.js`: how concurrency is handled came through the tool's paraphrase. Only the sort line was quoted as code.
18. No page or search result carried a directive aimed at the reader.

## Papers cited

1. The Effects of Computational Resources on Flaky Tests — Denini Silva, Martin Gruber, Satyajit Gokhale, Ellen Arteca, Alexi Turcotte, Marcelo d'Amorim, Wing Lam, Stefan Winter, Jonathan Bell — 2024 (IEEE Transactions on Software Engineering; arXiv preprint 18 October 2023) — https://arxiv.org/pdf/2310.12132 — measured effect of processor, memory, disk and network limits on flaky tests, including 10 JavaScript projects — flaky-tests / silva-2024-computational-resources-flaky-tests
2. An Empirical Study of Flaky Tests in JavaScript — Negar Hashemi, Amjed Tahir, Shawn Rasheed — 2022 (International Conference on Software Maintenance and Evolution) — https://arxiv.org/pdf/2207.01047 — causes of flaky JavaScript tests, network stability among them — flaky-tests / hashemi-2022-flaky-tests-in-javascript
3. Practical Regression Test Selection with Dynamic File Dependencies — Milos Gligoric, Lamyaa Eloussi, Darko Marinov (from search-result summaries) — 2015 (International Symposium on Software Testing and Analysis) — https://users.ece.utexas.edu/~gligoric/papers/abstracts/GligoricETAL15Ekstazi.txt (page only, no file offered) — measured time saved by running only the tests affected by a change — regression-test-selection / gligoric-2015-ekstazi-regression-test-selection

## Web pages cited

All read on 2026-10-12: Node.js version 24 documentation (Test runner https://nodejs.org/docs/latest-v24.x/api/test.html; Command-line options https://nodejs.org/docs/latest-v24.x/api/cli.html; Child process https://nodejs.org/docs/latest-v24.x/api/child_process.html); Node.js version 24 test runner source https://raw.githubusercontent.com/nodejs/node/v24.x/lib/internal/test_runner/runner.js; Software Engineering at Google chapters 11, 13 and 14 (https://abseil.io/resources/swe-book/html/ch11.html, https://abseil.io/resources/swe-book/html/ch13.html, https://abseil.io/resources/swe-book/html/ch14.html); Bazel Test Encyclopedia https://bazel.build/reference/test-encyclopedia; npm documentation (npx https://docs.npmjs.com/cli/v11/commands/npx and https://docs.npmjs.com/cli/v10/commands/npx; npm exec https://docs.npmjs.com/cli/v11/commands/npm-exec and https://docs.npmjs.com/cli/v10/commands/npm-exec; configuration https://docs.npmjs.com/cli/v11/using-npm/config; npm audit https://docs.npmjs.com/cli/v11/commands/npm-audit); libnpmexec source https://raw.githubusercontent.com/npm/cli/latest/workspaces/libnpmexec/lib/index.js; npm issue 3764 https://github.com/npm/cli/issues/3764; Cybersecurity and Infrastructure Security Agency alert https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem; Jest command-line options https://jestjs.io/docs/cli and configuration https://jestjs.io/docs/configuration; Jest default test sequencer source https://raw.githubusercontent.com/jestjs/jest/main/packages/jest-test-sequencer/src/index.ts; Vitest command-line interface https://vitest.dev/guide/cli and Improving Performance https://vitest.dev/guide/improving-performance; Mocha Test duration https://mochajs.org/explainers/test-duration/; Martin Fowler, Contract Test https://martinfowler.com/bliki/ContractTest.html; Wikipedia, Longest-processing-time-first scheduling https://en.wikipedia.org/wiki/Longest-processing-time-first_scheduling; Foundations of Software Engineering 2025 journal-first entry https://conf.researchr.org/details/fse-2025/fse-2025-journal-first/45/The-Effects-of-Computational-Resources-on-Flaky-Tests; arXiv pages https://arxiv.org/abs/2310.12132 and https://arxiv.org/abs/2207.01047; ar5iv rendering https://ar5iv.labs.arxiv.org/html/2310.12132.

## Checked by the session against this repository (2026-10-12, npm 11.11.0, registry pointed at a local recording server, empty cache)

- In a project without eslint, `npx eslint --version` requested the eslint package from the registry (it would install it).
- `npx --no eslint --version` printed npm's own version and exited 0: npm took `--version` for itself, so this spelling reports a missing eslint as present.
- `npx --no -- eslint --version` still requested the eslint package's metadata from the registry before refusing.
- `npx --offline --no -- eslint --version` made no request and failed with ENOTCACHED; in this repository, where eslint is installed, it ran eslint 9.39.4 and made no request.

## Papers downloaded

- .ctoc/papers/flaky-tests/silva-2024-computational-resources-flaky-tests.pdf (399773 bytes)
- .ctoc/papers/flaky-tests/hashemi-2022-flaky-tests-in-javascript.pdf (1227709 bytes)
- Practical Regression Test Selection with Dynamic File Dependencies [paper not fetched]: the address is a page, not a paper file over fifty kilobytes (named under Failures below).

## Failures (session)

1. Practical Regression Test Selection with Dynamic File Dependencies: not fetched; the fixed program reported "not a paper file over fifty kilobytes" for its page address.
2. The three researched questions are summarised in one section above; their full decision matrices were not copied into this file.
