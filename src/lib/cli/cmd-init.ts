import { connect } from '@planetscale/database';
import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';
import { prompt } from './ui/prompt.js';
import { generateCode } from './generate-code.js';
import { fetchAndParseSchema } from './fetch-and-parse-schema.js';

export const cmdInit = async (cliArgs: Partial<CliArgs>) => {
  const { options, databaseUrlResult } = await getOptions(cliArgs, true);
  const code = await prompt({
    type: 'confirm',
    name: 'generateCode',
    message: 'Generate code',
    initial: true
  })
  if (code) {
    const connection = connect({ url: databaseUrlResult.databaseUrl });
    const { schema} = await fetchAndParseSchema(connection, options)
    await generateCode(schema, options, databaseUrlResult);
  }
};
