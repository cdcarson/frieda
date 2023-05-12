import type { ExtendedSchema } from '../parse/types.js';

export const getDatabaseTs = (
  extendedSchema: ExtendedSchema,
  bannerComment: string
): string => {
 
  return `
    ${bannerComment}
    import type { Transaction, Connection } from '@planetscale/database';
    import { BaseDb, ModelDb, type DbLoggingOptions } from '@nowzoo/frieda';
    import schema from './schema.js';
    import type {
      ${extendedSchema.models.flatMap(m => {
        return [
          m.dbTypeName
        ]
      }).join(',')}
    } from './types.js';
    export abstract class ModelsDb extends BaseDb {
      #models: Partial<{
        ${extendedSchema.models
          .map((m) => {
            return `${m.classGetterName}: ${m.dbTypeName}`;
          })
          .join('\n')}
      }> = {};

      ${extendedSchema.models
        .map((m) => {
          

          return `
            get ${m.classGetterName}(): ${m.dbTypeName} {
              if (! this.#models.${m.classGetterName}) {
                this.#models.${m.classGetterName} = new ModelDb('${m.modelName}', this.connOrTx, schema, this.loggingOptions)
              }
              return this.#models.${m.classGetterName} 
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
