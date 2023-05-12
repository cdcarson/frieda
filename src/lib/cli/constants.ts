import type { CliCommand, CliOption } from './types.js';
import { fmtVarName } from './ui/formatters.js';

export const FRIEDA_RC_FILE_NAME = '.friedarc.json';
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;

export const GENERATED_CODE_FILENAMES = {
  types: 'types.ts',
  schema: 'schema.ts',
  database: 'database.ts'
} as const;

export const OPTION_DESCRIPTIONS = {
  envFile: `The path to an environment variables file containing either ${ENV_DB_URL_KEYS.join(
    ' or '
  )}. Valid URL format: mysql://<user>:<password>@<host>.`,
  outputDirectory: `The relative path to a directory where generated code will be placed.This should be a dedicated directory, separate from your own code or other assets.`,
  compileJs: `Whether to compile and output javascript code rather than typescript files. Default: false.`,
  typeBigIntAsString: `Whether to type bigint columns as javascript string. Default: true.`,
  typeTinyIntOneAsBoolean: `Whether to type tinyint(1) columns as javascript boolean. Default: true.`
};

export const COMMAND_DESCRIPTIONS = {
  generate: 'Generate code.',
  type: `Show type details and other information about models and fields.`,
  model: `Show type details and other information about a model.`,
  field: `Show type details for a model field.`,
  init: `(Re-)initialize options in ${FRIEDA_RC_FILE_NAME}.`
};

export const CLI_OPTIONS: CliOption[] = [
  {
    name: 'envFile',
    type: 'string',
    alias: 'e',
    description: OPTION_DESCRIPTIONS.envFile,
    isRc: true
  },
  {
    name: 'outputDirectory',
    type: 'string',
    alias: 'o',
    description: OPTION_DESCRIPTIONS.outputDirectory,
    isRc: true
  },
  {
    name: 'compileJs',
    type: 'boolean',
    alias: 'j',
    description: OPTION_DESCRIPTIONS.compileJs,
    isRc: true
  },
  {
    name: 'typeBigIntAsString',
    type: 'boolean',
    description: OPTION_DESCRIPTIONS.typeBigIntAsString,
    isRc: true
  },
  {
    name: 'typeTinyIntOneAsBoolean',
    type: 'boolean',
    description: OPTION_DESCRIPTIONS.typeTinyIntOneAsBoolean,
    isRc: true
  },
  {
    name: 'help',
    type: 'boolean',
    alias: 'h',
    description: 'Show this help.',
    isRc: false
  }
];

export const CLI_COMMANDS = [
  {
    name: 'generate',
    alias: 'g',
    description: COMMAND_DESCRIPTIONS.generate,
    usage: '[options]'
  },
  {
    name: 'type',
    alias: 't',
    description: COMMAND_DESCRIPTIONS.type,
    usage: '[model] [field] [otherOptions]',
    positionalOptions: [
      {
        name: 'model',
        description: `Optional. The name of the model or underlying table.`,
        isRc: false,
        type: 'string'
      },
      {
        name: 'field',
        description: `Optional. The name of the field or underlying column.`,
        isRc: false,
        type: 'string'
      }
    ]
  },
  {
    name: 'init',
    alias: 'i',
    description: COMMAND_DESCRIPTIONS.init,
    usage: '[options]'
  },

] as const;
