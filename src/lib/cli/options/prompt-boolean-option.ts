import { fmtVarName } from '../ui/formatters.js';
import { prompt } from '../ui/prompt.js';

export const promptBooleanOption = async (
  key: string,
  currentValue: boolean
): Promise<boolean> => {
  return await prompt<boolean>({
    type: 'confirm',
    name: key,
    initial: currentValue,
    message: fmtVarName(key),
    instructions: 'hello'
  });
};
