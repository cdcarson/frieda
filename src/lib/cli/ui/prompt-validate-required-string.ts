import type { PrevCaller } from 'prompts';

export const promptValidateRequiredString: PrevCaller<
  string,
  string | boolean
> = (s: unknown): string | boolean => {
  if (typeof s !== 'string' || s.trim().length === 0) {
    return 'Required.';
  }
  return true;
};
