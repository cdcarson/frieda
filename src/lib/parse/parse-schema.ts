import type { FetchedSchema } from '../fetch/types.js';
import type { SchemaCastMap, TypeOptions } from '../api/types.js';
import { parseModel } from './parse-model.js';
import type { ExtendedSchema } from './types.js';

export const parseSchema = (
  fetchedSchema: FetchedSchema,
  typeOptions: TypeOptions
): ExtendedSchema => {
  const models = fetchedSchema.tables.map((t) => parseModel(t, typeOptions));
  const cast: SchemaCastMap = models.reduce((acc, m) => {
    const copy = { ...acc };
    m.fields.forEach((f) => {
      const key = `${m.tableName}.${f.columnName}`;
      copy[key] = f.castType;
    });
    return copy;
  }, {} as SchemaCastMap);
  return {
    databaseName: fetchedSchema.databaseName,
    models,
    cast,
    typeOptions
  };
};
