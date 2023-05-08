import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFieldIsNullable,
  getFieldIsPrimaryKey,
  getFieldMysqlType,
  getFieldName,
  getFieldIsUnique,
  getFieldCommentAnnotations,
  getFieldOptionalInModel,
  getFieldIsAlwaysGenerated,
  getFieldIsAutoIncrement,
  getFieldHasDefault,
  getParenthesizedArgs,
  getFieldJavascriptType,
  getFieldCastType
} from './field-parsers.js';
import { MYSQL_TYPES, type Column, type TypeOptions, type MysqlType } from '../types.js';

describe('getFieldIsNullable', () => {
  let column: Column;
  beforeEach(() => {
    column = {
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
  });
  it('works', () => {
    column.Null = 'YES';
    expect(getFieldIsNullable(column)).toBe(true);
    column.Null = 'NO';
    expect(getFieldIsNullable(column)).toBe(false);
  });
});

describe('getFieldIsPrimaryKey', () => {
  let column: Column;
  beforeEach(() => {
    column = {
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
  });
  it('works', () => {
    column.Key = 'UNI';
    expect(getFieldIsPrimaryKey(column)).toBe(false);
    column.Key = 'PRI';
    expect(getFieldIsPrimaryKey(column)).toBe(true);
    column.Key = 'MUL';
    expect(getFieldIsPrimaryKey(column)).toBe(false);
    column.Key = '';
    expect(getFieldIsPrimaryKey(column)).toBe(false);
  });
});

describe('getFieldName', () => {
  it('camelCase', () => {
    expect(getFieldName({ Field: 'user_email' } as Column)).toBe('userEmail');
    expect(getFieldName({ Field: 'UserEmail' } as Column)).toBe('userEmail');
  });
});

describe('getFieldMysqlType', () => {
  let column: Column;
  beforeEach(() => {
    column = {
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
  });
  it('handles all the known types', () => {
    MYSQL_TYPES.forEach((s) => {
      column.Type = s;
      expect(getFieldMysqlType(column)).toBe(s);
    });
  });
  it('handles all the known types case-insensitively', () => {
    MYSQL_TYPES.forEach((s) => {
      column.Type = s.toUpperCase();
      expect(getFieldMysqlType(column)).toBe(s);
    });
  });
  it('handles all the known types if they have parethesized args', () => {
    MYSQL_TYPES.forEach((s) => {
      column.Type = `${s}(foo)`;
      expect(getFieldMysqlType(column)).toBe(s);
    });
  });
  it('is null for an unkown type', () => {
    column.Type = 'foobar';
    expect(getFieldMysqlType(column)).toBe(null);
  });
});

describe('getFieldIsUnique', () => {
  let column: Column;
  beforeEach(() => {
    column = {
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
  });
  it('works', () => {
    column.Key = 'UNI';
    expect(getFieldIsUnique(column)).toBe(true);
    column.Key = 'PRI';
    expect(getFieldIsUnique(column)).toBe(false);
    column.Key = 'MUL';
    expect(getFieldIsUnique(column)).toBe(false);
    column.Key = '';
    expect(getFieldIsUnique(column)).toBe(false);
  });
});

describe('getFieldCommentAnnotations', () => {
  let column: Column;
  beforeEach(() => {
    column = {
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
  });

  it('bigint', () => {
    column.Comment = '@bigint';
    let result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'bigint'
    });
    column.Comment = '@BigInt';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'bigint'
    });
  });
  it('enum', () => {
    column.Comment = '@enum';
    let result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'enum'
    });
    column.Comment = '@ENUM';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'enum'
    });
    column.Comment = '@enum(MyType';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'enum'
    });
    column.Comment = '@enum(MyType)';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'enum',
      argument: 'MyType'
    });
  });

  it('set', () => {
    column.Comment = '@set';
    let result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'set'
    });
    column.Comment = '@Set';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'set'
    });
    column.Comment = '@set(MyType';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'set'
    });
    column.Comment = '@set(MyType)';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'set',
      argument: 'MyType'
    });
  });
  it('json', () => {
    column.Comment = '@json';
    let result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'json'
    });
    column.Comment = '@Json';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'json'
    });
    column.Comment = '@json(MyType';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'json'
    });
    column.Comment = '@json(MyType)';
    result = getFieldCommentAnnotations(column);
    expect(result[0]).toEqual({
      annotation: 'json',
      argument: 'MyType'
    });
  });
  it('other situations', () => {
    column.Comment = '@foobar';
    let result = getFieldCommentAnnotations(column);
    expect(result.length).toBe(0);
    column.Comment = '@foobar @bigint';
    result = getFieldCommentAnnotations(column);
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      annotation: 'bigint'
    });
  });
});

describe('getFieldOptionalInModel', () => {
  let column: Column;
  beforeEach(() => {
    column = {
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
  });
  it('works', () => {
    column.Extra = 'INVISIBLE';
    expect(getFieldOptionalInModel(column)).toBe(true);
    column.Extra = 'INVISIBLe';
    expect(getFieldOptionalInModel(column)).toBe(true);
    column.Extra = ' INVISIBLE ';
    expect(getFieldOptionalInModel(column)).toBe(true);
    column.Extra = 'dunno INVISIBLE ';
    expect(getFieldOptionalInModel(column)).toBe(true);
    column.Extra = 'INVISIBL';
    expect(getFieldOptionalInModel(column)).toBe(false);
    column.Extra = '';
    expect(getFieldOptionalInModel(column)).toBe(false);
  });
});

describe('getFieldIsAlwaysGenerated', () => {
  let column: Column;
  beforeEach(() => {
    column = {
      Extra: ''
    } as Column;
  });
  it('works', () => {
    column.Extra = 'VIRTUAL GENERATED';
    expect(getFieldIsAlwaysGenerated(column)).toBe(true);
    column.Extra = 'STORED GENERATED';
    expect(getFieldIsAlwaysGenerated(column)).toBe(true);
    column.Extra = '';
    expect(getFieldIsAlwaysGenerated(column)).toBe(false);
  });
});

describe('getFieldIsAutoIncrement', () => {
  let column: Column;
  beforeEach(() => {
    column = {
      Extra: ''
    } as Column;
  });
  it('works', () => {
    column.Extra = 'auto_increment';
    expect(getFieldIsAutoIncrement(column)).toBe(true);
    column.Extra = '';
    expect(getFieldIsAutoIncrement(column)).toBe(false);
  });
});


describe('getFieldHasDefault', () => {
  let column: Column;
  beforeEach(() => {
    column = {
      Null: 'NO',
      Default: null,
    } as Column;
  });
  it('true for a nullable column', () => {
    column.Null = 'YES';
    column.Default = null;
    expect(getFieldHasDefault(column)).toBe(true);
   
  });
  it('true if Default is a string', () => {
    column.Default = 'hi';
    expect(getFieldHasDefault(column)).toBe(true);
    column.Null = 'YES'
    expect(getFieldHasDefault(column)).toBe(true);
  });
});

describe('getParenthesizedArgs', () => {
  it('should work', () => {
    expect(getParenthesizedArgs('prefix(whatevs anyhow)', 'prefix')).toBe(
      'whatevs anyhow'
    );
  });
  it('should work case-insensitively as far as the prefix', () => {
    expect(getParenthesizedArgs('prefix(whatevs anyhow)', 'PREfiX')).toBe(
      'whatevs anyhow'
    );
  });
  it('should work with spaces in between the prefix and the opening parenthesis', () => {
    expect(getParenthesizedArgs('prefix (whatevs anyhow)', 'prefix')).toBe(
      'whatevs anyhow'
    );
  });
  it('should work if there is a parenthesis in the parentheses', () => {
    expect(getParenthesizedArgs('prefix(whatevs (anyhow))', 'prefix')).toBe(
      'whatevs (anyhow)'
    );
    expect(getParenthesizedArgs('prefix(whatevs anyhow))', 'prefix')).toBe(
      'whatevs anyhow)'
    );
  });
  it('some actual use cases', () => {
    // parsing a MySQL enum...
    expect(getParenthesizedArgs(`enum('a', 'b')`, 'enum')).toBe(`'a', 'b'`);
    // parsing a MySQL enum...
    expect(getParenthesizedArgs(`set('a', 'b')`, 'set')).toBe(`'a', 'b'`);
    // parsing an annotation...
    expect(getParenthesizedArgs(`@json(MyType)`, '@json')).toBe(`MyType`);
    expect(
      getParenthesizedArgs(`@json({price: number, quantity: number})`, '@json')
    ).toBe(`{price: number, quantity: number}`);
  });
  it('returns empty if no match', () => {
    expect(getParenthesizedArgs('foo(whatevs anyhow))', 'prefix')).toBe('');
  });
});

describe('getFieldJavascriptType', () => {
  let col: Column;
  let options: Partial<TypeOptions>
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
      typeTinyIntOneAsBoolean: true
    }
  });
  it('is "Object" for json wthout a type annotation', () => {
    col.Type = 'json'
    expect(getFieldJavascriptType(col, options)).toBe('Object');
  });
  it('picks up an inline type for CastType json with a type annotation', () => {
    col.Type = 'json'
    col.Comment = `@json({foo: number})`;
    expect(getFieldJavascriptType(col, options)).toBe('{foo: number}');
  });
  it('picks up an imported type for CastType json with a type annotation', () => {
    col.Type = 'json'
    col.Comment = `@json(MyType)`;
    expect(getFieldJavascriptType(col, options)).toBe('MyType');
  });

  it(' "picks up an imported type for enum', () => {
    col.Type = `enum('a', 'b')`;
    col.Comment = '@enum(Foo)'
    expect(getFieldJavascriptType(col, options)).toBe('Foo');
  });
  it('picks up the strings for an enum', () => {
    col.Type = `enum('a', 'b')`;
    expect(getFieldJavascriptType(col, options)).toBe(`'a'|'b'`);
  });
  it('handles the probably impossible case where the enum def is empty', () => {
    col.Type = `enum()`;
    expect(getFieldJavascriptType(col, options)).toBe(`string`);
  });
  it('returns string for set by default', () => {
    col.Type = `set('a', 'b')`;
    expect(getFieldJavascriptType(col, options)).toBe(`string`);
  });
  it('picks up the strings for a set', () => {
    col.Type = `set('a', 'b')`;
    col.Comment = '@set'
    expect(getFieldJavascriptType(col, options)).toBe(`Set<'a'|'b'>`);
  });
  it('picks up the type of the @set annotation if it exists', () => {
    col.Type = `set('a', 'b')`;
    col.Comment = '@set(Foo)'
    expect(getFieldJavascriptType(col, options)).toBe(`Set<Foo>`);
  });
  it('handles the probably impossible case where the set def is empty', () => {
    col.Type = `set()`;
    col.Comment = '@set'
    expect(getFieldJavascriptType(col, options)).toBe(`Set<string>`);
  });
  it('handles "bigint"', () => {
    col.Type = 'bigint'
    col.Comment = '@bigint'
    expect(getFieldJavascriptType(col, options)).toBe(`bigint`);
  });
  it('handles  "int"', () => {
    col.Type = 'int'
    expect(getFieldJavascriptType(col, options)).toBe(`number`);
  });
  it('handles CastType "float"', () => {
    col.Type = 'double'
    expect(getFieldJavascriptType(col, options)).toBe(`number`);
  });
  it('handles text', () => {
    col.Type = 'text'
    expect(getFieldJavascriptType(col, options)).toBe(`string`);
  });
  it('handles  tinyint(1)', () => {
    col.Type = 'tinyint(1)'
    expect(getFieldJavascriptType(col, options)).toBe(`boolean`);
  });
  it('handles tinyint(1) if typeTinyIntOneAsBoolean is false', () => {
    col.Type = 'tinyint(1)'
    expect(getFieldJavascriptType(col, {typeTinyIntOneAsBoolean: false, typeBigIntAsString: true})).toBe(`number`);
  });
  it('handles datetime', () => {
    col.Type = 'datetime'
    expect(getFieldJavascriptType(col, options)).toBe(`Date`);
  });
});

describe('getFieldCastType', () => {
  let col: Column;
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
  });
  it('should be string for an unknown type', () => {
    col.Type = 'foobar';
    expect(getFieldCastType(col, {})).toBe('string');
  });
  it('should be json for json col', () => {
    col.Type = 'json';
    expect(getFieldCastType(col, {})).toBe('json');
  });
  it('should be string for bigint by default', () => {
    col.Type = 'bigint';
    expect(getFieldCastType(col, {})).toBe('string');
  });
  it('should be bigint for bigint if typeBigIntAsString is turned off', () => {
    col.Type = 'bigint';
    expect(getFieldCastType(col, { typeBigIntAsString: false })).toBe('bigint');
  });
  it('should be bigint for bigint if the @bigint annotation exists', () => {
    col.Type = 'bigint';
    col.Comment = '@bigint';

    expect(getFieldCastType(col, {})).toBe('bigint');
    col.Comment = '@BIGint';
    expect(getFieldCastType(col, {})).toBe('bigint');
    col.Comment = ' @bigint oh lets try this';
    expect(getFieldCastType(col, {})).toBe('bigint');
  });
  it('should be boolean for tinyint(1) by default', () => {
    col.Type = 'tinyint(1)';
    expect(getParenthesizedArgs(col.Type, 'tinyint')).toBe('1');
    expect(getFieldCastType(col, {})).toBe('boolean');
    col.Type = 'tinYint(  1 )';
    expect(getFieldCastType(col, {})).toBe('boolean');
  });
  it('should be int for tinyint(1) if typeTinyIntOneAsBoolean is turned off', () => {
    col.Type = 'tinyint(1)';
    expect(getFieldCastType(col, { typeTinyIntOneAsBoolean: false })).toBe(
      'int'
    );
  });
  it('should be int for all other int-y types', () => {
    const intTypes: MysqlType[] = [
      'tinyint',
      'int',
      'integer',
      'smallint',
      'mediumint'
    ];
    intTypes.forEach((t) => {
      col.Type = t;
      expect(getFieldCastType(col, {})).toBe('int');
    });
  });
  it('should be float for the float-y types', () => {
    const ft: MysqlType[] = ['float', 'double', 'real', 'decimal', 'numeric'];
    ft.forEach((t) => {
      col.Type = t;
      expect(getFieldCastType(col, {})).toBe('float');
    });
  });
  it('should be date for the date types', () => {
    const types: MysqlType[] = ['date', 'datetime', 'timestamp'];
    types.forEach((t) => {
      col.Type = t;
      expect(getFieldCastType(col, {})).toBe('date');
    });
  });
  it('should be set for set if the @set annotation exists', () => {
    col.Type = 'set';
    col.Comment = '@set'
    expect(getFieldCastType(col, {})).toBe('set');
  });
  it('should be string for set if the @set annotation does not exists', () => {
    col.Type = 'set';
    col.Comment = '@s'
    expect(getFieldCastType(col, {})).toBe('string');
  });
  it('should be enum for enum', () => {
    col.Type = 'enum';
    expect(getFieldCastType(col, {})).toBe('enum');
  });
  it('should be int for year', () => {
    col.Type = 'year';
    expect(getFieldCastType(col, {})).toBe('int');
  });
  it('should be string for time', () => {
    col.Type = 'time';
    expect(getFieldCastType(col, {})).toBe('string');
  });
  it('should be string for all the string-y types', () => {
    const types: MysqlType[] = [
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
      expect(getFieldCastType(col, {})).toBe('string');
    });
  });
});
