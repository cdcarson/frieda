import { RC_CLI_OPTIONS } from '../constants.js';
import { fmtVarName, squishWords } from '../utils/formatters.js';

import type { OptionSource, Options, ResolvedOption } from '../types.js';
import log from '../ui/log.js';
import colors from 'kleur';
import { prompt } from '../ui/prompt.js';
export const getBooleanOption = async <
  K extends keyof Pick<
    Options,
    'outputJs' | 'typeBigIntAsString' | 'typeTinyIntOneAsBoolean'
  >
>(
  key: K,
  cliArgs: Partial<Options>,
  rc: Partial<Options>,
  defaultValue: boolean,
  promptAlways = false
): Promise<ResolvedOption<K>> => {
  let value = defaultValue;
  let source: OptionSource = 'default';

  const cliVal = cliArgs[key];
  const rcVal = rc[key];
  if (typeof cliVal === 'boolean') {
    source = 'arg';
    value = cliVal;
  } else if (typeof rcVal === 'boolean') {
    source = 'arg';
    value = rcVal;
  }

  if (promptAlways) {
    const opt = RC_CLI_OPTIONS[key];
    log.info([colors.bold(key), ...squishWords(opt.description).split('\n')]);
    value = await prompt({
      type: 'confirm',
      message: fmtVarName(key),
      name: key
    });
    source = 'prompt';
  }

  return {
    source,
    value
  };
};
