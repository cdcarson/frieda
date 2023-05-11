import { describe, it, expect, beforeEach } from 'vitest';
import { parseField } from './parse-field.js';
import type { ColumnRow } from '$lib/fetch/types.js';
import {
  MYSQL_TYPES,
  type MysqlBaseType,
  type TypeOptions
} from '$lib/index.js';

describe('parseField', () => {
  let col: ColumnRow;
  let options: TypeOptions;
  beforeEach(() => {
    col = {
      Comment: '',
      Default: '',
      Extra: '',
      Field: '',
      Key: '',
      Null: 'NO',
      Type: '',
      Collation: null,
      Privileges: ''
    };
    options = {
      typeBigIntAsString: true,
      typeTinyIntOneAsBoolean: true,
      typeImports: []
    };
  });
  it('fieldName', () => {
    col.Field = 'foo_bar';
    expect(parseField(col, options).fieldName).toBe('fooBar');
    col.Field = 'fooBar';
    expect(parseField(col, options).fieldName).toBe('fooBar');
  });
  it('bigint type when typeBigIntAsString is true', () => {
    options.typeBigIntAsString = true;
    col.Field = 'fooBar';
    col.Type = 'bigint';
    const parsed = parseField(col, options);
    expect(parsed.javascriptType).toBe('string');
    expect(parsed.mysqlBaseType).toBe('bigint');
  });
  it('bigint type with @bigint annotation when typeBigIntAsString is true', () => {
    options.typeBigIntAsString = true;
    col.Field = 'fooBar';
    col.Type = 'bigint';
    col.Comment = '@bigint';
    const parsed = parseField(col, options);
    expect(parsed.javascriptType).toBe('bigint');
    expect(parsed.mysqlBaseType).toBe('bigint');
  });

  describe('cast type', () => {
    it('should be string for an unknown type', () => {
      col.Type = 'foobar';
      expect(parseField(col, options).castType).toBe('string');
    });
    it('should be json for json col', () => {
      col.Type = 'json';
      expect(parseField(col, options).castType).toBe('json');
    });
    it('should be string for bigint by default', () => {
      col.Type = 'bigint';
      expect(parseField(col, options).castType).toBe('string');
    });
    it('should be bigint for bigint if typeBigIntAsString is turned off', () => {
      col.Type = 'bigint';
      options.typeBigIntAsString = false;
      expect(parseField(col, options).castType).toBe('bigint');
    });
    it('should be bigint for bigint if the @bigint annotation exists', () => {
      col.Type = 'bigint';
      col.Comment = '@bigint';

      expect(parseField(col, options).castType).toBe('bigint');
      col.Comment = '@BIGint';
      expect(parseField(col, options).castType).toBe('bigint');
      col.Comment = ' @bigint oh lets try this';
      expect(parseField(col, options).castType).toBe('bigint');
    });
    it('should be boolean for tinyint(1) by default', () => {
      col.Type = 'tinyint(1)';
      expect(parseField(col, options).castType).toBe('boolean');
      col.Type = 'tinYint(  1 )';
      expect(parseField(col, options).castType).toBe('boolean');
    });
    it('should be int for tinyint(1) if typeTinyIntOneAsBoolean is turned off', () => {
      col.Type = 'tinyint(1)';
      options.typeTinyIntOneAsBoolean = false;
      expect(parseField(col, options).castType).toBe('int');
    });
    it('should be int for all other int-y types', () => {
      const intTypes: MysqlBaseType[] = [
        'tinyint',
        'int',
        'integer',
        'smallint',
        'mediumint'
      ];
      intTypes.forEach((t) => {
        col.Type = t;
        expect(parseField(col, options).castType).toBe('int');
      });
    });
    it('should be float for the float-y types', () => {
      const ft: MysqlBaseType[] = [
        'float',
        'double',
        'real',
        'decimal',
        'numeric'
      ];
      ft.forEach((t) => {
        col.Type = t;
        expect(parseField(col, options).castType).toBe('float');
      });
    });
    it('should be date for the date types', () => {
      const types: MysqlBaseType[] = ['date', 'datetime', 'timestamp'];
      types.forEach((t) => {
        col.Type = t;
        expect(parseField(col, options).castType).toBe('date');
      });
    });
    it('should be set for set if the @set annotation exists', () => {
      col.Type = 'set';
      col.Comment = '@set';
      expect(parseField(col, options).castType).toBe('set');
    });
    it('should be string for set if the @set annotation does not exists', () => {
      col.Type = 'set';
      col.Comment = '@s';
      expect(parseField(col, options).castType).toBe('string');
    });
    it('should be enum for enum', () => {
      col.Type = 'enum';
      expect(parseField(col, options).castType).toBe('enum');
    });
    it('should be int for year', () => {
      col.Type = 'year';
      expect(parseField(col, options).castType).toBe('int');
    });
    it('should be string for time', () => {
      col.Type = 'time';
      expect(parseField(col, options).castType).toBe('string');
    });
    it('should be string for all the string-y types', () => {
      const types: MysqlBaseType[] = [
        'bit',
        'binary',
        'char',
        'varchar',
        'varbinary',
        'tinyblob',
        'tinytext',
        'blob',
        'text',
        'mediumblob',
        'mediumtext',
        'longblob',
        'longtext'
      ];
      types.forEach((t) => {
        col.Type = t;
        expect(parseField(col, options).castType).toBe('string');
      });
    });
  });
  describe('comment annotations', () => {
    it('bigint', () => {
      col.Type = 'bigint';
      col.Comment = '@bigint';
      let result = parseField(col, options);
      expect(result.typeAnnotation).toEqual({
        annotation: 'bigint',
        fullAnnotation: '@bigint'
      });
      col.Comment = '@BigInt';
      result = parseField(col, options);
      expect(result.typeAnnotation).toEqual({
        annotation: 'bigint',
        fullAnnotation: '@BigInt'
      });
    });
    it('enum', () => {
      col.Type = `enum('a'|'b')`;
      col.Comment = '@enum';
      let result = parseField(col, options);
      expect(result.typeAnnotation).toEqual(null);

      col.Comment = '@enum(MyType';
      result = parseField(col, options);
      expect(result.typeAnnotation).toEqual(null);
      col.Comment = '@enum(MyType)';
      result = parseField(col, options);
      expect(result.typeAnnotation).toEqual({
        annotation: 'enum',
        argument: 'MyType',
        fullAnnotation: '@enum(MyType)'
      });
    });

    it('set', () => {
      col.Type = `set('a','b')`;
      col.Comment = '@set';
      let result = parseField(col, options);
      expect(result.typeAnnotation).toEqual({
        annotation: 'set',
        fullAnnotation: '@set'
      });
      col.Comment = '@Set';
      result = parseField(col, options);
      expect(result.typeAnnotation).toEqual({
        annotation: 'set',
        fullAnnotation: '@Set'
      });
      col.Comment = '@set(MyType';
      result = parseField(col, options);
      expect(result.typeAnnotation).toEqual({
        annotation: 'set',
        fullAnnotation: '@set'
      });
      col.Comment = '@set(MyType)';
      result = parseField(col, options);
      expect(result.typeAnnotation).toEqual({
        fullAnnotation: '@set(MyType)',
        annotation: 'set',
        argument: 'MyType'
      });
    });
    it('json', () => {
      col.Type = 'json';
      col.Comment = '@json';
      let result = parseField(col, options);
      expect(result.typeAnnotation).toEqual(null);

      col.Comment = '@json(MyType';
      result = parseField(col, options);
      expect(result.typeAnnotation).toEqual(null);
      col.Comment = '@json(MyType)';
      result = parseField(col, options);
      expect(result.typeAnnotation).toEqual({
        fullAnnotation: '@json(MyType)',
        annotation: 'json',
        argument: 'MyType'
      });
    });
  });

  describe('nullable', () => {
    it('true for a nullable column', () => {
      col.Null = 'YES';
      expect(parseField(col, options).nullable).toBe(true);
    });
    it('false for a non- nullable column', () => {
      col.Null = 'NO';
      expect(parseField(col, options).nullable).toBe(false);
    });
  });
  describe('hasDefault', () => {
    it('true for a nullable column', () => {
      col.Null = 'YES';
      col.Default = null;
      expect(parseField(col, options).hasDefault).toBe(true);
    });
    it('true if Default is a string', () => {
      col.Default = 'hi';
      expect(parseField(col, options).hasDefault).toBe(true);
      col.Null = 'YES';
      expect(parseField(col, options).hasDefault).toBe(true);
    });
  });

  it('generatedAlways', () => {
    col.Extra = 'VIRTUAL GENERATED';
    expect(parseField(col, options).generatedAlways).toBe(true);
    col.Extra = 'STORED GENERATED';
    expect(parseField(col, options).generatedAlways).toBe(true);
    col.Extra = '';
    expect(parseField(col, options).generatedAlways).toBe(false);
  });

  it('autoIncrement', () => {
    col.Extra = 'auto_increment';
    expect(parseField(col, options).autoIncrement).toBe(true);
    col.Extra = 'STORED GENERATED';
    expect(parseField(col, options).autoIncrement).toBe(false);
    col.Extra = '';
    expect(parseField(col, options).autoIncrement).toBe(false);
  });

  it('invisible', () => {
    col.Extra = 'INVISIBLE';
    expect(parseField(col, options).invisible).toBe(true);
    col.Extra = 'INVISIBLe';
    expect(parseField(col, options).invisible).toBe(true);
    col.Extra = ' INVISIBLE ';
    expect(parseField(col, options).invisible).toBe(true);
    col.Extra = 'dunno INVISIBLE ';
    expect(parseField(col, options).invisible).toBe(true);
    col.Extra = 'INVISIBL';
    expect(parseField(col, options).invisible).toBe(false);
    col.Extra = '';
    expect(parseField(col, options).invisible).toBe(false);
  });

  it('primaryKey', () => {
    col.Key = 'UNI';
    expect(parseField(col, options).primaryKey).toBe(false);
    col.Key = 'PRI';
    expect(parseField(col, options).primaryKey).toBe(true);
    col.Key = 'MUL';
    expect(parseField(col, options).primaryKey).toBe(false);
    col.Key = '';
    expect(parseField(col, options).primaryKey).toBe(false);
  });

  it('unique', () => {
    col.Key = 'UNI';
    expect(parseField(col, options).unique).toBe(true);
    col.Key = 'PRI';
    expect(parseField(col, options).unique).toBe(false);
    col.Key = 'MUL';
    expect(parseField(col, options).unique).toBe(false);
    col.Key = '';
    expect(parseField(col, options).unique).toBe(false);
  });

  describe('javascriptType', () => {
    it('is "Object" for json wthout a type annotation', () => {
      col.Type = 'json';
      expect(parseField(col, options).javascriptType).toBe('Object');
    });
    it('picks up an inline type for CastType json with a type annotation', () => {
      col.Type = 'json';
      col.Comment = `@json({foo: number})`;
      expect(parseField(col, options).javascriptType).toBe('{foo: number}');
    });
    it('picks up an imported type for CastType json with a type annotation', () => {
      col.Type = 'json';
      col.Comment = `@json(MyType)`;
      expect(parseField(col, options).javascriptType).toBe('MyType');
    });

    it(' "picks up an imported type for enum', () => {
      col.Type = `enum('a', 'b')`;
      col.Comment = '@enum(Foo)';
      expect(parseField(col, options).javascriptType).toBe('Foo');
    });
    it('picks up the strings for an enum', () => {
      col.Type = `enum('a', 'b')`;
      expect(parseField(col, options).javascriptType).toBe(`'a'|'b'`);
    });
    it('handles the probably impossible case where the enum def is empty', () => {
      col.Type = `enum()`;
      expect(parseField(col, options).javascriptType).toBe(`string`);
    });
    it('returns string for set by default', () => {
      col.Type = `set('a', 'b')`;
      expect(parseField(col, options).javascriptType).toBe(`string`);
    });
    it('picks up the strings for a set', () => {
      col.Type = `set('a', 'b')`;
      col.Comment = '@set';
      expect(parseField(col, options).javascriptType).toBe(`Set<'a'|'b'>`);
    });
    it('picks up the type of the @set annotation if it exists', () => {
      col.Type = `set('a', 'b')`;
      col.Comment = '@set(Foo)';
      expect(parseField(col, options).javascriptType).toBe(`Set<Foo>`);
    });
    it('handles the probably impossible case where the set def is empty', () => {
      col.Type = `set()`;
      col.Comment = '@set';
      expect(parseField(col, options).javascriptType).toBe(`Set<string>`);
    });
    it('handles "bigint"', () => {
      col.Type = 'bigint';
      col.Comment = '@bigint';
      expect(parseField(col, options).javascriptType).toBe(`bigint`);
    });
    it('handles  "int"', () => {
      col.Type = 'int';
      expect(parseField(col, options).javascriptType).toBe(`number`);
    });
    it('handles CastType "float"', () => {
      col.Type = 'double';
      expect(parseField(col, options).javascriptType).toBe(`number`);
    });
    it('handles text', () => {
      col.Type = 'text';
      expect(parseField(col, options).javascriptType).toBe(`string`);
    });
    it('handles  tinyint(1)', () => {
      col.Type = 'tinyint(1)';
      expect(parseField(col, options).javascriptType).toBe(`boolean`);
    });
    it('handles tinyint(1) if typeTinyIntOneAsBoolean is false', () => {
      col.Type = 'tinyint(1)';
      options.typeTinyIntOneAsBoolean = false;
      expect(parseField(col, options).javascriptType).toBe(`number`);
    });
    it('handles datetime', () => {
      col.Type = 'datetime';
      expect(parseField(col, options).javascriptType).toBe(`Date`);
    });
    it('handles varchar', () => {
      col.Type = 'varchar';
      expect(parseField(col, options).javascriptType).toBe(`string`);
    });
  });

  describe('mysql', () => {
    it('handles all the known types', () => {
      MYSQL_TYPES.forEach((s) => {
        col.Type = s;
        expect(parseField(col, options).mysqlBaseType).toBe(s);
      });
    });
    it('handles all the known types case-insensitively', () => {
      MYSQL_TYPES.forEach((s) => {
        col.Type = s.toUpperCase();
        expect(parseField(col, options).mysqlBaseType).toBe(s);
      });
    });
    it('handles all the known types if they have parethesized args', () => {
      MYSQL_TYPES.forEach((s) => {
        col.Type = `${s}(foo)`;
        expect(parseField(col, options).mysqlBaseType).toBe(s);
      });
    });
    it('is null for an unknown type', () => {
      col.Type = 'foobar';
      expect(parseField(col, options).mysqlBaseType).toBe(null);
    });
  });
  it('javascriptTypePossiblyNull', () => {
    col.Type = 'varchar';
    (col.Null = 'YES'),
      expect(parseField(col, options).javascriptTypePossiblyNull).toBe(
        'string|null'
      );
    (col.Null = 'NO'),
      expect(parseField(col, options).javascriptTypePossiblyNull).toBe(
        'string'
      );
  });
  it('modelCreateDataTypeDeclaration', () => {
    col.Type = 'varchar';
    col.Default = 'aa';
    col.Field = 'a';
    expect(parseField(col, options).modelCreateDataTypeDeclaration).toBe(
      'a?:string'
    );
    col.Default = null;
    expect(parseField(col, options).modelCreateDataTypeDeclaration).toBe(
      'a:string'
    );
  });

  it('string types', () => {
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
      col.Type = t;
      expect(parseField(col, options).castType).toBe('string');
      expect(parseField(col, options).javascriptType).toBe('string');
    });
  });
});
