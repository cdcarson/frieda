import { resolve, relative, dirname, basename, extname } from 'node:path';
import type { DirectoryResult, FileResult, PathResult } from './types.js';
import fs from 'fs-extra';
import prettier from 'prettier';
export class FileSystem {
  #cwd: string;
  constructor(cwd: string) {
    this.#cwd = cwd;
  }

  get cwd(): string {
    return this.#cwd;
  }

  getPathResult(inputPath: string): PathResult {
    const absolutePath = resolve(this.cwd, inputPath).replace(/\/$/, '');
    const relativePath = relative(this.cwd, absolutePath);
    return {
      inputPath,
      cwd: this.cwd,
      absolutePath,
      relativePath,
      dirname: dirname(absolutePath),
      basename: basename(absolutePath),
      extname: extname(absolutePath),
      isUnderCwd: absolutePath.startsWith(this.cwd) && absolutePath !== this.cwd
    };
  }

  async getFileResult(inputPath: string): Promise<FileResult> {
    const pathResult = this.getPathResult(inputPath);
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
  }

  async getDirectory(inputPath: string): Promise<DirectoryResult> {
    const pathResult = this.getPathResult(inputPath);
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
  }

  async saveFile(inputPath: string, contents: string): Promise<PathResult> {
    const pathResult = this.getPathResult(inputPath);
    await fs.ensureFile(pathResult.absolutePath);
    await fs.writeFile(pathResult.absolutePath, contents);
    return pathResult;
  }

  async prettifyAndSaveFile(
    inputPath: string,
    contents: string,
    prettifyExtname?: string
  ): Promise<PathResult> {
    const pathResult = this.getPathResult(inputPath);
    const pathForPretty = prettifyExtname
      ? `${pathResult.absolutePath}.${prettifyExtname.replace(/^\.+/, '')}`
      : pathResult.absolutePath;
    const config = await prettier.resolveConfig(pathForPretty);
    const prettified = prettier.format(contents, {
      ...config,
      filepath: pathForPretty
    });
    return await this.saveFile(inputPath, prettified);
  }

  
}
