import { it, expect } from '@jest/globals';

import { add } from './add';
it('add', () => {
  expect(add()).toBe(0);
  expect(add(1)).toBe(1);
  expect(add(1, 2, 3)).toBe(6);
});
