import {
  fmtPath,
  fmtVal,
  fmtVarName,
  formatSql,
  log,
  maskDatabaseURLPassword,
  onUserCancelled
} from './utils.js';
import { Code } from './code.js';
import type { Database } from './database.js';
import type { FileSystem } from './file-system.js';
import type { Model } from './model.js';
import type { Options } from './options.js';
import { Schema } from './schema.js';
import { prompt } from './utils.js';
import kleur from 'kleur';
import type { Field } from './field.js';

import type { Annotation, SchemaChange } from './types.js';
import ora from 'ora';
import { edit } from 'external-editor';
import {
  getAddModelSql,
  getDropFieldSql,
  getDropModelSql,
  getEditFieldManuallySql,
  getEditJsonAnnotationSql,
  getModifyModelByHandSql,
  getRenameFieldSql,
  getToggleBigIntAnnotationSql,
  getToggleInvisibleSql,
  getToggleSetAnnotationSql,
  getToggleTinyIntBooleanSql
} from './schema-changes.js';
import camelcase from 'camelcase';

export class Explorer {
  constructor(
    public schema: Schema,
    public code: Code,
    public readonly fs: FileSystem,
    public readonly db: Database,
    public readonly options: Options
  ) {}

  async run() {
    const schemaPath = this.options.explore || '';
    const [modelName, fieldName] = schemaPath.split('.');
    const modelSearch = (modelName || '').trim().toLowerCase();
    const fieldSearch = (fieldName || '').trim().toLowerCase();
    const exactModel = this.schema.models.find(
      (m) =>
        m.modelName.toLowerCase() === modelSearch ||
        m.tableName.toLowerCase() === modelSearch
    );
    if (exactModel) {
      const exactField = exactModel.fields.find(
        (f) =>
          f.fieldName.toLowerCase() === fieldSearch ||
          f.columnName.toLowerCase() === fieldSearch
      );
      if (exactField) {
        return await this.fieldScreen(exactModel, exactField);
      }
      if (fieldSearch.length > 0) {
        return await this.promptField(exactModel, fieldSearch);
      }
      return await this.modelScreen(exactModel);
    }
    if (modelSearch.length > 0 || fieldSearch.length > 0) {
      return await this.promptModel(modelSearch, fieldSearch);
    }

    return await this.schemaScreen();
  }

  async promptModel(modelName?: string, fieldName?: string): Promise<void> {
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
    const m = (await prompt({
      type: 'autocomplete',
      name: 'model',
      message: 'Model',
      initial: initialChoice.title,
      choices,
      limit: 5,
      suggest: async (inp: string, choices) => {
        return suggest(inp, choices as Choice[]);
      }
    })) as unknown as Model;
    if (fieldName) {
      return await this.promptField(m, fieldName);
    }
    return await this.modelScreen(m);
  }

  async promptField(model: Model, partialName?: string): Promise<void> {
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
      limit: 5,
      suggest: async (inp: string, choices) => {
        return suggest(inp, choices as Choice[]);
      }
    })) as unknown as Field;
    return await this.fieldScreen(model, f);
  }

  async schemaScreen() {
    log.header(`↓  Schema: ${this.schema.databaseName}`);
    log.info(kleur.bold('Schema'));
    log.table([
      ['Database', fmtVal(this.schema.databaseName)],
      ['URL', maskDatabaseURLPassword(this.options.databaseDetails.databaseUrl)]
    ]);
    console.log();
    log.info(
      kleur.bold('Models') + kleur.dim(` (${this.schema.models.length})`)
    );
    log.table(
      [
        ...this.schema.models.map((m) => [
          fmtVal(m.modelName),
          kleur.dim(m.tableName)
        ])
      ],
      ['Model Name', 'Table Name']
    );
    log.header(`↑ Schema: ${this.schema.databaseName}`);

    type Next = 'addModel' | 'showModel' | 'exit';
    const choices: { title: string; value: Next }[] = [
      {
        title: 'Show a model',
        value: 'showModel'
      },
      {
        title: 'Add model',
        value: 'addModel'
      },
      {
        title: 'Exit',
        value: 'exit'
      }
    ];
    const next = await prompt<Next>({
      type: 'select',
      name: 'next',
      message: `Schema: ${fmtVal(this.schema.databaseName)}`,
      choices
    });

    if ('exit' === next) {
      return;
    }
    if ('showModel' === next) {
      return await this.promptModel();
    }
    if ('addModel' === next) {
      const { statement, tableName } = await getAddModelSql(this.schema);
      return await this.executeSchemaChange(
        statement,
        camelcase(tableName, { pascalCase: true })
      );
    }
  }

  async modelScreen(m: Model) {
    log.header(`↓ Model: ${m.modelName}`);
    log.info(kleur.bold('Model'));
    log.table([
      ['Model', fmtVal(m.modelName)],
      ['Table', fmtVal(m.tableName)]
    ]);
    console.log();
    log.info(kleur.bold('Fields') + kleur.dim(` (${m.fields.length})`));
    log.table(
      [
        ...m.fields.map((f) => [
          fmtVarName(f.fieldName),
          fmtVal(f.javascriptType),
          kleur.dim(f.column.Type)
        ])
      ],
      ['Field', 'JS Type', 'Column Type']
    );
    log.header(`↑ Model: ${m.modelName}`);

    type Next =
      | 'editModel'
      | 'dropModel'
      | 'field'
      | 'model'
      | 'schema'
      | 'exit';
    const choices: { title: string; value: Next }[] = [
      { title: 'Edit Model', value: 'editModel' },
      { title: 'Drop Model', value: 'dropModel' },
      { title: 'Show / Modify Individual Field', value: 'field' },
      { title: 'Show Another Model', value: 'model' },
      { title: 'Show Schema', value: 'schema' },
      { title: 'Exit', value: 'exit' }
    ];
    const next = await prompt<Next>({
      type: 'select',
      name: 'next',
      message: `Schema: ${fmtVal(this.schema.databaseName)} | Model: ${fmtVal(
        m.modelName
      )}`,
      choices
    });
    if (next === 'exit') {
      return onUserCancelled();
    }
    if (next === 'field') {
      return await this.promptField(m);
    }
    if (next === 'model') {
      return await this.promptModel();
    }
    if (next === 'schema') {
      return await this.schemaScreen();
    }
    if (next === 'dropModel') {
      const change = getDropModelSql(m);
      return await this.executeSchemaChange(change, m.modelName);
    }
    if (next === 'editModel') {
      const change = getModifyModelByHandSql(m);
      return await this.executeSchemaChange(change, m.modelName);
    }
  }

  async fieldScreen(m: Model, f: Field) {
    log.header(`↓ Field: ${f.fieldName}`);
    log.table([
      ['Model', fmtVal(m.modelName)],
      ['Field', fmtVarName(f.fieldName)],
      ['Column', kleur.dim(f.columnName)]
    ]);
    console.log();
    log.info(kleur.bold('Javascript Type'));
    log.table([
      [
        'JS Type',
        fmtVal(f.javascriptType),
        kleur.dim(`(${f.jsTypeExplanation})`)
      ],
      ['Column Type', kleur.dim(f.column.Type)]
    ]);
    log.header(`↑ Field: ${f.fieldName}`);
    type Next = 'change' | 'field' | 'model' | 'schema' | 'exit';
    type Choice = {
      title: string;
      value: Next;
    };
    const choices: Choice[] = [
      { title: 'Modify field', value: 'change' },
      { title: `Show another field in ${fmtVal(m.modelName)}`, value: 'field' },
      { title: `Back to model ${fmtVal(m.modelName)}`, value: 'model' },
      { title: `Back to schema ${this.schema.databaseName}`, value: 'schema' },
      { title: 'Exit', value: 'exit' }
    ];
    const next = await prompt<Next>({
      type: 'select',
      name: 'next',
      message: `Schema: ${fmtVal(this.schema.databaseName)} | Model: ${fmtVal(
        m.modelName
      )} | Field: ${fmtVal(f.fieldName)}`,
      choices
    });

    if ('exit' === next) {
      return;
    }
    if ('model' === next) {
      return await this.modelScreen(m);
    }
    if ('field' === next) {
      return await this.promptField(m, f.fieldName);
    }
    if ('schema' === next) {
      return await this.schemaScreen();
    }
    if ('change' === next) {
      return await this.promptFieldChange(m, f);
    }
  }

  async promptFieldChange(m: Model, f: Field): Promise<void> {
    type Next =
      | 'cancel'
      | 'exit'
      | 'typeTinyInt'
      | 'typeBigInt'
      | 'typeJson'
      | 'typeSet'
      | 'rename'
      | 'setInvisible'
      | 'editByHand'
      | 'drop';
    type Choice = {
      title: string;
      value: Next;
    };
    const choices: Choice[] = [
      {
        value: 'cancel',
        title: 'Cancel'
      }
    ];
    if (f.mysqlBaseType === 'tinyint') {
      if (f.isTinyIntOne) {
        choices.push({
          title: `Type as javascript ${fmtVal(
            'number'
          )} (change column type to ${fmtVal('tinyint')})`,
          value: 'typeTinyInt'
        });
      } else {
        choices.push({
          title: `Type as javascript ${fmtVal(
            'boolean'
          )} (change column type to ${fmtVal('tinyint(1)')})`,
          value: 'typeTinyInt'
        });
      }
    }
    if (f.mysqlBaseType === 'bigint') {
      if (f.bigIntAnnotation) {
        choices.push({
          title: `Type as javascript ${fmtVal('string')} (remove ${kleur.red(
            '@bigint'
          )} type annotation)`,
          value: 'typeBigInt'
        });
      } else {
        choices.push({
          title: `Type as javascript ${fmtVal('bigint')} (add ${kleur.red(
            '@bigint'
          )} type annotation)`,
          value: 'typeBigInt'
        });
      }
    }
    if (f.mysqlBaseType === 'json') {
      if (f.jsonAnnotation) {
        choices.push({
          title: `Edit or remove the ${kleur.red('@json')} type annotation`,
          value: 'typeJson'
        });
      } else {
        choices.push({
          title: `Add a ${kleur.red('@json')} type annotation`,
          value: 'typeJson'
        });
      }
    }

    if (f.mysqlBaseType === 'set') {
      if (f.setAnnotation) {
        choices.push({
          title: `Type as javascript ${fmtVal('string')} (remove ${kleur.red(
            '@set'
          )} type annotation)`,
          value: 'typeSet'
        });
      } else {
        choices.push({
          title: `Type as javascript ${fmtVal(
            `Set<${f.javascriptEnumerableStringType}>`
          )} (add ${kleur.red('@set')} type annotation)`,
          value: 'typeSet'
        });
      }
    }
    if (f.isInvisible) {
      choices.push({
        title: `Make field visible (remove ${kleur.red('INVISIBLE')})`,
        value: 'setInvisible'
      });
    } else {
      choices.push({
        title: `Make field invisible (add ${kleur.red('INVISIBLE')})`,
        value: 'setInvisible'
      });
    }
    choices.push({
      title: 'Edit field by hand',
      value: 'editByHand'
    });
    choices.push({
      title: 'Drop field',
      value: 'drop'
    });

    const next = await prompt<Next>({
      message: 'Modify field',
      type: 'select',
      name: 'next',
      choices
    });
    if ('cancel' === next) {
      return await this.fieldScreen(m, f);
    }
    if ('exit' === next) {
      return onUserCancelled();
    }
    if ('typeTinyInt' === next) {
      const change = getToggleTinyIntBooleanSql(m, f);
      return await this.executeSchemaChange(change, m.modelName, f.fieldName);
    }
    if ('typeBigInt' === next) {
      const change = getToggleBigIntAnnotationSql(m, f);
      return await this.executeSchemaChange(change, m.modelName, f.fieldName);
    }
    if ('typeJson' === next) {
      const change = await getEditJsonAnnotationSql(m, f);
      return await this.executeSchemaChange(change, m.modelName, f.fieldName);
    }

    if ('typeSet' === next) {
      const change = getToggleSetAnnotationSql(m, f);
      return await this.executeSchemaChange(change, m.modelName, f.fieldName);
    }
    if ('setInvisible' === next) {
      const change = getToggleInvisibleSql(m, f);
      return await this.executeSchemaChange(change, m.modelName, f.fieldName);
    }
    if ('drop' === next) {
      const change = getDropFieldSql(m, f);
      return await this.executeSchemaChange(change, m.modelName, f.fieldName);
    }
    if ('editByHand' === next) {
      const change = getEditFieldManuallySql(m, f);
      return await this.executeSchemaChange(change, m.modelName, f.fieldName);
    }
    if ('rename' === next) {
      const { statement, columnName } = await getRenameFieldSql(m, f);
      return await this.executeSchemaChange(
        statement,
        m.modelName,
        camelcase(columnName)
      );
    }
  }

  async executeSchemaChange(
    change: string,
    expectedModelName?: string,
    expectedFieldName?: string
  ): Promise<void> {
    const prettified = formatSql(change);

    const previousScreen = async () => {
      const model = this.schema.models.find(
        (m) => m.modelName === expectedModelName
      );
      if (!model) {
        return await this.schemaScreen();
      }
      const field = model.fields.find((f) => f.fieldName === expectedFieldName);
      if (!field) {
        return await this.modelScreen(model);
      }

      return await this.fieldScreen(model, field);
    };
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
      return previousScreen();
    }

    try {
      await this.db.connection.execute(prettified);
      await this.fetchSchema({
        changeSql: prettified,
        previousSchema: this.schema.fetchedSchema
      });
      await this.generateCode();
      return previousScreen();
    } catch (error) {
      log.error([kleur.red('Schema change failed'), (error as Error).message]);
      const editByHand = await prompt({
        message: 'Edit by hand?',
        type: 'confirm',
        name: 'editByHand'
      });
      if (editByHand) {
        const edited = formatSql(edit(prettified));
        return await this.executeSchemaChange(edited);
      }
      return previousScreen();
    }
  }

  replaceOrAddColDefComment(colDef: string, newCommentText: string): string {
    const rx = /COMMENT\s+'.*'/;
    if (rx.test(colDef)) {
      colDef = colDef.replace(rx, '');
    }
    if (newCommentText.length === 0) {
      return colDef;
    }
    return colDef + ` COMMENT '${newCommentText.replaceAll(`'`, `''`)}'`;
  }

  removeCommentAnnotationsByType(field: Field, a: Annotation): string {
    const annotations = field.typeAnnotations.filter(
      (ann) => ann.annotation === a
    );
    let comment = field.column.Comment;
    annotations.forEach((a) => {
      comment = comment.replace(a.fullAnnotation, '');
    });
    return comment.trim();
  }

  getModelColumnDefinition(model: Model, field: Field): string {
    const rx = new RegExp(`^\\s*\`${field.column.Field}\``);
    const lines = model.table.createSql.split('\n');
    for (const line of lines) {
      if (rx.test(line)) {
        return line.replace(/,\s*$/, '');
      }
    }
    throw new Error('could not find column definition.');
  }

  async fetchSchema(change?: SchemaChange) {
    const spinner = ora('Fetching schema').start();
    const fetchedSchema = await this.db.fetchSchema();
    this.schema = await Schema.create(
      fetchedSchema,
      this.options,
      this.fs,
      change
    );
    spinner.succeed('Schema fetched.');
    const changeFiles = this.schema.changeFiles.map(
      (f) => ` - ${fmtPath(f.relativePath)}`
    );
    if (changeFiles.length > 0) {
      changeFiles.unshift(kleur.bold('Schema changes:'));
    }
    log.info([
      kleur.bold('Current schema:'),
      ` - ${fmtPath(this.schema.currentSchemaFile.relativePath)}`,
      ...changeFiles
    ]);
  }

  async generateCode() {
    const spinner = ora('Generating code').start();
    this.code = await Code.create(this.schema, this.fs, this.options);
    spinner.succeed('Code generated.');
    log.info([
      kleur.bold('Generated files:'),
      ...this.code.files.map((f) => ` - ${fmtPath(f.relativePath)}`)
    ]);
  }

  getFieldModelNotes(model: Model, field: Field) {
    const notes: string[] = [];
    if (field.isInvisible) {
      notes.push(
        `${fmtVarName(field.fieldName)} is optional in ${fmtVal(
          model.modelName
        )} ${kleur.dim(`(column is INVISIBLE)`)}`
      );
      notes.push(
        `${fmtVarName(field.fieldName)} is omitted from in ${fmtVal(
          model.selectAllTypeName
        )} ${kleur.dim(`(column is INVISIBLE)`)}`
      );
    }
    if (field.isPrimaryKey) {
      notes.push(
        `${fmtVarName(field.fieldName)} is included in ${fmtVal(
          model.primaryKeyTypeName
        )} ${kleur.dim(`(column is a primary key)`)}`
      );
    }
    if (field.isGeneratedAlways) {
      notes.push(
        `${fmtVarName(field.fieldName)} is omitted from ${fmtVal(
          model.createTypeName
        )} ${kleur.dim(`(column is GENERATED)`)}`
      );
    } else if (field.isAutoIncrement) {
      notes.push(
        `${fmtVarName(field.fieldName)} is optional in ${fmtVal(
          model.createTypeName
        )} ${kleur.dim(`(column is auto_increment)`)}`
      );
    } else if (field.hasDefault) {
      notes.push(
        `${fmtVarName(field.fieldName)} is optional in ${fmtVal(
          model.createTypeName
        )} ${kleur.dim(`(column has a default value)`)}`
      );
    }
    if (field.isGeneratedAlways) {
      notes.push(
        `${fmtVarName(field.fieldName)} is omitted from ${fmtVal(
          model.updateTypeName
        )} ${kleur.dim(`(column is GENERATED)`)}`
      );
    } else if (field.isPrimaryKey) {
      notes.push(
        `${fmtVarName(field.fieldName)} is omitted from ${fmtVal(
          model.updateTypeName
        )} ${kleur.dim(`(column is a primary key)`)}`
      );
    }
  }
}
