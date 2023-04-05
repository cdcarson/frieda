import { spinner, log } from '@clack/prompts';
import { join } from 'path';
import type { RawSchema, ResolvedFriedaVars } from './shared/types.js';
import fs, { ensureDir } from 'fs-extra';
import {
  cancelAndExit,
  formatFilePath,
  getMysql2Connection,
  prettify
} from './shared/utils.js';
import { fetchSchema } from './shared/fetch-schema.js';
import type { Connection } from '@planetscale/database';
import { getSchemaSql, writeCurrentSchema } from './shared/write-schema.js';
import colors from 'picocolors';
import { generate } from './generate.js';
import {
  CURRENT_MIGRATION_FILE_NAME,
  MIGRATION_HISTORY_FOLDER
} from './shared/constants.js';

export const migrate = async (
  beforeSchema: RawSchema,
  vars: ResolvedFriedaVars,
  connection: Connection
) => {
  const fullPathToCurrentMigration = join(
    vars.migrationsDirectoryFullPath,
    CURRENT_MIGRATION_FILE_NAME
  );
  let sql = await readCurrentMigration(fullPathToCurrentMigration);
  if (sql.length === 0) {
    log.warning(`${formatFilePath(fullPathToCurrentMigration)} is empty.`);
    cancelAndExit();
  }
  await executeMigration(vars.databaseUrl, sql);
  const fetchSchemaSpinner = spinner();
  fetchSchemaSpinner.start('Fetching database schema...');
  const afterSchema = await fetchSchema(connection);
  fetchSchemaSpinner.stop('Database schema fetched.');
  await writeCurrentSchema(afterSchema, vars);
  const writeSpinner = spinner();
  writeSpinner.start('Writing migration files...');
  const d = new Date();
  const migrationDir = join(
    vars.migrationsDirectoryFullPath,
    MIGRATION_HISTORY_FOLDER,
    d.toISOString()
  );
  const beforeSchemaPath = join(migrationDir, 'schema-before.sql');
  const afterSchemaPath = join(migrationDir, 'schema-after.sql');
  const migrationPath = join(migrationDir, 'migration.sql');
  await ensureDir(migrationDir);
  await fs.writeFile(beforeSchemaPath, getSchemaSql(beforeSchema));
  await fs.writeFile(afterSchemaPath, getSchemaSql(afterSchema));
  await fs.writeFile(
    migrationPath,
    `-- Migration completed: ${d.toUTCString()}\n\n${sql}`
  );
  await fs.writeFile(fullPathToCurrentMigration, '');
  writeSpinner.stop('Wrote migration files.');
  log.info(
    [
      colors.dim('Migration files:'),
      formatFilePath(migrationPath),
      formatFilePath(beforeSchemaPath),
      formatFilePath(afterSchemaPath),
      `${formatFilePath(fullPathToCurrentMigration)} is now empty.`
    ].join('\n')
  );
  await generate(afterSchema, vars);
};

const readCurrentMigration = async (fullPath: string): Promise<string> => {
  const s = spinner();
  s.start(`Reading ${formatFilePath(fullPath)}`);
  await fs.ensureFile(fullPath);
  const sql = await fs.readFile(fullPath, 'utf-8');
  s.stop(`Read SQL from ${formatFilePath(fullPath)}.`);
  return sql.trim();
};

const executeMigration = async (
  databaseUrl: string,
  sql: string
): Promise<void> => {
  const s = spinner();
  s.start(`Executing migration...`);
  const connection = await getMysql2Connection(databaseUrl);
  try {
    await connection.execute(sql);
    await connection.end();
    s.stop(`Migration executed.`);
  } catch (error) {
    await connection.end();
    s.stop(`Migration failed.`);
    throw error;
  }
};
