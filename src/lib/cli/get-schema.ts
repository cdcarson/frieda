import { fetchSchema } from '$lib/fetch/fetch-schema.js';
import { parseSchema } from '$lib/parse/parse-schema.js';
import type { ExtendedSchema } from '$lib/parse/types.js';
import ora from 'ora';
import type { ResolvedCliOptions } from './types.js';
import type { Connection } from '@planetscale/database';
import log from './ui/log.js';
import { onUserCancelled } from './ui/on-user-cancelled.js';
import kleur from 'kleur';

export const getSchema = async (
  options: ResolvedCliOptions,
  connection: Connection
): Promise<ExtendedSchema> => {
  const spinner = ora('Fetching schema').start();
  try {
    const fetched = await fetchSchema(connection);
    const schema = parseSchema(fetched, options);
    spinner.succeed('Schema fetched.');
    return schema;
  } catch (error) {
    spinner.fail(
      kleur.red('Error fetcthing schema. Fetch said: ') +
        (error instanceof Error ? error.message : 'Unknown error')
    );
    return onUserCancelled();
  }
};
