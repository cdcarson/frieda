import prompts from 'prompts';
import { checkDatabaseConnection } from './check-database-connection.js';
import { onPromptCancel } from '../prompts/on-prompt-cancel.js';
export const promptDatabaseUrl = async (): Promise<string> => {
  const {databaseUrl} = await prompts({
    name: 'databaseUrl',
    type: 'password',
    message: 'Database URL',
    validate: async (url) => {
      try {
        await checkDatabaseConnection(url);
        return true;
      } catch (error) {
        if (error instanceof Error) {
          return error.message;
        }
        throw error;
      }
    }
  }, { onCancel: onPromptCancel });
  return databaseUrl;
}