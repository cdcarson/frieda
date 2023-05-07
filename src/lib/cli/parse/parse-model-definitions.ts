import type { ModelDefinition } from '$lib/api/types.js';
import type { FetchedSchema, Options } from '../types.js';
import { parseModelDefinition } from './parse-model-definition.js';

export const parseModelDefinitions = (
  schema: FetchedSchema,
  options: Partial<Options>
): ModelDefinition[] => {
  return schema.tables.map((t) => parseModelDefinition(t, options));
};
