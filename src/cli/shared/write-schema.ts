import { spinner } from "@clack/prompts";
import {  join } from "path";
import type { RawSchema, ResolvedSettings } from "./types.js";
import { formatFilePath } from "./utils.js";
import fs from 'fs-extra'
import { CURRENT_SCHEMA_FILE_NAME } from "./constants.js";
export const writeCurrentSchema = async (
  schema: RawSchema,
  vars: ResolvedSettings
): Promise<void> => {
  const fullPath = join(vars.schemaDirectoryFullPath, CURRENT_SCHEMA_FILE_NAME)
  const s = spinner();
  s.start(`Saving ${formatFilePath(fullPath)}...`)
  await fs.ensureDir(vars.schemaDirectoryFullPath)
  await fs.writeFile(fullPath, getSchemaSql(schema) );
  s.stop(`Saved ${formatFilePath(fullPath)}.`)
};

export const getSchemaSql = (schema: RawSchema): string => {
  const comments = [
    `-- Database: ${schema.databaseName}`,
    `-- Schema fetched: ${schema.fetched.toUTCString()}`
  ]
  return comments.join('\n') + `\n\n` + schema.tables.map(t => t.tableCreateStatement).join('\n\n');

}
