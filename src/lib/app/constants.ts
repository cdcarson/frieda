import type prettier from 'prettier';
import ts from 'typescript';
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;
export const FRIEDA_RC_FILE_NAME = '.friedarc.json';
export const DEFAULT_JSON_FIELD_TYPE = 'unknown';
export const DEFAULT_PRETTIER_OPTIONS: prettier.Options = {
  useTabs: false,
  singleQuote: true,
  trailingComma: 'none',
  semi: true
};

export const TS_COMPILER_OPTIONS = {
  declaration: true,
  // importsNotUsedAsValues: 'error',
  isolatedModules: true,
  preserveValueImports: true,
  lib: ['esnext', 'DOM', 'DOM.Iterable'],
  module: ts.ModuleKind.NodeNext,
  target: ts.ScriptTarget.ESNext,
  ignoreDeprecations: '5.0',
  allowJs: true,
  checkJs: true,
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  resolveJsonModule: true,
  skipLibCheck: true,
  sourceMap: true,
  strict: true,
  moduleResolution: ts.ModuleResolutionKind.NodeNext
  // isolatedModules: true,
  // preserveValueImports: true,
  // lib: ['esnext'], // prevents the database.d.ts from being generated
  // moduleResolution: ts.ModuleResolutionKind.Node16,
  // module: ts.ModuleKind.CommonJS,
  // target: ts.ScriptTarget.ES2022,
  // allowJs: true,
  // checkJs: true,
  // esModuleInterop: true,
  // forceConsistentCasingInFileNames: true,
  // resolveJsonModule: true,
  // skipLibCheck: true,
  // sourceMap: false,
  // strict: true
};
