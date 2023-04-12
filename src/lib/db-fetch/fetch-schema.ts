import type { Connection } from '@planetscale/database';
import type {
  DatabaseSchema,
  DatabaseTableColumnInfo,
  DatabaseTableIndexInfo,
  DatabaseTableInfo
} from '../types.js';
import sql from 'sql-template-tag';
import { bt } from '../utils/sql-utils.js';

export const fetchDatabaseSchema = async (
  connection: Connection
): Promise<DatabaseSchema> => {
  type FetchTableNamesResult = { databaseName: string; tableNames: string[] };
  const fetchTableNames = async (): Promise<FetchTableNamesResult> => {
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

  const fetchTableIndexesInfo = async (
    tableName: string
  ): Promise<DatabaseTableIndexInfo[]> => {
    const query = sql`SHOW INDEXES FROM ${bt(tableName)};`;
    const result = await connection.execute(query.sql);
    return result.rows as DatabaseTableIndexInfo[];
  };

  const fetchTableColumnsInfo = async (
    tableName: string
  ): Promise<DatabaseTableColumnInfo[]> => {
    const query = sql`SHOW FULL COLUMNS FROM ${bt(tableName)};`;
    const result = await connection.execute(query.sql);
    return result.rows as DatabaseTableColumnInfo[];
  };
  const fetchTableCreateSql = async (tableName: string): Promise<string> => {
    const query = sql`SHOW CREATE TABLE ${bt(tableName)};`;
    const result = await connection.execute(query.sql);
    const row = result.rows[0] as { Table: string; 'Create Table': string };
    return row['Create Table'] + ';';
  };
  const fetchTableInfo = async (name: string): Promise<DatabaseTableInfo> => {
    
    const [indexes, columns, tableCreateStatement] = await Promise.all([
      fetchTableIndexesInfo(name),
      fetchTableColumnsInfo(name),
      fetchTableCreateSql(name)
    ]);
    return {
      name,
      indexes,
      columns,
      tableCreateStatement
    };
  };

  const { databaseName, tableNames } = await fetchTableNames();
  const tables = await Promise.all(
    tableNames.map((name) => fetchTableInfo(name))
  );
  return {
    databaseName,
    tableNames,
    tables,
    fetched: new Date()
  };
};