import type { Schema } from './schema.js';
import { format, type Options as PrettierOptions } from 'prettier';
import { blockComment, squishWords } from './utils.js';
import { tsquery } from '@phenomnomnominal/tsquery';
import type ts from 'typescript';
import type { CastType } from './types.js';
export class Code {
  #schema: Schema;
  #prettierOptions: PrettierOptions;
  constructor(schema: Schema, prettierOptions: PrettierOptions) {
    this.#schema = schema;
    this.#prettierOptions = prettierOptions;
  }

  get schema(): Schema {
    return this.#schema;
  }

  get prettierOptions(): PrettierOptions {
    return this.#prettierOptions;
  }

  getSchemaTs(): ts.SourceFile {
    const cast: {[k: string]: CastType} = this.schema.models.reduce((acc, m) => {
      const copy = {...acc};
      m.fields.forEach(f => {
        const key = `${m.tableName}.${f.columnName}`
        copy[key] = f.castType;
      });
      return copy
    }, {} as {[k: string]: CastType})
  }

  getDatabaseTs(): ts.SourceFile {
    const unprettified =  `
      import type { Transaction, Connection } from '@planetscale/database';
      import { BaseDb, ModelDb, type DbLoggingOptions, type Schema } from '@nowzoo/frieda';
      import schema from './schema.js';
      import type {
        ${this.schema.models.map((m) => m.dbTypeName).join(',')}
      } from './types.js';
      export abstract class ModelsDb extends BaseDb {
        private models: Partial<{
          ${this.schema.models
            .map((m) => {
              return `${m.appDbKey}: ${m.dbTypeName}`;
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

        ${this.schema.models
          .map((m) => {
            return `
              get ${m.appDbKey}(): ${m.dbTypeName} {
                if (! this.models.${m.appDbKey}) {
                  this.models.${m.appDbKey} = new ModelDb('${m.modelName}', this.connOrTx, schema, this.loggingOptions)
                }
                return this.models.${m.appDbKey} 
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
    const code = format(unprettified, {...this.prettierOptions, filepath: 'database.ts'})
    return tsquery.ast(code);
  }

  getTypesTs(): ts.SourceFile {
    const typeDeclarations = this.schema.models
      .map((m) => {
        const invisibleFields = m.fields.filter((f) => f.isInvisible);
        const generatedFields = m.fields.filter((f) => f.isGeneratedAlways);
        const baseModelComment = [
          `The base type for the ${m.modelName} model.`
        ];
        if (invisibleFields.length > 0) {
          baseModelComment.push(
            ...squishWords(
              `
            The following field${
              invisibleFields.length === 1 ? ' is' : 's are'
            } 
            optional in ${
              m.modelName
            } since the underlying column is \`INVISIBLE\`. \`INVISIBLE\`
            columns are not included in queries using \`SELECT *\`:
            `,
              70
            ).split('\n'),

            ...invisibleFields.map((f) => `- \`${f.fieldName}\``)
          );
        }

        const selectAllComment = [
          `The representation of the \`${m.modelName}\` model when fetched using \`SELECT *\`.`
        ];
        if (invisibleFields.length > 0) {
          selectAllComment.push(
            ...squishWords(
              `
            The following field${
              invisibleFields.length === 1 ? ' is' : 's are'
            } 
            omitted in ${
              m.selectAllTypeName
            } since the underlying column is \`INVISIBLE\`. \`INVISIBLE\`
            columns are not included in queries using \`SELECT *\`:
            `,
              70
            ).split('\n'),

            ...invisibleFields.map((f) => `- \`${f.fieldName}\``)
          );
        }

        const primaryKeyComment = squishWords(
          `
        The primary key type for ${m.modelName}. 
        This type is used to update and delete models, and is the return type
        when you create a ${m.modelName} model.
      `,
          70
        ).split('\n');

        const optionalInCreate = m.fields.filter(
          (f) => f.isAutoIncrement || f.hasDefault
        );
        const createComment = [
          `Data passed to create a new \`${m.modelName}\` model.`
        ];
        if (optionalInCreate.length > 0) {
          createComment.push(
            'Optional fields:',
            ...optionalInCreate.map((f) => {
              if (f.isAutoIncrement) {
                return `- \`${f.fieldName}\` (column is \`auto_increment\`)`;
              }
              return `- \`${f.fieldName}\` (column has a default value)`;
            })
          );
        }
        if (generatedFields.length > 0) {
          createComment.push(
            'Omitted fields:',
            ...generatedFields.map(
              (f) => `- \`${f.fieldName}\` (column is \`GENERATED\`)`
            )
          );
        }
        const omittedInUpdatePrimaryKeys = m.fields.filter(
          (f) => f.isPrimaryKey
        );
        const updateComment = [
          `Data passed to update an existing \`${m.modelName}\` model.`
        ];
        if (
          omittedInUpdatePrimaryKeys.length > 0 ||
          generatedFields.length > 0
        ) {
          createComment.push(
            'Omitted fields:',
            ...omittedInUpdatePrimaryKeys.map(
              (f) => `- \`${f.fieldName}\` (column is a primary key)`
            ),
            ...generatedFields.map(
              (f) => `- \`${f.fieldName}\` (column is \`GENERATED\`)`
            )
          );
        }

        const findUniqueComment = [
          `Type representing how to uniquely select a \`${m.modelName}\` model`,
          `including the \`${m.primaryKeyTypeName}\` primary key type`,
          `and any other unique indexes found in the table's schema.`
        ];
        const dbComment = [
          `The \`ModelDb\` type for the ${m.modelName} model. `
        ];

        return `
      /** ${m.modelName} types */

      ${blockComment(baseModelComment)}
      ${m.modelTypeDeclaration}

      ${blockComment(selectAllComment)}
      ${m.selectAllTypeDeclaration}

      ${blockComment(primaryKeyComment)}
      ${m.primaryKeyTypeDeclaration}

      ${blockComment(createComment)}
      ${m.createTypeDeclaration}

      ${blockComment(updateComment)}
      ${m.updateTypeDeclaration}

      ${blockComment(findUniqueComment)}
      ${m.findUniqueTypeDeclaration}

      ${blockComment(dbComment)}
      ${m.dbTypeDeclaration}
      
      `;
      })
      .join(`\n\n`);
    const tsCode = format(
      `
      import type {ModelDb} from '@nowzoo/frieda';

      ${typeDeclarations}
    `,
      { ...this.prettierOptions, filepath: 'types.d.ts' }
    );
    // const typeMap: { [t: string]: number } = {};
    return tsquery.ast(tsCode);
    // const nodes: ts.TypeAliasDeclaration[] = tsquery(
    //   ast,
    //   'TypeAliasDeclaration'
    // );
    // nodes.forEach((node) => {
    //   const name = node.name;
    //   typeMap[name.getText()] =
    //     ast.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    // });
  }
}
