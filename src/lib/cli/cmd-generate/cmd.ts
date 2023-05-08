import { fetch } from '../fetch/fetch.js';
import { getOptions } from '../options/get-options.js';
import type { CliArgs } from '../types.js';
// import { parseModelDefinition } from '../parse/parse-model-definition.js';
// import { getDatabaseTypescript } from '../generate/get-database-typescript.js';
// import { prettifyAndSaveFile } from '../fs/prettify-and-save-file.js';
// import { join } from 'node:path';
// import { getFsPaths } from '../fs/get-fs-paths.js';
// import { compileToJavascript } from '../generate/compile-to-javascript.js';
import { generate } from '../code/generate.js';
import { parseSchema } from '../parse/parse-schema.js';
export const cmd = async (cliArgs: Partial<CliArgs>) => {
  const options = await getOptions(cliArgs);
  const fetched = await fetch(options.connection);
  const schema = parseSchema(fetched, options)
  await generate(schema, options);
};
