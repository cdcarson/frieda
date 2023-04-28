
import { parse } from 'dotenv';
import { ENV_DB_URL_KEYS, FRIEDA_RC_FILE_NAME } from './constants.js';
import type {
  DirectoryResult,
  FullSettings,
  RcSettings,
  ValidateEnvFilePathResult
} from './types.js';
import {
  fmtPath,
  fmtVarName,
  squishWords,
  fmtValue
} from './utils.js';
import colors from 'picocolors';
import {
  getDirectoryResult,
  getFileResult,
  readFriedaRc
} from './file-system.js';
import { getServerlessConnection } from './database-connections.js';
import { RcNotFoundError, RcSettingsError } from './errors.js';

export type SettingDescription = {
  header: string;
  description: string;
};



export const VALID_DB_URL_FORMAT = `mysql://user:password@host`;
export const settingsDescriptions: {
  [K in keyof RcSettings]: SettingDescription;
} = {
  envFilePath: {
    header: `Environment variables file (database URL)`,
    description: `
        Relative path to an environment variables file containing either 
        ${ENV_DB_URL_KEYS.map((k) => fmtVarName(k)).join(' or ')}.
        The URL format must match: ${colors.cyan(VALID_DB_URL_FORMAT)}.`
  },
  schemaDirectory: {
    header: `Schema directory`,
    description: `
    Relative path to a directory where Frieda will save schema and
      migration data as SQL and JSON. It should be a dedicated folder, so
      Frieda won't overwrite any of your own work.
    `
  },
  generatedCodeDirectory: {
    header: `Generated code directory`,
    description: `
      Relative path to a directory where Frieda will generate typescript
      files. It should probably be in your source code directory, but as a
      a dedicated folder, so Frieda won't overwrite any of your own work.
    `
  },
  jsonTypeImports: {
    header: `JSON type imports`,
    description: `
      Optional. An array of import statements that correspond to the types
      assigned to json columns via the ${fmtValue(
        '@json(MyType)'
      )} column annotation.
    `
  },
  typeBigIntAsString: {
    header: `Type ${fmtValue('bigint')} columns as ${fmtValue('string')}`,
    description: `
    If ${fmtValue(
      'true'
    )} (default, recommended) Frieda types and casts ${fmtValue(
      'bigint'
    )} columns as ${fmtValue(
      'string'
    )}. This behavior can be overridden for individual columns.
    `
  },
  typeTinyIntOneAsBoolean: {
    header: `Type ${fmtValue('tinyint(1)')} columns as ${fmtValue('boolean')}`,
    description: `
    If ${fmtValue(
      'true'
    )} (default, recommended) Frieda types and casts ${fmtValue(
      'tinyint(1)'
    )} columns as ${fmtValue(
      'boolean'
    )}. This behavior can be overridden for individual columns.
    `
  }
} as const;

export const getSettingHelpStr = (
  key: keyof RcSettings,
  settings?: Partial<RcSettings>
): string => {
  const settingDesc = settingsDescriptions[key];
  const helpUrl = fmtPath(
    `https://github.com/nowzoo/frieda#${key.toLowerCase()}`
  );
  const lines = [
    `${colors.bold(settingDesc.header)} (${fmtVarName(
      'typeBigIntAsString'
    )} in ${fmtPath(FRIEDA_RC_FILE_NAME)})`,
    squishWords(settingDesc.description, 70),
    `More: ${helpUrl}`
  ];
  if (settings) {
    let valueStr: string | string[] = colors.gray('not set');
    switch (key) {
      case 'envFilePath':
        valueStr = fmtPath(settings.envFilePath || '.env');
        break;
      case 'generatedCodeDirectory':
      case 'schemaDirectory':
        valueStr =
          typeof settings[key] === 'string'
            ? fmtPath(settings[key] as string)
            : valueStr;
        break;
      case 'jsonTypeImports':
        valueStr = JSON.stringify(settings.jsonTypeImports || [], null, 1)
          .split('\n')
          .map((s) => fmtValue(s));
        break;
      case 'typeBigIntAsString':
      case 'typeTinyIntOneAsBoolean':
        valueStr = fmtValue(JSON.stringify(settings[key] !== false));
        break;
    }
    if (Array.isArray(valueStr)) {
      lines.push('', colors.italic(`Current ${fmtVarName(key)}:`));
      lines.push(...valueStr);
    } else {
      lines.push(
        '',
        `${colors.italic(`Current ${fmtVarName(key)}:`)} ${valueStr}`
      );
    }
  }
  return lines.join('\n');
};

export const validateEnvFilePath = async (
  envFilePath: string
): Promise<ValidateEnvFilePathResult> => {
  const fileResult = await getFileResult(envFilePath);
  if (!fileResult.exists) {
    throw new RcSettingsError(
      'envFilePath',
      `The file ${fmtPath(envFilePath)} does not exist.`
    );
  }
  if (!fileResult.isFile) {
    throw new RcSettingsError(
      'envFilePath',
      `The path ${fmtPath(envFilePath)} is not a file.`
    );
  }

  const env = parse(fileResult.contents || '');
  const envKeys = Object.keys(env);
  const foundKeys = ENV_DB_URL_KEYS.filter(
    (k) => envKeys.includes(k) && env[k].length > 0
  );
  const validResults: ValidateEnvFilePathResult[] = foundKeys
    .filter((k) => isValidDatabaseURL(env[k]))
    .map((k) => {
      return {
        databaseUrl: env[k],
        databaseUrlKey: k,
        envFilePath
      };
    });
  if (!validResults[0]) {
    if (foundKeys.length > 0) {
      throw new RcSettingsError(
        'envFilePath',
        `Could not find a valid URL in ${fmtPath(envFilePath)}. ${foundKeys
          .map((k) => `${fmtVarName(k)} is not a valid URL.`)
          .join(' ')}`
      );
    } else {
      throw new RcSettingsError(
        'envFilePath',
        `Could not find ${ENV_DB_URL_KEYS.map((k) => fmtVarName(k)).join(
          ' or '
        )} in ${fmtPath(envFilePath)}.`
      );
    }
  }
  return validResults[0];
};

export const checkDatabaseUrlConnection = async (
  databaseUrl: string
): Promise<string> => {
  try {
    const conn = getServerlessConnection(databaseUrl);
    await conn.execute('SELECT 1 as `foo`');
    return databaseUrl;
  } catch (error) {
    if (error instanceof Error) {
      throw new RcSettingsError(
        'envFilePath',
        `Could not connect with the URL ${maskDatabaseURLPassword(
          databaseUrl
        )}  The server said ${colors.gray(error.message)}`
      );
    }
    throw error;
  }
};

export const isValidDatabaseURL = (urlStr: unknown): boolean => {
  if (typeof urlStr !== 'string') {
    return false;
  }
  try {
    const url = new URL(urlStr);
    // won't work without this
    url.protocol = 'http:';
    const { username, hostname, password } = url;
    if (username.length === 0) {
      return false;
    }
    if (password.length === 0) {
      return false;
    }
    if (hostname.length === 0) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

export const maskDatabaseURLPassword = (urlStr: string): string => {
  if (!isValidDatabaseURL(urlStr)) {
    return '';
  }
  const url = new URL(urlStr);

  const protocol = url.protocol;
  url.protocol = 'http:';
  const { username, hostname } = url;
  url.password = '<PASSWORD>';
  return colors.cyan(
    `${protocol}//${username}:${colors.gray('<PASSWORD>')}@${hostname}`
  );
};

export const validateOutputDirectory = async (
  relativePath: unknown,
  key: keyof RcSettings
): Promise<DirectoryResult> => {
  if (typeof relativePath !== 'string' || relativePath.trim().length === 0) {
    throw new RcSettingsError(key, `Invalid directory path.`);
  }
  const dir = await getDirectoryResult(relativePath);
  if (!dir.isDirectory && dir.exists) {
    throw new RcSettingsError(key, `${dir.relativePath} is a file.`);
  }
  if (!dir.isUnderCwd) {
    throw new RcSettingsError(
      key,
      'The path must be a subdirectory of the current working directory.'
    );
  }
  return dir;
};






export const getSettings = async (): Promise<FullSettings> => {
  const { settings: rcSettings, file } = await readFriedaRc();
  if (!file.exists) {
    throw new RcNotFoundError(`Settings file not found.`);
  }

  const envFileResult = await validateEnvFilePath(
    rcSettings.envFilePath || '.env'
  );
  const schemaDirectoryResult = await validateOutputDirectory(
    rcSettings.schemaDirectory,
    'schemaDirectory'
  );
  const generatedCodeDirectoryResult = await validateOutputDirectory(
    rcSettings.generatedCodeDirectory,
    'generatedCodeDirectory'
  );
  const jsonTypeImports = (rcSettings.jsonTypeImports || [])
    .filter((s) => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    ...envFileResult,
    schemaDirectory: schemaDirectoryResult.relativePath,
    generatedCodeDirectory: generatedCodeDirectoryResult.relativePath,
    jsonTypeImports,
    typeBigIntAsString: rcSettings.typeBigIntAsString !== false,
    typeTinyIntOneAsBoolean: rcSettings.typeTinyIntOneAsBoolean !== false,
    connection: getServerlessConnection(envFileResult.databaseUrl)
  };
};
