import type { Table, TypeOptions } from '../api/types.js';
import camelcase from 'camelcase';
import {
  getJavascriptType,
  getModelFieldTypeDeclaration
} from './field-parsers.js';

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

export const getModelTypeDeclarations = (
  table: Table,
  options: TypeOptions
): string => {
  const columnTypes = table.columns.map((column) => {
    return {
      column,
      javascriptType: getJavascriptType(column, options) 
    };
  });
  const typeName = getModelName(table);
  return `export type ${typeName}={${table.columns.map((c) =>
    getModelFieldTypeDeclaration(c, options)
  )}}`;
};
