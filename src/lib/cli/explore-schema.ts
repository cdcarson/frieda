import type { FetchedSchema } from '$lib/fetch/types.js';
import { showSchema } from './show.js';
import type { GetOptionsResult } from './types.js';
import log from './ui/log.js';

export const exploreSchema = async (schema: FetchedSchema, optionsResult: GetOptionsResult): Promise<void> => {
  log.header(`⬇ Schema: ${schema.databaseName}`)
  showSchema(schema, optionsResult)
  log.header(`⬆ Schema: ${schema.databaseName}`)

};
