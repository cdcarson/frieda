import type { CommandModule } from 'yargs';
import { intro, log, outro, confirm, isCancel, select } from '@clack/prompts';
import colors from 'picocolors';
import { fmtPath, wait } from './utils.js';
import { fetchSchemaFromDatabase } from './schema.js';
import { parseModelDefinition } from './parse.js';

import {
  clearCurrentMigrationSql,
  readCurrentMigrationSql,
  writeCurrentSchemaFiles,
  writeGeneratedCode,
  writeMigrationFiles
} from './file-system.js';
import {
  getMysql2Connection,
  getServerlessConnection
} from './database-connections.js';
import type { FullSettings } from './types.js';
import { getSettings } from './settings.js';
import { CancelledByUserError, Mysql2QueryError } from './errors.js';
import { getCode } from './get-code.js';

export const migrateCommandModule: CommandModule = {
  command: 'migrate [filePath] [options]',
  handler: async (args) => {
    await cmd();
  },
  aliases: ['m'],
  describe: 'Run current migration.',
  builder: (b) => {
    return b.positional('filePath', {
      type: 'string',
      description:
        'Optional. Relative path to a migration file. Otherwise <schemaDirectory>/current-migration.sql will be read'
    });
  }
};

const cmd = async () => {
  intro(colors.bold(`Run current migration`));
  let s = wait('Getting settings');
  const settings = await getSettings();
  s.done();
  const {sql, srcPath} = await getCurrentMigration(settings);
  let completed = false;
  while(! completed) {
    completed = await runMigration(settings, sql, srcPath, true);
  }
  outro(colors.bold('Done.'));
};

const getCurrentMigration = async (settings: FullSettings): Promise<{sql: string, srcPath: string}> => {
  const s = wait('Reading current migration');
  const migrationFileResult = await readCurrentMigrationSql(settings);
  const migrationSql = migrationFileResult.contents
    ? migrationFileResult.contents.trim()
    : '';
  s.done();

  if (migrationSql.length === 0) {
    log.warn(`${fmtPath(migrationFileResult.relativePath)} is empty.`);
  }
  log.message(
    [
      colors.bold('Current Migration:'),
      colors.dim('-'.repeat(50)),
      '',
      migrationSql,
      '',
      colors.dim('-'.repeat(50)),
      ''
    ].join('\n')
  );

  const goAhead = await select({
    message: 'Run this migration?',
    options: [
      {
        label: 'Yes',
        value: 'yes',
        hint: 'Run the migration as it is above'
      },
      {
        label: 'Reload current migration',
        value: 'reload',
        hint: `You've edited ${fmtPath(migrationFileResult.relativePath)}`
      },
      {
        label: 'No',
        value: 'no',
        hint: 'Cancel'
      }
    ],
    initialValue: migrationSql.length === 0 ? 'no' : 'yes'
  });
  if (isCancel(goAhead) || goAhead === 'no') {
    throw new CancelledByUserError();
  }
  if (goAhead === 'reload') {
    return await getCurrentMigration(settings);
  }
  return {sql: migrationSql, srcPath: migrationFileResult.relativePath};
};

export const runMigrationQuery = async (
  settings: FullSettings,
  sql: string,
  srcPath: string
): Promise<boolean> => {
  const connection = await getMysql2Connection(settings.databaseUrl);
  const s = wait('Running migration');
  try {
    await connection.execute(sql);
    await connection.end();
    s.done();
    return true;
  } catch (error) {
    await connection.end();
    s.error();
    log.error(
      [
        colors.red('Migration failed'),
        `File: ${fmtPath(srcPath)}`,
        `Error:`,
        error instanceof Error ? error.message : 'Unknown error'
      ].join('\n')
    );
    const tryAgain = await select({
      message: 'Try again?',
      options: [
        {
          label: 'Yes',
          value: true,
          hint: `You've fixed the SQL in ${fmtPath(srcPath)}`
        },
        {
          label: 'No',
          value: false,
          hint: `Cancel migration`
        }
      ]
    });
    if (isCancel(tryAgain) || !tryAgain) {
      throw new CancelledByUserError;
    }
    return false;
  }
};

export const runMigration = async (
  settings: FullSettings,
  sql: string,
  srcPath: string,
  isFileCurrentMigration: boolean
): Promise<boolean> => {
  let s = wait('Fetching current schema');
  const serverlessConnection = getServerlessConnection(settings.databaseUrl);
  const schemaBefore = await fetchSchemaFromDatabase(serverlessConnection);
  s.done();
  const completed = await runMigrationQuery(settings, sql, srcPath);
  if (! completed) {
    return false;
  }
  s = wait('Fetching new schema');
  const schemaAfter = await fetchSchemaFromDatabase(serverlessConnection);
  s.done();
  s = wait('Saving new schema');
  const schemaFiles = await writeCurrentSchemaFiles(settings, schemaAfter);
  s.done();
  log.info(
    [
      'Current schema files:',
      ...schemaFiles.map((f) => `- ${f.relativePath}`)
    ].join('\n')
  );
  s = wait('Saving migration files');
  const migrationFiles = await writeMigrationFiles(settings, {
    date: schemaAfter.fetched,
    migrationSql: sql,
    schemaAfter,
    schemaBefore
  });
  if (isFileCurrentMigration) {
    await clearCurrentMigrationSql(settings);
  }
  
  s.done();
  log.info(
    ['Migration:', ...migrationFiles.map((f) => `- ${f.relativePath}`)].join(
      '\n'
    )
  );
  s = wait('Generating code');
  const models = schemaAfter.tables.map((t) =>
    parseModelDefinition(t, settings)
  );
  const codeFiles = await writeGeneratedCode(
    settings,
    getCode(models, settings)
  );
  s.done();
  log.info(
    ['Code:', ...codeFiles.map((f) => `- ${f.relativePath}`)].join('\n')
  );
  return true;
};
