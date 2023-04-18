import { describe, it, expect } from 'vitest';

import { bt } from './sql-utils.js';

describe('bt', () => {
  it('should handle a string without a dot', () => {
    expect(bt('a').sql).toBe('`a`');
  });
  it('should handle a string with a dot', () => {
    expect(bt('a.b').sql).toBe('`a`.`b`');
  });
  it('should handle two strings', () => {
    expect(bt('a', 'b').sql).toBe('`a`.`b`');
  });
});
