import type { SchemaCastMap, SchemaDefinition } from '../../api/types.js';
import type { FetchedSchema, Options } from '../types.js';
import { parseModel } from './parse-model.js';

export const parseSchema = (
  fetchedSchema: FetchedSchema,
  options: Options
): SchemaDefinition => {
  const models = fetchedSchema.tables.map(t => parseModel(t, options));
  const cast: SchemaCastMap = models.reduce((acc, m) => {
    const copy = {...acc};
    m.fields.forEach(f => {
      const key = `${m.tableName}.${f.columnName}`;
      copy[key] = f.castType
    });
    return copy
  }, {} as SchemaCastMap)
  return {
    databaseName: fetchedSchema.databaseName,
    models,
    cast
  }

};
