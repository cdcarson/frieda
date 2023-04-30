import type { FsPaths } from "../types";
import { resolve, relative, extname, basename, dirname } from 'node:path';
export const getPaths = (inputPath: string): FsPaths => {
  const cwd = process.cwd();
  const absolutePath = resolve(cwd, inputPath).replace(/\/$/, '');
  const relativePath = relative(cwd, absolutePath);
  return {
    inputPath,
    cwd,
    absolutePath,
    relativePath,
    dirname: dirname(absolutePath),
    basename: basename(absolutePath),
    extname: extname(absolutePath),
    isUnderCwd: absolutePath.startsWith(cwd) && absolutePath !== cwd
  };
}

