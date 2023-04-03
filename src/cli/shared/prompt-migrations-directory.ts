import { text, isCancel } from '@clack/prompts';
import { cancelAndExit } from './cancel-and-exit.js';
import { promptSaveFriedaRc } from './prompt-save-frieda-rc.js';
import type { FriedaVars } from './types.js';
export const promptMigrationsDirectory = async (
  friedaVars: FriedaVars
): Promise<string> => {
  const initialValue =
    typeof friedaVars.migrationsDirectory === 'string'
      ? friedaVars.migrationsDirectory
      : '';
  const migrationsDirectory = await text({
    message: 'Migrations directory path:',
    placeholder: 'Relative path from project root',
    initialValue
  });
  if (isCancel(migrationsDirectory)) {
    return cancelAndExit();
  }
  if (initialValue !== migrationsDirectory) {
    await promptSaveFriedaRc({
      ...friedaVars,
      migrationsDirectory
    });
  }

  return migrationsDirectory;
};
