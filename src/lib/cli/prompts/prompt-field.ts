import type { FieldDefinition, ModelDefinition } from '$lib/api/types.js';
import prompts from 'prompts';
import { onPromptCancel } from './on-prompt-cancel.js';
export const promptField = async (
  model: ModelDefinition,
  search = ''
): Promise<FieldDefinition> => {
  type Choice = {
    title: string;
    value: FieldDefinition;
  };
  const choices: Choice[] = model.fields.map((f) => {
    return {
      title: f.fieldName,
      value: f
    };
  });
  const suggest = (inp: string, choices: Choice[]) => {
    return choices.filter((c) =>
      c.title.toLowerCase().startsWith(inp.toLowerCase())
    );
  };
  const initialChoice = suggest(search, choices)[0] || choices[0];

  const { field } = await prompts(
    {
      type: 'autocomplete',
      message: 'Field',
      name: 'field',
      initial: initialChoice.title,
      choices,
      suggest: async (inp: string, choices) => {
        return suggest(inp, choices as Choice[]);
      }
    },
    { onCancel: onPromptCancel }
  );
  return field;
};
