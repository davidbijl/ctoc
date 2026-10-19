---
title: "Plain text in a shell command is data, not a write target"
type: implementation
created: 2026-10-19
priority: high
effort: medium
parent_plan: the-write-protection-compares-real-files-not-spellings
depends_on: the-write-protection-compares-real-files-not-spellings
files:
  - src/hooks/PreToolUse.Bash.js
  - tests/protect-records.test.js
  - tests/a-link-cannot-leave-the-repository.test.js
  - docs/ENFORCEMENT.md
---

# Plain text in a shell command is data, not a write target

## Origin

The owner's direction (2026-10-18/19, through the coordinator), after false refusals: "a quoted
prose argument to echo or printf, and heredoc text, are data, never a write target", with the
interpreter exception the coordinator accepted: "piping echoed text into a shell is a script, not
data". A first form of this design was phase E of the parent plan
(`plans/in-progress/the-write-protection-compares-real-files-not-spellings.md`, Execution Record
phases E to H, read in full). The code review and the static scan found that it let nine
commands write the protected file in bash and zsh. The coordinator took it out (phase G,
option A). This plan carries the design forward. It uses what the review and the scan taught.

## Problem statement

The live shell check is `bashRefuses` in `src/hooks/protect-records.js`. It is the one hook
`hooks/hooks.json` registers (read: `hooks/hooks.json` line 10). While `RECORD_REFUSALS_OFF` is
on (read: line 918), it calls `isLedgerWrite` in `src/hooks/PreToolUse.Bash.js` with
`SETTINGS_SPEC` and `REGIMES_SPEC`. For a background agent it also calls it with the agent
settings specs, as written and NFKC-folded (read: lines 920–937). `isLedgerWrite` splits the
command with a quote-blind regex, `[\n;]|&&|\|\||\|` (read: line 335). It then:
- matches the folder and file text rule against each whole segment;
- resolves every operand and every quoted literal of a segment as a path;
- refuses a touching segment unless it is a pure read.

So a heredoc body line is read as a command, and the words of `echo` and `printf` are read as
paths and text-rule matter. These calls are refused today though nothing in them writes a
protected file. Each is recorded in the parent plan (phase G, "The four false refusals that case
158 held") or in the brief:

1. `echo` of a sentence that names `.ctoc/settings.yaml`.
2. A heredoc that writes a commit message (or any note) naming it to a scratch file.
3. An unquoted heredoc that names the regulatory profiles folder.
4. `echo settings.yaml is the regime file >> notes.txt`, run from inside `.ctoc`. The hook
   prefixes `cd ./.ctoc && `.
5. The usual commit form `git commit -m "$(cat <<'EOF' … EOF)"`, whose message names the file
   and contains `>`.

The danger is the reverse mistake, which phase E made. Text that a program will run is not
data. These phase-E bypasses all wrote the file:
- nested double quotes;
- a fake heredoc;
- `<<$'EOF'`;
- `>& file`;
- a `patch` heredoc;
- a pipe into `(bash)`;
- `/bin/ba?h`;
- `"$(command -v bash)"`;
- `bash${x}`;
- a script written and run in the same call.

## Scope

In:
- One pure function in `src/hooks/PreToolUse.Bash.js`, `reduceDataText(command)`. It returns
  either "no reduction", the command with its proven-data spans removed, or "budget spent".
- Its use as the first line of `isLedgerWrite`.
- Its single-entry-per-string cache.
- Its budget checks.
- Hook cases in `tests/protect-records.test.js`.
- Non-data twins of the unit rows whose guard this change would otherwise silence, in
  `tests/a-link-cannot-leave-the-repository.test.js`.
- One bullet in `docs/ENFORCEMENT.md` replaced.

Out (untouched):
- `RECORD_REFUSALS_OFF`.
- `bashRefuses`'s structure.
- Every menu decision-route refusal.
- `protect-records.js` as a whole.
- The resolver, `real-path-confinement.js`.
- The segment loop of `isLedgerWrite` after its first line: the `cd` tracking, the readings,
  the caps, the budget checks and the read exemption.
- `normalizeForMatch`, `quotedLiterals` and `operandResolvesIntoLedger`.
- `PreToolUse.Bash.js`'s own `main()`. It is not registered as a hook (read: `hooks/hooks.json`
  names only `protect-records.js`). It calls `isLedgerForgery`, and so `isLedgerWrite`, only
  from the test suites that spawn it.

## Implementation Details

### Architecture Decision

**A pre-pass that only removes text, never a new lexer that replaces the split.** Phase E
replaced the quote-blind split with its own lexer. Every bypass the review and the scan found
was a place where that lexer read the text differently from bash. Here the pre-pass returns one
of three things:

- `null`, meaning no reduction. Today's text goes to the old loop unchanged. This happens on
  any doubt: an open construct, a construct outside the narrow grammar below, or a program
  outside the allow-list.
- A **reduced string** built only by deleting proven-data spans:
  - the non-redirect words of an `echo` or `printf`;
  - a heredoc body together with its delimiter line.
  Everything else stays byte-for-byte as written: separators, `cd` segments, redirect operators
  and their target words (quotes included, so `> .ctoc"/"approvals/x` still normalizes and
  matches), and the arguments of `cat`, `tee` and `git`.
- `SPENT`. The budget ran out while lexing, and `isLedgerWrite` returns `true` (refuses).

The old loop then runs on the reduced string. So the `cd` tracking, both readings, the link
test, the identity checks, the operand cap and the budget checks all still apply.

What this buys: **a lexer mistake can only matter on a command it fully classified.** Such a
command is built only from programs on a closed allow-list that runs no text (Decision 2).
Anything the lexer does not fully understand keeps today's verdict.

**Safe consumers, not an interpreter list.** The owner's design, as the review recommended it:
text is data only where nothing can run it. Phase E's list of interpreter names leaked to:
- `/bin/ba?h`, `bash${x}` and `$SHELL`;
- a function or alias named like a safe program;
- `./s` after a heredoc wrote `s`;
- `PATH=. cat`;
- `git -c alias.x='!sh s' x`.

So this plan reduces a command only when **every** simple command in it, nested ones included,
starts with a program on a closed allow-list. The program word must be bare, unquoted and spelled
exactly. Git also needs one of the allowed subcommands. Nothing on the list runs text it is given.

### The grammar `reduceDataText` accepts (everything else means no reduction)

One left-to-right pass over the command, in code units. States: unquoted, inside `'…'`, inside
`"…"`, inside a heredoc body. Every 4,096 code units, and at every heredoc body line,
`realPathConfinement !== null && realPathConfinement.budgetSpent()` returns `SPENT`.

**Global bans.** Any of these anywhere outside single quotes, and outside a heredoc body whose
delimiter was quoted, means no reduction:

1. A backtick.
2. `$(`, except the one commit form in rule 9. Also `${`, `$((`, `$[`, `$'` and `$"`.
3. An unquoted `(`, `)`, `{` or `}`, except the parentheses of the commit form. This covers
   subshells, groups, function definitions, `<(…)`, `>(…)`, `((…))`, brace lists, `{fd}>`, and
   zsh glob qualifiers such as `*(e:'…':)` and `=(…)`.
4. A backslash outside single quotes. This covers escapes, `\'` and backslash-newline.
5. `<<<` (a here-string).
6. An unquoted `#` at the start of a word: at the very start, after a space, tab or newline, or
   after `;`, `&` or `|`. That is a comment.
7. A quote still open at the end of the text. The same goes for a heredoc whose delimiter line
   never comes, and for the commit form not closed by `)`.
8. An unquoted `!`. In zsh, `>!`, `>>!`, `&>!` and `>&!` force a write the way `>|` does. Read as
   `>` followed by a target word `!`, they would turn the real target, `.ctoc/settings.yaml`, into
   an echo data word, which is a regression against today. `!` as pipeline negation is off the
   allow-list anyway.
9. A redirect operator with no target word before a separator or the end of the text (`>>|`,
   `> ;`, a trailing `>`).

**Words and separators.**
- Separators: `;`, `&&`, `||`, `&`, `|`, `|&` and newline.
- `|` and `|&` mark the left command's output as **piped**. So does a newline that follows a
  trailing `|`, because bash continues the pipeline.
- Words are runs of unquoted characters, single-quoted spans and double-quoted spans, glued
  together.
- A double-quoted span may hold `$name` or a special parameter. It may not hold anything that
  rule 2 bans.

**Redirects** are recognised before `&` is taken as a separator:
- an optional digit run, then `>`, `>>`, `>|`, `<`, `<>`, `>&` or `<&`;
- `&>` and `&>>`;
- `<<` and `<<-`.

The target of a redirect is the glued remainder, or else the next word. For `>&` and `<&` that
target is a file descriptor only when it is a digit run or `-`; otherwise it is a file, so the
scan's `>& file` is a write target. A simple command that begins with a redirect means no
reduction.

**Program allow-list.** The program is the first word of each simple command, including the one
inside the commit form's parentheses. It must be one of the following, bare, unquoted, letters
only, exactly:
- `cd`, `pushd`, `popd`;
- `echo`;
- `printf`, but never when any of its words is `-v`;
- `cat`, `tee`, `ls`, `pwd`, `mkdir`, `true`;
- `git`, whose next word is exactly one of `add`, `commit`, `push`, `status`, `diff`, `log` or
  `show`. A global option before the subcommand (`-c`, `-C`, `--git-dir`, `--exec-path`, any
  `-…`) is not allowed.

Otherwise there is no reduction. That excludes:
- an assignment (`PATH=.`, `x=…`);
- a keyword (`if`, `while`, `!`, `case`, `function`, `time`);
- `command`, `builtin`, `exec`, `eval`, `source` and `.`;
- `alias`;
- `xargs`, `awk` and `sed`;
- `patch`, plus `git apply` and `git am`;
- any path (`./s`, `/bin/ba?h`);
- any word holding `$`, a glob character or a quote.

**`git` leaves the allow-list when data is written to a file.** That is the case when any
`echo`, `printf` or heredoc in the command has a write redirect (`>`, `>>`, `>|`, `&>`, `&>>`,
`N>`, `<>`, or `>&` with a file) to a file, or when the command holds a `tee` with an operand.
Then any `git` means no reduction. Git runs hooks (`.git/hooks/*`, `.husky/*`, `core.hooksPath`),
filters (`.gitattributes` with a configured driver) and diff drivers. An existing executable hook
overwritten by `cat >` or `echo >` keeps its mode, and `git commit` in the same call runs it
(Decision 5).

**The data spans.** They are removed only after the whole command has passed every rule above.

1. **`echo` / `printf` words.** In an `echo` or `printf` command whose output is not piped, the
   words after the program that are not redirect operators or redirect targets are removed. The
   command becomes `echo` plus its redirects, as written. For example,
   `echo settings.yaml is the regime file >> notes.txt` becomes `echo >> notes.txt`.
2. **Heredoc bodies.** The body and the delimiter line are removed when all of these hold:
   - the operator is `<<` or `<<-`, followed by optional spaces or tabs and a delimiter word
     that matches `^(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1$`. So `<<$'EOF'`, `<<\EOF`, `<<E"O"F` and
     their kind mean no reduction (Decision 4);
   - the line holds only this one heredoc operator, and does not end in a backslash (rule 4
     already bans one);
   - the consumer is one of:
     - `cat`, whose other words are only redirects and `-`;
     - `tee`, whose operands stay as targets in the reduced text;
     - `git commit` with `-F -`, `--file=-` or `--file -`;
     - the commit form below;
   - the consumer's output is not piped. That covers a `|` later on the header line, a header
     line that ends in `|`, and a `|` right after the heredoc.

   For an **unquoted** delimiter, the body must also hold no `$`, backtick or backslash, because
   such a body expands. Otherwise there is no reduction.

   The body runs from the line after the header to the first line that equals the delimiter
   exactly. For `<<-` the line's leading tabs are removed first. Lines split at `\n` only, so
   `EOF\r` is not `EOF`, as in bash.
3. **The commit form.** In a `git commit` command, a `-m` or `--message` argument is exactly
   `"$(cat <<'D'` or `"$(cat <<"D"`, possibly with `<<-` and spaces where bash allows them. Then
   comes a newline, the body, the delimiter line, optional spaces, tabs and newlines, then
   `)"`. Nothing else may sit inside the parentheses. A second command inside, `;`, `|`,
   another heredoc, or text after the delimiter line other than white space and `)` all mean no
   reduction. The body and the delimiter line are removed.

**Not reduced, kept as written (checked as today):** the words of a piped `echo` or `printf`,
heredoc bodies that fail any condition, comments (rule 6 bans them), the arguments of
`cat`, `tee`, `git`, `cd`, `ls` and `mkdir`, and a `git commit -m "<plain text>"` message
(Neighbours).

**Cost.** One linear pass, plus a line-by-line delimiter search that is also linear, plus an
array of kept slices joined once.

**Cache.** A module-level `Map` from the command string to its result, cleared when it holds 8
entries. `SPENT` is never stored: a spent budget belongs to one decision, and the unit file runs
many decisions in one process, some with a deadline set. `bashRefuses` passes at most two distinct strings per decision (the `cwdCommand` and,
for an agent, its NFKC fold). They alternate between specs, so a single-entry cache would
thrash; that is why it is a map of a few entries.

### Dependency graph

```
hooks/hooks.json --registers--> src/hooks/protect-records.js
protect-records.decide --calls--> bashRefuses --calls--> PreToolUse.Bash.isLedgerWrite (x2 main, up to x2+2N agent)
PreToolUse.Bash.isLedgerWrite --calls (new, first line)--> reduceDataText (new, module-private)
reduceDataText --reads--> realPathConfinement.budgetSpent (existing, fail-soft require already at the top of PreToolUse.Bash.js)
PreToolUse.Bash.main (not registered; spawned by tests) --calls--> isLedgerForgery --calls--> isLedgerWrite
tests/protect-records.test.js --spawns--> src/hooks/protect-records.js (real hook, real PreToolUse JSON)
tests/a-link-cannot-leave-the-repository.test.js --requires--> PreToolUse.Bash.isLedgerWrite
```

No new file and no new export, so no cycle. `reduceDataText` is module-private, so the dead-export
fence is unaffected.

### Implementation order

1. MODIFY `tests/protect-records.test.js`: new cases 160–164 (Step 8, red first).
2. MODIFY `tests/a-link-cannot-leave-the-repository.test.js`: new unit case 26 (twins), and one
   row changed (Decision 8).
3. MODIFY `src/hooks/PreToolUse.Bash.js`: `reduceDataText`, its constants and cache, and the
   first line of `isLedgerWrite`. Depends on 1 and 2 being red or guarded.
4. MODIFY `docs/ENFORCEMENT.md`: replace the bullet "plain text on the shell is still read as
   text". Depends on 3's measured numbers.

### File: `src/hooks/PreToolUse.Bash.js`
**Action:** MODIFY
**Purpose:** Read the words of a non-piped `echo` or `printf`, and the body of a heredoc fed to a
safe reader, as data before the shell's write test reads the command.
**Change type:** new-function + modify-existing (one line).

#### New (module-private, placed directly above `isLedgerWrite`, read: line 299)
- `const SPENT = Symbol('budget spent');`
- `const SAFE_PROGRAMS = new Set(['cd', 'pushd', 'popd', 'echo', 'printf', 'cat', 'tee', 'ls', 'pwd', 'mkdir', 'true', 'git']);`
- `const SAFE_GIT_SUBCOMMANDS = new Set(['add', 'commit', 'push', 'status', 'diff', 'log', 'show']);`
- `const HEREDOC_DELIMITER_RE = /^(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1$/;` (literal, linear, no
  nested quantifier: `tests/lint.test.js`'s `security/detect-unsafe-regex` failed phase E on a
  nested one, read: parent Execution Record phase E "Lint").
- `const LEX_BUDGET_STRIDE = 4096;`
- `const reductionCache = new Map();`
- `function reduceDataText(command)` returns `string | null | typeof SPENT`.
  - Description: as in "The grammar" above. It is pure apart from the budget read.
  - Throws: never. Any unexpected state returns `null`. The loaded hook's fail rule must never
    see a throw from here: it refuses only calls that mention the records or (for an agent) a
    settings file, and lets every other call run, a write through a hard link included.
  - Examples:
    - `echo settings.yaml is the regime file >> notes.txt` gives `echo >> notes.txt`.
    - `git commit -m "$(cat <<'EOF'\nFix .ctoc/settings.yaml > x\nEOF\n)"` gives
      `git commit -m "$(cat <<'EOF'\n\n)"`.
    - `echo '…' | bash` gives `null`.
    - `cat <<$'EOF'\n…` gives `null`.
- Written as small helpers inside the same file:
  - `lexCommand(text)` returns `{ commands, heredocs, spans }` or `null` or `SPENT`;
  - `allowed(commands, writesData)` returns a boolean;
  - `cutSpans(text, spans)` returns a string.

  One function per concern, each with JSDoc in the file's style (read: the docblocks of lines
  195–297).

#### Changes
- **Modify** `isLedgerWrite` (read: line 334). Its first line becomes:
  ```js
  const reduced = reduceDataText(command);
  if (reduced === SPENT) return true;
  const segments = String(reduced === null ? command : reduced).split(/[\n;]|&&|\|\||\|/);
  ```
  Nothing after that line changes.
- **Docblock** of `isLedgerWrite`: one paragraph saying which text is data, which programs it
  covers, and that anything else is read as before.
- `module.exports` unchanged.

#### Called by
`isLedgerWrite`, which is called by `protect-records.bashRefuses` (read: lines 925, 933–934, 949,
950 and 954; only 925 and 933–934 are reachable while `RECORD_REFUSALS_OFF` is on). It is also
called by `isLedgerForgery`, for the spawned `main()` and its suites, and by
`protect-records.menuArgsNameRecords` (read: line 563; behind the switch).

#### Data flow
```
command --reduceDataText--> null | reduced | SPENT
  SPENT --> true (refused, the budget's rule)
  null  --> today's split of the original text
  reduced --> today's split of the reduced text --> cd tracking, readings, link test, caps --> verdict
```

#### Error handling
- No `try` or `catch` is added. An empty catch in `src/` is a `silent-catch` finding (read:
  parent Execution Record, Decisions during the build, 1). The function is written so that it
  cannot throw. It only indexes strings and `Map`s it owns, and every unknown state returns
  `null`. This matters: the hook's fail rule fails OPEN for a call that does not mention the
  records or a settings file (read: `protect-records.js` lines 152–164 and 1019–1035).

#### Cross-platform notes
- Pure string work. No paths are built here; the old loop's `path.posix` reading is unchanged.
  Lines are split at `\n` only (bash's reading on every platform).

#### Wiring — the live call sites
- `reduceDataText` is called from `isLedgerWrite`'s first line in `src/hooks/PreToolUse.Bash.js`.
- The root is `hooks/hooks.json`, which registers `src/hooks/protect-records.js`. From there:
  `decide` → `bashRefuses` → `isLedgerWrite` for the regulatory-settings specs (every session)
  and the agent settings specs (background agents). This is read, not run. The live check in a
  real session is Step 16's last box.
- Test-only caller: `PreToolUse.Bash.js`'s `main()`, spawned by `tests/ledger-forgery-closed.test.js`
  and others. It is not registered.

### File: `tests/protect-records.test.js`
**Action:** MODIFY (new cases at the end of the describe block "the write protection compares real
files, not spellings (owner, 2026-10-15)", using its `rowTest`, `refusedBoth`, `allowedBoth`,
`refusedAgent`, `asAgent`, `ro` and `run` helpers. Read: lines 1086–1160.)

Case numbering: the file's last case is 159 (read: line 1527). Case 158 was removed by phase G and
stays retired, so the new cases are 160–164 (Decision 9). Every row spawns the real hook with real
PreToolUse JSON, for the main session and a background agent. Protected files are made by Node's
`fs` inside each case's temporary project, never by a shell command.

**Case 160 · plain text on the shell is data (the owner's direction, 2026-10-18/19)**

These rows are allowed for both sessions. The red rows before Step 10 are marked R.

- R: `echo "the menu writes .ctoc/settings.yaml; never edit it by hand"`.
- R: `cat > notes/msg.txt <<'EOF'`, then a line naming `.ctoc/settings.yaml` with a `>` in it,
  then `EOF`.
- R: `cat > notes/regimes.txt <<EOF`, then `profiles live in .ctoc/regulatory-regimes`, then `EOF`
  (unquoted delimiter, no `$`).
- R: from cwd `.ctoc`: `echo settings.yaml is the regime file >> notes.txt`.
- R: `git commit -m "$(cat <<'EOF'`, then `Fix .ctoc/settings.yaml reading > old`, then `EOF`,
  then `)"`.
- R: `git add a.txt && git commit -m "$(cat <<'EOF'` and the same message, followed by `&& git push`.
- R: `git commit -F - <<'EOF'`, then the same message, then `EOF`.
- R: `printf '%s\n' 'the regime file is .ctoc/settings.yaml' > notes/p.txt`.
- `tee notes/t.txt <<'EOF'`, then a line naming the file, then `EOF`. R.
- `cat <<-'EOF'`, then a tab and the naming line, then a tab and `EOF` (tab-stripped delimiter).
  R.
- Green guards, allowed today and after:
  - `echo "$(date)"`;
  - the long ruling-line `echo` with apostrophes and no slash;
  - `echo "x; y | z && w"`.
- `echo "${'あ'.repeat(100)}"`, allowed on every platform. It is data now; Decision 8 moves the
  resolver's fail-closed property to `cp` in case 163.

**Case 161 · text a program could run stays checked (the review's and the static scan's bypasses)**

These rows are refused for both sessions with `REFUSAL_SETTINGS`, or with
`REFUSAL_AGENT_SETTINGS` on a `.claude/settings.json` row for the agent. Each is green today (a
guard), and each names its rule. Where `X` is written below, it stands for
`echo x > .ctoc/settings.yaml`:

- Nested quotes:
  - `echo "$(echo "a"; X)"`, by rule 2;
  - `echo "a "' ; b ; '" c" > n.txt; X`. Mixed quotes glued into one word, then `X` outside
    every quote; it guards that the quote pairing does not swallow `X`.
- Fake heredoc:
  - `echo "<<EOF"` newline `X` newline `echo EOF`. `X`'s program, the redirect on `echo`, is
    kept;
  - `echo '<<EOF'` newline `rm .ctoc/settings.yaml` newline `EOF`, refused because `rm` is not
    on the allow-list.
- `cat <<$'EOF'` newline `x` newline `EOF` newline `rm .ctoc/settings.yaml` newline `$'EOF'`, by
  Decision 4.
- `cat <<"E"O"F"` … in the same shape, by Decision 4.
- `echo hi >& .ctoc/settings.yaml` and `echo hi 2>& .ctoc/settings.yaml`, because the
  redirect target is kept.
- `patch -p0 <<'EOF'` with a diff whose `+++` names `.ctoc/settings.yaml`; `git apply <<'EOF'`
  and `git am <<'EOF'`, the same. Not on the allow-list.
- Pipes into a shell, none on the allow-list or banned:
  - `echo 'X' | (bash)`;
  - `echo 'X' | /bin/ba?h`;
  - `echo 'X' | "$(command -v bash)"`;
  - `echo 'X' | bash${x}`;
  - `echo 'X' | $SHELL`.
- `echo 'X' | awk '{system($0)}'`.
- `f(){ bash; }; echo 'X' | f`, banned by rule 3.
- A script written and run in the same call:
  - `cat > s.sh <<'EOF'` newline `X` newline `EOF` followed by `&& bash s.sh`, then by
    `&& sh s.sh`, then by `&& chmod +x s.sh && ./s.sh`, then by `&& . ./s.sh`, then by
    `&& source s.sh`;
  - `echo 'X' > s.sh && bash s.sh`.
- `printf -v c 'X'; eval "$c"`.
- A pipe continued after a line break: `echo 'X' |` newline `bash`, and `echo 'X' |` newline
  `tee n.txt`. The first is refused because of `bash`; the second because the echo is piped, so
  its words stay checked.
- A heredoc whose header ends in `|`: `cat <<'EOF' |` newline `X` newline `EOF` newline
  `tee n.txt`.
- The commit form attacked:
  - `git commit -m "$(cat <<'EOF'` newline `m` newline `EOF; X)"`. The delimiter line is not
    exact, so no `)` closes the form; rule 7 means no reduction;
  - `git commit -m "$(cat <<'EOF'` newline `m` newline `EOF` newline `X)"`. A second command sits
    inside the parentheses;
  - `git commit -m "$(cat <<EOF` newline `$(X)` newline `EOF` newline `)"`. An unquoted delimiter
    and a body with `$`.
- Consumers redefined:
  - `echo(){ bash -c "$*"; }; echo 'X'`;
  - `alias cat=bash; cat <<'EOF'` newline `X` newline `EOF`;
  - `PATH=. cat <<'EOF'` newline `X` newline `EOF`.
- `git -c alias.x='!sh s.sh' x` after `cat > s.sh <<'EOF'` with `X`, for both reasons: a git
  global option, and data written to a file.
- A git hook overwritten and run in the same call (Decision 5): with an executable
  `.husky/pre-commit` already present (made by `fs` with mode 0o755), first
  `cat > .husky/pre-commit <<'EOF'` newline `X` newline `EOF` newline `git commit -m x`; then
  `echo 'X' > .git/hooks/pre-commit && git commit -m x`.
- A comment hiding a quote: `echo a # '` newline `X` newline `echo '`, by rule 6.
- An escaped quote: `echo \' ; X ; echo \'`, by rule 4.
- `<<-` with a tab-indented delimiter: `cat <<-'EOF'` newline `x` newline tab `EOF` newline `X`
  newline `EOF`. Bash ends the body at the tab line, so `X` runs; the row refuses.
- zsh glob qualifier: `echo *(e:'X':)`, by rule 3.
- A here-string: `bash <<< 'X'` and `cat <<< 'X' > s.sh; bash s.sh`, by rule 5.
- zsh's forced redirects: `echo x >! .ctoc/settings.yaml`, `echo x >>! .ctoc/settings.yaml`,
  `echo x &>! .ctoc/settings.yaml`, by rule 8. In bash these write a file named `!`, so only Step
  9's zsh run proves them as attacks.
- A redirect with no target: `echo x >>| .ctoc/settings.yaml`, by rule 9.
- An agent row: `echo 'echo x > .claude/settings.json' | bash`, refused with
  `REFUSAL_AGENT_SETTINGS` for the background agent.
- Controls, refused today and after:
  - `echo x > .ctoc/settings.yaml`;
  - the same with `>>`, `>|`, `&>` and `2>`;
  - `printf x >> .ctoc/regulatory-regimes/eu.yaml`;
  - `cat > .ctoc/settings.yaml <<'EOF'` newline `a` newline `EOF`;
  - `cat <<'EOF' > .ctoc/settings.yaml` newline `a` newline `EOF`;
  - `tee .ctoc/settings.yaml <<'EOF'` newline `a` newline `EOF`;
  - `echo 'names .ctoc/settings.yaml' | tee notes.txt`. This one stays checked (the pipe rule)
    and is refused for its words, exactly as today.

**Case 162 · open constructs are not data**

These rows are refused for both sessions, `REFUSAL_SETTINGS`. Today's reading refuses them too,
so they are green guards that the fallback is today's verdict:
- `echo 'names .ctoc/settings.yaml` (open quote);
- `cat <<'EOF'` newline `names .ctoc/settings.yaml` (no delimiter line);
- `git commit -m "$(cat <<'EOF'` newline `names .ctoc/settings.yaml` newline `EOF` (no `)"`).

Allowed both sessions, a control: `echo don't panic`. It is open, so not reduced, but it names
no protected file, so it is allowed as today.

**Case 163 · the guards that this change would otherwise silence (non-data twins)**

- `${base} && cp a0 … a129 settings.yaml` with `base = 'cd -P src/L && cd ..'` and `src/L` a link
  to `.ctoc/state`, as in case 157. Refused for both sessions, `REFUSAL_SETTINGS`. Case 157's
  `echo a0 … a129 > settings.yaml` row is now refused by its kept redirect target, so the phase-D
  operand-cap rule needs a non-echo row to stay red-able.
- `cp x "${'あ'.repeat(100)}"`: allowed on darwin, refused with `REFUSAL_SETTINGS` elsewhere. This
  is the resolver's fail-closed rule for a byte-counting disk, moved from case 159's echo row.
- `cp x ${'😀'.repeat(128)}`: allowed for both sessions. This is the UTF-16-unit rule's guard row
  (parent phase H), moved from case 159's echo row, which stays as it is and is now a data row.
- `cp x ${'x'.repeat(20000)}`: allowed for both sessions.

**Case 164 · the cost of reading a padded command (measured, not asserted)**

Each row is spawned once. It asserts the verdict, and records the wall time with `t.diagnostic`.
The time is never asserted (`timing-tests-daily-only`):
- `echo '` + 500,000 × `x` + `'`, allowed;
- `cat > n.txt <<'EOF'` newline + 10,000 lines of 50 characters + newline `EOF`, allowed;
- `echo 'X' ` + 125,000 × `'a' ` (about 500,000 characters) + ` | bash`, refused (piped into a
  program off the list, so no reduction; the old loop reads it);
- with case 155's preload (budget already spent): `echo 'hello'`, refused with `REFUSAL_SETTINGS`
  for both sessions. `SPENT`, or the loop-top check, refuses; the verdict is what is asserted.

**Existing rows changed (Decision 8, written reason):** in case 159, the row "echo of a quoted name
of 100 non-Latin characters (control)" becomes `allowedBoth` on every platform. Its old
non-darwin expectation, refused, was the resolver's verdict on an echo word, and that word is now
data. The resolver property it carried is case 163's `cp` row. No other existing row changes.

### File: `tests/a-link-cannot-leave-the-repository.test.js`
**Action:** MODIFY
**Purpose:** Keep the resolver guards of the parent's phases F, G and H red-able now that `echo`
words are data.

- **Unit case 26** (the file's last is 25; read: parent Execution Record phase H), "the
  over-long-name rows read through an operand that is not data". It reuses case 23's fixture
  shape (read lines 700–735 at Step 9). It calls `isLedgerWrite` with the same spec and asserts:
  - `cp x ${'x'.repeat(300)}` is false;
  - `cp x ${'x'.repeat(20000)}` is false;
  - `cp x "${'あ'.repeat(100)}"` is `process.platform !== 'darwin'`;
  - `cp x ${'😀'.repeat(128)}` is false.
- **Changed row (Decision 8):** case 23's row "echo of a quoted name of 100 non-Latin characters"
  (read: lines 728–729) now asserts `false` on every platform, with a one-line comment that echo
  words are data and that case 26 holds the resolver's side. The rows at lines 725, 726 and 778
  stay as they are. They still pass, and they are now data rows; their guard role moves to case 26.

### Test plan — coverage of the new function

Every ban (rules 1–9), every allow-list exclusion, the `printf -v` exclusion, the git subcommand
and global-option rule, the git-leaves rule, each consumer (`cat`, `tee`, `git commit -F -`, the
commit form), `<<` against `<<-`, a quoted against an unquoted delimiter, the piped rule, the
`>&` digit, dash and file branches, the cache hit and the cache clear, and `SPENT` each have at
least one row above.

The cache-clear branch gets a row in unit case 26: nine distinct commands, then the first again,
with the same verdict. The coverage floor is `.ctoc/coverage-baseline.json` `minPct` (99, read: the
project's CLAUDE.md). Step 14 reads the per-file line and branch numbers for
`PreToolUse.Bash.js` and adds a row for any uncovered branch of `reduceDataText`. It never adds
an ignore comment.

### Security Review

- **Path traversal:** none added. The reduced text is checked by the unchanged resolver.
- **Input validation:** `command` is coerced with `String()`, as today. Any shape outside the
  grammar returns `null`, which means today's verdict.
- **No secrets** in code or tests.
- **Safe file operations:** none. The function is pure.
- **Error messages:** no new sentence. The refusals are the existing `REFUSAL_SETTINGS` and
  `REFUSAL_AGENT_SETTINGS`.
- **Prototype pollution:** the `Map` is keyed by string and holds no object from the input.
- **Command injection:** nothing is executed. Tests spawn the hook with `spawnSync` and an
  argument array, as the file does today.
- **Regular expressions:** one new literal (`HEREDOC_DELIMITER_RE`), linear. No regex is built
  from data.
- **Monotonicity, the property that matters:** the reduced text is the original minus spans.
  Every redirect target, every `cd`, and every argument of a non-data program stays byte-for-byte.
  So a write the old loop refuses is refused after the change, unless its only trace was inside a
  removed span. A removed span is removed only under the allow-list, where no program runs text.
- **Fail direction:** no throw, no catch. Unknown means `null`, which is today's verdict.
  `SPENT` refuses.
- **Shell to-verify:** which shell Claude Code's Bash tool runs (bash or the user's zsh) is
  **to-verify**. No document in the repository states it (searched `docs/` for "zsh", "login
  shell", "user's shell" and "default shell": 0 files). The grammar is built to hold for both.
  The belief that every zsh-only construct which runs code or moves a write target needs `(`,
  `{`, `$` followed by `(`, `{` or `[`, a backtick, or `!` is **believed**, not verified. It
  comes from recall of zsh's glob qualifiers, `=(…)`, `${(e)…}`, `$[…]` and the forced
  redirects `>!` and `>>!`; the last was found only on review, which is why rule 8 exists. It is
  checked in Step 9 by running every case-161 row in both shells in a scratch folder, and in
  Step 13 by the scanner.

## Acceptance criteria

1. Each false refusal in the problem statement is allowed for the main session and a background
   agent, through the real hook. Hook case 160 was red before Step 10.
2. Every bypass the review and the static scan found against phase E is refused, through the real
   hook, for both sessions. So are the advisor-added forms: a script run in the same call by
   path, `.` or `source`; redefined consumers; `PATH=.`; `git -c`; an overwritten git hook; a
   comment; an escaped quote; `<<-`; a zsh glob qualifier; a here-string; zsh's forced redirects `>!`, `>>!` and `&>!`; a
   redirect with no target; and the attacked commit form (hook case 161).
3. Open constructs keep today's verdict (hook case 162).
4. The parent's guards stay red-able. Case 163 and unit case 26 are green, and each turns red
   under its parent mutation in Step 11.
5. Cases 156, 157 and 159 pass. Their rows are unchanged except the one row of case 159, and the
   one row of unit case 23, named under Decision 8.
6. The padded rows of case 164 have their verdicts asserted and their times recorded. None
   exceeds the 5-second budget plus one second, on the machine and load recorded.
7. `RECORD_REFUSALS_OFF`, `bashRefuses`, every menu decision-route refusal, `hooks/hooks.json`,
   `protect-records.js` and `real-path-confinement.js` are byte-identical (`git diff --stat`).
8. `npm test` exits 0, with 0 failed, 0 skipped, and coverage at or above `minPct`.
   `npx eslint . --max-warnings 0` exits 0, and `npm run typecheck` exits 0. Dead exports and
   unreachable files are no higher than at Step 9.
9. `docs/ENFORCEMENT.md`'s bullet is replaced (Step 15). The rule-inventory fixture is
   checked first.
10. The live check: in a real session on a scratch CTOC project, false refusal 5 (the commit form)
    is allowed. The shell actually used is recorded.

### Acceptance criteria mapping

| Criterion | Implemented in | Test case |
|---|---|---|
| 1 | `reduceDataText` spans 1–3; `isLedgerWrite` first line | hook 160 |
| 2 | bans 1–9, allow-list, git-leaves rule, delimiter rule, consumer rule, piped rule | hook 161 |
| 3 | ban 7, `null` fallback | hook 162 |
| 4 | twins | hook 163, unit 26 |
| 5 | no change to the old loop | hooks 156, 157, 159 |
| 6 | budget stride, linear pass, cache | hook 164 |
| 7 | scope | `git diff --stat` at Step 14 |
| 8 | everything | `npm test`, lint, typecheck |
| 9 | docs | `tests/claude-md-keeps-every-rule.test.js` |
| 10 | wiring | Step 16 live box |

## Risks

| Risk | Mitigation | Where |
|---|---|---|
| The lexer reads quotes or heredocs differently from bash or zsh, and hides a write | It reduces only commands built from non-running programs. Every hard construct means no reduction. Step 9 runs every case-161 row in real bash and zsh in a scratch folder to prove each is a real attack. | `reduceDataText`; Step 9 |
| A program on the allow-list runs text after all | Each member was chosen for running nothing it is given. Git leaves the list when data is written to a file. `printf -v` is excluded. The Step 13 scan is asked for exactly this. | `SAFE_PROGRAMS`; Step 13 |
| The shell that runs commands is not the one assumed | The grammar is built for both; Step 9 runs both; to-verify recorded. | Security Review |
| The pre-pass costs time on huge commands | One linear pass, the budget checked every 4,096 code units, cache per string, measured in case 164 and at Step 12 | `reduceDataText` |
| A throw from the new code FAILS OPEN for any write whose text does not mention `.ctoc` (a hard link or a link to the settings file under another name). The fail rule refuses only calls that mention the records or, for an agent, a settings file (read: `protect-records.js` lines 152–164, 1019–1035) | No `throw`, only string indexing and an owned `Map`; unknown means `null`; Step 11 mutation (k) records which rows fail open; the critic checks no path can throw | `reduceDataText` |
| A guard of the parent plan goes silent | Twins in case 163 and unit case 26, each shown red at Step 11 | tests |
| A data write plus a later call runs it (a hook, a shell start-up file) | Pre-existing class, stated in `docs/ENFORCEMENT.md` and under Neighbours | docs |

## Decisions Taken Under Ambiguity

1. **The pre-pass returns "no reduction" instead of refusing on an open construct.** The brief's
   parser fix (1) reads "→ refuse". Today's reading already refuses any command that names a
   protected file anywhere in its text, so falling back to it is as safe for the protected files.
   It also does not refuse `echo don't panic`, which names nothing. Case 162 holds both.
2. **A closed program allow-list over the whole command, not "no interpreter named anywhere".**
   The brief's design head says "a SAFE-CONSUMER list, not an interpreter list". Its heredoc rule
   still names an interpreter deny-list, and that leaks: `./s`, `. s`, a function or alias named
   `cat` or `echo`, `PATH=.`, `git -c alias`, and every interpreter not on the list. The
   allow-list is the safe-consumer list applied to every program in the command. The cost: a
   command mixing an `echo` or heredoc that names a protected file with any other program
   (`npm test`, `node`, `rm`) keeps today's reading, and is refused if it names the file. It is
   recorded as a question (security posture) with the allow-list recommended.
3. **One substitution shape, the commit form, inside `git commit` only.** The brief asks for
   double quotes that nest inside `$(…)` and `${…}` the way bash reads them, for backslash-newline
   continuation, and for `$$'…'` read as `$$` plus a quote. This plan recognises none of those.
   Each one means no reduction. That is at least as safe, needs no emulation of two shells'
   nesting rules, and still lets the five false refusals through. The cost: an `echo` with any
   other substitution, a backslash, or `$'…'` keeps today's reading.
4. **Heredoc delimiters on a whitelist, not stripped "the way the shell does".** This is the
   brief's fix (5). A delimiter word must be a plain name, bare or in one pair of quotes. `$'EOF'`,
   `$"EOF"`, `\EOF` and mixed quoting mean no reduction. Emulating bash's and zsh's quote removal
   on delimiters is where phase E went wrong.
5. **Git leaves the allow-list when the command writes data to a file.** This is beyond the
   brief. An executable hook file (`.husky/pre-commit`, `.git/hooks/pre-commit`) overwritten by
   `cat >` or `echo >` keeps its mode, and `git commit` in the same call runs it. The same goes
   for filters and diff drivers. The cost: `cat > msg.txt <<'EOF' … EOF && git commit -F msg.txt`
   with a message naming a protected file keeps today's reading; two calls, or the commit form,
   avoid it.
6. **Comments are not data.** An unquoted `#` at a word start means no reduction (rule 6). Reading
   comments correctly is a lexer feature whose only use would be more false negatives' surface.
7. **The pipe rule is kept though the allow-list makes it redundant for attacks.** Every program
   that could follow a pipe in a reduced command runs nothing. It stays because the brief decided
   it. Step 11 states that no attack row shows it red alone. Its behaviour row is
   `echo '…' | tee notes.txt`, still refused for its words.
8. **Two existing rows change, and four twins are added.** Case 159's and unit case 23's
   "100 non-Latin characters" echo rows expected "refused" off darwin because the resolver read
   the echo word as a path. The word is now data, so on Linux those rows would fail for a reason
   that is not a bug. Each row now expects "allowed" everywhere, with a written reason in the
   test. The resolver property they carried moves, unweakened, to a `cp` operand (case 163, unit
   case 26). On darwin, the build machine, both rows pass before and after. This is a test
   change under lesson 14, with its reason written: an assertion moved to the input that still
   exercises it, not dropped.
9. **New cases are numbered from 160.** Case 158 stays retired, so the number never means two
   things in the parent's records.
10. **`tests/a-link-cannot-leave-the-repository.test.js` is added to `files:`.** It was not in
    the brief's list. Without it, unit case 23's non-darwin row fails, and the phase-H emoji
    guard loses its red row.
11. **`git push` is on the allowed subcommand list.** The usual commit is followed by
    `&& git push`. Push runs the pre-push hook, and the git-leaves rule covers that the same way
    it covers commit.
12. **The brief says "four parser fixes" and lists five.** All five are covered: (1) by
    Decision 1, (2) by the consumer rule, (3) by the piped rule and the allow-list, (4) by the
    redirect rule, and (5) by Decision 4.

## Neighbours (seen, not built here; scheduling is the owner's)

- A script or hook written as data in one call and run in a later call, and a redirect target
  given by a variable (`> $F`). These are pre-existing (parent phase H's debt list, item b). The
  data rule widens the first slightly, because a heredoc body naming the file is no longer
  refused as it is written.
- `git commit -m "<plain text>"` whose message names a protected file and contains `>`. That
  is still refused today; only the heredoc forms become data here.
- Shell start-up files (`~/.zshrc`, `~/.bashrc`) written as data and run by a later session.
  This is the same later-call class.
- Functions or aliases from the user's shell start-up that Claude Code's shell snapshot loads (to
  verify: whether the Bash tool sources a snapshot). They could redefine `cat` or `echo` without
  appearing in the command.
- `find … -delete` and `find … -exec` count as reads (an existing limit, `docs/ENFORCEMENT.md`
  line 580).
- The record refusals stay off (`RECORD_REFUSALS_OFF`), so this plan's data rule reaches the
  record specs only through the spawned `main()`.

## Execution Plan

### Step 8: TEST
- [ ] Write hook cases 160–164 in `tests/protect-records.test.js` and unit case 26 in
  `tests/a-link-cannot-leave-the-repository.test.js`, as specified. Each row is collected and the
  case fails once at the end, naming every failed row. Use the hook file's `rowTest` and the unit
  file's `makeRows`.
- [ ] Run `node --test tests/protect-records.test.js tests/a-link-cannot-leave-the-repository.test.js`
  before any source change. Record red: every row of case 160 marked R, for both sessions. Record
  green (guards): every row of cases 161, 162 and 163, case 164's `echo` and `| bash` verdict rows,
  unit case 26, and every existing case. Case 164's 10,000-line heredoc row is recorded, not
  predicted: before Step 10 its lines are about 10,000 segments of operand walks, which can reach
  the budget on a loaded machine and be refused. Any other difference is explained before Step 10.

### Step 9: PREPARE
- [ ] Confirm the parent's tree: `RECORD_REFUSALS_OFF = true` and `bashRefuses` as read here
  (lines 918–938). `isLedgerWrite`'s first line is still the quote-blind split (line 335). Case
  158 is absent and 159 is the last case. If any of this differs, STOP and report.
- [ ] Prove the attacks are real. In a scratch folder outside the repository, with its own
  `.ctoc/settings.yaml` (no file of this project named in any command), run every case-161 row
  under `bash` and under `zsh` from a Node script with an argument array. The script first takes
  `fs.realpathSync` of its working folder and of the project root, and refuses to run anything
  unless the working folder is outside the project root. A wrong working folder would overwrite
  the project's real settings file, which only the menu writes. The parent's scan already proved
  the original nine; re-running them is allowed, but proving the new rows is required. Record, per row and per
  shell, whether the scratch file changed. A row that changes nothing in either shell is reported:
  it is a behaviour row, not an attack. Record which shell Claude Code's Bash tool uses, with the
  source read, or mark it unverified.
- [ ] Before-numbers: `npm test` totals; dead exports and unreachable files from the fences'
  analysers; the eight Step 9 medians of the parent (its `bench.js` shape) plus Bash
  `git commit -m "$(cat <<'EOF' … EOF)"` with a 20-line message.

### Step 10: IMPLEMENT
- [ ] `src/hooks/PreToolUse.Bash.js`:
  - add `SPENT`, `SAFE_PROGRAMS`, `SAFE_GIT_SUBCOMMANDS`, `HEREDOC_DELIMITER_RE`,
    `LEX_BUDGET_STRIDE` and `reductionCache`;
  - add `lexCommand`, `allowed`, `cutSpans` and `reduceDataText` above `isLedgerWrite`, each with
    JSDoc;
  - make `isLedgerWrite`'s first line the three lines specified, with its docblock paragraph;
  - write no `try`/`catch` and no new export.
- [ ] `tests/protect-records.test.js` case 159 and `tests/a-link-cannot-leave-the-repository.test.js`
  case 23: change the two rows named in Decision 8, each with its one-line reason.
- [ ] Run the two Step 8 files: all green.

### Step 11: REVIEW
- [ ] Prove the guards can fail. Make each change once, run the two Step 8 files, quote the red
  rows, then revert. Check the sha256 of the changed files and of `git diff` before and after:
  - (a) `reduceDataText` always returns `null`: red is exactly case 160's R rows.
  - (b) the allow-list replaced by the brief's deny-list, so any program not in
    `bash sh zsh dash ksh fish node deno bun python python3 perl ruby php osascript eval source . exec xargs`
    passes, and `git` options pass: red are case 161's rows for `./s.sh`, `chmod`, `alias`,
    `PATH=.`, `git -c`, the redefined `echo`, `awk`, `patch`, `git apply`, `git am`, `/bin/ba?h`
    and `$SHELL`. The executor lists the exact set.
  - (c) the git-leaves rule removed: red are the two overwritten-hook rows and the `git -c` row's
    data half.
  - (d) the commit form accepting any `$(` inside `git commit`: red are case 161's attacked-form
    rows.
  - (e) the delimiter whitelist replaced by "strip one pair of surrounding quotes": red are the
    `<<$'EOF'` and mixed-quote rows.
  - (f) `<<-` tab stripping removed: red is the tab-indented delimiter row of case 161. Case
    160's `<<-` row turns red too, because there is no delimiter and so no reduction.
  - (g) rule 6 removed: red is the comment row.
  - (h) rule 4 removed: red is the escaped-quote row.
  - (i) the piped rule removed: no attack row red (Decision 7); red is the
    `echo 'names …' | tee notes.txt` behaviour row.
  - (j) rule 7 removed, reducing what was read so far: red are case 162's three refused rows.
  - (k) a `throw` placed at the top of `reduceDataText`. The fail rule (read: `protect-records.js`
    lines 1019–1035, header lines 152–164) fails closed only when the tool input matches
    `UNCHECKED_SUSPECT_RE` (`.ctoc`, `approval`, `verify` …), or, for a background agent, names a
    settings file. Predicted: every row naming `.ctoc` is refused with `REFUSAL_UNCHECKED`. Case
    149's `echo x > src/h.yaml` (a hard link to the settings file) and case 145's link rows
    without `.ctoc` in the text are ALLOWED: a throw here fails open for those. That is why the
    function must not be able to throw. Record which rows fail open; this mutation is evidence
    for the critic, not a guard.
  - (o) rule 8 removed: red are the `>!`, `>>!` and `&>!` rows.
  - (p) rule 9 removed: red is the `>>|` row, if the lexer reads `|` as its target; otherwise the
    row is recorded as green with the reason.
  - (l) the parent's phase-D operand-cap line removed: red is case 163's `cp a0 … a129` row.
  - (m) the parent's phase-H unit rule back to code points: red are case 163's and unit 26's emoji
    rows.
  - (n) the parent's phase-G code-point rule back to bytes: red is unit 26's `あ` row on darwin.

  Any red outside a prediction, or a predicted red that stays green, is explained before the
  critic runs.
- [ ] Dispatch `iron-loop-critic`. It reads the calls, not text matches. It checks:
  - the reduced text is the original minus spans, with every redirect target and every
    non-data argument byte-identical;
  - every branch that cannot classify returns `null`;
  - no throw is possible;
  - the allow-list holds only programs that run no text;
  - the git-leaves rule covers every write redirect form and `tee`;
  - `bashRefuses`, `RECORD_REFUSALS_OFF` and `protect-records.js` are unchanged;
  - the cache cannot return a result for a different string.

### Step 12: OPTIMIZE
- [ ] Measure Step 9's medians again (20 spawned runs each) and quote them beside the
  baseline with the load average. More than 20 ms added on an ordinary call stops the build and is
  reported.
- [ ] Quote case 164's times. Measure once each, outside the test suite: a 5-megabyte `echo` word,
  and a 5-megabyte heredoc body. Each must finish within 6 s, or be refused at the budget. Quote
  the times and verdicts.

### Step 13: SECURE
- [ ] Dispatch `security-scanner` on the diff. Ask it to:
  - try to make `reduceDataText` remove a span that bash or zsh would run, or keep a target it
    would not;
  - try every member of the allow-list as a code runner (options, environment, configuration a
    previous call wrote);
  - try heredoc and quote confusion (CRLF, tabs, Unicode spaces and quotes, NUL, very long lines);
  - try the commit form;
  - try the cache;
  - check the budget and the cost.

  It confirms each Neighbour and Risk is real and names any missing one.

### Step 14: VERIFY
- [ ] Run `npm test` (the gated entry point): 0 failed, 0 skipped, coverage at or above
  `.ctoc/coverage-baseline.json` `minPct`. Read `PreToolUse.Bash.js`'s branch coverage. An
  uncovered branch of `reduceDataText` gets a row (back to Step 8 for that row), never an ignore
  comment.
- [ ] `npx eslint . --max-warnings 0` exits 0, and `npm run typecheck` exits 0.
- [ ] `git diff --stat` shows only the four files. `hooks/hooks.json`, `protect-records.js` and
  `real-path-confinement.js` are unchanged. Dead exports and unreachable files are not higher than
  at Step 9.

### Step 15: DOCUMENT
- [ ] Before the edit, search `tests/fixtures/claude-md-rule-inventory.json` for `plain text`,
  `heredoc`, `safe consumer` and `echo`, and record the matches. (Read at planning time: no match
  for "plain text", "heredoc" or "echo" among its rules; the three `shell` matches are other
  sentences.)
- [ ] `docs/ENFORCEMENT.md`: replace the bullet that starts "plain text on the shell is still read
  as text" (read: lines 621–628) with one bullet. It says:
  - what is data: the words of an `echo` or `printf` whose output is not piped, and a heredoc body
    fed to `cat`, `tee`, `git commit -F -` or the commit form `git commit -m "$(cat <<'EOF' … EOF)"`;
  - that this holds only when every program in the command is on the list (name the list) and no
    git runs while data is written to a file;
  - that anything else (a substitution, a backslash, a comment, a brace or parenthesis, an
    unusual heredoc delimiter, an open quote) is read as before;
  - the measured cost from Step 12;
  - the cases, hook 160–164 and unit 26;
  - the later-call limit, from Neighbours.

  Touch no other sentence.
- [ ] Run `node --test tests/claude-md-keeps-every-rule.test.js tests/protect-records.test.js`:
  green.

### Step 16: FINAL-REVIEW
- [ ] Dispatch `iron-loop-critic` against every acceptance criterion. Each box quotes its
  evidence: Step 8's red record, Step 9's shell proof, Step 11's reds, and Step 12's numbers.
- [ ] After the owner releases it, in a real session on a scratch CTOC project:
  - run false refusal 5 (the commit form naming `.ctoc/settings.yaml`) and false refusal 1
    (the `echo`), from the main session and from a background agent;
  - run `echo 'echo x > .ctoc/settings.yaml' | bash`, which is refused;
  - quote each answer exactly and record the shell.

  Until the release, report this box as not run.
