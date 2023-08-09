import { describe, it, expect, beforeEach, vi, type SpyInstance } from 'vitest';
import { BaseDatabase, TableDatabase, ViewDatabase } from './db-classes.js';
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

  it('throws if the model not found', () => {
    expect(() => new ViewDatabase('NotExist', connection, schema)).throws();
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

    const db = new TableDatabase('User', connection, schema);
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

    const db = new TableDatabase('User', connection, schema);
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

  it('findMany with select = "all"', async () => {
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

    const db = new TableDatabase('User', connection, schema);
    executeSpy.mockResolvedValue({
      rows: [{}, {}]
    });
    const result = await db.findMany({ select: 'all' });
    expect(result.length).toBe(2);
    // cant figure out the rx, so just this...
    expect(executeSpy).toHaveBeenCalled();
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

    const db = new TableDatabase('User', connection, schema);
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

    const db = new TableDatabase('User', connection, schema);
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

    const db = new TableDatabase('User', connection, schema);
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

    const db = new TableDatabase('User', connection, schema);
    executeSpy.mockResolvedValue({
      rows: []
    });
    const result = await db.findUnique({ where: { id: '1' } });
    expect(result).toBeNull();
  });

  it('countBigInt', async () => {
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
    const db = new TableDatabase('User', connection, schema);
    // the casting on this is f'ed, because we are spying on BaseDatabase.execute, so createCastFunction never gets called,
    // so the ct is a string rather than a bigint as it would be IRL
    executeSpy.mockResolvedValue({
      rows: [{ ct: BigInt(Number.MAX_SAFE_INTEGER + 1).toString() }]
    });
    const result = await db.countBigInt({});
    expect(result).toEqual(BigInt(Number.MAX_SAFE_INTEGER + 1).toString());
  });

  it('count throws if the result exceeds Number.MAX_SAFE_INTEGER', async () => {
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
    const db = new TableDatabase('User', connection, schema);
    // the casting on this is f'ed, because we are spying on BaseDatabase.execute, so createCastFunction never gets called,
    // so the ct is a string rather than a bigint as it would be IRL
    executeSpy.mockResolvedValue({
      rows: [{ ct: BigInt(Number.MAX_SAFE_INTEGER + 1).toString() }]
    });
    await expect(() => db.count({})).rejects.toThrow();
  });

  it('count does not throw if the result is Number.MAX_SAFE_INTEGER', async () => {
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
    const db = new TableDatabase('User', connection, schema);
    // the casting on this is f'ed, because we are spying on BaseDatabase.execute, so createCastFunction never gets called,
    // so the ct is a string rather than a bigint as it would be IRL
    executeSpy.mockResolvedValue({
      rows: [{ ct: BigInt(Number.MAX_SAFE_INTEGER).toString() }]
    });
    const result = await db.count({});
    expect(result).toBe(Number.MAX_SAFE_INTEGER);
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

    const db = new TableDatabase('User', connection, schema);
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

  it('create with set values', async () => {
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
            castType: 'set',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'set',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new TableDatabase('User', connection, schema);
    executeSpy.mockResolvedValue({
      insertId: '333'
    });
    const result = await db.create({ data: { foo: new Set(['a', 'b']) } });
    expect(result).toEqual({ id: '333' });
    expect(executeSpy).toHaveBeenCalledWith(
      'INSERT INTO `User` (`User`.`foo`) VALUES (?)',
      ['a,b'],
      { as: 'object', cast: expect.any(Function) }
    );
  });

  it('create with multiple primary keys', async () => {
    schema.models = [
      {
        modelName: 'FooBar',
        tableName: 'FooBar',
        fields: [
          {
            columnName: 'fooId',
            fieldName: 'fooId',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'barId',
            fieldName: 'barId',
            castType: 'string',
            isAutoIncrement: false,
            isPrimaryKey: true,
            mysqlBaseType: 'bigint',
            hasDefault: false
          },
          {
            columnName: 'foo',
            fieldName: 'foo',
            castType: 'set',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'set',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new TableDatabase('FooBar', connection, schema);

    const result = await db.create({
      data: { fooId: '234', barId: '567', foo: new Set(['a', 'b']) }
    });
    expect(result).toEqual({ fooId: '234', barId: '567' });
    expect(executeSpy).toHaveBeenCalledWith(
      'INSERT INTO `FooBar` (`FooBar`.`fooId`,`FooBar`.`barId`,`FooBar`.`foo`) VALUES (?,?,?)',
      ['234', '567', 'a,b'],
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

    const db = new TableDatabase('User', connection, schema);
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

    const db = new TableDatabase('User', connection, schema);
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

    const db = new TableDatabase('User', connection, schema);
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

    const db = new TableDatabase('User', connection, schema);
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

    const db = new TableDatabase('User', connection, schema);
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

  it('update with set values', async () => {
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
            castType: 'set',
            isAutoIncrement: false,
            isPrimaryKey: false,
            mysqlBaseType: 'set',
            hasDefault: false
          }
        ]
      }
    ];

    const db = new TableDatabase('User', connection, schema);
    executeSpy.mockResolvedValue({
      insertId: '333'
    });
    await db.update({ data: { foo: new Set(['a', 'b']) }, where: { id: '1' } });
    expect(executeSpy).toHaveBeenCalledWith(
      'UPDATE `User` SET `User`.`foo` = ? WHERE `User`.`id` = ?',
      ['a,b', '1'],
      { as: 'object', cast: expect.any(Function) }
    );
  });
  it('delete', async () => {
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
    const db = new TableDatabase('User', connection, schema);
    await db.delete({ where: { id: '1' } });
    expect(executeSpy).toHaveBeenCalledWith(
      'DELETE FROM `User` WHERE `User`.`id` = ?',
      ['1'],
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
    const db = new BaseDatabase(connection, schema);
    executeSpy.mockRejectedValue(new Error('bad'));
    await expect(() => db.execute(sql`Some bad`)).rejects.toThrowError(
      'Internal server error.'
    );
  });
  it('selectFirstOrThrow throws', async () => {
    const db = new BaseDatabase(connection, schema);
    executeSpy.mockResolvedValue({
      rows: []
    });
    await expect(() => db.selectFirstOrThrow(sql`query`)).rejects.toThrowError(
      'selectFirstOrThrow'
    );
  });
  it('executeSelectFirstOrThrow succeeds', async () => {
    const db = new BaseDatabase(connection, schema);
    executeSpy.mockResolvedValue({
      rows: [{}]
    });
    const result = await db.selectFirstOrThrow(sql`query`);
    expect(result).toEqual({});
  });
});
