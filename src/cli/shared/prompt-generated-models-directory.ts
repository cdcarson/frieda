import { text, isCancel } from '@clack/prompts';
import { cancelAndExit } from './cancel-and-exit.js';
import { promptSaveFriedaRc } from './prompt-save-frieda-rc.js';
import type { FriedaVars } from './types.js';
export const promptGeneratedModelsDirectory = async (
  friedaVars: FriedaVars
): Promise<string> => {
  const initialValue =
    typeof friedaVars.generatedModelsDirectory === 'string'
      ? friedaVars.generatedModelsDirectory
      : '';
  const generatedModelsDirectory = await text({
    message: 'Generated models directory path:',
    placeholder: 'Relative path from project root',
    initialValue
  });
  if (isCancel(generatedModelsDirectory)) {
    return cancelAndExit();
  }
  if (initialValue !== generatedModelsDirectory) {
    await promptSaveFriedaRc({
      ...friedaVars,
      generatedModelsDirectory
    });
  }

  return generatedModelsDirectory;
};