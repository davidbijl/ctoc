/**
 * Agent Area (A3.2 / CTOC v7)
 *
 * Agent control center: status, active plan, step, token budget, schedule.
 * Folds the legacy `progress` tab and parts of `tools`.
 */

const { c, line, renderFooter } = require('../lib/tui');
const { getAgentStatus } = require('../lib/state');
const { releaseLock } = require('../lib/agent-lock');

function render(app) {
  const root = app.projectPath || process.cwd();
  let agent = getAgentStatus(root);

  // Menu-noise cleanup (Rule 15): a stale lock is already confirmed dead here —
  // getAgentStatus only sets `stale` after its own isPidAlive(lock.pid) check
  // failed — so it is safe to silently release it and render idle, with NO
  // warning. A lock whose owning process is still alive takes the `active`
  // branch below and is never touched.
  if (agent.stale) {
    releaseLock(root);
    agent = { active: false };
  }

  let out = '\n';
  out += `${c.bold}Agent${c.reset}\n\n`;

  if (agent.active) {
    out += `  ${c.green}●${c.reset} ${c.bold}Active${c.reset}\n`;
    out += `  Plan       ${c.cyan}${agent.plan || 'unknown'}${c.reset}\n`;
    if (agent.step)    out += `  Step       ${agent.step}/16  ${c.cyan}${agent.phase || ''}${c.reset}\n`;
    if (agent.task)    out += `  Task       ${agent.task}\n`;
    if (agent.elapsed) out += `  Elapsed    ${c.dim}${agent.elapsed}${c.reset}\n`;
    if (agent.pid)     out += `  PID        ${c.dim}${agent.pid}${c.reset}\n`;
    out += '\n';
    out += `  ${c.dim}Press 's' to request stop (graceful — after current plan)${c.reset}\n`;
  } else {
    out += `  ${c.dim}○ Idle${c.reset}\n`;
    out += `  No active plan. Queue is processed by the next /ctoc:start.\n`;
    out += '\n';
    out += `  ${c.dim}Press 'g' to start the agent on the next todo plan${c.reset}\n`;
  }

  out += '\n' + line() + '\n';
  out += renderFooter(['g start', 's stop', '←/→ areas', 'q quit']);
  return out;
}

function handleKey(_key, _app) {
  // Real start/stop wiring lives in actions.js — left as a follow-up
  // (the agent can be controlled via /ctoc:menu in the meantime).
  return false;
}

module.exports = { render, handleKey };
