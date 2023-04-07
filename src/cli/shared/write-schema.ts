import {  join } from "path";
import type { RawSchema, ResolvedSettings } from "./types.js";
import fs from 'fs-extra'
import { CURRENT_SCHEMA_FILE_NAME } from "./constants.js";
export const writeCurrentSchema = async (
  schema: RawSchema,
  settings: ResolvedSettings
): Promise<string> => {
  const fullPath = join(settings.schemaDirectoryFullPath, CURRENT_SCHEMA_FILE_NAME)
  await fs.ensureDir(settings.schemaDirectoryFullPath)
  await fs.writeFile(fullPath, getSchemaSql(schema) );
  return fullPath;
};

export const getSchemaSql = (schema: RawSchema): string => {
  const comments = [
    `-- Database: ${schema.databaseName}`,
    `-- Schema fetched: ${schema.fetched.toUTCString()}`
  ]
  return comments.join('\n') + `\n\n` + schema.tables.map(t => t.tableCreateStatement).join('\n\n');

}
