/**
 * A LINK INSIDE THE REPOSITORY REACHES OUTSIDE IT.
 *
 * Root confinement in `plan-coverage.scanForCoverage`, and protected-directory
 * matching in `PreToolUse.Edit.js`, are both PURE PATH ARITHMETIC — `path.relative`,
 * `path.posix.normalize`, `startsWith`. None of those touch the filesystem, so none
 * of them can see a symbolic link. A repository containing `link → /outside` turns
 * `/repo/link/x.js` into the clean, confined relative path `link/x.js`: confinement
 * passes and the write lands outside the tree.
 *
 * The same blindness sits under the APPROVAL LEDGER guard, which is the predicate
 * every other permission in this system rests on. Cases 7, 8 and 9 are that claim,
 * turned into evidence rather than argued.
 *
 * Every fixture is a real `os.tmpdir()` directory with real symbolic links and real
 * ledger approvals minted by the real `approval-ledger` over the fixture's own bytes.
 * Nothing here writes inside this repository. Link creation NEVER skips: a platform
 * that refuses to make a link fails the test loudly with the platform and the error,
 * because a skipped case is a check that reports a verdict on input it never received.
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { findCoveringPlan } = require('../src/lib/plan-coverage');
const ledger = require('../src/lib/approval-ledger');
const {
  isProtectedLedgerPath,
  isProtectedVerifyPath,
} = require('../src/hooks/PreToolUse.Edit.js');
const safeFs = require('../src/lib/safe-fs');
const { escapesRoot, resolvesUnder } = require('../src/lib/real-path-confinement');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A temp directory with the CTOC shape a coverage scan expects. */
function makeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-link-'));
  for (const s of ['in-progress', 'todo']) {
    fs.mkdirSync(path.join(dir, 'plans', s), { recursive: true });
  }
  fs.mkdirSync(path.join(dir, '.ctoc', 'approvals'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.ctoc', 'state', 'verify'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src', 'lib'), { recursive: true });
  return dir;
}

function rm(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

/**
 * Create a symbolic link, LOUDLY. `junction` is used for directories so Windows
 * permits creation without elevation. A failure fails the test with the platform
 * and the underlying error — it never degrades into a skip.
 */
function mklink(target, linkPath, type = 'junction') {
  try {
    fs.symlinkSync(target, linkPath, type);
  } catch (err) {
    assert.fail(
      `could not create a symbolic link on ${process.platform} ` +
      `(${linkPath} -> ${target}): ${err.code || ''} ${err.message}`
    );
  }
}

/**
 * Write a plan into plans/<stage>/ AND mint the real, agent-unforgeable ledger
 * approval over its actual bytes. Without the entry the plan grants nothing and
 * every positive case below would pass for the wrong reason.
 */
function writeApprovedPlan(root, stage, name, files) {
  const yaml = files.map(f => `  - "${f}"`).join('\n');
  const content = `---\ntitle: "${name}"\nprogram: ctoc-v7\nfiles:\n${yaml}\n---\n# ${name}\n`;
  const planPath = path.join(root, 'plans', stage, `${name}.md`);
  fs.writeFileSync(planPath, content);
  ledger.writeEntry(ledger.slugFromPlanPath(planPath), {
    content,
    stage_from: 'implementation',
    stage_to: stage === 'in-progress' ? 'todo' : stage,
    approved_by: 'human',
  }, root);
  return planPath;
}

/** Run `fn` with the process cwd set to `dir`, restoring it unconditionally. */
function withCwd(dir, fn) {
  const before = process.cwd();
  process.chdir(dir);
  try {
    return fn(process.cwd());
  } finally {
    process.chdir(before);
  }
}

// ---------------------------------------------------------------------------
// The coverage oracle
// ---------------------------------------------------------------------------

describe('a link cannot leave the repository — coverage', () => {

  it('case 1: an approved plan declaring a link that points OUTSIDE covers nothing', () => {
    const root = makeProject();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-outside-'));
    try {
      fs.writeFileSync(path.join(outside, 'x.js'), '// outside\n');
      mklink(outside, path.join(root, 'link'));
      writeApprovedPlan(root, 'todo', 'p-link', ['link/**']);

      const match = findCoveringPlan(path.join(root, 'link', 'x.js'), root);
      assert.equal(match, null, 'a target whose REAL location is outside the repository must not be covered');
    } finally { rm(root); rm(outside); }
  });

  it('case 2: the wildcard variant — a deep target through the same link covers nothing', () => {
    const root = makeProject();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-outside-'));
    try {
      fs.mkdirSync(path.join(outside, 'nested', 'deep'), { recursive: true });
      fs.writeFileSync(path.join(outside, 'nested', 'deep', 'x.js'), '// outside\n');
      mklink(outside, path.join(root, 'link'));
      writeApprovedPlan(root, 'todo', 'p-link', ['link/**']);

      const match = findCoveringPlan(path.join(root, 'link', 'nested', 'deep', 'x.js'), root);
      assert.equal(match, null);
    } finally { rm(root); rm(outside); }
  });

  it('case 3: a link that stays INSIDE the repository is still covered', () => {
    const root = makeProject();
    try {
      fs.writeFileSync(path.join(root, 'src', 'lib', 'x.js'), '// inside\n');
      mklink(path.join(root, 'src', 'lib'), path.join(root, 'inner'));
      writeApprovedPlan(root, 'todo', 'p-inner', ['inner/**']);

      const match = findCoveringPlan(path.join(root, 'inner', 'x.js'), root);
      assert.ok(match, 'an in-tree link is not an escape — without this the fix is a blanket denial');
      assert.equal(match.glob, 'inner/**');
    } finally { rm(root); }
  });

  it('case 4: the root itself reached THROUGH a link is still covered (the /tmp → /private/tmp shape)', () => {
    const real = makeProject();
    const holder = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-holder-'));
    try {
      fs.writeFileSync(path.join(real, 'src', 'lib', 'x.js'), '// inside\n');
      writeApprovedPlan(real, 'todo', 'p-src', ['src/lib/**']);

      // The caller hands us an UNRESOLVED root: a link that points at the project.
      const linkedRoot = path.join(holder, 'rootlink');
      mklink(real, linkedRoot);

      const match = findCoveringPlan(path.join(linkedRoot, 'src', 'lib', 'x.js'), linkedRoot);
      assert.ok(match, 'resolving the target but not the root would deny EVERY fixture in this suite');
      assert.equal(match.glob, 'src/lib/**');
    } finally { rm(real); rm(holder); }
  });

  it('case 5: a target that does not exist yet (a Write creating a file) is covered', () => {
    const root = makeProject();
    try {
      writeApprovedPlan(root, 'todo', 'p-src', ['src/lib/**']);
      const match = findCoveringPlan(path.join(root, 'src', 'lib', 'brand-new.js'), root);
      assert.ok(match, 'denying ENOENT would block every Write that creates a file');
    } finally { rm(root); }
  });

  it('case 6: a NON-EXISTENT target through an outside link covers nothing', () => {
    const root = makeProject();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-outside-'));
    try {
      mklink(outside, path.join(root, 'link'));
      writeApprovedPlan(root, 'todo', 'p-link', ['link/**']);
      const match = findCoveringPlan(path.join(root, 'link', 'brand-new.js'), root);
      assert.equal(match, null);
    } finally { rm(root); rm(outside); }
  });

  it('case 11: a link LOOP returns (bounded) and never throws', () => {
    const root = makeProject();
    try {
      writeApprovedPlan(root, 'todo', 'p-a', ['a/**']);
      mklink(path.join(root, 'b'), path.join(root, 'a'));
      mklink(path.join(root, 'a'), path.join(root, 'b'));

      let match;
      assert.doesNotThrow(() => { match = findCoveringPlan(path.join(root, 'a', 'x.js'), root); },
        'a throw reaches the hook fail-open catch and becomes an ALLOW');
      assert.equal(match, null, 'ELOOP must DENY');
    } finally { rm(root); }
  });

  it('case 12: an unresolvable root denies, and never throws', () => {
    const root = path.join(os.tmpdir(), `ctoc-absent-${Date.now()}`, 'nope');
    let match;
    assert.doesNotThrow(() => { match = findCoveringPlan(path.join(root, 'src', 'x.js'), root); });
    assert.equal(match, null);
  });

  it('case 14: the fence is not vacuous — the identical fixture with NO link IS covered', () => {
    const root = makeProject();
    try {
      fs.writeFileSync(path.join(root, 'src', 'lib', 'real.js'), '// real\n');
      writeApprovedPlan(root, 'todo', 'p-src', ['src/lib/**']);
      const match = findCoveringPlan(path.join(root, 'src', 'lib', 'real.js'), root);
      assert.ok(match, 'cases 1, 2 and 6 must fail for the LINK reason, not because the harness never matches');
      assert.equal(match.glob, 'src/lib/**');
    } finally { rm(root); }
  });
});

// ---------------------------------------------------------------------------
// The protected-directory guards — the approval ledger and the verify evidence
// ---------------------------------------------------------------------------

describe('a link cannot reach the approval ledger — protected paths', () => {

  it('case 7: the ledger reached DIRECTLY through an in-repository link is protected', () => {
    const root = makeProject();
    try {
      withCwd(root, (cwd) => {
        mklink(path.join(cwd, '.ctoc', 'approvals'), path.join(cwd, 'src', 'anywhere'));
        const target = path.join(cwd, 'src', 'anywhere', 'forged.json');
        assert.equal(isProtectedLedgerPath(target), true,
          'a write whose REAL destination is the ledger forges human-approval provenance');
      });
    } finally { rm(root); }
  });

  it('case 8: the ledger reached through a PARENT link is protected', () => {
    const root = makeProject();
    try {
      withCwd(root, (cwd) => {
        mklink(path.dirname(cwd), path.join(cwd, 'src', 'up'));
        const target = path.join(cwd, 'src', 'up', path.basename(cwd), '.ctoc', 'approvals', 'forged.json');
        assert.equal(isProtectedLedgerPath(target), true);
      });
    } finally { rm(root); }
  });

  it('case 9: the Gate-3 verify evidence reached through a link is protected', () => {
    const root = makeProject();
    try {
      withCwd(root, (cwd) => {
        mklink(path.join(cwd, '.ctoc', 'state', 'verify'), path.join(cwd, 'src', 'ev'));
        const target = path.join(cwd, 'src', 'ev', 'forged.json');
        assert.equal(isProtectedVerifyPath(target), true);
      });
    } finally { rm(root); }
  });

  it('case 10: the ARITHMETIC guards still fire unchanged — the new check adds, it does not replace', () => {
    const root = makeProject();
    try {
      withCwd(root, () => {
        // plainly under the protected dirs
        assert.equal(isProtectedLedgerPath('.ctoc/approvals/x.json'), true);
        assert.equal(isProtectedVerifyPath('.ctoc/state/verify/x.json'), true);
        // a `..` that resolves BACK INSIDE is still protected
        assert.equal(isProtectedVerifyPath('.ctoc/state/verify/../verify/x.json'), true);
        // a `..` that resolves OUT of the protected dir is NOT protected
        assert.equal(isProtectedLedgerPath('.ctoc/approvals/../x.js'), false);
        // case variants (macOS APFS / Windows route these into the real dir)
        assert.equal(isProtectedLedgerPath('.CTOC/Approvals/x.json'), true);
        // an ordinary source file is not protected
        assert.equal(isProtectedLedgerPath('src/lib/x.js'), false);
      });
    } finally { rm(root); }
  });

  it('case 13: a realpath fault DENIES — and returns rather than throwing', () => {
    const root = makeProject();
    const realOriginal = safeFs.realpathSync;
    try {
      fs.writeFileSync(path.join(root, 'src', 'lib', 'x.js'), '// x\n');
      writeApprovedPlan(root, 'todo', 'p-src', ['src/lib/**']);

      safeFs.realpathSync = () => {
        const err = new Error('permission denied');
        err.code = 'EACCES';
        throw err;
      };

      let match;
      assert.doesNotThrow(() => { match = findCoveringPlan(path.join(root, 'src', 'lib', 'x.js'), root); },
        'a throw out of a permission check reaches the fail-OPEN catch and becomes an ALLOW');
      assert.equal(match, null, 'a check that cannot look must DENY');

      withCwd(root, () => {
        let protectedVerdict;
        assert.doesNotThrow(() => { protectedVerdict = isProtectedLedgerPath('src/lib/x.js'); });
        assert.equal(protectedVerdict, true, 'a check that cannot look must treat the path as protected');
      });
    } finally {
      safeFs.realpathSync = realOriginal;
      rm(root);
    }
  });
});

// ---------------------------------------------------------------------------
// The predicate itself — the two OPPOSITE failing directions, and every input
// that is not a path at all. Both functions must return, never throw.
//
// DOCUMENTED UNREACHABLE (honesty clause — no fabricated hit):
//   real-path-confinement.js — the loop-exhaustion return after MAX_ANCESTOR_WALK
//   and the two outermost `catch` blocks in `resolveExisting` and `resolvesUnder`.
//   The walk terminates at the `path.dirname` fixed point long before 4096
//   iterations on every real filesystem, and the outer catches sit behind input
//   type-guards over `path.join`/`path.resolve`, which are total for the string
//   inputs that survive those guards. They are a SECOND, independent bound whose
//   whole purpose is that nothing reaches them; reaching them would need
//   monkeypatching `path` itself. Documented, not faked.
// ---------------------------------------------------------------------------

describe('real-path confinement — the two opposite failing directions', () => {

  it('escapesRoot: DENIES (escapes:true) on every input that is not a usable path', () => {
    const root = makeProject();
    try {
      assert.equal(escapesRoot('', root).escapes, true);
      assert.equal(escapesRoot(null, root).escapes, true);
      assert.equal(escapesRoot('src/lib/x.js', '').escapes, true);
      assert.equal(escapesRoot('src/lib/x.js', null).escapes, true);
      // a NUL byte cannot be resolved: safe-fs refuses it, and the refusal must
      // land as a returned DENY rather than as a thrown exception
      assert.equal(escapesRoot('src/lib/\0evil.js', root).escapes, true);
      // an ancestor that is a FILE (ENOTDIR) is not a path we can see through
      fs.writeFileSync(path.join(root, 'src', 'lib', 'afile.js'), '// f\n');
      assert.equal(escapesRoot(path.join(root, 'src', 'lib', 'afile.js', 'child.js'), root).escapes, true);
      // and the control: an ordinary in-tree path does NOT escape
      assert.equal(escapesRoot('src/lib/afile.js', root).escapes, false);
    } finally { rm(root); }
  });

  it('resolvesUnder: DENIES (true) on every fault — the INVERTED direction', () => {
    const root = makeProject();
    try {
      // a target that is not a path at all is not something to protect
      assert.equal(resolvesUnder('', '.ctoc/approvals', root), false);
      assert.equal(resolvesUnder(null, '.ctoc/approvals', root), false);
      // every OTHER fault denies
      assert.equal(resolvesUnder('x.json', '', root), true);
      assert.equal(resolvesUnder('x.json', null, root), true);
      assert.equal(resolvesUnder('x.json', '.ctoc/approvals', ''), true);
      assert.equal(resolvesUnder('x.json', '.ctoc/approvals', null), true);
      assert.equal(resolvesUnder('\0x.json', '.ctoc/approvals', root), true);
      // and the controls, both ways
      assert.equal(resolvesUnder('.ctoc/approvals/x.json', '.ctoc/approvals', root), true);
      assert.equal(resolvesUnder('src/lib/x.js', '.ctoc/approvals', root), false);
      // a same-prefix SIBLING directory is not within — the separator is required
      fs.mkdirSync(path.join(root, '.ctoc', 'approvalsOTHER'), { recursive: true });
      assert.equal(resolvesUnder('.ctoc/approvalsOTHER/x.json', '.ctoc/approvals', root), false);
    } finally { rm(root); }
  });
});

// ---------------------------------------------------------------------------
// The owner's decision of 2026-10-15, "Check real file": a path is compared with
// the protected folder by what the disk opens (device and inode), not by its
// spelling; `..` after a link goes where the file system goes; a protected folder
// that cannot be one holds nothing; every fault refuses and nothing throws. A case
// checks ALL its rows and fails once at the end naming every failed row, so a red or
// green record is per row. Case numbers continue the file's (14 is its last).
// ---------------------------------------------------------------------------

describe('the protected folder is compared by file identity (owner, 2026-10-15)', () => {
  const confinement = require('../src/lib/real-path-confinement');
  const LONG_S = 'ſ'; // U+017F: NFKC folds it to `s`, and APFS opens it as `s`

  /** A project as `makeProject` builds it, with its real path, so expected real paths compare as text. */
  function makeRealProject() {
    const dir = makeProject();
    return { dir, root: fs.realpathSync(dir) };
  }

  /** The sentinel project of the mocks: its folder name holds `ctoc-identity-fault`. */
  function makeSentinelProject() {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-identity-fault-')));
    for (const d of [['plans', 'in-progress'], ['plans', 'todo'], ['.ctoc', 'approvals'], ['.ctoc', 'state', 'verify'], ['src', 'lib']]) {
      fs.mkdirSync(path.join(root, ...d), { recursive: true });
    }
    return root;
  }

  function makeRows() {
    const failures = [];
    return {
      row(label, fn) {
        try {
          fn();
        } catch (err) {
          failures.push(`${label} => ${String(err && err.message).split('\n')[0]}`);
        }
      },
      done() {
        assert.equal(failures.length, 0, `${failures.length} row(s) failed:\n${failures.join('\n')}`);
      },
    };
  }

  /** Asks the disk whether two spellings open the same file (device and inode); never assumes. */
  function sameFileOnDisk(real, alias) {
    try {
      const a = fs.statSync(real, { bigint: true });
      const b = fs.statSync(alias, { bigint: true });
      return a.dev === b.dev && a.ino === b.ino;
    } catch (err) {
      if (err.code === 'ENOENT') return false;
      throw err;
    }
  }

  /** The value of `fn`, asserting it did not throw. */
  function noThrow(fn) {
    let value;
    assert.doesNotThrow(() => { value = fn(); });
    return value;
  }

  it('case 15: a look-alike spelling of an existing protected folder is inside exactly when this disk opens it as that folder', () => {
    const { dir, root } = makeRealProject();
    const R = makeRows();
    try {
      const folds = sameFileOnDisk(path.join(root, '.ctoc', 'state'), path.join(root, '.ctoc', `${LONG_S}tate`));
      R.row(`the long s equals sameFileOnDisk (${folds})`, () => assert.equal(
        resolvesUnder(`.ctoc/${LONG_S}tate/verify/x.json`, '.ctoc/state/verify', root), folds));
      R.row('upper case is inside everywhere', () => assert.equal(resolvesUnder('.ctoc/STATE/VERIFY/x.json', '.ctoc/state/verify', root), true));
      fs.writeFileSync(path.join(root, '.ctoc', 'settings.yaml'), 'x: 1');
      fs.linkSync(path.join(root, '.ctoc', 'settings.yaml'), path.join(root, 'src', 'h.yaml'));
      R.row('a hard link to the settings file is inside it', () => assert.equal(resolvesUnder('src/h.yaml', '.ctoc/settings.yaml', root), true));
      fs.writeFileSync(path.join(root, 'src', 'a.js'), '// a\n');
      fs.linkSync(path.join(root, 'src', 'a.js'), path.join(root, 'src', 'b.js'));
      for (const protectedRel of ['.ctoc/approvals', '.ctoc/state/verify', '.ctoc/streaming', '.ctoc/settings.yaml']) {
        R.row(`an ordinary hard link is outside ${protectedRel}`, () => assert.equal(resolvesUnder('src/b.js', protectedRel, root), false));
      }
    } finally { rm(dir); }
    R.done();
  });

  it('case 16: a protected folder that does not exist yet is compared through its nearest existing parent and the folded missing names', () => {
    const { dir, root } = makeRealProject();
    const R = makeRows();
    try {
      fs.rmSync(path.join(root, '.ctoc', 'approvals'), { recursive: true, force: true });
      for (const target of [`.ctoc/approval${LONG_S}/x.json`, '.ctoc/APPROVALS/x.json', '.ctoc/approvals/x.json']) {
        R.row(`${target} is inside`, () => assert.equal(resolvesUnder(target, '.ctoc/approvals', root), true));
      }
      for (const target of ['.ctoc/approvals-old/x.json', '.ctoc/x.json', 'src/lib/x.js']) {
        R.row(`${target} is outside`, () => assert.equal(resolvesUnder(target, '.ctoc/approvals', root), false));
      }
    } finally { rm(dir); }
    R.done();
  });

  it('case 17: a dangling link inside the store locks nothing out; one on the protected path still refuses everything', () => {
    const { dir, root } = makeRealProject();
    const R = makeRows();
    try {
      fs.mkdirSync(path.join(root, '.ctoc', 'streaming', 'questions'), { recursive: true });
      mklink(path.join(root, 'gone'), path.join(root, '.ctoc', 'streaming', 'questions', 'pending'));
      R.row('src/x.js is outside the store', () => assert.equal(resolvesUnder('src/x.js', '.ctoc/streaming', root), false));
      R.row('the answers log is inside the store', () => assert.equal(resolvesUnder('.ctoc/streaming/answers.jsonl', '.ctoc/streaming', root), true));
      fs.rmSync(path.join(root, '.ctoc', 'approvals'), { recursive: true, force: true });
      mklink(path.join(root, 'gone2'), path.join(root, '.ctoc', 'approvals'));
      R.row('a dangling protected path refuses every target', () => assert.equal(resolvesUnder('src/x.js', '.ctoc/approvals', root), true));
    } finally { rm(dir); }
    R.done();
  });

  it('case 18: a link, then `..`, as the file system walks it', () => {
    const { dir, root } = makeRealProject();
    const R = makeRows();
    try {
      mklink(path.join(root, '.ctoc', 'state'), path.join(root, 'src', 'L'));
      R.row('src/L/../approvals/y.json is inside the approval records', () => assert.equal(
        resolvesUnder('src/L/../approvals/y.json', '.ctoc/approvals', root), true));
      R.row('the same, absolute', () => assert.equal(
        resolvesUnder(`${root}/src/L/../approvals/y.json`, '.ctoc/approvals', root), true));
      R.row('resolveExisting of src/L/../approvals', () => assert.deepEqual(
        confinement.resolveExisting(`${root}/src/L/../approvals`),
        { ok: true, real: path.join(root, '.ctoc', 'approvals'), reason: null, tail: [] }));
      fs.mkdirSync(path.join(root, 'src', 'a'));
      R.row('src/a/../b.js: real path', () => assert.equal(confinement.resolveExisting(`${root}/src/a/../b.js`).real, path.join(root, 'src', 'b.js')));
      R.row('src/a/../b.js: tail', () => assert.deepEqual(confinement.resolveExisting(`${root}/src/a/../b.js`).tail, ['b.js']));
      R.row('src/a/../b.js is outside the approval records', () => assert.equal(
        resolvesUnder('src/a/../b.js', '.ctoc/approvals', root), false));
      R.row('src/new/../b.js (src/new absent): real path', () => assert.equal(
        confinement.resolveExisting(`${root}/src/new/../b.js`).real, path.join(root, 'src', 'b.js')));
      R.row('src/new/../b.js (src/new absent): tail', () => assert.deepEqual(
        confinement.resolveExisting(`${root}/src/new/../b.js`).tail, ['b.js']));
      R.row('the climb: src/L/missing/../../approvals/y.json', () => assert.equal(
        confinement.resolveExisting(`${root}/src/L/missing/../../approvals/y.json`).real, path.join(root, '.ctoc', 'approvals', 'y.json')));
      R.row('src/L/missing/../x.json: real path', () => assert.equal(
        confinement.resolveExisting(`${root}/src/L/missing/../x.json`).real, path.join(root, '.ctoc', 'state', 'x.json')));
      R.row('src/L/missing/../x.json is outside the check records', () => assert.equal(
        resolvesUnder(`${root}/src/L/missing/../x.json`, '.ctoc/state/verify', root), false));
      mklink(path.join(root, '.ctoc', 'approvals'), path.join(root, '.ctoc', 'K'));
      R.row('a link met after the climb is followed', () => assert.equal(
        resolvesUnder('src/L/missing/../../K/y.json', '.ctoc/approvals', root), true));
      mklink(path.join(root, 'gone3'), path.join(root, '.ctoc', 'D'));
      R.row('a dangling link met after the climb', () => assert.equal(
        confinement.resolveExisting(`${root}/src/L/missing/../../D/y.json`).reason, 'dangling'));

      // Two links: src/K2 holds the relative contents M/../approvals (a junction to the tidied path on Windows).
      mklink(path.join(root, '.ctoc', 'state'), path.join(root, 'src', 'M'));
      if (process.platform === 'win32') mklink(`${root}/src/M/../approvals`, path.join(root, 'src', 'K2'));
      else mklink('M/../approvals', path.join(root, 'src', 'K2'), 'dir');
      R.row('two links: src/K2/y.json is inside the approval records', () => assert.equal(
        resolvesUnder('src/K2/y.json', '.ctoc/approvals', root), true));

      // 41 links: past the walk's budget of 40. Each link's contents are an absolute path.
      for (let i = 1; i <= 41; i++) {
        mklink(i === 41 ? path.join(root, 'src') : path.join(root, 'src', `c${i + 1}`), path.join(root, 'src', `c${i}`));
      }
      R.row(`41 links is a loop [platform ${process.platform}]`, () => assert.equal(
        confinement.resolveExisting(`${root}/src/c1/x.js`).reason, 'loop'));
      R.row(`40 links resolve [platform ${process.platform}]`, () => assert.equal(
        confinement.resolveExisting(`${root}/src/c2/x.js`).ok, true));
    } finally { rm(dir); }
    R.done();
  });

  it('case 19: a protected folder that cannot be one holds nothing', () => {
    const { dir, root } = makeRealProject();
    const R = makeRows();
    const state = path.join(root, '.ctoc', 'state');
    const verdicts = (label) => {
      R.row(`${label}: src/x.js is outside`, () => assert.equal(resolvesUnder('src/x.js', '.ctoc/state/verify', root), false));
      R.row(`${label}: the folder's own path is refused`, () => assert.equal(resolvesUnder('.ctoc/state/verify/x.json', '.ctoc/state/verify', root), true));
      R.row(`${label}: a link into it is refused`, () => assert.equal(resolvesUnder('src/V/x.json', '.ctoc/state/verify', root), true));
    };
    try {
      // (i) a file where the folder is expected.
      fs.rmSync(state, { recursive: true, force: true });
      fs.writeFileSync(state, 'x');
      mklink(path.join(root, '.ctoc', 'state', 'verify'), path.join(root, 'src', 'V'));
      R.row('(i) the reason is not-a-folder', () => assert.equal(
        confinement.resolveExisting(`${root}/.ctoc/state/verify`).reason, 'not-a-folder'));
      verdicts('(i) a file');
      // (ii) a folder this user cannot search. On Windows and as root the folder stays searchable.
      fs.rmSync(state, { force: true });
      fs.mkdirSync(path.join(state, 'verify'), { recursive: true });
      fs.chmodSync(state, 0o000);
      try {
        const unsearchable = process.platform !== 'win32' && !(typeof process.getuid === 'function' && process.getuid() === 0);
        const found = confinement.resolveExisting(`${root}/.ctoc/state/verify`);
        R.row(`(ii) the reason is denied where the folder is really unsearchable (${unsearchable})`, () => {
          if (unsearchable) assert.equal(found.reason, 'denied');
          else assert.equal(found.ok, true);
        });
        verdicts('(ii) unsearchable');
      } finally {
        fs.chmodSync(state, 0o755);
      }
    } finally { rm(dir); }
    R.done();
  });

  it('case 20: a disk without identities keeps the text verdicts', (t) => {
    const root = makeSentinelProject();
    const R = makeRows();
    try {
      const realStat = safeFs.statSync;
      t.mock.method(safeFs, 'statSync', (p, o) => {
        const st = realStat(p, o);
        return o && o.bigint && String(p).includes('ctoc-identity-fault')
          ? Object.assign(Object.create(Object.getPrototypeOf(st)), st, { ino: 0n })
          : st;
      });
      R.row('.ctoc/approvals/x.json is inside', () => assert.equal(resolvesUnder('.ctoc/approvals/x.json', '.ctoc/approvals', root), true));
      R.row('.ctoc/APPROVALS/x.json is inside', () => assert.equal(resolvesUnder('.ctoc/APPROVALS/x.json', '.ctoc/approvals', root), true));
      R.row('src/x.js is outside', () => assert.equal(resolvesUnder('src/x.js', '.ctoc/approvals', root), false));
      R.row('the long-s spelling is outside (the text cannot fold, no identity is given)', () => assert.equal(
        resolvesUnder(`.ctoc/approval${LONG_S}/x.json`, '.ctoc/approvals', root), false));
    } finally { rm(root); }
    R.done();
  });

  it('case 21: every new fault refuses, nothing throws, and the bounds hold', (t) => {
    const root = makeSentinelProject();
    const R = makeRows();
    try {
      const realStat = safeFs.statSync;
      let key = null;
      let aboveRoot = false;
      t.mock.method(safeFs, 'statSync', (p, o) => {
        const strictAncestor = typeof p === 'string' && p !== root && root.startsWith(p.endsWith(path.sep) ? p : p + path.sep);
        if (o && o.bigint && ((key !== null && p === key) || (aboveRoot && strictAncestor))) {
          throw Object.assign(new Error('injected'), { code: 'EACCES' });
        }
        return realStat(p, o);
      });
      R.row('control: no fault, src/x.js is outside', () => assert.equal(
        noThrow(() => resolvesUnder('src/x.js', '.ctoc/approvals', root)), false));
      for (const [label, faulted] of [['the project root', root], ['the protected folder', path.join(root, '.ctoc', 'approvals')], ['src', path.join(root, 'src')]]) {
        R.row(`a stat fault on ${label} refuses`, () => {
          key = faulted;
          try {
            assert.equal(noThrow(() => resolvesUnder('src/x.js', '.ctoc/approvals', root)), true);
          } finally {
            key = null;
          }
        });
      }
      R.row('a stat fault above the root is never asked (the chain stops at the root)', () => {
        aboveRoot = true;
        try {
          assert.equal(noThrow(() => resolvesUnder('src/x.js', '.ctoc/approvals', root)), false);
        } finally {
          aboveRoot = false;
        }
      });
      R.row('a spent decision budget refuses at resolvesUnder, faults the walk, and budgetSpent says so', () => {
        try {
          confinement.setDeadline(Date.now() - 1);
          assert.equal(noThrow(() => resolvesUnder('src/x.js', '.ctoc/approvals', root)), true);
          assert.equal(noThrow(() => confinement.resolveExisting(path.join(root, 'src', 'x.js'))).reason, 'resolve-failed');
          assert.equal(confinement.budgetSpent(), true);
        } finally {
          if (typeof confinement.setDeadline === 'function') confinement.setDeadline(null);
        }
      });
      R.row('with the budget cleared the verdict is back', () => {
        assert.equal(noThrow(() => resolvesUnder('src/x.js', '.ctoc/approvals', root)), false);
        assert.equal(confinement.budgetSpent(), false);
      });
    } finally { rm(root); }
    R.done();
  });

  it('case 22: a single name longer than the file system holds cannot exist, so it is a name still to be made (not a fault)', () => {
    const { dir, root } = makeRealProject();
    const R = makeRows();
    try {
      const long = 'n'.repeat(300);
      R.row('resolveExisting of a 300-byte name is ok with the name in the tail', () => assert.deepEqual(
        confinement.resolveExisting(path.join(root, long)),
        { ok: true, real: path.join(root, long), reason: null, tail: [long] }));
      R.row('a 300-byte name is outside the approval records', () => assert.equal(resolvesUnder(long, '.ctoc/approvals', root), false));
      const wide = 'あ'.repeat(100); // 100 characters, 300 UTF-8 bytes: over the 255-byte name limit, under 255 characters
      // Counted in characters (case 24): only macOS, whose limit is 255 characters, answers "no such file" here; a
      // Linux disk (255 bytes) answers ENAMETOOLONG, which is a fault and so refused (the safe side).
      R.row('a name of 100 non-Latin characters (300 bytes) is a name still to be made where the disk allows it', () => assert.equal(
        resolvesUnder(wide, '.ctoc/approvals', root), process.platform !== 'darwin'));
    } finally { rm(dir); }
    R.done();
  });

  it('case 23: a long WHOLE path is not "absent": only one over-long NAME is, and no candidate is skipped for its length', () => {
    // An ordinary folder `P` stands in for the protected folder (never `.ctoc`). A deep folder is made by
    // changing into it step by step, because the system refuses to make it by one long path. The system's
    // limit on a whole path (PATH_MAX): 1,024 on macOS, 4,096 on Linux. The link's own lstat then fails
    // with ENAMETOOLONG although every name in it is short, and the object exists.
    const { isLedgerWrite } = require('../src/hooks/PreToolUse.Bash.js');
    const pathMax = process.platform === 'darwin' ? 1024 : 4096;
    const never = /(^|[^a-z0-9._-])zz-never-matches\/+x(\s|$)/;
    const spec = Object.freeze({ dir: 'P', segmentRe: never, resolvedRe: never });
    const { dir, root } = makeRealProject();
    const R = makeRows();
    const here = process.cwd();
    const link = 'linklink';
    const made = []; // { names, linked } of each deep tree, for the cleanup (also by `chdir`, never by a long path)
    /** Makes folders of the given name lengths below the project root by `chdir`, then a link `linklink` to `P` inside the last. */
    const deepen = (levels, letter) => {
      const entry = { names: [], linked: false };
      made.push(entry);
      process.chdir(root);
      for (const n of levels) {
        const name = `${letter}${'d'.repeat(n - 1)}`;
        fs.mkdirSync(name);
        entry.names.push(name);
        process.chdir(name);
      }
      mklink(path.join(root, 'P'), link);
      entry.linked = true;
      process.chdir(root);
      return entry.names;
    };
    const undeepen = ({ names, linked }) => {
      process.chdir(root);
      for (const name of names) process.chdir(name);
      if (linked) fs.unlinkSync(link);
      for (const name of [...names].reverse()) { process.chdir('..'); fs.rmdirSync(name); }
    };
    try {
      fs.mkdirSync(path.join(root, 'P'));
      process.chdir(root);
      // D: a real path of PATH_MAX - 9 bytes, so `<D>/linklink` is exactly PATH_MAX bytes.
      const levels = [];
      let remaining = pathMax - 9 - Buffer.byteLength(root);
      while (remaining > 0) {
        let n = remaining - 1;
        if (n > 200) n = remaining - 201 === 1 ? 199 : 200;
        levels.push(n);
        remaining -= n + 1;
      }
      const names = deepen(levels, 'a');
      const D = path.join(root, ...names);
      assert.equal(Buffer.byteLength(D), pathMax - 9, `D is ${pathMax - 9} bytes`);
      assert.throws(() => fs.lstatSync(path.join(D, link)), { code: 'ENAMETOOLONG' }, 'the link inside D cannot be asked by its whole path');
      R.row('resolvesUnder of <D>/<link>/x reaches P through the link', () => assert.equal(resolvesUnder(path.join(D, link, 'x'), 'P', root), true));
      R.row('isLedgerWrite of cd <D> && echo x > <link>/x', () => assert.equal(isLedgerWrite(`cd ${D} && echo x > ${link}/x`, spec), true));
      R.row('control: the same link at the project root reaches P (true), a plain name there does not', () => {
        mklink(path.join(root, 'P'), path.join(root, link));
        assert.equal(resolvesUnder(path.join(root, link, 'x'), 'P', root), true);
        assert.equal(resolvesUnder(path.join(root, 'plans', 'nothing'), 'P', root), false);
      });
      // A `cd` chain over 4,096 bytes (no `..`, so the tidied and the written readings are the same).
      const chain = deepen(Array.from({ length: 22 }, () => 200), 'c');
      const long = chain.map((n) => `cd ${n}`).join(' && ');
      assert.ok(long.length > 4096, 'the chain is over 4,096 bytes');
      R.row('isLedgerWrite of a cd chain over 4,096 bytes then echo x > <link>/x', () => assert.equal(
        isLedgerWrite(`${long} && echo x > ${link}/x`, spec), true));
      // CONTROLS that stay allowed.
      R.row('echo of a 300-character word', () => assert.equal(isLedgerWrite(`echo ${'x'.repeat(300)}`, spec), false));
      R.row('echo of a 20,000-character word', () => assert.equal(isLedgerWrite(`echo ${'x'.repeat(20000)}`, spec), false));
      // 100 characters = 300 bytes: absent on macOS (limit 255 characters); on a 255-byte disk ENAMETOOLONG is a fault, refused.
      R.row('echo of a quoted name of 100 non-Latin characters', () => assert.equal(
        isLedgerWrite(`echo "${'あ'.repeat(100)}"`, spec), process.platform !== 'darwin'));
      R.row('cp of a 300-character file name', () => assert.equal(isLedgerWrite(`cp x ${'n'.repeat(300)}`, spec), false));
    } finally {
      try {
        for (const entry of made) undeepen(entry);
      } finally {
        process.chdir(here);
        rm(dir);
      }
    }
    R.done();
  });

  it('case 24: a link named in non-Latin characters is not "absent" when only its whole path is too long (names are counted in characters, not bytes)', () => {
    // The file system limits a NAME to 255 characters (macOS) or 255 bytes (Linux), so a name of 100 Chinese
    // characters (300 bytes) is creatable on macOS. Its link is then reached through a deep folder whose whole
    // path is over PATH_MAX: lstat fails with ENAMETOOLONG for the WHOLE path, not for the name. Counting the
    // name in bytes called it "a name still to be made" and let the write through. Elsewhere 80 characters (240 bytes).
    const { isLedgerWrite } = require('../src/hooks/PreToolUse.Bash.js');
    const darwin = process.platform === 'darwin';
    const never = /(^|[^a-z0-9._-])zz-never-matches\/+x(\s|$)/;
    const { dir, root } = makeRealProject();
    const spec = Object.freeze({ dir: 'P', segmentRe: never, resolvedRe: never });
    const R = makeRows();
    const here = process.cwd();
    const link = 'あ'.repeat(darwin ? 100 : 80);
    const names = [];
    let linked = false;
    try {
      fs.mkdirSync(path.join(root, 'P'));
      process.chdir(root);
      let remaining = (darwin ? 900 : 3900) - Buffer.byteLength(root);
      while (remaining > 1) {
        const n = Math.min(200, remaining - 1);
        const name = `w${'d'.repeat(n - 1)}`;
        fs.mkdirSync(name);
        names.push(name);
        process.chdir(name);
        remaining -= n + 1;
      }
      mklink(path.join(root, 'P'), link);
      linked = true;
      process.chdir(root);
      const deep = path.join(root, ...names);
      assert.throws(() => fs.lstatSync(path.join(deep, link, 'y')), { code: 'ENAMETOOLONG' }, 'the whole path is too long for lstat');
      R.row('resolvesUnder of <deep>/<link>/y reaches P through the link', () => assert.equal(resolvesUnder(path.join(deep, link, 'y'), 'P', root), true));
      R.row('isLedgerWrite of cd <deep> && touch <link>/y', () => assert.equal(isLedgerWrite(`cd ${deep} && touch ${link}/y`, spec), true));
      // The limit is 255 UTF-16 units (APFS and NTFS), not code points: 128 emoji are 256 units, a name that
      // cannot exist (ENAMETOOLONG out of the caller's text = a name still to be made), so it is allowed.
      R.row('echo of a word of 128 emoji (256 UTF-16 units) is allowed', () => assert.equal(isLedgerWrite(`echo ${'😀'.repeat(128)}`, spec), false));
    } finally {
      try {
        process.chdir(root);
        for (const name of names) process.chdir(name);
        if (linked) fs.unlinkSync(link);
        for (const name of [...names].reverse()) { process.chdir('..'); fs.rmdirSync(name); }
      } finally {
        process.chdir(here);
        rm(dir);
      }
    }
    R.done();
  });

  it('case 25: a link named by 127 emoji (254 UTF-16 units) is a real name, so a write through it from a deep folder is refused', () => {
    // The guard on the other side of case 24's emoji row: the unit count must not be loosened past 255.
    // 127 emoji = 508 bytes, creatable on macOS (units counted); a 255-byte disk takes 63 (252 bytes, 126 units).
    const { isLedgerWrite } = require('../src/hooks/PreToolUse.Bash.js');
    const darwin = process.platform === 'darwin';
    const never = /(^|[^a-z0-9._-])zz-never-matches\/+x(\s|$)/;
    const { dir, root } = makeRealProject();
    const spec = Object.freeze({ dir: 'P', segmentRe: never, resolvedRe: never });
    const R = makeRows();
    const here = process.cwd();
    const link = '😀'.repeat(darwin ? 127 : 63);
    const names = [];
    let linked = false;
    try {
      fs.mkdirSync(path.join(root, 'P'));
      process.chdir(root);
      let remaining = (darwin ? 900 : 3900) - Buffer.byteLength(root);
      while (remaining > 1) {
        const n = Math.min(200, remaining - 1);
        const name = `e${'d'.repeat(n - 1)}`;
        fs.mkdirSync(name);
        names.push(name);
        process.chdir(name);
        remaining -= n + 1;
      }
      mklink(path.join(root, 'P'), link);
      linked = true;
      process.chdir(root);
      const deep = path.join(root, ...names);
      assert.throws(() => fs.lstatSync(path.join(deep, link, 'y')), { code: 'ENAMETOOLONG' }, 'the whole path is too long for lstat');
      R.row('resolvesUnder of <deep>/<emoji link>/y reaches P through the link', () => assert.equal(resolvesUnder(path.join(deep, link, 'y'), 'P', root), true));
      R.row('isLedgerWrite of cd <deep> && touch <emoji link>/y', () => assert.equal(isLedgerWrite(`cd ${deep} && touch ${link}/y`, spec), true));
    } finally {
      try {
        process.chdir(root);
        for (const name of names) process.chdir(name);
        if (linked) fs.unlinkSync(link);
        for (const name of [...names].reverse()) { process.chdir('..'); fs.rmdirSync(name); }
      } finally {
        process.chdir(here);
        rm(dir);
      }
    }
    R.done();
  });

  it('case 26: a spelling the walk cannot follow (/.vol/<device>/<inode>/…, /.nofollow<path>) that the kernel opens is refused, never read as a name still to be made', () => {
    // macOS opens an existing folder through /.vol/<device>/<inode> and through /.nofollow<absolute path>;
    // the walk's `lstat` of `.vol` / `.nofollow` answers "no such file". Each row asks the KERNEL first
    // (writes a file through the spelling into the stand-in folder P, in this test's own temporary folder)
    // and expects `resolvesUnder` true wherever the kernel reached P. Elsewhere the spelling names nothing,
    // the kernel does not reach P, and the verdict is false: the platform's true behaviour.
    const { dir, root } = makeRealProject();
    const R = makeRows();
    try {
      const P = path.join(root, 'P');
      fs.mkdirSync(P);
      const sp = fs.statSync(P);
      const sr = fs.statSync(root);
      const rows = [
        ['/.vol/<device>/<inode of P>/x', `/.vol/${sp.dev}/${sp.ino}/x`],
        ['/.vol/<device>/<inode of the project>/P/x', `/.vol/${sr.dev}/${sr.ino}/P/x`],
        ['/.nofollow<project>/P/x', `/.nofollow${root}/P/x`],
      ];
      for (const [label, spelling] of rows) {
        let reaches = false;
        try {
          fs.writeFileSync(spelling, 'k');
          reaches = fs.existsSync(path.join(P, 'x'));
        } catch { reaches = false; }
        fs.rmSync(path.join(P, 'x'), { force: true });
        if (process.platform === 'darwin') assert.equal(reaches, true, `the kernel reaches P through ${label} on macOS`);
        R.row(`${label}: kernel reaches P=${reaches}; resolvesUnder`, () => assert.equal(resolvesUnder(spelling, 'P', root), reaches));
      }
      // Controls: a genuinely absent name below an existing folder, and below P, keep their verdicts.
      R.row('control: <project>/Q/new is not under P', () => assert.equal(resolvesUnder(path.join(root, 'Q', 'new'), 'P', root), false));
      R.row('control: <project>/P/new/deeper is under P', () => assert.equal(resolvesUnder(path.join(P, 'new', 'deeper'), 'P', root), true));
      R.row('control: <project>/new/../x.js is not under P', () => assert.equal(resolvesUnder(`${root}/new/../x.js`, 'P', root), false));
    } finally {
      rm(dir);
    }
    R.done();
  });

  // -------------------------------------------------------------------------------------------
  // The settings check counts its work, not the clock (owner, 2026-10-19). Cases 27 and 28 count
  // file-system calls and units in this process, never wall time: a verdict here depends on the
  // count and on a mocked clock only. Every row clears the count and the backstop in `finally`
  // (all tests of a file share one process, so a leftover memory would serve stale answers).
  // -------------------------------------------------------------------------------------------

  const { isLedgerWrite } = require('../src/hooks/PreToolUse.Bash.js');
  const NEVER = /(?!)/;

  /** The builder's ordinary here-document (hook case 161): `lines` of test, first line given. */
  function builderCommand(first = "cd copy && cd src && cd .. && cat > tests/claude-setup-check.test.js <<'EOF'", lines = 300) {
    return [first, "'use strict';", "const { route } = require('../src/lib/menu-screens');",
      ...Array.from({ length: lines }, (_, i) => `  test('${i} claude-setup apply advisor writes the setting', () => { assert.equal(route(['claude-setup', 'apply', 'advisor'], dir).ok, true); });`),
      'EOF', 'node --test tests/claude-setup-check.test.js'].join('\n');
  }

  /** The 2,000-line here-document of distinct words (the same text as the hook file's fixture). */
  function twoThousandLines(first = "cd copy && cd src && cd .. && cat > tests/claude-setup-check.test.js <<'EOF'") {
    const lines = Array.from({ length: 2000 }, (_, k) => {
      const i = String(k).padStart(4, '0');
      return `t('${i} a${i}', () => f${i}(['c${i}', 'd${i}']));`;
    });
    return [first, ...lines, 'EOF'].join('\n');
  }

  /** The nine-check layout: a project at `<tmp>/<scratch>/.claude/worktrees/w`, with `copy/src`. */
  function makeNineLayout() {
    const outer = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-nine-')));
    const root = path.join(outer, '.claude', 'worktrees', 'w');
    for (const d of [['.ctoc', 'approvals'], ['.ctoc', 'state', 'verify'], ['src'], ['copy', 'src']]) {
      fs.mkdirSync(path.join(root, ...d), { recursive: true });
    }
    fs.mkdirSync(path.join(outer, 'cfg'));
    // The nine relative paths of the settings checks of a background agent in a worktree.
    const dirs = ['.ctoc/settings.yaml', '.ctoc/regulatory-regimes', '.claude/settings.json', '.claude/settings.local.json',
      '.ctoc/settings.json', '../../../cfg/settings.json', '../../settings.json', '../../settings.local.json', '../../../.ctoc/settings.json'];
    return { outer, root, dirs };
  }

  /**
   * The delegating counters of the file-system calls the resolver makes. A plain wrapper, put back when the case ends:
   * `t.mock.method` keeps every call's arguments and result, which is millions of entries for a here-document read
   * without the memory (a process out of memory instead of a failed row).
   */
  function countFsCalls(t) {
    const counter = { n: 0 };
    for (const name of ['lstatSync', 'statSync', 'realpathSync', 'readlinkSync']) {
      const real = safeFs[name];
      safeFs[name] = (...args) => { counter.n += 1; return real(...args); };
      t.after(() => { safeFs[name] = real; });
    }
    return counter;
  }

  /** Clears the decision's count (and with it the memory) and the backstop. */
  function clearWork() {
    confinement.setWorkBudget(null);
    confinement.setDeadline(null);
  }

  it('case 27: within one decision a lookup is made once, and the memory dies with the decision', (t) => {
    const R = makeRows();
    const counter = countFsCalls(t);
    const { dir, root } = makeRealProject();
    const nine = makeNineLayout();
    const segmentsOf = (p) => p.split(path.sep).filter(Boolean).length;
    /** Runs the first `lines`-line command once per spec of the nine, returns the calls each check made. */
    const nineChecks = (command, memoryOn) => withCwd(nine.root, () => {
      confinement.setWorkBudget(memoryOn ? 3000000 : null);
      const calls = [];
      for (const d of nine.dirs) {
        const before = counter.n;
        const verdict = isLedgerWrite(command, { dir: d, segmentRe: NEVER, resolvedRe: NEVER });
        calls.push({ d, n: counter.n - before, verdict });
      }
      return calls;
    });
    try {
      R.row('(i) a second ask of the same question makes 0 file-system calls', () => {
        try {
          confinement.setWorkBudget(3000000);
          assert.equal(resolvesUnder('src/x.js', '.ctoc/approvals', root), false);
          const before = counter.n;
          assert.equal(resolvesUnder('src/x.js', '.ctoc/approvals', root), false);
          assert.ok(before > 0, 'the first ask made calls');
          assert.equal(counter.n - before, 0, 'the second ask is answered from memory');
        } finally { clearWork(); }
      });

      R.row('(ii) nine checks of the builder cost about one with the memory, and at least 5 times more without it', () => {
        try {
          const command = builderCommand().split('\n').slice(0, 10).join('\n');
          const on = nineChecks(command, true);
          for (const c of on) assert.equal(c.verdict, false, `the check of ${c.d} allows`);
          const bound = (d) => 2 * segmentsOf(path.join(nine.root, d)) + 6;
          for (const c of on.slice(1)) assert.ok(c.n <= bound(c.d), `check ${c.d}: ${c.n} calls, at most ${bound(c.d)}`);
          const off = nineChecks(command, false);
          for (const c of off.slice(1)) assert.ok(c.n > bound(c.d), `check ${c.d} without the memory: ${c.n} calls, more than ${bound(c.d)}`);
          const sum = (rows) => rows.reduce((a, c) => a + c.n, 0);
          assert.ok(sum(off) >= 5 * sum(on), `without ${sum(off)} against with ${sum(on)}: at least 5 times`);
        } finally { clearWork(); }
      });

      R.row('(iii) the memory never outlives the decision', () => {
        try {
          confinement.setWorkBudget(3000000);
          assert.equal(resolvesUnder('src/L/x.json', '.ctoc/approvals', root), false, '(src/L absent)');
          mklink(path.join(root, '.ctoc', 'approvals'), path.join(root, 'src', 'L'));
          confinement.setWorkBudget(3000000);
          assert.equal(resolvesUnder('src/L/x.json', '.ctoc/approvals', root), true, 'a fresh decision sees the link');
          confinement.setWorkBudget(null);
          assert.equal(resolvesUnder('src/L/x.json', '.ctoc/approvals', root), true, 'with the count cleared too');
        } finally { clearWork(); fs.rmSync(path.join(root, 'src', 'L'), { force: true, recursive: true }); }
      });

      R.row('(iv) past the count a remembered walk returns the fault', () => {
        try {
          confinement.setWorkBudget(1000000);
          const file = path.join(root, 'src', 'x.js');
          assert.equal(confinement.resolveExisting(file).ok, true);
          assert.equal(confinement.budgetSpent(10000000), true);
          const again = confinement.resolveExisting(file);
          assert.equal(again.ok, false);
          assert.equal(again.reason, 'resolve-failed');
        } finally { clearWork(); }
      });

      R.row('(v) the entry cap, at its exact value (32,768 answers per kind)', () => {
        try {
          confinement.setWorkBudget(3000000);
          const ask = (i) => confinement.resolveExisting(path.join(root, `n${i}`));
          for (let i = 0; i < 32768; i++) assert.equal(ask(i).ok, true);
          let before = counter.n;
          ask(32767);
          assert.equal(counter.n - before, 0, 'the 32,768th path asked again is answered from memory');
          before = counter.n;
          ask(32768);
          const first = counter.n - before;
          ask(32768);
          const second = counter.n - before - first;
          assert.ok(first > 0 && second > 0, `the next distinct path is not remembered: ${first} then ${second} calls`);
        } finally { clearWork(); }
      });

      R.row('(v-b) the character cap: past 16,777,216 characters nothing more is remembered', () => {
        try {
          confinement.setWorkBudget(1e9);
          const long = 'z'.repeat(30000);
          const ask = (i) => confinement.resolveExisting(path.join(root, `m${i}`, long));
          for (let i = 0; i < 300; i++) ask(i);
          let before = counter.n;
          ask(300);
          const first = counter.n - before;
          before = counter.n;
          ask(300);
          const second = counter.n - before;
          assert.ok(first > 0 && second > 0, `the next distinct long path is not remembered: ${first} then ${second} calls`);
        } finally { clearWork(); }
      });

      R.row('(v-c) the character cap counts the names of the tail too', () => {
        try {
          // Each walk of <root>/m<i>/<30,000 z> stores its path (about 30,000 characters), its key (the same) and its
          // tail names (the same again): 90,000 a walk, so the 16,777,216-character cap holds 186 of them. Without the
          // tail it would hold 279, and the 200th distinct path would still be remembered.
          confinement.setWorkBudget(1e9);
          const long = 'z'.repeat(30000);
          const ask = (i) => confinement.resolveExisting(path.join(root, `m${i}`, long));
          for (let i = 0; i < 200; i++) ask(i);
          let before = counter.n;
          ask(199);
          const first = counter.n - before;
          before = counter.n;
          ask(199);
          const second = counter.n - before;
          assert.ok(first > 0 && second > 0, `the 200th distinct path is not remembered: ${first} then ${second} calls`);
        } finally { clearWork(); }
      });

      R.row('(vi) a remembered answer is frozen', () => {
        try {
          confinement.setWorkBudget(3000000);
          const r = confinement.resolveExisting(path.join(root, 'src', 'absent-name'));
          assert.equal(r.ok, true);
          assert.ok(Object.isFrozen(r) && Object.isFrozen(r.tail), 'the answer and its tail are frozen');
        } finally { clearWork(); }
      });

      R.row('(vii) asking a remembered question again and again runs the count down', () => {
        try {
          confinement.setWorkBudget(100000);
          let asks = 0;
          let verdict = false;
          while (!verdict && asks < 100000) {
            verdict = resolvesUnder('src/x.js', '.ctoc/approvals', root);
            asks += 1;
          }
          assert.equal(verdict, true, `still false after ${asks} asks`);
        } finally { clearWork(); }
      });

      R.row('(viii) the memory holds the 2,000-line here-document: checks 2 to 9 cost only their own protected path', () => {
        try {
          const command = twoThousandLines();
          assert.ok(command.length < 163840, `the command is ${command.length} characters`);
          const on = nineChecks(command, true);
          for (const c of on) assert.equal(c.verdict, false, `the check of ${c.d} allows`);
          for (const c of on.slice(1)) {
            const bound = 2 * segmentsOf(path.join(nine.root, c.d)) + 6;
            assert.ok(c.n <= bound, `check ${c.d}: ${c.n} calls, at most ${bound}`);
          }
        } finally { clearWork(); }
      });

      R.row('(ix) the as-written reading is never answered from the tidied one\'s memory', () => {
        try {
          fs.mkdirSync(path.join(root, '.ctoc', 'approvals', 'inner'));
          mklink(path.join(root, '.ctoc', 'approvals', 'inner'), path.join(root, 'src', 'L'));
          withCwd(root, () => {
            confinement.setWorkBudget(3000000);
            assert.equal(resolvesUnder('src/x', '.ctoc/approvals', root), false);
            // As written, `..` after the link is the link's real parent, `.ctoc/approvals`. Joined with
            // path.sep, never path.join, which would tidy it.
            assert.equal(resolvesUnder(['src', 'L', '..', 'x'].join(path.sep), '.ctoc/approvals', root), true);
          });
        } finally { clearWork(); fs.rmSync(path.join(root, 'src', 'L'), { force: true, recursive: true }); }
      });

      R.row('(x) a wrapper never throws and never remembers what it cannot key', () => {
        try {
          withCwd(root, () => {
            const uncached = (f) => { confinement.setWorkBudget(null); const v = f(); confinement.setWorkBudget(3000000); return v; };
            confinement.setWorkBudget(3000000);
            for (const [label, f] of [
              ['resolveExisting(42)', () => confinement.resolveExisting(42)],
              ['resolveExisting(null)', () => confinement.resolveExisting(null)],
              ['fileIdentity(42)', () => confinement.fileIdentity(42)],
            ]) {
              const mine = noThrow(f);
              assert.deepStrictEqual(mine, uncached(f), label);
            }
            assert.deepStrictEqual(confinement.resolveExisting(42), { ok: false, real: null, reason: 'resolve-failed', tail: null });
            // An empty string never shares the key `<cwd><sep>` with the real working folder. Two rows, each priming its own
            // memory right before its ask: `uncached` ends with `setWorkBudget(3000000)`, which builds a fresh EMPTY memory,
            // so when both asks shared one priming the `fileIdentity('')` half ran against an empty memory and could not
            // fail under mutation (u) (a key built for ''). Written down after the fourth review round found it.
            const here = process.cwd() + path.sep;
            for (const [label, f] of [
              ['resolveExisting(\'\')', () => confinement.resolveExisting('')],
              ['fileIdentity(\'\')', () => confinement.fileIdentity('')],
            ]) {
              R.row(`(x) ${label} is not answered with the working folder's remembered answers`, () => {
                confinement.setWorkBudget(3000000);
                assert.equal(confinement.resolveExisting(here).ok, true);
                assert.notEqual(confinement.fileIdentity(here), null);
                const mine = noThrow(f);
                assert.deepStrictEqual(mine, uncached(f), label);
              });
            }
          });
          // A working folder that cannot be read: relative paths get the uncached answer, and nothing throws.
          withCwd(root, () => {
            confinement.setWorkBudget(3000000);
            const broken = t.mock.method(process, 'cwd', () => { throw new Error('uv_cwd'); });
            try {
              const rel = noThrow(() => confinement.resolveExisting('src/x.js'));
              const id = noThrow(() => confinement.fileIdentity('src/x.js'));
              confinement.setWorkBudget(null);
              assert.deepStrictEqual(rel, confinement.resolveExisting('src/x.js'));
              assert.deepStrictEqual(id, confinement.fileIdentity('src/x.js'));
            } finally {
              broken.mock.restore();
            }
          });
        } finally { clearWork(); }
      });
    } finally {
      rm(dir);
      rm(nine.outer);
    }
    R.done();
  });

  it('case 28: the count decides at an exact number', (t) => {
    const R = makeRows();
    const { dir, root } = makeRealProject();
    const start = Date.now();
    t.mock.method(Date, 'now', () => start);
    const textOnly = { segmentRe: /(^|[^a-z0-9._-])\.ctoc\/+settings\.yaml([^a-z0-9._-]|$)/i, resolvedRe: /(^|\/)\.ctoc\/+settings\.yaml$/i };
    /** Is the command allowed at exactly `units`? */
    const allowedAt = (command, units, spec = textOnly) => {
      confinement.setDeadline(start + 60000);
      confinement.setWorkBudget(units);
      return isLedgerWrite(command, spec) === false;
    };
    /** The smallest count at which `f` gives its allowing answer: doubling from 1, then bisection. */
    const minUnits = (f) => {
      let hi = 1;
      const ok = (c) => { confinement.setWorkBudget(c); return f(); };
      while (!ok(hi)) {
        hi *= 2;
        assert.ok(hi <= 10000000, 'the allowing answer needs more than 10,000,000 units');
      }
      let lo = Math.floor(hi / 2); // refused at lo (or lo is 0)
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (ok(mid)) hi = mid; else lo = mid;
      }
      return hi;
    };
    try {
      for (const [label, command, allowed, refused] of [
        ['(i) cd a; cd a; cd a; ls: four segments, one unit each', 'cd a; cd a; cd a; ls', 4, 3],
        ['(ii) cd <640 a>; ls: 1, then 1 + 20', `cd ${'a'.repeat(640)}; ls`, 22, 21],
        ['(iii) cd <640 a>; cp x y: 1 + 21 + two operands at 11', `cd ${'a'.repeat(640)}; cp x y`, 44, 43],
      ]) {
        R.row(label, () => {
          try {
            assert.equal(allowedAt(command, allowed), true, `allowed at ${allowed}`);
            assert.equal(allowedAt(command, refused), false, `refused at ${refused}`);
          } finally { clearWork(); }
        });
      }

      R.row('(iv) budgetSpent charges its cost and floors a bad cost at 1', () => {
        try {
          confinement.setWorkBudget(10);
          assert.equal(confinement.budgetSpent(10), false);
          assert.equal(confinement.budgetSpent(), true);
          confinement.setWorkBudget(0);
          assert.equal(confinement.budgetSpent(0), false, 'an empty count is not spent');
          assert.equal(confinement.budgetSpent(), true, 'the first charge spends it');
          confinement.setWorkBudget(1);
          assert.equal(confinement.budgetSpent(-5), false);
          assert.equal(confinement.budgetSpent(NaN), true);
          confinement.setWorkBudget(null);
          confinement.setDeadline(null);
          for (let i = 0; i < 1000; i++) assert.equal(confinement.budgetSpent(), false);
        } finally { clearWork(); }
      });

      R.row('(v) the clock is independent of the count', () => {
        try {
          confinement.setWorkBudget(1e9);
          confinement.setDeadline(start - 1);
          assert.equal(confinement.budgetSpent(), true);
        } finally { clearWork(); }
      });

      const linkSpec = { dir: '.ctoc/approvals', segmentRe: NEVER, resolvedRe: NEVER };
      R.row('(vi) lengthening the folder-change chain by 128 characters costs exactly 22 units', () => {
        try {
          withCwd(root, () => {
            const at = (n) => minUnits(() => { confinement.setDeadline(start + 60000); return isLedgerWrite(`cd ${'b'.repeat(n)}; true 'q'`, linkSpec) === false; });
            const a = at(64);
            const b = at(192);
            assert.equal(b - a, 22, `${b} - ${a}`);
          });
        } finally { clearWork(); }
      });

      R.row('(vii) lengthening a tail name by 128 characters costs exactly 4 units', () => {
        try {
          const at = (k) => minUnits(() => {
            confinement.setDeadline(start + 60000);
            return confinement.resolveExisting(path.join(root, 'b'.repeat(64), 'c'.repeat(k))).ok === true;
          });
          const a = at(64);
          const b = at(192);
          assert.equal(b - a, 4, `${b} - ${a}`);
        } finally { clearWork(); }
      });

      R.row('(vii-b) a count that runs out on the tail charge of a name below the first missing one is a refusal, and one unit more is not', () => {
        // Row (vii) measures the tail charge as a difference of two minimums; neither of its walks ever fails ON that charge.
        // This row spends the count exactly there. `pre` is the walk's own steps down to and including the first missing
        // folder, one unit each and one `lstat` each (counted below); the long name's own step is one more unit; the
        // charge by its length is F. At `pre + F` units, F - 1 remain after the step and the charge spends the count.
        // The walk then ends in `kernelAgrees`, whose first charge (the whole path, which holds the name) is at least F + 1,
        // so the verdict of that count is the same without the arm's own `return`: the arm is taken here, and the charge
        // itself is held by the second half, whose expected least count is written out from the schedule, not read off the
        // code under test: the least count that walks the path to `missing`, plus the long name's step (1), its charge (F),
        // and the extra `kernelAgrees` step for the prefix that ends in the long name (1 + its length at the text rate).
        // One unit below that the walk is refused; a walk whose tail charge was removed would be allowed there.
        const missing = path.join(root, 'tail-test-missing-folder'); // a fresh path: no remembered answer skips the walk
        const long = 'c'.repeat(200);
        const target = path.join(missing, long);
        const leastToWalk = (p) => minUnits(() => {
          confinement.setDeadline(start + 60000);
          return confinement.resolveExisting(p).ok === true;
        });
        /** The `lstat` calls `f` makes (a plain wrapper, put back at once). */
        const lstatsOf = (f) => {
          const realLstat = safeFs.lstatSync;
          let n = 0;
          safeFs.lstatSync = (...args) => { n += 1; return realLstat(...args); };
          try { const result = f(); return { n, result }; } finally { safeFs.lstatSync = realLstat; }
        };
        const counted = lstatsOf(() => {
          confinement.setDeadline(start + 60000);
          confinement.setWorkBudget(10000000);
          return confinement.resolveExisting(missing).ok;
        });
        clearWork();
        assert.equal(counted.result, true);
        const pre = counted.n;
        assert.ok(pre >= 2, `the walk down to the first missing folder made ${pre} lstat calls`);
        const F = Math.floor(long.length / 64);
        assert.ok(F >= 2, 'the name is long enough that the charge is more than one unit');
        const expected = leastToWalk(missing) + 1 + F + 1 + Math.floor(target.length / 64);
        try {
          const at = (count) => {
            confinement.setDeadline(start + 60000);
            confinement.setWorkBudget(count);
            return confinement.resolveExisting(target);
          };
          // The walk made all `pre` lstat calls (it reached the long name's step) and none for the name itself.
          const walked = lstatsOf(() => at(pre + F));
          assert.equal(walked.n, pre, `the lstat calls of the walk that spent the count on the tail charge: ${walked.n}`);
          const spentOnTheCharge = walked.result;
          assert.deepEqual(
            { ok: spentOnTheCharge.ok, reason: spentOnTheCharge.reason, tail: spentOnTheCharge.tail },
            { ok: false, reason: 'resolve-failed', tail: null },
            `at ${pre + F} units the count runs out on the tail charge`,
          );
          assert.equal(confinement.budgetSpent(0), true, 'the count is spent');
          const justUnder = at(expected - 1);
          assert.equal(justUnder.ok, false, `refused at ${expected - 1}`);
          assert.equal(justUnder.reason, 'resolve-failed');
          const atLeast = at(expected);
          assert.equal(atLeast.ok, true, `allowed at ${expected}`);
          assert.deepEqual([...atLeast.tail], [path.basename(missing), long]);
        } finally { clearWork(); }
      });

      R.row('(viii) a count that runs out inside the link test refuses a read-only segment', () => {
        try {
          withCwd(root, () => {
            confinement.setDeadline(start + 60000);
            confinement.setWorkBudget(3);
            assert.equal(isLedgerWrite('cat x', linkSpec), true);
            clearWork();
            assert.equal(isLedgerWrite('cat x', linkSpec), false, 'with no count it is allowed');
          });
        } finally { clearWork(); }
      });
    } finally {
      rm(dir);
    }
    R.done();
  });
});
