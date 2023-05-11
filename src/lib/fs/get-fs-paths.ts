import type { FsPaths } from './types.js';
import { resolve, relative, dirname, basename, extname } from 'node:path';
export const getFsPaths = (inputPath: string): FsPaths => {
  const cwd = process.cwd();
  const absolutePath = resolve(cwd, inputPath).replace(/\/$/, '');
  const relativePath = relative(cwd, absolutePath);
  return {
    inputPath,
    cwd: cwd,
    absolutePath,
    relativePath,
    dirname: dirname(absolutePath),
    basename: basename(absolutePath),
    extname: extname(absolutePath),
    isUnderCwd: absolutePath.startsWith(cwd) && absolutePath !== cwd
  };
};
