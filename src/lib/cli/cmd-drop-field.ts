import parser from 'yargs-parser';
import {
  cliFetchSchema,
  cliGetSettings,
  promptField,
  promptModel,
  cliPromptRunMigration
} from './cli.js';


export const cmdDropField = async (rawArgs: string[]) => {
  const settings = await cliGetSettings();
  const { schema, models } = await cliFetchSchema(settings);
  const args = parser(rawArgs, {
    alias: { model: ['m'], field: ['f'] },
    string: ['model', 'field']
  });
  const model = await promptModel(
    models,
    typeof args.model === 'string' ? args.model : ''
  );
  const field = await promptField(
    model,
    typeof args.field === 'string' ? args.field : ''
  );


  let sql = [
    `ALTER TABLE \`${model.tableName}\``,
    `  DROP COLUMN \`${field.columnName}\`;`
  ].join('\n');

 
  await cliPromptRunMigration(
    settings,
    {
      schemaBefore: schema,
      sql
    }
  );
};
