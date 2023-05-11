import sql from 'sql-template-tag';
import type { FetchTableNamesResult } from './types.js';
import type { Connection } from '@planetscale/database';

export const fetchTableNames = async (
  connection: Connection
): Promise<FetchTableNamesResult> => {
  const query = sql`SHOW FULL TABLES;`;
  const executedQuery = await connection.execute(query.sql);
  const nameKey = executedQuery.fields[0].name;
  const result: FetchTableNamesResult = {
    databaseName: nameKey.replace(/^tables_in_/gi, ''),
    tableNames: []
  };
  const rows = executedQuery.rows as Record<string, string>[];
  rows.forEach((row: Record<string, string>) => {
    const keys: (keyof typeof row)[] = Object.keys(row);
    const k0: keyof typeof row = keys[0];
    const k1: keyof typeof row = keys[1];
    // ignore views for now
    if (row[k1] !== 'BASE TABLE') {
      return;
    }
    const tableName: string = row[k0];
    result.tableNames.push(tableName);
  });

  return result;
};
