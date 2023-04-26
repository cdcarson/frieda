
export const FRIEDA_RC_FILE_NAME = '.friedarc';
export const CURRENT_SCHEMA_SQL_FILE_NAME = 'current-schema.sql';
export const CURRENT_SCHEMA_JSON_FILE_NAME = 'current-schema.json';

export const GENERATED_CODE_FILENAMES = {
  types: 'types.ts',
  database: 'database.ts',
  schemaCast: 'schema-cast.ts',
  modelDefinitions: 'model-definitions.ts'
} as const;

export const CURRENT_MIGRATION_SQL_FILE_NAME = 'current-migration.sql';
export const MIGRATIONS_DIRECTORY_NAME = 'migrations';

export const SCHEMA_CAST_CONST_NAME = 'schemaCast';
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;

/**
 * the path to the certificate file
 * used to create a mysql2 connection
 */
export const PATH_TO_CERT = '/etc/ssl/cert.pem';

export const COMMANDS = {
  generate: {
    alias: 'g',
    usage: 'frieda generate [options]',
    description: `Generate model code.`,
    options: {
      help: {
        alias: 'h',
        boolean: true,
        description: 'Show this help.'
      }
    }
  },
  migrate: {
    alias: 'm',
    usage: 'frieda migrate [options]',
    description: `Perform a migration.`,
    options: {
      file: {
        alias: 'f',
        boolean: false,
        description: 'Optional. Read the migration from the specified file rather than <schemaDirectory>/current-migration.sql.'
      },
      help: {
        alias: 'h',
        boolean: true,
        description: 'Show this help.'
      }
    }
  },
  init: {
    alias: 'i',
    usage: 'frieda init [options]',
    description: `(Re)initialize settings.`,
    options: {
      help: {
        alias: 'h',
        boolean: true,
        description: 'Show this help.'
      }
    }
  }
} as const;
