import type { FsPaths } from '../types.js';
import { getFsPaths } from './get-fs-paths.js';
import prettier from 'prettier';
import { saveFile } from './save-file.js';
export const prettifyAndSaveFile = async (
  inputPath: string,
  contents: string,
  prettifyExtname?: string
): Promise<FsPaths> => {
  const paths = getFsPaths(inputPath);
  const pathForPretty = prettifyExtname
    ? `${paths.absolutePath}.${prettifyExtname.replace(/^\.+/, '')}`
    : paths.absolutePath;
  const config = await prettier.resolveConfig(pathForPretty);
  const prettified = prettier.format(contents, {
    ...config,
    filepath: pathForPretty
  });
  return await saveFile(inputPath, prettified);
};
