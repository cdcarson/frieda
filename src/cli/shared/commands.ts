import colors from 'picocolors';


export type Option = {
  long: string;
  short?: string;
  description: string;
};

export type CommandId = 'migrate' | 'fetch' | 'generate';
export type Command<Id extends CommandId> = {
  id: Id;
  description: string;
  options?: Option[];
};
export type Commands = {
  [Id in CommandId & string]: Command<Id>;
};

export const GLOBAL_OPTIONS: Option[] = [
  {
    long: 'help',
    short: 'h',
    description: 'Show this help'
  },
  {
    long: 'version',
    short: 'v',
    description: 'Show the version'
  }
];

export const COMMANDS: Commands = {
  migrate: {
    id: 'migrate',
    description: `Execute the current migration.`
  },
  generate: {
    id: 'generate',
    description: `Generate code.`
  },
  fetch: {
    id: 'fetch',
    description: `Fetch the database schema.`,
    options: [
      {
        long: 'skip-generate',
        short: 's',
        description: 'Skip generating code'
      }
    ]
  }
};

export const getCommand = (args: string[]): Command<CommandId> | undefined => {
  if (args.length === 0) {
    return undefined;
  }
  for (const command of Object.values(COMMANDS)) {
    if (args[0] === command.id || args[0] === command.id[0]) {
      return command;
    }
  }
};

export const getOptionFlag = (
  args: string[],
  long: string,
  short?: string
): boolean => {
  const matches = [`--${long}`];
  if (short) {
    matches.push(`-${short}`);
  }
  for (const arg of args) {
    if (matches.includes(arg)) {
      return true;
    }
  }
  return false;
};

export const getValueFlag = (
  args: string[],
  long: string,
  short?: string
): string | undefined => {
  const matches = [`--${long}`];
  if (short) {
    matches.push(`-${short}`);
  }
  for (const arg of args) {
    const parts = arg.split('=');
    if (!parts[1] || parts[1].length === 0) {
      return undefined;
    }
    if (matches.includes(parts[0])) {
      return parts[0];
    }
  }
};

export const showHelp = () => {
  const ordered: CommandId[] = [
    'fetch',
    'generate',
    'migrate',
  ]
  console.log( `${colors.dim('Usage:')} frieda ${colors.magenta('<command> [options]')}`);
  console.log()
  console.log(colors.dim('Commands:'));
  const colSize = Math.max(...Object.values(COMMANDS).map((c) => c.id.length));
  ordered.forEach(id => {
    const c = COMMANDS[id];
    const addedSpaces = ' '.repeat(colSize - c.id.length);
    console.log(
      `   ${colors.magenta(c.id[0])}${colors.dim('|')}${colors.magenta(
        c.id
      )}   ${addedSpaces}${colors.gray(c.description)}`
    );
  })
  
  console.log();
};