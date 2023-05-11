import { bt } from '../api/sql-utils.js';
import type { Connection } from '@planetscale/database';
import sql from 'sql-template-tag';
import type { CreateTableRow } from './types.js';

export const fetchCreateTableSql = async (
  connection: Connection,
  tableName: string
): Promise<string> => {
  const query = sql`SHOW CREATE TABLE ${bt(tableName)};`;
  const result = await connection.execute(query.sql);
  return (result.rows[0] as CreateTableRow)['Create Table'];
};
