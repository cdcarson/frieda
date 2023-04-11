import { confirm, log, intro, outro, isCancel } from '@clack/prompts';

import {
  cancelAndExit,
  formatFilePath,
  getServerlessConnection,
} from './shared/utils.js';

import colors from 'picocolors';

import { COMMANDS } from './shared/commands.js';
import { getSettings } from './shared/settings.js';
import { readCurrentMigration, runCurrentMigration } from './shared/migrate.js';
import { generate } from './shared/generate.js';

export const cmdMigrate = async () => {
  const cmd = COMMANDS.migrate;
  intro(`${colors.bold(cmd.id)}${colors.dim(`: ${cmd.description}`)}`);
  const settings = await getSettings();
  const sql = await readCurrentMigration(settings.currentMigrationFullPath);
  if (sql.length === 0) {
    log.warn(`${formatFilePath(settings.currentMigrationFullPath)} is empty.`);
    cancelAndExit();
  }
  log.message([
    colors.dim('Current Migration SQL'),
    colors.dim('---------------------'),
    sql
  ].join('\n'));

  const goAhead = await confirm({
    message: 'Continue?'
  });
  if (isCancel(goAhead) || ! goAhead) {
    return cancelAndExit();
  }
  const schema = await runCurrentMigration(
    settings,
    getServerlessConnection(settings.databaseUrl)
  );
  const generateCode = await confirm({
    message: 'Generate code?'
  })
  if (generateCode === true) {
    await generate(schema, settings)
  }
  outro(colors.bold('Done.'));
};
