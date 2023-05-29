import type { FetchedSchema } from '$lib/fetch/types.js';
import { prettifyAndSaveFile } from '$lib/fs/prettify-and-save-file.js';
import { saveFile } from '$lib/fs/save-file.js';
import type { FsPaths } from '$lib/fs/types.js';
import type { Options } from './types.js';
import { join } from 'node:path';
export const writeSchema = async (
  schema: FetchedSchema,
  options: Options,
  migration?: { previousSchema: FetchedSchema; migration: string }
): Promise<FsPaths[]> => {
  const promises: Promise<FsPaths>[] = [
    saveFile(
      join(options.schemaDirectory, 'current-schema.sql'),
      [
        `-- Fetched ${schema.fetched.toUTCString()}`,
        ...schema.tables.map((t) => t.createSql)
      ].join('\n\n')
    ),
    prettifyAndSaveFile(
      join(options.schemaDirectory, 'current-schema.json'),
      JSON.stringify(schema)
    )
  ];
  if (migration) {
    const d = new Date();
    const migrationFolder = join(
      options.schemaDirectory,
      'migrations',
      d.toISOString()
    );
    promises.push(
      saveFile(
        join(migrationFolder, '-schema.sql'),
        [
          `-- Schema before migration`,
          `-- Fetched ${migration.previousSchema.fetched.toUTCString()}`,
          ...migration.previousSchema.tables.map((t) => t.createSql)
        ].join('\n\n')
      ),
      prettifyAndSaveFile(
        join(migrationFolder, '-schema.json'),
        JSON.stringify(migration.previousSchema)
      ),
      saveFile(
        join(migrationFolder, '+migration.sql'),
        [`-- Migration ${d.toUTCString()}`, migration.migration].join('\n\n')
      ),
      saveFile(
        join(migrationFolder, '+schema.sql'),
        [
          `-- Schema after migration`,
          `-- Fetched ${schema.fetched.toUTCString()}`,
          ...schema.tables.map((t) => t.createSql)
        ].join('\n\n')
      ),
      prettifyAndSaveFile(
        join(migrationFolder, '+schema.json'),
        JSON.stringify(migration.previousSchema)
      )
    );
  }

  return await Promise.all(promises);
};
