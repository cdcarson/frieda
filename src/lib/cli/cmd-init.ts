import { intro, outro, confirm, log, isCancel, text } from '@clack/prompts';
import fs, { write } from 'fs-extra';
import glob from 'tiny-glob'
import { join } from 'path';
import colors from 'picocolors';
import type { ParseCommandResult } from './commands.js';
import {
  fmtPath,
  wait
} from './utils.js';
import {
  promptDatabaseUrl,
  promptExternalTypeImports,
  promptGeneratedCodeDirectory,
  promptSchemaDirectory,
  promptTypeSettings,
  readFriedaRc,
  validateDatabaseUrl,
  writeFriedaRc,
} from './settings.js';
import type { RcSettings } from '$lib/types.js';
import { FRIEDA_RC_FILE_NAME } from './constants.js';

export const cmdInit = async (commandResult: ParseCommandResult) => {
  intro(
    `${colors.bold(`init`)} ${colors.dim('(Re)initialize Frieda settings')}`
  );
  let s = wait('Reading current settings');
  const { rcSettings, friedaRcExists } = await readFriedaRc();
  let dbResult = await validateDatabaseUrl(rcSettings.envFilePath || '.env')
  s.done();
  const flags = await promptTypeSettings(rcSettings)
  dbResult = await promptDatabaseUrl(dbResult)
  const externalTypeImports = await promptExternalTypeImports(rcSettings);
  const schemaDirectory = await promptSchemaDirectory(rcSettings)
  const generatedCodeDirectory = await promptGeneratedCodeDirectory(rcSettings);
  
  const newRcSettings: RcSettings = {
    ...rcSettings,
    schemaDirectory,
    generatedCodeDirectory,
    externalTypeImports,
    envFilePath: dbResult.envFilePath,
    ...flags
  }
  s = wait(`Saving ${fmtPath(FRIEDA_RC_FILE_NAME)}`)
  await writeFriedaRc(newRcSettings);
  s.done();
  outro(colors.bold('Done.'));
};








