import ora from 'ora';
import { fmtErr, fmtPath } from '../utils.js';
import type { DirectoryResult } from '../types.js';
import { validateOutputDirectory } from './validate-output-directory.js';
import { promptOutputDirectory } from './prompt-output-directory.js';
import { promptOutputDirectoryNotEmpty } from './prompt-output-directory-not-empty.js';
import { onPromptCancel } from '../prompts/on-prompt-cancel.js';
import prompts from 'prompts';
export class _Mod {
  async promptOutputDirectory(currValue?: string): Promise<DirectoryResult> {
    let result: DirectoryResult | undefined;
    const initial = currValue || 'frieda';
    await prompts(
      {
        name: 'outputDirectory',
        type: 'text',
        message: 'Path to output directory',
        initial,
        validate: async (p) => {
          result = undefined;
          const path = typeof p === 'string' ? p.trim() : '';
          if (path.length === 0) {
            return 'Required.';
          }
          try {
            result = await validateOutputDirectory(p);
            return true;
          } catch (error) {
            if (error instanceof Error) {
              return error.message;
            }
            throw error;
          }
        }
      },
      { onCancel: onPromptCancel }
    );
    if (!result) {
      throw Error();
    }
    return result;
  }
}

export const getOutputDirectory = async (paths: {
  cli?: string;
  rc?: string;
}): Promise<DirectoryResult> => {
  let result: DirectoryResult | undefined;
  const pathsToTry = [paths.cli, paths.rc];
  while (!result && pathsToTry.length > 0) {
    const p = pathsToTry.shift();
    if (typeof p === 'string' && p.length > 0) {
      const msg = `Validating output directory ${fmtPath(p)}.`;
      const spinner = ora(msg);
      try {
        result = await validateOutputDirectory(p);
        spinner.succeed();
      } catch (error) {
        if (error instanceof Error) {
          spinner.fail(`${msg} ${fmtErr(error.message)}`);
          result = await promptOutputDirectory(p);
        }
        throw error;
      }
    }
  }
  if (!result) {
    result = await promptOutputDirectory();
  }
  // if the result path exists, does not match the rc path and is not empty...
  if (result.relativePath !== paths.rc && result.exists && !result.isEmpty) {
    const confirmed = await promptOutputDirectoryNotEmpty(result);
    if (!confirmed) {
      return await promptOutputDirectory();
    }
  }
  return result;
};
