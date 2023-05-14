import { getCastType } from '../parse/field-parsers.js';
import type { TypeOptions, SchemaCastMap } from '../api/types.js';
import type { FetchedSchema } from '../fetch/types.js';

export const getSchemaCastMap = (
  fetched: FetchedSchema,
  typeOptions: TypeOptions
): SchemaCastMap => {
  const cast: SchemaCastMap = fetched.tables.reduce(
    (acc: SchemaCastMap, table) => {
      const copy = { ...acc };
      table.columns.forEach((column) => {
        copy[`${table.name}.${column.Field}`] = getCastType(
          column,
          typeOptions
        );
      });
      return copy;
    },
    {} as SchemaCastMap
  );
  return cast;
};
