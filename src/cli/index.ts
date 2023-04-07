import { log } from '@clack/prompts';
import colors from 'picocolors';
import { cancelAndExit } from './shared/utils.js';
import { getCommand, showHelp, getOptionFlag } from './shared/commands.js';
import { cmdFetch } from './cmd-fetch.js';
const showHeader = (version: string) => {
  console.log(
    `${colors.bold('frieda')} 🐕 ${ colors.dim(`v${version}`) }`
  );
  console.log();
};

export const main = async (version: string) => {
  const args = process.argv.slice(2);
  const command = getCommand(args);
  showHeader(version);
  if (!command) {
    if (!getOptionFlag(args, 'version', 'v')) {
      showHelp();
    }
    return;
  }
  

  try {
    switch (command.id) {
      case 'migrate':
        // await migrate(rawSchema, vars, connection);
        break;
      case 'fetch':
        await cmdFetch();
        break;
      case 'generate':
        // await generate(rawSchema, vars);
        break;
    }
  } catch (error) {
    const logError =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    log.error(logError);
    cancelAndExit();
  }
};
