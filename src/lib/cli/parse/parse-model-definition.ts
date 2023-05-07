import type { ModelDefinition } from '$lib/index.js';
import type { Options } from '../types.js';
import type { FetchedTable } from '../types.js';
import { parseFieldDefinition } from './parse-field-definition.js';
import _ from 'lodash';
export const parseModelDefinition = (
  table: FetchedTable,
  settings: Partial<Options>
): ModelDefinition => {
  const modelName = _.upperFirst(_.camelCase(table.name));
  const def: ModelDefinition = {
    modelName,
    tableName: table.name,
    modelPrimaryKeyTypeName: `${modelName}PrimaryKey`,
    modelCreateDataTypeName: `${modelName}CreateData`,
    modelUpdateDataTypeName: `${modelName}UpdateData`,
    modelFindUniqueParamsTypeName: `${modelName}FindUniqueParams`,
    modelRepoTypeName: `${modelName}ModelRepo`,
    classRepoName: _.camelCase(table.name),
    modelDefinitionConstName: _.camelCase(table.name) + 'ModelDefinition',
    fields: table.columns.map((col) => parseFieldDefinition(col, settings))
  };

  return def;
};
