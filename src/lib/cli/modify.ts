import type { FetchedSchema, FetchedTable } from '$lib/fetch/types.js';
import { bt, type Column, type MysqlBaseType } from '$lib/index.js';
import { join, raw, type Sql } from 'sql-template-tag';
import sql from 'sql-template-tag';
import { prompt } from './ui/prompt.js';
import {
  getCommentAnnotations,
  getMysqlBaseType,
  getValidJsonAnnotation,
  isInvisible,
  isTinyIntOne
} from '$lib/parse/field-parsers.js';
import type { Connection } from '@planetscale/database';
import log from './ui/log.js';
import kleur from 'kleur';
import ora from 'ora';
import { edit } from 'external-editor';
import { squishWords } from './ui/formatters.js';
import type { Annotation } from '$lib/parse/types.js';
import type { GetOptionsResult } from './types.js';
import { promptModel } from './prompt-model.js';

export type FieldModification = {
  description: string;
  getSql: () => Promise<Sql>;
};

export const modify = async (
  initialSchema: FetchedSchema,
  optionsResult: GetOptionsResult,
  modelName?: string,
  fieldName?: string
): Promise<FetchedSchema> => {
  let schema: FetchedSchema = initialSchema;
  const column = await promptModel(schema, modelName)
}

export const getFieldModifications = (
  table: FetchedTable,
  column: Column
): FieldModification[] => {
  const modifications: FieldModification[] = [
    {
      description: 'Rename field',
      getSql: () => getColumnRenameSql(table, column)
    },
    {
      description: 'Edit manually',
      getSql: async () => {
        const s =
          `ALTER TABLE ${bt(table.name).sql}\n` +
          `MODIFY COLUMN ${getColumnDef(table, column)}`;

        const edited = edit(s);
        return raw(edited);
      }
    },
    {
      description: 'Drop field',
      getSql: async () => {
        const s = sql`ALTER TABLE ${bt(table.name)} DROP COLUMN ${bt(
          column.Field
        )}`;

        return s;
      }
    }
  ];
  if (isInvisible(column)) {
    modifications.push({
      description: 'Remove INVISIBLE',
      getSql: () => getMarkColumnInvisibleSql(table, column, false)
    });
  } else {
    modifications.push({
      description: 'Mark as INVISIBLE',
      getSql: () => getMarkColumnInvisibleSql(table, column, true)
    });
  }
  const mysqlType = getMysqlBaseType(column);
  if (mysqlType === 'tinyint') {
    if (isTinyIntOne(column)) {
      modifications.unshift({
        description: 'Type as integer',
        getSql: () => getTinyIntTypeSql(table, column, false)
      });
    } else {
      modifications.unshift({
        description: 'Type as boolean',
        getSql: () => getTinyIntTypeSql(table, column, true)
      });
    }
  }

  if (mysqlType === 'json') {
    const annotation = getValidJsonAnnotation(column);
    if (annotation) {
      modifications.unshift({
        description: 'Edit / Remove @json type annotation',
        getSql: () => getEditJsonTypeAnnotationSql(table, column)
      });
    } else {
      modifications.unshift({
        description: 'Add @json type annotation',
        getSql: () => getEditJsonTypeAnnotationSql(table, column)
      });
    }
  }
  return modifications;
};

export const getTinyIntTypeSql = async (
  table: FetchedTable,
  column: Column,
  asBool: boolean
): Promise<Sql> => {
  const colDef = getColumnDef(table, column);
  const sqlType = asBool ? 'tinyint(1)' : 'tinyint';
  const modified = colDef.replace(/tinyint(?:\(\d*\))?/, sqlType);
  const lines = [
    sql`ALTER TABLE ${bt(table.name)}`,
    sql`   MODIFY COLUMN ${raw(modified)}`
  ];
  return join(lines, '\n');
};

export const getColumnRenameSql = async (
  table: FetchedTable,
  column: Column
): Promise<Sql> => {
  const name = await prompt<string>({
    message: `Rename column ${column.Field}`,
    type: 'text',
    name: 'name'
  });
  const lines = [
    sql`ALTER TABLE ${bt(table.name)}`,
    sql`   RENAME COLUMN ${bt(column.Field)} TO ${bt(name)}`
  ];
  return join(lines, '\n');
};

export const getMarkColumnInvisibleSql = async (
  table: FetchedTable,
  column: Column,
  invisible: boolean
): Promise<Sql> => {
  let colDef = getColumnDef(table, column);
  const rx = /\/\*!80023 INVISIBLE \*\//;
  if (rx.test(colDef)) {
    colDef = colDef.replace(rx, invisible ? 'INVISIBLE' : '');
  } else {
    if (invisible) {
      colDef = colDef + ' INVISIBLE';
    }
  }

  const lines = [
    sql`ALTER TABLE ${bt(table.name)}`,
    sql`   MODIFY COLUMN  ${raw(colDef)}`
  ];

  return join(lines, '\n');
};

export const getEditJsonTypeAnnotationSql = async (
  table: FetchedTable,
  column: Column
): Promise<Sql> => {

  const annotationType = await promptAnnotationType('json');
  let comment = column.Comment;
  const annotations = getCommentAnnotations(column).filter(
    (a) => a.annotation === 'json'
  );
  annotations.forEach((a) => {
    comment = comment.replace(a.fullAnnotation, '');
  });
  comment = comment.trim();
  if (annotationType) {
    comment = [comment, `@json(${annotationType})`].join(' ').trim();
  }
  
  let colDef = getColumnDef(table, column);
  const rx = /COMMENT\s+'.*'/;
  if (rx.test(colDef)) {
    colDef = colDef.replace(rx, `COMMENT '${comment}'`);
  } else {
    colDef = colDef + ` COMMENT '${comment}'`;
  }
  const statement = join(
    [sql`ALTER TABLE ${bt(table.name)}`, sql`   MODIFY COLUMN ${raw(colDef)}`],
    '\n'
  );
  return statement;
};

export const getColumnDef = (table: FetchedTable, column: Column): string => {
  const rx = new RegExp(`^\\s*\`${column.Field}\``);
  const lines = table.createSql.split('\n');
  for (const line of lines) {
    if (rx.test(line)) {
      return line.replace(/,\s*$/, '');
    }
  }
  throw new Error('could not find column definition.');
};

export const runSql = async (
  connection: Connection,
  statement: Sql
): Promise<boolean> => {
  log.info([
    kleur.bold('SQL'),
    ...statement.sql.split('\n').map((s) => kleur.red(s))
  ]);
  const ok = await prompt({
    type: 'confirm',
    message: 'Run SQL',
    name: 'ok'
  });
  if (!ok) {
    return false;
  }
  const spin = ora('Executing statement').start();
  try {
    await connection.execute(statement.sql);
    spin.succeed('Statement executed.');
    return true;
  } catch (error) {
    spin.fail(kleur.red('Query failed: ') + (error as Error).message);
    const editIt = await prompt({
      type: 'confirm',
      name: 'e',
      message: 'Edit SQL manually?'
    });
    if (editIt) {
      const newSql = edit(statement.sql);
      return await runSql(connection, raw(newSql));
    }
    return false;
  }
};

export const addField = async (
  table: FetchedTable,
  connection: Connection
): Promise<boolean> => {
  log.info(kleur.italic('Use the case you normally use for database columns.'));
  const columnName = await prompt<string>({
    type: 'text',
    name: 'columnName',
    message: 'Column name',
    hint: 'Use the case you normally use for columns'
  });

  const typeChoices: { title: string; value: MysqlBaseType }[] = [
    { title: 'boolean', value: 'boolean' },
    { title: 'integer', value: 'int' },
    { title: 'float', value: 'float' },
    { title: 'date', value: 'datetime' },
    { title: 'string', value: 'varchar' },
    { title: 'enum', value: 'enum' },
    { title: 'set', value: 'set' },
    { title: 'json', value: 'json' }
  ];
  const baseType = await prompt<MysqlBaseType>({
    type: 'select',
    message: 'Field type',
    name: 'type',
    choices: typeChoices
  });

  let typeStr: string = baseType;
  let comment = '';
  let defaultStr = '';

  if ('int' === baseType) {
    const choices: { title: string; value: MysqlBaseType }[] = (
      ['int', 'tinyint', 'smallint', 'mediumint', 'bigint'] as MysqlBaseType[]
    ).map((t) => {
      return {
        value: t,
        title: t as string
      };
    });
    const intType = await prompt<string>({
      type: 'select',
      choices,
      message: 'Integer type',
      name: 'intType'
    });
    const unsigned = await prompt({
      type: 'confirm',
      name: 'unsigned',
      message: 'Unsigned'
    });
    typeStr = unsigned ? intType + ' unsigned' : intType;
    if ('bigint' === intType) {
      const typeAsBigInt = await prompt<boolean>({
        type: 'select',
        name: 'typeAs',
        message: 'Javascript type',
        choices: [
          {
            title: 'string (default)',
            value: false
          },
          {
            title: 'bigint (add @bigint annotation)',
            value: true
          }
        ]
      });
      if (typeAsBigInt) {
        comment = ` COMMENT '@bigint'`;
      }
    }
    const defaultValue = await prompt<string>({
      type: 'number',
      name: 'def',
      message: `Default value (leave blank for none)`
    });
    if (!Number.isNaN(parseInt(defaultValue))) {
      defaultStr = `DEFAULT ${parseInt(defaultValue)}`;
    }
  }

  if ('float' === baseType) {
    const choices: { title: string; value: MysqlBaseType }[] = (
      ['double', 'float', 'decimal', 'numeric'] as MysqlBaseType[]
    ).map((t) => {
      return {
        value: t,
        title: t as string
      };
    });
    const floatType = await prompt<string>({
      type: 'select',
      choices,
      message: 'Float type',
      name: 'ft'
    });
    if (floatType === 'decimal' || floatType === 'numeric') {
      const precision = await prompt({
        type: 'number',
        name: 'precision',
        initial: 5,
        message: 'Precision'
      });
      const scale = await prompt({
        type: 'number',
        name: 'scale',
        initial: 2,
        message: 'Scale'
      });
      typeStr = `${floatType}(${precision},${scale})`;
    } else {
      typeStr = floatType;
    }
    const defaultValue = await prompt<string>({
      type: 'number',
      name: 'def',
      float: true,
      message: `Default value (leave blank for none)`
    });
    if (!Number.isNaN(parseFloat(defaultValue))) {
      defaultStr = `DEFAULT ${parseFloat(defaultValue)}`;
    }
  }

  if (baseType === 'datetime') {
    const choices: { title: string; value: MysqlBaseType }[] = (
      ['datetime', 'timestamp', 'date'] as MysqlBaseType[]
    ).map((t) => {
      return {
        value: t,
        title: t as string
      };
    });
    const dateType = await prompt<string>({
      type: 'select',
      choices,
      message: 'Date type',
      name: 'ft'
    });
    if ('datetime' === dateType || 'timestamp' === dateType) {
      typeStr = `${dateType}(3)`;
      const defaultValue = await prompt<string>({
        type: 'select',
        name: 'def',
        message: `Default value`,
        choices: [
          {
            title: kleur.dim('--none--'),
            value: ''
          },
          {
            title: 'created at: DEFAULT CURRENT_TIMESTAMP(3)',
            value: 'DEFAULT CURRENT_TIMESTAMP(3)'
          },
          {
            title:
              'updated at: DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)',
            value: 'DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)'
          }
        ]
      });
      if (defaultValue.length > 0) {
        defaultStr = defaultValue;
      }
    } else {
      typeStr = dateType;
    }
  }

  if ('varchar' === baseType) {
    const choices: { title: string; value: MysqlBaseType }[] = [
      'char',
      'varchar',
      'tinytext',
      'text',
      'mediumtext',
      'longtext',
      'binary',
      'varbinary',
      'tinyblob',
      'blob',
      'mediumblob',
      'longblob'
    ].map((t) => {
      return {
        value: t as MysqlBaseType,
        title: t as string
      };
    });
    const stringType = await prompt<string>({
      type: 'select',
      choices,
      message: 'Striing type',
      name: 'ft'
    });
    if (
      'varchar' === stringType ||
      'char' === stringType ||
      'binary' === stringType ||
      'varbinary' === stringType
    ) {
      const max = stringType.startsWith('var') ? 65_535 : 255;
      const size = await prompt<string>({
        type: 'number',
        name: 's',
        increment: 1,
        initial: 200,
        max,
        min: 0,
        message: 'Size'
      });
      typeStr = `${stringType}(${size})`;
    } else {
      typeStr = stringType;
    }
    const addDefault = await prompt({
      type: 'confirm',
      message: 'Add default?',
      name: 'add'
    });
    if (addDefault) {
      const defaultValue = await prompt<string>({
        type: 'text',
        name: 'def',
        float: true,
        message: `Default value`
      });
      defaultStr = `DEFAULT '${defaultValue.trim()}'`;
    }
  }

  if ('enum' === baseType) {
    log.info(
      kleur.italic('Enter single-quoted enum values separated by commas.')
    );
    const enumValues = await prompt<string>({
      type: 'text',
      name: 'enumValues',
      message: 'Enum values',
      initial: `'a','b'`
    });
    typeStr = `${typeStr}(${enumValues})`;
    log.info(
      kleur.italic(
        squishWords(`You can optionally add an explicit type to this field 
        rather than using the type derived from the enum definition above. `)
      )
    );
    const enumType = await promptAnnotationType('enum');
    if (enumType) {
      comment = `COMMENT '@enum(${enumType})'`;
    }

    const defaultValue = await prompt<string>({
      type: 'select',
      message: 'Default value',
      name: 'defaultValue',
      choices: [
        {
          title: kleur.dim('--none--'),
          value: ''
        },
        ...enumValues.split(',').map((s) => {
          return {
            title: s,
            value: s
          };
        })
      ]
    });
    if (defaultValue.length > 0) {
      defaultStr = `DEFAULT ${defaultValue}`;
    }
  }
  if ('set' === baseType) {
    log.info(
      kleur.italic('Enter single-quoted set values separated by commas.')
    );
    const setValues = await prompt({
      type: 'text',
      name: 'setValues',
      message: 'Set values',
      initial: `'a','b'`
    });
    typeStr = `${typeStr}(${setValues})`;

    const typeAsSet = await prompt({
      type: 'select',
      name: 'ty',
      message: 'Javascript type',
      choices: [
        {
          title: 'Type as javescript string',
          value: false
        },
        {
          title: 'Type as javescript Set',
          value: true
        }
      ]
    });
    if (typeAsSet) {
      comment = `COMMENT '@set'`;
      log.info(
        kleur.italic(
          squishWords(`You can optionally add an explicit type to this field 
          rather than using the type derived from the set definition above. `)
        )
      );
      const setType = await promptAnnotationType('set');
      if (setType) {
        comment = `COMMENT '@set(${setType})'`;
      }
    }

    const defaultValue = await prompt<string>({
      type: 'text',
      name: 'def',
      float: true,
      message: `Default value (leave blank for no default)`
    });
    if (defaultValue.trim().length > 0) {
      defaultStr = `DEFAULT '${defaultValue.trim()}'`;
    }
  }

  if ('json' === baseType) {
    log.info(
      kleur.italic(
        squishWords(`
        By default json columns are typed as unknown.
        You can get around this by adding a type here.`)
      )
    );
    const jsonType = await promptAnnotationType('json');

    if (jsonType) {
      comment = `COMMENT '@json(${jsonType})'`;
    }
  }
  if ('boolean' === baseType) {
    const defaultValue = await prompt<string>({
      type: 'select',
      message: 'Default value',
      name: 'defaultValue',
      choices: [
        {
          title: kleur.dim('--none--'),
          value: ''
        },
        {
          title: 'false',
          value: 'false'
        },
        {
          title: 'true',
          value: 'true'
        }
      ]
    });
    if (defaultValue.length > 0) {
      defaultStr = `DEFAULT ${defaultValue}`;
    }
  }
  const nullable = await prompt<string>({
    type: 'select',
    name: 'nullable',
    message: 'Null',
    choices: [
      { title: 'NULL', value: 'NULL' },
      { title: 'NOT NULL', value: 'NOT NULL' }
    ]
  });

  const statement = join(
    [
      sql`ALTER TABLE ${bt(table.name)}`,
      sql`   ADD COLUMN ${bt(columnName)} ${raw(typeStr)} ${raw(
        nullable
      )} ${raw(defaultStr)} ${raw(comment)}`
    ],
    '\n'
  );
  return await runSql(connection, statement);
};

const promptAnnotationType = async (
  annotation: Annotation,
): Promise<string | null> => {

  
  log.info(
    kleur.italic(
      squishWords(`
        The type can be a valid inline typescript type definition or an
        imported symbol.
      `)
    )
  );
  const annotateOption = await prompt<'import' | 'inline' | 'no'>({
    type: 'select',
    name: 'annotateOption',
    message: `Include ${kleur.red(`@` + annotation)} type annotation?`,
    choices: [
      {
        title: 'Yes, with an imported symbol',
        value: 'import'
      },
      {
        title: 'Yes, with an inline type',
        value: 'inline'
      },
      {
        title: 'No',
        value: 'no'
      }
    ]
  });
  if (annotateOption === 'no') {
    return null;
  }

  if (annotateOption === 'import') {
    let symbolName = await prompt<string>({
      type: 'text',
      name: 'symbolName',
      message: 'Symbol name'
    });
    symbolName = symbolName.trim();
    if (symbolName.length === 0) {
      return null;
    }
    let importPath = await prompt<string>({
      type: 'text',
      name: 'importPath',
      message: 'Imported symbol location'
    });
    importPath = importPath.trim();
    if (importPath.length === 0) {
      return null;
    }
    return `import("${importPath}").${symbolName}`;
  }

  let inlineType = await prompt<string>({
    type: 'text',
    name: 'inlineType',
    message: 'Inline type'
  });
  inlineType = inlineType.trim();
  if (inlineType.length === 0) {
    return null;
  }
  return inlineType;
};
