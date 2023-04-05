import { join } from 'path';
import type { RcSettings, RcSettingsDbUrl } from './types.js';
import { parse } from 'dotenv';

import {
  RC_FILE_NAME,
  CURRENT_MIGRATION_FILE_NAME,
  CURRENT_SCHEMA_FILE_NAME,
  FORMATTED_DB_URL_EXAMPLE,
  ENV_DB_URL_KEYS
} from './constants.js';
import fs from 'fs-extra';
import { isCancel, log, select, text, confirm, spinner } from '@clack/prompts';
import { cancelAndExit, formatFilePath } from './utils.js';
import colors from 'picocolors';

type ReadRcSettings = {
  fileExists: boolean;
  settingsValid: boolean;
  settings?: Partial<RcSettings>;
};
export const initializeSettings = async () => {
  const rcFilePath = getRcFilePath()
  const rcFpFmted = formatFilePath(rcFilePath);
  const existing = await readRcVars();
  const existingSettings: Partial<RcSettings> = existing.settings || {};
  const { fileExists, settingsValid } = existing;
  if (fileExists && !settingsValid) {
    log.warn(`Some settings in ${rcFpFmted} are missing or invalid.`);
  }
  log.message(
    [
      colors.bold('Schema Directory') + ' ' + colors.dim('(schemaDirectory)'),
      colors.dim('A folder to contain:'),
      colors.dim(
        ` - The current schema fetched from the database (${colors.cyan(
          CURRENT_SCHEMA_FILE_NAME
        )}.)`
      ),
      colors.dim(
        ` - The currently pending migration SQL, if any (${colors.cyan(
          CURRENT_MIGRATION_FILE_NAME
        )}.)`
      ),
      colors.dim(' - Completed migrations.'),
      colors.dim(
        `Current value: ${existingSettings.schemaDirectory || '[not set]'}`
      )
    ].join('\n')
  );
  const schemaDirectory = await promptForPath(
    'Schema directory path:',
    existingSettings.schemaDirectory || 'db-schema'
  );
  log.message(
    [
      colors.bold('Generated Code Directory') +
        ' ' +
        colors.dim('(generatedCodeDirectory)'),
      colors.dim('The folder where you want generated code to be placed.'),
      colors.dim(
        `Current value: ${
          existingSettings.generatedCodeDirectory || '[not set]'
        }`
      )
    ].join('\n')
  );
  const generatedCodeDirectory = await promptForPath(
    'Generated code directory:',
    existingSettings.generatedCodeDirectory || ''
  );

  const dbUrlSettings = await promptForRcSettingsDbUrl(existingSettings);

  log.message(
    [
      colors.bold('Always Generate Code') +
        ' ' +
        colors.dim('(alwaysGenerateCode)'),
      colors.dim(
        `Whether code should be generated  after a migration or when the schema is fetched`
      ),
      colors.dim(`in addition to ${colors.magenta('frieda generate')}.`),
      colors.dim(
        `Current value: ${
          existingSettings.alwaysGenerateCode !== false ? 'true' : 'false'
        }`
      )
    ].join('\n')
  );
  const alwaysGenerateCode = await confirm({
    message: 'Always generate code?',
    initialValue: existingSettings.alwaysGenerateCode !== false
  });
  if (isCancel(alwaysGenerateCode)) {
    return cancelAndExit()
  }

  const rcSettings: RcSettings = {
    schemaDirectory,
    generatedCodeDirectory,
    alwaysGenerateCode,
    ...dbUrlSettings,
    externalTypeImports: existingSettings.externalTypeImports || []

  }
  const s = spinner();
  s.start(`Saving ${rcFpFmted}...`);
  await fs.writeJSON(rcFilePath, rcSettings, {spaces: 1});
  s.stop(`${rcFpFmted} saved.`)
};

const readRcVars = async (): Promise<ReadRcSettings> => {
  const rcPath = getRcFilePath();
  const exists = await fs.exists(rcPath);
  if (!exists) {
    return {
      fileExists: false,
      settingsValid: false
    };
  }
  let rawSettings: Partial<RcSettings>;
  try {
    rawSettings = await fs.readJSON(rcPath);
  } catch (error) {
    rawSettings = {};
  }
  return {
    fileExists: true,
    settingsValid:
      isValidFilePathInCwd(rawSettings.schemaDirectory) &&
      isValidFilePathInCwd(rawSettings.generatedCodeDirectory),
    settings: rawSettings
  };
};
const getRcFilePath = (): string => {
  return join(process.cwd(), RC_FILE_NAME);
};

type ReadDatabaseUrlResult = {
  valid: boolean;
  databaseUrlAlwaysAsk?: boolean;
  envFilePath?: string;
  envFileExists?: boolean;
  databaseUrlValid?: boolean;
  databaseUrl?: string;
  key?: string;
};

const readDatabaseUrl = async (
  settings: RcSettingsDbUrl
): Promise<ReadDatabaseUrlResult> => {
  const result: ReadDatabaseUrlResult = {
    valid: false
  };
  if (settings.databaseUrlAlwaysAsk) {
    result.databaseUrlAlwaysAsk = true;
    return result;
  }
  result.envFilePath = join(
    process.cwd(),
    typeof settings.databaseUrlEnvFile === 'string'
      ? settings.databaseUrlEnvFile
      : '.env'
  );
  result.envFileExists = await fs.exists(result.envFilePath);
  if (!result.envFileExists) {
    return result;
  }

  try {
    const fileContents = await fs.readFile(result.envFilePath, 'utf-8');
    const env = parse(fileContents);
    for (const key of ENV_DB_URL_KEYS) {
      if (isValidDatabaseURL(env[key])) {
        result.valid = true;
        result.databaseUrl = env[key].trim();
        result.key = key;
        return result;
      }
    }
    return result;
  } catch (error) {
    return result;
  }
};

const promptForPath = async (
  message: string,
  currentValue: unknown
): Promise<string> => {
  const value = await text({
    message,
    initialValue: isValidFilePathInCwd(currentValue)
      ? (currentValue as string)
      : '',
    placeholder: 'Relative path from the project root',
    validate: promptValidateFilePath
  });
  if (isCancel(value)) {
    return cancelAndExit();
  }
  return value as string;
};

const promptForRcSettingsDbUrl = async (
  settings: Partial<RcSettings>
): Promise<RcSettingsDbUrl> => {
  const fmtedKeys = ENV_DB_URL_KEYS.map((k) => colors.magenta(k)).join(' or ');
  log.message(
    [
      colors.bold('Env File'),
      colors.dim('Frieda connects to your database with a URL '),
      colors.dim('formatted as ') + FORMATTED_DB_URL_EXAMPLE + '. You ',
      colors.dim('can specify the URL in a .env file as '),
      fmtedKeys + colors.dim('.')
    ].join('\n')
  );

  const source = await select({
    message: `Database URL source:`,
    options: [
      {
        label: '.env (default)',
        value: 'default'
      },
      {
        label: 'Another file that can be read with dotenv',
        value: 'specified'
      },
      {
        label: 'Always ask',
        value: 'ask'
      }
    ],
    initialValue: settings.databaseUrlAlwaysAsk
      ? 'ask'
      : settings.databaseUrlEnvFile
      ? 'specified'
      : 'default'
  });
  if (isCancel(source)) {
    return cancelAndExit();
  }
  if (source === 'ask') {
    return { databaseUrlAlwaysAsk: true };
  }
  const dbUrlSettings: RcSettingsDbUrl = {};
  if (source === 'specified') {
    const databaseUrlEnvFile = await text({
      message: 'Path to file:',
      initialValue: settings.databaseUrlEnvFile || '',
      validate: (value) => {
        if (!isValidFilePathInCwd(value)) {
          return 'Path must resolve to a file in the current project root.';
        }
      }
    });
    if (isCancel(databaseUrlEnvFile)) {
      return cancelAndExit();
    }
    dbUrlSettings.databaseUrlEnvFile = databaseUrlEnvFile;
  }

  const urlResult = await readDatabaseUrl(dbUrlSettings);
  if (!urlResult.envFileExists) {
    log.warn(
      `Could not find ${formatFilePath(urlResult.envFilePath as string)}.`
    );
  } else if (!urlResult.valid) {
    log.warn(
      [
        `Could not find a valid database URL in ${formatFilePath(
          urlResult.envFilePath as string
        )}.`,
        `Make sure either ${fmtedKeys} exists as a valid database url.`
      ].join('\n')
    );
  } else {
    log.success(
      `Found database URL: ${maskDatabaseURLPassword(
        urlResult.databaseUrl as string
      )}`
    );
  }

  return dbUrlSettings;
};

const isValidFilePathInCwd = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  const fp = stripTrailingSlash(join(process.cwd(), value.trim()));
  return fp.startsWith(process.cwd()) && fp !== process.cwd();
};

const promptValidateFilePath = (value: unknown): string | undefined => {
  if (!isValidFilePathInCwd(value as string)) {
    return `Path must resolve to a directory in the current project root.`;
  }
};

const stripTrailingSlash = (p: string): string => {
  return p.replace(/\/$/, '');
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

const maskDatabaseURLPassword = (urlStr: string): string => {
  const url = new URL(urlStr);

  const protocol = url.protocol;
  url.protocol = 'http:';
  const { username, hostname } = url;
  url.password = '<PASSWORD>';
  return (
    colors.magenta(protocol + '//' + username + ':') +
    colors.dim('<password>') +
    colors.magenta('@' + hostname)
  );
};
