import { describe, it, expect, beforeEach } from 'vitest';
import { getFieldIsAutoIncrement } from './get-field-is-auto-increment.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';

describe('getFieldIsAutoIncrement', () => {
  let column: DatabaseShowFullColumnsRow;
  beforeEach(() => {
    column = {
      Extra: ''
    } as DatabaseShowFullColumnsRow;
  });
  it('works', () => {
    column.Extra = 'auto_increment';
    expect(getFieldIsAutoIncrement(column)).toBe(true);
    column.Extra = '';
    expect(getFieldIsAutoIncrement(column)).toBe(false);
  });
});
