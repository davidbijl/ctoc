---
title: "A commit labelled hotfix or emergency goes through only when a passing check matches exactly what is staged"
type: implementation
created: 2026-10-07
priority: high
effort: medium
parent_plan: ctoc-checks-that-a-hotfix-is-really-small-and-safe
depends_on: ctoc-checks-that-a-hotfix-is-really-small-and-safe-s1-the-hotfix-check, ctoc-keeps-working-and-asks-only-what-matters-s2-plans-cross-on-their-evidence
files:
  - src/hooks/protect-records.js
  - src/lib/hotfix-check.js
  - docs/ENFORCEMENT.md
  - tests/protect-records.test.js
  - tests/hotfix-check.test.js
  # The same hook registered a second time, after each Bash call (PostToolUse, Bash only),
  # so it can compare a just-made labelled commit with what the check passed (Decision 12).
  # Case 60 in tests/protect-records.test.js, which holds this file's exact shape, changes
  # with it.
  - hooks/hooks.json
---

# A commit labelled hotfix or emergency goes through only when a passing check matches exactly what is staged

Slice 2 of 4 of `plans/functional/ctoc-checks-that-a-hotfix-is-really-small-and-safe.md`.
It carries out the owner's decision of 2026-10-07 (answer "a", recorded in the functional
plan): the one loaded hook refuses a hotfix-labelled commit without a passing check.

**Amended 2026-10-08** for the commit command slice 1 now answers,
`git --literal-pathspecs commit --only -m 'hotfix: …' -- <files>` with staging done by
`git --literal-pathspecs add -- <files>`: the hook recognises that form as well as the old
`git commit -m 'hotfix: …'`, and binds the named files for it. Nothing else changed.

**Amended again 2026-10-08** after one review round of slice 1 and this slice. The record's
binding is built from the ids slice 1 tested — each judged file's id in its temporary index,
which slice 1 compares with the file's hashes before the rules and after the tests — instead of
hashing the working files after the background test run, which could cover code that was never
judged or tested. A record that cannot be written gives slice 1's fixed clause `the check
stopped`, its reason in `detail`. A file name holding an apostrophe is refused by slice 1, so
the case that staged one becomes a refusal case.

**Amended a third time 2026-10-08** after a security check of slice 1, with real runs, found
that a repository's own pre-commit hook can rewrite a judged file, or `git add` another file,
during the `hotfix:` commit, so the commit holds more than the check judged, and nothing
compared the two. `--no-verify` is not the fix, because a project's own hooks may scan for
secrets. The same hook, now also registered to run after each Bash call, compares a labelled
commit it let through with the record's judged set (`git diff-tree`: paths, modes and blob ids)
and, on any difference, tells the session in one sentence naming each extra or changed path;
the commit stays and the human decides (Decisions 12 to 19). The record gains `judged`, the
entries of slice 1's new `commit.judged`. While specifying the comparison, one gap in the gate
was found and closed: the subject is now the first non-blank line of the messages, as git
writes it, because `git commit -m '' -m 'hotfix: x'` makes a commit whose subject is
`hotfix: x` while the gate read its subject as empty (Decision 15). One file is added,
`hooks/hooks.json`. The registration needs the owner's answer (the question at the end).

## Problem statement

After slice 1 the check exists, but nothing makes a session run it: CTOC's hooks stay hidden,
and a session that heard "hotfix" can edit and commit without ever asking. The owner chose
(2026-10-07, answer "a") that the one hook Claude Code loads — `src/hooks/protect-records.js`,
registered alone by `hooks/hooks.json` — refuses a shell `git commit` whose message starts with
"hotfix:" or "emergency:" unless a passing hotfix check record exists for exactly the staged
change, bound to the staged content and the commit it builds on. The record must live where
that same hook already keeps agents out (under `.ctoc/state/verify/`), so only the menu's
`hotfix check` route can write it. The `/ctoc:push` variant is dropped.

Three facts the build must respect:

- Keeps-working slice 2 (in flight on its own branch) is changing the same hook: when the
  hook input carries a non-empty `agent_id`, a menu call is allowed only for a fixed list of
  routes, read with one strict reading of the command — a single simple direct call, its
  arguments read the way `start.js` receives them, anything else refused. This slice builds on
  top of that version.
- The coordinator's constraint (2026-10-07): the commit rule uses that same single reading of
  the `git commit` command, never a second tokenizer, and fails closed on any label it cannot
  read exactly — a message passed through a file, a heredoc or an editor — saying so.
- The gate checks the staged change before git runs, but git runs the repository's own
  pre-commit hook after that, and the hook can change what is committed (the security check of
  2026-10-08, real runs). The commit must keep running the project's hooks, which may scan for
  secrets, so the difference can only be found after the commit, by comparing it with the
  record, and said plainly; it cannot be prevented.

## Technical approach

### The record (`src/lib/hotfix-check.js`)

**The binding of a change.** `sha256('ctoc-hotfix-binding-v1\n' + base + '\n' + lines)`,
where `base` is the full object id of the commit the change builds on, and `lines` is one line
`<path>\t<blob>\n` per file in code-unit order of `path` (top-level-relative, `/`), `blob`
being the file's object id as it will be staged, or `deleted` for a deleted file. Hexadecimal,
64 characters. One internal function, `bindingOf(base, entries)`, computes it for the record
writer, the gate and the comparison after the commit.

**On every pass the check writes a record, bound to what it tested.** `base` is the last
commit's id that slice 1's rule 1 read, the commit its temporary copy was made from. Each
`blob` is the judged file's id in slice 1's temporary index (`ls-files --stage` after `add
--all`), or `deleted` when the temporary index does not list it. Slice 1 refuses unless those
ids equal the file's hash taken before any rule read its content and its hash taken again after
the tests, so the bytes judged, the bytes tested and the bytes recorded are one set. Those ids
are the objects `git add` writes for the same files (the temporary index's `add` runs the
repository's own clean filters and line-ending conversion, as `git add` does), so the binding
equals what the staged change will hold. No file is hashed again after the run. The check writes
`.ctoc/state/verify/hotfix/<binding>.json`:
`{ kind: 'hotfix', binding, base, judged, paths, files, changedLines, tests: { ran, passCount,
note }, checkedAt }` (through `./safe-fs`, folder created when missing; the same change
overwrites its own record with the same content). `judged` holds the same entries as the pass
answer's `commit.judged` (slice 1's review-time decision of 2026-10-08): one `{ path, blob }` per
judged file in code-unit order of `path`, `path` top-level-relative with `/` and `blob` its id
in the temporary index or `deleted` — exactly the lines the binding is built from. The writer
takes both from the values slice 1 keeps per file (its top-level path and its temporary-index
id), so when slice 1's `commit.judged` names a file by its project-root-relative path, which is
the same path whenever the project root is the repository's top level, the record still holds
the top-level path. The pass screen gains `record` (the record's project-relative path). When
the record cannot be written, the answer is the refusal with slice 1's fixed clause `I could
not read the change (the check stopped)`, its `detail` `its record could not be written:
<message>` (control characters removed, at most 200 characters; joined with `; ` to a note
about a copy that could not be removed, as slice 1 joins them), and the log line's cause
`unreadable`, as slice 1's Decision 25 treats every fault: no pass is reported without its
record. A refusal writes no record.

**Export, `labelledCommitIsChecked({ root, cwd, kind, paths }) → boolean`**, for the
hook's gate: the top level from `cwd`, `base` (`rev-parse --verify HEAD^{commit}` at commit
time), and the change the commit will hold, through the same git helper slice 1 built:

- `paths` null (the old form, `git commit -m …` with no path): the staged change from
  `diff --cached --raw -z --no-renames --no-abbrev` (status `D` → `deleted`, otherwise the new
  object id).
- `paths` a list (slice 1's form, `git --literal-pathspecs commit --only -m … -- <paths>`,
  which commits the last commit plus exactly those paths as they are in the working folder,
  whatever else is staged): each path resolved against `cwd` and made top-level-relative with
  `/`, its blob from `git hash-object -- <path>` (the same clean filters and line-ending
  conversion `git add` applies), or `deleted` when the file is absent from the working folder;
  a path outside the top level → false.

Then its binding, and true only when `<root>/.ctoc/state/verify/hotfix/<binding>.json` parses
and holds that `binding`, that `base` and `kind`. Any git or read failure → false. Nothing
staged (old form) gives the binding of an empty change, for which the check never writes a
record (rule 1 refuses "nothing has changed").

**Export, `compareCommitWithCheck({ root, cwd, kind, subject }) → null | { commit, missing:
true } | { commit, differences }`**, for the hook's run after the call (the section "After the
commit" below). It only reads: nothing is written, staged, reset or amended.

### The hook rule (`src/hooks/protect-records.js`)

**Where it runs.** For a Bash call that is not the menu, after the existing record rules
(their sentence wins when both apply), and only when the project root walk
(`describeProjectRoot(payload.cwd)`, the walk `findProjectRoot` already delegates to) reports
the marker `ctoc` or `plans` — a project that is not a CTOC project is left alone. It applies
to the main session and to background agents alike.

**One reading of the command.** The rule calls the command reader keeps-working slice 2 gives
the hook — one simple direct call turned into its arguments the way `start.js` receives them,
or nothing for anything else (a `$` other than `${CLAUDE_PLUGIN_ROOT}`, a backtick, a
backslash, an unclosed quote, an unquoted `;`, `&`, `|`, `<`, `>`, carriage return or line
break). If slice 2 left that reading inside the menu-specific function, it is split into its
own internal function that both the menu rule and this rule call, with no behaviour change for
the menu rule. No second tokenizer is written.

**The reading of a commit**, `readCommit(command) → null | { kind, subject, paths, readable }`
(internal), shared by the gate and by the comparison after the call, so both read one command
the same way. **The decision**, `commitLabelDecision(command, cwd, root) → null | 'unchecked' |
'unreadable'` (internal), built on it. "Holds a label" below means the raw command text matches
`hotfix:` or `emergency:` (letter case ignored) — a presence test, never a parse.

1. **The reader returned a commit** — the first argument's base name (`.exe` removed) is
   `git`, and either the second argument is `commit` (the old form) or the second is
   `--literal-pathspecs` and the third is `commit` (the form slice 1's `commit.message`
   prints). Walk the rest: `-q`, `--quiet` and `--only` are allowed; `-m X`, `--message X` and
   `--message=X` collect a message; `-F X`, `--file X` and `--file=X` note a message file; in
   the `--literal-pathspecs` form, `--` ends the options and every argument after it is a
   path, at least one; anything else (`-a`, `-am`, `--amend`, `-C`, `--fixup`, `--include`, a
   path before `--`, `--` in the old form, `--` with no path after it, …) is "other".
   - With at least one message: the subject is the first line that is not blank (empty, or
     only whitespace) of the messages taken in order, each message its own paragraph, as git
     joins them and then drops leading blank lines — so `-m '' -m 'hotfix: x'` and a first
     message that begins with a quoted line break have the subject `hotfix: x`, as the commit
     git makes from them does (Decision 15). No such line, or a subject that does not start
     (after spaces) with `hotfix:` or `emergency:` (letter case ignored) → null. A labelled
     subject with "other" or a message file → `unreadable`. Otherwise →
     `labelledCommitIsChecked({ root, cwd, kind, paths })` ? null : `unchecked`, `kind` being
     `hotfix` or `emergency`, and `paths` the paths after `--` in the `--literal-pathspecs`
     form, null in the old form. `readCommit` marks exactly this last shape `readable`.
   - With a message file and no message: the first line of the file's first 4096 bytes (the
     literal path, resolved against the session's working directory) is labelled →
     `unreadable`; unlabelled or unreadable → null (git cannot read an unreadable file
     either).
   - With neither: the command holds a label → `unreadable`; else null.
2. **The reader returned any other call.** When one of its arguments is `git` (base name,
   `.exe` removed) and a later argument is `commit` — `git -C . commit …`, `git -c k=v commit
   …`, `env git commit …` — and the command holds a label → `unreadable`; else null. A call
   that only mentions those words inside one argument (`echo "git commit -m 'hotfix: x'"`) is
   not a commit, and the exact reading says so.
3. **The reader returned nothing** (a heredoc message, a chained `git add … && git commit …`,
   a substitution, a pipe into `git commit -F -`): when the text holds `git` and `commit` as
   words and the command holds a label → `unreadable`; else null.

**The two refusal sentences** (stderr, exit 2, through the existing `refuse`; `decide` returns
the sentence to refuse with, or null, in whatever shape keeps-working slice 2 leaves it):

- `unchecked`: `CTOC refused this commit because it is labelled hotfix or emergency and no
  passing hotfix check matches exactly what is staged; run node "<plugin root>/src/commands/
  start.js" hotfix check with the files you changed, stage only the files it passed, and commit
  them on their own.` — `<plugin root>` is the hook's own `PLUGIN_ROOT`, so the sentence names
  the real call even for a session that never read the menu's instructions.
- `unreadable`: `CTOC refused this commit because it carries a hotfix or emergency label that
  CTOC cannot read exactly; commit with the command the hotfix check answered, git
  --literal-pathspecs commit --only -m 'hotfix: <what changed>' -- <the files it passed>
  (emergency: for an emergency change), with the message in plain quotes and nothing else in
  the command.`

**Background agents.** The allowed-routes table keeps-working slice 2 adds gains one row:
`hotfix check …` (any further arguments) — the check judges a change and writes only its own
record and one line of its log, never an answer, an approval or a plan move. Every other
`hotfix` route stays refused by that table's fail-closed default.

**Fail rule.** `UNCHECKED_SUSPECT_RE` gains `hotfix:` and `emergency:`, so a crash while the
hook reads a labelled commit refuses it with the existing "protection failed to run" sentence;
every other crash behaves as today. The rule loads `../lib/hotfix-check` (and runs git) only in
step 1 for a labelled subject, so no other call pays for it.

### After the commit — the comparison (`src/hooks/protect-records.js`, `src/lib/hotfix-check.js`, `hooks/hooks.json`)

**Where it runs.** In the same hook, registered a second time in `hooks/hooks.json`:
`PostToolUse`, matcher `Bash`, the same command `node "${CLAUDE_PLUGIN_ROOT}/src/hooks/
protect-records.js"`. Claude Code runs it after a Bash call has run, with that call's
`tool_input.command`, its `cwd`, `hook_event_name: 'PostToolUse'` and, for a background agent,
`agent_id` (believed; Step 9 confirms on the installed Claude Code). `main` branches on
`hook_event_name`: `'PostToolUse'` runs only `afterCommit(payload) → string | null`, never
`decide`, because after the call has run a write-protection refusal can stop nothing and would
read as if it had; any other payload — the existing PreToolUse calls, and every existing case,
which carries no `hook_event_name` — runs `decide` exactly as before. The session takes no
second step: the comparison speaks right after the commit command, from that command.

**Which calls it acts on.** `afterCommit` returns null (exit 0, nothing on stdout or stderr,
`../lib/hotfix-check` not loaded, no git run) unless all of these hold: the tool is Bash with a
string command; the root walk reports a CTOC project (the gate's condition); and `readCommit`
returns a `readable` commit — slice 1's form or the old form, a labelled subject, at least one
message, no message file, nothing "other" — exactly the calls the gate lets through only with a
matching record. So, by form:

| The command | After it ran |
|---|---|
| `git --literal-pathspecs commit [--only] [-q] -m 'hotfix: …' -- <paths>` | compared |
| `git commit [-q] -m 'hotfix: …'` (the old form) | compared |
| the same two with `emergency:` | compared, `kind` `emergency` |
| either form with an unlabelled subject, or the label only in a later paragraph | nothing |
| every shape the gate refuses as `unreadable` (heredoc, chains, `-am`, `--amend`, `-C`, `-c`, `env`, `-F`, a path in the old form, a pipe) | nothing: the gate refused it, so it never ran |
| any other command, an `echo` of a labelled commit | nothing |
| a labelled commit in a repository that is not a CTOC project | nothing |
| a background agent's labelled commit | compared, as the main session's |

**What it compares.** `compareCommitWithCheck({ root, cwd, kind, subject })`, `subject` the one
`readCommit` read, through the same git helper as `labelledCommitIsChecked`:

1. `rev-parse --verify -q HEAD^{commit}`: no commit → null. Then `cat-file commit <id>`: its
   `parent` lines and, after the first empty line, its message.
2. **Only this command's commit.** The message's first non-blank line must equal `subject`,
   both with whitespace removed at either end; otherwise null. A commit that failed leaves
   `HEAD` on the earlier commit, whose subject differs, so it is not compared; running the same
   labelled command again after its commit went through compares that commit again and says the
   same thing.
3. **The committed change.** With one parent, or none: `diff-tree -r -z --no-renames --no-abbrev
   --no-commit-id --root <id>` (the coordinator's form, with `-z` so no path is quoted and
   `--no-abbrev` so no id is shortened). With two or more parents — a labelled commit that
   concludes a merge in progress, for which that form prints nothing (believed; Step 9
   confirms) — `diff-tree -r -z --no-renames --no-abbrev <first parent> <id>` (Decision 17).
   Each entry gives its top-level-relative path, its old and new mode, and its new blob, or
   `deleted` for status `D`.
4. **The record, by the same binding.** No parent → `{ commit: <id>, missing: true }`.
   Otherwise `base` is the first parent; `bindingOf(base, <the committed paths and blobs>)` names
   `.ctoc/state/verify/hotfix/<binding>.json` under `root`; when it parses and holds that
   `binding`, that `base` and `kind`, it is the record. A commit that holds exactly what was
   judged costs this one file read.
5. **When that finds none**, the folder is read (`safeFs.readdirSync`; only names of 64
   lower-case hexadecimal characters plus `.json`). A file is a candidate when it parses, its
   `binding` equals its file name and equals `bindingOf` of its own `base` and `judged`, its
   `base` equals the first parent, and its `kind` equals `kind`; any other file is skipped. No
   candidate → `{ commit: <id>, missing: true }`. Otherwise the candidate with the fewest
   differences (below), ties to the latest `checkedAt`, then the smaller binding (Decision 13).
6. **The differences** with the chosen record, per path: a committed path the record's `judged`
   does not hold → `unchecked`; a path in both whose committed blob differs from the judged
   blob, or whose committed old and new modes differ → `changed`; a judged path the commit does
   not hold → `absent`. Modes come from `diff-tree` itself, not from the record: slice 1's rule
   2 refuses a judged file whose mode changes, so a judged file's mode in the commit must equal
   its mode in the base (Decision 19). No difference → null, quietly. Otherwise `{ commit:
   <id>, differences: [{ path, how }] }` in code-unit order of `path`, the display path:
   project-root-relative with `/`, `../<path>` outside the project root, each control
   character shown as a space as slice 1 cleans `detail`.

Any git or read failure other than "no commit" throws, and the hook's fail rule after the call
speaks (below).

**The sentences after the call** (one line on stderr, exit 2, nothing on stdout, through a new
`tell(sentence)`, never `refuse`: Claude Code shows a PostToolUse hook's stderr to the session
on exit 2, the call having already run (believed; Step 9 confirms), and no deny decision applies
after the call). `<kind>` is `hotfix` or `emergency`; `<commit>` the full commit id.

- **Differences:** `CTOC found that the <kind> commit <commit> is not exactly what the hotfix
  check passed: <differences>; a git hook of this repository or another program changed it after
  the check, and CTOC left the commit as it is, so tell the human, who decides whether to keep
  it.` — `<differences>` the items joined by `, `: `<path> changed after the check`, `<path> was
  never checked`, `<path> was checked but is not in the commit`. Past 20 items, the first 20,
  then `and <n> more paths, all listed by git show --name-status <commit>` (Decision 16).
- **Missing record:** `CTOC could not compare the <kind> commit <commit> with what the hotfix
  check passed, because it found no record of a passing check for it; CTOC left the commit as it
  is, so tell the human, who decides whether to keep it.` (Decision 14.)
- **Crash:** `CTOC could not compare this hotfix or emergency commit with what the hotfix check
  passed, because the comparison failed to run; CTOC left the commit as it is, so tell the human
  that this protection is broken.`

**Fail rule after the call.** A crash in `afterCommit` or in the comparison: when the payload's
`tool_input` (or, for a payload that will not parse, the raw text) matches `hotfix:` or
`emergency:` (letter case ignored) → the crash sentence, exit 2; otherwise exit 0 and nothing.
The write protection's "protection failed to run" sentence is never given after a call.

**Cost.** Every Bash call now starts the hook twice. After a call, the hook reads its input,
runs the command reader and the presence tests, and loads `../lib/hotfix-check` and runs git
only for a `readable` labelled commit (Step 12 measures and confirms by reading).

### The hook's header

"WHAT IT REFUSES" gains the commit rule. A new part, "AFTER A LABELLED COMMIT", states the
second registration, the calls it acts on, the comparison and its three sentences. "WHAT IT
CANNOT CATCH" gains: a commit that carries no label or a false one; a message taken from an
editor, a template or an earlier commit (`-C`, `-c`, `--reuse-message`) without the label text
in the command; a commit made by a script file, `git commit-tree`, a merge, cherry-pick or
revert; a git hook that, after the commit, amends it with another subject or makes another
commit on top (the comparison reads the newest commit, whose subject then differs, and says
nothing); a labelled commit that concludes a merge in progress, whose second parent's history
is not judged (its content is compared with the first parent); and a background agent claiming
"urgent" (slice 3) — each emergency change still lands in the owner's review. A project git hook
that changes a labelled commit (a formatter run before the commit) is no longer on that list as
unseen: it is not prevented, and the comparison says so right after the commit.

### `hooks/hooks.json`

`hooks` gains `PostToolUse`: one group, matcher `Bash`, one `command` hook with the same command
string as the `PreToolUse` entry. `PreToolUse` is unchanged. The `description` becomes: "CTOC
loads only its write protection for the approval records, the check records and the owner's
recorded answers, which also compares a hotfix or emergency commit with what its check passed,
right after the commit; every other CTOC hook stays unregistered on purpose."

### `docs/ENFORCEMENT.md`

In "The one loaded hook — write protection for the records": the registration paragraph names
both entries (`PreToolUse` for Write, Edit, MultiEdit, NotebookEdit and Bash; `PostToolUse` for
Bash, for the comparison only); a sixth item under "What it refuses" (the commit rule, the two
sentences, the one reading with the first non-blank line as subject, the CTOC-project
condition); a paragraph "After a labelled commit" (the calls it acts on, the comparison, its
three sentences, that it never changes the commit and never runs on any other call); the
`hotfix check` row in the background-agent table; the cannot-catch lines above. In "Mandatory
Pipeline Use", item 4 (escape phrases) gains one sentence: that hook is not loaded today, and a
commit labelled `hotfix:` or `emergency:` is refused by the one loaded hook unless the menu's
hotfix check passed exactly what is staged, and is compared with what the check passed right
after it is made.

### Wiring — the live call sites

`labelledCommitIsChecked` is called by `src/hooks/protect-records.js`, the one hook registered
in `hooks/hooks.json`, on every labelled `git commit` a session or agent runs, before it runs
(`PreToolUse`). `compareCommitWithCheck` is called by the same hook's `afterCommit`, reached
from its `PostToolUse` registration for Bash in the same `hooks/hooks.json`, after every
labelled commit in one of the two forms. The record writer, with `judged`, is called from
`hotfixRoute`'s pass path (slice 1's live route), with the ids slice 1's rule 8 kept. All three
ends ship in this slice.

## Acceptance criteria

- [ ] In a CTOC project, after the menu's hotfix check passed `README.md`, the answer's
  `commit.add` and then its `commit.message` with `<what changed>` filled in —
  `git --literal-pathspecs commit --only -m 'hotfix: reword the readme' -- 'README.md'` — are
  allowed (also with double quotes and with `-q`), and so is that commit with `notes.md` also
  staged (it is not committed); the old form `git commit -m 'hotfix: reword the readme'` is
  allowed when only `README.md` is staged — exit 0, nothing on standard output.
- [ ] The same commit is refused with exactly the `unchecked` sentence (exit 2, the sentence
  as the one line on stderr) when: no check ran; in the old form, another file is also staged;
  in slice 1's form, a named file the check did not pass (`-- 'README.md' 'notes.md'`); the
  file changed again after the check; the label is `emergency:` but the record is a hotfix
  record; `HEAD` moved after the check; the repository has no commit.
- [ ] The gate reads the subject as git writes it: `git commit -m '' -m 'hotfix: reword the
  readme'` with `README.md` staged is refused with exactly the `unchecked` sentence when no
  check ran, and allowed after the check passed `README.md`.
- [ ] A labelled commit CTOC cannot read exactly is refused with exactly the `unreadable`
  sentence: the heredoc form; `git add … && git commit -m 'hotfix: …'`; `-am`; `--amend`; a
  path after `--` in the old form (`git commit -m 'hotfix: x' -- README.md`);
  `git --literal-pathspecs commit -m 'hotfix: x' --` with no path; `git -C . commit`;
  `git -c k=v commit`; `env git commit`; `-F msg.txt` and `--file=msg.txt` whose first line is
  labelled; a pipe into `git commit -F -`.
- [ ] Unlabelled commits, a label only in a later paragraph, `-F` with an unlabelled file,
  searches for the label text, an `echo` of a labelled commit command, and labelled commits in
  a repository that is not a CTOC project are allowed exactly as today.
- [ ] A background agent may run `hotfix check …` through the menu; its labelled commit
  follows the same rule as the main session's, before and after it is made.
- [ ] After a labelled commit the hook let through, the hook's run after that same Bash call
  compares the commit with the record and, on any difference, exits 2 with exactly the
  differences sentence as the one line on stderr and nothing on stdout, and leaves the commit
  as it is (`HEAD` is the commit made; the index and the working folder are as the commit left
  them): a pre-commit hook that rewrites `README.md` and stages it → `README.md changed after
  the check`, in both commit forms; one that stages a new `notes.md` → `notes.md was never
  checked`, in both forms; one that makes `README.md` executable in the index → `README.md
  changed after the check`; in the old form, with `README.md` and `docs/guide.md` checked, one
  that unstages `docs/guide.md` → `docs/guide.md was checked but is not in the commit`; one that
  stages 25 new files → the first 20 in path order, then `and 5 more paths, all listed by git
  show --name-status <commit>`.
- [ ] A pre-commit hook that changes nothing, or no pre-commit hook at all → the run after the
  call exits 0 with nothing on stdout or stderr.
- [ ] A labelled commit whose record is gone after it was made → exactly the missing-record
  sentence; a labelled commit that failed (its pre-commit hook exited 1, `HEAD` still the
  earlier commit) → nothing.
- [ ] After an unlabelled commit, a heredoc commit, another command, an `echo` of a labelled
  commit, or a labelled commit in a repository that is not a CTOC project, the run after the
  call says nothing; a crash while comparing a labelled commit gives exactly the crash sentence;
  the run after a call that wrote the records never gives the write protection's refusal.
- [ ] `hooks/hooks.json` registers the one command on `PreToolUse` for Write, Edit, MultiEdit,
  NotebookEdit and Bash, as before, and on `PostToolUse` for Bash only; nothing else.
- [ ] Every passing check leaves exactly one record named by its binding, built from the ids
  slice 1 tested, holding `judged` with the same entries as the pass answer's `commit.judged`
  (paths top-level-relative); a refusal leaves no record — among them a file name holding an
  apostrophe, which slice 1 refuses, and a file edited while the tests ran; the record matches
  the staged change after `commit.add` is run, also with `core.autocrlf=true` and Windows line
  endings in the working file, and in a project whose root is a folder inside the repository.
- [ ] A record that cannot be written gives `I could not read the change (the check stopped)`
  with `its record could not be written: …` in `detail` and the log cause `unreadable`, never a
  pass.
- [ ] Writing a record by hand — the Write tool, a shell redirect, a one-line script — is
  refused, as every other write into the check records already is.
- [ ] `npm test` passes: lint, typecheck, all tests, coverage at or above the floor, 0 skipped;
  `docs/ENFORCEMENT.md` states the rule, the comparison after the commit, their sentences and
  their limits.

## Risks

| Risk | Mitigation |
|---|---|
| Claude Code's habitual heredoc commit is refused, and the session takes several tries | The `unreadable` sentence names the one form that works; slice 4 writes that form into the instructions; the refusal costs one retry, never a wrong commit |
| The binding differs between the check and the staged file on another machine's settings (line endings, filters) | The record's ids come from slice 1's temporary index, written by `add --all`; the hook's come from the staged index (old form) or `git hash-object` (slice 1's form); all three apply the same clean filters and line-ending conversion `git add` applies; a test runs with `core.autocrlf=true` and a CRLF working file, and Step 9 confirms `hash-object` equals the staged blob |
| A file changes between the check and the commit | The binding is the tested bytes; the hook binds the bytes about to be committed; any difference is the `unchecked` refusal |
| A project git hook changes what is committed after the gate checked it (a formatter run before the commit, or a hook that stages another file) | Not prevented: the commit keeps running the project's own hooks, which may scan for secrets, so `--no-verify` is not used. The hook's run after the call compares the commit with the record and says, in one sentence, each path that changed, was never checked or is missing; the commit stays and the human decides |
| Claude Code's run after a call behaves otherwise than this plan believes (its input lacks a field, its stderr on exit 2 is not shown, or it runs after a failed command) | Step 9 confirms each against the installed Claude Code's documentation and one live run before any code is written; the check of `HEAD`'s subject keeps a run after a failed commit silent whichever way it behaves; Step 14 quotes the live sentence |
| Every Bash call now starts the hook twice | After a call the hook loads nothing beyond its own file and runs no git unless the command is a readable labelled commit; Step 12 measures the run after a plain call and quotes it |
| A git hook amends the labelled commit with another subject, or commits again on top, after the commit | Named in the hook's cannot-catch list and in `docs/ENFORCEMENT.md`: the comparison reads the newest commit and says nothing when its subject differs |
| The rule slows every Bash call before it runs | It loads nothing and runs no git unless the reader returned a `git commit` with a labelled subject; other calls pay the existing reader plus presence tests |
| Keeps-working slice 2 builds its reader differently from what this plan assumes | Step 9 reads that slice's final hook first; the rule calls whatever single reader it left, split out if needed, and the tests here drive the real hook process, not the reader |
| A non-CTOC repository's own "hotfix:" commits are refused by a plugin the user installed for other projects | The rule and the comparison run only where the root walk finds a CTOC project marker (`.ctoc` with settings or plans, or CTOC's `plans/` folders) |

## Decisions Taken Under Ambiguity

1. **The binding is the base commit plus each file's blob as it will be staged**, not a hash of
   `git diff --cached` text: the blob ids are what the commit will hold, independent of diff
   settings. The check takes them from the temporary index slice 1 tested, whose `add` writes
   the same objects `git add` writes, so the record binds exactly the bytes that were judged
   and tested (from the review round of 2026-10-08: the amendment's `git hash-object` after the
   background run could bind a file edited during the run). The hook computes its side at
   commit time from the staged index or with `git hash-object` (which writes nothing). The
   owner's "for example a digest of `git diff --cached` plus the base commit" is met in
   substance: the staged content and the base.
2. **The check, not the session, writes the record, and every pass writes one.** Decision 12 of
   the functional plan, as amended with the owner's answer.
3. **Records live in `.ctoc/state/verify/hotfix/`**, a sub-folder of the check records, so no
   file name can collide with a plan's own check record and the existing protection already
   covers it (the hook's record pattern matches any path under `.ctoc/state/verify/`).
4. **The label is read case-insensitively** (`Hotfix:` counts as labelled): reading more as
   labelled can only refuse more, never let an unchecked commit through.
5. **Only `-q`/`--quiet`, `--only`, the message options and, in slice 1's
   `git --literal-pathspecs commit` form, paths after `--` are allowed beside a labelled
   message.** In that form git commits the last commit plus exactly the named paths as they
   are in the working folder, which is what the rule binds, so other staged files cannot ride
   along. Every other option either commits something other than what the rule binds (`-a`,
   `--amend`, `--include`, a path in the old form, where git's own pathspec reading could match
   more than the named file) or takes the message from somewhere CTOC cannot read (`-F`, `-C`,
   `--fixup`). An allow-list fails closed on options git adds later.
6. **A message file is opened only to see whether it is labelled, and a labelled one is always
   refused** (the coordinator's constraint), so a file changed between the hook and git can
   only cause a refusal, never a pass.
7. **A call that reaches `git … commit` through global git options or a wrapper (`env`) is
   unreadable when labelled**, apart from `--literal-pathspecs` directly before `commit` (the
   one global option slice 1's command carries), because the exact reading shows a commit whose
   staged content or working folder this rule does not model; refusing it costs one retry.
8. **The rule runs only in a CTOC project** (marker `ctoc` or `plans` from the existing root
   walk), as every other CTOC enforcement treats non-CTOC projects.
9. **The `unchecked` sentence carries the plugin's real path**, because a session or agent that
   never read the menu's instructions cannot expand `${CLAUDE_PLUGIN_ROOT}`; the path is
   CTOC's install location, not a secret, and no text of the refused command is echoed.
10. **Background agents may run `hotfix check`**: it writes only its own deterministic record
    and one line of its log (slice 1), so an agent cannot obtain a pass the rules would not
    give; this is not an answer, an approval or a plan move, which the owner's decision of
    2026-10-07 reserves to the human.
11. **A record that cannot be written is "the check stopped"** (from the review round of
    2026-10-08): the amendment's clause `the check stopped: its record could not be written:
    <message>` put a variable message inside the fixed sentence. Slice 1's Decision 25 keeps
    every fault in the one fixed clause, with the message in `detail` and the log cause
    `unreadable`; the record failure follows it.
12. **A labelled commit is compared with what its check passed right after it is made, by the
    same hook registered after each Bash call** (session decision 2026-10-08; reason: the
    security check of slice 1, with real runs, showed that a repository's pre-commit hook can
    rewrite a judged file or stage another file during the labelled commit, so the commit holds
    more than the check judged, and `--no-verify` is not the fix because a project's hooks may
    scan for secrets). The run after the call sees the very command that made the commit, at
    the moment it finished, and needs no state carried between calls. The other place offered,
    the session's next call, was not chosen: the hook would have to write a marker on every
    labelled commit it allows, before a call its only way to speak is to refuse that next,
    unrelated call, and a session that ends after the commit would never hear it. The cost is
    one more short process per Bash call. The comparison never rewrites history: the commit
    stays and the human decides. This adds a second registration to `hooks/hooks.json` and
    changes case 60, which hold the owner's decision of 2026-10-07 that only this one hook is
    loaded; it stays one script and one hook, now on two events. Hook registration changes only
    with the owner's explicit approval, so his answer to the question at the end is needed
    before this slice is approved for building.
13. **The record is found by the commit's own binding first, the binding the gate uses**: a
    commit that holds exactly what was judged costs one file read. Only when that finds none is
    the folder read, so the sentence can name what differs; the record chosen is the candidate
    for the same base and label with the fewest differences, which, after a hook's few edits,
    is the one the gate matched. A file whose own `judged` does not reproduce its binding is
    never used, so a damaged record cannot steer the sentence.
14. **A missing record is said, never passed over.** The gate let the commit through only with
    a record, so a commit with no record afterwards (removed in between, or `HEAD` is a labelled
    commit made some other way with the same subject) is one CTOC cannot vouch for; one sentence
    says so and the human decides.
15. **The subject is the first non-blank line of the messages, as git writes it** (found while
    specifying the comparison, 2026-10-08). The amendment read the first line of the first
    message, so `git commit -m '' -m 'hotfix: x'` read as unlabelled and was allowed with no
    check, yet git drops the leading blank lines and the commit's subject is `hotfix: x`. The
    comparison's check that `HEAD` is this command's commit needs the same subject git writes,
    so the gate and the comparison share one reading, `readCommit`. Reading more commits as
    labelled can only refuse more (Decision 4).
16. **At most 20 paths are named, then a count and the command that lists them all**, because
    the sentence must stay one readable line even when a hook stages hundreds of files; the
    rest are one `git show --name-status <commit>` away, named in the sentence.
17. **A labelled commit that concludes a merge in progress is compared with its first parent**,
    because `diff-tree` given one merge commit prints nothing (believed; Step 9 confirms), which
    would read as every judged path missing. Its content against the first parent is exactly
    what the gate bound; its second parent's history is not judged, and the cannot-catch list
    says so.
18. **After a call, the hook only compares.** A write-protection refusal after the call has run
    stops nothing and would tell the session that something was prevented when it was not; the
    protection acts before the call, as it always has.
19. **Modes are compared from `diff-tree`, not recorded.** Slice 1's rule 2 refuses a judged
    file whose mode changes, so the mode a judged file is committed with must equal its mode in
    the base; `diff-tree` gives both, and a difference (an executable bit set by a hook, a file
    turned into a link) is `changed`. The record's `judged` stays the `{ path, blob }` shape of
    slice 1's `commit.judged`.

## The owner's question (open)

**Question:** may the one loaded hook also be registered to run after each Bash call (Bash only),
so that it can compare a hotfix or emergency commit with what the check passed, right after the
commit is made?

- **a (recommended): yes.** The comparison reads the commit command itself the moment it
  finishes and writes nothing; every Bash call starts one more short process.
- **b: no, compare on the session's next call instead.** No new registration; the hook writes a
  marker on every labelled commit it allows, can speak only by refusing the next call, whatever
  it is, and says nothing if the session ends after the commit.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [ ] Add to `tests/protect-records.test.js`, numbered after the file's last case and driven
  through the real hook process with the suite's own `run`, `payload` and broken-entry setup.
  A helper turns the temporary project into a git repository (`README.md` committed, one word
  changed), runs `await route(['hotfix', 'check', 'README.md'], project)` and then the
  `--run-tests` call its `next` names (a documentation-only change in a project with no test
  command, so it passes), and stages with the answer's `commit.add`, run from the project root.
  Each case is red today unless marked guard: the hook allows every commit, ignores which event
  called it, and the check writes no record.
  1. Allowed: the answer's `commit.message` with `<what changed>` = `reword the readme`
     (`git --literal-pathspecs commit --only -m 'hotfix: reword the readme' -- 'README.md'`),
     the same in double quotes, with `-q`, and with `notes.md` also staged; and the old form
     `git commit -m 'hotfix: reword the readme'` with only `README.md` staged.
  2. Refused `unchecked`: no check ran; in the old form, `notes.md` also staged; in slice 1's
     form, `-- 'README.md' 'notes.md'` with `notes.md` changed; `README.md` edited again and
     re-staged; `emergency:` label with the hotfix record; a commit made after the check (HEAD
     moved); a CTOC project whose repository has no commit; and `git commit -m '' -m 'hotfix:
     reword the readme'` with no check (allowed once the check passed `README.md`).
  3. Refused `unreadable`: the heredoc form exactly as Claude Code writes it
     (`git commit -m "$(cat <<'EOF'` … `EOF` `)"`); `git add README.md && git commit -m
     'hotfix: x'`; `git commit -am 'hotfix: x'`; `git commit --amend -m 'hotfix: x'`;
     `git commit -m 'hotfix: x' -- README.md`; `git --literal-pathspecs commit -m 'hotfix: x'
     --`; `git -C . commit -m 'hotfix: x'`; `git -c core.editor=true commit -m 'hotfix: x'`;
     `env git commit -m 'hotfix: x'`; `git commit -F msg.txt` and `git commit --file=msg.txt`
     with first line `hotfix: x`; `printf 'hotfix: x' | git commit -F -`.
  4. Guard, allowed: `git commit -m 'fix: x'`; `git commit -m 'fix: x' -m 'hotfix: named in
     the body'`; `git commit -F msg.txt` with an unlabelled first line; `grep -rn 'hotfix:'
     docs`; `git log --oneline | grep 'hotfix:'`; `echo "git commit -m 'hotfix: x'"`.
  5. Guard, allowed: a labelled commit in a git repository with no `.ctoc` and no `plans/`.
  6. Background agent (`agent_id` set): `node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"
     hotfix check README.md` and `… hotfix check --run-tests 'README.md'` are allowed (red
     once keeps-working slice 2 is in: its table refuses an unlisted route); its labelled
     commit is allowed with the record and refused `unchecked` without it.
  7. Guard, refused with the existing records sentence: a Write to
     `.ctoc/state/verify/hotfix/<64 hexadecimal characters>.json`; `echo '{}' >
     .ctoc/state/verify/hotfix/x.json`; `node -e "require('fs').writeFileSync('.ctoc/state/
     verify/hotfix/x.json','{}')"`.
  8. Crash (the broken entry copy without its library): a labelled `git commit` is refused
     with the "protection failed to run" sentence; `git commit -m 'fix: x'` is allowed.
  9. Line endings: with `core.autocrlf=true` and a CRLF `README.md` in the working tree, the
     checked, staged change is allowed, in both forms.
  10. The `unchecked` sentence is exactly the text above with `<plugin root>` replaced by this
      repository's root.
  11. After the commit. A second helper runs the gate call, then the command itself from the
      project root — through `sh -c` on macOS and Linux, and on Windows through the test's own
      reader of single-quoted words, which hands git the same argument list, as slice 1's case
      32 does — then the run after the call: the same command in a payload with
      `hook_event_name: 'PostToolUse'` (and `agent_id` where named). A new assertion,
      `assertTold(res, what, sentence)`: exit 2, stderr exactly the sentence and one line feed,
      stdout empty. A pre-commit hook is a `#!/bin/sh` file written to `.git/hooks/pre-commit`
      with mode `0755` (git for Windows runs it through its own shell). Red today: the hook
      runs its write protection on every payload and says nothing after a commit.
      a. The hook appends a line to `README.md` and runs `git add README.md` → told, the
         differences sentence with exactly `README.md changed after the check`, in slice 1's
         form and in the old form; `git rev-parse HEAD` is the commit the command made, and
         `git status --porcelain=v1 -z` is the same before and after the run after the call.
      b. The hook writes a new `notes.md` and runs `git add notes.md` → `notes.md was never
         checked`, in both forms.
      c. The hook runs `git update-index --chmod=+x README.md` → `README.md changed after the
         check`.
      d. Old form, the check passed `README.md` and `docs/guide.md`, both staged; the hook runs
         `git reset -q -- docs/guide.md` → `docs/guide.md was checked but is not in the
         commit`.
      e. The hook writes and stages 25 new files `extra/f01.md` … `extra/f25.md` → the
         sentence names `extra/f01.md` … `extra/f20.md` as never checked, then `and 5 more
         paths, all listed by git show --name-status <commit>`.
      f. Case a with `agent_id` set → the same sentence.
      g. No pre-commit hook; after the commit the test itself deletes the record file → the
         missing-record sentence with `hotfix` and the commit's full id.
      h. A payload with `hook_event_name: 'PostToolUse'` whose command is `echo x >
         .ctoc/approvals/a.json` → exit 0, nothing on stdout or stderr (today it is refused).
      i. Crash (the broken entry copy): the run after slice 1's labelled commit → the crash
         sentence, told; the run after `git commit -m 'fix: x'` → exit 0, nothing.
  12. Guard, the run after the call says nothing (exit 0, stdout and stderr empty): a pre-commit
      hook that only exits 0; no pre-commit hook; a pre-commit hook that exits 1, so the commit
      fails and `HEAD` stays the earlier, unlabelled commit; and after `git commit -m 'fix:
      x'`, the heredoc form, `git status`, `echo "git commit -m 'hotfix: x'"`, and a labelled
      commit in a repository with no `.ctoc` and no `plans/`.
  13. Registration: case 60 asserts that `hooks` has exactly the keys `PreToolUse` and
      `PostToolUse`; `PreToolUse` exactly as today; `PostToolUse` one group whose matcher
      matches `Bash` and none of `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Read`, `Task`,
      `Agent`, `Glob`, `Grep`, with one `command` hook whose command is the same string and
      names the existing `src/hooks/protect-records.js`.
- [ ] Add to `tests/hotfix-check.test.js`:
  1. A pass writes exactly one file under `.ctoc/state/verify/hotfix/`, named
     `<binding>.json` with 64 hexadecimal characters, holding `kind: 'hotfix'`, that
     `binding`, `HEAD`'s id as `base`, `judged`, the files and the tests; the pass screen's
     `record` names it; `judged` has the same entries as the pass answer's `commit.judged`, with
     top-level paths; each file's blob in `judged` equals `git ls-files --stage` of that file
     after the answer's `commit.add` is run from the project root.
  2. Every refusal of slice 1's cases writes no file there — named among them, slice 1's case
     47 (a judged file edited during the check, both runs).
  3. After running the answer's `commit.add` for a passed file whose name holds a space
     (`docs/read me.md`), `labelledCommitIsChecked({ root, cwd, kind: 'hotfix', paths: null })`
     is true; with `kind: 'emergency'` false; with a second file staged false; with nothing
     staged false. With `paths: [<the passed file>]` it is true whatever else is staged; with
     `paths` naming a second, changed file false; with a path outside the repository false.
     A file whose name holds an apostrophe (`docs/it's.md`, one word changed, in a project with
     no test command) is refused by both calls with `I could not read the change (docs/it's.md
     has a name the commit command cannot carry)` and leaves no record.
  4. Checking the same change twice leaves one record with the same binding.
  5. When the record folder cannot be created (a file named `hotfix` already sits in
     `.ctoc/state/verify/`), the answer's `text` is exactly the sentence with `I could not read
     the change (the check stopped)`, its `detail` starts `its record could not be written: `,
     the log line's cause is `unreadable`, and no pass is reported.
  6. A project whose root is the folder `app/` inside the repository: after a pass for
     `README.md` there, the record's `judged[0].path` is `app/README.md`, and after the
     answer's `commit.add` from the project root `labelledCommitIsChecked({ ..., paths: null })`
     is true.
  7. `compareCommitWithCheck`, after a pass for `README.md` (`subject` `hotfix: reword`):
     (a) after the answer's commit → null; (b) with `subject` `hotfix: other` → null; (c) in a
     repository with no commit → null; (d) after a commit with that subject holding other bytes
     of `README.md` → `{ commit: <HEAD id>, differences: [{ path: 'README.md', how: 'changed'
     }] }`; (e) holding `notes.md` too → `notes.md` `unchecked` beside it; (f) a record for
     `README.md` and `docs/guide.md`, a commit holding only `README.md` → `docs/guide.md`
     `absent`; (g) the record deleted → `{ commit, missing: true }`; (h) only an emergency
     record for that base → `missing` for `kind: 'hotfix'`; (i) a file that is not JSON and a
     record whose `judged` does not reproduce its binding, as the only files → `missing`; (j)
     two candidate records for the same base → the one with fewer differences, and with equal
     differences the later `checkedAt`; (k) in case 6's project, a commit adding `../x.md`
     beside the judged file → `[{ path: '../x.md', how: 'unchecked' }]`; (l) a branch `side`
     changes `README.md` to the bytes the check passed and `git merge --no-ff -m 'hotfix:
     reword' side` makes a merge commit → null; (m) the commit made through `--root`'s branch
     (an orphan branch's first commit, subject `hotfix: reword`) → `missing`.
- [ ] Run both files: every non-guard case red. Case 2's runs of slice 1's case 47 and case 3's
  apostrophe refusal are guards here, green before this slice's build because no record is
  written yet; each is proven able to fail on the built code by one change, run once and
  reverted: write the record before slice 1's second hashing is compared (case 47 (a) then
  leaves a record); drop slice 1's name check (the apostrophe's `--run-tests` call then passes
  and leaves a record). Case 12 is green today because the hook says nothing after a commit;
  it is proven able to fail on the built code by dropping the check of `HEAD`'s subject (the
  failed commit's run then gives the missing-record sentence) and by comparing every commit
  command, labelled or not (the `fix: x` run then speaks), each run once and reverted.

### Step 9: PREPARE
- [ ] Read keeps-working slice 2's final `src/hooks/protect-records.js`, its tests and its
  `docs/ENFORCEMENT.md` text; identify the single command reader and how `decide` returns a
  sentence.
- [ ] Read slice 1's built `src/lib/hotfix-check.js` and identify where its pass path holds the
  last commit's id and the temporary index's ids, so the record writer takes them from there
  and hashes nothing; read the final shape of the pass answer's `commit.judged` (whether its
  `path` is top-level-relative or project-root-relative) and quote it in the build record.
- [ ] Confirm on the installed git that `hash-object -- <path>` equals the blob `git add`
  stores for the same file under `core.autocrlf=true`, and both equal the id slice 1's
  temporary index holds after `add --all` (one manual run in a scratch repository, output
  quoted in the build record), and that `git --literal-pathspecs commit --only -- <path>`
  commits that same blob with another file staged and leaves the other file staged.
- [ ] Confirm on the installed git, in a scratch repository, output quoted: (a) in slice 1's
  form, a pre-commit hook's `git add` of the judged file after rewriting it, and of another
  file, both land in the commit; (b) in the old form the same, and a hook's `git reset -q --
  <file>` leaves that file out; (c) `git diff-tree -r -z --no-renames --no-abbrev
  --no-commit-id --root <merge commit>` prints nothing; (d) `git commit -m '' -m 'hotfix: x'`
  and a first message of spaces then a line break give the subject `hotfix: x`.
- [ ] Confirm on the installed Claude Code, from its hooks documentation for that version and
  one live run in a scratch CTOC project, output quoted: a `PostToolUse` hook's input carries
  `hook_event_name`, `tool_name`, `tool_input.command`, `cwd`, and `agent_id` for a background
  agent; its stderr on exit 2 reaches the session; and whether it runs after a Bash command that
  exited non-zero. If any of these differs, stop and kick the plan back with the finding.

### Step 10: IMPLEMENT
- [ ] `src/lib/hotfix-check.js`: `bindingOf`; the binding from rule 1's commit id and the
  temporary index's ids; the record writer on every pass, with `judged`; the `record` field; the
  record-failure refusal with `the check stopped` and its `detail`; `labelledCommitIsChecked`
  with its `paths`; `compareCommitWithCheck`.
- [ ] `src/hooks/protect-records.js`: the reader split out if needed; `readCommit` with the
  first non-blank line as subject; `commitLabelDecision` with both commit forms; the two
  refusal sentences; the CTOC-project condition; the `hotfix check` row in the background-agent
  table; the fail-rule words; `main`'s branch on `hook_event_name`; `afterCommit`, `tell`, the
  three sentences after the call and their fail rule; the header.
- [ ] `hooks/hooks.json`: the `PostToolUse` entry for Bash and the new `description`.
- [ ] `docs/ENFORCEMENT.md`: the registration paragraph, the rule, the comparison, the
  sentences, the table row, the limits, and the sentence in item 4.

### Step 11: REVIEW
- [ ] The critic tries to commit an unchecked labelled change past the hook in ten new command
  shapes; any that is allowed is a finding unless it is on the cannot-catch list.
- [ ] The critic tries five ways to make a labelled commit that holds something the check did
  not pass while the run after the call says nothing (hooks of every kind git runs during a
  commit, message shapes, staged deletions, links); any that works is a finding unless it is on
  the cannot-catch list.
- [ ] The critic confirms by reading that the record is written only after slice 1's second
  hashing has matched, that no file is hashed again for the record, and that the comparison
  writes nothing.

### Step 12: OPTIMIZE
- [ ] Confirm by reading the code that `../lib/hotfix-check` is required, and git started, only
  in step 1 of the decision for a labelled subject, and after a call only for a `readable`
  labelled commit; every other Bash call runs the existing reader and the presence tests,
  nothing more.
- [ ] Measure the run after a plain Bash call (`ls`), the median of 20 runs of the real hook
  process, and quote it in the build record.

### Step 13: SECURE
- [ ] The security scanner attacks the rule: option smuggling (`--message` with `=`, combined
  short options, `--` placement, quoting edge cases, blank leading messages), wrappers and
  global git options, a message file that is a symbolic link or a device, path traversal in the
  file operand, a forged record placed through a cannot-catch route, a file edited between the
  check's test run and the record, and a binding collision attempt (two changes, one binding).
- [ ] It attacks the comparison: a hook that stages a file whose name holds control characters
  or a line break (the sentence must stay one line), a record planted so that the folder search
  picks it, a records folder that is a symbolic link, a record whose `judged` misstates its
  binding or carries `__proto__` keys, thousands of records, and a hook that amends the commit
  or commits again after it.

### Step 14: VERIFY
- [ ] `npm test`: lint, typecheck, all tests, coverage at or above the floor in
  `.ctoc/coverage-baseline.json`, 0 skipped, 0 flaky.
- [ ] Live once with the loaded hook, both registrations, in a scratch CTOC project: a labelled
  commit without a check is refused (quote the stderr line), the menu's check is run, the files
  are staged, and the same commit goes through with nothing said after it; then, with a
  pre-commit hook that rewrites `README.md` and stages it, the next checked labelled commit goes
  through and the sentence after it is quoted, and `git log -1` shows the commit in place.

### Step 15: DOCUMENT
- [ ] JSDoc on `labelledCommitIsChecked`, `compareCommitWithCheck`, `bindingOf` and the record
  functions, `readCommit`, `commitLabelDecision` and `afterCommit`; the hook header,
  `hooks/hooks.json`'s description and `docs/ENFORCEMENT.md` as above.

### Step 16: FINAL-REVIEW
- [ ] Every acceptance box above is checked against its evidence; the live refusal, the live
  pass and the live sentence after the rewritten commit are quoted.
