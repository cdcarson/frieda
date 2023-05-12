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
  const fieldWidth =
    Math.max(...model.fields.map((f) => f.fieldName.length), 'Field'.length) +
    4;
  const typeWidth =
    Math.max(
      ...model.fields.map((f) => f.javascriptType.length),
      'JS Type'.length
    ) + 4;
  const dbTypeWidth =
    Math.max(
      ...model.fields.map((f) => f.mysqlFullType.length),
      'Db Type'.length
    ) + 4;

  const fields = model.fields.flatMap((f) => {
    const spacesAfterName = ' '.repeat(fieldWidth - f.fieldName.length);
    const spacesAfterType = ' '.repeat(typeWidth - f.javascriptType.length);
    const spacesAfterDbType = ' '.repeat(dbTypeWidth - f.mysqlFullType.length);

    return `${fmtVarName(f.fieldName)}${spacesAfterName}${fmtVal(
      f.javascriptType
    )}${spacesAfterType}${colors.dim(f.mysqlFullType)}${spacesAfterDbType}${
      f.javascriptTypeComment
    }`;
  });

  log.header(`Model: ${model.modelName}`);
  log.message([
    `Model name: ${fmtVal(model.modelName)}`,
    `Table name: ${fmtVal(model.tableName)}`,
    '',
    `Field${' '.repeat(fieldWidth - 'Field'.length)}JS Type${' '.repeat(
      typeWidth - 'JS Type'.length
    )}Db Type${' '.repeat(dbTypeWidth - 'Db Type'.length)}Notes`,
    ...fields,
    '',
    ...model.createSql.split('\n').map((s) => fmtVal(s))
  ]);

  log.footer();
  const nextStep = await prompt<'field' | 'model' | 'exit'>({
    type: 'select',
    name: 'nextStep',
    message: 'Action',
    choices: [
      {
        title: `Show field in ${colors.bold(model.modelName)}`,
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
      const comment = getJavascriptTypeComment(schema, field);
      if (comment) {
        extra = colors.gray(` (${comment})`);
      }
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


const getJavascriptTypeComment = (
  schema: ExtendedSchema,
  field: ExtendedFieldDefinition
): string | null => {
  if ('bigint' === field.mysqlBaseType) {
    const { typeBigIntAsString } = schema.typeOptions;
    const str = `Option ${fmtVarName('typeBigIntAsString')} = ${fmtVal(
      JSON.stringify(typeBigIntAsString)
    )}.`;
    if (typeBigIntAsString) {
      if ('bigint' === field.castType) {
        return str + ` Using ${fmtVal('@bigint')} type annotation.`;
      } else {
        return str;
      }
    } else {
      return str;
    }
  }
  if (
    'tinyint' === field.mysqlBaseType &&
    'tinyint(1)' === field.mysqlFullType
  ) {
    const { typeTinyIntOneAsBoolean } = schema.typeOptions;
    return `Option ${fmtVarName('typeTinyIntOneAsBoolean')} = ${fmtVal(
      JSON.stringify(typeTinyIntOneAsBoolean)
    )}.`;
  }
  if ('json' === field.mysqlBaseType) {
    if (field.typeAnnotation) {
      return `Using imported type ${fmtVal(
        field.typeAnnotation.argument as string
      )} from ${fmtVal('@json')} type annotation.`;
    } else {
      return `No ${fmtVal('@json')} type annotation found.`;
    }
  }
  if (
    'enum' === field.mysqlBaseType &&
    field.isImportedType &&
    field.typeAnnotation &&
    field.typeAnnotation.argument
  ) {
    return `Using imported type ${fmtVal(
      field.typeAnnotation.argument as string
    )} from ${fmtVal('@enum')} type annotation.`;
  }
  if ('set' === field.mysqlBaseType && field.typeAnnotation) {
    if (field.typeAnnotation.argument) {
      return `Using imported type ${fmtVal(
        field.typeAnnotation.argument as string
      )} from ${fmtVal('@set')} type annotation.`;
    } else {
      return `Using ${fmtVal('@set')} type annotation.`;
    }
  }
  return null;
};
