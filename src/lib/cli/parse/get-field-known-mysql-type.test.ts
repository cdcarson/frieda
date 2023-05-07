import { KNOWN_MYSQL_TYPES } from '$lib/api/constants.js';
import { describe, it, expect } from 'vitest';
import type { DatabaseShowColumnsRow } from '../types.js';
import { getFieldKnownMySQLType } from './get-field-known-mysql-type.js';
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

describe('getFieldKnownMySQLType', () => {
  it('handles all the known types', () => {
    KNOWN_MYSQL_TYPES.forEach((s) => {
      const column = {
        ...colInfoTemplate,
        Type: s
      };
      expect(getFieldKnownMySQLType(column)).toBe(s);
    });
  });
  it('handles all the known types case-insensitively', () => {
    KNOWN_MYSQL_TYPES.forEach((s) => {
      const column = {
        ...colInfoTemplate,
        Type: s.toUpperCase()
      };
      expect(getFieldKnownMySQLType(column)).toBe(s);
    });
  });
  it('handles all the known types if they have parethesized args', () => {
    KNOWN_MYSQL_TYPES.forEach((s) => {
      const column = {
        ...colInfoTemplate,
        Type: `${s}(foo)`
      };
      expect(getFieldKnownMySQLType(column)).toBe(s);
    });
  });
  it('is null for an unkown type', () => {
    const column = {
      ...colInfoTemplate,
      Type: 'foobar'
    };
    expect(getFieldKnownMySQLType(column)).toBe(null);
  });
});
