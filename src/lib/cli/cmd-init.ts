import { generateCode } from './generate-code.js';
import { getSchema } from './get-schema.js';
import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';
import { prompt } from './ui/prompt.js';

export const cmdInit = async (cliArgs: Partial<CliArgs>) => {
  const {connection, options} = await getOptions(cliArgs, true);
  console.log();
  const gen = await prompt({
    type: 'confirm',
    message: 'Generate code?',
    initial: true,
    name: 'gen'
  });
  if (gen) {
    console.log();
    const schema = await getSchema(options, connection);
    await generateCode(options, schema)
    
  }
  console.log();
};
