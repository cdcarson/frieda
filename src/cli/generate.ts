import { spinner, log } from '@clack/prompts';
import { join } from 'path';
import type { Model, ModelSchema } from '../api/shared.server.js';
import { generateCode } from './shared/generate-code.js';
import type {
  GeneratedCode,
  RawSchema,
  ResolvedFriedaVars
} from './shared/types.js';
import fs from 'fs-extra';
import { formatFilePath, prettify } from './shared/utils.js';
import { writeCurrentSchema } from './shared/write-schema.js';
import colors from 'picocolors';
export const generate = async (
  schema: RawSchema,
  modelSchemas: ModelSchema<Model>[],
  vars: ResolvedFriedaVars
) => {
  await writeCurrentSchema(schema, vars);
  const writeSpinner = spinner();
  writeSpinner.start(`Generating code...`);
  const code: GeneratedCode = generateCode(modelSchemas, vars);
  await fs.ensureDir(vars.generatedModelsDirectoryFullPath);
  const filePaths = await Promise.all(
    Object.keys(code).map((key) =>
      writeFile(key, code[key as keyof GeneratedCode], vars)
    )
  );

  writeSpinner.stop(`Code generated.`);
  
  log.info([
    colors.dim('Generated files:'),
    ...filePaths.map((p) => formatFilePath(p)),
    '',
    colors.dim('Usage:'),
    `import `
  ].join('\n'));
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

