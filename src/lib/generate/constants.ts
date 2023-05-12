import ts from 'typescript';

export const GENERATED_FILE_EXTNAMES = {
  ts: '.ts',
  dTs: '.d.ts',
  js: '.js',
  jsMap: '.js.map'
} as const;

export const OTHER_ALLOWED_FILENAMES = {
  friedaDebug: 'frieda-debug.json'
};

export const TS_COMPILER_OPTIONS = {
  declaration: true,
  isolatedModules: true,
  preserveValueImports: true,
  lib: ['esnext'],
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ESNext,
  allowJs: true,
  checkJs: true,
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  resolveJsonModule: true,
  skipLibCheck: true,
  sourceMap: false,
  strict: true
};
