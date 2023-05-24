import {
  getFullTextSearchIndexes,
  getModelCreateDataTypeName,
  getModelFindUniqueTypeName,
  getModelName,
  getModelPrimaryKeyTypeName,
  getModelSelectAllTypeName,
  getModelUpdateDataTypeName
} from '$lib/parse/model-parsers.js';
import kleur from 'kleur';
import type { FetchedSchema, FetchedTable } from '../fetch/types.js';
import {
  fmtPath,
  fmtVal,
  fmtVarName,
  formatTypescriptCode,
  maskDatabaseURLPassword,
  squishWords
} from './ui/formatters.js';
import log from './ui/log.js';
import {
  getBigIntAnnotation,
  getCreateModelFieldPresence,
  getFieldName,
  getJavascriptType,
  getModelFieldPresence,
  getMysqlBaseType,
  getSetAnnotation,
  getUpdateModelFieldPresence,
  getValidEnumAnnotation,
  getValidJsonAnnotation,
  isNullable,
  isPrimaryKey,
  isTinyIntOne,
  isUnique
} from '../parse/field-parsers.js';
import type { Column, Index } from '$lib/index.js';
import { DEFAULT_JSON_FIELD_TYPE } from '$lib/constants.js';
import { getModelTypeDeclarations } from '$lib/generate/get-model-type-declarations.js';
import {
  CreateModelFieldPresence,
  ModelFieldPresence,
  UpdateModelFieldPresence
} from '$lib/parse/types.js';
import { format } from 'prettier';
import type { GetOptionsResult } from './types.js';
import { getColumnDef } from './sql.js';
import { hasDefault } from '../parse/field-parsers.js';

export const showModelPreamble = (table: FetchedTable) => {
  log.info([
    kleur.bold('Model:') + ` ${fmtVal(getModelName(table))}`,
    kleur.dim(`Table name: ${table.name}`)
  ]);
};

export const showModelPrimaryKeys = (table: FetchedTable) => {
  const primaryKeys = table.columns.filter((c) => isPrimaryKey(c));
  log.info(
    kleur.bold(`Primary Key${primaryKeys.length !== 1 ? 's' : ''}: `) +
      primaryKeys.map((c) => fmtVarName(getFieldName(c))).join(', ')
  );
};

export const showModelFields = (table: FetchedTable) => {
  log.info(kleur.bold(`Fields (${table.columns.length})`));

  log.table(
    [
      ...table.columns.map((c) => {
        const prettifiedType = prettifyJavascriptType(
          getJavascriptType(c) + (isNullable(c) ? '|null' : '')
        );
        return [
          fmtVarName(getFieldName(c)),
          fmtVal(prettifiedType),
          kleur.dim(c.Field),
          kleur.dim(c.Type)
        ];
      })
    ],
    ['Field', 'Javascript Type', 'Column', 'Column Type']
  );
};

export const showModelCreateTable = (table: FetchedTable) => {
  log.info([
    kleur.bold('Create Table: '),
    ...table.createSql.split('\n').map((s) => kleur.red(`${s}`))
  ]);
};

export const showModelIndexes = (table: FetchedTable) => {
  const map = new Map<string, Index>();
  table.indexes.forEach((i) => {
    if (map.get(i.Key_name)) {
      return;
    }
    map.set(i.Key_name, i);
  });
  log.info(kleur.bold(`Indexes (${map.size})`));
  const arr = Array.from(map.values());
  log.table(
    [
      ...arr.map((index) => [
        kleur.red(index.Key_name),
        kleur.gray(index.Index_type),
        fmtVal(JSON.stringify(index.Non_unique === 0))
      ])
    ],
    ['Key', 'Type', 'Unique']
  );
};
export const showModelSearchIndexes = (table: FetchedTable) => {
  const searchIndexes = getFullTextSearchIndexes(table);
  log.info(kleur.bold(`Search Indexes (${searchIndexes.length})`));
  if (searchIndexes.length > 0) {
    log.table(
      [
        ...searchIndexes.map((index) => [
          kleur.red(index.key),
          index.indexedFields.map((k) => fmtVarName(k)).join(', ')
        ])
      ],
      ['Key', 'Indexed Fields']
    );
  }
};

export const explainJsType = (column: Column): string => {
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
    return `Default type for ${fmtVal('tinyint(1)')} columns.`;
  }
  if ('bigint' === mysqlType) {
    if (getBigIntAnnotation(column)) {
      return `Found  ${kleur.red('@bigint')} type annotation.`;
    }
    return `Default type for ${fmtVal('bigint')} columns.`;
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
};

export const showBaseModelType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  const description = squishWords(`
    The base representation of the model. 
    Fields where the underlying column is INVISIBLE are optional.
  `)
    .split('\n')
    .map((s) => kleur.dim(s));
  const notes: string[] = table.columns
    .filter(
      (c) =>
        getModelFieldPresence(c) === ModelFieldPresence.undefinedForSelectAll
    )
    .map((c) => {
      return `- ${fmtVarName(getFieldName(c))} is optional in ${fmtVal(
        getModelName(table)
      )}. ${kleur.dim('(Column is INVISIBLE.)')}`;
    });

  if (notes.length > 0) {
    notes.unshift(kleur.italic('Notes:'));
  }

  log.info([
    kleur.bold('Model Type:') + ' ' + fmtVal(getModelName(table)),
    ...description,
    ...formatTypescriptCode(typeDecls.model),
    ...notes
  ]);
};

export const showSelectAllModelType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  const description = squishWords(`
    The representation of the model when fetched using 'SELECT *'. 
    Fields where the underlying column is INVISIBLE are omitted.
  `)
    .split('\n')
    .map((s) => kleur.dim(s));

  const notes: string[] = table.columns
    .filter(
      (c) =>
        getModelFieldPresence(c) === ModelFieldPresence.undefinedForSelectAll
    )
    .map((c) => {
      return `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
        getModelSelectAllTypeName(table)
      )}. ${kleur.dim('(Column is INVISIBLE.)')}`;
    });

  if (notes.length > 0) {
    notes.unshift(kleur.italic('Notes:'));
  }
  log.info([
    kleur.bold('Select * Type:') +
      ' ' +
      fmtVal(getModelSelectAllTypeName(table)),
    ...description,
    ...formatTypescriptCode(typeDecls.selectAll),
    ...notes
  ]);
};

export const showPrimaryKeyType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  log.info([
    kleur.bold('Primary Key Type:') +
      ' ' +
      fmtVal(getModelPrimaryKeyTypeName(table)),
    ...squishWords(
      kleur.dim(`Used to select, update and delete models.`)
    ).split('\n'),
    ...formatTypescriptCode(typeDecls.primaryKey)
  ]);
};

export const showCreateDataType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  const description = squishWords(`
    Data passed to create a new ${getModelName(table)}.
  `)
    .split('\n')
    .map((s) => kleur.dim(s));
  const notes = table.columns
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

  if (notes.length > 0) {
    notes.unshift(kleur.italic('Notes:'));
  }
  log.info([
    kleur.bold('Create Data Type:') +
      ' ' +
      fmtVal(getModelCreateDataTypeName(table)),
    ...description,
    ...formatTypescriptCode(typeDecls.createData),
    ...notes
  ]);
};

export const showUpdateDataType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  const description = squishWords(`
    Data passed to update an existing ${getModelName(table)}.
  `)
    .split('\n')
    .map((s) => kleur.dim(s));
  const notes = table.columns
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

  if (notes.length > 0) {
    notes.unshift(kleur.italic('Notes:'));
  }
  log.info([
    kleur.bold('Update Data Type:') +
      ' ' +
      fmtVal(getModelUpdateDataTypeName(table)),
    ...description,
    ...formatTypescriptCode(typeDecls.updateData),
    ...notes
  ]);
};

export const showFindUniqueType = (table: FetchedTable) => {
  const typeDecls = getModelTypeDeclarations(table);
  const description = squishWords(`
    The various ways you can select a unique ${getModelName(table)}.
  `)
    .split('\n')
    .map((s) => kleur.dim(s));
  const notes = table.columns
    .filter((c) => isUnique(c))
    .map((c) => {
      return `- ${fmtVarName(getFieldName(c))} is unique. ${kleur.dim(
        '(Key: UNI)'
      )}`;
    });

  if (notes.length > 0) {
    notes.unshift(kleur.italic('Notes:'));
  }

  log.info([
    kleur.bold('Find Unique Type:') +
      ' ' +
      fmtVal(getModelFindUniqueTypeName(table)),
    ...description,
    ...formatTypescriptCode(typeDecls.findUniqueParams),
    ...notes
  ]);
};

export const showRawColumn = (column: Column) => {
  const rows = Object.keys(column).map((k) => {
    const key = k as keyof Column;
    const value = column[key];
    return [fmtVarName(k), value === null ? fmtVal('null') : fmtVal(value)];
  });
  log.table(rows);
};
export const showRawColumns = (table: FetchedTable) => {
  table.columns.forEach((c, i) => {
    log.info(`Column: ${fmtVal(c.Field)}`);
    showRawColumn(c);
    if (i < table.columns.length - 1) {
      console.log();
    }
  });
};

export const prettifyJavascriptType = (t: string) => {
  return format(t, {
    filepath: 'x.ts',
    useTabs: false,
    singleQuote: true,
    semi: false
  }).trim();
};

export const showSchema = (
  schema: FetchedSchema,
  options: GetOptionsResult
) => {
  const { databaseUrlKey, databaseUrl, envFile } = options.databaseDetails;
  log.info(kleur.bold('Database: ') + fmtVal(schema.databaseName));
  log.table([
    ['Database URL', maskDatabaseURLPassword(databaseUrl)],
    [
      'Database URL source',
      `${fmtVarName(databaseUrlKey)} in $${fmtPath(envFile)}`
    ]
  ]);
  console.log();
  log.info(kleur.bold(`Models (${schema.tables.length})`));
  log.table(
    [...schema.tables.map((t) => [fmtVal(getModelName(t)), kleur.dim(t.name)])],
    ['Model', 'Table']
  );
};

export const showSchemaScreen = (
  schema: FetchedSchema,
  options: GetOptionsResult
) => {
  log.header(`↓ Schema: ${schema.databaseName}`);
  showSchema(schema, options);
  log.header(`↑ Schema: ${schema.databaseName}`);
};

export const showModel = (table: FetchedTable) => {
  showModelPreamble(table);
  console.log();
  showModelFields(table);
  console.log();
  showModelPrimaryKeys(table);
  console.log();
  showModelCreateTable(table);
  console.log();
  showBaseModelType(table);
  console.log();
  showSelectAllModelType(table);
  console.log();
  showPrimaryKeyType(table);
  console.log();
  showCreateDataType(table);
  console.log();
  showUpdateDataType(table);
  console.log();
  showFindUniqueType(table);
  console.log();
  showModelIndexes(table);
  console.log();
  showModelSearchIndexes(table);
};

export const showModelScreen = (table: FetchedTable) => {
  log.header(`↓ Model: ${getModelName(table)}`);
  showModel(table);
  log.header(`↑ Model: ${getModelName(table)}`);
};

export const showFieldPreamble = (table: FetchedTable, column: Column) => {
  log.info([
    kleur.bold('Field:') + ` ${fmtVarName(getFieldName(column))}`,
    kleur.dim(`Column name: ${column.Field}`),
    kleur.bold('Model:') + ` ${fmtVal(getModelName(table))}`,
    kleur.dim(`Table name: ${table.name}`)
  ]);
};

export const showFieldType = (column: Column) => {
  const prettifiedType = prettifyJavascriptType(
    getJavascriptType(column) + (isNullable(column) ? '|null' : '')
  );

  log.info(kleur.bold('Field Type'));
  log.table([
    [fmtVal(prettifiedType), kleur.dim(column.Type)],
    
  ], ['Javascript Type', 'Column Type']);
  console.log();
  log.info([kleur.bold('Type Explanation'), explainJsType(column)]);

  return;
};

export const showFieldColumnDef = (table: FetchedTable, column: Column) => {
  log.info([
    kleur.bold('Column Definition'),
    kleur.red(getColumnDef(table, column))
  ]);
};


export const showFieldDefaultValue = (column: Column) => {
  const value: string = hasDefault(column) ? 
  column.Default === null ? fmtVal('null') : fmtVal(column.Default) : ''
  log.info(kleur.bold('Default Value'));
  log.table([
    ['Has default', fmtVal(JSON.stringify(hasDefault(column)))],
    ['Value', value]
  ])
   
};

export const showFieldModelNotes = (table: FetchedTable, column: Column) => {
  const notes = Object.values(getFieldModelNotes(table, column)).map(
    (n) => n.note
  );
  log.info([
    kleur.bold('Model Type Notes'),
    ...(notes.length === 0 ? [kleur.dim('[none]')] : notes)
  ]);
};

export const showField = (table: FetchedTable, column: Column) => {
  showFieldPreamble(table, column);
  console.log();
  showFieldType(column);
  console.log();
  showFieldModelNotes(table, column);
  console.log();
  showFieldDefaultValue(column);
  console.log()
  showFieldColumnDef(table, column);
  console.log();
  log.info(kleur.bold(`Column: `) +fmtVal(column.Field));
  showRawColumn(column);
};

const getFieldModelNotes = (
  table: FetchedTable,
  c: Column
): {
  context:
    | 'primaryKey'
    | 'model'
    | 'selectAll'
    | 'create'
    | 'update'
    | 'unique';
  note: string;
}[] => {
  const fieldPresence = getModelFieldPresence(c);
  const createPresence = getCreateModelFieldPresence(c);
  const updatePresence = getUpdateModelFieldPresence(c);
  const notes: {
    context:
      | 'primaryKey'
      | 'model'
      | 'selectAll'
      | 'create'
      | 'update'
      | 'unique';
    note: string;
  }[] = [];
  if (isPrimaryKey(c)) {
    notes.push({
      context: 'primaryKey',
      note: `- ${fmtVarName(
        getFieldName(c)
      )} is a primary key. Included in ${fmtVal(
        getModelPrimaryKeyTypeName(table)
      )}.`
    });
  }
  if (fieldPresence === ModelFieldPresence.undefinedForSelectAll) {
    notes.push({
      context: 'model',
      note: `- ${fmtVarName(getFieldName(c))} is optional in ${fmtVal(
        getModelName(table)
      )}. ${kleur.dim('(Column is INVISIBLE.)')}`
    });
    notes.push({
      context: 'selectAll',
      note: `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
        getModelSelectAllTypeName(table)
      )}. ${kleur.dim('(Column is INVISIBLE.)')}`
    });
  }
  if (createPresence === CreateModelFieldPresence.omittedGenerated) {
    notes.push({
      context: 'create',
      note: `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
        getModelCreateDataTypeName(table)
      )}. ${kleur.dim('(Column is GENERATED.)')}`
    });
  } else if (
    createPresence === CreateModelFieldPresence.optionalAutoIncrement
  ) {
    notes.push({
      context: 'create',
      note: `- ${fmtVarName(getFieldName(c))} is optional in ${fmtVal(
        getModelCreateDataTypeName(table)
      )}. ${kleur.dim('(Column is auto_increment.)')}`
    });
  } else if (createPresence === CreateModelFieldPresence.optionalHasDefault) {
    notes.push({
      context: 'create',
      note: `- ${fmtVarName(getFieldName(c))} is optional in ${fmtVal(
        getModelCreateDataTypeName(table)
      )}. ${kleur.dim('(Column has default value.)')}`
    });
  }
  if (updatePresence === UpdateModelFieldPresence.omittedGenerated) {
    notes.push({
      context: 'update',
      note: `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
        getModelUpdateDataTypeName(table)
      )}. ${kleur.dim('(Column is GENERATED.)')}`
    });
  } else if (updatePresence === UpdateModelFieldPresence.omittedPrimaryKey) {
    notes.push({
      context: 'update',
      note: `- ${fmtVarName(getFieldName(c))} is omitted in ${fmtVal(
        getModelUpdateDataTypeName(table)
      )}. ${kleur.dim('(Column is a primary key.)')}`
    });
  }
  if (isUnique(c)) {
    notes.push({
      context: 'unique',
      note: `- ${fmtVarName(
        getFieldName(c)
      )} has a unique index. Included in ${fmtVal(
        getModelFindUniqueTypeName(table)
      )}.`
    });
  }
  return notes;
};

export const showFieldScreen = (table: FetchedTable, column: Column) => {
  log.header(`↓ Field: ${getFieldName(column)}`);
  showField(table, column);
  log.header(`↑ Field: ${getFieldName(column)}`);
};

