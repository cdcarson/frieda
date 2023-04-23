import type { FullSettings } from './types.js';
import { join, relative, dirname } from 'node:path';
export type PathResult = {
  fullPath: string;
  relativePath: string;
  dirPath: string;
};

export const CURRENT_MIGRATION_SQL_FILE_NAME = 'current-migration.sql';
export const MIGRATIONS_DIRECTORY_NAME = 'migrations';

export const getCurrentMigrationSqlPath = (
  settings: FullSettings
): PathResult => {
  return getPathResult(
    settings.schemaDirectory,
    CURRENT_MIGRATION_SQL_FILE_NAME
  );
};
type ArchivePaths = {
  folder: PathResult;
  schemaBefore: PathResult;
  migration: PathResult;
  schemaAfter: PathResult;
};
export const getArchivedMigrationSqlPaths = (
  settings: FullSettings,
  d: Date
): ArchivePaths => {
  const folder = getPathResult(
    settings.schemaDirectory,
    MIGRATIONS_DIRECTORY_NAME,
    d.toISOString()
  );
  const schemaBefore = getPathResult(
    folder.relativePath,
    '0-schema-before.sql'
  );
  const migration = getPathResult(folder.relativePath, '1-migration.sql');
  const schemaAfter = getPathResult(folder.relativePath, '2-schema-after.sql');

  return { folder, schemaBefore, migration, schemaAfter };
};

const getPathResult = (first: string, ...rest: string[]): PathResult => {
  const cwd = process.cwd();
  const full = join(cwd, first, ...rest);
  return {
    fullPath: full,
    relativePath: relative(cwd, full),
    dirPath: dirname(full)
  };
};
