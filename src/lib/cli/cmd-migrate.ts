import parser from 'yargs-parser';
import {
  cliFetchSchema,
  cliGetSettings,
  cancelAndExit,
  cliPromptRunMigration,
  cliCreateOrUpdatePendingMigrationFile
} from './cli.js';

import { isCancel, select, log } from '@clack/prompts';

import type { FileResult } from './types.js';
import { getFileResult } from './file-system.js';
import { fmtPath } from './utils.js';
import _ from 'lodash';
import { edit } from 'external-editor';

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
        schemaBefore: schema,
        file: fileResult
      })
    }
    
  }
  const where = await select({
    message: 'Choose migration source:',
    options: [
      {
        label: 'Create and edit a new migration here',
        value: 'edit',
        hint: 'Opens a temporary file in the terminal editor'
      },
      {
        label: 'Create a new migration file',
        value: 'create',
        hint: 'Create a file, edit it elsewhere, then run frieda migrate <path>'
      },
      {
        label: 'Cancel',
        value: 'cancel'
      }
    ]
  });
  if (isCancel(where) || 'cancel' === where) {
    return cancelAndExit();
  }
  if ('create' === where) {
    return cliCreateOrUpdatePendingMigrationFile(settings, {
      schemaBefore: schema,
      sql: ''
    })
  }
  return cliPromptRunMigration(settings, {
    sql: edit(''),
    schemaBefore: schema
  })
};