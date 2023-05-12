import type { ExtendedSchema } from '../parse/types.js';
import { generateTypescript } from './generate-typescript.js';
import type { ResolvedCliOptions } from '../cli/types.js';
import { compileJavascript } from './compile-javascript.js';
import { removeRecognizedFiles } from './remove-recognized-files.js';
import type { FsPaths } from '$lib/fs/types.js';
export const generate = async (
  options: ResolvedCliOptions,
  schema: ExtendedSchema
): Promise<FsPaths[]> => {
  await removeRecognizedFiles(options.outputDirectory)
  const typescript = await generateTypescript(options, schema);
  if (! options.compileJs) {
    return typescript;
  }
  return await compileJavascript(options, typescript)

};
