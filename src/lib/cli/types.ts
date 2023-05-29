import type { Connection } from '@planetscale/database';

export type Options = {
  envFile: string;
  outputDirectory: string;
  schemaDirectory: string;
  compileJs: boolean;
};

export type GetOptionsResult = {
  options: Options;
  connection: Connection;
  databaseDetails: DatabaseDetails;
};

export type DatabaseDetails = {
  databaseUrl: string;
  databaseUrlKey: string;
  envFile: string;
};
