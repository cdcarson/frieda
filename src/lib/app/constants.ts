import type prettier from 'prettier';
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;

export const DEFAULT_JSON_FIELD_TYPE = 'unknown';

export const DEFAULT_PRETTIER_OPTIONS: prettier.Options = {
  useTabs: false,
  singleQuote: true,
  trailingComma: 'none',
  semi: true
};

export const FRIEDA_RC_FILENAME = '.friedarc.json';

export const SCHEMA_DEFINITION_FILENAME = 'schema-definition.d.ts'
export const GENERATED_CODE_FOLDERNAME = 'generated';

export const FRIEDA_METADATA_NAMES = {
  baseDirectory: '.frieda-metadata',
  jsonFile: 'schema.json',
  sqlFile: 'schema.sql',
  historyDirectory: 'history'
};

export const GENERATED_CODE_FILENAMES = {
  schemaCastMap: 'schema-cast-map.js',
  schemaDefinition: 'schema-definition.js',
  fullTextSearchIndexes: 'full-text-search-indexes.js',
  modelsD: 'models.d.ts',
  modelsDb: 'models-db.js',
  appDb: 'app-db.js',
  transactionDb: 'transaction-db.js'
};

export const GENERATED_CLASS_NAMES = {
  modelsDb: 'ModelsDb',
  transactionDb: 'TransactionDb',
  appDb: 'AppDb'
};
