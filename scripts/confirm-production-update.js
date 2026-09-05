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

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const extraArgs = process.argv.slice(2);
  const hasRolloutFlag = extraArgs.some((arg) => arg.startsWith('--rollout-percentage'));
  const rolloutArgs = hasRolloutFlag ? [] : ['--rollout-percentage', DEFAULT_ROLLOUT_PERCENTAGE];
  const easArgs = ['update', '--channel', 'production', ...rolloutArgs, ...extraArgs];

  console.log('');
  console.log('##########################################################');
  console.log('#  YOU ARE ABOUT TO PUSH AN EAS UPDATE TO PRODUCTION.   #');
  console.log('#  Real users on the production channel will receive it.  #');
  console.log('##########################################################');
  console.log('');
  console.log(`About to run: eas ${easArgs.join(' ')}`);
  console.log('');

  const answer = await ask(`Type ${CONFIRM_WORD} to continue, anything else to abort: `);

  if (answer.trim() !== CONFIRM_WORD) {
    console.log('\nAborted. Nothing was run.');
    process.exit(1);
  }

  console.log(`\nConfirmed. Running: eas ${easArgs.join(' ')}\n`);

  const result = spawnSync('eas', easArgs, { stdio: 'inherit', shell: true });
  process.exit(result.status === null ? 1 : result.status);
}

main();
