import type {
  DatabaseSchema,
  DatabaseTableInfo,
  ModelDefinition
} from '$lib/types.js';
import {
  CURRENT_SCHEMA_SQL_FILE_NAME,
  CURRENT_MODELS_JSON_FILE_NAME,
  CURRENT_SCHEMA_JSON_FILE_NAME
} from './constants.js';
import type { FullSettings } from '$lib/types.js';
import { join, dirname, relative } from 'path';
import fs from 'fs-extra';
import { prettify } from './utils.js';
export const writeCurrentSchema = async (
  schema: DatabaseSchema,
  models: ModelDefinition[],
  settings: FullSettings
): Promise<string[]> => {
  const d = new Date();
  return await Promise.all([
    writeSchemaSql(schema, settings, d),
    writeSchemaJSON(schema, settings, d),
    writeModelsJSON(models, settings, d)
  ])
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
      tables: strippedTables,
      
    }),
    filePath
  );

  await fs.ensureDir(dirname(filePath));
  await fs.writeFile(filePath, contents);
  return relative(process.cwd(), filePath);
};

const writeModelsJSON = async (
  models: ModelDefinition[],
  settings: FullSettings,
  d: Date
): Promise<string> => {
  const filePath = join(
    process.cwd(),
    settings.schemaDirectory,
    CURRENT_MODELS_JSON_FILE_NAME
  );
  
  const contents = await prettify(
    JSON.stringify({
      fetched: d,
      models
      
    }),
    filePath
  );

  await fs.ensureDir(dirname(filePath));
  await fs.writeFile(filePath, contents);
  return relative(process.cwd(), filePath);
};
