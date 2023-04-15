import { fetchDatabaseSchema } from '$lib/db-fetch/fetch-schema.js';
import type { ParseCommandResult } from './commands.js';
import { getSettings } from './settings.js';
import { intro, outro, log, confirm, isCancel } from '@clack/prompts'
import { cancelAndExit, fmtPath, formatFilePath, getServerlessConnection, prettify, wait } from './utils.js';
import { writeCurrentSchema } from './write.js';
import colors from 'picocolors'
import { writeAll } from '$lib/generator/generator.js';
import { parseModelDefinition } from '$lib/parser/parser.js';
import {join} from 'path'
import fs from 'fs-extra';
export const cmdGenerate = async (commandResult: ParseCommandResult) => {
  intro(`${colors.bold(`generate`)} ${colors.dim('Generate code')}`)
  const settings = await getSettings();
  const goAhead = await confirm({
    message: `Code will be generated in ${fmtPath(settings.generatedCodeDirectory)}. Continue?`
  });
  if (isCancel(goAhead) || goAhead !== true) {
    return cancelAndExit();
  }

  const s = wait('Fetching schema')
  const schema = await fetchDatabaseSchema(getServerlessConnection(settings.databaseUrl));
  s.done();
  
  const written = await writeCurrentSchema(schema, settings);
  const logs = [
    colors.bold('Current schema fetched'),
    ...Object.keys(written).map(k => `${k}: ${formatFilePath(written[k])}`)
  ];
  log.success(logs.join('\n'));
  const parsedModels = schema.tables.map(t => parseModelDefinition(t, settings));
  await writeAll(parsedModels, settings);
  outro(colors.bold('Done'))
};
