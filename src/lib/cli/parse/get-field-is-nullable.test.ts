import { describe, it, expect, beforeEach } from 'vitest';
import { getFieldIsNullable } from './get-field-is-nullable.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';
describe('getFieldIsNullable', () => {
  let column: DatabaseShowFullColumnsRow;
  beforeEach(() => {
    column = {
      Null: 'NO'
    } as DatabaseShowFullColumnsRow;
  });
  it('works', () => {
    column.Null = 'YES';
    expect(getFieldIsNullable(column)).toBe(true);
    column.Null = 'NO';
    expect(getFieldIsNullable(column)).toBe(false);
  });
});
