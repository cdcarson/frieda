import { log } from '@clack/prompts';
import colors from 'picocolors';
import { cancelAndExit } from './shared/utils.js';
import { getCommand, showHelp, getOptionFlag } from './shared/commands.js';
import { cmdFetch } from './cmd-fetch.js';
const showHeader = () => {
  const version = 0
  console.log(
    `${colors.bold('frieda')} 🐕 ${colors.gray(`v${version}`)} `
  );
  console.log();
};

export const main = async () => {
  showHeader();
  const args = process.argv.slice(2)
  const command = getCommand(args);
  if (! command) {
    if (getOptionFlag(args, 'version', 'v')) {
      return log.message('Version 1.0')
    }
    return showHelp();
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
