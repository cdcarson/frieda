import { intro, log } from '@clack/prompts';
import _ from 'lodash';
import colors from 'picocolors';
import type { CommandId } from './shared/types.js';
import { cancelAndExit, getServerlessConnection } from './shared/utils.js';
import { COMMANDS, VERSION } from './shared/constants.js';
import { showHelp } from './shared/show-help.js';
import pkgJson from '../../package.json'

const showHeader = () => {
  console.log(`${colors.bold('frieda')} 🐕 ${colors.gray(`v${pkgJson.version}`)} `);
  console.log();
};
const getCommandId = (arg: string | number | undefined): CommandId => {
  if (!arg) {
    return 'help';
  }
  for (const c of COMMANDS) {
    if (c.id === arg || c.id[0] === arg) {
      return c.id;
    }
  }
  return 'help';
};
export const main = async () => {
  showHeader();
  const commandId = getCommandId(process.argv[2]);
  if (commandId === 'help') {
    return showHelp();
  }
  intro(colors.bold(_.upperFirst(commandId)));

  try {
    
    switch (commandId) {
      case 'init':
        // await initSettings();
        break;
      case 'migrate':
        // await migrate(rawSchema, vars, connection);
        break;
      case 'fetch':
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
