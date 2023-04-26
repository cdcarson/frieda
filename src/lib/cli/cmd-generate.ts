import type { CommandModule } from 'yargs';
import { intro, log, outro, confirm, isCancel } from '@clack/prompts';
import colors from 'picocolors';
import {  fmtPath, squishWords, wait } from './utils.js';
import { parseModelDefinition } from './parse.js';
import {
  CURRENT_SCHEMA_JSON_FILE_NAME
} from './constants.js';
import { getCode } from './get-code.js';
import type { DatabaseSchema } from '$lib/api/types.js';
import { cliFetchSchema, cliGenerateCode, cliGetSettings } from './cli.js';
import { writeGeneratedCode } from './file-system.js';

type Args = {
  skipFetch?: boolean;
};
export const generateCommandModule: CommandModule = {
  command: 'generate [options]',
  handler: async (args) => {
    await cmd(args as Args);
  },
  aliases: ['g'],
  describe: 'Generate model code.',
  builder: (b) => {
    return b.options({
      'skip-fetch': {
        alias: 's',
        boolean: true,
        description: `Skip fetching the schema from the database. Use ${CURRENT_SCHEMA_JSON_FILE_NAME} instead.`
      }
    });
  }
};

const cmd = async (args: Args) => {
  intro(colors.bold(`Generate model code`));
  const settings = await cliGetSettings();
  let schema: DatabaseSchema;
  schema = await cliFetchSchema(settings);
  const models = schema.tables.map((t) => parseModelDefinition(t, settings));
  await cliGenerateCode(models, settings)
  outro(colors.bold('Done.'));
};
