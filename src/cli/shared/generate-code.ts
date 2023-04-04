import _ from 'lodash';
import type {
  FullTextSearchIndexes,
  Model,
  ModelSchema
} from '../../api/shared.server';
import type {
  GeneratedCode,
  RawSchema,
  ResolvedFriedaVars
} from './types';

const constNames = {
  schemaCasts: 'schemaCasts',
  searchIndexes: 'searchIndexes'
};

export const generateCode = (
  modelSchemas: ModelSchema<Model>[],
  vars: ResolvedFriedaVars
): GeneratedCode => {
  const bannerComment = `
    /**
     * Generated by frieda on ${new Date().toUTCString()}
     * To regenerate run "frieda g"
     */
  `;
  return {
    models: getModelsCode(modelSchemas, vars, bannerComment),
    database: getDatabaseCode(modelSchemas, vars, bannerComment),
    constants: getConstantsCode(modelSchemas, bannerComment)
  };
};

const getModelsCode = (
  modelSchemas: ModelSchema<Model>[],
  vars: ResolvedFriedaVars,
  bannerComment: string
): string => {
  const declarations: string[] = [];
  modelSchemas.forEach((m) => {
    const names = getModelNames(m);
    declarations.push('', `// Model ${m.modelName}`);
    declarations.push(`
      export type ${m.modelName} = {
        ${m.fields
          .map((f) => {
            return `${f.name}: ${f.javascriptType}${
              f.nullable ? '|null' : ''
            };`;
          })
          .join('\n')}
      }
    `);

    declarations.push(`
      export type ${names.primaryKey} =  {
        ${m.fields
          .filter((c) => c.isPrimaryKey)
          .map((c) => {
            return `${c.name}: ${c.javascriptType};`;
          })
          .join('\n')}
      }
    `);
    declarations.push(`
      export type ${names.createData} = {
        ${m.fields
          .filter((c) => {
            return !c.isGeneratedAlways;
          })
          .map((c) => {
            const optional = c.isDefaultGenerated || c.nullable;
            return `${c.name}${optional ? '?' : ''}: ${c.javascriptType};`;
          })
          .join('\n')}
      }
    `);
    declarations.push(`
      export type ${names.updateData} = {
        ${m.fields
          .filter((c) => {
            return !c.isGeneratedAlways && !c.isPrimaryKey;
          })
          .map((c) => {
            return `${c.name}?: ${c.javascriptType};`;
          })
          .join('\n')}
      }
    `);
    const uniqueDefs = m.fields
      .filter((c) => c.isUnique)
      .map((c) => `{${c.name}: ${c.javascriptType}}`);
    uniqueDefs.unshift(names.primaryKey);
    declarations.push(`
      export type ${names.findUniqueParams} = ${uniqueDefs.join('|')}
    `);
    declarations.push(`
      export type ${names.modelRepo} = ModelRepo<
      ${m.modelName},
      ${names.primaryKey},
      ${names.createData},
      ${names.updateData},
      ${names.findUniqueParams}
      >
    `);
    const def = JSON.stringify(m).replaceAll(
      /"databaseType"\s*:\s*"([^"]+)"/g,
      'databaseType:SimplifiedDatabaseType.$1'
    );
    declarations.push(`export const ${names.modelSchemaDef}:ModelSchema<${m.modelName}> = ${def}`);
  });
  return `
    ${bannerComment} 

    import { type ModelRepo, type ModelSchema, SimplifiedDatabaseType } from '@nowzoo/frieda';

    // type imports defined in .friedarc...
    ${vars.externalTypeImports.join('\n')}

    ${declarations.join('\n')}
  `;
};

const getConstantsCode = (
  modelSchemas: ModelSchema<Model>[],
  bannerComment: string
): string => {
  const searchIndexes: FullTextSearchIndexes = {};
  modelSchemas
    .flatMap((m) => m.fullTextSearchIndexes)
    .forEach((index) => (searchIndexes[index.indexKey] = index));

  return `
    ${bannerComment}

    import type { SchemaCasts, FullTextSearchIndexes } from '@nowzoo/frieda';

    export const ${constNames.schemaCasts}: SchemaCasts = {
      ${modelSchemas
        .flatMap((m) => {
          return m.fields.map((f) => {
            return `'${m.tableName}.${f.name}': SimplifiedDatabaseType.${f.databaseType},`;
          });
        })
        .join('\n')}
    }

    export const ${
      constNames.searchIndexes
    }: FullTextSearchIndexes = ${JSON.stringify(searchIndexes)}
  `;
};

const getDatabaseCode = (
  modelSchemas: ModelSchema<Model>[],
  vars: ResolvedFriedaVars,
  bannerComment: string
): string => {
  return `
    ${bannerComment}
    import { AbstractDb, ModelRepo, SimplifiedDatabaseType, type DbLoggingOptions } from '@nowzoo/frieda';
    import type {
      Connection,
      Transaction
    } from '@planetscale/database';

  

    import {
      ${modelSchemas
        .flatMap((m) => {
          const { modelRepo, modelSchemaDef } = getModelNames(m);
          return [ `type ${modelRepo}`, modelSchemaDef];
        })
        .join(',')}
    } from './models.js'
    import { ${constNames.schemaCasts} } from './constants.js';

    abstract class ModelRepos extends AbstractDb {
      private repos: Partial<{
        ${modelSchemas
          .map((m) => {
            const names = getModelNames(m);
            return `${names.classAccessor}: ${names.modelRepo};`;
          })
          .join(`\n`)}
      }> = {};
      constructor(
        connOrTx: Connection | Transaction,
        loggingOptions: DbLoggingOptions = {}
      ) {
        super(connOrTx, schemaCasts, loggingOptions)
      }
      ${modelSchemas.map((m) => {
        const names = getModelNames(m);
        return `
          get ${names.classAccessor}(): ${names.modelRepo} {
            if (! this.repos.${names.classAccessor}) {
              this.repos.${names.classAccessor} = new ModelRepo(
                ${names.modelSchemaDef},
                this.connection,
                ${constNames.schemaCasts},
                this.loggingOptions
              )
            }
            return this.repos.${names.classAccessor};
          }
        `;
      }).join('\n')}
    }
    

    class TxDb extends ModelRepos {
      constructor(
        transaction: Transaction,
        loggingOptions: DbLoggingOptions = {}
      ) {
          super(transaction, loggingOptions)
        }
      }
    

    export class AppDb extends ModelRepos {
      constructor(
        private conn: Connection,
        loggingOptions: DbLoggingOptions = {}
      ) {
          super(conn, loggingOptions)
        }
      
      async transaction<T>(txFn: (txDb: TxDb) => Promise<T>) {
        const result = await this.conn.transaction(async (tx) => {
          const txDb = new TxDb(tx, this.loggingOptions);
          return await txFn(txDb);
        });
        return result;
      }
    }
    
  `;
};

type ModelNames = {
  primaryKey: string;
  createData: string;
  updateData: string;
  findUniqueParams: string;
  modelRepo: string;
  classAccessor: string;
  modelSchemaDef: string;
};

const getModelNames = (m: ModelSchema<Model>): ModelNames => {
  return {
    primaryKey: `${m.modelName}PrimaryKey`,
    createData: `${m.modelName}CreateData`,
    updateData: `${m.modelName}UpdateData`,
    findUniqueParams: `${m.modelName}FindUniqueParams`,
    modelRepo: `${m.modelName}ModelRepo`,
    classAccessor: _.camelCase(m.modelName),
    modelSchemaDef: `${_.camelCase(m.modelName)}ModelSchema`
  };
};
