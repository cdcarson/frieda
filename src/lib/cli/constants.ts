
export const FRIEDA_RC_FILE_NAME = '.friedarc.json';
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;

export const SCHEMA_SQL_FILE_NAME = 'schema.sql';
export const SCHEMA_JSON_FILE_NAME = 'schema.json';

export const DEFAULT_JSON_FIELD_TYPE = 'Object';

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
  model: `Show type details and other information about a model.`,
  field: `Show type details for a model field.`,
  init: `(Re-)initialize options in ${FRIEDA_RC_FILE_NAME}.`
};
