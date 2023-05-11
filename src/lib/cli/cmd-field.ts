import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';
export const cmdField = async (cliArgs: Partial<CliArgs>) => {
  const options = await getOptions(cliArgs);
};
