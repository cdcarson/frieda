import type { CommandModule } from 'yargs';
import {
  
  log,
  text,
  confirm,
  isCancel,
  select
} from '@clack/prompts';
import colors from 'picocolors';
import { fmtPath, fmtVarName, wait } from './utils.js';
import { FRIEDA_RC_FILE_NAME } from './constants.js';
import {
  checkDatabaseUrlConnection,
  getSettingHelpStr,
  settingsDescriptions,
  validateEnvFilePath,
  validateOutputDirectory
} from './settings.js';
import type {
  ValidateEnvFilePathResult,
  RcSettings,
  DirectoryResult
} from './types.js';
import { readFriedaRc, saveFriedaRc } from './file-system.js';
import { cancelAndExit } from './cli.js';



export const initCmd = async () => {
  let s = wait(`Reading current settings`);
  const { settings: rcSettings } = await readFriedaRc();
  s.done();
  const envFileResult = await promptEnvFile(rcSettings);
  const schemaDirectoryResult = await promptSchemaDirectory(rcSettings);
  const generatedCodeDirectoryResult = await promptGeneratedCodeDirectory(
    rcSettings
  );
  const jsonTypeImports = (rcSettings.jsonTypeImports || [])
    .filter((s) => typeof s === 'string')
    .filter((s) => s.length > 0);
  await promptJsonTypeImports(rcSettings);
  const typeBigIntAsString = await promptTypeBigIntAsString(rcSettings);
  const typeTinyIntOneAsBoolean = await promptTinyIntOneAsBoolean(rcSettings);

  s = wait(`Saving ${fmtPath(FRIEDA_RC_FILE_NAME)}`);
  await saveFriedaRc({
    envFilePath: envFileResult.envFilePath,
    schemaDirectory: schemaDirectoryResult.relativePath,
    generatedCodeDirectory: generatedCodeDirectoryResult.relativePath,
    jsonTypeImports,
    typeBigIntAsString,
    typeTinyIntOneAsBoolean
  });
  s.done();
  
};

export const promptEnvFile = async (
  rcSettings: Partial<RcSettings>
): Promise<ValidateEnvFilePathResult> => {
  let result: ValidateEnvFilePathResult | null = null;
  let promptedValue =
    typeof rcSettings.envFilePath === 'string'
      ? rcSettings.envFilePath
      : '.env';

  const prompt = async (initialValue: string): Promise<string> => {
    const envFile = await text({
      message: 'Enter environment variables file path:',
      initialValue,
      placeholder: 'Relative path from the project root',
      validate: (value) => {
        return value.trim().length === 0 ? 'Required.' : undefined;
      }
    });
    if (isCancel(envFile)) {
      return cancelAndExit();
    }
    return envFile;
  };
  log.message(getSettingHelpStr('envFilePath', rcSettings));

  while (result === null) {
    promptedValue = await prompt(promptedValue);
    let s = wait(`Finding database URL in ${fmtPath(promptedValue)}`);
    try {
      result = await validateEnvFilePath(promptedValue);
      s.done();
      s = wait('Checking database connection');
      try {
        await checkDatabaseUrlConnection(result.databaseUrl);
        s.done();
      } catch (error) {
        s.error();
        log.error((error as Error).message);
      }
    } catch (error) {
      s.error();
      log.error((error as Error).message);
    }
  }
  return result;
};

const promptSchemaDirectory = async (
  rcSettings: Partial<RcSettings>
): Promise<DirectoryResult> => {
  log.message(getSettingHelpStr('schemaDirectory', rcSettings));
  return await promptOutputDirectory(
    rcSettings,
    'schemaDirectory',
    'Enter schema directory path:'
  );
};

const promptGeneratedCodeDirectory = async (
  rcSettings: Partial<RcSettings>
): Promise<DirectoryResult> => {
  log.message(getSettingHelpStr('generatedCodeDirectory', rcSettings));
  return await promptOutputDirectory(
    rcSettings,
    'generatedCodeDirectory',
    'Enter generated code directory path:'
  );
};

const promptJsonTypeImports = async (rcSettings: Partial<RcSettings>) => {
  log.message(getSettingHelpStr('jsonTypeImports', rcSettings));
  await select({
    message: `${colors.bold('Note:')} Edit ${fmtVarName(
      'jsonTypeImports'
    )} by hand in ${fmtPath(FRIEDA_RC_FILE_NAME)}.`,
    options: [
      {
        label: 'Got it',
        value: true
      }
    ]
  });
};

export const promptTypeBigIntAsString = async (
  rcSettings: Partial<RcSettings>
): Promise<boolean> => {
  const desc = settingsDescriptions['typeBigIntAsString'];
  log.message(getSettingHelpStr('typeBigIntAsString', rcSettings));
  const value = await confirm({
    message: `${desc.header}?`,
    initialValue: rcSettings.typeBigIntAsString !== false
  });
  if (isCancel(value)) {
    return cancelAndExit();
  }
  return value;
};
export const promptTinyIntOneAsBoolean = async (
  rcSettings: Partial<RcSettings>
): Promise<boolean> => {
  const desc = settingsDescriptions['typeTinyIntOneAsBoolean'];
  log.message(getSettingHelpStr('typeTinyIntOneAsBoolean', rcSettings));
  const value = await confirm({
    message: `${desc.header}?`,
    initialValue: rcSettings.typeTinyIntOneAsBoolean !== false
  });
  if (isCancel(value)) {
    return cancelAndExit();
  }
  return value;
};

export const promptOutputDirectory = async (
  rcSettings: Partial<RcSettings>,
  key: keyof RcSettings,
  message: string
): Promise<DirectoryResult> => {
  let result: DirectoryResult | null = null;
  let promptedValue: string =
    typeof rcSettings[key] === 'string' ? (rcSettings[key] as string) : '';

  const prompt = async (initialValue: string): Promise<string> => {
    const outputDirPath = await text({
      message,
      initialValue,
      placeholder: 'Relative path from the project root',
      validate: (value) => {
        return value.trim().length === 0 ? 'Required.' : undefined;
      }
    });
    if (isCancel(outputDirPath)) {
      return cancelAndExit();
    }
    return outputDirPath;
  };

  while (result === null) {
    promptedValue = await prompt(promptedValue);
    console.log(promptedValue)
    let s = wait(`Checking directory path`);
    try {
      result = await validateOutputDirectory(promptedValue, key);
      s.done();
    } catch (error) {
      s.error();
      log.error((error as Error).message);
    }
  }
  if (result.exists && !result.isEmpty) {
    const goAhead = await confirm({
      message: `The directory ${fmtPath(
        result.relativePath
      )} is not empty. Continue?`
    });
    if (isCancel(goAhead)) {
      return cancelAndExit();
    }
    if (!goAhead) {
      return await promptOutputDirectory(rcSettings, key, message);
    }
  }
  return result;
};
