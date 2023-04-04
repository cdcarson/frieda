import { relative, join } from 'path';
import fs from 'fs-extra';
import type { FriedaRcVars, ResolvedFriedaVars } from './types.js';
import { isCancel, text, log, confirm, spinner, select } from '@clack/prompts';
import { cancelAndExit, formatFilePath } from './utils.js';
import { config } from 'dotenv';
import colors from 'picocolors';

const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'];

export const gatherVariables = async (forcePrompts = false): Promise<ResolvedFriedaVars> => {
  const originalRcVars = await readFriedaRcVars();
  const externalTypeImports: string[] = originalRcVars.externalTypeImports || []
  let { migrationsDirectory, generatedModelsDirectory } =
    originalRcVars;
  let promptSaveRc = false;
  if (!isValidFilePathInCwd(migrationsDirectory) || forcePrompts) {
    migrationsDirectory = await promptForDirectoryPath(
      'Migrations directory:',
      migrationsDirectory
    );
    promptSaveRc = true;
  }
  const migrationsDirectoryFullPath = stripTrailingSlash(
    join(process.cwd(), migrationsDirectory as string)
  );
  if (!isValidFilePathInCwd(generatedModelsDirectory) || forcePrompts) {
    generatedModelsDirectory = await promptForDirectoryPath(
      'Generated models directory:',
      generatedModelsDirectory
    );
    promptSaveRc = true;
  }
  const generatedModelsDirectoryFullPath = stripTrailingSlash(
    join(process.cwd(), generatedModelsDirectory as string)
  );
  if (promptSaveRc) {
    const save = await confirm({
      message: `Save these settings?`
    });
    if (isCancel(save)) {
      return cancelAndExit();
    }
    if (save === true) {
      const rcFilePath = getRcFilePath();
      const saveRcSpinner = spinner();
      saveRcSpinner.start(`Saving...`);
      const rcVarsToSave: FriedaRcVars = {
        generatedModelsDirectory: relative(
          process.cwd(),
          generatedModelsDirectoryFullPath
        ),
        migrationsDirectory: relative(
          process.cwd(),
          migrationsDirectoryFullPath
        ),
        externalTypeImports
      };
      await fs.writeJson(rcFilePath, rcVarsToSave);
      saveRcSpinner.stop(`Settings saved to ${formatFilePath(rcFilePath)}.`);
    }
  }

  let databaseUrlResult = readDatabaseUrl();
  if (!databaseUrlResult || forcePrompts) {
    databaseUrlResult = await promptForDatabaseUrl(databaseUrlResult ? databaseUrlResult.databaseUrl : '')
  }

  

  const vars = [
    colors.bold('Settings'),
    colors.dim('Migrations Directory: ') + formatFilePath(migrationsDirectoryFullPath),
    colors.dim('Generated Models Directory: ') + formatFilePath(generatedModelsDirectoryFullPath),
    colors.dim('External Imports:'),
    ...externalTypeImports.map(i => `- ${colors.red(i)}`),
    colors.dim('Database URL: ') + colors.magenta(maskDatabaseURLPassword(databaseUrlResult.databaseUrl)),
  ]
  log.info(vars.join('\n'))

  const varsConfirmed = await confirm({
    message: 'Settings look good?',
    active: 'Yes, continue',
    inactive: 'Re-enter settings...'
  })

  if (isCancel(varsConfirmed)) {
    return cancelAndExit();
  }

  if (!varsConfirmed) {
    return await gatherVariables(true)
  }
  return {
    generatedModelsDirectoryFullPath,
    migrationsDirectoryFullPath,
    externalTypeImports,
    databaseUrl: databaseUrlResult.databaseUrl
  }
  
};

const promptForDirectoryPath = async (
  message: string,
  currentValue: unknown
): Promise<string> => {
  const value = await text({
    message,
    initialValue: isValidFilePathInCwd(currentValue)
      ? (currentValue as string)
      : '',
    placeholder: 'Relative path from project root',
    validate: promptValidateFilePath
  });
  if (isCancel(value)) {
    return cancelAndExit();
  }
  return value as string;
};

const promptForDatabaseUrl = async (
  initialValue: string
): Promise<{ databaseUrl: string; key: string }> => {
  const databaseUrl = await text({
    message: 'Database URL:',
    placeholder: 'mysql://user:pass@host',
    initialValue,
    validate: (value) => {
      if (!isValidDatabaseURL(value)) {
        return 'Invalid URL.';
      }
    }
  });
  if (isCancel(databaseUrl)) {
    return cancelAndExit();
  }
  const keys = ENV_DB_URL_KEYS.map((k) => colors.magenta(k)).join(' or ');
  log.info(
    `You can skip this prompt in future by adding ${keys} to ${colors.cyan(
      '.env'
    )}.`
  );
  return { databaseUrl, key: 'prompt' };
};

const getRcFilePath = (): string => {
  return join(process.cwd(), '.friedarc');
};
const readFriedaRcVars = async (): Promise<FriedaRcVars> => {
  const rcPath = getRcFilePath();
  const exists = await fs.exists(rcPath);
  if (!exists) {
    return {};
  }
  try {
    return (await fs.readJson(rcPath)) as FriedaRcVars;
  } catch (error) {
    return {};
  }
};

const readDatabaseUrl =  (): {
  databaseUrl: string;
  key: string;
} | null => {
  const { parsed: env } = config();
  if (!env) {
    return null;
  }
  for (const key of ENV_DB_URL_KEYS) {
    if (isValidDatabaseURL(env[key])) {
      return { databaseUrl: env[key].trim(), key };
    }
  }
  return null;
};

export const isValidDatabaseURL = (url: unknown): boolean => {
  if (typeof url !== 'string') {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

const isValidFilePathInCwd = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  const fp = stripTrailingSlash(join(process.cwd(), value.trim()));
  return fp.startsWith(process.cwd()) && fp !== process.cwd();
};
const stripTrailingSlash = (p: string): string => {
  return p.replace(/\/$/, '');
};

const promptValidateFilePath = (value: unknown): string | undefined => {
  if (!isValidFilePathInCwd(value as string)) {
    return 'Path must resolve to a directory in the current project root.';
  }
};

const maskDatabaseURLPassword = (urlStr: string): string => {
  const url = new URL(urlStr);
  
  const protocol = url.protocol;
  url.protocol = 'http:';
  const {username, hostname} = url
  url.password = '<PASSWORD>';
  return colors.magenta(protocol + '//' + username + ':') + colors.dim('<password>') + colors.magenta('@' + hostname)
};



