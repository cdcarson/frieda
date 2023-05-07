import prompts from 'prompts';
import { onUserCancelled } from './on-user-cancelled.js';
export const prompt = async <T extends string | boolean| Record<string,unknown>>(
  p: prompts.PromptObject
): Promise<T> => {
  const v = await prompts.prompt(p, { onCancel: onUserCancelled });
  return v[p.name as string];
};
