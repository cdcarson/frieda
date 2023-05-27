

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
  field?: string
}

export type DatabaseDetails = {
  databaseUrl: string;
  databaseUrlKey: string;
  envFile: string;
};



/** Userland types */

export interface ISchema {
  databaseName: string;
  models: IModel[];
}

export interface IModel {
  modelName: string;
  tableName: string;
  fields: IField[];
}

export interface IField {
  column: ColumnRow;
  fieldName: string;
  columnName: string;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  mysqlBaseType: MysqlBaseType|null;
  castType: CastType;
  hasDefault: boolean;
}

export type Index = {
  indexName: string;
  indexRows: IndexRow[];
  columnNames: string[];
  isPrimary: boolean;
  isUnique: boolean;
  isFullTextSearch: boolean;
  type: string;
}




/**
 * The database types we handle typing for. Other types are allowed,
 * but they will be typed as javascript string.
 */
export const MYSQL_TYPES = [
  'bigint',
  'tinyint',
  'bool',
  'boolean',
  'smallint',
  'mediumint',
  'int',
  'integer',
  'float',
  'double',
  'real',
  'decimal',
  'numeric',
  'bit',
  'datetime',
  'timestamp',
  'date',
  'year',
  'time',
  'json',
  'enum',
  'set',
  'char',
  'binary',
  'varchar',
  'varbinary',
  'tinyblob',
  'tinytext',
  'blob',
  'text',
  'mediumblob',
  'mediumtext',
  'longblob',
  'longtext'
] as const;
export type MysqlBaseType = (typeof MYSQL_TYPES)[number];


export const ANNOTATIONS = ['bigint', 'enum', 'set', 'json'] as const;
export type Annotation = (typeof ANNOTATIONS)[number];

export type ParsedAnnotation = {
  fullAnnotation: string;
  annotation: Annotation;
  typeArgument?: string;
};

/**
 * A simplified set of casting rules. We infer this for each schema field from:
 * - the database column type,
 * - optional type annotations in the column definition COMMENT
 *
 * In addition, this is used to provide one-off cast overrides to db.executeSelect
 * in the case where columns returned from a query do not map to the schema.
 */
export const CAST_TYPES = [
  'string',
  'bigint',
  'int',
  'float',
  'json',
  'date',
  'boolean',
  'set'
] as const;
export type CastType = (typeof CAST_TYPES)[number];


export type CastMap = {[k: string]: CastType};

export type DatabaseSchema = {
  cast: CastMap;
  
}
