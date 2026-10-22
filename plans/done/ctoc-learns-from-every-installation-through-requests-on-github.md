---
status: decomposed
decomposed_at: "2026-10-22T09:24:01.846Z"
title: "CTOC learns from every installation through requests on GitHub"
type: vision
status: ready
created: 2026-10-22
program: ctoc-learns-from-every-installation
---

# Vision: CTOC learns from every installation through requests on GitHub

## Status
- Created: 2026-10-22
- Last Updated: 2026-10-22 (the owner's answers recorded)
- Progress: 5/5 phases complete
- Status: ready
- Owner's answers: on 2026-10-22 the owner answered all three questions: what may leave a user's machine, issues or pull requests, and how a request reaches GitHub. His answers are recorded below under "The owner's answers". This vision waits only for his approval.

## Source

The owner's request of 2026-10-22: "i want a new vision about all ctoc being able to push requests on github so we can learn from all other ctoc also".

Hard constraints from the owner, as the CTO Chief relayed them:
- No personal or client data leaves a user's machine. That covers home folder paths, account names, e-mail addresses, project names, code, and plan text from a private project.
- Anything that is sent is scrubbed first and shown to the human in full. Sending is the human's explicit act, once for each request.
- The checks are settings, on by default, and the user can switch them off.
- Nothing is sent without a human seeing it.
- The CTOC maintainers can triage incoming requests, merge duplicates, and feed the accepted ones into CTOC's own pipeline.
- CTOC makes no online model calls, and it runs on Windows, macOS and Linux.

Evidence labels used below:
- **read**: the vision advisor opened the cited file on version 6.14.134 while writing this vision. A read line confirms only what that line says.
- **not checked**: a belief that is named as one. Any plan that rests on it checks it first.

## Phase 1: Problem Discovery
### Problem Statement
✓ Today CTOC improves only from what its own maintainers run into while building CTOC itself. Every friction, defect and lesson that CTOC meets in another user's project stays on that user's machine, because there is no route to send it back to the CTOC repository.

- On 2026-10-20 the owner ruled that CTOC is built with CTOC, and that every friction found while building it becomes a plan.
  - That vision, "CTOC is built with CTOC, and every friction found while building it becomes a plan" (`plans/done/ctoc-is-built-with-ctoc.md`), turned ten frictions from one day of building CTOC into plans.
  - It reaches only frictions met inside the CTOC repository.
- The plan "The operating lessons say CTOC is built with CTOC and friction is filed as a plan" is in the build queue (`plans/todo/ctoc-is-built-with-ctoc-the-operating-lessons-say-ctoc-is-built-with-ctoc-and-fricti.md`).
  - Its lesson ships into every user's `CLAUDE.md`.
  - In a user's project, a friction filed as a plan lands in that user's own `plans/` folder, where no CTOC maintainer ever sees it.
  - A friction in CTOC's menu, agents or hooks cannot be fixed inside the user's project at all.
- **read:** nothing records a friction with CTOC in a user's project.
  - Search: pattern `friction`, case-insensitive. It matched no file under `src/`.
  - Over `agents/`, `skills/`, `.ctoc/templates/` and `docs/` it matched three files. All three are about frictions in a user's own product, not in CTOC: `skills/saas/stripe-subscriptions/SKILL.md`, `skills/product/product-reviewer/SKILL.md` and `.ctoc/templates/saas/b2c-subscription/manifest.yaml`.
- The routes that exist today are manual, or they never run:
  - **read:** the issue templates under `.github/ISSUE_TEMPLATE/` (`bug_report.md`, `feature_request.md`, `skill-improvement.yml`) need a person to leave their session, open GitHub and write the report from memory.
  - **read:** `.github/workflows/validate-skill-issue.yml` checks skill-improvement issues and counts votes on GitHub.
    - On 2026-10-19 the owner ruled that CTOC uses no GitHub Actions and that tests run locally before every push. So no workflow on GitHub can be relied on to run.
    - **not checked:** whether Actions is switched off in the repository's settings.
  - **read:** `docs/PROJECT_REFERENCE.md`, in its section "Processing Community Skill Issues", describes a maintainer route `ctoc process-issues`. `.ctoc/operations/workflow/issue-processor.md` describes an issue triage agent that this route would call.
    - `tests/no-phantom-command-family.test.js` records that `ctoc process-issues` is a command with no program behind it: `package.json` declares no `bin`.
  - **read:** `src/lib/settings.js:73` declares a setting labelled "Auto-publish learnings" (`learning.autoPublish`), on by default.
    - Its key name appears in only two files: `src/lib/settings.js` and this repository's `.ctoc/settings.json`. Search: pattern `autoPublish` over the repository, leaving out `plans/`, `node_modules/` and `.claude/`.
    - That is a presence check only.
    - **not checked:** whether any code reads the setting through a generic read of its settings category.
    - A setting that says CTOC publishes on its own contradicts the owner's rule that nothing leaves without a human seeing it.

### Target User
✓ This vision serves two groups. The first is every CTOC user whose own CTOC runs into a friction, defect or lesson about CTOC itself. The second is the CTOC maintainers, who receive the requests, triage them, merge duplicates, and turn the accepted ones into plans: the owner, Tijn van der Zant, and the agents that build CTOC for him.

- **The people who send.** A developer using CTOC in their own project, on Windows, macOS or Linux.
  - Often the project is private or belongs to a client, so its names, paths and code must stay private.
  - They need no GitHub command-line tool. A browser, or a printed web address, is enough.
  - Claude Code may run on a machine with no browser, such as a remote machine reached over a secure shell, or a container.
- **The people who receive.** The owner and the pipeline in the CTOC repository.
  - They work without GitHub Actions, so everything they do with incoming requests runs in their own CTOC, through the menu.

### Problem Severity
✓ The severity is high for CTOC's quality and high for privacy. For quality: the maintainers see the frictions of exactly one project, CTOC itself, and the frictions met in every other installation go unreported. For privacy: a careless request would publish a user's private names, paths or code under their own name on a public repository, and that cannot be undone.

- Today a friction met in a user's project is either worked around by hand, which is the failure CTOC's operating lessons forbid, or forgotten. Either way the next user meets the same friction.
- A GitHub issue is public the moment it is posted, and it shows the account that posted it.
  - Deleting the issue later does not recall copies that were already read or indexed.
  - So a leak through this route cannot be undone. The design has to make a leak impossible by construction, not merely unlikely.
- **read:** CTOC's own messages already carry project data.
  - The check before the build queue builds its refusal as `Plan will create "<path>" …`, with a file path from the user's project in it (`src/lib/plan-validator.js:1346`).
  - So even a message that "comes from CTOC" has to be scrubbed before it can leave.

## Phase 2: Value Proposition
### Success Criteria
✓ This succeeds when three things hold. A CTOC user, in a few steps from the menu, can review a complete and scrubbed request about a friction their CTOC met, and send it to the CTOC repository by their own explicit act. The maintainers can see every incoming request grouped with its duplicates, and can turn an accepted one into a plan in CTOC's own pipeline. And no test, run or review ever finds personal or client data in a request that was sent.

Each measure below is proven by a test that drives the real route, never by a snapshot of a screen:
- **Nothing leaves unseen.** A request cannot be sent unless the human has been shown its complete text, and the text CTOC hands to GitHub is exactly the text that was shown.
  - A test drives the menu route and asserts that the two are the same, byte for byte.
- **Nothing private leaves.** A test builds a fake project and gives a unique marker to each of these:
  - the project folder name and repository name;
  - the git user name and e-mail;
  - the home folder;
  - a plan file;
  - a source file.

  The test then triggers a friction, builds the request, and asserts that none of the markers appears in it. The test covers Windows, macOS and Linux path shapes: drive letters, backslashes, and home folders under `/home/` and `/Users/`.
- **The scan blocks; it does not just warn.** If the human's own description contains a home folder path, an account name, an e-mail address, the project's folder or repository name, or a credential that `src/lib/secrets-scanner.js` recognises, the send route refuses.
  - The refusal says what kind of item was found and where.
  - It never copies the item into any log.
- **Each send is one explicit act.** No setting, flag, agent or batch sends a request.
  - Switching the setting off stops all noticing and drafting.
- **Duplicates collapse.** Two installations that hit the same friction produce requests with the same fingerprint.
  - The maintainers' triage screen shows them as one group with a count.
  - When the installed CTOC version already knows a request, the draft says "already known to the CTOC maintainers" and gives the link, instead of offering a new request.
- **Accepted requests enter the pipeline.** Accepting a group on the triage screen creates a vision draft in `plans/vision/`.
  - The draft quotes the requests as untrusted data and names where they came from.
  - Nothing about a request crosses an approval point by itself.
- **No online model call, on every platform.** Noticing, drafting, scrubbing, fingerprinting and triage all run without any online model call, and the suite passes on Windows, macOS and Linux.

### Impact Scale
✓ The impact is high: every CTOC installation becomes a source of improvement for all the others, not only the maintainers' own use of CTOC. The cost is a new surface that is critical for privacy and must be right from the very first send.

- **Reach:** every CTOC user, on every platform, and the maintainers.
- The value grows with the number of installations. With one installation, it equals today's dogfooding.
- **No data:** we do not know how many installations exist or how many frictions they meet. CTOC collects no usage numbers, and this vision adds none beyond the requests that humans choose to send.

## Phase 3: Scope Definition
### Minimum Viable Scope
✓ The thinnest path that works end to end has two halves. On the user's machine, a CTOC installation notices a friction with CTOC, drafts a request from CTOC's own facts plus the human's own words, scans it for personal data, shows it in full, and lets the human send it to GitHub. On the maintainer's side, CTOC lists the incoming requests grouped by fingerprint and turns an accepted group into a vision draft.

**On every installation**
1. **Noticing.** A friction with CTOC is recorded on the user's machine when it happens:
   - a menu route that refused or failed;
   - a check that refused a plan;
   - an agent that could not finish its step;
   - a hook that refused;
   - a session that had to work around the menu by hand, which is the case the lesson "CTOC is built with CTOC" names.

   Each record holds only CTOC's own facts. A setting, on by default, switches noticing and drafting off.
2. **Drafting.** From a record, CTOC drafts a request: a short title, the allowed facts, the fingerprint, and an empty description for the human's own words. A draft never leaves the machine on its own.
3. **Scanning.** Before the human sees the final text, a scan checks all of it. The scan cannot be switched off. It looks for:
   - the user's home folder and account name, taken from the operating system;
   - the git user name and e-mail;
   - the project's folder name and repository name;
   - every path outside CTOC's own files;
   - any e-mail address;
   - every credential that `src/lib/secrets-scanner.js` recognises.

   Any hit blocks sending until the human removes it.
4. **Showing.** The menu shows the complete request exactly as it will reach GitHub. It names the repository the request goes to, and says that the request is public and appears under the GitHub account that submits it.
5. **Sending.** Sending is the human's explicit act, once for each request. When the human chooses to open it, CTOC opens GitHub's own new-issue page with the shown request filled in, or prints the web address when no browser is available. The human presses GitHub's Submit button, and the request appears under their own GitHub account. CTOC holds no token and contains no code that sends (the owner's answer of 2026-10-22).
6. **Known requests.** Each CTOC release carries the fingerprints of requests the maintainers already know about. When a draft's fingerprint is on that list, CTOC shows the link to the known request instead of offering a new one.

**In the CTOC repository (the maintainers)**

7. **Triage.** A menu route in the CTOC repository's own CTOC lists the open requests that carry CTOC's request marker.
   - Requests are grouped by fingerprint, with a count of installations, the newest CTOC version first.
   - The route runs on the maintainer's machine through the GitHub command-line tool, never through GitHub Actions.
8. **Accept, mark as duplicate, decline.** The maintainer can:
   - accept a group, which creates a vision draft in `plans/vision/`;
   - mark one request as a duplicate of another;
   - decline a request with a reason.

   Every comment or close on GitHub is the maintainer's own explicit act.
9. **Untrusted input.** A stranger wrote the text of an incoming request. It is data, never instructions.
   - It is quoted under a heading that says so.
   - It is never placed into an agent's brief as an instruction.
   - A request whose marker does not parse is shown as unparsed and goes no further.
10. **Known fingerprints.** The fingerprints of accepted and declined groups go into the file that each release ships (see "Known requests" above).

**What may leave the machine.** Decided by the owner on 2026-10-22: only CTOC's own facts plus the user's own words, behind the blocking scan. That is this fixed list:
- the CTOC version, the operating system family (Windows, macOS or Linux), and the Node.js major version;
- the CTOC part involved, named the way the CTOC repository names it: a menu route, an agent, a hook, a check, or a library file under `src/`;
- the plan stage, and the iron loop step by its label;
- the kind of friction: a refusal, a failure, a missing route, a confusing screen, or a workaround by hand;
- the message CTOC printed, reduced to its template, with every path, name and value from the user's project replaced by a placeholder;
- the fingerprint;
- the description that the human writes or edits.

These never leave: plan text, code, file contents, file or folder names from the project, the project's name, git remotes, branch names, account names, e-mail addresses, home folder paths, environment variables, the project's logs, and the conversation. The CTOC-written account of what happened, automatically scrubbed, was not chosen.

**Issues or pull requests.** Decided by the owner on 2026-10-22: issues only. A proposed fix travels as text inside the issue. Pull requests stay the normal route for a contributor who clones CTOC on purpose, and no installation opens one. An accepted issue becomes a vision draft and is built through CTOC's own pipeline.

**How a request reaches GitHub.** Decided by the owner on 2026-10-22: GitHub's own new-issue page, filled in, where the user presses Submit under their own account. CTOC holds no token and contains no code that sends. The GitHub command-line tool on the user's machine and a relay server run by the maintainers were not chosen.

### Explicit Exclusions
✓ This vision sends nothing automatically, collects no usage numbers, and changes nothing about who crosses an approval point.

- No automatic or background sending, no batch send, no "send all".
- No usage numbers, counters or background reporting of any kind.
- No code, plan text, file contents or conversation text from a user's project, ever.
- No online model call: no online service drafts, scrubs or triages anything.
- No GitHub Actions on the receiving side.
- No server run by CTOC, and no relay. The owner chose GitHub's own new-issue page.
- No pull requests opened by an installation, and no code that sends from a user's machine. The owner chose issues only, sent through GitHub's page.
- No outside code merged into CTOC without going through CTOC's own pipeline.
- No change to who crosses an approval point. An accepted request becomes a vision draft, and only the owner approves a vision.
- No pricing, marketing or community management, such as vote thresholds or contributor rankings.

### Dependencies
✓ The installation side depends on CTOC's own record of what refused or failed, on the lesson that tells a session to record frictions, and on a browser to open GitHub's new-issue page (or a printed web address where no browser is available). The maintainers' side depends on the GitHub command-line tool on the maintainer's machine and on the existing vision flow.

What must exist before what (this is technical order, not a schedule; the owner alone chooses what is built and when):
1. The request format: the marker, the fields and the fingerprint. Every other part reads it or writes it.
2. The personal-data scan. Nothing may be shown as ready to send before the scan exists.
3. Noticing and drafting, then showing and sending.
4. Triage on the maintainers' side, then accepting a group into a vision draft, then the file of known fingerprints that ships with each release.

Related work and code:
- "The operating lessons say CTOC is built with CTOC and friction is filed as a plan" (in the build queue). It gives every session the lesson to record frictions; this vision gives frictions about CTOC itself a route to the CTOC repository.
- `src/lib/secrets-scanner.js` is reused for credentials. The personal-data part of the scan is new work.
- `src/lib/settings.js` gets the new setting, and the existing "Auto-publish learnings" setting is dealt with (see Decisions).
- `src/tabs/vision.js` (`createVision`) is reused to create the vision draft from an accepted group.
- `.ctoc/operations/workflow/issue-processor.md`: its triage and duplicate-finding content may serve as input for the triage instructions. Its entry point, `ctoc process-issues`, does not exist.
- Outside CTOC:
  - GitHub, with the public repository github.com/robotijn/ctoc;
  - the GitHub command-line tool on the maintainer's machine;
  - on the user's machine, a browser. Where there is none, the human opens the printed web address on another device.

## Phase 4: Risk Assessment
### Failure Modes
✓ The worst failure is a leak: a user's private name, path, code or client detail published under their own GitHub name, which cannot be recalled. Next come a flood of duplicate or hostile requests that buries the maintainers, and draft notices that pester users until they switch the whole feature off.

- **A leak through free text.** A scrubber that removes known patterns cannot know a private project's client or product names. A description, or a CTOC message that quoted a plan title, can carry one.
  - Mitigations: only CTOC's own facts are sent; CTOC's messages are reduced to their template; the scan blocks on the project's own names; and the human sees everything.
- **A leak through the account.** The GitHub account name is public on every request, whatever the scan does.
  - Mitigation: the preview says so before sending. The owner chose this route knowing it: requests appear under the user's own account, and there is no relay.
- **A leak through the web address.** On the route the owner chose, the request text travels inside a web address. Opening the page hands that text to GitHub before Submit is pressed, unpublished, and the browser keeps the address in its history.
  - Mitigation: only the scanned text, which becomes public anyway, ever goes into the address.
- **Planted instructions on the receiving side.** A stranger writes a request that tries to instruct the maintainers' agents.
  - Mitigation: request text is quoted data and is never a brief.
- **Planted instructions on the sending side.** A file in the user's project tries to make the session send private data.
  - Mitigation: only the human's own act sends. On the route the owner chose, CTOC contains no code that sends at all.
- **A flood of requests.** Many installations send the same friction.
  - Mitigations: the fingerprint, the file of known fingerprints shipped with each release, and grouping at triage.
- **Pestering.** Offering a draft at every friction would interrupt the user's work.
  - Mitigation: drafts collect quietly. The menu shows one line with their count, never a question box and never in the middle of a task.
- **Stale reports.** A request from an old CTOC version describes a friction that is already fixed.
  - Mitigations: every request carries the version, the known fingerprints ship with each release, and triage shows the version.
- **A route nobody uses.** The triage route is built but nobody runs it, and requests pile up unanswered on GitHub.
  - Mitigation: the maintainers' menu shows the count of requests not yet triaged.

### Unknowns
✓ The three owner decisions are answered. A few technical facts have not been checked yet.

- **Answered by the owner on 2026-10-22:**
  - what may leave the machine: only CTOC's own facts plus the user's own words, behind the blocking scan;
  - issues or pull requests: issues only;
  - how a request reaches GitHub: GitHub's own new-issue page, submitted by the user under their own account.
- **Not checked:** the longest web address GitHub's new-issue page accepts with the text filled in.
  - The request is kept short either way.
  - The plan measures the limit before relying on it.
- **Not checked:** whether labels set through the web address are applied when the sender has no write access to the repository.
  - The design does not rely on labels. Triage searches for the marker inside the request text.
- **Not checked:** whether Actions is switched off in the repository's settings.
- **Not traced:** whether any code reads `learning.autoPublish` through a generic read of its settings category.
- **Not traced:** which existing records in a user's project can feed noticing without carrying the project's names. Examples are the logs under `.ctoc/logs/` and the refusals of the hooks.

### Assumptions
✓ This vision assumes three things: a GitHub issue is public and shows the account that posted it, the CTOC repository on GitHub is public, and a user who wants to send a request has a GitHub account.

- **read:** the CTOC repository is public. `src/commands/update.js:333` clones `https://github.com/robotijn/ctoc.git` with no credentials.
- **read:** the CTOC copy that an installation keeps in Claude Code's plugin folders is reset hard to the public main branch on every update (`src/commands/update.js:336-337`). So no local fix can live there.
- **not checked:** every GitHub issue shows its author's account publicly. This is GitHub's documented behaviour, but it was not re-checked in this session.
- **not checked:** the GitHub command-line tool's commands for listing, commenting on and closing issues exist and work on all three platforms. The maintainers' side needs them. This is believed from its documentation; the commands were not run in this session.
- A user without a GitHub account cannot send a request. They can still read their drafts on their own machine.

## Phase 5: Summary

## Vision: CTOC learns from every installation through requests on GitHub

**In one sentence:** Every CTOC user can send what their CTOC learned about CTOC itself to the CTOC repository on GitHub, as a complete, scrubbed request that they see in full and send by their own act, and the CTOC maintainers can triage those requests, merge duplicates, and turn the accepted ones into plans in CTOC's own pipeline.

**The problem:**
- CTOC improves only from the frictions its maintainers meet while building CTOC itself (the vision "CTOC is built with CTOC, and every friction found while building it becomes a plan").
- Frictions in every other installation stay on that machine. A friction filed there lands in the user's own `plans/` folder.
- The routes that do exist are manual or never run:
  - issue templates that need a person to leave their session;
  - a validation workflow on GitHub, while the owner has ruled out GitHub Actions;
  - a documented `ctoc process-issues` command that has no program behind it.
- An "Auto-publish learnings" setting is on by default and contradicts the owner's rule that nothing leaves unseen.

**For whom:**
- Every CTOC user on Windows, macOS or Linux, often working in a private or client project.
- The CTOC maintainers: the owner, Tijn van der Zant, and the agents that build CTOC for him.

**Success looks like:**
- A user reviews a complete, scrubbed request and sends it by their own act.
- No test finds personal or client data in a sent request. The fake-project test with unique markers proves this on all three platforms.
- Duplicate requests collapse into one group, and requests already known are recognised on the user's own machine.
- The maintainers turn an accepted group into a vision draft through the menu, with no GitHub Actions and no online model call.

**What we are building:**
- On every installation, five parts:
  - noticing frictions with CTOC, behind a setting that is on by default;
  - drafting from CTOC's own facts plus the human's own words;
  - a personal-data scan that blocks sending and cannot be switched off;
  - a full preview;
  - a send that is the human's own act: GitHub's own new-issue page, filled in, submitted by the user under their own account, with no token and no sending code in CTOC.
- Issues only. A proposed fix travels as text inside the issue, and no installation opens a pull request.
- A versioned request format with a marker and a fingerprint.
- A file of known fingerprints that ships with each release.
- A triage route in the CTOC repository's own menu that groups requests, accepts them into vision drafts, marks duplicates and declines.

**What we are NOT building:**
- automatic, background or batch sending;
- usage numbers;
- anything that carries code, plan text or conversation from a user's project;
- online model calls;
- GitHub Actions;
- outside code merged without CTOC's own pipeline;
- pull requests from installations;
- a relay server, or any code in CTOC that sends;
- any change to who crosses an approval point.

**Key risk:** A client or product name from a private project reaches a public GitHub issue under the user's own name. It can get there through the human's description, or through a CTOC message that quoted a plan title or path; `src/lib/plan-validator.js:1346` already puts a project path into a refusal. Once posted, the issue cannot be recalled. The fake-project marker test and the blocking scan exist to make that leak impossible, not merely unlikely.

**Reach, Impact, Confidence, Effort:**
- Reach: High. Every CTOC installation, and the maintainers.
- Impact: High. CTOC learns from all installations instead of one repository.
- Confidence: Medium.
  - The owner settled the three forks on 2026-10-22.
  - Two GitHub behaviours are not checked: the longest web address the new-issue page accepts, and whether labels apply for outsiders. The first one bounds how long a request may be.
- Effort: Medium to high. There are two sides, a scan that must hold on three platforms, and a versioned format that installations of many versions will write.

**Stakeholders:** The owner. He answered the three questions on 2026-10-22 and approves this vision.

**Assumptions to test:**
- GitHub's new-issue page accepts a filled-in request of the planned length.
- CTOC's messages can be reduced to templates that carry no project data.
- The fingerprint built from CTOC's own facts groups true duplicates without merging different frictions.

## Decisions Taken Under Ambiguity

- **Three questions went to the owner, and he answered them.** The vision advisor has no tool to ask live, so it wrote the questions into the questions file for this vision.
  - The menu refused to record an answer for a vision reference (see "Friction found while writing this vision"). The owner therefore answered in the main session on 2026-10-22, and his answers are recorded in this file under "The owner's answers".
  - The menu had already taken in the first questions file, and it stays there as the menu's own record. For this revision of the vision, the vision advisor writes a new questions file with an empty list, so the menu does not ask him a second time.
- **On by default comes from the owner's own constraint, so it was not asked.**
  - Noticing and drafting are on by default and can be switched off in the menu's settings (the `learning` category in `src/lib/settings.js`).
  - The scan and the full preview cannot be switched off, because the owner's constraint says anything sent must be scrubbed and shown.
  - Sending is always the human's explicit act.
- **The request format is versioned and carries a marker.**
  - The format is a fenced block in the request text that starts with a fixed line naming the format and its version, followed by the allowed fields, one per line.
  - Triage finds requests by searching the request text for that line, so it does not depend on labels that outsiders may not be able to set.
  - Installations of many versions write this format, so every change to it keeps the older versions readable.
- **Duplicates are found by a fingerprint computed on the user's machine, without any model call.**
  - The fingerprint comes from the CTOC part, the kind of friction, and the template of CTOC's message.
  - It never comes from the human's words or from anything in the project.
  - The hash comes from Node.js's built-in `crypto` module, so no new dependency is needed.
  - The exact formula is left to the implementation plan. If it turns out to be a real fork, the planner asks.
- **The known fingerprints ship with each release.** The installation side recognises known requests offline, with no network lookup before sending.
- **Drafts stay quiet.**
  - The menu shows one line with the number of drafts, never a question box and never in the middle of a task.
  - Drafts live under `.ctoc/` in the user's project, in a folder that git ignores. A draft is about CTOC, not about the project, and it must not end up in the project's history.
- **An accepted group becomes a vision draft, not a functional plan.**
  - Only the owner approves a vision, so nothing that came from outside skips that approval.
  - A group of duplicates becomes one draft.
- **The maintainers' actions on GitHub are their own explicit acts.** Comments, duplicate marks and declines run through the GitHub command-line tool on the maintainer's machine, never through GitHub Actions.
- **The triage route appears only in the CTOC repository's own menu,** never in a user's project.
- **The "Auto-publish learnings" setting is dealt with.**
  - The sending route never reads it.
  - It is removed or relabelled so that the settings screen never claims CTOC publishes on its own.
  - The plan first traces, with real analysis and not a text search, whether any code reads it.
- **The issue-processor operation is not revived as a command.** Its triage and duplicate-finding content may feed the triage instructions. The route lives in the menu, which is the only entry point CTOC ships.
- **Opening the browser depends on the platform.** The owner chose GitHub's own new-issue page, so this applies.
  - The launcher is chosen by `process.platform`: `open` on macOS, `xdg-open` on Linux, and on Windows a launcher that takes the address as a single argument.
  - The address is always handed over as one argument, without passing through a shell. Windows' command interpreter expands `%` sequences even inside quotes, and a percent-encoded address is full of them, so the filled-in text could change on the way.
  - When none of these works, for example on a machine with no display, CTOC prints the web address for the human to open.
- **Project type.** This is CTOC developing itself, for two groups of users, so it is classified as an internal tool and an open-source library together.
  - Competitors and business model are skipped as not applicable.
  - The owner is the stakeholder, because he answered the three questions and approves this vision.
- **Not decomposed, not approved.**
  - This vision has two separate workstreams, the installation side and the maintainers' side, so it suits the vision-decomposer once the owner approves it.
  - The vision advisor neither decomposes nor approves.
- **Public wording.**
  - This file lands in a public repository, so it names only repository paths, the owner's name and the public repository address.
  - Dates carry no clock time, because none was recorded.
- **Progress is written as all five phases complete.** The owner answered the three questions, so the summary is final and the status is `ready`. "Ready" means ready for the owner's approval. The vision advisor does not approve it and does not decompose it.

## The owner's answers

Given by the owner on 2026-10-22 in the main session, and relayed by the coordinator. Each answer took the recommended option.
- **What may leave the machine:** only CTOC's own facts plus the user's own words, behind the blocking scan.
- **Issues or pull requests:** issues only. A proposed fix travels as text inside the issue.
- **How a request reaches GitHub:** GitHub's own new-issue page, filled in, where the user presses Submit under their own account. CTOC holds no token and contains no code that sends.

## Friction found while writing this vision

- **The menu refuses answers for a vision.** The vision advisor follows its own agent instructions and writes a vision's questions to `.ctoc/streaming/questions/pending/vision__<file>.md.json`. The menu then refused the owner's `stream answer` for that vision with "Ignored an answer for an invalid plan reference: vision/…" (reported by the coordinator, not re-run by the vision advisor). So at the vision stage, questions can be asked but not answered through the menu, and the answers had to go into this file by hand.
- **read:** the question store resolves any stage name, `vision` included, to a plan path (`refToPlanPath` and `isUnsafeStage` in `src/lib/streaming-precompute.js`). So the refusal sits in the answer route, not in the question store. Which check in the answer route refuses it was not traced.
- Disposition: per the rule "CTOC is built with CTOC", this is filed as a plan through the menu. The vision advisor holds no menu route, so the coordinator files it.

## Discussion History
### 2026-10-22
Q: All sections
A: Written in one pass from the owner's request of 2026-10-22 and the CTO Chief's brief, which carried his hard constraints. The evidence was read on version 6.14.134. Three questions were sent to the owner through the menu: what may leave the machine, issues or pull requests, and how a request reaches GitHub. No answer has been recorded yet.

### 2026-10-22
Q: What may leave the machine
A: Only CTOC's own facts plus the user's own words, behind the blocking scan.

### 2026-10-22
Q: Issues or pull requests
A: Issues only. A proposed fix travels as text inside the issue.

### 2026-10-22
Q: How a request reaches GitHub
A: GitHub's own new-issue page, filled in. The user presses Submit under their own account, and CTOC holds no token and no sending code.

