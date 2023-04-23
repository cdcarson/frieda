export type RcSettings = {
  /**
   * The path to the directory where we keep
   * the current schema, the current migration,
   * and migration history.
   */
  schemaDirectory: string;

  /**
   * The path to where we place generated code.
   */
  generatedCodeDirectory: string;

  /**
   * An array of userland import statements
   * providing types relied upon by the models.
   *
   * Default: []
   */
  jsonTypeImports: string[];

  /**
   * The path to the environment variables
   * file where we can find the database URL.
   *
   * Default: .env
   */
  envFilePath: string;

  /**
   * Whether to automatically cast `tinyint(1)` columns to boolean.
   *
   * Default: true
   */
  typeTinyIntOneAsBoolean: boolean;

  /**
   * Whether to automatically cast `bigint` columns to string.
   *
   * Default: true
   */
  typeBigIntAsString: boolean;
};

export type FullSettings = Omit<Required<RcSettings>, 'envFilePath'> & {
  databaseUrl: string;
  databaseUrlKey: string;
  envFilePath: string;
};
export type ValidateEnvFilePathResult = Pick<
  FullSettings,
  'databaseUrl' | 'databaseUrlKey' | 'envFilePath'
>;
