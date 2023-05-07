import type { FileResult } from '../types.js';
import { getFsPaths } from './get-fs-paths.js';
import fs from 'fs-extra';
export const getFile = async (inputPath: string): Promise<FileResult> => {
  const paths = getFsPaths(inputPath);
  let stats: fs.Stats | undefined;
  try {
    stats = await fs.stat(paths.absolutePath);
  } catch (error) {
    /** ignore */
  }
  const result: FileResult = {
    ...paths,
    exists: stats !== undefined,
    isFile: stats ? stats.isFile() : false
  };
  if (result.isFile) {
    result.contents = await fs.readFile(paths.absolutePath, 'utf-8');
  }
  return result;
};
