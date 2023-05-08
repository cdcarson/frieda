import type { Connection } from '@planetscale/database';
import type {
  Column, Index
} from '../../api/types.js';
import { fetchTableColumns } from './fetch-table-columns.js';
import { fetchTableIndexes } from './fetch-table-indexes.js';
import { fetchCreateTableSql } from './fetch-create-table-sql.js';

export const fetchTable = async (
  connection: Connection,
  tableName: string
): Promise<{
  name: string,
  columns: Column<string>[],
  indexes: Index[],
  create: string
}> => {
  const results: [Column<string>[], Index[], string] =
    await Promise.all([
      fetchTableColumns(connection, tableName),
      fetchTableIndexes(connection, tableName),
      fetchCreateTableSql(connection, tableName)
    ]);
  return {
    name: tableName,
    columns: results[0],
    indexes: results[1],
    create: results[2]
  };
};
