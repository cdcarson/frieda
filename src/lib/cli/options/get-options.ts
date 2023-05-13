import ora from 'ora';
import type {
  CliArgs,
  DatabaseUrlResult,
  ResolvedCliOptions
} from '../types.js';
import { readFriedarc } from './read-friedarc.js';

import { fmtPath, fmtVal, fmtVarName, squishWords } from '../ui/formatters.js';
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
import colors from 'kleur';
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
    console.log();
    if (envFileError) {
      log.error(envFileError.message);
      console.log();
    }
    log.info(
      squishWords(
        `${fmtVarName('envFile')}: ${OPTION_DESCRIPTIONS.envFile}`
      ).split('\n')
    );

    databaseUrlResult = await promptEnvFile(envFile, rc.envFile);
  }

  if (outputDirectoryResult === undefined || promptAlways) {
    console.log();
    if (outputDirectoryError) {
      log.error(outputDirectoryError.message);
      console.log();
    }
    log.info(
      squishWords(
        `${fmtVarName('outputDirectory')}: ${
          OPTION_DESCRIPTIONS.outputDirectory
        }`
      ).split('\n')
    );
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
    console.log();
    log.info(
      squishWords(
        `${fmtVarName('compileJs')}: ${
          OPTION_DESCRIPTIONS.compileJs
        }`
      ).split('\n')
    );
    compileJs = await promptBooleanOption('compileJs', compileJs);

    console.log();
    log.info(
      squishWords(
        `${fmtVarName('typeBigIntAsString')}: ${
          OPTION_DESCRIPTIONS.typeBigIntAsString
        }`
      ).split('\n')
    );

    typeBigIntAsString = await promptBooleanOption(
      'typeBigIntAsString',
      typeBigIntAsString
    );

    console.log();

    log.info(
      squishWords(
        `${fmtVarName('typeTinyIntOneAsBoolean')}: ${
          OPTION_DESCRIPTIONS.typeTinyIntOneAsBoolean
        }`
      ).split('\n')
    );

    typeTinyIntOneAsBoolean = await promptBooleanOption(
      'typeTinyIntOneAsBoolean',
      typeTinyIntOneAsBoolean
    );
    console.log();
    log.info(
      squishWords(
        `${fmtVarName('typeImports')}: ${
          OPTION_DESCRIPTIONS.typeImports
        } Note that you can edit this array directly in ${fmtPath(
          FRIEDA_RC_FILE_NAME
        )}.`
      ).split('\n')
    );
  }

  const options: ResolvedCliOptions = {
    envFile: databaseUrlResult.envFile,
    outputDirectory: outputDirectoryResult.relativePath,
    compileJs,
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

  if (changedKeys.length > 0 || promptAlways) {
    console.log();
    log.info(colors.bold('Options'));
    log.table([
      ['Option', 'Value', 'Changed'],
      ...(Object.keys(options) as (keyof ResolvedCliOptions)[]).map((k) => {
        const valueString =
          k === 'typeImports'
            ? colors.gray(`${options[k].length} import(s)`)
            : k === 'outputDirectory' || k === 'envFile'
            ? fmtPath(options[k])
            : fmtVal(JSON.stringify(options[k]));
        return [
          fmtVarName(k),
          valueString,
          colors.dim(changedKeys.includes(k) ? 'yes' : 'no')
        ];
      })
    ]);
  }

  if (changedKeys.length > 0) {
    log.info(
      `Changed options: ${changedKeys.map((k) => fmtVarName(k)).join(', ')}`
    );
    const save = await prompt({
      type: 'confirm',
      message: `Save changes to ${fmtPath(FRIEDA_RC_FILE_NAME)}`,
      name: 'save',
      initial: true
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
    console.log();
  }

  return {
    options,
    connection: connect({ url: databaseUrlResult.databaseUrl })
  };
};
