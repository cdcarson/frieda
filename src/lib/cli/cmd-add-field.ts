import parser from 'yargs-parser';
import {
  cliFetchSchema,
  cliGetSettings,
  promptModel,
  cancelAndExit,
  cliPromptRunMigration
} from './cli.js';

import { isCancel, select, text, confirm, log } from '@clack/prompts';
import { DEFAULT_JSON_FIELD_TYPE } from './constants.js';
import { KNOWN_MYSQL_TYPES } from '$lib/api/constants.js';

export const cmdAddField = async (rawArgs: string[]) => {
  const settings = await cliGetSettings();
  const { schema, models } = await cliFetchSchema(settings);
  const args = parser(rawArgs, {
    alias: { model: ['m'], name: ['n'] },
    string: ['model', 'name']
  });
  const model = await promptModel(
    models,
    typeof args.model === 'string' ? args.model : ''
  );
  let comment: string|null = null
  const name = await text({
    message: 'Column name:',
    validate: (s) => {
      if(s.trim().length === 0) {
        return 'Required.'
      }
    }
  });
  if (isCancel(name)) {
    return cancelAndExit()
  }
  let dbType = await text({
    message: 'MySQL type:',
    validate: (s) => {
      const trimmed = s.trim().toLowerCase();
      if (trimmed.length === 0) {
        return 'Required.'
      }
    }
  })

  if (isCancel(dbType)) {
    return cancelAndExit()
  }
  dbType = dbType.trim().toLowerCase();
  if (['bool', 'boolean'].includes(dbType)) {
    dbType = 'tinyint(1)'
  }

  const nullable = await select({
    message: 'Nullable?',
    options: [
      {
        label: 'NULL',
        value: 'NULL'
      },
      {
        label: 'NOT NULL',
        value: 'NOT NULL'
      }
    ],
   
    initialValue: 'NULL'
  })

  if (isCancel(nullable)) {
    return cancelAndExit()
  }

  if (/bigint/i.test(dbType)) {
    const typeAsBigInt = await confirm({
      message: 'Type as javascript bigint?',

    });
    if (isCancel(typeAsBigInt)) {
      return cancelAndExit()
    }
    if (typeAsBigInt) {
      comment = '@bigint'
    }
  }

  if ('json' === dbType) {
    const jsonType = await text({
      message: 'Custom JSON type:',
      placeholder: `Leave blank for no type annotation`
    })
    if (isCancel(jsonType)) {
      return cancelAndExit()
    }
    if (jsonType !== DEFAULT_JSON_FIELD_TYPE && jsonType.trim().length > 0) {
      comment = `@json(${jsonType})`
    }
  }

  if ('tinyint' === dbType ) {
    const typeAsBool = await confirm({
      message: 'Type as boolean?'
    });
    if (isCancel(typeAsBool)) {
      return cancelAndExit()
    }
    if (typeAsBool) {
      dbType = 'tinyint(1)'
    }

  }
  

  const defaultValue = await text({
    message: 'Default value:',
    placeholder: 'Leave blank for no default'
  })
  if (isCancel(defaultValue)) {
    return cancelAndExit()
  }

  let colDef = `\`${name}\` ${dbType} ${nullable}${defaultValue ? ` DEFAULT '${defaultValue}'` : ''}`
  if (comment) {
    colDef += ` COMMENT '${comment}'`
  }
  const sql = [
    `ALTER TABLE \`${model.tableName}\``,
    `   ADD COLUMN ${colDef};`
  ].join('\n')
  
  await cliPromptRunMigration(
    settings,
    {
      isCurrentMigrationSql: false,
      schemaBefore: schema,
      sql
    }
  );
};