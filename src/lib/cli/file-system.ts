import fs from 'fs-extra';
import prettier from 'prettier';
import { resolve, relative, join } from 'path';
import type {
  FileSystemPaths,
  FileSystemResult,
  FileResult,
  DirectoryResult,
  FullSettings,
  MigrationData,
  RcSettings
} from './types.js';
import {
  CURRENT_MIGRATION_SQL_FILE_NAME,
  CURRENT_SCHEMA_JSON_FILE_NAME,
  CURRENT_SCHEMA_SQL_FILE_NAME,
  FRIEDA_RC_FILE_NAME,
  GENERATED_CODE_FILENAMES,
  MIGRATIONS_DIRECTORY_NAME
} from './constants.js';
import type { DatabaseSchema } from '$lib/api/types.js';
import { isPlainObject } from './utils.js';

export const getFileSystemPaths = (inputPath: string): FileSystemPaths => {
  const cwd = process.cwd();
  const absolutePath = stripTrailingSlash(resolve(cwd, inputPath));
  const relativePath = relative(cwd, absolutePath);
  return {
    inputPath,
    cwd,
    absolutePath,
    relativePath,
    isUnderCwd: absolutePath.startsWith(cwd) && absolutePath !== cwd
  };
};

const getFileSystemResult = async (
  inputPath: string
): Promise<FileSystemResult> => {
  const paths = getFileSystemPaths(inputPath);
  let stat: fs.Stats | null = null;
  let exists = false;
  let isDirectory = false;
  let isFile = false;
  try {
    stat = await fs.stat(paths.absolutePath);
    exists = true;
    isDirectory = stat.isDirectory();
    isFile = stat.isFile();
  } catch (error) {
    // file does not exist
  }
  const result: FileSystemResult = {
    ...paths,
    exists,
    stat,
    isDirectory,
    isFile
  };
  return result;
};

export const getFileResult = async (inputPath: string): Promise<FileResult> => {
  const result = await getFileSystemResult(inputPath);
  if (result.isFile) {
    const contents = await fs.readFile(result.absolutePath, 'utf-8');
    return {
      ...result,
      contents
    };
  }
  return { ...result };
};

export const getDirectoryResult = async (
  inputPath: string
): Promise<DirectoryResult> => {
  const result = await getFileSystemResult(inputPath);
  let contents: string[] = [];
  if (result.isDirectory) {
    contents = await fs.readdir(result.absolutePath);
  }
  return { ...result, isEmpty: contents.length === 0 };
};

const stripTrailingSlash = (p: string): string => {
  return p.replace(/\/$/, '');
};

export const writeGeneratedCode = async (
  settings: FullSettings,
  code: {
    [K in keyof typeof GENERATED_CODE_FILENAMES]: string;
  }
): Promise<FileSystemPaths[]> => {
  const orderedKeys: (keyof typeof GENERATED_CODE_FILENAMES)[] = [
    'schemaCast',
    'modelDefinitions',
    'types',
    'database'
  ];
  const folderPaths = getFileSystemPaths(settings.generatedCodeDirectory);
  await fs.ensureDir(folderPaths.absolutePath);
  return Promise.all(
    orderedKeys.map((k) => {
      const relPath = join(
        folderPaths.relativePath,
        GENERATED_CODE_FILENAMES[k]
      );
      return prettifyAndWriteFile(relPath, code[k]);
    })
  );
};

export const writeCurrentSchemaFiles = async (
  settings: FullSettings,
  schema: DatabaseSchema
): Promise<FileSystemPaths[]> => {
  await fs.ensureDir(getFileSystemPaths(settings.schemaDirectory).absolutePath);
  return await Promise.all([
    writeFile(
      join(settings.schemaDirectory, CURRENT_SCHEMA_SQL_FILE_NAME),
      getSchemaFileContents(schema)
    ),
    prettifyAndWriteFile(
      join(settings.schemaDirectory, CURRENT_SCHEMA_JSON_FILE_NAME),
      JSON.stringify(schema)
    )
  ]);
};

export const readCurrentSchemaJson = async (
  settings: FullSettings
): Promise<FileResult> => {
  const p = join(settings.schemaDirectory, CURRENT_SCHEMA_JSON_FILE_NAME);
  return await getFileResult(p);
};
const getSchemaFileContents = (schema: DatabaseSchema): string => {
  const header = [
    `-- Schema fetched ${schema.fetched.toUTCString()} (${schema.fetched.toISOString()})`,
    `-- Database: ${schema.databaseName}`
  ].join('\n');
  return [header, ...schema.tables.map((t) => t.tableCreateStatement)].join(
    '\n\n'
  );
};

export const writeMigrationFiles = async (
  settings: FullSettings,
  data: MigrationData
): Promise<FileSystemPaths[]> => {
  const { absolutePath, relativePath } = getFileSystemPaths(
    join(
      settings.schemaDirectory,
      MIGRATIONS_DIRECTORY_NAME,
      data.date.toISOString()
    )
  );
  const beforeSchema = getSchemaFileContents(data.schemaBefore);
  const migration = `- migration on ${data.date.toUTCString()}\n\n${
    data.migrationSql
  }`;
  const afterSchema = getSchemaFileContents(data.schemaAfter);
  await fs.ensureDir(absolutePath);
  return await Promise.all([
    writeFile(join(relativePath, `0-schema-before.sql`), beforeSchema),
    writeFile(join(relativePath, `1-migration.sql`), migration),
    writeFile(join(relativePath, `2-schema-after.sql`), afterSchema)
  ]);
};
export const readFriedaRc = async (): Promise<{
  file: FileResult;
  settings: Partial<RcSettings>;
}> => {
  const file = await getFileResult(FRIEDA_RC_FILE_NAME);
  let settings: Partial<RcSettings> = {};
  if (file.isFile) {
    try {
      settings = JSON.parse(file.contents || '');
      settings = isPlainObject(settings) ? settings : {};
    } catch (error) {
      settings = {};
    }
  }
  return {
    file,
    settings
  };
};

export const saveFriedaRc = async (
  settings: Partial<RcSettings>
): Promise<{
  paths: FileSystemPaths;
  settings: Partial<RcSettings>;
}> => {
  const { settings: prev, file } = await readFriedaRc();
  const merged = {
    ...prev,
    ...settings
  };
  const paths = await prettifyAndWriteFile(
    file.absolutePath,
    JSON.stringify(merged),
    'json'
  );
  return { settings: merged, paths };
};

const writeFile = async (
  relPath: string,
  contents: string
): Promise<FileSystemPaths> => {
  const paths = getFileSystemPaths(relPath);
  await fs.writeFile(paths.absolutePath, contents);
  return paths;
};

const prettifyAndWriteFile = async (
  relPath: string,
  contents: string,
  prettifyExt?: string
): Promise<FileSystemPaths> => {
  const paths = getFileSystemPaths(relPath);
  const pathForPretty = prettifyExt
    ? `${paths.absolutePath}.${prettifyExt}`
    : paths.absolutePath;
  const config = await prettier.resolveConfig(pathForPretty);
  const prettified = prettier.format(contents, {
    ...config,
    filepath: pathForPretty
  });
  return await writeFile(relPath, prettified);
};

export const readCurrentMigrationSql = async (
  settings: FullSettings
): Promise<FileResult> => {
  const relPath = join(
    settings.schemaDirectory,
    CURRENT_MIGRATION_SQL_FILE_NAME
  );
  const { absolutePath } = getFileSystemPaths(relPath);
  await fs.ensureFile(absolutePath);
  const result = await getFileResult(relPath);
  return result;
};

export const writeCurrentMigrationSql = async (
  settings: FullSettings,
  sql: string
): Promise<FileSystemPaths> => {
  const relPath = join(
    settings.schemaDirectory,
    CURRENT_MIGRATION_SQL_FILE_NAME
  );
  const { absolutePath } = getFileSystemPaths(relPath);
  await fs.ensureFile(absolutePath);
  const result = await writeFile(absolutePath, sql);
  return result;
};

export const clearCurrentMigrationSql = async (
  settings: FullSettings
): Promise<FileResult> => {
  const relPath = join(
    settings.schemaDirectory,
    CURRENT_MIGRATION_SQL_FILE_NAME
  );
  const { absolutePath } = getFileSystemPaths(relPath);
  await fs.writeFile(absolutePath, '');
  const result = await getFileResult(relPath);
  return result;
};

export const getMigrationFilePath = (
  settings: FullSettings,
  fileName: string
): FileSystemPaths => {
  return getFileSystemPaths(
    join(settings.schemaDirectory, 'working-migrations', fileName)
  );
};

export const writeWorkingMigrationsFile = async (
  paths: FileSystemPaths,
  sql: string
): Promise<FileSystemPaths> => {
  await fs.ensureFile(paths.absolutePath);
  return await writeFile(paths.relativePath, sql);
};

export const deleteWorkingMigrationsFile = async (
  paths: FileSystemPaths
): Promise<void> => {
  return await fs.remove(paths.absolutePath)
};
