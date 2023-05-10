import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fetchTableMod from './fetch/fetch-table.js';
import * as tableNamesMod from './fetch/fetch-table-names.js';
import { fetchAndParseSchema } from './fetch-and-parse-schema.js';
import type { Connection } from '@planetscale/database';
import type { Options } from './types.js';

describe('fetchAndParseSchema', () => {
  let connection: Connection;
  let options: Options
  beforeEach(() => {
    connection = {} as Connection;
    options = {} as Options
  })
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

    const result = await fetchAndParseSchema(connection, options);
    expect(result.schema.databaseName).toBe('foo');
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

    const result = await fetchAndParseSchema(connection, options);
    expect(result.schema.databaseName).toBe('foo');
    expect(ftSpy).not.toHaveBeenCalled();
    expect(namesSpy).toHaveBeenCalledOnce();
  });
});
