import { spinner, isCancel, confirm } from '@clack/prompts';
import { cancelAndExit } from './cancel-and-exit.js';
import type { FriedaRcVars } from './types.js';
import fs from 'fs-extra'
import { getRcFilePath, formatFilePath } from './utils.js';
import { readFriedaRcVars } from './read-frieda-vars.js';
export const promptSaveFriedaRc= async (
  vars: Partial<FriedaRcVars>
): Promise<boolean> => {
  const rcPath = getRcFilePath();
  const rcPathFmted = formatFilePath(rcPath)
  const save = await confirm({message: `Save to ${rcPathFmted}?`});
  if (isCancel(save)) {
    cancelAndExit();
  }
  if (! save) {
    return false;
  }
  const s = spinner();
  s.start('Saving...')
  const old = await readFriedaRcVars()
  await fs.writeJSON(rcPath, {...old, ...vars}, {spaces: 1});
  s.stop(`${rcPathFmted} saved.`)
  return true;
};


