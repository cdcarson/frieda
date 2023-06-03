import kleur from 'kleur';
import type prettier from 'prettier';
import { fmtPath, fmtVarName } from './utils.js';
export const FRIEDA_RC_FILE_NAME = '.friedarc.json';

export const CURRENT_SCHEMA_SQL_FILE_NAME = 'current-schema.sql'
export const CURRENT_SCHEMA_JSON_FILE_NAME = 'current-schema.json'
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;
export const DEFAULT_JSON_FIELD_TYPE = 'unknown';
export const BUILD_OPTION_DESCRIPTIONS = {
  envFile: `The path to an environment variables file containing either ${ENV_DB_URL_KEYS.map(s => fmtVarName(s)).join(
    ' or '
  )}. Valid URL format: ${kleur.cyan('mysql://<user>:<password>@<host>')}.`,
  outputDirectory: `The relative path to a directory where generated code will be placed. This should be a dedicated directory, convenient to but separate from your own code. For example: ${fmtPath('src/db/_generated')}.`,
  schemaDirectory: `The relative path to a directory where schema information will be saved. This should be a dedicated directory. Example: ${fmtPath('schema')}`,
  compileJs: `Whether to generate javascript code rather than typescript.`
};

export const DEFAULT_PRETTIER_OPTIONS: prettier.Options = {
  useTabs: false,
  singleQuote: true,
  trailingComma: 'none',
  semi: true
};

export const TS_COMPILER_OPTIONS = {
  declaration: true
  // isolatedModules: true,
  // preserveValueImports: true,
  // // lib: ['esnext'], // prevents the database.d.ts from being generated
  // moduleResolution: ts.ModuleResolutionKind.NodeNext,
  // module: ts.ModuleKind.CommonJS,
  // target: ts.ScriptTarget.ES5,
  // allowJs: true,
  // checkJs: true,
  // esModuleInterop: true,
  // forceConsistentCasingInFileNames: true,
  // resolveJsonModule: true,
  // skipLibCheck: true,
  // sourceMap: true,
  // strict: true
};
