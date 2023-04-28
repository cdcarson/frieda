import parser from 'yargs-parser';
import {
  cliFetchSchema,
  cliGetSettings,
  promptModel,
  cancelAndExit,
  cliPromptRunMigration,
  promptField,
  cliLogSql,
  cliCreateOrUpdatePendingMigrationFile,
  editOrSaveOptions
} from './cli.js';
import colors from 'picocolors'
import { isCancel, select, text, confirm, log } from '@clack/prompts';
import { DEFAULT_JSON_FIELD_TYPE } from './constants.js';
import {
  getFieldColumnDefinitionSql,
  toggleBigIntAnnotation,
  toggleBooleanType,
  toggleJSONAnnotation
} from './migrate.js';
import { fmtValue } from './utils.js';
import type { FieldDefinition, ModelDefinition } from '$lib/api/types.js';
import { edit } from 'external-editor';

export const cmdModifyField = async (rawArgs: string[]) => {
  const settings = await cliGetSettings();
  const { schema, models } = await cliFetchSchema(settings);
  const args = parser(rawArgs, {
    alias: { model: ['m'], field: ['f'] },
    string: ['model', 'field']
  });
  const model = await promptModel(
    models,
    typeof args.model === 'string' ? args.model : ''
  );
  const field = await promptField(
    model,
    typeof args.field === 'string' ? args.field : ''
  );

  const colDef = getFieldColumnDefinitionSql(schema, model, field);

  let sql = [
    `ALTER TABLE \`${model.tableName}\``,
    `  MODIFY COLUMN ${colDef};`
  ].join('\n');

  cliLogSql(sql, colors.dim('(current column definition)'));
  const options = [
    ...editOrSaveOptions,
    {
      label: 'Cancel',
      value: 'cancel'
    }
  ];
  if (field.knownMySQLType === 'json') {
    options.unshift({
      value: 'typeJson',
      label: `Add, edit or remove @json type annotation`,
      hint: `current javascript type: ${fmtValue(field.javascriptType)}`
    });
  }
  if (field.knownMySQLType === 'bigint') {
    if (field.castType === 'string') {
      options.unshift({
        value: 'typeBigIntAsBigInt',
        label: `Type field as javascript ${fmtValue(
          'bigint'
        )} (currently: ${fmtValue('string')})`,
        hint: `Add ${fmtValue('@bigint')} annotation to COMMENT`
      });
    }
    if (field.castType === 'string') {
      options.unshift({
        value: 'typeBigIntAsString',
        label: `Type field as javascript ${fmtValue(
          'string'
        )} (currently: ${fmtValue('bigint')})`,
        hint: `Remove ${fmtValue('@bigint')} annotation to COMMENT`
      });
    }
  }
  if (field.knownMySQLType === 'tinyint') {
    if (field.castType === 'boolean') {
      options.unshift({
        value: 'typeTinyIntAsInt',
        label: `Type field as javascript ${fmtValue(
          'number'
        )} (currently: ${fmtValue('boolean')})`,
        hint: `Change type ${fmtValue('tinyint(1)')} to ${fmtValue('tinyint')}`
      });
    }
    if (field.castType === 'int') {
      options.unshift({
        value: 'typeTinyIntAsBoolean',
        label: `Type field as javascript ${fmtValue(
          'boolean'
        )} (currently: ${fmtValue('number')})`,
        hint: `Change type ${fmtValue('tinyint')} to ${fmtValue('tinyint(1)')}`
      });
    }
  }
  const action = await select({
    message: 'Migration options:',
    options
  });
  if (isCancel(action) || 'cancel' === action) {
    return cancelAndExit();
  }
  if ('edit' === action) {
    cliPromptRunMigration(settings, {
      sql: edit(sql),
      schemaBefore: schema
    });
    return;
  }
  if ('save' === action) {
    cliCreateOrUpdatePendingMigrationFile(settings, {
      sql,
      schemaBefore: schema
    });
    return;
  }
  switch (action) {
    
    case 'typeTinyIntAsBoolean':
      sql = [
        `ALTER TABLE \`${model.tableName}\``,
        `  MODIFY COLUMN ${toggleBooleanType(colDef, true)};`
      ].join('\n');
      return cliPromptRunMigration(settings, {
        sql,
        schemaBefore: schema
      });
    case 'typeTinyIntAsInt':
      sql = [
        `ALTER TABLE \`${model.tableName}\``,
        `  MODIFY COLUMN ${toggleBooleanType(colDef, false)};`
      ].join('\n');
      return cliPromptRunMigration(settings, {
        sql,
        schemaBefore: schema
      });
    case 'typeBigIntAsString':
      sql = [
        `ALTER TABLE \`${model.tableName}\``,
        `  MODIFY COLUMN ${toggleBigIntAnnotation(
          colDef,
          field.columnComment,
          false
        )};`
      ].join('\n');
      return cliPromptRunMigration(settings, {
        sql,
        schemaBefore: schema
      });
    case 'typeBigIntAsBigInt':
      sql = [
        `ALTER TABLE \`${model.tableName}\``,
        `  MODIFY COLUMN ${toggleBigIntAnnotation(
          colDef,
          field.columnComment,
          true
        )};`
      ].join('\n');
      return cliPromptRunMigration(settings, {
        sql,
        schemaBefore: schema
      });
    case 'typeJson':
      sql = await promptTypeJson(model, field, colDef);
      return cliPromptRunMigration(settings, {
        sql,
        schemaBefore: schema
      });
    default:
      throw new Error('unhandled cli option')
  }
};

const promptTypeJson = async (
  model: ModelDefinition,
  field: FieldDefinition,
  colDef: string
): Promise<string> => {
  let newType = await text({
    message: 'JSON type (clear value to remove):',
    initialValue: field.javascriptType === DEFAULT_JSON_FIELD_TYPE ? '' : field.javascriptType
  })
  if (isCancel(newType)) {
    return cancelAndExit();
  }
  newType = newType.trim()
  return [
    `ALTER TABLE \`${model.tableName}\``,
    `  MODIFY COLUMN ${toggleJSONAnnotation(colDef, field.columnComment, newType.length === 0 ? null : newType)};`
  ].join('\n');
};
