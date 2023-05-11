import type { DirectoryResult } from '$lib/fs/types.js';
import { getDirectory } from '../../fs/get-directory.js';

/**
 * Validate  a directory that we will write to. It must either not exist
 * or be a directory under the current working directory.
 * Non-emptiness is checked elsewhere.
 */
export const validateDirectory = async (
  relativePath: string,
  key: string
): Promise<DirectoryResult> => {
  const dir = await getDirectory(relativePath);
  if (!dir.isDirectory && dir.exists) {
    throw new Error(`${key}: ${dir.relativePath} is a file.`);
  }
  if (!dir.isUnderCwd) {
    throw new Error(
      `${key}: ${dir.relativePath} is not a subdirectory of the current working directory.`
    );
  }
  return dir;
};
