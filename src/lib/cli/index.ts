import { cmdFetch } from './cmd-fetch.js';
import { cmdGenerate } from './cmd-generate.js';
import { cmdInit } from './cmd-init.js';
import { parseCommand } from './commands.js';

export const main = async (
  cwd: string,
  args: string[],
  env: Record<string, string | undefined>
) => {
  const commandResult = parseCommand(args);
  const { command } = commandResult;
  if (command) {
    switch (command.name) {
      case 'fetch':
        return await cmdFetch(commandResult);
      case 'generate':
        return await cmdGenerate(commandResult);
      case 'init':
        return await cmdInit(commandResult);
    }
  }
};
