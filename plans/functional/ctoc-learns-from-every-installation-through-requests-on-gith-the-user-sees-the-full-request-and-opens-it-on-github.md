---
title: "The user sees the full request and opens it on GitHub"
created: "2026-10-22T09:23:58.757Z"
type: stub
parent_vision: "vision/ctoc-learns-from-every-installation-through-requests-on-github.md"
priority: MEDIUM
status: stub
depends_on: "ctoc-learns-from-every-installation-through-requests-on-gith-a-blocking-scan-stops-any-request-carrying-private-data, ctoc-learns-from-every-installation-through-requests-on-gith-ctoc-quietly-drafts-a-request-for-each-friction-it-meets"
---

# The user sees the full request and opens it on GitHub

## Problem Statement
Showing and sending, issues only: the user writes or edits a draft's description (a proposed fix travels as text), the blocking scan runs on the whole final text, and the menu shows the complete request exactly as it will reach GitHub, names github.com/robotijn/ctoc, and says it is public under the account that submits it. On the user's explicit choice for that one request, CTOC opens GitHub's own new-issue page filled in with exactly the shown text (open on macOS, xdg-open on Linux, a single-argument launcher on Windows, never through a shell), or prints the address when no browser opens; the user presses Submit. CTOC holds no token, contains no code that sends, and offers no batch or automatic send. A spike first measures the longest filled-in address GitHub accepts. Proven by the byte-for-byte test and the fake-project marker test across Windows, macOS and Linux path shapes. No online model call.

## Scope
To be refined during Product Owner review.

## Acceptance Criteria
- [ ] Criteria to be defined during refinement
- [ ] Business alignment validated
- [ ] Dependencies identified and documented
