import { describe, it, expect, beforeEach } from 'vitest';

import {isPlainObject} from './utils';

describe('isPlainObject', () => {
  it('is true for plain objects', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({a: 8})).toBe(true)
  })
  it('is false for arrays', () => {
    expect(isPlainObject([])).toBe(false)
  })
  it('is false for date', () => {
    expect(isPlainObject(new Date)).toBe(false)
  })
})

