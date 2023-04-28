import {
  cancel,
  isCancel,
  log,
  confirm,
  text
} from '@clack/prompts';
import { getSettings, settingsDescriptions } from './settings.js';
import { fmtPath, fmtVarName, squishWords, wait } from './utils.js';
import colors from 'picocolors';
import type {
  FileSystemPaths,
  FullSettings,
  MigrationProcess
} from './types.js';
import type {
  DatabaseSchema,
  FieldDefinition,
  ModelDefinition
} from '$lib/api/types.js';
import { fetchSchemaFromDatabase } from './schema.js';
import {
  CURRENT_MIGRATION_SQL_FILE_NAME,
  FRIEDA_RC_FILE_NAME
} from './constants.js';
import { select } from '@clack/prompts';
import { getCode } from './get-code.js';
import {
  clearCurrentMigrationSql,
  deleteWorkingMigrationsFile,
  getMigrationFilePath,
  readCurrentMigrationSql,
  readCurrentSchemaJson,
  writeCurrentMigrationSql,
  writeCurrentSchemaFiles,
  writeGeneratedCode,
  writeMigrationFiles,
  writeWorkingMigrationsFile
} from './file-system.js';
import {
  Mysql2QueryError,
  RcNotFoundError,
  RcSettingsError
} from './errors.js';
import { parseModelDefinition } from './parse.js';
import { runMigration } from './migrate.js';
import { edit } from 'external-editor';
import _ from 'lodash';

export const cancelAndExit = () => {
  cancel('Operation cancelled.');
  process.exit(0);
};

export const cliGetSettings = async (
  waitMessage?: string
): Promise<FullSettings> => {
  waitMessage = waitMessage || `Getting settings`;
  const s = wait(waitMessage);
  try {
    const settings = await getSettings();
    s.done();
    return settings;
  } catch (error) {
    s.error();
    if (error instanceof RcSettingsError) {
      const desc = settingsDescriptions[error.key];
      log.error(
        [
          `${colors.red('Invaild setting:')} ${desc.header} (${fmtVarName(
            error.key
          )})`,
          error.message,
          '',
          `Fix: ${colors.inverse(' frieda init ')}`,
          '',
          `Docs: ${fmtPath(`https://github.com/nowzoo/frieda#${error.key}`)}`,
          ''
        ].join('\n')
      );
      return cancelAndExit();
    }
    if (error instanceof RcNotFoundError) {
      log.error(
        [
          colors.red('Settings file not found.'),
          `The file ${fmtPath(FRIEDA_RC_FILE_NAME)} does not exist.`,
          '',
          `Fix: ${colors.inverse(' frieda init ')}`,
          '',
          `Docs: ${fmtPath(`https://github.com/nowzoo/frieda`)}`,
          ''
        ].join('\n')
      );
    }
    throw error;
  }
};
export const cliGenerateCode = async (
  models: ModelDefinition[],
  settings: FullSettings
) => {
  const s = wait('Generating code');
  const code = getCode(models, settings);
  const results = await writeGeneratedCode(settings, code);
  s.done();
  log.success(
    [
      'Generated code:',
      ...results.map((f) => ` - ${fmtPath(f.relativePath)}`)
    ].join('\n')
  );
};
export const cliFetchSchema = async (
  settings: FullSettings,
  waitMessage?: string
): Promise<{ schema: DatabaseSchema; models: ModelDefinition[] }> => {
  waitMessage = waitMessage || `Fetching schema from database`;
  const s = wait(waitMessage);
  try {
    const schema = await fetchSchemaFromDatabase(settings);
    const results = await writeCurrentSchemaFiles(settings, schema);
    s.done();
    log.success(
      ['Files:', ...results.map((f) => ` - ${fmtPath(f.relativePath)}`)].join(
        '\n'
      )
    );
    return {
      schema,
      models: schema.tables.map((t) => parseModelDefinition(t, settings))
    };
  } catch (error) {
    s.error();
    if (error instanceof Error) {
      log.error(
        [
          colors.red('Database error'),
          `The server said: ${error.message}`,
          ''
        ].join('\n')
      );
      return cancelAndExit();
    }
    throw error;
  }
};

export const cliReadSchema = async (
  settings: FullSettings
): Promise<{ schema: DatabaseSchema; models: ModelDefinition[] }> => {
  const s = wait(`Reading schema from file`);
  const fileResult = await readCurrentSchemaJson(settings);
  s.done();
  let schema: DatabaseSchema;
  if (fileResult.contents) {
    try {
      schema = JSON.parse(fileResult.contents);
      const models = schema.tables.map((t) =>
        parseModelDefinition(t, settings)
      );
      return { schema, models };
    } catch (error) {}
  }
  log.warn(
    `${fmtPath(
      fileResult.relativePath
    )} was not found or contained invalid json.`
  );
  const readFromDb = await confirm({
    message: 'Read the schema from the database instead?'
  });
  if (isCancel(readFromDb) || !readFromDb) {
    return cancelAndExit();
  }
  return cliFetchSchema(settings);
};

export const promptModel = async (
  models: ModelDefinition[],
  search?: string
): Promise<ModelDefinition> => {
  const prompt = async (
    matchedModels: ModelDefinition[],
    filterStr: string
  ): Promise<ModelDefinition> => {
    const opts: {
      value: string;
      label: string;
      hint?: string;
    }[] = [
      ...matchedModels.map((m) => {
        return {
          label: m.modelName,
          value: m.modelName,
          hint: `table: ${m.tableName}`
        };
      })
    ];
    if (matchedModels.length < models.length) {
      opts.unshift({
        label: `Show all models`,
        value: '',
        hint: `(currently showing only models matching ${filterStr})`
      });
    }
    const modelName = await select({
      message: `Select model:`,
      options: opts,
      initialValue: ''
    });
    if (isCancel(modelName)) {
      return cancelAndExit();
    }
    const selected = models.find((m) => m.modelName === modelName);
    if (!selected) {
      return prompt([...models], '');
    }
    return selected;
  };
  const filterStr = search || '';
  const matched =
    filterStr.length > 0
      ? models.filter(
          (m) =>
            m.modelName.toLowerCase().startsWith(filterStr) ||
            m.tableName.toLowerCase().startsWith(filterStr)
        )
      : [];
  const selectedModel =
    matched.length === 1
      ? matched[0]
      : models.length === 1
      ? models[0]
      : await prompt(matched.length > 0 ? matched : models, filterStr);
  return selectedModel;
};

export const promptField = async (
  model: ModelDefinition,
  search?: string
): Promise<FieldDefinition> => {
  const prompt = async (
    matchedFields: FieldDefinition[],
    filterStr: string
  ): Promise<FieldDefinition> => {
    const opts: {
      value: string;
      label: string;
      hint?: string;
    }[] = [
      ...matchedFields.map((f) => {
        return {
          label: f.fieldName,
          value: f.fieldName,
          hint: `column: ${f.columnName}`
        };
      })
    ];
    if (matchedFields.length < model.fields.length) {
      opts.unshift({
        label: `Show all fields in ${model.modelName}`,
        value: '',
        hint: `(currently showing only fields matching ${filterStr})`
      });
    }
    const fieldName = await select({
      message: `Select field in ${model.modelName}:`,
      options: opts,
      initialValue: ''
    });
    if (isCancel(fieldName)) {
      return cancelAndExit();
    }
    const selected = model.fields.find((f) => f.fieldName === fieldName);
    if (!selected) {
      return prompt([...model.fields], '');
    }
    return selected;
  };
  const filterStr = search || '';
  const matched =
    filterStr.length > 0
      ? model.fields.filter(
          (m) =>
            m.fieldName.toLowerCase().startsWith(filterStr) ||
            m.columnName.toLowerCase().startsWith(filterStr)
        )
      : [];
  const selectedField =
    matched.length === 1
      ? matched[0]
      : model.fields.length === 1
      ? model.fields[0]
      : await prompt(matched.length > 0 ? matched : model.fields, filterStr);
  return selectedField;
};

export const cliPromptRunMigration = async (
  settings: FullSettings,
  migration: MigrationProcess
) => {
  cliLogSql(migration.sql);
  const action = await select({
    message: 'Run migration?',
    options: [{ label: 'Yes', value: 'run' }, ...editOrSaveOptions]
  });
  if (isCancel(action) || action === 'cancel') {
    return cancelAndExit();
  }
  if ('edit' === action) {
    migration.sql = edit(migration.sql);
    cliPromptRunMigration(settings, migration);
    return;
  }
  if ('save' === action) {
    cliSaveMigration(settings, migration.sql);
    return;
  }
  await cliRunMigration(settings, migration);
};

export const cliRunMigration = async (
  settings: FullSettings,
  migration: MigrationProcess
) => {
  let s = wait('Running migration');

  try {
    await runMigration(settings, migration.sql);
    s.done();
    await cliAfterMigration(settings, migration);
  } catch (error) {
    s.error();
    await cliPromptAfterMigrationError(settings, migration, error);
  }
};
export const cliPromptAfterMigrationError = async (
  settings: FullSettings,
  migration: MigrationProcess,
  e: unknown
): Promise<void> => {
  let error: Mysql2QueryError;
  if (e instanceof Mysql2QueryError) {
    error = e;
  } else {
    throw e;
  }
  const logs = [colors.red(error.message)];
  if (error.cause instanceof Error) {
    logs.push(squishWords(`Error: ${error.cause.message}`));
  }
  log.error(logs.join('\n'));
  cliLogSql(migration.sql);
  await cliPromptEditMigration(settings, migration);
};

export type OtherEditOption = {
  label: string;
  value: string;
  hint: string;
  sqlFn: (orig: string) => Promise<string>;
};

export const cliPromptEditMigration = async (
  settings: FullSettings,
  migration: MigrationProcess,
  otherOpts: OtherEditOption[] = []
): Promise<void> => {
  cliLogSql(migration.sql);
  const options = [
    ...(otherOpts || []).map((o) => {
      return {
        label: o.label,
        hint: o.hint,
        value: o.value
      };
    }),
    ...editOrSaveOptions
  ];
  const action = await select({
    message: 'What do you want to do?',
    options
  });
  if (isCancel(action) || action === 'cancel') {
    return cancelAndExit();
  }
  if (action === 'save') {
    return cliSaveMigration(settings, migration.sql);
  }
  const otherOpt = otherOpts.find((o) => o.value === action);
  if (otherOpt) {
    migration.sql = await otherOpt.sqlFn(migration.sql);
    return await cliPromptRunMigration(settings, migration);
  }
  migration.sql = edit(migration.sql);
  return await cliPromptRunMigration(settings, migration);
};

export const cliSaveMigration = async (settings: FullSettings, sql: string) => {
  const s = wait('Saving');
  const file = await readCurrentMigrationSql(settings);
  const oldContents = file.contents ? file.contents.trim() : '';
  const newSql = [sql];
  if (oldContents.length > 0) {
    newSql.unshift('', '');
  }
  const contents = oldContents + newSql.join('\n') + '\n';
  const { relativePath } = await writeCurrentMigrationSql(settings, contents);
  s.done();
  log.info(
    [
      `${fmtPath(relativePath)} saved.`,
      'Run frieda migrate when you are done editing.'
    ].join('\n')
  );
};

export const cliLogSql = (sql: string) => {
  log.message(
    [
      colors.bold('sql'),
      colors.dim('-'.repeat(20)),
      sql,
      colors.dim('-'.repeat(20))
    ].join('\n')
  );
};

export const cliAfterMigration = async (
  settings: FullSettings,
  migration: MigrationProcess
) => {
  const s = wait('Saving migration');
  const { schema: schemaAfter, models } = await cliFetchSchema(settings);
  const files = await writeMigrationFiles(settings, {
    date: new Date(),
    migrationSql: migration.sql,
    schemaAfter,
    schemaBefore: migration.schemaBefore
  });
  
  s.done();
  const logs = [
    'Saved migration:',
    ...files.map((f) => ` - ${fmtPath(f.relativePath)}`)
  ];
  if (migration.file) {
    const remove = await confirm({
      message: `Remove migration file ${fmtPath(migration.file.relativePath)}?`
    });
    if (remove === true) {
      await deleteWorkingMigrationsFile(migration.file)
      logs.push(`${fmtPath(migration.file.relativePath)} removed.`);
    }
  }
  log.success(logs.join('\n'));
  await cliGenerateCode(models, settings);
};

const editOrSaveOptions = [
  {
    label: `Edit here`,
    value: 'editTerminal',
    hint: `Edit this SQL by hand in the terminal`
  },
  {
    label: `Save to ${CURRENT_MIGRATION_SQL_FILE_NAME}`,
    value: 'save',
    hint: `Edit using an external editor, then run frieda migrate`
  },
  { label: 'Cancel', value: 'cancel' }
];

export const cliCreateOrUpdatePendingMigrationFile = async (
  settings: FullSettings,
  migration: MigrationProcess
) => {
  let verb = 'Saving';
  if (!migration.file) {
    const desc = await text({
      message: 'Describe this migration:',
      placeholder: 'Used to create a descriptive file name.',
      validate: (s) => {
        if (s.trim().length === 0) {
          return 'Required.';
        }
      }
    });
    if (isCancel(desc)) {
      return cancelAndExit();
    }
    const filename = _.kebabCase(desc) + `${new Date().toISOString()}.sql`;
    migration.file = getMigrationFilePath(settings, filename);
    migration.sql = `-- ${desc}\n\n${migration.sql}\n`;
    verb = 'Creating';
  }
  const s = wait(`${verb} migration file`);
  await writeWorkingMigrationsFile(migration.file, migration.sql);
  s.done();
  const { relativePath } = migration.file;

  log.info(
    [
      `Migration file: ${fmtPath(relativePath)}`,
      squishWords(
        `Tweak this file in your favorite editor. When you are done, run ${colors.inverse(
          ` frieda migrate ${relativePath} `
        )}. `
      )
    ].join('\n')
  );
};
