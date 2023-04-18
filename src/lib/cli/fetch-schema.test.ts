import { fetchDatabaseSchema } from './fetch-schema.js';
import type { Connection, ExecutedQuery } from '@planetscale/database';
import { describe, it, expect, beforeEach, type SpyInstance, vi } from 'vitest';

describe('fetchSchema', () => {
  let connection: { execute: (query: string) => Promise<ExecutedQuery> };
  let showTablesExecutedQuery: ExecutedQuery;
  let tableCreateExecutedQuery: ExecutedQuery;
  let emptyExecutedQuery: ExecutedQuery;
  let executeSpy: SpyInstance;
  beforeEach(() => {
    showTablesExecutedQuery = {
      fields: [{ name: 'Tables_in_foo' }, { name: 'Table_type' }],
      rows: [
        { Tables_in_foo: 'a', Table_type: 'BASE TABLE' },
        { Tables_in_foo: 'b', Table_type: 'BASE TABLE' }
      ]
    } as unknown as ExecutedQuery;

    tableCreateExecutedQuery = {
      fields: [{ name: 'Table' }, { name: 'Create Table' }],
      rows: [{ Table: 'ignore this', 'Create Table': 'some sql' }]
    } as unknown as ExecutedQuery;
    emptyExecutedQuery = {
      fields: [],
      rows: []
    } as unknown as ExecutedQuery;
    connection = {
      execute: (query: string) => {
        if (query.toUpperCase().startsWith('SHOW FULL TABLES')) {
          return Promise.resolve(showTablesExecutedQuery);
        }
        if (query.toUpperCase().startsWith('SHOW CREATE TABLE')) {
          return Promise.resolve(tableCreateExecutedQuery);
        }

        return Promise.resolve(emptyExecutedQuery);
      }
    };
    executeSpy = vi.spyOn(connection, 'execute');
  });

  it('should query the table names', async () => {
    await fetchDatabaseSchema(connection as unknown as Connection);
    expect(executeSpy).toHaveBeenNthCalledWith(1, 'SHOW FULL TABLES;');
  });
  it('should populate the database name', async () => {
    const result = await fetchDatabaseSchema(
      connection as unknown as Connection
    );
    expect(result.databaseName).toBe('foo');
  });
  it('should populate the table names', async () => {
    const result = await fetchDatabaseSchema(
      connection as unknown as Connection
    );
    expect(result.tableNames).toEqual(['a', 'b']);
  });
  it('should ignore views', async () => {
    showTablesExecutedQuery.rows.push({
      Tables_in_foo: 'SomeView',
      Table_type: 'VIEW'
    });
    const result = await fetchDatabaseSchema(
      connection as unknown as Connection
    );
    expect(result.tableNames).toEqual(['a', 'b']);
  });

  it('should fetch the create table for each table', async () => {
    await fetchDatabaseSchema(connection as unknown as Connection);
    expect(executeSpy).toBeCalledWith('SHOW CREATE TABLE `a`;');
    expect(executeSpy).toBeCalledWith('SHOW CREATE TABLE `b`;');
  });
  it('should fetch the columns for each table', async () => {
    await fetchDatabaseSchema(connection as unknown as Connection);
    expect(executeSpy).toBeCalledWith('SHOW FULL COLUMNS FROM `a`;');
    expect(executeSpy).toBeCalledWith('SHOW FULL COLUMNS FROM `b`;');
  });
  it('should fetch the indexes for each table', async () => {
    await fetchDatabaseSchema(connection as unknown as Connection);
    expect(executeSpy).toBeCalledWith('SHOW INDEXES FROM `a`;');
    expect(executeSpy).toBeCalledWith('SHOW INDEXES FROM `b`;');
  });
});
