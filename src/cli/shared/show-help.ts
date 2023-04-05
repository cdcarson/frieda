import colors from 'picocolors';
import { COMMANDS } from './constants.js';
export const showHelp = () => {
  console.log( `${colors.dim('Usage:')} frieda ${colors.magenta('<command> [options]')}`);
  console.log()
  console.log(colors.dim('Commands:'));
  const colSize = Math.max(...COMMANDS.map((c) => c.id.length));
  COMMANDS.forEach((c) => {
    
    const addedSpaces = ' '.repeat(colSize - c.id.length);
    console.log(
      `   ${colors.magenta(c.id[0])}${colors.dim('|')}${colors.magenta(
        c.id
      )}   ${addedSpaces}${colors.gray(c.description)}`
    );
  });
  console.log();
};