import { RC_CLI_OPTIONS } from '../constants.js';
import { fmtVarName, squishWords } from '../utils/formatters.js';
import ora from 'ora';

import type {
  DirectoryResult,
  OptionSource,
  Options,
  ResolvedDirectoryOption
} from '../types.js';
import log from '../ui/log.js';
import { promptDirectory } from './prompt-directory.js';
import { validateDirectory } from './validate-directory.js';
import colors from 'kleur';
import { promptDirectoryNotEmpty } from './prompt-directory-not-empty.js';
export const getDirectoryOption = async <
  K extends ('codeDirectory' | 'schemaDirectory') & keyof Options
>(
  key: K,
  cliArgs: Partial<Options>,
  rc: Partial<Options>,
  promptAlways = false
): Promise<ResolvedDirectoryOption<K>> => {
  let value = '';
  let source: OptionSource = 'not set';
  let directory: DirectoryResult | undefined;
  const cliVal = cliArgs[key];
  const rcVal = rc[key];
  if (typeof cliVal === 'string' && cliVal.trim().length > 0) {
    source = 'arg';
    value = cliVal.trim();
  } else if (typeof rcVal === 'string' && rcVal.trim().length > 0) {
    source = 'arg';
    value = rcVal.trim();
  }
  if (value.length > 0) {
    const spinner = ora(`Validating ${fmtVarName(key)}`).start();
    try {
      directory = await validateDirectory(value, key);
      spinner.succeed();
    } catch (error) {
      spinner.fail((error as Error).message);
    }
  }
  if (promptAlways || undefined === directory) {
    const opt = RC_CLI_OPTIONS[key];
    log.info([colors.bold(key), ...squishWords(opt.description).split('\n')]);
    directory = await promptDirectory(key, value);
    source = 'prompt';
    value = directory.relativePath;
  }

  let ignoreNonEmpty = directory.relativePath === rcVal || directory.isEmpty;
  while (!ignoreNonEmpty) {
    const confirmIgnore = await promptDirectoryNotEmpty(directory.relativePath);
    if (confirmIgnore) {
      ignoreNonEmpty = true;
    } else {
      directory = await promptDirectory(key, directory.relativePath);
      ignoreNonEmpty = directory.relativePath === rcVal || directory.isEmpty;
    }
  }

  return {
    source,
    value,
    directory
  };
};
