import { join, raw, type Sql } from 'sql-template-tag';
import { log, prompt, fmtVal, squishWords, formatSql, getFieldColumnDefinition } from './utils.js';
import kleur from 'kleur';
import sql from 'sql-template-tag';
import { edit } from 'external-editor';
import type { Model } from './model.js';
import type { Field } from './field.js';
import { bt, type MysqlBaseType } from '$lib/index.js';
import type { Schema } from './schema.js';
import type { Annotation } from './types.js';

export const invisibleRx = /(\/\*!\d+\s+INVISIBLE\s*\*\/)|(INVISIBLE)/i;

export const getBulkEditModelFieldsSql = (model: Model): string => {
  const colDefs = model.fields.map(
    (f) => sql`MODIFY COLUMN ${raw(getColumnDef(model, f))}`
  );
  const statement = sql`ALTER TABLE ${bt(model.tableName)} ${join(colDefs)}`;
  const toEdit = formatSql(statement.sql);
  const edited = edit(toEdit);
  return formatSql(edited);
};

export const getAddModelSql = async (
  schema: Schema
): Promise<{ statement: string; tableName: string }> => {
  log.info(
    kleur.italic(
      'Table name: Use the case you normally use for database tables.'
    )
  );
  const tableNames = schema.models.map((m) => m.tableName);
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

  return { statement: formatSql(statement.sql), tableName };
};

export const getDropModelSql = (model: Model): string => {
  return formatSql(sql`DROP TABLE ${bt(model.tableName)}`.sql);
};
export const getAddFieldSql = async (
  model: Model
): Promise<{ statement: string; columnName: string }> => {
  log.info(
    kleur.italic(
      'Column name: Use the case you normally use for database columns.'
    )
  );
  const columnNames = model.fields.map((m) => m.columnName);
  const columnName = await prompt<string>({
    type: 'text',
    name: 'columnName',
    message: 'Column name',
    validate: (s) => {
      if (typeof s !== 'string' || s.trim().length === 0) {
        return 'Required.';
      }
      if (columnNames.includes(s)) {
        return 'Column exists.';
      }
      return true;
    }
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
          title: `Type as javascript ${fmtVal('string')}`,
          value: false
        },
        {
          title: `Type as javascript ${fmtVal('Set')}`,
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
    let jsonType = await promptJsonType();

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

  const statement = join(
    [
      sql`ALTER TABLE ${bt(model.tableName)}`,
      sql`   ADD COLUMN ${bt(columnName)} ${raw(typeStr)} ${raw(
        nullable
      )} ${raw(defaultStr)} ${raw(comment)}`
    ],
    '\n'
  );
  return {
    statement: formatSql(statement.sql),
    columnName
  };
};

export const getColumnDef = (model: Model, field: Field): string => {
  const def = getFieldColumnDefinition(model, field);
  return def.replace(invisibleRx, 'INVISIBLE')
}

export const getToggleBigIntAnnotationSql = (
  model: Model,
  field: Field
): string => {
  let comment = removeCommentAnnotationsByType(field, 'bigint');

  if (!field.bigIntAnnotation) {
    comment += ` @bigint`;
  }
  comment = comment.trim();
  const colDef = replaceOrAddColDefComment(getColumnDef(model, field), comment);
  const statement = sql`
    ALTER TABLE ${bt(model.tableName)}
    MODIFY COLUMN ${raw(colDef)}
  `;
  return formatSql(statement.sql);
};

export const getEditFieldManuallySql = (model: Model, field: Field): string => {
  const colDef = getColumnDef(model, field);
  const toEdit = formatSql(
    sql`
      ALTER TABLE ${bt(model.tableName)}
      MODIFY COLUMN ${raw(colDef)}
    `.sql
  );
  const edited = edit(toEdit);
  return formatSql(edited);
};

export const getDropFieldSql = (model: Model, field: Field): string => {
  const statement = sql`
    ALTER TABLE ${bt(model.tableName)}
    DROP COLUMN ${bt(field.columnName)}
  `;
  return formatSql(statement.sql);
};
export const getRenameModelSql = async (
  model: Model,
): Promise<{ statement: string; tableName: string }> => {
  const tableName = await prompt<string>({
    message: `Rename column ${model.tableName}`,
    type: 'text',
    name: 'name'
  });
  
  const statement = sql`
    RENAME TABLE ${bt(model.tableName)} TO ${bt(tableName)}
  `;
  return { statement: formatSql(statement.sql), tableName };
};

export const getRenameFieldSql = async (
  model: Model,
  field: Field
): Promise<{ statement: string; columnName: string }> => {
  const columnName = await prompt<string>({
    message: `Rename column ${field.columnName}`,
    type: 'text',
    name: 'name'
  });

  const statement = sql`
    ALTER TABLE ${bt(model.tableName)}
    RENAME COLUMN ${bt(field.columnName)} TO ${bt(columnName)}
  `;
  return { statement: formatSql(statement.sql), columnName };
};

export const getToggleTinyIntBooleanSql = (
  model: Model,
  field: Field
): string => {
  let colDef = getColumnDef(model, field);
  const sqlType = field.isTinyIntOne ? 'tinyint' : 'tinyint(1)';
  colDef = colDef.replace(/tinyint(?:\(\d*\))?/, sqlType);

  const statemnet = sql`
    ALTER TABLE ${bt(model.tableName)}
    MODIFY COLUMN ${raw(colDef)}
  `;
  return formatSql(statemnet.sql);
};

export const getToggleInvisibleSql = (model: Model, field: Field): string => {
  let colDef = getColumnDef(model, field);
  colDef = colDef.replace(invisibleRx, '');
  if (!field.isInvisible) {
    colDef += ' INVISIBLE';
  }
  const statement = sql`
    ALTER TABLE ${bt(model.tableName)}
    MODIFY COLUMN ${raw(colDef)}
  `;
  return formatSql(statement.sql);
};

export const getToggleSetAnnotationSql = (
  model: Model,
  field: Field
): string => {
  let comment = removeCommentAnnotationsByType(field, 'set');
  if (!field.setAnnotation) {
    comment += ` @set`;
  }
  const colDef = replaceOrAddColDefComment(getColumnDef(model, field), comment);
  const statement = sql`
    ALTER TABLE ${bt(model.tableName)}
    MODIFY COLUMN ${raw(colDef)}
  `;
  return formatSql(statement.sql);
};

export const getEditJsonAnnotationSql = async (
  model: Model,
  field: Field
): Promise<string> => {
  let comment = removeCommentAnnotationsByType(field, 'json');
  const jsonType = await promptJsonType(field.jsonAnnotation?.typeArgument);
  if (jsonType.length > 0) {
    comment = comment + ` @json(${jsonType})`;
  }

  const colDef = replaceOrAddColDefComment(getColumnDef(model, field), comment);
  const statement = sql`
    ALTER TABLE ${bt(model.tableName)}
    MODIFY COLUMN ${raw(colDef)}
  `;
  return formatSql(statement.sql);
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

const removeCommentAnnotationsByType = (field: Field, a: Annotation) => {
  const annotations = field.typeAnnotations.filter((c) => c.annotation === a);
  let comment = field.column.Comment;
  annotations.forEach((a) => {
    comment = comment.replace(a.fullAnnotation, '');
  });
  return comment.trim();
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
    message: `${fmtVal(
      '@json'
    )} type annotation (leave blank to remove or omit)`,
    initial: initial || ''
  });
  return jsonType.trim();
};
