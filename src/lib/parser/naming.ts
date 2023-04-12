import { camelCase, upperFirst } from 'lodash';

/**
 * The name of the generated js field type. Field names are camelCase.
 * @param c the database column name
 * @returns string
 */
export const fieldName = (c: string): string => {
  return camelCase(c);
};

/**
 * The name of the generated js model type. Model names are PascalCase.
 * @param m the database table name
 * @returns string
 */
export const modelName = (m: string): string => {
  return upperFirst(camelCase(m));
};

/**
 * The name of the js primary key type = ModelNamePrimaryKey
 * @param m the model or the database table name
 * @returns string
 */
export const modelPrimaryKeyName = (m: string): string => {
  return modelName(m) + 'PrimaryKey';
};

/**
 * The name of the generated js create data type = ModelNameCreateData
 * @param m the model or the database table name
 * @returns string
 */
export const modelCreateDataName = (m: string): string => {
  return modelName(m) + 'CreateData';
};

/**
 * The name of the generated js update data type = ModelNameUpdateData
 * @param m the model or the database table name
 * @returns string
 */
export const modelUpdateDataName = (m: string): string => {
  return modelName(m) + 'UpdateData';
};

/**
 * The name of the generated js find unique params type = ModelNameFindUniqueParams
 * @param m the model or the database table name
 * @returns string
 */
export const modelFindUniqueParamsName = (m: string): string => {
  return modelName(m) + 'FindUniqueParams';
};
