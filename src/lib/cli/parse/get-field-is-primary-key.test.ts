import { describe, it, expect, beforeEach } from 'vitest';
import { getFieldIsPrimaryKey } from './get-field-is-primary-key.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';

describe('getFieldIsPrimaryKey', () => {
  let column: DatabaseShowFullColumnsRow;
  beforeEach(() => {
    column = {
      Key: ''
    } as DatabaseShowFullColumnsRow;
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
