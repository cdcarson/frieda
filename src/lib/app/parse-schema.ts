import { MYSQL_TYPES, type CastType, type MysqlBaseType } from '$lib/index.js';
import camelcase from 'camelcase';
import type {
  SchemaModel,
  FetchedSchema,
  ParsedSchema,
  ColumnRow,
  ParsedField,
  FetchedTable,
  ParsedModel,
  ParsedIndex,
  TableType
} from './types.js';
import { extractQuotedStrings, getParenthesizedArgs, getValidJavascriptIdentifier } from './utils.js';

export const parseSchema = (
  schemaModels: SchemaModel[],
  fetchedSchema: FetchedSchema
): ParsedSchema => {
  return {
    models: fetchedSchema.tables.map((t) => parseModel(t, schemaModels))
  };
};

export const parseModel = <Type extends TableType = TableType>(
  table: FetchedTable,
  schemaModels: SchemaModel[]
): ParsedModel<Type> => {
  const modelName = getValidJavascriptIdentifier(
    camelcase(table.name, { pascalCase: true })
  );
  const schemaModel: SchemaModel | undefined = schemaModels.find(
    (m) => m.modelName === modelName
  );
  return {
    modelName,
    tableName: table.name,
    type: table.type as Type,
    selectAllTypeName: table.type === 'BASE TABLE' ? `${modelName}SelectAll`: undefined,
    primaryKeyTypeName: table.type === 'BASE TABLE' ? `${modelName}PrimaryKey` : undefined,
    createTypeName: table.type === 'BASE TABLE' ? `${modelName}Create` : undefined,
    updateTypeName: table.type === 'BASE TABLE' ? `${modelName}Update` : undefined,
    findUniqueTypeName: table.type === 'BASE TABLE' ? `${modelName}FindUnique` : undefined,
    dbTypeName: `${modelName}Db`,
    appDbKey: getValidJavascriptIdentifier(
      camelcase(table.name, { pascalCase: false })
    ),
    fields: table.columns.map((c) => parseField(c, schemaModel)),
    indexes: table.type === 'BASE TABLE' ? parseTableIndexes(table) : undefined
  } as ParsedModel<Type>;
};

export const parseField = (
  column: ColumnRow,
  schemaModel: SchemaModel | undefined
): ParsedField => {
  const fieldName = getValidJavascriptIdentifier(camelcase(column.Field));
  const mysqlBaseType = getFieldMySqlBaseType(column);
  const isPrimaryKey = getFieldIsPrimaryKey(column);
  const isUnique = getFieldIsUnique(column);
  const isAutoIncrement = getFieldIsAutoIncrement(column);
  const isNullable = getFieldIsNullable(column);
  const hasDefault = getFieldHasDefault(column);
  const defaultValue = getFieldDefaultValue(column);
  const isGeneratedAlways = getFieldIsGeneratedAlways(column);
  const isInvisible = getFieldIsInvisible(column);
  const javascriptType = getFieldJavascriptType(fieldName, column, schemaModel);
  const castType = getFieldCastType(column, javascriptType);
  return {
    fieldName,
    columnName: column.Field,
    javascriptType,
    castType,
    mysqlBaseType,
    isPrimaryKey,
    isUnique,
    isAutoIncrement,
    isNullable,
    hasDefault,
    defaultValue,
    isGeneratedAlways,
    isInvisible
  };
};

export const getFieldIsPrimaryKey = (column: ColumnRow): boolean => {
  return 'PRI' === column.Key;
};

export const getFieldIsUnique = (column: ColumnRow): boolean => {
  return 'UNI' === column.Key;
};

export const getFieldIsAutoIncrement = (column: ColumnRow): boolean => {
  return /\bauto_increment\b/i.test(column.Extra);
};

export const getFieldIsNullable = (column: ColumnRow): boolean => {
  return column.Null === 'YES';
};

export const getFieldHasDefault = (column: ColumnRow): boolean => {
  return (
    typeof column.Default === 'string' ||
    (getFieldIsNullable(column) && column.Default === null)
  );
};

export const getFieldDefaultValue = (
  column: ColumnRow
): string | null | undefined => {
  return getFieldHasDefault(column) ? column.Default : undefined;
};

export const getFieldIsGeneratedAlways = (column: ColumnRow): boolean => {
  return /\b(VIRTUAL|STORED) GENERATED\b/i.test(column.Extra);
};

export const getFieldIsTinyIntOne = (column: ColumnRow): boolean => {
  return (
    'tinyint' === getFieldMySqlBaseType(column) &&
    getParenthesizedArgs(column.Type, 'tinyint').trim() === '1'
  );
};

export const getFieldIsInvisible = (column: ColumnRow): boolean => {
  return /\bINVISIBLE\b/i.test(column.Extra);
};

export const getFieldSetOrEnumJavascriptStringType = (
  column: ColumnRow
): string | undefined => {
  const mysqlBaseType = getFieldMySqlBaseType(column);

  if (mysqlBaseType === 'set' || mysqlBaseType === 'enum') {
    const arg = getParenthesizedArgs(column.Type, mysqlBaseType);
    const strs = extractQuotedStrings(arg)
    return strs.join('|')
  }
};

export const getFieldJavascriptType = (
  fieldName: string,
  column: ColumnRow,
  schemaModel: SchemaModel | undefined
): string => {
  // if the schema model exists and the field exists, then go with it...
  if (schemaModel) {
    const field = schemaModel.fields.find((f) => fieldName === f.fieldName);
    if (field) {
      return field.javascriptType;
    }
  }
  const mysqlBaseType = getFieldMySqlBaseType(column);
  if (!mysqlBaseType) {
    return 'string';
  }
  // by convention...
  if (mysqlBaseType === 'tinyint' && getFieldIsTinyIntOne(column)) {
    return 'boolean';
  }
  switch (mysqlBaseType) {
    // not sure this will ever happen, but...
    case 'bool':
    case 'boolean':
      return 'boolean';

    // by convention...
    case 'bigint':
      return 'string';
    case 'json':
      return 'unknown';
    case 'set':
      return `Set<${getFieldSetOrEnumJavascriptStringType(column)}>`;
    case 'enum':
      return getFieldSetOrEnumJavascriptStringType(column) || 'string';

    // numeric types...
    case 'tinyint':
    case 'smallint':
    case 'mediumint':
    case 'int':
    case 'integer':
    case 'float':
    case 'double':
    case 'real':
    case 'decimal':
    case 'numeric':
    case 'year':
      return 'number';

    // date types...
    case 'datetime':
    case 'timestamp':
    case 'date':
      return 'Date';

    // everthing else is a string...
    case 'bit':
    case 'time':
    case 'char':
    case 'binary':
    case 'varchar':
    case 'varbinary':
    case 'tinyblob':
    case 'tinytext':
    case 'blob':
    case 'text':
    case 'mediumblob':
    case 'mediumtext':
    case 'longblob':
    case 'longtext':
    default:
      return 'string';
  }
};

export const getFieldMySqlBaseType = (
  column: ColumnRow
): MysqlBaseType | null => {
  const baseTypeRx = new RegExp(`\\b(${MYSQL_TYPES.join('|')})\\b`, 'gi');
  const baseTypeMatch = column.Type.match(baseTypeRx);
  const mysqlBaseType: MysqlBaseType | null = baseTypeMatch
    ? (baseTypeMatch[0] as MysqlBaseType)
    : null;
  return mysqlBaseType;
};

export const getFieldCastType = (
  column: ColumnRow,
  javascriptType: string
): CastType => {
  // take care of the guys where we can just infer the cast from the js type firet...
  if (javascriptType === 'string') {
    return 'string';
  }
  if (javascriptType === 'bigint') {
    return 'bigint';
  }
  if (javascriptType === 'boolean') {
    return 'boolean';
  }
  if (javascriptType === 'Date') {
    return 'date';
  }

  const mysqlBaseType = getFieldMySqlBaseType(column);
  if (javascriptType === 'number') {
    switch (mysqlBaseType) {
      case 'float':
      case 'double':
      case 'real':
      case 'decimal':
      case 'numeric':
        return 'float';
      default:
        return 'int';
    }
  }

  if (mysqlBaseType === 'json') {
    return 'json';
  }

  if (mysqlBaseType === 'set') {
    if (javascriptType.startsWith('Set')) {
      return 'set';
    }
  }
  if (mysqlBaseType === 'enum') {
    return 'string';
  }

  return 'string';
};

export const parseTableIndexes = (
  table: FetchedTable<'BASE TABLE'>
): ParsedIndex[] => {
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
