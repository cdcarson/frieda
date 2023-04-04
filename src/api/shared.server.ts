import type { ExecutedQuery } from '@planetscale/database';
import type { Sql } from 'sql-template-tag';

export enum SimplifiedDatabaseType {
  String = 'String',
  Json = 'Json',
  Int = 'Int',
  BigInt = 'BigInt',
  Key = 'Key',
  Float = 'Float',
  Date = 'Date',
  Boolean = 'Boolean',
  Enum = 'Enum'
}

/**
 * A loose base type for javascript data models.
 */
export type Model = Record<string, unknown>;

export type FieldSchema<M extends Model> = {
  name: string & keyof M;
  databaseType: SimplifiedDatabaseType;
  javascriptType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  hasDefault: boolean;
  isPrimaryKeyGenerated: boolean;
  isDefaultGenerated: boolean;
  isGeneratedAlways: boolean;
  isUnique: boolean;
  isCreatedAt: boolean;
  isUpdatedAt: boolean;
};

export type ModelSchema<M extends Model> = {
  modelName: string;
  tableName: string;
  fields: FieldSchema<M>[];
  fullTextSearchIndexes: FullTextSearchIndex[];
};

export type FullTextSearchIndex = {
  tableName: string;
  indexKey: string;
  indexedFields: string[];
};
export type FullTextSearchIndexes = {
  [indexKey: string]: FullTextSearchIndex;
}


export type CustomModelCast<M extends Model> = {
  [K in keyof M]?: SimplifiedDatabaseType;
};

export type SchemaCast = {
  [orgTableOrgCol: string]: SimplifiedDatabaseType;
};

export type DbLoggingOptions = {
  performanceLogger?: (
    executedQuery: ExecutedQuery,
    roundTripMs: number
  ) => void;
  errorLogger?: (error: Error) => void;
};

export type ModelSelectColumnsInput<M extends Model> = (keyof M & string)[]|undefined;

export type ModelWhereInput<M extends Model> = Partial<M>|Sql|undefined;

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

export type OneBasedPagingInput = {
  page: number;
  rpp: number;
} | undefined;
