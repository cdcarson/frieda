import type { FetchedSchema } from '$lib/fetch/types.js';
import {
  getCastType,
  getFieldName,
  isAutoIncrement,
  isPrimaryKey
} from '$lib/parse/field-parsers.js';
import { getModelName } from '$lib/parse/model-parsers.js';
import { FRIEDA_VERSION } from '$lib/version.js';
import type { FieldDefinition, Schema } from '../api/types.js';
import { calculateSchemaHash } from './calculate-schema-hash.js';
import { getSchemaCastMap } from './get-schema-cast-map.js';

export const getSchemaTs = (
  fetched: FetchedSchema,
  bannerComment: string
): string => {
  const schema: Schema = {
    databaseName: fetched.databaseName,
    friedaVersion: FRIEDA_VERSION,
    schemaHash: calculateSchemaHash(fetched),
    cast: getSchemaCastMap(fetched),
    models: fetched.tables.map((t) => {
      const fields: FieldDefinition[] = t.columns.map((c) => {
        return {
          castType: getCastType(c),
          columnName: c.Field,
          fieldName: getFieldName(c),
          isAutoIncrement: isAutoIncrement(c),
          isPrimaryKey: isPrimaryKey(c)
        };
      });
      return {
        modelName: getModelName(t),
        tableName: t.name,
        fields
      };
    })
  };
  return `
    ${bannerComment}
    import type {Schema} from '@nowzoo/frieda';
    
    const schema: Schema = ${JSON.stringify(schema)}

    export default schema;
  `;
};
