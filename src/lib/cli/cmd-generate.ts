import type { CommandModule,  } from 'yargs';
import {  } from '@clack/prompts';
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



export const generateCmd = async () => {
  const settings = await cliGetSettings();
  let schema: DatabaseSchema;
  schema = await cliFetchSchema(settings);
  const models = schema.tables.map((t) => parseModelDefinition(t, settings));
  await cliGenerateCode(models, settings)
};
