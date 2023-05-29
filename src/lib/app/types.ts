/**
 * A row from `SHOW INDEXES FROM FROM TableName`
 */
export type IndexRow = {
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
export type CreateTableRow = {
  Table: string;
  'Create Table': string;
};

/**
 * A row from a `SHOW FULL COLUMNS FROM TableName` query.
 * see https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
 */
export type ColumnRow = {
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

export type PathResult = {
  inputPath: string;
  cwd: string;
  absolutePath: string;
  relativePath: string;
  dirname: string;
  basename: string;
  extname: string;
  isUnderCwd: boolean;
};

export type FileResult = PathResult & {
  exists: boolean;
  isFile: boolean;
  contents?: string;
};

export type DirectoryResult = PathResult & {
  exists: boolean;
  isDirectory: boolean;
  isEmpty: boolean;
};

export type FetchedSchema = {
  fetched: Date;
  databaseName: string;
  tables: FetchedTable[];
};

export type FetchTableNamesResult = {
  databaseName: string;
  tableNames: string[];
};

export type FetchedTable = {
  name: string;
  columns: ColumnRow[];
  indexes: IndexRow[];
  createSql: string;
};

export type BuildOptions = {
  envFile: string;
  outputDirectory: string;
  schemaDirectory: string;
  compileJs: boolean;
};

export type CliOptions = Partial<BuildOptions> & {
  help?: boolean;
  init?: boolean;
  explore?: boolean;
  model?: string;
  field?: string;
};

export type DatabaseDetails = {
  databaseUrl: string;
  databaseUrlKey: string;
  envFile: string;
};


export type Index = {
  indexName: string;
  indexRows: IndexRow[];
  columnNames: string[];
  isPrimary: boolean;
  isUnique: boolean;
  isFullTextSearch: boolean;
  type: string;
};

export const ANNOTATIONS = ['bigint', 'set', 'json'] as const;
export type Annotation = (typeof ANNOTATIONS)[number];

export type ParsedAnnotation = {
  fullAnnotation: string;
  annotation: Annotation;
  typeArgument?: string;
};


export type LineNumbers = {[key: string]: number};

export type GeneratedFile = PathResult & { contents: string };

export enum TypescriptFileName {
  typesD = 'types.d.ts',
  database = 'database.ts',
  schema = 'schema.ts',
  searchIndexes= 'search-indexes.ts'
}

export type TypescriptSourceCode = {[K in TypescriptFileName]: string};

export type SchemaChange = {
  previousSchema: FetchedSchema;
  changeSql: string;
}

