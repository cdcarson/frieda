import type { FieldDefinition } from '$lib/index.js';

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
  exists: boolean;
  isFile: boolean;
  contents?: string;
};

export type DirectoryResult = FsPaths & {
  exists: boolean;
  isDirectory: boolean;
  isEmpty: boolean;
};

export type Options = {
  envFile: string;
  outputDirectory: string;
  compileJs: boolean;
  typeTinyIntOneAsBoolean: boolean;
  typeBigIntAsString: boolean;
  typeImports: string[];
};

export type CliArgs = Exclude<Options, 'typeImports'> & {
  help: boolean;
};

export type FetchTableNamesResult = {
  databaseName: string;
  tableNames: string[];
};

export type FetchedTable = {
  name: string;
  columns: DatabaseShowFullColumnsRow[];
  indexes: DatabaseShowIndexesRow[];
  createSql: string;
};

export type FetchedSchema = {
  databaseName: string;
  tables: FetchedTable[];
};

/**
 * A row from a `SHOW FULL COLUMNS FROM TableName` query.
 * see https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
 */
export type DatabaseShowFullColumnsRow = {
  Field: string;
  Type: string;
  Null: 'YES' | 'NO';
  Collation: string | null;
  Key: string;
  Default: string | null;
  Extra: string;
  Comment: string;
  Privileges: string;
};

/**
 * A row from `SHOW INDEXES FROM FROM TableName`
 */
export type DatabaseShowIndexesRow = {
  Table: string;
  Non_unique: number;
  Key_name: string;
  Seq_in_index: number;
  Column_name: string | null;
  Collation: string | null;
  Cardinality: string;
  Sub_part: string | null;
  Packed: string | null;
  Null: string;
  Index_type: string;
  Comment: string;
  Index_comment: string;
  Visible: string;
  Expression: string | null;
};
/**
 * A row from `SHOW CREATE TABLE t`
 */
export type DatabaseShowCreateTableRow = {
  Table: string;
  'Create Table': string;
};

export const ANNOTATIONS = ['bigint', 'enum', 'set', 'json'] as const;
export type Annotation = (typeof ANNOTATIONS)[number];

export type ParsedAnnotation = {
  annotation: Annotation;
  argument?: string;
};

export type DatabaseUrlResult = {
  databaseUrl: string;
  databaseUrlKey: string;
  envFile: string;
};


