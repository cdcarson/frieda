import type { Connection } from '@planetscale/database';
import type { FetchedSchema } from './types.js';
import { fetchTableNames } from './fetch-table-names.js';
import { fetchTable } from './fetch-table.js';

export const fetchSchema = async (
  connection: Connection
): Promise<FetchedSchema> => {
  const { databaseName, tableNames } = await fetchTableNames(connection);
  const tables = await Promise.all(
    tableNames.map((t) => fetchTable(connection, t))
  );
  return {
    fetched: new Date(),
    databaseName,
    tables
  };
};
