/**
 * Inbox — async-overnight queue surface (A3 / CTOC v7)
 *
 * Filesystem queue with three streams under .ctoc/inbox/:
 *   - questions/   morning questions raised by agents
 *   - decisions/   documented choices the implementer took under ambiguity
 *
 * Plus a derived view:
 *   - plansAtGates  plans currently AWAITING a human approval decision at a
 *                   gate — i.e. sitting in a gate SOURCE stage (X3)
 *
 * Inbox is READ-ONLY at its surface — writes come from upstream agents
 * (vision-decomposer creates questions, implementer creates decisions).
 * Per A3 impl plan ADRs 2-3.
 *
 * The one write the owner makes is his ANSWER to a question (`answerQuestion`, reached through the
 * menu route `inbox answer <id> --stdin`). His words arrive on STANDARD INPUT (the main session runs
 * the route with a quoted heredoc; `readStandardInput` reads descriptor 0, bounded), never on the
 * command line and never from a file under .ctoc/inbox/.
 *   - THE RECORD: .ctoc/streaming/inbox-answers.jsonl, one JSON object per line
 *     `{ id, answer, answeredAt }`. Only that record answers a question (a status line alone never
 *     does). It is read and appended through descriptors that must be one regular file with one hard link,
 *     never a link, and only while `.ctoc` and `.ctoc/streaming` are real folders. After the append it is
 *     read back: the answer counts as recorded only when the first entry for the id is ours.
 *   - THE CLAIM: before the record is written the answer takes an exclusive claim,
 *     .ctoc/streaming/inbox-answered/<id>.json (created with O_EXCL): of two answers that both found the
 *     question open, exactly one create succeeds and only that one is recorded. A claim is trusted only as
 *     an exact `{ id, answer, answeredAt }` entry for its own question.
 *   - THE CHANNEL: standard input (see `readStandardInput`), capped at MAX_ANSWER_BYTES.
 * The record and the claim live under .ctoc/streaming/, which CTOC's write protection keeps from every
 * editing tool. Every file the route reads (record, claim, question file) is read through
 * `readRegularFile`, the one descriptor reader.
 */

const fs = require('fs'); // only the open-flag constants and the descriptor calls; every path call goes through safe-fs
const crypto = require('crypto');
const safeFs = require('./safe-fs');
const path = require('path');
// CF1: `invalidate` busts the read cache on every count-mutating write (reuses
// the existing cache require — no new import needed).
const { memoize, invalidate } = require('./cache');
// W07-s4 (finding H1): the shared CRLF-safe frontmatter reader. Aliased to avoid
// clashing with this module's own colon-split `parseFrontmatter` below. A plan
// checked out on Windows (CRLF) must parse byte-identically to its LF twin.
const { parseFrontmatter: splitFm, FRONTMATTER_BLOCK } = require('./frontmatter');

// SP1 cheap stale-plan scan. Imported as a NAMESPACE (not destructured) so the
// call site is late-bound: SP2 tests rewire staleDetector.scanCheapCandidates on
// the live module object at the require boundary. A destructured import would
// capture the function reference at load time and defeat that seam.
// Contract (frozen in SP1): scanCheapCandidates(root, { nowMs }?) =>
//   { candidates: Array<{plan:string, stage:'functional'|'implementation'|'review',
//     signals:Array<'missing-files'|'advisory:age'>, actionable:boolean}>, count:number }
const staleDetector = require('./stale-detector');

const QUESTIONS_DIR = ['.ctoc', 'inbox', 'questions'];
const DECISIONS_DIR = ['.ctoc', 'inbox', 'decisions'];
const ANSWER_RECORD = ['.ctoc', 'streaming', 'inbox-answers.jsonl'];
const ANSWER_CLAIMS_DIR = ['.ctoc', 'streaming', 'inbox-answered'];
// The folders above the record and the claims, outermost first; each must be a real folder, not a link.
const STREAMING_CHAIN = [['.ctoc'], ['.ctoc', 'streaming']];
// The one shape answeredAt has (Date#toISOString): anything else in a claim or a record line is not ours.
const ANSWERED_AT_RE = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

// The shape generateSlug() writes: a millisecond time, a dash, six base-36 characters.
const QUESTION_ID_RE = /^\d{13,15}-[a-z0-9]{6}$/;
const MAX_ANSWER_BYTES = 16384;
const MAX_QUESTION_BYTES = 262144;
// The record grows by one short line per answer; far past this size it is not ours to trust or to read.
const MAX_RECORD_BYTES = 8388608;
// A claim is one JSON entry: an answer of MAX_ANSWER_BYTES can escape to six characters per byte.
const MAX_CLAIM_BYTES = MAX_ANSWER_BYTES * 6 + 1024;
// Open flags. O_NOFOLLOW (never follow a link) and O_NONBLOCK (never wait on a named pipe) do not exist
// on Windows, where they read as 0.
const NOFOLLOW = fs.constants.O_NOFOLLOW || 0;
const NONBLOCK = fs.constants.O_NONBLOCK || 0;
const READ_FLAGS = fs.constants.O_RDONLY | NOFOLLOW | NONBLOCK;
const APPEND_FLAGS = fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_CREAT | NOFOLLOW | NONBLOCK;
const CLAIM_FLAGS = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | NOFOLLOW;
// What start.js hands the route when standard input could not be read (as opposed to undefined: nothing sent).
const STDIN_UNREADABLE = Symbol('standard input could not be read');
// A claim older than this belongs to a writer that died; it is repaired or set aside, never waited for.
const STALE_CLAIM_MS = 60000;
// The prefix of the heredoc end marker the session makes for every answer (start.md).
const MARKER_PREFIX = 'CTOC_ANSWER_';
// Windows can hold a file for a moment (an antivirus, an indexer): only these codes are retried.
const TRANSIENT_RENAME_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);
const RENAME_RETRIES = 5;
const RENAME_RETRY_MS = 20;

// Gate SOURCE stages: a plan sitting in one of these stages is AWAITING the
// human's approval decision to cross the named gate. Destination stages
// (implementation/todo/done) are where APPROVED plans land — a plan there has
// already crossed its gate, so it is not "waiting" and is not counted.
//   functional      → Gate 1 (functional → implementation)
//   implementation  → Gate 2 (implementation → todo)
//   review          → Gate 3 (review → done)
const HUMAN_GATE_SOURCE_STAGES = Object.freeze({
  functional: 1,
  implementation: 2,
  review: 3,
});

function getQuestionsDir(root) { return path.join(root, ...QUESTIONS_DIR); }
function getDecisionsDir(root) { return path.join(root, ...DECISIONS_DIR); }

function ensureDir(dir) {
  if (!safeFs.existsSync(dir)) safeFs.mkdirSync(dir, { recursive: true });
}

/**
 * I8: generate a slug from timestamp + 6-char random suffix.
 * Tests cover 20+ rapid successive calls producing unique slugs.
 */
function generateSlug() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${ts}-${rand}`;
}

/**
 * A front-matter value on one line: every line break becomes a space. The three non-ASCII
 * terminators (NEL, line separator, paragraph separator) are written as \u escapes, never as
 * literal characters (a literal U+2028/U+2029 in a regular-expression literal is a SyntaxError);
 * YAML 1.1 counts all three as line breaks.
 * @param {unknown} value
 * @returns {string}
 */
function oneLine(value) {
  return String(value == null ? '' : value).replace(/\r\n|[\r\n\u0085\u2028\u2029]/g, ' ');
}

/**
 * Create a question file for morning review. Every front-matter value (source_plan,
 * source_step) is written on ONE line (line breaks become spaces), so a value can never add a
 * front-matter line such as a second `status:`; the question and context bodies stay as given.
 * @param {Object} opts - { source_plan, source_step, question, context }
 * @param {string} root
 * @returns {{ id: string, path: string }}
 */
function createQuestion(opts, root) {
  const dir = getQuestionsDir(root);
  ensureDir(dir);
  const id = generateSlug();
  const filePath = path.join(dir, `${id}.md`);
  const content = `---
id: ${id}
created: ${new Date().toISOString()}
source_plan: ${oneLine(opts.source_plan)}
source_step: ${oneLine(opts.source_step)}
status: open
---

## Question

${opts.question || ''}

## Context

${opts.context || ''}
`;
  safeFs.writeFileSync(filePath, content);
  // CF1: a new question file changes getInboxCounts().questions — bust the read
  // cache AFTER the successful write.
  invalidate();
  return { id, path: filePath };
}

/**
 * Create a decision file (implementer's documented choice under ambiguity). Every front-matter
 * value (plan, step, ambiguity, choice, rationale) is written on ONE line (line breaks become
 * spaces, before the quote escaping), so a value can never add a front-matter line such as a
 * second `status:`; the Ambiguity, Choice and Rationale bodies stay as given.
 * @param {Object} opts - { plan, step, ambiguity, choice, rationale }
 * @param {string} root
 * @returns {{ id: string, path: string }}
 */
function createDecision(opts, root) {
  const dir = getDecisionsDir(root);
  ensureDir(dir);
  const id = generateSlug();
  const filePath = path.join(dir, `${id}.md`);
  const content = `---
id: ${id}
created: ${new Date().toISOString()}
plan: ${oneLine(opts.plan)}
step: ${oneLine(opts.step)}
ambiguity: "${oneLine(opts.ambiguity).replace(/"/g, '\\"')}"
choice: "${oneLine(opts.choice).replace(/"/g, '\\"')}"
rationale: "${oneLine(opts.rationale).replace(/"/g, '\\"')}"
status: pending-review
---

## Ambiguity

${opts.ambiguity || ''}

## Choice

${opts.choice || ''}

## Rationale

${opts.rationale || ''}
`;
  safeFs.writeFileSync(filePath, content);
  // CF1: a new decision file changes getInboxCounts().decisions — bust the read
  // cache AFTER the successful write.
  invalidate();
  return { id, path: filePath };
}

// W07-s4 (finding H1): CRLF-safe via the shared reader. Delegates fence detection
// and \r-normalization to ./frontmatter, then applies the UNCHANGED colon-split /
// unquote logic so CRLF inbox items parse byte-identically to their LF twins.
/**
 * @param {string} content - the raw file content
 * @returns {{[key: string]: string}} every frontmatter key mapped to its
 *   (unquoted, trimmed) string value; an empty map when there is no frontmatter
 */
function parseFrontmatter(content) {
  const { hasFrontmatter, lines } = splitFm(content);
  if (!hasFrontmatter) return {};
  /** @type {{[key: string]: string}} */
  const out = {};
  for (const line of lines) {
    const c = line.indexOf(':');
    if (c > 0) {
      const k = line.slice(0, c).trim();
      let v = line.slice(c + 1).trim();
      v = v.replace(/^["']|["']$/g, '');
      out[k] = v;
    }
  }
  return out;
}

/**
 * An error that carries a platform-style `code`, for a refusal the operating system did not make.
 * @param {string} code
 * @returns {Error & {code: string}}
 */
function refusal(code) {
  return Object.assign(new Error(code), { code });
}

/**
 * The one descriptor reader. It ALWAYS lstats the path first (with { bigint: true }, so a 64-bit inode
 * is not rounded) and refuses unless the entry is a regular file: a folder, a link, a named pipe or a
 * device throws ENOTREG before anything is opened, so a pipe can never block the open. Then it opens the
 * path (without following a link and without waiting where the platform has O_NOFOLLOW and O_NONBLOCK:
 * on macOS and Linux a link swapped in after the lstat gives ELOOP; Windows has neither flag, there both
 * are 0 and the next check is what refuses it), requires the open descriptor to be a regular file with
 * the SAME device and inode the lstat saw (a different file gives ESTALE), requires its size to be at
 * most `maxBytes`, reads exactly that many bytes through the descriptor, and closes it in `finally`.
 * With `singleLink` the file must also have exactly one hard link (EMLINK otherwise): a second name for
 * the same file would let a write through another path reach it. Anything else throws: a missing entry
 * with the operating system's own code (ENOENT), an oversized file with EFBIG.
 * @param {string} filePath
 * @param {number} maxBytes
 * @param {boolean} [singleLink] refuse a file with more than one hard link (the answer record)
 * @returns {string} the file's text (UTF-8)
 */
function readRegularFile(filePath, maxBytes, singleLink) {
  const seen = safeFs.lstatSync(filePath, { bigint: true });
  if (!seen.isFile()) throw refusal('ENOTREG');
  if (singleLink && seen.nlink !== 1n) throw refusal('EMLINK');
  let fd = -1;
  try {
    fd = safeFs.openSync(filePath, READ_FLAGS);
    const st = fs.fstatSync(fd, { bigint: true });
    if (!st.isFile()) throw refusal('ENOTREG');
    if (st.dev !== seen.dev || st.ino !== seen.ino) throw refusal('ESTALE');
    if (singleLink && st.nlink !== 1n) throw refusal('EMLINK');
    if (st.size > BigInt(maxBytes)) throw refusal('EFBIG');
    // Read exactly the size the descriptor reported (already capped): a file that grows meanwhile is cut.
    const buf = Buffer.alloc(Number(st.size));
    let got = 0;
    while (got < buf.length) {
      const n = fs.readSync(fd, buf, got, buf.length - got, null);
      if (n === 0) break;
      got += n;
    }
    return buf.toString('utf8', 0, got);
  } finally {
    if (fd !== -1) fs.closeSync(fd);
  }
}

/**
 * @param {string} dir - the queue directory to scan
 * @param {string} [statusFilter] - keep only items whose `status` frontmatter
 *   equals this value
 * @returns {Array<{[key: string]: string}>} one string-keyed map per `.md` item
 *   (all frontmatter fields plus `path`)
 */
function listItemsInDir(dir, statusFilter) {
  if (!safeFs.existsSync(dir)) return [];
  let names;
  try {
    names = safeFs.readdirSync(dir);
  } catch {
    // A folder that cannot be listed (a plain file where the folder should be: ENOTDIR) is an empty
    // list, never a throw that prints an absolute path.
    return [];
  }
  /** @type {Array<{[key: string]: string}>} */
  const items = [];
  for (const f of names) {
    if (!f.endsWith('.md') || f === '.gitkeep') continue;
    const filePath = path.join(dir, f);
    // Only a regular file of a sane size is an item: a folder, a link, a pipe or a file over
    // MAX_QUESTION_BYTES is left out of the list (never followed, never waited on), and an entry that
    // cannot be read never breaks the list for the others.
    try {
      items.push({ ...parseFrontmatter(readRegularFile(filePath, MAX_QUESTION_BYTES)), path: filePath });
    } catch {
      continue;
    }
  }
  return items.filter(item => !statusFilter || item.status === statusFilter);
}

/**
 * The open questions: status `open` AND no entry in the answer record for the file's own id.
 * @param {string} root
 */
function listQuestions(root) {
  const answered = readAnswerRecord(root);
  return listItemsInDir(getQuestionsDir(root), 'open')
    .filter(item => !answered.has(path.basename(item.path, '.md')));
}

function listDecisions(root) {
  return listItemsInDir(getDecisionsDir(root), 'pending-review');
}

/** A short random token for file names the answer route makes (temporary, aside, failed). */
function randomToken() {
  return crypto.randomBytes(6).toString('hex');
}

/**
 * The one name for a claim moved aside: `<claim>.<kind>-<pid>-<token>`. `kind` is `unreadable` (a torn or
 * half-written claim, nobody trusts it) or `failed` (its answer could not be recorded).
 * @param {string} claimFile
 * @param {('unreadable'|'failed')} kind
 * @returns {string}
 */
function asideName(claimFile, kind) {
  return `${claimFile}.${kind}-${process.pid}-${randomToken()}`;
}

/**
 * Whether every folder on a chain below `root` (outermost first) is a real folder, not a link. The one
 * folder check: it guards the status-line rename (the questions folder) and the answer record and claims
 * (the streaming folder). With `allowAbsent` a folder that does not exist yet is fine (nothing there to
 * follow); any other problem is not.
 * @param {string} root
 * @param {string[][]} chain
 * @param {boolean} allowAbsent
 * @returns {{ok: boolean, last: (import('fs').Stats|null)}} `last` is the lstat of the innermost folder
 */
function folderChain(root, chain, allowAbsent) {
  let last = null;
  for (const parts of chain) {
    try {
      last = safeFs.lstatSync(path.join(root, ...parts));
    } catch (err) {
      return { ok: allowAbsent && !!err && err.code === 'ENOENT', last: null };
    }
    if (!last.isDirectory()) return { ok: false, last };
  }
  return { ok: true, last };
}

/**
 * Block for `ms` without spinning and without a shell: `Atomics.wait` on a private, never-notified
 * SharedArrayBuffer always times out after `ms` (a copy of src/lib/audit-chain.js, which does not
 * export its own).
 * @param {number} ms
 */
function sleepSync(ms) {
  if (!(ms > 0)) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * The answer record as a map id → { answer, answeredAt }. A line is read only when it parses and holds
 * a string `id` and a string `answer`; blank and torn lines are skipped; the first entry for an id wins.
 * An `answeredAt` that is not the ISO shape (ANSWERED_AT_RE) is read as null; the answer is still counted.
 * An absent record is an empty map. A record that cannot be read (a link, a folder, a pipe, a file with a
 * second hard link, over MAX_RECORD_BYTES, an error) is an empty map, or with `strict` the read error is
 * thrown, so the answer route can refuse instead of risking a second answer. A strict read first requires
 * `.ctoc` and `.ctoc/streaming` to be real folders (an absent streaming folder is fine: no record yet);
 * a link there is refused with ENOTDIR before anything is opened.
 * @param {string} root
 * @param {{strict?: boolean}} [opts]
 * @returns {Map<string, {answer: string, answeredAt: (string|null)}>}
 */
function readAnswerRecord(root, opts) {
  const strict = !!(opts && opts.strict);
  const answers = new Map();
  if (strict && !folderChain(root, STREAMING_CHAIN, true).ok) throw refusal('ENOTDIR');
  let text;
  try {
    text = readRegularFile(path.join(root, ...ANSWER_RECORD), MAX_RECORD_BYTES, true);
  } catch (err) {
    if (err && err.code === 'ENOENT') return answers;
    if (strict) throw err;
    return answers;
  }
  for (const line of text.split('\n')) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry && typeof entry.id === 'string' && typeof entry.answer === 'string' && !answers.has(entry.id)) {
      const shaped = typeof entry.answeredAt === 'string' && ANSWERED_AT_RE.test(entry.answeredAt);
      answers.set(entry.id, { answer: entry.answer, answeredAt: shaped ? entry.answeredAt : null });
    }
  }
  return answers;
}

/**
 * Whether a question has a recorded answer, from the answer record only: a status line in the question
 * file never answers a question. `opts` goes to readAnswerRecord: with `{ strict: true }` a record that
 * cannot be read throws instead of reading as "no answers".
 * @param {string} root
 * @param {string} id
 * @param {{strict?: boolean}} [opts]
 * @returns {{answered: boolean, answer: (string|null), answeredAt: (string|null)}}
 */
function questionAnswer(root, id, opts) {
  const got = readAnswerRecord(root, opts).get(id);
  return got
    ? { answered: true, answer: got.answer, answeredAt: got.answeredAt }
    : { answered: false, answer: null, answeredAt: null };
}

/** A section's text without the blank lines createQuestion puts around it. */
function trimBlankLines(text) {
  const lines = text.split('\n');
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  return lines.join('\n');
}

/**
 * Read one question file by id. The id must have the shape generateSlug writes before it is joined into
 * a path. `.ctoc`, `.ctoc/inbox` and the questions folder must each be a real folder (a link or a
 * non-folder anywhere: `unreadable`; an absent one: `no-question`), and the exact name `<id>.md` must be in
 * the questions folder's listing (absent: `no-question`; a failed listing: `unreadable`). The file is read through `readRegularFile`, which lstats the entry (a link, a folder or
 * anything not a regular file is refused with ENOTREG: reason `not-a-file`; a missing one is ENOENT:
 * `no-question`), opens it without following a link and requires the open descriptor to be the same
 * regular file the lstat saw. The questions folder's own device and inode are returned as `folder`, for
 * the status-line write to compare against later.
 * @param {string} root
 * @param {string} id
 * @returns {{ok: true, id: string, status: string, created: string, source_plan: string,
 *   source_step: string, question: string, context: string, content: string,
 *   folder: {dev: (number|bigint), ino: (number|bigint)}}
 *   | {ok: false, reason: ('bad-id'|'no-question'|'not-a-file'|'unreadable')}}
 */
function readQuestion(root, id) {
  if (typeof id !== 'string' || !QUESTION_ID_RE.test(id)) return { ok: false, reason: 'bad-id' };
  const dir = getQuestionsDir(root);
  const file = path.join(dir, `${id}.md`);
  // Every folder on the way must be a real folder: a link or a non-folder anywhere is unreadable, an
  // absent one is simply no question.
  const chain = folderChain(root, [['.ctoc'], ['.ctoc', 'inbox'], QUESTIONS_DIR], true);
  if (!chain.ok) return { ok: false, reason: 'unreadable' };
  if (chain.last === null) return { ok: false, reason: 'no-question' };
  const folder = { dev: chain.last.dev, ino: chain.last.ino };
  // The exact name `<id>.md` must be in the listing: a case-insensitive disk would otherwise open an
  // upper-case file for a lower-case id.
  let names;
  try {
    names = safeFs.readdirSync(dir);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  if (!names.includes(`${id}.md`)) return { ok: false, reason: 'no-question' };
  let content;
  try {
    content = readRegularFile(file, MAX_QUESTION_BYTES);
  } catch (err) {
    const code = errorCode(err);
    return { ok: false, reason: code === 'ENOENT' ? 'no-question' : code === 'ENOTREG' ? 'not-a-file' : 'unreadable' };
  }
  const meta = parseFrontmatter(content);
  const questionHeading = /^## Question[ \t]*\r?$/m.exec(content);
  const from = questionHeading ? questionHeading.index + questionHeading[0].length : 0;
  const rest = content.slice(from);
  const contextHeading = /^## Context[ \t]*\r?$/m.exec(rest);
  return {
    ok: true,
    id,
    status: meta.status || '',
    created: meta.created || '',
    source_plan: meta.source_plan || '',
    source_step: meta.source_step || '',
    question: !questionHeading ? '' : trimBlankLines(contextHeading ? rest.slice(0, contextHeading.index) : rest),
    context: contextHeading ? trimBlankLines(rest.slice(contextHeading.index + contextHeading[0].length)) : '',
    content,
    folder,
  };
}

/**
 * Read the owner's words from standard input (descriptor `fd`, 0 for the real thing) into a buffer of
 * MAX_ANSWER_BYTES + 2 bytes, stopping at the end of input or when the buffer is full. A full buffer
 * means the input is too large and is handed on as it is (the size rule refuses it without any further
 * read). No bytes read is `undefined` (no answer). EAGAIN before any byte was read gives `undefined` too
 * (nothing was sent yet); EAGAIN AFTER some bytes is STDIN_UNREADABLE, never a silently shortened answer.
 * An EOF error code (Windows reports the end of a closed pipe that way) is the end of the input; any
 * other read error gives STDIN_UNREADABLE, which `answerQuestion` refuses with its own reason.
 * @param {number} fd
 * @returns {(Buffer|symbol|undefined)}
 */
function readStandardInput(fd) {
  const buf = Buffer.alloc(MAX_ANSWER_BYTES + 2);
  let got = 0;
  try {
    while (got < buf.length) {
      const n = fs.readSync(fd, buf, got, buf.length - got, null);
      if (n === 0) break;
      got += n;
    }
  } catch (err) {
    const code = err && err.code;
    if (code === 'EAGAIN') return got === 0 ? undefined : STDIN_UNREADABLE;
    if (code !== 'EOF') return STDIN_UNREADABLE;
  }
  return got === 0 ? undefined : buf.subarray(0, got);
}

/**
 * Turn the bytes the owner sent into his answer, or name why they are refused. A full read buffer
 * (MAX_ANSWER_BYTES + 2 bytes: `readStandardInput` stopped there, so more may follow) is refused whatever
 * its last bytes are. Otherwise exactly one trailing line break, "\n" or "\r\n" (a piped channel on
 * Windows sends the latter), is removed once BEFORE the size cap applies, so MAX_ANSWER_BYTES bytes plus
 * the "\n" are accepted and one byte more is refused; a byte-order mark is kept. A line that begins (after
 * white space, format characters and default-ignorable characters such as a byte-order mark or a
 * zero-width space) with the end-marker prefix may mean the command did not end where it should, so it
 * is refused.
 * @param {unknown} raw a Buffer (standard input), a string, STDIN_UNREADABLE, or anything else (no answer)
 * @returns {{answer: string} | {reason: string}}
 */
function decodeAnswer(raw) {
  let bytes;
  if (raw === STDIN_UNREADABLE) return { reason: 'answer-unreadable' };
  if (Buffer.isBuffer(raw)) bytes = raw;
  else if (typeof raw === 'string') bytes = Buffer.from(raw, 'utf8');
  else return { reason: 'no-answer' };
  if (bytes.length >= MAX_ANSWER_BYTES + 2) return { reason: 'answer-too-long' };
  // 0x0a and 0x0d never occur inside a multi-byte UTF-8 sequence, so removing them is removing the line break.
  if (bytes.length > 0 && bytes[bytes.length - 1] === 0x0a) {
    bytes = bytes.subarray(0, bytes.length - (bytes.length > 1 && bytes[bytes.length - 2] === 0x0d ? 2 : 1));
  }
  if (bytes.length > MAX_ANSWER_BYTES) return { reason: 'answer-too-long' };
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return { reason: 'answer-not-utf8' };
  }
  if (text.split('\n').some(line => line.replace(/^[\s\p{Cf}\p{Default_Ignorable_Code_Point}]+/u, '').startsWith(MARKER_PREFIX))) {
    return { reason: 'answer-holds-marker' };
  }
  if (text.trim() === '') return { reason: 'blank-answer' };
  return { answer: text };
}

/**
 * The question file's content with every front-matter line whose key is `status` rewritten to
 * `status: answered`, or null when the rewrite would not be exactly that: the new content must read back
 * with status `answered` and the same text after the front matter. The key is read as parseFrontmatter
 * reads it (every carriage return removed, then split at the first colon and trimmed).
 * @param {string} content
 * @returns {(string|null)}
 */
function answeredContent(content) {
  const open = content.match(/^---\r?\n/);
  const block = content.match(FRONTMATTER_BLOCK);
  if (!open || !block) return null;
  const interior = block[1].split('\n').map((line) => {
    const colon = line.indexOf(':');
    if (colon > 0 && line.slice(0, colon).replace(/\r/g, '').trim() === 'status') {
      return `status: answered${line.endsWith('\r') ? '\r' : ''}`;
    }
    return line;
  }).join('\n');
  const opening = content.slice(0, open[0].length);
  const next = opening + interior + content.slice(open[0].length + block[1].length);
  const nextBlock = next.match(FRONTMATTER_BLOCK);
  if (!nextBlock || next.slice(nextBlock[0].length) !== content.slice(block[0].length)) return null;
  return parseFrontmatter(next).status === 'answered' ? next : null;
}

/**
 * Whether every folder on the path to the questions folder is still a real folder (not a link) and the
 * questions folder is still the very one the question was read from (same device and inode). Node has no
 * rename relative to a folder descriptor, so this check narrows the window in which a folder could be
 * swapped for a link to microseconds; it cannot close it.
 * @param {string} root
 * @param {{dev: (number|bigint), ino: (number|bigint)}} folder what readQuestion saw
 * @returns {boolean}
 */
function questionsFolderIsUnchanged(root, folder) {
  const { ok, last } = folderChain(root, [['.ctoc'], ['.ctoc', 'inbox'], QUESTIONS_DIR], false);
  return ok && last !== null && last.dev === folder.dev && last.ino === folder.ino;
}

/**
 * Write `next` over the question file as a NEW file renamed into place, so a link put at the entry after
 * the check is replaced and never followed. The folders on the way are checked first and again just
 * before each rename (`questionsFolderIsUnchanged`); when they are not what the question was read from,
 * nothing is written. A transient Windows lock (EPERM, EACCES, EBUSY) is retried; any other error, or the
 * last retry failing, removes the temporary file and reports false.
 * @param {string} root
 * @param {string} id
 * @param {string} next
 * @param {{dev: (number|bigint), ino: (number|bigint)}} folder the questions folder as readQuestion saw it
 * @returns {boolean}
 */
function replaceQuestionFile(root, id, next, folder) {
  const dir = getQuestionsDir(root);
  const target = path.join(dir, `${id}.md`);
  const temp = path.join(dir, `.${id}.md.${process.pid}-${randomToken()}.tmp`);
  if (!questionsFolderIsUnchanged(root, folder)) return false;
  try {
    safeFs.writeFileSync(temp, next, { flag: 'wx' });
    for (let attempt = 0; ; attempt++) {
      try {
        if (!questionsFolderIsUnchanged(root, folder)) throw refusal('ESTALE');
        safeFs.renameSync(temp, target);
        return true;
      } catch (err) {
        if (attempt >= RENAME_RETRIES || !TRANSIENT_RENAME_CODES.has(err && err.code)) throw err;
        sleepSync(RENAME_RETRY_MS);
      }
    }
  } catch {
    // Ignoring a failed cleanup here is safe: the answer is already on the record and the result is
    // already `false` (the status line was not updated), so nothing a caller does next depends on it.
    // What a failed unlink leaves behind is one `.<id>.md.<pid>-<token>.tmp` file in the questions
    // folder: its name does not end in `.md`, so no list reads it, and the next answer never reuses it.
    attempt(() => safeFs.unlinkSync(temp));
    return false;
  }
}

/**
 * Step 7: mark the question file answered, only after the record holds the answer.
 * @param {string} root
 * @param {{id: string, content: string, folder: {dev: (number|bigint), ino: (number|bigint)}}} q a successful readQuestion
 * @returns {boolean} whether the status line now says answered
 */
function markAnswered(root, q) {
  const next = answeredContent(q.content);
  return next !== null && replaceQuestionFile(root, q.id, next, q.folder);
}

/**
 * An error's code for a sentence the owner reads ('ENOSPC', 'EACCES'), or 'unknown': never its message,
 * which can name a path or a home folder.
 * @param {unknown} err
 * @returns {string}
 */
function errorCode(err) {
  const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
  return typeof code === 'string' && /^[A-Z0-9_]{1,40}$/.test(code) ? code : 'unknown';
}

/**
 * Run a best-effort CLEANUP step whose failure changes neither the claim nor the record and nothing the
 * caller does next (removing a temporary file, closing a descriptor after a failure that is already
 * reported, putting a moved claim back). Every call site says, in a comment, why ignoring the failure is
 * safe and what is left behind. A step whose failure leaves a claim or the record in a state the result
 * must report is never run through here: it is a try/catch that returns the error.
 * @param {() => void} step
 * @returns {(string|null)} null when it worked, else the error code (never thrown; a caller that cares
 *   reads it, the three cleanup sites do not)
 */
function attempt(step) {
  try {
    step();
    return null;
  } catch (err) {
    return errorCode(err);
  }
}

/**
 * A claim's content as the exact entry the record would hold, or null when it is not one (a torn
 * claim): an object whose `id` is this question's id, whose `answer` is a string within the answer cap
 * (in UTF-8 bytes) and whose `answeredAt` has the ISO shape ANSWERED_AT_RE (a bell character or a
 * right-to-left override after the time makes it a torn claim). Rebuilt from those three fields only, so
 * nothing else a claim holds can reach the record.
 * @param {unknown} parsed
 * @param {string} id
 * @returns {({id: string, answer: string, answeredAt: string}|null)}
 */
function claimEntry(parsed, id) {
  if (!parsed || typeof parsed !== 'object') return null;
  const { id: claimId, answer, answeredAt } = /** @type {{[key: string]: unknown}} */ (parsed);
  if (claimId !== id || typeof answer !== 'string') return null;
  if (typeof answeredAt !== 'string' || !ANSWERED_AT_RE.test(answeredAt)) return null;
  if (Buffer.byteLength(answer, 'utf8') > MAX_ANSWER_BYTES) return null;
  return { id, answer, answeredAt };
}

/**
 * What is held at a claim path that already exists: the entry it holds for this id (null when it is not
 * an exact entry, see claimEntry), its age, and the lstat the age came from (dev and ino, for the
 * set-aside check). The claim is read through `readRegularFile`, so a link or a non-regular file reads as
 * no entry. The age is ABSOLUTE: a modification time in the future (a clock set back, a planted file)
 * counts as old by the same distance, so such a claim still goes stale instead of blocking the question
 * for ever. A claim that cannot be examined reads as fresh and unreadable.
 * @param {string} claimFile
 * @param {string} id
 * @returns {{entry: ({id: string, answer: string, answeredAt: string}|null), ageMs: number,
 *   seen: ({dev: (number|bigint), ino: (number|bigint)}|null)}}
 */
function readHeldClaim(claimFile, id) {
  let seen = null;
  let ageMs = 0;
  try {
    const st = safeFs.lstatSync(claimFile);
    seen = { dev: st.dev, ino: st.ino };
    ageMs = Math.abs(Date.now() - st.mtimeMs);
    return { entry: claimEntry(JSON.parse(readRegularFile(claimFile, MAX_CLAIM_BYTES)), id), ageMs, seen };
  } catch {
    return { entry: null, ageMs, seen };
  }
}

/**
 * Make the claim folder (and its parents) and require it to be a real folder, not a file or a link.
 * @param {string} claimsDir
 * @returns {(Error|null)} null when the folder is ready, else why it is not
 */
function prepareClaimFolder(claimsDir) {
  try {
    safeFs.mkdirSync(claimsDir, { recursive: true });
    return safeFs.lstatSync(claimsDir).isDirectory() ? null : refusal('ENOTDIR');
  } catch (err) {
    return err instanceof Error ? err : refusal('EIO');
  }
}

/**
 * Create this answer's claim: an exclusive create through a descriptor that never follows a link
 * (O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW), then write and close. If the write or the close fails the
 * claim we just made is renamed aside (`asideName(claimFile, 'unreadable')`) so nobody trusts it;
 * `cleared` says whether that rename worked.
 * @param {string} claimFile
 * @param {{id: string, answer: string, answeredAt: string}} entry
 * @returns {({exists: boolean, error: unknown, cleared: boolean}|null)} null when the claim is made,
 *   else why not: `exists` (the claim path is already taken) or another `error`
 */
function writeClaim(claimFile, entry) {
  let fd = -1;
  try {
    fd = safeFs.openSync(claimFile, CLAIM_FLAGS, 0o644);
  } catch (err) {
    return { exists: errorCode(err) === 'EEXIST', error: err, cleared: true };
  }
  let failure = null;
  try {
    const data = Buffer.from(JSON.stringify(entry), 'utf8');
    if (fs.writeSync(fd, data) !== data.length) throw refusal('EIO');
  } catch (err) {
    failure = err;
    // Ignoring a failed close here is safe: the write already failed, that failure (`failure`) is the
    // one reported, and the claim is set aside below whatever the close does. What a failed close leaves
    // behind is one open descriptor, which the operating system releases when the process ends.
    attempt(() => fs.closeSync(fd));
  }
  if (failure === null) {
    try { fs.closeSync(fd); } catch (err) { failure = err; }
  }
  if (failure === null) return null;
  try {
    safeFs.renameSync(claimFile, asideName(claimFile, 'unreadable'));
    return { exists: false, error: failure, cleared: true };
  } catch {
    return { exists: false, error: failure, cleared: false };
  }
}

/**
 * Set a stale torn claim aside, but only if what was moved is still the file that was seen: after the
 * rename the moved file's device and inode must equal the ones read earlier. If they differ, a fresh
 * claim replaced it in between, so it is put back by an exclusive copy (`COPYFILE_EXCL`, which fails
 * rather than overwrite another claim made since; safe-fs has no hard-link wrapper) and the aside file
 * is removed only if the copy worked.
 * @param {string} claimFile
 * @param {({dev: (number|bigint), ino: (number|bigint)}|null)} seen
 * @returns {{error?: unknown, replaced?: boolean}} `error` when the rename failed, `replaced` when a fresh claim had taken its place
 */
function setAsideStale(claimFile, seen) {
  const aside = asideName(claimFile, 'unreadable');
  try {
    safeFs.renameSync(claimFile, aside);
  } catch (err) {
    return { error: err };
  }
  let now = null;
  try { now = safeFs.lstatSync(aside); } catch { now = null; }
  if (seen && now && now.dev === seen.dev && now.ino === seen.ino) return {};
  // Only a regular file is copied back (a link put there is left aside, never followed). Ignoring a
  // failed put-back is safe: the caller refuses the answer either way ("an answer is being recorded"),
  // the writer that owns the fresh claim goes on to append its own entry, and nothing is lost. What a
  // failure leaves behind is the fresh claim under its `.unreadable-<pid>-<token>` aside name (and, when
  // another claim was made at the path meanwhile, that claim stays untouched).
  attempt(() => {
    if (!now || !now.isFile()) throw refusal('ENOTREG');
    safeFs.copyFileSync(aside, claimFile, fs.constants.COPYFILE_EXCL);
    safeFs.unlinkSync(aside);
  });
  return { replaced: true };
}

/**
 * Append one entry to the answer record in a single write, through a descriptor opened without
 * following a link and without waiting on a named pipe (where the platform has O_NOFOLLOW and
 * O_NONBLOCK). First `.ctoc` and `.ctoc/streaming` must be real folders (ENOTDIR otherwise). After the
 * open, and before anything is written, the descriptor must be a regular file with exactly one hard link
 * (ENOTREG, EMLINK), and the path itself, lstat'ed again with { bigint: true }, must be a regular file
 * with one link and the SAME device and inode as the descriptor (ESTALE otherwise): that refuses a link
 * put at the path on Windows, where O_NOFOLLOW does not exist, and a path swapped after the open. The
 * leading line break means a torn last line never swallows the entry.
 * @param {string} root
 * @param {{id: string, answer: string, answeredAt: string}} entry
 */
function appendRecord(root, entry) {
  if (!folderChain(root, STREAMING_CHAIN, false).ok) throw refusal('ENOTDIR');
  const recordFile = path.join(root, ...ANSWER_RECORD);
  const data = Buffer.from(`\n${JSON.stringify(entry)}\n`, 'utf8');
  const fd = safeFs.openSync(recordFile, APPEND_FLAGS, 0o644);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!opened.isFile()) throw refusal('ENOTREG');
    if (opened.nlink !== 1n) throw refusal('EMLINK');
    const named = safeFs.lstatSync(recordFile, { bigint: true });
    if (!named.isFile() || named.nlink !== 1n) throw refusal('ENOTREG');
    if (named.dev !== opened.dev || named.ino !== opened.ino) throw refusal('ESTALE');
    if (fs.writeSync(fd, data) !== data.length) throw refusal('EIO');
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Record a question's answer from the owner's words (standard input). The question must be open; the
 * answer is claimed with an exclusive create, appended to the answer record, and only then written into
 * the question file's status line. After the append the record is read back strictly and the answer counts
 * as recorded only when the FIRST entry for the id is ours (same answer and answeredAt), also when the
 * close after a complete write threw. Another entry first gives reason `answered-first-by-another` (with
 * that first `answer`: this answer was not taken); no entry for the id at all gives `write-failed` and
 * the claim is set aside. A write failure's `error` is an error CODE ('ENOSPC') or 'unknown', never a
 * message or a path. Total: every refusal is a result, nothing is thrown.
 * @param {string} root
 * @param {string} id the question id (must match QUESTION_ID_RE)
 * @param {(Buffer|string|symbol|undefined)} answerText the raw bytes of standard input as `readStandardInput`
 *   gives them (a string is encoded as UTF-8 first; undefined is no answer; its marker is "standard input
 *   could not be read")
 * @returns {{ok: true, id: string, answer: string, answeredAt: string, statusLineUpdated: boolean,
 *   question: {source_plan: string, source_step: string, question: string, context: string}}
 *   | {ok: false, reason: string, status?: string, answer?: string, error?: string, claimCleared?: boolean}}
 */
function answerQuestion(root, id, answerText) {
  const q = readQuestion(root, id);
  if (q.ok === false) return { ok: false, reason: q.reason };
  if (q.status !== 'open') return { ok: false, reason: 'not-open', status: q.status };
  const decoded = decodeAnswer(answerText);
  if ('reason' in decoded) return { ok: false, reason: decoded.reason };

  let recorded;
  try {
    recorded = readAnswerRecord(root, { strict: true });
  } catch {
    return { ok: false, reason: 'record-unreadable' };
  }
  if (recorded.has(id)) return { ok: false, reason: 'already-answered', answer: recorded.get(id).answer };

  const claimsDir = path.join(root, ...ANSWER_CLAIMS_DIR);
  const claimFile = path.join(claimsDir, `${id}.json`);
  const entry = { id, answer: decoded.answer, answeredAt: new Date().toISOString() };
  /**
   * @param {unknown} err
   * @param {{claimCleared?: boolean}} [extra]
   * @returns {{ok: false, reason: string, error: string, claimCleared?: boolean}}
   */
  const writeFailed = (err, extra) => ({ ok: false, reason: 'write-failed', error: errorCode(err), ...extra });

  const folderError = prepareClaimFolder(claimsDir);
  if (folderError) return writeFailed(folderError);
  let made = writeClaim(claimFile, entry);
  if (made && made.exists) {
    const held = readHeldClaim(claimFile, id);
    const stale = held.ageMs > STALE_CLAIM_MS;
    if (held.entry) {
      // An earlier writer died between its claim and its append: complete its answer, never lose it.
      // Only the validated entry (id, answer, answeredAt) is appended, never the claim object whole.
      if (stale && !readAnswerRecord(root).has(id)) {
        try {
          appendRecord(root, held.entry);
        } catch (err) {
          return writeFailed(err);
        }
        markAnswered(root, q);
        invalidate();
      }
      return { ok: false, reason: 'already-answered', answer: held.entry.answer };
    }
    if (!stale) return { ok: false, reason: 'already-answered' };
    // A claim torn by a crash during its write: set it aside, then take the claim once more.
    const aside = setAsideStale(claimFile, held.seen);
    if (aside.error) return writeFailed(aside.error);
    if (aside.replaced) {
      // A fresh claim had taken its place and was put back: it is being recorded right now.
      const fresh = readHeldClaim(claimFile, id);
      return fresh.entry
        ? { ok: false, reason: 'already-answered', answer: fresh.entry.answer }
        : { ok: false, reason: 'already-answered' };
    }
    made = writeClaim(claimFile, entry);
    if (made && made.exists) return { ok: false, reason: 'already-answered' };
  }
  if (made) return writeFailed(made.error, made.cleared === false ? { claimCleared: false } : undefined);

  /** @type {unknown} */
  let appendError = null;
  try {
    appendRecord(root, entry);
  } catch (err) {
    appendError = err || refusal('EIO');
  }
  // "Recorded" only when the FIRST entry for this id is ours. The record is read back strictly after the
  // append, also when the append threw: a close that fails after a complete write has still recorded the
  // answer. If that read itself fails after an append that reported success, the append is trusted.
  /** @type {({answer: string, answeredAt: (string|null)}|undefined)} */
  let first;
  try {
    first = readAnswerRecord(root, { strict: true }).get(id);
  } catch {
    first = appendError === null ? { answer: entry.answer, answeredAt: entry.answeredAt } : undefined;
  }
  if (first === undefined) {
    // Nothing of ours is on the record: the claim is set aside (never unlinked) so a later answer can take it.
    const why = appendError || refusal('EIO');
    try {
      safeFs.renameSync(claimFile, asideName(claimFile, 'failed'));
    } catch {
      return writeFailed(why, { claimCleared: false });
    }
    return writeFailed(why);
  }
  if (first.answer !== entry.answer || first.answeredAt !== entry.answeredAt) {
    // Another entry for this id came first on the record, and the first entry wins on read: this answer is not taken.
    invalidate();
    return { ok: false, reason: 'answered-first-by-another', answer: first.answer };
  }

  const statusLineUpdated = markAnswered(root, q);
  invalidate();
  return {
    ok: true,
    id,
    answer: entry.answer,
    answeredAt: entry.answeredAt,
    statusLineUpdated,
    question: { source_plan: q.source_plan, source_step: q.source_step, question: q.question, context: q.context },
  };
}

/**
 * X3: list plans currently AWAITING a human approval decision at a gate.
 *
 * A plan is "at a gate" when it sits in a gate SOURCE stage — the human must
 * approve it for the plan to advance across that gate (see
 * HUMAN_GATE_SOURCE_STAGES). Plans in destination stages (implementation/todo/
 * done) are NOT counted: once a plan carries its approval marker and has landed
 * in a destination, it has crossed the gate rather than waiting at one. That
 * inversion was the prior bug — it reported every shipped `done/` plan as
 * "at a gate", so the count tracked the Done total instead of the work the
 * human still owes a decision on.
 *
 * The approval marker is deliberately not consulted here: a marker reflects the
 * PREVIOUS gate a plan crossed to reach its current stage, not the next gate it
 * awaits, so it carries no signal about pending approval.
 *
 * @param {string} root
 * @returns {Array<{plan: string, stage: string, gate: number}>}
 */
function listPlansAtGates(root) {
  const out = [];
  const plansDir = path.join(root, 'plans');
  if (!safeFs.existsSync(plansDir)) return out;

  for (const [stage, gate] of Object.entries(HUMAN_GATE_SOURCE_STAGES)) {
    const stageDir = path.join(plansDir, stage);
    if (!safeFs.existsSync(stageDir)) continue;
    const files = safeFs.readdirSync(stageDir).filter(f => f.endsWith('.md') && f !== '.gitkeep');
    for (const f of files) {
      out.push({ plan: f.replace(/\.md$/, ''), stage, gate });
    }
  }
  return out;
}

/**
 * SP2: the full possibly-stale candidate list for the drill-in screen (cold path).
 * NOT memoized — the drill-in is reached only by explicit navigation, so a single
 * fresh scan there is acceptable; the hot dashboard path uses getInboxCounts.count.
 * @param {string} root
 * @returns {Array<{plan:string, stage:string, signals:string[], actionable:boolean}>}
 */
function listStaleCandidates(root) {
  return staleDetector.scanCheapCandidates(root).candidates;
}

/**
 * PI4-s4: fetch the plans most related to `planSlug` for the inbox surface, via
 * the plan-index barrel `related(planSlug, { projectPath })`. Fully fail-open:
 * a missing barrel export, a non-string seed, or a throwing/rejecting `related`
 * all resolve to `[]` — this NEVER rejects, so a semantic-feature fault can never
 * break the inbox render (the load-bearing fail-open invariant). Bounded to the
 * top 5 neighbours. Additive: existing exports are unchanged.
 * @param {string} planSlug - the seed plan identifier (store `planPath` key)
 * @param {string} root - the resolved project root
 * @returns {Promise<Array<object & {planPath: string, score: number}>>}
 */
async function listRelatedForInbox(planSlug, root) {
  try {
    if (typeof planSlug !== 'string' || planSlug.length === 0) return [];
    // `related` is a lazy Object.defineProperties getter on the barrel that tsc's
    // static module-shape inference cannot see — cast to any to keep --checkJs neutral.
    /** @type {any} */
    const planIndex = require('./plan-index');
    if (typeof planIndex.related !== 'function') return [];
    const results = await planIndex.related(planSlug, { projectPath: root, limit: 5 });
    return Array.isArray(results) ? results.slice(0, 5) : [];
  } catch {
    return []; // fail-open — never reject, never break the inbox
  }
}

/**
 * Circuit-breaker escalations awaiting the human. Fail-open: a missing or
 * corrupt escalations store is zero, never a crash — but a REAL escalation
 * (4th same-step kickback / 6th total on one plan) must reach the human here;
 * this is the surface the circuit breaker writes toward.
 * @param {string} root
 * @returns {Array<object>}
 */
function listEscalations(root) {
  try {
    const { getEscalations } = require('./circuit-breaker');
    const all = getEscalations(root);
    return Array.isArray(all) ? all.filter((e) => e && !e.acknowledged) : [];
  } catch {
    return [];
  }
}

/**
 * R2-C2 item 6: the honest possibly-stale COUNT — cheap candidates filtered to the
 * stages the classifier can ACT on. A candidate at a NOT_STARTED stage
 * (vision/canvas/functional/implementation) whose only issue is unbuilt declared
 * files is benign (not-started, not abandoned) and the classifier downgrades it to inconclusive
 * with a null action — so it must not inflate the "possibly-stale" nag. We count
 * `.candidates` (not `.count`) so the filter is authoritative; the drill-in list
 * (listStaleCandidates) stays UNFILTERED, showing everything the scan found.
 * Fail-safe: an older stale-detector without the NOT_STARTED_STAGES export filters
 * nothing (falls back to the raw candidate count).
 * @param {string} root
 * @returns {number}
 */
function countActionableStale(root) {
  const { candidates } = staleDetector.scanCheapCandidates(root);
  const list = Array.isArray(candidates) ? candidates : [];
  const notStarted = staleDetector.NOT_STARTED_STAGES;
  if (!notStarted || typeof notStarted.has !== 'function') return list.length;
  return list.filter((c) => c && !notStarted.has(c.stage)).length;
}

const getInboxCounts = memoize(function getInboxCountsImpl(root) {
  return {
    questions: listQuestions(root).length,
    escalations: listEscalations(root).length,
    decisions: listDecisions(root).length,
    gatesWaiting: listPlansAtGates(root).length,
    // SP2 + R2-C2 item 6: one cheap scan per memoize window (5 s TTL), counted to
    // the actionable stages only (a functional not-started plan is not "stale").
    staleCandidates: countActionableStale(root),
  };
}, 'getInboxCounts');

module.exports = {
  listEscalations,
  getInboxCounts,
  listQuestions,
  listDecisions,
  listPlansAtGates,
  listStaleCandidates,
  createQuestion,
  createDecision,
  answerQuestion,
  questionAnswer,
  readQuestion,
  readStandardInput,
  decodeAnswer,
  QUESTION_ID_RE,
  listRelatedForInbox,
  parseFrontmatter,
};
