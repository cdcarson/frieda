import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fetchTableMod from './fetch-table.js';
import * as tableNamesMod from './fetch-table-names.js';
import { fetchSchema } from './fetch-schema.js';
import type { Connection } from '@planetscale/database';

describe('fetchSchema', () => {
  let connection: Connection;
  beforeEach(() => {
    connection = {} as Connection;
  });
  it('should make the right calls', async () => {
    const ftSpy = vi
      .spyOn(fetchTableMod, 'fetchTable')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValue({} as any);
    const namesSpy = vi
      .spyOn(tableNamesMod, 'fetchTableNames')
      .mockResolvedValue({
        databaseName: 'foo',
        tableNames: ['a', 'b']
      });

    const result = await fetchSchema(connection);
    expect(result.databaseName).toBe('foo');
    expect(ftSpy).toHaveBeenCalledTimes(2);
    expect(namesSpy).toHaveBeenCalledOnce();
  });
  it('should be ok if no tables', async () => {
    const ftSpy = vi
      .spyOn(fetchTableMod, 'fetchTable')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValue({} as any);
    const namesSpy = vi
      .spyOn(tableNamesMod, 'fetchTableNames')
      .mockResolvedValue({
        databaseName: 'foo',
        tableNames: []
      });

    const result = await fetchSchema(connection);
    expect(result.databaseName).toBe('foo');
    expect(ftSpy).not.toHaveBeenCalled();
    expect(namesSpy).toHaveBeenCalledOnce();
  });
});
