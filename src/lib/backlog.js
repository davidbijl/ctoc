'use strict';

/**
 * Backlog: park a blocked functional plan out of every decision list, and bring it back later.
 *
 * Some functional plans cannot move for reasons outside the project. Left in `plans/functional/` they are
 * listed as a pending decision every time the owner opens the menu. `parkPlan` moves one to
 * `plans/backlog/`, a side folder that no decision list reads (the lists name their folders, so nothing
 * else changes). `restorePlan` brings it back to `plans/functional/` as an unapproved draft: its old
 * approval is gone, so it goes through the point where the owner approves the requirements like any new plan.
 *
 * WHO RUNS IT. Only the owner parks or restores a plan. The rule is a rule, not a lock: the one live caller is
 * `src/scripts/backlog.js`, which the owner runs or the session runs at his word. No menu route reaches it.
 *
 * THE ORDER, AND WHY. Check, withdraw the approval record, confirm the record file is gone, write, move.
 * Every refusal comes before the first write, so a refused call changes nothing. The record is keyed by the
 * lower-cased file name alone, so a surviving record would accept the plan in `implementation/`; the ledger's
 * own `removeEntry` ignores a failed delete, so this module checks that the file is really gone. The name
 * check refuses when any folder under `plans/` holds the same name, so a call can never remove the record
 * of a different plan that shares the name. If the move fails after the rewrite, the original bytes are
 * written back, so a retry never loses the `parked:` / `blocked:` text. A write that fails (a full disk can
 * leave the file cut short) is put back the same way, and the refusal says what was and was not changed: whether
 * the record had already been removed and whether the text is as it was.
 *
 * FAIL CLOSED. The call is refused, with nothing changed, when a symbolic link stands where a plan or a plan
 * folder should be (a same-name plan behind a link could not be seen, and its record could be deleted), when
 * the body of the plan would not stay byte for byte as it is (the frontmatter merge can pull a leading `---`
 * rule into the frontmatter), and when the reason would be longer than 2000 characters (never cut silently).
 *
 * WHAT IT NEVER TOUCHES. The plan's questions, the owner's answers and the plan body. Only the frontmatter is
 * rewritten (through `upsertMarkerFields`, which also drops the approval marker keys), and the only deletion
 * is the plan's own approval record, through the ledger's `removeEntry`.
 *
 * @module backlog
 */

const path = require('path');
const safeFs = require('./safe-fs');
const ledger = require('./approval-ledger');
const { upsertMarkerFields } = require('./frontmatter-merge');
const { movePlan } = require('./actions');

/** A bare plan file name: the same rule as SAFE_PLAN_FILE in streaming-gate.js, which is not exported. */
const SAFE_FILE = /^[A-Za-z0-9_][A-Za-z0-9._-]*\.md$/;
/** A top-level frontmatter key line: the same pattern as topLevelKey in frontmatter-merge.js. */
const TOP_KEY = /^([^\s:#][^:]*):(?:\s|$)/;
/** The block-scalar indicator after `key:` (`|`, `>`, `|-`, `>2`). */
const BLOCK_INDICATOR = /^[|>][0-9+-]*$/;
/** The owner's approval notes, which restore removes. */
const GATE_NOTE = /^gate_[0-9]+_approved$/;
/** C0 and C1 controls, the line and paragraph separators and the direction controls: one line, no tricks. */
const CONTROL = /[\x00-\x1f\x7f-\x9f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g;
/** An unindented list item under a key with an empty value (`- item`). */
const LIST_LINE = /^-(\s|$)/;
/** The longest `backlog_reason` text this tool writes. */
const MAX_REASON = 2000;

/**
 * @typedef {object} BacklogDeps
 * @property {(slug: string, projectPath: string) => void} [removeEntry] - defaults to the ledger's own
 * @property {(file: string, data: string|Buffer) => void} [writeFile] - the one write of the plan file (the
 *   rewrite, and the put-back of the original bytes); defaults to `safe-fs` writeFileSync. A seam for tests
 *   that must make a write fail, cut it short, or fail the put-back.
 */

/**
 * @param {string} message
 * @param {'BACKLOG_BAD_NAME'|'BACKLOG_REFUSED'} code
 * @returns {Error & {code: string}}
 */
function refusal(message, code) {
  return Object.assign(new Error(message), { code });
}

/**
 * Text that is safe on one line: every control character becomes a space.
 * @param {unknown} text
 * @returns {string}
 */
function plain(text) {
  return String(text).replace(CONTROL, ' ');
}

/** @param {unknown} file @throws {Error} `BACKLOG_BAD_NAME` */
function checkName(file) {
  if (typeof file !== 'string' || !SAFE_FILE.test(file) || file.includes('..')) {
    throw refusal(
      `"${plain(file)}" is not a plan file name: give the bare name, such as my-plan.md, using only letters, digits, ".", "_" and "-".`,
      'BACKLOG_BAD_NAME',
    );
  }
}

/** @param {unknown} projectPath @throws {Error} `BACKLOG_REFUSED` */
function checkRoot(projectPath) {
  if (typeof projectPath !== 'string' || projectPath === '') {
    throw refusal('The project folder was not given, so nothing was changed.', 'BACKLOG_REFUSED');
  }
}

/**
 * Every plan file whose name equals `file` in lower case, in any folder directly under `plans/`. An absent
 * `plans/` holds none; an unreadable one throws, so a clash is never assumed absent. A symbolic link directly
 * under `plans/` is refused, not followed: a same-name plan behind it could not be seen, and its approval
 * record could be deleted.
 * @param {string} root
 * @param {string} file
 * @returns {Array<{folder: string, name: string}>}
 * @throws {Error} `BACKLOG_REFUSED` when a symbolic link stands directly under `plans/`
 */
function sameNamePlans(root, file) {
  const plansDir = path.join(root, 'plans');
  if (!safeFs.existsSync(plansDir)) return [];
  const wanted = file.toLowerCase();
  const matches = [];
  for (const folder of safeFs.readdirSync(plansDir, { withFileTypes: true })) {
    if (folder.isSymbolicLink()) {
      throw refusal(
        `plans/${plain(folder.name)} is a symbolic link, so this tool cannot see whether a plan with the same name sits behind it. Nothing was changed.`,
        'BACKLOG_REFUSED',
      );
    }
    if (!folder.isDirectory()) continue;
    for (const name of safeFs.readdirSync(path.join(plansDir, folder.name))) {
      if (name.toLowerCase() === wanted) matches.push({ folder: folder.name, name });
    }
  }
  return matches;
}

/** @param {{folder: string, name: string}} match @returns {string} */
function relPath(match) {
  return plain(`plans/${match.folder}/${match.name}`);
}

/**
 * The sentence for a plan that is not in the folder this action needs.
 * @param {string} file
 * @param {string} from - the folder the plan must be in
 * @param {Array<{folder: string, name: string}>} matches
 * @returns {string}
 */
function placeMessage(file, from, matches) {
  if (matches.length === 0) return `There is no plans/${from}/${file}, so nothing was changed.`;
  let text = `${file} is not in plans/${from}/; it is at ${relPath(matches[0])}. Nothing was changed.`;
  if (from === 'functional' && matches.some((m) => m.folder === 'implementation')) {
    text += ' To park a plan that is in technical planning, first ask in the conversation to reject it back to functional planning, then park it.';
  }
  return text;
}

/**
 * Split the text `upsertMarkerFields` returns: it always starts with `---\n`, and its first `\n---\n` is the
 * closing fence.
 * @param {string} text
 * @returns {{lines: string[], rest: string}}
 */
function splitBlock(text) {
  const close = text.indexOf('\n---\n', 3);
  return { lines: text.slice(4, close).split('\n'), rest: text.slice(close + 5) };
}

/**
 * The inverse of {@link splitBlock}.
 * @param {string[]} lines
 * @param {string} rest
 * @returns {string}
 */
function joinBlock(lines, rest) {
  return `---\n${lines.join('\n')}\n---\n${rest}`;
}

/** @param {string} line @returns {string|null} the key of a top-level `key:` line, else null */
function topLevelKey(line) {
  const m = TOP_KEY.exec(line);
  return m ? m[1].trim() : null;
}

/** The text after the first colon of a `key: value` line, trimmed. */
function valueOf(line) {
  return line.slice(line.indexOf(':') + 1).trim();
}

/**
 * The index of the last line that belongs to the key at `at`: its indented and blank lines and, when the key's
 * own value is empty, the unindented `- item` lines directly under it (the form CTOC's own reader accepts). A
 * comment line at column 0 belongs only when more of the list follows it.
 * @param {string[]} lines
 * @param {number} at
 * @returns {number}
 */
function blockEnd(lines, at) {
  const listLike = valueOf(lines[at]) === '';
  let end = at;
  for (let k = at + 1; k < lines.length; k++) {
    const line = lines[k];
    if (line.trim() === '' || /^\s/.test(line) || (listLike && LIST_LINE.test(line))) end = k;
    else if (!(listLike && line.startsWith('#'))) break;
  }
  return end;
}

/**
 * Strip one pair of surrounding quotes and undo that quoting's escapes. Other escapes stay as written.
 * @param {string} text
 * @returns {string}
 */
function unquote(text) {
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replace(/''/g, "'");
  }
  return text;
}

/**
 * A key's value on one line: the text after `key:` and the lines that belong to it (see {@link blockEnd}),
 * joined with single spaces, without a block indicator, and without the quotes around it. When the key's own
 * value is empty and a list follows, each `- item` is one item (quotes removed per item) and the items are
 * joined with `; `.
 * @param {string[]} lines
 * @param {string} key
 * @returns {string} '' when the key is absent
 */
function noteText(lines, key) {
  const at = lines.findIndex((line) => topLevelKey(line) === key);
  if (at < 0) return '';
  const head = valueOf(lines[at]);
  const tail = lines.slice(at + 1, blockEnd(lines, at) + 1)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.trim())
    .filter((line) => line !== '');
  if (head === '' && tail.length > 0 && LIST_LINE.test(tail[0])) {
    const items = [];
    for (const line of tail) {
      if (LIST_LINE.test(line)) items.push(line.slice(1).trim());
      else items[items.length - 1] += ` ${line}`;
    }
    return items.map(unquote).filter((item) => item !== '').join('; ');
  }
  const parts = (BLOCK_INDICATOR.test(head) ? tail : [head, ...tail]).filter((part) => part !== '');
  return unquote(parts.join(' '));
}

/**
 * Remove each top-level key line for which `drop(key)` is true, with the lines that belong to it (see
 * {@link blockEnd}).
 * @param {string[]} lines
 * @param {(key: string) => boolean} drop
 * @returns {string[]}
 */
function dropKeys(lines, drop) {
  const kept = [];
  let k = 0;
  while (k < lines.length) {
    const key = topLevelKey(lines[k]);
    if (key !== null && drop(key)) {
      k = blockEnd(lines, k) + 1;
    } else {
      kept.push(lines[k]);
      k++;
    }
  }
  return kept;
}

/**
 * One double-quoted YAML line value. Never cut. `text` has no control characters (see {@link plain}).
 * @param {string} text
 * @returns {string}
 */
function yamlQuoted(text) {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Withdraw the plan's approval record and confirm its file is gone. A name the record cannot key holds no
 * record, so there is nothing to withdraw. The ledger's `removeEntry` ignores a failed delete, so the file
 * is looked at afterwards.
 * @param {string} file
 * @param {string} root
 * @param {(slug: string, projectPath: string) => void} removeEntry
 * @returns {boolean} whether a record file existed and is now gone
 */
function withdrawRecord(file, root, removeEntry) {
  const slug = ledger.slugFromPlanPath(file);
  if (ledger.readEntryResult(slug, root).status === 'unkeyable') return false;
  const target = ledger.ledgerPath(slug, root);
  const existed = safeFs.existsSync(target);
  const base = `The approval record for ${file} could not be removed, so nothing was moved or changed.`;
  try {
    removeEntry(slug, root);
  } catch (err) {
    throw refusal(`${base} (${plain(err && err.message ? err.message : err)})`, 'BACKLOG_REFUSED');
  }
  if (safeFs.existsSync(target)) throw refusal(base, 'BACKLOG_REFUSED');
  return existed;
}

/**
 * The body of both actions: check, withdraw, confirm gone, write, move.
 * @param {string} file
 * @param {string} projectPath
 * @param {BacklogDeps} deps
 * @param {string} from - folder the plan is in
 * @param {string} to - folder it moves to
 * @param {(content: string) => {text: string, reason?: string}} rewrite - the new text, computed before any write
 * @returns {{recordRemoved: boolean, reason?: string}}
 */
function relocate(file, projectPath, deps, from, to, rewrite) {
  checkName(file);
  checkRoot(projectPath);
  const removeEntry = deps.removeEntry || ledger.removeEntry;
  const verb = from === 'functional' ? 'park' : 'restore';

  const matches = sameNamePlans(projectPath, file);
  const own = matches.find((m) => m.folder === from && m.name === file);
  if (own === undefined) throw refusal(placeMessage(file, from, matches), 'BACKLOG_REFUSED');
  const other = matches.find((m) => m !== own);
  if (other !== undefined) {
    throw refusal(
      `Refusing to ${verb} ${file}: ${relPath(other)} has the same name, and CTOC keeps one approval record per name, so the two plans share one record. Nothing was changed.`,
      'BACKLOG_REFUSED',
    );
  }

  const source = path.join(projectPath, 'plans', from, file);
  if (safeFs.lstatSync(source).isSymbolicLink()) {
    throw refusal(`plans/${from}/${file} is a symbolic link, so nothing was changed. This tool moves plan files, not links.`, 'BACKLOG_REFUSED');
  }
  const original = safeFs.readFileSync(source);
  const originalText = original.toString('utf8');
  const next = rewrite(originalText);
  // The frontmatter merge can pull a leading `---` rule and the lines after it out of the body, and it drops
  // blank lines there: the body must come out byte for byte, or nothing is touched.
  const expectedBody = bodyAfterFrontmatter(originalText);
  if (expectedBody === null || splitBlock(next.text).rest !== expectedBody) {
    throw refusal(
      `The start of ${file} (its frontmatter or the first lines of its body) is written in a way this tool cannot keep exactly, so nothing was changed.`,
      'BACKLOG_REFUSED',
    );
  }

  const write = deps.writeFile || safeFs.writeFileSync;
  const recordRemoved = withdrawRecord(file, projectPath, removeEntry);
  const recordNote = recordRemoved ? 'Its approval record had already been removed.' : 'No approval record was removed.';
  try {
    write(source, next.text);
  } catch (err) {
    throw refusal(
      `${file} could not be written (${codeOf(err)}), so it was not moved and it is still in plans/${from}/. `
        + `${putBack(write, source, original, `plans/${from}/${file}`, 'Its text is as it was.')} ${recordNote}`,
      'BACKLOG_REFUSED',
    );
  }
  try {
    movePlan(source, to, projectPath);
  } catch (err) {
    throw refusal(
      `${file} could not be moved to plans/${to}/ (${codeOf(err)}). `
        + `${putBack(write, source, original, `plans/${from}/${file}`, 'Its text was put back as it was.')} ${recordNote}`,
      'BACKLOG_REFUSED',
    );
  }
  return { recordRemoved, reason: next.reason };
}

/** @param {unknown} err @returns {string} the error's code on one line, else a plain stand-in */
function codeOf(err) {
  const code = err !== null && typeof err === 'object' ? /** @type {{code?: unknown}} */ (err).code : undefined;
  return code ? plain(code) : 'unknown error';
}

/**
 * Write the original bytes back over a plan whose rewrite or move failed (a full disk can leave the file cut
 * short), and say in one sentence whether that worked.
 * @param {(file: string, data: string|Buffer) => void} write
 * @param {string} source
 * @param {Buffer} original
 * @param {string} shown - the plan's path as the owner reads it
 * @param {string} success - the sentence for a put-back that worked
 * @returns {string}
 */
function putBack(write, source, original, shown, success) {
  try {
    write(source, original);
    return success;
  } catch (err) {
    return `Its text could not be put back (${codeOf(err)}), so check ${shown} in version control.`;
  }
}

/**
 * Everything after the plan's first frontmatter block, read the way the merge reads its fences (a line that is
 * `---` once trimmed, leading blank lines allowed), or null when the text has no closed block at its start.
 * @param {string} text
 * @returns {string|null}
 */
function bodyAfterFrontmatter(text) {
  const lines = text.split('\n');
  let open = 0;
  while (open < lines.length && lines[open].trim() === '') open++;
  if (open >= lines.length || lines[open].trim() !== '---') return null;
  const close = lines.findIndex((line, k) => k > open && line.trim() === '---');
  return close < 0 ? null : lines.slice(close + 1).join('\n');
}

/**
 * Park a functional plan: move it to `plans/backlog/` with `status: backlog` and a `backlog_reason`, and
 * withdraw its approval record. The reason is the owner's words, then the plan's `parked:` note, then its
 * `blocked:` note, joined by `; ` with the empty parts left out; the two notes' keys are removed.
 * @param {string} file - a bare plan file name such as `x.md`
 * @param {string} reason - the owner's words, which may be empty
 * @param {string} projectPath - the project root
 * @param {BacklogDeps} [deps]
 * @returns {{from: string, to: string, reason: string, recordRemoved: boolean}} `reason` is the text written to
 *   `backlog_reason`, unescaped
 * @throws {Error} `BACKLOG_BAD_NAME` or `BACKLOG_REFUSED`; any other error as Node raised it
 */
function parkPlan(file, reason, projectPath, deps = {}) {
  const done = relocate(file, projectPath, deps, 'functional', 'backlog', (content) => {
    const { lines, rest } = splitBlock(upsertMarkerFields(content, [['status', 'backlog']]));
    const parts = [typeof reason === 'string' ? reason : '', noteText(lines, 'parked'), noteText(lines, 'blocked')]
      .map((part) => part.trim())
      .filter((part) => part !== '');
    const text = plain(parts.join('; '));
    if (text.length > MAX_REASON) {
      throw refusal(
        `The reason would be ${text.length} characters long, and the longest this tool writes is ${MAX_REASON}, so nothing was changed. Give a shorter reason.`,
        'BACKLOG_REFUSED',
      );
    }
    const kept = dropKeys(lines, (key) => key === 'parked' || key === 'blocked' || key === 'backlog_reason');
    return { text: joinBlock(kept.concat(`backlog_reason: ${yamlQuoted(text)}`), rest), reason: text };
  });
  return { from: `functional/${file}`, to: `backlog/${file}`, reason: done.reason || '', recordRemoved: done.recordRemoved };
}

/**
 * Restore a parked plan to `plans/functional/` as an unapproved draft: `status: draft`, no `backlog_reason`,
 * no `gate_<n>_approved` note, no approval marker key, and no approval record.
 * @param {string} file - a bare plan file name such as `x.md`
 * @param {string} projectPath - the project root
 * @param {BacklogDeps} [deps]
 * @returns {{from: string, to: string, recordRemoved: boolean}}
 * @throws {Error} `BACKLOG_BAD_NAME` or `BACKLOG_REFUSED`; any other error as Node raised it
 */
function restorePlan(file, projectPath, deps = {}) {
  const done = relocate(file, projectPath, deps, 'backlog', 'functional', (content) => {
    const { lines, rest } = splitBlock(upsertMarkerFields(content, [['status', 'draft']]));
    const kept = dropKeys(lines, (key) => key === 'backlog_reason' || GATE_NOTE.test(key));
    return { text: joinBlock(kept, rest) };
  });
  return { from: `backlog/${file}`, to: `functional/${file}`, recordRemoved: done.recordRemoved };
}

module.exports = { parkPlan, restorePlan };
