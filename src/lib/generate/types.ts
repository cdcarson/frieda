export const TYPESCRIPT_FILES = [
  'database.ts',
  'schema.ts',
  'types.ts',
  'full-text-search-indexes.ts'
] as const;

export type TypescriptFileName = (typeof TYPESCRIPT_FILES)[number];

export const JAVASCRIPT_FILES = [
  'database.js',
  'database.d.ts',
  'database.js.map',
  'schema.js',
  'schema.d.ts',
  'schema.js.map',
  'types.js',
  'types.d.ts',
  'types.js.map',
  'full-text-search-indexes.js',
  'full-text-search-indexes.d.ts',
  'full-text-search-indexes.js.map'
] as const;
export type JavascriptFileName = (typeof JAVASCRIPT_FILES)[number];

export type TypescriptCode = {
  [K in TypescriptFileName]: string;
};

export type JavascriptCode = {
  [K in JavascriptFileName]: string;
};
