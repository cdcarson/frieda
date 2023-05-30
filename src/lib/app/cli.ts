import kleur from 'kleur';
import { FileSystem } from './file-system.js';
import { Options } from './options.js';
import { Database } from './database.js';
import { connect } from '@planetscale/database';
import ora from 'ora';
import type {
  CliCommand,
  CliOptions,
  FetchedSchema,
  SchemaChange
} from './types.js';
import { Code } from './code.js';
import { Schema } from './schema.js';
import { fmtPath, log, prompt } from './utils.js';
import { showQuickStart } from './cli-screens.js';
import type { Model } from './model.js';

export class Cli {
  #cwd: string;
  #command: CliCommand;
  #fs: FileSystem;
  #options: Options;
  #database: Database | undefined;
  #fetchedSchema: FetchedSchema | undefined;
  #schema: Schema | undefined;
  #code: Code | undefined;
  constructor(cwd: string, command: CliCommand, cliOptions: CliOptions) {
    this.#cwd = cwd;
    this.#command = command;
    this.#fs = new FileSystem(cwd);
    this.#options = new Options(this.fs, cliOptions);
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
    await this.options.initialize(this.#cwd);
    await this.fetchSchema();
    await this.generateCode();
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
    log.message(
      [this.schema.currentSchemaFile, ...this.schema.changeFiles].map(
        (f) => `   - ${fmtPath(f.relativePath)}`
      )
    );
  }

  async generateCode() {
    const spinner = ora('Generating code').start();
    this.#code = await Code.create(this.schema, this.fs, this.options);
    spinner.succeed('Code generated.');
    log.message([
      ...this.code.files.map((f) => `   - ${fmtPath(f.relativePath)}`)
    ]);
  }

  async promptSchemaNext(): Promise<void> {
    type Next = 'showModels' | 'createModel' | 'showQuickStart' | 'showModel' | 'Exit';
    const choices: {title: string;
      value: Next;
    }[ ] = [
      {
        title: 'Show models'
      }
    ]
  }

  async promptModel(modelName?: string): Promise<Model> {
    type Choice = {
      title: string;
      value: Model;
    };
    const choices: Choice[] = this.schema.models.map((m) => {
      return {
        title: m.modelName,
        value: m
      };
    });

    const suggest = (inp: string, choices: Choice[]) => {
      return choices.filter(
        (c) =>
          c.title.toLowerCase().startsWith(inp.toLowerCase()) ||
          c.value.tableName.toLowerCase().startsWith(inp.toLowerCase())
      );
    };
    const initialChoice = suggest(modelName || '', choices)[0] || choices[0];
    return (await prompt({
      type: 'autocomplete',
      name: 'model',
      message: 'Model',
      initial: initialChoice.title,
      choices,
      limit: 5,
      suggest: async (inp: string, choices) => {
        return suggest(inp, choices as Choice[]);
      }
    })) as unknown as Model;
  }
}
