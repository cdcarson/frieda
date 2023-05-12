import type {
  Annotation,
  ExtendedFieldDefinition,
  ModelNames,
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
  options: TypeOptions,
  modelNames: ModelNames
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

  const {
    castType,
    isImportedType,
    javascriptType,
    typeAnnotation,
    javascriptTypeComment
  } = getFieldTypeInfo(column, options, mysqlBaseType);

  const javascriptTypePossiblyNull = `${javascriptType}${
    nullable ? '|null' : ''
  }`;

  const otherTypeComments: string[] = [];
  const modelTypeDeclaration = `${fieldName}${
    invisible ? '?' : ''
  }:${javascriptTypePossiblyNull}`;

  if (invisible) {
    otherTypeComments.push(
      `invisible: Field will be undefined in ${modelNames.modelName} using SELECT *`
    );
  }

  const modelPrimaryKeyTypeDeclaration = primaryKey
    ? `${fieldName}:${javascriptType}`
    : null;

  const modelCreateDataTypeDeclaration = generatedAlways
    ? null
    : `${fieldName}${
        autoIncrement || hasDefault ? '?' : ''
      }:${javascriptTypePossiblyNull}`;

  if (generatedAlways) {
    otherTypeComments.push(
      `generatedAlways: Field is omitted in ${modelNames.createDataTypeName}`
    );
  } else if (autoIncrement) {
    otherTypeComments.push(
      `autoIncrement: Field is optional in ${modelNames.createDataTypeName}`
    );
  } else if (hasDefault) {
    otherTypeComments.push(
      `hasDefault: Field is optional in ${modelNames.createDataTypeName}`
    );
  }

  const modelUpdateDataTypeDeclaration =
    primaryKey || generatedAlways
      ? null
      : `${fieldName}?:${javascriptTypePossiblyNull}`;

  if (generatedAlways) {
    otherTypeComments.push(
      `generatedAlways: Field is omitted in ${modelNames.updateDataTypeName}`
    );
  } else if (primaryKey) {
    otherTypeComments.push(
      `primaryKey: Field is omitted in ${modelNames.createDataTypeName}`
    );
  }

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
    modelFindUniqueParamsType,
    javascriptTypeComment,
    otherTypeComments
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
  javascriptTypeComment: string;
} => {
  if (!mysqlBaseType) {
    return {
      castType: 'string',
      javascriptType: 'string',
      typeAnnotation: null,
      isImportedType: false,
      javascriptTypeComment: `Unsupported column type ${column.Type}. Typed as string by default.`
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
  if (
    mysqlBaseType === 'tinyint' ||
    mysqlBaseType === 'bool' ||
    mysqlBaseType === 'boolean'
  ) {
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
        typeAnnotation: null,
        javascriptTypeComment: `Default type for ${column.Type} columns.`
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
        typeAnnotation: null,
        javascriptTypeComment: `Default type for ${column.Type} columns.`
      };
    case 'date':
    case 'datetime':
    case 'timestamp':
      return {
        isImportedType: false,
        castType: 'date',
        javascriptType: 'Date',
        typeAnnotation: null,
        javascriptTypeComment: `Default type for ${column.Type} columns.`
      };
  }

  // everything else is cast to string, including time, bit, etc
  return {
    isImportedType: false,
    castType: 'string',
    javascriptType: 'string',
    typeAnnotation: null,
    javascriptTypeComment: `Default type for ${column.Type} columns.`
  };
};

const getJsonFieldTypeInfo = (
  column: ColumnRow
): {
  castType: CastType;
  javascriptType: string;
  typeAnnotation: ParsedAnnotation | null;
  isImportedType: boolean;
  javascriptTypeComment: string;
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
      typeAnnotation,
      javascriptTypeComment: `Typed using the  ${typeAnnotation.argument.trim()} annotation.`
    };
  }
  return {
    isImportedType: false,
    castType: 'json',
    javascriptType: DEFAULT_JSON_FIELD_TYPE,
    typeAnnotation: null,
    javascriptTypeComment: `Missing @json type annotation. Typed as ${DEFAULT_JSON_FIELD_TYPE}.`
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
  javascriptTypeComment: string;
} => {
  // type as string can be turned off globally
  if (options.typeBigIntAsString === false) {
    return {
      isImportedType: false,
      castType: 'bigint',
      javascriptType: 'bigint',
      typeAnnotation: null,
      javascriptTypeComment: `Options typeBigIntAsString = false.`
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
      typeAnnotation,
      javascriptTypeComment: `Typed as bigint using @bigint annotation.`
    };
  }
  return {
    isImportedType: false,
    castType: 'string',
    javascriptType: 'string',
    typeAnnotation: null,
    javascriptTypeComment: `Options typeBigIntAsString = true.`
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
  javascriptTypeComment: string;
} => {
  // I don't think this can happen, but whatevs
  if (mysqlBaseType === 'bool' || mysqlBaseType === 'boolean') {
    return {
      isImportedType: false,
      castType: 'boolean',
      javascriptType: 'boolean',
      typeAnnotation: null,
      javascriptTypeComment: `Default type for ${column.Type} columns.`
    };
  }
  // if it's not tinyint(1) then it's an int
  if (getParenthesizedArgs(column.Type, 'tinyint').trim() !== '1') {
    return {
      isImportedType: false,
      castType: 'int',
      javascriptType: 'number',
      typeAnnotation: null,
      javascriptTypeComment: `Default type for ${column.Type} columns.`
    };
  }
  // type as boolean can be turned off globally
  if (options.typeTinyIntOneAsBoolean === false) {
    return {
      isImportedType: false,
      castType: 'int',
      javascriptType: 'number',
      typeAnnotation: null,
      javascriptTypeComment: `Options typeTinyIntOneAsBoolean = false.`
    };
  }
  return {
    isImportedType: false,
    castType: 'boolean',
    javascriptType: 'boolean',
    typeAnnotation: null,
    javascriptTypeComment: `Options typeTinyIntOneAsBoolean = true.`
  };
};

const getSetFieldTypeInfo = (
  column: ColumnRow
): {
  castType: CastType;
  javascriptType: string;
  typeAnnotation: ParsedAnnotation | null;
  isImportedType: boolean;
  javascriptTypeComment: string;
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
        typeAnnotation,
        javascriptTypeComment: `Typed using the  ${typeAnnotation.argument.trim()} annotation.`
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
      typeAnnotation,
      javascriptTypeComment: `Typed using the @set annotation.`
    };
  }
  return {
    isImportedType: false,
    castType: 'string',
    javascriptType: 'string',
    typeAnnotation: null,
    javascriptTypeComment: `Default type for ${column.Type} columns.`
  };
};

const getEnumFieldTypeInfo = (
  column: ColumnRow
): {
  castType: CastType;
  javascriptType: string;
  typeAnnotation: ParsedAnnotation | null;
  isImportedType: boolean;
  javascriptTypeComment: string;
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
      typeAnnotation,
      javascriptTypeComment: `Typed using the  ${typeAnnotation.argument.trim()} annotation.`
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
    typeAnnotation: null,
    javascriptTypeComment: `Default type for ${column.Type} columns.`
  };
};
