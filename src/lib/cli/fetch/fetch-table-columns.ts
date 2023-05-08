import type { Connection } from '@planetscale/database';
import sql from 'sql-template-tag';
import { bt } from '../../api/sql-utils.js';
import type { Column } from '../../api/types.js';
export const fetchTableColumns = async (
  connection: Connection,
  tableName: string
): Promise<Column<string>[]> => {
  const query = sql`SHOW FULL COLUMNS FROM ${bt(tableName)};`;
  const result = await connection.execute(query.sql);
  return result.rows as Column<string>[];
};
