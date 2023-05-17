import { getFieldName, getJavascriptType } from '$lib/parse/field-parsers.js';
import { getModelName } from '$lib/parse/model-parsers.js';
import kleur from 'kleur';
import { Explorer } from './explorer.js';
import { getOptions } from './options/get-options.js';
import { fetchSchema, generateCode } from './shared.js';
import type { CliArgs } from './types.js';
import log from './ui/log.js';
import { fmtVal, fmtVarName } from './ui/formatters.js';
import { prompt } from './ui/prompt.js';

export const cmdType = async (
  cliArgs: Partial<CliArgs>,
  positionalArgs: string[]
) => {
  const { connection, options, databaseUrlResult } = await getOptions(cliArgs);
  const schema = await fetchSchema(connection);
  const explorer = new Explorer(schema, options, databaseUrlResult, connection);
  const [modelName, fieldName] = positionalArgs;
  console.log();
  const table = await explorer.getModel(modelName);
  const column = await explorer.getField(table, fieldName);

  const explanation = explorer.explainJsType(column);

  log.info(
    'Field ' +
      fmtVarName(getFieldName(column)) +
      ' in ' +
      kleur.bold(getModelName(table))
  );
  log.table(
    [
      [
        fmtVarName(getFieldName(column)),
        fmtVal(getJavascriptType(column, options)),
        kleur.dim(column.Type)
      ]
    ],
    ['Field', 'Javascript Type', 'Column Type']
  );
  log.info(`Typed: ${explanation}`);
  console.log();

  await explorer.modifyField(table, column);
};
