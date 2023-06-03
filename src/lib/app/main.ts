import yargs, { type CommandModule, type Argv } from 'yargs';
import { BUILD_OPTION_DESCRIPTIONS, FRIEDA_RC_FILE_NAME } from './constants.js';
import { fmtPath, getStdOutCols, squishWords } from './utils.js';
import kleur from 'kleur';
import { FRIEDA_VERSION } from '$lib/version.js';
import type { CliCommand, CliOptions } from './types.js';
import { Cli } from './cli.js';

export const addBuildOptions = (b: Argv): Argv => {
  return b
    .options({
      'env-file': {
        alias: 'e',
        description: squishWords(
          BUILD_OPTION_DESCRIPTIONS.envFile,
          getStdOutCols() - 30
        ),
        type: 'string'
      },
      'output-directory': {
        alias: 'o',
        description: squishWords(
          BUILD_OPTION_DESCRIPTIONS.outputDirectory,
          getStdOutCols() - 30
        ),
        type: 'string'
      },
      'schema-directory': {
        alias: 's',
        description: squishWords(
          BUILD_OPTION_DESCRIPTIONS.schemaDirectory,
          getStdOutCols() - 30
        ),
        type: 'string'
      },
      'compile-js': {
        alias: 'j',
        description: squishWords(
          BUILD_OPTION_DESCRIPTIONS.compileJs,
          getStdOutCols() - 30
        ),
        type: 'boolean'
      }
    })
    .group(
      ['env-file', 'output-directory', 'schema-directory', 'compile-js'],
      'Build Options:'
    );
};

export const main = async (cwd: string, argv: string[]) => {
  let command: CliCommand | undefined;
  const commandGenerate: CommandModule = {
    command: ['generate [options]', 'g [options]'],
    describe: `Generate code`,
    handler: () => {
      command = 'generate';
    },
    builder: (b) => {
      return addBuildOptions(b);
    }
  };

  const commandSchema: CommandModule = {
    command: ['schema [options]', 's [options]'],
    describe: `Show/modify the schema`,
    handler: () => {
      command = 'schema';
    },
    builder: (b) => {
      return addBuildOptions(
        b.options({
          model: {
            alias: 'm',
            description: squishWords(
              `Optional. The name of the model you want to show or modify.`,
              getStdOutCols() - 30
            ),
            type: 'string'
          },
          field: {
            alias: 'f',
            description: squishWords(
              `Optional. The name of the field you want to show or modify.`,
              getStdOutCols() - 30
            ),
            type: 'string'
          }
        }).group(['model', 'field'], 'Schema Command Options:')
      );
    }
  };

  const commandExplore: CommandModule = {
    command: ['explore [options]', 'e [options]'],
    describe: `View/modify the schema in a browser`,
    handler: () => {
      command = 'explore';
    },
    builder: (b) => {
      return addBuildOptions(
        b
      );
    }
  };

  const app = yargs(argv, cwd)
    .scriptName('frieda')
    .wrap(null)
    .version(false)
    .help(false)
    .usage('$0 <command> [options]')
    .command(commandGenerate)
    .command(commandSchema)
    .command(commandExplore)
    .options({
      init: {
        alias: 'i',
        description: `(Re)initialize options and save to ${fmtPath(
          FRIEDA_RC_FILE_NAME
        )}.`
      },
      'skip-fetch': {
        alias: 'k',
        description: squishWords( `Skip fetching the schema from the databse. Use ${fmtPath(
          'fetched-schema.json'
        )} instead. Only works if the schema has been previously fetched.`,  getStdOutCols() - 30)
      },
      help: {
        alias: 'h',
        description: 'Show this help.'
      }
    });
  const opts = app.parseSync();
  console.log(kleur.bold('frieda'), kleur.dim(`v${FRIEDA_VERSION}`), '🦮');
  console.log();
  if (opts.help || !command) {
    app.showHelp();
    console.log();
    return;
  }
  const cli = new Cli(cwd, command, opts as CliOptions);
  await cli.execute();
};
