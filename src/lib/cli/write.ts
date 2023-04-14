import type { DatabaseSchema } from '$lib/types.js';
import { CURRENT_SCHEMA_SQL_FILE_NAME } from './constants.js';
import type { FullSettings } from './types.js';
import { join, dirname } from 'path';
import fs from 'fs-extra';
import { formatFilePath, wait } from './utils.js';
export const writeCurrentSchema = async (
  schema: DatabaseSchema,
  settings: FullSettings
): Promise<Record<string, string>> => {
  const d = new Date();
  const currentSchemaFullPath = join(
    process.cwd(),
    settings.schemaDirectory,
    CURRENT_SCHEMA_SQL_FILE_NAME
  );
  const s = wait(`Saving ${formatFilePath(currentSchemaFullPath)}`)
  const sql = schema.tables.map((t) => t.tableCreateStatement).join(`\n\n`);
  await fs.ensureDir(dirname(currentSchemaFullPath));
  await fs.writeFile(
    currentSchemaFullPath,
    `-- Generated: ${d.toUTCString()}\n\n${sql}`
  );
  s.done();
  return {
    'Current schema': currentSchemaFullPath
  };
};
