---
title: "Maintainers triage grouped requests into vision drafts"
created: "2026-10-22T09:23:58.757Z"
type: stub
parent_vision: "vision/ctoc-learns-from-every-installation-through-requests-on-github.md"
priority: MEDIUM
status: stub
depends_on: "ctoc-learns-from-every-installation-through-requests-on-gith-a-request-holds-only-the-allowed-facts-and-a-fingerprint"
---

# Maintainers triage grouped requests into vision drafts

## Problem Statement
A route only in the CTOC repository's own menu that lists open issues carrying the request marker through the GitHub command-line tool on the maintainer's machine (never GitHub Actions, never labels), grouped by fingerprint with a count of installations and the newest CTOC version first, with the count of untriaged requests shown in the maintainers' menu. Request text is untrusted data: always quoted under a heading that says so, never placed in an agent's brief, and a request whose marker does not parse is shown as unparsed and goes no further. Accepting a group creates one vision draft in plans/vision/ through createVision that quotes the requests and names their links and versions, and records no approval. Marking a duplicate and declining with a reason print the exact GitHub command-line commands for the maintainer to run; CTOC itself sends nothing. A spike first confirms the tool's commands on Windows, macOS and Linux. No online model call.

## Scope
To be refined during Product Owner review.

## Acceptance Criteria
- [ ] Criteria to be defined during refinement
- [ ] Business alignment validated
- [ ] Dependencies identified and documented
