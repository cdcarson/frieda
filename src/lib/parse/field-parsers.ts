import {
  MYSQL_TYPES,
  type CastType,
  type Column,
  type MysqlBaseType,
  type TypeOptions
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

export const getCommentAnnotations = (
  column: Column
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
  column: Column,
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
  // everything else is cast to string, including time, bit, etc,
  // als the case where mysqlBaseType is null
  return 'string';
};

export const getJavascriptType = (
  column: Column,
  options: Partial<TypeOptions>
): string => {
  const castType = getCastType(column, options);
  if ('json' === castType) {
    const typeAnnotation = getCommentAnnotations(column).find(
      (a) => a.annotation === 'json'
    );
    if (!typeAnnotation) {
      return DEFAULT_JSON_FIELD_TYPE;
    }
    if (!typeAnnotation.argument) {
      return DEFAULT_JSON_FIELD_TYPE;
    }
    return typeAnnotation.argument;
  }

  if ('set' === castType) {
    // castType is only set if the annotation exists, so this is safe
    const typeAnnotation = getCommentAnnotations(column).find(
      (a) => a.annotation === 'set'
    ) as ParsedAnnotation;

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
    const typeAnnotation = getCommentAnnotations(column).find(
      (a) => a.annotation === 'enum'
    );
    if (
      typeAnnotation &&
      typeAnnotation.argument &&
      typeAnnotation.argument.trim().length > 0
    ) {
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

export const getModelFieldPresence = (
  column: Column
): ModelFieldPresence => {
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

export const getModelFieldTypeDeclaration = (
  column: Column,
  jsType: string
): string => {
  const opt =
    getModelFieldPresence(column) === ModelFieldPresence.undefinedForSelectAll
      ? '?'
      : '';
  const orNull = isNullable(column) ? '|null' : '';
  const name = getFieldName(column);
  return `${name}${opt}:${jsType}${orNull}`;
};
export const getModelCreateFieldTypeDeclaration = (
  column: Column,
  jsType: string
): string|null => {
  const presence = getCreateModelFieldPresence(column);
  if (presence === CreateModelFieldPresence.omittedGenerated) {
    return null;
  }
  const opt = presence !== CreateModelFieldPresence.required;
  const orNull = isNullable(column) ? '|null' : '';
  const name = getFieldName(column);
  return `${name}${opt}:${jsType}${orNull}`;
}

export const getModelUpdateFieldTypeDeclaration = (
  column: Column,
  jsType: string
): string|null => {
  const presence = getUpdateModelFieldPresence(column);
  if (presence !== UpdateModelFieldPresence.optional) {
    return null;
  }
  // all fields are optional
  const opt = '?'
  const orNull = isNullable(column) ? '|null' : '';
  const name = getFieldName(column);
  return `${name}${opt}:${jsType}${orNull}`;
}
