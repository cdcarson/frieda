import type { TypeOptions } from '$lib/index.js';

export type ResolvedCliOptions = TypeOptions & {
  envFile: string;
  outputDirectory: string;
  compileJs: boolean;
};

export type CliArgs = Exclude<ResolvedCliOptions, 'typeImports'> & {
  positionalArgs: string[];
  help: boolean;
};

export type DatabaseUrlResult = {
  databaseUrl: string;
  databaseUrlKey: string;
  envFile: string;
};

export type CliOption = {
  name: string;
  type: 'boolean' | 'string';
  alias?: string;
  description: string;
  isRc: boolean;
};

export type CliCommand = {
  name: string;
  alias: string;
  usage: string;
  description: string;
  positionalOptions?: CliOption[];
};
