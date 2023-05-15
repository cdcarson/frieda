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
  typeBigIntAsString: `Whether to type ${fmtVal(
    'bigint'
  )} columns as javascript  ${fmtVal('string')}. Default: ${fmtVal('true')}.`,
  typeTinyIntOneAsBoolean: `
    Whether to type ${fmtVal('tinyint(1)')} columns as javascript ${fmtVal(
    'boolean'
  )}. Default: ${fmtVal('true')}.`,
  typeImports: `An array of import statements corresponding 
    to the types in ${colors.red('@json(MyType)')},
    ${colors.red('@enum(MyType)')}
    and ${colors.red('@set(MyType)')} annotations.
  `
};

export const COMMAND_DESCRIPTIONS = {
  generate: 'Generate code.',
  explain: `Explain model/field types and other information about the parsed schema.`,
  init: `(Re-)initialize options in ${fmtPath(FRIEDA_RC_FILE_NAME)}.`
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
    name: 'explain',
    alias: 'e',
    description: COMMAND_DESCRIPTIONS.explain,
    usage: '[model] [otherOptions]',
    positionalOptions: [
      {
        name: 'model',
        description: `Optional. The name of a model or database table.`,
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
  }
] as const;
