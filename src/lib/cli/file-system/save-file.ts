import type { FsPaths } from '../types';
import { getPaths } from './get-paths';
import fs from 'fs-extra';
export const saveFile = async (
  inputPath: string,
  contents: string
): Promise<FsPaths> => {
  const paths = getPaths(inputPath);
  await fs.ensureFile(paths.absolutePath);
  await fs.writeFile(paths.absolutePath, contents);
  return paths;
};
