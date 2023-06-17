import { join, relative, dirname, basename, extname } from 'node:path';
import fs from 'fs-extra';
import type {
  AppOptions,
  DirectoryResult,
  FileResult,
  PathResult
} from './shared.js';

export const getPathResult = (
  options: AppOptions,
  inputPath: string
): PathResult => {
  const absolutePath = join(options.projectAbsolutePath, inputPath).replace(
    /\/$/,
    ''
  );
  const relativePath = relative(options.projectAbsolutePath, absolutePath);
  return {
    inputPath,
    cwd: options.projectAbsolutePath,
    absolutePath,
    relativePath,
    dirname: dirname(absolutePath),
    basename: basename(absolutePath),
    extname: extname(absolutePath),
    isUnderCwd:
      absolutePath.startsWith(options.projectAbsolutePath) &&
      absolutePath !== options.projectAbsolutePath
  };
};
export const getFileResult = async (
  options: AppOptions,
  inputPath: string
): Promise<FileResult> => {
  const pathResult = getPathResult(options, inputPath);
  let stats: fs.Stats | undefined;
  try {
    stats = await fs.stat(pathResult.absolutePath);
  } catch (error) {
    /** ignore */
  }
  const result: FileResult = {
    ...pathResult,
    exists: stats !== undefined,
    isFile: stats ? stats.isFile() : false
  };
  if (result.isFile) {
    result.contents = await fs.readFile(pathResult.absolutePath, 'utf-8');
  }
  return result;
};

export const getDirectory = async (
  options: AppOptions,
  inputPath: string
): Promise<DirectoryResult> => {
  const pathResult = getPathResult(options, inputPath);
  let contents: string[] = [];
  let stats: fs.Stats | undefined;
  try {
    stats = await fs.stat(pathResult.absolutePath);
  } catch (error) {
    /**ignore */
  }
  const isDirectory = stats ? stats.isDirectory() : false;
  if (isDirectory) {
    contents = await fs.readdir(pathResult.absolutePath);
  }
  return {
    ...pathResult,
    exists: stats !== undefined,
    isEmpty: contents.length === 0,
    isDirectory
  };
};

export const saveFile = async (
  options: AppOptions,
  inputPath: string,
  contents: string
): Promise<FileResult> => {
  const pathResult = getPathResult(options, inputPath);
  await fs.ensureFile(pathResult.absolutePath);
  await fs.writeFile(pathResult.absolutePath, contents);
  return await getFileResult(options, pathResult.relativePath);
};
