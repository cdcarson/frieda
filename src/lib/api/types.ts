import type { Sql } from 'sql-template-tag';
import type { KNOWN_MYSQL_TYPES } from './constants';
import type { ExecutedQuery } from '@planetscale/database';

/**
 * The base type for models
 */
export type Model = Record<string, unknown>;

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

export type CustomModelCast<M extends Model> = {
  [K in keyof M]?: CastType;
};
export type SchemaCast = {
  [orgTableOrgCol: string]: CastType;
};

export type FieldDefinition = {
  /**
   * The javascript field name (camelCase'd columnName)
   */
  fieldName: string;

  /**
   * DatabaseColumnRow.Field
   * The actual database column name.
   */
  columnName: string;

  /**
   * DatabaseColumnRow.Type
   * The full database type.
   */
  columnType: string;

  /**
   * DatabaseColumnRow.Null
   */
  columnNull: 'YES' | 'NO';

  /**
   * DatabaseColumnRow.Key
   */
  columnKey: string;

  /**
   * DatabaseColumnRow.Default
   */
  columnDefault: string | null;

  /**
   * DatabaseColumnRow.Extra
   */
  columnExtra: string;

  /**
   * DatabaseColumnRow.Comment
   */
  columnComment: string;

  /**
   * A normalized database type (a type string without any `(<M>)` args or `UNSIGNED` flags.)
   * Used to simplify and debug other inferences.
   */
  knownMySQLType: (typeof KNOWN_MYSQL_TYPES)[number] | null;

  /**
   * How to actually cast the value, received from the database as
   * `string|null`, into javascript, e.g. `parseInt`, `parseFloat`, etc.
   * Note that though this is used to help infer the userland javascript
   * type (see below) there isn't a one-one mapping.
   */
  castType: CastType;

  /**
   * The userland javascript field type, inferred from the cast type, the column type def,
   * column comment type annotations and global generate settings.
   */
  javascriptType: string;

  /**
   * true if DatabaseColumnRow.Key is 'PRI'
   */
  isPrimaryKey: boolean;

  /**
   * true if DatabaseColumnRow.Extra is auto_increment
   */
  isAutoIncrement: boolean;

  /**
   * true if DatabaseColumnRow.Extra contains VIRTUAL GENERATED or STORED GENERATED
   */
  isAlwaysGenerated: boolean;

  /**
   * true if DatabaseColumnRow.Extra contains DEFAULT_GENERATED, e.g.
   * created at or updated at columns, or some expression
   */
  isDefaultGenerated: boolean;

  /**
   * true if DatabaseColumnRow.Extra contains INVISIBLE
   */
  isInvisible: boolean;

  /**
   * True if DatabaseColumnRow.Null === 'YES'
   */
  isNullable: boolean;

  /**
   * true if DatabaseColumnRow.Key === 'UNI'
   */
  isUnique: boolean;

  /**
   * true if DatabaseColumnRow.Default is a string,
   * or if the field is nullable and DatabaseColumnRow.Default is null
   */
  hasDefault: boolean;

  /**
   * true if the field is INVISIBLE, therefore undefined in the
   * base model returned by SELECT *
   */
  isOmittableInModel: boolean;

  /**
   * true if the field is always generated
   */
  isOmittedFromCreateData: boolean;

  /**
   * true if the field is auto incremented or has a default
   */
  isOptionalInCreateData: boolean;

  /**
   * true if the field is a primary key or is always generated
   */
  isOmittedFromUpdateData: boolean;
};

export type ModelDefinition = {
  tableName: string;

  /**
   * The javascript model name (PascalCase'd columnName)
   */
  modelName: string;

  // Other model names...
  modelPrimaryKeyTypeName: string;
  modelCreateDataTypeName: string;
  modelUpdateDataTypeName: string;
  modelFindUniqueParamsTypeName: string;
  modelRepoTypeName: string;
  classRepoName: string;
  modelDefinitionConstName: string;

  // the model's fields
  fields: FieldDefinition[];
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

/**
 * A row from a `SHOW FULL COLUMNS FROM TableName` query.
 * see https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
 */
export type DatabaseColumnRow = {
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
export type DatabaseTableIndexInfo = {
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
export type DatabaseTableInfo = {
  name: string;
  columns: DatabaseColumnRow[];
  indexes: DatabaseTableIndexInfo[];
  tableCreateStatement: string;
};

export type DatabaseSchema = {
  fetched: Date;
  databaseName: string;
  tableNames: string[];
  tables: DatabaseTableInfo[];
};
