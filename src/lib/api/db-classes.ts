import type {
  Connection,
  ExecutedQuery,
  Transaction
} from '@planetscale/database';
import type {
  CustomModelCast,
  DbExecuteError,
  DbLoggingOptions,
  FieldDefinition,
  ModelDefinition,
  ModelFindManyInput,
  ModelFindOneInput,
  ModelInputWithWhere,
  ModelInputWithWhereRequired,
  ModelSelectColumnsInput,
  ModelUpdateInput,
  SchemaDefinition,
  SelectedModel
} from './types.js';
import sql, { join, empty, raw, type Sql } from 'sql-template-tag';
import { createCastFunction } from './create-cast-function.js';

import { bt, getLimitOffset, getOrderBy, getWhere } from './sql-utils.js';

export class ExecuteError extends Error implements DbExecuteError {
  constructor(
    public readonly originalError: unknown,
    public readonly query: Sql
  ) {
    super(
      originalError instanceof Error ? originalError.message : 'unkown error'
    );
  }
}

export class BaseDatabase {
  #connOrTx: Connection | Transaction;
  #schema: SchemaDefinition;
  #loggingOptions: DbLoggingOptions;
  constructor(
    conn: Connection | Transaction,
    schema: SchemaDefinition,
    loggingOptions: DbLoggingOptions = {}
  ) {
    this.#connOrTx = conn;
    this.#schema = schema;
    this.#loggingOptions = loggingOptions;
  }

  get connOrTx(): Connection | Transaction {
    return this.#connOrTx;
  }

  get schema(): SchemaDefinition {
    return this.#schema;
  }

  get loggingOptions(): DbLoggingOptions {
    return this.#loggingOptions;
  }

  get performanceLogger(): (
    executedQuery: ExecutedQuery,
    roundTripMs: number,
    queryTag?: string
  ) => void {
    return (
      this.loggingOptions.performanceLogger ||
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ((e: ExecutedQuery, t: number) => {
        // noop
      })
    );
  }

  get errorLogger(): (error: ExecuteError, queryTag?: string) => void {
    return (
      this.loggingOptions.errorLogger ||
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ((e: ExecuteError) => {
        // noop
      })
    );
  }

  public async execute(
    query: Sql,
    customModelCast?: CustomModelCast<Record<string, unknown>>,
    queryTag?: string
  ): Promise<ExecutedQuery> {
    try {
      const start = Date.now();
      const result = await this.connOrTx.execute(query.sql, query.values, {
        as: 'object',
        cast: createCastFunction(this.schema.cast, customModelCast)
      });
      // noop by default, see getter
      this.performanceLogger(result, Date.now() - start, queryTag);
      return result;
    } catch (error) {
      this.errorLogger(new ExecuteError(error, query), queryTag);
      throw new Error(`Internal server error.`);
    }
  }

  public async selectMany<M extends Record<string, unknown>>(
    query: Sql,
    customModelCast?: CustomModelCast<M>,
    queryTag?: string
  ): Promise<{ executedQuery: ExecutedQuery; rows: M[] }> {
    const executedQuery = await this.execute(query, customModelCast, queryTag);
    return { executedQuery, rows: executedQuery.rows as M[] };
  }

  public async selectFirst<M extends Record<string, unknown>>(
    query: Sql,
    customModelCast?: CustomModelCast<M>,
    queryTag?: string
  ): Promise<M | null> {
    const { rows } = await this.selectMany(query, customModelCast, queryTag);
    return rows[0] || null;
  }
  public async selectFirstOrThrow<M extends Record<string, unknown>>(
    query: Sql,
    customModelCast?: CustomModelCast<M>,
    queryTag?: string
  ): Promise<M> {
    const result = await this.selectFirst(query, customModelCast, queryTag);
    if (!result) {
      throw new Error('selectFirstOrThrow failed to find a record.');
    }
    return result;
  }
}

export class ViewDatabase<
  M extends Record<string, unknown>,
  ModelSelectAll extends { [K in keyof M]?: M[K] } = M
> extends BaseDatabase {
  #model: ModelDefinition;

  constructor(
    modelName: string,
    conn: Connection | Transaction,
    schema: SchemaDefinition,
    loggingOptions: DbLoggingOptions = {}
  ) {
    super(conn, schema, loggingOptions);
    const model = schema.models.find((m) => m.modelName === modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found in schema.`);
    }
    this.#model = model;
  }

  get model(): ModelDefinition {
    return this.#model;
  }

  get tableName(): string {
    return this.model.tableName;
  }

  get fields(): FieldDefinition[] {
    return Object.values(this.model.fields);
  }

  get keys(): (keyof M & string)[] {
    return this.fields.map((f) => f.fieldName);
  }

  async findMany<S extends ModelSelectColumnsInput<M> = undefined>(
    input: ModelFindManyInput<M, S, ModelSelectAll>
  ): Promise<SelectedModel<M, S, ModelSelectAll>[]> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - findMany`;
    }
    const where = getWhere(input, this.tableName);
    const orderBy = getOrderBy(input.orderBy, this.tableName);
    const limit = getLimitOffset(input.paging);
    const getSelectForFieldName = (fieldName: string): Sql => {
      const field = this.fields.find((f) => f.fieldName === fieldName);
      if (!field) {
        throw new Error(
          `Invalid select: the field named ${fieldName} does not exist.`
        );
      }
      return sql`${bt(this.tableName, field.columnName)} as ${bt(
        field.fieldName
      )}`;
    };
    const select =
      Array.isArray(input.select) && input.select.length > 0
        ? join(
            input.select.map((fieldName) => getSelectForFieldName(fieldName)),
            ','
          )
        : 'all' === input.select
        ? join(
            this.keys.map((fieldName) => getSelectForFieldName(fieldName)),
            ','
          )
        : raw('*');
    const query = sql`
        SELECT 
        ${select} 
        FROM 
        ${bt(this.tableName)} 
        ${where} 
        ${orderBy} 
        ${limit}`;
    const { rows } = await this.selectMany<SelectedModel<M, S, ModelSelectAll>>(
      query,
      input.cast,
      input.queryTag
    );
    return rows;
  }

  async findFirst<S extends ModelSelectColumnsInput<M> = undefined>(
    input: ModelFindOneInput<M, S, ModelSelectAll>
  ): Promise<SelectedModel<M, S, ModelSelectAll> | null> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - findFirst`;
    }
    const rows = await this.findMany({
      ...input,
      paging: { page: 1, rpp: 1 }
    });
    return rows[0] || null;
  }

  async findFirstOrThrow<S extends ModelSelectColumnsInput<M> = undefined>(
    input: ModelFindOneInput<M, S, ModelSelectAll>
  ): Promise<SelectedModel<M, S, ModelSelectAll>> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - findFirstOrThrow`;
    }
    const result = await this.findFirst(input);
    if (!result) {
      throw new Error('findFirstOrThrow failed to find a record.');
    }
    return result;
  }

  async countBigInt(input: ModelInputWithWhere<M>): Promise<bigint> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - countBigInt`;
    }
    const where = getWhere(input, this.tableName);
    const query = sql`SELECT COUNT(*) AS \`ct\` FROM ${bt(
      this.tableName
    )} ${where}`;
    const result = await this.selectMany<{ ct: bigint }>(
      query,
      {
        ct: 'bigint'
      },
      input.queryTag
    );

    return result.rows[0] ? result.rows[0].ct : 0n;
  }
  async count(input: ModelInputWithWhere<M>): Promise<number> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - count`;
    }
    const ct = await this.countBigInt(input);
    if (ct > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(
        'count returned a number greater than Number.MAX_SAFE_INTEGER'
      );
    }
    return Number(ct);
  }
}

export class TableDatabase<
  M extends Record<string, unknown>,
  ModelSelectAll extends { [K in keyof M]?: M[K] },
  PrimaryKey extends { [K in keyof M]?: M[K] },
  CreateData extends { [K in keyof M]?: M[K] },
  UpdateData extends { [K in keyof M]?: M[K] },
  FindUniqueParams extends { [K in keyof M]?: M[K] }
> extends ViewDatabase<M, ModelSelectAll> {
  get primaryKeys(): (keyof M & string)[] {
    return this.fields.filter((f) => f.isPrimaryKey).map((f) => f.fieldName);
  }

  protected get jsonKeys(): (keyof M & string)[] {
    return this.fields
      .filter((f) => f.castType === 'json')
      .map((f) => f.fieldName);
  }

  protected get setKeys(): (keyof M & string)[] {
    return this.fields
      .filter((f) => f.castType === 'set')
      .map((f) => f.fieldName);
  }

  protected get autoIncrementingPrimaryKey(): (keyof M & string) | null {
    const field = this.fields.find((f) => f.isAutoIncrement);
    return field ? field.fieldName : null;
  }

  async findUnique<S extends ModelSelectColumnsInput<M> = undefined>(input: {
    where: FindUniqueParams;
    select?: S;
    queryTag?: string;
  }): Promise<SelectedModel<M, S, ModelSelectAll> | null> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - findUnique`;
    }
    return await this.findFirst(input);
  }
  async findUniqueOrThrow<
    S extends ModelSelectColumnsInput<M> = undefined
  >(input: {
    where: FindUniqueParams;
    select?: S;
    queryTag?: string;
  }): Promise<SelectedModel<M, S, ModelSelectAll>> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - findUniqueOrThrow`;
    }
    return await this.findFirstOrThrow(input);
  }

  async createMany(input: {
    data: CreateData[];
    queryTag?: string;
  }): Promise<ExecutedQuery> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - createMany`;
    }
    const rawColumnNamesSet: Set<string> = input.data.reduce((acc, c) => {
      const s = new Set(acc);
      Object.keys(c).forEach((k) => s.add(k));
      return s;
    }, new Set<string>());
    const rawColumnNames = Array.from(rawColumnNamesSet);
    const columnNames: Sql[] = rawColumnNames.map((c) => bt(c));
    const inserts: Sql[] = input.data.map((record) => {
      const insertValues: Sql[] = [];
      rawColumnNames.forEach((c) => {
        if (record[c] === null) {
          insertValues.push(raw('NULL'));
        } else {
          if (this.jsonKeys.includes(c)) {
            insertValues.push(sql`${JSON.stringify(record[c])}`);
          } else if (this.setKeys.includes(c) && record[c] instanceof Set) {
            const stringValue: string = Array.from(
              (record[c] as Set<string>).values()
            ).join(',');
            insertValues.push(sql`${stringValue}`);
          } else {
            insertValues.push(sql`${record[c]}`);
          }
        }
      });
      return sql`(${join(insertValues, ',')})`;
    });
    const statement = sql`
      INSERT INTO ${bt(this.tableName)} 
        (${join(columnNames)})
        VALUES 
        ${join(inserts, ',\n')}
    `;
    return await this.execute(statement, undefined, input.queryTag);
  }

  async create(input: {
    data: CreateData;
    queryTag?: string;
  }): Promise<PrimaryKey> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - create`;
    }
    const names: Sql[] = [];
    const insertValues: Sql[] = [];
    const data: Partial<M> = input.data || {};
    const keys = Object.keys(data);
    keys.forEach((k) => {
      names.push(bt(this.tableName, k));
      if (data[k] === null) {
        insertValues.push(raw('NULL'));
      } else {
        if (this.jsonKeys.includes(k)) {
          insertValues.push(sql`${JSON.stringify(data[k])}`);
        } else if (this.setKeys.includes(k) && data[k] instanceof Set) {
          const stringValue: string = Array.from(
            (data[k] as Set<string>).values()
          ).join(',');
          insertValues.push(sql`${stringValue}`);
        } else {
          insertValues.push(sql`${data[k]}`);
        }
      }
    });
    const namesSql = names.length > 0 ? join(names) : empty;
    const valuseSql = insertValues.length > 0 ? join(insertValues) : empty;
    const query = sql`INSERT INTO ${bt(
      this.tableName
    )} (${namesSql}) VALUES (${valuseSql})`;
    const executedQuery = await this.execute(query, undefined, input.queryTag);
    const autoGeneratedPrimaryKey = this.autoIncrementingPrimaryKey;
    let primaryKey: PrimaryKey;
    if (autoGeneratedPrimaryKey) {
      primaryKey = {
        [autoGeneratedPrimaryKey]: executedQuery.insertId as string
      } as PrimaryKey;
    } else {
      primaryKey = this.primaryKeys.reduce((acc, k) => {
        return { ...acc, [k]: input.data[k] };
      }, {}) as PrimaryKey;
    }
    return primaryKey;
  }

  async updateWhere(input: ModelUpdateInput<M>): Promise<ExecutedQuery> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - updateWhere`;
    }
    const keys = Object.keys(input.data);
    const updates: Sql[] = keys.map((k) => {
      if (input.data[k] === null) {
        return sql`${bt(this.tableName, k)} = NULL`;
      } else if (this.jsonKeys.includes(k)) {
        return sql`${bt(this.tableName, k)} = ${JSON.stringify(input.data[k])}`;
      } else if (this.setKeys.includes(k) && input.data[k] instanceof Set) {
        const stringValue: string = Array.from(
          (input.data[k] as Set<string>).values()
        ).join(',');
        return sql`${bt(this.tableName, k)} = ${stringValue}`;
      } else {
        return sql`${bt(this.tableName, k)} = ${input.data[k]}`;
      }
    });
    const updateSql = join(updates);
    const where = getWhere(input, this.tableName);
    const query = sql`UPDATE ${bt(this.tableName)} SET ${updateSql} ${where}`;
    return await this.execute(query);
  }

  async update(input: {
    data: UpdateData;
    where: PrimaryKey;
    queryTag?: string;
  }): Promise<ExecutedQuery> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - update`;
    }
    return await this.updateWhere(input);
  }

  async deleteWhere(
    input: ModelInputWithWhereRequired<M>
  ): Promise<ExecutedQuery> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - deleteWhere`;
    }
    const where = getWhere(input, this.tableName);
    const query = sql`DELETE FROM ${bt(this.tableName)} ${where}`;
    return await this.execute(query, undefined, input.queryTag);
  }

  async delete(input: {
    where: PrimaryKey;
    queryTag?: string;
  }): Promise<ExecutedQuery> {
    if (!input.queryTag) {
      input.queryTag = `${this.model.modelName} - deleteWhere`;
    }
    return this.deleteWhere(input);
  }
}
