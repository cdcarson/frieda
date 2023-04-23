import type { CommandModule } from 'yargs';
import { intro, log, outro, confirm, isCancel } from '@clack/prompts';
import colors from 'picocolors';
import { getSettings } from './settings.js';
import { cancelAndExit, fmtPath, squishWords, wait } from './utils.js';
import { fetchSchema, readSchemaJson } from './schema.js';
import { parseModelDefinition } from './parse.js';
import {
  CURRENT_MODELS_JSON_FILE_NAME,
  CURRENT_SCHEMA_JSON_FILE_NAME
} from './constants.js';
import { generateCode } from './generate-code.js';
import type { DatabaseSchema } from '$lib/api/types.js';

type Args = {
  skipFetch?: boolean;
};
export const generateCommandModule: CommandModule = {
  command: 'generate',
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
  const settings = await getSettings();
  let schema: DatabaseSchema;
  if (args.skipFetch) {
    log.warn(
      squishWords(
        `Using existing ${fmtPath(
          CURRENT_SCHEMA_JSON_FILE_NAME
        )} to generate code (not fetching schema from the database.)`
      )
    );
    try {
      schema = await readSchemaJson(settings);
    } catch (error) {
      log.error((error as Error).message);
      const readFromDb = await confirm({
        message: 'Fetch schema from the database instead?',
        inactive: 'No, cancel'
      });
      if (isCancel(readFromDb) || readFromDb === false) {
        return cancelAndExit();
      }
      schema = await fetchSchema(settings);
    }
  } else {
    schema = await fetchSchema(settings);
  }
  const models = schema.tables.map((t) => parseModelDefinition(t, settings));
  const s = wait(`Generating code`);
  const codes = await generateCode(models, settings);
  s.done();
  log.success(
    ['Generated code:', ...codes.map((f) => ` - ${fmtPath(f)}`)].join('\n')
  );

  outro(colors.bold('Done.'));
};
