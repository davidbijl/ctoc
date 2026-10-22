/**
 * Plan Validator Tests
 * Tests for per-stage validation rules and pre-transition checks.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');
const { verifyEvidencePath } = require('../src/lib/step-13-verify');

// A full "## Execution Plan" with every required Iron Loop step present and
// ticked — the shape validateReviewToDone now demands before Gate 3 may cross.
const REVIEW_DONE_EXEC_PLAN = [
  '## Execution Plan',
  '',
  '### Step 8: TEST',
  '- [x] Tests written and run RED first',
  '',
  '### Step 9: PREPARE',
  '- [x] Environment ready',
  '',
  '### Step 10: IMPLEMENT',
  '- [x] Feature implemented',
  '',
  '### Step 11: REVIEW',
  '- [x] Self-review done',
  '',
  '### Step 12: OPTIMIZE',
  '- [x] No redundant work',
  '',
  '### Step 13: SECURE',
  '- [x] Inputs validated',
  '',
  '### Step 14: VERIFY',
  '- [x] All tests green, 0 skipped, 0 flaky',
  '',
  '### Step 15: DOCUMENT',
  '- [x] Docs updated',
  '',
  '### Step 16: FINAL-REVIEW',
  '- [x] Ready for human review',
  '',
].join('\n');

// 00255 fixtures. PROSE_EXEC_PLAN is the implementation planner's twin: the same
// heading text, the same step headings, and NO checkbox on any line.
const PROSE_EXEC_PLAN = [
  '## Execution Plan',
  '',
  '### Step 8: TEST',
  'Write the regression cases first and run them RED.',
  '',
  '### Step 9: PREPARE',
  'No new dependency is needed.',
  '',
  '### Step 10: IMPLEMENT',
  'Edit the one function named above.',
  '',
  '### Step 11: REVIEW',
  'Self-review the diff against the plan.',
  '',
  '### Step 12: OPTIMIZE',
  'Nothing on a hot path changes.',
  '',
  '### Step 13: SECURE',
  'No new input crosses a trust boundary.',
  '',
  '### Step 14: VERIFY',
  'Run the whole suite through the gated entry point.',
  '',
  '### Step 15: DOCUMENT',
  'Update the module comment at the changed site.',
  '',
  '### Step 16: FINAL-REVIEW',
  'Hand the built work to the human.',
  '',
].join('\n');

// The canonical section src/lib/iron-loop.js appends at the build-queue crossing —
// the one the executor ticks. Same blocks as REVIEW_DONE_EXEC_PLAN under the exact
// heading iron-loop.js emits.
const CANONICAL_EXEC_PLAN =
  REVIEW_DONE_EXEC_PLAN.replace('## Execution Plan', '## Execution Plan (Steps 8-16)');

describe('Plan Validator Tests', () => {
  let testDir;
  let plansDir;
  let validator;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-test-'));
    plansDir = path.join(testDir, 'plans');

    const stages = ['functional', 'implementation', 'todo', 'in-progress', 'review', 'done'];
    stages.forEach(stage => {
      fs.mkdirSync(path.join(plansDir, stage), { recursive: true });
    });

    fs.mkdirSync(path.join(testDir, '.ctoc'), { recursive: true });

    delete require.cache[require.resolve('../src/lib/plan-validator.js')];
    validator = require('../src/lib/plan-validator.js');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function createPlan(stage, name, content) {
    const filePath = path.join(plansDir, stage, `${name}.md`);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  // === contradiction parser (file-claim) — v6.9.86 ===

  test('validateNoContradictions: ignores code inside fenced blocks (v6.9.86 false-positive)', () => {
    // Code snippets in ``` fences (e.g. lines.push('CLAUDE.md'), Hash('sha256')
    // .update(body).digest) are NOT file-creation claims. Before v6.9.86 the
    // loose regex matched them as "files claimed as created" and blocked
    // otherwise-complete plans at review.
    const content = [
      '# Plan',
      '## DESIGN',
      'We create the module.',
      '```js',
      "lines.push('CLAUDE.md');",
      "const h = Hash('sha256').update(bodyLF, 'utf8').digest('hex');",
      '```',
    ].join('\n');

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      !result.errors.some(e => /claimed as created/i.test(e)),
      `fenced code must not produce file-claim errors, got: ${JSON.stringify(result.errors)}`
    );
    console.log('# validateNoContradictions: ignores fenced code');
  });

  test('validateNoContradictions: still flags a real nonexistent created-file claim', () => {
    // The fix must not blind the check: an inline claim of a created file that
    // does not exist must still error (no fences involved).
    const content = '# Plan\n\nCreated `src/lib/definitely-missing-xyz.js` for the feature.\n';

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      result.errors.some(e => /claimed as created/i.test(e) && /definitely-missing-xyz\.js/.test(e)),
      `real nonexistent created-file claim must still be flagged, got: ${JSON.stringify(result.errors)}`
    );
    console.log('# validateNoContradictions: still flags real missing created file');
  });

  // === contradiction parser: a member expression is not a file — 00260 ===
  //
  // Every input below is byte-for-byte prose from a plan that ships in this
  // repository. Each one made the pre-review gate refuse a plan because a method
  // call written in prose ("Added `this.scannersRun` tracking") was read as a
  // claim that a FILE named `this.scannersRun` had been created. Two of them
  // span a line break: the separator between the verb and the capture is
  // `[:\s]*`, and `\s` matches a newline, so a paragraph ending in "Added" picks
  // up the backticked call that opens the next line.

  const MISREAD_CORPUS = [
    [
      'plans/in-progress/00259 line 293 — the live refusal',
      "- one assertion ADDED: `assert.strictEqual(result.confidence, 50)`.",
    ],
    [
      'plans/review/00157 line 269 — created.push yields the capture d.push',
      "### Step 11: REVIEW — confirm no `created.push` remains on a preview path. Confirm no write remains outside `record`.",
    ],
    [
      'plans/review/00157 line 357 — created.length yields the capture d.length',
      "    `result.created.length > 0` on a run that writes nothing. It does not merely",
    ],
    [
      'plans/review/00025 line 117 — a member expression after Added',
      "2. **`run()` honesty.** Added `this.scannersRun` tracking. `run()` now returns",
    ],
    [
      'plans/review/00013 lines 186-187 — the verb and the call are on different lines',
      "2. **Plan-uniqueness enforced at the action + CLI layer, with a shared registry lookup.** Added\n"
        + "   `taskRegistry.findActivePlanTask(reg, plan, kind)` (prefers running/cancelling over queued) and",
    ],
    [
      'plans/done/ctoc-audit-w11-s5 lines 42-43 — exclusive-create then a call, across a newline',
      "**Fix:** make the WRITE the point of exclusivity, not the check. Attempt an exclusive-create\n"
        + "`safeFs.writeFileSync(lockPath, data, { flag: 'wx' })` — atomic create-or-fail (`EEXIST`).",
    ],
    [
      'plans/done/ctoc-audit-w11-s7 line 49 — a property read and an arrow-body subtraction',
      "`created: stat.birthtime` (line 38) and `files.sort((a,b)=>a.created-b.created)` (line 52,",
    ],
  ];

  for (const [label, prose] of MISREAD_CORPUS) {
    test(`00260 misread corpus: ${label} produces no file-claim error`, () => {
      const result = validator.validateNoContradictions(`# Plan\n\n${prose}\n`, testDir);

      assert.ok(
        !result.errors.some(e => /claimed as created/i.test(e)),
        `a call cited in prose is not a file claim, got: ${JSON.stringify(result.errors)}`
      );
    });
  }

  test('00260 teeth: a paren-free backtick claim still errors on a line that also cites a call', () => {
    // Kills an over-broad inline-span strip: only a span containing an open
    // parenthesis is a code citation. The span holding the real claim has none,
    // so the claim must survive and still error.
    const content = '# Plan\n\nCreated `src/lib/definitely-missing-xyz.js` once `wire(the, thing)` landed.\n';

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      result.errors.some(e => /claimed as created/i.test(e) && /definitely-missing-xyz\.js/.test(e)),
      `a paren-free claim beside a call span must still error, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('00260 teeth: a separator-bearing claim with an unknown suffix still errors', () => {
    // Kills a plausibility rule that checks the extension only. The suffix
    // ".weirdext" is in no extension list, but the token carries a path
    // separator, so it names a file and its absence is a real contradiction.
    const content = '# Plan\n\nCreated `src/lib/gone-xyz.weirdext` for the feature.\n';

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      result.errors.some(e => /claimed as created/i.test(e) && /gone-xyz\.weirdext/.test(e)),
      `a slash-bearing claim must still error, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('00260 teeth: a backslash-separated claim still errors', () => {
    // Kills the second operand of the separator test. A Windows-authored
    // declaration is split on either separator by the existence check, so the
    // plausibility rule must agree with it.
    const content = '# Plan\n\nCreated `src\\lib\\gone-xyz.weirdext` for the feature.\n';

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      result.errors.some(e => /claimed as created/i.test(e) && /gone-xyz\.weirdext/.test(e)),
      `a backslash-separated claim must still error, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('00260 teeth: a path-plausible token immediately followed by "(" is a call, not a claim', () => {
    // Kills the read-past-the-match guard on its own. The token IS path
    // plausible (it carries a separator and a .js suffix), so only the "next
    // character is an open parenthesis" test can reject it.
    const content = '# Plan\n\nCreated src/lib/gone-abc.js(argv) in the same pass.\n';

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      !result.errors.some(e => /claimed as created/i.test(e)),
      `a call spelled with a path-shaped callee is not a file claim, got: ${JSON.stringify(result.errors)}`
    );
  });

  // === contradiction parser: a verb FUSED into a cited token is not a verb — 00260 ===
  //
  // The verb alternation has no left word boundary, so `created?` matches the
  // five letters `create` wherever they appear — including as a SYLLABLE inside a
  // hyphen-joined slug. A plan filename cited in a table cell
  // (`…-a-canonical-create-react-app-is-detected-s1-symmetric-credit.md`) therefore
  // starts a match at `create`, and the capture runs from the next character to
  // the slug's real `.md` suffix. That token carries a plausible extension and is
  // not followed by an open parenthesis, so NEITHER the call-skip nor the
  // plausibility guard can see it. This is the shape that refused the very plan
  // that fixes it (its own line 207 cites the plan it repairs).

  const FUSED_VERB_CORPUS = [
    [
      'plans/implementation/a-canonical-create-react-app-is-detected.md line 27 — a cited slug in a table cell',
      "| 1 | `00259-a-canonical-create-react-app-is-detected-s1-symmetric-credit.md` | `calculateConfidence`'s `packageDevDeps` loop credits through `hasDependency` | - |",
    ],
    [
      'plans/in-progress/00260 line 207 — this plan citing the plan it repairs',
      "| `assert.strictEqual` | `plans/in-progress/00259-a-canonical-create-react-app-is-detected-s1-symmetric-credit.md:293` — the live refusal | A, then B, then C |",
    ],
  ];

  for (const [label, prose] of FUSED_VERB_CORPUS) {
    test(`00260 fused-verb corpus: ${label} produces no file-claim error`, () => {
      const result = validator.validateNoContradictions(`# Plan\n\n${prose}\n`, testDir);

      assert.ok(
        !result.errors.some(e => /claimed as created/i.test(e)),
        `a verb syllable inside a cited slug is not a file claim, got: ${JSON.stringify(result.errors)}`
      );
    });
  }

  test('00260 teeth: a claim separated from the verb by a COLON only still errors', () => {
    // Pins the `:` operand of the separation test. The verb and the path are
    // separate words here — the colon is the separator — so the claim is real.
    const content = '# Plan\n\nCreated:src/lib/gone-colon-xyz.js in one pass.\n';

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      result.errors.some(e => /claimed as created/i.test(e) && /gone-colon-xyz\.js/.test(e)),
      `a colon-separated claim must still error, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('00260 teeth: a claim separated from the verb by a DELIMITER only still errors', () => {
    // Pins the backtick operand of the separation test: zero whitespace, zero
    // colon, but the opening code delimiter still separates verb from path.
    const content = '# Plan\n\nCreated`src/lib/gone-tick-xyz.js` in one pass.\n';

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      result.errors.some(e => /claimed as created/i.test(e) && /gone-tick-xyz\.js/.test(e)),
      `a delimiter-separated claim must still error, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('00260 teeth: a HYPHEN-PREFIXED verb followed by a real claim still errors', () => {
    // Kills the rejected alternative. Reading the character BEFORE the match and
    // refusing a verb glued to a preceding token character would also refuse
    // "newly-created", "re-created" and "auto-created" — every hyphen-joined
    // compound adjective — and silence a genuine missing-file claim. The guard
    // must test the join on the PATH side, where a real sentence always has a
    // separator, not on the word side, where a real sentence may not.
    const content = '# Plan\n\nnewly-created `src/lib/gone-compound-xyz.js` for the feature.\n';

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      result.errors.some(e => /claimed as created/i.test(e) && /gone-compound-xyz\.js/.test(e)),
      `a hyphen-compound verb still introduces a real claim, got: ${JSON.stringify(result.errors)}`
    );
  });

  // === contradiction parser: a placeholder FILE NAME is not a claim — four-defects s17 ===
  //
  // Slice 7 of the four-defects round was refused at completion for its approved line 134,
  // whose claimed path is a placeholder folder and a placeholder file name. A capture is
  // passed over only when its file name holds a placeholder as a whole part of the name; a
  // placeholder in a folder part, an HTML tag glued in front of a path, a line-break tag
  // joining two paths, a lone sign, a reversed pair, an empty pair and a pair glued inside
  // a word change nothing. Each guard (Pattern 1, Pattern 2) has a case that turns red when
  // the guard is removed, widened to any less-than sign, or turned into a break.

  /** A word between a less-than and a greater-than sign, the way plans write a placeholder. */
  const placeholder = (word) => ['<', word, '>'].join('');
  /** Slice 7's line 134, byte for byte, with `claimPath` as its claimed path. */
  const slice7Line = (claimPath) =>
    "  5. The claim: create `" + claimPath + "` with `JSON.stringify(entry)`, `flag: 'wx'` (folder made with";
  /** Plan 00225's line 230 (plans/done), byte for byte, with `claimPath` as its claimed path. */
  const plan00225Line = (claimPath) =>
    'Helper: create `' + claimPath + '`, then approve it for real via';
  /** The creation-claim errors of one scan. */
  const claimErrorsOf = (result) => result.errors.filter(e => /claimed as created/i.test(e));
  /** The checklist keys of one scan that hold a less-than sign. */
  const signKeysOf = (result) => Object.keys(result.checklist).filter(k => k.includes('<'));

  test('four-defects s17: slice 7 line 134, a placeholder folder and a placeholder file name, is not a claim', () => {
    const claimed = `${placeholder('claims')}/${placeholder('id')}.json`;
    const result = validator.validateNoContradictions(`# Plan\n\n${slice7Line(claimed)}\n`, testDir);

    assert.deepStrictEqual(claimErrorsOf(result), [], `a placeholder file name names no file, got: ${JSON.stringify(result.errors)}`);
    assert.deepStrictEqual(signKeysOf(result), [], 'a placeholder file name is not recorded as a claim');
  });

  test('four-defects s17: plan 00225 line 230, a real folder and a placeholder file name, is not a claim with either separator', () => {
    // The backslash form pins `path.win32.basename`: the POSIX basename keeps a
    // backslash-separated folder in the name, and the claim would still error on macOS and Linux.
    // The other boundaries (a hyphen, an underscore or a dot in front of the sign pair; a hyphen or
    // an underscore behind it) are pinned too: a guard anchored at the start of the name that
    // needs a dot after the pair turns this red.
    for (const claimed of [
      `plans/todo/${placeholder('f')}.md`,
      `plans\\todo\\${placeholder('f')}.md`,
      `plans/todo/answer-${placeholder('id')}.md`,
      `plans/todo/q_${placeholder('id')}.md`,
      `plans/todo/step.${placeholder('n')}.md`,
      `plans/todo/${placeholder('id')}-x.md`,
      `plans/todo/${placeholder('id')}_x.md`,
    ]) {
      const result = validator.validateNoContradictions(`# Plan\n\n${plan00225Line(claimed)}\n`, testDir);

      assert.deepStrictEqual(claimErrorsOf(result), [], `${claimed} names no file, got: ${JSON.stringify(result.errors)}`);
      assert.deepStrictEqual(signKeysOf(result), [], `${claimed} is not recorded as a claim`);
    }
  });

  test('four-defects s17 teeth: a placeholder folder in front of a declared real file that was never built still errors', () => {
    // The file name is real, so the claim is real: neither the placeholder folder nor the
    // declaration of a file that does not exist may silence it.
    const content = [
      '---',
      'files:',
      '  - src/lib/gone-s17-declared.js',
      '---',
      '# Plan',
      '',
      slice7Line(`${placeholder('module-dir')}/gone-s17-declared.js`),
      '',
    ].join('\n');
    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      claimErrorsOf(result).some(e => e.includes('gone-s17-declared.js')),
      `a placeholder folder leaves a real file name, so the claim must still error, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('four-defects s17 teeth: an HTML code tag glued in front of a missing real path still errors', () => {
    const content = '# Plan\n\nCreated <code>src/lib/gone-s17-tag.js</code> for the feature.\n';
    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      claimErrorsOf(result).some(e => e.includes('src/lib/gone-s17-tag.js')),
      `the tag lands in the capture but the file name is real, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('four-defects s17 teeth: an inline HTML tag glued in front of a root-level dotted, underscored or hyphenated file name still errors', () => {
    // The tag lands in the capture and looks like a placeholder at the start of the name.
    // A tag name is not a placeholder; the file name behind it is the claim.
    const tag = (name, inner) => ['<', name, '>'].join('') + inner + ['</', name, '>'].join('');
    for (const [sentence, file] of [
      ['Created ' + tag('code', '.eslintrc.json') + ' for the lint rules.', '.eslintrc.json'],
      ['Created ' + tag('b', '__init__.py') + ' for the package.', '__init__.py'],
      ['Created ' + tag('kbd', '-setup.sh') + ' for the setup.', '-setup.sh'],
      ['Created ' + tag('CODE', '.eslintrc.json') + ' in capitals.', '.eslintrc.json'],
    ]) {
      const result = validator.validateNoContradictions('# Plan\n\n' + sentence + '\n', testDir);
      assert.ok(
        claimErrorsOf(result).some(e => e.includes(file)),
        `${sentence}: a tag is not a placeholder, so the missing file must error, got: ${JSON.stringify(result.errors)}`
      );
    }
  });

  test('four-defects s17: a word that is not a tag between the signs in front of a root-level file name is still a placeholder', () => {
    const claimed = [placeholder('name'), '.json'].join('');
    const result = validator.validateNoContradictions('# Plan\n\nCreated ' + claimed + ' for each answer.\n', testDir);
    assert.deepStrictEqual(claimErrorsOf(result), [], `a placeholder file name is not a claim, got: ${JSON.stringify(result.errors)}`);
  });

  test('four-defects s17 teeth: two missing real paths joined by a line-break tag still error', () => {
    const content = '# Plan\n\nCreated src/lib/gone-s17-first.js<br>src/lib/gone-s17-second.js in one pass.\n';
    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      claimErrorsOf(result).some(e => e.includes('gone-s17-second.js')),
      `the joined capture ends in a real file name, got: ${JSON.stringify(result.errors)}`
    );
  });

  test('four-defects s17 teeth: a lone sign, a reversed pair, an empty pair or a pair glued inside a word is not a placeholder', () => {
    // Every sign sits in the file name, where a placeholder would count, so a guard that
    // tests for any less-than sign, accepts an empty pair, or drops either part boundary
    // turns this red.
    for (const claimed of [
      'src/lib/<gone-s17-lone.json',
      'src/lib/>gone-s17-reversed<.json',
      'src/lib/<>-gone-s17-empty.json',
      'src/lib/gone<s17>-glued-left.json',
      'src/lib/<s17>glued-right.json',
      // A second less-than sign or a second greater-than sign inside the pair: the run between
      // the signs may hold neither, so a class that drops one of them turns this red.
      'src/lib/' + ['<', 'a', '<', 'b', '>'].join('') + '.json',
      'src/lib/' + ['<', 'a', '>', 'b', '>'].join('') + '.json',
    ]) {
      const result = validator.validateNoContradictions(`# Plan\n\n${slice7Line(claimed)}\n`, testDir);
      assert.ok(
        claimErrorsOf(result).some(e => e.includes(claimed)),
        `${claimed} holds no whole-part placeholder, so its claim must still error, got: ${JSON.stringify(result.errors)}`
      );
    }
  });

  test('four-defects s17 teeth: a real missing claim on the line after a placeholder claim still errors', () => {
    // Kills a Pattern 1 guard that ends the scan (`break`) instead of passing over one match.
    const content = [
      '# Plan',
      '',
      slice7Line(`${placeholder('claims')}/${placeholder('id')}.json`),
      slice7Line('src/lib/gone-s17-next.json'),
      '',
    ].join('\n');
    const errors = claimErrorsOf(validator.validateNoContradictions(content, testDir));

    assert.strictEqual(errors.length, 1, `exactly the real claim errors, got: ${JSON.stringify(errors)}`);
    assert.ok(errors[0].includes('src/lib/gone-s17-next.json'), `the error names the real path, got: ${errors[0]}`);
  });

  test('four-defects s17: one script sentence warns for exactly its two real missing scripts', () => {
    // A placeholder script, a real missing script, then a missing script with a lone
    // less-than sign in its folder. Without the Pattern 2 guard there are three warnings;
    // a guard widened to any less-than sign leaves one; a guard that breaks leaves none.
    const content = '# Plan\n\nRun `scripts/' + placeholder('variant') + '.js`, run `scripts/gone-s17-real/load.js`,'
      + ' then run `scripts/gone<s17/load.js` once.\n';
    const result = validator.validateNoContradictions(content, testDir);
    const notFound = result.warnings.filter(w => /referenced but not found/i.test(w));

    assert.strictEqual(notFound.length, 2, `exactly the two real scripts warn, got: ${JSON.stringify(notFound)}`);
    assert.ok(notFound.some(w => w.includes('"scripts/gone-s17-real/load.js"')), `got: ${JSON.stringify(notFound)}`);
    assert.ok(notFound.some(w => w.includes('"scripts/gone<s17/load.js"')), `got: ${JSON.stringify(notFound)}`);
    assert.deepStrictEqual(
      Object.keys(result.checklist).filter(k => k.startsWith('script_')).sort(),
      ['script_scripts/gone-s17-real/load.js', 'script_scripts/gone<s17/load.js'].sort(),
      'the placeholder script is not recorded'
    );
    assert.deepStrictEqual(result.errors, [], `no error, got: ${JSON.stringify(result.errors)}`);
  });

  // === contradiction parser: files:-declaration basename fallback — VP1 ===

  test('VP1 #1: bare-basename claim resolved via files: declaration (OM2/PI0 shape) → no error', () => {
    // OM2/PI0 shape: inline-array files: [src/hooks/guard-files.js] declares the
    // authoritative subpath; prose refers to it by bare basename. The bare name
    // resolves to <root>/guard-files.js (absent), but the declared file EXISTS,
    // so the claim is satisfied and must NOT error.
    fs.mkdirSync(path.join(testDir, 'src', 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'hooks', 'guard-files.js'), '// guard');

    const content = [
      '---',
      'files: [src/hooks/guard-files.js]',
      '---',
      '# Plan',
      '',
      'Step 10: create `guard-files.js` for the hook.',
      '',
    ].join('\n');

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      !result.errors.some(e => /claimed as created/i.test(e) && /guard-files\.js/.test(e)),
      `bare-basename claim of a declared+existing file must not error, got: ${JSON.stringify(result.errors)}`
    );
    console.log('# VP1 #1: bare-basename resolved via files: declaration');
  });

  test('VP1 #2: genuine missing-file claim still errors', () => {
    // nowhere.js is neither declared in files: nor present at project root —
    // the genuine contradiction must still be flagged (D-VP1-2).
    const content = [
      '---',
      'files: [src/lib/plan-validator.js]',
      '---',
      '# Plan',
      '',
      'Created `nowhere.js` for the feature.',
      '',
    ].join('\n');

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      result.errors.some(e => /claimed as created/i.test(e) && /nowhere\.js/.test(e)),
      `genuine missing-file claim must still be flagged, got: ${JSON.stringify(result.errors)}`
    );
    console.log('# VP1 #2: genuine missing-file claim still errors');
  });

  test('VP1 #3: full-path claim still clean (no regression to path resolution)', () => {
    fs.mkdirSync(path.join(testDir, 'src', 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'hooks', 'guard-files.js'), '// guard');

    const content = [
      '---',
      'files: [src/hooks/guard-files.js]',
      '---',
      '# Plan',
      '',
      'Create `src/hooks/guard-files.js`.',
      '',
    ].join('\n');

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      !result.errors.some(e => /claimed as created/i.test(e)),
      `full-path claim of an existing file must resolve unchanged, got: ${JSON.stringify(result.errors)}`
    );
    console.log('# VP1 #3: full-path claim still clean');
  });

  test('VP1 #4: basename collision safe — declared+existing satisfies bare claim', () => {
    fs.mkdirSync(path.join(testDir, 'src', 'a'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'a', 'util.js'), '// util');

    const content = [
      '---',
      'files: [src/a/util.js]',
      '---',
      '# Plan',
      '',
      'Created `util.js`.',
      '',
    ].join('\n');

    const result = validator.validateNoContradictions(content, testDir);

    assert.ok(
      !result.errors.some(e => /claimed as created/i.test(e) && /util\.js/.test(e)),
      `declared+existing file must satisfy a bare-basename claim, got: ${JSON.stringify(result.errors)}`
    );
    console.log('# VP1 #4: basename collision safe');
  });

  // === functional -> implementation ===

  test('functional->implementation: passes with problem, criteria, scope', () => {
    const planPath = createPlan('functional', 'good-plan',
      '# Good Plan\n\n## Problem Statement\nUsers need auth.\n\n## Success Criteria\nLogin works.\n\n## Scope\nOnly login.\n');

    const result = validator.validateTransition(planPath, 'functional', 'implementation', testDir);

    assert.strictEqual(result.valid, true, 'Should pass');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors');
    console.log('# functional->implementation: passes with problem, criteria, scope');
  });

  test('functional->implementation: accepts canonical Iron-Loop "## ASSESS" problem section (v6.9.61)', () => {
    // CTOC's product-owner / vision-decomposer agents emit the problem as
    // "## 1. ASSESS — Problem Understanding" (Business Context / Current State /
    // Impact), NOT the literal "Problem Statement" heading. The validator must
    // recognize it, or every canonically-formatted plan false-fails Gate 1.
    const planPath = createPlan('functional', 'assess-format',
      '# Stale Flag\n\n## 1. ASSESS — Problem Understanding\n\n### Business Context\nPlans rot after their work ships.\n\n### Impact\nPhantom backlog erodes dashboard trust.\n\n## 3. CAPTURE — Acceptance Criteria\nScan completes without git.\n\n### In Scope\nCheap signal detection.\n');

    const result = validator.validateTransition(planPath, 'functional', 'implementation', testDir);

    assert.strictEqual(result.checklist.problemStatement, true, 'ASSESS section must satisfy the problem-statement check');
    assert.ok(!result.errors.some(e => /problem/i.test(e)), 'Should NOT report a missing problem statement');
    assert.strictEqual(result.valid, true, 'Canonical ASSESS-format plan should pass functional->implementation');
    console.log('# functional->implementation: accepts canonical Iron-Loop "## ASSESS" problem section');
  });

  test('functional->implementation: fails without problem statement', () => {
    const planPath = createPlan('functional', 'no-problem',
      '# No Problem\n\n## Success Criteria\nLogin works.\n\n## Scope\nOnly login.\n');

    const result = validator.validateTransition(planPath, 'functional', 'implementation', testDir);

    assert.strictEqual(result.valid, false, 'Should fail');
    assert.ok(result.errors.some(e => /problem/i.test(e)), 'Should mention missing problem');
    console.log('# functional->implementation: fails without problem statement');
  });

  test('functional->implementation: fails without criteria', () => {
    const planPath = createPlan('functional', 'no-criteria',
      '# No Criteria\n\n## Problem Statement\nUsers need auth.\n\n## Scope\nOnly login.\n');

    const result = validator.validateTransition(planPath, 'functional', 'implementation', testDir);

    assert.strictEqual(result.valid, false, 'Should fail');
    assert.ok(result.errors.some(e => /criteria/i.test(e)), 'Should mention missing criteria');
    console.log('# functional->implementation: fails without criteria');
  });

  test('functional->implementation: warns without scope', () => {
    // Content must NOT contain the word "scope" (or "Scope", "## Scope", etc.)
    const planPath = createPlan('functional', 'no-boundaries',
      '# Auth Feature\n\n## Problem Statement\nUsers need auth.\n\n## Acceptance Criteria\nLogin works.\n');

    const result = validator.validateTransition(planPath, 'functional', 'implementation', testDir);

    assert.ok(result.valid, 'Should still pass (missing boundaries is warning, not error)');
    assert.ok(result.warnings.some(w => /scope/i.test(w)), 'Should warn about missing scope definition');
    console.log('# functional->implementation: warns without scope');
  });

  // === implementation -> todo ===

  test('implementation->todo: passes with title and files section', () => {
    const planPath = createPlan('implementation', 'good-impl',
      '# Good Impl\n\n## Files to Create/Modify\n- lib/foo.js\n\n## Implementation Details\nChange X.\n');

    const result = validator.validateTransition(planPath, 'implementation', 'todo', testDir);

    assert.strictEqual(result.errors.length, 0, 'Should have no errors');
    console.log('# implementation->todo: passes with title and files section');
  });

  test('implementation->todo: fails without title', () => {
    const planPath = createPlan('implementation', 'no-title',
      'No markdown heading here.\n\n## Files to Create/Modify\n- lib/foo.js\n');

    const result = validator.validateTransition(planPath, 'implementation', 'todo', testDir);

    assert.strictEqual(result.valid, false, 'Should fail');
    assert.ok(result.errors.some(e => /title/i.test(e)), 'Should mention missing title');
    console.log('# implementation->todo: fails without title');
  });

  // === todo -> in-progress ===

  test('todo->in-progress: passes with iron_loop marker and step labels', () => {
    const fullPlan = `---
iron_loop: true
---

# Ready Plan

## Scope
Do things.

## Execution Plan (Steps 8-16)

### Step 8: TEST
- [ ] Write tests for auth flow

### Step 9: PREPARE
- [ ] Run lint on new files

### Step 10: IMPLEMENT
- [ ] Implement auth routes

### Step 11: REVIEW
- [ ] Self-review code

### Step 12: OPTIMIZE
- [ ] Check performance

### Step 13: SECURE
- [ ] Validate inputs

### Step 14: VERIFY
- [ ] Run all tests

### Step 15: DOCUMENT
- [ ] Update docs

### Step 16: FINAL-REVIEW
- [ ] Final review
`;
    const planPath = createPlan('todo', 'ready-plan', fullPlan);

    const result = validator.validateTransition(planPath, 'todo', 'in-progress', testDir);

    assert.strictEqual(result.valid, true, 'Should pass with iron_loop and correct step labels');
    console.log('# todo->in-progress: passes with iron_loop marker and step labels');
  });

  test('todo->in-progress: fails without iron_loop marker', () => {
    const planPath = createPlan('todo', 'not-ready',
      '# Not Ready\n\nNo iron loop steps.\n');

    const result = validator.validateTransition(planPath, 'todo', 'in-progress', testDir);

    assert.strictEqual(result.valid, false, 'Should fail without iron_loop');
    assert.ok(result.errors.some(e => /iron loop/i.test(e)), 'Should mention missing iron loop');
    console.log('# todo->in-progress: fails without iron_loop marker');
  });

  // === review -> done ===

  test('review->done: a compliant plan passes', () => {
    // W05-s2 replaced the old always-valid contract: validateReviewToDone can now
    // REJECT. A GENUINELY compliant plan — human-approval marker + a full
    // completed Execution Plan + a fresh passing VERIFY evidence artifact — still
    // passes. (The rejection paths are covered by ctoc-audit-w05-gate3-*.)
    const planPath = createPlan('review', 'reviewed-plan',
      `---\napproved_by: human\n---\n\n# Reviewed Plan\n\nAll good.\n\n${REVIEW_DONE_EXEC_PLAN}`);

    // Real VERIFY evidence artifact (data fixture) recording a passing run fresher
    // than the plan's mtime, so the evidence + staleness checks both pass.
    const planMtimeMs = fs.statSync(planPath).mtimeMs;
    const evidencePath = verifyEvidencePath(testDir, 'reviewed-plan');
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify({
      planSlug: 'reviewed-plan',
      timestamp: new Date(planMtimeMs + 60000).toISOString(),
      passed: true,
      method: 'fallback-direct',
      checks: {},
      errors: [],
      summary: 'fixture run'
    }, null, 2));

    const result = validator.validateTransition(planPath, 'review', 'done', testDir);

    assert.strictEqual(result.valid, true, `compliant plan must pass, errors: ${JSON.stringify(result.errors)}`);
    console.log('# review->done: a compliant plan passes');
  });

  test('review->done: a plan carrying BOTH execution sections is judged by the canonical one', () => {
    // 00255. A plan written by the implementation planner carries a PROSE
    // "## Execution Plan" (Step 8..16 headings, no checkbox anywhere). When it crosses
    // into the build queue, src/lib/iron-loop.js appends the canonical
    // "## Execution Plan (Steps 8-16)" template, and THAT is the section the executor
    // ticks. `String.match` with /m returns the FIRST match, so extractStepBlocks read
    // the planner's prose twin, saw no `- [x]`, and reported every required step as an
    // unchecked checkbox — blocking a plan whose real record is fully ticked.
    const planPath = createPlan('review', 'both-sections',
      `---\napproved_by: human\n---\n\n# Both Sections\n\n${PROSE_EXEC_PLAN}\n\n${CANONICAL_EXEC_PLAN}`);

    const planMtimeMs = fs.statSync(planPath).mtimeMs;
    const evidencePath = verifyEvidencePath(testDir, 'both-sections');
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify({
      planSlug: 'both-sections',
      timestamp: new Date(planMtimeMs + 60000).toISOString(),
      passed: true,
      method: 'fallback-direct',
      checks: {},
      errors: [],
      summary: 'fixture run'
    }, null, 2));

    const result = validator.validateTransition(planPath, 'review', 'done', testDir);

    assert.ok(
      !result.errors.some((e) => /unchecked required checkbox/.test(e)),
      `the ticked canonical section must be the one read, errors: ${JSON.stringify(result.errors)}`,
    );
    assert.strictEqual(result.valid, true, `compliant plan must pass, errors: ${JSON.stringify(result.errors)}`);
    console.log('# review->done: a plan carrying BOTH execution sections is judged by the canonical one');
  });

  test('review->done: a prose-only execution section still fails every required step', () => {
    // 00255, the guard that keeps the fix honest. The SAME fixture with the canonical
    // section removed: no checkbox exists anywhere, so no step is complete. Preferring
    // the canonical section must never turn an un-ticked plan into a passing one.
    const planPath = createPlan('review', 'prose-only',
      `---\napproved_by: human\n---\n\n# Prose Only\n\n${PROSE_EXEC_PLAN}`);

    const planMtimeMs = fs.statSync(planPath).mtimeMs;
    const evidencePath = verifyEvidencePath(testDir, 'prose-only');
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify({
      planSlug: 'prose-only',
      timestamp: new Date(planMtimeMs + 60000).toISOString(),
      passed: true,
      method: 'fallback-direct',
      checks: {},
      errors: [],
      summary: 'fixture run'
    }, null, 2));

    const result = validator.validateTransition(planPath, 'review', 'done', testDir);

    assert.strictEqual(result.valid, false, 'a plan with no checkbox anywhere must not pass');
    // The refusal now states WHICH fact holds: these blocks hold no checkbox at all
    // (they are prose), which is a different cause — and a different fix — from an
    // open box. It names the section that was read so a wrong-section read is legible
    // from the refusal alone. Same verdict as before, stated precisely.
    assert.ok(
      result.errors.some((e) => /Step 14 \(VERIFY\) has no checkbox at all in the execution section read \(## Execution Plan\)/.test(e)),
      `an incomplete required step must be reported, errors: ${JSON.stringify(result.errors)}`,
    );
    console.log('# review->done: a prose-only execution section still fails every required step');
  });

  test('review->done: warns about TODO markers', () => {
    const planPath = createPlan('review', 'has-todos',
      '# Has TODOs\n\nTODO: fix this later.\n');

    const result = validator.validateTransition(planPath, 'review', 'done', testDir);

    assert.ok(result.warnings.some(w => /TODO|unresolved/i.test(w)), 'Should warn about TODOs');
    console.log('# review->done: warns about TODO markers');
  });

  // === validateTransition routing ===

  test('validateTransition handles unknown transitions gracefully', () => {
    const planPath = createPlan('functional', 'any-plan', '# Any Plan\n');

    const result = validator.validateTransition(planPath, 'done', 'functional', testDir);

    assert.strictEqual(result.valid, true, 'Unknown transitions pass by default');
    assert.strictEqual(result.errors.length, 0, 'No errors');
    console.log('# validateTransition handles unknown transitions gracefully');
  });

  // === formatValidationResult ===

  test('formatValidationResult shows PASSED for valid result', () => {
    const result = { valid: true, errors: [], warnings: [] };
    const output = validator.formatValidationResult(result);

    assert.ok(output.includes('PASSED'), 'Should show PASSED');
    console.log('# formatValidationResult shows PASSED for valid result');
  });

  test('formatValidationResult shows FAILED with errors', () => {
    const result = { valid: false, errors: ['Missing problem'], warnings: [] };
    const output = validator.formatValidationResult(result);

    assert.ok(output.includes('FAILED'), 'Should show FAILED');
    assert.ok(output.includes('Missing problem'), 'Should show error text');
    console.log('# formatValidationResult shows FAILED with errors');
  });

  test('formatValidationResult shows warnings', () => {
    const result = { valid: true, errors: [], warnings: ['Consider adding scope'] };
    const output = validator.formatValidationResult(result);

    assert.ok(output.includes('Consider adding scope'), 'Should show warning text');
    console.log('# formatValidationResult shows warnings');
  });
});

// ---------------------------------------------------------------------------
// validateStepLabels — structure-aware Iron Loop step-label gate.
//
// This gate runs on todo->in-progress (validateForExecution). Historically it
// ran whole-body `.test(content)` checks with no scoping, no code-fence
// stripping, and no order/positional analysis — producing confirmed
// false-accepts and one false-reject. These tests pin the fixed behaviour.
// ---------------------------------------------------------------------------
describe('validateStepLabels — structure-aware step-label gate', () => {
  const stepValidator = require('../src/lib/plan-validator.js');

  // A correctly-structured Execution Plan: steps 8-16, each exactly once, in
  // ascending order, canonical labels, a single IMPLEMENT.
  const WELL_FORMED = [
    '# Plan', '', '## Scope', 'Do the thing.', '',
    '## Execution Plan', '',
    '### Step 8: TEST', '- [ ] Write the failing tests first', '',
    '### Step 9: PREPARE', '- [ ] Prepare env', '',
    '### Step 10: IMPLEMENT', '- [ ] Implement', '',
    '### Step 11: REVIEW', '- [ ] Review', '',
    '### Step 12: OPTIMIZE', '- [ ] Optimize', '',
    '### Step 13: SECURE', '- [ ] Secure', '',
    '### Step 14: VERIFY', '- [ ] Run all tests', '',
    '### Step 15: DOCUMENT', '- [ ] Docs', '',
    '### Step 16: FINAL-REVIEW', '- [ ] Final', '',
  ].join('\n');

  // Regression guard: a well-formed plan must ACCEPT.
  test('regression: correctly-structured plan (8-16 in order, one IMPLEMENT) is ACCEPTED', () => {
    const result = stepValidator.validateStepLabels(WELL_FORMED);
    assert.strictEqual(result.valid, true,
      `Well-formed plan must pass. Errors: ${JSON.stringify(result.errors)}`);
    assert.strictEqual(result.errors.length, 0, 'No errors expected');
    console.log('# validateStepLabels regression: well-formed plan accepted');
  });

  // F1 FALSE ACCEPT — step ORDER never checked.
  test('F1: fully reversed step order (16..8) is REJECTED', () => {
    const reversed = [
      '## Execution Plan', '',
      '### Step 16: FINAL-REVIEW', '- [ ] Final', '',
      '### Step 15: DOCUMENT', '- [ ] Docs', '',
      '### Step 14: VERIFY', '- [ ] Run all tests', '',
      '### Step 13: SECURE', '- [ ] Secure', '',
      '### Step 12: OPTIMIZE', '- [ ] Optimize', '',
      '### Step 11: REVIEW', '- [ ] Review', '',
      '### Step 10: IMPLEMENT', '- [ ] Implement', '',
      '### Step 9: PREPARE', '- [ ] Prepare', '',
      '### Step 8: TEST', '- [ ] Write tests', '',
    ].join('\n');
    const result = stepValidator.validateStepLabels(reversed);
    assert.strictEqual(result.valid, false, 'Reversed-order plan must be rejected');
    assert.ok(result.errors.some(e => /order/i.test(e)),
      `Expected an out-of-order error. Got: ${JSON.stringify(result.errors)}`);
    console.log('# validateStepLabels F1: reversed order rejected');
  });

  // F2 FALSE ACCEPT — a wrong REAL heading hidden behind a prose mention.
  test('F2: wrong real Step-10 heading (DEPLOY) with an IMPLEMENT prose decoy is REJECTED', () => {
    const decoy = [
      '## Execution Plan', '',
      '### Step 8: TEST', '- [ ] Write tests', '',
      '### Step 9: PREPARE', '- [ ] Prepare', '',
      '### Step 10: DEPLOY', '- [ ] Ship it', '',
      '### Step 11: REVIEW', '- [ ] Review', '',
      '### Step 12: OPTIMIZE', '- [ ] Optimize', '',
      '### Step 13: SECURE', '- [ ] Secure', '',
      '### Step 14: VERIFY', '- [ ] Run all tests', '',
      '### Step 15: DOCUMENT', '- [ ] Docs', '',
      '### Step 16: FINAL-REVIEW', '- [ ] Final', '',
      '',
      '## Notes',
      'Remember that Step 10: IMPLEMENT is where all code changes belong.',
    ].join('\n');
    const result = stepValidator.validateStepLabels(decoy);
    assert.strictEqual(result.valid, false, 'Wrong real Step-10 heading must be rejected');
    assert.ok(result.errors.some(e => /Step 10.*wrong label/i.test(e)),
      `Expected a Step 10 wrong-label error. Got: ${JSON.stringify(result.errors)}`);
    console.log('# validateStepLabels F2: wrong real heading behind prose decoy rejected');
  });

  // F3 FALSE ACCEPT — the mandatory label lives ONLY inside a fenced code block.
  test('F3: Step 10 present only inside a ``` fence is REJECTED (missing)', () => {
    const fenced = [
      '## Execution Plan', '',
      '### Step 8: TEST', '- [ ] Write tests', '',
      '### Step 9: PREPARE', '- [ ] Prepare', '',
      '```markdown',
      '### Step 10: IMPLEMENT',
      '- [ ] This is only an EXAMPLE inside a fence, not a real step',
      '```',
      '',
      '### Step 11: REVIEW', '- [ ] Review', '',
      '### Step 12: OPTIMIZE', '- [ ] Optimize', '',
      '### Step 13: SECURE', '- [ ] Secure', '',
      '### Step 14: VERIFY', '- [ ] Run all tests', '',
      '### Step 15: DOCUMENT', '- [ ] Docs', '',
      '### Step 16: FINAL-REVIEW', '- [ ] Final', '',
    ].join('\n');
    const result = stepValidator.validateStepLabels(fenced);
    assert.strictEqual(result.valid, false, 'Fenced-only Step 10 must be rejected');
    assert.ok(result.errors.some(e => /Step 10.*missing/i.test(e)),
      `Expected a Step 10 missing error. Got: ${JSON.stringify(result.errors)}`);
    console.log('# validateStepLabels F3: fenced-only step rejected as missing');
  });

  // F4 FALSE ACCEPT — a duplicated non-IMPLEMENT step (two Step 14 headings).
  test('F4: duplicate Step 14 (VERIFY) headings are REJECTED', () => {
    const dup = [
      '## Execution Plan', '',
      '### Step 8: TEST', '- [ ] Write tests', '',
      '### Step 9: PREPARE', '- [ ] Prepare', '',
      '### Step 10: IMPLEMENT', '- [ ] Implement', '',
      '### Step 11: REVIEW', '- [ ] Review', '',
      '### Step 12: OPTIMIZE', '- [ ] Optimize', '',
      '### Step 13: SECURE', '- [ ] Secure', '',
      '### Step 14: VERIFY', '- [ ] Run all tests', '',
      '### Step 14: VERIFY', '- [ ] Run all tests again (duplicate!)', '',
      '### Step 15: DOCUMENT', '- [ ] Docs', '',
      '### Step 16: FINAL-REVIEW', '- [ ] Final', '',
    ].join('\n');
    const result = stepValidator.validateStepLabels(dup);
    assert.strictEqual(result.valid, false, 'Duplicate Step 14 must be rejected');
    assert.ok(result.errors.some(e => /Step 14.*exactly once|Step 14.*appears/i.test(e)),
      `Expected a Step 14 duplicate error. Got: ${JSON.stringify(result.errors)}`);
    console.log('# validateStepLabels F4: duplicate Step 14 rejected');
  });

  // F5 FALSE REJECT — a valid plan that merely MENTIONS "Step 10: IMPLEMENT" in prose.
  test('F5: valid plan mentioning "Step 10: IMPLEMENT" in prose is ACCEPTED', () => {
    const prose = [
      '## Execution Plan', '',
      '### Step 8: TEST', '- [ ] Write tests', '',
      '### Step 9: PREPARE', '- [ ] Prepare', '',
      '### Step 10: IMPLEMENT',
      '- [ ] All code changes go here; per policy Step 10: IMPLEMENT is the only build step',
      '',
      '### Step 11: REVIEW', '- [ ] Review', '',
      '### Step 12: OPTIMIZE', '- [ ] Optimize', '',
      '### Step 13: SECURE', '- [ ] Secure', '',
      '### Step 14: VERIFY', '- [ ] Run all tests', '',
      '### Step 15: DOCUMENT', '- [ ] Docs', '',
      '### Step 16: FINAL-REVIEW', '- [ ] Final', '',
    ].join('\n');
    const result = stepValidator.validateStepLabels(prose);
    assert.strictEqual(result.valid, true,
      `Prose mention must not over-count. Errors: ${JSON.stringify(result.errors)}`);
    console.log('# validateStepLabels F5: prose mention of IMPLEMENT accepted');
  });

  // Regression guard: an actual wrong label as the real heading still REJECTS.
  test('regression: bare wrong Step-10 label (DEPLOY as the real heading) is REJECTED', () => {
    const bare = WELL_FORMED.replace('### Step 10: IMPLEMENT', '### Step 10: DEPLOY');
    const result = stepValidator.validateStepLabels(bare);
    assert.strictEqual(result.valid, false, 'Bare wrong label must be rejected');
    assert.ok(result.errors.some(e => /Step 10.*wrong label/i.test(e)),
      `Expected a Step 10 wrong-label error. Got: ${JSON.stringify(result.errors)}`);
    console.log('# validateStepLabels regression: bare wrong label rejected');
  });
});

// ---------------------------------------------------------------------------
// Richest-evidence region selection — which "## Execution Plan" section IS the
// executor's build record.
//
// A plan legitimately carries TWO such sections: the implementation planner
// writes a prose one (all nine "### Step N" headings, few or no checkboxes), and
// src/lib/iron-loop.js appends the canonical checkbox template as a second one,
// which the executor ticks. Selecting by the section's NAME is brittle — the
// spelling has already drifted in live plans (EN DASH, "Steps 7-15", "Iron Loop
// Steps 8-16", "— Build Record"), and every miss makes the gate read the prose
// twin and refuse a plan whose real record is fully ticked.
//
// The discriminator is PER-STEP checkbox evidence: the number of step blocks
// holding at least one box. A raw checkbox-LINE count would let one verbose step
// block outrank a section covering all nine steps (fixture RICH_PROSE below is
// that exact shape, taken from a real plan).
// ---------------------------------------------------------------------------
describe('extractStepBlocks — richest-evidence execution region wins', () => {
  const validator = require('../src/lib/plan-validator.js');
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-exec-region-'));
    fs.mkdirSync(path.join(testDir, 'plans', 'review'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.ctoc'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // Write the plan plus a FRESH PASSING VERIFY evidence artifact, so the only
  // thing these tests can fail on is the step-block read.
  function gate3(slug, body) {
    const planPath = path.join(testDir, 'plans', 'review', `${slug}.md`);
    fs.writeFileSync(planPath, `---\napproved_by: human\n---\n\n# ${slug}\n\n${body}\n`);
    const mtime = fs.statSync(planPath).mtimeMs;
    const evidencePath = verifyEvidencePath(testDir, slug);
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, JSON.stringify({
      planSlug: slug,
      timestamp: new Date(mtime + 60000).toISOString(),
      passed: true,
      method: 'fallback-direct',
      checks: {},
      errors: [],
      summary: 'fixture run',
    }, null, 2));
    return validator.validateReviewToDone(planPath, testDir);
  }

  const checkboxRefusals = (result) => result.errors.filter((e) => /checkbox/i.test(e));

  // A ticked canonical record under an arbitrary heading spelling.
  const tickedUnder = (heading) => REVIEW_DONE_EXEC_PLAN.replace('## Execution Plan', heading);

  // The real shape of plans/review/00072-r1-per-request-ctoc-routing-hook.md: a
  // prose twin BACKFILLED with checkboxes under seven of nine steps (12 and 15
  // carry none), and deliberately MORE checkbox LINES (21) than the canonical
  // section has (9). Per-step evidence: 7 blocks vs 9 — the canonical section
  // must win. The prose twin's boxes include an OPEN one in every required step,
  // so if a raw line count picked it, every required step would refuse.
  const RICH_PROSE = (() => {
    const steps = [
      [8, 'TEST'], [9, 'PREPARE'], [10, 'IMPLEMENT'], [11, 'REVIEW'],
      [12, 'OPTIMIZE'], [13, 'SECURE'], [14, 'VERIFY'], [15, 'DOCUMENT'],
      [16, 'FINAL-REVIEW'],
    ];
    const lines = ['## Execution Plan', ''];
    for (const [num, name] of steps) {
      lines.push(`### Step ${num}: ${name}`);
      if (num === 12 || num === 15) {
        lines.push('Prose only — this block carries no checkbox at all.', '');
        continue;
      }
      lines.push(
        '- [x] Backfilled: the executor recorded this step as complete.',
        '- [x] Evidence lives in the Execution Log section of this plan.',
        '- [ ] Planner intent line that was never ticked.',
        '',
      );
    }
    return lines.join('\n');
  })();

  test('R1: a second section headed "## Execution Plan — Build Record" is the record read', () => {
    const result = gate3('build-record', `${PROSE_EXEC_PLAN}\n\n${tickedUnder('## Execution Plan — Build Record')}`);
    assert.deepStrictEqual(checkboxRefusals(result), [],
      `the ticked Build Record section must be the one read, errors: ${JSON.stringify(result.errors)}`);
    assert.strictEqual(result.valid, true, `plan must pass, errors: ${JSON.stringify(result.errors)}`);
  });

  test('R2: an EN DASH canonical heading "## Execution Plan (Steps 8–16)" is the record read', () => {
    // U+2013. Seven live sections in this repository use this spelling; the old
    // ASCII-hyphen name match missed every one of them.
    const result = gate3('en-dash', `${PROSE_EXEC_PLAN}\n\n${tickedUnder('## Execution Plan (Steps 8–16)')}`);
    assert.deepStrictEqual(checkboxRefusals(result), [],
      `the EN DASH section must be the one read, errors: ${JSON.stringify(result.errors)}`);
    assert.strictEqual(result.valid, true, `plan must pass, errors: ${JSON.stringify(result.errors)}`);
  });

  test('R3: evidence is counted per STEP BLOCK, not per checkbox LINE (21 lines/7 blocks loses to 9 lines/9 blocks)', () => {
    // The canonical record is under the EN DASH spelling so this case is RED against
    // the old name match too, not only against a raw-line-count discriminator.
    const result = gate3('per-step-count', `${RICH_PROSE}\n\n${tickedUnder('## Execution Plan (Steps 8–16)')}`);
    assert.deepStrictEqual(checkboxRefusals(result), [],
      `the 9-block canonical section must outrank the 21-line prose twin, errors: ${JSON.stringify(result.errors)}`);
    assert.strictEqual(result.valid, true, `plan must pass, errors: ${JSON.stringify(result.errors)}`);
  });

  test('R4: on EQUAL per-step evidence the LATER section wins (the build template is appended last)', () => {
    // Both candidates cover all nine steps, so evidence ties. The first carries an
    // OPEN Step 14 box, the second is fully ticked: only "last wins" passes.
    const first = REVIEW_DONE_EXEC_PLAN.replace(
      '- [x] All tests green, 0 skipped, 0 flaky',
      '- [ ] All tests green, 0 skipped, 0 flaky',
    );
    // BOTH headings are the bare "## Execution Plan", so no name match can separate
    // them and only the tie rule decides. The old code took the first.
    const result = gate3('tie-last-wins', `${first}\n\n${REVIEW_DONE_EXEC_PLAN}`);
    assert.deepStrictEqual(checkboxRefusals(result), [],
      `on a tie the LATER section must be read, errors: ${JSON.stringify(result.errors)}`);
    assert.strictEqual(result.valid, true, `plan must pass, errors: ${JSON.stringify(result.errors)}`);
  });

  test('R5: zero evidence anywhere — the FIRST section is still the one read (legacy behaviour)', () => {
    const result = gate3('prose-only-region', PROSE_EXEC_PLAN);
    assert.strictEqual(result.checklist.steps.step_14.present, true,
      'the prose section supplies the step blocks');
    assert.strictEqual(result.checklist.steps.step_14.completed, false,
      'a block with no checkbox is not complete');
    assert.strictEqual(result.valid, false, 'a plan with no checkbox anywhere must not pass');
    assert.ok(checkboxRefusals(result).length > 0,
      `required steps must still refuse, errors: ${JSON.stringify(result.errors)}`);
  });

  test('R6: a genuinely UNTICKED box still reads "has an unchecked required checkbox"', () => {
    const body = REVIEW_DONE_EXEC_PLAN.replace(
      '- [x] All tests green, 0 skipped, 0 flaky',
      '- [ ] All tests green, 0 skipped, 0 flaky',
    );
    const result = gate3('unticked-14', body);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes(
      'review→done blocked: Step 14 (VERIFY) has an unchecked required checkbox'),
      `exact wording must be unchanged, errors: ${JSON.stringify(result.errors)}`);
  });

  test('R7: a required block with NO checkbox reads a DISTINCT message naming the section heading', () => {
    const body = REVIEW_DONE_EXEC_PLAN.replace(
      '### Step 14: VERIFY\n- [x] All tests green, 0 skipped, 0 flaky',
      '### Step 14: VERIFY\nRan the suite; see the log below.',
    );
    const result = gate3('no-box-14', body);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.checklist.steps.step_14.hasCheckbox, false,
      'the checklist must record that the block held no checkbox');
    const step14 = result.errors.filter((e) => /Step 14 \(VERIFY\)/.test(e));
    assert.ok(step14.some((e) => /no checkbox/i.test(e) && /## Execution Plan/.test(e)),
      `expected a no-checkbox refusal naming the heading read, got: ${JSON.stringify(step14)}`);
    assert.ok(!step14.some((e) => /unchecked required checkbox/.test(e)),
      `the two facts must not share one message, got: ${JSON.stringify(step14)}`);
  });

  test('R8: a plan with no "## Execution Plan" section at all yields no step blocks', () => {
    const result = gate3('no-exec-section', '## Design\n\nProse only. No execution section exists.');
    for (const num of [8, 9, 10, 11, 13, 14, 16]) {
      assert.strictEqual(result.checklist.steps[`step_${num}`].present, false,
        `Step ${num} must have no block`);
      assert.ok(result.errors.includes(`Step ${num} (${{
        8: 'TEST', 9: 'PREPARE', 10: 'IMPLEMENT', 11: 'REVIEW',
        13: 'SECURE', 14: 'VERIFY', 16: 'FINAL-REVIEW',
      }[num]}) is required but not addressed`),
        `Step ${num} must be reported as not addressed, errors: ${JSON.stringify(result.errors)}`);
    }
    assert.deepStrictEqual(checkboxRefusals(result), [],
      'an absent block is its own message, not a checkbox refusal');
  });
});

describe('surviving mutants — one recorded place, checked when the build completes', () => {
  const ms = require('../src/lib/menu-screens');
  const taskRegistry = require('../src/lib/task-registry');
  const ledger = require('../src/lib/approval-ledger');
  const residency = require('../src/lib/approval-residency');
  const { findCoveringPlan } = require('../src/lib/plan-coverage');
  const { validateForReview } = require('../src/lib/plan-validator');
  const HEADER = '| Mutant | File and line | Change | Disposition |';
  const DELIM = '|---|---|---|---|';
  const EMPTY_ROW = '| M1 | src/lib/a.js:10 | x |  |';
  let root;

  beforeEach(() => {
    // Real path: on macOS the temporary folder is a symbolic link, and the coverage
    // check compares real paths.
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ctoc-mutants-')));
    for (const s of ['implementation', 'todo', 'in-progress', 'review', 'done']) {
      fs.mkdirSync(path.join(root, 'plans', s), { recursive: true });
    }
    for (const d of [['.ctoc', 'state'], ['.ctoc', 'logs'], ['.ctoc', 'approvals'], ['src'], ['tests']]) {
      fs.mkdirSync(path.join(root, ...d), { recursive: true });
    }
    fs.writeFileSync(path.join(root, 'src', 'thing.js'), 'module.exports = 1;\n');
    fs.writeFileSync(path.join(root, 'tests', 'example.test.js'), '// kills the mutant\n');
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  // A built plan: every step ticked, the criteria given, then the record when given.
  function planText({ criteria = ['- [x] the thing works'], record = null, extra = [] } = {}) {
    const lines = ['---', 'title: "A slice with a mutation run"', 'type: implementation',
      'files:', '  - "src/thing.js"', '---', '', '# A slice with a mutation run', '',
      '## Acceptance Criteria', '', ...criteria, '', REVIEW_DONE_EXEC_PLAN];
    if (record !== null) {
      lines.push('## Execution Record (Steps 8–16)', '', '### Surviving Mutants', '', ...record, '');
    }
    return [...lines, ...extra, ''].join('\n');
  }

  // A plan in the build with a running build task, as the scheduler leaves it.
  function building(slug, text) {
    const planPath = path.join(root, 'plans', 'in-progress', `${slug}.md`);
    fs.writeFileSync(planPath, text);
    const reg = taskRegistry.load(root);
    const task = taskRegistry.addTask(reg, { kind: 'implement', plan: slug, touches: ['src/thing.js'] });
    taskRegistry.updateTask(reg, task.id, { status: 'running' });
    taskRegistry.save(root, reg);
    return { planPath, taskId: task.id };
  }

  // The executor's own completion call, through the real router.
  const complete = (taskId) => ms.route(['menu', 'task', 'complete', taskId], root);

  // The new check's refusals only, read through the real completion validation.
  function mutantErrors(text) {
    const planPath = path.join(root, 'plans', 'in-progress', 'check-only.md');
    fs.writeFileSync(planPath, text);
    return validateForReview(planPath, root).errors.filter((e) => e.startsWith('Surviving mutant'));
  }

  const kickbackCounter = (slug) => JSON.parse(
    fs.readFileSync(path.join(root, '.ctoc', 'state', 'kickbacks', `${slug}.json`), 'utf8'));

  // --- scenarios 2, 3 and 5 to 8: the real completion route ---------------------

  test('a fully recorded table passes the completion and the plan moves to review', () => {
    const slug = 'fully-recorded';
    const { taskId } = building(slug, planText({ record: [HEADER, DELIM,
      '| M1 | src/thing.js:1 | `>=` became `>` | killed by tests/example.test.js — refuses a value equal to the limit |',
      '| M2 | src/thing.js:2 | the `trim` call removed | accepted: the only caller trims its input first |'] }));
    const res = complete(taskId);
    assert.strictEqual(res.ok, true, `completion must be accepted: ${res.text}`);
    assert.ok(fs.existsSync(path.join(root, 'plans', 'review', `${slug}.md`)), 'the plan is in review');
    assert.ok(!fs.existsSync(path.join(root, 'plans', 'in-progress', `${slug}.md`)), 'and no longer in in-progress');
    assert.doesNotMatch(res.text, /mutant/i);
  });

  test('a plan with a survivors heading and no rows is refused for the same reasons as before', () => {
    const { taskId } = building('no-rows', planText({
      criteria: ['- [x] the thing works', '- [ ] the other thing works'], record: [HEADER, DELIM] }));
    const res = complete(taskId);
    assert.strictEqual(res.ok, false);
    assert.match(res.text, /1 of 2 acceptance criteria not checked/);
    assert.doesNotMatch(res.text, /mutant/i);
  });

  test('a survivor with an empty Disposition refuses the completion and counts one Step 14 kickback', () => {
    const slug = 'empty-disposition';
    const { planPath, taskId } = building(slug, planText({ record: [HEADER, DELIM,
      '| M1 | src/lib/example.js:45 | `>=` became `>` |  |'] }));
    const res = complete(taskId);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.blocked, true);
    for (const part of ['src/lib/example.js:45', 'the Disposition is empty', 'killed by <test file>', 'accepted: <reason>']) {
      assert.ok(res.text.includes(part), `the refusal names "${part}": ${res.text}`);
    }
    assert.ok(fs.existsSync(planPath), 'the plan stays in in-progress');
    assert.ok(!fs.existsSync(path.join(root, 'plans', 'review', `${slug}.md`)));
    const counter = kickbackCounter(slug);
    assert.strictEqual(counter.total, 1);
    assert.strictEqual(counter.by_step['14'], 1);
    const task = taskRegistry.load(root).tasks.find((t) => t.id === taskId);
    assert.strictEqual(task.status, 'running');
  });

  test('a Disposition in neither form and an accepted without a reason are both named', () => {
    const { taskId } = building('two-faults', planText({ record: [HEADER, DELIM,
      '| M1 | src/lib/a.js:10 | x | fix later |',
      '| M2 | src/lib/b.js:20 | y | accepted: |'] }));
    const res = complete(taskId);
    assert.strictEqual(res.ok, false);
    for (const part of ['row 1 (src/lib/a.js:10)', '"fix later" is in neither accepted form',
      'row 2 (src/lib/b.js:20)', 'gives no reason']) {
      assert.ok(res.text.includes(part), `the refusal names "${part}": ${res.text}`);
    }
  });

  test('a killed-by naming a missing test file is named with that file', () => {
    const { taskId } = building('missing-file', planText({ record: [HEADER, DELIM,
      '| M1 | src/lib/a.js:10 | x | killed by tests/no-such-file.test.js |'] }));
    const res = complete(taskId);
    assert.strictEqual(res.ok, false);
    assert.ok(res.text.includes('row 1 (src/lib/a.js:10)'), res.text);
    assert.ok(res.text.includes('"tests/no-such-file.test.js", and no such file exists in the project'), res.text);
  });

  test('every open row is named and only the open rows', () => {
    const { taskId } = building('three-rows', planText({ record: [HEADER, DELIM,
      '| M1 | src/lib/a.js:10 | x |  |',
      '| M2 | src/lib/b.js:20 | y | accepted: both branches return the same value |',
      '| M3 | src/lib/c.js:30 | z |  |'] }));
    const res = complete(taskId);
    assert.strictEqual(res.ok, false);
    assert.ok(res.text.includes('row 1 (src/lib/a.js:10)'), res.text);
    assert.ok(res.text.includes('row 3 (src/lib/c.js:30)'), res.text);
    assert.ok(!res.text.includes('row 2'), 'the accepted row is not named');
    assert.ok(!res.text.includes('src/lib/b.js:20'), 'the accepted row is not named');
    assert.strictEqual(res.errors.filter((e) => e.startsWith('Surviving mutant')).length, 2);
  });

  // --- scenario 1: the approval and the write permission ------------------------

  function approvedThenBuilt(slug, appended) {
    const spec = planText();
    ledger.writeEntry(slug, { content: spec, stage_from: 'implementation', stage_to: 'todo', approved_by: 'human' }, root);
    const built = spec + appended;
    const planPath = path.join(root, 'plans', 'in-progress', `${slug}.md`);
    fs.writeFileSync(planPath, built);
    return { built, planPath };
  }
  const TABLE = [HEADER, DELIM, '| M1 | src/thing.js:1 | x | killed by tests/example.test.js — t |'].join('\n') + '\n';

  test('a survivors table inside the Execution Record keeps the approval and the next edit', () => {
    const slug = 'record-keeps-approval';
    const { built, planPath } = approvedThenBuilt(slug,
      '\n' + ['## Execution Record (Steps 8–16)', '', '### Surviving Mutants', ''].join('\n') + '\n' + TABLE);
    assert.strictEqual(ledger.verify(slug, built, 'todo', root), true);
    assert.strictEqual(residency.isApprovedForCoverage(planPath, 'in-progress', root).approved, true);
    assert.strictEqual(findCoveringPlan('src/thing.js', root).plan, `in-progress/${slug}`);
  });

  test('the same table under a top-level Surviving Mutants heading cancels the write permission', () => {
    const slug = 'top-level-cancels';
    const { built, planPath } = approvedThenBuilt(slug, '\n## Surviving Mutants\n\n' + TABLE);
    assert.strictEqual(ledger.verify(slug, built, 'todo', root), false);
    const verdict = residency.isApprovedForCoverage(planPath, 'in-progress', root);
    assert.strictEqual(verdict.approved, false);
    assert.strictEqual(verdict.reason, 'hash-mismatch');
    assert.strictEqual(findCoveringPlan('src/thing.js', root), null);
  });

  // --- scenario 4: the two agent files ------------------------------------------

  const sliceOf = (relPath, from, to) => {
    const text = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
    const a = text.indexOf(from);
    const b = text.indexOf(to);
    assert.ok(a >= 0, `${relPath} holds ${JSON.stringify(from)}`);
    assert.ok(b > a, `${relPath} holds ${JSON.stringify(to)} after it`);
    return text.slice(a, b);
  };

  test("the executor's instructions name the place, its columns, both dispositions and the every-survivor rule", () => {
    const slice = sliceOf('agents/iron-loop/iron-loop-executor.md',
      '\n## Surviving mutants — the one place to record them\n', '\n## Step Execution\n');
    for (const part of ['`### Surviving Mutants`', '`## Execution Record`',
      '| Mutant | File and line | Change | Disposition |',
      '`killed by <test file> — <test name>`', '`accepted: <reason>`',
      'record every mutant that survived the run, not only the ones a report lists',
      'Write the table as plain lines, never inside a code fence.',
      'Never start a line in the Execution Record with `# `',
      'checks only that the path exists']) {
      assert.ok(slice.includes(part), `the executor's section holds ${part}`);
    }
  });

  test('the integrator names the place in a step that runs mutation testing', () => {
    const slice = sliceOf('agents/iron-loop/iron-loop-integrator.md',
      '\n### Steps that run mutation testing\n', '\n### Single Responsibility\n');
    for (const part of ['`### Surviving Mutants`', '`## Execution Record`', 'runs mutation testing']) {
      assert.ok(slice.includes(part), `the integrator's subsection holds ${part}`);
    }
  });

  // --- scenario 3 and the parser, through the same validateForReview ------------

  test('no heading, a heading with prose only, and a heading with a header-only table give the verdict of a plan without the change', () => {
    const planPath = path.join(root, 'plans', 'in-progress', 'verdict.md');
    const run = (text) => { fs.writeFileSync(planPath, text); return validateForReview(planPath, root); };
    for (const criteria of [['- [x] the thing works'], ['- [x] the thing works', '- [ ] the other thing works']]) {
      const baseline = run(planText({ criteria })).errors;
      for (const record of [null, ['None survived.'], [HEADER, DELIM]]) {
        const result = run(planText({ criteria, record }));
        assert.deepStrictEqual(result.errors, baseline);
        if (criteria.length === 1) {
          assert.strictEqual(result.valid, true);
          assert.deepStrictEqual(result.errors, []);
        }
      }
    }
  });

  // pin: the row scan is linear (column positions found once, backtick runs indexed once); the verdict is unchanged
  test('a pipe inside a code span or written as an escaped pipe does not split a cell', () => {
    const rows = [
      '| M1 | src/thing.js:1 | `a|b` became `a&b` | accepted: the value is never read |',
      '| M2 | src/thing.js:2 | `a \\| b` | killed by tests/example.test.js — t |',
      '| M3 | src/thing.js:3 | a \\| b outside code | accepted: the value is never read |',
      '| M4 | src/thing.js:4 | ``x`|`y`` | accepted: the value is never read |',
    ];
    assert.deepStrictEqual(mutantErrors(planText({ record: [HEADER, DELIM, ...rows] })), []);
  });

  test('a row missing a middle cell takes its last cell as the Disposition', () => {
    assert.deepStrictEqual(mutantErrors(planText({ record: [HEADER, DELIM,
      '| M1 | src/thing.js:1 | killed by tests/example.test.js — t |'] })), []);
  });

  test('a row wrapped over two lines is named with its cell count, and the rows after it are still read', () => {
    const errors = mutantErrors(planText({ record: [HEADER, DELIM,
      '| M1 | src/lib/a.js:10 | changed the',
      'comparison | accepted: equivalent |',
      '| M2 | src/lib/b.js:20 | y |  |'] }));
    assert.strictEqual(errors.length, 2, JSON.stringify(errors));
    assert.ok(errors[0].includes('row 1 (src/lib/a.js:10)'), errors[0]);
    assert.ok(errors[0].includes('"changed the" is in neither accepted form'), errors[0]);
    assert.ok(errors[0].includes('(the row has 3 cells where the table has 4 columns)'), errors[0]);
    assert.ok(errors[1].includes('row 2 (src/lib/b.js:20)'), errors[1]);
    assert.ok(errors[1].includes('the Disposition is empty'), errors[1]);
  });

  test('a survivors table inside a fenced example is never read', () => {
    const example = ['## Execution Record', '', '### Surviving Mutants', '', HEADER, DELIM, EMPTY_ROW];
    const fences = [
      ['```markdown', ...example, '```'],
      ['````markdown', '```', ...example, '```', '````'],
      ['~~~markdown', '```', ...example, '```', '~~~'],
      ['~~~text `x`', ...example, '~~~'],                    // a tilde fence may carry any text after its run
    ];
    for (const extra of fences) {
      assert.deepStrictEqual(mutantErrors(planText({ extra })), [], `fence ${extra[0]}`);
    }
  });

  test('a fence that never closes does not hide the record after it', () => {
    const errors = mutantErrors(planText({ record: ['```text',
      'ok 1 - refuses a value equal to the limit', HEADER, DELIM, EMPTY_ROW] }));
    assert.strictEqual(errors.length, 1, JSON.stringify(errors));
    assert.ok(errors[0].includes('row 1 (src/lib/a.js:10)'), errors[0]);
    assert.ok(errors[0].includes('the Disposition is empty'), errors[0]);
  });

  test('pasted test-runner summary lines in the record do not close the place', () => {
    const summary = ['# tests 26', '# pass 26', '# fail 0'];
    const second = '| M2 | src/lib/b.js:20 | y |  |';
    // plain lines after the table, then another open row
    const plain = mutantErrors(planText({ record: [HEADER, DELIM, EMPTY_ROW, '', ...summary, second] }));
    assert.strictEqual(plain.length, 2, JSON.stringify(plain));
    assert.ok(plain[0].includes('row 1 (src/lib/a.js:10)') && plain[1].includes('row 2 (src/lib/b.js:20)'), JSON.stringify(plain));
    // the same lines inside a fence that is never closed
    const open = mutantErrors(planText({ record: [HEADER, DELIM, EMPTY_ROW, '```text', ...summary, second] }));
    assert.strictEqual(open.length, 2, JSON.stringify(open));
    // summary lines before the table
    const before = mutantErrors(planText({ record: [...summary, HEADER, DELIM, EMPTY_ROW] }));
    assert.strictEqual(before.length, 1, JSON.stringify(before));
  });

  test('a table without a delimiter row is refused, naming the place and the missing row', () => {
    for (const record of [[HEADER, EMPTY_ROW], [EMPTY_ROW], [HEADER]]) {
      const errors = mutantErrors(planText({ record }));
      assert.strictEqual(errors.length, 1, `${JSON.stringify(record)}: ${JSON.stringify(errors)}`);
      assert.ok(errors[0].includes('no delimiter row'), errors[0]);
      assert.ok(errors[0].includes('### Surviving Mutants') && errors[0].includes('## Execution Record'), errors[0]);
    }
  });

  test('a fence closes only on a line of the same fence character, at least as long, with nothing else', () => {
    const example = ['## Execution Record', '', '### Surviving Mutants', '', HEADER, DELIM, EMPTY_ROW];
    const fences = [
      ['```markdown', '```js', ...example, '```'],          // an info string never closes
      ['```markdown', '``` still open', ...example, '```'], // text after the run never closes
      ['````markdown', '```', ...example, '````'],          // a shorter run never closes
      ['```markdown', '~~~', ...example, '```'],            // the other fence character never closes
      ['~~~markdown', '```', ...example, '~~~'],
      ['```markdown', ...example, '```   '],                // trailing spaces are allowed on the closer
    ];
    for (const extra of fences) {
      assert.deepStrictEqual(mutantErrors(planText({ extra })), [], `fence ${extra.slice(0, 2).join(' / ')}`);
    }
  });

  // pin: the row scan is linear (column positions found once, backtick runs indexed once); the verdict is unchanged
  test('a backtick with no closing run on the line does not swallow the pipes after it', () => {
    const errors = mutantErrors(planText({ record: [HEADER, DELIM,
      '| M1 | src/thing.js:1 | a ` b | accepted: the value is never read |',
      '| M2 | src/thing.js:2 | ``x` | accepted: the value is never read |'] }));
    assert.deepStrictEqual(errors, []);
  });

  test('a row with more cells than the table has columns is named with its cell count', () => {
    const errors = mutantErrors(planText({ record: [HEADER, DELIM,
      '| M1 | src/lib/a.js:10 | a|b | accepted: the value is never read |'] }));
    assert.strictEqual(errors.length, 1, JSON.stringify(errors));
    assert.ok(errors[0].includes('row 1 (src/lib/a.js:10)'), errors[0]);
    assert.ok(errors[0].includes('(the row has 5 cells where the table has 4 columns)'), errors[0]);
  });

  test('a killed-by with a line number after the file is read as that file', () => {
    assert.deepStrictEqual(mutantErrors(planText({ record: [HEADER, DELIM,
      '| M1 | src/thing.js:1 | x | killed by tests/example.test.js:12 — t |'] })), []);
  });

  test("a survivors heading outside the Execution Record is not read, this plan's own title included", () => {
    const extra = [
      '# Surviving mutants from mutation testing have a recorded place in the plan', '',
      '## Surviving Mutants', '', HEADER, DELIM, EMPTY_ROW, '',
      '## Notes', '', '### Surviving Mutants', '', HEADER, DELIM, EMPTY_ROW,
    ];
    assert.deepStrictEqual(mutantErrors(planText({ extra })), []);
  });

  test('the place ends at a sibling heading and the record ends at the next top-level heading', () => {
    // The no-space lines sit before an open row inside the place: if one were read as a
    // heading of level 3 or less it would close the place and the open row would go unread.
    const record = [HEADER, DELIM, '| M1 | src/thing.js:1 | x | accepted: nothing observes it |', '',
      '#not-a-heading', '###not-a-heading', EMPTY_ROW, '### Step 14 numbers', '', HEADER, DELIM,
      '| M3 | src/lib/c.js:30 | z |  |'];
    const extra = ['## Notes', '', '#### Surviving Mutants', '', HEADER, DELIM, '| M4 | src/lib/d.js:40 | w |  |'];
    const errors = mutantErrors(planText({ record, extra }));
    assert.strictEqual(errors.length, 1, JSON.stringify(errors));
    assert.ok(errors[0].includes('row 2 (src/lib/a.js:10)'), errors[0]);
  });

  // pin: the row scan is linear (column positions found once, backtick runs indexed once); the verdict is unchanged
  test('a table without a Disposition column names each of its rows', () => {
    const errors = mutantErrors(planText({ record: ['| Mutant | File and line | Change |', '|---|---|---|',
      '| M1 | src/lib/a.js:10 | x |'] }));
    assert.strictEqual(errors.length, 1, JSON.stringify(errors));
    assert.ok(errors[0].includes('row 1 (src/lib/a.js:10)'), errors[0]);
    assert.ok(errors[0].includes('has no Disposition column'), errors[0]);
  });

  // pin: the row scan is linear (column positions found once, backtick runs indexed once); the verdict is unchanged
  test('a row with neither a file nor a mutant name is named by its number alone', () => {
    const errors = mutantErrors(planText({ record: ['| Change | Disposition |', '|---|---|', '| x |  |'] }));
    assert.strictEqual(errors.length, 1, JSON.stringify(errors));
    assert.ok(errors[0].startsWith('Surviving mutant row 1: the Disposition is empty'), errors[0]);
  });

  // pin: the row scan is linear (column positions found once, backtick runs indexed once); the verdict is unchanged
  test('the forms are read without regard to letter case, bold headers or backticks', () => {
    assert.deepStrictEqual(mutantErrors(planText({ record: [
      '| **Mutant** | **File and line** | **Change** | **Disposition** |', DELIM,
      '| M1 | src/thing.js:1 | x | Killed by `tests/example.test.js` — t |',
      '| M2 | src/thing.js:2 | y | Accepted: equivalent, shown by a test with both values |'] })), []);
  });

  test('a second Execution Record with its own survivors table is read too', () => {
    const record = [HEADER, DELIM, '| M1 | src/thing.js:1 | x | accepted: nothing observes it |'];
    const extra = ['## Execution Record — second run', '', '### Surviving Mutants — Step 14 run', '',
      HEADER, DELIM, '| M9 | src/lib/z.js:99 | q |  |'];
    const errors = mutantErrors(planText({ record, extra }));
    assert.strictEqual(errors.length, 1, JSON.stringify(errors));
    assert.ok(errors[0].includes('row 2 (src/lib/z.js:99)'), errors[0]);
  });

  test('quoted plan text loses control characters and is cut to 120 characters', () => {
    const long = mutantErrors(planText({ record: [HEADER, DELIM, `| M1 | src/lib/a.js:10 | x | ${'x'.repeat(300)} |`] }));
    assert.strictEqual(long.length, 1);
    assert.ok(long[0].includes('x'.repeat(120) + '…'), long[0]);
    assert.ok(!long[0].includes('x'.repeat(121)), 'the quote is cut at 120 characters');
    const ctl = mutantErrors(planText({ record: [HEADER, DELIM, '| M1 | src/lib/a.js:10 | x | fix\u0007 later |'] }));
    assert.strictEqual(ctl.length, 1);
    assert.ok(ctl[0].includes('"fix later"'), JSON.stringify(ctl[0]));
  });

  test('a plan with Windows line endings gets the same verdict', () => {
    const text = planText({ record: [HEADER, DELIM, '| M1 | src/lib/example.js:45 | x |  |'] });
    const lf = mutantErrors(text);
    const crlf = mutantErrors(text.replace(/\n/g, '\r\n'));
    assert.strictEqual(lf.length, 1);
    assert.deepStrictEqual(crlf, lf);
  });

  test('a killed-by path cannot climb out of the project', () => {
    const errors = mutantErrors(planText({ record: [HEADER, DELIM,
      '| M1 | src/lib/a.js:10 | x | killed by ../../../../etc/hosts |',
      '| M2 | src/lib/b.js:20 | y | killed by /etc/hosts |'] }));
    assert.strictEqual(errors.length, 2, JSON.stringify(errors));
    for (const e of errors) assert.ok(e.includes('no such file exists in the project'), e);
  });

  // --- second fix round: re-review and security scan -----------------------------

  test('a backtick line whose info string holds a backtick is inline code, not a fence', () => {
    const errors = mutantErrors(planText({
      record: ['```npm test``` gave pass 26', HEADER, DELIM, EMPTY_ROW], extra: ['```', 'x', '```'] }));
    assert.strictEqual(errors.length, 1, JSON.stringify(errors));
    assert.ok(errors[0].includes('row 1 (src/lib/a.js:10)'), errors[0]);
  });

  test('thousands of fence openers that never close do not hide the record, and the fence scan reads each line a bounded number of times', () => {
    const record = [...Array(1500).fill('```x'), ...Array(1500).fill('~~~x'), HEADER, DELIM, EMPTY_ROW];
    const text = planText({ record });
    const planPath = path.join(root, 'plans', 'in-progress', 'many-openers.md');
    fs.writeFileSync(planPath, text);
    const result = validateForReview(planPath, root);
    const errors = result.errors.filter((e) => e.startsWith('Surviving mutant'));
    assert.strictEqual(errors.length, 1, JSON.stringify(errors));
    assert.ok(errors[0].includes('row 1 (src/lib/a.js:10)'), errors[0]);
    const read = result.checklist.survivingMutants.fenceLinesRead;
    const lineCount = text.split(/\r?\n/).length;
    assert.ok(read <= 4 * lineCount, `the fence scan read ${read} lines of ${lineCount}`);
  });

  test('a killed-by path holding a NUL is named, and the completion is refused, not crashed', () => {
    const slug = 'nul-path';
    const { taskId } = building(slug, planText({ record: [HEADER, DELIM,
      '| M1 | src/lib/a.js:10 | x | killed by tests/no-such\u0000file.test.js |'] }));
    const res = complete(taskId);
    assert.strictEqual(res.ok, false);
    assert.ok(res.text.includes('row 1 (src/lib/a.js:10)'), res.text);
    assert.ok(res.text.includes('"tests/no-suchfile.test.js", and no such file exists in the project'), res.text);
    assert.ok(!res.text.includes(root), 'the refusal does not carry the project root');
    assert.ok(!res.text.includes('safe-fs'), 'the refusal does not carry an internal error');
    const counter = kickbackCounter(slug);
    assert.strictEqual(counter.total, 1);
    assert.strictEqual(counter.by_step['14'], 1);
  });

  test('quoted plan text loses direction overrides, zero-width and separator characters', () => {
    const cells = ['fix\u202Elater', 'fix\u2028later', 'fix\u2066\u200F\uFEFF\u200B\u2800later'];
    const errors = mutantErrors(planText({ record: [HEADER, DELIM,
      ...cells.map((c, i) => `| M${i + 1} | src/lib/a${i}.js:10 | x | ${c} |`)] }));
    assert.strictEqual(errors.length, 3, JSON.stringify(errors));
    for (const e of errors) {
      assert.ok(e.includes('"fixlater" is in neither accepted form'), JSON.stringify(e));
      assert.doesNotMatch(e, /[\u200B\u200F\u2028\u2029\u202E\u2066\u2800\uFEFF]/);
    }
  });

  // --- final-review fix round ---------------------------------------------------

  test('an accepted reason or a whole Disposition made only of invisible characters gives no reason', () => {
    const errors = mutantErrors(planText({ record: [HEADER, DELIM,
      '| M1 | src/lib/a.js:10 | x | accepted: ​ |',
      '| M2 | src/lib/b.js:20 | y | accepted: ⠀ |',
      '| M3 | src/lib/c.js:30 | z | ​ |'] }));
    assert.strictEqual(errors.length, 3, JSON.stringify(errors));
    assert.ok(errors[0].includes('row 1 (src/lib/a.js:10)') && errors[0].includes('gives no reason'), errors[0]);
    assert.ok(errors[1].includes('row 2 (src/lib/b.js:20)') && errors[1].includes('gives no reason'), errors[1]);
    assert.ok(errors[2].includes('row 3 (src/lib/c.js:30)') && errors[2].includes('the Disposition is empty'), errors[2]);
  });

  test('the fence scan resumes after a closer: a line inside a closed fence is not read as an opener', () => {
    const errors = mutantErrors(planText({
      record: ['~~~text', '```js', '~~~', HEADER, DELIM, EMPTY_ROW], extra: ['```'] }));
    assert.strictEqual(errors.length, 1, JSON.stringify(errors));
    assert.ok(errors[0].includes('row 1 (src/lib/a.js:10)'), errors[0]);
  });

  test('a record of 150,000 open rows is refused, not crashed', () => {
    const rows = Array(150000).fill('| M | a.js:1 | x |  |').join('\n');
    const planPath = path.join(root, 'plans', 'in-progress', 'huge-record.md');
    fs.writeFileSync(planPath, planText({ record: [HEADER, DELIM, '@@ROWS@@'] }).replace('@@ROWS@@', () => rows));
    let result;
    assert.doesNotThrow(() => { result = validateForReview(planPath, root); });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.filter((e) => e.startsWith('Surviving mutant')).length, 150000);
  });
});

console.log('\nPlan Validator Tests');
console.log('====================\n');
