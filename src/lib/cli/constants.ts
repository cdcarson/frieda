import { fmtVal, fmtVarName, fmtPath } from './utils/formatters.js';
import type { CliCommand, CliOption, Options } from './types.js';

export const FRIEDA_RC_FILE_NAME = '.friedarc.json';
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;

export const SCHEMA_SQL_FILE_NAME = 'schema.sql';
export const SCHEMA_JSON_FILE_NAME = 'schema.json';

export const DEFAULT_JSON_FIELD_TYPE = 'Object';

export const SCHEMA_CAST_CONST_NAME = 'schemaCast';

export const GENERATED_CODE_FILENAMES = {
  types: 'types.ts',
  schema: 'schema.ts',
  database: 'database.ts'
} as const;

export const HELP_OPTION: CliOption = {
  name: 'help',
  description: 'Show this help.',
  type: 'boolean',
  alias: 'h',
  isRcOption: false
};

export const RC_CLI_OPTIONS: { [K in keyof Options]: CliOption } = {
  envFile: {
    name: 'envFile',
    description: `
      The relative path to an environment variables file containing either 
      ${ENV_DB_URL_KEYS.map((k) => fmtVarName(k)).join(' or ')} as
      a valid database URL. Valid URL format: ${fmtVal(
        'mysql://<user>:<password>@<host>'
      )}..
    `,
    type: 'string',
    isRcOption: true
  },
  schemaDirectory: {
    name: 'schemaDirectory',
    description: `
    The relative path to a directory where ${fmtVal(SCHEMA_SQL_FILE_NAME)} 
    and ${fmtVal(SCHEMA_JSON_FILE_NAME)} will be placed.
    This should be a dedicated directory, separate from your own code or other assets.
  `,
    type: 'string',
    isRcOption: true
  },
  codeDirectory: {
    name: 'codeDirectory',
    description: `
      The relative path to a directory where generated code will be placed.
      This should be a dedicated directory, separate from your own code or other assets.
    `,
    type: 'string',
    isRcOption: true
  },
  outputJs: {
    name: 'outputJs',
    description: `
      Whether to compile and output javascript code rather 
      than typescript files. Default: ${fmtVal('false')}.
    `,
    type: 'boolean',
    isRcOption: true
  },
  typeBigIntAsString: {
    name: 'typeBigIntAsString',
    type: 'boolean',
    description: `
    Whether to type ${fmtVal('bigint')} columns as javascript ${fmtVal(
      'string'
    )}.
    Default: ${fmtVal(
      'true'
    )}. You can override this behavior for an individual column
    by adding the ${fmtVal(
      '@bigint'
    )} type annotation to the COMMENT. Pass ${fmtVal('false')} to disable 
    the behavior globally.
    `,
    isRcOption: true
  },
  typeTinyIntOneAsBoolean: {
    name: 'typeTinyIntOneAsBoolean',
    type: 'boolean',
    description: `
      Whether to type ${fmtVal('tinyint(1)')} columns as javascript ${fmtVal(
      'boolean'
    )}.
      Default: ${fmtVal(
        'true'
      )}. You can override this behavior for an individual column
      by changing the column to ${fmtVal('tinyint')}. Pass ${fmtVal(
      'false'
    )} to disable 
      the behavior globally.
    `,
    isRcOption: true
  },
  typeImports: {
    name: 'typeImports',
    type: 'string',
    description: '',
    isRcOption: true
  }
};

export const MODEL_COMMAND: CliCommand = {
  name: 'model',
  description: 'Show details about a model.',
  longDescription: `
    Shows the type details and other information about a model, 
    as parsed from the database schema and the current options.
  `,
  alias: 'm',
  usage: '[modelName] [otherOptions]',
  positionals: [
    {
      name: 'modelName',
      description: `
        The partial name of the model or the underlying table. 
        If omitted, or if multiple models match, you will be prompted to choose one.`
    }
  ],
  options: [
    RC_CLI_OPTIONS.envFile,
    RC_CLI_OPTIONS.schemaDirectory,
    RC_CLI_OPTIONS.codeDirectory,
    RC_CLI_OPTIONS.outputJs,
    RC_CLI_OPTIONS.typeBigIntAsString,
    RC_CLI_OPTIONS.typeTinyIntOneAsBoolean
  ]
};

export const FIELD_COMMAND: CliCommand = {
  name: 'field',
  description: 'Show details about a field.',
  longDescription: `
    Shows the type details and other information about a field, 
    as parsed from the database schema and the current options.
  `,
  alias: 'f',
  usage: '[modelName] [fieldName] [otherOptions]',
  positionals: [
    {
      name: 'modelName',
      description: `
        The partial name of the model or the underlying table. 
        If omitted, or if multiple models match, you will be prompted to choose one.`
    },
    {
      name: 'fieldName',
      description: `
        The partial name of the field or the underlying column. 
        If omitted, or if multiple fields match, you will be prompted to choose one.`
    }
  ],
  options: [
    RC_CLI_OPTIONS.envFile,
    RC_CLI_OPTIONS.schemaDirectory,
    RC_CLI_OPTIONS.codeDirectory,
    RC_CLI_OPTIONS.outputJs,
    RC_CLI_OPTIONS.typeBigIntAsString,
    RC_CLI_OPTIONS.typeTinyIntOneAsBoolean
  ]
};

export const GENERATE_COMMAND: CliCommand = {
  name: 'generate',
  description: 'Generate code.',
  usage: '[options]',
  alias: 'g',
  options: [
    RC_CLI_OPTIONS.envFile,
    RC_CLI_OPTIONS.schemaDirectory,
    RC_CLI_OPTIONS.codeDirectory,
    RC_CLI_OPTIONS.outputJs,
    RC_CLI_OPTIONS.typeBigIntAsString,
    RC_CLI_OPTIONS.typeTinyIntOneAsBoolean
  ]
};

export const INIT_COMMAND: CliCommand = {
  name: 'init',
  description: `Initialize or re-initialize ${fmtPath(FRIEDA_RC_FILE_NAME)}.`,
  usage: '[options]',
  alias: 'i'
};

export const COMMANDS = [
  GENERATE_COMMAND,
  MODEL_COMMAND,
  FIELD_COMMAND,
  INIT_COMMAND
];
