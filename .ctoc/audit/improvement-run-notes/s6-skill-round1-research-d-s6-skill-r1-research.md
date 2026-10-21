# Dependency-analyzer skill, round 1 research (read-only): citation verdicts and candidate fixes

**Verdict.** Of the 66 claims checked, 25 are VALIDATED, 7 are FABRICATED, 21 are UNSOURCEABLE, 2 are MISATTRIBUTED and 3 are STALE. Eight could not be checked (marked "not reached"). The skill `skills/architecture/dependency-analyzer/SKILL.md` (sha256 `8391851a…`) cannot ship as it stands, for four reasons:

1. **Wrong tool commands.** The `jdeps` line, the NDepend command and the `tsort` recipe are contradicted by the tools' own manuals.
2. **No source behind any threshold or severity grade.** Every threshold and every grade by cycle length is unsupported, and each contradicts the finished agent.
3. **Refinement-loop sections describe something that does not run.** They describe a loop the repository records as not running, and they label as its contract a letter shape that does not match the schema file.
4. **Gate number.** Line 41 names a gate by its number.

No file and no web page contained text addressed to the reviewer or validator, so there is no injection finding.

**How the web sources were read.** All 29 fetches went through the fetch tool's summarizer, not raw bytes. The grimp read shows that summarizer making a factual error, so each web quote below is "as returned by the summarizer". That is one fetch over the budget of about 28. Three fetches failed: two returned 404 and one returned 429 and was retried.

---

## (a) Queries

**Web searches:** none. Every web read was a direct fetch of a known address. The fetch prompts asked for exact quotes on:
- jdeps: `--check`, `--multi-release`, the synopsis, and any use of "split" or "cycle".
- dependency-cruiser: the reporter list (is SARIF in it?), `--include-only`, the default config file names, the err reporter's exit code, and the current version.
- import-linter: the contract types, the order layers are listed in, `[importlinter]` and `root_package`, the acyclic-siblings contract, and the version and grimp requirement.
- grimp: the current version.
- pydeps: how it finds imports, `--show-cycles`, `--max-bacon`, `--noshow`, `-o`, the colour of cycles, and the Graphviz requirement.
- ArchUnit: the layered example, `beFreeOfCycles`, the JUnit 5 form, and bytecode analysis.
- JDepend: the formulas for I and D, the command lines, cycle reporting, and the version.
- NsDepCop: the configuration file's elements and attributes, the package, and the supported versions.
- NDepend.Console: the first argument, `/OutDir`, and the multi-OS build.
- include-what-you-use: `iwyu_tool.py -p`, `--no_fwd_decls`, C support, and how options are passed.
- `tsort`: its input format and how it signals a cycle.
- cpp-dependencies: `--dir`, `--graph`, cycle reporting, and C++20 modules.
- CMake: the version that added modules, P1689R5, `.ddi`, `CXXModules.json`, and whether these are stable.
- PostgreSQL: `unique_constraint_name`.
- SemVer: the FAQ answer on deprecation.
- madge: `--image` and Graphviz, the algorithm it uses for cycles, and `tsConfig`.
- cinclude2dot: its options.

**Local checks, presence only:**
- "6.9.8" and "leaf-node sweep" in `CHANGELOG.md` and `docs/**`: 0 hits.
- Any file under `.ctoc/baselines/`: 0 files.
- "dependency-graph" anywhere in the repository: 4 files, none under `src/`.
- The gate-numbers fence test naming `skills/`: no match.
- The required frontmatter fields in `tests/skill-loading.test.js` (line 33): `effort_level` is required.
- The word "frozen" in the plan: lines 324 and 499.

## (b) Sources read (all on 2026-10-05, through the fetch tool's summarizer)

| # | Address | Result |
|---|---|---|
| 1 | https://docs.oracle.com/en/java/javase/25/docs/specs/man/jdeps.html | supported or refuted, see (c) |
| 2 | https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/cli.md | read |
| 3 | https://import-linter.readthedocs.io/en/stable/contract_types.html | **404** |
| 4 | https://import-linter.readthedocs.io/en/stable/ | read |
| 5 | https://registry.npmjs.org/dependency-cruiser/latest | read |
| 6 | https://raw.githubusercontent.com/thebjorn/pydeps/master/README.rst | read |
| 7 | https://import-linter.readthedocs.io/en/stable/contract_types/acyclic_siblings/ | read |
| 8 | https://import-linter.readthedocs.io/en/stable/contract_types/layers/ | read |
| 9 | https://pypi.org/pypi/import-linter/json | read |
| 10 | https://pypi.org/pypi/grimp/json | read; **the summarizer was partly wrong** (it said there were no releases 3.1 to 3.16) |
| 11 | https://import-linter.readthedocs.io/en/stable/get_started/configure/ | partial: no command-line text |
| 12 | https://www.archunit.org/userguide/html/000_Index.html | read |
| 13 | https://github.com/clarkware/jdepend | nothing useful |
| 14 | https://github.com/realvizu/NsDepCop | partial |
| 15 | https://raw.githubusercontent.com/clarkware/jdepend/master/docs/JDepend.html | read |
| 16 | https://raw.githubusercontent.com/realvizu/NsDepCop/master/docs/Help.md | **404** |
| 17 | https://raw.githubusercontent.com/realvizu/NsDepCop/master/README.md | read |
| 18 | https://www.ndepend.com/docs/ndepend-console | read |
| 19 | https://raw.githubusercontent.com/realvizu/NsDepCop/master/doc/Help.md | read |
| 20 | https://raw.githubusercontent.com/include-what-you-use/include-what-you-use/master/README.md | read |
| 21 | https://www.gnu.org/software/coreutils/manual/html_node/tsort-invocation.html | **429**, then read on retry |
| 22 | https://raw.githubusercontent.com/tomtom-international/cpp-dependencies/master/README.md | read |
| 23 | https://cmake.org/cmake/help/latest/manual/cmake-cxxmodules.7.html | read |
| 24 | https://www.postgresql.org/docs/current/infoschema-referential-constraints.html | read |
| 25 | https://semver.org/ | read |
| 26 | https://raw.githubusercontent.com/include-what-you-use/include-what-you-use/master/iwyu_globals.cc | read |
| 27 | https://raw.githubusercontent.com/pahen/madge/master/README.md | read |
| 28 | https://www.flourish.org/cinclude2dot/ | read |

**Repository files read:**
- the skill;
- the plan, from line 277 to the end;
- `agents/architecture/dependency-analyzer.md` (all 1,201 lines);
- `.ctoc/audit/agent-and-skill-improvement/agents/architecture/dependency-analyzer.md.json` (the source list, and finding f-s6-agent-r1-30);
- `.ctoc/audit/agent-and-skill-improvement/for-the-human.json`, the s6 entries;
- `docs/REFINEMENT_LOOP.md`;
- `.ctoc/architecture/refinement-loop-schema.json`;
- `skills/agent-fragments/warnings-are-critical.md`;
- `skills/agent-fragments/plain-gate-words.md`.

**Settled facts re-used, not redone** (from the agent's record):
- Martin 1994 and 2000: the definition of I, no thresholds, and the four-package rings he calls "This is clearly disastrous."
- Oyetoyan 2015 and Falleri 2011.
- CWE-1047 and CWE-1054: quality weaknesses only, mapping "Prohibited".
- ASCQM clause 9.1: an unweighted count.
- madge 8.0.0: the facts in the brief.
- TypeScript `verbatimModuleSyntax`: "Erased away entirely" for `import type`, and "Rewritten to 'import {} from "xyz";'" for an inline `type` import (read 2026-10-01).

## (c) Verdicts

Severity follows the verdict: FABRICATED is critical; MISATTRIBUTED, UNSOURCEABLE and STALE are high; VALIDATED is information only.

### FABRICATED: the cited source contradicts it

| Line | Claim | Source and exact quote |
|---|---|---|
| 204, 287, 370 | "jdeps … `--check` on a modular project flags split packages"; "split-package detection"; jdeps listed as a cycle engine | jdeps manual (1): `--check` "Analyzes the dependence of the specified modules. It prints the module descriptor, the resulting module dependences after analysis and the graph after transition reduction. It also identifies any unused qualified exports." Neither "split" nor "cycle" appears ("None exist in this document"). The same was found raw in the session's earlier read (f-s6-agent-r1-30). |
| 41 | jdeps "use[s] DFS-based cycle detection" | Same source: there is no cycle option at all. |
| 229 | `NDepend.Console MySolution.sln /OutDir reports/` | (18): "The path to the input _.ndproj_ NDepend project file. It must be specified as the first argument." A `.sln` file appears only under `/CreateProject`: "A path to a Visual Studio solution file." |
| 252 | "run `tsort` on the merged `.d` files; non-empty output = cycle" | (21): "tsort reads its input as pairs of strings, separated by blanks, indicating a partial ordering." and "tsort detects any cycles in the input and writes the first cycle encountered to standard error." So the cycle shows up on standard error with a nonzero exit, not as output. |
| 59–60 | controller → repository is a "Reverse-direction import that crosses two or more layers"; service → controller is "across one layer", rated medium | Contradicted by the skill's own Layer Hierarchy (lines 139–156: controllers at the top, "Flow DOWNWARD only"), so controller → repository is downward. The agent (lines 229–234) rates service → controller as upward and high, and controller → repository as "other forbidden" and medium. |
| 386 | — | Not fabricated; listed under VALIDATED. |

### MISATTRIBUTED: the fact is real but the named source or label is wrong

| Line | Claim | Source and exact quote |
|---|---|---|
| 362–387 | "Letter schema (refinement-loop output contract)" | `.ctoc/architecture/refinement-loop-schema.json` requires `"id", "fingerprint", "severity", "file", "current_behaviour", "expected_behaviour", "observable_test_conditions", "raised_by"`. The skill's fields (`finding_id`, `confidence`, `engine`, `corroborated_by`, `kind`, `target_file`, …) are a different shape. Its fingerprint, `sha256(engine+file+line+kind)[:12]`, also differs from `docs/REFINEMENT_LOOP.md` line 162, `sha256(critic_id + file + line_range + finding_type)[:12]`. |
| 208, 286 | ArchUnit is a "runtime test library" running "Runtime architecture tests" | (12): "It does so by analyzing given Java bytecode, importing all classes into a Java code structure." It analyses compiled bytecode in a test; nothing runs at runtime. |

### STALE

| Line | Claim | Source and exact quote |
|---|---|---|
| 185 | "grimp 3.14+ current" | (9): import-linter "2.15", which requires "grimp>=3.17". (10): grimp version "3.17". Two documents agree, but both were read through the summarizer. |
| 403, 353, 407 | "When invoked as a critic by the Iron Loop integrator …"; "When this skill emits a letter to CTO Chief via the refinement loop" | `docs/REFINEMENT_LOOP.md` lines 8–11: "the loop is **NOT RUNNING** today … As of the last verification (2026-07-30), the loop does not run". Line 25: the integrator's "`tools:` grant holds neither Task nor Bash". |
| 33 | "Auto-loaded when the user prompt matches a when_to_load trigger." | The repository's CLAUDE.md: "The plugin manifest registers only the skills a human types … Specialists are reached by an agent reading `skills/<category>/<name>/SKILL.md` by path". The plan records the same at line 331. A divergence to report, not resolve: this session's installed plugin still lists `ctoc:dependency-analyzer` as a skill, so the installed copy differs from the repository. |

### UNSOURCEABLE: no source found; the specificity should come out or be labelled as the skill's own

**Cycle grading by length.** Lines 54, 66, 67, 106–108, 359 and 360, plus "usually symptom of missing boundary" at line 108.
- Nothing supports this grading.
- Martin 2000 (settled) calls four-package rings "clearly disastrous".
- Oyetoyan 2015 (settled): "neither subtype knowledge nor the location of the cycle within the package containment tree are suitable criteria".
- Divergence finding: Falleri 2011 (settled) ranks the smaller cycle first on a tie ("the less packages it has, the better it is ranked"). The published sources disagree, and the agent follows the 2015 result.

**Thresholds.** Each of these has no source; Martin gives no threshold (settled):
- Ce budgets 0–3, 0–5, 0–10, 0–15 (line 42);
- Ca ≥ 8 (lines 56 and 72);
- Ca > 5 for an unowned module (line 46);
- `I > 0.7` with `Ca > 5` (line 131);
- D > 0.5 (lines 44, 57, 73, 132, 308 and 359). JDepend (15) defines D, "The perpendicular distance of a package from the idealized line A + I = 1.", and gives only "A package squarely on the main sequence is optimally balanced with respect to its abstractness and stability.", no cut-off;
- path depth > 2 (line 135);
- refactor touching > 10 files (line 396);
- foreign-key chain > 5 (line 277).

**Score weights and range** (lines 64–76). ASCQM clause 9.1 is an unweighted count (settled). The agent labels its own weights as "this file's own".

**Performance targets and "incremental mode (diff-only, transitive callers)"** (lines 80–85). No source, and the agent's line 45 says: "never limit the graph to changed files".

**"All use DFS-based cycle detection"** (line 41) and madge "Fast cycle detection via DFS" (line 284). The madge README (27) does not name an algorithm.

**dependency-cruiser "JSON/SARIF output"** (line 283). Its reporter list (2) has 21 names and "'sarif' does not appear anywhere on this page". A third-party plugin was not searched for.

**cinclude2dot `--src=src`** (line 248). The page (28) says only: "For usage instructions, run the script with --help." It does confirm a Perl script, "Version 1.1", whose output "is a dot file".

**C++ tooling claims:**
- "deplint" (line 261): not found.
- "BMI cache encodes the topological order" (line 264): not found.
- cpp-dependencies building a "module graph" (line 293): the README (22) does not mention C++20 modules.

**Repository references:**
- `.ctoc/baselines/dependency-graph.json` (line 383): no such file exists, and no `src/` file names it.
- "v6.9.8" (line 401): no hit.
- "CTOC v7 B2 leaf-node sweep" (line 32): no hit, and "B2" is an invented label.

**Corroboration rule** (line 295): a cycle found by both madge and dependency-cruiser "raises confidence to `high`". This is the skill's own rule. Comparing the two tools' counts is invalid, because madge counts rings, not components (settled: 4 rings for 2 components).

### VALIDATED: keep, with the noted additions

**Instability, line 43.** JDepend (15): "The ratio of efferent coupling (Ce) to total coupling (Ce + Ca) such that I = Ce / (Ce + Ca)." This agrees with Martin (settled).

**Coupling table, lines 338–340.** Recomputed:
- 2/10 = 0.20, and |0.10 + 0.20 − 1| = 0.70;
- 7/10 = 0.70, and D = 0;
- 0/12 = 0, and |0.80 − 1| = 0.20.

There is an inconsistency, though not a citation error. The summary says "Instability Mismatches (D > 0.5) | 2", but the table shows one module above 0.5. The "7.2/10" score cannot be produced by the skill's own penalties: the best case for the stated counts is 10 − 1.1 − 1.0 − 0.3 − 0.6 = 7.0.

**Deprecation, line 45, "at least one minor release".** SemVer FAQ (25): "Before you completely remove the functionality in a new major release there should be at least one minor release that contains the deprecation". The skill's "= high finding" is its own rule.

**Type-only imports, line 47.** True only for the declaration-level `import type`. An inline `type` import is still a runtime import (settled TypeScript quote).

**dependency-cruiser, lines 162–164 and 283:**
- Version (5): "18.5.0", engines "node":"^22||^24||>=26".
- Description (5): "JavaScript, TypeScript, CoffeeScript. ES6, CommonJS, AMD."
- Config names (2): "`.dependency-cruiser.js` (/ `.dependency-cruiser.cjs`/ …".
- The err reporter exits with "_number of violations with severity `error` found_".

**madge `--image`, line 167.** (27): "Save graph as a SVG image (requires Graphviz)".

**pydeps, lines 184 and 290.** (6):
- "pydeps finds imports by looking for import-opcodes in python bytecodes";
- "`--show-cycles` to reduce the graph to just those cycles";
- "any cycles in the dependency graph are highlighted as blue boxes by default";
- Graphviz `dot` is needed.

**import-linter layer order, lines 189–198.** (8): "The order is from higher to lower level layers." The tool list at line 291 is incomplete; (4) also lists "**Protected**" and "**Acyclic siblings**".

**JDepend command, line 206.** (15): `java jdepend.swingui.JDepend [-components <components>] <directory>`.

**ArchUnit, lines 209–223.** (12): the example matches the skill's code:
- `layeredArchitecture().consideringAllDependencies()…mayNotBeAccessedByAnyLayer()…mayOnlyBeAccessedByLayers("Service")`;
- `slices().matching("com.myapp.(*)...").should().beFreeOfCycles()`;
- `@AnalyzeClasses(packages = …)` with an `@ArchTest … static final ArchRule`.

The guide shows "version 1.5.1". The reference address at line 386 is live.

**NsDepCop, lines 233–241.** (19):
- root element: `<NsDepCopConfig IsEnabled="true" ChildCanDependOnParentImplicitly="true" …>`;
- rules: "`<Allowed From="N1" To="N2"/>`" and "`<Disallowed From="N1" To="N2"/>`";
- (17): "NsDepCop 3.0+": ".NET SDK 6.0+".

**include-what-you-use, lines 245–246.** (20): `iwyu_tool.py -p .`, and "use `CMAKE_C_INCLUDE_WHAT_YOU_USE` for C code".

**`--no_fwd_decls`, line 256.** (26): "--no_fwd_decls: do not use forward declarations." The skill's usage is wrong: (26) gives "USAGE: include-what-you-use [-Xiwyu --iwyu_opt]... <clang opts>".

**CMake, lines 259–260.** (23):
- "Added in version 3.28.";
- "[P1689R5] … files";
- "CMake names these files with the `.ddi` extension";
- "`CXXModules.json` files output from … collate commands";
- "The implementation details are not a stable interface."

**cpp-dependencies, line 262.** (22): "cpp-dependencies --dir example --graph dependencies.dot". Cycles are reported by `--stats`, with output such as "Detected 2 nodes in cycles".

**PostgreSQL join, lines 267–276.** (24): `unique_constraint_name` is the "Name of the unique or primary key constraint that the foreign key constraint references" (PostgreSQL 18). The query itself was not run.

**Letter schema rejects `warn`, line 406.** The schema file: `"enum": ["critical", "medium", "low"]`.

**Fragment restatements, lines 353 and 407.** Both restate `warnings-are-critical.md`: line 11 lists "circular deps", line 15 says "emit each finding with `severity: critical`", and line 17 states the phase rule. The scope of both is "When you run as a critic in the Refinement Loop", which is not running.

**Not a citation, but forbidden.** Line 41 "BLOCK at Gate 3" breaks `plain-gate-words.md` §1: "Never put a gate NUMBER in text a human reads". It also contradicts the agent's split of who owns what (agent line 223: "whether it blocks a change or only warns, is decided by `quality/architecture-checker`").

## (d) Candidate improvements

Each pair is the exact current text, then the proposed text, with its source. One constraint applies to every pair: no new line may copy an agent line of 25 characters or more word for word (the plan's copy check, decision 9).

1. **Line 41.** Current: "New cycles introduced in a PR = BLOCK at Gate 3. Established tools (madge, dependency-cruiser, jdeps, JDepend, import-linter, pydeps) all use DFS-based cycle detection; treat any one of them flagging a cycle as ground truth pending a second-engine corroboration."
   Proposed: "Whether a cycle is new, and whether it blocks a change, is decided by `quality/architecture-checker`; this skill reports every cycle with its files and import lines. Tools that report cycles: madge, dependency-cruiser, JDepend, ArchUnit (`beFreeOfCycles`), pydeps (`--show-cycles`), import-linter (an `acyclic_siblings` contract, between siblings only) and cpp-dependencies (`--stats`). jdeps has no cycle option. Two tools corroborate a cycle only when they name the same set of files."
   Sources: plain-gate-words §1; agent line 223; sources 1, 7, 12, 6, 22; settled madge facts.
2. **Line 54.** Current: "| `circular_dependency` | A cycle exists in the runtime dependency graph (direct A↔B, indirect A→B→C→A, or deep ≥4) | high (direct), medium (indirect), low (type-only) |"
   Proposed: "| `circular_dependency` | A strongly connected component of two or more files, or a file importing itself; its length never changes the grade | high (runtime), low (type-only or test-only) |"
   Sources: Martin 2000 and Oyetoyan 2015 (settled).
3. **Lines 66–67.** Current: "| Direct cycle (A→B→A) | High | -1.0 | UserService ↔ AuthService |" and "| Indirect cycle (A→B→C→A) | Medium | -0.5 | Order → Inventory → Payment → Order |"
   Proposed, as one row: "| Runtime cycle (2 or more files; length does not change the grade) | High | -1.0 | UserService ↔ AuthService; Order → Inventory → Payment → Order |"
   Add under the table: "Weights and range are this skill's own; no published source defines them (ASCQM 1.0 clause 9.1 counts and does not weigh)."
4. **Lines 105–109.** Current: "DFS with `visited` and `on_stack` tracking. Tarjan's SCC for full-graph cycle detection on large repos. Classify:" followed by the four bullets ending "- All edges `type-only` → type-only cycle (low)".
   Proposed: "Find the strongly connected components at every repository size. Each component of two or more nodes is one cycle finding. Classify: every edge runtime → runtime cycle (high), whatever the length; the ring closes only through a `type-only` edge → type-only cycle (low); every node is a test file → test-only cycle (low)."
   Why: a mixed ring does not exist at runtime once `import type` is erased (settled TypeScript quote).
5. **Line 131.** Current: "Flag `I > 0.7` on a module with `Ca > 5` (unstable AND depended on)."
   Proposed: "Use no threshold on I. Report a stable-dependencies violation when a module imports one whose I is higher (Martin 2000, p. 24: \"Depend upon packages whose I metric is lower than yours.\")."
6. **Lines 44, 132, 57, 73, 308 and 359 (D > 0.5).** Strip "> 0.5" from each, and report D as a number. Add: "JDepend defines D as 'The perpendicular distance of a package from the idealized line A + I = 1.' and gives no threshold (https://raw.githubusercontent.com/clarkware/jdepend/master/docs/JDepend.html, read 2026-10-05)."
   This is an in-file change. Removing the `instability_mismatch` value from the `kind` list is **for-the-human** (see 15).
7. **Lines 42, 46, 56, 72, 135, 277 and 396 (the thresholds).** Either label each one as "this skill's own heuristic; no published source", or strip it.
   Removing the categories `high_efferent_coupling`, `high_afferent_coupling_without_abstraction` and `missing_module_boundary` from the letter's `kind` list changes the output contract, so that removal is **for-the-human**.
8. **Lines 203–204.** Current: "# jdeps ships with the JDK; --check on a modular project flags split packages" and "jdeps --multi-release 21 --check com.example.myapp build/libs/app.jar".
   Proposed: "# jdeps (ships with the JDK) lists dependences; its manual has no cycle option. --check <module> 'prints the module descriptor, the resulting module dependences after analysis and the graph after transition reduction' and unused qualified exports (Java SE 25 jdeps manual, read 2026-10-05)". Drop the command line, which was not run here (there is no JDK on this machine).
   Line 287: replace "split-package detection" with "no cycle detection".
9. **Line 166.** Current: "npx madge --circular --extensions ts,tsx src/"
   Proposed: "npx -y madge@8.0.0 --circular --extensions ts,tsx,js,jsx --ts-config tsconfig.json src/  # only when ./tsconfig.json exists: without it alias cycles pass, and the option stops madge with a stack trace when the file is absent".
   Line 167: append "(requires Graphviz)". Sources: settled madge facts; source 27.
10. **Lines 284 and 295.** Replace "Fast cycle detection via DFS" with "Counts rings, not components; reads only `.js` without `--extensions`". Replace "A cycle reported by both madge AND dependency-cruiser raises confidence to `high`." with "Two engines corroborate a cycle only when they report the same set of files; never compare madge's count with this skill's."
11. **Line 283.** Change "JSON/SARIF output" to "JSON output (no SARIF reporter in its `--output-type` list)". Add "dependency-cruiser 18.5.0 (npm, read 2026-10-05)".
12. **Lines 185–199 (import-linter).**
    - Line 185: change "(grimp 3.14+ current)" to "(import-linter 2.15 requires grimp>=3.17; PyPI, read 2026-10-05)".
    - Before `[importlinter:contract:layered]`, add `[importlinter]` and `root_package = myapp`. Source (11): "(Either this or `root_packages` is required.)"
    - Line 291: add "protected, acyclic siblings".
13. **Line 206.** `jdepend.swingui` is the graphical interface. Use `java jdepend.textui.JDepend -file jdepend.txt build/classes/java/main` (syntax from source 15; not run).
    Lines 208 and 286: change "runtime" to "a unit-test library that analyses compiled bytecode" (source 12).
14. **C, C++ and C# commands:**
    - Line 229: `NDepend.Console.exe MyProject.ndproj /OutDir reports/` (source 18).
    - Line 252: delete the `tsort` sentence (source 21).
    - Line 248: drop `--src=src` (source 28).
    - Line 256: replace "add --no_fwd_decls" with "pass `-Xiwyu --no_fwd_decls`" (source 26).
    - Line 261: delete "deplint".
    - Line 262: add `cpp-dependencies --dir src --stats` for cycles (source 22).
    - Line 293: drop "/module".
15. **For-the-human: lines 351–409 (triage table, letter schema, critic mode).** The options, presented flat:
    - (a) Delete these sections.
    - (b) Keep them, marked `NOT RUNNING` with the schema mismatch stated.
    - (c) Realign them to the output contract the dispatcher actually reads.

    This overlaps `h-s6-agent-r3-structured-output-schema`. Whichever option is chosen:
    - remove "New cycle introduced in this PR" from the CRITICAL row (ownership);
    - remove `jdeps` from the `engine` list;
    - remove the absent file `.ctoc/baselines/dependency-graph.json`;
    - remove "(v6.9.8)".
16. **For-the-human: frontmatter.** `model: sonnet` and `effort_level: medium` (lines 19 and 21) disagree with the agent's `opus` and `xhigh`. Both keys are frozen in this slice (plan line 324), and `tests/skill-loading.test.js` line 33 requires `effort_level` to be present.
17. **In-file, lines 32–33.** Delete "as part of CTOC v7 B2 leaf-node sweep" (invented label). Replace "Auto-loaded when the user prompt matches a when_to_load trigger." with "The wrapper agent reads this file by path." Leave the `when_to_load` phrases alone: two are pinned by the corpus at `tests/skill-loading.test.js` lines 188–189.
18. **In-file consistency:**
    - Lines 59–60 and 357–358, and red lines 393–395: align with the agent (upward is high, other forbidden is medium, block or warn belongs to the checker).
    - Lines 80–85: delete the diff-only mode.
    - Line 45: cite SemVer, or delete it as outside the scope of dependency analysis.
    - Line 309: correct the "7.2/10" example, which cannot be produced from its own weights (best case 7.0).
    - Line 308: correct the "2" mismatches against a table that shows 1.

## (e) Not reached

- The citation for Tarjan's algorithm.
- Poetry's `[tool.poetry.packages]` (line 102).
- The dependency-cruiser rule shape (lines 169–177; not re-read this session).
- The `lint-imports --config` flag.
- The NDepend metrics page (RelationalCohesion, CQLinq).
- Python's `typing.TYPE_CHECKING` page.
- The support status of .NET 9 and the "Java 21+" and "Python 3.12+" labels.
- clang `-MD -MF` and the "scan-build" label.
- PostgreSQL's warning that constraint names need not be unique.
- Whether a third-party SARIF reporter exists for dependency-cruiser.
- `.ctoc/architecture/dispatch-schema.yaml` was not read.

Nothing was run or compiled (no JDK, .NET, C, C++ or SQL tool, and no Bash in this grant). The madge findings rest on the earlier session's settled runs.
