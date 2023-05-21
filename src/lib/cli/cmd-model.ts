import {
  getModelName
} from '$lib/parse/model-parsers.js';
import type { FetchedSchema, FetchedTable } from '$lib/fetch/types.js';
import { promptModel } from './prompt-model.js';
import prompts from 'prompts';
import {
  showBaseModelType,
  showCreateDataType,
  showFindUniqueType,
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

type What = 'fields' | 'createTable' | 'modelTypes' | 'indexes' | 'exit';

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
  let what: What = 'fields'
  while (what !== 'exit') {
    console.log();
    switch (what) {
      case 'fields':
        log.header(`Fields | Model: ${getModelName(table)}`);
        showModelFields(table);
        log.footer();
        break;
      case 'modelTypes':
        log.header(`Model Types | Model: ${getModelName(table)}`);
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
        log.footer();
        break;

      case 'createTable':
        log.header(`CREATE TABLE | Model: ${getModelName(table)}`);
        showModelCreateTable(table);
        log.footer();
        break;

      case 'indexes':
        log.header(`Indexes | Model: ${getModelName(table)}`);
        showModelIndexes(table);
        console.log();
        showModelSearchIndexes(table);
        log.footer();
        break;
    }
    //log.footer()
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
      title: `Fields`,
      value: 'fields'
    },
    {
      title: `Model Types`,
      value: 'modelTypes'
    },

    {
      title: `Indexes`,
      value: 'indexes'
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
  const initial = Math.max(
    choices.findIndex((c) => lastWhat === c.value),
    0
  );

  return await prompt<What>({
    type: 'select',
    initial,
    name: 'showWhat',
    choices,
    message: `Model: ${getModelName(table)} | Show:`
  });
};
