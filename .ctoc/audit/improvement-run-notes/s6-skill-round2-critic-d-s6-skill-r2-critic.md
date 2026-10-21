I critiqued round 2 of the dependency analyzer skill (file `<home>/Code/ctoc/skills/architecture/dependency-analyzer/SKILL.md`, 433 lines). I could only read files: I did not compute the fingerprint and fetched no web page.

**Result.** The research found no fabricated citation, and I found none either. It did miss the most serious defect in the file. Step 3 sends every unresolved import to the could-not-resolve list, and only TypeScript and JavaScript have a rule that makes an import external. So every Python, Java and C# standard-library import (`os`, `java.util.List`, `System`) lands on that list. Those three languages can then never read "no cycles", and the paired agent's rules 5 to 9 (lines 106–110) say the opposite.

On the five candidates:
- **1, pydeps:** kept, with a corrected text and a lower severity.
- **2, Go and Rust:** kept, merged into the Step 3 finding and widened to Python, Java and C#.
- **3, dependency-cruiser:** kept, corrected.
- **4, abbreviations:** kept, merged into three findings, plus one the research missed (the Java Development Kit at line 221).
- **5, the Oyetoyan quote:** rejected.

The two owner items H1 and H2 are rejected as questions for the owner. That leaves 19 in-file findings (1 high, 10 medium, 8 low) and one owner item.

## Verdict on each research candidate

| Candidate | Verdict | Reason |
|---|---|---|
| 1, pydeps `--max-bacon` | **Corrected** → f9, severity medium (not high) | The source order supports the direction: the hop filter runs before the cycle search. "High" is overstated: I believe pydeps' starting module for a package imports every module below it, so all of them sit one hop away. The research did not read that file. Also, `--max-bacon 0` alone can pull installed third-party modules into the cycle search, so I add `--only` and give a fallback text. Line 45 and the tool table make the same pydeps claim, so they are merged in. |
| 2, Go and Rust against the agent | **Accepted, merged and widened** → f1 | Line 101 also sends every Python, Java and C# standard-library import to the list. A Go module path must match up to a `/`, and "begins with" as a plain string prefix is wrong. The PHP closure `use` is not an import. The Rust limit is stated. |
| 3, dependency-cruiser default configuration | **Corrected** → f12 | I dropped the list of configuration file names, because no quote that was read contains it. I added the caveat the research itself raised: what the first command checks in a project with no configuration file was never verified. So round 1's rejected finding f-s6-skill-r1-54 is settled only for projects that have a configuration file. |
| 4, plain words | **Accepted, merged** → f9, f11, f13 | Same changes, plus "JDK" at line 221, which the research missed. |
| 5, the Oyetoyan change-proneness quote | **Rejected** | It adds a citation and changes no instruction, the same reason the research gave for not citing ISO/IEC 25010. Placed after "This skill follows the 2015 result", it would also read as a source for the "high" grade, which line 79 says is this skill's own weighting. |
| H1, keep the trigger phrase "dependency graph" | **Rejected as an owner item**; record it as "Decision, no change" | `when_to_load` is not frozen: plan line 51 lists it as changeable. Keeping the phrase is the obvious answer: nothing loads the skill on a phrase match (`tests/skill-loading.test.js` header, lines 9–14), and removing the phrase needs proof that the test prompts still match, for no gain. An obvious answer is not a question for the owner (Operating Lesson 17). |
| H2, the Arcan "Hub-Like Dependency" smell instead of "Ca ≥ 8" | **Rejected as an owner item**; record it as a lead for round 3's research | The research has only a search summary, which is not a source, so it is a research step with no decision to make. The plan already contains round 3. |

**Corrections to the research report:**
- Its section (c) says "Orders the agent cannot carry out: none". Line 299 tells the agent to find cycles in the output of a database query it never runs (f17).
- Its section (e) says neither file covers a missing Python interpreter. The agent does, at line 79.
- H1 calls `when_to_load` "a frozen key". It is not (plan line 51).

## In-file findings

Every `old` below was copied from the current file and occurs exactly once. No two `old` texts overlap, and no `new` contains another finding's `old`. No change touches the frontmatter, a field name of the letter, a `when_to_load` phrase or a "NOT RUNNING" marker. No new line repeats an agent line of 25 or more characters. None of these repeats a closed finding.

### s6-skill-r2-f1: Step 3 sends standard-library imports to the could-not-resolve list
- **Kind:** contradiction with the paired agent, and the could-not-resolve rule does not fit the analyzed languages. Corrects f-s6-skill-r1-17 and -18; merges candidate 2.
- **Severity:** high
- **Evidence:**
  - Skill line 101: "A bare specifier is external only when it names a declared dependency or a Node.js built-in module. Every other unresolved import … goes on a could-not-resolve list."
  - So `import os`, `import java.util.List;` and `using System;` all go on the list, and every Python, Java and C# report reads "N imports could not be resolved" with N inflated by the standard library.
  - Skill line 96 sends every Go and Rust import there, including `"fmt"`.
  - The agent makes these external: rule 5 (Python, line 106), rules 6 and 7 (Java and C#, lines 107–108), rules 8 and 9 (Go, Rust and others, lines 109–110).
  - The agent's rule 5 also says "under `src/` if it exists, otherwise under the repository root"; the skill's "or" leaves which one open.

Pair 1:
````text
Go `import` declarations, Rust `use` and `mod` items, and PHP `use` are extracted but not resolved: each goes on the could-not-resolve list with the reason "no resolution rule for this language".
````
````text
Go `import` declarations, Rust `use` and `mod` items, and PHP `use` are extracted but not resolved. These go on the could-not-resolve list with the reason "no resolution rule for this language", and are never called external: a Go import whose path is the `module` path of a `go.mod` in the repository, or begins with that path followed by `/`; a Rust `use` that begins with `crate::`, `self::` or `super::`, and every Rust `mod` item; every PHP `use` that imports a name, such as `use A\B\C;`. Every other Go or Rust import, such as Go's `"fmt"` or Rust's `serde`, is treated as external, and so is a Rust `use` that names one of the crate's own modules without `crate::`: this skill does not tell those apart from other crates.
````
Pair 2:
````text
and, for Python, a dotted name under `src/` or the repository root.
````
````text
and, for Python, a dotted name under `src/` when that directory exists, otherwise under the repository root.
````
Pair 3:
````text
A bare specifier is external only when it names a declared dependency or a Node.js built-in module. Every other unresolved import — a path to no file, a computed specifier, any Go, Rust or PHP import — goes on a could-not-resolve list with its file, line, specifier and reason; never drop one.
````
````text
An import that resolves to no node is external, and is not a node, only in these cases: in TypeScript and JavaScript, a bare specifier that names a declared dependency or a Node.js built-in module; in Python, an absolute name for which no file is found, unless a scanned `.py` file named after the name's first part, or a scanned directory of that name holding a `.py` file, sits in a directory with no `__init__.py`, which sends it to the list below with the reason "outside the source root"; in Java and C#, a name whose leading part no scanned file declares as its package or namespace (when such a part is declared but the next part is neither `*` nor a type a scanned file declares there, the import goes on the list with the reason "no scanned type at this name"); in Go and Rust, an import that Step 2 does not send to the list. Every other import that does not resolve — a path to no file, a computed specifier, a Go, Rust or PHP import that Step 2 sends there — goes on a could-not-resolve list with its file, line, specifier and reason; never drop one.
````

### s6-skill-r2-f2: a repository with only C, C++ or SQL files can get a clean report
- **Kind:** false clean result on a literal reading; missing file extensions. Corrects f-s6-skill-r1-16.
- **Severity:** medium
- **Evidence:**
  - Skill line 88 globs C, C++ and SQL files and *then* says "If no source file remains". If those files count as source files, the report runs on an empty graph and gives 0 runtime cycles and a score of 10/10.
  - The agent stops first and allows "no cycles" or a score for an empty graph never (agent lines 66–67).
  - The skill gives no extensions. The agent's globs are at lines 55–61 and 68.

Pair 1:
````text
Glob every source file of TypeScript and JavaScript, Python, Java, C#, Go, Rust and PHP, whatever the size of the change
````
````text
Glob every source file of TypeScript and JavaScript (`.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`), Python (`.py`), Java (`.java`), C# (`.cs`), Go (`.go`), Rust (`.rs`) and PHP (`.php`), whatever the size of the change
````
Pair 2:
````text
Glob C, C++ and SQL files too, and list those languages as present but not analyzed. If no source file remains, report "no source files found" with the globs used, never "no cycles".
````
````text
Glob C, C++ and SQL files too (`.c`, `.h`, `.cc`, `.cpp`, `.hpp`, `.sql`), and list those languages as present but not analyzed. If no TypeScript, JavaScript, Python, Java, C#, Go, Rust or PHP file remains, report "no source files found" with the globs used, name the C, C++ and SQL files found, if any, and give no count and no score; never write "no cycles" then.
````

### s6-skill-r2-f3: layer names, letter case, and what "upward" means with custom rules
- **Kind:** literal-reading gap against the paired agent. Corrects f-s6-skill-r1-20 and leftover B3.
- **Severity:** medium
- **Evidence:**
  - Skill line 122 names the layers in lower case and says nothing about letter case, nearest versus outermost directory, or how a Java package or C# namespace gets a layer. C# folders are usually `Controllers/` and `Services/`, so a case-sensitive script puts every C# file in no layer, and no layer check ever fires.
  - The agent compares without regard to case and uses the last part of a dotted name (lines 167–173).
  - Skill line 61 defines "upward" only through the Layer Hierarchy, so it is undefined for layers that `.dependency-rules.json` defines. The agent defines it at line 229 and gives the file's layout at lines 890–913.

Pair 1:
````text
(a file that does not parse is reported, and the defaults are used)
````
````text
(a file that does not parse is reported, and the defaults are used; in the file, each entry under `layers` names its `directories` and the layers it may import, `canImportFrom`, and an import counts as upward when the imported layer's own `canImportFrom` list holds the importing layer)
````
Pair 2:
````text
Directory names use-cases and usecases count as services, gateways as repositories, entities as domain, types as models, and shared as utils; a file under none of these belongs to no layer: skip its edges, and report how many such files there are.
````
````text
Directory names use-cases and usecases count as services, gateways as repositories, entities as domain, types as models, and shared as utils. A file's layer is the nearest directory above it with one of these names or a layer's name, compared without regard to letter case, so that `Services/` counts as services; for Java and C#, whose imported nodes are packages and namespaces, a node takes the layer of the last part of its dotted name that is such a name, so that `com.app.services` and `App.Services` count as services. A file or node under none of these belongs to no layer: skip its edges, and report how many such files there are.
````

### s6-skill-r2-f4: Step 4's classification rules overlap and give no order
- **Kind:** internal contradiction. Corrects f-s6-skill-r1-19.
- **Severity:** medium
- **Evidence:**
  - Skill lines 105–108. For Java and C#, a cycle closed only by a test-file import is "found among runtime edges alone" (graded high) and also test-only (graded low), and nothing says which rule wins.
  - An all-test-file runtime component, and an accepted runtime cycle, also match two rules at once.
  - The skill does not say how `allowedCycles` entries are compared. That file belongs to the analyzed repository and can hide findings.
  - The agent's three passes are at lines 129–136 and its matching rules at line 931.

````text
- found among runtime edges alone → runtime cycle (high)
- found only once type-only edges are added → type-only cycle (low)
- every node a test file, or, for Java and C#, found only once imports written in test files are added → test-only cycle (low)
- its files (for Java and C#, its packages or namespaces) exactly match an `allowedCycles` entry in `.dependency-rules.json` → accepted: no penalty, but always listed with the entry's `reason`
````
````text
- found among runtime edges alone, leaving out, for Java and C#, every import written in a test file → runtime cycle (high), unless, in a language whose nodes are files, every node is a test file (test-only cycle, low), or the cycle is accepted (the last rule below)
- for Java and C#, found only once imports written in test files are added → test-only cycle (low)
- found only once type-only edges are added → type-only cycle (low)
- a runtime cycle whose files (for Java and C#, its packages or namespaces) are exactly the list of an `allowedCycles` entry in `.dependency-rules.json`, compared as repository-relative paths (for Java and C#, as dotted names) with no pattern matching, so that an entry holding `*`, `?` or `[` matches nothing → accepted: no penalty, but always listed with the entry's `reason`; an entry that matches no cycle is listed too
````

### s6-skill-r2-f5: Step 6 never says what a module is, and handles unresolved imports differently from the agent
- **Kind:** missing definition, plus a contradiction with the paired agent. Corrects f-s6-skill-r1-21.
- **Severity:** medium
- **Evidence:**
  - Skill lines 125–134 compute Ca, Ce and I "for each module M" and never define a module. The agent's definition is at lines 445–466.
  - Skill line 133 marks *any* module with an unresolved import as "instability not known". The agent does this only for a module that is isolated among resolved imports; otherwise it computes I and marks the module in the table (line 194).
  - A module made only of test files would show as isolated; the agent leaves it out (line 187).

Pair 1:
````text
For each module M, over internal edges only, leaving out every edge whose importing file is a test file (counting test imports would move the instability of every tested module; this is this skill's own choice):
````
````text
A module is the nearest directory above a file that holds a package manifest (`package.json`, `go.mod`, `Cargo.toml`, a `*.csproj`) or an index file (`index.ts`, `index.js`, `__init__.py`, `mod.rs`), except that the repository root and the source root (`src/` when it exists, otherwise the repository root) are never a module by themselves; a file with no such directory belongs to the first directory under the source root, and a file directly in the source root to a module named after it. For Java the module is the package, and for C# the namespace. Key each module by its repository-relative path (for Java and C#, its dotted name). For each module M, over internal edges only, leaving out every edge whose importing file is a test file and leaving test files out of the module's files (counting test imports would move the instability of every tested module; this is this skill's own choice), and leaving out a module made only of test files:
````
Pair 2:
````text
Report a module with Ca + Ce = 0 as isolated, never as I = 0, and one whose files have an unresolved import as "instability not known".
````
````text
Report a module with Ca + Ce = 0 as isolated, never as I = 0; if one of its files has an import on the could-not-resolve list, report it instead as "instability not known". While that list is not empty, call every other isolated module "isolated among resolved imports", and mark in the coupling table each module one of whose files has an unresolved import, because its Ce and I count only the imports that resolved. Leave isolated modules and modules whose instability is not known out of the stable-dependencies check below.
````

### s6-skill-r2-f6: commented-out imports, and files that fail to parse
- **Kind:** missing rule. New.
- **Severity:** medium
- **Evidence:**
  - Skill line 91 forbids extracting line by line but gives no rule for comments or string literals. A script that matches import forms across a whole file records `// import { x } from './y'` as an edge, and a ring closed by it is graded high. The agent has the same gap (lines 73–77; see the owner item below).
  - A file that fails to parse has no rule in the skill, so it can be dropped silently. The agent's rule is at line 81.

````text
Extract imports with a script that parses each file, not with line-by-line patterns, which miss an import written over several lines or indented inside a function. Record each import's file, line, specifier and kind, `runtime` or `type-only`.
````
````text
Extract imports with a script that parses each file, not with line-by-line patterns, which miss an import written over several lines or indented inside a function. The script skips comments and the inside of string and template literals, except the specifier of the import it is reading, so that a commented-out `import` or `require` gives no edge. Record each import's file, line, specifier and kind, `runtime` or `type-only`. A file the script cannot read or parse (a Python `SyntaxError`, bytes that cannot be decoded) is listed in the report with its path, the line the error names, if any, and the error's type, never its text; its imports are missing from the graph, so every count covers only the files that parsed, and the report says so. Never treat such a file as one with no imports.
````

### s6-skill-r2-f7: output that was cut short is not detected
- **Kind:** report built on input the agent never fully received. New.
- **Severity:** medium
- **Evidence:** skill line 83 covers only a run that stops. The agent detects cut output with a closing "records printed: N" line (line 47).

````text
If the run stops before it has read every file, label every count and metric "partial — N of M files read".
````
````text
If the run stops before it has read every file, label every count and metric "partial — N of M files read", and say why it stopped. The script ends its output with the line "records printed: N", N being the number of lines it printed before that one; if that line is missing, or its N differs from the number of lines you received, the output was cut: report that, give no result from it, and run the script again so that it prints one section of the report at a time.
````

### s6-skill-r2-f8: `export type * from` is handled two different ways
- **Kind:** the same fact stated two different ways. Corrects f-s6-skill-r1-9.
- **Severity:** medium
- **Evidence:**
  - Skill line 49 says `export type { … } from`, with braces, which excludes `export type * from`. Line 92 says `export type … from`, which includes it.
  - The agent uses the braces form only (lines 77 and 861).
  - The agent marks inline `type` edges `inline-type` (line 862); the skill does not.
  - That `export type *` is erased is my belief, so the new text labels it as the skill's own reading (see the validator list).

Pair 1:
````text
counts it as runtime whatever the project's setting.
````
````text
counts it as runtime whatever the project's setting, and marks the edge `inline-type` in the report so that a reader can see why a cycle was counted. A declaration-level `export type * from` or `export type * as ns from` is type-only too: that is this skill's reading of a form the TypeScript page above does not show, and no source for it was read for this skill.
````
Pair 2:
````text
Only a declaration-level `import type` or `export type … from` is `type-only`;
````
````text
Only a declaration-level `import type`, `export type { … } from` or `export type * from` (also `export type * as ns from`) is `type-only`;
````

### s6-skill-r2-f9: the pydeps recipe (candidate 1, corrected)
- **Kind:** recipe claim not checked. Corrects f-s6-skill-r1-5 at line 45; new at line 199; merges candidate 4 at line 312.
- **Severity:** medium
- **Evidence:** the research's reads on 2026-10-05:
  - `https://raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/cli.py`: 0 means no limit.
  - `https://raw.githubusercontent.com/thebjorn/pydeps/master/pydeps/depgraph.py`: the hop filter runs before the cycle search.
  - pydeps README: "(default=2, 0 -> infinite)" and "highlighted as blue boxes".

Pair 1:
````text
pydeps (`--show-cycles`)
````
````text
pydeps (`--show-cycles`, with `--max-bacon 0`, because its default of 2 hops removes more distant modules before the cycle search)
````
Pair 2 (main version):
````text
# pydeps: visual + cycle detection
pydeps mypackage --show-cycles --max-bacon 2 --noshow -o deps.svg
````
````text
# pydeps draws the import graph and marks its cycles. It removes every module more than --max-bacon
# hops from its starting point (default 2) before it looks for cycles, and 0 removes that limit
# (pydeps cli.py and depgraph.py, read 2026-10-05); --only mypackage keeps the search to the
# package's own modules. Not run here.
pydeps mypackage --show-cycles --max-bacon 0 --only mypackage --noshow -o deps.svg
````
Pair 2, fallback. Use this `new` with the same `old` if the validator finds that `--only` does not exist or is applied after the cycle search:
````text
# pydeps draws the import graph and marks its cycles. It removes every module more than --max-bacon
# hops from its starting point (default 2) before it looks for cycles, and 0 removes that limit
# (pydeps cli.py and depgraph.py, read 2026-10-05); with no limit it may also list cycles inside
# installed third-party packages (not checked). Not run here.
pydeps mypackage --show-cycles --max-bacon 0 --noshow -o deps.svg
````
Pair 3:
````text
Bytecode-level imports, SVG, highlights cycles in blue
````
````text
Bytecode-level imports, an SVG image, cycles highlighted as blue boxes; looks for cycles only among the modules it keeps within `--max-bacon` hops of its starting point (default 2)
````

### s6-skill-r2-f10: the madge recipe misses `.mts`, `.cts`, `.mjs` and `.cjs` files
- **Kind:** code example that can pass without checking anything. New.
- **Severity:** medium
- **Evidence:** agent line 1106 records the runs of 2026-10-02: "Processed 0 files", and with `--extensions mts` the cycle was still missed. The skill's recipe at line 176 says neither.

````text
so the setting is left off.
npx -y madge@8.0.0 --circular
````
````text
so the setting is left off.
# --extensions ts,tsx,js,jsx names none of .mts, .cts, .mjs or .cjs. In a run of madge 8.0.0 on 2026-10-02
# (the wrapper agent's rounds), a cycle between two .mts files passed with "Processed 0 files"; with
# --extensions mts madge read both files and still missed the cycle, whose imports used .mjs specifiers.
npx -y madge@8.0.0 --circular
````

### s6-skill-r2-f11: the report template has no place for what the procedure requires
- **Kind:** missing output sections. Corrects f-s6-skill-r1-39 and leftover A2; merges candidate 4 at line 371.
- **Severity:** medium
- **Evidence:**
  - Line 79 requires "the count of each finding beside the score", but the Summary (lines 325–332) has no row for stable-dependencies violations, the efferent-coupling budget, missing module boundaries, type-only or test-only cycles, or accepted cycles.
  - The template has nowhere to put accepted cycles (Step 4), files in no layer (Step 5), quoted instructions (line 41), unparsed files, unresolved imports, or a partial run.
  - Recommendation 3 says "(Medium)" although the example's coupling findings include a high one (line 361).
  - The score stays 6.3, because every added row is 0.

Pair 1:
````text
| Instability mismatches (D > 0.5) | 1 | MEDIUM |
| Imports that could not be resolved | 0 | none to list |
````
````text
| Instability mismatches (D > 0.5) | 1 | MEDIUM |
| Modules over their efferent-coupling budget | 0 | none |
| Missing module boundaries | 0 | none |
| Stable-dependencies violations | 0 | none |
| Type-only and test-only cycles | 0 | none |
| Cycles accepted by `.dependency-rules.json` | 0 | none |
| Imports that could not be resolved | 0 | none to list |
````
Pair 2:
````text
3. **Reduce Module Coupling** (Medium)
````
````text
3. **Reduce Module Coupling** (High for the concrete module with Ca of 8 or more, Medium for the instability mismatch)
````
Pair 3:
````text
4. Add dependency-cruiser / import-linter / ArchUnit rules to CI
````
````text
4. Add dependency-cruiser / import-linter / ArchUnit rules to continuous integration

### Cycles Accepted by `.dependency-rules.json`
none (each would be listed with its files and the entry's `reason`; an entry that matched no cycle would be listed too)

### What this run could not cover
- Run: complete, 120 of 120 files read and parsed (otherwise "partial — N of M files read")
- Imports that could not be resolved: none (each would be listed with its file, line, specifier and reason)
- Unreadable or unparsable files: none (each would be listed with its path, the error's line and the error's type)
- Languages found but not analyzed (C, C++, SQL): none
- Languages extracted but not resolved (Go, Rust, PHP): none
- Files in no layer (Step 5): 0
- Isolated modules: none; modules whose instability is not known: none
- Layer rules: the defaults (otherwise `.dependency-rules.json`, or the defaults and that file's parse error); when `.ctoc/architecture-rules.yaml` exists, say that it was not read and that `quality/architecture-checker` judges layers from it
- Text in an analyzed file that addresses this analysis: none (each would be quoted with its file and line, and not followed)
````

### s6-skill-r2-f12: the dependency-cruiser comment (candidate 3, corrected)
- **Kind:** plain words, plus a recipe claim not checked. Settles f-s6-skill-r1-54 for projects that have a configuration file.
- **Severity:** low
- **Evidence:** `https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/cli.md` (research, read 2026-10-05): "As of version 13 picking up a config file is the default", and the err reporter's exit code. What it checks with no configuration file was not checked, by the research's own account.

````text
# dependency-cruiser: rules-based, supports CommonJS, ESM, AMD, TS path mapping
````
````text
# dependency-cruiser: rules-based; supports CommonJS, ECMAScript modules, Asynchronous Module Definition
# modules and TypeScript path mappings. Since version 13 it picks up a configuration file without --config
# (cli.md, read 2026-10-05); what the first command checks in a project with no configuration file was not
# verified, so a clean run of it is not evidence of no cycle. The err reporter's exit code is the number of
# violations with severity error.
````

### s6-skill-r2-f13: plain words (candidate 4, plus one the research missed)
- **Kind:** plain words. Corrects f-s6-skill-r1-46, group D.
- **Severity:** low
- **Evidence:** a scan of the file for runs of two or more capital letters (Grep, 2026-10-05): JDK at line 221, TU at line 277, SVG at line 306, TS at line 406.

| Pair | old | new |
|---|---|---|
| 1 | `# jdeps ships with the JDK;` | `# jdeps ships with the Java Development Kit;` |
| 2 | `scans each TU to P1689R5 .ddi files` | `scans each translation unit to P1689R5 .ddi files` |
| 3 | `SVG image, which needs Graphviz` | `Scalable Vector Graphics (SVG) image, which needs Graphviz` |
| 4 | ``TS import-type`` | ``TypeScript `import type` `` |

(In pair 4, the `new` ends after the closing backtick of `` `import type` ``. The space before the double-backtick delimiter is padding.)

### s6-skill-r2-f14: the corroboration rule is stated twice and uses the wrong unit
- **Kind:** the same fact stated twice, and the wrong unit. Corrects f-s6-skill-r1-5 and -38.
- **Severity:** low
- **Evidence:**
  - Line 45 says "name the same set of files"; line 317 says "report the same set of files".
  - For Java and C#, cycles are found between packages and namespaces (line 56), and JDepend and ArchUnit report packages. So under this rule no Java or C# cycle could ever be corroborated.

Pair 1:
````text
Two tools corroborate a cycle only when they name the same set of files (this skill's own rule); never compare their counts, because madge counts rings, not components.
````
````text
Two tools corroborate a cycle only when they name the same set of nodes (files; for Java, packages; for C#, namespaces), which is this skill's own rule; never compare their counts (Tool Integration, below).
````
Pair 2:
````text
Two tools corroborate a cycle only when they report the same set of files (this skill's own rule). Never compare madge's count with this skill's: madge counts rings, and on six files forming two components madge 8.0.0 printed "Found 4 circular dependencies!" (run of 2026-10-01).
````
````text
Never compare madge's count of cycles with this skill's count of cycle findings: madge counts rings, and on six files forming two components madge 8.0.0 printed "Found 4 circular dependencies!" (run of 2026-10-01, in the wrapper agent's rounds).
````

### s6-skill-r2-f15: the hexagonal-architecture check names a layer that does not exist by default
- **Kind:** order using an undefined term. New.
- **Severity:** low
- **Evidence:** the default layers (lines 115–121) have no infrastructure layer. The agent says so at lines 235–236.

````text
If pattern-detector says "this is Hexagonal Architecture," verify by checking that the domain layer has zero edges into infrastructure.
````
````text
If pattern-detector says "this is Hexagonal Architecture," check that the domain layer has zero edges into an infrastructure layer; the default layers (Step 5) have none, so without a `.dependency-rules.json` that defines one, report that the claim could not be checked.
````

### s6-skill-r2-f16: Step 8 is empty
- **Kind:** empty step. New.
- **Severity:** low
- **Evidence:** lines 139–141.

````text
### Step 8: Generate Report

## Layer Hierarchy
````
````text
### Step 8: Generate Report
Write the report in the form of the section Output Format, with the file and line of every finding and every limit that Steps 1 to 6 tell you to report.

## Layer Hierarchy
````

### s6-skill-r2-f17: an order the agent cannot carry out for SQL
- **Kind:** order the agent cannot carry out. Corrects f-s6-skill-r1-36.
- **Severity:** low
- **Evidence:**
  - Line 299 says "Cycles among these edges are found as in Step 4".
  - Line 98 says SQL is not analyzed, and line 162 says "you run none of them".

````text
Cycles among these edges are found as in Step 4, except that a table whose foreign key references the table itself is not reported (this skill's own rule).
````
````text
When a human gives you this query's output, find the cycles among its edges as in Step 4, except that a table whose foreign key references the table itself is not reported (this skill's own rule); you run no query yourself.
````

### s6-skill-r2-f18: the C and C++ line reads as an order to extract
- **Kind:** literal-reading ambiguity. Corrects f-s6-skill-r1-17.
- **Severity:** low
- **Evidence:** line 97 lists `#include` and `import` forms under "Extract Imports", then says the files are not analyzed.

````text
- **C and C++**: `#include "header.h"` for project headers, and in C++20 `import module;` and `import :partition;`. You list C and C++ files as present but not analyzed;
````
````text
- **C and C++**: their edges would be `#include "header.h"` for project headers, and in C++20 `import module;` and `import :partition;`, but you extract none of them: list C and C++ files as present but not analyzed;
````

### s6-skill-r2-f19: the import-linter contract does not enforce the skill's own default rule
- **Kind:** code example not labelled for what it misses. New.
- **Severity:** low
- **Evidence:**
  - The skill's defaults forbid a controller importing a repository (line 113).
  - I believe a "layers" contract forbids only imports from a lower layer to a higher one (validator item 10).
  - Round 1 read that the "forbidden" contract type exists (`https://import-linter.readthedocs.io/en/stable/`, read 2026-10-05).

````text
`.importlinter` layered contract:
````
````text
`.importlinter` layered contract (not run here). It forbids a lower layer importing a higher one and lets a higher layer import any lower one, so it does not catch a controller importing a repository, which this skill's default rules forbid; that needs a separate `forbidden` contract, not shown:
````

## Owner item

### h-s6-skill-r2-agent-gaps-closed-in-the-skill
- **Kind:** `out-of-scope-file`
- **Path:** `agents/architecture/dependency-analyzer.md`
- **Evidence:** this round puts five rules in the skill that the agent, whose rounds are closed, does not have:
  1. **Comments and string literals.** Agent Step 2 (lines 73–77) gives no rule for them, so a commented-out import can create a high-severity runtime cycle (f6).
  2. **`export type * from`.** Agent lines 77 and 861 treat only the braces form as type-only, so `export type * from` would count as a runtime `export * from` (f8).
  3. **Go module path.** Agent line 109 matches imports that "begin with" the `module` path. As a plain string prefix, module `github.com/org/api` also matches `github.com/org/api-client`, and the single `go.mod` leaves repositories with several modules open (f1).
  4. **Rust.** Agent rule 9 treats a Rust `use` of the crate's own module written without `crate::` as external and does not say so (f1).
  5. **C, C++ and SQL only.** Agent Step 1 (lines 66–69) stops before its C, C++ and SQL glob, so those files are never named (f2).

| Option | Pros | Cons |
|---|---|---|
| `late-correction-to-agent`: apply the five changes to the agent as a late correction, through the scope-growth request in plan decision 2 | The pair agrees again; items 1 and 2 remove high-severity cycles that do not exist | Edits a file whose rounds are closed; needs your go-ahead, a record entry and a re-run of the agent's tests |
| `leave-agent-record-divergence`: leave the agent; both records name the five differences | No edit to a closed file | The pair disagrees on five rules, and the agent can still report a cycle through a commented-out or erased import |
| `settle-with-wrapper-duplication`: decide these together with `h-s6-agent-r1-wrapper-duplicates-skill` | One decision removes this whole class of disagreement | The disagreement stays until that larger question is answered |

**Recommended:** `late-correction-to-agent`. Items 1 and 2 make the agent report a high-severity cycle that does not exist, and a person would act on it. Each fix is a sentence or two. Making the pair agree is what plan criterion 9 requires, and it does not decide the wrapper-duplication question.

## Considered, not proposed
- **Coupling budgets.** None are given for repositories, models or handlers, and no rule maps a module to a layer. This is added evidence for `h-s6-skill-r1-categories-without-a-source`; no change while that question is open.
- **Abstractness.** It has no definition for any language. This is covered by `h-s6-skill-r1-distance-from-the-main-sequence`.
- **Where the skill is silent but does not contradict the agent:** which shortest ring to pick, marking Python imports inside a function, a missing interpreter, and passing the script on standard input. The agent's rules (lines 79, 98 and 142–144) apply. A "follow no symbolic link" order is also left out: the Glob tool cannot carry it out, and the agent's own script does.
- **The CWE-1054 short name "(Layer-skipping Call)" at line 122.** It is attributed to the ISO/IEC 5055 contents list and was not re-read this round. It is carried forward.
- **Prompt injection.** No file I read addressed the reader.

## Seven-language verdict
The check applies: each of the seven languages under 7-language coverage has an import or include mechanism.
- **TypeScript and JavaScript:** the could-not-resolve rule fits. `export type * from` now has a rule (f8), and the madge recipe states it misses the four other file extensions (f10).
- **Python, Java and C#:** the rule did **not** fit before this round, because every standard-library import went to the list. It fits after f1. Separately, C# PascalCase folders put every file in no layer; fixed by f3.
- **C and C++:** not analyzed. A repository with only these files could get a clean report and a score; fixed by f2. There is still no recipe that finds cycles in C.
- **SQL:** not analyzed. The query recipe gave an order the agent cannot carry out; fixed by f17.
- **Go, Rust and PHP** are outside the seven. They now follow the agent (f1), with the Rust limit stated.

No example I changed was run or compiled. The only command that changed is pydeps (`--max-bacon 0`, `--only`).

## What the validator must check
1. pydeps `cli.py`: `max_bacon == 0` becomes `sys.maxsize`; README: "(default=2, 0 -> infinite)". (f9)
2. pydeps `depgraph.py`: the hop filter runs before the cycle search in `DepGraph.__init__`, and where the `--only` filter sits relative to the cycle search. (f9 decides main version or fallback)
3. pydeps README: `--only` exists and how it is worded; "highlighted as blue boxes". (f9)
4. pydeps `dummymodule.py`: whether a package target imports every module below the package. This bears on the severity only, not the text.
5. dependency-cruiser `cli.md`: the version-13 default configuration pickup, and the err reporter's exit code. (f12)
6. The madge 8.0.0 runs of 2026-10-02 on `.mts` files, as agent line 1106 records them. They were not re-run. (f10)
7. TypeScript 5.0 release notes: `export type * from` and `export type * as ns from` are type-only and erased. If confirmed, the new sentence in f8 can cite the page instead of saying "no source … was read".
8. Rust Reference, use declarations: since the 2018 edition a `use` path can start with a name in scope, such as a module declared with `mod`. (f1)
9. Go Modules Reference: a package's import path is the module path joined with its subdirectory, so the match must stop at a `/`. (f1)
10. import-linter "layers" contract: a higher layer may import any lower layer, and only lower-to-higher imports are forbidden. (f19)
11. Expansions: Scalable Vector Graphics, translation unit, Asynchronous Module Definition, Java Development Kit. (f12, f13)
12. Repository facts from the agent: lines 47, 55–61, 66–69, 79, 81, 106–110, 129–136, 167–173, 187, 194, 229, 235–236, 445–466, 530, 862, 890–913, 931, 1106. (f1 to f8, f11, f15)
13. That the example score stays 6.3 after the added zero rows, and that recommendation 3's grades match the categories table. (f11)

**What I could not do:** I computed no fingerprint and fetched nothing. Items 2 to 4, 7, 8 and 10 rest on my belief or on the research's reads.
