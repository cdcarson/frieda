import { getCastType } from '../parse/field-parsers.js';
import type { SchemaCastMap } from '../api/types.js';
import type { FetchedSchema } from '../fetch/types.js';

export const getSchemaCastMap = (fetched: FetchedSchema): SchemaCastMap => {
  const cast: SchemaCastMap = fetched.tables.reduce(
    (acc: SchemaCastMap, table) => {
      const copy = { ...acc };
      table.columns.forEach((column) => {
        copy[`${table.name}.${column.Field}`] = getCastType(column);
      });
      return copy;
    },
    {} as SchemaCastMap
  );
  return cast;
};
