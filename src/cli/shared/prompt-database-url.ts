import { text, isCancel, log } from '@clack/prompts';
import { cancelAndExit } from './cancel-and-exit.js';
import type { FriedaVars } from './types.js';
import colors from 'picocolors'
import { isValidURL } from './utils.js';
export const promptDatabaseUrl = async (
  friedaVars: FriedaVars
): Promise<string> => {
  const initialValue =
    typeof friedaVars.databaseUrl === 'string'
      ? friedaVars.databaseUrl
      : '';
  const databaseUrl = await text({
    message: 'Database URL:',
    placeholder: 'mysql://user:pass@host',
    initialValue,
    validate: (value) => {
      if (! isValidURL(value)) {
        return 'Invalid URL.'
      }
    }
  });
  if (isCancel(databaseUrl)) {
    return cancelAndExit();
  }
  log.info(`You can skip this prompt in future by adding ${colors.magenta('DATABASE_URL')} or ${colors.magenta('DATABASE_URL')} to ${colors.cyan('.env')}.`)
  return databaseUrl;
};