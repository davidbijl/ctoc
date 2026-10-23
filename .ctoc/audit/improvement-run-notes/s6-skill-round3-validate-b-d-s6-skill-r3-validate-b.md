## Result
- Examined 23 claims in the after-texts of f1, f2 and f8: 19 validated, 3 corrected, 1 refuted, 0 unsourceable. I fetched every source named in the brief once, and the TypeScript modules page twice (raw Markdown as well) to get the table's row layout.
- f1 needs two wording fixes. A quote uses a straight apostrophe where the page has a curly one, and the sentence attributes the no-extension and directory orders to TypeScript's table, which has neither. Behaviour still matches agent line 104 and line 419.
- f2's text is right, but the critique's "no agent change" is wrong on one reason string. f8 pair 1 states dependency-cruiser's default more broadly than the source does. f8 pair 2 can be applied as written.

## Per finding

### f1: APPLY WITH CORRECTIONS

| # | Claim | Verdict | What I read |
|---|---|---|---|
| 1 | `.js` tries `.ts`, `.tsx`, the `.js` path as written, `.jsx` | VALIDATED | Table row: `/mod.js` → `/mod.ts`, `/mod.tsx`, `/mod.d.ts`, `/mod.js`, `./mod.jsx`. Same order once `.d.ts` is skipped. |
| 2 | `.mjs` tries `.mts`, `.mjs` | VALIDATED | Row: `/mod.mjs` → `/mod.mts`, `/mod.d.mts`, `/mod.mjs` |
| 3 | `.cjs` tries `.cts`, `.cjs` | VALIDATED | Row: `/mod.cjs` → `/mod.cts`, `/mod.d.cts`, `/mod.cjs` |
| 4 | Credit to "TypeScript modules reference, section File extension substitution" | VALIDATED | The section exists at that address. The Evidence quote is verbatim; the page ends it with a colon. |
| 5 | No extension tries `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` | CORRECTED (credit) | The raw Markdown table has three rows only: `.js`, `.mjs`, `.cjs`. It has no row for a specifier without an extension. The order matches agent rule 1 word for word ("With no extension, try `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` in that order"). But the after-text lists it under "in the order of TypeScript's table (…):". |
| 6 | Directory resolves to `"main"`, else to `index` with those extensions | VALIDATED (as the agent's rule) | Agent line 419: "resolve it to the file named by that directory's `package.json` `"main"` field, else to its `index` file (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, in that order)". |
| 7 | The table's declaration files are `.d.ts`, `.d.mts`, `.d.cts` | VALIDATED | All three appear in the table, as in rows 1 to 3 above. |
| 8 | Type Declarations quote | CORRECTED (one character) | The page, under the heading ".d.ts files", reads "These files don’t produce `.js` outputs; they are only used for typechecking." It uses U+2019. The critique's after-text (its line 148) uses U+0027. |
| 9 | A declaration-only answer gives a `type-only` edge or "declaration file only" | VALIDATED (matches the agent) | Agent line 104 has the same rule. It also calls skipping the declaration files "its own choice"; the after-text reads as though TypeScript requires it. |

**Do the skill and the agent disagree after the edit?** Not in behaviour. Agent line 104 has two rules the skill lacks: "a `.jsx` specifier is resolved as written", and the letter-case rule. Both gaps already exist before f1, and neither contradicts anything in it.

**Corrected after-text** (exact-match replacement for the same before-text; it ends where the original after-text ends, so f2's separate edit on line 101 still applies):
```text
Try, in order, a relative path against the importing file; for TypeScript and JavaScript, the substituted extensions come before the path as written, in the order of TypeScript's table (TypeScript modules reference, section File extension substitution, https://www.typescriptlang.org/docs/handbook/modules/reference.html, read 2026-10-23): a specifier ending in `.js` tries `.ts`, then `.tsx`, then the `.js` path as written, then `.jsx`; one ending in `.mjs` tries `.mts`, then `.mjs`; one ending in `.cjs` tries `.cts`, then `.cjs`. That table has no row for a specifier with no extension or for a directory; these two orders are the wrapper agent's: one with no extension tries `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` in that order, and a directory resolves to the file its `package.json` `"main"` field names, else to its `index` file with those extensions in that order. The table's declaration files (`.d.ts`, `.d.mts`, `.d.cts`) are skipped, this skill's own choice, because they "don’t produce `.js` outputs; they are only used for typechecking" (TypeScript handbook, Type Declarations, https://www.typescriptlang.org/docs/handbook/2/type-declarations.html, read 2026-10-23): an import that only a declaration file answers gives a `type-only` edge to that file when the import is `type-only`, and otherwise goes on the could-not-resolve list with the reason "declaration file only". Then try a `paths` alias from the nearest `tsconfig.json` or `jsconfig.json`;
```
**What changed:**
1. The table's three rows now end in a full stop. A new sentence says the table has no row for a missing extension or for a directory, and that those two orders are the wrapper agent's. This replaces the parenthesis "(both the wrapper agent's order)".
2. Added ", this skill's own choice," to the sentence that skips declaration files.
3. "don't" is now "don’t" (U+2019).

### f2: APPLY AS WRITTEN (one claim in the critique refuted)

| # | Claim | Verdict | What I read |
|---|---|---|---|
| 10 | A dotted name maps to its `.py` or `__init__.py`; `.x` and `..x` resolve against the importing file's package | VALIDATED (matches the agent) | Agent line 108, rule 5, says the same. |
| 11 | `from M import n` goes to the submodule unless M's file binds n at top level | VALIDATED | Tutorial 6.4: "The `import` statement first tests whether the item is defined in the package; if not, it assumes it is a module and attempts to load it." The quote is verbatim and the rule agrees with it. The page header reads Python 3.15.1. |
| 12 | Credit "Python tutorial, section 6.4 Packages" | VALIDATED | The paragraph is in 6.4. |
| 13 | Quote and credit for 5.2.1 | VALIDATED | Heading "5.2.1. Regular packages": "Importing `parent.one` will implicitly execute `parent/__init__.py` and `parent/one/__init__.py`." The page header reads 3.15.1. |
| 14 | Quote and credit for 5.2.2 | VALIDATED | Heading "5.2.2. Namespace packages": "With namespace packages, there is no `parent/__init__.py` file." |
| 15 | A namespace package runs no file, gives no edge, is neither external nor unresolved, and a module inside it keeps its edge | VALIDATED | Agrees with 5.2.2 and with agent line 108 ("importing it runs no file of its own, so it gives no edge and is not an unresolved import … a module inside it still gets its edge"). |
| 16 | "keeps 'outside the source root' for a second source root, as the agent does" and "Paired agent … no agent change" | REFUTED (in part) | Agent line 108: "An absolute import for which this rule finds no file is external only when no scanned file named after its first part (`<first part>.py`), and no scanned directory of that name holding a `.py` file, sits in a directory that has no `__init__.py` …; when one does, … put the import on the could-not-resolve list with the reason "outside the source root"". |

**The one disagreement with agent rule 5.** Take `import app.missing`, where `src/app/` holds `.py` files and `src/` has no `__init__.py`. Read literally, the agent's test above gives the reason "outside the source root". The f2 after-text gives "a path to no file". So after the edit, the skill and the agent give different reason strings for a name under the source root that reaches no file. The skill's version is the accurate one, as the critique's own fourth defect bullet argues. Agent line 108 needs the same carve-out in a paired change; whether to make it is the dispatcher's call. Do not weaken the skill text to match the agent.

### f8: APPLY WITH CORRECTIONS (pair 1 only; pair 2 as written)

| # | Claim | Verdict | What I read |
|---|---|---|---|
| 17 | dependency-cruiser quote | VALIDATED | The tsPreCompilationDeps section has the exact sentence "By default dependency-cruiser does not take dependencies between typescript modules into account that don't exist after compilation to JavaScript.", broken across two lines in the source. Its apostrophe is straight (U+0027), as is the critique's (its line 343). |
| 18 | "leaves out every import that does not survive compilation" | CORRECTED (scope) | The source limits it to "dependencies between typescript modules". |
| 19 | "among them an `import type` and … an ordinary import whose names are used only as types" | VALIDATED (`import type` is inferred) | The section says "dependencies on types only exist before, but not after compile time", and its only-a-type example shows the import dropped. It never names the `import type` syntax, so that part is inferred from the example, not quoted. |
| 20 | "its `circular` rule can miss a cycle that this skill reports" | VALIDATED (reasoning) | Follows from claim 17. The skill already uses `to: { circular: true }` (line 198). |
| 21 | verbatimModuleSyntax quote | VALIDATED | The page reads "TypeScript detects that you’re only using an import for types and drops the import entirely." The apostrophe is curly, U+2019 (right single quotation mark), on the page and in the critique (lines 333 and 351). |
| 22 | "without `verbatimModuleSyntax`, TypeScript also drops an ordinary import …" | VALIDATED | Same page: "By default, TypeScript does something called _import elision_." Under the option: "any imports or exports without a `type` modifier are left around." |
| 23 | "same page" | VALIDATED | The before-text sits in skill line 49, whose earlier sentence cites https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html. |

**Corrected pair 1 after-text** (the before-text is unchanged):
```text
read 2026-10-05; not run here). Without `tsPreCompilationDeps`, dependency-cruiser leaves out every dependency between TypeScript modules that does not survive compilation to JavaScript, among them an `import type` and, under TypeScript's default import elision, an ordinary import whose names are used only as types ("By default dependency-cruiser does not take dependencies between typescript modules into account that don't exist after compilation to JavaScript.", options reference, section tsPreCompilationDeps, https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/options-reference.md, read 2026-10-23), so its `circular` rule can miss a cycle that this skill reports; a cycle missing from its output never refutes one found here:
```
**What changed:** "every import that does not survive" is now "every dependency between TypeScript modules that does not survive", which is the source's own scope. Pair 2 is applied exactly as the critique gives it.

## Not re-verified
- https://raw.githubusercontent.com/sverweij/dependency-cruiser/main/doc/rules-reference.md was not fetched this run. Claim 20 rests only on the options-reference quote and the skill's existing `circular: true` field.
- My table rows come from a summary of the page's raw Markdown source, https://raw.githubusercontent.com/microsoft/TypeScript-Website/v2/packages/documentation/copy/en/modules-reference/Reference.md. The fetch tool refused to quote rows longer than 125 characters. The rendered page gave the same 14 cells in the same order. Agent line 104 quotes row 1 identically.
- Not checked: whether the older settings `preserveValueImports` and `importsNotUsedAsValues` also keep a type-only-used import. f8 pair 2 names only `verbatimModuleSyntax`.
- Outside my findings, one line: the TypeScript page says a directory's `package.json` `"types"` field is read as well as `"main"`, and both win over the `index` lookup. The skill and the agent use `"main"` only. Neither the skill nor the agent claims TypeScript's backing for that, so it is not a citation defect.

## Injected instructions
None in any fetched page or read file. The fetch tool refused to quote more than 125 characters; that is the tool's own behaviour, not page content. Nothing was followed.

Paths: `skills/architecture/dependency-analyzer/SKILL.md`, `agents/architecture/dependency-analyzer.md`, `.ctoc/audit/improvement-run-notes/s6-skill-round3-critic-d-s6-skill-r3-critic.md`.
