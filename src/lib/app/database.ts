import { bt } from '$lib/index.js';
import type { Connection } from '@planetscale/database';
import sql from 'sql-template-tag';
import type {
  ColumnRow,
  CreateTableRow,
  FetchTableNamesResult,
  FetchedSchema,
  FetchedTable,
  IndexRow
} from './types.js';

export class Database {
  constructor(public readonly connection: Connection) {
    
  }
  async fetchCreateTableSql(tableName: string): Promise<string> {
    const query = sql`SHOW CREATE TABLE ${bt(tableName)};`;
    const result = await this.connection.execute(query.sql);
    return (result.rows[0] as CreateTableRow)['Create Table'];
  }

  async fetchTableColumns(tableName: string): Promise<ColumnRow[]> {
    const query = sql`SHOW FULL COLUMNS FROM ${bt(tableName)};`;
    const result = await this.connection.execute(query.sql);
    return result.rows as ColumnRow[];
  }

  async fetchTableIndexes(tableName: string): Promise<IndexRow[]> {
    const query = sql`SHOW INDEXES FROM ${bt(tableName)};`;
    const result = await this.connection.execute(query.sql);
    return result.rows as IndexRow[];
  }

  async fetchTableNames(): Promise<FetchTableNamesResult> {
    const query = sql`SHOW FULL TABLES;`;
    const executedQuery = await this.connection.execute(query.sql);
    const nameKey = executedQuery.fields[0].name;
    const result: FetchTableNamesResult = {
      databaseName: nameKey.replace(/^tables_in_/gi, ''),
      tableNames: []
    };
    const rows = executedQuery.rows as Record<string, string>[];
    rows.forEach((row: Record<string, string>) => {
      const keys: (keyof typeof row)[] = Object.keys(row);
      const k0: keyof typeof row = keys[0];
      const k1: keyof typeof row = keys[1];
      // ignore views for now
      if (row[k1] !== 'BASE TABLE') {
        return;
      }
      const tableName: string = row[k0];
      result.tableNames.push(tableName);
    });

    return result;
  }

  async fetchTable(tableName: string): Promise<FetchedTable> {
    const results: [ColumnRow[], IndexRow[], string] = await Promise.all([
      this.fetchTableColumns(tableName),
      this.fetchTableIndexes(tableName),
      this.fetchCreateTableSql(tableName)
    ]);
    return {
      name: tableName,
      columns: results[0],
      indexes: results[1],
      createSql: results[2]
    };
  }

  async fetchSchema(): Promise<FetchedSchema> {
    
    const { databaseName, tableNames } = await this.fetchTableNames();
    const tables = await Promise.all(tableNames.map((t) => this.fetchTable(t)));
    
    return {
      fetched: new Date(),
      databaseName,
      tables
    };
  }
}
