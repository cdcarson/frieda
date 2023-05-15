import type { FetchedTable } from '$lib/fetch/types.js';
import type { FullTextSearchIndex, Table } from '../api/types.js';
import camelcase from 'camelcase';

export const getModelName = (table: Table): string => {
  return camelcase(table.name, { pascalCase: true });
};

export const getModelOmittedBySelectAllTypeName = (table: Table): string => {
  return `${getModelName(table)}OmittedBySelectAll`;
};

export const getModelPrimaryKeyTypeName = (table: Table): string => {
  return `${getModelName(table)}PrimaryKey`;
};

export const getModelCreateDataTypeName = (table: Table): string => {
  return `${getModelName(table)}CreateData`;
};
export const getModelUpdateDataTypeName = (table: Table): string => {
  return `${getModelName(table)}UpdateData`;
};

export const getModelFindUniqueParamsTypeName = (table: Table): string => {
  return `${getModelName(table)}FindUniqueParams`;
};

export const getModelDbTypeName = (table: Table): string => {
  return `${getModelName(table)}ModelDb`;
};

export const getModelClassGetterName = (table: Table): string => {
  return camelcase(table.name);
};

export const getFullTextSearchIndexes = (
  table: FetchedTable
): FullTextSearchIndex[] => {
  const names = Array.from(
    new Set(
      table.indexes
        .filter((index) => index.Index_type === 'FULLTEXT')
        .map((index) => index.Key_name)
    )
  );
  return names.map((name) => {
    return {
      key: name,
      tableName: table.name,
      indexedFields: table.indexes
        .filter((index) => index.Key_name === name)
        .map((index) => index.Column_name || '')
        .filter((s) => s.length > 0)
    };
  });
};
