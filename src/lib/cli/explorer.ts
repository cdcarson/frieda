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
  getUpdateModelFieldPresence
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
const { format } = prettier;

type MigrationType =
  | 'addEnumTypeAnnotation'
  | 'editEnumTypeAnnotation'
  | 'removeEnumTypeAnnotation';

type MigrationChoice = {
  value: MigrationType;
  title: string;
};

export class Explorer {
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

  getMigrationChoices(column: Column): MigrationChoice[] {
    const options: MigrationChoice[] = [];
    const mysqlType = getMysqlBaseType(column);
    if ('enum' === mysqlType) {
      const annotation = getValidEnumAnnotation(column);
      if (annotation) {
        options.push(
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
        options.push({
          value: 'addEnumTypeAnnotation',
          title: `Add @enum type annotation`
        });
      }
    }
    return options;
  }

  async modifyField(table: FetchedTable, column: Column): Promise<void> {
    const choices = this.getMigrationChoices(column);
    const migrate = await prompt<MigrationType>({
      message: 'Modify field',
      name: 'migrate',
      type: 'select',
      choices
    });
    console.log();

    //const foo = table.createSql.

    if (
      migrate === 'addEnumTypeAnnotation' ||
      migrate === 'editEnumTypeAnnotation'
    ) {
      const type = await prompt({
        type: 'text',
        name: 't',
        message: 'Enter type:',
        initial: getValidEnumAnnotation(column)?.argument || ''
      });
      console.log();
      let comment = column.Comment;
      const annotations = getCommentAnnotations(column).filter(
        (a) => a.annotation === 'enum'
      );
      annotations.forEach((a) => {
        comment = comment.replace(a.fullAnnotation, '');
      });
      comment = comment.trim();
      comment = [comment, `@enum(${type})`].join(' ').trim();
      const statement = join(
        [
          sql`ALTER TABLE ${bt(table.name)}`,
          sql`   MODIFY COLUMN ${bt(column.Field)} ${raw(column.Type)} `,
          sql`   ${raw(isNullable(column) ? 'NULL' : 'NOT NULL')}`,
          sql`   COMMENT "${raw(comment)}";`
        ],
        '\n'
      );

      await this.runMigration(statement);
    }
    if (migrate === 'removeEnumTypeAnnotation') {
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
      await this.runMigration(statement);
    }
  }

  async runMigration(statement: Sql): Promise<void> {
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
      return;
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

  showModelIndexes(table: FetchedTable) {
    log.header(`Indexes | Model: ${getModelName(table)}`);
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
    log.footer();
  }

  showModelSearchIndexes(table: FetchedTable) {
    const searchIndexes = getFullTextSearchIndexes(table);
    log.header(`Full Text Search Indexes | Model: ${getModelName(table)}`);
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
    log.footer();
  }

  showModelFieldTypes(table: FetchedTable) {
    log.header(`Field Types | Model: ${getModelName(table)}`);
    log.info(kleur.bold(`Fields (${table.columns.length})`));
    log.table(
      [
        ...table.columns.map((c) => [
          fmtVarName(getFieldName(c)),
          fmtVal(
            getJavascriptType(c, this.options) + (isNullable(c) ? '|null' : '')
          ),
          kleur.dim(getCastType(c, this.options)),
          kleur.dim(c.Type)
        ])
      ],
      ['Field', 'Javascript Type', 'Cast', 'Column Type']
    );

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
    log.footer();
  }

  showModelBaseType(table: FetchedTable) {
    log.header(`Model Type | Model: ${getModelName(table)}`);
    const typeDecls = getModelTypeDeclarations(table, this.options);
    const notes = table.columns
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
    if (notes.length > 0) {
      notes.unshift(kleur.italic('Notes:'));
    }
    const code = format(typeDecls.model, {
      filepath: 'x.ts',
      useTabs: false,
      printWidth: getStdOutCols() - 4
    })
      .trim()
      .split('\n')
      .map((s) => kleur.red(s));
    log.info([
      kleur.bold('Model Type:') + ' ' + fmtVal(getModelName(table)),
      ...code,
      ...notes
    ]);
    log.footer();
  }

  showModelPrimaryKeyType(table: FetchedTable) {
    log.header(`Primary Key Type | Model: ${getModelName(table)}`);
    const typeDecls = getModelTypeDeclarations(table, this.options);

    const primaryKeyCode = format(typeDecls.primaryKey, {
      filepath: 'x.ts',
      useTabs: false,
      printWidth: getStdOutCols() - 4
    })
      .trim()
      .split('\n')
      .map((s) => kleur.red(s));

    log.info([
      kleur.bold('Primary Key Type:') +
        ' ' +
        fmtVal(getModelPrimaryKeyTypeName(table)),
      ...primaryKeyCode
    ]);
    log.footer();
  }

  showModelCreateDataType(table: FetchedTable) {
    log.header(`Create Data Type | Model: ${getModelName(table)}`);
    const typeDecls = getModelTypeDeclarations(table, this.options);

    const createDataCode = format(typeDecls.createData, {
      filepath: 'x.ts',
      useTabs: false,
      printWidth: getStdOutCols() - 4
    })
      .trim()
      .split('\n')
      .map((s) => kleur.red(s));
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
      ...createDataCode,
      ...createDataNotes
    ]);
    log.footer();
  }

  showModelUpdateDataType(table: FetchedTable) {
    log.header(`Update Data Type | Model: ${getModelName(table)}`);
    const typeDecls = getModelTypeDeclarations(table, this.options);

    const updateDataCode = format(typeDecls.updateData, {
      filepath: 'x.ts',
      useTabs: false,
      printWidth: getStdOutCols() - 4
    })
      .trim()
      .split('\n')
      .map((s) => kleur.red(s));

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
      ...updateDataCode,
      ...updateDataNotes
    ]);
    log.footer();
  }

  showModelFindUniqueType(table: FetchedTable) {
    log.header(`Find Unique Type | Model: ${getModelName(table)}`);
    const typeDecls = getModelTypeDeclarations(table, this.options);
    const uniqueCode = format(typeDecls.findUniqueParams, {
      filepath: 'x.ts',
      useTabs: false,
      printWidth: getStdOutCols() - 4,
      singleQuote: true
    })
      .trim()
      .split('\n')
      .map((s) => kleur.red(s));

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
      ...uniqueCode,
      ...uniqueNotes
    ]);
    log.footer();
  }

  showModelCreateSql(table: FetchedTable) {
    log.header(`Create Table | Model: ${getModelName(table)}`);
    log.info([
      kleur.bold('Model: ') +
        fmtVal(getModelName(table)) +
        kleur.dim(` (table: ${table.name})`),
      ...table.createSql.split('\n').map((s) => kleur.red(`${s}`))
    ]);
    log.footer();
  }

  showTypeOptions() {
    log.header(`Type Options`);
    log.table([
      [
        fmtVarName('typeBigIntAsString'),
        fmtVal(JSON.stringify(this.options.typeBigIntAsString))
      ],
      [
        fmtVarName('typeTinyIntOneAsBoolean'),
        fmtVal(JSON.stringify(this.options.typeTinyIntOneAsBoolean))
      ],
      [
        fmtVarName('typeImports'),
        fmtVal(JSON.stringify(this.options.typeImports))
      ]
    ]);
    log.footer();
  }
}
