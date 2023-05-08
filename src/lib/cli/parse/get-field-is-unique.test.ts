import { describe, it, expect, beforeEach } from 'vitest';
import { getFieldIsUnique } from './get-field-is-unique.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';

describe('getFieldIsUnique', () => {
  let column: DatabaseShowFullColumnsRow;
  beforeEach(() => {
    column = {
      Key: ''
    } as DatabaseShowFullColumnsRow;
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
