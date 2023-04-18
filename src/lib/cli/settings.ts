import type { RcSettings, FullSettings } from '$lib/types.js';
import {
  cancelAndExit,
  fmtPath,
  fmtValue,
  fmtVarName,
  formatFilePath,
  getServerlessConnection,
  isValidDatabaseURL,
  isValidFilePathInCwd,
  maskDatabaseURLPassword,
  prettify,
  promptValidateFilePath,
  squishWords,
  wait
} from './utils.js';
import fs from 'fs-extra';
import { join } from 'path';
import { FRIEDA_RC_FILE_NAME, ENV_DB_URL_KEYS } from './constants.js';
import {
  text,
  isCancel,
  log,
  select,
  confirm,
  multiselect
} from '@clack/prompts';
import colors from 'picocolors';
import { parse, type DotenvParseOutput } from 'dotenv';
import {
  typeBigIntAsStringDesc,
  typeBigIntAsStringPrompt,
  typeTinyIntOneAsBooleanPrompt,
  typeTinyIntOneAsDesc
} from './strings.js';

export const getSettings = async (): Promise<[FullSettings, string[]]> => {
  const fullSettings: FullSettings = {
    databaseUrl: '',
    databaseUrlKey: '',
    envFilePath: '',
    jsonTypeImports: [],
    generatedCodeDirectory: '',
    schemaDirectory: '',
    typeBigIntAsString: true,
    typeTinyIntOneAsBoolean: true
  };
  const errors: string[] = [];
  const { rcSettings } = await readFriedaRc();
  const rcKeys = Object.keys(rcSettings);
  if (typeof rcSettings.schemaDirectory !== 'string') {
    errors.push(
      `Missing ${fmtVarName('schemaDirectory')} in ${fmtPath(
        FRIEDA_RC_FILE_NAME
      )}.`
    );
  } else if (!isValidFilePathInCwd(rcSettings.schemaDirectory)) {
    errors.push(
      `Invalid ${fmtVarName('schemaDirectory')} in ${fmtPath(
        FRIEDA_RC_FILE_NAME
      )}. It must resolve to a path in the current working directory.`
    );
  } else {
    fullSettings.schemaDirectory = rcSettings.schemaDirectory;
  }

  if (typeof rcSettings.generatedCodeDirectory !== 'string') {
    errors.push(
      `Missing ${fmtVarName('generatedCodeDirectory')} in ${fmtPath(
        FRIEDA_RC_FILE_NAME
      )}.`
    );
  } else if (!isValidFilePathInCwd(rcSettings.generatedCodeDirectory)) {
    errors.push(
      `Invalid ${fmtVarName('generatedCodeDirectory')} in ${fmtPath(
        FRIEDA_RC_FILE_NAME
      )}. It must resolve to a path in the current working directory.`
    );
  } else {
    fullSettings.generatedCodeDirectory = rcSettings.generatedCodeDirectory;
  }

  fullSettings.envFilePath = rcSettings.envFilePath
    ? rcSettings.envFilePath
    : '.env';

  if (!isValidFilePathInCwd(fullSettings.envFilePath)) {
    errors.push(
      `Invalid ${fmtVarName('envFilePath')} in ${fmtPath(
        FRIEDA_RC_FILE_NAME
      )}. It must resolve to a path in the current working directory.`
    );
  } else {
    try {
      const result = await getDatabaseUrl(fullSettings.envFilePath);
      fullSettings.databaseUrl = result.databaseUrl;
      fullSettings.databaseUrlKey = result.databaseUrlKey;
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      } else {
        throw error;
      }
    }
  }

  if (!rcKeys.includes('jsonTypeImports')) {
    fullSettings.jsonTypeImports = [];
  } else if (
    !Array.isArray(rcSettings.jsonTypeImports) ||
    rcSettings.jsonTypeImports.filter((s) => typeof s === 'string').length !==
      rcSettings.jsonTypeImports.length
  ) {
    errors.push(
      `Invalid ${fmtVarName('jsonTypeImports')} in ${fmtPath(
        FRIEDA_RC_FILE_NAME
      )}. It must be an array of strings.`
    );
  } else {
    fullSettings.jsonTypeImports = rcSettings.jsonTypeImports;
  }
  if (!rcKeys.includes('typeBigIntAsString')) {
    fullSettings.typeBigIntAsString = true;
  } else if (typeof fullSettings.typeBigIntAsString !== 'boolean') {
    errors.push(
      `Invalid ${fmtVarName('typeBigIntAsString')} in ${fmtPath(
        FRIEDA_RC_FILE_NAME
      )}. It must be boolean.`
    );
  } else {
    fullSettings.typeBigIntAsString === rcSettings.typeBigIntAsString;
  }
  if (!rcKeys.includes('typeTinyIntOneAsBoolean')) {
    fullSettings.typeTinyIntOneAsBoolean = true;
  } else if (typeof fullSettings.typeTinyIntOneAsBoolean !== 'boolean') {
    errors.push(
      `Invalid ${fmtVarName('typeTinyIntOneAsBoolean')} in ${fmtPath(
        FRIEDA_RC_FILE_NAME
      )}. It must be boolean.`
    );
  } else {
    fullSettings.typeTinyIntOneAsBoolean === rcSettings.typeTinyIntOneAsBoolean;
  }
  return [fullSettings, errors];
};

export const getDatabaseUrl = async (
  envFilePath: string
): Promise<{
  databaseUrl: string;
  databaseUrlKey: string;
  envFilePath: string;
}> => {
  const validFormat = colors.gray(
    `mysql://${colors.magenta('user')}:${colors.magenta(
      'password'
    )}@${colors.magenta('host')}`
  );
  const fmtedKeys = ENV_DB_URL_KEYS.map((s) => fmtVarName(s)).join(' or ');
  const p = join(process.cwd(), envFilePath);
  const exists = await fs.exists(p);
  if (!exists) {
    throw new Error(
      [
        `The environment file at ${fmtPath(envFilePath)} does not exist.`,
        `Make sure it exists and contains either ${fmtedKeys} as a valid database URL.`,
        `URL format: ${validFormat}`
      ].join('\n')
    );
  }
  const env = parse(await fs.readFile(p));
  for (const databaseUrlKey of ENV_DB_URL_KEYS) {
    if (typeof env[databaseUrlKey] === 'string') {
      if (!isValidDatabaseURL(env[databaseUrlKey])) {
        throw new Error(
          [
            `The variable ${fmtVarName(databaseUrlKey)} in ${fmtPath(
              envFilePath
            )} is not a valid database URL.`,
            `URL format: ${validFormat}`
          ].join('\n')
        );
      }
      try {
        const conn = getServerlessConnection(env[databaseUrlKey]);
        await conn.execute('SELECT 1 as `foo`');
        return {
          databaseUrl: env[databaseUrlKey],
          databaseUrlKey,
          envFilePath
        };
      } catch (error) {
        throw new Error(
          [
            `Could not connect with the URL ${maskDatabaseURLPassword(
              env[databaseUrlKey]
            )}`,
            `(${fmtVarName(databaseUrlKey)} in ${fmtPath(envFilePath)}.)`,
            error instanceof Error
              ? `The server said: ${colors.red(error.message)}`
              : 'An unknown error occurred.'
          ].join('\n')
        );
      }
    }
  }
  throw new Error(
    [
      `Could not find either ${fmtedKeys} in ${fmtPath(envFilePath)}.`,
      `Make sure one of those keys exists and is a valid URL.`,
      `URL format: ${validFormat}`
    ].join('\n')
  );
};

const getRcFullPath = () => {
  return join(process.cwd(), FRIEDA_RC_FILE_NAME);
};

export const readFriedaRc = async (): Promise<{
  rcSettings: Partial<RcSettings>;
  friedaRcExists: boolean;
}> => {
  const p = getRcFullPath();
  let rcSettings: Partial<RcSettings> = {};
  const friedaRcExists = await fs.exists(p);
  if (!friedaRcExists) {
    return { friedaRcExists, rcSettings };
  }
  try {
    rcSettings = await fs.readJSON(p);
  } catch (error) {
    // ignore
  }
  return { friedaRcExists: friedaRcExists, rcSettings };
};

export const writeFriedaRc = async (settings: RcSettings): Promise<void> => {
  const p = getRcFullPath();
  await fs.writeFile(p, await prettify(JSON.stringify(settings), p));
};

export const validateDirectory = (
  value: string | undefined,
  key: string
): { d: string; error?: Error } => {
  const d = typeof value === 'string' ? value.trim() : '';
  if (typeof value !== 'string') {
    return {
      d,
      error: new Error(
        `Missing ${fmtVarName(key)} in ${fmtPath(FRIEDA_RC_FILE_NAME)}.`
      )
    };
  }
  if (!isValidFilePathInCwd(d)) {
    return {
      d,
      error: new Error(
        [
          `Invalid ${fmtVarName(key)} in ${fmtPath(FRIEDA_RC_FILE_NAME)}.`,
          `It must resolve to a path in the current working directory.`
        ].join('\n')
      )
    };
  }
  if (!isDirOrNonExistent(d)) {
    return {
      d,
      error: new Error(
        [
          `Invalid ${fmtVarName(key)} in ${fmtPath(FRIEDA_RC_FILE_NAME)}.`,
          `The path is a file, not a directory.`
        ].join('\n')
      )
    };
  }
  return { d };
};

export type ValidateDatabaseResult = {
  databaseUrl: string;
  databaseUrlKey: string;
  envFilePath: string;
  error?: Error;
};
export const VALID_DB_URL_FORMAT = colors.gray(
  `mysql://${colors.magenta('user')}:${colors.magenta(
    'password'
  )}@${colors.magenta('host')}`
);
export const validateDatabaseUrl = async (
  envFilePath: string
): Promise<ValidateDatabaseResult> => {
  const result: ValidateDatabaseResult = {
    databaseUrl: '',
    databaseUrlKey: '',
    envFilePath
  };

  const fmtedKeys = ENV_DB_URL_KEYS.map((s) => fmtVarName(s)).join(' or ');
  const p = join(process.cwd(), envFilePath);
  const exists = await fs.exists(p);
  if (!exists) {
    return {
      ...result,
      error: new Error(
        [
          `The environment file at ${fmtPath(envFilePath)} does not exist.`,
          `Make sure it exists and contains either ${fmtedKeys} as a valid database URL.`,
          `URL format: ${VALID_DB_URL_FORMAT}`
        ].join('\n')
      )
    };
  }
  const env = parse(await fs.readFile(p));
  for (const databaseUrlKey of ENV_DB_URL_KEYS) {
    if (typeof env[databaseUrlKey] === 'string') {
      if (!isValidDatabaseURL(env[databaseUrlKey])) {
        return {
          ...result,
          error: new Error(
            [
              `The variable ${fmtVarName(databaseUrlKey)} in ${fmtPath(
                envFilePath
              )} is not a valid database URL.`,
              `URL format: ${VALID_DB_URL_FORMAT}`
            ].join('\n')
          )
        };
      }
      try {
        const conn = getServerlessConnection(env[databaseUrlKey]);
        await conn.execute('SELECT 1 as `foo`');
        return {
          databaseUrl: env[databaseUrlKey],
          databaseUrlKey,
          envFilePath
        };
      } catch (error) {
        return {
          ...result,
          error: new Error(
            [
              `Could not connect with the URL ${maskDatabaseURLPassword(
                env[databaseUrlKey]
              )}`,
              `(${fmtVarName(databaseUrlKey)} in ${fmtPath(envFilePath)}.)`,
              error instanceof Error
                ? `The server said: ${colors.red(error.message)}`
                : 'An unknown error occurred.'
            ].join('\n')
          )
        };
      }
    }
  }
  return {
    ...result,
    error: new Error(
      [
        `Could not find either ${fmtedKeys} in ${fmtPath(envFilePath)}.`,
        `Make sure one of those keys exists and is a valid URL.`,
        `URL format: ${VALID_DB_URL_FORMAT}`
      ].join('\n')
    )
  };
};

export const promptSchemaDirectory = async (
  rcSettings: Partial<RcSettings>
): Promise<string> => {
  const { d: schemaDirectory, error } = validateDirectory(
    rcSettings.schemaDirectory,
    'schemaDirectory'
  );
  const header = colors.bold(fmtVarName('schemaDirectory'));
  const shortHelp = squishWords(`
  The relative path to a folder where Frieda will store schema and migration files. More help:
  `);
  const helpLink = fmtPath('https://github.com/nowzoo/frieda#schemadirectory');
  log.message(
    `${header}\n${shortHelp}\n${helpLink}\n\nCurrent path: ${fmtPath(
      schemaDirectory
    )}`
  );

  if (!error) {
    const change = await confirm({
      message: `Change schema directory?`,
      initialValue: false
    });
    if (isCancel(change)) {
      return cancelAndExit();
    }
    if (!change) {
      return schemaDirectory;
    }
  }
  return await promptDirPath('Enter schema directory:', schemaDirectory);
};

export const promptGeneratedCodeDirectory = async (
  rcSettings: Partial<RcSettings>
): Promise<string> => {
  const { d: generatedCodeDirectory, error } = validateDirectory(
    rcSettings.generatedCodeDirectory,
    'generatedCodeDirectory'
  );
  const header = colors.bold(fmtVarName('generatedCodeDirectory'));
  const shortHelp = squishWords(`
  The relative path to a folder where Frieda will generate typescript code. More help:
  `);
  const helpLink = fmtPath(
    'https://github.com/nowzoo/frieda#generatedcodedirectory'
  );
  log.message(
    `${header}\n${shortHelp}\n${helpLink}\n\nCurrent path: ${fmtPath(
      generatedCodeDirectory
    )}`
  );

  if (!error) {
    const change = await confirm({
      message: `Change generated code directory?`,
      initialValue: false
    });
    if (isCancel(change)) {
      return cancelAndExit();
    }
    if (!change) {
      return generatedCodeDirectory;
    }
  }
  return await promptDirPath(
    'Enter generated code directory:',
    generatedCodeDirectory
  );
};

export const promptDatabaseUrl = async (
  result: ValidateDatabaseResult
): Promise<ValidateDatabaseResult> => {
  const prompt = async (
    envFilePath: string
  ): Promise<ValidateDatabaseResult> => {
    const value = await promptFilePath(
      `Enter environment file path:`,
      envFilePath
    );
    const s = wait('Checking database URL');
    const newResult = await validateDatabaseUrl(value);

    if (newResult.error) {
      s.error();
      log.error(newResult.error.message);
      return await prompt(value);
    }
    s.done();
    return newResult;
  };
  const header = colors.bold(`${fmtVarName('envFilePath')} (database URL)`);
  const shortHelp = squishWords(`
    The relative path to an environment variables file (e.g. ${fmtPath(
      '.env'
    )}) where the database URL can be found as either
    ${ENV_DB_URL_KEYS.map((k) => fmtVarName(k)).join(' or ')}. More help:
  `);
  const helpLink = fmtPath(
    'https://github.com/nowzoo/frieda#envfilepath-database-url'
  );
  log.message(
    `${header}\n${shortHelp}\n${helpLink}\n\nCurrent environment file: ${fmtPath(
      result.envFilePath
    )}\nDatabase URL variable: ${fmtVarName(
      result.databaseUrlKey
    )}\nDatabase URL: ${maskDatabaseURLPassword(result.databaseUrl)}`
  );

  if (!result.error) {
    const change = await confirm({
      message: `Change environment file?`,
      initialValue: false
    });
    if (isCancel(change)) {
      return cancelAndExit();
    }
    if (!change) {
      return result;
    }
  }
  return prompt(result.envFilePath);
};

export const isDirOrNonExistent = (relPath: string): boolean => {
  const p = join(process.cwd(), relPath);
  if (!fs.existsSync(p)) {
    return true;
  }
  const x = fs.statSync(p);
  return x.isDirectory();
};

export const isEmptyDirOrNonExistent = (relPath: string): boolean => {
  const p = join(process.cwd(), relPath);
  if (!fs.existsSync(p)) {
    return true;
  }
  const x = fs.statSync(p);
  if (!x.isDirectory()) {
    return false;
  }
  return fs.readdirSync(p).length === 0;
};

const promptDirPath = async (
  prompt: string,
  initialValue: string
): Promise<string> => {
  const value = await text({
    message: prompt,
    placeholder: 'Relative path from the project root',
    initialValue,
    validate: (s) => {
      const inCwdErr = promptValidateFilePath(s);
      if (inCwdErr) {
        return inCwdErr;
      }
      if (!isDirOrNonExistent(s)) {
        return 'That path appears to be a file.';
      }
    }
  });
  if (isCancel(value)) {
    return cancelAndExit();
  }
  if (!isEmptyDirOrNonExistent(value)) {
    const okWithIt = await confirm({
      message: `The directory ${fmtPath(value)} isn't empty. Continue?`,
      initialValue: false
    });
    if (isCancel(okWithIt)) {
      return cancelAndExit();
    }
    if (!okWithIt) {
      return await promptDirPath(prompt, '');
    }
  }
  return value;
};

const promptFilePath = async (
  prompt: string,
  initialValue: string
): Promise<string> => {
  const value = await text({
    message: prompt,
    placeholder: 'Relative path from the project root',
    initialValue,
    validate: (s) => {
      const inCwdErr = promptValidateFilePath(s);
      if (inCwdErr) {
        return inCwdErr;
      }
      const p = join(process.cwd(), s);
      if (!fs.existsSync(p)) {
        return 'File does not exist.';
      }
      if (!fs.statSync(p).isFile()) {
        return 'That path is not a file.';
      }
    }
  });
  if (isCancel(value)) {
    return cancelAndExit();
  }

  return value;
};

export const validateJsonTypeImports = (
  value: string[] | undefined
): { jsonTypeImports: string[]; error?: Error } => {
  const jsonTypeImports: string[] = Array.isArray(value) ? [...value] : [];
  if (!Array.isArray(value)) {
    return {
      jsonTypeImports,
      error: new Error(
        [
          `${fmtVarName('jsonTypeImports')} in ${fmtPath(
            FRIEDA_RC_FILE_NAME
          )} must be an array.`
        ].join('\n')
      )
    };
  }
  for (const i of jsonTypeImports) {
    if (typeof i !== 'string') {
      return {
        jsonTypeImports,
        error: new Error(
          [
            `${fmtVarName('jsonTypeImports')} in ${fmtPath(
              FRIEDA_RC_FILE_NAME
            )} must be an array of strings.`
          ].join('\n')
        )
      };
    }
  }
  return { jsonTypeImports };
};

export const promptJsonTypeImportsSimple = async (
  rcSettings: Partial<RcSettings>
): Promise<string[]> => {
  const { jsonTypeImports: unfiltered, error } = validateJsonTypeImports(
    rcSettings.jsonTypeImports
  );

  let jsonTypeImports = unfiltered
    .filter((s) => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const varName = colors.bold(fmtVarName('jsonTypeImports'));

  const shortHelp = squishWords(`
    An  array of import statements that correspond to the types you have assigned to ${fmtValue(
      'json'
    )} columns. More help:
  `);
  const helpLink = fmtPath(`https://github.com/nowzoo/frieda#jsonTypeImports`);

  log.message(
    `${varName}\n${shortHelp}\n${helpLink}\n\nCurrent value: \n${fmtValue(
      JSON.stringify(jsonTypeImports, null, 1)
    )}`
  );
  const ok = await select({
    message: `You need to edit this array by hand in ${fmtPath(
      FRIEDA_RC_FILE_NAME
    )}.`,
    options: [{ label: 'Got it', value: true }]
  });
  if (isCancel(ok)) {
    return cancelAndExit();
  }

  return jsonTypeImports;
};

export const promptTypeTinyIntOneAsBoolean = async (
  rcSettings: Partial<RcSettings>
): Promise<boolean> => {
  const header = colors.bold(`${fmtVarName('typeTinyIntOneAsBoolean')}`);
  const shortHelp = squishWords(`
  If ${fmtValue(
    'true'
  )} (default) Frieda will type fields with the column type ${fmtValue(
    'tinyint(1)'
  )} as javascript ${fmtValue('boolean')}. 
  More help:
  `);
  const helpLink = fmtPath(
    'https://github.com/nowzoo/frieda#typeTinyIntOneAsBoolean'
  );
  log.message(
    `${header}\n${shortHelp}\n${helpLink}\n\nCurrent value: ${fmtValue(
      rcSettings.typeTinyIntOneAsBoolean !== false ? 'true' : 'false'
    )}`
  );

  const typeTinyIntOneAsBoolean = await confirm({
    message: `Type ${fmtValue('tinyint(1)')} as ${fmtValue('boolean')}?`,
    initialValue: rcSettings.typeTinyIntOneAsBoolean !== false
  });
  if (isCancel(typeTinyIntOneAsBoolean)) {
    return cancelAndExit();
  }
  return typeTinyIntOneAsBoolean;
};

export const promptTypeBigIntAsString = async (
  rcSettings: Partial<RcSettings>
): Promise<boolean> => {
  const header = colors.bold(`${fmtVarName('typeBigIntAsString')}`);
  const shortHelp = squishWords(`
  If ${fmtValue(
    'true'
  )} (default, recommended) Frieda will type fields with the column type ${fmtValue(
    'bigint'
  )} as javascript ${fmtValue(
    'string'
  )}. You can opt out of this behavior for individual fields.
  More help:
  `);
  const helpLink = fmtPath(
    'https://github.com/nowzoo/frieda#typeBigIntAsString'
  );
  log.message(
    `${header}\n${shortHelp}\n${helpLink}\n\nCurrent value: ${fmtValue(
      rcSettings.typeBigIntAsString !== false ? 'true' : 'false'
    )}`
  );

  const typeBigIntAsString = await confirm({
    message: `Type ${fmtValue('bigint')} as ${fmtValue('string')}?`,
    initialValue: rcSettings.typeBigIntAsString !== false
  });
  if (isCancel(typeBigIntAsString)) {
    return cancelAndExit();
  }
  return typeBigIntAsString;
};
