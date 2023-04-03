import type { Connection } from '@planetscale/database';
import type {
  RawTableColumnInfo,
  RawTableIndexInfo,
  RawTableInfo
} from './types.js';
import sql, { raw } from 'sql-template-tag';

export const fetchTableInfos = async (
  connection: Connection
): Promise<RawTableInfo[]> => {
  const tableNames = await fetchTableNames(connection);
  const results = await Promise.all(
    tableNames.map((tableName) => fetchTableInfo(connection, tableName))
  );
  return results;
};

const fetchTableNames = async (connection: Connection) => {
  const query = sql`SHOW TABLES;`;
  const result = await connection.execute(query.sql);
  const tableNames: string[] = [];
  result.rows.forEach((row) => {
    const key: keyof typeof row = Object.keys(row)[0] as keyof typeof row;
    if (key && typeof row[key] === 'string') {
      tableNames.push(row[key]);
    }
  });
  return tableNames;
};

const fetchTableCreateSql = async (
  connection: Connection,
  tableName: string
): Promise<string> => {
  const query = sql`SHOW CREATE TABLE ${raw(tableName)};`;
  const result = await connection.execute(query.sql);
  const row = result.rows[0] as { Table: string; 'Create Table': string };
  return row['Create Table'] + ';';
};

const fetchTableColumnsInfo = async (
  connection: Connection,
  tableName: string
): Promise<RawTableColumnInfo[]> => {
  const query = sql`SHOW FULL COLUMNS FROM ${raw(tableName)};`;
  const result = await connection.execute(query.sql);
  return result.rows as RawTableColumnInfo[];
};

const fetchTableIndexesInfo = async (
  connection: Connection,
  tableName: string
): Promise<RawTableIndexInfo[]> => {
  const query = sql`SHOW INDEXES FROM ${raw(tableName)};`;
  const result = await connection.execute(query.sql);
  return result.rows as RawTableIndexInfo[];
};

const fetchTableInfo = async (
  connection: Connection,
  tableName: string
): Promise<RawTableInfo> => {
  const [tableCreateStatement, columns, indexes] = await Promise.all([
    fetchTableCreateSql(connection, tableName),
    fetchTableColumnsInfo(connection, tableName),
    fetchTableIndexesInfo(connection, tableName)
  ]);
  return {
    name: tableName,
    tableCreateStatement,
    columns,
    indexes
  };
};


