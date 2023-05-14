import type { FetchedSchema } from '$lib/fetch/types.js';
import {
  getCastType,
  getFieldName,
  isAutoIncrement,
  isPrimaryKey
} from '$lib/parse/field-parsers.js';
import { getModelName } from '$lib/parse/model-parsers.js';
import type { FieldDefinition, Schema, TypeOptions } from '../api/types.js';
import { getSchemaCastMap } from './get-schema-cast-map.js';

export const getSchemaTs = (
  fetched: FetchedSchema,
  typeOptions: TypeOptions,
  bannerComment: string
): string => {
  const schema: Schema = {
    databaseName: fetched.databaseName,
    typeOptions: {
      typeBigIntAsString: typeOptions.typeBigIntAsString,
      typeImports: typeOptions.typeImports,
      typeTinyIntOneAsBoolean: typeOptions.typeTinyIntOneAsBoolean
    },
    cast: getSchemaCastMap(fetched, typeOptions),
    models: fetched.tables.map((t) => {
      const fields: FieldDefinition[] = t.columns.map((c) => {
        return {
          castType: getCastType(c, typeOptions),
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
