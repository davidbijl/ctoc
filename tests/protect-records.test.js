'use strict';
/**
 * The write protection for the approval records, the check records and the owner's
 * answers — `src/hooks/protect-records.js`, the ONE CTOC hook registered in
 * `hooks/hooks.json` (plan "the approval records, the check records and the owner's
 * answers are write-protected").
 *
 * Every case spawns the REAL entry the way Claude Code does — the PreToolUse payload as
 * JSON on stdin — and reads the exit code and stdout. "Refused" is exit 2 and stdout
 * exactly the deny decision JSON carrying the refusal sentence; "allowed" is exit 0 and
 * empty stdout. Case numbers match the plan's test plan.
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const ENTRY = path.join(REPO, 'src', 'hooks', 'protect-records.js');
const MENU_MD = path.join(REPO, 'src', 'commands', 'start.md');

const REFUSAL = 'CTOC refused this call because it writes, or could write, the approval records, '
  + "the check records or the owner's recorded answers, which only CTOC's menu writes; "
  + 'finish your work, report it, and let the menu record the result.';
const REFUSAL_UNCHECKED = 'CTOC refused this call because it mentions the approval or check records '
  + "and CTOC's protection for them failed to run; tell the human that this protection is broken.";

let project;

function makeProject() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-rec-')));
  for (const d of [
    ['.ctoc', 'approvals'], ['.ctoc', 'state', 'verify'], ['.ctoc', 'streaming', 'questions', 'pending'],
    ['src'], ['plans', 'review'],
  ]) fs.mkdirSync(path.join(dir, ...d), { recursive: true });
  return dir;
}

beforeEach(() => { project = makeProject(); });
afterEach(() => { fs.rmSync(project, { recursive: true, force: true }); project = null; });

function payload(toolName, toolInput, cwd = project) {
  return {
    session_id: 't', transcript_path: path.join(project, 't.jsonl'), cwd,
    permission_mode: 'default', hook_event_name: 'PreToolUse', tool_name: toolName, tool_input: toolInput,
  };
}

function run(input, { cwd = project, entry = ENTRY, env } = {}) {
  let childEnv;
  if (env) {
    childEnv = { ...process.env };       // keeps NODE_V8_COVERAGE, so these runs count toward coverage
    for (const [k, v] of Object.entries(env)) {
      if (v === null) delete childEnv[k]; else childEnv[k] = v;
    }
  }
  return spawnSync(process.execPath, [entry], {
    cwd, env: childEnv, input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8',
  });
}

const p = (...parts) => path.join(project, ...parts);
const write = (file, cwd) => payload('Write', { file_path: file, content: '{}' }, cwd);
const bash = (command, cwd) => payload('Bash', { command, description: 'd' }, cwd);

function deny(sentence) {
  return JSON.stringify({ hookSpecificOutput: {
    hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: sentence,
  } });
}

function assertRefused(res, what, sentence = REFUSAL) {
  assert.equal(res.status, 2, `${what}: expected exit 2, got ${res.status}; stderr: ${res.stderr}`);
  assert.equal(res.stdout, deny(sentence), `${what}: stdout must be exactly the deny decision`);
  // Claude Code ignores the JSON when a hook exits 2 and shows stderr instead, so the
  // agent learns why only from this line.
  assert.equal(res.stderr, `${sentence}\n`, `${what}: stderr must be exactly the refusal sentence`);
}

function assertAllowed(res, what) {
  assert.equal(res.status, 0, `${what}: expected exit 0, got ${res.status}; stdout: ${res.stdout}; stderr: ${res.stderr}`);
  assert.equal(res.stdout, '', `${what}: an allow prints nothing on stdout`);
}

const allowedBash = (command, opts) => assertAllowed(run(bash(command, opts && opts.cwd)), command);

describe('editing tools — refused', () => {
  test('1 · Write to <project>/.ctoc/approvals/x.json', () => {
    assertRefused(run(write(p('.ctoc', 'approvals', 'x.json'))), 'case 1');
  });
  test('2 · Edit of <project>/.ctoc/state/verify/x.json', () => {
    assertRefused(run(payload('Edit', { file_path: p('.ctoc', 'state', 'verify', 'x.json'), old_string: 'a', new_string: 'b' })), 'case 2');
  });
  test('3 · MultiEdit of a relative .ctoc/approvals/x.json', () => {
    assertRefused(run(payload('MultiEdit', { file_path: '.ctoc/approvals/x.json', edits: [{ old_string: 'a', new_string: 'b' }] })), 'case 3');
  });
  test('4 · NotebookEdit of <project>/.ctoc/state/verify/n.ipynb', () => {
    assertRefused(run(payload('NotebookEdit', { notebook_path: p('.ctoc', 'state', 'verify', 'n.ipynb'), new_source: 'x' })), 'case 4');
  });
  test('5 · letter case: <project>/.CTOC/Approvals/x.json', () => {
    assertRefused(run(write(p('.CTOC', 'Approvals', 'x.json'))), 'case 5');
  });
  test('6 · Windows separators: .ctoc\\state\\verify\\x.json', () => {
    assertRefused(run(write('.ctoc\\state\\verify\\x.json')), 'case 6');
  });
  test('7 · `..`: <project>/src/../.ctoc/approvals/x.json', () => {
    assertRefused(run(write(`${project}/src/../.ctoc/approvals/x.json`)), 'case 7');
  });
  test('8 · a symbolic link src/link → .ctoc/state/verify', () => {
    fs.symlinkSync(p('.ctoc', 'state', 'verify'), p('src', 'link'), 'junction');
    assertRefused(run(write(p('src', 'link', 'x.json'))), 'case 8');
  });
  test('9 · session working directory is <project>/src', () => {
    assertRefused(run(write(p('.ctoc', 'approvals', 'x.json'), p('src')), { cwd: p('src') }), 'case 9');
  });
});

describe('editing tools — allowed', () => {
  test('10 · a source file in a project with no plan and no Iron Loop state', () => {
    assertAllowed(run(write(p('src', 'x.js'))), 'case 10');
  });
  test('11 · the waiting folder for new questions', () => {
    assertAllowed(run(write(p('.ctoc', 'streaming', 'questions', 'pending', 'implementation__x.md.json'))), 'case 11');
  });
  test('12 · same-prefix siblings', () => {
    assertAllowed(run(write(p('.ctoc', 'approvals-summary.md'))), 'case 12a');
    assertAllowed(run(write(p('.ctoc', 'state', 'verify-notes.md'))), 'case 12b');
  });
  // The settings file itself is protected since the owner's answer "a" (2026-10-08), so this
  // path now gets the settings sentence, not the records one; a neutral file shows `..` still
  // resolves out of the approval folder.
  test('13 · .ctoc/approvals/../<file> resolves out of the folder', () => {
    assertAllowed(run(write(`${project}/.ctoc/approvals/../notes.md`)), 'case 13');
    assertRefused(run(write(`${project}/.ctoc/approvals/../settings.yaml`)), 'case 13 (settings)',
      "CTOC refused this call because it writes, or could write, the project's settings file or its "
      + "regulatory profiles, which only CTOC's menu writes; tell the human what you wanted to change "
      + 'and let the menu change it.');
  });
  test('14 · a plan file', () => {
    assertAllowed(run(write(p('plans', 'review', 'x.md'))), 'case 14');
  });
});

// Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the record-write refusal is off, so this is now allowed.
describe('shell — record writes (allowed since 15 Oct 2026; the Write and Edit tools stay refused)', () => {
  test('15 · redirect into the check records', () => allowedBash(`echo '{"passed":true}' > .ctoc/state/verify/x.json`));
  test('16 · append into the approval records', () => allowedBash('cat forged.json >> .ctoc/approvals/x.json'));
  test('17 · tee', () => allowedBash('tee .ctoc/approvals/x.json < forged.json'));
  test('18 · cp', () => allowedBash('cp /tmp/f.json .ctoc/state/verify/x.json'));
  test('19 · mv', () => allowedBash('mv f.json .ctoc/approvals/x.json'));
  test('20 · rm', () => allowedBash('rm .ctoc/state/verify/x.json'));
  test('21 · sed -i', () => allowedBash(`sed -i '' 's/false/true/' .ctoc/state/verify/x.json`));
  test('22 · touch', () => allowedBash('touch .ctoc/approvals/x.json'));
  test('23 · python one-liner', () => allowedBash(`python3 -c "open('.ctoc/state/verify/x.json','w').write('{}')"`));
  test('24 · node one-liner', () => allowedBash(`node -e "require('fs').writeFileSync('.ctoc/approvals/x.json','{}')"`));
  test('25 · cd split', () => allowedBash('cd .ctoc && echo x > state/verify/x.json'));
  test('26 · cd split, deeper', () => allowedBash('cd .ctoc/state && cp f.json verify/x.json'));
  test('27 · quote split', () => allowedBash('echo x > .ctoc"/"state/verify/x.json'));
  test('28 · letter case', () => allowedBash('echo x > .CTOC/APPROVALS/x.json'));
  test('29 · Windows separators', () => allowedBash('echo x > .ctoc\\\\state\\\\verify\\\\x.json'));
  test('30 · `..`', () => allowedBash('echo x > src/../.ctoc/approvals/x.json'));
  test('31 · through a symbolic link to .ctoc/state/verify', () => {
    fs.symlinkSync(p('.ctoc', 'state', 'verify'), p('src', 'link'), 'junction');
    allowedBash('echo x > src/link/x.json');
  });
  test('32 · creating a link to the approval records', () => allowedBash('ln -s ../.ctoc/approvals src/l'));
  test('33 · the session already stands in .ctoc', () => allowedBash('echo x > approvals/x.json', { cwd: p('.ctoc') }));
  test('34 · backfill --plan --stage done', () => allowedBash('node src/scripts/ledger-backfill.js --plan plans/review/x.md --stage done'));
  test('35 · backfill --mark-migrated --force', () => allowedBash('node "${CLAUDE_PLUGIN_ROOT}/src/scripts/ledger-backfill.js" --mark-migrated --force'));
  test('36 · backfill --vision with an extra --root', () => allowedBash('node src/scripts/ledger-backfill.js --vision --root /elsewhere'));
  test('37 · an inline script running the backfill', () => allowedBash(`node -e "require('./src/scripts/ledger-backfill').run(['--plan','x','--stage','todo'])"`));
  test('38 · approvePlan inline', () => allowedBash(`node -e "require('./src/lib/actions').approvePlan('review/x.md','done')"`));
  test('39 · persistVerifyResult inline', () => allowedBash(`node -e "require('./src/lib/step-13-verify').persistVerifyResult(process.cwd(),'x')"`));
  test('40 · crossBySufficiency inline', () => allowedBash(`node -e "require('./src/lib/streaming-gate').crossBySufficiency(process.cwd(),'p','implementation/p.md','implementation','todo',{enough:true})"`));
  test('41 · streamApprove inline', () => allowedBash(`node -e "require('./src/lib/streaming-gate').streamApprove('review/x.md',process.cwd())"`));
  test('42 · decoded payload into node', () => allowedBash('echo bm9kZQ== | base64 -d | node'));
  test('43 · a menu call hiding a command substitution', () => allowedBash(
    'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task complete t1 --summary "$(echo x > .ctoc/approvals/a.json)"'));
  test('44 · a menu call followed by a write', () => allowedBash('node src/commands/start.js menu; echo x > .ctoc/approvals/a.json'));
  test('45 · git diff --output into the records', () => allowedBash('git diff --output=.ctoc/approvals/x.json'));
  test('46 · git checkout of a record', () => allowedBash('git checkout -- .ctoc/approvals/x.json'));
});

describe('shell — allowed', () => {
  test('47 · reads', () => {
    allowedBash('ls .ctoc/approvals');
    allowedBash('cat .ctoc/state/verify/x.json');
    allowedBash('grep -r passed .ctoc/state/verify');
  });
  test('48 · the test suite', () => {
    allowedBash('npm test');
    allowedBash('node --test tests/ledger-backfill-coverage.test.js');
  });
  test('49 · a menu call whose summary names both folders', () => allowedBash(
    'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task complete t1 --summary "wrote .ctoc/state/verify/x.json and .ctoc/approvals/y.json"'));
  test('50 · the --vision backfill recipe, with and without --dry-run', () => {
    allowedBash('node "${CLAUDE_PLUGIN_ROOT}/src/scripts/ledger-backfill.js" --vision');
    allowedBash('node "${CLAUDE_PLUGIN_ROOT}/src/scripts/ledger-backfill.js" --vision --dry-run');
    allowedBash('node "${CLAUDE_PLUGIN_ROOT}/src/scripts/ledger-backfill.js" --dry-run --vision');
  });
  test('51 · every node -e recipe in the live start.md', () => {
    const md = fs.readFileSync(MENU_MD, 'utf8');
    const recipes = [];
    const re = /`(node\s+-e\s+"[^`]*")`/g;
    let m;
    while ((m = re.exec(md)) !== null) recipes.push(m[1]);
    assert.ok(recipes.length >= 5, `expected at least 5 recipes, found ${recipes.length}`);
    for (const r of recipes) allowedBash(r);
  });
  test('52 · staging and committing records by name', () => allowedBash(
    'git add .ctoc/approvals/00001-x.json .ctoc/state/verify/x.json && git commit -m "records"'));
  test('53 · a source write in a project with no plan and no Iron Loop state', () => allowedBash('echo x > src/x.js'));
  test('54 · reading and staging the backfill script', () => {
    allowedBash('cat src/scripts/ledger-backfill.js');
    allowedBash('git add src/scripts/ledger-backfill.js');
  });
});

describe('when the protection cannot run (a release missing its dependencies)', () => {
  let plugin;
  let brokenEntry;
  beforeEach(() => {
    plugin = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-plug-')));
    fs.mkdirSync(path.join(plugin, 'src', 'hooks'), { recursive: true });
    fs.mkdirSync(path.join(plugin, 'src', 'lib'), { recursive: true });
    brokenEntry = path.join(plugin, 'src', 'hooks', 'protect-records.js');
    fs.copyFileSync(ENTRY, brokenEntry);
    fs.copyFileSync(path.join(REPO, 'src', 'lib', 'hook-deny-signal.js'), path.join(plugin, 'src', 'lib', 'hook-deny-signal.js'));
  });
  afterEach(() => fs.rmSync(plugin, { recursive: true, force: true }));

  test('55 · a shell write naming the records is refused with the second sentence', () => {
    assertRefused(run(bash('echo x > .ctoc/approvals/a.json'), { entry: brokenEntry }), 'case 55', REFUSAL_UNCHECKED);
  });
  test('56 · a Write to the check records is refused with the second sentence', () => {
    assertRefused(run(write(p('.ctoc', 'state', 'verify', 'x.json')), { entry: brokenEntry }), 'case 56', REFUSAL_UNCHECKED);
  });
  test('57 · an ordinary call is allowed', () => {
    assertAllowed(run(bash('ls'), { entry: brokenEntry }), 'case 57');
  });
  test('73 · a project path that mentions a record word does not refuse every call', () => {
    const elsewhere = (command) => ({
      session_id: 't', transcript_path: '/x/verify-project/t.jsonl', cwd: '/x/verify-project',
      permission_mode: 'default', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command },
    });
    assertAllowed(run(elsewhere('ls'), { entry: brokenEntry }), 'case 73a');
    assertRefused(run(elsewhere('echo x > .ctoc/approvals/a.json'), { entry: brokenEntry }), 'case 73b', REFUSAL_UNCHECKED);
  });
});

describe('payloads', () => {
  test('58 · empty stdin is allowed', () => assertAllowed(run(''), 'case 58'));
  test('59 · non-JSON stdin: refused when it mentions the records, allowed otherwise', () => {
    assertRefused(run('not json .ctoc/approvals'), 'case 59a', REFUSAL_UNCHECKED);
    assertAllowed(run('not json ls'), 'case 59b');
  });
});

describe('registration', () => {
  test('60 · hooks/hooks.json registers exactly the one protection', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO, 'hooks', 'hooks.json'), 'utf8'));
    assert.deepEqual(Object.keys(manifest.hooks), ['PreToolUse']);
    const groups = manifest.hooks.PreToolUse;
    assert.equal(groups.length, 1);
    assert.equal(groups[0].hooks.length, 1);
    const matcher = new RegExp(`^(?:${groups[0].matcher})$`);
    for (const tool of ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash']) assert.ok(matcher.test(tool), `matches ${tool}`);
    for (const tool of ['Read', 'Task', 'Agent', 'Glob', 'Grep']) assert.ok(!matcher.test(tool), `does not match ${tool}`);
    const hook = groups[0].hooks[0];
    assert.equal(hook.type, 'command');
    assert.equal(hook.command, 'node "${CLAUDE_PLUGIN_ROOT}/src/hooks/protect-records.js"');
    const script = hook.command.replace('${CLAUDE_PLUGIN_ROOT}', REPO).match(/^node "([^"]+)"$/)[1];
    assert.equal(path.relative(REPO, script).split(path.sep).join('/'), 'src/hooks/protect-records.js');
    assert.ok(fs.existsSync(script), 'the registered command names an existing file');
  });
  test('61 · .claude-plugin/plugin.json has no hooks key', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.ok(!Object.prototype.hasOwnProperty.call(manifest, 'hooks'));
  });
});

describe("the owner's answers and the live question files", () => {
  test('62 · Write to the answers log', () => {
    assertRefused(run(write(p('.ctoc', 'streaming', 'answers.jsonl'))), 'case 62');
  });
  test('63 · Edit of a live question file', () => {
    assertRefused(run(payload('Edit', { file_path: p('.ctoc', 'streaming', 'questions', 'review__x.md.json'), old_string: 'a', new_string: 'b' })), 'case 63');
  });
  test('64 · a Write that normalises out of the waiting folder', () => {
    assertRefused(run(write(`${project}/.ctoc/streaming/questions/pending/../review__x.md.json`)), 'case 64');
  });
  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the record-write refusal is off, so this is now allowed.
  test('65 · shell append to the answers log and reading it are both allowed', () => {
    allowedBash(`echo '{}' >> .ctoc/streaming/answers.jsonl`);
    allowedBash('cat .ctoc/streaming/answers.jsonl');
  });
  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the record-write refusal is off, so this is now allowed.
  test('66 · streamAnswer inline is allowed', () => allowedBash(
    `node -e "require('./src/lib/streaming-gate').streamAnswer('review/x.md','q1','a',process.cwd())"`));
  test('67 · the menu route that records an answer', () => allowedBash(
    'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" stream answer review/x.md q1 a'));
  test('68 · the waiting folder stays writable', () => {
    assertAllowed(run(write(p('.ctoc', 'streaming', 'questions', 'pending', 'implementation__y.md.json'))), 'case 68');
  });
});

describe('security scan findings (Step 13)', () => {
  const MENU = 'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"';
  function plantFakeMenu() {
    fs.mkdirSync(p('scratch', 'src', 'commands'), { recursive: true });
    fs.writeFileSync(p('scratch', 'src', 'commands', 'start.js'), "require('fs').writeFileSync(process.argv[2], '{}');\n");
  }
  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the record-write refusal is off, so this is now allowed.
  test('69 · an agent-written …/src/commands/start.js with a record path is allowed', () => {
    plantFakeMenu();
    allowedBash('node scratch/src/commands/start.js menu task complete t1 --summary "wrote .ctoc/approvals/y.json"');
    allowedBash('node scratch/src/commands/start.js .ctoc/approvals/x.json');
    allowedBash(`node "${project}/scratch/src/commands/start.js" .ctoc/state/verify/x.json`);
  });
  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the record-write refusal is off, so this is now allowed.
  test('70 · the real menu with a record path as an argument is allowed', () => {
    allowedBash(`${MENU} .ctoc/approvals/x.json`);
    allowedBash(`${MENU} menu task complete t1 --summary .ctoc/state/verify/x.json`);
    allowedBash(`${MENU} menu x src/../.ctoc/approvals/y.json`);
  });
  test('71 · the real menu with ordinary menu commands stays allowed', () => {
    allowedBash(`${MENU} menu task complete t1 --summary "x"`);
    allowedBash(`${MENU} stream answer review/x.md q1 a`);
    allowedBash(`${MENU} menu task add precompute 'implementation/x.md' --touches '.ctoc/streaming/questions/implementation/x.md'`);
  });
  test('72 · a Bash payload whose command is not a string is treated as unreadable', () => {
    const arr = JSON.stringify({ tool_name: 'Bash', tool_input: { command: ['echo', 'x', '>', '.ctoc/approvals/x.json'] } });
    assertRefused(run(arr), 'case 72a', REFUSAL_UNCHECKED);
    assertAllowed(run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: { a: 1 } } })), 'case 72b');
    assertAllowed(run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 5 } })), 'case 72c');
  });
});

// Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
describe('a background agent through the menu (refused by the owner, 2026-10-07; allowed since 15 Oct 2026)', () => {
  const MENU = 'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"';
  const agentBash = (command, agentId = 'a1b2c3') => ({
    ...bash(command), agent_id: agentId, agent_type: 'iron-loop-executor',
  });
  const allowedAgent = (command) => assertAllowed(run(agentBash(command)), command);

  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
  test("74 · a background agent's `stream answer` is allowed", () => {
    allowedAgent(`${MENU} stream answer review/x.md 'q10-db' '1'`);
  });
  test('75 · the same call from the main session, or with an empty agent id, is allowed', () => {
    allowedBash(`${MENU} stream answer review/x.md 'q10-db' '1'`);
    assertAllowed(run(agentBash(`${MENU} stream answer review/x.md 'q10-db' '1'`, '')), 'empty agent id');
  });
  test("76 · the build agent's own completion is allowed", () => {
    allowedAgent(`${MENU} menu task complete t7 --summary "built"`);
  });
  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
  test('77 · every other route that answers, approves or crosses is allowed', () => {
    for (const route of ['', '--live-agent-ids a,b', 'stream approve review/x.md', 'stream skip review/x.md',
      'stream comment review/x.md looks fine', 'stream', 'plan', 'menu task complete t7 --continue --summary "x"',
      '"stream answer review/x.md q10-db 1"', 'frobnicate']) {
      allowedAgent(`${MENU} ${route}`.trim());
    }
  });
  test('78 · the routes that answer nothing stay allowed', () => {
    for (const route of ['menu task fail t7 --summary x', 'menu task add implement p --touches a.js', 'menu task list',
      'menu commands', 'dashboard', 'tasks', 'task t7', 'browse review', 'section execution', 'stubs s',
      'validate review/x.md', 'inbox gates', 'plan review/x.md']) {
      allowedAgent(`${MENU} ${route}`);
    }
  });
  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
  test('79 · the menu reached outside a pure call is allowed to a background agent and to the main session', () => {
    const compound = 'node src/commands/start.js stream approve review/x.md; true';
    const inline = `node -e "require('./src/lib/menu-screens').route(['stream','answer','review/x.md','q10-db','1'],process.cwd())"`;
    allowedAgent(compound);
    allowedAgent(inline);
    allowedBash(compound);
    allowedBash(inline);
  });
  test("80 · a background agent's ordinary work is allowed", () => {
    allowedAgent('npm test');
    allowedAgent('node --test tests/plans-keep-moving-without-the-human.test.js');
    allowedAgent('grep -n route src/commands/start.js');
  });
  test('81 · a crash on a background agent\'s menu call refuses; on the main session\'s it allows', () => {
    const plugin = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-plug-')));
    try {
      fs.mkdirSync(path.join(plugin, 'src', 'hooks'), { recursive: true });
      fs.mkdirSync(path.join(plugin, 'src', 'lib'), { recursive: true });
      const brokenEntry = path.join(plugin, 'src', 'hooks', 'protect-records.js');
      fs.copyFileSync(ENTRY, brokenEntry);
      fs.copyFileSync(path.join(REPO, 'src', 'lib', 'hook-deny-signal.js'), path.join(plugin, 'src', 'lib', 'hook-deny-signal.js'));
      const call = `${MENU} stream answer review/x.md 'q10-db' '1'`;
      assertRefused(run(agentBash(call), { entry: brokenEntry }), 'crash, background agent', REFUSAL_UNCHECKED);
      assertAllowed(run(bash(call), { entry: brokenEntry }), 'crash, main session');
    } finally {
      fs.rmSync(plugin, { recursive: true, force: true });
    }
  });
});

// Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
describe('a background agent: one reading of a command (refused by the security review, 2026-10-07; allowed since 15 Oct 2026)', () => {
  const MENU = 'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"';
  const agentBash = (command) => ({ ...bash(command), agent_id: 'a1b2c3', agent_type: 'iron-loop-executor' });
  const allowedAgent = (command) => assertAllowed(run(agentBash(command)), command);
  const b64 = (obj) => Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64');

  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
  test('82 · anything that reaches the menu but is not one simple direct call is allowed', () => {
    for (const command of [
      `${MENU} menu task list; node src/commands/start.js stream approve review/x.md`,
      `${MENU} menu task list && true`,
      `${MENU} menu task list | cat`,
      `${MENU} menu task list $(echo x)`,
      `${MENU} menu task list \`echo x\``,
      `${MENU} menu task list # note`,
      `${MENU} menu task list\nnode src/commands/start.js stream approve review/x.md`,
      `${MENU} "menu task list $HOME"`,
      'node "$P/src/commands/start.js" menu task list',
      `sh -c 'node src/commands/start.js stream approve review/x.md'`,
      'env node src/commands/start.js menu task list',
      'grep -n route src/commands/start.js | head',
      `node -e "require('./src/lib/streaming-precompute')"`,
      `node -e "require('./src/lib/actions').approvePlan('x')"`,
    ]) allowedAgent(command);
  });
  test('82 · the nearest legitimate commands stay allowed', () => {
    allowedAgent(`${MENU} menu task list`);
    allowedAgent(`${MENU} 'menu' 'task' 'list'`);
    allowedAgent(`${MENU} "menu task list"`);
    allowedAgent(`${MENU} --live-agent-ids a,b menu task list`);
    allowedAgent(`${process.execPath} "\${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task list`);
    allowedAgent('grep -n route src/commands/start.js');
    allowedAgent('cat src/lib/menu-screens.js');
  });
  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
  test('85 · naming the menu, every node form is allowed: other scripts, options, prefixes and runtimes', () => {
    fs.mkdirSync(p('server'), { recursive: true });
    fs.writeFileSync(p('server', 'start.js'), '');
    const SCRIPT = '"${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"';
    for (const command of [
      'node --test tests/streaming-gate.test.js',
      'node server/start.js --port 3000',
      `node --no-warnings ${SCRIPT} menu task list`,
      `node -- ${SCRIPT} menu task list`,
      `node -r ./x.js ${SCRIPT} menu task list`,
      `node --require ./x.js ${SCRIPT} menu task list`,
      `env node ${SCRIPT} menu task list`,
      `FOO=1 node ${SCRIPT} menu task list`,
      `bun ${SCRIPT} menu task list`,
      `deno run ${SCRIPT} menu task list`,
      `tsx ${SCRIPT} menu task list`,
      `npx node ${SCRIPT} menu task list`,
      `bash -c 'node ${SCRIPT} menu task list'`,
      `sh -c 'node src/commands/start.js menu task list'`,
    ]) allowedAgent(command);
    allowedAgent(`node ${SCRIPT} menu task list`);
    allowedAgent('head -n 5 src/commands/start.js');
    allowedAgent('wc -l src/lib/streaming-gate.js');
  });
  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
  test("86 · the build agent's completion: single or double quotes, with or without $ and backtick, are all allowed", () => {
    allowedAgent(`${MENU} menu task complete t7 --summary 'cost $5; done # (x) & y | z \`ls\`'`);
    allowedAgent(`${MENU} menu task complete t7 --summary "a; b # c & d | (e) done!"`);
    allowedAgent(`${MENU} menu task complete t7 --summary "cost $5"`);
    allowedAgent(`${MENU} menu task complete t7 --summary "ran \`ls\`"`);
  });
  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
  test('83 · an unknown or extra word on a menu route is allowed', () => {
    for (const route of ['menu commands extra', 'menu task list extra', 'menu task board x', 'dashboard extra',
      'tasks extra', 'task t7 extra', 'browse review extra', 'validate review/x.md extra', 'inbox questions extra',
      'inbox cleanup confirm dead-on-arrival', 'inbox cleanup override s', 'inbox cleanup plan', 'plan review/x.md extra',
      'menu task start t7 --force', 'menu task cancel t7 --force', 'menu task complete t7 --fail',
      'menu task complete t7 extra', 'menu task complete', 'menu task add implement p q', 'menu task add',
      'menu task frob t7']) {
      allowedAgent(`${MENU} ${route}`);
    }
  });
  test('83 · the nearest allowed routes stay allowed', () => {
    for (const route of ['menu', 'menu commands', 'menu task list', 'menu task board',
      'menu task add implement p --touches a.js --label l', 'menu task start t7 --agent-id abc',
      'menu task fail t7 --summary x', 'menu task cancel t7', 'menu task complete t7 --summary "built" --gate 3 --next tasks',
      'dashboard', 'tasks', 'task t7', 'browse review', 'inbox questions', 'inbox verify', 'inbox cleanup',
      'inbox cleanup category', 'inbox cleanup plan s', 'plan review/x.md', 'validate review/x.md']) {
      allowedAgent(`${MENU} ${route}`);
    }
  });
  // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
  test('84 · --b64 payloads, however they decode, are allowed', () => {
    allowedAgent(`${MENU} menu task complete t7 --b64 ${b64({ continue: true })}`);
    allowedAgent(`${MENU} menu task complete t7 --b64 ${b64({ summary: 'x', stage_to: 'done' })}`);
    allowedAgent(`${MENU} menu task complete t7 --b64 ${b64({ summary: 'x', nextAction: 'claude:approve review/x.md' })}`);
    allowedAgent(`${MENU} menu task complete t7 --b64 ${b64('not json at all')}`);
    allowedAgent(`${MENU} menu task complete t7 --b64 ${b64([1, 2])}`);
    allowedAgent(`${MENU} menu task add implement p --b64 ${b64({ kind: 'implement', approve: true })}`);
    allowedAgent(`${MENU} menu task complete t7 --b64 ${b64({ summary: 'built', gate: 3, nextAction: 'tasks' })}`);
    allowedAgent(`${MENU} menu task add implement p --b64 ${b64({ kind: 'implement', plan: 'p', touches: ['a.js'] })}`);
    allowedBash(`${MENU} menu task complete t7 --b64 ${b64({ continue: true })}`);
  });
  test('82 · without an agent id the same commands are decided as before', () => {
    allowedBash(`${MENU} menu task list && true`);
    allowedBash(`sh -c 'node src/commands/start.js stream approve review/x.md'`);
    allowedBash('grep -n route src/commands/start.js | head');
  });
});

// Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
describe('the verification round: every way of reaching the menu is allowed to a background agent (15 Oct 2026)', () => {
  const agentBash = (command, cwd) => ({ ...bash(command, cwd), agent_id: 'a1b2c3', agent_type: 'iron-loop-executor' });
  const allowedAgent = (command, cwd) => assertAllowed(run(agentBash(command, cwd)), command);
  /** Another copy of CTOC inside the project: named "ctoc" by its package.json or its plugin.json. */
  function ctocCopy(dir, manifest = 'package') {
    fs.mkdirSync(p(dir, 'src', 'commands'), { recursive: true });
    fs.mkdirSync(p(dir, 'src', 'lib'), { recursive: true });
    fs.writeFileSync(p(dir, 'src', 'commands', 'start.js'), '');
    fs.writeFileSync(p(dir, 'src', 'lib', 'actions.js'), '');
    if (manifest === 'package') fs.writeFileSync(p(dir, 'package.json'), '{"name":"CTOC"}');
    else {
      fs.mkdirSync(p(dir, '.claude-plugin'), { recursive: true });
      fs.writeFileSync(p(dir, '.claude-plugin', 'plugin.json'), '{"name":"ctoc"}');
    }
  }

  test('87 · every CTOC menu, however Node finds it, is allowed', () => {
    ctocCopy('copy');
    ctocCopy('cache', 'plugin');
    for (const command of [
      'node copy/src/commands/start stream approve review/x.md',
      'node copy/src/commands/START.JS stream approve review/x.md',
      'node copy/src/commands/Start.js stream approve review/x.md',
      'node copy/src/commands/start.js stream approve review/x.md',
      `node ${p('cache', 'src', 'commands', 'start.js')} stream approve review/x.md`,
      'node copy/src/commands stream approve review/x.md',
      'node gone/src/commands/start stream approve review/x.md',
      'cd copy/src/commands && node start stream approve review/x.md',
    ]) allowedAgent(command);
    allowedAgent('node start stream approve review/x.md', p('copy', 'src', 'commands'));
    allowedAgent('node copy/src/commands/start menu task list');
    allowedAgent(`node ${p('cache', 'src', 'commands', 'start.js')} menu task list`);
    allowedAgent('node start menu task list', p('copy', 'src', 'commands'));
    fs.mkdirSync(p('scripts'), { recursive: true });
    fs.writeFileSync(p('scripts', 'build.js'), '');
    allowedAgent('node scripts/build.js --watch');
    allowedBash('node copy/src/commands/start stream approve review/x.md');
  });

  test("88 · inline code naming CTOC's code is allowed to a background agent", () => {
    ctocCopy('copy');
    for (const command of [
      `node -e "require('./src/lib/loop-b-driver').loopBDirective(process.cwd())"`,
      `node -e "require('./src/lib/actions').movePlan('a','b')"`,
      `node -p "require('./src/lib/actions')"`,
      `node --eval "require('./src/commands/start.js')"`,
      `node --print "require('./src/lib/actions')"`,
      `node --input-type=commonjs -e "require('ctoc/lib')"`,
      `echo "require('./src/lib/actions').movePlan()" | node`,
      `node -e "require('./copy/src/lib/actions')"`,
    ]) allowedAgent(command);
    allowedAgent(`node -e "console.log(1 + 1)"`);
    allowedAgent(`node -e "require('fs').readdirSync('.')"`);
    allowedAgent('cat src/lib/actions.js');
    allowedBash(`node -e "require('./src/lib/loop-b-driver').loopBDirective(process.cwd())"`);
  });

  test("89 · `menu task` arguments, however the menu's own parser reads them, are allowed", () => {
    const { parseTaskArgs } = require('../src/lib/menu-screens.js');
    const MENU = 'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task complete';
    const vectors = [
      [['t7', '--summary', '--continue'], true],
      [['t7', '--gate', '--continue'], true],
      [['t7', '--continue'], false],
      [['t7', '--summary', 'x', '--continue'], false],
      [['t7', '--force'], false],
      [['t7', '--fail'], false],
    ];
    for (const [args, allowed] of vectors) {
      const parsed = parseTaskArgs(args);
      assert.equal(!(parsed.continue || parsed.force || parsed.fail), allowed, `the menu reads ${args.join(' ')} that way`);
      const res = run(agentBash(`${MENU} ${args.map((a) => `'${a}'`).join(' ')}`));
      assert.equal(res.status, 0, `the hook allows ${args.join(' ')}`);
    }
  });
});

// Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the background-agent refusal is off, so this is now allowed.
describe('the re-verification: an interpreter carrying a path into CTOC code is allowed to a background agent (15 Oct 2026)', () => {
  const agentBash = (command) => ({ ...bash(command), agent_id: 'a1b2c3', agent_type: 'iron-loop-executor' });
  const MENU = 'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"';

  test('90 · python, ruby and perl carrying `src/lib/` code, plain reads and the menu list are all allowed', () => {
    for (const command of [
      `python3 -c "import subprocess; subprocess.run(['node','-e','require(\\'./src/lib/loop-b-driver\\').loopBDirective(process.cwd())'])"`,
      `python3 -c "import subprocess; subprocess.run(['node','-e','require(\\"./src/lib/actions\\").movePlan(\\'a\\',\\'b\\')'])"`,
      `ruby -e "system('node', '-e', 'require(\\"./src/lib/actions\\").movePlan(\\"a\\",\\"b\\")')"`,
      `perl -e 'system("node", "-e", "require(\\"./src/lib/actions\\").movePlan()")'`,
    ]) assertAllowed(run(agentBash(command)), command);
    for (const command of ['cat src/lib/x.js', 'grep -n foo src/lib/x.js', 'npm test', 'git status',
      `${MENU} menu task list`, `${MENU} menu task complete t7 --summary 'built src/lib/x.js'`, `${MENU} inbox questions`]) {
      assertAllowed(run(agentBash(command)), command);
    }
    allowedBash(`python3 -c "import subprocess; subprocess.run(['node','-e','require(\\'./src/lib/loop-b-driver\\').loopBDirective(process.cwd())'])"`);
  });
});

describe("the regulatory settings and profiles are protected like the records (owner's answer \"a\", 2026-10-08)", () => {
  const REFUSAL_SETTINGS = "CTOC refused this call because it writes, or could write, the project's settings "
    + "file or its regulatory profiles, which only CTOC's menu writes; tell the human what you wanted to "
    + 'change and let the menu change it.';
  const agentPayload = (input) => ({ ...input, agent_id: 'a1b2c3', agent_type: 'iron-loop-executor' });
  const MENU_JS = path.join(REPO, 'src', 'commands', 'start.js');

  test('91 · editing tools on .ctoc/settings.yaml and .ctoc/regulatory-regimes/ are refused, main session and background agent alike', () => {
    fs.mkdirSync(p('.ctoc', 'regulatory-regimes'), { recursive: true });
    fs.writeFileSync(p('.ctoc', 'settings.yaml'), 'regulatory_regime:\n  active_profiles: []\n');
    const calls = {
      'Edit of .ctoc/settings.yaml': payload('Edit', { file_path: p('.ctoc', 'settings.yaml'), old_string: '[]', new_string: '[gdpr]' }),
      'Write of .ctoc/regulatory-regimes/gdpr.yaml': write(p('.ctoc', 'regulatory-regimes', 'gdpr.yaml')),
      'MultiEdit of a relative .ctoc/settings.yaml': payload('MultiEdit', { file_path: '.ctoc/settings.yaml', edits: [{ old_string: 'a', new_string: 'b' }] }),
      'NotebookEdit under .ctoc/regulatory-regimes': payload('NotebookEdit', { notebook_path: p('.ctoc', 'regulatory-regimes', 'n.ipynb'), new_source: 'x' }),
      'letter case .CTOC/Settings.yaml': write(p('.CTOC', 'Settings.yaml')),
      '`..` through src': write(`${project}/src/../.ctoc/regulatory-regimes/x.yaml`),
      'Windows separators': write('.ctoc\\settings.yaml'),
    };
    for (const [what, call] of Object.entries(calls)) {
      assertRefused(run(call), what, REFUSAL_SETTINGS);
      assertRefused(run(agentPayload(call)), `${what} (background agent)`, REFUSAL_SETTINGS);
    }
  });

  test('92 · a symbolic link into the profile folder, and one to the settings file, are refused', () => {
    fs.mkdirSync(p('.ctoc', 'regulatory-regimes'), { recursive: true });
    fs.writeFileSync(p('.ctoc', 'settings.yaml'), 'x: 1\n');
    fs.symlinkSync(p('.ctoc', 'regulatory-regimes'), p('src', 'regimes'), 'junction');
    fs.symlinkSync(p('.ctoc', 'settings.yaml'), p('src', 'settings-link.yaml'));
    assertRefused(run(write(p('src', 'regimes', 'gdpr.yaml'))), 'link into the folder', REFUSAL_SETTINGS);
    assertRefused(run(write(p('src', 'settings-link.yaml'))), 'link to the file', REFUSAL_SETTINGS);
    assertRefused(run(bash('echo x >> src/settings-link.yaml')), 'shell through the link', REFUSAL_SETTINGS);
  });

  test('93 · shell writes are refused', () => {
    fs.mkdirSync(p('.ctoc', 'regulatory-regimes'), { recursive: true });
    fs.writeFileSync(p('.ctoc', 'settings.yaml'), 'x: 1\n');
    for (const command of [
      'echo x >> .ctoc/settings.yaml',
      "sed -i '' 's/\\[\\]/[gdpr]/' .ctoc/settings.yaml",
      'sed -i s/a/b/ .ctoc/settings.yaml',
      'cp /tmp/gdpr.yaml .ctoc/regulatory-regimes/gdpr.yaml',
      'rm .ctoc/regulatory-regimes/gdpr.yaml',
      'cd .ctoc && tee settings.yaml < /tmp/x',
      'printf x > .ctoc/regulatory-regimes/x.yaml',
    ]) {
      assertRefused(run(bash(command)), command, REFUSAL_SETTINGS);
      assertRefused(run(agentPayload(bash(command))), `${command} (background agent)`, REFUSAL_SETTINGS);
    }
  });

  test('94 · reading stays allowed', () => {
    fs.mkdirSync(p('.ctoc', 'regulatory-regimes'), { recursive: true });
    fs.writeFileSync(p('.ctoc', 'settings.yaml'), 'x: 1\n');
    for (const command of ['cat .ctoc/settings.yaml', 'grep -n active_profiles .ctoc/settings.yaml',
      'ls .ctoc/regulatory-regimes', 'head -5 .ctoc/regulatory-regimes/gdpr.yaml', 'git diff .ctoc/settings.yaml']) {
      allowedBash(command);
      assertAllowed(run(agentPayload(bash(command))), `${command} (background agent)`);
    }
  });

  test("95 · the menu's own routes stay allowed: set-environment, env-keep-defaults, set-compliance-regime, and the menu itself", () => {
    const md = fs.readFileSync(MENU_MD, 'utf8');
    const rows = md.split('\n').filter((l) => /^\| `claude:(set-environment|env-keep-defaults|set-compliance-regime)/.test(l));
    assert.equal(rows.length, 3, 'fixture: the three recipe rows of start.md');
    const recipes = rows.flatMap((l) => [...l.matchAll(/`(node\s+-e\s+"[^`]*")`/g)].map((m) => m[1]));
    assert.ok(recipes.length >= 3, `expected the recipes, found ${recipes.length}`);
    for (const r of recipes) {
      allowedBash(r);
      allowedBash(r.split('${CLAUDE_PLUGIN_ROOT}').join(REPO));
    }
    allowedBash(`node "${MENU_JS}"`);
    allowedBash('node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu');
  });

  test('96 · the earlier protection is unchanged, and nothing else named settings is caught', () => {
    assertRefused(run(write(p('.ctoc', 'approvals', 'x.json'))), 'approval record');
    allowedBash('echo x > src/settings.yaml');
    assertAllowed(run(write(p('src', 'settings.yaml'))), 'a settings.yaml outside .ctoc');
    assertAllowed(run(write(p('.ctoc', 'settings.yaml.example'))), 'a different file name');
  });
});

describe("a background agent may not change Claude Code's settings files or CTOC's .ctoc/settings.json (owner, 2026-10-15)", () => {
  const REFUSAL_AGENT_SETTINGS = "CTOC refused this call because a background agent may not change Claude Code's "
    + "settings files or CTOC's .ctoc/settings.json, which decide the hooks, environment and permissions every "
    + 'later call runs with; report what you wanted to change and let the main session make the change.';
  const REFUSAL_AGENT_SETTINGS_UNCHECKED = 'CTOC refused this call because it mentions a settings file and '
    + "CTOC's protection for it failed to run; tell the human that this protection is broken.";
  const REFUSAL_REGIME_SETTINGS = "CTOC refused this call because it writes, or could write, the project's settings "
    + "file or its regulatory profiles, which only CTOC's menu writes; tell the human what you wanted to "
    + 'change and let the menu change it.';
  const LONG_S = 'ſ'; // U+017F, which NFKC folds to `s` and APFS opens as `s`
  const MENU = 'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"';

  let cfg;
  const rm = (...dirs) => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); };
  const put = (file, text = '{}') => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  const cfgEnv = () => ({ CLAUDE_CONFIG_DIR: cfg });
  const asAgent = (input, id = 'a1b2c3') => ({ ...input, agent_id: id, agent_type: 'iron-loop-executor' });
  // The background agent is refused with the new sentence; the same input is allowed without
  // an agent id and with an empty one.
  const agentOnly = (input, what, opts = {}) => {
    const o = { env: cfgEnv(), ...opts };
    assertRefused(run(asAgent(input), o), `${what} (background agent)`, REFUSAL_AGENT_SETTINGS);
    assertAllowed(run(input, o), `${what} (main session)`);
    assertAllowed(run(asAgent(input, ''), o), `${what} (empty agent id)`);
  };
  const agentAllowed = (input, what, opts = {}) => {
    assertAllowed(run(asAgent(input), { env: cfgEnv(), ...opts }), `${what} (background agent)`);
  };
  const edit = (file, oldString = '{}', newString = '{"env":{}}') => payload('Edit', {
    file_path: file, old_string: oldString, new_string: newString,
  });

  beforeEach(() => {
    cfg = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-cfg-')));
    put(p('.claude', 'settings.json'));
    fs.mkdirSync(p('.claude', 'agents'), { recursive: true });
    put(p('.ctoc', 'settings.json'));
    put(p('src', 'e.js'), 'x');
    put(path.join(cfg, 'settings.json'));
  });
  afterEach(() => { rm(cfg); cfg = null; });

  test('112 · each protected file, editing tools', () => {
    agentOnly(write(p('.claude', 'settings.json')), 'Write .claude/settings.json');
    agentOnly(edit(p('.claude', 'settings.json')), 'Edit .claude/settings.json');
    agentOnly(write(p('.claude', 'settings.local.json')), 'Write .claude/settings.local.json');
    agentOnly(payload('MultiEdit', { file_path: '.claude/settings.local.json', edits: [{ old_string: 'a', new_string: 'b' }] }),
      'MultiEdit .claude/settings.local.json');
    agentOnly(payload('NotebookEdit', { notebook_path: p('.claude', 'settings.json'), new_source: 'x' }),
      'NotebookEdit .claude/settings.json');
    agentOnly(write(p('.ctoc', 'settings.json')), 'Write .ctoc/settings.json');
    agentOnly(edit(p('.ctoc', 'settings.json')), 'Edit .ctoc/settings.json');
    agentOnly(write(path.join(cfg, 'settings.json')), 'Write <config folder>/settings.json');
  });

  test('113 · spellings: letter case, separators, `..`, trailing dots and spaces, NTFS streams', () => {
    const rows = {
      'letter case .claude': write(p('.CLAUDE', 'Settings.JSON')),
      'letter case .ctoc': write(p('.Ctoc', 'SETTINGS.json')),
      'backslash .claude': write('.claude\\settings.json'),
      'backslash .ctoc': write('.ctoc\\settings.json'),
      'dot-dot': write(`${project}/src/../.claude/settings.local.json`),
      'trailing dot': write(`${project}/.claude/settings.json.`),
      'trailing space': write(`${project}/.claude/settings.json `),
      'stream ::$DATA on the file': write(`${project}/.claude/settings.json::$DATA`),
      'stream ::$DATA on the folder': write(`${project}/.claude::$DATA/settings.json`),
      'stream ::$INDEX_ALLOCATION on the folder': write(`${project}/.claude::$INDEX_ALLOCATION/settings.json`),
      'stream :$I30:$INDEX_ALLOCATION on the folder': write(`${project}/.claude:$I30:$INDEX_ALLOCATION/settings.json`),
      'trailing dot on the folder': write(`${project}/.claude./settings.json`),
      'config folder, upper case': write(path.join(cfg, 'SETTINGS.JSON')),
    };
    for (const [what, input] of Object.entries(rows)) agentOnly(input, what);
  });

  test('114 · spellings the file system folds, and hard links', () => {
    fs.linkSync(p('.claude', 'settings.json'), p('src', 'h.json'));
    fs.linkSync(p('.ctoc', 'settings.json'), p('src', 'hc.json'));
    agentOnly(write(p('.claude', `${LONG_S}ettings.json`)), 'long s, existing project file');
    agentOnly(write(p('.claude', `${LONG_S}ettings.local.json`)), 'long s, absent local file');
    agentOnly(write(p('.ctoc', `${LONG_S}ettings.json`)), 'long s, .ctoc');
    agentOnly(write(path.join(cfg, `${LONG_S}ettings.json`)), 'long s, config folder');
    agentOnly(write(p('src', 'h.json')), 'hard link to .claude/settings.json');
    agentOnly(write(p('src', 'hc.json')), 'hard link to .ctoc/settings.json');
  });

  test('115 · links (a): a file link to .claude/settings.json', () => {
    fs.symlinkSync(p('.claude', 'settings.json'), p('src', 's.json'));
    agentOnly(write(p('src', 's.json')), 'file link');
  });

  test('116 · links (b): a folder link to .claude', () => {
    fs.symlinkSync(p('.claude'), p('src', 'cfgdir'), 'junction');
    agentOnly(write(p('src', 'cfgdir', 'settings.local.json')), 'folder link');
  });

  test('117 · links (c): a settings name reached through `..` after a folder link', () => {
    fs.symlinkSync(p('.claude', 'agents'), p('src', 'agents'), 'junction');
    agentOnly(write(`${project}/src/agents/../settings.json`), 'link then dot-dot');
  });

  test('118 · links (d): the config folder is itself a link', () => {
    fs.mkdirSync(path.join(cfg, 'real'));
    put(path.join(cfg, 'real', 'settings.json'));
    fs.symlinkSync(path.join(cfg, 'real'), path.join(cfg, 'link'), 'junction');
    const opts = { env: { CLAUDE_CONFIG_DIR: path.join(cfg, 'link') } };
    agentOnly(write(path.join(cfg, 'real', 'settings.json')), 'real side', opts);
    agentOnly(write(path.join(cfg, 'link', 'settings.json')), 'link side', opts);
  });

  test('119 · links (e): a dangling link keeps the records sentence for every session', () => {
    fs.symlinkSync(p('.claude', 'settings.local.json'), p('src', 'dl.json'));
    const input = write(p('src', 'dl.json'));
    assertRefused(run(asAgent(input), { env: cfgEnv() }), 'dangling link, background agent', REFUSAL);
    assertRefused(run(input, { env: cfgEnv() }), 'dangling link, main session', REFUSAL);
  });

  describe('worktrees', () => {
    let w;
    beforeEach(() => {
      w = p('.claude', 'worktrees', 'w');
      put(path.join(w, '.git'), 'gitdir: x');
      put(path.join(w, '.claude', 'settings.json'));
    });

    test('120 · from a worktree, the main checkout\'s files; from the main checkout, a worktree\'s', () => {
      const inW = { cwd: w };
      agentOnly(write('../../settings.json', w), 'Write ../../settings.json from the worktree', inW);
      agentOnly(write(p('.claude', 'settings.local.json'), w), 'Write the main checkout\'s local settings', inW);
      agentOnly(write(path.join(w, '.claude', 'settings.json'), w), 'Write the worktree\'s own settings', inW);
      agentOnly(bash('echo x > ../../settings.json', w), 'shell redirect to ../../settings.json', inW);
      agentOnly(bash('cd .. && echo x > ../settings.local.json', w), 'shell cd split to the local settings', inW);
      fs.mkdirSync(path.join(w, 'src'), { recursive: true });
      fs.symlinkSync(p('.ctoc'), path.join(w, 'src', 'm'), 'junction');
      agentOnly(bash('echo x > src/m/settings.json', w), 'shell redirect through a link to the main .ctoc', inW);
      agentOnly(bash(`echo x > src/m/${LONG_S}ettings.json`, w), 'the same with the long s (folded reading)', inW);
      agentOnly(write(path.join(w, 'src', 'm', 'settings.json'), w), 'Write through the link', inW);
      agentOnly(write(path.join(w, '.claude', 'settings.json')), 'Write a worktree\'s settings from the main checkout');
      agentOnly(bash('echo x > .claude/worktrees/w/.claude/settings.json'), 'shell write to a worktree\'s settings from the main checkout');
    });
  });

  describe('the config folder by the home folder', () => {
    let home;
    beforeEach(() => {
      home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-home-')));
      put(path.join(home, 'dot', 'claude', 'settings.json'));
      fs.symlinkSync(path.join(home, 'dot', 'claude'), path.join(home, '.claude'), 'junction');
    });
    afterEach(() => rm(home));

    for (const [id, label, configDirValue] of [['121a', 'unset', null], ['121b', 'empty', '']]) {
      test(`${id} · CLAUDE_CONFIG_DIR ${label}: <home>/.claude is the config folder`, () => {
        const opts = { env: { CLAUDE_CONFIG_DIR: configDirValue, HOME: home, USERPROFILE: home } };
        agentOnly(write(path.join(home, '.claude', 'settings.json')), 'Write <home>/.claude/settings.json', opts);
        agentOnly(write(path.join(home, 'dot', 'claude', 'settings.json')), 'Write <home>/dot/claude/settings.json', opts);
        agentOnly(bash(`echo x > ${path.join(home, '.claude', 'settings.json')}`), 'shell to <home>/.claude/settings.json', opts);
        agentOnly(bash(`echo x > ${path.join(home, 'dot', 'claude', 'settings.json')}`), 'shell to <home>/dot/claude/settings.json', opts);
      });
    }
  });

  describe('ordinary agent work stays allowed', () => {
    const ordinaryWork = (opts) => {
      agentAllowed(write(p('src', 'x.js')), 'Write src/x.js', opts);
      agentAllowed(bash('echo x > src/x.js'), 'Bash echo x > src/x.js', opts);
      agentAllowed(edit(p('src', 'e.js'), 'x', 'y'), 'Edit of the existing src/e.js', opts);
      agentAllowed(write(p('src', 'e.js')), 'Write over the existing src/e.js', opts);
    };

    test('122 · base configuration', () => {
      for (const file of [
        p('.claude', 'settings.json.bak'), p('.claude', 'settings-old.json'), p('.claude', 'agents', 'x.md'),
        p('src', 'settings.json'), p('.ctoc', 'settings.json.example'), p('src', 'x.js'),
        path.join(cfg, 'settings.local.json'),
      ]) agentAllowed(write(file), `Write ${path.basename(file)}`);
      for (const command of [
        'echo x > src/x.js', 'echo x > .claude/settings.json.bak', 'cp a.json src/settings.json',
        `cd ${cfg} && echo x > settings.local.json`, 'npm test',
      ]) agentAllowed(bash(command), command);
      ordinaryWork();
    });

    test('123 · (a) the config folder does not exist', () => {
      ordinaryWork({ env: { CLAUDE_CONFIG_DIR: path.join(cfg, 'nonexistent') } });
    });

    test('124 · (b) the user settings file is a dangling link', () => {
      rm(path.join(cfg, 'settings.json'));
      fs.symlinkSync(path.join(cfg, 'nowhere'), path.join(cfg, 'settings.json'));
      ordinaryWork();
    });

    test('125 · (c) the project local settings file is a dangling link', () => {
      fs.symlinkSync(p('.claude', 'nowhere'), p('.claude', 'settings.local.json'));
      ordinaryWork();
    });

    test('126 · (d) the user settings path is a link to a folder', () => {
      rm(path.join(cfg, 'settings.json'));
      fs.symlinkSync(project, path.join(cfg, 'settings.json'), 'junction');
      ordinaryWork();
    });

    test('127 · (e) the config folder is the filesystem root', () => {
      ordinaryWork({ env: { CLAUDE_CONFIG_DIR: path.parse(project).root } });
    });

    test('128 · (f) the project local settings file is a link to itself', () => {
      fs.symlinkSync(p('.claude', 'settings.local.json'), p('.claude', 'settings.local.json'));
      ordinaryWork();
    });

    test('135 · (g) the project local settings file is a link to /dev/null', () => {
      if (process.platform === 'win32') {
        assert.equal(fs.existsSync('/dev/null'), false, 'Windows has no /dev/null, so there is nothing to link to');
        return;
      }
      fs.symlinkSync('/dev/null', p('.claude', 'settings.local.json'));
      agentAllowed(bash('ls 2>/dev/null'), 'ls 2>/dev/null');
      agentAllowed(bash('echo x > src/x.js 2>/dev/null'), 'echo x > src/x.js 2>/dev/null');
      ordinaryWork();
      assertRefused(run(asAgent(bash('echo x > .claude/settings.local.json')), { env: cfgEnv() }),
        'the text rule still refuses a write that names the linked settings file', REFUSAL_AGENT_SETTINGS);
    });
  });

  test('129 · shell writes', () => {
    put(p('src', 'in.json'));
    fs.symlinkSync(p('.claude', 'settings.json'), p('src', 's.json'));
    for (const command of [
      "echo '{}' > .claude/settings.json",
      'echo x >> .claude/settings.local.json',
      'tee .ctoc/settings.json < in.json',
      'cp in.json .claude/settings.local.json',
      'mv in.json .ctoc/settings.json',
      "sed -i '' 's/a/b/' .claude/settings.json",
      'cd .claude && echo x > settings.local.json',
      'echo x > .CLAUDE/Settings.json',
      'echo x > .claude\\\\settings.json',
      'echo x > src/../.ctoc/settings.json',
      `echo x > .claude/${LONG_S}ettings.json`,
      `echo x > .claude/${LONG_S}ettings.local.json`,
      `echo x > .ctoc/${LONG_S}ettings.json`,
      'echo x > src/s.json',
      'ln -s ../.claude/settings.json src/l.json',
      `echo x > ${path.join(cfg, 'settings.json')}`,
      `cd ${cfg} && echo x > settings.json`,
    ]) agentOnly(bash(command), command);
    fs.symlinkSync(p('.claude', 'nowhere.json'), p('src', 'dl.json'));
    // Founder, 15 Oct 2026: "remove that hook block, it is wrong" — the record-write refusal is off, so a dangling
    // link is refused only by the settings-file check that stays, with its sentence.
    assertRefused(run(asAgent(bash('echo x > src/dl.json')), { env: cfgEnv() }), 'dangling link, background agent', REFUSAL_REGIME_SETTINGS);
    assertRefused(run(bash('echo x > src/dl.json'), { env: cfgEnv() }), 'dangling link, main session', REFUSAL_REGIME_SETTINGS);
  });

  test('130 · the regulatory-settings check keeps running first', () => {
    put(p('.ctoc', 'settings.yaml'));
    fs.symlinkSync(p('.ctoc', 'settings.yaml'), p('src', 'l.yaml'));
    const input = bash('echo x > src/l.yaml');
    assertRefused(run(asAgent(input), { env: cfgEnv() }), 'link to settings.yaml, background agent', REFUSAL_REGIME_SETTINGS);
    assertRefused(run(input, { env: cfgEnv() }), 'link to settings.yaml, main session', REFUSAL_REGIME_SETTINGS);
  });

  test('131 · shell reads stay allowed for the background agent', () => {
    for (const command of [
      'cat .claude/settings.json', 'grep -n hooks .claude/settings.local.json', 'git diff .ctoc/settings.json',
      `head -5 ${path.join(cfg, 'settings.json')}`, 'ls .claude', 'git add .claude/settings.json',
      `cat .claude/${LONG_S}ettings.json`,
    ]) agentAllowed(bash(command), command);
  });

  test("132 · a genuine menu call's arguments stay data", () => {
    agentAllowed(bash(`${MENU} menu task complete t7 --summary 'set .claude/settings.json'`), 'summary naming .claude/settings.json');
    agentAllowed(bash(`${MENU} menu task complete t7 --summary .ctoc/settings.json`), 'summary naming .ctoc/settings.json');
  });

  test('133 · when the protection cannot run', () => {
    const plugin = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-plug-')));
    try {
      fs.mkdirSync(path.join(plugin, 'src', 'hooks'), { recursive: true });
      fs.mkdirSync(path.join(plugin, 'src', 'lib'), { recursive: true });
      const brokenEntry = path.join(plugin, 'src', 'hooks', 'protect-records.js');
      fs.copyFileSync(ENTRY, brokenEntry);
      fs.copyFileSync(path.join(REPO, 'src', 'lib', 'hook-deny-signal.js'), path.join(plugin, 'src', 'lib', 'hook-deny-signal.js'));
      const opts = { entry: brokenEntry };
      for (const [what, input] of Object.entries({
        'Bash write to .claude/settings.json': bash('echo x > .claude/settings.json'),
        'Write of .claude/settings.local.json': write(p('.claude', 'settings.local.json')),
        'Write of the long-s spelling': write(p('.claude', `${LONG_S}ettings.local.json`)),
      })) {
        assertRefused(run(asAgent(input), opts), `${what}, background agent`, REFUSAL_AGENT_SETTINGS_UNCHECKED);
        assertAllowed(run(input, opts), `${what}, main session`);
      }
      assertAllowed(run(asAgent(bash('ls')), opts), 'ls, background agent');
      const ctocSettings = write(p('.ctoc', 'settings.json'));
      assertRefused(run(asAgent(ctocSettings), opts), '.ctoc/settings.json, background agent', REFUSAL_UNCHECKED);
      assertRefused(run(ctocSettings, opts), '.ctoc/settings.json, main session', REFUSAL_UNCHECKED);
    } finally {
      rm(plugin);
    }
  });

  test('134 · a spec without dir runs the text tests only', () => {
    const { isLedgerWrite } = require('../src/hooks/PreToolUse.Bash.js');
    const NEVER = /[^\s\S]/;
    fs.symlinkSync(p('.claude', 'nowhere.json'), p('src', 'dl.json'));
    const before = process.cwd();
    process.chdir(project); // the link test measures against the working directory
    try {
      const command = `echo x > ${p('src', 'dl.json')}`;
      assert.equal(isLedgerWrite(command, { segmentRe: NEVER, resolvedRe: NEVER }), false, 'no dir: text tests only');
      assert.equal(isLedgerWrite(command, { dir: '.ctoc/approvals', segmentRe: NEVER, resolvedRe: NEVER }), true, 'control: with a dir the link test faults on the dangling link');
    } finally {
      process.chdir(before);
    }
  });

  test('136 · a fresh create through a macOS path alias of a config folder not called .claude', () => {
    const cfgdir = path.join(cfg, 'cfgdir'); // not called .claude, and holds no settings.json yet
    fs.mkdirSync(cfgdir);
    const opts = { env: { CLAUDE_CONFIG_DIR: cfgdir } };
    const identity = (file) => {
      try {
        const st = fs.statSync(file, { bigint: true });
        return `${st.dev}:${st.ino}`;
      } catch (err) {
        return err.code;
      }
    };
    const aliases = ['/System/Volumes/Data', '/.nofollow'].map((prefix) => prefix + cfgdir);
    const opening = aliases.filter((alias) => identity(alias) === identity(cfgdir));
    if (process.platform === 'darwin') {
      assert.ok(opening.some((alias) => alias.startsWith('/System/Volumes/Data')), 'on macOS the Data volume path opens the same folder');
    } else {
      assert.deepEqual(opening, [], 'only macOS has these aliases: elsewhere they open nothing');
    }
    agentOnly(write(path.join(cfgdir, 'settings.json')), 'control: the config file by its plain path', opts);
    for (const alias of aliases) {
      const file = write(`${alias}/settings.json`);
      if (opening.includes(alias)) agentOnly(file, `fresh create through ${alias.slice(0, 20)}`, opts);
      else {
        agentAllowed(file, `${alias.slice(0, 20)} opens nothing here`, opts);
        assertAllowed(run(file, opts), `${alias.slice(0, 20)} opens nothing here (main session)`);
      }
    }
    agentAllowed(write(path.join(cfgdir, 'settings.local.json')), 'the config folder\'s settings.local.json stays allowed', opts);
    for (const alias of opening) agentAllowed(write(`${alias}/settings.local.json`), `${alias.slice(0, 20)} settings.local.json stays allowed`, opts);
  });

  test('137 · no home folder: the config file leaves the list, the project files stay protected', () => {
    // os.homedir() throws where the account has no home folder (a container with an unlisted user id);
    // this machine always finds one, so the fault is planted in the spawned hook with a preload.
    const preload = path.join(cfg, 'no-home.js');
    fs.writeFileSync(preload, "require('os').homedir = () => { throw new Error('ENOENT: no home folder'); };\n");
    const nodeOptions = `${process.env.NODE_OPTIONS || ''} --require=${preload}`.trim();
    const opts = { env: { CLAUDE_CONFIG_DIR: null, NODE_OPTIONS: nodeOptions } };
    agentOnly(write(p('.claude', 'settings.json')), 'Write .claude/settings.json', opts);
    // The shell channel loads `src/lib/crypto.js`, which asks for the home folder when it loads, so
    // there the crash rule decides (outside this plan's files): the write is refused either way.
    assert.equal(run(asAgent(bash('echo x > .claude/settings.local.json')), opts).status, 2, 'shell write to .claude/settings.local.json');
    agentAllowed(write(p('src', 'settings.json')), 'Write src/settings.json (names a settings file, no crash)', opts);
    agentAllowed(write(p('src', 'x.js')), 'Write src/x.js', opts);
    agentAllowed(bash('ls'), 'ls', opts);
  });

  test('138 · a `..` after a folder link is decided on the path as written, not on its by-name collapse', () => {
    // The kernel follows `y` and only then applies `..`: `<project>/src/y/../foo` is `<config folder>/foo`,
    // a link to the config file, although by name it is `<project>/src/foo`.
    fs.mkdirSync(path.join(cfg, 'sub'));
    fs.symlinkSync(path.join(cfg, 'sub'), p('src', 'y'), 'junction');
    fs.symlinkSync(path.join(cfg, 'settings.json'), path.join(cfg, 'foo'));
    fs.symlinkSync(path.join(cfg, 'sub'), p('src', 'z'), 'junction');
    fs.mkdirSync(p('src', 'a'));
    agentOnly(write(`${project}/src/y/../foo`), 'link then dot-dot, an existing link to the config file');
    agentOnly(edit(`${project}/src/y/../foo`), 'link then dot-dot, Edit');
    agentOnly(write(`${project}/src/z/../settings.json`), 'link then dot-dot, the config file by its own name');
    agentOnly(write('src/y/../foo'), 'link then dot-dot, relative target');
    agentAllowed(write(`${project}/src/y/../fresh.txt`), 'link then dot-dot, an ordinary absent file');
    agentAllowed(write(`${project}/src/a/../b.js`), 'an ordinary dot-dot');
    agentAllowed(write(`${project}/src/a/../e.js`), 'an ordinary dot-dot onto an existing file');
    assertAllowed(run(write(`${project}/src/a/../b.js`), { env: cfgEnv() }), 'an ordinary dot-dot (main session)');
  });
});
