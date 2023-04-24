import type { CommandModule } from 'yargs';
import { intro, outro } from '@clack/prompts';
import colors from 'picocolors';
import { cliFetchSchema, cliGetSettings } from './shared-cli.js';

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
  const settings = await cliGetSettings();
  await cliFetchSchema(settings);
  outro(colors.bold('Done.'));
};
