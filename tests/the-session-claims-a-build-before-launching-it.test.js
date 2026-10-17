/**
 * The session's instructions say the build order of slices 2-4: a build is claimed by
 * `menu task start <id>` BEFORE its agent is launched, the agent is briefed with the plan in the
 * build, then stamped; the continuation claims no build; a requested stop offers none.
 *
 * Plan: four-defects-in-the-menu-and-the-release-found-on-2026-10-11-s5-the-session-claims-a-build-before-launching-it.
 * Exact presence/absence checks of instruction text (exact strings are the one legitimate use of
 * text search), each on text with every run of whitespace collapsed to one space so line wrapping
 * never decides a result, plus one run of the real menu command. Raw fs/os are permitted in tests/**.
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MENU = path.join(ROOT, 'src', 'commands', 'start.js');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const collapse = (s) => s.replace(/\s+/g, ' ');
/** Code comments: drop the leading `//` or ` * ` markers, then collapse. */
const collapseComments = (s) => collapse(s.replace(/^\s*(?:\/\/|\*)\s?/gm, ' '));

/** Slice a section from its own heading to the next ##/### heading (menu-protocol's method). */
function sectionBody(md, headingRe) {
  const m = headingRe.exec(md);
  assert.ok(m, `heading not found: ${headingRe}`);
  const bodyStart = m.index + m[0].length;
  const nm = /\n#{2,3} /.exec(md.slice(bodyStart));
  return md.slice(m.index, nm ? bodyStart + nm.index : md.length);
}

const STAMP_REFUSED = 'If the stamp answers `reason: "agent-recorded"`, the task records another agent: say so in one line, stop the agent you just launched before it edits anything, and leave the build to the recorded agent. Any other refused stamp: show its text and leave the agent running.';
/** The refusal and resume sentences both recipes carry; `id` is the task-id spelling of that recipe. */
const recipePins = (id) => [
  'Never pass --force on a claim unless the owner says so in the current conversation.',
  'An `ok` claim with no `planPath`: launch no agent, say so in one line, and run `menu task fail ' + id + " --summary '<slug> claim returned no plan path'`",
  'menu task fail ' + id + " --summary '<slug> build agent launch refused' (<slug> is the file name in the returned `planPath` without `.md`, never the plan's title)",
  'the plan stays in plans/in-progress/, and `menu task add implement <slug> --touches <files>` then, on `run`, the build order above (claim, launch on `ok`, stamp) resumes it',
  STAMP_REFUSED,
];

describe('the session instructions say what the continuation and the stop do', () => {
  it('1. no retired sentence is left, and the code comments agree', () => {
    const md = collapse(read('src', 'commands', 'start.md'));
    for (const old of [
      'approved plans start building',
      'builds the menu already claimed',
      'builds the continuation started',
      'A claimed build is already running with no agent id',
      'A refused claim launches no agent',
      '<the plan> build agent launch refused',
      'If the stamp is refused, the task records',
      '`menu task start <new id>` resumes it',
    ]) {
      assert.ok(!md.includes(old), `start.md still says: ${old}`);
    }

    const screens = read('src', 'lib', 'menu-screens.js');
    const at = screens.indexOf('function continueAfterCrossing');
    assert.ok(at > 0, 'continueAfterCrossing exists');
    const header = collapse(screens.slice(screens.lastIndexOf('/**', at), at));
    assert.ok(!header.includes('startAgent'), 'the continuation header does not name startAgent');
    assert.ok(!header.includes('claimed'), 'the continuation header does not say it claimed anything');

    const stampAt = screens.indexOf("if (kind === 'start' && task.status === 'running'");
    assert.ok(stampAt > 0, 'the stamp branch exists');
    const stampComment = collapse(screens.slice(screens.lastIndexOf('\n\n', stampAt), stampAt));
    assert.ok(stampComment.includes('--agent-id'), 'the comment above the stamp branch is the stamp comment');
    assert.ok(!stampComment.includes('continueAfterCrossing'), 'the stamp comment does not name the continuation');

    // Slice 4 worded the stop as "no list offers a new build"; this is the wording that is in the code.
    const registry = read('src', 'lib', 'task-registry.js');
    const drainAt = registry.indexOf('function requestDrainStop');
    const drain = collapseComments(registry.slice(registry.lastIndexOf('/**', drainAt), drainAt));
    assert.ok(drain.includes('no list offers a new build'), 'the stop comment says no list offers a new build');
    assert.ok(!drain.includes('nothing new starts'), 'the stop comment does not say nothing new starts');

    const gate = collapseComments(read('src', 'lib', 'streaming-gate.js'));
    assert.ok(!gate.includes('starts approved builds'), 'streaming-gate does not say it starts approved builds');
    assert.ok(!gate.includes('(a planner, a classification, a build)'), 'streaming-gate does not say it started a build');
    assert.ok(gate.includes('(a planner, a classification, at most one build for the session to claim)'));
    assert.ok(gate.includes('queues a planner, a classification or at most one build (never claimed here)'));
  });

  it('2. start.md says the build recipe: claim first, launch on ok, stamp, no build while a stop is requested', () => {
    const raw = read('src', 'commands', 'start.md');
    const completion = collapse(sectionBody(raw, /^### COMPLETION \(turn recipe\)/m));
    for (const text of [
      'a build (`implement` naming a plan) is claimed FIRST',
      'Only when that answers `ok` launch',
      '`plans/in-progress/<slug>.md`',
      '--agent-id <the harness agent id>',
      'A claim that does not answer `ok` launches no agent: show its text. After a scheduler refusal the task stays queued and comes back in a later `promote[]`',
      'on `build-start-busy` run the same `menu task start <id>` once more, as its text says',
      'Never pass --force on a claim unless the owner says so in the current conversation.',
      ...recipePins('<id>'),
      'While a stop is requested (Stop agent writes `.ctoc/state/drain-stop`), no `promote[]` list offers a build',
      'planners, classifications, question precomputes, reviews, quality and security checks and syncs stay on offer — every kind except a build.',
      'at most one approved build is queued per pass, and every queued build the scheduler allows is offered in `promote[]`, none while a stop is requested — the continuation claims and starts no build itself',
      '`menu task complete <id> --continue`, `menu task fail <id>` and `menu task cancel <id>` keep the work moving and can return `promote[]` too',
      'What stops a double launch is the CLAIM: a second claim of a running build does not answer `ok`',
      STAMP_REFUSED,
      "none (Start agent's claim) or the task's own id (the placeholder `menu task start <id>` records); the id already recorded is accepted again without a write; any other recorded agent id is refused",
    ]) {
      assert.ok(completion.includes(text), `the COMPLETION section lacks: ${text}`);
    }

    const step3 = collapse(raw.split('\n').find((l) => l.includes('**Promote.**')) || '');
    assert.ok(step3.length > 0, 'the promote step exists');
    const claimAt = step3.indexOf('claimed FIRST');
    const launchAt = step3.indexOf('launch `Agent(run_in_background)`');
    assert.ok(claimAt >= 0 && launchAt >= 0 && claimAt < launchAt, 'step 3 claims before it launches');
    assert.ok(step3.indexOf('--agent-id', launchAt) > launchAt, 'step 3 stamps the agent after it launches it');
    assert.ok(step3.includes('Any other task: launch `Agent(run_in_background)` + `menu task start <id>`'),
      'step 3 keeps the plain recipe for every other task');

    const work = collapse(sectionBody(raw, /^### WORK dispatch \(turn recipe\)/m));
    for (const text of [
      'If `decision === "run"` and the task is not a build (a build\'s order is at the end of this step): launch',
      'a build (`implement` naming a plan) is the exception: `menu task start <taskId>` comes FIRST',
      ...recipePins('<taskId>'),
    ]) {
      assert.ok(work.includes(text), `the WORK dispatch recipe lacks: ${text}`);
    }

    // Each rule is sliced on its own (menu-protocol's ruleBody), so a phrase counts only in its own rule.
    const rule = (re) => {
      const m = re.exec(raw);
      assert.ok(m, `rule not found: ${re}`);
      const after = raw.slice(m.index + m[0].length);
      const nm = /\n\d+\.\s/.exec(after);
      return collapse(raw.slice(m.index, nm ? m.index + m[0].length + nm.index : raw.length));
    };
    const rule12 = rule(/^12\.\s+\*\*WORK dispatch is record-first/m);
    assert.ok(rule12.includes('(a build: `menu task start` first, then its agent, then the stamp)'), 'Rule 12 names the build order');
    const rule13 = rule(/^13\.\s+\*\*Completions pull/m);
    for (const text of [
      'claiming a build with `menu task start <id>` before its agent is launched',
      "(the scheduler's `nextRunnable` set — every queued task it now allows, among them the planners and classifications the continuation queued and queued builds the scheduler allows, no build while a stop is requested)",
    ]) {
      assert.ok(rule13.includes(text), `Rule 13 lacks: ${text}`);
    }

    const cancel = collapse(raw.slice(raw.indexOf('A selected board row can be **cancelled**')));
    assert.ok(cancel.includes('run `menu task cancel <taskId>` → `{ taskId, status, cancelled, promote[] }`'), 'the cancel recipe names the real route');
    assert.ok(cancel.includes('To stop the live harness agent, use the agent id you stamped on that task with `--agent-id`'),
      'the cancel recipe stops the agent by the id the session stamped');
    assert.ok(!cancel.includes('cancelTask(root') && !cancel.includes('agentTaskId'), 'the cancel recipe names no registry function or field');
    assert.ok(cancel.includes('handle the `promote[]` the cancel returns, each entry as COMPLETION step 3 does'),
      'the cancel paragraph sends the promote list to the COMPLETION recipe');
  });

  it('3. a promoted build is claimed before its agent exists, and its brief names the plan in the build', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-session-claim-'));
    try {
      for (const d of ['todo', 'in-progress', 'review', 'done', 'implementation', 'functional']) {
        fs.mkdirSync(path.join(dir, 'plans', d), { recursive: true });
      }
      fs.mkdirSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
      const steps = ['8: TEST', '9: PREPARE', '10: IMPLEMENT', '11: REVIEW', '12: OPTIMIZE',
        '13: SECURE', '14: VERIFY', '15: DOCUMENT', '16: FINAL-REVIEW']
        .map((s) => `### Step ${s}\n- [x] done\n`).join('\n');
      fs.writeFileSync(path.join(dir, 'plans', 'todo', 'delta.md'),
        '---\napproved_by: human\ngate_crossed: implementation → todo\n---\n\n' +
        '---\ntitle: "delta"\ntype: implementation\niron_loop: true\nfiles:\n  - "src/delta.js"\n---\n\n' +
        `# delta\n\n## Execution Plan (Steps 8-16)\n\n${steps}\n`);
      const menu = (...args) => JSON.parse(execFileSync(process.execPath, [MENU, ...args], {
        cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      }));
      const added = menu('menu', 'task', 'add', 'implement', 'delta', '--touches', 'src/delta.js');
      assert.equal(added.ok, true, JSON.stringify(added));
      assert.equal(added.taskId, 't1');
      assert.ok(fs.existsSync(path.join(dir, 'plans', 'todo', 'delta.md')), 'before the claim the plan is in todo/');

      const claimed = menu('menu', 'task', 'start', 't1');
      assert.equal(claimed.ok, true, JSON.stringify(claimed));
      assert.equal(claimed.planPath, 'plans/in-progress/delta.md');
      assert.ok(fs.existsSync(path.join(dir, claimed.planPath)), 'the plan the brief names exists the moment the claim answers ok');
      assert.ok(!fs.existsSync(path.join(dir, 'plans', 'todo', 'delta.md')), 'the plan has left todo/');

      const stamped = menu('menu', 'task', 'start', 't1', '--agent-id', 'agent-xyz');
      assert.equal(stamped.ok, true, JSON.stringify(stamped));
      assert.equal(stamped.stamped, true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
