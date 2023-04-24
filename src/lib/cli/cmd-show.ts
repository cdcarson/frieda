import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { intro, log, outro } from '@clack/prompts';
import colors from 'picocolors';
import { CURRENT_SCHEMA_JSON_FILE_NAME } from './constants.js';
import { cliFetchSchema, cliGetSettings, cliReadSchemaJson, promptField, promptModel } from './shared-cli.js';
import { parseModelDefinition } from './parse.js';
import type { ModelDefinition } from '$lib/api/types.js';

type Args = {
  model: string;
  field: string;
  skipFetch?: boolean

}
export const showCommandModule: CommandModule = {
  command: 'show [schemaPath] [options]',
  handler: async (args) => {
    await cmd(args as  ArgumentsCamelCase<Args>);
  },
  aliases: ['s'],
  describe: 'Show info for a model or field.',
  builder: (b) => {
    return b
      
      .options({
        'model': {
          alias: 'm',
          type: 'string',
          description: 'The (partial) model name to search for.',
          default: ''
        },
        'field': {
          alias: 'f',
          type: 'string',
          description: 'The (partial) field name to search for.',
          default: ''
        },
        'skip-fetch': {
          alias: 's',
          boolean: true,
          description: `Skip fetching the schema from the database. Use ${CURRENT_SCHEMA_JSON_FILE_NAME} instead.`
        }
      });
  }
};

const cmd = async (args: ArgumentsCamelCase<Args>) => {
  intro(colors.bold(`Show`));
  
  const settings = await cliGetSettings();
  const schema = args.skipFetch === true ? await cliReadSchemaJson(settings) : await cliFetchSchema(settings);;
  const models = schema.tables.map(t => parseModelDefinition(t, settings));
  const model = await promptModel(models, args.model);
  
  if (args.field) {
    const field = await promptField(model, args.field)
  }
  log.info(model.modelName)
  outro(colors.bold('Done.'));
};


