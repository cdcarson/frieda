import type { FetchedSchema } from '$lib/fetch/types.js';
import { raw, type Sql } from 'sql-template-tag';
import log from './ui/log.js';
import kleur from 'kleur';
import { prompt } from './ui/prompt.js';
import ora from 'ora';
import { writeSchema } from './write-schema.js';
import type { GetOptionsResult } from './types.js';
import { fetchSchema } from '$lib/fetch/fetch-schema.js';
import { edit } from 'external-editor';
import { fmtPath } from './ui/formatters.js';
import { format } from 'sql-formatter';

export const runMigration = async (
  options: GetOptionsResult,
  statement: Sql,
  previousSchema: FetchedSchema
): Promise<FetchedSchema | null> => {
  const sqlStr = format(statement.sql, { language: 'mysql' });
  log.info([
    kleur.bold('Migration SQL'),
    ...sqlStr.split('\n').map((s) => kleur.red(s))
  ]);
  const ok = await prompt({
    type: 'confirm',
    message: 'Run SQL',
    name: 'ok'
  });
  if (!ok) {
    return null;
  }
  const spin = ora('Executing statement').start();
  try {
    await options.connection.execute(statement.sql);
    spin.text = `Fetching new schema`;
    const schema = await fetchSchema(options.connection);
    spin.text = `Saving migration`;
    const files = await writeSchema(schema, options.options, {
      previousSchema,
      migration: sqlStr
    });
    spin.succeed('Migration complete.');
    log.info([
      kleur.bold('Files'),
      ...files.map((f) => `- ${fmtPath(f.relativePath)}`)
    ]);
    return schema;
  } catch (error) {
    spin.fail(kleur.red('Migration failed: ') + (error as Error).message);
    const editIt = await prompt({
      type: 'confirm',
      name: 'e',
      message: 'Edit SQL manually?'
    });
    if (editIt) {
      const newSql = edit(statement.sql);
      return await runMigration(options, raw(newSql), previousSchema);
    }
    return null;
  }
};
