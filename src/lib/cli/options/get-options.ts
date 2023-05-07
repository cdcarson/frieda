import ora from 'ora';
import type { CliArgs, Options, OptionsWithConnection } from '../types.js';
import { readFriedarc } from './read-friedarc.js';
import { getEnvFileOption } from './get-env-file-option.js';
import { getDirectoryOption } from './get-directory-option.js';
import { getBooleanOption } from './get-boolean-option.js';
import { prompt } from '../ui/prompt.js';
import {
  fmtPath,
  fmtVal,
  fmtVarName,
  maskDatabaseURLPassword
} from '../utils/formatters.js';
import { FRIEDA_RC_FILE_NAME } from '../constants.js';
import colors from 'kleur';
import { prettifyAndSaveFile } from '../fs/prettify-and-save-file.js';
import log from '../ui/log.js';
import { Connection, connect } from '@planetscale/database';

export const getOptions = async (
  cliArgs: Partial<CliArgs>,
  promptAlways = false
): Promise<OptionsWithConnection> => {
  const spinner = ora('Reading current options');
  const { rc } = await readFriedarc();
  spinner.succeed();
  const envFile = await getEnvFileOption(cliArgs, rc, promptAlways);
  const schemaDirectory = await getDirectoryOption(
    'schemaDirectory',
    cliArgs,
    rc,
    promptAlways
  );
  const codeDirectory = await getDirectoryOption(
    'codeDirectory',
    cliArgs,
    rc,
    promptAlways
  );
  const outputJs = await getBooleanOption(
    'outputJs',
    cliArgs,
    rc,
    false,
    promptAlways
  );
  const typeBigIntAsString = await getBooleanOption(
    'typeBigIntAsString',
    cliArgs,
    rc,
    true,
    promptAlways
  );
  const typeTinyIntOneAsBoolean = await getBooleanOption(
    'typeTinyIntOneAsBoolean',
    cliArgs,
    rc,
    true,
    promptAlways
  );
  const options: Options = {
    codeDirectory: codeDirectory.value,
    envFile: envFile.value,
    schemaDirectory: schemaDirectory.value,
    outputJs: outputJs.value,
    typeBigIntAsString: typeBigIntAsString.value,
    typeTinyIntOneAsBoolean: typeTinyIntOneAsBoolean.value,
    typeImports: (rc.typeImports || []).filter((s) => typeof s === 'string')
  };

  // log.info([
  //   colors.dim('Options'),
  //   `${fmtVarName('envFile')}: ${fmtPath(options.envFile)}`,
  //   `${fmtVarName('databaseUrl')}: ${maskDatabaseURLPassword(
  //     envFile.databaseUrl.databaseUrl
  //   )}`,
  //   ...['schemaDirectory', 'codeDirectory'].map((k) => {
  //     return `${fmtVarName(k)}: ${fmtPath(
  //       options[k as keyof Options] as string
  //     )}`;
  //   }),
  //   ...['outputJs', 'typeBigIntAsString', 'typeTinyIntOneAsBoolean'].map(
  //     (k) => {
  //       return `${fmtVarName(k)}: ${fmtVal(
  //         JSON.stringify(options[k as keyof Options])
  //       )}`;
  //     }
  //   ),
  //   `${fmtVarName('typeImports')}:`,
  //   ...fmtVal(JSON.stringify(options.typeImports, null, 1)).split('\n')
  // ]);

  const changedKeys = Object.keys(options).filter((k) => {
    const key = k as keyof Options;
    if (key === 'typeImports') {
      return false;
    }
    return options[key] !== rc[key];
  });

  if (changedKeys.length > 0) {
    log.info(`Changed: ${changedKeys.join(', ')}`);
    const save = await prompt({
      type: 'confirm',
      message: `Save changes in ${fmtPath(FRIEDA_RC_FILE_NAME)}`,
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

  return { ...options, connection: connect({url: envFile.databaseUrl.databaseUrl}) };
};
