import { validateOutputDirectory } from './validate-output-directory.js';
import type { DirectoryResult } from '../types.js';
import prompts from 'prompts';
import { onPromptCancel } from '../prompts/on-prompt-cancel.js';

export const promptOutputDirectory = async (
  currValue?: string
): Promise<DirectoryResult> => {
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
};
