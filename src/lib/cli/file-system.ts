import fs from 'fs-extra';
import prettier from 'prettier';
import { resolve, relative, join, basename } from 'path';
import { customAlphabet } from 'nanoid';
import type {
  FsPaths,
  FileSystemResult,
  FileResult,
  DirectoryResult,
  FullSettings,
  MigrationData,
  RcSettings,
  MigrationProcess
} from './types.js';
import {
  CURRENT_SCHEMA_JSON_FILE_NAME,
  CURRENT_SCHEMA_SQL_FILE_NAME,
  FRIEDA_RC_FILE_NAME,
  GENERATED_CODE_FILENAMES,
  HISTORY_DIRECTORY_NAME,
  MIGRATIONS_DIRECTORY_NAME
} from './constants.js';
import type { DatabaseSchema } from '$lib/api/types.js';
import { isPlainObject } from './utils.js';
import glob from 'tiny-glob';

export const getFileSystemPaths = (inputPath: string): FsPaths => {
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
): Promise<FsPaths[]> => {
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
): Promise<FsPaths[]> => {
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
): Promise<FsPaths[]> => {
  const { absolutePath, relativePath } = getFileSystemPaths(
    join(
      settings.schemaDirectory,
      HISTORY_DIRECTORY_NAME,
      data.date.toISOString()
    )
  );
  const beforeSchema = getSchemaFileContents(data.schemaBefore);
  const migration = `-- migration on ${data.date.toUTCString()}\n\n${
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
  paths: FsPaths;
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
): Promise<FsPaths> => {
  const paths = getFileSystemPaths(relPath);
  await fs.ensureFile(paths.absolutePath)
  await fs.writeFile(paths.absolutePath, contents);
  return paths;
};

export const prettifyAndWriteFile = async (
  relPath: string,
  contents: string,
  prettifyExt?: string
): Promise<FsPaths> => {
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

export const getWorkingMigrationsDirectoryPath = (
  settings: FullSettings
): FsPaths => {
  return getFileSystemPaths(
    join(settings.schemaDirectory, MIGRATIONS_DIRECTORY_NAME)
  );
};

export const globWorkingMigrations = async (
  settings: FullSettings
): Promise<string[]> => {
  const { relativePath, absolutePath } = getWorkingMigrationsDirectoryPath(settings);
  await fs.ensureDir(absolutePath)
  return await glob(`${relativePath}/*.sql`);
};

export const writeWorkingMigrationFile = async (
  settings: FullSettings,
  migration: MigrationProcess
): Promise<FsPaths> => {
  const dirPath = getWorkingMigrationsDirectoryPath(settings);
  const getUniqueFileName = async (): Promise<string> => {
    const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz');
    const existing = await globWorkingMigrations(settings);
    const rx = /^(\d{4})-[a-z]+\.sql/;
    const nums = existing
      .map(s => basename(s))
      .map((s) => s.match(rx))
      .filter((m) => m !== null)
      .map((m) => (m ? parseInt(m[1]) : 0));
    const num = Math.min(Math.max(...nums, 0) + 1, 9999)
    const nanoLength = num === 9999 ? 36 : 5;
    return `${num.toString().padStart(4, '0')}-${nanoid(nanoLength)}.sql`;
  };
  if (!migration.file) {
    const fileName = await getUniqueFileName();
    migration.file = getFileSystemPaths(join(dirPath.relativePath, fileName));
  }
  await writeFile(migration.file.relativePath, migration.sql);
  return migration.file;
};



export const deleteFile = async (
  paths: FsPaths
): Promise<void> => {
  return await fs.remove(paths.absolutePath);
};
