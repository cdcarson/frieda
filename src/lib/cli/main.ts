import { FRIEDA_VERSION } from '$lib/version.js';
import kleur from 'kleur';

import { parseArgs } from './parse-args.js';
import type { CliArgs, CliCommand } from './types.js';
import { showHelp, showHelpForCommand } from './ui/show-help.js';
import ora from 'ora';
import { getOptions } from './get-options.js';
import type { FetchedSchema } from '$lib/fetch/types.js';
import { fetchSchema } from '$lib/fetch/fetch-schema.js';
import { onUserCancelled } from './ui/on-user-cancelled.js';
import { generate } from '$lib/generate/generate.js';
import log from './ui/log.js';
import { fmtPath } from './ui/formatters.js';
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

  const files = await cliGenerateCode(schema, options);

  if (command.name === 'model') {
    return await cmdModel(schema, positionalArgs);
  }
};
