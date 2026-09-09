#!/usr/bin/env node
'use strict';

/**
 * Gate in front of `eas update --channel production`.
 * Requires typing the exact word PRODUCTION before anything runs.
 * Preview/development updates never go through this — they stay as fast as today.
 */

const readline = require('readline');
const { spawnSync } = require('child_process');

const CONFIRM_WORD = 'PRODUCTION';
const DEFAULT_ROLLOUT_PERCENTAGE = '10';
// Branching model: master (trusted, production-proven baseline, merged from
// production only) -> dev (everyday work) -> production (curated,
// cherry-picked from dev when something's deliberately ready). Real
// production pushes must only ever come from this exact branch - never
// dev, never master directly - so a push attempted from anywhere else is
// refused outright, before the typed-confirmation prompt even shows.
const REQUIRED_BRANCH = 'production';

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function getCurrentBranch() {
  const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' });
  return result.stdout.trim();
}

function isWorkingTreeClean() {
  const result = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  return result.stdout.trim().length === 0;
}

async function main() {
  const currentBranch = getCurrentBranch();
  if (currentBranch !== REQUIRED_BRANCH) {
    console.error(`\nRefusing to run: current branch is "${currentBranch}", not "${REQUIRED_BRANCH}".`);
    console.error(`Production pushes only ever come from "${REQUIRED_BRANCH}" - cherry-pick the commit(s) you want`);
    console.error(`there from "dev" first (git checkout ${REQUIRED_BRANCH} && git cherry-pick <sha>), then re-run this.\n`);
    process.exit(1);
  }

  if (!isWorkingTreeClean()) {
    console.error(`\nRefusing to run: "${REQUIRED_BRANCH}" has uncommitted changes.`);
    console.error('A production push must come from a clean, fully-committed tree - commit or discard first.\n');
    process.exit(1);
  }

  const extraArgs = process.argv.slice(2);
  const hasRolloutFlag = extraArgs.some((arg) => arg.startsWith('--rollout-percentage'));
  const rolloutArgs = hasRolloutFlag ? [] : ['--rollout-percentage', DEFAULT_ROLLOUT_PERCENTAGE];
  const hasEnvironmentFlag = extraArgs.some((arg) => arg.startsWith('--environment'));
  // Without this, app.config.js resolves APP_VARIANT from whatever's in the
  // local .env instead of EAS's "production" environment variable - which
  // would ship extra.appVariant wrong (e.g. "development") on a real
  // production update, silently breaking the isTestAccount signal for real
  // users. Not overridable via extraArgs the way rollout-percentage is -
  // there's no legitimate reason this script should ever target anything
  // other than the production environment.
  const environmentArgs = hasEnvironmentFlag ? [] : ['--environment', 'production'];
  const easArgs = ['update', '--channel', 'production', ...rolloutArgs, ...environmentArgs, ...extraArgs];
  // This system has no bare `eas` on PATH - only `npx eas-cli@latest` resolves.
  // Pinned to @latest (not a bare `npx eas`) so npx doesn't silently fall
  // back to whatever older eas-cli happens to be cached locally.
  const easCommand = 'npx';
  const easCommandArgs = ['eas-cli@latest', ...easArgs];

  console.log('');
  console.log('##########################################################');
  console.log('#  YOU ARE ABOUT TO PUSH AN EAS UPDATE TO PRODUCTION.   #');
  console.log('#  Real users on the production channel will receive it.  #');
  console.log('##########################################################');
  console.log('');
  console.log(`About to run: ${easCommand} ${easCommandArgs.join(' ')}`);
  console.log('');

  const answer = await ask(`Type ${CONFIRM_WORD} to continue, anything else to abort: `);

  if (answer.trim() !== CONFIRM_WORD) {
    console.log('\nAborted. Nothing was run.');
    process.exit(1);
  }

  console.log(`\nConfirmed. Running: ${easCommand} ${easCommandArgs.join(' ')}\n`);

  const result = spawnSync(easCommand, easCommandArgs, { stdio: 'inherit', shell: true });
  process.exit(result.status === null ? 1 : result.status);
}

main();
