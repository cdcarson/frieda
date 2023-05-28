import yargs from 'yargs';
import {
  ENV_DB_URL_KEYS,
  FRIEDA_RC_FILE_NAME,
  OPTION_DESCRIPTIONS
} from './constants.js';
import type { FileSystem } from './file-system.js';
import type {
  BuildOptions,
  CliOptions,
  DatabaseDetails,
  DirectoryResult,
  FileResult
} from './types.js';
import {
  fmtPath,
  fmtVal,
  fmtVarName,
  getStdOutCols,
  isPlainObject,
  log,
  maskDatabaseURLPassword,
  prompt,
  promptValidateString,
  squishWords
} from './utils.js';
import { parse } from 'dotenv';
import ora from 'ora';
import kleur from 'kleur';
import prettier from 'prettier'
export class Options {
  #fs: FileSystem;
  #cliOptions: CliOptions;
  #rcFile: FileResult | undefined;
  #buildOptions: BuildOptions | undefined;
  #rcOptions: Partial<BuildOptions> | undefined;
  #databaseDetails: DatabaseDetails | undefined;
  #prettierOptions: prettier.Options | undefined;
  showHelp: () => void;
  constructor(fs: FileSystem, argv: string[]) {
    this.#fs = fs;
    const helpWidth = getStdOutCols() - 30;
    const app = yargs(argv)
      .scriptName('frieda')
      .wrap(null)
      .version(false)
      .help(false)
      .usage('$0 [options]', 'Generate code.')
      .options({
        explore: {
          alias: 'x',
          type: 'boolean',
          description: 'Explore/modify schema.'
        },
        model: {
          alias: 'm',
          type: 'string',
          description: 'The model to explore.'
        },
        field: {
          alias: 'f',
          type: 'string',
          description: 'The field to explore.'
        },
        'env-file': {
          alias: 'e',
          type: 'string',
          description: squishWords(OPTION_DESCRIPTIONS.envFile, helpWidth)
        },
        'output-directory': {
          alias: 'o',
          type: 'string',
          description: squishWords(
            OPTION_DESCRIPTIONS.outputDirectory,
            helpWidth
          )
        },
        'schema-directory': {
          alias: 's',
          type: 'string',
          description: squishWords(
            OPTION_DESCRIPTIONS.schemaDirectory,
            helpWidth
          )
        },
        'compile-js': {
          alias: 'j',
          type: 'boolean',
          description: squishWords(OPTION_DESCRIPTIONS.compileJs, helpWidth)
        },
        init: {
          alias: 'i',
          type: 'boolean',
          description: squishWords(
            '(Re)initialize options in .friedarc.json.',
            helpWidth
          )
        },
        help: {
          alias: 'h',
          type: 'boolean',
          description: 'Show help.'
        }
      })
      .group(['explore', 'model', 'field'], 'Schema Options:')
      .group(
        ['env-file', 'output-directory', 'schema-directory', 'compile-js'],
        'Code Generation Options:'
      )
      .group(['init', 'help'], 'Options:');
    this.#cliOptions = app.parseSync();
    
    this.showHelp = () => app.showHelp();
  }

  get help(): boolean {
    return typeof this.#cliOptions.help === 'boolean'
      ? this.#cliOptions.help
      : false;
  }
  get init(): boolean {
    return typeof this.#cliOptions.init === 'boolean'
      ? this.#cliOptions.init
      : false;
  }
  get explore(): boolean {
    return typeof this.#cliOptions.explore === 'boolean'
      ? this.#cliOptions.explore
      : false;
  }
  get model(): string {
    return typeof this.#cliOptions.model === 'string' &&
      this.#cliOptions.model.trim().length > 0
      ? this.#cliOptions.model.trim()
      : '';
  }
  get field(): string {
    return typeof this.#cliOptions.field === 'string' &&
      this.#cliOptions.field.trim().length > 0
      ? this.#cliOptions.field.trim()
      : '';
  }

  get compileJs(): boolean {
    if (!this.#buildOptions) {
      throw new Error('Options not initialized.');
    }
    return this.#buildOptions.compileJs;
  }
  get outputDirectory(): string {
    if (!this.#buildOptions) {
      throw new Error('Options not initialized.');
    }
    return this.#buildOptions.outputDirectory;
  }
  get schemaDirectory(): string {
    if (!this.#buildOptions) {
      throw new Error('Options not initialized.');
    }
    return this.#buildOptions.schemaDirectory;
  }
  get envFile(): string {
    if (!this.#buildOptions) {
      throw new Error('Options not initialized.');
    }
    return this.#buildOptions.envFile;
  }
  get databaseDetails(): DatabaseDetails {
    if (!this.#databaseDetails) {
      throw new Error('Options not initialized.');
    }
    return this.#databaseDetails;
  }

  get prettierOptions(): prettier.Options {
    if (!this.#prettierOptions) {
      throw new Error('Options not initialized.');
    }
    return this.#prettierOptions;
  }

  async initialize(cwd: string): Promise<void> {
    const spinner = ora('Reading current options').start();
    this.#prettierOptions = await prettier.resolveConfig(cwd) || {}
    const { rcFile, rcOptions } = await this.readRc();
    this.#rcFile = rcFile;
    this.#rcOptions = rcOptions;

    let databaseDetails: DatabaseDetails | undefined;
    let envFileError: Error | undefined;
    const envFile: string =
      typeof this.#cliOptions.envFile === 'string' &&
      this.#cliOptions.envFile.trim().length > 0
        ? this.#cliOptions.envFile.trim()
        : typeof rcOptions.envFile === 'string' &&
          rcOptions.envFile.trim().length > 0
        ? rcOptions.envFile.trim()
        : '';

    if (envFile.length > 0) {
      try {
        databaseDetails = await this.validateEnvFile(envFile);
      } catch (error) {
        envFileError = error as Error;
      }
    }

    let outputDirectoryResult: DirectoryResult | undefined;
    let outputDirectoryError: Error | undefined;
    const outputDirectory: string =
      typeof this.#cliOptions.outputDirectory === 'string' &&
      this.#cliOptions.outputDirectory.trim().length > 0
        ? this.#cliOptions.outputDirectory.trim()
        : typeof rcOptions.outputDirectory === 'string' &&
          rcOptions.outputDirectory.trim().length > 0
        ? rcOptions.outputDirectory.trim()
        : '';

    if (outputDirectory.length > 0) {
      try {
        outputDirectoryResult = await this.validateDirectory(
          'outputDirectory',
          outputDirectory
        );
      } catch (error) {
        outputDirectoryError = error as Error;
      }
    }

    let schemaDirectoryResult: DirectoryResult | undefined;
    let schemaDirectoryError: Error | undefined;
    const schemaDirectory: string =
      typeof this.#cliOptions.schemaDirectory === 'string' &&
      this.#cliOptions.schemaDirectory.trim().length > 0
        ? this.#cliOptions.schemaDirectory.trim()
        : typeof rcOptions.schemaDirectory === 'string' &&
          rcOptions.schemaDirectory.trim().length > 0
        ? rcOptions.schemaDirectory.trim()
        : '';

    if (schemaDirectory.length > 0) {
      try {
        schemaDirectoryResult = await this.validateDirectory(
          'outputDirectory',
          schemaDirectory
        );
      } catch (error) {
        schemaDirectoryError = error as Error;
      }
    }

    let compileJs =
      typeof this.#cliOptions.compileJs === 'boolean'
        ? this.#cliOptions.compileJs
        : typeof rcOptions.compileJs === 'boolean'
        ? rcOptions.compileJs
        : false;

    spinner.succeed('Current options read.');
    if (this.init || !databaseDetails || envFileError) {
      console.log();

      log.info([
        kleur.bold('Environment Variables File'),
        ...squishWords(OPTION_DESCRIPTIONS.envFile).split('\n'),
        `Current value in ${fmtPath(FRIEDA_RC_FILE_NAME)}: ${
          rcOptions.envFile ? fmtPath(rcOptions.envFile) : kleur.dim('not set')
        }`
      ]);
      if (envFileError) {
        log.error([envFileError.message, '']);
      }
      databaseDetails = await this.promptEnvFile(envFile);
    }

    if (this.init || !outputDirectoryResult || outputDirectoryError) {
      console.log();
      log.info([
        kleur.bold('Output Directory'),
        ...squishWords(OPTION_DESCRIPTIONS.outputDirectory).split('\n'),
        `Current value in ${fmtPath(FRIEDA_RC_FILE_NAME)}: ${
          rcOptions.outputDirectory
            ? fmtPath(rcOptions.outputDirectory)
            : kleur.dim('not set')
        }`
      ]);
      if (outputDirectoryError) {
        log.error([outputDirectoryError.message, '']);
      }
      outputDirectoryResult = await this.promptDirectory(
        'outputDirectory',
        outputDirectory,
        rcOptions.outputDirectory
      );
    }

    if (this.init || !schemaDirectoryResult || schemaDirectoryError) {
      console.log();
      log.info([
        kleur.bold('Schema Directory'),
        ...squishWords(OPTION_DESCRIPTIONS.schemaDirectory).split('\n'),
        `Current value in ${fmtPath(FRIEDA_RC_FILE_NAME)}: ${
          rcOptions.schemaDirectory
            ? fmtPath(rcOptions.schemaDirectory)
            : kleur.dim('not set')
        }`
      ]);
      if (schemaDirectoryError) {
        log.error([schemaDirectoryError.message, '']);
      }
      schemaDirectoryResult = await this.promptDirectory(
        'schemaDirectory',
        schemaDirectory,
        rcOptions.schemaDirectory
      );
    }

    if (this.init) {
      console.log();
      log.info([
        kleur.bold('Compile to Javascript'),
        ...squishWords(OPTION_DESCRIPTIONS.compileJs).split('\n'),
        `Current value in ${fmtPath(FRIEDA_RC_FILE_NAME)}: ${
          typeof rcOptions.compileJs === 'boolean'
            ? fmtVal(JSON.stringify(rcOptions.compileJs))
            : kleur.dim('not set')
        }`
      ]);
      compileJs = await prompt<boolean>({
        type: 'confirm',
        name: 'compileJs',
        message: fmtVarName('compileJs'),
        initial: compileJs
      });
    }

    this.#databaseDetails = databaseDetails;

    const buildOptions: BuildOptions = {
      envFile: databaseDetails.envFile,
      outputDirectory: outputDirectoryResult.relativePath,
      schemaDirectory: schemaDirectoryResult.relativePath,
      compileJs,
    }

    this.#buildOptions = buildOptions;

    const changedKeys = Object.keys(buildOptions).filter((k) => {
      const key = k as keyof BuildOptions;
      return buildOptions[key] !== rcOptions[key];
    });
    log.table([
      [fmtVarName('envFile'), fmtPath(buildOptions.envFile)],
      [kleur.dim(' - Database URL'), maskDatabaseURLPassword(databaseDetails.databaseUrl)],
      [kleur.dim(' - Environment Variable'), fmtVarName(databaseDetails.databaseUrlKey)],
      [fmtVarName('outputDirectory'), fmtPath(buildOptions.outputDirectory)],
      [fmtVarName('schemaDirectory'), fmtPath(buildOptions.schemaDirectory)],
      [fmtVarName('compileJs'), fmtVal(JSON.stringify(buildOptions.compileJs))],
    ])
    if (changedKeys.length > 0) {
      const save = await prompt({
        type: 'confirm',
        name: 'save',
        message: `Save options to ${fmtPath(FRIEDA_RC_FILE_NAME)}?`
      });
      if (save) {
        const saveSpinner = ora(`Saving ${fmtPath(FRIEDA_RC_FILE_NAME)}`).start();
        await this.#fs.prettifyAndSaveFile(FRIEDA_RC_FILE_NAME, JSON.stringify(buildOptions), 'json');
        saveSpinner.succeed(`${fmtPath(FRIEDA_RC_FILE_NAME)} saved.`)
      }
    }
  }

  

  async promptEnvFile(currentValue?: string): Promise<DatabaseDetails> {
    let databaseDetails: DatabaseDetails | undefined;
    const relPath = await prompt<string>({
      type: 'text',
      name: 'envFile',
      initial: currentValue,
      message: fmtVarName('envFile'),
      validate: promptValidateString
    });
    const spinner = ora('Validating database URL from file');
    try {
      databaseDetails = await this.validateEnvFile( relPath.trim())
      spinner.succeed('Database URL valid.')
    } catch (error) {
      spinner.fail((error as Error).message);
      return await this.promptEnvFile('')
    }
    return databaseDetails;
  }

  async validateEnvFile(
    envFilePath: string
  ): Promise<Required<DatabaseDetails>> {
    const fileResult = await this.#fs.getFileResult(envFilePath);
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
    const validResults: DatabaseDetails[] = foundKeys
      .filter((k) => this.validateDatabaseUrl(env[k]))
      .map((k) => {
        return {
          databaseUrl: env[k],
          databaseUrlKey: k,
          envFile: envFilePath
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

  async validateDirectory(
    key: keyof Pick<BuildOptions, 'outputDirectory' | 'schemaDirectory'>,
    relativePath: string
  ): Promise<DirectoryResult> {
    const dir = await this.#fs.getDirectory(relativePath);
    if (!dir.isDirectory && dir.exists) {
      throw new Error(
        `Error: ${fmtVarName(key)} directory path ${fmtPath(
          dir.relativePath
        )} is a file.`
      );
    }
    if (!dir.isUnderCwd) {
      throw new Error(
        `Error:  ${fmtVarName(key)} directory path ${fmtPath(
          dir.relativePath
        )} is not a subdirectory of the current working directory.`
      );
    }
    return dir;
  }

  async readRc(): Promise<{
    rcFile: FileResult;
    rcOptions: Partial<BuildOptions>;
  }> {
    const rcFile = await this.#fs.getFileResult(FRIEDA_RC_FILE_NAME);
    let rcOptions: Partial<BuildOptions> = {};
    if (rcFile.isFile) {
      try {
        rcOptions = JSON.parse(rcFile.contents || '');
        rcOptions = isPlainObject(rcOptions) ? rcOptions : {};
      } catch (error) {
        rcOptions = {};
      }
    }
    return {
      rcFile,
      rcOptions
    };
  }

  async promptDirectory (
    key: keyof Pick<Options, 'outputDirectory'|'schemaDirectory'>,
    currentValue?: string,
    currentRcValue?: string
  ): Promise<DirectoryResult> {
    let directoryResult: DirectoryResult;
    const relPath = await prompt<string>({
      type: 'text',
      name: 'outputDirectory',
      message: fmtVarName(key),
      initial: currentValue || '',
      validate: promptValidateString
    });
    const spinner = ora('Validating directory');
    try {
      directoryResult = await this.validateDirectory(key, relPath.trim())
      spinner.succeed('Directory valid.')
    } catch (error) {
      spinner.fail((error as Error).message);
      return await this.promptDirectory(key, '', currentRcValue)
    }
    
   
    if (
      directoryResult.exists &&
      !directoryResult.isEmpty &&
      directoryResult.relativePath !== currentRcValue
    ) {
      log.warn([
        `The ${fmtVarName(key)} directory path ${fmtPath(
          directoryResult.relativePath
        )} is not empty.`,
        ''
      ]);
      const goAhead = await prompt({
        type: 'confirm',
        name: 'c',
        message: `Continue?`
      });
      if (!goAhead) {
        return await this.promptDirectory(key, '', currentValue);
      }
    }
    return directoryResult;
  };
}
