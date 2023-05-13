import ora from 'ora';
import type {
  ExtendedModelDefinition,
  ExtendedSchema
} from '../parse/types.js';
import type { ResolvedCliOptions } from './types.js';
import { generate } from '../generate/generate.js';
import log from './ui/log.js';
import colors from 'kleur';
import {
  fmtPath,
  fmtVal,
  fmtVarName,
  spaces,
  squishWords
} from './ui/formatters.js';
import { prompt } from './ui/prompt.js';
import { OPTION_DESCRIPTIONS } from './constants.js';
import { promptModel } from './ui/prompt-model.js';
export const generateCode = async (
  options: ResolvedCliOptions,
  schema: ExtendedSchema
): Promise<void> => {
  const spinner = ora('Generating code').start();
  const files = await generate(options, schema);
  spinner.succeed('Code generated.');
  log.info([
    colors.dim('Generated files'),
    ...files.map((f) => ` - ${fmtPath(f.relativePath)}`)
  ]);
  // await nextStep(schema, options);
};

const nextStep = async (
  schema: ExtendedSchema,
  options: ResolvedCliOptions
): Promise<void> => {
  type Opt = 'done' | 'explore' | 'options';
  const next = await prompt<Opt>({
    type: 'select',
    name: 'next',
    message: 'Next step',
    choices: [
      { title: 'Done', value: 'done' },
      { title: 'Explore models', value: 'explore' },
      { title: 'Show type options', value: 'options' }
    ]
  });
  if (next === 'done') {
    return;
  }
  if (next === 'explore') {
    return await exploreModels(schema, options);
  }
  if (next === 'options') {
    return await logTypeOptions(schema, options);
  }
};

const logTypeOptions = async (
  schema: ExtendedSchema,
  options: ResolvedCliOptions
) => {
  const shownKeys: (keyof ResolvedCliOptions)[] = [
    'typeBigIntAsString',
    'typeTinyIntOneAsBoolean',
    'typeImports'
  ];
  log.header('Type Options');
  log.table(
    [
      ['Option', 'Current Value'],
      ...shownKeys.map((k) => [k, JSON.stringify(options[k])])
    ],
    [fmtVarName, fmtVal]
  );

  console.log();
  shownKeys.forEach((k) => {
    log.info([
      ...squishWords(
        colors.dim(`${fmtVarName(k)}: ${OPTION_DESCRIPTIONS[k]}`)
      ).split('\n')
    ]);
  });

  log.footer();
  return await nextStep(schema, options);
};

const exploreModels = async (
  schema: ExtendedSchema,
  options: ResolvedCliOptions
): Promise<void> => {
  logModels(schema);
  const model = await promptModel(schema.models);
  return await exploreModel(schema, options, model);
};

const logModels = (schema: ExtendedSchema) => {
  log.table(
    [
      ['Model', 'Table'],
      ...schema.models.map((m) => [m.modelName, m.tableName])
    ],
    [fmtVarName, colors.dim]
  );
};

const exploreModel = async (
  schema: ExtendedSchema,
  options: ResolvedCliOptions,
  model: ExtendedModelDefinition
) => {
  log.header(`Model: ${model.modelName}`);
  log.table([
    ['Model Name', 'Table Name'],
    [model.modelName, model.tableName]
  ]);
  console.log();
  log.message([...model.createSql.split('\n').map((s) => colors.dim(s))]);
  console.log();

  log.table(
    [
      ['Field', 'Javascript Type', 'Column Type'],
      ...model.fields.map((f) => [
        f.fieldName,
        f.javascriptType,
        f.mysqlFullType
      ])
    ],
    [fmtVarName, fmtVal, colors.dim]
  );

  log.footer();
  await prompt({
    name: 'next',
    message: 'Next',
    type: 'select',
    choices: [{ title: 'Done', value: 'done' }]
  });
};
