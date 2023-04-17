import { fetchDatabaseSchema } from './fetch-schema.js';
import type { ParseCommandResult } from './commands.js';
import { getSettings } from './settings.js';
import { intro, outro, log } from '@clack/prompts'
import { cancelAndExit, fmtPath, formatFilePath, getServerlessConnection, wait } from './utils.js';
import { writeCurrentSchema } from './write-schema.js';
import colors from 'picocolors'
import { parseModelDefinition } from './parse.js';

export const cmdFetch = async (commandResult: ParseCommandResult) => {
  intro(`${colors.bold(`fetch`)} ${colors.dim('Fetch the current database schema')}`)
  let s = wait('Reading settings')
  const [settings, errors] = await getSettings();
  if (errors.length > 0) {
    s.error();
    log.error([
      colors.red('Invalid settings:'),
      ...errors
    ].join('\n'))
    cancelAndExit();
  }
  s.done();
  s = wait('Fetching schema')
  const schema = await fetchDatabaseSchema(getServerlessConnection(settings.databaseUrl));
  const parsedModels = schema.tables.map(t => parseModelDefinition(t, settings));
  const schemaFiles = await writeCurrentSchema(schema, parsedModels, settings);
  s.done()
  log.success([
    ...schemaFiles.map(s => `- ${fmtPath(s)}`)
  ].join('\n'));

  outro(colors.bold('Done'))
};
