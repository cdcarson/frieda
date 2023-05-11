import type { DirectoryResult } from './types.js';
import { getFsPaths } from './get-fs-paths.js';
import fs from 'fs-extra';
export const getDirectory = async (
  inputPath: string
): Promise<DirectoryResult> => {
  const paths = getFsPaths(inputPath);
  let contents: string[] = [];
  let stats: fs.Stats | undefined;
  try {
    stats = await fs.stat(paths.absolutePath);
  } catch (error) {
    /**ignore */
  }
  const isDirectory = stats ? stats.isDirectory() : false;
  if (isDirectory) {
    contents = await fs.readdir(paths.absolutePath);
  }
  return {
    ...paths,
    exists: stats !== undefined,
    isEmpty: contents.length === 0,
    isDirectory
  };
};
