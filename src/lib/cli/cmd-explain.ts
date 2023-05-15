import { fetchSchema } from './shared.js';
import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';
import { Explainer } from './explain.js';
import { getModelName } from '$lib/parse/model-parsers.js';

export const cmdExplain = async (
  cliArgs: Partial<CliArgs>,
  positionalArgs: string[]
) => {
  const { options, connection, databaseUrlResult } = await getOptions(cliArgs);
  const schema = await fetchSchema(connection);
  const [modelName] = positionalArgs;
  const explainer = new Explainer(schema, options, databaseUrlResult);
  if (modelName) {
    const search = modelName.trim().toLowerCase();
    const table = schema.tables.find((t) => {
      return (
        t.name.toLowerCase() === search ||
        getModelName(t).toLowerCase() === search
      );
    });
    if (table) {
      explainer.showModelFieldTypes(table);
      console.log();
      return await explainer.promptModelScreen(table);
    } else {
      return await explainer.promptModel(search);
    }
  }

  await explainer.explain();
};
