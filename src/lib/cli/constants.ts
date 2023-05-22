
export const FRIEDA_RC_FILE_NAME = '.friedarc.json';
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;

export const OPTION_DESCRIPTIONS = {
  envFile: `The path to an environment variables file containing either ${ENV_DB_URL_KEYS.join(' or ')}. Valid URL format: ${
    'mysql://<user>:<password>@<host>'
  }.`,
  outputDirectory: `The relative path to a directory where generated code will be placed. This should be a dedicated directory, convenient to but separate from your own code.`,
  schemaDirectory: `The relative path to a directory where schema information will be saved. This should be a dedicated directory.`,
  compileJs: `Whether to compile and output javascript code rather than typescript files.`,

  
};

