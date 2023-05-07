import { it, describe, expect } from 'vitest';
import { getStringLiterals } from './get-string-literals.js';

describe('getStringLiterals', () => {
  it('should match single quotes', () => {
    expect(getStringLiterals(`'a','b'`)).toEqual([`'a'`, `'b'`]);
  });
  it('should match double quotes', () => {
    expect(getStringLiterals(`"a","b"`)).toEqual([`"a"`, `"b"`]);
  });
});
