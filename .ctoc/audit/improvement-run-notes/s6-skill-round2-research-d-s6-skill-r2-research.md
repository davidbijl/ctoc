# Round 2 research report: `skills/architecture/dependency-analyzer/SKILL.md`, read 2026-10-05

**Result.** I found no fabricated citation in the current file. Three things should change:

1. **The pydeps recipe can miss cycles (high).** pydeps drops every module more than `--max-bacon` hops from the target before it looks for cycles. The recipe passes `--max-bacon 2`, so a cycle further out is never reported, and the empty result looks like a clean pass.
2. **Go and Rust imports disagree with the agent (medium).** Step 2 and Step 3 send every Go import and every Rust `use` to the could-not-resolve list. The agent sends only the project's own Go imports and the Rust `crate::`, `self::`, `super::` and `mod` forms. Under the skill's rule, `import "fmt"` alone stops any Go project from ever reading "no cycles".
3. **Five spots still use unexplained abbreviations (low):** TU, SVG twice, CI, and TS/ESM/AMD.

**Fingerprint not checked.** No shell is available in this session, so I could not compute the sha256. The file I read has 433 lines, which matches the plan's end-of-round-1 count.

**Budget overrun.** I made 36 fetches and 7 searches against a budget of about 28 fetches. The extra fetches went to the pydeps source, the madge parser source and tsort retries after HTTP 429.

**Injected instructions.** No page or file I read addressed the reviewer.

---

## (a) Queries

1. Empirical work on architecture smells (cyclic, hub-like and unstable dependency) and change-proneness, by Arcelli Fontana, Sas, Avgeriou and others. This was a search, followed by the arXiv application programming interface for 2203.08702, 2303.17862 and 2010.15978.
2. Digital object identifiers for the candidate studies:
   - A Crossref bibliographic query for Jolak and others, 2025.
   - Semantic Scholar records for:
     - 10.1109/TSE.2019.2910856 (Mo and others, IEEE Transactions on Software Engineering, 2021);
     - 10.1016/j.jss.2025.112382 (Jolak and others, Journal of Systems and Software, 2025);
     - 10.1002/smr.2398 (Sas and others, Journal of Software: Evolution and Process).
3. The ISO/IEC 25010:2023 maintainability sub-characteristics: a search, then iso.org page 78176, which returned HTTP 403.
4. ISO/IEC 5055 and the Object Management Group maintainability measure: the CWE-1047 web page (memberships, taxonomy mappings) and the MITRE application programming interface record for entries 1047 and 1054.
5. Agency guidance at the boundary with dependency-checker. Searches only:
   - NIST SP 800-218 practice PS.3.2;
   - the CISA minimum elements for a software bill of materials, element "Dependency Relationship".
6. Re-verifying round 1's `not_reverified` items:
   - madge: README, the source of the TypeScript parser it uses (`detective-typescript@14`), and the source of the ES6 parser (`detective-es6`);
   - Martin 1994 and 2000 (PDF), plus a search for a text mirror;
   - the Go specification, as a fetch and as a domain-limited search;
   - the TypeScript `verbatimModuleSyntax` page;
   - Falleri 2011 (PDF);
   - the Oyetoyan 2015 HAL abstract;
   - the 23 leftovers, against the sources each one names.
7. Tool facts round 1 left open:
   - whether `depcruise` reads a configuration file when `--config` is not given (round 1's rejected f-s6-skill-r1-54);
   - how pydeps orders `--max-bacon` and cycle detection (cli.py and depgraph.py).
8. Repository presence checks, which are all legitimate exact-string checks:
   - the header of `tests/skill-loading.test.js`;
   - `.ctoc/reachability-baseline.json`;
   - the integrator's `tools:` line;
   - the required fields in `.ctoc/architecture/refinement-loop-schema.json`;
   - `docs/REFINEMENT_LOOP.md`;
   - whether `.ctoc/baselines/` holds a dependency-graph file;
   - the architecture-checker description;
   - agent lines 109, 264 and 1112.

## (b) Sources (all read 2026-10-05)

| Address | Outcome | Quote or error |
|---|---|---|
| raw.githubusercontent.com/pahen/madge/master/README.md | supported | "fileExtensions \| Array \| ['js']"; "TypeScript config for resolving aliased modules"; "Save graph as a SVG image (requires Graphviz)". No exit code is stated. |
| unpkg.com/detective-typescript@14/index.js | supported | `if (node.specifiers?.length && node.specifiers.every(n => n.importKind === 'type')) { return true; }` (inside `isTypeImports`) |
| raw.githubusercontent.com/dependents/node-detective-es6/main/index.js | did not bear | `if (options.skipTypeImports && node.importKind === 'type')`. The ES6 parser checks only at declaration level. |
| raw.githubusercontent.com/dependents/node-detective-typescript/main/index.js | unreachable | HTTP 404 |
| staff.cs.utu.fi/.../DesignPrinciplesAndPatterns.pdf | unreachable as text | The returned PDF is compressed and could not be read as text. The saved copy lies outside the repository root, so I did not open it. |
| linux.ime.usp.br/.../oodmetrics.pdf | unreachable as text | Same as above. |
| rmod-files.lille.inria.fr/.../Fall11a-Tools2011-UndesirableCycles.pdf | unreachable as text | Same as above. |
| go.dev/ref/spec | partial | "Language version go1.27 (May 26, 2026)". The page was cut off before Import declarations. A go.dev-only search returned the sentence as a search summary, not as a page read. |
| typescriptlang.org/tsconfig/verbatimModuleSyntax.html | supported | "// Erased away entirely." and "// Rewritten to 'import {} from "xyz";'" |
| typing.python.org/en/latest/spec/directives.html | supported | "considered `True` during type checking (or other static analysis) but `False` at runtime" |
| cwe-api.mitre.org/api/v1/cwe/weakness/1047,1054 | supported | "This entry is primarily a quality issue with no direct security implications." (both entries); "a vertical utility layer that can be referenced from any horizontal layer" |
| cwe.mitre.org/data/definitions/1047.html | supported | Member of "CISQ Quality Measures - Maintainability" (category 1307); taxonomy mapping "OMG ASCMM, ASCMM-MNT-7"; also mapped to OMG ASCRM, ASCRM-RLB-13 |
| api.archives-ouvertes.fr ... hal-01203525 | supported | "(1) the presence of cycles can have a significant impact on the change proneness of the classes near these cycles and (2) neither subtype knowledge nor the location of the cycle within the package containment tree are suitable criteria to distinguish between critical and harmless cycles." DOI 10.1109/SANER.2015.7081834; four authors. |
| api.crossref.org/works/10.1137/0201010 | supported | "Depth-First Search and Linear Graph Algorithms", SIAM Journal on Computing 1(2), 146-160, June 1972 |
| raw.githubusercontent.com/clarkware/jdepend/master/docs/JDepend.html | supported | "I = Ce / (Ce + Ca)"; "The perpendicular distance of a package from the idealized line A + I = 1."; "Package dependency cycles are reported along with the hierarchical paths…"; `java jdepend.textui.JDepend [-components <components>] [-file <output file>] <directory>` |
| ndepend.com/docs/code-metrics | supported | "Assemblies where NormDistFromMainSeq is higher than 0.7 might be problematic." (heading "Metrics on Assemblies"; Relational Cohesion is defined there) |
| ndepend.com/docs/ndepend-console | supported | "It must be specified as the first argument."; "/CreateProject or /cp …"; /OutDir is used "to override the output directory specified in the NDepend project file." |
| archunit.org/userguide/html/000_Index.html | supported | "It does so by analyzing given Java bytecode"; the `slices().matching(...).should().beFreeOfCycles()` and `layeredArchitecture().consideringAllDependencies()` examples |
| docs.oracle.com/en/java/javase/25/docs/specs/man/jdeps.html | supported | --check: "…It also identifies any unused qualified exports."; --multi-release: "Specifies the version when processing multi-release JAR files." The words "cycle" and "split" do not appear. |
| gnu.org/software/coreutils/manual/html_node/tsort-invocation.html | supported (third try; two HTTP 429) | "`tsort` reads its input as pairs of strings, separated by blanks…"; "writes the first cycle encountered to standard error" |
| raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/cli.md | supported | No `sarif` among the --output-type values. "As of version 13 picking up a config file is the default, so you don't need to specify `--config` anymore…". The err reporter exits "with exit code _number of violations with severity `error` found_". |
| raw.githubusercontent.com/thebjorn/pydeps/master/README.rst | supported | "show only import cycles"; "exclude nodes that are more than n hops away (default=2, 0 -> infinite)"; "any cycles in the dependency graph are highlighted as blue boxes by default"; "pydeps finds imports by looking for import-opcodes in python bytecodes" |
| raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/cli.py | supported | `if _args.max_bacon == 0: _args.max_bacon = sys.maxsize`. No line ties `max_bacon` to `show_cycles`. |
| raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/depgraph.py | **refutes the recipe** | In `DepGraph.__init__`, in this order: `self.exclude_bacon(self.args['max_bacon'])` … `self.remove_excluded()` … `self.find_import_cycles()`. Cycles are components found with Kosaraju's algorithm, keeping components with more than one node (`len(c) > 1`). |
| pypi.org/pypi/import-linter/json | supported | version 2.15, `grimp>=3.17`, uploaded 2026-09-04 |
| postgresql.org/docs/current/information-schema.html | supported | "PostgreSQL 18"; "…but PostgreSQL does not enforce this restriction." |
| api.semanticscholar.org, DOI 10.1109/TSE.2019.2910856 | supported (round 2 class) | "files involved in these architecture anti-patterns are more error-prone and change-prone"; IEEE Transactions on Software Engineering 47, 1008-1028 |
| api.semanticscholar.org, DOI 10.1002/smr.2398 | metadata only | Title and authors confirmed. The abstract came back paraphrased, so it is not usable as a quote. |
| api.semanticscholar.org, DOI 10.1016/j.jss.2025.112382 | metadata only | No abstract returned. |
| export.arxiv.org, ids 2203.08702, 2303.17862, 2010.15978 | supported | Abstracts read. 2010.15978: "We found no significant relationship between architectural smells and software vulnerabilities." Peer-review status not established. |
| iso.org/standard/78176.html | unreachable | HTTP 403 |

## (c) Verdicts on every citation-shaped claim in the current file

**Validated against a source read today (2026-10-05):**
- **Line 34:** the agent's `target_skill` (agent line 11).
- **Line 35:** the test header, lines 9 to 14 ("nothing loads a specialist on a phrase match").
- **Line 45, cycle tools:** ArchUnit `beFreeOfCycles`, JDepend cycles, pydeps `--show-cycles` and the statement that jdeps has no cycle option are validated. madge `--circular` is supported by the agent's runs, but its exit code is not in the README.
- **Line 47:** JDepend's formula for I.
- **Line 48:** JDepend's definition of D, and NDepend's 0.7 for assemblies.
- **Line 49:** the TypeScript quote and its rewrite to `import {} from "xyz";`, and the typing-specification quote.
- **Line 104:** Tarjan 1972 (Crossref).
- **Line 110:** the Oyetoyan 2015 quote and its digital object identifier; the MITRE quote; the CWE-1047 name.
- **Line 122:** the CWE-1054 name, minus the parenthetical "(Layer-skipping Call)", which the skill attributes to ISO and which I did not re-read.
- **Line 137:** the architecture-checker description names missing module boundaries.
- **Lines 169 to 175 (madge):** the default `['js']`, `tsConfig`, Graphviz, and the over-skip of inline `type` imports. The parser madge 8.0.0 installs, detective-typescript 14, returns true from `isTypeImports` when every specifier is `type`.
- **Line 200:** import-linter 2.15 requires `grimp>=3.17`; this is still the latest release.
- **Lines 221 to 226:** jdeps `--check`, JDepend `-file`, and ArchUnit reading bytecode.
- **Lines 248 and 249:** NDepend.Console arguments; I, A, D and RelationalCohesion per assembly.
- **Line 270:** both tsort quotes.
- **Line 299:** PostgreSQL 18, "does not enforce".
- **Tool table:**
  - dependency-cruiser: no reporter for the Static Analysis Results Interchange Format, the standard file format for analysis results;
  - madge;
  - JDepend;
  - ArchUnit;
  - jdeps `--multi-release`;
  - NDepend;
  - pydeps: bytecode, blue boxes.
- **Lines 376, 386 and 427 (repository facts):**
  - the refinement loop is NOT RUNNING (`docs/REFINEMENT_LOOP.md` line 8);
  - `v8-dispatcher.js` is in the reachability baseline (line 31);
  - the integrator's tools are `Read, Write, Edit`;
  - no `dependency-graph` file under `.ctoc/baselines/`;
  - the schema's `issue` requires `current_behaviour`, `observable_test_conditions` and `raised_by`. I saw those three of the eight fields named.

**The 23 leftovers:**

| Leftover | Verdict |
|---|---|
| A1, A2 (code fence) | Validated by reading: the fence opens with four backticks at line 321 and closes at line 372, with the inner three-backtick blocks at lines 337 and 343. |
| B1 (line 69), B5 (line 388), B6 (line 137) | Present and consistent. |
| B2 (line 162) | Consistent with the agent, which also has no Go, Rust or PHP recipes. |
| B3 (line 122) | Matches agent line 178. |
| B4 (line 270) | VALIDATED. |
| C1 (JDepend), C2 (NDepend), C3 (ArchUnit) | VALIDATED. |
| D5 (jdeps row) | VALIDATED. |
| D1 to D4, D6, D7 | The abbreviation expansions are present. Other abbreviations remain on other lines; see candidate 4. |
| E3 (`.ctoc/audit/agent-and-skill-improvement/for-the-human.json`) | "agent line 264" is VALIDATED: "This agent does not compute abstractness". |
| E1, E2, E4 | Present. Their content is a repository-check statement, not a web citation. |
| The ArchUnit "Java"-only claim | VALIDATED: the guide calls it a library "for checking the architecture of your Java code". The guide's Kotlin passage is about writing the tests in Kotlin, so no change is needed. |

**Not re-verified this round, carried from earlier rounds:**
- Martin 1994 page 6, and Martin 2000 pages 18 and 24 (lines 46, 110 and 133).
- Falleri 2011 pages 5 and 9 (lines 104 and 110).
- ISO/IEC 5055 clause numbers 7.1.25 and 7.1.11.

The reason is the same for all of them: the PDFs could not be read as text, and the saved copies sit outside the repository root. The CWE web page partly backs the 5055 claim by mapping CWE-1047 to OMG ASCMM-MNT-7 and its maintainability category.

**Go specification (line 96):** corroborated only by a go.dev-limited search summary ("It is illegal for a package to import itself, directly or indirectly, or to directly import a package without referring to any of its exported identifiers"). I could not read it on the page, because the fetch was cut off. Medium confidence.

**madge run facts (lines 169 to 175 and 317):** exit status 1, "Found 4 circular dependencies!" and the stack trace come from runs in the agent's rounds. I could not re-run them without a shell.

**Carried from round 1, not re-fetched:**
- dependency-cruiser's rules reference;
- NsDepCop;
- include-what-you-use and cinclude2dot;
- clang `-MMD`;
- cpp-dependencies;
- CMake;
- the three PostgreSQL view pages;
- import-linter's documentation pages.

**Nothing was FABRICATED, MISATTRIBUTED or STALE.**

**Orders the agent cannot carry out:** none. Every order fits Read, Grep, Glob and Bash. The Python `ast` order assumes a Python interpreter is installed on the machine; I list that under (e).

**Claims that a mechanism runs when it does not:** none. Every refinement-loop passage carries the NOT RUNNING marker, which I validated.

## (d) Candidate improvements

**1. pydeps recipe (high, in this file only).**
- Current text, lines 198 and 199:
  ```
  # pydeps: visual + cycle detection
  pydeps mypackage --show-cycles --max-bacon 2 --noshow -o deps.svg
  ```
- Proposed:
  ```
  # pydeps drops modules more than --max-bacon hops from the target before it looks for cycles; 0 keeps every module
  pydeps mypackage --show-cycles --max-bacon 0 --noshow -o deps.svg
  ```
- Sources: pydeps `cli.py` ("0 -> infinite") and `depgraph.py` (`exclude_bacon` → `remove_excluded` → `find_import_cycles`), master branch, read 2026-10-05. Not run.

**2. Go and Rust agreement with the agent (medium, in this file only).**
- Current text, line 96: "Go `import` declarations, Rust `use` and `mod` items, and PHP `use` are extracted but not resolved: each goes on the could-not-resolve list with the reason "no resolution rule for this language"."
- Proposed: "Go `import` declarations, Rust `use` and `mod` items, and PHP `use` are extracted but not resolved. Every Go import whose path begins with the `module` path in `go.mod`, every Rust `use crate::`, `use self::`, `use super::` and `mod` item, and every PHP `use` goes on the could-not-resolve list with the reason "no resolution rule for this language"; never classify one of them as external."
- Also in Step 3, line 101, current text: "any Go, Rust or PHP import". Proposed: "a Go, Rust or PHP import that Step 2 sends there".
- Source: agent line 109.

**3. dependency-cruiser configuration default (medium, in this file only).** This settles round 1's rejected f-s6-skill-r1-54. Its worry, that a run with no `--config` applies no rule, is refuted for version 13 and later.
- Current text, line 166: `# dependency-cruiser: rules-based, supports CommonJS, ESM, AMD, TS path mapping`
- Proposed: `# dependency-cruiser: rules-based; reads CommonJS, ECMAScript modules, AMD (Asynchronous Module Definition) and TypeScript path mappings. Since version 13 it reads .dependency-cruiser.js (or .cjs, .mjs, .ts, .cts, .mts, .json) without --config; the err reporter exits with the number of error-severity violations.`
- Source: `cli.md`, read 2026-10-05. What it checks when no configuration file exists was not checked.

**4. Plain words (low, in this file only).**
- Line 277, current text: `scans each TU to P1689R5 .ddi files`. Proposed: `scans each translation unit to P1689R5 .ddi files`.
- Line 306, current text: `SVG image, which needs Graphviz`. Proposed: `Scalable Vector Graphics (SVG) image, which needs Graphviz`.
- Line 312, current text: `Bytecode-level imports, SVG, highlights cycles in blue`. Proposed: `Bytecode-level imports, an SVG image, cycles highlighted as blue boxes`. This matches the README wording.
- Line 371, current text: `4. Add dependency-cruiser / import-linter / ArchUnit rules to CI`. Proposed: `4. Add dependency-cruiser / import-linter / ArchUnit rules to continuous integration`. The closing fence on line 372 stays as it is. This line is in the template the agent prints for the human.
- Line 406, current text: `TS import-type`. Proposed: `TypeScript import type`.
- Source: Operating Lesson 13 in `CLAUDE.md`.

**5. Empirical basis for grading runtime cycles high (low, in this file only).**
- Current text, line 110: "This skill follows the 2015 result."
- Proposed: "This skill follows the 2015 result, which also found that "the presence of cycles can have a significant impact on the change proneness of the classes near these cycles" (same abstract, read 2026-10-05)."
- This is a peer-reviewed source (SANER 2015) that was already cited, and it is the only quote from this round's source class that bears directly on a sentence in the file.

**For the human (one recommended option each):**
- **H1. The `when_to_load` phrase "dependency graph" (a frozen key, by round 1's practice).** In software-bill-of-materials guidance, "dependency relationship" means the graph between packages, which is the dependency-checker's side. Recommended: **keep it as it is**. Nothing loads a skill on a phrase (test lines 9 to 14), and the description and the Role already hand third-party packages to `security/dependency-checker`. My sources for the bill-of-materials definitions are search summaries only, so they do not justify editing a frozen key.
- **H2. Owner entry `h-s6-skill-r1-categories-without-a-source` (another file).** A published alternative to the "Ca ≥ 8" cut-off may exist: the Arcan tool's Hub-Like Dependency smell, defined relative to the system median. I saw it only in a search summary. Recommended: **no change to the entry now**. Read the primary definition in round 3 first, because a summary is not a source.

**Considered, no change:**
- **ISO/IEC 25010:2023.** Neither the skill nor the agent cites it. Adding its definition of modularity would add a citation without changing any instruction. The primary source was not reached (HTTP 403).
- **The ISO/IEC 5055 framing** ("quality weakness, not a vulnerability") is correct per MITRE. Naming the "maintainability measure" would be precise but changes nothing the agent does.
- **NIST SP 800-218 and the CISA bill-of-materials guidance** concern components, which is dependency-checker's side. The current boundary sentence is enough.
- **Mo and others (IEEE Transactions on Software Engineering, 2021)** shows architecture anti-patterns predict error-proneness and change-proneness. It does not map onto any category here, and its abstract names "Unstable Interface" and "Crossing", not cycles.

## (e) What I did not reach

- **Martin 1994 and 2000, Falleri 2011, and the ISO/IEC 5055 preview clause numbers.** The PDFs could not be read as text and the saved copies are outside the repository. Next route: a text-layer copy inside the repository, or a dispatch that is allowed to read the cached PDF.
- **The Go specification sentence on the page itself.** The fetch was cut off; I have it only from a search summary.
- **The madge 8.0.0 run facts and every example.** Nothing was re-run without a shell. In particular, the pydeps recommendation in candidate 1 rests on reading the source code, not on a run, and the installed pydeps version was not checked.
- **Abstracts for Sas and others (Journal of Software: Evolution and Process) and Jolak and others (Journal of Systems and Software, 2025).** Neither came back as a quotable abstract, and the Arcan definitions of Hub-Like and Unstable Dependency were not read at a primary source. These are round 3 leads.
- **The ISO/IEC 25010:2023 primary page.** HTTP 403; only secondary definitions were seen.
- **The sources carried from round 1 and not re-fetched,** listed at the end of (c).
- **What the agent should do with Python files when no Python interpreter is available.** Neither file says.
- **The file's sha256.** No shell is available in this session.

Files: `<home>/Code/ctoc/skills/architecture/dependency-analyzer/SKILL.md`, `<home>/Code/ctoc/agents/architecture/dependency-analyzer.md` (line 109 for candidate 2, line 1112, line 264), `<home>/Code/ctoc/.ctoc/audit/agent-and-skill-improvement/skills/architecture/dependency-analyzer/SKILL.md.json`, `<home>/Code/ctoc/.ctoc/audit/agent-and-skill-improvement/for-the-human.json`, `<home>/Code/ctoc/plans/in-progress/00266-every-agent-and-specialist-skill-improved-three-times-s6-dependency-analyzer.md`.

Sources:
- [pydeps depgraph.py](https://raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/depgraph.py) · [pydeps cli.py](https://raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/cli.py) · [pydeps README](https://raw.githubusercontent.com/thebjorn/pydeps/master/README.rst)
- [madge README](https://raw.githubusercontent.com/pahen/madge/master/README.md) · [detective-typescript@14](https://unpkg.com/detective-typescript@14/index.js) · [detective-es6](https://raw.githubusercontent.com/dependents/node-detective-es6/main/index.js)
- [dependency-cruiser cli.md](https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/cli.md) · [import-linter PyPI](https://pypi.org/pypi/import-linter/json)
- [JDepend](https://raw.githubusercontent.com/clarkware/jdepend/master/docs/JDepend.html) · [jdeps 25](https://docs.oracle.com/en/java/javase/25/docs/specs/man/jdeps.html) · [ArchUnit guide](https://www.archunit.org/userguide/html/000_Index.html) · [NDepend metrics](https://www.ndepend.com/docs/code-metrics) · [NDepend console](https://www.ndepend.com/docs/ndepend-console)
- [tsort](https://www.gnu.org/software/coreutils/manual/html_node/tsort-invocation.html) · [PostgreSQL information schema](https://www.postgresql.org/docs/current/information-schema.html) · [typing spec](https://typing.python.org/en/latest/spec/directives.html) · [TypeScript verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html) · [Go spec](https://go.dev/ref/spec)
- [CWE API 1047,1054](https://cwe-api.mitre.org/api/v1/cwe/weakness/1047,1054) · [CWE-1047 page](https://cwe.mitre.org/data/definitions/1047.html) · [Crossref Tarjan](https://api.crossref.org/works/10.1137/0201010) · [Oyetoyan 2015 HAL](https://api.archives-ouvertes.fr/search/?q=halId_s:hal-01203525&fl=abstract_s)
- [Mo et al. TSE 2021](https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/TSE.2019.2910856) · [Sas et al. JSEP](https://api.semanticscholar.org/graph/v1/paper/DOI:10.1002/smr.2398) · [Jolak et al. JSS 2025](https://api.semanticscholar.org/graph/v1/paper/DOI:10.1016/j.jss.2025.112382) · [arXiv 2203.08702, 2303.17862, 2010.15978](http://export.arxiv.org/api/query?id_list=2203.08702,2303.17862,2010.15978)
- Search leads only: [NIST SP 800-218](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-218.pdf) · [CISA 2025 minimum elements for a software bill of materials](https://www.cisa.gov/sites/default/files/2025-08/2025_CISA_SBOM_Minimum_Elements.pdf) · [arc42 ISO 25010](https://quality.arc42.org/standards/iso-25010) · [Sas 2019 instability smells](https://darius-sas.github.io/research/papers/2019_icsme.pdf)
