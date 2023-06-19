import type prettier from 'prettier'
export const ENV_DB_URL_KEYS = ['FRIEDA_DATABASE_URL', 'DATABASE_URL'] as const;
export const FRIEDA_RC_FILE_NAME = '.friedarc.json'
export const DEFAULT_JSON_FIELD_TYPE = 'unknown';
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

