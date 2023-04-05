
import { intro, log, outro, spinner } from '@clack/prompts';
import _ from 'lodash';
import colors from 'picocolors';
import { generate } from './generate.js';
import { fetchSchema } from './shared/fetch-schema.js';
import type { CommandId } from './shared/types.js';
import { cancelAndExit, getServerlessConnection } from './shared/utils.js';
import { migrate } from './migrate.js';
import { writeCurrentSchema } from './shared/write-schema.js';
import { COMMANDS, VERSION } from './shared/constants.js'
import { showHelp } from './shared/show-help.js';
import { initializeSettings } from './shared/settings.js';





const showHeader = () => {
  console.log(`${colors.bold('frieda')} 🐕 ${colors.gray(`v${VERSION}`)} `);
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
    // const vars = await getVariables();
    // const connection = getServerlessConnection(vars.databaseUrl);
    // const fetchSchemaSpinner = spinner();
    // fetchSchemaSpinner.start('Fetching database schema...')
    // const rawSchema = await fetchSchema(connection);
    // fetchSchemaSpinner.stop('Database schema fetched.')
    // await writeCurrentSchema(rawSchema, vars);
    switch (commandId) {
      case 'init':
        await initializeSettings();
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
    const logError = error instanceof Error ? error.message : 'An unknown error occurred.';
    log.error(logError);
    cancelAndExit();
  }
  
  outro(colors.bold('Done'))
};


