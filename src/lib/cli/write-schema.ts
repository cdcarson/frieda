import type { FetchedSchema } from '$lib/fetch/types.js';
import { prettifyAndSaveFile } from '$lib/fs/prettify-and-save-file.js';
import { saveFile } from '$lib/fs/save-file.js';
import type { FsPaths } from '$lib/fs/types.js';
import type { Options } from './types.js';
import { join } from 'node:path';
export const writeSchema = async (
  schema: FetchedSchema,
  options: Options,
  migration?: string
): Promise<FsPaths[]> => {
  const baseName = schema.fetched.toISOString();
  const promises: Promise<FsPaths>[] = migration
    ? [
        saveFile(
          join(options.schemaDirectory, baseName + '-migration.sql'),
          [`-- Migration ${schema.fetched.toUTCString()}`, migration].join(
            '\n\n'
          )
        )
      ]
    : [];
  promises.push(
    saveFile(
      join(options.schemaDirectory, baseName + '-schema.sql'),
      [
        `-- Fetched ${schema.fetched.toUTCString()}`,
        ...schema.tables.map((t) => t.createSql)
      ].join('\n\n')
    ),
    prettifyAndSaveFile(
      join(options.schemaDirectory, baseName + '-schema.json'),
      JSON.stringify(schema)
    )
  );

  return await Promise.all(promises);
};
