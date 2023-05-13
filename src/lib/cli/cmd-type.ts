import type {
  ExtendedFieldDefinition,
  ExtendedModelDefinition,
  ExtendedSchema
} from '$lib/parse/types.js';
import { getSchema } from './get-schema.js';
import { getOptions } from './options/get-options.js';
import type { CliArgs } from './types.js';
import { fmtVal, fmtVarName } from './ui/formatters.js';
import log from './ui/log.js';
import { promptModel } from './ui/prompt-model.js';
import colors from 'kleur';
import { prompt } from './ui/prompt.js';
import { promptField } from './ui/prompt-field.js';
import { onUserCancelled } from './ui/on-user-cancelled.js';
import { format } from 'prettier';

export const cmdType = async (
  cliArgs: Partial<CliArgs>,
  positionalArgs: string[]
) => {
  const { options, connection } = await getOptions(cliArgs);
  const schema = await getSchema(options, connection);
  const [modelName, fieldName] = positionalArgs;
  const modelSearch = modelName ? modelName.toLowerCase() : '';
  let model = schema.models.find(
    (m) =>
      m.modelName.toLowerCase() === modelSearch ||
      m.tableName.toLowerCase() === modelSearch
  );
  if (model) {
    const fieldSearch = fieldName ? fieldName.toLowerCase() : '';
    const field = model.fields.find(
      (f) =>
        f.fieldName.toLowerCase() === fieldSearch ||
        f.columnName.toLowerCase() === fieldSearch
    );
    if (field) {
      showField(schema, model, field);
    } else {
      showModel(schema, model);
    }
  } else {
    model = await promptModel(schema.models, modelSearch);
    showModel(schema, model);
  }
};

const showModel = async (
  schema: ExtendedSchema,
  model: ExtendedModelDefinition
): Promise<void> => {
  console.log();
  log.info(colors.dim(`Model: ${model.modelName}`));

  log.table([
    [fmtVarName('modelName'), fmtVal(model.modelName)],
    [fmtVarName('tableName'), fmtVal(model.tableName)]
  ]);
  console.log();

  log.info(colors.dim(`Fields (${model.fields.length})`));

  log.table(
    [
      ...model.fields.map((f) => [
        fmtVarName(f.fieldName),
        fmtVal(f.javascriptType),
        colors.dim(f.mysqlFullType)
      ])
    ],
    ['Field', 'Javascript Type', 'Column Type']
  );
  console.log();

  log.info([...model.createSql.split('\n').map((s) => colors.dim(s))]);

  // log.message([
  //   '',
  //   colors.dim('Model Types'),
  //   ...format(model.modelTypeDeclaration.trim(), {filepath: 'test.ts'}).split('\n').map(s => colors.gray(s)),
  //   ...model.fields.flatMap(f => f.otherTypeComments.map(s => fmtVarName(f.fieldName) + ` ${s}`)).map(s => ` - ${s}`)
  //   // ...format(model.primaryKeyTypeDeclaration.trim(), {filepath: 'test.ts'}).split('\n').map(s => colors.gray(s)),
  //   // ...format(model.createDataTypeDeclaration.trim(), {filepath: 'test.ts'}).split('\n').map(s => colors.gray(s)),
  //   // ...format(model.updateDataTypeDeclaration.trim(), {filepath: 'test.ts'}).split('\n').map(s => colors.gray(s)),

  // ])

  // log.footer();
  // const nextStep = await prompt<'field' | 'model' | 'exit'>({
  //   type: 'select',
  //   name: 'nextStep',
  //   message: 'Action',
  //   choices: [
  //     {
  //       title: `Show field in ${colors.bold(model.modelName)}`,
  //       value: 'field'
  //     },
  //     {
  //       title: `Show another model`,
  //       value: 'model'
  //     },
  //     {
  //       title: 'Exit',
  //       value: 'exit'
  //     }
  //   ]
  // });
  // if (nextStep === 'field') {
  //   const field = await promptField(model, '');
  //   return await showField(schema, model, field);
  // }
  // if (nextStep === 'model') {
  //   const otherModel = await promptModel(schema.models);
  //   return await showModel(schema, otherModel);
  // }
  // onUserCancelled();
};

const showField = async (
  schema: ExtendedSchema,
  model: ExtendedModelDefinition,
  field: ExtendedFieldDefinition
): Promise<void> => {
  const shownKeys: (keyof ExtendedFieldDefinition)[] = [
    'fieldName',
    'columnName',
    'javascriptType',
    'mysqlFullType',
    'castType',
    'primaryKey',
    'autoIncrement',
    'unique',
    'invisible',
    'hasDefault',
    'nullable',
    'generatedAlways'
  ];
  const maxKey = Math.max(...shownKeys.map((k) => k.length));
  const logs = shownKeys.map((k) => {
    const val: string =
      typeof field[k] === 'string'
        ? (field[k] as string)
        : JSON.stringify(field[k]) || 'null';
    let extra = '';
    if (k === 'hasDefault' && field.hasDefault) {
      extra = colors.gray(` (Default: ${field.Default})`);
    } else if (k === 'invisible' && field.invisible) {
      extra = colors.gray(` (Extra: ${field.Extra})`);
    } else if (k === 'generatedAlways' && field.generatedAlways) {
      extra = colors.gray(` (Extra: ${field.Extra})`);
    } else if (k === 'primaryKey' && field.primaryKey) {
      extra = colors.gray(` (Key: ${field.Key})`);
    } else if (k === 'unique' && field.unique) {
      extra = colors.gray(` (Key: ${field.Key})`);
    } else if (k === 'nullable') {
      extra = colors.gray(` (Null: ${field.Null})`);
    } else if (k === 'javascriptType') {
      extra = colors.gray(` (${field.javascriptTypeComment})`);
    }

    return `${fmtVarName(k)}:${' '.repeat(maxKey - k.length)} ${fmtVal(
      val
    )}${extra}`;
  });
  log.header(`Field: ${field.fieldName} | Model: ${model.modelName}`);
  const modelTypeComment = field.invisible
    ? colors.gray(' (INVISIBLE: undefined for SELECT *}')
    : '';
  const createTypeComment = field.generatedAlways
    ? colors.gray(' (generated)')
    : '';
  const updateTypeComment = field.generatedAlways
    ? colors.gray(' (generated)')
    : field.primaryKey
    ? colors.gray(' (primary key)')
    : '';
  log.message([
    ...logs,
    '',
    colors.dim('Model Type Definitions'),
    `base model type    ${fmtVal(
      field.modelTypeDeclaration
    )}${modelTypeComment}`,
    `create type        ${fmtVal(
      field.modelCreateDataTypeDeclaration || ''
    )}${createTypeComment}`,
    `update type        ${fmtVal(
      field.modelUpdateDataTypeDeclaration || ''
    )}${updateTypeComment}`
  ]);

  log.footer();
  const nextStep = await prompt<'field' | 'model' | 'exit'>({
    type: 'select',
    name: 'nextStep',
    message: 'Action',
    choices: [
      {
        title: `Show another field in ${colors.bold(model.modelName)}`,
        value: 'field'
      },
      {
        title: `Show another model`,
        value: 'model'
      },
      {
        title: 'Exit',
        value: 'exit'
      }
    ]
  });
  if (nextStep === 'field') {
    const field = await promptField(model, '');
    return await showField(schema, model, field);
  }
  if (nextStep === 'model') {
    const otherModel = await promptModel(schema.models);
    return await showModel(schema, otherModel);
  }
  onUserCancelled();
};
