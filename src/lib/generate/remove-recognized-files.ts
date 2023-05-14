import fs from 'fs-extra';
import { join } from 'node:path';
import { JAVASCRIPT_FILES, TYPESCRIPT_FILES } from './types.js';

/**
 * In the output directory, remove the files that we recognize as belonging to us
 */
export const removeRecognizedFiles = async (
  outputDirectory: string
): Promise<void> => {
  const promises = [...JAVASCRIPT_FILES, ...TYPESCRIPT_FILES].map((f) =>
    fs.remove(join(outputDirectory, f))
  );
  await Promise.all(promises);
};
