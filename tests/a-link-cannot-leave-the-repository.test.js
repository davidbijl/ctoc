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
    } finally { rm(dir); }
    R.done();
  });
});
