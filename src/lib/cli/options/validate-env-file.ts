import { parse } from 'dotenv';
import { fmtPath, fmtVarName } from '../utils/formatters.js';
import { getFile } from '../fs/get-file.js';
import type { DatabaseUrlResult } from '../types.js';
import { ENV_DB_URL_KEYS } from '../constants.js';
import { validateDatabaseUrl } from './validate-database-url.js';

export const validateEnvFile = async (
  envFilePath: string
): Promise<Required<DatabaseUrlResult>> => {
  const fileResult = await getFile(envFilePath);
  if (!fileResult.exists) {
    throw new Error(`The file ${fmtPath(envFilePath)} does not exist.`);
  }
  if (!fileResult.isFile) {
    throw new Error(`The path ${fmtPath(envFilePath)} is not a file.`);
  }

  const env = parse(fileResult.contents || '');
  const envKeys = Object.keys(env);
  const foundKeys = ENV_DB_URL_KEYS.filter(
    (k) => envKeys.includes(k) && env[k].length > 0
  );
  const validResults: DatabaseUrlResult[] = foundKeys
    .filter((k) => validateDatabaseUrl(env[k]))
    .map((k) => {
      return {
        databaseUrl: env[k],
        databaseUrlKey: k,
        envFile: envFilePath
      };
    });
  if (!validResults[0]) {
    if (foundKeys.length > 0) {
      throw new Error(
        `Could not find a valid URL in ${fmtPath(
          envFilePath
        )}. Key(s): ${foundKeys.map((k) => fmtVarName(k)).join(', ')}`
      );
    } else {
      throw new Error(
        `Could not find ${ENV_DB_URL_KEYS.map((k) => fmtVarName(k)).join(
          ' or '
        )} in ${fmtPath(envFilePath)}.`
      );
    }
  }
  return validResults[0];
};
