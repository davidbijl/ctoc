# Round 2 validation of the dependency-analyzer skill, read 2026-10-05

**Bottom line:** Nothing is fabricated. Thirteen findings can be applied as they are, and six need the corrected text given below. One claim in the owner item is misattributed.

- **pydeps (f9): use the main version.** The `--only` option exists. pydeps applies it before it looks for cycles.
- **TypeScript 5.0 (f8):** the release notes confirm `export type *` and `export type * as ns`, so f8 can now cite them.
- **One wrong route in the owner item:** it says the agent edit needs the scope-growth request under plan decision 2. It does not, because the plan's own `files:` list already covers the agent.

**What I could not check:**
- I could not compute the sha256: this session has no shell. The file I read has 433 lines, which matches the critic's count.
- I fetched 21 pages and ran 1 search.
- No page or file addressed the validator.

## Source quotes (all read 2026-10-05)

| Source | Exact quote |
|---|---|
| raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/depgraph.py | In `DepGraph.__init__`, in this order: `self.exclude_bacon(self.args['max_bacon'])`, `self.only_filter(self.args.get('only'))`, `self.remove_excluded()`, `self.find_import_cycles()`. In `only_filter`: `if node.name.startswith(p): return True` |
| raw.githubusercontent.com/thebjorn/pydeps/master/README.rst | "--only MODULE_PATH  only include modules that start with MODULE_PATH, multiple paths can be provided"; "exclude nodes that are more than n hops away (default=2, 0 -> infinite)"; "any cycles in the dependency graph are highlighted as blue boxes by default." |
| raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/cli.py | `args.add('--only', default=[], nargs="+", metavar="MODULE_PATH", ...)`; `if _args.max_bacon == 0: _args.max_bacon = sys.maxsize` |
| raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/dummymodule.py | When the target is a package: `for fname in python_sources_below(target.package_root):`. In `python_sources_below`: `if package and '__init__.py' not in files: continue` and `if 'migrations' in dirs: dirs.remove('migrations')` |
| typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html | "TypeScript 5.0 adds support for both of these forms" (meaning `export * from "module"` and `export * as ns from "module"`); "'vehicles' cannot be used as a value because it was exported using 'export type'." |
| go.dev/ref/mod | "A package path is the module path joined with the subdirectory containing the package (relative to the module root)." |
| doc.rust-lang.org/edition-guide/rust-2018/path-changes.html | "You can use a relative path from the current scope, a path starting from an external crate name, or a path starting with `::`, `crate`, `super`, or `self`." Example: `mod foo { pub struct Bar; } use foo::Bar;` |
| doc.rust-lang.org/reference/items/use-declarations.html (HTML and raw) | No sentence about this was found. Item 8 of the critic's checklist points at the wrong page: the Edition Guide is the page that says it. |
| import-linter.readthedocs.io/en/stable/contract_types/layers/ | "higher layers may depend on lower layers, but not the other way around." |
| import-linter.readthedocs.io/en/stable/contract_types/forbidden/ | "Forbidden contracts check that one set of modules is not imported by another set of modules." |
| raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/cli.md | "As of version 13 picking up a config file is the default, so you don't need to specify `--config` anymore…"; the err reporter exits "with exit code _number of violations with severity `error` found_". Nothing says what happens with no configuration file. |
| raw.githubusercontent.com/sverweij/dependency-cruiser/main/README.md | "JavaScript. TypeScript. CoffeeScript. ES6, CommonJS, AMD." |
| raw.githubusercontent.com/amdjs/amdjs-api/master/AMD.md | "The Asynchronous Module Definition (AMD) API specifies a mechanism for defining modules…" |
| w3.org/TR/SVG2/ | Title: "Scalable Vector Graphics (SVG) 2" |
| cmake.org/cmake/help/latest/manual/cmake-cxxmodules.7.html | "The smallest component of a compilation for a C++ program. Generally, there is one translation unit per source file."; "The process of analyzing a translation unit to discover module imports and exports." |
| Oracle Java Development Kit pages (Java SE 25 installation overview and Windows installation) | No sentence spells out the abbreviation. The release notes page returned HTTP 403 and dev.java returned HTTP 404. |

I read every agent line on the critic's checklist (item 12) in `<home>/Code/ctoc/agents/architecture/dependency-analyzer.md`: 47, 55–61, 66–69, 79, 81, 106–110, 129–136, 149, 167–173, 187, 194, 229, 235–236, 445–466, 530, 861–862, 890–913, 931, 1106–1107 and 1113. Each says what the critic says it does.

## Verdict table

| Finding | Verdict | Basis |
|---|---|---|
| f1 | PASS | Agent lines 106–110; Go Modules Reference (the module path joined with the subdirectory, so a match must stop at a `/`); Rust Edition Guide (a `use` path can start from the current scope). |
| f2 | PASS | Agent lines 55–61 and 66–69. |
| f3 | PASS | Agent lines 167–173, 229 and 890–913. |
| f4 | PASS | Agent lines 129–136, 149 and 931. |
| f5 | **PASS-WITH-CORRECTION** | Agent line 457 says a file directly in the source root belongs to "a module named after the source root". f5's "named after it" can be read as one module per file. |
| f6 | **PASS-WITH-CORRECTION** | Agent line 81 says "never its source text". f6's "the error's type, never its text" reads as the error's text. |
| f7 | **PASS-WITH-CORRECTION** | Agent line 47 says "N differs from the number of lines received **before it**". Read literally, f7's "lines you received" counts the closing line too, so every run would look cut short. |
| f8 | **PASS-WITH-CORRECTION** | Agent lines 77, 861 and 862 are right as cited. The TypeScript 5.0 release notes confirm both forms, so the "no source … was read" sentence is now out of date. Replace it with the citation. |
| f9 | Pair 1 PASS; **pair 2 PASS-WITH-CORRECTION (main version)**; pair 3 PASS | `--only` exists and is applied before the cycle search, so use the main version. But `only_filter` matches a plain string prefix (`startswith`), so "the package's own modules" claims too much. Severity should be **low**: `python_sources_below` makes every module of a package with `__init__.py` files one hop from the start. Only modules in directories without `__init__.py`, in `migrations/`, or in directories whose names start with a dot can sit further away. |
| f10 | PASS | Agent lines 1106 and 1107 ("Every madge run in this file used 8.0.0"). This is a recorded run, not one I repeated. |
| f11 | PASS | Score recomputed below. Recommendation 3's grades match the categories table: concrete module with Ca ≥ 8 is high, instability mismatch is medium. |
| f12 | PASS | dependency-cruiser `cli.md` and README; Asynchronous Module Definition page. |
| f13 | PASS | Scalable Vector Graphics, translation unit and TypeScript are sourced. "Java Development Kit" has no verbatim source today, but line 309 of the file already uses it and the round 2 research marked that table row validated. The change adds no new claim. |
| f14 | PASS | Agent line 1113 records the 2026-10-01 run. |
| f15 | PASS | Agent lines 235–236. |
| f16 | PASS | Skill lines 139–141. |
| f17 | PASS | Skill lines 98, 162 and 299. |
| f18 | PASS | Skill line 97. |
| f19 | **PASS-WITH-CORRECTION** | Both claims are validated (layers contract and forbidden contract). But plan criterion 2 (line 78) requires the source and read date in the file, and the import-linter layers page is not in line 317's source list. Add the citation. |

**The 6.3 score:** the penalties are 2 × 1.0 for runtime cycles, 0.4 for the upward import, 2 × 0.3 for the other forbidden imports, 0.4 for the concrete module with Ca ≥ 8, and 0.3 for the instability mismatch. That totals 3.7, and 10 − 3.7 = 6.3. Every row f11 adds is 0, so the score stays 6.3.

## Mechanical checks against the current file

- **Each `old` occurs exactly once.** All 34 `old` texts each matched once: 28 single-line ones, the four lines of f4 (lines 105–108), and four multi-line ones (lines 139–141, 175–176, 198–199 and 330–331). This was an exact-text search.
- **No two `old` texts overlap.** Lines 45, 88 and 101 each hold two `old` texts, and they are separate stretches of text.
- **No `new` contains another finding's `old`.** f13's "Scalable Vector Graphics (SVG) image, which needs Graphviz" does not contain "SVG image, which needs Graphviz", and f11's "…rules to continuous integration" does not contain "…rules to CI".
- **Pinned strings:** nothing touched. That covers the frontmatter (lines 1–30), the `when_to_load` phrases, the "NOT RUNNING" markers and the letter's field names. The only test that names this skill directly is `tests/skill-loading.test.js` (lines 188–189), which reads `when_to_load` only. I checked the 17 tests in the inventory's `tests_reading` for this skill: no new text adds a gate word, a compliance control name, a `node <path>` or `require('<path>')`, or a claims block.
- **Frozen frontmatter keys:** none touched.
- **Plain words:** pass. f9 pair 3 uses "an SVG image" in the row right after f13 spells out Scalable Vector Graphics (SVG). That follows the file's practice of spelling a term out at first use.
- **Gate numbers:** none.
- **Copy check:** no new line equals an agent line of 25 characters or more. I checked the summary rows and limits list against agent lines 535–543 and 692–706, and the f4, f5, f9, f10, f12, f13 and f19 lines by exact search. One thing to know: f5 pair 2 repeats a 140-character phrase from agent line 194 inside a longer line. The rule compares whole lines, so it passes.

## Claim counts

| Verdict | Count | Which claims |
|---|---|---|
| VALIDATED | 41 | The 30 claims behind the `new` texts, plus the 11 checked claims in the owner item: its five agent citations with their new web sources, plan criterion 9, the wrapper-duplication owner entry, and four claims from the critic's report. |
| FABRICATED | 0 | |
| MISATTRIBUTED | 1 | The owner item's route, "through the scope-growth request in plan decision 2". |
| UNSOURCEABLE | 1 | The spelling-out of JDK as "Java Development Kit": no Oracle sentence was read today. It is carried from line 309; keep it. |
| STALE | 1 | f8's "no source for it was read for this skill". |

## Corrected texts (use each with its unchanged `old`)

**f5, pair 1 (`new`):**
````text
A module is the nearest directory above a file that holds a package manifest (`package.json`, `go.mod`, `Cargo.toml`, a `*.csproj`) or an index file (`index.ts`, `index.js`, `__init__.py`, `mod.rs`), except that the repository root and the source root (`src/` when it exists, otherwise the repository root) are never a module by themselves; a file with no such directory belongs to the first directory under the source root, and a file directly in the source root to a module named after the source root. For Java the module is the package, and for C# the namespace. Key each module by its repository-relative path (for Java and C#, its dotted name). For each module M, over internal edges only, leaving out every edge whose importing file is a test file and leaving test files out of the module's files (counting test imports would move the instability of every tested module; this is this skill's own choice), and leaving out a module made only of test files:
````

**f6 (`new`):**
````text
Extract imports with a script that parses each file, not with line-by-line patterns, which miss an import written over several lines or indented inside a function. The script skips comments and the inside of string and template literals, except the specifier of the import it is reading, so that a commented-out `import` or `require` gives no edge. Record each import's file, line, specifier and kind, `runtime` or `type-only`. A file the script cannot read or parse (a Python `SyntaxError`, bytes that cannot be decoded) is listed in the report with its path, the line the error names, if any, and the error's type, never the file's source text; its imports are missing from the graph, so every count covers only the files that parsed, and the report says so. Never treat such a file as one with no imports.
````

**f7 (`new`):**
````text
If the run stops before it has read every file, label every count and metric "partial — N of M files read", and say why it stopped. The script ends its output with the line "records printed: N", N being the number of lines it printed before that one; if that line is missing, or its N differs from the number of lines you received before it, the output was cut: report that, give no result from it, and run the script again so that it prints one section of the report at a time.
````

**f8, pair 1 (`new`)** — pair 2 is unchanged:
````text
counts it as runtime whatever the project's setting, and marks the edge `inline-type` in the report so that a reader can see why a cycle was counted. A declaration-level `export type * from` or `export type * as ns from` is type-only too: "TypeScript 5.0 adds support for both of these forms", and its example's compiler error reads "cannot be used as a value because it was exported using 'export type'" (TypeScript 5.0 release notes, section Support for `export type *`, https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html, read 2026-10-05).
````

**f9, pair 2, main version (`new`):**
````text
# pydeps draws the import graph and marks its cycles. It removes every module more than --max-bacon
# hops from its starting point (default 2) before it looks for cycles, and 0 removes that limit
# (pydeps cli.py and depgraph.py, read 2026-10-05); --only mypackage keeps only modules whose names
# start with mypackage, a plain prefix that also keeps a module such as mypackage_extra. Not run here.
pydeps mypackage --show-cycles --max-bacon 0 --only mypackage --noshow -o deps.svg
````

**f19 (`new`):**
````text
`.importlinter` layered contract (not run here). It forbids a lower layer importing a higher one and lets a higher layer import any lower one ("higher layers may depend on lower layers, but not the other way around", import-linter documentation, https://import-linter.readthedocs.io/en/stable/contract_types/layers/, read 2026-10-05), so it does not catch a controller importing a repository, which this skill's default rules forbid; that needs a separate `forbidden` contract, not shown:
````

## Final lists

- **Apply as-is (13):** f1, f2, f3, f4, f9 pairs 1 and 3, f10, f11, f12, f13, f14, f15, f16, f17, f18.
- **Apply with correction (6):** f5 pair 1 (f5 pair 2 as-is), f6, f7, f8 pair 1 (f8 pair 2 as-is), f9 pair 2 main version (not the fallback), f19. Record f9's severity as **low**.
- **Do not apply:** the f9 fallback text, since `--only` exists and runs before the cycle search.
- **Owner item `h-s6-skill-r2-agent-gaps-closed-in-the-skill`, with these evidence corrections:**
  1. **The route is misattributed.** Plan decision 2 (line 110) covers a finished file whose slice has left the build queue. `agents/architecture/dependency-analyzer.md` is in this plan's `files:` list (line 10), and the plan is approved and in progress, so editing it needs no scope-growth request. Plan line 65 calls a fix to a file in this slice "corrected here"; "late correction" is the plan's term for finished files only. Drop "through the scope-growth request in plan decision 2" from the first option. Its downside reads: "needs your go-ahead, a record entry and a re-run of the agent's tests".
  2. **Item 1 (comments):** the gap does not apply to Python, which the agent parses with `ast` (line 79), and `ast` ignores comments. For TypeScript, JavaScript, Java, C# and Go the agent names no parser, so whether a commented-out import becomes an edge depends on the script that gets written.
  3. **Item 2 (`export type *`):** add the TypeScript 5.0 release-notes citation quoted above.
  4. **Item 3 (Go):** add the Go Modules Reference quote on package paths.
  5. **Item 4 (Rust):** the source is the Rust Edition Guide, not the Rust Reference.
  6. **The recommendation:** whether to reopen a file whose rounds are closed is a proceed-or-hold call that belongs to the owner. Under Operating Lesson 17 the options should be shown without a "Recommended" line.

**Risk:** Two things were not checked:
- None of the changed examples was run, including the corrected pydeps command and the f19 contract.
- "Java Development Kit" still has no verbatim source.

My reading of the pydeps behaviour comes from the source code on its master branch; I did not check which pydeps version is installed. Only the Edition Guide page I read states the Rust rule.

Sources:
- [pydeps depgraph.py](https://raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/depgraph.py) · [pydeps README](https://raw.githubusercontent.com/thebjorn/pydeps/master/README.rst) · [pydeps cli.py](https://raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/cli.py) · [pydeps dummymodule.py](https://raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/dummymodule.py)
- [TypeScript 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html) · [Go Modules Reference](https://go.dev/ref/mod) · [Rust Edition Guide, path changes](https://doc.rust-lang.org/edition-guide/rust-2018/path-changes.html) · [Rust Reference, use declarations](https://doc.rust-lang.org/reference/items/use-declarations.html)
- [import-linter layers](https://import-linter.readthedocs.io/en/stable/contract_types/layers/) · [import-linter forbidden](https://import-linter.readthedocs.io/en/stable/contract_types/forbidden/) · [dependency-cruiser cli.md](https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/cli.md) · [dependency-cruiser README](https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/README.md)
- [Asynchronous Module Definition](https://raw.githubusercontent.com/amdjs/amdjs-api/master/AMD.md) · [Scalable Vector Graphics 2](https://www.w3.org/TR/SVG2/) · [CMake C++ modules manual](https://cmake.org/cmake/help/latest/manual/cmake-cxxmodules.7.html)

Files read:
- `<home>/Code/ctoc/skills/architecture/dependency-analyzer/SKILL.md`
- `<home>/Code/ctoc/agents/architecture/dependency-analyzer.md`
- `<home>/Code/ctoc/.ctoc/audit/improvement-run-notes/s6-skill-round2-critic-d-s6-skill-r2-critic.md`
- `<home>/Code/ctoc/.ctoc/audit/improvement-run-notes/s6-skill-round2-research-d-s6-skill-r2-research.md`
- `<home>/Code/ctoc/plans/in-progress/00266-every-agent-and-specialist-skill-improved-three-times-s6-dependency-analyzer.md`
- `<home>/Code/ctoc/.ctoc/audit/agent-and-skill-improvement/inventory.json`
- `<home>/Code/ctoc/.ctoc/audit/agent-and-skill-improvement/skills/architecture/dependency-analyzer/SKILL.md.json`
- `<home>/Code/ctoc/.ctoc/audit/agent-and-skill-improvement/for-the-human.json`
- `<home>/Code/ctoc/tests/skill-loading.test.js`
- `<home>/Code/ctoc/tests/agent-model-floor.test.js`
