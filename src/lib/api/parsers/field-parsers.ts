import { DEFAULT_JSON_FIELD_TYPE } from '../constants.js';
import {
  MYSQL_TYPES,
  type Column,
  type MysqlType,
  type ParsedAnnotation,
  type Annotation,
  type TypeOptions,
  type CastType
} from '../types.js';
import camelCase from 'camelcase';

/**
 * Given a string like "prefix(anything whatever)" returns 'anything whatever'
 */
export const getParenthesizedArgs = (
  source: string,
  prefix: string
): string => {
  const rx = new RegExp(`(\\s|^)${prefix}\\s*\\((.*)\\)(\\s|$)`, 'i');
  const match = source.match(rx);
  return match ? match[2] : '';
};

export const getFieldCastType = (
  column: Column,
  typeOptions: Partial<TypeOptions>
): CastType => {
  const mysqlType = getFieldMysqlType(column);
  const annotations = getFieldCommentAnnotations(column)
  if (!mysqlType) {
    return 'string';
  }

  // json, an easy one...
  if ('json' === mysqlType) {
    return 'json';
  }

  // bigint
  if ('bigint' === mysqlType) {
    // type as string can be turned off globally
    if (typeOptions.typeBigIntAsString === false) {
      return 'bigint';
    }
    // cast to string can be turned off for the column...
    if (annotations.find(a => a.annotation === 'bigint')) {
      return 'bigint';
    }
    return 'string';
  }

  // the boolean case, tinyint(1)...
  if (
    mysqlType === 'tinyint' &&
    getParenthesizedArgs(column.Type, mysqlType).trim() === '1'
  ) {
    // type as boolean can be turned off globally
    if (typeOptions.typeTinyIntOneAsBoolean === false) {
      return 'int';
    }
    return 'boolean';
  }

  // having dealt with the special int cases, bigint and tinyint(1), do the other int types...
  if (
    (
      ['tinyint', 'int', 'integer', 'smallint', 'mediumint'] as MysqlType[]
    ).includes(mysqlType)
  ) {
    return 'int';
  }

  // floaty types...
  if (
    (['float', 'double', 'real', 'decimal', 'numeric'] as MysqlType[]).includes(
      mysqlType
    )
  ) {
    return 'float';
  }

  // date types
  if ((['date', 'datetime', 'timestamp'] as MysqlType[]).includes(mysqlType)) {
    return 'date';
  }

  // set...
  if (mysqlType === 'set') {
    if (annotations.find(a => a.annotation === 'set')) {
      return 'set';
    }
    return 'string';
    
  }

  // enum...
  if (mysqlType === 'enum') {
    return 'enum';
  }

  // year... (this is separate from the int types above, because we may want some options around this)
  if (mysqlType === 'year') {
    return 'int';
  }

  // everything else is cast to string, including enum, time, bit
  return 'string';
};


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
  column: Column,
  options: Partial<TypeOptions>
): string => {
  const castType = getFieldCastType(column, options)
  const annotations = getFieldCommentAnnotations(column);
  if (castType === 'json') {
    const typeAnnotation = annotations.find((a) => a.annotation === 'json');
    if (
      typeAnnotation &&
      typeAnnotation.argument &&
      typeAnnotation.argument.trim().length > 0
    ) {
      return typeAnnotation.argument.trim();
    }
    return DEFAULT_JSON_FIELD_TYPE;
  }
  if (castType === 'set') {
    const typeAnnotation = annotations.find((a) => a.annotation === 'set');
    if (typeAnnotation) {
      if (
        typeAnnotation.argument &&
        typeAnnotation.argument.trim().length > 0
      ) {
        return `Set<${typeAnnotation.argument.trim()}>`;
      }
      const strings = getParenthesizedArgs(column.Type, 'set')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join('|');
      return strings.length > 0 ? `Set<${strings}>` : `Set<string>`;
    }
    return 'string'
  }
  if (castType === 'enum') {
    const typeAnnotation = annotations.find((a) => a.annotation === 'enum');
    if (typeAnnotation && typeAnnotation.argument && typeAnnotation.argument.trim().length > 0) {
      return typeAnnotation.argument.trim()
    }
    const strings = getParenthesizedArgs(column.Type, 'enum')
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
  }
  return 'string';
};


export const getFieldName = (column: Column) => {
  return camelCase(column.Field);
};

export const getFieldMysqlType = (column: Column): MysqlType | null => {
  const rx = new RegExp(`\\b(${MYSQL_TYPES.join('|')})\\b`, 'gi');
  const match = column.Type.match(rx);
  if (match) {
    return match[0].toLowerCase() as MysqlType;
  }
  return null;
};

/**
 * Whether the field is possibly undefined in the base model,
 * i.e., that `Extra` contains `INVISIBLE`, so SELECT * omits the column.
 */
export const getFieldIsNullable = (column: Column): boolean => {
  return column.Null === 'YES';
};

/**
 * true if DatabaseColumnRow.Key is 'PRI'
 */
export const getFieldIsPrimaryKey = (column: Column): boolean => {
  return column.Key === 'PRI';
};

/**
 * true if DatabaseColumnRow.Key === 'UNI'
 */
export const getFieldIsUnique = (column: Column): boolean => {
  return column.Key === 'UNI';
};

export const getFieldCommentAnnotations = (
  column: Column
): ParsedAnnotation[] => {
  const rx = /(?:^|\s+)@(bigint|enum|set|json)(?:\((.*)\))?/gi;
  const result = Array.from(column.Comment.matchAll(rx)).map((r) => {
    return {
      annotation: r[1].toLowerCase() as Annotation,
      argument: r[2]
    };
  });
  return result;
};

/**
 * Whether the field is possibly undefined in the base model,
 * i.e., that `Extra` contains `INVISIBLE`, so SELECT * omits the column.
 */
export const getFieldOptionalInModel = (column: Column): boolean => {
  return /\bINVISIBLE\b/i.test(column.Extra);
};

export const getFieldIsAlwaysGenerated = (column: Column): boolean => {
  return /\b(VIRTUAL|STORED) GENERATED\b/i.test(column.Extra);
};

export const getFieldIsAutoIncrement = (column: Column): boolean => {
  return /\bauto_increment\b/i.test(column.Extra);
};

export const getFieldHasDefault = (column: Column): boolean => {
  return (
    typeof column.Default === 'string' ||
    (getFieldIsNullable(column) && column.Default === null)
  );
};

