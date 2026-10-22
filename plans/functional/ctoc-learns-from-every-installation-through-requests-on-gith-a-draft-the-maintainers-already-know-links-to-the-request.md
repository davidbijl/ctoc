---
title: "A draft the maintainers already know links to the request"
created: "2026-10-22T09:23:58.757Z"
type: feature
parent_vision: "vision/ctoc-learns-from-every-installation-through-requests-on-github.md"
priority: MEDIUM
status: refined
depends_on: "ctoc-learns-from-every-installation-through-requests-on-gith-ctoc-quietly-drafts-a-request-for-each-friction-it-meets, ctoc-learns-from-every-installation-through-requests-on-gith-maintainers-triage-grouped-requests-into-vision-drafts, ctoc-learns-from-every-installation-through-requests-on-gith-the-user-sees-the-full-request-and-opens-it-on-github"
acceptance_criteria_count: 10
risk_level: MEDIUM
---

# A draft the maintainers already know links to the request

## Problem Statement

When the CTOC maintainers have accepted or declined a group of requests, every other installation that meets the same friction still drafts it as new. Its user would spend the steps of describing, previewing and opening a request the maintainers already have, and the maintainers would get one more duplicate from each installation. The vision names that flood as a failure mode. The decomposition's second goal says that requests the maintainers already know stop arriving as new ones.

The owner has already decided how this works:
- Each CTOC release carries the fingerprints of the groups the maintainers accepted or declined.
- When a draft's fingerprint is on that list, CTOC shows "already known to the CTOC maintainers" with the link. It does not offer a new request.
- Recognition happens on the user's machine. Nothing is looked up on the network before sending, and CTOC holds no token.
- No online model call; Windows, macOS and Linux.

So the list travels the one way that already reaches every installation: inside the CTOC copy itself.
- **Read:** an update clones the public repository, or resets its copy to the public main branch (`src/commands/update.js:333`, `:336-337`). It then mirrors that copy into the installed copy, leaving out `.git` (`:412`). It mirrors even when the version number has not changed (`:371-385`).
- So a committed file reaches an installation on its next update, including when only main changed.
- **Searched (a presence check):** pattern `already known|known[-_ ]requests|knownFingerprints|known-fingerprints`, case-insensitive, over `src/`. It matched two files, both code comments about other things (`src/lib/enforcement-liveness.js:156`, `src/lib/durable-log.js:83`). No list of known requests exists today.

Two facts make this harder than a lookup:
- **A draft can be older than the list.** Drafts collect quietly on the user's machine (drafting plan). Suppose an update puts a fingerprint on the list. A draft kept earlier for that fingerprint must stop being offered too. Otherwise the user files exactly the duplicate this stub exists to prevent.
- **The list must hold only CTOC's own facts.** It goes into the public repository through the maintainer's accept or decline, and the requests behind it were written by strangers. So:
  - nothing a stranger typed may reach it;
  - a damaged or hand-edited list must not block a user's request;
  - it must not send a user to an address outside the CTOC repository.

## Business Alignment

**Job to Be Done:** When my CTOC meets a friction the CTOC maintainers have already accepted or declined, I want it to tell me so, with the link to their request, instead of offering me a new one, so I can follow the known request on GitHub and not spend time filing a duplicate, without CTOC looking anything up on the network.

**Impact Map:**
- **Goal:** the decomposition's second goal: the maintainers turn incoming requests into CTOC's own plans without being buried.
  - Its success measure names this stub: a draft whose fingerprint is on the shipped list shows "already known to the CTOC maintainers" with the link, and no new request is offered.
- **Actor:** two groups, both among the vision's target users:
  - the CTOC maintainers, the owner and the agents that build CTOC for him, who write the list by accepting or declining a group in the CTOC repository's own menu;
  - the CTOC user in a private or client project, on Windows, macOS or Linux, whose CTOC reads the list.
- **Impact:**
  - The maintainer's accept or decline, a step he already takes, now also records the fingerprint. There is no separate bookkeeping.
  - A user who meets a known friction sees the link in the drafts list and has nothing to open. Installations that have updated stop sending duplicates of known requests.
- **Deliverable:**
  - the list of known requests, committed in the repository;
  - the entry that the accept and decline routes add to it;
  - the known line in the drafts list;
  - the refusal by the routes that would otherwise open a known draft.

**Alignment checks:**
- The goal traces to the vision's problem statement, and to its success measure that duplicates collapse and known requests are recognised on the user's own machine: YES.
- Both actors are in the vision's target audience: YES.
- The impact is observable: an entry in a committed file, a known line with a link, and an open action that is not offered: YES.
- The deliverable is one functional area, recognising known requests. One side writes it and the other reads it: YES.

## User Stories

**As a** CTOC maintainer, **I want** accepting or declining a group on the triage screen to add three things, once per fingerprint and nothing else, to the list of known requests in the repository:
- the group's fingerprint;
- the number of its first issue;
- the repository's CTOC version.

**so that** the CTOC copy that installations receive next recognises that friction, and their users stop filing it again.
- INVEST: passes. Independent is qualified: it extends the triage stub's accept and decline routes, and that stub is a dependency.

**As a** CTOC user, **I want** a draft whose fingerprint is on the list my CTOC copy carries never to be offered as a request I could open. I want it shown instead as "already known to the CTOC maintainers", with the link to the request and the CTOC version at which the maintainers recorded it. This applies also when I kept the draft before my last update. **so that** I do not file a duplicate, can follow the known request on GitHub, and can see how long it has been known.
- INVEST: passes. Independent is qualified: it changes screens and routes of three dependencies:
  - the drafting stub's count line, drafts list and draft view;
  - the showing and sending stub's describe, preview and open routes.
- Valuable is reworded from the decomposition. An installation that carries an entry is already at or past the version that recorded it. So the version tells the user how long the friction has been known, not that updating may fix it.


## Acceptance Criteria

Common to every scenario:
- "The list" is the list of known requests, at `src/data/known-requests.jsonl` in the repository (see "Decisions Taken Under Ambiguity").
- **The maintainers' side** uses the triage plan's setup:
  - its fake CTOC repository, its stand-in for the GitHub command-line tool, and its fixture issues, numbered as in that plan;
  - the repository's `VERSION` holds `6.14.134`;
  - unless a scenario says otherwise, the repository holds a committed list with one entry, for a fingerprint that no fixture uses.
- **The installation side:**
  - The running CTOC copy is the repository under test.
  - The list it reads is a fixture file that the scenario names. How a test points the lookup at it is the planner's choice.
  - Only the scenario "The committed list holds only fingerprints, issue numbers and versions" reads the repository's real list.
- **Drafts:**
  - Drafts come from the drafting plan's recorder, through its walking-skeleton friction, whichever source the owner's answer to that plan's question gives. Where a scenario says so, the format's writer writes them straight into the drafts folder instead.
  - Every fixture fingerprint is computed by the format's own fingerprint function.
- **Route names:** the routes are called as their plans call them:
  - the triage plan's accept, decline and duplicate routes;
  - the drafting plan's count line, drafts list and draft view;
  - the showing and sending plan's describe, preview and open routes.

  Their real names are chosen by those plans' planners.
- **No network:** Node.js's network functions are replaced by functions that fail the test when called. These are `fetch`, and the request, connect and lookup functions of `http`, `https`, `net`, `tls` and `dns`. No scenario makes an online model call.
- The tests pass on Windows, macOS and Linux.

### Accepting or declining a group adds it to the list

- [ ] **Scenario: Accepting a group adds exactly one entry, and nothing from the requests**
  Given the group of issues 11 and 12, whose issue titles, descriptions and message templates each hold a unique marker
  When the accept route runs with the group's fingerprint
  Then the list holds one new entry with exactly three values:
  - the group's full fingerprint;
  - the issue number 11, the lowest in the group;
  - the version `6.14.134`.

  And the entries are ordered by fingerprint, one entry per line
  And `git diff` of the list shows exactly one added line and no removed line
  And no marker appears in the list
  And the screen says in one sentence that the fingerprint was added to the list of known requests. That sentence names the list's repository path, and says that installations recognise it once the change is committed and pushed and they update.
  And the accept's other effects are exactly those the triage plan gives it

- [ ] **Scenario: Declining a group adds an entry; a duplicate mark and declining an unreadable request add none**
  Given the group of issues 11 and 12, and issue 16, whose request does not parse
  When the decline route runs for the group's fingerprint, with a reason that holds a unique marker
  Then the list gains one entry: the group's fingerprint, the issue number 11 and the version `6.14.134`
  And the marker appears nowhere in the list
  And in a fresh fake repository, each of these leaves the list byte-identical: marking issue 12 as a duplicate of issue 11; declining issue 16 by its number

- [ ] **Scenario: A fingerprint already on the list stays one entry, unchanged**
  Given a list that holds the group's fingerprint with the issue number 11 and the version `6.14.120`
  And issue 10, a third request of the same group, open as well
  When the accept route runs for the group
  And, in a second fresh repository holding the same list, the decline route runs for the group
  Then in both repositories the list is byte-identical to before
  And each screen says that the fingerprint was already on the list of known requests

- [ ] **Scenario: A list that cannot be written is left alone and said plainly, and the same action repairs it**
  Given, one at a time, a fake repository in which the list's place:
  - holds a folder;
  - holds no file;
  - holds a list with git's merge-conflict lines in it.

  When the accept route runs for the group of issues 11 and 12
  Then the route returns its screen without an error, and the accept's other effects are those the triage plan gives it
  And the screen says in one sentence that the fingerprint could not be added to the list of known requests. It names the list's repository path, and says that running the same accept again adds the entry once the committed list is back.
  And the folder and the conflicted list are byte-identical to before, and the missing file is still missing
  And after the committed list is put back and the accept route runs again, the list gains the entry and no second vision draft is made

- [ ] **Scenario: The committed list holds only fingerprints, issue numbers and versions**
  Given the list committed in the repository under test
  When the test suite runs
  Then the list exists, and every entry holds exactly three values:
  - a fingerprint of the format's shape and length;
  - a whole issue number above zero;
  - a version of three whole numbers separated by dots.

  And no fingerprint appears twice, and entries are ordered by fingerprint, one JSON object per line, with no other line
  And every line, the last one included, ends with a line feed, or with a carriage return and a line feed
  And the existing `SecretsScanner` from `src/lib/secrets-scanner.js`, scanning the list with `scanContent`, reports zero findings of any severity
  And the same check fails, naming the line, on each of these fixture lists:
  - an entry with a fourth value;
  - a web address;
  - a word of text in place of a value;
  - a fingerprint that appears twice;
  - two entries out of order.

### A draft the maintainers already know is shown as known, and never offered

- [ ] **Scenario: A known friction shows the known line and the link, and only drafts that are not known are counted**
  Given a fixture list holding the fingerprint of the walking-skeleton friction, with the issue number 11 and the version `6.14.120`
  And a fake project with noticing at its default
  And a second draft in the project's drafts folder whose fingerprint is not on the list
  When the walking-skeleton friction is triggered, `/ctoc:start` opens on its opening screen, and the drafts list runs
  Then the opening screen's count line names one draft
  And the drafts list shows the second draft the way the drafting plan shows a draft
  And under a heading that says "already known to the CTOC maintainers", the drafts list shows one line holding:
  - the known draft's title;
  - the link `https://github.com/robotijn/ctoc/issues/11`;
  - the version `6.14.120`.

  And the known lookup reads one file, starts no process and calls no network function

- [ ] **Scenario: Nothing offers to open a known draft**
  Given the known draft of the previous scenario
  When each of these runs for it:
  - the draft view;
  - the describe route, with a two-line description in plain words on standard input;
  - the preview route;
  - the open route, with any digest.

  Then each screen shows the known line with the link and the version
  And the draft view shows the draft's local text under that line, and offers no new action
  And the describe route stores nothing, and the draft file is byte-identical
  And the preview route shows no request text and offers no open action
  And the open route starts no launcher and prints no web address

- [ ] **Scenario: A draft kept before an update is known after it, and stays known when the friction repeats**
  Given a draft of the walking-skeleton friction, kept while the fixture list was empty
  And the description `first words`, stored for it through the describe route
  And the opening screen's count line names one draft, and the preview route offers to open it
  When the fixture list gains the draft's fingerprint, as an update brings it
  Then the opening screen holds no count line
  And the drafts list shows the draft under the known heading
  And the preview route offers no open action
  And the draft file is byte-identical
  And when the friction is triggered again under a newer CTOC version, the drafts folder still holds one draft for that fingerprint, its description is still `first words`, and it is still shown as known
  And when the fixture list loses the fingerprint again, the draft is counted, listed and offered to open as before, with `first words` unchanged

- [ ] **Scenario: Only the list in the running CTOC copy counts**
  Given a running copy whose fixture list does not hold the walking-skeleton fingerprint, and a draft of that friction
  And in the project, a valid list holding that fingerprint with the issue number 99, both at `src/data/known-requests.jsonl` and at `.ctoc/known-requests.jsonl`
  And the menu runs from the project's folder
  When the opening screen opens, the drafts list runs and the preview route runs
  Then the draft is counted, listed and offered to open, and no known line appears
  And separately, in the triage plan's fake CTOC repository: after the accept route has added a fingerprint to that repository's own list, a draft of that fingerprint is still offered while the running copy's list lacks it

- [ ] **Scenario: A missing or damaged list never blocks a request, and never sends anyone elsewhere**
  Given a draft whose fingerprint is a fixture value
  And, one at a time, a running copy with:
  - no list;
  - a list with a line that is not a JSON object;
  - a list with git's merge-conflict lines in it;
  - a list holding the draft's fingerprint with the issue number `0`, `-3` or `11a`, or with `https://example.com/` in place of the number, one at a time;
  - a list holding the draft's fingerprint next to an entry with a fourth value.

  When the opening screen opens, the drafts list runs and the preview route runs
  Then in each case the draft is counted, listed and offered to open exactly as with an empty list
  And the drafts list shows one line saying that this CTOC's list of known requests could not be read, with none of its content
  And each route returns its screen without an error
  And given instead the valid list of the first scenario of this story, with every line ending in a carriage return and a line feed, the draft is shown as known

## Scope

### In Scope
- **The list of known requests at `src/data/known-requests.jsonl`.** (Scenarios: accepting a group adds exactly one entry; the committed list holds only fingerprints, issue numbers and versions.)
  - Each entry holds exactly three values: the full fingerprint, an issue number and a version.
  - Entries are ordered by fingerprint, one per line.
  - The list is committed in the repository and ships inside every CTOC copy.
  - The list is in JSON Lines: one object per line, with no enclosing array.
  - The first build commits an empty file, which is an empty list.
- **The entry that accepting or declining a group adds.** (Scenarios: accepting a group adds exactly one entry; declining a group adds an entry.)
  - It holds the group's fingerprint, the lowest issue number in the group at the time of the action, and the repository's `VERSION` at that time.
  - A duplicate mark adds no entry, and neither does declining an unreadable request.
- **One entry per fingerprint.** The first entry stands. (Scenario: a fingerprint already on the list stays one entry.)
- **A list that cannot be written.** It is left byte-identical, the screen says so, and running the same action again repairs it. (Scenario: a list that cannot be written is left alone.)
- **The suite's check of the committed list.** (Scenario: the committed list holds only fingerprints, issue numbers and versions.)
- **The known lookup.** (Scenarios: a known friction shows the known line; only the list in the running CTOC copy counts; a missing or damaged list never blocks a request.)
  - It runs offline, and reads only the list in the running CTOC copy.
  - A list that is valid as a whole counts. Any other list counts as empty, and the drafts list says so.
- **Known-ness is decided whenever a draft is read.** (Scenarios: a known friction shows the known line; nothing offers to open a known draft; a draft kept before an update is known after it.)
  - The drafting stub's count line counts only drafts that are not known.
  - Its drafts list shows known drafts under their own heading, with the link and the version.
  - Its draft view shows the known line above the local text.
  - The showing and sending stub's describe, preview and open routes refuse a known draft with the known line, before they do anything else.
- **Links are built from the issue number at display time,** with the fixed repository `robotijn/ctoc`. (Scenarios: a known friction shows the known line; a missing or damaged list never blocks a request.)

### Out of Scope
- **Listing, grouping, quoting, accepting, declining and marking duplicates themselves.** These live in the sibling stub "Maintainers triage grouped requests into vision drafts". This stub adds one write to its accept and decline.
- **The fingerprint, the marker and the reader.** These live in the sibling stub "A request holds only the allowed facts and a fingerprint".
- **Recording a friction, the drafts folder, and the count line, drafts list and draft view themselves.** These live in the sibling stub "CTOC quietly drafts a request for each friction it meets". This stub changes how those screens treat a known draft.
- **The describe, preview and open routes themselves, and the blocking scan.** These live in the sibling stubs "The user sees the full request and opens it on GitHub" and "A blocking scan stops any request carrying private data".
- **Committing and pushing the list, and making a release.** These are the maintainer's own acts. `src/scripts/release.js` needs no change (see "Decisions Taken Under Ambiguity").
- **Removing an entry from the list,** for example when the fix for an accepted friction ships. No stub of this vision carries it. The list is a committed file that any plan can edit. See Risks.
- **Marking, in the triage listing, a group whose fingerprint is already on the list.** No stub of this vision carries it.
- **Any lookup on GitHub from an installation.** The owner ruled it out: recognition is offline.

## Risks

### Technical Risks
- **The lookup reads a list from the user's project instead of the running CTOC copy.**
  - **Read:** `getPluginRoot` falls back to the current folder when it finds no `VERSION` within five folders above its own (`src/lib/version.js:27-39`).
  - Likelihood: MEDIUM
  - Impact: MEDIUM. A planted list could mark every friction as known, and that would silence the user's requests. It cannot send anyone outside the CTOC repository, because every link is built from a number.
  - Mitigation: Resolve the list from the running copy's own folder. Test it with valid lists at the same paths in the project.
- **The sibling stubs' tests change outcome once the real list holds a fingerprint they trigger.** The walking-skeleton friction is the friction most likely to be reported and accepted.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Point the lookup at a fixture list in every test: an empty one in the drafting, showing and triage tests. Read the real list only in the scenario that checks it.
- **Two checkouts or worktrees add entries at the same time, and git cannot merge them.**
  - Likelihood: LOW
  - Impact: LOW
  - Mitigation: Keep one entry per line, ordered by fingerprint, so two different entries merge unless they are next to each other. Let the suite's check refuse a list that holds conflict lines before it is pushed.
- **A checkout on Windows turns line feeds into carriage returns and line feeds.** A file search found no `.gitattributes` in the repository. **Believed, not checked:** git for Windows converts line endings on checkout by default.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Test both reading and checking the list with both line endings.

### Business Risks
- **A fixed friction that comes back is shown as known, and is never reported again.** A regression gives the friction the same CTOC part, kind and template, so it has the same fingerprint.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Show the link on the known line, so the user can comment on the known issue on GitHub themselves. Name the removal of an entry as a plain edit that any plan can make. No stub of this vision removes entries on its own.
- **Two different frictions share a fingerprint** (the format plan's risk "Fingerprint granularity"). A new friction is then shown as known, with an unrelated link.
  - Likelihood: LOW
  - Impact: MEDIUM
  - Mitigation: Show the draft's title and the link on the known line, so the user can see it is a different friction and comment on the issue.
- **A reworded CTOC message gives a known friction a new fingerprint,** and duplicates arrive again.
  - Likelihood: MEDIUM
  - Impact: LOW
  - Mitigation: Group them at triage, and mark duplicates there (triage plan).
- **Installations that do not update keep offering known frictions.**
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Group them at triage, which shows each request's version (triage plan).

### Dependency Risks
- **This stub changes the screens and routes of three sibling stubs, and depends on all three.**
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Add only clauses for a known fingerprint, so that no sibling scenario changes. List the showing and sending stub in `depends_on`.
- **Shared files and documented counts.** A new module under `src/lib/` moves a documented count. A file under `src/data/` does not (**read:** `src/lib/documented-counts.js:74-86`).
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Declare `CLAUDE.md` in the implementation plan that creates a counted file. Name the shared menu files in each plan, so that whoever schedules can order them.
- **An installation made through Claude Code's own marketplace install may not carry the file.** Whether that install copies every committed file was not checked. `src/commands/update.js` is one install path.
  - Likelihood: LOW
  - Impact: MEDIUM. Known requests would not be recognised there, and the drafts list would say the list could not be read.
  - Mitigation: Check, in the implementation plan, that a marketplace install carries `src/data/known-requests.jsonl`.

## Priority

**Priority: MEDIUM** (Score: 5/9)
- Dependency: 1. It depends on three stubs, and no stub depends on it.
- Business Impact: 2. It serves the second goal by keeping known requests from arriving again. Getting a friction from an installation to GitHub works without it.
- Technical Risk: 2. It brings no new technology. The moderate part is two things: deciding known-ness in six routes of two sibling stubs, and a committed list that must hold across three platforms' line endings.

## Decisions Taken Under Ambiguity

- **Known-ness is decided whenever a draft is read, not only when it is made.** This departs from the decomposition, which said "a known fingerprint is caught when the draft is made".
  - Why: suppose a draft was kept before an update. Catching only at making time leaves that draft offered after the update brings its fingerprint. The owner's rule reads "when a draft's fingerprint is on that list", which covers every draft.
  - The recorder does not change. The draft file stays as the drafting plan keeps it.
  - The count line, the drafts list, the draft view, and the describe, preview and open routes each look up the draft's fingerprint.
  - A repeat under a newer CTOC version refreshes the draft (drafting plan) and leaves its fingerprint unchanged, so the draft stays known. The person's description is never overwritten (drafting plan).
  - If an entry ever leaves the list, the draft comes back intact.
  - Consequences:
    - The showing and sending stub is now a dependency, and `depends_on` names it.
    - That plan's note that a known draft needs no change on its side no longer holds.
    - The changes are clauses for a known fingerprint only. No sibling scenario uses a known fingerprint, so none of them changes.
    - The chain format → drafting → showing → this stub is four stubs long, one more than the decomposition's limit. The dependency is real, so it is recorded rather than hidden.
    - **Read:** no code enforces that limit. The plan check walks a `depends_on` chain of any length (`src/lib/plan-validator.js:1604-1678`). The build order is a topological sort, whose comment names a depth of three as the planner's practice, not as a check (`src/lib/actions.js:2859-2869`).
- **The known line sits in the drafts list.** It does not appear on the opening screen, and not at the moment of the friction.
  - The drafting plan requires a source's printed output to stay byte-identical, with nothing about drafting printed.
  - The vision rules out interrupting the user.
  - The count line counts only drafts that are not known. A user whose drafts are all known sees no line.
- **The list lives at `src/data/known-requests.jsonl`.**
  - It is product data that ships with the code. It sits next to the one existing data file, `src/data/skills-index.json` (file search).
  - A search for `skills-index\.json` over `src/` matched nothing. So no code reads that folder today (a presence check), and the lookup is its first reader.
  - It is not under `.ctoc/`. In every user's project, `.ctoc/` is that project's own state folder, so code that confused CTOC's folder with the project's would find a project's file at the same path. The scenario "only the list in the running CTOC copy counts" tests both paths anyway.
  - **Read:** a file under `src/data/` is not a counted class (`src/lib/documented-counts.js:74-86`).
  - It is not ignored by git. The lines of `.gitignore` that match `ctoc|data` all name parts of `.ctoc/` (search).
- **An entry holds the full fingerprint, the issue number and the version, and nothing else.** It holds no link, no accept-or-decline outcome, no reason, no title, no count and no date.
  - The link is built at display time from the number and the fixed repository `robotijn/ctoc`. So no entry can send a user anywhere else.
  - The issue is the group's lowest-numbered one, which was filed first.
  - Triage prints, for every issue, a comment that names the vision draft or gives the decline reason (triage plan). So the issue page shows the outcome, and the list need not store it.
- **"The release that recorded it" is the repository's `VERSION` at the time of the accept or decline.**
  - **Read:** an installed copy carries no git history (`src/commands/update.js:412` leaves out `.git`). So the release cannot be worked out on the user's machine.
  - **Read:** a push to main without a version bump still reaches installations under the same version number (`src/commands/update.js:371-385`).
    - So "the first release that carries it" has no clear meaning.
    - A stamp written by the release script would leave entries with no release on installations that update between two releases.
  - The `VERSION` value is always true as "the CTOC version at which the maintainers recorded it", and the known line says it in those terms. The exact words are the planner's.
  - If `VERSION` cannot be read, no entry is written, and the screen says so like any other failure to write.
- **`src/scripts/release.js` needs no change.**
  - **Read:** it syncs version numbers and documented counts only (`src/scripts/release.js:43-119`, `:416-452`).
  - The list ships because it is committed. No hook or gate logic is touched.
- **How the list reaches installations.** The brief says the list reaches installations only through releases. **Read:** an update also mirrors main when only main changed (`src/commands/update.js:371-385`). This changes nothing in the plan.
- **Only accepting or declining a group adds an entry.**
  - Declining a request that does not parse adds none, because the reader found its fingerprint untrustworthy: the format plan treats a mismatched fingerprint as unparsed.
  - A duplicate mark adds none. The target's group gets its entry when it is accepted or declined.
- **The first entry for a fingerprint stands.** Any further accept or decline of the same fingerprint leaves the list byte-identical, and the screen says so.
- **Accept and decline add an entry only to a list that exists and is valid.**
  - A missing, damaged or unwritable list is left byte-identical, and the screen says so.
  - Running the action again adds the entry. The triage plan's branch for a group already accepted names the existing draft, and this stub adds the missing entry in that branch.
  - The triage plan's own writes come first. This stub's write comes after them, and a failure here does not undo them.
  - This keeps every triage scenario true. The triage plan's fake repository holds no list, so nothing is written to one. That includes its scenario where a draft of the same name already stands in `plans/done/` and nothing is written. This stub's own scenarios supply a list.
- **A list is never left half-written.** It is written to a temporary file in the same folder and then renamed over the list, as `atomicWriteFileSync` does (**read:** `src/scripts/release.js:137-174`). Whether to reuse that function is the planner's choice.
- **A damaged list on an installation counts as empty, and the drafts list says so in one line.**
  - At worst, failing open costs one duplicate request, which triage groups. Failing closed would block every request.
  - A list with any invalid entry is refused as a whole, not entry by entry. That is simpler, and the suite's check keeps the committed list valid.
- **One entry per line, ordered by fingerprint.**
  - A diff of an accept shows the maintainer exactly the added entry before he commits it.
  - Entries added in two checkouts merge unless they are next to each other.
  - The layout is therefore fixed as JSON Lines: one JSON object per line, with no enclosing array and no commas between lines, and an empty file is an empty list. A JSON array cannot keep the one-line diff: the first entry turns `[]` into several lines, and an entry that sorts last adds a comma to the line before it.
  - The field names inside each object are the planner's. None may contain a word the secrets scanner keys on, which the suite's check proves by its zero-findings clause.
- **The lookup reads the list from the running CTOC copy's own folder.** It reads it once per route run. It never reads it from the project, and never through an environment variable or a setting.
  - In the CTOC repository itself, the running copy is the marketplace install (`CLAUDE.md`: CTOC is always installed from the marketplace).
  - So an entry that the accept has just written into the checkout counts only once it ships.
- **The known line is not run through the blocking scan.** Nothing on it leaves the machine, and it holds only these:
  - the draft's title, built from the kind and the CTOC part only (drafting plan);
  - a link built from a number;
  - a version.
- **In the describe, preview and open routes, the known check comes first.** A known draft is never scanned, stored, shown as ready or opened.
- **No new route, no new setting, and no off switch for recognition.**
- **The decomposition's three stories became two.** The story that names the version is merged into the user's story, and its benefit is reworded (see "User Stories").
- **The sibling plans' open questions.** This plan is correct under every answer:
  - The format plan's question, whether to refuse templates CTOC does not ship: the list holds fingerprints computed by the format, and the lookup compares fingerprints only.
  - The scan plan's questions, whole-word or in-word matching, and whether machine and branch names are gathered: this stub does not use the scan, and nothing on the known line leaves the machine.
  - The drafting plan's question, where CTOC may record a friction: the scenarios trigger that plan's walking-skeleton friction, whichever source it is. The format's writer writes every other draft.
  - The showing plan's question, whether the hook refuses a background agent's describe and open: the known refusal sits inside those routes, ahead of everything else, under either answer.
  - The triage plan's question, whether to deny the session GitHub write commands: this stub writes one local file and runs no GitHub command.
- **No question for the owner.** Every fork here is either one of his binding decisions or below his bar for questions.
  - The regression risk is recorded under Risks, not asked. The owner decided what goes onto the list, and removing an entry is a plain edit that any plan can make.
  - The questions file holds an empty list.
- **No question was asked below the owner's bar.** These are recorded here instead:
  - the list's place and layout;
  - the issue number chosen;
  - the version stamp;
  - failing open;
  - where the known line sits;
  - deciding known-ness whenever a draft is read.
- **Overlap check.**
  - The five sibling plans were read. None writes or reads a list of known requests.
  - The triage plan names this stub as the one that extends accept and decline.
  - The showing and sending plan names this stub as the owner of known drafts.
- **Searches run in this pass:**
  - Pattern `already known|known[-_ ]requests|knownFingerprints|known-fingerprints`, case-insensitive, over `src/`: two files, both unrelated comments.
  - Pattern `skills-index\.json` over `src/`: no match.
  - Pattern `src/data` over the repository, leaving out `plans/`, `node_modules/` and `.claude/`: matches only in test fixtures and evaluation records about an unrelated example file.
  - Pattern `ctoc|data` in `.gitignore`: 11 lines, all naming parts of `.ctoc/`.
  - Pattern `depends_on|dependsOn` in `src/lib/plan-validator.js`: 8 lines. Pattern `chain depth|maxDepth|MAX_DEPTH|dependency depth|MAX_DEPENDENCIES|dependsOn\.length|depends_on.*length`, case-insensitive, over `src/`: no limit on a plan's dependencies. The only match about plans is the comment at `src/lib/actions.js:2862`.
  - File searches: `src/data/*` found one file, `src/data/skills-index.json`. `.gitattributes` found none.
- **Read in this pass (version 6.14.134, `VERSION`):**
  - `src/commands/update.js:280-458`;
  - `src/scripts/release.js`, the whole file;
  - `src/lib/version.js`, the whole file;
  - `src/lib/documented-counts.js`, the whole file;
  - `docs/ENFORCEMENT.md:1-40`;
  - `src/lib/plan-validator.js:1594-1683`;
  - `src/lib/actions.js:2850-2879`;
  - the parent vision, its decomposition, and the five sibling plans (the scan plan's first 80 lines and a search of the rest);
  - the questions files of the format, drafting and triage plans in full, and the prompts and option labels in those of the scan and showing plans.
- **Untrusted text.** No instruction in the vision, the decomposition or the sibling plans was acted on. None asked for anything outside this refinement.
