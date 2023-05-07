import { fetchSchema } from '../fetch-schema/fetch-schema.js';
import { getOptions } from '../options/get-options.js';
import type { CliArgs, FetchedTable } from '../types.js';
import { parseModelDefinitions } from '../parse/parse-model-definitions.js';
import { promptModel } from '../ui/prompt-model.js';
import colors from 'kleur';
import log from '../ui/log.js';
import { fmtVal, squishWords } from '../utils/formatters.js';
type CmdOpts = CliArgs & {
  modelName: string
}
export const cmd = async (cliArgs: Partial<CmdOpts>) => {
  const options = await getOptions(cliArgs);
  const schema = await fetchSchema(options.connection);
  const models =  parseModelDefinitions(schema, options);
  const model = await promptModel(models, (cliArgs as {_: string[]})._[1] || '');
  const table = schema.tables.find(t => t.name == model.tableName) as FetchedTable;

  log.empty()
  log.info(`Model Name: ${fmtVal(model.modelName)}`)
  log.info(`Table Name: ${fmtVal(model.tableName)}`)
  log.info(['Create Table:', ...table.createTableSql.split(`\n`)])
  log.empty()
  // console.log(model)
};
