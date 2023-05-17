import { fetchSchema } from './shared.js';
import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';
import { getModelName } from '$lib/parse/model-parsers.js';
import { Explorer } from './explorer.js';
import log from './ui/log.js';

export const cmdModel = async (
  cliArgs: Partial<CliArgs>,
  positionalArgs: string[]
) => {
  const { options, connection, databaseUrlResult } = await getOptions(cliArgs);
  const schema = await fetchSchema(connection);
  const [modelName] = positionalArgs;
  const explorer = new Explorer(schema, options, databaseUrlResult, connection);
  const table = await explorer.getModel(modelName);
  await explorer.showModel(table)
};
