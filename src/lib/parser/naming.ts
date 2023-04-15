import _ from 'lodash';
const { camelCase, upperFirst } = _;
/**
 * The name of the generated js field type. Field names are camelCase.
 * @param c the database column name
 * @returns string
 */
export const getFieldName = (c: string): string => {
  return camelCase(c);
};

/**
 * The name of the generated js model type. Model names are PascalCase.
 * @param m the database table name
 * @returns string
 */
export const getModelName = (m: string): string => {
  return upperFirst(camelCase(m));
};

/**
 * The name of the js primary key type = <ModelName>PrimaryKey
 * @param m the model or the database table name
 * @returns string
 */
export const getModelPrimaryKeyTypeName = (m: string): string => {
  return getModelName(m) + 'PrimaryKey';
};

/**
 * The name of the generated js create data type = <ModelName>CreateData
 * @param m the model or the database table name
 * @returns string
 */
export const getModelCreateDataTypeName = (m: string): string => {
  return getModelName(m) + 'CreateData';
};

/**
 * The name of the generated js update data type = <ModelName>UpdateData
 * @param m the model or the database table name
 * @returns string
 */
export const getModelUpdateDataTypeName = (m: string): string => {
  return getModelName(m) + 'UpdateData';
};

/**
 * The name of the generated js find unique params type = <ModelName>FindUniqueParams
 * @param m the model or the database table name
 * @returns string
 */
export const getModelFindUniqueParamsTypeName = (m: string): string => {
  return getModelName(m) + 'FindUniqueParams';
};

/**
 * The name of the generated js find unique params type = <ModelName>Repo
 * @param m the model or the database table name
 * @returns string
 */
export const getModelRepoTypeName = (m: string): string => {
  return getModelName(m) + 'Repo';
};
