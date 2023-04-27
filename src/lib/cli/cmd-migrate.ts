import parser from 'yargs-parser';
import {
  cliFetchSchema,
  cliGetSettings,
  promptModel,
  cancelAndExit,
  cliPromptRunMigration,
  cliPromptEditMigration
} from './cli.js';

import { isCancel, select, text, confirm, log } from '@clack/prompts';
import { DEFAULT_JSON_FIELD_TYPE } from './constants.js';
import { KNOWN_MYSQL_TYPES } from '$lib/api/constants.js';
import type { FileResult, FileSystemResult } from './types.js';
import { getFileResult } from './file-system.js';
import { fmtPath } from './utils.js';

export const cmdMigrate = async (rawArgs: string[]) => {
  const settings = await cliGetSettings();
  const { schema } = await cliFetchSchema(settings);
  const file = rawArgs[0];
  let fileResult: FileResult|null;

  if (file) {
    fileResult = await getFileResult(file);
    if (! fileResult.exists) {
      log.warn(`File ${fmtPath(fileResult.relativePath)} does not exist.`)
    } else if (! fileResult.isFile) {
      log.warn(`File ${fmtPath(fileResult.relativePath)} is not a file.`)
    } else {
      return await cliPromptRunMigration(settings, {
        sql: fileResult.contents || '',
        isCurrentMigrationSql: false,
        schemaBefore: schema
      })
    }
    
  }
  return await cliPromptEditMigration(settings, {
    sql: '',
    isCurrentMigrationSql: false,
    schemaBefore: schema
  })
};