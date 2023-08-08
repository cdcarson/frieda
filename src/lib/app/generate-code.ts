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
import {
  DEFAULT_PRETTIER_OPTIONS
} from './constants.js';
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
  const generatedFileBannerComment = (fileExplantion: string): string => {
    const lines = [
      `Database: ${fetchedSchema.databaseName}`,
      `Generated: ${fetchedSchema.fetched.toISOString()}`,
      `Frieda Version: ${FRIEDA_VERSION}`,
      '',
      'Generated by frieda. Do not edit this file.  ',
      `Instead, edit the file at ${options.schemaDefinitionPath}`,
      'and/or make changes to the database schema. Then re-run `frieda`.',
      '',
      ...squishWords(fileExplantion, 70).split('\n')
    ].map((s) => ` * ${s}`);
    return ['/**', ...lines, ' */'].join('\n');
  };

  const prevFilePaths = [
    join('.frieda-metadata', 'schema.json'),
    join('.frieda-metadata', 'schema.sql'),
    options.schemaDefinitionPath
  ];

  const schemaHistoryFiles: { path: string; contents: string }[] = [];
  const prevFiles = await Promise.all(prevFilePaths.map((p) => files.read(p)));
  const gitIgnore = await files.read(
    join('.frieda-metadata', '.gitignore')
  );
  if (!gitIgnore.exists) {
    await files.write(
      join('.frieda-metadata', '.gitignore'),
      'history'
    );
  }
  if (prevFiles[0].exists) {
    try {
      const s: DebugSchema = JSON.parse(prevFiles[0].contents);
      if (s && s.fetchedSchema.fetched) {
        const historyPath = join(
          '.frieda-metadata',
          'history',
          new Date(s.fetchedSchema.fetched).toISOString()
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
    } \n--Fetched: ${fetchedSchema.fetched.toISOString()}\n\n` +
    tableCreateStatements
      .map((s) => s.trim())
      .map((s) => s.replace(/^CREATE.*VIEW/, 'CREATE VIEW'))
      .map((s) => `${s};`)
      .join('\n\n');
  const schemaFiles: { path: string; contents: string }[] = [
    {
      path: join(
        '.frieda-metadata',
        'schema.json'
      ),
      contents: JSON.stringify(debugSchema)
    },
    {
      path: join(
        '.frieda-metadata',
        'schema.sql'
      ),
      contents: fmtSql(schemaSql)
    }
  ];

  const schemaDefinitionFile: { path: string; contents: string } = {
    path: options.schemaDefinitionPath,
    contents: getSchemaDefinitionDTsCode(options, parsedSchema, fetchedSchema)
  };
  const generatedFiles: { path: string; contents: string }[] = [
    {
      path: join(
        options.generatedDirectoryPath,
        'schema',
        'schema-cast-map.ts'
      ),
      contents: getGeneratedSchemaCastMapJsSourceCode(
        parsedSchema,
        generatedFileBannerComment
      )
    },
    {
      path: join(
        options.generatedDirectoryPath,
        'schema',
        'schema-definition.ts'
      ),
      contents: getGeneratedSchemaTsCode(
        parsedSchema,
        generatedFileBannerComment
      )
    },
    {
      path: join(
        options.generatedDirectoryPath,
        'search',
        'full-text-search-indexes.ts'
      ),
      contents: getSearchIndexesCode(parsedSchema, generatedFileBannerComment)
    },

    {
      path: join(options.generatedDirectoryPath, 'index.ts'),
      contents: getGeneratedIndexTsCode(generatedFileBannerComment)
    },
    {
      path: join(options.generatedDirectoryPath, 'models.d.ts'),
      contents: getGeneratedModelsDTsCode(
        parsedSchema,
        generatedFileBannerComment
      )
    },
    {
      path: join(
        options.generatedDirectoryPath,
        'database-classes',
        'application-database.ts'
      ),
      contents: getAppDbCode(generatedFileBannerComment)
    },
    {
      path: join(
        options.generatedDirectoryPath,
        'database-classes',
        'transaction-database.ts'
      ),
      contents: getTransactionsDbCode(generatedFileBannerComment)
    },
    {
      path: join(
        options.generatedDirectoryPath,
        'database-classes',
        'models-database.ts'
      ),
      contents: getModelsDbCode(parsedSchema, generatedFileBannerComment)
    }
  ];

  await files.emptyDir(options.generatedDirectoryPath);

  await Promise.all(
    [
      schemaDefinitionFile,
      ...generatedFiles,
      ...schemaFiles,
      ...schemaHistoryFiles
    ].map((o) => {
      return files.write(o.path, o.contents);
    })
  );

  const examplePath = join(options.outputDirectoryPath, 'get-db.js');
  const exampleCode = `
      // ${examplePath}
      // Example quick start code. Exports a function that 
      // returns a singleton ApplicationDatabase instance.

      import { connect } from '@planetscale/database';

      // Get the database URL variable (or the host, username, password variables.)
      // This is how you'd do it in SvelteKit...
      import { DATABASE_URL } from '$env/static/private';

      // Import the generated ApplicationDatabase class...
      import { ApplicationDatabase } from './generated';

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
  console.log();
  log.info([
    'Generated code files:',
    ...generatedFiles
      .map((o) => o.path)
      .sort()
      .map((p) => `- ${fmtPath(p)}`)
  ]);
  console.log();
  log.info(['Quick start example:']);
  console.log(kleur.dim('-'.repeat(lineLength)));
  log.message(exampleCodeColorized.split('\n'), 0);
  console.log(kleur.dim('-'.repeat(lineLength)));
};

export const getSchemaDefinitionDTsCode = (
  options: Options,
  parsedSchema: ParsedSchema,
  fetchedSchema: FetchedSchema
): string => {
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
   *   to calculate the actual types in generated/models.d.ts.
   *   Application code should import them from there, not here.
   * 
   * - Don't use top level import declaration(s) to import 
   *   external types. Such imports cannot be preserved. Instead
   *   use import types. Example:
   * 
   *      type Bar = {
   *        // import from a project path...
   *        foo: import('../api.ts').Foo;
   *        // import from a library
   *        stripeCustomer: import('stripe').Stripe.Customer
   *      }
   *  
   * - This file is regenerated every time you run \`frieda\` based 
   *   on (1) your edits here and (2) the current database schema.
   *   Previous versions of this file are saved in .frieda-metadata/history
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
  getGeneratedFileBannerComment: (explanation: string) => string
): string => {
  const bannerComment = getGeneratedFileBannerComment(`
    This files contains type definitions for the models in the schema.
  `);
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
  const code = `
  ${bannerComment}
  import type {TableDatabase, ViewDatabase} from 'frieda';

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

export const getGeneratedSchemaTsCode = (
  parsedSchema: ParsedSchema,
  getGeneratedFileBannerComment: (explanation: string) => string
) => {
  const bannerComment = getGeneratedFileBannerComment(`
    The generated schema definition.
  `);
  const models: ModelDefinition[] = parsedSchema.models.map((m) => {
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
  return `
    ${bannerComment}
    import type {SchemaDefinition} from 'frieda';
    import cast from './schema-cast-map.js'

    const schemaDefinition: SchemaDefinition = {
      cast,
      models: ${JSON.stringify(models)}
    }

    export default schemaDefinition;
  `;
};

export const getModelsDbCode = (
  parsedSchema: ParsedSchema,
  getGeneratedFileBannerComment: (explanation: string) => string
): string => {
  const bannerComment = getGeneratedFileBannerComment(`
    This file exports the \`ModelsDatabase\` class, 
    which provides a \`TableDatabase\` or \`ViewDatabase\` for each model in the database schema.
    It's not meant to be used on it's own. Instead it's extended by the generated database classes
    \`ApplicationDatabase\` (in \`./application-database.ts\`) and
    \`TransactionDatabase\` (in \`./transaction-database.ts\`.)
  `);

  return `
    ${bannerComment}
    import type {Connection, Transaction} from '@planetscale/database'
    import {
      BaseDatabase, TableDatabase, ViewDatabase, type SchemaDefinition, type DbLoggingOptions
    } from 'frieda';

    import type {
      DatabaseModels,
      ${
        parsedSchema.models.map(m => m.dbTypeName).join(',')
      
    }} from '../models.js';
     
    export class ModelsDatabase extends BaseDatabase {
      #models: Partial<DatabaseModels> = {};

     
      constructor(
        conn: Connection|Transaction,
        schema: SchemaDefinition,
        loggingOptions: DbLoggingOptions = {}
      ) {
        super(conn, schema, loggingOptions);
        
      }
      ${parsedSchema.models
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

    

    `;
};

export const getTransactionsDbCode = (
  getGeneratedFileBannerComment: (explanation: string) => string
): string => {
  const bannerComment = getGeneratedFileBannerComment(`
    This file exports the \`TransactionDatabase\` class.
    \`ApplicationDatabase\` creates an instance of this class to pass the function parameter in 
    its \`transaction(fn)\` method.
    
  `);

  return `
    ${bannerComment}
    import type { Transaction} from '@planetscale/database'
    import type {SchemaDefinition, DbLoggingOptions} from 'frieda';
    import { ModelsDatabase} from './models-database.js';

    export class TransactionDatabase extends ModelsDatabase {
      constructor(transaction: Transaction, schema: SchemaDefinition, loggingOptions: DbLoggingOptions = {}) {
        super(transaction, schema, loggingOptions);
      }
    }
    `;
};

export const getAppDbCode = (
  getGeneratedFileBannerComment: (explanation: string) => string
): string => {
  const bannerComment = getGeneratedFileBannerComment(`
    The main \`AplicationDatabase\` class. This is the class
    that should be instantiated by application code. 
  `);

  return `
    ${bannerComment}
    import type { Connection} from '@planetscale/database'
    import type { DbLoggingOptions} from 'frieda';
    import {ModelsDatabase} from './models-database.js';
    import { TransactionDatabase } from './transaction-database.js';
    import applicationSchema from '../schema/schema-definition.js';

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
   
    `;
};

export const getSearchIndexesCode = (
  parsedSchema: ParsedSchema,
  getGeneratedFileBannerComment: (explanation: string) => string
): string => {
  const bannerComment = getGeneratedFileBannerComment(`
  This file contains search indexes for use with \`getSearchSql\`.
`);
  const searchIndexes: FullTextSearchIndex[] = parsedSchema.models.flatMap(
    (m) => {
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
    }
  );
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
  return `
    ${bannerComment}
    import type { FullTextSearchIndex} from 'frieda';


    ${searchIndexConstants}`;
};

export const getGeneratedSchemaCastMapJsSourceCode = (
  parsedSchema: ParsedSchema,
  getGeneratedFileBannerComment: (explanation: string) => string
): string => {
  const bannerComment = getGeneratedFileBannerComment(`
  This file contains shared stuff.
`);

  const cast: SchemaCastMap = {};
  parsedSchema.models.forEach((m) => {
    m.fields.forEach((f) => {
      const key = [m.tableName, f.columnName].join('.');
      cast[key] = f.castType;
    });
  });

  return `
    ${bannerComment}
    import type { SchemaCastMap} from 'frieda';

    const schemaCastMap: SchemaCastMap = ${JSON.stringify(cast)};

    export default schemaCastMap;
    `;
};

export const getGeneratedIndexTsCode = (
  getGeneratedFileBannerComment: (explanation: string) => string
): string => {
  const banner = getGeneratedFileBannerComment('Exports generated code.');
  return `
    ${banner}

    export * from './models.d';
    export * from './database-classes/application-database.js';
    export * from './database-classes/models-database.js';
    export * from './database-classes/transaction-database.js';
    export * from './schema/schema-definition.js';
    export * from './schema/schema-cast-map.js';
    export * from './search/full-text-search-indexes.js';
  
  `;
};
