import { intro, log, outro, spinner } from '@clack/prompts';
import { COMMANDS } from './shared/commands.js';
import colors from 'picocolors';
import { getSettings } from './shared/settings.js';
import { fetchSchema } from './shared/fetch-schema.js';
import { formatFilePath, getServerlessConnection } from './shared/utils.js';
import { writeCurrentSchema } from './shared/write-schema.js';
export const cmdFetch = async () => {
  const cmd = COMMANDS['fetch']
  intro(`${colors.bold(cmd.id)}${colors.dim(`: ${cmd.description}`)}`);

  const settings = await getSettings();
  const fetchSpinner = spinner();
  fetchSpinner.start('Fetching schema...')
  const schema = await fetchSchema(getServerlessConnection(settings.databaseUrl));
  const fullPath = await writeCurrentSchema(schema, settings);
  fetchSpinner.stop('Fetching schema... done.')
  log.message(`Schema saved to ${formatFilePath(fullPath)}.`)
  outro(colors.bold('Done.'))
};
