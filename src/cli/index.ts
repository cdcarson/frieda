import { log } from '@clack/prompts';
import colors from 'picocolors';
import { cancelAndExit } from './shared/utils.js';
import { getCommand, showHelp, getOptionFlag } from './shared/commands.js';
import { cmdFetch } from './cmd-fetch.js';
import { cmdGenerate } from './cmd-generate.js';
import { cmdMigrate } from './cmd-migrate.js';
import { cmdShow } from './cmd-show.js';
const showHeader = (version: string) => {
  console.log(`${colors.bold('frieda')} 🐕 ${colors.dim(`v${version}`)}`);
  console.log();
};

export const main = async (version: string) => {
  const args = process.argv.slice(2);
  const {command, restArgs} = getCommand(args);
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
        await cmdMigrate();
        break;
      case 'fetch':
        await cmdFetch();
        break;
      case 'generate':
        await cmdGenerate();
        break;
      case 'show':
        await cmdShow(restArgs);
        break;
    }
  } catch (error) {
    const logError =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    log.error(logError);
    cancelAndExit();
  }
};
