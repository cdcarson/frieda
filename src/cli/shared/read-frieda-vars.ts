import type { FriedaRcVars, FriedaVars } from './types';
import fs from 'fs-extra';
import { config } from 'dotenv';
import { getRcFilePath } from './utils.js';

export const readFriedaRcVars = async (): Promise<FriedaRcVars> => {
  const rcPath = getRcFilePath()
  const exists = await fs.exists(rcPath);
  if (!exists) {
    return {};
  }
  try {
    return (await fs.readJson(rcPath)) as FriedaRcVars;
  } catch (error) {
    return {};
  }
};

export const readFriedaVars = async (): Promise<FriedaVars> => {
  const { parsed: env } = config();
  const vars: FriedaVars = await readFriedaRcVars();
  if (env && typeof env.FRIEDA_DATABASE_URL === 'string') {
    vars.databaseUrl = env.FRIEDA_DATABASE_URL
  } else if (env && typeof env.DATABASE_URL === 'string') {
    vars.databaseUrl = env.DATABASE_URL
  }
  return vars;
}
