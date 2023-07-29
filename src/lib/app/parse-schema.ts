import { parseModel } from './parse-model.js';
import { parseView } from './parse-view.js';
import type { FetchedSchema, ParsedSchema } from './types.js';

export const parseSchema = (fetchedSchema: FetchedSchema): ParsedSchema => {
  return {
    databaseName: fetchedSchema.databaseName,
    fetchedSchema,
    fetched: new Date(fetchedSchema.fetched),
    models: fetchedSchema.tables.map((t) => parseModel(t)),
    views: fetchedSchema.views.map((v) => parseView(v))
  };
};
