import ts from 'typescript';
import { TS_COMPILER_OPTIONS } from './constants.js';
import { basename } from 'node:path';
import {
  JAVASCRIPT_FILES,
  TYPESCRIPT_FILES,
  type JavascriptCode,
  type JavascriptFileName,
  type TypescriptCode,
  type TypescriptFileName
} from './types.js';
import type { FsPaths } from '$lib/fs/types.js';

export const compileJavascript = (
  typescriptFiles: FsPaths[]
): Partial<JavascriptCode> => {
  const code: Partial<JavascriptCode> = {};

  const host = ts.createCompilerHost(TS_COMPILER_OPTIONS);
  host.writeFile = (fileName: string, text: string) => {
    if (JAVASCRIPT_FILES.includes(basename(fileName) as JavascriptFileName)) {
      console.log(basename(fileName), text.length);
      code[basename(fileName) as JavascriptFileName] = text;
    }
  };

  const program = ts.createProgram(
    typescriptFiles.map((f) => f.relativePath),
    { ...TS_COMPILER_OPTIONS },
    host
  );
  program.emit();
  return code;
};
