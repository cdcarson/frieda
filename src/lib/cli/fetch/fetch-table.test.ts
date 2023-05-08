import { describe, it, expect, vi } from 'vitest';
import { fetchTable } from './fetch-table.js';
import * as fetchColMod from './fetch-table-columns.js';
import * as fetchIndMod from './fetch-table-indexes.js';
import * as fetchSql from './fetch-create-table-sql.js';
import type { Connection } from '@planetscale/database';

describe('fetchTable', () => {
  it('should make the right calls', async () => {
    const conn = {} as unknown as Connection;
    const colSpy = vi
      .spyOn(fetchColMod, 'fetchTableColumns')
      .mockResolvedValue([]);
    const indSpy = vi
      .spyOn(fetchIndMod, 'fetchTableIndexes')
      .mockResolvedValue([]);
    const sqlSpy = vi
      .spyOn(fetchSql, 'fetchCreateTableSql')
      .mockResolvedValue('sql');
    const result = await fetchTable(conn, 'a');
    expect(result.name).toBe('a');
    expect(colSpy).toHaveBeenCalledWith(conn, 'a');
    expect(indSpy).toHaveBeenCalledWith(conn, 'a');
    expect(sqlSpy).toHaveBeenCalledWith(conn, 'a');
  });
});
