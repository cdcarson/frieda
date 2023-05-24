import type { Connection } from '@planetscale/database';
import yargs, { type Argv } from 'yargs';

import type {
  Options,
  CliOptions,
  FsPathInfo,
  FileResult,
  DirectoryResult
} from './types.js';
import { resolve, relative, dirname, basename, extname } from 'node:path';
import fs from 'fs-extra';
import ora from 'ora';
import { FRIEDA_RC_FILE_NAME, OPTION_DESCRIPTIONS } from './constants.js';
import { getStdOutCols, isPlainObject, squishWords } from './util.js';

export class Cli {
  #options: Options | undefined;
  #connection: Connection | undefined;

  async start(argv: string[]) {
    const { cliOptions, showHelp } = this.parseCliArgs(argv);
    if (cliOptions.help) {
      showHelp();
      console.log();
      return;
    }
    const spinner = ora('Reading current options').start();
    const { rcOptions } = await this.readFriedaRc();
  }

  async resolveOptions(
    cli: Partial<Options>,
    rc: Partial<Options>
  ): Promise<Options> {
    const envFile: string =
      typeof cli.envFile === 'string' && cli.envFile.length > 0
        ? cli.envFile
        : typeof rc.envFile === 'string' && rc.envFile.length > 0
        ? rc.envFile
        : '';
    const outputDirectory: string =
      typeof cli.outputDirectory === 'string' && cli.outputDirectory.length > 0
        ? cli.outputDirectory
        : typeof rc.outputDirectory === 'string' &&
          rc.outputDirectory.length > 0
        ? rc.outputDirectory
        : '';
    const schemaDirectory: string =
      typeof cli.schemaDirectory === 'string' && cli.schemaDirectory.length > 0
        ? cli.schemaDirectory
        : typeof rc.schemaDirectory === 'string' &&
          rc.schemaDirectory.length > 0
        ? rc.schemaDirectory
        : '';

    const errors: {
      envFile?: Error;
      outputDirectory?: Error;
      schemaDirectory?: Error;
    } = {};
    if (envFile) {
      
    }
  }

  parseCliArgs(argv: string[]): {
    cliOptions: CliOptions;
    showHelp: () => void;
  } {
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
          description: 'Explore/modify schema before generating code.'
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
    const parsed = app.parse() as CliOptions;
    const cliOptions: CliOptions = {};

    if (typeof parsed.envFile === 'string' && parsed.envFile.length > 0) {
      cliOptions.envFile = parsed.envFile;
    }
    if (
      typeof parsed.outputDirectory === 'string' &&
      parsed.outputDirectory.length > 0
    ) {
      cliOptions.outputDirectory = parsed.outputDirectory;
    }
    if (
      typeof parsed.schemaDirectory === 'string' &&
      parsed.schemaDirectory.length > 0
    ) {
      cliOptions.schemaDirectory = parsed.schemaDirectory;
    }
    if (typeof parsed.model === 'string' && parsed.model.length > 0) {
      cliOptions.model = parsed.model;
    }
    if (typeof parsed.field === 'string' && parsed.field.length > 0) {
      cliOptions.field = parsed.field;
    }
    if (typeof parsed.compileJs === 'boolean') {
      cliOptions.compileJs = parsed.compileJs;
    }
    if (typeof parsed.explore === 'boolean') {
      cliOptions.explore = parsed.explore;
    }
    if (typeof parsed.init === 'boolean') {
      cliOptions.init = parsed.init;
    }
    if (typeof parsed.help === 'boolean') {
      cliOptions.help = parsed.help;
    }

    return {
      cliOptions,
      showHelp: () => {
        app.showHelp();
      }
    };
  }

  async readFriedaRc(): Promise<{
    rcOptions: Partial<Options>;
    file: FileResult;
  }> {
    const file = await this.getFile(FRIEDA_RC_FILE_NAME);
    let rcOptions: Partial<Options> = {};
    if (file.isFile) {
      try {
        rcOptions = JSON.parse(file.contents || '');
        rcOptions = isPlainObject(rc) ? rc : {};
      } catch (error) {
        rcOptions = {};
      }
    }
    return {
      file,
      rcOptions
    };
  }

  getFsPathInfo(inputPath: string): FsPathInfo {
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
  }
  async getFile(inputPath: string): Promise<FileResult> {
    const paths = this.getFsPathInfo(inputPath);
    let stats: fs.Stats | undefined;
    try {
      stats = await fs.stat(paths.absolutePath);
    } catch (error) {
      /** ignore */
    }
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

  async getDirectory(inputPath: string): Promise<DirectoryResult> {
    const paths = this.getFsPathInfo(inputPath);
    let contents: string[] = [];
    let stats: fs.Stats | undefined;
    try {
      stats = await fs.stat(paths.absolutePath);
    } catch (error) {
      /**ignore */
    }
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
}
