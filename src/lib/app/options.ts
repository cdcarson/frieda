import fs from 'fs-extra';
import { join, resolve } from 'node:path';
import type { FriedaCliArgs, FriedaOptions } from './types.js';
import ora from 'ora';
import { parse } from 'dotenv';
import prompts from 'prompts';
import {
  DEFAULT_PRETTIER_OPTIONS,
  ENV_DB_URL_KEYS,
  FRIEDA_RC_FILE_NAME
} from './constants.js';
import { connect, type Connection } from '@planetscale/database';
import prettier from 'prettier';
import { fmtPath, log, squishWords } from './utils.js';
import { OPTION_DESCRIPTIONS } from './option-descriptions.js';
type DatabaseOptions = {
  envFile: string;
  url: string;
  key: (typeof ENV_DB_URL_KEYS)[number];
};

export class Options {
  #databaseOptions: DatabaseOptions | undefined;
  #options: FriedaOptions | undefined;
  #connection: Connection | undefined;
  #prettierOptions: prettier.Options | undefined;
  static async create(
    cwd: string,
    cliArgs: Partial<FriedaCliArgs>
  ): Promise<Options> {
    const optiona = new Options(cwd, cliArgs);
    await optiona.init();
    return optiona;
  }

  private constructor(
    public readonly cwd: string,
    public readonly cliArgs: Partial<FriedaCliArgs>
  ) {}

  get friedaRcAbsolutePath(): string {
    return join(this.cwd, FRIEDA_RC_FILE_NAME);
  }
  get databaseOptions(): DatabaseOptions {
    if (!this.#databaseOptions) {
      throw new Error('not initialized');
    }
    return this.#databaseOptions;
  }
  get options(): FriedaOptions {
    if (!this.#options) {
      throw new Error('not initialized');
    }
    return this.#options;
  }
  get databaseUrl(): string {
    return this.databaseOptions.url;
  }
  get connection(): Connection {
    if (!this.#connection) {
      this.#connection = connect({ url: this.databaseUrl });
    }
    return this.#connection;
  }
  get outputDirectory(): string {
    return this.options.outputDirectory;
  }
  get outputDirectoryAbsolutePath(): string {
    return join(this.cwd, this.outputDirectory);
  }

  get compileJs(): boolean {
    return this.options.compileJs;
  }

  get prettierOptions(): prettier.Options {
    if (!this.#prettierOptions) {
      throw new Error('not initialized');
    }
    return this.#prettierOptions;
  }

  async init() {
    const readSpinner = ora('Reading options...');
    this.#prettierOptions =
      (await prettier.resolveConfig(this.cwd)) || DEFAULT_PRETTIER_OPTIONS;
    let rcExists = await fs.exists(this.friedaRcAbsolutePath);
    let rcOptions: Partial<FriedaOptions> = {};
    if (rcExists) {
      const stat = await fs.stat(this.friedaRcAbsolutePath);
      rcExists = stat.isFile();
    }
    if (rcExists) {
      const contents = await fs.readFile(this.friedaRcAbsolutePath, 'utf-8');
      try {
        rcOptions = JSON.parse(contents);
      } catch (error) {
        rcOptions = {};
      }
    }
    const envFile =
      typeof this.cliArgs.envFile === 'string' &&
      this.cliArgs.envFile.length > 0
        ? this.cliArgs.envFile
        : typeof rcOptions.envFile === 'string' && rcOptions.envFile.length > 0
        ? rcOptions.envFile
        : '';
    let envFileError: Error | undefined;
    let databaseOptions: DatabaseOptions | undefined;

    if (envFile.length > 0) {
      try {
        databaseOptions = await this.validateEnvFile(envFile);
      } catch (error) {
        envFileError = error as Error;
      }
    }

    let outputDirectory =
      typeof this.cliArgs.outputDirectory === 'string' &&
      this.cliArgs.outputDirectory.length > 0
        ? this.cliArgs.outputDirectory
        : typeof rcOptions.outputDirectory === 'string' &&
          rcOptions.outputDirectory.length > 0
        ? rcOptions.outputDirectory
        : '';
    let outputDirectoryError: Error | undefined;
    if (outputDirectory.length > 0) {
      try {
        outputDirectory = await this.validateOutputDirectory(outputDirectory);
      } catch (error) {
        outputDirectoryError = error as Error;
      }
    }
    readSpinner.info('Options read.');

    if (this.cliArgs.init || !databaseOptions) {
      if (envFileError) {
        log.error(squishWords(envFileError.message).split('\n'));
      }
      log.info(squishWords(OPTION_DESCRIPTIONS.envFile).split('\n'));

      databaseOptions = await this.promptEnvFile(envFile);
    }
    if (this.cliArgs.init || outputDirectory === '') {
      if (outputDirectoryError) {
        log.error(squishWords(outputDirectoryError.message).split('\n'));
      }
      log.info(squishWords(OPTION_DESCRIPTIONS.outputDirectory).split('\n'));

      outputDirectory = await this.promptOutputDirectory(outputDirectory);
    }
    let compileJs =
      typeof this.cliArgs.compileJs === 'boolean'
        ? this.cliArgs.compileJs
        : typeof rcOptions.compileJs === 'boolean'
        ? rcOptions.compileJs
        : false;
    if (this.cliArgs.init) {
      const answers = await prompts({
        name: 'compileJs',
        type: 'confirm',
        message: 'Compile to javascript?',
        initial: compileJs
      });
      compileJs = answers.compileJs;
    }
    const changed =
      databaseOptions.envFile !== rcOptions.envFile ||
      outputDirectory !== rcOptions.outputDirectory ||
      compileJs !== rcOptions.compileJs;
    if (changed) {
      const answers = await prompts({
        name: 'saveChanges',
        type: 'confirm',
        initial: true,
        message: `Save changes to ${fmtPath(FRIEDA_RC_FILE_NAME)}?`
      });
      if (answers.saveChanges) {
        const writeSpinner = ora(`Saving ${fmtPath(FRIEDA_RC_FILE_NAME)}...`);
        rcOptions = {
          ...rcOptions,
          outputDirectory,
          envFile: databaseOptions.envFile,
          compileJs
        };
        await fs.writeFile(
          this.friedaRcAbsolutePath,
          prettier.format(JSON.stringify(rcOptions), {
            ...this.prettierOptions,
            filepath: this.friedaRcAbsolutePath
          })
        );
        writeSpinner.succeed(`${fmtPath(FRIEDA_RC_FILE_NAME)} saved.`);
      }
    }
    this.#options = {
      compileJs,
      outputDirectory,
      envFile: databaseOptions.envFile
    };
    this.#databaseOptions = databaseOptions;
  }

  async promptEnvFile(currentValue: string): Promise<DatabaseOptions> {
    const answers = await prompts({
      name: 'relPath',
      type: 'text',
      message: 'Environment variables file',
      initial: currentValue,
      validate: (s) => {
        if (typeof s !== 'string' || s.length === 0) {
          return 'Required.';
        }

        return true;
      }
    });
    const spinner = ora('Validating database URL...').start();
    try {
      const result = await this.validateEnvFile(answers.relPath);
      spinner.succeed('Database URL found.');
      return result;
    } catch (error) {
      spinner.fail();
      log.error(squishWords((error as Error).message).split('\n'));
      return await this.promptEnvFile('');
    }
  }

  async validateEnvFile(relPath: string): Promise<DatabaseOptions> {
    const path = join(this.cwd, relPath);
    const exists = await fs.exists(path);
    if (!exists) {
      throw new Error(`File ${relPath} does not exist.`);
    }
    const stat = await fs.stat(path);
    if (!stat.isFile) {
      throw new Error(`Not a file: ${relPath}.`);
    }
    const contents = await fs.readFile(path, 'utf-8');
    const env = parse(contents);
    const envKeys = Object.keys(env);
    const foundKeys = ENV_DB_URL_KEYS.filter(
      (k) => envKeys.includes(k) && env[k].length > 0
    );
    if (foundKeys.length === 0) {
      throw new Error(
        `Could not find either ${ENV_DB_URL_KEYS.join(' or ')} in ${relPath}.`
      );
    }
    const key: (typeof ENV_DB_URL_KEYS)[number] =
      foundKeys.shift() as (typeof ENV_DB_URL_KEYS)[number];
    if (!this.validateDatabaseUrl(env[key])) {
      throw new Error(`${key} in ${relPath} is not a valid database URL.`);
    }
    return {
      envFile: relPath,
      key,
      url: env[key]
    };
  }

  validateDatabaseUrl(urlStr: unknown): boolean {
    if (typeof urlStr !== 'string') {
      return false;
    }
    try {
      const url = new URL(urlStr);
      // won't work without this
      url.protocol = 'http:';
      const { username, password } = url;
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

  async promptOutputDirectory(
    currentValue: string,
    rcValue?: string
  ): Promise<string> {
    const answers = await prompts({
      name: 'relPath',
      type: 'text',
      message: 'Output directory',
      initial: currentValue,
      validate: (s) => {
        if (typeof s !== 'string' || s.length === 0) {
          return 'Required.';
        }

        return true;
      }
    });
    const spinner = ora('Validating output directory...').start();
    try {
      const result = await this.validateOutputDirectory(answers.relPath);

      spinner.succeed('Output directory valid.');
      return result;
    } catch (error) {
      spinner.fail();
      log.error(squishWords((error as Error).message).split('\n'));
      return await this.promptOutputDirectory('', rcValue);
    }
  }

  async validateOutputDirectory(relPath: string): Promise<string> {
    const absolutePath = resolve(this.cwd, relPath).replace(/\/$/, '');
    if (!absolutePath.startsWith(this.cwd) || absolutePath === this.cwd) {
      throw new Error(
        `The output directory must a subdirectory of the current working directory.`
      );
    }

    const exists = await fs.exists(absolutePath);
    if (exists) {
      const stat = await fs.stat(absolutePath);
      if (!stat.isDirectory()) {
        throw new Error(`${fmtPath(relPath)} exists, but is not a directory.`);
      }
    }

    return relPath;
  }
}
