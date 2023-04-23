import type { DatabaseSchema } from '$lib/api/types.js';
import { editAsync } from 'external-editor';
import fs from 'fs-extra';
import { getMysql2Connection, wait } from './utils.js';
import {
  getCurrentMigrationSqlPath,
  getArchivedMigrationSqlPaths
} from './paths.js';
import type { FullSettings } from './types.js';

export const createMigration = async () => {
  return new Promise((resolve, reject) => {
    editAsync('-- new migration\n\n', (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
};

export const readCurrentMigration = async (
  settings: FullSettings
): Promise<string> => {
  const { relativePath, fullPath } = getCurrentMigrationSqlPath(settings);
  const s = wait(`Reading ${relativePath}`);
  await fs.ensureFile(fullPath);
  const sql = await fs.readFile(fullPath, 'utf-8');
  s.done();
  return sql.trim();
};

export const runMigration = async (
  settings: FullSettings,
  sql: string,
  showSpinner: boolean
): Promise<void> => {
  const s = wait('Running migration', showSpinner);
  const connection = await getMysql2Connection(settings.databaseUrl);
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

export const archiveMigration = async (
  settings: FullSettings,
  sql: string,
  schemaBefore: DatabaseSchema,
  schemaAfter: DatabaseSchema,
  clearCurrent: boolean,
  showSpinner: boolean
): Promise<string[]> => {
  const s = wait('Archiving migration', showSpinner);
  const d = new Date();
  const paths = getArchivedMigrationSqlPaths(settings, d);

  await fs.ensureDir(paths.folder.fullPath);
  const schemaBeforeSql = `-- schema fetched ${schemaBefore.fetched.toUTCString()}\n\n${schemaBefore.tables
    .map((t) => t.tableCreateStatement)
    .join('\n\n')}`;
  const schemaAfterSql = `-- schema fetched ${schemaAfter.fetched.toUTCString()}\n\n${schemaAfter.tables
    .map((t) => t.tableCreateStatement)
    .join('\n\n')}`;
  await Promise.all([
    fs.writeFile(paths.schemaBefore.fullPath, schemaBeforeSql),
    fs.writeFile(paths.migration.fullPath, `-- ${d.toUTCString()}\n\n${sql}`),
    fs.writeFile(paths.schemaAfter.fullPath, schemaAfterSql),
    clearCurrent
      ? fs.writeFile(getCurrentMigrationSqlPath(settings).fullPath, '')
      : Promise.resolve()
  ]);
  s.done();
  return [
    paths.folder.relativePath,
    paths.schemaBefore.relativePath,
    paths.migration.relativePath,
    paths.schemaAfter.relativePath
  ];
};
