import {
  MYSQL_TYPES,
  type CastType,
  type MysqlBaseType,
  type TypeOptions
} from '../api/types.js';
import type { ColumnRow } from '../fetch/types.js';
import camelcase from 'camelcase';
import type { Annotation, ParsedAnnotation } from './types.js';

export const getParenthesizedArgs = (
  source: string,
  prefix: string
): string => {
  const rx = new RegExp(`(\\s|^)${prefix}\\s*\\((.*)\\)(\\s|$)`, 'i');
  const match = source.match(rx);
  return match ? match[2] : '';
};

export const getFieldName = (column: ColumnRow): string => {
  return camelcase(column.Field);
};

export const isPrimaryKey = (column: ColumnRow): boolean => {
  return column.Key === 'PRI';
};
export const isAutoIncrement = (column: ColumnRow): boolean => {
  return /\bauto_increment\b/i.test(column.Extra);
};

export const isUnique = (column: ColumnRow): boolean => {
  return column.Key === 'UNI';
};

export const isNullable = (column: ColumnRow): boolean => {
  return column.Null === 'YES';
};

export const hasDefault = (column: ColumnRow): boolean => {
  return (
    typeof column.Default === 'string' ||
    (isNullable(column) && column.Default === null)
  );
};
export const isGeneratedAlways = (column: ColumnRow): boolean => {
  return /\b(VIRTUAL|STORED) GENERATED\b/i.test(column.Extra);
};

export const isInvisible = (column: ColumnRow): boolean => {
  return /\bINVISIBLE\b/i.test(column.Extra);
};

export const getMysqlBaseType = (column: ColumnRow): MysqlBaseType | null => {
  const rx = new RegExp(`\\b(${MYSQL_TYPES.join('|')})\\b`, 'gi');
  const match = column.Type.match(rx);
  if (match) {
    return match[0].toLowerCase() as MysqlBaseType;
  }
  return null;
};

export const getCommentAnnotations = (
  column: ColumnRow
): ParsedAnnotation[] => {
  const rx = /(?:^|\s+)@(bigint|enum|set|json)(?:\((.*)\))?/gi;
  const result = Array.from(column.Comment.matchAll(rx)).map((r) => {
    return {
      fullAnnotation: r[0].trim(),
      annotation: r[1].toLowerCase() as Annotation,
      argument: r[2]
    };
  });
  return result;
};

export const getCastType = (
  column: ColumnRow,
  options: Partial<TypeOptions>
): CastType => {
  const mysqlBaseType = getMysqlBaseType(column);
  if ('json' === mysqlBaseType) {
    return 'json';
  }
  if ('bigint' === mysqlBaseType) {
    if (options.typeBigIntAsString === false) {
      return 'bigint';
    }
    const typeAnnotation = getCommentAnnotations(column).find(
      (a) => a.annotation === 'bigint'
    );
    if (typeAnnotation) {
      return 'bigint';
    }
    return 'string';
  }
  if (
    'tinyint' === mysqlBaseType &&
    getParenthesizedArgs(column.Type, 'tinyint').trim() !== '1'
  ) {
    if (options.typeTinyIntOneAsBoolean === false) {
      return 'int';
    }
    return 'boolean';
  }
  // not sure if this will ever be the case, but for completeness...
  if ('bool' === mysqlBaseType || 'boolean' === mysqlBaseType) {
    return 'boolean';
  }

  if ('set' === mysqlBaseType) {
    const typeAnnotation = getCommentAnnotations(column).find(
      (a) => a.annotation === 'set'
    );
    if (typeAnnotation) {
      return 'set';
    }
    return 'string';
  }

  if ('enum' === mysqlBaseType) {
    return 'enum';
  }

  switch (mysqlBaseType) {
    case 'int':
    case 'integer':
    case 'smallint':
    case 'mediumint':
    case 'year':
      return 'int';
    case 'float':
    case 'double':
    case 'decimal':
    case 'numeric':
    case 'real':
      return 'float';
    case 'date':
    case 'datetime':
    case 'timestamp':
      return 'date';
  }
  // everything else is cast to string, including time, bit, etc
  return 'string';
};
