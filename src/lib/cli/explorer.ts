import type { FetchedSchema, FetchedTable } from '$lib/fetch/types.js';
import {
  getCastType,
  getFieldName,
  getJavascriptType,
  getValidJsonAnnotation,
  getMysqlBaseType,
  isTinyIntOne,
  getBigIntAnnotation,
  getValidEnumAnnotation,
  getSetAnnotation,
  isNullable,
  isUnique,
  getModelFieldPresence,
  getCreateModelFieldPresence,
  getUpdateModelFieldPresence,
  isPrimaryKey,
  isAutoIncrement,
  hasDefault,
  isGeneratedAlways,
  isInvisible
} from '$lib/parse/field-parsers.js';
import {
  getFullTextSearchIndexes,
  getModelCreateDataTypeName,
  getModelFindUniqueParamsTypeName,
  getModelName,
  getModelPrimaryKeyTypeName,
  getModelUpdateDataTypeName
} from '$lib/parse/model-parsers.js';
import kleur from 'kleur';
import type { Column, Table } from '../api/types.js';
import { fmtPath, fmtVal, fmtVarName, getStdOutCols } from './ui/formatters.js';
import log from './ui/log.js';
import { DEFAULT_JSON_FIELD_TYPE } from '$lib/constants.js';
import { prompt } from './ui/prompt.js';
import type { DatabaseUrlResult, ResolvedCliOptions } from './types.js';
import prettier from 'prettier';
import {
  CreateModelFieldPresence,
  ModelFieldPresence,
  UpdateModelFieldPresence
} from '$lib/parse/types.js';
import { getModelTypeDeclarations } from '$lib/generate/get-model-type-declarations.js';
import { raw, join, type Sql } from 'sql-template-tag';
import sql from 'sql-template-tag';
import { bt } from '$lib/index.js';
import { getCommentAnnotations } from '$lib/parse/field-parsers.js';
import type { Connection } from '@planetscale/database';
import ora from 'ora';
import { fetchSchema } from './shared.js';
import { generateCode } from './shared.js';
import { edit } from 'external-editor';

const { format } = prettier;

type ShowModelNextStep =
  | 'basicInfo'
  | 'fieldTypes'
  | 'modelTypes'
  | 'indexes'
  | 'createSql'
  | 'typeOptions'
  | 'fieldInfo'
  | 'modifyField'
  | 'anotherModel'
  | 'exit';

type MigrationType =
  | 'addEnumTypeAnnotation'
  | 'editEnumTypeAnnotation'
  | 'removeEnumTypeAnnotation'
  | 'addSetTypeAnnotation'
  | 'editSetTypeAnnotation'
  | 'removeSetTypeAnnotation'
  | 'editJsonTypeAnnotation'
  | 'removeJsonTypeAnnotation'
  | 'addJsonTypeAnnotation'
  | 'addBigIntTypeAnnotation'
  | 'removeBigIntTypeAnnotation'
  | 'typeTinyIntAsBoolean'
  | 'typeTinyIntAsInt'
  | 'editManually';

type MigrationChoice = {
  value: MigrationType;
  title: string;
};

export class Explorer {
  private showModelNextStep: ShowModelNextStep | null = null;
  constructor(
    public schema: FetchedSchema,
    public options: ResolvedCliOptions,
    public databaseUrlResult: DatabaseUrlResult,
    public connection: Connection
  ) {}

  async getModel(partialName?: string): Promise<FetchedTable> {
    const s = (partialName || '').trim().toLowerCase();
    const matches = this.schema.tables.filter((t) => {
      return (
        t.name.toLowerCase().startsWith(s) ||
        getModelName(t).toLowerCase().startsWith(s)
      );
    });
    if (matches.length === 1) {
      return matches[0];
    }
    return await this.promptModel(s);
  }
  async promptModel(partialName?: string): Promise<FetchedTable> {
    type Choice = {
      title: string;
      value: FetchedTable;
    };
    const choices: Choice[] = this.schema.tables.map((t) => {
      return {
        title: getModelName(t),
        value: t
      };
    });

    const suggest = (inp: string, choices: Choice[]) => {
      return choices.filter(
        (c) =>
          c.title.toLowerCase().startsWith(inp.toLowerCase()) ||
          c.value.name.toLowerCase().startsWith(inp.toLowerCase())
      );
    };
    const initialChoice = suggest(partialName || '', choices)[0] || choices[0];
    const table: FetchedTable = await prompt<FetchedTable>({
      type: 'autocomplete',
      name: 'model',
      message: 'Model',
      initial: initialChoice.title,
      choices,
      limit: 5,
      suggest: async (inp: string, choices) => {
        return suggest(inp, choices as Choice[]);
      }
    });
    console.log();
    return table;
  }

  async getField(table: FetchedTable, partialName?: string): Promise<Column> {
    const s = (partialName || '').trim().toLowerCase();
    const matches = table.columns.filter((c) => {
      return (
        c.Field.toLowerCase().startsWith(s) ||
        getFieldName(c).toLowerCase().startsWith(s)
      );
    });
    if (matches.length === 1) {
      return matches[0];
    }
    return await this.promptField(table, s);
  }

  async promptField(
    table: FetchedTable,
    partialName?: string
  ): Promise<Column> {
    type Choice = {
      title: string;
      value: Column;
    };
    const choices: Choice[] = table.columns.map((c) => {
      return {
        title: getFieldName(c),
        value: c
      };
    });

    const suggest = (inp: string, choices: Choice[]) => {
      return choices.filter(
        (c) =>
          c.title.toLowerCase().startsWith(inp.toLowerCase()) ||
          c.value.Field.toLowerCase().startsWith(inp.toLowerCase())
      );
    };
    const initialChoice = suggest(partialName || '', choices)[0] || choices[0];
    const column: Column = await prompt<Column>({
      type: 'autocomplete',
      name: 'field',
      message: 'Field',
      initial: initialChoice.title,
      choices,
      limit: 10,
      suggest: async (inp: string, choices) => {
        return suggest(inp, choices as Choice[]);
      }
    });
    console.log();
    return column;
  }

  async modifyField(
    table: FetchedTable,
    column: Column
  ): Promise<{ table: FetchedTable; column: Column }> {
    //const choices: MigrationChoice[] = [];
    const choices: MigrationChoice[] = [];
    const mysqlType = getMysqlBaseType(column);
    if ('enum' === mysqlType) {
      const annotation = getValidEnumAnnotation(column);
      if (annotation) {
        choices.push(
          {
            value: 'editEnumTypeAnnotation',
            title: `Edit @enum type annotation`
          },
          {
            value: 'removeEnumTypeAnnotation',
            title: 'Remove @enum type annotation'
          }
        );
      } else {
        choices.push({
          value: 'addEnumTypeAnnotation',
          title: `Add @enum type annotation`
        });
      }
    }
    if ('set' === mysqlType) {
      const annotation = getSetAnnotation(column);
      if (annotation) {
        choices.push(
          {
            value: 'editSetTypeAnnotation',
            title: `Edit @set type annotation`
          },
          {
            value: 'removeSetTypeAnnotation',
            title: 'Remove @set type annotation'
          }
        );
      } else {
        choices.push({
          value: 'addSetTypeAnnotation',
          title: `Add @set type annotation`
        });
      }
    }
    if ('json' === mysqlType) {
      const annotation = getValidJsonAnnotation(column);
      if (annotation) {
        choices.push(
          {
            value: 'editJsonTypeAnnotation',
            title: `Edit @json type annotation`
          },
          {
            value: 'removeJsonTypeAnnotation',
            title: 'Remove @json type annotation'
          }
        );
      } else {
        choices.push({
          value: 'addJsonTypeAnnotation',
          title: `Add @json type annotation`
        });
      }
    }
    if ('bigint' === mysqlType) {
      const annotation = getBigIntAnnotation(column);
      if (annotation) {
        choices.push({
          value: 'removeBigIntTypeAnnotation',
          title: 'Remove @bigint type annotation'
        });
      } else {
        choices.push({
          value: 'addBigIntTypeAnnotation',
          title: `Add @bigint type annotation`
        });
      }
    }
    if ('tinyint' === mysqlType) {
      if (isTinyIntOne(column)) {
        choices.push({
          value: 'typeTinyIntAsInt',
          title: `Type as integer`
        });
      } else {
        choices.push({
          value: 'typeTinyIntAsBoolean',
          title: `Type as boolean`
        });
      }
    }

    choices.push({
      title: 'Edit field manually',
      value: 'editManually'
    });
    const migrate = await prompt<MigrationType>({
      message: 'Modify field',
      name: 'migrate',
      type: 'select',
      choices
    });
    console.log();

    let statement: Sql;
    switch (migrate) {
      case 'editEnumTypeAnnotation':
      case 'addEnumTypeAnnotation':
        statement = await this.getEditEnumTypeAnnotationSql(table, column);
        break;
      case 'removeEnumTypeAnnotation':
        statement = this.getRemoveEnumTypeAnnotationSql(table, column);
        break;
      case 'addBigIntTypeAnnotation':
        statement = this.getAddBigIntTypeAnnotationSql(table, column);
        break;
      case 'removeBigIntTypeAnnotation':
        statement = this.getRemoveBigIntTypeAnnotationSql(table, column);
        break;

      case 'addSetTypeAnnotation':
      case 'editSetTypeAnnotation':
        statement = await this.getEditSetTypeAnnotationSql(table, column);
        break;
      case 'removeSetTypeAnnotation':
        statement = this.getRemoveSetTypeAnnotationSql(table, column);
        break;
      case 'addJsonTypeAnnotation':
      case 'editJsonTypeAnnotation':
        statement = await this.getEditJsonTypeAnnotationSql(table, column);
        break;
      case 'removeJsonTypeAnnotation':
        statement = this.getRemoveJsonTypeAnnotationSql(table, column);
        break;
      case 'typeTinyIntAsBoolean':
        statement = this.getTypeAsBooleanSql(table, column, true);
        break;
      case 'typeTinyIntAsInt':
        statement = this.getTypeAsBooleanSql(table, column, false);
        break;
      case 'editManually':
        statement = this.getColumnEditSql(table, column);
        break;
    }

    return await this.runMigration(statement, table, column);
  }

  getColumnEditSql(table: FetchedTable, column: Column): Sql {
    const comment = column.Comment.trim();
    const lines = [
      sql`ALTER TABLE ${bt(table.name)}`,
      sql`   MODIFY COLUMN ${bt(column.Field)} ${raw(column.Type)} `,
      sql`   ${raw(isNullable(column) ? 'NULL' : 'NOT NULL')}`
    ];
    if (comment.length > 0) {
      lines.push(sql`   COMMENT "${raw(comment)}"`);
    }
    const statement = join(lines, '\n');
    const text = edit(statement.sql);
    return raw(text);
  }

  getTypeAsBooleanSql(
    table: FetchedTable,
    column: Column,
    asBool: boolean
  ): Sql {
    const comment = column.Comment.trim();
    const lines = [
      sql`ALTER TABLE ${bt(table.name)}`,
      sql`   MODIFY COLUMN ${bt(column.Field)} ${raw(
        asBool ? 'tinyint(1)' : 'tinyint'
      )} `,
      sql`   ${raw(isNullable(column) ? 'NULL' : 'NOT NULL')}`
    ];
    if (comment.length > 0) {
      lines.push(sql`   COMMENT "${raw(comment)}"`);
    }
    return join(lines, '\n');
  }

  getRemoveSetTypeAnnotationSql(table: FetchedTable, column: Column): Sql {
    let comment = column.Comment;
    const annotations = getCommentAnnotations(column).filter(
      (a) => a.annotation === 'set'
    );
    annotations.forEach((a) => {
      comment = comment.replace(a.fullAnnotation, '');
    });
    comment = comment.trim();
    const lines = [
      sql`ALTER TABLE ${bt(table.name)}`,
      sql`   MODIFY COLUMN ${bt(column.Field)} ${raw(column.Type)} `,
      sql`   ${raw(isNullable(column) ? 'NULL' : 'NOT NULL')}`
    ];
    if (comment.length > 0) {
      lines.push(sql`   COMMENT "${raw(comment)}"`);
    }
    const statement = join(lines, '\n');
    return statement;
  }

  getRemoveJsonTypeAnnotationSql(table: FetchedTable, column: Column): Sql {
    let comment = column.Comment;
    const annotations = getCommentAnnotations(column).filter(
      (a) => a.annotation === 'set'
    );
    annotations.forEach((a) => {
      comment = comment.replace(a.fullAnnotation, '');
    });
    comment = comment.trim();
    const lines = [
      sql`ALTER TABLE ${bt(table.name)}`,
      sql`   MODIFY COLUMN ${bt(column.Field)} ${raw(column.Type)} `,
      sql`   ${raw(isNullable(column) ? 'NULL' : 'NOT NULL')}`
    ];
    if (comment.length > 0) {
      lines.push(sql`   COMMENT "${raw(comment)}"`);
    }
    const statement = join(lines, '\n');
    return statement;
  }

  async getEditJsonTypeAnnotationSql(
    table: FetchedTable,
    column: Column
  ): Promise<Sql> {
    let jsonType = await prompt<string>({
      type: 'text',
      name: 't',
      message: 'Enter type:',
      initial: getValidJsonAnnotation(column)?.argument || ''
    });
    jsonType = jsonType.trim();
    if (jsonType.length === 0) {
      return this.getRemoveJsonTypeAnnotationSql(table, column);
    }
    let comment = column.Comment;
    const annotations = getCommentAnnotations(column).filter(
      (a) => a.annotation === 'json'
    );
    annotations.forEach((a) => {
      comment = comment.replace(a.fullAnnotation, '');
    });
    comment = comment.trim();
    comment = [comment, `@json(${jsonType})`].join(' ').trim();
    const statement = join(
      [
        sql`ALTER TABLE ${bt(table.name)}`,
        sql`   MODIFY COLUMN ${bt(column.Field)} ${raw(column.Type)} `,
        sql`   ${raw(isNullable(column) ? 'NULL' : 'NOT NULL')}`,
        sql`   COMMENT "${raw(comment)}";`
      ],
      '\n'
    );
    return statement;
  }

  async getEditSetTypeAnnotationSql(
    table: FetchedTable,
    column: Column
  ): Promise<Sql> {
    let setType = await prompt<string>({
      type: 'text',
      name: 't',
      message: "Enter type, or leave blank to use the column's set definition",
      initial: getSetAnnotation(column)?.argument || ''
    });
    setType = setType.trim();

    let comment = column.Comment;
    const annotations = getCommentAnnotations(column).filter(
      (a) => a.annotation === 'set'
    );
    annotations.forEach((a) => {
      comment = comment.replace(a.fullAnnotation, '');
    });
    comment = comment.trim();
    comment = [comment, setType.length > 0 ? `@set(${setType})` : '@set']
      .join(' ')
      .trim();
    const statement = join(
      [
        sql`ALTER TABLE ${bt(table.name)}`,
        sql`   MODIFY COLUMN ${bt(column.Field)} ${raw(column.Type)} `,
        sql`   ${raw(isNullable(column) ? 'NULL' : 'NOT NULL')}`,
        sql`   COMMENT "${raw(comment)}";`
      ],
      '\n'
    );
    return statement;
  }

  getRemoveBigIntTypeAnnotationSql(table: FetchedTable, column: Column): Sql {
    let comment = column.Comment;
    const annotations = getCommentAnnotations(column).filter(
      (a) => a.annotation === 'bigint'
    );
    annotations.forEach((a) => {
      comment = comment.replace(a.fullAnnotation, '');
    });
    comment = comment.trim();
    const lines = [
      sql`ALTER TABLE ${bt(table.name)}`,
      sql`   MODIFY COLUMN ${bt(column.Field)} ${raw(column.Type)} `,
      sql`   ${raw(isNullable(column) ? 'NULL' : 'NOT NULL')}`
    ];
    if (comment.length > 0) {
      lines.push(sql`   COMMENT "${raw(comment)}"`);
    }
    const statement = join(lines, '\n');
    return statement;
  }

  getAddBigIntTypeAnnotationSql(table: FetchedTable, column: Column): Sql {
    let comment = column.Comment;
    const annotations = getCommentAnnotations(column).filter(
      (a) => a.annotation === 'bigint'
    );
    annotations.forEach((a) => {
      comment = comment.replace(a.fullAnnotation, '');
    });
    comment = comment.trim();
    comment = [comment, `@bigint`].join(' ').trim();
    const statement = join(
      [
        sql`ALTER TABLE ${bt(table.name)}`,
        sql`   MODIFY COLUMN ${bt(column.Field)} ${raw(column.Type)} `,
        sql`   ${raw(isNullable(column) ? 'NULL' : 'NOT NULL')}`,
        sql`   COMMENT "${raw(comment)}";`
      ],
      '\n'
    );
    return statement;
  }

  async getEditEnumTypeAnnotationSql(
    table: FetchedTable,
    column: Column
  ): Promise<Sql> {
    let enumType = await prompt<string>({
      type: 'text',
      name: 't',
      message: 'Enter type:',
      initial: getValidEnumAnnotation(column)?.argument || ''
    });
    enumType = enumType.trim();
    if (enumType.length === 0) {
      return this.getRemoveEnumTypeAnnotationSql(table, column);
    }
    let comment = column.Comment;
    const annotations = getCommentAnnotations(column).filter(
      (a) => a.annotation === 'enum'
    );
    annotations.forEach((a) => {
      comment = comment.replace(a.fullAnnotation, '');
    });
    comment = comment.trim();
    comment = [comment, `@enum(${enumType})`].join(' ').trim();
    const statement = join(
      [
        sql`ALTER TABLE ${bt(table.name)}`,
        sql`   MODIFY COLUMN ${bt(column.Field)} ${raw(column.Type)} `,
        sql`   ${raw(isNullable(column) ? 'NULL' : 'NOT NULL')}`,
        sql`   COMMENT "${raw(comment)}";`
      ],
      '\n'
    );
    return statement;
  }
  getRemoveEnumTypeAnnotationSql(table: FetchedTable, column: Column): Sql {
    let comment = column.Comment;
    const annotations = getCommentAnnotations(column).filter(
      (a) => a.annotation === 'enum'
    );
    annotations.forEach((a) => {
      comment = comment.replace(a.fullAnnotation, '');
    });
    comment = comment.trim();
    const lines = [
      sql`ALTER TABLE ${bt(table.name)}`,
      sql`   MODIFY COLUMN ${bt(column.Field)} ${raw(column.Type)} `,
      sql`   ${raw(isNullable(column) ? 'NULL' : 'NOT NULL')}`
    ];
    if (comment.length > 0) {
      lines.push(sql`   COMMENT "${raw(comment)}"`);
    }
    const statement = join(lines, '\n');
    return statement;
  }

  async runMigration(
    statement: Sql,
    table: FetchedTable,
    column: Column
  ): Promise<{ table: FetchedTable; column: Column }> {
    log.info([
      kleur.bold('SQL'),
      ...statement.sql.split('\n').map((s) => kleur.red(s))
    ]);
    console.log();
    const run = await prompt<boolean>({
      message: 'Run SQL?',
      name: 'run',
      type: 'confirm'
    });
    if (!run) {
      return { table, column };
    }
    console.log();
    const spinner = ora('Running SQL');
    try {
      await this.connection.execute(statement.sql);
      spinner.succeed('SQL executed.');
    } catch (error) {
      spinner.fail(
        kleur.red('Query faild: ') +
          (error instanceof Error ? error.message : 'Unknown error')
      );
      return process.exit(0);
    }
    console.log();
    this.schema = await fetchSchema(this.connection);
    const files = await generateCode(this.schema, this.options);
    console.log();
    log.info([
      kleur.bold('Files'),
      ...files.map((f) => `- ${fmtPath(f.relativePath)}`)
    ]);
    console.log();
    const newTable = this.schema.tables.find(
      (t) => t.name === table.name
    ) as FetchedTable;
    const newCol = newTable.columns.find(
      (c) => c.Field === column.Field
    ) as Column;
    return { table: newTable, column: newCol };
  }

  async showModel(table: FetchedTable) {
    this.showModelBasicInfo(table, true);
    console.log();
    this.showModelNextStep = 'basicInfo';
    return await this.promptShowModelNextStep(table);
  }
  async promptShowModelNextStep(table: FetchedTable): Promise<void> {
    type Choice = { title: string; value: ShowModelNextStep };
    const choices: Choice[] = [
      {
        title: 'Info',
        value: 'basicInfo'
      },
      {
        title: 'Field types',
        value: 'fieldTypes'
      },
      {
        title: 'Model types',
        value: 'modelTypes'
      },
      {
        title: 'Indexes',
        value: 'indexes'
      },
      {
        title: 'Create table SQL',
        value: 'createSql'
      },
      {
        title: 'Show detailed field info',
        value: 'fieldInfo'
      },
      {
        title: 'Modify field',
        value: 'modifyField'
      },
      {
        title: 'Type options',
        value: 'typeOptions'
      },
      {
        title: 'Another model',
        value: 'anotherModel'
      },
      {
        title: 'Exit',
        value: 'exit'
      }
    ];
    const initial = Math.max(
      choices.findIndex((c) => c.value === this.showModelNextStep),
      0
    );
    const nextStep = await prompt<ShowModelNextStep>({
      type: 'autocomplete',
      message: `Model: ${getModelName(table)} | Show:`,
      name: 'next',
      choices,
      initial
    });
    console.log();
    if ('anotherModel' === nextStep) {
      const newTable = await this.promptModel(getModelName(table));
      console.log();
      return await this.showModel(newTable);
    }
    if ('modifyField' === nextStep) {
      const column = await this.promptField(table);
      console.log();
      const { table: newTable, column: newCol } = await this.modifyField(
        table,
        column
      );

      this.showFieldInfo(newTable, newCol, true);
      this.showModelNextStep = nextStep;
      return await this.promptShowModelNextStep(newTable);
    }
    if ('fieldInfo' === nextStep) {
      const column = await this.promptField(table);
      console.log();
      this.showFieldInfo(table, column, true);
      this.showModelNextStep = nextStep;
      return await this.promptShowModelNextStep(table);
    }
    if ('exit' === nextStep) {
      return;
    }
    this.showModelNextStep = nextStep;
    switch (nextStep) {
      case 'basicInfo':
        this.showModelBasicInfo(table, true);
        break;
      case 'fieldTypes':
        this.showModelFieldTypes(table, true);
        break;
      case 'modelTypes':
        this.showModelTypes(table, true);
        break;
      case 'indexes':
        this.showModelIndexes(table, true);
        break;
      case 'createSql':
        this.showModelCreateSql(table, true);
        break;

      case 'typeOptions':
        this.showTypeOptions(true);
    }
    console.log();
    return await this.promptShowModelNextStep(table);
  }

  explainJsType(column: Column): string {
    const mysqlType = getMysqlBaseType(column);
    if (!mysqlType) {
      return `Unhandled column type ${
        column.Type
      }. Typed and cast as javascript ${fmtVal('string')}.`;
    }
    if ('json' === mysqlType) {
      const annotation = getValidJsonAnnotation(column);
      if (!annotation) {
        return `No ${kleur.red(
          '@json'
        )} type annotation. Using default JSON type: ${fmtVal(
          DEFAULT_JSON_FIELD_TYPE
        )}.`;
      }
      return `Using type from the ${kleur.red('@json')} type annotation.`;
    }
    if (isTinyIntOne(column)) {
      return `${fmtVarName('typeTinyIntOneAsBoolean')}: ${fmtVal(
        JSON.stringify(this.options.typeTinyIntOneAsBoolean)
      )}`;
    }
    if ('bigint' === mysqlType) {
      if (!this.options.typeBigIntAsString) {
        return `${fmtVarName('typeBigIntAsString')}: ${fmtVal(
          JSON.stringify(this.options.typeBigIntAsString)
        )}`;
      }
      if (getBigIntAnnotation(column)) {
        return `Found  ${kleur.red(
          '@bigint'
        )} type annotation. Overrides ${fmtVarName(
          'typeBigIntAsString'
        )}: ${fmtVal(JSON.stringify(this.options.typeBigIntAsString))}`;
      }
      return `${fmtVarName('typeBigIntAsString')}: ${fmtVal(
        JSON.stringify(this.options.typeBigIntAsString)
      )}`;
    }
    if ('enum' === mysqlType) {
      const annotation = getValidEnumAnnotation(column);
      if (annotation) {
        return `Using type from the ${kleur.red('@enum')} type annotation.`;
      }
      return `Using the column's enum definition.`;
    }

    if ('set' === mysqlType) {
      const annotation = getSetAnnotation(column);
      if (annotation) {
        if (annotation.argument && annotation.argument.trim().length > 0) {
          return `Using type from the ${kleur.red('@set')} type annotation.`;
        }
        return `Using the ${kleur.red('@set')} type annotation.`;
      }
    }

    return `Default type for ${fmtVal(mysqlType)} columns.`;
  }

  showModelBasicInfo(table: FetchedTable, showHeader: boolean) {
    if (showHeader) {
      log.header(`Model: ${getModelName(table)}`);
    }
    log.table([
      ['Model Name', fmtVal(getModelName(table))],
      ['Table Name', fmtVal(table.name)],
      ['Columns', fmtVal(table.columns.length.toString())],
      ['Indexes', fmtVal(table.indexes.length.toString())],
      [
        'Search Indexes',
        fmtVal(getFullTextSearchIndexes(table).length.toString())
      ]
    ]);
    if (showHeader) {
      log.footer();
    }
  }

  showModelIndexes(table: FetchedTable, showHeader: boolean) {
    if (showHeader) {
      log.header(`Indexes | Model: ${getModelName(table)}`);
    }

    log.info(kleur.bold(`Indexes (${table.indexes.length})`));
    log.table(
      [
        ...table.indexes.map((index) => [
          kleur.red(index.Key_name),
          kleur.gray(index.Index_type),
          fmtVal(JSON.stringify(index.Non_unique === 0))
        ])
      ],
      ['Key', 'Type', 'Unique']
    );
    const searchIndexes = getFullTextSearchIndexes(table);
    console.log();
    log.info(kleur.bold(`Search Indexes (${searchIndexes.length})`));
    log.table(
      [
        ...searchIndexes.map((index) => [
          kleur.red(index.key),
          index.indexedFields.map((k) => fmtVarName(k)).join(', ')
        ])
      ],
      ['Key', 'Indexed Fields']
    );

    if (showHeader) {
      log.footer();
    }
  }

  showModelTypes(table: FetchedTable, showHeader: boolean) {
    const formatCode = (code: string): string[] => {
      return format(code, {
        filepath: 'x.ts',
        useTabs: false,
        printWidth: getStdOutCols() - 4,
        singleQuote: true
      })
        .trim()
        .split('\n')
        .map((s) => kleur.red(s));
    };
    if (showHeader) {
      log.header(`Model Types | Model: ${getModelName(table)}`);
    }
    const typeDecls = getModelTypeDeclarations(table, this.options);
    const baseTypeNotes = table.columns
      .filter(
        (c) =>
          getModelFieldPresence(c) === ModelFieldPresence.undefinedForSelectAll
      )
      .map((c) => {
        return `- ${fmtVarName(getFieldName(c))} will be ${fmtVal(
          'undefined'
        )} in ${fmtVal(getModelName(table))} using ${kleur.red(
          'SELECT *'
        )}. ${kleur.dim('(Column is INVISIBLE.)')}`;
      });
    if (baseTypeNotes.length > 0) {
      baseTypeNotes.unshift(kleur.italic('Notes:'));
    }
    log.info([
      kleur.bold('Model Type:') + ' ' + fmtVal(getModelName(table)),
      ...formatCode(typeDecls.model),
      ...baseTypeNotes
    ]);
    console.log();

    log.info([
      kleur.bold('Primary Key Type:') +
        ' ' +
        fmtVal(getModelPrimaryKeyTypeName(table)),
      ...formatCode(typeDecls.primaryKey)
    ]);
    console.log();

    const createDataNotes = table.columns
      .map((c) => {
        const p = getCreateModelFieldPresence(c);
        if (p === CreateModelFieldPresence.omittedGenerated) {
          return `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
            getModelCreateDataTypeName(table)
          )}. ${kleur.dim('(Column is GENERATED.)')}`;
        }
        if (p === CreateModelFieldPresence.optionalAutoIncrement) {
          return `- ${fmtVarName(getFieldName(c))} is optional in ${fmtVal(
            getModelCreateDataTypeName(table)
          )}. ${kleur.dim('(Column is auto_increment.)')}`;
        }
        if (p === CreateModelFieldPresence.optionalHasDefault) {
          return `- ${fmtVarName(getFieldName(c))} is optional in ${fmtVal(
            getModelCreateDataTypeName(table)
          )}. ${kleur.dim('(Column has default value.)')}`;
        }
        return '';
      })
      .filter((s) => s.length > 0);

    if (createDataNotes.length > 0) {
      createDataNotes.unshift(kleur.italic('Notes:'));
    }
    log.info([
      kleur.bold('Create Data Type:') +
        ' ' +
        fmtVal(getModelCreateDataTypeName(table)),
      ...formatCode(typeDecls.createData),
      ...createDataNotes
    ]);
    console.log();

    const updateDataNotes = table.columns
      .map((c) => {
        const p = getUpdateModelFieldPresence(c);
        if (p === UpdateModelFieldPresence.omittedGenerated) {
          return `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
            getModelUpdateDataTypeName(table)
          )}. ${kleur.dim('(Column is GENERATED.)')}`;
        }
        if (p === UpdateModelFieldPresence.omittedPrimaryKey) {
          return `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
            getModelUpdateDataTypeName(table)
          )}. ${kleur.dim('(Column is primary key.)')}`;
        }

        return '';
      })
      .filter((s) => s.length > 0);

    if (updateDataNotes.length > 0) {
      updateDataNotes.unshift(kleur.italic('Notes:'));
    }

    log.info([
      kleur.bold('Update Data Type:') +
        ' ' +
        fmtVal(getModelUpdateDataTypeName(table)),
      ...formatCode(typeDecls.updateData),
      ...updateDataNotes
    ]);
    console.log();

    const uniqueNotes = table.columns
      .filter((c) => isUnique(c))
      .map((c) => {
        return `- ${fmtVarName(getFieldName(c))} is unique. ${kleur.dim(
          '(Key: UNI)'
        )}`;
      });

    if (uniqueNotes.length > 0) {
      uniqueNotes.unshift(kleur.italic('Notes:'));
    }
    log.info([
      kleur.bold('Find Unique Type:') +
        ' ' +
        fmtVal(getModelFindUniqueParamsTypeName(table)),
      ...formatCode(typeDecls.findUniqueParams),
      ...uniqueNotes
    ]);

    if (showHeader) {
      log.footer();
    }
  }

  showModelFieldTypes(table: FetchedTable, showHeader: boolean) {
    if (showHeader) {
      log.header(`Field Types | Model: ${getModelName(table)}`);
    }

    log.info(kleur.bold(`Fields (${table.columns.length})`));
    log.table(
      [
        ...table.columns.map((c) => [
          fmtVarName(getFieldName(c)),
          fmtVal(
            getJavascriptType(c, this.options) + (isNullable(c) ? '|null' : '')
          ),
          kleur.dim(getCastType(c, this.options)),
          kleur.dim(c.Field),
          kleur.dim(c.Type)
        ])
      ],
      ['Field', 'Javascript Type', 'Cast', 'Column', 'Type']
    );
    console.log();
    const primaryKeys = table.columns.filter(c => isPrimaryKey(c))
    log.info(kleur.bold(`Primary Key${primaryKeys.length !== 1 ? 's' : ''}: ${primaryKeys.map(c => fmtVarName(getFieldName(c))).join(', ')}`));



    console.log();
    log.info([kleur.bold(`Field Type Notes`)]);
    log.table(
      [
        ...table.columns.map((c) => [
          fmtVarName(getFieldName(c)),
          fmtVal(getJavascriptType(c, this.options)),
          this.explainJsType(c)
        ])
      ],
      ['Field', 'Type', 'Note']
    );
    if (showHeader) {
      log.footer();
    }
  }

  showModelCreateSql(table: FetchedTable, showHeader: boolean) {
    if (showHeader) {
      log.header(`Create Table | Model: ${getModelName(table)}`);
    }
    log.info([
      kleur.bold('Create Table: '),
      ...table.createSql.split('\n').map((s) => kleur.red(`${s}`))
    ]);
    if (showHeader) {
      log.footer();
    }
  }

  showTypeOptions(showHeader: boolean) {
    if (showHeader) {
      log.header(`Type Options`);
    }
    const typeImports =
      this.options.typeImports.length === 0
        ? [[fmtVarName('typeImports'), kleur.dim('none')]]
        : this.options.typeImports.map((s, i) => [
            i === 0 ? fmtVarName('typeImports') : '',
            fmtVal(s)
          ]);
    log.table([
      [
        fmtVarName('typeBigIntAsString'),
        fmtVal(JSON.stringify(this.options.typeBigIntAsString))
      ],
      [
        fmtVarName('typeTinyIntOneAsBoolean'),
        fmtVal(JSON.stringify(this.options.typeTinyIntOneAsBoolean))
      ],
      ...typeImports
    ]);
    if (showHeader) {
      log.footer();
    }
  }

  showFieldInfo(table: FetchedTable, column: Column, showHeader: boolean) {
    if (showHeader) {
      log.header(
        `Field: ${getFieldName(column)} | Model: ${getModelName(table)}`
      );
    }
    const keys = Object.keys(column) as (keyof Column)[];
    const data = {
      isPrimaryKey: isPrimaryKey(column),
      isAutoIncrement: isAutoIncrement(column),
      isUnique: isUnique(column),
      isNullable: isNullable(column),
      hasDefault: hasDefault(column),
      isGeneratedAlways: isGeneratedAlways(column),
      isInvisible: isInvisible(column)
    };
    log.info(kleur.bold(`Field Details: ${getFieldName(column)}`));
    log.table([
      ['Field Name', fmtVal(getFieldName(column))],
      ['Column Name', fmtVal(column.Field)],
      ['Javscript Type', fmtVal(getJavascriptType(column, this.options))],
      ['Type Note', this.explainJsType(column)],
      ['Cast Type', fmtVal(getCastType(column, this.options))],
      ...Object.keys(data).map((k) => [
        k,
        fmtVal(JSON.stringify(data[k as keyof typeof data]))
      ])
    ]);
    console.log();
    log.info(kleur.bold(`MySql Column`));
    log.table([
      ...keys.map((k) => [
        fmtVarName(k),
        fmtVal(
          (typeof column[k] === 'string'
            ? column[k]
            : column[k] === null
            ? 'null'
            : JSON.stringify(column[k])) as string
        )
      ])
    ]);
    if (showHeader) {
      log.footer();
    }
  }
}
