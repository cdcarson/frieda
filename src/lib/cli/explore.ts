import { getModelName } from '$lib/parse/model-parsers.js';
import type { FetchedSchema, FetchedTable } from '$lib/fetch/types.js';
import { promptModel } from './prompt-model.js';

import { prompt } from './ui/prompt.js';

import type { GetOptionsResult } from './types.js';
import {
  getAddFieldSql,
  getAddModelSql,
  getBigIntAnnotationSql,
  getDropFieldSql,
  getDropModelSql,
  getEditEnumAnnotationSql,
  getEditFieldManuallySql,
  getEditJsonAnnotationSql,
  getEditSetAnnotationSql,
  getModifyModelByHandSql,
  getRemoveEnumAnnotationSql,
  getRemoveJsonAnnotationSql,
  getRemoveSetAnnotationSql,
  getRenameFieldSql,
  getTinyIntTypeSql
} from './sql.js';
import { runSql } from './modify.js';
import { onUserCancelled } from './ui/on-user-cancelled.js';
import { cliFetchSchema } from './cli-fetch-schema.js';
import { runMigration } from './run-migration.js';
import log from './ui/log.js';
import { fetchSchema } from '$lib/fetch/fetch-schema.js';
import { showFieldScreen, showModelScreen, showSchemaScreen } from './show.js';
import { fmtPath, fmtVal, fmtVarName } from './ui/formatters.js';
import type { Column } from '$lib/index.js';
import { promptField } from './prompt-field.js';
import {
  getBigIntAnnotation,
  getFieldName,
  getMysqlBaseType,
  getSetAnnotation,
  getValidEnumAnnotation,
  getValidJsonAnnotation,
  isTinyIntOne
} from '$lib/parse/field-parsers.js';
import type { Sql } from 'sql-template-tag';

export const explore = async (
  schema: FetchedSchema,
  options: GetOptionsResult,
  typesMap: { [t: string]: number },
  modelName?: string,
  fieldName?: string
): Promise<FetchedSchema> => {
  Object.keys(typesMap).forEach((k) => {
    console.log(
      k,
      fmtPath(
        options.options.outputDirectory + '/types.d.ts:' + typesMap[k] + ':1'
      )
    );
  });
  if (typeof modelName === 'string' || typeof fieldName === 'string') {
    const table = await promptModel(schema, modelName);
    if (typeof fieldName === 'string') {
      const column = await promptField(table, fieldName);
      return await fieldScreen(schema, options, table, column);
    }
    return await modelScreen(schema, options, table);
  }
  return await schemaScreen(schema, options);
};

const schemaScreen = async (
  schema: FetchedSchema,
  options: GetOptionsResult
): Promise<FetchedSchema> => {
  showSchemaScreen(schema, options);
  type Next = 'addModel' | 'modifyModel' | 'generateCode' | 'exit';
  const choices: { title: string; value: Next }[] = [
    { title: 'Add model', value: 'addModel' },
    { title: 'Modify or drop model', value: 'modifyModel' },
    { title: 'Generate code', value: 'generateCode' },
    { title: 'Exit', value: 'exit' }
  ];
  const next = await prompt<Next>({
    type: 'select',
    name: 'next',
    message: `Schema ${fmtVarName(schema.databaseName)}:`,
    choices
  });
  if (next === 'addModel') {
    const statement = await getAddModelSql(schema);
    const newSchema = await runMigration(options, statement, schema);
    if (!newSchema) {
      return await schemaScreen(schema, options);
    }
    const prevTableNames = schema.tables.map((t) => t.name);
    const newTable = newSchema.tables.find(
      (t) => !prevTableNames.includes(t.name)
    );
    if (newTable) {
      return await modelScreen(newSchema, options, newTable);
    } else {
      return await schemaScreen(newSchema, options);
    }
  }
  if (next === 'modifyModel') {
    const table = await promptModel(schema);
    return await modelScreen(schema, options, table);
  }
  if (next === 'generateCode') {
    return schema;
  }
  return onUserCancelled();
};

const modelScreen = async (
  schema: FetchedSchema,
  options: GetOptionsResult,
  table: FetchedTable
): Promise<FetchedSchema> => {
  showModelScreen(table);

  type Next =
    | 'modifyField'
    | 'addField'
    | 'modifyModel'
    | 'dropModel'
    | 'generateCode'
    | 'back'
    | 'exit';
  const choices: { title: string; value: Next }[] = [
    { title: 'Modify or drop field', value: 'modifyField' },
    { title: 'Add field', value: 'addField' },
    { title: 'Modify model by hand', value: 'modifyModel' },
    { title: 'Drop model', value: 'dropModel' },
    { title: `Back to ${fmtVal(schema.databaseName)}`, value: 'back' },
    { title: 'Generate code', value: 'generateCode' },
    { title: 'Exit', value: 'exit' }
  ];
  const next = await prompt<Next>({
    type: 'select',
    name: 'next',
    message: `Model ${fmtVarName(getModelName(table))}:`,
    choices
  });
  if (next === 'modifyField') {
    const column = await promptField(table);
    return await fieldScreen(schema, options, table, column);
  }
  if (next === 'addField') {
    const statement = await getAddFieldSql(table);
    const newSchema = await runMigration(options, statement, schema);
    if (!newSchema) {
      return await modelScreen(schema, options, table);
    }
    const newTable = newSchema.tables.find((t) => t.name === table.name);
    if (newTable) {
      const oldColNames = table.columns.map((t) => t.Field);
      const newColumn = newTable.columns.find(
        (t) => !oldColNames.includes(t.Field)
      );
      if (newColumn) {
        return await fieldScreen(newSchema, options, newTable, newColumn);
      } else {
        return await modelScreen(newSchema, options, newTable);
      }
    } else {
      return await schemaScreen(newSchema, options);
    }
  }
  if ('modifyModel' === next) {
    const statement = getModifyModelByHandSql(table);
    const newSchema = await runMigration(options, statement, schema);
    if (!newSchema) {
      return await modelScreen(schema, options, table);
    }
    const newTable = newSchema.tables.find((t) => t.name === table.name);
    if (newTable) {
      return await modelScreen(newSchema, options, newTable);
    } else {
      return await schemaScreen(newSchema, options);
    }
  }
  if ('dropModel' === next) {
    const statement = getDropModelSql(table);
    const newSchema = await runMigration(options, statement, schema);
    if (!newSchema) {
      return await modelScreen(schema, options, table);
    }
    return await schemaScreen(newSchema, options);
  }
  if (next === 'generateCode') {
    return schema;
  }
  if (next === 'back') {
    return await schemaScreen(schema, options);
  }
  return onUserCancelled();
};

const fieldScreen = async (
  schema: FetchedSchema,
  options: GetOptionsResult,
  table: FetchedTable,
  column: Column
): Promise<FetchedSchema> => {
  showFieldScreen(table, column);
  type Next =
    | 'editSetAnnotation'
    | 'removeSetAnnotation'
    | 'editEnumAnnotation'
    | 'removeEnumAnnotation'
    | 'addBigIntAnnotation'
    | 'removeBigIntAnnotation'
    | 'typeTinyInt'
    | 'editJsonAnnotation'
    | 'removeJsonAnnotation'
    | 'dropField'
    | 'modifyByHand'
    | 'rename'
    | 'generateCode'
    | 'back'
    | 'exit';

  const choices: { title: string; value: Next }[] = [
    { title: 'Rename', value: 'rename' },
    { title: 'Modify field by hand', value: 'modifyByHand' },
    { title: 'Drop field', value: 'dropField' },
    { title: `Back to ${fmtVal(getModelName(table))}`, value: 'back' },
    { title: 'Generate code', value: 'generateCode' },
    { title: 'Exit', value: 'exit' }
  ];
  const mysqlType = getMysqlBaseType(column);
  if (mysqlType === 'json') {
    const annotation = getValidJsonAnnotation(column);
    if (annotation) {
      choices.push(
        {
          title: 'Edit @json type annotation',
          value: 'editJsonAnnotation'
        },
        {
          title: 'Remove @json type annotation',
          value: 'removeJsonAnnotation'
        }
      );
    } else {
      choices.push({
        title: 'Add @json type annotation',
        value: 'editJsonAnnotation'
      });
    }
  }
  if (mysqlType === 'set') {
    const annotation = getSetAnnotation(column);
    if (annotation) {
      choices.push(
        {
          title: 'Edit @set type annotation',
          value: 'editSetAnnotation'
        },
        {
          title: 'Remove @set type annotation',
          value: 'removeSetAnnotation'
        }
      );
    } else {
      choices.push({
        title: 'Type as javascript Set (add @set type annotation)',
        value: 'editSetAnnotation'
      });
    }
  }

  if (mysqlType === 'enum') {
    const annotation = getValidEnumAnnotation(column);
    if (annotation) {
      choices.push(
        {
          title: 'Edit @enum type annotation',
          value: 'editEnumAnnotation'
        },
        {
          title: 'Remove @enum type annotation',
          value: 'removeEnumAnnotation'
        }
      );
    } else {
      choices.push({
        title: 'Add @enum type annotation',
        value: 'editEnumAnnotation'
      });
    }
  }
  if (mysqlType === 'bigint') {
    const annotation = getBigIntAnnotation(column);
    if (annotation) {
      choices.push({
        title: 'Type as string (remove @bigint type annotation)',
        value: 'removeBigIntAnnotation'
      });
    } else {
      choices.push({
        title: 'Type as bigint (add @bigint type annotation)',
        value: 'addBigIntAnnotation'
      });
    }
  }
  if (mysqlType === 'tinyint') {
    if (isTinyIntOne(column)) {
      choices.push({
        title: 'Type as integer',
        value: 'typeTinyInt'
      });
    } else {
      choices.push({
        title: 'Type as boolean',
        value: 'typeTinyInt'
      });
    }
  }

  const runFieldModification = async (statement: Sql) => {
    const newSchema = await runMigration(options, statement, schema);
    if (!newSchema) {
      return await fieldScreen(schema, options, table, column);
    }
    const newTable = newSchema.tables.find((t) => t.name === table.name);
    if (!newTable) {
      return await schemaScreen(newSchema, options);
    }
    const newColumn = newTable.columns.find((c) => c.Field === column.Field);
    if (!newColumn) {
      return await modelScreen(newSchema, options, newTable);
    }
    return fieldScreen(newSchema, options, newTable, newColumn);
  };

  const next = await prompt<Next>({
    type: 'select',
    name: 'next',
    message: `Field ${fmtVarName(getFieldName(column))}:`,
    choices
  });

  if ('addBigIntAnnotation' === next) {
    return await runFieldModification(getBigIntAnnotationSql(table, column));
  }
  if ('removeBigIntAnnotation' === next) {
    return await runFieldModification(getBigIntAnnotationSql(table, column));
  }
  if ('typeTinyInt' === next) {
    return await runFieldModification(
      getTinyIntTypeSql(table, column, !isTinyIntOne(column))
    );
  }
  if ('editSetAnnotation' === next) {
    return await runFieldModification(
      await getEditSetAnnotationSql(table, column)
    );
  }
  if ('removeSetAnnotation' === next) {
    return await runFieldModification(getRemoveSetAnnotationSql(table, column));
  }
  if ('editEnumAnnotation' === next) {
    return await runFieldModification(
      await getEditEnumAnnotationSql(table, column)
    );
  }
  if ('removeEnumAnnotation' === next) {
    return await runFieldModification(
      getRemoveEnumAnnotationSql(table, column)
    );
  }
  if ('editJsonAnnotation' === next) {
    return await runFieldModification(
      await getEditJsonAnnotationSql(table, column)
    );
  }
  if ('removeJsonAnnotation' === next) {
    return await runFieldModification(
      getRemoveJsonAnnotationSql(table, column)
    );
  }
  if ('modifyByHand' === next) {
    return await runFieldModification(getEditFieldManuallySql(table, column));
  }

  if ('dropField' === next) {
    return await runFieldModification(getDropFieldSql(table, column));
  }

  if ('rename' === next) {
    return await runFieldModification(await getRenameFieldSql(table, column));
  }

  if ('generateCode' === next) {
    return schema;
  }

  if ('back' === next) {
    return await modelScreen(schema, options, table);
  }

  return onUserCancelled();
};
