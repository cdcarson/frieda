import { log, spinner } from '@clack/prompts';
import fs, { ensureDir } from 'fs-extra';
import type { RawSchema, ResolvedSettings } from './types.js';
import { createSpinner, formatFilePath, getMysql2Connection } from './utils.js';
import { cancelAndExit } from './utils.js';
import { fetchSchema, getSchemaSql } from './schema.js';
import type { Connection } from '@planetscale/database';
import { join } from 'path';
import { MIGRATION_HISTORY_FOLDER } from './constants.js';
import colors from 'picocolors';
export const runCurrentMigration = async (
  settings: ResolvedSettings,
  connection: Connection
): Promise<RawSchema> => {
  const sql = await readCurrentMigration(settings.currentMigrationFullPath);
  if (sql.length === 0) {
    return cancelAndExit();
  }
  const beforeSchema = await fetchSchema(connection);
  await executeMigration(settings.databaseUrl, sql);
  const afterSchema = await fetchSchema(connection);
  const s = createSpinner('Saving migration');
  const d = new Date();
  const migrationDir = join(
    settings.schemaDirectoryFullPath,
    MIGRATION_HISTORY_FOLDER,
    d.toISOString()
  );
  const schemaBeforeFilePath = join(migrationDir, `schema-before.sql`)
  const schemaAfterFilePath = join(migrationDir, `schema-after.sql`)
  const migrationFilePath = join(migrationDir, `migration.sql`)
  await ensureDir(migrationDir);
  await Promise.all([
    fs.writeFile(
      schemaBeforeFilePath,
      getSchemaSql(beforeSchema)
    ),
    fs.writeFile(
      migrationFilePath,
      `-- Migration completed: ${d.toUTCString()}\n\n${sql}`
    ),
    fs.writeFile(
      schemaAfterFilePath,
      getSchemaSql(afterSchema)
    ),
    fs.writeFile(
      settings.currentSchemaFullPath,
      getSchemaSql(afterSchema)
    ),
    fs.writeFile(settings.currentMigrationFullPath, '')
  ]);
  s.done();
  log.info(
    [
      formatFilePath(migrationDir),
      ' - ' + formatFilePath(schemaBeforeFilePath),
      ' - ' + formatFilePath(migrationFilePath),
      ' - ' + formatFilePath(schemaAfterFilePath),
      `${formatFilePath(settings.currentSchemaFullPath)} updated.`,
      `${formatFilePath(settings.currentMigrationFullPath)} is now empty.`,
      
    ].join('\n')
  );
  return afterSchema;
};

export const executeMigration = async (
  databaseUrl: string,
  sql: string
): Promise<void> => {
  const s = createSpinner(`Executing migration`);
  const connection = await getMysql2Connection(databaseUrl);
  try {
    await connection.execute(sql);
    await connection.end();
    s.done();
  } catch (error) {
    await connection.end();
    s.error();
    throw error;
  }
};
export const readCurrentMigration = async (
  currentMigrationFullPath: string
): Promise<string> => {
  const s = createSpinner('Reading current migration');
  await fs.ensureFile(currentMigrationFullPath);
  const sql = await fs.readFile(currentMigrationFullPath, 'utf-8');
  s.done();
  return sql.trim();
};
