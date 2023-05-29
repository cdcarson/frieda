import {
  fmtPath,
  fmtVal,
  fmtVarName,
  getParenthesizedArgs,
  log,
  maskDatabaseURLPassword,
  onUserCancelled,
  squishWords
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
import sql, { Sql, raw } from 'sql-template-tag';
import { bt } from '$lib/index.js';
import { format } from 'sql-formatter';
import type { Annotation, ParsedAnnotation, SchemaChange } from './types.js';
import ora from 'ora';
import { edit } from 'external-editor';

export class Explorer {
  currentModel: Model | undefined;
  currentField: Field | undefined;
  constructor(
    public schema: Schema,
    public code: Code,
    public readonly fs: FileSystem,
    public readonly db: Database,
    public readonly options: Options
  ) {}

  async run() {
    if (this.options.model || this.options.field) {
      return await this.promptModel(this.options.model, this.options.field);
    } else {
      return await this.schemaScreen();
    }
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
    this.currentModel = (await prompt({
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
      return await this.promptField(this.currentModel, fieldName);
    }
    return await this.modelScreen(this.currentModel);
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
    this.currentField = (await prompt({
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
    return await this.fieldScreen(model, this.currentField);
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

    type Next = 'field' | 'model' | 'schema' | 'exit';
    const next = await prompt<Next>({
      type: 'select',
      name: 'next',
      message: `Model: ${m.modelName}`,
      choices: [
        { title: 'Show/Modify Field', value: 'field' },
        { title: 'Show Another Model', value: 'model' },
        { title: 'Show Schema', value: 'schema' },
        { title: 'Exit', value: 'exit' }
      ]
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

    const next = await prompt<Next>({
      type: 'select',
      name: 'next',
      message: `Model: ${m.modelName} | Field: ${f.fieldName}`,
      choices: [
        { title: 'Modify or Drop Field', value: 'change' },
        { title: 'Show Another Field', value: 'fiels' },
        { title: 'Show Another Model', value: 'model' },
        { title: 'Show Schema', value: 'schema' },
        { title: 'Exit', value: 'exit' }
      ]
    });
  }

  async promptFieldChange(m: Model, f: Field) {
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
      choices.push({
        title: `Toggle the ${kleur.red('@set')} type annotation`,
        value: 'typeSet'
      });
      
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
      let colDef = this.getModelColumnDefinition(m, f);
      colDef = colDef.replace(
        /tinyint(?:\(\d*\))?/,
        f.isTinyIntOne ? 'tinyint' : 'tinyint(1)'
      );

      const change = sql`
        ALTER TABLE ${bt(m.table.name)}
        MODIFY COLUMN ${raw(colDef)}
      `;
      return await this.executeSchemaChange(change);
    }
    if ('typeBigInt' === next) {
      let colDef = this.getModelColumnDefinition(m, f);
      let comment = this.removeCommentAnnotationsByType(f, 'bigint');
      comment = f.bigIntAnnotation
        ? comment
        : [comment, '@bigint'].join(' ').trim();
      colDef = this.replaceOrAddColDefComment(colDef, comment)
      const change = sql`
        ALTER TABLE ${bt(m.table.name)}
        MODIFY COLUMN ${raw(colDef)}
      `;
      return await this.executeSchemaChange(change);
    }
    if ('typeJson' === next) {
      const type = await this.promptJsonType(f.jsonAnnotation? f.jsonAnnotation.typeArgument : '')
      let colDef = this.getModelColumnDefinition(m, f);
      let comment = this.removeCommentAnnotationsByType(f, 'json');
      comment = type.length > 0 ? [comment, `@json(${type})`].join(' ').trim() : comment;
      colDef = this.replaceOrAddColDefComment(colDef, comment)
      const change = sql`
        ALTER TABLE ${bt(m.table.name)}
        MODIFY COLUMN ${raw(colDef)}
      `;
      return await this.executeSchemaChange(change);
    }
    
    if ('typeSet' === next) {
      const strings = getParenthesizedArgs(f.column.Type, 'set')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join('|');
      const typeAsSet = await prompt({
        type: 'select',
        name: 'typeAs',
        choices: [
          {
            title: `Type as javascript ${fmtVal(`Set<${strings}>`)}`,
            value: true
          },
          {
            title: `Type as javascript ${fmtVal(`string`)} (a comma separated list of values)`,
            value: true
          }
        ]
      });

      let colDef = this.getModelColumnDefinition(m, f);
      let comment = this.removeCommentAnnotationsByType(f, 'set');
      comment = typeAsSet ? [comment, `@set`].join(' ').trim() : comment;
      colDef = this.replaceOrAddColDefComment(colDef, comment)
      const change = sql`
        ALTER TABLE ${bt(m.table.name)}
        MODIFY COLUMN ${raw(colDef)}
      `;
      return await this.executeSchemaChange(change);
    }
  }

  async executeSchemaChange(
    change: Sql,
    expectedModelName?: string,
    expectedFieldName?: string
  ): Promise<void> {
    const prettified = format(change.sql);

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
        const edited = edit(prettified);
        return await this.executeSchemaChange(raw(edited));
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

  async promptJsonType  (initial?: string): Promise<string>  {
    log.info([
      `${fmtVal('@json')} type annotation`,
      kleur.dim('Any valid typescript import or inline type is ok. Examples:'),
      kleur.red(`import('stripe').Transaction`),
      kleur.red(`import('../api.js').Preferences`),
      kleur.red(`Partial<import('../api.js').Preferences>`),
      kleur.red('{foo: string; bar: number, baz: number[]}')
    ]);
    const jsonType = await prompt<string>({
      type: 'text',
      name: 'jsonType',
      message: `${fmtVal('@json')} type annotation (leave blank to remove or omit)`,
      initial: initial || ''
    });
    return jsonType.trim();
  };
  
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
}
