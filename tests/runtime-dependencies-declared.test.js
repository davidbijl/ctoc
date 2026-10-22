/**
 * THE SHIPPED CODE REQUIRES NO PACKAGE AT ALL.
 *
 * The marketplace copies the repository into the plugin cache and never runs
 * `npm install`: a fresh install has no node_modules, so a declared "dependencies"
 * entry is never installed. A module that `require`s a package loads on a developer's
 * checkout and crashes on a fresh install. That is how `js-yaml` (required by
 * circuit-breaker.js) broke plan completion for every marketplace install.
 *
 * Scans every shipped source file (src/, hooks/, skills/) for a literal
 * `require('<bare package>')` / `import('<bare package>')`, comments excluded, and
 * asserts each one is a Node built-in (with or without the `node:` prefix) or a listed
 * OPTIONAL package. package.json must also declare no "dependencies" (devDependencies
 * only): a declaration would promise an install that never happens.
 * tests/runs-without-installed-packages.test.js proves the same by real module
 * resolution in a copy with no node_modules.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { isBuiltin } = require('module');

const ROOT = path.join(__dirname, '..');
const SHIPPED = ['src', 'hooks', 'skills'];
const SOURCE = /\.(?:js|cjs|mjs)$/;

/**
 * Deliberately optional packages: loaded inside try/catch, absence reported to the
 * caller. Keyed `file -> package`; a stale entry (file no longer requires it) fails
 * the test so the list cannot rot into a blanket pass.
 */
const OPTIONAL = {
  // human-facing-scan.js loadParser(): "ts === null" when the parser is absent.
  'src/lib/human-facing-scan.js': ['typescript'],
};

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (SOURCE.test(entry.name)) out.push(full);
  }
  return out;
}

/** Remove block and line comments so a `require('x')` in prose is not counted. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

/** `@scope/name/sub` -> `@scope/name`; `name/sub` -> `name`. */
function packageName(spec) {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function bareRequiresIn(source) {
  const src = stripComments(source);
  const found = new Set();
  const re = /\b(?:require|import)\(\s*(['"])([^'"\n]+)\1\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const spec = m[2];
    if (spec.startsWith('.') || spec.startsWith('/') || isBuiltin(spec)) continue;
    found.add(packageName(spec));
  }
  return found;
}

function bareRequires(file) {
  return bareRequiresIn(fs.readFileSync(file, 'utf8'));
}

test('the shipped code requires no bare package except the optional ones, and package.json declares no dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.deepEqual(Object.keys(pkg.dependencies || {}), [],
    'package.json must declare no "dependencies": nothing installs them in the plugin cache; use devDependencies');
  const files = SHIPPED.flatMap((d) => {
    const dir = path.join(ROOT, d);
    return fs.existsSync(dir) ? walk(dir, []) : [];
  });
  assert.ok(files.length > 100, `scanned only ${files.length} files; the walk is broken`);

  const undeclared = [];
  const usedOptional = new Set();
  for (const file of files) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    for (const name of bareRequires(file)) {
      if ((OPTIONAL[rel] || []).includes(name)) { usedOptional.add(`${rel}:${name}`); continue; }
      undeclared.push(`${rel} requires '${name}'`);
    }
  }
  assert.deepEqual(undeclared, [],
    `packages required by shipped code, but nothing is installed in the plugin cache:\n  ${undeclared.join('\n  ')}`);

  for (const [rel, names] of Object.entries(OPTIONAL)) {
    for (const name of names) {
      assert.ok(usedOptional.has(`${rel}:${name}`), `stale OPTIONAL entry: ${rel} no longer requires '${name}'`);
    }
  }
});

test('the scanner sees a bare require in a source string and treats node: forms as built-ins', () => {
  const fixture = "// require('in-a-comment')\nconst a = require('js-yaml');\nconst b = require('node:path');\nconst c = require('./x');\n";
  assert.deepEqual([...bareRequiresIn(fixture)], ['js-yaml']);
  assert.ok(isBuiltin('node:path') && isBuiltin('node:test') && isBuiltin('fs/promises'));
  assert.equal(packageName('@scope/pkg/sub'), '@scope/pkg');
  assert.equal(packageName('pkg/sub'), 'pkg');
});
