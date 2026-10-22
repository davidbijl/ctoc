'use strict';

/**
 * THE COUNT-MOVER DECLARATION FENCE — a plan that will CREATE a documented-count
 * artifact must declare CLAUDE.md, so the build that moves the count can update it.
 *
 * A CLAUDE.md documented count (test files, src/lib modules, hooks, tabs, agents,
 * skills) rises when a build CREATES a file in one of those classes. CLAUDE.md is
 * the ONE ratchet whose write the PreToolUse hook genuinely withholds (the two
 * .ctoc/ JSON baselines are already whitelisted, so a declaration there grants
 * nothing). So the mechanism has exactly one job: a plan that will create a counted
 * artifact must declare CLAUDE.md, checked at Gate 2 (implementation → todo) BEFORE
 * a build is committed to a plan it could not finish.
 *
 * THE TRIGGER IS CREATION, derived from the six counted classes: a declared path
 * that MATCHES a counted-class pattern AND does NOT yet exist on disk (will be
 * created). A path that EXISTS is a MODIFICATION and is silent (no-cry-wolf). A
 * glob names no specific new file and is silent (blind spot 4).
 *
 * THE STATIC "CLEAN QUEUE" AUDIT IS SCOPED TO POST-GATE-2 STAGES (todo, review,
 * done) PER THE HUMAN'S RULING. implementation/ is PRE-approval — its declared
 * files are legitimately absent (the same reasoning as stale-detector's
 * NOT_STARTED_STAGES), and those plans are caught at the Gate-2 crossing, not
 * flagged in a static audit. And an UNBUILT plan whose declared count-artifact is
 * simply not-yet-created is NOT a static offender: the offense is only live once
 * the artifact exists / the plan is being built, and the RUNTIME check at Gate 2
 * is the real teeth. So the static audit reports only GRANDFATHERED will-create
 * plans (informational) and asserts none has already MOVED its count (artifact
 * present) while still lacking CLAUDE.md.
 */

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { checkPlanDeclaresCountMovers } = require('../src/lib/documented-counts');
const { validateForQueue, validateTransition } = require('../src/lib/plan-validator');
const { extractFrontmatterRegion, parseFilesField } = require('../src/lib/stale-detector');
const { route } = require('../src/lib/menu-screens');
const gateWords = require('../src/lib/gate-words');
const ledger = require('../src/lib/approval-ledger');
const { computeDocCounts } = require('../src/lib/doc-counts');

const ROOT = path.join(__dirname, '..');

// One ABSENT representative path per counted class (random suffix so it never
// collides with a real file — the trigger is "matches a class AND is absent").
const CLASS_SAMPLES = [
  { name: 'testFiles', path: 'tests/zzz-fence-sample-901.test.js' },
  { name: 'libModules', path: 'src/lib/zzz-fence-sample-901.js' },
  { name: 'hooks', path: 'src/hooks/ZzzFenceSample901.js' },
  { name: 'tabs', path: 'src/tabs/zzz-fence-sample-901.js' },
  { name: 'agents', path: 'agents/planning/zzz-fence-sample-901.md' },
  { name: 'skills', path: 'skills/zzz-fence-sample-901/SKILL.md' },
];

function tmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-count-fence-'));
  for (const stage of ['implementation', 'todo']) {
    fs.mkdirSync(path.join(dir, 'plans', stage), { recursive: true });
  }
  return dir;
}

/**
 * Write a queue-VALID implementation-stage plan (title + Implementation section so
 * validateForQueue's other checks pass) whose frontmatter declares `files`. When
 * `prependApproval` is set, a gate-approval marker block is PREPENDED ahead of the
 * plan's own frontmatter — the exact shape a plan carries after crossing Gate 2,
 * which the single-block reader cannot see past.
 */
function writePlan(root, stage, slug, files, { prependApproval = false, dependsOn = null, parentPlan = null } = {}) {
  // `dependsOn` is a string (one `depends_on:` line, written verbatim) or an array (the
  // YAML block-list form); `parentPlan` writes `parent_plan:`. Callers that pass neither
  // get byte-identical output to before.
  let relations = '';
  if (parentPlan !== null) relations += `parent_plan: ${parentPlan}\n`;
  if (Array.isArray(dependsOn)) relations += 'depends_on:\n' + dependsOn.map((d) => `  - ${d}\n`).join('');
  else if (dependsOn !== null) relations += `depends_on: ${dependsOn}\n`;
  const fm =
    '---\n' +
    `title: "${slug}"\n` +
    'type: implementation\n' +
    relations +
    'files:\n' +
    files.map((f) => `  - "${f}"\n`).join('') +
    '---\n\n';
  const approval = prependApproval
    ? '---\napproved_by: human\napproved_at: 2026-07-20T00:00:00.000Z\ngate_crossed: implementation → todo\n---\n\n'
    : '';
  const body = `# ${slug}\n\n## Implementation Details\n\nTechnical approach for ${slug}.\n`;
  const p = path.join(root, 'plans', stage, `${slug}.md`);
  fs.writeFileSync(p, approval + fm + body);
  return p;
}

describe('count-mover declaration fence — checkPlanDeclaresCountMovers', () => {
  it('1: a new test file WITHOUT CLAUDE.md FAILS, offender named', () => {
    const res = checkPlanDeclaresCountMovers(['tests/new-thing.test.js'], ROOT);
    assert.equal(res.ok, false);
    assert.equal(res.offenders.length, 1);
    assert.equal(res.offenders[0].path, 'tests/new-thing.test.js');
    assert.equal(res.offenders[0].countClass, 'testFiles');
  });

  it('2: a new test file WITH CLAUDE.md passes', () => {
    const res = checkPlanDeclaresCountMovers(['tests/new-thing.test.js', 'CLAUDE.md'], ROOT);
    assert.equal(res.ok, true);
  });

  it('3: modifying an EXISTING test file passes (no-cry-wolf)', () => {
    // tests/doc-counts.test.js exists on disk → a MODIFICATION, not a creation.
    const res = checkPlanDeclaresCountMovers(['tests/doc-counts.test.js'], ROOT);
    assert.equal(res.ok, true);
    assert.equal(res.offenders.length, 0);
  });

  it('4: a plan declaring only plans/**.md passes (the 00078 shape)', () => {
    const res = checkPlanDeclaresCountMovers(['plans/todo/00078-scheduler.md'], ROOT);
    assert.equal(res.ok, true);
    assert.equal(res.offenders.length, 0);
  });

  it('5: each of the six counted classes triggers (table-driven)', () => {
    for (const sample of CLASS_SAMPLES) {
      const res = checkPlanDeclaresCountMovers([sample.path], ROOT);
      assert.equal(res.ok, false, `${sample.name} (${sample.path}) should trigger`);
      assert.equal(res.offenders.length, 1, `${sample.name} single offender`);
      assert.equal(res.offenders[0].countClass, sample.name, `${sample.name} class name`);
      // The offender carries the LIVE count (via computeDocCounts) so the message
      // can tell the human which documented number is about to move.
      assert.equal(typeof res.offenders[0].currentCount, 'number', `${sample.name} live count`);
    }
  });

  it('6: a gate-stamped plan\'s files are READ (multi-block reader)', () => {
    // A PREPENDED approval block sits ahead of the plan's own frontmatter. The
    // single-block reader returns [] for such a plan; validateForQueue must use the
    // multi-block reader or the fence passes everything (a false green).
    const root = tmpProject();
    try {
      const p = writePlan(root, 'implementation', '00900-stamped', ['tests/new-6.test.js'], {
        prependApproval: true,
      });
      // The declared files must be reachable through the multi-block reader.
      const declared = parseFilesField(extractFrontmatterRegion(fs.readFileSync(p, 'utf8')));
      assert.deepEqual(declared, ['tests/new-6.test.js']);
      const res = validateForQueue(p, root);
      assert.equal(res.valid, false, 'a stamped count-mover without CLAUDE.md must fail the queue gate');
      assert.ok(
        res.errors.some((e) => e.includes('tests/new-6.test.js') && e.includes('CLAUDE.md')),
        `error must name the offender and CLAUDE.md; saw: ${res.errors.join(' | ')}`
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('7: Gate 2 actually blocks (validateTransition implementation→todo)', () => {
    const root = tmpProject();
    try {
      const p = writePlan(root, 'implementation', '00901-blocks', ['src/lib/new-7.js']);
      const res = validateTransition(p, 'implementation', 'todo', root);
      assert.equal(res.valid, false);
      assert.ok(
        res.errors.some((e) => e.includes('src/lib/new-7.js')),
        `Gate 2 must block with the offender named; saw: ${res.errors.join(' | ')}`
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('7b: a stamped count-mover that DECLARES CLAUDE.md crosses Gate 2', () => {
    const root = tmpProject();
    try {
      const p = writePlan(root, 'implementation', '00902-ok', ['tests/new-7b.test.js', 'CLAUDE.md'], {
        prependApproval: true,
      });
      const res = validateTransition(p, 'implementation', 'todo', root);
      assert.equal(res.valid, true, `declaring CLAUDE.md must let the count-mover cross; saw: ${res.errors.join(' | ')}`);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('8: glob declarations are non-triggering (blind spot 4, deliberate)', () => {
    const res = checkPlanDeclaresCountMovers(['tests/**'], ROOT);
    assert.equal(res.ok, true);
    assert.equal(res.offenders.length, 0);
  });

  it('9: Windows separators normalise (tests\\x.test.js triggers identically)', () => {
    const res = checkPlanDeclaresCountMovers(['tests\\zzz-fence-win-901.test.js'], ROOT);
    assert.equal(res.ok, false);
    assert.equal(res.offenders[0].countClass, 'testFiles');
    assert.equal(res.offenders[0].path, 'tests/zzz-fence-win-901.test.js');
  });

  it('empty / non-counted declarations pass', () => {
    assert.equal(checkPlanDeclaresCountMovers([], ROOT).ok, true);
    assert.equal(checkPlanDeclaresCountMovers(['docs/README.md', 'src/scripts/x.js'], ROOT).ok, true);
  });
});

describe('10: the live queue is clean — SCOPED to POST-GATE-2 (todo, review, done)', () => {
  // Per the human's ruling: implementation/ is PRE-approval and OUT of this audit.
  const SCOPED_STAGES = ['todo', 'review', 'done'];

  function scanStage(stage) {
    const dir = path.join(ROOT, 'plans', stage);
    if (!fs.existsSync(dir)) return { scanned: 0, offenders: [] };
    const plans = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
    const offenders = [];
    for (const f of plans) {
      const declared = parseFilesField(extractFrontmatterRegion(fs.readFileSync(path.join(dir, f), 'utf8')));
      const res = checkPlanDeclaresCountMovers(declared, ROOT);
      if (!res.ok) offenders.push({ plan: `${stage}/${f}`, offenders: res.offenders });
    }
    return { scanned: plans.length, offenders };
  }

  it('the scoped stage list excludes implementation (the ruling)', () => {
    assert.deepEqual(SCOPED_STAGES, ['todo', 'review', 'done']);
    assert.ok(!SCOPED_STAGES.includes('implementation'));
  });

  it('no post-Gate-2 plan has already MOVED a count (artifact present) without CLAUDE.md', () => {
    let scanned = 0;
    const willCreate = [];
    for (const stage of SCOPED_STAGES) {
      const r = scanStage(stage);
      scanned += r.scanned;
      willCreate.push(...r.offenders);
    }
    // Non-vacuity: the audit really read the queue.
    assert.ok(scanned > 30, `expected to scan the real post-Gate-2 queue, saw ${scanned}`);

    // Every will-create offender is a GRANDFATHERED not-yet-built plan: its
    // offending artifact is ABSENT on disk. If one of these artifacts had been
    // built without the plan declaring CLAUDE.md, the count would have moved with
    // no permission to update it — the deadlock this fence exists to remove. Assert
    // none is in that live state.
    for (const entry of willCreate) {
      for (const off of entry.offenders) {
        const parts = off.path.split('/').filter((s) => s && s !== '.' && s !== '..');
        const exists = fs.existsSync(path.join(ROOT, ...parts));
        assert.equal(
          exists,
          false,
          `${entry.plan} declares count-mover ${off.path} which now EXISTS but the plan ` +
            `does not declare CLAUDE.md — it moved a documented count with no permission to update it`
        );
      }
    }
  });
});

describe('11: a slice that only edits a file an earlier slice brings into being — through the menu', () => {
  const FILE = 'tests/widget-rules.test.js';
  const LIB = 'src/lib/widget-rules.js';
  const STAGES = ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done'];
  const sandboxes = [];

  afterEach(() => {
    while (sandboxes.length) fs.rmSync(sandboxes.pop(), { recursive: true, force: true });
  });

  /** A temporary project with every stage folder and `.ctoc/state`; it holds no tests/, src/ or CLAUDE.md. */
  function menuSandbox() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-count-fence-menu-'));
    sandboxes.push(dir);
    for (const stage of STAGES) fs.mkdirSync(path.join(dir, 'plans', stage), { recursive: true });
    fs.mkdirSync(path.join(dir, '.ctoc', 'state'), { recursive: true });
    const root = fs.realpathSync(dir);
    // Non-vacuity: the counted paths the cases use are absent, so each really is a candidate creation.
    assert.equal(fs.existsSync(path.join(root, ...FILE.split('/'))), false);
    assert.equal(fs.existsSync(path.join(root, ...LIB.split('/'))), false);
    return root;
  }

  /** A plan in the build queue as an older crossing left it: approval block prepended, ledger entry written. */
  function inQueue(root, slug, files, opts) {
    const p = writePlan(root, 'todo', slug, files, { ...opts, prependApproval: true });
    ledger.writeEntry(slug, { content: fs.readFileSync(p, 'utf8'), stage_from: 'implementation', stage_to: 'todo' }, root);
    return p;
  }

  const crossLines = (text) => text.split('\n').filter((l) => l.startsWith('  ✗ '));
  const validationOf = (root, slug) => route(['validate', `implementation/${slug}.md`], root);
  const planScreenOf = (root, slug) => route(['plan', `implementation/${slug}.md`], root);
  const offersMove = (screen) =>
    screen.ask.questions[0].options.some((o) => o.label === gateWords.approveLabel('implementation'));
  const countOf = (root, kind) => computeDocCounts(root)[kind];
  const todaysRefusal = (root, p, kind) =>
    `  ✗ Plan will create "${p}" (moves the ${kind} count, currently ${countOf(root, kind)}) but ` +
    'does not declare "CLAUDE.md" in its files:. Add "CLAUDE.md" so the build can update the documented count.';
  const predecessorRefusal = (root, p, kind, ref) =>
    `  ✗ Plan only edits "${p}", which "${ref}" (a plan it depends on) will create (moves the ${kind} count, ` +
    `currently ${countOf(root, kind)}), but "${ref}" does not declare "CLAUDE.md" in its files:. ` +
    `Add "CLAUDE.md" to "${ref}" so its build can update the documented count.`;
  const naming = (screen, p) => crossLines(screen.text).filter((l) => l.includes(`"${p}"`));
  const validity = (root, slug) =>
    validateTransition(path.join(root, 'plans', 'implementation', `${slug}.md`), 'implementation', 'todo', root);

  it('11a: a slice that edits a file slice one (still in technical planning) brings into being is accepted', () => {
    const root = menuSandbox();
    writePlan(root, 'implementation', 'slice-one', [FILE, 'CLAUDE.md']);
    fs.writeFileSync(path.join(root, 'plans', 'implementation', 'slice-one.md.status'), '{}\n');
    writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

    const two = validationOf(root, 'slice-two');
    assert.deepEqual(naming(two, FILE), [], `no refusal for the file:\n${two.text}`);
    const res = validity(root, 'slice-two');
    assert.equal(res.valid, true, `${two.text}`);
    assert.deepEqual(res.checklist.countMovers.coveredByPredecessor, [{ path: FILE, plan: 'implementation/slice-one.md' }]);
    const one = validationOf(root, 'slice-one');
    assert.deepEqual(crossLines(one.text), [], `slice one's own screen:\n${one.text}`);
  });

  it('11b: slice one crosses through the menu, then slice two is offered the move and takes it', () => {
    const root = menuSandbox();
    writePlan(root, 'implementation', 'slice-one', [FILE, 'CLAUDE.md']);
    writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

    route(['stream', 'approve', 'implementation/slice-one.md'], root);
    const onePath = path.join(root, 'plans', 'todo', 'slice-one.md');
    assert.equal(fs.existsSync(onePath), true, 'slice one is now in the build queue');
    const oneText = fs.readFileSync(onePath, 'utf8');
    assert.match(oneText, /approved_by: human/);
    assert.deepEqual(parseFilesField(extractFrontmatterRegion(oneText)), [FILE, 'CLAUDE.md']);
    assert.equal(
      fs.existsSync(path.join(root, 'plans', 'implementation', 'slice-two.md')), true,
      'slice two is still in technical planning'
    );

    const two = validationOf(root, 'slice-two');
    assert.deepEqual(naming(two, FILE), [], `no refusal for the file:\n${two.text}`);
    const screen = planScreenOf(root, 'slice-two');
    assert.equal(offersMove(screen), true, `the plan screen offers the move:\n${screen.text}`);

    route(['stream', 'approve', 'implementation/slice-two.md'], root);
    assert.equal(fs.existsSync(path.join(root, 'plans', 'todo', 'slice-two.md')), true, 'slice two is in the build queue');
    assert.equal(fs.existsSync(path.join(root, 'plans', 'implementation', 'slice-two.md')), false);
    assert.equal(ledger.readEntry('slice-two', root).approved_by, 'human');
  });

  it('11c: a predecessor stamped the older way (approval block prepended) gives the pass', () => {
    const root = menuSandbox();
    inQueue(root, 'slice-one', [FILE, 'CLAUDE.md']);
    writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

    const two = validationOf(root, 'slice-two');
    assert.deepEqual(naming(two, FILE), [], `no refusal for the file:\n${two.text}`);
    assert.equal(validity(root, 'slice-two').checklist.countMovers.coveredByPredecessor[0].plan, 'todo/slice-one.md');
  });

  it('11d: the file comes from a slice further up the chain', () => {
    const root = menuSandbox();
    inQueue(root, 'slice-one', [FILE, 'CLAUDE.md']);
    writePlan(root, 'implementation', 'slice-two', ['docs/widget-notes.md'], { dependsOn: 'slice-one' });
    writePlan(root, 'implementation', 'slice-three', [FILE], { dependsOn: 'slice-two' });

    const three = validationOf(root, 'slice-three');
    assert.deepEqual(naming(three, FILE), [], `no refusal for the file:\n${three.text}`);
    assert.equal(validity(root, 'slice-three').checklist.countMovers.coveredByPredecessor[0].plan, 'todo/slice-one.md');
  });

  it('11e: a slice that really brings a counted file into being keeps today\'s refusal, word for word', () => {
    const root = menuSandbox();
    writePlan(root, 'implementation', 'slice-solo', [LIB]);

    const screen = validationOf(root, 'slice-solo');
    assert.deepEqual(crossLines(screen.text), [todaysRefusal(root, LIB, 'libModules')], screen.text);
    const plan = planScreenOf(root, 'slice-solo');
    assert.equal(offersMove(plan), false, `the move is not offered:\n${plan.text}`);
  });

  describe('11f: a dependency list that reaches no plan declaring the file gives no pass', () => {
    const cases = [
      ['a: none', 'none'],
      ['b: a name no plan carries', 'no-such-plan'],
      ['c: a folder climb whose last part is slice one', '../outside/slice-one'],
      ['c2: the same with backslashes', '..\\outside\\slice-one'],
      ['d: a real plan that does not declare the file', 'unrelated-plan'],
      ['e: a cycle back to slice two', 'slice-four'],
    ];
    for (const [name, dependsOn] of cases) {
      it(name, () => {
        const root = menuSandbox();
        writePlan(root, 'implementation', 'slice-one', [FILE, 'CLAUDE.md'], { parentPlan: 'widget-parent' });
        writePlan(root, 'implementation', 'slice-two', [FILE], { parentPlan: 'widget-parent', dependsOn });
        writePlan(root, 'implementation', 'unrelated-plan', ['docs/unrelated.md']);
        writePlan(root, 'implementation', 'slice-four', ['docs/four.md'], { dependsOn: 'slice-two' });

        const screen = validationOf(root, 'slice-two');
        assert.ok(screen.text.includes('Pre-transition validation: implementation → todo'), `case ${name}: the screen appears:\n${screen.text}`);
        assert.deepEqual(crossLines(screen.text), [todaysRefusal(root, FILE, 'testFiles')], `case ${name}:\n${screen.text}`);
      });
    }
  });

  it('11g: a finished predecessor whose file is missing gives no pass', () => {
    const root = menuSandbox();
    writePlan(root, 'done', 'slice-one', [FILE, 'CLAUDE.md']);
    writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

    const screen = validationOf(root, 'slice-two');
    assert.deepEqual(crossLines(screen.text), [todaysRefusal(root, FILE, 'testFiles')], screen.text);
  });

  it('11h: a predecessor that declares the file without CLAUDE.md is named in the one refusal', () => {
    const root = menuSandbox();
    inQueue(root, 'slice-one', [FILE]);
    writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

    const screen = validationOf(root, 'slice-two');
    assert.deepEqual(naming(screen, FILE), [predecessorRefusal(root, FILE, 'testFiles', 'todo/slice-one.md')], screen.text);
    assert.equal(screen.text.includes('Plan will create'), false, `today's wording is absent:\n${screen.text}`);
    const plan = planScreenOf(root, 'slice-two');
    assert.equal(offersMove(plan), false, `the move is not offered:\n${plan.text}`);
  });

  it('11i: one predecessor lacking CLAUDE.md and another declaring it: the second earns the pass', () => {
    const root = menuSandbox();
    inQueue(root, 'slice-one', [FILE]);
    writePlan(root, 'implementation', 'slice-zero', [FILE, 'CLAUDE.md']);
    writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one, slice-zero' });

    const screen = validationOf(root, 'slice-two');
    assert.deepEqual(naming(screen, FILE), [], `no refusal for the file:\n${screen.text}`);
    assert.equal(validity(root, 'slice-two').checklist.countMovers.coveredByPredecessor[0].plan, 'implementation/slice-zero.md');
  });

  describe('11j: a fault while reading fails closed', () => {
    it('1: an unreadable predecessor gives no pass', () => {
      const root = menuSandbox();
      fs.mkdirSync(path.join(root, 'plans', 'todo', 'slice-one.md'));
      writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

      const screen = validationOf(root, 'slice-two');
      assert.deepEqual(crossLines(screen.text), [todaysRefusal(root, FILE, 'testFiles')], screen.text);
    });

    it('2: one unreadable stage folder does not stop the walk', () => {
      const root = menuSandbox();
      fs.rmSync(path.join(root, 'plans', 'review'), { recursive: true });
      fs.writeFileSync(path.join(root, 'plans', 'review'), 'not a folder\n');
      writePlan(root, 'implementation', 'slice-one', [FILE, 'CLAUDE.md']);
      writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

      const screen = validationOf(root, 'slice-two');
      assert.deepEqual(naming(screen, FILE), [], `no refusal for the file:\n${screen.text}`);
    });
  });

  it('11k: an odd dependency list never refuses a slice with no counted file', () => {
    const root = menuSandbox();
    writePlan(root, 'implementation', 'slice-notes', ['docs/widget-notes.md'], { dependsOn: '../x, no-such-plan' });

    const screen = validationOf(root, 'slice-notes');
    assert.deepEqual(crossLines(screen.text), [], screen.text);
  });

  it('11l: a dependency list written as a YAML block list is read', () => {
    const root = menuSandbox();
    writePlan(root, 'implementation', 'slice-one', [FILE, 'CLAUDE.md']);
    writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: ['slice-one'] });

    const screen = validationOf(root, 'slice-two');
    assert.deepEqual(naming(screen, FILE), [], `no refusal for the file:\n${screen.text}`);
  });

  it('11m: a name in two folders resolves to the first folder (technical planning)', () => {
    const root = menuSandbox();
    writePlan(root, 'implementation', 'slice-one', [FILE, 'CLAUDE.md']);
    writePlan(root, 'todo', 'slice-one', ['docs/stale.md']);
    writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

    const screen = validationOf(root, 'slice-two');
    assert.deepEqual(naming(screen, FILE), [], `no refusal for the file:\n${screen.text}`);
    assert.equal(validity(root, 'slice-two').checklist.countMovers.coveredByPredecessor[0].plan, 'implementation/slice-one.md');
  });

  it('11n: a predecessor listing 200,000 names neither throws nor passes (the walk is bounded)', () => {
    const root = menuSandbox();
    const names = [];
    for (let i = 0; i < 200000; i++) names.push(`no-such-plan-${i}`);
    writePlan(root, 'implementation', 'slice-one', ['docs/widget-notes.md'], { dependsOn: names.join(' ') });
    writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

    assert.doesNotThrow(() => validity(root, 'slice-two'), 'the walk does not throw on a huge dependency list');
    const screen = validationOf(root, 'slice-two');
    assert.deepEqual(crossLines(screen.text), [todaysRefusal(root, FILE, 'testFiles')], screen.text);
  });

  it('11o: a stale copy beside a finished plan gives no pass (the finished plan ends the branch)', () => {
    const root = menuSandbox();
    writePlan(root, 'done', 'slice-one', ['docs/a.md']);
    writePlan(root, 'implementation', 'slice-one', [FILE, 'CLAUDE.md']);
    writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

    const screen = validationOf(root, 'slice-two');
    assert.deepEqual(crossLines(screen.text), [todaysRefusal(root, FILE, 'testFiles')], screen.text);
  });

  describe('11p: an unsafe dependency token withholds the pass (the scheduler refuses the whole list)', () => {
    const cases = [
      ['a: a folder climb beside a real name', 'slice-one ../x'],
      ['b: a trailing comment', 'slice-one # note'],
      ['c: a comma list with a folder climb', 'slice-one, ../x'],
    ];
    for (const [name, dependsOn] of cases) {
      it(name, () => {
        const root = menuSandbox();
        writePlan(root, 'implementation', 'slice-one', [FILE, 'CLAUDE.md']);
        writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn });

        const screen = validationOf(root, 'slice-two');
        assert.deepEqual(crossLines(screen.text), [todaysRefusal(root, FILE, 'testFiles')], `case ${name}:\n${screen.text}`);
      });
    }

    it('d: a predecessor whose own list holds an unsafe token is not followed', () => {
      const root = menuSandbox();
      writePlan(root, 'implementation', 'slice-zero', [FILE, 'CLAUDE.md']);
      writePlan(root, 'implementation', 'slice-one', ['docs/a.md'], { dependsOn: 'slice-zero ../x' });
      writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

      const screen = validationOf(root, 'slice-two');
      assert.deepEqual(crossLines(screen.text), [todaysRefusal(root, FILE, 'testFiles')], screen.text);
    });

    it('e: a predecessor with an unsafe list gives no pass for its own file either', () => {
      const root = menuSandbox();
      writePlan(root, 'implementation', 'slice-one', [FILE, 'CLAUDE.md'], { dependsOn: '../x' });
      writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn: 'slice-one' });

      const screen = validationOf(root, 'slice-two');
      assert.deepEqual(crossLines(screen.text), [todaysRefusal(root, FILE, 'testFiles')], screen.text);
    });
  });

  describe('11q: the named attacks give no pass', () => {
    const cases = [
      ['a: a name that climbs out and back in', 'slice-one/../slice-one'],
      ['b: a name holding a NUL character', 'slice-one\u0000'],
    ];
    for (const [name, dependsOn] of cases) {
      it(name, () => {
        const root = menuSandbox();
        writePlan(root, 'implementation', 'slice-one', [FILE, 'CLAUDE.md']);
        writePlan(root, 'implementation', 'slice-two', [FILE], { dependsOn });

        const screen = validationOf(root, 'slice-two');
        assert.deepEqual(crossLines(screen.text), [todaysRefusal(root, FILE, 'testFiles')], `case ${name}:\n${screen.text}`);
      });
    }
  });
});
