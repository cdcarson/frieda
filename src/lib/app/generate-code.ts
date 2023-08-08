import type {
  DebugSchema,
  FetchedSchema,
  ParsedField,
  ParsedModel,
  ParsedSchema
} from './types.js';
import { fmtPath, log, squishWords } from './utils.js';
import ora from 'ora';
import type {
  FieldDefinition,
  FullTextSearchIndex,
  ModelDefinition,
  SchemaCastMap
} from '$lib/index.js';
import { FilesIO } from './files-io.js';
import { FRIEDA_VERSION } from '$lib/version.js';
import { join, basename, dirname } from 'node:path';
import { DEFAULT_PRETTIER_OPTIONS } from './constants.js';
import { format as fmtSql } from 'sql-formatter';
import type { Options } from './options.js';
import kleur from 'kleur';
import highlight from 'cli-highlight';
import prettier from 'prettier';

export const generateCode = async (
  options: Options,
  parsedSchema: ParsedSchema,
  fetchedSchema: FetchedSchema,
  tableCreateStatements: string[]
) => {
  const writeSpinner = ora(`Generating code...`).start();
  const files = FilesIO.get();

  const prevFilePaths = [
    join('.frieda-metadata', 'schema.json'),
    join('.frieda-metadata', 'schema.sql'),
    options.modelDefinitionFilePath
  ];

  const schemaHistoryFiles: { path: string; contents: string }[] = [];
  const prevFiles = await Promise.all(prevFilePaths.map((p) => files.read(p)));
  const gitIgnore = await files.read(join('.frieda-metadata', '.gitignore'));
  if (!gitIgnore.exists) {
    await files.write(join('.frieda-metadata', '.gitignore'), 'history');
  }
  if (prevFiles[0].exists) {
    try {
      const s: DebugSchema = JSON.parse(prevFiles[0].contents);
      if (s && s.fetchedSchema.fetchedAt) {
        const historyPath = join(
          '.frieda-metadata',
          'history',
          new Date(s.fetchedSchema.fetchedAt).toISOString()
        );
        prevFiles.forEach((p) => {
          schemaHistoryFiles.push({
            path: join(historyPath, basename(p.abspath)),
            contents: p.contents
          });
        });
      }
    } catch (error) {
      // ignore
    }
  }

  const debugSchema: DebugSchema = {
    fetchedSchema,
    parsedSchema
  };
  const schemaSql =
    `-- Database: ${
      fetchedSchema.databaseName
    } \n--Fetched: ${fetchedSchema.fetchedAt.toISOString()}\n\n` +
    tableCreateStatements
      .map((s) => s.trim())
      .map((s) => s.replace(/^CREATE.*VIEW/, 'CREATE VIEW'))
      .map((s) => `${s};`)
      .join('\n\n');
  const schemaFiles: { path: string; contents: string }[] = [
    {
      path: join('.frieda-metadata', 'schema.json'),
      contents: JSON.stringify(debugSchema)
    },
    {
      path: join('.frieda-metadata', 'schema.sql'),
      contents: fmtSql(schemaSql)
    }
  ];

  const schemaDefinitionFile: { path: string; contents: string } = {
    path: options.modelDefinitionFilePath,
    contents: getSchemaDefinitionDTsCode(parsedSchema)
  };
  const friedaFile: { path: string; contents: string } = {
    path: options.friedaFilePath,
    contents: getFriedaTsCode(parsedSchema)
  };

  await Promise.all(
    [
      schemaDefinitionFile,
      friedaFile,
      ...schemaFiles,
      ...schemaHistoryFiles
    ].map((o) => {
      return files.write(o.path, o.contents);
    })
  );

  const examplePath = join(options.outputDirectoryPath, 'get-db.js');
  const exampleCode = `
      // ${examplePath}
      // Example quick start code. Exports a function that returns a singleton ApplicationDatabase instance.

      import { connect } from '@planetscale/database';

      // Get the database URL variable (or the host, username, password variables.)
      // This is how you'd do it in SvelteKit...
      import { DATABASE_URL } from '$env/static/private';

      // Import the generated ApplicationDatabase class...
      import { ApplicationDatabase } from './frieda';

      /** @type {ApplicationDatabase|undefined} */
      let _appDb = undefined;

      /** @returns {ApplicationDatabase} */
      export const getDb = () => {
        if (!_appDb) {
          _appDb = new ApplicationDatabase(connect({ url: DATABASE_URL }));
        }
        return _appDb;
      };
  `;
  const examplePrettified = prettier.format(exampleCode, {
    ...DEFAULT_PRETTIER_OPTIONS,
    filepath: 'example.js'
  });
  const exampleCodeColorized = highlight.highlight(examplePrettified.trim(), {
    language: 'js'
  });

  const lineLength =
    Math.max(...examplePrettified.split(`\n`).map((s) => s.trim().length)) + 5;

  writeSpinner.succeed(`Code generated.`);
  console.log();
  log.info([
    'Current schema information files:',
    ...schemaFiles.map((o) => `- ${fmtPath(o.path)}`),
    ...(schemaHistoryFiles.length > 0
      ? [
          `${kleur.dim('- Previous schema saved to ')}${fmtPath(
            dirname(schemaHistoryFiles[0].path)
          )}`
        ]
      : [])
  ]);
  console.log();

  log.info([
    'Schema definition file updated:',
    `- ${fmtPath(schemaDefinitionFile.path)}`
  ]);
  log.info([
    'Frieda database file generated:',
    `- ${fmtPath(friedaFile.path)}`
  ]);
  console.log();
  log.info(['Quick start example:']);
  console.log(kleur.dim('-'.repeat(lineLength)));
  log.message(exampleCodeColorized.split('\n'), 0);
  console.log(kleur.dim('-'.repeat(lineLength)));
};

export const getFriedaTsCode = (schema: ParsedSchema): string => {
  const modelTypeDeclarations = schema.models
    .map((m) => {
      const declarations: string[] = [getModelTypeDeclaration(m)];
      switch (m.type) {
        case 'BASE TABLE':
          declarations.push(
            getSelectAllTypeDeclaration(m as ParsedModel<'BASE TABLE'>),
            getPrimaryKeyTypeDeclaration(m as ParsedModel<'BASE TABLE'>),
            getCreateTypeDeclaration(m as ParsedModel<'BASE TABLE'>),
            getUpdateTypeDeclaration(m as ParsedModel<'BASE TABLE'>),
            getFindUniqueTypeDeclaration(m as ParsedModel<'BASE TABLE'>),
            getBaseTableDbTypeDeclaration(m as ParsedModel<'BASE TABLE'>)
          );
          break;
        case 'VIEW':
          declarations.push(getViewDbTypeDeclaration(m as ParsedModel<'VIEW'>));
      }
      return [...declarations].join('\n');
    })
    .join('\n\n');

  const schemaCastMap: SchemaCastMap = {};
  schema.models.forEach((m) => {
    m.fields.forEach((f) => {
      const key = [m.tableName, f.columnName].join('.');
      schemaCastMap[key] = f.castType;
    });
  });

  const models: ModelDefinition[] = schema.models.map((m) => {
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
  });

  const searchIndexes: FullTextSearchIndex[] = schema.models.flatMap((m) => {
    const indexes = m.indexes
      ? m.indexes.filter((i) => i.isFullTextSearch)
      : [];
    return indexes.map((i) => {
      return {
        indexedFields: i.indexedColumns,
        key: i.indexName,
        tableName: m.tableName
      };
    });
  });
  const searchIndexConstants = searchIndexes
    .map((i) => {
      return `
      /**
       * Full text search index defined on table \`${i.tableName}\`.
       * Indexed fields: ${i.indexedFields.map((s) => `\`${s}\``).join(', ')}.
       */
      export const ${i.key}: FullTextSearchIndex = ${JSON.stringify(i)};
    `;
    })
    .join('\n\n');
  const code = `
    /**
     * Database:        ${schema.databaseName}
     * Schema Fetched:  ${schema.fetchedAt.toISOString()}
     * Frieda Version:  ${FRIEDA_VERSION}
     * 
     * Generated by frieda. Try not to edit this file. Instead:
     * - edit \`frieda-models.ts\` in this directory and/or
     * - re-run \`frieda\`.
     */

    import type {Connection, Transaction} from '@planetscale/database'
    import {
      BaseDatabase, 
      TableDatabase, 
      ViewDatabase,
      type DbLoggingOptions,
      type SchemaCastMap, 
      type SchemaDefinition,
      type FullTextSearchIndex
    } from 'frieda';
    

    /** Model Types **/

    ${modelTypeDeclarations}

    /** Schema Cast Map **/
    const schemaCastMap: SchemaCastMap = ${JSON.stringify(schemaCastMap)};

    /** Schema Definition */
    const applicationSchema: SchemaDefinition = {
      cast: schemaCastMap,
      models: ${JSON.stringify(models)}
    }

    /** Database Classes **/

    export class ModelsDatabase extends BaseDatabase {
      #models: Partial<{${schema.models
        .map((m) => `${m.appDbKey}: ${m.dbTypeName};`)
        .join('\n')}}> = {};

     
      constructor(
        conn: Connection|Transaction,
        schema: SchemaDefinition,
        loggingOptions: DbLoggingOptions = {}
      ) {
        super(conn, schema, loggingOptions);
        
      }
      ${schema.models
        .map((m) => {
          const dbConstructor =
            m.type === 'BASE TABLE' ? 'TableDatabase' : 'ViewDatabase';
          return `
          get ${m.appDbKey}(): ${m.dbTypeName} {
            if (! this.#models.${m.appDbKey}) {
              this.#models.${m.appDbKey} = new ${dbConstructor}('${m.modelName}', this.connOrTx, this.schema, this.loggingOptions);
            }
            return this.#models.${m.appDbKey};
          }
          `;
        })
        .join('\n\n')}
    }

    export class TransactionDatabase extends ModelsDatabase {
      constructor(transaction: Transaction, schema: SchemaDefinition, loggingOptions: DbLoggingOptions = {}) {
        super(transaction, schema, loggingOptions);
      }
    }

    export class ApplicationDatabase extends ModelsDatabase {
      #conn: Connection;
    
      constructor(connection: Connection, loggingOptions: DbLoggingOptions = {}) {
        super(connection, applicationSchema, loggingOptions);
        this.#conn = connection;
      }
   
      async transaction<T>(txFn: (txDb: TransactionDatabase) => Promise<T>): Promise<T> {
        const result = await this.#conn.transaction(async (tx) => {
          const txDb = new TransactionDatabase(tx, this.schema, this.loggingOptions);
          return await txFn(txDb);
        });
        return result;
      }
    }
    
    /** Search Indexes **/

    ${searchIndexConstants}
  `;
  return code;
};

export const getSchemaDefinitionDTsCode = (
  parsedSchema: ParsedSchema
): string => {
  const code = `
  /**
   * Database:        ${parsedSchema.databaseName}
   * Schema Fetched:  ${parsedSchema.fetchedAt.toISOString()}
   * Frieda Version:  ${FRIEDA_VERSION}
   * 
   * Edit this file to modify javascript field types. 
   * 
   * Notes:
   * 
   * - This file contains a "virtual" model type for each table and view in the 
   *   database. It's the primary source of truth for Frieda to generate the "real" 
   *   application model types found in \`frieda.ts\`.
   * 
   * - Edit this file to change the javascript type of model fields. Although the file 
   *   is regenerated each time you run \`freida\`, a change you make here is preserved,
   *   so long as the column or its table has not been dropped from the schema. Previous 
   *   versions are saved in .frieda-metadata/history. 
   * 
   * - The model types in this file are not (and cannot be) exported. This prevents your code 
   *   from importing the "virtual" types by accident. The types here only exist to be analyzed by Frieda.
   *   Changes made here do not automatically update the types in \`frieda.ts\`. You need to 
   *   re-run \`frieda\` for the changes to take effect.
   * 
   * - Field types in this file **should not** include \`|null\` or optionality (\`?\`), just the javascript 
   *   type. Frieda adds \`|null\` and optionality to the actual model types where appropriate.
   * 
   * - Top-level import declarations are not allowed. Such imports cannot be preserved. Use 
   *   inline \`import('foo').Bar\` statements instead:
   *   \`\`\`
   *   type StripeCustomer = {
   *      userId: string;
   *      customer: import('stripe').Stripe.Customer;
   *   }
   *   \`\`\`
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
  notes.push(
    '',
    `Database ${model.type === 'VIEW' ? 'view' : 'table'} name: ${
      model.tableName
    }`
  );
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
  const declaration = `export type ${model.dbTypeName}=TableDatabase<${els.join(
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
  const declaration = `export type ${model.dbTypeName}=ViewDatabase<${els.join(
    ','
  )}>`;
  return [comment, declaration].join('\n');
};
