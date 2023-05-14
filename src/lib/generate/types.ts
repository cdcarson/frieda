import type { FsPaths } from '../fs/types.js';

export const TYPESCRIPT_FILES = [
  'database.ts',
  'schema.ts',
  'types.ts'
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
  'types.js.map'
] as const;
export type JavascriptFileName = (typeof JAVASCRIPT_FILES)[number];

export type TypescriptCode = {
  [K in TypescriptFileName]: string;
};

export type JavascriptCode = {
  [K in JavascriptFileName]: string;
};
