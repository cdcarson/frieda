import type {
  Connection,
  ExecutedQuery,
  Transaction
} from '@planetscale/database';
import sql, { join, raw, type Sql } from 'sql-template-tag';
import type {
  DbLoggingOptions,
  FieldDefinition,
  Model,
  ModelOrderByInput,
  ModelDefinition,
  ModelSelectColumnsInput,
  ModelWhereInput,
  OneBasedPagingInput,
  SchemaCast
} from '$lib/types.js';
import {
  bt,
  getLimitOffset,
  getOrderBy,
  getWhere
} from '$lib/utils/sql-utils.js';
import { AbstractDb } from './abstract-db.js';

export class ModelRepo<
  M extends Model,
  PrimaryKey extends { [K in keyof M]?: M[K] },
  CreateData extends { [K in keyof M]?: M[K] },
  UpdateData extends { [K in keyof M]?: M[K] },
  FindUniqueParams extends { [K in keyof M]?: M[K] }
> extends AbstractDb {
  constructor(
    private _def: ModelDefinition,
    connOrTx: Connection | Transaction,
    schemaCast: SchemaCast,
    loggingOptions: DbLoggingOptions = {}
  ) {
    super(connOrTx, schemaCast, loggingOptions);
  }

  protected get def(): ModelDefinition {
    return this._def;
  }
  protected get tableName(): string {
    return this.def.tableName;
  }

  protected get fields(): FieldDefinition[] {
    return this.def.fields;
  }

  protected get keys(): (keyof M & string)[] {
    return this.fields.map((f) => f.fieldName);
  }

  protected get primaryKeys(): (keyof M & string)[] {
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
    const f = this.fields.find((f) => f.isPrimaryKey && f.isAutoIncrement);
    return f ? f.fieldName : null;
  }

  async findMany(input: {
    where?: ModelWhereInput<M>;
    paging?: OneBasedPagingInput;
    orderBy?: ModelOrderByInput<M>;
    select?: ModelSelectColumnsInput<M>;
  }): Promise<M[]> {
    const where = getWhere(input.where, this.tableName);
    const orderBy = getOrderBy(input.orderBy, this.tableName);
    const limit = getLimitOffset(input.paging);
    const select =
      Array.isArray(input.select) && input.select.length > 0
        ? input.select.map((k) => bt(this.tableName, k))
        : raw('*');
    const query = sql`
        SELECT
          ${select}
        FROM
          ${bt(this.tableName)} 
        ${where} 
        ${orderBy} 
        ${limit}`;
    const { rows } = await this.executeSelect<M>(query);
    return rows;
  }

  async findFirst(input: {
    where: Partial<M> | Sql;
    orderBy?: ModelOrderByInput<M> | Sql;
    select?: ModelSelectColumnsInput<M>;
  }): Promise<M | null> {
    const rows = await this.findMany({
      ...input,
      paging: { page: 1, rpp: 1 }
    });
    return rows[0] || null;
  }

  async findFirstOrThrow(input: {
    where: Partial<M> | Sql;
    orderBy?: ModelOrderByInput<M>;
    select?: ModelSelectColumnsInput<M>;
  }): Promise<M> {
    const result = await this.findFirst(input);
    if (!result) {
      throw new Error('findFirstOrThrow failed to find a record.');
    }
    return result;
  }
  async findUnique(input: {
    where: FindUniqueParams;
    select?: ModelSelectColumnsInput<M>;
  }): Promise<M | null> {
    return await this.findFirst(input);
  }
  async findUniqueOrThrow(input: {
    where: FindUniqueParams;
    select?: ModelSelectColumnsInput<M>;
  }): Promise<M> {
    return await this.findFirstOrThrow(input);
  }
  async countBigInt(input: { where: ModelWhereInput<M> }): Promise<bigint> {
    const where = getWhere(input.where, this.tableName);
    const query = sql`
      SELECT 
        COUNT(*) AS \`ct\` 
      FROM ${bt(this.tableName)}  
      ${where}
    `;
    const result = await this.executeSelect<{ ct: bigint }>(query, {
      ct: 'bigint'
    });
    return result.rows[0] ? result.rows[0].ct : 0n;
  }
  async count(input: { where: ModelWhereInput<M> }): Promise<number> {
    const ct = await this.countBigInt(input);
    if (ct > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(
        'count returned a number greater than Number.MAX_SAFE_INTEGER'
      );
    }
    return Number(ct);
  }

  async create(input: { data: CreateData }): Promise<PrimaryKey> {
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

    const query = sql`INSERT INTO ${bt(this.tableName)} (${join(
      names
    )}) VALUES (${join(insertValues)})`;
    const executedQuery = await this.execute(query);
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

  async updateWhere(input: {
    data: UpdateData;
    where: ModelWhereInput<M> | Sql;
  }): Promise<ExecutedQuery> {
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

    const where = getWhere(input.where, this.tableName);
    const query = sql`UPDATE ${bt(this.tableName)} SET ${join(
      updates
    )} WHERE ${where}`;
    return await this.execute(query);
  }

  async update(input: {
    data: UpdateData;
    where: PrimaryKey;
  }): Promise<ExecutedQuery> {
    return await this.updateWhere(input);
  }

  async deleteWhere(input: {
    where: ModelWhereInput<M> | Sql;
  }): Promise<ExecutedQuery> {
    const where = getWhere(input.where, this.tableName);
    const query = sql`DELETE FROM ${bt(this.tableName)} WHERE ${where}`;
    return await this.execute(query);
  }

  async delete(input: { where: PrimaryKey }): Promise<ExecutedQuery> {
    return this.deleteWhere(input);
  }
}
