import ora from 'ora';
import { fmtVarName } from '../ui/formatters.js';
import { prompt } from '../ui/prompt.js';
import { promptValidateRequiredString } from '../ui/prompt-validate-required-string.js';
import { validateDirectory } from './validate-directory.js';
import { promptDirectoryNotEmpty } from './prompt-directory-not-empty.js';
import type { DirectoryResult } from '$lib/fs/types.js';
export const promptDirectory = async (
  key: string,
  currentValue?: string,
  rcValue?: string
): Promise<DirectoryResult> => {
  const path = await prompt<string>({
    type: 'text',
    name: key,
    initial: currentValue || '',
    message: fmtVarName(key),
    validate: promptValidateRequiredString
  });
  const spinner = ora(`Validating ${fmtVarName(key)}`).start();

  try {
    const dir = await validateDirectory(path, key);
    
    spinner.succeed();
    if (dir.isEmpty === false && dir.relativePath !== rcValue) {
      const goAhead = await promptDirectoryNotEmpty(dir.relativePath); 
      return goAhead ? dir : promptDirectory(key, dir.relativePath, rcValue)
    }
    return dir;
  } catch (error) {
    spinner.fail((error as Error).message);
    return await promptDirectory(key, path);
  }
};
