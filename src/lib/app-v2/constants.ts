import type prettier from 'prettier';
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;
export const FRIEDA_RC_FILE_NAME = '.friedarc.json';

export const DEFAULT_JSON_FIELD_TYPE = 'unknown';
export const DEFAULT_PRETTIER_OPTIONS: prettier.Options = {
  useTabs: false,
  singleQuote: true,
  trailingComma: 'none',
  semi: true
};

export const SCHEMA_D_TS_FILENAME = 'schema.d.ts';
export const MODELS_D_FILENAME = '+models.generated.d.ts';
export const DATABASE_FILENAME = '+database.generated.js';
export const SCHEMA_VERSIONS_DIRECTORY = '-schema-versions';


