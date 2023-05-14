import type { TypeOptions } from '../api/types.js';
import type { FetchedSchema } from '../fetch/types.js';
import { getDatabaseTs } from './get-database-ts.js';
import { getSchemaTs } from './get-schema-ts.js';
import { getTypesTs } from './get-types-ts.js';
import type { TypescriptCode } from './types.js';

export const getTypescript = (
  schema: FetchedSchema,
  typeOptions: TypeOptions,
  bannerComment: string
): TypescriptCode => {
  return {
    'database.ts': getDatabaseTs(schema, bannerComment),
    'schema.ts': getSchemaTs(schema, typeOptions, bannerComment),
    'types.ts': getTypesTs(schema, typeOptions, bannerComment)
  };
};
