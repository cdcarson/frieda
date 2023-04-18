import { cmdFetch } from './cmd-fetch.js';
import { cmdGenerate } from './cmd-generate.js';
import { cmdInit } from './cmd-init.js';
import { cmdMigrate } from './cmd-migrate.js';
import { intro, outro } from '@clack/prompts';
import colors from 'picocolors'
import { FRIEDA_VERSION } from '$lib/version.js';
import { wait } from './utils.js';
import { readSettings, logSettingsErrors } from './settings.js';

type CliCommand = {
  name: string;
  description: string;
  alias?: string;
};

export const cliCommands: CliCommand[] = [
  {
    name: 'fetch',
    description: 'Fetch the current database schema',
    alias: 'f'
  },
  {
    name: 'generate',
    description: 'Generate code',
    alias: 'g'
  },
  {
    name: 'migrate',
    description: 'Execute the current migration',
    alias: 'm'
  },
  {
    name: 'init',
    description: '(Re)initialize Frieda settings',
    alias: 'i'
  }
];




export const matchCommand = (args: string[]): CliCommand|null => {
  const name = args[0] 
  for (const command of cliCommands) {
    if (
      name === command.name ||
      (typeof command.alias == 'string' && name === command.alias)
    ) {
      return command;
    }
  }
  return null;
};

export const main = async (
  args: string[]
) => {
  intro(`${colors.bold('frieda')} 🐕 ${colors.dim(`v${FRIEDA_VERSION}`)}`)
  let s = wait('Reading settings');
  const {settings, errors} = await readSettings();
  if (errors.length > 0) {
    s.error();
    logSettingsErrors(errors)
  }

  outro(colors.bold('frieda is done'))
};


const showHelp = () => {
  console.log('show the help here')
}