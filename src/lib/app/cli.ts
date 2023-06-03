import kleur from 'kleur';
import { FileSystem } from './file-system.js';
import { Options } from './options.js';
import { Database } from './database.js';
import { connect } from '@planetscale/database';
import ora from 'ora';
import type {
  CliCommand,
  CliOptions,
  FetchedSchema,
  SchemaChange
} from './types.js';
import { Code } from './code.js';
import { Schema } from './schema.js';
import {
  fmtPath,
  fmtVal,
  fmtVarName,
  formatSql,
  getFieldColumnDefinition,
  getStdOutCols,
  log,
  maskDatabaseURLPassword,
  onUserCancelled,
  prompt,
  squishWords
} from './utils.js';
import { join, dirname, basename, resolve } from 'node:path';
import prettier from 'prettier';
import type { Model } from './model.js';
import {
  getAddFieldSql,
  getAddModelSql,
  getBulkEditModelFieldsSql,
  getDropFieldSql,
  getDropModelSql,
  getEditFieldManuallySql,
  getEditJsonAnnotationSql,
  getRenameFieldSql,
  getToggleBigIntAnnotationSql,
  getToggleInvisibleSql,
  getToggleSetAnnotationSql,
  getToggleTinyIntBooleanSql
} from './schema-changes.js';
import { edit } from 'external-editor';
import type { Field } from './field.js';
import { CURRENT_SCHEMA_JSON_FILE_NAME } from './constants.js';
import { tsquery } from '@phenomnomnominal/tsquery';
import type ts from 'typescript';
import { exec } from 'node:child_process';
import { temporaryDirectory } from 'tempy';
import fs from 'fs-extra';
import { MYSQL_TYPES, type MysqlBaseType } from '$lib/index.js';
import nodemon from 'nodemon'
type SchemaNext =
  | 'showSchema'
  | 'showGeneratedFiles'
  | 'showQuickStart'
  | 'showBuildOptions'
  | 'addModel'
  | 'showModel'
  | 'showFieldsByType'
  | 'done';

type ModelNext =
  | 'showModel'
  | 'showModelTypes'
  | 'showCreateTable'
  | 'addField'
  | 'editByHand'
  | 'dropModel'
  | 'showField'
  | 'showDifferentModel'
  | 'backToSchema'
  | 'done';

type FieldNext =
  | 'showField'
  | 'typeTinyInt'
  | 'typeBigInt'
  | 'typeJson'
  | 'typeSet'
  | 'rename'
  | 'setInvisible'
  | 'editByHand'
  | 'drop'
  | 'showDifferentField'
  | 'back'
  | 'done';

const SPECIAL_FIELD_TYPE_CHOICES = [
  {
    value: 'withJsonAnnotation',
    title: `${fmtVal('json')} columns with a ${kleur.red(
      '@json'
    )} type annotation (field typed via annotation)`
  },
  {
    value: 'withoutJsonAnnotation',
    title: `${fmtVal('json')} columns without a ${kleur.red(
      '@json'
    )} type annotation (typed as javascript ${fmtVal('unknown')})`
  },
  {
    value: 'withBigIntAnnotation',
    title: `${fmtVal('bigint')} columns with a ${kleur.red(
      '@bigint'
    )} type annotation (field typed as javascript ${fmtVal('bigint')})`
  },
  {
    value: 'withoutBigIntAnnotation',
    title: `${fmtVal('bigint')} columns without a ${kleur.red(
      '@bigint'
    )} type annotation (field typed as javascript ${fmtVal('string')})`
  },
  {
    value: 'withSetAnnotation',
    title: `${fmtVal('set')} columns with a ${kleur.red(
      '@set'
    )} type annotation (field typed as javascript ${fmtVal('Set')})`
  },
  {
    value: 'withoutSetAnnotation',
    title: `${fmtVal('set')} columns without a ${kleur.red(
      '@set'
    )} type annotation (field typed as javascript ${fmtVal('string')})`
  },
  {
    value: 'tinyIntTypedAsBoolean',
    title: `${fmtVal('tinyint(1)')} columns (field typed as javascript ${fmtVal(
      'boolean'
    )})`
  },
  {
    value: 'tinyIntTypedAsInt',
    title: `${fmtVal('tinyint')} columns other than  ${fmtVal(
      'tinyint(1)'
    )} (field typed as javascript ${fmtVal('number')})`
  },
  {
    value: 'unknown',
    title: `Fields with an unrecognized MySQL column type (typed as javascript ${fmtVal(
      'string'
    )})`
  }
] as const;

type FieldsByTypeChoice =
  | MysqlBaseType
  | (typeof SPECIAL_FIELD_TYPE_CHOICES)[number]['value'];

export class Cli {
  #cwd: string;
  #command: CliCommand;
  #fs: FileSystem;
  #options: Options;
  #database: Database | undefined;
  #fetchedSchema: FetchedSchema | undefined;
  #schema: Schema | undefined;
  #code: Code | undefined;
  constructor(cwd: string, command: CliCommand, cliOptions: CliOptions) {
    this.#cwd = cwd;
    this.#command = command;
    this.#fs = new FileSystem(cwd);
    this.#options = new Options(this.fs, cliOptions);
  }
  get fs(): FileSystem {
    return this.#fs;
  }
  get options(): Options {
    return this.#options;
  }

  get database(): Database {
    if (!this.#database) {
      this.#database = new Database(
        connect({ url: this.options.databaseDetails.databaseUrl })
      );
    }
    return this.#database;
  }

  get fetchedSchema(): FetchedSchema {
    if (!this.#fetchedSchema) {
      throw new Error('Schema not yet fetched');
    }
    return this.#fetchedSchema;
  }
  get schema(): Schema {
    if (!this.#schema) {
      throw new Error('Schema not yet fetched');
    }
    return this.#schema;
  }
  get code(): Code {
    if (!this.#code) {
      throw new Error('Code not yet generated');
    }
    return this.#code;
  }

  async execute() {
    await this.options.initialize(this.#cwd);
    await this.fetchSchema(undefined, this.options.skipFetch);
    await this.generateCode();
    if (this.#command === 'schema') {
      let model: Model | undefined;
      let field: Field | undefined;
      const modelSearch = this.options.model?.trim().toLowerCase() || '';
      const fieldSearch = this.options.field?.trim().toLowerCase() || '';

      if (modelSearch.length > 0) {
        const sortaExact = this.schema.models.filter((m) => {
          return (
            m.modelName.toLowerCase().indexOf(modelSearch) > -1 ||
            m.tableName.toLowerCase().indexOf(modelSearch) > -1
          );
        });
        if (sortaExact.length === 1) {
          model = sortaExact[0];
        }
      }

      if (fieldSearch.length > 0) {
        if (model) {
          const sortaExact = model.fields.filter((f) => {
            return (
              f.fieldName.toLowerCase().indexOf(fieldSearch) > -1 ||
              f.columnName.toLowerCase().indexOf(fieldSearch) > -1
            );
          });
          if (sortaExact.length === 1) {
            field = sortaExact[0];
          }
        } else {
          const sortaExact = this.schema.models.flatMap((m) => {
            return m.fields
              .filter((f) => {
                return (
                  f.fieldName.toLowerCase().indexOf(fieldSearch) > -1 ||
                  f.columnName.toLowerCase().indexOf(fieldSearch) > -1
                );
              })
              .map((f) => {
                return {
                  model: m,
                  field: f
                };
              });
          });
          if (sortaExact.length === 1) {
            model = sortaExact[0].model;
            field = sortaExact[0].field;
          }
        }
      }
      if (model && field) {
        return await this.showFieldScreen(model, field);
      }
      if (model) {
        if (this.options.field !== null) {
          field = await this.promptField(model, fieldSearch);
          return await this.showFieldScreen(model, field);
        }
        return await this.showModelScreen(model);
      }
      if (this.options.model !== null) {
        model = await this.promptModel(modelSearch);
        return await this.showModelScreen(model);
      }
      return await this.showSchemaOverviewScreen();
    }
    if (this.#command === 'explore') {
      const web = resolve(new URL(import.meta.url).pathname, '../../../build');
      const app = nodemon({
        script: `${web}/index.js`,
        ext: 'js json',
        env: {
          DB_URL: this.options.databaseDetails.databaseUrl,
          OUTPUT_DIRECTORY: this.fs.getPathResult(this.options.outputDirectory).absolutePath,
          SCHEMA_DIRECTORY: this.fs.getPathResult(this.options.schemaDirectory).absolutePath,
          COMPILE_JS: this.options.compileJs ? "true" : "false"
        }
      });
      
      
      // const foo = exec(
      //   `DB_URL=${this.options.databaseDetails.databaseUrl} nodemon ${web}/index`
      // );
      
    }
  }

  async fetchSchema(change?: SchemaChange, skipFetch = false): Promise<void> {
    if (skipFetch) {
      const p = join(
        this.options.schemaDirectory,
        CURRENT_SCHEMA_JSON_FILE_NAME
      );
      const readSpinner = ora(`Reading ${fmtPath(p)}`).start();
      const f = await this.fs.getFileResult(p);
      if (!f.isFile || !f.contents) {
        readSpinner.fail(fmtPath(p) + ' does not exist.');
        const fetchFromDb = await prompt<boolean>({
          type: 'confirm',
          name: 'f',
          message: 'Fetch schema from database?'
        });
        if (fetchFromDb) {
          return await this.fetchSchema();
        }
        return onUserCancelled();
      }
      try {
        this.#fetchedSchema = JSON.parse(f.contents);
        this.#schema = await Schema.create(
          this.fetchedSchema,
          this.options,
          this.fs,
          change
        );
        readSpinner.succeed('Schema read.');
        return;
      } catch (error) {
        readSpinner.fail(fmtPath(p) + ' is invalid.');
        console.log(error);
        const fetchFromDb = await prompt<boolean>({
          type: 'confirm',
          name: 'f',
          message: 'Fetch schema from database?'
        });
        if (fetchFromDb) {
          return await this.fetchSchema();
        }
        return onUserCancelled();
      }
    }
    const spinner = ora('Fetching schema').start();
    this.#fetchedSchema = await this.database.fetchSchema();
    this.#schema = await Schema.create(
      this.fetchedSchema,
      this.options,
      this.fs,
      change
    );
    spinner.succeed('Schema fetched.');
  }

  async generateCode() {
    const spinner = ora('Generating code').start();
    this.#code = await Code.create(this.schema, this.fs, this.options);
    spinner.succeed('Code generated.');
  }

  async promptSchemaNext(lastNext?: SchemaNext): Promise<void> {
    const choices: { title: string; value: SchemaNext }[] = [
      {
        title: `Show schema`,
        value: 'showSchema'
      },
      {
        title: `Show model in ${fmtVal(this.schema.databaseName)}`,
        value: 'showModel'
      },
      {
        title: `Add model to ${fmtVal(this.schema.databaseName)}`,
        value: 'addModel'
      },

      {
        title: 'Show fields by type',
        value: 'showFieldsByType'
      },

      {
        title: 'Show build options',
        value: 'showBuildOptions'
      },
      {
        title: 'Show generated files',
        value: 'showGeneratedFiles'
      },
      {
        title: 'Show quick start',
        value: 'showQuickStart'
      },

      {
        title: 'Done',
        value: 'done'
      }
    ];
    const initial = choices.findIndex((c) => c.value === lastNext);
    const next = await prompt<SchemaNext>({
      type: 'select',
      name: 'next',
      initial: Math.max(0, initial),
      choices,
      message: `Top: ${this.schema.databaseName}`
    });
    if ('showSchema' === next) {
      return await this.showSchemaOverviewScreen();
    }

    if ('showFieldsByType' === next) {
      return await this.showFieldsByTypeScreen();
    }

    if ('showGeneratedFiles' === next) {
      return await this.showGeneratedFilesScreen();
    }
    if ('showQuickStart' === next) {
      return await this.showQuickStartScreen();
    }
    if ('showBuildOptions' === next) {
      return await this.showBuildOptionsScreen();
    }

    if ('addModel' === next) {
      const { statement } = await getAddModelSql(this.schema);
      return await this.runSchemaChange(statement);
    }
    if ('showModel' === next) {
      const m = await this.promptModel();
      return await this.showModelScreen(m);
    }
  }

  async promptModelNext(m: Model, lastNext?: ModelNext): Promise<void> {
    const choices: { title: string; value: ModelNext }[] = [
      {
        title: 'Show model',
        value: 'showModel'
      },
      {
        title: `Show field in ${fmtVal(m.modelName)}`,
        value: 'showField'
      },

      {
        title: 'Show model types',
        value: 'showModelTypes'
      },
      {
        title: 'Show CREATE TABLE',
        value: 'showCreateTable'
      },

      {
        title: 'Add field to model',
        value: 'addField'
      },

      {
        title: 'Edit model by hand',
        value: 'editByHand'
      },

      {
        title: 'Drop model',
        value: 'dropModel'
      },

      {
        title: `Show another model in ${fmtVal(this.schema.databaseName)}`,
        value: 'showDifferentModel'
      },

      {
        title: `Back to ${fmtVal(this.schema.databaseName)}`,
        value: 'backToSchema'
      },

      {
        title: 'Done',
        value: 'done'
      }
    ];
    const initial = choices.findIndex((c) => c.value === lastNext);
    const next = await prompt<ModelNext>({
      type: 'select',
      name: 'next',
      initial: Math.max(0, initial),
      choices,
      message: `Model: ${fmtVal(m.modelName)}`
    });
    if ('done' === next) {
      return;
    }
    if ('showDifferentModel' === next) {
      const m = await this.promptModel();
      return await this.showModelScreen(m);
    }
    if ('showModel' === next) {
      return await this.showModelScreen(m);
    }
    if ('showCreateTable' === next) {
      return await this.showModelCreateTableScreen(m);
    }

    if ('showModelTypes' === next) {
      return await this.showModelTypesScreen(m);
    }

    if ('editByHand' === next) {
      const statement = getBulkEditModelFieldsSql(m);
      return await this.runSchemaChange(statement, m);
    }

    if ('dropModel' === next) {
      const statement = getDropModelSql(m);
      return await this.runSchemaChange(statement, m);
    }

    if ('addField' === next) {
      const { statement } = await getAddFieldSql(m);
      return await this.runSchemaChange(statement, m);
    }

    if ('showField' === next) {
      const field = await this.promptField(m);
      return await this.showFieldScreen(m, field);
    }

    if ('backToSchema' === next) {
      return await this.showSchemaOverviewScreen();
    }
  }

  async promptFieldNext(m: Model, f: Field): Promise<void> {
    const modifyChoices: { title: string; value: FieldNext }[] = [];
    modifyChoices.push({
      title: 'Edit field by hand',
      value: 'editByHand'
    });
    if (f.mysqlBaseType === 'tinyint') {
      if (f.isTinyIntOne) {
        modifyChoices.push({
          title: `Type as javascript ${fmtVal(
            'number'
          )} (change column type to ${fmtVal('tinyint')})`,
          value: 'typeTinyInt'
        });
      } else {
        modifyChoices.push({
          title: `Type as javascript ${fmtVal(
            'boolean'
          )} (change column type to ${fmtVal('tinyint(1)')})`,
          value: 'typeTinyInt'
        });
      }
    }
    if (f.mysqlBaseType === 'bigint') {
      if (f.bigIntAnnotation) {
        modifyChoices.push({
          title: `Type as javascript ${fmtVal('string')} (remove ${kleur.red(
            '@bigint'
          )} type annotation)`,
          value: 'typeBigInt'
        });
      } else {
        modifyChoices.push({
          title: `Type as javascript ${fmtVal('bigint')} (add ${kleur.red(
            '@bigint'
          )} type annotation)`,
          value: 'typeBigInt'
        });
      }
    }
    if (f.mysqlBaseType === 'json') {
      if (f.jsonAnnotation) {
        modifyChoices.push({
          title: `Edit or remove the ${kleur.red('@json')} type annotation`,
          value: 'typeJson'
        });
      } else {
        modifyChoices.push({
          title: `Add a ${kleur.red('@json')} type annotation`,
          value: 'typeJson'
        });
      }
    }

    if (f.mysqlBaseType === 'set') {
      if (f.setAnnotation) {
        modifyChoices.push({
          title: `Type as javascript ${fmtVal('string')} (remove ${kleur.red(
            '@set'
          )} type annotation)`,
          value: 'typeSet'
        });
      } else {
        modifyChoices.push({
          title: `Type as javascript ${fmtVal(
            `Set<${f.javascriptEnumerableStringType}>`
          )} (add ${kleur.red('@set')} type annotation)`,
          value: 'typeSet'
        });
      }
    }

    if (f.isInvisible) {
      modifyChoices.push({
        title: `Make field visible (remove ${kleur.red('INVISIBLE')})`,
        value: 'setInvisible'
      });
    } else {
      modifyChoices.push({
        title: `Make field invisible (add ${kleur.red('INVISIBLE')})`,
        value: 'setInvisible'
      });
    }
    modifyChoices.push({
      title: 'Drop field',
      value: 'drop'
    });

    const choices: { title: string; value: FieldNext }[] = [
      {
        title: `Show Field`,
        value: 'showField'
      },

      ...modifyChoices,
      {
        title: `Show another field in ${fmtVal(m.modelName)}`,
        value: 'showDifferentField'
      },
      {
        title: `Back to model ${fmtVal(m.modelName)}`,
        value: 'back'
      },

      {
        title: 'Done',
        value: 'done'
      }
    ];

    const next = await prompt<FieldNext>({
      type: 'select',
      name: 'next',
      choices,
      message: `Field: ${fmtVal(f.fieldName)}`
    });

    if (next === 'done') {
      return;
    }
    if ('showDifferentField' === next) {
      const f = await this.promptField(m);
      return await this.showFieldScreen(m, f);
    }
    if (next === 'showField') {
      return await this.showFieldScreen(m, f);
    }
    if ('typeTinyInt' === next) {
      const statement = getToggleTinyIntBooleanSql(m, f);
      return await this.runSchemaChange(statement, m, f);
    }
    if ('typeBigInt' === next) {
      const statement = getToggleBigIntAnnotationSql(m, f);
      return await this.runSchemaChange(statement, m, f);
    }
    if ('typeJson' === next) {
      const statement = await getEditJsonAnnotationSql(m, f);
      return await this.runSchemaChange(statement, m, f);
    }

    if ('typeSet' === next) {
      const statement = getToggleSetAnnotationSql(m, f);
      return await this.runSchemaChange(statement, m, f);
    }
    if ('setInvisible' === next) {
      const statement = getToggleInvisibleSql(m, f);
      return await this.runSchemaChange(statement, m, f);
    }
    if ('drop' === next) {
      const statement = getDropFieldSql(m, f);
      return await this.runSchemaChange(statement, m, f);
    }
    if ('editByHand' === next) {
      const statement = getEditFieldManuallySql(m, f);
      return await this.runSchemaChange(statement, m, f);
    }
    if ('rename' === next) {
      const { statement } = await getRenameFieldSql(m, f);
      return await this.runSchemaChange(statement, m, f);
    }

    if (next === 'back') {
      return await this.showModelScreen(m);
    }
  }

  async promptModel(modelName?: string): Promise<Model> {
    type Choice = {
      title: string;
      value: Model;
    };
    const choices: Choice[] = this.schema.models.map((m) => {
      return {
        title: m.modelName,
        value: m
      };
    });

    const suggest = (inp: string, choices: Choice[]) => {
      return choices.filter(
        (c) =>
          c.title.toLowerCase().startsWith(inp.toLowerCase()) ||
          c.value.tableName.toLowerCase().startsWith(inp.toLowerCase())
      );
    };
    const initialChoice = suggest(modelName || '', choices)[0] || choices[0];
    return (await prompt({
      type: 'autocomplete',
      name: 'model',
      message: 'Show Model',
      initial: initialChoice.title,
      choices,
      suggest: async (inp: string, choices) => {
        return suggest(inp, choices as Choice[]);
      }
    })) as unknown as Model;
  }

  async promptField(model: Model, partialName?: string): Promise<Field> {
    type Choice = {
      title: string;
      value: Field;
    };
    const choices: Choice[] = model.fields.map((f) => {
      return {
        title: f.fieldName,
        value: f
      };
    });

    const suggest = (inp: string, choices: Choice[]) => {
      return choices.filter(
        (c) =>
          c.title.toLowerCase().startsWith(inp.toLowerCase()) ||
          c.value.columnName.toLowerCase().startsWith(inp.toLowerCase())
      );
    };
    const initialChoice = suggest(partialName || '', choices)[0] || choices[0];
    const f = (await prompt({
      type: 'autocomplete',
      name: 'field',
      message: 'Field',
      initial: initialChoice.title,
      choices,
      suggest: async (inp: string, choices) => {
        return suggest(inp, choices as Choice[]);
      }
    })) as unknown as Field;
    return f;
  }

  async runSchemaChange(
    statement: string,
    existingModel?: Model,
    existingField?: Field
  ): Promise<void> {
    const onCancelled = async () => {
      if (existingModel) {
        if (existingField) {
          return await this.showFieldScreen(existingModel, existingField);
        }
        return await this.showModelScreen(existingModel);
      }
      return await this.showSchemaOverviewScreen();
    };
    const prettified = formatSql(statement);
    log.info([
      kleur.bold('Schema change'),
      ...prettified.split('\n').map((s) => kleur.red(s))
    ]);
    const goAhead = await prompt({
      type: 'confirm',
      name: 'goAhead',
      message: `Make this change?`
    });

    if (!goAhead) {
      return await onCancelled();
    }
    const existingModelNames = this.schema.models.map((m) => m.modelName);
    const existingFieldNames = existingModel
      ? existingModel.fields.map((f) => f.fieldName)
      : [];
    const spinner = ora('Running change').start();
    try {
      await this.database?.connection.execute(statement);

      spinner.succeed('Change made.');
    } catch (error) {
      spinner.fail(
        kleur.red('Schema change failed: ') + (error as Error).message
      );
      const editByHand = await prompt({
        message: 'Edit SQL by hand?',
        type: 'confirm',
        name: 'editByHand'
      });
      if (editByHand) {
        const edited = formatSql(edit(prettified));
        return await this.runSchemaChange(edited);
      }
      return await onCancelled();
    }
    await this.fetchSchema({
      changeSql: prettified,
      previousSchema: this.schema.fetchedSchema
    });
    await this.generateCode();
    let model: Model | undefined;
    let field: Field | undefined;
    if (existingModel) {
      model = this.schema.models.find(
        (m) => m.modelName === existingModel.modelName
      );
    }
    if (!model) {
      model = this.schema.models.find(
        (m) => !existingModelNames.includes(m.modelName)
      );
    }
    if (existingField) {
      if (model) {
        field = model.fields.find(
          (f) => f.fieldName === existingField.fieldName
        );
        if (!field) {
          field = model.fields.find(
            (f) => !existingFieldNames.includes(f.fieldName)
          );
        }
      }
    }
    if (model) {
      if (field) {
        return await this.showFieldScreen(model, field);
      }

      return await this.showModelScreen(model);
    }
    return await this.showSchemaOverviewScreen();
  }

  async showSchemaOverviewScreen(): Promise<void> {
    const sep = `Schema: ${this.schema.databaseName}`;
    log.screenSeparator(sep, true);
    this.showSchemaOverview();
    log.screenSeparator(sep, false);
    return await this.promptSchemaNext('showSchema');
  }

  showSchemaOverview() {
    log.message(kleur.bold('Schema'));
    log.table([
      ['Database name', fmtVal(this.schema.databaseName)],

      [
        `Database URL`,
        maskDatabaseURLPassword(this.options.databaseDetails.databaseUrl)
      ],
      [
        'Schema Last Fetched',
        new Date(this.schema.fetchedSchema.fetched).toLocaleString()
      ]
    ]);
    console.log();
    log.message(
      kleur.bold('Models') + kleur.dim(` (${this.schema.models.length})`)
    );
    console.log();
    log.table(
      [
        ...this.schema.models.map((m) => [
          fmtVal(m.modelName),
          kleur.dim(m.tableName)
        ])
      ],
      ['Model Name', 'Table Name']
    );
  }

  async showFieldsByTypeScreen(type?: FieldsByTypeChoice): Promise<void> {
    type Entry = {
      m: Model;
      f: Field;
      type: FieldsByTypeChoice;
    };
    const map = new Map<FieldsByTypeChoice, Entry[]>();
    for (const m of this.schema.models) {
      for (const f of m.fields) {
        let fieldByTypeKey: FieldsByTypeChoice | undefined;
        let mysqlTypeKey: MysqlBaseType | undefined;

        switch (f.mysqlBaseType) {
          case null:
            fieldByTypeKey = 'unknown';
            break;
          default:
            mysqlTypeKey = f.mysqlBaseType;
            break;
        }
        switch (f.mysqlBaseType) {
          case 'bigint':
            if (f.bigIntAnnotation) {
              fieldByTypeKey = 'withBigIntAnnotation';
            } else {
              fieldByTypeKey = 'withoutBigIntAnnotation';
            }
            break;
          case 'tinyint':
            if (f.isTinyIntOne) {
              fieldByTypeKey = 'tinyIntTypedAsBoolean';
            } else {
              fieldByTypeKey = 'tinyIntTypedAsInt';
            }
            break;
          case 'set':
            if (f.setAnnotation) {
              fieldByTypeKey = 'withSetAnnotation';
            } else {
              fieldByTypeKey = 'withoutSetAnnotation';
            }
            break;
          case 'json':
            if (f.jsonAnnotation) {
              fieldByTypeKey = 'withJsonAnnotation';
            } else {
              fieldByTypeKey = 'withoutJsonAnnotation';
            }
            break;
        }
        if (mysqlTypeKey) {
          const arr = map.get(mysqlTypeKey) || [];
          arr.push({ m, f, type: mysqlTypeKey });
          map.set(mysqlTypeKey, arr);
        }
        if (fieldByTypeKey) {
          const arr = map.get(fieldByTypeKey) || [];
          arr.push({
            m,
            f,
            type: fieldByTypeKey
          });
          map.set(fieldByTypeKey, arr);
        }
      }
    }

    const sortedEntries = [
      ...SPECIAL_FIELD_TYPE_CHOICES.map((c) => c.value).filter((k) =>
        map.has(k)
      ),
      ...MYSQL_TYPES.filter((k) => map.has(k)).sort()
    ].map((k) => map.get(k)) as unknown as Entry[][];

    const sep =`Fields by type| ${this.schema.databaseName}`;

    log.screenSeparator(sep, true);
    const entries: Entry[] = type ? map.get(type) || [] : [];
    if (entries.length === 0) {
      log.columnize(
        sortedEntries.map((entries) => {
          const entry = entries[0];
          const choice = SPECIAL_FIELD_TYPE_CHOICES.find(
            (c) => c.value === entry.type
          );

          const title = choice ? choice.title : `${fmtVal(entry.type)} columns`;
          return [kleur.bold(entries.length.toString()), title];
        })
      );
    } else {
      const entry = entries[0];
      const choice = SPECIAL_FIELD_TYPE_CHOICES.find(
        (c) => c.value === entry.type
      );

      log.message(kleur.bold(entries.length) + ' ' + (choice ? choice.title : `${fmtVal(entry.type)} columns`));
      console.log();
      log.columnize([
        [kleur.bold('Field'), kleur.bold('Javascript Type')],
        ...entries.map((d) => {
          return [
            fmtVal(d.m.modelName) + '.' + fmtVarName(d.f.fieldName),
            fmtVal(d.f.javascriptType) +
              kleur.dim(` (${d.f.jsTypeExplanation})`)
          ];
        })
      ]);
    }

    log.screenSeparator(sep, false);

    if (entries.length > 0) {

      
      const next = await prompt({
        type: 'select',
        message: `Show ${type} field`,
        name: 's',
        choices: [
          ...entries.map((d) => {
            return {
              title: fmtVal(d.m.modelName) + '.' + fmtVarName(d.f.fieldName),
              value: d
            };
          }),
          {
            title: 'Show a different type',
            value: `Show a different type`
          },
          {
            title: 'Back to schema',
            value: `Back to schema`
          },
          {
            title: 'Done',
            value: `Done`
          }
        ]
      });
      if (typeof next === 'string') {
        if (`Show a different type` === next) {
          return await this.showFieldsByTypeScreen();
        }
        if (`Back to schema` === next) {
          return await this.showSchemaOverviewScreen();
        }
        if (`Done` === next) {
          return;
        }
      }

      return await this.showFieldScreen((next as Entry).m, (next as Entry).f);
    }

    const next = await prompt({
      type: 'select',
      message: `Show fields by type`,
      name: 's',
      choices: [
        ...sortedEntries.map((entries) => {
          const entry = entries[0];
          const choice = SPECIAL_FIELD_TYPE_CHOICES.find(
            (c) => c.value === entry.type
          );

          const title = choice ? choice.title : `${fmtVal(entry.type)} columns`;
          return {
            title,
            value: entries[0].type
          };
        }),

        {
          title: 'Back to schema',
          value: `Back to schema`
        },
        {
          title: 'Done',
          value: `Done`
        }
      ]
    });
    if (`Back to schema` === next) {
      return await this.showSchemaOverviewScreen();
    }
    if (`Done` === next) {
      return;
    }
    return await this.showFieldsByTypeScreen(next as FieldsByTypeChoice);
  }

  async showBuildOptionsScreen(): Promise<void> {
    const sep = `Build Options`;
    log.screenSeparator(sep, true);
    this.showBuildOptions();
    log.screenSeparator(sep, false);
    return await this.promptSchemaNext('showBuildOptions');
  }

  showBuildOptions() {
    log.message(kleur.bold('Build Options'));
    log.table([
      [fmtVarName('envFile'), fmtPath(this.options.envFile)],
      [
        kleur.dim(' - Database URL'),
        maskDatabaseURLPassword(this.options.databaseDetails.databaseUrl)
      ],
      [
        kleur.dim(' - Environment Variable'),
        fmtVarName(this.options.databaseDetails.databaseUrlKey)
      ],
      [fmtVarName('outputDirectory'), fmtPath(this.options.outputDirectory)],
      [fmtVarName('schemaDirectory'), fmtPath(this.options.schemaDirectory)],
      [fmtVarName('compileJs'), fmtVal(JSON.stringify(this.options.compileJs))]
    ]);
  }

  async showQuickStartScreen() {
    const sep = `Quick Start`;
    log.screenSeparator(sep, true);
    this.showQuickstart();
    log.screenSeparator(sep, false);
    await this.promptSchemaNext('showQuickStart');
  }

  showQuickstart() {
    const fakeFileDir = dirname(this.options.outputDirectory);
    const fakeFilePath = join(
      fakeFileDir,
      'get-db.' + (this.options.compileJs ? 'js' : 'ts')
    );
    const top = `
    import { connect } from '@planetscale/database';
    // The AppDb class generated by frieda...
    import { AppDb } from './${basename(
      this.options.outputDirectory
    )}/database.js';
    // Modify the following to import the URL 
    // (or other environment variables) you need 
    // to create a database connection...
    import { ${
      this.options.databaseDetails.databaseUrlKey
    } } from '$env/static/private';
  `;
    const bot = `export default getDb;`;
    const c = this.options.compileJs
      ? `
  ${top}
  /** @type {AppDb|undefined} */
  let db;
  /**
   * @returns {AppDb}
   */
  const getDb = () => {
    if (!db) {
      const connection = connect({ url: DATABASE_URL })
      db = new AppDb(connection);
    }
    return db;
  };
  ${bot}
  `
      : `
  ${top}
  let db: AppDb|undefined;
  const getDb = ():AppDb => {
    if (!db) {
      const connection = connect({ url: DATABASE_URL })
      db = new AppDb(connection);
    }
    return db;
  };
  ${bot}
  `;
    const prettified = prettier
      .format(c, {
        ...this.options.prettierOptions,
        filepath: fakeFilePath,
        printWidth: 50,
        useTabs: false,
        semi: true
      })
      .trim();
    log.message([
      kleur.italic(`Copy this code to (for example) ${fmtPath(fakeFilePath)}`),
      '',
      ...prettified.split('\n').map((s) => kleur.gray(s))
    ]);
  }

  async showGeneratedFilesScreen() {
    const sep = `Generated Files`;
    log.screenSeparator(sep, true);
    this.showGeneratedFiles();
    log.screenSeparator(sep, false);
    await this.promptSchemaNext('showGeneratedFiles');
  }

  showGeneratedFiles() {
    log.message([
      kleur.bold('Code Files') +
        kleur.dim(` (directory: ${fmtPath(this.options.outputDirectory)})`),
      ...this.code.files.map((f) => `- ${fmtPath(f.relativePath)}`)
    ]);
    console.log();
    log.message([
      kleur.bold('Schema Files') +
        kleur.dim(` (directory: ${fmtPath(this.options.schemaDirectory)})`),
      ...[
        this.schema.currentSchemaSqlFile,
        this.schema.currentSchemaJsonFile
      ].map((f) => `- ${fmtPath(f.relativePath)}`)
    ]);
    if (this.schema.changeFiles.length > 0) {
      console.log();
      log.message([
        kleur.bold('Schema Change Files'),
        ...this.schema.changeFiles.map((f) => `- ${fmtPath(f.relativePath)}`)
      ]);
    }
  }

  async showModelScreen(m: Model): Promise<void> {
    const sep = `Model: ${m.modelName} | ${this.schema.databaseName}`;
    log.screenSeparator(sep, true);
    log.columnize([
      [kleur.bold('Model Name'), fmtVal(m.modelName)],
      [kleur.bold('Table Name'), kleur.dim(m.tableName)],
      [
        kleur.bold('Primary Key(s)'),
        m.fields
          .filter((f) => f.isPrimaryKey)
          .map((f) => fmtVarName(f.fieldName))
          .join(', ')
      ]
    ]);
    console.log();
    log.message(kleur.bold('Fields') + kleur.dim(` (${m.fields.length})`));

    log.columnize([
      [kleur.underline('Field'), kleur.underline('Column')],
      ...m.fields.map((f) => [
        fmtVarName(f.fieldName),
        kleur.gray(getFieldColumnDefinition(m, f))
      ])
    ]);

    console.log();
    log.message(kleur.bold('Javascript Field Types'));
    log.columnize([
      [kleur.underline('Field'), kleur.underline('Javascript Type')],
      ...m.fields.map((f) => [
        fmtVarName(f.fieldName),
        fmtVal(f.javascriptType) + kleur.dim(` (${f.jsTypeExplanation})`)
      ])
    ]);

    log.screenSeparator(sep, false);
    return await this.promptModelNext(m, 'showModel');
  }
  async showModelCreateTableScreen(m: Model): Promise<void> {
    const sep = `Create Table | Model: ${m.modelName} | ${this.schema.databaseName}`;
    log.screenSeparator(sep, true);
    log.message(m.table.createSql.split('\n').map((s) => kleur.gray(s)));
    log.screenSeparator(sep, false);
    return await this.promptModelNext(m, 'showCreateTable');
  }

  async showModelTypesScreen(m: Model): Promise<void> {
    const ast = tsquery.ast(this.code.typesDFile.contents);
    const nodes: ts.TypeAliasDeclaration[] = tsquery(
      ast,
      'TypeAliasDeclaration'
    );
    const sep = `Model Types | Model: ${m.modelName} | ${this.schema.databaseName}`;
    log.screenSeparator(sep, true);
    const decls = [
      m.modelTypeDeclaration,
      m.selectAllTypeDeclaration,
      m.primaryKeyTypeDeclaration,
      m.createTypeDeclaration,
      m.updateTypeDeclaration,
      m.findUniqueTypeDeclaration
    ];
    decls.forEach((decl, i) => {
      const node = nodes.find((n) => n.name.getText() === decl.typeName);

      const code = prettier
        .format(node?.getText() || '', {
          ...this.options.prettierOptions,
          filepath: 't.ts',
          printWidth: Math.min(60, getStdOutCols() - 10),
          useTabs: false
        })
        .trim();
      const p = fmtPath(this.code.getTypesDFileLink(decl.typeName));
      const notes = (
        Array.isArray(decl.notes) ? decl.notes : Object.values(decl.notes || {})
      ).flatMap((n) => {
        const normalized = squishWords(n).split('\n');
        return normalized.map((s, i) => (i === 0 ? `- ${s}` : `  ${s}`));
      });
      if (notes.length > 0) {
        notes.unshift(kleur.italic('Notes:'));
      }

      log.message([
        fmtVal(decl.typeName) + ' ' + p,
        ...squishWords(decl.description).split('\n'),
        ...notes
      ]);
      console.log();
      log.message(code.split('\n').map((s) => kleur.gray(s)));
      if (i < decls.length - 1) {
        console.log();
      }
    });
    log.screenSeparator(sep, false);
    return await this.promptModelNext(m, 'showModelTypes');
  }

  async showFieldScreen(m: Model, f: Field) {
    const sep = `Field: ${f.fieldName} | Model: ${m.modelName} | ${this.schema.databaseName}`;
    log.screenSeparator(sep, true);
    this.logField(m, f, true);
    log.screenSeparator(sep, false);
    return await this.promptFieldNext(m, f);
  }

  logField(m: Model, f: Field, full = false) {
    const logs = [
      [kleur.bold('Field'), fmtVarName(f.fieldName)],
      [kleur.bold('Column'), kleur.gray(getFieldColumnDefinition(m, f))],
      [
        kleur.bold('Javascript Type'),
        fmtVal(f.javascriptType) + kleur.dim(` (${f.jsTypeExplanation})`)
      ],

      [kleur.bold('Primary Key'), fmtVal(JSON.stringify(f.isPrimaryKey))]
    ];
    if (full) {
      logs.push(
        [
          kleur.bold('Auto Increment'),
          fmtVal(JSON.stringify(f.isAutoIncrement))
        ],
        [kleur.bold('Unique'), fmtVal(JSON.stringify(f.isUnique))],
        [kleur.bold('Null'), fmtVal(JSON.stringify(f.isNullable))],
        [kleur.bold('Has Default'), fmtVal(JSON.stringify(f.hasDefault))]
      );
      if (f.hasDefault) {
        logs.push([
          kleur.bold('Default'),
          fmtVal(
            f.defaultValue !== undefined
              ? f.defaultValue === null
                ? 'null'
                : JSON.stringify(f.defaultValue)
              : ''
          )
        ]);
      }
      logs.push(
        [kleur.bold('Invisible'), fmtVal(JSON.stringify(f.isInvisible))],
        [kleur.bold('Generated'), fmtVal(JSON.stringify(f.isGeneratedAlways))]
      );
      const modelNotesForField: string[] = [
        m.modelTypeDeclaration,
        m.selectAllTypeDeclaration,
        m.primaryKeyTypeDeclaration,
        m.createTypeDeclaration,
        m.updateTypeDeclaration
      ]
        .filter((decl) => typeof decl.notes[f.fieldName] === 'string')
        .map((decl) => {
          const link = fmtPath(this.code.getTypesDFileLink(decl.typeName));
          return (
            '- ' +
            squishWords(decl.notes[f.fieldName]).split('\n').join(' ') +
            ' ' +
            link
          );
        });
      if (modelNotesForField.length === 0) {
        logs.push([kleur.bold('Model Type Notes'), kleur.dim('[none]')]);
      } else {
        logs.push(
          ...modelNotesForField.map((n, i) => [
            kleur.bold(i === 0 ? 'Model Type Notes' : ''),
            n
          ])
        );
      }
    }

    log.columnize(logs);
  }
}
