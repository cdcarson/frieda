import type { Table } from "../types.js";
import camelCase from 'camelcase'
export const getModelNames = (table: Table) => {
  const modelName = camelCase(table.name, {pascalCase: true});
  return {
    modelName,
    modelOmittedBySelectAllTypeName: `${modelName}OmittedBySelectAll`,
    modelPrimaryKeyTypeName: `${modelName}PrimaryKey`,
    modelCreateDataTypeName: `${modelName}CreateData`,
    modelUpdateDataTypeName: `${modelName}UpdateData`,
    modelFindUniqueParamsTypeName: `${modelName}FindUniqueParams`,
    modelRepoTypeName: `${modelName}ModelRepo`,
    classGetterName: camelCase(table.name),
    
  };
}