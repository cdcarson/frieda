import { describe, it, expect, beforeEach, vi, type SpyInstance } from 'vitest';
import type { Connection, ExecutedQuery } from '@planetscale/database';
import { Database } from './database.js';

describe('Database', () => {
  let database: Database;
  let connection: Connection;
  let executeSpy: SpyInstance;
  beforeEach(() => {
    connection = { execute: vi.fn() } as unknown as Connection;
    executeSpy = vi.spyOn(connection, 'execute');
    database = new Database(connection);
  });

  describe('fetchCreateTableSql', () => {
    let queryResult: ExecutedQuery;
    beforeEach(() => {
      queryResult = {
        rows: [{ 'Create Table': 'whatever' }],
        fields: []
      } as unknown as ExecutedQuery;
    });

    it('returns "Create Table" key from the first row', async () => {
      executeSpy.mockResolvedValue(queryResult);
      const result = await database.fetchCreateTableSql('a');
      expect(result).toEqual('whatever');
    });
    it('makes the right query', async () => {
      executeSpy.mockResolvedValue(queryResult);
      await database.fetchCreateTableSql('a');
      expect(executeSpy).toHaveBeenCalledWith('SHOW CREATE TABLE `a`;');
    });
  });

  describe('fetchTableColumns', () => {
    let queryResult: ExecutedQuery;
    beforeEach(() => {
      queryResult = {
        rows: [{ a: 'whatever' }],
        fields: []
      } as unknown as ExecutedQuery;
    });

    it('returns the rows', async () => {
      executeSpy.mockResolvedValue(queryResult);
      const result = await database.fetchTableColumns('a');
      expect(result).toEqual(queryResult.rows);
    });
    it('makes the right query', async () => {
      executeSpy.mockResolvedValue(queryResult);
      await database.fetchTableColumns('a');
      expect(executeSpy).toHaveBeenCalledWith('SHOW FULL COLUMNS FROM `a`;');
    });
  });

  describe('fetchTableIndexes', () => {
    let queryResult: ExecutedQuery;
    beforeEach(() => {
      queryResult = {
        rows: [{ a: 'whatever' }],
        fields: []
      } as unknown as ExecutedQuery;
    });

    it('returns the rows', async () => {
      executeSpy.mockResolvedValue(queryResult);
      const result = await database.fetchTableIndexes('a');
      expect(result).toEqual(queryResult.rows);
    });
    it('makes the right query', async () => {
      executeSpy.mockResolvedValue(queryResult);
      await database.fetchTableIndexes('a');
      expect(executeSpy).toHaveBeenCalledWith('SHOW INDEXES FROM `a`;');
    });
  });

  describe('fetchTableNames', () => {
    let queryResult: ExecutedQuery;
    beforeEach(() => {
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
      await database.fetchTableNames();
      expect(executeSpy).toHaveBeenCalled();
    });
    it('derives the database name from the first field in the result', async () => {
      executeSpy.mockResolvedValue(queryResult);
      const result = await database.fetchTableNames();
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
      const result2 = await database.fetchTableNames();
      expect(result2.databaseName).toBe('foobar');
    });
    it('gets the table names', async () => {
      queryResult.rows = [
        { Tables_in_foo: 'a', Table_type: 'BASE TABLE' },
        { Tables_in_foo: 'b', Table_type: 'BASE TABLE' }
      ];
      executeSpy.mockResolvedValue(queryResult);
      const result = await database.fetchTableNames();
      expect(result.tableNames).toEqual(['a', 'b']);
    });
    it('gets ignores anything other than "BASE TABLE" (ie. views)', async () => {
      queryResult.rows = [
        { Tables_in_foo: 'a', Table_type: 'BASE TABLE' },
        { Tables_in_foo: 'b', Table_type: 'FOO' }
      ];
      executeSpy.mockResolvedValue(queryResult);
      const result = await database.fetchTableNames();
      expect(result.tableNames).toEqual(['a']);
    });
    it('makes the right query', async () => {
      executeSpy.mockResolvedValue(queryResult);
      await database.fetchTableNames();
      expect(executeSpy).toHaveBeenCalledWith('SHOW FULL TABLES;');
    });
  });
  describe('fetchTable', () => {
    it('should make the right calls', async () => {
      const colSpy = vi
        .spyOn(database, 'fetchTableColumns')
        .mockResolvedValue([]);
      const indSpy = vi
        .spyOn(database, 'fetchTableIndexes')
        .mockResolvedValue([]);
      const sqlSpy = vi
        .spyOn(database, 'fetchCreateTableSql')
        .mockResolvedValue('sql');
      const result = await database.fetchTable('a');
      expect(result.name).toBe('a');
      expect(colSpy).toHaveBeenCalledWith('a');
      expect(indSpy).toHaveBeenCalledWith('a');
      expect(sqlSpy).toHaveBeenCalledWith('a');
    });
  });
  describe('fetchSchema', () => {
    it('should make the right calls', async () => {
      const ftSpy = vi
        .spyOn(database, 'fetchTable')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockResolvedValue({} as any);
      const namesSpy = vi.spyOn(database, 'fetchTableNames').mockResolvedValue({
        databaseName: 'foo',
        tableNames: ['a', 'b']
      });

      const result = await database.fetchSchema();
      expect(result.databaseName).toBe('foo');
      expect(ftSpy).toHaveBeenCalledTimes(2);
      expect(namesSpy).toHaveBeenCalledOnce();
    });
    it('should be ok if no tables', async () => {
      const ftSpy = vi
        .spyOn(database, 'fetchTable')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockResolvedValue({} as any);
      const namesSpy = vi.spyOn(database, 'fetchTableNames').mockResolvedValue({
        databaseName: 'foo',
        tableNames: []
      });

      const result = await database.fetchSchema();
      expect(result.databaseName).toBe('foo');
      expect(ftSpy).not.toHaveBeenCalled();
      expect(namesSpy).toHaveBeenCalledOnce();
    });
  });
});
