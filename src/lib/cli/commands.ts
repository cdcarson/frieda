export type CliOption = {
  name: string;
  alias?: string;
};
export type CliCommand = {
  name: string;
  alias?: string;
  options?: CliOption[];
};
export type ParseCommandResult = {
  command: CliCommand | null;
  remainingArgs: string[];
};

export const cliCommands: CliCommand[] = [
  {
    name: 'fetch',
    alias: 'f'
  },
  {
    name: 'init',
    alias: 'i'
  }
];

export const parseCommand = (origArgs: string[]): ParseCommandResult => {
  const remainingArgs = [...origArgs];
  const cmdName = remainingArgs.shift();
  for (const command of cliCommands) {
    if (
      cmdName === command.name ||
      (typeof command.alias == 'string' && cmdName === command.alias)
    ) {
      return {
        command,
        remainingArgs
      };
    }
  }
  return {
    command: null,
    remainingArgs
  };
};

// export const getFlag = (
//   args: string[],
//   flag: string,
//   short?: string
// ): boolean => {};
