I validated all 11 items that the main report did not reach. Of the claims they touch, 8 are validated, 3 are fabricated, 1 is stale and 1 is unsourceable. Three things need follow-up:

- **Tarjan.** The 1972 citation is correct. The skill cites no bibliographic data at all, so the reference has to be added.
- **Not finished.** Java's support status could not be read (Oracle returned 403), and the "dozens of CQLinq queries" claim was not reached.
- **Over budget.** I used 16 fetches and 2 searches against a budget of about 14.

Every web quote below is as returned by the fetch tool's summarizer, not the raw page bytes. No file or page contained text addressed to the validator, so there is no injection finding.

## (a) Queries

**Web searches**
1. `import-linter lint-imports "--config" command line usage`, limited to import-linter.readthedocs.io and github.com.
2. `dependency-cruiser sarif reporter plugin npm`

**Direct fetches**, each asking for verbatim quotes:
- the Crossref record for the Tarjan paper;
- Poetry `pyproject.md`;
- dependency-cruiser `rules-reference.md` (raw);
- the import-linter usage page (returned 404) and its "run the linter" page;
- the NDepend code-metrics page;
- the docs.python.org typing page (truncated) and the typing specification's directives page;
- the .NET support policy;
- the Oracle Java support roadmap (returned 403);
- the Python developer guide's versions page;
- the npm registry search for "dependency-cruiser sarif";
- the old scan-build page (only a redirect notice) and its new address;
- the clang command-line reference;
- the PostgreSQL information schema chapter.

**Local checks.** These are presence checks only; no code path was traced.
- `dispatch-schema` in `src/**/*.js` and `tests/**/*.js`: found in `src/lib/v8-dispatcher.js` and 4 test files.
- `dispatch-schema|dispatch_response|output contract` in the agent file: 0 hits.
- `v8-dispatcher` in `.ctoc/reachability-baseline.json`: found at line 31, inside the `unreachable` list.
- `validat|schema` in `v8-dispatcher.js`.
- I read `v8-dispatcher.js` lines 1–40 and 186–215, and the baseline at lines 3–34.

**Failures**
| Address | What happened |
|---|---|
| https://import-linter.readthedocs.io/en/stable/usage/ | HTTP 404. Replaced by `/get_started/run/`. |
| https://docs.python.org/3/library/typing.html#typing.TYPE_CHECKING | The page was truncated before the `TYPE_CHECKING` entry. Replaced by the typing specification. |
| https://www.oracle.com/java/technologies/java-se-support-roadmap.html | HTTP 403 Forbidden. Not replaced. |
| https://clang-analyzer.llvm.org/scan-build.html | Only a deprecation and redirect notice. I followed the redirect. |
| npm search (`size=20`) | The total was 22 packages; 2 of them were never seen. |

## (b) Sources (all read 2026-10-05)

| # | Address | Exact quote |
|---|---|---|
| S1 | https://api.crossref.org/works/10.1137/0201010 | Title "Depth-First Search and Linear Graph Algorithms"; Author "Robert Tarjan"; "SIAM Journal on Computing"; Volume 1; Issue 2; pages "146-160"; published "June 1972"; DOI "10.1137/0201010" |
| S2 | https://raw.githubusercontent.com/python-poetry/poetry/main/docs/pyproject.md | `packages` is under `[tool.poetry]`: "A list of packages and modules to include in the final distribution."; the example is `packages = [ { include = "my_package" }, … ]`. The summarizer says there is no `[tool.poetry.packages]` table form, and that the setting "does not appear to affect import resolution or path aliases". |
| S3 | https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/rules-reference.md | fields `"name"`, `"severity"`, `"comment"`, `"from"`, `"to"`; severity `"info"`, `"warn"`, `"error"`, `"ignore"`; `path`/`pathNot` are regular expressions ("a single regular expression string or as an array"); `circular`: "A Boolean indicating whether or not to match module dependencies that end up where you started (a.k.a. circular dependencies)."; example `"from": { "pathNot": "^(node_modules)" }, "to": { "circular": true }` |
| S4 | https://import-linter.readthedocs.io/en/stable/get_started/run/ | "`--config`: The configuration file to use. This overrides the default file search strategy. By default it's assumed that the file is an ini-file unless the file extension is `toml`. (Optional.)"; "`lint-imports --config path/to/alternative-config.ini`" |
| S5 | https://www.ndepend.com/docs/code-metrics | Relational cohesion: "H = (R + 1)/ N" and "A good range for RelationalCohesion is 1.5 to 4.0". Instability: "I = Ce / (Ce + Ca)". Distance: "The perpendicular normalized distance of an assembly from the idealized line A + I = 1" and "Assemblies where NormDistFromMainSeq is higher than 0.7 might be problematic." The summarizer says CQLinq is not mentioned for these metrics. |
| S6 | https://typing.python.org/en/latest/spec/directives.html | "the `typing` module defines a constant, `TYPE_CHECKING`, that is considered `True` during type checking (or other static analysis) but `False` at runtime."; example `if typing.TYPE_CHECKING:`; "the type annotation must be enclosed in quotes, making it a "forward reference""; "This approach may also be useful to handle import cycles." |
| S7 | https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core | ".NET 9 \| … November 12, 2024 \| … 9.0.20 \| … Release type: STS \| Support phase: Maintenance \| End of support: November 10, 2026"; ".NET 10 \| … November 11, 2025 \| … LTS \| Support phase: Active \| End of support: November 14, 2028" |
| S8 | https://devguide.python.org/versions/ | "3.12 \| PEP 693 \| security \| 2023-10-02 \| 2028-10"; "3.14 \| PEP 745 \| bugfix \| 2025-10-07 \| 2030-10" |
| S9 | https://clang.llvm.org/docs/ClangCommandLineReference.html | `-MD`: "Write a depfile containing user and system headers"; `-MMD`: "Write a depfile containing user headers"; `-MF<file>`: "Write depfile output from -MMD, -MD, -MM, or -M to <file>" |
| S10 | https://clang.llvm.org/docs/analyzer/user-docs/CommandLineUsage.html | "scan-build is a command line utility that enables a user to run the static analyzer over their codebase as part of performing a regular build"; "The output of scan-build is a set of HTML files, each one which represents a separate bug report." The summarizer reports no mention of dependency files, `.d` files or include graphs. |
| S11 | https://www.postgresql.org/docs/current/information-schema.html (PostgreSQL 18) | "it is possible for a standard-compliant query that expects to return one row to return several. This is because the SQL standard requires constraint names to be unique within a schema, but PostgreSQL does not enforce this restriction. … users can specify such duplicate names. This problem can appear when querying information schema views such as `check_constraint_routine_usage`, `check_constraints`, `domain_constraints`, and `referential_constraints`. Some other views have similar issues but contain the table name to help distinguish duplicate rows, e.g., `constraint_column_usage`, `constraint_table_usage`, `table_constraints`." |
| S12 | https://registry.npmjs.org/-/v1/search?text=dependency-cruiser%20sarif&size=20 | Total 22; 20 were listed. The SARIF (Static Analysis Results Interchange Format) packages found are for ESLint, jscpd, secretlint, stylelint, markdownlint-cli2, oxlint and axe, plus `node-sarif-builder` ("Module to help building SARIF log files"). None is a reporter for dependency-cruiser. |
| S13 | `<home>/Code/ctoc/.ctoc/architecture/dispatch-schema.yaml` | finding `required: [id, severity, type, file, message, confidence, citations]`; confidence `enum: [HIGH, MEDIUM, LOW]`; severity `enum: [critical, high, medium, low, info]`; `citations` `required: [evidence]`, evidence `minItems: 1`; the response requires `self_assessment` `[coverage, confidence_overall]` with optional `limitations` and `unknowns` |
| S14 | `<home>/Code/ctoc/src/lib/v8-dispatcher.js` lines 198–199, and `<home>/Code/ctoc/.ctoc/reachability-baseline.json` line 31 | `if (!response.findings && !response.synthesis) { throw … }` is the only check on a response. `"src/lib/v8-dispatcher.js"` is inside `"unreachable": [`. |

## (c) Verdicts

### Validated (information only)

**Tarjan, line 105.** Current text: "Tarjan's SCC for full-graph cycle detection on large repos." The bibliographic data in the brief is confirmed by S1 (Tarjan, SIAM Journal on Computing 1(2), June 1972), which adds pages 146–160 and the DOI 10.1137/0201010. The skill itself carries no citation; it only names the algorithm.

**dependency-cruiser rule, lines 169–177.** Current text: `forbidden: [{ name: 'no-controller-to-repo', severity: 'error', from: { path: '^src/controllers' }, to: { path: '^src/repositories' }, }]`. The field names, the value `'error'` and the regular-expression `path` all match S3.
- One gap, inferred from S3: the sample has no `to: { circular: true }` rule, so the configuration shown flags no cycles.
- Not checked: whether line 163, which runs without `--config`, applies any rule.

**import-linter, line 182.** Current text: `lint-imports --config .importlinter`. Matches S4.
- Possibly redundant, but this rests only on the search engine's summary of older documentation versions: "If not supplied, Import Linter will look for setup.cfg or .importlinter".

**NDepend metrics, line 228.** Current text: "NDepend (commercial) computes I, A, D, RelationalCohesion". All four metrics are defined in S5, per assembly. The word "commercial" was not checked.

**`TYPE_CHECKING`, lines 47, 68 and 94.** Current text at line 47: "Python `if TYPE_CHECKING:` blocks do not cause runtime cycles." Supported by S6: the constant is "`False` at runtime", and the specification says the approach "may also be useful to handle import cycles".
- Gap: S6's own example is spelled `if typing.TYPE_CHECKING:`, and line 94 names only the bare form.
- The documentation page asked for (docs.python.org) was truncated before the entry; the typing specification is the substitute source.

**Python version, line 179.** Current text: "### Python (3.12+)". As a lower bound this is current: S8 shows 3.12 in security support until 2028-10, and 3.14 receiving bug fixes.

**clang depfiles, line 250.** Current text: `clang -MD -MF deps/foo.d -c src/foo.c`. The flags are correct (S9). But `-MD` includes system headers, which contradicts line 97: "`#include "header.h"` (project headers, not system)". `-MMD` matches line 97.

**Protocol label, frontmatter line 23.** Current text: `dispatch_protocol: v1`. This matches the schema's `protocol_version: const: 1` (S13).

### Fabricated (critical)

**Line 102, Poetry.** Current text: "Resolve aliases (`paths` in `tsconfig.json`, `pyproject.toml`'s `[tool.poetry.packages]`, Java module-info)."
- S2 says `packages` is a key inside `[tool.poetry]` and is "A list of packages and modules to include in the final distribution". It is not an import alias, and the documentation shows no `[tool.poetry.packages]` table.
- Confidence MEDIUM, because the "no effect on import resolution" part is the summarizer's hedged reading.
- Action: correct it (proposal D2).

**Line 249, scan-build.** Current text: "# Clang scan-build / -MD -MF .d files give per-translation-unit dependency facts".
- S10 says scan-build runs the static analyzer and outputs "a set of HTML files, each one which represents a separate bug report". It produces no dependency facts, so it does not belong in the skill.
- Action: remove "scan-build /".

**Lines 268–276, the foreign-key graph query.** Current text: "-- Build the schema dependency graph: each row is an edge child.table -> parent.table", with the joins `ON tc.constraint_name = rc.constraint_name` and `ON rc.unique_constraint_name = ccu.constraint_name`.
- The joins use constraint names only, never the schema columns.
- S11 warns that names need not be unique and names `referential_constraints` as an affected view. The query can therefore pair foreign keys that share a name across schemas, or within one schema, and produce wrong edges.
- "Each row is an edge" is contradicted.
- Confidence MEDIUM: the query was not run.

### Stale (high)

**Line 226, .NET version.** Current text: "### C# / .NET 9". Per S7, .NET 9 is a short-term-support release in maintenance, and its support ends on 10 November 2026, 36 days after the read date. .NET 10 is the current long-term-support release.

### Unsourceable (high)

**Line 283, dependency-cruiser output formats.** Current text: "JSON/SARIF output". The main report's finding stands and is now stronger: there is no third-party SARIF reporter for dependency-cruiser in 20 of the 22 npm results (S12). 2 results were never seen.

### Not reached (no verdict given)

- **Line 288.** Current text: "I/A/D plus dozens of CQLinq queries; commercial". S5 has no CQLinq text, and I made no further fetch for it.
- **Line 201.** Current text: "### Java (21+)". The Oracle roadmap returned 403. Nothing I read contradicts the label, but nothing confirms it either.

### Sources that disagree (not resolved here)

The threshold on D, the distance from the main sequence:
- JDepend gives none (settled in the main report).
- NDepend gives "higher than 0.7 might be problematic" (S5). That is for its normalized D, per assembly.
- The skill uses 0.5 with no source.

This bears on candidate 6 in the main report.

### Item 11: the output contract the dispatcher reads (S13 and S14)

**How the skill's letter compares with the schema's `finding`**

| Skill (lines 366–387) | Schema | Matches? |
|---|---|---|
| `finding_id` | `id` | no |
| `kind` | `type` | no |
| `target_file` | `file` | no |
| `line` | `line_range` (1 or 2 integers) | no |
| `confidence: high \| medium \| low` | `HIGH, MEDIUM, LOW` | no (letter case) |
| `suggested_fix` | `suggestion` | no |
| `reference` | `citations.brief_url` | no |
| none | `citations.evidence` (at least 1, needs `file`) | missing |
| `severity: critical` | allowed in the severity list | yes |
| `message` | `message` | yes |

A letter written to the skill's shape lacks 5 of the schema's 7 required fields (`id`, `type`, `file`, `confidence` in the right letter case, and `citations`).

**The letter matches neither contract.** The main report already showed that it is not the refinement-loop schema either.

**No running code checks this contract.** The only module that names the schema is `src/lib/v8-dispatcher.js`.
- It is on the dead-code debt list.
- Its only check is that `findings` or `synthesis` is present.
- So this contract is followed by instruction, and nothing checks finding shapes.

**Neither file points to the schema.** The skill and the agent never reference `.ctoc/architecture/dispatch-schema.yaml`.
- The citation-validator and watcher-shape tests require the agents they cover to reference the schema by path and not restate its fields.
- Not checked: whether the dependency analyzer is in their scope.

## (d) Candidate improvements

**D1. Line 105.** Current: "DFS with `visited` and `on_stack` tracking. Tarjan's SCC for full-graph cycle detection on large repos. Classify:"
- Keep main-report candidate 4.
- Append: "(Tarjan, R. 1972. "Depth-First Search and Linear Graph Algorithms". SIAM Journal on Computing 1(2): 146–160. doi:10.1137/0201010)".

**D2. Line 102.** Current: as quoted under Fabricated.
- Proposed: "Resolve aliases (`paths` in `tsconfig.json`; Java module-info) and source roots (Poetry's `packages = [{ include = "…", from = "src" }]` under `[tool.poetry]`, which Poetry documents as the packages of the built distribution, not as an import alias)."
- Source: S2.
- Java module-info was not checked.

**D3. Lines 169–177.** Add S3's cycle rule, with `'error'` as the severity so that the `err` reporter's exit code counts cycles:

```js
{ name: 'no-circular', severity: 'error', from: { pathNot: '^(node_modules)' }, to: { circular: true } },
```

**D4. Line 94.** Current: "- **Python**: `import X`, `from X import Y`, distinguish `if TYPE_CHECKING:` blocks."
- Proposed: "… distinguish `if TYPE_CHECKING:` and `if typing.TYPE_CHECKING:` blocks; the constant is "`False` at runtime" (typing specification, read 2026-10-05)."
- Possible addition, not verified: pydeps reads import instructions in compiled bytecode (main report source 6). The body of an `if TYPE_CHECKING:` block is compiled even though it never runs, so pydeps may report type-only rings as real cycles. Check this by running pydeps on a two-file test before adding it.

**D5. Line 226.** Current: "### C# / .NET 9". Proposed: "### C# / .NET". The tool requirement that matters is NsDepCop's ".NET SDK 6.0+" (main report). Source: S7.

**D6. Lines 249–250.**
- Current: "# Clang scan-build / -MD -MF .d files give per-translation-unit dependency facts" and `clang -MD -MF deps/foo.d -c src/foo.c`.
- Proposed: "# clang -MMD -MF writes a depfile of the user (non-system) headers each translation unit includes" and `clang -MMD -MF deps/foo.d -c src/foo.c`.
- Sources: S9 and S10.
- The `tsort` sentence on line 252 is already deleted by main-report candidate 14.

**D7. Lines 268–276.** Join on schema as well as name:
- `ON rc.constraint_schema = tc.constraint_schema AND rc.constraint_name = tc.constraint_name`
- `ON ccu.constraint_schema = rc.unique_constraint_schema AND ccu.constraint_name = rc.unique_constraint_name`
- Also select `tc.table_schema` and `ccu.table_schema`.
- Add to line 277: "PostgreSQL does not enforce unique constraint names within a schema; `referential_constraints` carries no table name, so a repeated foreign-key name can still yield wrong edges (PostgreSQL 18 manual, read 2026-10-05)."
- Not verified: the column names other than `unique_constraint_name` were not re-read this round. Run the query against a database before adopting it.

**D8. Line 228.** Append: "(per assembly; NDepend flags NormDistFromMainSeq > 0.7 and RelationalCohesion outside 1.5–4.0 as "might be problematic", https://www.ndepend.com/docs/code-metrics, read 2026-10-05)".

**D9. Line 288.** Current: "I/A/D plus dozens of CQLinq queries; commercial". Remove "dozens of" until a CQLinq source is read.

**D10. Line 283.** Keep main-report candidate 11. Its evidence is now S3 plus S12.

**D11. For the human: which threshold on D.** The options, presented flat:
- (a) no threshold, as in JDepend;
- (b) NDepend's 0.7, applied to the normalized D per assembly;
- (c) the skill's 0.5, labelled as its own.

**D12. For the human: the output contract, lines 362–389.** This overlaps main-report item 15 and `h-s6-agent-r3-structured-output-schema`. The options, presented flat:
- (a) Replace the section with a pointer to `.ctoc/architecture/dispatch-schema.yaml`. The tool name and the corroborating tools would go in `tags`, the cycle path and metrics in `rationale`, and unresolved imports in `self_assessment.unknowns`.
- (b) Extend the shared schema with optional dependency fields. This changes a contract every agent uses.
- (c) Keep the section, marked as matching neither the dispatcher's contract nor the refinement-loop contract.

Under every option:
- confidence values must use upper case;
- the dead dispatcher module (`v8-dispatcher.js`) means no option is checked by running code.

**Risk.**
- All web quotes passed through a summarizer.
- The Poetry "not an alias" reading and the foreign-key fix are MEDIUM confidence.
- Java support status, CQLinq, and the 2 unseen npm results remain open.

**Relevant files:**
- `<home>/Code/ctoc/skills/architecture/dependency-analyzer/SKILL.md`
- `<home>/Code/ctoc/.ctoc/architecture/dispatch-schema.yaml`
- `<home>/Code/ctoc/src/lib/v8-dispatcher.js`
- `<home>/Code/ctoc/.ctoc/reachability-baseline.json`
- `<home>/Code/ctoc/.ctoc/audit/improvement-run-notes/s6-skill-round1-research-d-s6-skill-r1-research.md`

**Sources:**
- [Crossref, Tarjan 1972](https://api.crossref.org/works/10.1137/0201010)
- [Poetry pyproject.md](https://raw.githubusercontent.com/python-poetry/poetry/main/docs/pyproject.md)
- [dependency-cruiser rules reference](https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/rules-reference.md)
- [import-linter: run the linter](https://import-linter.readthedocs.io/en/stable/get_started/run/)
- [import-linter usage, version 2.0 (search result)](https://import-linter.readthedocs.io/en/v2.0/usage.html)
- [NDepend code metrics](https://www.ndepend.com/docs/code-metrics)
- [Typing specification: directives](https://typing.python.org/en/latest/spec/directives.html)
- [.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
- [Python developer guide: versions](https://devguide.python.org/versions/)
- [Clang command-line reference](https://clang.llvm.org/docs/ClangCommandLineReference.html)
- [scan-build command-line usage](https://clang.llvm.org/docs/analyzer/user-docs/CommandLineUsage.html)
- [PostgreSQL information schema](https://www.postgresql.org/docs/current/information-schema.html)
- [npm search: dependency-cruiser sarif](https://registry.npmjs.org/-/v1/search?text=dependency-cruiser%20sarif&size=20)
- [dependency-cruiser on npm (search result)](https://www.npmjs.com/package/dependency-cruiser)
