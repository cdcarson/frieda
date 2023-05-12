import ora from 'ora';
import type { ExtendedSchema } from '../parse/types.js';
import type { ResolvedCliOptions } from './types.js';
import { generate } from '../generate/generate.js';
import log from './ui/log.js';
import colors from 'kleur';
import { fmtPath } from './ui/formatters.js';
export const generateCode = async (
  options: ResolvedCliOptions,
  schema: ExtendedSchema
): Promise<void> => {
  const spinner = ora('Generating code').start();
  const files = await generate(options, schema);
  spinner.succeed('Code generated.');
  log.info([
    colors.dim('Generated files'),
    ...files.map((f) => ` - ${fmtPath(f.relativePath)}`)
  ]);
};
