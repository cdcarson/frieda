import parser from 'yargs-parser';
import {
  cliFetchSchema,
  cliGetSettings,
  promptField,
  promptModel,
  cliPromptRunMigration
} from './cli.js';
import colors from 'picocolors';
import { log } from '@clack/prompts';
import { squishWords } from './utils.js';


export const cmdDropModels = async (rawArgs: string[]) => {
  const settings = await cliGetSettings();
  const { schema, models } = await cliFetchSchema(settings);

  
  const sql = models.map(m => `DROP TABLE \`${m.tableName}\`;`).join('\n')
  
 
  await cliPromptRunMigration(
    settings,
    {
      schemaBefore: schema,
      sql
    }
  );
};
