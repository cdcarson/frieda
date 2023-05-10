import type { Connection } from '@planetscale/database';
import { fetchTableNames } from './fetch/fetch-table-names.js';
import { fetchTable } from './fetch/fetch-table.js';
import type { FetchedSchema, Options } from './types.js';
import ora from 'ora';
import type { SchemaCastMap, Schema } from '$lib/index.js';
import { parseModel } from './parse/parse-model.js';

export const fetchAndParseSchema = async (connection: Connection, options: Options): Promise<{
  fetchedSchema: FetchedSchema,
  schema: Schema
}> => {
  const spinner = ora('Fetching schema');
  const { databaseName, tableNames } = await fetchTableNames(connection);
  const tables = await Promise.all(
    tableNames.map((t) => fetchTable(connection, t))
  );
  
  const fetchedSchema: FetchedSchema = {
    databaseName,
    tables
  }
  const schema: Schema = parseSchema(fetchedSchema, options)
  spinner.succeed(`Schema fetched.`);
  return {
    fetchedSchema, schema
  };
};

const parseSchema = (
  fetchedSchema: FetchedSchema,
  options: Options
): Schema => {
  const models = fetchedSchema.tables.map(t => parseModel(t, options));
  const cast: SchemaCastMap = models.reduce((acc, m) => {
    const copy = {...acc};
    m.fields.forEach(f => {
      const key = `${m.tableName}.${f.columnName}`;
      copy[key] = f.castType
    });
    return copy
  }, {} as SchemaCastMap)
  return {
    databaseName: fetchedSchema.databaseName,
    models,
    cast
  }

};