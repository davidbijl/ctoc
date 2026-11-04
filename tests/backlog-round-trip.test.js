'use strict';

/**
 * Round trip: a parked plan as CTOC's own readers see it, a restored plan as the moving-on pass sees it,
 * and the real command run as a child process.
 *
 * Real temporary projects, real plan files, real question and answer files written through CTOC's own
 * writers (writePlanQuestions, streamAnswer). Nothing in the backlog, the gate or the readers is replaced.
 * The one thing scenario 6 adds is a same-name placeholder in plans/implementation/ for each plan while it
 * is answered: streamAnswer runs the moving-on pass itself, and a move onto an existing file is refused
 * (streaming-gate crossingBlocked), which keeps both plans in functional/ until the placeholders are removed.
 * No product code is replaced.
 */

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ledger = require('../src/lib/approval-ledger');
const residency = require('../src/lib/approval-residency');
const inbox = require('../src/lib/inbox');
const state = require('../src/lib/state');
const staleDetector = require('../src/lib/stale-detector');
const streamingGate = require('../src/lib/streaming-gate');
const precompute = require('../src/lib/streaming-precompute');
const { approvedFreeQueue } = require('../src/lib/continuation-queue');
const { parkPlan, restorePlan } = require('../src/lib/backlog');

const SCRIPT = path.join(__dirname, '..', 'src', 'scripts', 'backlog.js');
const STAGES = ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done'];
const DAY_MS = 24 * 60 * 60 * 1000;
const CLASSIFIED = Object.freeze({ by: 'gate-critic', at: 1786000000000 });

const roots = [];

function makeRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-backlog-rt-'));
  fs.mkdirSync(path.join(dir, '.ctoc'), { recursive: true });
  for (const stage of STAGES) fs.mkdirSync(path.join(dir, 'plans', stage), { recursive: true });
  roots.push(dir);
  return dir;
}

afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop(), { recursive: true, force: true });
});

/** A functional plan that passes the functional-plan validator. */
function validFunctionalBody(extraFront = []) {
  return `---\ntitle: X plan\n${extraFront.map((l) => `${l}\n`).join('')}---\n\n# X plan\n\n`
    + '## Problem Statement\nThe thing is broken.\n\n## Acceptance Criteria\n- [ ] the thing works\n\n## Scope\nThe module.\n';
}

function writePlan(root, folder, name, text) {
  fs.mkdirSync(path.join(root, 'plans', folder), { recursive: true });
  fs.writeFileSync(path.join(root, 'plans', folder, name), text);
  return path.join(root, 'plans', folder, name);
}

function writeRecord(root, slug) {
  ledger.writeEntry(slug, {
    content_sha256: 'a'.repeat(64), stage_from: 'functional', stage_to: 'implementation', approved_by: 'human',
  }, root);
}

/** A critical question: an open one is a real fork; an answered one lets the plan count as sufficient. */
function fork() {
  return {
    id: 'q10-db',
    prompt: 'Which q10-db?',
    critical: true,
    important: false,
    topic: 'technology-stack',
    options: [
      { key: '1', label: 'Postgres', recommended: true, pros: 'Relational.', cons: 'Ops cost.' },
      { key: '2', label: 'SQLite', pros: 'Zero ops.', cons: 'Single writer.' },
    ],
  };
}

function refsOf(descriptors) {
  return descriptors.map((d) => d.ref);
}

// ── scenario 4: out of the decision lists ───────────────────────────────────

describe('a parked plan is in no decision list', () => {
  test('scenario 4: the lists name it before it is parked and omit it afterwards', () => {
    const root = makeRoot();
    writePlan(root, 'functional', 'x.md', validFunctionalBody());
    // An approved plan in todo/ that approvedFreeQueue DOES list: the queue reads only todo/ and in-progress/,
    // so a functional plan can never be in it, and "x is absent" alone could not fail. This one makes the
    // queue part of the claim real: it must be listed before the park and after it (a park that removed
    // the wrong approval record would lose it), and the parked plan must not be listed.
    const readyBody = '---\ntitle: "Ready"\niron_loop: true\ndepends_on: none\nfiles:\n  - "src/lib/ready.js"\n---\n\n# Ready\n\n## Implementation\nBody.\n';
    const readyPath = writePlan(root, 'todo', 'ready.md', readyBody);
    ledger.writeEntry(ledger.slugFromPlanPath(readyPath), {
      content: readyBody, stage_from: 'implementation', stage_to: 'todo', approved_by: 'human',
    }, root);
    const later = Date.now() + 30 * DAY_MS;
    assert.deepEqual(approvedFreeQueue(root).refs, ['todo/ready.md'], 'the queue lists the approved todo plan before the park');

    assert.ok(refsOf(streamingGate.pendingGateDecisions(root)).includes('functional/x.md'));
    assert.ok(refsOf(precompute.plansNeedingQuestions(root)).includes('functional/x.md'));
    assert.ok(staleDetector.scanCheapCandidates(root, { nowMs: later }).candidates.some((c) => c.plan === 'x'));
    assert.ok(inbox.listPlansAtGates(root).some((p) => p.plan === 'x' && p.stage === 'functional'));
    assert.equal(state.getPlanCounts(root).functional, 1);

    parkPlan('x.md', 'waiting', root);

    assert.deepEqual(refsOf(streamingGate.pendingGateDecisions(root)), []);
    assert.deepEqual(refsOf(precompute.plansNeedingQuestions(root)), []);
    assert.ok(!staleDetector.scanCheapCandidates(root, { nowMs: later }).candidates.some((c) => c.plan === 'x'));
    assert.ok(!inbox.listPlansAtGates(root).some((p) => p.plan === 'x'));
    assert.deepEqual(approvedFreeQueue(root).refs, ['todo/ready.md'], 'the queue still lists the approved todo plan, and not the parked one');
    const counts = state.getPlanCounts(root);
    assert.equal(counts.functional, 0);
    assert.deepEqual(Object.keys(counts).sort(), ['canvas', 'done', 'functional', 'implementation', 'inProgress', 'review', 'todo']);
  });
});

// ── scenario 6: no self-crossing straight after restore ─────────────────────

describe('a restored plan does not move on by itself because of its old answers', () => {
  test('scenario 6: the restored plan stays in functional/ while its twin, never parked, moves on', () => {
    const root = makeRoot();
    const hourAgo = (Date.now() - 60 * 60 * 1000) / 1000;
    const body = validFunctionalBody();
    const names = ['first', 'second'];

    for (const name of names) {
      const planPath = writePlan(root, 'functional', `${name}.md`, body);
      fs.utimesSync(planPath, hourAgo, hourAgo);
      const ref = `functional/${name}.md`;
      const written = precompute.writePlanQuestions(root, ref, [fork()], fs.statSync(planPath).mtimeMs, undefined, CLASSIFIED);
      assert.deepEqual(written, { ok: true });
      // The placeholder keeps the plan in functional/ while it is answered (see the header).
      writePlan(root, 'implementation', `${name}.md`, 'placeholder\n');
      streamingGate.streamAnswer(ref, 'q10-db', '1', root, precompute.questionDigest(fork()));
    }

    const answered = streamingGate.pendingGateDecisions(root);
    for (const name of names) {
      assert.ok(fs.existsSync(path.join(root, 'plans', 'functional', `${name}.md`)), `${name} is still in functional/`);
      const descriptor = answered.find((d) => d.ref === `functional/${name}.md`);
      assert.equal(descriptor.enough, true, `${name} has enough information`);
    }
    for (const name of names) fs.rmSync(path.join(root, 'plans', 'implementation', `${name}.md`));

    parkPlan('first.md', 'waiting', root);
    restorePlan('first.md', root);
    const crossed = [];
    const after = streamingGate.pendingGateDecisions(root, { crossed });

    assert.ok(fs.existsSync(path.join(root, 'plans', 'functional', 'first.md')), 'the restored plan stays');
    assert.equal(after.find((d) => d.ref === 'functional/first.md').sufficiencyReason, 'stale');
    assert.ok(!fs.existsSync(path.join(root, '.ctoc', 'approvals', 'first.json')));
    assert.ok(fs.existsSync(path.join(root, 'plans', 'implementation', 'second.md')), 'the twin moved on');
    assert.deepEqual(crossed.map((c) => c.ref), ['implementation/second.md']);
    const record = JSON.parse(fs.readFileSync(path.join(root, '.ctoc', 'approvals', 'second.json'), 'utf8'));
    assert.equal(record.advanced_by, 'sufficiency');
  });
});

// ── scenario 13: the real command, end to end ───────────────────────────────

describe('the real command', () => {
  function run(root, args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: 'utf8', timeout: 120000 });
  }

  test('scenario 13: park then restore as a child process, each printing its confirmation', () => {
    const root = makeRoot();
    const original = validFunctionalBody(['status: approved', 'approved_by: human', 'gate_1_approved: "2026-08-26 (owner)"']);
    writePlan(root, 'functional', 'x.md', original);
    writeRecord(root, 'x');

    const parked = run(root, ['park', 'x.md', 'waiting']);

    assert.equal(parked.status, 0, parked.stderr);
    assert.match(parked.stdout, /^Parked x\.md: it is now plans\/backlog\/x\.md, and no decision list shows it\./);
    assert.match(parked.stdout, /Reason recorded: waiting/);
    const backlogText = fs.readFileSync(path.join(root, 'plans', 'backlog', 'x.md'), 'utf8');
    assert.match(backlogText, /^status: backlog$/m);
    assert.match(backlogText, /^backlog_reason: "waiting"$/m);
    assert.doesNotMatch(backlogText, /^approved_by:/m);
    assert.ok(!fs.existsSync(path.join(root, 'plans', 'functional', 'x.md')));
    assert.ok(!fs.existsSync(path.join(root, '.ctoc', 'approvals', 'x.json')));
    assert.equal(backlogText.slice(backlogText.indexOf('\n---\n', 4)), original.slice(original.indexOf('\n---\n', 4)));

    const restored = run(root, ['restore', 'x.md']);

    assert.equal(restored.status, 0, restored.stderr);
    assert.match(restored.stdout, /^Restored x\.md to plans\/functional\/x\.md as an unapproved draft/);
    const functionalText = fs.readFileSync(path.join(root, 'plans', 'functional', 'x.md'), 'utf8');
    assert.match(functionalText, /^status: draft$/m);
    assert.doesNotMatch(functionalText, /^(backlog_reason|gate_1_approved|approved_by):/m);
    assert.ok(!fs.existsSync(path.join(root, 'plans', 'backlog', 'x.md')));
    assert.equal(
      residency.classifyResidency(path.join(root, 'plans', 'functional', 'x.md'), 'implementation', root).accepted,
      false,
    );
  });

  test('a refusal reaches the owner on standard error with exit code 1', () => {
    const root = makeRoot();

    const refused = run(root, ['park', 'missing.md']);

    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /There is no plans\/functional\/missing\.md, so nothing was changed\./);
    assert.equal(refused.stdout, '');
  });
});
