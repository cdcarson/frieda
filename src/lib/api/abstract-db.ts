import type {
  CustomModelCast,
  DbLoggingOptions,
  Model,
  SchemaCast
} from '$lib/types';
import type {
  Connection,
  ExecutedQuery,
  Transaction
} from '@planetscale/database';
import type { Sql } from 'sql-template-tag';
import { createCastFunction } from './casting';

export abstract class AbstractDb {
  constructor(
    private _connOrTx: Connection | Transaction,
    private _schemaCast: SchemaCast,
    private _loggingOptions: DbLoggingOptions = {}
  ) {}

  protected get connection(): Connection | Transaction {
    return this._connOrTx;
  }

  protected get schemaCast(): SchemaCast {
    return this._schemaCast;
  }

  protected get loggingOptions(): DbLoggingOptions {
    return this._loggingOptions;
  }

  protected get performanceLogger(): (
    executedQuery: ExecutedQuery,
    roundTripMs: number
  ) => void {
    return (
      this._loggingOptions.performanceLogger ||
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ((_e: ExecutedQuery, _t: number) => {
        /** noop */
      })
    );
  }

  protected get errorLogger(): (error: Error) => void {
    return (
      this._loggingOptions.errorLogger ||
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ((_e: Error) => {
        /** noop */
      })
    );
  }

  public async execute(
    query: Sql,
    customModelCast?: CustomModelCast<Model>
  ): Promise<ExecutedQuery> {
    try {
      const start = Date.now();
      const result = await this.connection.execute(query.sql, query.values, {
        as: 'object',
        cast: createCastFunction(this.schemaCast, customModelCast)
      });
      // noop by default, see getter
      this.performanceLogger(result, Date.now() - start);
      return result;
    } catch (error) {
      this.errorLogger(
        new Error('execute failed', {
          cause: {
            query: query,
            originalError: error
          }
        })
      );
      throw new Error(`Internal server error.`);
    }
  }

  public async executeSelect<M extends Model>(
    query: Sql,
    customModelCast?: CustomModelCast<M>
  ): Promise<{ executedQuery: ExecutedQuery; rows: M[] }> {
    const executedQuery = await this.execute(query, customModelCast);
    return { executedQuery, rows: executedQuery.rows as M[] };
  }
}
