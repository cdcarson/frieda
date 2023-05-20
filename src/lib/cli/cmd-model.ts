import { getModelCreateDataTypeName, getModelFindUniqueTypeName, getModelName, getModelPrimaryKeyTypeName, getModelSelectAllTypeName, getModelUpdateDataTypeName } from '$lib/parse/model-parsers.js';
import type { FetchedSchema, FetchedTable } from '$lib/fetch/types.js';
import { promptModel } from './prompt-model.js';
import {
  modelPreamble,
  showBaseModelType,
  showCreateDataType,
  showFindUniqueType,
  showModel,
  showModelCreateTable,
  showModelFields,
  showModelIndexes,
  showModelSearchIndexes,
  showPrimaryKeyType,
  showSelectAllModelType,
  showUpdateDataType
} from './show.js';
import { prompt } from './ui/prompt.js';
import log from './ui/log.js';

type What =
  | 'fields'
  | 'createTable'
  | 'baseModelType'
  | 'selectAllType'
  | 'primaryKeyType'
  | 'createDataType'
  | 'updateDataType'
  | 'findUniqueType'
  | 'indexes'
  | 'searchIndexes'
  | 'exit';

type WhatNext = {
  title: string;
  value: What;
};

export const cmdModel = async (
  schema: FetchedSchema,
  positionalArgs: string[]
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
  let what: What = await promptShowWhat(table, 'fields')
  while (what !== 'exit') {
    console.log()
    switch (what) {
      case 'fields':
        showModelFields(table);
        break;
      case 'baseModelType':
        showBaseModelType(table);
        break;
      case 'createDataType':
        showCreateDataType(table);
        break;
      case 'updateDataType':
        showUpdateDataType(table);
        break;
      case 'createTable':
        showModelCreateTable(table);
        break;
      case 'findUniqueType':
        showFindUniqueType(table);
        break;
      case 'indexes':
        showModelIndexes(table);
        break;
      case 'searchIndexes':
        showModelSearchIndexes(table);
        break;
      case 'primaryKeyType':
        showPrimaryKeyType(table);
        break;
      case 'selectAllType':
        showSelectAllModelType(table);
        break;
    }
    //log.footer()
    console.log();
    what = await promptShowWhat(table, what);
  }
  
};

const promptShowWhat = async (table: FetchedTable, lastWhat: What): Promise<What> => {

  const choices: WhatNext[] = [
    {
      title: `Fields`,
      value: 'fields'
    },
    {
      title:  `Model Type`,
      value: 'baseModelType'
    },

    {
      title: `SELECT * Type`,
      value: 'selectAllType'
    },
    {
      title: `Primary Key Type`,
      value: 'primaryKeyType'
    },
    {
      title: `Create Data Type`,
      value: 'createDataType'
    },
    {
      title: `Update Data Type`,
      value: 'updateDataType'
    },
    {
      title: `Find Unique Type`,
      value: 'findUniqueType'
    },
    {
      title: `Indexes`,
      value: 'indexes'
    },
    {
      title: `Search Indexes`,
      value: 'searchIndexes'
    },
    {
      title: 'CREATE TABLE sql',
      value: 'createTable'
    },
    {
      title: 'Exit',
      value: 'exit'
    }
  ];
  const initial = Math.max(choices.findIndex(c => lastWhat === c.value), 0);
  
  return await prompt<What>({
    type: 'select',
    initial,
    name: 'showWhat',
    choices,
    message: `Model: ${getModelName(table)} | Show:`
  });
};
