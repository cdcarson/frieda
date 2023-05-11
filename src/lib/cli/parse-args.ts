import parser from 'yargs-parser';
import { CLI_OPTIONS, CLI_COMMANDS } from './constants.js';
import type {  CliArgs } from './types.js';
export const parseArgs = (argv: string[]): {
  command: typeof CLI_COMMANDS[number] | undefined,
  cliArgs: Partial<CliArgs>,
  positionalArgs: string[]
} => {
  const alias: {[k: string]: string[]} = {};
  CLI_OPTIONS.forEach(o => {
    alias[o.name] = o.alias ? [o.alias] : [];
  })
  const parsed = parser(argv, {
    alias,
    string: CLI_OPTIONS.filter(o => o.type === 'string').map(o => o.name),
    boolean: CLI_OPTIONS.filter(o => o.type === 'flag').map(o => o.name)
  }) as  Partial<CliArgs> & {_: string[]}
  const positionalArgs = [...parsed._];
  const cmdName = positionalArgs.shift()
  const command = CLI_COMMANDS.find(cmd => {
    return cmdName === cmd.alias || cmdName === cmd.name 
  });
  
  
  return {
    command,
    cliArgs: parsed,
    positionalArgs
  }
};
