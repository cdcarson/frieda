import { getFsPaths } from '../fs/get-fs-paths.js';
import fs from 'fs-extra';
import { join } from 'node:path';
import {
  GENERATED_FILE_EXTNAMES,
  OTHER_ALLOWED_FILENAMES
} from './constants.js';
import { GENERATED_FILE_BASENAMES } from './types.js';

/**
 * In the output directory, remove the files that we recognize as belonging to us
 */
export const removeRecognizedFiles = async (
  outputDirectory: string
): Promise<void> => {
  const outPath = getFsPaths(outputDirectory);
  await fs.ensureDir(outPath.absolutePath);
  const paths = await fs.readdir(outPath.absolutePath);
  const recognized: string[] = [
    ...Object.values(OTHER_ALLOWED_FILENAMES),
    ...Object.values(GENERATED_FILE_BASENAMES).flatMap((name) => {
      return Object.values(GENERATED_FILE_EXTNAMES).map(
        (ext) => `${name}${ext}`
      );
    })
  ];
  const exists = recognized.filter((p) => paths.includes(p));
  for (const p of exists) {
    await fs.remove(join(outputDirectory, p));
  }
};
