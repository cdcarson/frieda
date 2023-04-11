import { intro, log, outro, spinner } from '@clack/prompts';
import { COMMANDS } from './shared/commands.js';
import colors from 'picocolors';
import { getSettings } from './shared/settings.js';
import { formatFilePath, getServerlessConnection } from './shared/utils.js';
import { fetchSchema, writeSchema } from './shared/schema.js';
export const cmdFetch = async () => {
  const cmd = COMMANDS.fetch
  intro(`${colors.bold(cmd.id)}${colors.dim(`: ${cmd.description}`)}`);
  const settings = await getSettings();
  const schema = await fetchSchema(getServerlessConnection(settings.databaseUrl));
  await writeSchema(schema, settings.currentSchemaFullPath);
  log.success(`Schema saved to ${formatFilePath(settings.currentSchemaFullPath)}.`)
  outro(colors.bold('Done.'))
};
