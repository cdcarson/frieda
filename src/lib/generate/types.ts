import type { FsPaths } from '../fs/types.js';

export const GENERATED_FILE_BASENAMES = {
  database: 'database',
  schema: 'schema',
  types: 'types'
} as const;

export type GenerateResult = {
  [K in keyof typeof GENERATED_FILE_BASENAMES]: FsPaths;
};
