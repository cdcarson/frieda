import type { FileResult } from '../types.js';
import prompts from 'prompts';
import { onPromptCancel } from '../prompts/on-prompt-cancel.js';
import { fmtPath } from '../utils.js';
import { FRIEDA_RC_FILE_NAME } from '../constants.js';

export const promptSaveFriedarc = async (
  rcFile: FileResult
): Promise<boolean> => {
  const { save } = await prompts(
    {
      type: 'confirm',
      name: 'save',
      message:
        (rcFile.exists ? 'Save changes' : 'Save settings') +
        ' to ' +
        fmtPath(FRIEDA_RC_FILE_NAME) +
        '?',
      initial: rcFile.exists === false
    },
    { onCancel: onPromptCancel }
  );

  return save;
};
