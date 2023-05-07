import { getVersion } from '../utils/get-version.js';
import colors from 'kleur';
export const logHeader = async () => {
  const version = await getVersion();
  console.log(colors.bold('frieda'), colors.dim(`v${version}`), '🦮');
};
