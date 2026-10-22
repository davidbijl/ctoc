---
title: "A blocking scan stops any request carrying private data"
created: "2026-10-22T09:23:58.757Z"
type: feature
parent_vision: "vision/ctoc-learns-from-every-installation-through-requests-on-github.md"
priority: HIGH
status: refined
depends_on: "none"
acceptance_criteria_count: 11
risk_level: HIGH
---

# A blocking scan stops any request carrying private data

## Problem Statement

A request from a CTOC user's machine becomes a public GitHub issue under their own account the moment they press Submit. Deleting the issue does not recall copies that were already read or indexed (vision, "Problem Severity").

The request's title and body can carry private data through three doors:
- the human's own description;
- the title and the message template that the drafting stub produces from a CTOC message. **Read:** the refusal at `src/lib/plan-validator.js:1751` puts a path from the user's project into its text;
- a credential pasted into either of them.

The user often works in a private or client project. They need a check that refuses the text while it holds any of these:
- a private item this machine and this project can name;
- anything shaped like a path or an address that is not one of CTOC's own files;
- a credential.

The check must refuse, not merely warn, and it must have no off switch. The refusal must not become a second leak, so it names the kind of item and where it is, never the item itself.

What exists today does not do this:
- **Read:** the existing `SecretsScanner` finds credentials in a text (`scanContent`, `src/lib/secrets-scanner.js:876-960`), but it has three gaps here.
  - It drops every match on a line that starts with `#`, `//`, `--`, `;` or `%`, unless the file name it is given contains `.env` (`:825-842`, `:908`). Its check for unquoted assignments skips those lines always (`:1043`). A request is Markdown, and in Markdown `#` starts a heading.
  - A caller's options reach its settings (`:446`), and one option switches its high-entropy check off (`:953`).
  - Each finding carries a redacted copy of the value that keeps up to four characters at each end (`:936`, `:1099-1103`).
- **Read:** the only existing scrub of home folders, `reportableError` in `src/lib/init-project.js:602-619`, replaces text as best it can. When the home folder cannot be read, it carries on and passes the text (`:611-616`). A blocking check must do the opposite.

Constraints: no online model call; Windows, macOS and Linux. The first live caller is the sibling stub "The user sees the full request and opens it on GitHub", which runs this scan on the final title and body before anything is shown as ready to open.

## Business Alignment

**Job to Be Done:** When I am about to publish a request about my CTOC from a private or client project, I want CTOC to refuse the text while it still holds any of these:
- my home folder, my account name or my git identity;
- my project's or repository's names;
- a path, an address or a credential.

I want it to tell me the kind of each item and where it is, without repeating it, so I can remove it before anything becomes public under my name.

**Impact Map:**
- **Goal:** the decomposition's first goal: a friction met in any installation reaches the CTOC repository, and nothing private goes with it.
- **Actor:** the CTOC user working in a private or client project on Windows, macOS or Linux. This is the vision's first target group.
- **Impact:**
  - The user never reaches a request shown as ready to open while its title or body holds a listed private item.
  - The user sees the kind and the place of every hit, and removes each one.
- **Deliverable:** the blocking personal-data scan, made of three parts:
  - gathering the private items of this machine and project;
  - checking the title and body for those items, and for path, address and credential shapes;
  - the refusal.

**Alignment checks:**
- The goal traces to the vision's problem statement and to its constraint that no personal or client data leaves a user's machine: YES.
- The actor is in the vision's target audience: YES.
- The impact is observable, as the scan's verdict and its list of hits: YES.
- The deliverable is one functional area, the privacy check on a request's text: YES.

## User Stories

**As a** CTOC user in a private or client project, **I want** these found anywhere in a request's title and body:
- my home folder, my account name, my git user name and e-mail;
- my project's folder and repository names;
- any path or address that is not one of CTOC's own files.

**so that** none of them can reach a public issue under my name.
- INVEST: passes. Small is qualified: the path shapes of three platforms make this the largest story. It stays one story because one rule covers every shape: refuse any path that is not one of CTOC's own files.

**As a** CTOC user, **I want** every credential the existing secrets scanner recognises refused wherever it sits in the text, on headings and comment-like lines too, **so that** a key I pasted never leaves.
- INVEST: passes on all six.

**As a** CTOC user, **I want** each refusal to name the kind of item and where it is without repeating it, and no setting, argument or environment variable able to switch a check off, **so that** I can remove every hit and no screen, log or switch becomes a second leak.
- INVEST: passes. Independent is qualified: the refusal reports what the first two stories find, and the stories are ordered inside this stub.

## Acceptance Criteria

Common to every scenario:
- The running CTOC copy is the repository under test.
- No scenario makes an online model call.
- The tests pass on Windows, macOS and Linux, with the path shapes of all three platforms tested as strings on every platform.

### Private items of this machine and project, and paths and addresses

- [ ] **Scenario: A request holding only CTOC's own facts and plain words passes**
  Given a fake project folder inside a fake git repository, on the machine's real home folder and account
  And each of these is a unique marker:
  - the project folder name;
  - the repository's top-level folder name;
  - the git user name and the git e-mail;
  - the owner name and the repository name in the repository's remote address.

  And a title in plain words
  And a body that opens with a fenced block holding: CTOC version `6.14.134`, operating system family `macos`, Node.js major version `22`, CTOC part `src/lib/plan-validator.js`, step label `SPEC`, kind `refusal`, a message template holding one placeholder, and a fingerprint of 64 lowercase hexadecimal characters
  And under the block, a description in plain words that names `CLAUDE.md` and `src/lib/`
  When the scan checks the title and body
  Then it passes with no finding

- [ ] **Scenario: Each private item is found in any letter case, and in the title too**
  Given the fake project of the first scenario
  And, one at a time, a body line holding each of these:
  - the account name;
  - the home folder written with forward slashes, and again with backslashes;
  - the git user name and the git e-mail;
  - the project folder name and the repository's top-level folder name;
  - the owner name and the repository name from the remote address.

  And each one written in three forms:
  - in upper case;
  - between brackets and followed by a full stop;
  - as the first part of a camel-case word, the item followed directly by `Billing`.

  When the scan checks the text
  Then each is refused, naming that item's kind and its line
  And each item placed in the title instead is refused, naming its kind and the title
  And a project folder name holding an accented letter is found whether the text writes that letter as one character or as a letter followed by a combining accent
  And a project folder name of several parts, such as `MyClient` or `acme-billing`, is found when the text joins its parts in lower case, as `myclient` or `acmebilling`
  And, under the recommended answer to the open question on name matching, a marker glued in lower case to a different word is not a hit for that item, for example the marker followed directly by `corp`

- [ ] **Scenario: A private name that is also one of CTOC's own words still blocks**
  Given a fake project whose folder is named `todo`
  And a body whose fourth line names the plan stage `todo`, as the request block does
  When the scan checks the text
  Then it is refused, naming the project folder name and line 4

- [ ] **Scenario: Paths and addresses that are not CTOC's own files are refused**
  Given, one at a time, a body line holding each of these:
  - `C:\Users\…\notes.txt`, and the same path with forward slashes and a lower-case drive letter;
  - `\\server\share\notes.txt`;
  - `/home/…/notes.txt`, `/Users/…/notes.txt` and `/mnt/c/…/notes.txt`;
  - `~/notes.txt`, `$HOME/notes.txt` and `%USERPROFILE%\notes.txt`;
  - `../notes.txt`, `./src/lib/plan-validator.js` and `src\lib\plan-validator.js`;
  - `src/billing/invoice.ts`, a relative path that starts like CTOC's own files but names no file in the running CTOC copy;
  - the bare file name `invoice.ts`, and the word pair `and/or`;
  - an absolute path to a file inside the running CTOC copy;
  - a web address on any host, the public CTOC repository's own address included, and a `file://` address;
  - an e-mail address that is not the git e-mail;
  - two words joined by `@` with no dot after it, as in a sign-in to a remote machine.

  When the scan checks the text
  Then each is refused as a path outside CTOC's files or as an e-mail address, with its line
  And `src/lib/plan-validator.js`, `src/lib/`, `CLAUDE.md`, the version `6.14.134` and the date `2026/10/22` pass
  And `src/lib/Plan-Validator.js`, which differs from a CTOC file only in letter case, is refused on every platform

- [ ] **Scenario: A private item that cannot be read refuses, and one that does not exist is skipped**
  Given a fake git repository whose configuration file is corrupt, so git exits with an error when asked for the user name
  When the scan checks a text with no hit
  Then it is refused, naming the git user name as an item that could not be read
  And the refusal holds neither git's error text nor any path
  And when git cannot be run at all, the scan refuses in the same way and names git
  And, given instead a project folder outside any git repository, with no git user name and no e-mail in any configuration the scan reads, the scan passes a text with no hit and still refuses a text holding a path

### Credentials

- [ ] **Scenario: Every credential the existing scanner finds is refused**
  Given, for each credential type in the existing scanner's list (`SECRET_TYPES`, `src/lib/secrets-scanner.js:56-90`), a sample that the existing `SecretsScanner.scanContent` itself reports on a plain line
  When the scan checks a description holding that sample
  Then it is refused, naming the kind as a credential together with the scanner's name for its type, and the line
  And the test fails when a type in that list has no sample

- [ ] **Scenario: A credential on a heading or comment-like line is still refused**
  Given a GitHub token sample on a body line that starts, one at a time, with `#`, `//`, `--`, `;`, `%`, `<!--` and `*`
  And an unquoted assignment to a name ending in `_KEY` that the existing scanner reports when the line has nothing in front of it, placed on a line that starts with `#`
  When the scan checks the text
  Then each is refused, with its line

- [ ] **Scenario: Findings of every severity block**
  Given a description holding a JSON Web Token sample, which the existing scanner reports at severity LOW (`src/lib/secrets-scanner.js:80`)
  When the scan checks it
  Then it is refused, naming a credential and the line

### The refusal, and no way to switch a check off

- [ ] **Scenario: Every hit is reported by kind and place, and no item is repeated**
  Given a title holding the project folder name
  And a body whose line 2 holds the git e-mail
  And whose line 5 holds a GitHub token sample and `src/billing/invoice.ts`
  When the scan checks the title and body
  Then the refusal lists exactly these, each once:
  - project folder name, in the title;
  - git e-mail and e-mail address, on line 2;
  - credential (GitHub Token) and path outside CTOC's files, on line 5.

  And no text the scan returns holds the project folder name, the git e-mail, the path, the token, or the existing scanner's redacted form of the token

- [ ] **Scenario: The scan writes nothing, prints nothing and calls no network**
  Given these replaced by functions that fail the test when called:
  - Node.js's file-writing functions;
  - the console's output functions;
  - Node.js's network functions: `fetch`, and the request, connect and lookup functions of `http`, `https`, `net`, `tls` and `dns`.

  When the scan checks a text with hits, and a text with none
  Then both checks return their verdicts, and none of the replaced functions was called

- [ ] **Scenario: No setting, argument or environment variable switches a check off**
  Given the project's settings file with every toggle of every category off, "Redact secrets in logs" included (`src/lib/settings.js:104`)
  And the scan called with an extra argument holding `detectHighEntropy: false`, an `excludes` list and a `skip: true` flag
  And these environment variables set:
  - `CI=true` and `NO_COLOR=1`;
  - a variable named `CTOC_SKIP_SCAN`, set to `1`;
  - `HOME` and `USERPROFILE`, pointed at an empty folder.

  And the git user name and e-mail set only in git's global configuration under the home folder that the account record names
  When the scan checks a text holding one hit of every kind, one per line, with the home folder from the account record and that git user name and e-mail among them
  Then the scan reports the same findings it reports without any of them
  And the menu's settings screen lists no setting that names the scan or any of its checks

## Scope

### In Scope
- **Gathering the private items of this machine and project,** each from its own source. (Scenarios: each private item is found; a private item that cannot be read refuses.) The items are:
  - the account name and the home folder, from the operating system. The home folder is read both the way Node.js resolves it and from the account record;
  - the git user name and e-mail, as git itself resolves them for the project, and as git's global configuration under the account record's home folder holds them;
  - the project folder name and the repository's top-level folder name;
  - the owner and repository names in each of the repository's remote addresses.
- **Finding them anywhere in the title and body,** CTOC-written lines included. A match holds in any letter case and with either path separator. Accented letters are compared after both sides are brought to one Unicode form. (Scenarios: each private item is found; a private name that is also one of CTOC's own words still blocks.)
- **Refusing every path and address that is not one of CTOC's own files.** This covers Windows, macOS and Linux shapes, bare file names, web addresses and e-mail addresses. (Scenario: paths and addresses that are not CTOC's own files are refused.)
  - Only one form passes: a repository-relative path with forward slashes that names a file or folder in the running CTOC copy, in its exact letter case.
- **Credentials through the existing `SecretsScanner`, unchanged.** Every finding blocks, whatever its severity. The check covers every line, headings and comment-like lines included. (Scenarios: every credential the existing scanner finds is refused; a credential on a heading or comment-like line is still refused; findings of every severity block.)
- **The refusal.** Each hit is reported once per kind and place: the title, or a body line number. The refusal never repeats the item, its redacted form or an error text. (Scenario: every hit is reported by kind and place.)
- **Failing closed.** An item that cannot be read refuses; an item that does not exist is skipped. (Scenario: a private item that cannot be read refuses.)
- **No side effects:** no file written, nothing printed, no network call. (Scenario: the scan writes nothing, prints nothing and calls no network.)
- **No off switch:** no setting, argument or environment variable switches a check off. (Scenario: no setting, argument or environment variable switches a check off.)
- **A clean request passes.** A request made only of CTOC's own facts and plain words gives no finding. (Scenario: a request holding only CTOC's own facts and plain words passes.)

### Out of Scope
- **Lives in the sibling stub "The user sees the full request and opens it on GitHub":**
  - running this scan on the final text before anything is shown as ready;
  - letting the human edit the description;
  - what the screen says about each hit;
  - the fake-project marker test and the byte-for-byte test over the full route.
- **Lives in the sibling stub "CTOC quietly drafts a request for each friction it meets":** reducing a CTOC message to its template, and writing the title.
- **Lives in the sibling stub "A request holds only the allowed facts and a fingerprint":** checking each field's shape and refusing fields outside the owner's list. This scan checks the text whatever the format has already checked.
- **Changes to `src/lib/secrets-scanner.js`. Not planned.**
  - **Read:** the quality agent uses this scanner (`src/lib/quality-agent.js:58`), so a change there changes a quality check.
  - Hook or gate logic changes only with the owner's explicit approval.
- **Names this machine and project hold no record of. Not on the vision's scan list.** These are:
  - a client or product name typed into the description;
  - the names of the folders above the project;
  - the machine's own name;
  - GitHub accounts mentioned with `@`.

  The human's full preview in the showing stub covers them. Adding any of them to the scan is the owner's decision.

## Risks

### Technical Risks
- **A credential hides on a heading or comment-like line.**
  - **Read:** the existing scanner drops pattern matches on lines that start with `#`, `//`, `--`, `;` or `%`, unless the file name it is given contains `.env` (`src/lib/secrets-scanner.js:825-842`, `:908`).
  - Its check for unquoted assignments skips such lines always (`:1043`).
  - Likelihood: HIGH. A request is Markdown, and a Markdown heading starts with `#`.
  - Impact: HIGH
  - Mitigation: Test a credential on a line starting with each of those markers, plus `*` and `<!--`, and require a refusal.
- **A caller switches part of the credential check off.** **Read:** the scanner's constructor spreads the caller's options over its defaults (`:446`), and `detectHighEntropy: false` skips a check (`:953`).
  - Likelihood: MEDIUM
  - Impact: HIGH
  - Mitigation: Construct the scanner with no options inside the scan, and test that an extra argument to the scan changes no finding.
- **Verdicts differ by platform.** Two causes, neither checked on this machine:
  - macOS and Windows file systems usually ignore letter case, so a check that a path exists can pass a name that Linux refuses;
  - macOS can return folder names with accents in decomposed form.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Compare a path against the exact names listed in the running CTOC copy, bring both sides of every name comparison to one Unicode form, and test the path shapes of all three platforms as strings on every platform.
- **Node.js takes the home folder from an environment variable.** Believed from Node.js's documentation, not checked in this pass:
  - `os.homedir()` prefers the `HOME` or `USERPROFILE` variable;
  - `os.userInfo()` reads the account record, and it throws when the account has no name.
  - Likelihood: MEDIUM
  - Impact: MEDIUM. The path rule refuses every absolute path anyway, so a missed home folder can still not leave as a path. What could be missed is the folder's bare name.
  - Mitigation: Read the home folder from both sources. Read git's global configuration under the home folder from the account record as well. Test with `HOME` and `USERPROFILE` pointed at another folder.

### Business Risks
- **A private name the machine has no record of passes.** A client or product name typed into the description, or held in a folder above the project, matches no gathered item and no shape. The vision names this as its key risk.
  - Likelihood: MEDIUM
  - Impact: HIGH. A posted issue cannot be recalled.
  - Mitigation: Show the complete text to the human before anything opens, which the showing stub does, and keep the CTOC-written part of a request to the format's closed field set.
- **The scan blocks so often that users give up on the route.**
  - The strict path rule refuses `and/or`, `Node.js`, host names and every web address.
  - A private name that is also one of CTOC's own words blocks every request whose CTOC-written lines hold that word, and the human cannot edit those lines. An example is an account named `node` in a container image.
  - No data: how many projects or accounts carry such names is unknown.
  - Likelihood: MEDIUM
  - Impact: MEDIUM. Nothing leaks, but the human cannot send that request.
  - Mitigation: Review the format's marker text and field names against common account names (`node`, `root`, `user`, `admin`) in the format's implementation plan. Name the kind and place in every refusal, so the human sees why.

### Dependency Risks
- **No live caller of its own.** **Read:** the reachability fence counts files no human can reach as debt that may only shrink (`docs/FENCES.md:155-176`).
  - Likelihood: HIGH
  - Impact: MEDIUM
  - Mitigation: Plan the scan's module in the same implementation chain as the first story of the sibling stub "The user sees the full request and opens it on GitHub". The change that adds the module then also adds its first live caller.
- **The format's own text trips the scan.** If the format's marker line, field syntax or placeholder held a slash, a backslash or a file-name shape, every request would block itself. The exact marker text and placeholder belong to the format's planner.
  - Likelihood: LOW
  - Impact: HIGH. No request could be sent.
  - Mitigation: Test, in the showing stub's walking skeleton, that a request the format writes in a fake project with distinctive names passes this scan.
- **CTOC's own message templates trip the scan.** A template that keeps a word such as `Node.js`, or a path, blocks every request for that friction.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test every template the drafting stub produces against this scan, in that stub's tests.
- **A new library file moves a documented count.** **Read:** a build that creates a counted file must declare `CLAUDE.md` (`src/lib/documented-counts.js:4-5`).
  - Likelihood: HIGH
  - Impact: LOW
  - Mitigation: Declare `CLAUDE.md` in the implementation plan's files.
- **Cross-platform proof without GitHub Actions.** Whether a Windows or Linux machine runs the suite before a push was not checked.
  - Likelihood: MEDIUM
  - Impact: MEDIUM
  - Mitigation: Test every path shape of the three platforms as a string on every platform.

## Priority

**Priority: HIGH** (Score: 8/9)
- Dependency: 3. The showing and sending stub depends on it directly, and every route that opens a request depends on it through that stub.
- Business Impact: 3. It carries the owner's rule that no personal or client data leaves a user's machine, and it is the main guard against the vision's key risk.
- Technical Risk: 2. It uses no new technology. The scanner's gaps with comment-like lines and caller options, and the path shapes of three platforms, are moderate.

## Decisions Taken Under Ambiguity

- **One question goes to the owner: how a private name is matched.** It is the algorithm at the centre of this check, and a wrong choice either lets a name pass or blocks users for no reason.
  - The acceptance criteria follow the recommended answer: whole words.
  - If he picks matching inside words, one line changes: in the scenario "each private item is found", a marker glued in lower case to a different word becomes a hit.
- **The scan checks the whole title and body.** No region is exempt, CTOC-written lines included, and the message template is checked like any free text, whatever the format decides about templates. This follows the vision's rule that the scan checks all of the text.
- **A private name that is also one of CTOC's own words is still a hit.**
  - Exempting it would let a gathered item pass, and that is a risk only the owner can accept.
  - The cost falls on usability, not privacy, and it is named under Risks.
- **Every finding of the existing scanner blocks, whatever its severity.**
  - The vision says every credential the scanner recognises is refused, and that any hit blocks.
  - **Read:** the quality check's rule that LOW findings do not block (`src/lib/secrets-scanner.js:83-89`) was written for source files, not for a public issue.
  - The format sibling already requires zero findings of any severity on the text it writes.
- **The existing scanner is reused unchanged.**
  - The scan constructs it with no options.
  - The scan works around the scanner's handling of comment-like lines; it does not change the scanner, because the scanner feeds a quality check.
  - How it works around them is the implementation plan's choice.
- **Which items are gathered, and from where.**
  - The account name and the home folder come from the operating system. The home folder is read both the way Node.js resolves it and from the account record; when the two differ, both are items.
  - The git user name and e-mail are gathered from two places, and every value found is an item:
    - the ones git itself resolves for the project;
    - the ones in git's global configuration files under the home folder read from the account record.
  - The second place exists because git finds its global configuration through `HOME` and its own environment variables. Without it, pointing `HOME` elsewhere would hide the identity from the scan. The scan reads no environment variable of its own.
  - In the tests, a fake account record stands in for the operating system's, so that no test touches the real home folder's git configuration. The operating system is an outside dependency, so this is not a mock of the scan's own logic.
  - The project's names are:
    - the project folder name;
    - the repository's top-level folder name, which differs when the project sits inside a larger repository;
    - the owner and repository names in each remote address.
  - The owner name is added because the vision lists git remotes and account names among what never leaves.
  - The folders above the project are not items.
    - Common parent names such as `Code` or `projects` would block everyday words.
    - A client name in a parent folder still cannot leave as part of a path.
- **Absent and unreadable are different.**
  - An item is absent when its source answers that there is none: no git user name configured, no remote, or no git repository. An absent item is skipped.
  - Every other failure refuses, and names the kind of item that could not be read, never the error text. Examples are git exiting with an error, git not running at all, and the operating system raising an error.
  - Not checked: how Node.js reports an account with no name on each platform. The implementation plan checks it and applies this rule.
- **What counts as a path or an address.** A token is a run of characters between spaces, with surrounding quotes, brackets and trailing punctuation removed. A token counts when any of these holds:
  - it contains `/` or `\`;
  - it starts with a drive letter and a colon, or with `~`;
  - it contains `://`;
  - it contains `@` with text on both sides;
  - it ends in a file-name extension: a full stop and one to ten letters or digits, at least one of them a letter, after at least two characters. So `e.g.` does not count, and `invoice.ts` does.

  A token holding no letter, such as a date or a fraction, does not count. A token with `@` and text on both sides is reported as an e-mail address only, never also as a path, even when it ends like a file name.
- **What passes as one of CTOC's own files.**
  - Only one form passes: a repository-relative path with forward slashes, with no `.` or `..` segment and no leading slash, that names a file or folder in the running CTOC copy, in its exact letter case.
  - Every absolute path is refused, including one into the CTOC copy, because that copy lives under the user's home folder.
  - Every web address is refused, including the public CTOC repository's own address. An exception for an address prefix would be a door: a prefix check passes any longer name that starts the same way. A repository-relative path says the same thing.
  - The cost is that `and/or`, `Node.js` and host names are refused, and the human rewords them.
  - The exact token rules are the implementation plan's, within these limits.
- **How names are compared.**
  - Both the text and the name are first brought to the composed Unicode form.
  - Under the recommended answer to the open question, both are then split into words twice, on their original letter case:
    - a coarse split, at every character that is not a letter or a digit;
    - a fine split, which also splits at a change from lower case to upper case and between letters and digits.
  - Only then is letter case folded, without locale rules.
  - A name is a hit when either of these holds:
    - its fine words appear in the text's fine words as the same consecutive sequence;
    - the name with every separator removed equals one whole coarse word of the text.
  - So a project folder `acme` is found in `ACME`, `(acme).`, `AcmeBilling` and `acme_2024`. A folder `MyClient` is found in `my client`, `my-client` and `myclient`, and a folder `acme-billing` in `acmebilling`.
  - A name glued in lower case to a different word is not a hit: `acmecorp` for `acme`, or `myclientportal` for `MyClient`. That is the case the open question decides.
  - A git user name of several words matches only as its whole sequence, not word by word.
- **How a hit is reported.**
  - There is one finding per kind per place. The place is the title, or a body line number counted from 1. Lines split at a line feed, and a carriage return before the line feed is ignored.
  - The kinds are: home folder, account name, git user name, git e-mail, project folder name, repository name, repository owner, path outside CTOC's files, e-mail address, credential (with the scanner's name for its type), and could not read (with the kind of item).
  - The exact wording is the implementation plan's.
- **The scan returns its verdict and does nothing else.** It writes nothing and prints nothing, and its caller shows the refusal. So no log can keep a copy, whatever the "Redact secrets in logs" setting says.
- **No off switch.**
  - The scan takes the title, the body and the project folder, and ignores any other argument.
  - No setting is added.
- **Credential samples in the tests are put together at run time.** The repository then holds no literal credential, and CTOC's own secret check before a push stays clean.
- **Five decomposition stories became three.**
  - The agent's limit is three stories per stub.
  - The stories on the user's own items and on paths and e-mail addresses are one story here.
  - The stories on the refusal and on the missing off switch are another.
- **No dependency on the format.**
  - The scan reads a title and a body as strings, and it parses no request block, so `depends_on` stays `none`.
  - The decomposition's condition for this holds: the format sibling writes the fingerprint in lowercase hexadecimal.
- **Wiring.** The first live caller is the sibling stub "The user sees the full request and opens it on GitHub". This is a technical constraint on what ships with what. The owner alone chooses when it is built.
- **Overlap check.**
  - The five sibling stubs were read. None defines a privacy scan.
  - Each boundary is named under "Out of Scope".
- **Searches run in this pass.**
  - Pattern `require\([^)]*secrets-scanner` over the repository, leaving out `node_modules/` and `.claude/`, matched 9 files.
    - One file is under `src/`: `src/lib/quality-agent.js`.
    - The other eight are under `tests/`, `tests/compaction-eval/score.js` included.
  - Pattern `userInfo\(|os\.homedir\(|user\.email|user\.name` over `src/` matched 7 lines in 5 files. All seven mention `os.homedir()`, three of them in comments. No line matched `userInfo(`, `user.name` or `user.email`.
    - A text search cannot show that no code gathers a git identity in some other way. That was not checked.
  - Pattern `CLAUDE_PLUGIN_ROOT` over `src/` matched 8 files. Only `src/lib/reachability.js` was opened. How the running CTOC copy finds its own folder is the implementation plan's to trace.
- **Read in this pass (version 6.14.134):**
  - `src/lib/secrets-scanner.js:33-39`, `:56-90`, `:96-288`, `:420-451`, `:620-858`, `:860-1104`, `:1536-1544`;
  - `src/lib/init-project.js:570-659`;
  - `src/lib/settings.js:1-90`, `:97-107`;
  - `src/lib/plan-validator.js:1745-1756`;
  - `src/lib/documented-counts.js:1-12`;
  - `src/commands/update.js:12-19`;
  - `docs/FENCES.md:150-184`;
  - `VERSION`.
- **Untrusted text.** No instruction in the vision, the decomposition or the sibling stubs was acted on. None asked for anything outside this refinement.
