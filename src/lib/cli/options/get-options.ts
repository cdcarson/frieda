import ora from 'ora';
import type {
  CliArgs,
  DatabaseUrlResult,
  ResolvedCliOptions
} from '../types.js';
import { readFriedarc } from './read-friedarc.js';

import { fmtPath, fmtVarName, squishWords } from '../ui/formatters.js';
import { FRIEDA_RC_FILE_NAME, OPTION_DESCRIPTIONS } from '../constants.js';
import { prettifyAndSaveFile } from '../../fs/prettify-and-save-file.js';
import log from '../ui/log.js';
import { validateEnvFile } from './validate-env-file.js';
import { validateDirectory } from './validate-directory.js';
import { promptEnvFile } from './prompt-env-file.js';
import { promptDirectory } from './prompt-directory.js';
import { promptBooleanOption } from './prompt-boolean-option.js';
import { promptDirectoryNotEmpty } from './prompt-directory-not-empty.js';
import { prompt } from '../ui/prompt.js';
import type { DirectoryResult } from '../../fs/types.js';
import { type Connection, connect } from '@planetscale/database';

export const getOptions = async (
  cliArgs: Partial<CliArgs>,
  promptAlways = false
): Promise<{ options: ResolvedCliOptions; connection: Connection }> => {
  const spinner = ora('Reading current options').start();
  const { rc } = await readFriedarc();
  let envFile: string;
  let envFileError: Error | undefined;
  let databaseUrlResult: DatabaseUrlResult | undefined;
  if (
    typeof cliArgs.envFile === 'string' &&
    cliArgs.envFile.trim().length > 0
  ) {
    envFile = cliArgs.envFile.trim();
  } else if (typeof rc.envFile === 'string' && rc.envFile.trim().length > 0) {
    envFile = rc.envFile.trim();
  } else {
    envFile = '.env';
  }
  try {
    databaseUrlResult = await validateEnvFile(envFile);
  } catch (error) {
    if (error instanceof Error) {
      envFileError = error;
    } else {
      throw error;
    }
  }

  let outputDirectory: string | undefined;
  let outputDirectoryError: Error | undefined;
  let outputDirectoryResult: DirectoryResult | undefined;
  if (
    typeof cliArgs.outputDirectory === 'string' &&
    cliArgs.outputDirectory.trim().length > 0
  ) {
    outputDirectory = cliArgs.outputDirectory.trim();
  } else if (
    typeof rc.outputDirectory === 'string' &&
    rc.outputDirectory.trim().length > 0
  ) {
    outputDirectory = rc.outputDirectory.trim();
  } else {
    outputDirectoryError = new Error(
      `${fmtVarName('outputDirectory')} not found in ${fmtPath(
        FRIEDA_RC_FILE_NAME
      )} or passed as a cli argument.`
    );
  }
  if (outputDirectory) {
    try {
      outputDirectoryResult = await validateDirectory(
        outputDirectory,
        'outputDirectory'
      );
    } catch (error) {
      if (error instanceof Error) {
        outputDirectoryError = error;
      } else {
        throw error;
      }
    }
  }
  let compileJs: boolean;
  if (typeof cliArgs.compileJs === 'boolean') {
    compileJs = cliArgs.compileJs;
  } else if (typeof rc.compileJs === 'boolean') {
    compileJs = rc.compileJs;
  } else {
    compileJs = false;
  }

  let typeTinyIntOneAsBoolean: boolean;
  if (typeof cliArgs.typeTinyIntOneAsBoolean === 'boolean') {
    typeTinyIntOneAsBoolean = cliArgs.typeTinyIntOneAsBoolean;
  } else if (typeof rc.typeTinyIntOneAsBoolean === 'boolean') {
    typeTinyIntOneAsBoolean = rc.typeTinyIntOneAsBoolean;
  } else {
    typeTinyIntOneAsBoolean = true;
  }

  let typeBigIntAsString: boolean;
  if (typeof cliArgs.typeBigIntAsString === 'boolean') {
    typeBigIntAsString = cliArgs.typeBigIntAsString;
  } else if (typeof rc.typeBigIntAsString === 'boolean') {
    typeBigIntAsString = rc.typeBigIntAsString;
  } else {
    typeBigIntAsString = true;
  }

  const typeImports = (rc.typeImports || [])
    .filter((s) => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  spinner.succeed('Current options read.');

  if (databaseUrlResult === undefined || promptAlways) {
    if (envFileError) {
      log.error(envFileError.message);
    }
    log.info([
      fmtVarName('envFile'),
      ...squishWords(OPTION_DESCRIPTIONS.envFile).split('\n')
    ]);
    databaseUrlResult = await promptEnvFile(envFile, rc.envFile);
  }

  if (outputDirectoryResult === undefined || promptAlways) {
    if (outputDirectoryError) {
      log.error(outputDirectoryError.message);
    }
    log.info([
      fmtVarName('outputDirectory'),
      ...squishWords(OPTION_DESCRIPTIONS.outputDirectory).split(`\n`)
    ]);
    outputDirectoryResult = await promptDirectory(
      'outputDirectory',
      outputDirectory,
      rc.outputDirectory
    );
  } else {
    if (
      outputDirectoryResult.isEmpty === false &&
      outputDirectoryResult.relativePath !== rc.outputDirectory
    ) {
      const ok = await promptDirectoryNotEmpty(
        outputDirectoryResult.relativePath
      );
      if (!ok) {
        outputDirectoryResult = await promptDirectory(
          'outputDirectory',
          outputDirectory,
          rc.outputDirectory
        );
      }
    }
  }

  if (promptAlways) {
    log.info([
      fmtVarName('compileJs'),
      ...squishWords(OPTION_DESCRIPTIONS.compileJs).split('\n')
    ]);
    compileJs = await promptBooleanOption('compileJs', compileJs);

    log.info([
      fmtVarName('typeBigIntAsString'),
      ...squishWords(OPTION_DESCRIPTIONS.typeBigIntAsString).split('\n')
    ]);
    typeBigIntAsString = await promptBooleanOption(
      'typeBigIntAsString',
      typeBigIntAsString
    );

    log.info([
      fmtVarName('typeTinyIntOneAsBoolean'),
      ...squishWords(OPTION_DESCRIPTIONS.typeTinyIntOneAsBoolean).split('\n')
    ]);
    typeTinyIntOneAsBoolean = await promptBooleanOption(
      'typeTinyIntOneAsBoolean',
      typeTinyIntOneAsBoolean
    );
    if (promptAlways) {
      log.info([
        fmtVarName('typeImports'),
        squishWords(
          `Note that you can edit the ${fmtVarName(
            'typeImports'
          )} array directly in ${fmtPath(FRIEDA_RC_FILE_NAME)}.`
        )
      ]);
    }
  }

  const options: ResolvedCliOptions = {
    compileJs,
    envFile: databaseUrlResult.envFile,
    outputDirectory: outputDirectoryResult.relativePath,
    typeBigIntAsString,
    typeImports,
    typeTinyIntOneAsBoolean
  };

  const changedKeys = Object.keys(options).filter((k) => {
    const key = k as keyof ResolvedCliOptions;
    if (key === 'typeImports') {
      return false;
    }
    return options[key] !== rc[key];
  });

  if (changedKeys.length > 0) {
    log.info(
      `Changed options: ${changedKeys.map((k) => fmtVarName(k)).join(', ')}`
    );
    const save = await prompt({
      type: 'confirm',
      message: `Save changes to ${fmtPath(FRIEDA_RC_FILE_NAME)}`,
      name: 'save'
    });
    if (save) {
      const spinner = ora(`Saving ${fmtPath(FRIEDA_RC_FILE_NAME)}`);
      await prettifyAndSaveFile(
        FRIEDA_RC_FILE_NAME,
        JSON.stringify(options),
        'json'
      );
      spinner.succeed();
    }
  }

  return {
    options,
    connection: connect({ url: databaseUrlResult.databaseUrl })
  };
};
