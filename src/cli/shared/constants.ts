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
    description: `Execute the current migration.`
  },
  {
    id: 'generate',
    description: `Generate model code.`
  },
  {
    id: 'fetch',
    description: `Fetch the database schema.`
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
