import { fetchDatabaseSchema } from './fetch-schema.js';
import { readSettings, logSettingsErrors } from './settings.js';
import {  log } from '@clack/prompts';
import {
  cancelAndExit,
  fmtPath,
  getServerlessConnection,
  wait
} from './utils.js';
import { writeCurrentSchema } from './write-schema.js';
import colors from 'picocolors';
import { parseModelDefinition } from './parse.js';

export const cmdMigrate = async () => {
 
  let s = wait('Reading settings');
  const {settings, errors} = await readSettings();
  if (errors.length > 0) {
    s.error()
    logSettingsErrors(errors)
    return cancelAndExit();
  }
  s.done();
  s = wait('Fetching schema');
  const schema = await fetchDatabaseSchema(
    getServerlessConnection(settings.databaseUrl)
  );
  const parsedModels = schema.tables.map((t) =>
    parseModelDefinition(t, settings)
  );
  const schemaFiles = await writeCurrentSchema(schema, parsedModels, settings);
  s.done();
  log.success([...schemaFiles.map((s) => `- ${fmtPath(s)}`)].join('\n'));

  
};