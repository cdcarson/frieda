import type {
  FsPaths,
  FileResult,
  DirectoryResult,
  RcSettings,
  EnvFileDatabaseUrl
} from './types.js';
import { resolve, relative, extname, basename, dirname } from 'node:path';
import fs from 'fs-extra';
import prettier from 'prettier';
import { ENV_DB_URL_KEYS, FRIEDA_RC_FILE_NAME } from './constants.js';
import prompts from 'prompts';
import ora from 'ora';
import colors from 'picocolors';
import { fmtPath, fmtVarName, isPlainObject, onPromptCancel } from './utils.js';
import { parse } from 'dotenv';

export class Cli {
  constructor() {}

  getPaths(inputPath: string): FsPaths {
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
  async getDirectory(inputPath: string): Promise<DirectoryResult> {
    const paths = this.getPaths(inputPath);
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
  }
  async getFile(inputPath: string): Promise<FileResult> {
    const paths = this.getPaths(inputPath);
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
      result.contents = await fs.readFile(paths.absolutePath, 'utf-8');
    }
    return result;
  }

  async saveFile(inputPath: string, contents: string): Promise<FsPaths> {
    const paths = this.getPaths(inputPath);
    await fs.ensureFile(paths.absolutePath);
    await fs.writeFile(paths.absolutePath, contents);
    return paths;
  }

  async prettifyAndSaveFile(
    inputPath: string,
    contents: string,
    prettifyExtname?: string
  ): Promise<FsPaths> {
    const paths = this.getPaths(inputPath);
    const pathForPretty = prettifyExtname
      ? `${paths.absolutePath}.${prettifyExtname.replace(/^\.+/, '')}`
      : paths.absolutePath;
    const config = await prettier.resolveConfig(pathForPretty);
    const prettified = prettier.format(contents, {
      ...config,
      filepath: pathForPretty
    });
    return await this.saveFile(inputPath, prettified);
  }

  async readFriedaRc(): Promise<{
    file: FileResult;
    rc: Partial<RcSettings>;
  }> {
    const spinner = this.wait(`Reading ${fmtPath(FRIEDA_RC_FILE_NAME)}`);
    const file = await this.getFile(FRIEDA_RC_FILE_NAME);
    spinner.succeed();
    let rc: Partial<RcSettings> = {};
    if (file.isFile) {
      try {
        rc = JSON.parse(file.contents || '');
        rc = isPlainObject(rc) ? rc : {};
      } catch (error) {
        rc = {};
      }
    }
    return {
      file,
      rc
    };
  }

  async saveFriedaRc(settings: Partial<RcSettings>): Promise<void> {
    const spinner = this.wait(`Reading ${fmtPath(FRIEDA_RC_FILE_NAME)}`);
    await this.prettifyAndSaveFile(
      FRIEDA_RC_FILE_NAME,
      JSON.stringify(settings),
      'json'
    );
    spinner.succeed();
  }

  async promptSaveFriedarc(rcFile: FileResult): Promise<boolean> {
    const save = await this.prompt<boolean>({
      type: 'confirm',
      name: 'foo',
      message:
        (rcFile.exists ? 'Save changes' : 'Save settings') +
        ' to ' +
        fmtPath(FRIEDA_RC_FILE_NAME) +
        '?',
      initial: rcFile.exists === false
    });
    

    return save;
  }

  isValidDatabaseURL(urlStr: unknown): boolean {
    if (typeof urlStr !== 'string') {
      return false;
    }
    try {
      const url = new URL(urlStr);
      // won't work without this
      url.protocol = 'http:';
      const { username, hostname, password } = url;
      if (username.length === 0) {
        return false;
      }
      if (password.length === 0) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  readEnvFileDatabaseUrl = async (
    envFilePath: string
  ): Promise<EnvFileDatabaseUrl> => {
    const fileResult = await this.getFile(envFilePath);
    if (!fileResult.exists) {
      throw new Error(`The file ${fmtPath(envFilePath)} does not exist.`);
    }
    if (!fileResult.isFile) {
      throw new Error(`The path ${fmtPath(envFilePath)} is not a file.`);
    }

    const env = parse(fileResult.contents || '');
    const envKeys = Object.keys(env);
    const foundKeys = ENV_DB_URL_KEYS.filter(
      (k) => envKeys.includes(k) && env[k].length > 0
    );
    const validResults: EnvFileDatabaseUrl[] = foundKeys
      .filter((k) => this.isValidDatabaseURL(env[k]))
      .map((k) => {
        return {
          databaseUrl: env[k],
          databaseUrlKey: k,
          envFilePath
        };
      });
    if (!validResults[0]) {
      if (foundKeys.length > 0) {
        throw new Error(
          `Could not find a valid URL in ${fmtPath(
            envFilePath
          )}. Key(s): ${foundKeys.map((k) => fmtVarName(k)).join(', ')}`
        );
      } else {
        throw new Error(
          `Could not find ${ENV_DB_URL_KEYS.map((k) => fmtVarName(k)).join(
            ' or '
          )} in ${fmtPath(envFilePath)}.`
        );
      }
    }
    return validResults[0];
  };

  /**
   * Validate  a directory that we will write to. It must either not exist
   * or be a directory under the current working directory.
   * Non-emptiness is checked elsewhere.
   */
  async validateDirectory(
    relativePath: string,
    settingName: string
  ): Promise<DirectoryResult> {
    if (typeof relativePath !== 'string' || relativePath.trim().length === 0) {
      throw new Error(`Missing ${settingName}.`);
    }
    const dir = await this.getDirectory(relativePath);
    if (!dir.isDirectory && dir.exists) {
      throw new Error(`${settingName} (${dir.relativePath}) is a file.`);
    }
    if (!dir.isUnderCwd) {
      throw new Error(
        `${settingName}:The directory path must be a subdirectory of the current working directory.`
      );
    }
    return dir;
  }

  async prompt<T extends string|boolean>(options: prompts.PromptObject<T>): Promise<T> {
    const result = await prompts.prompt(
      {
        ...options
      },
      { onCancel: onPromptCancel }
    );
    return result;
  }
  wait(message: string) {
    const spinner = ora({
      text: message
    }).start();
    const succeed = () => {
      spinner.succeed();
    };
    const fail = (err: string) => {
      spinner.fail(`${message} ${colors.italic(colors.red(err))}`);
    };
    return { succeed, fail };
  }
}
