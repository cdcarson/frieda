import { describe, it, expect, beforeEach } from 'vitest';
import { getFieldHasDefault } from './get-field-has-default.js';
import type { DatabaseShowFullColumnsRow } from '../types.js';

describe('getFieldHasDefault', () => {
  let column: DatabaseShowFullColumnsRow;
  beforeEach(() => {
    column = {
      Null: 'NO',
      Default: null,
    } as DatabaseShowFullColumnsRow;
  });
  it('true for a nullable column', () => {
    column.Null = 'YES';
    column.Default = null;
    expect(getFieldHasDefault(column)).toBe(true);
   
  });
  it('true if Default is a string', () => {
    column.Default = 'hi';
    expect(getFieldHasDefault(column)).toBe(true);
    column.Null = 'YES'
    expect(getFieldHasDefault(column)).toBe(true);
  });
});