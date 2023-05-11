import { fetchSchema } from '$lib/fetch/fetch-schema.js';
import { parseSchema } from '$lib/parse/parse-schema.js';
import type { ExtendedSchema } from '$lib/parse/types.js';
import ora from 'ora';
import type { ResolvedCliOptions } from './types.js';
import type { Connection } from '@planetscale/database';

export const getSchema = async (
  options: ResolvedCliOptions,
  connection: Connection
): Promise< ExtendedSchema> => {
  const spinner = ora('Fetching schema').start();
  const fetched = await fetchSchema(connection);
  const schema = parseSchema(fetched, options);
  spinner.succeed('Schema fetched.');
  return schema;
};
