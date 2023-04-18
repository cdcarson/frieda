
import colors from 'picocolors';
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

export const cmdInit = async () => {
  
  let s = wait('Reading current settings');
  const { rcSettings } = await readFriedaRc();
  let dbResult = await validateDatabaseUrl(rcSettings.envFilePath || '.env');
  s.done();
  dbResult = await promptDatabaseUrl(dbResult);
  const schemaDirectory = await promptSchemaDirectory(rcSettings);
  const generatedCodeDirectory = await promptGeneratedCodeDirectory(rcSettings);
  const jsonTypeImports = await promptJsonTypeImportsSimple(rcSettings);
  
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
  
};
