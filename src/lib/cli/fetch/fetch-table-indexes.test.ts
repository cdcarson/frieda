import { describe, it, expect, beforeEach, vi, type SpyInstance } from 'vitest';
import type { Connection, ExecutedQuery } from '@planetscale/database';
import { fetchTableIndexes } from './fetch-table-indexes.js';

describe('fetchTableIndexes', () => {
  let connection: Connection;
  let executeSpy: SpyInstance;
  let queryResult: ExecutedQuery;
  beforeEach(() => {
    connection = { execute: vi.fn() } as unknown as Connection;
    executeSpy = vi.spyOn(connection, 'execute');
    queryResult = {
      rows: [{ a: 'whatever' }],
      fields: []
    } as unknown as ExecutedQuery;
  });

  it('returns the rows', async () => {
    executeSpy.mockResolvedValue(queryResult);
    const result = await fetchTableIndexes(connection, 'a');
    expect(result).toEqual(queryResult.rows);
  });
  it('makes the right query', async () => {
    executeSpy.mockResolvedValue(queryResult);
    await fetchTableIndexes(connection, 'a');
    expect(executeSpy).toHaveBeenCalledWith('SHOW INDEXES FROM `a`;');
  });
});
