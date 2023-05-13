import ora from 'ora';
import { fmtVarName } from '../ui/formatters.js';
import type { DatabaseUrlResult } from '../types.js';
import { prompt } from '../ui/prompt.js';
import { promptValidateRequiredString } from '../ui/prompt-validate-required-string.js';
import { validateEnvFile } from './validate-env-file.js';
export const promptEnvFile = async (
  currentValue: string,
  rcValue?: string
): Promise<DatabaseUrlResult> => {
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
    spinner.succeed(`${fmtVarName('envFile')} valid.`);
    return databaseUrl;
  } catch (error) {
    spinner.fail((error as Error).message);
    return await promptEnvFile(envFile, rcValue);
  }
};
