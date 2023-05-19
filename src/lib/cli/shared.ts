import type { Connection } from '@planetscale/database';
import ora from 'ora';
import { fetchSchema as dbFetchSchema } from '../fetch/fetch-schema.js';
import type { FetchedSchema } from '$lib/fetch/types.js';
import colors from 'kleur';
import { onUserCancelled } from './ui/on-user-cancelled.js';
import type { ResolvedCliOptions } from './types.js';
import { generate } from '$lib/generate/generate.js';

import type { FsPaths } from '$lib/fs/types.js';
export const generateCode = async (
  schema: FetchedSchema,
  options: ResolvedCliOptions
): Promise<FsPaths[]> => {
  const spinner = ora('Generating code').start();
  const files = await generate(
    schema,
    options.typeImports,
    options.outputDirectory,
    options.compileJs
  );

  spinner.succeed('Code generated.');
  console.log();
  return files;
};

export const fetchSchema = async (
  connection: Connection
): Promise<FetchedSchema> => {
  const spinner = ora('Fetching schema').start();
  try {
    const schema = await dbFetchSchema(connection);
    spinner.succeed('Schema fetched.');
    return schema;
  } catch (error) {
    spinner.fail(
      colors.red('Database error: ') +
        (error instanceof Error ? error.message : 'Unknown')
    );
    return onUserCancelled();
  }
};
