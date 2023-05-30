import kleur from 'kleur';
import { FileSystem } from './file-system.js';
import { Options } from './options.js';
import { Database } from './database.js';
import { FRIEDA_VERSION } from '$lib/version.js';
import { connect } from '@planetscale/database';
import ora from 'ora';
import type { FetchedSchema, SchemaChange } from './types.js';
import { Code } from './code.js';
import { Schema } from './schema.js';
import { fmtPath, log } from './utils.js';
import { Explorer } from './explorer.js';

export class Cli {
  #cwd: string;
  #fs: FileSystem;
  #options: Options;
  #database: Database | undefined;
  #fetchedSchema: FetchedSchema | undefined;
  #schema: Schema | undefined;
  #code: Code | undefined;
  constructor(cwd: string, argv: string[]) {
    this.#cwd = cwd;
    this.#fs = new FileSystem(cwd);
    this.#options = new Options(this.fs, argv);
  }
  get fs(): FileSystem {
    return this.#fs;
  }
  get options(): Options {
    return this.#options;
  }

  get database(): Database {
    if (!this.#database) {
      this.#database = new Database(
        connect({ url: this.options.databaseDetails.databaseUrl })
      );
    }
    return this.#database;
  }

  get fetchedSchema(): FetchedSchema {
    if (!this.#fetchedSchema) {
      throw new Error('Schema not yet fetched');
    }
    return this.#fetchedSchema;
  }
  get schema(): Schema {
    if (!this.#schema) {
      throw new Error('Schema not yet fetched');
    }
    return this.#schema;
  }
  get code(): Code {
    if (!this.#code) {
      throw new Error('Code not yet generated');
    }
    return this.#code;
  }

  async execute() {
    console.log(kleur.bold('frieda'), kleur.dim(`v${FRIEDA_VERSION}`), '🦮');
    console.log();
    if (this.options.help) {
      this.options.showHelp();
      console.log();
      return;
    }
    await this.options.initialize(this.#cwd);
    await this.fetchSchema();
    await this.generateCode();
    if (this.options.explore !== null) {
      const explorer = new Explorer(
        this.schema,
        this.code,
        this.fs,
        this.database,
        this.options
      );
      await explorer.run();
    }
  }

  async fetchSchema(change?: SchemaChange) {
    const spinner = ora('Fetching schema').start();
    this.#fetchedSchema = await this.database.fetchSchema();
    this.#schema = await Schema.create(
      this.fetchedSchema,
      this.options,
      this.fs,
      change
    );
    spinner.succeed('Schema fetched.');
    const changeFiles = this.schema.changeFiles.map(
      (f) => ` - ${fmtPath(f.relativePath)}`
    );
    if (changeFiles.length > 0) {
      changeFiles.unshift(kleur.bold('Schema changes:'));
    }
    log.info([
      kleur.bold('Current schema:'),
      ` - ${fmtPath(this.schema.currentSchemaFile.relativePath)}`,
      ...changeFiles
    ]);
  }

  async generateCode() {
    const spinner = ora('Generating code').start();
    this.#code = await Code.create(this.schema, this.fs, this.options);
    spinner.succeed('Code generated.');
    log.info([
      kleur.bold('Generated files:'),
      ...this.code.files.map((f) => ` - ${fmtPath(f.relativePath)}`)
    ]);
  }
}
