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
export const FRIEDA_DATABASE_FILENAME = 'frieda.ts';
export const MODEL_DEFINITION_FILENAME = 'frieda-models.ts';
