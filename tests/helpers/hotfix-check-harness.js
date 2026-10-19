'use strict';

/**
 * The shared setup of the hotfix-check test files (tests/hotfix-check.test.js and
 * tests/hotfix-check-*.test.js, split by area on 2026-10-12; plan
 * the-test-suite-runs-faster-and-never-weaker-s1-split-the-hotfix-check-tests.md under plans/):
 * the fixture writers, the router call `check`, the assertion helpers, the timing helper, and
 * one private temporary folder per test process. Every statement below was moved word for word
 * out of tests/hotfix-check.test.js; only the requires and the export list are new.
 *
 * Loading this module registers the two cleanup hooks once per test process: the removal of
 * every scratch folder when the file ends, and the check after every test that no `ctoc-hotfix-`
 * folder is left in the private temporary folder. Every test file loads this module, so none can
 * forget them. `node --test` runs each test file in its own process, so each file gets its own
 * private folder and its own list of scratch folders.
 *
 * Not a `*.test.js` file and lives under tests/helpers/, so the `node --test tests/*.test.js`
 * glob never executes it as a test.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const { route } = require('../../src/lib/menu-screens');
// npm's own update check asks the npm registry; it is switched off for the npm this file starts
// (plan the-test-suite-runs-faster-and-never-weaker-s2, criterion 21: tests never reach the registry).
process.env.npm_config_update_notifier = 'false';

const NODE = process.execPath;
const STATUS_LINE = 'Checking the hotfix against the existing tests.';
const USAGE = 'Use: hotfix check [--run-tests] [<file> ...]';
const LOG = path.join('.ctoc', 'logs', 'hotfix-checks.jsonl');
const NO_TEST = 'no test ran, so nothing confirms the change';

const refusal = (clause) => `I did not treat this as a hotfix because ${clause}; `
  + 'it goes through a normal plan, and your edits stay in place, not committed.';
const unreadable = (why) => refusal(`I could not read the change (${why})`);
// The owner's decision of 2026-10-09 (answer "a"): the hotfix check keeps only the formats
// it can read exactly, because five rounds of security attacks kept finding new ways to get
// a behaviour change committed as a hotfix, the last ones where a hand-written reader
// disagrees with the real compiler. Since the tenth round (the session coordinator's
// decision of 2026-10-10) those formats are two: plain HTML pages and colours in plain CSS.
// Every case of a format removed on 2026-10-09 (Vue, Svelte, JSX, reStructuredText, Sass,
// Less, gettext) is kept, grouped at the end of its table, and asserts this clause; the cases
// of the kinds removed on 2026-10-10 (Markdown and plain-text prose, catalogue files, custom
// properties) are deleted, group by group, each with its reason in the plan's record ("Fix
// round 10"), and one table at the end of this file holds every removed extension.
const gone = (f) => `I do not recognise ${f} as wording or a colour`;
// The functional plan's clause (amended 2026-10-09) for a file whose format the check reads
// but whose change it cannot vouch for: text inside a component or custom element or inside
// `<svg>` or `<math>`, HTML outside the strict subset, a colour that is not the whole value
// of a colour property. Rows that asserted
// "not recognised", "could not read (… cannot follow / … open)" or the settings clause for
// one of these cases assert this clause since the sixth round: the wording the functional
// plan now specifies, on a refusal that stays a refusal.
const inexact = (f) => `it changes ${f} in a way the check cannot read exactly, and only what it can read exactly qualifies`;

const SETTING = (f) => `it changes a setting in ${f}, and settings changes are a common cause of outages`;

// The fixture every mechanics test changes: one colour in a stylesheet (until the re-check of
// 2026-10-10 it was a button's wording in a page; pages are no kind the check reads any more).
const HOME = '.save {\n  background-color: #0a58ca;\n}\n';
const HOME_STORE = HOME.replace('#0a58ca', '#0b5ed7');

/**
 * A node:test file. It records the folder it runs in under CTOC_HOTFIX_PROBE (when set),
 * then runs one test named `name` whose body may use `read(rel)` (a project file) and
 * `assert`.
 */
function nodeTest(name, body, { marker = 'ran.txt', prelude = '' } = {}) {
  return [
    "const test = require('node:test');",
    "const assert = require('node:assert');",
    "const fs = require('fs');",
    "const path = require('path');",
    "const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');",
    'const probe = process.env.CTOC_HOTFIX_PROBE;',
    `if (probe) fs.writeFileSync(path.join(probe, ${JSON.stringify(marker)}), process.cwd());`,
    prelude,
    `test(${JSON.stringify(name)}, () => {`,
    body,
    '});',
    ''
  ].join('\n');
}
const PASSING_TEST = nodeTest('has a rule', "  assert.ok(read('src/styles/home.css').includes('.save'));");
const FAILING_TEST = nodeTest('shows Save', "  assert.ok(read('src/styles/home.css').includes('#0a58ca'));");
const SCRIPT = 'node --test tests/*.test.js';

const REAL_TMP = os.tmpdir();
const scratch = [];
function tmpDir(prefix = 'hotfix-check-') {
  const d = fs.realpathSync.native(fs.mkdtempSync(path.join(REAL_TMP, prefix)));
  scratch.push(d);
  return d;
}
/** The temporary folder every check in this file sees as the system's. */
const PRIVATE_TMP = tmpDir('hotfix-private-tmp-');
const leftovers = () => fs.readdirSync(PRIVATE_TMP).filter((n) => n.startsWith('ctoc-hotfix-'));

test.after(() => {
  for (const r of scratch) {
    try { fs.rmSync(r, { recursive: true, force: true }); } catch { /* best effort */ }
  }
});
test.afterEach(() => {
  assert.deepEqual(leftovers(), [], 'no temporary copy of the check remains');
});

// `maintenance.auto=false` and `gc.auto=0`: git 2.54 starts `git maintenance run --auto --detach`
// after a commit, and that detached process may still write into a fixture repository while a
// test reads or removes it.
const GIT_IDENTITY = ['-c', 'user.name=Hotfix Test', '-c', 'user.email=hotfix@test.invalid', '-c', 'commit.gpgsign=false',
  '-c', 'maintenance.auto=false', '-c', 'gc.auto=0'];
function git(cwd, args, input) {
  const r = spawnSync('git', [...GIT_IDENTITY, ...args], { cwd, encoding: 'utf8', input });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
}

const packageJson = (testScript) => JSON.stringify({
  name: 'hotfix-fixture', version: '1.0.0', private: true, scripts: { test: testScript }
}, null, 2) + '\n';

/**
 * A committed repository holding `files`; with `testScript`, a package.json whose
 * `test` script is that command.
 */
function makeRepo(files, { testScript = null, autocrlf = false, init = true, commit = true, config = [] } = {}) {
  const root = tmpDir();
  if (init) {
    git(root, ['init', '-q']);
    if (autocrlf) git(root, ['config', 'core.autocrlf', 'true']);
    for (const [k, v] of config) git(root, ['config', k, v]);
  }
  const all = { ...files };
  if (testScript !== null) all['package.json'] = packageJson(testScript);
  writeFiles(root, all);
  if (init && commit) {
    git(root, ['add', '-A']);
    git(root, ['commit', '-q', '-m', 'base']);
  }
  return root;
}

const testedProject = (extra = {}, script = SCRIPT) => makeRepo({
  'src/styles/home.css': HOME, 'tests/home.test.js': PASSING_TEST, ...extra
}, { testScript: script });

/** Run `fn` with the given environment variables set, restoring them after. */
async function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) saved[k] = process.env[k];
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

/**
 * One check through the menu router. A nested `node --test` inherits NODE_TEST_CONTEXT
 * from this outer runner and reports to it instead of printing its counters (see
 * tests/step-13-verify.test.js), so the variable is cleared, as it is in a real session.
 */
function check(root, ...args) {
  return withEnv({ NODE_TEST_CONTEXT: undefined, TMPDIR: PRIVATE_TMP, TEMP: PRIVATE_TMP, TMP: PRIVATE_TMP },
    () => route(['hotfix', 'check', ...args], root));
}

/** A folder outside both repositories for a fixture test's marker files. */
function probeDir() {
  return tmpDir('hotfix-probe-');
}
const probeRead = (probe, name = 'ran.txt') => {
  const p = path.join(probe, name);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
};

function logLines(root) {
  const p = path.join(root, LOG);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
const withoutTime = (lines) => lines.map(({ at, ...rest }) => rest);

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const worktrees = (root) => git(root, ['worktree', 'list', '--porcelain']);
const stashList = (root) => git(root, ['stash', 'list']);

/** Status outside `.ctoc/`, the index entries, and the bytes of every changed or new file. */
function snapshot(root) {
  const status = spawnSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root })
    .stdout.toString('utf8').split('\0').filter((e) => e && !e.slice(3).startsWith('.ctoc/'));
  const index = spawnSync('git', ['ls-files', '-s'], { cwd: root }).stdout.toString('utf8');
  const bytes = {};
  for (const e of status) {
    const rel = e.slice(3);
    const abs = path.join(root, rel);
    if (fs.existsSync(abs) && fs.lstatSync(abs).isFile()) bytes[rel] = sha(fs.readFileSync(abs));
  }
  return { status, index, bytes, worktrees: worktrees(root), stash: stashList(root) };
}

/** The bytes of every file outside `.git/` and `.ctoc/`, by path. */
function treeBytes(root, rel = '') {
  const out = {};
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (r === '.git' || r === '.ctoc') continue;
    if (e.isDirectory()) Object.assign(out, treeBytes(root, r));
    else if (e.isFile()) out[r] = sha(fs.readFileSync(path.join(root, r)));
    else if (e.isSymbolicLink()) out[r] = `link:${fs.readlinkSync(path.join(root, r))}`;
  }
  return out;
}

/** Case 24: a refusal changes, stages, stashes or deletes nothing. */
async function refusedUntouched(root, args, clause) {
  const before = snapshot(root);
  const res = await check(root, ...args);
  assert.equal(res.verdict, 'refused', JSON.stringify(res));
  assert.equal(res.text, refusal(clause));
  assert.deepEqual(res.ask, { questions: [] });
  assert.deepEqual(res.actions, {});
  assert.deepEqual(snapshot(root), before);
  return res;
}

const q = (files) => files.map((f) => `'${f}'`).join(' ');

function assertChecking(res, files) {
  assert.equal(res.verdict, 'checking', JSON.stringify(res));
  assert.equal(res.text, STATUS_LINE);
  // `--` only when a judged name starts with `-`, so the usual `next` is exactly the acceptance criterion's.
  const dashes = files.some((f) => f.startsWith('-')) ? '-- ' : '';
  assert.equal(res.next, `hotfix check --run-tests ${dashes}${q(files)}`);
  assert.deepEqual(res.ask, { questions: [] });
  assert.deepEqual(res.actions, {});
}

function assertPass(res, files) {
  assert.equal(res.verdict, 'hotfix', JSON.stringify(res));
  assert.equal(res.text, '');
  assert.deepEqual(res.commit.files, files);
  assert.equal(res.commit.add, `git --literal-pathspecs add -- ${q(files)}`);
  assert.equal(res.commit.message, `git --literal-pathspecs commit --only -m 'hotfix: <what changed>' -- ${q(files)}`);
  assert.deepEqual(res.commit.judged.map((j) => j.path), files);
  for (const j of res.commit.judged) assert.match(j.blob, /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/);
  assert.equal(res.detail, undefined, JSON.stringify(res));
  assert.deepEqual(res.ask, { questions: [] });
  assert.deepEqual(res.actions, {});
}

async function buttonWording(root) {
  fs.writeFileSync(path.join(root, 'src', 'styles', 'home.css'), HOME_STORE);
  const first = await check(root, 'src/styles/home.css');
  const second = await check(root, '--run-tests', 'src/styles/home.css');
  return { first, second };
}

/** Read the single-quoted words of a `commit` command the way a POSIX shell would. */
function shellWords(command) {
  const words = [];
  const re = /'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(command)) !== null) words.push(m[1] !== undefined ? m[1] : m[2]);
  return words;
}

/** Run an answer's `commit.add` then `commit.message` from the project root. */
function runCommit(root, commit, what = 'reword') {
  const env = {
    ...process.env, GIT_AUTHOR_NAME: 'Hotfix Test', GIT_AUTHOR_EMAIL: 'hotfix@test.invalid',
    GIT_COMMITTER_NAME: 'Hotfix Test', GIT_COMMITTER_EMAIL: 'hotfix@test.invalid',
    GIT_CONFIG_COUNT: '3', GIT_CONFIG_KEY_0: 'commit.gpgsign', GIT_CONFIG_VALUE_0: 'false',
    GIT_CONFIG_KEY_1: 'maintenance.auto', GIT_CONFIG_VALUE_1: 'false', GIT_CONFIG_KEY_2: 'gc.auto', GIT_CONFIG_VALUE_2: '0'
  };
  for (const cmd of [commit.add, commit.message.replace('<what changed>', what)]) {
    const r = process.platform === 'win32'
      ? spawnSync('git', shellWords(cmd).slice(1), { cwd: root, encoding: 'utf8', env })
      : spawnSync('sh', ['-c', cmd], { cwd: root, encoding: 'utf8', env });
    assert.equal(r.status, 0, `${cmd}: ${r.stderr}`);
  }
}

/** The `ctoc-hotfix-` folder a recorded copy folder lies in. */
function copyParent(folder) {
  let d = folder;
  while (d !== path.dirname(d) && !path.basename(d).startsWith('ctoc-hotfix-')) d = path.dirname(d);
  assert.ok(path.basename(d).startsWith('ctoc-hotfix-'), `${folder} lies in no ctoc-hotfix- folder`);
  return d;
}

/** Case 45's project: ignored installed-package folders, and a build folder that is never linked. */
function linkedProject(testBody, extra = {}) {
  const root = makeRepo({
    'src/styles/home.css': HOME,
    'packages/a/index.js': 'module.exports = 1;\n',
    '.gitignore': 'node_modules/\n.venv/\nbuild/\n',
    'tests/home.test.js': nodeTest('greets', testBody),
    ...extra
  }, { testScript: SCRIPT });
  writeFiles(root, {
    'node_modules/greet/package.json': '{"name":"greet","main":"index.js"}\n',
    'node_modules/greet/index.js': "module.exports = 'hello';\n",
    'packages/a/node_modules/x/index.js': 'module.exports = 2;\n',
    '.venv/pyvenv.cfg': 'home = /usr/bin\n',
    'build/out.txt': 'built\n'
  });
  return root;
}

/** Cases 49, 50 and 52: a workspace package linked from an ignored node_modules. */
function workspaceProject(linkAt = 'greet', requireAs = 'greet', extra = {}) {
  const root = makeRepo({
    'src/styles/home.css': HOME,
    'packages/greet/package.json': '{"name":"greet","main":"index.js"}\n',
    'packages/greet/index.js': "module.exports = 'hello';\n",
    '.gitignore': 'node_modules/\n',
    'tests/home.test.js': nodeTest('greets', `  assert.equal(require(${JSON.stringify(requireAs)}), 'hello');`),
    ...extra
  }, { testScript: SCRIPT });
  const link = path.join(root, 'node_modules', ...linkAt.split('/'));
  fs.mkdirSync(path.dirname(link), { recursive: true });
  fs.symlinkSync(fs.realpathSync.native(path.join(root, 'packages', 'greet')), link, process.platform === 'win32' ? 'junction' : 'dir');
  return root;
}

/**
 * What a timed call must cost, in milliseconds, and below what a time is noise. Until the tenth
 * round the ratio was `big / max(small, 20)`: with a small input that cost 2 ms, a reader that
 * took 100 ms at four times the size (50 times as long) showed a ratio of 5 and passed. The
 * inputs now grow until a call costs 40 ms, and only a time below 2 ms is taken for 2 ms, so
 * that a reader too fast to time must also be fast, in milliseconds, at four times the size.
 */
const TIMED_MS = 40;
/**
 * What a call must cost under the DEFAULT cost, the processor time. It depends on the platform's processor clock, and a batch is
 * read to within one tick. Windows ticks at about 15.6 ms: at 40 ms a batch is 2.5 ticks, the sizing batch of `cpuPerCall` could
 * be read up to 1.5 times too high (3 ticks for 2.5 ticks of work) and the five-run minimum then favours a run read at 2 ticks,
 * so a reader that is linear could be read as 4 to 4.7 times worse than the bound's 4 and flip the bound of 8; at 160 ms a batch
 * is 10.3 ticks and one tick is under 10 percent of it. Elsewhere `process.cpuUsage()` advances in steps of a microsecond
 * (measured on macOS: steps of 1, 2, 3 microseconds; on Linux the user plus system time comes from the scheduler's nanosecond
 * runtime, believed and not measured), so a batch of 40 ms is read to within 0.0025 percent and 160 ms would only make the
 * suite slower. A caller's `cost` keeps TIMED_MS: its own clock is not this one.
 */
const CPU_TIMED_MS = process.platform === 'win32' ? 160 : 40;
const NOISE_MS = 2;
/** The most calls of one batch: the sizing batch of `cpuPerCall` and the batch of `growth` stop here. */
const MAX_CALLS = 8000;
/**
 * A timing case in ratio form (the decision at review of 2026-10-09: a bound in milliseconds
 * passed or failed with the machine's load, where a ratio does not). `at(n)` gives the call to
 * time on an input of size `n`, built before it is timed; `cost(call)` runs it and answers
 * what it cost in milliseconds (by default the processor time of this process, see `cpuBatch`). The call is warmed once; `n` grows until one call costs at
 * least 40 ms (160 ms for the default cost on Windows, see CPU_TIMED_MS) or `4n` would pass `limit` (inputs of many megabytes measure the engine's
 * memory, not the reader); an input that cannot grow that far is run several times in a row (at most MAX_CALLS),
 * so that what is timed still costs about as much. Then the minimum of five runs at `n` and of
 * five runs at `4n` is taken. Work that is linear in the input gives a ratio near 4,
 * quadratic work one near 16, and the bound is 8. The one absolute bound is seconds wide and
 * stops a runaway reader early.
 * @param {(n: number) => (() => unknown)} at @param {number} n the first size tried @param {number} limit the largest `4n`
 * @param {(call: () => unknown) => (number|Promise<number>)} [cost] by default the processor time the call takes, taken
 * over a batch of calls: this process's own user and system time (`process.cpuUsage()`), read once before the batch and
 * once after, never per call. A caller's `cost` is run per call and summed. The default cost is for synchronous calls: it
 * throws when a call returns a promise, which it would time only up to its first await.
 * @returns {Promise<{n: number, small: number, big: number, ratio: number}>}
 */
async function growth(at, n, limit, cost) {
  const sample = cost || cpuPerCall;
  const timed = cost ? TIMED_MS : CPU_TIMED_MS;
  let call = at(n);
  await sample(call); // warm once
  let once = await sample(call);
  while (once < timed && n * 8 <= limit) {
    n *= once < timed / 4 && n * 16 <= limit ? 4 : 2;
    call = at(n);
    once = await sample(call);
  }
  assert.ok(once < 5000, `one call at size ${n} took ${once.toFixed(0)} ms`);
  const times = once < timed ? Math.min(Math.ceil(timed / Math.max(once, 0.02)), MAX_CALLS) : 1;
  const run = cost
    ? async (fn) => {
      let sum = 0;
      for (let k = 0; k < times; k++) sum += await cost(fn);
      return sum;
    }
    : async (fn) => cpuBatch(fn, times);
  const least = async (fn) => Math.min(await run(fn), await run(fn), await run(fn), await run(fn), await run(fn));
  const small = await least(call);
  const big = await least(at(4 * n));
  return { n, small, big, ratio: big / Math.max(small, NOISE_MS) };
}
/**
 * The default cost: this process's own processor time (user plus system), not the wall clock. The wall clock
 * of a call counts the time the process waits for a core, and under the full suite's load that inflated the larger input
 * more than the smaller one (finding 2c, 2026-10-17: 23 ms at size 32, 288 ms at size 128, a ratio of 12.5 against the
 * bound of 8, for work that is linear). The processor time of the process is what other processes' load cannot
 * add to. It is read once before and once after a whole batch, never per call: the processor clock of Windows ticks at
 * about 15.6 ms, so a reading around one call of under a millisecond is 0 or 15.6, where a batch of calls that costs
 * about CPU_TIMED_MS (160 ms on Windows, 40 ms elsewhere) is read to within one tick. A call that returns a promise is refused: only its synchronous
 * part would be timed.
 * @param {() => unknown} call @param {number} times @returns {number} milliseconds of processor time for `times` calls
 */
function cpuBatch(call, times) {
  const start = process.cpuUsage();
  for (let k = 0; k < times; k++) {
    const returned = call();
    if (returned && typeof returned.then === 'function') {
      throw new Error('the default cost times a synchronous call; this call returned a promise (asynchronous), so pass a cost that awaits it');
    }
  }
  const used = process.cpuUsage(start);
  return (used.user + used.system) / 1000;
}
/** @param {() => unknown} call @returns {number} the processor time of one call, from a batch of calls (at most MAX_CALLS) long enough to read */
function cpuPerCall(call) {
  let times = 1;
  let ms = cpuBatch(call, times);
  while (ms < CPU_TIMED_MS && times < MAX_CALLS) {
    times = Math.min(times * 4, MAX_CALLS);
    ms = cpuBatch(call, times);
  }
  return ms / times;
}
/** The change the rules read, built by hand: one file whose lines changed in place. */
function changeOf(rel, oldText, newText) {
  const o = oldText.split('\n');
  const n = newText.split('\n');
  assert.equal(o.length, n.length, 'the edit adds no line');
  const hunks = [];
  for (let i = 0; i < o.length; i++) if (o[i] !== n[i]) hunks.push({ oldStart: i + 1, newStart: i + 1, removed: [o[i]], added: [n[i]] });
  return {
    files: [{ display: rel, topRel: rel, status: 'M', oldMode: '100644', newMode: '100644', oldSha: null, oldText, newText, hunks }],
    lineCount: hunks.length * 2
  };
}

module.exports = {
  NODE, STATUS_LINE, USAGE, LOG, NO_TEST, refusal, unreadable, gone, inexact, SETTING, HOME,
  HOME_STORE, nodeTest, PASSING_TEST, FAILING_TEST, SCRIPT, tmpDir, PRIVATE_TMP, leftovers,
  git, writeFiles, packageJson, makeRepo, testedProject, withEnv, check,
  probeDir, probeRead, logLines, withoutTime, sha, worktrees, stashList, treeBytes,
  refusedUntouched, assertChecking, assertPass, buttonWording, shellWords, runCommit,
  copyParent, linkedProject, workspaceProject, growth, changeOf
};
