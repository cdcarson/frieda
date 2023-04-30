import type { DirectoryResult } from '../types.js';
import prompts from 'prompts';
import { onPromptCancel } from '../prompts/on-prompt-cancel.js';
import { fmtPath } from '../utils.js';

export const promptOutputDirectoryNotEmpty = async (
  dir: DirectoryResult
): Promise<boolean> => {
  const initial = false;
  const {confirmed} = await prompts(
    {
      name: 'confirmed',
      type: 'confirm',
      message: `The directory ${fmtPath(dir.relativePath)} is not empty. Continue?`,
      initial,
    },
    { onCancel: onPromptCancel }
  );
  
  return confirmed;
};