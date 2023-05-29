import type { FetchedSchema } from '$lib/fetch/types.js';
import { generate } from '$lib/generate/generate.js';
import ora from 'ora';
import type { Options } from './types.js';
import log from './ui/log.js';
import kleur from 'kleur';
import { fmtPath } from './ui/formatters.js';
import type { FsPaths } from '$lib/fs/types.js';
import { onUserCancelled } from './ui/on-user-cancelled.js';
import { writeSchema } from './write-schema.js';

export const cliGenerateCode = async (
  schema: FetchedSchema,
  options: Options
): Promise<{ files: FsPaths[]; types: { [t: string]: number } }> => {
  const spin = ora('Generating code').start();
  try {
    const result = await generate(
      schema,
      options.outputDirectory,
      options.compileJs
    );

    const schemaFiles = await writeSchema(schema, options);
    spin.succeed('Code generated.');
    log.info([
      kleur.bold('Code files'),
      ...result.files.map((f) => `- ${fmtPath(f.relativePath)}`)
    ]);
    log.info([
      kleur.bold('Schema files'),
      ...schemaFiles.map((f) => `- ${fmtPath(f.relativePath)}`)
    ]);
    return result;
  } catch (error) {
    spin.fail(
      kleur.red('Error: ') +
        (error instanceof Error ? error.message : 'Unknown')
    );
    return onUserCancelled();
  }
};
