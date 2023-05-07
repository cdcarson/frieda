import type { ModelDefinition } from '$lib/api/types.js';
import { prompt } from './prompt.js';

export const promptModel = async (
  models: ModelDefinition[],
  search = ''
): Promise<ModelDefinition> => {
  type Choice = {
    title: string;
    value: ModelDefinition;
  };
  const choices: Choice[] = models.map((m) => {
    return {
      title: m.modelName,
      value: m
    };
  });

  const suggest = (inp: string, choices: Choice[]) => {
    return choices.filter((c) =>
      c.title.toLowerCase().startsWith(inp.toLowerCase()) || c.value.tableName.toLowerCase().startsWith(inp.toLowerCase())
    );
  };
  const initialChoice = suggest(search, choices)[0] || choices[0];

  const model = await prompt<ModelDefinition>(
    {
      type: 'autocomplete',
      message: 'Model',
      name: 'model',
      initial: initialChoice.title,
      choices,
      limit: 5,
      suggest: async (inp: string, choices) => {
        return suggest(inp, choices as Choice[]);
      }
    }
   
  );
  return model;
};
