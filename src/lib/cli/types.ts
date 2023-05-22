import type { Connection } from "@planetscale/database";

export type Options = {
  envFile: string;
  outputDirectory: string;
  schemaDirectory: string;
  compileJs: boolean;
};

export type GetOptionsResult = {
  options: Options,
  connection: Connection;
  databaseDetails: DatabaseDetails;
}



export type DatabaseDetails = {
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
