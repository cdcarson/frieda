import { describe, it, expect, beforeEach } from 'vitest';

import { Field } from './field.js';
import type { ColumnRow } from './types.js';
import { type FieldDefinition, MYSQL_TYPES } from '../api/types.js';

describe('Field', () => {
  let column: ColumnRow;
  beforeEach(() => {
    column = {
      Comment: '',
      Default: null,
      Extra: '',
      Field: '',
      Key: '',
      Null: 'NO',
      Type: '',
      Collation: null,
      Privileges: ''
    };
  });

  it('col and field names', () => {
    column.Field = 'foo_bar';
    expect(new Field(column).fieldName).toBe('fooBar');
    expect(new Field(column).columnName).toBe('foo_bar');
    column.Field = 'FOO_BAR';
    expect(new Field(column).fieldName).toBe('fooBar');
    expect(new Field(column).columnName).toBe('FOO_BAR');
    column.Field = 'FooBar';
    expect(new Field(column).fieldName).toBe('fooBar');
    expect(new Field(column).columnName).toBe('FooBar');
  });
  it('can be stringified', () => {
    const f = new Field(column);
    const ser = JSON.stringify(f);
    const deser: FieldDefinition = JSON.parse(ser);
    expect(deser.castType).toEqual(f.castType);
    expect(deser.columnName).toEqual(f.columnName);
    expect(deser.hasDefault).toEqual(f.hasDefault);
    expect(deser.isAutoIncrement).toEqual(f.isAutoIncrement);
    expect(deser.isPrimaryKey).toEqual(f.isPrimaryKey);
  });
  it('isPrimaryKey', () => {
    column.Key = 'PRI';
    expect(new Field(column).isPrimaryKey).toBe(true);
    column.Key = 'MUL';
    expect(new Field(column).isPrimaryKey).toBe(false);
    column.Key = 'UNI';
    expect(new Field(column).isPrimaryKey).toBe(false);
    column.Key = '';
    expect(new Field(column).isPrimaryKey).toBe(false);
  });
  it('isAutoIncrement', () => {
    column.Extra = 'auto_increment';
    expect(new Field(column).isAutoIncrement).toBe(true);
    column.Extra = '';
    expect(new Field(column).isAutoIncrement).toBe(false);
  });
  it('isUnique', () => {
    column.Key = 'UNI';
    expect(new Field(column).isUnique).toBe(true);
    column.Key = 'MUL';
    expect(new Field(column).isUnique).toBe(false);
    column.Key = 'PRI';
    expect(new Field(column).isUnique).toBe(false);
    column.Key = '';
    expect(new Field(column).isUnique).toBe(false);
  });
  it('isNullable', () => {
    column.Null = 'NO';
    expect(new Field(column).isNullable).toBe(false);
    column.Null = 'YES';
    expect(new Field(column).isNullable).toBe(true);
  });
  it('hasDefault', () => {
    column.Null = 'NO';
    column.Default = 'foo';
    expect(new Field(column).hasDefault).toBe(true);
    column.Null = 'YES';
    column.Default = 'foo';
    expect(new Field(column).hasDefault).toBe(true);
    column.Null = 'YES';
    column.Default = null;
    expect(new Field(column).hasDefault).toBe(true);
    column.Null = 'NO';
    column.Default = null;
    expect(new Field(column).hasDefault).toBe(false);
  });
  it('defaultValue', () => {
    column.Null = 'NO';
    column.Default = 'foo';
    expect(new Field(column).defaultValue).toBe('foo');
    column.Null = 'NO';
    column.Default = null;
    expect(new Field(column).defaultValue).toBe(undefined);
    column.Null = 'YES';
    column.Default = null;
    expect(new Field(column).defaultValue).toBe(null);
    column.Null = 'YES';
    column.Default = '';
    expect(new Field(column).defaultValue).toBe('');
    column.Null = 'NO';
    column.Default = '';
    expect(new Field(column).defaultValue).toBe('');
  });

  it('isGeneratedAlways', () => {
    column.Extra = 'STORED GENERATED';
    expect(new Field(column).isGeneratedAlways).toBe(true);
    column.Extra = 'VIRTUAL GENERATED';
    expect(new Field(column).isGeneratedAlways).toBe(true);
    column.Extra = '';
    expect(new Field(column).isGeneratedAlways).toBe(false);
    column.Extra = `DEFAULT_GENERATED on update CURRENT_TIMESTAMP(3)`;
    expect(new Field(column).isGeneratedAlways).toBe(false);
  });
  it('isInvisible', () => {
    column.Extra = 'INVISIBLE';
    expect(new Field(column).isInvisible).toBe(true);
    column.Extra = '';
    expect(new Field(column).isInvisible).toBe(false);
  });

  it('mysqlBaseType', () => {
    MYSQL_TYPES.forEach((t) => {
      expect(new Field({ ...column, Type: t }).mysqlBaseType).toBe(t);
      expect(new Field({ ...column, Type: `${t}(5)` }).mysqlBaseType).toBe(t);
    });
    expect(new Field({ ...column, Type: `foobar` }).mysqlBaseType).toBe(null);
  });

  it('typeAnnotations', () => {
    expect(
      new Field({ ...column, Comment: '@json(MyType)' }).typeAnnotations
    ).toEqual([
      {
        fullAnnotation: '@json(MyType)',
        annotation: 'json',
        typeArgument: 'MyType'
      }
    ]);
    expect(
      new Field({ ...column, Comment: '@jSon(MyType)' }).typeAnnotations
    ).toEqual([
      {
        fullAnnotation: '@jSon(MyType)',
        annotation: 'json',
        typeArgument: 'MyType'
      }
    ]);
    expect(
      new Field({ ...column, Comment: '@bigint' }).typeAnnotations
    ).toEqual([
      {
        fullAnnotation: '@bigint',
        annotation: 'bigint'
      }
    ]);
    expect(
      new Field({ ...column, Comment: '@enum(Foo)' }).typeAnnotations
    ).toEqual([
      {
        fullAnnotation: '@enum(Foo)',
        annotation: 'enum',
        typeArgument: 'Foo'
      }
    ]);
    expect(
      new Field({ ...column, Comment: '@set(Foo)' }).typeAnnotations
    ).toEqual([
      {
        fullAnnotation: '@set(Foo)',
        annotation: 'set',
        typeArgument: 'Foo'
      }
    ]);
  });

  it('bigIntAnnotation', () => {
    expect(
      new Field({ ...column, Comment: '@bigint' }).bigIntAnnotation
    ).toEqual({
      fullAnnotation: '@bigint',
      annotation: 'bigint'
    });
    expect(new Field({ ...column }).bigIntAnnotation).toBeUndefined();
  });
  it('setAnnotation', () => {
    expect(new Field({ ...column, Comment: '@set' }).setAnnotation).toEqual({
      fullAnnotation: '@set',
      annotation: 'set'
    });
    expect(
      new Field({ ...column, Comment: '@set(MyType)' }).setAnnotation
    ).toEqual({
      fullAnnotation: '@set(MyType)',
      annotation: 'set',
      typeArgument: 'MyType'
    });
    expect(new Field({ ...column }).setAnnotation).toBeUndefined();
  });

  it('jsonAnnotation', () => {
    expect(
      new Field({ ...column, Comment: '@json(MyType)' }).jsonAnnotation
    ).toEqual({
      fullAnnotation: '@json(MyType)',
      annotation: 'json',
      typeArgument: 'MyType'
    });
    // this guy requires a type
    expect(
      new Field({ ...column, Comment: '@json()' }).jsonAnnotation
    ).toBeUndefined();
    expect(
      new Field({ ...column, Comment: '@json' }).jsonAnnotation
    ).toBeUndefined();

    expect(new Field({ ...column }).jsonAnnotation).toBeUndefined();
  });

  

  it('isTinyIntOne', () => {
    expect(new Field({ ...column, Type: 'tinyint(1)' }).isTinyIntOne).toBe(
      true
    );
    expect(new Field({ ...column, Type: 'int(1)' }).isTinyIntOne).toBe(false);
    expect(new Field({ ...column, Type: 'tinyint' }).isTinyIntOne).toBe(false);
  });

  describe('castType', () => {
    it('json', () => {
      expect(new Field({ ...column, Type: 'json' }).castType).toBe('json');
    });
    it('bigint', () => {
      expect(new Field({ ...column, Type: 'bigint' }).castType).toBe('string');
    });

    it('bigint with @bigint', () => {
      expect(
        new Field({ ...column, Type: 'bigint', Comment: '@bigint' }).castType
      ).toBe('bigint');
    });

    it('tinyint(1)', () => {
      expect(new Field({ ...column, Type: 'tinyint(1)' }).castType).toBe(
        'boolean'
      );
    });

    it('bool and boolean', () => {
      expect(new Field({ ...column, Type: 'bool' }).castType).toBe('boolean');
      expect(new Field({ ...column, Type: 'boolean' }).castType).toBe(
        'boolean'
      );
    });
    it('set without annotation', () => {
      expect(
        new Field({ ...column, Type: `set('a','b')`, Comment: '' }).castType
      ).toBe('string');
    });
    it('set with plain annotation', () => {
      expect(
        new Field({ ...column, Type: `set('a','b')`, Comment: '@Set' }).castType
      ).toBe('set');
    });
    it('set with typed annotation', () => {
      expect(
        new Field({
          ...column,
          Type: `set('a','b')`,
          Comment: '@Set(MyType)'
        }).castType
      ).toBe('set');
    });
    it('enum without annotation is string', () => {
      expect(
        new Field({ ...column, Type: `enum('a','b')`, Comment: '' }).castType
      ).toBe('string');
    });
    it('enum with typed annotation is also string', () => {
      expect(
        new Field({
          ...column,
          Type: `enum('a','b')`,
          Comment: '@enum(MyType)'
        }).castType
      ).toBe('string');
    });
    it('tinyint with width other than 1', () => {
      expect(new Field({ ...column, Type: 'tinyint(2)' }).castType).toBe('int');
      expect(new Field({ ...column, Type: 'tinyint' }).castType).toBe('int');
    });
    it('all the other int types', () => {
      ['tinyint', 'smallint', 'mediumint', 'int', 'integer', 'year'].forEach(
        (t) => {
          expect(new Field({ ...column, Type: t }).castType).toBe('int');
        }
      );
    });
    it('all the floaty types', () => {
      ['float', 'double', 'real', 'decimal', 'numeric'].forEach((t) => {
        expect(new Field({ ...column, Type: t }).castType).toBe('float');
      });
    });
    it('all the date types', () => {
      ['datetime', 'timestamp', 'date'].forEach((t) => {
        expect(new Field({ ...column, Type: t }).castType).toBe('date');
      });
    });

    it('all the string types', () => {
      [
        'char',
        'binary',
        'varchar',
        'varbinary',
        'tinyblob',
        'tinytext',
        'blob',
        'text',
        'mediumblob',
        'mediumtext',
        'longblob',
        'longtext',
        'time'
      ].forEach((t) => {
        expect(new Field({ ...column, Type: t }).castType).toBe('string');
      });
    });
  });

  describe('javascriptType', () => {
    it('json without a type', () => {
      expect(new Field({ ...column, Type: 'json' }).javascriptType).toBe(
        'unknown'
      );
      expect(
        new Field({ ...column, Type: 'json', Comment: '@json' }).javascriptType
      ).toBe('unknown');
    });
    it('json with a type', () => {
      expect(
        new Field({
          ...column,
          Type: 'json',
          Comment: '@json(Stripe.Customer)'
        }).javascriptType
      ).toBe('Stripe.Customer');
    });
    it('bigint', () => {
      expect(new Field({ ...column, Type: 'bigint' }).javascriptType).toBe(
        'string'
      );
    });

    it('bigint with @bigint', () => {
      expect(
        new Field({ ...column, Type: 'bigint', Comment: '@bigint' })
          .javascriptType
      ).toBe('bigint');
    });

    it('tinyint(1)', () => {
      expect(new Field({ ...column, Type: 'tinyint(1)' }).javascriptType).toBe(
        'boolean'
      );
    });

    it('bool and boolean', () => {
      expect(new Field({ ...column, Type: 'bool' }).javascriptType).toBe(
        'boolean'
      );
      expect(new Field({ ...column, Type: 'boolean' }).javascriptType).toBe(
        'boolean'
      );
    });
    it('set without annotation', () => {
      expect(
        new Field({ ...column, Type: `set('a','b')`, Comment: '' })
          .javascriptType
      ).toBe('string');
    });
    it('set with plain annotation', () => {
      expect(
        new Field({ ...column, Type: `set('a','b')`, Comment: '@Set' })
          .javascriptType
      ).toBe(`Set<'a'|'b'>`);
      expect(
        new Field({ ...column, Type: `set()`, Comment: '@Set' }).javascriptType
      ).toBe(`Set<string>`);
    });
    it('set with typed annotation', () => {
      expect(
        new Field({
          ...column,
          Type: `set('a','b')`,
          Comment: '@Set(MyType)'
        }).javascriptType
      ).toBe('Set<MyType>');
    });
    it('enum without annotation', () => {
      expect(
        new Field({ ...column, Type: `enum('a','b')`, Comment: '' })
          .javascriptType
      ).toBe(`'a'|'b'`);
      expect(
        new Field({ ...column, Type: `enum()`, Comment: '' }).javascriptType
      ).toBe(`string`);
    });
    it('enum with typed annotation', () => {
      expect(
        new Field({
          ...column,
          Type: `enum('a','b')`,
          Comment: '@enum(MyType)'
        }).javascriptType
      ).toBe('MyType');
    });
    it('tinyint with width other than 1', () => {
      expect(new Field({ ...column, Type: 'tinyint(2)' }).javascriptType).toBe(
        'number'
      );
      expect(new Field({ ...column, Type: 'tinyint' }).javascriptType).toBe(
        'number'
      );
    });
    it('all the other int types', () => {
      ['tinyint', 'smallint', 'mediumint', 'int', 'integer', 'year'].forEach(
        (t) => {
          expect(new Field({ ...column, Type: t }).javascriptType).toBe(
            'number'
          );
          expect(new Field({ ...column, Type: `${t}(2)` }).javascriptType).toBe(
            'number'
          );
        }
      );
    });
    it('all the floaty types', () => {
      ['float', 'double', 'real', 'decimal', 'numeric'].forEach((t) => {
        expect(new Field({ ...column, Type: t }).javascriptType).toBe('number');
      });
    });
    it('all the date types', () => {
      ['datetime', 'timestamp', 'date'].forEach((t) => {
        expect(new Field({ ...column, Type: t }).javascriptType).toBe('Date');
      });
    });

    it('all the string types', () => {
      [
        'char',
        'binary',
        'varchar',
        'varbinary',
        'tinyblob',
        'tinytext',
        'blob',
        'text',
        'mediumblob',
        'mediumtext',
        'longblob',
        'longtext',
        'time',
        'foobar'
      ].forEach((t) => {
        expect(new Field({ ...column, Type: t }).javascriptType).toBe('string');
      });
    });
  });
});
