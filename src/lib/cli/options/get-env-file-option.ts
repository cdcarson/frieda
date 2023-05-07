import { RC_CLI_OPTIONS } from '../constants.js';
import { fmtVarName, squishWords } from '../utils/formatters.js';
import ora from 'ora';
import type {
  DatabaseUrl,
  OptionSource,
  Options,
  ResolvedEnvFileOption
} from '../types.js';
import log from '../ui/log.js';

import colors from 'kleur';
import { validateEnvFile } from './validate-env-file.js';
import { promptEnvFile } from './prompt-env-file.js';
export const getEnvFileOption = async (
  cliArgs: Partial<Options>,
  rc: Partial<Options>,
  promptAlways = false
): Promise<ResolvedEnvFileOption> => {
  let value = '';
  let source: OptionSource = 'not set';
  let databaseUrl: DatabaseUrl | undefined;
  const cliVal = cliArgs.envFile;
  const rcVal = rc.envFile;
  if (typeof cliVal === 'string' && cliVal.trim().length > 0) {
    source = 'arg';
    value = cliVal.trim();
  } else if (typeof rcVal === 'string' && rcVal.trim().length > 0) {
    source = 'arg';
    value = rcVal.trim();
  }
  if (value.length > 0) {
    const spinner = ora(`Validating ${fmtVarName('envFile')}`).start();
    try {
      databaseUrl = await validateEnvFile(value);
      spinner.succeed();
    } catch (error) {
      spinner.fail((error as Error).message);
    }
  }
  if (promptAlways || undefined === databaseUrl) {
    const opt = RC_CLI_OPTIONS['envFile'];
    log.info([
      colors.bold('envFile'),
      ...squishWords(opt.description).split('\n')
    ]);
    databaseUrl = await promptEnvFile(value, rcVal);
    source = 'prompt';
    value = databaseUrl.envFile;
  }
  return {
    source,
    value,
    databaseUrl
  };
};
