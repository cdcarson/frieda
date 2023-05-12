import type { ExtendedSchema } from '$lib/parse/types.js';
import { generateCode } from './generate-code.js';
import { getSchema } from './get-schema.js';
import { getOptions } from './options/get-options.js';
import type { CliArgs, ResolvedCliOptions } from './types.js';
import { fmtVal, fmtVarName } from './ui/formatters.js';
import log from './ui/log.js';
import colors from 'kleur';
export const cmdGenerate = async (cliArgs: Partial<CliArgs>) => {
  const { options, connection } = await getOptions(cliArgs);
  const schema = await getSchema(options, connection);
  await generateCode(options, schema);
  logTypeOptions(options);
  logModels(schema)
};

const logTypeOptions = (options: ResolvedCliOptions) => {
  const shownKeys: (keyof ResolvedCliOptions)[] = [
    'typeBigIntAsString',
    'typeTinyIntOneAsBoolean',
    'typeImports'
  ];
  const firstColWidth = Math.max(...shownKeys.map((k) => k.length)) + 4;
  log.info([
    colors.dim('Type options'),
    ...shownKeys.flatMap((k) => {
      const key = fmtVarName(k) + ' '.repeat(firstColWidth - k.length);
      if ('typeImports' === k) {
        const lines = JSON.stringify(options.typeImports, null, 1)
          .split('\n')
          .map((s, i) =>
            i === 0 ? fmtVal(s) : ' '.repeat(firstColWidth) + fmtVal(s)
          );

        return [key + lines.shift(), ...lines];
      }
      return key + fmtVal(JSON.stringify(options[k]));
    })
  ]);
};

const logModels = (schema: ExtendedSchema) => {
  const firstColWidth =
    Math.max(...schema.models.map((m) => m.modelName.length)) + 4;
  log.info([colors.dim('Models')]);
  log.info([
    `Model${' '.repeat(firstColWidth - 5)}Table`,
    ...schema.models.map((m) => {
      return fmtVal(m.modelName) + ' '.repeat(firstColWidth - m.modelName.length) + colors.dim(m.tableName);
    })
  ]);
};
