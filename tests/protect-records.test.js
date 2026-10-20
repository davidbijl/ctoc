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
      `${MENU} menu task list # note`,
      `${MENU} menu task list\nnode src/commands/start.js stream approve review/x.md`,
      `sh -c 'node src/commands/start.js stream approve review/x.md'`,
      'env node src/commands/start.js menu task list',
      'grep -n route src/commands/start.js | head',
      `node -e "require('./src/lib/streaming-precompute')"`,
      `node -e "require('./src/lib/actions').approvePlan('x')"`,
    ]) allowedAgent(command);
  });
  // The CTO Chief's rule (2026-10-18, "a background agent's menu call must be one plain call") supersedes the
  // four expansion forms this case used to allow: the shell can build "sweep --confirm" from any of them.
  // They are refused only for a background agent, and only with the plain-call sentence.
  test('82 · a menu call with a shell expansion is refused for a background agent, allowed without an agent id', () => {
    const plain = "CTOC refused this call because only the human confirms which builds go back to the queue; "
      + 'report the sweep preview and let the main session ask him. A command that only mentions both words is '
      + "refused too: search one word at a time, and commit with git commit -F <file>. A background agent's menu "
      + 'call must also be one plain call, built without $, a backtick, a brace or a wildcard.';
    for (const command of [
      `${MENU} menu task list $(echo x)`,
      `${MENU} menu task list \`echo x\``,
      `${MENU} "menu task list $HOME"`,
      'node "$P/src/commands/start.js" menu task list',
    ]) {
      assertRefused(run(agentBash(command)), command, plain);
      assertAllowed(run(bash(command)), `${command} (main session)`);
    }
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

// The owner's decision of 2026-10-15, "Check real file (Recommended)": the loaded hook compares a
// path with the protected areas by what the file system opens (device and inode), not by spelling,
// reads `..` after a link where the file system goes, and refuses a decision it cannot finish in
// time. Every case spawns the real hook with real PreToolUse JSON. A case checks ALL its rows and
// fails once at the end naming every row that failed, so a red or green record is per row.
describe('the write protection compares real files, not spellings (owner, 2026-10-15)', () => {
  const REFUSAL_SETTINGS = "CTOC refused this call because it writes, or could write, the project's settings "
    + "file or its regulatory profiles, which only CTOC's menu writes; tell the human what you wanted to "
    + 'change and let the menu change it.';
  const REFUSAL_AGENT_SETTINGS = "CTOC refused this call because a background agent may not change Claude Code's "
    + "settings files or CTOC's .ctoc/settings.json, which decide the hooks, environment and permissions every "
    + 'later call runs with; report what you wanted to change and let the main session make the change.';
  const REFUSAL_AGENT_SETTINGS_UNCHECKED = 'CTOC refused this call because it mentions a settings file and '
    + "CTOC's protection for it failed to run; tell the human that this protection is broken.";
  // The sentence for a refusal made once the decision's count of work, or its backstop clock, is spent.
  const REFUSAL_WORK = 'CTOC refused this call because checking it would take more work than CTOC allows for one call; '
    + 'split it into smaller commands and run them one by one.';
  const LONG_S = 'ſ'; // U+017F, which NFKC folds to `s` and APFS opens as `s`
  const FULL_WIDTH_S = 'ｓ'; // U+FF53, a distinct, absent name on APFS
  const FULL_WIDTH_SOLIDUS = '／'; // U+FF0F, never a path separator
  const LIGATURE_FI = 'ﬁ'; // U+FB01, which NFKC turns into `fi`
  const RPC = path.join(REPO, 'src', 'lib', 'real-path-confinement.js');

  let cfg;
  let R;

  function makeRows() {
    const failures = [];
    return {
      row(label, fn) {
        try {
          fn();
        } catch (err) {
          failures.push(`${label} => ${String(err && err.message).split('\n')[0]}`);
        }
      },
      done() {
        assert.equal(failures.length, 0, `${failures.length} row(s) failed:\n${failures.join('\n')}`);
      },
    };
  }

  /** A case body that records every row and fails once, at the end, naming each failed row. */
  function rowTest(name, fn) {
    test(name, () => {
      R = makeRows();
      fn();
      R.done();
    });
  }

  const rm = (...dirs) => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); };
  const put = (file, text = '{}') => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  const asAgent = (input) => ({ ...input, agent_id: 'a1b2c3', agent_type: 'iron-loop-executor' });
  /** The file's `run()` options with the scratch config folder, so no agent check reads the real home folder. */
  const ro = (opts = {}) => ({ ...opts, env: { CLAUDE_CONFIG_DIR: cfg, ...(opts.env || {}) } });

  const refusedMain = (input, what, sentence = REFUSAL, opts = {}) => {
    R.row(`${what} (main session)`, () => assertRefused(run(input, ro(opts)), `${what} (main session)`, sentence));
  };
  const refusedAgent = (input, what, sentence = REFUSAL, opts = {}) => {
    R.row(`${what} (background agent)`, () => assertRefused(run(asAgent(input), ro(opts)), `${what} (background agent)`, sentence));
  };
  const refusedBoth = (input, what, sentence = REFUSAL, opts = {}) => {
    refusedMain(input, what, sentence, opts);
    refusedAgent(input, what, sentence, opts);
  };
  const allowedMain = (input, what, opts = {}) => {
    R.row(`${what} (main session)`, () => assertAllowed(run(input, ro(opts)), `${what} (main session)`));
  };
  const allowedAgent = (input, what, opts = {}) => {
    R.row(`${what} (background agent)`, () => assertAllowed(run(asAgent(input), ro(opts)), `${what} (background agent)`));
  };
  const allowedBoth = (input, what, opts = {}) => {
    allowedMain(input, what, opts);
    allowedAgent(input, what, opts);
  };

  /** Asks the disk whether two spellings open the same file (device and inode); never assumes. */
  function sameFileOnDisk(real, alias) {
    try {
      const a = fs.statSync(real, { bigint: true });
      const b = fs.statSync(alias, { bigint: true });
      return a.dev === b.dev && a.ino === b.ino;
    } catch (err) {
      if (err.code === 'ENOENT') return false;
      throw err;
    }
  }

  /** A second project-like folder (another copy of the records), real path, made in the tmp folder. */
  function makeOther(prefix) {
    const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
    for (const d of [['.ctoc', 'approvals'], ['.ctoc', 'state', 'verify'], ['.ctoc', 'streaming', 'questions', 'pending'], ['src']]) {
      fs.mkdirSync(path.join(dir, ...d), { recursive: true });
    }
    return dir;
  }

  function copyTree(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      const a = path.join(from, entry.name);
      const b = path.join(to, entry.name);
      if (entry.isDirectory()) copyTree(a, b);
      else if (entry.isFile()) fs.copyFileSync(a, b);
    }
  }

  beforeEach(() => {
    R = makeRows();
    cfg = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-cfg2-')));
    put(path.join(cfg, 'settings.json'));
    put(p('.ctoc', 'streaming', 'answers.jsonl'), '{}\n');
    put(p('.ctoc', 'state', 'verify', 'x.json'));
    put(p('.ctoc', 'approvals', 'a.json'));
    put(p('.ctoc', 'settings.yaml'), 'x: 1');
    put(p('.ctoc', 'regulatory-regimes', 'gdpr.yaml'), 'x: 1');
    put(p('src', 'e.js'), 'x');
  });
  afterEach(() => { rm(cfg, ...scratch.splice(0)); cfg = null; });

  // ---- The count of work (owner, 2026-10-19): helpers for cases 161-167. No row reads wall time. ----
  /** Extra folders a case makes (a worktree layout), removed after it. */
  const scratch = [];
  const SAFE_FS = path.join(REPO, 'src', 'lib', 'safe-fs.js');
  const BUILDER_FIRST = "cd copy && cd src && cd .. && cat > tests/claude-setup-check.test.js <<'EOF'";

  /** The builder's ordinary here-document: 300 test lines, about 43 KB. `folded` puts a `…` into line 0. */
  function builderFixture(first = BUILDER_FIRST, folded = false) {
    const lines = Array.from({ length: 300 }, (_, i) => {
      const end = folded && i === 0 ? '…' : '';
      return `  test('${i} claude-setup apply advisor writes the setting${end}', () => { assert.equal(route(['claude-setup', 'apply', 'advisor'], dir).ok, true); });`;
    });
    return [first, "'use strict';", "const { route } = require('../src/lib/menu-screens');", ...lines, 'EOF',
      'node --test tests/claude-setup-check.test.js'].join('\n');
  }

  /** 2,000 lines of distinct words after the builder's first line (about 100,000 characters). `folded` changes line 0000. */
  function twoThousandFixture(folded = false) {
    const lines = Array.from({ length: 2000 }, (_, k) => {
      const i = String(k).padStart(4, '0');
      return folded && k === 0 ? `t('${i} a${i}…', () => f${i}(['c${i}', 'd${i}']));` : `t('${i} a${i}', () => f${i}(['c${i}', 'd${i}']));`;
    });
    return [BUILDER_FIRST, ...lines, 'EOF'].join('\n');
  }

  /** The project folders of `makeProject`, plus `copy/src` and the files the describe's beforeEach makes. */
  function fillProject(root) {
    for (const d of [['.ctoc', 'approvals'], ['.ctoc', 'state', 'verify'], ['.ctoc', 'streaming', 'questions', 'pending'],
      ['src'], ['plans', 'review'], ['copy', 'src']]) fs.mkdirSync(path.join(root, ...d), { recursive: true });
    put(path.join(root, '.ctoc', 'settings.yaml'), 'x: 1');
    put(path.join(root, '.ctoc', 'regulatory-regimes', 'gdpr.yaml'), 'x: 1');
    put(path.join(root, 'src', 'e.js'), 'x');
  }

  /**
   * A project layout. 'plain' is the case's project (a background agent makes 6 settings checks, the main session 2).
   * 'nine' is a project at `<tmp>/pr-wt-…/.claude/worktrees/w`, where the hook also protects the main checkout's three
   * files, so a background agent makes 2 + 7 = 9 checks. `dir` holds the preload and its report.
   */
  function makeLayout(kind) {
    if (kind === 'plain') {
      fs.mkdirSync(p('copy', 'src'), { recursive: true });
      return { root: project, dir: project };
    }
    const outer = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-wt-')));
    scratch.push(outer);
    const root = path.join(outer, '.claude', 'worktrees', 'w');
    fillProject(root);
    return { root, dir: outer };
  }

  let preloadSeq = 0;
  /**
   * Spawns the real hook on one payload with a preload that counts the file-system calls the resolver makes and keeps
   * a fake clock: `Date.now` starts at 1e12 and moves `stepMs` per call, never with the wall.
   * opts: `units` sets the decision's count of work; `chargeAfterSet` charges that many units right after the count is
   * set; `spendAtFirstLookup` empties the count at the first exported `resolveExisting` call; `agent` makes the call a
   * background agent's; `statLiesFor` and `fstatGrowsFor` (a path ending) make a manifest's path-based stat lie, or its
   * descriptor's size grow by 10 bytes. Returns the child's result and its report `{ calls, elapsed, spent, charged,
   * bytesRead, zeroReads }` (the fake clock's span, the resolver's `budgetSpent(0)` at exit, the units charged from
   * outside the resolver, the bytes read from files, and the empty reads of a grown descriptor).
   */
  function spawnWork(lay, input, opts = {}) {
    const name = `work-preload-${preloadSeq++}`;
    const file = path.join(lay.dir, `${name}.js`);
    const out = path.join(lay.dir, `${name}.json`);
    fs.writeFileSync(file, [
      "const fs = require('fs');",
      `const c = require(${JSON.stringify(RPC)});`,
      `const safeFs = require(${JSON.stringify(SAFE_FS)});`,
      `const stepMs = ${JSON.stringify(opts.stepMs || 0)};`,
      'let now = 1e12;',
      'let calls = 0;',
      'Date.now = () => now;',
      "for (const name of ['lstatSync', 'statSync', 'realpathSync', 'readlinkSync']) {",
      '  const real = safeFs[name];',
      '  safeFs[name] = function (...args) { calls += 1; now += stepMs; return real.apply(this, args); };',
      '}',
      'const set = c.setWorkBudget;',
      `const units = ${JSON.stringify(typeof opts.units === 'number' ? opts.units : null)};`,
      `const charge = ${JSON.stringify(typeof opts.chargeAfterSet === 'number' ? opts.chargeAfterSet : null)};`,
      "if (typeof set === 'function') {",
      "  c.setWorkBudget = (n) => { set(units !== null && typeof n === 'number' ? units : n); if (charge !== null) c.budgetSpent(charge); };",
      '}',
      ...(opts.spendAtFirstLookup ? [
        'const resolve = c.resolveExisting;',
        'let first = true;',
        "c.resolveExisting = (q) => { if (first) { first = false; if (typeof set === 'function') set(0); } return resolve(q); };",
      ] : []),
      // The units charged from outside the resolver (the shell's text work, the sweep check's lookups).
      'let charged = 0;',
      'const text = c.textBudgetSpent;',
      "if (typeof text === 'function') c.textBudgetSpent = (n) => { charged += 1 + Math.floor(n / 64); return text(n); };",
      'const spend = c.budgetSpent;',
      "if (typeof spend === 'function') c.budgetSpent = (n = 1) => { if (n > 0) charged += n; return spend(n); };",
      // The bytes read from files after this point (a manifest read whole or by descriptor), and an optional lie:
      // `statLiesFor` makes the path-based stat of a file with that ending say "regular file" whatever it is.
      'let bytesRead = 0;',
      'const readWhole = fs.readFileSync;',
      'fs.readFileSync = function (...a) { const r = readWhole.apply(this, a); bytesRead += r.length; return r; };',
      // `fstatGrowsFor`: the descriptors `safe-fs.openSync` returns for a path with that ending are remembered, `fs.fstatSync`
      // reports their size 10 bytes larger than the file is (a file that shrank after its size was read: a short read), and
      // every `readSync` on them that returns 0 is counted, throwing at the 1,000th. A reader that stops at the first
      // empty read counts 1; one that loops on `got < size` counts 1,000.
      'let zeroReads = 0;',
      'const grownFds = new Set();',
      `const growFor = ${JSON.stringify(opts.fstatGrowsFor || null)};`,
      'if (growFor !== null) {',
      '  const open = safeFs.openSync;',
      '  safeFs.openSync = function (p, ...a) { const fd = open.call(this, p, ...a); if (String(p).endsWith(growFor)) grownFds.add(fd); return fd; };',
      '  const realFstat = fs.fstatSync;',
      '  fs.fstatSync = function (fd, ...a) { const st = realFstat.call(this, fd, ...a); return grownFds.has(fd) ? Object.assign(Object.create(Object.getPrototypeOf(st)), st, { size: st.size + 10 }) : st; };',
      '}',
      'const readFd = fs.readSync;',
      'fs.readSync = function (...a) {',
      '  const n = readFd.apply(this, a);',
      '  bytesRead += n;',
      '  if (n === 0 && grownFds.has(a[0])) { zeroReads += 1; if (zeroReads >= 1000) throw new Error(\'1,000 empty reads of a short file\'); }',
      '  return n;',
      '};',
      `const lieFor = ${JSON.stringify(opts.statLiesFor || null)};`,
      'if (lieFor !== null) {',
      '  const realStat = safeFs.statSync;',
      '  safeFs.statSync = function (p, o) { const st = realStat.call(this, p, o); return String(p).endsWith(lieFor) ? Object.assign(Object.create(Object.getPrototypeOf(st)), st, { isFile: () => true }) : st; };',
      '}',
      "process.on('exit', () => {",
      "  const spent = typeof c.budgetSpent === 'function' ? spend(0) : false;",
      `  fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify({ calls, elapsed: now - 1e12, spent, charged, bytesRead, zeroReads }));`,
      '});',
      '',
    ].join('\n'));
    const res = spawnSync(process.execPath, ['--require', file, ENTRY], {
      cwd: lay.root, env: { ...process.env, CLAUDE_CONFIG_DIR: cfg }, input: JSON.stringify(opts.agent ? asAgent(input) : input),
      encoding: 'utf8', timeout: opts.timeout || 280000,
    });
    let report = null;
    try { report = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { report = null; }
    return { res, report };
  }

  /** Asserts the spawned hook allowed the command. */
  const allowedWork = (lay, command, opts, what) => assertAllowed(spawnWork(lay, bash(command, lay.root), opts).res, what);
  /** Asserts the spawned hook refused the command with the work sentence. */
  const refusedWork = (lay, command, opts, what) => assertRefused(spawnWork(lay, bash(command, lay.root), opts).res, what, REFUSAL_WORK);

  rowTest('139 · the long-s attack: a Write to the answers log or a check record spelled with ſ is refused', () => {
    for (const [what, real, alias] of [
      ['answers log', p('.ctoc', 'streaming', 'answers.jsonl'), p('.ctoc', `${LONG_S}treaming`, 'answers.jsonl')],
      ['check record', p('.ctoc', 'state', 'verify', 'x.json'), p('.ctoc', `${LONG_S}tate`, 'verify', 'x.json')],
    ]) {
      // Recorded in the label, not asserted: on this disk the alias is the real file or a different, absent one.
      refusedBoth(write(alias), `Write ${what} spelled with ſ [sameFileOnDisk=${sameFileOnDisk(real, alias)}]`);
    }
  });

  rowTest('140 · the other protected names spelled with ſ, and a hard link to the settings file, are refused', () => {
    refusedBoth(write(p('.ctoc', `approval${LONG_S}`, 'x.json')), 'Write .ctoc/approvalſ/x.json');
    refusedBoth(write(p('.ctoc', `${LONG_S}ettings.yaml`)), 'Write .ctoc/ſettings.yaml', REFUSAL_SETTINGS);
    refusedBoth(write(p('.ctoc', `regulatory-regime${LONG_S}`, 'x.yaml')), 'Write .ctoc/regulatory-regimeſ/x.yaml', REFUSAL_SETTINGS);
    fs.linkSync(p('.ctoc', 'settings.yaml'), p('src', 'h.yaml'));
    refusedBoth(write(p('src', 'h.yaml')), 'Write a hard link to the settings file', REFUSAL_SETTINGS);
  });

  rowTest('141 · the same with no protected folder made yet', () => {
    rm(p('.ctoc', 'approvals'), p('.ctoc', 'state'), p('.ctoc', 'streaming'), p('.ctoc', 'settings.yaml'),
      p('.ctoc', 'regulatory-regimes'));
    refusedBoth(write(p('.ctoc', `${LONG_S}treaming`, 'answers.jsonl')), 'absent: Write .ctoc/ſtreaming/answers.jsonl');
    refusedBoth(write(p('.ctoc', `${LONG_S}tate`, 'verify', 'x.json')), 'absent: Write .ctoc/ſtate/verify/x.json');
    refusedBoth(write(p('.ctoc', `approval${LONG_S}`, 'x.json')), 'absent: Write .ctoc/approvalſ/x.json');
    refusedBoth(write(p('.ctoc', `${LONG_S}ettings.yaml`)), 'absent: Write .ctoc/ſettings.yaml', REFUSAL_SETTINGS);
    refusedBoth(write(p('.ctoc', `regulatory-regime${LONG_S}`, 'x.yaml')), 'absent: Write .ctoc/regulatory-regimeſ/x.yaml', REFUSAL_SETTINGS);
  });

  rowTest('142 · upper-case, mixed-case and compatibility look-alikes are refused', () => {
    refusedBoth(write(p('.CTOC', 'STREAMING', 'answers.jsonl')), 'Write .CTOC/STREAMING/answers.jsonl');
    refusedBoth(write(p('.Ctoc', 'State', 'Verify', 'x.json')), 'Write .Ctoc/State/Verify/x.json');
    refusedBoth(write(p('.CTOC', `${LONG_S}TATE`, 'VERIFY', 'x.json')), 'Write .CTOC/ſTATE/VERIFY/x.json');
    refusedBoth(write(p('.ctoc', `APPROVAL${LONG_S}`, 'x.json')), 'Write .ctoc/APPROVALſ/x.json');
    refusedBoth(write(p('.CTOC', `${LONG_S}ETTINGS.YAML`)), 'Write .CTOC/ſETTINGS.YAML', REFUSAL_SETTINGS);
    refusedBoth(write(p('.ctoc', `${FULL_WIDTH_S}treaming`, 'answers.jsonl')), 'Write .ctoc/ｓtreaming/answers.jsonl (full-width s)');
  });

  rowTest('143 · the waiting folder stays writable under every folded spelling of its name', () => {
    const pending = (...parts) => p('.ctoc', ...parts, 'implementation__x.md.json');
    allowedBoth(write(pending('streaming', 'questions', 'pending')), 'Write the waiting folder');
    allowedBoth(write(pending(`${LONG_S}treaming`, 'questions', 'pending')), 'Write .ctoc/ſtreaming/questions/pending/');
    allowedBoth(write(pending('streaming', `que${LONG_S}tions`, 'pending')), 'Write .ctoc/streaming/queſtions/pending/');
    allowedBoth(write(`${p('.ctoc', 'streaming', 'questions')}${path.sep}pending${FULL_WIDTH_SOLIDUS}implementation__x.md.json`),
      'Write .ctoc/streaming/questions/pending／implementation__x.md.json (full-width solidus)');
    // The project-folder row: a project whose own folder name NFKC changes.
    const lig = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `pr-${LIGATURE_FI}-`)));
    try {
      for (const d of [['.ctoc', 'approvals'], ['.ctoc', 'state', 'verify'], ['.ctoc', 'streaming', 'questions', 'pending'], ['src'], ['plans', 'review']]) {
        fs.mkdirSync(path.join(lig, ...d), { recursive: true });
      }
      allowedBoth(write(path.join(lig, '.ctoc', 'streaming', 'questions', 'pending', 'implementation__x.md.json'), lig),
        'Write the waiting folder of a project whose folder name holds a ligature', { cwd: lig });
    } finally {
      rm(lig);
    }
  });

  rowTest('144 · a link inside the waiting folder, or put in its place, opens nothing in the loaded hook', () => {
    const questions = p('.ctoc', 'streaming', 'questions');
    const pending = path.join(questions, 'pending');
    fs.symlinkSync(p('.ctoc', 'streaming', 'answers.jsonl'), path.join(pending, 'l.json'));
    refusedMain(write(path.join(pending, 'l.json')), '6(a) Write a file link in the waiting folder to the answers log');
    rm(pending);
    fs.symlinkSync(questions, pending, 'junction');
    refusedMain(write(path.join(pending, 'y.json')), '6(b) Write into the waiting folder made a link to the store');
    refusedMain(write(path.join(questions, 'review__x.md.json')), '6(b) Write a live question file');
  });

  rowTest('145 · a link, then `..`: the target lands where the file system goes', () => {
    fs.symlinkSync(p('.ctoc', 'state'), p('src', 'L'), 'junction');
    // Absolute targets are built as text: path.join would remove the `..` by name.
    const viaL = (rest) => `${project}/src/L/../${rest}`;
    refusedBoth(write(viaL('approvals/y.json')), 'Write src/L/../approvals/y.json');
    refusedBoth(write(viaL('state/verify/y.json')), 'Write src/L/../state/verify/y.json');
    refusedBoth(write(viaL('streaming/answers.jsonl')), 'Write src/L/../streaming/answers.jsonl');
    refusedBoth(write(viaL('settings.yaml')), 'Write src/L/../settings.yaml', REFUSAL_SETTINGS);
    refusedBoth(bash('echo x > src/L/../settings.yaml'), 'Bash echo x > src/L/../settings.yaml', REFUSAL_SETTINGS);
    refusedBoth(bash('echo x > src/L/../regulatory-regimes/x.yaml'), 'Bash echo x > src/L/../regulatory-regimes/x.yaml', REFUSAL_SETTINGS);
    refusedMain(bash('cd src/L && echo x > ../settings.yaml'), 'Bash cd src/L && echo x > ../settings.yaml', REFUSAL_SETTINGS);
    refusedMain(bash('cd -P src/L/.. && echo x > settings.yaml'), 'Bash cd -P src/L/.. && echo x > settings.yaml', REFUSAL_SETTINGS);
    refusedMain(write(`${project}/src/L/missing/../../approvals/y.json`), 'Write src/L/missing/../../approvals/y.json');

    // Two links: src/K holds the relative contents M/../approvals (a junction to the tidied path on Windows).
    fs.symlinkSync(p('.ctoc', 'state'), p('src', 'M'), 'junction');
    if (process.platform === 'win32') fs.symlinkSync(`${project}/src/M/../approvals`, p('src', 'K'), 'junction');
    else fs.symlinkSync('M/../approvals', p('src', 'K'), 'dir');
    refusedMain(write(p('src', 'K', 'y.json')), 'Write src/K/y.json (two links)');

    // The tidied reading: as written it leads to <other>/deep/N/y.json, tidied to src/N/y.json.
    const other = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-oth3-')));
    try {
      fs.mkdirSync(path.join(other, 'deep', 'sub'), { recursive: true });
      fs.symlinkSync(path.join(other, 'deep', 'sub'), p('src', 'X'), 'junction');
      fs.symlinkSync(p('.ctoc', 'approvals'), p('src', 'N'), 'junction');
      refusedMain(write(`${project}/src/X/../N/y.json`), 'Write src/X/../N/y.json (the tidied reading)');
    } finally {
      rm(other);
    }

    fs.mkdirSync(p('src', 'a'));
    allowedBoth(write(`${project}/src/a/../b.js`), 'Write src/a/../b.js (a real folder)');
    allowedBoth(write(`${project}/src/new/../b.js`), 'Write src/new/../b.js (an absent folder)');
    allowedBoth(write(`${project}/src/L/missing/../x.json`), 'Write src/L/missing/../x.json (not a record)');
    allowedBoth(bash('echo x > src/a/../b.js'), 'Bash echo x > src/a/../b.js');
  });

  rowTest('146 · a link whose target is spelled with ſ is refused', () => {
    const target = p('.ctoc', `${LONG_S}tate`, 'verify');
    fs.symlinkSync(target, p('src', 'l'), 'junction');
    refusedBoth(write(p('src', 'l', 'y.json')),
      `Write through a link to .ctoc/ſtate/verify [sameFileOnDisk=${sameFileOnDisk(p('.ctoc', 'state'), p('.ctoc', `${LONG_S}tate`))}]`);
  });

  rowTest("147 · another copy's records: a look-alike spelling and a link from this project are refused", () => {
    const other = makeOther('pr-oth-');
    try {
      put(path.join(other, '.ctoc', 'state', 'verify', 'x.json'));
      refusedBoth(write(path.join(other, '.ctoc', `${LONG_S}tate`, 'verify', 'x.json')), "Write another copy's .ctoc/ſtate/verify/x.json");
      fs.symlinkSync(path.join(other, '.ctoc', 'state', 'verify'), p('src', 'o'), 'junction');
      refusedBoth(write(p('src', 'o', 'y.json')), "Write through a link to another copy's check records");
    } finally {
      rm(other);
    }
  });

  rowTest('148 · ordinary files stay allowed', () => {
    allowedBoth(write(p('src', 'x.js')), 'Write src/x.js');
    allowedBoth(payload('Edit', { file_path: p('src', 'e.js'), old_string: 'x', new_string: 'y' }), 'Edit src/e.js');
    allowedBoth(write(p('src', 'e.js')), 'Write over src/e.js');
    allowedBoth(write(p('.ctoc', `${LONG_S}tate`, 'notes.md')), 'Write .ctoc/ſtate/notes.md');
    allowedBoth(write(p('.ctoc', 'state', 'verify-notes.md')), 'Write .ctoc/state/verify-notes.md');
    allowedBoth(write(p('src', `${LONG_S}treaming.js`)), 'Write src/ſtreaming.js');
    allowedBoth(write(p('src', 'streaming', 'answers.jsonl')), 'Write src/streaming/answers.jsonl');
    allowedBoth(bash('echo x > src/x.js'), 'Bash echo x > src/x.js');
    allowedBoth(bash(`ls .ctoc/${LONG_S}tate`), 'Bash ls .ctoc/ſtate');
  });

  rowTest("149 · the shell's link test compares by identity", () => {
    const aliasSame = sameFileOnDisk(p('.ctoc', 'settings.yaml'), p('.ctoc', `${LONG_S}ettings.yaml`));
    const longS = bash(`echo x > .ctoc/${LONG_S}ettings.yaml`);
    if (aliasSame) refusedBoth(longS, 'Bash echo x > .ctoc/ſettings.yaml [sameFileOnDisk=true]', REFUSAL_SETTINGS);
    else allowedBoth(longS, 'Bash echo x > .ctoc/ſettings.yaml [sameFileOnDisk=false]');
    fs.linkSync(p('.ctoc', 'settings.yaml'), p('src', 'h.yaml'));
    refusedBoth(bash('echo x > src/h.yaml'), 'Bash echo x > a hard link to the settings file', REFUSAL_SETTINGS);
    put(p('.claude', 'settings.json'));
    fs.linkSync(p('.claude', 'settings.json'), p('src', 'h.json'));
    refusedAgent(bash('echo x > src/h.json'), 'Bash echo x > a hard link to an agent settings file', REFUSAL_AGENT_SETTINGS);
    allowedMain(bash('echo x > src/h.json'), 'Bash echo x > a hard link to an agent settings file');
  });

  rowTest('150 · a file or an unreadable folder where a protected folder is expected locks nothing out', () => {
    const state = p('.ctoc', 'state');
    const threeAnswers = (label) => {
      allowedBoth(write(p('src', 'x.js')), `${label}: Write src/x.js`);
      refusedMain(write(p('.ctoc', 'state', 'verify', 'x.json')), `${label}: Write .ctoc/state/verify/x.json`);
      refusedMain(write(p('src', 'V', 'x.json')), `${label}: Write src/V/x.json (its own path runs into it)`);
    };
    // (i) .ctoc/state is a file.
    rm(state);
    fs.writeFileSync(state, 'x');
    fs.symlinkSync(p('.ctoc', 'state', 'verify'), p('src', 'V'), 'junction');
    threeAnswers('(i) .ctoc/state a file');
    // (ii) .ctoc/state is a folder this user cannot search (a no-op where chmod does not stop a search).
    rm(state);
    fs.mkdirSync(p('.ctoc', 'state', 'verify'), { recursive: true });
    fs.chmodSync(state, 0o000);
    try {
      threeAnswers('(ii) .ctoc/state unsearchable');
    } finally {
      fs.chmodSync(state, 0o755);
    }
    // (iii) .ctoc itself is a file; the project root is still found because plans/ stands beside it.
    rm(p('.ctoc'));
    fs.writeFileSync(p('.ctoc'), 'x');
    allowedBoth(write(p('src', 'x.js')), '(iii) .ctoc a file: Write src/x.js');
    allowedBoth(bash('rm -f src/x.js'), '(iii) .ctoc a file: Bash rm -f src/x.js');
    allowedBoth(bash('npm test'), '(iii) .ctoc a file: Bash npm test');
    refusedMain(write(p('.ctoc', 'approvals', 'x.json')), '(iii) .ctoc a file: Write .ctoc/approvals/x.json');
    refusedMain(bash('echo x > .ctoc/settings.yaml'), '(iii) .ctoc a file: Bash echo x > .ctoc/settings.yaml', REFUSAL_SETTINGS);
  });

  rowTest('151 · a decision the hook cannot finish within its budget is refused', () => {
    // A deadline already past whenever decide() sets one: the wrapper lands on the instance the hook uses.
    const preload = p('budget-spent.js');
    fs.writeFileSync(preload, [
      `const c = require(${JSON.stringify(RPC)});`,
      'const set = c.setDeadline;',
      "c.setDeadline = (at) => { if (typeof set === 'function') set(typeof at === 'number' ? Date.now() - 1 : at); };",
      '',
    ].join('\n'));
    R.row('Write src/x.js through the budget-spent preload', () => assertRefused(spawnSync(process.execPath, ['--require', preload, ENTRY], {
      cwd: project, input: JSON.stringify(write(p('src', 'x.js'))), encoding: 'utf8',
    }), 'a Write decided past its budget', REFUSAL_WORK));
    R.row('control: the same Write without the preload', () => assertAllowed(run(write(p('src', 'x.js'))), 'the control'));
  });

  rowTest('152 · a release missing the resolver still runs the shell\'s settings text rules', () => {
    const plugin = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-nores-')));
    try {
      copyTree(path.join(REPO, 'src'), path.join(plugin, 'src'));
      fs.rmSync(path.join(plugin, 'src', 'lib', 'real-path-confinement.js'));
      const opts = { entry: path.join(plugin, 'src', 'hooks', 'protect-records.js'), env: { CLAUDE_CONFIG_DIR: cfg } };
      R.row('main Bash echo x > .ctoc/settings.yaml', () => assertRefused(run(bash('echo x > .ctoc/settings.yaml'), opts),
        'main Bash write to the settings file', REFUSAL_SETTINGS));
      R.row('main Bash cat .ctoc/settings.yaml', () => assertAllowed(run(bash('cat .ctoc/settings.yaml'), opts), 'main Bash read of the settings file'));
      R.row('agent Bash echo x > .claude/settings.json', () => assertRefused(run(asAgent(bash('echo x > .claude/settings.json')), opts),
        'agent Bash write to a Claude Code settings file', REFUSAL_AGENT_SETTINGS_UNCHECKED));
      R.row('main Write .ctoc/approvals/a.json', () => assertRefused(run(write(p('.ctoc', 'approvals', 'a.json')), opts),
        'main Write of an approval record'));
      R.row('main Write src/x.js', () => assertAllowed(run(write(p('src', 'x.js')), opts), 'main Write of an ordinary file'));
    } finally {
      rm(plugin);
    }
  });

  rowTest('153 · a broken link of another name, reached through a link and `..`, cannot create a settings file', () => {
    fs.mkdirSync(p('.claude', 'agents'), { recursive: true });
    put(p('.claude', 'settings.json'));
    fs.symlinkSync(p('.claude', 'agents'), p('src', 'y'), 'junction');
    fs.symlinkSync(p('.claude', 'settings.local.json'), p('.claude', 'foo'));
    refusedBoth(write(`${project}/src/y/../foo`), 'Write src/y/../foo (absolute)');
    refusedBoth(write('src/y/../foo'), 'Write src/y/../foo (relative)');
    refusedBoth(bash('echo x > src/y/../foo'), 'Bash echo x > src/y/../foo', REFUSAL_SETTINGS);
    allowedBoth(write(`${project}/src/y/../fresh.txt`), 'Write src/y/../fresh.txt (the control)');
    // Another copy's settings file through a link of another name (Decision 40).
    const other = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pr-oth2-')));
    try {
      put(path.join(other, '.claude', 'settings.json'));
      fs.mkdirSync(path.join(other, 'sub'));
      fs.symlinkSync(path.join(other, '.claude', 'settings.json'), path.join(other, 'bar'));
      fs.symlinkSync(path.join(other, 'sub'), p('src', 'w'), 'junction');
      refusedAgent(write(`${project}/src/w/../bar`), "Write src/w/../bar (another copy's settings file)", REFUSAL_AGENT_SETTINGS);
      allowedMain(write(`${project}/src/w/../bar`), "Write src/w/../bar (another copy's settings file)");
    } finally {
      rm(other);
    }
  });

  rowTest("154 · a spent budget cannot switch off the background agent's shell settings check", () => {
    // The first call through the module's EXPORT spends the budget (on a Bash payload that is the
    // agent specs' root lookup); every call then delegates to the real function.
    const preload = p('budget-spent-at-lookup.js');
    fs.writeFileSync(preload, [
      `const c = require(${JSON.stringify(RPC)});`,
      'const resolve = c.resolveExisting;',
      'let first = true;',
      "c.resolveExisting = (q) => { if (first) { first = false; if (typeof c.setDeadline === 'function') c.setDeadline(Date.now() - 1); } return resolve(q); };",
      '',
    ].join('\n'));
    const spawned = (input) => spawnSync(process.execPath, ['--require', preload, ENTRY], {
      cwd: project, env: { ...process.env, CLAUDE_CONFIG_DIR: cfg }, input: JSON.stringify(input), encoding: 'utf8',
    });
    R.row('agent Bash echo x > src/x.js, budget spent at the root lookup', () => assertRefused(spawned(asAgent(bash('echo x > src/x.js'))),
      'the agent shell settings check with a spent budget', REFUSAL_WORK));
    R.row('main Bash echo x > src/x.js, same preload', () => assertAllowed(spawned(bash('echo x > src/x.js')), 'the main session with the preload'));
    R.row('agent Bash echo x > src/x.js, no preload', () => assertAllowed(run(asAgent(bash('echo x > src/x.js')), ro()), 'the control without the preload'));
  });

  rowTest("155 · the shell's own text work refuses once the backstop clock has run out", () => {
    // The shell's `cd` prefix rebuild and operand resolution are text work the file-system walks' deadline
    // does not cover; past the budget isLedgerWrite itself must refuse, or a padded command outlasts
    // Claude Code's hook timeout (a timed-out hook lets the call run). The verdict is judged, never wall time.
    fs.mkdirSync(p('a'), { recursive: true });
    const preload = p('budget-spent-decision.js');
    fs.writeFileSync(preload, [
      `const c = require(${JSON.stringify(RPC)});`,
      'const set = c.setDeadline;',
      "c.setDeadline = (at) => { if (typeof set === 'function') set(typeof at === 'number' ? Date.now() - 1 : at); };",
      '',
    ].join('\n'));
    const spawned = (input) => spawnSync(process.execPath, ['--require', preload, ENTRY], {
      cwd: project, env: { ...process.env, CLAUDE_CONFIG_DIR: cfg }, input: JSON.stringify(input), encoding: 'utf8',
    });
    const padded = 'cd a; cd a; cd a; ls';
    R.row('agent Bash cd a; cd a; cd a; ls, budget spent', () => assertRefused(spawned(asAgent(bash(padded))),
      'a padded read-only command past the budget (agent)', REFUSAL_WORK));
    R.row('main Bash cd a; cd a; cd a; ls, budget spent', () => assertRefused(spawned(bash(padded)),
      'a padded read-only command past the budget (main session)', REFUSAL_WORK));
    R.row('agent Bash cd a; cd a; cd a; ls, no preload (control)', () => assertAllowed(run(asAgent(bash(padded)), ro()), 'the control (agent)'));
    R.row('main Bash cd a; cd a; cd a; ls, no preload (control)', () => assertAllowed(run(bash(padded)), 'the control (main session)'));
  });

  rowTest("156 · the main session's own menu call with a long comma-joined --touches value is not read as inside the protected area", () => {
    // Found on the installed 6.14.130: the shell check resolves every operand; a comma-joined `--touches`
    // value with the project path in front is one path of over 1,024 bytes that does not exist. macOS
    // answers such a path with ENAMETOOLONG, not ENOENT, and the old resolver counted that as "inside".
    const menu = (n) => {
      const touches = Array.from({ length: n }, (_, i) => `tests/timing/a-timing-test-number-${i}.test.js`).join(',');
      return { touches, command: `node src/commands/start.js menu task add implement x --touches ${touches}` };
    };
    const long = menu(29);
    assert.ok(path.resolve(project, long.touches).length > 1024, 'the 29 paths make one operand over 1,024 bytes');
    R.row('main Bash menu task add --touches with 29 paths', () => assertAllowed(run(bash(long.command), ro()),
      'the long --touches value (main session)'));
    R.row('main Bash menu task add --touches with 3 paths (control)', () => assertAllowed(run(bash(menu(3).command), ro()),
      'the short --touches value (main session)'));
    // A single path NAME over 255 bytes makes lstat answer ENAMETOOLONG; such a name cannot exist, so cannot be written.
    const summary = 'x'.repeat(300);
    assert.ok(!summary.includes('/'), 'the summary holds no slash');
    R.row('main Bash menu task complete --summary of 300 characters, no slash', () => assertAllowed(run(bash(
      `node src/commands/start.js menu task complete x --summary "${summary}"`), ro()), 'the long quoted --summary (main session)'));
    const rootFiles = Array.from({ length: 30 }, (_, i) => `a-root-level-file-number-${i}.md`).join(',');
    assert.ok(Buffer.byteLength(rootFiles) > 255, 'the joined root-level names exceed 255 bytes');
    R.row('main Bash menu task add --touches of root-level files, one name over 255 bytes', () => assertAllowed(run(bash(
      `node src/commands/start.js menu task add implement x --touches ${rootFiles}`), ro()), 'the long root-level --touches value (main session)'));
  });

  rowTest("157 · a padded command is not let through by its length (the as-written reading is not dropped)", () => {
    // `src/L` is a link to `.ctoc/state`: `cd -P src/L && cd ..` stands in `.ctoc`, the tidied reading in `src`.
    fs.symlinkSync(p('.ctoc', 'state'), p('src', 'L'), 'junction');
    const sentence = 'echo x > settings.yaml';
    const base = 'cd -P src/L && cd ..';
    refusedBoth(bash(`${base} && ${sentence}`), 'the unpadded command (control, refused)', REFUSAL_SETTINGS);
    refusedBoth(bash(`${base}${' && cd .'.repeat(2100)} && ${sentence}`), '2,100 x " && cd ." then the write', REFUSAL_SETTINGS);
    refusedBoth(bash(`${base}${' && cd state && cd ..'.repeat(470)} && ${sentence}`), '470 x " && cd state && cd .." then the write', REFUSAL_SETTINGS);
    // Past 128 operands the as-written reading still reaches the write's target.
    const operands = (n) => Array.from({ length: n }, (_, i) => `a${i}`).join(' ');
    refusedBoth(bash(`${base} && echo ${operands(130)} > settings.yaml`), 'a0..a129 then > settings.yaml', REFUSAL_SETTINGS);
    refusedBoth(bash(`${base} && echo ${operands(100)} > settings.yaml`), 'a0..a99 then > settings.yaml (control, refused)', REFUSAL_SETTINGS);
    // Controls whose verdict does not change: no `cd`, so the two readings are the same.
    allowedBoth(bash(`echo ${'w'.repeat(5000)}`), 'echo of one 5,000-character word');
    allowedBoth(bash(`git add ${Array.from({ length: 200 }, (_, i) => `src/f${i}.js`).join(' ')}`), 'git add of 200 operands, no cd');
  });

  rowTest('159 · a backtick substitution inside double quotes hides no write (the backtick is read as a space too)', () => {
    // Found by the security scanner (also on the installed 6.14.130): the text test deleted backticks
    // without a gap, so "`rm .ctoc/settings.yaml`x" read `.ctoc/settings.yamlx`; the shell still ran the rm.
    for (const n of [1, 300, 5000]) {
      const x = 'x'.repeat(n);
      refusedBoth(bash('echo "`rm .ctoc/settings.yaml`' + x + '"'), `backtick rm of .ctoc/settings.yaml, ${n} x after`, REFUSAL_SETTINGS);
      refusedBoth(bash('echo "`cp x .ctoc/settings.yaml`' + x + '"'), `backtick cp onto .ctoc/settings.yaml, ${n} x after`, REFUSAL_SETTINGS);
      refusedBoth(bash('echo "`rm -r .ctoc/regulatory-regimes`' + x + '"'), `backtick rm -r of the regime folder, ${n} x after`, REFUSAL_SETTINGS);
      refusedAgent(bash('echo "`rm .claude/settings.json`' + x + '"'), `backtick rm of .claude/settings.json, ${n} x after`, REFUSAL_AGENT_SETTINGS);
    }
    allowedBoth(bash('echo "`date`"'), 'echo of a backtick date (control)');
    // Controls for the length rules: one over-long word, a long word with no slash, a name of 100
    // non-Latin characters (over 255 UTF-8 bytes), and a 300-byte file name are all still plain text.
    allowedBoth(bash(`echo ${'x'.repeat(300)}`), 'echo of a 300-character word (control)');
    allowedBoth(bash(`echo ${'x'.repeat(20000)}`), 'echo of a 20,000-character word (control)');
    // Counted in characters: absent on macOS (limit 255 characters); a 255-byte disk answers ENAMETOOLONG, a fault, refused.
    (process.platform === 'darwin' ? allowedBoth : (r, w) => refusedBoth(r, w, REFUSAL_SETTINGS))(
      bash(`echo "${'あ'.repeat(100)}"`), 'echo of a quoted name of 100 non-Latin characters (control)');
    allowedBoth(bash(`cp x ${'n'.repeat(300)}`), 'cp onto a 300-character file name (control)');
    // The limit is 255 UTF-16 units: 128 emoji are 256, a name that cannot exist, so plain text.
    allowedBoth(bash(`echo ${'😀'.repeat(128)}`), 'echo of a word of 128 emoji (256 UTF-16 units) (control)');
  });

  rowTest('160 · a spelling the walk cannot follow (/.vol/<device>/<inode>/…, /.nofollow<path>) that the kernel opens is refused', () => {
    // Found by the security scan of d893b72e: macOS opens an existing folder through the inode-addressed volume
    // form and the /.nofollow prefix; the walk's lstat of `.vol` / `.nofollow` says "no such file". Neither
    // spelling names a protected folder in its text. The test asks the KERNEL first (a file written into the
    // folder through the spelling, in this test's own temporary project); where it does not reach (other
    // platforms), the spelling is an absent path and stays allowed.
    fs.symlinkSync(p('.ctoc', 'approvals'), p('src', 'L'), 'junction');
    const st = fs.statSync(p('.ctoc', 'approvals'));
    // Third field: the kernel must reach the folder (asserted on macOS). The link row is measured to give ELOOP
    // (the kernel does not follow a link under /.nofollow) and is refused all the same: the hook follows links
    // itself, and a refusal there is the safe side.
    for (const [what, spelling, kernelReaches] of [
      ['/.vol/<device>/<inode of .ctoc/approvals>/x.json', `/.vol/${st.dev}/${st.ino}/x.json`, true],
      ['/.nofollow<project>/.ctoc/approvals/x.json', `/.nofollow${project}/.ctoc/approvals/x.json`, true],
      ['/.nofollow<project>/src/L/x.json (src/L is a link to .ctoc/approvals)', `/.nofollow${project}/src/L/x.json`, false],
    ]) {
      let reaches = false;
      try {
        fs.writeFileSync(spelling, '{}');
        reaches = fs.existsSync(p('.ctoc', 'approvals', 'x.json'));
      } catch { reaches = false; }
      fs.rmSync(p('.ctoc', 'approvals', 'x.json'), { force: true });
      if (process.platform === 'darwin') assert.equal(reaches, kernelReaches, `the kernel's answer through ${what} on macOS`);
      (reaches || (process.platform === 'darwin' && !kernelReaches) ? refusedBoth : allowedBoth)(
        write(spelling), `Write ${what} [kernel reaches=${reaches}]`);
    }
  });

  // ---- The settings check counts its work, not the clock (owner, 2026-10-19) ----
  // Each verdict below depends on counts and on a fake clock only (frozen, or moved per file-system call by the
  // preload), never on wall time or on the machine's load.

  rowTest('161 · the builder\'s here-document is decided by its work, not by how slow the machine is', () => {
    const lay = makeLayout('nine');
    const command = builderFixture();
    // A counting run (a frozen clock) gives the file-system calls F; a second run spreads 25 s of fake clock over them.
    const twentyFive = (agent, what) => R.row(what, () => {
      const counted = spawnWork(lay, bash(command, lay.root), { agent });
      assert.ok(counted.report && counted.report.calls > 0, `the counting run made calls: ${JSON.stringify(counted.report)}`);
      assertAllowed(spawnWork(lay, bash(command, lay.root), { agent, stepMs: 25000 / counted.report.calls }).res, what);
    });
    twentyFive(true, '(a) the builder, background agent, nine-check layout, a decision spanning 25 s of fake clock');
    twentyFive(false, '(b) the builder, main session, nine-check layout, a decision spanning 25 s of fake clock');
  });

  rowTest('162 · ordinary commands spend at most a third of the count (the margin), and the stated limits fit', () => {
    const lay = makeLayout('nine');
    const plain = makeLayout('plain');
    const third = { units: 1000000 };
    const folds = (command) => assert.notEqual(command.normalize('NFKC'), command, 'folding changes the command');
    R.row('(a) the builder, background agent, nine-check layout, a third of the count', () => allowedWork(lay, builderFixture(), { ...third, agent: true }, '162 (a)'));
    R.row('(b) the builder, main session, nine-check layout, a third of the count', () => allowedWork(lay, builderFixture(), third, '162 (b)'));
    R.row('(c) the builder, main session, plain project, a third of the count', () => allowedWork(plain, builderFixture(), third, '162 (c)'));
    R.row('(d) the builder after an absolute folder change, background agent, nine-check layout', () => allowedWork(lay,
      builderFixture(`cd ${lay.root} && cat > notes.js <<'EOF'`), { ...third, agent: true }, '162 (d)'));
    R.row('(e) git add of 128 files after an absolute folder change, background agent, nine-check layout', () => allowedWork(lay,
      `cd ${lay.root} && git add ${Array.from({ length: 128 }, (_, i) => `src/f${i}.js`).join(' ')}`, { ...third, agent: true }, '162 (e)'));
    R.row('(f) the 2,000-line here-document, background agent, nine-check layout, the shipped count', () => {
      const command = twoThousandFixture();
      assert.ok(command.length < 163840, `the command is ${command.length} characters, under the agent cap`);
      allowedWork(lay, command, { agent: true }, '162 (f)');
    });
    R.row('(g) the folded builder, background agent, nine-check layout (16 runs), a third of the count', () => {
      const command = builderFixture(BUILDER_FIRST, true);
      folds(command);
      allowedWork(lay, command, { ...third, agent: true }, '162 (g)');
    });
    R.row('(h) the folded 2,000-line here-document, background agent, nine-check layout (16 runs), the shipped count', () => {
      const command = twoThousandFixture(true);
      folds(command);
      assert.ok(command.length < 163840, `the command is ${command.length} characters, under the agent cap`);
      allowedWork(lay, command, { agent: true }, '162 (h)');
    });
  });

  rowTest('163 · the backstop clock still refuses when it is hit', () => {
    const lay = makeLayout('nine');
    const command = builderFixture();
    R.row('the builder, background agent, nine-check layout, a decision spanning 1,200 s of fake clock', () => {
      const counted = spawnWork(lay, bash(command, lay.root), { agent: true });
      assert.ok(counted.report && counted.report.calls > 0, `the counting run made calls: ${JSON.stringify(counted.report)}`);
      assertRefused(spawnWork(lay, bash(command, lay.root), { agent: true, stepMs: 1200000 / counted.report.calls }).res,
        'the builder past the backstop', REFUSAL_WORK);
    });
  });

  rowTest('164 · pathological text work is refused by the count, not by the backstop', () => {
    const lay = makeLayout('plain');
    const chain = 'cd a; '.repeat(12000) + 'ls';
    R.row('(a) 12,000 x "cd a;" then ls, main session, frozen clock', () => refusedWork(lay, chain, {}, '164 (a) main'));
    R.row('(a) 12,000 x "cd a;" then ls, background agent, frozen clock', () => refusedWork(lay, chain, { agent: true }, '164 (a) agent'));
    // A 100 KB folder name in front of 450 segments of 128 distinct literals: about 680 KB, over the agent cap, so main only.
    const folder = 'n'.repeat(102400);
    const shape = (segment) => `cd ${folder}; ${Array.from({ length: 450 }, (_, k) => segment(k)).join('')}`;
    const apart = shape((k) => `true ${Array.from({ length: 128 }, (_, j) => `'p${k}_${j}'`).join(' ')}; `);
    const glued = shape((k) => `true x${Array.from({ length: 128 }, (_, j) => `'q${k}_${j}'`).join('x')}; `);
    for (const [what, command] of [['(b) shape A, 128 literals apart', apart], ['(c) shape B, 128 literals glued into one operand', glued]]) {
      R.row(`${what}, main session, 1 ms of fake clock per call`, () => {
        assert.ok(command.length > 163840, `the command is ${command.length} characters`);
        const { res, report } = spawnWork(lay, bash(command, lay.root), { stepMs: 1 });
        assertRefused(res, what, REFUSAL_WORK);
        assert.ok(report && report.elapsed < 60000, `the fake clock stopped at ${report && report.elapsed} ms, before the 60,000 ms backstop`);
      });
    }
  });

  rowTest('165 · a command too large for its count is refused when the count runs out', () => {
    const lay = makeLayout('plain');
    const many = Array.from({ length: 32 }, (_, k) => `cp ${Array.from({ length: 128 }, (_, j) => `s${k}_${j}`).join(' ')} d`).join('\n');
    const few = { units: 10000 };
    R.row('32 segments of 128 distinct cp operands, main session', () => refusedWork(lay, many, few, '165 main'));
    R.row('32 segments of 128 distinct cp operands, background agent', () => refusedWork(lay, many, { ...few, agent: true }, '165 agent'));
    R.row('control: cp x0 x1 d, main session', () => allowedWork(lay, 'cp x0 x1 d', few, '165 control main'));
    R.row('control: cp x0 x1 d, background agent', () => allowedWork(lay, 'cp x0 x1 d', { ...few, agent: true }, '165 control agent'));
  });

  rowTest('166 · the budget cases again, with an empty count instead of the clock', () => {
    const lay = makeLayout('plain');
    fs.mkdirSync(p('a'), { recursive: true });
    R.row('Write src/x.js with an empty count is refused', () => assertRefused(spawnWork(lay, write(p('src', 'x.js')), { units: 0 }).res,
      'a Write decided with an empty count', REFUSAL_WORK));
    R.row('agent Bash echo x > src/x.js, count emptied at the first lookup, is refused', () => refusedWork(lay, 'echo x > src/x.js',
      { spendAtFirstLookup: true, agent: true }, '166 agent'));
    R.row('main Bash echo x > src/x.js, same preload, is allowed', () => allowedWork(lay, 'echo x > src/x.js', { spendAtFirstLookup: true }, '166 main'));
    R.row('agent Bash cd a; cd a; cd a; ls with an empty count is refused', () => refusedWork(lay, 'cd a; cd a; cd a; ls', { units: 0, agent: true }, '166 padded agent'));
    R.row('main Bash cd a; cd a; cd a; ls with an empty count is refused', () => refusedWork(lay, 'cd a; cd a; cd a; ls', { units: 0 }, '166 padded main'));
  });

  rowTest('167 · the work sentence names the cause, and only when the count or the backstop is spent', () => {
    const lay = makeLayout('plain');
    fs.mkdirSync(p('a'), { recursive: true });
    R.row('(a) cd a; cd a; cd a; ls with a count of 3 is refused with exactly the work sentence', () => refusedWork(lay, 'cd a; cd a; cd a; ls', { units: 3 }, '167 (a)'));
    R.row('(b) a genuine settings write within the count keeps the settings sentence', () => assertRefused(
      spawnWork(lay, bash('echo x > .ctoc/settings.yaml', lay.root), {}).res, '167 (b)', REFUSAL_SETTINGS));
    R.row('(c) an allowed Read whose count is really spent stays allowed', () => {
      const { res, report } = spawnWork(lay, payload('Read', { file_path: p('src', 'x.js') }), { units: 0, chargeAfterSet: 1 });
      assertAllowed(res, '167 (c)');
      assert.ok(report && report.spent === true, `the count was really spent at exit: ${JSON.stringify(report)}`);
    });
  });

  // ---- The first review round (security scan and critic), 2026-10-20 ----

  const REFUSAL_SWEEP_EXPANSION = 'CTOC refused this call because only the human confirms which builds go back '
    + 'to the queue; report the sweep preview and let the main session ask him. A command that only '
    + 'mentions both words is refused too: search one word at a time, and commit with git commit -F <file>.'
    + " A background agent's command that runs node or a wrapper must be one plain call when it uses $ or a backtick.";

  // The same sentence with the plain-call ending, which the sweep check gives for a body that stays in the text read.
  const REFUSAL_SWEEP_PLAIN = REFUSAL_SWEEP_EXPANSION.slice(0, REFUSAL_SWEEP_EXPANSION.indexOf(" A background agent's command"))
    + " A background agent's menu call must also be one plain call, built without $, a backtick, a brace or a wildcard.";

  rowTest('168 · no operand escapes the link test by its place in a long segment (the 128-operand cap is gone)', () => {
    // Found by the security scan: 128 harmless operands followed by the long-s spelling of the settings file
    // let the write through, while 127 refused it. The cap only bounded time, which the count does now.
    fs.linkSync(p('.ctoc', 'settings.yaml'), p('src', 'h.yaml'));
    const operands = (n) => Array.from({ length: n }, (_, i) => `a${i}`).join(' ');
    for (const n of [127, 128, 129, 400]) {
      refusedBoth(bash(`echo ${operands(n)} > src/h.yaml`), `${n} harmless operands then a hard link to the settings file`, REFUSAL_SETTINGS);
    }
    const aliasSame = sameFileOnDisk(p('.ctoc', 'settings.yaml'), p('.ctoc', `${LONG_S}ettings.yaml`));
    for (const n of [127, 128, 400]) {
      const call = bash(`echo ${operands(n)} > .ctoc/${LONG_S}ettings.yaml`);
      if (aliasSame) refusedBoth(call, `${n} harmless operands then the long-s spelling [sameFileOnDisk=true]`, REFUSAL_SETTINGS);
      else allowedBoth(call, `${n} harmless operands then the long-s spelling [sameFileOnDisk=false]`);
    }
    allowedBoth(bash(`echo ${operands(400)} > src/ordinary.txt`), '400 operands then an ordinary file (control)');
  });

  rowTest("169 · a background agent's sweep check is charged to the count: a 64 KB command of folders and runtime words is refused by it", () => {
    // Found by the security scan: every `cd` adds a folder and every runtime word looks the next word up in every folder
    // (five stats and a real path each): 27 KB took 47.8 s, 32 KB 167 s, with no unit spent. The shape below passes the
    // sweep check's `$` test, names no menu, and every lookup misses.
    const lay = makeLayout('plain');
    const pairs = (n) => Array.from({ length: n }, (_, i) => `cd d${i}; node s${i}.js; `).join('');
    const big = `echo $H; ${pairs(2800)}ls`;
    assert.ok(big.length > 64 * 1024, `the command is ${big.length} characters`);
    R.row('64 KB of folders and runtime words, background agent, frozen clock: refused by the count', () => {
      const { res, report } = spawnWork(lay, bash(big, lay.root), { agent: true });
      assertRefused(res, '169 big', REFUSAL_WORK);
      assert.ok(report && report.spent === true, `the count was spent: ${JSON.stringify(report)}`);
      assert.ok(report.calls < 3500000, `the lookups stopped with the count: ${report.calls} file-system calls`);
    });
    R.row('control: 20 pairs keep the sweep sentence, not the work sentence', () => assertRefused(
      spawnWork(lay, bash(`echo $H; ${pairs(20)}ls`, lay.root), { agent: true }).res, '169 small', REFUSAL_SWEEP_EXPANSION));
  });

  rowTest('171 · four segments of 128 operands through the deepest folders (about 470 KB) are decided by the count, at a fraction of it', () => {
    // The critic's finding on the 478 KB command of the earlier clock. Measured: 75,298 units for the main session and
    // 179,840 for a background agent in a plain project, about 8,000 file-system calls, so the count decides, not the clock.
    // The deep folders are made by a child that changes folder step by step (the system refuses one long path).
    const lay = makeLayout('nine');
    // One limit on every platform, 1,024 bytes (what macOS refuses in one call): the same folders and the same cost
    // everywhere. At 4,096 bytes the earlier four-segment agent row was reported near 1,046,000 units, over the third
    // (1,000,000) that these rows hold the count to (a figure from the final review, not re-measured here: the cost
    // grows with the length of the folders, and a longer limit would turn the row red off macOS for a reason that is
    // not the code's).
    const pathMax = 1024;
    const build = spawnSync(process.execPath, ['-e', [
      "const fs = require('fs');",
      `let remaining = ${pathMax} - 40 - Buffer.byteLength(process.cwd());`,
      'const names = [];',
      'while (remaining > 1) { const n = Math.min(200, remaining - 1); const name = "e" + "d".repeat(n - 1); fs.mkdirSync(name); names.push(name); process.chdir(name); remaining -= n + 1; }',
      "process.stdout.write(names.join('/'));",
    ].join('\n')], { cwd: lay.root, encoding: 'utf8' });
    assert.equal(build.status, 0, build.stderr);
    const deep = build.stdout;
    const segment = (k) => `cp ${Array.from({ length: 128 }, (_, j) => `${deep}/x${k}_${j}`).join(' ')} d`;
    const command = [0, 1, 2, 3].map(segment).join('\n');
    assert.ok(command.length > 400000, `the command is ${command.length} characters`);
    // Decision 16: a row over 163,840 characters runs for the main session only, because the hook branch's cap on a background
    // agent's command (AGENT_COMMAND_CAP) refuses it before any other work. The agent's row is therefore one segment of the
    // four, under the cap, so after the merge it still tests the count and not the cap.
    const agentCommand = segment(0);
    assert.ok(agentCommand.length < 163840, `the agent's command is ${agentCommand.length} characters, under the cap`);
    R.row('background agent, nine-check layout, one segment, a third of the count, frozen clock: allowed', () => allowedWork(lay, agentCommand, { units: 1000000, agent: true }, '171 agent'));
    R.row('main session, nine-check layout, four segments, a third of the count, frozen clock: allowed', () => allowedWork(lay, command, { units: 1000000 }, '171 main'));
    // The deep folders reach about 1,000 bytes of path (macOS refuses a path of 1,024 bytes or more in one call). The
    // removal walks down by name as the creation did, so it must leave nothing behind: asserted here, not assumed.
    rm(lay.dir);
    assert.equal(fs.existsSync(lay.dir), false, 'the layout with its deep folders is removed');
  });

  rowTest("172 · the sweep check finds the next word that is not an option in one pass, and the text it reads is charged", () => {
    // Found by the re-review: a word such as `-/node` is an option by its first character and a runtime word by its last
    // path segment, and every runtime word searched forward to the end of the run of options: quadratic, 12 s at 1.09 MB,
    // with no unit charged.
    const lay = makeLayout('plain');
    // No word that is not an option follows, so no lookup is made and the search itself is all the work there is.
    const command = `echo *; ${'-/node '.repeat(20000)}`;
    R.row('20,000 option-like runtime words (140 KB), background agent: allowed, each step of the search and the reading charged once', () => {
      const { res, report } = spawnWork(lay, bash(command, lay.root), { agent: true });
      assertAllowed(res, '172');
      // One unit for each of the 20,000 words in the single pass, and the command's length at the text rate. A search
      // from every runtime word to the end of the run costs about 200,000,000 units at the same price per step: the
      // count (3,000,000) is spent and the command refused, so only the one-pass version passes this row.
      assert.ok(report && report.charged >= 20000 + Math.floor(command.length / 64), `the units charged: ${JSON.stringify(report)}`);
      assert.ok(report.charged < 100000, `the units charged: ${JSON.stringify(report)}`);
      assert.equal(report.spent, false, 'the count is not spent');
    });
  });

  rowTest('173 · a manifest that is not a regular file (a named pipe) cannot hold the sweep check: it gives a verdict', () => {
    // Found by the re-review: `namesCtoc` read `package.json` of every folder above a script it found, so a named pipe
    // there blocked the read, outside the count and the backstop, with no verdict. (Where no named pipe can be made, a
    // folder stands in: its read fails at once, so that platform row holds the verdict only.)
    const lay = makeLayout('plain');
    fs.mkdirSync(path.join(lay.root, 'b'));
    fs.writeFileSync(path.join(lay.root, 'b', 'm'), '');
    const manifest = path.join(lay.root, 'b', 'package.json');
    if (process.platform === 'win32') fs.mkdirSync(manifest);
    else assert.equal(spawnSync('mkfifo', [manifest]).status, 0, 'a named pipe was made');
    R.row('agent: node m, a wildcard-built sweep word, with a pipe for the manifest next to the script: allowed, no hang', () => assertAllowed(
      spawnWork(lay, bash('cd b; node m menu task sw?ep --con?irm none', lay.root), { agent: true, timeout: 30000 }).res, '173'));
    // The race: a regular manifest swapped for a pipe between a check and the read. Simulated without timing: the path-based
    // stat is made to say "regular file" for the pipe. The manifest is opened once without waiting and judged by that
    // descriptor, so the lie changes nothing; a check by path followed by a read by path blocks on the pipe.
    R.row('the stat says "regular file" for the pipe: the descriptor is judged, a verdict is given', () => assertAllowed(
      spawnWork(lay, bash('cd b; node m menu task sw?ep --con?irm none', lay.root), { agent: true, timeout: 30000, statLiesFor: 'package.json' }).res, '173 lie'));
  });

  rowTest('173b · a large manifest is charged for the bytes it is read for, and one over 1 MiB is not read at all', () => {
    const lay = makeLayout('plain');
    fs.mkdirSync(path.join(lay.root, 'b'));
    fs.writeFileSync(path.join(lay.root, 'b', 'm'), '');
    const manifest = path.join(lay.root, 'b', 'package.json');
    const command = bash('cd b; node m menu task sw?ep --con?irm none', lay.root);
    const sized = (bytes) => JSON.stringify({ name: 'ctoc', pad: 'x'.repeat(bytes - 30) });
    let readWhole = null;
    R.row('a regular manifest of 900,000 bytes: read, and charged at the text rate for its bytes', () => {
      fs.writeFileSync(manifest, sized(900000));
      const { res, report } = spawnWork(lay, command, { agent: true });
      assertAllowed(res, '173b regular');
      assert.ok(report && report.bytesRead >= 899000, `the bytes read: ${JSON.stringify(report)}`);
      assert.ok(report.charged >= Math.floor(900000 / 64), `the units charged: ${JSON.stringify(report)}`);
      readWhole = report.bytesRead;
    });
    R.row('a regular manifest of 2,000,000 bytes: not read, names nothing, a verdict', () => {
      fs.writeFileSync(manifest, sized(2000000));
      const { res, report } = spawnWork(lay, command, { agent: true });
      assertAllowed(res, '173b oversized');
      assert.ok(report && report.bytesRead < 1048576, `the bytes read: ${JSON.stringify(report)}`);
    });
    R.row('the same 900,000-byte manifest at a count of 1,000: its charge (14,063 units) spends the count, it is not read, the verdict is the work sentence', () => {
      fs.writeFileSync(manifest, sized(900000));
      const { res, report } = spawnWork(lay, command, { agent: true, units: 1000 });
      assertRefused(res, '173b charged at the count', REFUSAL_WORK);
      assert.ok(report && report.spent === true, `the count was spent: ${JSON.stringify(report)}`);
      assert.ok(readWhole !== null && report.bytesRead <= readWhole - 899000, `the bytes read: ${JSON.stringify(report)}, against ${readWhole} when the count allowed the read`);
    });
    R.row('a short read: the descriptor says 10 bytes more than the file holds; the read stops at the first empty read', () => {
      fs.writeFileSync(manifest, JSON.stringify({ name: 'ctoc' }));
      const { res, report } = spawnWork(lay, command, { agent: true, fstatGrowsFor: 'package.json' });
      assertAllowed(res, '173b short read');
      assert.ok(report && report.zeroReads >= 1 && report.zeroReads <= 1, `the empty reads: ${JSON.stringify(report)}`);
    });
  });

  rowTest("174 · the sweep check's reads of manifests above a script are charged to the count", () => {
    // `ctocKind` reads two manifests in each of up to 16 folders for every script a runtime word names. The script sits 16
    // folders below the project (`b`, then 15 more), so `ctocKind` visits exactly 16 folders, all inside the project and none
    // with a manifest, on every platform: with the script one folder down it climbed to the root of the disk, which is 9
    // folders on a deep temporary path and fewer on a shallow one, and the two costs below moved with the machine.
    // Measured by bisection over the count (a background agent, this layout, a frozen clock): 461,488 units allowed on this
    // tree, and 333,488 with the charge of `ctocKind` removed (mutation (ad)): 64 units for each of the 2,000 words, 128,000
    // in all. The count sits midway, 397,488, so it refuses the charged check and would allow the uncharged one.
    const lay = makeLayout('plain');
    const folders = ['b', ...Array(15).fill('c')];
    fs.mkdirSync(path.join(lay.root, ...folders), { recursive: true });
    fs.writeFileSync(path.join(lay.root, ...folders, 'm'), '');
    const script = [...folders, 'm'].join('/');
    const many = `echo *; ${`node ${script} x; `.repeat(2000)}ls`;
    const few = `echo *; ${`node ${script} x; `.repeat(100)}ls`;
    R.row('2,000 runtime words naming one script 16 folders down, a count of 397,488: refused with the work sentence', () => refusedWork(lay, many, { units: 397488, agent: true }, '174 many'));
    R.row('control: 100 of them, the same count: allowed', () => allowedWork(lay, few, { units: 397488, agent: true }, '174 few'));
  });

  rowTest("175 · with the resolver unloadable, a background agent's runtime word built at run time is still refused by the sweep check", () => {
    // The sweep check charges its work through three module-private wrappers (the text rate, the file-system steps, and the
    // work sentence of `main`). Each one's `catch` answers "nothing was counted" when the resolver does not load, so the check
    // goes on and refuses on its own text test. Driven by a test-only `Module._load` shim (no product backdoor), as the
    // degraded-resolver cases of the link test file do; the child inherits the environment, so coverage reaches it.
    const shim = path.join(project, '_break-resolver.js');
    fs.writeFileSync(shim, [
      "const Module = require('module');",
      'const load = Module._load;',
      'Module._load = function (request, parent, isMain) {',
      "  if (String(request).includes('real-path-confinement')) {",
      "    require('fs').appendFileSync(process.env.RESOLVER_THROWS_MARKER, 'threw\\n');",
      "    throw new Error('simulated unloadable resolver');",
      '  }',
      '  return load.call(this, request, parent, isMain);',
      '};',
      '',
    ].join('\n'));
    // The verdicts below are the same whether or not the resolver fails to load, so each row asserts its own precondition: the
    // shim appends one line to the marker each time it throws for the resolver, the marker is removed before the spawn, and at
    // least one throw must be recorded after it (a shim whose match string stopped matching would otherwise test nothing).
    const marker = path.join(project, '_resolver-throws.log');
    const spawned = (input, what) => {
      fs.rmSync(marker, { force: true });
      const res = spawnSync(process.execPath, ['--require', shim, ENTRY], {
        cwd: project, env: { ...process.env, CLAUDE_CONFIG_DIR: cfg, RESOLVER_THROWS_MARKER: marker }, input: JSON.stringify(input), encoding: 'utf8',
      });
      const throws = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').split('\n').filter(Boolean).length : 0;
      assert.ok(throws >= 1, `${what}: the shim made the resolver unloadable at least once (throws recorded: ${throws})`);
      return res;
    };
    R.row('background agent: node $SCRIPT, no resolver: refused with the sweep sentence (plain-call ending)', () => assertRefused(
      spawned(asAgent(bash('node $SCRIPT')), '175 agent'), '175 agent', REFUSAL_SWEEP_PLAIN));
    R.row('main session: node $SCRIPT, no resolver: allowed (the sweep check is a background agent\'s)', () => assertAllowed(
      spawned(bash('node $SCRIPT'), '175 main'), '175 main'));
  });

  rowTest('176 · a spent count stops the sweep check at the step that spent it', () => {
    // The settings check also refuses once the count is spent, so every row here is refused with the work sentence either way;
    // what tells the steps apart is the units charged. `X` is the reading of the command at the text rate: one unit plus one
    // for every 64 characters.
    const lay = makeLayout('plain');
    const X = (command) => 1 + Math.floor(command.length / 64);
    const spentAt = (command, count, what) => {
      const { res, report } = spawnWork(lay, bash(command, lay.root), { agent: true, units: count });
      assertRefused(res, what, REFUSAL_WORK);
      assert.ok(report && report.spent === true, `${what}: the count was spent: ${JSON.stringify(report)}`);
      return report.charged;
    };
    const listing = 'echo *; ls -l a b c';
    R.row('the reading of the command spends the count: stops there, X units charged', () => {
      const charged = spentAt(listing, X(listing) - 1, '176 reading');
      assert.equal(charged, X(listing), `charged ${charged}, expected X = ${X(listing)}`);
    });
    R.row('the first step of the next-word pass spends it: stops there, X + 1 units charged', () => {
      const charged = spentAt(listing, X(listing), '176 next-word pass');
      assert.equal(charged, X(listing) + 1, `charged ${charged}, expected X + 1 = ${X(listing) + 1}`);
    });
    R.row('a folder step spends it: stops there, at most one step past the count', () => {
      const chain = `${'cd a; '.repeat(200)}echo *`;
      const count = X(chain) + 50;
      const charged = spentAt(chain, count, '176 folder steps');
      assert.ok(charged - count < 64, `charged ${charged} against a count of ${count}`);
    });
    R.row('the reading of a reply body spends it: the body is charged, then the command again, 2X in all', () => {
      const command = ["node /x/src/commands/start.js inbox answer q1 --stdin <<'TAG'", 'body $HOME', 'TAG'].join('\n');
      const charged = spentAt(command, X(command) - 1, '176 reply body');
      assert.equal(charged, 2 * X(command), `charged ${charged}, expected 2X = ${2 * X(command)}`);
    });
  });

  rowTest('170 · the menu reply body is read in linear time, charged by its length, and a closing line keeps its meaning', () => {
    // Found by the security scan: a trailing-blanks regex on a line of 40,000 spaces and one more character takes quadratic time.
    const lay = makeLayout('plain');
    const head = `node ${path.join(REPO, 'src', 'commands', 'start.js')} inbox answer q1 --stdin <<'TAG'`;
    const spaces = ' '.repeat(40000);
    R.row('a body line of 40,000 spaces then a letter, closed by TAG: the body is data (allowed), and its length is charged', () => {
      const { res, report } = spawnWork(lay, bash(`${head}\n${spaces}x\n$HOME\nTAG`, lay.root), { agent: true });
      assertAllowed(res, '170 spaces');
      assert.ok(report && report.charged >= Math.floor(40000 / 64), `the units charged: ${JSON.stringify(report)}`);
    });
    R.row('a closing line with trailing spaces and a tab still closes the body (allowed)', () => assertAllowed(
      spawnWork(lay, bash(`${head}\nbody $HOME\nTAG \t `, lay.root), { agent: true }).res, '170 closing with blanks'));
    R.row('a closing line "TAG." does not close it: the body stays in the text read (refused)', () => {
      assertRefused(spawnWork(lay, bash(`${head}\nbody $HOME\nTAG.`, lay.root), { agent: true }).res, '170 TAG.', REFUSAL_SWEEP_PLAIN);
    });
  });
});

describe('only the human confirms a sweep (owner, 2026-10-18)', () => {
  const REFUSAL_SWEEP_CONFIRM = 'CTOC refused this call because only the human confirms which builds go back '
    + 'to the queue; report the sweep preview and let the main session ask him. A command that only '
    + 'mentions both words is refused too: search one word at a time, and commit with git commit -F <file>.';
  const MENU = 'node "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js"';
  const agent = (input, id = 'a1b2c3') => ({ ...input, agent_id: id, agent_type: 'iron-loop-executor' });
  const CONFIRMS = [
    `${MENU} menu task sweep --confirm p1@0123456789ab`,
    `${MENU} menu task sweep --confirm none`,
    `${MENU} 'menu' 'task' 's'w'eep' --con"firm" none`,
    `${MENU} menu task SWEEP --CONFIRM none`,
    `node -e "require('./src/lib/plan-recovery').applySweep(process.cwd(),{confirm:[]})"`,
  ];

  test('97 · a background agent cannot confirm a sweep, however it is quoted or cased', () => {
    for (const command of CONFIRMS) {
      assertRefused(run(agent(bash(command))), `${command} (background agent)`, REFUSAL_SWEEP_CONFIRM);
    }
  });

  test('98 · the same commands from the main session, and from an empty agent id, are allowed', () => {
    for (const command of CONFIRMS) {
      assertAllowed(run(bash(command)), `${command} (main session)`);
      assertAllowed(run(agent(bash(command), '')), `${command} (empty agent id)`);
    }
  });

  test('99 · a background agent may run the preview', () => {
    assertAllowed(run(agent(bash(`${MENU} menu task sweep`))), 'preview');
    assertAllowed(run(agent(bash(`${MENU} menu task sweep --live-agent-ids a,b`))), 'preview with a live list');
  });

  test('100 · the accepted false positive is pinned: both words in one command are refused, one word is not', () => {
    assertRefused(run(agent(bash('grep -n "sweep --confirm" src/commands/start.md'))), 'grep for both words', REFUSAL_SWEEP_CONFIRM);
    assertAllowed(run(agent(bash('grep -n sweep src/commands/start.md'))), 'grep for one word');
  });

  const PLAIN = " A background agent's menu call must also be one plain call, built without $, a backtick, a brace or a wildcard.";
  const SHELL_BUILT = [
    `${MENU} menu task sw\${E}eep --confirm none`,
    `${MENU} menu task sweep $'\\x2d-confirm' none`,
    `${MENU} menu task sweep --con\${X}firm none`,
    `node ${path.join(REPO, 'src', 'commands')}/sta*.js menu task sweep --con\${X}firm none`,
    'node "$S" menu task sw${E}eep --con${X}firm none',
    '$NODE "${CLAUDE_PLUGIN_ROOT}/src/commands/start.js" menu task sw${E}eep --con${E}firm none',
    'echo x | xargs node src/commands/start.js menu task sw${E}eep --confirm none',
    'bash -c "node src/commands/start.js menu task sw\\${E}eep --confirm none"',
  ];

  test('102 · a confirmation built by the shell is refused for a background agent, with the plain-call sentence', () => {
    for (const command of SHELL_BUILT) {
      assertRefused(run(agent(bash(command))), `${command} (background agent)`, REFUSAL_SWEEP_CONFIRM + PLAIN);
    }
  });

  test('103 · the shell-built spellings are allowed from the main session and with an empty agent id', () => {
    for (const command of SHELL_BUILT) {
      assertAllowed(run(bash(command)), `${command} (main session)`);
      assertAllowed(run(agent(bash(command), '')), `${command} (empty agent id)`);
    }
  });

  test('103b · a quoted here-document body fed to the menu script is data; one fed to a shell is still read', () => {
    const body = (head) => `${head} <<'CTOC_ANSWER_1-abc_ff'\na\`b $HOME "c"\nCTOC_ANSWER_1-abc_ff`;
    assertAllowed(run(agent(bash(body(`${MENU} inbox answer 1-abc --stdin`)))), 'reply body, background agent');
    const shell = "bash <<'EOF'\nnode src/commands/start.js menu task sw${E}eep --confirm none\nEOF";
    assertRefused(run(agent(bash(shell))), 'shell here-document body', REFUSAL_SWEEP_CONFIRM + PLAIN);
  });

  test('103c · the here-document exemption holds only when the menu answer call is the whole command', () => {
    const B = 'node src/commands/start.js menu task sw${E}eep --con${E}firm none';
    const ans = `${MENU} inbox answer 1 --stdin`;
    const shapes = [
      `echo start.js; bash <<'EOF'\n${B}\nEOF`,
      `: start.js && bash <<'EOF'\n${B}\nEOF`,
      `bash -s start.js <<'EOF'\n${B}\nEOF`,
      `bash /dev/stdin start.js <<'EOF'\n${B}\nEOF`,
      `sh -c 'cat | sh' start.js <<'EOF'\n${B}\nEOF`,
      `${ans} <<'A'; bash <<'B'\nx\nA\n${B}\nB`,
      `${ans} <<'EOF' | bash\nx $(${B})\nEOF`,
      `${ans} <<'EOF'\nx\nEOF\nbash <<'EOF'\n${B}\nEOF`,
      `${ans} <<'EOF'\nx\nEOF\n${B}`,
      `${ans} <<'EOF'\nx\nEOF\n${B}\nEOF`,
    ];
    for (const command of shapes) {
      assertRefused(run(agent(bash(command))), command, REFUSAL_SWEEP_CONFIRM + PLAIN);
    }
  });

  test('104 · ordinary background-agent calls stay allowed', () => {
    for (const command of [
      `${MENU} menu task complete t1 --summary "one line"`,
      `${MENU} menu task complete t1 --summary "costs $5"`,
      `${MENU} menu task sweep`,
      `${MENU} menu task sweep --live-agent-ids a,b`,
      'node --test tests/*.test.js',
      'node --test tests/menu-screens-coverage.test.js 2>&1 | tail -5',
      'git add src/lib/menu-screens.js && git commit -F msg',
      'grep -n x src/commands/start.js | head',
      "grep -n 'a.*b' src/commands/start.js | head",
      'ls src/commands/*.ts | wc -l',
      'for f in src/commands/*.js; do wc -l "$f"; done',
      'npx eslint "src/commands/**/*.ts" && npm test',
    ]) assertAllowed(run(agent(bash(command))), `${command} (background agent)`);
  });

  // The shell builds the words `sweep` and `--confirm` at run time ($'\x73weep'), and the runtime or
  // its script is hidden behind a spelling the hook would have to parse like a shell.
  const TAIL = () => `${path.join(REPO, 'src', 'commands', 'start.js')} menu task $'\\x73weep' $'\\x2d-confirm' some-plan@0123456789ab`;
  const SPELLINGS = () => [
    `no\\de ${TAIL()}`,
    `node --title x ${TAIL()}`,
    `node \\\n${TAIL()}`,
    `cd ${path.join(REPO, 'src', "command$'s'")} && node start menu task $'\\x73weep' $'\\x2d-confirm' some-plan@0123456789ab`,
    `=node ${TAIL()}`,
    `node --title x ${path.join(REPO, 'src', 'commands', 'start.js')} $'menu task \\x73weep \\x2d-confirm some-plan@0123456789ab'`,
  ];
  const SPELLING_SENTENCE = REFUSAL_SWEEP_CONFIRM
    + " A background agent's command that runs node or a wrapper must be one plain call when it uses $ or a backtick.";

  test('105 · six shell-built spellings of the confirmation are refused for a background agent', () => {
    for (const command of SPELLINGS()) {
      assertRefused(run(agent(bash(command), 'a123')), `${command} (background agent)`, SPELLING_SENTENCE);
    }
  });

  test('106 · the six spellings are allowed from the main session and with an empty agent id', () => {
    for (const command of SPELLINGS()) {
      assertAllowed(run(bash(command)), `${command} (main session)`);
      assertAllowed(run(agent(bash(command), '')), `${command} (empty agent id)`);
    }
  });

  test('107 · what stays allowed: the owner reply, a plain call with a backtick, and ordinary reads', () => {
    const reply = `node ${path.join(REPO, 'src', 'commands', 'start.js')} inbox answer q1 --stdin <<'TAG'\nprice is $5\nTAG`;
    for (const command of [
      reply,
      "node -e 'console.log(`x`)'",
      "grep -n 'a.*b' src/commands/start.js | head",
      'ls src/commands/*.ts | wc -l',
      'node --test tests/*.test.js 2>&1 | tail -3',
    ]) assertAllowed(run(agent(bash(command), 'a123')), `${command} (background agent)`);
  });

  test('108 · accepted false refusal, pinned: a node loop over "$f" is refused; the rewrite is allowed', () => {
    assertRefused(run(agent(bash('for f in tests/*.test.js; do node --test "$f"; done'), 'a123')),
      'node in a loop with $f', REFUSAL_SWEEP_CONFIRM + PLAIN); // the older script-word rule fires first
    assertAllowed(run(agent(bash('node --test tests/*.test.js'), 'a123')), 'the rewrite');
  });

  test('109 · a folder visited again keeps the shell where it is: a wildcard-built confirmation after cd, cd .. is still refused', () => {
    // Found by the re-review: dropping repeated folders from the chain also dropped the shell's own position, so the
    // third `cd` below resolved to <repo>/src/src/commands and the real folder was never searched for the menu script.
    const rows = [
      ['a revisited folder (the one added last is not visited again)', `cd ${REPO} && cd src && cd .. && cd src/commands && node start menu task sw?ep --con?irm none`],
      ['the same, brace-built', `cd ${REPO} && cd src && cd .. && cd src/commands && node start menu task sweep --con{firm,firm} none`],
      ['the revisited folder is not the one added last', `cd ${REPO} && cd src && cd lib && cd .. && cd .. && cd src/commands && node start menu task s{w,w}eep --c{o,o}nfirm none`],
      ['pushd, and a folder left and entered again', `pushd ${REPO}/src && pushd lib && pushd .. && pushd commands && node start menu task sw?ep --con?irm none`],
      ['control: no revisit', `cd ${REPO}/src/commands && node start menu task sw?ep --con?irm none`],
    ];
    for (const [what, command] of rows) {
      assertRefused(run(agent(bash(command))), `${what} (background agent)`, REFUSAL_SWEEP_CONFIRM + PLAIN);
      assertAllowed(run(bash(command)), `${what} (main session)`);
    }
  });

  test('101 · the fail rule: a crash on a background agent’s sweep confirmation refuses with the sweep sentence', () => {
    const missing = path.join(os.tmpdir(), `ctoc-no-such-folder-${process.pid}-${Date.now()}`);
    const crashing = [
      payload('Bash', { command: `${MENU} menu task sweep --confirm none`, description: 'd' }, missing),
      payload('Bash', { command: ['menu task sweep --confirm none'], description: 'd' }),
    ];
    for (const call of crashing) {
      assertRefused(run(agent(call)), 'crash, background agent', REFUSAL_SWEEP_CONFIRM);
      assertAllowed(run(call), 'crash, main session');
    }
  });
});
