import fsExtra from 'fs-extra';
import { resolve, extname, join, basename } from 'node:path';
import type {
  DebugSchema,
  FetchedSchema,
  ParsedSchema,
  ReadFileResult
} from './types.js';
import prettier from 'prettier';
import { DEFAULT_PRETTIER_OPTIONS } from './constants.js';
import { fmtPath } from './utils.js';
import { format as fmtSql } from 'sql-formatter'

export class FilesIO {
  static #inst: FilesIO;
  static init(cwd: string): void {
    if (!FilesIO.#inst) {
      FilesIO.#inst = new FilesIO(cwd);
    }
  }
  static get(): FilesIO {
    if (!FilesIO.#inst) {
      throw new Error('Files not instantiated');
    }
    return FilesIO.#inst;
  }

  #prettierOptions: prettier.Options | undefined;
  #outputDirectoryPath: string | undefined;

  set outputDirectoryPath(p: string) {
    this.#outputDirectoryPath = p;
  }

  get outputDirectoryPath(): string {
    if (!this.#outputDirectoryPath) {
      throw new Error('outputDirectoryPath not set');
    }
    return this.#outputDirectoryPath;
  }

  get schemaDefinitionPath(): string {
    return join(this.outputDirectoryPath, 'schema-definition.d.ts');
  }

  get generatedDirectoryPath(): string {
    return join(this.outputDirectoryPath, 'generated');
  }

  get generatedDatabaseFilePath(): string {
    return join(this.generatedDirectoryPath, 'database.js');
  }

  get generatedModelsFilePath(): string {
    return join(this.generatedDirectoryPath, 'models.d.ts');
  }

  get generatedApiDirectoryPath(): string {
    return join(this.generatedDirectoryPath, 'api');
  }

  get infoDirectoryPath(): string {
    return join(this.outputDirectoryPath, '.info');
  }
  get infoSchemaSqlPath(): string {
    return join(this.infoDirectoryPath, 'schema.sql');
  }
  get infoSchemaJSONPath(): string {
    return join(this.infoDirectoryPath, 'schema.json');
  }
  get infoHistoryDirectoryPath(): string {
    return join(this.infoDirectoryPath, 'history');
  }

  get gitIgnorePath(): string {
    return join(this.outputDirectoryPath, '.gitignore');
  }

  async write(relPath: string, contents: string): Promise<void> {
    await this.isValidFilePathOrThrow(relPath);

    let prettyContents = contents;
    if (['.json', '.js', '.ts'].includes(extname(relPath))) {
      if (!this.#prettierOptions) {
        this.#prettierOptions =
          (await prettier.resolveConfig(this.cwd)) || DEFAULT_PRETTIER_OPTIONS;
      }
      prettyContents = prettier.format(contents, {
        ...this.#prettierOptions,
        filepath: relPath
      });
    }

    const abs = this.abspath(relPath);
    await fsExtra.ensureFile(abs);
    await fsExtra.writeFile(abs, prettyContents);
  }

  async read(relPath: string): Promise<ReadFileResult> {
    const abs = this.abspath(relPath);
    const { exists } = await this.isValidFilePathOrThrow(relPath);
    if (!exists) {
      return {
        exists,
        contents: ''
      };
    }
    return {
      exists,
      contents: await fsExtra.readFile(abs, 'utf8')
    };
  }

  async writeOutput(
    schemaDefinitionDTsCode: string,
    databaseJsCode: string,
    modelsDTsCode: string,
    parsedSchema: ParsedSchema,
    fetchedSchema: FetchedSchema,
    createTables: string[]
  ) {
    const prevFiles = await this.savePreviousSchema();
    if (!this.#prettierOptions) {
      this.#prettierOptions =
        (await prettier.resolveConfig(this.cwd)) || DEFAULT_PRETTIER_OPTIONS;
    }
    const schemaJson: DebugSchema = {
      fetchedSchema: fetchedSchema,
      parsedSchema: parsedSchema
    };
    const sql = createTables
    .map(s => s.trim())
    .map(s => s.replace(/^CREATE.*VIEW/, 'CREATE VIEW'))
    .map(s => `${s};`).join('\n\n')
    await Promise.all([
      this.write(this.schemaDefinitionPath, schemaDefinitionDTsCode),
      this.write(this.generatedDatabaseFilePath, databaseJsCode),
      this.write(this.generatedModelsFilePath, modelsDTsCode),
      this.write(this.infoSchemaJSONPath, JSON.stringify(schemaJson)),
      this.write(this.infoSchemaSqlPath, fmtSql(sql))
    ]);
    await this.copyApiFiles();
    const gitIgnoreExists = await this.exists(this.gitIgnorePath);
    if (!gitIgnoreExists) {
      await this.write(this.gitIgnorePath, `# ignoring the .info directory is recommended\n.info\n`)
    }

    return prevFiles;
  }

  private constructor(public readonly cwd: string) {}

  private abspath(relPath: string): string {
    return resolve(this.cwd, relPath);
  }

  private async exists(relPath: string): Promise<boolean> {
    return await fsExtra.exists(this.abspath(relPath));
  }

  private async copy(fromRel: string, toRel: string) {
    await fsExtra.copy(this.abspath(fromRel), this.abspath(toRel));
  }

  private async isValidFilePathOrThrow(
    relPath: string
  ): Promise<{ exists: boolean }> {
    const exists = await this.exists(relPath);
    if (exists) {
      const stat = await fsExtra.stat(this.abspath(relPath));
      if (!stat.isFile()) {
        throw new Error(fmtPath(relPath) + ' is not a file.');
      }
    }
    return { exists };
  }

  private async savePreviousSchema(): Promise<string[]> {
    const schemaResult = await this.read(this.infoSchemaJSONPath);

    let slug = 'prev';
    if (schemaResult.exists) {
      try {
        const info: DebugSchema = JSON.parse(schemaResult.contents);
        if (info && info.fetchedSchema && info.fetchedSchema.fetched) {
          slug = new Date(info.fetchedSchema.fetched).toISOString();
        }
      } catch (error) {
        // ignore
      }
    }
    const copied: string[] = [];
    const dir = join(this.infoHistoryDirectoryPath, slug);
    for (const from of [
      this.infoSchemaJSONPath,
      this.infoSchemaSqlPath,
      this.schemaDefinitionPath
    ]) {
      const exists = await this.exists(from);
      if (exists) {
        const to = join(dir, basename(from));
        await this.copy(from, to);
        copied.push(to);
      }
    }
    return copied;
  }

  async copyApiFiles() {
    const absSourcePath = new URL(import.meta.url).pathname;
    const apiSourcePath = resolve(absSourcePath, '../../api');
    await fsExtra.emptyDir(this.generatedApiDirectoryPath);
    await fsExtra.copy(apiSourcePath, this.generatedApiDirectoryPath, {
      filter: (p) => !p.match('.test')
    });
  }
}
