import { describe, it, expect } from 'vitest';

import { isPlainObject } from './is-plain-object.js';

describe('isPlainObject', () => {
  it('is true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 8 })).toBe(true);
  });
  it('is false for arrays', () => {
    expect(isPlainObject([])).toBe(false);
  });
  it('is false for date', () => {
    expect(isPlainObject(new Date())).toBe(false);
  });
});
