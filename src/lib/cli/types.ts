import type { Connection } from '@planetscale/database';

export type FsPaths = {
  inputPath: string;
  cwd: string;
  absolutePath: string;
  relativePath: string;
  dirname: string;
  basename: string;
  extname: string;
  isUnderCwd: boolean;
};

export type FileResult = FsPaths & {
  exists: boolean;
  isFile: boolean;
  contents?: string;
};

export type DirectoryResult = FsPaths & {
  exists: boolean;
  isDirectory: boolean;
  isEmpty: boolean;
};

export type Options = {
  codeDirectory: string;
  schemaDirectory: string;
  outputJs: boolean;
  envFile: string;
  typeTinyIntOneAsBoolean: boolean;
  typeBigIntAsString: boolean;
  typeImports: string[];
};

export type OptionsWithConnection = Options & {
  connection: Connection;
};

export type CliArgs = Exclude<Options, 'typeImports'> & {
  help: boolean;
};

export type FetchTableNamesResult = {
  databaseName: string;
  tableNames: string[];
};

/**
 * A row from `SHOW INDEXES FROM FROM TableName`
 */
export type DatabaseShowIndexesRow = {
  Table: string;
  Non_unique: number;
  Key_name: string;
  Seq_in_index: number;
  Column_name: string | null;
  Collation: string | null;
  Cardinality: string;
  Sub_part: string | null;
  Packed: string | null;
  Null: string;
  Index_type: string;
  Comment: string;
  Index_comment: string;
  Visible: string;
  Expression: string | null;
};
/**
 * A row from `SHOW CREATE TABLE t`
 */
export type DatabaseShowCreateTableRow = {
  Table: string;
  'Create Table': string;
};




export type CliPositionalOption = {
  name: string;
  description: string;
};

export type CliOption = CliPositionalOption & {
  type: 'string' | 'boolean';
  alias?: string;
  isRcOption: boolean;
};

export type CliCommand = {
  name: string;
  usage: string;
  description: string;
  longDescription?: string;
  alias?: string;
  positionals?: CliPositionalOption[];
  options?: CliOption[];
};

export type DatabaseUrl = {
  databaseUrl: string;
  databaseUrlKey: string;
  envFile: string;
};
export type OptionSource = 'arg' | 'rc' | 'default' | 'prompt' | 'not set';
export type ResolvedOption<K extends keyof Options> = {
  source: OptionSource;
  value: Options[K];
};
export type ResolvedDirectoryOption<
  K extends keyof Pick<Options, 'codeDirectory' | 'schemaDirectory'>
> = ResolvedOption<K> & {
  directory: DirectoryResult;
};

export type ResolvedEnvFileOption = ResolvedOption<'envFile'> & {
  databaseUrl: DatabaseUrl;
};
