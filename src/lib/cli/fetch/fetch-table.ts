import type { Connection } from '@planetscale/database';
import type {
  DatabaseShowFullColumnsRow, DatabaseShowIndexesRow
} from '../types.js';
import { fetchTableColumns } from './fetch-table-columns.js';
import { fetchTableIndexes } from './fetch-table-indexes.js';
import { fetchCreateTableSql } from './fetch-create-table-sql.js';
import type { FetchedTable } from '../types.js';

export const fetchTable = async (
  connection: Connection,
  tableName: string
): Promise<FetchedTable> => {
  const results: [DatabaseShowFullColumnsRow[], DatabaseShowIndexesRow[], string] =
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
