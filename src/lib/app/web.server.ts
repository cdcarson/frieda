import { dev } from '$app/environment';
import type {
  AppOptions,
  ChangeError,
  FetchedSchema,
  WebData
} from './shared.js';
import {
  COMPILE_JS,
  DATABASE_URL,
  OUTPUT_DIRECTORY,
  SCHEMA_DIRECTORY,
  PROJECT_ABSOLUTE_PATH
} from '$env/static/private';
import {
  fetchSchema,
  readCurrentSchemaFiles,
  writeCurrentSchemaFiles,
  writeSchemaChangeFiles
} from './schema.server.js';
import { Connection, connect } from '@planetscale/database';
import {
  generateSourceCodeFiles,
  getModelTypes,
  readSourceCodeFiles
} from './code.server.js';
import { parseSchema } from './parsers.js';

export const getOptions = (): AppOptions => {
  const options: AppOptions = dev
    ? {
        projectAbsolutePath: PROJECT_ABSOLUTE_PATH,
        databaseUrl: DATABASE_URL,
        outputDirectory: OUTPUT_DIRECTORY,
        compileJs: COMPILE_JS === 'true',
        schemaDirectory: SCHEMA_DIRECTORY
      }
    : {
        projectAbsolutePath: process.env.PROJECT_ABSOLUTE_PATH as string,
        databaseUrl: process.env.DATABASE_URL as string,
        outputDirectory: process.env.OUTPUT_DIRECTORY as string,
        compileJs: process.env.COMPILE_JS === 'true',
        schemaDirectory: process.env.SCHEMA_DIRECTORY as string
      };
  return options;
};

export const refreshWebData = async (
  connection?: Connection
): Promise<WebData> => {
  const options: AppOptions = getOptions();
  connection = connection || connect({ url: options.databaseUrl });
  const fetchedSchema = await fetchSchema(connection);
  const schemaFiles = await writeCurrentSchemaFiles(options, fetchedSchema);
  const schema = parseSchema(fetchedSchema);
  const codeFiles = await generateSourceCodeFiles(schema, options);
  const modelTypes = getModelTypes(schema, codeFiles);
  return {
    schema,
    options,
    fetchedSchema: schemaFiles.fetchedSchema as FetchedSchema,
    codeFiles,
    schemaFiles,
    modelTypes
  };
};

export const getWebData = async (): Promise<WebData> => {
  const options: AppOptions = getOptions();
  const [schemaFiles, codeFiles] = await Promise.all([
    readCurrentSchemaFiles(options),
    readSourceCodeFiles(options)
  ]);
  if (schemaFiles.valid && codeFiles.valid && schemaFiles.fetchedSchema) {
    const schema = parseSchema(schemaFiles.fetchedSchema);
    return {
      schema,
      options,
      fetchedSchema: schemaFiles.fetchedSchema,
      codeFiles,
      schemaFiles,
      modelTypes: getModelTypes(schema, codeFiles)
    };
  }
  console.log('had to fetch');
  return await refreshWebData();
};

export const executeSchemaChange = async (sql: string): Promise<WebData> => {
  const options: AppOptions = getOptions();
  const connection = connect({ url: options.databaseUrl });
  const { fetchedSchema } = await getWebData();
  await connection.execute(sql);
  const data = await refreshWebData();
  data.changeFiles = await writeSchemaChangeFiles(
    fetchedSchema,
    data.fetchedSchema,
    sql,
    options
  );
  return data;
};
