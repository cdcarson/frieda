import type { Connection } from '@planetscale/database';
import type {
  ColumnRow, IndexRow, FetchedTable
} from './types.js';
import { fetchTableColumns } from './fetch-table-columns.js';
import { fetchTableIndexes } from './fetch-table-indexes.js';
import { fetchCreateTableSql } from './fetch-create-table-sql.js';

export const fetchTable = async (
  connection: Connection,
  tableName: string
): Promise<FetchedTable> => {
  const results: [ColumnRow[], IndexRow[], string] =
    await Promise.all([
      fetchTableColumns(connection, tableName),
      fetchTableIndexes(connection, tableName),
      fetchCreateTableSql(connection, tableName)
    ]);
  return {
    name: tableName,
    columns: results[0],
    indexes: results[1],
    createSql: results[2]
  };
};
