import { isCancel, select } from '@clack/prompts';
import type { Model, ModelSchema } from '../../api/shared.server.js';
import { cancelAndExit } from './utils.js';

export const promptModel = async (
  models: ModelSchema<Model>[],
  nameFilter: string | null = null
): Promise<ModelSchema<Model>> => {
  const modelsToShow = models
    .filter((m) => {
      if (nameFilter) {
        return m.modelName.toLowerCase().indexOf(nameFilter.toLowerCase()) > -1;
      }
      return true;
    })
    .sort((a, b) => {
      return nameFilter
        ? a.modelName.toLowerCase().indexOf(nameFilter.toLowerCase()) -
            b.modelName.toLowerCase().indexOf(nameFilter.toLowerCase())
        : 0;
    });

  const options: {
    value: ModelSchema<Model> | 'clear name filter';
    label: string;
  }[] =
    modelsToShow.length > 0
      ? modelsToShow.map((m) => {
          return { label: m.modelName, value: m };
        })
      : models.map((m) => {
          return { label: m.modelName, value: m };
        });
  if (modelsToShow.length > 0 && nameFilter) {
    options.push({
      label: `Filtered by "${nameFilter}". Clear filter`,
      value: 'clear name filter'
    });
  }

  const value = await select({
    message: 'Model:',
    options
  });
  if (isCancel(value)) {
    return cancelAndExit();
  }
  if (value === 'clear name filter') {
    return promptModel(models);
  }
  return value as ModelSchema<Model>;
};
