import { fetchSchema } from '$lib/fetch/fetch-schema.js';
import { generate } from '$lib/generate/generate.js';
import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';

export const cmdGenerate = async (cliArgs: Partial<CliArgs>) => {
  const { options, connection } = await getOptions(cliArgs);
  const schema = await fetchSchema(connection);
  await generate(schema, options, options.outputDirectory, options.compileJs);
  console.log();
};
