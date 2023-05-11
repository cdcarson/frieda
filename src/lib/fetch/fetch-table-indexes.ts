import type { Connection } from '@planetscale/database';
import type { IndexRow } from './types.js';
import sql from 'sql-template-tag';
import { bt } from '$lib/index.js';

export const fetchTableIndexes = async (
  connection: Connection,
  tableName: string
): Promise<IndexRow[]> => {
  const query = sql`SHOW INDEXES FROM ${bt(tableName)};`;
  const result = await connection.execute(query.sql);
  return result.rows as IndexRow[];
};
