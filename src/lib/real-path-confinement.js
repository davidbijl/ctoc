'use strict';

/**
 * REAL-PATH CONFINEMENT — THE ONE PLACE THAT ASKS THE FILESYSTEM WHERE A PATH
 * REALLY LEADS.
 *
 * WHY THIS MODULE EXISTS. Every other confinement check in this codebase reasons
 * about NAMES: `path.relative`, `path.posix.normalize`, `startsWith`. Not one of
 * those touches the filesystem, and a symbolic link is a fact about the filesystem
 * rather than about a name. Given a repository at `/repo` containing
 * `link → /outside`, the target `/repo/link/x.js` produces the relative path
 * `link/x.js` — clean, confined, repository-relative — and the write lands in
 * `/outside`. The same blindness sat under the approval-ledger guard, where a link
 * turned an ordinary `src/**` declaration into permission to forge the record that
 * every other permission in this system rests on. No amount of better arithmetic
 * closes that. Only asking the filesystem does.
 *
 * WHY THE ROOT IS RESOLVED TOO, and this is the trap that makes a "simplification"
 * break everything. The comparison basis must itself be a real path. On macOS
 * `/tmp` is a symbolic link to `/private/tmp` and `os.tmpdir()` is reached through
 * `/var → /private/var`, and every test fixture in this repository lives there.
 * Comparing a RESOLVED target against an UNRESOLVED root reports every fixture path
 * as escaping — a fix that denies the entire suite. Both sides are resolved, or
 * neither comparison means anything.
 *
 * WHY RESOLUTION BELONGS ON THE TARGET AND NOT ON THE PATTERN. A pattern is a glob,
 * not a path: `src/**` names no filesystem object, so there is nothing to resolve.
 * Resolving a glob's literal prefix would be neither necessary (any target reached
 * through a link is caught on the target side, whichever pattern matched it) nor
 * sufficient (the link can sit inside the span the wildcard covers, where there is
 * no literal at all). The target check subsumes the pattern check.
 *
 * THE WALK, AS WRITTEN. A target is walked from the file-system root one segment at
 * a time, as the kernel walks it: an existing segment is checked with `lstat`, a
 * link's contents are walked in its place, and `..` is the PHYSICAL parent of the
 * real path so far. Once a segment does not exist, the rest is the not-yet-existing
 * tail (a `Write` that creates a file names such a path, and denying it would block
 * the common case), where a `..` removes the tail's last name. Nothing is tidied by
 * text first, because `..` after a link is the link's real parent to the file system
 * (measured 2026-10-15: `src/L/../approvals` with `src/L → ../.ctoc/state` is
 * `.ctoc/approvals`). Bounded by `MAX_ANCESTOR_WALK` segments walked (links'
 * contents included), `MAX_LINK_HOPS` links, and the decision deadline.
 *
 * THE TAIL'S GUARANTEE HOLDS ONLY AFTER A DANGLING SEGMENT HAS BEEN EXCLUDED — this
 * paragraph once read "the tail contains no links BECAUSE IT DOES NOT EXIST", and
 * that sentence was FALSE for a segment that exists as a symbolic link whose target
 * does not. The rule now: a name missing INSIDE a link's contents is a dangling
 * link and is REFUSED (`reason: 'dangling'`); a name missing in the path as written
 * starts the tail.
 *
 * That case is not exotic for the guard that matters most: a forged approval record
 * is BY DEFINITION a file that does not exist until it is forged, so the dangling
 * shape is the ORDINARY shape of the attack on the approval ledger.
 *
 * LINKS ARE FOLLOWED BY READING THEM (reversed 2026-10-15). The earlier choice
 * resolved links with `realpathSync` and refused a dangling one by `lstat`. It is
 * reversed because the JavaScript `realpathSync` removes `..` by text, inside a
 * link's contents too, so a `..` after a link was judged where the text says, not
 * where the file system goes. The walk reads each link (`readlinkSync`) under a
 * budget of `MAX_LINK_HOPS` links (a cycle is `'loop'`). The link's contents enter
 * the decision and never a log or a message. The over-refused shape — an
 * in-repository dangling link — was MEASURED at zero occurrences in this repository
 * outside `node_modules/` and `.git/`.
 *
 * THE ROOT IS RESOLVED STRICTLY, WITHOUT THE WALK. A root that does not exist has no
 * nearest existing ancestor worth anchoring to: walking up would synthesise a
 * FICTIONAL root out of whatever real directory happens to lie above it, and the
 * target — equally non-existent, walking up through the same fiction — would then
 * compare as INSIDE it. Both predicates PERMITTED on an unresolvable root before
 * this was fixed. The comparison basis must exist, or there is no basis.
 *
 * THIS MODULE MUST NEVER THROW, BECAUSE THE HOOK'S CATCH FAILS OPEN.
 * `PreToolUse.Edit.js` wraps its whole enforcement decision in a `catch` that calls
 * `process.exit(0)` — an ALLOW. So a throw out of a PERMISSION check becomes
 * "permission granted": the exact defect this module exists to prevent. Fail-closed
 * here therefore means RETURNING A REFUSING VALUE, never throwing. Do not tidy this
 * into consistency with the fail-open reporting checks that neighbour it; the
 * inversion is deliberate and load-bearing.
 *
 * A DECISION BUDGET. A hook that times out lets the call run (measured, the owner's
 * trial of 2026-10-15), so a slow walk is an allow. `setDeadline` sets the latest
 * `Date.now()` at which a walk may still take a step; past it `resolvesUnder` refuses
 * at its entry, before the root lookup, and every walk returns `'resolve-failed'`,
 * the refusing value for `resolvesUnder`. A caller that DROPS a check when a walk
 * faults, with no refusing check behind it in the same decision (the background
 * agent's shell settings specs in `protect-records.js`, which guard against a
 * lock-out that way), asks `budgetSpent()` first and keeps the check, so it refuses
 * at `resolvesUnder`'s entry instead of vanishing; `PreToolUse.Bash.isLedgerWrite` asks it too,
 * and refuses its own text work once the budget is spent. Set once per decision by
 * `protect-records.js`, a fresh process per call; never set by any other caller.
 *
 * THE TWO FUNCTIONS FAIL IN OPPOSITE BOOLEAN DIRECTIONS, and both directions mean
 * DENY:
 *   • `escapesRoot`  → `escapes: true`  means DENY (the target left the tree).
 *   • `resolvesUnder` → `true`          means DENY (the target landed in a
 *                                        protected directory).
 * They are not inconsistent; they answer opposite questions. Anyone "unifying" them
 * will invert one of them and open the hole again.
 *
 * OPEN RESIDUAL, stated rather than silently absent: a HARD link to a file inside a protected
 * FOLDER, or to a file outside the repository, is not seen — its real path is where it was
 * made. `resolvesUnder` compares identities, so a hard link to a protected FILE (the settings
 * file) is inside; `escapesRoot` compares text only.
 */

const path = require('path');
const safeFs = require('./safe-fs');

/**
 * Hard cap on the segments one walk takes. With links, `MAX_LINK_HOPS`
 * guarantees termination; this is a second, independent bound so a pathological
 * path can never turn a permission check into a long loop.
 */
const MAX_ANCESTOR_WALK = 4096;
/** The most links one walk follows; past it the path is a loop (Linux's own limit is 40). */
const MAX_LINK_HOPS = 40;
/** The path separators of this platform, for splitting a path into segments. */
const SEPARATORS = path.sep === '\\' ? /[\\/]+/ : /\/+/;
/** The latest `Date.now()` at which a walk may take a step, or null for none. */
let deadline = null;

/**
 * Where `p` really leads, walked AS WRITTEN the way the file system walks it, tolerating a
 * path that does not exist yet. See the header: THE WALK, AS WRITTEN.
 *
 * NEVER THROWS. Every fault is returned as `{ ok: false, reason }` with a fixed vocabulary
 * (`'resolve-failed'` | `'loop'` | `'denied'` | `'dangling'` | `'not-a-folder'`), so a caller
 * can report WHY without leaking an errno object, a stack trace or an absolute path.
 * `resolvesUnder` branches on two of them (`'not-a-folder'`, `'denied'`: a protected folder
 * that cannot be one holds nothing); `plan-coverage` discards them; `protect-records.js` reads
 * only `ok` and `real`.
 *
 * @param {string} p - an absolute or relative path
 * @returns {{ok: boolean, real: (string|null), reason: (string|null), tail: (string[]|null)}} a UNIFORM shape,
 *   never a discriminated union: `ok:false` always carries a reason, a null path and a null tail; `tail` lists the
 *   names at the end of `real` that do not exist yet, outermost first (`[]` when the whole path exists).
 */
function resolveExisting(p) {
  const fault = (reason) => ({ ok: false, real: null, reason, tail: null });
  try {
    if (typeof p !== 'string' || p.length === 0) return fault('resolve-failed');
    const abs = path.isAbsolute(p) ? p : `${process.cwd()}${path.sep}${p}`;
    // The input is cut by its OWN parsed root (`/`, `C:\`, `\\server\share\`, or a rooted `\`
    // without a drive on Windows); `path.resolve` is asked for the root to start from only, and
    // the segments are walked as written.
    const rest = abs.slice(path.parse(abs).root.length);
    let real = path.parse(path.resolve(abs)).root;
    /** @type {string[]} the segments still to walk, the next one LAST */
    const todo = segmentsOf(rest).reverse();
    /** @type {string[]} names below `real` that do not exist, outermost first */
    const tail = [];
    let fromLink = 0; // how many of the next segments came out of a link's contents
    let hops = 0;
    for (let walked = 0; todo.length > 0; walked++) {
      if (walked >= MAX_ANCESTOR_WALK || budgetSpent()) return fault('resolve-failed');
      const seg = /** @type {string} */ (todo.pop());
      const linked = fromLink > 0;
      if (linked) fromLink -= 1;
      if (seg === '..') {
        // `real` holds no link, so its text parent IS its physical parent.
        if (tail.length > 0) tail.pop(); else real = path.dirname(real);
        continue;
      }
      if (tail.length > 0) {
        // Below a name that does not exist nothing exists. Never a segment out of a link here:
        // a link's segments sit on top of `todo` and are popped before any other, a missing one
        // returns 'dangling' below before the tail can start, and a link is met only by `lstat`,
        // which runs only while the tail is empty — so the tail is empty while such segments remain.
        tail.push(seg);
        continue;
      }
      const next = path.join(real, seg);
      let st;
      try {
        st = safeFs.lstatSync(next);
      } catch (err) {
        const code = err && /** @type {NodeJS.ErrnoException} */ (err).code;
        // ONE name over the file system's limit of 255 cannot exist, so it cannot be written either:
        // out of the caller's text it is a name still to be made, like ENOENT. Counted in UTF-16 units
        // (JavaScript's `length`), not bytes and not code points: APFS and NTFS count UTF-16 units (a
        // 200-character Chinese name of 603 bytes exists; 128 emoji, 256 units, cannot), and on ext4 the
        // byte count is never below the unit count, so no name over 255 units exists anywhere. Any other
        // ENAMETOOLONG is a fault (below): macOS gives it for a WHOLE path of 1,024 bytes or more, and
        // such an object exists, reached by `cd` into a deep folder. Out of a link's contents too. (On a
        // disk that counts bytes, a name of 255 or fewer units but over 255 bytes is refused: the safe side.)
        if (code === 'ENOENT' || (code === 'ENAMETOOLONG' && !linked && seg.length > 255)) {
          if (linked) return fault('dangling'); // the forged-record shape: see the header
          tail.push(seg); // the ordinary new file
          continue;
        }
        if (code === 'EACCES' || code === 'EPERM') return fault('denied');
        // ENOTDIR (only a file swapped in mid-walk can give it: a file with more to walk is
        // refused as 'not-a-folder' below before its child is asked), ELOOP, ENAMETOOLONG from a link's contents, a
        // safe-fs validatePath TypeError (empty / NUL-byte path), … — all refuse.
        return fault('resolve-failed');
      }
      if (st.isSymbolicLink()) {
        hops += 1;
        // A LINK CYCLE is the shape an attacker builds to turn a resolver into a hang.
        if (hops > MAX_LINK_HOPS) return fault('loop');
        const contents = String(safeFs.readlinkSync(next));
        // An absolute link restarts at its own root, cut off before the names are walked, so a
        // drive `C:` or a UNC server and share is never walked as a name.
        const lr = path.parse(contents).root;
        const parts = segmentsOf(contents.slice(lr.length));
        if (lr) real = path.parse(path.resolve(contents)).root;
        for (let i = parts.length - 1; i >= 0; i--) todo.push(parts[i]);
        fromLink += parts.length;
        continue;
      }
      // A file with more to walk below it (`..` included) is not a path the kernel can open.
      if (!st.isDirectory() && todo.length > 0) return fault('not-a-folder');
      real = next;
    }
    // The walk called a tail absent; the KERNEL has the last word (see kernelAgrees).
    if (tail.length > 0 && !kernelAgrees(abs, real)) return fault('resolve-failed');
    return { ok: true, real: tail.length ? path.join(real, ...tail) : real, reason: null, tail };
  } catch {
    // Total by construction. See the file header: a throw here becomes an ALLOW.
    return fault('resolve-failed');
  }
}

/**
 * Does the kernel agree with the walk that the names in its tail do not exist? macOS opens a folder
 * through spellings the segment walk cannot follow (`/.vol/<device>/<inode>/…`: the empty `/.vol`
 * answers "no such file" for the inode, though the whole path opens), and the walk would call all of
 * it a name still to be made, so the identity comparison would never meet the protected folder.
 * So the deepest ancestor of the ORIGINAL spelling that the kernel opens (`stat`, as given, `..` and
 * links as the kernel takes them) must be the very entry the walk stopped at (`existing`, the walk's
 * deepest existing path). A different entry is a fault, and so is an answer other than "not there".
 * A file system that gives no identity (inode 0) is left to the text test, as everywhere else.
 * Never throws.
 * @param {string} abs - the absolute path as written
 * @param {string} existing - the walk's deepest existing real path (the tail's parent)
 * @returns {boolean}
 */
function kernelAgrees(abs, existing) {
  try {
    const root = path.parse(abs).root;
    const names = segmentsOf(abs.slice(root.length));
    for (let n = names.length; n >= 0; n--) {
      if (budgetSpent()) return false;
      const prefix = root + names.slice(0, n).join(path.sep);
      let st;
      try {
        st = safeFs.statSync(prefix, { bigint: true });
      } catch (err) {
        const code = err && /** @type {NodeJS.ErrnoException} */ (err).code;
        // The kernel does not open this prefix (not there, too long for one call, more links than it
        // follows: macOS 32, the walk 40): a write through it fails, so look higher.
        if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ENAMETOOLONG' || code === 'ELOOP') continue;
        return false;
      }
      // A `..` the kernel never reaches (after a name it cannot open) is the walk's own climb, which
      // cancels the name before it; the kernel has no answer for it.
      if (String(st.ino) === '0' || names.slice(n).includes('..')) return true;
      const walked = fileIdentity(existing);
      return walked === null ? true : walked !== undefined && walked === `${st.dev}:${st.ino}`;
    }
    return false;
  } catch {
    return false;
  }
}

/** The segments of a path, without empty and `.` segments. */
function segmentsOf(s) {
  return s.split(SEPARATORS).filter((seg) => seg !== '' && seg !== '.');
}

/**
 * Resolve a COMPARISON BASIS — a root or a protected directory — which must really
 * EXIST. No ancestor walk: see the file header. A basis that does not exist would
 * otherwise be synthesised from whatever real directory lies above it, and an
 * equally-non-existent target walking up through the same fiction compares as
 * INSIDE it, so both predicates PERMIT. That was a silent allow.
 *
 * NEVER THROWS.
 *
 * @param {string} p
 * @returns {{ok: boolean, real: (string|null), reason: (string|null)}}
 */
function resolveBasis(p) {
  try {
    if (typeof p !== 'string' || p.length === 0) return { ok: false, real: null, reason: 'resolve-failed' };
    try {
      return { ok: true, real: safeFs.realpathSync(path.resolve(p)), reason: null };
    } catch (err) {
      const code = err && /** @type {NodeJS.ErrnoException} */ (err).code;
      if (code === 'ELOOP') return { ok: false, real: null, reason: 'loop' };
      if (code === 'EACCES' || code === 'EPERM') return { ok: false, real: null, reason: 'denied' };
      return { ok: false, real: null, reason: 'resolve-failed' };
    }
  } catch {
    // Total by construction. See the file header: a throw here becomes an ALLOW.
    return { ok: false, real: null, reason: 'resolve-failed' };
  }
}

/**
 * Segment-precise containment over two ALREADY-RESOLVED paths: equal, or `child`
 * strictly beneath `parent`. A same-prefix sibling (`/repo-other` against `/repo`)
 * is NOT within — the separator boundary is required.
 *
 * CASE-INSENSITIVE, following the precedent already set and justified in
 * `PreToolUse.Edit.js`'s `isUnderProtectedDir`: on macOS APFS and on Windows a
 * case-variant path routes into the REAL directory, so a case-sensitive comparison
 * was itself a gate bypass.
 *
 * @param {string} realChild
 * @param {string} realParent
 * @returns {boolean}
 */
function isWithin(realChild, realParent) {
  if (typeof realChild !== 'string' || typeof realParent !== 'string') return false;
  if (realChild.length === 0 || realParent.length === 0) return false;
  const c = path.resolve(realChild).toLowerCase();
  const parentAbs = path.resolve(realParent).toLowerCase();
  if (c === parentAbs) return true;
  const withSep = parentAbs.endsWith(path.sep) ? parentAbs : parentAbs + path.sep;
  return c.startsWith(withSep);
}

/**
 * Does `targetFile` REALLY lead outside `root`, whatever links it passes through?
 *
 * FAILING DIRECTION: `escapes: true` DENIES. Every fault returns `escapes: true`,
 * because a confinement check that permits because it could not look is the whole
 * defect. NEVER THROWS.
 *
 * @param {string} targetFile - absolute, or relative to `root`
 * @param {string} root - the project root (resolved here; it may itself be a link)
 * @returns {{escapes: boolean, reason: (string|null)}}
 */
function escapesRoot(targetFile, root) {
  try {
    if (typeof targetFile !== 'string' || targetFile.length === 0) {
      return { escapes: true, reason: 'target-unusable' };
    }
    if (typeof root !== 'string' || root.length === 0) {
      return { escapes: true, reason: 'root-unusable' };
    }
    // The comparison basis must itself be real — see the file header on /tmp — and
    // must EXIST, or an unresolvable root is synthesised and everything compares as
    // inside it.
    const realRoot = resolveBasis(root);
    if (!realRoot.ok) return { escapes: true, reason: `root-${realRoot.reason}` };

    const abs = path.isAbsolute(targetFile) ? targetFile : path.join(root, targetFile);
    const realTarget = resolveExisting(abs);
    if (!realTarget.ok) return { escapes: true, reason: realTarget.reason };

    return isWithin(realTarget.real, realRoot.real)
      ? { escapes: false, reason: null }
      : { escapes: true, reason: 'outside-root' };
  } catch {
    return { escapes: true, reason: 'fault' };
  }
}

/**
 * Does `targetFile`, followed AS WRITTEN the way the file system follows it, land inside the
 * protected directory (or file) `<root>/<protectedDirRelative>`?
 *
 * The caller asks once per reading: `protect-records.decide()` and the shell's link test also
 * ask with the TIDIED path (`..` removed by text), what a tool that tidies a path before opening
 * it would open. This function itself never tidies the target.
 *
 * BY FILE IDENTITY, NOT ONLY BY SPELLING (the owner's decision of 2026-10-15). The walk keeps
 * every existing name AS SPELLED, so on a file system that folds names (macOS APFS, Windows NTFS)
 * `.ctoc/ſtate/verify` — the long s — opens the real `.ctoc/state/verify` while its real path
 * reads as a different folder (measured on macOS, 2026-10-15). So the target is inside when:
 *   • its real path is inside the protected one's real path, in any letter case — the text test
 *     this function always had, kept so no verdict it gave is lost; or
 *   • the protected entry's identity (device and inode, `fileIdentity`) is on the target's real
 *     chain: its deepest existing entry and every ancestor up to the project root's identity.
 *     A protected entry that does not exist yet has no identity: its nearest existing ancestor's
 *     identity must be on the chain, followed by the missing names, compared after NFKC and
 *     lower case. A protected FILE is compared the same way, so a hard link to it is inside;
 *     a hard link to a file inside a protected FOLDER is not seen (the header's residual).
 *
 * A PROTECTED FOLDER THAT CANNOT BE ONE — a file (`'not-a-folder'`) or a folder this user cannot
 * search (`'denied'`) on its path — holds nothing, so a target that resolves is not inside it;
 * a target whose own path runs into that fault faults itself and is refused. Any other fault on
 * the protected path (a dangling link, a loop) refuses every target: a dangling link there is
 * the shape of a record forged at the link's destination.
 *
 * FAILING DIRECTION — NOTE THE INVERSION relative to {@link escapesRoot}: here `true` means
 * "protected, DENY", so every other fault returns `true`. A file system that gives no identity
 * (inode 0) is not a fault: the text test decides there, as it always did.
 *
 * The one input that returns `false` on a fault is a target that is not a path at all
 * (absent, non-string, empty). That is not a resolver fault — there is nothing to protect —
 * and every call site guards `targetFile &&` or its equivalent before asking.
 *
 * NEVER THROWS.
 *
 * @param {string} targetFile - the tool-call target (relative to `root`, or absolute), as written
 * @param {string} protectedDirRelative - POSIX-relative protected dir or file, no trailing /
 * @param {string} root - the project root
 * @returns {boolean} true iff the target really lands in the protected entry, OR the question
 *   could not be answered
 */
function resolvesUnder(targetFile, protectedDirRelative, root) {
  try {
    if (typeof targetFile !== 'string' || targetFile.length === 0) return false;
    if (typeof protectedDirRelative !== 'string' || protectedDirRelative.length === 0) return true;
    if (typeof root !== 'string' || root.length === 0) return true;
    // The decision budget, before the root lookup (`resolveBasis` is not bounded by it).
    if (budgetSpent()) return true;

    // Strict: the root must EXIST. The protected directory need not — a project that has never
    // minted an approval has no `.ctoc/approvals` yet.
    const realRoot = resolveBasis(root);
    if (!realRoot.ok) return true;
    const realProtected = resolveExisting(path.join(realRoot.real, protectedDirRelative));
    const holdsNothing = !realProtected.ok
      && (realProtected.reason === 'not-a-folder' || realProtected.reason === 'denied');
    if (!realProtected.ok && !holdsNothing) return true;

    // As written: a plain join, never `path.join`, which would remove `..` by text.
    const abs = path.isAbsolute(targetFile) ? targetFile : `${root}${path.sep}${targetFile}`;
    const realTarget = resolveExisting(abs);
    if (!realTarget.ok) return true;
    if (holdsNothing) return false;
    if (isWithin(realTarget.real, realProtected.real)) return true;

    const rootId = fileIdentity(realRoot.real);
    const anchor = anchorOf(realProtected);
    const chain = rootId === undefined ? null : identityChain(realTarget, rootId);
    if (anchor === null || chain === null) return true;
    return passesThrough(chain, anchor);
  } catch {
    return true;
  }
}

/**
 * Set the decision budget: walks refuse once `Date.now()` passes `at`. A number sets it; anything
 * else clears it. Called once per decision by `protect-records.js` (a fresh process per call).
 * @param {number|null} at
 */
function setDeadline(at) {
  deadline = typeof at === 'number' && Number.isFinite(at) ? at : null;
}

/**
 * Has the decision budget run out? The one test every walk, `resolvesUnder` and `identityChain`
 * use, exported for a caller that would otherwise DROP a check when a walk faults
 * (`protect-records.fileSpec`): a spent budget must keep the check, so it refuses (Decision 46).
 * `PreToolUse.Bash.isLedgerWrite` is the other caller: it refuses its own text work past the budget.
 * @returns {boolean}
 */
function budgetSpent() {
  return deadline !== null && Date.now() > deadline;
}

/** One path segment folded for a name compare: NFKC (the long s becomes s), then lower case. */
function foldSegment(s) {
  return String(s).normalize('NFKC').toLowerCase();
}

/**
 * What `p` names after links, as `'<dev>:<ino>'` from a `bigint` stat (Windows file IDs can pass
 * 2^53); null when nothing is there (ENOENT, ENOTDIR) or the file system reports inode 0 (FAT
 * and some network shares, where every file would compare equal); undefined on any other
 * fault. Never throws. The one identity helper in CTOC.
 * @param {string} p
 * @returns {string|null|undefined}
 */
function fileIdentity(p) {
  try {
    const st = safeFs.statSync(p, { bigint: true });
    return String(st.ino) === '0' ? null : `${st.dev}:${st.ino}`;
  } catch (err) {
    const code = err && /** @type {NodeJS.ErrnoException} */ (err).code;
    return code === 'ENOENT' || code === 'ENOTDIR' ? null : undefined;
  }
}

/** The real path of the deepest existing entry of an `ok` `resolveExisting` result. */
function existingOf(resolved) {
  let current = resolved.real;
  for (let i = 0; i < resolved.tail.length; i++) current = path.dirname(current);
  return current;
}

/**
 * Where a comparison basis is anchored: the identity of its deepest existing entry (null when
 * the file system gives none) and the folded names below it that do not exist yet ([] when
 * the basis exists). Null on a fault.
 * @param {{real: string, tail: string[]}} resolved - an `ok` result of `resolveExisting`
 * @returns {{id: (string|null), below: string[]}|null}
 */
function anchorOf(resolved) {
  const id = fileIdentity(existingOf(resolved));
  return id === undefined ? null : { id, below: resolved.tail.map(foldSegment) };
}

/**
 * The identity chain of a resolved target, nearest first: its deepest existing entry and every
 * ancestor, each with its identity (null when the file system gives none) and the folded names
 * below it, the missing tail included. Stops after the entry whose identity is the project
 * root's (no protected entry lies above the root), else at the file-system root. Bounded by
 * MAX_ANCESTOR_WALK and the decision deadline. Null on a fault.
 * @param {{real: string, tail: string[]}} resolved - an `ok` result of `resolveExisting`
 * @param {string|null} rootId - the project root's identity
 * @returns {Array<{id: (string|null), below: string[]}>|null}
 */
function identityChain(resolved, rootId) {
  let current = existingOf(resolved);
  let below = resolved.tail.map(foldSegment);
  const chain = [];
  for (let i = 0; i < MAX_ANCESTOR_WALK; i++) {
    if (budgetSpent()) return null;
    const id = fileIdentity(current);
    if (id === undefined) return null;
    chain.push({ id, below });
    const parent = path.dirname(current);
    if (parent === current || (id !== null && id === rootId)) return chain;
    below = [foldSegment(path.basename(current))].concat(below);
    current = parent;
  }
  return null;
}

/**
 * Does `chain` pass through `anchor`: an entry with the anchor's identity whose folded names
 * below begin with the anchor's missing names? False when the anchor has no identity — the
 * text test decides on such a file system.
 * @param {Array<{id: (string|null), below: string[]}>} chain
 * @param {{id: (string|null), below: string[]}} anchor
 * @returns {boolean}
 */
function passesThrough(chain, anchor) {
  if (anchor.id === null) return false;
  return chain.some((link) => link.id === anchor.id
    && anchor.below.every((name, i) => link.below[i] === name));
}

module.exports = { escapesRoot, resolvesUnder, resolveExisting, setDeadline, budgetSpent, fileIdentity, foldSegment };
