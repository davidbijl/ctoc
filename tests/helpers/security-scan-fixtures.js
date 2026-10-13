'use strict';

/**
 * Shared support for the security-scan tests (plan: the-test-suite-runs-faster-and-never-weaker-s2).
 *
 * Two things the tests need and must not copy six times:
 *  - a temporary project that holds a fake `node_modules/eslint` package, so the scan's
 *    lookup of the scanned project's own eslint finds something without a real install;
 *  - an environment in which every real npm the test starts is pointed at a registry
 *    address on the loopback interface that nothing listens on, so a test that starts the
 *    real npm makes its request to an address that refuses it at once and reaches no
 *    registry. (The request still leaves the npm process, towards the closed loopback port;
 *    it never leaves the machine.)
 *
 * No assertion lives here. `node:` built-ins only.
 */

const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

/**
 * Make a temporary project with a fake `node_modules/eslint` package.
 *
 * The package manifest is `{ name, version, bin }` with no `exports` field. The caller
 * removes `root` when done. When the setup itself fails part-way, the folder made so far is
 * removed before the error is thrown.
 * @param {object} [options]
 * @param {string|object} [options.bin] the manifest's `bin` value
 * @param {string|null} [options.script] text of the bin script; `null` writes none
 * @param {string} [options.scriptPath] where, under `node_modules/eslint`, the script is written
 * @param {Record<string,string>} [options.files] further files, relative path to text, under the root
 * @returns {{ root: string, bin: string|null }} `bin` is the real path of the written script, or null
 */
function makeFakeEslintProject({
  bin = { eslint: './bin/eslint.js' },
  script = '',
  scriptPath = 'bin/eslint.js',
  files = {}
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-fake-eslint-'));
  try {
    const pkgDir = path.join(root, 'node_modules', 'eslint');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'eslint', version: '0.0.0-fixture', bin })
    );
    let realBin = null;
    if (script !== null) {
      const scriptFile = path.join(pkgDir, scriptPath);
      fs.mkdirSync(path.dirname(scriptFile), { recursive: true });
      fs.writeFileSync(scriptFile, script);
      realBin = fs.realpathSync(scriptFile);
    }
    for (const [rel, text] of Object.entries(files)) {
      const file = path.join(root, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
    }
    return { root, bin: realBin };
  } catch (error) {
    fs.rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

/**
 * A port on 127.0.0.1 that nothing listens on: a server is opened on port 0, its port read
 * and the server closed again.
 *
 * The port race: the port is free between the close and npm's connection. If a stranger
 * answers on it in that gap, the test goes red (npm gets an answer that is not a refusal),
 * never green.
 * @returns {Promise<number>}
 */
function closedLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

/** The variables the closed-registry wrap sets (npm reads npm_config_* in any letter case). */
const CLOSED_REGISTRY_VARIABLES = [
  'npm_config_registry',
  'COREPACK_NPM_REGISTRY',
  'npm_config_fetch_retries',
  'npm_config_cache',
  'npm_config_userconfig',
  'npm_config_offline',
  'npm_config_noproxy',
  'NO_PROXY',
  'COREPACK_ENABLE_NETWORK'
];

/**
 * Run `fn` with npm's registry pointed at a closed loopback port. Sets
 * `npm_config_registry` and `COREPACK_NPM_REGISTRY` to that address, `npm_config_fetch_retries`
 * to '0', `npm_config_cache` to a new empty folder, `npm_config_userconfig` to an empty file,
 * `npm_config_offline` to 'false', `npm_config_noproxy` and `NO_PROXY` to '127.0.0.1' (so an
 * inherited proxy cannot carry the request off the machine) and `COREPACK_ENABLE_NETWORK` to
 * '0' (a corepack shim for yarn or pnpm downloads nothing). Every other letter-case spelling
 * of those nine names is saved, removed while `fn` runs and put back. Every real npm the test
 * starts inherits these through `process.env`. All of it is put back exactly (deleted when it
 * was unset) and the temporary folder is removed, whether `fn` returns, throws, or the setup
 * itself fails part-way.
 *
 * `fn` receives `{ cache, port }`: the npm cache folder and the closed port, so a test can read
 * npm's own debug log under `<cache>/_logs/` and see that npm really tried that address.
 * @template T
 * @param {(info: { cache: string, port: number }) => T|Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withClosedNpmRegistry(fn) {
  const port = await closedLoopbackPort();
  /** @type {string|null} */
  let home = null;
  const wanted = new Set(CLOSED_REGISTRY_VARIABLES.map((name) => name.toLowerCase()));
  const spellings = () => Object.keys(process.env).filter((key) => wanted.has(key.toLowerCase()));
  /** @type {Array<[string, string|undefined]>} */
  const saved = [];
  try {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-closed-registry-'));
    const npmrc = path.join(home, 'npmrc');
    const cache = path.join(home, 'cache');
    fs.writeFileSync(npmrc, '');
    fs.mkdirSync(cache);
    for (const key of spellings()) {
      saved.push([key, process.env[key]]);
      delete process.env[key];
    }
    const url = `http://127.0.0.1:${port}/`;
    process.env.npm_config_registry = url;
    process.env.COREPACK_NPM_REGISTRY = url;
    process.env.npm_config_fetch_retries = '0';
    process.env.npm_config_cache = cache;
    process.env.npm_config_userconfig = npmrc;
    process.env.npm_config_offline = 'false';
    process.env.npm_config_noproxy = '127.0.0.1';
    process.env.NO_PROXY = '127.0.0.1';
    process.env.COREPACK_ENABLE_NETWORK = '0';
    return await fn({ cache, port });
  } finally {
    for (const key of spellings()) delete process.env[key];
    for (const [key, value] of saved) process.env[key] = /** @type {string} */ (value);
    if (home !== null) fs.rmSync(home, { recursive: true, force: true });
  }
}

module.exports = { makeFakeEslintProject, closedLoopbackPort, withClosedNpmRegistry };
