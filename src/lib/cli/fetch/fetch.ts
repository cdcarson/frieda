import type { Connection } from '@planetscale/database';
import { fetchTableNames } from './fetch-table-names.js';
import { fetchTable } from './fetch-table.js';
import type {
  TableColumnsMap,
  SchemaTablesMap,
  Schema,
  TableCreateStatementsMap,
  SchemaCastMap
} from '../../api/types.js';
import type { Options } from '../types.js';
import { getFieldCastType } from '$lib/api/parsers/field-parsers.js';

export const fetch = async (
  connection: Connection,
  options: Options
): Promise<{
  schema: Schema;
  tableCreateStatements: TableCreateStatementsMap;
}> => {
  const { databaseName, tableNames } = await fetchTableNames(connection);
  const tableResults = await Promise.all(
    tableNames.map((t) => fetchTable(connection, t))
  );
  const tableCreateStatements: TableCreateStatementsMap = tableResults.reduce(
    (acc, t) => {
      const copy = { ...acc };
      copy[t.name] = {
        tableName: t.name,
        create: t.create
      };
      return copy;
    },
    {} as TableCreateStatementsMap
  );
  const tables: SchemaTablesMap = tableResults.reduce((acc, t) => {
    const copy = {...acc}
    const columns: TableColumnsMap = t.columns.reduce((acc, column) => {
      const copy = { ...acc };
      copy[column.Field] = column;
      return copy;
    }, {} as TableColumnsMap);
    copy[t.name] = {
      name: t.name,
      columns,
      indexes: t.indexes
    };
    return copy;

  }, {} as SchemaTablesMap);

  const cast: SchemaCastMap = tableResults.reduce((acc, t) => {
    const copy = {...acc};
    t.columns.forEach(c => {
      const key = `${t.name}.${c.Field}`;
      copy[key] = getFieldCastType(c, options)
    });
    return copy;
  }, {} as SchemaCastMap)
  const schema: Schema = {
    databaseName,
    typeOptions: {
      typeBigIntAsString: options.typeBigIntAsString,
      typeTinyIntOneAsBoolean: options.typeTinyIntOneAsBoolean
    },
    tables,
    cast
  };
  return {
    tableCreateStatements,
    schema
  };
};
