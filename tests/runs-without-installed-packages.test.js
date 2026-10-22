/**
 * THE PLUGIN RUNS WITHOUT ANY INSTALLED PACKAGE.
 *
 * The marketplace copies the repository into the plugin cache and never runs
 * `npm install`, so a fresh install has no node_modules. This test builds exactly
 * that: it copies the shipped runtime into a fresh folder under os.tmpdir() (no
 * node_modules in the copy or in any ancestor), then loads every module in
 * src/lib and src/commands in a child process under a preload shim that records
 * EVERY bare (non-relative, non-builtin) module request, even one a try/catch
 * swallows. The only request allowed is the documented optional `typescript`
 * (src/lib/human-facing-scan.js, loaded in try/catch).
 *
 * It also drives the completion path for real: the circuit breaker is loaded lazily by
 * plan completion, so it records a kickback against a plan whose frontmatter carries a
 * legacy `kickback_counts` block and reads the escalation back.
 *
 * Hooks (they read stdin) and src/scripts (test-gate.js and release.js run on load) are
 * not required here; tests/runtime-dependencies-declared.test.js scans them statically.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ALLOWED_BARE = new Set(['typescript']);

let tmp;
let copy;
let project;
let shim;

const SHIM = `
const Module = require('module');
const fs = require('fs');
const path = require('path');
const seen = new Set();
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (typeof request === 'string' && !request.startsWith('.') && !path.isAbsolute(request) && !Module.isBuiltin(request)) seen.add(request);
  return orig.call(this, request, ...rest);
};
process.on('exit', () => fs.writeFileSync(process.env.SHIM_OUT, JSON.stringify([...seen])));
`;

// Runs in the copy: records kickbacks for real and reads the legacy count shapes.
const EXERCISE = `
const fs = require('fs');
const path = require('path');
const cb = require(path.join(process.env.COPY, 'src', 'lib', 'circuit-breaker.js'));
const project = process.env.PROJECT;
const plan = (name, text) => { const p = path.join(project, name); fs.writeFileSync(p, text); return p; };
const out = {};
out.bare = cb.readKickbackCounts(plan('bare.md', '---\\ntitle: x\\nkickback_counts:\\n  by_step:\\n    10: 3\\n  total: 3\\n---\\nbody\\n'), project);
out.single = cb.readKickbackCounts(plan('single.md', "---\\nkickback_counts:\\n  by_step:\\n    '14': 2\\n    '9': 1\\n  total: 3\\n---\\n"), project);
out.crlf = cb.readKickbackCounts(plan('crlf.md', '---\\r\\nkickback_counts:\\r\\n  by_step:\\r\\n    "10": 4\\r\\n  total: 4\\r\\n---\\r\\n'), project);
out.empty = cb.readKickbackCounts(plan('empty.md', '---\\nkickback_counts:\\n  by_step: {}\\n  total: 0\\n---\\n'), project);
out.polluted = cb.readKickbackCounts(plan('polluted.md', '---\\nkickback_counts:\\n  by_step:\\n    "__proto__": 9\\n    "10": 1\\n  total: 1\\n---\\n'), project);
const seeded = plan('seeded.md', '---\\ntitle: "seeded"\\nkickback_counts:\\n  by_step:\\n    "10": 5\\n  total: 5\\n---\\n\\n# body\\n');
out.recorded = cb.recordKickback(seeded, '12', project);
out.escalations = cb.getEscalations(project);
console.log(JSON.stringify(out));
`;

function run(args, env, cwd) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 30000);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

function childEnv(extra) {
  const env = { ...process.env, ...extra };
  delete env.NODE_PATH;
  return env;
}

/** Run `args` with the shim; returns the process result plus the bare requests it saw. */
async function runShimmed(args, cwd, tag) {
  const out = path.join(tmp, `${tag}.bare.json`);
  const res = await run(['--require', shim, ...args], childEnv({ SHIM_OUT: out, COPY: copy, PROJECT: project }), cwd);
  const bare = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : [];
  return { ...res, bare };
}

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-no-packages-'));
  copy = path.join(tmp, 'ctoc');
  project = path.join(tmp, 'project');
  fs.mkdirSync(copy);
  fs.mkdirSync(project);
  for (const entry of ['src', 'package.json', 'VERSION']) {
    fs.cpSync(path.join(ROOT, entry), path.join(copy, entry), { recursive: true });
  }
  shim = path.join(tmp, 'shim.js');
  fs.writeFileSync(shim, SHIM);
  fs.writeFileSync(path.join(tmp, 'exercise.js'), EXERCISE);
  for (let dir = copy; ; dir = path.dirname(dir)) {
    assert.ok(!fs.existsSync(path.join(dir, 'node_modules')), `a node_modules exists at ${dir}; the test would not model a fresh install`);
    if (dir === path.dirname(dir)) break;
  }
});

after(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

test('every module in src/lib and src/commands loads with no package installed', async () => {
  const files = ['lib', 'commands'].flatMap((d) =>
    fs.readdirSync(path.join(copy, 'src', d)).filter((f) => f.endsWith('.js')).map((f) => path.join(copy, 'src', d, f)));
  assert.ok(files.length > 100, `only ${files.length} modules found; the copy is broken`);

  const failures = [];
  const bare = new Set();
  const POOL = 8;
  for (let i = 0; i < files.length; i += POOL) {
    await Promise.all(files.slice(i, i + POOL).map(async (file, j) => {
      const r = await runShimmed(['-e', 'require(process.argv[1])', file], project, `load-${i + j}`);
      if (r.code !== 0) failures.push(`${path.relative(copy, file)}: exit ${r.code}: ${r.stderr.split('\n').find((l) => /Error/.test(l)) || r.stderr.slice(0, 200)}`);
      for (const b of r.bare) if (!ALLOWED_BARE.has(b)) bare.add(`${path.relative(copy, file)} requests '${b}'`);
    }));
  }
  assert.deepEqual(failures, [], `modules that failed to load:\n  ${failures.join('\n  ')}`);
  assert.deepEqual([...bare], [], `bare package requests (nothing is installed):\n  ${[...bare].join('\n  ')}`);
});

test('plan completion path: the circuit breaker reads legacy counts and escalates, with no package installed', async () => {
  const r = await runShimmed([path.join(tmp, 'exercise.js')], project, 'exercise');
  assert.equal(r.code, 0, `exercise failed:\n${r.stderr}`);
  assert.doesNotMatch(r.stderr + r.stdout, /Cannot find module/);
  assert.deepEqual(r.bare.filter((b) => !ALLOWED_BARE.has(b)), [], 'the completion path requested a bare package');

  const out = JSON.parse(r.stdout);
  const plain = (c) => ({ by_step: { ...c.by_step }, total: c.total });
  assert.deepEqual(plain(out.bare), { by_step: { 10: 3 }, total: 3 });
  assert.deepEqual(plain(out.single), { by_step: { 14: 2, 9: 1 }, total: 3 });
  assert.deepEqual(plain(out.crlf), { by_step: { 10: 4 }, total: 4 });
  assert.deepEqual(plain(out.empty), { by_step: {}, total: 0 });
  assert.deepEqual(plain(out.polluted), { by_step: { 10: 1 }, total: 1 });

  // The seeded legacy block (10: 5, total 5) plus one kickback at step 12 is the 6th: per-plan trips.
  assert.equal(out.recorded.total, 6);
  assert.equal(out.recorded.byStep, 1);
  assert.equal(out.recorded.escalation.type, 'per-plan');
  assert.equal(out.escalations.length, 1);
  assert.equal(out.escalations[0].type, 'per-plan');
  assert.equal(out.escalations[0].plan, 'seeded');
});
