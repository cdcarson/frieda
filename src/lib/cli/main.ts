import colors from 'kleur';
import yargs from 'yargs';
import { cmdGenerate } from './cmd-generate.js';
import { cmdInit } from './cmd-init.js';
import { cmdModel } from './cmd-model.js';
import { COMMAND_DESCRIPTIONS, OPTION_DESCRIPTIONS } from './constants.js';
import type { CliArgs } from './types.js';
import { cmdField } from './cmd-field.js';
import { FRIEDA_VERSION } from '$lib/version.js';
export const main = async (argv: string[]) => {
  let commandName: 'init' | 'generate' | 'model' | 'field' | 'type' | undefined;
  
  const cmds = yargs(argv)
    .scriptName('frieda')
    .help()
    .version(false)

    .command({
      command: 'generate',
      describe: COMMAND_DESCRIPTIONS.generate,
      aliases: ['g'],
      handler: () => {
        commandName = 'generate';
      },
      builder: (b) => {
        return b.options({
          envFile: {
            alias: 'e',
            type: 'string',
            description: OPTION_DESCRIPTIONS.envFile
          },
          outputDirectory: {
            alias: 'o',
            type: 'string',
            description: OPTION_DESCRIPTIONS.outputDirectory
          },
          compileJs: {
            alias: 'j',
            type: 'boolean',
            description: OPTION_DESCRIPTIONS.compileJs
          },
          typeBigIntAsString: {
            type: 'boolean',
            description: OPTION_DESCRIPTIONS.typeBigIntAsString
          },
          typeTinyIntOneAsBoolean: {
            type: 'boolean',
            description: OPTION_DESCRIPTIONS.typeTinyIntOneAsBoolean
          }
        });
      }
    })
    .command({
      command: 'model [modelName]',
      describe: COMMAND_DESCRIPTIONS.model,
      aliases: ['m'],
      handler: () => {
        commandName = 'model';
      },
      builder: (b) => {
        return b
          .positional('modelName', {
            type: 'string',
            description: 'The partial name of the model or underlying table.'
          })
          .options({
            envFile: {
              alias: 'e',
              type: 'string',
              description: OPTION_DESCRIPTIONS.envFile
            },
            outputDirectory: {
              alias: 'o',
              type: 'string',
              description: OPTION_DESCRIPTIONS.outputDirectory
            },
            compileJs: {
              alias: 'j',
              type: 'boolean',
              description: OPTION_DESCRIPTIONS.compileJs
            },
            typeBigIntAsString: {
              type: 'boolean',
              description: OPTION_DESCRIPTIONS.typeBigIntAsString
            },
            typeTinyIntOneAsBoolean: {
              type: 'boolean',
              description: OPTION_DESCRIPTIONS.typeTinyIntOneAsBoolean
            }
          });
      }
    })
    .command({
      command: 'field [modelName] [fieldName]',
      describe: COMMAND_DESCRIPTIONS.field,
      aliases: ['f'],
      handler: () => {
        commandName = 'field';
      },
      builder: (b) => {
        return b
          .positional('modelName', {
            type: 'string',
            description: 'The partial name of the model or underlying table.'
          })
          .positional('fieldName', {
            type: 'string',
            description: 'The partial name of the field or underlying column.'
          })
          .options({
            envFile: {
              alias: 'e',
              type: 'string',
              description: OPTION_DESCRIPTIONS.envFile
            },
            outputDirectory: {
              alias: 'o',
              type: 'string',
              description: OPTION_DESCRIPTIONS.outputDirectory
            },
            compileJs: {
              alias: 'j',
              type: 'boolean',
              description: OPTION_DESCRIPTIONS.compileJs
            },
            typeBigIntAsString: {
              type: 'boolean',
              description: OPTION_DESCRIPTIONS.typeBigIntAsString
            },
            typeTinyIntOneAsBoolean: {
              type: 'boolean',
              description: OPTION_DESCRIPTIONS.typeTinyIntOneAsBoolean
            }
          });
      }
    })
    .command({
      command: 'init',
      aliases: ['i'],
      describe: COMMAND_DESCRIPTIONS.init,
      handler: () => {
        commandName = 'init';
      }
    });
  cmds.wrap(cmds.terminalWidth());

  const cliArgs = await cmds.parse();

  console.log(colors.bold('frieda'), colors.dim(`v${FRIEDA_VERSION}`), '🦮');

  if (!commandName) {
    cmds.showHelp();
  }
  switch (commandName) {
    case 'generate':
      await cmdGenerate(cliArgs as Partial<CliArgs>);
      break;
    case 'model':
      await cmdModel(cliArgs as Partial<CliArgs>);
      break;
    case 'field':
      await cmdField(cliArgs as Partial<CliArgs>);
      break;
    case 'init':
      await cmdInit(cliArgs as Partial<CliArgs>);
      break;
  }

  console.log(colors.bold('done'), '🦮');
  console.log();
};
