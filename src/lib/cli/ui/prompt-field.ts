import type { ExtendedModelDefinition, ExtendedFieldDefinition } from '../../parse/types.js';
import { prompt } from './prompt.js';

export const promptField = async (
  model: ExtendedModelDefinition,
  search = ''
): Promise<ExtendedFieldDefinition> => {
  type Choice = {
    title: string;
    value: ExtendedFieldDefinition;
  };
  const choices: Choice[] = model.fields.map((f) => {
    return {
      title: f.fieldName,
      value: f
    };
  });

  const suggest = (inp: string, choices: Choice[]) => {
    return choices.filter(
      (c) =>
        c.title.toLowerCase().startsWith(inp.toLowerCase()) ||
        c.value.fieldName.toLowerCase().startsWith(inp.toLowerCase())
    );
  };
  const initialChoice = suggest(search, choices)[0] || choices[0];

  const field = await prompt<ExtendedFieldDefinition>({
    type: 'autocomplete',
    message: 'Field',
    name: 'field',
    initial: initialChoice.title,
    choices,
    limit: 5,
    suggest: async (inp: string, choices) => {
      return suggest(inp, choices as Choice[]);
    }
  });
  return field;
};
