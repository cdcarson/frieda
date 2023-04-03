import { promptMigrationsDirectory } from './shared/prompt-migrations-directory.js';
import type { FriedaVars } from './shared/types.js';
import {intro, outro, spinner, log, confirm, isCancel} from '@clack/prompts'
import { promptDatabaseUrl } from './shared/prompt-database-url.js';
import { getServerlessConnection } from './shared/get-serverless-connection.js';
import { formatFilePath, getCurrentSchemaFilePath, getMigrationsDirectoryFullPath, replaceDatabaseURLPassword } from './shared/utils.js';
import colors from 'picocolors'
import { cancelAndExit } from './shared/cancel-and-exit.js';
import { introspectShared } from './shared/introspect-shared.js';
import fs from 'fs-extra'
export const introspect = async (friedaVars: FriedaVars) => {
  let { migrationsDirectory, databaseUrl } = friedaVars;
  intro('Introspect')
  if (typeof migrationsDirectory !== 'string') {
    migrationsDirectory = await promptMigrationsDirectory(friedaVars);
  }
  if (typeof databaseUrl !== 'string') {
    databaseUrl = await promptDatabaseUrl(friedaVars);
  }
  
  const urlMasked = replaceDatabaseURLPassword(databaseUrl);
  log.info(`Database URL: ${colors.magenta(urlMasked)}`);
  const goAhead = await confirm({
    message: 'Continue?'
  });
  if (isCancel(goAhead) || goAhead !== true) {
    cancelAndExit();
  }
  const s = spinner();
  s.start(`Introspecting...`);
  const contents = await introspectShared(getServerlessConnection(databaseUrl));
  const dp = getMigrationsDirectoryFullPath(migrationsDirectory)
  const currentSchemaFilePath = getCurrentSchemaFilePath(migrationsDirectory);
  await fs.ensureDir(dp);
  await fs.writeFile(currentSchemaFilePath, contents)
  s.stop(`Current schema: ${formatFilePath(currentSchemaFilePath)}`)
  outro('Done.')
};
