import colors from 'picocolors';


export type Option = {
  long: string;
  short?: string;
  description: string;
};

export type CommandId = 'migrate' | 'fetch' | 'generate' | 'show';
export type Command<Id extends CommandId> = {
  id: Id;
  description: string;
  options?: Option[];
};
export type Commands = {
  [Id in CommandId & string]: Command<Id>;
};

export type GetCommandResult = {
  command?: Command<CommandId>;
  restArgs: string[]
}

export const GLOBAL_OPTIONS: Option[] = [
  {
    long: 'help',
    short: 'h',
    description: 'Show help'
  },
  {
    long: 'version',
    short: 'v',
    description: 'Show version'
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
  show: {
    id: 'show',
    description: 'Show model details.'
  },
  fetch: {
    id: 'fetch',
    description: `Fetch the database schema.`
  }
};

export const getCommand = (args: string[]): GetCommandResult => {
  if (args.length === 0) {
    return {
      restArgs: args
    };
  }
  for (const command of Object.values(COMMANDS)) {
    if (args[0] === command.id || args[0] === command.id[0]) {
      return {
        command,
        restArgs: args.slice(1)
      };
    }
  }
  return {
    restArgs: args
  };
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
    'show',
    'migrate',
  ]
  console.log( `${colors.dim('Usage:')} frieda ${colors.magenta('[command]')} ${colors.blue('[options]')}`);
  console.log()
  console.log(colors.dim('Commands:'));
  let colSize = Math.max(...Object.values(COMMANDS).map((c) => c.id.length));
  ordered.forEach(id => {
    const c = COMMANDS[id];
    const addedSpaces = ' '.repeat(colSize - c.id.length);
    console.log(
      `${colors.magenta(c.id[0])}${colors.dim('|')}${colors.magenta(
        c.id
      )}   ${addedSpaces}${colors.gray(c.description)}`
    );
  })
  
  console.log();

  console.log(colors.dim('Global options:'));
  colSize = Math.max(...GLOBAL_OPTIONS.map(o => o.long.length))
  GLOBAL_OPTIONS.forEach(o => {
    const addedSpaces = ' '.repeat(colSize - o.long.length);
    const short = o.short ? colors.blue(`-${o.short}`) + colors.dim('|') : '  ';
    const long = colors.blue(`--${o.long}`)
    console.log(`${short}${long}  ${addedSpaces}${colors.gray(o.description)}`)
  })

  console.log();


};