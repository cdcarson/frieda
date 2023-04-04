import {
  SimplifiedDatabaseType,
  type FieldSchema,
  type FullTextSearchIndex,
  type Model,
  type ModelSchema
} from '../../api/shared.server.js';
import type { RawTableColumnInfo, RawTableInfo } from './types.js';
import _ from 'lodash'
export const getModelSchemas = (
  tables: RawTableInfo[]
): ModelSchema<Model>[] => {
  return tables.map((t) => createModelSchema(t));
};

const createModelSchema = (table: RawTableInfo): ModelSchema<Model> => {
  const fields = table.columns.map((c) => createFieldSchema(c, table.name));
  return {
    modelName: _.upperFirst(_.camelCase(table.name)),
    tableName: table.name,
    fields,
    fullTextSearchIndexes: getTableFullTextSearchIndexes(table)
  };
};

const createFieldSchema = (
  column: RawTableColumnInfo,
  tableName: string
): FieldSchema<Model> => {
  const databaseType = getSimplifiedDatabaseType(column, tableName);
  const def: FieldSchema<Model> = {
    name: column.Field,
    databaseType,
    javascriptType: getJavascriptType(column, databaseType, tableName),
    hasDefault: column.Default !== null,
    isPrimaryKey: /PRI/i.test(column.Key),
    nullable: /yes/i.test(column.Null),
    isCreatedAt: false,
    isUpdatedAt: false,
    isPrimaryKeyGenerated: false,
    isDefaultGenerated: /DEFAULT_GENERATED/i.test(column.Extra),
    isGeneratedAlways:
      /STORED/i.test(column.Extra) && /GENERATED/i.test(column.Extra),
    isUnique: /UNI/i.test(column.Key)
  };
  if (def.isPrimaryKey && /auto_increment/i.test(column.Extra)) {
    def.isPrimaryKeyGenerated = true;
    def.isDefaultGenerated = true;
  }
  if (databaseType === SimplifiedDatabaseType.Date) {
    if (/DEFAULT_GENERATED/i.test(column.Extra)) {
      if (/on\s+update\s+CURRENT_TIMESTAMP/i.test(column.Extra)) {
        def.isUpdatedAt = true;
      } else {
        def.isCreatedAt = true;
      }
    }
  }
  return def;
};

const getSimplifiedDatabaseType = (
  column: RawTableColumnInfo,
  tableName: string
): SimplifiedDatabaseType => {
  // Deal with  bigint first. Assumed to be Key, unless the @bigint flag is in the comment
  if (/bigint/i.test(column.Type)) {
    return /@bigint/i.test(column.Comment)
      ? SimplifiedDatabaseType.BigInt
      : SimplifiedDatabaseType.Key;
  }
  // Deal with the other int types. Assumed to be Int, unless either @bigint or @boolean flags are present
  if (/int/i.test(column.Type)) {
    if (/@bigint/i.test(column.Comment)) {
      return SimplifiedDatabaseType.BigInt;
    }
    return /@boolean/i.test(column.Comment)
      ? SimplifiedDatabaseType.Boolean
      : SimplifiedDatabaseType.Int;
  }

  // floats...
  if (/float|double|decimal/i.test(column.Type)) {
    return SimplifiedDatabaseType.Float;
  }

  // enum...
  if (/enum/i.test(column.Type)) {
    return SimplifiedDatabaseType.Enum;
  }

  // datetime...
  if (/datetime/i.test(column.Type)) {
    return SimplifiedDatabaseType.Date;
  }

  // datetime...
  if (/json/i.test(column.Type)) {
    return SimplifiedDatabaseType.Json;
  }

  // all the string types...
  if (/text|char/i.test(column.Type)) {
    return SimplifiedDatabaseType.String;
  }

  // Out of luck for now. If we need to support other database types, add them later.
  throw new Error(
    `Unsupported database type ${column.Type} for ${tableName}.${column.Field}`
  );
};


const getJavascriptType = (
  column: RawTableColumnInfo,
  simpleType: SimplifiedDatabaseType,
  tableName: string
) => {
  if (simpleType === SimplifiedDatabaseType.Enum) {
    const result = column.Type.match(/enum\s*\(\s*([^)]+)\s*\)/i);
    if (!result) {
      throw new Error(
        `Unsupported enum type ${column.Type} for ${tableName}.${column.Field}`
      );
    }
    return result[1].split(',').join('|');
  }
  if (simpleType === SimplifiedDatabaseType.Json) {
    const result = column.Comment.match(/@jsontype\s*\(\s*([^)]+)\s*\)/i);
    return result ? result[1] : 'unknown';
  }
  switch (simpleType) {
    case SimplifiedDatabaseType.BigInt:
      return 'bigint';
    case SimplifiedDatabaseType.Int:
    case SimplifiedDatabaseType.Float:
      return 'number';
    case SimplifiedDatabaseType.Boolean:
      return 'boolean';
    case SimplifiedDatabaseType.Date:
      return 'Date';
    case SimplifiedDatabaseType.Key:
    case SimplifiedDatabaseType.String:
      return 'string';
    default:
      throw Error(
        `Could not calculate the javascript type for ${tableName}.${column.Field}`
      );
  }
};

const getTableFullTextSearchIndexes = (
  table: RawTableInfo
): FullTextSearchIndex[] => {
  const indexes: FullTextSearchIndex[] = [];
  table.indexes.forEach((rawIndex) => {
    if (!/FULLTEXT/i.test(rawIndex.Index_type)) {
      return;
    }
    const key = rawIndex.Key_name;
    let indexDef: FullTextSearchIndex | undefined = indexes.find(
      (i) => i.indexKey === key
    );
    if (indexDef) {
      indexDef.indexedFields.push(rawIndex.Column_name);
    } else {
      indexDef = {
        indexKey: key,
        indexedFields: [rawIndex.Column_name],
        tableName: table.name
      };
      indexes.push(indexDef);
    }
  });
  return indexes;
};
