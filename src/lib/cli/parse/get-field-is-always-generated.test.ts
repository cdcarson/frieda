import { describe, it, expect, beforeEach } from 'vitest';
import { getFieldIsAlwaysGenerated } from './get-field-is-always-generated.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';


describe('getFieldIsAlwaysGenerated', () => {
  let column: DatabaseShowFullColumnsRow;
  beforeEach(() => {
    column = {
      Extra: ''
    } as DatabaseShowFullColumnsRow;
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
