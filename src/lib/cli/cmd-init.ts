import { intro, outro } from '@clack/prompts';

import colors from 'picocolors';
import type { ParseCommandResult } from './commands.js';
import { fmtPath, wait } from './utils.js';
import {
  promptDatabaseUrl,
  promptJsonTypeImportsSimple,
  promptGeneratedCodeDirectory,
  promptSchemaDirectory,
  promptTypeBigIntAsString,
  promptTypeTinyIntOneAsBoolean,
  readFriedaRc,
  validateDatabaseUrl,
  writeFriedaRc
} from './settings.js';
import type { RcSettings } from '$lib/types.js';
import { FRIEDA_RC_FILE_NAME } from './constants.js';

export const cmdInit = async (commandResult: ParseCommandResult) => {
  intro(
    `${colors.bold(`init`)} ${colors.dim('(Re)initialize Frieda settings')}`
  );
  let s = wait('Reading current settings');
  const { rcSettings } = await readFriedaRc();
  let dbResult = await validateDatabaseUrl(rcSettings.envFilePath || '.env');
  s.done();
  const schemaDirectory = await promptSchemaDirectory(rcSettings);
  const generatedCodeDirectory = await promptGeneratedCodeDirectory(rcSettings);
  const jsonTypeImports = await promptJsonTypeImportsSimple(rcSettings);
  dbResult = await promptDatabaseUrl(dbResult);
  const typeTinyIntOneAsBoolean = await promptTypeTinyIntOneAsBoolean(
    rcSettings
  );
  const typeBigIntAsString = await promptTypeBigIntAsString(rcSettings);

  const newRcSettings: RcSettings = {
    ...rcSettings,
    schemaDirectory,
    generatedCodeDirectory,
    jsonTypeImports,
    envFilePath: dbResult.envFilePath,
    typeTinyIntOneAsBoolean,
    typeBigIntAsString
  };
  s = wait(`Saving ${fmtPath(FRIEDA_RC_FILE_NAME)}`);
  await writeFriedaRc(newRcSettings);
  s.done();
  outro(colors.bold('Done.'));
};
