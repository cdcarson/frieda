import colors from 'picocolors';
import { FRIEDA_VERSION } from '../version.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initCommandModule } from './cmd-init.js';
import { fetchCommandModule } from './cmd-fetch.js';
import { generateCommandModule } from './cmd-generate.js';
import { migrateCommandModule } from './cmd-migrate.js';
import { showCommandModule } from './cmd-show.js';

export const main = async () => {
  console.log(
    `${colors.bold('Frieda')} 🦮 ${colors.dim(`v${FRIEDA_VERSION}`)}\n`
  );

  const commands = yargs(hideBin(process.argv))
    .scriptName('frieda')
    .help()
    .version(false)
    .command(initCommandModule)
    .command(fetchCommandModule)
    .command(showCommandModule)
    .command(generateCommandModule)
    .command(migrateCommandModule);

  await commands.parseAsync();

  // const options = parseArgs(process.argv.slice(2))
  // if (options.help) {
  //   return showHelp()
  // }
  // const settings = getSettings(options)
};
