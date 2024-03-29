import type { FriedaCliArgs, FriedaOptions } from './types.js';
import ora from 'ora';
import { parse } from 'dotenv';
import {
  ENV_DB_URL_KEYS,
  FRIEDA_DATABASE_FILENAME as FRIEDA_FILENAME,
  FRIEDA_RC_FILENAME,
  MODEL_DEFINITION_FILENAME
} from './constants.js';
import { connect, type Connection } from '@planetscale/database';
import { fmtPath, fmtVarName, log, squishWords, prompt } from './utils.js';
import fsExtra from 'fs-extra';
import { resolve } from 'node:path';
import { FilesIO } from './files-io.js';
import { join } from 'node:path';

type DatabaseOptions = {
  envFile: string;
  url: string;
  key: (typeof ENV_DB_URL_KEYS)[number];
};

export class Options {
  #databaseOptions: DatabaseOptions | undefined;
  #options: FriedaOptions | undefined;
  #connection: Connection | undefined;

  static async create(
    cwd: string,
    cliArgs: Partial<FriedaCliArgs>
  ): Promise<Options> {
    const optiona = new Options(cwd, cliArgs);
    await optiona.init();
    return optiona;
  }

  static optionDescriptions = {
    envFile: `The path to an environment variables file containing the database url as either ${ENV_DB_URL_KEYS.map(
      (s) => fmtVarName(s)
    ).join(' or ')}.`,
    outputDirectory: `Database code directory. It has (1) ${fmtPath(
      MODEL_DEFINITION_FILENAME
    )}, 
      which you can edit to fine-tune the schema's javascript types, and (2) 
      ${fmtPath(FRIEDA_FILENAME)}, which contains the generated database code.
     Example: ${fmtPath('src/db')} `,
    compileJs: `
      Whether or not to produce javascript files rather than typescript.
    `,
    init: `(Re)initialize options in ${fmtPath(FRIEDA_RC_FILENAME)}.`,
    help: 'Show this help'
  };

  private constructor(
    public readonly cwd: string,
    public readonly cliArgs: Partial<FriedaCliArgs>
  ) {}

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
  get compileJs(): boolean {
    return this.options.compileJs;
  }

  get outputDirectoryPath(): string {
    return this.options.outputDirectory;
  }

  get modelDefinitionFilePath(): string {
    return join(this.outputDirectoryPath, MODEL_DEFINITION_FILENAME);
  }
  get friedaFilePath(): string {
    return join(this.outputDirectoryPath, FRIEDA_FILENAME);
  }

  async init() {
    const readSpinner = ora('Reading options...').start();
    await FilesIO.init(this.cwd);
    const filesIo = FilesIO.get();
    const { exists: rcExists, rcOptions } = await this.readFriedaRc();

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
        outputDirectory = await this.validateDirectory(outputDirectory);
      } catch (error) {
        outputDirectoryError = error as Error;
      }
    }
    readSpinner.succeed('Options read.');

    if (this.cliArgs.init || !databaseOptions) {
      if (envFileError) {
        log.error(squishWords(envFileError.message).split('\n'));
      }
      log.info(squishWords(Options.optionDescriptions.envFile).split('\n'));

      databaseOptions = await this.promptEnvFile(envFile);
    }
    if (this.cliArgs.init || outputDirectory === '') {
      if (outputDirectoryError) {
        log.error(squishWords(outputDirectoryError.message).split('\n'));
      }
      log.info(
        squishWords(Options.optionDescriptions.outputDirectory).split('\n')
      );

      outputDirectory = await this.promptOutputDirectory(outputDirectory);
    }
    let compileJs = rcOptions.compileJs === true;
    if (!rcExists || this.cliArgs.init) {
      log.info(squishWords(Options.optionDescriptions.compileJs).split('\n'));
      compileJs = await prompt({
        type: 'confirm',
        name: 'compileJs',
        message: 'Compile to javascript?',
        initial: compileJs
      });
    }

    const changed =
      databaseOptions.envFile !== rcOptions.envFile ||
      outputDirectory !== rcOptions.outputDirectory ||
      compileJs !== rcOptions.compileJs;
    if (changed) {
      const saveChanges = await prompt({
        name: 'saveChanges',
        type: 'confirm',
        initial: true,
        message: `Save changes to ${fmtPath(FRIEDA_RC_FILENAME)}?`
      });
      if (saveChanges) {
        const writeSpinner = ora(`Saving ${fmtPath(FRIEDA_RC_FILENAME)}...`);
        await filesIo.write(
          FRIEDA_RC_FILENAME,
          JSON.stringify({
            ...rcOptions,
            outputDirectory,
            envFile: databaseOptions.envFile,
            compileJs
          })
        );
        writeSpinner.succeed(`${fmtPath(FRIEDA_RC_FILENAME)} saved.`);
      }
    }
    this.#options = {
      outputDirectory,
      envFile: databaseOptions.envFile,
      compileJs
    };
    this.#databaseOptions = databaseOptions;
  }

  async promptEnvFile(currentValue: string): Promise<DatabaseOptions> {
    const relPath = await prompt<string>({
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
      const result = await this.validateEnvFile(relPath);
      spinner.succeed('Database URL found.');
      return result;
    } catch (error) {
      spinner.fail();
      log.error(squishWords((error as Error).message).split('\n'));
      return await this.promptEnvFile('');
    }
  }

  async validateEnvFile(relPath: string): Promise<DatabaseOptions> {
    const { exists, contents } = await FilesIO.get().read(relPath);
    if (!exists) {
      throw new Error(`File ${relPath} does not exist.`);
    }
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
    const relPath = await prompt<string>({
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
      const result = await this.validateDirectory(relPath);
      spinner.succeed('Output directory valid.');
      return result;
    } catch (error) {
      spinner.fail();
      log.error(squishWords((error as Error).message).split('\n'));
      return await this.promptOutputDirectory('', rcValue);
    }
  }

  async validateDirectory(relPath: string): Promise<string> {
    const absolutePath = resolve(this.cwd, relPath).replace(/\/$/, '');
    if (!absolutePath.startsWith(this.cwd) || absolutePath === this.cwd) {
      throw new Error(
        `The directory must a subdirectory of the current working directory.`
      );
    }

    const exists = await fsExtra.exists(absolutePath);
    if (exists) {
      const stat = await fsExtra.stat(absolutePath);
      if (!stat.isDirectory()) {
        throw new Error(`${fmtPath(relPath)} exists, but is not a directory.`);
      }
    }
    return relPath;
  }

  async readFriedaRc(): Promise<{
    exists: boolean;
    rcOptions: Partial<FriedaOptions>;
  }> {
    const { exists, contents } = await FilesIO.get().read(FRIEDA_RC_FILENAME);
    if (!exists) {
      return {
        exists,
        rcOptions: {}
      };
    }
    try {
      return {
        exists: true,
        rcOptions: JSON.parse(contents)
      };
    } catch (error) {
      return {
        exists: false,
        rcOptions: {}
      };
    }
  }
}
