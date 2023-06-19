import { ENV_DB_URL_KEYS, FRIEDA_RC_FILE_NAME } from './constants.js';
import { fmtPath, fmtVarName } from './utils.js';

export const OPTION_DESCRIPTIONS = {
  envFile: `The path to an environment variables file containing the database url as either ${ENV_DB_URL_KEYS.map(
    (s) => fmtVarName(s)
  ).join(' or ')}.`,
  outputDirectory: `Output directory path for generated code. It should be convenient to, but separate from, your own code. Example: ${fmtPath(
    'src/db/__generated'
  )} `,
  compileJs: `Compile to javascript.`,
  init: `(Re)initialize options in ${fmtPath(FRIEDA_RC_FILE_NAME)}.`,
  help: 'Show this help'
};
