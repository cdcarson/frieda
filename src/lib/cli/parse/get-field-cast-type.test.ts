import { it, describe, expect, beforeEach } from 'vitest';
import { getFieldCastType } from './get-field-cast-type.js';
import type { DatabaseShowColumnsRow } from '../types.js';
import { getParenthesizedArgs } from './get-parenthesized-args.js';
import type { KNOWN_MYSQL_TYPES } from '$lib/api/constants.js';
const colInfoTemplate: DatabaseShowColumnsRow = {
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

describe('getFieldCastType', () => {
  let col: DatabaseShowColumnsRow;
  beforeEach(() => {
    col = { ...colInfoTemplate };
  });
  it('should be string for null', () => {
    expect(getFieldCastType(col, null, {})).toBe('string');
  });
  it('should be json for json col', () => {
    expect(getFieldCastType(col, 'json', {})).toBe('json');
  });
  it('should be string for bigint by default', () => {
    expect(getFieldCastType(col, 'bigint', {})).toBe('string');
  });
  it('should be bigint for bigint if the type casting is turned off', () => {
    expect(getFieldCastType(col, 'bigint', { typeBigIntAsString: false })).toBe(
      'bigint'
    );
  });
  it('should be bigint for bigint if the @bigint annotation exists', () => {
    col.Comment = '@bigint';
    expect(getFieldCastType(col, 'bigint', {})).toBe('bigint');
    col.Comment = '@BIGint';
    expect(getFieldCastType(col, 'bigint', {})).toBe('bigint');
    col.Comment = ' @bigint oh lets try this';
    expect(getFieldCastType(col, 'bigint', {})).toBe('bigint');
  });
  it('should be boolean for tinyint(1) by default', () => {
    col.Type = 'tinyint(1)';
    expect(getParenthesizedArgs(col.Type, 'tinyint')).toBe('1');
    expect(getFieldCastType(col, 'tinyint', {})).toBe('boolean');
    col.Type = 'tinYint(  1 )';
    expect(getFieldCastType(col, 'tinyint', {})).toBe('boolean');
  });
  it('should be int for tinyint(1) if the default type cast is turned off', () => {
    col.Type = 'tinyint(1)';
    expect(
      getFieldCastType(col, 'tinyint', { typeTinyIntOneAsBoolean: false })
    ).toBe('int');
  });
  it('should be int for all other int-y types', () => {
    const intTypes: (typeof KNOWN_MYSQL_TYPES)[number][] = [
      'tinyint',
      'int',
      'integer',
      'smallint',
      'mediumint'
    ];
    intTypes.forEach((t) => {
      expect(getFieldCastType(col, t, {})).toBe('int');
    });
  });
  it('should be float for the float-y types', () => {
    const ft: (typeof KNOWN_MYSQL_TYPES)[number][] = [
      'float',
      'double',
      'real',
      'decimal',
      'numeric'
    ];
    ft.forEach((t) => {
      expect(getFieldCastType(col, t, {})).toBe('float');
    });
  });
  it('should be date for the date types', () => {
    const types: (typeof KNOWN_MYSQL_TYPES)[number][] = [
      'date',
      'datetime',
      'timestamp'
    ];
    types.forEach((t) => {
      expect(getFieldCastType(col, t, {})).toBe('date');
    });
  });
  it('should be set for set', () => {
    expect(getFieldCastType(col, 'set', {})).toBe('set');
  });
  it('should be enum for enum', () => {
    expect(getFieldCastType(col, 'enum', {})).toBe('enum');
  });
  it('should be int for year', () => {
    expect(getFieldCastType(col, 'year', {})).toBe('int');
  });
  it('should be string for time', () => {
    expect(getFieldCastType(col, 'time', {})).toBe('string');
  });
  it('should be string for all the string-y types', () => {
    const types: (typeof KNOWN_MYSQL_TYPES)[number][] = [
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
      expect(getFieldCastType(col, t, {})).toBe('string');
    });
  });
});
