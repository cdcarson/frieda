import { describe, it, expect, beforeEach } from 'vitest';
import { getFieldCastType } from './get-field-cast-type.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';
import type { MysqlType } from '../../api/types.js';
import { getParenthesizedArgs } from './get-parenthesized-args.js';

describe('getFieldCastType', () => {
  let col: DatabaseShowFullColumnsRow;
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