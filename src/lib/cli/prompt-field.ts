import type { Column } from '$lib/index.js';
import { getFieldName } from '$lib/parse/field-parsers.js';
import type { FetchedTable } from '../fetch/types.js';
import { prompt } from './ui/prompt.js';

export const promptField = async (
  table: FetchedTable,
  partialName?: string
): Promise<Column> => {
  type Choice = {
    title: string;
    value: Column;
  };
  const choices: Choice[] = table.columns.map((c) => {
    return {
      title: getFieldName(c),
      value: c
    };
  });

  const suggest = (inp: string, choices: Choice[]) => {
    return choices.filter(
      (c) =>
        c.title.toLowerCase().startsWith(inp.toLowerCase()) ||
        c.value.Field.toLowerCase().startsWith(inp.toLowerCase())
    );
  };
  const initialChoice = suggest(partialName || '', choices)[0] || choices[0];
  const column: Column = await prompt<Column>({
    type: 'autocomplete',
    name: 'model',
    message: 'Field',
    initial: initialChoice.title,
    choices,
    limit: 5,
    suggest: async (inp: string, choices) => {
      return suggest(inp, choices as Choice[]);
    }
  });
  return column;
};
