import type { ModelDefinition } from '../../api/types.js';
import type { FetchedTable, Options } from '../types.js';
import { getModelNames } from './get-model-names.js';
import { parseField } from './parse-field.js';



export const parseModel = (
  table: FetchedTable,
  options: Options
): ModelDefinition => {
  const { modelName } = getModelNames(table.name);
  return {
    modelName,
    tableName: table.name,
    fields: table.columns.map((c) => parseField(c, options))
  };
};
