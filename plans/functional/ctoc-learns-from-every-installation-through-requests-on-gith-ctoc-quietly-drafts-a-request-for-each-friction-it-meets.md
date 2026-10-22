---
title: "CTOC quietly drafts a request for each friction it meets"
created: "2026-10-22T09:23:58.757Z"
type: stub
parent_vision: "vision/ctoc-learns-from-every-installation-through-requests-on-github.md"
priority: MEDIUM
status: stub
depends_on: "ctoc-learns-from-every-installation-through-requests-on-gith-a-request-holds-only-the-allowed-facts-and-a-fingerprint"
---

# CTOC quietly drafts a request for each friction it meets

## Problem Statement
Noticing and drafting on every installation: a setting in the learning category, on by default, switches both off; the existing 'Auto-publish learnings' setting is traced by real analysis and removed or relabelled so the settings screen never claims CTOC publishes on its own. A friction with CTOC (a menu route that refused or failed, a check that refused a plan, an agent that could not finish its step, a hook that refused, or a session's by-hand workaround recorded through a menu route) is recorded with only CTOC's own facts, its printed message reduced to a template with placeholders, and turned into a draft in the request format with its fingerprint, kept in a git-ignored folder under .ctoc/. The menu shows one line with the number of drafts, never a question box, and a draft can be read locally but never leaves on its own. The walking skeleton is the check-before-build-queue refusal at src/lib/plan-validator.js:1751; recording in hook or gate code needs the owner's explicit approval. No online model call; Windows, macOS and Linux.

## Scope
To be refined during Product Owner review.

## Acceptance Criteria
- [ ] Criteria to be defined during refinement
- [ ] Business alignment validated
- [ ] Dependencies identified and documented
