import kleur from 'kleur';
import {
  ENV_DB_URL_KEYS,
  FRIEDA_RC_FILE_NAME,
  OPTION_DESCRIPTIONS
} from './constants.js';
import type { DatabaseDetails, GetOptionsResult, Options } from './types.js';
import { fmtPath, fmtVal, fmtVarName, squishWords } from './ui/formatters.js';
import log from './ui/log.js';
import { prompt } from './ui/prompt.js';
import { getFile } from '$lib/fs/get-file.js';
import { parse } from 'dotenv';
import type { DirectoryResult, FileResult } from '$lib/fs/types.js';
import { getDirectory } from '$lib/fs/get-directory.js';
import { isPlainObject } from '$lib/utils/is-plain-object.js';
import ora from 'ora';
import { prettifyAndSaveFile } from '$lib/fs/prettify-and-save-file.js';
import { connect } from '@planetscale/database';

type MergedOptions = {
  databaseUrlResult?: DatabaseDetails;
  outputDirectoryResult?: DirectoryResult;
  schemaDirectoryResult?: DirectoryResult;
  envFileError?: Error;
  outputDirectoryError?: Error;
  schemaDirectoryError?: Error;
  current: Partial<Options>;
  rc: Partial<Options>;
};

export const getOptions = async (
  cliArgs: Partial<Options>,
  promptAlways = false
): Promise<GetOptionsResult> => {
  const merged = await getMergedOptions(cliArgs);
  let { databaseUrlResult, outputDirectoryResult, schemaDirectoryResult } = merged;
  if (promptAlways || !databaseUrlResult || merged.envFileError) {
    console.log();

    log.info([
      kleur.bold('Environment Variables File'),
      ...squishWords(OPTION_DESCRIPTIONS.envFile).split('\n'),
      `Current value in ${fmtPath(FRIEDA_RC_FILE_NAME)}: ${
        merged.rc.envFile ? fmtPath(merged.rc.envFile) : kleur.dim('not set')
      }`
    ]);
    if (merged.envFileError) {
      log.error([merged.envFileError.message, '']);
    }
    databaseUrlResult = await promptEnvFile(merged.current.envFile);
  }
  if (promptAlways || !outputDirectoryResult || merged.outputDirectoryError) {
    console.log();
    log.info([
      kleur.bold('Output Directory'),
      ...squishWords(OPTION_DESCRIPTIONS.outputDirectory).split('\n'),
      `Current value in ${fmtPath(FRIEDA_RC_FILE_NAME)}: ${
        merged.rc.outputDirectory
          ? fmtPath(merged.rc.outputDirectory)
          : kleur.dim('not set')
      }`
    ]);
    if (merged.outputDirectoryError) {
      log.error([merged.outputDirectoryError.message, '']);
    }
    outputDirectoryResult = await promptDirectory(
      'outputDirectory',
      merged.current.outputDirectory,
      merged.rc.outputDirectory
    );
  }
  if (promptAlways || !schemaDirectoryResult || merged.schemaDirectoryError) {
    console.log();
    log.info([
      kleur.bold('Schema Directory'),
      ...squishWords(OPTION_DESCRIPTIONS.schemaDirectory).split('\n'),
      `Current value in ${fmtPath(FRIEDA_RC_FILE_NAME)}: ${
        merged.rc.schemaDirectory
          ? fmtPath(merged.rc.schemaDirectory)
          : kleur.dim('not set')
      }`
    ]);
    if (merged.schemaDirectoryError) {
      log.error([merged.schemaDirectoryError.message, '']);
    }
    schemaDirectoryResult = await promptDirectory(
      'schemaDirectory',
      merged.current.schemaDirectory,
      merged.rc.schemaDirectory
    );
  }
  let compileJs = merged.current.compileJs === true;
  if (promptAlways) {
    console.log();
    log.info([
      kleur.bold('Compile to Javascript'),
      ...squishWords(OPTION_DESCRIPTIONS.compileJs).split('\n'),
      `Current value in ${fmtPath(FRIEDA_RC_FILE_NAME)}: ${
        typeof merged.rc.compileJs === 'boolean'
          ? fmtVal(JSON.stringify(merged.rc.compileJs))
          : kleur.dim('not set')
      }`
    ]);
    compileJs = await prompt<boolean>({
      type: 'confirm',
      name: 'compileJs',
      message: fmtVarName('compileJs'),
      initial: compileJs
    });
  }
  const options: Options = {
    envFile: databaseUrlResult.envFile,
    outputDirectory: outputDirectoryResult.relativePath,
    schemaDirectory: schemaDirectoryResult.relativePath,
    compileJs,
    
  };

  const changedKeys = Object.keys(options).filter((k) => {
    const key = k as keyof Options;
    return options[key] !== merged.rc[key];
  });

  if (changedKeys.length > 0 || promptAlways) {
    console.log();
    log.info(kleur.bold('Options'));
    log.table(
      [
        ...Object.keys(options).map((k) => {
          const value = options[k as keyof Options];
          const fmted = typeof value === 'string' ? fmtPath(value) : fmtVal(JSON.stringify(value))
          
          return [
            fmtVarName(k),
            fmted,
            changedKeys.includes(k) ? 'yes' : 'no'
          ];
        })
      ],
      ['Option', 'Value', 'Changed']
    );
    const save = await prompt({
      message: `Save changes to ${fmtPath(FRIEDA_RC_FILE_NAME)}`,
      name: 'save',
      type: 'confirm',
      initial: true
    });

    if (save) {
      const spinner = ora(`Saving changes to ${fmtPath(FRIEDA_RC_FILE_NAME)}`);
      await prettifyAndSaveFile(
        FRIEDA_RC_FILE_NAME,
        JSON.stringify(options),
        'json'
      );
      spinner.succeed(`${fmtPath(FRIEDA_RC_FILE_NAME)} saved.`);
    }
  }
  return {
    options,
    connection: connect({ url: databaseUrlResult.databaseUrl }),
    databaseDetails: databaseUrlResult
  };
};

export const getMergedOptions = async (
  cli: Partial<Options>
): Promise<MergedOptions> => {
  const spinner = ora('Reading current options').start();
  const { rc } = await readFriedarc();
  let databaseUrlResult: DatabaseDetails | undefined;
  let envFileError: Error | undefined;
  let outputDirectoryResult: DirectoryResult | undefined;
  let outputDirectoryError: Error | undefined;
  let schemaDirectoryResult: DirectoryResult | undefined;
  let schemaDirectoryError: Error | undefined;

  const current: Partial<Options> = {};

  if (typeof rc.envFile === 'string' && rc.envFile.trim().length > 0) {
    current.envFile = rc.envFile.trim();
  }

  if (typeof cli.envFile === 'string' && cli.envFile.trim().length > 0) {
    current.envFile = cli.envFile.trim();
  }

  if (current.envFile) {
    spinner.text = 'Validating envFile';
    try {
      databaseUrlResult = await validateEnvFile(current.envFile);
    } catch (error) {
      delete current.envFile;
      envFileError = error as Error;
    }
  }

  if (
    typeof rc.outputDirectory === 'string' &&
    rc.outputDirectory.trim().length > 0
  ) {
    current.outputDirectory = rc.outputDirectory.trim();
  }

  if (
    typeof cli.outputDirectory === 'string' &&
    cli.outputDirectory.trim().length > 0
  ) {
    current.outputDirectory = cli.outputDirectory.trim();
  }

  if (current.outputDirectory) {
    spinner.text = 'Validating outputDirectory';
    try {
      outputDirectoryResult = await validateDirectory(
        'outputDirectory',
        current.outputDirectory
      );
    } catch (error) {
      delete current.outputDirectory;
      outputDirectoryError = error as Error;
    }
  }

  if (
    typeof rc.schemaDirectory === 'string' &&
    rc.schemaDirectory.trim().length > 0
  ) {
    current.schemaDirectory = rc.schemaDirectory.trim();
  }

  if (
    typeof cli.schemaDirectory === 'string' &&
    cli.schemaDirectory.trim().length > 0
  ) {
    current.schemaDirectory = cli.schemaDirectory.trim();
  }

  if (current.schemaDirectory) {
    spinner.text = 'Validating schemaDirectory';
    try {
      schemaDirectoryResult = await validateDirectory(
        'schemaDirectory',
        current.schemaDirectory
      );
    } catch (error) {
      delete current.schemaDirectory;
      schemaDirectoryError = error as Error;
    }
  }

  current.compileJs = typeof rc.compileJs === 'boolean' ? rc.compileJs : false;

  if (typeof cli.compileJs === 'boolean') {
    current.compileJs = cli.compileJs;
  }
  const result: MergedOptions = {
    rc,
    current,
    databaseUrlResult,
    envFileError,
    outputDirectoryError,
    outputDirectoryResult,
    schemaDirectoryError,
    schemaDirectoryResult
  };
  spinner.succeed('Current options read.');

  return result;
};

export const promptEnvFile = async (
  currentValue?: string
): Promise<DatabaseDetails> => {
  let urlResult: DatabaseDetails | undefined;
  await prompt<string>({
    type: 'text',
    name: 'envFile',
    initial: currentValue,
    message: fmtVarName('envFile'),
    validate: async (value) => {
      const p = typeof value === 'string' ? value.trim() : '';
      if (p.length === 0) {
        return 'Required.';
      }
      try {
        urlResult = await validateEnvFile(p);
        return true;
      } catch (error) {
        return (error as Error).message;
      }
    }
  });
  return urlResult as DatabaseDetails;
};

export const validateEnvFile = async (
  envFilePath: string
): Promise<Required<DatabaseDetails>> => {
  const fileResult = await getFile(envFilePath);
  if (!fileResult.exists) {
    throw new Error(`The file ${fmtPath(envFilePath)} does not exist.`);
  }
  if (!fileResult.isFile) {
    throw new Error(`The path ${fmtPath(envFilePath)} is not a file.`);
  }

  const env = parse(fileResult.contents || '');
  const envKeys = Object.keys(env);
  const foundKeys = ENV_DB_URL_KEYS.filter(
    (k) => envKeys.includes(k) && env[k].length > 0
  );
  const validResults: DatabaseDetails[] = foundKeys
    .filter((k) => validateDatabaseUrl(env[k]))
    .map((k) => {
      return {
        databaseUrl: env[k],
        databaseUrlKey: k,
        envFile: envFilePath
      };
    });
  if (!validResults[0]) {
    if (foundKeys.length > 0) {
      throw new Error(
        `Could not find a valid URL in ${fmtPath(
          envFilePath
        )}. Key(s): ${foundKeys.map((k) => fmtVarName(k)).join(', ')}`
      );
    } else {
      throw new Error(
        `Could not find ${ENV_DB_URL_KEYS.map((k) => fmtVarName(k)).join(
          ' or '
        )} in ${fmtPath(envFilePath)}.`
      );
    }
  }
  return validResults[0];
};

export const validateDatabaseUrl = (urlStr: unknown): boolean => {
  if (typeof urlStr !== 'string') {
    return false;
  }
  try {
    const url = new URL(urlStr);
    // won't work without this
    url.protocol = 'http:';
    const { username, password } = url;
    if (username.length === 0) {
      return false;
    }
    if (password.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const promptDirectory = async (
  key: keyof Pick<Options, 'outputDirectory'|'schemaDirectory'>,
  currentValue?: string,
  currentRcValue?: string
): Promise<DirectoryResult> => {
  let directoryResult: DirectoryResult | undefined;

  await prompt({
    type: 'text',
    name: 'outputDirectory',
    message: fmtVarName(key),
    initial: currentValue || '',
    validate: async (value) => {
      const p = typeof value === 'string' ? value.trim() : '';
      if (p.length === 0) {
        return 'Required.';
      }
      try {
        directoryResult = await validateDirectory(key, p);
        return true;
      } catch (error) {
        return (error as Error).message;
      }
    }
  });

  if (!directoryResult) {
    // never happens
    throw Error();
  }
  if (
    directoryResult.exists &&
    !directoryResult.isEmpty &&
    directoryResult.relativePath !== currentRcValue
  ) {
    log.warn([
      `The ${fmtVarName(key)} directory path ${fmtPath(
        directoryResult.relativePath
      )} is not empty.`,
      ''
    ]);
    const goAhead = await prompt({
      type: 'confirm',
      name: 'c',
      message: `Continue?`
    });
    if (!goAhead) {
      return await promptDirectory(key, '', currentValue);
    }
  }
  return directoryResult;
};

export const validateDirectory = async (
  key: keyof Pick<Options, 'outputDirectory'|'schemaDirectory'>,
  relativePath: string
): Promise<DirectoryResult> => {
  const dir = await getDirectory(relativePath);
  if (!dir.isDirectory && dir.exists) {
    throw new Error(
      `Error: ${fmtVarName(key)} directory path ${fmtPath(dir.relativePath)} is a file.`
    );
  }
  if (!dir.isUnderCwd) {
    throw new Error(
      `Error:  ${fmtVarName(key)} directory path ${fmtPath(
        dir.relativePath
      )} is not a subdirectory of the current working directory.`
    );
  }
  return dir;
};

export const readFriedarc = async (): Promise<{
  file: FileResult;
  rc: Partial<Options>;
}> => {
  const file = await getFile(FRIEDA_RC_FILE_NAME);
  let rc: Partial<Options> = {};
  if (file.isFile) {
    try {
      rc = JSON.parse(file.contents || '');
      rc = isPlainObject(rc) ? rc : {};
    } catch (error) {
      rc = {};
    }
  }
  return {
    file,
    rc
  };
};
