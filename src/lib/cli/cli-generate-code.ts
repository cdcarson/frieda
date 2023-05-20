import type { FetchedSchema } from '$lib/fetch/types.js';
import { generate } from '$lib/generate/generate.js';
import ora from 'ora';
import type { ResolvedCliOptions } from './types.js';
import log from './ui/log.js';
import kleur from 'kleur';
import { fmtPath } from './ui/formatters.js';
import type { FsPaths } from '$lib/fs/types.js';
import { onUserCancelled } from './ui/on-user-cancelled.js';

export const cliGenerateCode = async (
  schema: FetchedSchema,
  options: ResolvedCliOptions
): Promise<FsPaths[]> => {
  const spin = ora('Generating code').start();
  try {
    const files = await generate(
      schema,
      options.typeImports,
      options.outputDirectory,
      options.compileJs
    );
    spin.succeed('Code generated.');
    log.info([
      kleur.bold('Files'),
      ...files.map((f) => `- ${fmtPath(f.relativePath)}`)
    ]);
    return files;
  } catch (error) {
    spin.fail(
      kleur.red('Error: ') +
        (error instanceof Error ? error.message : 'Unknown')
    );
    return onUserCancelled();
  }
};
