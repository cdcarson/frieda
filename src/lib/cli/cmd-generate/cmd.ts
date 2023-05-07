import { connect } from '@planetscale/database';
import { fetchSchema } from '../fetch-schema/fetch-schema.js';
import { getOptions } from '../options/get-options.js';
import type { CliArgs } from '../types.js';
import { parseModelDefinition } from '../parse/parse-model-definition.js';
import { getDatabaseTypescript } from '../generate/get-database-typescript.js';
import { prettifyAndSaveFile } from '../fs/prettify-and-save-file.js';
import {join} from 'node:path'
import { getFsPaths } from '../fs/get-fs-paths.js';
import { compileToJavascript } from '../generate/compile-to-javascript.js';
export const cmd = async (cliArgs: Partial<CliArgs>) => {
  console.log('generate');
  const options = await getOptions(cliArgs);
  const schema = await fetchSchema(options.connection);
  const models = schema.tables.map((t) => parseModelDefinition(t, options));
  const code = getDatabaseTypescript(models, options, '');
  const paths = getFsPaths(join(options.codeDirectory, 'database.ts'));
  
  await prettifyAndSaveFile(paths.relativePath, code, 'ts');
  compileToJavascript(paths.relativePath)
};
