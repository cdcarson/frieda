import type { FetchedSchema, FetchedTable } from '../fetch/types.js';
import { getModelName } from '../parse/model-parsers.js';
import { prompt } from './ui/prompt.js';

export const promptModel = async (
  schema: FetchedSchema,
  partialName?: string
): Promise<FetchedTable> => {
  type Choice = {
    title: string;
    value: FetchedTable;
  };
  const choices: Choice[] = schema.tables.map((t) => {
    return {
      title: getModelName(t),
      value: t
    };
  });

  const suggest = (inp: string, choices: Choice[]) => {
    return choices.filter(
      (c) =>
        c.title.toLowerCase().startsWith(inp.toLowerCase()) ||
        c.value.name.toLowerCase().startsWith(inp.toLowerCase())
    );
  };
  const initialChoice = suggest(partialName || '', choices)[0] || choices[0];
  const table: FetchedTable = await prompt<FetchedTable>({
    type: 'autocomplete',
    name: 'model',
    message: 'Model',
    initial: initialChoice.title,
    choices,
    limit: 5,
    suggest: async (inp: string, choices) => {
      return suggest(inp, choices as Choice[]);
    }
  });
  return table;
};
