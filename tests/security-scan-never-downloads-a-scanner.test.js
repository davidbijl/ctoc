'use strict';

/**
 * The security scan never downloads a scanner (plan: the-test-suite-runs-faster-and-never-weaker-s2).
 *
 * THE DEFECT THIS HOLDS: CTOC's own security scan used to ask for eslint with
 * `npx eslint --version` in the folder the process was started in, and then ran
 * `npx eslint --plugin security ...` in the scanned project. In a project without eslint,
 * npx installs whatever eslint the npm registry serves and runs it: unpinned code from the
 * registry on the machine, and (on Windows) a `.cmd` start that Node refuses. The scan now
 * starts the SCANNED PROJECT'S OWN eslint bin script with the running Node program, an
 * argument list and no shell, and reports eslint as missing, loudly, when the project has
 * none.
 *
 * Every test drives a live caller: `runSecurityScan` of the quality agent (what /ctoc:push
 * runs), or the scanner's own availability probe. The child-process functions are replaced
 * at the true process boundary and the scan modules reloaded, so a test sees every start
 * the scan makes; a start the test does not name is refused with a not-found failure, so no
 * test here reaches a registry. The two tests that start a real eslint say so in their title
 * ("a project's own eslint is started ..." runs a fake script with Node; "starts the real
 * eslint 9 ..." runs this repository's eslint with no network).
 *
 * Nothing from src/ is required at the top of the file and no recording is read at file load.
 */

const { test, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { makeFakeEslintProject } = require('./helpers/security-scan-fixtures');

const REPO_ROOT = path.join(__dirname, '..');

/** The real child-process functions, taken before any spy replaces them. */
const REAL = { execSync: cp.execSync, execFileSync: cp.execFileSync, spawnSync: cp.spawnSync };

/** Every module on the scan's path that takes a child-process function when it loads. */
const FLEET = [
  'quality-agent', 'secrets-scanner', 'dependency-auditor', 'sast-runner', 'sca-runner',
  'migration-safety-checker'
].map((name) => require.resolve(`../src/lib/${name}`));

/** Path only: the recording is read inside the test that needs it. */
const REPORT_PATH = path.join(__dirname, 'fixtures', 'security-scan', 'eslint-security-report.json');

/**
 * The exact text the recorded eslint report was captured from. It is a string because this
 * repository's own lint would flag a real eval-of-a-variable call in a .js file under tests/.
 */
const EVAL_SOURCE = "'use strict';\nfunction run(userInput) {\n  return eval(userInput);\n}\nmodule.exports = run;\n";

const NO_ESLINT_SKIP = 'SAST skipped for javascript: no scanner installed (need semgrep or eslint)';

/** The not-found failure every refused start throws. */
function notFound(program) {
  return Object.assign(new Error(`spawn ${program} ENOENT`), { code: 'ENOENT', status: null, stdout: '' });
}

/**
 * Run `fn` with the three child-process functions replaced by recording spies and the scan
 * modules freshly loaded on top of them.
 * @param {{ runForReal?: (file: string, args: string[]) => boolean }} options
 *   `runForReal` lets exactly the named execFileSync start through to the real function.
 * @param {(ctx: { qa: any, SASTRunner: any, SecretsScanner: any, starts: any[] }) => any} fn
 */
async function withScan({ runForReal = () => false } = {}, fn) {
  const starts = [];
  cp.execFileSync = (file, args, opts) => {
    const list = Array.isArray(args) ? args : [];
    const options = Array.isArray(args) ? opts : args;
    starts.push({ via: 'execFileSync', program: file, args: list, opts: options });
    if (runForReal(file, list)) return REAL.execFileSync(file, list, options);
    throw notFound(file);
  };
  cp.execSync = (command, opts) => {
    const words = String(command).trim().split(/\s+/);
    starts.push({ via: 'execSync', program: words[0], args: words.slice(1), opts });
    throw notFound(words[0]);
  };
  cp.spawnSync = (file, args, opts) => {
    const list = Array.isArray(args) ? args : [];
    starts.push({ via: 'spawnSync', program: file, args: list, opts: Array.isArray(args) ? opts : args });
    return { status: null, signal: null, stdout: '', stderr: '', error: notFound(file) };
  };
  for (const file of FLEET) delete require.cache[file];
  try {
    const qa = require('../src/lib/quality-agent');
    const { SASTRunner } = require('../src/lib/sast-runner');
    const { SecretsScanner } = require('../src/lib/secrets-scanner');
    return await fn({ qa, SASTRunner, SecretsScanner, starts });
  } finally {
    cp.execFileSync = REAL.execFileSync;
    cp.execSync = REAL.execSync;
    cp.spawnSync = REAL.spawnSync;
    for (const file of FLEET) delete require.cache[file];
  }
}

/** Fix semgrep as absent through the existing availability seam; every other tool answers for real. */
function semgrepAbsent(t, SASTRunner) {
  const real = SASTRunner.prototype.isToolAvailable;
  t.mock.method(SASTRunner.prototype, 'isToolAvailable', function (tool) {
    return tool === 'semgrep' ? false : real.call(this, tool);
  });
}

/** Fix the external secrets scanners as absent, so a host's trufflehog or detect-secrets cannot start. */
function secretsToolsAbsent(t, SecretsScanner) {
  t.mock.method(SecretsScanner.prototype, 'isToolAvailable', () => false);
}

const isNpx = (start) => /^npx(\.cmd)?$/i.test(path.basename(String(start.program)));
const namesEslint = (start) => /eslint/i.test([start.program, ...(start.args || [])].join(' '));

/** Run the security scan with its console output silenced. */
async function scan(qa, projectRoot) {
  const log = console.log;
  console.log = () => {};
  try {
    return await qa.runSecurityScan(null, { projectRoot, allFiles: true });
  } finally {
    console.log = log;
  }
}

/**
 * Every `<level>/node_modules/eslint/package.json` the product's lookup can reach from the
 * folder: the folder's real path and upward, nearest first, up to and including the first
 * folder that contains `.git` (a folder, or a file in a git worktree); with no `.git` on the
 * way, the folder alone; never a filesystem root. The same bound as the product's lookup,
 * written here so a host layout is checked before the product answers.
 */
function eslintManifestsInReach(dir) {
  const start = fs.realpathSync(dir);
  const levels = [];
  for (let level = start; path.dirname(level) !== level; level = path.dirname(level)) {
    levels.push(level);
    if (fs.existsSync(path.join(level, '.git'))) {
      return levels.map((l) => path.join(l, 'node_modules', 'eslint', 'package.json')).filter((m) => fs.existsSync(m));
    }
  }
  const alone = path.join(start, 'node_modules', 'eslint', 'package.json');
  return fs.existsSync(alone) ? [alone] : [];
}

/** A temporary project with a package.json and one .js file, and no eslint of its own. */
function makePlainProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-no-eslint-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"no-eslint-here","version":"1.0.0"}');
  fs.writeFileSync(path.join(dir, 'index.js'), 'module.exports = 1;\n');
  return dir;
}

function rm(...dirs) {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
}

const linkType = process.platform === 'win32' ? 'junction' : 'dir';

/** The bin script of the fake eslint that prints the recorded report (test 3 and test 4). */
function recordedReportScript() {
  return [
    "const fs = require('node:fs');",
    `const text = fs.readFileSync(${JSON.stringify(REPORT_PATH)}, 'utf8');`,
    "const root = JSON.stringify(process.cwd()).slice(1, -1);",
    "process.stdout.write(text.split('<PROJECT_ROOT>').join(root));",
    'process.exitCode = 1;',
    ''
  ].join('\n');
}

test('a project without eslint: the scan starts no npx and no eslint, and says eslint is missing', async (t) => {
  const dir = makePlainProject();
  try {
    assert.deepEqual(eslintManifestsInReach(dir), [],
      'the temporary project has an eslint within the lookup\'s reach; the lookup would find it');
    await withScan({}, async ({ qa, SASTRunner, SecretsScanner, starts }) => {
      semgrepAbsent(t, SASTRunner);
      secretsToolsAbsent(t, SecretsScanner);
      const res = await scan(qa, dir);
      assert.deepEqual(starts.filter(isNpx), [], 'no npx may start, whatever its arguments');
      assert.deepEqual(starts.filter(namesEslint), [], 'no started process may name eslint');
      assert.ok(res.skipped.includes(NO_ESLINT_SKIP),
        `the skipped list must say eslint is missing: ${JSON.stringify(res.skipped)}`);
    });
  } finally {
    rm(dir);
  }
});

test('the answer follows the scanned project, not the folder the test runs in, and the probe starts no process', async (t) => {
  const dir = makePlainProject();
  const here = process.cwd();
  try {
    assert.deepEqual(eslintManifestsInReach(dir), [],
      'the temporary project has an eslint within the lookup\'s reach; the lookup would find it');
    const manifests = eslintManifestsInReach(REPO_ROOT);
    const modulesLink = fs.lstatSync(path.join(REPO_ROOT, 'node_modules'), { throwIfNoEntry: false });
    const layout = manifests.length > 0
      ? `the nearest eslint manifest is ${manifests[0]}, real path ${fs.realpathSync(manifests[0])}; `
      : 'no eslint manifest is within the lookup\'s reach of the repository; ';
    const modulesNote = `${REPO_ROOT}/node_modules is ${modulesLink && modulesLink.isSymbolicLink()
      ? `a link to ${fs.readlinkSync(path.join(REPO_ROOT, 'node_modules'))}` : 'not a link'}`;
    assert.ok(manifests.length > 0,
      `this repository has no eslint installed in it, or in the repository folder its lookup is bounded by: ${layout}${modulesNote}`);

    process.chdir(REPO_ROOT);
    await withScan({}, async ({ qa, SASTRunner, SecretsScanner, starts }) => {
      semgrepAbsent(t, SASTRunner);
      secretsToolsAbsent(t, SecretsScanner);
      assert.equal(new SASTRunner(dir).isToolAvailable('eslint'), false, 'the temporary project has no eslint');
      assert.equal(new SASTRunner(REPO_ROOT).isToolAvailable('eslint'), true,
        `the repository has its own eslint: ${layout}${modulesNote}`);
      assert.deepEqual(starts, [], 'the availability probe must start no process');
      const res = await scan(qa, dir);
      assert.ok(res.skipped.includes(NO_ESLINT_SKIP),
        `the skipped list must say eslint is missing: ${JSON.stringify(res.skipped)}`);
    });
  } finally {
    process.chdir(here);
    rm(dir);
  }
});

test("a project's own eslint is started by the running Node program with an argument list and no shell, and its finding blocks the push", async (t) => {
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  assert.ok(report.length > 0 && report.every((entry) => entry.filePath.startsWith('<PROJECT_ROOT>')),
    'every filePath of the recording must start with <PROJECT_ROOT>: no absolute path may be committed');
  const recorded = report.flatMap((entry) => entry.messages)
    .find((message) => message.ruleId === 'security/detect-eval-with-expression');
  assert.ok(recorded, 'the recording must hold the eval finding');
  const project = makeFakeEslintProject({ script: recordedReportScript(), files: { 'index.js': EVAL_SOURCE } });
  try {
    await withScan({ runForReal: (file, args) => file === process.execPath && args[0] === project.bin },
      async ({ qa, SASTRunner, SecretsScanner, starts }) => {
        semgrepAbsent(t, SASTRunner);
        secretsToolsAbsent(t, SecretsScanner);
        const res = await scan(qa, project.root);
        assert.equal(starts.length, 1, `exactly one start expected: ${JSON.stringify(starts.map((s) => s.program))}`);
        const [start] = starts;
        assert.equal(start.program, process.execPath);
        assert.equal(start.args[0], project.bin);
        assert.deepEqual(start.args.slice(1), ['--plugin', 'security', '--format', 'json', '.']);
        assert.equal(start.opts.shell, undefined);
        assert.equal(start.opts.cwd, project.root);
        assert.equal(start.opts.maxBuffer, 50 * 1024 * 1024,
          'a large report is read, not turned into a skip: the same 50 MB limit semgrep has');
        assert.match(res.details,
          new RegExp(`^sast\\[HIGH\\] security/detect-eval-with-expression at .*index\\.js:${recorded.line}$`, 'm'));
        assert.equal(res.passed, false, 'a security finding must block the push');
      });
  } finally {
    rm(project.root);
  }
});

test('with the platform set to win32 the start is the same: node, the script first, no shell, no .cmd', async (t) => {
  // Not run on Windows: process.platform is replaced, so only the arguments of the start are asserted.
  const project = makeFakeEslintProject({ script: recordedReportScript(), files: { 'index.js': EVAL_SOURCE } });
  const saved = Object.getOwnPropertyDescriptor(process, 'platform');
  try {
    // The platform is replaced before the scan modules are loaded or used, so a module that
    // reads process.platform at load sees win32 too; the outer finally puts it back.
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    await withScan({}, async ({ qa, SASTRunner, SecretsScanner, starts }) => {
      semgrepAbsent(t, SASTRunner);
      secretsToolsAbsent(t, SecretsScanner);
      await scan(qa, project.root);
      const eslintStarts = starts.filter((start) => start.program === process.execPath);
      assert.equal(eslintStarts.length, 1, `the eslint start must be made: ${JSON.stringify(starts.map((s) => s.program))}`);
      const [start] = eslintStarts;
      assert.equal(start.args[0], project.bin);
      assert.ok(!('shell' in start.opts), 'no shell key in the options of the start');
      for (const word of [start.program, ...start.args]) {
        assert.ok(!/\.cmd$/i.test(word), `no .cmd file may be named: ${word}`);
      }
    });
  } finally {
    Object.defineProperty(process, 'platform', saved);
    rm(project.root);
  }
});

test('starts the real eslint 9 and eslint-plugin-security of this repository, with no network, and finds eval with an expression', async (t) => {
  // A medium test: it starts this repository's real eslint through a one-line forwarding bin script
  // in a temporary project outside the repository (a copy of eslint and its dependencies would cost a
  // large copy per run; the plugin is linked in, as eslint loads it from the project).
  const repoEslintDir = fs.realpathSync(path.join(REPO_ROOT, 'node_modules', 'eslint'));
  const repoEslintBin = path.join(repoEslintDir, 'bin', 'eslint.js');
  const repoEslintVersion = JSON.parse(fs.readFileSync(path.join(repoEslintDir, 'package.json'), 'utf8')).version;
  const pluginDir = fs.realpathSync(path.join(REPO_ROOT, 'node_modules', 'eslint-plugin-security'));
  const project = makeFakeEslintProject({
    script: `require(${JSON.stringify(repoEslintBin)});\n`,
    files: {
      'index.js': EVAL_SOURCE,
      'eslint.config.js':
        "const security = require('eslint-plugin-security');\n" +
        "module.exports = [{ files: ['**/*.js'], plugins: { security }, rules: { 'security/detect-eval-with-expression': 'error' } }];\n"
    }
  });
  try {
    fs.writeFileSync(path.join(project.root, 'node_modules', 'eslint', 'package.json'),
      JSON.stringify({ name: 'eslint', version: repoEslintVersion, bin: { eslint: './bin/eslint.js' } }));
    fs.symlinkSync(pluginDir, path.join(project.root, 'node_modules', 'eslint-plugin-security'), linkType);
    await withScan({ runForReal: (file, args) => file === process.execPath && args[0] === project.bin },
      async ({ qa, SASTRunner, SecretsScanner, starts }) => {
        semgrepAbsent(t, SASTRunner);
        secretsToolsAbsent(t, SecretsScanner);
        const res = await scan(qa, project.root);
        assert.equal(starts.length, 1, `exactly one start expected: ${JSON.stringify(starts.map((s) => s.program))}`);
        assert.equal(starts[0].program, process.execPath);
        assert.equal(starts[0].args[0], project.bin);
        assert.match(res.details, /^sast\[HIGH\] security\/detect-eval-with-expression at .*index\.js:3$/m);
        assert.equal(res.passed, false);
      });
  } finally {
    rm(project.root);
  }
});

describe('the lookup of the scanned project\'s own eslint', () => {
  /** Run `fn(SASTRunner, starts)` and assert the probe started nothing. */
  async function probe(fn) {
    await withScan({}, async ({ SASTRunner, starts }) => {
      await fn(SASTRunner);
      assert.deepEqual(starts, [], 'the availability probe must start no process');
    });
  }

  it('eslint whose bin is a string is found', async () => {
    const project = makeFakeEslintProject({ bin: './bin/eslint.js' });
    try {
      await probe((SASTRunner) => assert.equal(new SASTRunner(project.root).isToolAvailable('eslint'), true));
    } finally { rm(project.root); }
  });

  it('eslint whose bin names no eslint script is not installed', async () => {
    const project = makeFakeEslintProject({ bin: { other: './bin/eslint.js' } });
    try {
      await probe((SASTRunner) => assert.equal(new SASTRunner(project.root).isToolAvailable('eslint'), false));
    } finally { rm(project.root); }
  });

  it('eslint whose bin script lies outside its package is not installed', async () => {
    const project = makeFakeEslintProject({
      bin: { eslint: '../../outside.js' }, script: null, files: { 'outside.js': '' }
    });
    try {
      await probe((SASTRunner) => assert.equal(new SASTRunner(project.root).isToolAvailable('eslint'), false));
    } finally { rm(project.root); }
  });

  it('eslint whose bin folder is linked to a folder outside the package is not installed', async () => {
    const project = makeFakeEslintProject({ script: null });
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-outside-bin-'));
    try {
      fs.writeFileSync(path.join(outside, 'eslint.js'), '');
      fs.symlinkSync(outside, path.join(project.root, 'node_modules', 'eslint', 'bin'), linkType);
      assert.ok(fs.existsSync(path.join(project.root, 'node_modules', 'eslint', 'bin', 'eslint.js')),
        'the manifest names a script that exists through the link');
      await probe((SASTRunner) => assert.equal(new SASTRunner(project.root).isToolAvailable('eslint'), false));
    } finally { rm(project.root, outside); }
  });

  it('eslint whose bin is an absolute path outside the package is not installed, and the path is never touched', async (t) => {
    const project = makeFakeEslintProject({ script: null });
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-outside-abs-'));
    try {
      const target = path.join(outside, 'outside.js');
      fs.writeFileSync(target, '');
      const outsideReal = fs.realpathSync(target);
      fs.writeFileSync(path.join(project.root, 'node_modules', 'eslint', 'package.json'),
        JSON.stringify({ name: 'eslint', version: '0.0.0-fixture', bin: { eslint: outsideReal } }));
      // The containment check comes before the real path is resolved, so a path outside the
      // package (a network path on Windows, say) is refused without being touched.
      const touched = [];
      const realpath = fs.realpathSync;
      t.mock.method(fs, 'realpathSync', function (p, options) {
        touched.push(String(p));
        return realpath.call(this, p, options);
      });
      await probe((SASTRunner) => assert.equal(new SASTRunner(project.root).isToolAvailable('eslint'), false));
      assert.ok(touched.length > 0, 'the lookup resolved real paths (the spy sees them)');
      assert.deepEqual(touched.filter((p) => p === outsideReal || p === target), [],
        'the bin path outside the package must not be resolved');
    } finally { rm(project.root, outside); }
  });

  // A deliberate rule change (the review of this slice): the lookup used to refuse an eslint whose
  // real path lay outside every node_modules of the project and its ancestors. That check protected
  // nothing (whoever can plant such a link already controls the project's eslint configuration,
  // which eslint runs as code) and refused legitimate layouts (pnpm's store, a linked node_modules).
  // This case therefore asserts the new rule: a link from outside is found. The bin script must
  // still lie inside the package it belongs to (the cases above).
  it('eslint linked in from outside the project is found (the ownership check is gone)', async () => {
    const owner = makeFakeEslintProject();
    const other = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-linked-eslint-'));
    try {
      fs.mkdirSync(path.join(other, 'node_modules'));
      fs.symlinkSync(fs.realpathSync(path.join(owner.root, 'node_modules', 'eslint')),
        path.join(other, 'node_modules', 'eslint'), linkType);
      await probe((SASTRunner) => assert.equal(new SASTRunner(other).isToolAvailable('eslint'), true));
    } finally { rm(owner.root, other); }
  });

  // The walk is bounded by the repository: from the project folder upward, up to and including the
  // first folder that contains .git (a folder, or a file in a git worktree). Changed from "any
  // ancestor": an eslint planted by another local user in /node_modules, /tmp/node_modules or
  // C:\node_modules must not run for a project that has none.
  it("eslint in an ancestor's node_modules, inside the repository, is found", async () => {
    const project = makeFakeEslintProject({ files: { '.git/HEAD': '', 'packages/app/index.js': '' } });
    try {
      await probe((SASTRunner) =>
        assert.equal(new SASTRunner(path.join(project.root, 'packages', 'app')).isToolAvailable('eslint'), true));
    } finally { rm(project.root); }
  });

  it('a .git file (a git worktree) marks the repository like a .git folder', async () => {
    const project = makeFakeEslintProject({ files: { '.git': 'gitdir: elsewhere\n', 'packages/app/index.js': '' } });
    try {
      await probe((SASTRunner) =>
        assert.equal(new SASTRunner(path.join(project.root, 'packages', 'app')).isToolAvailable('eslint'), true));
    } finally { rm(project.root); }
  });

  it('eslint in a node_modules above the repository is not installed', async () => {
    const project = makeFakeEslintProject({ files: { 'repo/.git/HEAD': '', 'repo/app/index.js': '' } });
    try {
      await probe((SASTRunner) => {
        assert.equal(new SASTRunner(path.join(project.root, 'repo', 'app')).isToolAvailable('eslint'), false,
          'the repository folder bounds the walk: the folder above it is not searched');
        assert.equal(new SASTRunner(path.join(project.root, 'repo', '.git')).isToolAvailable('eslint'), false,
          'a folder inside .git still stops at the repository');
      });
    } finally { rm(project.root); }
  });

  it('the walk stops at the first repository, not at an outer one', async () => {
    const project = makeFakeEslintProject({
      files: { '.git/HEAD': '', 'inner/.git/HEAD': '', 'inner/app/index.js': '' }
    });
    try {
      await probe((SASTRunner) =>
        assert.equal(new SASTRunner(path.join(project.root, 'inner', 'app')).isToolAvailable('eslint'), false));
    } finally { rm(project.root); }
  });

  it('with no repository, only the project folder counts', async () => {
    const project = makeFakeEslintProject({ files: { 'packages/app/index.js': '' } });
    try {
      for (let level = fs.realpathSync(project.root); path.dirname(level) !== level; level = path.dirname(level)) {
        assert.equal(fs.existsSync(path.join(level, '.git')), false,
          `this host has a .git at ${level}, above the temporary folder; the case needs a folder with no repository on the way`);
      }
      await probe((SASTRunner) => {
        assert.equal(new SASTRunner(path.join(project.root, 'packages', 'app')).isToolAvailable('eslint'), false,
          'an ancestor is not searched when no repository bounds the walk');
        assert.equal(new SASTRunner(project.root).isToolAvailable('eslint'), true, 'the project folder itself counts');
      });
    } finally { rm(project.root); }
  });

  // The walk does not trust a folder any local user can write into (as git does for its safe
  // directories). Another user can create `.git` and `node_modules/eslint` in such a folder (the
  // shared temporary folder, say), and the walk would run that eslint, as code, for every project
  // below it that has no repository. A folder whose mode has the other-write bit is out of reach,
  // with everything above it. Only the folders being climbed are asked, never where a link points.
  describe('a folder anyone can write into is not trusted', () => {
    /** A shared folder with `.git` and an eslint, above a project that has no repository of its own. */
    function sharedFolderAboveProject(mode) {
      const shared = makeFakeEslintProject({ files: { '.git/HEAD': '', 'app/index.js': '' } });
      fs.chmodSync(path.join(shared.root, 'app'), 0o755);
      fs.chmodSync(shared.root, mode);
      return { ...shared, app: path.join(shared.root, 'app') };
    }

    it('a shared folder (mode 1777) holding .git and eslint above a project with no repository: not installed (POSIX)', async (t) => {
      if (process.platform === 'win32') { t.diagnostic('the mode bit has no meaning on Windows; see the Windows case below'); return; }
      const shared = sharedFolderAboveProject(0o1777);
      try {
        await probe((SASTRunner) =>
          assert.equal(new SASTRunner(shared.app).isToolAvailable('eslint'), false,
            'the planted .git and node_modules of a folder anyone can write into count for nothing'));
      } finally { rm(shared.root); }
    });

    it('the same layout without the other-write bit still finds it, so the bit is what decides (POSIX)', async (t) => {
      if (process.platform === 'win32') { t.diagnostic('the mode bit has no meaning on Windows; see the Windows case below'); return; }
      const shared = sharedFolderAboveProject(0o755);
      try {
        await probe((SASTRunner) =>
          assert.equal(new SASTRunner(shared.app).isToolAvailable('eslint'), true));
      } finally { rm(shared.root); }
    });

    it("the project's own node_modules still counts when the folder above it is shared (POSIX)", async (t) => {
      if (process.platform === 'win32') { t.diagnostic('the mode bit has no meaning on Windows'); return; }
      const shared = sharedFolderAboveProject(0o1777);
      try {
        fs.cpSync(path.join(shared.root, 'node_modules'), path.join(shared.app, 'node_modules'), { recursive: true });
        await probe((SASTRunner) => assert.equal(new SASTRunner(shared.app).isToolAvailable('eslint'), true));
      } finally { rm(shared.root); }
    });

    it('on Windows the mode is not consulted (documented residual): the same shared layout is found', async () => {
      // Runs on every platform: process.platform is replaced, so the walk behaves as on Windows, where
      // fs.stat carries no access-control information (a folder such as C:\Users\Public cannot be told
      // apart from a private one). The residual is recorded as a finding in the plan.
      const shared = sharedFolderAboveProject(0o1777);
      const saved = Object.getOwnPropertyDescriptor(process, 'platform');
      try {
        Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
        await probe((SASTRunner) => assert.equal(new SASTRunner(shared.app).isToolAvailable('eslint'), true));
      } finally {
        Object.defineProperty(process, 'platform', saved);
        rm(shared.root);
      }
    });
  });

  it("eslint linked inside the project's own node_modules is found (pnpm layout)", async () => {
    const project = makeFakeEslintProject();
    try {
      const linked = path.join(project.root, 'node_modules', 'eslint');
      const real = path.join(project.root, 'node_modules', '.pnpm', 'eslint@9.0.0', 'node_modules', 'eslint');
      fs.mkdirSync(path.dirname(real), { recursive: true });
      fs.renameSync(linked, real);
      fs.symlinkSync(real, linked, linkType);
      await probe((SASTRunner) => assert.equal(new SASTRunner(project.root).isToolAvailable('eslint'), true));
    } finally { rm(project.root); }
  });

  it('the answer is kept for the life of one scanner', async () => {
    const project = makeFakeEslintProject();
    try {
      await probe((SASTRunner) => {
        const scanner = new SASTRunner(project.root);
        assert.equal(scanner.isToolAvailable('eslint'), true);
        fs.rmSync(path.join(project.root, 'node_modules', 'eslint'), { recursive: true, force: true });
        assert.equal(scanner.isToolAvailable('eslint'), true, 'the same scanner keeps its first answer');
        assert.equal(new SASTRunner(project.root).isToolAvailable('eslint'), false, 'a new scanner looks again');
      });
    } finally { rm(project.root); }
  });

  it('an unusable project folder means not installed and never throws', async () => {
    const missing = path.join(os.tmpdir(), 'ctoc-no-such-folder-for-eslint', 'deeper');
    await probe((SASTRunner) => {
      assert.equal(new SASTRunner(undefined).isToolAvailable('eslint'), false);
      assert.equal(new SASTRunner('').isToolAvailable('eslint'), false);
      assert.equal(new SASTRunner(missing).isToolAvailable('eslint'), false);
    });
  });
});

test("a failed eslint start says why in plain words: the first line eslint wrote to its standard error", async () => {
  const stderr = "\n\nESLint couldn't find an eslint.config.(js|mjs|cjs) file.\nTo set up a configuration file, run npm init.\n";
  const project = makeFakeEslintProject({
    script: `process.stderr.write(${JSON.stringify(stderr)});\nprocess.exitCode = 2;\n`
  });
  try {
    await withScan({ runForReal: (file, args) => file === process.execPath && args[0] === project.bin },
      async ({ SASTRunner, starts }) => {
        const runner = new SASTRunner(project.root);
        await runner.runESLintSecurity();
        assert.equal(starts.length, 1);
        assert.equal(runner.errors.length, 1, JSON.stringify(runner.errors));
        assert.equal(runner.errors[0].tool, 'eslint-security');
        assert.match(runner.errors[0].error, /ESLint couldn't find an eslint\.config\.\(js\|mjs\|cjs\) file\./);
        assert.doesNotMatch(runner.errors[0].error, /To set up a configuration file/,
          'only the first non-empty line of the standard error is named');
      });
  } finally {
    rm(project.root);
  }
});

test("the recorded line of eslint's standard error has its control characters removed and is capped at 300 characters", async () => {
  const stderr = `\u001b[31m\u0007bad\u0000 thing\u007f happened ${'x'.repeat(500)}\nsecond line\n`;
  const project = makeFakeEslintProject({
    script: `process.stderr.write(${JSON.stringify(stderr)});\nprocess.exitCode = 2;\n`
  });
  try {
    await withScan({ runForReal: (file, args) => file === process.execPath && args[0] === project.bin },
      async ({ SASTRunner }) => {
        const runner = new SASTRunner(project.root);
        await runner.runESLintSecurity();
        assert.equal(runner.errors.length, 1, JSON.stringify(runner.errors));
        const recorded = runner.errors[0].error;
        assert.doesNotMatch(recorded, /[\u0000-\u001f\u007f-\u009f]/, 'no control character is recorded');
        assert.match(recorded, /^\[31mbad thing happened x+ \(/, 'the readable text of the line is kept');
        const said = recorded.slice(0, recorded.lastIndexOf(' ('));
        assert.equal(said.length, 300, 'the line is capped at 300 characters');
        assert.doesNotMatch(recorded, /second line/, 'only the first line is named');
      });
  } finally {
    rm(project.root);
  }
});

// The severity a dependency finding carries (found while recording the lodash audit of
// criterion 18): the parser used the FIRST advisory of `via`, so a package whose first advisory
// was moderate and whose second was critical was recorded MODERATE, and the push passed with a
// known critical dependency.
describe('the dependency audit records the highest severity of a package, not its first advisory', () => {
  const advisories = [
    { title: 'first, moderate', severity: 'moderate', url: 'https://example.test/m' },
    { title: 'second, critical', severity: 'critical', url: 'https://example.test/c' }
  ];

  it('npm gives the package a severity and its first advisory is lower: the finding is CRITICAL', () => {
    const { DependencyAuditor } = require('../src/lib/dependency-auditor');
    const auditor = new DependencyAuditor(os.tmpdir());
    auditor.parseNpmAuditResults({ vulnerabilities: { pkg: { name: 'pkg', range: '<2.0.0', severity: 'critical', via: advisories } } });
    assert.equal(auditor.vulnerabilities.length, 1);
    assert.equal(auditor.vulnerabilities[0].severity, 'CRITICAL');
    assert.equal(auditor.vulnerabilities[0].title, 'second, critical',
      'the finding names the advisory that sets its severity, with no "through" suffix');
  });

  it('a severity that is not a string never throws: the package is still recorded with its real severity', () => {
    const { DependencyAuditor } = require('../src/lib/dependency-auditor');
    const auditor = new DependencyAuditor(os.tmpdir());
    auditor.parseNpmAuditResults({
      vulnerabilities: {
        pkg: {
          name: 'pkg', range: '<2.0.0', severity: 'high',
          via: [{ title: 'first, low', severity: 'low' }, { title: 'second, numeric', severity: 5 }]
        }
      }
    });
    assert.deepEqual(auditor.errors, [], 'the entry is not abandoned with an error');
    assert.equal(auditor.vulnerabilities.length, 1);
    assert.equal(auditor.vulnerabilities[0].package, 'pkg');
    assert.equal(auditor.vulnerabilities[0].severity, 'HIGH', "the package's own severity stands");
    assert.equal(auditor.mapNpmSeverity(5), 'MODERATE');
    assert.equal(auditor.mapNpmSeverity({}), 'MODERATE');
    assert.equal(auditor.mapNpmSeverity(null), 'MODERATE');
  });

  it('a numeric severity goes through the CVSS bands: 9.8 is CRITICAL, 7.5 HIGH, and null, undefined or an object stay MODERATE', () => {
    const { DependencyAuditor } = require('../src/lib/dependency-auditor');
    const auditor = new DependencyAuditor(os.tmpdir());
    assert.equal(auditor.mapNpmSeverity(9.8), 'CRITICAL');
    assert.equal(auditor.mapNpmSeverity(7.5), 'HIGH');
    assert.equal(auditor.mapNpmSeverity(null), 'MODERATE');
    assert.equal(auditor.mapNpmSeverity(undefined), 'MODERATE');
    assert.equal(auditor.mapNpmSeverity({}), 'MODERATE');
    auditor.parseNpmAuditResults({
      vulnerabilities: { pkg: { name: 'pkg', range: '<2.0.0', via: [{ title: 'scored, not labelled', severity: 9.8 }] } }
    });
    assert.deepEqual(auditor.errors, []);
    assert.equal(auditor.vulnerabilities[0].severity, 'CRITICAL', 'a numeric 9.8 is recorded CRITICAL');
  });

  it("the package's severity outranks every advisory object: CRITICAL, and the title names the dependency it came through", () => {
    const { DependencyAuditor } = require('../src/lib/dependency-auditor');
    const auditor = new DependencyAuditor(os.tmpdir());
    auditor.parseNpmAuditResults({
      vulnerabilities: {
        pkg: {
          name: 'pkg', range: '<2.0.0', severity: 'critical',
          via: [{ title: 'only object, moderate', severity: 'moderate' }, 'minimist']
        }
      }
    });
    assert.equal(auditor.vulnerabilities.length, 1);
    assert.equal(auditor.vulnerabilities[0].severity, 'CRITICAL');
    assert.equal(auditor.vulnerabilities[0].title, 'only object, moderate (through minimist)');
  });

  it('npm gives the package no severity: the highest advisory of `via` decides, never the first', () => {
    const { DependencyAuditor } = require('../src/lib/dependency-auditor');
    const auditor = new DependencyAuditor(os.tmpdir());
    auditor.parseNpmAuditResults({ vulnerabilities: { pkg: { name: 'pkg', range: '<2.0.0', via: advisories } } });
    assert.equal(auditor.vulnerabilities.length, 1);
    assert.equal(auditor.vulnerabilities[0].severity, 'CRITICAL');
    assert.equal(auditor.vulnerabilities[0].title, 'second, critical', 'the finding names the advisory that sets its severity');
  });
});

// The helper every closed-registry wrap uses (tests/helpers/security-scan-fixtures.js). Its job is a
// promise to the other test files: npm reaches no registry inside the wrap, and the process
// environment is exactly as it was after it.
describe('withClosedNpmRegistry points npm at a closed port and puts the environment back exactly', () => {
  const net = require('node:net');
  const { withClosedNpmRegistry } = require('./helpers/security-scan-fixtures');

  /** Every spelling in process.env of the names, in any letter case, with its value. */
  function snapshot(names) {
    const wanted = new Set(names.map((n) => n.toLowerCase()));
    return Object.entries(process.env).filter(([key]) => wanted.has(key.toLowerCase()));
  }

  const SET_BY_HELPER = [
    'npm_config_registry', 'COREPACK_NPM_REGISTRY', 'npm_config_fetch_retries', 'npm_config_cache',
    'npm_config_userconfig', 'npm_config_offline', 'npm_config_noproxy', 'NO_PROXY', 'COREPACK_ENABLE_NETWORK'
  ];

  /** Set variables for one test and put the previous values back, whatever the spelling. */
  function withEnv(vars, body) {
    const names = [...Object.keys(vars), ...SET_BY_HELPER];
    const before = snapshot(names);
    for (const [key] of before) delete process.env[key];
    Object.assign(process.env, vars);
    return Promise.resolve().then(body).finally(() => {
      for (const [key] of snapshot(names)) delete process.env[key];
      for (const [key, value] of before) process.env[key] = value;
    });
  }

  it('sets the closed registry, no proxy for the loopback and no corepack download; hands the callback its cache and port', async () => {
    await withEnv({}, async () => {
      let seen;
      await withClosedNpmRegistry(async ({ cache, port }) => {
        seen = { cache, port };
        assert.equal(typeof port, 'number');
        assert.ok(fs.statSync(cache).isDirectory(), 'the cache folder exists while the callback runs');
        assert.equal(process.env.npm_config_registry, `http://127.0.0.1:${port}/`);
        assert.equal(process.env.COREPACK_NPM_REGISTRY, `http://127.0.0.1:${port}/`);
        assert.equal(process.env.npm_config_cache, cache);
        assert.equal(process.env.npm_config_fetch_retries, '0');
        assert.equal(process.env.npm_config_offline, 'false');
        assert.equal(process.env.npm_config_noproxy, '127.0.0.1');
        assert.equal(process.env.NO_PROXY, '127.0.0.1');
        assert.equal(process.env.COREPACK_ENABLE_NETWORK, '0');
        assert.equal(fs.readFileSync(process.env.npm_config_userconfig, 'utf8'), '');
      });
      assert.equal(fs.existsSync(seen.cache), false, 'the temporary folder is removed');
      await new Promise((resolve, reject) => {
        const socket = net.connect(seen.port, '127.0.0.1');
        socket.once('connect', () => { socket.destroy(); reject(new Error('the closed port accepted a connection')); });
        socket.once('error', (error) => { assert.equal(error.code, 'ECONNREFUSED'); resolve(); });
      });
      assert.deepEqual(snapshot(SET_BY_HELPER), [], 'the variables were unset before, so they are unset after');
    });
  });

  it('puts back an inherited proxy and every spelling of the names it sets, on return and on a throw', async () => {
    const inherited = {
      HTTPS_PROXY: 'http://proxy.example.test:3128',
      https_proxy: 'http://proxy.example.test:3129',
      NPM_CONFIG_REGISTRY: 'https://registry.example.test/',
      npm_config_registry: 'https://registry.example.test/lower',
      No_Proxy: 'example.test',
      npm_config_noproxy: 'example.test',
      COREPACK_ENABLE_NETWORK: '1'
    };
    await withEnv(inherited, async () => {
      const names = [...Object.keys(inherited), ...SET_BY_HELPER];
      const before = snapshot(names).sort();
      await withClosedNpmRegistry(async () => {
        assert.equal(process.env.HTTPS_PROXY, 'http://proxy.example.test:3128',
          'a proxy is left alone: NO_PROXY keeps the loopback off it');
        assert.equal(process.env.NO_PROXY, '127.0.0.1');
        assert.equal(process.env.NPM_CONFIG_REGISTRY, undefined,
          'npm reads npm_config_* in any case: the other spellings are removed');
        assert.equal(process.env.No_Proxy, undefined, 'every other spelling of NO_PROXY is removed');
      });
      assert.deepEqual(snapshot(names).sort(), before, 'restored on return');
      await assert.rejects(withClosedNpmRegistry(async () => { throw new Error('the callback failed'); }),
        /the callback failed/);
      assert.deepEqual(snapshot(names).sort(), before, 'restored on a throw');
    });
  });

  it('removes every folder it made when its own setup fails part-way', async (t) => {
    const made = [];
    const mkdtemp = fs.mkdtempSync;
    t.mock.method(fs, 'mkdtempSync', function (...args) {
      const folder = mkdtemp.apply(this, args);
      made.push(folder);
      return folder;
    });
    const writeFile = fs.writeFileSync;
    t.mock.method(fs, 'writeFileSync', function (file, ...rest) {
      if (path.basename(String(file)) === 'npmrc') throw new Error('setup failed part-way');
      return writeFile.call(this, file, ...rest);
    });
    await withEnv({}, async () => {
      await assert.rejects(withClosedNpmRegistry(async () => {}), /setup failed part-way/);
      assert.deepEqual(snapshot(SET_BY_HELPER), [], 'nothing was left set');
    });
    assert.ok(made.length > 0, 'the helper made a folder before it failed');
    assert.deepEqual(made.filter((folder) => fs.existsSync(folder)), []);
  });

  it('makeFakeEslintProject removes its folder when its own setup fails part-way', (t) => {
    const made = [];
    const mkdtemp = fs.mkdtempSync;
    t.mock.method(fs, 'mkdtempSync', function (...args) {
      const folder = mkdtemp.apply(this, args);
      made.push(folder);
      return folder;
    });
    // A file where the package needs a folder: the write under it fails with ENOTDIR.
    assert.throws(() => makeFakeEslintProject({ files: { 'node_modules/eslint/package.json/inside': 'x' } }));
    assert.equal(made.length, 1);
    assert.equal(fs.existsSync(made[0]), false);
  });
});
