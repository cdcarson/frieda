import yargs, { type CommandModule } from 'yargs';
import type { CliArgs, CliCommand } from './types.js';
import { COMMANDS, HELP_OPTION } from './constants.js';
import { cmd as cmdGenerate } from './cmd-generate/cmd.js';
import { cmd as cmdInit } from './cmd-init/cmd.js';
import { cmd as cmdField } from './cmd-field/cmd.js';
import { cmd as cmdModel } from './cmd-model/cmd.js';
import { showHelp, showHelpForCommand } from './ui/show-help.js';
import { logHeader } from './ui/log-header.js';
export const main = async (argv: string[]) => {
  let command: CliCommand | undefined;
  const commandModules: CommandModule[] = COMMANDS.map((cmd) => {
    const aliases = cmd.alias ? [cmd.alias] : [];
    const positionals = cmd.positionals || [];
    const options = cmd.options || [];
    const mod: CommandModule = {
      command: cmd.name,
      aliases,
      handler: () => {
        command = cmd;
      },
      builder: (b) => {
        positionals.forEach((opt) => {
          b = b.positional(opt.name, {
            type: 'string',
            alias: opt.name
          });
        });
        options.forEach((opt) => {
          b = b.option(opt.name, {
            alias: opt.alias,
            type: opt.type
          });
        });

        return b;
      }
    };
    return mod;
  });
  let commands = yargs(argv)
    .help(false)
    .version(false)
    .option(HELP_OPTION.name, {
      alias: HELP_OPTION.alias,
      type: HELP_OPTION.type
    });
  commandModules.forEach((mod) => {
    commands = commands.command(mod);
  });
  const results = await commands.parse();
  await logHeader();

  if (command === undefined) {
    return showHelp();
  }
  if (results.help) {
    return showHelpForCommand(command);
  }
  switch (command.name) {
    case 'init':
      return await cmdInit(results as Partial<CliArgs>);
    case 'generate':
      return await cmdGenerate(results as Partial<CliArgs>);
    case 'field':
      return await cmdField(results as Partial<CliArgs>);
    case 'model':
      return await cmdModel(results as Partial<CliArgs>);
  }
};
