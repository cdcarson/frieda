import type { FetchedSchema } from '$lib/fetch/types.js';
import {
  getModelClassGetterName,
  getModelDbTypeName,
  getModelName
} from '$lib/parse/model-parsers.js';

export const getDatabaseTs = (
  schema: FetchedSchema,
  bannerComment: string
): string => {
  return `
    ${bannerComment}
    import type { Transaction, Connection } from '@planetscale/database';
    import { BaseDb, ModelDb, type DbLoggingOptions, type Schema } from '@nowzoo/frieda';
    import schema from './schema.js';
    import type {
      ${schema.tables.map((t) => getModelDbTypeName(t)).join(',')}
    } from './types.js';
    export abstract class ModelsDb extends BaseDb {
      private models: Partial<{
        ${schema.tables
          .map((t) => {
            return `${getModelClassGetterName(t)}: ${getModelDbTypeName(t)}`;
          })
          .join('\n')}
      }>;

      constructor(
        conn: Connection | Transaction,
        schema: Schema,
        loggingOptions: DbLoggingOptions = {}
      ) {
        super(conn, schema, loggingOptions);
        this.models = {};
      }

      ${schema.tables
        .map((t) => {
          return `
            get ${getModelClassGetterName(t)}(): ${getModelDbTypeName(t)} {
              if (! this.models.${getModelClassGetterName(t)}) {
                this.models.${getModelClassGetterName(
                  t
                )} = new ModelDb('${getModelName(
            t
          )}', this.connOrTx, schema, this.loggingOptions)
              }
              return this.models.${getModelClassGetterName(t)} 
            }
          `;
        })
        .join('\n')}
    }

    export class TxDb extends ModelsDb {
      constructor(
        transaction: Transaction,
        loggingOptions: DbLoggingOptions = {}
      ) {
        super(transaction, schema, loggingOptions)
      }
    }

    export class AppDb extends ModelsDb {
      #conn: Connection;
      constructor(
        connection: Connection,
        loggingOptions: DbLoggingOptions = {}
      ) {
        super(connection, schema, loggingOptions);
        this.#conn = connection;
      }
      async transaction<T>(txFn: (txDb: TxDb) => Promise<T>) {
        const result = await this.#conn.transaction(async (tx) => {
          const txDb = new TxDb(tx, this.loggingOptions);
          return await txFn(txDb);
        });
        return result;
      }
    }
  `;
};
