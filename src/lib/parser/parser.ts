import { KNOWN_MYSQL_TYPES } from '$lib/constants.js';
import type {
  DatabaseTableColumnInfo,
  DatabaseTableInfo,
  FieldDefinition,
  CastType,
  ModelDefinition,
  Model,
  FullSettings,
} from '$lib/types.js';
import { getMatchAmong, getParenthesizedArgs } from '$lib/utils/rx-utils.js';
import _ from 'lodash';
import {
  getFieldName,
  getModelCreateDataTypeName,
  getModelFindUniqueParamsTypeName,
  getModelName,
  getModelPrimaryKeyTypeName,
  getModelRepoTypeName,
  getModelUpdateDataTypeName
} from './naming.js';

/**
 * Returns the javascript (typescript) type as a string,
 * based on the raw column definition and the previously
 * computed CastType.
 *
 * In addition to the javascript native types, we
 * - allow json to be explicitly typed
 * - type set as Set<'a'|'b'> based on the column def
 * - type enum as 'a'|'b' based on the column def
 */
export const getFieldJavascriptType = (
  col: DatabaseTableColumnInfo,
  castType: CastType
): string => {
  if (castType === 'json') {
    if (hasColumnCommentAnnotation('json', col)) {
      return getParenthesizedArgs(col.Comment, '@json');
    }
    return 'Object';
  }
  if (castType === 'set') {
    const strings = getParenthesizedArgs(col.Type, 'set')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join('|');
    return strings.length > 0 ? `Set<${strings}>` : `Set<string>`;
  }
  if (castType === 'enum') {
    const strings = getParenthesizedArgs(col.Type, 'enum')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join('|');
    return strings.length > 0 ? strings : `string`;
  }
  switch (castType) {
    case 'bigint':
      return 'bigint';
    case 'date':
      return 'Date';
    case 'boolean':
      return 'boolean';
    case 'int':
    case 'float':
      return 'number';
    case 'string':
      return 'string';
  }
};

export const hasColumnCommentAnnotation = (
  annotation: string,
  col: DatabaseTableColumnInfo
): boolean => {
  const rx = new RegExp(`(\\s|^)@${annotation}(\\s|\\(|$)`, 'i');
  return rx.test(col.Comment);
};

export const getFieldCastType = (
  col: DatabaseTableColumnInfo,
  knownMySQLType: (typeof KNOWN_MYSQL_TYPES)[number] | null,
  settings: Partial<FullSettings>
): CastType => {
  if (!knownMySQLType) {
    return 'string';
  }

  // json, an easy one...
  if ('json' === knownMySQLType) {
    return 'json';
  }

  // bigint
  if ('bigint' === knownMySQLType) {
    // type as string can be turned off globally
    if (settings.typeBigIntAsString === false) {
      return 'bigint';
    }
    // cast to string can be turned of for the column...
    if (hasColumnCommentAnnotation('bigint', col)) {
      return 'bigint';
    }
    return 'string';
  }

  // the boolean case, tinyint(1)...
  if (
    knownMySQLType === 'tinyint' &&
    getParenthesizedArgs(col.Type, knownMySQLType).trim() === '1'
  ) {
    // type as boolean can be turned off globally
    if (settings.typeTinyIntOneAsBoolean === false) {
      return 'int';
    }
    return 'boolean';
  }

  // having dealt with the special int cases, bigint and tinyint(1), do the other int types...
  if (
    (
      [
        'tinyint',
        'int',
        'integer',
        'smallint',
        'mediumint'
      ] as (typeof KNOWN_MYSQL_TYPES)[number][]
    ).includes(knownMySQLType)
  ) {
    return 'int';
  }

  // floaty types...
  if (
    (
      [
        'float',
        'double',
        'real',
        'decimal',
        'numeric'
      ] as (typeof KNOWN_MYSQL_TYPES)[number][]
    ).includes(knownMySQLType)
  ) {
    return 'float';
  }

  // date types
  if (
    (
      ['date', 'datetime', 'timestamp'] as (typeof KNOWN_MYSQL_TYPES)[number][]
    ).includes(knownMySQLType)
  ) {
    return 'date';
  }

  // set...
  if (knownMySQLType === 'set') {
    return 'set';
  }

  // enum...
  if (knownMySQLType === 'enum') {
    return 'enum';
  }

  // year... (this is separate from the int types above, cuz we may want some options around this)
  if (knownMySQLType === 'year') {
    return 'int';
  }

  // everything else is cast to string, including enum, time, bit
  return 'string';
};

/**
 * Extracts one of KNOWN_MYSQL_TYPES from the column's type def.
 * Returns null if no match is found.
 */
export const getFieldKnownMySQLType = (
  column: DatabaseTableColumnInfo
): (typeof KNOWN_MYSQL_TYPES)[number] | null => {
  const found = getMatchAmong(column.Type, Array.from(KNOWN_MYSQL_TYPES));
  if (found.length > 0) {
    return found[0].toLowerCase() as (typeof KNOWN_MYSQL_TYPES)[number];
  }
  return null;
};

/**
 * Returns true if Key exactly equals 'PRI'
 * See https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
 */
export const isFieldColumnPrimaryKey = (
  column: DatabaseTableColumnInfo
): boolean => {
  return column.Key === 'PRI';
};

/**
 * Returns true if Key exactly equals 'UNI'
 * See https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
 *
 * Used to create the <ModelName>FindUniqueParams type for the model.
 *
 * Note that this will be false for primary key(s).
 * They are automatically included in  <ModelName>FindUniqueParams.
 */
export const isFieldColumnUnique = (
  column: DatabaseTableColumnInfo
): boolean => {
  return column.Key === 'UNI';
};

/**
 * Whether the column is auto_increment.
 * See https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
 * The docs there on Extra are not completely reliable, so just test that Extra contains 'auto_increment', case-insenitively.
 * Not sure if this would ever apply to a non-primary key, but it doesn't really matter for our
 * purposes, so we don't check for primary-key-ness.
 */
export const isFieldColumnAutoIncrement = (
  column: DatabaseTableColumnInfo
): boolean => {
  return /\bauto_increment\b/i.test(column.Extra);
};

/**
 * true if column.Extra contains "VIRTUAL GENERATED" or "STORED GENERATED"
 */
export const isFieldColumnAlwaysGenerated = (
  column: DatabaseTableColumnInfo
): boolean => {
  return /\b(VIRTUAL|STORED) GENERATED\b/i.test(column.Extra);
};

/**
 * true if column.Extra contains "DEFAULT_GENERATED"
 */
export const isFieldColumnDefaultGenerated = (
  column: DatabaseTableColumnInfo
): boolean => {
  return /\bDEFAULT_GENERATED\b/i.test(column.Extra);
};

/**
 * true if column.Extra contains "INVISIBLE"
 */
export const isFieldColumnInvisible = (
  column: DatabaseTableColumnInfo
): boolean => {
  return /\bINVISIBLE\b/i.test(column.Extra);
};

/**
 * True if column.Null === 'YES'
 */
export const isFieldColumnNullable = (
  column: DatabaseTableColumnInfo
): boolean => {
  return column.Null === 'YES';
};

export const parseFieldDefinition = (
  column: DatabaseTableColumnInfo,
  settings: Partial<FullSettings>
): FieldDefinition=> {
  const knownMySQLType = getFieldKnownMySQLType(column);
  const castType = getFieldCastType(column, knownMySQLType, settings);
  const javascriptType = getFieldJavascriptType(column, castType);
  return {
    fieldName: getFieldName(column.Field),
    columnName: column.Field,
    columnType: column.Type,
    knownMySQLType,
    castType,
    javascriptType,
    isColumnPrimaryKey: isFieldColumnPrimaryKey(column),
    isColumnAutoIncrement: isFieldColumnAutoIncrement(column),
    isColumnAlwaysGenerated: isFieldColumnAlwaysGenerated(column),
    isColumnDefaultGenerated: isFieldColumnDefaultGenerated(column),
    isColumnInvisible: isFieldColumnInvisible(column),
    isColumnNullable: isFieldColumnNullable(column),
    isColumnUnique: isFieldColumnUnique(column)
  };
};

/**
 * The type definition string for inclusion in the base type of a model.
 * including whether it is possibly undefined and/or null.
 *
 * The resulting string is:
 *
 * `<field.fieldName>[?]: <field.javscriptType>[|null]`
 *
 * A question mark after the name means that field.isInvisible is true,
 * so the field will be `undefined` unless specifically selected.
 *
 * `|null` after the javascript type means that the field can be null: field.isColumnNullable.
 */
export const getModelFieldTypeDef = (
  fieldName: string,
  javscriptType: string,
  isColumnInvisible: boolean,
  isColumnNullable: boolean
) => {
  // Don't add any whitespace; it'll break tests; prettier will format.
  return `${fieldName}${isColumnInvisible ? '?' : ''}:${javscriptType}${
    isColumnNullable ? '|null' : ''
  }`;
};
export const parseModelDefinition = (
  table: DatabaseTableInfo,
  settings: Partial<FullSettings>
): ModelDefinition => {
  const def: ModelDefinition = {
    modelName: getModelName(table.name),
    tableName: table.name,
    modelPrimaryKeyTypeName: getModelPrimaryKeyTypeName(table.name),
    modelCreateDataTypeName: getModelCreateDataTypeName(table.name),
    modelUpdateDataTypeName: getModelUpdateDataTypeName(table.name),
    modelFindUniqueParamsTypeName: getModelFindUniqueParamsTypeName(table.name),
    modelRepoTypeName: getModelRepoTypeName(table.name),
    classRepoName: _.camelCase(table.name),
    modelDefinitionConstName: _.camelCase(table.name) + 'ModelDefinition',
    fields: table.columns.map(col => parseFieldDefinition(col, settings))
  };

  return def;
};


