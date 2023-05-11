import { fmtPath } from '../ui/formatters.js';
import { prompt } from '../ui/prompt.js';

export const promptDirectoryNotEmpty = async (
  path: string
): Promise<boolean> => {
  return await prompt({
    type: 'confirm',
    name: 'confirm',
    message: `The directory ${fmtPath(path)} is not empty. Continue?`
  });
};
