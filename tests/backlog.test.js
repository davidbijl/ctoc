'use strict';

/**
 * Tests for src/lib/backlog.js and src/scripts/backlog.js: parking a blocked functional plan in
 * plans/backlog/ and restoring it to plans/functional/ as an unapproved draft.
 *
 * Every case runs on a real temporary project (a `.ctoc/` folder, the stage folders, real plan files and
 * real approval records written by approval-ledger.writeEntry). Nothing in the backlog, the ledger, the
 * frontmatter merge or the gate is replaced. The one seam is `deps.removeEntry`, used only for the two
 * direct "a failed withdrawal stops everything" cases. The script runs IN-PROCESS (as
 * tests/move-plan.test.js does), so per-file coverage counts it: the script's argv, exit code, console and
 * working directory are the only things installed around it, and all of them are put back afterwards.
 *
 * "Unchanged" means every file and folder under plans/ and .ctoc/approvals/ is byte-identical.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ledger = require('../src/lib/approval-ledger');
const residency = require('../src/lib/approval-residency');
const { parkPlan, restorePlan } = require('../src/lib/backlog');

const SCRIPT = require.resolve('../src/scripts/backlog.js');
const OWNER_ONLY = 'Only the owner parks or restores a plan';
const BASE_FOLDERS = ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done'];

let root;
const roots = [];

/** A fresh project folder with the stage folders (not backlog/) and a .ctoc/ folder. */
function makeRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-backlog-'));
  fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });
  for (const folder of BASE_FOLDERS) fs.mkdirSync(path.join(dir, 'plans', folder), { recursive: true });
  roots.push(dir);
  return dir;
}

beforeEach(() => { root = makeRoot(); });
afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop(), { recursive: true, force: true });
});

/** The shared fixture's frontmatter lines, in order, then any extra lines before `depends_on`. */
function fixtureLines(extra = []) {
  return [
    'title: "X plan"',
    'type: feature',
    'status: approved',
    'approved_by: human',
    'approved_at: 2026-08-26T00:00:00.000Z',
    'gate_crossed: functional → implementation',
    'gate_1_approved: "2026-08-26 (owner) — decisions one to five"',
    ...extra,
    'depends_on: none',
  ];
}

const BODY = '\n# X plan\n\n## Problem Statement\nThe thing is broken.\n\n## Acceptance Criteria\n- [ ] the thing works\n\n## Scope\nThe module.\n';

/** A plan text: one frontmatter block of `lines`, then the shared body. */
function planText(lines = fixtureLines()) {
  return `---\n${lines.join('\n')}\n---\n${BODY}`;
}

/** Everything after the closing fence of the frontmatter. */
function afterFence(text) {
  return text.slice(text.indexOf('\n---\n', 4) + 5);
}

/** The frontmatter lines between the fences. */
function frontLines(text) {
  return text.slice(4, text.indexOf('\n---\n', 4)).split('\n');
}

function planPath(folder, name, base = root) {
  return path.join(base, 'plans', folder, name);
}

function writePlan(folder, name, text, base = root) {
  fs.mkdirSync(path.join(base, 'plans', folder), { recursive: true });
  fs.writeFileSync(planPath(folder, name, base), text);
}

/** A human approval record for `slug`, with the given destination. */
function writeRecord(slug, stageTo = 'implementation', base = root) {
  ledger.writeEntry(slug, {
    content_sha256: 'a'.repeat(64),
    stage_from: stageTo === 'done' ? 'review' : 'functional',
    stage_to: stageTo,
    approved_by: 'human',
  }, base);
}

function recordPath(slug, base = root) {
  return path.join(base, '.ctoc', 'approvals', `${slug}.json`);
}

function walk(abs, rel, out) {
  const found = fs.lstatSync(abs, { throwIfNoEntry: false });
  if (found === undefined) return;
  if (found.isSymbolicLink()) {
    out[rel] = `<link to ${fs.readlinkSync(abs)}>`;
  } else if (found.isDirectory()) {
    out[rel] = '<folder>';
    for (const name of fs.readdirSync(abs).sort()) walk(path.join(abs, name), path.join(rel, name), out);
  } else {
    out[rel] = fs.readFileSync(abs, 'utf8');
  }
}

/** A map from relative path to bytes of everything under plans/ and .ctoc/approvals/. */
function snapshot(base = root) {
  const out = {};
  walk(path.join(base, 'plans'), 'plans', out);
  walk(path.join(base, '.ctoc', 'approvals'), path.join('.ctoc', 'approvals'), out);
  return out;
}

/**
 * Run src/scripts/backlog.js exactly as the command line would, in-process.
 * @param {string[]} args
 * @param {string} [base]
 * @returns {{code: (number|undefined), stdout: string, stderr: string}}
 */
function runScript(args, base = root) {
  delete require.cache[SCRIPT];
  const saved = {
    argv: process.argv, exitCode: process.exitCode, log: console.log, error: console.error, cwd: process.cwd(),
  };
  const out = [];
  const err = [];
  process.exitCode = undefined;
  process.argv = [process.execPath, SCRIPT, ...args];
  console.log = (...a) => { out.push(a.join(' ')); };
  console.error = (...a) => { err.push(a.join(' ')); };
  try {
    process.chdir(base);
    require(SCRIPT);
    return { code: process.exitCode, stdout: out.join('\n'), stderr: err.join('\n') };
  } finally {
    process.chdir(saved.cwd);
    process.argv = saved.argv;
    process.exitCode = saved.exitCode;
    console.log = saved.log;
    console.error = saved.error;
    delete require.cache[SCRIPT];
  }
}

/** Assert `fn` throws an error with this code whose message matches every pattern. */
function assertRefusal(fn, code, ...patterns) {
  assert.throws(fn, (err) => {
    assert.equal(err.code, code);
    for (const pattern of patterns) assert.match(err.message, pattern);
    return true;
  });
}

// ── scenario 1: park ────────────────────────────────────────────────────────

describe('park', () => {
  test('scenario 1: moves the plan to backlog/, records the reason, keeps the body and removes the record', () => {
    const original = planText();
    writePlan('functional', 'x.md', original);
    writeRecord('x');

    const result = runScript(['park', 'x.md', 'waiting', 'on', 'DNA']);

    assert.equal(result.code, 0, result.stderr);
    const parked = fs.readFileSync(planPath('backlog', 'x.md'), 'utf8');
    const lines = frontLines(parked);
    assert.ok(lines.includes('status: backlog'));
    assert.ok(lines.includes('backlog_reason: "waiting on DNA"'));
    for (const key of ['approved_by', 'approved_at', 'gate_crossed']) {
      assert.ok(!lines.some((l) => l.startsWith(`${key}:`)), `${key} is gone`);
    }
    assert.ok(lines.includes('gate_1_approved: "2026-08-26 (owner) — decisions one to five"'), 'the owner note is kept');
    assert.equal(afterFence(parked), afterFence(original), 'the body is byte-identical');
    assert.ok(!fs.existsSync(planPath('functional', 'x.md')));
    assert.ok(!fs.existsSync(recordPath('x')));
    assert.match(result.stdout, /Parked x\.md: it is now plans\/backlog\/x\.md/);
    assert.match(result.stdout, /Reason recorded: waiting on DNA/);
    assert.match(result.stdout, /that record was removed/);
    assert.match(result.stdout, /restore x\.md/);
  });

  test('with no reason and no record: writes an empty reason and says so', () => {
    writePlan('functional', 'x.md', planText());

    const result = runScript(['park', 'x.md']);

    assert.equal(result.code, 0, result.stderr);
    assert.ok(frontLines(fs.readFileSync(planPath('backlog', 'x.md'), 'utf8')).includes('backlog_reason: ""'));
    assert.match(result.stdout, /No reason was given\./);
    assert.match(result.stdout, /It had no approval record\./);
  });

  test('the returned shape names both ends, the reason and whether a record was removed', () => {
    writePlan('functional', 'x.md', planText());
    writeRecord('x');

    assert.deepEqual(parkPlan('x.md', 'waiting on DNA', root), {
      from: 'functional/x.md', to: 'backlog/x.md', reason: 'waiting on DNA', recordRemoved: true,
    });
  });

  test('a reason is one quoted line: control characters become spaces, quote and backslash are escaped', () => {
    writePlan('functional', 'x.md', planText());

    const result = parkPlan('x.md', 'say "hi" \\ now\n\tok\u0085end', root);

    assert.equal(result.reason, 'say "hi" \\ now  ok end');
    const lines = frontLines(fs.readFileSync(planPath('backlog', 'x.md'), 'utf8'));
    assert.ok(lines.includes('backlog_reason: "say \\"hi\\" \\\\ now  ok end"'));
  });

  test('a second park of an already-parked reason replaces it instead of stacking a second line', () => {
    writePlan('functional', 'x.md', planText(fixtureLines(['backlog_reason: "old"'])));

    parkPlan('x.md', 'new', root);

    const lines = frontLines(fs.readFileSync(planPath('backlog', 'x.md'), 'utf8'));
    assert.deepEqual(lines.filter((l) => l.startsWith('backlog_reason:')), ['backlog_reason: "new"']);
  });
});

// ── scenario 2: notes move into the reason ──────────────────────────────────

describe('notes move into the reason', () => {
  test('scenario 2: quoted parked and blocked notes join the reason, uncut and re-escaped', () => {
    const blockedRaw = `DNA is not taking new \\"new\\" accounts and a \\\\ backslash ${'z'.repeat(200)}`;
    const blockedText = blockedRaw.replace(/\\(["\\])/g, '$1');
    writePlan('functional', 'x.md', planText(fixtureLines([
      'parked: "since 2026-09-07, by the owner"',
      `blocked: "${blockedRaw}"`,
    ])));

    const result = parkPlan('x.md', 'no account', root);

    const lines = frontLines(fs.readFileSync(planPath('backlog', 'x.md'), 'utf8'));
    assert.ok(lines.includes(`backlog_reason: "no account; since 2026-09-07, by the owner; ${blockedRaw}"`));
    assert.equal(result.reason, `no account; since 2026-09-07, by the owner; ${blockedText}`);
    assert.ok(result.reason.length > 200);
    assert.ok(!lines.some((l) => l.startsWith('parked:') || l.startsWith('blocked:')), 'both notes are gone');
  });

  test('a single-quoted note reads with its doubled quote', () => {
    writePlan('functional', 'x.md', planText(fixtureLines(["parked: 'it''s parked'"])));
    assert.equal(parkPlan('x.md', '', root).reason, "it's parked");
  });

  test('a folded block note reads as one line', () => {
    writePlan('functional', 'x.md', planText(fixtureLines(['blocked: >', '  line one', '  line two'])));
    assert.equal(parkPlan('x.md', '', root).reason, 'line one line two');
  });

  test('a plain note continued on an indented line reads as one line', () => {
    writePlan('functional', 'x.md', planText(fixtureLines(['parked: first part', '  second part'])));
    assert.equal(parkPlan('x.md', '', root).reason, 'first part second part');
  });

  test('a blank line inside a note is skipped and the next top-level key ends the note', () => {
    writePlan('functional', 'x.md', planText(fixtureLines(['blocked: |-', '  held', '', '  still held', 'priority: HIGH'])));

    const result = parkPlan('x.md', '', root);

    assert.equal(result.reason, 'held still held');
    const lines = frontLines(fs.readFileSync(planPath('backlog', 'x.md'), 'utf8'));
    assert.ok(lines.includes('priority: HIGH'), 'the key after the note stays');
    assert.ok(!lines.includes('  still held') && !lines.includes('  held'), 'the note lines are gone');
    assert.ok(lines.includes('backlog_reason: "held still held"'), 'the note moved into the reason');
  });

  test('an empty note adds nothing to the reason', () => {
    writePlan('functional', 'x.md', planText(fixtureLines(['parked: ""', 'blocked:'])));
    assert.equal(parkPlan('x.md', 'only me', root).reason, 'only me');
  });
});

// ── scenario 3: only functional parks ───────────────────────────────────────

describe('only a functional plan parks', () => {
  for (const folder of ['vision', 'canvas', 'implementation', 'todo', 'in-progress', 'review', 'done', 'backlog']) {
    test(`scenario 3: x.md only in ${folder}/ is refused and nothing changes`, () => {
      writePlan(folder, 'x.md', planText());
      writeRecord('x', folder === 'done' ? 'done' : 'implementation');
      const before = snapshot();

      const result = runScript(['park', 'x.md']);

      assert.equal(result.code, 1);
      assert.match(result.stderr, new RegExp(`x\\.md is not in plans/functional/; it is at plans/${folder}/x\\.md\\. Nothing was changed\\.`));
      if (folder === 'implementation') {
        assert.match(result.stderr, /first ask in the conversation to reject it back to functional planning, then park it/);
      } else {
        assert.doesNotMatch(result.stderr, /reject/);
      }
      assert.deepEqual(snapshot(), before);
    });
  }

  test('scenario 3: x.md nowhere is refused', () => {
    const before = snapshot();

    const result = runScript(['park', 'x.md']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /There is no plans\/functional\/x\.md, so nothing was changed\./);
    assert.deepEqual(snapshot(), before);
  });

  test('scenario 3: a project with no plans/ folder is refused and none is created', () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-backlog-bare-'));
    roots.push(bare);

    assertRefusal(() => parkPlan('x.md', '', bare), 'BACKLOG_REFUSED', /There is no plans\/functional\/x\.md/);
    assert.ok(!fs.existsSync(path.join(bare, 'plans')));
  });

  test('restore of a plan that is not in backlog/ says where it is, and a missing one says so', () => {
    assertRefusal(() => restorePlan('x.md', root), 'BACKLOG_REFUSED', /There is no plans\/backlog\/x\.md, so nothing was changed\./);
    writePlan('functional', 'x.md', planText());
    assertRefusal(() => restorePlan('x.md', root), 'BACKLOG_REFUSED', /x\.md is not in plans\/backlog\/; it is at plans\/functional\/x\.md/);
  });
});

// ── scenario 5: restore ─────────────────────────────────────────────────────

describe('restore', () => {
  test('scenario 5: brings the plan back as an unapproved draft with no old approval', () => {
    const lines = [
      'title: "X plan"',
      'type: feature',
      'status: backlog',
      'backlog_reason: "waiting on DNA"',
      'approved_by: human',
      'approved_at: 2026-08-26T00:00:00.000Z',
      'gate_crossed: functional → implementation',
      'override: true',
      'override_reason: "because"',
      'gate_1_approved: "2026-08-26 (owner) — decisions one to five"',
      'gate_2_approved: "2026-08-27 (owner)"',
      'priority: HIGH',
      'parked: "a hand-made note stays"',
      'depends_on: none',
    ];
    const original = planText(lines);
    writePlan('backlog', 'x.md', original);
    writeRecord('x');
    assert.equal(residency.classifyResidency(planPath('backlog', 'x.md'), 'implementation', root).accepted, true);

    const result = runScript(['restore', 'x.md']);

    assert.equal(result.code, 0, result.stderr);
    const restored = fs.readFileSync(planPath('functional', 'x.md'), 'utf8');
    assert.deepEqual(frontLines(restored), [
      'title: "X plan"',
      'type: feature',
      'priority: HIGH',
      'parked: "a hand-made note stays"',
      'depends_on: none',
      'status: draft',
    ]);
    assert.equal(afterFence(restored), afterFence(original), 'the body is byte-identical');
    assert.ok(!fs.existsSync(planPath('backlog', 'x.md')));
    assert.ok(!fs.existsSync(recordPath('x')));
    assert.deepEqual(
      residency.classifyResidency(planPath('functional', 'x.md'), 'implementation', root),
      { accepted: false, reason: 'no-ledger-entry', kind: null },
    );
    assert.match(result.stdout, /Restored x\.md to plans\/functional\/x\.md as an unapproved draft/);
    assert.match(result.stdout, /It had an approval record; that record was removed\./);
  });

  test('a plan with no record restores and says it had none', () => {
    writePlan('backlog', 'x.md', planText(fixtureLines(['backlog_reason: "r"'])));

    const result = runScript(['restore', 'x.md']);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /It had no approval record\./);
  });

  test('scenario 7: x.md only in review/ is refused', () => {
    writePlan('review', 'x.md', planText());
    const before = snapshot();

    const plain = runScript(['restore', 'x.md']);
    const withDestination = runScript(['restore', 'x.md', 'implementation']);

    assert.equal(plain.code, 1);
    assert.match(plain.stderr, /x\.md is not in plans\/backlog\/; it is at plans\/review\/x\.md\. Nothing was changed\./);
    assert.equal(withDestination.code, 1);
    assert.match(withDestination.stderr, /Usage:/);
    assert.match(withDestination.stderr, new RegExp(OWNER_ONLY));
    assert.deepEqual(snapshot(), before);
  });
});

// ── scenario 8: no name clash ───────────────────────────────────────────────

describe('no name clash', () => {
  test('scenario 8: restore refuses when functional/ holds the same name, and its record survives', () => {
    writePlan('backlog', 'x.md', planText(fixtureLines(['backlog_reason: "r"'])));
    writePlan('functional', 'x.md', planText());
    writeRecord('x');
    const before = snapshot();

    const result = runScript(['restore', 'x.md']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Refusing to restore x\.md: plans\/functional\/x\.md has the same name, and CTOC keeps one approval record per name/);
    assert.deepEqual(snapshot(), before);
    assert.ok(fs.existsSync(recordPath('x')));
  });

  test('scenario 8: restore refuses when done/ holds the same name in another letter case, and its record survives', () => {
    writePlan('backlog', 'x.md', planText(fixtureLines(['backlog_reason: "r"'])));
    writePlan('done', 'X.md', planText());
    writeRecord('x', 'done');
    const before = snapshot();

    const result = runScript(['restore', 'x.md']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /plans\/done\/X\.md has the same name/);
    assert.deepEqual(snapshot(), before);
    assert.ok(fs.existsSync(recordPath('x')), 'the done plan keeps its record');
  });

  test('scenario 8: park refuses when backlog/ already holds the same name', () => {
    writePlan('functional', 'y.md', planText());
    writePlan('backlog', 'y.md', planText(fixtureLines(['backlog_reason: "r"'])));
    writeRecord('y');
    const before = snapshot();

    const result = runScript(['park', 'y.md']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Refusing to park y\.md: plans\/backlog\/y\.md has the same name/);
    assert.deepEqual(snapshot(), before);
  });

  test('a plans/ that cannot be listed is not taken for a clean one: the listing error propagates', () => {
    const broken = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-backlog-broken-'));
    roots.push(broken);
    fs.writeFileSync(path.join(broken, 'plans'), 'a file where the folder should be');

    assert.throws(() => parkPlan('x.md', '', broken), (err) => err.code === 'ENOTDIR');
  });
});

// ── scenario 9: a failed withdrawal stops everything ────────────────────────

describe('a failed withdrawal stops everything', () => {
  const leaves = () => {};
  const throws = () => { throw new Error('disk is full'); };

  test('scenario 9 (park): a remove that leaves the record is refused and nothing changes', () => {
    writePlan('functional', 'x.md', planText());
    writeRecord('x');
    const before = snapshot();

    assertRefusal(() => parkPlan('x.md', 'r', root, { removeEntry: leaves }), 'BACKLOG_REFUSED',
      /The approval record for x\.md could not be removed, so nothing was moved or changed\./);
    assert.deepEqual(snapshot(), before);
  });

  test('scenario 9 (park): a remove that throws is refused with its message and nothing changes', () => {
    writePlan('functional', 'x.md', planText());
    writeRecord('x');
    const before = snapshot();

    assertRefusal(() => parkPlan('x.md', 'r', root, { removeEntry: throws }), 'BACKLOG_REFUSED', /could not be removed/, /disk is full/);
    assert.deepEqual(snapshot(), before);
  });

  test('scenario 9 (restore): a remove that leaves the record is refused and nothing changes', () => {
    writePlan('backlog', 'x.md', planText(fixtureLines(['backlog_reason: "r"'])));
    writeRecord('x');
    const before = snapshot();

    assertRefusal(() => restorePlan('x.md', root, { removeEntry: leaves }), 'BACKLOG_REFUSED', /could not be removed/);
    assert.deepEqual(snapshot(), before);
  });

  test('scenario 9 (restore): a remove that throws is refused with its message and nothing changes', () => {
    writePlan('backlog', 'x.md', planText(fixtureLines(['backlog_reason: "r"'])));
    writeRecord('x');
    const before = snapshot();

    assertRefusal(() => restorePlan('x.md', root, { removeEntry: throws }), 'BACKLOG_REFUSED', /could not be removed/, /disk is full/);
    assert.deepEqual(snapshot(), before);
  });

  test('scenario 9 (script, park): a record that cannot be deleted silently is still caught', () => {
    writePlan('functional', 'x.md', planText());
    fs.mkdirSync(recordPath('x'), { recursive: true });
    fs.writeFileSync(path.join(recordPath('x'), 'keep.txt'), 'held');
    const before = snapshot();

    const result = runScript(['park', 'x.md']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /could not be removed/);
    assert.deepEqual(snapshot(), before);
  });

  test('scenario 9 (script, restore): a record that cannot be deleted silently is still caught', () => {
    writePlan('backlog', 'x.md', planText(fixtureLines(['backlog_reason: "r"'])));
    fs.mkdirSync(recordPath('x'), { recursive: true });
    fs.writeFileSync(path.join(recordPath('x'), 'keep.txt'), 'held');
    const before = snapshot();

    const result = runScript(['restore', 'x.md']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /could not be removed/);
    assert.deepEqual(snapshot(), before);
  });
});

// ── scenario 11: bad input is refused ───────────────────────────────────────

describe('bad input is refused', () => {
  const cases = [
    [],
    ['frob', 'x.md'],
    ['park'],
    ['restore'],
    ['park', '../x.md'],
    ['park', 'a/x.md'],
    ['park', 'a\\x.md'],
    ['park', 'x..md'],
    ['park', 'x$y.md'],
    ['park', 'x.txt'],
    ['park', '.md'],
  ];
  for (const args of cases) {
    test(`scenario 11: [${args.join(' ')}] prints the usage text and changes nothing`, () => {
      writePlan('functional', 'x.md', planText());
      writeRecord('x');
      const before = snapshot();

      const result = runScript(args);

      assert.equal(result.code, 1);
      assert.match(result.stderr, /Usage:/);
      assert.match(result.stderr, new RegExp(OWNER_ONLY));
      assert.deepEqual(snapshot(), before);
    });
  }

  test('a bad file name is named in the sentence before the usage text', () => {
    const result = runScript(['park', 'x.txt']);

    assert.match(result.stderr, /"x\.txt" is not a plan file name: give the bare name, such as my-plan\.md/);
  });

  test('restore with more than one word is a usage error', () => {
    const result = runScript(['restore', 'x.md', 'implementation', 'now']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /Usage:/);
  });
});

// ── names that hold no record, a failed move, other errors ──────────────────

describe('edge cases', () => {
  test('a name the approval record cannot key holds no record: it parks and leaves the hand-made file alone', () => {
    writePlan('functional', 'x_y.md', planText());
    fs.mkdirSync(path.join(root, '.ctoc', 'approvals'), { recursive: true });
    fs.writeFileSync(recordPath('x_y'), '{"hand":"made"}');

    const result = parkPlan('x_y.md', 'r', root);

    assert.equal(result.recordRemoved, false);
    assert.equal(fs.readFileSync(recordPath('x_y'), 'utf8'), '{"hand":"made"}');
    assert.equal(residency.classifyResidency(planPath('backlog', 'x_y.md'), 'implementation', root).reason, 'ledger-unkeyable');
  });

  test('a move that fails after the record was removed puts the text back and says so', () => {
    const original = planText(fixtureLines(['blocked: "outside"']));
    writePlan('functional', 'x.md', original);
    writeRecord('x');
    fs.writeFileSync(path.join(root, 'plans', 'backlog'), 'a file where the folder should be');

    assertRefusal(() => parkPlan('x.md', 'r', root), 'BACKLOG_REFUSED',
      /x\.md could not be moved to plans\/backlog\/ \(\w+\)\. Its text was put back as it was\./,
      /Its approval record had already been removed\./);
    assert.equal(fs.readFileSync(planPath('functional', 'x.md'), 'utf8'), original);
    assert.ok(!fs.existsSync(recordPath('x')));
  });

  test('a move that fails for a plan with no record does not mention a record', () => {
    const original = planText(fixtureLines(['backlog_reason: "r"']));
    writePlan('backlog', 'x.md', original);
    fs.rmSync(path.join(root, 'plans', 'functional'), { recursive: true });
    fs.writeFileSync(path.join(root, 'plans', 'functional'), 'a file where the folder should be');

    assert.throws(() => restorePlan('x.md', root), (err) => {
      assert.equal(err.code, 'BACKLOG_REFUSED');
      assert.match(err.message, /could not be moved to plans\/functional\//);
      assert.match(err.message, /put back/);
      assert.doesNotMatch(err.message, /had already been removed/);
      assert.match(err.message, /No approval record was removed\./);
      return true;
    });
    assert.equal(fs.readFileSync(planPath('backlog', 'x.md'), 'utf8'), original);
  });

  test('a bad project folder and a bad file name are refused with their own codes', () => {
    assertRefusal(() => parkPlan('x.md', '', ''), 'BACKLOG_REFUSED', /The project folder was not given, so nothing was changed\./);
    assertRefusal(() => parkPlan('x.md', '', undefined), 'BACKLOG_REFUSED');
    assertRefusal(() => restorePlan('x.md', 42), 'BACKLOG_REFUSED');
    assertRefusal(() => parkPlan(undefined, '', root), 'BACKLOG_BAD_NAME');
    assertRefusal(() => restorePlan('..md', root), 'BACKLOG_BAD_NAME');
  });

  test('any other error is reported as Could not park, with its message', () => {
    fs.mkdirSync(planPath('functional', 'x.md'));

    const result = runScript(['park', 'x.md']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /^Could not park x\.md: /);
  });

  test('any other error on restore is reported as Could not restore', () => {
    fs.mkdirSync(planPath('backlog', 'x.md'), { recursive: true });

    const result = runScript(['restore', 'x.md']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /^Could not restore x\.md: /);
  });
});

// ── fix round 1, item 1: a failed write ─────────────────────────────────────

describe('a failed write puts the text back and says what changed', () => {
  /**
   * A write seam that does what `steps` says on each call, then writes for real: 'throw' fails, 'cut' cuts the
   * file short and then fails (a full disk), anything else writes for real.
   */
  function writeSeam(...steps) {
    const calls = [];
    const writeFile = (file, data) => {
      const step = steps[calls.length] || 'real';
      calls.push(step);
      if (step === 'real') {
        fs.writeFileSync(file, data);
        return;
      }
      if (step === 'cut') fs.writeFileSync(file, 'cut short');
      throw Object.assign(new Error('no space left on device'), { code: 'ENOSPC' });
    };
    return { writeFile, calls };
  }

  test('a write that throws: the plan is put back, stays in functional/, and the removed record is reported', () => {
    const original = planText();
    writePlan('functional', 'x.md', original);
    writeRecord('x');
    const seam = writeSeam('throw');

    assertRefusal(() => parkPlan('x.md', 'r', root, { writeFile: seam.writeFile }), 'BACKLOG_REFUSED',
      /x\.md could not be written \(ENOSPC\), so it was not moved and it is still in plans\/functional\/\./,
      /Its approval record had already been removed\./,
      /Its text is as it was\./);
    assert.deepEqual(seam.calls, ['throw', 'real']);
    assert.equal(fs.readFileSync(planPath('functional', 'x.md'), 'utf8'), original);
    assert.ok(!fs.existsSync(planPath('backlog', 'x.md')));
    assert.ok(!fs.existsSync(recordPath('x')));
  });

  test('a write that cuts the file short and then throws: the original bytes are written back', () => {
    const original = planText();
    writePlan('functional', 'x.md', original);
    const seam = writeSeam('cut');

    assertRefusal(() => parkPlan('x.md', 'r', root, { writeFile: seam.writeFile }), 'BACKLOG_REFUSED',
      /Its text is as it was\./, /No approval record was removed\./);
    assert.equal(fs.readFileSync(planPath('functional', 'x.md'), 'utf8'), original);
  });

  test('a put-back that also fails is reported, with the file left as the disk has it', () => {
    writePlan('functional', 'x.md', planText());
    writeRecord('x');
    const seam = writeSeam('cut', 'throw');

    assertRefusal(() => parkPlan('x.md', 'r', root, { writeFile: seam.writeFile }), 'BACKLOG_REFUSED',
      /could not be written \(ENOSPC\)/,
      /Its text could not be put back \(ENOSPC\), so check plans\/functional\/x\.md in version control\./,
      /Its approval record had already been removed\./);
    assert.equal(fs.readFileSync(planPath('functional', 'x.md'), 'utf8'), 'cut short');
    assert.ok(!fs.existsSync(planPath('backlog', 'x.md')));
  });

  test('a failed move whose put-back also fails is reported the same way', () => {
    writePlan('functional', 'x.md', planText());
    fs.writeFileSync(path.join(root, 'plans', 'backlog'), 'a file where the folder should be');
    const seam = writeSeam('real', 'throw');

    assertRefusal(() => parkPlan('x.md', 'r', root, { writeFile: seam.writeFile }), 'BACKLOG_REFUSED',
      /x\.md could not be moved to plans\/backlog\/ \(\w+\)\./,
      /Its text could not be put back \(ENOSPC\), so check plans\/functional\/x\.md in version control\./,
      /No approval record was removed\./);
    assert.match(fs.readFileSync(planPath('functional', 'x.md'), 'utf8'), /^status: backlog$/m);
  });

  test('restore reports a failed write the same way', () => {
    const original = planText(fixtureLines(['backlog_reason: "r"']));
    writePlan('backlog', 'x.md', original);
    const seam = writeSeam('throw');

    assertRefusal(() => restorePlan('x.md', root, { writeFile: seam.writeFile }), 'BACKLOG_REFUSED',
      /still in plans\/backlog\//, /Its text is as it was\./);
    assert.equal(fs.readFileSync(planPath('backlog', 'x.md'), 'utf8'), original);
  });
});

// ── fix round 1, item 2: a note written as an unindented list ───────────────

describe('a list note under a key with an empty value', () => {
  const { parseMetadata } = require('../src/lib/state');

  test('an unindented list joins the reason, none is left behind, and the files list before it is untouched', () => {
    writePlan('functional', 'x.md', planText(fixtureLines([
      'files:', '- src/a.js', 'blocked:', '- DNA is not taking new accounts', '- until further notice',
    ])));

    const result = parkPlan('x.md', 'no account', root);

    assert.equal(result.reason, 'no account; DNA is not taking new accounts; until further notice');
    const parked = fs.readFileSync(planPath('backlog', 'x.md'), 'utf8');
    const lines = frontLines(parked);
    assert.ok(!lines.some((l) => l.includes('DNA is not taking') && !l.startsWith('backlog_reason:')), 'no item is left behind');
    assert.ok(!lines.includes('blocked:') && !lines.includes('- until further notice'));
    assert.deepEqual(parseMetadata(parked).files, ['src/a.js'], 'files still reads as one entry after park');

    restorePlan('x.md', root);
    const restored = fs.readFileSync(planPath('functional', 'x.md'), 'utf8');
    assert.deepEqual(parseMetadata(restored).files, ['src/a.js'], 'and after restore');
    assert.equal(afterFence(restored), BODY);
  });

  test('an indented list, quoted items and a comment inside the list read as items', () => {
    writePlan('functional', 'x.md', planText(fixtureLines([
      'parked:', '  - "first item"', '# a comment between items', '  - second item', 'priority: HIGH',
    ])));

    const result = parkPlan('x.md', '', root);

    assert.equal(result.reason, 'first item; second item');
    const lines = frontLines(fs.readFileSync(planPath('backlog', 'x.md'), 'utf8'));
    assert.ok(lines.includes('priority: HIGH'), 'the next key stays');
    assert.ok(!lines.includes('# a comment between items'), 'the comment inside the list went with it');
  });

  test('a comment after the list belongs to the next key and stays', () => {
    writePlan('functional', 'x.md', planText(fixtureLines(['blocked:', '- one', '# about priority', 'priority: HIGH'])));

    parkPlan('x.md', '', root);

    const lines = frontLines(fs.readFileSync(planPath('backlog', 'x.md'), 'utf8'));
    assert.ok(lines.includes('# about priority'));
  });

  test('a list item that wraps onto an indented line stays one item', () => {
    writePlan('functional', 'x.md', planText(fixtureLines(['blocked:', '- DNA is not', '  taking accounts', '- later'])));
    assert.equal(parkPlan('x.md', '', root).reason, 'DNA is not taking accounts; later');
  });

  test('an empty value with no list under it stays an empty note', () => {
    writePlan('functional', 'x.md', planText(fixtureLines(['blocked:', '-', 'priority: HIGH'])));
    assert.equal(parkPlan('x.md', 'only me', root).reason, 'only me');
  });
});

// ── fix round 1, item 3: the body stays byte for byte ───────────────────────

describe('the body must stay byte for byte', () => {
  const REFUSED_BODY = /The start of x\.md \(its frontmatter or the first lines of its body\) is written in a way this tool cannot keep exactly, so nothing was changed\./;

  for (const [name, body] of [
    ['a rule and a summary then another rule', '\n---\n\nSummary: one line.\n\n---\n\n# X plan\n'],
    ['one rule near the top', '\n---\n\n# X plan\n'],
  ]) {
    test(`a body that starts with ${name} is refused for park, with nothing changed`, () => {
      writePlan('functional', 'x.md', `---\n${fixtureLines().join('\n')}\n---\n${body}`);
      writeRecord('x');
      const before = snapshot();

      const result = runScript(['park', 'x.md']);

      assert.equal(result.code, 1);
      assert.match(result.stderr, REFUSED_BODY);
      assert.deepEqual(snapshot(), before);
    });
  }

  test('the same body is refused for restore, with the record kept', () => {
    writePlan('backlog', 'x.md', `---\n${fixtureLines(['backlog_reason: "r"']).join('\n')}\n---\n\n---\n\nSummary: one line.\n\n---\n\n# X plan\n`);
    writeRecord('x');
    const before = snapshot();

    assertRefusal(() => restorePlan('x.md', root), 'BACKLOG_REFUSED', REFUSED_BODY);
    assert.deepEqual(snapshot(), before);
  });

  test('a plan with no frontmatter block is refused', () => {
    writePlan('functional', 'x.md', '# just a body\n');
    const before = snapshot();

    assertRefusal(() => parkPlan('x.md', '', root), 'BACKLOG_REFUSED', REFUSED_BODY);
    assert.deepEqual(snapshot(), before);
  });

  test('a rule in the middle of an ordinary body still passes byte for byte, for park and for restore', () => {
    const body = '\n# X plan\n\nText.\n\n---\n\nMore text after a rule.\n\n---\n\nEnd\n';
    const text = `---\n${fixtureLines().join('\n')}\n---\n${body}`;
    writePlan('functional', 'x.md', text);

    parkPlan('x.md', 'r', root);
    assert.equal(afterFence(fs.readFileSync(planPath('backlog', 'x.md'), 'utf8')), body);
    restorePlan('x.md', root);
    assert.equal(afterFence(fs.readFileSync(planPath('functional', 'x.md'), 'utf8')), body);
  });

  test('a plan saved with Windows line endings passes, and its body keeps its carriage returns', () => {
    const body = '\r\n# X plan\r\n\r\nText.\r\n';
    writePlan('functional', 'x.md', `---\r\n${fixtureLines().join('\r\n')}\r\n---\r\n${body}`);

    parkPlan('x.md', 'r', root);

    const parked = fs.readFileSync(planPath('backlog', 'x.md'), 'utf8');
    assert.equal(parked.slice(parked.indexOf('\n---\n', 4) + 5), body);
  });
});

// ── fix round 1, item 5: symbolic links fail closed ─────────────────────────

describe('a symbolic link is refused, with nothing changed', () => {
  /** A real link, or a loud failure: this machine must be able to make one for these tests to mean anything. */
  function makeLink(target, linkPath, type) {
    try {
      fs.symlinkSync(target, linkPath, type);
    } catch (err) {
      assert.fail(`These tests need a symbolic link and this machine refused to create one (${err.code}): ${err.message}`);
    }
  }
  const FOLDER_LINK = process.platform === 'win32' ? 'junction' : 'dir';

  test('the plan file itself is a link', () => {
    const real = path.join(root, 'real-plan.md');
    fs.writeFileSync(real, planText());
    makeLink(real, planPath('functional', 'x.md'), 'file');
    writeRecord('x');
    const before = snapshot();

    const result = runScript(['park', 'x.md']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /plans\/functional\/x\.md is a symbolic link, so nothing was changed\./);
    assert.deepEqual(snapshot(), before);
    assert.equal(fs.readFileSync(real, 'utf8'), planText());
  });

  test('plans/backlog is a link', () => {
    const elsewhere = path.join(root, 'elsewhere');
    fs.mkdirSync(elsewhere);
    makeLink(elsewhere, path.join(root, 'plans', 'backlog'), FOLDER_LINK);
    writePlan('functional', 'x.md', planText());
    writeRecord('x');
    const before = snapshot();

    assertRefusal(() => parkPlan('x.md', 'r', root), 'BACKLOG_REFUSED', /plans\/backlog is a symbolic link/);
    assert.deepEqual(snapshot(), before);
    assert.deepEqual(fs.readdirSync(elsewhere), []);
  });

  test('plans/functional is a link, for restore', () => {
    const elsewhere = path.join(root, 'elsewhere');
    fs.mkdirSync(elsewhere);
    fs.rmSync(path.join(root, 'plans', 'functional'), { recursive: true });
    makeLink(elsewhere, path.join(root, 'plans', 'functional'), FOLDER_LINK);
    writePlan('backlog', 'x.md', planText(fixtureLines(['backlog_reason: "r"'])));
    const before = snapshot();

    assertRefusal(() => restorePlan('x.md', root), 'BACKLOG_REFUSED', /plans\/functional is a symbolic link/);
    assert.deepEqual(snapshot(), before);
  });

  test('a linked stage folder holding a same-name plan: refused, and that plan\'s record survives', () => {
    const behind = path.join(root, 'behind-the-link');
    fs.mkdirSync(behind);
    fs.writeFileSync(path.join(behind, 'x.md'), planText());
    makeLink(behind, path.join(root, 'plans', 'archive'), FOLDER_LINK);
    writePlan('functional', 'x.md', planText());
    writeRecord('x');
    const before = snapshot();

    const result = runScript(['park', 'x.md']);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /plans\/archive is a symbolic link, so this tool cannot see whether a plan with the same name sits behind it\. Nothing was changed\./);
    assert.deepEqual(snapshot(), before);
    assert.ok(fs.existsSync(recordPath('x')), 'the record survives');
  });
});

// ── fix round 1, item 6: the length limit ───────────────────────────────────

describe('the reason has a length limit and is never cut', () => {
  test('2000 characters are written whole', () => {
    writePlan('functional', 'x.md', planText());

    const result = parkPlan('x.md', 'a'.repeat(2000), root);

    assert.equal(result.reason.length, 2000);
    assert.ok(frontLines(fs.readFileSync(planPath('backlog', 'x.md'), 'utf8')).includes(`backlog_reason: "${'a'.repeat(2000)}"`));
  });

  test('2001 characters are refused with the limit and the length found, and nothing changes', () => {
    writePlan('functional', 'x.md', planText());
    writeRecord('x');
    const before = snapshot();

    const result = runScript(['park', 'x.md', 'a'.repeat(2001)]);

    assert.equal(result.code, 1);
    assert.match(result.stderr, /The reason would be 2001 characters long, and the longest this tool writes is 2000, so nothing was changed\./);
    assert.deepEqual(snapshot(), before);
  });

  test('the notes count toward the limit', () => {
    writePlan('functional', 'x.md', planText(fixtureLines(['parked: "bbbbbb"'])));

    assertRefusal(() => parkPlan('x.md', 'a'.repeat(1995), root), 'BACKLOG_REFUSED', /would be 2003 characters long/);
  });
});

// ── fix round 1, item 7: separators and direction controls ──────────────────

describe('line separators and direction controls never reach the file', () => {
  const HIDDEN = /[\u2028\u2029\u202a-\u202e\u2066-\u2069]/;

  test('a reason that tries to start a new frontmatter line stays one quoted line', () => {
    writePlan('functional', 'x.md', planText());

    const result = parkPlan('x.md', 'x\u2028approved_by: human\u2029y\u202ez\u2066w\u2069v', root);

    const parked = fs.readFileSync(planPath('backlog', 'x.md'), 'utf8');
    assert.doesNotMatch(parked, HIDDEN);
    assert.ok(!frontLines(parked).some((l) => l.startsWith('approved_by:')), 'no approved_by line');
    assert.equal(result.reason, 'x approved_by: human y z w v');
    assert.ok(frontLines(parked).includes('backlog_reason: "x approved_by: human y z w v"'));
  });

  test('a note that holds a separator is cleaned too, and so is a file name in a refusal', () => {
    writePlan('functional', 'x.md', planText(fixtureLines(['parked: "one\u2028two"'])));
    assert.equal(parkPlan('x.md', '', root).reason, 'one two');
    assertRefusal(() => parkPlan('bad\u2028name.md', '', root), 'BACKLOG_BAD_NAME', /^"bad name\.md" is not a plan file name/);
  });
});
