
import { intro, log, outro, spinner } from '@clack/prompts';
import _ from 'lodash';
import colors from 'picocolors';
import { generate } from './generate.js';
import { fetchSchema } from './shared/fetch-schema.js';
import { gatherVariables } from './shared/gather-variables.js';
import { getModelSchemas } from './shared/get-model-schemas.js';
import type { Command, CommandId, RawSchema } from './shared/types.js';
import { getServerlessConnection } from './shared/utils.js';
import { migrate } from './migrate.js';
const version = '0.0.4';

export const commands: Command[] = [
  {
    id: 'migrate',
    description: 'Run the current migration.'
  },
  {
    id: 'introspect',
    description: 'Create an introspection.sql file containing the current database schema.'
  },
  {
    id: 'generate',
    description: 'Generate javascript models and other code from the current database schema.'
  },
  {
    id: 'help',
    description: 'Show this help.'
  }
];

const showHelp = () => {
  console.log(colors.dim('Usage: frieda <command>'));
  console.log(colors.dim('Commands:'));
  const colSize = Math.max(...commands.map((c) => c.id.length));
  commands.forEach((c) => {
    const addedSpaces = ' '.repeat(colSize - c.id.length);
    console.log(
      `   ${colors.cyan(c.id[0])} ${colors.dim('|')} ${colors.cyan(
        c.id
      )}   ${addedSpaces}${colors.gray(c.description)}`
    );
  });
  console.log();
};

const showHeader = () => {
  console.log(`${colors.bold('frieda')} 🐕 ${colors.gray(`v${version}`)} `);
};
const getCommandId = (arg: string | number | undefined): CommandId => {
  if (!arg) {
    return 'help';
  }
  for (const c of commands) {
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
    const vars = await gatherVariables();
    const connection = getServerlessConnection(vars.databaseUrl);
    const fetchSchemaSpinner = spinner();
    fetchSchemaSpinner.start('Fetching database schema...')
    const rawSchema = await fetchSchema(connection);
    const modelSchemas = getModelSchemas(rawSchema.tables);
    fetchSchemaSpinner.stop('Database schema fetched.')
    switch (commandId) {
    
      case 'migrate':
        await migrate(rawSchema, vars, connection);
        break;
      case 'introspect':
        break;
      case 'generate': 
        await generate(rawSchema, modelSchemas, vars);
        break;
    }
  } catch (error) {
    const logError = error instanceof Error ? error.message : 'An unknown error occurred.';
    log.error(logError)
  }
  

  
  outro(colors.bold('Done'))
};


