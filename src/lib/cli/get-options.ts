import kleur from 'kleur';
import {
  ENV_DB_URL_KEYS,
  FRIEDA_RC_FILE_NAME,
  OPTION_DESCRIPTIONS
} from './constants.js';
import type { DatabaseUrlResult, ResolvedCliOptions } from './types.js';
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
import { connect, type Connection } from '@planetscale/database';

type MergedOptions = {
  databaseUrlResult?: DatabaseUrlResult;
  outputDirectoryResult?: DirectoryResult;
  envFileError?: Error;
  outputDirectoryError?: Error;
  current: Partial<ResolvedCliOptions>;
  rc: Partial<ResolvedCliOptions>;
};

export const getOptions = async (
  cliArgs: Partial<ResolvedCliOptions>,
  promptAlways = false
): Promise<{ options: ResolvedCliOptions; connection: Connection }> => {
  const merged = await getMergedOptions(cliArgs);
  let { databaseUrlResult, outputDirectoryResult } = merged;
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
    outputDirectoryResult = await promptOutputDirectory(
      merged.current.outputDirectory,
      merged.rc.outputDirectory
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
  const options: ResolvedCliOptions = {
    envFile: databaseUrlResult.envFile,
    outputDirectory: outputDirectoryResult.relativePath,
    compileJs,
    typeImports: (Array.isArray(merged.rc.typeImports)
      ? merged.rc.typeImports
      : []
    ).filter((s) => typeof s === 'string')
  };

  const changedKeys = Object.keys(options).filter((k) => {
    const key = k as keyof ResolvedCliOptions;
    if (key === 'typeImports') {
      return false;
    }
    return options[key] !== merged.rc[key];
  });

  if (changedKeys.length > 0 || promptAlways) {
    console.log();
    log.info(kleur.bold('Options'));
    log.table(
      [
        ...Object.keys(options).map((k) => {
          const value = options[k as keyof ResolvedCliOptions];
          if ('typeImports' === k) {
            return [
              fmtVarName(k),
              kleur.dim(`${options.typeImports.length} import statement(s)`),
              'no'
            ];
          }
          return [
            fmtVarName(k),
            typeof value === 'string'
              ? fmtVal(value)
              : fmtVal(JSON.stringify(value)),
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
    connection: connect({ url: databaseUrlResult.databaseUrl })
  };
};

export const getMergedOptions = async (
  cli: Partial<ResolvedCliOptions>
): Promise<MergedOptions> => {
  const spinner = ora('Reading current options').start();
  const { rc } = await readFriedarc();
  let databaseUrlResult: DatabaseUrlResult | undefined;
  let envFileError: Error | undefined;
  let outputDirectoryResult: DirectoryResult | undefined;
  let outputDirectoryError: Error | undefined;

  const current: Partial<ResolvedCliOptions> = {};

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
      outputDirectoryResult = await validateOutputDirectory(
        current.outputDirectory
      );
    } catch (error) {
      delete current.outputDirectory;
      outputDirectoryError = error as Error;
    }
  }

  current.compileJs = typeof rc.compileJs === 'boolean' ? rc.compileJs : true;

  if (typeof cli.compileJs === 'boolean') {
    current.compileJs = cli.compileJs;
  }
  const result: MergedOptions = {
    rc,
    current,
    databaseUrlResult,
    envFileError,
    outputDirectoryError,
    outputDirectoryResult
  };
  spinner.succeed('Current options read.');

  return result;
};

export const promptEnvFile = async (
  currentValue?: string
): Promise<DatabaseUrlResult> => {
  let urlResult: DatabaseUrlResult | undefined;
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
  return urlResult as DatabaseUrlResult;
};

export const validateEnvFile = async (
  envFilePath: string
): Promise<Required<DatabaseUrlResult>> => {
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
  const validResults: DatabaseUrlResult[] = foundKeys
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

export const promptOutputDirectory = async (
  currentValue?: string,
  currentRcValue?: string
): Promise<DirectoryResult> => {
  let directoryResult: DirectoryResult | undefined;

  await prompt({
    type: 'text',
    name: 'outputDirectory',
    message: fmtVarName('outputDirectory'),
    initial: currentValue || '',
    validate: async (value) => {
      const p = typeof value === 'string' ? value.trim() : '';
      if (p.length === 0) {
        return 'Required.';
      }
      try {
        directoryResult = await validateOutputDirectory(p);
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
      `The output directory path ${fmtPath(
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
      return await promptOutputDirectory('', currentValue);
    }
  }
  return directoryResult;
};

export const validateOutputDirectory = async (
  relativePath: string
): Promise<DirectoryResult> => {
  const dir = await getDirectory(relativePath);
  if (!dir.isDirectory && dir.exists) {
    throw new Error(
      `Error: Output directory path ${fmtPath(dir.relativePath)} is a file.`
    );
  }
  if (!dir.isUnderCwd) {
    throw new Error(
      `Error: Output directory path ${fmtPath(
        dir.relativePath
      )} is not a subdirectory of the current working directory.`
    );
  }
  return dir;
};

export const readFriedarc = async (): Promise<{
  file: FileResult;
  rc: Partial<ResolvedCliOptions>;
}> => {
  const file = await getFile(FRIEDA_RC_FILE_NAME);
  let rc: Partial<ResolvedCliOptions> = {};
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
