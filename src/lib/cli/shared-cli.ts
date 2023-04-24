import { isCancel, log, type SelectOptions } from '@clack/prompts';
import {
  RcSettingsError,
  getSettings,
  settingsDescriptions
} from './settings.js';
import {
  cancelAndExit,
  fmtPath,
  fmtVarName,
  getServerlessConnection,
  wait
} from './utils.js';
import colors from 'picocolors';
import type { FullSettings } from './types.js';
import type {
  DatabaseSchema,
  FieldDefinition,
  ModelDefinition
} from '$lib/api/types.js';
import { fetchSchemaFromDatabase, readSchemaJson } from './schema.js';
import { CURRENT_SCHEMA_JSON_FILE_NAME } from './constants.js';
import { select } from '@clack/prompts';
export const cliGetSettings = async (
  waitMessage?: string
): Promise<FullSettings> => {
  waitMessage = waitMessage || `Getting settings`;
  const s = wait(waitMessage);
  try {
    const settings = await getSettings();
    s.done();
    return settings;
  } catch (error) {
    s.error();
    if (error instanceof RcSettingsError) {
      const desc = settingsDescriptions[error.key];
      log.error(
        [
          `${colors.red('Invaild setting:')} ${desc.header} (${fmtVarName(
            error.key
          )})`,
          error.message,
          '',
          `Fix: ${colors.inverse(' frieda init ')}`,
          '',
          `Docs: ${fmtPath(`https://github.com/nowzoo/frieda#${error.key}`)}`,
          ''
        ].join('\n')
      );
      return cancelAndExit();
    }
    throw error;
  }
};

export const cliFetchSchema = async (
  settings: FullSettings,
  waitMessage?: string
): Promise<DatabaseSchema> => {
  waitMessage = waitMessage || `Fetching schema from database`;
  const s = wait(waitMessage);
  try {
    const schema = await fetchSchemaFromDatabase(
      getServerlessConnection(settings.databaseUrl)
    );
    s.done();
    return schema;
  } catch (error) {
    s.error();
    if (error instanceof Error) {
      log.error(
        [
          colors.red('Database error'),
          `The server said: ${error.message}`,
          ''
        ].join('\n')
      );
      return cancelAndExit();
    }
    throw error;
  }
};

export const cliReadSchemaJson = async (
  settings: FullSettings,
  waitMessage?: string
) => {
  waitMessage =
    waitMessage || `Reading ${fmtPath(CURRENT_SCHEMA_JSON_FILE_NAME)}`;
  const s = wait(waitMessage);
  try {
    const schema = await readSchemaJson(settings);
    s.done();
    return schema;
  } catch (error) {
    s.error();
    if (error instanceof Error) {
      log.error(
        [
          colors.red('Database error'),
          `The server said: ${error.message}`,
          ''
        ].join('\n')
      );
      return cancelAndExit();
    }
    throw error;
  }
};

export const promptModel = async (
  models: ModelDefinition[],
  search?: string
): Promise<ModelDefinition> => {
  const prompt = async (
    matchedModels: ModelDefinition[],
    filterStr: string
  ): Promise<ModelDefinition> => {
    const opts: {
      value: string;
      label: string;
      hint?: string;
    }[] = [
      ...matchedModels.map((m) => {
        return {
          label: m.modelName,
          value: m.modelName,
          hint: `table: ${m.tableName}`
        };
      })
    ];
    if (matchedModels.length < models.length) {
      opts.unshift({
        label: `Show all models`,
        value: '',
        hint: `(currently showing only models matching ${filterStr})`
      });
    }
    const modelName = await select({
      message: `Select model:`,
      options: opts,
      initialValue: ''
    });
    if (isCancel(modelName)) {
      return cancelAndExit();
    }
    const selected = models.find((m) => m.modelName === modelName);
    if (!selected) {
      return prompt([...models], '');
    }
    return selected;
  };
  const filterStr = search || '';
  const matched =
    filterStr.length > 0
      ? models.filter(
          (m) =>
            m.modelName.toLowerCase().startsWith(filterStr) ||
            m.tableName.toLowerCase().startsWith(filterStr)
        )
      : [];
  const selectedModel =
    matched.length === 1
      ? matched[0]
      : models.length === 1
      ? models[0]
      : await prompt(matched.length > 0 ? matched : models, filterStr);
  return selectedModel;
};

export const promptField = async (
  model: ModelDefinition,
  search?: string
): Promise<FieldDefinition> => {
  const prompt = async (
    matchedFields: FieldDefinition[],
    filterStr: string
  ): Promise<FieldDefinition> => {
    const opts: {
      value: string;
      label: string;
      hint?: string;
    }[] = [
      ...matchedFields.map((f) => {
        return {
          label: f.fieldName,
          value: f.fieldName,
          hint: `column: ${f.columnName}`
        };
      })
    ];
    if (matchedFields.length < model.fields.length) {
      opts.unshift({
        label: `Show all fields in ${model.modelName}`,
        value: '',
        hint: `(currently showing only fields matching ${filterStr})`
      });
    }
    const fieldName = await select({
      message: `Select field in ${model.modelName}:`,
      options: opts,
      initialValue: ''
    });
    if (isCancel(fieldName)) {
      return cancelAndExit();
    }
    const selected = model.fields.find((f) => f.fieldName === fieldName);
    if (!selected) {
      return prompt([...model.fields], '');
    }
    return selected;
  };
  const filterStr = search || '';
  const matched =
    filterStr.length > 0
      ? model.fields.filter(
          (m) =>
            m.fieldName.toLowerCase().startsWith(filterStr) ||
            m.columnName.toLowerCase().startsWith(filterStr)
        )
      : [];
  const selectedField =
    matched.length === 1
      ? matched[0]
      : model.fields.length === 1
      ? model.fields[0]
      : await prompt(matched.length > 0 ? matched : model.fields, filterStr);
  return selectedField;
};
