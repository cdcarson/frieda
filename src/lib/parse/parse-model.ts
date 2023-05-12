import type { FetchedTable } from '$lib/fetch/types.js';
import type { TypeOptions } from '../api/types.js';
import { parseField } from './parse-field.js';
import type { ExtendedModelDefinition, ModelNames } from './types.js';
import camelcase from 'camelcase';
export const parseModel = (
  table: FetchedTable,
  options: TypeOptions
): ExtendedModelDefinition => {
  const modelNames = getModelNames(table.name);
  const {
    modelName,
    omittedBySelectAllTypeName,
    primaryKeyTypeName,
    createDataTypeName,
    updateDataTypeName,
    findUniqueParamsTypeName,
    dbTypeName,
    classGetterName
  } = modelNames;
  const fields = table.columns.map((c) => parseField(c, options, modelNames));
  const modelTypeDeclaration = `export type ${modelName}={${fields
    .map((f) => f.modelTypeDeclaration)
    .join(';')}}`;
  const omittedBySelectAllTypeDeclaration = `export type ${omittedBySelectAllTypeName}=[${fields
    .filter((f) => f.invisible)
    .map((f) => `'${f.fieldName}'`)
    .join(',')}]`;
  const primaryKeyTypeDeclaration = `export type ${primaryKeyTypeName}={${fields
    .map((f) => f.modelPrimaryKeyTypeDeclaration)
    .filter((s) => s !== null)
    .join(';')}}`;
  const createDataTypeDeclaration = `export type ${createDataTypeName}={${fields
    .map((f) => f.modelCreateDataTypeDeclaration)
    .filter((s) => s !== null)
    .join(';')}}`;
  const updateDataTypeDeclaration = `export type ${updateDataTypeName}={${fields
    .map((f) => f.modelUpdateDataTypeDeclaration)
    .filter((s) => s !== null)
    .join(';')}}`;
  const findUniqueParamsTypeDeclaration = `export type ${findUniqueParamsTypeName}=${[
    primaryKeyTypeName,
    ...fields.map((f) => f.modelFindUniqueParamsType).filter((s) => s !== null)
  ].join('|')}`;
  const dbTypeDeclaration = `export type ${dbTypeName}=ModelDb<${[
    modelName,
    omittedBySelectAllTypeName,
    primaryKeyTypeName,
    createDataTypeName,
    updateDataTypeName,
    findUniqueParamsTypeName
  ].join(',')}>`;
  return {
    modelName,
    tableName: table.name,
    fields,
    modelTypeDeclaration,
    omittedBySelectAllTypeName,
    omittedBySelectAllTypeDeclaration,
    primaryKeyTypeName,
    primaryKeyTypeDeclaration,
    createDataTypeName,
    createDataTypeDeclaration,
    updateDataTypeName,
    updateDataTypeDeclaration,
    findUniqueParamsTypeName,
    findUniqueParamsTypeDeclaration,
    dbTypeName,
    dbTypeDeclaration,
    classGetterName,
    createSql: table.createSql,
    indexes: table.indexes
  };
};

export const getModelNames = (tableName: string): ModelNames => {
  const modelName = camelcase(tableName, { pascalCase: true });
  return {
    modelName,
    omittedBySelectAllTypeName: `${modelName}OmittedBySelectAll`,
    primaryKeyTypeName: `${modelName}PrimaryKey`,
    createDataTypeName: `${modelName}CreateData`,
    updateDataTypeName: `${modelName}UpdateData`,
    findUniqueParamsTypeName: `${modelName}FindUniqueParams`,
    dbTypeName: `${modelName}ModelDb`,
    classGetterName: camelcase(tableName)
  };
};
