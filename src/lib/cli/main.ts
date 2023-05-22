import { FRIEDA_VERSION } from '$lib/version.js';
import kleur from 'kleur';

import { parseArgs } from './parse-args.js';
import type { CliCommand } from './types.js';
import { showHelp, showHelpForCommand } from './ui/show-help.js';
import { getOptions } from './get-options.js';

import { cmdModel } from './cmd-model.js';
import { cliFetchSchema } from './cli-fetch-schema.js';
import { cliGenerateCode } from './cli-generate-code.js';
export const main = async (argv: string[]) => {
  console.log(kleur.bold('frieda'), kleur.dim(`v${FRIEDA_VERSION}`), '🦮');
  const { command, cliArgs, positionalArgs } = parseArgs(argv);
  if (!command) {
    showHelp();
    return;
  }
  if (cliArgs.help) {
    showHelpForCommand(command as CliCommand);
    return;
  }
  const { options, connection } = await getOptions(
    cliArgs,
    command.name === 'init'
  );
  const schema = await cliFetchSchema(connection);

  await cliGenerateCode(schema, options);

  if (command.name === 'model') {
    return await cmdModel(schema, positionalArgs, connection, options);
  }
};
