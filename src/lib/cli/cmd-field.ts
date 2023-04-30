import parser from 'yargs-parser';


import { getSettings } from './settings.js';
import { fetchSchemaFromDatabase } from './schema.js';
import { promptModel } from './prompts/prompt-model.js';
import { promptField } from './prompts/prompt-field.js';

export const cmdField = async (rawArgs: string[]) => {
  const settings = await getSettings();
  const { schema, models } = await fetchSchemaFromDatabase(settings);
  const args = parser(rawArgs, {
    alias: {model: ['m'], field: ['f']}
  })
  const model = await promptModel(models, args.model);
  const field = await promptField(model, args.field)
};