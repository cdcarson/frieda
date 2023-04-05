import type { Command } from './types.js';
import colors from 'picocolors';
export const RC_FILE_NAME = '.friedarc';
export const CURRENT_MIGRATION_FILE_NAME = 'current-migration.sql';
export const CURRENT_SCHEMA_FILE_NAME = 'current-schema.sql';
export const MIGRATION_HISTORY_FOLDER = 'history';
export const VERSION = '0.0.4';

export const COMMANDS: Command[] = [
  {
    id: 'migrate',
    description: `Run the current migration in  ${colors.cyan(
      `<migrations>/${CURRENT_MIGRATION_FILE_NAME}`
    )}.`
  },
  {
    id: 'generate',
    description: `Generate javascript models and other code from the current database schema.`
  },
  {
    id: 'fetch',
    description: `Fetch the current database schema and save it to ${colors.cyan(
      `<migrations>/${CURRENT_SCHEMA_FILE_NAME}`
    )}.`
  },

  {
    id: 'init',
    description: `(Re)initialize Frieda settings and save them to ${colors.cyan(
      RC_FILE_NAME
    )}.`
  },
  {
    id: 'help',
    description: 'Show this help.'
  }
];

export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'];

export const FORMATTED_DB_URL_EXAMPLE =
  colors.gray('mysql://') +
  colors.magenta('<user>') +
  colors.gray(':') +
  colors.magenta('<password>') +
  colors.gray('@') +
  colors.magenta('<host>');
