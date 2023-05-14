import type { Table } from '../api/types.js';
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
