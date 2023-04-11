import { log, intro, outro } from '@clack/prompts';
import { generate } from './shared/generate.js';

import {
  formatFilePath,
  getServerlessConnection,
} from './shared/utils.js';
import colors from 'picocolors';
import { COMMANDS } from './shared/commands.js';
import { getSettings } from './shared/settings.js';
import { fetchSchema, writeSchema } from './shared/schema.js';

export const cmdGenerate = async () => {
  const cmd = COMMANDS.generate;
  intro(`${colors.bold(cmd.id)}${colors.dim(`: ${cmd.description}`)}`);

  const settings = await getSettings();
  const schema = await fetchSchema(
    getServerlessConnection(settings.databaseUrl)
  );
  await writeSchema(schema, settings.currentSchemaFullPath);
  log.message(`Schema saved to ${formatFilePath(settings.currentSchemaFullPath)}.`);
  await generate(schema, settings)
  outro(colors.bold('Done.'));
};


