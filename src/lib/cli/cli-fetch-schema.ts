import type { FetchedSchema } from '../fetch/types.js';
import kleur from 'kleur';
import { fetchSchema } from '../fetch/fetch-schema.js';
import type { Connection } from '@planetscale/database';
import ora from 'ora';
import { onUserCancelled } from './ui/on-user-cancelled.js';

export const cliFetchSchema = async (
  connection: Connection
): Promise<FetchedSchema> => {
  const spin = ora('Fetching schema').start();
  try {
    const schema = await fetchSchema(connection);
    spin.succeed('Schema fetched.');
    return schema;
  } catch (error) {
    spin.fail(
      kleur.red('Database error: ') +
        (error instanceof Error ? error.message : 'Unknown')
    );
    return onUserCancelled();
  }
};
