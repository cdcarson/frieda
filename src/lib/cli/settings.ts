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
    externalTypeImports: [],
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

  if (!rcKeys.includes('externalTypeImports')) {
    fullSettings.externalTypeImports = [];
  } else if (
    !Array.isArray(rcSettings.externalTypeImports) ||
    rcSettings.externalTypeImports.filter((s) => typeof s === 'string')
      .length !== rcSettings.externalTypeImports.length
  ) {
    errors.push(
      `Invalid ${fmtVarName('externalTypeImports')} in ${fmtPath(
        FRIEDA_RC_FILE_NAME
      )}. It must be an array of strings.`
    );
  } else {
    fullSettings.externalTypeImports = rcSettings.externalTypeImports;
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
  let header = colors.bold(`Schema directory`);
  const varName = fmtVarName('schemaDirectory');

  log.message(
    `${header} (${varName})\nHelp: ${fmtPath(
      'https://github.com/nowzoo/frieda#schemadirectory'
    )}\nCurrent Value: ${fmtPath(schemaDirectory)}`
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
  let header = colors.bold(`Generated code directory`);
  const varName = fmtVarName('generatedCodeDirectory');

  log.message(
    `${header} (${varName})\nHelp: ${fmtPath(
      'https://github.com/nowzoo/frieda#generatedcodedirectory'
    )}\nCurrent Value: ${fmtPath(generatedCodeDirectory)}`
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
  const header = colors.bold(`Environment variables file`);
  const varName = fmtVarName('envFilePath');

  log.message(
    `${header} (${varName})\nHelp: ${fmtPath(
      'https://github.com/nowzoo/frieda#envfilepath'
    )}\nCurrent environment file: ${fmtPath(
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

export const validateExternalTypeImports = (
  value: string[] | undefined
): { externalTypeImports: string[]; error?: Error } => {
  const externalTypeImports: string[] = Array.isArray(value) ? [...value] : [];
  if (!Array.isArray(value)) {
    return {
      externalTypeImports,
      error: new Error(
        [
          `${fmtVarName('externalTypeImports')} in ${fmtPath(
            FRIEDA_RC_FILE_NAME
          )} must be an array.`
        ].join('\n')
      )
    };
  }
  for (const i of externalTypeImports) {
    if (typeof i !== 'string') {
      return {
        externalTypeImports,
        error: new Error(
          [
            `${fmtVarName('externalTypeImports')} in ${fmtPath(
              FRIEDA_RC_FILE_NAME
            )} must be an array of strings.`
          ].join('\n')
        )
      };
    }
  }
  return { externalTypeImports };
};

export const promptExternalTypeImports = async (
  rcSettings: Partial<RcSettings>
): Promise<string[]> => {
  const promptEdit = async (imps: string[]): Promise<string[]> => {
    const newImps = [...imps];
    for (let i = 0; i < newImps.length; i++) {
      const newImp = await text({
        message: `Edit import statement: (clear to delete)`,
        placeholder: `import type { Foo } from '../../api`,
        initialValue: newImps[i]
      });
      if (isCancel(newImp)) {
        return cancelAndExit();
      }
      newImps[i] = newImp;
    }
    return newImps
      .filter((s) => typeof s === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };
  const promptAdd = async (imps: string[]): Promise<string[]> => {
    const newImps = [...imps];
    const newImp = await text({
      message: `Add import statement: (leave blank to cancel)`,
      placeholder: `import type { Foo } from '../../api`,
      initialValue: ''
    });
    if (isCancel(newImp)) {
      return cancelAndExit();
    }
    newImps.push(newImp);
    return newImps
      .filter((s) => typeof s === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };
  const { externalTypeImports: unfiltered, error } =
    validateExternalTypeImports(rcSettings.externalTypeImports);

  let externalTypeImports = unfiltered
    .filter((s) => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  let header = colors.bold(`External type imports`);
  const varName = fmtVarName('externalTypeImports');

  log.message(
    `${header} (${varName})\nHelp: ${fmtPath(
      'https://github.com/nowzoo/frieda#externalTypeImports'
    )}\nCurrent value: \n${JSON.stringify(externalTypeImports, null, 1)}`
  );
  let action: 'edit' | 'add' | 'done' | null = null;
  while (action === null || action !== 'done') {
    if (action !== null) {
      log.message(
        [
          'External type imports:',
          JSON.stringify(externalTypeImports, null, 1)
        ].join('\n')
      );
    }
    const newAction = await select({
      message: `Add, edit or delete import statements?`,
      initialValue: 'done',
      options: [
        {
          label: 'Add',
          value: 'add'
        },
        {
          label: 'Edit/Delete',
          value: 'edit'
        },
        {
          label: action === null ? 'No, skip' : 'Done',
          value: 'done'
        }
      ]
    });
    if (isCancel(newAction)) {
      return cancelAndExit();
    }
    action = newAction as 'edit' | 'add' | 'done';
    switch (action) {
      case 'edit':
        externalTypeImports = await promptEdit(externalTypeImports);
        break;
      case 'add':
        externalTypeImports = await promptAdd(externalTypeImports);
        break;
    }
  }
  return externalTypeImports;
};
export type PromptTypeSettingsResult = {
  typeTinyIntOneAsBoolean: boolean;
  typeBigIntAsString: boolean;
};
export const promptTypeSettings = async (
  rcSettings: Partial<RcSettings>
): Promise<PromptTypeSettingsResult> => {
  log.message(
    `${typeTinyIntOneAsDesc}\n\nCurrent value: ${fmtValue(
      rcSettings.typeTinyIntOneAsBoolean !== false ? 'true' : 'false'
    )}`
  );

  const typeTinyIntOneAsBoolean = await confirm({
    message: `${typeTinyIntOneAsBooleanPrompt}?`,
    initialValue: rcSettings.typeTinyIntOneAsBoolean !== false
  });
  if (isCancel(typeTinyIntOneAsBoolean)) {
    return cancelAndExit();
  }

  log.message(
    `${typeBigIntAsStringDesc}\n\nCurrent value: ${fmtValue(
      rcSettings.typeBigIntAsString !== false ? 'true' : 'false'
    )}`
  );
  const typeBigIntAsString = await confirm({
    message: `${typeBigIntAsStringPrompt}?`,
    initialValue: rcSettings.typeBigIntAsString !== false
  });
  if (isCancel(typeBigIntAsString)) {
    return cancelAndExit();
  }

  return {
    typeBigIntAsString,
    typeTinyIntOneAsBoolean
  };
};
