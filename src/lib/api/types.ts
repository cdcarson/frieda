import type { Sql } from 'sql-template-tag';
import type { ExecutedQuery } from '@planetscale/database';
// https://www.typescriptlang.org/play?#code/C4TwDgpgBAsg9gEwgGygXigJQgYzgJwQB4BnYfASwDsBzAGigFcqBrKuAdyoD4BuAKH6hIsRCgDKKXMApwqRGFAgAPYBCoISopMm7ooAChYQQcAGawAlAG0AulAA+TDRDPUICAUPDQAospxkRiQEADF8OABbSWRpAEFkZAUlVXVNbRQ9DCMTc1goADIoMkpaG1tBYWgY6Q9QihRNIn4ofJU1DS14HToWqF8UjvT-QOC6iOipHGAEpJhuXtbxQbSusWQa6dl5ef1mJDcqD34sqGX21cNjUwsYcqgAfigAbyhrAGkoajPrKkZIgBGEHwtlsAC5YB97ABfKAQgDykQowAUDF8v3+QJBei8VSgABUIGR9M8+gBDCElag0AStAGU8jU2lQHAQv6A4HMhAQgAiZLUAmhuJ8ZymagQhOJGE24vqjRIRElwAY1gA5GTVQxVQhVbY+PwgA
/**
 * The base type for models
 */
export type Model = Record<string, unknown>;

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
export type MysqlType = (typeof MYSQL_TYPES)[number];

/**
 * A simplified set of casting rules. We infer this for each schema field from:
 * - the database column type,
 * - optional type annotations in the column definition COMMENT
 * - global settings in .friedarc
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
  'set',
  'enum'
] as const;
export type CastType = (typeof CAST_TYPES)[number];

export const ANNOTATIONS = ['bigint', 'enum', 'set', 'json'] as const;

export type Annotation = (typeof ANNOTATIONS)[number];

export type ParsedAnnotation = {
  annotation: Annotation;
  argument?: string;
};

export type CustomModelCast<M extends Model> = {
  [K in keyof M]?: CastType;
};
export type SchemaCastMap = {
  [orgTableOrgCol: string]: CastType;
};

/**
 * A row from a `SHOW FULL COLUMNS FROM TableName` query.
 * see https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
 */
export type Column<Name extends string = string> = {
  Field: Name;
  Type: string;
  Null: 'YES' | 'NO';
  Collation: string | null;
  Key: string;
  Default: string | null;
  Extra: string;
  Comment: string;
  Privileges: string;
};

export type TableColumnsMap = { [name: string]: Column<typeof name> };
/**
 * A row from `SHOW INDEXES FROM FROM TableName`
 */
export type Index = {
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

export type Table<Name extends string = string> = {
  name: Name;
  columns: TableColumnsMap;
  indexes: Index[];
};

export type SchemaTablesMap = { [name: string]: Table<typeof name> };

export type TypeOptions = {
  typeTinyIntOneAsBoolean: boolean;
  typeBigIntAsString: boolean;
};

export type Schema = {
  databaseName: string;
  tables: SchemaTablesMap;
  typeOptions: TypeOptions;
  cast: SchemaCastMap;
};
export type TableCreateStatement<Name extends string> = {
  tableName: Name;
  create: string;
};
export type TableCreateStatementsMap = {
  [name: string]: TableCreateStatement<typeof name>;
};

export type DbLoggingOptions = {
  performanceLogger?: (
    executedQuery: ExecutedQuery,
    roundTripMs: number
  ) => void;
  errorLogger?: (error: Error) => void;
};

export type ModelSelectColumnsInput<M extends Model> =
  | (keyof M & string)[]
  | undefined;

export type SelectedModel<
  M extends Model,
  ExcludedBySelectAll extends (keyof M)[],
  S extends ModelSelectColumnsInput<M>,
> = S extends (keyof M)[] ? { [K in S[number]]: M[K] } : Omit<M, ExcludedBySelectAll[number]>;


export type ModelWhereInput<M extends Model> = Partial<M> | Sql | undefined;

export type ModelOrderByInput<M extends Model> =
  | {
      col: keyof M & string;
      dir: 'asc' | 'desc';
    }
  | {
      col: keyof M & string;
      dir: 'asc' | 'desc';
    }[]
  | Sql
  | undefined;

export type OneBasedPagingInput =
  | {
      page: number;
      rpp: number;
    }
  | undefined;
