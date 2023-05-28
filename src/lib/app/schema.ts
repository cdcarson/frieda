import { FRIEDA_VERSION } from '$lib/version.js';
import type {
  CastType,
  FullTextSearchIndex,
  SchemaCastMap,
  SchemaDefinition
} from '../api/types.js';
import type { FileSystem } from './file-system.js';
import { Model } from './model.js';
import type { Options } from './options.js';
import type {
  FetchedSchema,
  GeneratedFile,
  LineNumbers,
  SchemaChange
} from './types.js';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export class Schema {
  #models: Model[] = [];
  #cast: SchemaCastMap = {};
  #currentSchemaFile: GeneratedFile;
  #changeFiles: GeneratedFile[] = [];
  #schemaHash = '';
  #schemaSqlLineNumbers: LineNumbers = {};
  #fullTextSearchIndexes: { [key: string]: FullTextSearchIndex } = {};
  static async create(
    fetchedSchema: FetchedSchema,
    options: Options,
    fs: FileSystem,
    change?: SchemaChange
  ): Promise<Schema> {
    const schema = new Schema(fetchedSchema, options, fs);
    await schema.generate(change);
    return schema;
  }

  private constructor(
    public readonly fetchedSchema: FetchedSchema,
    public readonly options: Options,
    public readonly fs: FileSystem
  ) {
    this.#currentSchemaFile = {
      ...this.fs.getPathResult(
        join(this.options.schemaDirectory, 'current-schema.sql')
      ),
      contents: ''
    };
  }

  async generate(change?: SchemaChange) {
    this.#models = this.fetchedSchema.tables.map((t) => new Model(t));
    this.#cast = this.models.reduce((acc, m) => {
      const copy = { ...acc };
      m.fields.forEach((f) => {
        const key = `${m.tableName}.${f.columnName}`;
        copy[key] = f.castType;
      });
      return copy;
    }, {} as { [k: string]: CastType });
    const schemaSql = this.getCreateTablesSql(this.fetchedSchema);
    this.#schemaHash = this.getSchemaHash(schemaSql);
    const schemaSqlContent = [
      `-- Schema fetched ${this.fetchedSchema.fetched.toUTCString()}`,
      schemaSql
    ].join('\n\n');

    const lines = schemaSqlContent.split('\n');

    this.fetchedSchema.tables.forEach((t) => {
      this.#schemaSqlLineNumbers[t.name] = lines.findIndex((line) =>
        line.startsWith(`CREATE TABLE \`${t.name}\``)
      );
    });

    this.#currentSchemaFile = {
      ...this.fs.getPathResult(
        join(this.options.schemaDirectory, 'current-schema.sql')
      ),
      contents: schemaSqlContent
    };
    if (change) {
      const d = new Date();
      const changePath = join(
        this.options.schemaDirectory,
        'changes',
        d.toISOString()
      );
      this.#changeFiles.push(
        {
          ...this.fs.getPathResult(join(changePath, '-schema.sql')),
          contents: [
            `-- Schema before change`,
            this.getCreateTablesSql(change.previousSchema)
          ].join('\n\n')
        },
        {
          ...this.fs.getPathResult(join(changePath, '+change.sql')),
          contents: [`-- Schema change`, change.changeSql].join('\n\n')
        },
        {
          ...this.fs.getPathResult(join(changePath, '-schema.sql')),
          contents: [
            `-- Schema after change`,
            this.getCreateTablesSql(this.fetchedSchema)
          ].join('\n\n')
        }
      );
    }
    this.#fullTextSearchIndexes = this.models
      .flatMap((m) =>
        m.indexes
          .filter((i) => i.isFullTextSearch)
          .map((index) => {
            const fti: FullTextSearchIndex = {
              indexedFields: index.columnNames,
              key: index.indexName,
              tableName: m.tableName
            };
            return fti;
          })
      )
      .reduce((acc, i) => {
        const copy = { ...acc };
        copy[i.key] = i;
        return copy;
      }, {} as { [key: string]: FullTextSearchIndex });
    await Promise.all(
      [this.#currentSchemaFile, ...this.#changeFiles].map((f) => {
        this.fs.saveFile(f.relativePath, f.contents);
      })
    );
  }

  get databaseName(): string {
    return this.fetchedSchema.databaseName;
  }

  get models(): Model[] {
    return this.#models;
  }

  get cast(): SchemaCastMap {
    return this.#cast;
  }
  get schemaHash(): string {
    return this.#schemaHash;
  }

  get currentSchemaFile(): GeneratedFile {
    return this.#currentSchemaFile
  }
  get changeFiles(): GeneratedFile[] {
    return this.#changeFiles
  }

  get fullTextSearchIndexes(): { [key: string]: FullTextSearchIndex } {
    return this.#fullTextSearchIndexes;
  }

  getCreateTablesSql(fetched: FetchedSchema): string {
    return fetched.tables.map((t) => t.createSql).join('\n\n');
  }

  getSchemaHash(sql: string): string {
    const hash = createHash('sha512');
    const data = hash.update(sql, 'utf-8');
    return data.digest('hex');
  }

  toJSON(): SchemaDefinition {
    return {
      databaseName: this.databaseName,
      friedaVersion: FRIEDA_VERSION,
      schemaHash: this.schemaHash,
      models: this.models,
      cast: this.cast
    };
  }
}
