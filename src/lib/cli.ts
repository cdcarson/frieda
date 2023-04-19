#! /usr/bin/env node
import { main } from './cli/index.js';
import { Command } from 'commander';

import { FRIEDA_VERSION } from './version.js';

const program = new Command();
program.name('frieda').version(FRIEDA_VERSION);

program
  .command('migrate')
  .description(
    'run a migration'
  )
  .argument('[source]', 'the path to the migration file')
  .option('-p, --prompt', 'prompt before execute')
  

const result = program.parse();
console.dir(result, {depth: null})

// try {
//   await main( process.argv.slice(2));
// } catch (error) {
//   console.log(error);
//   process.exit(1);
// }

export default {};
