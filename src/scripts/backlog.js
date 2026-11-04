#!/usr/bin/env node
'use strict';

/**
 * Park a blocked functional plan out of the decision lists, or bring a parked plan back.
 *
 * Usage:
 *   node <CTOC folder>/src/scripts/backlog.js park <file.md> [reason words]
 *   node <CTOC folder>/src/scripts/backlog.js restore <file.md>
 *
 * `park` moves the plan from plans/functional/ to plans/backlog/, where no decision list shows it, and
 * removes its approval record. `restore` brings it back to plans/functional/ as an unapproved draft, with its
 * old approval gone. Only the owner parks or restores a plan: run this only when he asks for it. It does the
 * checks first and writes only when all of them pass, so a refused call changes nothing (src/lib/backlog.js
 * gives the order and why). Questions, answers and the plan body are never touched.
 *
 * Like src/scripts/move-plan.js it exports nothing and runs when it is required. It ends with requestExit,
 * never process.exit, so everything it printed reaches a pipe.
 */

const { parkPlan, restorePlan } = require('../lib/backlog');
const { findProjectRoot } = require('../lib/project-root');
const { requestExit } = require('../lib/request-exit');

const USAGE = [
  'Usage:',
  '  node <CTOC folder>/src/scripts/backlog.js park <file.md> [reason words]',
  '  node <CTOC folder>/src/scripts/backlog.js restore <file.md>',
  '',
  'park     moves a blocked plan from plans/functional/ to plans/backlog/, where no decision list shows it.',
  'restore  brings a parked plan back to plans/functional/ as an unapproved draft.',
  'Only the owner parks or restores a plan: run this only when he asks for it.',
].join('\n');

/** @param {boolean} recordRemoved @returns {string} */
function recordLine(recordRemoved) {
  return recordRemoved ? 'It had an approval record; that record was removed.' : 'It had no approval record.';
}

/**
 * Do one action and print what the owner reads.
 * @param {'park'|'restore'} action
 * @param {string} file
 * @param {string} reason
 * @returns {number} the exit code
 */
function run(action, file, reason) {
  try {
    const root = findProjectRoot();
    if (action === 'park') {
      const done = parkPlan(file, reason, root);
      console.log([
        `Parked ${file}: it is now plans/backlog/${file}, and no decision list shows it.`,
        done.reason === '' ? 'No reason was given.' : `Reason recorded: ${done.reason}`,
        recordLine(done.recordRemoved),
        `To bring it back later, run the same script with: restore ${file}`,
      ].join('\n'));
    } else {
      const done = restorePlan(file, root);
      console.log([
        `Restored ${file} to plans/functional/${file} as an unapproved draft: its old approval is gone, and the questions asked before it was parked no longer count.`,
        recordLine(done.recordRemoved),
      ].join('\n'));
    }
    return 0;
  } catch (err) {
    if (err && err.code === 'BACKLOG_BAD_NAME') {
      console.error(`${err.message}\n${USAGE}`);
    } else if (err && err.code === 'BACKLOG_REFUSED') {
      console.error(err.message);
    } else {
      console.error(`Could not ${action} ${file}: ${err && err.message ? err.message : err}`);
    }
    return 1;
  }
}

/**
 * @param {string[]} args - the words after the script name
 * @returns {number} the exit code
 */
function main(args) {
  const [action, file, ...rest] = args;
  if (action === 'park' && file !== undefined) return run('park', file, rest.join(' '));
  if (action === 'restore' && file !== undefined && rest.length === 0) return run('restore', file, '');
  console.error(USAGE);
  return 1;
}

requestExit(main(process.argv.slice(2)));
