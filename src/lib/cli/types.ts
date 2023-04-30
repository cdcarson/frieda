import type { DatabaseSchema } from '$lib/api/types';
import type { Connection } from '@planetscale/database';
import type fs from 'fs-extra';
export type RcSettings = {
  /**
   * Where Frieda will write schema files and generated code.
   */
  outputDirectory: string;

  
  /**
   * An array of userland import statements
   * providing types relied upon by the models.
   *
   * Default: []
   */
  jsonTypeImports: string[];

  /**
   * The path to the environment variables
   * file where we can find the database URL.
   *
   * Default: .env
   */
  envFilePath: string;

  /**
   * Whether to automatically cast `tinyint(1)` columns to boolean.
   *
   * Default: true
   */
  typeTinyIntOneAsBoolean: boolean;

  /**
   * Whether to automatically cast `bigint` columns to string.
   *
   * Default: true
   */
  typeBigIntAsString: boolean;
};

export type FullSettings = Omit<Required<RcSettings>, 'envFilePath'> & {
  databaseUrl: string;
  databaseUrlKey: string;
  envFilePath: string;
  connection: Connection
};
export type EnvFileDatabaseUrl = Pick<
  FullSettings,
  'databaseUrl' | 'databaseUrlKey' | 'envFilePath'
>;

export type FsPaths = {
  inputPath: string;
  cwd: string;
  absolutePath: string;
  relativePath: string;
  dirname: string;
  basename: string;
  extname: string;
  isUnderCwd: boolean;
};



export type FileResult = FsPaths & {
  exists:boolean;
  isFile: boolean;
  contents?: string;
};

export type DirectoryResult = FsPaths & {
  exists:boolean;
  isDirectory: boolean;
  isEmpty: boolean;
};

export type MigrationProcess = {
  sql: string;
  schemaBefore: DatabaseSchema;
  file?: FsPaths
}

export type MigrationData = {
  schemaBefore: DatabaseSchema;
  migrationSql: string;
  schemaAfter: DatabaseSchema;
  date: Date;
}
