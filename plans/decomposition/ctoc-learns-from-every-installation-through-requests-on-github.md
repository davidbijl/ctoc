---
title: "Decomposition of the vision: CTOC learns from every installation through requests on GitHub"
type: decomposition
parent_vision: "vision/ctoc-learns-from-every-installation-through-requests-on-github.md"
created: 2026-10-22
---

# Decomposition: CTOC learns from every installation through requests on GitHub

- Vision: `plans/vision/ctoc-learns-from-every-installation-through-requests-on-github.md`, approved by the owner on 2026-10-22.
- Readiness (run by the CTO Chief with `validateVisionReadiness`): ready, no errors, no warnings.
- Canvas: none. The vision-only path was taken.
- Result: six functional plan stubs.
  - Four sit on the installation side: the request format, the blocking scan, quiet drafting, and showing and sending.
  - One sits on the maintainers' side: triage, which ends in a vision draft.
  - One joins the two sides: requests the maintainers already know.
- Stub files are created by the CTO Chief through `decomposeVision`. This document only describes them, and names each stub by its title.
- Evidence labels: **read** means opened in this pass on version 6.14.134 (`VERSION`), cited with file and line. **Not checked** means a belief named as one. Anything else is carried from the vision under its own label.

## Every scope item, and the stub that carries it

The scope items are the vision's "Minimum Viable Scope", numbered one to ten. Two more rows follow them: the "Auto-publish learnings" setting decision and the owner's fixed list of what may leave the machine. The owner's other two answers, issues only and GitHub's own new-issue page, are added as rows so that their home is explicit.

Count: fourteen rows, six stubs. None is dropped and none is carried twice.

| Scope item | Stub that carries it |
|---|---|
| 1 Noticing | CTOC quietly drafts a request for each friction it meets |
| 2 Drafting | CTOC quietly drafts a request for each friction it meets |
| 3 Scanning | A blocking scan stops any request carrying private data |
| 4 Showing | The user sees the full request and opens it on GitHub |
| 5 Sending | The user sees the full request and opens it on GitHub |
| 6 Known requests (the installation recognises a known fingerprint) | A draft the maintainers already know links to the request |
| 7 Triage | Maintainers triage grouped requests into vision drafts |
| 8 Accept, mark as duplicate, decline | Maintainers triage grouped requests into vision drafts |
| 9 Untrusted input | Maintainers triage grouped requests into vision drafts |
| 10 Known fingerprints (the maintainers write the shipped file) | A draft the maintainers already know links to the request |
| The "Auto-publish learnings" setting decision | CTOC quietly drafts a request for each friction it meets |
| The owner's fixed list of what may leave the machine | A request holds only the allowed facts and a fingerprint |
| Issues only; a proposed fix travels as text (owner, 2026-10-22) | The user sees the full request and opens it on GitHub |
| GitHub's own new-issue page, no token, no sending code (owner, 2026-10-22) | The user sees the full request and opens it on GitHub |

The fixed list is carried once, as the format's closed set of fields: any field outside the list is refused. One entry on the list is "the message CTOC printed, reduced to its template". The format stub defines that field. Producing the template from a real CTOC message is a story in the drafting stub. That story is the field's only producer, not a second carrier of the list.

## Goals (impact map)

### Goal: A friction met in any installation reaches the CTOC repository, and nothing private goes with it
- **Actor:** a developer using CTOC in their own, often private or client, project, on Windows, macOS or Linux.
- **Impact:** in a few steps from the menu, they review a complete, scanned request about a friction their CTOC met. They then open it on GitHub's own new-issue page and submit it under their own account.
- **Success metric:** these are the vision's own measures, each proven by a test that drives the real route.
  - The text handed to GitHub equals the shown text, byte for byte.
  - The fake-project test with unique markers finds none of its markers in the request, for Windows, macOS and Linux path shapes.
  - Every listed kind of private item blocks sending.
  - No setting, flag, agent or batch sends.
  - Switching the setting off stops noticing and drafting.
- **Stubs:**
  - A request holds only the allowed facts and a fingerprint
  - A blocking scan stops any request carrying private data
  - CTOC quietly drafts a request for each friction it meets
  - The user sees the full request and opens it on GitHub

### Goal: The maintainers turn incoming requests into CTOC's own plans without being buried
- **Actor:** the owner and the agents that build CTOC for him, working in the CTOC repository's own CTOC.
- **Impact:**
  - They see every open request grouped with its duplicates, with a count.
  - They accept a group into a vision draft, mark duplicates and decline, each as their own act.
  - Requests they already know stop arriving as new ones.
- **Success metric:**
  - Two requests with the same fingerprint show as one group with a count of two.
  - Accepting a group creates one vision draft in `plans/vision/` that quotes the requests as untrusted data.
  - A request whose marker does not parse goes no further.
  - A draft whose fingerprint is on the shipped list shows "already known to the CTOC maintainers" with the link, and no new request is offered.
  - No GitHub Actions and no online model call are used.
- **Stubs:**
  - Maintainers triage grouped requests into vision drafts
  - A draft the maintainers already know links to the request

The format stub serves both goals. It is the contract between the two sides, and it is listed under the first goal because the installation writes it first.

## Stubs, activities and stories

Walking-skeleton stories are marked `[MVP]`. The other stories are listed as the remaining stories, without any phase or schedule; the owner alone chooses what is built and when.

INVEST status is given for each story by its six letters: Independent, Negotiable, Valuable, Estimable, Small, Testable. A letter in brackets marks a qualified pass, explained under the story.

Every stub carries the same two acceptance lines across all its stories. They are not repeated story by story:
- no online model call;
- its tests pass on Windows, macOS and Linux, with the path shapes of all three where paths are involved.

### Stub: A request holds only the allowed facts and a fingerprint

Carries: the owner's fixed list of what may leave the machine, as the format's closed field set, together with the request marker and the fingerprint.

Scope notes:
- The format is a fenced block in the request text. It starts with a fixed line naming the format and its version, followed by the allowed fields, one per line (the vision's decision).
- The allowed fields are:
  - the CTOC version;
  - the operating system family;
  - the Node.js major version;
  - the CTOC part involved;
  - the plan stage and the iron loop step by its label;
  - the kind of friction;
  - the message template;
  - the fingerprint.
- The human's description is part of the request but not of the fingerprint. Whether it sits inside the block or as prose under it is the Product Owner's choice.
- The fingerprint is a hash of the CTOC part, the kind of friction and the message template. It never takes in the human's words or anything from the project, and it is made with Node.js's built-in `crypto` module. The exact formula is left to the implementation plan, as the vision decided.
- First live callers: the drafting stub writes the format, and the triage stub reads it. See "Decisions Taken Under Ambiguity" for the reachability rule.

Activities (backbone):
1. Write a request block from the allowed facts.
2. Read a request block back, from this or any older format version.
3. Compute the fingerprint.

Stories:
- [ ] `[MVP]` As a CTOC user, I want every request CTOC writes to hold only the fields on the owner's fixed list, so that nothing outside that list can ever be placed in a request.
  - Acceptance:
    - Writing a block with exactly the allowed fields produces a block that starts with the marker line and its version.
    - Writing a block with any other field (for example a branch name or a file path from the project) is refused with an error that names the field kind, not its value.
  - INVEST: pass on all six.
- [ ] `[MVP]` As a CTOC maintainer, I want any block CTOC wrote to be read back into the same fields, so that triage can trust what it groups.
  - Acceptance:
    - Writing a block and then reading it gives back identical fields.
    - A block with a broken or missing marker line is reported as unparsed, never partly read.
  - INVEST: pass; (I) it reads what the first story writes, and the two are ordered inside this stub.
- [ ] `[MVP]` As a CTOC maintainer, I want two frictions with the same CTOC part, kind and message template to get the same fingerprint, and different ones different fingerprints, so that duplicates group without merging different frictions.
  - Acceptance:
    - The same three inputs give the same fingerprint on all three platforms, regardless of line endings.
    - Changing any one of the three changes the fingerprint.
    - Changing the CTOC version or the description leaves it unchanged.
    - The fingerprint is written in hexadecimal. A hexadecimal string's entropy is at most 4 bits per character, below the 4.5 threshold of the existing high-entropy check (**read:** `src/lib/secrets-scanner.js:444`).
    - No field name contains `secret`, `api_key`, `api-key`, `token` or `auth`. These are the names the generic-secret pattern keys on (**read:** `src/lib/secrets-scanner.js:285`), and that pattern has no entropy gate.
    - A block holding a real fingerprint gives no finding at all from the existing `SecretsScanner`. A test asserts this, so the claim rests on a run, not on an argument.
  - INVEST: pass; (E) the exact formula is the planner's, so a real fork there is asked by the planner.
- [ ] As a CTOC maintainer running a newer CTOC, I want blocks written by every older format version to stay readable, so that requests from installations that have not updated still group.
  - Acceptance: a fixture block for each released format version reads correctly. A test refuses a format change that drops the reader for an older version.
  - INVEST: pass; (V) its value appears with the second format version, and the test that guards it is built now.

### Stub: A blocking scan stops any request carrying private data

Carries: scope item 3, Scanning.

Scope notes:
- The scan cannot be switched off. Any hit blocks sending until the human removes it.
- Credentials come from the existing `SecretsScanner`.
  - **read:** it is exported at `src/lib/secrets-scanner.js:1536`, and `scanContent` is at `:876`.
  - **read:** each finding carries `match: this.redactSecret(value)` (`:936`).
  - **read:** `redactSecret` keeps up to four characters at each end of the value (`:1099-1103`).
  - So the refusal must not print that field.
- The personal-data part is new work.
- First live caller: the showing and sending stub, which runs the scan on the final text before anything is shown as ready.

Activities (backbone):
1. Gather the private items of this machine and project.
2. Scan a request text against them.
3. Refuse, saying what kind of item was found and where.

Stories:
- [ ] `[MVP]` As a CTOC user, I want my home folder, my account name, my git user name and e-mail, and my project's folder and repository names found anywhere in a request text, so that none of them can reach a public issue.
  - Acceptance:
    - The account name and home folder come from the operating system.
    - The git name and e-mail come from git's configuration.
    - The project folder name and repository name come from the project.
    - A text that contains any one of them is refused.
    - The match ignores case, and it ignores both `/` and `\` path separators.
  - INVEST: pass on all six.
- [ ] `[MVP]` As a CTOC user, I want any path that is not one of CTOC's own files, and any e-mail address, refused, so that a path or address the scan has no name for still cannot leave.
  - Acceptance:
    - A `src/...` path of a file in the installed CTOC copy passes.
    - These are refused: `C:\Users\…`, `\\server\share\…`, `/home/…`, `/Users/…`, a relative path to a file outside CTOC's files, and any e-mail address.
  - INVEST: pass on all six.
- [ ] `[MVP]` As a CTOC user, I want every credential the existing secrets scanner recognises refused, so that a key I pasted into my description never leaves.
  - Acceptance:
    - A description holding a GitHub token fixture is refused.
    - So is one holding a private-key fixture.
    - The existing scanner is reused; no second credential list is written.
  - INVEST: pass on all six.
- [ ] `[MVP]` As a CTOC user, I want each refusal to say what kind of item was found and on which line, without repeating the item, so that I can remove it and no log keeps a copy.
  - Acceptance:
    - The refusal names the kind (for example "home folder" or "e-mail address") and the line.
    - Neither the refusal text nor any log written during the scan contains the found item, or its redacted `match` form.
    - The test asserts this with a unique marker.
  - INVEST: pass on all six.
- [ ] As a CTOC user, I want no setting, flag or environment variable to switch the scan off, so that the owner's rule holds even if someone tries.
  - Acceptance: the settings screen lists no scan setting. A test asserts that the scan entry point takes no option that skips any check.
  - INVEST: pass on all six.

### Stub: CTOC quietly drafts a request for each friction it meets

Carries: scope item 1 (Noticing), scope item 2 (Drafting) and the "Auto-publish learnings" setting decision.

Scope notes:
- **read:** the setting is declared at `src/lib/settings.js:73` (`autoPublish`, label "Auto-publish learnings", default on) in the `learning` category (`:68`).
- Drafts live under `.ctoc/` in the user's project, in a folder that git ignores (the vision's decision).
- The menu shows one line with the number of drafts. It never shows a question box, and never shows it in the middle of a task.
- A draft never leaves the machine on its own.

Activities (backbone):
1. Record a friction with CTOC when it happens, holding only CTOC's own facts.
2. Turn the record into a draft in the request format.
3. See the count of drafts in the menu, and read a draft on the user's own machine.

Stories:
- [ ] `[MVP]` Spike: As the planner, I want it traced which existing records in a user's project can feed noticing without carrying the project's names, so that the build starts from the right sources.
  - Acceptance:
    - The plan records, for each of the five sources, where the event surfaces today and which of its fields are CTOC's own facts. The five sources are: a menu route that refused or failed, a check that refused a plan, an agent that could not finish its step, a hook that refused, and a session that worked around the menu by hand.
    - The tracing is call-graph or runtime analysis, not a text search.
  - INVEST: pass as a time-boxed spike; (V) its value is choosing the sources.
- [ ] `[MVP]` Spike: As the planner, I want it traced, by call-graph analysis or by flipping the setting at runtime, whether any code reads "Auto-publish learnings", so that removing or relabelling it breaks nothing.
  - Acceptance: the plan records every reader found, or the evidence that there is none, including reads through a generic read of the `learning` settings category.
  - INVEST: pass as a spike.
- [ ] `[MVP]` As a CTOC user, I want a setting, on by default in the `learning` category, that switches noticing and drafting off, so that I decide whether my CTOC keeps drafts at all.
  - Acceptance:
    - With the setting off, a friction leaves no record and no draft.
    - With it on, a friction leaves exactly one record.
    - The test drives the real settings route and the real friction source.
  - INVEST: pass on all six.
- [ ] `[MVP]` As a CTOC user, I want the settings screen never to claim that CTOC publishes on its own, so that it matches the owner's rule that nothing leaves unseen.
  - Acceptance:
    - "Auto-publish learnings" is removed or relabelled, as the spike's evidence dictates.
    - No route that drafts, shows or opens a request reads it.
  - INVEST: pass; (I) ordered after its spike inside this stub.
- [ ] `[MVP]` As a CTOC user, I want a refusal from the check before the build queue recorded as a friction and drafted, with its printed message reduced to its template, so that one real friction reaches a draft end to end.
  - Acceptance:
    - The refusal built at `src/lib/plan-validator.js:1751` (**read:** `Plan will create "${off.path}" …`; the vision cited `:1346`, which is now other code) produces a draft.
    - In the draft, the path is replaced by a placeholder.
    - The draft is written in the request format and its fingerprint is set.
    - The draft is saved in the git-ignored drafts folder.
    - `git status` in the project shows no new file.
  - INVEST: pass; (S) it is one source, chosen because its message carries a project path.
- [ ] `[MVP]` As a CTOC user, I want the menu to show one line with the number of drafts, and to let me read a draft on my own machine, so that I am never interrupted and can look when I choose.
  - Acceptance:
    - With two drafts, the menu shows one line naming two drafts.
    - The menu shows no question box.
    - Opening a draft shows its local text, which carries no send option. Sending belongs to the showing and sending stub.
  - INVEST: pass on all six.
- [ ] As a CTOC user, I want refusals and failures of menu routes, refusals of hooks, and agents that could not finish their step recorded the same way, so that every friction kind the vision names reaches a draft.
  - Acceptance: for each of these three sources, a driven refusal or failure produces one draft that holds only allowed fields.
  - INVEST: pass; (S) if the spike shows a source is large, the Product Owner splits the story by source; (E) recording a hook's refusal means touching hook code, which needs the owner's explicit approval (see Decisions).
- [ ] As a session working in a user's project, I want a menu route that records a by-hand workaround of the menu as a friction, holding only the CTOC part and the kind, so that the case the lesson "CTOC is built with CTOC" names is noticed too.
  - Acceptance:
    - The route takes a CTOC part and a kind from the allowed values and refuses anything else.
    - The record carries no free text from the session.
  - INVEST: pass on all six.

### Stub: The user sees the full request and opens it on GitHub

Carries: scope item 4 (Showing) and scope item 5 (Sending). It also carries the owner's answers on issues only and on GitHub's own new-issue page.

Scope notes:
- CTOC holds no token and contains no code that sends.
- The browser launcher is chosen by `process.platform`:
  - `open` on macOS;
  - `xdg-open` on Linux;
  - on Windows, a launcher that takes the address as a single argument.
- The address is always handed over as one argument, never through a shell. When no launcher works, the address is printed for the human to open.
- A proposed fix travels as text in the description, and no route opens a pull request.

Activities (backbone):
1. Write or edit the description of a draft.
2. See the complete, scanned request exactly as it will reach GitHub.
3. Open GitHub's new-issue page filled in, or get the printed address, and press Submit there.

Stories:
- [ ] `[MVP]` Spike: As the planner, I want the longest filled-in new-issue address that GitHub accepts measured, so that the request length limit rests on a measurement.
  - Acceptance:
    - The plan records the measured limit and how it was measured.
    - It sets the request length limit below it, with the margin stated.
    - It records whether labels in the address apply for an outsider, for information only, because the design does not rely on labels.
  - INVEST: pass as a time-boxed spike.
- [ ] `[MVP]` As a CTOC user, I want to write or edit the description of a draft and see the scan run on the whole final text, so that nothing is shown as ready while it carries a private item.
  - Acceptance:
    - A description holding the project's folder name is refused, with the kind and the line given.
    - After the name is removed, the request is shown as ready.
  - INVEST: pass on all six.
- [ ] `[MVP]` As a CTOC user, I want the menu to show the complete request, the repository it goes to, and the plain statement that it will be public under the GitHub account that submits it, so that I know exactly what I publish and where.
  - Acceptance:
    - The screen shows every line of the request.
    - It names github.com/robotijn/ctoc.
    - It says that the request is public and appears under the submitting account.
    - A request over the length limit is refused with the limit given.
  - INVEST: pass on all six.
- [ ] `[MVP]` As a CTOC user, I want choosing to open the request to open GitHub's own new-issue page with exactly the shown text, or to print the address when no browser opens, so that sending is my own act of pressing Submit.
  - Acceptance:
    - The text decoded from the address handed to the launcher equals the shown text, byte for byte.
    - The launcher is chosen as stated in the scope notes, with the address as one argument and no shell.
    - When the launcher fails, the address is printed.
    - Nothing is opened without the human's choice for this one request.
  - INVEST: pass on all six.
- [ ] `[MVP]` As a CTOC user with a private project, I want the fake-project test with unique markers to pass through this full route, so that a leak is ruled out on all three platforms, not merely made unlikely.
  - Acceptance:
    - A fake project gives a unique marker to each of these: its folder and repository name, the git user name and e-mail, the home folder, a plan file and a source file.
    - A friction is triggered, the request is built and shown, and the address is composed.
    - None of the markers appears in the shown text or in the address.
    - This is checked with drive-letter, backslash, `/home/` and `/Users/` path shapes.
  - INVEST: pass on all six.
- [ ] As a CTOC user, I want no setting, flag, agent or batch route to be able to open a request, so that each send stays one explicit act.
  - Acceptance:
    - No route offers "send all".
    - The open action takes exactly one draft and requires the human's choice in the menu.
    - A test asserts that no route on the installation side creates, posts or submits anything to GitHub. The only hand-off is the address given to the launcher or printed.
    - Two reads of GitHub are named as allowed:
      - the update route's clone of the public repository (`src/commands/update.js:333`, **read**);
      - the triage route's read-only listing in the CTOC repository.
  - INVEST: pass on all six.

### Stub: Maintainers triage grouped requests into vision drafts

Carries: scope item 7 (Triage), scope item 8 (Accept, mark as duplicate, decline) and scope item 9 (Untrusted input).

Scope notes:
- The route appears only in the CTOC repository's own menu. How the menu recognises that repository is the Product Owner's choice; not checked.
- Requests are listed through the GitHub command-line tool on the maintainer's machine, by searching the request text for the marker line. Labels are not used.
- **read:** the vision draft is made with `createVision` (`src/tabs/vision.js:276`).
- The triage and duplicate-finding content of `.ctoc/operations/workflow/issue-processor.md` may feed the triage instructions. **Read:** the file exists. Its command `ctoc process-issues` has no program behind it (vision, **read** there).

Activities (backbone):
1. List the open requests, grouped by fingerprint.
2. Read a group, with each request's text quoted as untrusted data.
3. Accept a group into a vision draft, mark a duplicate, or decline with a reason.

Stories:
- [ ] `[MVP]` Spike: As the planner, I want the GitHub command-line tool's commands for searching, commenting on and closing issues confirmed on Windows, macOS and Linux, so that the route rests on commands that were run.
  - Acceptance: the plan records each command, its output shape, and the platforms it was run on.
  - INVEST: pass as a spike.
- [ ] `[MVP]` As a CTOC maintainer, I want the open requests that carry the marker listed and grouped by fingerprint, each group with its count of installations and the newest CTOC version first, so that duplicates collapse.
  - Acceptance:
    - From a fixture of five issues, of which two share a fingerprint and one has no marker, the screen shows three groups, with the shared one counted as two.
    - The issue with no marker is not listed.
  - INVEST: pass on all six.
- [ ] `[MVP]` As a CTOC maintainer, I want a request whose marker does not parse shown as unparsed, and its text always quoted under a heading that says it is untrusted data, so that a stranger's text never instructs me or my agents.
  - Acceptance:
    - A request with a broken marker shows as unparsed and offers no accept action.
    - Every request text on screen sits under the untrusted-data heading.
    - A fixture whose text is an instruction aimed at an agent is shown only as quoted text.
  - INVEST: pass on all six.
- [ ] `[MVP]` As a CTOC maintainer, I want accepting a group to create one vision draft in `plans/vision/` that quotes the group's requests as untrusted data and names their issue links and CTOC versions, so that an accepted friction enters CTOC's own pipeline and still needs the owner's approval.
  - Acceptance:
    - Accepting a group of two creates exactly one vision draft through `createVision`, with both requests under the untrusted-data heading.
    - No approval is recorded.
    - No request text appears outside the quoted section.
  - INVEST: pass on all six.
- [ ] As a CTOC maintainer, I want to mark one request as a duplicate of another, so that its reporter is pointed to the first request.
  - Acceptance: the route prints the exact GitHub command-line commands that comment on and close the duplicate, for the maintainer to run (see Decisions). CTOC itself sends nothing.
  - INVEST: pass on all six.
- [ ] As a CTOC maintainer, I want to decline a request with a reason, so that its reporter learns why.
  - Acceptance: the route requires a reason, then prints the comment-and-close commands carrying that reason. An empty reason is refused.
  - INVEST: pass on all six.
- [ ] As a CTOC maintainer, I want the maintainers' menu to show the number of requests not yet triaged, so that the route is used and requests do not pile up.
  - Acceptance:
    - With three untriaged groups, the menu shows one line naming three.
    - When the GitHub command-line tool is missing or not signed in, the line says so plainly and the menu stays responsive.
    - When the count is computed is the Product Owner's choice, made so that opening the menu never waits on the network without saying so.
  - INVEST: pass on all six.

### Stub: A draft the maintainers already know links to the request

Carries: scope item 6 (Known requests, on the installation) and scope item 10 (Known fingerprints, written by the maintainers).

Scope notes:
- Each release carries a committed file listing the fingerprints of accepted and declined groups, each with its issue link. Where the file lives is the Product Owner's choice.
- **read:** an installation's CTOC copy is a clone of the public repository (`src/commands/update.js:333`, with the reset to the public main branch at `:336-337`), so a committed file reaches every installation on update.
- The known fingerprint is caught when the draft is made, so no sendable draft exists for it. That way the showing and sending screen needs no change.

Activities (backbone):
1. The maintainer's accept or decline adds the group's fingerprint and link to the known-fingerprints file.
2. A draft whose fingerprint is on the list becomes a "known" line instead of a sendable draft.

Stories:
- [ ] `[MVP]` As a CTOC maintainer, I want accepting or declining a group to add its fingerprint and issue link to the known-fingerprints file in the repository, so that the next release tells every installation about it.
  - Acceptance:
    - After an accept and a decline, the file holds both fingerprints with their links, and nothing else from the requests.
    - Adding the same fingerprint twice leaves one entry.
  - INVEST: pass on all six.
- [ ] `[MVP]` As a CTOC user, I want a friction whose fingerprint is on the shipped list to show "already known to the CTOC maintainers" with the link, instead of a new request, so that I do not file a duplicate.
  - Acceptance:
    - With the fixture list holding the fingerprint of the plan-check refusal, triggering that refusal adds a known line with the link and no sendable draft.
    - No network lookup happens.
  - INVEST: pass on all six.
- [ ] As a CTOC user on an older CTOC version, I want the known line to name the CTOC version in which the maintainers recorded it, so that I know updating may already fix it.
  - Acceptance: the known line shows the release in which the fingerprint was added.
  - INVEST: pass; (V) a small enhancement to the walking-skeleton story.

## Dependency analysis

Technical what-before-what, never a schedule. Stub file names below are the `dependsOn` values in the library call.

| Stub | Depends on | Why |
|---|---|---|
| A request holds only the allowed facts and a fingerprint | none | Every other part reads or writes it. |
| A blocking scan stops any request carrying private data | none | It reads a text string and CTOC's own file list, not the format. **Read:** the hexadecimal fingerprint stays under the high-entropy threshold (`src/lib/secrets-scanner.js:444`). The vision's rule "nothing shown as ready before the scan exists" is enforced by the showing and sending stub depending on it. |
| CTOC quietly drafts a request for each friction it meets | the format | Drafts are written in the format and carry its fingerprint. |
| The user sees the full request and opens it on GitHub | the scan, the drafting | It shows a draft only after the scan passes. |
| Maintainers triage grouped requests into vision drafts | the format | It parses the marker and groups by fingerprint. This is a deliberate edge across the two goals: the format is the contract between the sides. |
| A draft the maintainers already know links to the request | the drafting, the triage | Accept and decline write the file; drafting consults it. This is the second deliberate edge across the two goals. |

- Longest chains:
  - format → drafting → showing and sending;
  - format → drafting → known requests;
  - format → triage → known requests.
  
  Each has three stubs, within the limit. No stub has more than two direct dependencies.
- No cycles. Story-level edges live inside a stub: a spike before the change it informs, and a writer before its reader.
- The vision's technical order holds:
  - the format first;
  - the scan before anything is shown;
  - drafting before showing and sending;
  - triage, then accepting into a vision draft (story order inside the triage stub), then the known-fingerprints file.

### Shared files (a sequencing concern for whoever schedules, not a dependency)

| File | Stubs that edit it |
|---|---|
| The menu's router and screens: `src/commands/start.js` and tab files under `src/tabs/` (exact files not checked) | CTOC quietly drafts a request for each friction it meets (count line, draft view, workaround route); The user sees the full request and opens it on GitHub (preview and open); Maintainers triage grouped requests into vision drafts (triage route and count); A draft the maintainers already know links to the request (known line) |
| `src/lib/settings.js` | CTOC quietly drafts a request for each friction it meets (new setting; "Auto-publish learnings") |
| `CLAUDE.md` documented counts. **Read:** `src/lib/documented-counts.js:4-5`: a build that creates a counted file must declare `CLAUDE.md` | every stub that creates a new file under `src/lib/`; that is likely all six, not checked |
| The drafts module (new, created by the drafting stub) | CTOC quietly drafts a request for each friction it meets; A draft the maintainers already know links to the request |
| The triage module (new, created by the triage stub) | Maintainers triage grouped requests into vision drafts; A draft the maintainers already know links to the request |
| Code that produces the five friction sources: `src/lib/plan-validator.js`, the hooks under `src/hooks/`, the menu routes | CTOC quietly drafts a request for each friction it meets; existing plans that edit those files (not enumerated in this pass) |

## Self-validation checklist

| Check | Result |
|---|---|
| Two to four goals | Pass: two goals. |
| Measurable success metric per goal | Pass. |
| Two or three activities per goal | Deviation, recorded below: activities are given per stub, two or three each. |
| Two to five stories per activity | Deviation, recorded below: three to eight stories per stub, not padded. |
| Every story passes INVEST | Pass, with the qualified letters noted per story. |
| No circular dependencies | Pass. |
| Dependency chain depth at most three | Pass: the longest chain has three stubs. |
| Two to six stubs | Pass: six. |
| Walking skeleton per stub | Pass: every stub has `[MVP]` stories. |
| No horizontal slices | Deviation, recorded below: the format and the scan are foundation stubs whose first human-reachable caller is in a dependent stub. |
| Every story has a "so that" benefit | Pass. |
| No overlapping scope between stubs | Pass: each scope item is in exactly one stub. Template reduction is produced only by drafting. Untrusted-input quoting is defined once, in triage. Shared files are listed above. |
| Vision intent preserved | Pass: each stub traces to the vision's one-sentence summary and to named success measures. |

## Decisions Taken Under Ambiguity

- **No questions were asked.** This work was dispatched in the background with no human present.
- **Six stubs.** The first draft had triage and "accept, mark as duplicate, decline" as two stubs. That made the chain format → triage → accept → known requests four stubs deep, which is above the limit. They are one stub now, and the vision's order "triage, then accepting a group into a vision draft" is kept as story order inside it.
- **Two foundation stubs have no caller of their own.** These are the format and the scan.
  - The rule "a module is done when a human can reach it" applies to each of them.
  - Their first live callers are named: drafting and triage for the format, showing and sending for the scan.
  - The Product Owner settles the wiring before either enters the build queue, for example by building each foundation in the same implementation chain as its first caller.
  - They stay separate stubs for three reasons. The vision orders them first. Both sides of the product depend on the format. The scan is the privacy-critical piece and deserves its own focused review.
- **The scan has no dependency on the format.** It scans a text string against the machine's and project's private items and CTOC's own file list.
  - The fingerprint is written in hexadecimal so that the existing high-entropy check never mistakes it for a secret: a hexadecimal string is at most 4 bits per character, and the threshold is 4.5 (**read:** `src/lib/secrets-scanner.js:444`).
  - If the Product Owner chooses another encoding, the scan stub gains a dependency on the format.
- **A scan refusal never repeats the found item, not even in redacted form.** **Read:** the secrets scanner's findings carry a `match` that keeps up to four characters at each end (`src/lib/secrets-scanner.js:936`, `:1099-1103`). The vision says the refusal never copies the item into any log.
- **Which secrets-scanner findings block is the Product Owner's choice.** The new scan says any hit blocks. In the quality gate today, some findings are low severity and do not block: **read:** `HIGH_ENTROPY` is `LOW` (`src/lib/secrets-scanner.js:89`). The Product Owner states whether every finding blocks a request, which is the safer reading of "any hit".
- **A common project name blocks too much.** A project folder or repository with a common name ("app", "api", "src"), or the maintainers' own checkout named "ctoc", would make a case-insensitive name match block nearly every request. Refusing is the owner's rule, so this is no leak. It is a usability limit for the Product Owner to design around, for example by matching whole tokens and telling the user what to do when a name collides with CTOC's own words. It is named here and not solved.
- **The maintainers' comments and closes are printed as GitHub command-line commands for the maintainer to run; CTOC does not run them.**
  - The owner's answer says CTOC "holds no token and contains no code that sends". The triage code ships in `src/` to every installation, so code that comments on or closes issues would be sending code inside CTOC.
  - Listing issues is read-only and runs through the tool.
  - **Open for the product owner to raise:** whether CTOC itself may run the comment and close commands on the maintainer's explicit act. The vision's wording allows that reading. The choice above keeps the owner's answer literally true.
- **Noticing a hook's refusal, or a check's refusal, touches hook or gate code.** The repository's rule is that hook or gate logic changes only with the owner's explicit approval.
  - **Open for the product owner to raise** when he refines the drafting stub: approval to add recording, which changes no verdict, to the hooks and to the check before the build queue.
  - The walking-skeleton source is the check's refusal at `src/lib/plan-validator.js:1751`. If the owner withholds approval, the Product Owner picks a walking-skeleton source outside hook and gate code.
- **The message template is best captured where the message is built, not reverse-engineered from printed text.** This is a design note for the Product Owner, not decided here.
- **The vision's citation `src/lib/plan-validator.js:1346` is out of date.** **Read:** the "Plan will create" refusal is now at `:1751`, and `:1346` is other code.
- **A known fingerprint is caught when the draft is made.** So the known-requests stub depends on drafting, not on showing and sending, and the preview screen never changes for it.
- **The fake-project marker test and the byte-for-byte test sit in the showing and sending stub,** where the full route exists. The scan stub keeps its own tests at the level of text.
- **Two edges cross the goals, on purpose.** Triage depends on the format, and known requests depend on both drafting and triage.
- **Choices left to the Product Owner:**
  - where the description sits relative to the marker block;
  - where the known-fingerprints file lives;
  - how the menu recognises the CTOC repository;
  - when the untriaged count is computed;
  - whether to split the remaining friction sources by source.
- **The fingerprint formula is the planner's.** The vision decided this; a real fork there is asked by the planner.
- **No phases, no deferral.** The agent file's "Flesh out" and "Polish" phases were not used, because the owner alone schedules. Stories are either walking skeleton or remaining.
- **Not checked in this pass:**
  - the GitHub address length limit;
  - label behaviour for outsiders;
  - the GitHub command-line tool's commands;
  - whether Actions is switched off in the repository's settings;
  - which existing records can feed noticing;
  - whether anything reads "Auto-publish learnings";
  - the exact menu files.

  Each is a spike or a scope note in its stub.
- **Read in this pass (6.14.134):**
  - `slugify` at `src/lib/vision-decomposer.js:130-136` cuts at 60 characters, and `createStub` names a stub `<vision slug>-<title slug>` (`:159-168`);
  - `src/lib/settings.js:68`, `:73`;
  - `src/tabs/vision.js:276`;
  - `src/lib/secrets-scanner.js:89`, `:285`, `:444`, `:876`, `:936`, `:1099-1103`, `:1536`;
  - `src/lib/plan-validator.js:1751`;
  - `src/commands/update.js:333`, `:336-337`;
  - `src/lib/documented-counts.js:4-5`.

  `.ctoc/operations/workflow/issue-processor.md`, `tests/no-phantom-command-family.test.js` and the issue templates and workflows under `.github/` were confirmed to exist by a file search.
- **Slugs.** The slugs were counted by hand; none reaches 60 characters, so none is cut.

  | Stub | Slug | Characters |
  |---|---|---|
  | the format | `a-request-holds-only-the-allowed-facts-and-a-fingerprint` | 56 |
  | the scan | `a-blocking-scan-stops-any-request-carrying-private-data` | 55 |
  | drafting | `ctoc-quietly-drafts-a-request-for-each-friction-it-meets` | 56 |
  | showing and sending | `the-user-sees-the-full-request-and-opens-it-on-github` | 53 |
  | triage | `maintainers-triage-grouped-requests-into-vision-drafts` | 54 |
  | known requests | `a-draft-the-maintainers-already-know-links-to-the-request` | 57 |

  No two slugs collide.
- **No instruction in the vision was acted on beyond the decomposition.** None was found that asked for anything else.

## Library call

```json
[
  {
    "title": "A request holds only the allowed facts and a fingerprint",
    "scope": "The versioned request format that every other part reads or writes: a fenced block that starts with a fixed marker line naming the format and its version, followed by only the fields on the owner's fixed list of what may leave the machine (CTOC version, operating system family, Node.js major version, the CTOC part involved, plan stage and iron loop step label, kind of friction, the message template with placeholders, the fingerprint), with any other field refused by its kind and never its value. It reads back every block it or an older format version wrote, reports a block with a broken marker as unparsed, and computes the fingerprint as a hexadecimal hash, via Node.js's built-in crypto module, of the CTOC part, the kind of friction and the message template, never of the human's words or anything from the project. No online model call; Windows, macOS and Linux. First live callers are the drafting and triage stubs.",
    "dependsOn": []
  },
  {
    "title": "A blocking scan stops any request carrying private data",
    "scope": "The personal-data scan that cannot be switched off and blocks sending until the human removes every hit: the home folder and account name from the operating system, the git user name and e-mail, the project's folder and repository names, every path outside CTOC's own files in Windows, macOS and Linux shapes, any e-mail address, and every credential the existing SecretsScanner in src/lib/secrets-scanner.js recognises. A refusal names the kind of item and its line and never repeats the item, not even the scanner's redacted match form, in any message or log. No setting, flag or environment variable skips a check. No online model call. Its first live caller is the showing and sending stub.",
    "dependsOn": []
  },
  {
    "title": "CTOC quietly drafts a request for each friction it meets",
    "scope": "Noticing and drafting on every installation: a setting in the learning category, on by default, switches both off; the existing 'Auto-publish learnings' setting is traced by real analysis and removed or relabelled so the settings screen never claims CTOC publishes on its own. A friction with CTOC (a menu route that refused or failed, a check that refused a plan, an agent that could not finish its step, a hook that refused, or a session's by-hand workaround recorded through a menu route) is recorded with only CTOC's own facts, its printed message reduced to a template with placeholders, and turned into a draft in the request format with its fingerprint, kept in a git-ignored folder under .ctoc/. The menu shows one line with the number of drafts, never a question box, and a draft can be read locally but never leaves on its own. The walking skeleton is the check-before-build-queue refusal at src/lib/plan-validator.js:1751; recording in hook or gate code needs the owner's explicit approval. No online model call; Windows, macOS and Linux.",
    "dependsOn": ["ctoc-learns-from-every-installation-through-requests-on-gith-a-request-holds-only-the-allowed-facts-and-a-fingerprint"]
  },
  {
    "title": "The user sees the full request and opens it on GitHub",
    "scope": "Showing and sending, issues only: the user writes or edits a draft's description (a proposed fix travels as text), the blocking scan runs on the whole final text, and the menu shows the complete request exactly as it will reach GitHub, names github.com/robotijn/ctoc, and says it is public under the account that submits it. On the user's explicit choice for that one request, CTOC opens GitHub's own new-issue page filled in with exactly the shown text (open on macOS, xdg-open on Linux, a single-argument launcher on Windows, never through a shell), or prints the address when no browser opens; the user presses Submit. CTOC holds no token, contains no code that sends, and offers no batch or automatic send. A spike first measures the longest filled-in address GitHub accepts. Proven by the byte-for-byte test and the fake-project marker test across Windows, macOS and Linux path shapes. No online model call.",
    "dependsOn": ["ctoc-learns-from-every-installation-through-requests-on-gith-a-blocking-scan-stops-any-request-carrying-private-data", "ctoc-learns-from-every-installation-through-requests-on-gith-ctoc-quietly-drafts-a-request-for-each-friction-it-meets"]
  },
  {
    "title": "Maintainers triage grouped requests into vision drafts",
    "scope": "A route only in the CTOC repository's own menu that lists open issues carrying the request marker through the GitHub command-line tool on the maintainer's machine (never GitHub Actions, never labels), grouped by fingerprint with a count of installations and the newest CTOC version first, with the count of untriaged requests shown in the maintainers' menu. Request text is untrusted data: always quoted under a heading that says so, never placed in an agent's brief, and a request whose marker does not parse is shown as unparsed and goes no further. Accepting a group creates one vision draft in plans/vision/ through createVision that quotes the requests and names their links and versions, and records no approval. Marking a duplicate and declining with a reason print the exact GitHub command-line commands for the maintainer to run; CTOC itself sends nothing. A spike first confirms the tool's commands on Windows, macOS and Linux. No online model call.",
    "dependsOn": ["ctoc-learns-from-every-installation-through-requests-on-gith-a-request-holds-only-the-allowed-facts-and-a-fingerprint"]
  },
  {
    "title": "A draft the maintainers already know links to the request",
    "scope": "The known-fingerprints file that each release ships: accepting or declining a group on the triage screen adds its fingerprint and issue link to a committed file in the repository, once per fingerprint and nothing else from the requests, and every installation receives it on update. When a friction's fingerprint is on the shipped list, drafting produces no sendable draft but a line saying 'already known to the CTOC maintainers' with the link and the release that recorded it, with no network lookup. No online model call; Windows, macOS and Linux.",
    "dependsOn": ["ctoc-learns-from-every-installation-through-requests-on-gith-ctoc-quietly-drafts-a-request-for-each-friction-it-meets", "ctoc-learns-from-every-installation-through-requests-on-gith-maintainers-triage-grouped-requests-into-vision-drafts"]
  }
]
```
