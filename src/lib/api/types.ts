import type { Sql } from 'sql-template-tag';
import type { ExecutedQuery } from '@planetscale/database';

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

export type FieldDefinition = {
  fieldName: string;
  columnName: string;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  mysqlBaseType: MysqlBaseType | null;
  castType: CastType;
  hasDefault: boolean;
};

export type ModelDefinition = {
  modelName: string;
  tableName: string;
  fields: FieldDefinition[];
};

export type SchemaDefinition = {
  models: ModelDefinition[];
  cast: SchemaCastMap;
};

export type CustomModelCast<M extends Record<string, unknown>> = {
  [K in keyof M]?: CastType;
};
export type SchemaCastMap = {
  [orgTableOrgCol: string]: CastType;
};

export interface DbExecuteError {
  query: Sql;
  message: string;
  originalError: unknown;
}

export type DbLoggingOptions = {
  performanceLogger?: (
    executedQuery: ExecutedQuery,
    roundTripMs: number,
    queryTag?: string
  ) => void;
  errorLogger?: (error: DbExecuteError, queryTag?: string) => void;
};

export type ModelSelectColumnsInput<M extends Record<string, unknown>> =
  | (keyof M & string)[]
  | 'all'
  | undefined;

export type SelectedModel<
  M extends Record<string, unknown>,
  S extends ModelSelectColumnsInput<M>,
  SelectAll extends { [K in keyof M]?: M[K] }
> = S extends (keyof M)[]
  ? Required<{ [K in S[number]]: Required<M>[K] }>
  : S extends 'all'
  ? Required<M>
  : SelectAll;

export type InputWithWhere<
  M extends Record<string, unknown> = Record<string, unknown>,
  W extends Partial<M> | Sql | undefined = undefined
> = {
  where: W;
};

export type ModelOrderByInput<M extends Record<string, unknown>> =
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

export type FullTextSearchIndex = {
  tableName: string;
  indexedFields: string[];
  key: string;
};
export type ModelWithSearchRelevance<M extends Record<string, unknown>> = M & {
  _searchRelevance?: number;
};

export type ModelInputWithWhere<M extends Record<string, unknown>> =
  | {
      where?: Partial<M>;
      whereSql?: never;
      queryTag?: string;
    }
  | {
      where?: never;
      whereSql?: Sql;
      queryTag?: string;
    };

export type ModelInputWithWhereRequired<M extends Record<string, unknown>> =
  | {
      where: Partial<M>;
      whereSql?: never;
      queryTag?: string;
    }
  | {
      where?: never;
      whereSql: Sql;
      queryTag?: string;
    };

export type ModelFindManyInput<
  M extends Record<string, unknown>,
  S extends ModelSelectColumnsInput<M> = undefined,
  ModelSelectAll extends { [K in keyof M]?: M[K] } = M
> = ModelInputWithWhere<M> & {
  paging?: OneBasedPagingInput;
  orderBy?: ModelOrderByInput<M>;
  select?: S;
  cast?: CustomModelCast<SelectedModel<M, S, ModelSelectAll>>;
  queryTag?: string;
};

export type ModelFindOneInput<
  M extends Record<string, unknown>,
  S extends ModelSelectColumnsInput<M> = undefined,
  ModelSelectAll extends { [K in keyof M]?: M[K] } = M
> = ModelInputWithWhereRequired<M> & {
  orderBy?: ModelOrderByInput<M>;
  select?: S;
  cast?: CustomModelCast<SelectedModel<M, S, ModelSelectAll>>;
  queryTag?: string;
};

export type ModelUpdateInput<M extends Record<string, unknown>> =
  ModelInputWithWhereRequired<M> & {
    data: { [K in keyof M]?: M[K] };
    queryTag?: string;
  };
