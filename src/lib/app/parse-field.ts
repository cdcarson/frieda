import camelcase from 'camelcase';
import type { ColumnRow, ParsedAnnotation, ParsedField } from './types.js';
import { getParenthesizedArgs, getValidJavascriptIdentifier } from './utils.js';
import {
  MYSQL_TYPES,
  type CastType,
  type MysqlBaseType
} from '../api/types.js';
import { DEFAULT_JSON_FIELD_TYPE } from './constants.js';

export const parseField = (column: ColumnRow): ParsedField => {
  const baseTypeRx = new RegExp(`\\b(${MYSQL_TYPES.join('|')})\\b`, 'gi');
  const baseTypeMatch = column.Type.match(baseTypeRx);
  const mysqlBaseType: MysqlBaseType | null = baseTypeMatch
    ? (baseTypeMatch[0] as MysqlBaseType)
    : null;
  const isPrimaryKey = 'PRI' === column.Key;
  const isUnique = 'UNI' === column.Key;
  const isAutoIncrement = /\bauto_increment\b/i.test(column.Extra);
  const isNullable = column.Null === 'YES';
  const hasDefault =
    typeof column.Default === 'string' ||
    (isNullable && column.Default === null);
  const defaultValue = hasDefault ? column.Default : undefined;
  const isGeneratedAlways = /\b(VIRTUAL|STORED) GENERATED\b/i.test(
    column.Extra
  );
  const isTinyIntOne =
    'tinyint' === mysqlBaseType &&
    getParenthesizedArgs(column.Type, 'tinyint').trim() === '1';
  const isInvisible = /\bINVISIBLE\b/i.test(column.Extra);
  const annotationRx = /(?:^|\s+)@(bigint|set|json)(?:\((.*)\))?/gi;
  const typeAnnotations: ParsedAnnotation[] = Array.from(
    column.Comment.matchAll(annotationRx)
  ).map((r) => {
    return {
      fullAnnotation: r[0].trim(),
      annotation: r[1].toLowerCase() as 'bigint' | 'set' | 'json',
      typeArgument: r[2]
    };
  });

  const bigIntAnnotation =
    mysqlBaseType === 'bigint'
      ? typeAnnotations.find((a) => a.annotation === 'bigint')
      : undefined;
  const setAnnotation =
    mysqlBaseType === 'set'
      ? typeAnnotations.find((a) => a.annotation === 'set')
      : undefined;
  let jsonAnnotation: Required<ParsedAnnotation> | undefined =
    mysqlBaseType === 'json'
      ? (typeAnnotations.find(
          (a) => a.annotation === 'json'
        ) as Required<ParsedAnnotation>)
      : undefined;
  if (column.Field === 'stripeAccount') {
    console.log(column.Comment, mysqlBaseType);
    console.log(typeAnnotations);
  }
  if (jsonAnnotation) {
    if (
      typeof jsonAnnotation.typeArgument !== 'string' ||
      jsonAnnotation.typeArgument.trim().length === 0
    ) {
      jsonAnnotation = undefined;
    }
  }

  let jsEnumerableStringType: string | undefined;
  if (mysqlBaseType === 'set' || mysqlBaseType === 'enum') {
    const t = getParenthesizedArgs(column.Type, mysqlBaseType || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join('|');
    jsEnumerableStringType = t.length > 0 ? t : 'string';
  }
  let castType: CastType;
  switch (mysqlBaseType) {
    case 'json':
      castType = 'json';
      break;
    case 'tinyint':
      castType = isTinyIntOne ? 'boolean' : 'int';
      break;
    // not sure if this will ever be the case, but for completeness...
    case 'bool':
    case 'boolean':
      castType = 'boolean';
      break;
    case 'bigint':
      castType = bigIntAnnotation ? 'bigint' : 'string';
      break;
    case 'set':
      castType = setAnnotation ? 'set' : 'string';
      break;
    case 'int':
    case 'integer':
    case 'smallint':
    case 'mediumint':
    case 'year':
      castType = 'int';
      break;
    case 'float':
    case 'double':
    case 'decimal':
    case 'numeric':
    case 'real':
      castType = 'float';
      break;
    case 'date':
    case 'datetime':
    case 'timestamp':
      castType = 'date';
      break;
    default:
      castType = 'string';
      break;
  }
  let javascriptType: string;
  if ('json' === castType) {
    javascriptType = jsonAnnotation
      ? jsonAnnotation.typeArgument
      : DEFAULT_JSON_FIELD_TYPE;
  } else if ('set' === castType) {
    javascriptType = setAnnotation
      ? `Set<${jsEnumerableStringType}>`
      : 'string';
  } else if ('enum' === mysqlBaseType) {
    javascriptType = jsEnumerableStringType || 'string';
  } else {
    switch (castType) {
      case 'bigint':
        javascriptType = 'bigint';
        break;
      case 'boolean':
        javascriptType = 'boolean';
        break;
      case 'date':
        javascriptType = 'Date';
        break;
      case 'float':
      case 'int':
        javascriptType = 'number';
        break;
      case 'string':
      default:
        javascriptType = 'string';
        break;
    }
  }

  const columnName = column.Field;
  const fieldName = getValidJavascriptIdentifier(camelcase(columnName));

  const isUnsigned = /\bUNSIGNED/i.test(column.Type);

  return {
    isUnsigned,
    bigIntAnnotation,
    castType,
    column,
    columnName: column.Field,
    fieldName,
    isInvisible,
    isTinyIntOne,
    javascriptType,
    jsEnumerableStringType,
    jsonAnnotation,
    mysqlBaseType,
    setAnnotation,
    typeAnnotations,
    isAutoIncrement,
    isPrimaryKey,
    isUnique,
    hasDefault,
    defaultValue,
    isNullable,
    isGeneratedAlways
  };
};
