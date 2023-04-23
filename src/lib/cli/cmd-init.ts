import type { CommandModule } from 'yargs';
import {
  intro,
  outro,
  log,
  text,
  confirm,
  isCancel,
  select
} from '@clack/prompts';
import colors from 'picocolors';
import { cancelAndExit, fmtPath, fmtVarName, wait } from './utils.js';
import { FRIEDA_RC_FILE_NAME } from './constants.js';
import { join } from 'path';
import fs from 'fs-extra';
import {
  checkDatabaseUrlConnection,
  getSettingHelpStr,
  readFriedaRc,
  saveFriedaRc,
  settingsDescriptions,
  validateEnvFilePath,
  validateOutputDirectory
} from './settings.js';
import type { ValidateEnvFilePathResult, RcSettings } from './types.js';

export const initCommandModule: CommandModule = {
  command: 'init',
  handler: async () => {
    await cmd();
  },
  aliases: ['i'],
  describe: '(Re)initialize basic settings.'
};

const cmd = async () => {
  intro(colors.bold(`Initialize (or re-initialize) basic settings.`));
  let s = wait(`Reading current settings`);
  const rcSettings = await readFriedaRc();
  s.done();
  const envFileResult = await promptEnvFile(rcSettings);
  const schemaDirectory = await promptSchemaDirectory(rcSettings);
  const generatedCodeDirectory = await promptGeneratedCodeDirectory(rcSettings);
  const jsonTypeImports = (rcSettings.jsonTypeImports || [])
    .filter((s) => typeof s === 'string')
    .filter((s) => s.length > 0);
  await promptJsonTypeImports(rcSettings);
  const typeBigIntAsString = await promptTypeBigIntAsString(rcSettings);
  const typeTinyIntOneAsBoolean = await promptTinyIntOneAsBoolean(rcSettings);

  s = wait(`Saving ${fmtPath(FRIEDA_RC_FILE_NAME)}`);
  await saveFriedaRc({
    envFilePath: envFileResult.envFilePath,
    schemaDirectory,
    generatedCodeDirectory,
    jsonTypeImports,
    typeBigIntAsString,
    typeTinyIntOneAsBoolean
  });
  s.done();
  outro(colors.bold('Frieda initialized.'));
};

const promptEnvFile = async (
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
): Promise<string> => {
  log.message(getSettingHelpStr('schemaDirectory', rcSettings));
  return await promptOutputDirectory(
    'schemaDirectory',
    rcSettings.schemaDirectory || '',
    rcSettings.schemaDirectory,
    'Enter schema directory path:'
  );
};

const promptGeneratedCodeDirectory = async (
  rcSettings: Partial<RcSettings>
): Promise<string> => {
  log.message(getSettingHelpStr('generatedCodeDirectory', rcSettings));
  return await promptOutputDirectory(
    'generatedCodeDirectory',
    rcSettings.generatedCodeDirectory || '',
    rcSettings.generatedCodeDirectory,
    'Enter generated code directory path:'
  );
};

const promptOutputDirectory = async (
  key: keyof RcSettings,
  initialValue: string,
  rcValue: string | undefined,
  message: string
): Promise<string> => {
  const path = await text({
    message,
    initialValue,
    placeholder: 'Relative path from the project root',
    validate: (value) => {
      try {
        validateOutputDirectory(value, key);
      } catch (error) {
        return (error as Error).message;
      }
    }
  });
  if (isCancel(path)) {
    return cancelAndExit();
  }
  if (path !== rcValue) {
    const p = join(process.cwd(), path);
    if (fs.existsSync(p) && fs.readdirSync(p).length > 0) {
      const goAhead = await confirm({
        message: `The directory ${fmtPath(path)} is not empty. Continue?`
      });
      if (isCancel(goAhead)) {
        return cancelAndExit();
      }
      if (!goAhead) {
        return await promptOutputDirectory(key, path, rcValue, message);
      }
    }
  }
  return path;
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

const promptTypeBigIntAsString = async (
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
const promptTinyIntOneAsBoolean = async (
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
