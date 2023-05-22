import { getModelName } from '$lib/parse/model-parsers.js';
import type { FetchedSchema, FetchedTable } from '$lib/fetch/types.js';
import { promptModel } from './prompt-model.js';
import {
  showBaseModelType,
  showCreateDataType,
  showFindUniqueType,
  showModelCreateTable,
  showModelFields,
  showModelIndexes,
  showModelPreamble,
  showModelPrimaryKeys,
  showModelSearchIndexes,
  showPrimaryKeyType,
  showRawColumns,
  showSelectAllModelType,
  showUpdateDataType
} from './show.js';
import { prompt } from './ui/prompt.js';
import log from './ui/log.js';
import { promptField } from './prompt-field.js';
import { getFieldModifications, type FieldModification, runSql, addField } from './modify.js';
import type { Connection } from '@planetscale/database';
import { cliFetchSchema } from './cli-fetch-schema.js';
import { cliGenerateCode } from './cli-generate-code.js';
import type { Options } from './types.js';

type What =
  | 'fields'
  | 'modelTypes'
  | 'rawColumns'
  | 'createTable'
  | 'indexes'
  | 'modifyColumn'
  | 'addColumn'
  | 'otherModel'
  | 'exit';

type WhatNext = {
  title: string;
  value: What;
};

export const cmdModel = async (
  schema: FetchedSchema,
  positionalArgs: string[],
  connection: Connection,
  options: Options
) => {
  const [modelName] = positionalArgs;
  let table: FetchedTable;
  const s = (modelName || '').trim().toLowerCase();
  const matches = schema.tables.filter((t) => {
    return (
      t.name.toLowerCase().startsWith(s) ||
      getModelName(t).toLowerCase().startsWith(s)
    );
  });
  if (matches.length === 1) {
    table = matches[0];
  } else {
    table = await promptModel(schema, modelName);
  }
  console.log();
  let what: What = 'fields';
  while (what !== 'exit') {
    console.log();
    if ('otherModel' === what) {
      table = await promptModel(schema, table.name);

    }
    if ('modifyColumn' === what) {
      const column = await promptField(table);
      const mods: FieldModification[] = getFieldModifications(table, column);
      const mod = await prompt<FieldModification>({
        type: 'select',
        name: 'mod',
        message: 'Modification',
        choices: mods.map(mod => {
          return {
            title: mod.description,
            value: mod
          }
        })
      })
      const statement = await mod.getSql();
      const success = await runSql(connection, statement);
      if (success) {
        schema = await cliFetchSchema(connection);
        await cliGenerateCode(schema, options);
        const newTable = schema.tables.find(t => t.name === table.name);
        if (! newTable) {
          table = await promptModel(schema, table.name);
        } else {
          table = newTable;
        }
      } 
    }
    if ('addColumn' === what) {
      const success = await addField(table, connection);
      if (success) {
        schema = await cliFetchSchema(connection);
        await cliGenerateCode(schema, options);
        const newTable = schema.tables.find(t => t.name === table.name);
        if (! newTable) {
          table = await promptModel(schema, table.name);
        } else {
          table = newTable;
        }
      } 
    }
    switch (what) {
      case 'addColumn':      
      case 'modifyColumn':
      case 'otherModel':
      case 'fields':
        log.header(`↓ Model Fields: ${getModelName(table)}`);
        showModelPreamble(table);
        console.log();
        showModelFields(table);
        console.log();
        showModelPrimaryKeys(table)
        log.header(`↑ Model Fields: ${getModelName(table)}`);
        break;
      case 'modelTypes':
        log.header(`↓ Model Types: ${getModelName(table)}`);
        showModelPreamble(table);
        console.log();
        showBaseModelType(table);
        console.log();
        showSelectAllModelType(table);
        console.log();
        showPrimaryKeyType(table);
        console.log();
        showCreateDataType(table);
        console.log();
        showUpdateDataType(table);
        console.log();
        showFindUniqueType(table);
        log.header(`↑ Model Types: ${getModelName(table)}`);
        break;
      case 'createTable':
        log.header(`↓ Create Table: ${getModelName(table)}`);
        showModelPreamble(table);
        console.log();
        showModelCreateTable(table);
        log.header(`↑ Create Table: ${getModelName(table)}`);
        break;
      case 'indexes':
        log.header(`↓ Indexes: ${getModelName(table)}`);
        showModelPreamble(table);
        console.log();
        showModelIndexes(table);
        console.log();
        showModelSearchIndexes(table);
        log.header(`↑ Indexes: ${getModelName(table)}`);
        break;
      case 'rawColumns':
        log.header(`↓ Columns: ${getModelName(table)}`);
        showModelPreamble(table);
        console.log();
        showRawColumns(table);
        log.header(`↑ Columns: ${getModelName(table)}`);
        break;
      
        
        
    }
    console.log();
    what = await promptShowWhat(table, what);
  }
};

const promptShowWhat = async (
  table: FetchedTable,
  lastWhat: What
): Promise<What> => {
  const choices: WhatNext[] = [
    {
      title: `Show Model Fields`,
      value: 'fields'
    },
    {
      title: 'Show Columns',
      value: 'rawColumns'
    },
    {
      title: `Show Model Types`,
      value: 'modelTypes'
    },
    {
      title: `Show Indexes`,
      value: 'indexes'
    },
    {
      title: `Show CREATE TABLE`,
      value: 'createTable'
    },
    {
      title: `Modify Field`,
      value: 'modifyColumn'
    },
    {
      title: `Add Field`,
      value: 'addColumn'
    },

    {
      title: `Show Another Model`,
      value: 'otherModel'
    },

    {
      title: 'Exit',
      value: 'exit'
    }
  ];
  const initial = Math.max(
    choices.findIndex((c) => lastWhat === c.value),
    0
  );

  return await prompt<What>({
    type: 'select',
    initial,
    name: 'showWhat',
    choices,
    message: `Model: ${getModelName(table)}`
  });
};
