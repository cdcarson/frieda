
import { getModelName } from '$lib/parse/model-parsers.js';
import type { FetchedSchema, FetchedTable } from '$lib/fetch/types.js';
import { promptModel } from './prompt-model.js';
import { showModel } from './show.js';

export const cmdModel = async (
  schema: FetchedSchema,
  positionalArgs: string[]
) => {
  
  const [modelName] = positionalArgs;
  let table: FetchedTable
  const s = (modelName || '').trim().toLowerCase();
  const matches = schema.tables.filter((t) => {
    return (
      t.name.toLowerCase().startsWith(s) ||
      getModelName(t).toLowerCase().startsWith(s)
    );
  });
  if (matches.length === 1) {
    table = matches[0]
  } else {
    table = await promptModel(schema, modelName)
  }
  showModel(table);
};
