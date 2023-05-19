import type { CliOption } from './types.js';
import colors from 'kleur';
import { fmtPath, fmtVal, fmtVarName } from './ui/formatters.js';
export const FRIEDA_RC_FILE_NAME = '.friedarc.json';
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;

export const OPTION_DESCRIPTIONS = {
  envFile: `The path to an environment variables file containing either ${ENV_DB_URL_KEYS.map(
    (s) => fmtVarName(s)
  ).join(' or ')}. Valid URL format: ${colors.cyan(
    'mysql://<user>:<password>@<host>'
  )}.`,
  outputDirectory: `The relative path to a directory where generated code will be placed.This should be a dedicated directory, separate from your own code or other assets.`,
  compileJs: `Whether to compile and output javascript code rather than typescript files. Default: ${fmtVal(
    'false'
  )}.`,

  typeImports: `An array of import statements corresponding 
    to the types in ${colors.red('@json(MyType)')},
    ${colors.red('@enum(MyType)')}
    and ${colors.red('@set(MyType)')} annotations.
  `
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
    description: 'Generate code.',
    usage: '[options]'
  },
  {
    name: 'model',
    alias: 'm',
    description: 'Show information about a model',
    usage: '[modelName] [otherOptions]',
    positionalOptions: [
      {
        name: 'modelName',
        description: `Optional. The name of a model or database table.`,
        isRc: false,
        type: 'string'
      }
    ]
  },

  {
    name: 'init',
    alias: 'i',
    description: `(Re-)initialize options in ${fmtPath(FRIEDA_RC_FILE_NAME)}.`,
    usage: '[options]'
  }
] as const;
