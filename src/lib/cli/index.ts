import colors from 'picocolors';
import { FRIEDA_VERSION } from '../version.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initCommandModule } from './cmd-init.js';
import { generateCommandModule } from './cmd-generate.js';
import { migrateCommandModule } from './cmd-migrate.js';
import { CancelledByUserError } from './errors.js';
import { cancel, log } from '@clack/prompts';
//import { showCommandModule } from './cmd-show.js';

export const main = async () => {
  console.log(
    `${colors.bold('Frieda')} 🦮 ${colors.dim(`v${FRIEDA_VERSION}`)}\n`
  );

  const commands = yargs(hideBin(process.argv))
    .scriptName('frieda')
    .usage('frieda <command> [options]')
    .help(false)
    .version(false)
    .command(generateCommandModule)
    .command(migrateCommandModule)
    .command(initCommandModule);

  // try {
  //   await commands.parseAsync();
  // } catch (error) {
  //   if (error instanceof CancelledByUserError) {
  //     log.message()
  //     cancel('Operation cancelled.');
  //     process.exit(0);
  //   }
  //   throw error
  // }
  

  // const options = parseArgs(process.argv.slice(2))
  // if (options.help) {
  //   return showHelp()
  // }
  // const settings = getSettings(options)
};

