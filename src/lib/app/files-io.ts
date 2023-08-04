import fsExtra from 'fs-extra';
import { resolve, extname } from 'node:path';
import type { ReadFileResult } from './types.js';
import prettier from 'prettier';
import { DEFAULT_PRETTIER_OPTIONS } from './constants.js';
import { fmtPath } from './utils.js';

export class FilesIO {
  static #inst: FilesIO;
  static async init(cwd: string): Promise<void> {
    if (FilesIO.#inst) {
      throw Error('FilesIO already instantiated.');
    }
    let prettierOptions = await prettier.resolveConfig(cwd);
    if (!prettierOptions) {
      prettierOptions = { ...DEFAULT_PRETTIER_OPTIONS };
    }
    FilesIO.#inst = new FilesIO(cwd, prettierOptions);
  }
  static get(): FilesIO {
    if (!FilesIO.#inst) {
      throw new Error('Files not instantiated');
    }
    return FilesIO.#inst;
  }

  private constructor(
    public readonly cwd: string,
    public readonly prettierOptions: prettier.Options
  ) {}

  async write(relPath: string, contents: string): Promise<void> {
    await this.isValidFilePathOrThrow(relPath);

    let prettyContents = contents;
    if (['.json', '.js', '.ts'].includes(extname(relPath))) {
      prettyContents = prettier.format(contents, {
        ...this.prettierOptions,
        filepath: relPath
      });
    }

    const abs = this.abspath(relPath);
    await fsExtra.ensureFile(abs);
    await fsExtra.writeFile(abs, prettyContents);
  }

  async read(relPath: string): Promise<ReadFileResult> {
    const abspath = this.abspath(relPath);
    const { exists } = await this.isValidFilePathOrThrow(relPath);
    if (!exists) {
      return {
        abspath,
        exists,
        contents: ''
      };
    }
    return {
      abspath,
      exists,
      contents: await fsExtra.readFile(abspath, 'utf8')
    };
  }

  async emptyDir(relPath: string): Promise<void> {
    await fsExtra.emptyDir(this.abspath(relPath));
  }

  abspath(relPath: string): string {
    return resolve(this.cwd, relPath);
  }

  async exists(relPath: string): Promise<boolean> {
    return await fsExtra.exists(this.abspath(relPath));
  }

  async copy(fromRel: string, toRel: string) {
    await fsExtra.copy(this.abspath(fromRel), this.abspath(toRel));
  }

  async isValidFilePathOrThrow(relPath: string): Promise<{ exists: boolean }> {
    const exists = await this.exists(relPath);
    if (exists) {
      const stat = await fsExtra.stat(this.abspath(relPath));
      if (!stat.isFile()) {
        throw new Error(fmtPath(relPath) + ' is not a file.');
      }
    }
    return { exists };
  }
}
