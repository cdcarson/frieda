import { connect } from '@planetscale/database';
import { getOptions } from './options/get-options.js';
import type { CliArgs, FetchedTable } from './types.js';
import { fetchAndParseSchema } from './fetch-and-parse-schema.js';
import { promptModel } from './ui/prompt-model.js';
import log from './ui/log.js';
import colors from 'kleur';
import { fmtVal, getStdOutCols, squishWords } from './utils/formatters.js';
import { fmtVarName } from './utils/formatters.js';
import { getFieldNotes } from './utils/get-field-notes.js';

type CmdOpts = CliArgs & {
  modelName: string;
};
export const cmdModel = async (cliArgs: Partial<CmdOpts>) => {
  const { databaseUrlResult, options } = await getOptions(cliArgs);

  const connection = connect({ url: databaseUrlResult.databaseUrl });
  const { schema, fetchedSchema } = await fetchAndParseSchema(
    connection,
    options
  );
  const search = cliArgs.modelName ? cliArgs.modelName.toLowerCase() : '';
  const model =
    schema.models.find(
      (m) =>
        m.modelName.toLowerCase() === search ||
        m.tableName.toLowerCase() === search
    ) || (await promptModel(schema.models, cliArgs.modelName));
  const table = fetchedSchema.tables.find(
    (t) => t.name === model.tableName
  ) as FetchedTable;
  const modelNotes = [
    `Primary key(s): ${model.fields.filter(f => f.isPrimaryKey).map(f => fmtVarName(f.fieldName)).join(', ')}`,
    ...model.fields.flatMap(f => getFieldNotes(model, f))
  ]
  console.log();
  const fieldWidth =
    Math.max(...model.fields.map((f) => f.fieldName.length), 'Field'.length) +
    2;
  const typeWidth =
    Math.max(
      ...model.fields.map((f) => f.javascriptType.length),
      'JS Type'.length
    ) + 2;
  const dbTypeWidth =
    Math.max(...model.fields.map((f) => f.mysqlFullType.length), 'Db Type'.length) +
    2;
  const fields = model.fields.map((f) => {
    const spacesAfterName = ' '.repeat(fieldWidth - f.fieldName.length);
    const spacesAfterType = ' '.repeat(typeWidth - f.javascriptType.length);
    const spacesAfterDbType = ' '.repeat(dbTypeWidth - f.mysqlFullType.length);
    return `${fmtVarName(f.fieldName)}${spacesAfterName}${fmtVal(
      f.javascriptType
    )}${spacesAfterType}${colors.dim(f.mysqlFullType)}${spacesAfterDbType}${
      colors.dim(
      f.isPrimaryKey ? ' x ' : '   ')
    }`;
  });

  log.header('Model');
  log.message([
    `Model name: ${fmtVal(model.modelName)}`,
    `Table name: ${fmtVal(model.tableName)}`,
    '',
    `Field${' '.repeat(fieldWidth - 'Field'.length)}JS Type${' '.repeat(
      typeWidth - 'JS Type'.length
    )}Db Type${' '.repeat(dbTypeWidth - 'Db Type'.length)}PRI`,
    ...fields,
    '',
    'Notes:',
    ...modelNotes.flatMap(s => {
      return squishWords(s, getStdOutCols() - 4).split('\n').map((s, i) => i === 0 ? ` - ${s}` : `   ${s}`)
    })
  ]);

  console.log();
  // log.header('CREATE TABLE')
  log.message(table.createSql.split('\n'));
  log.footer();
  console.log();

  // console.log(model)
};

