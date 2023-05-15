import { getOptions } from './options/get-options.js';
import { fetchSchema, generateCode } from './shared.js';
import type { CliArgs } from './types.js';
import { prompt } from './ui/prompt.js';

export const cmdInit = async (cliArgs: Partial<CliArgs>) => {
  const { connection, options } = await getOptions(cliArgs, true);
  console.log();
  const gen = await prompt({
    type: 'confirm',
    message: 'Generate code?',
    initial: true,
    name: 'gen'
  });
  if (gen) {
    console.log();
    const schema = await fetchSchema(connection);
    await generateCode(schema, options);
  }
  console.log();
};
