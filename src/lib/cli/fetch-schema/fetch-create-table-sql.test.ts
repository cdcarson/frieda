import { describe, it, expect, beforeEach, vi, type SpyInstance } from 'vitest';
import type { Connection, ExecutedQuery } from '@planetscale/database';
import { fetchCreateTableSql } from './fetch-create-table-sql.js';

describe('fetchCreateTableSql', () => {
  let connection: Connection;
  let executeSpy: SpyInstance;
  let queryResult: ExecutedQuery;
  beforeEach(() => {
    connection = { execute: vi.fn() } as unknown as Connection;
    executeSpy = vi.spyOn(connection, 'execute');
    queryResult = {
      rows: [{ 'Create Table': 'whatever' }],
      fields: []
    } as unknown as ExecutedQuery;
  });

  it('returns "Create Table" key from the first row', async () => {
    executeSpy.mockResolvedValue(queryResult);
    const result = await fetchCreateTableSql(connection, 'a');
    expect(result).toEqual('whatever');
  });
  it('makes the right query', async () => {
    executeSpy.mockResolvedValue(queryResult);
    await fetchCreateTableSql(connection, 'a');
    expect(executeSpy).toHaveBeenCalledWith('SHOW CREATE TABLE `a`;');
  });
});
