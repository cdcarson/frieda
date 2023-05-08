import camelCase from 'camelcase'
export const getModelNames = (tableName: string) => {
  const modelName = camelCase(tableName, {pascalCase: true});
  return {
    modelName,
    modelOmittedBySelectAllTypeName: `${modelName}OmittedBySelectAll`,
    modelPrimaryKeyTypeName: `${modelName}PrimaryKey`,
    modelCreateDataTypeName: `${modelName}CreateData`,
    modelUpdateDataTypeName: `${modelName}UpdateData`,
    modelFindUniqueParamsTypeName: `${modelName}FindUniqueParams`,
    modelDbTypeName: `${modelName}ModelDb`,
    classGetterName: camelCase(tableName),
    
  };
}