import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';
export const cmdGenerate = async (cliArgs: Partial<CliArgs>) => {
  const { options, connection } = await getOptions(cliArgs);
};
