import camelcase from "camelcase";
import type { FetchedTable, ParsedIndex, ParsedModel } from "./types.js";
import { getValidJavascriptIdentifier } from "./utils.js";
import { parseField } from "./parse-field.js";


export const parseTableIndexes = (table: FetchedTable): ParsedIndex[] => {
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

export const parseModel = (table: FetchedTable): ParsedModel => {
  const tableName = table.name;
  const modelName = getValidJavascriptIdentifier(camelcase(tableName, {pascalCase: true}))

  const selectAllTypeName = `${modelName}SelectAll`;
  const primaryKeyTypeName = `${modelName}PrimaryKey`;
  const createTypeName = `${modelName}Create`;
  const updateTypeName = `${modelName}Update`;
  const findUniqueTypeName = `${modelName}FindUnique`;
  const dbTypeName = `${modelName}Db`;
  const appDbKey = getValidJavascriptIdentifier(camelcase(tableName));
  const fields = table.columns.map((c) => parseField(c));
  const indexes = parseTableIndexes(table);
  
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
    
  };
};