import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { intro, outro } from '@clack/prompts';
import colors from 'picocolors';
import { getSettings } from './settings.js';
import { fetchSchema } from './schema.js';
import { CURRENT_SCHEMA_JSON_FILE_NAME } from './constants.js';

export const showCommandModule: CommandModule = {
  command: 'show [schemaPath] [options]',
  handler: async (args) => {
    await cmd(args);
  },
  aliases: ['s'],
  describe: 'Show info for a model or field.',
  builder: (b) => {
    return b
      .positional('schemaPath', {
        description: 'Optional hint to filter what you want to show',
        type: 'string'
      })
      .option({
        'skip-fetch': {
          alias: 's',
          boolean: true,
          description: `Skip fetching the schema from the database. Use ${CURRENT_SCHEMA_JSON_FILE_NAME} instead.`
        }
      });
  }
};

const cmd = async (args: ArgumentsCamelCase) => {
  intro(colors.bold(`Show`));
  const settings = await getSettings();
  console.log(args);
  outro(colors.bold('Done.'));
};
