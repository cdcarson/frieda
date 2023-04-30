import type { DirectoryResult } from '../types.js';
import { getPaths } from './get-paths.js';
import fs from 'fs-extra';
export const getDirectory = async (
  inputPath: string
): Promise<DirectoryResult> => {
  const paths = getPaths(inputPath);
    let contents: string[] = [];
    let stats: fs.Stats | undefined;
    try {
      stats = await fs.stat(paths.absolutePath);
    } catch (error) {}
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
