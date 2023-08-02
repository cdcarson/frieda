import { describe, it, expect, beforeEach, vi, type SpyInstance } from 'vitest';
import { BaseDb, ModelDb } from './db-classes.js';
import type { SchemaDefinition } from './types.js';
import type { Connection } from '@planetscale/database';
import sql from 'sql-template-tag';
describe('ModelDb', () => {
  let connection: Connection;
  let executeSpy: SpyInstance;
  let schema: SchemaDefinition;
  beforeEach(() => {
    connection = {
      execute: vi.fn()
    } as unknown as Connection;
    executeSpy = vi.spyOn(connection, 'execute');
    schema = {
      databaseName: 'testme',
      models: [],
      cast: {
        // doesn't matter for these tests
      }
    } as unknown as SchemaDefinition;
  });

  it('findMany without selecting columns', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'name',
            fieldName: 'name',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'varchar',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      rows: [{}, {}]
    });
    const result = await db.findMany({});
    expect(result.length).toBe(2);
    expect(executeSpy).toHaveBeenCalledWith(
      expect.stringMatching(/SELECT\s+\*/),
      [],
      { as: 'object', cast: expect.any(Function) }
    );
  });

  it('findMany with selecting cols', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'name',
            fieldName: 'name',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'varchar',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      rows: [{}, {}]
    });
    const result = await db.findMany({ select: ['name'] });
    expect(result.length).toBe(2);
    expect(executeSpy).toHaveBeenCalledWith(
      expect.stringMatching(/SELECT\s+`User`\.`name`/),
      [],
      { as: 'object', cast: expect.any(Function) }
    );
  });

  it('findFirstOrThrow succeeds', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'name',
            fieldName: 'name',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'varchar',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      rows: [{}]
    });
    const result = await db.findFirstOrThrow({ where: { id: '1' } });
    expect(result).toEqual({});
  });

  it('findFirstOrThrow throws', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'name',
            fieldName: 'name',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'varchar',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      rows: []
    });
    await expect(() =>
      db.findFirstOrThrow({ where: { id: '1' } })
    ).rejects.toThrow();
  });

  it('findUniqueOrThrow throws', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'name',
            fieldName: 'name',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'varchar',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      rows: []
    });
    await expect(() =>
      db.findUniqueOrThrow({ where: { id: '1' } })
    ).rejects.toThrow();
  });

  it('findUnique works', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'name',
            fieldName: 'name',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'varchar',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      rows: []
    });
    const result = await db.findUnique({ where: { id: '1' } });
    expect(result).toBeNull();
  });

  it('simple create test', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'name',
            fieldName: 'name',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'varchar',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      insertId: '333'
    });
    const result = await db.create({ data: { name: 'Foo Bar' } });
    expect(result).toEqual({ id: '333' });
    expect(executeSpy).toHaveBeenCalledWith(
      'INSERT INTO `User` (`User`.`name`) VALUES (?)',
      ['Foo Bar'],
      { as: 'object', cast: expect.any(Function) }
    );
  });

  it('update with string values', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'name',
            fieldName: 'name',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'varchar',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      insertId: '333'
    });
    await db.update({ data: { name: 'foo bar' }, where: { id: '1' } });
    expect(executeSpy).toHaveBeenCalledWith(
      'UPDATE `User` SET `User`.`name` = ? WHERE `User`.`id` = ?',
      ['foo bar', '1'],
      { as: 'object', cast: expect.any(Function) }
    );
  });

  it('create with null values', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'name',
            fieldName: 'name',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'varchar',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      insertId: '333'
    });
    const result = await db.create({ data: { name: null } });
    expect(result).toEqual({ id: '333' });
    expect(executeSpy).toHaveBeenCalledWith(
      'INSERT INTO `User` (`User`.`name`) VALUES (NULL)',
      [],
      { as: 'object', cast: expect.any(Function) }
    );
  });
  it('update with null values', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'name',
            fieldName: 'name',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'varchar',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      insertId: '333'
    });
    await db.update({ data: { name: null }, where: { id: '1' } });
    expect(executeSpy).toHaveBeenCalledWith(
      'UPDATE `User` SET `User`.`name` = NULL WHERE `User`.`id` = ?',
      ['1'],
      { as: 'object', cast: expect.any(Function) }
    );
  });
  it('create with json values', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'foo',
            fieldName: 'foo',
            castType: 'json',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'json',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      insertId: '333'
    });
    const result = await db.create({ data: { foo: { a: 8 } } });
    expect(result).toEqual({ id: '333' });
    expect(executeSpy).toHaveBeenCalledWith(
      'INSERT INTO `User` (`User`.`foo`) VALUES (?)',
      [JSON.stringify({ a: 8 })],
      { as: 'object', cast: expect.any(Function) }
    );
  });
  it('update with json values', async () => {
    schema.models = [
      {
        modelName: 'User',
        tableName: 'User',
        fields: [
          {
            columnName: 'id',
            fieldName: 'id',
            castType: 'string',
            isAutoIncrement: true,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'foo',
            fieldName: 'foo',
            castType: 'json',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'json',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new ModelDb('User', connection, schema);
    executeSpy.mockResolvedValue({
      insertId: '333'
    });
    await db.update({ data: { foo: { a: 8 } }, where: { id: '1' } });
    expect(executeSpy).toHaveBeenCalledWith(
      'UPDATE `User` SET `User`.`foo` = ? WHERE `User`.`id` = ?',
      [JSON.stringify({ a: 8 }), '1'],
      { as: 'object', cast: expect.any(Function) }
    );
  });
});

describe('BaseDb.execute', () => {
  let connection: Connection;
  let executeSpy: SpyInstance;
  let schema: SchemaDefinition;
  beforeEach(() => {
    connection = {
      execute: vi.fn()
    } as unknown as Connection;
    executeSpy = vi.spyOn(connection, 'execute');
    schema = {
      databaseName: 'testme',
      models: [],
      cast: {
        // doesn't matter for these tests
      }
    } as unknown as SchemaDefinition;
  });
  it('throws if the query throws', async () => {
    const db = new BaseDb(connection, schema);
    executeSpy.mockRejectedValue(new Error('bad'));
    await expect(() => db.execute(sql`Some bad`)).rejects.toThrowError(
      'Internal server error.'
    );
  });
  it('executeSelectFirstOrThrow throws', async () => {
    const db = new BaseDb(connection, schema);
    executeSpy.mockResolvedValue({
      rows: []
    });
    await expect(() =>
      db.selectFirstOrThrow(sql`query`)
    ).rejects.toThrowError('executeSelectFirstOrThrow');
  });
  it('executeSelectFirstOrThrow succeeds', async () => {
    const db = new BaseDb(connection, schema);
    executeSpy.mockResolvedValue({
      rows: [{}]
    });
    const result = await db.selectFirstOrThrow(sql`query`);
    expect(result).toEqual({});
  });
});
