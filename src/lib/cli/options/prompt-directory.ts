import ora from 'ora';
import { fmtVarName } from '../utils/formatters.js';
import type { DirectoryResult } from '../types.js';
import { prompt } from '../ui/prompt.js';
import { promptValidateRequiredString } from '../utils/prompt-validate-required-string.js';
import { validateDirectory } from './validate-directory.js';
export const promptDirectory = async <
  K extends 'codeDirectory' | 'schemaDirectory'
>(
  key: K,
  currentValue: string
): Promise<DirectoryResult> => {
  const path = await prompt<string>({
    type: 'text',
    name: key,
    initial: currentValue,
    message: fmtVarName(key),
    validate: promptValidateRequiredString
  });
  const spinner = ora(`Validating ${fmtVarName(key)}`).start();

  try {
    const dir = await validateDirectory(path, key);
    spinner.succeed();
    return dir;
  } catch (error) {
    spinner.fail((error as Error).message);
    return await promptDirectory(key, path);
  }
};
