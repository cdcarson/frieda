import parser from 'yargs-parser';
import {
  cliFetchSchema,
  cliGetSettings,
  cancelAndExit,
  cliPromptRunMigration,
  cliCreateOrUpdatePendingMigrationFile,
  editOrSaveOptions
} from './cli.js';

import { isCancel, select, log } from '@clack/prompts';

import type { FileResult } from './types.js';
import { getFileResult, globWorkingMigrations } from './file-system.js';
import { fmtPath, wait } from './utils.js';
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
  const s = wait('Looking for migration files');
  const files = await globWorkingMigrations(settings);
  s.done();
  const modifiedOpts = editOrSaveOptions.map(o => {
    const copy = {...o};
    if (copy.value === 'edit') {
      copy.label = 'Create and edit a migration here'
    }
    if (copy.value === 'save') {
      copy.label = 'Create a migration file'
    }
    return copy
  })

  const action = await select({
    message: 'Choose migration source:',
    options: [
      ...files.map(f => {
        return {
          value: f,
          label: f,
          hint: 'existing migration'
        }
      }),
      ...modifiedOpts,
      {
        label: 'Cancel',
        value: 'cancel'
      }
    ]
  });
  if (isCancel(action) || 'cancel' === action) {
    return cancelAndExit();
  }
  if (files.includes(action as string)) {
    const r = wait('Loading migration');
    const fileResult = await getFileResult(action as string);
    r.done();
    await cliPromptRunMigration(settings, {
      schemaBefore: schema,
      sql: fileResult.contents || '',
      file: fileResult
    });
    return;
  }
  if ('edit' === action) {
    await cliPromptRunMigration(settings, {
      sql: edit(''),
      schemaBefore: schema
    });
    return;
  }
  if ('save' === action) {
    await cliCreateOrUpdatePendingMigrationFile(settings, {
      sql: '',
      schemaBefore: schema
    });
    return;
  }
};