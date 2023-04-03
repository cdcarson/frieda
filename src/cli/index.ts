import { introspect } from './introspect.js';
import { migrate } from './migrate.js';
import { generate } from './generate.js';
import colors from 'picocolors';
import { readFriedaVars } from './shared/read-frieda-vars.js';
import { commands } from './shared/commands.js';
import type { CommandId } from './shared/types.js';
const version = '0.0.4';

const showHelp = () => {
  console.log(colors.dim('Usage: frieda <command>'));
  console.log(colors.dim('Commands:'));
  const colSize = Math.max(...commands.map((c) => c.id.length));
  commands.forEach((c) => {
    const addedSpaces = ' '.repeat(colSize - c.id.length);
    console.log(
      `   ${colors.cyan(c.id[0])} ${colors.dim('|')} ${colors.cyan(
        c.id
      )}   ${addedSpaces}${colors.gray(c.description)}`
    );
  });
  console.log();
};

const showHeader = () => {
  console.log(`${colors.bold('frieda')} 🐕 ${colors.gray(`v${version}`)} `);
};
const getCommandId = (arg: string | number | undefined): CommandId => {
  if (!arg) {
    return 'help';
  }
  for (const c of commands) {
    if (c.id === arg || c.id[0] === arg) {
      return c.id;
    }
  }
  return 'help';
};
export const main = async () => {
  const friedaVars = await readFriedaVars();
  showHeader();
  const commandId = getCommandId(process.argv[2]);
  switch (commandId) {
    case 'help':
      return showHelp();
    case 'migrate':
      return await migrate(friedaVars);
    case 'introspect':
      return await introspect(friedaVars);
    case 'generate':
      return await generate(friedaVars);
  }
};
