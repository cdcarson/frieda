import type { FetchedSchema, FetchedTable } from '$lib/fetch/types.js';
import { join, raw, type Sql } from 'sql-template-tag';
import log from './ui/log.js';
import kleur from 'kleur';
import { prompt } from './ui/prompt.js';
import { bt, type Column, type MysqlBaseType } from '$lib/index.js';
import { fmtVal, squishWords } from './ui/formatters.js';
import sql from 'sql-template-tag';
import { format } from 'sql-formatter';
import { edit } from 'external-editor';
import {
  getBigIntAnnotation,
  getCommentAnnotations,
  getSetAnnotation,
  getValidEnumAnnotation,
  getValidJsonAnnotation
} from '$lib/parse/field-parsers.js';
import type { Annotation } from '$lib/parse/types.js';
export const getModifyModelByHandSql = (table: FetchedTable): Sql => {
  const colDefs = table.columns.map(
    (c) => sql`MODIFY COLUMN ${raw(getColumnDef(table, c))}`
  );
  const statement = sql`ALTER TABLE ${bt(table.name)} ${join(colDefs)}`;
  const toEdit = format(statement.sql);
  const edited = edit(toEdit);
  return raw(edited);
};
export const getAddModelSql = async (schema: FetchedSchema): Promise<Sql> => {
  log.info(
    kleur.italic(
      'Table name: Use the case you normally use for database tables.'
    )
  );
  const tableNames = schema.tables.map((t) => t.name);
  const tableName = await prompt<string>({
    type: 'text',
    name: 'tableName',
    message: 'Table name',
    validate: (s) => {
      if (typeof s !== 'string' || s.trim().length === 0) {
        return 'Required.';
      }
      if (tableNames.includes(s)) {
        return 'Table exists.';
      }
      return true;
    }
  });
  log.info(
    kleur.italic(
      'Primary key name: Use the case you normally use for database columns.'
    )
  );
  const primaryKeyName = await prompt<string>({
    type: 'text',
    name: 'primareKeyName',
    message: 'Primary key name',
    initial: 'id',
    validate: (s) => {
      if (typeof s !== 'string' || s.trim().length === 0) {
        return 'Required.';
      }
      return true;
    }
  });

  const statement = sql`CREATE TABLE ${bt(tableName)} (
    ${bt(primaryKeyName)} bigint unsigned NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (${bt(primaryKeyName)})
  )`;

  return statement;
};

export const getDropModelSql = (table: FetchedTable): Sql => {
  return sql`DROP TABLE ${bt(table.name)}`;
};
export const getAddFieldSql = async (table: FetchedTable): Promise<Sql> => {
  log.info(
    kleur.italic(
      'Column name: Use the case you normally use for database columns.'
    )
  );
  const columnName = await prompt<string>({
    type: 'text',
    name: 'columnName',
    message: 'Column name'
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
          title: 'Type as javascript string',
          value: false
        },
        {
          title: 'Type as javascript Set',
          value: true
        }
      ]
    });
    if (typeAsSet) {
      comment = `COMMENT '@set'`;
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
    log.info([
      ...kleur
        .italic(
          squishWords(
            `By default json columns are typed as unknown.
            You can get around this by adding a @json type annotation.
            Any valid typescript is ok. Examples:
            `
          )
        )
        .split('\n'),
      kleur.dim('Import type from a library...'),
      kleur.red(`import('stripe').Transaction`),
      kleur.dim('Import type from your code...'),
      kleur.red(`import('../api.js').Preferences`),
      kleur.dim('or...'),
      kleur.red(`Partial<import('../api.js').Preferences>`),
      kleur.dim('Inline type...'),
      kleur.red('{foo: string; bar: number, baz: number[]}')
    ]);
    let jsonType = await prompt<string>({
      type: 'text',
      name: 'jsonType',
      message: 'Enter JSON type (leave blank to skip)'
    });

    if (jsonType.trim().length > 0) {
      jsonType = jsonType.trim().replaceAll(`'`, `''`);
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

  return join(
    [
      sql`ALTER TABLE ${bt(table.name)}`,
      sql`   ADD COLUMN ${bt(columnName)} ${raw(typeStr)} ${raw(
        nullable
      )} ${raw(defaultStr)} ${raw(comment)}`
    ],
    '\n'
  );
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

export const getBigIntAnnotationSql = (table: FetchedTable, column: Column) => {
  let comment = removeCommentAnnotationsByType(column, 'bigint');

  const annotation = getBigIntAnnotation(column);
  if (!annotation) {
    comment += ` @bigint`;
  }
  comment = comment.trim();
  const colDef = replaceOrAddColDefComment(
    getColumnDef(table, column),
    comment
  );
  return sql`
    ALTER TABLE ${bt(table.name)}
    MODIFY COLUMN ${colDef}
  `;
};

export const getEditFieldManuallySql = (
  table: FetchedTable,
  column: Column
): Sql => {
  const colDef = getColumnDef(table, column);
  return sql`
  ALTER TABLE ${bt(table.name)}
  MODIFY COLUMN ${colDef}
`;
};

export const getDropFieldSql = (table: FetchedTable, column: Column): Sql => {
  return sql`
  ALTER TABLE ${bt(table.name)}
  DROP COLUMN ${bt(column.Field)}
`;
};
export const getRenameFieldSql = async (
  table: FetchedTable,
  column: Column
): Promise<Sql> => {
  const name = await prompt<string>({
    message: `Rename column ${column.Field}`,
    type: 'text',
    name: 'name'
  });

  return sql`
  ALTER TABLE ${bt(table.name)}
  RENAME COLUMN ${bt(column.Field)} TO ${bt(name)}
`;
};

export const getTinyIntTypeSql = (
  table: FetchedTable,
  column: Column,
  typeAsBoolean: boolean
): Sql => {
  let colDef = getColumnDef(table, column);
  const sqlType = typeAsBoolean ? 'tinyint(1)' : 'tinyint';
  colDef = colDef.replace(/tinyint(?:\(\d*\))?/, sqlType);

  return sql`
    ALTER TABLE ${bt(table.name)}
    MODIFY COLUMN ${colDef}
  `;
};

export const getEditSetAnnotationSql = async (
  table: FetchedTable,
  column: Column
): Promise<Sql> => {
  let comment = removeCommentAnnotationsByType(column, 'set');
  const annotation = getSetAnnotation(column);
  const setType = await promptSetType(
    annotation ? annotation.argument || '' : ''
  );
  comment = comment + (setType.length === 0 ? ' @set' : ` @set(${setType})`);
  const colDef = replaceOrAddColDefComment(
    getColumnDef(table, column),
    comment
  );
  return sql`
    ALTER TABLE ${bt(table.name)}
    MODIFY COLUMN ${colDef}
  `;
};

export const getRemoveSetAnnotationSql = (
  table: FetchedTable,
  column: Column
): Sql => {
  const comment = removeCommentAnnotationsByType(column, 'set');
  const colDef = replaceOrAddColDefComment(
    getColumnDef(table, column),
    comment
  );
  return sql`
      ALTER TABLE ${bt(table.name)}
      MODIFY COLUMN ${colDef}
    `;
};

export const getEditEnumAnnotationSql = async (
  table: FetchedTable,
  column: Column
): Promise<Sql> => {
  let comment = removeCommentAnnotationsByType(column, 'enum');
  const annotation = getValidEnumAnnotation(column);
  const enumType = await promptEnumType(
    annotation ? annotation.argument || '' : ''
  );
  if (enumType.length === 0) {
    return getRemoveEnumAnnotationSql(table, column);
  }
  comment = comment + ` @enum(${enumType})`;
  const colDef = replaceOrAddColDefComment(
    getColumnDef(table, column),
    comment
  );
  return sql`
    ALTER TABLE ${bt(table.name)}
    MODIFY COLUMN ${colDef}
  `;
};

export const getRemoveEnumAnnotationSql = (
  table: FetchedTable,
  column: Column
): Sql => {
  const comment = removeCommentAnnotationsByType(column, 'enum');
  const colDef = replaceOrAddColDefComment(
    getColumnDef(table, column),
    comment
  );
  return sql`
      ALTER TABLE ${bt(table.name)}
      MODIFY COLUMN ${colDef}
    `;
};

export const getEditJsonAnnotationSql = async (
  table: FetchedTable,
  column: Column
): Promise<Sql> => {
  let comment = removeCommentAnnotationsByType(column, 'json');
  const annotation = getValidJsonAnnotation(column);
  const jsonType = await promptJsonType(
    annotation ? annotation.argument || '' : ''
  );
  if (jsonType.length === 0) {
    return getRemoveJsonAnnotationSql(table, column);
  }
  comment = comment + ` @json(${jsonType})`;
  const colDef = replaceOrAddColDefComment(
    getColumnDef(table, column),
    comment
  );
  return sql`
    ALTER TABLE ${bt(table.name)}
    MODIFY COLUMN ${colDef}
  `;
};

export const getRemoveJsonAnnotationSql = (
  table: FetchedTable,
  column: Column
): Sql => {
  const comment = removeCommentAnnotationsByType(column, 'json');
  const colDef = replaceOrAddColDefComment(
    getColumnDef(table, column),
    comment
  );
  return sql`
      ALTER TABLE ${bt(table.name)}
      MODIFY COLUMN ${colDef}
    `;
};

export const replaceOrAddColDefComment = (
  colDef: string,
  newCommentText: string
) => {
  const rx = /COMMENT\s+'.*'/;
  if (rx.test(colDef)) {
    colDef = colDef.replace(rx, '');
  }
  if (newCommentText.length === 0) {
    return colDef;
  }
  return colDef + ` COMMENT '${newCommentText.replaceAll(`'`, `''`)}'`;
};

const removeCommentAnnotationsByType = (column: Column, a: Annotation) => {
  const annotations = getCommentAnnotations(column).filter(
    (c) => c.annotation === a
  );
  let comment = column.Comment;
  annotations.forEach((a) => {
    comment = comment.replace(a.fullAnnotation, '');
  });
  return comment.trim();
};

const promptSetType = async (initial?: string): Promise<string> => {
  log.info([
    ...kleur
      .italic(
        squishWords(
          `
          You can add an imported type 
          to the ${fmtVal('@set')} annotation. This is optional.
          If omitted the Set type will be derived from the 
          column's ${fmtVal('set')} definition.
          `
        )
      )
      .split('\n'),
    kleur.dim('Example'),
    kleur.red(`import('../api.js').Color`)
  ]);
  const t = await prompt<string>({
    type: 'text',
    name: 'type',
    message: `${fmtVal('@set')} type annotation (leave blank to omit)`,
    initial: initial || ''
  });
  return t.trim();
};

const promptEnumType = async (initial?: string): Promise<string> => {
  log.info([
    ...kleur
      .italic(
        squishWords(
          `
          You can type ${fmtVal('enum')} columns
          with an ${fmtVal('@enum(MyType)')} annotation. This is optional.
          If omitted the type will be derived from the 
          column's ${fmtVal('enum')} definition.
          `
        )
      )
      .split('\n'),
    kleur.dim('Example'),
    kleur.red(`import('../api.js').Color`)
  ]);
  const t = await prompt<string>({
    type: 'text',
    name: 'type',
    message: `${fmtVal('@enum')} type annotation (leave blank to omit)`,
    initial: initial || ''
  });
  return t.trim();
};

const promptJsonType = async (initial?: string): Promise<string> => {
  log.info([
    ...kleur
      .italic(
        squishWords(
          `By default ${fmtVal('json')} columns are typed as unknown.
          You can get around this by adding a ${fmtVal(
            '@json(MyType)'
          )} type annotation.
          Any valid typescript is ok. Examples:
          `
        )
      )
      .split('\n'),
    kleur.dim('Import type from a library...'),
    kleur.red(`import('stripe').Transaction`),
    kleur.dim('Import type from your code...'),
    kleur.red(`import('../api.js').Preferences`),
    kleur.dim('or...'),
    kleur.red(`Partial<import('../api.js').Preferences>`),
    kleur.dim('Inline type...'),
    kleur.red('{foo: string; bar: number, baz: number[]}')
  ]);
  const jsonType = await prompt<string>({
    type: 'text',
    name: 'jsonType',
    message: `${fmtVal('@json')} type annotation (leave blank to omit)`,
    initial: initial || ''
  });
  return jsonType.trim();
};
