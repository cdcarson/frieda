import { spinner, log } from '@clack/prompts';
import { join } from 'path';
import type { Model, ModelSchema } from '../api/shared.server.js';
import { generateCode } from './shared/generate-code.js';
import type { GeneratedCode, ResolvedFriedaVars } from './shared/types.js';
import fs from 'fs-extra';
import { formatFilePath, prettify } from './shared/utils.js';

export const migrate = async (
  modelSchemas: ModelSchema<Model>[],
  vars: ResolvedFriedaVars
) => {
  const writeSpinner = spinner();
  writeSpinner.start(`hjk code...`);
  const code: GeneratedCode = generateCode(modelSchemas, vars);
  const filePaths = await Promise.all(
    Object.keys(code).map((key) =>
      writeFile(key, code[key as keyof GeneratedCode], vars)
    )
  );
  const formatted = filePaths.map(p => formatFilePath(p));
  writeSpinner.stop(`Code generated.`);
  log.info(formatted.join('\n'));
};

const writeFile = async (
  key: string,
  code: string,
  vars: ResolvedFriedaVars
): Promise<string> => {
  const fullPath = join(vars.generatedModelsDirectoryFullPath, `${key}.ts`);
  const prettified = await prettify(code, fullPath);
  await fs.writeFile(fullPath, prettified);
  return fullPath;
};