import type { CommandModule } from 'yargs';
import { intro, outro } from '@clack/prompts';
import colors from 'picocolors';
import { getSettings } from './settings.js';
import { fetchSchema } from './schema.js';

export const fetchCommandModule: CommandModule = {
  command: 'fetch',
  handler: async () => {
    await cmd();
  },
  aliases: ['f'],
  describe: 'Fetch the current schema.'
};

const cmd = async () => {
  intro(colors.bold(`Fetch schema`));
  const settings = await getSettings();
  await fetchSchema(settings);
  outro(colors.bold('Done.'));
};
