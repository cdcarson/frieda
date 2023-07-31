import type { CastType, MysqlBaseType } from '../api/types.js';

export type FriedaOptions = {
  envFile: string;
  outputDirectory: string;
  compileJs: boolean;
};
export type FriedaCliArgs = FriedaOptions & {
  init: boolean;
  help: boolean;
};

export const ANNOTATIONS = ['bigint', 'set', 'json'] as const;
export type Annotation = (typeof ANNOTATIONS)[number];

export type ParsedAnnotation = {
  fullAnnotation: string;
  annotation: Annotation;
  typeArgument?: string;
};

export type FetchTableNamesResult = {
  databaseName: string;
  tableNames: string[];
};

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

export type FetchedSchema = {
  fetched: Date;
  databaseName: string;
  tables: FetchedTable[];
};

export type FetchedTable = {
  name: string;
  columns: ColumnRow[];
  indexes: IndexRow[];
  createSql: string;
};

export type ColumnPropertySignature = {
  propertySignature: string | undefined;
  note: string | undefined;
};

export type ParsedSchema = {
  fetchedSchema: FetchedSchema;
  fetched: Date;
  databaseName: string;
  models: ParsedModel[];
};

export type ParsedModel = {
  readonly table: FetchedTable;
  readonly modelName: string;
  readonly tableName: string;
  readonly selectAllTypeName: string;
  readonly primaryKeyTypeName: string;
  readonly createTypeName: string;
  readonly updateTypeName: string;
  readonly findUniqueTypeName: string;
  readonly dbTypeName: string;
  readonly appDbKey: string;
  readonly fields: ParsedField[];
  readonly indexes: ParsedIndex[];
};

export type ParsedIndex = {
  indexName: string;
  tableName: string;
  indexedColumns: string[];
  isUnique: boolean;
  isFullTextSearch: boolean;
};

export type ParsedField = {
  readonly column: ColumnRow;
  readonly fieldName: string;
  readonly columnName: string;
  readonly isInvisible: boolean;
  readonly mysqlBaseType: MysqlBaseType | null;
  readonly typeAnnotations: ParsedAnnotation[];
  readonly bigIntAnnotation: ParsedAnnotation | undefined;
  readonly setAnnotation: ParsedAnnotation | undefined;
  readonly jsonAnnotation: Required<ParsedAnnotation> | undefined;
  readonly isTinyIntOne: boolean;
  readonly isUnsigned: boolean;
  readonly isPrimaryKey: boolean;
  readonly isAutoIncrement: boolean;
  readonly isUnique: boolean;
  readonly isNullable: boolean;
  readonly hasDefault: boolean;
  readonly defaultValue: string | null | undefined;
  readonly isGeneratedAlways: boolean;
  readonly castType: CastType;
  readonly jsEnumerableStringType: string | undefined;
  readonly javascriptType: string;
};
