import { promptMigrationsDirectory } from './shared/prompt-migrations-directory.js';
import type { FriedaVars } from './shared/types.js';
import { intro, outro, spinner, log, confirm, isCancel } from '@clack/prompts';
import { promptDatabaseUrl } from './shared/prompt-database-url.js';
import {
  getCurrentMigrationsFilePath,
  formatFilePath,
  replaceDatabaseURLPassword,
  getMigrationsDirectoryFullPath,
  getCurrentSchemaFilePath
} from './shared/utils.js';
import colors from 'picocolors';
import fs from 'fs-extra';
import { cancelAndExit } from './shared/cancel-and-exit.js';
import { getMysql2Connection } from './shared/get-mysql-2-connection.js';
import { introspectShared } from './shared/introspect-shared.js';
import { getServerlessConnection } from './shared/get-serverless-connection.js';
import { join } from 'path';
export const migrate = async (friedaVars: FriedaVars) => {
  intro('Run current migrations');
  let { migrationsDirectory, databaseUrl } = friedaVars;
  if (typeof migrationsDirectory !== 'string') {
    migrationsDirectory = await promptMigrationsDirectory(friedaVars);
  }
  if (typeof databaseUrl !== 'string') {
    databaseUrl = await promptDatabaseUrl(friedaVars);
  }
  const currentMigrationPath =
    getCurrentMigrationsFilePath(migrationsDirectory);
  const urlMasked = replaceDatabaseURLPassword(databaseUrl);
  const logs = [
    `Database URL: ${colors.magenta(urlMasked)}`,
    `Current migrations: ${formatFilePath(currentMigrationPath)}`
  ];
  log.info(logs.join('\n'));
  const goAhead = await confirm({
    message: 'Continue?'
  });

  if (isCancel(goAhead) || goAhead !== true) {
    cancelAndExit();
  }
  const s = spinner();

  s.start(`Running migration...`);
  try {
    const conn = getServerlessConnection(databaseUrl);
    const schemaBefore = await introspectShared(conn);
    const sql = await readMigrationSql(currentMigrationPath);
    await executeMigration(databaseUrl, sql);
    const d = new Date();
    const migrationFolderPath = join(
      getMigrationsDirectoryFullPath(migrationsDirectory),
      d.toISOString()
    );
    const migrationFilePath = join(migrationFolderPath, `migration.sql`);
    const schemaBeforeFilePath = join(migrationFolderPath, `schema-before.sql`);
    const schemaAfterFilePath = join(migrationFolderPath, `schema-after.sql`);
    const currentSchemaFilePath = getCurrentSchemaFilePath(migrationsDirectory);
    const schemaAfter = await introspectShared(conn);
    await fs.ensureDir(migrationFolderPath);
    await fs.writeFile(
      migrationFilePath,
      [`Migration completed: ${d.toUTCString()}`, '', sql].join('\n')
    );
    await fs.writeFile(schemaBeforeFilePath, schemaBefore)
    await fs.writeFile(schemaAfterFilePath, schemaAfter)
    await fs.writeFile(currentSchemaFilePath, schemaAfter)
    await fs.writeFile(currentMigrationPath, '');
    s.stop(`Migration complete.`);
    log.info(
      [
        `Schema before migration: ${formatFilePath(schemaBeforeFilePath)}`,
        `Executed migration: ${formatFilePath(migrationFilePath)}`,
        `Current schema: ${formatFilePath(currentSchemaFilePath)}`,
        `${formatFilePath(currentMigrationPath)} reset.`
      ].join('\n')
    );
    outro('Done.');
  } catch (error) {
    s.stop('Migration failed.');
    const errorToLog =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    log.error(errorToLog);
    cancelAndExit();
  }
};

const readMigrationSql = async (
  currentMigrationPath: string
): Promise<string> => {
  await fs.ensureFile(currentMigrationPath);
  const sql = (await fs.readFile(currentMigrationPath, 'utf-8')).trim();
  if (sql.length === 0) {
    throw new Error('Empty migration.');
  }
  return sql;
};

const executeMigration = async (databaseUrl: string, sql: string) => {
  const conn = await getMysql2Connection(databaseUrl);
  try {
    await conn.execute(sql);
    await conn.end();
  } catch (error) {
    await conn.end();
    throw error;
  }
};
