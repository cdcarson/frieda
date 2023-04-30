import type { FsPaths } from "../types";
import { getPaths } from "./get-paths";
import prettier from 'prettier'
import { saveFile } from "./save-file";
export const prettifyAndSaveFile = async (
  inputPath: string,
  contents: string,
  prettifyExtname?: string
): Promise<FsPaths> => {
  const paths = getPaths(inputPath);
  const pathForPretty = prettifyExtname
    ? `${paths.absolutePath}.${prettifyExtname.replace(/^\.+/, '')}`
    : paths.absolutePath;
  const config = await prettier.resolveConfig(pathForPretty);
  const prettified = prettier.format(contents, {
    ...config,
    filepath: pathForPretty
  });
  return await saveFile(inputPath, prettified);
}