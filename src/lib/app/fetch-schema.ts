import { bt } from '$lib/index.js';
import type { Connection } from '@planetscale/database';
import sql from 'sql-template-tag';
import type {
  ColumnRow,
  FetchedSchema,
  FetchedTable,
  IndexRow,
  ShowFullTableResult,
  TableType
} from './types.js';

export const showFullTables = async (
  connection: Connection
): Promise<{ databaseName: string; tables: ShowFullTableResult[] }> => {
  const query = sql`SHOW FULL TABLES;`;
  const executedQuery = await connection.execute(query.sql);
  const nameKey = executedQuery.fields[0].name;
  type Row = {
    Table_type: TableType;
    [k: typeof nameKey]: string;
  };
  const databaseName = nameKey.replace(/^Tables_in_/i, '');
  const tables: ShowFullTableResult[] = (executedQuery.rows as Row[])
    .filter((r) => ['BASE TABLE', 'VIEW'].includes(r.Table_type))
    .map((r) => {
      return {
        name: r[nameKey],
        type: r.Table_type
      };
    });
  return {
    databaseName,
    tables
  };
};

const showColumns = async (
  connection: Connection,
  tableName: string
): Promise<ColumnRow[]> => {
  const query = sql`SHOW FULL COLUMNS FROM ${bt(tableName)};`;
  const result = await connection.execute(query.sql);
  return result.rows as ColumnRow[];
};

const showIndexes = async (
  connection: Connection,
  tableName: string
): Promise<IndexRow[]> => {
  const query = sql`SHOW INDEXES FROM ${bt(tableName)};`;
  const result = await connection.execute(query.sql);

  return result.rows as IndexRow[];
};

const fetchView = async (
  row: ShowFullTableResult<'VIEW'>,
  connection: Connection
): Promise<FetchedTable<'VIEW'>> => {
  const [columns] = await Promise.all([showColumns(connection, row.name)]);
  return {
    ...row,
    columns
  };
};
const fetchTable = async (
  row: ShowFullTableResult<'BASE TABLE'>,
  connection: Connection
): Promise<FetchedTable<'BASE TABLE'>> => {
  const [columns, indexes] = await Promise.all([
    showColumns(connection, row.name),
    showIndexes(connection, row.name)
  ]);
  return {
    ...row,
    columns,
    indexes
  };
};

export const showCreateTable = async (
  table: string,
  connection: Connection
): Promise<string> => {
  const query = sql`SHOW CREATE TABLE ${bt(table)}`;
  const result = await connection.execute(query.sql, query.values);
  const col = result.fields.find((f) => f.name.startsWith('Create'))?.name;
  const row = result.rows[0];
  return row[col as keyof typeof row];
};

export const fetchSchema = async (
  connection: Connection
): Promise<{
  fetchedSchema: FetchedSchema;
  tableCreateStatements: string[];
}> => {
  const { tables: rows, databaseName } = await showFullTables(connection);
  const tables: FetchedTable[] = await Promise.all(
    rows.map((tr) => {
      if (tr.type === 'BASE TABLE') {
        return fetchTable(tr as ShowFullTableResult<'BASE TABLE'>, connection);
      } else {
        return fetchView(tr as ShowFullTableResult<'VIEW'>, connection);
      }
    })
  );

  const tableCreateStatements = await Promise.all(
    rows.map((r) => showCreateTable(r.name, connection))
  );

  return {
    fetchedSchema: {
      databaseName,
      fetched: new Date(),
      tables
    },
    tableCreateStatements
  };
};
