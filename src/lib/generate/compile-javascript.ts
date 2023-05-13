import type { ResolvedCliOptions } from '../cli/types.js';
import type { FsPaths } from '../fs/types.js';
import ts from 'typescript';
import { TS_COMPILER_OPTIONS, GENERATED_FILE_EXTNAMES } from './constants.js';
import { join } from 'node:path';
import fs from 'fs-extra';
import { getFile } from '../fs/get-file.js';
import { prettifyAndSaveFile } from '../fs/prettify-and-save-file.js';
import { GENERATED_FILE_BASENAMES } from './types.js';
import { getFsPaths } from '$lib/fs/get-fs-paths.js';
export const compileJavascript = async (
  options: ResolvedCliOptions,
  typescript: FsPaths[]
): Promise<FsPaths[]> => {
  const program = ts.createProgram(
    typescript.map((p) => p.relativePath),
    { ...TS_COMPILER_OPTIONS }
  );

  program.emit();

  // const results = await Promise.all(
  //   Object.values(GENERATED_FILE_BASENAMES).flatMap((basename) => {
  //     return [
  //       readAndPrettifyFile(
  //         join(options.outputDirectory, basename + GENERATED_FILE_EXTNAMES.js)
  //       ),
  //       readAndPrettifyFile(
  //         join(options.outputDirectory, basename + GENERATED_FILE_EXTNAMES.dTs)
  //       )
  //     ];
  //   })
  // );

  // for (const p of typescript) {
  //   await fs.rm(p.absolutePath);
  // }
  return [];
};

const readAndPrettifyFile = async (relPath: string): Promise<FsPaths> => {
  const file = await getFile(relPath);
  if (file.contents) {
    await prettifyAndSaveFile(file.relativePath, file.contents);
  }
  return file;
};
