import type { Connection } from '@planetscale/database';
import sql from 'sql-template-tag';
import { bt } from '../api/sql-utils.js';
import type { ColumnRow } from './types.js';
export const fetchTableColumns = async (
  connection: Connection,
  tableName: string
): Promise<ColumnRow[]> => {
  const query = sql`SHOW FULL COLUMNS FROM ${bt(tableName)};`;
  const result = await connection.execute(query.sql);
  return result.rows as ColumnRow[];
};
