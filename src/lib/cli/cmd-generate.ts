import { fetchSchema, generateCode } from './shared.js';
import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';
import log from './ui/log.js';
import kleur from 'kleur';
import { fmtPath } from './ui/formatters.js';

export const cmdGenerate = async (cliArgs: Partial<CliArgs>) => {
  const { options, connection } = await getOptions(cliArgs);

  const schema = await fetchSchema(connection);
  const files = await generateCode(schema, options);
  console.log();
  log.info([
    kleur.bold('Files'),
    ...files.map((f) => `- ${fmtPath(f.relativePath)}`)
  ]);
  
};
