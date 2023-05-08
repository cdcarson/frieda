import { getOptions } from '../options/get-options.js';
import type { CliArgs } from '../types.js';
type CmdOpts = CliArgs & {
  modelName: string;
};
export const cmd = async (cliArgs: Partial<CmdOpts>) => {
  const options = await getOptions(cliArgs);
  

  
  
  
  // console.log(model)
};
