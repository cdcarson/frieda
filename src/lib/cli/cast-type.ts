export const CAST_TYPES = [
  'string',
  'bigint',
  'int',
  'float',
  'json',
  'date',
  'boolean',
  'set',
  'enum'
] as const;
export type CastType = (typeof CAST_TYPES)[number];
