import prompts from 'prompts';
import type { EnvFileDatabaseUrl } from '../types.js';

import { readEnvFileDatabaseUrl } from './read-env-file-database-url.js';
import { onPromptCancel } from '../prompts/on-prompt-cancel.js';
export const promptEnvFilePath = async (currValue? :string): Promise<EnvFileDatabaseUrl> => {
  let result: EnvFileDatabaseUrl|undefined;
  const initial = currValue || '.env'
  await prompts({
    name: 'envFilePath',
    type: 'text',
    message: 'Path to .env file',
    initial,
    validate: async (p) => {
      result = undefined;
      const path = typeof p === 'string' ? p.trim() : ''
      if (path.length === 0) {
        return 'Required.'
      }
      try {
        result = await readEnvFileDatabaseUrl(p);
        return true;
      } catch (error) {
        if (error instanceof Error) {
          return error.message;
        }
        throw error;
      }
    }
  }, { onCancel: onPromptCancel });
  if (! result) {
    throw Error()
  }
  return result;
}