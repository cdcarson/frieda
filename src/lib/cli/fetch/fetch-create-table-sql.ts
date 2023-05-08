import { bt } from '$lib/index.js';
import type { Connection } from '@planetscale/database';
import sql from 'sql-template-tag';
import type { DatabaseShowCreateTableRow } from '../types.js';

export const fetchCreateTableSql = async (
  connection: Connection,
  tableName: string
): Promise<string> => {
  const query = sql`SHOW CREATE TABLE ${bt(tableName)};`;
  const result = await connection.execute(query.sql);
  return (result.rows[0] as DatabaseShowCreateTableRow)['Create Table'];
};
