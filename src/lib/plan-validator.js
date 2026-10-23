/**
 * Plan Validator
 * Enforces validation gates before plans can move between stages.
 * Addresses: executor autonomy issues, missing validation, instruction adherence.
 */

const safeFs = require('./safe-fs');
const { safeRegExp } = require('./regex-utils');
const path = require('path');
const { parseMetadata } = require('./state');
const { findProjectRoot } = require('./project-root');
const { extractFrontmatterRegion, parseFilesField } = require('./stale-detector');
const { readVerifyEvidence } = require('./step-13-verify');
const { checkPlanDeclaresCountMovers } = require('./documented-counts');

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - Blocking errors (must fix)
 * @property {string[]} warnings - Non-blocking warnings
 * @property {Object} checklist - Checklist items with status
 */

/**
 * Step status that requires escalation
 */
const ESCALATION_STATUSES = ['SKIPPED', 'BLOCKED', 'DEFERRED'];

/**
 * A status word counts only when the plan DECLARES it as the state of a step —
 * never when the plan merely MENTIONS it in prose.
 *
 * A plain `\b` is NOT sufficient and that is the entire reason this helper
 * exists: in `zero-skipped` the character before `skipped` is a hyphen, a
 * NON-word character, so a word boundary exists there and `/\bskipped\b/i`
 * matches. A plan's own honest prose about the "zero-skipped gate" was therefore
 * read as an unapproved skipped step and its completion was refused — until the
 * author reworded the plan to get past the validator. A gate that is defeated by
 * rewording measures the wording, not the work, and every reword makes the next
 * plan's prose a little less true.
 *
 * Three rules, all necessary; each was derived from prose this repository's own
 * plans actually contain:
 *
 *   BEFORE   excludes a word character, a hyphen and a dot, so `zero-skipped`,
 *            `no-skipped`, `parseSkipped` and `result.skipped` are prose.
 *   AFTER    excludes a word character, a hyphen and an opening bracket, so
 *            `skipped-tests` and the identifier `skipped[]` are prose. A
 *            PARENTHESIS is deliberately NOT excluded: `SKIPPED (no hot path)`
 *            is a real declaration and must still be caught.
 *   QUANTIFIED  suppresses a count or a negation immediately before the word —
 *            `0 skipped`, `zero skipped`, `no skipped`, `not skipped`. Only the
 *            literal `0` is treated as a count, never `\d+`: a step number is
 *            never 0, but `Step 12 SKIPPED` is a legitimate declaration whose
 *            preceding token IS a number, and a `\d+` rule would silently
 *            swallow it.
 *
 * KNOWN AND DELIBERATE GAP: a NON-ZERO count ("3 skipped") is still read as a
 * declaration. It is indistinguishable in shape from `Step 12 SKIPPED`, and a
 * run that really did skip 3 tests is a genuine problem worth surfacing.
 *
 * These three rules are NOT the whole fix, and the second half is `maskQuotedSpans`
 * below. The boundary rules handle the COMPOUND and QUANTIFIED forms; they cannot
 * help a BARE standalone word, and a plan whose subject IS the skip counter has to
 * be able to QUOTE that counter's label. Two different problems, both necessary,
 * neither replacing the other.
 */
const STATUS_BOUNDARY_BEFORE = '(?<![\\w\\-.])';
const STATUS_BOUNDARY_AFTER = '(?![\\w\\-\\[])';
const STATUS_NOT_QUANTIFIED = '(?<!\\b(?:0|no|non|not|zero)\\s{1,4})';

/**
 * Build the pattern fragment that matches `word` as a DECLARED status.
 *
 * `word` is always a code-controlled literal from this module (an escalation
 * status, `NOT APPLICABLE`, or the `SKIP(?:PED)?` stem) — never plan input — so
 * it is embedded directly. Never pass user- or file-derived text here without
 * `escapeRegExp`.
 *
 * The construct is a pair of fixed-width negative assertions plus one bounded
 * (`\s{1,4}`) negative lookbehind; there is no quantified group that can
 * backtrack, so it adds no catastrophic-backtracking path.
 *
 * @param {string} word - the status word or alternation to bound
 * @returns {string} a RegExp source fragment
 */
function statusWordPattern(word) {
  return `${STATUS_BOUNDARY_BEFORE}${STATUS_NOT_QUANTIFIED}${word}${STATUS_BOUNDARY_AFTER}`;
}

// Invariant probes, compiled ONCE at module load rather than per step per plan.
// Both are non-global, so they hold no `lastIndex` state between `.test()`
// calls and are safe to share. The `g`-flagged patterns below stay local to
// their call sites precisely because they DO carry `lastIndex`.
const DECLARED_SKIPPED_RE = safeRegExp(statusWordPattern('SKIPPED'), 'i');
const DECLARED_NOT_APPLICABLE_RE = safeRegExp(statusWordPattern('NOT APPLICABLE'), 'i');

/**
 * Spans whose contents are a MENTION, never a claim. Compiled once at module
 * load; every one is linear (bounded delimiter runs, no nested quantifier, the
 * content class excludes its own delimiter so there is no backtracking path).
 *
 * Fences may span lines — a fenced example of a step declaration is still an
 * example. Inline code and quotations are deliberately SINGLE-LINE: a stray
 * backtick or quote must not open a span that swallows the rest of the document
 * and silently switches the checker off (see D-3 below and its test).
 */
const MASKED_SPAN_PATTERNS = [
  safeRegExp('```[\\s\\S]*?```', 'g'),
  safeRegExp('~~~[\\s\\S]*?~~~', 'g'),
  safeRegExp('(`{1,3})[^`\\n]*?\\1', 'g'),
  safeRegExp('"[^"\\n]*"', 'g'),
  safeRegExp('“[^”\\n]*”', 'g')
];

/** Every character except a line break; used to blank a span in place. */
const NON_NEWLINE_RE = /[^\n\r]/g;

// The two end-anchored boundary tests Pattern 1 runs per match. Compiled once at
// module level because the contradiction scan runs on every gate check and a
// regex literal inside the loop is re-created on every evaluation. Neither
// carries the `g` flag, so neither carries `lastIndex` and the reuse hazard the
// note above MASKED_SPAN_PATTERNS warns about does not apply.
/** Did the match consume a trailing code/quote delimiter? */
const TRAILING_DELIMITER_RE = /[`"]$/;
/** Is the verb genuinely SEPARATED from the path it claims? */
const PATH_SEPARATED_RE = /[:\s`"]$/;

/**
 * A captured token is a FILE only if it can be one: it carries a path separator,
 * or its final suffix is a real file extension. `d.push`, `stat.birthtime` and
 * `this.scannersRun` are member expressions cited in prose and fail both tests.
 *
 * The set is the union of the extensions the parent plan names and the ones this
 * repository's plans actually DECLARE in `files:` (`template` and `gitkeep` are
 * the two the derivation added). Adding an extension only ever makes the check
 * STRICTER, so this list is a ratchet: extend it, never trim it. Trimming it to
 * the extensions this repository happens to declare would silence a genuine
 * missing-file claim in every downstream project that declares another — a false
 * green manufactured while fixing a false red, the worse of the two failures.
 */
const FILE_EXTENSIONS = Object.freeze(new Set([
  'js', 'mjs', 'cjs', 'ts', 'md', 'json', 'yaml', 'yml',
  'txt', 'sh', 'py', 'html', 'css', 'template', 'gitkeep'
]));

/**
 * Could this Pattern 1 capture name a file at all?
 *
 * The separator test is deliberately first and deliberately covers the
 * backslash: `declaredFileExistsUnder` splits a declared path on either
 * separator, so the plausibility rule must agree with it. `lastIndexOf`
 * returning -1 needs no branch — `slice(0)` yields the whole token, which is not
 * in the set — and a dotless token cannot reach here anyway, because the capture
 * requires a dot.
 *
 * @param {string} token - a Pattern 1 capture
 * @returns {boolean} true if the token could name a file
 */
function isPathPlausible(token) {
  if (token.includes('/') || token.includes('\\')) return true;
  return FILE_EXTENSIONS.has(token.slice(token.lastIndexOf('.') + 1).toLowerCase());
}

/**
 * A PLACEHOLDER as a whole part of a file name: a less-than sign, at least one
 * character that is neither sign nor a slash or backslash, then a greater-than
 * sign, at the start of the name or right after a dot, hyphen or underscore, and
 * followed by the end of the name or a dot, hyphen or underscore.
 *
 * Linear: an attempt passes the left boundary only at a less-than sign, and the
 * run after it stops at the next sign, slash or backslash, so the runs of two
 * attempts never overlap. No `g` flag, so `.test` keeps no `lastIndex` between
 * calls.
 */
const PLACEHOLDER_PART_RE = /(?:^|[._-])<([^<>\\/]+)>(?:[._-]|$)/;

/**
 * Inline HTML tag names. A plan written as HTML wraps a path in one of these
 * (`<code>.eslintrc.json</code>`), the tag lands in the capture, and with the file
 * name beginning with a dot, underscore or hyphen it would read as a placeholder
 * and hide a real claim. A one-letter placeholder such as `<b>` is therefore read
 * as a tag: a false refusal, never a hidden claim.
 */
const INLINE_HTML_TAGS = Object.freeze(new Set([
  'code', 'kbd', 'samp', 'var', 'tt', 'b', 'i', 'em', 'strong', 'span', 'br', 'wbr'
]));

/**
 * Does a Pattern 1 or Pattern 2 capture name a file only at run time?
 *
 * A plan writes a name that exists only at run time as a placeholder. Slice 7 of
 * the four-defects round claims a file the answer route makes once per answer, in
 * a placeholder folder under a placeholder file name, and its completion was
 * refused for that path (2026-10-12). Such a capture names no file on disk, so it
 * is not a claim.
 *
 * Only the FILE NAME is read. A placeholder in a folder part, an HTML tag glued in
 * front of a path, or a line-break tag joining two paths still leaves a real file
 * name at the end of the capture, and that claim is still checked. A lone sign, a
 * reversed pair, an empty pair and a pair glued inside a word are not placeholders.
 *
 * `path.win32.basename` takes the last part after either separator on every
 * platform, as `declaredFileExistsUnder` and `isPathPlausible` treat both; the
 * POSIX `path.basename` keeps a backslash-separated folder in the name, and the
 * same plan would read differently on Windows.
 *
 * @param {string} capture - a Pattern 1 or Pattern 2 capture
 * @returns {boolean} true if the capture's file name holds a whole-part placeholder
 */
function isPlaceholderName(capture) {
  const match = PLACEHOLDER_PART_RE.exec(path.win32.basename(capture));
  return match !== null && !INLINE_HTML_TAGS.has(match[1].toLowerCase());
}

// An inline code span that contains a CALL is a citation of code, never a file
// claim. Only spans containing an open parenthesis are blanked: a span citing a
// plain path is left visible, so a real claim written in backticks still
// validates. Single-line by construction (the content class excludes the
// delimiter and the newline), so a stray backtick can never open a span that
// swallows the document and switches the checker off.
const INLINE_CALL_SPAN_RE = safeRegExp('(`{1,3})[^`\\n]*?\\([^`\\n]*?\\1', 'g');

/**
 * Blank out the contents of coded and quoted spans, preserving LENGTH exactly.
 *
 * A status word inside inline code or a quotation is a MENTION, not a claim, and
 * scanning it produced blocking errors on plans that were merely honest about the
 * quality gate. Three real builds were refused for a step line quoting the
 * counter label the test runner prints — the offending text was inside backticks —
 * and each author reworded their own plan to get through. A gate that is defeated
 * by rewording measures the wording, not the work.
 *
 * This is the same discipline `validateNoContradictions` already ships (it strips
 * fenced blocks before scanning, for exactly this reason), extended to the two
 * other scanners in this file that match a status word, and widened from fences to
 * inline code and quotations because that is what the corpus actually contains.
 *
 * Three properties are load-bearing, each pinned by a test:
 *
 *   LENGTH IS PRESERVED. Three consumers report a step number parsed out of the
 *     same line. A mask that shortened the text would move the offsets and name
 *     the WRONG step — a checker that names the wrong step is worse than one that
 *     names none. Line breaks are preserved too, so a masked span can never join
 *     two lines and let a `[^\n]`-scoped pattern match across them.
 *   ONLY BALANCED PAIRS COUNT. An unmatched backtick or quote masks NOTHING.
 *     Treating a lone delimiter as opening a span to end of region is exactly how
 *     a checker gets quietly turned off.
 *   SINGLE QUOTES ARE NOT MASKED. An apostrophe in ordinary prose ("the
 *     executor's step") opens a span that never closes; masking to the end of the
 *     paragraph would blind the checker wholesale. Double and typographic quotes
 *     are unambiguous; the apostrophe is not.
 *
 * The filler is a SPACE, chosen so masking can only ever remove a match, never
 * create one: a blanked span leaves ordinary word separation behind. It is not a
 * letter, a digit, a backtick or a quote, so it cannot re-form a status word or a
 * new span delimiter.
 *
 * REJECTED ALTERNATIVE, recorded so it is not re-proposed: "require the status to
 * be DECLARED — anchored as a trailing marker, or a colon form, or bold." It reads
 * well and it is wrong. It frees
 * `plans/review/00012-r3a-ledger-forgery-closed.md:129`, a GENUINE unapproved
 * declaration in this repository's own corpus written mid-line as bare prose
 * ("Items 4 … and 7-deploy-ready … SKIPPED — both actions.js, re-scoped …"), which
 * is none of those three shapes. That fix would have converted a blocking error
 * into SILENCE — a false green created while fixing a false red, which is the
 * worse of the two failures. Masking discriminates on the evidence the corpus
 * actually carries: every false positive found sits inside code or a quotation,
 * and every genuine declaration is bare.
 *
 * NOT a markdown parser, and deliberately so. It recognises the four span shapes
 * this repository's plans actually use; anything it does not recognise stays
 * visible to the scanners, which fails toward CATCHING a declaration rather than
 * toward silence.
 *
 * @param {string} text - plan text (or a region of it)
 * @returns {string} the same text, same length, with masked spans blanked
 */
function maskQuotedSpans(text) {
  if (typeof text !== 'string' || text.length === 0) return '';
  let out = text;
  for (const pattern of MASKED_SPAN_PATTERNS) {
    out = out.replace(pattern, (span) => span.replace(NON_NEWLINE_RE, ' '));
  }
  return out;
}

/**
 * Validate a plan before it can move to review stage
 *
 * Refuses a surviving mutant recorded without a valid disposition (`validateSurvivingMutants`).
 *
 * @param {string} planPath - Path to the plan file
 * @param {string} projectPath - Project root path
 * @returns {ValidationResult}
 */
function validateForReview(planPath, projectPath) {
  projectPath = projectPath || findProjectRoot();

  const content = safeFs.readFileSync(planPath, 'utf8');
  const metadata = parseMetadata(content);

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checklist: {}
  };

  // 1. Check all required steps are addressed
  const stepValidation = validateStepsComplete(content, planPath, projectPath);
  if (stepValidation.errors.length > 0) {
    result.errors.push(...stepValidation.errors);
    result.valid = false;
  }
  result.warnings.push(...stepValidation.warnings);
  result.checklist.steps = stepValidation.checklist;

  // 2. Check for unescalated skip/block statuses
  const escalationValidation = validateEscalations(content, metadata);
  if (escalationValidation.errors.length > 0) {
    result.errors.push(...escalationValidation.errors);
    result.valid = false;
  }
  result.warnings.push(...escalationValidation.warnings);
  result.checklist.escalations = escalationValidation.checklist;

  // 3. Check acceptance criteria are marked
  const criteriaValidation = validateAcceptanceCriteria(content);
  if (criteriaValidation.errors.length > 0) {
    result.errors.push(...criteriaValidation.errors);
    result.valid = false;
  }
  result.warnings.push(...criteriaValidation.warnings);
  result.checklist.criteria = criteriaValidation.checklist;

  // 4. Check for contradictions (e.g., script referenced but doesn't exist)
  const contradictionValidation = validateNoContradictions(content, projectPath);
  if (contradictionValidation.errors.length > 0) {
    result.errors.push(...contradictionValidation.errors);
    result.valid = false;
  }
  result.warnings.push(...contradictionValidation.warnings);
  result.checklist.contradictions = contradictionValidation.checklist;

  // 5. Check user instruction adherence
  const instructionValidation = validateInstructionAdherence(content, metadata);
  if (instructionValidation.errors.length > 0) {
    result.errors.push(...instructionValidation.errors);
    result.valid = false;
  }
  result.warnings.push(...instructionValidation.warnings);
  result.checklist.instructions = instructionValidation.checklist;

  // 6. Every surviving mutant recorded in the plan's one place carries a valid disposition
  const mutantValidation = validateSurvivingMutants(content, projectPath);
  if (mutantValidation.errors.length > 0) {
    for (const e of mutantValidation.errors) result.errors.push(e);
    result.valid = false;
  }
  result.checklist.survivingMutants = mutantValidation.checklist;

  // 7. SIP1: a dangling parent_plan is a WARNING at the review gate (never blocks).
  mergeParentPlanWarnings(result, content, projectPath);

  return result;
}

/**
 * Check that all Iron Loop steps 8-16 are addressed
 */
function validateStepsComplete(content, planPath, projectPath) {
  const result = { errors: [], warnings: [], checklist: {} };

  const requiredSteps = [
    { num: 8, name: 'TEST', required: true },
    { num: 9, name: 'PREPARE', required: true },
    { num: 10, name: 'IMPLEMENT', required: true },
    { num: 11, name: 'REVIEW', required: true },
    { num: 12, name: 'OPTIMIZE', required: false },
    { num: 13, name: 'SECURE', required: true },
    { num: 14, name: 'VERIFY', required: true },
    { num: 15, name: 'DOCUMENT', required: false },
    { num: 16, name: 'FINAL-REVIEW', required: true }
  ];

  // Scope step-state detection to the "## Execution Plan" section and parse each
  // step's BLOCK. Scanning the whole plan body with single-line regexes
  // false-matched prose mentions of "Step N" (common in meta-plans that document
  // the Iron Loop itself) and could not recognize the integrator's multi-line
  // format ("### Step N: LABEL" followed by "- [x]" checkbox lines) (v6.9.86).
  const record = extractExecutionRecord(content);
  const blocks = record.blocks;
  // The heading of the section the blocks came from, so a refusal can name it and a
  // wrong-section read is legible from the refusal alone.
  result.executionSectionHeading = record.heading;

  for (const step of requiredSteps) {
    const block = blocks[String(step.num)];
    const hasStep = block != null;
    let isCompleted = false;
    let isSkipped = false;
    // Recorded so a caller can tell "the box is open" from "there is no box at all" —
    // two different facts that used to share one refusal message.
    let hasCheckbox = false;

    if (block) {
      const hasUnchecked = /-\s*\[ \]/.test(block);
      const hasChecked = /-\s*\[x\]/i.test(block);
      const hasAnyBox = /-\s*\[[ x]\]/i.test(block);
      hasCheckbox = hasAnyBox;
      const hasWord = /\b(?:COMPLETE|COMPLETED|DONE)\b/i.test(block) || /✓/.test(block);
      // Complete iff there is positive evidence (a ticked box or a completion
      // word) AND no remaining unchecked box in the block. A completion WORD
      // cannot, by itself, finish a step that carries NO checklist at all: a
      // word-only stub (just "COMPLETE"/"DONE"/"✓", no checkbox) is a stub, not
      // a done step, so a step with no checkbox is never complete.
      isCompleted = hasAnyBox ? ((hasChecked || hasWord) && !hasUnchecked) : false;
      // Skipped only on an EXPLICIT, un-completed skip marker — not the words
      // "n/a"/"skipped" appearing inside checkbox prose (e.g. "0 skipped, 0
      // flaky tests", "keep the zero-skipped gate", "(n/a — Node built-ins
      // only)"). The `!isCompleted` guard alone did NOT save this: an UNFINISHED
      // step whose prose mentioned the zero-skip gate was marked skipped. The
      // status must stand alone as a declaration — see statusWordPattern.
      // The `[ N/A ]` bracket form is already unambiguous and is left as-is.
      //
      // All three probes read the SAME masked text: a status word inside inline
      // code or a quotation is a mention, not a declaration (maskQuotedSpans).
      // Masking one probe and not another would be a new inconsistency, not a fix
      // — the per-step probe and the region scan in validateEscalations must
      // classify the same line the same way.
      const maskedBlock = maskQuotedSpans(block);
      isSkipped = !isCompleted && (
        DECLARED_SKIPPED_RE.test(maskedBlock) ||
        DECLARED_NOT_APPLICABLE_RE.test(maskedBlock) ||
        /\[\s*N\/A\s*\]/i.test(maskedBlock));
    }

    result.checklist[`step_${step.num}`] = {
      name: step.name,
      present: hasStep,
      completed: isCompleted,
      skipped: isSkipped,
      hasCheckbox,
      required: step.required
    };

    if (step.required && !hasStep && !isSkipped) {
      result.errors.push(`Step ${step.num} (${step.name}) is required but not addressed`);
    }

    if (step.required && isSkipped) {
      result.warnings.push(`Step ${step.num} (${step.name}) was skipped - requires escalation approval`);
    }
  }

  return result;
}

/**
 * Split ONE execution region into per-step blocks keyed by step number. A block
 * runs from one "### Step N" heading to the next (or the end of the region).
 *
 * @param {string} region - One "## Execution Plan …" section's text.
 * @returns {Object<string,string>} Step number (as a string) → block text.
 */
function splitStepBlocks(region) {
  /** @type {Object<string,string>} */
  const blocks = {};
  const headingRe = /^#{2,4}\s*Step\s*(\d+)\b[^\n]*$/gim;
  const heads = [];
  let m;
  while ((m = headingRe.exec(region)) !== null) {
    heads.push({ num: m[1], index: m.index });
  }
  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].index;
    const end = i + 1 < heads.length ? heads[i + 1].index : region.length;
    blocks[heads[i].num] = region.slice(start, end);
  }
  return blocks;
}

/**
 * Per-step checkbox EVIDENCE in a set of step blocks: how many step blocks hold at
 * least one `- [ ]` / `- [x]` line.
 *
 * This is deliberately NOT a raw count of checkbox LINES. A raw line count lets one
 * verbose step block (a backfilled prose twin carrying three lines under each of
 * seven steps = 21 lines) outrank a section that actually covers all nine steps with
 * one line each = 9 lines. Coverage of the STEPS is what makes a section the build
 * record; volume inside one step is not. Do not "simplify" this to a line count.
 *
 * @param {Object<string,string>} blocks - Step blocks from splitStepBlocks.
 * @returns {number} Number of blocks holding at least one checkbox.
 */
function countStepEvidence(blocks) {
  let n = 0;
  for (const block of Object.values(blocks)) {
    if (/-\s*\[[ x]\]/i.test(block)) n++;
  }
  return n;
}

/**
 * Select the execution region that IS the executor's build record and split it into
 * per-step blocks keyed by step number.
 *
 * A plan legitimately carries TWO "## Execution Plan" sections: the implementation
 * planner writes a prose one (all nine "### Step N" headings, few or no checkboxes),
 * then `src/lib/iron-loop.js` (refineLoop, integrate) appends the canonical checkbox
 * template as a second one when the plan enters the build queue — and the executor
 * ticks THAT. Reading the wrong one reports every required step as an unchecked box
 * on a plan whose real record is fully ticked, which refuses it at review→done.
 *
 * The section is chosen by EVIDENCE, never by its NAME. A name match is brittle and
 * the spelling has already drifted across live plans: `(Steps 8–16)` with an EN DASH,
 * `(Steps 7-15)` from the old numbering, `(Iron Loop Steps 8-16)`, `— Build Record`.
 * Every drift made the name match miss and the prose twin win. So: collect EVERY
 * candidate section, and take the one with the most per-step checkbox evidence
 * (countStepEvidence — blocks-with-a-box, not checkbox lines; see there for why).
 *
 * Ties go to the LAST candidate, because the build template is appended AFTER the
 * planner's prose, so the later section is the more recent record. Zero evidence
 * anywhere falls back to the FIRST candidate — byte-for-byte the legacy behaviour, so
 * a legacy plan with one prose section and no checkboxes keeps exactly its old
 * verdict.
 *
 * The two sibling derivations in this file deliberately do NOT follow, and must not
 * be "unified" with this selection. `validateEscalations` scans for a DECLARED
 * unapproved skip; pointing it at the richest section would DROP a declaration
 * written in the prose twin, turning an error it raises today into silence.
 * `validateStepLabels` checks the human-written step LABELS; pointing it at CTOC's
 * own generated template would make it assert against its own output. Both stay on
 * the FIRST region on purpose.
 *
 * @param {string} content - Full plan text.
 * @returns {{heading: string, blocks: Object<string,string>}} The selected section's
 *   heading line (empty when the plan has no execution section) and its step blocks
 *   ({} when there is none).
 */
function extractExecutionRecord(content) {
  // Every candidate, in document order. Same heading shape the single-match regex
  // used (`^##\s+Execution Plan`), so what counts as a candidate is unchanged — only
  // the number of candidates considered is.
  const sectionRe = /^##\s+Execution Plan/gm;
  const candidates = [];
  let m;
  while ((m = sectionRe.exec(content)) !== null) {
    // Region = from the heading up to the next top-level "## " heading (the same
    // terminator as before: "###" is not a terminator, so step headings stay inside).
    const region = content.slice(m.index).split(/\n##\s+(?!#)/)[0];
    if (!region) continue;
    const blocks = splitStepBlocks(region);
    candidates.push({
      heading: region.split('\n')[0].trim(),
      blocks,
      evidence: countStepEvidence(blocks)
    });
  }
  if (candidates.length === 0) return { heading: '', blocks: {} };

  let best = candidates[0];
  for (const candidate of candidates) {
    // `>=` is the tiebreak: scanning in document order, equal evidence leaves the
    // LAST candidate holding the slot.
    if (candidate.evidence >= best.evidence) best = candidate;
  }
  // No section carries any checkbox at all: there is no evidence to choose on, so
  // keep the historical first-match region rather than silently preferring the last.
  const chosen = best.evidence === 0 ? candidates[0] : best;
  return { heading: chosen.heading, blocks: chosen.blocks };
}

/**
 * Check that skipped/blocked steps have proper escalation
 */
function validateEscalations(content, metadata) {
  const result = { errors: [], warnings: [], checklist: {} };

  // Only treat a step as escalation-requiring if it is marked SKIPPED/BLOCKED/
  // DEFERRED inside the "## Execution Plan" section. Scanning the whole plan body
  // false-matched prose (e.g. a meta-plan documenting "Step 13 VERIFY" drift or
  // a "0 skipped" line) as an unapproved skip (v6.9.86). Fall back to the whole
  // body only when there is no execution section (legacy plans).
  const execMatch = content.match(/^##\s+Execution Plan[\s\S]*$/m);
  const rawRegion = execMatch ? execMatch[0].split(/\n##\s+(?!#)/)[0] : content;

  // Mask coded and quoted spans before ANY matching below. A status word inside
  // backticks or a quotation is a MENTION — a plan quoting the runner's counter
  // label, or quoting the very kickback message this check produces, is not
  // declaring a skipped step. Length is preserved, so the step number reported
  // out of a match still names the step the author wrote.
  //
  // The approval probe below reads THIS SAME masked text, deliberately. Masking
  // the declaration scan but not the approval scan would create a forgery
  // surface: write the skip bare, write the approval inside backticks, and the
  // gate clears. Both halves see identical text or neither does.
  const region = maskQuotedSpans(rawRegion);

  // Look for SKIPPED/BLOCKED without approval. The status must be DECLARED, not
  // merely mentioned: matched as a standalone status marker via
  // statusWordPattern, never as a substring of `zero-skipped`, `skipped-tests`,
  // `parseSkipped`, `skipped[]` or a count like `0 skipped, 0 flaky`. Do NOT
  // "simplify" this to `\b${status}\b` — `\b` matches inside `zero-skipped`
  // (the hyphen is a non-word character) and reinstates the exact defect that
  // refused two real completions.
  for (const status of ESCALATION_STATUSES) {
    const pattern = safeRegExp(`(Step\\s*\\d+[^\\n]*${statusWordPattern(status)})`, 'gi');
    const matches = region.match(pattern) || [];

    for (const match of matches) {
      const stepMatch = match.match(/Step\s*(\d+)/i);
      const stepNum = stepMatch ? stepMatch[1] : 'unknown';

      // Check if there's an approval/justification nearby. Same boundary, so an
      // approved genuine skip is still recognised as approved.
      const approvalPattern = safeRegExp(`Step\\s*${stepNum}[^\\n]*${statusWordPattern(status)}[^\\n]*(?:APPROVED|JUSTIFIED|REASON:|ESCALATED)`, 'i');
      const hasApproval = approvalPattern.test(region);

      result.checklist[`escalation_${stepNum}_${status}`] = {
        step: stepNum,
        status: status,
        approved: hasApproval
      };

      if (!hasApproval) {
        result.errors.push(
          `Step ${stepNum} marked as ${status} without escalation approval. ` +
          `Add "REASON: <justification>" or get CTO-Chief approval.`
        );
      }
    }
  }

  // Check metadata for unapproved skips
  if (metadata.skipped_steps && !metadata.skips_approved) {
    result.errors.push(
      `Plan has skipped steps (${metadata.skipped_steps}) without approval in metadata. ` +
      `Add "skips_approved: true" after CTO-Chief review.`
    );
  }

  return result;
}

/**
 * Check that acceptance criteria are addressed
 */
function validateAcceptanceCriteria(content) {
  const result = { errors: [], warnings: [], checklist: {} };

  // Find the acceptance criteria section. Prefer the canonical "## [N.] CAPTURE
  // — Acceptance Criteria" / "## Acceptance Criteria" heading so we count the
  // real criteria, not an incidental "acceptance criteria"/"requirements" prose
  // mention elsewhere. Terminate at the next "## " heading, a "---" rule, or EOF
  // (the previous "Z" sentinel was a typo and never matched) (v6.9.86).
  const criteriaSection =
    content.match(/^##\s+[^\n]*Acceptance Criteria[^\n]*\n([\s\S]*?)(?=\n##\s|\n---\s*\n|$(?![\r\n]))/im) ||
    content.match(/(?:acceptance criteria|definition of done|requirements)[:\s]*\n([\s\S]*?)(?=\n##\s|\n---\s*\n|$)/i);

  if (!criteriaSection) {
    result.warnings.push('No explicit acceptance criteria section found');
    return result;
  }

  const criteriaContent = criteriaSection[1];

  // Count checkboxes
  const totalBoxes = (criteriaContent.match(/\[[ x]\]/g) || []).length;
  const checkedBoxes = (criteriaContent.match(/\[x\]/gi) || []).length;
  const uncheckedBoxes = totalBoxes - checkedBoxes;

  result.checklist.criteria = {
    total: totalBoxes,
    checked: checkedBoxes,
    unchecked: uncheckedBoxes
  };

  if (totalBoxes > 0 && uncheckedBoxes > 0) {
    result.errors.push(
      `${uncheckedBoxes} of ${totalBoxes} acceptance criteria not checked. ` +
      `All criteria must be met before review.`
    );
  }

  if (totalBoxes === 0) {
    result.warnings.push('No checkbox-style acceptance criteria found');
  }

  return result;
}

// --- Surviving mutants: the one recorded place, checked when the build completes ---
// The place is a `### Surviving Mutants` table inside the plan's `## Execution Record`
// section, which the approval digest already leaves out (src/lib/approval-ledger.js).

/** The parent heading's text starts with these words, the approval ledger's own prefix. */
const MUTANT_RECORD_PARENT = 'execution record';
/** The place's heading text, deeper than the parent, starts with these words. */
const MUTANT_RECORD_PLACE = 'surviving mutants';
/** The two accepted dispositions, quoted the same way in every refusal. */
const MUTANT_DISPOSITION_FORMS = '"killed by <test file> — <test name>" or "accepted: <reason>"';
/** The first token after the words is the test file. */
const KILLED_BY_RE = /^killed by\s+(\S+)/i;
/** A `:<line>` written after the test file, as in the File and line column. */
const LINE_SUFFIX_RE = /:\d+$/;
/** A cell of the table's delimiter row. */
const DELIMITER_CELL_RE = /^:?-+:?$/;
/** The start of a fenced block. */
const FENCE_OPEN_RE = /^(`{3,}|~{3,})/;
/** A trimmed line that can close a fence: one fence character, three or more times, nothing else. */
const FENCE_CLOSER_RE = /^(?:`{3,}|~{3,})$/;
/** Characters removed from quoted plan text: controls, and anything hidden or direction-changing. */
const QUOTE_STRIP_RE = /[\x00-\x1f\x7f-\x9f\p{Default_Ignorable_Code_Point}\p{Cf}\p{Zl}\p{Zp}\u2800]/gu;
/** The refusal for a table in the place whose header is not followed by a delimiter row. */
const MUTANT_NO_DELIMITER_ERROR = 'Surviving mutants table has no delimiter row: the line after its header row ' +
  'must be one like "|---|---|---|---|". Under "### Surviving Mutants" in "## Execution Record", ' +
  'the table is a header row, a delimiter row, then one row per mutant.';
/** The longest piece of plan text a refusal quotes back. */
const QUOTED_CELL_MAX = 120;

/**
 * Plan text quoted back in a refusal: control, invisible and direction-changing
 * characters removed first (QUOTE_STRIP_RE), then cut to QUOTED_CELL_MAX characters.
 * The errors are logged raw by the stale sweep.
 * @param {string} text
 * @returns {string}
 */
function quoteCell(text) {
  const clean = String(text).replace(QUOTE_STRIP_RE, '');
  return clean.length > QUOTED_CELL_MAX ? `${clean.slice(0, QUOTED_CELL_MAX)}…` : clean;
}

/**
 * Read a markdown heading line.
 * @param {string} trimmed - a trimmed line
 * @returns {{level: number, title: string}|null} null when the line is not a heading
 */
function headingOf(trimmed) {
  let level = 0;
  while (trimmed[level] === '#') level++;
  if (level === 0 || !/^[ \t]/.test(trimmed.slice(level))) return null;
  return { level, title: trimmed.slice(level).trim().toLowerCase() };
}

/**
 * Split one trimmed table line that starts with `|` into trimmed cells. A `\|` is a
 * literal pipe; a pipe inside a backtick code span does not split. A span opens on a
 * run of N backticks only when a later run of exactly N exists on the line (the
 * CommonMark rule), and closes on that run; an unmatched backtick is plain text.
 * Linear in the line's length: one pass records where the last run of each length
 * starts, a second pass splits.
 * @param {string} line
 * @returns {string[]}
 */
function splitTableRow(line) {
  /** @type {Map<number, number>} run length -> start of the last run of that length */
  const lastRunAt = new Map();
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== '`') continue;
    let run = 1;
    while (line[i + run] === '`') run++;
    lastRunAt.set(run, i);
    i += run - 1;
  }
  const cells = [];
  let cell = '';
  let codeRun = 0; // length of the open backtick run, 0 outside a code span
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cell += '|'; i++; continue; }
    if (ch === '`') {
      let run = 1;
      while (line[i + run] === '`') run++;
      if (codeRun === 0) { if ((lastRunAt.get(run) ?? -1) > i) codeRun = run; } else if (run === codeRun) codeRun = 0;
      cell += line.slice(i, i + run);
      i += run - 1;
      continue;
    }
    if (ch === '|' && codeRun === 0) { cells.push(cell.trim()); cell = ''; continue; }
    cell += ch;
  }
  cells.push(cell.trim());
  cells.shift();                                      // the text before the opening pipe
  if (cells[cells.length - 1] === '') cells.pop();    // the closing pipe
  return cells;
}

/**
 * Whether a trimmed line is a table delimiter row such as `|---|:--:|`.
 * @param {string|undefined} line
 * @returns {boolean}
 */
function isDelimiterRow(line) {
  if (line === undefined || !line.startsWith('|')) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((c) => DELIMITER_CELL_RE.test(c));
}

/**
 * Judge one Disposition cell. A `:<line>` after the test file is removed before the
 * file is looked up; the lookup is read-only and resolves the path by its text:
 * `..`, `.` and empty parts are dropped, and a symbolic link inside the project is followed.
 * @param {string} cell
 * @param {string} projectPath
 * @returns {string|null} null for a valid disposition, otherwise the problem in words
 */
function mutantDispositionProblem(cell, projectPath) {
  const text = cell.replace(/`/g, '').trim();
  if (text.replace(QUOTE_STRIP_RE, '').trim() === '') return 'the Disposition is empty';
  const killed = KILLED_BY_RE.exec(text);
  if (killed) {
    const file = killed[1].replace(LINE_SUFFIX_RE, '');
    return declaredFileExistsUnder(projectPath, file)
      ? null
      : `the Disposition names "${quoteCell(file)}", and no such file exists in the project`;
  }
  if (text.toLowerCase().startsWith('accepted:')) {
    return text.slice('accepted:'.length).replace(QUOTE_STRIP_RE, '').trim() === ''
      ? `the Disposition "${quoteCell(text)}" gives no reason`
      : null;
  }
  return `the Disposition "${quoteCell(text)}" is in neither accepted form`;
}

/**
 * Mark every line of a fenced block that has a closing line, opener and closer
 * included. A closing line is made only of the opener's fence character, at least as
 * many times as the opener (the lines are trimmed, so spaces after it are allowed);
 * a line that merely starts with the opening run, such as "```js", does not close.
 * A backtick line with another backtick after its opening run is inline code, not a
 * fence (CommonMark); a tilde fence may carry any text after its run. An opener with
 * no closing line marks nothing and stays plain text, so a forgotten closing fence
 * can never hide the record after it. Linear: a backward pass records, per line, the
 * longest closing line of each fence character after it, so an opener that can never
 * close is passed over without a scan; a closing opener scans forward once to its
 * closer and the scan resumes after it, so no line is scanned twice.
 * @param {string[]} lines - trimmed lines
 * @returns {{fenced: boolean[], linesRead: number}} the marks, and how many line reads the scan made
 */
function closedFenceLines(lines) {
  const n = lines.length;
  const fenced = new Array(n).fill(false);
  const ticksAfter = new Array(n).fill(0);
  const tildesAfter = new Array(n).fill(0);
  let linesRead = 0;
  let ticks = 0;
  let tildes = 0;
  for (let i = n - 1; i >= 0; i--) {
    linesRead++;
    ticksAfter[i] = ticks;
    tildesAfter[i] = tildes;
    if (!FENCE_CLOSER_RE.test(lines[i])) continue;
    if (lines[i][0] === '`') ticks = Math.max(ticks, lines[i].length);
    else tildes = Math.max(tildes, lines[i].length);
  }
  for (let i = 0; i < n; i++) {
    linesRead++;
    const opener = FENCE_OPEN_RE.exec(lines[i]);
    if (!opener) continue;
    const [run] = opener;
    const ch = run[0];
    if (ch === '`' && lines[i].includes('`', run.length)) continue;           // inline code, not a fence
    if ((ch === '`' ? ticksAfter[i] : tildesAfter[i]) < run.length) continue; // never closes: plain text
    let j = i + 1;
    while (!(lines[j][0] === ch && lines[j].length >= run.length && FENCE_CLOSER_RE.test(lines[j]))) { j++; linesRead++; }
    for (let k = i; k <= j; k++) fenced[k] = true;
    i = j;
  }
  return { fenced, linesRead };
}

/**
 * Name every surviving mutant recorded in the plan's one place that has no valid
 * disposition. Never throws on a string, reads no file, and calls `existsSync` once
 * per `killed by` row. A plan without the place, or with a header and delimiter row
 * and no data rows, gets no error. The scan is linear: lines are read a bounded number
 * of times (`checklist.fenceLinesRead` counts the fence scan's reads) and the column
 * positions are found once per table.
 * @param {string} content - the plan text
 * @param {string} projectPath - project root, where a `killed by` test file is looked up
 * @returns {{errors: string[], checklist: {rows: number, open: number, fenceLinesRead: number}}}
 */
function validateSurvivingMutants(content, projectPath) {
  const errors = [];
  let rows = 0;
  let parent = 0;    // level of the open Execution Record heading, 0 when none
  let place = 0;     // level of the open Surviving Mutants heading, 0 when none
  /** @type {number|null} */
  let columns = null; // the open table's column count, null until its header is read
  let dCol = -1;     // positions of the Disposition, File and line, and Mutant columns, -1 when missing
  let fileCol = -1;
  let mutantCol = -1;
  let refused = false; // the open table was refused for a missing delimiter row; its rows are not read
  const lines = content.split(/\r?\n/).map((raw) => raw.trim());
  const { fenced, linesRead } = closedFenceLines(lines);
  for (let i = 0; i < lines.length; i++) {
    if (fenced[i]) continue;
    const line = lines[i];
    const heading = headingOf(line);
    if (heading) {
      // A level-1 heading is the plan's title (or a pasted `# pass 26` line): it neither
      // opens nor closes the record or the place.
      if (heading.level === 1) continue;
      if (heading.level <= place) place = 0;
      if (heading.level <= parent) parent = 0;
      if (parent === 0 && heading.title.startsWith(MUTANT_RECORD_PARENT)) parent = heading.level;
      else if (parent > 0 && heading.title.startsWith(MUTANT_RECORD_PLACE)) { place = heading.level; columns = null; refused = false; }
      continue;
    }
    if (place === 0 || !line.startsWith('|')) continue;
    if (refused) continue;
    const cells = splitTableRow(line);
    if (columns === null) {
      if (!isDelimiterRow(lines[i + 1])) {
        refused = true;
        errors.push(MUTANT_NO_DELIMITER_ERROR);
        continue;
      }
      const header = cells.map((c) => c.replace(/[*_`]/g, '').trim().toLowerCase());
      columns = header.length;
      dCol = header.indexOf('disposition');
      fileCol = header.indexOf('file and line');
      mutantCol = header.indexOf('mutant');
      continue;
    }
    if (cells.every((c) => DELIMITER_CELL_RE.test(c))) continue;
    rows++;
    const problem = dCol < 0
      ? 'the table has no Disposition column (its columns are Mutant, File and line, Change and Disposition)'
      : mutantDispositionProblem(cells.length > dCol ? cells[dCol] : cells[cells.length - 1], projectPath);
    if (problem === null) continue;
    const where = cells[fileCol] || cells[mutantCol] || '';
    const label = where ? `row ${rows} (${quoteCell(where)})` : `row ${rows}`;
    const note = cells.length !== columns
      ? ` (the row has ${cells.length} cells where the table has ${columns} columns)`
      : '';
    errors.push(`Surviving mutant ${label}: ${problem}${note}. Under "### Surviving Mutants" in ` +
      `"## Execution Record", each Disposition reads ${MUTANT_DISPOSITION_FORMS}.`);
  }
  return { errors, checklist: { rows, open: errors.length, fenceLinesRead: linesRead } };
}

/**
 * Existence check for a declared (repo-root-relative, possibly POSIX-authored)
 * path under `root`, cross-platform. Splits on any separator run and drops
 * empty / `.` / `..` segments, so by its text the path cannot climb above `root`
 * (a symbolic link inside `root` is followed). A path holding a NUL is refused
 * (false), never passed to the file system.
 * Mirrors `stale-detector.declaredFileExists` (which is not exported); kept
 * local so the fix stays within VP1's declared file scope. Read-only.
 * @param {string} root
 * @param {string} declared
 * @returns {boolean} true if the resolved path exists under root.
 */
function declaredFileExistsUnder(root, declared) {
  if (declared.includes('\0')) return false;
  const parts = declared.split(/[\\/]+/).filter((p) => p.length > 0 && p !== '.' && p !== '..');
  if (parts.length === 0) return false;
  return safeFs.existsSync(path.join(root, ...parts));
}

/**
 * Check for contradictions between plan and actual code/files.
 *
 * A file claimed as created in prose but absent at its OWN resolved path is
 * treated as satisfied when the plan's `files:` frontmatter declares a file
 * with the same basename that EXISTS on disk (D-VP1-1): bare-basename prose for
 * a legitimately declared+created file (e.g. prose "create `guard-files.js`"
 * for a declared `src/hooks/guard-files.js`) no longer false-blocks. A claim
 * matching no declared file and absent on disk still errors (D-VP1-2).
 *
 * A CITATION is not a claim (00260). Pattern 1 rejects, before it records
 * anything, four shapes that name no file: a token inside a fenced block, a token
 * inside an inline span containing a call, a token immediately followed by an open
 * parenthesis, and a token whose "verb" is fused straight onto it with no
 * separator — a verb syllable inside a cited slug. A token that cannot name a file
 * at all (no path separator, no known extension) is rejected too. Each rejection
 * removes a real refusal observed on this repository's own plans; the teeth are
 * pinned by the `00260 teeth:` cases in `tests/plan-validator.test.js`.
 *
 * A PLACEHOLDER file name is not a claim either (four-defects slice 17). Pattern 1
 * and Pattern 2 both pass over, before they record anything, a capture whose file
 * name holds a part written between a less-than and a greater-than sign
 * (`isPlaceholderName`), and the placeholder counts only
 * as a whole part of the name. A placeholder in a folder part changes nothing, and
 * neither does an inline HTML tag name between the signs. Pinned by the
 * `four-defects s17` cases in `tests/plan-validator.test.js`.
 *
 * @param {string} content - the full plan text (untrusted; every pattern here is linear)
 * @param {string} projectPath - repository root the claims resolve against
 * @returns {{errors: string[], warnings: string[], checklist: object}} scan result
 */
function validateNoContradictions(content, projectPath) {
  const result = { errors: [], warnings: [], checklist: {} };

  // Strip fenced code blocks before scanning. Code snippets in ``` / ~~~ fences
  // (e.g. `lines.push('CLAUDE.md')`, `Hash('sha256').update(body).digest`) are
  // NOT file-creation claims; scanning them produced false "claimed as created"
  // errors that blocked otherwise-complete plans at review (v6.9.86).
  //
  // An inline span that contains a call is stripped for the same reason, after
  // the fences and before the scan: a call cited in a sentence is code, not a
  // claim that a file of that name exists. The filler is a SPACE and the LENGTH
  // is preserved, exactly as `maskQuotedSpans` does above: blanking can then
  // only ever REMOVE a match, never create one by joining the text on either
  // side of the span.
  const scanContent = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(INLINE_CALL_SPAN_RE, (span) => span.replace(NON_NEWLINE_RE, ' '));

  // The plan's `files:` frontmatter is the authoritative declaration of what the
  // plan creates. Parse it once (inline-array, block-list AND scalar forms; all
  // leading `---…---` blocks merged) so a bare-basename prose claim can be
  // resolved against it below. Empty [] when the plan declares none.
  const declaredFiles = parseFilesField(extractFrontmatterRegion(content));

  // Pattern 1: File referenced as "created" but doesn't exist. The filename
  // capture excludes quotes, parens and commas so code expressions (which
  // contain them) are not mistaken for paths.
  const createdFilePattern = /(?:created?|added?|new file)[:\s]*[`"]?([^\s`"'(),]+\.[a-z0-9]+)[`"]?/gi;
  let match;

  while ((match = createdFilePattern.exec(scanContent)) !== null) {
    const filePath = match[1];

    // A capture immediately followed by "(" is a call, not a path. The capture
    // class stops AT the parenthesis, so the character after the completed match
    // is the evidence. Expressing this as a lookahead inside the pattern is
    // WRONG and silently so: the suffix quantifier is greedy, so a failing
    // lookahead makes the engine backtrack one character and match anyway,
    // capturing one character less instead of rejecting the call. The trailing
    // [`"]? may have consumed one delimiter; the capture itself can never end in
    // one, so this test is exact.
    const trailer = TRAILING_DELIMITER_RE.test(match[0]) ? 1 : 0;
    if (scanContent[match.index + match[0].length - trailer] === '(') continue;

    // A verb FUSED to the path is one token, not a sentence. The alternation has
    // no left word boundary, so `created?` matches the five letters `create`
    // wherever they occur — including as a syllable inside a hyphen-joined slug.
    // A plan filename cited in a table cell
    // (`…-a-canonical-create-react-app-is-detected-s1-symmetric-credit.md`) starts
    // a match at that syllable and captures the slug's tail, which carries a real
    // `.md` suffix and no trailing parenthesis, so neither guard above can see it.
    //
    // The join is tested on the PATH side, never the word side: in real prose the
    // verb and the path it claims are always separated by whitespace, a colon, or
    // an opening code delimiter, whereas a verb may legitimately be glued to the
    // word BEFORE it ("newly-created", "re-created"). Refusing a verb preceded by
    // a token character would silence those genuine claims — a false green
    // manufactured while fixing a false red, the worse of the two failures.
    //
    // `match[0]` is verb + separator + opening delimiter + path + trailer. The
    // capture class excludes both delimiters, so a match ending in one can only
    // be the trailer — already measured above — which makes the path's offset
    // plain arithmetic rather than a second search for the verb in the match.
    const beforePath = match[0].slice(0, match[0].length - filePath.length - trailer);
    if (!PATH_SEPARATED_RE.test(beforePath)) continue;

    // A token that cannot name a file is not a claim about a file.
    if (!isPathPlausible(filePath)) continue;

    // A placeholder file name names no file (isPlaceholderName): not a claim, no checklist entry.
    if (isPlaceholderName(filePath)) continue;

    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(projectPath, filePath);

    const exists = safeFs.existsSync(fullPath);
    result.checklist[`file_${filePath}`] = { claimed: 'created', exists };

    if (!exists) {
      const claimedBase = path.basename(filePath);
      // Claim is satisfied if the plan DECLARES a file with the same basename
      // that EXISTS on disk (bare-basename prose for a legitimately
      // declared+created file). Basename equality is a plain string compare —
      // no regex on plan input.
      const satisfiedByDeclaration = declaredFiles.some(
        (declared) => path.basename(declared) === claimedBase && declaredFileExistsUnder(projectPath, declared)
      );
      if (!satisfiedByDeclaration) {
        result.errors.push(
          `File "${filePath}" claimed as created but doesn't exist. ` +
          `Create the file or remove the claim.`
        );
      }
    }
  }

  // Pattern 2: Script referenced but doesn't exist
  const scriptPattern = /(?:run|execute|script)[:\s]*[`"]?([^\s`"]+\.(?:sh|js|py|ts))[`"]?/gi;

  while ((match = scriptPattern.exec(scanContent)) !== null) {
    const scriptPath = match[1];
    // A placeholder file name names no script (isPlaceholderName).
    if (isPlaceholderName(scriptPath)) continue;
    const fullPath = path.isAbsolute(scriptPath)
      ? scriptPath
      : path.join(projectPath, scriptPath);

    // Only check if it looks like a local path (not a command)
    if (!scriptPath.includes('/') && !scriptPath.startsWith('.')) {
      continue;
    }

    const exists = safeFs.existsSync(fullPath);
    result.checklist[`script_${scriptPath}`] = { referenced: true, exists };

    if (!exists) {
      result.warnings.push(
        `Script "${scriptPath}" referenced but not found. ` +
        `Ensure the script exists or update the reference.`
      );
    }
  }

  // Pattern 3: "SKIPPED" but implementation exists.
  //
  // Two defects were fixed here together. (a) `SKIP` was matched as a bare stem,
  // so `skipped-test policy` in prose produced a "Step 8 was skipped" warning.
  // The stem is DELIBERATELY kept (this site's intent is broader than the three
  // escalation statuses) but is now bounded, with `PED` optional so both `SKIP`
  // and `SKIPPED` still match as standalone words. (b) The class was written
  // `[^\\n]` inside a regex LITERAL, which means "not a backslash and not the
  // letter n" — the double backslash is correct only inside the STRING passed to
  // safeRegExp. So the pattern silently spanned newlines (matching a `Step 8`
  // heading against an unrelated later line) while refusing to cross any letter
  // `n` on the step's own line. It is now a real "not a newline".
  //
  // (c) The status scan reads MASKED text, not `scanContent`. `maskQuotedSpans`
  // is a superset of the fence strip above (it also blanks inline code and
  // quotations) and preserves length, so this scan no longer fires on a step line
  // that merely QUOTES the runner's skip counter. It is applied ONLY here and not
  // to `scanContent` itself: patterns 1 and 2 above deliberately match a filename
  // written inside backticks (`created \`guard-files.js\``), and masking their
  // input would blind two working checks while fixing a third. Same helper, three
  // call sites, each fed the text its own pattern needs.
  const statusScanContent = maskQuotedSpans(content);
  const skippedStepPattern = safeRegExp(`Step\\s*(\\d+)[^\\n]*${statusWordPattern('SKIP(?:PED)?')}`, 'gi');

  while ((match = skippedStepPattern.exec(statusScanContent)) !== null) {
    const stepNum = match[1];

    // Check if there are actually files for this step
    // (e.g., if step 8 TEST is skipped but test files exist)
    if (stepNum === '8') {
      const hasTests = checkForTestFiles(projectPath);
      if (hasTests) {
        result.warnings.push(
          `Step 8 (TEST) marked as skipped but test files exist. ` +
          `Verify the skip is intentional or update the step status.`
        );
      }
    }
  }

  return result;
}

/**
 * Check if test files exist in the project
 */
function checkForTestFiles(projectPath) {
  const testPatterns = [
    'tests',
    '__tests__',
    'spec',
    '*.test.js',
    '*.spec.ts'
  ];

  for (const pattern of testPatterns) {
    const testPath = path.join(projectPath, pattern);
    if (safeFs.existsSync(testPath)) {
      return true;
    }
  }

  return false;
}

/**
 * Check that user instructions were followed
 */
function validateInstructionAdherence(content, metadata) {
  const result = { errors: [], warnings: [], checklist: {} };

  // Look for user instructions in the plan
  const instructionPatterns = [
    { pattern: /user said[:\s]*["']([^"']+)["']/gi, label: 'user_said' },
    { pattern: /user requested?[:\s]*["']([^"']+)["']/gi, label: 'user_requested' },
    { pattern: /requirement[:\s]*["']([^"']+)["']/gi, label: 'requirement' }
  ];

  for (const { pattern, label } of instructionPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const instruction = match[1].toLowerCase();

      // Check for common contradictions
      if (instruction.includes('cli') || instruction.includes('command line')) {
        // User said CLI, check if manual/GUI was used instead
        const usedManual = /manual|gui|interface|web/i.test(content);
        if (usedManual) {
          result.warnings.push(
            `User requested CLI approach but implementation mentions manual/GUI access. ` +
            `Verify the implementation matches user requirements.`
          );
        }
      }

      if (instruction.includes('automated') || instruction.includes('automatic')) {
        const usedManual = /manual|by hand|manually/i.test(content);
        if (usedManual) {
          result.warnings.push(
            `User requested automated approach but implementation mentions manual steps. ` +
            `Verify the implementation is truly automated.`
          );
        }
      }

      result.checklist[`instruction_${label}`] = {
        instruction: instruction.slice(0, 100),
        checked: true
      };
    }
  }

  return result;
}

/**
 * Validate plan before moving from functional to implementation
 */
function validateFunctionalToImpl(planPath, projectPath) {
  const content = safeFs.readFileSync(planPath, 'utf8');

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checklist: {}
  };

  // Must have a problem statement. Accept either the explicit "Problem Statement"
  // heading OR CTOC's canonical Iron-Loop Step-2 section ("## N. ASSESS —
  // Problem Understanding", with Business Context / Current State / Impact),
  // which is what the product-owner and vision-decomposer agents emit. Matching
  // only the literal "problem statement" string false-failed every plan written
  // in the canonical ASSESS format (v6.9.61).
  const hasProblem =
    /problem\s*statement/i.test(content) ||
    /problem\s+understanding/i.test(content) ||
    /^#+\s.*\bASSESS\b/im.test(content) ||
    /## Problem/i.test(content);
  result.checklist.problemStatement = hasProblem;
  if (!hasProblem) {
    result.errors.push('Missing problem statement');
    result.valid = false;
  }

  // Must have acceptance criteria or success criteria
  const hasCriteria = /acceptance\s*criteria/i.test(content) || /success\s*criteria/i.test(content);
  result.checklist.acceptanceCriteria = hasCriteria;
  if (!hasCriteria) {
    result.errors.push('Missing acceptance criteria or success criteria');
    result.valid = false;
  }

  // Must have scope
  const hasScope = /## Scope/i.test(content) || /### In Scope/i.test(content) || /\bscope\b/i.test(content);
  result.checklist.scope = hasScope;
  if (!hasScope) {
    result.warnings.push('Missing scope definition');
  }

  return result;
}

/**
 * Validate a plan before moving from review to done (Gate 3).
 *
 * Historically this validator constructed `valid:true` and never reassigned it —
 * every check merely pushed a warning, so no input could make it fail (finding
 * C9). It is the validator `approveSubplans` runs per sibling on the review->done
 * batch, so an always-`true` gate meant an unfinished/unapproved/unverified plan
 * crossed Gate 3 unconditionally. This rewrite gives it real rejection paths for
 * the three named defect conditions, while a genuinely finished plan still passes.
 *
 * A plan is REJECTED (`valid:false`, with a specific `errors[]` entry) when ANY of:
 *   1. A required Iron Loop step is absent, OR a required step is present but has
 *      an unchecked checkbox (notably Step 14 VERIFY) — a ticked-but-unfinished
 *      plan cannot ship.
 *   2. The persisted VERIFY evidence for this plan is absent, records a failing
 *      run, or is stale (recorded before the plan's last content change). The
 *      failure message names the SPECIFIC VERIFY failure, not a generic "not
 *      approved."
 *
 * This validator deliberately does NOT check for an `approved_by: human` body
 * marker. That marker is stamped at Gate 2 (implementation → todo) and rides
 * through to review/ via plain file moves, so matching it here would rubber-stamp
 * every real pipeline plan through Gate 3 with no Gate-3 decision AND false-block
 * a complete plan that lacks it. The genuine Gate-3 human decision is the act of
 * invoking approvePlan, which writes the edge-specific ledger entry
 * (stage_to === 'done'); done/-residency is enforced by human-gate-check.js
 * reading that ledger, never a body marker. At pre-cross validation time the
 * Gate-3 approval cannot yet exist, so this validator gates only on the quality
 * legs it can verify.
 *
 * The unresolved-feedback (TODO/FIXME) check stays a WARNING — it is not one of
 * the named rejection conditions and promoting it would risk rejecting a
 * compliant plan that legitimately mentions "TODO" in prose.
 *
 * Fails closed: an unreadable plan file, or corrupt/absent/stale evidence, all
 * push errors and set `valid:false` rather than silently passing. This slice can
 * only make the gate STRICTER; there is no path that turns a rejection into a pass.
 *
 * @param {string} planPath - Path to the plan file.
 * @param {string} projectPath - Project root path.
 * @returns {ValidationResult}
 */
function validateReviewToDone(planPath, projectPath) {
  projectPath = projectPath || findProjectRoot();

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checklist: {}
  };

  // Read the plan once. An unreadable plan fails closed (cannot ship what we
  // cannot inspect) rather than throwing out of the gate.
  let content;
  try {
    content = safeFs.readFileSync(planPath, 'utf8');
  } catch (err) {
    result.errors.push('review→done blocked: plan file is unreadable');
    result.valid = false;
    result.checklist.readable = false;
    return result;
  }
  // NOTE: this validator deliberately does NOT check for an `approved_by: human`
  // body marker. That marker is stamped at an EARLIER gate — stampAndLedger
  // prepends it when a plan crosses Gate 2 (implementation → todo) — and it
  // rides untouched through todo → in-progress → review via plain file moves.
  // So by the time a plan reaches review/, it already carries a marker from a
  // DIFFERENT gate. Matching that leftover would (a) rubber-stamp every real
  // pipeline plan through Gate 3 with no Gate-3 decision, and (b) false-block a
  // genuinely-complete plan that happens to lack it. The real Gate-3 human
  // decision is recorded by approvePlan → stampAndLedger writing the
  // edge-specific ledger entry (stage_to === 'done') AS the act of approval, and
  // done/-residency is enforced by human-gate-check.js reading that ledger —
  // never a body marker. At pre-cross validation time the Gate-3 approval cannot
  // exist yet, so this validator gates only on the QUALITY legs it can verify:
  // required-step completeness and fresh, passing VERIFY evidence.

  // 1. Required-step completeness. validateStepsComplete errors only when a
  //    required step is ABSENT; it records present-but-unchecked steps in its
  //    checklist. Promote each present-required-but-unchecked step to an error so
  //    an unchecked Step 14 VERIFY box blocks the transition.
  //
  //    The refusal distinguishes TWO facts that used to share one message. "The box
  //    is open" and "the block holds no box at all" have different causes and
  //    different fixes: the first is unfinished work, the second is usually a plan
  //    whose real record lives in ANOTHER execution section than the one that was
  //    read. One message for both left the reader no way to tell, so the no-box
  //    refusal names the heading of the section that WAS read.
  const stepValidation = validateStepsComplete(content, planPath, projectPath);
  result.checklist.steps = stepValidation.checklist;
  result.warnings.push(...stepValidation.warnings);
  if (stepValidation.errors.length > 0) {
    result.errors.push(...stepValidation.errors);
    result.valid = false;
  }
  for (const [key, entry] of Object.entries(stepValidation.checklist)) {
    if (entry && entry.required === true && entry.present === true &&
        entry.completed === false && entry.skipped === false) {
      const num = key.replace(/^step_/, '');
      result.errors.push(entry.hasCheckbox === false
        ? `review→done blocked: Step ${num} (${entry.name}) has no checkbox at all in the execution section read (${stepValidation.executionSectionHeading || 'no "## Execution Plan" section found'})`
        : `review→done blocked: Step ${num} (${entry.name}) has an unchecked required checkbox`
      );
      result.valid = false;
    }
  }

  // 2. VERIFY evidence: must exist, record a passing run, and be fresh. A ticked
  //    Step 14 checkbox is self-reported; the artifact is produced by an actual
  //    runVerify execution and closes that trust gap (belt and suspenders — both
  //    the checkbox in (2) and the artifact here must hold).
  const planSlug = path.basename(planPath, '.md');
  const evidence = readVerifyEvidence(projectPath, planSlug);
  result.checklist.verifyEvidence = { present: evidence != null, passed: null, stale: null };
  if (evidence == null) {
    result.errors.push('review→done blocked: no VERIFY evidence recorded for this plan (run Step 14 VERIFY)');
    result.valid = false;
  } else if (evidence.passed === false) {
    result.checklist.verifyEvidence.passed = false;
    const detail = (Array.isArray(evidence.errors) && evidence.errors.length > 0)
      ? evidence.errors.join('; ')
      : (evidence.summary || 'no detail recorded');
    result.errors.push(`review→done blocked: recorded VERIFY run failed: ${detail}`);
    result.valid = false;
  } else {
    result.checklist.verifyEvidence.passed = true;
    // Staleness: evidence recorded before the plan's last content change is
    // treated as absent (it cannot vouch for the current plan). Fail closed if
    // the plan's mtime is unreadable.
    let planMtimeMs = null;
    try {
      planMtimeMs = safeFs.statSync(planPath).mtimeMs;
    } catch (err) {
      planMtimeMs = null;
    }
    const evidenceMs = evidence.timestamp ? Date.parse(evidence.timestamp) : NaN;
    if (planMtimeMs == null || Number.isNaN(evidenceMs) || evidenceMs < planMtimeMs) {
      result.checklist.verifyEvidence.stale = true;
      result.errors.push('review→done blocked: VERIFY evidence is stale (recorded before the plan\'s last change)');
      result.valid = false;
    } else {
      result.checklist.verifyEvidence.stale = false;
    }
  }

  // 3. Unresolved-feedback stays a WARNING (not one of the rejection
  //    conditions) so a compliant plan mentioning "TODO" in prose is not blocked.
  const hasUnresolved = /unresolved/i.test(content) || /\bTODO\b/.test(content) || /\bFIXME\b/.test(content);
  result.checklist.noUnresolved = !hasUnresolved;
  if (hasUnresolved) {
    result.warnings.push('Plan may contain unresolved feedback (TODO/FIXME markers found)');
  }

  return result;
}

/**
 * Validate vision readiness for decomposition into functional plans.
 * Checks: problem statement, target audience, success criteria, scope.
 *
 * @param {string} planPath - Path to the vision file
 * @param {string} projectPath - Project root path
 * @returns {ValidationResult}
 */
function validateVisionForDecomposition(planPath, projectPath) {
  const content = safeFs.readFileSync(planPath, 'utf8');

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checklist: {}
  };

  // Check for problem statement
  const hasProblem = /problem|the problem/i.test(content);
  result.checklist.problemStatement = hasProblem;
  if (!hasProblem) {
    result.errors.push('Missing problem statement. Vision must describe the problem it solves.');
    result.valid = false;
  }

  // Check for target audience
  const hasAudience = /for whom|target|audience|users?/i.test(content);
  result.checklist.targetAudience = hasAudience;
  if (!hasAudience) {
    result.errors.push('Missing target audience. Vision must describe who it serves.');
    result.valid = false;
  }

  // Check for success criteria
  const hasSuccess = /success.*looks like|success criteria|success/i.test(content);
  result.checklist.successCriteria = hasSuccess;
  if (!hasSuccess) {
    result.errors.push('Missing success criteria. Vision must describe what success looks like.');
    result.valid = false;
  }

  // Check for scope
  const hasScope = /what we're building|scope|what we're NOT|boundaries/i.test(content);
  result.checklist.scope = hasScope;
  if (!hasScope) {
    result.warnings.push('Missing scope/boundaries definition. Consider adding what is and is not in scope.');
  }

  return result;
}

/**
 * Validate plan can move from one stage to another
 *
 * @param {string} planPath - Path to plan file
 * @param {string} fromStage - Current stage
 * @param {string} toStage - Target stage
 * @param {string} projectPath - Project root
 * @returns {ValidationResult}
 */
function validateTransition(planPath, fromStage, toStage, projectPath) {
  projectPath = projectPath || findProjectRoot();

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checklist: {}
  };

  // Transitions that require validation
  const validatedTransitions = {
    'vision->functional': validateVisionForDecomposition,
    'functional->implementation': validateFunctionalToImpl,
    'implementation->todo': validateForQueue,
    'todo->in-progress': validateForExecution,
    'in-progress->review': validateForReview,
    'review->done': validateReviewToDone
  };

  const key = `${fromStage}->${toStage}`;
  const validator = validatedTransitions[key];

  if (validator) {
    return validator(planPath, projectPath);
  }

  return result;
}

/**
 * Validate plan before execution starts
 */
function validateForExecution(planPath, projectPath) {
  const content = safeFs.readFileSync(planPath, 'utf8');
  const metadata = parseMetadata(content);

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checklist: {}
  };

  // Must have iron_loop marker
  if (!metadata.iron_loop) {
    result.errors.push('Plan missing Iron Loop execution steps (Steps 8-16)');
    result.valid = false;
  }

  // Should have clear scope
  if (!content.includes('Scope') && !content.includes('scope')) {
    result.warnings.push('Plan missing explicit scope definition');
  }

  // Validate step labels are correct (BLOCKING)
  const labelValidation = validateStepLabels(content);
  if (!labelValidation.valid) {
    result.errors.push(...labelValidation.errors);
    result.valid = false;
  }
  result.warnings.push(...labelValidation.warnings);
  result.checklist.stepLabels = labelValidation.checklist;

  return result;
}

/**
 * A plan slug is a bare filename token — the ONLY shape that may be joined into a
 * path under `plans/`. Anything with a separator, a `.`/`..` traversal, a NUL, or
 * any character outside `[A-Za-z0-9._-]` is UNSAFE and must be refused before any
 * `path.join`/filesystem access. Shared by the build-claim reconcile and
 * `classifyCompletionFault` (refuse), `planDependsOn` (reports the token as
 * refused, so `taskSpecFromPlan` refuses the plan) and `unfinishedPredecessors`
 * here (withholds the pass). Lives here because `actions.js` already requires
 * this module at load time, so this module cannot require `actions.js`.
 * @param {*} slug
 * @returns {boolean} true iff `slug` is a bare, path-safe plan slug
 */
function isSafePlanSlug(slug) {
  return typeof slug === 'string'
    && /^[A-Za-z0-9._-]+$/.test(slug)
    && slug !== '.' && slug !== '..' && !slug.includes('..');
}

/**
 * The stages whose plans can still bring a declared file into being: technical
 * planning, the build queue, the build and review. A finished plan is excluded (its
 * file should be on disk); functional and vision plans bring no file into being
 * themselves (their slices do).
 */
const UNFINISHED_STAGES = Object.freeze(['implementation', 'todo', 'in-progress', 'review']);

/**
 * The dependency names in a depends_on value, split as the scheduler splits them
 * (actions.planDependsOn: whitespace or commas; `none` dropped). If ANY other token
 * fails isSafePlanSlug the answer is `null`, not a shorter list: the scheduler refuses
 * the whole list in that case (the plan can never be queued), so the pass fails closed
 * with it. Pure; never throws.
 * @param {*} raw - parseMetadata(content).depends_on (string, array, number, boolean or undefined)
 * @returns {string[]|null} the safe names, or null when the list holds an unsafe token
 */
function dependencyNames(raw) {
  if (raw === undefined || raw === null) return [];
  const names = [];
  for (const token of String(raw).split(/[\s,]+/)) {
    if (token === '' || token.toLowerCase() === 'none') continue;
    if (!isSafePlanSlug(token)) return null;
    names.push(token);
  }
  return names;
}

/** The `.md` plan names (without the extension) in one stage folder; [] when it cannot be read. */
function planNamesIn(plansDir, stage) {
  try {
    return safeFs.readdirSync(path.join(plansDir, stage)).filter((f) => f.endsWith('.md') && f.length > 3).map((f) => f.slice(0, -3));
  } catch {
    return []; // a missing or unreadable stage folder holds no predecessor
  }
}

/**
 * The not-yet-finished plans a plan's depends_on chain reaches, directly or through
 * further not-yet-finished plans, in breadth-first order, each with its declared files.
 * A name is resolved ONLY against `.md` file names read from the four UNFINISHED_STAGES
 * folders (first folder wins); no path is ever built from a depends_on token. A name
 * that resolves to nothing there, or that is also found in plans/done (a finished plan
 * ends the branch, as the scheduler's rule does), ends its branch. The plan itself is
 * never its own predecessor, and a cycle ends the walk. A dependency list holding an
 * unsafe token gives no pass: the plan's own list gives an empty answer, and a
 * predecessor's list leaves that predecessor out. Fails toward "no predecessor": an
 * unreadable folder or plan is skipped. Bounded: the queue holds each plan file name
 * at most once (marked when pushed), is walked by index, and is never filled by spread,
 * so a list of any length neither throws nor goes quadratic.
 * @param {string} planPath - the plan being validated
 * @param {string} content - its content
 * @param {string} projectPath - project root
 * @returns {Array<{ref: string, files: string[]}>} ref is "<stage>/<name>.md"
 */
function unfinishedPredecessors(planPath, content, projectPath) {
  const plansDir = path.join(projectPath, 'plans');
  const stageOf = new Map();
  for (const stage of UNFINISHED_STAGES) {
    for (const name of planNamesIn(plansDir, stage)) if (!stageOf.has(name)) stageOf.set(name, stage);
  }
  const finished = new Set(planNamesIn(plansDir, 'done'));
  const seen = new Set([path.basename(planPath, '.md')]);
  const queue = [];
  /** @param {string[]} names */
  const enqueue = (names) => {
    for (const name of names) {
      if (seen.has(name) || finished.has(name) || !stageOf.has(name)) continue;
      seen.add(name);
      queue.push(name);
    }
  };
  const own = dependencyNames(parseMetadata(content).depends_on);
  if (own === null) return [];
  enqueue(own);
  const out = [];
  for (let i = 0; i < queue.length; i++) {
    const name = queue[i];
    const stage = stageOf.get(name);
    let text;
    try {
      text = safeFs.readFileSync(path.join(plansDir, stage, `${name}.md`), 'utf8');
    } catch {
      continue; // an unreadable predecessor gives no pass
    }
    const theirs = dependencyNames(parseMetadata(text).depends_on);
    if (theirs === null) continue; // the scheduler refuses its list: it never builds, so it earns nothing
    out.push({ ref: `${stage}/${name}.md`, files: parseFilesField(extractFrontmatterRegion(text)) });
    enqueue(theirs);
  }
  return out;
}

/**
 * Validate plan before adding to queue
 */
function validateForQueue(planPath, projectPath) {
  projectPath = projectPath || findProjectRoot();
  const content = safeFs.readFileSync(planPath, 'utf8');

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checklist: {}
  };

  // Must have technical approach
  if (!content.includes('Technical') && !content.includes('Implementation')) {
    result.warnings.push('Plan missing technical approach section');
  }

  // Check for basic structure
  const hasTitle = content.match(/^#\s+\S/m);
  if (!hasTitle) {
    result.errors.push('Plan missing title (# heading)');
    result.valid = false;
  }

  // Count-mover declaration gate (00082): a plan that will CREATE a documented-count
  // artifact (a new tests/*.test.js, src/lib/*.js, src/hooks/*.js, src/tabs/*.js,
  // agents/**/*.md, or skills/**/*.md) MUST declare CLAUDE.md, so the build that
  // moves the count has permission to update it — CLAUDE.md is the ONE ratchet the
  // PreToolUse hook withholds without a declaration. Read the declared files with
  // the MULTI-BLOCK reader: a gate crossing now merges its approval marker into the
  // plan's one frontmatter block, but plans stamped earlier carry a PREPENDED approval
  // block, which the single-block reader cannot see past (it returns [] for them). A
  // hard ERROR (a warning would be ignored) — this is the Gate-2 crossing, the moment
  // the declaration must be right, before a build is committed to the plan.
  //
  // THE PREDECESSOR PASS: a slice that only EDITS a file an earlier, not-yet-finished
  // slice brings into being is not the plan that creates it. Only when today's check
  // already refuses, each offender is decided one by one: a plan reached through this
  // plan's depends_on chain that declares the path AND CLAUDE.md earns the pass (no
  // refusal; recorded in checklist.countMovers.coveredByPredecessor); one that declares
  // the path without CLAUDE.md is named in a refusal; none at all leaves today's text.
  // The scheduler's own rules bound the walk: a finished plan ends a branch, and an
  // unsafe depends_on token withholds the pass (the scheduler refuses that whole list).
  const declaredFiles = parseFilesField(extractFrontmatterRegion(content));
  const countCheck = checkPlanDeclaresCountMovers(declaredFiles, projectPath);
  const coveredByPredecessor = [];
  const refusedMovers = [];
  if (!countCheck.ok) {
    /** @param {string} f */
    const posix = (f) => String(f).replace(/\\/g, '/');
    const preds = unfinishedPredecessors(planPath, content, projectPath);
    for (const off of countCheck.offenders) {
      const declaring = preds.filter((p) => p.files.some((f) => posix(f) === off.path));
      const creator = declaring.find((p) => p.files.some((f) => posix(f) === 'CLAUDE.md'));
      if (creator) {
        coveredByPredecessor.push({ path: off.path, plan: creator.ref });
        continue;
      }
      const countPhrase = off.currentCount != null ? `, currently ${off.currentCount}` : '';
      if (declaring.length > 0) {
        const ref = declaring[0].ref;
        result.errors.push(
          `Plan only edits "${off.path}", which "${ref}" (a plan it depends on) will create (moves the ` +
          `${off.countClass} count${countPhrase}), but "${ref}" does not declare "CLAUDE.md" in its files:. ` +
          `Add "CLAUDE.md" to "${ref}" so its build can update the documented count.`
        );
        refusedMovers.push({ ...off, predecessor: ref });
      } else {
        result.errors.push(
          `Plan will create "${off.path}" (moves the ${off.countClass} count${countPhrase}) but ` +
          `does not declare "CLAUDE.md" in its files:. Add "CLAUDE.md" so the build can update the ` +
          `documented count.`
        );
        refusedMovers.push(off);
      }
    }
    if (refusedMovers.length > 0) result.valid = false;
  }
  result.checklist.countMovers = countCheck.ok
    ? { ok: true, offenders: countCheck.offenders, coveredByPredecessor }
    : { ok: refusedMovers.length === 0, offenders: refusedMovers, coveredByPredecessor };

  // SIP1: a dangling parent_plan reference is a WARNING (never blocks the queue
  // gate) — merge only warnings, never flip `valid`.
  mergeParentPlanWarnings(result, content, projectPath);

  return result;
}

/**
 * Merge the (warning-only) result of validateParentPlan into a gate result.
 * Never copies errors and never flips `valid` — a dangling parent is soft
 * (SIP1 D-VP-3): filesystem links are eventually consistent.
 *
 * @param {ValidationResult} result - the gate result to mutate
 * @param {string} content - plan file content
 * @param {string} projectPath - project root
 */
function mergeParentPlanWarnings(result, content, projectPath) {
  const parentResult = validateParentPlan(content, projectPath);
  result.warnings.push(...parentResult.warnings);
  result.checklist.parentPlan = parentResult.checklist;
}

/**
 * Scan the plan stage directories for a plan file whose slug matches `slug`.
 * Read-only, cross-platform, traversal-safe: `slug` is compared by
 * `path.basename(f, '.md')` only — it is NEVER joined into a filesystem path,
 * so a malicious `parent_plan: ../../etc` simply matches nothing.
 *
 * A leading stage prefix on the value (e.g. `implementation/SIP1`) is tolerated:
 * only the final path segment is compared.
 *
 * @param {string} projectPath - project root
 * @param {string} slug - the parent_plan value (bare slug or `stage/slug`)
 * @returns {boolean} true iff some `plans/<stage>/<slug>.md` exists
 */
function planSlugExists(projectPath, slug) {
  if (typeof slug !== 'string' || slug.length === 0) return false;
  // Strip any leading stage prefix / directory portion; compare the bare name.
  const bare = path.basename(String(slug).replace(/\.md$/i, ''));
  if (bare.length === 0 || bare === '.' || bare === '..') return false;

  const stages = ['vision', 'canvas', 'functional', 'implementation', 'todo', 'in-progress', 'review', 'done'];
  const plansDir = path.join(projectPath, 'plans');

  for (const stage of stages) {
    const dir = path.join(plansDir, stage);
    if (!safeFs.existsSync(dir)) continue;
    let entries;
    try {
      entries = safeFs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const f of entries) {
      if (!f.endsWith('.md')) continue;
      if (path.basename(f, '.md') === bare) return true;
    }
  }
  return false;
}

/**
 * Validate the optional `parent_plan` frontmatter field (SIP1).
 *
 * - Absent `parent_plan` → clean pass (top-level plans have no parent).
 * - Present + resolvable → accepted (recognized, no warning).
 * - Present + dangling (names no plan under plans/) → WARNING, never an error,
 *   never flips `valid` to false (D-VP-3: filesystem links are eventually
 *   consistent, mirroring how `parent_vision` links stubs).
 *
 * Never throws on plan content; returns a ValidationResult.
 *
 * @param {string} content - plan file content
 * @param {string} projectPath - project root
 * @returns {ValidationResult}
 */
function validateParentPlan(content, projectPath) {
  projectPath = projectPath || findProjectRoot();

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checklist: {}
  };

  const metadata = parseMetadata(content);
  const parent = metadata.parent_plan;

  // Optional field: absent → clean pass.
  if (parent === undefined || parent === null || parent === '' || parent === 'none') {
    result.checklist.parentPlan = { present: false, resolved: null };
    return result;
  }

  const parentSlug = String(parent);
  const exists = planSlugExists(projectPath, parentSlug);
  result.checklist.parentPlan = { present: true, value: parentSlug, resolved: exists };

  if (!exists) {
    result.warnings.push(
      `parent_plan "${parentSlug}" names no existing plan (dangling reference)`
    );
  }

  return result;
}

/**
 * Format validation result for display
 *
 * @param {ValidationResult} result
 * @returns {string}
 */
function formatValidationResult(result) {
  let output = '';

  if (result.valid) {
    output += '✓ Validation PASSED\n';
  } else {
    output += '✗ Validation FAILED\n';
  }

  if (result.errors.length > 0) {
    output += '\nBLOCKING ERRORS:\n';
    for (const error of result.errors) {
      output += `  ✗ ${error}\n`;
    }
  }

  if (result.warnings.length > 0) {
    output += '\nWARNINGS:\n';
    for (const warning of result.warnings) {
      output += `  ⚠ ${warning}\n`;
    }
  }

  return output;
}

/**
 * Canonical Iron Loop step labels (Steps 8-16).
 * These are MANDATORY and must appear in this exact order.
 */
const CANONICAL_STEP_LABELS = {
  8: 'TEST',
  9: 'PREPARE',
  10: 'IMPLEMENT',
  11: 'REVIEW',
  12: 'OPTIMIZE',
  13: 'SECURE',
  14: 'VERIFY',
  15: 'DOCUMENT',
  16: 'FINAL-REVIEW'
};

/**
 * Validate that a plan uses the correct Iron Loop step labels.
 *
 * Rules enforced:
 * 1. All 9 steps (8-16) must be present
 * 2. Labels must match the canonical set exactly
 * 3. Only ONE IMPLEMENT step (Step 10) - no duplicates
 * 4. Step 8 must include writing tests (not just "identify coverage")
 * 5. Step 14 must be automated VERIFY (not manual verification)
 * 6. Correct order: TEST -> PREPARE -> IMPLEMENT -> REVIEW -> OPTIMIZE -> SECURE -> VERIFY -> DOCUMENT -> FINAL-REVIEW
 *
 * @param {string} content - Plan file content
 * @returns {ValidationResult}
 */
function validateStepLabels(content) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checklist: {}
  };

  // (a) Strip fenced code blocks first. A "### Step 10: IMPLEMENT" living ONLY
  // inside a ``` / ~~~ fence is an EXAMPLE, not a real step, and must not
  // satisfy the mandatory-step contract (mirrors validateNoContradictions).
  const scanContent = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '');

  // (b) Extract real step HEADINGS from the "## Execution Plan" region ONLY, in
  // document order (same region terminator as extractExecutionRecord). Whole-body
  // scanning let a prose mention of "Step 10: IMPLEMENT" masquerade as a step;
  // headings under the Execution Plan are the only things that count here.
  //
  // This stays on the FIRST region and does NOT follow extractExecutionRecord's
  // richest-evidence selection: the labels being checked are the HUMAN-written ones,
  // and the richest section is typically the template CTOC itself appended — pointing
  // this check there would make it assert against its own output.
  const execMatch = scanContent.match(/^##\s+Execution Plan[\s\S]*$/m);
  const region = execMatch ? execMatch[0].split(/\n##\s+(?!#)/)[0] : '';

  const headings = [];
  // Built via safeRegExp (the codebase's ReDoS-checked wrapper) rather than a literal:
  // the pattern is linear (anchored, disjoint bounded classes, no star-adjacency), but
  // eslint's static detect-unsafe-regex flags any non-trivial literal — safeRegExp is the
  // sanctioned, runtime-validated path used throughout this file.
  const headingRe = safeRegExp('^#{2,4}[ \\t]*Step[ \\t]*(\\d+)\\b[ \\t:.\\-–—]*([A-Za-z][A-Za-z-]*)?', 'gim');
  let hm;
  while ((hm = headingRe.exec(region)) !== null) {
    headings.push({ num: parseInt(hm[1], 10), label: (hm[2] || '').toUpperCase() });
  }

  // Group real headings by step number, preserving duplicates.
  const byNum = new Map();
  for (const h of headings) {
    if (!byNum.has(h.num)) byNum.set(h.num, []);
    byNum.get(h.num).push(h);
  }

  // (c)+(d) Each required step must appear EXACTLY ONCE as a real heading, and
  // its label — matched positionally by step number — must be canonical.
  for (const [numStr, label] of Object.entries(CANONICAL_STEP_LABELS)) {
    const num = parseInt(numStr, 10);
    const found = byNum.get(num) || [];
    const canonical = label.toUpperCase();

    result.checklist[`label_step_${num}`] = {
      expected: label,
      present: found.length > 0,
      count: found.length
    };

    if (found.length === 0) {
      result.errors.push(`Step ${num} (${label}) is missing from the plan`);
      result.valid = false;
      continue;
    }

    if (found.length > 1) {
      result.errors.push(
        `Step ${num} (${label}) appears ${found.length} times - each mandatory ` +
        `step must appear exactly once. Merge duplicate sections into one.`
      );
      result.valid = false;
    }

    // Positional label check on the real heading(s) for this step number. This
    // catches a wrong REAL heading (e.g. "### Step 10: DEPLOY") regardless of
    // any correct-label prose decoy elsewhere in the plan.
    for (const h of found) {
      if (h.label !== canonical) {
        result.errors.push(
          `Step ${num} has wrong label "${h.label || '(none)'}" - must be "${label}"`
        );
        result.valid = false;
      }
    }
  }

  // (e) Required steps must appear in ASCENDING order in the Execution Plan.
  const requiredSeq = headings
    .filter((h) => Object.prototype.hasOwnProperty.call(CANONICAL_STEP_LABELS, h.num))
    .map((h) => h.num);
  for (let i = 1; i < requiredSeq.length; i++) {
    if (requiredSeq[i] <= requiredSeq[i - 1]) {
      result.errors.push(
        `Iron Loop steps are out of order: Step ${requiredSeq[i]} appears after ` +
        `Step ${requiredSeq[i - 1]}. Steps 8-16 must run in ascending order.`
      );
      result.valid = false;
      break;
    }
  }

  // 3. Check Step 8 actually writes tests (not just identifies coverage)
  const step8Section = extractStepSection(content, 8);
  if (step8Section) {
    const identifyOnly = /identify.*coverage|review.*test.*pattern|check.*existing/i.test(step8Section);
    const writesTests = /write.*test|create.*test|test.*function|test.*expect|TDD/i.test(step8Section);

    if (identifyOnly && !writesTests) {
      result.errors.push(
        'Step 8 (TEST) must WRITE tests, not just "identify coverage". ' +
        'This is TDD - tests are written BEFORE implementation.'
      );
      result.valid = false;
    }
  }

  // 4. Check Step 14 is automated VERIFY (not manual)
  const step14Section = extractStepSection(content, 14);
  if (step14Section) {
    const isManualOnly = /manual.*verification|manually.*check/i.test(step14Section) &&
                         !/run.*test|run.*lint|run.*type/i.test(step14Section);

    if (isManualOnly) {
      result.errors.push(
        'Step 14 (VERIFY) must run automated checks (lint, type check, tests). ' +
        'Manual verification belongs in Step 16 (FINAL-REVIEW).'
      );
      result.valid = false;
    }
  }

  return result;
}

/**
 * Extract the content of a specific step section from plan markdown.
 *
 * @param {string} content - Full plan content
 * @param {number} stepNum - Step number to extract
 * @returns {string|null} Step section content or null if not found
 */
function extractStepSection(content, stepNum) {
  const nextStep = stepNum + 1;
  const pattern = safeRegExp(
    `Step\\s*${stepNum}[:\\s][^\\n]*\\n([\\s\\S]*?)(?=###\\s*Step\\s*${nextStep}|###\\s*Step\\s*\\d|## |$)`,
    'i'
  );
  const match = content.match(pattern);
  return match ? match[1] : null;
}

module.exports = {
  validateForReview,
  validateForExecution,
  validateForQueue,
  validateFunctionalToImpl,
  validateVisionForDecomposition,
  validateReviewToDone,
  validateParentPlan,
  validateNoContradictions,
  validateTransition,
  isSafePlanSlug,
  validateStepLabels,
  formatValidationResult,
  ESCALATION_STATUSES,
  CANONICAL_STEP_LABELS
};
