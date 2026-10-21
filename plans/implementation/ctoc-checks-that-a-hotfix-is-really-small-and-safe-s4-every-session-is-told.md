---
title: "The CTO Chief judges every fix for the hotfix fast path, and every session is told how it runs"
type: implementation
created: 2026-10-07
priority: high
effort: medium
parent_plan: ctoc-checks-that-a-hotfix-is-really-small-and-safe
depends_on: ctoc-checks-that-a-hotfix-is-really-small-and-safe-s3-urgent-changes-and-their-review
files:
  - agents/coordinator/cto-chief.md
  - tests/compaction-eval/cto-chief/rule-inventory.json
  - tests/cto-chief-compaction.test.js
  - src/commands/start.md
  - .ctoc/templates/operating-lessons.md
  - CLAUDE.md
  - .ctoc/templates/CLAUDE.md.template
  - src/lib/ctoc-routing-reminder.js
  - src/lib/escape-phrases.js
  - tests/hotfix-fast-path-is-instructed.test.js
  # CLAUDE.md is real work here (lesson 3 and the escape-phrase sentence) and also the
  # ratchet: this slice creates a test file, which moves the test-file counts in CLAUDE.md.
---

# The CTO Chief judges every fix for the hotfix fast path, and every session is told how it runs

Slice 4 of 4 of `plans/functional/ctoc-checks-that-a-hotfix-is-really-small-and-safe.md`: the
instructions. Slices 1 to 3 build the check, the hook rule and the urgent path. This slice
makes the CTO Chief judge every fix or small change on its own and tells every session when to
run the check, how to read its answers, and how to write the commit the hook accepts. Amended
on 2026-10-08 for the owner's requirement below, and again on 2026-10-08 so that every
commit command it teaches is slice 1's form, `git --literal-pathspecs commit --only -m '…' --
<files>`, staged by `git --literal-pathspecs add -- <files>`.

## The owner's requirement (2026-10-08)

> "is the hotfix agent implemented? the CTO chief should always check whehter a fix can be a hotfix t ospeed up development or not"

Until then this slice told sessions to run the check only when the owner said "hotfix", "quick
fix", "trivial fix", "trivial change" or "urgent". Now the CTO Chief judges every request to
fix or change something small itself, without being told and without asking him: what can be a
hotfix takes the fast path (no plan, the edit, `hotfix check`, a `hotfix:` commit); what cannot
goes through a normal plan, with one plain sentence saying why. The check, its sentences, the
hook rule and the emergency path stay as slices 1 to 3 build them; the escape words still work
as before.

## Problem statement

CTOC's hooks stay hidden, so the only things that reach a session are the instructions it
reads: the CTO Chief's own file (`agents/coordinator/cto-chief.md`, the coordinator the session
acts as when it dispatches), the instruction file every session reads in a CTOC project (its
`CLAUDE.md`, whose managed lessons block CTOC refreshes from
`.ctoc/templates/operating-lessons.md` on `/ctoc:update`) and the menu's instruction file
(`src/commands/start.md`). Today none of them asks whether a fix can be a hotfix: the CTO Chief
mentions escape phrases only as a reason to skip the Step 6.5 threat model, the template's
"Escape Hatches" line says the words skip planning, CTOC's own `CLAUDE.md` lists the seven
phrases without saying what they do, and the routing reminder still says "let the human type an
escape phrase" as if the phrase were the end of it. So the fast path exists only when the owner
remembers a word. Slice 2's hook refuses a labelled commit it cannot read exactly — including
Claude Code's habitual heredoc commit — so a session that is not told the
`git --literal-pathspecs commit --only -m '…' -- …` form will be refused until it learns it
from the refusal.

## Technical approach

### Where the judgement happens

Three surfaces say the same thing at three depths: the CTO Chief in full, the menu's
instructions in full with the route details, and lesson 3 in one sentence, because the lessons
block is the only one every session reads even when neither the menu nor the CTO Chief was
loaded. No new code: the prediction is the instructions' list of what qualifies, and the check
of slice 1 judges the actual edit (functional plan, decision 20).

### `agents/coordinator/cto-chief.md`

**A new section, inserted immediately before `## Iron Loop Step Delegation (Steps 1 through
16)`,** word for word (one order per sentence, N-301 to N-305 in this order):

```markdown
## Fixes and small changes — the hotfix fast path

Judge every request to fix or change something small yourself, without being told and without asking the human: can it be a hotfix? It can only when it changes nothing but documentation, visible text in web page markup, message-catalogue values or colours in stylesheets, in at most 3 files and 20 changed lines, with no sensitive word of the hotfix check in any path, no test file and no file a build in progress declares.

When it plausibly can, take the fast path with no plan: make the edit, run the menu's `hotfix check` naming every file you changed, and commit only what it passes with the two commands it answers, `git --literal-pathspecs add -- <files>` and then `git --literal-pathspecs commit --only -m 'hotfix: <what changed>' -- <files>` — the human asked for these commits on 2026-10-08. When it cannot, or the check refuses it, it goes through a normal plan, any edit stays in place uncommitted, and the human reads one plain sentence saying why: the check's own sentence when it refused.

Your prediction never replaces the check, and you never declare an emergency change yourself: when the human says "hotfix", "quick fix", "trivial fix", "trivial change" or "urgent", make the edit and run the check whatever you predicted, adding `--urgent` only for "urgent"; "skip planning" and "skip iron loop" stay his explicit order and are never judged.
```

**Two existing sentences are replaced in place**, because they tie skipping the Step 6.5
threat model to the escape words, which since 2026-10-08 no longer decide anything by
themselves.

R-185, in Step 6.5 — old, then new:

```text
Conditional skip: micro-mode (escape phrases "hotfix", "quick fix", "trivial change", "trivial fix", "urgent", "skip planning", "skip iron loop") skips this step.
Conditional skip: a change made with no plan — a hotfix the check passed, an emergency change, or the human's "skip planning" or "skip iron loop" — has no Step 6.5.
```

R-452, in Step Label Enforcement — old, then new:

```text
Step 6.5 THREAT MODEL is a sub-step between Step 6 DESIGN and Step 7 SPEC; it is not required for trivial changes (escape phrases skip it).
Step 6.5 THREAT MODEL is a sub-step between Step 6 DESIGN and Step 7 SPEC; a change made with no plan (see "Fixes and small changes — the hotfix fast path") has none.
```

No other text of the file changes.

### Its compaction inventory

`tests/compaction-eval/cto-chief/rule-inventory.json`, following
`tests/compaction-eval/inventory-checks.js` exactly:

- Units 185 and 452 (they carry R-185 and R-452): `fate` `kept` → `replaced`.
- Orders R-185 and R-452: `fate: "replaced"` and `replaced_by: { instruction, date:
  "2026-10-08", plan: "ctoc-checks-that-a-hotfix-is-really-small-and-safe-s4-every-session-is-told",
  new_anchors: [<the new sentence above, word for word>] }`; their old `anchors` stay as
  history.
- Orders N-301 to N-305 appended to `orders`, each `{ id, says (at most 160 characters), now_in:
  "## Fixes and small changes — the hotfix fast path", anchors: [<its sentence, word for word>],
  pinned_by: null, wire: false, fate: "added", added_by: { instruction, date: "2026-10-08",
  plan: <this slice> } }`.
- `instruction` in every record is the owner's words of 2026-10-08, verbatim as quoted above.
- `maxBytes` rises to the agent's measured size after the edit, recorded as one
  `ceiling_corrections` entry `{ date: "2026-10-08", from, to, reason: "the hotfix fast path
  section and the two Step 6.5 sentences (plan
  ctoc-checks-that-a-hotfix-is-really-small-and-safe-s4-every-session-is-told); measured overage
  <n> bytes" }`.

`tests/cto-chief-compaction.test.js`: `ORDER_FLOOR` 439 → 444, so dropping one of the five new
orders fails check 7 as well as check 4.

### `src/commands/start.md` (the menu's instruction file)

- The Navigation Commands table gains the routes: `hotfix check [--urgent] [{file} …]` (the
  check, instant), `hotfix check [--urgent] --run-tests {file} …` (the test run — the `next` of
  a `checking` answer; background shell work), `hotfix go-ahead {binding} {file} …` and
  `hotfix decline` (the owner's two answers to the stored-data question — run only as his
  chosen action), `hotfix review {binding} keep|replan` (the owner's answer to an emergency
  review — run only as his chosen action).
- The NAV classification list gains `hotfix`; the `--run-tests` call is run as a background
  shell command (`run_in_background`, lesson 20), not as an agent and not as a task.
- A new section after "Interactive work — async with documented choices", word for word apart
  from line wrapping:

```markdown
### Fixes and small changes — the hotfix fast path

Judge every request to fix or change something small yourself — without being told, and without asking the human — before you touch a file: can it be a hotfix? It can only when it changes nothing but documentation, visible text in web page markup, message-catalogue values or colours in stylesheets; in at most 3 files and 20 changed lines; with no sensitive word of the check in any path (auth, login, session, token, secret, password, permission, role, admin, payment, billing, checkout, price, invoice, tax, legal, terms, privacy, consent, cookie, license, migration, schema, database, sql, deploy, workflow, ci, and the rest of the list in `src/lib/hotfix-check.js`); no test file; and no file a build in progress declares (see `tasks`). Your prediction never replaces the check.

1. **It plausibly can** → the fast path, no plan: make the edit, then run `node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" hotfix check` naming every file you changed.
2. **It plainly cannot** → no edit: tell the human "I did not treat this as a hotfix because <reason>; it goes through a normal plan." — the reason being the check's clause for that kind of change, naming the file when you know it — and start a normal plan through `claude:create-plan functional`.
3. **The human's own words** → "hotfix", "quick fix", "trivial fix" or "trivial change": make the edit and run the check whatever you predicted. "urgent": the same with `--urgent`, the only way `--urgent` is ever added. "skip planning" and "skip iron loop": his explicit order, never checked.
4. `verdict: 'checking'` → show its `text` as the one status line, run its `next` the same way as a background shell command, and act on that answer when it finishes.
5. `verdict: 'hotfix'` or `'emergency'` → show `text` when it is not empty; run `commit.add` (`git --literal-pathspecs add -- …`); then run `commit.message` with `<what changed>` replaced by what changed, in the human's words: `git --literal-pathspecs commit --only -m 'hotfix: <what changed>' -- …` (`emergency:` for an emergency) — plain quotes, double quotes when the message holds an apostrophe, no `$`, backtick or backslash, never a heredoc, nothing else in the command. Do not ask first: the human asked for these commits on 2026-10-08. Then one status line naming the commit. Pushing stays his decision.
6. `verdict: 'refused'` → show `text` exactly; commit nothing; never revert, stash or delete the edit; start a normal plan for the request through `claude:create-plan functional`, with priority HIGH when the human said "urgent".
7. `verdict: 'ask'` → pass its `ask` to AskUserQuestion and run the action of the human's choice; never choose for him.
8. A commit refused by CTOC's write protection says what to do; do it.
9. A background agent doing the edit follows the same steps and may run `hotfix check`; it never runs `hotfix go-ahead`, `hotfix decline` or `hotfix review` (the human's answers — the write protection refuses them).
10. Every verdict the check gives is one line of `.ctoc/logs/hotfix-checks.jsonl`; when the human asks how many fixes took the fast path, count its lines by verdict and cause.
```

- No other text in the file changes.

### The lessons block and CTOC's own `CLAUDE.md`

In `.ctoc/templates/operating-lessons.md` and `CLAUDE.md` (the managed lessons block, kept
identical by `tests/claude-md-keeps-every-rule.test.js`), lesson 3 gains one sentence at its
end, after "plan-covered files.", so it reads:

```markdown
3. **Always implement via the Iron Loop** (test first → implement → verify → review). No ad-hoc edits to plan-covered files. Exceptions: "skip planning", "skip iron loop", and a wording or colour fix, committed as `hotfix:` once the menu's `hotfix check` passes it.
```

The old lesson 3 text stays word for word in front of the new sentence, so the rule inventory
(`tests/fixtures/claude-md-rule-inventory.json`, which finds lesson 3 by inclusion) is
unchanged.

In `CLAUDE.md` only, outside the lessons block, this sentence and the one space after it are
removed from the Critical Rules paragraph that begins "Hook or gate logic changes only with the
owner's explicit approval.":

```text
Escape phrases (`src/lib/escape-phrases.js`): "skip planning", "skip iron loop", "quick fix", "trivial fix", "trivial change", "hotfix", "urgent".
```

Hand count, all characters ASCII: the added sentence is 141 bytes with its leading space, the
removed one 147 bytes with its trailing space, so `CLAUDE.md` shrinks by 6 bytes. The removed
sentence is not in the rule inventory and no test reads it.

### `.ctoc/templates/CLAUDE.md.template` (new projects)

The line under "### Escape Hatches" becomes:

```markdown
The owner can skip planning by saying "skip planning" or "skip iron loop". Every other fix is judged: one of only wording or colour is committed as `hotfix:` once CTOC's hotfix check passes it, and anything else is planned.
```

### `src/lib/ctoc-routing-reminder.js`

The directive's two closing lines (`buildRoutingDirective`) become this text, wrapped as the
other lines are:

```text
If this change can be a hotfix (only wording or colour), take the hotfix fast path: make it, run the menu's hotfix check and commit what it passes as hotfix:; anything else goes through a plan. Do not route around the pipeline silently.
```

The module is not loaded today (its hook is unregistered); its text is kept true for when it is.

### `src/lib/escape-phrases.js`

The header comment gains what each phrase means since 2026-10-07 and 2026-10-08: the CTO Chief
judges every fix or small change for the hotfix fast path without any phrase, and CTOC's hotfix
check (`src/lib/hotfix-check.js`, the menu's `hotfix check`) judges the actual change before the
commit; "hotfix", "quick fix", "trivial fix" and "trivial change" make the session run the check
on its edit whatever it predicted; "urgent" does the same with `--urgent` and, when the change is
too big for a hotfix, opens the emergency path; "skip planning" and "skip iron loop" are the
owner's explicit order and are never judged. The list itself does not change.

### Wiring — the live surfaces

The CTO Chief's file is read on every dispatch of the CTO Chief and by the session acting as
the coordinator; `src/commands/start.md` is the file `/ctoc:start` loads; the lessons block
reaches every CTOC project's `CLAUDE.md` through `ensureLessonsBlock` on `/ctoc:update` (and
this repository's own `CLAUDE.md` directly); the template is written by `init-project.js` for a
new project. The fast path's commands are slice 1's route (reached through `menu-screens.route`
from `src/commands/start.js`) and slice 2's loaded hook. The routing reminder and the phrase
list's header carry no live behaviour change.

## Agent rules this slice replaces or adds

The owner's requirement of 2026-10-08 (quoted above) is the instruction for every record. These
are the compaction-inventory orders this slice may mark replaced or added, and no others:

- `agents/coordinator/cto-chief.md` — replaced: R-185, R-452; added: N-301, N-302, N-303, N-304, N-305.

## Acceptance criteria

- [ ] The CTO Chief holds the section "Fixes and small changes — the hotfix fast path" with its
  five sentences word for word, before the Iron Loop Step Delegation section; its two Step 6.5
  sentences read as specified, and the two old sentences are gone.
- [ ] `tests/cto-chief-compaction.test.js` passes all ten checks with R-185 and R-452 replaced,
  N-301 to N-305 added, each record naming this slice and the owner's words of 2026-10-08,
  units 185 and 452 marked replaced, `ORDER_FLOOR` 444, and `maxBytes` raised by exactly the
  measured overage in one recorded correction.
- [ ] `start.md` names every `hotfix` route, classifies `hotfix` as instant and the test run as
  background shell work, and holds the "Fixes and small changes — the hotfix fast path" section.
- [ ] Every `hotfix …` route written in `start.md`'s table, run through `route` in a temporary
  git project, answers something other than the unknown-command answer.
- [ ] Lesson 3 in `.ctoc/templates/operating-lessons.md` and in `CLAUDE.md` ends with the
  exception sentence, the two blocks stay identical, `CLAUDE.md` no longer holds the sentence
  that listed the seven escape phrases, and `CLAUDE.md` stays at or under 15,000 bytes.
- [ ] The template's escape line, the routing directive and the phrase list's header say what
  is specified; `buildReminder` still returns no text for a prompt holding an escape phrase;
  `ESCAPE_PHRASES` is unchanged.
- [ ] One live run in a scratch CTOC project: a fresh session told "the Save button should say
  Store", with no hotfix word, ends at a committed `hotfix:` change without asking the human and
  without being refused by the hook; told "the cart total is off by one when the cart is empty",
  it edits no file and starts a normal plan after one sentence saying why; the check's log then
  holds exactly one `hotfix` line.
- [ ] `npm test` passes: lint, typecheck, all tests (including `tests/menu-protocol.test.js`,
  `tests/claude-md-keeps-every-rule.test.js` and `tests/ctoc-routing-reminder.test.js`
  unchanged), coverage at or above the floor, 0 skipped; CLAUDE.md's test-file counts updated.

## Risks

| Risk | Mitigation |
|---|---|
| `CLAUDE.md` goes over its 15,000-byte limit (29 bytes of room at its last recorded measurement) | It shrinks by 6 bytes by hand count; measured at Steps 9 and 14; if the measured file would exceed the limit the build stops and reports the measured size — it never shortens another rule |
| This slice moves to building on its recorded evidence instead of the human's own approval | Inventory check 3 accepts the replaced and added orders only under a human or backfilled approval of this slice's specification as it stands; Step 8 reads check 3 first and stops if it is red (Decision 9) |
| The CTO Chief sits at its byte ceiling | The ceiling rises only by the measured overage, one recorded correction |
| `plans/implementation/the-manual-and-the-docs-stop-claiming-what-ctoc-no-longer-does.md` edits the same CTO Chief file, its inventory, `start.md` and `CLAUDE.md` | Plans that touch the same file build one at a time; Step 9 reads the files as they then are; whichever builds second keeps the other's text and records, and Step 11 checks it |
| The CTO Chief predicts too eagerly and edits files the check refuses | The prediction names only the four kinds, so an eager guess edits a wording or colour file at worst; the edit stays for the normal plan; the log's refusal counts show the rate |
| A session that never opened the menu reads only the lesson 3 sentence, and may not know where the menu is installed | It plans instead (the conservative failure); slice 2's refusal names the menu's real path; Step 9 records whether `CLAUDE_PLUGIN_ROOT` is set in the build session's shell |
| A session asks before committing, because `CLAUDE.md` says commits wait for an explicit request | The CTO Chief and `start.md` say the human asked for these commits on 2026-10-08; the live run checks that no question is asked |
| A session ignores the instructions and commits a hotfix without the label | The functional plan's residual risk: the hook catches a labelled commit only; the instructions are the mitigation |

## Decisions Taken Under Ambiguity

1. **The judgement lives on three surfaces in one slice**: the CTO Chief, the menu's
   instructions and lesson 3, because a session told by one surface and not another would act
   on whichever it read, and only the lessons block reaches a session that loaded neither of
   the other two.
2. **All menu instructions for the hotfix check land in this slice**, after the three code
   slices, so `start.md` changes once and describes routes that exist.
3. **A fix that plainly cannot be a hotfix, and a refused one, start the normal plan through
   the existing `claude:create-plan functional` flow**, the menu's one way to start a plan from
   a request.
4. **The `git --literal-pathspecs commit --only -m '…' -- …` form is spelled out** (double
   quotes for an apostrophe, never a heredoc), because it is the command slice 1's check
   answers, it commits exactly the checked files whatever else is staged, and slice 2's hook
   refuses any labelled commit it cannot read exactly.
5. **This slice is over the three-file target** (seven instruction files, the CTO Chief's
   inventory and its test, and one new test): each is a sentence, a paragraph or a record on one
   subject, and the inventory must change in the same build as the agent text or its checks
   fail.
6. **Lesson 3 gains one sentence instead of a paragraph of its own**, and CTOC's own
   `CLAUDE.md` drops the sentence that listed the seven escape phrases to pay for it, because
   `CLAUDE.md` had 29 bytes of room. The sentence names the exceptions to "No ad-hoc edits to
   plan-covered files", which is where the fast path belongs; the two skip phrases move into it;
   the five hotfix words, the urgent path and the recipe live in the CTO Chief and `start.md`.
7. **R-185 and R-452 are replaced, and no other order is touched**: they are the only CTO Chief
   sentences that say what the escape words do; every other order stays as it is.
8. **`ORDER_FLOOR` rises to 444** (439 plus the five new orders), so removing a new order later
   fails a second check in a second file.
9. **This slice needs the human's own approval to be built.** Inventory check 3 reads
   `.ctoc/approvals/<this slice>.json` and accepts only a human or backfilled entry matching the
   specification as it stands; a crossing on recorded evidence would leave every new and
   replaced order failing at Step 14.
10. **No new code for the prediction** (functional plan, decision 20): the instructions list
    what qualifies, and the check judges the edit.
11. **The fast path is not taken for a file a build in progress declares**, because the hotfix
    edit and the build would change the same file at once (functional plan, decision 25).
12. **"Do not ask first"** is written into the CTO Chief and `start.md`, because the owner's
    requirement of 2026-10-08 is his explicit request for `hotfix:` commits that the check
    passed, and the general rule says commits wait for one; it covers no other commit, and
    pushing stays his decision.

## Execution Plan

### Step 8: TEST
- [ ] Write `tests/hotfix-fast-path-is-instructed.test.js` (exact presence checks of instruction
  text, and real routes for case 3); each case red today:
  1. `start.md`'s Navigation Commands table holds rows for `hotfix check`, the `--run-tests`
     call, `hotfix go-ahead`, `hotfix decline` and `hotfix review`; the NAV classification list
     names `hotfix`.
  2. `start.md`'s "Fixes and small changes — the hotfix fast path" section holds: judging every
     request without being told or asking; documentation, visible text, message-catalogue
     values, colours, 3 files, 20 changed lines, sensitive word, test file, build in progress;
     "Your prediction never replaces the check."; the not-a-hotfix sentence shape; the five
     words and `--urgent`; that "skip planning" and "skip iron loop" are never checked; `next`,
     `commit.add`, `commit.message`, `git --literal-pathspecs commit --only -m 'hotfix:`,
     `emergency:`, never a heredoc; "Do not ask first"; that a refusal never reverts, stashes or
     deletes the edit; priority HIGH for urgent; that a background agent never runs the three
     answer routes; `.ctoc/logs/hotfix-checks.jsonl`.
  3. Every `hotfix …` route in that table, with placeholders filled for a temporary git project
     (a changed `README.md`; a 64-character binding), run through `route` answers without
     `ok: false`.
  4. Lesson 3 in the lessons block of `.ctoc/templates/operating-lessons.md` ends with the
     exception sentence word for word (whitespace aside); `CLAUDE.md` no longer holds the text
     `Escape phrases (`.
  5. `.ctoc/templates/CLAUDE.md.template`'s escape line is the new sentence.
  6. `buildRoutingDirective()` holds the new closing sentence; guard: `buildReminder` for a
     prompt holding "hotfix" still returns `reason: 'escape-phrase'` and no text.
  7. The text of `src/lib/escape-phrases.js` holds the meaning of each of the seven phrases as
     specified, and `ESCAPE_PHRASES` is unchanged (guard).
- [ ] Write the inventory records (units 185 and 452, R-185, R-452, N-301 to N-305) and raise
  `ORDER_FLOOR` to 444; run `node --test tests/cto-chief-compaction.test.js`: checks 4, 8 and 10
  red for the new and replaced anchors, check 3 green. A red check 3 means this slice was not
  approved by the human as it stands: stop and report (Decision 9).
- [ ] Run the new test file: every non-guard case red.

### Step 9: PREPARE
- [ ] Measure `CLAUDE.md` and the CTO Chief in bytes, and read the CTO Chief's `maxBytes`;
  confirm the hand count (`CLAUDE.md` 6 bytes smaller); if `CLAUDE.md` would exceed 15,000,
  stop and report the measured size.
- [ ] Read the then-current `agents/coordinator/cto-chief.md`, its inventory, `start.md`,
  `CLAUDE.md` and the lessons template (the plan
  `the-manual-and-the-docs-stop-claiming-what-ctoc-no-longer-does.md` may have changed them),
  and `tests/menu-protocol.test.js`'s pinned phrases.
- [ ] Record whether `CLAUDE_PLUGIN_ROOT` is set in this session's shell
  (`node -e "console.log(process.env.CLAUDE_PLUGIN_ROOT ? 'set' : 'not set')"`), quoted in the
  build record.

### Step 10: IMPLEMENT
- [ ] `agents/coordinator/cto-chief.md`: the new section and the two Step 6.5 sentences.
- [ ] `tests/compaction-eval/cto-chief/rule-inventory.json`: the measured `maxBytes` and its
  one correction (the records were written at Step 8).
- [ ] `src/commands/start.md`: the table rows, the classification, the section.
- [ ] `.ctoc/templates/operating-lessons.md` and `CLAUDE.md`: the lesson 3 sentence, identical
  in both; in `CLAUDE.md` the escape-phrase sentence removed and the test-file counts updated.
- [ ] `.ctoc/templates/CLAUDE.md.template`: the escape line.
- [ ] `src/lib/ctoc-routing-reminder.js`: the closing sentence of the directive.
- [ ] `src/lib/escape-phrases.js`: the header paragraph.

### Step 11: REVIEW
- [ ] The critic reads the instructions as a session would, on a fresh project, and follows
  them for: a wording fix with no hotfix word, a logic fix with no hotfix word, a predicted
  wording fix the check refuses (a price), an urgent emergency change, a stored-data change and
  "skip planning"; any step it cannot carry out from the text alone is a finding. It checks that
  the CTO Chief, `start.md` and lesson 3 never contradict one another, and that the other plan's
  records and text survived if it built first.

### Step 12: OPTIMIZE
- [ ] Each surface says each thing once; no sentence repeats another surface word for word
  except where the two lessons files must be identical.

### Step 13: SECURE
- [ ] The security scanner confirms that no instruction tells a session or agent to run the
  owner's answer routes on its own, to add `--urgent` without his word, to bypass the hook, to
  change a record, or to commit anything but what the check passed.

### Step 14: VERIFY
- [ ] `npm test`: lint, typecheck, all tests, coverage at or above the floor in
  `.ctoc/coverage-baseline.json`, 0 skipped, 0 flaky; `CLAUDE.md` measured at or under 15,000
  bytes.
- [ ] The live run of the acceptance criteria in a scratch CTOC project: quote the session's
  commands, the commit, the one sentence for the logic fix, and the log's lines in the build
  record.

### Step 15: DOCUMENT
- [ ] The changed surfaces are themselves the documentation; the build record lists each
  sentence added or replaced and the measured byte counts.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box above is checked against its evidence; the live run is quoted.
