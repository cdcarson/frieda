import { generateCode } from './generate-code.js';
import { getSchema } from './get-schema.js';
import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';
export const cmdGenerate = async (cliArgs: Partial<CliArgs>) => {
  const { options, connection } = await getOptions(cliArgs);
  const schema = await getSchema(options, connection);
  await generateCode(options, schema)
};
