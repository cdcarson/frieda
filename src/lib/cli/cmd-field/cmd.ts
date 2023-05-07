import { getOptions } from '../options/get-options.js';
import type { CliArgs } from '../types.js';
export const cmd = async (cliArgs: Partial<CliArgs>) => {
  console.log('field');
  await getOptions(cliArgs);
};
