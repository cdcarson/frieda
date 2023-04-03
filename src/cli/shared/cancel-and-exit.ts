import { cancel } from '@clack/prompts';
export const cancelAndExit = () => {
  cancel('Operation cancelled.');
  process.exit(0);
};
