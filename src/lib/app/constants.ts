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

export const MODEL_DEFINITION_FILENAME = 'model-types.d.ts';

export const FRIEDA_METADATA_NAMES = {
  baseDirectory: '.frieda-metadata',
  jsonFile: 'schema.json',
  sqlFile: 'schema.sql',
  historyDirectory: 'history'
};

export const GENERATED_SEARCH_FILENAMES = {
  dirName: 'search',
  fullTextSearchIndexes: 'full-text-search-indexes.js'
};
export const GENERATED_FILENAMES = {
  dirName: 'generated',
  index: 'index.js',
  modelsD: 'models.d.ts'
};

export const GENERATED_SCHEMA_FILENAMES = {
  dirName: 'schema',
  schemaDef: `schema-definition.js`,
  schemaCastMap: 'schema-cast-map.js'
};

export const GENERATED_DB_FILENAMES = {
  dirName: 'database-classes',
  appDb: 'application-database.js',
  transactionDb: 'transaction-database.js',
  modelsDb: 'models-database.js'
};

export const GENERATED_DB_CLASS_NAMES = {
  modelsDb: 'ModelsDatabase',
  transactionDb: 'TransactionDatabase',
  appDb: 'ApplicationDatabase'
};
