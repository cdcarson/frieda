import { fetchAndParseSchema } from './fetch-and-parse-schema.js';
import { generateCode } from './generate-code.js';
import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';
import { connect } from '@planetscale/database';
export const cmdGenerate = async (cliArgs: Partial<CliArgs>) => {
  const { options, databaseUrlResult } = await getOptions(cliArgs);
  const connection = connect({ url: databaseUrlResult.databaseUrl });
  const { schema } = await fetchAndParseSchema(connection, options);
  await generateCode(schema, options, databaseUrlResult);
};
