import { fetchDatabaseSchema } from './fetch-schema.js';
import { readSettings, logSettingsErrors } from './settings.js';
import { log } from '@clack/prompts';
import {
  cancelAndExit,
  fmtPath,
  getServerlessConnection,
  wait
} from './utils.js';
import { writeCurrentSchema } from './write-schema.js';
import colors from 'picocolors';
import { generateCode } from './generate-code.js';
import { parseModelDefinition } from './parse.js';

export const cmdGenerate = async () => {
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
  s = wait('Generating code');
  const files = await generateCode(parsedModels, settings);
  s.done();
  log.success([...files.map((f) => `- ${fmtPath(f)}`)].join('\n'));
};
