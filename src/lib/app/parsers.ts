import { MYSQL_TYPES, type CastType, type MysqlBaseType } from '$lib/index.js';
import camelcase from 'camelcase';
import { DEFAULT_JSON_FIELD_TYPE } from './shared.js';
import { getParenthesizedArgs, wrapLines } from './utils.js';
import {
  CreateTypeInclusion,
  ModelTypeInclusion,
  SelectAllTypeInclusion,
  UpdateTypeInclusion,
  type ColumnRow,
  type FetchedSchema,
  type FetchedTable,
  type ParsedAnnotation,
  type ParsedField,
  type ParsedIndex,
  type ParsedModel,
  type ParsedSchema,
  type TypeCodeInfo,
  type TypeDeclarationNote
} from './shared.js';

export const getValidIdentifier = (name: string) => {
  return /^[a-z]/i.test(name) ? name : `_${name}`
}

export const getModelName = (tableName: string): string => {
  return getValidIdentifier(camelcase(tableName, {pascalCase: true}))
}

export const getFieldName = (columnName: string): string => {
  return getValidIdentifier(camelcase(columnName, {pascalCase: false}))
}

export const getTableIndexes = (table: FetchedTable): ParsedIndex[] => {
  const indexNames = Array.from(new Set(table.indexes.map((i) => i.Key_name)));
  return indexNames.map((indexName) => {
    const rows = table.indexes.filter((i) => i.Key_name === indexName);
    return {
      indexName,
      indexedColumns: rows
        .map((i) => i.Column_name)
        .filter((s) => s !== null) as string[],
      isPrimary: indexName === 'PRIMARY',
      isFullTextSearch: rows[0].Index_type === 'FULLTEXT',
      tableName: table.name,
      isUnique: rows[0].Non_unique === 0
    };
  });
};

export const getModelTypeCode = (
  modelName: string,
  fields: ParsedField[]
): TypeCodeInfo => {
  const desc = `The base model type. Note that fields where the underlying column is \`INVISIBLE\` are **optional** in this type.`;
  const notes: TypeDeclarationNote[] = fields
    .filter(
      (f) => f.modelTypeInclusion === ModelTypeInclusion.optionalInvisible
    )
    .map((f) => {
      return {
        field: f.fieldName,
        note: `\`${f.fieldName}\` is **optional** in \`${modelName}\` (colum is \`INVISIBLE\`)`
      };
    });
  const comment = [
    '/**',
    ...wrapLines(desc).map((s) => ` * ${s}`),
    ...notes.map((s) => ` * - ${s.note}`),
    ' */'
  ].join('\n');
  const decl = `export type ${modelName}={
    ${fields.map((f) => f.modelTypePropertySignature).join(';')}
  }`;
  const t: TypeCodeInfo = {
    declaration: [comment, decl].join('\n'),
    description: desc,
    notes: notes,
    typeName: modelName
  };
  return t;
};

export const getSelectAllTypeCode = (
  modelName: string,
  selectAllTypeName: string,
  fields: ParsedField[]
): TypeCodeInfo => {
  const desc = `Represents the data returned when the \`${modelName}\` model is queried with \`SELECT *\`. Note that fields where the underlying column is \`INVISIBLE\` are omitted from this type.`;
  const notes: TypeDeclarationNote[] = fields
    .filter(
      (f) =>
        f.selectAllTypeInclusion === SelectAllTypeInclusion.omittedInvisible
    )
    .map((f) => {
      return {
        field: f.fieldName,
        note: `\`${f.fieldName}\` is **omitted** in \`${modelName}\` (colum is \`INVISIBLE\`)`
      };
    });

  const comment = [
    '/**',
    ...wrapLines(desc).map((s) => ` * ${s}`),
    ...notes.map((s) => ` * - ${s.note}`),
    ' */'
  ].join('\n');
  const decl = `export type ${selectAllTypeName}={
    ${fields
      .map((f) => f.selectAllTypePropertySignature)
      .filter((s) => s !== undefined)
      .join(';')}
  }`;
  const t: TypeCodeInfo = {
    declaration: [comment, decl].join('\n'),
    description: desc,
    notes: notes,
    typeName: selectAllTypeName
  };
  return t;
};

export const getPrimaryKeyTypeCode = (
  modelName: string,
  primaryKeyTypeName: string,
  fields: ParsedField[]
): TypeCodeInfo => {
  const desc = `The primary key type for the \`${modelName}\` model. This type is used to update and delete models, and is the return type when you create a new \`${modelName}\`.`;
  const notes: TypeDeclarationNote[] = fields
    .filter((f) => f.isPrimaryKey)
    .map((f) => {
      return {
        field: f.fieldName,
        note: `\`${f.fieldName}\` is a primary key.`
      };
    });

  const comment = [
    '/**',
    ...wrapLines(desc).map((s) => ` * ${s}`),
    ...notes.map((s) => ` * - ${s.note}`),
    ' */'
  ].join('\n');
  const decl = `export type ${primaryKeyTypeName}={
    ${fields
      .filter((f) => f.isPrimaryKey)
      .map((f) => `${f.fieldName}:${f.javascriptType}`)
      .join(';')}
  }`;
  const t: TypeCodeInfo = {
    declaration: [comment, decl].join('\n'),
    description: desc,
    notes: notes,
    typeName: primaryKeyTypeName
  };
  return t;
};

export const getCreateTypeCode = (
  modelName: string,
  createTypeName: string,
  fields: ParsedField[]
): TypeCodeInfo => {
  const desc = `Data passed to create a new \`${modelName}\` model. Fields where the underlying column is \`GENERATED\` are omitted. Fields where the underlying column is \`auto_increment\` or has a default value are optional.`;
  const notes: TypeDeclarationNote[] = fields
    .filter((f) => f.createTypeInclusion !== CreateTypeInclusion.included)
    .map((f) => {
      if (
        f.createTypeInclusion === CreateTypeInclusion.omittedGeneratedAlways
      ) {
        return {
          field: f.fieldName,
          note: `\`${f.fieldName}\` is **omitted** (column is \`GENERATED\`.)`
        };
      } else if (
        f.createTypeInclusion === CreateTypeInclusion.optionalAutoIncrement
      ) {
        return {
          field: f.fieldName,
          note: `\`${f.fieldName}\` is **optional** (column is \`auto_increment\`.)`
        };
      } else if (
        f.createTypeInclusion === CreateTypeInclusion.optionalHasDefault
      ) {
        return {
          field: f.fieldName,
          note: `\`${f.fieldName}\` is **optional** (column has a default value.)`
        };
      }
    }) as TypeDeclarationNote[];

  const comment = [
    '/**',
    ...wrapLines(desc).map((s) => ` * ${s}`),
    ...notes.map((s) => ` * - ${s.note}`),
    ' */'
  ].join('\n');
  const decl = `export type ${createTypeName}={
    ${fields
      .filter((f) => f.createTypePropertySignature !== undefined)
      .map((f) => f.createTypePropertySignature)
      .join(';')}
  }`;
  const t: TypeCodeInfo = {
    declaration: [comment, decl].join('\n'),
    description: desc,
    notes: notes,
    typeName: createTypeName
  };
  return t;
};

export const getUpdateTypeCode = (
  modelName: string,
  updateTypeName: string,
  fields: ParsedField[]
): TypeCodeInfo => {
  const desc = `Data passed to update an existing \`${modelName}\` model. Fields where the underlying column is \`GENERATED\` or is a primary key are omitted. All other fields are optional.`;
  const notes: TypeDeclarationNote[] = fields
    .filter((f) => f.updateTypeInclusion !== UpdateTypeInclusion.included)
    .map((f) => {
      if (
        f.updateTypeInclusion === UpdateTypeInclusion.omittedGeneratedAlways
      ) {
        return {
          field: f.fieldName,
          note: `\`${f.fieldName}\` is **omitted** (column is \`GENERATED\`.)`
        };
      } else if (
        f.updateTypeInclusion === UpdateTypeInclusion.omittedPrimaryKey
      ) {
        return {
          field: f.fieldName,
          note: `\`${f.fieldName}\` is **omitted** (column is a primary key.)`
        };
      }
    }) as TypeDeclarationNote[];

  const comment = [
    '/**',
    ...wrapLines(desc).map((s) => ` * ${s}`),
    ...notes.map((s) => ` * - ${s.note}`),
    ' */'
  ].join('\n');
  const decl = `export type ${updateTypeName}={
    ${fields
      .filter((f) => f.updateTypePropertySignature !== undefined)
      .map((f) => f.updateTypePropertySignature)
      .join(';')}
  }`;
  const t: TypeCodeInfo = {
    declaration: [comment, decl].join('\n'),
    description: desc,
    notes: notes,
    typeName: updateTypeName
  };
  return t;
};

export const getFindUniqueType = (
  modelName: string,
  findUniqueTypeName: string,
  primaryKeyTypeName: string,
  indexes: ParsedIndex[],
  fields: ParsedField[]
): TypeCodeInfo => {
  const uniqueTypes: string[] = [primaryKeyTypeName];
  const notes: TypeDeclarationNote[] = [];
  for (const index of indexes.filter((i) => i.isUnique)) {
    const propSigs = index.indexedColumns.map((c) => {
      const f = fields.find((f) => f.columnName === c) as ParsedField;
      return `${f.fieldName}:${f.javascriptType}`;
    });
    uniqueTypes.push(`{${propSigs.join('\n')}}`);
    notes.push({
      note: `Unique index \`${index.indexName}\``
    });
  }
  const desc = `Type representing how to uniquely select a \`${modelName}\` model. This includes the \`${primaryKeyTypeName}\` primary key type plus types derived from the table's other unique indexes.`;
  const comment = [
    '/**',
    ...wrapLines(desc).map((s) => ` * ${s}`),
    ...notes.map((s) => ` * - ${s.note}`),
    ' */'
  ].join('\n');
  const decl = `export type ${findUniqueTypeName}=${uniqueTypes.join('|')}`;
  const t: TypeCodeInfo = {
    declaration: [comment, decl].join('\n'),
    description: desc,
    notes: notes,
    typeName: findUniqueTypeName
  };
  return t;
};

export const getDbType = (
  modelName: string,
  selectAllTypeName: string,
  primaryKeyTypeName: string,
  createTypeName: string,
  updateTypeName: string,
  findUniqueTypeName: string,
  dbTypeName: string
): TypeCodeInfo => {
  const desc = `Database type for the \`${modelName}\` model.`;
  const comment = ['/**', ...wrapLines(desc).map((s) => ` * ${s}`), ' */'].join(
    '\n'
  );
  const els = [
    modelName,
    selectAllTypeName,
    primaryKeyTypeName,
    createTypeName,
    updateTypeName,
    findUniqueTypeName
  ];
  const decl = `export type ${dbTypeName}=ModelDb<${els.join(',')}>`;
  const t: TypeCodeInfo = {
    declaration: [comment, decl].join('\n'),
    description: desc,
    notes: [],
    typeName: dbTypeName
  };
  return t;
};

export const parseSchema = (fetchedSchema: FetchedSchema): ParsedSchema => {
  return {
    databaseName: fetchedSchema.databaseName,
    fetchedSchema,
    fetched: new Date(fetchedSchema.fetched),
    models: fetchedSchema.tables.map((t) => parseModel(t))
  };
};

export const parseModel = (table: FetchedTable): ParsedModel => {
  const tableName = table.name;
  const modelName = getModelName(tableName)

  const selectAllTypeName = `${modelName}SelectAll`;
  const primaryKeyTypeName = `${modelName}PrimaryKey`;
  const createTypeName = `${modelName}Create`;
  const updateTypeName = `${modelName}Update`;
  const findUniqueTypeName = `${modelName}FindUnique`;
  const dbTypeName = `${modelName}Db`;
  const appDbKey = getValidIdentifier(camelcase(tableName));
  const fields = table.columns.map((c) => parseField(c));
  const indexes = getTableIndexes(table);
  const modelType = getModelTypeCode(modelName, fields);
  const selectAllType = getSelectAllTypeCode(
    modelName,
    selectAllTypeName,
    fields
  );
  const primaryKeyType = getPrimaryKeyTypeCode(
    modelName,
    primaryKeyTypeName,
    fields
  );
  const createType = getCreateTypeCode(modelName, createTypeName, fields);
  const updateType = getUpdateTypeCode(modelName, updateTypeName, fields);
  const findUniqueType = getFindUniqueType(
    modelName,
    findUniqueTypeName,
    primaryKeyTypeName,
    indexes,
    fields
  );
  const dbType = getDbType(
    modelName,
    selectAllTypeName,
    primaryKeyTypeName,
    createTypeName,
    updateTypeName,
    findUniqueTypeName,
    dbTypeName
  );
  return {
    table,
    tableName,
    modelName,
    selectAllTypeName,
    primaryKeyTypeName,
    createTypeName,
    updateTypeName,
    findUniqueTypeName,
    dbTypeName,
    appDbKey,
    fields,
    indexes,
    modelType,
    selectAllType,
    primaryKeyType,
    createType,
    updateType,
    findUniqueType,
    dbType
  };
};

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
  const modelTypeInclusion: ModelTypeInclusion = isInvisible
    ? ModelTypeInclusion.optionalInvisible
    : ModelTypeInclusion.included;
  const selectAllTypeInclusion: SelectAllTypeInclusion = isInvisible
    ? SelectAllTypeInclusion.omittedInvisible
    : SelectAllTypeInclusion.included;
  let createTypeInclusion: CreateTypeInclusion;
  if (isGeneratedAlways) {
    createTypeInclusion = CreateTypeInclusion.omittedGeneratedAlways;
  } else if (isAutoIncrement) {
    createTypeInclusion = CreateTypeInclusion.optionalAutoIncrement;
  } else if (hasDefault) {
    createTypeInclusion = CreateTypeInclusion.optionalHasDefault;
  } else {
    createTypeInclusion = CreateTypeInclusion.included;
  }
  let updateTypeInclusion: UpdateTypeInclusion;
  if (isGeneratedAlways) {
    updateTypeInclusion = UpdateTypeInclusion.omittedGeneratedAlways;
  } else if (isPrimaryKey) {
    updateTypeInclusion = UpdateTypeInclusion.omittedPrimaryKey;
  } else {
    updateTypeInclusion = UpdateTypeInclusion.included;
  }
  const columnName = column.Field;
  const fieldName = getFieldName(columnName);
  const orNull = isNullable ? '|null' : '';
  const opt =
    modelTypeInclusion === ModelTypeInclusion.optionalInvisible ? '?' : '';
  const modelTypePropertySignature = `${fieldName}${opt}:${javascriptType}${orNull}`;
  const selectAllTypePropertySignature =
    selectAllTypeInclusion === SelectAllTypeInclusion.omittedInvisible
      ? undefined
      : modelTypePropertySignature;
  let createTypePropertySignature: string | undefined;
  if (createTypeInclusion !== CreateTypeInclusion.omittedGeneratedAlways) {
    const opt = createTypeInclusion === CreateTypeInclusion.included ? '' : '?';
    createTypePropertySignature = `${fieldName}${opt}:${javascriptType}${orNull}`;
  }
  let updateTypePropertySignature: string | undefined;
  if (updateTypeInclusion === UpdateTypeInclusion.included) {
    updateTypePropertySignature = `${fieldName}?:${javascriptType}${orNull}`;
  }
  const parenthesizedTypeArg = mysqlBaseType
    ? getParenthesizedArgs(column.Type, mysqlBaseType)
    : '';
  let precision = 0;
  let scale = 0;
  if ('numeric' === mysqlBaseType || 'decimal' === mysqlBaseType) {
    [precision, scale] = parenthesizedTypeArg
      .split(',')
      .map((s) => s.trim())
      .map((s) => parseInt(s))
      .map((n) => (Number.isNaN(n) ? 0 : n));
  }
  const isUnsigned = /\bUNSIGNED/i.test(column.Type);
  const typeTinyIntAsBoolean = isTinyIntOne;
  const typeBigIntAsBigInt = bigIntAnnotation !== undefined;
  
  const charLength =
    mysqlBaseType &&
    (['varchar', 'char', 'binary', 'varbinary'] as MysqlBaseType[]).includes(
      mysqlBaseType
    )
      ? parseInt(parenthesizedTypeArg || '255')
      : 0;
  return {
    charLength,
    isUnsigned,
    typeTinyIntAsBoolean,
    typeBigIntAsBigInt,
    parenthesizedTypeArg,
    precision,
    scale,
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
    isGeneratedAlways,
    modelTypeInclusion,
    selectAllTypeInclusion,
    createTypeInclusion,
    updateTypeInclusion,
    modelTypePropertySignature,
    selectAllTypePropertySignature,
    createTypePropertySignature,
    updateTypePropertySignature
  };
};
