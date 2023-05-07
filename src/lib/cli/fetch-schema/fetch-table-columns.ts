import type { Connection } from '@planetscale/database';
import type { DatabaseShowColumnsRow } from '../types.js';
import sql from 'sql-template-tag';
import { bt } from '$lib/index.js';

export const fetchTableColumns = async (
  connection: Connection,
  tableName: string
): Promise<DatabaseShowColumnsRow[]> => {
  const query = sql`SHOW FULL COLUMNS FROM ${bt(tableName)};`;
  const result = await connection.execute(query.sql);
  return result.rows as DatabaseShowColumnsRow[];
};
