import type { CastType, MysqlBaseType } from '$lib/index.js';

export type FriedaOptions = {
  envFile: string;
  outputDirectory: string;
};
export type FriedaCliArgs = FriedaOptions & {
  init: boolean;
  help: boolean;
};

/**
 * A field from schema.d.ts
 */
export type SchemaField = {
  fieldName: string;
  javascriptType: string;
};
/**
 * A model from schema.d.ts
 */
export type SchemaModel = {
  modelName: string;
  fields: SchemaField[];
};

/**  queried database schema types */

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
 * The guys we want in our schema. (Not sure if there are any more.)
 */
export type TableType = 'BASE TABLE' | 'VIEW';

export type ShowFullTableResult<Type extends TableType = TableType> = {
  name: string;
  type: Type;
};

export type FetchedTable<Type extends TableType = TableType> =
  Type extends 'VIEW'
    ? {
        name: string;
        type: Type;
        columns: ColumnRow[];
      }
    : Type extends 'BASE TABLE'
    ? {
        name: string;
        type: Type;
        columns: ColumnRow[];
        indexes: IndexRow[];
      }
    : never;

export type FetchedSchema = {
  databaseName: string;
  fetched: Date;
  tables: FetchedTable[];
};

/*** parsed schema types */

export type ParsedField = {
  fieldName: string;
  columnName: string;
  isInvisible: boolean;
  mysqlBaseType: MysqlBaseType | null;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  isUnique: boolean;
  isNullable: boolean;
  hasDefault: boolean;
  defaultValue: string | null | undefined;
  isGeneratedAlways: boolean;
  castType: CastType;
  javascriptType: string;
};

export type ParsedIndex = {
  indexName: string;
  tableName: string;
  indexedColumns: string[];
  isUnique: boolean;
  isFullTextSearch: boolean;
};

export type ParsedModel<Type extends TableType = TableType> = {
  type: Type;
  modelName: string;
  tableName: string;
  selectAllTypeName: Type extends 'BASE TABLE' ? string : undefined;
  primaryKeyTypeName: Type extends 'BASE TABLE' ? string : undefined;
  createTypeName: Type extends 'BASE TABLE' ? string : undefined;
  updateTypeName: Type extends 'BASE TABLE' ? string : undefined;
  findUniqueTypeName: Type extends 'BASE TABLE' ? string : undefined;
  dbTypeName: string;
  appDbKey: string;
  fields: ParsedField[];
  indexes: Type extends 'BASE TABLE' ? ParsedIndex[] : undefined;
};

export type ParsedSchema = {
  models: ParsedModel[];
};

export type DebugSchema = {
  parsedSchema: ParsedSchema;
  fetchedSchema: FetchedSchema;
};

export type ReadFileResult = {
  abspath: string;
  contents: string;
  exists: boolean;
};
