import {
  CLI_COMMANDS,
  CLI_OPTIONS,
  FRIEDA_RC_FILE_NAME
} from '../constants.js';
import type { CliCommand, CliOption } from '../types.js';
import { fmtPath, fmtVarName, squishWords } from './formatters.js';
import log from './log.js';
import colors from 'kleur';
export const showHelp = () => {
  const col1Width = Math.max(...CLI_COMMANDS.map((cmd) => cmd.name.length)) + 4;
  console.log();
  console.log(colors.dim('Usage'));
  console.log(`${colors.bold('frieda')} <command> [options]`);
  console.log();
  console.log(colors.dim('Commands'));
  CLI_COMMANDS.forEach((cmd) => {
    console.log(
      `${colors.bold(cmd.name)}${' '.repeat(col1Width - cmd.name.length)}${
        cmd.description
      }`
    );
  });
  console.log();
  console.log(colors.dim('Options'));
  logOptions(CLI_OPTIONS);
  console.log();
  console.log(
    colors.dim('Run'),
    'frieda <command> -h',
    colors.dim('to see options for a particular command.')
  );
  console.log();
};
export const showHelpForCommand = (cmd: CliCommand) => {
  console.log();
  console.log(colors.dim('Usage'));
  console.log(`frieda ${colors.bold(cmd.name)} ${cmd.usage}`);
  console.log(`frieda ${colors.bold(cmd.alias)} ${cmd.usage}`);
  console.log();
  console.log(colors.dim('Description'));
  console.log(squishWords(cmd.description));

  console.log();
  console.log(colors.dim('Options'));
  (cmd.positionalOptions || []).forEach((opt) => {
    console.log(`${colors.bold(opt.name)} ${colors.dim('[string]')}`);
    console.log(squishWords(opt.description));
    console.log();
  });
  logOptions(CLI_OPTIONS);
  console.log();
};

const logOptions = (opts: CliOption[]) => {
  opts.forEach((o, i) => {
    const name = colors.bold(`--${o.name}`);
    const alias = o.alias ? colors.bold(`-${o.alias}`) + ', ' : '';
    const type = colors.dim(`[${o.type}]`);
    // const inFriedaRc = o.isRc
    //   ? ` ${fmtVarName(o.name)} in ${fmtPath(FRIEDA_RC_FILE_NAME)}`
    //   : '';
    const inFriedaRc = '';
    console.log(`${alias}${name} ${type}${inFriedaRc}`);
    console.log(squishWords(o.description));
    if (i < opts.length - 1) {
      console.log();
    }
  });
};
