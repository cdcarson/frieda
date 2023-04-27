import parser from 'yargs-parser';
import {
  cliFetchSchema,
  cliGetSettings,
  promptModel,
  cancelAndExit,
  cliPromptRunMigration
} from './cli.js';

import { isCancel, select, text, confirm, log } from '@clack/prompts';
import { DEFAULT_JSON_FIELD_TYPE } from './constants.js';
import { KNOWN_MYSQL_TYPES } from '$lib/api/constants.js';

export const cmdMigrate = async (rawArgs: string[]) => {
  const settings = await cliGetSettings();
  const { schema, models } = await cliFetchSchema(settings);
  const file = rawArgs[0];
  console.log(file)
};