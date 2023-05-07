import type { ModelDefinition } from '$lib/index.js';
import { SCHEMA_CAST_CONST_NAME } from '../constants.js';
import type { Options } from '../types.js';

export const getDatabaseTypescript = (
  models: ModelDefinition[],
  options: Options,
  bannerComment: string
): string => {
  const typesTs = models
    .map((m) => {
      const modelTypeDecl = `export type ${m.modelName} = {
    ${m.fields
      .map((f) => {
        return `${f.fieldName}${f.isOmittableInModel ? '?' : ''}: ${
          f.javascriptType
        }${f.isNullable ? '|null' : ''};`;
      })
      .join(`\n`)}
  }`;
      const modelPrimaryKeyTypeDecl = `export type ${
        m.modelPrimaryKeyTypeName
      } = {
    ${m.fields
      .filter((f) => f.isPrimaryKey)
      .map((f) => {
        return `${f.fieldName}: ${f.javascriptType};`;
      })
      .join('\n')}
  }`;
      const modelCreateDataTypeDecl = `export type ${
        m.modelCreateDataTypeName
      } = {
    ${m.fields
      .filter((f) => !f.isOmittedFromCreateData)
      .map((f) => {
        return `${f.fieldName}${f.isOptionalInCreateData ? '?' : ''}: ${
          f.javascriptType
        }${f.isNullable ? '|null' : ''};`;
      })
      .join('\n')}
  }`;
      const modelUpdateDataTypeDecl = `export type ${
        m.modelUpdateDataTypeName
      } = {
    ${m.fields
      .filter((f) => !f.isOmittedFromUpdateData)
      .map((f) => {
        return `${f.fieldName}?: ${f.javascriptType}${
          f.isNullable ? '|null' : ''
        };`;
      })
      .join('\n')}
  }`;
      const modelFindUniqueTypeDecl = `export type ${
        m.modelFindUniqueParamsTypeName
      } = ${[
        m.modelPrimaryKeyTypeName,
        ...m.fields
          .filter((f) => f.isUnique)
          .map((f) => `{${f.fieldName}:${f.javascriptType}}`)
      ].join('|')}`;

      const modelRepoTypeDecl = `export type ${m.modelRepoTypeName} = ModelRepo<
        ${m.modelName},
        ${m.modelPrimaryKeyTypeName},
        ${m.modelCreateDataTypeName},
        ${m.modelUpdateDataTypeName},
        ${m.modelFindUniqueParamsTypeName}
      >`;
      return `
        /**
         * Types for the ${m.modelName} model
         */
        ${modelTypeDecl}
        ${modelPrimaryKeyTypeDecl}
        ${modelCreateDataTypeDecl}
        ${modelUpdateDataTypeDecl}
        ${modelFindUniqueTypeDecl}
        ${modelRepoTypeDecl}
      
        `;
    })
    .join('\n\n');
  const modelDefsTs = `


  ${models
    .map((m) => {
      return `export const ${
        m.modelDefinitionConstName
      }: ModelDefinition = ${JSON.stringify(m)}`;
    })
    .join('\n\n')}
`;
  const schemaCastTs = `
      export const ${SCHEMA_CAST_CONST_NAME} : SchemaCast = {
        ${models
          .flatMap((m) => {
            return m.fields.map(
              (f) => `'${m.tableName}.${f.columnName}': '${f.castType}'`
            );
          })
          .join(',\n')}
      }
  `;
  const classesTs = `
    export abstract class ReposDb extends AbstractDb {
      
      private repos: Partial<{
        ${models
          .map((m) => {
            return `${m.classRepoName}: ${m.modelRepoTypeName};`;
          })
          .join('\n')}
      }> = {};

      constructor(
        connOrTx: Connection | Transaction,
        loggingOptions: DbLoggingOptions = {}
      ) {
        super(connOrTx, ${SCHEMA_CAST_CONST_NAME}, loggingOptions)
      }

      ${models
        .map((m) => {
          return `get ${m.classRepoName} (): ${m.modelRepoTypeName} {
            if (! this.repos.${m.classRepoName}) {
              this.repos.${m.classRepoName} = new ModelRepo(
                ${m.modelDefinitionConstName}, 
                this.connection, 
                this.schemaCast, 
                this.loggingOptions
              )
            }
            return this.repos.${m.classRepoName};
          }`;
        })
        .join('\n\n')}
    }

    export class TxDb extends ReposDb {
      constructor(
        transaction: Transaction,
        loggingOptions: DbLoggingOptions = {}
      ){
        super(transaction, loggingOptions)
      }
    }
    

    export class AppDb extends ReposDb {
      constructor(private conn: Connection, loggingOptions: DbLoggingOptions = {}) {
        super(conn, loggingOptions);
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
  return `
  ${bannerComment}
  import type { Connection, Transaction } from '@planetscale/database';
  import { AbstractDb, ModelRepo, type ModelDefinition, type DbLoggingOptions, type SchemaCast } from '@nowzoo/frieda';
  ${options.typeImports.join('\n')}
  
  /**
   * Model Types
   */
  ${typesTs}

  /**
   * Model Definitions
   */
  ${modelDefsTs}

  /**
   * Schema cast function
   */
  ${schemaCastTs}


  /**
   * Classes
   */

  ${classesTs}

  
  `;
};
