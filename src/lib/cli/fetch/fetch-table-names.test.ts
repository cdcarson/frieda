import { describe, it, expect, beforeEach, vi, type SpyInstance } from 'vitest';
import type { Connection, ExecutedQuery } from '@planetscale/database';
import { fetchTableNames } from './fetch-table-names.js';

describe('fetchTableNames', () => {
  let connection: Connection;
  let executeSpy: SpyInstance;
  let queryResult: ExecutedQuery;
  beforeEach(() => {
    connection = { execute: vi.fn() } as unknown as Connection;
    executeSpy = vi.spyOn(connection, 'execute');
    queryResult = {
      rows: [],
      fields: [
        {
          name: 'Tables_in_foo'
        },
        {
          name: 'Table_type'
        }
      ]
    } as unknown as ExecutedQuery;
  });

  it('calls connection.execute', async () => {
    executeSpy.mockResolvedValue(queryResult);
    await fetchTableNames(connection);
    expect(executeSpy).toHaveBeenCalled();
  });
  it('derives the database name from the first field in the result', async () => {
    executeSpy.mockResolvedValue(queryResult);
    const result = await fetchTableNames(connection);
    expect(result.databaseName).toBe('foo');
    executeSpy.mockResolvedValueOnce({
      ...queryResult,
      fields: [
        {
          name: 'Tables_in_foobar'
        },
        {
          name: 'Table_type'
        }
      ]
    } as unknown as ExecutedQuery);
    const result2 = await fetchTableNames(connection);
    expect(result2.databaseName).toBe('foobar');
  });
  it('gets the table names', async () => {
    queryResult.rows = [
      { Tables_in_foo: 'a', Table_type: 'BASE TABLE' },
      { Tables_in_foo: 'b', Table_type: 'BASE TABLE' }
    ];
    executeSpy.mockResolvedValue(queryResult);
    const result = await fetchTableNames(connection);
    expect(result.tableNames).toEqual(['a', 'b']);
  });
  it('gets ignores anything other than "BASE TABLE" (ie. views)', async () => {
    queryResult.rows = [
      { Tables_in_foo: 'a', Table_type: 'BASE TABLE' },
      { Tables_in_foo: 'b', Table_type: 'FOO' }
    ];
    executeSpy.mockResolvedValue(queryResult);
    const result = await fetchTableNames(connection);
    expect(result.tableNames).toEqual(['a']);
  });
  it('makes the right query', async () => {
    executeSpy.mockResolvedValue(queryResult);
    await fetchTableNames(connection);
    expect(executeSpy).toHaveBeenCalledWith('SHOW FULL TABLES;');
  });
});
