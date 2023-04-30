import type { FileResult } from '../types.js';
import fs from 'fs-extra';
import { getPaths } from './get-paths.js';
export const getFile = async (inputPath: string): Promise<FileResult> => {
  const paths = getPaths(inputPath);
  let stats: fs.Stats | undefined;
  try {
    stats = await fs.stat(paths.absolutePath);
  } catch (error) {}
  const result: FileResult = {
    ...paths,
    exists: stats !== undefined,
    isFile: stats ? stats.isFile() : false
  };
  if (result.isFile) {
    result.contents = await fs.readFile(paths.absolutePath, 'utf-8')
  }
  return result;
};
