import { COMMANDS, FRIEDA_RC_FILE_NAME, HELP_OPTION } from '../constants.js';
import { fmtPath, fmtVarName, squishWords } from '../utils/formatters.js';
import type { CliOption, CliCommand } from '../types.js';
import colors from 'kleur';

export const showHelpForCommand = (command: CliCommand) => {
  console.log(colors.dim('Usage:'));
  console.log(`frieda ${colors.bold(command.name)} ${command.usage}`);
  if (command.alias) {
    console.log(`frieda ${colors.bold(command.alias)} ${command.usage}`);
  }
  console.log(colors.dim('Options:'));
  (command.positionals || []).forEach((opt) => {
    const name = colors.bold(opt.name);
    console.log(`${name} ${colors.dim('[string]')}`);
    console.log(squishWords(opt.description));
  });
  const opts = command.options
    ? [...command.options, HELP_OPTION]
    : [HELP_OPTION];
  opts.forEach(logOption);
};

const logOption = (opt: CliOption) => {
  const alias = opt.alias ? colors.bold(`-${opt.alias}`) + ', ' : '';
  const name = colors.bold(`--${opt.name}`);
  const inFriedaRc = opt.isRcOption
    ? ''
    : colors.dim(
        ` (${fmtVarName(opt.name)} in ${fmtPath(FRIEDA_RC_FILE_NAME)})`
      );
  console.log(`${alias}${name} ${colors.dim(`[${opt.type}]`)}${inFriedaRc}`);
  console.log(squishWords(opt.description));
};

export const showHelp = () => {
  console.log(colors.dim('Usage:'));
  console.log(`${colors.bold('frieda')} <command> [options]`);
  console.log(colors.dim('Commands:'));
  COMMANDS.forEach((cmd) => {
    console.log(colors.bold(cmd.name));
    console.log(squishWords(cmd.description));
  });
  console.log(colors.dim('Options:'));
  [HELP_OPTION].forEach(logOption);
};
