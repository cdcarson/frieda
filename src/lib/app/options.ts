import type { FriedaCliArgs, FriedaOptions } from './types.js';
import ora from 'ora';
import { parse } from 'dotenv';
import prompts from 'prompts';
import { ENV_DB_URL_KEYS } from './constants.js';
import { connect, type Connection } from '@planetscale/database';
import { fmtPath, fmtVarName, log, squishWords } from './utils.js';
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

  static friedaRcPath = '.friedarc.json';

  static optionDescriptions = {
    envFile: `The path to an environment variables file containing the database url as either ${ENV_DB_URL_KEYS.map(
      (s) => fmtVarName(s)
    ).join(' or ')}.`,
    outputDirectory: `Output directory path for generated code. It should be convenient to, but separate from, your own code. Example: ${fmtPath(
      'src/db/__generated'
    )} `,
    init: `(Re)initialize options in ${fmtPath(Options.friedaRcPath)}.`,
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

  get outputDirectoryPath(): string {
    return this.options.outputDirectory;
  }

  get schemaDefinitionPath(): string {
    return join(this.outputDirectoryPath, 'schema-definition.d.ts');
  }

  get generatedDirectoryPath(): string {
    return join(this.outputDirectoryPath, 'generated');
  }

  async init() {
    const readSpinner = ora('Reading options...').start();
    await FilesIO.init(this.cwd);
    const filesIo = FilesIO.get();
    const rcOptions = await this.readFriedaRc();

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
    readSpinner.info('Options read.');

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

    const changed =
      databaseOptions.envFile !== rcOptions.envFile ||
      outputDirectory !== rcOptions.outputDirectory;
    if (changed) {
      const answers = await prompts({
        name: 'saveChanges',
        type: 'confirm',
        initial: true,
        message: `Save changes to ${fmtPath(Options.friedaRcPath)}?`
      });
      if (answers.saveChanges) {
        const writeSpinner = ora(`Saving ${fmtPath(Options.friedaRcPath)}...`);
        await filesIo.write(
          Options.friedaRcPath,
          JSON.stringify({
            ...rcOptions,
            outputDirectory,
            envFile: databaseOptions.envFile
          })
        );
        writeSpinner.succeed(`${fmtPath(Options.friedaRcPath)} saved.`);
      }
    }
    this.#options = {
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
      const result = await this.validateDirectory(answers.relPath);
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

  async readFriedaRc(): Promise<Partial<FriedaOptions>> {
    const { exists, contents } = await FilesIO.get().read(Options.friedaRcPath);
    if (!exists) {
      return {};
    }
    try {
      return JSON.parse(contents);
    } catch (error) {
      return {};
    }
  }
}
