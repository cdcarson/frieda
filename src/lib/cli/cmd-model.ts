import type { ExtendedModelDefinition } from '$lib/parse/types.js';
import { getSchema } from './get-schema.js';
import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';
import { fmtVal, fmtVarName } from './ui/formatters.js';
import log from './ui/log.js';
import { promptModel } from './ui/prompt-model.js';
import colors from 'kleur';
type CmdOpts = CliArgs & {
  modelName: string;
};
export const cmdModel = async (cliArgs: Partial<CmdOpts>) => {
  const { options, connection } = await getOptions(cliArgs);
  const schema = await getSchema(options, connection);

  const search = cliArgs.modelName ? cliArgs.modelName.toLowerCase() : '';
  const model =
    schema.models.find(
      (m) =>
        m.modelName.toLowerCase() === search ||
        m.tableName.toLowerCase() === search
    ) || (await promptModel(schema.models, cliArgs.modelName));

  logModel(model);
};

const logModel = (model: ExtendedModelDefinition) => {
  const fieldWidth =
    Math.max(...model.fields.map((f) => f.fieldName.length), 'Field'.length) +
    2;
  const typeWidth =
    Math.max(
      ...model.fields.map((f) => f.javascriptType.length),
      'JS Type'.length
    ) + 2;
  const dbTypeWidth =
    Math.max(
      ...model.fields.map((f) => f.mysqlFullType.length),
      'Db Type'.length
    ) + 2;
  const fields = model.fields.map((f) => {
    const spacesAfterName = ' '.repeat(fieldWidth - f.fieldName.length);
    const spacesAfterType = ' '.repeat(typeWidth - f.javascriptType.length);
    const spacesAfterDbType = ' '.repeat(dbTypeWidth - f.mysqlFullType.length);
    return `${fmtVarName(f.fieldName)}${spacesAfterName}${fmtVal(
      f.javascriptType
    )}${spacesAfterType}${colors.dim(
      f.mysqlFullType
    )}${spacesAfterDbType}${colors.dim(f.primaryKey ? ' x ' : '   ')}`;
  });

  log.header(`Model: ${model.modelName}`);
  log.message([
    `Model name: ${fmtVal(model.modelName)}`,
    `Table name: ${fmtVal(model.tableName)}`,
    '',
    `Field${' '.repeat(fieldWidth - 'Field'.length)}JS Type${' '.repeat(
      typeWidth - 'JS Type'.length
    )}Db Type${' '.repeat(dbTypeWidth - 'Db Type'.length)}PRI`,
    ...fields
  ]);

  log.footer();
};
