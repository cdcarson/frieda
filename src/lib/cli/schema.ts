import type { Connection } from '@planetscale/database';
import type {
  DatabaseSchema,
  DatabaseColumnRow,
  DatabaseTableIndexInfo,
  DatabaseTableInfo
} from '$lib/api/types.js';
import sql from 'sql-template-tag';
import { bt } from '$lib/api/sql-utils.js';
import {  prettify, fmtPath } from './utils.js';

import {
  CURRENT_SCHEMA_SQL_FILE_NAME,
  CURRENT_SCHEMA_JSON_FILE_NAME
} from './constants.js';
import { join, dirname, relative } from 'path';
import fs from 'fs-extra';
import type { FullSettings } from './types.js';



export const fetchSchemaFromDatabase = async (
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
  ): Promise<DatabaseColumnRow[]> => {
    const query = sql`SHOW FULL COLUMNS FROM ${bt(tableName)};`;
    const result = await connection.execute(query.sql);
    return result.rows as DatabaseColumnRow[];
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

export const writeCurrentSchema = async (
  schema: DatabaseSchema,
  settings: FullSettings
): Promise<string[]> => {
  const d = new Date();
  return await Promise.all([
    writeSchemaSql(schema, settings, d),
    writeSchemaJSON(schema, settings, d)
  ]);
};

const writeSchemaSql = async (
  schema: DatabaseSchema,
  settings: FullSettings,
  d: Date
): Promise<string> => {
  const filePath = join(
    process.cwd(),
    settings.schemaDirectory,
    CURRENT_SCHEMA_SQL_FILE_NAME
  );
  const sql = schema.tables.map((t) => t.tableCreateStatement).join(`\n\n`);
  await fs.ensureDir(dirname(filePath));
  await fs.writeFile(filePath, `-- Generated: ${d.toUTCString()}\n\n${sql}`);
  return relative(process.cwd(), filePath);
};

const writeSchemaJSON = async (
  schema: DatabaseSchema,
  settings: FullSettings,
  d: Date
): Promise<string> => {
  const filePath = join(
    process.cwd(),
    settings.schemaDirectory,
    CURRENT_SCHEMA_JSON_FILE_NAME
  );
  const strippedTables: Omit<DatabaseTableInfo, 'tableCreateStatement'>[] =
    schema.tables.map((t) => {
      return {
        columns: t.columns,
        indexes: t.indexes,
        name: t.name
      };
    });
  const contents = await prettify(
    JSON.stringify({
      fetched: d,
      databaseName: schema.databaseName,
      tableNames: schema.tableNames,
      tables: strippedTables
    }),
    filePath
  );

  await fs.ensureDir(dirname(filePath));
  await fs.writeFile(filePath, contents);
  return relative(process.cwd(), filePath);
};

export const readSchemaJson = async (
  settings: FullSettings
): Promise<DatabaseSchema> => {
  const filePath = join(
    process.cwd(),
    settings.schemaDirectory,
    CURRENT_SCHEMA_JSON_FILE_NAME
  );
  const relPath = fmtPath(relative(process.cwd(), filePath));
  const exists = await fs.exists(filePath);
  if (!exists) {
    throw new Error(`${relPath} does not exist.`);
  }
  try {
    const schema = await fs.readJSON(filePath, { throws: true });
    return schema;
  } catch (error) {
    throw new Error(`${relPath} could not be read as JSON.`);
  }
};

export const __testable = {
  fetchFromDatabase: fetchSchemaFromDatabase,
  writeCurrentSchema,
  writeSchemaSql,
  writeSchemaJSON
};
