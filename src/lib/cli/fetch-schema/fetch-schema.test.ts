import { describe, it, expect, vi } from 'vitest';
import * as fetchTableMod from './fetch-table.js';
import * as tableNamesMod from './fetch-table-names.js';
import { fetchSchema } from './fetch-schema.js';
import type { Connection } from '@planetscale/database';
import type { FetchedTable } from '../types.js';

describe('fetchSchema', () => {
  it('should make the right calls', async () => {
    const conn = {} as unknown as Connection;
    const ftSpy = vi
      .spyOn(fetchTableMod, 'fetchTable')
      .mockResolvedValue({} as unknown as FetchedTable);
    const namesSpy = vi
      .spyOn(tableNamesMod, 'fetchTableNames')
      .mockResolvedValue({
        databaseName: 'foo',
        tableNames: ['a', 'b']
      });

    const result = await fetchSchema(conn);
    expect(result.databaseName).toBe('foo');
    expect(ftSpy).toHaveBeenCalledTimes(2);
    expect(namesSpy).toHaveBeenCalledOnce();
  });
  it('should be ok if no tables', async () => {
    const conn = {} as unknown as Connection;
    const ftSpy = vi
      .spyOn(fetchTableMod, 'fetchTable')
      .mockResolvedValue({} as unknown as FetchedTable);
    const namesSpy = vi
      .spyOn(tableNamesMod, 'fetchTableNames')
      .mockResolvedValue({
        databaseName: 'foo',
        tableNames: []
      });

    const result = await fetchSchema(conn);
    expect(result.databaseName).toBe('foo');
    expect(ftSpy).not.toHaveBeenCalled();
    expect(namesSpy).toHaveBeenCalledOnce();
  });
});
