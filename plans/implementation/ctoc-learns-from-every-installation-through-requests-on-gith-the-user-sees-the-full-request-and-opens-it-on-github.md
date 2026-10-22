---
title: "The user sees the full request and opens it on GitHub"
created: "2026-10-22T09:23:58.757Z"
type: feature
parent_vision: "vision/ctoc-learns-from-every-installation-through-requests-on-github.md"
priority: MEDIUM
status: refined
depends_on: "ctoc-learns-from-every-installation-through-requests-on-gith-a-blocking-scan-stops-any-request-carrying-private-data, ctoc-learns-from-every-installation-through-requests-on-gith-ctoc-quietly-drafts-a-request-for-each-friction-it-meets"
acceptance_criteria_count: 13
risk_level: HIGH
---

# The user sees the full request and opens it on GitHub

## Problem Statement

A draft that CTOC kept about a friction is worth nothing to the maintainers until it reaches the CTOC repository as a GitHub issue. The owner decided on 2026-10-22 that it gets there only one way: GitHub's own new-issue page, filled in, where the person presses Submit under their own account. CTOC holds no token and contains no code that sends. Nothing on the user's side does this today. **Searched (a presence check):** no file under `src/` contains `issues/new`, `encodeURIComponent`, `URLSearchParams`, `xdg-open`, `explorer.exe` or `rundll32` (the searches and their limits are listed under "Decisions Taken Under Ambiguity").

The person is a CTOC user, often in a private or client project. They need four things:
- to add their own words to a draft, a proposed fix included, as text;
- to see the complete request exactly as it will reach GitHub, together with the repository it goes to and a plain statement that it becomes public under the GitHub account that presses Submit and cannot be recalled;
- to have nothing shown as ready, and nothing opened, while the title or body holds a private item that the blocking scan finds;
- to have GitHub's new-issue page opened with exactly that text, or to be given the address to open on another device, and then to press Submit themselves.

Four things make this hard:
- **The text must not change on the way.** The address is percent-encoded, and the Windows command interpreter expands `%` sequences even inside quotes (vision, "Decisions Taken Under Ambiguity"). So the address goes to the launcher as one argument and never through a shell.
- **Nobody has measured the length limit.** GitHub's page, each platform's launcher and GitHub's sign-in redirect may each refuse or cut a long address (not checked; vision, "Unknowns").
- **What was shown must be what opens.** A draft can change between showing and opening. The person may send a new description or edit the file by hand, and the drafting stub refreshes a draft's facts under a newer CTOC version.
- **The session sits between the person and the menu.** CTOC cannot tell whether the person or the session typed a menu route. The act that publishes is GitHub's Submit button, which no CTOC code presses.

Constraints: no online model call; Windows, macOS and Linux. This stub is the first live caller of the blocking scan. It also carries two tests its siblings handed to it: every registered message template checked against the scan, and the fake-project marker test through the full route.

## Business Alignment

**Job to Be Done:** When my CTOC has kept a draft about a friction it met in my private or client project, I want to add my own words, see the whole request as GitHub will receive it, and have GitHub's own page opened with exactly that text, so I can publish it under my own account by pressing Submit, knowing that nothing private is in it.

**Impact Map:**
- **Goal:** the decomposition's first goal: a friction met in any installation reaches the CTOC repository, and nothing private goes with it. This stub is the step where a request leaves the machine.
- **Actor:** the CTOC user working in a private or client project on Windows, macOS or Linux. This is the vision's first target group. They often have no GitHub command-line tool, and sometimes their machine has no browser (vision, "Target User").
- **Impact:** the person goes from a draft to a filled-in GitHub new-issue page in three menu steps: write the description, look at the preview, open it. They see every line before anything leaves, and CTOC refuses to go on while the text holds a private item.
- **Deliverable:** five parts:
  - the route that takes the description;
  - the preview screen;
  - the route that opens the page, with its launcher for each platform and the printed address;
  - the length limit, set from a measurement;
  - the two tests the sibling stubs handed to this one.

**Alignment checks:**
- The goal traces to the vision's problem statement, that frictions in other installations never reach the CTOC repository: YES.
- The actor is in the vision's target audience: YES.
- The impact is observable, as a filled-in GitHub page, a printed address, or a refusal that names the kind and place of each hit: YES.
- The deliverable is one functional area, getting one draft from the menu onto GitHub's new-issue page: YES.

## User Stories

**As a** CTOC user in a private or client project, **I want** to write a draft's description in my own words, with the blocking scan run on the whole title and body before anything is stored or shown as ready, **so that** I am never offered something private as ready to publish.
- INVEST: passes, with two qualified letters.
  - Independent is qualified: it needs a draft from the drafting stub and the scan from the scan stub. Both are this stub's dependencies.
  - Small is qualified: it also carries the two tests handed to this stub, the template test and the marker test.

**As a** CTOC user, **I want** the menu to show me the complete request exactly as it will reach GitHub, the repository it goes to, and that it becomes public under the account that presses Submit, **so that** I know exactly what I publish, where, and under whose name.
- INVEST: passes on all six.
- Technical enabler attached: the measurement of the longest address, which sets the length limit (see "In Scope").

**As a** CTOC user, **I want** opening one previewed request to give GitHub's own new-issue page exactly the text I saw, or to print its address when no browser opens, with no setting, flag, batch or background agent able to do it for me, **so that** publishing stays my own act of pressing Submit.
- INVEST: passes. Estimable is qualified: the refusal of background agents depends on the owner's answer to this plan's open question.

## Acceptance Criteria

Common to every scenario:
- The running CTOC copy is the repository under test. The project is a fake project in a temporary folder that CTOC has set up. Its drafts are made by the drafting stub's recorder, through that stub's walking-skeleton friction.
- Every private item that the blocking scan gathers in the fake project is a unique marker. The scan reads them through the same stand-in for the operating system's account record that the scan plan's tests use.
- Node.js's network functions are replaced by functions that fail the test when called: `fetch`, and the request, connect and lookup functions of `http`, `https`, `net`, `tls` and `dns`. No scenario makes an online model call.
- Starting the platform's browser launcher is recorded and starts nothing, except where a scenario puts a real stand-in program in its place. Every other process start is recorded and then passed through.
- "The describe route", "the preview route" and "the open route" are this stub's three new menu routes. Their names are the planner's.
- The tests pass on Windows, macOS and Linux. The path shapes of all three platforms are tested as strings on every platform.
- The scenarios follow the recommended answer to this plan's open question on background agents. "Decisions Taken Under Ambiguity" says what changes under the other answer.

### Writing the description, with the scan on the whole final text

- [ ] **Scenario: The person's own words become the description, and the request is shown as ready**
  Given a draft with an empty description
  When the describe route runs for it with a two-line description in plain words on standard input, in the quoted form that the inbox answer route takes
  Then the draft's stored description is those two lines. Each line break is stored as a line feed, and the one trailing line break is removed.
  And the draft's title, the lines CTOC wrote and its fingerprint are byte-identical to before
  And the screen is that draft's preview, ready to open
  And the same call, in the exact heredoc form that `src/commands/start.md` gives the main session, is allowed when the one hook CTOC loads checks it as a separate process with no agent id

- [ ] **Scenario: A description holding a private item is refused, and the earlier description stays**
  Given a draft whose stored description is `first words`
  When the describe route receives, one at a time:
  - a description whose third line holds the project folder name;
  - a description whose first line holds the home folder in drive-letter form with backslashes;
  - a description holding a GitHub token sample;
  - a description holding the request marker's fixed text.

  Then each is refused. The first three name the kind of item and its place, for example "line 3 of your description". The last gives the format's reason.
  And the stored description is still `first words`, byte for byte, and nothing else under `.ctoc/` has changed
  And no text the route returns holds the folder name, the home folder, the token, or the existing scanner's redacted form of the token
  And no screen offers to open the request
  And when the description is sent again with the folder name removed, it is stored and the request is shown as ready

- [ ] **Scenario: A hit in a line CTOC wrote says so, and that request cannot be opened**
  Given a fake project whose folder is named after the first word of the draft's kind, for example `refusal`
  When the preview route runs for that draft, and the describe route runs for it with a description in plain words
  Then both refuse. They name the project folder name, and say that each hit is in the title or in a line CTOC wrote, which the person cannot edit.
  And the screen says that this request cannot be opened from CTOC while the folder carries that name
  And no screen offers to open the request, and the draft is unchanged

- [ ] **Scenario: Every registered message template passes the blocking scan in a clean project**
  Given the one template registry that the drafting stub ships, holding at least one template
  And a fake project whose every gathered private item is a unique marker that no template holds
  When, for each registered template, the format's writer writes a request holding that template with its placeholders, every other field filled and a description in plain words, and the blocking scan checks its title and body
  Then every request passes with no finding
  And a failing template is named by its registry name
  And the test fails when the registry holds no template

- [ ] **Scenario: Nothing private reaches the shown text or the address, through the full route**
  Given a fake project in which each of these is a unique marker:
  - the project folder name and the repository's top-level folder name;
  - the owner and repository names in the repository's remote address;
  - the git user name and the git e-mail;
  - the home folder;
  - the current branch name, and the machine's name where the scan gathers it under the owner's answer to that plan's question;
  - a plan file's name and its title;
  - a source file's name and a line of its content.

  And the home folder given, one at a time, in drive-letter form with backslashes (`C:\Users\…`), in `/home/…` form and in `/Users/…` form
  When a friction is triggered through the drafting stub's walking-skeleton source, with a marker wherever that source takes a value from the project, and a description in plain words is written, the preview is shown and the open route composes the address
  Then no marker appears in the shown title and body, in the address, or in the address once decoded
  And no marker appears in any file under `.ctoc/requests/`

### Showing the complete request

- [ ] **Scenario: The preview shows every line, where it goes, and that it becomes public**
  Given a draft with a two-line description that passes the scan
  When the preview route runs for it
  Then the screen shows the title and the complete body between a fixed start line and a fixed end line. Each line is exactly as it will reach GitHub, with none wrapped, shortened or added.
  And it names `github.com/robotijn/ctoc` as the repository the request goes to
  And it says that pressing Submit on GitHub's page publishes the request as a public issue under the GitHub account that presses it, and that a published issue cannot be recalled
  And it says that opening the page hands this text to GitHub inside the web address, and that the browser keeps that address in its history, even if Submit is never pressed
  And it says that CTOC does not check text changed on GitHub's page before Submit
  And its only actions are: open this request on GitHub, carrying the digest of the title and body as shown; write the description; go back

- [ ] **Scenario: A request too long for GitHub's page is refused, with the limit**
  Given the request length limit that the measurement set, as a number of characters of the composed web address
  And a draft whose description, in ASCII letters, makes the composed address one character longer than that limit
  When the preview route runs for it
  Then the screen says that the request is too long, gives the limit and the address's length, and says that a shorter description shortens the address
  And it offers no open action
  And the open route, run with the digest of that text, starts nothing and prints no address
  And with a description one character shorter, the address is exactly at the limit and the preview offers the open action

- [ ] **Scenario: The preview checks the stored text again, and an unreadable draft is not shown**
  Given a draft whose stored description was changed by hand to hold the git e-mail on its second line
  When the preview route runs for it
  Then it shows no request text. It names the git e-mail and the e-mail address kinds at "line 2 of your description", and it offers no open action.
  And a draft file that the format's reader reports as unparsed is refused as unreadable, without its content and without an open action

### Opening it on GitHub

- [ ] **Scenario: Opening hands GitHub exactly the shown text, and prints the address**
  Given a draft whose description passes the scan and holds all of these: `100%`, `%PATH%`, `%41`, `&`, `+`, `#`, `=`, `?`, double quotes, three backticks, an accented letter, an emoji and an empty line
  And its preview, with the digest the preview carried
  When the open route runs with that digest
  Then the launcher is started once, with exactly one argument, the address, and without a shell
  And the address starts with `https://github.com/robotijn/ctoc/issues/new?` and holds exactly two query parameters, `title` and `body`
  And decoding them the way a browser decodes a query string (`URLSearchParams`) gives the shown title and body, byte for byte
  And the screen prints the same address. It says that CTOC asked the system to open it, and that the person should open the address by hand if no browser window opened.

- [ ] **Scenario: The launcher fits the platform, never uses a shell, and never holds up the menu**
  Given the platform reported, one at a time, as macOS, Linux, Windows and another platform
  When the open route runs
  Then on macOS it starts `open` and on Linux `xdg-open`. On Windows it starts a program that takes the address as its only argument and is not a command interpreter: neither `cmd.exe` nor PowerShell. Each gets the address as its only argument, and none is started through a shell.
  And on the other platform it starts nothing and prints the address
  And when the launcher cannot be started because the program is missing, the route returns its screen without an error, and that screen prints the address
  And with a real stand-in program in the launcher's place, on the platform the suite runs on, the stand-in receives the address unchanged as its one argument, every `%` included, and the route returns before the stand-in ends

- [ ] **Scenario: Only the text that was shown opens, and only one request per choice**
  Given the preview of a draft and the digest it carried
  When, before the open route runs with that digest, the draft changes in one of three ways:
  - a new description through the describe route;
  - a change to the file by hand;
  - the drafting stub refreshing its facts under a newer CTOC version.

  Then the open route starts nothing, prints no address, and shows the new preview with its new digest
  And the open route is refused, and starts nothing, when it runs with no digest, with another draft's digest, with two drafts, with the word `all`, or with any further word
  And with every settings toggle on, and with the environment variables `CI=true` and `CTOC_AUTO_OPEN=1` set, none of these starts a launcher or prints an address: opening the menu, triggering a friction, the drafts list, the draft view, the describe route and the preview route

- [ ] **Scenario: No request route sends anything to GitHub**
  Given the drafts list, the draft view, the describe route, the preview route and the open route
  When each runs on a draft that passes the scan
  Then no network function is called
  And every process started is one of two kinds:
  - git, asked only to read configuration or names, and never `push`, `fetch`, `pull`, `clone` or `ls-remote`;
  - the launcher, given the address, and started only by the open route.

  And the only hand-off to GitHub is that address, given to the launcher and printed

- [ ] **Scenario: A background agent can neither write a description nor open a request**
  Given the one hook CTOC loads (`hooks/hooks.json:4-13`), run as a separate process the way Claude Code runs it
  And a shell call of the describe route and one of the open route, each in the exact form that `src/commands/start.md` gives the main session
  When each call's input carries a background agent's id
  Then each is refused with the hook's sentence, and the menu route does not run
  And the same calls without an agent id are allowed
  And every existing test of the hook passes unchanged

## Scope

### In Scope
- **The describe route.** The person's words arrive on standard input, in the quoted form that the inbox answer route takes (`src/commands/start.md:446-462`). `src/commands/start.js` reads standard input for this route as well (today only for two routes, `:1003-1017`). The words are scanned with the whole title and body before anything is stored, and a text with a hit is never stored. (Scenarios: the person's own words become the description; a description holding a private item is refused.)
- **The blocking scan on the exact title and body, at three moments:** before a description is stored, on the preview, and on the open. Each hit is reported by kind and place: the title, a line of the description, or a line CTOC wrote. (Scenarios: a description holding a private item is refused; a hit in a line CTOC wrote says so; the preview checks the stored text again.)
- **The preview screen.** It shows every line between fixed start and end lines, names the repository, and says what becomes public, what cannot be recalled, what the address hands to GitHub and the browser history, and that CTOC does not check edits made on GitHub's page. Its only actions are open, describe and back. (Scenario: the preview shows every line.)
- **The length limit,** on the composed address, from the measurement below. (Scenario: a request too long for GitHub's page is refused.)
- **The open route.** It takes one draft and the digest of the text the preview showed. It composes `https://github.com/robotijn/ctoc/issues/new?` with `title` and `body` only, each value percent-encoded. It starts the platform's launcher once, without a shell, detached and not waited on, and always prints the address. (Scenarios: opening hands GitHub exactly the shown text; the launcher fits the platform; only the text that was shown opens.)
- **One request per choice.** No batch, no "all", and no setting, flag or environment variable opens anything. (Scenario: only the text that was shown opens.)
- **No sending code.** No request route calls the network, and the only processes are git reading configuration and names, and the launcher. (Scenario: no request route sends anything to GitHub.)
- **The refusal of a background agent's describe and open calls** in the loaded hook `src/hooks/protect-records.js`, under the recommended answer to this plan's open question. (Scenario: a background agent can neither write a description nor open a request.)
- **The doors and the session's rules,** in `src/commands/start.md`:
  - the three routes are listed in its route table;
  - a section on writing a description only with the person's own words, built like "Answering an inbox question" (`:446-462`);
  - a rule that the open route runs only on the person's explicit choice of that one request, never in the same turn on the session's own initiative, built like the menu's rule that an approval waits for the human's explicit pick (`:490`);
  - a rule that the preview's text is shown to the person in full, as it comes.

  (Scenarios: the person's own words become the description; only the text that was shown opens.)
- **The two tests handed to this stub:**
  - every registered message template against the blocking scan (handed over by the drafting plan);
  - the fake-project marker test through the full route (placed here by the decomposition).

  (Scenarios: every registered message template passes; nothing private reaches the shown text or the address.)
- **Technical enabler: measure the longest address before the limit is set.** The implementation plan records each result with how it was measured and on which platforms. It informs the scenario "a request too long for GitHub's page is refused".
  - The longest address GitHub's new-issue page accepts with both fields filled, signed in and signed out. The sign-in redirect carries the whole address again inside its own. The page is only loaded: Submit is never pressed and no issue is created.
  - What GitHub does past that length: it refuses, cuts the text, or drops it.
  - Whether the text GitHub's page shows equals the decoded text: line breaks, trailing spaces, accented letters, `+` and `%`.
  - The longest address each launcher hands on to a real browser: macOS `open`, Linux `xdg-open`, and the chosen Windows program, each checked on its own platform. The automated stand-in test proves only what CTOC hands to the launcher, not what the launcher hands to the browser. This check is what closes that gap.
  - Whether labels in the address apply for an outsider, recorded for information only, because the design uses no labels.
  - The limit is one number in the code, set below the smallest measured value, with the margin stated.

### Out of Scope
- **The scan's rules, kinds and gathered items.** These live in the sibling stub "A blocking scan stops any request carrying private data". This stub calls the scan; it does not change what the scan finds.
- **Lives in the sibling stub "CTOC quietly drafts a request for each friction it meets":**
  - recording a friction;
  - the template registry;
  - the title;
  - the drafts folder;
  - the noticing setting;
  - the count line;
  - the drafts list and the draft view.

  This stub changes neither the count line nor the actions that the drafts list and the draft view offer. Its routes are reached through the route table.
- **The field list, the marker, the writer, the reader and the fingerprint.** These live in the sibling stub "A request holds only the allowed facts and a fingerprint".
- **A draft whose fingerprint the maintainers already know.** This lives in the sibling stub "A draft the maintainers already know links to the request". Such a draft is never a sendable draft, so this stub needs no change for it.
- **Triage, and its read-only listing through the GitHub command-line tool.** This lives in the sibling stub "Maintainers triage grouped requests into vision drafts".
- **Removing a draft, or leaving out of the count line a request the person has already opened.** No stub of this vision carries it; see Risks.
- **Pull requests.** The owner chose issues only, and no route opens one. A proposed fix travels as text in the description.
- **Pressing Submit, signing in to GitHub, and any change the person makes on GitHub's page.** These are the person's own acts in their browser.
- **Reads of GitHub outside these routes, named as allowed by the decomposition:** the update route's clone of the public repository (`src/commands/update.js:333`) and the triage route's read-only listing.

## Risks

### Technical Risks
- **The text changes on its way to the browser.** Three ways it could happen: the Windows command interpreter expands a `%` sequence; a `+` is read as a space; a launcher encodes the address again.
  - Likelihood: MEDIUM
  - Impact: HIGH. What opens would differ from what was shown.
  - Mitigation: Start the launcher without a shell, with the address as its only argument. Encode every value so that a space, `+`, `%`, `&`, `#` and `=` are escaped. Test with a real stand-in program on the suite's platform, and check each real launcher by hand in the measurement.
- **An over-long address is refused or cut** by GitHub, by a launcher, or by GitHub's sign-in redirect, which carries the address again inside its own. Not checked.
  - Likelihood: MEDIUM
  - Impact: MEDIUM. The person sees a shortened text or an error on GitHub's page. Nothing private is added, because a cut only removes text.
  - Mitigation: Measure the limit signed in and signed out, on each platform's launcher. Set the limit below the smallest value, and refuse a longer request on the preview.
- **CTOC cannot see whether a browser window appeared.** A launcher can succeed on a machine with no display. **Believed, not checked:** Windows Explorer reports a failure status even when it opened the page.
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Print the address every time, and never claim that the page opened.
- **The launcher holds up the menu.** Examples are a launcher that waits for the browser, or a text-mode browser on a machine with no display. Not checked.
  - Likelihood: MEDIUM
  - Impact: MEDIUM. A menu with no response is broken, by the first operating lesson.
  - Mitigation: Start the launcher detached, with its input and output ignored, and never wait on it. Test that the route returns before a stand-in program ends.

### Business Risks
- **A private name the scan has no record of reaches a public issue.** Examples are a client or product name typed by the person, or written into the description by a session that followed planted text. This is the vision's key risk, and a published issue cannot be recalled.
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: Show every line on the preview, with the statement that it becomes public and cannot be recalled. Let only the person's own words become the description, by the session's rule in `src/commands/start.md`. Refuse background agents' describe and open calls, under the recommended answer. GitHub's page shows the text once more before Submit.
- **The session shortens or rewords the preview when it relays it to the person.**
  - Likelihood: MEDIUM
  - Impact: MEDIUM. GitHub's page still shows the exact text before Submit.
  - Mitigation: Add the rule to `src/commands/start.md` that the preview's text is shown in full, as it comes. Keep the request between fixed start and end lines.
- **A proposed fix written as code is mostly refused by the scan.** Under the scan plan's decisions, a diff header such as `a/src/…` counts as a path outside CTOC's files, and so does a word such as `settings.learning`.
  - Likelihood: HIGH
  - Impact: LOW. Nothing leaks, but the person must reword.
  - Mitigation: Name each hit's place. Say on the describe route's refusal that a fix is best described in words, naming CTOC files by their repository path, such as `src/lib/settings.js`, which passes.
- **A request the person has opened keeps counting.** The drafting stub's count line counts every draft, and no stub of this vision removes a draft or leaves an opened one out of the count. This touches the vision's pestering risk.
  - Likelihood: HIGH
  - Impact: LOW. It is one line, and it never asks a question.
  - Mitigation: Name it to the owner in this plan. This stub does not change the count line, because the drafting plan's criteria fix it.
- **A private name that equals a word CTOC writes blocks that request permanently.**
  - Likelihood: LOW
  - Impact: MEDIUM. Nothing leaks, but the person cannot send that request from CTOC.
  - Mitigation: Say on the refusal that the hit is in the title or in a line CTOC wrote, so the person knows it is not in their own text.

### Dependency Risks
- **The blocking scan has no caller of its own.** The rule that a module is done when a human can reach it applies to it.
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Plan the scan's module in the same implementation chain as this stub's first story, so the change that adds the scan also adds its first live caller.
- **The hook change needs the owner's approval.**
  - Likelihood: MEDIUM
  - Impact: LOW. Submit on GitHub stays the person's act under either answer.
  - Mitigation: Carry both answers, as "Decisions Taken Under Ambiguity" records.
- **GitHub's new-issue page may not fill its fields from the `title` and `body` parameters.** Believed from GitHub's documentation, not checked.
  - Likelihood: LOW
  - Impact: HIGH. The route would open an empty page.
  - Mitigation: Confirm it in the measurement before the limit is set.
- **Shared files and documented counts.** This stub edits files that sibling stubs also edit: `src/commands/start.js`, `src/commands/start.md` and `src/lib/menu-screens.js`, and, under the recommended answer, `src/hooks/protect-records.js`. A new file under `src/lib/` moves a documented count, so its build must declare `CLAUDE.md`. That rule was read by the sibling plans in `src/lib/documented-counts.js`; it was not re-read in this pass.
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Declare `CLAUDE.md` in every implementation plan that creates a counted file. Name the shared files in each plan, so that whoever schedules can order them.
- **Cross-platform proof without GitHub Actions.** Whether a Windows or Linux machine runs the suite before a push was not checked.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test each platform's launcher choice with the platform reported as that platform. Run the real stand-in program on whichever platform runs the suite. Check each real launcher by hand in the measurement.

## Priority

**Priority: MEDIUM** (Score: 6/9)
- Dependency: 1. It depends on the scan and the drafting stubs, and no stub depends on it. The known-requests stub catches a known fingerprint at drafting time, so it needs nothing from this one.
- Business Impact: 3. It is the only route by which a request reaches the CTOC repository, and it carries the owner's three binding rules on showing and sending: the full preview, the person's own act, and no sending code.
- Technical Risk: 2. Starting a browser and percent-encoding are well understood. The length limit is not yet measured, and keeping the text unchanged through three platforms' launchers is moderate work.

## Decisions Taken Under Ambiguity

- **One question goes to the owner: whether the loaded hook refuses a background agent's describe and open calls.** That is hook logic, which changes only with his explicit approval.
  - **Read:** today the hook refuses a background agent only its sweep confirmation (`src/hooks/protect-records.js:1173-1174`) and some command forms built at run time (`:1175-1178`).
  - **Read:** `RECORD_REFUSALS_OFF` is `true` (`:1170`). The branch it guards returns at `:1195`, so the check on a background agent's menu calls (`:1197-1200`, with `subagentMenuRefusal` at `:1031-1046`) never runs. The comment at `:1179-1180` records the owner's order of 2026-10-15 to remove that block.
  - The acceptance criteria follow the recommended answer: refuse a background agent's call of exactly these two routes, in the narrow form of the sweep refusal.
  - Under the answer "no hook change", the scenario "a background agent can neither write a description nor open a request" drops, and `src/hooks/protect-records.js` leaves this stub's files. The session's rules in `src/commands/start.md` and GitHub's Submit button remain the guards.
- **CTOC cannot tell whether the person or the session typed a route.** The act that publishes is Submit on GitHub's page, which no CTOC code presses. So the plan claims only what CTOC can enforce:
  - only text that was shown in full can open, and only that exact text;
  - one request per choice;
  - never by a setting, a flag or a batch;
  - under the recommended answer, never by a background agent.
- **The description arrives on standard input, never on the command line.** This follows the two routes that take a person's words today, the inbox answer and the build-queue send-back (**read:** `src/commands/start.js:1003-1017`, `src/lib/inbox.js:16-29`, `:509-535`). Whether to reuse `readStandardInput` and its size cap is the planner's choice.
- **Nothing with a hit is stored.** The describe route scans the new title and body before it writes, and a refused description leaves the earlier one in place. No draft file ever holds a private item that the scan finds, which keeps the drafting plan's rule that a draft holds no project value.
- **The scan runs three times, always on the exact title and body:** before storing, on the preview, and on the open.
  - The preview's run catches a hand edit, and a private item that appeared since the description was stored, for example a newly configured git e-mail.
  - The open's run checks the very text it hands over.
- **Places in a refusal are told in the person's terms:** "the title", "line N of your description", or "a line CTOC wrote". The scan reports body line numbers (scan plan), and this stub converts them. The exact wording is the planner's.
- **A refused screen shows no request text,** only kinds and places. This keeps the scan plan's rule that no refusal repeats what it found.
- **The open route carries the digest of the title and body as the preview showed them.**
  - It follows the pattern `stream answer` already uses: an answer counts only when the screen's digest equals the stored question's digest, "so a question rewritten between showing and clicking is asked again instead of inheriting the click" (**read:** `src/lib/streaming-gate.js:2600-2606`).
  - A draft that changed shows its new preview instead of opening.
  - The digest's formula is the planner's, made with Node.js's built-in `crypto` module.
- **The address** is `https://github.com/robotijn/ctoc/issues/new?title=…&body=…`.
  - Each value is encoded so that a space, `+`, `%`, `&`, `#` and `=` are escaped, as `encodeURIComponent` does.
  - There is no other parameter: no labels, no assignees, no template.
  - **Not checked in this pass:** that GitHub's page fills its title and body from these two parameters. This is believed from GitHub's documentation, and the measurement confirms it.
  - The repository is one fixed value in the code. The scenario "opening hands GitHub exactly the shown text" pins it.
- **The address is printed every time, not only when the launcher fails.** CTOC cannot see whether a window appeared (see Risks). Printing every time keeps the owner's rule, that CTOC prints the address when no browser opens, true in every case, and the screen never claims that the page opened.
- **The launcher is started detached, with its input and output ignored, and never waited on,** so nothing it does can hold up the menu.
- **The Windows program is the planner's choice,** within the vision's rule: it takes the address as its only argument and is not a command interpreter. **Believed, not checked:** `explorer.exe` takes a web address as its only argument. On a platform other than Windows, macOS and Linux, nothing is started and the address is printed.
- **Line breaks in the description are stored as line feeds,** so a request is the same on every platform. The format reads both styles (format plan).
- **The title is not edited in CTOC.** It is the drafting stub's title, built from the kind and the CTOC part. The person may change it on GitHub's page, and the preview says that CTOC does not check such changes.
- **An empty description is allowed.** The request then carries only CTOC's own facts.
- **The noticing setting does not affect this stub's routes.** Switching noticing off stops new drafts (drafting plan). Opening a draft that already exists stays the person's own act.
- **This stub leaves the drafting stub's screens alone.**
  - That plan's criteria fix the draft view's actions to going back and switching noticing, and the count line to the number of drafts. Changing either would loosen a refined sibling's tests.
  - So this stub's three routes are doors in the route table, as the drafting plan made its own routes. Only this stub's preview screen carries the open, describe and back actions.
  - The cost is named under Risks: a request the person has opened keeps counting.
- **Nothing records that a request was opened.** CTOC cannot observe Submit, so "opened" would never mean "sent", and a mark could not leave the count line without changing the drafting plan. Opening the same draft again is allowed, and triage groups a duplicate by its fingerprint.
- **Wiring.** The describe, preview and open routes are the blocking scan's first live callers, as the scan plan named. Plan the scan's module in the same implementation chain as this stub's first story. This is a technical constraint on what ships with what; the owner alone chooses when anything is built.
- **The template test sits here,** as the drafting plan handed it over: making drafting depend on the scan would leave the scan with no reachable caller (drafting plan, "Decisions Taken Under Ambiguity"). The test runs over the whole registry, so a new template is checked without a change to the test.
- **The marker test sits here,** as the decomposition placed it, because only this stub has the full route.
- **The sibling plans' open questions.** This plan is correct under every answer:
  - The format's question, whether to refuse templates CTOC does not ship: the template test runs over the registry the drafting plan ships, whatever the writer checks.
  - The scan's question, whole-word or in-word matching: the collision scenario uses a whole word, which both answers catch, and the marker tests use unique markers.
  - The scan's question, whether to gather the machine's name and branch names: the branch name is a marker under either answer, because nothing in CTOC writes it into a request. The machine's name is a marker where the scan gathers it.
  - The drafting plan's question, where CTOC may record a friction: the marker test triggers that plan's walking-skeleton source, whichever source the answer gives.
- **A discrepancy found, for the coordinator to file as a friction.**
  - `src/commands/start.md:464` says that CTOC's write protection refuses a background agent's direct call of the inbox answer route.
  - In the lines of `src/hooks/protect-records.js` read in this pass, `RECORD_REFUSALS_OFF` (`:1170`) returns before the menu-route check runs (`:1181-1197`).
  - Whether another path in the hook refuses that call was not traced. Under the rule that CTOC is built with CTOC, the coordinator files this through the menu.
- **Six decomposition stories became three.** The agent's limit is three stories per stub.
  - The measurement is a technical enabler of the preview story.
  - The open action and "no setting, flag, agent or batch" are one story.
- **No question was asked below the owner's bar.** These are recorded here instead:
  - the route names;
  - the screen's wording;
  - the address's parameters;
  - printing the address every time;
  - the Windows program;
  - storing line breaks as line feeds;
  - allowing an empty description;
  - leaving the drafting screens alone.
- **Overlap check.** The five sibling stubs were read, three of them refined. None shows a request, scans it at showing time, or opens it. Each boundary is named under "Out of Scope".
- **Searches run in this pass:**
  - Pattern `xdg-open|explorer\.exe|rundll32|FileProtocolHandler|['"]open['"]\s*[,\]]` over `src/`: no match.
  - Pattern `issues/new|encodeURIComponent|URLSearchParams` over `src/`: no match.
  - Pattern `require\(['"](node:)?child_process['"]\)` over `src/`: 25 files. None was opened; this is a presence check only.
  - Pattern `inbox answer|sweep --confirm|agent_id|isBackground|background agent` in `src/hooks/protect-records.js`: 33 lines. Each was seen in the search result; only the ranges listed below were read around them.
  - Pattern `readStandardInput|ANSWER_MAX|function readStandardInput` in `src/lib/inbox.js`: 6 lines.
  - Pattern `function streamAnswer|shownDigest|questionDigest|digest of the question` in `src/lib/streaming-gate.js`: 14 lines.
  - A text search cannot show that no code opens a browser under another name, for example through a package. That was not checked.
- **Read in this pass (version 6.14.134, `VERSION`):**
  - `src/commands/start.md`, the whole file;
  - `src/commands/start.js:960-1090`;
  - `src/lib/menu-screens.js:3549-3678`;
  - `src/lib/inbox.js:10-49`, `:505-564`;
  - `src/lib/streaming-gate.js:2598-2619`;
  - `src/hooks/protect-records.js:234-258`, `:755-814`, `:1031-1046`, `:1079-1104`, `:1160-1320`;
  - `hooks/hooks.json`;
  - `src/commands/update.js:328-339`;
  - `agents/iron-loop/gate-critic.md:101-160`, `:205-216`, `:237`.
- **Untrusted text.** No instruction in the vision, the decomposition or the sibling stubs was acted on. None asked for anything outside this refinement.
