import type { CommandModule } from 'yargs';
import { intro, log, outro, confirm, isCancel } from '@clack/prompts';
import colors from 'picocolors';
import {
  cancelAndExit,
  fmtPath,
  getServerlessConnection,
  wait
} from './utils.js';
import { fetchSchemaFromDatabase } from './schema.js';
import { parseModelDefinition } from './parse.js';
import { CURRENT_MODELS_JSON_FILE_NAME } from './constants.js';
import { generateCode } from './generate-code.js';
import {
  readCurrentMigration,
  runMigration,
  archiveMigration
} from './migrate.js';
import { getCurrentMigrationSqlPath } from './paths.js';
import { cliFetchSchema, cliGetSettings } from './shared-cli.js';

type Args = {
  skipFetch?: boolean;
};
export const migrateCommandModule: CommandModule = {
  command: 'migrate',
  handler: async (args) => {
    cmd(args as Args);
  },
  aliases: ['m'],
  describe: 'Run current migration.',
  builder: (b) => {
    return b.options({
      'skip-fetch': {
        alias: 's',
        boolean: true,
        description: `Skip fetching the schema. Use ${CURRENT_MODELS_JSON_FILE_NAME} instead.`
      }
    });
  }
};

const cmd = async (args: Args) => {
  intro(colors.bold(`Run current migration`));
  const settings = await cliGetSettings();
  const sql = await readCurrentMigration(settings);
  if (sql.length === 0) {
    const { relativePath } = getCurrentMigrationSqlPath(settings);
    log.warn(`${fmtPath(relativePath)} is empty.`);
    return cancelAndExit();
  }
  log.message(
    [
      colors.gray(`--- Migration ---`),
      sql,
      colors.gray(`-----------------`)
    ].join('\n')
  );
  const goAhead = await confirm({
    message: 'Run migration?'
  });

  if (isCancel(goAhead) || goAhead === false) {
    return cancelAndExit();
  }
  let schemaWait = wait('Fetching current schema');
  const schemaBefore = await fetchSchemaFromDatabase(
    getServerlessConnection(settings.databaseUrl)
  );
  schemaWait.done();
  try {
    await runMigration(settings, sql, true);
  } catch (error) {
    log.error(
      [colors.red('Migration failed'), (error as Error).message].join('\n')
    );
  }
  schemaWait = wait('Fetching new schema');
  const schemaAfter = await fetchSchemaFromDatabase(
    getServerlessConnection(settings.databaseUrl)
  );
  schemaWait.done();
  const archivedMigrationPaths = await archiveMigration(
    settings,
    sql,
    schemaBefore,
    schemaAfter,
    true,
    true
  );

  const schema = await cliFetchSchema(settings);
  const models = schema.tables.map((t) => parseModelDefinition(t, settings));

  const s = wait(`Generating code`);
  const codes = await generateCode(models, settings);
  s.done();
  log.success(
    ['Generated code:', ...codes.map((f) => ` - ${fmtPath(f)}`)].join('\n')
  );

  log.success(
    [
      'Migration archived:',
      ...archivedMigrationPaths.map((f) => `- ${fmtPath(f)}`)
    ].join(`\n`)
  );

  outro(colors.bold('Done.'));
};
