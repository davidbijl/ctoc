#!/usr/bin/env node
/**
 * CTOC Release Script
 * Updates version numbers across all version files
 *
 * VERSION file is the single source of truth.
 * This script syncs it to:
 *   - .claude-plugin/marketplace.json (marketplace version)
 *   - .claude-plugin/plugin.json (plugin version)
 *   - package.json (version only — license is a static value, not derived here)
 *   - package-lock.json (top-level version and packages[""].version)
 *   - Documentation files with version references
 *
 * Contract (W09-s1 / finding M7):
 *   - FAIL LOUD: any target that EXISTS but cannot be parsed, is missing an
 *     expected update path, or fails to write is collected as a named failure;
 *     main() returns 1 (non-zero exit) and prints the failing file names to
 *     stderr. A target that is simply not present is skipped, never a failure.
 *   - ATOMIC WRITE: every JSON target is written via atomicWriteFileSync
 *     (temp-file + rename), so a crash mid-write can never truncate the target.
 *     The target's permission bits are copied onto the new file; a target that
 *     does not exist yet keeps the default mode, and any other failure to read
 *     them stops the write. On a failed write the temp file is removed; if that
 *     removal fails too, the thrown error's message names the temp file and the
 *     removal error code (and carries the error as `cleanupError`), so a
 *     leftover *.tmp-* file is reported, never silent. A file already at the
 *     temporary name (EEXIST) is not ours: it is left alone and the error thrown.
 *
 * The production functions accept an optional `root` (defaulting to ROOT, which
 * honors CTOC_RELEASE_ROOT) so the real script is drivable against a fixture
 * both in-process and as a subprocess. Requiring this module does NOT run
 * main(); the CLI path is guarded by `require.main === module`.
 */

const safeFs = require('../lib/safe-fs');
const path = require('path');
const { computeDocCounts } = require('../lib/doc-counts');

const ROOT = process.env.CTOC_RELEASE_ROOT
  ? path.resolve(process.env.CTOC_RELEASE_ROOT)
  : path.resolve(__dirname, '..', '..');

// JSON files that need version updates
const JSON_VERSION_FILES = [
  {
    file: '.claude-plugin/marketplace.json',
    updates: [
      { path: ['metadata', 'version'] },
      { path: ['plugins', 0, 'version'] }
    ]
  },
  {
    file: '.claude-plugin/plugin.json',
    updates: [
      { path: ['version'] }
    ]
  },
  {
    file: 'package.json',
    updates: [
      { path: ['version'] }
    ]
  },
  {
    // npm's lockfile records the package version twice: at its top and on the root package ("").
    file: 'package-lock.json',
    updates: [
      { path: ['version'] },
      { path: ['packages', '', 'version'] }
    ]
  }
];

// Files with CTOC product version references to update
// Note: Schema versions (e.g., operations-registry.yaml) are separate
const VERSION_UPDATES = [
  {
    file: 'README.md',
    pattern: /^\*\*\d+\.\d+\.\d+\*\*/m,
    replacement: (v) => `**${v}**`
  },
  {
    file: 'README.md',
    pattern: /version-\d+\.\d+\.\d+-blue/g,
    replacement: (v) => `version-${v}-blue`
  },
  {
    file: 'README.md',
    pattern: /getVersion\(\)\s+\/\/\s*→\s*'\d+\.\d+\.\d+'/,
    replacement: (v) => `getVersion()       // → '${v}'`
  },
  {
    // The Lesson 2 dashboard capture's first line. A version inside a fenced
    // block is invisible to the badge/headline patterns above, so it re-rotted
    // on every release until it was named here. Anchored `^...$` with /m and no
    // /g: it must rewrite that one line and never a mid-line prose mention.
    file: 'README.md',
    pattern: /^CTOC v\d+\.\d+\.\d+$/m,
    replacement: (v) => `CTOC v${v}`
  }
];

// The GROWING doc counts release.js keeps true in CLAUDE.md (plan 00215). Each
// entry names a computeDocCounts field and a LINE-TARGETED pattern that captures
// the prose around the integer, so only the number is rewritten — never a
// structural change, exactly like the version replacements above. FIXED contracts
// (slash commands, hooks, tabs) are deliberately NOT here: a change to those is a
// real event that stays policed by exact-equality tests, never auto-rewritten.
// `files` names every documentation file the entry applies to. README.md's
// structure block uses the SAME two patterns CLAUDE.md's does, so they are one
// encoding with two targets — a parallel README table would be a second
// encoding of one rule, and two encodings of one rule drift.
const COUNT_UPDATES = [
  { field: 'testFiles', label: 'testFiles', pattern: /(Run all )\d+( test files)/, files: ['CLAUDE.md'] },
  { field: 'testFiles', label: 'testFiles', pattern: /(tests\/\s+)\d+( test files)/, files: ['CLAUDE.md', 'README.md'] },
  { field: 'libModules', label: 'libModules', pattern: /(lib\/\s+)\d+( JS modules)/, files: ['CLAUDE.md', 'README.md'] },
  { field: 'agents', label: 'agents', pattern: /(agents\/\s+)\d+( agent definitions)/, files: ['CLAUDE.md'] },
  { field: 'skills', label: 'skills', pattern: /(skills\/\s+)\d+( skill files)/, files: ['CLAUDE.md'] },
];

/**
 * Atomically write `data` to `filePath`: write to a sibling temp file in the
 * SAME directory, then rename it over the target. A same-directory rename is
 * atomic on POSIX and uses MoveFileEx on Windows, so a crash can never leave a
 * half-written target. On any error the temp file is removed (a failed removal is
 * recorded on the error as `cleanupError` and named in its message) and the original
 * error is rethrown, so the pre-existing target is left intact. A `*.tmp-*` file is left
 * behind only when its removal fails, and the error then names it. A file already at
 * the temporary name (EEXIST) is not ours and is left alone.
 *
 * @param {string} filePath - destination path
 * @param {string|Buffer} data - bytes to write
 * @param {{ rename?: (oldPath: string, newPath: string) => void }} [opts]
 *   `rename` is an injectable seam (default `safeFs.renameSync`) so a test can
 *   deterministically simulate a crash during the rename window.
 */
function atomicWriteFileSync(filePath, data, { rename = safeFs.renameSync } = {}) {
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  // The original error stays the one thrown; a removal that fails (a name already
  // gone is not a failure) is recorded on it as `cleanupError`, never swallowed.
  const removeTmp = (original) => {
    try {
      if (safeFs.existsSync(tmp)) safeFs.unlinkSync(tmp);
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') {
        original.cleanupError = cleanupError;
        original.message += ` (temp file ${tmp} could not be removed: ${cleanupError.code || cleanupError.message})`;
      }
    }
  };
  // The original's permission bits, so a read-only lockfile stays read-only.
  let mode;
  try {
    mode = safeFs.statSync(filePath).mode & 0o777;
  } catch (err) {
    // No original to copy from (ENOENT): the new file gets the default mode. Any other error is real.
    if (err.code !== 'ENOENT') throw err;
  }
  try {
    // 'wx' = create exclusively: a link planted at the temp name is never written through.
    safeFs.writeFileSync(tmp, data, { flag: 'wx' });
  } catch (err) {
    // EEXIST means the name is not ours: leave whatever is there alone.
    if (err.code !== 'EEXIST') removeTmp(err);
    throw err;
  }
  try {
    if (mode !== undefined) safeFs.chmodSync(tmp, mode);
    rename(tmp, filePath);
  } catch (err) {
    removeTmp(err);
    throw err;
  }
}

function getVersion(root = ROOT) {
  const versionFile = path.join(root, 'VERSION');
  const version = safeFs.readFileSync(versionFile, 'utf8').trim();
  if (!version || !/^\d+\.\d+\.\d+$/.test(version) || !version.split('.').every((n) => Number.isSafeInteger(Number(n)))) {
    throw new Error(`Invalid version format in ${versionFile}: "${version}" (expected X.Y.Z, each part a whole number up to ${Number.MAX_SAFE_INTEGER})`);
  }
  return version;
}

/**
 * Sync `version` into every JSON target. A target that EXISTS but fails to
 * parse, is missing an expected update path, or fails to write is recorded as a
 * named failure. A target that is not present is skipped (not a failure).
 *
 * @param {string} version
 * @param {string} [root]
 * @returns {{ updated: string[], failures: string[] }}
 */
function updateJsonVersionFiles(version, root = ROOT) {
  const updated = [];
  const failures = [];

  for (const config of JSON_VERSION_FILES) {
    const filePath = path.join(root, config.file);

    // lstat, not stat: a link, a folder or a named pipe is refused before anything is opened,
    // so the release never follows a link out of its root or hangs on a pipe.
    let content;
    try {
      const st = safeFs.lstatSync(filePath);
      if (!st.isFile()) throw new Error('not a regular file');
      content = safeFs.readFileSync(filePath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log(`  Skip: ${config.file} (not found)`);
      } else {
        console.error(`  ERROR: ${config.file} could not be read: ${err.message}`);
        failures.push(config.file);
      }
      continue;
    }
    let json;
    try {
      json = JSON.parse(content);
    } catch (err) {
      console.error(`  ERROR: ${config.file} contains invalid JSON: ${err.message}`);
      failures.push(config.file);
      continue;
    }

    let changed = false;
    let pathMissing = false;

    for (const update of config.updates) {
      let obj = json;
      const last = update.path.length - 1;
      let reachable = true;
      for (let i = 0; i <= last; i++) {
        const key = update.path[i];
        // A container is a real object for a name, a real array for an index.
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj) !== (typeof key === 'number')) {
          reachable = false;
          break;
        }
        if (i < last) obj = obj[key];
      }
      if (!reachable) {
        console.error(`  ERROR: ${config.file} missing expected path: ${update.path.map((k) => (k === '' ? '""' : k)).join('.')}`);
        pathMissing = true;
        continue;
      }

      const lastKey = update.path[last];
      if (obj[lastKey] !== version) {
        obj[lastKey] = version;
        changed = true;
      }
    }

    if (pathMissing) {
      failures.push(config.file);
      continue;
    }

    if (changed) {
      try {
        atomicWriteFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
      } catch (err) {
        console.error(`  ERROR: ${config.file} write failed: ${err.message}`);
        failures.push(config.file);
        continue;
      }
      updated.push(config.file);
      console.log(`  Updated: ${config.file}`);
    }
  }

  return { updated, failures };
}

/**
 * Sync `version` into documentation files. A file that fails to write is
 * recorded as a named failure; a missing file is skipped.
 *
 * @param {string} version
 * @param {string} [root]
 * @returns {{ updated: string[], failures: string[] }}
 */
function updateVersionInFiles(version, root = ROOT) {
  const updated = [];
  const failures = [];

  for (const update of VERSION_UPDATES) {
    const filePath = path.join(root, update.file);

    if (!safeFs.existsSync(filePath)) {
      console.log(`  Skip: ${update.file} (not found)`);
      continue;
    }

    let content = safeFs.readFileSync(filePath, 'utf8');
    const original = content;

    content = content.replace(update.pattern, update.replacement(version));

    if (content !== original) {
      try {
        atomicWriteFileSync(filePath, content);
      } catch (err) {
        console.error(`  ERROR: ${update.file} write failed: ${err.message}`);
        failures.push(update.file);
        continue;
      }
      updated.push(update.file);
      console.log(`  Updated: ${update.file}`);
    }
  }

  return { updated, failures };
}

/**
 * Rewrite the GROWING doc-count lines in ONE documentation file to the live
 * values, so no human or executor ever hand-edits them (plan 00215). Only the
 * integer on each matched line changes. A count line that is EXPECTED for this
 * file but ABSENT is recorded as a NAMED failure — never a silent no-op —
 * because a generator whose whole job is to keep a number true must fail loud
 * when it cannot find the line to keep true. A file that is simply not present
 * is SKIPPED, never a failure: the release script is drivable against fixtures
 * that carry no documentation at all.
 *
 * Which entries apply is decided by each COUNT_UPDATES entry's `files` list, so
 * a shape that exists only in CLAUDE.md never reports a false failure against
 * README.md.
 *
 * @param {string} docFile - repository-relative documentation file name
 * @param {string} [root] - project root (used to compute the live counts)
 * @param {{ counts?: object, targetPath?: string }} [opts]
 *   `counts` overrides the computed counts; `targetPath` overrides the target
 *   (a test drives a COPY in os.tmpdir(), never the real tracked file).
 * @returns {{ updated: string[], failures: string[] }}
 */
function updateDocCountsInFile(docFile, root = ROOT, { counts, targetPath } = {}) {
  const resolved = counts || computeDocCounts(root);
  const filePath = targetPath || path.join(root, docFile);
  const updated = [];
  const failures = [];

  if (!safeFs.existsSync(filePath)) {
    console.log(`  Skip: ${docFile} (not found)`);
    return { updated, failures };
  }

  let content = safeFs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const update of COUNT_UPDATES) {
    if (!update.files.includes(docFile)) continue;
    const n = resolved[update.field];
    let matched = false;
    content = content.replace(update.pattern, (_m, before, after) => {
      matched = true;
      return `${before}${n}${after}`;
    });
    if (!matched) {
      console.error(`  ERROR: ${docFile} count line for ${update.label} not found`);
      failures.push(`${docFile} (${update.label} line not found)`);
    }
  }

  if (content !== original) {
    try {
      atomicWriteFileSync(filePath, content);
    } catch (err) {
      console.error(`  ERROR: ${docFile} count sync write failed: ${err.message}`);
      failures.push(docFile);
      return { updated, failures };
    }
    updated.push(docFile);
    console.log(`  Updated doc counts: ${docFile}`);
  }

  return { updated, failures };
}

/**
 * Rewrite CLAUDE.md's growing doc-count lines. Thin wrapper over
 * updateDocCountsInFile; the contract (signature, log strings, failure strings)
 * is unchanged.
 *
 * @param {string} [root]
 * @param {{ counts?: object, claudeMdPath?: string }} [opts]
 * @returns {{ updated: string[], failures: string[] }}
 */
function updateDocCountsInClaudeMd(root = ROOT, { counts, claudeMdPath } = {}) {
  return updateDocCountsInFile('CLAUDE.md', root, { counts, targetPath: claudeMdPath });
}

/**
 * Rewrite README.md's structure-block growing counts (the `tests/ N test files`
 * and `lib/ N JS modules` lines). The README stated 524 test files while disk
 * held 543 — the counts drifted with every added file because nothing synced
 * them. Now they come from the same generator CLAUDE.md's do.
 *
 * @param {string} [root]
 * @param {{ counts?: object, readmePath?: string }} [opts]
 * @returns {{ updated: string[], failures: string[] }}
 */
function updateDocCountsInReadme(root = ROOT, { counts, readmePath } = {}) {
  return updateDocCountsInFile('README.md', root, { counts, targetPath: readmePath });
}

/**
 * Run the release sync. Returns a process exit code: 0 on full success, 1 if
 * the version could not be read or any target failed to sync (failing file
 * names are printed to stderr).
 *
 * @param {string} [root]
 * @returns {number}
 */
function main(root = ROOT) {
  let version;
  try {
    // Read version from VERSION file (source of truth)
    version = getVersion(root);
  } catch (err) {
    console.error(`Release failed: ${err.message}`);
    return 1;
  }

  console.log(`CTOC Release v${version}`);
  console.log('─'.repeat(40));

  const failures = [];

  console.log('\nSyncing version to JSON files...');
  failures.push(...updateJsonVersionFiles(version, root).failures);

  console.log('\nUpdating version references in docs...');
  failures.push(...updateVersionInFiles(version, root).failures);

  console.log('\nSyncing documented growing counts in CLAUDE.md...');
  failures.push(...updateDocCountsInClaudeMd(root).failures);

  console.log('\nSyncing documented growing counts in README.md...');
  failures.push(...updateDocCountsInReadme(root).failures);

  if (failures.length > 0) {
    console.error(
      `Release failed: could not sync ${failures.length} file(s): ${failures.join(', ')}`
    );
    return 1;
  }

  console.log('\nDone.');
  return 0;
}

module.exports = {
  getVersion,
  updateJsonVersionFiles,
  updateVersionInFiles,
  updateDocCountsInClaudeMd,
  updateDocCountsInReadme,
  atomicWriteFileSync,
  main,
  JSON_VERSION_FILES,
  VERSION_UPDATES,
  COUNT_UPDATES
};

if (require.main === module) {
  process.exit(main());
}
