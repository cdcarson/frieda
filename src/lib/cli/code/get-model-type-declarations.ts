import {
  getFieldHasDefault,
  getFieldIsAlwaysGenerated,
  getFieldIsAutoIncrement,
  getFieldIsNullable,
  getFieldIsPrimaryKey,
  getFieldIsUnique,
  getFieldName,
  getFieldOptionalInModel,
  getFieldJavascriptType
} from '$lib/api/parsers/field-parsers.js';
import { getModelNames } from '$lib/api/parsers/get-model-names.js';
import type { TypeOptions, Table } from '$lib/index.js';

export const getModelTypeDeclarations = (
  table: Table,
  options: TypeOptions
): string => {
  const {
    modelName,
    modelOmittedBySelectAllTypeName,
    modelCreateDataTypeName,
    modelPrimaryKeyTypeName,
    modelUpdateDataTypeName,
    modelFindUniqueParamsTypeName,
    modelRepoTypeName
  } = getModelNames(table);

  const modelTypeDecl = `
    export type ${modelName} = {
      ${Object.values(table.columns)
        .map((column) => {
          const fieldName = getFieldName(column);
          const jsType = getFieldJavascriptType(column, options);
          const isNullable = getFieldIsNullable(column);
          const isFieldOptional = getFieldOptionalInModel(column);
          return `${fieldName}${isFieldOptional ? '?' : ''}: ${jsType}${
            isNullable ? '| null' : ''
          };`;
        })
        .join('\n')}
    }
  `;
  const modelOmittedBySelectAllTypeDecl = `
    export type ${modelOmittedBySelectAllTypeName} = [
      ${Object.values(table.columns)
        .filter((c) => getFieldOptionalInModel(c))
        .map((c) => `'${getFieldName(c)}'`)
        .join(',')}
    ]
  `;

  const modelPrimaryKeyTypeDecl = `
    export type ${modelPrimaryKeyTypeName} = {
      ${Object.values(table.columns)
        .filter((c) => getFieldIsPrimaryKey(c))
        .map((column) => {
          const fieldName = getFieldName(column);
          const jsType = getFieldJavascriptType(column, options);
          return `${fieldName}: ${jsType};`;
        })
        .join('\n')}
    }
  `;

  const modelCreateDataTypeDecl = `
    export type ${modelCreateDataTypeName} = {
      ${Object.values(table.columns)
        .filter((c) => !getFieldIsAlwaysGenerated(c))
        .map((column) => {
          const fieldName = getFieldName(column);
          const isNullable = getFieldIsNullable(column);
          const jsType = getFieldJavascriptType(column, options);
          const isOptional =
            getFieldHasDefault(column) || getFieldIsAutoIncrement(column);
          return `${fieldName}${isOptional ? '?' : ''}: ${jsType}${
            isNullable ? '| null' : ''
          };`;
        })
        .join('\n')}
    }
  `;

  const modelUpdateDataTypeDecl = `
      export type ${modelUpdateDataTypeName} = {
        ${Object.values(table.columns)
          .filter((c) => !getFieldIsAlwaysGenerated(c))
          .filter((c) => !getFieldIsPrimaryKey(c))
          .map((column) => {
            const fieldName = getFieldName(column);
            const isNullable = getFieldIsNullable(column);
            const jsType = getFieldJavascriptType(column, options);
            return `${fieldName}?: ${jsType}${isNullable ? '| null' : ''};`;
          })
          .join('\n')}
      }
  `;

  const modelFindUniqueParamsTypeDecl = `
      export type ${modelFindUniqueParamsTypeName} = ${[
    modelPrimaryKeyTypeName,
    ...Object.values(table.columns)
      .filter((column) => getFieldIsUnique(column))
      .map((column) => {
        const fieldName = getFieldName(column);
        const jsType = getFieldJavascriptType(column, options);
        return `{${fieldName}: ${jsType}}`;
      })
  ].join('|')}
  `;

  const modelRepoTypeDecl = `
    export type ${modelRepoTypeName} = ModelDb<${[
    modelName,
    modelOmittedBySelectAllTypeName,
    modelPrimaryKeyTypeName,
    modelCreateDataTypeName,
    modelUpdateDataTypeName,
    modelFindUniqueParamsTypeName
  ].join(',')}>
  `;

  return [
    modelTypeDecl,
    modelOmittedBySelectAllTypeDecl,
    modelPrimaryKeyTypeDecl,
    modelCreateDataTypeDecl,
    modelUpdateDataTypeDecl,
    modelFindUniqueParamsTypeDecl,
    modelRepoTypeDecl
  ].join('\n');
};
