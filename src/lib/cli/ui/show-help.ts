import { CLI_COMMANDS, CLI_OPTIONS, FRIEDA_RC_FILE_NAME } from '../constants.js';
import type { CliOption } from '../types.js';
import { fmtPath, fmtVarName, getStdOutCols, squishWords } from './formatters.js';
import log from './log.js';
import colors from 'kleur'
export const showHelp = () => {
  const col1Width = Math.max(...CLI_COMMANDS.map(cmd => cmd.name.length)) + 4;
  log.header('Help');
  console.log(colors.dim('Usage'));
  console.log(`${colors.bold('frieda')} <command> [options]`)
  console.log();
  console.log(colors.dim('Commands'));
  CLI_COMMANDS.forEach(cmd => {
    console.log(`${colors.bold(cmd.name)}${' '.repeat(col1Width - cmd.name.length)}${cmd.description}`)
  });
  console.log();
  console.log(colors.dim('Options'));
  logOptions(CLI_OPTIONS)
  console.log();
  console.log(colors.dim('Run'), 'frieda <command> -h', colors.dim('to see options for a particular command.'));

};

const logOptions = (opts: CliOption[]) => {
  opts.forEach(o => {
    const name = colors.bold(`--${o.name}`)
    const alias = o.alias ? colors.bold(`-${o.alias}`) + ', ' : '';
    const type = colors.dim(`[${o.type}]`);
    const inFriedaRc = o.isRc ? ` ${fmtVarName(o.name)} in ${fmtPath(FRIEDA_RC_FILE_NAME)}` : ''
    console.log(`${alias}${name} ${type}${inFriedaRc}`);
    console.log(squishWords(o.description))
  })
  
}
