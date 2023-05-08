import { describe, it, expect, beforeEach } from 'vitest';
import { getFieldMysqlType } from './get-field-mysql-type.js';
import { MYSQL_TYPES } from '../../api/types.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';
describe('getFieldMysqlType', () => {
  let column: DatabaseShowFullColumnsRow;
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

