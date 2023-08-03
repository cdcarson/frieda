
import type {
  FetchedSchema,
  ParsedField,
  ParsedModel,
  ParsedSchema
} from './types.js';
import { fmtPath, log, squishWords } from './utils.js';
import ora from 'ora';
import type {
  FieldDefinition,
  ModelDefinition,
  SchemaCastMap,
  SchemaDefinition
} from '$lib/index.js';
import { FilesIO } from './files-io.js';

export const generateCode = async (
  parsedSchema: ParsedSchema,
  fetchedSchema: FetchedSchema,
  tableCreateStatements: string[]
) => {
  const writeSpinner = ora(`Generating code...`).start();
  const files = FilesIO.get();
  const savedPrevious = await files.writeOutput(
    getSchemaDefinitionDTsCode(parsedSchema, fetchedSchema),
    getGeneratedDatabaseJsCode(parsedSchema, fetchedSchema),
    getGeneratedModelsDTsCode(parsedSchema, fetchedSchema),
    parsedSchema,
    fetchedSchema,
    tableCreateStatements
  )
  
  writeSpinner.succeed(`Code generated.`);
  if (savedPrevious.length > 0) {
    log.info(['Previous schema info:', ...savedPrevious.map(p => `- ${fmtPath(p)}`)])
  }

  log.info([
    'Current schema info:',
    `- ${fmtPath(files.infoSchemaSqlPath)}`,
    `- ${fmtPath(files.infoSchemaJSONPath)}`
  ]);

  log.info([
    'Schema definition file updated:',
    `- ${fmtPath(files.schemaDefinitionPath)}`
  ]);
  log.info([
    'Generated code:',
    `- ${fmtPath(files.generatedModelsFilePath)}`,
    `- ${fmtPath(files.generatedDatabaseFilePath)}`
  ]);
  
};

export const getSchemaDefinitionDTsCode = (
  parsedSchema: ParsedSchema,
  fetchedSchema: FetchedSchema
): string => {
  const files = FilesIO.get();

  const code = `
  /**
   * Schema from database: ${fetchedSchema.databaseName}
   * Fetched: ${fetchedSchema.fetched.toISOString()}
   * 
   * Edit this file to modify javascript field types. 
   * 
   * Notes:
   * 
   * - Don't export the model types here. They are only used
   *   to calculate the actual types in ${files.schemaDefinitionPath}.
   *   Application code should import them from there, not here.
   * 
   * - Don't use top level import declaration(s) to import 
   *   external types. Such imports cannot be preserved. Instead
   *   use import types. Example:
   * 
   *      type Bar = {
   *        // import from a project path...
   *        foo: import('../api.js').Foo;
   *        // import from a library
   *        stripeCustomer: import('stripe').Stripe.Customer
   *      }
   *  
   * - This file is regenerated every time you run \`frieda\` based 
   *   on (1) your edits here and (2) the current database schema.
   *   Previous versions of this file are saved in the
   *   ${files.infoHistoryDirectoryPath} directory.
   */

  ${parsedSchema.models
    .map((m) => {
      const fields = m.fields
        .map((f) => `${f.fieldName}: ${f.javascriptType};`)
        .join('\n');
      return `type ${m.modelName} = {
        ${fields}
      }`;
    })
    .join('\n\n')}
  `;

  return code;
};

export const getGeneratedModelsDTsCode = (
  parsedSchema: ParsedSchema,
  fetchedSchema: FetchedSchema
): string => {
  const schema = fixRelativeImportTypes(parsedSchema);
  const decls = schema.models
    .flatMap((m) => {
      if (m.type === 'BASE TABLE') {
        return [
          getModelTypeDeclaration(m as ParsedModel<'BASE TABLE'>),
          getSelectAllTypeDeclaration(m as ParsedModel<'BASE TABLE'>),
          getPrimaryKeyTypeDeclaration(m as ParsedModel<'BASE TABLE'>),
          getCreateTypeDeclaration(m as ParsedModel<'BASE TABLE'>),
          getUpdateTypeDeclaration(m as ParsedModel<'BASE TABLE'>),
          getFindUniqueTypeDeclaration(m as ParsedModel<'BASE TABLE'>),
          getBaseTableDbTypeDeclaration(m as ParsedModel<'BASE TABLE'>)
        ];
      } else if (m.type === 'VIEW') {
        return [
          getModelTypeDeclaration(m),
          getViewDbTypeDeclaration(m as ParsedModel<'VIEW'>)
        ];
      }
    })
    .join('\n');
  const files = FilesIO.get()
  const code = `
  /**
   * Schema from database: ${fetchedSchema.databaseName}
   * Fetched: ${fetchedSchema.fetched.toISOString()} 
   * 
   * Generated by frieda. 
   * 
   * Do not edit this file. Edit ${files.schemaDefinitionPath} instead 
   * and re-run \`frieda\`
   */
  import type {ModelDb, ViewDb} from './api/index.js';

  ${decls}

  export type DatabaseModels = {
    ${schema.models
      .map((m) => {
        return `${m.appDbKey}: ${m.dbTypeName};`;
      })
      .join('\n')}
  }
  `;

  return code;
};

export const fixRelativeImportTypes = (
  unmodified: ParsedSchema
): ParsedSchema => {
  const modified = structuredClone(unmodified);
  const oneDotRx = /(^import\s*\(\s*["'])(\.\/)(.*)/;
  const twoDotRx = /(^import\s*\(\s*["'])(\.\.\/)(.*)/;
  const maybeFix = (javascriptType: string): string => {
    if (oneDotRx.test(javascriptType)) {
      const fixed = javascriptType.replace(oneDotRx, '$1../$3');
      return fixed;
    }
    if (twoDotRx.test(javascriptType)) {
      const fixed = javascriptType.replace(twoDotRx, '$1../$2$3');
      return fixed;
    }
    return javascriptType;
  };
  modified.models.forEach((m) => {
    m.fields.forEach((f) => {
      f.javascriptType = maybeFix(f.javascriptType);
    });
  });
  return modified;
};

export const getModelTypeDeclaration = (model: ParsedModel): string => {
  const props: string[] = [];
  const notes: string[] = [];
  for (const f of model.fields) {
    if (f.isInvisible) {
      notes.push(`- ${f.fieldName} is **optional** (column is \`INVISIBLE\`)`);
    }
    const orNull = f.isNullable ? '|null' : '';
    const opt = f.isInvisible ? '?' : '';
    props.push(`${f.fieldName}${opt}:${f.javascriptType}${orNull}`);
  }
  const desc = squishWords(
    `
    The base model type for \`${model.modelName}\`.
    Fields where the underlying column is \`INVISIBLE\` are **optional**
    in this type, since they are omitted when the model is queried with \`SELECT *\`.
    `,
    60
  )
    .split(`\n`)
    .map((s) => s.trim());
  const commentLines = [...desc, ...notes];
  const comment = [`/**`, ...commentLines.map((s) => ` * ${s}`), ` */`].join(
    '\n'
  );
  const declaration = `export type ${model.modelName} = {
    ${props.join(';\n')}
  }`;
  return [comment, declaration].join('\n');
};

export const getSelectAllTypeDeclaration = (
  model: ParsedModel<'BASE TABLE'>
): string => {
  const props: string[] = [];
  const notes: string[] = [];
  for (const f of model.fields) {
    if (f.isInvisible) {
      notes.push(`- ${f.fieldName} is **omitted** (column is \`INVISIBLE\`)`);
    } else {
      const orNull = f.isNullable ? '|null' : '';
      const opt = f.isInvisible ? '?' : '';
      props.push(`${f.fieldName}${opt}:${f.javascriptType}${orNull}`);
    }
  }
  const desc = squishWords(
    `
    Represents the data returned when the \`${model.modelName} model is
    queried with \`SELECT *\`. Fields where the underlying column 
    is \`INVISIBLE\` are omitted from this type.
    `,
    60
  )
    .split(`\n`)
    .map((s) => s.trim());
  const commentLines = [...desc, ...notes];

  const comment = [`/**`, ...commentLines.map((s) => ` * ${s}`), ` */`].join(
    '\n'
  );
  const declaration = `export type ${model.selectAllTypeName} = {
    ${props.join(';\n')}
  }`;
  return [comment, declaration].join('\n');
};

export const getPrimaryKeyTypeDeclaration = (
  model: ParsedModel<'BASE TABLE'>
): string => {
  const props: string[] = [];
  const notes: string[] = [];
  for (const f of model.fields) {
    if (f.isPrimaryKey) {
      notes.push(`- ${f.fieldName} is a primary key`);
      props.push(`${f.fieldName}:${f.javascriptType}`);
    }
  }
  const desc = squishWords(
    `
      The primary key type for the \`${model.modelName} model.
      This is returned when you create a model and is used to select models by primary key.
    `,
    60
  )
    .split(`\n`)
    .map((s) => s.trim());
  const commentLines = [...desc, ...notes];
  const comment = [`/**`, ...commentLines.map((s) => ` * ${s}`), ` */`].join(
    '\n'
  );
  const declaration = `export type ${model.primaryKeyTypeName} = {
    ${props.join(';\n')}
  }`;
  return [comment, declaration].join('\n');
};

export const getCreateTypeDeclaration = (
  model: ParsedModel<'BASE TABLE'>
): string => {
  const props: string[] = [];
  const notes: string[] = [];
  for (const f of model.fields) {
    if (f.isGeneratedAlways) {
      notes.push(`- ${f.fieldName} is **omitted** (column is \`GENERATED\`)`);
    } else {
      if (f.isAutoIncrement) {
        notes.push(
          `${f.fieldName} is **optional** (column is \`auto_increment\`)`
        );
      } else if (f.hasDefault) {
        notes.push(
          `${f.fieldName} is **optional** (column has a default value)`
        );
      }
      const opt = f.hasDefault || f.isAutoIncrement ? '?' : '';
      const orNull = f.isNullable ? '|null' : '';
      props.push(`${f.fieldName}${opt}:${f.javascriptType}${orNull}`);
    }
  }
  const desc = squishWords(
    `
    Data passed to create a new \`${model.modelName}\` model. Fields where
    the underlying column is \`GENERATED\` are omitted. Fields where the underlying column is \`auto_increment\` or has a
    default value are optional.
     
    `,
    60
  )
    .split(`\n`)
    .map((s) => s.trim());
  const commentLines = [...desc, ...notes];
  const comment = [`/**`, ...commentLines.map((s) => ` * ${s}`), ` */`].join(
    '\n'
  );
  const declaration = `export type ${model.createTypeName} = {
    ${props.join(';\n')}
  }`;
  return [comment, declaration].join('\n');
};

export const getUpdateTypeDeclaration = (
  model: ParsedModel<'BASE TABLE'>
): string => {
  const props: string[] = [];
  const notes: string[] = [];
  for (const f of model.fields) {
    if (f.isGeneratedAlways) {
      notes.push(`- ${f.fieldName} is **omitted** (column is \`GENERATED\`)`);
    } else if (f.isPrimaryKey) {
      notes.push(`- ${f.fieldName} is **omitted** (column is a primary key)`);
    } else {
      const orNull = f.isNullable ? '|null' : '';
      props.push(`${f.fieldName}?:${f.javascriptType}${orNull}`);
    }
  }

  const desc = squishWords(
    `
      Data passed to update an existing \`${model.modelName}\` model. Fields where
      the underlying column is \`GENERATED\` or is a primary key are omitted.
      All other fields are optional
     
    `,
    60
  )
    .split(`\n`)
    .map((s) => s.trim());

  const commentLines = [...desc, ...notes];
  const comment = [`/**`, ...commentLines.map((s) => ` * ${s}`), ` */`].join(
    '\n'
  );
  const declaration = `export type ${model.updateTypeName} = {
    ${props.join(';\n')}
  }`;
  return [comment, declaration].join('\n');
};

export const getFindUniqueTypeDeclaration = (
  model: ParsedModel<'BASE TABLE'>
): string => {
  const uniqueTypes: string[] = [model.primaryKeyTypeName];
  const notes: string[] = [];
  for (const index of model.indexes.filter(
    (i) => i.isUnique && i.indexName !== 'PRIMARY'
  )) {
    const propSigs = index.indexedColumns.map((c) => {
      const f = model.fields.find((f) => f.columnName === c) as ParsedField;
      return `${f.fieldName}:${f.javascriptType}`;
    });
    uniqueTypes.push(`{${propSigs.join('\n')}}`);
    notes.push(`Unique index \`${index.indexName}\``);
  }
  const desc = squishWords(
    `
      Type representing how to uniquely select a \`${model.modelName}\` model. 
      This includes the \`${model.primaryKeyTypeName}\` primary key type plus 
      types derived from the table's other unique indexes.
    `,
    60
  )
    .split(`\n`)
    .map((s) => s.trim());
  const commentLines = [...desc, ...notes];
  const comment = [`/**`, ...commentLines.map((s) => ` * ${s}`), ` */`].join(
    '\n'
  );

  const declaration = `export type ${
    model.findUniqueTypeName
  }=${uniqueTypes.join('|')}`;
  return [comment, declaration].join('\n');
};

export const getBaseTableDbTypeDeclaration = (
  model: ParsedModel<'BASE TABLE'>
): string => {
  const desc = squishWords(
    `
      Database type for the \`${model.modelName}\` model. 
    `,
    60
  )
    .split(`\n`)
    .map((s) => s.trim());
  const commentLines = [...desc];
  const comment = [`/**`, ...commentLines.map((s) => ` * ${s}`), ` */`].join(
    '\n'
  );
  const els = [
    model.modelName,
    model.selectAllTypeName,
    model.primaryKeyTypeName,
    model.createTypeName,
    model.updateTypeName,
    model.findUniqueTypeName
  ];
  const declaration = `export type ${model.dbTypeName}=ModelDb<${els.join(
    ','
  )}>`;
  return [comment, declaration].join('\n');
};

export const getViewDbTypeDeclaration = (
  model: ParsedModel<'VIEW'>
): string => {
  const desc = squishWords(
    `
      Database type for the \`${model.modelName}\` model. 
    `,
    60
  )
    .split(`\n`)
    .map((s) => s.trim());
  const commentLines = [...desc];
  const comment = [`/**`, ...commentLines.map((s) => ` * ${s}`), ` */`].join(
    '\n'
  );
  const els = [model.modelName];
  const declaration = `export type ${model.dbTypeName}=ViewDb<${els.join(
    ','
  )}>`;
  return [comment, declaration].join('\n');
};

export const getGeneratedDatabaseJsCode = (
  parsedSchema: ParsedSchema,
  fetchedSchema: FetchedSchema
): string => {
  const cast: SchemaCastMap = {};
  parsedSchema.models.forEach((m) => {
    m.fields.forEach((f) => {
      const key = [m.tableName, f.columnName].join('.');
      cast[key] = f.castType;
    });
  });
  const schema: SchemaDefinition = {
    databaseName: fetchedSchema.databaseName,
    cast,
    models: parsedSchema.models.map((m) => {
      const md: ModelDefinition = {
        modelName: m.modelName,
        tableName: m.tableName,
        fields: m.fields.map((f) => {
          const fd: FieldDefinition = {
            fieldName: f.fieldName,
            columnName: f.columnName,
            castType: f.castType,
            hasDefault: f.hasDefault,
            isAutoIncrement: f.isAutoIncrement,
            isPrimaryKey: f.isPrimaryKey,
            mysqlBaseType: f.mysqlBaseType
          };
          return fd;
        })
      };
      return md;
    })
  };
  const files = FilesIO.get()
  const code = `
    /**
     * Schema from database: ${fetchedSchema.databaseName}
     * Fetched: ${fetchedSchema.fetched.toISOString()} 
     * 
     * Generated by frieda. 
     * 
     * Do not edit this file. Edit ${files.schemaDefinitionPath} instead 
     * and re-run \`frieda\`.
     */
    import {
      BaseDb, ModelDb
    } from './api/index.js';
    
    /** @type {import('./api/index.js').SchemaDefinition} */
    export const schema = ${JSON.stringify(schema)}

    export class ModelsDb extends BaseDb {
      /** @type {Partial<import('./models.js').DatabaseModels>} */
      #models = {};

      /**
       * @param {import('@planetscale/database').Connection|import('@planetscale/database').Transaction} conn 
       * @param {import('./api/index.js').SchemaDefinition} schema 
       * @param {import('./api/index.js').DbLoggingOptions} loggingOptions 
       */
      constructor(
        conn,
        schema,
        loggingOptions = {}
      ) {
        super(conn, schema, loggingOptions);
        
      }
      ${parsedSchema.models
        .map((m) => {
          return `
          /** @returns {import('./models.js').${m.dbTypeName}} */
          get ${m.appDbKey}() {
            if (! this.#models.${m.appDbKey}) {
              this.#models.${m.appDbKey} = new ModelDb('${m.modelName}', this.connOrTx, schema, this.loggingOptions);
            }
            return this.#models.${m.appDbKey};
          }
          `;
        })
        .join('\n\n')}
    }

    export class TxDb extends ModelsDb {
      /**
       * @param {import('@planetscale/database').Transaction} transaction 
       * @param {import('./api/index.js').DbLoggingOptions} loggingOptions 
       */
      constructor(transaction, loggingOptions = {}) {
        super(transaction, schema, loggingOptions);
      }
    }
    
    export class AppDb extends ModelsDb {
      /** @type {import('@planetscale/database').Connection} */
      #conn;
    
      /**
       * @param {import('@planetscale/database').Connection} connection 
       * @param {import('./api/index.js').DbLoggingOptions} loggingOptions 
       */
      constructor(connection, loggingOptions = {}) {
        super(connection, schema, loggingOptions);
        this.#conn = connection;
      }
      /**
       * @param {<T>(txDb: TxDb) => Promise<T>} txFn 
       * @returns 
       */
      async transaction(txFn) {
        const result = await this.#conn.transaction(async (tx) => {
          const txDb = new TxDb(tx, this.loggingOptions);
          return await txFn(txDb);
        });
        return result;
      }
    }

    `;

  return code;
};
