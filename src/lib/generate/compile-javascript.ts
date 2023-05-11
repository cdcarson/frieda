import type { ResolvedCliOptions } from '../cli/types.js';
import type { FsPaths } from '../fs/types.js';
import ts from 'typescript';
import { TS_COMPILER_OPTIONS, GENERATED_FILE_EXTNAMES } from './constants.js';
import { join } from 'node:path';
import fs from 'fs-extra';
import { getFile } from '../fs/get-file.js';
import { prettifyAndSaveFile } from '../fs/prettify-and-save-file.js';
import type { GENERATED_FILE_BASENAMES, GenerateResult } from './types.js';
export const compileJavascript = async (
  options: ResolvedCliOptions,
  typescript: GenerateResult
): Promise<GenerateResult> => {
  const program = ts.createProgram(
    Object.values(typescript).map((p) => p.relativePath),
    { ...TS_COMPILER_OPTIONS }
  );

  program.emit();
  const result: GenerateResult = {
    database: await prettifyJs(options.outputDirectory, 'database'),
    schema: await prettifyJs(options.outputDirectory, 'schema'),
    types: await prettifyJs(options.outputDirectory, 'types')
  };

  for (const p of Object.values(typescript)) {
    await fs.rm(p.absolutePath);
  }
  return result;
};

const prettifyJs = async (
  outputPath: string,
  key: keyof typeof GENERATED_FILE_BASENAMES
): Promise<FsPaths> => {
  const jsFile = await getFile(
    join(outputPath, key + GENERATED_FILE_EXTNAMES.js)
  );
  const dTsFile = await getFile(
    join(outputPath, key + GENERATED_FILE_EXTNAMES.dTs)
  );
  if (jsFile.isFile && jsFile.contents) {
    await prettifyAndSaveFile(jsFile.relativePath, jsFile.contents);
  }
  if (dTsFile.isFile && dTsFile.contents) {
    await prettifyAndSaveFile(dTsFile.relativePath, dTsFile.contents);
  }
  return jsFile;
};
