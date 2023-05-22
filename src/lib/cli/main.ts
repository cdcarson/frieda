import { FRIEDA_VERSION } from '$lib/version.js';
import kleur from 'kleur';

import { getOptions } from './get-options.js';
import yargs, { type CommandModule } from 'yargs';
import { cliFetchSchema } from './cli-fetch-schema.js';
import { cliGenerateCode } from './cli-generate-code.js';
import { getStdOutCols, squishWords } from './ui/formatters.js';
import { prompt } from './ui/prompt.js';
import { OPTION_DESCRIPTIONS } from './constants.js';
import { exploreSchema } from './explore-schema.js';

export const main = async (argv: string[]) => {
  let command: string | undefined;
  const modelCommand: CommandModule = {
    command: 'model [modelName] [options]',
    describe: 'Modify or drop a model.',
    aliases: 'm',
    builder: (b) => {
      return b
        .positional('modelName', {
          type: 'string',
          describe: 'Optional. The model (or table) you want to modify'
        })
    
    },
    handler: () => {
      command = 'modify';
    }
  };

  const generateCommand: CommandModule = {
    command: 'generate [options]',
    describe: 'Generate code.',
    aliases: 'g',
    builder: (b) => b,
    handler: () => {
      command = 'generate';
    }
  };

  const helpWidth = getStdOutCols() - 30;
  const app = yargs(argv)
    .scriptName('frieda')
    .wrap(null)
    .version(false)
    .help(false)
    .command(generateCommand)
    .command(modifyCommand)
    .options({
      'env-file': {
        alias: 'e',
        type: 'string',
        description: squishWords(OPTION_DESCRIPTIONS.envFile, helpWidth)
      },
      'output-directory': {
        alias: 'o',
        type: 'string',
        description: squishWords(OPTION_DESCRIPTIONS.outputDirectory, helpWidth)
      },
      'schema-directory': {
        alias: 's',
        type: 'string',
        description: squishWords(OPTION_DESCRIPTIONS.schemaDirectory, helpWidth)
      },
      'compile-js': {
        alias: 'j',
        type: 'boolean',
        description: squishWords(OPTION_DESCRIPTIONS.compileJs, helpWidth)
      },
      init: {
        alias: 'i',
        type: 'boolean',
        description: squishWords(
          '(Re)initialize options in .friedarc.json.',
          helpWidth
        )
      },
      help: {
        alias: 'h',
        type: 'boolean',
        description: 'Show help.'
      }
    })
    .group(
      [
        'env-file',
        'output-directory',
        'schema-directory',
        'compile-js',
        'init',
        'help'
      ],
      'Options:'
    );
  const parsed = await app.parse();
  console.log(kleur.bold('frieda'), kleur.dim(`v${FRIEDA_VERSION}`), '🦮');
  console.log();
  if (parsed.help || command === undefined) {
    
    app.showHelp();
    
  } else {
    const optionsResult = await getOptions(parsed, parsed.init);
    const { options, connection } = optionsResult;
    let schema = await cliFetchSchema(connection);
    if (command === 'modify') {

    }
  }


  
};
