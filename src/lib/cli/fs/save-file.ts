import type { FsPaths } from '../types.js';
import { getFsPaths } from './get-fs-paths.js';
import fs from 'fs-extra';
export const saveFile = async (
  inputPath: string,
  contents: string
): Promise<FsPaths> => {
  const paths = getFsPaths(inputPath);
  await fs.ensureFile(paths.absolutePath);
  await fs.writeFile(paths.absolutePath, contents);
  return paths;
};
