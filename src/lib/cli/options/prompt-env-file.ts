import ora from 'ora';
import { fmtVarName } from '../utils/formatters.js';
import type { DatabaseUrl } from '../types.js';
import { prompt } from '../ui/prompt.js';
import { promptValidateRequiredString } from '../utils/prompt-validate-required-string.js';
import { validateEnvFile } from './validate-env-file.js';
export const promptEnvFile = async (
  currentValue: string,
  rcValue?: string
): Promise<DatabaseUrl> => {
  const envFile = await prompt<string>({
    type: 'text',
    name: 'envFile',
    initial: currentValue,
    message: fmtVarName('envFile'),
    validate: promptValidateRequiredString
  });
  const spinner = ora(`Validating ${fmtVarName('envFile')}`).start();

  try {
    const databaseUrl = await validateEnvFile(envFile);
    spinner.succeed();
    return databaseUrl;
  } catch (error) {
    spinner.fail((error as Error).message);
    return await promptEnvFile(envFile, rcValue);
  }
};
