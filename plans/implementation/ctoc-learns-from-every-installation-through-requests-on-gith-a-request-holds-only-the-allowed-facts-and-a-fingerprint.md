---
title: "A request holds only the allowed facts and a fingerprint"
created: "2026-10-22T09:23:58.757Z"
type: feature
parent_vision: "vision/ctoc-learns-from-every-installation-through-requests-on-github.md"
priority: HIGH
status: refined
depends_on: "none"
acceptance_criteria_count: 13
risk_level: HIGH
---

# A request holds only the allowed facts and a fingerprint

## Problem Statement

Every other part of this vision writes or reads one thing: the text of a request.
- A CTOC user in a private or client project needs a guarantee built into that text: a request can hold only the facts on the owner's fixed list of what may leave the machine (decided on 2026-10-22). A caller in this CTOC version, or in any newer one, must not be able to slip in a branch name, a project path or a client's name as an extra field or a wrong value. A public issue cannot be recalled once posted.
- The maintainers, the owner and his agents, need to read every request back into the same fields, including requests from installations that run older CTOC versions.
- They also need duplicates from different installations to carry the same fingerprint, made on the user's machine with no model call, so that triage groups true duplicates without merging different frictions.

Without one versioned format holding the marker, the closed field set and the fingerprint, neither guarantee holds. Each other part would invent its own text and its own idea of what may be sent.

Constraints: no online model call; Windows, macOS and Linux. The first live callers are the drafting stub, which writes the format, and the triage stub, which reads it.

## Business Alignment

**Job to Be Done:** When my CTOC meets a friction in my private or client project and is about to put it into a request, I want that request to be able to hold only the facts the owner listed, in a form every CTOC version can read back and group, so I can trust that nothing private rides along and that my report is counted with the same friction from other installations.

**Impact Map:**
- **Goal:** both goals of the decomposition. A friction met in any installation reaches the CTOC repository and nothing private goes with it, and the maintainers turn incoming requests into CTOC's own plans without being buried. This format is the contract between the two.
- **Actor:**
  - the CTOC user in a private or client project, on Windows, macOS or Linux, on the writing side;
  - the CTOC maintainers, the owner and the agents that build CTOC for him, on the reading side.

  Both are the vision's target users.
- **Impact:**
  - The user's CTOC can produce only requests that keep to the owner's list. A request with any other field, or with a value of the wrong kind, is never produced.
  - The maintainers group requests from installations of any CTOC version by fingerprint, instead of reading each one to spot duplicates.
- **Deliverable:** the versioned request format, made of the marker line, the closed field set, the writer, a reader for every format version, and the fingerprint.

**Alignment checks:**
- The goal traces to the vision's problem statement: YES.
- The actor is in the vision's target audience: YES.
- The impact is observable: YES.
- The deliverable is one functional area, the text of a request: YES.

## User Stories

**As a** CTOC user working in a private or client project, **I want** every request CTOC writes to hold only the fields on the owner's fixed list, each with a value of its allowed kind, **so that** nothing outside that list can ever be placed in a request.
- INVEST: passes on all six.

**As a** CTOC maintainer, **I want** every request text read back into the same fields, from this format version and every older one, and anything that does not match the format reported as unparsed, **so that** triage groups only what it can trust, and requests from installations that have not updated still group.
- INVEST: passes. Independent is qualified: it reads what the first story writes, and the two are ordered inside this stub. Valuable is qualified: the older-version guard shows its value from the second format version on, but the test that guards it is built with the first.

**As a** CTOC maintainer, **I want** two frictions with the same CTOC part, kind and message template to get the same fingerprint on every platform, and different ones to get different fingerprints, **so that** duplicates from many installations group without merging different frictions.
- INVEST: passes. Estimable is qualified: the exact formula is the planner's, by the vision's decision, and a real fork there is asked by the planner.

## Acceptance Criteria

### Writing a request holds only the owner's list

- [ ] **Scenario: A request with only allowed fields is written**
  Given these allowed facts: CTOC version `6.14.134`, operating system family `macos`, Node.js major version `22`, CTOC part `src/lib/plan-validator.js`, plan stage `implementation`, step label `SPEC`, kind `refusal`, a message template holding one path placeholder, and a one-line description
  When CTOC writes the request text
  Then the text opens with a fenced code block whose first line is the marker line, naming the format and format version `1`
  And the block holds one line for each given field plus one fingerprint line, and no other line
  And the description stands under the block, outside it

- [ ] **Scenario: A field outside the owner's list is refused, and its value never appears**
  Given the allowed facts plus a field `branch` whose value is a unique marker string
  When CTOC writes the request text
  Then writing is refused with a message naming the field `branch` as not on the allowed list
  And the unique marker string appears nowhere in the message
  And no request text is produced

- [ ] **Scenario: A value outside its allowed kind is refused**
  Given, one at a time, each of these, where every value that holds text carries a unique marker string:
  - operating system family `solaris`;
  - kind `annoyance`;
  - step label `BUILD`;
  - a CTOC part written as an absolute path;
  - a CTOC part written as a drive-letter path with backslashes;
  - a CTOC part that climbs out with `..`;
  - a CTOC part written as a relative path that names no file in the running CTOC copy;
  - a template holding a placeholder of an unknown kind;
  - a description holding the marker's fixed text.

  When CTOC writes the request text
  Then each is refused with a message naming the field and the rule it broke
  And no message contains a unique marker string

- [ ] **Scenario: A missing required field is refused, and missing optional fields are left out**
  Given the allowed facts without the CTOC part
  When CTOC writes the request text
  Then writing is refused with a message naming the CTOC part as missing
  And when the allowed facts lack only plan stage, step label and message template, writing succeeds and the block holds no line for those three fields

### Reading a request back

- [ ] **Scenario: A written request reads back into the same fields**
  Given a request text CTOC wrote, whose template holds a line break, double quotes and three backticks, and whose description holds a line break
  When the reader reads the text, and reads it again with every line feed replaced by a carriage return and line feed
  Then both reads give fields equal to those written, and the same description

- [ ] **Scenario: A text that does not match the format is reported as unparsed, never partly read**
  Given, one at a time, each of these:
  - a text with no marker line;
  - a marker line with a misspelt fixed text;
  - a block holding an unknown field;
  - a block holding the same field twice;
  - a block missing a required field;
  - a block whose stated fingerprint differs from the one computed from its part, kind and template;
  - a text holding two marker blocks.

  When the reader reads it
  Then it is reported as unparsed, with a line number and the reason
  And no field is returned
  And the reason does not repeat the text of the line

- [ ] **Scenario: Every older format version stays readable**
  Given a committed sample request for every format version from the first to the current one, each with its recorded fields
  When the test suite runs
  Then each sample reads into its recorded fields
  And every sample's marker line carries the same fixed text, differing only in the version number
  And the test fails if the current format version has no sample, or if any sample stops reading

- [ ] **Scenario: A request from a newer format version is reported as unparsed**
  Given a request whose marker line names a format version higher than the reader knows
  When the reader reads it
  Then it is reported as unparsed, with the reason that its format version is newer than this CTOC reads
  And no field is returned

### The fingerprint groups duplicates and nothing else

- [ ] **Scenario: The same friction gets the same fingerprint on every platform**
  Given a fixed CTOC part, kind and message template, and the fingerprint value recorded in the test
  When the fingerprint is computed on Windows, macOS or Linux, once from the template with line feeds and once with carriage return and line feeds
  Then both results equal the recorded value
  And the value is lowercase hexadecimal, of the same length as every other fingerprint

- [ ] **Scenario: Only the CTOC part, the kind and the template move the fingerprint**
  Given a request's allowed facts and description
  When the CTOC part, the kind or the message template changes, one at a time
  Then each change gives a different fingerprint
  And when the CTOC version, operating system family, Node.js major version, plan stage, step label or description changes instead, the fingerprint stays the same

- [ ] **Scenario: Inputs that join to the same text still get different fingerprints**
  Given, for each character among the printable ASCII characters, the line feed and the null character, two frictions of kind `refusal`: one with CTOC part `src/a.js` and a template made of that character followed by `b`, the other with CTOC part `src/a.js` followed by that character and template `b`
  When the fingerprint of each friction is computed directly, as the reader does from untrusted values
  Then the two fingerprints of every pair differ

- [ ] **Scenario: A written request gives no finding from the existing secrets scanner**
  Given a request text written with a real fingerprint, every field filled, and a template holding double quotes
  When the existing `SecretsScanner` from `src/lib/secrets-scanner.js` scans it with `scanContent`
  Then it reports zero findings of any severity
  And no field name contains secret, key, token, password, passwd, pwd, credential, auth, session or signature

- [ ] **Scenario: Writing, reading and fingerprinting make no network call**
  Given Node.js's network functions (`fetch`, and the request, connect and lookup functions of `http`, `https`, `net`, `tls` and `dns`) replaced by functions that fail the test when called
  When a request is written, read back and fingerprinted
  Then all three succeed, and no network function was called

## Scope

### In Scope
- **The owner's fixed list as a closed set of fields, each with its allowed kind of value.** CTOC version, operating system family, Node.js major version, the CTOC part involved, plan stage, iron loop step label, kind of friction, message template, fingerprint. The allowed values are listed under "Decisions Taken Under Ambiguity". Any other field, and any value outside its kind, is refused. (Scenarios: a request with only allowed fields is written; a field outside the owner's list is refused; a value outside its allowed kind is refused.)
- **Required and optional fields.** A missing required field is refused; a missing optional field is left out of the block. (Scenario: a missing required field is refused.)
- **The layout.** One fenced code block whose first line is the marker line, naming the format and its version; one line per field; the human's description as prose under the block, outside it. (Scenario: a request with only allowed fields is written.)
- **Refusals that never repeat a value.** A refusal names the field and the rule it broke, never the value. (Scenarios: a field outside the owner's list is refused; a value outside its allowed kind is refused.)
- **Reading a request text back** into the same fields and description, with line feeds or carriage return and line feeds. (Scenario: a written request reads back into the same fields.)
- **Unparsed, never partly read.** Every text that does not match the format is reported as unparsed with a line number and a reason. (Scenarios: a text that does not match the format is reported as unparsed; a request from a newer format version is reported as unparsed.)
- **Every older format version stays readable,** with a committed sample per version and a test that fails when one stops reading; the marker's fixed text never changes between versions. (Scenario: every older format version stays readable.)
- **The fingerprint.** Lowercase hexadecimal, made with Node.js's built-in `crypto` module from the CTOC part, the kind and the message template only; the same on every platform and for both line-ending styles; unambiguous where one input ends and the next begins. (Scenarios: the same friction gets the same fingerprint on every platform; only the CTOC part, the kind and the template move the fingerprint; inputs that join to the same text still get different fingerprints.)
- **No finding from the existing secrets scanner** on a written request, and no field name that the scanner keys on. (Scenario: a written request gives no finding from the existing secrets scanner.)
- **No network use** by writing, reading or fingerprinting. (Scenario: writing, reading and fingerprinting make no network call.)

### Out of Scope
- Reducing a real CTOC message to its template, the request's title, recording a friction, and the drafts folder. These live in the sibling stub "CTOC quietly drafts a request for each friction it meets", which is the only producer of the template field.
- Checking the final text for private data, the template and the description included. That lives in the sibling stub "A blocking scan stops any request carrying private data". This format checks each value's shape, never its meaning.
- The request length limit, the preview, composing GitHub's new-issue address and opening it. These live in the sibling stub "The user sees the full request and opens it on GitHub".
- Searching GitHub for the marker, grouping by fingerprint on screen, quoting request text as untrusted data, and showing unparsed requests to the maintainers. These live in the sibling stub "Maintainers triage grouped requests into vision drafts", which consumes this reader's verdict.
- The file of known fingerprints and the lookup against it. That lives in the sibling stub "A draft the maintainers already know links to the request".
- The exact hash formula, the exact field names, the exact marker text and how a line break inside a value is written. These belong to the implementation plan: the vision left the formula to it, and the other three are details within the rules recorded below.
- Any field beyond the owner's list. This is not planned: the owner fixed the list on 2026-10-22, and adding a field changes his decision, so it goes to him.

## Risks

### Technical Risks
- **The existing secrets scanner reads the fingerprint as a secret, and every request blocks itself.**
  - Likelihood: LOW. **Read:** a hexadecimal string carries at most 4 bits of entropy per character, below the 4.5 threshold (`src/lib/secrets-scanner.js:444`). The pattern with no entropy gate needs a quoted value after a name ending in secret, API key, token or auth (`:285`). The unquoted path needs a secret-ish key name and the same entropy floor (`:1036-1057`).
  - Impact: HIGH
  - Mitigation: Test a complete written request through `SecretsScanner.scanContent` and require zero findings of any severity.
- **Line endings split groups by platform.** Text submitted through a browser form may come back from GitHub with carriage return and line feeds (**not checked**).
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test reading and fingerprinting on the same request with both line-ending styles.
- **Different frictions share a fingerprint because the inputs are joined ambiguously.** **Read:** the existing `computeFingerprint` for critic findings joins its inputs with `|` (`src/lib/refinement-loop.js:347-351`), so a value holding `|` can collide. That shape must not be copied here.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test every printable separator character placed at the boundary between two inputs.

### Business Risks
- **A field through which project data could still travel.** The message template is free text. A template with a project value left in it passes this format, which checks shape, not meaning. A leak cannot be recalled once posted.
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: Route every written request through the blocking scan before it is shown. The showing stub depends on the scan stub, and this format makes no claim to vet meaning.
- **The first released format is frozen.** Every installation that writes it must stay readable, so a mistake in its field list or layout stays in the reader permanently.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Review the field list against the five friction sources the drafting stub names before the first release that writes a request. Keep the version in the marker line, so that a correction is a new version, not an edit.
- **Fingerprint granularity.** A CTOC message reworded between versions gives the same friction a new fingerprint, and two different frictions in one file with the same generic template merge.
  - Likelihood: MEDIUM
  - Impact: LOW. Triage shows each request's template and version, and the maintainer can mark a duplicate.
  - Mitigation: Test the fingerprint against the drafting stub's real templates in that stub's walking-skeleton tests.

### Dependency Risks
- **No live caller of its own.** **Read:** the reachability fence counts unreachable files as debt that may only shrink (`docs/FENCES.md:155-176`). How `tests/reachability.test.js` treats one new unreachable file was not run.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Plan this stub's module in the same implementation chain as the drafting stub's walking skeleton, so the change that adds the module also adds its first live caller.
- **Cross-platform proof without GitHub Actions.** Tests run locally before a push. Whether any Windows or Linux machine runs the suite was **not checked**.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Pin the expected fingerprint value in the test, so any platform that computes another value fails, and test Windows and Linux path shapes as strings on every platform.
- **The marker must be findable by GitHub's search.** How GitHub's issue search treats the marker line was **not checked**; that is the triage stub's spike.
  - Likelihood: LOW
  - Impact: MEDIUM. Triage would miss requests, and the frozen format would need a new version.
  - Mitigation: Confirm in the triage stub's spike that a search for the marker's fixed text finds a test issue, before the first release that writes requests.

## Priority

**Priority: HIGH** (Score: 8/9)
- Dependency: 3. The drafting and triage stubs depend on it directly, and the showing and known-requests stubs through them. Only the scan stub does not.
- Business Impact: 3. It carries the owner's fixed list of what may leave the machine, which is the privacy contract, and the fingerprint that keeps the maintainers from being buried.
- Technical Risk: 2. Node.js's built-in hashing and line parsing are well understood. The cross-version contract and the interplay with the secrets scanner are moderate.

## Decisions Taken Under Ambiguity

- **The description sits under the block as prose, outside it.** The decomposition left this choice to the Product Owner.
  - The block is read by CTOC; the description is the human's free text, and it is not part of the fingerprint.
  - Outside the block, nothing the human types can pose as a field.
  - The reader returns all text outside the block, untouched, as the description. A human may edit the prefilled text on GitHub's page before pressing Submit, so text above the block is possible too.
- **A request holds exactly one block.**
  - A text with two marker blocks is unparsed.
  - The writer refuses a description that holds the marker's fixed text, so that an honest quote is caught on the user's machine rather than arriving unparsed.
- **Required and optional fields.**
  - Required: CTOC version, operating system family, Node.js major version, CTOC part, kind of friction, fingerprint.
  - Optional: plan stage, iron loop step label, message template. A missing route, a confusing screen or a workaround by hand may have no stage, step or printed message; the drafting stub's workaround route carries only the part and the kind.
  - An empty value counts as absent.
- **Values are checked, not just field names.** A check on names alone would let the CTOC part carry a project path. The format owns these sets; the drafting stub's workaround route uses them and writes no second list.
  - Operating system family: `windows`, `macos` or `linux`.
  - Node.js major version: a whole number.
  - CTOC version: three dot-separated whole numbers. **Read:** `VERSION` holds `6.14.134`.
  - Plan stage: one of the eight stage folder names. **Read:** `src/lib/plan-validator.js:1805`.
  - Iron loop step label: one of the sixteen labels. **Read:** `src/lib/state-manager.js:15-32`.
  - Kind of friction: refusal, failure, missing route, confusing screen, or workaround by hand. These are the vision's five.
  - CTOC part: a repository-relative path with forward slashes, naming a file that exists in the running CTOC's own copy, with no `..`, no leading slash, no drive letter and no backslash. A menu route is named by the file that holds it. File granularity is enough, because the template separates two checks in one file.
- **The reader checks the CTOC part's shape, not its existence.** The maintainer's newer CTOC may have renamed the file. Every other set is checked as the writer checks it. Sets may grow between format versions and never shrink.
- **Placeholders in the template.** They have one written form and a closed set of kinds, owned by this format and produced by the drafting stub. The writer refuses a placeholder of an unknown kind. The delimiter and the kinds are the planner's.
- **Line breaks inside the template.** They are normalised to a single line feed before writing and fingerprinting, and they come back unchanged on reading. How they are written inside a one-line field is the planner's.
- **The writer computes the fingerprint;** a caller never supplies it.
- **The reader recomputes the fingerprint,** and reports a mismatch as unparsed, so that a hand-edited or forged request cannot join another group.
- **Field names.** They use lowercase letters and underscores only, and none contains secret, key, token, password, passwd, pwd, credential, auth, session or signature. **Read:** these are the words the scanner's patterns key on (`src/lib/secrets-scanner.js:285`, `:973`, `:1037`). The exact names are the planner's.
- **The marker line.** It is the first line inside a backtick code fence. Its fixed text is identical in every format version apart from the version number, so that one search finds every version. The exact text is the planner's.
- **Refusals and unparsed reasons name the field or the line number and the rule,** never the value or the line's text. This follows the scan stub's rule that no message repeats what it found.
- **Zero scanner findings of any severity, not zero blocking findings.** **Read:** `HIGH_ENTROPY` is `LOW` (`src/lib/secrets-scanner.js:89`). The scan stub may treat every finding as blocking, so the format must produce none.
- **Hashing.** It uses Node.js's built-in `crypto` module. **Read:** `hashString` in `src/lib/hash-utils.js:47-51` already gives a SHA-256 hexadecimal digest. The formula, including any shortening, is the planner's, by the vision's decision.
- **Wiring.** The first live caller of the writer and the fingerprint is the drafting stub's walking skeleton: the refusal by the check before the build queue becomes a draft. The reader's first live callers are the triage listing and, if the drafting stub reads its stored drafts back through it, the draft count and draft view. This is a technical what-ships-with-what constraint from the rule that a module is done when a human can reach it. The owner alone chooses when it is built.
- **Cross-platform proof.** It rests on a pinned expected fingerprint value and on path shapes tested as strings, because no GitHub Actions run exists.
- **No question for the owner.** Nothing here reaches the bar. The field list, the route and the rule against online calls are his decisions already. The hash formula is the planner's, by the vision's decision. Everything else is a detail recorded above.
- **Overlap check.**
  - The five sibling stubs were read. None defines the request format, and each boundary is named under "Out of Scope".
  - The decomposition's story that older format versions stay readable is merged into the reading story, giving three stories.
- **Searches run in this pass.**
  - Pattern `fingerprint`, case-insensitive, over `src/`: 9 files matched. Two were opened, and they fingerprint critic findings (`src/lib/refinement-loop.js`) and menu state (`src/lib/ctoc-routing-reminder.js`), not requests. The other seven were not opened.
  - Pattern `createHash\(` over `src/`: 21 matching lines in 15 files.
  - No search can show that no request format exists, because it has no name yet.
- **Read in this pass (version 6.14.134):**
  - `src/lib/secrets-scanner.js:89`, `:282-287`, `:444`, `:876-960`, `:969-1009`, `:1012-1059`;
  - `src/lib/hash-utils.js`;
  - `src/lib/refinement-loop.js:344-351`;
  - `src/lib/state-manager.js:15-32`;
  - `src/lib/iron-loop.js:230-240`;
  - `src/lib/plan-validator.js:376-386`, `:1239-1282`, `:1805`;
  - `docs/FENCES.md:155-181`;
  - `VERSION`.
- **Untrusted text.** No instruction in the vision, the decomposition or the sibling stubs was acted on. None asked for anything outside this refinement.
