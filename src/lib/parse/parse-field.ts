import type {
  Annotation,
  ExtendedFieldDefinition,
  ParsedAnnotation
} from './types.js';
import type { ColumnRow } from '../fetch/types.js';
import {
  MYSQL_TYPES,
  type MysqlBaseType,
  type TypeOptions,
  type CastType
} from '../api/types.js';
import camelcase from 'camelcase';
import { DEFAULT_JSON_FIELD_TYPE } from '../constants.js';
import { getParenthesizedArgs } from './helpers.js';

export const parseField = (
  column: ColumnRow,
  options: TypeOptions
): ExtendedFieldDefinition => {
  const fieldName = camelcase(column.Field);
  const columnName = column.Field;
  const primaryKey = column.Key === 'PRI';
  const unique = column.Key === 'UNI';
  const nullable = column.Null === 'YES';
  const hasDefault =
    typeof column.Default === 'string' || (nullable && column.Default === null);
  const generatedAlways = /\b(VIRTUAL|STORED) GENERATED\b/i.test(column.Extra);
  const autoIncrement = /\bauto_increment\b/i.test(column.Extra);
  const invisible = /\bINVISIBLE\b/i.test(column.Extra);
  const mysqlFullType = column.Type;
  const mysqlBaseType = getFieldMysqlBaseType(column);

  const { castType, isImportedType, javascriptType, typeAnnotation } =
    getFieldTypeInfo(column, options, mysqlBaseType);

  const javascriptTypePossiblyNull = `${javascriptType}${
    nullable ? '|null' : ''
  }`;
  const modelTypeDeclaration = `${fieldName}${
    invisible ? '?' : ''
  }:${javascriptTypePossiblyNull}`;

  const modelPrimaryKeyTypeDeclaration = primaryKey
    ? `${fieldName}:${javascriptType}`
    : null;
  const modelCreateDataTypeDeclaration = generatedAlways
    ? null
    : `${fieldName}${
        autoIncrement || hasDefault ? '?' : ''
      }:${javascriptTypePossiblyNull}`;

  const modelUpdateDataTypeDeclaration =
    primaryKey || generatedAlways
      ? null
      : `${fieldName}?:${javascriptTypePossiblyNull}`;

  const modelFindUniqueParamsType = unique
    ? `{${fieldName}:${javascriptType}}`
    : null;
  const fd: ExtendedFieldDefinition = {
    ...column,
    fieldName,
    columnName,
    primaryKey,
    unique,
    nullable,
    invisible,
    hasDefault,
    autoIncrement,
    generatedAlways,
    mysqlFullType,
    mysqlBaseType,
    castType,
    javascriptType,
    typeAnnotation,
    isImportedType,
    javascriptTypePossiblyNull,
    modelTypeDeclaration,
    modelPrimaryKeyTypeDeclaration,
    modelCreateDataTypeDeclaration,
    modelUpdateDataTypeDeclaration,
    modelFindUniqueParamsType
  };
  return fd;
};

const getFieldMysqlBaseType = (column: ColumnRow): MysqlBaseType | null => {
  const rx = new RegExp(`\\b(${MYSQL_TYPES.join('|')})\\b`, 'gi');
  const match = column.Type.match(rx);
  if (match) {
    return match[0].toLowerCase() as MysqlBaseType;
  }
  return null;
};

const getCommentAnnotations = (column: ColumnRow): ParsedAnnotation[] => {
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

export const getFieldTypeInfo = (
  column: ColumnRow,
  typeOptions: Partial<TypeOptions>,
  mysqlBaseType: MysqlBaseType | null
): {
  castType: CastType;
  javascriptType: string;
  typeAnnotation: ParsedAnnotation | null;
  isImportedType: boolean;
} => {
  if (!mysqlBaseType) {
    return {
      castType: 'string',
      javascriptType: 'string',
      typeAnnotation: null,
      isImportedType: false
    };
  }

  // json...
  if ('json' === mysqlBaseType) {
    return getJsonFieldTypeInfo(column);
  }

  // bigint
  if ('bigint' === mysqlBaseType) {
    return getBigIntFieldTypeInfo(column, typeOptions);
  }

  // tinyint, which can be boolean, plus the bool types...
  if (mysqlBaseType === 'tinyint' || mysqlBaseType === 'bool' || mysqlBaseType === 'boolean') {
    return getTinyIntOrBoolFieldTypeInfo(column, typeOptions, mysqlBaseType);
  }

  // set...
  if (mysqlBaseType === 'set') {
    return getSetFieldTypeInfo(column);
  }

  // enum...
  if (mysqlBaseType === 'enum') {
    return getEnumFieldTypeInfo(column);
  }

  switch (mysqlBaseType) {
    case 'int':
    case 'integer':
    case 'smallint':
    case 'mediumint':
    case 'year':
      return {
        isImportedType: false,
        castType: 'int',
        javascriptType: 'number',
        typeAnnotation: null
      };
    case 'float':
    case 'double':
    case 'decimal':
    case 'numeric':
    case 'real':
      return {
        isImportedType: false,
        castType: 'float',
        javascriptType: 'number',
        typeAnnotation: null
      };
    case 'date':
    case 'datetime':
    case 'timestamp':
      return {
        isImportedType: false,
        castType: 'date',
        javascriptType: 'Date',
        typeAnnotation: null
      };
    
  }

  
  // everything else is cast to string, including time, bit, etc
  return {
    isImportedType: false,
    castType: 'string',
    javascriptType: 'string',
    typeAnnotation: null
  };
};

const getJsonFieldTypeInfo = (
  column: ColumnRow
): {
  castType: CastType;
  javascriptType: string;
  typeAnnotation: ParsedAnnotation | null;
  isImportedType: boolean;
} => {
  const typeAnnotation = getCommentAnnotations(column).find(
    (a) => a.annotation === 'json'
  );
  if (
    typeAnnotation &&
    typeAnnotation.argument &&
    typeAnnotation.argument.trim().length > 0
  ) {
    return {
      isImportedType: true,
      castType: 'json',
      javascriptType: typeAnnotation.argument.trim(),
      typeAnnotation
    };
  }
  return {
    isImportedType: false,
    castType: 'json',
    javascriptType: DEFAULT_JSON_FIELD_TYPE,
    typeAnnotation: null
  };
};

const getBigIntFieldTypeInfo = (
  column: ColumnRow,
  options: Partial<TypeOptions>
): {
  castType: CastType;
  javascriptType: string;
  typeAnnotation: ParsedAnnotation | null;
  isImportedType: boolean;
} => {
  // type as string can be turned off globally
  if (options.typeBigIntAsString === false) {
    return {
      isImportedType: false,
      castType: 'bigint',
      javascriptType: 'bigint',
      typeAnnotation: null
    };
  }
  const typeAnnotation = getCommentAnnotations(column).find(
    (a) => a.annotation === 'bigint'
  );
  // cast to string can be turned off for the column...
  if (typeAnnotation) {
    return {
      isImportedType: false,
      castType: 'bigint',
      javascriptType: 'bigint',
      typeAnnotation
    };
  }
  return {
    isImportedType: false,
    castType: 'string',
    javascriptType: 'string',
    typeAnnotation: null
  };
};

const getTinyIntOrBoolFieldTypeInfo = (
  column: ColumnRow,
  options: Partial<TypeOptions>,
  mysqlBaseType: MysqlBaseType
): {
  castType: CastType;
  javascriptType: string;
  typeAnnotation: ParsedAnnotation | null;
  isImportedType: boolean;
} => {
  // I don't think this acan happen, but whatevs
  if (mysqlBaseType === 'bool' || mysqlBaseType === 'boolean') {
    return {
      isImportedType: false,
      castType: 'boolean',
      javascriptType: 'boolean',
      typeAnnotation: null
    };
  }
  // if it's not tinyint(1) then it's an int
  if (getParenthesizedArgs(column.Type, 'tinyint').trim() !== '1') {
    return {
      isImportedType: false,
      castType: 'int',
      javascriptType: 'number',
      typeAnnotation: null
    };
  }
  // type as boolean can be turned off globally
  if (options.typeTinyIntOneAsBoolean === false) {
    return {
      isImportedType: false,
      castType: 'int',
      javascriptType: 'number',
      typeAnnotation: null
    };
  }
  return {
    isImportedType: false,
    castType: 'boolean',
    javascriptType: 'boolean',
    typeAnnotation: null
  };
};

const getSetFieldTypeInfo = (
  column: ColumnRow
): {
  castType: CastType;
  javascriptType: string;
  typeAnnotation: ParsedAnnotation | null;
  isImportedType: boolean;
} => {
  const typeAnnotation = getCommentAnnotations(column).find(
    (a) => a.annotation === 'set'
  );
  if (typeAnnotation) {
    if (typeAnnotation.argument && typeAnnotation.argument.trim().length > 0) {
      const jsType = `Set<${typeAnnotation.argument.trim()}>`;
      return {
        isImportedType: true,
        castType: 'set',
        javascriptType: jsType,
        typeAnnotation
      };
    }
    const strings = getParenthesizedArgs(column.Type, 'set')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .join('|');
    const jsType = strings.length > 0 ? `Set<${strings}>` : `Set<string>`;
    return {
      isImportedType: false,
      castType: 'set',
      javascriptType: jsType,
      typeAnnotation
    };
  }
  return {
    isImportedType: false,
    castType: 'string',
    javascriptType: 'string',
    typeAnnotation: null
  };
};

const getEnumFieldTypeInfo = (
  column: ColumnRow
): {
  castType: CastType;
  javascriptType: string;
  typeAnnotation: ParsedAnnotation | null;
  isImportedType: boolean;
} => {
  const typeAnnotation = getCommentAnnotations(column).find(
    (a) => a.annotation === 'enum'
  );
  if (
    typeAnnotation &&
    typeAnnotation.argument &&
    typeAnnotation.argument.trim().length > 0
  ) {
    const jsType = typeAnnotation.argument.trim();
    return {
      isImportedType: true,
      castType: 'enum',
      javascriptType: jsType,
      typeAnnotation
    };
  }
  const strings = getParenthesizedArgs(column.Type, 'enum')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join('|');
  const jsType = strings.length > 0 ? strings : `string`;
  return {
    isImportedType: false,
    castType: 'enum',
    javascriptType: jsType,
    typeAnnotation: null
  };
};
