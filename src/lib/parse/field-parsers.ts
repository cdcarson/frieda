import {
  MYSQL_TYPES,
  type CastType,
  type Column,
  type MysqlBaseType
} from '../api/types.js';
import camelcase from 'camelcase';
import type { Annotation, ParsedAnnotation } from './types.js';
import { DEFAULT_JSON_FIELD_TYPE } from '../constants.js';
import { ModelFieldPresence } from './types.js';
import { CreateModelFieldPresence } from './types.js';
import { UpdateModelFieldPresence } from './types.js';

export const getParenthesizedArgs = (
  source: string,
  prefix: string
): string => {
  const rx = new RegExp(`(\\s|^)${prefix}\\s*\\((.*)\\)(\\s|$)`, 'i');
  const match = source.match(rx);
  return match ? match[2] : '';
};

export const getFieldName = (column: Column): string => {
  return camelcase(column.Field);
};

export const isPrimaryKey = (column: Column): boolean => {
  return column.Key === 'PRI';
};
export const isAutoIncrement = (column: Column): boolean => {
  return /\bauto_increment\b/i.test(column.Extra);
};

export const isUnique = (column: Column): boolean => {
  return column.Key === 'UNI';
};

export const isNullable = (column: Column): boolean => {
  return column.Null === 'YES';
};

export const hasDefault = (column: Column): boolean => {
  return (
    typeof column.Default === 'string' ||
    (isNullable(column) && column.Default === null)
  );
};
export const isGeneratedAlways = (column: Column): boolean => {
  return /\b(VIRTUAL|STORED) GENERATED\b/i.test(column.Extra);
};

export const isInvisible = (column: Column): boolean => {
  return /\bINVISIBLE\b/i.test(column.Extra);
};

export const getMysqlBaseType = (column: Column): MysqlBaseType | null => {
  const rx = new RegExp(`\\b(${MYSQL_TYPES.join('|')})\\b`, 'gi');
  const match = column.Type.match(rx);
  if (match) {
    return match[0].toLowerCase() as MysqlBaseType;
  }
  return null;
};

export const getCommentAnnotations = (column: Column): ParsedAnnotation[] => {
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

export const getCastType = (column: Column): CastType => {
  const mysqlBaseType = getMysqlBaseType(column);
  if ('json' === mysqlBaseType) {
    return 'json';
  }
  if ('bigint' === mysqlBaseType) {
    return getBigIntAnnotation(column) ? 'bigint' : 'string';
  }
  if (isTinyIntOne(column)) {
    return 'boolean';
  }
  // not sure if this will ever be the case, but for completeness...
  if ('bool' === mysqlBaseType || 'boolean' === mysqlBaseType) {
    return 'boolean';
  }

  if ('set' === mysqlBaseType) {
    const typeAnnotation = getSetAnnotation(column);
    if (typeAnnotation) {
      return 'set';
    }
    return 'string';
  }

  if ('enum' === mysqlBaseType) {
    return 'enum';
  }

  switch (mysqlBaseType) {
    case 'tinyint':
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
  // everything else is cast to string, including time, bit, etc,
  // als the case where mysqlBaseType is null
  return 'string';
};

export const getJavascriptType = (column: Column): string => {
  const castType = getCastType(column);
  if ('json' === castType) {
    const annotation = getValidJsonAnnotation(column);
    return annotation ? annotation.argument.trim() : DEFAULT_JSON_FIELD_TYPE;
  }

  if ('set' === castType) {
    // castType is only set if the annotation exists, so this is safe
    const typeAnnotation = getSetAnnotation(column) as ParsedAnnotation;

    if (typeAnnotation.argument && typeAnnotation.argument.trim().length > 0) {
      return `Set<${typeAnnotation.argument.trim()}>`;
    }
    const strings = getParenthesizedArgs(column.Type, 'set')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join('|');
    return strings.length > 0 ? `Set<${strings}>` : `Set<string>`;
  }

  if ('enum' === castType) {
    const typeAnnotation = getValidEnumAnnotation(column);
    if (typeAnnotation) {
      return typeAnnotation.argument.trim();
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
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'Date';
    case 'float':
    case 'int':
      return 'number';
    case 'string':
    default:
      return 'string';
  }
};

export const getModelFieldPresence = (column: Column): ModelFieldPresence => {
  return isInvisible(column)
    ? ModelFieldPresence.undefinedForSelectAll
    : ModelFieldPresence.present;
};

export const getCreateModelFieldPresence = (
  column: Column
): CreateModelFieldPresence => {
  if (isGeneratedAlways(column)) {
    return CreateModelFieldPresence.omittedGenerated;
  }
  if (isAutoIncrement(column)) {
    return CreateModelFieldPresence.optionalAutoIncrement;
  }
  if (hasDefault(column)) {
    return CreateModelFieldPresence.optionalHasDefault;
  }
  return CreateModelFieldPresence.required;
};

export const getUpdateModelFieldPresence = (
  column: Column
): UpdateModelFieldPresence => {
  if (isGeneratedAlways(column)) {
    return UpdateModelFieldPresence.omittedGenerated;
  }
  if (isPrimaryKey(column)) {
    return UpdateModelFieldPresence.omittedPrimaryKey;
  }

  return UpdateModelFieldPresence.optional;
};

export const getValidJsonAnnotation = (
  column: Column
): Required<ParsedAnnotation> | undefined => {
  const typeAnnotation = getCommentAnnotations(column).find(
    (a) => a.annotation === 'json'
  );
  if (
    !typeAnnotation ||
    !typeAnnotation.argument ||
    typeAnnotation.argument.trim().length === 0
  ) {
    return;
  }

  return typeAnnotation as Required<ParsedAnnotation>;
};

export const getBigIntAnnotation = (
  column: Column
): ParsedAnnotation | undefined => {
  return getCommentAnnotations(column).find((a) => a.annotation === 'bigint');
};

export const getSetAnnotation = (
  column: Column
): ParsedAnnotation | undefined => {
  return getCommentAnnotations(column).find((a) => a.annotation === 'set');
};

export const getValidEnumAnnotation = (
  column: Column
): Required<ParsedAnnotation> | undefined => {
  const typeAnnotation = getCommentAnnotations(column).find(
    (a) => a.annotation === 'enum'
  );
  if (
    !typeAnnotation ||
    !typeAnnotation.argument ||
    typeAnnotation.argument.trim().length === 0
  ) {
    return;
  }

  return typeAnnotation as Required<ParsedAnnotation>;
};

export const isTinyIntOne = (column: Column): boolean => {
  return (
    'tinyint' === getMysqlBaseType(column) &&
    getParenthesizedArgs(column.Type, 'tinyint').trim() === '1'
  );
};
