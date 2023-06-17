import type { Connection } from '@planetscale/database';
import { getFileResult, saveFile } from './fs.server.js';
import {
  type AppOptions,
  type CurrentSchemaFilesResult,
  CURRENT_SCHEMA_FILE_NAMES,
  type FetchedSchema,
  type CreateTableRow,
  type ColumnRow,
  type IndexRow,
  type FetchTableNamesResult,
  type FetchedTable,
  DEFAULT_PRETTIER_OPTIONS,
  type FileResult
} from './shared.js';
import { isPlainObject } from './utils.js';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import sql from 'sql-template-tag';
import { bt } from '$lib/index.js';
import prettier from 'prettier';

export const getSchemaHash = (sql: string): string => {
  const hash = createHash('sha512');
  const data = hash.update(sql, 'utf-8');
  return data.digest('hex');
};

export const getCreateTablesSqlWithoutComments = (
  tables: FetchedTable[]
): string => {
  return tables.map((t) => t.createSql).join(`\n\n`);
};

export const readCurrentSchemaFiles = async (
  options: AppOptions
): Promise<CurrentSchemaFilesResult> => {
  const fileResults = await Promise.all(
    CURRENT_SCHEMA_FILE_NAMES.map((filename) => {
      return getFileResult(options, join(options.schemaDirectory, filename));
    })
  );
  type Files = CurrentSchemaFilesResult['files'];
  const files: Files = fileResults.reduce((acc, f) => {
    return { ...acc, [f.basename]: f };
  }, {} as Files);

  const schemaSql = files['current-schema.sql'].contents || '';
  const json = files['current-schema.json'].contents || '';
  let fetchedSchema: FetchedSchema | undefined;
  try {
    fetchedSchema = JSON.parse(json);
  } catch (error) {
    //ignore
  }
  if (
    !fetchedSchema ||
    !isPlainObject(fetchedSchema) ||
    schemaSql.length === 0 ||
    schemaSql.indexOf(fetchedSchema.schemaHash) < 0
  ) {
    return {
      valid: false,
      files,
      schemaSql,
      fetchedSchema
    };
  }
  return {
    valid: true,
    files,
    schemaSql,
    fetchedSchema
  };
};

export const writeCurrentSchemaFiles = async (
  options: AppOptions,
  schema: FetchedSchema
): Promise<CurrentSchemaFilesResult> => {
  const d = new Date(schema.fetched);
  const contents: { [K in (typeof CURRENT_SCHEMA_FILE_NAMES)[number]]: string } =
    {
      'current-schema.json': prettier.format(JSON.stringify(schema), {
        ...DEFAULT_PRETTIER_OPTIONS,
        filepath: 'current-schema.json'
      }),
      'current-schema.sql': [
        `-- Fetched: ${d.toUTCString()}`,
        `-- Schema hash: ${schema.schemaHash}`,
        '',
        getCreateTablesSqlWithoutComments(schema.tables)
      ].join('\n')
    };
  const fileResults = await Promise.all([
    saveFile(
      options,
      join(options.schemaDirectory, 'current-schema.json'),
      contents['current-schema.json']
    ),
    saveFile(
      options,
      join(options.schemaDirectory, 'current-schema.sql'),
      contents['current-schema.sql']
    )
  ]);
  type Files = CurrentSchemaFilesResult['files'];
  const files: Files = fileResults.reduce((acc, f) => {
    return { ...acc, [f.basename]: f };
  }, {} as Files);
  return {
    valid: true,
    files,
    fetchedSchema: schema,
    schemaSql: contents['current-schema.sql']
  }
};


export const writeSchemaChangeFiles = async (
  schemaBefore: FetchedSchema,
  schemaAfter: FetchedSchema,
  change: string,
  options: AppOptions
): Promise<FileResult[]> => {
  const d = new Date();
  const changeFolder = join(
    options.schemaDirectory,
    'changes',
    d.toISOString()
  );
  return await Promise.all([
    saveFile(
      options,
      join(changeFolder, '-schema-before.sql'),
      [
        `-- Schema before change`,
        `-- Fetched: ${new Date(schemaBefore.fetched).toUTCString()}`,
        `-- Schema hash: ${schemaBefore.schemaHash}`,
        '',
        getCreateTablesSqlWithoutComments(schemaBefore.tables)
      ].join('\n')
    ),
    saveFile(
      options,
      join(changeFolder, '+change.sql'),
      ['-- Schema change: ' + d.toUTCString(), change].join('\n\n')
    ),
    saveFile(
      options,
      join(changeFolder, '+schema-after.sql'),
      [
        `-- Schema after change`,
        `-- Fetched: ${new Date(schemaAfter.fetched).toUTCString()}`,
        `-- Schema hash: ${schemaAfter.schemaHash}`,
        '',
        getCreateTablesSqlWithoutComments(schemaAfter.tables)
      ].join('\n')
    )
  ]);
};

export const fetchCreateTableSql = async (
  connection: Connection,
  tableName: string
): Promise<string> => {
  const query = sql`SHOW CREATE TABLE ${bt(tableName)};`;
  const result = await connection.execute(query.sql);
  return (result.rows[0] as CreateTableRow)['Create Table'];
};

export const fetchTableColumns = async (
  connection: Connection,
  tableName: string
): Promise<ColumnRow[]> => {
  const query = sql`SHOW FULL COLUMNS FROM ${bt(tableName)};`;
  const result = await connection.execute(query.sql);
  return result.rows as ColumnRow[];
};

export const fetchTableIndexes = async (
  connection: Connection,
  tableName: string
): Promise<IndexRow[]> => {
  const query = sql`SHOW INDEXES FROM ${bt(tableName)};`;
  const result = await connection.execute(query.sql);
  return result.rows as IndexRow[];
};

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

export const fetchTable = async (
  connection: Connection,
  tableName: string
): Promise<FetchedTable> => {
  const results: [ColumnRow[], IndexRow[], string] = await Promise.all([
    fetchTableColumns(connection, tableName),
    fetchTableIndexes(connection, tableName),
    fetchCreateTableSql(connection, tableName)
  ]);
  return {
    name: tableName,
    columns: results[0],
    indexes: results[1],
    createSql: results[2]
  };
};

export const fetchSchema = async (
  connection: Connection
): Promise<FetchedSchema> => {
  const { databaseName, tableNames } = await fetchTableNames(connection);
  const tables = await Promise.all(
    tableNames.map((t) => fetchTable(connection, t))
  );
  const schemaHash = getSchemaHash(getCreateTablesSqlWithoutComments(tables));

  const fetchedSchema = {
    fetched: new Date(),
    databaseName,
    tables,
    schemaHash
  };

  return fetchedSchema;
};
