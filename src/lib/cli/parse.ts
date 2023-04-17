import { KNOWN_MYSQL_TYPES } from '$lib/constants.js';
import type {
  DatabaseColumnRow,
  DatabaseTableInfo,
  FieldDefinition,
  CastType,
  ModelDefinition,
  Model,
  FullSettings
} from '$lib/types.js';
import { getMatchAmong, getParenthesizedArgs } from '$lib/utils/rx-utils.js';
import _ from 'lodash';


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
  col: DatabaseColumnRow,
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
  col: DatabaseColumnRow
): boolean => {
  const rx = new RegExp(`(\\s|^)@${annotation}(\\s|\\(|$)`, 'i');
  return rx.test(col.Comment);
};

export const getFieldCastType = (
  col: DatabaseColumnRow,
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
  column: DatabaseColumnRow
): (typeof KNOWN_MYSQL_TYPES)[number] | null => {
  const found = getMatchAmong(column.Type, Array.from(KNOWN_MYSQL_TYPES));
  if (found.length > 0) {
    return found[0].toLowerCase() as (typeof KNOWN_MYSQL_TYPES)[number];
  }
  return null;
};





/**
 * See https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
 */
export const parseFieldDefinition = (
  column: DatabaseColumnRow,
  settings: Partial<FullSettings>
): FieldDefinition => {
  const fieldName = _.camelCase(column.Field)
  const knownMySQLType = getFieldKnownMySQLType(column);
  const castType = getFieldCastType(column, knownMySQLType, settings);
  const javascriptType = getFieldJavascriptType(column, castType);
  const isPrimaryKey = column.Key === 'PRI';
  const isAutoIncrement = /\bauto_increment\b/i.test(column.Extra);
  const isUnique =  column.Key === 'UNI';
  const isAlwaysGenerated =  /\b(VIRTUAL|STORED) GENERATED\b/i.test(column.Extra);
  const isDefaultGenerated = /\bDEFAULT_GENERATED\b/i.test(column.Extra);
  const isInvisible =  /\bINVISIBLE\b/i.test(column.Extra);
  const isNullable  = column.Null === 'YES';
  const hasDefault = typeof column.Default === 'string' || (isNullable && column.Default === null)
  return {
    fieldName,
    columnName: column.Field,
    columnType: column.Type,
    columnComment: column.Comment,
    columnDefault: column.Default,
    columnExtra: column.Extra,
    columnKey: column.Key,
    columnNull: column.Null,
    knownMySQLType,
    castType,
    javascriptType,
    isPrimaryKey,
    isAutoIncrement,
    isAlwaysGenerated,
    isDefaultGenerated,
    isInvisible,
    isNullable,
    isUnique,
    hasDefault,
    isOmittableInModel: isInvisible,
    isOmittedFromCreateData: isAlwaysGenerated,
    isOptionalInCreateData: isAutoIncrement || hasDefault,
    isOmittedFromUpdateData: isPrimaryKey || isAlwaysGenerated
    
  };
};


export const parseModelDefinition = (
  table: DatabaseTableInfo,
  settings: Partial<FullSettings>
): ModelDefinition => {
  const modelName = _.upperFirst(_.camelCase(table.name));
  const def: ModelDefinition = {
    modelName,
    tableName: table.name,
    modelPrimaryKeyTypeName: `${modelName}PrimaryKey`,
    modelCreateDataTypeName: `${modelName}CreateData`,
    modelUpdateDataTypeName: `${modelName}UpdateData`,
    modelFindUniqueParamsTypeName: `${modelName}FindUniqueParams`,
    modelRepoTypeName: `${modelName}ModelRepo`,
    classRepoName: _.camelCase(table.name),
    modelDefinitionConstName: _.camelCase(table.name) + 'ModelDefinition',
    fields: table.columns.map((col) => parseFieldDefinition(col, settings))
  };

  return def;
};


