import { describe, it, expect, beforeEach } from 'vitest';
import { getFieldIsInvisible } from './get-field-is-invisible.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';

describe('getFieldIsInvisible', () => {
  let column: DatabaseShowFullColumnsRow;
  beforeEach(() => {
    column = {
      Extra: '',
    
    } as DatabaseShowFullColumnsRow;
  });
  it('works', () => {
    column.Extra = 'INVISIBLE';
    expect(getFieldIsInvisible(column)).toBe(true);
    column.Extra = 'INVISIBLe';
    expect(getFieldIsInvisible(column)).toBe(true);
    column.Extra = ' INVISIBLE ';
    expect(getFieldIsInvisible(column)).toBe(true);
    column.Extra = 'dunno INVISIBLE ';
    expect(getFieldIsInvisible(column)).toBe(true);
    column.Extra = 'INVISIBL';
    expect(getFieldIsInvisible(column)).toBe(false);
    column.Extra = '';
    expect(getFieldIsInvisible(column)).toBe(false);
  });
});