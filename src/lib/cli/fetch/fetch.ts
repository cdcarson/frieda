import type { Connection } from '@planetscale/database';
import { fetchTableNames } from './fetch-table-names.js';
import { fetchTable } from './fetch-table.js';
import type { FetchedSchema } from '../types.js';

export const fetch = async (connection: Connection): Promise<FetchedSchema> => {
  const { databaseName, tableNames } = await fetchTableNames(connection);
  const tables = await Promise.all(
    tableNames.map((t) => fetchTable(connection, t))
  );
  return {
    databaseName,
    tables
  };
};
