import { intro, outro } from '@clack/prompts';
import colors from 'picocolors'
import { FRIEDA_VERSION } from '$lib/version.js';
import { wait } from './utils.js';
import { getSettings } from './settings.js';
import inquirer from 'inquirer';


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
  // intro(`${colors.bold('frieda')} 🐕 ${colors.dim(`v${FRIEDA_VERSION}`)}`)
  // const settings = await getSettings();
  // outro(colors.bold('frieda is done'))
  const questions = [
    {
      type: 'editor',
      name: 'bio',
      message: 'Please write a short bio of at least 3 lines.',
      validate(text: string) {
        // if (text.split('\n').length < 3) {
        //   return 'Must be at least 3 lines.';
        // }
  
        return true;
      },
      waitUserInput: true,
    },
  ];
  const foo = await inquirer.prompt(questions);
  console.dir(foo, {depth: null})
};


const showHelp = () => {
  console.log('show the help here')
}